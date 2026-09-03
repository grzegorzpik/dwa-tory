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
- [x] 8. Powiadomienia — pełna logika panelu (chipy, limit słów na odpowiedź, odpowiedziane) + prawdziwy Web Push w tle (dokończone później, patrz "Push" niżej)
- [x] 9. Onboarding + samouczek — imię/zdjęcie, status połączenia z partnerką, czas dla siebie, 4 karty funkcji, relaunch z Profilu
- [x] 10. Integracja z kalendarzem telefonu — **wycofana** po czterech nieudanych próbach, patrz "Uwaga historyczna" niżej

**Domknięta luka ze spec (§7, eksport/backup danych):** przycisk
"Eksportuj dane" w Profilu zapisuje `{person, goals, settings}` do JSON —
działa w prawdziwej appce (przeglądarka/PWA), nie w podglądzie artifact
(pobrania zablokowane przez sandbox).

**Push (dokończenie kroku 8):** przełącznik "Push" w Profilu wysyła teraz
realne powiadomienia systemowe, nawet gdy appka jest zamknięta/w tle —
patrz sekcja "Push" niżej po instrukcji uruchomienia (VAPID, Edge Function,
Database Webhook — wymaga jednorazowej ręcznej konfiguracji w Twoim
projekcie Supabase, tak jak migracje). Przełącznik "Dźwięk" obok niego
(patrz "Naprawione po audycie — dźwięk powiadomień" niżej) działa tylko
przy otwartej appce z żywym Realtime — to inny mechanizm niż Push, celowo
nie scalony w jeden.

Panel "Powiadomienia" (co partnerka zrobiła + odpowiedzi z limitem słów —
`MAX_REPLY_WORDS` w `lib/notifications.ts`, spec proponował 5, na
wyraźną prośbę użytkownika podniesiony do 20)
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

**Uwaga historyczna (wycofana integracja z kalendarzem telefonu, dawny
krok 10):** apka celowała wyłącznie w iPhone'a — cel/zadanie z włączonym
"Sync z kalendarzem telefonu" miał od razu otwierać ekran "Dodaj do
kalendarza". Cztery kolejne podejścia, każde zweryfikowane na prawdziwym
urządzeniu i każde nieudane w appce zainstalowanej na ekranie głównym
(czyli docelowym sposobie jej używania): (1) link `data:text/calendar`
bez atrybutu `download` — działał w zwykłej karcie Safari, ale standalone
PWA renderuje się we własnym, bardziej ograniczonym WebView, gdzie ta
sama nawigacja nic nie robiła; (2) Web Share API z plikami — arkusz się
pokazywał, ale iOS nie rozpoznawał udostępnionego pliku jako zdarzenie
kalendarza; (3) wymuszona nawigacja do `data:` URI przez
`<a target="_blank">` — standalone PWA otwierało to w oknie typu
SFSafariViewController, gdzie `data:` URI renderował się jako pusta
strona; (4) prawdziwy plik serwowany z publicznego bucketu Supabase
Storage pod adresem `https://` (poprawny nagłówek `Content-Type:
text/calendar`, dokładnie jak link do zdarzenia w mailu) — to jedyne
podejście, które faktycznie DZIAŁAŁO w zwykłej karcie Safari, ale
zainstalowana appka nadal otwierała je w tym samym ograniczonym oknie
bez specjalnej obsługi .ics, więc efekt końcowy był identyczny: pusty
ekran. Wniosek: to nie był problem z generowaniem czy serwowaniem pliku
— to twarde ograniczenie iOS, które nie ma obejścia po stronie appki.
Do tego samo wymuszanie okienka przy każdym zapisie celu/zadania z
włączonym sync było uciążliwe UX-owo, niezależnie od tego czy akurat
zadziałało. Decyzja: cała funkcja wycofana (migracja
`0008_remove_calendar_sync.sql` kasuje bucket Storage z próby 4 i
kolumnę `sync_to_phone_calendar`) zamiast dalej próbować obejść
ograniczenie platformy, którego obejść się nie da.

