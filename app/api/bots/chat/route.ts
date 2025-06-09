import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { botMiddleware } from '../middleware';
import { TokenService } from '@/app/services/TokenService';

export async function POST(request: Request) {
  try {
    // Aplicar middleware
    const middlewareResponse = await botMiddleware(request);
    if (middlewareResponse instanceof NextResponse) {
      return middlewareResponse;
    }

    const { data } = await request.json();

    // Obter dados do token do header
    const userId = request.headers.get('x-bot-user-id');
    const tenantId = request.headers.get('x-bot-tenant-id');
    const botId = request.headers.get('x-bot-id');

    if (!userId || !tenantId || !botId) {
      return NextResponse.json(
        { error: 'Dados do usuário não encontrados' },
        { status: 400 }
      );
    }

    // Verificar limite de tokens
    const tokenService = TokenService.getInstance();
    const { limit, used, remaining } = await tokenService.checkLimit(
      userId,
      tenantId,
      botId
    );

    if (remaining <= 0) {
      return NextResponse.json(
        { 
          error: 'Limite de tokens excedido',
          details: {
            limit,
            used,
            remaining
          }
        },
        { status: 403 }
      );
    }

    // Processar mensagem
    const response = await processMessage(data.message);

    // Registrar uso de tokens
    await tokenService.registerUsage({
      userId,
      tenantId,
      botId,
      tokensUsed: response.tokens_used,
      actionType: 'chat',
      chatId: data.chat_id,
      chatSummary: response.summary,
      chatContent: response.content
    });

    return NextResponse.json({
      success: true,
      data: response,
      token_usage: {
        limit,
        used: used + response.tokens_used,
        remaining: remaining - response.tokens_used
      }
    });
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    return NextResponse.json(
      { error: 'Erro ao processar mensagem' },
      { status: 500 }
    );
  }
}

async function processMessage(message: string) {
  // Aqui você implementa a lógica de processamento da mensagem
  // e retorna o número de tokens usados
  return {
    content: 'Resposta do bot',
    summary: 'Resumo da conversa',
    tokens_used: 100 // Exemplo: 100 tokens usados
  };
} 