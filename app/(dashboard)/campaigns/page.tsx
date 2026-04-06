'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

interface Contact {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  subscribed?: boolean
  createdAt?: string
}

interface ContactsResponse {
  contacts?: Contact[]
  total?: number
  pages?: number
  error?: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  async function load() {
    setLoading(true)

    try {
      const params = new URLSearchParams({
        page: String(page),
        q: search,
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
    load()
  }, [page, search])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Contacts</h1>

      <div className="mb-4 flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => {
            setPage(1)
            setSearch(e.target.value)
          }}
          placeholder="Search contacts..."
          className="input"
        />
      </div>

      {contacts.length === 0 ? (
        <div className="text-sm text-gray-500">No contacts found.</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr>
              <th className="th"></th>
              <th className="th">Email</th>
              <th className="th">Name</th>
              <th className="th">Status</th>
            </tr>
          </thead>

          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="table-row">
                <td className="td">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                  />
                </td>

                <td className="td">{c.email}</td>

                <td className="td">
                  {(c.firstName || '') + ' ' + (c.lastName || '')}
                </td>

                <td className="td">
                  {c.subscribed ? (
                    <span className="text-green-600">Subscribed</span>
                  ) : (
                    <span className="text-gray-400">Unsubscribed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div className="mt-6 flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="btn btn-secondary"
        >
          Prev
        </button>

        <span className="text-sm text-gray-500">
          Page {page} of {pages}
        </span>

        <button
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
          className="btn btn-secondary"
        >
          Next
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        {total} total contacts
      </div>
    </div>
  )
}