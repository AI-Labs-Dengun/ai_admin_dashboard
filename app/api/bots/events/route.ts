import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyBotToken } from '@/app/dashboard/lib/jwtManagement';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { token, data } = await request.json();

    // Validar token do bot
    const tokenData = await verifyBotToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    const { userId, tenantId, botId } = tokenData;

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
        tenant_id: tenantId,
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
          tenant_id: tenantId,
          user_id: userId,
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