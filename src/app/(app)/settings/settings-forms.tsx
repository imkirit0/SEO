'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { KeyRound, UserRound } from 'lucide-react';
import { updateMember } from '@/app/actions';
import { act } from '@/lib/act';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Field, Input } from '@/components/ui/field';
import { Avatar } from '@/components/ui/misc';

export function SettingsForms({ id, name, email, role }: { id: string; name: string; email: string; role: 'manager' | 'exec' }) {
  const [fullName, setFullName] = useState(name);
  const [savingName, startName] = useTransition();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  function onName(e: FormEvent) {
    e.preventDefault();
    startName(async () => { await act(updateMember(id, { full_name: fullName }), 'Profile saved'); });
  }

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords don’t match');
    setSavingPw(true);
    const { error } = await createClient().auth.updateUser({ password });
    setSavingPw(false);
    if (error) return toast.error(error.message);
    setPassword('');
    setConfirm('');
    toast.success('Password updated');
  }

  return (
    <>
      <Card>
        <CardHeader title="Profile" icon={<UserRound />}>
          <Chip tone={role === 'manager' ? 'accent' : 'idle'}>{role === 'manager' ? 'Manager' : 'Executive'}</Chip>
        </CardHeader>
        <CardBody>
          <form onSubmit={onName} className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={fullName} className="size-12 text-sm" />
              <div className="min-w-0">
                <p className="truncate font-medium">{fullName || 'Your name'}</p>
                <p className="truncate text-sm text-ink-3">{email}</p>
              </div>
            </div>
            <Field label="Full name">
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" loading={savingName} disabled={fullName.trim() === name}>Save profile</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Password" description="Set one if you joined through an invite or magic link." icon={<KeyRound />} />
        <CardBody>
          <form onSubmit={onPassword} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password">
                <Input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              <Field label="Confirm password">
                <Input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={savingPw}>Update password</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
