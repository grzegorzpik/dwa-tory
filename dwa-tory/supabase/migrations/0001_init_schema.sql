-- Dwa Tory — schemat bazy (Etap 1 planu backendu).
-- Źródło modelu: docs/SPECYFIKACJA.pdf §4 (Model danych) i §6 (Integracje —
-- łączenie kont), zweryfikowane przeciwko src/types.ts i src/lib/seedData.ts,
-- żeby kolumny 1:1 odpowiadały temu, co klient już zapisuje w IndexedDB.
--
-- RLS: włączone na każdej tabeli, ale BEZ polityk — to celowo stan
-- "zablokowane dla wszystkich" do czasu migracji z Etapu 2. Nic w tej
-- migracji nie jest jeszcze dostępne przez klienta (anon key), więc projekt
-- Supabase nie stoi otwarty ani na chwilę.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- profiles — jeden wiersz na konto (1:1 z auth.users)
-- ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  initials text not null,
  color text not null,
  photo_src text, -- przycięty, skompresowany JPEG jako data URL (spec §8) — może być NULL (zdjęcie opcjonalne)
  streak integer not null default 0,
  longest_streak integer not null default 0,
  cheers integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Osoba (spec §4) — rozszerza auth.users o dane profilowe i statystyki Dziennika.';

-- ---------------------------------------------------------------------
-- pairs / pair_members — połączenie dwóch kont (spec §6 "Łączenie kont")
-- ---------------------------------------------------------------------

create table public.pairs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

comment on table public.pairs is 'Trwałe połączenie dwóch kont po wymianie kodu zaproszenia.';

-- user_id jako PRIMARY KEY gwarantuje, że jedno konto należy najwyżej do
-- jednej pary naraz — bez tego trzeba by to sprawdzać ręcznie przy każdym
-- parowaniu (i pilnować wyścigów).
create table public.pair_members (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  pair_id uuid not null references public.pairs (id) on delete cascade
);

create index pair_members_pair_id_idx on public.pair_members (pair_id);

comment on table public.pair_members is
  'Członkostwo w parze. user_id jest PK, więc jedno konto = najwyżej jedna aktywna para. '
  'Rozłączenie = DELETE z pairs (kaskadowo usuwa oba wiersze tutaj) — zgodnie z decyzją: rozłączenie zwalnia oboje do ponownego parowania.';

-- ---------------------------------------------------------------------
-- invite_codes — tymczasowy kod parowania (~15 min), spec §6 krok 2-3
-- ---------------------------------------------------------------------

create table public.invite_codes (
  code text primary key,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_by uuid references public.profiles (id) on delete set null,
  used_at timestamptz
);

create index invite_codes_created_by_idx on public.invite_codes (created_by);

comment on table public.invite_codes is
  'Kod → konto, ważny ~15 min. Wymiana kodu na parę odbywa się przez '
  'funkcję SECURITY DEFINER (Etap 4), nie przez bezpośredni INSERT/UPDATE klienta.';

-- ---------------------------------------------------------------------
-- goals — Cel (spec §4). hoursPerWeek świadomie nieobecne (relikt, nie przywracać).
-- ---------------------------------------------------------------------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,

  title text not null,
  type text not null check (type in ('termin', 'cykliczny')),
  character text not null check (character in ('habit', 'termin', 'cyclicalContent')),
  reason text,
  anchor text,
  minimal_version text,

  -- Etykieta czytelna ("dziś", "12 sie"), NIE data ISO — tak trzyma to klient
  -- (src/lib/seedData.ts: start = formatShortDate(...)), zachowane 1:1.
  start text not null,

  cadence_type text not null check (cadence_type in ('daily', 'weekdays', 'perWeekCount', 'monthly')),
  cadence_weekdays integer[], -- tylko cadence_type='weekdays', 0=Pn..6=Nd
  cadence_per_week_count integer, -- tylko cadence_type='perWeekCount'
  cadence_month_day integer, -- tylko cadence_type='monthly'
  cadence_time_of_day text,
  cadence_label text not null,
  cadence_slots text[] not null, -- ["Dziś","Jutro"] albo ["Ten tydzień","Przyszły tydzień"]

  target_value text, -- tylko type='termin'
  target_unit text, -- tylko type='termin'
  completed_sessions integer, -- tylko type='termin' — napędza kamienie liczone automatycznie

  -- Kamienie ręczne (bez threshold): klucz = milestones.id, wartość = odhaczony.
  manual_milestone_done jsonb not null default '{}'::jsonb,

  -- Żywy stan "dziś/jutro" (GoalInstance z types.ts) — bez własnej daty
  -- kalendarzowej, bo apka nie ma jeszcze silnika przełączania dnia
  -- (spec, dopisek architektoniczny w dwa-tory/README.md). Historia
  -- zdatowana leży w tabeli instances.
  instance_curr jsonb not null default '{"status":"plan"}'::jsonb, -- DayInstance {status,note?,weekCount?,weekKey?}
  instance_next jsonb not null default '{"status":"plan"}'::jsonb, -- NextInstance {status,double?}

  reschedule_count integer not null default 0,
  visible_to_partner boolean not null default true,
  sync_to_phone_calendar boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now() -- napędza "ostatni zapis wygrywa" w Etapie 5
);

