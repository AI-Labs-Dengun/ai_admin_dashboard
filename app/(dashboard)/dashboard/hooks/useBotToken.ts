import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { verifyBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';
import toast from 'react-hot-toast';

interface UseBotTokenReturn {
  generateToken: (userId: string, tenantId: string) => Promise<string | null>;
  verifyToken: (token: string) => Promise<boolean>;
  isLoading: boolean;
}

export function useBotToken(): UseBotTokenReturn {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();

  const generateToken = async (userId: string, tenantId: string): Promise<string | null> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/bots/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, tenantId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao gerar token');
      }

      const { token } = await response.json();
      return token;
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      toast.error('Erro ao gerar token');
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

  return {
    generateToken,
    verifyToken,
    isLoading,
  };
} 