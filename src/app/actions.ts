'use server';

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { BLOCK_IDS, FREQUENCIES, PLAN_TEMPLATE, STATUS_ORDER, TYPE_NAME } from '@/lib/constants';
import type { ActionResult } from '@/lib/result';
import type { BlockId, Status } from '@/lib/types';
import { hostOf, isDay, isMonth, minsBetween, shiftMonth } from '@/lib/utils';

type Db = Awaited<ReturnType<typeof createClient>>;
type Ctx = { db: Db; userId: string };
type DbResult = { data: any; error: { message: string; code?: string } | null };

/* ============================ plumbing ============================ */
async function run<T>(fn: (ctx: Ctx) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return { ok: false, error: 'Your session has expired — sign in again.' };
    const data = await fn({ db, userId: user.id });
    revalidatePath('/', 'layout');
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong' };
  }
}

function must(res: DbResult, friendly: Record<string, string> = {}) {
  if (res.error) throw new Error(friendly[res.error.code ?? ''] ?? res.error.message);
  return res.data;
}

/** For deletes/updates: RLS filters silently, so zero affected rows means "not allowed". */
function affected(res: DbResult, message = 'You don’t have permission to change that.') {
  const rows = must(res);
  if (!rows || rows.length === 0) throw new Error(message);
  return rows;
}

async function assertManager({ db, userId }: Ctx) {
  const { data } = await db.from('profiles').select('role').eq('id', userId).single();
  if (data?.role !== 'manager') throw new Error('Only managers can do that.');
}

const text = (v: unknown, max = 300) => String(v ?? '').trim().slice(0, max);
const HHMM = /^\d{2}:\d{2}$/;
function time(v: unknown) {
  const s = text(v, 5);
  if (!HHMM.test(s)) throw new Error('Times must look like 09:30.');
  return s;
}
function block(v: unknown): BlockId {
  if (!BLOCK_IDS.includes(v as BlockId)) throw new Error('Unknown work block.');
  return v as BlockId;
}
function day(v: unknown) {
  if (!isDay(v as string)) throw new Error('Invalid date.');
  return v as string;
}
function month(v: unknown) {
  if (!isMonth(v as string)) throw new Error('Invalid month.');
  return v as string;
}
function submissionType(v: unknown) {
  if (!TYPE_NAME[v as string]) throw new Error('Unknown submission type.');
  return v as string;
}

