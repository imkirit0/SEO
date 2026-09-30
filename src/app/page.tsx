import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CalendarRange, Gauge, Library, Link2, ShieldCheck, Timer, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { DEMO } from '@/lib/supabase/env';
import { buttonVariants } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { GtecLogo } from '@/components/brand';

const FEATURES = [
  { icon: Timer, title: 'Live time log', body: 'One-click timers that follow you across devices, plus past entries in seconds. Every minute lands against a client and a work block.' },
  { icon: Link2, title: '24 submission trackers', body: 'Social bookmarking to .gov sites — one master list per type, per-project progress, daily quotas and duplicate protection.' },
  { icon: CalendarRange, title: 'Monthly retainer plan', body: 'Start from a 30-task standard plan, budget hours against contracted capacity, and tick progress week by week.' },
  { icon: Gauge, title: 'Manager dashboard', body: 'Pace to month-end, planned vs logged by block, output per person and who is working on what right now.' },
  { icon: Library, title: 'Shared site library', body: 'Paste hundreds of domains with DA in one go. Normalised, de-duplicated and instantly available to the whole team.' },
  { icon: ShieldCheck, title: 'Roles & security', body: 'Supabase Auth with row-level security. Managers shape plans and projects; executives log their own work.' },
];

export default async function Landing() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && !DEMO) redirect('/today');

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div aria-hidden className="gtec-hero pointer-events-none absolute inset-x-0 top-16 h-[640px] opacity-60 [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]" />

      <header className="relative bg-nav">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 sm:px-8">
          <GtecLogo />
          <div className="flex-1" />
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link href="/login" className="rounded-full border border-white/60 px-4 py-1.5 text-[13px] font-medium text-white transition hover:bg-white hover:text-nav">
            Sign in
          </Link>
          <Link href="/login?mode=signup" className={buttonVariants({ variant: 'primary', size: 'sm' })}>Get started</Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <section className="pt-14 pb-16 text-center sm:pt-24">
          <p className="inline-flex animate-rise items-center gap-2 text-xs font-medium tracking-[.16em] text-brand uppercase">
            <Zap className="size-3.5" /> G-TEC Education · SEO operations
          </p>
          <h1 className="mx-auto mt-5 text-accent dark:text-ink max-w-4xl animate-rise text-4xl leading-[1.08] font-medium tracking-tight text-balance sm:text-6xl lg:text-7xl">
            The operating desk for SEO retainers.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl animate-rise text-base text-ink-2 sm:text-lg">
            Time, link building, monthly plans and team output — one calm workspace where every hour and every
            backlink is accounted for.
          </p>
          <div className="mt-9 flex animate-rise flex-wrap justify-center gap-3">
            <Link href="/login?mode=signup" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
              Open your desk <ArrowRight />
            </Link>
            <Link href="/login" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>I have an account</Link>
          </div>
        </section>

        <Preview />

        <section className="grid gap-4 py-20 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card border-t-[3px] border-t-brand p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
              <span className="grid size-10 place-items-center rounded-[5px] bg-accent-soft text-accent">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-medium tracking-tight text-accent dark:text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative bg-nav">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-6 text-xs text-white/70 sm:px-8">
          <GtecLogo />
          <span className="flex-1" />
          <span>© G-TEC Education</span>
        </div>
      </footer>
    </div>
  );
}

function Preview() {
  const bars = [62, 78, 45, 90, 100, 70, 0, 84, 96, 58, 88, 102, 74, 0, 66, 92];
  return (
    <div className="relative mx-auto max-w-5xl animate-rise">
      <div aria-hidden className="absolute -inset-x-10 -top-10 bottom-0 rounded-[40px] bg-accent/10 blur-3xl" />
      <div className="card relative overflow-hidden p-2 shadow-2xl">
        <div className="flex items-center gap-1.5 border-b border-line px-3 pt-1 pb-3">
          <span className="size-2.5 rounded-full bg-bad/60" />
          <span className="size-2.5 rounded-full bg-warn/60" />
          <span className="size-2.5 rounded-full bg-ok/60" />
          <span className="ml-3 text-xs text-ink-3">Dashboard · Northwind Dental</span>
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-4">
          {[
            ['Hours logged', '142.5', 'of 188.5 h contracted'],
            ['Pace to month end', '181.0', '7.5 h spare'],
            ['Submissions', '612', '9 active types'],
            ['Plan coverage', '76%', '188.5 h planned'],
          ].map(([k, v, n]) => (
            <div key={k} className="rounded-[8px] border border-line bg-surface-2/60 p-3.5 text-left">
              <p className="text-[10px] tracking-[.12em] text-ink-3 uppercase">{k}</p>
              <p className="mt-2 font-mono text-2xl tnum">{v}</p>
              <p className="mt-1 text-[11px] text-ink-3">{n}</p>
            </div>
          ))}
          <div className="rounded-[8px] border border-line bg-surface-2/60 p-4 sm:col-span-3">
            <p className="text-left text-xs font-medium text-ink-2">Daily hours</p>
            <div className="mt-4 flex h-28 items-end gap-1.5">
              {bars.map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-linear-to-t from-accent/50 to-accent" style={{ height: `${Math.max(3, h * 0.9)}%` }} />
              ))}
            </div>
          </div>
          <div className="rounded-[8px] border border-line bg-surface-2/60 p-4 text-left">
            <p className="text-xs font-medium text-ink-2">Live now</p>
            {['Priya — Reels edit', 'Arjun — Social bookmarking', 'Meera — GSC checks'].map((t) => (
              <p key={t} className="mt-3 flex items-center gap-2 text-[12px] text-ink-2">
                <span className="size-1.5 animate-pulse rounded-full bg-ok" /> {t}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
