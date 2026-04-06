// app/api/track/open/route.ts
// Called when email is opened — serves a 1x1 transparent pixel
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get('c')
  const contactId = searchParams.get('u')

  if (campaignId && contactId) {
    // Check not already tracked (deduplicate opens)
    const existing = await prisma.emailEvent.findFirst({
      where: { type: 'open', campaignId, contactId },
    })
    if (!existing) {
      await prisma.emailEvent.create({
        data: {
          type: 'open',
          campaignId,
          contactId,
          metadata: JSON.stringify({
            userAgent: req.headers.get('user-agent'),
            ip: req.headers.get('x-forwarded-for'),
          }),
        },
      }).catch(() => {}) // never fail a pixel request
    }
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
    },
  })
}