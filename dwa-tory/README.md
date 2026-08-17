# Dwa Tory

PWA do świadomego gospodarowania czasem i realizacji celów dla dwóch osób.
Pełna specyfikacja: `../SPECYFIKACJA.pdf` (w wątku, w którym powstał ten kod).

## Stan budowy

Realizowana wg kolejności ze specyfikacji (§10), krok po kroku:

- [x] 1. Fundament — projekt PWA (manifest, service worker), `theme.ts`, routing zakładek, splash
- [x] 2. Dane lokalne — model, IndexedDB, tryb offline
- [x] 3. Dziennik — tory, odhaczanie, kaskada przesuwania
- [x] 4. Cele + kreator/edytor — pełne drzewo decyzyjne
- [ ] 5. Kalendarz
- [ ] 6. Profil — statystyki, Twoja podróż, ustawienia
- [ ] 7. Backend (poza zakresem tego wątku — realizowany osobno)
- [ ] 8. Powiadomienia (pełna logika panelu)
- [ ] 9. Onboarding + samouczek
- [ ] 10. Integracja z kalendarzem telefonu

Zakładki Kalendarz i reszta Profilu mają na razie tymczasowy stan
„wkrótce”, żeby nawigacja i header były kompletne od pierwszego kroku.

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
