'use client'
// app/(dashboard)/dashboard/page.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, Send, TrendingUp, AlertCircle,
  ArrowRight, Plus, RefreshCw, Zap
} from 'lucide-react'
import { formatNumber, formatDateTime, estimateCost } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Stats {
  contacts: {
    total: number
    subscribed: number
    bounced: number
    unsubscribed: number
  }
  sending: {
    totalSent: number
    totalOpens: number
    totalClicks: number
    avgOpenRate: number
  }
  campaigns: Array<{
    id: string
    name: string
    status: string
    sentAt: string | null
    sent: number
    openRate: number
    clickRate: number
  }>
  dailySends: Array<{
    date: string
    count: number
  }>
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    sent: 'badge-green',
    scheduled: 'badge-yellow',
    sending: 'badge-purple',
    draft: 'badge-gray',
    cancelled: 'badge-red',
  }

  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/analytics?days=30')
        const data: Stats = await res.json()

        if (!res.ok) {
          console.error('Failed to load analytics')
          setStats(null)
          return
        }

        setStats(data)
      } catch (error) {
        console.error('Failed to load analytics:', error)
        setStats(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500">
        Failed to load dashboard data.
      </div>
    )
  }

  const s = stats
  const chartData = s.dailySends.map((d) => ({
    date: d.date.slice(5),
    sends: Number(d.count),
  }))

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Your email marketing overview
          </p>
        </div>
        <Link href="/campaigns/new" className="btn btn-primary">
          <Plus className="w-4 h-4" /> New Campaign
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Total Contacts
            </span>
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNumber(s.contacts.total)}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {formatNumber(s.contacts.subscribed)} subscribed
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Sent (30d)
            </span>
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <Send className="w-4 h-4 text-brand-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNumber(s.sending.totalSent)}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            ≈ {estimateCost(s.sending.totalSent)} in SES costs
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Avg Open Rate
            </span>
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {s.sending.avgOpenRate}%
          </div>
          <div className="text-xs text-green-500 mt-1">Industry avg: 21%</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Bounce Rate
            </span>
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {s.contacts.total > 0
              ? ((s.contacts.bounced / s.contacts.total) * 100).toFixed(1)
              : 0}
            %
          </div>
          <div className="text-xs text-gray-400 mt-1">Keep under 2%</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6 mb-6">
        <div className="card col-span-3 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Sending volume (30 days)
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={chartData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,.08)',
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 500 }}
                />
                <Area
                  type="monotone"
                  dataKey="sends"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#grad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">
              No sends in the last 30 days
            </div>
          )}
        </div>

        <div className="card col-span-2 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Quick actions
          </h2>
          <div className="space-y-2">
            {[
              {
                href: '/campaigns/new',
                icon: Send,
                label: 'Create campaign',
                desc: 'Write & send an email',
                color: 'text-brand-600 bg-brand-50',
              },
              {
                href: '/contacts',
                icon: Users,
                label: 'Import contacts',
                desc: 'Upload a CSV file',
                color: 'text-blue-600 bg-blue-50',
              },
              {
                href: '/settings',
                icon: Zap,
                label: 'Connect AWS SES',
                desc: 'Enter your credentials',
                color: 'text-amber-600 bg-amber-50',
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}
                >
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800">
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-400">{item.desc}</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto group-hover:text-gray-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Recent campaigns
          </h2>
          <Link
            href="/campaigns"
            className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {s.campaigns.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No campaigns yet.{' '}
            <Link
              href="/campaigns/new"
              className="text-brand-600 hover:underline"
            >
              Create your first one →
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="th">Campaign</th>
                <th className="th">Status</th>
                <th className="th">Sent</th>
                <th className="th">Open rate</th>
                <th className="th">Click rate</th>
                <th className="th">Date</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {s.campaigns.map((c) => (
                <tr key={c.id} className="table-row">
                  <td className="td font-medium text-gray-900">{c.name}</td>
                  <td className="td">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="td">{c.sent ? formatNumber(c.sent) : '—'}</td>
                  <td className="td">
                    {c.sent ? (
                      <span
                        className={
                          c.openRate >= 20
                            ? 'text-green-600 font-medium'
                            : 'text-gray-600'
                        }
                      >
                        {c.openRate}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="td">{c.sent ? `${c.clickRate}%` : '—'}</td>
                  <td className="td text-gray-400 text-xs">
                    {formatDateTime(c.sentAt)}
                  </td>
                  <td className="td">
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="btn btn-ghost text-xs py-1 px-2"
                    >
                      View
                    </Link>
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