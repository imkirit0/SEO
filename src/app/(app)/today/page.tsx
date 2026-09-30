import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarRange, Clock, Link2, ListChecks, Target } from 'lucide-react';
import { getSession } from '@/lib/session';
import { BLOCK_COLOR, BLOCK_NAME, TYPE_NAME } from '@/lib/constants';
import type { ActiveTimer, PlanTask, Quota, TimeEntry } from '@/lib/types';
import { dayLabel, fmtHM, fmtHours, greeting, isDay, monthLabel, monthRange, sum, t5, weekOfMonth } from '@/lib/utils';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { StatusChip, Chip } from '@/components/ui/chip';
import { Meter } from '@/components/ui/meter';
import { EmptyState, PageHeader, SetupPrompt } from '@/components/ui/misc';
import { Stat } from '@/components/ui/stat';
import { buttonVariants } from '@/components/ui/button';
import { DayNav, DeleteEntryButton, TimerPanel } from '@/components/today/today-client';
import { WeekChip } from '@/components/planner/week-chip';

export const metadata: Metadata = { title: 'Today' };

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const [{ day: dayParam }, ctx] = await Promise.all([searchParams, getSession()]);
  if (!ctx.project) return <SetupPrompt isManager={ctx.isManager} />;

  const { supabase: db, user, project, month, today } = ctx;
  const day = isDay(dayParam) ? dayParam : today;
  const { start, end } = monthRange(month);

  const [entriesRes, monthRes, subsRes, quotasRes, timerRes, planRes] = await Promise.all([
    db.from('time_entries').select('*').eq('member_id', user.id).eq('day', day).order('created_at'),
    db.from('time_entries').select('minutes').eq('member_id', user.id).gte('day', start).lt('day', end),
    db.from('submissions').select('type,status').eq('member_id', user.id).eq('day', day),
    db.from('quotas').select('*').gt('per_day', 0),
    db.from('active_timers').select('*').eq('member_id', user.id).maybeSingle(),
    db.from('plan_tasks').select('*').eq('project_id', project.id).eq('month', month).order('position'),
  ]);

  const entries = ((entriesRes.data ?? []) as TimeEntry[]).sort((a, b) =>
    (a.start_time ?? '99').localeCompare(b.start_time ?? '99'),
  );
  const subs = (subsRes.data ?? []) as { type: string; status: string }[];
  const quotas = (quotasRes.data ?? []) as Quota[];
  const timer = timerRes.data as ActiveTimer | null;
  const plan = (planRes.data ?? []) as PlanTask[];

  const mins = sum(entries, (e) => e.minutes);
  const mtd = sum((monthRes.data ?? []) as { minutes: number }[], (e) => e.minutes);
  const target = project.hrs_per_day * 60;
  const done = subs.filter((s) => s.status === 'done');
  const projectName = Object.fromEntries(ctx.projects.map((p) => [p.id, p.name]));
  const firstName = (ctx.profile.full_name || '').split(' ')[0] || 'there';

  const week = weekOfMonth(day);
  const due = plan.filter((r) => ['Daily', 'Alt Days', 'Weekly'].includes(r.freq) || r.weeks?.[week] === 'prog');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dayLabel(day)}
        title={day === today ? `${greeting(ctx.hour)}, ${firstName}` : `Your log for ${dayLabel(day, { month: 'long', day: 'numeric' })}`}
        description="Log time as you go and keep the day’s link-building quota on track."
        actions={<DayNav day={day} today={today} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat
          lead
          label="Logged today"
          icon={<Clock />}
          value={fmtHM(mins)}
          meter={{ value: mins, max: target, tone: mins >= target ? 'ok' : 'accent' }}
          hint={`of ${fmtHM(target)} planned`}
        />
        <Stat label="Submissions" icon={<Link2 />} value={done.length} hint={`${new Set(done.map((s) => s.type)).size} types · ${subs.length - done.length} blocked`} />
        <Stat label="Entries" icon={<ListChecks />} value={entries.length} hint={timer ? 'Timer running' : 'No timer running'} />
        <Stat label="Month to date" icon={<CalendarRange />} value={fmtHours(mtd)} unit="h" hint={monthLabel(month)} />
      </div>

      <Card>
        <CardHeader title="Time log" description={`${dayLabel(day)} · ${project.name}`} />
        <CardBody className="border-b border-line bg-surface-2/40">
          <TimerPanel timer={timer} projectId={project.id} day={day} />
        </CardBody>
        {entries.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task</th><th>Block</th><th>Project</th><th>Time</th><th className="num">Duration</th><th>Status</th><th />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="max-w-[320px] font-medium">{e.task}</td>
                    <td>
                      <span className="inline-flex items-center gap-2 text-ink-2">
                        <span className="size-2 rounded-full" style={{ background: BLOCK_COLOR[e.block] }} />
                        {BLOCK_NAME[e.block]}
                      </span>
                    </td>
                    <td className="text-ink-2">{e.project_id ? projectName[e.project_id] ?? '—' : '—'}</td>
                    <td className="font-mono text-ink-2 tnum">{t5(e.start_time) ?? '—'} – {t5(e.end_time) ?? '—'}</td>
                    <td className="num">{fmtHM(e.minutes)}</td>
                    <td><StatusChip status={e.status} /></td>
                    <td className="w-10 text-right"><DeleteEntryButton id={e.id} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>Total</td>
                  <td className="num">{fmtHM(mins)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Clock />} title="Nothing logged yet" description="Start the timer above, or add an entry you already finished." />
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Daily link-building quota" description="Resets every day" icon={<Target />}>
            <Link href="/links" className={buttonVariants({ size: 'sm' })}>Open tracker</Link>
          </CardHeader>
          <CardBody className="space-y-4">
            {quotas.length ? quotas.map((q) => {
              const n = done.filter((s) => s.type === q.type).length;
              return (
                <div key={q.type}>
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="text-ink-2">{TYPE_NAME[q.type] ?? q.type}</span>
                    <span className="font-mono text-ink-3 tnum">
                      <span className={n >= q.per_day ? 'text-ok' : 'text-ink'}>{n}</span>/{q.per_day}
                    </span>
                  </div>
                  <Meter value={n} max={q.per_day} tone={n >= q.per_day ? 'ok' : 'accent'} className="h-2" />
                </div>
              );
            }) : <p className="text-sm text-ink-3">No daily quota set. A manager can add one under Team & Projects.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Week ${week + 1} on the plan`} description={project.name} icon={<CalendarRange />} />
          {!plan.length ? (
            <EmptyState
              title="No plan for this month"
              description="Build the month’s task plan and its hour budget."
              action={<Link href="/planner" className={buttonVariants({ size: 'sm' })}>Open the planner</Link>}
            />
          ) : !due.length ? (
            <CardBody><p className="text-sm text-ink-3">Nothing recurring is scheduled this week.</p></CardBody>
          ) : (
            <ul className="divide-y divide-line">
              {due.slice(0, 9).map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: BLOCK_COLOR[r.block] }} />
                  <span className="min-w-0 flex-1 truncate text-[13px]" title={r.task}>{r.task}</span>
                  <Chip tone="accent" className="hidden sm:inline-flex">{r.freq}</Chip>
                  <WeekChip id={r.id} week={week} status={r.weeks?.[week] ?? 'pend'} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
