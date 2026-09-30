import type { ReactNode } from 'react';
import { getSession } from '@/lib/session';
import { AppShell } from '@/components/shell/app-shell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { profile, projects, project, month, today } = await getSession();
  return (
    <AppShell
      profile={profile}
      projects={projects}
      projectId={project?.id ?? null}
      month={month}
      currentMonth={today.slice(0, 7)}
    >
      {children}
    </AppShell>
  );
}
