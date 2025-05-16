"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/dashboard/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Sample data
type ErrorLog = {
  id: string
  timestamp: string
  message: string
  agent: string
  user: string
  severity: "low" | "medium" | "high"
}

const data: ErrorLog[] = [
  {
    id: "err-001",
    timestamp: "2023-07-10T14:35:22",
    message: "Failed to retrieve property data from MLS API: Timeout after 30s",
    agent: "Property Assistant",
    user: "john.smith@acme.com",
    severity: "medium",
  },
  {
    id: "err-002",
    timestamp: "2023-07-09T11:20:15",
    message: "Image generation failed: Invalid prompt parameters",
    agent: "Listing Helper",
    user: "sarah.jones@acme.com",
    severity: "low",
  },
  {
    id: "err-003",
    timestamp: "2023-07-08T16:50:33",
    message: "Market data API returned 403 Forbidden: Invalid API key",
    agent: "Market Analyzer",
    user: "mike.brown@acme.com",
    severity: "high",
  },
  {
    id: "err-004",
    timestamp: "2023-07-07T09:45:12",
    message: "Chat completion timed out after 60s",
    agent: "Property Assistant",
    user: "emma.wilson@acme.com",
    severity: "medium",
  },
  {
    id: "err-005",
    timestamp: "2023-07-06T13:25:40",
    message: "Failed to save chat history to database: Connection error",
    agent: "Listing Helper",
    user: "david.clark@acme.com",
    severity: "high",
  },
  {
    id: "err-006",
    timestamp: "2023-07-05T10:10:05",
    message: "Invalid response format from third-party valuation service",
    agent: "Market Analyzer",
    user: "lisa.taylor@acme.com",
    severity: "low",
  },
  {
    id: "err-007",
    timestamp: "2023-07-04T15:30:18",
    message: "User authentication failed: Token expired",
    agent: "Property Assistant",
    user: "john.smith@acme.com",
    severity: "medium",
  },
]

export default function ErrorLogsPage() {
  const columns: ColumnDef<ErrorLog>[] = [
    {
      accessorKey: "timestamp",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            Timestamp
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const timestamp = new Date(row.getValue("timestamp"))
        return <div>{timestamp.toLocaleString()}</div>
      },
    },
    {
      accessorKey: "message",
      header: "Error Message",
      cell: ({ row }) => {
        const message = row.getValue("message") as string
        return <div className="max-w-md truncate font-mono text-xs">{message}</div>
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
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => {
        const severity = row.getValue("severity") as string

        return (
          <Badge variant={severity === "high" ? "destructive" : severity === "medium" ? "default" : "outline"}>
            {severity}
          </Badge>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Error Logs</h1>
        <p className="text-muted-foreground">Monitor and troubleshoot issues with AI agents</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            searchColumn="message"
            searchPlaceholder="Search error messages..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
