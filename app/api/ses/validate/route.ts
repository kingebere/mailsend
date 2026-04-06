// app/api/ses/validate/route.ts
import { NextRequest } from 'next/server'
import { withAuth, ok, err } from '@/lib/api-helpers'
import { validateSESCredentials, getSendingQuota, createSESClient } from '@/lib/ses'
import { prisma } from '@/lib/prisma'

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json()
  const { awsAccessKeyId, awsSecretAccessKey, awsRegion } = body

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    return err('Access key ID and secret access key are required')
  }

  const result = await validateSESCredentials({
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    region: awsRegion || 'us-east-1',
  })

  if (!result.valid) return err(result.error || 'Invalid credentials', 400)

  // Save credentials to user
  await prisma.user.update({
    where: { id: userId },
    data: { awsAccessKeyId, awsSecretAccessKey, awsRegion: awsRegion || 'us-east-1' },
  })

  return ok({ valid: true, quota: result.quota })
})

export const GET = withAuth(async (req, { userId }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.awsAccessKeyId || !user?.awsSecretAccessKey) {
    return ok({ connected: false })
  }

  try {
    const client = createSESClient({
      accessKeyId: user.awsAccessKeyId,
      secretAccessKey: user.awsSecretAccessKey,
      region: user.awsRegion,
    })
    const quota = await getSendingQuota(client)
    return ok({ connected: true, quota, region: user.awsRegion })
  } catch {
    return ok({ connected: false, error: 'Could not connect to SES' })
  }
})
