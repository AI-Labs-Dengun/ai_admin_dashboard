import { jwtVerify, createRemoteJWKSet } from 'jose';
import { PublicKeyManager } from './PublicKeyManager';

interface TokenValidationOptions {
  remote?: boolean;
  dashboardUrl?: string;
  requireBotId?: boolean;
  requireTenantId?: boolean;
}

interface TokenValidationResult {
  valid: boolean;
  payload?: any;
  error?: string;
}

export class TokenValidator {
  private static instance: TokenValidator;
  private publicKeyManager: PublicKeyManager;

  private constructor() {
    this.publicKeyManager = PublicKeyManager.getInstance();
  }

  public static getInstance(): TokenValidator {
    if (!TokenValidator.instance) {
      TokenValidator.instance = new TokenValidator();
    }
    return TokenValidator.instance;
  }

  public async validateToken(token: string, options: TokenValidationOptions = {}): Promise<TokenValidationResult> {
    try {
      // Decodificar o token para obter o header
      const [headerB64] = token.split('.');
      const header = JSON.parse(Buffer.from(headerB64, 'base64').toString());
      
      if (!header.kid) {
        return {
          valid: false,
          error: 'Token não contém kid no header'
        };
      }

      if (options.remote && options.dashboardUrl) {
        return await this.validateTokenRemotely(token, options.dashboardUrl);
      }

      return await this.validateTokenLocally(token, options);
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido na validação do token'
      };
    }
  }

  private async validateTokenLocally(token: string, options: TokenValidationOptions): Promise<TokenValidationResult> {
    try {
      // Decodificar o token para obter o kid
      const [headerB64] = token.split('.');
      const header = JSON.parse(Buffer.from(headerB64, 'base64').toString());
      
      // Obter a chave pública
      const keyData = await this.publicKeyManager.getPublicKey(process.env.DASHBOARD_URL || '', header.kid);
      const publicKey = this.publicKeyManager.getPublicKeyObject(keyData.publicKey);

      // Verificar o token
      const { payload } = await jwtVerify(token, publicKey, {
        algorithms: [keyData.algorithm],
        issuer: process.env.DASHBOARD_URL,
        audience: process.env.BOT_NAME
      });

      // Validações adicionais
      if (options.requireBotId && !payload.botId) {
        return {
          valid: false,
          error: 'Token não contém botId'
        };
      }

      if (options.requireTenantId && !payload.tenantId) {
        return {
          valid: false,
          error: 'Token não contém tenantId'
        };
      }

      // Verificar expiração
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return {
          valid: false,
          error: 'Token expirado'
        };
      }

      return {
        valid: true,
        payload
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Erro na validação local do token'
      };
    }
  }

  private async validateTokenRemotely(token: string, dashboardUrl: string): Promise<TokenValidationResult> {
    try {
      const response = await fetch(`${dashboardUrl}/api/bots/validate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro na validação remota do token');
      }

      return {
        valid: data.valid,
        payload: data.payload
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Erro na validação remota do token'
      };
    }
  }

  public async validateTokenWithJWKS(token: string, jwksUrl: string): Promise<TokenValidationResult> {
    try {
      const JWKS = createRemoteJWKSet(new URL(jwksUrl));
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: process.env.DASHBOARD_URL,
        audience: process.env.BOT_NAME
      });

      return {
        valid: true,
        payload
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Erro na validação com JWKS'
      };
    }
  }
} 