**Uwaga architektoniczna (Kalendarz):** apka wciąż nie ma silnika
"przełączania dnia" — Dziennik działa na jednym żywym "dziś" bez
automatycznego zaawansowania o północy (pre-existing, nie wprowadzone przy
tym kroku). Żeby Kalendarz mimo to renderował prawdziwe, a nie zmyślone
dane (jak makieta z seedowanym RNG), każdy cel dostał `history` —
zapisywaną w momencie akcji mapę dzień→wynik. To wystarcza do dziś i
wstecz; pełne, automatyczne przełączanie dnia zostawione jako świadomie
odłożone follow-up.

Dzień z zadaniem, ale bez żadnego statusu celu, dostawał płaskie szare
tło (`colorForStatus` zwraca `C.surface2` dla "brak danych") — samo złote
obramowanie (`hasNotableEntry`) nie czytało się jako "wyróżnienie
kolorem" w widoku miesiąca (zgłoszenie UX). W widoku Mój/Wiola taki dzień
dostaje teraz przydymione złote tło zamiast szarego; w widoku Wspólny
zostaje bez zmian (gradient dwóch osób już jest wystarczająco czytelny,
dodatkowy kolor tylko za zadanie by go zaszumił). Ta sama poprawka
dotyczyła tylko widoku miesiąca — pionowy pasek statusu w widoku
tygodnia (`DayBar`, domyślny widok appki: `defaultCalendarPeriod:
'week'`) nadal był napędzany wyłącznie historią celu, więc dzień z samym
zadaniem miał płaski szary pasek bez żadnego koloru (kolejne zgłoszenie
UX — łatwo przeoczone, bo widok tygodnia to domyślny ekran, a poprzednia
poprawka dotyczyła tylko widoku miesiąca). `hasTask` podmienia teraz i
tam szary pasek na przydymiony gold, tym samym warunkiem co w
`MonthView`.

Efekt uboczny obu tych poprawek: kolor zadania (gold) zaczął się mylić z
oznaczeniem "dziś" (zgłoszenie UX) — w `MonthView` obramowanie komórki
było jednym polem dzielonym między dwa sygnały, gdzie `hasNotableEntry`
(gold) miało pierwszeństwo przed `isToday` (`C.text`), więc dzisiejszy
dzień Z ZADANIEM wyglądał identycznie jak zwykły dzień z zadaniem — bez
żadnego śladu, że to akurat dziś. Naprawione rozdzieleniem sygnałów na
dwa niezależne elementy: obramowanie komórki oznacza WYŁĄCZNIE "dziś"
(nie nadpisywane już przez zawartość), a mała złota kropka pod cyfrą
oznacza WYŁĄCZNIE "jest tu coś" — oba widoczne naraz, bez konfliktu. W
`WeekView` wiersz "dziś" dostał dodatkowo delikatne tło (`${C.text}14`,
celowo NIE złote, żeby nie kolidowało z paskiem zadania) — sama cienka
ramka nie była wystarczająco odróżnialna od złotego paska zadania.

**Uwaga architektoniczna (klawiatura na iOS):** dotknięcie dowolnego pola
tekstowego w Safari na iOS powodowało widoczne "przybliżenie" ekranu
(zgłoszenie UX) — to twardy próg silnika przeglądarki: Safari sam zooms
in, gdy font-size fokusowanego pola jest mniejsze niż 16px, a appka
używała wszędzie 12-14px (gęsty układ, spec §7). Naprawione globalną
regułą w `index.css` (`input, textarea, select { font-size: 16px
!important }`) — jedyny udokumentowany sposób, żeby to zablokować bez
wyłączania pinch-zoom użytkownikowi (`user-scalable=no` w viewport też by
to załatwiło, ale psuje dostępność dla osób słabowidzących — nie
tknięte).

