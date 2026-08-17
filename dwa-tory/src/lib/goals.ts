// Czysta logika biznesowa celów/instancji dnia — bez Reacta, bez storage.
// Odzwierciedla zachowanie dwa-tory-finalna.jsx (spec §9: "źródło prawdy").

import { currentWeekKey, today, ymdKey } from './calendarUtils';
import type { Goal, InstanceStatus, Milestone, MilestoneWithDone } from '../types';

/**
 * Kamienie milowe — dwa tryby (spec §4):
 * 1. Liczone automatycznie: completedSessions >= threshold. NIE trzymamy `done`
 *    w danych dla takich celów — status liczy się na bieżąco, tutaj.
 * 2. Ręczne: `manualMilestoneDone[milestone.id]`, dla celów z treścią.
 */
export function milestonesFor(goal: Goal): MilestoneWithDone[] {
  if (typeof goal.completedSessions === 'number') {
    return goal.milestones.map((m) => ({ ...m, done: goal.completedSessions! >= (m.threshold ?? Infinity) }));
  }
  return goal.milestones.map((m) => ({ ...m, done: !!goal.manualMilestoneDone?.[m.id] }));
}

/**
 * Zapisuje dzisiejszy wynik do historii (napędza Kalendarz — spec §5.6).
 * "plan" nigdy nie trafia do historii: brak wpisu = brak danych, nie porażka.
 * Zapis następuje w momencie akcji, nie przez osobny silnik "przełączania
 * dnia" — apka wciąż działa na jednym żywym "dziś" w Dzienniku, ale historia
 * i tak jest prawdziwa dla każdego dnia, w którym faktycznie coś kliknięto.
 */
function logToday(goal: Goal, status: InstanceStatus): Goal['history'] {
  const key = ymdKey(today());
  const history = { ...(goal.history ?? {}) };
  if (status === 'plan') delete history[key];
  else history[key] = status;
  return history;
}

export interface MarkDoneResult {
  goal: Goal;
  reachedMilestone?: Milestone;
}

/** Odhaczenie "Zrobione" na dzisiejszym torze. */
export function applyMarkDone(goal: Goal, note: string): MarkDoneResult {
  const hasSessions = typeof goal.completedSessions === 'number';
  const newCount = hasSessions ? goal.completedSessions! + 1 : undefined;
  const reachedMilestone = hasSessions ? goal.milestones.find((m) => m.threshold === newCount) : undefined;
  const updated: Goal = {
    ...goal,
    instance: { ...goal.instance, curr: { status: 'done', note } },
    history: logToday(goal, 'done'),
    ...(hasSessions ? { completedSessions: newCount } : {}),
  };
  return { goal: updated, reachedMilestone };
}

/** Cofnięcie odhaczenia. */
export function applyUndoDone(goal: Goal): Goal {
  const hasSessions = typeof goal.completedSessions === 'number';
  return {
    ...goal,
    instance: { ...goal.instance, curr: { status: 'plan', note: '' } },
    history: logToday(goal, 'plan'),
    ...(hasSessions ? { completedSessions: Math.max(0, goal.completedSessions! - 1) } : {}),
  };
}

// --- "X razy w tygodniu": licznik tygodniowy, nie pojedynczy slot dnia ---
// Bez tego "X razy w tygodniu" i "konkretne dni tygodnia" wyglądałyby i
// działały identycznie w Dzienniku — obie po prostu przełączałyby jeden
// stan plan/done. Tu realny, resetujący się co tydzień licznik postępu.

export interface WeekProgress {
  count: number;
  target: number;
}

/** Efektywny postęp w BIEŻĄCYM tygodniu — jeśli zapisany weekKey jest z poprzedniego tygodnia, liczy się jako 0 (nowy tydzień), bez potrzeby osobnego kroku "reset". */
export function weekProgressFor(goal: Goal): WeekProgress {
  const target = Math.max(1, goal.cadencePerWeekCount ?? 1);
  const key = currentWeekKey();
  const count = goal.instance.curr.weekKey === key ? (goal.instance.curr.weekCount ?? 0) : 0;
  return { count, target };
}

export function applyMarkDoneWeekly(goal: Goal, note: string): MarkDoneResult {
  const { count, target } = weekProgressFor(goal);
  const newCount = Math.min(target, count + 1);
  const hasSessions = typeof goal.completedSessions === 'number';
  const newSessions = hasSessions ? goal.completedSessions! + 1 : undefined;
  const reachedMilestone = hasSessions ? goal.milestones.find((m) => m.threshold === newSessions) : undefined;
  const updated: Goal = {
    ...goal,
    instance: {
      ...goal.instance,
      curr: { status: newCount >= target ? 'done' : 'plan', note, weekCount: newCount, weekKey: currentWeekKey() },
    },
    // Dzień faktycznie odhaczony — niezależnie od tego, czy tygodniowy cel już osiągnięty.
    history: logToday(goal, 'done'),
    ...(hasSessions ? { completedSessions: newSessions } : {}),
  };
  return { goal: updated, reachedMilestone };
}

export function applyUndoDoneWeekly(goal: Goal): Goal {
  const { count, target } = weekProgressFor(goal);
  const newCount = Math.max(0, count - 1);
  const hasSessions = typeof goal.completedSessions === 'number';
  return {
    ...goal,
    instance: {
      ...goal.instance,
      curr: { status: newCount >= target ? 'done' : 'plan', note: '', weekCount: newCount, weekKey: currentWeekKey() },
    },
    history: logToday(goal, 'plan'),
    ...(hasSessions ? { completedSessions: Math.max(0, goal.completedSessions! - 1) } : {}),
  };
}

/**
 * Czy kliknięcie "przesuń" wymaga świadomej decyzji? (spec §5.3, kaskada)
 * Slot "next" w stanie "plan" = tam już czeka własne zaplanowane wystąpienie → zajęty.
 * Każdy inny stan (done/moved/skipped) = nic tam nie czeka → wolny, można przesunąć wprost.
 */
export function nextSlotIsOccupied(goal: Goal): boolean {
  return goal.instance.next.status === 'plan';
}

/** Proste przesunięcie, gdy slot "next" jest wolny. */
export function applySimpleMove(goal: Goal): Goal {
  return {
    ...goal,
    instance: { curr: { status: 'moved' }, next: { status: 'plan' } },
    history: logToday(goal, 'moved'),
    rescheduleCount: goal.rescheduleCount + 1,
  };
}

/** "Zrób oba naraz (2×)" — konflikt rozwiązany podwójnym wystąpieniem jutro. */
export function applyDoubleUp(goal: Goal): Goal {
  return {
    ...goal,
    instance: { curr: { status: 'moved' }, next: { status: 'plan', double: true } },
    history: logToday(goal, 'moved'),
    rescheduleCount: goal.rescheduleCount + 1,
  };
}

/** "Odpuść dzisiejsze" / "Odpuść jutrzejsze" — konflikt rozwiązany rezygnacją. */
export function applyDrop(goal: Goal, which: 'curr' | 'next'): Goal {
  const instance =
    which === 'curr'
      ? { curr: { status: 'skipped' as const }, next: goal.instance.next }
      : { curr: { status: 'moved' as const }, next: { status: 'skipped' as const } };
  return { ...goal, instance, history: logToday(goal, instance.curr.status), rescheduleCount: goal.rescheduleCount + 1 };
}

/** Próg ostrzeżenia o przeciążeniu na karcie celu (spec §5.3, pętla zwrotna). */
export const RESCHEDULE_WARNING_THRESHOLD = 2;
