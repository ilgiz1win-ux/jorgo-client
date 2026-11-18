-- Кардар аккаунттары: телефон + сырсөз, профиль, документтер (селфи, паспорт, айдоочулук күбөлүк).
-- МААНИЛҮҮ: мурун "кирген колдонуучу = админ" болчу. Эми кардарлар да катталат, ошондуктан
-- админ өзүнчө `admins` тизмесинде сакталат. Бул файлды иштеткенге чейин катталууну АЧПАҢЫЗ.
-- Supabase → SQL Editor → New query → ушул файлды толук коюп, Run басыңыз. Кайра иштетсе зыяны жок.

-- 1) Админдер тизмеси. Азыр бардык бар колдонуучулар (катталуу жабык болгон) — админдер.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "admins self read" on public.admins;
create policy "admins self read" on public.admins for select to authenticated using (user_id = auth.uid());

do $$
begin
  -- Профиль таблицасы али жок болсо, бул файл биринчи жолу иштетилип жатат:
  -- ошол учурдагы бардык колдонуучулар админ (катталуу жабык эле).
  if to_regclass('public.profiles') is null then
    insert into public.admins (user_id) select id from auth.users on conflict do nothing;
  end if;
end $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) Админ гана өзгөртө турган таблицалар
drop policy if exists "products write" on public.products;
create policy "products write" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "services write" on public.services;
create policy "services write" on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "promos write" on public.promos;
create policy "promos write" on public.promos for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "settings write" on public.settings;
create policy "settings write" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "reviews write" on public.reviews;
create policy "reviews write" on public.reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "gallery write" on public.gallery;
create policy "gallery write" on public.gallery for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "rentals write" on public.rentals;
create policy "rentals write" on public.rentals for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "events read" on public.events;
create policy "events read" on public.events for select to authenticated using (public.is_admin());

drop policy if exists "product images upload" on storage.objects;
drop policy if exists "product images change" on storage.objects;
drop policy if exists "product images delete" on storage.objects;
create policy "product images upload" on storage.objects for insert to authenticated with check (bucket_id = 'products' and public.is_admin());
create policy "product images change" on storage.objects for update to authenticated using (bucket_id = 'products' and public.is_admin());
create policy "product images delete" on storage.objects for delete to authenticated using (bucket_id = 'products' and public.is_admin());

-- 3) Кардардын профили
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  full_name     text not null default '' check (char_length(full_name) <= 80),
  phone         text not null default '' check (char_length(phone) <= 30),
  birth_date    text not null default '' check (char_length(birth_date) <= 20),
  address       text not null default '' check (char_length(address) <= 200),
  passport_no   text not null default '' check (char_length(passport_no) <= 30),
  selfie_path   text,
  passport_path text,
  license_path  text,
  verified      boolean not null default false
);
alter table public.profiles enable row level security;

drop policy if exists "profiles own read"   on public.profiles;
drop policy if exists "profiles own insert" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "profiles admin"      on public.profiles;
create policy "profiles own read"   on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles own insert" on public.profiles for insert to authenticated with check (id = auth.uid() and verified = false);
create policy "profiles own update" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "profiles admin"      on public.profiles for delete to authenticated using (public.is_admin());

-- Кардар өзүн "текшерилди" деп белгилей албайт
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.verified := coalesce(old.verified, false);
    -- Документ өзгөрсө, кайра текшерүү керек
    if old.selfie_path is distinct from new.selfie_path
       or old.passport_path is distinct from new.passport_path
       or old.license_path is distinct from new.license_path
       or old.passport_no is distinct from new.passport_no then
      new.verified := false;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles for each row execute function public.profiles_guard();

-- 4) Ижара өтүнмөсү кардардын аккаунтуна байланат; кардар өзүнүкүн гана көрөт
alter table public.rental_requests add column if not exists user_id uuid references auth.users (id) on delete set null default auth.uid();
create index if not exists rental_requests_user_idx on public.rental_requests (user_id);

drop policy if exists "rental requests insert" on public.rental_requests;
drop policy if exists "rental requests read"   on public.rental_requests;
drop policy if exists "rental requests update" on public.rental_requests;
drop policy if exists "rental requests delete" on public.rental_requests;
create policy "rental requests insert" on public.rental_requests for insert to anon, authenticated
  with check (status = 'new' and (user_id is null or user_id = auth.uid()));
create policy "rental requests read"   on public.rental_requests for select to authenticated using (public.is_admin() or user_id = auth.uid());
create policy "rental requests update" on public.rental_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "rental requests delete" on public.rental_requests for delete to authenticated using (public.is_admin());

-- 5) Документтердин сүрөттөрү: жабык бакет. Кардар өз папкасын гана, админ баарын көрөт.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

drop policy if exists "documents read"   on storage.objects;
drop policy if exists "documents upload" on storage.objects;
drop policy if exists "documents change" on storage.objects;
drop policy if exists "documents delete" on storage.objects;
create policy "documents read"   on storage.objects for select to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "documents upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "documents change" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "documents delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- 6) Аккаунтту өчүрүү (App Store / Play Market талабы). Админ өзүн өчүрө албайт.
-- Документ сүрөттөрүн колдонмо мурда өзү өчүрөт (Storage API аркылуу).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if public.is_admin() then raise exception 'admin account cannot be deleted here'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
