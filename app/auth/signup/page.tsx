'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/app/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { toastConfig } from '@/app/providers/toast-provider';
import { VerifyEmailModal } from '@/app/auth/components/verify-email-modal';

export default function SignUp() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const router = useRouter();
  const { supabase } = useSupabase();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company: company,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: fullName,
              email: email,
              company: company,
            },
          ]);

        if (profileError) throw profileError;

        toast.success('Account created successfully! Please check your email to verify your account.', toastConfig);
        setShowVerifyModal(true);
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message);
      toast.error('Error creating account: ' + error.message, toastConfig);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Fill in your details to create your account</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignUp}>
            <CardContent className="space-y-4">
              {error && (
                <div className="text-sm text-red-500">{error}</div>
              )}
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
              <div className="text-sm text-center">
                Already have an account?{' '}
                <Link href="/auth/signin" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>

      <VerifyEmailModal 
        isOpen={showVerifyModal} 
        onClose={() => setShowVerifyModal(false)} 
      />
    </>
  );
} 