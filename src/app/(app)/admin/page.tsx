import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { getSession } from '@/lib/session';
import type { Quota } from '@/lib/types';
import { PageHeader } from '@/components/ui/misc';
import { ProjectsPanel, QuotaPanel, TeamPanel } from '@/components/admin/admin-client';

export const metadata: Metadata = { title: 'Team & Projects' };

export default async function AdminPage() {
  const ctx = await getSession();
  const { data } = await ctx.supabase.from('quotas').select('*');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Setup"
        title="Team & projects"
        description="Who logs work, the client retainers they log it against, and what a full day of link building looks like."
      />
      {!ctx.isManager && (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-[13px] text-ink-2">
          <ShieldCheck className="size-4 text-accent" />
          You can view this page; changes to projects, roles and quotas are made by managers.
        </div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <TeamPanel team={ctx.team} me={ctx.user.id} isManager={ctx.isManager} createEnabled={!!process.env.SUPABASE_SERVICE_ROLE_KEY} />
        <ProjectsPanel projects={ctx.projects} isManager={ctx.isManager} />
      </div>
      <QuotaPanel quotas={(data ?? []) as Quota[]} isManager={ctx.isManager} />
    </div>
  );
}
