import { JWTPayload } from 'jose';

interface JwtPayload extends JWTPayload {
  userId: string;
  tenantId?: string;
  botId: string;
  botAccess: string[];
  allowBotAccess: boolean;
  tokenLimit: number;
  [key: string]: any;
}

export async function generateBotToken(userId: string, tenantId?: string, botId?: string): Promise<string> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    console.log('Gerando token para:', { userId, tenantId, botId, baseUrl });

    const response = await fetch(`${baseUrl}/api/auth/jwt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'generate',
        userId,
        tenantId,
        botId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro na resposta:', { status: response.status, error: errorData });
      throw new Error(errorData.error || 'Falha ao gerar token');
    }

    const data = await response.json();
    console.log('Token gerado com sucesso');
    return data.token;
  } catch (error) {
    console.error('Erro ao gerar token:', error);
    throw error;
  }
}

export async function verifyBotToken(token: string): Promise<JwtPayload | null> {
  try {
    const response = await fetch('/api/auth/jwt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'verify',
        token,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao verificar token');
    }

    const { payload } = await response.json();
    return payload as JwtPayload;
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return null;
  }
}

export async function hasBotAccess(token: string, botId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/jwt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'check-access',
        token,
        botId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao verificar acesso');
    }

    const { hasAccess } = await response.json();
    return hasAccess;
  } catch (error) {
    console.error('Erro ao verificar acesso ao bot:', error);
    return false;
  }
} 