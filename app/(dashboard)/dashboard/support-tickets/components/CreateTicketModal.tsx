import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "react-hot-toast"
import { Loader2 } from "lucide-react"

interface CreateTicketModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => Promise<void>
}

export function CreateTicketModal({ isOpen, onClose, onSuccess }: CreateTicketModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
  })

  const supabase = createClientComponentClient()

  const handleCreateTicket = async () => {
    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      toast.error("Por favor, preencha todos os campos")
      return
    }

    try {
      setIsSaving(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Usuário não autenticado")
        return
      }

      // Criar o ticket
      const { error: ticketError } = await supabase
        .from("support_tickets")
        .insert([
          {
            title: newTicket.title.trim(),
            description: newTicket.description.trim(),
            user_id: user.id,
            status: "pendente",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])

      if (ticketError) {
        console.error("Erro ao criar ticket:", ticketError)
        toast.error("Erro ao criar ticket. Tente novamente.")
        return
      }

      toast.success("Ticket criado com sucesso!")
      setNewTicket({ title: "", description: "" })
      await onSuccess()
      onClose()
    } catch (error) {
      console.error("Erro ao criar ticket:", error)
      toast.error("Erro ao criar ticket. Tente novamente.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      setNewTicket({ title: "", description: "" })
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Ticket de Suporte</DialogTitle>
          <DialogDescription>
            Descreva o problema ou erro que você encontrou com seus bots. Nossa equipe irá analisar e responder o mais rápido possível.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ex: Bot não responde a comandos específicos"
              value={newTicket.title}
              onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição Detalhada *</Label>
            <Textarea
              id="description"
              placeholder="Descreva o problema em detalhes, incluindo:&#10;- O que você estava tentando fazer&#10;- O que aconteceu&#10;- Qual bot estava sendo usado&#10;- Mensagens de erro (se houver)&#10;- Passos para reproduzir o problema"
              value={newTicket.description}
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              rows={8}
              maxLength={2000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {newTicket.description.length}/2000 caracteres
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleCreateTicket} disabled={isSaving || !newTicket.title.trim() || !newTicket.description.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              "Criar Ticket"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 