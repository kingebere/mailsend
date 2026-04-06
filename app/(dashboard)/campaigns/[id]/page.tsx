'use client'
// app/(dashboard)/campaigns/[id]/page.tsx
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Send, Trash2, RefreshCw,
  Users, TrendingUp, MousePointer, AlertCircle,
  Clock, CheckCircle2, Loader2, PlayCircle
} from 'lucide-react'
import { formatDateTime, formatNumber, estimateCost } from '@/lib/utils'

interface Campaign {
  id: string
  name: string
  subject: string
  fromEmail: string
  fromName: string
  replyTo: string | null
  previewText: string | null
  htmlBody: string
  status: string
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
  group: { id: string; name: string } | null
  _count: { recipients: number }
}

interface Stats {
  sent: number
  opens: number
  clicks: number
  bounces: number
  failed: number
  openRate: number
  clickRate: number
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    sent:      { label: 'Sent',      cls: 'badge-green',  icon: <CheckCircle2 className="w-3 h-3" /> },
    scheduled: { label: 'Scheduled', cls: 'badge-yellow', icon: <Clock className="w-3 h-3" /> },
    sending:   { label: 'Sending…',  cls: 'badge-purple', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    draft:     { label: 'Draft',     cls: 'badge-gray',   icon: null },
    cancelled: { label: 'Cancelled', cls: 'badge-red',    icon: null },
  }
  const s = map[status] || map.draft
  return (
    <span className={`badge ${s.cls} flex items-center gap-1`}>
      {s.icon}{s.label}
    </span>
  )
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  async function load() {
    setLoading(true)
    const [cRes, aRes] = await Promise.all([
      fetch(`/api/campaigns/${id}`),
      fetch(`/api/analytics?days=365`),
    ])
    if (!cRes.ok) { router.push('/campaigns'); return }
    const cData = await cRes.json()
    const aData = await aRes.json()
    setCampaign(cData)
    // Find this campaign's stats from analytics
    const found = aData?.campaigns?.find((c: any) => c.id === id)
    if (found) {
      setStats({
        sent: found.sent,
        opens: found.opens,
        clicks: found.clicks,
        bounces: found.bounces,
        failed: 0,
        openRate: found.openRate,
        clickRate: found.clickRate,
      })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  // Poll while sending
  useEffect(() => {
    if (campaign?.status !== 'sending') return
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [campaign?.status])

  async function handleSend() {
    if (!confirm('Send this campaign now?')) return
    setSending(true)
    const res = await fetch(`/api/campaigns/${id}/send`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setSending(false); return }
    alert(`✅ ${data.message}`)
    setSending(false)
    load()
  }

  async function handleDelete() {
    if (!confirm('Delete this campaign permanently?')) return
    const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/campaigns')
    else { const d = await res.json(); alert(d.error) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
    </div>
  )

  if (!campaign) return null

  const isSendable = campaign.status === 'draft' || campaign.status === 'scheduled'

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/campaigns" className="btn btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{campaign.subject}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isSendable && (
            <button onClick={handleSend} disabled={sending} className="btn btn-primary">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              Send now
            </button>
          )}
          {campaign.status !== 'sending' && (
            <button onClick={handleDelete} className="btn btn-danger">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Sending in progress notice */}
      {campaign.status === 'sending' && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-brand-50 border border-brand-200 rounded-xl">
          <Loader2 className="w-5 h-5 text-brand-600 animate-spin flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-brand-800">Sending in progress…</div>
            <div className="text-xs text-brand-600 mt-0.5">This page will update automatically. Don't close it.</div>
          </div>
        </div>
      )}

      {/* Stats — only show if sent */}
      {campaign.status === 'sent' && stats && (
        <div className="grid grid-cols-4 gap-5 mb-8">
          <StatCard label="Delivered" value={formatNumber(stats.sent)}
            sub={`of ${campaign._count.recipients} recipients`}
            icon={Send} color="bg-brand-50 text-brand-600" />
          <StatCard label="Opens" value={`${stats.openRate}%`}
            sub={`${formatNumber(stats.opens)} total opens`}
            icon={TrendingUp} color={stats.openRate >= 20 ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'} />
          <StatCard label="Clicks" value={`${stats.clickRate}%`}
            sub={`${formatNumber(stats.clicks)} total clicks`}
            icon={MousePointer} color="bg-blue-50 text-blue-600" />
          <StatCard label="Bounces" value={formatNumber(stats.bounces)}
            sub={stats.sent > 0 ? `${((stats.bounces / stats.sent) * 100).toFixed(1)}% bounce rate` : ''}
            icon={AlertCircle} color={stats.bounces > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'} />
        </div>
      )}

      <div className="grid grid-cols-5 gap-6">
        {/* Details */}
        <div className="col-span-2 space-y-5">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Campaign details</h2>
            <dl className="space-y-3 text-sm">
              {[
                { label: 'From', value: `${campaign.fromName} <${campaign.fromEmail}>` },
                { label: 'Reply-to', value: campaign.replyTo || campaign.fromEmail },
                { label: 'Audience', value: campaign.group?.name || 'All contacts' },
                { label: 'Recipients', value: campaign._count.recipients.toLocaleString() },
                { label: 'Estimated cost', value: estimateCost(campaign._count.recipients) },
                { label: 'Created', value: formatDateTime(campaign.createdAt) },
                ...(campaign.sentAt ? [{ label: 'Sent', value: formatDateTime(campaign.sentAt) }] : []),
                ...(campaign.scheduledAt && campaign.status === 'scheduled'
                  ? [{ label: 'Scheduled for', value: formatDateTime(campaign.scheduledAt) }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-gray-400 flex-shrink-0">{label}</dt>
                  <dd className="text-gray-900 text-right truncate">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* No credentials warning */}
          {isSendable && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                <div>
                  Make sure your AWS SES credentials are saved in{' '}
                  <Link href="/settings" className="underline font-medium">Settings</Link>{' '}
                  before sending.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Email preview */}
        <div className="col-span-3">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <div>
                <div className="text-xs text-gray-400">Subject</div>
                <div className="text-sm font-medium text-gray-900">{campaign.subject}</div>
                {campaign.previewText && (
                  <div className="text-xs text-gray-400 mt-0.5">{campaign.previewText}</div>
                )}
              </div>
              <button
                onClick={() => setShowPreview(p => !p)}
                className="btn btn-secondary text-xs py-1.5 px-3"
              >
                {showPreview ? 'Hide preview' : 'Show preview'}
              </button>
            </div>
            {showPreview ? (
              <div className="bg-white overflow-auto max-h-[500px]"
                dangerouslySetInnerHTML={{ __html: campaign.htmlBody }} />
            ) : (
              <div className="p-5">
                <div className="text-xs font-medium text-gray-500 mb-2">HTML source</div>
                <pre className="text-xs text-gray-500 overflow-auto max-h-[400px] whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {campaign.htmlBody}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}