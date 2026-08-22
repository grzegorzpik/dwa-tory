# Dwa Tory

PWA do świadomego gospodarowania czasem i realizacji celów dla dwóch osób.
Pełna specyfikacja: `../docs/SPECYFIKACJA.pdf`.

## Stan budowy

Realizowana wg kolejności ze specyfikacji (§10), krok po kroku:

- [x] 1. Fundament — projekt PWA (manifest, service worker), `theme.ts`, routing zakładek, splash
- [x] 2. Dane lokalne — model, IndexedDB, tryb offline
- [x] 3. Dziennik — tory, odhaczanie, kaskada przesuwania
- [x] 4. Cele + kreator/edytor — pełne drzewo decyzyjne
- [x] 5. Kalendarz — Mój/Wiola/Wspólny, Tydzień/Miesiąc, Wspólna seria
- [x] 6. Profil — statystyki, Twoja podróż, ustawienia, eksport danych
- [x] 7. Backend — Supabase: schemat + RLS, logowanie (magic link/hasło), parowanie kont, sync celów (local-first + Realtime), wdrożenie na GitHub Pages
- [x] 8. Powiadomienia — pełna logika panelu (chipy, limit 5 słów, odpowiedziane)
- [x] 9. Onboarding + samouczek — imię/zdjęcie, status połączenia z partnerką, czas dla siebie, 4 karty funkcji, relaunch z Profilu
- [x] 10. Integracja z kalendarzem telefonu — eksport zdarzenia .ics per cel, celowo tylko pod iPhone/Safari

**Domknięta luka ze spec (§7, eksport/backup danych):** przycisk
"Eksportuj dane" w Profilu zapisuje `{person, goals, settings}` do JSON —
działa w prawdziwej appce (przeglądarka/PWA), nie w podglądzie artifact
(pobrania zablokowane przez sandbox). To samo ograniczenie dotyczy linku
"Dodaj do Kalendarza" z kroku 10 (`data:` URI) — działa na prawdziwym
iPhonie w Safari, w podglądzie artifact nic nie zrobi.

**Co z backendu (krok 7) wciąż nie działa:** mechanizm powiadomień push
(zapisujemy tylko preferencję w "Powiadomienia" — samo wysyłanie push
wymaga VAPID + service workera + czegoś, co realnie je wyśle, np. Supabase
Edge Function na triggerze bazy; nie zbudowane).

Panel "Powiadomienia" (co partnerka zrobiła + odpowiedzi z limitem 5 słów)
jest już realnie zsynchronizowany z tabelą `notifications`
(`src/lib/notificationsSync.ts` + `AppDataContext`, pull + Realtime jak przy
celach partnerki) — druga osoba w parze widzi Twoje odpowiedzi i odwrotnie.
Powiadomienie trafia do partnerki przy dwóch zdarzeniach: osiągnięciu
kamienia milowego i przesunięciu zadania (te same, które demonstrowały dane
seed od kroku 8) — celowo NIE przy każdym zwykłym odhaczeniu nawyku, żeby
nie zaspamować drugiej strony (apka nie ma być komunikatorem, spec §5.8).
Tekst zdarzeń jest w czasie teraźniejszym ("kończy", "przesuwa") celowo —
polska odmiana czasu przeszłego jest rodzajowa, a appka nie zna/nie zakłada
płci konta. Reszta backendu (konto, parowanie, sync celów) jest w pełni
realna — patrz `src/lib/pairing.ts`, `src/lib/goalsSync.ts`.

**Uwaga architektoniczna (Onboarding):** od backendu (krok 7) `hasCompletedOnboarding`
to prawdziwe ustawienie nowego konta Supabase, nie flaga w danych demo —
każde nowo założone konto (magic link albo hasło) przechodzi przez
onboarding raz, przy pierwszym logowaniu. Krok "Połącz się z partnerką"
(`src/screens/Onboarding.tsx`) generuje/wymienia prawdziwy kod parowania
(`src/lib/pairing.ts`), z odpytywaniem co kilka sekund, czy partnerka się
już połączyła (pełny Realtime zamiast odpytywania byłby ładniejszy, ale
odpytywanie działa i jest prostsze — nieodłożony follow-up, nie błąd).
Samouczek (4 karty funkcji) można też uruchomić ponownie w dowolnym
momencie z Profilu → Ustawienia. **Uwaga:** `src/lib/seedData.ts` (dane
demo z etapów 1-10 tego wątku) został w repo, ale odkąd doszedł backend nic
go już nie importuje — martwy kod, do usunięcia albo świadomego
zachowania jako dane do lokalnego developmentu bez Supabase.

