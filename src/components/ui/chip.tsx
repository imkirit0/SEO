import type { ReactNode } from 'react';
import { STATUS_META, type Tone } from '@/lib/constants';
import type { Status } from '@/lib/types';
import { cn } from '@/lib/utils';

export const TONE_CLASS: Record<Tone, string> = {
  idle: 'bg-idle-soft text-idle',
  warn: 'bg-warn-soft text-warn',
  ok: 'bg-ok-soft text-ok',
  bad: 'bg-bad-soft text-bad',
  accent: 'bg-accent-soft text-accent',
};

export function Chip({ tone = 'idle', dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap', TONE_CLASS[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusChip({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.done;
  return (
    <Chip tone={meta.tone} dot className={className}>
      {meta.label}
    </Chip>
  );
}
