import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";
import { TenantUser } from "@/app/(dashboard)/dashboard/lib/types";

interface EditUserModalProps {
  user: TenantUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
}

export function EditUserModal({ user, isOpen, onClose, onSave }: EditUserModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [tokenLimit, setTokenLimit] = useState<number>(0);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      try {
        // Buscar o estado atual dos bots do usuário na base de dados
        const { data: userBots, error: userBotsError } = await supabase
          .from("user_bots")
          .select("bot_id, enabled")
          .match({ 
            user_id: user.user_id, 
            tenant_id: user.tenant_id 
          });

        if (userBotsError) throw userBotsError;

        // Criar um mapa do estado atual dos bots
        const botStateMap = new Map(
          userBots?.map(bot => [bot.bot_id, bot.enabled]) || []
        );

        // Atualizar o estado do usuário com os dados corretos da base
        const userWithCorrectBotState = {
          ...user,
          bots: user.bots?.map(bot => ({
            ...bot,
            enabled: botStateMap.get(bot.id) ?? false
          })) || []
        };

        setEditingUser(userWithCorrectBotState);
        setTokenLimit(user.token_limit || 0);
        setHasChanges(false);
        setShowDeleteConfirm(false);
      } catch (error) {
        console.error("Erro ao carregar estado dos bots:", error);
        toast.error("Erro ao carregar estado dos bots");
      }
    };

    loadUserData();
  }, [user, supabase]);

  const handleToggleAllBots = () => {
    if (!editingUser) return;

    const newState = !editingUser.allow_bot_access;
    
    setEditingUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        allow_bot_access: newState,
        bots: prev.bots?.map(bot => ({
          ...bot,
          enabled: newState
        })) || []
      };
    });
    setHasChanges(true);
  };

  const handleToggleBot = (botId: string) => {
    if (!editingUser) return;

    // Se o bot está sendo ativado e o allow_bot_access está false, não permitir
    const bot = editingUser.bots?.find(b => b.id === botId);
    if (bot && !bot.enabled && !editingUser.allow_bot_access) {
      toast.error('É necessário ativar o acesso aos bots primeiro');
      return;
    }

    setEditingUser(prev => {
      if (!prev) return null;
      const updatedBots = prev.bots?.map(bot => 
        bot.id === botId 
          ? { ...bot, enabled: !bot.enabled }
          : bot
      ) || [];
      
      // Se algum bot estiver ativo, ativar o allow_bot_access
      const hasAnyEnabledBot = updatedBots.some(bot => bot.enabled);
      
      return {
        ...prev,
        allow_bot_access: hasAnyEnabledBot,
        bots: updatedBots
      };
    });
    setHasChanges(true);
  };

  const handleTokenLimitChange = (value: string) => {
    const newLimit = parseInt(value) || 0;
    setTokenLimit(newLimit);
    if (editingUser && newLimit !== editingUser.token_limit) {
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    if (!editingUser) return;

    setIsSaving(true);
    try {
      // Verificar se é super_user
      const { data: profile, error: authError } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (authError) throw authError;

      if (!profile?.is_super_admin) {
        toast.error('Apenas super_users podem editar permissões');
        return;
      }

      // Atualizar limite de tokens
      if (tokenLimit !== editingUser.token_limit) {
        const { error: tokenError } = await supabase
          .from('tenant_users')
          .update({ token_limit: tokenLimit })
          .match({ user_id: editingUser.user_id, tenant_id: editingUser.tenant_id });

        if (tokenError) throw tokenError;
      }

      // Atualizar allow_bot_access no tenant_users
      const { error: tenantUserError } = await supabase
        .from('tenant_users')
        .update({ allow_bot_access: editingUser.allow_bot_access })
        .match({ user_id: editingUser.user_id, tenant_id: editingUser.tenant_id });

      if (tenantUserError) throw tenantUserError;

      // Processar cada bot individualmente
      for (const bot of (editingUser.bots || [])) {
        // Verificar se existe o registro na tabela user_bots
        const { data: existingBot, error: checkError } = await supabase
          .from("user_bots")
          .select("*")
          .match({ 
            user_id: editingUser.user_id, 
            tenant_id: editingUser.tenant_id, 
            bot_id: bot.id 
          })
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (!existingBot) {
          // Criar novo registro se não existir
          const { error: insertError } = await supabase
            .from("user_bots")
            .insert([{
              user_id: editingUser.user_id,
              tenant_id: editingUser.tenant_id,
              bot_id: bot.id,
              enabled: bot.enabled,
              created_at: new Date().toISOString()
            }]);

          if (insertError) throw insertError;
        } else {
          // Atualizar apenas se o estado mudou
          const { error: updateError } = await supabase
            .from("user_bots")
            .update({ enabled: bot.enabled })
            .match({ 
              user_id: editingUser.user_id, 
              tenant_id: editingUser.tenant_id,
              bot_id: bot.id 
            });

          if (updateError) throw updateError;
        }
      }

      // Verificar se todas as atualizações foram bem sucedidas
      const { data: verifyData, error: verifyError } = await supabase
        .from("user_bots")
        .select("enabled, bot_id")
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        });

      if (verifyError) throw verifyError;

      const allUpdated = verifyData.every(bot => {
        const expectedState = editingUser.bots?.find(b => b.id === bot.bot_id)?.enabled;
        return bot.enabled === expectedState;
      });

      if (!allUpdated) {
        throw new Error('Nem todos os bots foram atualizados corretamente');
      }

      toast.success("Alterações salvas com sucesso!");
      await onSave();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar alterações:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingUser || !showDeleteConfirm) return;

    try {
      // Primeiro, remover todas as associações com bots do tenant
      const { error: userBotsError } = await supabase
        .from('user_bots')
        .delete()
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        });

      if (userBotsError) throw userBotsError;

      // Remover o uso de tokens associado ao usuário no tenant
      const { error: tokenUsageError } = await supabase
        .from('token_usage')
        .delete()
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        });

      if (tokenUsageError) throw tokenUsageError;

      // Por fim, remover o usuário do tenant
      const { error: tenantUserError } = await supabase
        .from('tenant_users')
        .delete()
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        });

      if (tenantUserError) throw tenantUserError;

      toast.success("Usuário removido do tenant com sucesso!");
      await onSave();
      onClose();
    } catch (error) {
      console.error("Erro ao remover usuário do tenant:", error);
      toast.error("Erro ao remover usuário do tenant");
    }
  };

  if (!editingUser) return null;

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open && hasChanges) {
          if (!confirm('Existem alterações não salvas. Deseja realmente fechar?')) {
            return;
          }
        }
        onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Gerencie as permissões e configurações deste usuário
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Usuário */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Informações do Usuário</h3>
            <p>Nome: {editingUser.profiles?.full_name}</p>
            <p>Email: {editingUser.profiles?.email}</p>
          </div>

          {/* Limite de Tokens */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Limite de Tokens</h3>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={tokenLimit}
                onChange={(e) => handleTokenLimitChange(e.target.value)}
                className="w-32"
              />
              <Label>tokens</Label>
            </div>
          </div>

          {/* Acesso aos Bots */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Acesso aos Bots</h3>
              <div className="flex items-center space-x-2">
                <Label>Acesso a todos os bots</Label>
                <Switch
                  checked={editingUser.allow_bot_access}
                  onCheckedChange={handleToggleAllBots}
                />
              </div>
            </div>

            <div className="grid gap-3">
              {editingUser.bots?.map((bot) => (
                <div 
                  key={bot.id} 
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center space-x-3">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">
                        {bot.name}
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {bot.token_usage?.total_tokens || 0} tokens
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm text-muted-foreground">
                      {bot.enabled ? "Ativado" : "Desativado"}
                    </Label>
                    <Switch
                      checked={bot.enabled}
                      onCheckedChange={() => handleToggleBot(bot.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Área de Exclusão */}
          <Accordion type="single" collapsible>
            <AccordionItem value="delete">
              <AccordionTrigger className="text-red-500">
                Excluir Usuário
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Atenção!</AlertTitle>
                    <AlertDescription>
                      Esta ação é irreversível. Ao excluir este usuário, você perderá:
                      <ul className="list-disc list-inside mt-2">
                        <li>Todas as permissões de bots</li>
                        <li>Histórico de uso de tokens</li>
                        <li>Acesso ao tenant</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  {!showDeleteConfirm ? (
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Excluir Usuário
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-red-500">
                        Tem certeza que deseja excluir este usuário?
                      </p>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleDelete}
                        >
                          Confirmar Exclusão
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 