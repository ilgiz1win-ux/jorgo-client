-- 030 SQL'дин 2-бөлүгү (үчөөнү тең ушул тартипте иштетиңиз: 030a, 030b, 030c). Кайра иштетсе зыяны жок.

-- 2) Кардарлардын пикирлери
create table if not exists public.review_submissions (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  rating     integer not null check (rating between 1 and 5),
  text       text not null check (char_length(trim(text)) between 3 and 1000),
  about      text not null default 'shop' check (about in ('shop', 'repair', 'rental', 'product', 'master')),
  ref_title  text not null default '' check (char_length(ref_title) <= 120),
  status     text not null default 'new' check (status in ('new', 'approved', 'rejected')),
  review_id  text
);
create index if not exists review_submissions_created_idx on public.review_submissions (created_at desc);
alter table public.review_submissions enable row level security;
drop policy if exists "review subs read"   on public.review_submissions;
drop policy if exists "review subs insert" on public.review_submissions;
drop policy if exists "review subs admin"  on public.review_submissions;
create policy "review subs read"   on public.review_submissions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "review subs insert" on public.review_submissions for insert to authenticated with check (user_id = auth.uid() and status = 'new' and review_id is null);
create policy "review subs admin"  on public.review_submissions for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.review_submissions_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_admins('⭐ Жаңы пикир: ' || repeat('★', new.rating), new.name || ' · ' || left(new.text, 200), '/admin/reviews');
  return new;
end $$;
drop trigger if exists review_submissions_notify on public.review_submissions;
create trigger review_submissions_notify after insert on public.review_submissions for each row execute function public.review_submissions_notify();

