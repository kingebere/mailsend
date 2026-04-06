// app/api/ses/validate/route.ts
import { withAuth, ok, err } from '@/lib/api-helpers'
import { validateSESCredentials, getSendingQuota, createSESClient } from '@/lib/ses'
import { db } from '@/lib/db'

interface ValidateSESBody {
  awsAccessKeyId?: string
  awsSecretAccessKey?: string
  awsRegion?: string
}

export const POST = withAuth(async (req, { userId }) => {
  const body: ValidateSESBody = await req.json()
  const { awsAccessKeyId, awsSecretAccessKey, awsRegion } = body

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    return err('Access key ID and secret access key are required')
  }

  const region = awsRegion || 'us-east-1'

  const result = await validateSESCredentials({
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    region,
  })

  if (!result.valid) {
    return err(result.error || 'Invalid credentials', 400)
  }

  await db.user.update({
    where: { id: userId },
    data: {
      awsAccessKeyId,
      awsSecretAccessKey,
      awsRegion: region,
    },
  })

  return ok({ valid: true, quota: result.quota })
})

export const GET = withAuth(async (_req, { userId }) => {
  const user = await db.user.findUnique({ where: { id: userId } })

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