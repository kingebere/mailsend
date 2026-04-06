// app/api/groups/[id]/members/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, ok, err } from '@/lib/api-helpers'

// Add contacts to group
export const POST = withAuth(async (req, { userId, params }) => {
  const groupId = params?.id
  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group || group.userId !== userId) return err('Not found', 404)

  const { contactIds } = await req.json()
  if (!Array.isArray(contactIds) || contactIds.length === 0) return err('contactIds required')

  await prisma.groupMember.createMany({
    data: contactIds.map((contactId: string) => ({ groupId: groupId!, contactId })),
    skipDuplicates: true,
  })
  return ok({ ok: true })
})

// Remove contact from group
export const DELETE = withAuth(async (req, { userId, params }) => {
  const groupId = params?.id
  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group || group.userId !== userId) return err('Not found', 404)

  const { contactId } = await req.json()
  await prisma.groupMember.delete({
    where: { groupId_contactId: { groupId: groupId!, contactId } },
  })
  return ok({ ok: true })
})
