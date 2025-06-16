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
import { resetUserTokens } from "@/app/(dashboard)/dashboard/lib/tokenManagement";
import { toggleAllBots, toggleBot, updateTenantBotAuthorization, isBotAuthorizedInTenant } from "@/app/(dashboard)/dashboard/lib/botManagement";
import { cn } from "@/lib/utils";

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
  const [interactionsLimit, setInteractionsLimit] = useState<string>("");
  const [shouldResetTokens, setShouldResetTokens] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tenantBots, setTenantBots] = useState<any[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      try {
        // Buscar dados atualizados do usuário
        const { data: userData, error: userError } = await supabase
          .from('super_tenant_users')
          .select(`
            *,
            profiles (
              email,
              full_name,
              company
            )
          `)
          .match({ 
            user_id: user.user_id, 
            tenant_id: user.tenant_id 
          })
          .single();

        if (userError) throw userError;

        // Buscar bots do tenant
        const { data: tenantBotsData, error: tenantBotsError } = await supabase
          .from('super_tenant_bots')
          .select(`
            bot_id,
            enabled,
            super_bots!inner (
              id,
              name,
              description,
              bot_capabilities,
              max_tokens_per_request
            )
          `)
          .eq('tenant_id', user.tenant_id);

        if (tenantBotsError) throw tenantBotsError;

        // Buscar autorizações de bots do usuário
        const { data: userBotAuthorizations, error: userBotAuthError } = await supabase
          .from('super_tenant_user_bots')
          .select('bot_id, is_authorized')
          .match({ 
            user_id: user.user_id, 
            tenant_id: user.tenant_id 
          });

        if (userBotAuthError) throw userBotAuthError;

        // Criar um mapa das autorizações atuais
        const botAuthMap = new Map(
          userBotAuthorizations?.map(auth => [auth.bot_id, auth.is_authorized]) || []
        );

        // Atualizar o estado do usuário com os dados corretos
        const userWithCorrectBotState = {
          ...user,
          profiles: {
            ...user.profiles,
            full_name: userData.profiles.full_name,
            email: userData.profiles.email,
            company: userData.profiles.company
          },
          bots: tenantBotsData?.map(bot => ({
            ...bot.super_bots,
            enabled: botAuthMap.get(bot.bot_id) ?? false
          })) || []
        };

        setEditingUser(userWithCorrectBotState);
        setTenantBots(tenantBotsData || []);
        setInteractionsLimit(user.interactions_limit?.toString() || "0");
        setHasChanges(false);
        setShowDeleteConfirm(false);
        setShouldResetTokens(false);
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        toast.error("Erro ao carregar dados do usuário");
      }
    };

    const checkSuperAdmin = async () => {
      if (!user) return;

      try {
        const { data: profile, error: authError } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (authError) throw authError;
        setIsSuperAdmin(profile?.is_super_admin ?? false);
      } catch (error) {
        console.error("Erro ao verificar permissões:", error);
        toast.error("Erro ao verificar permissões");
      }
    };

    if (isOpen) {
      loadUserData();
      checkSuperAdmin();
    }
  }, [user, supabase, isOpen]);

  const handleToggleBot = async (botId: string) => {
    if (!editingUser) return;

    try {
      // Atualizar o estado local
      setEditingUser(prev => {
        if (!prev) return null;
        const updatedBots = prev.bots?.map(bot => 
          bot.id === botId 
            ? { ...bot, enabled: !bot.enabled }
            : bot
        ) || [];
        
        return {
          ...prev,
          bots: updatedBots
        };
      });
      setHasChanges(true);
    } catch (error) {
      console.error("Erro ao atualizar estado do bot:", error);
      toast.error("Erro ao atualizar estado do bot");
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

      toast.loading('Salvando alterações...', { id: 'save-changes' });

      // 1. Atualizar dados do usuário no tenant_users
      const { error: updateError } = await supabase
        .from('super_tenant_users')
        .update({
          allow_bot_access: editingUser.allow_bot_access,
          interactions_limit: parseInt(interactionsLimit) || 0
        })
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        });

      if (updateError) throw updateError;

      // 2. Atualizar autorizações dos bots
      const botUpdates = editingUser.bots?.map(bot => ({
        tenant_id: editingUser.tenant_id,
        user_id: editingUser.user_id,
        bot_id: bot.id,
        is_authorized: bot.enabled
      })) || [];

      // Primeiro, remover todas as autorizações existentes
      const { error: deleteError } = await supabase
        .from('super_tenant_user_bots')
        .delete()
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        });

      if (deleteError) throw deleteError;

      // Depois, inserir as novas autorizações
      if (botUpdates.length > 0) {
        const { error: insertError } = await supabase
          .from('super_tenant_user_bots')
          .insert(botUpdates);

        if (insertError) throw insertError;
      }

      toast.success('Alterações salvas com sucesso!', { id: 'save-changes' });
      await onSave();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar alterações:", error);
      toast.error(`Erro ao salvar alterações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, { id: 'save-changes' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingUser || !showDeleteConfirm) return;

    try {
      // Remover todas as associações de bots
      const { error: botError } = await supabase
        .from('client_bot_usage')
        .delete()
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        });

      if (botError) {
        console.error('Erro ao remover associações de bots:', botError);
        throw new Error(`Erro ao remover associações de bots: ${botError.message}`);
      }

      // Remover o uso de tokens associado ao usuário no tenant
      const { error: tokenUsageError } = await supabase
        .from('client_bot_usage')
        .delete()
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        });

      if (tokenUsageError) {
        console.error('Erro ao remover uso de tokens:', tokenUsageError);
        throw new Error(`Erro ao remover uso de tokens: ${tokenUsageError.message}`);
      }

      // Por fim, remover o usuário do tenant
      const { error: deleteError } = await supabase
        .from('super_tenant_users')
        .delete()
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        });

      if (deleteError) {
        console.error('Erro ao remover usuário do tenant:', deleteError);
        throw new Error(`Erro ao remover usuário do tenant: ${deleteError.message}`);
      }

      toast.success("Usuário removido do tenant com sucesso!");
      await onSave();
      onClose();
    } catch (error) {
      console.error("Erro ao remover usuário do tenant:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao remover usuário do tenant");
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
            <p>Nome: {editingUser?.profiles?.full_name}</p>
            <p>Email: {editingUser?.profiles?.email}</p>
            <p>Empresa: {editingUser?.profiles?.company}</p>
          </div>

          {/* Limite de Interações */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Limite de Interações</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label>Limite de Interações</Label>
                <Input
                  type="text"
                  value={interactionsLimit}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setInteractionsLimit(value);
                    setHasChanges(true);
                  }}
                  min={0}
                />
              </div>
            </div>
          </div>

          {/* Acesso aos Bots */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Acesso aos Bots</h3>
            </div>

            <div className="grid gap-3">
              {editingUser?.bots?.map((bot) => (
                <div 
                  key={bot.id} 
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center space-x-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">
                          {bot.name}
                        </Label>
                        {isSuperAdmin && (
                          <Badge 
                            variant={bot.enabled ? "default" : "destructive"}
                            className={cn(
                              "text-xs",
                              bot.enabled && "bg-green-500 hover:bg-green-600"
                            )}
                          >
                            {bot.enabled ? "Autorizado" : "Não Autorizado"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{bot.description}</p>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {bot.max_tokens_per_request} tokens/mensagem
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
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
                </div>
              ))}
            </div>
          </div>

          {/* Área de Exclusão */}
          <Accordion type="single" collapsible>
            <AccordionItem value="delete">
              <AccordionTrigger className="text-red-500">
                Excluir Usuário do Tenant
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Atenção!</AlertTitle>
                    <AlertDescription>
                      Esta ação é irreversível. Ao excluir este usuário do tenant, você perderá:
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