**Uwaga architektoniczna (Szybkie zadanie):** w Kreatorze obok "Nawyk /
Cel z terminem / Treść cykliczna" jest czwarta opcja — "Szybkie zadanie".
Wcześniej ten branch kodu w `submit()` (`GoalEditor.tsx`) świadomie NIE
zapisywał zadania jako `Goal` (brak kadencji/kamieni do liczenia — nie
pasuje do modelu celu), z zamiarem podpięcia eksportu do kalendarza —
ale nigdy nie wróciliśmy do tego przy budowie kroku 10, więc zadanie po
prostu znikało po zapisaniu. Naprawione dodaniem osobnego, równoległego
modelu `Task` (`src/lib/tasksSync.ts`, tabela `tasks`, `0005_tasks.sql`),
zapisywanego lokalnie (`db.ts`) i do Supabase jak cele. Zadanie jest
widoczne w dwóch miejscach: (1) sekcja "Zadania na dziś" w Dzienniku
(tylko gdy są zadania na dziś); (2) Kalendarz — znacznik dnia, sekcja
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
- Dziennik: nagłówek karty celów pokazywał tylko avatar użytkownika i
  serię (bez podpisu, więc "co to za karta" nie było oczywiste), a karta
  zadań nazywała się "Zadania na dziś" mimo że pokazuje wyłącznie
  dzisiejsze zadania — redundantne. Dodany tytuł ekranu "Plan na dziś"
  pod nagłówkiem appki, avatar w karcie celów zastąpiony podpisem
  "Cele" (avatar i tak jest dostępny w stałym nagłówku appki — nie znikł
  z appki, tylko z tej jednej karty), karta zadań skrócona do "Zadania".

**Pełny audyt UI/UX wszystkich ekranów (na prośbę użytkownika):**
przegląd każdego ekranu i komponentu pod kątem spójności, celów
dotykowych i dostępności. Naprawione:
- `Cele.tsx`: karta celu była zwykłym `<div onClick>`, nie `<button>` —
  jedyne klikalne "kafelki" w całej appce bez semantyki przycisku (bez
  focusa z klawiatury, bez aktywacji Enter/Space). Zmienione na
  `<button>`, spójnie z resztą appki (`GoalListRow`, `TaskRow` i inne).
- `ToggleSwitch.tsx`: wizualny tor 36×22px był też całym obszarem
  dotyku — używany wszędzie (Kreator, Profil), a mniejszy niż
  jakikolwiek inny element dotykowy w appce. Podniesiony do ~44px przez
  niewidoczny padding (ten sam trick co przy przyciskach zadania).
- Kalendarz: przełącznik Tydzień/Miesiąc miał `minHeight: 28`, mimo że
  przełącznik Mój/Wiola/Wspólny tuż nad nim ma 44 — ten sam rodzaj
  kontrolki, różny cel dotykowy. Ujednolicone do 44.
- `NotificationsPanel.tsx`: uchwyt do zamykania panelu przeciągnięciem
  był wizualnie i dotykowo tym samym paskiem 40×4px — trudno trafić
  palcem w gest. Obszar łapiący dotyk powiększony przez padding, sam
  widoczny pasek bez zmian.
- Profil: "Wyloguj" był schowany wewnątrz rozwijanej pozycji "Konto i
  połączenie z partnerem" — trzeba było zgadnąć, że wylogowanie jest
  tam, a nie np. w "O aplikacji". Wyciągnięty jako osobny, zawsze
  widoczny przycisk na dole ekranu (obok "Eksportuj dane").
- Onboarding: "Pomiń samouczek" istniało tylko na ekranie
  wprowadzającym przed 4 kartami — raz w środku kart nie dało się już
  pominąć reszty. Dodany "Pomiń resztę samouczka" widoczny podczas
  każdej z 4 kart.

