-- Статистика: канча адам кирди, эмнени карады, канча буйрутма жөнөттү.
-- Кардарлардын аты же телефону сакталбайт: ар бир түзмөк кокус коддон турган анонимдүү ID менен гана эсептелет.
-- Supabase → SQL Editor → New query → ушул файлды толук коюп, Run басыңыз. Кайра иштетсе зыяны жок.

create table if not exists public.events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  type       text not null check (type in ('visit', 'product_view', 'order', 'repair')),
  visitor    text not null check (char_length(visitor) between 8 and 64),
  product_id text check (product_id is null or char_length(product_id) <= 80),
  platform   text check (platform is null or platform in ('web', 'pwa', 'android', 'ios'))
);

create index if not exists events_created_at_idx on public.events (created_at);

alter table public.events enable row level security;

-- Кардарлар окуяны жаза алат, бирок окуй албайт. Окуу — админ гана.
drop policy if exists "events insert" on public.events;
drop policy if exists "events read"   on public.events;
create policy "events insert" on public.events for insert to anon, authenticated with check (true);
create policy "events read"   on public.events for select to authenticated using (true);

-- Админ панелдеги «Статистика» үчүн жыйынтык (Бишкек убактысы менен)
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
