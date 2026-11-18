-- Билдирмелер (кардарга жана админдерге), ижара төлөмдөрү, төлөмгө бир күн калганда эскертүү, админдерди башкаруу.
-- Supabase → SQL Editor → New query → ушул файлды толук коюп, Run басыңыз. Кайра иштетсе зыяны жок.

-- 1) Билдирмелер: ар бир колдонуучуга өзүнчө сап. Колдонуучу өзүнүкүн гана көрөт.
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null check (char_length(title) <= 120),
  body       text not null default '' check (char_length(body) <= 500),
  kind       text not null default 'info',
  link       text,
  read       boolean not null default false,
  dedupe     text
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create unique index if not exists notifications_dedupe_idx on public.notifications (user_id, dedupe) where dedupe is not null;

alter table public.notifications enable row level security;
drop policy if exists "notifications own read"   on public.notifications;
drop policy if exists "notifications own update" on public.notifications;
drop policy if exists "notifications own delete" on public.notifications;
drop policy if exists "notifications admin send" on public.notifications;
create policy "notifications own read"   on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications own delete" on public.notifications for delete to authenticated using (user_id = auth.uid());
create policy "notifications admin send" on public.notifications for insert to authenticated with check (public.is_admin());

-- Бардык админдерге билдирме (админ алмашса, жаңы админ кийинки билдирмелерди алат)
create or replace function public.notify_admins(p_title text, p_body text, p_link text default null, p_dedupe text default null)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, title, body, kind, link, dedupe)
  select a.user_id, left(p_title, 120), left(coalesce(p_body, ''), 500), 'admin', p_link, p_dedupe from public.admins a
  on conflict do nothing;
$$;
revoke all on function public.notify_admins(text, text, text, text) from public, anon, authenticated;

create or replace function public.notify_user(p_user uuid, p_title text, p_body text, p_kind text default 'info', p_dedupe text default null)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, title, body, kind, dedupe)
  select p_user, left(p_title, 120), left(coalesce(p_body, ''), 500), p_kind, p_dedupe where p_user is not null
  on conflict do nothing;
$$;
revoke all on function public.notify_user(uuid, text, text, text, text) from public, anon, authenticated;

-- 2) Ижара: төлөнгөн мөөнөт жана төлөмдөр тарыхы
alter table public.rental_requests add column if not exists paid_until date;

create table if not exists public.rent_payments (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id uuid not null references public.rental_requests (id) on delete cascade,
  amount     integer not null check (amount >= 0),
  units      integer not null default 1 check (units between 1 and 365),
  method     text not null check (method in ('cash', 'mbank', 'odengi', 'card', 'other')),
  paid_until date not null,
  created_by uuid default auth.uid()
);
create index if not exists rent_payments_request_idx on public.rent_payments (request_id, created_at desc);
alter table public.rent_payments enable row level security;
drop policy if exists "rent payments read" on public.rent_payments;
create policy "rent payments read" on public.rent_payments for select to authenticated
  using (public.is_admin() or exists (select 1 from public.rental_requests r where r.id = request_id and r.user_id = auth.uid()));

-- Төлөм кабыл алуу (админ гана): төлөнгөн мөөнөттү узартат жана кардарга билдирме жиберет
create or replace function public.record_rent_payment(p_request uuid, p_amount integer, p_units integer, p_method text)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rental_requests;
  today date := (now() at time zone 'Asia/Bishkek')::date;
  step interval;
  new_until date;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select * into r from public.rental_requests where id = p_request for update;
  if not found then raise exception 'request not found'; end if;
  step := case r.period when 'day' then interval '1 day' when 'week' then interval '7 days' else interval '1 month' end;
  new_until := (greatest(coalesce(r.paid_until, today), today) + step * greatest(p_units, 1))::date;
  insert into public.rent_payments (request_id, amount, units, method, paid_until)
  values (p_request, greatest(p_amount, 0), greatest(p_units, 1), p_method, new_until);
  update public.rental_requests set paid_until = new_until, status = case when status = 'new' then 'active' else status end where id = p_request;
  perform public.notify_user(r.user_id, 'Төлөм кабыл алынды',
    format('%s сом. Ижара %s чейин төлөндү.', greatest(p_amount, 0), to_char(new_until, 'DD.MM.YYYY')), 'payment');
  return new_until;
