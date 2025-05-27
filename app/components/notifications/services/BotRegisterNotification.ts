import { SupabaseClient } from '@supabase/supabase-js';
import { BotNotification } from '../types';

export class BotRegisterNotification {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Cria uma notificação para uma solicitação de bot pendente
   */
  async createNotificationFromRequest(request: any): Promise<BotNotification | null> {
    try {
      console.log('[BotRegisterNotification] Verificando notificação para request:', request.id);
      // Verificar se já existe uma notificação para esta solicitação
      const { data: existingNotification, error: checkError } = await this.supabase
        .from('bot_notifications')
        .select('*')
        .eq('notification_data->requestId', request.id)
        .single();

      if (checkError) {
        console.error('[BotRegisterNotification] Erro ao checar notificação existente:', checkError);
      }

      if (existingNotification) {
        console.log('[BotRegisterNotification] Notificação já existe para esta solicitação:', request.id);
        return existingNotification;
      }

      // Criar nova notificação
      const { data: notification, error } = await this.supabase
        .from('bot_notifications')
        .insert([
          {
            bot_id: request.id,
            bot_name: request.bot_name,
            bot_description: request.bot_description,
            notification_data: {
              requestId: request.id,
              type: 'bot_request',
              status: 'pending',
              capabilities: request.bot_capabilities,
              contactEmail: request.contact_email,
              website: request.website
            },
            status: 'pending'
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('[BotRegisterNotification] Erro ao criar notificação:', error);
        return null;
      }

      console.log('[BotRegisterNotification] Notificação criada para request:', request.id);
      return notification;
    } catch (error) {
      console.error('[BotRegisterNotification] Erro ao processar notificação:', error);
      return null;
    }
  }

  /**
   * Processa todas as solicitações pendentes que ainda não possuem notificação
   */
  async processAllPendingRequests(): Promise<void> {
    try {
      console.log('[BotRegisterNotification] Processando solicitações pendentes...');
      // Buscar todas as solicitações pendentes
      const { data: pendingRequests, error } = await this.supabase
        .from('bot_requests')
        .select('*')
        .eq('status', 'pending');

      if (error) throw error;
      if (!pendingRequests) return;

      for (const request of pendingRequests) {
        await this.createNotificationFromRequest(request);
      }
      console.log('[BotRegisterNotification] Processamento de pendentes concluído.');
    } catch (error) {
      console.error('[BotRegisterNotification] Erro ao processar solicitações pendentes:', error);
    }
  }

  /**
   * Atualiza o status da notificação e da solicitação do bot
   */
  async updateNotificationStatus(
    notificationId: string,
    requestId: string,
    action: 'accept' | 'reject'
  ): Promise<boolean> {
    try {
      // Primeiro, atualizar o status da solicitação via API
      const response = await fetch(`/api/bots/request/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: action === 'accept' ? 'approved' : 'rejected',
          message: action === 'accept' ? 'Bot aprovado com sucesso' : 'Bot rejeitado'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar status da solicitação');
      }

      // Depois, atualizar o status da notificação
      const { error: notificationError } = await this.supabase
        .from('bot_notifications')
        .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
        .eq('id', notificationId);

      if (notificationError) throw notificationError;

      return true;
    } catch (error) {
      console.error('[BotRegisterNotification] Erro ao atualizar status:', error);
      return false;
    }
  }

  /**
   * Carrega todas as notificações pendentes
   */
  async loadPendingNotifications(): Promise<BotNotification[]> {
    try {
      const { data, error } = await this.supabase
        .from('bot_notifications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[BotRegisterNotification] Erro ao carregar notificações:', error);
      return [];
    }
  }

  /**
   * Configura os listeners de realtime para novas solicitações
   */
  setupRealtimeListeners(
    onNewRequest: (request: any) => void,
    onNotificationUpdate: () => void
  ) {
    // Listener para novas solicitações (sem filtro)
    const requestsChannel = this.supabase
      .channel('bot_requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bot_requests',
        },
        (payload) => {
          if (payload.new?.status === 'pending') {
            console.log('[BotRegisterNotification] Nova solicitação pending detectada:', payload.new.id);
            onNewRequest(payload.new);
          }
        }
      )
      .subscribe();
    const notificationsChannel = this.supabase
      .channel('bot_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bot_notifications'
        },
        () => {
          onNotificationUpdate();
        }
      )
      .subscribe();
    return () => {
      this.supabase.removeChannel(requestsChannel);
      this.supabase.removeChannel(notificationsChannel);
    };
  }
} 