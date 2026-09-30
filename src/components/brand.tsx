import Image from 'next/image';
import { cn } from '@/lib/utils';
import logo from '../../public/gtec-logo.webp';

/** Official G-TEC wordmark (white on transparent) — place it on the royal-blue `bg-nav` band. */
export function GtecLogo({ className, subtitle = 'Submission Desk' }: { className?: string; subtitle?: string | null }) {
  return (
    <span className={cn('inline-flex items-center gap-3 text-white', className)}>
      <Image src={logo} alt="G-TEC Education" className="h-9 w-auto" priority />
      {subtitle && (
        <span className="border-l border-white/25 pl-3 text-[11px] leading-tight font-medium tracking-[.14em] uppercase">
          {subtitle}
        </span>
      )}
    </span>
  );
}
