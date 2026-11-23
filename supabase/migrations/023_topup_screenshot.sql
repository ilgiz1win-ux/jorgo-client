-- Толуктоо: скриншот милдеттүү, бир эле скриншотту кайра жүктөөгө болбойт.
-- 022 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

alter table public.topup_requests add column if not exists receipt_hash text check (receipt_hash is null or char_length(receipt_hash) <= 64);
create unique index if not exists topup_requests_receipt_hash_idx on public.topup_requests (receipt_hash) where receipt_hash is not null;

-- Жаңы толуктоодо скриншот болушу керек жана кардардын өз папкасында болушу керек
create or replace function public.topup_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.code := 'J' || nextval('public.topup_code_seq');
  if new.receipt is null or new.receipt = '' then raise exception 'receipt_required'; end if;
  if split_part(new.receipt, '/', 1) <> new.user_id::text then raise exception 'bad receipt path'; end if;
  return new;
end $$;
