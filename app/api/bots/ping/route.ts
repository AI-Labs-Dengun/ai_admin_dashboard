import { NextResponse } from 'next/server';
import { verifyBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';

export async function GET(request: Request) {
  try {
    // Verificar se o token está presente
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyBotToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Ping bem-sucedido
    return NextResponse.json({
      success: true,
      botId: payload.botId,
      timestamp: Date.now(),
      status: 'online'
    });
  } catch (error) {
    console.error('Erro no ping:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Permitir POST também para compatibilidade
  return GET(request);
} 