/* ============================ preferences ============================ */
export async function setPreference(key: 'sd_project' | 'sd_month', value: string) {
  if (key === 'sd_month' && !isMonth(value)) return;
  if (key !== 'sd_month' && key !== 'sd_project') return;
  (await cookies()).set(key, value, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  revalidatePath('/', 'layout');
}

/* ============================ timer & time log ============================ */
export async function startTimer(input: { task: string; block: string; projectId: string | null; day: string; startLabel: string }) {
  return run(async ({ db, userId }) => {
    const task = text(input.task, 200);
    if (!task) throw new Error('Describe what you’re working on.');
    must(await db.from('active_timers').upsert({
      member_id: userId,
      task,
      block: block(input.block),
      project_id: input.projectId,
      day: day(input.day),
      start_label: time(input.startLabel),
      started_at: new Date().toISOString(),
    }, { onConflict: 'member_id' }));
  });
}

export async function stopTimer(input: { endLabel: string; status: Status }) {
  return run(async ({ db, userId }) => {
    const timer = must(await db.from('active_timers').select('*').eq('member_id', userId).maybeSingle());
    if (!timer) throw new Error('No timer is running.');
    const status = STATUS_ORDER.includes(input.status) ? input.status : 'done';
    const minutes = Math.max(1, Math.round((Date.now() - new Date(timer.started_at).getTime()) / 60000));
    must(await db.from('time_entries').insert({
      member_id: userId,
      project_id: timer.project_id,
      day: timer.day,
      task: timer.task,
      block: timer.block,
      start_time: timer.start_label,
      end_time: time(input.endLabel),
      minutes,
      status,
    }));
    must(await db.from('active_timers').delete().eq('member_id', userId));
    return { minutes, task: timer.task as string };
  });
}

export async function discardTimer() {
  return run(async ({ db, userId }) => {
    must(await db.from('active_timers').delete().eq('member_id', userId));
  });
}

export async function addTimeEntry(input: {
  day: string; task: string; block: string; projectId: string | null; start: string; end: string; status: Status;
}) {
  return run(async ({ db, userId }) => {
    const task = text(input.task, 200);
    if (!task) throw new Error('Give the entry a task name.');
    const start = time(input.start);
    const end = time(input.end);
    must(await db.from('time_entries').insert({
      member_id: userId,
      project_id: input.projectId,
      day: day(input.day),
      task,
      block: block(input.block),
      start_time: start,
      end_time: end,
      minutes: minsBetween(start, end),
      status: STATUS_ORDER.includes(input.status) ? input.status : 'done',
    }));
  });
}

export async function deleteTimeEntry(id: string) {
  return run(async ({ db }) => {
    affected(await db.from('time_entries').delete().eq('id', id).select('id'));
  });
}

/* ============================ link building ============================ */
export async function logSubmission(input: {
  siteId: string; type: string; projectId: string; day: string; status: 'done' | 'block'; fallbackStart: string; end: string;
}) {
  return run(async ({ db, userId }) => {
    const d = day(input.day);
    const last = must(await db.from('submissions').select('end_time')
      .eq('member_id', userId).eq('day', d).order('created_at', { ascending: false }).limit(1).maybeSingle());
    must(await db.from('submissions').insert({
      member_id: userId,
      project_id: input.projectId,
      site_id: input.siteId,
      type: submissionType(input.type),
      day: d,
      month: d.slice(0, 7),
      start_time: last?.end_time ? String(last.end_time).slice(0, 5) : time(input.fallbackStart),
      end_time: time(input.end),
      status: input.status === 'block' ? 'block' : 'done',
    }), { '23505': 'That site is already logged for this project this month.' });
  });
}

export async function undoSubmission(input: { siteId: string; projectId: string; month: string }) {
  return run(async ({ db }) => {
    affected(await db.from('submissions').delete()
      .eq('site_id', input.siteId).eq('project_id', input.projectId).eq('month', month(input.month)).select('id'),
    'Only the person who logged it (or a manager) can undo this.');
  });
}

/* ============================ site library ============================ */
export async function addSites(type: string, raw: string) {
  return run(async ({ db }) => {
    const t = submissionType(type);
    const seen = new Set<string>();
    const rows: { type: string; url: string; da: number | null }[] = [];
    for (const line of String(raw).split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const m = trimmed.match(/^(.*?)[,;\s\t]+(\d{1,3})$/);
      const url = hostOf(m ? m[1] : trimmed);
      if (!url || !url.includes('.') || seen.has(url)) continue;
      seen.add(url);
      rows.push({ type: t, url, da: m ? Math.min(100, Number(m[2])) : null });
    }
    if (!rows.length) throw new Error('No valid sites found — one domain per line.');
    let added = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const inserted = must(await db.from('sites')
        .upsert(rows.slice(i, i + 500), { onConflict: 'type,url', ignoreDuplicates: true }).select('id'));
      added += inserted?.length ?? 0;
    }
    return { added, skipped: rows.length - added };
  });
}

export async function deleteSite(id: string) {
  return run(async ({ db }) => {
    affected(await db.from('sites').delete().eq('id', id).select('id'),
      'Only the person who added this site (or a manager) can remove it.');
  });
}

export async function clearSites(type: string) {
  return run(async (ctx) => {
    await assertManager(ctx);
    must(await ctx.db.from('sites').delete().eq('type', submissionType(type)));
  });
}

/* ============================ monthly plan ============================ */
const freshWeeks = (): Status[] => ['pend', 'pend', 'pend', 'pend'];

export async function loadTemplatePlan(projectId: string, ym: string) {
  return run(async (ctx) => {
    await assertManager(ctx);
    const m = month(ym);
    must(await ctx.db.from('plan_tasks').insert(PLAN_TEMPLATE.map(([b, freq, task, minutes, rate, notes], position) => ({
      project_id: projectId, month: m, block: b, freq, task, minutes, rate, notes, weeks: freshWeeks(), position,
    }))));
  });
}

export async function copyPreviousPlan(projectId: string, ym: string) {
  return run(async (ctx) => {
    await assertManager(ctx);
    const m = month(ym);
    const prev = must(await ctx.db.from('plan_tasks').select('*')
      .eq('project_id', projectId).eq('month', shiftMonth(m, -1)).order('position'));
    if (!prev?.length) throw new Error('Last month has no plan to copy.');
    must(await ctx.db.from('plan_tasks').insert(prev.map((r: any, position: number) => ({
      project_id: projectId, month: m, block: r.block, freq: r.freq, task: r.task,
      minutes: r.minutes, rate: r.rate, notes: r.notes, weeks: freshWeeks(), position,
    }))));
    return { count: prev.length as number };
  });
}

export async function addPlanTask(projectId: string, ym: string, blockId: string) {
  return run(async (ctx) => {
    await assertManager(ctx);
    const { count } = await ctx.db.from('plan_tasks').select('id', { count: 'exact', head: true })
      .eq('project_id', projectId).eq('month', month(ym));
    must(await ctx.db.from('plan_tasks').insert({
      project_id: projectId, month: ym, block: block(blockId), freq: 'Weekly',
      task: 'New task', minutes: 60, weeks: freshWeeks(), position: count ?? 0,
    }));
  });
}