**Naprawione po audycie (na wyraźną prośbę użytkownika — opcja "dorobić
realną funkcję"):** "Czas dla siebie" w Dzienniku (chipy 1h/2h/Wieczór)
był czystym lokalnym stanem komponentu — nigdzie nie zapisywany, nie
wysyłany do partnerki, znikał po odświeżeniu strony, mimo że tekst w
Onboardingu wprost obiecuje *"Możecie dawać sobie znać, gdy któreś z
Was bierze chwilę tylko dla siebie... tylko krótki sygnał"*. Naprawione
nową akcją `sendSelfTimeSignal()` w `AppDataContext` — wysyła DOKŁADNIE
ten sam rodzaj powiadomienia co kamień milowy/przesunięcie
(`pushNotification`, ten sam Realtime + panel Powiadomień), tylko przy
ROZPOCZĘCIU (kliknięcie 1h/2h/Wieczór), nie przy "zakończ" — spec mówi o
jednorazowym sygnale, nie o żywym wskaźniku "trwa do X", więc świadomie
bez trwałego statusu do synchronizowania między urządzeniami (to by
wymagało dużo więcej niż "krótki sygnał": zapisu w bazie, obsługi
wygaśnięcia, itd. — poza tym, co spec faktycznie opisuje).

**Naprawione po audycie — dźwięk powiadomień ("Zrób tylko dźwięk teraz"):**
przełącznik "Dźwięk" w Profil → Powiadomienia zapisywał tylko preferencję
(`settings.soundEnabled`), bez żadnego realnego efektu — tak samo jak
"Push" opisane wyżej. Naprawione: `src/lib/sound.ts` generuje na żywo
krótki dwutonowy "ding" (Web Audio, żaden plik do pobrania), a
`refreshNotifications` w `AppDataContext` woła go, gdy Realtime dostarczy
NOWE powiadomienie partnerki (porównanie ID względem poprzedniego stanu w
`useRef`, żeby nie zagrać przy pierwszym załadowaniu całej historii) i
`soundEnabled` jest włączony. Ma twarde ograniczenie, którego nie da się
obejść bez prawdziwego backendu push: gra WYŁĄCZNIE gdy appka jest otwarta
i ma żywe połączenie Realtime — w tle/offline/zamknięta appka o niczym nie
wie, więc dźwięku nie usłyszysz. To dokładnie ta sama granica, co przy
"Push" — realne powiadomienia w tle wymagają VAPID + service workera +
serwerowego triggera (nie zbudowane, poza zakresem tej poprawki: użytkownik
świadomie wybrał "tylko dźwięk teraz", zostawiając Push jako preferencję).

**Naprawione — sekcja "Opóźnione" w Dzienniku (na wyraźną prośbę
użytkownika, "niech wiszą jak wyrzut sumienia"):** dwie kategorie rzeczy,
które appka dotąd po cichu gubiła zamiast czekać na decyzję:

1. **Zadania** ("Szybkie zadania") z datą w przeszłości, nigdy nie
   odhaczone. `Dziennik` pokazywał tylko `tasks.filter(t => t.date ===
   dziś)` — zadanie, którego dzień minął bez odhaczenia, po prostu znikało
   z appki na dobre (widoczne dalej tylko w Kalendarzu, w widoku
   historycznego dnia). Teraz `overdueTasks` (data < dziś, `!done`)
   trafiają do nowej sekcji na samej górze Dziennika, nad kartą "Cele" —
   pierwsze, co widać po otwarciu appki.
2. **Cele przesuwane zbyt wiele razy** — ostrzeżenie `{count}× przesunięte
   — sprawdź tempo` istniało już wcześniej (`RESCHEDULE_WARNING_THRESHOLD`
   w `lib/goals.ts`), ale tylko jako notka na karcie w zakładce Cele — łatwo
   przeoczyć, bo Dziennik (ekran domyślny) jej w ogóle nie pokazywał. Ten
   sam próg teraz dodatkowo trafia do sekcji "Opóźnione".

Sekcja renderuje się tylko, gdy faktycznie jest co pokazać (żadnej pustej
karty "brawo, nic zaległego") i używa `C.over` (jedyny czerwonawy kolor w
palecie — dotąd tylko komunikaty błędów) zamiast złota, żeby wizualnie
odróżnić "to naprawdę zaległe" od zwykłych podpowiedzi. Kliknięcie
zaległego zadania otwiera ten sam Edytor co zwykle (można tam zmienić datę
na dziś, jak każde inne zadanie) — nie ma osobnego przycisku "przenieś na
dziś", bo Edytor już to umie.

**Naprawione — dane partnerki potrafiły utknąć w nieaktualnym stanie
("udostępnione zadanie niewidoczne u partnerki"):** zgłoszenie, że zadanie
zapisane z włączonym "Widoczne dla partnerki" nie pokazywało się wcale na
koncie partnerki. Kod zapisu i RLS (`0006_tasks_partner_visibility.sql`,
`current_partner_id()`) są poprawne i identyczne z celami, które działają —
podejrzenie pada więc na iOS: zabackgroundowana PWA potrafi po cichu zerwać
połączenie Realtime, appka o tym nie wie i dane partnerki (cele, zadania,
powiadomienia) zostają nieaktualne aż appka dostanie kolejne zdarzenie na
tym samym kanale — co może nigdy nie nastąpić, jeśli to właśnie ten kanał
ucichł. Appka nigdzie nie miała obsługi "wróciłem na pierwszy plan, odśwież
się". Naprawione: nowy `useEffect` w `AppDataContext` nasłuchuje
`visibilitychange`/`focus` i przy każdym powrocie appki na pierwszy plan
robi pełny re-pull celów, zadań i powiadomień partnerki — niezależnie od
tego, czy sam socket Realtime się naprawił. **Uwaga:** to nie była
faktyczna przyczyna zgłoszenia — patrz niżej "Naprawione — widoczność
zadań dla partnerki nie działała wcale" — ale zostaje jako osobne,
prawdziwe wzmocnienie odporności appki.

**Naprawione — widoczność zadań dla partnerki nie działała wcale (w obie
strony), bo tabela `tasks` w ogóle nie istniała:** powyższa poprawka
(odświeżanie po powrocie na pierwszy plan) nie pomogła — zgłoszenie
wróciło w drugą stronę (zadanie Wioli niewidoczne u mnie). Pierwsza
diagnoza (przez `pg_policies`) sugerowała brakującą migrację `0006` —
głębsza diagnoza (`information_schema.tables`) pokazała, że w tym
projekcie NIGDY nie zaaplikowano nawet `0005_tasks.sql`:
`relation "public.tasks" does not exist`. Własne zadania mimo to
"działały", bo appka pokazuje lokalny cache (IndexedDB) niezależnie od
tego, czy Supabase faktycznie potwierdza zapis/odczyt (błąd zapisu tylko
cicho logowany do konsoli) — stąd błąd był niewidoczny, dopóki ktoś nie
spróbował udostępnić zadania DRUGIEJ osobie. Ta sama diagnoza wykazała
DRUGĄ, niezależną dziurę: tabela `notifications` istniała, ale nigdy nie
została dodana do publikacji `supabase_realtime` (`0004_realtime.sql`
objęła tylko goals/instances/milestones) — więc panel Powiadomień i
dźwięk powiadomienia (`src/lib/sound.ts`) nigdy nie działały "na żywo"
między dwoma otwartymi appkami, tylko przy starcie appki/powrocie z tła.
Naprawa: `0010_fix_tasks_partner_visibility.sql` tworzy `tasks` od zera
(0005+0006 połączone w finalny stan) i dopina obie tabele do Realtime —
w pełni idempotentna, bezpieczna do ponownego uruchomienia. **Zadania
utworzone przed tą naprawą istnieją tylko lokalnie na danym telefonie i
się nie doślą same** — trzeba je raz "tknąć" (edycja i zapis, albo
odhaczenie i cofnięcie), żeby faktycznie trafiły do Supabase.

Rozważałem automatyczne dopychanie takich "osieroconych" lokalnych
rekordów przy każdym starcie appki (`reconcileOwnGoals`/`reconcileOwnTasks`
w `AppDataContext` już scalają lokalne z Supabase, ale gałąź "lokalne
istnieje, zdalne nie" po prostu zachowuje lokalne bez odsyłania) —
świadomie tego NIE zrobiłem: appka nie potrafi odróżnić "nigdy nie
zdążyło się zsynchronizować" od "usunięte na innym urządzeniu, ale wciąż
w lokalnym cache tego telefonu" — oba wyglądają identycznie (lokalne
istnieje, zdalne nie). Automatyczne dosyłanie wskrzeszałoby usunięte
rzeczy. Ręczne "tknięcie" nielicznych zadań sprzed tej jednorazowej awarii
jest bezpieczniejsze niż generyczna reguła, która mogłaby cicho cofać
usunięcia w normalnej pracy appki.

**Naprawione — zrealizowane zadania znikały ze zbiorczego widoku
Kalendarza:** lista "Zadania" w Kalendarzu (`upcomingTasks`) zawsze
filtrowała `!done` — zadanie po odhaczeniu po prostu znikało z tego
widoku, zostając widoczne tylko w podglądzie konkretnego dnia (kliknięcie
dnia w siatce). Kamienie milowe od dawna mają dwie symetryczne listy ("Do
zrobienia" / "Zrealizowane"), zadania — tylko jedną. Dodana analogiczna
sekcja "Zrealizowane zadania" (ten sam mechanizm co przy kamieniach:
limit 5 + "Pokaż więcej", posortowane od najnowszych), a `TaskListRow`
dostał to samo przygaszenie/przekreślenie i ✓ zamiast strzałki co
`MilestoneRow` dla zrobionych wpisów.

**Dodane — powiadomienie przy odhaczeniu udostępnionego zadania:**
zgłoszenie "Wiola realizuje zadania, ale żadne powiadomienia nie
przychodzą" — to nie był bug, appka od początku wysyłała powiadomienia
tylko przy kamieniu milowym i przesunięciu (spec §5.8, żeby nie
zaspamować drugiej strony zwykłym odhaczaniem). Na wyraźną prośbę
użytkownika dodane: `toggleTaskDone` w `AppDataContext` wysyła teraz ten
sam jednorazowy sygnał (`pushNotification`) przy ODHACZENIU (nie
cofnięciu) zadania z włączonym "Widoczne dla partnerki" — dokładnie ten
sam mechanizm co przy kamieniu milowym, zwykłe prywatne zadania nadal
milczą.

**Naprawione — odpowiedź na powiadomienie nigdy nie docierała do autora
osiągnięcia:** zgłoszenie "skomentowałem zrealizowany cel, Wiola mówi że
nic nie dostała". To nie był problem z wysyłką — `replyToNotification`
zapisuje odpowiedź na TYM SAMYM wierszu `notifications`, który opisuje
oryginalne zdarzenie (`actor_id` = osoba, która coś osiągnęła). RLS na to
pozwala (odpowiada tylko odbiorca, `notifications_update_reply_by_recipient`),
więc zapis w bazie się udawał. Problem był w `refreshNotifications`
(`AppDataContext`): filtr `actorId !== userId`, który chowa "moje własne
wpisy" przed panelem partnerki (słusznie — nikt nie chce dostawać
powiadomienia o WŁASNYM kamieniu milowym), wycinał też odpowiedź
partnerki, bo siedzi na tym samym wierszu, który dla AUTORA jest "moim
własnym wpisem" — więc autor nigdy jej nie widział, mimo że dotarła.
Naprawione: filtr teraz robi wyjątek dla własnego wpisu, który ma już
`reply` — `NotificationsPanel` renderuje taki wiersz jako "Ty {opis
zdarzenia}" + reakcja partnerki poniżej, bez pola do odpowiedzi (to nie
jest zdarzenie do skomentowania, tylko już otrzymana reakcja). Dane były
cały czas w bazie — wystarczy odświeżyć appkę po tej poprawce, żeby
istniejąca odpowiedź się pojawiła, bez potrzeby ręcznego SQL-a.

