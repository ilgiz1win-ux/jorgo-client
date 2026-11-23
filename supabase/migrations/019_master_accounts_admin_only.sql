-- Мастердин аккаунтун админ гана түзөт (телефон + сырсөз). 018 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.
-- Аккаунт колдонмодо түзүлөт (signUp), бул функция аны мастерге байлап, логин/сырсөздү админдер үчүн сактайт.
create or replace function public.admin_create_master_account(p_master text, p_phone text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  uid uuid;
  today date := (now() at time zone 'Asia/Bishkek')::date;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if left(digits, 1) = '0' then digits := substr(digits, 2); end if;
  if length(digits) = 9 then digits := '996' || digits; end if;
  select id into uid from auth.users where email = digits || '@phone.jorgo.app';
  if uid is null then select id into uid from public.profiles where public.phone9(phone) = right(digits, 9) limit 1; end if;
  if uid is null then return false; end if;

  delete from public.master_accounts where user_id = uid or master_id = p_master;
  insert into public.master_accounts (master_id, user_id, panel_open) values (p_master, uid, true);
  insert into public.master_hires (master_id, user_id, login, password, trial_until, opened_at)
  values (p_master, uid, '+' || digits, nullif(p_password, ''), today, now())
  on conflict (master_id) do update set user_id = excluded.user_id, login = excluded.login,
    password = coalesce(excluded.password, public.master_hires.password), opened_at = coalesce(public.master_hires.opened_at, now());
  return true;
end $$;
revoke all on function public.admin_create_master_account(text, text, text) from public, anon;
grant execute on function public.admin_create_master_account(text, text, text) to authenticated;

-- Мастерди аккаунттан ажыратуу
create or replace function public.admin_unlink_master(p_master text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  delete from public.master_accounts where master_id = p_master;
  delete from public.master_hires where master_id = p_master;
end $$;
revoke all on function public.admin_unlink_master(text) from public, anon;
grant execute on function public.admin_unlink_master(text) to authenticated;
