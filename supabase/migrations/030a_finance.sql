-- 030 SQL'дин 1-бөлүгү (үчөөнү тең ушул тартипте иштетиңиз: 030a, 030b, 030c). Кайра иштетсе зыяны жок.

create or replace function public.admin_finance(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  since timestamptz := case when coalesce(p_days, 0) <= 0 then '-infinity'::timestamptz
                            else date_trunc('day', now() at time zone 'Asia/Bishkek') at time zone 'Asia/Bishkek' - make_interval(days => p_days - 1) end;
  res jsonb;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select jsonb_build_object(
    -- Кардарлар канча акча салды (ырасталган толуктоолор), кайсы жол менен
    'topups', coalesce((select jsonb_agg(jsonb_build_object('method', m, 'sum', s, 'count', c) order by s desc)
      from (select coalesce(nullif(method, ''), '—') m, sum(amount)::int s, count(*)::int c from public.topup_requests
            where status = 'approved' and coalesce(decided_at, created_at) >= since group by 1) t), '[]'::jsonb),
    'topupsPending', (select jsonb_build_object('sum', coalesce(sum(amount), 0)::int, 'count', count(*)::int) from public.topup_requests where status = 'new'),
    -- Баланстан тапкан киреше (түрү боюнча)
    'income', jsonb_build_object(
      'rent', coalesce((select -sum(amount) from public.wallet_tx where kind = 'rent' and created_at >= since), 0)::int,
      'outcall', coalesce((select -sum(amount) from public.wallet_tx where kind in ('outcall', 'refund') and repair_id is not null and created_at >= since), 0)::int,
      'damage', coalesce((select -sum(amount) from public.wallet_tx where kind = 'damage' and created_at >= since), 0)::int,
      'adjust', coalesce((select sum(amount) from public.wallet_tx where kind = 'adjust' and created_at >= since), 0)::int),
    -- Товар заказдары
    'orders', (select jsonb_build_object(
        'count', count(*)::int,
        'sold', count(*) filter (where status in ('picked_up', 'delivered'))::int,
        'soldSum', coalesce(sum(goods_total) filter (where status in ('picked_up', 'delivered')), 0)::int,
        'pending', count(*) filter (where status = 'new')::int,
        'pendingSum', coalesce(sum(goods_total) filter (where status = 'new'), 0)::int,
        'cancelled', count(*) filter (where status = 'cancelled')::int,
        'expressFees', coalesce(sum(express_fee) filter (where status in ('picked_up', 'delivered')), 0)::int)
      from public.orders where created_at >= since),
    'ordersByBranch', coalesce((select jsonb_agg(jsonb_build_object('branch', b, 'count', c, 'sum', s) order by s desc)
      from (select coalesce(nullif(branch, ''), 'Экспресс / башка') b, count(*)::int c, coalesce(sum(goods_total), 0)::int s
            from public.orders where created_at >= since and status in ('picked_up', 'delivered') group by 1) t), '[]'::jsonb),
    'topItems', coalesce((select jsonb_agg(jsonb_build_object('name', n, 'qty', q, 'sum', s) order by q desc)
      from (select it->>'name' n, sum(coalesce((it->>'qty')::int, 1))::int q, sum(coalesce((it->>'qty')::int, 1) * coalesce((it->>'price')::int, 0))::int s
            from public.orders o, jsonb_array_elements(o.items) it
            where o.created_at >= since and o.status in ('picked_up', 'delivered') group by 1 order by 2 desc limit 10) t), '[]'::jsonb),
    -- Оңдоо жана выезд
    'repairs', (select jsonb_build_object(
        'count', count(*)::int, 'done', count(*) filter (where status = 'done')::int,
        'active', count(*) filter (where status in ('accepted', 'in_progress'))::int,
        'new', count(*) filter (where status = 'new')::int, 'cancelled', count(*) filter (where status = 'cancelled')::int,
        'outcalls', count(*) filter (where outcall)::int)
      from public.repair_requests where created_at >= since),
    -- Ижара: велосипеддер (азыркы абал)
    'bikes', (select jsonb_build_object(
        'total', (select count(*)::int from public.rentals),
        'busy', (select count(distinct bike_id)::int from public.rental_requests where status = 'active'),
        'waiting', (select count(*)::int from public.rental_requests where status = 'new'),
        'hidden', (select count(*)::int from public.rentals where not available))),
    'bikesList', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'available', b.available,
        'renter', a.name, 'phone', a.phone, 'since', a.started_at, 'contract', a.contract_no, 'days', a.charged_days, 'daily', a.daily_price) order by (a.id is null), b.name)
      from public.rentals b
      left join lateral (select * from public.rental_requests r where r.bike_id = b.id and r.status = 'active' order by r.started_at desc nulls last limit 1) a on true), '[]'::jsonb),
    'rentalsStarted', (select count(*)::int from public.rental_requests where started_at >= since),
    -- Кардарлардын балансы
    'balances', (select jsonb_build_object(
        'total', coalesce(sum(b), 0)::int,
        'debt', coalesce(-sum(b) filter (where b < 0), 0)::int,
        'debtors', count(*) filter (where b < 0)::int)
      from (select sum(amount) b from public.wallet_tx group by user_id) t)
  ) into res;
  return res;
end $$;
revoke all on function public.admin_finance(integer) from public, anon;
grant execute on function public.admin_finance(integer) to authenticated;

