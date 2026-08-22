// Krok 10 (spec §10) — "integracja z kalendarzem telefonu". Przeglądarka nie
// ma API do zapisu wprost w natywnym kalendarzu (żadna appka webowa go nie
// ma — to świadome ograniczenie bezpieczeństwa), więc jedyny realny sposób
// bez backendu to eksport zdarzenia w standardzie iCalendar (.ics), spec
// RFC 5545. Apka celuje wyłącznie w iPhone'a.
//
// Historia trzech nieudanych podejść, zapisana żeby nie próbować ich
// ponownie:
// 1. Link data: BEZ atrybutu download — działa jako "otwórz ekran Dodaj do
//    kalendarza" w zwykłej karcie Safari, ale appka dodana do ekranu
//    głównego (standalone PWA, czyli docelowy sposób używania tej apki)
//    renderuje się we własnym, bardziej ograniczonym WebView, gdzie ta sama
//    nawigacja po prostu nic nie robi.
// 2. Web Share API z plikami — arkusz udostępniania się pokazuje, ale iOS
//    nie rozpoznaje udostępnionego pliku jako zdarzenie kalendarza
//    (zweryfikowane na prawdziwym urządzeniu) — mapowanie MIME/UTI dla
//    plików .ics przez Web Share jest na iOS niespójne między wersjami.
// 3. Wymuszenie nawigacji do data: URI w Safari przez <a target="_blank">
//    doklejony do DOM — zweryfikowane na prawdziwym urządzeniu: standalone
//    PWA otwiera to w oknie typu SFSafariViewController (nie w pełnym
//    Safari.app), a w tym kontekście data: URI renderuje się jako zwykła,
//    pusta strona (widoczny tytuł karty "data:") zamiast wywołać ekran
//    "Dodaj do kalendarza". Ta specjalna obsługa .ics jest najwyraźniej
//    związana z PRAWDZIWYM żądaniem sieciowym z nagłówkiem
//    Content-Type: text/calendar, nie z URI wpisanym wprost w przeglądarce
//    — żadna odmiana data:/blob: tego nie daje, niezależnie od okna, w
//    którym się otwiera.
//
// Obecne podejście: wrzucić wygenerowany plik do publicznego bucketu
// Supabase Storage (`calendar-exports`, migracja 0007) i otworzyć jego
// prawdziwy adres https:// — to zwykły request sieciowy z poprawnym
// nagłówkiem, jak link do zdarzenia w mailu czy na stronie.

import { addDays, daysInMonth, isoWeekday, parseYmdKey, today, type Ymd } from './calendarUtils';
import { supabase } from './supabaseClient';
import type { Goal, Task } from '../types';

// Indeks 0=Pn..6=Nd — ten sam porządek co DAY_LABELS w calendarUtils.
const ICAL_WEEKDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

const pad2 = (n: number) => String(n).padStart(2, '0');
const compactYmd = (ymd: Ymd) => `${ymd.year}${pad2(ymd.month + 1)}${pad2(ymd.day)}`;

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** "18:00" → {h:18,m:0}. Pole w Kreatorze to wolny tekst (nie <input type="time">) — każdy inny format (albo pusty) daje brak, czyli zdarzenie całodniowe zamiast zgadywanej godziny. */
function parseTimeOfDay(raw: string | undefined): { h: number; m: number } | null {
  if (!raw) return null;
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h > 23 || m > 59) return null;
  return { h, m };
}

function addMinutes(h: number, m: number, delta: number): { h: number; m: number; dayDelta: number } {
  const total = h * 60 + m + delta;
  const dayDelta = Math.floor(total / 1440);
  const normalized = ((total % 1440) + 1440) % 1440;
  return { h: Math.floor(normalized / 60), m: normalized % 60, dayDelta };
}

/**
 * Pierwsze wystąpienie zgodne z RRULE. DTSTART, który sam nie pasuje do
 * wzorca (np. poniedziałek dla celu tylko w środy), część czytników iCal
 * ignoruje albo się gubi — więc dla "konkretne dni tygodnia"/"co miesiąc"
 * szukamy najbliższego pasującego dnia od dziś. "Codziennie" i "X razy w
 * tygodniu" (bez konkretnych dni) pasują trywialnie każdego dnia.
 */
function firstOccurrence(goal: Goal): Ymd {
  const t = today();
  if (goal.cadenceType === 'weekdays' && goal.cadenceWeekdays && goal.cadenceWeekdays.length > 0) {
    const todayIso = isoWeekday(t);
    const sorted = [...goal.cadenceWeekdays].sort((a, b) => a - b);
    const sameOrLater = sorted.find((w) => w >= todayIso);
    const delta = sameOrLater !== undefined ? sameOrLater - todayIso : sorted[0] + 7 - todayIso;
    return addDays(t, delta);
  }
  if (goal.cadenceType === 'monthly' && goal.cadenceMonthDay) {
    const dayThisMonth = Math.min(goal.cadenceMonthDay, daysInMonth(t.year, t.month));
    if (dayThisMonth >= t.day) return { ...t, day: dayThisMonth };
    const month = t.month === 11 ? 0 : t.month + 1;
    const year = t.month === 11 ? t.year + 1 : t.year;
    return { year, month, day: Math.min(goal.cadenceMonthDay, daysInMonth(year, month)) };
  }
  return t;
}

