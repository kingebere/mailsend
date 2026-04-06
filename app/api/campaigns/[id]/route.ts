// app/api/campaigns/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, ok, err } from '@/lib/api-helpers'

export const GET = withAuth(async (req, { userId, params }) => {
  const id = params?.id
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      group: { select: { id: true, name: true } },
      _count: { select: { recipients: true } },
    },
  })
  if (!campaign || campaign.userId !== userId) return err('Not found', 404)
  return ok(campaign)
})

export const PATCH = withAuth(async (req, { userId, params }) => {
  const id = params?.id
  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign || campaign.userId !== userId) return err('Not found', 404)
  if (campaign.status === 'sent') return err('Cannot edit a sent campaign')

  const body = await req.json()
  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      ...body,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : body.scheduledAt,
    },
  })
  return ok(updated)
})

export const DELETE = withAuth(async (req, { userId, params }) => {
  const id = params?.id
  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign || campaign.userId !== userId) return err('Not found', 404)
  if (campaign.status === 'sending') return err('Cannot delete a campaign that is currently sending')

  await prisma.campaign.delete({ where: { id } })
  return ok({ ok: true })
})
