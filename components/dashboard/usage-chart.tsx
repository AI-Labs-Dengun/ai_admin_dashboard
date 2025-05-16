"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

interface UsageChartProps {
  data: {
    date: string
    tokens: number
  }[]
  title: string
  description?: string
}

export function UsageChart({ data, title, description }: UsageChartProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px]">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-sky-500" />
              <span className="text-sm">Token Usage</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-xs text-muted-foreground" />
              <YAxis tickLine={false} axisLine={false} className="text-xs text-muted-foreground" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-muted-foreground">Date</span>
                            <span className="font-bold text-xs">{label}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-muted-foreground">Tokens</span>
                            <span className="font-bold text-xs">{payload[0].value}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area type="monotone" dataKey="tokens" name="Tokens" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
