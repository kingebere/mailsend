// app/api/track/click/route.ts
// Intercepts link clicks, records event, redirects to real URL
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get('c')
  const contactId = searchParams.get('u')
  const url = searchParams.get('url')

  if (!url) return NextResponse.redirect('/')

  // Decode and validate URL
  let destination: string
  try {
    destination = decodeURIComponent(url)
    // Basic safety check
    if (!destination.startsWith('http://') && !destination.startsWith('https://')) {
      destination = 'https://' + destination
    }
  } catch {
    return NextResponse.redirect('/')
  }

  // Track the click
  if (campaignId && contactId) {
    await prisma.emailEvent.create({
      data: {
        type: 'click',
        campaignId,
        contactId,
        metadata: JSON.stringify({
          url: destination,
          userAgent: req.headers.get('user-agent'),
        }),
      },
    }).catch(() => {})
  }

  return NextResponse.redirect(destination)
}