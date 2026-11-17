-- Акцияларга сүрөт кошуу.
-- Supabase → SQL Editor → New query → ушул сапты коюп, Run басыңыз.
alter table public.promos add column if not exists image_url text;
