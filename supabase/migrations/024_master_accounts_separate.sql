-- Мастердин аккаунту кардардыкынан өзүнчө жана аны админ гана түзөт.
-- Мастер аккаунттары: 996XXXXXXXXX@master.jorgo.app (кардарлар: @phone.jorgo.app).
-- Кардардын аккаунту эч качан мастер боло албайт. 023 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

-- Мастер — админ түзгөн мастер аккаунту менен киргенде гана
create or replace function public.my_master_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select a.master_id from public.master_accounts a
  join auth.users u on u.id = a.user_id
  where a.user_id = auth.uid() and a.panel_open and u.email like '%@master.jorgo.app';
$$;

-- Эски «кардарды мастерге байлоо» жолу жабылат
revoke all on function public.admin_link_master(text, text) from public, anon, authenticated;

create or replace function public.master_login_user(p_phone text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if left(digits, 1) = '0' then digits := substr(digits, 2); end if;
  if length(digits) = 9 then digits := '996' || digits; end if;
  return (select id from auth.users where email = digits || '@master.jorgo.app');
end $$;
revoke all on function public.master_login_user(text) from public, anon, authenticated;

create or replace function public.admin_create_master_account(p_master text, p_phone text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.master_login_user(p_phone);
  digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  today date := (now() at time zone 'Asia/Bishkek')::date;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if uid is null then return false; end if;
  if left(digits, 1) = '0' then digits := substr(digits, 2); end if;
  if length(digits) = 9 then digits := '996' || digits; end if;
  delete from public.master_accounts where user_id = uid or master_id = p_master;
  insert into public.master_accounts (master_id, user_id, panel_open) values (p_master, uid, true);
  insert into public.master_hires (master_id, user_id, login, password, trial_until, opened_at)
  values (p_master, uid, '+' || digits, nullif(p_password, ''), today, now())
  on conflict (master_id) do update set user_id = excluded.user_id, login = excluded.login,
    password = coalesce(excluded.password, public.master_hires.password), opened_at = coalesce(public.master_hires.opened_at, now());
  return true;
end $$;

create or replace function public.admin_hire_master(p_app uuid, p_master text, p_phone text, p_password text, p_trial_days integer default 30)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.master_login_user(p_phone);
  digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if uid is null then return false; end if;
  if left(digits, 1) = '0' then digits := substr(digits, 2); end if;
  if length(digits) = 9 then digits := '996' || digits; end if;
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

-- Админдин тизмеси: логин мастер аккаунтунан
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
           case when u.email like '%@master.jorgo.app' then '+' || split_part(u.email, '@', 1) else coalesce(nullif(p.phone, ''), u.email) end::text,
           coalesce(p.full_name, '')::text
    from public.master_accounts a
    left join public.profiles p on p.id = a.user_id
    left join auth.users u on u.id = a.user_id;
end $$;
