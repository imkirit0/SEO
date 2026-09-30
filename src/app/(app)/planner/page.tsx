import type { Metadata } from 'next';
import { Gauge, Hourglass, ListChecks, Timer } from 'lucide-react';
import { getSession } from '@/lib/session';
import { BLOCKS } from '@/lib/constants';
import type { PlanTask, TimeEntry } from '@/lib/types';
import { fetchAll, fmtHours, monthLabel, monthRange, pct, shiftMonth, sum } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { PageHeader, SetupPrompt } from '@/components/ui/misc';
import { Stat } from '@/components/ui/stat';
import { PlanBlock, PlanEmpty } from '@/components/planner/planner-client';

export const metadata: Metadata = { title: 'Monthly Plan' };

export default async function PlannerPage() {
  const ctx = await getSession();
  if (!ctx.project) return <SetupPrompt isManager={ctx.isManager} />;

  const { supabase: db, project, month, isManager } = ctx;
  const { start, end } = monthRange(month);
  const prevMonth = shiftMonth(month, -1);

  const [tasksRes, prevRes, entries] = await Promise.all([
    db.from('plan_tasks').select('*').eq('project_id', project.id).eq('month', month).order('position').order('created_at'),
    db.from('plan_tasks').select('id', { count: 'exact', head: true }).eq('project_id', project.id).eq('month', prevMonth),
    fetchAll<Pick<TimeEntry, 'block' | 'minutes'>>((f, t) =>
      db.from('time_entries').select('id,block,minutes').eq('project_id', project.id).gte('day', start).lt('day', end).order('id').range(f, t),
    ),
  ]);
  const rows = (tasksRes.data ?? []) as PlanTask[];

  const header = (
    <PageHeader
      eyebrow={`${project.name} · ${monthLabel(month)}`}
      title="Monthly plan"
      description="Budget the retainer’s hours by task, then track each week’s progress. Click a week cell to cycle its status."
    />
  );

  if (!rows.length) {
    return (
      <div className="space-y-6">
        {header}
        <PlanEmpty
          isManager={isManager}
          projectId={project.id}
          month={month}
          monthName={monthLabel(month)}
          prevMonthName={monthLabel(prevMonth, 'short')}
          prevCount={prevRes.count ?? 0}
        />
      </div>
    );
  }

  const cap = project.hrs_per_day * project.days_per_month * 60;
  const planned = sum(rows, (r) => r.minutes);
  const logged = sum(entries, (e) => e.minutes);
  const touched = rows.filter((r) => r.weeks?.some((w) => w === 'done')).length;
  const scale = Math.max(cap, planned);

  return (
    <div className="space-y-6">
      {header}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat lead label="Capacity" icon={<Gauge />} value={fmtHours(cap)} unit="h" hint={`${project.hrs_per_day} h/day × ${project.days_per_month} days`} />
        <Stat
          label="Planned"
          icon={<Hourglass />}
          value={fmtHours(planned)}
          unit="h"
          meter={{ value: planned, max: cap, tone: planned > cap ? 'bad' : 'accent' }}
          hint={planned > cap ? `${fmtHours(planned - cap)} h over capacity` : `${fmtHours(cap - planned)} h unallocated`}
        />
        <Stat
          label="Logged"
          icon={<Timer />}
          value={fmtHours(logged)}
          unit="h"
          meter={{ value: logged, max: planned, tone: logged > planned ? 'warn' : 'ok' }}
          hint={`${Math.round(pct(logged, planned))}% of the plan`}
        />
        <Stat label="Tasks" icon={<ListChecks />} value={rows.length} hint={`${touched} with a completed week`} />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-medium">Capacity allocation</p>
          <p className="font-mono text-xs text-ink-3 tnum">{fmtHours(planned)} / {fmtHours(cap)} h</p>
        </div>
        <div className="relative mt-3 flex h-3 overflow-hidden rounded-full bg-surface-3">
          {BLOCKS.map((b) => {
            const m = sum(rows.filter((r) => r.block === b.id), (r) => r.minutes);
            return m ? <div key={b.id} title={`${b.name}: ${fmtHours(m)} h`} style={{ width: `${pct(m, scale)}%`, background: b.color }} className="h-full first:rounded-l-full" /> : null;
          })}
          {planned > cap && <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${pct(cap, scale)}%` }} title="Capacity" />}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {BLOCKS.map((b) => (
            <span key={b.id} className="inline-flex items-center gap-2 text-xs text-ink-2">
              <span className="size-2 rounded-full" style={{ background: b.color }} />
              {b.name}
              <span className="font-mono text-ink-3 tnum">{fmtHours(sum(rows.filter((r) => r.block === b.id), (r) => r.minutes))} h</span>
            </span>
          ))}
        </div>
      </Card>

      {BLOCKS.map((b) => {
        const blockRows = rows.filter((r) => r.block === b.id);
        if (!blockRows.length && !isManager) return null;
        return (
          <PlanBlock
            key={b.id}
            blockId={b.id}
            rows={blockRows}
            loggedMins={sum(entries.filter((e) => e.block === b.id), (e) => e.minutes)}
            isManager={isManager}
            projectId={project.id}
            month={month}
          />
        );
      })}
    </div>
  );
}
