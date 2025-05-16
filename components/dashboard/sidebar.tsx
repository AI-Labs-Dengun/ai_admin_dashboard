"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  MessageSquare,
  AlertTriangle,
  LayoutDashboard,
  Ticket,
  Coins,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function DashboardSidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()

  const routes = [
    {
      name: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Token Usage",
      href: "/dashboard/token-usage",
      icon: Coins,
    },
    {
      name: "Chat Summaries",
      href: "/dashboard/chat-summaries",
      icon: MessageSquare,
    },
    {
      name: "Error Logs",
      href: "/dashboard/error-logs",
      icon: AlertTriangle,
    },
    {
      name: "Analytics",
      href: "/dashboard/analytics",
      icon: BarChart3,
    },
    {
      name: "Support Tickets",
      href: "/dashboard/support-tickets",
      icon: Ticket,
    },
  ]

  return (
    <aside
      className={cn(
        "bg-card border-r border-border h-full relative transition-all duration-300 ease-in-out flex flex-col",
        isOpen ? "w-64" : "w-16",
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-border shrink-0">
        <div
          className={cn(
            "flex items-center gap-2 overflow-hidden",
            isOpen ? "justify-between w-full" : "justify-center",
          )}
        >
          {isOpen && (
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">AI Admin</span>
            </div>
          )}
          {!isOpen && <Building2 className="h-6 w-6 text-primary" />}
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
            {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="py-4 flex-1 overflow-y-auto">
        <div
          className={cn(
            "px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
            !isOpen && "sr-only",
          )}
        >
          Navigation
        </div>
        <nav className="space-y-1 px-2">
          {routes.map((route) => {
            const isActive = pathname === route.href

            return (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex items-center px-2 py-2.5 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  !isOpen && "justify-center px-0",
                )}
              >
                <route.icon className={cn("h-5 w-5", isOpen && "mr-3")} />
                {isOpen && <span className="truncate">{route.name}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      <div
        className={cn(
          "border-t border-border p-4 shrink-0",
          !isOpen && "flex justify-center py-4 px-0",
        )}
      >
        <div className={cn("flex items-center mt-2 gap-2 text-sm text-muted-foreground", !isOpen && "sr-only")}>
          <Building2 className="h-4 w-4" />
          <span>Acme Real Estate</span>
        </div>
      </div>
    </aside>
  )
}
