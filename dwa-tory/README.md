# Dwa Tory

PWA do świadomego gospodarowania czasem i realizacji celów dla dwóch osób.
Pełna specyfikacja: `../SPECYFIKACJA.pdf` (w wątku, w którym powstał ten kod).

## Stan budowy

Realizowana wg kolejności ze specyfikacji (§10), krok po kroku:

- [x] 1. Fundament — projekt PWA (manifest, service worker), `theme.ts`, routing zakładek, splash
- [x] 2. Dane lokalne — model, IndexedDB, tryb offline
- [x] 3. Dziennik — tory, odhaczanie, kaskada przesuwania
- [x] 4. Cele + kreator/edytor — pełne drzewo decyzyjne
- [x] 5. Kalendarz — Mój/Wiola/Wspólny, Tydzień/Miesiąc, Wspólna seria
- [x] 6. Profil — statystyki, Twoja podróż, ustawienia, eksport danych
- [ ] 7. Backend (poza zakresem tego wątku — realizowany osobno)
- [x] 8. Powiadomienia — pełna logika panelu (chipy, limit 5 słów, odpowiedziane)
- [x] 9. Onboarding + samouczek — imię/zdjęcie, status połączenia z partnerką, czas dla siebie, 4 karty funkcji, relaunch z Profilu
- [ ] 10. Integracja z kalendarzem telefonu

**Domknięta luka ze spec (§7, eksport/backup danych):** przycisk
"Eksportuj dane" w Profilu zapisuje `{person, goals, settings}` do JSON —
działa w prawdziwej appce (przeglądarka/PWA), nie w podglądzie artifact
(pobrania zablokowane przez sandbox).

**Sekcje wymagające backendu:** "Konto i połączenie z partnerem" (status
z lokalnych danych, rozłączanie/parowanie nieaktywne) i mechanizm push w
"Powiadomienia" (zapisujemy tylko preferencję) — jasno oznaczone w UI,
nie udają, że działają. Sama lista powiadomień (co partnerka zrobiła +
odpowiedzi z limitem 5 słów) jest w pełni funkcjonalna na statycznych
danych demo — dwukierunkowa wymiana z prawdziwą Wiolą czeka na backend.

**Uwaga architektoniczna (Onboarding):** dane demo (seed) startują z
`hasCompletedOnboarding: true`, żeby zakładka Dziennik/Cele/Kalendarz/Profil
były od razu testowalne bez przechodzenia przez onboarding za każdym razem —
to świadoma decyzja, nie przeoczenie. Sam ekran onboardingu jest w pełni
zaimplementowany (`src/screens/Onboarding.tsx`) i wystarczy przełączyć ten
jeden flag w danych, żeby zobaczyć go od pierwszego uruchomienia. Krok
"Połącz się z partnerką" pokazuje status z lokalnych danych (partnerka jest
już sparowana w demo) zamiast udawać działające generowanie kodu zaproszenia
— realne parowanie kont wymaga backendu (krok 7), zgodnie z tym samym
podejściem co w Profilu. Samouczek (4 karty funkcji) można też uruchomić
ponownie w dowolnym momencie z Profilu → Ustawienia.

**Uwaga architektoniczna (Kalendarz):** apka wciąż nie ma silnika
"przełączania dnia" — Dziennik działa na jednym żywym "dziś" bez
automatycznego zaawansowania o północy (pre-existing, nie wprowadzone przy
tym kroku). Żeby Kalendarz mimo to renderował prawdziwe, a nie zmyślone
dane (jak makieta z seedowanym RNG), każdy cel dostał `history` —
zapisywaną w momencie akcji mapę dzień→wynik. To wystarcza do dziś i
wstecz; pełne, automatyczne przełączanie dnia zostawione jako świadomie
odłożone follow-up.

## Uruchomienie

```bash
npm install
npm run dev       # serwer deweloperski
npm run build     # build produkcyjny (tsc + vite build), generuje service worker
npm run preview   # podgląd builda produkcyjnego (tu realnie testować tryb offline/instalowalność)
```

## Struktura

- `src/theme.ts` — jedyne źródło prawdy dla kolorów/typografii/animacji (spec §7)
- `src/lib/calendarUtils.ts` — daty/kalendarz, wspólne dla wszystkich ekranów
- `src/lib/goals.ts` — czysta logika instancji dnia (kamienie, kaskada przesuwania)
- `src/lib/goalForm.ts` — czysta logika Kreatora/Edytora celu (kadencja, progi kamieni, walidacja kroków)
- `src/lib/kalendarz.ts` — agregacje dla Kalendarza (stan dnia, Wspólna seria, egzekwowanie widoczności dla partnerki)
- `src/lib/photo.ts` — kadrowanie zdjęcia profilowego przez `<canvas>`
- `src/lib/exportData.ts` — eksport danych użytkownika do JSON
- `src/lib/notifications.ts` — limit słów i walidacja odpowiedzi na powiadomienie
- `src/lib/db.ts` — warstwa IndexedDB (realny zamiennik `window.storage` z makiet)
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
