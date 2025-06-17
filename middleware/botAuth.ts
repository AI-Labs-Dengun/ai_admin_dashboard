import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function botAuthMiddleware(request: NextRequest) {
  try {
    // Verificar se é uma requisição para a API de bots
    if (!request.nextUrl.pathname.startsWith('/api/bots')) {
      return NextResponse.next();
    }

    // Obter o botId do header Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'BotId não fornecido' },
        { status: 401 }
      );
    }

    const botId = authHeader.split(' ')[1];

    // Verificar se o bot existe
    const { data: bot, error } = await supabase
      .from('bots')
      .select('id, name')
      .eq('id', botId)
      .single();

    if (error || !bot) {
      return NextResponse.json(
        { error: 'Bot não encontrado' },
        { status: 401 }
      );
    }

    // Adicionar informações do bot ao request
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-bot-id', bot.id);
    requestHeaders.set('x-bot-name', bot.name);

    // Continuar com a requisição
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Erro na autenticação do bot:', error);
    return NextResponse.json(
      { error: 'Erro na autenticação' },
      { status: 500 }
    );
  }
} 