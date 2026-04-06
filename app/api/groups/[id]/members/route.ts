// app/api/groups/[id]/members/route.ts
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, ok, err } from '@/lib/api-helpers'

interface AddGroupMembersBody {
  contactIds?: string[]
}

interface RemoveGroupMemberBody {
  contactId?: string
}

// Add contacts to group
export const POST = withAuth<{ id: string }>(
  async (req: NextRequest, { userId, params }) => {
    const { id: groupId } = await params

    const group = await db.group.findUnique({ where: { id: groupId } })
    if (!group || group.userId !== userId) {
      return err('Not found', 404)
    }

    const body: AddGroupMembersBody = await req.json()
    const contactIds = body.contactIds

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return err('contactIds required')
    }

    await db.groupMember.createMany({
      data: contactIds.map((contactId) => ({
        groupId,
        contactId,
      })),
      skipDuplicates: true,
    })

    return ok({ ok: true })
  }
)

// Remove contact from group
export const DELETE = withAuth<{ id: string }>(
  async (req: NextRequest, { userId, params }) => {
    const { id: groupId } = await params

    const group = await db.group.findUnique({ where: { id: groupId } })
    if (!group || group.userId !== userId) {
      return err('Not found', 404)
    }

    const body: RemoveGroupMemberBody = await req.json()
    const contactId = body.contactId

    if (!contactId) {
      return err('contactId required')
    }

    await db.groupMember.delete({
      where: {
        groupId_contactId: {
          groupId,
          contactId,
        },
      },
    })

    return ok({ ok: true })
  }
)