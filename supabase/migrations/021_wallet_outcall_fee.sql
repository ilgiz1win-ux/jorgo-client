-- Кардардын балансы: толуктоо (админ ырастайт), выезд үчүн акы (демейде 500 сом).
-- Выезд чакырганда акы балансынан алынат. Мастер барганга чейин жокко чыгарылса — кайтарылат.
-- Мастер барып калса («Келдим»), кардар оңдотпой койсо да акы кайтарылбайт.
-- 020 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

-- Жөндөөлөр: выезддин баасы жана толуктоо үчүн реквизиттер (админ өзгөртөт)
insert into public.settings (key, value)
values ('wallet', jsonb_build_object('outcallFee', 500, 'topupInfo', 'MBank / O!Деньги: +996 ... (атыңыз)'))
on conflict (key) do nothing;

create or replace function public.outcall_fee()
returns integer
language sql
stable
security definer
set search_path = public
as $$ select coalesce((select (value->>'outcallFee')::int from public.settings where key = 'wallet'), 500); $$;
grant execute on function public.outcall_fee() to anon, authenticated;

-- 1) Баланс кыймылы (ар бир кошуу/алуу — өзүнчө сап)
create table if not exists public.wallet_tx (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  amount     integer not null check (amount <> 0 and abs(amount) <= 1000000),
  kind       text not null check (kind in ('topup', 'outcall', 'refund', 'adjust')),
  repair_id  uuid references public.repair_requests (id) on delete set null,
  note       text not null default '' check (char_length(note) <= 200),
  created_by uuid default auth.uid()
);
create index if not exists wallet_tx_user_idx on public.wallet_tx (user_id, created_at desc);
alter table public.wallet_tx enable row level security;
drop policy if exists "wallet tx read" on public.wallet_tx;
create policy "wallet tx read" on public.wallet_tx for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- Жазуу — функциялар аркылуу гана (insert/update/delete саясаты жок)

create or replace function public.wallet_balance(p_user uuid default null)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  u uuid := coalesce(p_user, auth.uid());
begin
  if p_user is not null and p_user <> auth.uid() and not public.is_admin() then raise exception 'not allowed'; end if;
  return coalesce((select sum(amount) from public.wallet_tx where user_id = u), 0);
end $$;
grant execute on function public.wallet_balance(uuid) to authenticated;

-- 2) Толуктоо өтүнмөлөрү: кардар которуп, суммасын жазат; админ ырастайт
create table if not exists public.topup_requests (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount      integer not null check (amount between 50 and 100000),
  method      text not null default '' check (char_length(method) <= 40),
  receipt     text check (receipt is null or char_length(receipt) <= 300),  -- documents бакетиндеги жол
  comment     text not null default '' check (char_length(comment) <= 300),
  status      text not null default 'new' check (status in ('new', 'approved', 'rejected')),
  decided_at  timestamptz,
  decided_by  uuid
);
create index if not exists topup_requests_created_idx on public.topup_requests (created_at desc);
alter table public.topup_requests enable row level security;
drop policy if exists "topup read"   on public.topup_requests;
drop policy if exists "topup insert" on public.topup_requests;
create policy "topup read"   on public.topup_requests for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "topup insert" on public.topup_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'new' and decided_at is null and decided_by is null);

create or replace function public.topup_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare who text;
begin
  select coalesce(nullif(p.full_name, ''), nullif(p.phone, ''), 'Кардар') into who from public.profiles p where p.id = new.user_id;
  perform public.notify_admins('💰 Балансты толуктоо: ' || new.amount || ' сом', coalesce(who, 'Кардар') || case when new.method <> '' then ' · ' || new.method else '' end, '/admin/wallets');
  return new;
end $$;
drop trigger if exists topup_notify on public.topup_requests;
create trigger topup_notify after insert on public.topup_requests for each row execute function public.topup_notify();

