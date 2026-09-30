import type { ButtonHTMLAttributes } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const variants = {
  primary:
    'bg-brand text-brand-ink shadow-[0_8px_20px_-12px_var(--brand)] hover:brightness-110',
  secondary: 'bg-surface text-ink border border-line-strong shadow-[0_1px_1px_rgba(0,0,0,.03)] hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-surface text-bad border border-line-strong hover:bg-bad-soft hover:border-bad/40',
  soft: 'bg-accent-soft text-accent hover:brightness-105',
};

const sizes = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[5px] [&_svg]:size-3.5',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-[5px] [&_svg]:size-4',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-[5px] [&_svg]:size-4',
  icon: 'size-9 justify-center rounded-[10px] [&_svg]:size-4',
  'icon-sm': 'size-8 justify-center rounded-lg [&_svg]:size-4',
};

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonVariants({
  variant = 'secondary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    'inline-flex shrink-0 items-center font-medium whitespace-nowrap transition-all duration-150 select-none',
    'active:scale-[.98] disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({ className, variant, size, loading, disabled, children, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonVariants({ variant, size, className })} disabled={disabled || loading} {...props}>
      {loading && <LoaderCircle className="animate-spin" />}
      {children}
    </button>
  );
}
