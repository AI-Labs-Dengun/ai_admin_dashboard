"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { TopNav } from "@/components/dashboard/top-nav"
import { AuthGuard } from '@/app/components/auth-guard'
import { useSupabase } from '@/app/providers/supabase-provider'
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { supabase } = useSupabase()

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('Verificando sessão no layout...');
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Erro ao verificar sessão no layout:', error);
          router.replace('/auth/signin')
          return
        }

        if (!session) {
          console.log('Nenhuma sessão encontrada no layout');
          router.replace('/auth/signin')
          return
        }

        console.log('Sessão válida encontrada no layout');
      } catch (error) {
        console.error('Erro ao verificar sessão no layout:', error)
        router.replace('/auth/signin')
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [router, supabase])

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <div className="flex-1">
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <Skeleton className="h-9 w-[200px]" />
                <Skeleton className="h-5 w-[300px] mt-2" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-[120px]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
