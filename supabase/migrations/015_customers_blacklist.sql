-- Бардык заказдар админге (өзү алса да, экспресс болсо да), «алып кетти / отказ кылды», кара тизме, кардарлардын тизмеси.
-- 014_express_orders.sql иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

-- 1) Кара тизме: телефондун акыркы 9 цифрасы боюнча (аккаунту жоктор да бөгөттөлөт)
create table if not exists public.blacklist (
  phone      text primary key check (phone ~ '^\d{9}$'),
  reason     text not null default '' check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);
alter table public.blacklist enable row level security;
drop policy if exists "blacklist admin" on public.blacklist;
create policy "blacklist admin" on public.blacklist for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.phone9(p text)
returns text
language sql
immutable
as $$ select right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 9) $$;

create or replace function public.is_blacklisted(p_phone text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists (select 1 from public.blacklist where phone = public.phone9(p_phone)); $$;
revoke all on function public.is_blacklisted(text) from public;
grant execute on function public.is_blacklisted(text) to anon, authenticated;

-- 2) Заказдар: өзү алуучу заказдар да сакталат (аккаунтсуз да), отказдын себеби
alter table public.orders add column if not exists cancel_reason text not null default '' check (char_length(cancel_reason) <= 200);

drop policy if exists "orders insert" on public.orders;
create policy "orders insert" on public.orders for insert to anon, authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and status = 'new' and express_fee is null and picked_up_at is null and delivered_at is null and cancel_reason = ''
    and (delivery = 'pickup' or auth.uid() is not null)   -- экспресс — аккаунт менен гана
    and not public.is_blacklisted(phone)
  );

-- Ижара өтүнмөлөрү да кара тизмени текшерет
drop policy if exists "rental requests insert" on public.rental_requests;
create policy "rental requests insert" on public.rental_requests for insert to anon, authenticated
  with check (status = 'new' and (user_id is null or user_id = auth.uid()) and not public.is_blacklisted(phone));

-- 3) Билдирмелер: жаңы заказ (бардыгы) — админдерге; абал/жол акысы — кардарга
create or replace function public.orders_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sums text;
  is_express boolean := new.delivery = 'express';
begin
  if tg_op = 'INSERT' then
    perform public.notify_admins(
      case when is_express then 'Жаңы экспресс заказ №' else 'Жаңы заказ (өзү алат) №' end || new.number,
      format('%s · %s · %s сом · %s', new.name, new.phone, new.goods_total, case when is_express then new.address else new.branch end),
      '/admin/orders');
    return new;
  end if;
  if new.status is distinct from old.status or new.express_fee is distinct from old.express_fee then
    sums := case when is_express then format('Товар: %s сом. Жол акысы: %s. Жалпы: %s сом.',
              new.goods_total, coalesce(new.express_fee::text || ' сом', 'экспресс айта элек'), new.goods_total + coalesce(new.express_fee, 0))
            else format('Товар: %s сом.', new.goods_total) end;
    perform public.notify_user(new.user_id,
      case new.status
        when 'picked_up' then case when is_express then 'Экспресс товарды алып кетти · №' else 'Заказ алынды · №' end || new.number
        when 'delivered' then 'Заказ жеткирилди · №' || new.number
        when 'cancelled' then 'Заказ жокко чыгарылды · №' || new.number
        else 'Заказ жаңыланды · №' || new.number
      end,
      sums || case when new.status = 'cancelled' and new.cancel_reason <> '' then ' Себеби: ' || new.cancel_reason else '' end,
      'order');
  end if;
  return new;
end $$;

-- 4) Катталган кардарлардын тизмеси (админ гана)
create or replace function public.admin_customers()
returns table (
  id uuid, created_at timestamptz, login text, full_name text, phone text, verified boolean,
  orders bigint, rents bigint, blacklisted boolean, blacklist_reason text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return query
    select p.id, p.created_at, coalesce(u.email, '')::text, p.full_name, p.phone, p.verified,
           (select count(*) from public.orders o where o.user_id = p.id),
           (select count(*) from public.rental_requests r where r.user_id = p.id),
           exists (select 1 from public.blacklist b where b.phone = public.phone9(p.phone) and p.phone <> ''),
           coalesce((select b.reason from public.blacklist b where b.phone = public.phone9(p.phone) and p.phone <> ''), '')
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.id not in (select user_id from public.admins)
    order by p.created_at desc;
end $$;
revoke all on function public.admin_customers() from public, anon;
grant execute on function public.admin_customers() to authenticated;
