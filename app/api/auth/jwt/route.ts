import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface JwtPayload extends JWTPayload {
  userId: string;
  tenantId?: string;
  botId: string;
  botAccess: string[];
  allowBotAccess: boolean;
  tokenLimit: number;
  [key: string]: any;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Função para carregar a chave privada
const loadPrivateKey = () => {
  const privateKeyPath = path.join(process.cwd(), 'private.key');
  return fs.readFileSync(privateKeyPath, 'utf-8');
};

// Função para carregar a chave pública
const loadPublicKey = () => {
  const publicKeyPath = path.join(process.cwd(), 'public.key');
  return fs.readFileSync(publicKeyPath, 'utf-8');
};

export async function POST(request: Request) {
  try {
    const { action, userId, tenantId, botId, token } = await request.json();

    if (action === 'generate') {
      // Se não houver tenantId, é um bot do sistema
      if (!tenantId) {
        const payload: JwtPayload = {
          userId,
          botId: botId || 'system',
          botAccess: ['*'],
          allowBotAccess: true,
          tokenLimit: 1000000,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora
        };

        const privateKey = loadPrivateKey();
        const generatedToken = await new SignJWT(payload)
          .setProtectedHeader({ 
            alg: 'RS256',
            kid: 'bot-key-1'
          })
          .sign(new TextEncoder().encode(privateKey));

        return NextResponse.json({ token: generatedToken });
      }

      // Para bots associados a tenants
      const { data: tokenData, error: tokenError } = await supabase
        .from('jwt_token_data')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (tokenError) {
        throw new Error(`Erro ao buscar informações do usuário: ${tokenError.message}`);
      }

      if (!tokenData) {
        throw new Error('Usuário não encontrado no tenant');
      }

      const payload: JwtPayload = {
        userId,
        tenantId,
        botId: botId || 'tenant',
        botAccess: tokenData.enabled_bots || [],
        allowBotAccess: tokenData.allow_bot_access,
        tokenLimit: tokenData.token_limit,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora
      };

      const privateKey = loadPrivateKey();
      const generatedToken = await new SignJWT(payload)
        .setProtectedHeader({ 
          alg: 'RS256',
          kid: 'bot-key-1'
        })
        .sign(new TextEncoder().encode(privateKey));

      return NextResponse.json({ token: generatedToken });
    }

    if (action === 'verify') {
      if (!token) {
        return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 });
      }

      const publicKey = loadPublicKey();
      const { payload } = await jwtVerify(token, new TextEncoder().encode(publicKey));
      return NextResponse.json({ payload });
    }

    if (action === 'check-access') {
      if (!token || !botId) {
        return NextResponse.json({ error: 'Token e botId são obrigatórios' }, { status: 400 });
      }

      const publicKey = loadPublicKey();
      const { payload } = await jwtVerify(token, new TextEncoder().encode(publicKey));
      const jwtPayload = payload as JwtPayload;

      // Se for um bot do sistema, tem acesso a tudo
      if (!jwtPayload.tenantId && jwtPayload.botAccess.includes('*')) {
        return NextResponse.json({ hasAccess: true });
      }

      return NextResponse.json({ 
        hasAccess: jwtPayload.botAccess.includes(botId)
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('Erro ao processar requisição JWT:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
} 