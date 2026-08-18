// Dane startowe dla pierwszego uruchomienia (brak backendu — spec §10 pomija
// krok 7). Odzwierciedlają przykład z dwa-tory-finalna.jsx, żeby Dziennik był
// od razu testowalny z realistycznym stanem (cel z kamieniami bliski
// odblokowania kolejnego etapu + zwykły nawyk bez kamieni).

import { PERSON_COLOR } from '../theme';
import type { AppNotification, AppSettings, Goal, Person } from './../types';
import { formatShortDate, addDays, today, ymdKey, type Ymd } from './calendarUtils';
import { uuid } from './id';

type HistoryStatus = 'done' | 'moved' | 'skipped';

/**
 * Historia sprzed dzisiaj (dzień 0 jest żywy w instance.curr, jeszcze nie w
 * historii) dla demo danych — żeby Kalendarz miał na czym renderować
 * prawdziwy, spójny obraz zamiast pustki przy pierwszym uruchomieniu.
 */
function seedHistory(t: Ymd, days: number, statusAt: (daysAgo: number) => HistoryStatus | undefined): Record<string, HistoryStatus> {
  const history: Record<string, HistoryStatus> = {};
  for (let daysAgo = 1; daysAgo <= days; daysAgo++) {
    const status = statusAt(daysAgo);
    if (status) history[ymdKey(addDays(t, -daysAgo))] = status;
  }
  return history;
}

export function seedPeople(): Person[] {
  return [
    { id: 'a', name: 'Grzesiek', initials: 'G', color: PERSON_COLOR.a, streak: 12, longestStreak: 19, cheers: 3 },
    { id: 'b', name: 'Wiola', initials: 'W', color: PERSON_COLOR.b, streak: 4, longestStreak: 6, cheers: 5 },
  ];
}

export function seedGoals(): Goal[] {
  const t = today();

  const marathonMilestones = [
    { offsetDays: -13, threshold: 25, label: 'Pierwsze 25 dni' },
    { offsetDays: -4, threshold: 50, label: 'Połowa — dzień 50' },
    { offsetDays: 0, threshold: 75, label: 'Dzień 75' },
    { offsetDays: 54, threshold: 100, label: 'Meta — dzień 100' },
  ].map((m) => ({ id: uuid(), label: m.label, date: formatShortDate(addDays(t, m.offsetDays)), threshold: m.threshold }));

  const marathon: Goal = {
    id: uuid(),
    personId: 'a',
    title: 'Maraton treningowy — 100 dni',
    type: 'termin',
    character: 'termin',
    reason: 'żeby mieć więcej energii na co dzień',
    start: formatShortDate(addDays(t, -75)),
    cadenceType: 'daily',
    cadenceLabel: 'codziennie',
    cadenceSlots: ['Dziś', 'Jutro'],
    targetValue: '100',
    targetUnit: 'dni',
    completedSessions: 74,
    milestones: marathonMilestones,
    instance: { curr: { status: 'plan', note: '' }, next: { status: 'plan', double: false } },
    rescheduleCount: 1,
    visibleToPartner: true,
    syncToPhoneCalendar: false,
    history: seedHistory(t, 12, (d) => (d === 6 ? 'moved' : 'done')),
  };

  const reading: Goal = {
    id: uuid(),
    personId: 'a',
    title: 'Czytanie wieczorne',
    type: 'cykliczny',
    character: 'habit',
    anchor: 'po umyciu zębów',
    start: 'dziś',
    cadenceType: 'daily',
    cadenceLabel: 'codziennie',
    cadenceSlots: ['Dziś', 'Jutro'],
    milestones: [],
    instance: { curr: { status: 'plan', note: '' }, next: { status: 'plan', double: false } },
    rescheduleCount: 0,
    visibleToPartner: true,
    syncToPhoneCalendar: false,
    history: seedHistory(t, 12, () => 'done'),
  };

  const gym: Goal = {
    id: uuid(),
    personId: 'a',
    title: 'Siłownia',
    type: 'cykliczny',
    character: 'habit',
    reason: 'żeby mieć więcej energii i lepiej spać',
    start: formatShortDate(addDays(t, -20)),
    cadenceType: 'perWeekCount',
    cadencePerWeekCount: 3,
    cadenceLabel: '3× w tygodniu',
    cadenceSlots: ['Ten tydzień', 'Przyszły tydzień'],
    milestones: [],
    instance: { curr: { status: 'plan', note: '' }, next: { status: 'plan', double: false } },
    rescheduleCount: 0,
    visibleToPartner: true,
    syncToPhoneCalendar: false,
    history: seedHistory(t, 14, (d) => ([2, 4, 7, 9, 11, 14].includes(d) ? 'done' : undefined)),
  };

  const excelCourse: Goal = {
    id: uuid(),
    personId: 'b',
    title: 'Kurs Excela',
    type: 'cykliczny',
    character: 'cyclicalContent',
    start: formatShortDate(addDays(t, -34)),
    cadenceType: 'perWeekCount',
    cadencePerWeekCount: 1,
    cadenceLabel: '1× w tygodniu',
    cadenceSlots: ['Ten tydzień', 'Przyszły tydzień'],
    milestones: [
      { id: uuid(), label: 'Moduł 1: podstawy', date: formatShortDate(addDays(t, -34)) },
      { id: uuid(), label: 'Moduł 2: tabele przestawne', date: formatShortDate(addDays(t, -14)) },
      { id: uuid(), label: 'Moduł 3: makra', date: formatShortDate(addDays(t, 3)) },
      { id: uuid(), label: 'Certyfikat końcowy', date: formatShortDate(addDays(t, 28)) },
    ],
    manualMilestoneDone: {},
    instance: { curr: { status: 'plan', note: '' }, next: { status: 'plan', double: false } },
    rescheduleCount: 2,
    visibleToPartner: true,
    syncToPhoneCalendar: false,
    history: seedHistory(t, 15, (d) => ([1, 8, 15].includes(d) ? 'done' : undefined)),
  };
  excelCourse.manualMilestoneDone = {
    [excelCourse.milestones[0].id]: true,
    [excelCourse.milestones[1].id]: true,
  };

  return [marathon, reading, gym, excelCourse];
}

/** Co partnerka zrobiła + kiedy (spec §5.8) — bez backendu statyczne, ale realne dane do odpowiedzi. */
export function seedNotifications(): AppNotification[] {
  return [
    { id: uuid(), person: 'b', text: 'ukończyła Moduł 2: tabele przestawne', time: 'wczoraj, 19:14', responded: false },
    { id: uuid(), person: 'b', text: 'zrobiła Kurs Excela 3 tygodnie z rzędu', time: '3 dni temu', responded: true, reply: 'Dumny/a z Ciebie' },
    { id: uuid(), person: 'b', text: 'przesunęła zadanie na jutro', time: '5 dni temu', responded: false },
  ];
}

export function seedSettings(): AppSettings {
  return {
    selfTimeEnabled: false,
    pushEnabled: true,
    soundEnabled: true,
    defaultCalendarView: 'mine',
    defaultCalendarPeriod: 'week',
    hasCompletedOnboarding: true,
  };
}