**Znalezione, niska priorytetowość, bez zmian:** `SelectChip` (chipy
wyboru kadencji/dni w Kreatorze, widoków w Kalendarzu) ma mniejszy niż
44px obszar dotyku — świadomie nie ruszone w tym audycie, bo te chipy
zawsze występują w gęstych rzędach po kilka naraz i podniesienie każdego
do 44px zepsułoby układ (nachodzenie/zawijanie) bardziej, niż rozwiązało
— to wymagałoby przeprojektowania układu, nie tylko rozmiaru pojedynczej
kontrolki.

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
   `0007_calendar_exports_bucket.sql` →
   `0008_remove_calendar_sync.sql` → `0009_push_subscriptions.sql` →
   `0010_fix_tasks_partner_visibility.sql`, w tej kolejności. `0007` zakłada
   bucket Storage `calendar-exports`, `0008` go od razu kasuje wraz z
   kolumną `sync_to_phone_calendar` — wycofana integracja z kalendarzem
   telefonu, patrz "Uwaga historyczna" wyżej. `0009` zakłada
   `push_subscriptions` — patrz sekcja "Push" niżej, dodatkowa konfiguracja
   poza samą migracją. `0010` naprawia widoczność zadań dla partnerki, patrz
   "Naprawione — widoczność zadań dla partnerki nie działała wcale" niżej —
   **jeśli zakładasz projekt od zera, `0010` i tak nie zaszkodzi** (jest w
   pełni idempotentna), ale prawdziwa przyczyna to prawdopodobnie
   pojedynczy pominięty krok przy pierwszym uruchamianiu migracji, nie błąd
   w treści `0006`. Migracje trzymają się w kolejności, w jakiej faktycznie
   powstawały, zamiast przepisywać już zaaplikowane pliki.
