import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { toast } from 'react-hot-toast';

interface BotAccess {
  botId: string;
  enabled: boolean;
}

interface JwtPayload extends JWTPayload {
  userId: string;
  tenantId: string;
  botAccess: BotAccess[];
  allowBotAccess: boolean;
  tokenLimit: number;
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function generateBotToken(userId: string, tenantId: string): Promise<string | null> {
  try {
    const supabase = createClientComponentClient();

    // Buscar informações do usuário e seus bots
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('allow_bot_access, token_limit')
      .match({ user_id: userId, tenant_id: tenantId })
      .single();

    if (tenantError) throw tenantError;

    // Buscar bots associados ao usuário
    const { data: userBots, error: botsError } = await supabase
      .from('user_bots')
      .select('bot_id, enabled')
      .match({ user_id: userId, tenant_id: tenantId });

    if (botsError) throw botsError;

    // Criar payload do token
    const payload: JwtPayload = {
      userId,
      tenantId,
      botAccess: userBots?.map(bot => ({
        botId: bot.bot_id,
        enabled: bot.enabled
      })) || [],
      allowBotAccess: tenantUser.allow_bot_access,
      tokenLimit: tenantUser.token_limit,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (10 * 60) // 10 minutos em segundos
    };

    // Gerar token JWT
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m') // 10 minutos
      .sign(JWT_SECRET);

    return token;
  } catch (error) {
    console.error('Erro ao gerar token:', error);
    toast.error('Erro ao gerar token');
    return null;
  }
}

export async function verifyBotToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
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

    // Verificar se o token expirou
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }

    // Verificar se o usuário tem acesso aos bots
    if (!payload.allowBotAccess) return false;

    // Verificar se o bot específico está habilitado
    const botAccess = payload.botAccess.find(bot => bot.botId === botId);
    return botAccess?.enabled || false;
  } catch (error) {
    console.error('Erro ao verificar acesso ao bot:', error);
    return false;
  }
} 