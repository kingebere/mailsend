// lib/ses.ts
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
  GetSendQuotaCommand,
  GetSendStatisticsCommand,
} from '@aws-sdk/client-ses'

export interface SESConfig {
  accessKeyId: string
  secretAccessKey: string
  region: string
}

export interface SendEmailOptions {
  to: string
  from: string
  fromName?: string
  replyTo?: string
  subject: string
  htmlBody: string
  textBody?: string
  messageId?: string // for tracking
}

export function createSESClient(config: SESConfig): SESClient {
  return new SESClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

export async function sendEmail(
  client: SESClient,
  options: SendEmailOptions
): Promise<{ messageId: string }> {
  const params: SendEmailCommandInput = {
    Destination: {
      ToAddresses: [options.to],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: options.htmlBody,
        },
        ...(options.textBody && {
          Text: {
            Charset: 'UTF-8',
            Data: options.textBody,
          },
        }),
      },
      Subject: {
        Charset: 'UTF-8',
        Data: options.subject,
      },
    },
    Source: options.fromName
      ? `${options.fromName} <${options.from}>`
      : options.from,
    ...(options.replyTo && {
      ReplyToAddresses: [options.replyTo],
    }),
  }

  const command = new SendEmailCommand(params)
  const response = await client.send(command)
  return { messageId: response.MessageId || '' }
}

export async function getSendingQuota(client: SESClient) {
  const command = new GetSendQuotaCommand({})
  const response = await client.send(command)
  return {
    max24HourSend: response.Max24HourSend || 0,
    maxSendRate: response.MaxSendRate || 0,
    sentLast24Hours: response.SentLast24Hours || 0,
  }
}

export async function getSendStatistics(client: SESClient) {
  const command = new GetSendStatisticsCommand({})
  const response = await client.send(command)
  return response.SendDataPoints || []
}

// Replace merge tags in email content
// Supports: {{first_name}}, {{last_name}}, {{email}}, {{unsubscribe_link}}, any custom tag
export function replaceMergeTags(
  content: string,
  data: Record<string, string>
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || match
  })
}

// Build the unsubscribe link for a contact
export function buildUnsubscribeLink(
  appUrl: string,
  token: string
): string {
  return `${appUrl}/unsubscribe?token=${token}`
}

// Validate AWS credentials by attempting to get quota
export async function validateSESCredentials(config: SESConfig): Promise<{
  valid: boolean
  error?: string
  quota?: { max24HourSend: number; sentLast24Hours: number; maxSendRate: number }
}> {
  try {
    const client = createSESClient(config)
    const quota = await getSendingQuota(client)
    return { valid: true, quota }
  } catch (err: unknown) {
    const error = err as Error
    return {
      valid: false,
      error: error.message?.includes('InvalidClientTokenId')
        ? 'Invalid AWS credentials'
        : error.message?.includes('AccessDenied')
        ? 'Access denied — check your IAM permissions'
        : error.message || 'Failed to connect to AWS SES',
    }
  }
}
