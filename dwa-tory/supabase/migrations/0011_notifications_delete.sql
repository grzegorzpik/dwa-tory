-- Dwa Tory — usuwanie powiadomień (spec §5.8 rozszerzenie na prośbę
-- użytkownika: swipe w prawo = usuń, analogicznie do appki Wiadomości).
--
-- Brak polityki DELETE na notifications do tej pory — feed był tylko do
-- odczytu/odpowiedzi. "Archiwizacja" (swipe w lewo) jest celowo lokalna,
-- tylko na urządzeniu (patrz src/lib/db.ts, ten sam wzorzec co
-- seenReplyIds) — nie wymaga zmian w bazie, bo ma chować wpis tylko dla
-- osoby, która go zarchiwizowała, nie dla obojga naraz jak realny DELETE.

create policy notifications_delete_pair on public.notifications for delete
  to authenticated
  using (pair_id = public.current_pair_id());
