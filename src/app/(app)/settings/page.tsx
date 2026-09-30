import type { Metadata } from 'next';
import { getSession } from '@/lib/session';
import { PageHeader } from '@/components/ui/misc';
import { SettingsForms } from './settings-forms';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { profile } = await getSession();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader eyebrow="Account" title="Settings" description="Your name as teammates see it, and your sign-in password." />
      <SettingsForms id={profile.id} name={profile.full_name} email={profile.email ?? ''} role={profile.role} />
    </div>
  );
}
