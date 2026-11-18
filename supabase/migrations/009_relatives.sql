-- Кардардын туугандары жана велосипеддин GPS/батарея номерлери (админ гана көрөт).
-- Supabase → SQL Editor → New query → ушул файлды коюп, Run басыңыз. Кайра иштетсе зыяны жок.
alter table public.profiles add column if not exists relatives jsonb not null default '[]'::jsonb;

alter table public.profiles drop constraint if exists profiles_relatives_check;
alter table public.profiles add constraint profiles_relatives_check
  check (jsonb_typeof(relatives) = 'array' and jsonb_array_length(relatives) <= 3 and char_length(relatives::text) <= 1000);

-- Велосипеддин GPS номери жана батареялардын номерлери. Кардарлар ТАКЫР көрө алышпайт — админ гана.
create table if not exists public.rental_equipment (
  rental_id   text primary key references public.rentals (id) on delete cascade,
  gps_no      text not null default '' check (char_length(gps_no) <= 40),
  battery1_no text not null default '' check (char_length(battery1_no) <= 40),
  battery2_no text not null default '' check (char_length(battery2_no) <= 40),
  updated_at  timestamptz not null default now()
);
alter table public.rental_equipment enable row level security;
drop policy if exists "rental equipment admin" on public.rental_equipment;
create policy "rental equipment admin" on public.rental_equipment for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
