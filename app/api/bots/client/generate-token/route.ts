import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { generateBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';

export async function POST(request: Request) {
  try {
    console.log('🔑 Iniciando geração de token para cliente');
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Verificar autenticação
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      console.error('❌ Erro de autenticação:', authError);
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    console.log('👤 Cliente autenticado:', session.user.id);

    // Obter dados do corpo da requisição
    const body = await request.json();
    const { botId, tenantId } = body;

    console.log('📦 Dados recebidos:', { botId, tenantId });

    if (!botId || !tenantId) {
      console.error('❌ Dados inválidos:', body);
      return NextResponse.json(
        { error: 'Dados inválidos: botId e tenantId são obrigatórios' },
        { status: 400 }
      );
    }

    // Primeiro, verificar se o bot existe e está ativo
    const { data: bot, error: botError } = await supabase
      .from('user_bots_details')
      .select('*')
      .eq('bot_id', botId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (botError) {
      console.error('❌ Erro ao buscar bot:', botError);
      return NextResponse.json(
        { error: 'Erro ao buscar detalhes do bot' },
        { status: 500 }
      );
    }

    if (!bot) {
      console.error('❌ Bot não encontrado');
      return NextResponse.json(
        { error: 'Bot não encontrado' },
        { status: 404 }
      );
    }

    if (!bot.bot_website) {
      console.error('❌ Website do bot não configurado');
      return NextResponse.json(
        { error: 'Website do bot não configurado' },
        { status: 400 }
      );
    }

    console.log('✅ Bot encontrado:', bot.bot_name);

    // Verificar se o tenant existe e está ativo através do user_bots_details
    const { data: tenantData, error: tenantError } = await supabase
      .from('user_bots_details')
      .select('tenant_id, tenant_name')
      .eq('tenant_id', tenantId)
      .eq('bot_id', botId)
      .maybeSingle();

    if (tenantError) {
      console.error('❌ Erro ao buscar tenant:', tenantError);
      return NextResponse.json(
        { error: 'Erro ao buscar detalhes do tenant' },
        { status: 500 }
      );
    }

    if (!tenantData) {
      console.error('❌ Tenant não encontrado');
      return NextResponse.json(
        { error: 'Tenant não encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Tenant encontrado:', tenantData.tenant_name);

    // Verificar se o bot está habilitado para o tenant
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
      return NextResponse.json(
        { error: 'Erro ao verificar bot no tenant' },
        { status: 500 }
      );
    }

    if (!tenantBot?.enabled) {
      console.error('❌ Bot não está habilitado para o tenant');
      return NextResponse.json(
        { error: 'Bot não está habilitado para este tenant' },
        { status: 403 }
      );
    }

    console.log('✅ Bot habilitado para o tenant');

    // Verificar se o usuário tem acesso ao bot através da tabela user_bots
    const { data: userBot, error: userBotError } = await supabase
      .from('client_user_bots')
      .select('enabled')
      .match({ 
        user_id: session.user.id, 
        tenant_id: tenantId,
        bot_id: botId
      })
      .maybeSingle();

    if (userBotError) {
      console.error('❌ Erro ao verificar acesso do usuário ao bot:', userBotError);
      return NextResponse.json(
        { error: 'Erro ao verificar acesso ao bot' },
        { status: 500 }
      );
    }

    if (!userBot?.enabled) {
      console.error('❌ Bot não está habilitado para o usuário');
      return NextResponse.json(
        { error: 'Bot não está habilitado para este usuário' },
        { status: 403 }
      );
    }

    console.log('✅ Acesso ao bot validado');

    // Verificar se o usuário tem permissão para acessar bots no tenant
    const { data: tenantUser, error: tenantUserError } = await supabase
      .from('super_tenant_users')
      .select('allow_bot_access')
      .match({ 
        user_id: session.user.id, 
        tenant_id: tenantId 
      })
      .maybeSingle();

    if (tenantUserError) {
      console.error('❌ Erro ao verificar usuário no tenant:', tenantUserError);
      return NextResponse.json(
        { error: 'Erro ao verificar acesso ao tenant' },
        { status: 500 }
      );
    }

    if (!tenantUser?.allow_bot_access) {
      console.error('❌ Usuário não tem permissão para acessar bots');
      return NextResponse.json(
        { error: 'Usuário não tem permissão para acessar bots' },
        { status: 403 }
      );
    }

    console.log('✅ Permissões do usuário validadas');

    // Gerar token
    try {
      const token = await generateBotToken(session.user.id, tenantId, botId);
      if (!token) {
        throw new Error('Falha ao gerar token');
      }

      console.log('✅ Token gerado com sucesso');
      return NextResponse.json({ 
        token,
        website: bot.bot_website,
        botName: bot.bot_name,
        botId: bot.bot_id,
        tenantId: tenantId
      });
    } catch (tokenError) {
      console.error('❌ Erro ao gerar token:', tokenError);
      return NextResponse.json(
        { error: tokenError instanceof Error ? tokenError.message : 'Erro ao gerar token' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Erro interno:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao gerar token' },
      { status: 500 }
    );
  }
} 