import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { verifyBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';
import { toast } from 'react-hot-toast';

interface UseBotTokenReturn {
  generateToken: (userId: string, tenantId: string) => Promise<string | null>;
  verifyToken: (token: string) => Promise<boolean>;
  isLoading: boolean;
  currentToken: string | null;
  refreshToken: (userId: string, tenantId: string) => Promise<string | null>;
}

interface StoredTokenData {
  token: string;
  expiration: number;
  userId: string;
  tenantId: string;
}

export function useBotToken(): UseBotTokenReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [tokenExpiration, setTokenExpiration] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  // Carregar token do localStorage ao iniciar
  useEffect(() => {
    const loadStoredToken = async () => {
      try {
        const storedData = localStorage.getItem('botTokenData');
        if (storedData) {
          const data: StoredTokenData = JSON.parse(storedData);
          
          // Verificar se o token ainda é válido
          const isValid = await verifyToken(data.token);
          if (isValid && data.expiration > Date.now()) {
            setCurrentToken(data.token);
            setTokenExpiration(data.expiration);
            setUserId(data.userId);
            setTenantId(data.tenantId);
          } else {
            // Se o token expirou, limpar o localStorage
            localStorage.removeItem('botTokenData');
          }
        }
      } catch (error) {
        console.error('Erro ao carregar token armazenado:', error);
        localStorage.removeItem('botTokenData');
      }
    };

    loadStoredToken();
  }, []);

  const generateToken = async (userId: string, tenantId: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      // Verificar se o usuário está autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Gerando token para:', { userId, tenantId });

      const response = await fetch('/api/bots/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, tenantId }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Erro na resposta da API:', data);
        throw new Error(data.error || 'Erro ao gerar token');
      }

      if (!data.token) {
        console.error('Token não retornado pela API');
        throw new Error('Token não retornado pelo servidor');
      }

      // Armazenar token no localStorage
      const expiration = Date.now() + (10 * 60 * 1000); // 10 minutos
      const tokenData: StoredTokenData = {
        token: data.token,
        expiration,
        userId,
        tenantId
      };
      localStorage.setItem('botTokenData', JSON.stringify(tokenData));

      setCurrentToken(data.token);
      setTokenExpiration(expiration);
      setUserId(userId);
      setTenantId(tenantId);

      return data.token;
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar token');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const payload = await verifyBotToken(token);
      return !!payload;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return false;
    }
  };

  const refreshToken = useCallback(async (userId: string, tenantId: string): Promise<string | null> => {
    try {
      const newToken = await generateToken(userId, tenantId);
      if (newToken) {
        toast.success('Token renovado com sucesso');
      }
      return newToken;
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      toast.error('Erro ao renovar token');
      return null;
    }
  }, []);

  // Efeito para verificar e renovar o token automaticamente apenas após expiração
  useEffect(() => {
    if (!tokenExpiration || !userId || !tenantId) return;

    const checkTokenExpiration = () => {
      const now = Date.now();
      if (now >= tokenExpiration) {
        refreshToken(userId, tenantId);
      }
    };

    // Verificar a cada minuto
    const interval = setInterval(checkTokenExpiration, 60 * 1000);

    // Verificar imediatamente ao montar
    checkTokenExpiration();

    return () => clearInterval(interval);
  }, [tokenExpiration, userId, tenantId, refreshToken]);

  // Limpar localStorage quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (!currentToken) {
        localStorage.removeItem('botTokenData');
      }
    };
  }, [currentToken]);

  return {
    generateToken,
    verifyToken,
    isLoading,
    currentToken,
    refreshToken,
  };
} 