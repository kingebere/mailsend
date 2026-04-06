// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true, email: true, name: true,
      awsRegion: true, fromEmail: true, fromName: true,
      // Never return the actual secret key
      awsAccessKeyId: true,
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ user })
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, fromEmail, fromName, awsRegion, awsAccessKeyId, awsSecretAccessKey } = body

  await prisma.user.update({
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
