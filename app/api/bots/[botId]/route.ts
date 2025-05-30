import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { verifyBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';

export async function GET(
  request: Request,
  { params }: { params: { botId: string } }
) {
  try {
    console.log('🔍 Iniciando busca de detalhes do bot:', params.botId);

    const supabase = createRouteHandlerClient({ cookies });

    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ Usuário não autenticado');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    console.log('👤 Usuário autenticado:', session.user.id);

    // Buscar detalhes do bot
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', params.botId)
      .single();

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

    console.log('✅ Bot encontrado com sucesso');

    // Verificar se o usuário tem acesso ao bot
    const { data: userBot, error: userBotError } = await supabase
      .from('user_bots')
      .select('enabled')
      .match({
        user_id: session.user.id,
        bot_id: params.botId
      })
      .single();

    if (userBotError) {
      console.error('❌ Erro ao verificar acesso do usuário:', userBotError);
      return NextResponse.json(
        { error: 'Erro ao verificar acesso ao bot' },
        { status: 500 }
      );
    }

    if (!userBot?.enabled) {
      console.error('❌ Usuário não tem acesso ao bot');
      return NextResponse.json(
        { error: 'Acesso não permitido a este bot' },
        { status: 403 }
      );
    }

    console.log('✅ Acesso do usuário validado');

    return NextResponse.json(bot);
  } catch (error) {
    console.error('❌ Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar detalhes do bot' },
      { status: 500 }
    );
  }
} 