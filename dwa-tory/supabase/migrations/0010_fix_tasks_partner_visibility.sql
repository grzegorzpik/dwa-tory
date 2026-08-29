-- Dwa Tory — naprawa: widoczność zadań dla partnerki nigdy nie działała.
--
-- Zgłoszenie: "Szybkie zadanie" oznaczone jako widoczne dla partnerki nie
-- pokazywało się u niej wcale — w OBIE strony (sprawdzone na obu kontach
-- pary). Diagnoza przez SQL Editor pokazała, że na produkcyjnej bazie
-- brakowało kolumny `visible_to_partner` na `tasks` I polityki SELECT na
-- tej tabeli w ogóle (0 wierszy w pg_policies dla cmd='SELECT') — czyli
-- migracja 0006_tasks_partner_visibility.sql (może razem z częścią 0005)
-- nigdy nie została faktycznie zaaplikowana w tym projekcie, mimo że
-- appka i cała reszta migracji zakładały, że jest. Własne zadania mimo to
-- "działały", bo appka pokazuje lokalny cache (IndexedDB) niezależnie od
-- tego, czy Supabase faktycznie potwierdza dane przy odczycie.
--
-- Ta migracja doprowadza stan do tego samego efektu co 0005+0006, w pełni
-- idempotentnie (IF EXISTS/IF NOT EXISTS) — bezpieczna do uruchomienia
-- niezależnie od tego, które z wcześniejszych kroków faktycznie przeszły.

alter table public.tasks add column if not exists visible_to_partner boolean not null default false;

drop policy if exists tasks_select_own on public.tasks;
drop policy if exists tasks_select_own_or_visible_partner on public.tasks;
create policy tasks_select_own_or_visible_partner on public.tasks for select
  to authenticated
  using (
    owner_id = auth.uid()
    or (owner_id = public.current_partner_id() and visible_to_partner)
  );

drop policy if exists tasks_insert_own on public.tasks;
create policy tasks_insert_own on public.tasks for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists tasks_update_own on public.tasks;
create policy tasks_update_own on public.tasks for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists tasks_delete_own on public.tasks;
create policy tasks_delete_own on public.tasks for delete
  to authenticated
  using (owner_id = auth.uid());
