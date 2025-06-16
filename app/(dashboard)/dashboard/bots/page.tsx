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
import { BotDetailsModal } from "./components/BotDetailsModal";
import { CreateBotModal } from "./components/CreateBotModal";
import { DeleteBotModal } from "./components/DeleteBotModal";

interface Bot {
  id: string;
  name: string;
  description: string | null;
  bot_capabilities: string[];
  contact_email: string | null;
  website: string | null;
  max_tokens_per_request: number;
  created_at: string;
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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
        .from("super_bots")
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

  const handleDeleteBot = (bot: Bot) => {
    setSelectedBot(bot);
    setIsDeleteModalOpen(true);
  };

  const handleViewDetails = (bot: Bot) => {
    setSelectedBot(bot);
    setIsDetailsModalOpen(true);
  };

  const handleBotUpdate = () => {
    loadBots();
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
          <Button onClick={() => setIsDialogOpen(true)}>
            Criar Novo Bot
          </Button>
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
                  <Button
                    variant="outline"
                    onClick={() => handleViewDetails(bot)}
                  >
                    Ver Detalhes
                  </Button>
                  {isSuperAdmin && (
                    <>
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteBot(bot)}
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

      <BotDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        bot={selectedBot}
        onSuccess={handleBotUpdate}
      />

      <CreateBotModal
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleBotUpdate}
      />

      <DeleteBotModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedBot(null);
        }}
        bot={selectedBot}
        onSuccess={handleBotUpdate}
      />
    </div>
  );
} 