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
import { toggleAllBots, toggleBot } from "@/app/(dashboard)/dashboard/lib/botManagement";
import { useBotToken } from '@/app/(dashboard)/dashboard/hooks/useBotToken';
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
  const [tokenLimit, setTokenLimit] = useState<string>("");
  const [shouldGenerateToken, setShouldGenerateToken] = useState(false);
  const [shouldResetTokens, setShouldResetTokens] = useState(false);
  const supabase = createClientComponentClient();
  const { generateToken, isLoading: isGeneratingToken, currentToken, refreshToken } = useBotToken();

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
        const { data: tenantBots, error: tenantBotsError } = await supabase
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

        // Buscar bots do usuário
        const { data: userBots, error: userBotsError } = await supabase
          .from('client_user_bots')
          .select('bot_id, enabled')
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
          profiles: {
            ...user.profiles,
            full_name: userData.profiles.full_name,
            email: userData.profiles.email,
            company: userData.profiles.company
          },
          bots: user.bots?.map(bot => ({
            ...bot,
            enabled: botStateMap.get(bot.id) ?? false
          })) || []
        };

        setEditingUser(userWithCorrectBotState);
        setTokenLimit(user.token_limit?.toString() || "0");
        setHasChanges(false);
        setShowDeleteConfirm(false);
        setShouldGenerateToken(false);
        setShouldResetTokens(false);
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        toast.error("Erro ao carregar dados do usuário");
      }
    };

    if (isOpen) {
      loadUserData();
    }
  }, [user, supabase, isOpen]);

  const handleToggleAllBots = async () => {
    if (!editingUser) return;

    const newState = !editingUser.allow_bot_access;
    
    try {
      // Atualizar apenas o estado local
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
    } catch (error) {
      console.error("Erro ao atualizar estado dos bots:", error);
      toast.error("Erro ao atualizar estado dos bots");
    }
  };

  const handleToggleBot = async (botId: string) => {
    if (!editingUser) return;

    // Se o bot está sendo ativado e o allow_bot_access está false, não permitir
    const bot = editingUser.bots?.find(b => b.id === botId);
    if (bot && !bot.enabled && !editingUser.allow_bot_access) {
      toast.error('É necessário ativar o acesso aos bots primeiro');
      return;
    }

    try {
      // Atualizar apenas o estado local
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
    } catch (error) {
      console.error("Erro ao atualizar estado do bot:", error);
      toast.error("Erro ao atualizar estado do bot");
    }
  };

  const handleTokenLimitChange = (value: string) => {
    // Garantir que o valor seja um número válido
    const numericValue = value.replace(/[^0-9]/g, '');
    setTokenLimit(numericValue);
    
    if (editingUser) {
      setEditingUser({
        ...editingUser,
        token_limit: parseInt(numericValue) || 0
      });
      setHasChanges(true);
    }
  };

  const handleGenerateToken = async () => {
    if (!editingUser) return;

    try {
      toast.loading('Gerando novo token...', { id: 'generate-token' });
      console.log('Gerando token para:', { userId: editingUser.user_id, tenantId: editingUser.tenant_id });

      // Verificar se o usuário existe no tenant
      const { data: tenantUser, error: checkError } = await supabase
        .from('super_tenant_users')
        .select('*')
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        })
        .single();

      if (checkError) {
        console.error('Erro ao verificar usuário no tenant:', checkError);
        throw new Error('Erro ao verificar usuário no tenant');
      }

      // Verificar se há bots habilitados
      const { data: userBots, error: botError } = await supabase
        .from('client_user_bots')
        .select('bot_id, enabled')
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        })
        .eq('enabled', true);

      if (botError) {
        console.error('Erro ao verificar bots do usuário:', botError);
        throw new Error('Erro ao verificar bots do usuário');
      }

      if (!userBots || userBots.length === 0) {
        throw new Error('Nenhum bot habilitado para o usuário');
      }

      // Gerar o token
      const token = await generateToken(editingUser.user_id, editingUser.tenant_id);
      if (!token) {
        throw new Error('Falha ao gerar token');
      }

      // Copiar o token para o clipboard
      await navigator.clipboard.writeText(token);
      toast.success('Token gerado e copiado para a área de transferência', { id: 'generate-token' });
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar token', { id: 'generate-token' });
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
      console.log('1. Atualizando dados do usuário...');
      const { error: updateError } = await supabase
        .from('super_tenant_users')
        .update({
          allow_bot_access: editingUser.allow_bot_access,
          token_limit: editingUser.token_limit
        })
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        });

      if (updateError) {
        console.error('Erro ao atualizar dados do usuário:', updateError);
        throw updateError;
      }

      // 2. Atualizar permissões dos bots
      console.log('2. Atualizando permissões dos bots...');
      // Primeiro, remover todas as associações existentes
      const { error: deleteError } = await supabase
        .from('client_user_bots')
        .delete()
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        });

      if (deleteError) throw deleteError;

      // Depois, criar novas associações para os bots selecionados
      if (editingUser.selected_bots.length > 0) {
        const botInserts = editingUser.selected_bots.map(botId => ({
          user_id: editingUser.user_id,
          tenant_id: editingUser.tenant_id,
          bot_id: botId,
          enabled: editingUser.allow_bot_access,
          created_at: new Date().toISOString()
        }));

        const { error: botError } = await supabase
          .from('client_user_bots')
          .insert(botInserts);

        if (botError) throw botError;
      }

      // 3. Resetar tokens (se selecionado)
      if (shouldResetTokens) {
        console.log('3. Resetando tokens...');
        try {
          await resetUserTokens(editingUser.user_id, editingUser.tenant_id);
          toast.success('Tokens resetados com sucesso!', { id: 'save-changes' });
        } catch (resetError) {
          console.error('Erro ao resetar tokens:', resetError);
          toast.error(`Erro ao resetar tokens: ${resetError instanceof Error ? resetError.message : 'Erro desconhecido'}`, { id: 'save-changes' });
        }
      }

      // 4. Gerar novo token (se selecionado) - sempre por último
      if (shouldGenerateToken) {
        console.log('4. Gerando novo token...');
        try {
          // Aguardar um momento para garantir que todas as alterações foram propagadas
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const token = await generateToken(editingUser.user_id, editingUser.tenant_id);
          if (token) {
            await navigator.clipboard.writeText(token);
            toast.success('Alterações salvas e novo token gerado com sucesso!', { id: 'save-changes' });
          } else {
            toast.error('Alterações salvas, mas houve erro ao gerar novo token', { id: 'save-changes' });
          }
        } catch (tokenError) {
          console.error('Erro ao gerar token:', tokenError);
          toast.error(`Alterações salvas, mas houve erro ao gerar novo token: ${tokenError instanceof Error ? tokenError.message : 'Erro desconhecido'}`, { id: 'save-changes' });
        }
      } else {
        toast.success('Alterações salvas com sucesso!', { id: 'save-changes' });
      }

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
        .from('client_user_bots')
        .delete()
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        });

      if (botError) throw botError;

      // Remover o uso de tokens associado ao usuário no tenant
      const { error: tokenUsageError } = await supabase
        .from('client_token_usage')
        .delete()
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        });

      if (tokenUsageError) throw tokenUsageError;

      // Por fim, remover o usuário do tenant
      const { error: deleteError } = await supabase
        .from('super_tenant_users')
        .delete()
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        });

      if (deleteError) throw deleteError;

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
            <p>Empresa: {editingUser.profiles?.company}</p>
          </div>

          {/* Limite de Tokens */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Limite de Tokens</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label>Limite de Tokens</Label>
                <Input
                  type="text"
                  value={tokenLimit}
                  onChange={(e) => handleTokenLimitChange(e.target.value)}
                  min={0}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShouldGenerateToken(!shouldGenerateToken)}
                  className={cn(
                    "transition-colors",
                    shouldGenerateToken && "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  )}
                >
                  {isGeneratingToken ? 'Gerando...' : 'Gerar Novo Token'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShouldResetTokens(!shouldResetTokens)}
                  className={cn(
                    "transition-colors",
                    shouldResetTokens && "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  )}
                >
                  Resetar Tokens
                </Button>
              </div>
            </div>
            {currentToken && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground mb-1">Token JWT Atual:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-background p-2 rounded flex-1 overflow-x-auto">
                    {currentToken}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(currentToken);
                      toast.success('Token copiado para a área de transferência');
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Este token expira em 10 minutos e será renovado automaticamente apenas após expiração. O histórico de consumo é mantido.
                </p>
              </div>
            )}
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
                      <div className="flex items-center space-x-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {bot.token_usage?.total_tokens || 0} tokens
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!editingUser) return;
                            if (!confirm(`Tem certeza que deseja resetar os tokens do bot ${bot.name}?`)) return;
                            
                            try {
                              await resetUserTokens(editingUser.user_id, editingUser.tenant_id, bot.id);
                              await onSave();
                            } catch (error) {
                              console.error("Erro ao resetar tokens do bot:", error);
                            }
                          }}
                        >
                          Resetar
                        </Button>
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