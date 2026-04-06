// app/api/campaigns/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, ok, err } from '@/lib/api-helpers'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  fromEmail: z.string().email(),
  fromName: z.string().min(1),
  replyTo: z.string().email().optional().or(z.literal('')),
  htmlBody: z.string().min(1),
  textBody: z.string().optional(),
  previewText: z.string().optional(),
  groupId: z.string().optional().nullable(),
  templateId: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
})

export const GET = withAuth(async (req, { userId }) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const campaigns = await prisma.campaign.findMany({
    where: { userId, ...(status && { status }) },
    include: {
      group: { select: { id: true, name: true } },
      _count: { select: { recipients: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Get stats for each campaign
  const withStats = await Promise.all(
    campaigns.map(async (c) => {
      const [sent, opens, clicks] = await Promise.all([
        prisma.campaignRecipient.count({ where: { campaignId: c.id, status: 'sent' } }),
        prisma.emailEvent.count({ where: { campaignId: c.id, type: 'open' } }),
        prisma.emailEvent.count({ where: { campaignId: c.id, type: 'click' } }),
      ])
      return {
        ...c,
        stats: {
          sent,
          opens,
          clicks,
          openRate: sent > 0 ? Math.round((opens / sent) * 100 * 10) / 10 : 0,
          clickRate: sent > 0 ? Math.round((clicks / sent) * 100 * 10) / 10 : 0,
        },
      }
    })
  )

  return ok(withStats)
})

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const { groupId, scheduledAt, ...data } = parsed.data

  const campaign = await prisma.campaign.create({
    data: {
      ...data,
      userId,
      groupId: groupId || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt ? 'scheduled' : 'draft',
      replyTo: data.replyTo || null,
    },
  })

  return ok(campaign, 201)
})
