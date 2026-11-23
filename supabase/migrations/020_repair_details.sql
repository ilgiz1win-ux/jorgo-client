-- Оңдоо заказынын толук маалыматы: сүрөттөр, дарек (жана карта), барчу убакыт, мастер эмне ала барсын.
-- 016–019 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

alter table public.repair_requests add column if not exists photos   jsonb not null default '[]'::jsonb;
alter table public.repair_requests add column if not exists address  text not null default '';
alter table public.repair_requests add column if not exists lat      double precision;
alter table public.repair_requests add column if not exists lng      double precision;
alter table public.repair_requests add column if not exists visit_at timestamptz;          -- кардар тандаган / админ койгон убакыт
alter table public.repair_requests add column if not exists bring    text not null default ''; -- мастер эмне ала барсын (админ жазат)

alter table public.repair_requests drop constraint if exists repair_requests_photos_check;
alter table public.repair_requests add constraint repair_requests_photos_check
  check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) <= 5 and char_length(photos::text) <= 3000);
alter table public.repair_requests drop constraint if exists repair_requests_address_check;
alter table public.repair_requests add constraint repair_requests_address_check check (char_length(address) <= 200);
alter table public.repair_requests drop constraint if exists repair_requests_bring_check;
alter table public.repair_requests add constraint repair_requests_bring_check check (char_length(bring) <= 300);
alter table public.repair_requests drop constraint if exists repair_requests_latlng_check;
alter table public.repair_requests add constraint repair_requests_latlng_check
  check ((lat is null or lat between -90 and 90) and (lng is null or lng between -180 and 180));

-- Кардар «эмне ала барсын» жаза албайт
drop policy if exists "repairs insert" on public.repair_requests;
create policy "repairs insert" on public.repair_requests for insert to anon, authenticated
  with check ((user_id is null or user_id = auth.uid()) and status = 'new' and master_note = '' and bring = '' and not public.is_blacklisted(phone));

-- Мастер абалды, эскертмени жана «мен алам»ды гана өзгөртөт (калганы — админде)
create or replace function public.repairs_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if public.is_admin() then return new; end if;
  if new.master_id is distinct from old.master_id and not (old.master_id is null and new.master_id = public.my_master_id()) then
    raise exception 'not allowed';
  end if;
  new.number := old.number; new.user_id := old.user_id; new.name := old.name; new.phone := old.phone;
  new.bike := old.bike; new.services := old.services; new.problem := old.problem; new.branch := old.branch;
  new.outcall := old.outcall; new.created_at := old.created_at;
  new.photos := old.photos; new.address := old.address; new.lat := old.lat; new.lng := old.lng;
  new.visit_at := old.visit_at; new.bring := old.bring;
  return new;
end $$;

-- Сүрөттөр үчүн өзүнчө бакет: баары көрө алат, кардар (кирбесе да) жүктөй алат
insert into storage.buckets (id, name, public) values ('repairs', 'repairs', true) on conflict (id) do update set public = true;
drop policy if exists "repair photos read"   on storage.objects;
drop policy if exists "repair photos upload" on storage.objects;
drop policy if exists "repair photos delete" on storage.objects;
create policy "repair photos read"   on storage.objects for select using (bucket_id = 'repairs');
create policy "repair photos upload" on storage.objects for insert to anon, authenticated with check (bucket_id = 'repairs' and name like 'req/%');
create policy "repair photos delete" on storage.objects for delete to authenticated using (bucket_id = 'repairs' and public.is_admin());
-- Сүрөт гана, 5 МБ чейин
do $$
begin
  update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'repairs';
exception when others then null;
end $$;

-- Билдирмелер: админ мастерди дайындаса же убакытты / «эмне ала барсын»ды өзгөртсө — мастерге
create or replace function public.repairs_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  body text;
  r record;
  mu uuid;
begin
  if tg_op = 'INSERT' then
    body := format('%s · %s · %s%s', new.name, new.phone, coalesce(nullif(new.bike, ''), '—'), case when new.outcall then ' · 🚗 выезд' else '' end);
    perform public.notify_admins('Жаңы оңдоо өтүнмөсү №' || new.number, body, '/admin/repairs');
    for r in
      select a.user_id from public.master_accounts a join public.masters m on m.id = a.master_id
      where a.panel_open
        and ((new.master_id is not null and a.master_id = new.master_id)
          or (new.master_id is null and m.branch = new.branch and m.active))
    loop
      perform public.notify_user(r.user_id, 'Жаңы оңдоо заказы №' || new.number, body, 'repair');
    end loop;
    return new;
  end if;
  if new.status is distinct from old.status then
    perform public.notify_user(new.user_id,
      case new.status when 'accepted' then 'Мастер өтүнмөңүздү кабыл алды' when 'in_progress' then 'Велосипедиңиз оңдолуп жатат'
        when 'done' then 'Оңдоо бүттү ✅' when 'cancelled' then 'Оңдоо өтүнмөсү жокко чыгарылды' else 'Оңдоо өтүнмөсү жаңыланды' end,
      '№' || new.number || case when new.master_note <> '' then ' · ' || new.master_note else '' end, 'repair');
  end if;
  if new.master_id is not null and public.is_admin() then
    select a.user_id into mu from public.master_accounts a where a.master_id = new.master_id and a.panel_open;
    if mu is not null then
      if new.master_id is distinct from old.master_id then
        perform public.notify_user(mu, 'Сизге заказ берилди №' || new.number,
          concat_ws(' · ', new.name, nullif(new.address, ''), to_char(new.visit_at at time zone 'Asia/Bishkek', 'DD.MM HH24:MI'), nullif('🧰 ' || nullif(new.bring, ''), '🧰 ')), 'repair');
      elsif new.visit_at is distinct from old.visit_at or new.bring is distinct from old.bring then
        perform public.notify_user(mu, 'Заказ №' || new.number || ' жаңыланды',
          concat_ws(' · ', to_char(new.visit_at at time zone 'Asia/Bishkek', 'DD.MM HH24:MI'), nullif('🧰 ' || nullif(new.bring, ''), '🧰 ')), 'repair');
      end if;
    end if;
  end if;
  return new;
end $$;
