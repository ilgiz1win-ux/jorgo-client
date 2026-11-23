-- Мастерди ишке алуу: 1 ай точкада сынак, андан кийин выезд жана мастер панели.
-- Админ ишке алганда мастерге аккаунт түзүлөт (логин/сырсөздү админ гана көрөт).
-- 1 ай өткөндөн кийин админ «Панелди ачуу» басат — ошондо гана мастер панелге кире алат.
-- 016, 017 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

-- 1) Мастердин панелге кирүүсү: false болсо — аккаунт бар, бирок панел жабык
alter table public.master_accounts add column if not exists panel_open boolean not null default true;

-- Панели жабык мастер «мастер эмес» деп эсептелет: заказдарды көрбөйт, билдирме албайт
create or replace function public.my_master_id()
returns text
language sql
stable
security definer
set search_path = public
as $$ select master_id from public.master_accounts where user_id = auth.uid() and panel_open; $$;

-- Жаңы оңдоо өтүнмөсүнүн билдирмеси — панели ачык мастерлерге гана
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
      where a.panel_open
        and ((new.master_id is not null and a.master_id = new.master_id)
          or (new.master_id is null and m.branch = new.branch and m.active))
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

-- 2) Ишке алуу жазуулары (админ гана көрөт): логин, баштапкы сырсөз, сынак мөөнөтү
create table if not exists public.master_hires (
  master_id      text primary key references public.masters (id) on delete cascade,
  application_id uuid references public.master_applications (id) on delete set null,
  user_id        uuid references auth.users (id) on delete set null,
  login          text not null default '',
  password       text,              -- null: номер мурунтан катталган, мастер өз сырсөзү менен кирет
  hired_at       timestamptz not null default now(),
  trial_until    date not null,     -- ушул күнгө чейин точкада иштейт
  opened_at      timestamptz,       -- панел ачылган күн
  hired_by       uuid default auth.uid()
);
alter table public.master_hires enable row level security;
drop policy if exists "master hires admin" on public.master_hires;
create policy "master hires admin" on public.master_hires for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.master_applications add column if not exists master_id text references public.masters (id) on delete set null;

-- Админ: ишке алуу. Мастер (masters) жана аккаунт (auth) колдонмодон мурда түзүлөт.
create or replace function public.admin_hire_master(p_app uuid, p_master text, p_phone text, p_password text, p_trial_days integer default 30)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  uid uuid;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if left(digits, 1) = '0' then digits := substr(digits, 2); end if;
  if length(digits) = 9 then digits := '996' || digits; end if;
  select id into uid from auth.users where email = digits || '@phone.jorgo.app';
  if uid is null then select id into uid from public.profiles where public.phone9(phone) = right(digits, 9) limit 1; end if;
  if uid is null then return false; end if;

  delete from public.master_accounts where user_id = uid or master_id = p_master;
  insert into public.master_accounts (master_id, user_id, panel_open) values (p_master, uid, false);
  update public.masters set outcall = false where id = p_master;
  insert into public.master_hires (master_id, application_id, user_id, login, password, trial_until)
  values (p_master, p_app, uid, '+' || digits, nullif(p_password, ''), (now() at time zone 'Asia/Bishkek')::date + greatest(coalesce(p_trial_days, 30), 0))
  on conflict (master_id) do update set application_id = excluded.application_id, user_id = excluded.user_id, login = excluded.login,
    password = excluded.password, hired_at = now(), trial_until = excluded.trial_until, opened_at = null;
  if p_app is not null then
    update public.master_applications set status = 'hired', master_id = p_master where id = p_app;
  end if;
  return true;
end $$;
revoke all on function public.admin_hire_master(uuid, text, text, text, integer) from public, anon;
grant execute on function public.admin_hire_master(uuid, text, text, text, integer) to authenticated;

-- Админ: сынак бүттү — панелди ачуу жана выездге чыгаруу (же кайра жабуу)
create or replace function public.admin_open_master_panel(p_master text, p_open boolean default true, p_outcall boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  update public.master_accounts set panel_open = p_open where master_id = p_master returning user_id into uid;
  if p_open then
    update public.master_hires set opened_at = now() where master_id = p_master;
    if p_outcall then update public.masters set outcall = true where id = p_master; end if;
    perform public.notify_user(uid, 'Мастер панели ачылды 🎉', 'Эми колдонмодон «Мастер панелине» кирип, заказдарды ала аласыз.', 'repair');
  else
    update public.master_hires set opened_at = null where master_id = p_master;
  end if;
end $$;
revoke all on function public.admin_open_master_panel(text, boolean, boolean) from public, anon;
grant execute on function public.admin_open_master_panel(text, boolean, boolean) to authenticated;

-- Админдин тизмеси үчүн: кайсы мастердин панели жабык
create or replace function public.admin_master_accounts()
returns table (master_id text, user_id uuid, login text, full_name text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return query
    select a.master_id, a.user_id,
           coalesce(nullif(p.phone, ''), case when u.email like '%@phone.jorgo.app' then '+' || split_part(u.email, '@', 1) else u.email end)::text,
           coalesce(p.full_name, '')::text
    from public.master_accounts a
    left join public.profiles p on p.id = a.user_id
    left join auth.users u on u.id = a.user_id;
end $$;

-- 3) Ар күнү эртең менен: сынак айы бүткөн мастерлер боюнча админдерге эскертүү
create or replace function public.master_trial_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n integer := 0;
  today date := (now() at time zone 'Asia/Bishkek')::date;
begin
  for r in
    select h.master_id, h.trial_until, m.name from public.master_hires h
    join public.masters m on m.id = h.master_id
    join public.master_accounts a on a.master_id = h.master_id
    where not a.panel_open and h.trial_until <= today
  loop
    perform public.notify_admins('Сынак айы бүттү: ' || r.name,
      'Логин-сырсөзүн берип, мастер панелин ачсаңыз болот (выездге чыгат).',
      '/admin/master/' || r.master_id, 'trial-' || r.master_id || '-' || r.trial_until);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.master_trial_reminders() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('jorgo-master-trials', '5 3 * * *', 'select public.master_trial_reminders()');
exception when others then
  raise notice 'pg_cron жеткиликсиз: %', sqlerrm;
end $$;
