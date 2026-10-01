/**
 * Demo mode: an in-memory, Supabase-shaped client used when no Supabase project is configured.
 * Covers the subset of the PostgREST query builder this app uses. Data resets on server restart.
 */

type Row = Record<string, any>;
type Tables = Record<string, Row[]>;
type DbError = { message: string; code?: string };
type Result = { data: any; error: DbError | null; count?: number | null };

export const DEMO_USER = {
  id: 'demo-alex',
  email: 'alex@demo.desk',
  user_metadata: { full_name: 'Alex Morgan' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

/* ============================ seed data ============================ */
// Starts empty — just the demo user and the default daily quotas (same as the SQL migration).
function seed(): Tables {
  return {
    profiles: [{ id: DEMO_USER.id, full_name: DEMO_USER.user_metadata.full_name, email: DEMO_USER.email, role: 'manager', created_at: DEMO_USER.created_at }],
    projects: [], sites: [], plan_tasks: [], time_entries: [], submissions: [], active_timers: [],
    quotas: [
      { type: 'social-bookmarking', per_day: 30 },
      { type: 'classified-submission', per_day: 2 },
      { type: 'directory-submission', per_day: 2 },
      { type: 'blog-submission', per_day: 2 },
    ],
  };
}

const store = globalThis as unknown as { __demoDb?: Tables };
const tables = () => (store.__demoDb ??= seed());

/* ============================ query builder ============================ */
const DEFAULTS: Record<string, () => Row> = {
  projects: () => ({ client: '', hrs_per_day: 7.25, days_per_month: 26 }),
  sites: () => ({ da: null, created_by: DEMO_USER.id }),
  submissions: () => ({ member_id: DEMO_USER.id, status: 'done', start_time: null, end_time: null }),
  time_entries: () => ({ member_id: DEMO_USER.id, project_id: null, minutes: 0, status: 'done', start_time: null, end_time: null }),
  plan_tasks: () => ({ freq: 'Weekly', minutes: 60, rate: '', notes: '', weeks: ['pend', 'pend', 'pend', 'pend'], position: 0 }),
  quotas: () => ({ per_day: 0 }),
  active_timers: () => ({ member_id: DEMO_USER.id, started_at: new Date().toISOString() }),
  profiles: () => ({ role: 'exec' }),
};
const NO_ID = new Set(['quotas', 'active_timers']);
const UNIQUE: Record<string, string[][]> = {
  sites: [['type', 'url']],
  submissions: [['project_id', 'site_id', 'month']],
  quotas: [['type']],
  active_timers: [['member_id']],
};

const cmp = (a: any, b: any) => (a < b ? -1 : a > b ? 1 : 0);
const sameKeys = (a: Row, b: Row, keys: string[]) => keys.every((k) => String(a[k]) === String(b[k]));

function splitTop(cols: string) {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of cols) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

class DemoQuery implements PromiseLike<Result> {
  private op: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select';
  private columns = '*';
  private returning = false;
  private count = false;
  private head = false;
  private filters: ((r: Row) => boolean)[] = [];
  private orders: { col: string; asc: boolean; nullsFirst: boolean }[] = [];
  private window: { from: number; to: number } | null = null;
  private max: number | null = null;
  private single_: 'one' | 'maybe' | null = null;
  private payload: Row[] = [];
  private patch: Row = {};
  private conflict: string[] = [];
  private ignoreDuplicates = false;

  constructor(private table: string) {}

  select(cols = '*', opts?: { count?: string; head?: boolean }) {
    this.columns = cols;
    if (this.op === 'select') {
      this.count = opts?.count === 'exact';
      this.head = !!opts?.head;
    } else this.returning = true;
    return this;
  }
  insert(v: Row | Row[]) { this.op = 'insert'; this.payload = [v].flat(); return this; }
  upsert(v: Row | Row[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = 'upsert';
    this.payload = [v].flat();
    this.conflict = (opts?.onConflict ?? (NO_ID.has(this.table) ? UNIQUE[this.table][0].join(',') : 'id')).split(',').map((s) => s.trim());
    this.ignoreDuplicates = !!opts?.ignoreDuplicates;
    return this;
  }
  update(patch: Row) { this.op = 'update'; this.patch = patch; return this; }
  delete() { this.op = 'delete'; return this; }

  eq(c: string, v: any) { this.filters.push((r) => String(r[c]) === String(v)); return this; }
  neq(c: string, v: any) { this.filters.push((r) => String(r[c]) !== String(v)); return this; }
  gt(c: string, v: any) { this.filters.push((r) => r[c] != null && cmp(r[c], v) > 0); return this; }
  gte(c: string, v: any) { this.filters.push((r) => r[c] != null && cmp(r[c], v) >= 0); return this; }
  lt(c: string, v: any) { this.filters.push((r) => r[c] != null && cmp(r[c], v) < 0); return this; }
  lte(c: string, v: any) { this.filters.push((r) => r[c] != null && cmp(r[c], v) <= 0); return this; }
  in(c: string, vs: any[]) { this.filters.push((r) => vs.map(String).includes(String(r[c]))); return this; }
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    const asc = opts?.ascending ?? true;
    this.orders.push({ col, asc, nullsFirst: opts?.nullsFirst ?? !asc });
    return this;
  }
  range(from: number, to: number) { this.window = { from, to }; return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.single_ = 'one'; return this; }
  maybeSingle() { this.single_ = 'maybe'; return this; }

  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, fail?: ((e: any) => B | PromiseLike<B>) | null) {
    return Promise.resolve().then(() => this.exec()).then(ok, fail);
  }

  private project(rows: Row[]) {
    const db = tables();
    const parts = splitTop(this.columns);
    return rows.map((row) => {
      let out: Row = {};
      for (const part of parts) {
        const rel = part.match(/^(\w+)\((.*)\)$/);
        if (part === '*') out = { ...out, ...structuredClone(row) };
        else if (rel) {
          const target = db[rel[1]]?.find((t) => t.id === row[`${rel[1].replace(/s$/, '')}_id`]);
          out[rel[1]] = target ? new DemoQuery(rel[1]).select(rel[2]).project([target])[0] : null;
        } else out[part] = structuredClone(row[part]);
      }
      return out;
    });
  }

  private finish(rows: Row[], count?: number): Result {
    if (this.single_) {
      if (rows.length === 1) return { data: rows[0], error: null };
      if (rows.length === 0 && this.single_ === 'maybe') return { data: null, error: null };
      return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } };
    }
    return { data: rows, error: null, count: count ?? null };
  }

  private exec(): Result {
    const db = tables();
    const all = (db[this.table] ??= []);
    const matched = () => all.filter((r) => this.filters.every((f) => f(r)));

    if (this.op === 'select') {
      let rows = matched();
      for (const { col, asc, nullsFirst } of [...this.orders].reverse()) {
        rows = [...rows].sort((a, b) => {
          if (a[col] == null || b[col] == null) {
            if (a[col] == null && b[col] == null) return 0;
            return (a[col] == null) === nullsFirst ? -1 : 1;
          }
          return asc ? cmp(a[col], b[col]) : cmp(b[col], a[col]);
        });
      }
      const total = rows.length;
      if (this.window) rows = rows.slice(this.window.from, this.window.to + 1);
      if (this.max != null) rows = rows.slice(0, this.max);
      if (this.head) return { data: null, error: null, count: total };
      return this.finish(this.project(rows), this.count ? total : undefined);
    }

    let changed: Row[] = [];
    if (this.op === 'insert' || this.op === 'upsert') {
      const fresh: Row[] = [];
      for (const input of this.payload) {
        const existing = this.op === 'upsert' ? all.find((r) => sameKeys(r, input, this.conflict)) : undefined;
        if (existing) {
          if (!this.ignoreDuplicates) { Object.assign(existing, structuredClone(input)); changed.push(existing); }
          continue;
        }
        const row: Row = {
          ...(NO_ID.has(this.table) ? {} : { id: crypto.randomUUID(), created_at: new Date().toISOString() }),
          ...DEFAULTS[this.table]?.(),
          ...structuredClone(input),
        };
        const clash = (UNIQUE[this.table] ?? []).some((keys) => [...all, ...fresh].some((r) => sameKeys(r, row, keys)));
        if (clash) {
          if (this.op === 'upsert' && this.ignoreDuplicates) continue;
          return { data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } };
        }
        fresh.push(row);
      }
      all.push(...fresh);
      changed.push(...fresh);
    } else if (this.op === 'update') {
      changed = matched();
      changed.forEach((r) => Object.assign(r, structuredClone(this.patch)));
    } else {
      changed = matched();
      db[this.table] = all.filter((r) => !changed.includes(r));
    }

    if (!this.returning) return { data: null, error: null };
    return this.finish(this.project(changed));
  }
}

