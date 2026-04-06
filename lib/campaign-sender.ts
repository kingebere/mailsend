// lib/campaign-sender.ts
// Handles bulk sending with rate limiting, merge tags, unsubscribe tokens

import { db } from './db'
import { createSESClient, sendEmail, replaceMergeTags, buildUnsubscribeLink } from './ses'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const SEND_DELAY_MS = 100 // 10 emails/sec max to stay under SES rate limits

// Inject open tracking pixel into HTML email
function injectOpenPixel(html: string, campaignId: string, contactId: string): string {
  const pixel = `<img src="${APP_URL}/api/track/open?c=${campaignId}&u=${contactId}" width="1" height="1" style="display:none" alt="" />`
  // Insert before closing body tag, or append
  if (html.includes('</body>')) return html.replace('</body>', `${pixel}</body>`)
  return html + pixel
}

// Rewrite all links in HTML to go through click tracking
function injectClickTracking(html: string, campaignId: string, contactId: string): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/gi, (match, url) => {
    // Skip unsubscribe links and tracking links
    if (url.includes('/api/track/') || url.includes('unsubscribe')) return match
    const tracked = `${APP_URL}/api/track/click?c=${campaignId}&u=${contactId}&url=${encodeURIComponent(url)}`
    return `href="${tracked}"`
  })
}

export async function sendCampaign(campaignId: string): Promise<{
  sent: number
  failed: number
  errors: string[]
}> {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      user: true,
      recipients: { include: { contact: true }, where: { status: 'pending' } },
    },
  })

  if (!campaign) throw new Error('Campaign not found')
  if (!campaign.user.awsAccessKeyId || !campaign.user.awsSecretAccessKey) {
    throw new Error('AWS SES credentials not configured')
  }

  const sesClient = createSESClient({
    accessKeyId: campaign.user.awsAccessKeyId,
    secretAccessKey: campaign.user.awsSecretAccessKey,
    region: campaign.user.awsRegion,
  })

  console.log(`[Campaign ${campaignId}] Starting send to ${campaign.recipients.length} recipients using region: ${campaign.user.awsRegion}`)

  // Mark campaign as sending
  await db.campaign.update({
    where: { id: campaignId },
    data: { status: 'sending' },
  })

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const recipient of campaign.recipients) {
    const contact = recipient.contact

    // Skip unsubscribed/bounced contacts
    if (contact.status !== 'subscribed') {
      await db.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'failed' },
      })
      continue
    }

    try {
      // Create or get unsubscribe token
      const unsubToken = await db.unsubscribeToken.upsert({
        where: { token: `${campaignId}-${contact.id}` },
        update: {},
        create: {
          token: `${campaignId}-${contact.id}`,
          email: contact.email,
          userId: campaign.userId,
        },
      })

      const mergeData = {
        first_name: contact.firstName || '',
        last_name: contact.lastName || '',
        email: contact.email,
        full_name: [contact.firstName, contact.lastName].filter(Boolean).join(' '),
        unsubscribe_link: buildUnsubscribeLink(APP_URL, unsubToken.token),
      }

      const subject = replaceMergeTags(campaign.subject, mergeData)
      let htmlBody = replaceMergeTags(campaign.htmlBody, mergeData)
      const textBody = campaign.textBody
        ? replaceMergeTags(campaign.textBody, mergeData)
        : undefined

      // Inject tracking
      htmlBody = injectOpenPixel(htmlBody, campaign.id, contact.id)
      htmlBody = injectClickTracking(htmlBody, campaign.id, contact.id)

      const result = await sendEmail(sesClient, {
        to: contact.email.toLowerCase(),
        from: campaign.fromEmail,
        fromName: campaign.fromName,
        replyTo: campaign.replyTo || undefined,
        subject,
        htmlBody,
        textBody,
      })

      await db.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'sent', sentAt: new Date(), messageId: result.messageId },
      })

      // Log delivery event
      await db.emailEvent.create({
        data: {
          type: 'delivery',
          contactId: contact.id,
          campaignId: campaign.id,
          messageId: result.messageId,
        },
      })

      sent++
    } catch (err: unknown) {
      const error = err as Error
      failed++
      const errMsg = `${contact.email}: ${error.message}`
      errors.push(errMsg)
      console.error('[SES Send Error]', errMsg)

      await db.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'failed' },
      })
    }

    // Rate limiting — respect SES send rate
    await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS))
  }

  // Mark campaign complete
  await db.campaign.update({
    where: { id: campaignId },
    data: { status: 'sent', sentAt: new Date() },
  })

  console.log(`[Campaign ${campaignId}] Done — sent: ${sent}, failed: ${failed}`, errors.length ? errors : '')
  return { sent, failed, errors }
}

// Prepare recipients for a campaign from a group
export async function prepareCampaignRecipients(
  campaignId: string,
  groupId: string | null,
  userId: string
): Promise<number> {
  // Get all subscribed contacts
  const where = groupId
    ? {
        userId,
        status: 'subscribed',
        groupMembers: { some: { groupId } },
      }
    : { userId, status: 'subscribed' }

  const contacts = await db.contact.findMany({
    where,
    select: { id: true },
  })

  // Create recipient records (upsert to skip duplicates - SQLite compatible)
  for (const c of contacts) {
    await db.campaignRecipient.upsert({
      where: { campaignId_contactId: { campaignId, contactId: c.id } },
      update: {},
      create: { campaignId, contactId: c.id },
    })
  }

  return contacts.length
}