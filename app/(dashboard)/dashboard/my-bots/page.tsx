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
  bot_website: string | null;
  max_tokens_per_request: number;
  bots?: {
    website: string | null;
  };
  current_interactions?: number;
}

interface BotDetails {
  id: string;
  name: string;
  description: string | null;
  bot_capabilities: string[];
  contact_email: string | null;
  website: string | null;
  max_tokens_per_request: number;
  created_at: string;
}

export default function MyBotsPage() {
  const [userBots, setUserBots] = useState<UserBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [searchType, setSearchType] = useState<"bot" | "tenant">("bot");
  const [accessingBot, setAccessingBot] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<BotDetails | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [tokenUsageData, setTokenUsageData] = useState<Record<string, number>>({});
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Erro ao obter sessão:', sessionError);
          router.push('/auth/signin');
          return;
        }

        if (!session) {
          console.log('❌ Nenhuma sessão encontrada');
          router.push('/auth/signin');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('❌ Erro ao buscar perfil:', profileError);
          toast.error('Erro ao carregar perfil');
          return;
        }

        setIsSuperAdmin(profile?.is_super_admin || false);
        
        if (profile?.is_super_admin) {
          await fetchAllBots();
        } else {
          await fetchUserBots(session.user.id);
        }
      } catch (error) {
        console.error('❌ Erro ao verificar super admin:', error);
        toast.error('Erro ao verificar permissões');
        router.push('/auth/signin');
      }
    };

    checkSuperAdmin();
  }, [supabase, router]);

  const fetchAllBots = async () => {
    try {
      const { data, error } = await supabase
        .from('user_bots_details')
        .select(`
          *,
          bots:bot_id (
            website
          )
        `)
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

  const fetchTokenUsage = async (userId: string) => {
    try {
      console.log('🔍 Buscando interações para usuário:', userId);
      
      const { data: botUsage, error } = await supabase
        .from('client_bot_usage')
        .select('bot_id, interactions')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Erro ao buscar interações:', error);
        return;
      }

      const usageMap: Record<string, number> = {};
      botUsage?.forEach(usage => {
        usageMap[usage.bot_id] = usage.interactions || 0;
      });

      console.log('✅ Interações carregadas:', usageMap);
      setTokenUsageData(usageMap);
    } catch (error) {
      console.error('❌ Erro ao carregar interações:', error);
    }
  };

  const fetchUserBots = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_bots_details')
        .select(`
          *,
          bots:bot_id (
            website
          )
        `)
        .eq('user_id', userId)
        .eq('enabled', true)
        .eq('allow_bot_access', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserBots(data || []);
      
      // Buscar uso de tokens após carregar os bots
      await fetchTokenUsage(userId);
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

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Erro ao obter sessão:', sessionError);
        toast.error('Erro de autenticação');
        return;
      }

      if (!session) {
        console.error('❌ Nenhuma sessão encontrada');
        toast.error('Usuário não autenticado');
        router.push('/auth/signin');
        return;
      }

      console.log('👤 Usuário autenticado:', session.user.id);

      // Primeiro, verificar se o bot existe em user_bots_details
      console.log('🔍 Verificando bot em user_bots_details:', { botId, tenantId });
      const { data: userBotDetails, error: userBotDetailsError } = await supabase
        .from('user_bots_details')
        .select('*')
        .eq('bot_id', botId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (userBotDetailsError) {
        console.error('❌ Erro ao verificar user_bots_details:', userBotDetailsError);
        toast.error('Erro ao verificar detalhes do bot');
        return;
      }

      if (!userBotDetails) {
        console.error('❌ Bot não encontrado em user_bots_details:', { botId, tenantId });
        toast.error('Bot não encontrado');
        return;
      }

      console.log('✅ Bot encontrado em user_bots_details:', userBotDetails);

      // Verificar se o bot está habilitado para o tenant
      console.log('🔍 Verificando status do bot no tenant:', { botId, tenantId });
      const { data: tenantBot, error: tenantBotError } = await supabase
        .from('super_tenant_bots')
        .select('enabled')
        .match({
          tenant_id: tenantId,
          bot_id: botId
        })
        .maybeSingle();

      if (tenantBotError) {
        console.error('❌ Erro ao verificar bot no tenant:', tenantBotError);
        toast.error('Erro ao verificar bot no tenant');
        return;
      }

      if (!tenantBot?.enabled) {
        console.error('❌ Bot não está habilitado para o tenant:', { botId, tenantId });
        toast.error('Bot não está habilitado para este tenant');
        return;
      }

      console.log('✅ Bot habilitado para o tenant');

      // Verificar se o bot está habilitado para o usuário
      console.log('🔍 Verificando acesso do usuário ao bot:', { 
        userId: session.user.id, 
        botId, 
        tenantId 
      });
      const { data: userBot, error: userBotError } = await supabase
        .from('client_bot_usage')
        .select('enabled')
        .match({
          user_id: session.user.id,
          tenant_id: tenantId,
          bot_id: botId
        })
        .maybeSingle();

      if (userBotError) {
        console.error('❌ Erro ao verificar acesso ao bot:', userBotError);
        toast.error('Erro ao verificar acesso ao bot');
        return;
      }

      if (!userBot?.enabled) {
        console.error('❌ Bot não está habilitado para o usuário:', { 
          userId: session.user.id, 
          botId, 
          tenantId 
        });
        toast.error('Bot não está habilitado para seu usuário');
        return;
      }

      console.log('✅ Acesso ao bot validado');

      // Verificar se o usuário tem permissão para acessar bots no tenant
      console.log('🔍 Verificando permissões do usuário no tenant:', { 
        userId: session.user.id, 
        tenantId 
      });
      const { data: tenantUser, error: tenantUserError } = await supabase
        .from('super_tenant_users')
        .select('allow_bot_access')
        .match({
          user_id: session.user.id,
          tenant_id: tenantId
        })
        .single();

      if (tenantUserError) {
        console.error('❌ Erro ao verificar permissões do usuário:', tenantUserError);
        toast.error('Erro ao verificar permissões');
        return;
      }

      if (!tenantUser?.allow_bot_access) {
        console.error('❌ Usuário não tem permissão para acessar bots:', { 
          userId: session.user.id, 
          tenantId 
        });
        toast.error('Você não tem permissão para acessar bots');
        return;
      }

      console.log('✅ Permissões validadas');

      // Gerar token de acesso
      console.log('🔑 Gerando token de acesso:', { botId, tenantId });
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
        console.error('❌ Erro ao gerar token:', { 
          status: response.status, 
          error: data.error 
        });
        toast.error(data.error || 'Erro ao gerar token de acesso');
        return;
      }

      console.log('✅ Token gerado com sucesso');

      // Redirecionar para a rota do proxy
      const proxyUrl = `/proxy/${botId}?token=${data.token}`;
      console.log('🔄 Redirecionando para:', proxyUrl);
      router.push(proxyUrl);
    } catch (error) {
      console.error('❌ Erro ao acessar bot:', error);
      toast.error('Erro ao acessar bot');
    } finally {
      setAccessingBot(null);
    }
  };

  const handleTestTokens = async (botId: string, tenantId: string) => {
    try {
      console.log('🧪 Testando sistema de interações:', { botId, tenantId });
      setAccessingBot(botId);

      const response = await fetch('/api/test-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId,
          tenantId,
          interactionsToTest: 1
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Erro no teste:', data.error);
        toast.error(data.error || 'Erro ao testar interações');
        return;
      }

      console.log('✅ Teste de interações bem-sucedido:', data);
      toast.success(`Interação testada com sucesso!`);
      
      // Mostrar detalhes do teste
      console.log('📊 Detalhes do teste:', {
        antes: data.balanceBefore,
        depois: data.balanceAfter,
        diferença: data.balanceBefore.interactions - data.balanceAfter.interactions
      });

      // Recarregar dados de uso para mostrar atualização
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await fetchTokenUsage(session.user.id);
      }

    } catch (error) {
      console.error('❌ Erro ao testar interações:', error);
      toast.error('Erro ao testar sistema de interações');
    } finally {
      setAccessingBot(null);
    }
  };

  const handleViewDetails = (bot: UserBot) => {
    setSelectedBot({
      id: bot.bot_id,
      name: bot.bot_name,
      description: bot.bot_description,
      bot_capabilities: bot.bot_capabilities || [],
      contact_email: bot.admin_email,
      website: bot.bot_website || bot.bots?.website || null,
      max_tokens_per_request: bot.token_limit,
      created_at: bot.created_at
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
                  <span>Interações</span>
                  <span>{tokenUsageData[bot.bot_id] || 0} / {bot.token_limit}</span>
                </div>
                <Progress 
                  value={getTokenUsagePercentage(tokenUsageData[bot.bot_id] || 0, bot.token_limit)} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  Restam: {bot.token_limit - (tokenUsageData[bot.bot_id] || 0)} interações
                </div>
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
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestTokens(bot.bot_id, bot.tenant_id)}
                    disabled={!bot.enabled || accessingBot === bot.bot_id}
                    title="Testar sistema de interações"
                  >
                    {accessingBot === bot.bot_id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testando...
                      </>
                    ) : (
                      <>
                        🧪 Teste
                      </>
                    )}
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