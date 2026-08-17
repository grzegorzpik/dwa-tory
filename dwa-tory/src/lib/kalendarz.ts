// Agregacje dla Kalendarza (spec §5.6) — łączenie celów wielu osób, bez
// wycieku danych niewidocznych dla partnerki.

import { addDays, parseShortDate, ymdKey, type Ymd } from './calendarUtils';
import { milestonesFor } from './goals';
import { TYPE_COLOR } from '../theme';
import type { Goal, Person } from '../types';

/**
 * Egzekwuje visibleToPartner (spec §7, "Luka do domknięcia: widoczność
 * celu dla partnerki"). W makiecie pole istniało tylko w formularzu i
 * nigdzie nie filtrowało danych — Kalendarz "Wspólny"/partnerki widział
 * wszystko bez wyjątku. Tu: cudze cele przechodzą przez ten filtr zawsze,
 * własne nigdy nie są filtrowane (widzisz swoje w całości).
 */
export function visibleGoals(goals: Goal[], isOwn: boolean): Goal[] {
  return isOwn ? goals : goals.filter((g) => g.visibleToPartner);
}

export type DayStatus = 'full' | 'partial' | 'none';

/** Zagregowany stan dnia dla zbioru celów — napędza kolor komórki w Kalendarzu. */
export function dayStatusFor(goals: Goal[], dateKey: string): DayStatus {
  const statuses = goals.map((g) => g.history?.[dateKey]).filter((s): s is 'done' | 'moved' | 'skipped' => !!s);
  if (statuses.length === 0) return 'none';
  if (statuses.every((s) => s === 'done')) return 'full';
  if (statuses.some((s) => s === 'done')) return 'partial';
  return 'none';
}

/**
 * "Wspólna seria" — dni pod rząd wstecz od dziś, w których OBOJE mieliście
 * pełny dzień. Nie da się zdobyć w pojedynkę (spec §5.6). Partnerki cele
 * przechodzą przez visibleGoals PRZED wywołaniem — funkcja o tym nie wie.
 *
 * Dzisiejszy dzień liczy się tylko, jeśli jest już w pełni zrobiony —
 * inaczej seria pokazywałaby 0 przez cały dzień, dopóki nie odhaczysz
 * ostatniej rzeczy, co zerowałoby wczorajszy, uczciwie zbudowany łańcuch.
 * Nietknięty/niedokończony dzisiejszy dzień nie kasuje tego, co było wcześniej.
 */
export function mutualStreakDays(myGoals: Goal[], partnerGoals: Goal[], from: Ymd, maxDays = 365): number {
  const todayKey = ymdKey(from);
  const todayFull = dayStatusFor(myGoals, todayKey) === 'full' && dayStatusFor(partnerGoals, todayKey) === 'full';
  let streak = 0;
  for (let i = todayFull ? 0 : 1; i < maxDays; i++) {
    const day = ymdKey(addDays(from, -i));
    if (dayStatusFor(myGoals, day) === 'full' && dayStatusFor(partnerGoals, day) === 'full') streak++;
    else break;
  }
  return streak;
}

export interface CalendarMilestone {
  id: string;
  label: string;
  date: string;
  done: boolean;
  goalTitle: string;
  trackColor: string;
  personId: string;
}

/** Klucz kalendarzowy kamienia ("12 sie" + rok odniesienia → "YYYY-MM-DD") do umieszczenia na siatce. */
export function milestoneDateKey(m: CalendarMilestone, referenceYear: number): string | null {
  const parsed = parseShortDate(m.date, referenceYear);
  return parsed ? ymdKey(parsed) : null;
}

/**
 * Kamienie widocznych celów kilku osób naraz, z dopiętym kolorem toru i
 * właścicielem — do list "Do zrobienia"/"Zrealizowane" i znaczników na
 * siatce (spec §5.6). Codzienne nawyki bez kamieni świadomie pominięte —
 * to widok dużych rzeczy, Dziennik jest od codzienności.
 */
export function calendarMilestonesFor(peopleWithGoals: { person: Person; goals: Goal[] }[]): CalendarMilestone[] {
  return peopleWithGoals.flatMap(({ person, goals }) =>
    goals.flatMap((g) =>
      milestonesFor(g).map((m) => ({
        id: `${g.id}-${m.id}`,
        label: m.label,
        date: m.date,
        done: m.done,
        goalTitle: g.title,
        trackColor: TYPE_COLOR[g.type],
        personId: person.id,
      })),
    ),
  );
}
