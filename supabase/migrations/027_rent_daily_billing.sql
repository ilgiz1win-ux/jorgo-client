-- Ижара балансы менен: күнүмдүк акы, минимум 1 жума, кайтарылгандагы абалы жана зыян.
-- • Ижарага алуу үчүн баланста бир жумалык акча болушу керек (күндүк баа × 7).
-- • Админ велосипедди бергенде («Ижараны баштоо») ижара башталат. Ошол күн акысыз,
--   кийинки күндөн баштап ар күнү күндүк баа балансынан алынат.
-- • Баланста бир күндүк акча калганда кардарга «Аренда келди, толуктаңыз» деген эскертүү барат.
-- • 1 жумадан эрте кайтарса — жуманын калган күндөрү да алынат.
-- • Кайтарылганда: электроника бузулса 50%, механика 100%, жоготсо толук, батарея алмаштыруу акысыз.
-- 026 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

alter table public.wallet_tx drop constraint if exists wallet_tx_kind_check;
alter table public.wallet_tx add constraint wallet_tx_kind_check check (kind in ('topup', 'outcall', 'refund', 'adjust', 'rent', 'damage'));
alter table public.wallet_tx add column if not exists rental_id uuid references public.rental_requests (id) on delete set null;

alter table public.rental_requests add column if not exists billing       boolean not null default false; -- жаңы тартип (баланстан күн сайын)
alter table public.rental_requests add column if not exists daily_price   integer check (daily_price is null or daily_price between 0 and 100000);
alter table public.rental_requests add column if not exists started_at    timestamptz;
alter table public.rental_requests add column if not exists charged_days  integer not null default 0;
alter table public.rental_requests add column if not exists returned_at   timestamptz;
alter table public.rental_requests add column if not exists dmg_electronics integer not null default 0;  -- бузулган электрониканын баасы (кардар 50% төлөйт)
alter table public.rental_requests add column if not exists dmg_mechanics   integer not null default 0;  -- механика (кардар толук төлөйт)
alter table public.rental_requests add column if not exists dmg_lost        integer not null default 0;  -- жоголгон нерсе / велосипед (толук)
alter table public.rental_requests add column if not exists battery_swapped boolean not null default false; -- батарея алмаштырылды (акысыз)
alter table public.rental_requests add column if not exists damage_charged  integer not null default 0;
alter table public.rental_requests add column if not exists return_note     text not null default '' check (char_length(return_note) <= 500);

create or replace function public.rent_min_days() returns integer language sql immutable as $$ select 7 $$;

