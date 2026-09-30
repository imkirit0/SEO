'use client';

import { useState, useTransition, type FormEvent, type KeyboardEvent } from 'react';
import { FolderKanban, Plus, Target, Trash2, UserPlus, Users } from 'lucide-react';
import { createMember, createProject, deleteProject, setQuota, updateMember, updateProject } from '@/app/actions';
import { act } from '@/lib/act';
import { SUBMISSION_TYPES } from '@/lib/constants';
import type { Profile, Project, Quota } from '@/lib/types';
import { cn, fmtHours } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/field';
import { Avatar } from '@/components/ui/misc';

/* ---------------- team ---------------- */
export function TeamPanel({ team, me, isManager, createEnabled }: { team: Profile[]; me: string; isManager: boolean; createEnabled: boolean }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'exec' | 'manager'>('exec');
  const [pending, start] = useTransition();

  function onCreate(e: FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await act(createMember({ email, fullName: name, password, role }), (d) => `Account created for ${d?.email}`);
      if (res.ok) { setEmail(''); setName(''); setPassword(''); setRole('exec'); }
    });
  }

  return (
    <Card>
      <CardHeader title="Team" description={`${team.length} ${team.length === 1 ? 'person' : 'people'}`} icon={<Users />} />
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Person</th><th>Role</th></tr></thead>
          <tbody>
            {team.map((m) => <MemberRow key={m.id} member={m} isSelf={m.id === me} isManager={isManager} />)}
          </tbody>
        </table>
      </div>
      {isManager && (
        <CardBody className="border-t border-line">
          {createEnabled ? (
            <form onSubmit={onCreate} className="grid gap-2 sm:grid-cols-2">
              <p className="text-[13px] font-medium text-ink sm:col-span-2">Create user</p>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="off" />
              <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gteceducation.com" autoComplete="off" />
              <Input required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8 characters)" autoComplete="new-password" />
              <select
                aria-label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'exec' | 'manager')}
                className="h-9 rounded-[10px] border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="exec">Executive</option>
                <option value="manager">Manager (admin)</option>
              </select>
              <Button type="submit" variant="primary" loading={pending} className="justify-center sm:col-span-2">
                {!pending && <UserPlus />} Create user
              </Button>
              <p className="text-xs text-ink-3 sm:col-span-2">Share the email and password with them directly. They can change the password in Settings.</p>
            </form>
          ) : (
            <p className="text-xs leading-relaxed text-ink-3">
              Add <code className="rounded bg-surface-2 px-1 font-mono">SUPABASE_SERVICE_ROLE_KEY</code> on the server to create user accounts.
            </p>
          )}
        </CardBody>
      )}
    </Card>
  );
}

function MemberRow({ member, isSelf, isManager }: { member: Profile; isSelf: boolean; isManager: boolean }) {
  const [pending, start] = useTransition();
  const canRename = isManager || isSelf;
  return (
    <tr className={cn(pending && 'opacity-60')}>
      <td>
        <div className="flex items-center gap-3">
          <Avatar name={member.full_name} />
          <div className="min-w-0 flex-1">
            {canRename ? (
              <input
                key={member.full_name}
                defaultValue={member.full_name}
                aria-label="Name"
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value.trim() !== member.full_name) {
                    start(async () => { await act(updateMember(member.id, { full_name: e.target.value }), 'Name updated'); });
                  }
                }}
                className="cell-input -ml-2 font-medium"
              />
            ) : <p className="font-medium">{member.full_name}</p>}
            <p className="truncate text-xs text-ink-3">{member.email}{isSelf && ' · you'}</p>
          </div>
        </div>
      </td>
      <td className="w-40">
        {isManager ? (
          <select
            key={member.role}
            defaultValue={member.role}
            aria-label="Role"
            onChange={(e) => start(async () => { await act(updateMember(member.id, { role: e.target.value as Profile['role'] }), 'Role updated'); })}
            className="cell-input w-auto"
          >
            <option value="exec">Executive</option>
            <option value="manager">Manager</option>
          </select>
        ) : (
          <Chip tone={member.role === 'manager' ? 'accent' : 'idle'}>{member.role === 'manager' ? 'Manager' : 'Executive'}</Chip>
        )}
      </td>
    </tr>
  );
}

