'use client';

import { useOptimistic, useTransition } from 'react';
import { cyclePlanWeek } from '@/app/actions';
import { act } from '@/lib/act';
import { STATUS_META, STATUS_ORDER } from '@/lib/constants';
import type { Status } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TONE_CLASS } from '@/components/ui/chip';

const next = (s: Status) => STATUS_ORDER[(STATUS_ORDER.indexOf(s) + 1) % STATUS_ORDER.length];

const CELL: Record<Status, string> = {
  pend: 'bg-surface-3 hover:bg-line-strong',
  prog: 'bg-warn',
  done: 'bg-ok',
  block: 'bg-bad',
};

/** Click to cycle Pending → In progress → Done → Blocked. */
export function WeekChip({ id, week, status, variant = 'chip' }: { id: string; week: number; status: Status; variant?: 'chip' | 'letter' | 'cell' }) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [, start] = useTransition();
  const meta = STATUS_META[optimistic];

  const onClick = () =>
    start(async () => {
      setOptimistic(next(optimistic));
      await act(cyclePlanWeek(id, week));
    });

  const title = `Week ${week + 1}: ${meta.label} — click to change`;

  if (variant === 'cell') {
    return <button type="button" title={title} aria-label={title} onClick={onClick} className={cn('h-6 w-full rounded-md transition', CELL[optimistic])} />;
  }
  if (variant === 'letter') {
    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        onClick={onClick}
        className={cn('grid size-7 place-items-center rounded-lg font-mono text-[11px] font-semibold transition hover:scale-105', TONE_CLASS[meta.tone])}
      >
        {meta.label[0]}
      </button>
    );
  }
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap transition hover:brightness-95', TONE_CLASS[meta.tone])}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </button>
  );
}
