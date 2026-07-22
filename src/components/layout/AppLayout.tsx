'use client'

import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAppStore } from '@/lib/store'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAppStore()

  if (!currentUser) return <>{children}</>

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
