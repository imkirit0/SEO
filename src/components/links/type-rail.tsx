import Link from 'next/link';
import { cn, pct } from '@/lib/utils';

export type RailRow = { id: string; name: string; total: number; done?: number; quota?: number };

export function TypeRail({ basePath, active, rows }: { basePath: string; active: string; rows: RailRow[] }) {
  return (
    <nav aria-label="Submission types" className="card p-2 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto">
      <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {rows.map((r) => {
          const on = r.id === active;
          return (
            <Link
              key={r.id}
              href={`${basePath}?type=${r.id}`}
              scroll={false}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'group shrink-0 rounded-xl px-3 py-2.5 transition lg:w-full',
                on ? 'bg-accent-soft' : 'hover:bg-surface-2',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={cn('text-[13px] font-medium whitespace-nowrap', on ? 'text-accent' : 'text-ink-2 group-hover:text-ink')}>
                  {r.name}
                </span>
                <span className="font-mono text-[11px] text-ink-3 tnum">
                  {r.done !== undefined ? `${r.done}/${r.total}` : r.total}
                </span>
              </div>
              {r.done !== undefined && (
                <div className="mt-2 hidden h-1 overflow-hidden rounded-full bg-surface-3 lg:block">
                  <div
                    className={cn('h-full rounded-full', r.total && r.done >= r.total ? 'bg-ok' : 'bg-accent')}
                    style={{ width: `${pct(r.done, r.total)}%` }}
                  />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
