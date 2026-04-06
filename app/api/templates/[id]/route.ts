// app/api/templates/[id]/route.ts
import { prisma } from '@/lib/prisma'
import { withAuth, ok, err } from '@/lib/api-helpers'

export const PATCH = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const { id } = await params
  const t = await prisma.template.findUnique({ where: { id } })
  if (!t || t.userId !== userId) return err('Not found', 404)
  const body = await req.json()
  const updated = await prisma.template.update({ where: { id }, data: body })
  return ok(updated)
})

export const DELETE = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const { id } = await params
  const t = await prisma.template.findUnique({ where: { id } })
  if (!t || t.userId !== userId) return err('Not found', 404)
  await prisma.template.delete({ where: { id } })
  return ok({ ok: true })
})
