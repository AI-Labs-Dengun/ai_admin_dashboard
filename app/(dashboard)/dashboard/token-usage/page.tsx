"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Calendar, Filter, RefreshCw } from "lucide-react"
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
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// Interface para o uso de tokens
interface TokenUsage {
  id: string
  user_id: string
  tenant_id: string
  bot_id: string
  total_tokens: number
  last_used: string
  created_at: string
  updated_at: string
  // Dados relacionados (joins)
  user_profile?: {
    email: string
    full_name: string
  }
  bot?: {
    name: string
  }
  tenant?: {
    name: string
  }
  action_type: string
  tokens_used: number
  request_timestamp: string
  response_timestamp: string
}

export default function TokenUsagePage() {
  const [data, setData] = useState<TokenUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('❌ Erro de sessão:', sessionError)
        router.push('/auth/signin')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', session.user.id)
        .single()

      if (profileError) {
        console.error('❌ Erro ao verificar perfil:', profileError)
        toast.error('Erro ao verificar permissões')
        return
      }

      if (!profile?.is_super_admin) {
        toast.error('Acesso negado: Apenas super admins podem acessar esta página')
        router.push('/dashboard')
        return
      }

      setIsSuperAdmin(true)
      fetchTokenUsage()
    } catch (error) {
      console.error('❌ Erro ao verificar permissões:', error)
      toast.error('Erro ao verificar permissões')
      router.push('/auth/signin')
    }
  }

  const fetchTokenUsage = async () => {
    try {
      setLoading(true)
      console.log('🔍 Buscando dados de uso de tokens...')

      const { data: tokenUsageData, error } = await supabase
        .from('token_usage')
        .select(`
          *,
          user_profile:user_id (
            email,
            full_name
          ),
          bot:bot_id (
            name
          ),
          tenant:tenant_id (
            name
          )
        `)
        .order('updated_at', { ascending: false })
        .limit(1000)

      if (error) {
        console.error('❌ Erro ao buscar token usage:', error)
        throw error
      }

      console.log('✅ Dados carregados:', tokenUsageData?.length, 'registros')
      setData(tokenUsageData || [])
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados de uso de tokens')
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnDef<TokenUsage>[] = [
    {
      accessorKey: "user_profile.email",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Usuário
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const email = row.original.user_profile?.email || 'Email não encontrado'
        const fullName = row.original.user_profile?.full_name
        return (
          <div>
            <div className="font-medium">{fullName || 'Nome não definido'}</div>
            <div className="text-sm text-muted-foreground">{email}</div>
          </div>
        )
      },
    },
    {
      accessorKey: "tenant.name",
      header: "Tenant",
      cell: ({ row }) => {
        return row.original.tenant?.name || 'Tenant não encontrado'
      },
    },
    {
      accessorKey: "bot.name",
      header: "Bot",
      cell: ({ row }) => {
        return row.original.bot?.name || 'Bot não encontrado'
      },
    },
    {
      accessorKey: "action_type",
      header: "Tipo de Ação",
      cell: ({ row }) => {
        const actionType = row.getValue("action_type") as string
        const actionTypeMap: Record<string, string> = {
          chat: 'Chat',
          summary: 'Resumo',
          image_generation: 'Geração de Imagem',
          test: 'Teste',
          other: 'Outro'
        }
        return actionTypeMap[actionType] || actionType
      },
    },
    {
      accessorKey: "tokens_used",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Tokens Usados
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const tokens = row.getValue("tokens_used") as number
        return (
          <Badge variant="outline" className="font-mono">
            {tokens.toLocaleString('pt-BR')}
          </Badge>
        )
      },
    },
    {
      accessorKey: "total_tokens",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Total Acumulado
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const tokens = row.getValue("total_tokens") as number
        return (
          <Badge variant="outline" className="font-mono">
            {tokens.toLocaleString('pt-BR')}
          </Badge>
        )
      },
    },
    {
      accessorKey: "request_timestamp",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Requisição
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue("request_timestamp") as string
        return format(new Date(date), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
      },
    },
    {
      accessorKey: "response_timestamp",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Resposta
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue("response_timestamp") as string
        return format(new Date(date), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
      },
    },
    {
      accessorKey: "last_used",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Último Uso
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue("last_used") as string
        return format(new Date(date), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
      },
    },
  ]

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h1>
          <p className="text-muted-foreground">Apenas super admins podem acessar esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Uso de Tokens</h1>
          <p className="text-muted-foreground">Monitore e analise o consumo de tokens em tempo real</p>
        </div>
        <Button onClick={fetchTokenUsage} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Usados Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data
                .filter(item => {
                  const today = new Date();
                  const itemDate = new Date(item.request_timestamp);
                  return itemDate.toDateString() === today.toDateString();
                })
                .reduce((sum, item) => sum + item.tokens_used, 0)
                .toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.reduce((sum, item) => sum + item.total_tokens, 0).toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Ação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                data.reduce((sum, item) => sum + item.tokens_used, 0) / 
                (data.length || 1)
              ).toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Uso de Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <DataTable columns={columns} data={data} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
