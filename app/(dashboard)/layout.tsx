// app/(dashboard)/layout.tsx
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[224px] min-h-screen bg-gray-50">
        {children}
      </main>
    </div>
  )
}
