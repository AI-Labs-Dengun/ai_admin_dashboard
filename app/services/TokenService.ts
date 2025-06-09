import { createClient } from '@supabase/supabase-js';

export interface TokenUsage {
  userId: string;
  tenantId: string;
  botId: string;
  tokensUsed: number;
  actionType: string;
  chatId?: string;
  chatSummary?: string;
  chatContent?: string;
}

export interface TokenLimit {
  limit: number;
  used: number;
  remaining: number;
}

export class TokenService {
  private static instance: TokenService;
  private supabase;

  private constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  public static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * Verifica se o usuário pode usar tokens e retorna informações de limite
   */
  public async checkLimit(userId: string, tenantId: string, botId: string): Promise<TokenLimit> {
    try {
      // Verificar limite do usuário
      const { data: userLimit, error: limitError } = await this.supabase
        .from('user_token_limits')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (limitError) {
        console.error('Erro ao verificar limite de tokens:', limitError);
        throw new Error('Erro ao verificar limite de tokens');
      }

      // Verificar uso atual
      const { data: tokenUsage, error: usageError } = await this.supabase
        .from('token_usage')
        .select('tokens_used')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('bot_id', botId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (usageError) {
        console.error('Erro ao verificar uso de tokens:', usageError);
        throw new Error('Erro ao verificar uso de tokens');
      }

      const totalTokensUsed = tokenUsage.reduce((sum, usage) => sum + usage.tokens_used, 0);
      const limit = userLimit?.token_limit || 0;

      return {
        limit,
        used: totalTokensUsed,
        remaining: limit - totalTokensUsed
      };
    } catch (error) {
      console.error('Erro ao verificar limite de tokens:', error);
      throw error;
    }
  }

  /**
   * Registra o uso de tokens e atualiza o último uso do bot
   */
  public async registerUsage(usage: TokenUsage): Promise<void> {
    try {
      // Verificar limite antes de registrar
      const { limit, used } = await this.checkLimit(
        usage.userId,
        usage.tenantId,
        usage.botId
      );

      if (used + usage.tokensUsed > limit) {
        throw new Error(`Limite de tokens excedido. Limite: ${limit}, Usado: ${used}`);
      }

      // Registrar uso
      const { error } = await this.supabase
        .from('token_usage')
        .insert({
          user_id: usage.userId,
          tenant_id: usage.tenantId,
          bot_id: usage.botId,
          tokens_used: usage.tokensUsed,
          total_tokens: used + usage.tokensUsed,
          action_type: usage.actionType,
          chat_id: usage.chatId,
          chat_summary: usage.chatSummary,
          chat_content: usage.chatContent,
          request_timestamp: new Date().toISOString(),
          response_timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao registrar uso de tokens:', error);
        throw new Error('Erro ao registrar uso de tokens');
      }

      // Atualizar último uso do bot
      await this.supabase
        .from('bot_registrations')
        .update({ last_used: new Date().toISOString() })
        .eq('bot_id', usage.botId)
        .eq('tenant_id', usage.tenantId);
    } catch (error) {
      console.error('Erro ao registrar uso de tokens:', error);
      throw error;
    }
  }

  /**
   * Obtém o histórico de uso de tokens
   */
  public async getHistory(userId: string, tenantId: string, botId: string): Promise<{
    limit: TokenLimit;
    history: Array<{
      tokens_used: number;
      action_type: string;
      created_at: string;
    }>;
  }> {
    try {
      const limit = await this.checkLimit(userId, tenantId, botId);

      const { data: history, error: historyError } = await this.supabase
        .from('token_usage')
        .select('tokens_used, action_type, created_at')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('bot_id', botId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (historyError) {
        console.error('Erro ao obter histórico de tokens:', historyError);
        throw new Error('Erro ao obter histórico de tokens');
      }

      return {
        limit,
        history
      };
    } catch (error) {
      console.error('Erro ao obter histórico de tokens:', error);
      throw error;
    }
  }
} 