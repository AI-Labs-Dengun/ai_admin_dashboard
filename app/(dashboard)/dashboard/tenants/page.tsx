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

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [bots, setBots] = useState([]);
  const [newTenant, setNewTenant] = useState({ name: "", selectedBots: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tenantsResponse, botsResponse] = await Promise.all([
        supabase
          .from("tenants")
          .select(`
            *,
            tenant_bots (
              bot_id,
              enabled
            )
          `)
          .order("created_at", { ascending: false }),
        supabase.from("bots").select("*").order("name"),
      ]);

      if (tenantsResponse.error) throw tenantsResponse.error;
      if (botsResponse.error) throw botsResponse.error;

      setTenants(tenantsResponse.data || []);
      setBots(botsResponse.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
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

  const handleDeleteTenant = async (tenantId) => {
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
                      <SelectItem key={bot.id} value={bot.id}>
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
                  <Button variant="outline">Editar</Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteTenant(tenant.id)}
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