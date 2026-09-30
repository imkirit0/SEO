import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CircleCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { DEMO } from '@/lib/supabase/env';
import { safeNext } from '@/lib/utils';
import { LoginForm } from './login-form';
import { GtecLogo } from '@/components/brand';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && !DEMO) redirect(next);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-nav text-white lg:flex lg:flex-col">
        <div aria-hidden className="absolute inset-0 bg-linear-to-br from-white/0 via-white/0 to-accent-2/35" />
        <div className="relative flex flex-1 flex-col p-12">
          <Link href="/" className="inline-flex">
            <GtecLogo />
          </Link>
          <div className="my-auto max-w-md">
            <p className="text-xs font-medium tracking-[.16em] text-white/70 uppercase">SEO operations desk</p>
            <h2 className="mt-3 text-4xl leading-tight font-medium tracking-tight">
              Every hour and every backlink, accounted for.
            </h2>
            <ul className="mt-8 space-y-3.5 text-sm text-white/85">
              {[
                'Timers that sync across the whole team in real time',
                '24 link-building trackers with daily quotas',
                'Retainer capacity planning, week by week',
                'Dashboards managers actually open',
              ].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <CircleCheck className="size-4 text-white" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/60">Accounts are created by your admin in Team &amp; Projects.</p>
        </div>
      </aside>

      <main className="relative flex items-center justify-center px-5 py-12 sm:px-8">
        <div aria-hidden className="desk-glow pointer-events-none absolute inset-0 lg:hidden" />
        <LoginForm
          next={next}
          linkError={params.error === 'link'}
        />
      </main>
    </div>
  );
}
