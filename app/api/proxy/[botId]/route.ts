import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { verifyBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';
import { checkTokenBalance, recordTokenUsage, calculateTokens } from '@/app/(dashboard)/dashboard/lib/tokenManagement';

// Função auxiliar para criar o cliente Supabase
const createSupabaseClient = () => {
  const cookieStore = cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
};

// Função auxiliar para processar a requisição
async function processRequest(request: Request, botId: string, token: string) {
  try {
    // Verificar o token
    const payload = await verifyBotToken(token);
    if (!payload) {
      console.error('❌ Token inválido ou expirado');
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    if (!payload.userId || !payload.tenantId) {
      console.error('❌ Payload inválido: userId ou tenantId ausentes');
      return NextResponse.json(
        { error: 'Token inválido: dados incompletos' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseClient();

    // Buscar informações do bot
    const { data: botDetails, error: botError } = await supabase
      .from('user_bots_details')
      .select(`
        bot_id,
        bot_name,
        bot_description,
        bot_website,
        tenant_id,
        user_id,
        enabled,
        allow_bot_access,
        token_limit,
        admin_email,
        admin_name
      `)
      .eq('bot_id', botId)
      .eq('tenant_id', payload.tenantId)
      .eq('user_id', payload.userId)
      .single();

    if (botError || !botDetails) {
      console.error('❌ Erro ao buscar detalhes do bot:', botError);
      return NextResponse.json(
        { error: 'Erro ao buscar detalhes do bot' },
        { status: 500 }
      );
    }

    // Verificar permissões e estado do bot
    if (!botDetails.enabled || !botDetails.allow_bot_access || !botDetails.bot_website) {
      console.error('❌ Bot não disponível:', { 
        enabled: botDetails.enabled,
        allowAccess: botDetails.allow_bot_access,
        hasWebsite: !!botDetails.bot_website
      });
      return NextResponse.json(
        { error: 'Bot não disponível' },
        { status: 403 }
      );
    }

    // Verificar saldo de tokens
    const tokenBalance = await checkTokenBalance(payload.userId, payload.tenantId, botId);
    if (!tokenBalance.hasTokens) {
      console.error('❌ Sem tokens disponíveis:', { 
        used: tokenBalance.usedTokens, 
        limit: tokenBalance.totalLimit 
      });
      return NextResponse.json(
        { error: 'Sem tokens disponíveis' },
        { status: 403 }
      );
    }

    // Obter o corpo da requisição
    const requestText = request.method !== 'GET' ? await request.text() : '';
    
    // Fazer a requisição para o bot
    const response = await fetch(`${botDetails.bot_website}${request.url.split('/proxy')[1]}`, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),
        'Authorization': `Bearer ${token}`,
        'X-Internal-Token': token,
        'X-Bot-Name': botDetails.bot_name,
        'X-Admin-Email': botDetails.admin_email,
        'Origin': request.headers.get('origin') || 'http://localhost:3000',
        'Referer': request.headers.get('referer') || 'http://localhost:3000'
      },
      body: requestText || undefined
    });

    // Calcular tokens consumidos
    const responseText = await response.text();
    const requestTokens = calculateTokens(requestText);
    const responseTokens = calculateTokens(responseText);
    const totalTokens = requestTokens + responseTokens;

    // Registrar uso de tokens
    try {
      const tokenRecord = await recordTokenUsage(
        payload.userId,
        payload.tenantId,
        botId,
        totalTokens,
        'chat'
      );

      // Adicionar headers com informações de tokens
      const headers = new Headers(response.headers);
      headers.set('X-Tokens-Used-Request', requestTokens.toString());
      headers.set('X-Tokens-Used-Response', responseTokens.toString());
      headers.set('X-Tokens-Used-Total', totalTokens.toString());
      headers.set('X-Total-Tokens', tokenRecord.totalTokens.toString());
      headers.set('X-Remaining-Tokens', (botDetails.token_limit - tokenRecord.totalTokens).toString());
      headers.set('X-Token-Limit', botDetails.token_limit.toString());

      return new NextResponse(responseText, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      console.error('❌ Erro ao registrar tokens:', error);
      const headers = new Headers(response.headers);
      headers.set('X-Token-Registration-Error', 'true');
      return new NextResponse(responseText, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }
  } catch (error) {
    console.error('❌ Erro no proxy:', error);
    return NextResponse.json(
      { error: 'Erro interno no proxy' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    console.error('❌ Token não fornecido');
    return NextResponse.json(
      { error: 'Token não fornecido' },
      { status: 401 }
    );
  }

  if (!botId) {
    return NextResponse.json(
      { error: 'ID do bot não fornecido' },
      { status: 400 }
    );
  }

  return processRequest(request, botId, token);
}

export async function POST(request: Request, { params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    console.error('❌ Token não fornecido');
    return NextResponse.json(
      { error: 'Token não fornecido' },
      { status: 401 }
    );
  }

  if (!botId) {
    return NextResponse.json(
      { error: 'ID do bot não fornecido' },
      { status: 400 }
    );
  }

  return processRequest(request, botId, token);
}

export async function PUT(request: Request, { params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    console.error('❌ Token não fornecido');
    return NextResponse.json(
      { error: 'Token não fornecido' },
      { status: 401 }
    );
  }

  if (!botId) {
    return NextResponse.json(
      { error: 'ID do bot não fornecido' },
      { status: 400 }
    );
  }

  return processRequest(request, botId, token);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    console.error('❌ Token não fornecido');
    return NextResponse.json(
      { error: 'Token não fornecido' },
      { status: 401 }
    );
  }

  if (!botId) {
    return NextResponse.json(
      { error: 'ID do bot não fornecido' },
      { status: 400 }
    );
  }

  return processRequest(request, botId, token);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    console.error('❌ Token não fornecido');
    return NextResponse.json(
      { error: 'Token não fornecido' },
      { status: 401 }
    );
  }

  if (!botId) {
    return NextResponse.json(
      { error: 'ID do bot não fornecido' },
      { status: 400 }
    );
  }

  return processRequest(request, botId, token);
}