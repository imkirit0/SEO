import { cn, pct } from '@/lib/utils';

const tones = {
  accent: 'bg-linear-to-r from-accent to-accent-2',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  muted: 'bg-ink-3',
};
export type MeterTone = keyof typeof tones;

export function Meter({
  value,
  max,
  tone = 'accent',
  className,
  color,
}: {
  value: number;
  max: number;
  tone?: MeterTone;
  className?: string;
  color?: string;
}) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', !color && tones[tone])}
        style={{ width: `${pct(value, max)}%`, background: color }}
      />
    </div>
  );
}
