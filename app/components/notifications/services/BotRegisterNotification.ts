import { SupabaseClient } from '@supabase/supabase-js';
import { BotNotification, BotRequest } from '../types';

export class BotRegisterNotification {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Verifica se o usuário atual é super admin
   */
  private async checkSuperAdmin(): Promise<boolean> {
    try {
      // First check if user is authenticated
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.log('[BotRegisterNotification] Usuário não autenticado');
        return false;
      }

      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('[BotRegisterNotification] Erro ao verificar super_admin:', error);
        return false;
      }

      console.log('[BotRegisterNotification] Status de super_admin:', profile?.is_super_admin);
      return profile?.is_super_admin || false;
    } catch (error) {
      console.error('[BotRegisterNotification] Erro ao verificar super_admin:', error);
      return false;
    }
  }

  /**
   * Carrega todas as solicitações pendentes
   */
  async loadPendingNotifications(): Promise<BotNotification[]> {
    try {
      console.log('[BotRegisterNotification] Iniciando carregamento de solicitações pendentes...');
      
      // Verificar se é super admin
      const isSuperAdmin = await this.checkSuperAdmin();
      if (!isSuperAdmin) {
        console.error('[BotRegisterNotification] Usuário não é super_admin');
        return [];
      }

      // Primeiro, vamos verificar se existem registros na tabela sem filtro
      const { data: allRequests, error: allRequestsError } = await this.supabase
        .from('bot_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (allRequestsError) {
        console.error('[BotRegisterNotification] Erro ao buscar todos os registros:', allRequestsError);
        console.error('[BotRegisterNotification] Detalhes do erro:', {
          code: allRequestsError.code,
          message: allRequestsError.message,
          details: allRequestsError.details
        });
      } else {
        console.log('[BotRegisterNotification] Todos os registros encontrados:', allRequests);
        console.log('[BotRegisterNotification] Número total de registros:', allRequests?.length || 0);
      }

      // Agora vamos buscar as solicitações pendentes com mais detalhes
      const { data: pendingRequests, error } = await this.supabase
        .from('bot_requests')
        .select(`
          id,
          bot_name,
          bot_description,
          bot_capabilities,
          contact_email,
          website,
          max_tokens_per_request,
          status,
          created_at,
          updated_at,
          message
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[BotRegisterNotification] Erro ao carregar solicitações pendentes:', error);
        console.error('[BotRegisterNotification] Detalhes do erro:', {
          code: error.code,
          message: error.message,
          details: error.details
        });
        return [];
      }

      console.log('[BotRegisterNotification] Query executada com sucesso');
      console.log('[BotRegisterNotification] Solicitações pendentes encontradas:', pendingRequests);
      console.log('[BotRegisterNotification] Número de solicitações pendentes:', pendingRequests?.length || 0);

      if (!pendingRequests || pendingRequests.length === 0) {
        console.log('[BotRegisterNotification] Nenhuma solicitação pendente encontrada');
        return [];
      }

      // Converter solicitações para o formato de notificação
      const notifications = pendingRequests.map(request => {
        console.log('[BotRegisterNotification] Convertendo solicitação para notificação:', request);
        return this.convertRequestToNotification(request);
      });

      console.log('[BotRegisterNotification] Notificações convertidas:', notifications);
      console.log('[BotRegisterNotification] Número de notificações:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('[BotRegisterNotification] Erro ao carregar solicitações:', error);
      if (error instanceof Error) {
        console.error('[BotRegisterNotification] Detalhes do erro:', {
          message: error.message,
          stack: error.stack
        });
      }
      return [];
    }
  }

  /**
   * Converte uma solicitação para o formato de notificação
   */
  private convertRequestToNotification(request: BotRequest): BotNotification {
    console.log('[BotRegisterNotification] Iniciando conversão da solicitação:', request);

    if (!request || !request.id) {
      console.error('[BotRegisterNotification] Solicitação inválida:', request);
      throw new Error('Solicitação inválida');
    }

    const notification: BotNotification = {
      id: request.id,
      type: 'bot',
      status: request.status,
      created_at: request.created_at,
      bot_id: request.id,
      request_id: request.id,
      bot_name: request.bot_name,
      bot_description: request.bot_description,
      notification_data: {
        requestId: request.id,
        type: 'bot_request',
        status: request.status,
        capabilities: request.bot_capabilities || [],
        contactEmail: request.contact_email,
        website: request.website,
        max_tokens_per_request: request.max_tokens_per_request || 1000
      }
    };

    console.log('[BotRegisterNotification] Notificação convertida:', notification);
    return notification;
  }

  /**
   * Atualiza o status da solicitação do bot
   */
  async updateNotificationStatus(
    requestId: string,
    action: 'accept' | 'reject'
  ): Promise<boolean> {
    try {
      console.log('[BotRegisterNotification] Iniciando atualização de status:', { requestId, action });

      // Primeiro, buscar a solicitação atual
      const { data: request, error: fetchError } = await this.supabase
        .from('bot_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        console.error('[BotRegisterNotification] Erro ao buscar solicitação:', fetchError);
        throw new Error('Solicitação não encontrada');
      }

      console.log('[BotRegisterNotification] Solicitação encontrada:', request);

      if (action === 'accept') {
        console.log('[BotRegisterNotification] Iniciando processo de aprovação do bot');
        
        // Criar o bot na tabela bots
        const { data: bot, error: botError } = await this.supabase
          .from('bots')
          .insert({
            name: request.bot_name,
            description: request.bot_description,
            bot_capabilities: request.bot_capabilities,
            contact_email: request.contact_email,
            website: request.website,
            max_tokens_per_request: request.max_tokens_per_request
          })
          .select()
          .single();

        if (botError) {
          console.error('[BotRegisterNotification] Erro ao criar bot:', botError);
          throw new Error('Erro ao criar bot');
        }

        console.log('[BotRegisterNotification] Bot criado com sucesso:', bot);

        // Buscar todos os tenants ativos
        const { data: tenants, error: tenantsError } = await this.supabase
          .from('tenants')
          .select('id');

        if (tenantsError) {
          console.error('[BotRegisterNotification] Erro ao buscar tenants:', tenantsError);
          throw new Error('Erro ao buscar tenants');
        }

        console.log('[BotRegisterNotification] Tenants encontrados:', tenants);

        // Criar associações com todos os tenants ativos
        if (tenants && tenants.length > 0) {
          const tenantBotInserts = tenants.map(tenant => ({
            tenant_id: tenant.id,
            bot_id: bot.id,
            enabled: true,
            created_at: new Date().toISOString()
          }));

          console.log('[BotRegisterNotification] Criando associações com tenants:', tenantBotInserts);

          const { error: tenantBotError } = await this.supabase
            .from('tenant_bots')
            .insert(tenantBotInserts);

          if (tenantBotError) {
            console.error('[BotRegisterNotification] Erro ao associar bot aos tenants:', tenantBotError);
            throw new Error('Erro ao associar bot aos tenants');
          }

          console.log('[BotRegisterNotification] Associações com tenants criadas com sucesso');
        }
      }

      // Atualizar status da solicitação
      console.log('[BotRegisterNotification] Atualizando status da solicitação para:', action === 'accept' ? 'approved' : 'rejected');

      const { error: updateError } = await this.supabase
        .from('bot_requests')
        .update({
          status: action === 'accept' ? 'approved' : 'rejected',
          message: action === 'accept' ? 'Bot aprovado com sucesso' : 'Bot rejeitado',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('[BotRegisterNotification] Erro ao atualizar status da solicitação:', updateError);
        throw new Error('Erro ao atualizar status da solicitação');
      }

      console.log('[BotRegisterNotification] Status atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('[BotRegisterNotification] Erro ao atualizar status:', error);
      return false;
    }
  }
} 