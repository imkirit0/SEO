'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Mail, MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Segmented } from '@/components/ui/misc';

type Mode = 'signin' | 'signup' | 'magic';

export function LoginForm({ next, initialMode, linkError }: { next: string; initialMode: Mode; linkError: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    if (linkError) toast.error('That link is invalid or has expired. Try again.');
  }, [linkError]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(next);
          router.refresh();
        } else {
          setSent(`We sent a confirmation link to ${email}.`);
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
        if (error) throw error;
        setSent(`A sign-in link is on its way to ${email}.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sign you in');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="card relative w-full max-w-sm animate-pop p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
          <MailCheck className="size-5" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="mt-2 text-sm text-ink-3">{sent}</p>
        <Button className="mt-6" variant="ghost" onClick={() => setSent(null)}>Use a different email</Button>
      </div>
    );
  }

  const titles: Record<Mode, [string, string]> = {
    signin: ['Welcome back', 'Sign in to your desk.'],
    signup: ['Create your account', 'Join your team’s desk in under a minute.'],
    magic: ['Passwordless sign-in', 'We’ll email you a one-time link.'],
  };

  return (
    <div className="card relative w-full max-w-sm animate-pop p-7 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{titles[mode][0]}</h1>
      <p className="mt-1 text-sm text-ink-3">{titles[mode][1]}</p>

      <Segmented
        className="mt-6 w-full [&>button]:flex-1 [&>button]:justify-center"
        value={mode === 'magic' ? 'signin' : mode}
        onChange={(v) => setMode(v)}
        options={[
          { value: 'signin', label: 'Sign in' },
          { value: 'signup', label: 'Create account' },
        ]}
      />

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === 'signup' && (
          <Field label="Full name">
            <Input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" className="h-10" />
          </Field>
        )}
        <Field label="Work email">
          <Input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@agency.com" className="h-10" />
        </Field>
        {mode !== 'magic' && (
          <Field label="Password">
            <Input
              required
              type="password"
              minLength={8}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-10"
            />
          </Field>
        )}
        <Button type="submit" variant="primary" size="lg" className="w-full justify-center" loading={loading}>
          {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send magic link'}
          {!loading && <ArrowRight />}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[11px] tracking-[.14em] text-ink-3 uppercase">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <Button
        variant="secondary"
        className="w-full justify-center"
        onClick={() => setMode(mode === 'magic' ? 'signin' : 'magic')}
      >
        <Mail /> {mode === 'magic' ? 'Use a password instead' : 'Email me a sign-in link'}
      </Button>
    </div>
  );
}
