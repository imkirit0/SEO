import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Profile, Project } from './types';
import { hourIn, isMonth, todayIn } from './utils';

/** Per-request app context: who is signed in, the directories, and the selected project/month. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const jar = await cookies();
  const tz = jar.get('sd_tz')?.value;
  const today = todayIn(tz);

  const [profileRes, projectsRes, teamRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('projects').select('*').order('created_at'),
    supabase.from('profiles').select('*').order('full_name'),
  ]);

  const profile: Profile = (profileRes.data as Profile | null) ?? {
    id: user.id,
    full_name: user.email?.split('@')[0] ?? 'You',
    email: user.email ?? null,
    role: 'exec',
    created_at: new Date().toISOString(),
  };
  const projects = ((projectsRes.data ?? []) as Project[]).map((p) => ({
    ...p,
    hrs_per_day: Number(p.hrs_per_day),
    days_per_month: Number(p.days_per_month),
  }));
  const team = (teamRes.data ?? []) as Profile[];

  const monthCookie = jar.get('sd_month')?.value;
  const month = isMonth(monthCookie) ? monthCookie : today.slice(0, 7);
  const projectCookie = jar.get('sd_project')?.value;
  const project = projects.find((p) => p.id === projectCookie) ?? projects[0] ?? null;

  return {
    supabase,
    user,
    profile,
    team,
    projects,
    project,
    month,
    today,
    hour: hourIn(tz),
    isManager: profile.role === 'manager',
  };
});

export type Session = Awaited<ReturnType<typeof getSession>>;
