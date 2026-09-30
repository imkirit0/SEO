'use client';

import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { Ban, Check, ExternalLink, Search, Undo2 } from 'lucide-react';
import { logSubmission, undoSubmission } from '@/app/actions';
import { act } from '@/lib/act';
import { cn, dayLabel, hhmm, t5 } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusChip } from '@/components/ui/chip';
import { Input } from '@/components/ui/field';
import { Avatar, EmptyState, Segmented } from '@/components/ui/misc';

export type Hit = {
  site_id: string;
  member_id: string;
  day: string;
  start_time: string | null;
  end_time: string | null;
  status: 'done' | 'block';
};
type SiteRow = { id: string; url: string; da: number | null };
type Filter = 'all' | 'pending' | 'done' | 'block';
type OptAction = { kind: 'add'; hit: Hit } | { kind: 'remove'; siteId: string };

export function DaBadge({ da }: { da: number | null }) {
  if (da == null) return <span className="text-ink-3">—</span>;
  return (
    <span
      className={cn(
        'inline-block min-w-8 rounded-md px-1.5 py-0.5 text-center font-mono text-[11.5px] tnum',
        da >= 70 ? 'bg-accent-soft font-medium text-accent' : da >= 40 ? 'bg-surface-2 text-ink-2' : 'bg-surface-2 text-ink-3',
      )}
    >
      {da}
    </span>
  );
}

export function SiteTable({
  type,
  typeName,
  sites,
  hits,
  members,
  me,
  isManager,
  projectId,
  month,
  today,
  canLog,
}: {
  type: string;
  typeName: string;
  sites: SiteRow[];
  hits: Hit[];
  members: Record<string, string>;
  me: string;
  isManager: boolean;
  projectId: string;
  month: string;
  today: string;
  canLog: boolean;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(150);
  const [, start] = useTransition();
  const [optHits, apply] = useOptimistic(hits, (state: Hit[], a: OptAction) =>
    a.kind === 'add' ? [...state.filter((h) => h.site_id !== a.hit.site_id), a.hit] : state.filter((h) => h.site_id !== a.siteId),
  );

  const byId = useMemo(() => new Map(optHits.map((h) => [h.site_id, h])), [optHits]);
  const counts = useMemo(() => {
    let done = 0;
    let block = 0;
    for (const s of sites) {
      const h = byId.get(s.id);
      if (h?.status === 'done') done++;
      else if (h?.status === 'block') block++;
    }
    return { all: sites.length, pending: sites.length - done - block, done, block };
  }, [sites, byId]);

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      sites.filter((s) => {
        if (q && !s.url.includes(q)) return false;
        const h = byId.get(s.id);
        if (filter === 'pending') return !h;
        if (filter === 'done' || filter === 'block') return h?.status === filter;
        return true;
      }),
    [sites, q, filter, byId],
  );

  const log = (siteId: string, status: 'done' | 'block') =>
    start(async () => {
      const now = new Date();
      apply({ kind: 'add', hit: { site_id: siteId, member_id: me, day: today, start_time: null, end_time: hhmm(now), status } });
      await act(logSubmission({
        siteId, type, projectId, day: today, status,
        fallbackStart: hhmm(new Date(now.getTime() - 3 * 60000)),
        end: hhmm(now),
      }));
    });

  const undo = (siteId: string) =>
    start(async () => {
      apply({ kind: 'remove', siteId });
      await act(undoSubmission({ siteId, projectId, month }));
    });

  const label = (text: string, n: number) => (
    <>
      {text} <span className="font-mono text-[11px] text-ink-3 tnum">{n}</span>
    </>
  );

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold tracking-tight">{typeName}</h2>
          <p className="mt-0.5 text-[13px] text-ink-3">One master list, tracked per project per month</p>
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter sites…" className="pl-9" />
        </div>
      </div>
      <div className="overflow-x-auto border-b border-line px-5 py-3">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: label('All', counts.all) },
            { value: 'pending', label: label('Pending', counts.pending) },
            { value: 'done', label: label('Done', counts.done) },
            { value: 'block', label: label('Blocked', counts.block) },
          ]}
        />
      </div>

      {!sites.length ? (
        <EmptyState title={`No sites in ${typeName} yet`} description="Add sites in the Site Library — every project logs against the same master list." />
      ) : !shown.length ? (
        <EmptyState title="No matching sites" description="Try a different filter or search." />
      ) : (
        <div className="max-h-[640px] overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="num w-12">#</th>
                <th>Site</th>
                <th className="num">DA</th>
                <th>By</th>
                <th>Logged</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, limit).map((s, i) => {
                const h = byId.get(s.id);
                const canUndo = h && (h.member_id === me || isManager);
                return (
                  <tr key={s.id}>
                    <td className="num text-ink-3">{i + 1}</td>
                    <td>
                      <div className="flex min-w-0 items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(s.url)}&sz=32`}
                          alt=""
                          width={16}
                          height={16}
                          loading="lazy"
                          className="size-4 shrink-0 rounded-sm"
                        />
                        <span className={cn('max-w-[300px] truncate font-medium', h?.status === 'done' && 'text-ink-2')}>{s.url}</span>
                        <a
                          href={`https://${s.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${s.url}`}
                          className="text-ink-3 opacity-60 transition hover:text-accent hover:opacity-100"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="num"><DaBadge da={s.da} /></td>
                    <td>{h ? <Avatar name={members[h.member_id] ?? '?'} className="size-6 text-[9px]" /> : <span className="text-ink-3">—</span>}</td>
                    <td className="font-mono text-[12px] whitespace-nowrap text-ink-2 tnum">
                      {h ? `${dayLabel(h.day, { month: 'short', day: 'numeric' })} · ${t5(h.end_time) ?? ''}` : '—'}
                    </td>
                    <td><StatusChip status={h ? h.status : 'pend'} /></td>
                    <td className="text-right whitespace-nowrap">
                      {h ? (
                        canUndo && (
                          <Button size="sm" variant="ghost" onClick={() => undo(s.id)}>
                            <Undo2 /> Undo
                          </Button>
                        )
                      ) : canLog ? (
                        <div className="inline-flex items-center gap-1">
                          <Button size="sm" variant="soft" onClick={() => log(s.id, 'done')}>
                            <Check /> Done
                          </Button>
                          <Button size="icon-sm" variant="ghost" title="Mark blocked" aria-label="Mark blocked" className="text-ink-3 hover:text-bad" onClick={() => log(s.id, 'block')}>
                            <Ban />
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {shown.length > limit && (
            <div className="flex justify-center border-t border-line p-4">
              <Button size="sm" onClick={() => setLimit((l) => l + 300)}>
                Show more ({shown.length - limit} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
