'use client';

import { useEffect, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Pause, Play, Plus, Square, Trash2 } from 'lucide-react';
import { addTimeEntry, deleteTimeEntry, discardTimer, startTimer, stopTimer } from '@/app/actions';
import { act } from '@/lib/act';
import { BLOCKS, BLOCK_NAME, STATUS_META, STATUS_ORDER } from '@/lib/constants';
import type { ActiveTimer, BlockId, Status } from '@/lib/types';
import { cn, fmtHM, hhmm, minsBetween, pad, shiftDay } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';

/* ---------------- day navigation ---------------- */
export function DayNav({ day, today }: { day: string; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (d: string) => start(() => router.push(d === today ? '/today' : `/today?day=${d}`));

  return (
    <div className={cn('flex items-center gap-1 rounded-xl border border-line-strong bg-surface p-1 shadow-sm', pending && 'opacity-70')}>
      <Button variant="ghost" size="icon-sm" onClick={() => go(shiftDay(day, -1))} aria-label="Previous day">
        <ChevronLeft />
      </Button>
      <input
        type="date"
        value={day}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="h-8 bg-transparent px-1 text-sm font-medium text-ink outline-none tnum"
        aria-label="Pick a day"
      />
      <Button variant="ghost" size="icon-sm" onClick={() => go(shiftDay(day, 1))} aria-label="Next day">
        <ChevronRight />
      </Button>
      {day !== today && (
        <Button size="sm" variant="soft" onClick={() => go(today)}>Today</Button>
      )}
    </div>
  );
}

/* ---------------- timer ---------------- */
export function TimerPanel({ timer, projectId, day }: { timer: ActiveTimer | null; projectId: string; day: string }) {
  const [pending, start] = useTransition();
  const [task, setTask] = useState('');
  const [block, setBlock] = useState<BlockId>('seo');
  const [manual, setManual] = useState(false);

  if (timer) return <RunningTimer timer={timer} />;

  function onStart(e: FormEvent) {
    e.preventDefault();
    const name = task.trim();
    if (!name) return;
    start(async () => {
      const res = await act(startTimer({ task: name, block, projectId, day, startLabel: hhmm() }), 'Timer started');
      if (res.ok) setTask('');
    });
  }

  return (
    <>
      <form onSubmit={onStart} className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Play className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="What are you working on?"
            className="h-11 rounded-xl pl-10 text-[15px]"
            maxLength={200}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface p-1">
          {BLOCKS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBlock(b.id)}
              aria-pressed={block === b.id}
              className={cn(
                'inline-flex h-8 items-center gap-2 rounded-lg px-2.5 text-[12.5px] font-medium transition',
                block === b.id ? 'bg-surface-2 text-ink shadow-sm ring-1 ring-line-strong' : 'text-ink-3 hover:text-ink',
              )}
            >
              <span className="size-2 rounded-full" style={{ background: b.color }} />
              {b.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="lg" loading={pending} disabled={!task.trim()} className="flex-1 justify-center xl:flex-none">
            {!pending && <Play />} Start
          </Button>
          <Button size="lg" onClick={() => setManual(true)} className="flex-1 justify-center xl:flex-none">
            <Plus /> Past entry
          </Button>
        </div>
      </form>
      <ManualEntryDialog open={manual} onClose={() => setManual(false)} projectId={projectId} day={day} />
    </>
  );
}

function RunningTimer({ timer }: { timer: ActiveTimer }) {
  const [now, setNow] = useState(() => Date.now());
  const [pending, start] = useTransition();

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const secs = Math.max(0, Math.floor((now - new Date(timer.started_at).getTime()) / 1000));
  const clock = `${pad(Math.floor(secs / 3600))}:${pad(Math.floor(secs / 60) % 60)}:${pad(secs % 60)}`;

  const stop = (status: Status) =>
    start(async () => {
      await act(stopTimer({ endLabel: hhmm(), status }), (d) => `Logged ${fmtHM(d?.minutes)} on ${d?.task}`);
    });

  return (
    <div className="relative flex flex-wrap items-center gap-x-5 gap-y-4 overflow-hidden rounded-2xl border border-accent/25 bg-accent-soft p-4 sm:p-5">
      <div aria-hidden className="pointer-events-none absolute -top-20 -left-10 size-56 rounded-full bg-accent/15 blur-3xl" />
      <span className="relative flex size-3">
        <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative size-3 rounded-full bg-accent" />
      </span>
      <div className="relative min-w-0 flex-1">
        <p className="truncate text-[13px] text-ink-2">
          <span className="font-medium text-ink">{timer.task}</span> · {BLOCK_NAME[timer.block]}
        </p>
        <p className="mt-0.5 font-mono text-3xl font-medium tracking-tight text-ink tnum sm:text-4xl" suppressHydrationWarning>
          {clock}
        </p>
        <p className="text-xs text-ink-3">Started at {timer.start_label}</p>
      </div>
      <div className="relative flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => stop('done')} loading={pending}>
          {!pending && <Square />} Stop & log
        </Button>
        <Button onClick={() => stop('prog')} disabled={pending}>
          <Pause /> Log as in progress
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => start(async () => { await act(discardTimer(), 'Timer discarded'); })}
        >
          Discard
        </Button>
      </div>
    </div>
  );
}

/* ---------------- manual entry ---------------- */
function ManualEntryDialog({ open, onClose, projectId, day }: { open: boolean; onClose: () => void; projectId: string; day: string }) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ task: '', block: 'seo' as BlockId, status: 'done' as Status, start: '09:30', end: '11:00' });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const mins = minsBetween(form.start, form.end);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await act(addTimeEntry({ ...form, day, projectId }), 'Entry added');
      if (res.ok) {
        setForm((f) => ({ ...f, task: '' }));
        onClose();
      }
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add a past entry" description="For work you finished without the timer.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Task">
          <Input required autoFocus value={form.task} onChange={(e) => set('task', e.target.value)} placeholder="Blog article — plumbing services" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Block">
            <Select value={form.block} onChange={(e) => set('block', e.target.value as BlockId)}>
              {BLOCKS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set('status', e.target.value as Status)}>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
            </Select>
          </Field>
          <Field label="Start">
            <Input type="time" required value={form.start} onChange={(e) => set('start', e.target.value)} />
          </Field>
          <Field label="End">
            <Input type="time" required value={form.end} onChange={(e) => set('end', e.target.value)} />
          </Field>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="font-mono text-sm text-ink-3 tnum">{fmtHM(mins)} h</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" loading={pending}>Add entry</Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------- row actions ---------------- */
export function DeleteEntryButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Remove entry"
      loading={pending}
      className="text-ink-3 hover:text-bad"
      onClick={() => start(async () => { await act(deleteTimeEntry(id), 'Entry removed'); })}
    >
      {!pending && <Trash2 />}
    </Button>
  );
}
