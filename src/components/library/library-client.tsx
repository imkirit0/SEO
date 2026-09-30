'use client';

import { useMemo, useState, useTransition } from 'react';
import { ListPlus, Search, Trash2 } from 'lucide-react';
import { addSites, clearSites, deleteSite } from '@/app/actions';
import { act } from '@/lib/act';
import { hostOf } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/misc';
import { DaBadge } from '@/components/links/site-table';

export function SiteImporter({ type, typeName }: { type: string; typeName: string }) {
  const [text, setText] = useState('');
  const [pending, start] = useTransition();
  const lines = useMemo(() => new Set(text.split(/\r?\n/).map((l) => hostOf(l.replace(/[,;\s\t]+\d{1,3}$/, ''))).filter((u) => u.includes('.'))).size, [text]);

  return (
    <Card>
      <CardHeader title={`Add to ${typeName}`} description="Paste one domain per line, optionally followed by its DA" icon={<ListPlus />} />
      <CardBody className="space-y-3">
        <Textarea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'linkedin.com, 99\nmedium.com, 95\nhttps://www.behance.net/ 92'}
          className="font-mono text-[13px]"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-3">
            {lines ? `${lines} unique domain${lines === 1 ? '' : 's'} detected` : 'URLs are normalised; duplicates are skipped.'}
          </p>
          <Button
            variant="primary"
            loading={pending}
            disabled={!lines}
            onClick={() =>
              start(async () => {
                const res = await act(addSites(type, text), (d) => `${d?.added ?? 0} added${d?.skipped ? ` · ${d.skipped} already listed` : ''}`);
                if (res.ok) setText('');
              })
            }
          >
            Add sites
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export function SiteList({
  type,
  typeName,
  sites,
  me,
  isManager,
}: {
  type: string;
  typeName: string;
  sites: { id: string; url: string; da: number | null; created_by: string | null }[];
  me: string;
  isManager: boolean;
}) {
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(200);
  const [clearing, startClear] = useTransition();
  const [, start] = useTransition();

  const q = query.trim().toLowerCase();
  const shown = sites.filter((s) => !hidden.has(s.id) && (!q || s.url.includes(q)));

  const remove = (id: string) =>
    start(async () => {
      setHidden((h) => new Set(h).add(id));
      const res = await act(deleteSite(id));
      if (!res.ok) setHidden((h) => { const n = new Set(h); n.delete(id); return n; });
    });

  return (
    <Card>
      <CardHeader title={typeName} description={`${sites.length} site${sites.length === 1 ? '' : 's'} in the master list`}>
        <div className="relative w-full sm:w-48">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="pl-9" />
        </div>
        {isManager && sites.length > 0 && (
          <Button
            size="sm"
            variant="danger"
            loading={clearing}
            onClick={() => {
              if (confirm(`Remove all ${sites.length} sites from ${typeName}? Logged submissions for them are deleted too.`)) {
                startClear(async () => { await act(clearSites(type), 'List cleared'); });
              }
            }}
          >
            Clear list
          </Button>
        )}
      </CardHeader>
      {!sites.length ? (
        <EmptyState title="Empty list" description="Paste your sites on the left to fill this tracker." />
      ) : (
        <div className="max-h-[560px] overflow-auto">
          <table className="data-table">
            <thead>
              <tr><th className="num w-12">#</th><th>Site</th><th className="num">DA</th><th /></tr>
            </thead>
            <tbody>
              {shown.slice(0, limit).map((s, i) => (
                <tr key={s.id}>
                  <td className="num text-ink-3">{i + 1}</td>
                  <td className="max-w-[320px] truncate font-medium">{s.url}</td>
                  <td className="num"><DaBadge da={s.da} /></td>
                  <td className="w-10 text-right">
                    {(isManager || s.created_by === me) && (
                      <Button size="icon-sm" variant="ghost" aria-label={`Remove ${s.url}`} className="text-ink-3 hover:text-bad" onClick={() => remove(s.id)}>
                        <Trash2 />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length > limit && (
            <div className="flex justify-center border-t border-line p-4">
              <Button size="sm" onClick={() => setLimit((l) => l + 500)}>Show more ({shown.length - limit})</Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
