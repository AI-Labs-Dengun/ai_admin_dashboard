import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";
import { checkUserPermissions } from "./authManagement";

export const getTokenUsage = async (userId: string, tenantId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("token_usage")
      .select("*")
      .match({ user_id: userId, tenant_id: tenantId })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Erro ao buscar uso de tokens:", error);
    toast.error("Erro ao buscar uso de tokens");
    throw error;
  }
};

export const getTenantTokenUsage = async (tenantId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("token_usage")
      .select("*")
      .match({ tenant_id: tenantId })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Erro ao buscar uso de tokens do tenant:", error);
    toast.error("Erro ao buscar uso de tokens do tenant");
    throw error;
  }
};

export const getTokenUsageSummary = async (tenantId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("token_usage")
      .select("total_tokens")
      .match({ tenant_id: tenantId })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    return data?.[0]?.total_tokens || 0;
  } catch (error) {
    console.error("Erro ao buscar resumo de tokens:", error);
    toast.error("Erro ao buscar resumo de tokens");
    throw error;
  }
};

export const resetUserTokens = async (userId: string, tenantId: string, botId?: string) => {
  const supabase = createClientComponentClient();
  
  try {
    // Verificar permissões
    const permissions = await checkUserPermissions();
    if (!permissions?.isSuperAdmin) {
      throw new Error("Sem permissão para resetar tokens");
    }

    if (botId) {
      // Resetar tokens de um bot específico
      const { error } = await supabase
        .from("token_usage")
        .update({ total_tokens: 0, updated_at: new Date().toISOString() })
        .match({ user_id: userId, tenant_id: tenantId, bot_id: botId });

      if (error) throw error;
    } else {
      // Resetar todos os tokens do usuário no tenant
      const { error } = await supabase
        .from("token_usage")
        .update({ total_tokens: 0, updated_at: new Date().toISOString() })
        .match({ user_id: userId, tenant_id: tenantId });

      if (error) throw error;
    }

    toast.success("Tokens resetados com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao resetar tokens:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao resetar tokens");
    throw error;
  }
};

export const checkTokenBalance = async (userId: string, tenantId: string, botId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    // Buscar limite de tokens do bot através da view user_bots_details
    const { data: botData, error: botError } = await supabase
      .from('user_bots_details')
      .select('token_limit')
      .match({ 
        bot_id: botId, 
        tenant_id: tenantId,
        user_id: userId
      })
      .single();

    if (botError) throw botError;

    // Buscar uso atual de tokens
    const { data: usageData, error: usageError } = await supabase
      .from('token_usage')
      .select('total_tokens')
      .match({ user_id: userId, tenant_id: tenantId, bot_id: botId })
      .single();

    if (usageError && usageError.code !== 'PGRST116') throw usageError;

    const tokensUsed = usageData?.total_tokens || 0;
    const tokenLimit = botData?.token_limit || 0;
    const remainingTokens = tokenLimit - tokensUsed;

    return {
      hasTokens: remainingTokens > 0,
      remainingTokens,
      totalLimit: tokenLimit,
      usedTokens: tokensUsed
    };
  } catch (error) {
    console.error("Erro ao verificar saldo de tokens:", error);
    toast.error("Erro ao verificar saldo de tokens");
    throw error;
  }
};

