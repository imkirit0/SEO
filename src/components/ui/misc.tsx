import type { ReactNode } from 'react';
import Link from 'next/link';
import { FolderKanban } from 'lucide-react';
import { cn, initials } from '@/lib/utils';
import { buttonVariants } from './button';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-medium tracking-[.16em] text-brand uppercase">{eyebrow}</p>}
        <h1 className="mt-1.5 text-2xl font-medium tracking-tight text-balance text-accent dark:text-ink sm:text-[30px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-12 text-center', className)}>
      {icon && (
        <span className="grid size-12 place-items-center rounded-2xl border border-line bg-surface-2 text-ink-2 [&_svg]:size-5">
          {icon}
        </span>
      )}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description && <div className="max-w-md text-sm text-ink-3">{description}</div>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function SetupPrompt({ isManager }: { isManager: boolean }) {
  return (
    <div className="card">
      <EmptyState
        className="py-20"
        icon={<FolderKanban />}
        title="Set the desk up first"
        description="Add the client projects your team logs work against. The daily log, the 24 submission trackers and the monthly plan all hang off them."
        action={
          isManager ? (
            <Link href="/admin" className={buttonVariants({ variant: 'primary' })}>
              Add a project
            </Link>
          ) : (
            <p className="text-sm text-ink-3">Ask a manager to create the first project.</p>
          )
        }
      />
    </div>
  );
}

export function Avatar({ name, className }: { name?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-accent to-accent-2 text-[11px] font-semibold text-accent-ink',
        className,
      )}
      title={name ?? undefined}
    >
      {initials(name)}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center gap-0.5 rounded-[10px] border border-line bg-surface-2 p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium whitespace-nowrap transition',
            o.value === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
