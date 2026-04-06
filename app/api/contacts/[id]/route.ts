// app/api/contacts/[id]/route.ts
import { prisma } from '@/lib/prisma'
import { withAuth, ok, err } from '@/lib/api-helpers'

export const DELETE = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const { id } = await params
  const contact = await prisma.contact.findUnique({ where: { id } })
  if (!contact || contact.userId !== userId) return err('Not found', 404)
  await prisma.contact.delete({ where: { id } })
  return ok({ ok: true })
})

export const PATCH = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const { id } = await params
  const contact = await prisma.contact.findUnique({ where: { id } })
  if (!contact || contact.userId !== userId) return err('Not found', 404)
  const body = await req.json()
  const updated = await prisma.contact.update({ where: { id }, data: body })
  return ok(updated)
})
