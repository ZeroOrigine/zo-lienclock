// CANONICAL: authenticated dashboard segment layout; forces dynamic rendering for every dashboard route.
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import DashboardChrome from '@/components/dashboard-chrome';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  const { data: profile } = await supabase
    .from('lienclock_profiles')
    .select('full_name, email')
    .eq('id', data.user.id)
    .maybeSingle();
  const userName = (profile?.full_name as string | null) ?? data.user.email ?? 'there';
  return (
    <DashboardChrome userName={userName} userEmail={data.user.email ?? ''}>
      {children}
    </DashboardChrome>
  );
}
