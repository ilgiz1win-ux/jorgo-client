-- Оңдоо өтүнмөлөрү базада, мастерлердин панели, «Мастер болгуңуз келеби?» өтүнмөлөрү.
-- 011, 015 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

-- 1) Мастерди анын аккаунтуна байлоо (мастерлер таблицасы ачык окулат — ошондуктан өзүнчө)
create table if not exists public.master_accounts (
  master_id text primary key references public.masters (id) on delete cascade,
  user_id   uuid not null unique references auth.users (id) on delete cascade
);
alter table public.master_accounts enable row level security;
drop policy if exists "master accounts read"  on public.master_accounts;
drop policy if exists "master accounts admin" on public.master_accounts;
create policy "master accounts read"  on public.master_accounts for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "master accounts admin" on public.master_accounts for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.my_master_id()
returns text
language sql
stable
security definer
set search_path = public
as $$ select master_id from public.master_accounts where user_id = auth.uid(); $$;
revoke all on function public.my_master_id() from public;
grant execute on function public.my_master_id() to authenticated;

-- Админ: мастерди катталган аккаунтка байлоо (телефон же email боюнча). null — байланышты алып салуу.
create or replace function public.admin_link_master(p_master text, p_login text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  digits text := regexp_replace(coalesce(p_login, ''), '\D', '', 'g');
  uid uuid;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if p_login is null or trim(p_login) = '' then
    delete from public.master_accounts where master_id = p_master;
    return true;
  end if;
  if position('@' in p_login) > 0 then
    select id into uid from auth.users where lower(email) = lower(trim(p_login));
  else
    if left(digits, 1) = '0' then digits := substr(digits, 2); end if;
    if length(digits) = 9 then digits := '996' || digits; end if;
    select id into uid from auth.users where email = digits || '@phone.jorgo.app';
    if uid is null then select id into uid from public.profiles where public.phone9(phone) = right(digits, 9) limit 1; end if;
  end if;
  if uid is null then return false; end if;
  delete from public.master_accounts where user_id = uid or master_id = p_master;
  insert into public.master_accounts (master_id, user_id) values (p_master, uid);
  return true;
end $$;
revoke all on function public.admin_link_master(text, text) from public, anon;
grant execute on function public.admin_link_master(text, text) to authenticated;

-- 2) Оңдоо өтүнмөлөрү
create table if not exists public.repair_requests (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  number      text not null check (char_length(number) <= 20),
  user_id     uuid references auth.users (id) on delete set null default auth.uid(),
  name        text not null check (char_length(name) between 2 and 80),
  phone       text not null check (char_length(phone) between 9 and 30),
  bike        text not null default '' check (char_length(bike) <= 120),
  services    jsonb not null default '[]'::jsonb check (jsonb_typeof(services) = 'array' and char_length(services::text) <= 3000),
  problem     text not null default '' check (char_length(problem) <= 1000),
  branch      text not null default '' check (char_length(branch) <= 80),
  master_id   text references public.masters (id) on delete set null,
  outcall     boolean not null default false,
  status      text not null default 'new' check (status in ('new', 'accepted', 'in_progress', 'done', 'cancelled')),
  master_note text not null default '' check (char_length(master_note) <= 500),
  updated_at  timestamptz not null default now()
);
create index if not exists repair_requests_created_idx on public.repair_requests (created_at desc);
create index if not exists repair_requests_master_idx on public.repair_requests (master_id);
alter table public.repair_requests enable row level security;

drop policy if exists "repairs insert" on public.repair_requests;
drop policy if exists "repairs read"   on public.repair_requests;
drop policy if exists "repairs update" on public.repair_requests;
drop policy if exists "repairs delete" on public.repair_requests;
create policy "repairs insert" on public.repair_requests for insert to anon, authenticated
  with check ((user_id is null or user_id = auth.uid()) and status = 'new' and master_note = '' and not public.is_blacklisted(phone));
