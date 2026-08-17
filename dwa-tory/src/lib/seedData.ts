// Dane startowe dla pierwszego uruchomienia (brak backendu — spec §10 pomija
// krok 7). Odzwierciedlają przykład z dwa-tory-finalna.jsx, żeby Dziennik był
// od razu testowalny z realistycznym stanem (cel z kamieniami bliski
// odblokowania kolejnego etapu + zwykły nawyk bez kamieni).

import { PERSON_COLOR } from '../theme';
import type { AppSettings, Goal, Person } from './../types';
import { formatShortDate, addDays, today } from './calendarUtils';
import { uuid } from './id';

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
  };

  const reading: Goal = {
    id: uuid(),
    personId: 'a',
    title: 'Czytanie wieczorne',
    type: 'cykliczny',
    character: 'habit',
    anchor: 'po umyciu zębów',
    start: 'dziś',
    cadenceLabel: 'codziennie',
    cadenceSlots: ['Dziś', 'Jutro'],
    milestones: [],
    instance: { curr: { status: 'plan', note: '' }, next: { status: 'plan', double: false } },
    rescheduleCount: 0,
    visibleToPartner: true,
    syncToPhoneCalendar: false,
  };

  const excelCourse: Goal = {
    id: uuid(),
    personId: 'b',
    title: 'Kurs Excela',
    type: 'cykliczny',
    character: 'cyclicalContent',
    start: formatShortDate(addDays(t, -34)),
    cadenceLabel: 'co tydzień',
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
  };
  excelCourse.manualMilestoneDone = {
    [excelCourse.milestones[0].id]: true,
    [excelCourse.milestones[1].id]: true,
  };

  return [marathon, reading, excelCourse];
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
