"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { TenantUser, Tenant, NewUser, Bot, TokenUsage } from "@/app/(dashboard)/dashboard/lib/types";
import { loadData } from "@/app/(dashboard)/dashboard/lib/loadData";
import { createUser, deleteUser, updateTokenLimit } from "@/app/(dashboard)/dashboard/lib/userManagement";
import { toggleBotAccess, toggleBot } from "@/app/(dashboard)/dashboard/lib/botManagement";
import { checkUserPermissions } from "@/app/(dashboard)/dashboard/lib/authManagement";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EditUserModal } from "@/app/(dashboard)/dashboard/admin-users/components/EditUserModal";
import { SearchUserModal } from "@/app/(dashboard)/dashboard/admin-users/components/SearchUserModal";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TenantBot {
  bot_id: string;
  enabled: boolean;
  bots: {
    id: string;
    name: string;
  }[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState<NewUser>({
    email: "",
    full_name: "",
    company: "",
    tenant_id: "",
    allow_bot_access: false,
    selected_bots: [],
    token_limit: 1000000 // Limite padrão
  });

  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [tenantBots, setTenantBots] = useState<Bot[]>([]);
  const [tokenLimits, setTokenLimits] = useState<Record<string, number>>({});

  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [shouldRefreshSearch, setShouldRefreshSearch] = useState(false);

  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkUser();
    fetchData();
  }, []);

  const checkUser = async () => {
    try {
      const permissions = await checkUserPermissions();
      
      if (!permissions) {
        router.push('/auth/signin');
        return;
      }

      if (!permissions.isSuperAdmin) {
        toast.error('Você não tem permissão para acessar esta página');
        router.push('/dashboard');
        return;
      }

      fetchData();
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      toast.error('Erro ao verificar permissões');
      router.push('/dashboard');
    }
  };

  const fetchData = async () => {
    try {
      const { users: fetchedUsers, tenants: fetchedTenants } = await loadData();
      
      // Buscar o estado atual dos bots para cada usuário
      const usersWithCorrectBotState = await Promise.all(
        fetchedUsers.map(async (user) => {
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

          // Atualizar o estado dos bots do usuário
          return {
            ...user,
            bots: user.bots?.map(bot => ({
              ...bot,
              enabled: botStateMap.get(bot.id) ?? false
            })) || []
          };
        })
      );

      setUsers(usersWithCorrectBotState);
      setTenants(fetchedTenants);

      // Buscar lista de bots
      const { data: botsData, error: botsError } = await supabase
        .from("bots")
        .select("*")
        .order("name");

      if (botsError) {
        console.error("Erro ao carregar bots:", botsError);
        throw botsError;
      }

      setBots(botsData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantBots = async (tenantId: string) => {
    try {
      // Buscar bots associados ao tenant
      const { data: tenantBotsData, error: tenantBotsError } = await supabase
        .from("tenant_bots")
        .select(`
          bot_id,
          enabled,
          bots!inner (
            id,
            name,
            description
          )
        `)
        .eq("tenant_id", tenantId);

      if (tenantBotsError) {
        console.error("Erro ao carregar bots do tenant:", tenantBotsError);
        throw tenantBotsError;
      }

      // Filtrar apenas os bots que estão ativos no tenant
      const activeTenantBots = tenantBotsData?.filter(tb => tb.enabled) || [];
      
      // Mapear os bots do tenant
      const formattedBots = activeTenantBots.map(tb => ({
        id: tb.bot_id,
        name: tb.bots.name || '',
        description: tb.bots.description || '', //Erro já conhecido, po
        enabled: true
      }));


      console.log('Bots do tenant:', formattedBots); // Log para debug

      setTenantBots(formattedBots);
      
      // Se estiver criando um novo usuário, selecionar todos os bots do tenant por padrão
      if (newUser.tenant_id === tenantId) {
        setNewUser(prev => ({
          ...prev,
          allow_bot_access: true,
          selected_bots: formattedBots.map(bot => bot.id)
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar bots do tenant:", error);
      toast.error("Erro ao carregar bots do tenant");
    }
  };

  useEffect(() => {
    if (selectedTenant) {
      fetchTenantBots(selectedTenant);
    }
  }, [selectedTenant]);

  const handleCreateUser = async () => {
    try {
      // Verificar se o usuário já existe
      const { data: existingUser, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newUser.email)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw userError;
      }

      let userId = existingUser?.id;

      // Se o usuário não existe, criar um novo usuário no auth
      if (!userId) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: newUser.email,
          password: Math.random().toString(36).slice(-8),
          options: {
            data: {
              full_name: newUser.full_name,
              company: newUser.company,
              is_super_admin: false
            }
          }
        });

        if (authError) throw authError;
        userId = authData.user?.id;
      }

      if (!userId) {
        throw new Error('Não foi possível obter o ID do usuário');
      }

      // Verificar se o usuário já está associado ao tenant
      const { count, error: countError } = await supabase
        .from('tenant_users')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('tenant_id', newUser.tenant_id);

      if (countError) {
        throw countError;
      }

      if (count && count > 0) {
        toast.error('Este usuário já está associado a este tenant');
        return;
      }

      toast.loading('Criando usuário...', { id: 'create-user' });

      // Criar associação com o tenant
      const { error: createError } = await supabase
        .from('tenant_users')
        .insert({
          user_id: userId,
          tenant_id: newUser.tenant_id,
          role: 'admin',
          allow_bot_access: newUser.allow_bot_access,
          token_limit: newUser.token_limit
        });

      if (createError) throw createError;

      // Se houver bots selecionados, criar as associações
      if (newUser.selected_bots && newUser.selected_bots.length > 0) {
        const botInserts = newUser.selected_bots.map(botId => ({
          user_id: userId,
          tenant_id: newUser.tenant_id,
          bot_id: botId,
          enabled: newUser.allow_bot_access,
          created_at: new Date().toISOString()
        }));

        const { error: botError } = await supabase
          .from('user_bots')
          .insert(botInserts);

        if (botError) throw botError;
      }

      // Aguardar um tempo mais longo para garantir que as alterações foram propagadas
      toast.loading('Finalizando criação do usuário...', { id: 'create-user' });
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verificar repetidamente se o usuário foi criado corretamente no tenant
      let tenantUserCreated = false;
      let retryCount = 0;
      const maxRetries = 5;
      
      while (!tenantUserCreated && retryCount < maxRetries) {
        const { data: verifyUser, error: verifyError } = await supabase
          .from('tenant_users')
          .select('*')
          .match({ 
            user_id: userId, 
            tenant_id: newUser.tenant_id 
          })
          .single();
      
        if (!verifyError && verifyUser) {
          tenantUserCreated = true;
          console.log('Usuário verificado no tenant após', retryCount + 1, 'tentativas');
        } else {
          retryCount++;
          console.log('Tentativa', retryCount, 'de verificar usuário no tenant falhou');
          
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (!tenantUserCreated) {
        console.warn('Não foi possível verificar o usuário no tenant após várias tentativas');
        toast.error('Usuário criado, mas pode haver atraso na propagação dos dados');
      }

      // Gerar token inicial se o usuário tiver acesso a bots
      if (newUser.allow_bot_access) {
        toast.loading('Gerando token inicial...', { id: 'create-user' });
        
        try {
          // Aguardar um momento para garantir que o usuário foi criado corretamente
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log(`Gerando token para usuário ${userId} no tenant ${newUser.tenant_id}`);
          
          const response = await fetch('/api/bots/generate-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              userId, 
              tenantId: newUser.tenant_id 
            }),
          });

          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Erro ao gerar token inicial');
          }

          if (data.token) {
            // Aguardar um momento para garantir que o documento está focado
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            try {
              await navigator.clipboard.writeText(data.token);
              toast.success('Token inicial gerado e copiado para a área de transferência', { id: 'create-user' });
            } catch (clipboardError) {
              console.warn('Não foi possível copiar o token para a área de transferência:', clipboardError);
              toast.success('Token inicial gerado com sucesso!', { id: 'create-user' });
            }
          } else {
            throw new Error('Token não gerado');
          }
        } catch (error) {
          console.error('Erro ao gerar token inicial:', error);
          toast.error('Usuário criado, mas houve erro ao gerar token inicial. Tente gerar o token manualmente na página de edição.', { id: 'create-user' });
        }
      } else {
        toast.success('Usuário criado com sucesso!', { id: 'create-user' });
      }

      setNewUser({
        email: "",
        full_name: "",
        company: "",
        tenant_id: "",
        allow_bot_access: false,
        selected_bots: [],
        token_limit: 1000000
      });
      fetchData();
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      toast.error(`Erro ao criar usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleDeleteUser = async (userId: string, tenantId: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    
    try {
      await deleteUser(userId, tenantId);
      setShouldRefreshSearch(true);
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
    }
  };

  const handleToggleBotAccess = async (userId: string, tenantId: string, botId: string, currentEnabled: boolean) => {
    try {
      const newEnabledState = !currentEnabled;
      console.log('Toggle bot access:', { userId, tenantId, botId, currentEnabled, newEnabledState });

      // Primeiro, verificar se existe o registro na tabela user_bots
      const { data: existingBot, error: checkError } = await supabase
        .from("user_bots")
        .select("*")
        .match({ user_id: userId, tenant_id: tenantId, bot_id: botId })
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Erro ao verificar bot existente:', checkError);
        throw checkError;
      }

      let updateError;
      if (!existingBot) {
        // Se não existir, criar o registro com o novo estado
        const { error } = await supabase
          .from("user_bots")
          .insert([{
            user_id: userId,
            tenant_id: tenantId,
            bot_id: botId,
            enabled: newEnabledState,
            created_at: new Date().toISOString()
          }]);
        updateError = error;
      } else {
        // Se existir, atualizar o status com o novo estado
        const { error } = await supabase
          .from("user_bots")
          .update({ enabled: newEnabledState })
          .match({ user_id: userId, tenant_id: tenantId, bot_id: botId });
        updateError = error;
      }

      if (updateError) {
        console.error('Erro ao atualizar estado do bot:', updateError);
        throw updateError;
      }

      // Verificar se a atualização foi bem sucedida
      const { data: verifyData, error: verifyError } = await supabase
        .from("user_bots")
        .select("enabled")
        .match({ user_id: userId, tenant_id: tenantId, bot_id: botId })
        .single();

      if (verifyError) {
        console.error('Erro ao verificar atualização:', verifyError);
        throw verifyError;
      }

      if (verifyData.enabled !== newEnabledState) {
        console.error('Estado não atualizado corretamente:', verifyData);
        throw new Error('Estado não atualizado corretamente');
      }

      // Atualizar o estado local
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.user_id === userId) {
            return {
              ...user,
              bots: user.bots?.map(bot => 
                bot.id === botId 
                  ? { ...bot, enabled: newEnabledState }
                  : bot
              ) || []
            };
          }
          return user;
        })
      );

      toast.success(`Acesso ao bot ${newEnabledState ? 'ativado' : 'desativado'} com sucesso!`);
      
      // Recarregar os dados
      await fetchData();
    } catch (error) {
      console.error("Erro ao atualizar acesso ao bot:", error);
      toast.error("Erro ao atualizar acesso ao bot");
      // Reverter o estado local em caso de erro
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.user_id === userId) {
            return {
              ...user,
              bots: user.bots?.map(bot => 
                bot.id === botId 
                  ? { ...bot, enabled: currentEnabled }
                  : bot
              ) || []
            };
          }
          return user;
        })
      );
    }
  };

  const handleToggleAllBotsAccess = async (userId: string, tenantId: string, currentEnabled: boolean) => {
    try {
      const newEnabledState = !currentEnabled;
      console.log('Toggle all bots access:', { userId, tenantId, currentEnabled, newEnabledState });

      // Buscar todos os bots do usuário
      const { data: userBots, error: fetchError } = await supabase
        .from("user_bots")
        .select("bot_id")
        .match({ user_id: userId, tenant_id: tenantId });

      if (fetchError) {
        console.error('Erro ao buscar bots do usuário:', fetchError);
        throw fetchError;
      }

      if (userBots && userBots.length > 0) {
        // Atualizar todos os bots do usuário
        const { error: updateError } = await supabase
          .from("user_bots")
          .update({ enabled: newEnabledState })
          .match({ user_id: userId, tenant_id: tenantId });

        if (updateError) {
          console.error('Erro ao atualizar todos os bots:', updateError);
          throw updateError;
        }

        // Verificar se a atualização foi bem sucedida
        const { data: verifyData, error: verifyError } = await supabase
          .from("user_bots")
          .select("enabled")
          .match({ user_id: userId, tenant_id: tenantId });

        if (verifyError) {
          console.error('Erro ao verificar atualização:', verifyError);
          throw verifyError;
        }

        const allUpdated = verifyData.every(bot => bot.enabled === newEnabledState);
        if (!allUpdated) {
          console.error('Nem todos os bots foram atualizados corretamente');
          throw new Error('Nem todos os bots foram atualizados corretamente');
        }
      }

      // Atualizar o estado local
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.user_id === userId) {
            return {
              ...user,
              allow_bot_access: newEnabledState,
              bots: user.bots?.map(bot => ({
                ...bot,
                enabled: newEnabledState
              })) || []
            };
          }
          return user;
        })
      );

      toast.success(`Acesso a todos os bots ${newEnabledState ? 'ativado' : 'desativado'} com sucesso!`);
      
      // Recarregar os dados
      await fetchData();
    } catch (error) {
      console.error("Erro ao atualizar acesso aos bots:", error);
      toast.error("Erro ao atualizar acesso aos bots");
      // Reverter o estado local em caso de erro
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.user_id === userId) {
            return {
              ...user,
              allow_bot_access: currentEnabled,
              bots: user.bots?.map(bot => ({
                ...bot,
                enabled: currentEnabled
              })) || []
            };
          }
          return user;
        })
      );
    }
  };

  const handleToggleBot = async (userId: string, botId: string, currentEnabled: boolean) => {
    try {
      await toggleBot(userId, botId, currentEnabled);
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar status do bot:", error);
    }
  };

  const handleToggleTenantBot = async (botId: string, currentEnabled: boolean) => {
    try {
      if (!selectedTenant) return;
      await toggleBot(selectedTenant, botId, currentEnabled);
      fetchTenantBots(selectedTenant);
    } catch (error) {
      console.error("Erro ao atualizar status do bot:", error);
    }
  };

  const handleTokenLimitChange = (userId: string, value: string) => {
    setTokenLimits(prev => ({
      ...prev,
      [userId]: parseInt(value) || 0
    }));
  };

  const handleUpdateTokenLimit = async (userId: string, tenantId: string) => {
    try {
      const newLimit = tokenLimits[userId];
      if (newLimit === undefined) return;

      await updateTokenLimit(userId, tenantId, newLimit);
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar limite de tokens:", error);
    }
  };

  const handleRemoveBotAccess = async (userId: string, tenantId: string, botId: string) => {
    try {
      const { error } = await supabase
        .from("user_bots")
        .delete()
        .match({ user_id: userId, tenant_id: tenantId, bot_id: botId });

      if (error) throw error;

      toast.success("Acesso ao bot removido com sucesso!");
      fetchData();
    } catch (error) {
      console.error("Erro ao remover acesso ao bot:", error);
      toast.error("Erro ao remover acesso ao bot");
    }
  };

  const handleRemoveAllBotAccess = async (userId: string, tenantId: string) => {
    if (!confirm("Tem certeza que deseja remover o acesso a todos os bots deste usuário?")) return;

    try {
      const { error } = await supabase
        .from("user_bots")
        .delete()
        .match({ user_id: userId, tenant_id: tenantId });

      if (error) throw error;

      toast.success("Acesso a todos os bots removido com sucesso!");
      fetchData();
    } catch (error) {
      console.error("Erro ao remover acesso aos bots:", error);
      toast.error("Erro ao remover acesso aos bots");
    }
  };

  const handleUpdateUser = async () => {
    try {
      if (!editingUser) return;

      // Atualizar dados do tenant_user
      const { error: updateError } = await supabase
        .from('tenant_users')
        .update({
          allow_bot_access: editingUser.allow_bot_access,
          token_limit: editingUser.token_limit
        })
        .match({ 
          user_id: editingUser.user_id, 
          tenant_id: editingUser.tenant_id 
        });

      if (updateError) throw updateError;

      // Atualizar associações de bots
      if (editingUser.selected_bots) {
        // Primeiro, remover todas as associações existentes
        const { error: deleteError } = await supabase
          .from('user_bots')
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
            .from('user_bots')
            .insert(botInserts);

          if (botError) throw botError;
        }
      }

      toast.success('Usuário atualizado com sucesso!');
      setEditingUser(null);
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      toast.error("Erro ao atualizar usuário");
    }
  };

  const handleEditUser = async (user: TenantUser) => {
    try {
      // Verificar se é super_user
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (error) throw error;

      if (!profile?.is_super_admin) {
        toast.error('Apenas super_users podem editar permissões de bots');
        return;
      }

      setEditingUser(user);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      toast.error('Erro ao verificar permissões');
    }
  };

  const handleSelectExistingUser = (user: any) => {
    setNewUser({
      ...newUser,
      email: user.email,
      full_name: user.full_name,
      company: user.company,
    });
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">Gerenciamento de Usuários Admin</h1>

      {/* Formulário de criação de usuário */}
      <Card className="mb-8 p-4 sm:p-6">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Criar Novo Usuário Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                onClick={() => setIsSearchModalOpen(true)}
                className="flex-1"
              >
                Pesquisar Usuário Existente
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setNewUser({
                    email: "",
                    full_name: "",
                    company: "",
                    tenant_id: "",
                    allow_bot_access: false,
                    selected_bots: [],
                    token_limit: 1000000
                  });
                }}
                className="flex-1"
              >
                Criar Novo Usuário
              </Button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                placeholder="Digite o nome completo"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                value={newUser.company}
                onChange={(e) => setNewUser({ ...newUser, company: e.target.value })}
                placeholder="Digite o nome da empresa"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tenant">Tenant</Label>
              <Select
                value={newUser.tenant_id}
                onValueChange={(value) => {
                  setNewUser({ 
                    ...newUser, 
                    tenant_id: value,
                    allow_bot_access: true
                  });
                  setSelectedTenant(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newUser.tenant_id && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="token_limit">Limite de Tokens</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="token_limit"
                      type="number"
                      value={newUser.token_limit}
                      onChange={(e) => setNewUser({ 
                        ...newUser, 
                        token_limit: parseInt(e.target.value) || 0 
                      })}
                      className="w-32"
                    />
                    <Label>tokens</Label>
                  </div>
                </div>

                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Gerenciamento de Bots</CardTitle>
                    <CardDescription>
                      Selecione quais bots este admin terá acesso
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="bot-access"
                          checked={newUser.allow_bot_access}
                          onCheckedChange={(checked) => setNewUser({ 
                            ...newUser, 
                            allow_bot_access: checked,
                            selected_bots: checked ? tenantBots.map(bot => bot.id) : []
                          })}
                        />
                        <Label htmlFor="bot-access">Permitir acesso aos bots</Label>
                      </div>
                      {newUser.allow_bot_access && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allSelected = newUser.selected_bots?.length === tenantBots.length;
                            setNewUser({
                              ...newUser,
                              selected_bots: allSelected ? [] : tenantBots.map(bot => bot.id)
                            });
                          }}
                        >
                          {newUser.selected_bots?.length === tenantBots.length 
                            ? "Desselecionar Todos" 
                            : "Selecionar Todos"}
                        </Button>
                      )}
                    </div>

                    <ScrollArea className="h-[300px] rounded-md border p-4">
                      <div className="grid gap-3">
                        {tenantBots.map((bot) => (
                          <div 
                            key={bot.id} 
                            className="flex items-center justify-between p-3 rounded-lg border bg-card"
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`bot-${bot.id}`}
                                checked={newUser.selected_bots?.includes(bot.id)}
                                onCheckedChange={(checked) => {
                                  const updatedBots = checked
                                    ? [...(newUser.selected_bots || []), bot.id]
                                    : (newUser.selected_bots || []).filter(id => id !== bot.id);
                                  setNewUser({ ...newUser, selected_bots: updatedBots });
                                }}
                                disabled={!newUser.allow_bot_access}
                              />
                              <div className="space-y-1">
                                <Label 
                                  htmlFor={`bot-${bot.id}`} 
                                  className="text-sm font-medium"
                                >
                                  {bot.name}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {bot.description || 'Sem descrição'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </>
            )}

            <Button 
              className="w-full sm:w-auto" 
              onClick={handleCreateUser}
              disabled={!newUser.email || !newUser.full_name || !newUser.tenant_id}
            >
              Criar Usuário
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuários */}
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {users.map((user) => (
          <Card key={`${user.user_id}-${user.tenant_id}`} className="flex flex-col min-w-0 break-words p-4 sm:p-6">
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-base sm:text-lg">
                <span className="truncate">{user.profiles?.full_name || user.profiles?.email}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditUser(user)}
                  className="flex-shrink-0 ml-2"
                >
                  Editar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="space-y-4 flex-1">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Email</p>
                  <p className="truncate">{user.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Tenant</p>
                  <p className="truncate">{tenants.find(t => t.id === user.tenant_id)?.name}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Função</p>
                  <p>{user.role}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Consumo de Tokens</p>
                  <p>Total: {user.token_usage?.total_tokens || 0}</p>
                  <p>Último uso: {user.token_usage?.last_used ? new Date(user.token_usage.last_used).toLocaleDateString() : 'Nunca'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Limite de Tokens</p>
                  <p>{user.token_limit || 0} tokens</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`bot-access-${user.user_id}`}
                    checked={user.allow_bot_access}
                    disabled
                  />
                  <Label htmlFor={`bot-access-${user.user_id}`}>Acesso aos bots</Label>
                </div>

                {/* Lista de bots associados */}
                {user.bots && user.bots.length > 0 && (
                  <Card className="mt-4 flex-1 bg-background/80">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base sm:text-lg">Bots Associados</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Status atual dos bots disponíveis para este admin
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted-foreground/30">
                        {user.bots.map((bot) => (
                          <div 
                            key={bot.id} 
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border w-full min-w-0 ${
                              !bot.enabled ? 'bg-muted/50' : 'bg-card'
                            }`}
                          >
                            <div className="flex items-start sm:items-center space-x-3 min-w-0 mb-2 sm:mb-0 w-full">
                              <div className="space-y-1 min-w-0 flex-1">
                                <Label 
                                  className={`text-sm font-medium block ${!bot.enabled ? 'text-muted-foreground' : ''}`}
                                >
                                  {bot.name}
                                </Label>
                                <div className="flex items-center space-x-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    {bot.token_usage?.total_tokens || 0} tokens
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Último uso: {bot.token_usage?.last_used ? new Date(bot.token_usage.last_used).toLocaleDateString() : 'Nunca'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-0 sm:ml-4 flex-shrink-0">
                              <Label 
                                className="text-sm text-muted-foreground whitespace-nowrap"
                              >
                                {bot.enabled ? "Ativado" : "Desativado"}
                              </Label>
                              <Switch
                                checked={bot.enabled}
                                disabled
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Edição */}
      <EditUserModal
        user={editingUser}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        onSave={fetchData}
      />

      {/* Modal de Pesquisa */}
      <SearchUserModal
        isOpen={isSearchModalOpen}
        onClose={() => {
          setIsSearchModalOpen(false);
          setShouldRefreshSearch(false);
        }}
        onSelectUser={handleSelectExistingUser}
        shouldRefresh={shouldRefreshSearch}
      />
    </div>
  );
} 