import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { userId, tenantId } = await request.json();

    if (!userId || !tenantId) {
      return NextResponse.json(
        { error: 'ID do usuário e tenant são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem permissão para acessar bots
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('allow_bot_access')
      .match({ user_id: userId, tenant_id: tenantId })
      .single();

    if (tenantError || !tenantUser?.allow_bot_access) {
      return NextResponse.json(
        { error: 'Usuário não tem permissão para acessar bots' },
        { status: 403 }
      );
    }

    return NextResponse.json({ 
      success: true,
      userId,
      tenantId,
      allowBotAccess: true
    });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
} 