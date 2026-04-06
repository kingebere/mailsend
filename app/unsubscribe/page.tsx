// app/unsubscribe/page.tsx
import { db } from '@/lib/db'
import { Mail, CheckCircle2, XCircle } from 'lucide-react'

type Props = {
  searchParams: Promise<{
    token?: string | string[]
  }>
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams
  const unsubscribeToken = Array.isArray(token) ? token[0] : token

  if (!unsubscribeToken) {
    return (
      <UnsubscribeLayout
        success={false}
        message="Invalid unsubscribe link."
      />
    )
  }

  const record = await db.unsubscribeToken.findUnique({
    where: { token: unsubscribeToken },
  })

  if (!record) {
    return (
      <UnsubscribeLayout
        success={false}
        message="This unsubscribe link is invalid or has expired."
      />
    )
  }

  await db.contact.updateMany({
    where: { email: record.email, userId: record.userId },
    data: { status: 'unsubscribed' },
  })

  return <UnsubscribeLayout success={true} email={record.email} />
}

function UnsubscribeLayout({
  success,
  email,
  message,
}: {
  success: boolean
  email?: string
  message?: string
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-600 rounded-xl mb-6">
          <Mail className="w-6 h-6 text-white" />
        </div>

        {success ? (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              You're unsubscribed
            </h1>
            <p className="text-gray-500 text-sm">
              <strong>{email}</strong> has been removed from this mailing list.
              You won't receive any more emails.
            </p>
            <p className="text-xs text-gray-400 mt-4">
              Changed your mind? Contact the sender to re-subscribe.
            </p>
          </>
        ) : (
          <>
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Invalid link
            </h1>
            <p className="text-gray-500 text-sm">{message}</p>
          </>
        )}
      </div>
    </div>
  )
}