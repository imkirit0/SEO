import type { Metadata } from 'next';
import Link from 'next/link';
import { Ban, CircleCheck, Globe, Target } from 'lucide-react';
import { getSession } from '@/lib/session';
import { SUBMISSION_TYPES, TYPE_NAME } from '@/lib/constants';
import type { Site } from '@/lib/types';
import { fetchAll, monthLabel, pct } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader, SetupPrompt } from '@/components/ui/misc';
import { Stat } from '@/components/ui/stat';
import { TypeRail } from '@/components/links/type-rail';
import { SiteTable, type Hit } from '@/components/links/site-table';

export const metadata: Metadata = { title: 'Link Building' };

export default async function LinksPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [{ type: typeParam }, ctx] = await Promise.all([searchParams, getSession()]);
  if (!ctx.project) return <SetupPrompt isManager={ctx.isManager} />;

  const { supabase: db, project, month, today, user } = ctx;
  const type: string = typeParam && TYPE_NAME[typeParam] ? typeParam : SUBMISSION_TYPES[0].id;

  const [siteCountsRes, subCountsRes, sites, hits, quotaRes, mineTodayRes] = await Promise.all([
    db.rpc('site_type_counts'),
    db.rpc('submission_type_counts', { p_project: project.id, p_month: month }),
    fetchAll<Site>((f, t) =>
      db.from('sites').select('id,type,url,da,created_by,created_at').eq('type', type)
        .order('da', { ascending: false, nullsFirst: false }).order('url').range(f, t),
    ),
    fetchAll<Hit>((f, t) =>
      db.from('submissions').select('id,site_id,member_id,day,start_time,end_time,status')
        .eq('project_id', project.id).eq('month', month).eq('type', type).order('id').range(f, t),
    ),
    db.from('quotas').select('per_day').eq('type', type).maybeSingle(),
    db.from('submissions').select('id', { count: 'exact', head: true })
      .eq('member_id', user.id).eq('day', today).eq('type', type).eq('status', 'done'),
  ]);

  const siteCounts = Object.fromEntries(((siteCountsRes.data ?? []) as { type: string; n: number }[]).map((r) => [r.type, r.n]));
  const doneCounts = Object.fromEntries(((subCountsRes.data ?? []) as { type: string; n: number }[]).map((r) => [r.type, r.n]));
  const quota = (quotaRes.data?.per_day as number | undefined) ?? 0;
  const mineToday = mineTodayRes.count ?? 0;
  const done = hits.filter((h) => h.status === 'done').length;
  const blocked = hits.length - done;
  const members = Object.fromEntries(ctx.team.map((m) => [m.id, m.full_name]));
  const canLog = month === today.slice(0, 7);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${project.name} · ${monthLabel(month)}`}
        title="Link building"
        description="Work down the master list for each submission type. Each site counts once per project per month."
        actions={<Link href={`/library?type=${type}`} className={buttonVariants()}><Globe /> Manage sites</Link>}
      />

      {!canLog && (
        <div className="rounded-xl border border-warn/25 bg-warn-soft px-4 py-3 text-[13px] text-warn">
          You’re viewing {monthLabel(month)}. Switch to the current month in the top bar to log new submissions.
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[268px_minmax(0,1fr)]">
        <TypeRail
          basePath="/links"
          active={type}
          rows={SUBMISSION_TYPES.map((t) => ({ id: t.id, name: t.name, total: siteCounts[t.id] ?? 0, done: doneCounts[t.id] ?? 0 }))}
        />
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Stat lead label="Done this month" icon={<CircleCheck />} value={done} hint={`of ${sites.length} sites`} meter={{ value: done, max: sites.length }} />
            <Stat label="Coverage" value={`${Math.round(pct(done, sites.length))}%`} hint={TYPE_NAME[type]} />
            <Stat label="Blocked" icon={<Ban />} value={blocked} hint="Sites that refused or failed" />
            <Stat
              label="Your quota today"
              icon={<Target />}
              value={quota ? `${mineToday}/${quota}` : mineToday}
              meter={quota ? { value: mineToday, max: quota, tone: mineToday >= quota ? 'ok' : 'accent' } : undefined}
              hint={quota ? (mineToday >= quota ? 'Quota met — nice' : `${quota - mineToday} to go`) : 'No quota for this type'}
            />
          </div>
          <SiteTable
            key={type}
            type={type}
            typeName={TYPE_NAME[type]}
            sites={sites.map((s) => ({ id: s.id, url: s.url, da: s.da }))}
            hits={hits}
            members={members}
            me={user.id}
            isManager={ctx.isManager}
            projectId={project.id}
            month={month}
            today={today}
            canLog={canLog}
          />
        </div>
      </div>
    </div>
  );
}
