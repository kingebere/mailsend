// app/api/api-keys/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, ok, err } from '@/lib/api-helpers'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

export const GET = withAuth(async (req, { userId }) => {
  const keys = await prisma.apiKey.findMany({
    where: { userId },
    select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsed: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return ok(keys)
})

export const POST = withAuth(async (req, { userId }) => {
  const { name } = await req.json()
  if (!name) return err('Name is required')

  const rawKey = 'sk_live_' + randomBytes(24).toString('hex')
  const keyHash = await bcrypt.hash(rawKey, 10)
  const keyPrefix = rawKey.slice(0, 12)

  const apiKey = await prisma.apiKey.create({
    data: { name, keyHash, keyPrefix, userId },
  })

  // Return the raw key ONCE — it won't be shown again
  return ok({ id: apiKey.id, name, key: rawKey, keyPrefix, createdAt: apiKey.createdAt }, 201)
})

export const DELETE = withAuth(async (req, { userId }) => {
  const { id } = await req.json()
  const key = await prisma.apiKey.findUnique({ where: { id } })
  if (!key || key.userId !== userId) return err('Not found', 404)
  await prisma.apiKey.delete({ where: { id } })
  return ok({ ok: true })
})
