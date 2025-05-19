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
import { Textarea } from "@/components/ui/textarea";
import { useSupabase } from "@/app/providers/supabase-provider";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { checkUserPermissions } from "@/app/(dashboard)/dashboard/lib/authManagement";

interface Bot {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [newBot, setNewBot] = useState({ name: "", description: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { supabase } = useSupabase();
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

      if (!permissions.isSuperAdmin && !permissions.hasBotAccess) {
        toast.error('Você não tem permissão para acessar esta página');
        router.push('/dashboard');
        return;
      }

      loadBots();
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      toast.error('Erro ao verificar permissões');
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBots = async () => {
    try {
      const { data, error } = await supabase
        .from("bots")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBots(data || []);
    } catch (error) {
      console.error("Erro ao carregar bots:", error);
      toast.error("Erro ao carregar bots");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBot = async () => {
    if (!isSuperAdmin) {
      toast.error("Apenas super-admins podem criar bots");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("bots")
        .insert([newBot])
        .select();

      if (error) throw error;

      setBots([data[0], ...bots]);
      setNewBot({ name: "", description: "" });
      setIsDialogOpen(false);
      toast.success("Bot criado com sucesso!");
    } catch (error) {
      console.error("Erro ao criar bot:", error);
      toast.error("Erro ao criar bot");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!isSuperAdmin) {
      toast.error("Apenas super-admins podem excluir bots");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este bot?")) return;

    try {
      const { error } = await supabase
        .from("bots")
        .delete()
        .eq("id", botId);

      if (error) throw error;

      setBots(bots.filter((bot) => bot.id !== botId));
      toast.success("Bot excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir bot:", error);
      toast.error("Erro ao excluir bot");
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
        <h1 className="text-3xl font-bold">Gerenciamento de Bots</h1>
        {isSuperAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Criar Novo Bot</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Bot</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo bot abaixo.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome do Bot</Label>
                  <Input
                    id="name"
                    value={newBot.name}
                    onChange={(e) =>
                      setNewBot({ ...newBot, name: e.target.value })
                    }
                    placeholder="Digite o nome do bot"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newBot.description}
                    onChange={(e) =>
                      setNewBot({ ...newBot, description: e.target.value })
                    }
                    placeholder="Digite a descrição do bot"
                  />
                </div>
                <Button onClick={handleCreateBot} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Bot"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {bots.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">Nenhum bot cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <Card key={bot.id}>
              <CardHeader>
                <CardTitle>{bot.name}</CardTitle>
                <CardDescription>{bot.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end space-x-2">
                  {isSuperAdmin && (
                    <>
                      <Button variant="outline">Editar</Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteBot(bot.id)}
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