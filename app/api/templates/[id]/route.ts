// app/api/templates/[id]/route.ts
import { db } from '@/lib/db'
import { withAuth, ok, err } from '@/lib/api-helpers'

export const PATCH = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const { id } = await params
  const t = await db.template.findUnique({ where: { id } })
  if (!t || t.userId !== userId) return err('Not found', 404)
  const body = await req.json()
  const updated = await db.template.update({ where: { id }, data: body })
  return ok(updated)
})

export const DELETE = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const { id } = await params
  const t = await db.template.findUnique({ where: { id } })
  if (!t || t.userId !== userId) return err('Not found', 404)
  await db.template.delete({ where: { id } })
  return ok({ ok: true })
})
