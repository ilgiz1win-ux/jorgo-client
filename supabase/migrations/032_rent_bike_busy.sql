-- Ижара башталганда велосипед «Ижарада» болот, кайтарылганда кайра «Бош».
-- Мурда «Бош/Ижарада» белгиси админ колу менен гана өзгөрчү.
-- 027 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

create or replace function public.rent_bike_busy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status or new.bike_id is null then return new; end if;
  if new.status = 'active' then
    update public.rentals set available = false where id = new.bike_id;
  elsif old.status = 'active' then
    -- Ошол велосипедде башка активдүү ижара жок болсо гана бошотобуз
    update public.rentals set available = true
    where id = new.bike_id
      and not exists (select 1 from public.rental_requests x where x.bike_id = new.bike_id and x.status = 'active' and x.id <> new.id);
  end if;
  return new;
end $$;

drop trigger if exists rent_bike_busy on public.rental_requests;
create trigger rent_bike_busy after update of status on public.rental_requests
  for each row execute function public.rent_bike_busy();

-- Азыр ижарада жүргөн велосипеддерди дароо «Ижарада» кылуу
update public.rentals set available = false
where id in (select bike_id from public.rental_requests where status = 'active' and bike_id is not null);
