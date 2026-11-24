-- Админ башкы бети: точкалар боюнча акча (бүгүн / ушул ай / күн сайын) жана мастерлердин иши.
-- Оңдоонун акысы: мастер (же админ) «Бүттү» басканда канча алганын жазат (price), бүткөн убакыт done_at.
-- Кардар бүткөн выезд/оңдоону 1–5 жылдыз менен баалайт; мастердин рейтинги ошондон эсептелет.
-- 027–032 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

alter table public.repair_requests add column if not exists price integer;
alter table public.repair_requests add column if not exists done_at timestamptz;
alter table public.repair_requests drop constraint if exists repair_requests_price_check;
alter table public.repair_requests add constraint repair_requests_price_check check (price is null or price between 0 and 1000000);
update public.repair_requests set done_at = coalesce(updated_at, created_at) where status = 'done' and done_at is null;

-- Кардардын баасы
alter table public.repair_requests add column if not exists rating smallint;
alter table public.repair_requests add column if not exists rating_note text not null default '';
alter table public.repair_requests add column if not exists rated_at timestamptz;
alter table public.repair_requests drop constraint if exists repair_requests_rating_check;
alter table public.repair_requests add constraint repair_requests_rating_check check ((rating is null or rating between 1 and 5) and char_length(rating_note) <= 500);

-- Кардар акыны өзү жаза албайт; бүткөн убакытты сервер коёт
create or replace function public.repairs_done_stamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_admin() then new.price := null; end if;
    new.done_at := case when new.status = 'done' then now() end;
    new.rating := null; new.rating_note := ''; new.rated_at := null;
    return new;
  end if;
  -- Баа customer_rate_repair аркылуу гана коюлат (мастер өзүнө баа коё албайт)
  if coalesce(current_setting('jorgo.rate', true), '') <> 'on' then
    new.rating := old.rating; new.rating_note := old.rating_note; new.rated_at := old.rated_at;
  end if;
  if new.status = 'done' and old.status is distinct from 'done' then new.done_at := now();
  elsif new.status <> 'done' then new.done_at := null;
  else new.done_at := old.done_at;
  end if;
  return new;
end $$;
drop trigger if exists repairs_done_stamp on public.repair_requests;
create trigger repairs_done_stamp before insert or update on public.repair_requests
  for each row execute function public.repairs_done_stamp();

-- Кардар: бүткөн заказга бир жолу баа коюу (1–5) жана пикир
create or replace function public.customer_rate_repair(p_id uuid, p_stars integer, p_note text default '')
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.repair_requests;
  note text := left(trim(coalesce(p_note, '')), 500);
  stars text;
begin
  if p_stars is null or p_stars not between 1 and 5 then raise exception 'bad rating'; end if;
  select * into r from public.repair_requests where id = p_id and user_id = auth.uid() for update;
  if r.id is null or r.status <> 'done' or r.rated_at is not null then return false; end if;
  perform set_config('jorgo.rate', 'on', true);
  update public.repair_requests set rating = p_stars, rating_note = note, rated_at = now() where id = p_id;
  perform set_config('jorgo.rate', '', true);
  stars := repeat('★', p_stars) || repeat('☆', 5 - p_stars);
  if r.master_id is not null then
    update public.masters set rating = (select round(avg(x.rating)::numeric, 1) from public.repair_requests x where x.master_id = r.master_id and x.rating is not null)
    where id = r.master_id;
    perform public.notify_user(a.user_id, 'Кардар баа берди: ' || stars, '№' || r.number || case when note <> '' then ' · ' || note else '' end, 'repair')
    from public.master_accounts a where a.master_id = r.master_id;
  end if;
  perform public.notify_admins('Баа ' || stars || ' · №' || r.number || case when r.outcall then ' (выезд)' else '' end,
    r.name || coalesce(' → ' || (select m.name from public.masters m where m.id = r.master_id), '') || case when note <> '' then ' · ' || note else '' end, '/admin/repairs');
  return true;
end $$;
revoke all on function public.customer_rate_repair(uuid, integer, text) from public, anon;
grant execute on function public.customer_rate_repair(uuid, integer, text) to authenticated;

