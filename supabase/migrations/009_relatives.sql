-- Кардардын туугандары (ижара үчүн байланыш): аты-жөнү, ким болот, телефону.
-- Supabase → SQL Editor → New query → ушул файлды коюп, Run басыңыз. Кайра иштетсе зыяны жок.
alter table public.profiles add column if not exists relatives jsonb not null default '[]'::jsonb;

alter table public.profiles drop constraint if exists profiles_relatives_check;
alter table public.profiles add constraint profiles_relatives_check
  check (jsonb_typeof(relatives) = 'array' and jsonb_array_length(relatives) <= 3 and char_length(relatives::text) <= 1000);
