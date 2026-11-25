-- Каттоосуз колдонуу: экспресс жеткирүү заказын да аккаунтсуз берсе болот (аты жана телефону менен).
-- Кара тизмедеги номерден мурдагыдай эле заказ өтпөйт. Кайра иштетсе зыяны жок.
drop policy if exists "orders insert" on public.orders;
create policy "orders insert" on public.orders for insert to anon, authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and status = 'new' and express_fee is null and picked_up_at is null and delivered_at is null and cancel_reason = ''
    and not public.is_blacklisted(phone)
  );
