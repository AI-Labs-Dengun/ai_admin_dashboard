import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function Home() {
  const supabase = createServerComponentClient({ cookies });
  
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      redirect('/dashboard');
    }

    redirect('/auth/signin');
  } catch (error) {
    console.error('Error checking auth:', error);
    redirect('/auth/signin');
  }
}
