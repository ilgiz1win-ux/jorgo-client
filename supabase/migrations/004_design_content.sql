-- Товарга кошумча сүрөттөр жана белги, башкы беттин жөндөөлөрү, пикирлер, «чейин / кийин» галереясы.
-- Supabase → SQL Editor → New query → ушул файлды толук коюп, Run басыңыз. Кайра иштетсе зыяны жок.

alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists badge  text check (badge is null or badge in ('hit','new'));

create table if not exists public.settings (
  key   text primary key,
  value jsonb not null default '{}'::jsonb
);

create table if not exists public.reviews (
  id     text primary key,
  name   text not null,
  text   text not null default '',
  rating integer not null default 5 check (rating between 1 and 5),
  sort   integer not null default 0
);

create table if not exists public.gallery (
  id         text primary key,
  title      text not null default '',
  before_url text,
  after_url  text,
  sort       integer not null default 0
);

alter table public.settings enable row level security;
alter table public.reviews  enable row level security;
alter table public.gallery  enable row level security;

drop policy if exists "settings read"  on public.settings;
drop policy if exists "settings write" on public.settings;
create policy "settings read"  on public.settings for select using (true);
create policy "settings write" on public.settings for all to authenticated using (true) with check (true);

drop policy if exists "reviews read"  on public.reviews;
drop policy if exists "reviews write" on public.reviews;
create policy "reviews read"  on public.reviews for select using (true);
create policy "reviews write" on public.reviews for all to authenticated using (true) with check (true);

drop policy if exists "gallery read"  on public.gallery;
drop policy if exists "gallery write" on public.gallery;
create policy "gallery read"  on public.gallery for select using (true);
create policy "gallery write" on public.gallery for all to authenticated using (true) with check (true);
