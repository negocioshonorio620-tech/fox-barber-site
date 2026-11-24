-- Fox Barber: shared schedule blocks with public read and admin-only changes.
create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time text not null check (time = '*' or time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  created_at timestamptz not null default now(),
  unique (date, time)
);

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.schedule_blocks enable row level security;
alter table public.site_admins enable row level security;

drop policy if exists "Anyone can view blocked hours" on public.schedule_blocks;
create policy "Anyone can view blocked hours"
  on public.schedule_blocks for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can block hours" on public.schedule_blocks;
create policy "Admins can block hours"
  on public.schedule_blocks for insert
  to authenticated
  with check (
    exists (
      select 1 from public.site_admins
      where site_admins.user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins can unblock hours" on public.schedule_blocks;
create policy "Admins can unblock hours"
  on public.schedule_blocks for delete
  to authenticated
  using (
    exists (
      select 1 from public.site_admins
      where site_admins.user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins can see their own authorization" on public.site_admins;
create policy "Admins can see their own authorization"
  on public.site_admins for select
  to authenticated
  using (user_id = (select auth.uid()));

-- No insert, update, or delete policy is granted on site_admins.
-- Add the user ID of the authorized staff account from the SQL editor:
-- insert into public.site_admins (user_id)
-- select id from auth.users where email = 'STAFF_EMAIL_HERE';
