'use client'
// app/(dashboard)/campaigns/new/page.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send, Save, Eye, AlertCircle,
  Loader2, Info, CheckCircle2
} from 'lucide-react'
import { estimateCost } from '@/lib/utils'

interface Group {
  id: string
  name: string
  _count: { members: number }
}

interface Template {
  id: string
  name: string
  subject: string
  htmlBody: string
}

interface MeResponse {
  user?: {
    fromEmail?: string
    fromName?: string
  }
}

interface ContactsResponse {
  total?: number
}

interface CreateCampaignResponse {
  id?: string
  error?: string
}

interface SendCampaignResponse {
  message?: string
  error?: string
}

const MERGE_TAGS = [
  '{{first_name}}',
  '{{last_name}}',
  '{{email}}',
  '{{unsubscribe_link}}',
]

const STARTER_HTML = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1f2937;">
  <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 16px;">Hi {{first_name}},</h1>
  <p style="font-size: 16px; line-height: 1.7; color: #374151; margin-bottom: 16px;">
    Your message here. Write naturally — this is going to real people's inboxes.
  </p>
  <p style="font-size: 16px; line-height: 1.7; color: #374151; margin-bottom: 32px;">
    [Add your content here]
  </p>
  <a href="#" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
    Your Call to Action
  </a>
  <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
  <p style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
    You're receiving this email because you subscribed.<br/>
    <a href="{{unsubscribe_link}}" style="color: #9ca3af;">Unsubscribe</a>
  </p>
