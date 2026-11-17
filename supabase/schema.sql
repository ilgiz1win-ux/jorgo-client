-- Jorgo дүкөнүнүн маалымат базасы.
-- Supabase → SQL Editor → New query → ушул файлды толук көчүрүп, Run басыңыз.

-- Товарлар
create table if not exists public.products (
  id          text primary key,
  name        text not null,
  category    text not null check (category in ('ebike','battery','motor','parts','charger','accessory')),
  price       integer not null check (price >= 0),
  old_price   integer check (old_price is null or old_price >= 0),
  icon        text not null default 'package-variant',
  image_url   text,
  description text not null default '',
  specs       jsonb not null default '[]'::jsonb,
  in_stock    boolean not null default true,
  popular     boolean not null default false,
  sort        integer not null default 0,
  updated_at  timestamptz not null default now()
);

-- Акциялар (башкы беттеги баннерлер)
create table if not exists public.promos (
  id         text primary key,
  title      text not null,
  text       text not null default '',
  color      text not null default '#F59E0B',
  image_url  text,
  active     boolean not null default true,
  sort       integer not null default 0,
  created_at timestamptz not null default now()
);

-- Мурун түзүлгөн базалар үчүн (кайра иштетсе зыяны жок)
alter table public.promos add column if not exists image_url text;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- Коопсуздук: баары окуй алат, өзгөртүүнү кирген админ гана жасайт.
alter table public.products enable row level security;
alter table public.promos   enable row level security;

drop policy if exists "products read"  on public.products;
drop policy if exists "products write" on public.products;
create policy "products read"  on public.products for select using (true);
create policy "products write" on public.products for all to authenticated using (true) with check (true);

drop policy if exists "promos read"  on public.promos;
drop policy if exists "promos write" on public.promos;
create policy "promos read"  on public.promos for select using (true);
create policy "promos write" on public.promos for all to authenticated using (true) with check (true);

-- Товарлардын сүрөттөрү үчүн ачык сактагыч
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = true;

drop policy if exists "product images read"   on storage.objects;
drop policy if exists "product images upload" on storage.objects;
drop policy if exists "product images change" on storage.objects;
drop policy if exists "product images delete" on storage.objects;
create policy "product images read"   on storage.objects for select using (bucket_id = 'products');
create policy "product images upload" on storage.objects for insert to authenticated with check (bucket_id = 'products');
create policy "product images change" on storage.objects for update to authenticated using (bucket_id = 'products');
create policy "product images delete" on storage.objects for delete to authenticated using (bucket_id = 'products');
