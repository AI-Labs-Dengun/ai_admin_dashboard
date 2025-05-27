import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { EditBotModal } from "./EditBotModal";
import { useSupabase } from "@/app/providers/supabase-provider";
import { checkUserPermissions } from "@/app/(dashboard)/dashboard/lib/authManagement";

interface BotDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: {
    id: string;
    name: string;
    description: string | null;
    bot_capabilities: string[];
    contact_email: string | null;
    website: string | null;
    max_tokens_per_request: number;
    created_at: string;
  } | null;
  onSuccess: () => void;
}

export function BotDetailsModal({ isOpen, onClose, bot, onSuccess }: BotDetailsModalProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { supabase } = useSupabase();

  const checkPermissions = async () => {
    try {
      const permissions = await checkUserPermissions();
      if (permissions) {
        setIsSuperAdmin(permissions.isSuperAdmin);
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  if (!bot) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-2xl font-bold">{bot.name}</DialogTitle>
            {isSuperAdmin && (
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(true)}
              >
                Editar Bot
              </Button>
            )}
          </DialogHeader>

          <ScrollArea className="h-[calc(90vh-8rem)] pr-4">
            <div className="space-y-6">
              {/* Informações Básicas */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Descrição</h3>
                    <p className="mt-1">{bot.description || "Sem descrição"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Data de Criação</h3>
                    <p className="mt-1">
                      {format(new Date(bot.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Capacidades */}
              <Card>
                <CardHeader>
                  <CardTitle>Capacidades</CardTitle>
                  <CardDescription>Funcionalidades disponíveis para este bot</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {bot.bot_capabilities && bot.bot_capabilities.length > 0 ? (
                      bot.bot_capabilities.map((capability, index) => (
                        <Badge key={index} variant="secondary">
                          {capability}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground">Nenhuma capacidade definida</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Configurações Técnicas */}
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Técnicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Limite de Tokens por Requisição</h3>
                    <p className="mt-1">{bot.max_tokens_per_request.toLocaleString()} tokens</p>
                  </div>
                </CardContent>
              </Card>

              {/* Contato */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações de Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bot.contact_email && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Email de Contato</h3>
                      <a
                        href={`mailto:${bot.contact_email}`}
                        className="mt-1 text-primary hover:underline"
                      >
                        {bot.contact_email}
                      </a>
                    </div>
                  )}
                  {bot.website && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Website</h3>
                      <a
                        href={bot.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-primary hover:underline"
                      >
                        {bot.website}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <EditBotModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        bot={bot}
        onSuccess={() => {
          onSuccess();
          setIsEditModalOpen(false);
        }}
      />
    </>
  );
} 