**Uwaga architektoniczna (Integracja z kalendarzem telefonu):** apka celuje
wyłącznie w iPhone'a (decyzja użytkownika), więc krok 10 nie próbuje być
uniwersalny. Przeglądarka nie ma API do zapisu wprost w natywnym kalendarzu
— to świadome ograniczenie bezpieczeństwa, którego żadna appka webowa nie
omija. `src/lib/ics.ts` generuje zdarzenie iCalendar (RFC 5545) z regułą
powtarzania dopasowaną do kadencji celu (codziennie/konkretne dni
tygodnia/co miesiąc; „X razy w tygodniu” nie wskazuje konkretnych dni, więc
dostaje cotygodniowe przypomnienie z zastrzeżeniem w opisie).

Trzy nieudane podejścia po drodze, zapisane w komentarzu na górze
`src/lib/ics.ts` żeby ich nie próbować ponownie: (1) link `data:text/calendar`
bez atrybutu `download` — działa jako "otwórz ekran Dodaj do kalendarza" w
zwykłej karcie Safari, ale appka dodana do ekranu głównego (standalone PWA,
czyli docelowy sposób jej używania) renderuje się we własnym, bardziej
ograniczonym WebView, gdzie ta sama nawigacja nic nie robi; (2) Web Share
API z plikami — arkusz udostępniania się pokazuje, ale zweryfikowane na
prawdziwym urządzeniu, że iOS nie rozpoznaje udostępnionego pliku jako
zdarzenie kalendarza (niespójne mapowanie MIME/UTI dla .ics między
wersjami iOS); (3) wymuszenie nawigacji do `data:` URI w Safari przez
`<a target="_blank">` doklejony do DOM — na prawdziwym urządzeniu
standalone PWA otworzyło to w oknie typu SFSafariViewController (nie w
pełnym Safari.app), gdzie `data:` URI pokazał się jako pusta strona
(widoczny tytuł karty "data:") zamiast ekranu "Dodaj do kalendarza".
Wniosek: ta specjalna obsługa .ics przez iOS jest związana z prawdziwym
żądaniem sieciowym z nagłówkiem `Content-Type: text/calendar`, nie z URI
wpisanym wprost w przeglądarce (żadna odmiana `data:`/`blob:` tego nie
daje). Obecne (czwarte) podejście: `shareOrOpenIcsForGoal()`/
`shareOrOpenIcsForTask()` wrzucają wygenerowany plik do publicznego
bucketu Supabase Storage `calendar-exports` (migracja
`0007_calendar_exports_bucket.sql`, ścieżka `{ownerId}/{id}.ics`, RLS
pilnuje że tylko właściciel może tam pisać) i otwierają jego prawdziwy
adres `https://` — to zwykły request sieciowy z poprawnym nagłówkiem, jak
link do zdarzenia w mailu. Upload jest asynchroniczny, ale okno MUSI się
otworzyć synchronicznie w geście kliknięcia (Safari blokuje
`window.open` z opóźnieniem) — otwieramy więc puste okno od razu i
dopiero po skończonym uploadzie ustawiamy mu adres (`openThenNavigate()`
w `ics.ts`, ten sam wzorzec co przy przekierowaniach do płatności).
Konsekwencja: pliki .ics są odtąd publicznie dostępne pod nieodgadnalnym
adresem (losowe UUID celu/zadania w ścieżce) — akceptowalne, bo treść to
tylko tytuł/godzina zdarzenia, ta sama wrażliwość co zwykłe zaproszenie
kalendarzowe wysłane mailem. Cel z włączonym „Sync z kalendarzem
telefonu” (przełącznik w Kreatorze) od razu
po zapisaniu (przy tworzeniu ALBO przy edycji, jeśli sync właśnie się
włączył — nie przy każdym kolejnym zapisie) otwiera ten arkusz automatycznie,
bez konieczności ponownego wchodzenia w podgląd celu; przycisk „Dodaj do
Kalendarza” w podglądzie celu (Dziennik → dotknij nazwę celu) zostaje jako
sposób na powtórzenie tego później. Zdarzenie startuje od
dzisiaj (albo najbliższego pasującego dnia dla kadencji z konkretnymi
dniami), nie od historycznej daty startu celu — apka nie przechowuje
prawdziwej daty startu jako danych maszynowych, tylko etykietę do
wyświetlenia, a odtwarzanie historii w kalendarzu telefonu i tak nie miałoby
sensu (liczy się przypomnienie na przyszłość).

**Uwaga architektoniczna (Kalendarz):** apka wciąż nie ma silnika
"przełączania dnia" — Dziennik działa na jednym żywym "dziś" bez
automatycznego zaawansowania o północy (pre-existing, nie wprowadzone przy
tym kroku). Żeby Kalendarz mimo to renderował prawdziwe, a nie zmyślone
dane (jak makieta z seedowanym RNG), każdy cel dostał `history` —
zapisywaną w momencie akcji mapę dzień→wynik. To wystarcza do dziś i
wstecz; pełne, automatyczne przełączanie dnia zostawione jako świadomie
odłożone follow-up.