</div>`

export default function NewCampaignPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [form, setForm] = useState({
    name: '',
    subject: '',
    previewText: '',
    fromEmail: '',
    fromName: '',
    replyTo: '',
    groupId: '',
    htmlBody: STARTER_HTML,
    scheduledAt: '',
    sendNow: true,
  })

  useEffect(() => {
    async function load() {
      try {
        const [groupsRes, templatesRes, meRes, contactsRes] = await Promise.all([
          fetch('/api/groups'),
          fetch('/api/templates'),
          fetch('/api/auth/me'),
          fetch('/api/contacts?limit=1'),
        ])

        const groupsData: Group[] = groupsRes.ok ? await groupsRes.json() : []
        const templatesData: Template[] = templatesRes.ok ? await templatesRes.json() : []
        const meData: MeResponse = meRes.ok ? await meRes.json() : {}
        const contactsData: ContactsResponse = contactsRes.ok ? await contactsRes.json() : {}

        setGroups(Array.isArray(groupsData) ? groupsData : [])
        setTemplates(Array.isArray(templatesData) ? templatesData : [])
        setTotalContacts(contactsData.total || 0)

        if (meData.user) {
          setForm((f) => ({
            ...f,
            fromEmail: meData.user?.fromEmail || '',
            fromName: meData.user?.fromName || '',
          }))
        }
      } catch (error) {
        console.error('Failed to load campaign setup data:', error)
      }
    }

    load()
  }, [])

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function loadTemplate(t: Template) {
    setForm((f) => ({ ...f, subject: t.subject, htmlBody: t.htmlBody }))
  }

  function insertMergeTag(tag: string) {
    setForm((f) => ({ ...f, htmlBody: f.htmlBody + tag }))
  }

  const recipientCount = form.groupId
    ? groups.find((g) => g.id === form.groupId)?._count.members || 0
    : totalContacts

  async function handleSave(send = false) {
    if (!form.name || !form.subject || !form.fromEmail || !form.htmlBody) {
      alert('Please fill in: campaign name, subject, from email, and email body.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          subject: form.subject,
          previewText: form.previewText,
          fromEmail: form.fromEmail,
          fromName: form.fromName,
          replyTo: form.replyTo,
          groupId: form.groupId || null,
          htmlBody: form.htmlBody,
          scheduledAt: !form.sendNow && form.scheduledAt ? form.scheduledAt : null,
        }),
      })

      const data: CreateCampaignResponse = await res.json()

      if (!res.ok || !data.id) {
        alert(data.error || 'Failed to save campaign')
        return
      }

      if (send || form.sendNow) {
        const sendRes = await fetch(`/api/campaigns/${data.id}/send`, {
          method: 'POST',
        })

        const sendData: SendCampaignResponse = await sendRes.json()

        if (!sendRes.ok) {
          alert(sendData.error || 'Failed to send campaign')
          return
        }

        alert(`✅ ${sendData.message || 'Campaign sent successfully'}`)
        router.push('/campaigns')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        router.push('/campaigns')
      }
    } catch (error) {
      console.error('Failed to save campaign:', error)
      alert('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Campaign</h1>
          <p className="text-sm text-gray-500 mt-0.5">Compose and send your email campaign</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={loading}
            className="btn btn-secondary"
          >
            {saved ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {form.sendNow ? 'Send now' : 'Schedule'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 space-y-5">
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Campaign details</h2>
            <div>
              <label className="label">
                Campaign name <span className="text-gray-400">(internal)</span>
              </label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. June Newsletter"
              />
            </div>
            <div>
              <label className="label">Subject line</label>
              <input
                className="input"
                value={form.subject}
                onChange={(e) => set('subject', e.target.value)}
                placeholder="Your subject line here 👋"
              />
            </div>
            <div>
              <label className="label">
                Preview text{' '}
                <span className="text-gray-400">(shown after subject in inbox)</span>
              </label>
              <input
                className="input"
                value={form.previewText}
                onChange={(e) => set('previewText', e.target.value)}
                placeholder="Brief preview text..."
              />
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Sender</h2>
            <div>
              <label className="label">From name</label>
              <input
                className="input"
                value={form.fromName}
                onChange={(e) => set('fromName', e.target.value)}
                placeholder="Your Brand"
              />
            </div>
            <div>
              <label className="label">
                From email <span className="text-gray-400">(must be SES-verified)</span>
              </label>
              <input
                className="input"
                type="email"
                value={form.fromEmail}
                onChange={(e) => set('fromEmail', e.target.value)}
                placeholder="hello@yourdomain.com"
              />
            </div>
            <div>
              <label className="label">
                Reply-to <span className="text-gray-400">(optional)</span>
              </label>
              <input
                className="input"
                type="email"
                value={form.replyTo}
                onChange={(e) => set('replyTo', e.target.value)}
                placeholder="replies@yourdomain.com"
              />
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Audience</h2>
            <div>
              <label className="label">Send to</label>
              <select
                className="input"
                value={form.groupId}
                onChange={(e) => set('groupId', e.target.value)}
              >
                <option value="">All contacts</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g._count.members})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 p-3 bg-brand-50 rounded-lg">
              <Info className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <div className="text-xs text-brand-700">
                <span className="font-semibold">
                  {recipientCount.toLocaleString()} recipients
                </span>
                {' · '}Estimated cost:{' '}
                <span className="font-semibold">{estimateCost(recipientCount)}</span>
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">When to send</h2>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={form.sendNow}
                  onChange={() => set('sendNow', true)}
                  className="accent-brand-600"
                />
                <span className="text-sm text-gray-700">Send immediately</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!form.sendNow}
                  onChange={() => set('sendNow', false)}
                  className="accent-brand-600"
                />
                <span className="text-sm text-gray-700">Schedule for later</span>
              </label>
            </div>
            {!form.sendNow && (
              <div>
                <label className="label">Date &amp; time</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => set('scheduledAt', e.target.value)}
                />
              </div>
            )}
          </div>

          {templates.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Load a template</h2>
              <div className="space-y-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => loadTemplate(t)}
                    className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-800">{t.name}</div>
                    <div className="text-xs text-gray-400 truncate">{t.subject}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="col-span-3 space-y-4">
          <div className="card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Email body</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`btn text-xs py-1.5 px-3 ${showPreview ? 'btn-primary' : 'btn-secondary'}`}
                >
                  <Eye className="w-3.5 h-3.5" /> {showPreview ? 'Edit' : 'Preview'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 flex-wrap">
              <span className="text-xs text-gray-400">Insert:</span>
              {MERGE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => insertMergeTag(tag)}
                  className="text-xs font-mono bg-white border border-gray-200 px-2 py-0.5 rounded hover:border-brand-300 hover:text-brand-700 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            {showPreview ? (
              <div className="p-4">
                <div className="text-xs text-gray-400 mb-2">
                  Preview (merge tags shown as-is):
                </div>
                <div
                  className="border border-gray-200 rounded-lg overflow-auto bg-white"
                  style={{ minHeight: 400 }}
                  dangerouslySetInnerHTML={{ __html: form.htmlBody }}
                />
              </div>
            ) : (
              <textarea
                className="w-full p-4 text-sm font-mono text-gray-700 bg-white resize-none focus:outline-none"
                style={{ minHeight: 480 }}
                value={form.htmlBody}
                onChange={(e) => set('htmlBody', e.target.value)}
                placeholder="Your HTML email body..."
                spellCheck={false}
              />
            )}
          </div>

          <div className="flex items-start gap-2.5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
            <div>
              <strong>Important:</strong> Every email must contain{' '}
              <code className="bg-amber-100 px-1 rounded text-xs">
                {'{{unsubscribe_link}}'}
              </code>
              . It&apos;s already in the default template. Removing it violates
              CAN-SPAM law and will hurt your deliverability.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}