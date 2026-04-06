// app/api/ses-webhook/route.ts
// AWS SNS → SES event notifications (bounces, complaints, deliveries)
// Set this URL in your AWS SNS Topic subscription:
// https://yourdomain.com/api/ses-webhook

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.text()
  let message: Record<string, unknown>

  try {
    message = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // SNS subscription confirmation
  if (message.Type === 'SubscriptionConfirmation') {
    const subscribeUrl = message.SubscribeURL as string
    await fetch(subscribeUrl) // Auto-confirm the subscription
    return NextResponse.json({ ok: true })
  }

  if (message.Type !== 'Notification') {
    return NextResponse.json({ ok: true })
  }

  let notification: Record<string, unknown>
  try {
    notification = JSON.parse(message.Message as string)
  } catch {
    return NextResponse.json({ ok: true })
  }

  const notifType = notification.notificationType as string

  if (notifType === 'Bounce') {
    const bounce = notification.bounce as Record<string, unknown>
    const recipients = bounce.bouncedRecipients as Array<{ emailAddress: string }>
    const bounceType = bounce.bounceType as string // Permanent | Transient

    for (const r of recipients) {
      const email = r.emailAddress?.toLowerCase()
      if (!email) continue

      if (bounceType === 'Permanent') {
        // Hard bounce — mark contact as bounced, never send again
        await db.contact.updateMany({
          where: { email },
          data: { status: 'bounced' },
        })
      }

      // Log the event
      const contact = await db.contact.findFirst({ where: { email } })
      if (contact) {
        await db.emailEvent.create({
          data: {
            type: 'bounce',
            contactId: contact.id,
            metadata: JSON.stringify({ bounceType, subType: bounce.bounceSubType }),
          },
        })
      }
    }
  }

  if (notifType === 'Complaint') {
    const complaint = notification.complaint as Record<string, unknown>
    const recipients = complaint.complainedRecipients as Array<{ emailAddress: string }>

    for (const r of recipients) {
      const email = r.emailAddress?.toLowerCase()
      if (!email) continue

      // Spam complaint — unsubscribe immediately
      await db.contact.updateMany({
        where: { email },
        data: { status: 'complained' },
      })

      const contact = await db.contact.findFirst({ where: { email } })
      if (contact) {
        await db.emailEvent.create({
          data: {
            type: 'complaint',
            contactId: contact.id,
            metadata: JSON.stringify({ feedbackType: complaint.complaintFeedbackType }),
          },
        })
      }
    }
  }

  if (notifType === 'Delivery') {
    const delivery = notification.delivery as Record<string, unknown>
    const recipients = delivery.recipients as string[]
    for (const email of recipients || []) {
      const contact = await db.contact.findFirst({ where: { email: email.toLowerCase() } })
      if (contact) {
        await db.emailEvent.create({
          data: { type: 'delivery', contactId: contact.id },
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
