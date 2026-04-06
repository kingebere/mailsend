// app/api/campaigns/[id]/route.ts
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, ok, err } from '@/lib/api-helpers'

interface UpdateCampaignBody {
  name?: string
  subject?: string
  previewText?: string | null
  fromEmail?: string
  fromName?: string
  replyTo?: string | null
  groupId?: string | null
  htmlBody?: string
  status?: string
  scheduledAt?: string | null
  sentAt?: string | null
}

export const GET = withAuth<{ id: string }>(
  async (_req: NextRequest, { userId, params }) => {
    const { id } = await params

    const campaign = await db.campaign.findUnique({
      where: { id },
      include: {
        group: { select: { id: true, name: true } },
        _count: { select: { recipients: true } },
      },
    })

    if (!campaign || campaign.userId !== userId) {
      return err('Not found', 404)
    }

    return ok(campaign)
  }
)

export const PATCH = withAuth<{ id: string }>(
  async (req: NextRequest, { userId, params }) => {
    const { id } = await params

    const campaign = await db.campaign.findUnique({ where: { id } })
    if (!campaign || campaign.userId !== userId) {
      return err('Not found', 404)
    }

    if (campaign.status === 'sent') {
      return err('Cannot edit a sent campaign')
    }

    const body: UpdateCampaignBody = await req.json()

    const updated = await db.campaign.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.subject !== undefined && { subject: body.subject }),
        ...(body.previewText !== undefined && { previewText: body.previewText }),
        ...(body.fromEmail !== undefined && { fromEmail: body.fromEmail }),
        ...(body.fromName !== undefined && { fromName: body.fromName }),
        ...(body.replyTo !== undefined && { replyTo: body.replyTo }),
        ...(body.groupId !== undefined && { groupId: body.groupId }),
        ...(body.htmlBody !== undefined && { htmlBody: body.htmlBody }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.sentAt !== undefined && {
          sentAt: body.sentAt ? new Date(body.sentAt) : null,
        }),
        ...(body.scheduledAt !== undefined && {
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        }),
      },
    })

    return ok(updated)
  }
)

export const DELETE = withAuth<{ id: string }>(
  async (_req: NextRequest, { userId, params }) => {
    const { id } = await params

    const campaign = await db.campaign.findUnique({ where: { id } })
    if (!campaign || campaign.userId !== userId) {
      return err('Not found', 404)
    }

    if (campaign.status === 'sending') {
      return err('Cannot delete a campaign that is currently sending')
    }

    await db.campaign.delete({ where: { id } })

    return ok({ ok: true })
  }
)