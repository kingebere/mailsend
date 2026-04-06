'use client'
// app/(dashboard)/campaigns/[id]/report/page.tsx
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, TrendingUp, Users, Send, MousePointer,
  AlertCircle, Clock, CheckCircle2, XCircle, RefreshCw,
  Download, Mail, BarChart2, Activity
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { formatDateTime, formatNumber } from '@/lib/utils'

interface Report {
  campaign: { id:string; name:string; subject:string; fromEmail:string; sentAt:string|null; status:string; _count:{recipients:number}; group:{name:string}|null }
  stats: { sent:number; failed:number; opens:number; uniqueOpens:number; clicks:number; uniqueClicks:number; bounces:number; complaints:number; unsubscribes:number }
  topLinks: { url:string; clicks:number }[]
  opensByHour: { hour:number; opens:number }[]
}

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6']

function Metric({ label, value, sub, icon:Icon, color, large }:{
  label:string; value:string|number; sub?:string
  icon:React.ElementType; color:string; large?:boolean
}){
  return(
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4"/>
        </div>
      </div>
      <div className={`font-bold text-gray-900 ${large?'text-3xl':'text-2xl'}`}>{value}</div>
      {sub&&<div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function RateBar({ label, value, max, color }:{ label:string; value:number; max:number; color:string }){
  const pct = max>0 ? Math.min((value/max)*100, 100) : 0
  return(
    <div className="flex items-center gap-3 py-2">
      <div className="text-sm text-gray-600 w-32 flex-shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:color}}/>
      </div>
      <div className="text-sm font-medium text-gray-900 w-16 text-right">{value.toLocaleString()}</div>
      <div className="text-xs text-gray-400 w-12 text-right">{pct.toFixed(1)}%</div>
    </div>
  )
}

export default function CampaignReportPage(){
  const {id} = useParams<{id:string}>()
  const router = useRouter()
  const [report, setReport] = useState<Report|null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    // Load campaign + analytics
    Promise.all([
      fetch(`/api/campaigns/${id}`).then(r=>r.json()),
      fetch(`/api/analytics?days=365`).then(r=>r.json()),
      fetch(`/api/analytics/campaign/${id}`).then(r=>r.ok?r.json():{}).catch(()=>({})),
    ]).then(([campaign, analytics, detail])=>{
      if (!campaign?.id){ router.push('/campaigns'); return }
      const found = analytics?.campaigns?.find((c:any)=>c.id===id) || {}
      const sent = found.sent || 0
      setReport({
        campaign,
        stats:{
          sent,
          failed: (campaign._count?.recipients||0) - sent,
          opens: found.opens||0,
          uniqueOpens: found.opens||0,
          clicks: found.clicks||0,
          uniqueClicks: found.clicks||0,
          bounces: found.bounces||0,
          complaints: 0,
          unsubscribes: 0,
        },
        topLinks: detail.topLinks||[],
        opensByHour: detail.opensByHour||Array.from({length:24},(_,i)=>({hour:i,opens:0})),
      })
      setLoading(false)
    })
  },[id])

  if(loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-5 h-5 text-gray-400 animate-spin"/></div>
  if(!report) return null

  const {campaign,stats} = report
  const total = campaign._count.recipients
  const deliveryRate = total>0 ? ((stats.sent/total)*100).toFixed(1) : '0'
  const openRate = stats.sent>0 ? ((stats.uniqueOpens/stats.sent)*100).toFixed(1) : '0'
  const clickRate = stats.sent>0 ? ((stats.uniqueClicks/stats.sent)*100).toFixed(1) : '0'
  const clickToOpenRate = stats.uniqueOpens>0 ? ((stats.uniqueClicks/stats.uniqueOpens)*100).toFixed(1) : '0'
  const bounceRate = total>0 ? ((stats.bounces/total)*100).toFixed(1) : '0'

  const deliveryPieData = [
    {name:'Delivered', value:stats.sent},
    {name:'Failed/Bounced', value:stats.failed+stats.bounces},
  ].filter(d=>d.value>0)

  const engagementData = [
    {name:'Opened',   value:Number(openRate)},
    {name:'Clicked',  value:Number(clickRate)},
    {name:'Bounced',  value:Number(bounceRate)},
  ]

  const hourlyData = Array.from({length:24},(_,h)=>({
    hour:`${h}:00`,
    opens: report.opensByHour.find(o=>o.hour===h)?.opens||0
  }))

  const deliveryGrade = Number(deliveryRate)>=95?'A':Number(deliveryRate)>=85?'B':Number(deliveryRate)>=70?'C':'D'
  const openGrade = Number(openRate)>=25?'A':Number(openRate)>=15?'B':Number(openRate)>=10?'C':'D'
  const gradeColor = {A:'text-green-600 bg-green-50',B:'text-blue-600 bg-blue-50',C:'text-amber-600 bg-amber-50',D:'text-red-600 bg-red-50'}

  return(
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/campaigns/${id}`} className="btn btn-ghost p-2"><ArrowLeft className="w-4 h-4"/></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Campaign Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">{campaign.name} · {formatDateTime(campaign.sentAt)}</p>
        </div>
        <button onClick={()=>window.print()} className="btn btn-secondary text-sm"><Download className="w-4 h-4"/>Export PDF</button>
      </div>

      {/* Campaign summary bar */}
      <div className="card p-5 mb-6 flex flex-wrap gap-6">
        <div><div className="text-xs text-gray-400 mb-1">Subject</div><div className="text-sm font-medium text-gray-900">{campaign.subject}</div></div>
        <div><div className="text-xs text-gray-400 mb-1">From</div><div className="text-sm text-gray-700">{campaign.fromEmail}</div></div>
        <div><div className="text-xs text-gray-400 mb-1">Audience</div><div className="text-sm text-gray-700">{campaign.group?.name||'All contacts'}</div></div>
        <div><div className="text-xs text-gray-400 mb-1">Total recipients</div><div className="text-sm font-semibold text-gray-900">{total.toLocaleString()}</div></div>
        <div><div className="text-xs text-gray-400 mb-1">Sent</div><div className="text-sm text-gray-700">{formatDateTime(campaign.sentAt)}</div></div>
      </div>

      {/* Grade cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-5 flex items-center gap-4">
          <div className={`text-4xl font-black rounded-xl w-16 h-16 flex items-center justify-center ${gradeColor[deliveryGrade as keyof typeof gradeColor]}`}>{deliveryGrade}</div>
          <div>
            <div className="text-base font-semibold text-gray-900">Delivery score</div>
            <div className="text-sm text-gray-500">{deliveryRate}% delivered · {Number(deliveryRate)>=95?'Excellent — above 95% target':'Needs improvement — aim for 95%+'}</div>
            {Number(deliveryRate)<95&&<div className="text-xs text-amber-600 mt-1">⚠️ Consider verifying your contact list</div>}
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className={`text-4xl font-black rounded-xl w-16 h-16 flex items-center justify-center ${gradeColor[openGrade as keyof typeof gradeColor]}`}>{openGrade}</div>
          <div>
            <div className="text-base font-semibold text-gray-900">Engagement score</div>
            <div className="text-sm text-gray-500">{openRate}% open rate · {Number(openRate)>=25?'Excellent — above industry avg':'Industry avg is ~21%'}</div>
            {Number(openRate)<15&&<div className="text-xs text-amber-600 mt-1">⚠️ Try a more compelling subject line</div>}
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Metric label="Delivered" value={stats.sent.toLocaleString()} sub={`${deliveryRate}% delivery rate`} icon={Send} color="bg-brand-50 text-brand-600"/>
        <Metric label="Unique opens" value={stats.uniqueOpens.toLocaleString()} sub={`${openRate}% open rate`} icon={TrendingUp} color={Number(openRate)>=20?'bg-green-50 text-green-600':'bg-gray-50 text-gray-500'}/>
        <Metric label="Unique clicks" value={stats.uniqueClicks.toLocaleString()} sub={`${clickRate}% click rate`} icon={MousePointer} color="bg-blue-50 text-blue-600"/>
        <Metric label="Bounced" value={stats.bounces.toLocaleString()} sub={`${bounceRate}% bounce rate`} icon={AlertCircle} color={stats.bounces>0?'bg-red-50 text-red-500':'bg-gray-50 text-gray-400'}/>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Delivery funnel */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5 flex items-center gap-2"><Activity className="w-4 h-4 text-brand-500"/>Delivery funnel</h2>
          <RateBar label="Recipients" value={total} max={total} color="#e5e7eb"/>
          <RateBar label="Delivered" value={stats.sent} max={total} color="#6366f1"/>
          <RateBar label="Opened" value={stats.uniqueOpens} max={stats.sent} color="#10b981"/>
          <RateBar label="Clicked" value={stats.uniqueClicks} max={stats.sent} color="#3b82f6"/>
          <RateBar label="Bounced" value={stats.bounces} max={total} color="#ef4444"/>
          <RateBar label="Unsubscribed" value={stats.unsubscribes} max={stats.sent} color="#f59e0b"/>
        </div>

        {/* Performance vs benchmarks */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-brand-500"/>Your results vs industry avg</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[
              {metric:'Open rate',   yours:Number(openRate),   industry:21},
              {metric:'Click rate',  yours:Number(clickRate),  industry:2.5},
              {metric:'Bounce rate', yours:Number(bounceRate), industry:2},
            ]} margin={{top:0,right:0,left:-20,bottom:0}}>
              <XAxis dataKey="metric" tick={{fontSize:11,fill:'#9ca3af'}} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:'#9ca3af'}} tickLine={false} axisLine={false} unit="%"/>
              <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:'1px solid #e5e7eb'}} formatter={(v:any)=>[`${v}%`]}/>
              <Legend wrapperStyle={{fontSize:12}}/>
              <Bar dataKey="yours" name="Your campaign" fill="#6366f1" radius={[4,4,0,0]}/>
              <Bar dataKey="industry" name="Industry avg" fill="#e5e7eb" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Advanced stats */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Advanced metrics</h2>
          {[
            {label:'Click-to-open rate', value:`${clickToOpenRate}%`, desc:'Of openers who clicked'},
            {label:'Delivery rate',      value:`${deliveryRate}%`,   desc:'Emails that reached inbox'},
            {label:'Open rate',          value:`${openRate}%`,       desc:'Of delivered emails'},
            {label:'Click rate',         value:`${clickRate}%`,      desc:'Of delivered emails'},
            {label:'Bounce rate',        value:`${bounceRate}%`,     desc:'Hard + soft bounces'},
            {label:'Complaint rate',     value:'0%',                  desc:'Spam complaints'},
          ].map(m=>(
            <div key={m.label} className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0">
              <div><div className="text-sm text-gray-700">{m.label}</div><div className="text-xs text-gray-400">{m.desc}</div></div>
              <div className="text-sm font-semibold text-gray-900 ml-4">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Delivery breakdown pie */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Delivery breakdown</h2>
          {deliveryPieData.length>0?(
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={deliveryPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {deliveryPieData.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}
                </Pie>
                <Tooltip contentStyle={{fontSize:12,borderRadius:8}} formatter={(v:any)=>[v.toLocaleString(),'emails']}/>
                <Legend wrapperStyle={{fontSize:11}}/>
              </PieChart>
            </ResponsiveContainer>
          ):<div className="h-48 flex items-center justify-center text-sm text-gray-400">No data yet</div>}
        </div>

        {/* Recommendations */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Recommendations</h2>
          <div className="space-y-3">
            {Number(deliveryRate)<95&&(
              <div className="flex gap-2.5 p-3 bg-red-50 rounded-lg">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/>
                <div><div className="text-xs font-semibold text-red-700">Low delivery rate</div><div className="text-xs text-red-600 mt-0.5">Verify your email list and check bounce handling in Settings.</div></div>
              </div>
            )}
            {Number(openRate)<15&&(
              <div className="flex gap-2.5 p-3 bg-amber-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"/>
                <div><div className="text-xs font-semibold text-amber-700">Low open rate</div><div className="text-xs text-amber-600 mt-0.5">Test different subject lines. Add {`{{first_name}}`} for personalisation.</div></div>
              </div>
            )}
            {Number(clickRate)<2&&(
              <div className="flex gap-2.5 p-3 bg-amber-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"/>
                <div><div className="text-xs font-semibold text-amber-700">Low click rate</div><div className="text-xs text-amber-600 mt-0.5">Make your CTA button more prominent. One clear action per email.</div></div>
              </div>
            )}
            {Number(openRate)>=25&&Number(clickRate)>=3&&Number(deliveryRate)>=95&&(
              <div className="flex gap-2.5 p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5"/>
                <div><div className="text-xs font-semibold text-green-700">Excellent performance!</div><div className="text-xs text-green-600 mt-0.5">This campaign performed above average on all key metrics.</div></div>
              </div>
            )}
            <div className="flex gap-2.5 p-3 bg-blue-50 rounded-lg">
              <Clock className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/>
              <div><div className="text-xs font-semibold text-blue-700">Best time to send</div><div className="text-xs text-blue-600 mt-0.5">Based on your audience: Tuesday–Thursday, 9am–11am tends to get highest open rates.</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Opens by hour chart */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Opens by hour of day</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={hourlyData} margin={{top:0,right:0,left:-20,bottom:0}}>
            <XAxis dataKey="hour" tick={{fontSize:10,fill:'#9ca3af'}} tickLine={false} interval={2}/>
            <YAxis tick={{fontSize:11,fill:'#9ca3af'}} tickLine={false} axisLine={false}/>
            <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:'1px solid #e5e7eb'}}/>
            <Bar dataKey="opens" fill="#6366f1" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top clicked links */}
      {report.topLinks.length>0&&(
        <div className="card p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top clicked links</h2>
          <table className="w-full">
            <thead className="bg-gray-50/60"><tr><th className="th">URL</th><th className="th">Clicks</th><th className="th">% of recipients</th></tr></thead>
            <tbody>
              {report.topLinks.map((l,i)=>(
                <tr key={i} className="table-row">
                  <td className="td text-xs font-mono text-brand-600 truncate max-w-sm">{l.url}</td>
                  <td className="td font-semibold">{l.clicks}</td>
                  <td className="td text-gray-500">{stats.sent>0?((l.clicks/stats.sent)*100).toFixed(1):0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}