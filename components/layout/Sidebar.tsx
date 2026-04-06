'use client'
// components/layout/Sidebar.tsx
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Send, Users, BarChart2,
  Settings, LogOut, Mail, Tag, FileText,
  Code2, ChevronDown, Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { section: 'Overview' },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { section: 'Email' },
  { href: '/campaigns', label: 'Campaigns', icon: Send },
  { href: '/campaigns/new', label: 'New Campaign', icon: Mail },
  { href: '/builder', label: 'Email Builder', icon: Layers },
  { href: '/templates', label: 'Templates', icon: FileText },
  { section: 'Audience' },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/groups', label: 'Groups & Tags', icon: Tag },
  { section: 'Developer' },
  { href: '/api-keys', label: 'API Keys', icon: Code2 },
  { section: 'Settings' },
  { href: '/settings', label: 'Settings & SES', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-[224px] bg-white border-r border-gray-200 flex flex-col z-20">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">MailSend</div>
            <div className="text-xs text-gray-400">AWS SES Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {nav.map((item, i) => {
          if ('section' in item) {
            return <div key={i} className="section-title mt-3 first:mt-0">{item.section}</div>
          }
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('sidebar-link', active && 'active')}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-gray-100 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs text-gray-500 truncate">SES connected</span>
        </div>
        <button onClick={handleLogout} className="sidebar-link w-full text-red-500 hover:text-red-700 hover:bg-red-50">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}