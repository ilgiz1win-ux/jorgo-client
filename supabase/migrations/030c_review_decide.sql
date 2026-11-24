-- 030 SQL'дин 3-бөлүгү (үчөөнү тең ушул тартипте иштетиңиз: 030a, 030b, 030c). Кайра иштетсе зыяны жок.

-- Админ: ырастоо (башкы беттеги пикирлерге кошулат) же четке кагуу
create or replace function public.admin_review_decide(p_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r public.review_submissions; rid text;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select * into r from public.review_submissions where id = p_id for update;
  if r.id is null or r.status <> 'new' then return; end if;
  if p_approve then
    rid := 'rv-' || replace(r.id::text, '-', '');
    insert into public.reviews (id, name, text, rating, sort)
    values (rid, r.name, r.text, r.rating, coalesce((select min(sort) from public.reviews), 0) - 1)
    on conflict (id) do nothing;
    update public.review_submissions set status = 'approved', review_id = rid where id = p_id;
    perform public.notify_user(r.user_id, 'Пикириңиз жарыяланды ⭐', 'Рахмат! Пикириңиз башкы бетте көрүнөт.', 'info');
  else
    update public.review_submissions set status = 'rejected' where id = p_id;
  end if;
end $$;
revoke all on function public.admin_review_decide(uuid, boolean) from public, anon;
grant execute on function public.admin_review_decide(uuid, boolean) to authenticated;
