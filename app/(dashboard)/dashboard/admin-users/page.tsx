"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { TenantUser, Tenant, NewUser } from "@/app/(dashboard)/dashboard/lib/types";
import { loadData } from "@/app/(dashboard)/dashboard/lib/loadData";
import { createUser, deleteUser, updateTokenLimit } from "@/app/(dashboard)/dashboard/lib/userManagement";
import { toggleBotAccess, toggleBot } from "@/app/(dashboard)/dashboard/lib/botManagement";
import { checkUserPermissions } from "@/app/(dashboard)/dashboard/lib/authManagement";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState<NewUser>({
    email: "",
    tenant_id: "",
    allow_bot_access: false,
  });

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
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      await createUser(newUser);
      setNewUser({
        email: "",
        tenant_id: "",
        allow_bot_access: false,
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

  const handleUpdateTokenLimit = async (userId: string, tenantId: string, newLimit: number) => {
    try {
      await updateTokenLimit(userId, tenantId, newLimit);
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar limite de tokens:", error);
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
              <Label htmlFor="tenant">Tenant</Label>
              <Select
                value={newUser.tenant_id}
                onValueChange={(value) => setNewUser({ ...newUser, tenant_id: value })}
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
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Bots Associados</p>
                    <div className="space-y-2">
                      {user.bots.map((bot) => (
                        <div key={bot.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{bot.name}</p>
                            <p className="text-sm text-gray-500">
                              Tokens: {bot.token_usage?.total_tokens || 0}
                            </p>
                          </div>
                          <Switch
                            checked={bot.enabled}
                            onCheckedChange={() => handleToggleBot(user.user_id, bot.id, bot.enabled)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 