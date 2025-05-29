import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { generateBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';

export async function POST(request: Request) {
  try {
    // Agora vamos usar a forma correta de obter cookies
    const supabase = createRouteHandlerClient({ 
      cookies, // Passar a função cookies diretamente
    });

    // Verificar autenticação
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      console.error('Erro de autenticação:', authError);
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verificar se é super_admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Erro ao verificar permissões:', profileError);
      return NextResponse.json(
        { error: 'Erro ao verificar permissões' },
        { status: 500 }
      );
    }

    if (!profile?.is_super_admin) {
      return NextResponse.json(
        { error: 'Apenas super_admins podem gerar tokens' },
        { status: 403 }
      );
    }

    // Obter dados do corpo da requisição
    const body = await request.json();
    const { userId, tenantId, botId } = body;

    console.log('Dados recebidos:', { userId, tenantId, botId });

    if (!userId || !tenantId) {
      console.error('Dados inválidos:', body);
      return NextResponse.json(
        { error: 'Dados inválidos: userId e tenantId são obrigatórios' },
        { status: 400 }
      );
    }

    // Adicionar delay para garantir que o usuário está corretamente criado no banco
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verificar se o usuário existe no tenant
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('*')
      .match({ user_id: userId, tenant_id: tenantId })
      .single();

    if (tenantError) {
      console.error('Erro ao verificar usuário no tenant:', tenantError);
      if (tenantError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Usuário não encontrado no tenant. Aguarde alguns segundos e tente novamente.' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Erro ao verificar usuário no tenant' },
        { status: 500 }
      );
    }

    if (!tenantUser) {
      console.error('Usuário não encontrado no tenant');
      return NextResponse.json(
        { error: 'Usuário não encontrado no tenant. Aguarde alguns segundos e tente novamente.' },
        { status: 404 }
      );
    }

    // Verificar se o usuário tem acesso a bots
    if (!tenantUser.allow_bot_access) {
      return NextResponse.json(
        { error: 'Usuário não tem acesso a bots' },
        { status: 403 }
      );
    }

    // Verificar se existem bots habilitados
    const { data: userBots, error: botsError } = await supabase
      .from('user_bots')
      .select('bot_id, enabled')
      .match({ user_id: userId, tenant_id: tenantId });

    if (botsError) {
      console.error('Erro ao verificar bots do usuário:', botsError);
      return NextResponse.json(
        { error: 'Erro ao verificar bots do usuário' },
        { status: 500 }
      );
    }

    const hasEnabledBots = userBots?.some(bot => bot.enabled);
    if (!hasEnabledBots) {
      return NextResponse.json(
        { error: 'Nenhum bot habilitado para o usuário' },
        { status: 400 }
      );
    }

    // Gerar token
    try {
      const token = await generateBotToken(userId, tenantId, botId);
      if (!token) {
        throw new Error('Falha ao gerar token');
      }
      return NextResponse.json({ token });
    } catch (tokenError) {
      console.error('Erro ao gerar token:', tokenError);
      return NextResponse.json(
        { error: tokenError instanceof Error ? tokenError.message : 'Erro ao gerar token' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao gerar token' },
      { status: 500 }
    );
  }
} 