-- Электрондук ижара келишими (кагаздагы «Договор аренды велосипеда» сыяктуу).
-- Кардар: паспорт ким берген (Выдан), экинчи телефон. Админ велосипедди бергенде: велосипеддин номери,
-- Жорго №, батарея, велосипеддин баасы, депозит, залог, комплектация. Келишимдин номери өзү берилет.
-- 027 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

alter table public.profiles add column if not exists passport_issued_by text not null default '';
alter table public.profiles add column if not exists phone2 text not null default '';
alter table public.profiles drop constraint if exists profiles_contract_fields_check;
alter table public.profiles add constraint profiles_contract_fields_check check (char_length(passport_issued_by) <= 80 and char_length(phone2) <= 30);

create sequence if not exists public.rent_contract_seq start 1;
alter table public.rental_requests add column if not exists contract_no integer;
alter table public.rental_requests add column if not exists bike_no     text not null default '';
alter table public.rental_requests add column if not exists jorgo_no    text not null default '';
alter table public.rental_requests add column if not exists battery_no  text not null default '';
alter table public.rental_requests add column if not exists bike_value  integer;
alter table public.rental_requests add column if not exists deposit     integer;
alter table public.rental_requests add column if not exists collateral  text not null default '';
alter table public.rental_requests add column if not exists kit         jsonb not null default '[]'::jsonb;
alter table public.rental_requests drop constraint if exists rental_requests_contract_check;
alter table public.rental_requests add constraint rental_requests_contract_check check (
  char_length(bike_no) <= 40 and char_length(jorgo_no) <= 40 and char_length(battery_no) <= 60 and char_length(collateral) <= 120
  and (bike_value is null or bike_value between 0 and 10000000) and (deposit is null or deposit between 0 and 10000000)
  and jsonb_typeof(kit) = 'array' and char_length(kit::text) <= 400);
create unique index if not exists rental_requests_contract_no_idx on public.rental_requests (contract_no) where contract_no is not null;

-- Админ: велосипедди берди — келишимдин маалыматы менен ижараны баштоо
create or replace function public.admin_rent_start(p_id uuid, p_details jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rental_requests;
  no integer;
  d jsonb := coalesce(p_details, '{}'::jsonb);
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select * into r from public.rental_requests where id = p_id for update;
  if r.id is null or r.status <> 'new' then return r.contract_no; end if;
  no := coalesce(r.contract_no, nextval('public.rent_contract_seq'));
  update public.rental_requests set
    status = 'active', started_at = now(), charged_days = 0, contract_no = no,
    bike_no = left(coalesce(d->>'bikeNo', ''), 40),
    jorgo_no = left(coalesce(d->>'jorgoNo', ''), 40),
    battery_no = left(coalesce(d->>'batteryNo', ''), 60),
    bike_value = nullif(d->>'bikeValue', '')::int,
    deposit = nullif(d->>'deposit', '')::int,
    collateral = left(coalesce(d->>'collateral', ''), 120),
    kit = case when jsonb_typeof(d->'kit') = 'array' then d->'kit' else '[]'::jsonb end
  where id = p_id;
  if r.billing then
    perform public.notify_user(r.user_id, 'Ижара башталды 🚲 · Келишим №' || no,
      r.bike_name || ' · бүгүн акысыз, эртеңден баштап күнүнө ' || r.daily_price || ' сом балансыңыздан алынат. Минимум ' || public.rent_min_days() || ' күн.', 'rent');
  end if;
  return no;
end $$;
revoke all on function public.admin_rent_start(uuid, jsonb) from public, anon;
grant execute on function public.admin_rent_start(uuid, jsonb) to authenticated;

-- Эски чакыруу (бир параметр) да иштей берсин
create or replace function public.admin_rent_start(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$ select public.admin_rent_start(p_id, '{}'::jsonb); $$;
