'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/app/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  company: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const { supabase } = useSupabase();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');

  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) {
          toast.error('Usuário não autenticado');
          return;
        }

        // Primeiro, tenta buscar o perfil existente
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          // Se o erro for 406 (Not Acceptable) ou PGRST116 (no rows), significa que o perfil não existe
          if (profileError.code === '406' || profileError.code === 'PGRST116') {
            // Criar novo perfil com dados mínimos
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: user.id,
                  email: user.email,
                  full_name: user.user_metadata?.full_name || '',
                  company: user.user_metadata?.company || '',
                  is_super_admin: user.user_metadata?.is_super_admin || false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ])
              .select()
              .single();

            if (createError) {
              // Se o erro for 409 (Conflict), significa que o perfil já existe
              if (createError.code === '409') {
                // Tentar buscar o perfil novamente
                const { data: retryProfile, error: retryError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', user.id)
                  .single();

                if (retryError) throw retryError;
                if (retryProfile) {
                  setProfile(retryProfile);
                  setFullName(retryProfile.full_name || '');
                  setCompany(retryProfile.company || '');
                }
              } else {
                console.error('Erro ao criar perfil:', createError);
                throw createError;
              }
            } else if (newProfile) {
              setProfile(newProfile);
              setFullName(newProfile.full_name || '');
              setCompany(newProfile.company || '');
              toast.success('Perfil criado com sucesso!');
            }
          } else {
            throw profileError;
          }
        } else if (existingProfile) {
          setProfile(existingProfile);
          setFullName(existingProfile.full_name || '');
          setCompany(existingProfile.company || '');
        }
      } catch (error: any) {
        console.error('Erro ao carregar perfil:', error);
        toast.error('Erro ao carregar perfil: ' + (error.message || 'Erro desconhecido'));
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, [supabase]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!profile?.id) {
        throw new Error('ID do perfil não encontrado');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          company: company,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
      
      // Atualiza o estado local do perfil
      setProfile(prev => prev ? {
        ...prev,
        full_name: fullName,
        company: company,
      } : null);
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-4 w-[300px] mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[180px]" />
                  <Skeleton className="h-3 w-[120px]" />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-[80px] mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-[80px] mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <Skeleton className="h-10 w-[120px]" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Atualize suas informações de perfil</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || ''} />
                <AvatarFallback className="text-lg">
                  {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{profile?.full_name}</h3>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                {profile?.company && (
                  <p className="text-sm text-muted-foreground">{profile.company}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Membro desde {new Date(profile?.created_at || '').toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="text-sm font-medium">
                  Nome Completo
                </label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label htmlFor="company" className="text-sm font-medium">
                  Empresa
                </label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 