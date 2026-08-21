-- Dwa Tory — widoczność "Szybkiego zadania" dla partnerki.
--
-- 0005_tasks.sql zakładało zadania jako zawsze prywatne (formularz Kreatora
-- go nie zbierał). Użytkownik poprosił o tę samą opcję współdzielenia co
-- przy celach, nawet dla jednorazowych zadań — dodaje kolumnę i podmienia
-- politykę selecta na dokładny odpowiednik goals_select_own_or_visible_partner.

alter table public.tasks add column visible_to_partner boolean not null default false;

drop policy tasks_select_own on public.tasks;

create policy tasks_select_own_or_visible_partner on public.tasks for select
  to authenticated
  using (
    owner_id = auth.uid()
    or (owner_id = public.current_partner_id() and visible_to_partner)
  );
