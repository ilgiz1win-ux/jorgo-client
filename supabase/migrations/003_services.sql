-- Оңдоо кызматтары: таблица, коопсуздук эрежелери жана баштапкы кызматтар.
-- Supabase → SQL Editor → New query → ушул файлды толук коюп, Run басыңыз.

create table if not exists public.services (
  id    text primary key,
  title text not null,
  price text not null default '',
  icon  text not null default 'wrench',
  sort  integer not null default 0
);

alter table public.services enable row level security;

drop policy if exists "services read"  on public.services;
drop policy if exists "services write" on public.services;
create policy "services read"  on public.services for select using (true);
create policy "services write" on public.services for all to authenticated using (true) with check (true);

insert into public.services (id, title, price, icon, sort) values
  ('diag',       'Диагностика',                         '300 сом',     'stethoscope',      0),
  ('battery',    'Батареяны оңдоо / ячейка алмаштыруу', '1500 сомдон', 'battery-sync',     1),
  ('motor',      'Моторду оңдоо',                       '2000 сомдон', 'engine',           2),
  ('controller', 'Контроллер алмаштыруу',               '800 сом',     'chip',             3),
  ('wiring',     'Электр зымдарын оңдоо',               '700 сомдон',  'flash',            4),
  ('brakes',     'Тормозду жөндөө',                     '400 сом',     'car-brake-alert',  5),
  ('tire',       'Камера / покрышка алмаштыруу',        '350 сом',     'tire',             6),
  ('conversion', 'Велосипедди электрлештирүү',          '3000 сом',    'bicycle-electric', 7),
  ('service',    'Толук тейлөө (ТО)',                   '1500 сом',    'wrench',           8)
on conflict (id) do nothing;
