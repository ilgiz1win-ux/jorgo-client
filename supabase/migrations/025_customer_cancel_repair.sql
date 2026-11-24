-- Кардар өзүнүн оңдоо заказын мастер келгенге чейин жокко чыгара алат (выезд акысы кайтарылат).
-- 024 иштетилгенден кийин иштетиңиз. Кайра иштетсе зыяны жок.
create or replace function public.customer_cancel_repair(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare r public.repair_requests;
begin
  select * into r from public.repair_requests where id = p_id and user_id = auth.uid() for update;
  if r.id is null or r.status not in ('new', 'accepted') or r.arrived_at is not null then return false; end if;
  update public.repair_requests set status = 'cancelled', master_note = left('Кардар жокко чыгарды', 500) where id = p_id;
  perform public.notify_admins('Кардар заказды жокко чыгарды №' || r.number, r.name || ' · ' || r.phone, '/admin/repairs');
  if r.master_id is not null then
    perform public.notify_user(a.user_id, 'Заказ №' || r.number || ' жокко чыгарылды', 'Кардар өзү жокко чыгарды', 'repair')
    from public.master_accounts a where a.master_id = r.master_id and a.panel_open;
  end if;
  return true;
end $$;
revoke all on function public.customer_cancel_repair(uuid) from public, anon;
grant execute on function public.customer_cancel_repair(uuid) to authenticated;
