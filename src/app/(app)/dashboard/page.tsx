import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, CalendarRange, Clock, Download, Gauge, Link2, TrendingUp, Users } from 'lucide-react';
import { getSession } from '@/lib/session';
import { BLOCKS, BLOCK_NAME, TYPE_NAME } from '@/lib/constants';
import type { ActiveTimer, PlanTask, Submission, TimeEntry } from '@/lib/types';
import { cn, daysInMonth, fetchAll, fmtHM, fmtHours, monthLabel, monthRange, pad, pct, sum } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Avatar, EmptyState, PageHeader, SetupPrompt } from '@/components/ui/misc';
import { Stat } from '@/components/ui/stat';
import { WeekChip } from '@/components/planner/week-chip';

export const metadata: Metadata = { title: 'Dashboard' };

type E = Pick<TimeEntry, 'member_id' | 'project_id' | 'block' | 'day' | 'minutes'>;
type S = Pick<Submission, 'member_id' | 'project_id' | 'type' | 'status'>;

export default async function DashboardPage() {
  const ctx = await getSession();
  if (!ctx.project) return <SetupPrompt isManager={ctx.isManager} />;

  const { supabase: db, project, month, today, team } = ctx;
  const { start, end } = monthRange(month);

  const [entries, subs, planRes, timersRes] = await Promise.all([
    fetchAll<E>((f, t) => db.from('time_entries').select('id,member_id,project_id,block,day,minutes').gte('day', start).lt('day', end).order('id').range(f, t)),
    fetchAll<S>((f, t) => db.from('submissions').select('id,member_id,project_id,type,status').eq('month', month).order('id').range(f, t)),
    db.from('plan_tasks').select('*').eq('project_id', project.id).eq('month', month).order('position'),
    db.from('active_timers').select('*').order('started_at'),
  ]);
  const plan = (planRes.data ?? []) as PlanTask[];
  const timers = (timersRes.data ?? []) as ActiveTimer[];

  /* ---------- numbers ---------- */
  const days = daysInMonth(month);
  const curMonth = today.slice(0, 7);
  const elapsed = month < curMonth ? days : month === curMonth ? Number(today.slice(8, 10)) : 0;
  const cap = project.hrs_per_day * project.days_per_month * 60;
  const target = project.hrs_per_day * 60;
  const projEntries = entries.filter((e) => e.project_id === project.id);
  const logged = sum(projEntries, (e) => e.minutes);
  const planned = sum(plan, (r) => r.minutes);
  const pace = elapsed ? Math.round((logged / elapsed) * days) : 0;
  const projSubs = subs.filter((s) => s.project_id === project.id && s.status === 'done');

  const perDay = new Map<string, number>();
  for (const e of projEntries) perDay.set(e.day, (perDay.get(e.day) ?? 0) + e.minutes);
  const daily = Array.from({ length: days }, (_, i) => {
    const iso = `${month}-${pad(i + 1)}`;
    return { day: i + 1, iso, minutes: perDay.get(iso) ?? 0, sunday: new Date(`${iso}T00:00:00Z`).getUTCDay() === 0 };
  });
  const dailyMax = Math.max(target * 1.2, ...daily.map((d) => d.minutes), 60);

  const byBlock = BLOCKS.map((b) => ({
    ...b,
    plan: sum(plan.filter((r) => r.block === b.id), (r) => r.minutes),
    act: sum(projEntries.filter((e) => e.block === b.id), (e) => e.minutes),
  }));
  const blockMax = Math.max(1, ...byBlock.map((b) => Math.max(b.plan, b.act)));

  const people = team
    .map((m) => ({
      ...m,
      mins: sum(entries.filter((e) => e.member_id === m.id), (e) => e.minutes),
      projMins: sum(projEntries.filter((e) => e.member_id === m.id), (e) => e.minutes),
      subs: subs.filter((s) => s.member_id === m.id && s.status === 'done').length,
      live: timers.find((t) => t.member_id === m.id),
    }))
    .sort((a, b) => b.mins - a.mins);

  const typeCounts = new Map<string, number>();
  for (const s of projSubs) typeCounts.set(s.type, (typeCounts.get(s.type) ?? 0) + 1);
  const byType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]);
  const typeMax = Math.max(1, ...byType.map(([, n]) => n));
  const nameOf = Object.fromEntries(team.map((m) => [m.id, m.full_name]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={monthLabel(month)}
        title={project.name}
        description={`${project.client ? `${project.client} · ` : ''}${fmtHours(cap)} h contracted capacity this month`}
        actions={
          <>
            <a href={`/api/export?kind=time&project=${project.id}`} className={buttonVariants({ size: 'sm' })}><Download /> Time CSV</a>
            <a href={`/api/export?kind=submissions&project=${project.id}`} className={buttonVariants({ size: 'sm' })}><Download /> Submissions CSV</a>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat lead label="Hours logged" icon={<Clock />} value={fmtHours(logged)} unit="h"
          meter={{ value: logged, max: cap, tone: logged > cap ? 'bad' : 'accent' }} hint={`of ${fmtHours(cap)} h contracted`} />
        <Stat label="Pace to month end" icon={<TrendingUp />} value={fmtHours(pace)} unit="h"
          hint={!elapsed ? 'Month hasn’t started' : pace > cap ? `${fmtHours(pace - cap)} h over at this rate` : `${fmtHours(cap - pace)} h spare at this rate`} />
        <Stat label="Submissions" icon={<Link2 />} value={projSubs.length.toLocaleString('en-US')} hint={`${byType.length} active types`} />
        <Stat label="Plan coverage" icon={<Gauge />} value={`${Math.round(pct(logged, planned))}%`} hint={`${fmtHours(planned)} h planned`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Daily hours" description={`Logged against ${project.name}`} icon={<Activity />}>
            <span className="inline-flex items-center gap-2 text-xs text-ink-3">
              <span className="h-0 w-4 border-t border-dashed border-accent" /> {fmtHours(target)} h/day target
            </span>
          </CardHeader>
          <CardBody>
            <div className="relative flex h-52 items-end gap-[3px] sm:gap-1.5">
              <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent/60" style={{ bottom: `${pct(target, dailyMax)}%` }} />
              {daily.map((d) => (
                <div key={d.day} className="group relative flex h-full flex-1 items-end">
                  <div
                    className={cn(
                      'w-full rounded-t-[5px] transition-all duration-500 group-hover:brightness-110',
                      d.minutes >= target ? 'bg-linear-to-t from-accent/70 to-accent' : d.minutes > 0 ? 'bg-accent/40' : 'bg-surface-3',
                      d.iso === today && 'ring-2 ring-accent/40 ring-offset-2 ring-offset-surface',
                      d.sunday && d.minutes === 0 && 'opacity-40',
                    )}
                    style={{ height: `${Math.max(d.minutes ? 3 : 1.5, pct(d.minutes, dailyMax))}%` }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg bg-ink px-2 py-1 font-mono text-[11px] whitespace-nowrap text-bg shadow-lg group-hover:block">
                    {monthLabel(month, 'short').split(' ')[0]} {d.day} · {fmtHM(d.minutes)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10.5px] text-ink-3 tnum">
              <span>1</span><span>{Math.ceil(days / 2)}</span><span>{days}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Live now" description={`${timers.length} timer${timers.length === 1 ? '' : 's'} running`} icon={<Users />} />
          {timers.length ? (
            <ul className="divide-y divide-line">
              {timers.map((t) => (
                <li key={t.member_id} className="flex items-center gap-3 px-5 py-3">
                  <span className="relative">
                    <Avatar name={nameOf[t.member_id]} />
                    <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-surface bg-ok" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{nameOf[t.member_id] ?? 'Someone'}</p>
                    <p className="truncate text-xs text-ink-3">{t.task} · {BLOCK_NAME[t.block]}</p>
                  </div>
                  <span className="font-mono text-xs text-ink-3 tnum">since {t.start_label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nobody’s on the clock" description="Running timers appear here the moment they start." />
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Planned vs logged" description="Hours by work block" icon={<CalendarRange />} />
          <CardBody className="space-y-5">
            {byBlock.map((b) => (
              <div key={b.id}>
                <div className="mb-2 flex items-center justify-between text-[13px]">
                  <span className="inline-flex items-center gap-2 text-ink-2">
                    <span className="size-2 rounded-full" style={{ background: b.color }} />{b.name}
                  </span>
                  <span className={cn('font-mono text-xs tnum', b.act > b.plan && b.plan > 0 ? 'text-bad' : 'text-ink-3')}>
                    {fmtHours(b.act)} / {fmtHours(b.plan)} h
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full opacity-35" style={{ width: `${pct(b.plan, blockMax)}%`, background: b.color }} />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct(b.act, blockMax)}%`, background: b.color }} />
                  </div>
                </div>
              </div>
            ))}
            <p className="text-xs text-ink-3">Faint bar planned, solid bar logged.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Weekly progress" description="Click a cell to cycle its status" />
          {plan.length ? (
            <CardBody>
              <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,44px)] items-center gap-x-2 gap-y-1.5">
                <span />
                {[1, 2, 3, 4].map((w) => (
                  <span key={w} className="text-center text-[10.5px] font-medium tracking-[.12em] text-ink-3 uppercase">W{w}</span>
                ))}
                {plan.slice(0, 14).map((r) => (
                  <div key={r.id} className="contents">
                    <span className="truncate text-[13px] text-ink-2" title={r.task}>{r.task}</span>
                    {[0, 1, 2, 3].map((w) => (
                      <WeekChip key={w} id={r.id} week={w} status={r.weeks?.[w] ?? 'pend'} variant="cell" />
                    ))}
                  </div>
                ))}
              </div>
              {plan.length > 14 && (
                <p className="mt-4 text-xs text-ink-3">
                  First 14 of {plan.length} tasks — <Link href="/planner" className="text-accent hover:underline">see the full plan</Link>.
                </p>
              )}
            </CardBody>
          ) : (
            <EmptyState title="No plan yet" action={<Link href="/planner" className={buttonVariants({ size: 'sm' })}>Build the month</Link>} />
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Output by person" description={`All projects · ${monthLabel(month)}`} icon={<Users />} />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Person</th><th className="num">Hours</th><th className="num">This project</th><th className="num">Links</th><th className="num">Avg/day</th></tr>
              </thead>
              <tbody>
                {people.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.full_name} className="size-7 text-[10px]" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-medium">
                            {m.full_name}
                            {m.live && <span className="size-1.5 animate-pulse rounded-full bg-ok" title="Timer running" />}
                          </p>
                          <p className="text-[11px] text-ink-3">{m.role === 'manager' ? 'Manager' : 'Executive'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="num">{fmtHours(m.mins)}</td>
                    <td className="num text-ink-2">{fmtHours(m.projMins)}</td>
                    <td className="num">{m.subs}</td>
                    <td className="num text-ink-2">{fmtHours(elapsed ? m.mins / elapsed : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Submissions by type" description={project.name} icon={<Link2 />} />
          {byType.length ? (
            <CardBody className="space-y-3.5">
              {byType.slice(0, 10).map(([type, n]) => (
                <div key={type} className="grid grid-cols-[minmax(0,140px)_1fr_48px] items-center gap-3 text-[13px]">
                  <span className="truncate text-ink-2">{TYPE_NAME[type] ?? type}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-linear-to-r from-accent to-accent-2" style={{ width: `${pct(n, typeMax)}%` }} />
                  </div>
                  <span className="text-right font-mono text-ink-2 tnum">{n}</span>
                </div>
              ))}
            </CardBody>
          ) : (
            <EmptyState title="Nothing logged this month" action={<Link href="/links" className={buttonVariants({ size: 'sm' })}>Start logging</Link>} />
          )}
        </Card>
      </div>
    </div>
  );
}