/* ---------------- projects ---------------- */
export function ProjectsPanel({ projects, isManager }: { projects: Project[]; isManager: boolean }) {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [pending, start] = useTransition();

  function onAdd(e: FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await act(createProject({ name, client }), 'Project created');
      if (res.ok) { setName(''); setClient(''); }
    });
  }

  return (
    <Card>
      <CardHeader title="Projects" description="Hours per day × days per month sets each retainer’s capacity" icon={<FolderKanban />} />
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Project</th><th>Client</th><th className="num">Hrs/day</th><th className="num">Days/mo</th><th className="num">Capacity</th><th /></tr>
          </thead>
          <tbody>
            {projects.length ? projects.map((p) => <ProjectRow key={p.id} project={p} isManager={isManager} />) : (
              <tr><td colSpan={6} className="py-8 text-center text-ink-3">No projects yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {isManager && (
        <CardBody className="border-t border-line">
          <form onSubmit={onAdd} className="flex flex-col gap-2 sm:flex-row">
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" className="flex-1" />
            <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client" className="sm:w-40" />
            <Button type="submit" variant="primary" loading={pending}>{!pending && <Plus />} Add project</Button>
          </form>
        </CardBody>
      )}
    </Card>
  );
}

function ProjectRow({ project: p, isManager }: { project: Project; isManager: boolean }) {
  const [pending, start] = useTransition();
  const save = (patch: Parameters<typeof updateProject>[1]) => start(async () => { await act(updateProject(p.id, patch)); });
  const blur = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); };

  if (!isManager) {
    return (
      <tr>
        <td className="font-medium">{p.name}</td><td className="text-ink-2">{p.client || '—'}</td>
        <td className="num">{p.hrs_per_day}</td><td className="num">{p.days_per_month}</td>
        <td className="num">{fmtHours(p.hrs_per_day * p.days_per_month * 60)} h</td><td />
      </tr>
    );
  }
  return (
    <tr className={cn(pending && 'opacity-60')}>
      <td className="min-w-40">
        <input key={p.name} defaultValue={p.name} onKeyDown={blur} aria-label="Project name" className="cell-input -ml-2 font-medium"
          onBlur={(e) => { if (e.target.value.trim() !== p.name) save({ name: e.target.value }); }} />
      </td>
      <td className="min-w-32">
        <input key={p.client} defaultValue={p.client} onKeyDown={blur} placeholder="—" aria-label="Client" className="cell-input -ml-2 text-ink-2"
          onBlur={(e) => { if (e.target.value.trim() !== p.client) save({ client: e.target.value }); }} />
      </td>
      <td className="num">
        <input key={p.hrs_per_day} type="number" step="0.25" min="0" max="24" defaultValue={p.hrs_per_day} onKeyDown={blur} aria-label="Hours per day"
          className="cell-input w-20 text-right font-mono tnum"
          onBlur={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v) && v !== p.hrs_per_day) save({ hrs_per_day: v }); }} />
      </td>
      <td className="num">
        <input key={p.days_per_month} type="number" min="0" max="31" defaultValue={p.days_per_month} onKeyDown={blur} aria-label="Days per month"
          className="cell-input w-16 text-right font-mono tnum"
          onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v) && v !== p.days_per_month) save({ days_per_month: v }); }} />
      </td>
      <td className="num text-ink-2">{fmtHours(p.hrs_per_day * p.days_per_month * 60)} h</td>
      <td className="w-10 text-right">
        <Button size="icon-sm" variant="ghost" aria-label={`Delete ${p.name}`} className="text-ink-3 hover:text-bad"
          onClick={() => {
            if (confirm(`Delete “${p.name}”? Its plans and submissions are deleted too. Time entries are kept without a project.`)) {
              start(async () => { await act(deleteProject(p.id), 'Project deleted'); });
            }
          }}>
          <Trash2 />
        </Button>
      </td>
    </tr>
  );
}

/* ---------------- quotas ---------------- */
export function QuotaPanel({ quotas, isManager }: { quotas: Quota[]; isManager: boolean }) {
  const map = Object.fromEntries(quotas.map((q) => [q.type, q.per_day]));
  const [, start] = useTransition();
  return (
    <Card>
      <CardHeader title="Daily link-building quota" description="What a full day of link building looks like, per person. Zero hides a type from Today." icon={<Target />} />
      <CardBody>
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
          {SUBMISSION_TYPES.map((t) => (
            <label key={t.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition hover:bg-surface-2">
              <span className="truncate text-[13px] text-ink-2">{t.name}</span>
              <input
                key={map[t.id] ?? 0}
                type="number"
                min="0"
                disabled={!isManager}
                defaultValue={map[t.id] ?? 0}
                onBlur={(e) => {
                  const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                  if (v !== (map[t.id] ?? 0)) start(async () => { await act(setQuota(t.id, v), `${t.name}: ${v}/day`); });
                }}
                className={cn('h-8 w-16 rounded-lg border border-line-strong bg-surface px-2 text-right font-mono text-sm tnum outline-none focus:border-accent disabled:border-transparent disabled:bg-transparent', (map[t.id] ?? 0) > 0 && 'text-accent')}
              />
            </label>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