3. Skopiuj `.env.local.example` do `.env.local` i wklej `Project URL` oraz
   `anon public` key ze Settings → API swojego projektu Supabase. Klucz
   `VITE_VAPID_PUBLIC_KEY` (Push) jest opcjonalny — bez niego appka działa
   normalnie, przełącznik "Push" w Profilu jest po prostu wyszarzony jako
   niewspierany, patrz sekcja "Push".

```bash
npm install
npm run dev       # serwer deweloperski
npm run build     # build produkcyjny (tsc + vite build), generuje service worker
npm run preview   # podgląd builda produkcyjnego (tu realnie testować tryb offline/instalowalność)
```

**Wdrożenie:** `../.github/workflows/deploy.yml` (w korzeniu repo, jeden
poziom nad tym katalogiem — nie mylić z nieistniejącym
`dwa-tory/.github/`) builduje i publikuje na GitHub Pages przy każdym
pushu do `main`. Wymaga zmiennych jako **sekretów repo** (Settings →
Secrets and variables → Actions): `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` — klucz `anon` jest publiczny z założenia
(bezpieczny w buncie frontendu), rzeczywiste bezpieczeństwo danych daje RLS
w bazie (`0002_rls_policies.sql`), nie ukrycie klucza — oraz
`VITE_VAPID_PUBLIC_KEY` (Push, patrz sekcja niżej).

