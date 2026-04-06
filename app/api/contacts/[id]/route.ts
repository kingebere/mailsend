// app/api/contacts/[id]/route.ts
import { db } from '@/lib/db'
import { withAuth, ok, err } from '@/lib/api-helpers'

export const DELETE = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const { id } = await params
  const contact = await db.contact.findUnique({ where: { id } })
  if (!contact || contact.userId !== userId) return err('Not found', 404)
  await db.contact.delete({ where: { id } })
  return ok({ ok: true })
})

export const PATCH = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const { id } = await params
  const contact = await db.contact.findUnique({ where: { id } })
  if (!contact || contact.userId !== userId) return err('Not found', 404)
  const body = await req.json()
  const updated = await db.contact.update({ where: { id }, data: body })
  return ok(updated)
})
