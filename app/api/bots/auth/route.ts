import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    console.log('🔐 Iniciando autenticação de bot');
    const { botId, botSecret } = await request.json();

    if (!botId || !botSecret) {
      console.error('❌ botId e botSecret são obrigatórios');
      return NextResponse.json(
        { success: false, error: 'botId e botSecret são obrigatórios' },
        { status: 400 }
      );
    }

    console.log('🔍 Verificando bot:', botId);

    // Verificar se o bot existe e o secret está correto
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('id, name, bot_secret')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      console.error('❌ Bot não encontrado:', botError);
      return NextResponse.json(
        { success: false, error: 'Bot não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o secret está correto
    if (bot.bot_secret !== botSecret) {
      console.error('❌ Secret inválido para bot:', botId);
      return NextResponse.json(
        { success: false, error: 'Secret inválido' },
        { status: 401 }
      );
    }

    console.log('✅ Bot autenticado:', bot.name);

    // Gerar token JWT para o bot
    try {
      const token = await generateBotToken(botId, null, botId);
      
      console.log('✅ Token gerado para bot:', botId);
      
      return NextResponse.json({
        success: true,
        token,
        botId: bot.id,
        botName: bot.name
      });
    } catch (tokenError) {
      console.error('❌ Erro ao gerar token:', tokenError);
      return NextResponse.json(
        { success: false, error: 'Erro ao gerar token' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Erro interno na autenticação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
} 