**Uwaga architektoniczna (Szybkie zadanie):** w Kreatorze obok "Nawyk /
Cel z terminem / Treść cykliczna" jest czwarta opcja — "Szybkie zadanie".
Wcześniej ten branch kodu w `submit()` (`GoalEditor.tsx`) świadomie NIE
zapisywał zadania jako `Goal` (brak kadencji/kamieni do liczenia — nie
pasuje do modelu celu), z zamiarem podpięcia eksportu do kalendarza —
ale nigdy nie wróciliśmy do tego przy budowie kroku 10, więc zadanie po
prostu znikało po zapisaniu. Naprawione dodaniem osobnego, równoległego
modelu `Task` (`src/lib/tasksSync.ts`, tabela `tasks`, `0005_tasks.sql`),
zapisywanego lokalnie (`db.ts`) i do Supabase jak cele. Zadanie jest
widoczne w trzech miejscach: (1) natychmiast po zapisaniu (tylko przy
TWORZENIU, nie przy każdej edycji) generuje i otwiera zdarzenie .ics jak
cel z włączonym sync kalendarza; (2) sekcja "Zadania na dziś" w Dzienniku
(tylko gdy są zadania na dziś); (3) Kalendarz — znacznik dnia, sekcja
"Zadania" i lista w podglądzie dnia (`DayDetailModal`), z
odhaczaniem/edycją/usuwaniem w miejscu. Dotknięcie wiersza zadania (nie
mała ikonka — cały wiersz to przycisk, zgłoszenie UX niżej) otwiera ten
sam `GoalEditor` co przy celu, tylko z drugim propem (`task` zamiast
`goal`) — `taskToFormState`/`formStateToTask` (`goalForm.ts`) budują i
odczytują `GoalFormState` tak samo jak przy celu, id zadania zachowane
przy edycji (bez tego każdy zapis tworzyłby duplikat zamiast nadpisywać).

**Uwaga architektoniczna (widoczność zadania dla partnerki):**
`0006_tasks_partner_visibility.sql` dodaje `visible_to_partner` do
`tasks` (domyślnie `false` w bazie — kolumna dla wierszy bez jawnej
wartości) i podmienia politykę selecta na dokładny odpowiednik
`goals_select_own_or_visible_partner`. Kreator ma teraz przełącznik
"Widoczne dla partnerki" w podsumowaniu dla OBU gałęzi (wcześniej tylko
dla celu) — zgłoszenie użytkownika: opcja udostępnienia powinna być przy
każdym rodzaju zadania, nawet jednorazowym. Nowe zadanie startuje z tym
przełącznikiem wyłączonym (tak działały zadania, zanim dostały tę
opcję), nowy cel — włączonym (istniejące zachowanie); w obu wypadkach
user może to zmienić przed zapisem. `partnerTasks` w `AppDataContext` to
dokładny mirror `partnerGoals` — pull + kanał Realtime na `tasks`
filtrowany po `owner_id` partnerki. Kalendarz łączy własne i partnerki
zadania przez `peopleWithTasks`/`taskEntriesFor` (`lib/kalendarz.ts`,
mirror `peopleWithGoals`/`dayEntriesFor`) — cudze zadanie w podglądzie
dnia renderuje się z avatarem, bez checkboxa/edycji/usuwania (RLS i tak
by to odrzucił, UI nie pokazuje akcji, których wykonać się nie da).
Dziennik pokazuje wyłącznie własne zadania (jak przy celach — to
osobisty dziennik, współdzielenie dotyczy tylko Kalendarza).

**Zgłoszenia UX (ta runda):**
- Dziennik nie miał żadnego wejścia do dodania celu/zadania poza
  zakładką "Cele" — dodany przycisk "Nowy cel / zadanie" pod listą
  torów, ten sam styl co w Cele.
- Edycja istniejącego celu domyślnie ustawiała fokus (i wysuwała
  klawiaturę) na polu nazwy, mimo że jest już wypełnione — `autoFocus`
  na tym polu teraz warunkowy (`!isEditMode`), włącza się tylko przy
  tworzeniu nowego wpisu.
- Ikony akcji przy zadaniach (odznacz/usuń) miały czysty rozmiar
  przycisku 22–28px bez dodatkowego marginesu na dotyk — zbyt małe jak
  na cel dotykowy. Podniesione do 32×32 (ujemny margines trzyma wygląd
  wizualny bez zmiany layoutu, ta sama sztuczka co przy przycisku
  zamykania w `GoalDetailModal`), a "przejście do edycji" przestało być
  osobną ikoną — cały wiersz zadania to teraz duży, oczywisty przycisk.

