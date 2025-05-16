"use client"

import type React from "react"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { TopNav } from "@/components/dashboard/top-nav"
import { AuthGuard } from '@/app/components/auth-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <DashboardSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        <div className="flex-1">
          <TopNav onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
