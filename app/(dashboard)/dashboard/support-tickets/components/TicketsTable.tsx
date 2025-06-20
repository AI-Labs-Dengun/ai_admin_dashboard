import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/dashboard/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MessageSquare, Plus } from "lucide-react"
import { CreateTicketModal } from "./CreateTicketModal"
import { TicketDetailsModal } from "./TicketDetailsModal"
import { toast } from "react-hot-toast"

interface SupportTicket {
  id: string
  title: string
  description: string
  status: "pendente" | "em_analise" | "concluido"
  user_id: string
  created_at: string
  updated_at: string
  assigned_to: string | null
  profiles: {
    full_name: string
    email: string
  }
}

interface TicketsTableProps {
  isSuperAdmin: boolean
}

export function TicketsTable({ isSuperAdmin }: TicketsTableProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const supabase = createClientComponentClient()

  // Função para testar se as tabelas existem
  const testTableAccess = async () => {
    try {
      console.log("Testando acesso às tabelas...")
      
      // Teste 1: Verificar se a tabela support_tickets existe
      const { data: tableTest, error: tableError } = await supabase
        .from("support_tickets")
        .select("id")
        .limit(1)
      
      console.log("Teste tabela support_tickets:", { data: tableTest, error: tableError })
      
      // Teste 2: Verificar se a tabela profiles existe
      const { data: profileTest, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .limit(1)
      
      console.log("Teste tabela profiles:", { data: profileTest, error: profileError })

      // Teste 3: Verificar se o usuário atual tem perfil
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userProfile, error: userProfileError } = await supabase
          .from("profiles")
          .select("id, is_super_admin")
          .eq("id", user.id)
          .single()
        
        console.log("Perfil do usuário atual:", { data: userProfile, error: userProfileError })
      }
      
    } catch (error) {
      console.error("Erro no teste de acesso:", error)
    }
  }

  useEffect(() => {
    testTableAccess()
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Usuário não autenticado")
        return
      }

      console.log("Buscando tickets para usuário:", user.id, "isSuperAdmin:", isSuperAdmin)

      // Primeiro, testar uma consulta simples sem join
      let query = supabase
        .from("support_tickets")
        .select("id, title, description, status, user_id, created_at, updated_at, assigned_to")
        .order("created_at", { ascending: false })

      // Se não for super admin, mostrar apenas os próprios tickets
      if (!isSuperAdmin) {
        query = query.eq("user_id", user.id)
      }

      const { data, error } = await query

      if (error) {
        console.error("Erro detalhado ao carregar tickets:", {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      console.log("Tickets carregados com sucesso:", data?.length || 0)

      // Se temos dados, agora buscar os profiles separadamente
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(ticket => ticket.user_id))]
        console.log("Buscando profiles para usuários:", userIds)

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds)

        if (profilesError) {
          console.error("Erro ao buscar profiles:", profilesError)
        } else {
          console.log("Profiles carregados:", profiles?.length || 0)
          
          // Combinar os dados
          const ticketsWithProfiles = data.map(ticket => ({
            ...ticket,
            profiles: profiles?.find(p => p.id === ticket.user_id) || {
              full_name: "Usuário não encontrado",
              email: "N/A"
            }
          }))
          
          setTickets(ticketsWithProfiles)
          return
        }
      }

      // Fallback: usar dados sem profiles
      setTickets(data?.map(ticket => ({
        ...ticket,
        profiles: {
          full_name: "Carregando...",
          email: "N/A"
        }
      })) || [])
    } catch (error) {
      console.error("Erro ao carregar tickets:", error)
      toast.error(`Erro ao carregar tickets: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pendente":
        return "default"
      case "em_analise":
        return "secondary"
      case "concluido":
        return "outline"
      default:
        return "default"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pendente":
        return "Pendente"
      case "em_analise":
        return "Em Análise"
      case "concluido":
        return "Concluído"
      default:
        return status
    }
  }

  const columns: ColumnDef<SupportTicket>[] = [
    {
      accessorKey: "title",
      header: "Título",
      cell: ({ row }) => {
        const title = row.getValue("title") as string
        return <div className="font-medium max-w-xs truncate">{title}</div>
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            Criado em
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"))
        return <div>{date.toLocaleString("pt-BR")}</div>
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={getStatusBadgeVariant(status)}>
            {getStatusLabel(status)}
          </Badge>
        )
      },
    },
    ...(isSuperAdmin ? [{
      accessorKey: "profiles.full_name",
      header: "Criado por",
      cell: ({ row }) => {
        const profile = row.original.profiles
        return <div>{profile.full_name}</div>
      },
    }] : []),
    {
      id: "actions",
      cell: ({ row }) => {
        const ticket = row.original

        return (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={() => {
              setSelectedTicket(ticket)
              setIsDetailsModalOpen(true)
            }}
          >
            <MessageSquare className="h-4 w-4" />
            Ver / Responder
          </Button>
        )
      },
    },
  ]

  const filteredTickets = {
    all: tickets,
    pendente: tickets.filter((ticket) => ticket.status === "pendente"),
    em_analise: tickets.filter((ticket) => ticket.status === "em_analise"),
    concluido: tickets.filter((ticket) => ticket.status === "concluido"),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando tickets...</p>
        </div>
      </div>
    )
  }

  // Se não há tickets, mostrar mensagem informativa
  if (tickets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tickets de Suporte</h1>
            <p className="text-muted-foreground">
              {isSuperAdmin 
                ? "Gerencie e responda aos tickets de suporte dos clientes" 
                : "Acompanhe seus tickets de suporte e receba respostas da nossa equipe"
              }
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Ticket
          </Button>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {isSuperAdmin ? "Nenhum ticket encontrado" : "Você ainda não tem tickets"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isSuperAdmin 
                  ? "Quando os clientes criarem tickets de suporte, eles aparecerão aqui."
                  : "Crie seu primeiro ticket de suporte para reportar problemas com seus bots."
                }
              </p>
              {!isSuperAdmin && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Ticket
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modais */}
        <CreateTicketModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={fetchTickets}
        />

        <TicketDetailsModal
          ticket={selectedTicket}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false)
            setSelectedTicket(null)
          }}
          onSuccess={fetchTickets}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets de Suporte</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin 
              ? "Gerencie e responda aos tickets de suporte dos clientes" 
              : "Acompanhe seus tickets de suporte e receba respostas da nossa equipe"
            }
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Ticket
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos ({tickets.length})</TabsTrigger>
          <TabsTrigger value="pendente">Pendentes ({filteredTickets.pendente.length})</TabsTrigger>
          <TabsTrigger value="em_analise">Em Análise ({filteredTickets.em_analise.length})</TabsTrigger>
          <TabsTrigger value="concluido">Concluídos ({filteredTickets.concluido.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={columns} 
                data={filteredTickets.all} 
                searchColumn="title" 
                searchPlaceholder="Buscar tickets..." 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendente">
          <Card>
            <CardHeader>
              <CardTitle>Tickets Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={columns} 
                data={filteredTickets.pendente} 
                searchColumn="title" 
                searchPlaceholder="Buscar tickets pendentes..." 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="em_analise">
          <Card>
            <CardHeader>
              <CardTitle>Tickets em Análise</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={columns} 
                data={filteredTickets.em_analise} 
                searchColumn="title" 
                searchPlaceholder="Buscar tickets em análise..." 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="concluido">
          <Card>
            <CardHeader>
              <CardTitle>Tickets Concluídos</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={columns} 
                data={filteredTickets.concluido} 
                searchColumn="title" 
                searchPlaceholder="Buscar tickets concluídos..." 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchTickets}
      />

      <TicketDetailsModal
        ticket={selectedTicket}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false)
          setSelectedTicket(null)
        }}
        onSuccess={fetchTickets}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  )
} 