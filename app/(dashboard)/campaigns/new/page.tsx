'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send, Trash2, Loader2, AlertCircle
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  subject: string
  status: string
  createdAt: string
  _count: { recipients: number }
}

type SendCampaignResponse = {
  message?: string
  error?: string
}

type DeleteCampaignResponse = {
  error?: string
}

export default function CampaignsPage() {
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    setLoading(true)

    try {
      const res = await fetch('/api/campaigns')

      const data: Campaign[] = res.ok ? await res.json() : []

      setCampaigns(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load campaigns:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSend(id: string) {
    if (!confirm('Send this campaign now?')) return

    setSending(id)

    try {
      const res = await fetch(`/api/campaigns/${id}/send`, {
        method: 'POST',
      })

      const data: SendCampaignResponse = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to send campaign')
        return
      }

      alert(`✅ ${data.message || 'Campaign sent successfully'}`)
      load()
    } catch (err) {
      console.error('Send error:', err)
      alert('Something went wrong')
    } finally {
      setSending(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this campaign permanently?')) return

    setDeleting(id)

    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        load()
      } else {
        const d: DeleteCampaignResponse = await res.json()
        alert(d.error || 'Failed to delete campaign')
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('Something went wrong')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Campaigns</h1>

      {campaigns.length === 0 ? (
        <div className="text-sm text-gray-500">
          No campaigns yet.
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <div className="font-semibold text-gray-900">
                  {c.name}
                </div>
                <div className="text-sm text-gray-500">
                  {c.subject}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {c._count.recipients} recipients
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSend(c.id)}
                  disabled={sending === c.id}
                  className="btn btn-primary"
                >
                  {sending === c.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={deleting === c.id}
                  className="btn btn-secondary"
                >
                  {deleting === c.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}