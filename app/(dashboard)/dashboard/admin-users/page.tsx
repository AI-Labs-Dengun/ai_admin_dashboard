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
import { TenantUser, Tenant, NewUser, Bot } from "@/app/(dashboard)/dashboard/lib/types";
import { loadData } from "@/app/(dashboard)/dashboard/lib/loadData";
import { createUser, deleteUser, updateTokenLimit } from "@/app/(dashboard)/dashboard/lib/userManagement";
import { toggleBotAccess, toggleBot } from "@/app/(dashboard)/dashboard/lib/botManagement";
import { checkUserPermissions } from "@/app/(dashboard)/dashboard/lib/authManagement";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
    selected_bots: []
  });

  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [tenantBots, setTenantBots] = useState<Bot[]>([]);

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
      setUsers(fetchedUsers);
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
      // Buscar todos os bots disponíveis
      const { data: allBots, error: allBotsError } = await supabase
        .from("bots")
        .select("*")
        .order("name");

      if (allBotsError) {
        console.error("Erro ao carregar bots:", allBotsError);
        throw allBotsError;
      }

      // Buscar bots associados ao tenant
      const { data: tenantBotsData, error: tenantBotsError } = await supabase
        .from("tenant_bots")
        .select(`
          bot_id,
          enabled,
          bots (
            id,
            name
          )
        `)
        .eq("tenant_id", tenantId);

      if (tenantBotsError) {
        console.error("Erro ao carregar bots do tenant:", tenantBotsError);
        throw tenantBotsError;
      }

      // Mapear os bots do tenant
      const tenantBotIds = tenantBotsData?.map(tb => tb.bot_id) || [];
      
      // Combinar todos os bots com o status do tenant
      const formattedBots = allBots?.map(bot => ({
        id: bot.id,
        name: bot.name,
        enabled: tenantBotsData?.find(tb => tb.bot_id === bot.id)?.enabled || false,
        isInTenant: tenantBotIds.includes(bot.id)
      })) || [];

      setTenantBots(formattedBots);
      
      // Se estiver criando um novo usuário, selecionar todos os bots do tenant por padrão
      if (newUser.tenant_id === tenantId) {
        setNewUser(prev => ({
          ...prev,
          selected_bots: tenantBotIds
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
      await createUser(newUser);
      setNewUser({
        email: "",
        full_name: "",
        company: "",
        tenant_id: "",
        allow_bot_access: false,
        selected_bots: []
      });
      fetchData();
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
    }
  };

  const handleDeleteUser = async (userId: string, tenantId: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    
    try {
      await deleteUser(userId, tenantId);
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
    }
  };

  const handleToggleBotAccess = async (userId: string, tenantId: string, currentValue: boolean) => {
    try {
      await toggleBotAccess(userId, tenantId, currentValue);
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar acesso:", error);
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

  const handleUpdateTokenLimit = async (userId: string, tenantId: string, newLimit: number) => {
    try {
      await updateTokenLimit(userId, tenantId, newLimit);
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar limite de tokens:", error);
    }
  };

  const handleUpdateUserBots = async (userId: string, tenantId: string, selectedBots: string[]) => {
    try {
      // Primeiro, remover todas as associações existentes
      const { error: deleteError } = await supabase
        .from("tenant_bots")
        .delete()
        .match({ tenant_id: tenantId, user_id: userId });

      if (deleteError) throw deleteError;

      // Depois, criar as novas associações
      if (selectedBots.length > 0) {
        const botInserts = selectedBots.map(botId => ({
          tenant_id: tenantId,
          bot_id: botId,
          enabled: true,
          created_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from("tenant_bots")
          .insert(botInserts);

        if (insertError) throw insertError;
      }

      toast.success("Bots do usuário atualizados com sucesso!");
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar bots do usuário:", error);
      toast.error("Erro ao atualizar bots do usuário");
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Gerenciamento de Usuários Admin</h1>

      {/* Formulário de criação de usuário */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Criar Novo Usuário Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
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
                  setNewUser({ ...newUser, tenant_id: value });
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
            <div className="flex items-center space-x-2">
              <Switch
                id="bot-access"
                checked={newUser.allow_bot_access}
                onCheckedChange={(checked) => setNewUser({ ...newUser, allow_bot_access: checked })}
              />
              <Label htmlFor="bot-access">Permitir acesso aos bots</Label>
            </div>
            {newUser.allow_bot_access && newUser.tenant_id && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Bots Disponíveis no Tenant</CardTitle>
                  <CardDescription>
                    Selecione quais bots este admin terá acesso
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {tenantBots.map((bot) => (
                      <div 
                        key={bot.id} 
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          !bot.isInTenant ? 'bg-muted/50' : 'bg-card'
                        }`}
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
                            disabled={!bot.isInTenant}
                          />
                          <div className="space-y-1">
                            <Label 
                              htmlFor={`bot-${bot.id}`} 
                              className={`text-sm font-medium ${!bot.isInTenant ? 'text-muted-foreground' : ''}`}
                            >
                              {bot.name}
                            </Label>
                            {!bot.isInTenant && (
                              <Badge variant="secondary" className="text-xs">
                                Não disponível no tenant
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Label 
                              htmlFor={`enabled-${bot.id}`} 
                              className="text-sm text-muted-foreground"
                            >
                              {bot.enabled ? "Ativado" : "Desativado"}
                            </Label>
                            <Switch
                              id={`enabled-${bot.id}`}
                              checked={bot.enabled}
                              onCheckedChange={(checked) => handleToggleTenantBot(bot.id, bot.enabled)}
                              disabled={!bot.isInTenant}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            <Button onClick={handleCreateUser}>Criar Usuário</Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuários */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={`${user.user_id}-${user.tenant_id}`}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{user.profiles?.full_name || user.profiles?.email}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteUser(user.user_id, user.tenant_id)}
                >
                  Excluir
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p>{user.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tenant</p>
                  <p>{tenants.find(t => t.id === user.tenant_id)?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Função</p>
                  <p>{user.role}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Consumo de Tokens</p>
                  <p>Total: {user.token_usage?.total_tokens || 0}</p>
                  <p>Último uso: {user.token_usage?.last_used ? new Date(user.token_usage.last_used).toLocaleDateString() : 'Nunca'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Limite de Tokens</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={user.token_limit || 0}
                      onChange={(e) => handleUpdateTokenLimit(user.user_id, user.tenant_id, parseInt(e.target.value))}
                      className="w-32"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateTokenLimit(user.user_id, user.tenant_id, user.token_limit || 0)}
                    >
                      Atualizar
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`bot-access-${user.user_id}`}
                    checked={user.allow_bot_access}
                    onCheckedChange={() => handleToggleBotAccess(user.user_id, user.tenant_id, user.allow_bot_access)}
                  />
                  <Label htmlFor={`bot-access-${user.user_id}`}>Acesso aos bots</Label>
                </div>

                {/* Lista de bots associados */}
                {user.bots && user.bots.length > 0 && (
                  <Card className="mt-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Bots Associados</CardTitle>
                      <CardDescription>
                        Gerencie os bots disponíveis para este admin
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {user.bots.map((bot) => (
                          <div 
                            key={bot.id} 
                            className="flex items-center justify-between p-3 rounded-lg border bg-card"
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`user-bot-${user.user_id}-${bot.id}`}
                                checked={true}
                                onCheckedChange={(checked) => {
                                  if (!checked) {
                                    const updatedBots = user.bots?.filter(b => b.id !== bot.id) || [];
                                    handleUpdateUserBots(user.user_id, user.tenant_id, updatedBots.map(b => b.id));
                                  }
                                }}
                              />
                              <div className="space-y-1">
                                <Label 
                                  htmlFor={`user-bot-${user.user_id}-${bot.id}`}
                                  className="text-sm font-medium"
                                >
                                  {bot.name}
                                </Label>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {bot.token_usage?.total_tokens || 0} tokens
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Último uso: {bot.token_usage?.last_used ? new Date(bot.token_usage.last_used).toLocaleDateString() : 'Nunca'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <Label 
                                  htmlFor={`enabled-${user.user_id}-${bot.id}`} 
                                  className="text-sm text-muted-foreground"
                                >
                                  {bot.enabled ? "Ativado" : "Desativado"}
                                </Label>
                                <Switch
                                  id={`enabled-${user.user_id}-${bot.id}`}
                                  checked={bot.enabled}
                                  onCheckedChange={() => handleToggleBot(user.user_id, bot.id, bot.enabled)}
                                />
                              </div>
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
    </div>
  );
} 