-- Ижара: эрте жана кайталанма эскертүүлөр.
--   Баланс 2 күнгө жетсе → күнүнө 1 жолу (эртең менен 09:00) «алдын ала толуктаңыз»
--   Баланс 1 күнгө же андан азга жетсе → күнүнө 3 жолу (09:00, 14:00, 19:00)
--   Мөөнөт өтүп кетсе (баланс минуста) → күнүнө 3 жолу кардарга, админдерге күнүнө 1 жолу
-- 027 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

-- 1) Акы алуу эми эскертүү жөнөтпөйт (эскертүүлөр rent_remind_all ичинде)
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
  if bal < 0 then
    perform public.notify_admins('Ижара: баланс минуста', r.name || ' · ' || r.phone || ' · ' || r.bike_name || ' · ' || bal || ' сом', '/admin/rent-requests', 'rent-neg-' || r.id || '-' || today);
  end if;
end $$;
revoke all on function public.rent_bill_one(uuid) from public, anon, authenticated;

-- 2) Эскертүүлөр: күнүнө 3 жолу иштейт
create or replace function public.rent_remind_all()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n integer := 0;
  bal integer;
  left_days integer;
  local_now timestamp := now() at time zone 'Asia/Bishkek';
  today text := to_char(local_now, 'YYYY-MM-DD');
  slot text := to_char(local_now, 'HH24');
  morning boolean := extract(hour from local_now) < 12;
begin
  for r in select * from public.rental_requests where billing and status = 'active' and user_id is not null and daily_price > 0 loop
    perform public.rent_bill_one(r.id);  -- акы алынбай калса, адегенде алат (кайра чакырса зыяны жок)
    bal := public.wallet_balance_of(r.user_id);
    left_days := floor(bal::numeric / r.daily_price)::int;

    if bal < 0 then
      perform public.notify_user(r.user_id, '⚠️ Ижара мөөнөтү өтүп кетти',
        r.bike_name || ' · карызыңыз ' || abs(bal) || ' сом. Балансты бүгүн толуктаңыз же велосипедди кайтарып бериңиз (келишим 6-бөлүм).',
        'reminder', 'rent-due-' || r.id || '-' || today || '-' || slot);
      n := n + 1;
    elsif left_days <= 1 then
      perform public.notify_user(r.user_id, 'Аренда келди — балансты толуктаңыз',
        r.bike_name || ' · балансыңызда ' || bal || ' сом калды, ' ||
        case when left_days = 1 then 'бир гана күнгө жетет' else 'эртеңкиге жетпейт' end ||
        ' (күнүнө ' || r.daily_price || ' сом).',
        'reminder', 'rent-low-' || r.id || '-' || today || '-' || slot);
      n := n + 1;
    elsif left_days = 2 and morning then
      perform public.notify_user(r.user_id, 'Ижарага 2 күн калды',
        r.bike_name || ' · балансыңыз ' || bal || ' сом, 2 күнгө жетет. Алдын ала толуктап коюңуз.',
        'reminder', 'rent-soon-' || r.id || '-' || today);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.rent_remind_all() from public, anon, authenticated;

-- 3) Бишкек убактысы: 09:00, 14:00, 19:00 (UTC 03:00, 08:00, 13:00). 00:10 акы алуу ошол бойдон калат.
do $$
begin
  create extension if not exists pg_cron;
  begin
    perform cron.unschedule('jorgo-rent-billing-morning');
  exception when others then null;
  end;
  perform cron.schedule('jorgo-rent-reminders', '0 3,8,13 * * *', 'select public.rent_remind_all()');
exception when others then
  raise notice 'pg_cron жеткиликсиз: %', sqlerrm;
end $$;