end $$;
revoke all on function public.record_rent_payment(uuid, integer, integer, text) from public, anon;
grant execute on function public.record_rent_payment(uuid, integer, integer, text) to authenticated;

-- 3) Автоматтык билдирмелер
create or replace function public.rental_requests_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_admins('Жаңы ижара өтүнмөсү', format('%s · %s · %s', new.name, new.bike_name, new.phone), '/admin/rent-requests');
  elsif new.status is distinct from old.status then
    perform public.notify_user(new.user_id,
      case new.status when 'active' then 'Ижара башталды' when 'returned' then 'Ижара аяктады' when 'rejected' then 'Өтүнмө четке кагылды' else 'Өтүнмө жаңыланды' end,
      new.bike_name, 'rent');
  end if;
  return new;
end $$;
drop trigger if exists rental_requests_notify on public.rental_requests;
create trigger rental_requests_notify after insert or update of status on public.rental_requests
  for each row execute function public.rental_requests_notify();

-- Ар күнү: эртең төлөй турган кардарларга эскертүү, админдерге кечиккендердин тизмеси
create or replace function public.send_payment_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Bishkek')::date;
  n integer := 0;
  r record;
begin
  for r in select * from public.rental_requests where status = 'active' and paid_until = today + 1 loop
    perform public.notify_user(r.user_id, 'Эртең төлөм күнү',
      format('%s: ижара %s чейин төлөнгөн. Ижараны улантуу үчүн төлөмдү унутпаңыз.', r.bike_name, to_char(r.paid_until, 'DD.MM.YYYY')),
      'reminder', 'remind-' || r.id || '-' || r.paid_until);
    n := n + 1;
  end loop;
  for r in select * from public.rental_requests where status = 'active' and paid_until is not null and paid_until <= today loop
    perform public.notify_admins(
      case when r.paid_until = today then 'Бүгүн төлөм күнү' else 'Төлөм кечикти' end,
      format('%s · %s · %s чейин төлөнгөн', r.name, r.phone, to_char(r.paid_until, 'DD.MM.YYYY')),
      '/admin/rent-requests', 'due-' || r.id || '-' || today);
  end loop;
  return n;
end $$;
revoke all on function public.send_payment_reminders() from public, anon, authenticated;

-- Ар күнү саат 09:00 (Бишкек) = 03:00 UTC. pg_cron жок болсо, бул кадам өткөрүлүп кетет.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('jorgo-payment-reminders', '0 3 * * *', 'select public.send_payment_reminders()');
exception when others then
  raise notice 'pg_cron жеткиликсиз: %', sqlerrm;
end $$;

-- 4) Админдерди башкаруу (админ гана)
create or replace function public.admin_list()
returns table (user_id uuid, login text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return query
    select a.user_id, coalesce(u.email, '')::text, a.created_at
    from public.admins a join auth.users u on u.id = a.user_id
    order by a.created_at;
end $$;
revoke all on function public.admin_list() from public, anon;
grant execute on function public.admin_list() to authenticated;

-- login: email же кардардын телефону (+996 700 123 456). Колдонуучу мурда катталган болушу керек.
create or replace function public.admin_add(p_login text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  digits text := regexp_replace(coalesce(p_login, ''), '\D', '', 'g');
  uid uuid;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if position('@' in p_login) > 0 then
    select id into uid from auth.users where lower(email) = lower(trim(p_login));
  else
    if left(digits, 1) = '0' then digits := substr(digits, 2); end if;
    if length(digits) = 9 then digits := '996' || digits; end if;
    select id into uid from auth.users where email = digits || '@phone.jorgo.app';
  end if;
  if uid is null then return false; end if;
  insert into public.admins (user_id) values (uid) on conflict do nothing;
  return true;
end $$;
revoke all on function public.admin_add(text) from public, anon;
grant execute on function public.admin_add(text) to authenticated;

create or replace function public.admin_remove(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if p_user = auth.uid() then raise exception 'cannot remove yourself'; end if;
  if (select count(*) from public.admins) <= 1 then raise exception 'last admin'; end if;
  delete from public.admins where user_id = p_user;
end $$;
revoke all on function public.admin_remove(uuid) from public, anon;
grant execute on function public.admin_remove(uuid) to authenticated;
