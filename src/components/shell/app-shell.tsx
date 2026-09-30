'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition, type ReactNode } from 'react';
import {
  CalendarRange, ChevronLeft, ChevronRight, ChevronsUpDown, FolderKanban, LayoutDashboard,
  Library, Link2, LoaderCircle, LogOut, Menu, Settings, Timer, Users, X, type LucideIcon,
} from 'lucide-react';
import { setPreference } from '@/app/actions';
import type { Profile, Project } from '@/lib/types';
import { cn, monthLabel, shiftMonth } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar } from '@/components/ui/misc';
import { GtecLogo } from '@/components/brand';
import { RealtimeRefresh } from './realtime';

const NAV: { group: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  { group: 'Execute', items: [
    { href: '/today', label: 'Today', icon: Timer },
    { href: '/links', label: 'Link Building', icon: Link2 },
  ] },
  { group: 'Plan & review', items: [
    { href: '/planner', label: 'Monthly Plan', icon: CalendarRange },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ] },
  { group: 'Setup', items: [
    { href: '/library', label: 'Site Library', icon: Library },
    { href: '/admin', label: 'Team & Projects', icon: Users },
  ] },
];

const TITLES: Record<string, string> = {
  '/today': 'Today', '/links': 'Link Building', '/planner': 'Monthly Plan', '/dashboard': 'Dashboard',
  '/library': 'Site Library', '/admin': 'Team & Projects', '/settings': 'Settings',
};

export function AppShell({
  profile,
  projects,
  projectId,
  month,
  currentMonth,
  children,
}: {
  profile: Profile;
  projects: Project[];
  projectId: string | null;
  month: string;
  currentMonth: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  // Keep the server's idea of "today" in the viewer's timezone.
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const current = document.cookie.split('; ').find((c) => c.startsWith('sd_tz='))?.slice(6);
    if (tz && decodeURIComponent(current ?? '') !== tz) {
      document.cookie = `sd_tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [router]);

  return (
    <div className="relative min-h-dvh">
      <div aria-hidden className="desk-glow pointer-events-none fixed inset-x-0 top-0 h-[480px]" />
      <RealtimeRefresh />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[256px] border-r border-line bg-surface/80 backdrop-blur-xl lg:flex">
        <Sidebar pathname={pathname} profile={profile} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] animate-pop border-r border-line bg-surface">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute top-4 right-3 grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2">
              <X className="size-4" />
            </button>
            <Sidebar pathname={pathname} profile={profile} />
          </aside>
        </div>
      )}

      <div className="relative lg:pl-[256px]">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button onClick={() => setOpen(true)} aria-label="Open menu" className="grid size-9 place-items-center rounded-[10px] border border-line-strong bg-surface text-ink-2 lg:hidden">
              <Menu className="size-4" />
            </button>
            <p className="hidden truncate text-sm font-medium text-ink-2 sm:block">{TITLES[pathname] ?? 'Submission Desk'}</p>
            <div className="flex-1" />
            <ProjectSwitcher projects={projects} projectId={projectId} />
            <MonthStepper month={month} currentMonth={currentMonth} />
          </div>
        </header>
        <main className="relative mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({ pathname, profile }: { pathname: string; profile: Profile }) {
  return (
    <div className="flex w-full flex-col">
      <Link href="/today" className="mb-5 flex h-16 items-center bg-nav px-5">
        <GtecLogo />
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3">
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="px-3 pb-2 text-[10.5px] font-medium tracking-[.14em] text-ink-3 uppercase">{g.group}</p>
            <div className="space-y-0.5">
              {g.items.map(({ href, label, icon: Icon }) => {
                const on = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13.5px] transition',
                      on ? 'bg-accent-soft font-semibold text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                    )}
                  >
                    {on && <span className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full bg-brand" />}
                    <Icon className={cn('size-4', on ? 'text-accent' : 'text-ink-3 group-hover:text-ink-2')} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-line p-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] text-ink-3">Theme</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-2.5">
          <Avatar name={profile.full_name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{profile.full_name || profile.email}</p>
            <p className="text-[11px] text-ink-3">{profile.role === 'manager' ? 'Manager' : 'Executive'}</p>
          </div>
          <Link href="/settings" aria-label="Settings" className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface hover:text-ink">
            <Settings className="size-4" />
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" aria-label="Sign out" className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface hover:text-bad">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ProjectSwitcher({ projects, projectId }: { projects: Project[]; projectId: string | null }) {
  const [pending, start] = useTransition();
  if (!projects.length) return null;
  return (
    <div className="relative min-w-0">
      {pending ? (
        <LoaderCircle className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 animate-spin text-accent" />
      ) : (
        <FolderKanban className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-3" />
      )}
      <select
        aria-label="Project"
        value={projectId ?? ''}
        onChange={(e) => start(() => setPreference('sd_project', e.target.value))}
        className="h-9 w-full max-w-[42vw] appearance-none truncate rounded-[10px] border border-line-strong bg-surface pr-8 pl-8 text-sm font-medium text-ink outline-none focus:border-accent sm:max-w-[240px]"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-ink-3" />
    </div>
  );
}

function MonthStepper({ month, currentMonth }: { month: string; currentMonth: string }) {
  const [pending, start] = useTransition();
  const go = (m: string) => start(() => setPreference('sd_month', m));
  return (
    <div className={cn('flex h-9 items-center rounded-[10px] border border-line-strong bg-surface', pending && 'opacity-70')}>
      <button onClick={() => go(shiftMonth(month, -1))} aria-label="Previous month" className="grid h-full w-8 place-items-center text-ink-3 hover:text-ink">
        <ChevronLeft className="size-4" />
      </button>
      <button
        onClick={() => go(currentMonth)}
        title="Jump to this month"
        className="min-w-[88px] px-1 text-center text-[13px] font-medium whitespace-nowrap tnum sm:min-w-[118px]"
      >
        <span className="sm:hidden">{monthLabel(month, 'short')}</span>
        <span className="hidden sm:inline">{monthLabel(month)}</span>
      </button>
      <button onClick={() => go(shiftMonth(month, 1))} aria-label="Next month" className="grid h-full w-8 place-items-center text-ink-3 hover:text-ink">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
