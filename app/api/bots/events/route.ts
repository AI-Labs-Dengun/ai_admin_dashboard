import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data } = await request.json();

    // Obter botId do header
    const botId = request.headers.get('x-bot-id');
    if (!botId) {
      return NextResponse.json(
        { error: 'Bot não autenticado' },
        { status: 401 }
      );
    }

    // Validar dados recebidos
    if (!data.type || !data.event_data) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    // Registrar evento
    const { data: event, error: eventError } = await supabase
      .from('bot_webhooks')
      .insert({
        bot_id: botId,
        event_type: data.type,
        event_data: data.event_data,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (eventError) {
      console.error('Erro ao registrar evento do bot:', eventError);
      return NextResponse.json(
        { error: 'Erro ao registrar evento do bot' },
        { status: 500 }
      );
    }

    // Se for uma mensagem, registrar também na tabela de mensagens
    if (data.type === 'message' && data.message) {
      const { error: messageError } = await supabase
        .from('bot_messages')
        .insert({
          bot_id: botId,
          message: data.message,
          direction: data.direction || 'outgoing',
          created_at: new Date().toISOString()
        });

      if (messageError) {
        console.error('Erro ao registrar mensagem do bot:', messageError);
        // Não retornamos erro aqui para não afetar o registro do evento
      }
    }

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 