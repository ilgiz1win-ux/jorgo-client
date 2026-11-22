-- Мастерлер: аты, сүрөтү, адистиги, тажрыйбасы, филиалы. Кардарлар көрөт, өзгөртүү — админ гана.
-- Supabase → SQL Editor → New query → ушул файлды коюп, Run басыңыз. Кайра иштетсе зыяны жок.
create table if not exists public.masters (
  id         text primary key,
  name       text not null check (char_length(name) between 2 and 80),
  photo_url  text,
  specialty  text not null default '' check (char_length(specialty) <= 120),
  experience text not null default '' check (char_length(experience) <= 60),
  branch     text not null default '' check (char_length(branch) <= 80),
  active     boolean not null default true,
  sort       integer not null default 0
);
alter table public.masters enable row level security;
drop policy if exists "masters read"  on public.masters;
drop policy if exists "masters write" on public.masters;
create policy "masters read"  on public.masters for select using (true);
create policy "masters write" on public.masters for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Рейтинг, аткарылган заказдар, иштөө убактысы, выезд (жумуштан кийин)
alter table public.masters add column if not exists rating       numeric(2,1) not null default 5 check (rating between 0 and 5);
alter table public.masters add column if not exists orders       integer not null default 0 check (orders >= 0);
alter table public.masters add column if not exists hours_from   text not null default '' check (char_length(hours_from) <= 5);
alter table public.masters add column if not exists hours_to     text not null default '' check (char_length(hours_to) <= 5);
alter table public.masters add column if not exists outcall      boolean not null default false;
alter table public.masters add column if not exists outcall_note text not null default '' check (char_length(outcall_note) <= 120);
