// app/api/analytics/route.ts
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, ok } from '@/lib/api-helpers'
import { subDays, startOfDay } from 'date-fns'

export const GET = withAuth(async (req, { userId }) => {
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '30')

  const since = subDays(new Date(), days)

  const [
    totalContacts,
    subscribedContacts,
    bouncedContacts,
    unsubscribedContacts,
    totalSent,
    totalOpens,
    totalClicks,
    recentCampaigns,
    dailySends,
  ] = await Promise.all([
    db.contact.count({ where: { userId } }),
    db.contact.count({ where: { userId, status: 'subscribed' } }),
    db.contact.count({ where: { userId, status: 'bounced' } }),
    db.contact.count({ where: { userId, status: 'unsubscribed' } }),
    db.campaignRecipient.count({
      where: { campaign: { userId }, status: 'sent', sentAt: { gte: since } },
    }),
    db.emailEvent.count({
      where: { type: 'open', contact: { userId }, createdAt: { gte: since } },
    }),
    db.emailEvent.count({
      where: { type: 'click', contact: { userId }, createdAt: { gte: since } },
    }),
    db.campaign.findMany({
      where: { userId },
      include: { _count: { select: { recipients: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // Daily send volume for chart
    db.$queryRaw<{ date: string; count: number }[]>`
      SELECT date(cr.sentAt) as date, count(*) as count
      FROM CampaignRecipient cr
      JOIN Campaign c ON c.id = cr.campaignId
      WHERE c.userId = ${userId}
        AND cr.sentAt >= ${since.toISOString()}
        AND cr.status = 'sent'
      GROUP BY date(cr.sentAt)
      ORDER BY date ASC
    `,
  ])

  // Build campaign stats
  const campaignStats = await Promise.all(
    recentCampaigns.map(async (c: { id: any; name: any; status: any; sentAt: any; createdAt: any }) => {
      const [sent, opens, clicks, bounces] = await Promise.all([
        db.campaignRecipient.count({ where: { campaignId: c.id, status: 'sent' } }),
        db.emailEvent.count({ where: { campaignId: c.id, type: 'open' } }),
        db.emailEvent.count({ where: { campaignId: c.id, type: 'click' } }),
        db.emailEvent.count({ where: { campaignId: c.id, type: 'bounce' } }),
      ])
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        sentAt: c.sentAt,
        createdAt: c.createdAt,
        sent,
        opens,
        clicks,
        bounces,
        openRate: sent > 0 ? Math.round((opens / sent) * 1000) / 10 : 0,
        clickRate: sent > 0 ? Math.round((clicks / sent) * 1000) / 10 : 0,
      }
    })
  )

  const avgOpenRate =
    campaignStats.length > 0
      ? Math.round(
          (campaignStats.reduce((a: number, c: { openRate: number }) => a + c.openRate, 0) / campaignStats.length) * 10
        ) / 10
      : 0

  return ok({
    contacts: { total: totalContacts, subscribed: subscribedContacts, bounced: bouncedContacts, unsubscribed: unsubscribedContacts },
    sending: { totalSent, totalOpens, totalClicks, avgOpenRate },
    campaigns: campaignStats,
    dailySends,
  })
})