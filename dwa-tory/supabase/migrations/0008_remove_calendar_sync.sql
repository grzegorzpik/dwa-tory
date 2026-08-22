-- Dwa Tory — wycofanie integracji z kalendarzem telefonu (dawny krok 10).
--
-- Cztery kolejne podejścia (data: URI, Web Share API, wymuszona nawigacja
-- do Safari, wreszcie prawdziwy adres https:// przez Supabase Storage —
-- patrz historia w usuniętym src/lib/ics.ts) zawiodły z tego samego,
-- niedającego się obejść po stronie appki powodu: appka zainstalowana na
-- ekranie głównym (docelowy sposób jej używania) otwiera zewnętrzne linki
-- w ograniczonym oknie, które nie dostaje specjalnej obsługi .ics przez
-- iOS — niezależnie od tego, JAK dobrze plik jest wygenerowany/serwowany
-- (w zwykłej karcie Safari to samo działa bez zarzutu). Do tego samo
-- wymuszanie okienka przy każdym zapisie celu/zadania z włączonym sync
-- było uciążliwe. Decyzja: wycofać funkcję całkowicie, zamiast dalej
-- próbować obejść ograniczenie platformy, którego obejść się nie da.

-- Usuwa obiekty i sam bucket z 0007_calendar_exports_bucket.sql.
delete from storage.objects where bucket_id = 'calendar-exports';
delete from storage.buckets where id = 'calendar-exports';

drop policy if exists calendar_exports_insert_own on storage.objects;
drop policy if exists calendar_exports_update_own on storage.objects;
drop policy if exists calendar_exports_select_public on storage.objects;

-- Kolumna z 0001_init_schema.sql — formularz już jej nie zbiera.
alter table public.goals drop column if exists sync_to_phone_calendar;
