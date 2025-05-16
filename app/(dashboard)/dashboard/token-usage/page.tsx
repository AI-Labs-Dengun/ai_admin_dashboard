"use client"

import { useState } from "react"
import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table"
import { ArrowUpDown, Calendar, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/dashboard/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"

// Sample data
type TokenUsage = {
  id: string
  date: string
  agent: string
  user: string
  tokens: number
  action: string
}

const data: TokenUsage[] = [
  {
    id: "1",
    date: "2023-07-01",
    agent: "Property Assistant",
    user: "john.smith@acme.com",
    tokens: 1250,
    action: "Chat",
  },
  {
    id: "2",
    date: "2023-07-02",
    agent: "Listing Helper",
    user: "sarah.jones@acme.com",
    tokens: 3450,
    action: "Summary",
  },
  {
    id: "3",
    date: "2023-07-03",
    agent: "Market Analyzer",
    user: "mike.brown@acme.com",
    tokens: 2100,
    action: "Chat",
  },
  {
    id: "4",
    date: "2023-07-04",
    agent: "Property Assistant",
    user: "john.smith@acme.com",
    tokens: 1800,
    action: "Image Generation",
  },
  {
    id: "5",
    date: "2023-07-05",
    agent: "Listing Helper",
    user: "sarah.jones@acme.com",
    tokens: 950,
    action: "Chat",
  },
  {
    id: "6",
    date: "2023-07-06",
    agent: "Market Analyzer",
    user: "mike.brown@acme.com",
    tokens: 4200,
    action: "Summary",
  },
  {
    id: "7",
    date: "2023-07-07",
    agent: "Property Assistant",
    user: "emma.wilson@acme.com",
    tokens: 1650,
    action: "Chat",
  },
  {
    id: "8",
    date: "2023-07-08",
    agent: "Listing Helper",
    user: "david.clark@acme.com",
    tokens: 2800,
    action: "Image Generation",
  },
  {
    id: "9",
    date: "2023-07-09",
    agent: "Market Analyzer",
    user: "lisa.taylor@acme.com",
    tokens: 1950,
    action: "Chat",
  },
  {
    id: "10",
    date: "2023-07-10",
    agent: "Property Assistant",
    user: "john.smith@acme.com",
    tokens: 3100,
    action: "Summary",
  },
]

export default function TokenUsagePage() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [date, setDate] = useState<Date | undefined>(undefined)

  const columns: ColumnDef<TokenUsage>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => {
        return (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              Date
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue("date") as string
        return <div>{new Date(date).toLocaleDateString()}</div>
      },
    },
    {
      accessorKey: "agent",
      header: "Agent",
      cell: ({ row }) => <div>{row.getValue("agent")}</div>,
    },
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => <div>{row.getValue("user")}</div>,
    },
    {
      accessorKey: "tokens",
      header: ({ column }) => {
        return (
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              Tokens
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const tokens = Number.parseFloat(row.getValue("tokens"))
        return <div className="text-right font-medium">{tokens.toLocaleString()}</div>
      },
    },
    {
      accessorKey: "action",
      header: "Action Type",
      cell: ({ row }) => {
        const action = row.getValue("action") as string
        return (
          <Badge variant="outline" className="capitalize">
            {action}
          </Badge>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Token Usage</h1>
        <p className="text-muted-foreground">Monitor and analyze token consumption across agents and users</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Token Usage History</CardTitle>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Calendar className="h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Filter className="h-4 w-4" />
                  View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {columns.map((column) => {
                  // Skip the id column
                  if (column.accessorKey === "id") return null

                  return (
                    <DropdownMenuCheckboxItem
                      key={column.accessorKey as string}
                      checked={columnVisibility[column.accessorKey as string] !== false}
                      onCheckedChange={(checked) =>
                        setColumnVisibility({
                          ...columnVisibility,
                          [column.accessorKey as string]: checked,
                        })
                      }
                    >
                      {column.header as string}
                    </DropdownMenuCheckboxItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} searchColumn="agent" searchPlaceholder="Search agents..." />
        </CardContent>
      </Card>
    </div>
  )
}
