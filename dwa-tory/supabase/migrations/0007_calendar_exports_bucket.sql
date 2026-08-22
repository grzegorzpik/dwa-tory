-- Dwa Tory — bucket Storage do serwowania wygenerowanych zdarzeń .ics
-- (krok 10, trzecia próba naprawy "Dodaj do Kalendarza" — patrz komentarz
-- na górze src/lib/ics.ts).
--
-- Dwie pierwsze próby (data: URI bez download, Web Share API) i trzecia
-- (data: URI wymuszone do otwarcia w Safari przez <a target="_blank">)
-- zawiodły na prawdziwym urządzeniu: iOS pokazuje naive "Dodaj do
-- kalendarza" tylko dla PRAWDZIWEGO żądania sieciowego z nagłówkiem
-- Content-Type: text/calendar, nie dla URI wpisanego wprost w przeglądarce
-- (data:/blob:), niezależnie od tego, w jakim oknie Safari to otwieramy.
-- Jedyny sposób bez własnego serwera: wrzucić plik do publicznego bucketu
-- Supabase Storage i otworzyć jego prawdziwy adres https://.

insert into storage.buckets (id, name, public)
values ('calendar-exports', 'calendar-exports', true)
on conflict (id) do nothing;

-- Ścieżka obiektu to zawsze "{owner_id}/{id}.ics" — pierwszy segment ścieżki
-- musi się zgadzać z auth.uid(), więc nikt nie może nadpisać cudzego pliku.
create policy calendar_exports_insert_own on storage.objects for insert
  to authenticated
  with check (bucket_id = 'calendar-exports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy calendar_exports_update_own on storage.objects for update
  to authenticated
  using (bucket_id = 'calendar-exports' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'calendar-exports' and (storage.foldername(name))[1] = auth.uid()::text);

-- Odczyt publiczny (bucket public=true już to zapewnia dla anonimowego GET,
-- ta polityka jest dla ewentualnych odczytów przez klienta supabase-js
-- zamiast bezpośrednio przez publiczny URL).
create policy calendar_exports_select_public on storage.objects for select
  to public
  using (bucket_id = 'calendar-exports');

comment on policy calendar_exports_insert_own on storage.objects is
  'Plik .ics może wrzucić tylko właściciel, do własnego folderu ({auth.uid()}/...).';
