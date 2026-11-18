-- Электровелосипед ижарасы (аренда): велосипеддер таблицасы, статистикага «rent» окуясы.
-- Supabase → SQL Editor → New query → ушул файлды толук коюп, Run басыңыз. Кайра иштетсе зыяны жок.

create table if not exists public.rentals (
  id          text primary key,
  name        text not null,
  image_url   text,
  description text not null default '',
  specs       jsonb not null default '[]'::jsonb,
  price_day   integer check (price_day is null or price_day >= 0),
  price_week  integer check (price_week is null or price_week >= 0),
  price_month integer check (price_month is null or price_month >= 0),
  deposit     integer check (deposit is null or deposit >= 0),
  available   boolean not null default true,
  sort        integer not null default 0
);

alter table public.rentals enable row level security;

drop policy if exists "rentals read"  on public.rentals;
drop policy if exists "rentals write" on public.rentals;
create policy "rentals read"  on public.rentals for select using (true);
create policy "rentals write" on public.rentals for all to authenticated using (true) with check (true);

-- Статистика: ижарага өтүнмөнү да эсептейбиз
alter table public.events drop constraint if exists events_type_check;
alter table public.events add constraint events_type_check
  check (type in ('visit', 'product_view', 'order', 'repair', 'rent'));

create or replace function public.admin_stats(p_days integer default 7)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select greatest(least(coalesce(p_days, 7), 90), 1) as n,
           (now() at time zone 'Asia/Bishkek')::date as today
  ),
  ev as (
    select e.*, (e.created_at at time zone 'Asia/Bishkek')::date as d
    from public.events e, params
    where e.created_at >= now() - make_interval(days => params.n + 2)
  ),
  win as (
    select ev.* from ev, params where ev.d > params.today - params.n
  )
  select json_build_object(
    'today_visitors',     (select count(distinct visitor) from ev, params where d = params.today),
    'today_views',        (select count(*) from ev, params where d = params.today and type in ('visit', 'product_view')),
    'yesterday_visitors', (select count(distinct visitor) from ev, params where d = params.today - 1),
    'period_visitors',    (select count(distinct visitor) from win),
    'orders',             (select count(*) from win where type = 'order'),
    'repairs',            (select count(*) from win where type = 'repair'),
    'rents',              (select count(*) from win where type = 'rent'),
    'daily', (
      select coalesce(json_agg(json_build_object('day', s.day, 'visitors', coalesce(c.v, 0)) order by s.day), '[]'::json)
      from params,
           lateral (select (params.today - g)::date as day from generate_series(0, params.n - 1) g) s
      left join (select d, count(distinct visitor) as v from ev group by d) c on c.d = s.day
    ),
    'top_products', (
      select coalesce(json_agg(t order by t.views desc), '[]'::json)
      from (select product_id as id, count(*) as views from win
            where type = 'product_view' and product_id is not null
            group by product_id order by views desc limit 5) t
    ),
    'platforms', (
      select coalesce(json_object_agg(p.platform, p.n), '{}'::json)
      from (select coalesce(platform, 'web') as platform, count(distinct visitor) as n from win group by 1) p
    )
  );
$$;

revoke all on function public.admin_stats(integer) from public, anon;
grant execute on function public.admin_stats(integer) to authenticated;
