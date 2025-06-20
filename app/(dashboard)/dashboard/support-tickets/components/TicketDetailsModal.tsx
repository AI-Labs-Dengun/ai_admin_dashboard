import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "react-hot-toast"
import { Loader2, MessageSquare } from "lucide-react"

interface TicketMessage {
  id: string
  ticket_id: string
  user_id: string
  message: string
  created_at: string
  profiles: {
    full_name: string
    email: string
    is_super_admin: boolean
  }
}

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

interface TicketDetailsModalProps {
  ticket: SupportTicket | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => Promise<void>
  isSuperAdmin: boolean
}

export function TicketDetailsModal({ ticket, isOpen, onClose, onSuccess, isSuperAdmin }: TicketDetailsModalProps) {
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [replyText, setReplyText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [newStatus, setNewStatus] = useState<string>("")

  const supabase = createClientComponentClient()

  useEffect(() => {
    if (ticket && isOpen) {
      fetchMessages()
      setNewStatus(ticket.status)
    }
  }, [ticket, isOpen])

  const fetchMessages = async () => {
    if (!ticket) return

    try {
      setIsLoading(true)
      
      // Primeiro, buscar as mensagens sem join
      const { data: messagesData, error: messagesError } = await supabase
        .from("support_ticket_messages")
        .select("id, ticket_id, user_id, message, created_at")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true })

      if (messagesError) {
        console.error("Erro ao carregar mensagens:", messagesError)
        throw messagesError
      }

      // Se temos mensagens, buscar os profiles separadamente
      if (messagesData && messagesData.length > 0) {
        const userIds = [...new Set(messagesData.map(msg => msg.user_id))]
        console.log("Buscando profiles para mensagens - usuários:", userIds)

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email, is_super_admin")
          .in("id", userIds)

        if (profilesError) {
          console.error("Erro ao buscar profiles das mensagens:", profilesError)
        } else {
          console.log("Profiles das mensagens carregados:", profiles?.length || 0)
          console.log("Profiles encontrados:", profiles?.map(p => ({ id: p.id, name: p.full_name, is_admin: p.is_super_admin })))
          
          // Combinar os dados
          const messagesWithProfiles = messagesData.map(message => {
            const profile = profiles?.find(p => p.id === message.user_id)
            if (!profile) {
              console.warn("Profile não encontrado para usuário:", message.user_id)
            }
            return {
              ...message,
              profiles: profile || {
                full_name: isSuperAdmin ? "Cliente" : "Suporte",
                email: "N/A",
                is_super_admin: !isSuperAdmin // Se não é super admin, assume que é admin
              }
            }
          })
          
          setMessages(messagesWithProfiles)
          return
        }
      }

      // Fallback: usar dados sem profiles
      setMessages(messagesData?.map(message => ({
        ...message,
        profiles: {
          full_name: "Carregando...",
          email: "N/A",
          is_super_admin: false
        }
      })) || [])
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error)
      toast.error("Erro ao carregar mensagens")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendReply = async () => {
    if (!ticket || !replyText.trim()) return

    try {
      setIsSending(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Usuário não autenticado")
        return
      }

      console.log("Enviando resposta - usuário:", user.id, "isSuperAdmin:", isSuperAdmin, "novo status:", newStatus)

      // Adicionar mensagem
      const { error: messageError } = await supabase
        .from("support_ticket_messages")
        .insert([
          {
            ticket_id: ticket.id,
            user_id: user.id,
            message: replyText.trim(),
            created_at: new Date().toISOString()
          }
        ])

      if (messageError) {
        console.error("Erro ao criar mensagem:", messageError)
        throw messageError
      }

      console.log("Mensagem criada com sucesso")

      // Atualizar status se for super admin e o status mudou
      if (isSuperAdmin && newStatus !== ticket.status) {
        console.log("Atualizando status do ticket de", ticket.status, "para", newStatus)
        
        const { error: statusError } = await supabase
          .from("support_tickets")
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq("id", ticket.id)

        if (statusError) {
          console.error("Erro ao atualizar status:", statusError)
          throw statusError
        }

        console.log("Status atualizado com sucesso")
      }

      toast.success("Resposta enviada com sucesso!")
      setReplyText("")
      await fetchMessages()
      await onSuccess()
    } catch (error) {
      console.error("Erro ao enviar resposta:", error)
      toast.error(`Erro ao enviar resposta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsSending(false)
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

  if (!ticket) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-lg">{ticket.title}</DialogTitle>
              <DialogDescription>
                Ticket #{ticket.id} • Criado em {new Date(ticket.created_at).toLocaleString("pt-BR")}
              </DialogDescription>
            </div>
            <Badge variant={getStatusBadgeVariant(ticket.status)}>
              {getStatusLabel(ticket.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Descrição do ticket */}
          <div className="bg-muted p-4 rounded-md">
            <h3 className="text-sm font-medium mb-2">Descrição do Problema</h3>
            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            <div className="mt-2 text-xs text-muted-foreground">
              Por: {ticket.profiles.full_name} ({ticket.profiles.email})
            </div>
          </div>

          {/* Controle de status (apenas para super admins) */}
          {isSuperAdmin && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Alterar Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Conversa */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversa
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma mensagem ainda. Seja o primeiro a responder!
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {message.profiles.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {message.profiles.full_name}
                          {message.profiles.is_super_admin && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Admin
                            </Badge>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Área de resposta */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sua Resposta</label>
            <Textarea
              placeholder="Digite sua resposta aqui..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {replyText.length}/2000 caracteres
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button 
            onClick={handleSendReply} 
            disabled={isSending || !replyText.trim()}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Resposta"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 