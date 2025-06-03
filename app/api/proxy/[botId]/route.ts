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
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      console.error('❌ Token não fornecido');
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    // Verificar o token
    const payload = await verifyBotToken(token);
    if (!payload) {
      console.error('❌ Token inválido ou expirado');
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    console.log('✅ Token validado:', { 
      userId: payload.userId, 
      tenantId: payload.tenantId, 
      botId 
    });

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Buscar informações do bot através da view user_bots_details
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

    if (botError) {
      console.error('❌ Erro ao buscar detalhes do bot:', botError);
      return NextResponse.json(
        { error: 'Erro ao buscar detalhes do bot' },
        { status: 500 }
      );
    }

    if (!botDetails) {
      console.error('❌ Bot não encontrado ou acesso não permitido');
      return NextResponse.json(
        { error: 'Bot não encontrado ou acesso não permitido' },
        { status: 404 }
      );
    }

    if (!botDetails.enabled) {
      console.error('❌ Bot não está habilitado');
      return NextResponse.json(
        { error: 'Bot não está habilitado' },
        { status: 403 }
      );
    }

    if (!botDetails.allow_bot_access) {
      console.error('❌ Acesso ao bot não permitido');
      return NextResponse.json(
        { error: 'Acesso ao bot não permitido' },
        { status: 403 }
      );
    }

    if (!botDetails.bot_website) {
      console.error('❌ Website do bot não configurado');
      return NextResponse.json(
        { error: 'Website do bot não configurado' },
        { status: 400 }
      );
    }

    console.log('✅ Bot encontrado:', { 
      name: botDetails.bot_name, 
      website: botDetails.bot_website 
    });

    // Verificar uso de tokens na tabela token_usage
    const { data: tokenUsage, error: usageError } = await supabase
      .from('token_usage')
      .select('tokens_used, total_tokens')
      .eq('user_id', payload.userId)
      .eq('bot_id', botId)
      .eq('tenant_id', payload.tenantId)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('❌ Erro ao verificar uso de tokens:', usageError);
      return NextResponse.json(
        { error: 'Erro ao verificar uso de tokens' },
        { status: 500 }
      );
    }

    const tokensUsed = tokenUsage?.tokens_used || 0;
    const tokenLimit = botDetails.token_limit;

    if (tokensUsed >= tokenLimit) {
      console.error('❌ Limite de tokens atingido:', { 
        used: tokensUsed, 
        limit: tokenLimit 
      });
      return NextResponse.json(
        { error: 'Limite de tokens atingido' },
        { status: 403 }
      );
    }

    console.log('✅ Uso de tokens verificado:', { 
      tokensUsed, 
      limit: tokenLimit 
    });

    // Repassar a requisição para o bot externo
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
      body: request.method !== 'GET' ? await request.text() : undefined
    });

    // Registrar uso de tokens na tabela token_usage
    const { error: recordError } = await supabase
      .from('token_usage')
      .upsert({
        user_id: payload.userId,
        bot_id: botId,
        tenant_id: payload.tenantId,
        tokens_used: tokensUsed + 1,
        total_tokens: tokensUsed + 1,
        action_type: 'chat',
        last_used: new Date().toISOString(),
        request_timestamp: new Date().toISOString(),
        response_timestamp: new Date().toISOString()
      });

    if (recordError) {
      console.error('❌ Erro ao registrar uso de tokens:', recordError);
    }

    console.log('✅ Requisição repassada com sucesso');

    // Se a resposta for um redirecionamento, seguir o redirecionamento
    if (response.status === 301 || response.status === 302) {
      const location = response.headers.get('location');
      if (location) {
        return NextResponse.redirect(location);
      }
    }

    // Retornar resposta do bot
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Internal-Token, X-Bot-Name, X-Admin-Email'
      }
    });
  } catch (error) {
    console.error('❌ Erro no proxy:', error);
    return NextResponse.json(
      { error: 'Erro interno no proxy' },
      { status: 500 }
    );
  }
}

// Repassar outros métodos HTTP
export async function POST(request: Request, { params }: { params: Promise<{ botId: string }> }) {
  return GET(request, { params });
}

export async function PUT(request: Request, { params }: { params: Promise<{ botId: string }> }) {
  return GET(request, { params });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ botId: string }> }) {
  return GET(request, { params });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ botId: string }> }) {
  return GET(request, { params });
}