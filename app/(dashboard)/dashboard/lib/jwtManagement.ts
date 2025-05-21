import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface JwtPayload extends JWTPayload {
  userId: string;
  tenantId: string;
  botAccess: string[];
  allowBotAccess: boolean;
  tokenLimit: number;
  iat: number;
  exp: number;
}

export async function generateBotToken(userId: string, tenantId: string): Promise<string | null> {
  try {
    console.log('Iniciando geração de token para:', { userId, tenantId });
    const supabase = createClientComponentClient();

    // Buscar informações do usuário usando a view jwt_token_data
    const { data: tokenData, error: tokenError } = await supabase
      .from('jwt_token_data')
      .select('*')
      .match({ user_id: userId, tenant_id: tenantId })
      .single();

    if (tokenError) {
      console.error('Erro ao buscar dados do token:', tokenError);
      if (tokenError.code === 'PGRST116') {
        throw new Error('Usuário não encontrado no tenant');
      }
      throw new Error(`Erro ao buscar informações do usuário: ${tokenError.message}`);
    }

    if (!tokenData) {
      throw new Error('Dados do token não encontrados');
    }

    console.log('Dados do token encontrados:', tokenData);

    // Se não houver bots habilitados e o usuário tiver permissão, é um problema
    if (!tokenData.enabled_bots?.length && tokenData.allow_bot_access) {
      console.error('Nenhum bot habilitado para o usuário');
      throw new Error('Nenhum bot habilitado para o usuário');
    }

    // Criar payload do token
    const payload: JwtPayload = {
      userId,
      tenantId,
      botAccess: tokenData.enabled_bots || [],
      allowBotAccess: tokenData.allow_bot_access,
      tokenLimit: tokenData.token_limit,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (10 * 60) // 10 minutos
    };

    console.log('Payload do token:', payload);

    // Verificar se a chave secreta está definida
    const secretKey = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET;
    if (!secretKey) {
      console.error('JWT_SECRET não está definido');
      throw new Error('Erro de configuração: JWT_SECRET não está definido');
    }

    // Gerar token
    const secret = new TextEncoder().encode(secretKey);
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(secret);

    console.log('Token gerado com sucesso');
    return token;
  } catch (error) {
    console.error('Erro ao gerar token:', error);
    throw error;
  }
}

export async function verifyBotToken(token: string): Promise<JwtPayload | null> {
  try {
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      console.error('JWT_SECRET não está definido');
      return null;
    }

    const secret = new TextEncoder().encode(secretKey);
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JwtPayload;
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return null;
  }
}

export function hasBotAccess(token: string, botId: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload;
    
    // Verificar se o token expirou
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      console.error('Token expirado');
      return false;
    }

    // Verificar se o usuário tem acesso a bots
    if (!payload.allowBotAccess) {
      console.error('Usuário não tem acesso a bots');
      return false;
    }

    // Verificar se o bot específico está na lista de acesso
    const hasAccess = payload.botAccess.includes(botId);
    if (!hasAccess) {
      console.error('Usuário não tem acesso ao bot específico');
    }
    return hasAccess;
  } catch (error) {
    console.error('Erro ao verificar acesso ao bot:', error);
    return false;
  }
} 