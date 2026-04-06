// app/api/analytics/campaign/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, ok, err } from '@/lib/api-helpers'

export const GET = withAuth(async (req, { userId, params }) => {
  const id = params?.id
  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign || campaign.userId !== userId) return err('Not found', 404)

  // Top clicked links
  const clickEvents = await prisma.emailEvent.findMany({
    where: { campaignId: id, type: 'click' },
    select: { metadata: true },
  })

  const linkCounts: Record<string, number> = {}
  for (const ev of clickEvents) {
    try {
      const meta = JSON.parse(ev.metadata || '{}')
      if (meta.url) linkCounts[meta.url] = (linkCounts[meta.url] || 0) + 1
    } catch {}
  }

  const topLinks = Object.entries(linkCounts)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 10)
    .map(([url, clicks]) => ({ url, clicks }))

  // Opens by hour
  const openEvents = await prisma.emailEvent.findMany({
    where: { campaignId: id, type: 'open' },
    select: { createdAt: true },
  })

  const hourCounts: Record<number, number> = {}
  for (const ev of openEvents) {
    const hour = new Date(ev.createdAt).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  }

  const opensByHour = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    opens: hourCounts[h] || 0,
  }))

  return ok({ topLinks, opensByHour })
})