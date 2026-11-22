-- Бардык кардарларга билдирме (акция, арзандатуу, жаңылык) жана телефонго push-билдирме.
-- Supabase → SQL Editor → New query → ушул файлды толук коюп, Run басыңыз. Кайра иштетсе зыяны жок.

-- 1) Жалпы билдирмелер: аккаунту жоктор да көрөт, жазуу — админ гана
create table if not exists public.broadcasts (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title      text not null check (char_length(title) between 2 and 120),
  body       text not null default '' check (char_length(body) <= 500),
  image_url  text,
  link       text check (link is null or char_length(link) <= 200),
  created_by uuid default auth.uid()
);
create index if not exists broadcasts_created_idx on public.broadcasts (created_at desc);
alter table public.broadcasts enable row level security;
drop policy if exists "broadcasts read"  on public.broadcasts;
drop policy if exists "broadcasts write" on public.broadcasts;
create policy "broadcasts read"  on public.broadcasts for select using (true);
create policy "broadcasts write" on public.broadcasts for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 2) Телефондордун push-токендери (APK'дан). Эч ким окуй албайт, жазуу — функция аркылуу гана.
create table if not exists public.push_tokens (
  token      text primary key check (char_length(token) <= 200),
  user_id    uuid references auth.users (id) on delete set null,
  platform   text not null default '' check (char_length(platform) <= 20),
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
drop policy if exists "push tokens admin count" on public.push_tokens;
create policy "push tokens admin count" on public.push_tokens for select to authenticated using (public.is_admin());

create or replace function public.register_push_token(p_token text, p_platform text default '')
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (left(p_token, 200), auth.uid(), left(coalesce(p_platform, ''), 20), now())
  on conflict (token) do update set user_id = coalesce(auth.uid(), public.push_tokens.user_id), platform = excluded.platform, updated_at = now();
$$;
revoke all on function public.register_push_token(text, text) from public;
grant execute on function public.register_push_token(text, text) to anon, authenticated;

-- 3) Expo аркылуу push жөнөтүү (pg_net). pg_net жок болсо — колдонмонун ичинде гана көрүнөт.
do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net жеткиликсиз: %', sqlerrm;
end $$;

create or replace function public.send_push(p_tokens text[], p_title text, p_body text, p_data jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i integer := 1;
  n integer := coalesce(array_length(p_tokens, 1), 0);
  msgs jsonb;
begin
  while i <= n loop
    select coalesce(jsonb_agg(jsonb_build_object('to', t, 'title', p_title, 'body', p_body, 'data', p_data, 'sound', 'default', 'channelId', 'default')), '[]'::jsonb)
      into msgs
      from unnest(p_tokens[i:i + 99]) as t;
    begin
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        body := msgs,
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
      );
    exception when others then
      raise notice 'push жөнөтүлгөн жок: %', sqlerrm;
      return;
    end;
    i := i + 100;
  end loop;
end $$;
revoke all on function public.send_push(text[], text, text, jsonb) from public, anon, authenticated;

-- Жалпы билдирме кошулганда — бардык телефондорго
create or replace function public.broadcasts_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.send_push(array(select token from public.push_tokens), new.title, new.body, jsonb_build_object('link', coalesce(new.link, '/news')));
  return new;
end $$;
drop trigger if exists broadcasts_push on public.broadcasts;
create trigger broadcasts_push after insert on public.broadcasts for each row execute function public.broadcasts_push();

-- Жеке билдирме (төлөм эскертүүсү, ижара абалы, админге жаңы өтүнмө) — ошол адамдын телефондоруна
create or replace function public.notifications_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.send_push(array(select token from public.push_tokens where user_id = new.user_id), new.title, new.body,
    jsonb_build_object('link', coalesce(new.link, '/account/notifications')));
  return new;
end $$;
drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push after insert on public.notifications for each row execute function public.notifications_push();
