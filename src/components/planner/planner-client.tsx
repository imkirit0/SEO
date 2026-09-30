'use client';

import { useState, useTransition, type KeyboardEvent } from 'react';
import { CalendarPlus, Copy, FilePlus2, Plus, Sparkles, X } from 'lucide-react';
import {
  addPlanTask, copyPreviousPlan, deletePlanTask, loadTemplatePlan, updatePlanTask,
} from '@/app/actions';
import { act } from '@/lib/act';
import { BLOCKS, FREQUENCIES } from '@/lib/constants';
import type { BlockId, PlanTask } from '@/lib/types';
import { cn, fmtHours, sum } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Meter } from '@/components/ui/meter';
import { EmptyState } from '@/components/ui/misc';
import { WeekChip } from './week-chip';

export function PlanEmpty({
  isManager, projectId, month, monthName, prevMonthName, prevCount,
}: {
  isManager: boolean; projectId: string; month: string; monthName: string; prevMonthName: string; prevCount: number;
}) {
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<string | null>(null);
  const go = (key: string, fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) => {
    setWhich(key);
    start(async () => { await act(fn(), msg); });
  };

  return (
    <div className="card">
      <EmptyState
        className="py-16"
        icon={<CalendarPlus />}
        title={`No plan for ${monthName}`}
        description={
          isManager
            ? 'Start from the standard retainer plan — 30 recurring tasks across SEO, social, ads and reporting with hour budgets — then trim it to this client.'
            : 'A manager hasn’t built this month’s plan yet.'
        }
        action={isManager && (
          <>
            <Button variant="primary" loading={pending && which === 'tpl'} disabled={pending}
              onClick={() => go('tpl', () => loadTemplatePlan(projectId, month), 'Standard plan loaded')}>
              <Sparkles /> Load standard plan
            </Button>
            {prevCount > 0 && (
              <Button loading={pending && which === 'copy'} disabled={pending}
                onClick={() => go('copy', () => copyPreviousPlan(projectId, month), `Copied ${prevCount} tasks from ${prevMonthName}`)}>
                <Copy /> Copy {prevMonthName}
              </Button>
            )}
            <Button variant="ghost" loading={pending && which === 'blank'} disabled={pending}
              onClick={() => go('blank', () => addPlanTask(projectId, month, 'seo'), 'Blank plan started')}>
              <FilePlus2 /> Start blank
            </Button>
          </>
        )}
      />
    </div>
  );
}

export function PlanBlock({
  blockId, rows, loggedMins, isManager, projectId, month,
}: {
  blockId: BlockId; rows: PlanTask[]; loggedMins: number; isManager: boolean; projectId: string; month: string;
}) {
  const meta = BLOCKS.find((b) => b.id === blockId)!;
  const planned = sum(rows, (r) => r.minutes);
  const [adding, startAdd] = useTransition();
  const over = loggedMins > planned && planned > 0;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: meta.color, boxShadow: `0 0 0 4px color-mix(in oklab, ${meta.color} 18%, transparent)` }} />
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight">{meta.name}</h2>
            <p className="mt-0.5 text-[13px] text-ink-3">
              {rows.length} task{rows.length === 1 ? '' : 's'} · {fmtHours(planned)} h planned ·{' '}
              <span className={over ? 'text-bad' : undefined}>{fmtHours(loggedMins)} h logged</span>
            </p>
          </div>
        </div>
        <div className="w-36"><Meter value={loggedMins} max={planned} tone={over ? 'bad' : 'accent'} className="h-2" /></div>
        {isManager && (
          <Button size="sm" loading={adding} onClick={() => startAdd(async () => { await act(addPlanTask(projectId, month, blockId)); })}>
            {!adding && <Plus />} Add task
          </Button>
        )}
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task</th><th>Frequency</th><th className="num">Hours</th><th>Rate</th><th>Notes</th>
                {[1, 2, 3, 4].map((w) => <th key={w} className="text-center!">W{w}</th>)}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => <PlanRow key={r.id} row={r} isManager={isManager} />)}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>{meta.name} subtotal</td>
                <td className="num">{fmtHours(planned)} h</td>
                <td colSpan={7} />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="px-5 py-6 text-sm text-ink-3">No tasks in this block yet.</p>
      )}
    </Card>
  );
}

function PlanRow({ row, isManager }: { row: PlanTask; isManager: boolean }) {
  const [pending, start] = useTransition();
  const save = (patch: Parameters<typeof updatePlanTask>[1]) => start(async () => { await act(updatePlanTask(row.id, patch)); });
  const blurOnEnter = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); };

  return (
    <tr className={cn(pending && 'opacity-60')}>
      <td className="min-w-[240px]">
        {isManager ? (
          <input key={row.task} defaultValue={row.task} maxLength={200} onKeyDown={blurOnEnter}
            onBlur={(e) => { if (e.target.value.trim() !== row.task) save({ task: e.target.value }); }}
            className="cell-input -ml-2 font-medium" aria-label="Task" />
        ) : <span className="font-medium">{row.task}</span>}
      </td>
      <td>
        {isManager ? (
          <select key={row.freq} defaultValue={row.freq} onChange={(e) => save({ freq: e.target.value })} className="cell-input -ml-2 w-auto" aria-label="Frequency">
            {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
          </select>
        ) : <Chip tone="accent">{row.freq}</Chip>}
      </td>
      <td className="num">
        {isManager ? (
          <input key={row.minutes} type="number" step="0.25" min="0" defaultValue={(row.minutes / 60).toFixed(2)} onKeyDown={blurOnEnter}
            onBlur={(e) => { const m = Math.round(parseFloat(e.target.value || '0') * 60); if (m !== row.minutes) save({ minutes: m }); }}
            className="cell-input w-20 text-right font-mono tnum" aria-label="Hours" />
        ) : fmtHours(row.minutes)}
      </td>
      <td className="text-xs whitespace-nowrap text-ink-3">{row.rate}</td>
      <td className="min-w-[200px] text-xs text-ink-3">
        {isManager ? (
          <input key={row.notes} defaultValue={row.notes} maxLength={300} onKeyDown={blurOnEnter} placeholder="Add a note"
            onBlur={(e) => { if (e.target.value !== row.notes) save({ notes: e.target.value }); }}
            className="cell-input -ml-2 text-xs text-ink-2" aria-label="Notes" />
        ) : row.notes}
      </td>
      {[0, 1, 2, 3].map((w) => (
        <td key={w} className="w-12 text-center">
          <div className="flex justify-center"><WeekChip id={row.id} week={w} status={row.weeks?.[w] ?? 'pend'} variant="letter" /></div>
        </td>
      ))}
      <td className="w-10 text-right">
        {isManager && (
          <Button size="icon-sm" variant="ghost" aria-label="Delete task" className="text-ink-3 hover:text-bad"
            onClick={() => start(async () => { await act(deletePlanTask(row.id), 'Task removed'); })}>
            <X />
          </Button>
        )}
      </td>
    </tr>
  );
}
