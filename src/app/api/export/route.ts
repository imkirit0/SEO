import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BLOCK_NAME, STATUS_META, TYPE_NAME } from '@/lib/constants';
import type { Status } from '@/lib/types';
import { fetchAll, isMonth, monthRange, t5, todayIn } from '@/lib/utils';

/** Quote for CSV and neutralise spreadsheet formula injection. */
function cell(v: unknown) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const jar = await cookies();
  const m = jar.get('sd_month')?.value;
  const month = isMonth(m) ? m : todayIn(jar.get('sd_tz')?.value).slice(0, 7);
  const { start, end } = monthRange(month);
  const projectId = request.nextUrl.searchParams.get('project');
  const kind = request.nextUrl.searchParams.get('kind') === 'submissions' ? 'submissions' : 'time';

  const [{ data: profiles }, { data: projects }] = await Promise.all([
    supabase.from('profiles').select('id,full_name'),
    supabase.from('projects').select('id,name'),
  ]);
  const who = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
  const proj = Object.fromEntries((projects ?? []).map((p) => [p.id, p.name]));

  let rows: unknown[][];
  if (kind === 'time') {
    const data = await fetchAll<any>((f, t) => {
      let q = supabase.from('time_entries').select('*').gte('day', start).lt('day', end);
      if (projectId) q = q.eq('project_id', projectId);
      return q.order('day').order('id').range(f, t);
    });
    rows = [
      ['Date', 'Person', 'Project', 'Block', 'Task', 'Start', 'End', 'Minutes', 'Hours', 'Status'],
      ...data.map((e) => [
        e.day, who[e.member_id] ?? '', proj[e.project_id] ?? '', BLOCK_NAME[e.block] ?? e.block, e.task,
        t5(e.start_time) ?? '', t5(e.end_time) ?? '', e.minutes, (e.minutes / 60).toFixed(2),
        STATUS_META[e.status as Status]?.label ?? e.status,
      ]),
    ];
  } else {
    const data = await fetchAll<any>((f, t) => {
      let q = supabase.from('submissions').select('*, sites(url,da)').eq('month', month);
      if (projectId) q = q.eq('project_id', projectId);
      return q.order('day').order('id').range(f, t);
    });
    rows = [
      ['Date', 'Person', 'Project', 'Type', 'Site', 'DA', 'Start', 'End', 'Status'],
      ...data.map((s) => [
        s.day, who[s.member_id] ?? '', proj[s.project_id] ?? '', TYPE_NAME[s.type] ?? s.type,
        s.sites?.url ?? '', s.sites?.da ?? '', t5(s.start_time) ?? '', t5(s.end_time) ?? '',
        s.status === 'block' ? 'Blocked' : 'Done',
      ]),
    ];
  }

  const csv = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
  const label = projectId && proj[projectId] ? `${proj[projectId]}-` : '';
  const filename = `${label}${kind}-${month}.csv`.replace(/[^\w.-]+/g, '-');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
