"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { TicketsTable } from "./components/TicketsTable"
import { checkUserPermissions } from "@/app/(dashboard)/dashboard/lib/authManagement"

export default function SupportTicketsPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    try {
      setLoading(true)
      const permissions = await checkUserPermissions()
      
      if (!permissions) {
        toast.error("Usuário não autenticado")
        router.push("/auth/signin")
        return
      }

      setIsSuperAdmin(permissions.isSuperAdmin)
    } catch (error) {
      console.error("Erro ao verificar permissões:", error)
      toast.error("Erro ao verificar permissões")
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  return <TicketsTable isSuperAdmin={isSuperAdmin} />
}
