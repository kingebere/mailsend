// app/api/send/route.ts
// Developer API endpoint for transactional emails
// Usage: POST /api/send with Bearer token (API key or JWT)

import { NextRequest } from 'next/server'
import { withApiKeyAuth, ok, err } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { createSESClient, sendEmail, replaceMergeTags } from '@/lib/ses'
import { z } from 'zod'

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
  from: z.string().email().optional(),
  fromName: z.string().optional(),
  replyTo: z.string().email().optional(),
  data: z.record(z.string()).optional(), // merge tag values
})

export const POST = withApiKeyAuth(async (req, { userId }) => {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.awsAccessKeyId || !user?.awsSecretAccessKey) {
    return err('AWS SES credentials not configured. Set them in Settings.', 503)
  }

  const { to, subject, html, text, from, fromName, replyTo, data = {} } = parsed.data

  const fromEmail = from || user.fromEmail
  if (!fromEmail) return err('No sender email configured. Set a default in Settings or pass "from" in the request.')

  const client = createSESClient({
    accessKeyId: user.awsAccessKeyId,
    secretAccessKey: user.awsSecretAccessKey,
    region: user.awsRegion,
  })

  const mergedSubject = replaceMergeTags(subject, data)
  const mergedHtml = replaceMergeTags(html, data)
  const mergedText = text ? replaceMergeTags(text, data) : undefined

  const result = await sendEmail(client, {
    to,
    from: fromEmail,
    fromName: fromName || user.fromName || undefined,
    replyTo,
    subject: mergedSubject,
    htmlBody: mergedHtml,
    textBody: mergedText,
  })

  // Log event
  const contact = await prisma.contact.findFirst({ where: { email: to, userId } })
  await prisma.emailEvent.create({
    data: {
      type: 'delivery',
      contactId: contact?.id,
      messageId: result.messageId,
      metadata: JSON.stringify({ transactional: true }),
    },
  })

  return ok({ messageId: result.messageId })
})
