import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    console.log('👤 Validando usuário');
    
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

    const { userId, tenantId, botId } = await request.json();

    if (!userId || !tenantId || !botId) {
      return NextResponse.json(
        { success: false, error: 'userId, tenantId e botId são obrigatórios' },
        { status: 400 }
      );
    }

    console.log('🔍 Validando acesso:', { userId, tenantId, botId });

    // Verificar se o usuário existe no tenant
    const { data: tenantUser, error: tenantUserError } = await supabase
      .from('tenant_users')
      .select('allow_bot_access')
      .match({ user_id: userId, tenant_id: tenantId })
      .single();

    if (tenantUserError || !tenantUser) {
      console.error('❌ Usuário não encontrado no tenant');
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado no tenant' },
        { status: 404 }
      );
    }

    if (!tenantUser.allow_bot_access) {
      console.error('❌ Usuário não tem acesso a bots');
      return NextResponse.json(
        { success: false, error: 'Usuário não tem acesso a bots' },
        { status: 403 }
      );
    }

    // Verificar se o usuário tem acesso ao bot específico
    const { data: userBot, error: userBotError } = await supabase
      .from('user_bots')
      .select('enabled')
      .match({ user_id: userId, tenant_id: tenantId, bot_id: botId })
      .single();

    if (userBotError || !userBot) {
      console.error('❌ Bot não está associado ao usuário');
      return NextResponse.json(
        { success: false, error: 'Bot não está associado ao usuário' },
        { status: 404 }
      );
    }

    if (!userBot.enabled) {
      console.error('❌ Bot não está habilitado para o usuário');
      return NextResponse.json(
        { success: false, error: 'Bot não está habilitado para o usuário' },
        { status: 403 }
      );
    }

    // Verificar se o bot está ativo no tenant
    const { data: tenantBot, error: tenantBotError } = await supabase
      .from('tenant_bots')
      .select('enabled')
      .match({ tenant_id: tenantId, bot_id: botId })
      .single();

    if (tenantBotError || !tenantBot?.enabled) {
      console.error('❌ Bot não está ativo no tenant');
      return NextResponse.json(
        { success: false, error: 'Bot não está ativo no tenant' },
        { status: 403 }
      );
    }

    // Verificar tokens disponíveis
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('token_limit')
      .eq('id', tenantId)
      .single();

    const tokenLimit = tenantData?.token_limit || 1000;

    // Buscar uso atual do usuário
    const { data: usageData, error: usageError } = await supabase
      .from('token_usage')
      .select('tokens_used')
      .match({ user_id: userId, tenant_id: tenantId })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // últimas 24h

    let tokensUsed = 0;
    if (!usageError && usageData) {
      tokensUsed = usageData.reduce((sum, record) => sum + (record.tokens_used || 0), 0);
    }

    const tokensRemaining = Math.max(0, tokenLimit - tokensUsed);

    console.log('✅ Usuário validado:', {
      userId,
      tenantId,
      botId,
      tokensRemaining
    });

    return NextResponse.json({
      success: true,
      data: {
        permissions: ['read', 'write'], // Permissões básicas
        tokenLimit,
        tokensUsed,
        tokensRemaining,
        canUse: tokensRemaining > 0
      }
    });
  } catch (error) {
    console.error('❌ Erro ao validar usuário:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
} 