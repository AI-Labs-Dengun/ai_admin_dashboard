import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { verifyBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params;
    console.log('🔍 Iniciando busca de detalhes do bot:', botId);

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

    // Buscar detalhes do bot através da view user_bots_details
    console.log('🔍 Buscando detalhes do bot:', botId);
    const { data: bot, error: botError } = await supabase
      .from('user_bots_details')
      .select('*')
      .eq('bot_id', botId)
      .single();

    if (botError) {
      console.error('❌ Erro ao buscar bot:', { 
        error: botError, 
        botId 
      });
      return NextResponse.json(
        { error: 'Erro ao buscar detalhes do bot' },
        { status: 500 }
      );
    }

    if (!bot) {
      console.error('❌ Bot não encontrado:', { 
        botId,
        userId: session.user.id 
      });
      return NextResponse.json(
        { error: 'Bot não encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Bot encontrado:', { 
      id: bot.bot_id, 
      name: bot.bot_name 
    });

    // Verificar se o usuário tem acesso ao bot
    console.log('🔍 Verificando acesso do usuário ao bot:', { 
      userId: session.user.id, 
      botId 
    });
    const { data: userBot, error: userBotError } = await supabase
      .from('user_bots')
      .select('enabled')
      .match({
        user_id: session.user.id,
        bot_id: botId
      })
      .single();

    if (userBotError) {
      console.error('❌ Erro ao verificar acesso do usuário:', { 
        error: userBotError, 
        userId: session.user.id, 
        botId 
      });
      return NextResponse.json(
        { error: 'Erro ao verificar acesso ao bot' },
        { status: 500 }
      );
    }

    if (!userBot?.enabled) {
      console.error('❌ Usuário não tem acesso ao bot:', { 
        userId: session.user.id, 
        botId 
      });
      return NextResponse.json(
        { error: 'Acesso não permitido a este bot' },
        { status: 403 }
      );
    }

    console.log('✅ Acesso do usuário validado');

    // Retornar os dados do bot formatados
    return NextResponse.json({
      id: bot.bot_id,
      name: bot.bot_name,
      description: bot.bot_description,
      bot_capabilities: bot.bot_capabilities || [],
      contact_email: bot.admin_email,
      website: bot.bot_website,
      max_tokens_per_request: bot.token_limit,
      created_at: bot.created_at
    });
  } catch (error) {
    console.error('❌ Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar detalhes do bot' },
      { status: 500 }
    );
  }
} 