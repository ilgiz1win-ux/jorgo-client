-- Келишимдин 2-барагы: кабыл алуу-өткөрүп берүү акты (велосипеддин абалы берилгенде) жана ким берди.
-- 028 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

alter table public.rental_requests add column if not exists handover_defects text not null default '';  -- 'none' | 'scratches'
alter table public.rental_requests add column if not exists handover_note    text not null default '';
alter table public.rental_requests add column if not exists handover_ok      boolean not null default true; -- тормоз, дөңгөлөк, передача иштейт
alter table public.rental_requests add column if not exists staff_name       text not null default '';  -- ким берди (Выдал)
alter table public.rental_requests drop constraint if exists rental_requests_handover_check;
alter table public.rental_requests add constraint rental_requests_handover_check check (
  handover_defects in ('', 'none', 'scratches') and char_length(handover_note) <= 300 and char_length(staff_name) <= 80);

create or replace function public.admin_rent_start(p_id uuid, p_details jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rental_requests;
  no integer;
  d jsonb := coalesce(p_details, '{}'::jsonb);
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select * into r from public.rental_requests where id = p_id for update;
  if r.id is null or r.status <> 'new' then return r.contract_no; end if;
  no := coalesce(r.contract_no, nextval('public.rent_contract_seq'));
  update public.rental_requests set
    status = 'active', started_at = now(), charged_days = 0, contract_no = no,
    bike_no = left(coalesce(d->>'bikeNo', ''), 40),
    jorgo_no = left(coalesce(d->>'jorgoNo', ''), 40),
    battery_no = left(coalesce(d->>'batteryNo', ''), 60),
    bike_value = nullif(d->>'bikeValue', '')::int,
    deposit = nullif(d->>'deposit', '')::int,
    collateral = left(coalesce(d->>'collateral', ''), 120),
    kit = case when jsonb_typeof(d->'kit') = 'array' then d->'kit' else '[]'::jsonb end,
    handover_defects = case when d->>'defects' in ('none', 'scratches') then d->>'defects' else '' end,
    handover_note = left(coalesce(d->>'handoverNote', ''), 300),
    handover_ok = coalesce((d->>'handoverOk')::boolean, true),
    staff_name = left(coalesce(d->>'staff', ''), 80)
  where id = p_id;
  if r.billing then
    perform public.notify_user(r.user_id, 'Ижара башталды 🚲 · Келишим №' || no,
      r.bike_name || ' · бүгүн акысыз, эртеңден баштап күнүнө ' || r.daily_price || ' сом балансыңыздан алынат. Минимум ' || public.rent_min_days() || ' күн.', 'rent');
  end if;
  return no;
end $$;
