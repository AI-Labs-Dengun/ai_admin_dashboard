import axios from 'axios';
import { createPublicKey } from 'crypto';

interface PublicKeyData {
  publicKey: string;
  algorithm: string;
  kid: string;
  expiresAt: number;
  lastUpdated: number;
}

export class PublicKeyManager {
  private static instance: PublicKeyManager;
  private cache: Map<string, PublicKeyData> = new Map();
  private cacheDuration: number = 24 * 60 * 60 * 1000; // 24 horas
  private rotationInterval: number = 12 * 60 * 60 * 1000; // 12 horas

  private constructor() {
    this.loadCache();
    this.startRotationCheck();
  }

  public static getInstance(): PublicKeyManager {
    if (!PublicKeyManager.instance) {
      PublicKeyManager.instance = new PublicKeyManager();
    }
    return PublicKeyManager.instance;
  }

  private startRotationCheck() {
    setInterval(() => {
      this.checkAndRotateKeys();
    }, this.rotationInterval);
  }

  private async checkAndRotateKeys() {
    try {
      const now = Date.now();
      for (const [kid, keyData] of this.cache.entries()) {
        if (now - keyData.lastUpdated > this.rotationInterval) {
          await this.refreshKey(kid);
        }
      }
    } catch (error) {
      console.warn('Erro ao verificar rotação de chaves:', error);
    }
  }

  private async refreshKey(kid: string) {
    try {
      const response = await axios.get(`${process.env.DASHBOARD_URL}/api/bots/public-key?kid=${kid}`);
      const keyData: PublicKeyData = {
        ...response.data,
        expiresAt: Date.now() + this.cacheDuration,
        lastUpdated: Date.now()
      };

      this.cache.set(kid, keyData);
      this.saveCache();
    } catch (error) {
      console.error('Erro ao atualizar chave:', error);
    }
  }

  private loadCache() {
    try {
      if (typeof window !== 'undefined') {
        const cachedData = localStorage.getItem('dengun_ai-admin_public-keys');
        if (cachedData) {
          const data = JSON.parse(cachedData);
          Object.entries(data).forEach(([kid, keyData]) => {
            this.cache.set(kid, keyData as PublicKeyData);
          });
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar cache de chaves públicas:', error);
    }
  }

  private saveCache() {
    try {
      if (typeof window !== 'undefined') {
        const data = Object.fromEntries(this.cache);
        localStorage.setItem('dengun_ai-admin_public-keys', JSON.stringify(data));
      }
    } catch (error) {
      console.warn('Erro ao salvar cache de chaves públicas:', error);
    }
  }

  public async getPublicKey(dashboardUrl: string, kid: string): Promise<PublicKeyData> {
    const cachedKey = this.cache.get(kid);
    if (cachedKey && cachedKey.expiresAt > Date.now()) {
      return cachedKey;
    }

    try {
      const response = await axios.get(`${dashboardUrl}/api/bots/public-key?kid=${kid}`);
      const keyData: PublicKeyData = {
        ...response.data,
        expiresAt: Date.now() + this.cacheDuration,
        lastUpdated: Date.now()
      };

      this.cache.set(kid, keyData);
      this.saveCache();

      return keyData;
    } catch (error) {
      console.error('Erro ao obter chave pública:', error);
      throw error;
    }
  }

  public getPublicKeyObject(publicKey: string) {
    try {
      return createPublicKey(publicKey);
    } catch (error) {
      console.error('Erro ao criar objeto de chave pública:', error);
      throw error;
    }
  }

  public clearCache() {
    this.cache.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dengun_ai-admin_public-keys');
    }
  }
} 