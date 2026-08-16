// Czysta logika biznesowa celów/instancji dnia — bez Reacta, bez storage.
// Odzwierciedla zachowanie dwa-tory-finalna.jsx (spec §9: "źródło prawdy").

import type { Goal, Milestone, MilestoneWithDone } from '../types';

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
    rescheduleCount: goal.rescheduleCount + 1,
  };
}

/** "Zrób oba naraz (2×)" — konflikt rozwiązany podwójnym wystąpieniem jutro. */
export function applyDoubleUp(goal: Goal): Goal {
  return {
    ...goal,
    instance: { curr: { status: 'moved' }, next: { status: 'plan', double: true } },
    rescheduleCount: goal.rescheduleCount + 1,
  };
}

/** "Odpuść dzisiejsze" / "Odpuść jutrzejsze" — konflikt rozwiązany rezygnacją. */
export function applyDrop(goal: Goal, which: 'curr' | 'next'): Goal {
  const instance =
    which === 'curr'
      ? { curr: { status: 'skipped' as const }, next: goal.instance.next }
      : { curr: { status: 'moved' as const }, next: { status: 'skipped' as const } };
  return { ...goal, instance, rescheduleCount: goal.rescheduleCount + 1 };
}

/** Próg ostrzeżenia o przeciążeniu na karcie celu (spec §5.3, pętla zwrotna). */
export const RESCHEDULE_WARNING_THRESHOLD = 2;
