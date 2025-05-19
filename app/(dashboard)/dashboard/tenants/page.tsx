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
  const [hoveredBot, setHoveredBot] = useState<Bot | null>(null);
  const [isBotInfoModalOpen, setIsBotInfoModalOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
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
      const [tenantsResponse, botsResponse] = await Promise.all([
        supabase
          .from("tenants")
          .select(`
            *,
            tenant_bots!inner (
              bot_id,
              enabled
            )
          `)
          .order("created_at", { ascending: false }),
        supabase.from("bots").select("*").order("name"),
      ]);

      if (tenantsResponse.error) {
        console.error("Erro ao carregar tenants:", tenantsResponse.error);
        throw new Error(tenantsResponse.error.message);
      }

      if (botsResponse.error) {
        console.error("Erro ao carregar bots:", botsResponse.error);
        throw new Error(botsResponse.error.message);
      }

      if (!tenantsResponse.data || !botsResponse.data) {
        throw new Error("Dados não encontrados");
      }

      setTenants(tenantsResponse.data);
      setBots(botsResponse.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error instanceof Error ? error.message : "Erro desconhecido");
      toast.error("Erro ao carregar dados. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    setIsCreating(true);
    try {
      // Primeiro, criar o tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .insert([{ name: newTenant.name }])
        .select();

      if (tenantError) throw tenantError;

      // Depois, associar os bots selecionados
      const tenantBotInserts = newTenant.selectedBots.map((botId) => ({
        tenant_id: tenantData[0].id,
        bot_id: botId,
        enabled: true,
      }));

      const { error: botError } = await supabase
        .from("tenant_bots")
        .insert(tenantBotInserts);

      if (botError) throw botError;

      // Recarregar os dados para ter a estrutura completa
      await loadData();
      setNewTenant({ name: "", selectedBots: [] });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Erro ao criar tenant:", error);
    } finally {
      setIsCreating(false);
    }
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
                <DialogTitle>Criar Novo Tenant</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo tenant e selecione os bots disponíveis.
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
                  <Select
                    onValueChange={(value) =>
                      setNewTenant({
                        ...newTenant,
                        selectedBots: [...newTenant.selectedBots, value],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione os bots" />
                    </SelectTrigger>
                    <SelectContent>
                      {bots.map((bot) => (
                        <SelectItem 
                          key={bot.id} 
                          value={bot.id}
                          onMouseEnter={() => {
                            setHoveredBot(bot);
                            setIsBotInfoModalOpen(true);
                          }}
                          onMouseLeave={() => {
                            setHoveredBot(null);
                            setIsBotInfoModalOpen(false);
                          }}
                        >
                          {bot.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newTenant.selectedBots.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newTenant.selectedBots.map((botId) => {
                        const bot = bots.find((b) => b.id === botId);
                        return (
                          <Badge
                            key={botId}
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
                            onMouseEnter={() => {
                              if (bot) {
                                setHoveredBot(bot);
                                setIsBotInfoModalOpen(true);
                              }
                            }}
                            onMouseLeave={() => {
                              setHoveredBot(null);
                              setIsBotInfoModalOpen(false);
                            }}
                          >
                            {bot?.name} ×
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
                <Button onClick={handleCreateTenant} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Tenant"
                  )}
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
                      <Button variant="outline">Editar</Button>
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

      <BotInfoModal
        isOpen={isBotInfoModalOpen}
        onClose={() => setIsBotInfoModalOpen(false)}
        bot={hoveredBot}
      />
    </div>
  );
} 