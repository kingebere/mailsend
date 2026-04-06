// app/api/analytics/campaign/[id]/route.ts
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, ok, err } from '@/lib/api-helpers'

export const GET = withAuth<{ id: string }>(
  async (_req: NextRequest, { userId, params }) => {
    const { id } = await params

    const campaign = await db.campaign.findUnique({
      where: { id },
    })

    if (!campaign || campaign.userId !== userId) {
      return err('Not found', 404)
    }

    const clickEvents = await db.emailEvent.findMany({
      where: { campaignId: id, type: 'click' },
      select: { metadata: true },
    })

    const linkCounts: Record<string, number> = {}

    for (const ev of clickEvents) {
      try {
        const rawMeta = ev.metadata
        const meta =
          typeof rawMeta === 'string'
            ? JSON.parse(rawMeta)
            : (rawMeta ?? {})

        if (
          meta &&
          typeof meta === 'object' &&
          'url' in meta &&
          typeof meta.url === 'string' &&
          meta.url.length > 0
        ) {
          linkCounts[meta.url] = (linkCounts[meta.url] || 0) + 1
        }
      } catch {
        // ignore malformed metadata
      }
    }

    const topLinks = Object.entries(linkCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([url, clicks]) => ({ url, clicks }))

    const openEvents = await db.emailEvent.findMany({
      where: { campaignId: id, type: 'open' },
      select: { createdAt: true },
    })

    const hourCounts: Record<number, number> = {}

    for (const ev of openEvents) {
      const hour = new Date(ev.createdAt).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    }

    const opensByHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      opens: hourCounts[hour] || 0,
    }))

    return ok({ topLinks, opensByHour })
  }
)