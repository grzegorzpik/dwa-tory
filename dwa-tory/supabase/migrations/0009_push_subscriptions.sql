-- Dwa Tory — Web Push: tabela subskrypcji przeglądarki/urządzenia.
--
-- Dokończenie kroku 8 (Powiadomienia) i przełącznika "Push" w Profilu, który
-- dotąd zapisywał tylko preferencję bez żadnego efektu (patrz README).
-- Prawdziwe wysyłanie robi Edge Function `send-push` (service_role, więc RLS
-- jej nie ogranicza) wywoływana Database Webhookiem po INSERT do
-- `notifications` — webhook konfigurowany ręcznie w Dashboardzie (patrz
-- README), nie w tej migracji, żeby nie trzymać w repo URL-a/klucza
-- konkretnego projektu.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_person_id_idx on public.push_subscriptions (person_id);

comment on table public.push_subscriptions is
  'Jedna subskrypcja Push API na przeglądarkę/urządzenie (spec §5.7 "Push"). '
  'endpoint jest unikalny — ponowna subskrypcja tej samej przeglądarki nadpisuje starą (upsert po endpoint).';

alter table public.push_subscriptions enable row level security;

-- Właściciel zarządza wyłącznie swoimi subskrypcjami. Brak polityki selecta
-- dla partnera celowy: send-push i tak czyta subskrypcje ADRESATA przez
-- service_role, który omija RLS — klientowi partnera nie ma po co ich widzieć.
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (person_id = auth.uid());

create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (person_id = auth.uid());

-- Klient subskrybuje przez upsert po endpoint (ON CONFLICT DO UPDATE) — bez
-- polityki update RLS odrzuciłby gałąź UPDATE tego upsertu przy ponownej
-- subskrypcji tej samej przeglądarki.
create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated
  using (person_id = auth.uid())
  with check (person_id = auth.uid());

create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (person_id = auth.uid());
