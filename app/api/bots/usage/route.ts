import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    console.log('📊 Recebendo dados de uso');
    
    // Verificar autenticação do bot
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const botAuth = await verifyBotToken(token);

    if (!botAuth) {
      return NextResponse.json(
        { success: false, error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    const { botId, usage } = await request.json();

    if (!botId || !usage || !Array.isArray(usage)) {
      return NextResponse.json(
        { success: false, error: 'botId e usage (array) são obrigatórios' },
        { status: 400 }
      );
    }

    console.log(`📊 Processando ${usage.length} registros de uso para bot:`, botId);

    // Processar cada registro de uso
    const insertData = [];
    
    for (const usageRecord of usage) {
      const {
        sessionId,
        userId,
        tenantId,
        action,
        tokensUsed,
        timestamp,
        metadata
      } = usageRecord;

      if (!userId || !tenantId || !action || !tokensUsed || !timestamp) {
        console.warn('⚠️ Registro de uso inválido:', usageRecord);
        continue;
      }

      insertData.push({
        bot_id: botId,
        user_id: userId,
        tenant_id: tenantId,
        session_id: sessionId,
        action_type: action,
        tokens_used: tokensUsed,
        metadata: metadata || {},
        created_at: new Date(timestamp).toISOString()
      });
    }

    if (insertData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum registro válido encontrado' },
        { status: 400 }
      );
    }

    // Inserir registros de uso
    const { data: insertResult, error: insertError } = await supabase
      .from('token_usage')
      .insert(insertData)
      .select();

    if (insertError) {
      console.error('❌ Erro ao inserir dados de uso:', insertError);
      return NextResponse.json(
        { success: false, error: 'Erro ao salvar dados de uso' },
        { status: 500 }
      );
    }

    console.log(`✅ ${insertResult.length} registros de uso salvos`);

    // Atualizar estatísticas agregadas
    try {
      await updateUsageStats(botId, insertData);
    } catch (statsError) {
      console.warn('⚠️ Erro ao atualizar estatísticas:', statsError);
    }

    return NextResponse.json({
      success: true,
      processed: insertResult.length,
      message: `${insertResult.length} registros de uso processados`
    });
  } catch (error) {
    console.error('❌ Erro ao processar dados de uso:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

async function updateUsageStats(botId: string, usageData: any[]) {
  // Agregar dados por tenant e dia
  const statsMap = new Map();

  for (const record of usageData) {
    const date = new Date(record.created_at).toISOString().split('T')[0];
    const key = `${record.tenant_id}-${date}`;

    if (!statsMap.has(key)) {
      statsMap.set(key, {
        bot_id: botId,
        tenant_id: record.tenant_id,
        usage_date: date,
        total_tokens: 0,
        total_requests: 0,
        unique_users: new Set()
      });
    }

    const stats = statsMap.get(key);
    stats.total_tokens += record.tokens_used;
    stats.total_requests += 1;
    stats.unique_users.add(record.user_id);
  }

  // Converter para array e inserir/atualizar estatísticas
  const statsToUpsert = Array.from(statsMap.values()).map(stats => ({
    bot_id: stats.bot_id,
    tenant_id: stats.tenant_id,
    usage_date: stats.usage_date,
    total_tokens: stats.total_tokens,
    total_requests: stats.total_requests,
    unique_users: stats.unique_users.size
  }));

  for (const stat of statsToUpsert) {
    await supabase
      .from('usage_stats')
      .upsert(stat, {
        onConflict: 'bot_id,tenant_id,usage_date'
      });
  }
} 