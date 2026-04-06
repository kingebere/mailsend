// app/api/groups/route.ts
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, ok, err } from '@/lib/api-helpers'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

export const GET = withAuth(async (req, { userId }) => {
  const groups = await db.group.findMany({
    where: { userId },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return ok(groups)
})

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const exists = await db.group.findUnique({
    where: { name_userId: { name: parsed.data.name, userId } },
  })
  if (exists) return err('A group with this name already exists', 409)

  const group = await db.group.create({ data: { ...parsed.data, userId } })
  return ok(group, 201)
})
