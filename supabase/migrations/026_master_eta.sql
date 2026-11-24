-- Мастер заказды кабыл алганда качан барарын (келерин) жазат: eta_at.
-- Кардарга «Мастер … кабыл алды, 14:30да келет» деген билдирме барат.
-- 025 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.

alter table public.repair_requests add column if not exists eta_at timestamptz;

-- Мастер: абал, эскертме, «мен алам», «келдим» жана барчу убакыт (eta_at)
create or replace function public.repairs_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.outcall_fee := old.outcall_fee;
  if public.is_admin() then return new; end if;
  if new.master_id is distinct from old.master_id and not (old.master_id is null and new.master_id = public.my_master_id()) then
    raise exception 'not allowed';
  end if;
  new.number := old.number; new.user_id := old.user_id; new.name := old.name; new.phone := old.phone;
  new.bike := old.bike; new.services := old.services; new.problem := old.problem; new.branch := old.branch;
  new.outcall := old.outcall; new.created_at := old.created_at;
  new.photos := old.photos; new.address := old.address; new.lat := old.lat; new.lng := old.lng;
  new.visit_at := old.visit_at; new.bring := old.bring;
  if old.arrived_at is not null then new.arrived_at := old.arrived_at;
  elsif new.arrived_at is not null then
    new.arrived_at := now();
    perform public.notify_user(new.user_id, 'Мастер келди 🚗', '№' || new.number || ' · мастер дарегиңизге келди.', 'repair');
  end if;
  -- Барчу убакыт: өткөн убакыт болбосун
  if new.eta_at is distinct from old.eta_at and new.eta_at is not null and new.eta_at < now() - interval '10 minutes' then
    raise exception 'eta in the past';
  end if;
  return new;
end $$;

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
  mname text;
  eta text;
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

  select m.name into mname from public.masters m where m.id = new.master_id;
  eta := to_char(new.eta_at at time zone 'Asia/Bishkek', 'DD.MM HH24:MI');

  if new.status is distinct from old.status then
    perform public.notify_user(new.user_id,
      case new.status
        when 'accepted' then 'Мастер ' || coalesce(mname, '') || ' кабыл алды' || case when eta is not null then case when new.outcall then ', ' || eta || ' келет' else ', ' || eta || ' келиңиз' end else '' end
        when 'in_progress' then 'Велосипедиңиз оңдолуп жатат'
        when 'done' then 'Оңдоо бүттү ✅' when 'cancelled' then 'Оңдоо өтүнмөсү жокко чыгарылды' else 'Оңдоо өтүнмөсү жаңыланды' end,
      '№' || new.number || case when new.master_note <> '' then ' · ' || new.master_note else '' end, 'repair');
    perform public.notify_admins('№' || new.number || ': ' || coalesce(mname, 'мастер') || ' — ' ||
      case new.status when 'accepted' then 'кабыл алды' when 'in_progress' then 'иштеп жатат' when 'done' then 'бүттү' when 'cancelled' then 'отказ' else new.status end
      || case when new.status = 'accepted' and eta is not null then ' · ' || eta else '' end, new.name || ' · ' || new.phone, '/admin/repairs');
  elsif new.eta_at is distinct from old.eta_at and new.eta_at is not null then
    perform public.notify_user(new.user_id, 'Мастер ' || coalesce(mname, '') || case when new.outcall then ' ' || eta || ' келет' else ': ' || eta || ' келиңиз' end, '№' || new.number || ' · убакыт өзгөрдү', 'repair');
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
