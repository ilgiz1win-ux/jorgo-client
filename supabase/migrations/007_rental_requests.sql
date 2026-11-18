-- Ижарага өтүнмөлөр: аты, телефону, паспорт номери, GPS.
-- Кардар өтүнмө ЖАЗА алат, бирок эч кимдикин ОКУЙ албайт. Окуу жана статус өзгөртүү — админ гана.
-- Supabase → SQL Editor → New query → ушул файлды толук коюп, Run басыңыз. Кайра иштетсе зыяны жок.

create table if not exists public.rental_requests (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  bike_id    text not null,
  bike_name  text not null check (char_length(bike_name) <= 120),
  period     text not null check (period in ('day', 'week', 'month')),
  count      integer not null check (count between 1 and 365),
  total      integer check (total is null or total >= 0),
  start_text text not null default '' check (char_length(start_text) <= 120),
  name       text not null check (char_length(name) between 2 and 80),
  phone      text not null check (char_length(phone) between 9 and 30),
  passport   text not null check (char_length(passport) between 5 and 30),
  lat        double precision check (lat is null or lat between -90 and 90),
  lng        double precision check (lng is null or lng between -180 and 180),
  accuracy   double precision,
  status     text not null default 'new' check (status in ('new', 'active', 'returned', 'rejected'))
);

create index if not exists rental_requests_created_idx on public.rental_requests (created_at desc);

alter table public.rental_requests enable row level security;

drop policy if exists "rental requests insert" on public.rental_requests;
drop policy if exists "rental requests read"   on public.rental_requests;
drop policy if exists "rental requests update" on public.rental_requests;
drop policy if exists "rental requests delete" on public.rental_requests;
create policy "rental requests insert" on public.rental_requests for insert to anon, authenticated with check (status = 'new');
create policy "rental requests read"   on public.rental_requests for select to authenticated using (true);
create policy "rental requests update" on public.rental_requests for update to authenticated using (true) with check (true);
create policy "rental requests delete" on public.rental_requests for delete to authenticated using (true);
