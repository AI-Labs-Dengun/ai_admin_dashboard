"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Sample data
const chatsByDayData = [
  { day: "Mon", chats: 45 },
  { day: "Tue", chats: 52 },
  { day: "Wed", chats: 49 },
  { day: "Thu", chats: 63 },
  { day: "Fri", chats: 59 },
  { day: "Sat", chats: 38 },
  { day: "Sun", chats: 30 },
]

const responseTimeData = [
  { day: "Mon", time: 1.2 },
  { day: "Tue", time: 1.1 },
  { day: "Wed", time: 1.3 },
  { day: "Thu", time: 1.0 },
  { day: "Fri", time: 1.4 },
  { day: "Sat", time: 1.2 },
  { day: "Sun", time: 1.1 },
]

const topicsData = [
  { name: "Property Valuation", value: 35 },
  { name: "Mortgage Questions", value: 25 },
  { name: "Listing Help", value: 20 },
  { name: "Market Trends", value: 15 },
  { name: "Other", value: 5 },
]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

// Custom tooltip component for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">{payload[0].name}</span>
            <span className="font-bold text-xs">{payload[0].value}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Visualize AI agent performance and usage patterns</p>
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Chats Per Day</CardTitle>
                <CardDescription>Number of conversations handled by AI agents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <div className="flex justify-center mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-sky-500" />
                      <span className="text-sm">Chats</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chatsByDayData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 10,
                        bottom: 20,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        className="text-xs text-muted-foreground"
                      />
                      <YAxis tickLine={false} axisLine={false} className="text-xs text-muted-foreground" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="chats" name="Chats" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Response Time</CardTitle>
                <CardDescription>Time taken for AI to respond (in seconds)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <div className="flex justify-center mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-emerald-500" />
                      <span className="text-sm">Response Time</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={responseTimeData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 10,
                        bottom: 20,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        className="text-xs text-muted-foreground"
                      />
                      <YAxis tickLine={false} axisLine={false} className="text-xs text-muted-foreground" />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="time"
                        name="Seconds"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Most Used Topics</CardTitle>
              <CardDescription>Distribution of conversation topics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topicsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {topicsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Analytics</CardTitle>
              <CardDescription>Select daily view to see analytics data</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">Weekly analytics data would be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Analytics</CardTitle>
              <CardDescription>Select daily view to see analytics data</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">Monthly analytics data would be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
