// app/api/campaigns/[id]/send/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, ok, err } from '@/lib/api-helpers'
import { prepareCampaignRecipients, sendCampaign } from '@/lib/campaign-sender'

export const POST = withAuth(async (req, { userId, params }) => {
  const id = params?.id
  if (!id) return err('Campaign ID required')

  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign) return err('Campaign not found', 404)
  if (campaign.userId !== userId) return err('Forbidden', 403)
  if (campaign.status === 'sent' || campaign.status === 'sending') {
    return err('Campaign has already been sent or is currently sending')
  }

  // Prepare recipients
  const count = await prepareCampaignRecipients(id, campaign.groupId, userId)
  if (count === 0) return err('No subscribed contacts found for this campaign')

  // Validate credentials exist before firing
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { awsAccessKeyId: true, awsSecretAccessKey: true, fromEmail: true } })
  if (!user?.awsAccessKeyId || !user?.awsSecretAccessKey) {
    return err('AWS SES credentials not configured. Go to Settings and add your AWS credentials first.')
  }

  // For small lists await directly so errors surface; for large lists run in background
  if (count <= 50) {
    const result = await sendCampaign(id)
    if (result.failed > 0 && result.sent === 0) {
      return err(`Send failed: ${result.errors[0] || 'Unknown error'}`)
    }
    return ok({ message: `Sent to ${result.sent} contacts`, recipientCount: count, sent: result.sent, failed: result.failed, errors: result.errors })
  }

  // Large lists — fire in background
  sendCampaign(id).catch(console.error)
  return ok({ message: `Sending to ${count} contacts`, recipientCount: count })
})