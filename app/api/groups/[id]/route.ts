// app/api/groups/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, ok, err } from '@/lib/api-helpers'

export const DELETE = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const { id } = await params
  const group = await prisma.group.findUnique({ where: { id } })
  if (!group || group.userId !== userId) return err('Not found', 404)
  await prisma.group.delete({ where: { id } })
  return ok({ ok: true })
})

export const PATCH = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const { id } = await params
  const group = await prisma.group.findUnique({ where: { id } })
  if (!group || group.userId !== userId) return err('Not found', 404)
  const body = await req.json()
  const updated = await prisma.group.update({ where: { id }, data: body })
  return ok(updated)
})
