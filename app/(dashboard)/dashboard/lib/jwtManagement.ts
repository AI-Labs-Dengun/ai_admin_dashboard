import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

interface JwtPayload extends JWTPayload {
  userId: string;
  tenantId?: string;
  botAccess: string[];
  allowBotAccess: boolean;
  tokenLimit: number;
  [key: string]: any;
}

const supabase = createClientComponentClient<Database>();

export async function generateBotToken(userId: string, tenantId?: string): Promise<string> {
  try {
    // Se não houver tenantId, é um bot do sistema
    if (!tenantId) {
      const payload: JwtPayload = {
        userId,
        botAccess: ['*'],
        allowBotAccess: true,
        tokenLimit: 1000000,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora
      };

      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secret);
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
      botAccess: tokenData.enabled_bots || [],
      allowBotAccess: tokenData.allow_bot_access,
      tokenLimit: tokenData.token_limit,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora
    };

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);
  } catch (error) {
    console.error('Erro ao gerar token:', error);
    throw error;
  }
}

export async function verifyBotToken(token: string): Promise<JwtPayload | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as JwtPayload;
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return null;
  }
}

export async function hasBotAccess(token: string, botId: string): Promise<boolean> {
  try {
    const payload = await verifyBotToken(token);
    if (!payload) return false;

    // Se for um bot do sistema, tem acesso a tudo
    if (!payload.tenantId && payload.botAccess.includes('*')) {
      return true;
    }

    return payload.botAccess.includes(botId);
  } catch (error) {
    console.error('Erro ao verificar acesso ao bot:', error);
    return false;
  }
} 