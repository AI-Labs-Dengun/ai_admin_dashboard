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
  bot_name: string;
  bot_description: string;
  bot_capabilities: string[];
  contact_email: string | null;
  bot_website: string | null;
  max_tokens_per_request: number;
  interactions: number;
  available_interactions: number;
  tokens_used: number;
  total_tokens: number;
  last_used: string | null;
  status: string;
  error_count: number;
  last_error_message: string | null;
  last_error_at: string | null;
  allow_bot_access: boolean;
  name: string;
  description: string;
  token_limit: number;
  admin_name: string;
  admin_email: string;
  website: string | null;
}

interface TenantAdmin {
  tenant_id: string;
  user: {
    email: string;
    full_name: string;
  };
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
      console.log('🔍 Buscando bots do usuário:', userId);
      
      // Primeiro, verificar se o usuário tem permissão no tenant
      const { data: tenantUsers, error: tenantUserError } = await supabase
        .from('super_tenant_users')
        .select('tenant_id, allow_bot_access, interactions_limit')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (tenantUserError) {
        console.error('❌ Erro ao verificar permissões do tenant:', tenantUserError);
        if (tenantUserError.code === '406') {
          console.error('❌ Erro de permissão: Usuário não tem acesso à tabela super_tenant_users');
          toast.error('Erro de permissão ao acessar dados do tenant');
        } else {
          toast.error('Erro ao verificar permissões');
        }
        return;
      }

      console.log('📋 Registros de tenant encontrados:', tenantUsers);

      if (!tenantUsers || tenantUsers.length === 0) {
        console.error('❌ Usuário não encontrado em nenhum tenant');
        toast.error('Usuário não encontrado em nenhum tenant');
        return;
      }

      // Filtrar tenants onde o usuário tem permissão de acesso
      const authorizedTenants = tenantUsers.filter(tu => tu.allow_bot_access);
      
      if (authorizedTenants.length === 0) {
        console.error('❌ Usuário não tem permissão para acessar bots em nenhum tenant');
        toast.error('Você não tem permissão para acessar bots');
        return;
      }

      console.log('✅ Tenants autorizados:', authorizedTenants);

      // Buscar todos os registros de uso de bots do usuário
      const { data: botUsages, error: botUsagesError } = await supabase
        .from('client_bot_usage')
        .select(`
          *,
          bot:bot_id (
            name,
            description,
            bot_capabilities,
            contact_email,
            website,
            max_tokens_per_request
          )
        `)
        .eq('user_id', userId)
        .in('tenant_id', authorizedTenants.map(tu => tu.tenant_id))
        .eq('enabled', true);

      if (botUsagesError) {
        console.error('❌ Erro ao buscar uso dos bots:', botUsagesError);
        toast.error('Erro ao buscar uso dos bots');
        return;
      }

      if (!botUsages || botUsages.length === 0) {
        console.log('ℹ️ Nenhum bot encontrado para o usuário');
        setUserBots([]);
        setLoading(false);
        return;
      }

      console.log('✅ Uso dos bots encontrado:', botUsages);

      // Atualizar a URL do bot na tabela client_bot_usage se necessário
      for (const usage of botUsages) {
        if (usage.bot?.website && !usage.website) {
          const { error: updateError } = await supabase
            .from('client_bot_usage')
            .update({ website: usage.bot.website })
            .eq('id', usage.id);

          if (updateError) {
            console.error('❌ Erro ao atualizar URL do bot:', updateError);
          } else {
            console.log('✅ URL do bot atualizada:', usage.bot.website);
          }
        }
      }

