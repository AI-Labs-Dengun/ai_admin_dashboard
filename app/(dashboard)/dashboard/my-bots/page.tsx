"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bot, Info, Search, ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BotDetailsModal } from "@/app/(dashboard)/dashboard/bots/components/BotDetailsModal";

interface UserBot {
  id: string;
  user_id: string;
  tenant_id: string;
  bot_id: string;
  enabled: boolean;
  created_at: string;
  admin_name: string;
  admin_email: string;
  bot_name: string;
  bot_description: string;
  allow_bot_access: boolean;
  token_limit: number;
  name: string;
  description: string | null;
  bot_capabilities: string[];
  contact_email: string | null;
  website: string | null;
  max_tokens_per_request: number;
}

export default function MyBotsPage() {
  const [userBots, setUserBots] = useState<UserBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [searchType, setSearchType] = useState<"bot" | "tenant">("bot");
  const [accessingBot, setAccessingBot] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<UserBot | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkSuperAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single();

      setIsSuperAdmin(profile?.is_super_admin || false);
      
      if (profile?.is_super_admin) {
        fetchAllBots();
      } else {
        fetchUserBots(user.id);
      }
    };

    checkSuperAdmin();
  }, [supabase, router]);

  const fetchAllBots = async () => {
    try {
      const { data, error } = await supabase
        .from('user_bots_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserBots(data || []);
    } catch (error) {
      console.error('Erro ao carregar bots:', error);
      toast.error('Erro ao carregar bots');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBots = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_bots_details')
        .select('*')
        .eq('user_id', userId)
        .eq('enabled', true)
        .eq('allow_bot_access', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserBots(data || []);
    } catch (error) {
      console.error('Erro ao carregar bots:', error);
      toast.error('Erro ao carregar bots');
    } finally {
      setLoading(false);
    }
  };

  const filteredBots = userBots.filter(bot => {
    const searchLower = searchQuery.toLowerCase();
    if (searchType === "bot") {
      return bot.bot_name.toLowerCase().includes(searchLower) ||
             bot.bot_description.toLowerCase().includes(searchLower);
    } else {
      return bot.admin_name.toLowerCase().includes(searchLower) ||
             bot.admin_email.toLowerCase().includes(searchLower);
    }
  });

  const getTokenUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const handleAccessBot = async (botId: string, tenantId: string) => {
    try {
      console.log('🚀 Iniciando processo de acesso ao bot:', { botId, tenantId });
      setAccessingBot(botId);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ Usuário não autenticado');
        toast.error('Usuário não autenticado');
        return;
      }

      console.log('👤 Usuário autenticado:', user.id);

      // Verificar se o bot está habilitado para o usuário
      const { data: userBot, error: userBotError } = await supabase
        .from('user_bots')
        .select('enabled')
        .match({
          user_id: user.id,
          tenant_id: tenantId,
          bot_id: botId
        })
        .single();

      if (userBotError) {
        console.error('❌ Erro ao verificar acesso ao bot:', userBotError);
        toast.error('Erro ao verificar acesso ao bot');
        return;
      }

      if (!userBot?.enabled) {
        console.error('❌ Bot não está habilitado para o usuário');
        toast.error('Bot não está habilitado para seu usuário');
        return;
      }

      // Verificar se o usuário tem permissão para acessar bots no tenant
      const { data: tenantUser, error: tenantUserError } = await supabase
        .from('tenant_users')
        .select('allow_bot_access')
        .match({
          user_id: user.id,
          tenant_id: tenantId
        })
        .single();

      if (tenantUserError) {
        console.error('❌ Erro ao verificar permissões do usuário:', tenantUserError);
        toast.error('Erro ao verificar permissões');
        return;
      }

      if (!tenantUser?.allow_bot_access) {
        console.error('❌ Usuário não tem permissão para acessar bots');
        toast.error('Você não tem permissão para acessar bots');
        return;
      }

      // Gerar token de acesso usando a nova rota do cliente
      const response = await fetch('/api/bots/client/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId,
          tenantId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Erro ao gerar token:', data.error);
        toast.error(data.error || 'Erro ao gerar token de acesso');
        return;
      }

      console.log('✅ Token gerado com sucesso');

      // Armazenar token e redirecionar
      localStorage.setItem('botToken', data.token);
      localStorage.setItem('currentBotId', botId);
      localStorage.setItem('currentTenantId', tenantId);

      console.log('🔄 Redirecionando para a página do bot...');
      router.push(`/dashboard/bots/${botId}`);
    } catch (error) {
      console.error('❌ Erro ao acessar bot:', error);
      toast.error('Erro ao acessar bot');
    } finally {
      setAccessingBot(null);
    }
  };

  const handleViewDetails = (bot: UserBot) => {
    setSelectedBot({
      ...bot,
      name: bot.bot_name,
      description: bot.bot_description,
      bot_capabilities: [],
      contact_email: bot.admin_email,
      website: null,
      max_tokens_per_request: bot.token_limit
    });
    setIsDetailsModalOpen(true);
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Meus Bots</h1>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Buscar por ${searchType === "bot" ? "nome do bot" : "nome do admin"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Select
            value={searchType}
            onValueChange={(value: "bot" | "tenant") => setSearchType(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de busca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bot">Nome do Bot</SelectItem>
              <SelectItem value="tenant">Nome do Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {filteredBots.map((bot) => (
          <Card key={bot.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">{bot.bot_name}</CardTitle>
                <Badge variant={bot.enabled ? "default" : "secondary"}>
                  {bot.enabled ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {bot.bot_description}
              </p>
              
              <div className="mb-4 p-2 bg-muted rounded-md">
                <p className="text-sm font-medium">Admin:</p>
                <p className="text-sm">{bot.admin_name}</p>
                <p className="text-sm text-muted-foreground">{bot.admin_email}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Limite de Tokens</span>
                  <span>{bot.token_limit}</span>
                </div>
                <Progress 
                  value={getTokenUsagePercentage(0, bot.token_limit)} 
                  className="h-2"
                />
              </div>

              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Criado em: {new Date(bot.created_at).toLocaleDateString('pt-BR')}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleViewDetails(bot)}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleAccessBot(bot.bot_id, bot.tenant_id)}
                    disabled={!bot.enabled || accessingBot === bot.bot_id}
                  >
                    {accessingBot === bot.bot_id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Acessando...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Acessar Bot
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBots.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum bot encontrado</h3>
            <p className="text-sm text-muted-foreground text-center">
              {isSuperAdmin 
                ? "Nenhum bot encontrado com os critérios de busca."
                : "Você ainda não tem acesso a nenhum bot. Entre em contato com o suporte para obter acesso."}
            </p>
          </CardContent>
        </Card>
      )}

      <BotDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        bot={selectedBot}
        onSuccess={() => {}}
      />
    </div>
  );
}   