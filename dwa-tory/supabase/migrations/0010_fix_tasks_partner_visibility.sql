-- Dwa Tory — naprawa: widoczność zadań dla partnerki nigdy nie działała,
-- bo tabela `tasks` w ogóle nie istniała w tym projekcie.
--
-- Zgłoszenie: "Szybkie zadanie" oznaczone jako widoczne dla partnerki nie
-- pokazywało się u niej wcale — w OBIE strony (sprawdzone na obu kontach
-- pary). Pierwsza diagnoza (przez pg_policies) wyglądała na brakującą
-- migrację 0006 — ale głębsza diagnoza (`information_schema.tables`)
-- pokazała, że w tym projekcie NIGDY nie zaaplikowano nawet
-- 0005_tasks.sql: `relation "public.tasks" does not exist`. Własne zadania
-- mimo to "działały", bo appka pokazuje lokalny cache (IndexedDB)
-- niezależnie od tego, czy Supabase faktycznie potwierdza dane przy
-- zapisie/odczycie (błąd zapisu tylko cicho logowany do konsoli).
--
-- Ta sama diagnoza wykazała drugą, niezależną dziurę: tabela
-- `notifications` (0001_init_schema.sql) istniała, ale nigdy nie została
-- dodana do publikacji `supabase_realtime` (0004_realtime.sql objęła
-- tylko goals/instances/milestones) — więc panel Powiadomień i dźwięk
-- powiadomienia (src/lib/sound.ts) nigdy nie działały "na żywo" między
-- dwoma otwartymi appkami, tylko przy starcie appki / powrocie z tła.
--
-- Migracja tworzy `tasks` od zera (0005+0006 połączone w finalny, poprawny
-- stan) i dopina obie tabele do Realtime. W pełni idempotentna (IF
-- EXISTS/IF NOT EXISTS + sprawdzenie publikacji), bezpieczna do ponownego
-- uruchomienia niezależnie od tego, co już się udało wcześniej.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  date date not null,
  time text, -- wolny tekst, jak goals.cadence_time_of_day
  done boolean not null default false,
  visible_to_partner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_owner_id_date_idx on public.tasks (owner_id, date);

comment on table public.tasks is
  '"Szybkie zadanie" — jednorazowa rzecz bez kadencji/śledzenia, na konkretny dzień. visible_to_partner steruje widocznością dla drugiej osoby w parze.';

alter table public.tasks enable row level security;

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

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
