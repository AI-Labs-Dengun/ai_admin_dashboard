import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    console.log('📤 Enviando mensagem para o bot externo');
    const supabase = createRouteHandlerClient({ cookies });

    // Verificar autenticação
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      console.error('❌ Erro de autenticação:', authError);
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Obter dados da requisição
    const body = await request.json();
    const { botId, tenantId, message } = body;

    if (!botId || !tenantId || !message) {
      console.error('❌ Dados inválidos:', body);
      return NextResponse.json(
        { error: 'Dados inválidos: botId, tenantId e message são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar informações do bot
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      console.error('❌ Erro ao buscar bot:', botError);
      return NextResponse.json(
        { error: 'Bot não encontrado' },
        { status: 404 }
      );
    }

    if (!bot.website) {
      console.error('❌ Website do bot não configurado');
      return NextResponse.json(
        { error: 'Website do bot não configurado' },
        { status: 400 }
      );
    }

    // Enviar mensagem para o bot externo
    const response = await fetch(`${bot.website}/api/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        message,
        userId: session.user.id,
        tenantId,
        botId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro ao enviar mensagem:', errorData);
      return NextResponse.json(
        { error: 'Erro ao enviar mensagem para o bot' },
        { status: response.status }
      );
    }

    // Registrar mensagem enviada
    const { error: messageError } = await supabase
      .from('bot_messages')
      .insert({
        bot_id: botId,
        tenant_id: tenantId,
        user_id: session.user.id,
        message,
        direction: 'outgoing',
        created_at: new Date().toISOString()
      });

    if (messageError) {
      console.error('❌ Erro ao registrar mensagem:', messageError);
      // Não retornamos erro aqui pois a mensagem já foi enviada
    }

    console.log('✅ Mensagem enviada com sucesso');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erro interno:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao enviar mensagem' },
      { status: 500 }
    );
  }
} 