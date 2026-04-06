// app/api/campaigns/[id]/recipients/route.ts
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, ok, err } from '@/lib/api-helpers'

export const GET = withAuth<{ id: string }>(
  async (req: NextRequest, { userId, params }) => {
    const { id } = await params
    const url = new URL(req.url)

    const search = url.searchParams.get('search')?.toLowerCase() || ''

    const campaign = await db.campaign.findUnique({ where: { id } })
    if (!campaign || campaign.userId !== userId) {
      return err('Not found', 404)
    }

    const recipients = await db.campaignRecipient.findMany({
      where: { campaignId: id },
      include: { contact: true },
    })

    const events = await db.emailEvent.findMany({
      where: { campaignId: id },
    })

    const map = new Map<string, any>()

    for (const r of recipients) {
      const c = r.contact
      if (!c) continue

      if (search && !c.email.toLowerCase().includes(search)) continue

      map.set(c.id, {
        email: c.email,
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        delivered: r.status === 'sent',
        opened: false,
        clicked: false,
        bounced: r.status === 'bounced',
        unsubscribed: false,
        complained: false,
      })
    }

    for (const e of events) {
      const item = map.get(e.contactId)
      if (!item) continue

      if (e.type === 'open') item.opened = true
      if (e.type === 'click') item.clicked = true
      if (e.type === 'bounce') item.bounced = true
      if (e.type === 'unsubscribe') item.unsubscribed = true
      if (e.type === 'complaint') item.complained = true
    }

    return ok(Array.from(map.values()))
  }
)