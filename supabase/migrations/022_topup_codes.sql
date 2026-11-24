-- Толуктоонун коду: ар бир толуктоого өзүнчө код (мисалы J1027).
-- Кардар которгондо банктагы комментарийге ушул кодду жазат — админ кайсы акча кимдики экенин билет.
-- Ошондой эле которгон кишинин аты жана номери/картасынын акыркы 4 цифрасы.
-- 021 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

create sequence if not exists public.topup_code_seq start 1001;
alter table public.topup_requests add column if not exists code           text;
alter table public.topup_requests add column if not exists sender_name    text not null default '';
alter table public.topup_requests add column if not exists sender_account text not null default '';
update public.topup_requests set code = 'J' || nextval('public.topup_code_seq') where code is null;
create unique index if not exists topup_requests_code_idx on public.topup_requests (code);

alter table public.topup_requests drop constraint if exists topup_requests_sender_check;
alter table public.topup_requests add constraint topup_requests_sender_check check (char_length(sender_name) <= 80 and char_length(sender_account) <= 40);

-- Кодду сервер өзү берет (кардар өзү жаза албайт)
create or replace function public.topup_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.code := 'J' || nextval('public.topup_code_seq');
  return new;
end $$;
drop trigger if exists topup_code on public.topup_requests;
create trigger topup_code before insert on public.topup_requests for each row execute function public.topup_code();

-- Админге билдирмеде код да көрүнсүн
create or replace function public.topup_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare who text;
begin
  select coalesce(nullif(p.full_name, ''), nullif(p.phone, ''), 'Кардар') into who from public.profiles p where p.id = new.user_id;
  perform public.notify_admins('💰 ' || new.code || ' · ' || new.amount || ' сом',
    concat_ws(' · ', coalesce(who, 'Кардар'), nullif(new.method, ''), nullif('которгон: ' || nullif(new.sender_name, ''), 'которгон: '), nullif(new.sender_account, '')),
    '/admin/wallets');
  return new;
end $$;

-- Кардар чекти кийин тиркейт (өзүнүн текшерилбеген өтүнмөсүнө гана)
create or replace function public.topup_attach_receipt(p_id uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_path is null or char_length(p_path) > 300 or split_part(p_path, '/', 1) <> auth.uid()::text then raise exception 'bad path'; end if;
  update public.topup_requests set receipt = p_path where id = p_id and user_id = auth.uid() and status = 'new';
end $$;
revoke all on function public.topup_attach_receipt(uuid, text) from public, anon;
grant execute on function public.topup_attach_receipt(uuid, text) to authenticated;
