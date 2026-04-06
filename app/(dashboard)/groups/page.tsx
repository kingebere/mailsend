'use client'
// app/(dashboard)/groups/page.tsx
import { useEffect, useState } from 'react'
import { Tag, Plus, Trash2, RefreshCw, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Group {
  id: string
  name: string
  description: string | null
  createdAt: string
  _count: { members: number }
}

interface ErrorResponse {
  error?: string
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  async function load() {
    setLoading(true)

    try {
      const res = await fetch('/api/groups')
      const data: Group[] = res.ok ? await res.json() : []
      setGroups(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load groups:', error)
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        setShowAdd(false)
        setForm({ name: '', description: '' })
        load()
      } else {
        const d: ErrorResponse = await res.json()
        alert(d.error || 'Failed to create group')
      }
    } catch (error) {
      console.error('Failed to create group:', error)
      alert('Failed to create group')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete group "${name}"? Contacts won't be deleted.`)) return

    try {
      const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' })

      if (!res.ok) {
        const d: ErrorResponse = await res.json()
        alert(d.error || 'Failed to delete group')
        return
      }

      load()
    } catch (error) {
      console.error('Failed to delete group:', error)
      alert('Failed to delete group')
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups & Tags</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Segment your audience for targeted campaigns
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> New group
        </button>
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
        <strong>What are groups?</strong> Groups let you send campaigns to a
        specific subset of your contacts. For example: "Newsletter subscribers",
        "VIP customers", "Trial users". When importing contacts via CSV, you
        can choose which group to add them to.
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="py-12 text-center">
            <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600">No groups yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Create groups to segment your audience
            </p>
            <button onClick={() => setShowAdd(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Create group
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="th">Group name</th>
                <th className="th">Description</th>
                <th className="th">Contacts</th>
                <th className="th">Created</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="table-row">
                  <td className="td font-medium text-gray-900">{g.name}</td>
                  <td className="td text-gray-500">{g.description || '—'}</td>
                  <td className="td">
                    <span className="font-semibold text-gray-900">
                      {g._count.members.toLocaleString()}
                    </span>
                  </td>
                  <td className="td text-xs text-gray-400">
                    {formatDate(g.createdAt)}
                  </td>
                  <td className="td">
                    <button
                      onClick={() => handleDelete(g.id, g.name)}
                      className="btn btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Create group</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="btn btn-ghost p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="label">Group name *</label>
                <input
                  className="input"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Newsletter subscribers"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">
                  Description <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  className="input"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Who is in this group?"
                />
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
                  Create group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}