'use client'
// app/(dashboard)/templates/page.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, FileText, Trash2, X, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Template {
  id: string
  name: string
  subject: string
  htmlBody: string
  updatedAt: string
}

type TemplatesResponse = Template[]

const DEFAULTS = [
  {
    name: 'Newsletter',
    subject: 'Your {{month}} update',
    htmlBody: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1f2937">
<h1 style="font-size:22px;font-weight:700;margin-bottom:8px">Hi {{first_name}},</h1>
<p style="color:#6b7280;margin-bottom:24px">Here's your monthly update.</p>
<h2 style="font-size:16px;margin-bottom:8px">What's new</h2>
<p style="line-height:1.7">Add your content here...</p>
<hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb"/>
<p style="font-size:12px;color:#9ca3af">You received this because you subscribed. <a href="{{unsubscribe_link}}">Unsubscribe</a></p>
</div>`,
  },
  {
    name: 'Promotional',
    subject: '🎉 Special offer just for you',
    htmlBody: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1f2937;text-align:center">
<h1 style="font-size:28px;font-weight:800;margin-bottom:8px">Big Sale! 🎉</h1>
<p style="font-size:18px;color:#6b7280;margin-bottom:32px">Use code <strong>SAVE20</strong> at checkout</p>
<a href="#" style="background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;margin-bottom:32px">Shop Now →</a>
<hr style="border:none;border-top:1px solid #e5e7eb;margin-bottom:16px"/>
<p style="font-size:12px;color:#9ca3af"><a href="{{unsubscribe_link}}">Unsubscribe</a></p>
</div>`,
  },
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', subject: '', htmlBody: '' })
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<Template | null>(null)

  async function load() {
    setLoading(true)

    try {
      const res = await fetch('/api/templates')
      const data: TemplatesResponse = res.ok ? await res.json() : []
      setTemplates(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate(preset?: typeof DEFAULTS[0]) {
    setForm(
      preset
        ? { name: preset.name, subject: preset.subject, htmlBody: preset.htmlBody }
        : { name: '', subject: '', htmlBody: '' }
    )
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setShowModal(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return
    await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Reusable email templates for your campaigns</p>
        </div>
        <div className="flex gap-2">
          <Link href="/builder" className="btn btn-secondary">
            Open builder
          </Link>
          <button onClick={() => openCreate()} className="btn btn-primary">
            <Plus className="w-4 h-4" /> New template
          </button>
        </div>
      </div>

      {templates.length === 0 && !loading && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Start with a template</h2>
          <div className="grid grid-cols-2 gap-4">
            {DEFAULTS.map((d) => (
              <button
                key={d.name}
                onClick={() => openCreate(d)}
                className="card p-5 text-left hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <FileText className="w-6 h-6 text-brand-500 mb-3" />
                <div className="font-semibold text-gray-900 mb-1">{d.name}</div>
                <div className="text-xs text-gray-400">{d.subject}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No templates yet — create one above</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="th">Name</th>
                <th className="th">Subject</th>
                <th className="th">Updated</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="table-row">
                  <td className="td font-medium">{t.name}</td>
                  <td className="td text-gray-500 max-w-xs truncate">{t.subject}</td>
                  <td className="td text-xs text-gray-400">{formatDate(t.updatedAt)}</td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button onClick={() => setPreview(t)} className="btn btn-ghost py-1 px-2 text-xs">
                        Preview
                      </button>
                      <Link href={`/builder?template=${t.id}`} className="btn btn-ghost py-1 px-2 text-xs">
                        Edit in builder
                      </Link>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="btn btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">New template</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label">Template name</label>
                <input
                  className="input"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Newsletter"
                />
              </div>
              <div>
                <label className="label">Default subject</label>
                <input
                  className="input"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Subject line (can include merge tags)"
                />
              </div>
              <div>
                <label className="label">HTML body</label>
                <textarea
                  className="input font-mono text-xs resize-none"
                  rows={14}
                  value={form.htmlBody}
                  onChange={(e) => setForm((f) => ({ ...f, htmlBody: e.target.value }))}
                  placeholder="<p>Hi {{first_name}},</p>..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">{preview.name}</h2>
              <button onClick={() => setPreview(null)} className="btn btn-ghost p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-gray-400 mb-3">Subject: {preview.subject}</div>
            <div
              className="border border-gray-200 rounded-lg overflow-hidden bg-white"
              dangerouslySetInnerHTML={{ __html: preview.htmlBody }}
            />
          </div>
        </div>
      )}
    </div>
  )
}