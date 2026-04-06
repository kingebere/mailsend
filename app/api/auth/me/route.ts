// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

interface UpdateMeBody {
  name?: string
  fromEmail?: string
  fromName?: string
  awsRegion?: string
  awsAccessKeyId?: string
  awsSecretAccessKey?: string
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      awsRegion: true,
      fromEmail: true,
      fromName: true,
      awsAccessKeyId: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: UpdateMeBody = await req.json()

  const {
    name,
    fromEmail,
    fromName,
    awsRegion,
    awsAccessKeyId,
    awsSecretAccessKey,
  } = body

  await db.user.update({
    where: { id: session.userId },
    data: {
      ...(name !== undefined && { name }),
      ...(fromEmail !== undefined && { fromEmail }),
      ...(fromName !== undefined && { fromName }),
      ...(awsRegion !== undefined && { awsRegion }),
      ...(awsAccessKeyId !== undefined && { awsAccessKeyId }),
      ...(awsSecretAccessKey !== undefined && { awsSecretAccessKey }),
    },
  })

  return NextResponse.json({ ok: true })
}