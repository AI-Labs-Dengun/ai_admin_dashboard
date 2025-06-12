import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function botMiddleware(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Obter dados do token do header
    const userId = request.headers.get('x-bot-user-id');
    const tenantId = request.headers.get('x-bot-tenant-id');
    const botId = request.headers.get('x-bot-id');
    const token = request.headers.get('x-bot-token');

    if (!userId || !tenantId || !botId || !token) {
      return NextResponse.json(
        { error: 'Headers obrigatórios não fornecidos' },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem acesso ao tenant
    const { data: userTenant, error: userTenantError } = await supabase
      .from('user_tenants')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (userTenantError || !userTenant) {
      return NextResponse.json(
        { error: 'Usuário não tem acesso a este tenant' },
        { status: 403 }
      );
    }

    // Verificar se o bot está ativo para o tenant
    const { data: botRegistration, error: botError } = await supabase
      .from('bot_registrations')
      .select('*')
      .eq('bot_id', botId)
      .eq('tenant_id', tenantId)
      .single();

    if (botError || !botRegistration || botRegistration.status !== 'active') {
      return NextResponse.json(
        { error: 'Bot não está ativo para este tenant' },
        { status: 403 }
      );
    }

    // Middleware passou - retornar null para continuar processamento
    return null;
  } catch (error) {
    console.error('Erro no middleware:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 