export const calculateTokens = (text: string): number => {
  if (!text) return 0;

  // Remover espaços extras e quebras de linha
  const cleanText = text.trim().replace(/\s+/g, ' ');
  
  // Contar palavras (aproximadamente 1.3 tokens por palavra em português)
  const words = cleanText.split(/\s+/).length;
  
  // Contar caracteres especiais e pontuação
  const specialChars = (cleanText.match(/[^\w\s]/g) || []).length;
  
  // Contar números
  const numbers = (cleanText.match(/\d+/g) || []).length;
  
  // Contar caracteres em maiúsculo (tendem a ter mais significado)
  const upperCaseChars = (cleanText.match(/[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ]/g) || []).length;
  
  // Contar emojis e caracteres especiais Unicode
  const emojis = (cleanText.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  
  // Calcular tokens totais com pesos mais precisos
  // - Cada palavra: ~1.3 tokens (base)
  // - Cada caractere especial: 0.5 tokens
  // - Cada número: 0.3 tokens
  // - Cada caractere maiúsculo: 0.2 tokens (bônus)
  // - Cada emoji: 2 tokens (emojis geralmente têm mais significado)
  const totalTokens = Math.ceil(
    (words * 1.3) + 
    (specialChars * 0.5) + 
    (numbers * 0.3) +
    (upperCaseChars * 0.2) +
    (emojis * 2)
  );

  // Garantir um mínimo de tokens para mensagens muito curtas
  const minTokens = Math.max(1, Math.ceil(text.length / 4));
  const finalTokens = Math.max(minTokens, totalTokens);

  console.log('🔢 Cálculo detalhado de tokens:', {
    text: text.substring(0, 100) + '...', // Primeiros 100 caracteres
    words,
    specialChars,
    numbers,
    upperCaseChars,
    emojis,
    totalTokens,
    finalTokens,
    length: text.length
  });

  return finalTokens;
};

export const recordTokenUsage = async (
  userId: string,
  tenantId: string,
  botId: string,
  tokensConsumed: number,
  actionType: string = 'chat'
) => {
  const supabase = createClientComponentClient();
  
  try {
    console.log('📝 Iniciando registro de tokens:', {
      userId,
      tenantId,
      botId,
      tokensConsumed,
      actionType
    });

    // Primeiro, verificar se já existe um registro
    const { data: existingRecord, error: fetchError } = await supabase
      .from('token_usage')
      .select('*')
      .match({ 
        user_id: userId, 
        tenant_id: tenantId, 
        bot_id: botId 
      })
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Erro ao buscar registro existente:', fetchError);
      throw fetchError;
    }

    // Calcular novos valores
    const currentTotalTokens = existingRecord?.total_tokens || 0;
    const newTotalTokens = currentTotalTokens + tokensConsumed;

    console.log('📊 Tokens atuais:', {
      currentTotalTokens,
      newTokens: tokensConsumed,
      newTotalTokens
    });

    // Criar ou atualizar o registro
    const { data: newRecord, error: upsertError } = await supabase
      .from('token_usage')
      .upsert({
        user_id: userId,
        tenant_id: tenantId,
        bot_id: botId,
        total_tokens: newTotalTokens,
        last_used: new Date().toISOString(),
        created_at: existingRecord?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,tenant_id,bot_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (upsertError) {
      console.error('❌ Erro ao atualizar registro de tokens:', upsertError);
      throw upsertError;
    }

    if (!newRecord) {
      console.error('❌ Nenhum registro retornado após upsert');
      throw new Error('Falha ao registrar tokens: nenhum registro retornado');
    }

    console.log('✅ Tokens registrados com sucesso:', {
      previousTokens: currentTotalTokens,
      newTokens: tokensConsumed,
      totalTokens: newTotalTokens,
      record: newRecord
    });

    return {
      previousTokens: currentTotalTokens,
      newTokens: tokensConsumed,
      totalTokens: newTotalTokens,
      record: newRecord
    };
  } catch (error) {
    console.error("❌ Erro ao registrar uso de tokens:", error);
    throw error;
  }
};

// Versões para servidor (para usar nos route handlers)
export const checkTokenBalanceServer = async (userId: string, tenantId: string, botId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    console.log('🔍 Verificando saldo de tokens no servidor:', { userId, tenantId, botId });

    // Buscar limite de tokens do bot através da view user_bots_details
    const { data: botData, error: botError } = await supabase
      .from('user_bots_details')
      .select('token_limit, enabled, allow_bot_access')
      .match({ 
        bot_id: botId, 
        tenant_id: tenantId,
        user_id: userId
      })
      .single();

    if (botError) {
      console.error('❌ Erro ao buscar dados do bot:', botError);
      throw botError;
    }

    if (!botData) {
      console.error('❌ Bot não encontrado');
      throw new Error('Bot não encontrado');
    }

    if (!botData.enabled) {
      console.error('❌ Bot desativado');
      throw new Error('Bot desativado');
    }

    if (!botData.allow_bot_access) {
      console.error('❌ Acesso ao bot não permitido');
      throw new Error('Acesso ao bot não permitido');
    }

    // Buscar uso atual de tokens
    const { data: usageData, error: usageError } = await supabase
      .from('token_usage')
      .select('total_tokens, last_used')
      .match({ user_id: userId, tenant_id: tenantId, bot_id: botId })
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('❌ Erro ao buscar uso de tokens:', usageError);
      throw usageError;
    }

    const tokensUsed = usageData?.total_tokens || 0;
    const tokenLimit = botData?.token_limit || 0;
    const remainingTokens = tokenLimit - tokensUsed;

    console.log('📊 Resultado da verificação de tokens:', {
      tokensUsed,
      tokenLimit,
      remainingTokens,
      hasTokens: remainingTokens > 0,
      lastUsed: usageData?.last_used
    });

    return {
      hasTokens: remainingTokens > 0,
      remainingTokens,
      totalLimit: tokenLimit,
      usedTokens: tokensUsed,
      lastUsed: usageData?.last_used
    };
  } catch (error) {
    console.error("❌ Erro ao verificar saldo de tokens no servidor:", error);
    throw error;
  }
};