-- Көрө алышат: админ; өтүнмөнүн мастери; ошол точканын мастерлери (мастер тандалбаса); кардардын өзү
create policy "repairs read" on public.repair_requests for select to authenticated using (
  public.is_admin()
  or user_id = auth.uid()
  or master_id = public.my_master_id()
  or (master_id is null and public.my_master_id() is not null
      and branch = (select m.branch from public.masters m where m.id = public.my_master_id()))
);
create policy "repairs update" on public.repair_requests for update to authenticated using (
  public.is_admin()
  or master_id = public.my_master_id()
  or (master_id is null and public.my_master_id() is not null
      and branch = (select m.branch from public.masters m where m.id = public.my_master_id()))
) with check (public.is_admin() or master_id = public.my_master_id());
create policy "repairs delete" on public.repair_requests for delete to authenticated using (public.is_admin());

-- Мастер абалды, эскертмени жана «мен алам» (master_id ← өзү) гана өзгөртө алат
create or replace function public.repairs_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if public.is_admin() then return new; end if;
  if new.master_id is distinct from old.master_id and not (old.master_id is null and new.master_id = public.my_master_id()) then
    raise exception 'not allowed';
  end if;
  new.number := old.number; new.user_id := old.user_id; new.name := old.name; new.phone := old.phone;
  new.bike := old.bike; new.services := old.services; new.problem := old.problem; new.branch := old.branch;
  new.outcall := old.outcall; new.created_at := old.created_at;
  return new;
end $$;
drop trigger if exists repairs_guard on public.repair_requests;
create trigger repairs_guard before update on public.repair_requests for each row execute function public.repairs_guard();

-- Билдирмелер: жаңы өтүнмө — админдерге жана мастерге (же точканын мастерлерине); абал өзгөрсө — кардарга
create or replace function public.repairs_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  body text;
  r record;
begin
  if tg_op = 'INSERT' then
    body := format('%s · %s · %s%s', new.name, new.phone, coalesce(nullif(new.bike, ''), '—'), case when new.outcall then ' · 🚗 выезд' else '' end);
    perform public.notify_admins('Жаңы оңдоо өтүнмөсү №' || new.number, body, '/admin/repairs');
    for r in
      select a.user_id from public.master_accounts a join public.masters m on m.id = a.master_id
      where (new.master_id is not null and a.master_id = new.master_id)
         or (new.master_id is null and m.branch = new.branch and m.active)
    loop
      perform public.notify_user(r.user_id, 'Жаңы оңдоо заказы №' || new.number, body, 'repair');
    end loop;
    return new;
  end if;
  if new.status is distinct from old.status then
    perform public.notify_user(new.user_id,
      case new.status when 'accepted' then 'Мастер өтүнмөңүздү кабыл алды' when 'in_progress' then 'Велосипедиңиз оңдолуп жатат'
        when 'done' then 'Оңдоо бүттү ✅' when 'cancelled' then 'Оңдоо өтүнмөсү жокко чыгарылды' else 'Оңдоо өтүнмөсү жаңыланды' end,
      '№' || new.number || case when new.master_note <> '' then ' · ' || new.master_note else '' end, 'repair');
  end if;
  return new;
end $$;
drop trigger if exists repairs_notify on public.repair_requests;
create trigger repairs_notify after insert or update on public.repair_requests for each row execute function public.repairs_notify();

-- 3) «Мастер болгуңуз келеби?» — жумушка өтүнмөлөр
create table if not exists public.master_applications (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null check (char_length(name) between 2 and 80),
  phone      text not null check (char_length(phone) between 9 and 30),
  experience text not null default '' check (char_length(experience) <= 120),
  specialty  text not null default '' check (char_length(specialty) <= 200),
  branch     text not null default '' check (char_length(branch) <= 80),
  comment    text not null default '' check (char_length(comment) <= 1000),
  status     text not null default 'new' check (status in ('new', 'contacted', 'hired', 'rejected'))
);
alter table public.master_applications enable row level security;
drop policy if exists "applications insert" on public.master_applications;
drop policy if exists "applications admin"  on public.master_applications;
create policy "applications insert" on public.master_applications for insert to anon, authenticated with check (status = 'new');
create policy "applications admin"  on public.master_applications for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.applications_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_admins('Мастер болом дейт: ' || new.name, format('%s · %s · %s', new.phone, coalesce(nullif(new.experience, ''), '—'), coalesce(nullif(new.specialty, ''), '—')), '/admin/applications');
  return new;
end $$;
drop trigger if exists applications_notify on public.master_applications;
create trigger applications_notify after insert on public.master_applications for each row execute function public.applications_notify();