## Uruchomienie

Appka wymaga prawdziwego projektu Supabase (backend, krok 7) — bez tego
`npm run dev` wystartuje, ale appka rzuci błędem od razu przy ładowaniu
(`src/lib/supabaseClient.ts` celowo rzuca głośno zamiast cicho działać bez
backendu).

1. Załóż projekt na [supabase.com](https://supabase.com) (darmowy tier
   wystarcza).
2. Odpal po kolei migracje z `supabase/migrations/` (SQL Editor w panelu
   Supabase, albo `supabase db push` z lokalnie zainstalowanym Supabase
   CLI) — `0001_init_schema.sql` → `0002_rls_policies.sql` →
   `0003_pairing.sql` → `0004_realtime.sql` → `0005_tasks.sql` →
   `0006_tasks_partner_visibility.sql` →
   `0007_calendar_exports_bucket.sql`, w tej kolejności. Ostatnia zakłada
   bucket Storage `calendar-exports` — jeśli w Twoim projekcie Storage jest
   wyłączony, włącz go najpierw w panelu Supabase.
3. Skopiuj `.env.local.example` do `.env.local` i wklej `Project URL` oraz
   `anon public` key ze Settings → API swojego projektu Supabase.

```bash
npm install
npm run dev       # serwer deweloperski
npm run build     # build produkcyjny (tsc + vite build), generuje service worker
npm run preview   # podgląd builda produkcyjnego (tu realnie testować tryb offline/instalowalność)
```

**Wdrożenie:** `.github/workflows/deploy.yml` builduje i publikuje na
GitHub Pages przy każdym pushu do `main`. Wymaga tych samych dwóch zmiennych
jako **sekretów repo** (Settings → Secrets and variables → Actions):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — klucz `anon` jest publiczny
z założenia (bezpieczny w buncie frontendu), rzeczywiste bezpieczeństwo
danych daje RLS w bazie (`0002_rls_policies.sql`), nie ukrycie klucza.

## Struktura

- `src/theme.ts` — jedyne źródło prawdy dla kolorów/typografii/animacji (spec §7)
- `src/lib/calendarUtils.ts` — daty/kalendarz, wspólne dla wszystkich ekranów
- `src/lib/goals.ts` — czysta logika instancji dnia (kamienie, kaskada przesuwania)
- `src/lib/goalForm.ts` — czysta logika Kreatora/Edytora celu (kadencja, progi kamieni, walidacja kroków)
- `src/lib/kalendarz.ts` — agregacje dla Kalendarza (stan dnia, Wspólna seria, egzekwowanie widoczności dla partnerki)
- `src/lib/photo.ts` — kadrowanie zdjęcia profilowego przez `<canvas>`
- `src/lib/exportData.ts` — eksport danych użytkownika do JSON
- `src/lib/notifications.ts` — limit słów, walidacja odpowiedzi, format czasu względnego
- `src/lib/notificationsSync.ts` — sync panelu Powiadomień z Supabase (pull + Realtime)
- `src/lib/ics.ts` — eksport celu jako zdarzenie iCalendar (krok 10, iPhone/Safari)
- `src/lib/db.ts` — warstwa IndexedDB (lokalny cache/offline — Supabase jest źródłem prawdy, krok 7)
- `src/lib/supabaseClient.ts` — jedyne miejsce importujące `@supabase/supabase-js`
- `src/lib/pairing.ts` — generowanie/wymiana kodu parowania kont
- `src/lib/goalsSync.ts` — sync celów z Supabase (local-first + Realtime)
- `src/lib/tasksSync.ts` — sync "Szybkich zadań" z Supabase (local-first + Realtime dla widoku partnerki, jak cele)
- `src/store/AuthContext.tsx` — sesja Supabase Auth (magic link/hasło)
- `supabase/migrations/` — schemat bazy + RLS + parowanie + Realtime, w kolejności aplikowania
- `src/store/AppDataContext.tsx` — stan aplikacji + mutacje z zapisem lokalnym
- `src/screens/` — ekrany per zakładka
- `src/components/` — komponenty współdzielone między ekranami

## Ważne decyzje z SPECYFIKACJA.pdf

- **Brak `window.storage`** — to API istniało tylko w środowisku makiet; tu
  zastąpione przez IndexedDB (`src/lib/db.ts`).
- Kolor toru = `TYPE_COLOR[goal.type]`, nigdy kolor osoby — dwa oddzielne
  wymiary w `theme.ts`.
- `moved`/`skipped` mają neutralne kolory (bursztyn/szary), nie czerwone —
  przesunięcie nie jest porażką.
- Kamienie milowe liczone automatycznie (`completedSessions >= threshold`)
  nigdy nie trzymają `done` w danych — liczone na bieżąco (`milestonesFor`).
