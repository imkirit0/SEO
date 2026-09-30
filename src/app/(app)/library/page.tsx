import type { Metadata } from 'next';
import { getSession } from '@/lib/session';
import { SUBMISSION_TYPES, TYPE_NAME } from '@/lib/constants';
import type { Site } from '@/lib/types';
import { fetchAll } from '@/lib/utils';
import { PageHeader } from '@/components/ui/misc';
import { TypeRail } from '@/components/links/type-rail';
import { SiteImporter, SiteList } from '@/components/library/library-client';

export const metadata: Metadata = { title: 'Site Library' };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [{ type: typeParam }, ctx] = await Promise.all([searchParams, getSession()]);
  const db = ctx.supabase;
  const type: string = typeParam && TYPE_NAME[typeParam] ? typeParam : SUBMISSION_TYPES[0].id;

  const [countsRes, sites] = await Promise.all([
    db.rpc('site_type_counts'),
    fetchAll<Site>((f, t) =>
      db.from('sites').select('id,type,url,da,created_by,created_at').eq('type', type).order('url').range(f, t),
    ),
  ]);
  const counts = Object.fromEntries(((countsRes.data ?? []) as { type: string; n: number }[]).map((r) => [r.type, r.n]));
  const total = Object.values(counts).reduce((a, n) => a + n, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Setup"
        title="Site library"
        description={`${total.toLocaleString('en-US')} sites across ${SUBMISSION_TYPES.length} submission types, shared by every project.`}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[268px_minmax(0,1fr)]">
        <TypeRail
          basePath="/library"
          active={type}
          rows={SUBMISSION_TYPES.map((t) => ({ id: t.id, name: t.name, total: counts[t.id] ?? 0 }))}
        />
        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <SiteImporter key={`import-${type}`} type={type} typeName={TYPE_NAME[type]} />
          <SiteList
            key={`list-${type}`}
            type={type}
            typeName={TYPE_NAME[type]}
            sites={sites.map((s) => ({ id: s.id, url: s.url, da: s.da, created_by: s.created_by }))}
            me={ctx.user.id}
            isManager={ctx.isManager}
          />
        </div>
      </div>
    </div>
  );
}