export async function updatePlanTask(id: string, patch: { task?: string; freq?: string; minutes?: number; rate?: string; notes?: string }) {
  return run(async (ctx) => {
    await assertManager(ctx);
    const clean: Record<string, unknown> = {};
    if (patch.task !== undefined) clean.task = text(patch.task, 200) || 'Untitled task';
    if (patch.freq !== undefined && (FREQUENCIES as readonly string[]).includes(patch.freq)) clean.freq = patch.freq;
    if (patch.minutes !== undefined) clean.minutes = Math.max(0, Math.round(Number(patch.minutes) || 0));
    if (patch.rate !== undefined) clean.rate = text(patch.rate, 60);
    if (patch.notes !== undefined) clean.notes = text(patch.notes, 300);
    affected(await ctx.db.from('plan_tasks').update(clean).eq('id', id).select('id'));
  });
}

export async function cyclePlanWeek(id: string, week: number) {
  return run(async ({ db }) => {
    if (![0, 1, 2, 3].includes(week)) throw new Error('Invalid week.');
    const row = must(await db.from('plan_tasks').select('weeks').eq('id', id).single());
    const weeks: Status[] = [...(row.weeks ?? freshWeeks())];
    while (weeks.length < 4) weeks.push('pend');
    weeks[week] = STATUS_ORDER[(STATUS_ORDER.indexOf(weeks[week]) + 1) % STATUS_ORDER.length];
    affected(await db.from('plan_tasks').update({ weeks }).eq('id', id).select('id'));
  });
}

export async function deletePlanTask(id: string) {
  return run(async (ctx) => {
    await assertManager(ctx);
    affected(await ctx.db.from('plan_tasks').delete().eq('id', id).select('id'));
  });
}

/* ============================ projects, team, quotas ============================ */
export async function createProject(input: { name: string; client: string }) {
  return run(async (ctx) => {
    await assertManager(ctx);
    const name = text(input.name, 120);
    if (!name) throw new Error('Name the project.');
    const row = must(await ctx.db.from('projects').insert({ name, client: text(input.client, 120) }).select('id').single());
    (await cookies()).set('sd_project', row.id, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
    return { id: row.id as string };
  });
}

export async function updateProject(id: string, patch: { name?: string; client?: string; hrs_per_day?: number; days_per_month?: number }) {
  return run(async (ctx) => {
    await assertManager(ctx);
    const clean: Record<string, unknown> = {};
    if (patch.name !== undefined) clean.name = text(patch.name, 120) || 'Untitled project';
    if (patch.client !== undefined) clean.client = text(patch.client, 120);
    if (patch.hrs_per_day !== undefined) clean.hrs_per_day = Math.min(24, Math.max(0, Number(patch.hrs_per_day) || 0));
    if (patch.days_per_month !== undefined) clean.days_per_month = Math.min(31, Math.max(0, Math.round(Number(patch.days_per_month) || 0)));
    affected(await ctx.db.from('projects').update(clean).eq('id', id).select('id'));
  });
}

export async function deleteProject(id: string) {
  return run(async (ctx) => {
    await assertManager(ctx);
    affected(await ctx.db.from('projects').delete().eq('id', id).select('id'));
  });
}

export async function updateMember(id: string, patch: { full_name?: string; role?: 'manager' | 'exec' }) {
  return run(async (ctx) => {
    const clean: Record<string, unknown> = {};
    if (patch.full_name !== undefined) clean.full_name = text(patch.full_name, 120);
    if (patch.role !== undefined) {
      await assertManager(ctx);
      if (patch.role !== 'manager' && patch.role !== 'exec') throw new Error('Unknown role.');
      if (id === ctx.userId && patch.role === 'exec') {
        const { count } = await ctx.db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'manager');
        if ((count ?? 0) <= 1) throw new Error('The desk needs at least one manager.');
      }
      clean.role = patch.role;
    }
    affected(await ctx.db.from('profiles').update(clean).eq('id', id).select('id'));
  });
}

export async function inviteMember(input: { email: string; fullName: string }) {
  return run(async (ctx) => {
    await assertManager(ctx);
    const admin = createAdminClient();
    if (!admin) throw new Error('Invites need SUPABASE_SERVICE_ROLE_KEY on the server.');
    const email = text(input.email, 200).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.');
    const origin = process.env.NEXT_PUBLIC_SITE_URL || (await headers()).get('origin') || '';
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: text(input.fullName, 120) },
      redirectTo: `${origin}/auth/callback?next=/settings`,
    });
    if (error) throw new Error(error.message);
    return { email };
  });
}

export async function setQuota(type: string, perDay: number) {
  return run(async (ctx) => {
    await assertManager(ctx);
    must(await ctx.db.from('quotas').upsert(
      { type: submissionType(type), per_day: Math.max(0, Math.round(Number(perDay) || 0)) },
      { onConflict: 'type' },
    ));
  });
}