## Push (dokończenie kroku 8 — prawdziwe powiadomienia w tle)

Przełącznik "Push" w Profilu → Powiadomienia subskrybuje przeglądarkę do
Web Push i zapisuje subskrypcję w tabeli `push_subscriptions`
(`0009_push_subscriptions.sql`). Wysyłką zajmuje się Edge Function
`supabase/functions/send-push`, wywoływana Database Webhookiem za każdym
razem, gdy coś wpada do `notifications` (czyli dokładnie te same dwa
zdarzenia co dziś: kamień milowy i przesunięcie zadania/celu — patrz wyżej).
Wymaga to jednorazowej konfiguracji poza samym kodem appki:

1. **Wygeneruj parę kluczy VAPID** (raz, dla Twojego projektu):
   ```bash
   npx web-push generate-vapid-keys
   ```
   Klucz **publiczny** wklej do `.env.local` jako `VITE_VAPID_PUBLIC_KEY`
   (i jako sekret budowania w miejscu, gdzie budujesz appkę produkcyjnie).
   Klucz **prywatny** nigdy nie trafia do repo ani do frontendu — tylko do
   sekretów Edge Function (krok 3).
2. **Zainstaluj Supabase CLI** (jeśli jeszcze nie masz) i zaloguj się:
   `npx supabase login`, potem `npx supabase link --project-ref <twoj-ref>`
   (ref widoczny w Settings → General panelu Supabase).
