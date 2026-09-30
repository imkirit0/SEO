import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Meter, type MeterTone } from './meter';

export function Stat({
  label,
  value,
  unit,
  hint,
  icon,
  meter,
  lead,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  meter?: { value: number; max: number; tone?: MeterTone };
  lead?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('card relative overflow-hidden p-4 sm:p-5 animate-rise', className)}>
      {lead && (
        <>
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-accent to-transparent" />
          <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-accent/10 blur-3xl" />
        </>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium tracking-[.12em] text-ink-3 uppercase">{label}</p>
        {icon && <span className="text-ink-3 [&_svg]:size-4">{icon}</span>}
      </div>
      <p className="mt-2.5 font-mono text-[26px] leading-none font-medium tracking-tight text-ink tnum sm:text-[30px]">
        {value}
        {unit && <span className="ml-1 font-sans text-sm font-normal text-ink-3">{unit}</span>}
      </p>
      {meter && <Meter className="mt-3.5" value={meter.value} max={meter.max} tone={meter.tone} />}
      {hint && <p className="mt-2 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}
