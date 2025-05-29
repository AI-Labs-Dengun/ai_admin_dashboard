import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
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

const supabase = createClientComponentClient<Database>();

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

export async function generateBotToken(userId: string, tenantId?: string, botId?: string): Promise<string> {
  try {
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
      return await new SignJWT(payload)
        .setProtectedHeader({ 
          alg: 'RS256',
          kid: 'bot-key-1' // Identificador da chave
        })
        .sign(new TextEncoder().encode(privateKey));
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
    return await new SignJWT(payload)
      .setProtectedHeader({ 
        alg: 'RS256',
        kid: 'bot-key-1' // Identificador da chave
      })
      .sign(new TextEncoder().encode(privateKey));
  } catch (error) {
    console.error('Erro ao gerar token:', error);
    throw error;
  }
}

export async function verifyBotToken(token: string): Promise<JwtPayload | null> {
  try {
    const publicKey = loadPublicKey();
    const { payload } = await jwtVerify(token, new TextEncoder().encode(publicKey));
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