-- Башкы беттин маалыматы
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  t0 timestamptz := date_trunc('day', now() at time zone 'Asia/Bishkek') at time zone 'Asia/Bishkek';
  m0 timestamptz := date_trunc('month', now() at time zone 'Asia/Bishkek') at time zone 'Asia/Bishkek';
  d0 timestamptz := (date_trunc('day', now() at time zone 'Asia/Bishkek') - interval '13 days') at time zone 'Asia/Bishkek';
  since timestamptz;
  res jsonb;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  since := least(m0, d0);

  with money as (
    -- Товар сатуу (алып кетти / жеткирилди)
    select coalesce(nullif(o.branch, ''), 'Экспресс / башка') b, 'sales' k, coalesce(o.goods_total, 0) amt, o.created_at at_ from public.orders o
    where o.status in ('picked_up', 'delivered') and o.created_at >= since
    union all
    -- Оңдоо (мастер жазган акы)
    select coalesce(nullif(r.branch, ''), '—'), 'repair', coalesce(r.price, 0), r.done_at from public.repair_requests r
    where r.status = 'done' and r.done_at >= since
    union all
    -- Выезд акысы (кайтарылганы кемитилет)
    select coalesce(nullif(r.branch, ''), '—'), 'outcall', -t.amount, t.created_at from public.wallet_tx t join public.repair_requests r on r.id = t.repair_id
    where t.kind in ('outcall', 'refund') and t.created_at >= since
    union all
    -- Ижара жана зыян (точкага байланбайт)
    select 'Ижара', 'rent', -t.amount, t.created_at from public.wallet_tx t where t.kind in ('rent', 'damage') and t.created_at >= since
  ),
  per_branch as (
    select b,
      jsonb_build_object(
        'sales', coalesce(sum(amt) filter (where k = 'sales' and at_ >= t0), 0)::int,
        'repair', coalesce(sum(amt) filter (where k = 'repair' and at_ >= t0), 0)::int,
        'outcall', coalesce(sum(amt) filter (where k = 'outcall' and at_ >= t0), 0)::int,
        'rent', coalesce(sum(amt) filter (where k = 'rent' and at_ >= t0), 0)::int,
        'total', coalesce(sum(amt) filter (where at_ >= t0), 0)::int) as td,
      jsonb_build_object(
        'sales', coalesce(sum(amt) filter (where k = 'sales' and at_ >= m0), 0)::int,
        'repair', coalesce(sum(amt) filter (where k = 'repair' and at_ >= m0), 0)::int,
        'outcall', coalesce(sum(amt) filter (where k = 'outcall' and at_ >= m0), 0)::int,
        'rent', coalesce(sum(amt) filter (where k = 'rent' and at_ >= m0), 0)::int,
        'total', coalesce(sum(amt) filter (where at_ >= m0), 0)::int) as mo,
      coalesce(sum(amt) filter (where at_ >= m0), 0) as msum
    from money group by b
  )
  select jsonb_build_object(
    'branches', coalesce((select jsonb_agg(jsonb_build_object('branch', b, 'today', td, 'month', mo) order by (b = 'Ижара'), msum desc) from per_branch), '[]'::jsonb),
    'totalToday', coalesce((select sum(amt) from money where at_ >= t0), 0)::int,
    'totalMonth', coalesce((select sum(amt) from money where at_ >= m0), 0)::int,
    -- Акыркы 14 күн: күн сайын канча түштү
    'days', (select jsonb_agg(jsonb_build_object('day', to_char(d, 'YYYY-MM-DD'),
        'sum', coalesce((select sum(amt) from money where at_ >= d at time zone 'Asia/Bishkek' and at_ < (d + interval '1 day') at time zone 'Asia/Bishkek'), 0)::int) order by d desc)
      from generate_series(date_trunc('day', now() at time zone 'Asia/Bishkek') - interval '13 days', date_trunc('day', now() at time zone 'Asia/Bishkek'), interval '1 day') d),
    -- Мастерлер: канча иш бүтүрдү, канча акы
    'masters', coalesce((select jsonb_agg(x order by (x->>'monthDone')::int desc, x->>'name') from (
      select jsonb_build_object(
        'id', m.id, 'name', m.name, 'branch', m.branch, 'active', m.active, 'outcall', coalesce(m.outcall, false),
        'rating', coalesce(m.rating, 0), 'panel', coalesce(a.panel_open, false), 'hasAccount', a.user_id is not null,
        'todayDone', count(r.id) filter (where r.status = 'done' and r.done_at >= t0),
        'monthDone', count(r.id) filter (where r.status = 'done' and r.done_at >= m0),
        'totalDone', count(r.id) filter (where r.status = 'done'),
        'todaySum', coalesce(sum(r.price) filter (where r.status = 'done' and r.done_at >= t0), 0),
        'monthSum', coalesce(sum(r.price) filter (where r.status = 'done' and r.done_at >= m0), 0),
        'monthOutcalls', count(r.id) filter (where r.outcall and r.status = 'done' and r.done_at >= m0),
        'activeNow', count(r.id) filter (where r.status in ('accepted', 'in_progress')),
        'rated', count(r.rating), 'monthAvg', round(avg(r.rating) filter (where r.rated_at >= m0)::numeric, 1),
        'monthCancelled', count(r.id) filter (where r.status = 'cancelled' and r.updated_at >= m0)) x
      from public.masters m
      left join public.master_accounts a on a.master_id = m.id
      left join public.repair_requests r on r.master_id = m.id
      group by m.id, a.panel_open, a.user_id) s), '[]'::jsonb),
    'mastersCount', jsonb_build_object(
      'total', (select count(*)::int from public.masters),
      'active', (select count(*)::int from public.masters where active),
      'panel', (select count(*)::int from public.master_accounts where panel_open),
      'outcall', (select count(*)::int from public.masters where active and coalesce(outcall, false))),
    'repairsToday', jsonb_build_object(
      'new', (select count(*)::int from public.repair_requests where status = 'new'),
      'active', (select count(*)::int from public.repair_requests where status in ('accepted', 'in_progress')),
      'done', (select count(*)::int from public.repair_requests where status = 'done' and done_at >= t0)),
    'unassignedDone', jsonb_build_object(
      'count', (select count(*)::int from public.repair_requests where status = 'done' and done_at >= m0 and master_id is null),
      'noPrice', (select count(*)::int from public.repair_requests where status = 'done' and done_at >= m0 and price is null))
  ) into res;
  return res;
end $$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;