-- Админ: толуктоону ырастоо же четке кагуу
create or replace function public.admin_topup_decide(p_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r public.topup_requests;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select * into r from public.topup_requests where id = p_id for update;
  if r.id is null or r.status <> 'new' then return; end if;
  update public.topup_requests set status = case when p_approve then 'approved' else 'rejected' end, decided_at = now(), decided_by = auth.uid() where id = p_id;
  if p_approve then
    insert into public.wallet_tx (user_id, amount, kind, note) values (r.user_id, r.amount, 'topup', coalesce(nullif(r.method, ''), 'толуктоо'));
    perform public.notify_user(r.user_id, 'Баланс толукталды ✅', '+' || r.amount || ' сом. Балансыңыз: ' || public.wallet_balance_of(r.user_id) || ' сом', 'payment');
  else
    perform public.notify_user(r.user_id, 'Толуктоо ырасталган жок', r.amount || ' сом — акча түшкөн жок. Суроо болсо чатка жазыңыз.', 'payment');
  end if;
end $$;

-- Ички колдонуу үчүн (укук текшербейт)
create or replace function public.wallet_balance_of(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$ select coalesce(sum(amount), 0)::int from public.wallet_tx where user_id = p_user; $$;
revoke all on function public.wallet_balance_of(uuid) from public, anon, authenticated;

revoke all on function public.admin_topup_decide(uuid, boolean) from public, anon;
grant execute on function public.admin_topup_decide(uuid, boolean) to authenticated;

-- Админ: балансты кол менен өзгөртүү (накталай берди, ката оңдоо ж.б.)
create or replace function public.admin_wallet_adjust(p_user uuid, p_amount integer, p_note text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if p_amount = 0 then return public.wallet_balance_of(p_user); end if;
  insert into public.wallet_tx (user_id, amount, kind, note) values (p_user, p_amount, 'adjust', left(coalesce(p_note, ''), 200));
  perform public.notify_user(p_user, 'Балансыңыз өзгөрдү', case when p_amount > 0 then '+' else '' end || p_amount || ' сом' || case when coalesce(p_note, '') <> '' then ' · ' || p_note else '' end, 'payment');
  return public.wallet_balance_of(p_user);
end $$;
revoke all on function public.admin_wallet_adjust(uuid, integer, text) from public, anon;
grant execute on function public.admin_wallet_adjust(uuid, integer, text) to authenticated;

-- Админ: бардык кардарлардын балансы
create or replace function public.admin_wallets()
returns table (user_id uuid, full_name text, phone text, balance integer, last_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return query
    select t.user_id, coalesce(nullif(p.full_name, ''), '—')::text,
           coalesce(nullif(p.phone, ''), split_part(u.email, '@', 1))::text,
           sum(t.amount)::int, max(t.created_at)
    from public.wallet_tx t
    left join public.profiles p on p.id = t.user_id
    left join auth.users u on u.id = t.user_id
    group by t.user_id, p.full_name, p.phone, u.email
    order by max(t.created_at) desc;
end $$;
revoke all on function public.admin_wallets() from public, anon;
grant execute on function public.admin_wallets() to authenticated;

-- 3) Выезд: аккаунт жана жетиштүү баланс керек; акы заказ берилгенде алынат
alter table public.repair_requests add column if not exists outcall_fee integer;      -- алынган акы
alter table public.repair_requests add column if not exists arrived_at  timestamptz;  -- мастер «Келдим» басты

create or replace function public.repairs_outcall_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare fee integer := public.outcall_fee();
begin
  new.arrived_at := null;
  if not new.outcall then new.outcall_fee := null; return new; end if;
  if new.user_id is null then raise exception 'outcall_login_required'; end if;
  if public.wallet_balance_of(new.user_id) < fee then raise exception 'outcall_low_balance'; end if;
  new.outcall_fee := fee;
  return new;
end $$;
drop trigger if exists repairs_outcall_check on public.repair_requests;
create trigger repairs_outcall_check before insert on public.repair_requests for each row execute function public.repairs_outcall_check();

create or replace function public.repairs_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.outcall and coalesce(new.outcall_fee, 0) > 0 then
      insert into public.wallet_tx (user_id, amount, kind, repair_id, note) values (new.user_id, -new.outcall_fee, 'outcall', new.id, 'Выезд №' || new.number);
      perform public.notify_user(new.user_id, 'Выезд үчүн ' || new.outcall_fee || ' сом алынды', '№' || new.number || '. Мастер барганга чейин жокко чыгарылса — кайтарылат.', 'payment');
    end if;
    return new;
  end if;
  -- Мастер барганга чейин жокко чыгарылса — акы кайтарылат (бир жолу)
  if new.status = 'cancelled' and old.status <> 'cancelled' and new.outcall and coalesce(new.outcall_fee, 0) > 0 and new.arrived_at is null
     and not exists (select 1 from public.wallet_tx w where w.repair_id = new.id and w.kind = 'refund') then
    insert into public.wallet_tx (user_id, amount, kind, repair_id, note) values (new.user_id, new.outcall_fee, 'refund', new.id, 'Выезд №' || new.number || ' жокко чыгарылды');
    perform public.notify_user(new.user_id, 'Выезд акысы кайтарылды', '+' || new.outcall_fee || ' сом · №' || new.number, 'payment');
  end if;
  return new;
end $$;
drop trigger if exists repairs_wallet on public.repair_requests;
create trigger repairs_wallet after insert or update on public.repair_requests for each row execute function public.repairs_wallet();

-- Мастер «Келдим» гана бас алат (убакыт — азыркы); акы маалыматын эч ким өзгөртө албайт
create or replace function public.repairs_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.outcall_fee := old.outcall_fee;
  if public.is_admin() then return new; end if;
  if new.master_id is distinct from old.master_id and not (old.master_id is null and new.master_id = public.my_master_id()) then
    raise exception 'not allowed';
  end if;
  new.number := old.number; new.user_id := old.user_id; new.name := old.name; new.phone := old.phone;
  new.bike := old.bike; new.services := old.services; new.problem := old.problem; new.branch := old.branch;
  new.outcall := old.outcall; new.created_at := old.created_at;
  new.photos := old.photos; new.address := old.address; new.lat := old.lat; new.lng := old.lng;
  new.visit_at := old.visit_at; new.bring := old.bring;
  if old.arrived_at is not null then new.arrived_at := old.arrived_at;
  elsif new.arrived_at is not null then
    new.arrived_at := now();
    perform public.notify_user(new.user_id, 'Мастер келди 🚗', '№' || new.number || ' · мастер дарегиңизге келди.', 'repair');
  end if;
  return new;
end $$;
