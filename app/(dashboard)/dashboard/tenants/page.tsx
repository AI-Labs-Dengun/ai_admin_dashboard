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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BotInfoModal } from "../../../components/modals/BotInfoModal";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { checkUserPermissions } from "@/app/(dashboard)/dashboard/lib/authManagement";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface Bot {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface TenantBot {
  bot_id: string;
  enabled: boolean;
}

interface Tenant {
  id: string;
  name: string;
  created_at: string;
  tenant_bots: TenantBot[];
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [newTenant, setNewTenant] = useState({ name: "", selectedBots: [] as string[] });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const permissions = await checkUserPermissions();
      
      if (!permissions) {
        router.push('/auth/signin');
        return;
      }

      setIsSuperAdmin(permissions.isSuperAdmin);

      if (!permissions.isSuperAdmin) {
        toast.error('Você não tem permissão para acessar esta página');
        router.push('/dashboard');
        return;
      }

      loadData();
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      toast.error('Erro ao verificar permissões');
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      // Primeiro, verificar se é super-admin
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError) {
        console.error("Erro ao verificar permissões:", profileError);
        throw new Error(profileError.message);
      }

      if (!profileData?.is_super_admin) {
        toast.error("Apenas super-admins podem acessar esta página");
        router.push('/dashboard');
        return;
      }

      // Carregar os bots primeiro
      const { data: botsData, error: botsError } = await supabase
        .from("bots")
        .select("*")
        .order("name");

      if (botsError) {
        console.error("Erro ao carregar bots:", botsError);
        throw new Error(botsError.message);
      }

      if (!botsData) {
        throw new Error("Dados de bots não encontrados");
      }

      setBots(botsData);

      // Carregar os tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (tenantsError) {
        console.error("Erro ao carregar tenants:", tenantsError);
        throw new Error(tenantsError.message);
      }

      if (!tenantsData || tenantsData.length === 0) {
        setTenants([]);
        return;
      }

      // Carregar os tenant_bots
      const { data: tenantBotsData, error: tenantBotsError } = await supabase
        .from("tenant_bots")
        .select("tenant_id, bot_id, enabled")
        .in("tenant_id", tenantsData.map(t => t.id))
        .order("tenant_id");

      if (tenantBotsError) {
        console.error("Erro ao carregar tenant_bots:", tenantBotsError);
        throw new Error(tenantBotsError.message);
      }

      // Mapear os tenant_bots para cada tenant
      const tenantsWithBots = tenantsData.map(tenant => ({
        ...tenant,
        tenant_bots: tenantBotsData?.filter(tb => tb.tenant_id === tenant.id) || []
      }));

      setTenants(tenantsWithBots);
    } catch (error) {
      console.error("Erro ao carregar dados:", error instanceof Error ? error.message : "Erro desconhecido");
      toast.error("Erro ao carregar dados. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTenant = async (tenant: Tenant) => {
    setEditingTenant(tenant);
    setNewTenant({
      name: tenant.name,
      selectedBots: tenant.tenant_bots.map(tb => tb.bot_id)
    });
    setIsDialogOpen(true);
  };

  const handleCreateOrUpdateTenant = async () => {
    setIsCreating(true);
    try {
      if (editingTenant) {
        // Atualizar tenant existente
        const { error: tenantError } = await supabase
          .from("tenants")
          .update({ name: newTenant.name })
          .eq("id", editingTenant.id);

        if (tenantError) throw tenantError;

        // Remover todas as associações existentes
        const { error: deleteError } = await supabase
          .from("tenant_bots")
          .delete()
          .eq("tenant_id", editingTenant.id);

        if (deleteError) throw deleteError;

        // Criar novas associações
        const tenantBotInserts = newTenant.selectedBots.map((botId) => ({
          tenant_id: editingTenant.id,
          bot_id: botId,
          enabled: true,
        }));

        const { error: botError } = await supabase
          .from("tenant_bots")
          .insert(tenantBotInserts);

        if (botError) throw botError;

        toast.success("Tenant atualizado com sucesso!");
      } else {
        // Criar novo tenant
        const { data: tenantData, error: tenantError } = await supabase
          .from("tenants")
          .insert([{ name: newTenant.name }])
          .select();

        if (tenantError) throw tenantError;

        const tenantBotInserts = newTenant.selectedBots.map((botId) => ({
          tenant_id: tenantData[0].id,
          bot_id: botId,
          enabled: true,
        }));

        const { error: botError } = await supabase
          .from("tenant_bots")
          .insert(tenantBotInserts);

        if (botError) throw botError;

        toast.success("Tenant criado com sucesso!");
      }

      // Recarregar os dados
      await loadData();
      setNewTenant({ name: "", selectedBots: [] });
      setEditingTenant(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Erro ao processar tenant:", error);
      toast.error(editingTenant ? "Erro ao atualizar tenant" : "Erro ao criar tenant");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseDialog = () => {
    setNewTenant({ name: "", selectedBots: [] });
    setEditingTenant(null);
    setIsDialogOpen(false);
  };

  const handleDeleteTenant = async (tenantId: string) => {
    try {
      const { error } = await supabase
        .from("tenants")
        .delete()
        .eq("id", tenantId);

      if (error) throw error;

      setTenants(tenants.filter((tenant) => tenant.id !== tenantId));
    } catch (error) {
      console.error("Erro ao excluir tenant:", error);
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
        <h1 className="text-3xl font-bold">Gerenciamento de Tenants</h1>
        {isSuperAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Criar Novo Tenant</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTenant ? "Editar Tenant" : "Criar Novo Tenant"}</DialogTitle>
                <DialogDescription>
                  {editingTenant 
                    ? "Atualize os dados do tenant e selecione os bots disponíveis."
                    : "Preencha os dados do novo tenant e selecione os bots disponíveis."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome do Tenant</Label>
                  <Input
                    id="name"
                    value={newTenant.name}
                    onChange={(e) =>
                      setNewTenant({ ...newTenant, name: e.target.value })
                    }
                    placeholder="Digite o nome do tenant"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Bots Disponíveis</Label>
                  <div className="relative">
                    <Select
                      onValueChange={(value) => {
                        if (!newTenant.selectedBots.includes(value)) {
                          setNewTenant({
                            ...newTenant,
                            selectedBots: [...newTenant.selectedBots, value],
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione os bots" />
                      </SelectTrigger>
                      <SelectContent>
                        {bots
                          .filter(bot => !newTenant.selectedBots.includes(bot.id))
                          .map((bot) => (
                            <SelectItem 
                              key={bot.id} 
                              value={bot.id}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{bot.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {newTenant.selectedBots.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newTenant.selectedBots.map((botId) => {
                        const bot = bots.find((b) => b.id === botId);
                        return bot ? (
                          <Badge
                            key={`${botId}-${bot.name}`}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() =>
                              setNewTenant({
                                ...newTenant,
                                selectedBots: newTenant.selectedBots.filter(
                                  (id) => id !== botId
                                ),
                              })
                            }
                          >
                            {bot.name} ×
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <Button onClick={handleCreateOrUpdateTenant} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingTenant ? "Atualizando..." : "Criando..."}
                    </>
                  ) : (
                    editingTenant ? "Atualizar Tenant" : "Criar Tenant"
                  )}
                </Button>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {tenants.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">Nenhum tenant cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <Card key={tenant.id}>
              <CardHeader>
                <CardTitle>{tenant.name}</CardTitle>
                <CardDescription>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tenant.tenant_bots?.map((tb) => {
                      const bot = bots.find((b) => b.id === tb.bot_id);
                      return (
                        <Badge
                          key={tb.bot_id}
                          variant={tb.enabled ? "default" : "secondary"}
                        >
                          {bot?.name}
                        </Badge>
                      );
                    })}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end space-x-2">
                  {isSuperAdmin && (
                    <>
                      <Button variant="outline" onClick={() => handleEditTenant(tenant)}>Editar</Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteTenant(tenant.id)}
                      >
                        Excluir
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 