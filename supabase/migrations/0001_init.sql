-- Submission Desk — schema, security and realtime
-- Run once in the Supabase SQL editor (or `supabase db push`).

create extension if not exists pgcrypto;

/* ------------------------------------------------------------------ */
/* Profiles                                                            */
/* ------------------------------------------------------------------ */
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null default '',
  email       text,
  role        text not null default 'exec' check (role in ('manager', 'exec')),
  created_at  timestamptz not null default now()
);

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'manager');
$$;

-- Every new auth user gets a profile. The very first person becomes a manager.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    case when exists (select 1 from public.profiles) then 'exec' else 'manager' end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only managers may change roles (the SQL editor / service role is exempt).
create or replace function public.guard_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_manager() then
    raise exception 'Only managers can change roles';
  end if;
  return new;
end $$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

/* ------------------------------------------------------------------ */
/* Core tables                                                         */
/* ------------------------------------------------------------------ */
create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  client          text not null default '',
  hrs_per_day     numeric(5, 2) not null default 7.25 check (hrs_per_day >= 0),
  days_per_month  int not null default 26 check (days_per_month between 0 and 31),
  created_at      timestamptz not null default now()
);

create table public.sites (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  url         text not null,
  da          int check (da between 0 and 100),
  created_by  uuid references public.profiles on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  unique (type, url)
);
create index sites_type_idx on public.sites (type);

create table public.submissions (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null default auth.uid() references public.profiles on delete cascade,
  project_id  uuid not null references public.projects on delete cascade,
  site_id     uuid not null references public.sites on delete cascade,
  type        text not null,
  day         date not null,
  month       text not null check (month ~ '^\d{4}-\d{2}$'),
  start_time  time,
  end_time    time,
  status      text not null default 'done' check (status in ('done', 'block')),
  created_at  timestamptz not null default now(),
  unique (project_id, site_id, month)
);
create index submissions_month_idx on public.submissions (month, project_id, type);
create index submissions_member_day_idx on public.submissions (member_id, day);

create table public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null default auth.uid() references public.profiles on delete cascade,
  project_id  uuid references public.projects on delete set null,
  day         date not null,
  task        text not null,
  block       text not null check (block in ('seo', 'smm', 'sem', 'ops')),
  start_time  time,
  end_time    time,
  minutes     int not null default 0 check (minutes >= 0),
  status      text not null default 'done' check (status in ('pend', 'prog', 'done', 'block')),
  created_at  timestamptz not null default now()
);
create index time_entries_day_idx on public.time_entries (day);
create index time_entries_member_day_idx on public.time_entries (member_id, day);

create table public.plan_tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects on delete cascade,
  month       text not null check (month ~ '^\d{4}-\d{2}$'),
  block       text not null check (block in ('seo', 'smm', 'sem', 'ops')),
  freq        text not null default 'Weekly',
  task        text not null,
  minutes     int not null default 60 check (minutes >= 0),
  rate        text not null default '',
  notes       text not null default '',
  weeks       text[] not null default array['pend', 'pend', 'pend', 'pend'],
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index plan_tasks_project_month_idx on public.plan_tasks (project_id, month);

create table public.quotas (
  type     text primary key,
  per_day  int not null default 0 check (per_day >= 0)
);
insert into public.quotas (type, per_day) values
  ('social-bookmarking', 30), ('classified-submission', 2),
  ('directory-submission', 2), ('blog-submission', 2);

create table public.active_timers (
  member_id    uuid primary key default auth.uid() references public.profiles on delete cascade,
  task         text not null,
  block        text not null check (block in ('seo', 'smm', 'sem', 'ops')),
  project_id   uuid references public.projects on delete set null,
  day          date not null,
  start_label  text not null,
  started_at   timestamptz not null default now()
);

/* ------------------------------------------------------------------ */
/* Aggregates (avoid the 1000-row API cap for counts)                  */
/* ------------------------------------------------------------------ */
create or replace function public.site_type_counts()
returns table (type text, n int) language sql stable as $$
  select s.type, count(*)::int from public.sites s group by s.type;
$$;

create or replace function public.submission_type_counts(p_project uuid, p_month text)
returns table (type text, n int) language sql stable as $$
  select s.type, count(*)::int from public.submissions s
  where s.project_id = p_project and s.month = p_month and s.status = 'done'
  group by s.type;
$$;

/* ------------------------------------------------------------------ */
/* Row level security                                                  */
/* ------------------------------------------------------------------ */
alter table public.profiles      enable row level security;
alter table public.projects      enable row level security;
alter table public.sites         enable row level security;
alter table public.submissions   enable row level security;
alter table public.time_entries  enable row level security;
alter table public.plan_tasks    enable row level security;
alter table public.quotas        enable row level security;
alter table public.active_timers enable row level security;

-- profiles
create policy profiles_read   on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_manager()) with check (id = auth.uid() or public.is_manager());

-- projects: everyone reads, managers write
create policy projects_read  on public.projects for select to authenticated using (true);
create policy projects_write on public.projects for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- sites: shared master list; anyone adds, owner or manager removes
create policy sites_read   on public.sites for select to authenticated using (true);
create policy sites_insert on public.sites for insert to authenticated with check (true);
create policy sites_modify on public.sites for update to authenticated
  using (created_by = auth.uid() or public.is_manager());
create policy sites_delete on public.sites for delete to authenticated
  using (created_by = auth.uid() or public.is_manager());

-- submissions: own rows, managers can correct anyone's
create policy submissions_read   on public.submissions for select to authenticated using (true);
create policy submissions_insert on public.submissions for insert to authenticated with check (member_id = auth.uid());
create policy submissions_update on public.submissions for update to authenticated
  using (member_id = auth.uid() or public.is_manager());
create policy submissions_delete on public.submissions for delete to authenticated
  using (member_id = auth.uid() or public.is_manager());

-- time entries
create policy time_read   on public.time_entries for select to authenticated using (true);
create policy time_insert on public.time_entries for insert to authenticated with check (member_id = auth.uid());
create policy time_update on public.time_entries for update to authenticated
  using (member_id = auth.uid() or public.is_manager());
create policy time_delete on public.time_entries for delete to authenticated
  using (member_id = auth.uid() or public.is_manager());

-- plan: managers shape it, everyone ticks weekly progress
create policy plan_read   on public.plan_tasks for select to authenticated using (true);
create policy plan_insert on public.plan_tasks for insert to authenticated with check (public.is_manager());
create policy plan_update on public.plan_tasks for update to authenticated using (true);
create policy plan_delete on public.plan_tasks for delete to authenticated using (public.is_manager());

-- quotas
create policy quotas_read  on public.quotas for select to authenticated using (true);
create policy quotas_write on public.quotas for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- timers: visible to all (for "live now"), writable by owner
create policy timers_read  on public.active_timers for select to authenticated using (true);
create policy timers_write on public.active_timers for all to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.site_type_counts() to authenticated;
grant execute on function public.submission_type_counts(uuid, text) to authenticated;
grant execute on function public.is_manager() to authenticated;

/* ------------------------------------------------------------------ */
/* Realtime                                                            */
/* ------------------------------------------------------------------ */
alter publication supabase_realtime add table
  public.profiles, public.projects, public.sites, public.submissions,
  public.time_entries, public.plan_tasks, public.quotas, public.active_timers;
