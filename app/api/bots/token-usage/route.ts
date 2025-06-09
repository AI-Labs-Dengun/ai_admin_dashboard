import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { botMiddleware } from '../middleware';

export async function POST(request: Request) {
  try {
    // Aplicar middleware
    const middlewareResponse = await botMiddleware(request as any);
    if (middlewareResponse instanceof NextResponse) {
      return middlewareResponse;
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { data } = await request.json();

    // Obter dados do token do header
    const userId = request.headers.get('x-bot-user-id');
    const tenantId = request.headers.get('x-bot-tenant-id');
    const botId = request.headers.get('x-bot-id');

    // Validar dados recebidos
    if (!data.tokens_used || !data.action_type) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    // Registrar uso de tokens
    const { data: tokenUsage, error } = await supabase
      .from('token_usage')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        bot_id: botId,
        tokens_used: data.tokens_used,
        total_tokens: data.total_tokens || data.tokens_used,
        action_type: data.action_type,
        chat_id: data.chat_id,
        chat_summary: data.chat_summary,
        chat_content: data.chat_content,
        request_timestamp: data.request_timestamp || new Date().toISOString(),
        response_timestamp: data.response_timestamp || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar uso de tokens:', error);
      return NextResponse.json(
        { error: 'Erro ao registrar uso de tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: tokenUsage });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 