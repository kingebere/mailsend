'use client'
// app/(dashboard)/campaigns/page.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Send, Trash2, Eye, RefreshCw, PlayCircle } from 'lucide-react'
import { formatNumber, formatDateTime } from '@/lib/utils'

interface Campaign {
  id: string; name: string; subject: string; status: string
  sentAt: string | null; createdAt: string; scheduledAt: string | null
  group: { id: string; name: string } | null
  stats: { sent: number; openRate: number; clickRate: number }
  _count: { recipients: number }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    sent: 'badge-green', scheduled: 'badge-yellow', sending: 'badge-purple',
    draft: 'badge-gray', cancelled: 'badge-red',
  }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/campaigns')
    const data = await res.json()
    setCampaigns(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSend(id: string) {
    if (!confirm('Send this campaign now to all recipients?')) return
    setSending(id)
    const res = await fetch(`/api/campaigns/${id}/send`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setSending(null); return }
    alert(`✅ ${data.message}`)
    setSending(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this campaign? This cannot be undone.')) return
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">{campaigns.length} total campaigns</p>
        </div>
        <Link href="/campaigns/new" className="btn btn-primary">
          <Plus className="w-4 h-4" /> New Campaign
        </Link>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-16 text-center">
            <Send className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">No campaigns yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Create your first email campaign to get started</p>
            <Link href="/campaigns/new" className="btn btn-primary">
              <Plus className="w-4 h-4" /> Create campaign
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="th">Campaign</th>
                <th className="th">Audience</th>
                <th className="th">Status</th>
                <th className="th">Sent</th>
                <th className="th">Opens</th>
                <th className="th">Clicks</th>
                <th className="th">Date</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="td">
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[220px]">{c.subject}</div>
                  </td>
                  <td className="td text-gray-500">{c.group?.name || 'All contacts'}</td>
                  <td className="td"><StatusBadge status={c.status} /></td>
                  <td className="td">{c.stats.sent ? formatNumber(c.stats.sent) : '—'}</td>
                  <td className="td">
                    {c.stats.sent
                      ? <span className={c.stats.openRate >= 20 ? 'text-green-600 font-medium' : ''}>{c.stats.openRate}%</span>
                      : '—'}
                  </td>
                  <td className="td">{c.stats.sent ? `${c.stats.clickRate}%` : '—'}</td>
                  <td className="td text-xs text-gray-400">
                    {c.sentAt ? formatDateTime(c.sentAt) : c.scheduledAt ? `Scheduled: ${formatDateTime(c.scheduledAt)}` : formatDateTime(c.createdAt)}
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1">
                      <Link href={`/campaigns/${c.id}`} className="btn btn-ghost py-1 px-2 text-xs">
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      {(c.status === 'draft' || c.status === 'scheduled') && (
                        <button
                          onClick={() => handleSend(c.id)}
                          disabled={sending === c.id}
                          className="btn btn-ghost py-1 px-2 text-xs text-green-600 hover:bg-green-50"
                        >
                          {sending === c.id
                            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            : <PlayCircle className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {c.status !== 'sending' && (
                        <button onClick={() => handleDelete(c.id)} className="btn btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
