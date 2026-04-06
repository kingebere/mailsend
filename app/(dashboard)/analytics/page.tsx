'use client'
// app/(dashboard)/analytics/page.tsx
import { useEffect, useState } from 'react'
import { RefreshCw, TrendingUp, Users, Send, MousePointer } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics?days=${days}`)
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [days])

  if (loading || !stats) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
    </div>
  )

  const { contacts, sending, campaigns, dailySends } = stats
  const chartData = dailySends.map((d: any) => ({ date: d.date.slice(5), sends: Number(d.count) }))
  const bounceRate = contacts.total > 0 ? ((contacts.bounced / contacts.total) * 100).toFixed(1) : 0
  const unsubRate = contacts.total > 0 ? ((contacts.unsubscribed / contacts.total) * 100).toFixed(1) : 0

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Email performance metrics</p>
        </div>
        <select className="input w-36" value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {[
          { label: 'Emails sent', value: formatNumber(sending.totalSent), sub: `last ${days} days`, icon: Send, color: 'bg-brand-50 text-brand-600' },
          { label: 'Total opens', value: formatNumber(sending.totalOpens), sub: `${sending.avgOpenRate}% avg open rate`, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
          { label: 'Total clicks', value: formatNumber(sending.totalClicks), sub: 'tracked link clicks', icon: MousePointer, color: 'bg-blue-50 text-blue-600' },
          { label: 'List health', value: `${bounceRate}% bounce`, sub: `${unsubRate}% unsub rate`, icon: Users, color: 'bg-amber-50 text-amber-600' },
        ].map(m => (
          <div key={m.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{m.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.color}`}>
                <m.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{m.value}</div>
            <div className="text-xs text-gray-400 mt-1">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Send volume over time</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="sends" stroke="#6366f1" strokeWidth={2} fill="url(#grad2)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">No data yet</div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Campaign open rates</h2>
          {campaigns.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={campaigns.slice(0, 6).map((c: any) => ({ name: c.name.slice(0, 12), rate: c.openRate }))}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} formatter={(v: any) => [`${v}%`, 'Open rate']} />
                <Bar dataKey="rate" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">No campaigns yet</div>
          )}
        </div>
      </div>

      {/* Campaign performance table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Campaign performance</h2>
        </div>
        {campaigns.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No campaigns to show yet</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="th">Campaign</th>
                <th className="th">Sent</th>
                <th className="th">Opens</th>
                <th className="th">Clicks</th>
                <th className="th">Bounces</th>
                <th className="th">Open rate</th>
                <th className="th">Click rate</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c: any) => (
                <tr key={c.id} className="table-row">
                  <td className="td font-medium text-gray-900">{c.name}</td>
                  <td className="td">{c.sent.toLocaleString()}</td>
                  <td className="td">{c.opens.toLocaleString()}</td>
                  <td className="td">{c.clicks.toLocaleString()}</td>
                  <td className="td text-red-600">{c.bounces.toLocaleString()}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-16">
                        <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${Math.min(c.openRate, 100)}%` }} />
                      </div>
                      <span className={`text-xs font-medium ${c.openRate >= 20 ? 'text-green-600' : 'text-gray-500'}`}>
                        {c.openRate}%
                      </span>
                    </div>
                  </td>
                  <td className="td text-xs text-gray-600">{c.clickRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
