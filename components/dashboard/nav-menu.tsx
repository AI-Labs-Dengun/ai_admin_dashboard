"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  href: string
  description?: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navigationGroups: NavGroup[] = [
  {
    title: "Administração",
    items: [
      {
        title: "Tenants",
        href: "/dashboard/tenants",
        description: "Gerencie os tenants do sistema",
      },
      {
        title: "Usuários Admin",
        href: "/dashboard/admin-users",
        description: "Gerencie os usuários administradores",
      },
      {
        title: "Clientes",
        href: "/dashboard/clients",
        description: "Gerencie os perfis dos clientes",
      },
    ],
  },
  {
    title: "Bots",
    items: [
      {
        title: "Bots",
        href: "/dashboard/bots",
        description: "Gerencie os bots do sistema",
      },
    ],
  },
]

export function NavMenu() {
  const pathname = usePathname()

  return (
    <NavigationMenu>
      <NavigationMenuList>
        {navigationGroups.map((group) => (
          <NavigationMenuItem key={group.title}>
            <NavigationMenuTrigger>{group.title}</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                {group.items.map((item) => (
                  <li key={item.title}>
                    <NavigationMenuLink asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                          pathname === item.href && "bg-accent"
                        )}
                      >
                        <div className="text-sm font-medium leading-none">{item.title}</div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          {item.description}
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
} 