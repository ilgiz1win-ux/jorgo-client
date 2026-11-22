-- Точкалар (филиалдар) боюнча статистика: ар бир заказ/оңдоо өтүнмөсү кайсы точкага кеткенин эсептөө.
-- Точкалардын аттары жана WhatsApp номерлери settings таблицасында (key = 'branches'), админ панелден өзгөртүлөт.
-- Supabase → SQL Editor → New query → ушул файлды толук коюп, Run басыңыз. Кайра иштетсе зыяны жок.

alter table public.events add column if not exists branch text check (branch is null or char_length(branch) <= 80);

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
    'branches', (
      select coalesce(json_agg(json_build_object('branch', b.branch, 'orders', b.orders, 'repairs', b.repairs) order by b.orders + b.repairs desc), '[]'::json)
      from (select branch,
                   count(*) filter (where type = 'order')  as orders,
                   count(*) filter (where type = 'repair') as repairs
            from win where branch is not null and type in ('order', 'repair')
            group by branch) b
    ),
    'platforms', (
      select coalesce(json_object_agg(p.platform, p.n), '{}'::json)
      from (select coalesce(platform, 'web') as platform, count(distinct visitor) as n from win group by 1) p
    )
  );
$$;

revoke all on function public.admin_stats(integer) from public, anon;
grant execute on function public.admin_stats(integer) to authenticated;
