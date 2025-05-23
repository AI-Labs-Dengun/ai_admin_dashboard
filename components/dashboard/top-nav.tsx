"use client"

import { useState, useEffect } from "react"
import { ModeToggle } from "@/components/mode-toggle"
import { ProfileMenu } from "@/app/components/profile-menu"
import { NavMenu } from "@/components/dashboard/nav-menu"
import { NotificationCenter } from "@/app/components/notifications/NotificationCenter"
import { useSupabase } from "@/app/providers/supabase-provider"

interface TopNavProps {
  onMenuClick: () => void
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const { supabase } = useSupabase()

  useEffect(() => {
    checkSuperAdmin()
  }, [])

  const checkSuperAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("id", session.user.id)
      .single()

    setIsSuperAdmin(profile?.is_super_admin || false)
  }

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        {isSuperAdmin && <NavMenu />}
        <div className="ml-auto flex items-center space-x-4">
          <NotificationCenter />
          <ModeToggle />
          <ProfileMenu />
        </div>
      </div>
    </div>
  )
}
