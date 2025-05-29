import { NextResponse } from 'next/server';
import { verifyBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 400 }
      );
    }

    // Verificar se o token é válido
    const payload = await verifyBotToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Verificar se o token foi revogado
    const supabase = createRouteHandlerClient({ cookies });
    const { data: revokedToken } = await supabase
      .from('revoked_tokens')
      .select('*')
      .eq('token_id', payload.jti)
      .single();

    if (revokedToken) {
      return NextResponse.json(
        { error: 'Token revogado' },
        { status: 401 }
      );
    }

    // Verificar permissões atuais
    const { data: userBot } = await supabase
      .from('user_bots')
      .select('enabled')
      .match({
        user_id: payload.userId,
        bot_id: payload.botId,
        tenant_id: payload.tenantId
      })
      .single();

    if (!userBot?.enabled) {
      return NextResponse.json(
        { error: 'Acesso ao bot não permitido' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      payload
    });

  } catch (error) {
    console.error('Erro ao validar token:', error);
    return NextResponse.json(
      { error: 'Erro ao validar token' },
      { status: 500 }
    );
  }
} 