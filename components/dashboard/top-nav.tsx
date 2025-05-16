"use client"

import { useState } from "react"
import { ModeToggle } from "@/components/mode-toggle"
import { ProfileMenu } from "@/app/components/profile-menu"
import { NavMenu } from "@/components/dashboard/nav-menu"

interface TopNavProps {
  onMenuClick: () => void
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const [notifications, setNotifications] = useState(3)

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <NavMenu />
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
          <ProfileMenu />
        </div>
      </div>
    </div>
  )
}
