"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface Tenant {
  id: string;
  name: string;
}

interface Profile {
  email: string;
  full_name: string;
}

interface TenantUser {
  user_id: string;
  tenant_id: string;
  role: string;
  allow_bot_access: boolean;
  profiles: Profile;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [newUser, setNewUser] = useState({
    email: "",
    tenant_id: "",
    allow_bot_access: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersResponse, tenantsResponse] = await Promise.all([
        supabase
          .from("tenant_users")
          .select(`
            *,
            profiles (
              email,
              full_name
            )
          `)
          .order("created_at", { ascending: false }),
        supabase.from("tenants").select("*").order("name"),
      ]);

      if (usersResponse.error) throw usersResponse.error;
      if (tenantsResponse.error) throw tenantsResponse.error;

      setUsers(usersResponse.data || []);
      setTenants(tenantsResponse.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    setIsCreating(true);
    try {
      // Primeiro, criar o usuário no auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: "senha_temporaria", // Idealmente, enviar por email
        options: {
          data: {
            role: "admin",
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Usuário não criado");

      // Depois, associar ao tenant
      const { error: tenantError } = await supabase.from("tenant_users").insert([
        {
          tenant_id: newUser.tenant_id,
          user_id: authData.user.id,
          role: "admin",
          allow_bot_access: newUser.allow_bot_access,
        },
      ]);

      if (tenantError) throw tenantError;

      toast.success("Usuário criado com sucesso!");
      await loadData();
      setNewUser({ email: "", tenant_id: "", allow_bot_access: true });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      toast.error("Erro ao criar usuário");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleBotAccess = async (
    userId: string,
    tenantId: string,
    currentValue: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("tenant_users")
        .update({ allow_bot_access: !currentValue })
        .match({ user_id: userId, tenant_id: tenantId });

      if (error) throw error;

      setUsers(
        users.map((user) =>
          user.user_id === userId
            ? { ...user, allow_bot_access: !currentValue }
            : user
        )
      );
      toast.success("Acesso atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar acesso:", error);
      toast.error("Erro ao atualizar acesso");
    }
  };

  const handleDeleteUser = async (userId: string, tenantId: string) => {
    try {
      const { error } = await supabase
        .from("tenant_users")
        .delete()
        .match({ user_id: userId, tenant_id: tenantId });

      if (error) throw error;

      setUsers(users.filter((user) => user.user_id !== userId));
      toast.success("Usuário removido com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      toast.error("Erro ao excluir usuário");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gerenciamento de Usuários Admin</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Criar Novo Admin</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário Admin</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo usuário admin.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  placeholder="Digite o email do usuário"
                />
              </div>
              <div className="grid gap-2">
                <Label>Tenant</Label>
                <Select
                  onValueChange={(value) =>
                    setNewUser({ ...newUser, tenant_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tenant" />
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
                  onCheckedChange={(checked) =>
                    setNewUser({ ...newUser, allow_bot_access: checked })
                  }
                />
                <Label htmlFor="bot-access">Permitir acesso aos bots</Label>
              </div>
              <Button onClick={handleCreateUser} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Admin"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            Nenhum usuário admin cadastrado ainda.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <Card key={user.user_id}>
              <CardHeader>
                <CardTitle>{user.profiles?.email}</CardTitle>
                <CardDescription>
                  Tenant: {tenants.find((t) => t.id === user.tenant_id)?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`bot-access-${user.user_id}`}
                      checked={user.allow_bot_access}
                      onCheckedChange={() =>
                        handleToggleBotAccess(
                          user.user_id,
                          user.tenant_id,
                          user.allow_bot_access
                        )
                      }
                    />
                    <Label htmlFor={`bot-access-${user.user_id}`}>
                      Acesso aos bots
                    </Label>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteUser(user.user_id, user.tenant_id)}
                  >
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 