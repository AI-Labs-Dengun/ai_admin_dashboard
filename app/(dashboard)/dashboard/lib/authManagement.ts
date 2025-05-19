import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/types/supabase";
import toast from "react-hot-toast";

export interface UserPermissions {
  isSuperAdmin: boolean;
  hasBotAccess: boolean;
  userId: string;
  email: string;
}

export const checkUserPermissions = async (): Promise<UserPermissions | null> => {
  const supabase = createClientComponentClient<Database>();
  
  try {
    // Verificar se o usuário está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !user.email) {
      console.error('Usuário não autenticado ou sem email');
      return null;
    }

    // Verificar se o perfil existe
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('is_super_admin, email')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Erro ao verificar perfil:', profileError);
      throw profileError;
    }

    // Se o perfil não existir, criar um novo
    if (!existingProfile) {
      // Verificar se já existe um perfil com este email
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (emailCheckError) {
        console.error('Erro ao verificar email:', emailCheckError);
        throw emailCheckError;
      }

      if (existingEmail) {
        console.error('Email já está em uso por outro usuário');
        toast.error('Este email já está em uso por outro usuário');
        return null;
      }

      const { error: insertError } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            email: user.email,
            is_super_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (insertError) {
        console.error('Erro ao criar perfil:', insertError);
        throw insertError;
      }

      // Verificar acesso do tenant para usuário não super-admin
      const { data: tenantUser, error: tenantError } = await supabase
        .from('tenant_users')
        .select('allow_bot_access')
        .eq('user_id', user.id)
        .maybeSingle();

      if (tenantError) {
        console.error('Erro ao verificar acesso do tenant:', tenantError);
        throw tenantError;
      }

      return {
        isSuperAdmin: false,
        hasBotAccess: tenantUser?.allow_bot_access || false,
        userId: user.id,
        email: user.email
      };
    }

    // Se for super-admin, não precisa verificar acesso do tenant
    if (existingProfile.is_super_admin) {
      return {
        isSuperAdmin: true,
        hasBotAccess: true,
        userId: user.id,
        email: existingProfile.email || user.email
      };
    }

    // Verificar acesso do tenant para usuário não super-admin
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('allow_bot_access')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tenantError) {
      console.error('Erro ao verificar acesso do tenant:', tenantError);
      throw tenantError;
    }

    return {
      isSuperAdmin: false,
      hasBotAccess: tenantUser?.allow_bot_access || false,
      userId: user.id,
      email: existingProfile.email || user.email
    };

  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    toast.error('Erro ao verificar permissões');
    return null;
  }
}; 