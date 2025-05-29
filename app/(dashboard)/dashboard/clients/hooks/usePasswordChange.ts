"use client";

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function usePasswordChange() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkPasswordChange = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('password_changed')
            .eq('id', user.id)
            .single();

          // Se o perfil não existir ou password_changed for false, mostrar o modal
          if (!profile || !profile.password_changed) {
            setShowPasswordModal(true);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status da senha:', error);
      }
    };

    checkPasswordChange();
  }, []);

  return {
    showPasswordModal,
    setShowPasswordModal
  };
} 