export function createDemoClient() {
  const ok = async () => ({ data: { user: DEMO_USER, session: {} }, error: null });
  const channel = { on: () => channel, subscribe: () => channel };
  return {
    from: (table: string) => new DemoQuery(table),
    rpc: async (fn: string, args: Row = {}): Promise<Result> => {
      const db = tables();
      const tally = (rows: Row[]) =>
        Object.entries(rows.reduce<Record<string, number>>((acc, r) => ((acc[r.type] = (acc[r.type] ?? 0) + 1), acc), {}))
          .map(([type, n]) => ({ type, n }));
      if (fn === 'site_type_counts') return { data: tally(db.sites), error: null };
      if (fn === 'submission_type_counts') {
        return {
          data: tally(db.submissions.filter((s) => s.project_id === args.p_project && s.month === args.p_month && s.status === 'done')),
          error: null,
        };
      }
      return { data: null, error: { message: `Unknown function ${fn}` } };
    },
    auth: {
      getUser: ok,
      signOut: async () => ({ error: null }),
      exchangeCodeForSession: ok,
      verifyOtp: ok,
      updateUser: ok,
      admin: { inviteUserByEmail: async () => ({ data: null, error: { message: 'Invites are disabled in demo mode.' } }) },
    },
    channel: () => channel,
    removeChannel: async () => 'ok',
  };
}
