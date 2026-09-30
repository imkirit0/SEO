-- Accounts are created by managers only (Team & Projects → Create user).
-- The createMember server action (service role) adds the email to signup_allowlist
-- right before creating the user; everything else — public sign-up, magic-link
-- auto-signup, direct Auth API calls — is rejected here at the database.
-- Exception: the very first account on an empty desk, so a fresh install can bootstrap.
create table if not exists public.signup_allowlist (
  email      text primary key,
  created_at timestamptz not null default now()
);
alter table public.signup_allowlist enable row level security; -- no policies: service role only

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  first_user boolean := not exists (select 1 from public.profiles);
begin
  if not first_user then
    delete from public.signup_allowlist where email = lower(new.email);
    if not found then
      raise exception 'Sign-ups are disabled. Ask a manager to create your account.';
    end if;
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    case when first_user then 'manager' else 'exec' end
  );
  return new;
end $$;
