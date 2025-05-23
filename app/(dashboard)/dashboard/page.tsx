'use client';

import { Coins, MessageSquare, AlertTriangle, Clock } from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { UsageChart } from "@/components/dashboard/usage-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"

// Sample data for the dashboard
const usageData = [
  { date: "Jan", tokens: 4000 },
  { date: "Feb", tokens: 3000 },
  { date: "Mar", tokens: 5000 },
  { date: "Apr", tokens: 7000 },
  { date: "May", tokens: 6000 },
  { date: "Jun", tokens: 8000 },
  { date: "Jul", tokens: 10000 },
]

const topAgents = [
  {
    id: 1,
    name: "Property Assistant",
    usage: "45,230 tokens",
    chats: 124,
    avatar: "PA",
  },
  {
    id: 2,
    name: "Listing Helper",
    usage: "32,450 tokens",
    chats: 98,
    avatar: "LH",
  },
  {
    id: 3,
    name: "Market Analyzer",
    usage: "28,120 tokens",
    chats: 76,
    avatar: "MA",
  },
]

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulando carregamento de dados
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-[200px]" />
          <Skeleton className="h-5 w-[300px] mt-2" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-[120px]" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-7 w-[100px] mt-2" />
                <Skeleton className="h-4 w-[80px] mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="col-span-3 md:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[300px] mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>

          <Card className="col-span-3 md:col-span-1">
            <CardHeader>
              <Skeleton className="h-6 w-[180px]" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-3 w-[80px] mt-1" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-[60px]" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your AI agent performance and usage</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Token Usage" value="1,234,567" icon={Coins} trend={{ value: 12, isPositive: true }} />
        <StatCard title="Chats Handled" value="8,432" icon={MessageSquare} trend={{ value: 8, isPositive: true }} />
        <StatCard title="Errors Reported" value="23" icon={AlertTriangle} trend={{ value: 5, isPositive: false }} />
        <StatCard title="Avg. Response Time" value="1.2s" icon={Clock} trend={{ value: 10, isPositive: true }} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <UsageChart
          data={usageData}
          title="Token Usage Over Time"
          description="Monthly token consumption across all agents"
        />

        <Card className="col-span-3 md:col-span-1">
          <CardHeader>
            <CardTitle>Top Performing Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topAgents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{agent.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.usage}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{agent.chats} chats</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
