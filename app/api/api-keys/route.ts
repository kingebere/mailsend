// app/api/api-keys/route.ts
import { db } from '@/lib/db'
import { withAuth, ok, err } from '@/lib/api-helpers'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

interface CreateApiKeyBody {
  name?: string
}

interface DeleteApiKeyBody {
  id?: string
}

export const GET = withAuth(async (_req, { userId }) => {
  const keys = await db.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsed: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return ok(keys)
})

export const POST = withAuth(async (req, { userId }) => {
  const body: CreateApiKeyBody = await req.json()
  const name = body.name?.trim()

  if (!name) {
    return err('Name is required')
  }

  const rawKey = 'sk_live_' + randomBytes(24).toString('hex')
  const keyHash = await bcrypt.hash(rawKey, 10)
  const keyPrefix = rawKey.slice(0, 12)

  const apiKey = await db.apiKey.create({
    data: { name, keyHash, keyPrefix, userId },
  })

  return ok(
    {
      id: apiKey.id,
      name,
      key: rawKey,
      keyPrefix,
      createdAt: apiKey.createdAt,
    },
    201
  )
})

export const DELETE = withAuth(async (req, { userId }) => {
  const body: DeleteApiKeyBody = await req.json()
  const id = body.id

  if (!id) {
    return err('API key id is required')
  }

  const key = await db.apiKey.findUnique({ where: { id } })

  if (!key || key.userId !== userId) {
    return err('Not found', 404)
  }

  await db.apiKey.delete({ where: { id } })

  return ok({ ok: true })
})