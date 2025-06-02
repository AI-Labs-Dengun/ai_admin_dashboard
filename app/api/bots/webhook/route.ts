import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { verifyBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';

export async function POST(request: Request) {
  try {
    console.log('📥 Recebendo webhook do bot externo');
    
    // Verificar token de autenticação
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Token não fornecido');
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyBotToken(token);

    if (!payload) {
      console.error('❌ Token inválido');
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Obter dados do webhook
    const body = await request.json();
    const { event, data } = body;

    if (!event || !data) {
      console.error('❌ Dados inválidos no webhook');
      return NextResponse.json(
        { error: 'Dados inválidos: event e data são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Registrar o evento do webhook
    const { error: webhookError } = await supabase
      .from('bot_webhooks')
      .insert({
        bot_id: payload.botId,
        tenant_id: payload.tenantId,
        event_type: event,
        event_data: data,
        created_at: new Date().toISOString()
      });

    if (webhookError) {
      console.error('❌ Erro ao registrar webhook:', webhookError);
      return NextResponse.json(
        { error: 'Erro ao registrar webhook' },
        { status: 500 }
      );
    }

    // Processar diferentes tipos de eventos
    switch (event) {
      case 'message':
        // Processar mensagem recebida
        await processMessage(payload, data);
        break;
      case 'status':
        // Processar atualização de status
        await processStatus(payload, data);
        break;
      case 'error':
        // Processar erro reportado
        await processError(payload, data);
        break;
      default:
        console.log('⚠️ Evento não processado:', event);
    }

    console.log('✅ Webhook processado com sucesso');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao processar webhook' },
      { status: 500 }
    );
  }
}

async function processMessage(payload: any, data: any) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Registrar mensagem
  const { error } = await supabase
    .from('bot_messages')
    .insert({
      bot_id: payload.botId,
      tenant_id: payload.tenantId,
      user_id: payload.userId,
      message: data.message,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('❌ Erro ao registrar mensagem:', error);
    throw error;
  }
}

async function processStatus(payload: any, data: any) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Atualizar status do bot
  const { error } = await supabase
    .from('bot_status')
    .upsert({
      bot_id: payload.botId,
      tenant_id: payload.tenantId,
      status: data.status,
      last_updated: new Date().toISOString()
    });

  if (error) {
    console.error('❌ Erro ao atualizar status:', error);
    throw error;
  }
}

async function processError(payload: any, data: any) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Registrar erro
  const { error } = await supabase
    .from('bot_errors')
    .insert({
      bot_id: payload.botId,
      tenant_id: payload.tenantId,
      error_message: data.message,
      error_code: data.code,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('❌ Erro ao registrar erro:', error);
    throw error;
  }
} 