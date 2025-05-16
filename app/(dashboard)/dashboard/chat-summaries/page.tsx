"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/dashboard/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Sample data
type ChatSummary = {
  id: string
  date: string
  agent: string
  user: string
  summary: string
  fullChat: string
}

const data: ChatSummary[] = [
  {
    id: "chat-001",
    date: "2023-07-10T14:30:00",
    agent: "Property Assistant",
    user: "john.smith@acme.com",
    summary: "Discussion about property valuation methods for a 3-bedroom house in downtown area.",
    fullChat:
      "User: How do I determine the value of a 3-bedroom house in downtown?\n\nAI: There are several methods to determine property value. For a 3-bedroom house in downtown, I recommend looking at comparable sales in the area from the last 6 months. You should also consider factors like square footage, lot size, condition, and special features. Would you like me to explain each valuation method in detail?\n\nUser: Yes, please explain the comparative market analysis approach.\n\nAI: The Comparative Market Analysis (CMA) approach involves finding similar properties that have recently sold in your area. Here's how to do it:\n\n1. Identify 3-5 similar properties that sold in the last 3-6 months\n2. Adjust for differences (add value for features your property has that comps don't, subtract for features comps have that yours doesn't)\n3. Calculate the average adjusted price\n\nThis gives you a market-based valuation that's often quite accurate for residential properties in active markets. Would you like me to explain other approaches as well?",
  },
  {
    id: "chat-002",
    date: "2023-07-09T10:15:00",
    agent: "Listing Helper",
    user: "sarah.jones@acme.com",
    summary:
      "Created optimized listing description for a luxury condo with emphasis on waterfront views and amenities.",
    fullChat:
      "User: I need help writing a listing description for a luxury condo.\n\nAI: I'd be happy to help! Could you provide some details about the property such as location, size, special features, and price range?\n\nUser: It's a 2-bedroom waterfront condo, 1,800 sq ft, with floor-to-ceiling windows, private balcony, and access to building amenities like pool, gym, and concierge. Price is $1.2M.\n\nAI: Here's a listing description for your luxury condo:\n\n\"STUNNING WATERFRONT LUXURY CONDO | $1,200,000\n\nExperience breathtaking waterfront living in this exquisite 1,800 sq ft, 2-bedroom luxury condominium. Floor-to-ceiling windows frame spectacular water views from every angle, while the spacious private balcony offers an ideal setting for outdoor entertaining.\n\nThis meticulously designed residence features premium finishes throughout, including marble countertops, custom cabinetry, and engineered hardwood flooring. The gourmet kitchen boasts professional-grade appliances and an elegant waterfall island.\n\nResidents enjoy access to world-class amenities including a resort-style pool, state-of-the-art fitness center, and 24-hour concierge service. Located minutes from fine dining, shopping, and cultural attractions.\n\nThis is more than a home—it's a lifestyle upgrade you deserve.\"\n\nWould you like me to make any adjustments to this description?",
  },
  {
    id: "chat-003",
    date: "2023-07-08T16:45:00",
    agent: "Market Analyzer",
    user: "mike.brown@acme.com",
    summary:
      "Analysis of market trends in the suburban residential sector, showing 7% growth YoY and prediction of continued strength.",
    fullChat:
      "User: Can you analyze the current market trends for suburban residential properties?\n\nAI: I'd be happy to analyze suburban residential market trends for you. To provide the most relevant analysis, could you specify which geographic region you're interested in?\n\nUser: The Northeast region, particularly around Boston.\n\nAI: Here's my analysis of the suburban residential market around Boston:\n\nCurrent Market Conditions:\n- Median home prices have increased 7% year-over-year\n- Average days on market: 12 (down from 18 last year)\n- Inventory levels are at 1.8 months (6 months is considered balanced)\n- Bidding wars occurring on approximately 40% of listings\n\nKey Drivers:\n- Continued remote/hybrid work policies allowing more flexibility in home location\n- Migration from urban Boston to suburbs seeking more space\n- Limited new construction due to supply chain issues and zoning restrictions\n- Historically low interest rates (though rising gradually)\n\nHottest Suburbs:\n- Newton, Lexington, and Wellesley showing strongest price appreciation (9-11% YoY)\n- Natick and Framingham offering slightly better value with good school districts\n\nPredictions for Next 12 Months:\n- Continued price growth but at a more moderate pace (4-6%)\n- Gradual increase in inventory as more sellers enter the market\n- Rising interest rates may cool demand slightly but not significantly\n\nWould you like me to elaborate on any specific aspect of this analysis?",
  },
  {
    id: "chat-004",
    date: "2023-07-07T09:30:00",
    agent: "Property Assistant",
    user: "emma.wilson@acme.com",
    summary:
      "Helped client understand mortgage pre-approval process and documentation requirements for first-time homebuyers.",
    fullChat:
      "User: What documents do I need for mortgage pre-approval? I'm a first-time homebuyer.\n\nAI: As a first-time homebuyer seeking mortgage pre-approval, you'll need to provide several documents. Here's a comprehensive list:\n\nPersonal Identification:\n- Government-issued ID (driver's license or passport)\n- Social Security number\n\nIncome Verification:\n- Pay stubs from the last 30 days\n- W-2 forms from the last 2 years\n- Federal tax returns from the last 2 years\n- If self-employed: business tax returns, profit & loss statements\n\nAsset Documentation:\n- Bank statements from the last 2-3 months (checking/savings)\n- Investment account statements (401(k), IRA, stocks, bonds)\n- Documentation of any gift funds you'll use for down payment\n\nDebt Information:\n- List of current debts (student loans, car loans, credit cards)\n- Rent payment history or mortgage statements if you own property\n\nAdditional Documents (situation-dependent):\n- Divorce decree (if applicable)\n- Bankruptcy discharge papers (if applicable)\n- Documentation of any alimony or child support\n\nThe pre-approval process typically takes 1-3 days once you've submitted all documents. Would you like me to explain the steps of the pre-approval process as well?",
  },
  {
    id: "chat-005",
    date: "2023-07-06T13:20:00",
    agent: "Listing Helper",
    user: "david.clark@acme.com",
    summary:
      "Generated professional property photos shot list and staging recommendations for a mid-century modern home.",
    fullChat:
      "User: I need a shot list for professional photos of a mid-century modern home I'm listing.\n\nAI: I'd be happy to create a comprehensive shot list for your mid-century modern home. To tailor it perfectly, could you share a few details about the property? Number of bedrooms/bathrooms, any special features, and the approximate square footage would be helpful.\n\nUser: It's a 3-bed, 2-bath, 2,100 sq ft with original wood paneling, floor-to-ceiling windows in the living room, a sunken conversation pit, and a renovated kitchen that maintains the mid-century aesthetic. There's also a backyard with a small pool.\n\nAI: Here's a detailed shot list for your mid-century modern home photography session:\n\nExterior Shots:\n1. Front elevation - straight-on view capturing the architectural lines (morning or late afternoon for best light)\n2. Front angle view - showing depth and dimension of the facade\n3. Backyard overview - highlighting the pool area\n4. Pool detail shot - close-up of water feature or interesting angle\n5. Any outdoor living spaces or patios\n6. Architectural details unique to mid-century design (roof lines, decorative elements)\n\nInterior Shots:\n7. Living room - wide angle showcasing floor-to-ceiling windows (time this for best natural light)\n8. Living room - focused on the sunken conversation pit\n9. Kitchen - wide angle showing the full renovated space\n10. Kitchen - detail shots of mid-century elements and modern appliances\n11. Primary bedroom - from doorway and from alternate angle\n12. Primary bathroom\n13. Additional bedrooms (1-2 shots each)\n14. Guest bathroom\n15. Any hallways with original wood paneling\n16. Dining area\n\nDetail/Feature Shots:\n17. Original wood paneling close-up showing grain and condition\n18. Architectural details (built-ins, fireplace if present)\n19. Window wall with view (shoot when light is optimal)\n20. Period-appropriate fixtures or hardware\n21. Transition between indoor/outdoor spaces\n\nStaging Recommendations:\n- Use authentic mid-century modern furniture or convincing reproductions\n- Keep decor minimal and uncluttered (true to mid-century aesthetic)\n- Add strategic pops of period-appropriate colors (oranges, teals, mustards)\n- Place a few iconic mid-century design pieces as focal points\n- Ensure window treatments are open to maximize natural light\n- For the conversation pit, arrange seating to show functionality\n\nWould you like me to provide any additional guidance for the photographer?",
  },
]

export default function ChatSummariesPage() {
  const [selectedChat, setSelectedChat] = useState<ChatSummary | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const columns: ColumnDef<ChatSummary>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            Date/Time
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("date"))
        return <div>{date.toLocaleString()}</div>
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
      accessorKey: "summary",
      header: "Summary",
      cell: ({ row }) => {
        const summary = row.getValue("summary") as string
        return <div className="max-w-md truncate">{summary}</div>
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const chat = row.original

        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedChat(chat)
              setIsDialogOpen(true)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chat Summaries</h1>
        <p className="text-muted-foreground">Review recent conversations between users and AI agents</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Chats</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            searchColumn="summary"
            searchPlaceholder="Search chat summaries..."
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chat Details</DialogTitle>
            {selectedChat && (
              <DialogDescription>
                {selectedChat.agent} - {new Date(selectedChat.date).toLocaleString()}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedChat && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Summary</h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedChat.summary}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Full Conversation</h3>
                <div className="bg-muted p-4 rounded-md mt-1 whitespace-pre-wrap text-sm">{selectedChat.fullChat}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
