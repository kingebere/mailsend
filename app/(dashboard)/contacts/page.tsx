'use client'
// app/(dashboard)/contacts/page.tsx
import { useEffect, useState, useRef } from 'react'
import {
  Users, Upload, Plus, Search, RefreshCw,
  CheckCircle2, Loader2, X, Trash2, AlertTriangle
} from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'

interface Contact {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  status: string
  createdAt: string
  tags: Array<{ tag: { id: string; name: string } }>
}

interface ContactsResponse {
  contacts?: Contact[]
  total?: number
  pages?: number
  error?: string
}

interface ImportResult {
  imported: number
  skipped: number
  errors: number
}

interface ErrorResponse {
  error?: string
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    subscribed: 'badge-green',
    unsubscribed: 'badge-gray',
    bounced: 'badge-red',
    complained: 'badge-yellow',
  }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

function Avatar({ name, email }: { name: string; email: string }) {
  const initials = name.trim() ? getInitials(name) : email[0].toUpperCase()
  const colors = [
    'bg-brand-100 text-brand-700',
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-amber-100 text-amber-700',
    'bg-pink-100 text-pink-700',
  ]
  const color = colors[email.charCodeAt(0) % colors.length]

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${color}`}>
      {initials}
    </div>
  )
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newContact, setNewContact] = useState({
    email: '',
    firstName: '',
    lastName: '',
  })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteAll, setDeleteAll] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load(p = page) {
    setLoading(true)

    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: '50',
        ...(search && { search }),
        ...(status && { status }),
      })

      const res = await fetch(`/api/contacts?${params}`)
      const data: ContactsResponse = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to load contacts')
        setContacts([])
        setTotal(0)
        setPages(1)
        setSelected(new Set())
        return
      }

      setContacts(data.contacts || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
      setSelected(new Set())
    } catch (error) {
      console.error('Failed to load contacts:', error)
      setContacts([])
      setTotal(0)
      setPages(1)
      setSelected(new Set())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      load(1)
    }, 300)

    return () => clearTimeout(t)
  }, [search, status])

  useEffect(() => {
    load()
  }, [page])

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        body: fd,
      })

      const data: ImportResult & ErrorResponse = await res.json()

      if (!res.ok) {
        alert(data.error || 'Import failed')
        return
      }

      setImportResult({
        imported: data.imported ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? 0,
      })

      load(1)
    } catch (error) {
      console.error('Failed to import contacts:', error)
      alert('Import failed')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault()

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      })

      if (res.ok) {
        setShowAdd(false)
        setNewContact({ email: '', firstName: '', lastName: '' })
        load(1)
      } else {
        const d: ErrorResponse = await res.json()
        alert(d.error || 'Failed to add contact')
      }
    } catch (error) {
      console.error('Failed to add contact:', error)
      alert('Failed to add contact')
    }
  }

  const allPageSelected =
    contacts.length > 0 && contacts.every((c) => selected.has(c.id))
  const someSelected = selected.size > 0

  function toggleAll() {
    if (allPageSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(contacts.map((c) => c.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDeleteSelected() {
    setDeleting(true)
    setShowDeleteConfirm(false)

    try {
      let idsToDelete: string[]

      if (deleteAll) {
        const params = new URLSearchParams({
          page: '1',
          limit: '99999',
          ...(search && { search }),
          ...(status && { status }),
        })

        const res = await fetch(`/api/contacts?${params}`)
        const data: ContactsResponse = await res.json()
        idsToDelete = (data.contacts || []).map((c) => c.id)
      } else {
        idsToDelete = Array.from(selected)
      }

      const batchSize = 20
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize)
        await Promise.all(
          batch.map((id) =>
            fetch(`/api/contacts/${id}`, { method: 'DELETE' })
          )
        )
      }

      setSelected(new Set())
      setDeleteAll(false)
      load(1)
    } catch (error) {
      console.error('Failed to delete contacts:', error)
      alert('Failed to delete contacts')
    } finally {
      setDeleting(false)
    }
  }

  function confirmDeleteSelected() {
    setDeleteAll(false)
    setShowDeleteConfirm(true)
  }

  function confirmDeleteAll() {
    setDeleteAll(true)
    setShowDeleteConfirm(true)
  }

  const deleteCount = deleteAll ? total : selected.size

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} total contacts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="btn btn-secondary"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Import CSV
          </button>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Add contact
          </button>
        </div>
      </div>

      {importResult && (
        <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-green-800">
            <strong>Import complete:</strong> {importResult.imported} imported,{' '}
            {importResult.skipped} skipped, {importResult.errors} errors.
          </div>
          <button
            onClick={() => setImportResult(null)}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="mb-5 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <div className="text-xs font-semibold text-blue-700 mb-1">
          CSV format guide
        </div>
        <div className="text-xs text-blue-600">
          Required column:{' '}
          <code className="bg-blue-100 px-1 rounded">email</code>.
          Optional:{' '}
          <code className="bg-blue-100 px-1 rounded">first_name</code>{' '}
          <code className="bg-blue-100 px-1 rounded">last_name</code>{' '}
          <code className="bg-blue-100 px-1 rounded">tags</code>{' '}
          (comma-separated inside quotes).
          Example row:{' '}
          <code className="bg-blue-100 px-1 rounded">
            jane@example.com,Jane,Smith,"vip,newsletter"
          </code>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input w-44"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="subscribed">Subscribed</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Bounced</option>
          <option value="complained">Complained</option>
        </select>

        <button onClick={() => load(page)} className="btn btn-secondary">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {someSelected && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl">
          <span className="text-sm font-medium text-brand-800">
            {selected.size} contact{selected.size !== 1 ? 's' : ''} selected
          </span>
          {total > contacts.length && (
            <button
              onClick={() => confirmDeleteAll()}
              className="text-xs text-brand-600 underline underline-offset-2 hover:text-brand-800"
            >
              Select all {total.toLocaleString()} contacts instead
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setSelected(new Set())}
              className="btn btn-ghost text-xs py-1.5 px-3 text-brand-700"
            >
              Deselect
            </button>
            <button
              onClick={confirmDeleteSelected}
              disabled={deleting}
              className="btn btn-danger text-xs py-1.5 px-3"
            >
              {deleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Delete {selected.size} selected
            </button>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">No contacts found</p>
            <p className="text-xs text-gray-400 mt-1">
              Try adjusting your filters or import a CSV
            </p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50/60">
                <tr>
                  <th className="th w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-brand-600 cursor-pointer"
                      title="Select all on this page"
                    />
                  </th>
                  <th className="th">Contact</th>
                  <th className="th">Email</th>
                  <th className="th">Tags</th>
                  <th className="th">Status</th>
                  <th className="th">Added</th>
                  <th className="th w-10"></th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => {
                  const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
                  const isSelected = selected.has(c.id)

                  return (
                    <tr
                      key={c.id}
                      className={`table-row ${isSelected ? 'bg-brand-50/40' : ''}`}
                    >
                      <td className="td">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(c.id)}
                          className="w-4 h-4 accent-brand-600 cursor-pointer"
                        />
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={name} email={c.email} />
                          <span className="font-medium text-gray-900">
                            {name || (
                              <span className="text-gray-400 font-normal">—</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="td text-gray-500">{c.email}</td>
                      <td className="td">
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <span key={t.tag.id} className="badge badge-gray">
                              {t.tag.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="td">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="td text-xs text-gray-400">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="td">
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete ${c.email}?`)) return
                            await fetch(`/api/contacts/${c.id}`, {
                              method: 'DELETE',
                            })
                            load(page)
                          }}
                          className="btn btn-ghost py-1 px-2 text-red-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400">
                  Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} of{' '}
                  {total.toLocaleString()}
                </span>
                <button
                  onClick={confirmDeleteAll}
                  className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete all {total.toLocaleString()} contacts
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Delete {deleteCount.toLocaleString()} contact{deleteCount !== 1 ? 's' : ''}?
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  This will permanently remove{' '}
                  {deleteAll
                    ? `all ${total.toLocaleString()} contacts`
                    : `${deleteCount} selected contact${deleteCount !== 1 ? 's' : ''}`}{' '}
                  from your list. This cannot be undone.
                </p>
                {deleteAll && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    ⚠️ This will wipe your entire contact list.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteAll(false)
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="btn btn-danger flex-1"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deleting
                  ? 'Deleting...'
                  : `Yes, delete ${deleteCount.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Add contact</h2>
              <button onClick={() => setShowAdd(false)} className="btn btn-ghost p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="label">Email address *</label>
                <input
                  className="input"
                  type="email"
                  required
                  value={newContact.email}
                  onChange={(e) =>
                    setNewContact((n) => ({ ...n, email: e.target.value }))
                  }
                  placeholder="jane@example.com"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">First name</label>
                  <input
                    className="input"
                    value={newContact.firstName}
                    onChange={(e) =>
                      setNewContact((n) => ({ ...n, firstName: e.target.value }))
                    }
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="label">Last name</label>
                  <input
                    className="input"
                    value={newContact.lastName}
                    onChange={(e) =>
                      setNewContact((n) => ({ ...n, lastName: e.target.value }))
                    }
                    placeholder="Smith"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Add contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}