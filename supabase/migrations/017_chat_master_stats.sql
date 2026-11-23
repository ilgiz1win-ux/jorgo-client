-- Кардар ↔ админ чаты; мастердин аккаунтун админден көрүү.
-- 016 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

-- 1) Чат: ар бир кардардын өзүнүн бир «сүйлөшүүсү» (user_id боюнча)
create table if not exists public.chat_messages (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  from_admin    boolean not null default false,
  sender_id     uuid default auth.uid(),
  body          text not null check (char_length(trim(body)) between 1 and 2000),
  read_by_admin boolean not null default false,
  read_by_user  boolean not null default false
);
create index if not exists chat_messages_user_idx on public.chat_messages (user_id, created_at);
create index if not exists chat_messages_created_idx on public.chat_messages (created_at desc);
alter table public.chat_messages enable row level security;

drop policy if exists "chat read"   on public.chat_messages;
drop policy if exists "chat insert" on public.chat_messages;
drop policy if exists "chat delete" on public.chat_messages;
create policy "chat read" on public.chat_messages for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
-- Кардар өзүнүн сүйлөшүүсүнө гана жазат (кара тизмедегилер жаза албайт); админ — каалаганына, «админ» деп
create policy "chat insert" on public.chat_messages for insert to authenticated with check (
  sender_id = auth.uid() and read_by_admin = false and read_by_user = false and (
    (from_admin and public.is_admin())
    or (not from_admin and user_id = auth.uid()
        and not public.is_blacklisted(coalesce((select p.phone from public.profiles p where p.id = auth.uid()), '')))
  )
);
create policy "chat delete" on public.chat_messages for delete to authenticated using (public.is_admin());

-- Окулду деп белгилөө: админ — кардардын сүйлөшүүсүн, кардар — өзүнүкүн
create or replace function public.chat_mark_read(p_user uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is not null and public.is_admin() then
    update public.chat_messages set read_by_admin = true where user_id = p_user and not from_admin and not read_by_admin;
  else
    update public.chat_messages set read_by_user = true where user_id = auth.uid() and from_admin and not read_by_user;
  end if;
end $$;
revoke all on function public.chat_mark_read(uuid) from public, anon;
grant execute on function public.chat_mark_read(uuid) to authenticated;

-- Админ: бардык сүйлөшүүлөр (акыркы билдирүү, окула элек саны, кардардын аты/телефону)
create or replace function public.admin_chat_threads()
returns table (user_id uuid, full_name text, phone text, last_body text, last_at timestamptz, last_from_admin boolean, unread integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return query
    select t.user_id,
           coalesce(nullif(p.full_name, ''), '—')::text,
           coalesce(nullif(p.phone, ''), split_part(u.email, '@', 1))::text,
           l.body, l.created_at, l.from_admin,
           (select count(*)::int from public.chat_messages c where c.user_id = t.user_id and not c.from_admin and not c.read_by_admin)
    from (select distinct m.user_id from public.chat_messages m) t
    join lateral (select m.body, m.created_at, m.from_admin from public.chat_messages m where m.user_id = t.user_id order by m.created_at desc limit 1) l on true
    left join public.profiles p on p.id = t.user_id
    left join auth.users u on u.id = t.user_id
    order by l.created_at desc;
end $$;
revoke all on function public.admin_chat_threads() from public, anon;
grant execute on function public.admin_chat_threads() to authenticated;

-- Билдирмелер: кардар жазса — админдерге; админ жооп берсе — кардарга (чатка шилтеме менен)
create or replace function public.chat_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who text;
begin
  if new.from_admin then
    insert into public.notifications (user_id, title, body, kind, link)
    values (new.user_id, 'Jorgo Eco Service жооп берди 💬', left(new.body, 500), 'message', '/chat');
  else
    select coalesce(nullif(p.full_name, ''), nullif(p.phone, ''), 'Кардар') into who from public.profiles p where p.id = new.user_id;
    perform public.notify_admins('💬 ' || coalesce(who, 'Кардар') || ' жазды', left(new.body, 300), '/admin/chat/' || new.user_id::text);
  end if;
  return new;
end $$;
drop trigger if exists chat_notify on public.chat_messages;
create trigger chat_notify after insert on public.chat_messages for each row execute function public.chat_notify();

-- 2) Админ: мастерлердин аккаунттары (кайсы телефонго байланган)
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
revoke all on function public.admin_master_accounts() from public, anon;
grant execute on function public.admin_master_accounts() to authenticated;