export async function recordTokenUsageServer(
  userId: string,
  tenantId: string,
  botId: string,
  tokensConsumed: number,
  actionType: 'chat' | 'summary' | 'image_generation' | 'test' | 'other'
): Promise<any> {
  const maxRetries = 3;
  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount < maxRetries) {
    try {
      console.log(`📝 Tentativa ${retryCount + 1} de registrar tokens no servidor:`, {
        userId,
        tenantId,
        botId,
        tokensConsumed,
        actionType
      });

      const supabase = createClientComponentClient();

      // Buscar registro existente com lock
      const { data: existingRecord, error: fetchError } = await supabase
        .from('token_usage')
        .select('*')
        .match({
          user_id: userId,
          tenant_id: tenantId,
          bot_id: botId
        })
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const currentTotalTokens = existingRecord?.total_tokens || 0;
      const newTotalTokens = currentTotalTokens + tokensConsumed;

      console.log('📊 Calculando tokens:', {
        currentTotalTokens,
        newTokens: tokensConsumed,
        newTotalTokens
      });

      // Se não existe registro, criar novo
      if (!existingRecord) {
        const { data: newRecord, error: insertError } = await supabase
          .from('token_usage')
          .insert({
            user_id: userId,
            tenant_id: tenantId,
            bot_id: botId,
            tokens_used: tokensConsumed,
            total_tokens: newTotalTokens,
            action_type: actionType,
            request_timestamp: new Date().toISOString(),
            response_timestamp: new Date().toISOString(),
            last_used: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        console.log('✅ Novo registro de tokens criado:', newRecord);
        return newRecord;
      }

      // Se existe, atualizar com verificação de concorrência
      const { data: updatedRecord, error: updateError } = await supabase
        .from('token_usage')
        .update({
          tokens_used: tokensConsumed,
          total_tokens: newTotalTokens,
          action_type: actionType,
          response_timestamp: new Date().toISOString(),
          last_used: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .match({
          user_id: userId,
          tenant_id: tenantId,
          bot_id: botId,
          total_tokens: currentTotalTokens // Verificação de concorrência
        })
        .select()
        .single();

      if (updateError) {
        if (updateError.code === 'PGRST116') {
          // Concorrência detectada, tentar novamente
          console.log('⚠️ Concorrência detectada, tentando novamente...');
          retryCount++;
          continue;
        }
        throw updateError;
      }

      if (!updatedRecord) {
        // Se não houve atualização, provavelmente houve concorrência
        console.log('⚠️ Nenhum registro atualizado, tentando novamente...');
        retryCount++;
        continue;
      }

      console.log('✅ Registro de tokens atualizado:', updatedRecord);
      return updatedRecord;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Erro desconhecido');
      console.error(`❌ Erro na tentativa ${retryCount + 1}:`, lastError);
      
      if (retryCount < maxRetries - 1) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      retryCount++;
    }
  }

  console.error('❌ Todas as tentativas falharam');
  throw lastError || new Error('Falha ao registrar uso de tokens após várias tentativas');
} 