'use client'
// app/(dashboard)/settings/page.tsx
import { useEffect, useState } from 'react'
import {
  Loader2, CheckCircle2, XCircle, AlertCircle,
  Copy, Trash2, Plus, Eye, EyeOff, ExternalLink
} from 'lucide-react'

interface SESStatus { connected: boolean; quota?: { max24HourSend: number; sentLast24Hours: number; maxSendRate: number }; region?: string; error?: string }
interface ApiKey { id: string; name: string; keyPrefix: string; createdAt: string; lastUsed: string | null }

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 mb-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {desc && <p className="text-sm text-gray-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: '', fromEmail: '', fromName: '' })
  const [ses, setSes] = useState({ awsAccessKeyId: '', awsSecretAccessKey: '', awsRegion: 'us-east-1' })
  const [sesStatus, setSesStatus] = useState<SESStatus | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [saved, setSaved] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')

  useEffect(() => {
    setWebhookUrl(window.location.origin + '/api/ses-webhook')
    // Load user data
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) {
        setProfile({ name: d.user.name || '', fromEmail: d.user.fromEmail || '', fromName: d.user.fromName || '' })
        if (d.user.awsAccessKeyId) setSes(s => ({ ...s, awsAccessKeyId: d.user.awsAccessKeyId, awsRegion: d.user.awsRegion || 'us-east-1' }))
      }
    })
    fetch('/api/ses/validate').then(r => r.json()).then(setSesStatus)
    fetch('/api/api-keys').then(r => r.json()).then(d => setApiKeys(Array.isArray(d) ? d : []))
  }, [])

  async function saveProfile() {
    setSaving(true)
    await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    setSaved('profile')
    setTimeout(() => setSaved(''), 2000)
    setSaving(false)
  }

  async function validateSES() {
    setValidating(true)
    const res = await fetch('/api/ses/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ses),
    })
    const data = await res.json()
    if (res.ok) setSesStatus({ connected: true, quota: data.quota, region: ses.awsRegion })
    else setSesStatus({ connected: false, error: data.error })
    setValidating(false)
  }

  async function createApiKey() {
    if (!newKeyName) return
    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName }),
    })
    const data = await res.json()
    if (res.ok) {
      setNewKeyValue(data.key)
      setNewKeyName('')
      fetch('/api/api-keys').then(r => r.json()).then(d => setApiKeys(Array.isArray(d) ? d : []))
    }
  }

  async function deleteApiKey(id: string) {
    if (!confirm('Delete this API key? Apps using it will stop working.')) return
    await fetch('/api/api-keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setApiKeys(k => k.filter(k => k.id !== id))
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account, AWS SES connection, and API keys</p>
      </div>

      {/* Profile */}
      <Section title="Profile & Sender defaults" desc="Set your default sender name and email for campaigns">
        <div className="space-y-4">
          <div>
            <label className="label">Your name</label>
            <input className="input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Jane Smith" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Default from name</label>
              <input className="input" value={profile.fromName} onChange={e => setProfile(p => ({ ...p, fromName: e.target.value }))} placeholder="Your Brand" />
            </div>
            <div>
              <label className="label">Default from email</label>
              <input className="input" type="email" value={profile.fromEmail} onChange={e => setProfile(p => ({ ...p, fromEmail: e.target.value }))} placeholder="hello@yourdomain.com" />
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving} className="btn btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === 'profile' ? <CheckCircle2 className="w-4 h-4" /> : null}
            {saved === 'profile' ? 'Saved!' : 'Save profile'}
          </button>
        </div>
      </Section>

      {/* AWS SES */}
      <Section title="AWS SES Connection" desc="Connect your AWS account to send emails. Create an IAM user with ses:SendEmail permissions only.">
        {sesStatus && (
          <div className={`flex items-center gap-2.5 p-3 rounded-lg mb-5 text-sm ${sesStatus.connected ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {sesStatus.connected ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
            {sesStatus.connected
              ? `Connected — ${sesStatus.quota?.sentLast24Hours.toLocaleString()} / ${sesStatus.quota?.max24HourSend.toLocaleString()} emails sent today (${sesStatus.region})`
              : sesStatus.error || 'Not connected'}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="label">AWS Access Key ID</label>
            <input className="input font-mono text-sm" value={ses.awsAccessKeyId}
              onChange={e => setSes(s => ({ ...s, awsAccessKeyId: e.target.value }))} placeholder="AKIAIOSFODNN7EXAMPLE" />
          </div>
          <div>
            <label className="label">AWS Secret Access Key</label>
            <div className="relative">
              <input className="input font-mono text-sm pr-10" type={showSecret ? 'text' : 'password'}
                value={ses.awsSecretAccessKey} onChange={e => setSes(s => ({ ...s, awsSecretAccessKey: e.target.value }))}
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" />
              <button type="button" onClick={() => setShowSecret(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">AWS Region</label>
            <select className="input" value={ses.awsRegion} onChange={e => setSes(s => ({ ...s, awsRegion: e.target.value }))}>
              {['us-east-1','us-east-2','us-west-1','us-west-2','eu-west-1','eu-west-2','eu-central-1','ap-southeast-1','ap-southeast-2','ap-northeast-1'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <button onClick={validateSES} disabled={validating || !ses.awsAccessKeyId || !ses.awsSecretAccessKey} className="btn btn-primary">
            {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {validating ? 'Connecting...' : 'Test & save credentials'}
          </button>
        </div>

        <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
            <div>
              <strong>IAM minimum permissions:</strong> Create an IAM user with only these two permissions:
              <code className="bg-amber-100 px-1 rounded mx-1 text-xs">ses:SendEmail</code>
              <code className="bg-amber-100 px-1 rounded text-xs">ses:SendRawEmail</code>
              — never use root credentials.
            </div>
          </div>
        </div>
      </Section>

      {/* Bounce webhook */}
      <Section title="Bounce & Complaint Webhook" desc="Set this URL in your AWS SNS topic to automatically handle bounces and spam complaints.">
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Your SNS webhook URL</span>
            <button onClick={() => navigator.clipboard.writeText(webhookUrl)} className="btn btn-ghost text-xs py-1 px-2">
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
          <code className="text-sm text-gray-800 break-all">{webhookUrl}</code>
        </div>
        <div className="mt-3 text-sm text-gray-600 space-y-1">
          <p>Steps to enable in AWS:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-500">
            <li>Go to SNS in your AWS console</li>
            <li>Create a new topic, then create an HTTPS subscription with the URL above</li>
            <li>In SES, set your verified identity's notification settings to use this SNS topic for Bounces and Complaints</li>
          </ol>
        </div>
        <a href="https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity-using-notifications-sns.html"
          target="_blank" rel="noopener"
          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-3">
          AWS SES notification docs <ExternalLink className="w-3 h-3" />
        </a>
      </Section>

      {/* API Keys */}
      <Section title="API Keys" desc="Use API keys to send transactional emails from your app or integrate with Zapier.">
        {newKeyValue && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">API key created — copy it now, it won't be shown again</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border border-green-200 rounded px-3 py-2 font-mono text-green-900 break-all">
                {newKeyValue}
              </code>
              <button onClick={() => { navigator.clipboard.writeText(newKeyValue); setNewKeyValue('') }} className="btn btn-secondary text-xs">
                <Copy className="w-3.5 h-3.5" /> Copy & close
              </button>
            </div>
          </div>
        )}

        {/* Existing keys */}
        {apiKeys.length > 0 && (
          <table className="w-full mb-4">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="th">Name</th>
                <th className="th">Key</th>
                <th className="th">Last used</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map(k => (
                <tr key={k.id} className="table-row">
                  <td className="td font-medium">{k.name}</td>
                  <td className="td"><code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{k.keyPrefix}...</code></td>
                  <td className="td text-xs text-gray-400">{k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : 'Never'}</td>
                  <td className="td">
                    <button onClick={() => deleteApiKey(k.id)} className="btn btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Create new */}
        <div className="flex items-center gap-2">
          <input className="input flex-1" value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. Production, Zapier)" onKeyDown={e => e.key === 'Enter' && createApiKey()} />
          <button onClick={createApiKey} disabled={!newKeyName} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Generate key
          </button>
        </div>

        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-xs font-semibold text-gray-600 mb-2">Example: send a transactional email</div>
          <pre className="text-xs text-gray-500 overflow-auto whitespace-pre-wrap">{`fetch('${typeof window !== 'undefined' ? window.location.origin : ''}/api/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    to: 'customer@example.com',
    subject: 'Your order is confirmed!',
    html: '<p>Thanks {{first_name}}!</p>',
    data: { first_name: 'Jane' }
  })
})`}</pre>
        </div>
      </Section>
    </div>
  )
}
