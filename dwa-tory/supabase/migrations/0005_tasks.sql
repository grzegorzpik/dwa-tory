-- Dwa Tory — tabela dla "Szybkiego zadania" (spec §4/§5.5).
--
-- Do Etapu 6 tego wątku "Szybkie zadanie" w ogóle się nie zapisywało —
-- formularz zbierał nazwę/datę/godzinę i po prostu zamykał się bez
-- żadnego skutku (patrz stary komentarz w GoalEditor.tsx, pisany zanim
-- krok 10 istniał: "docelowo do jednokierunkowej synchronizacji z
-- kalendarzem telefonu... świadomie nie zapisujemy jej jako Goal"). Osobna
-- tabela, nie wiersz w goals: zadanie nie ma kadencji ani śledzenia
-- postępu (Goal wymaga obu), to jednorazowa rzecz na konkretny dzień.
--
-- Brak visible_to_partner — formularz Kreatora go nie zbiera dla zadań
-- (świadoma decyzja: zadania są prywatne, tylko właściciel je widzi).
-- Jeśli to się kiedyś zmieni, trzeba dodać kolumnę + politykę selecta
-- analogiczną do goals_select_own_or_visible_partner.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  date date not null,
  time text, -- wolny tekst, jak goals.cadence_time_of_day
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_owner_id_date_idx on public.tasks (owner_id, date);

comment on table public.tasks is
  '"Szybkie zadanie" — jednorazowa rzecz bez kadencji/śledzenia, na konkretny dzień. Tylko właściciel (brak widoczności dla partnerki).';

alter table public.tasks enable row level security;

create policy tasks_select_own on public.tasks for select
  to authenticated
  using (owner_id = auth.uid());

create policy tasks_insert_own on public.tasks for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy tasks_update_own on public.tasks for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy tasks_delete_own on public.tasks for delete
  to authenticated
  using (owner_id = auth.uid());

create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