3. **Wdróż funkcję i ustaw jej sekrety:**
   ```bash
   npx supabase functions deploy send-push
   npx supabase secrets set VAPID_PUBLIC_KEY=<klucz publiczny>
   npx supabase secrets set VAPID_PRIVATE_KEY=<klucz prywatny>
   npx supabase secrets set VAPID_SUBJECT=mailto:twoj@email.com
   ```
   `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` nie trzeba ustawiać —
   każda Edge Function dostaje je automatycznie od runtime'u.
4. **Podepnij Database Webhook** (Dashboard → Database → Webhooks → Create
   a new hook): tabela `notifications`, zdarzenie `INSERT`, typ "Supabase
   Edge Functions", wskaż funkcję `send-push`. Celowo przez UI Dashboardu,
   nie przez SQL w migracji — inaczej URL/autoryzacja konkretnego projektu
   musiałyby trafić do repo.
5. Odpal migrację `0009_push_subscriptions.sql` (jak każdą inną, patrz
   wyżej). Do produkcji klucz publiczny trafia jako sekret repo
   `VITE_VAPID_PUBLIC_KEY` (Settings → Secrets and variables → Actions) —
   `../.github/workflows/deploy.yml` już go czyta i builduje/publikuje
   automatycznie przy pushu do `main`, nic więcej nie trzeba budować ręcznie.
   Do lokalnego dev dodaj go też do `.env.local`.

**Ograniczenie platformy (iPhone, bez obejścia — ta sama kategoria co
wycofana integracja z kalendarzem):** Web Push na iOS działa WYŁĄCZNIE w
appce dodanej do ekranu głównego (standalone), od iOS 16.4. W zwykłej
karcie Safari `'PushManager' in window` jest `false` — Profil wykrywa to
przez `isPushSupported()` (`src/lib/push.ts`) i po prostu wyszarza
przełącznik z wyjaśnieniem, zamiast pokazywać coś, co wygląda na działające,
a nic nie robi. Nawet w appce zainstalowanej system (iOS/Android) może
oszczędnościowo ograniczyć dostarczanie w tle — to poza kontrolą appki,
stąd notka pod przełącznikami "Push i dźwięk działają tylko wtedy, gdy
przeglądarka/appka pozwoli je dostarczyć w tle".

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
- `src/lib/db.ts` — warstwa IndexedDB (lokalny cache/offline — Supabase jest źródłem prawdy, krok 7)
- `src/lib/supabaseClient.ts` — jedyne miejsce importujące `@supabase/supabase-js`
- `src/lib/pairing.ts` — generowanie/wymiana kodu parowania kont
- `src/lib/goalsSync.ts` — sync celów z Supabase (local-first + Realtime)
- `src/lib/tasksSync.ts` — sync "Szybkich zadań" z Supabase (local-first + Realtime dla widoku partnerki, jak cele)
- `src/lib/sound.ts` — syntezowany dźwięk powiadomienia (Web Audio, tylko przy otwartej appce)
- `src/lib/push.ts` — subskrypcja/rezygnacja z Web Push (prawdziwe powiadomienia w tle)
- `src/sw.ts` — własny service worker (injectManifest) — precache + obsługa zdarzeń `push`/`notificationclick`
- `src/store/AuthContext.tsx` — sesja Supabase Auth (magic link/hasło)
- `supabase/migrations/` — schemat bazy + RLS + parowanie + Realtime, w kolejności aplikowania
- `supabase/functions/send-push/` — Edge Function wysyłająca Web Push (wyzwalana Database Webhookiem)
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
