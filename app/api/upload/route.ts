// app/api/upload/route.ts
// Uploads images to Cloudflare R2 and returns a public URL

import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSessionFromRequest } from '@/lib/auth'
import { randomBytes } from 'crypto'

const R2 = new S3Client({
  endpoint: process.env.R2_ENDPOINT!,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET || 'uiland'
const PUBLIC_URL = process.env.R2_PUBLIC_URL // e.g. https://pub-xxx.r2.dev or your custom domain

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

const MAX_SIZE_MB = 10

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Validate type
  const ext = ALLOWED_TYPES[file.type]
  if (!ext) return NextResponse.json({ error: 'File type not allowed. Use JPG, PNG, GIF, WebP, or SVG.' }, { status: 400 })

  // Validate size
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  if (buffer.length > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `File too large. Max size is ${MAX_SIZE_MB}MB.` }, { status: 400 })
  }

  // Generate unique key
  const key = `email-images/${session.userId}/${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`

  try {
    await R2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      // Make publicly readable
      ACL: 'public-read',
    }))

    // Build public URL
    const url = PUBLIC_URL
      ? `${PUBLIC_URL}/${key}`
      : `${process.env.R2_ENDPOINT}/${BUCKET}/${key}`

    return NextResponse.json({ url, key, size: buffer.length, type: file.type })
  } catch (err: unknown) {
    const error = err as Error
    console.error('[R2 Upload Error]', error)
    return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 })
  }
}