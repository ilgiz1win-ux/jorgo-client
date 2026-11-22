-- Экспресс заказдары: абалы (кабыл алынды → экспресс алып кетти → жеткирилди), жол акысы, товардын суммасы.
-- Кардар өз заказын гана көрөт; абалды жана жол акысын админ гана өзгөртөт. Ар бир өзгөрүүдө кардарга билдирме барат.
-- Supabase → SQL Editor → New query → ушул файлды толук коюп, Run басыңыз. Кайра иштетсе зыяны жок.

create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  number       text not null check (char_length(number) <= 20),
  user_id      uuid references auth.users (id) on delete set null default auth.uid(),
  delivery     text not null default 'express' check (delivery in ('pickup', 'express')),
  branch       text not null default '' check (char_length(branch) <= 80),
  items        jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and char_length(items::text) <= 8000),
  goods_total  integer not null check (goods_total >= 0),
  express_fee  integer check (express_fee is null or express_fee >= 0),
  name         text not null check (char_length(name) between 2 and 80),
  phone        text not null check (char_length(phone) between 9 and 30),
  address      text not null default '' check (char_length(address) <= 200),
  payment      text not null default '' check (char_length(payment) <= 40),
  comment      text not null default '' check (char_length(comment) <= 500),
  status       text not null default 'new' check (status in ('new', 'picked_up', 'delivered', 'cancelled')),
  picked_up_at timestamptz,
  delivered_at timestamptz
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_user_idx on public.orders (user_id);

alter table public.orders enable row level security;
drop policy if exists "orders insert" on public.orders;
drop policy if exists "orders read"   on public.orders;
drop policy if exists "orders update" on public.orders;
drop policy if exists "orders delete" on public.orders;
-- Кардар (аккаунт менен) жаңы заказ гана жаза алат: абалы 'new', жол акысы жок
create policy "orders insert" on public.orders for insert to authenticated
  with check (user_id = auth.uid() and status = 'new' and express_fee is null and picked_up_at is null and delivered_at is null);
create policy "orders read"   on public.orders for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "orders update" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "orders delete" on public.orders for delete to authenticated using (public.is_admin());

-- Абал өзгөргөндө убактысын коёбуз
create or replace function public.orders_stamp()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'picked_up' and new.picked_up_at is null then new.picked_up_at := now(); end if;
    if new.status = 'delivered' and new.delivered_at is null then new.delivered_at := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_stamp on public.orders;
create trigger orders_stamp before update on public.orders for each row execute function public.orders_stamp();

-- Билдирмелер: жаңы заказ — админдерге; абал же жол акысы өзгөрсө — кардарга (товар + жол акысы + жалпы)
create or replace function public.orders_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sums text;
begin
  if tg_op = 'INSERT' then
    perform public.notify_admins('Жаңы экспресс заказ №' || new.number,
      format('%s · %s · %s сом · %s', new.name, new.phone, new.goods_total, new.address), '/admin/orders');
    return new;
  end if;
  if new.status is distinct from old.status or new.express_fee is distinct from old.express_fee then
    sums := format('Товар: %s сом. Жол акысы: %s. Жалпы: %s сом.',
      new.goods_total,
      coalesce(new.express_fee::text || ' сом', 'экспресс айта элек'),
      new.goods_total + coalesce(new.express_fee, 0));
    perform public.notify_user(new.user_id,
      case new.status
        when 'picked_up' then 'Экспресс товарды алып кетти · №' || new.number
        when 'delivered' then 'Заказ жеткирилди · №' || new.number
        when 'cancelled' then 'Заказ жокко чыгарылды · №' || new.number
        else 'Заказ жаңыланды · №' || new.number
      end,
      sums, 'order');
  end if;
  return new;
end $$;
drop trigger if exists orders_notify on public.orders;
create trigger orders_notify after insert or update on public.orders for each row execute function public.orders_notify();