-- Велосипеддин күндүк баасы: price_day, жок болсо жуманын/айдын баасынан эсептелет
create or replace function public.rental_daily_price(p_bike text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(r.price_day, round(r.price_week / 7.0)::int, round(r.price_month / 30.0)::int)
  from public.rentals r where r.id = p_bike;
$$;
grant execute on function public.rental_daily_price(text) to anon, authenticated;

-- Жаңы өтүнмө: кардар аккаунту менен, баланста бир жумалык акча болушу керек
create or replace function public.rent_request_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare price integer;
begin
  new.started_at := null; new.charged_days := 0; new.returned_at := null; new.damage_charged := 0;
  new.dmg_electronics := 0; new.dmg_mechanics := 0; new.dmg_lost := 0; new.battery_swapped := false;
  if public.is_admin() and not new.billing then return new; end if;
  if new.user_id is null then raise exception 'rent_login_required'; end if;
  price := public.rental_daily_price(new.bike_id);
  if price is null or price <= 0 then raise exception 'rent_no_price'; end if;
  if public.wallet_balance_of(new.user_id) < price * public.rent_min_days() then raise exception 'rent_low_balance'; end if;
  new.billing := true;
  new.daily_price := price;
  new.period := 'day';
  new.count := public.rent_min_days();
  new.total := price * public.rent_min_days();
  return new;
end $$;
drop trigger if exists rent_request_check on public.rental_requests;
create trigger rent_request_check before insert on public.rental_requests for each row execute function public.rent_request_check();

-- Бир ижара үчүн бүгүнкү күнгө чейинки акыны алуу (биринчи күн акысыз)
create or replace function public.rent_bill_one(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rental_requests;
  due integer;
  today date := (now() at time zone 'Asia/Bishkek')::date;
  bal integer;
begin
  select * into r from public.rental_requests where id = p_id for update;
  if r.id is null or not r.billing or r.status <> 'active' or r.started_at is null or r.user_id is null then return; end if;
  due := greatest(0, today - (r.started_at at time zone 'Asia/Bishkek')::date);
  while r.charged_days < due loop
    r.charged_days := r.charged_days + 1;
    insert into public.wallet_tx (user_id, amount, kind, rental_id, note, created_by)
    values (r.user_id, -r.daily_price, 'rent', r.id,
      left(r.bike_name || ' · ' || to_char((r.started_at at time zone 'Asia/Bishkek')::date + r.charged_days, 'DD.MM'), 200), null);
  end loop;
  update public.rental_requests set charged_days = r.charged_days where id = r.id;

  bal := public.wallet_balance_of(r.user_id);
  if bal <= r.daily_price then
    perform public.notify_user(r.user_id,
      case when bal < 0 then 'Балансыңыз минуста — ижараны толуктаңыз' else 'Аренда келди — балансты толуктаңыз' end,
      r.bike_name || ' · балансыңызда ' || bal || ' сом калды (күнүнө ' || r.daily_price || ' сом).', 'reminder', 'rent-low-' || r.id || '-' || today);
  end if;
  if bal < 0 then
    perform public.notify_admins('Ижара: баланс минуста', r.name || ' · ' || r.phone || ' · ' || r.bike_name || ' · ' || bal || ' сом', '/admin/rent-requests', 'rent-neg-' || r.id || '-' || today);
  end if;
end $$;
revoke all on function public.rent_bill_one(uuid) from public, anon, authenticated;

-- Ар күнү: бардык активдүү ижаралар
create or replace function public.rent_bill_all()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare r record; n integer := 0;
begin
  for r in select id from public.rental_requests where billing and status = 'active' loop
    perform public.rent_bill_one(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.rent_bill_all() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  -- Бишкек убактысы менен 00:10 (18:10 UTC) — акы алуу; 09:00 (03:00 UTC) — эскертүүлөр кайра текшерилет
  perform cron.schedule('jorgo-rent-billing', '10 18 * * *', 'select public.rent_bill_all()');
  perform cron.schedule('jorgo-rent-billing-morning', '0 3 * * *', 'select public.rent_bill_all()');
exception when others then
  raise notice 'pg_cron жеткиликсиз: %', sqlerrm;
end $$;

-- Админ: велосипедди берди — ижара башталды
create or replace function public.admin_rent_start(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r public.rental_requests;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select * into r from public.rental_requests where id = p_id for update;
  if r.id is null or r.status <> 'new' then return; end if;
  update public.rental_requests set status = 'active', started_at = now(), charged_days = 0 where id = p_id;
  if r.billing then
    perform public.notify_user(r.user_id, 'Ижара башталды 🚲',
      r.bike_name || ' · бүгүн акысыз, эртеңден баштап күнүнө ' || r.daily_price || ' сом балансыңыздан алынат. Минимум ' || public.rent_min_days() || ' күн.', 'rent');
  end if;
end $$;
revoke all on function public.admin_rent_start(uuid) from public, anon;
grant execute on function public.admin_rent_start(uuid) to authenticated;

-- Админ: велосипед кайтарылды — калган акы, минимум 1 жума жана зыян
create or replace function public.admin_rent_return(p_id uuid, p_electronics integer, p_mechanics integer, p_lost integer, p_battery boolean, p_note text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rental_requests;
  rest integer;
  dmg integer;
  extra integer := 0;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  perform public.rent_bill_one(p_id);
  select * into r from public.rental_requests where id = p_id for update;
  if r.id is null or r.status <> 'active' then return 0; end if;

  if r.billing and r.charged_days < public.rent_min_days() then
    rest := public.rent_min_days() - r.charged_days;
    insert into public.wallet_tx (user_id, amount, kind, rental_id, note)
    values (r.user_id, -(rest * r.daily_price), 'rent', r.id, left(r.bike_name || ' · минимум ' || public.rent_min_days() || ' күн (' || rest || ' күн)', 200));
    extra := rest * r.daily_price;
    r.charged_days := public.rent_min_days();
  end if;

  dmg := round(greatest(coalesce(p_electronics, 0), 0) * 0.5)::int + greatest(coalesce(p_mechanics, 0), 0) + greatest(coalesce(p_lost, 0), 0);
  if dmg > 0 and r.user_id is not null then
    insert into public.wallet_tx (user_id, amount, kind, rental_id, note)
    values (r.user_id, -dmg, 'damage', r.id, left('Зыян: ' || r.bike_name ||
      case when coalesce(p_electronics, 0) > 0 then ' · электроника 50%' else '' end ||
      case when coalesce(p_mechanics, 0) > 0 then ' · механика' else '' end ||
      case when coalesce(p_lost, 0) > 0 then ' · жоголгон' else '' end, 200));
  end if;

  update public.rental_requests set status = 'returned', returned_at = now(), charged_days = r.charged_days,
    dmg_electronics = greatest(coalesce(p_electronics, 0), 0), dmg_mechanics = greatest(coalesce(p_mechanics, 0), 0),
    dmg_lost = greatest(coalesce(p_lost, 0), 0), battery_swapped = coalesce(p_battery, false), damage_charged = dmg,
    return_note = left(coalesce(p_note, ''), 500)
  where id = p_id;

  if r.user_id is not null then
    perform public.notify_user(r.user_id, 'Ижара бүттү · ' || r.bike_name,
      concat_ws(' · ',
        r.charged_days || ' күн',
        case when extra > 0 then 'минимум 1 жума: +' || extra || ' сом' end,
        case when dmg > 0 then 'зыян: ' || dmg || ' сом' end,
        case when coalesce(p_battery, false) then 'батарея алмаштырылды (акысыз)' end,
        'балансыңыз: ' || public.wallet_balance_of(r.user_id) || ' сом'), 'rent');
  end if;
  return dmg + extra;
end $$;
revoke all on function public.admin_rent_return(uuid, integer, integer, integer, boolean, text) from public, anon;
grant execute on function public.admin_rent_return(uuid, integer, integer, integer, boolean, text) to authenticated;

-- Жаңы тартиптеги ижарада «башталды/бүттү» билдирмеси функциялардын өзүнөн кетет (кайталанбасын)
create or replace function public.rental_requests_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_admins('Жаңы ижара өтүнмөсү', format('%s · %s · %s%s', new.name, new.bike_name, new.phone,
      case when new.billing then ' · күнүнө ' || new.daily_price || ' сом' else '' end), '/admin/rent-requests');
  elsif new.status is distinct from old.status and not (new.billing and new.status in ('active', 'returned')) then
    perform public.notify_user(new.user_id,
      case new.status when 'active' then 'Ижара башталды' when 'returned' then 'Ижара аяктады' when 'rejected' then 'Өтүнмө четке кагылды' else 'Өтүнмө жаңыланды' end,
      new.bike_name, 'rent');
  end if;
  return new;
end $$;