create index goals_owner_id_idx on public.goals (owner_id);

comment on table public.goals is 'Cel (spec §4). Kolor toru zawsze z TYPE_COLOR[type], nigdy z koloru osoby.';
comment on column public.goals.visible_to_partner is
  'Luka z §7 spec: musi być egzekwowane na poziomie RLS (Etap 2), nie tylko w UI — '
  'cel z visible_to_partner=false nie może wrócić z zapytania partnera.';

-- ---------------------------------------------------------------------
-- milestones — Kamień milowy (spec §4, dwa tryby)
-- ---------------------------------------------------------------------

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  label text not null,
  date text not null, -- etykieta czytelna, jak goals.start
  threshold integer, -- tylko kamienie liczone automatycznie (completedSessions >= threshold)
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index milestones_goal_id_idx on public.milestones (goal_id);

comment on table public.milestones is
  'Kamień milowy. Status "done" dla kamieni automatycznych NIGDY nie jest tu przechowywany '
  '(liczony na bieżąco z completed_sessions >= threshold) — dla ręcznych patrz goals.manual_milestone_done.';

-- ---------------------------------------------------------------------
-- instances — historia dni (odpowiednik Goal.history z types.ts)
-- ---------------------------------------------------------------------

create table public.instances (
  goal_id uuid not null references public.goals (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade, -- zdenormalizowane pod RLS/indeks
  date date not null,
  status text not null check (status in ('done', 'moved', 'skipped')), -- 'plan' nigdy tu nie trafia (spec)
  created_at timestamptz not null default now(),
  primary key (goal_id, date)
);

create index instances_owner_id_date_idx on public.instances (owner_id, date);

comment on table public.instances is
  'Jeden wiersz na (cel, dzień) — realne dane pod Kalendarz. Brak wpisu = brak danych, nie porażka.';

-- ---------------------------------------------------------------------
-- notifications — panel powiadomień (spec §5.8)
-- ---------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade, -- czyje działanie opisuje wpis
  text text not null,
  created_at timestamptz not null default now(),
  responded boolean not null default false,
  reply text,
  replied_at timestamptz
);

create index notifications_pair_id_idx on public.notifications (pair_id);

comment on table public.notifications is
  'Odbiorcą jest zawsze drugi członek pair_id (nie actor_id) — brak osobnej kolumny recipient, '
  'wyliczane przez RLS/zapytanie z pair_members. Limit 5 słów w reply egzekwowany po stronie klienta (spec §5.8).';

-- ---------------------------------------------------------------------
-- updated_at — automatyczny znacznik czasu pod "ostatni zapis wygrywa" (Etap 5)
-- ---------------------------------------------------------------------

create function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger goals_set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS — włączone teraz, polityki dopiero w Etapie 2. Domyślnie: zablokowane dla wszystkich.
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.pairs enable row level security;
alter table public.pair_members enable row level security;
alter table public.invite_codes enable row level security;
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
alter table public.instances enable row level security;
alter table public.notifications enable row level security;