function rruleFor(goal: Goal): string {
  if (goal.cadenceType === 'daily') return 'RRULE:FREQ=DAILY';
  if (goal.cadenceType === 'weekdays' && goal.cadenceWeekdays?.length) {
    const days = [...goal.cadenceWeekdays].sort((a, b) => a - b).map((i) => ICAL_WEEKDAY[i]).join(',');
    return `RRULE:FREQ=WEEKLY;BYDAY=${days}`;
  }
  if (goal.cadenceType === 'monthly' && goal.cadenceMonthDay) return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${goal.cadenceMonthDay}`;
  // "X razy w tygodniu" nie wskazuje konkretnych dni (patrz weekProgressFor
  // w lib/goals.ts) — cotygodniowe przypomnienie w tym samym dniu tygodnia
  // to najbliższe rozsądne przybliżenie, dopisane wprost w opisie zdarzenia.
  return 'RRULE:FREQ=WEEKLY';
}

function utcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
}

/** Buduje treść pliku .ics (RFC 5545) dla jednego celu. */
export function buildIcsForGoal(goal: Goal): string {
  const start = firstOccurrence(goal);
  const time = parseTimeOfDay(goal.cadenceTimeOfDay);

  const descriptionParts = [
    goal.reason,
    goal.anchor ? `Kotwica: ${goal.anchor}` : null,
    goal.minimalVersion ? `Wersja minimalna: ${goal.minimalVersion}` : null,
    goal.cadenceType === 'perWeekCount' ? `${goal.cadencePerWeekCount}× w tygodniu — dowolne dni, to przypomnienie jest tylko punktem odniesienia.` : null,
  ].filter((p): p is string => !!p);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dwa Tory//PL',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${goal.id}@dwa-tory`,
    `DTSTAMP:${utcStamp(new Date())}`,
  ];

  if (time) {
    const end = addMinutes(time.h, time.m, 30);
    const endDate = end.dayDelta > 0 ? addDays(start, end.dayDelta) : start;
    lines.push(`DTSTART:${compactYmd(start)}T${pad2(time.h)}${pad2(time.m)}00`);
    lines.push(`DTEND:${compactYmd(endDate)}T${pad2(end.h)}${pad2(end.m)}00`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compactYmd(start)}`);
    lines.push(`DTEND;VALUE=DATE:${compactYmd(addDays(start, 1))}`);
  }

  lines.push(rruleFor(goal));
  lines.push(`SUMMARY:${escapeIcsText(goal.title)}`);
  if (descriptionParts.length > 0) lines.push(`DESCRIPTION:${escapeIcsText(descriptionParts.join('\n'))}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n') + '\r\n';
}

/**
 * Buduje treść pliku .ics dla "Szybkiego zadania" (spec §5.5) — jednorazowe
 * zdarzenie na konkretny dzień, bez RRULE (zadanie z natury się nie
 * powtarza, w odróżnieniu od Celu).
 */
export function buildIcsForTask(task: Task): string {
  const date = parseYmdKey(task.date);
  const time = parseTimeOfDay(task.time);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dwa Tory//PL',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${task.id}@dwa-tory`,
    `DTSTAMP:${utcStamp(new Date())}`,
  ];

  if (time) {
    const end = addMinutes(time.h, time.m, 30);
    const endDate = end.dayDelta > 0 ? addDays(date, end.dayDelta) : date;
    lines.push(`DTSTART:${compactYmd(date)}T${pad2(time.h)}${pad2(time.m)}00`);
    lines.push(`DTEND:${compactYmd(endDate)}T${pad2(end.h)}${pad2(end.m)}00`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compactYmd(date)}`);
    lines.push(`DTEND;VALUE=DATE:${compactYmd(addDays(date, 1))}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(task.title)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n') + '\r\n';
}

/** Wrzuca treść .ics do publicznego bucketu (ścieżka "{ownerId}/{id}.ics" — RLS w 0007 pilnuje, że tylko właściciel może tam pisać) i zwraca jego prawdziwy adres https://. */
async function uploadIcsAndGetUrl(content: string, ownerId: string, id: string): Promise<string> {
  const path = `${ownerId}/${id}.ics`;
  const { error } = await supabase.storage.from('calendar-exports').upload(path, new Blob([content], { type: 'text/calendar;charset=utf-8' }), {
    contentType: 'text/calendar;charset=utf-8',
    upsert: true,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('calendar-exports').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Otwiera puste okno OD RAZU, synchronicznie w geście użytkownika (Safari
 * blokuje window.open, jeśli między kliknięciem a wywołaniem jest choćby
 * jeden await), i dopiero po skończonym uploadzie (asynchronicznym)
 * przekierowuje je na prawdziwy adres pliku. Standardowa sztuczka na
 * "async, ale w oknie otwartym z gestu użytkownika" (ten sam wzorzec co przy
 * przekierowaniach do zewnętrznych płatności).
 */
function openThenNavigate(load: () => Promise<string>): void {
  const win = window.open('about:blank', '_blank');
  if (!win) return; // zablokowane przez przeglądarkę — nie ma czym to obejść
  load()
    .then((url) => {
      win.location.href = url;
    })
    .catch((e) => {
      console.error('Nie udało się przygotować zdarzenia kalendarza', e);
      win.close();
    });
}

/** Wywoływana zarówno od razu po zapisaniu celu z włączonym sync (GoalEditor), jak i z przycisku "Dodaj do Kalendarza" w podglądzie celu (GoalDetailModal). */
export function shareOrOpenIcsForGoal(goal: Goal): void {
  openThenNavigate(() => uploadIcsAndGetUrl(buildIcsForGoal(goal), goal.personId, goal.id));
}

/** Wywoływana od razu po zapisaniu "Szybkiego zadania" (GoalEditor) — zadania nie mają osobnego przycisku "Dodaj do Kalendarza" w podglądzie, bo nie mają podglądu (nie są Celem). */
export function shareOrOpenIcsForTask(task: Task): void {
  openThenNavigate(() => uploadIcsAndGetUrl(buildIcsForTask(task), task.personId, task.id));
}