      // Mapear os dados para o formato esperado
      const formattedBots = botUsages.map(usage => ({
        id: usage.id,
        user_id: usage.user_id,
        tenant_id: usage.tenant_id,
        bot_id: usage.bot_id,
        enabled: usage.enabled,
        created_at: usage.created_at,
        bot_name: usage.bot_name,
        bot_description: usage.bot?.description || '',
        bot_capabilities: usage.bot?.bot_capabilities || [],
        contact_email: usage.bot?.contact_email,
        bot_website: usage.website || usage.bot?.website,
        max_tokens_per_request: usage.bot?.max_tokens_per_request || 1000,
        interactions: usage.interactions || 0,
        available_interactions: usage.available_interactions || 0,
        tokens_used: usage.tokens_used || 0,
        total_tokens: usage.total_tokens || 0,
        last_used: usage.last_used,
        status: usage.status,
        error_count: usage.error_count || 0,
        last_error_message: usage.last_error_message,
        last_error_at: usage.last_error_at,
        allow_bot_access: true, // Já filtramos por tenants autorizados
        name: usage.bot_name,
        description: usage.bot?.description || '',
        token_limit: usage.available_interactions || 0,
        admin_name: '', // Será preenchido depois
        admin_email: '', // Será preenchido depois
        website: usage.website || usage.bot?.website || null
      }));

      // Buscar informações dos admins dos tenants
      const { data: tenantAdmins, error: tenantAdminsError } = await supabase
        .from('super_tenant_users')
        .select(`
          tenant_id,
          user:user_id (
            email,
            full_name
          )
        `)
        .in('tenant_id', authorizedTenants.map(tu => tu.tenant_id))
        .eq('role', 'admin');

      if (!tenantAdminsError && tenantAdmins) {
        // Mapear informações dos admins para os bots
        formattedBots.forEach(bot => {
          const admin = tenantAdmins.find(ta => ta.tenant_id === bot.tenant_id);
          if (admin?.user && typeof admin.user === 'object' && !Array.isArray(admin.user)) {
            bot.admin_name = (admin.user as { full_name: string }).full_name || '';
            bot.admin_email = (admin.user as { email: string }).email || '';
          }
        });
      }

      console.log('✅ Bots formatados:', formattedBots);
      setUserBots(formattedBots);
      
      // Buscar uso de tokens após carregar os bots
      await fetchTokenUsage(userId);
    } catch (error) {
      console.error('❌ Erro ao carregar bots:', error);
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

      console.log('✅ Sessão obtida com sucesso:', { userId: session.user.id });

      // Verificar se o usuário tem permissão de acesso ao bot e interações disponíveis
      const { data: usage, error: usageError } = await supabase
        .from('client_bot_usage')
        .select(`
          enabled, 
          interactions, 
          available_interactions,
          website,
          bot_name,
          bot_id,
          bot:bot_id (
            website
          )
        `)
        .eq('user_id', session.user.id)
        .eq('tenant_id', tenantId)
        .eq('bot_id', botId)
        .maybeSingle();

      console.log('🔍 Dados de uso do bot:', {
        usage,
        error: usageError,
        queryParams: {
          userId: session.user.id,
          tenantId,
          botId
        }
      });

      if (usageError) {
        console.error('❌ Erro ao buscar permissão de acesso ao bot:', usageError);
        toast.error('Erro ao verificar permissão de acesso ao bot');
        return;
      }

      if (!usage) {
        console.error('❌ Nenhum registro de uso encontrado para o bot');
        toast.error('Registro de uso do bot não encontrado.');
        return;
      }

      if (!usage.enabled) {
        console.error('❌ Bot desativado para este usuário');
        toast.error('Este bot está desativado para seu usuário.');
        return;
      }

      if ((usage.interactions || 0) >= (usage.available_interactions || 0)) {
        console.error('❌ Limite de interações atingido:', {
          interactions: usage.interactions,
          available: usage.available_interactions
        });
        toast.error('Você atingiu o limite de interações para este bot.');
        return;
      }

      // Usar o website do bot ou do client_bot_usage
      const botWebsite = usage.website || usage.bot?.[0]?.website;

      if (!botWebsite) {
        console.error('❌ URL do bot não configurada:', {
          botId: usage.bot_id,
          botName: usage.bot_name,
          usageWebsite: usage.website,
          botWebsite: usage.bot?.[0]?.website
        });
        toast.error('URL do bot não configurada.');
        return;
      }

      console.log('✅ Redirecionando para URL do bot:', botWebsite);
      // Redirecionar para a URL do bot
      window.location.href = botWebsite;
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
      website: bot.bot_website || null,
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