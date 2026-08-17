// Logika Kreatora/Edytora celu (spec §5.5) — czyste funkcje, bez Reacta.
// Formularz ma dwie gałęzie: "szybkie zadanie" (skrócona ścieżka) i "cel do
// śledzenia" (pełne drzewo decyzyjne z charakterem/kadencją/kamieniami).

import { DAY_LABELS, formatShortDate, minimalVersionCap, monthAbbr, parseShortDate, sessionsPerMonth, today, type Ymd } from './calendarUtils';
import { uuid } from './id';
import { C, TYPE_COLOR } from '../theme';
import type { Goal, GoalCharacter, Milestone } from '../types';

export type CadenceType = 'daily' | 'weekdays' | 'perWeekCount' | 'monthly';

export interface MilestoneDraft {
  day: number;
  month: number;
  year: number;
  label: string;
}

export interface GoalFormState {
  kind: 'task' | 'goal' | null;
  name: string;
  reason: string;
  character: GoalCharacter | null;

  cadenceType: CadenceType | null;
  weekdays: number[];
  perWeekCount: number;
  timeOfDay: string;
  monthDay: number | null;
  startsToday: boolean;
  startDay: Ymd | null;
  anchor: string;

  minimal: string;

  milestonePlan: 'now' | 'later' | null;
  milestoneTarget: number;
  targetValue: string;
  targetUnit: string;
  milestoneDates: MilestoneDraft[];

  taskDay: Ymd | null;
  taskTime: string;

  visibleToPartner: boolean;
  syncToPhoneCalendar: boolean;
}

export const emptyFormState = (): GoalFormState => ({
  kind: null,
  name: '',
  reason: '',
  character: null,
  cadenceType: null,
  weekdays: [],
  perWeekCount: 3,
  timeOfDay: '',
  monthDay: null,
  startsToday: true,
  startDay: null,
  anchor: '',
  minimal: '',
  milestonePlan: null,
  milestoneTarget: 4,
  targetValue: '',
  targetUnit: '',
  milestoneDates: [],
  taskDay: null,
  taskTime: '',
  visibleToPartner: true,
  syncToPhoneCalendar: false,
});

export const isTask = (f: GoalFormState) => f.kind === 'task';

/** Tylko cele z terminem albo cyklicznie-treściowe mają krok kamieni (spec §5.5 pkt 4). */
export const needsMilestones = (f: GoalFormState) => f.kind === 'goal' && (f.character === 'termin' || f.character === 'cyclicalContent');

/**
 * Liczba kroków. Mockup (dwa-tory-finalna.jsx) liczył to jako `5 + (needsMilestones?1:0)`
 * dla gałęzi celu, co dla nawyku (bez kroku kamieni) zostawiało pusty krok 3
 * bez żadnej treści (błąd nawigacji). Tu poprawione: 4 kroki bazowe (nazwa,
 * kadencja, minimalna wersja, podsumowanie) + 1 jeśli dochodzi krok kamieni.
 */
export const totalSteps = (f: GoalFormState) => (isTask(f) ? 3 : 4 + (needsMilestones(f) ? 1 : 0));

export const milestoneStepIndex = 3;
export const isMilestoneStep = (f: GoalFormState, step: number) => needsMilestones(f) && step === milestoneStepIndex;
export const isSummaryStep = (f: GoalFormState, step: number) => step === totalSteps(f) - 1;

/** Kolor kreatora, zanim/zamiast cel zostanie zapisany — przed wyborem charakteru neutralny gold. */
export const trackColorFor = (character: GoalCharacter | null): string => {
  if (character === 'termin') return TYPE_COLOR.termin;
  if (character === 'habit' || character === 'cyclicalContent') return TYPE_COLOR.cykliczny;
  return C.gold;
};

export function cadenceLabel(f: GoalFormState): string {
  if (f.cadenceType === 'daily') return 'codziennie';
  if (f.cadenceType === 'weekdays') {
    const days = [...f.weekdays].sort((a, b) => a - b).map((i) => DAY_LABELS[i]).join(', ');
    return `${days}${f.timeOfDay ? ` o ${f.timeOfDay}` : ''}`;
  }
  if (f.cadenceType === 'perWeekCount') return `${f.perWeekCount}× w tygodniu${f.timeOfDay ? ` · ${f.timeOfDay}` : ''}`;
  if (f.cadenceType === 'monthly') return `co miesiąc, ${f.monthDay ? `${f.monthDay}. dnia` : 'dzień nieustalony'}${f.timeOfDay ? ` o ${f.timeOfDay}` : ''}`;
  return '';
}

export function minimalCapLabel(f: GoalFormState): string {
  if (f.cadenceType === 'monthly') return 'Przy tej częstotliwości limit nie ma dużego znaczenia.';
  const sessions = sessionsPerMonth(f.cadenceType, f.weekdays.length, f.perWeekCount);
  return `Maksymalnie ${minimalVersionCap(sessions)}× w miesiącu (25% dni).`;
}

export function startLabel(f: GoalFormState): string {
  if (f.startsToday || !f.startDay) return 'dziś';
  return formatShortDate(f.startDay);
}

/**
 * Progi kamieni muszą rosnąć monotonicznie, bez duplikatów, ostatni zawsze
 * równy targetValue (spec §4). Kamienie ręczne (cel cykliczny-treściowy) nie
 * mają threshold — status trzymany w manualMilestoneDone.
 */
export function buildMilestones(goalId: string, character: GoalCharacter | null, targetValue: string, dates: MilestoneDraft[]): Milestone[] {
  const targetNum = parseInt(targetValue, 10) || dates.length;
  let prevThreshold = 0;
  return dates.map((m, i) => {
    const isLast = i === dates.length - 1;
    let threshold: number | undefined;
    if (character !== 'termin') {
      threshold = undefined;
    } else if (isLast) {
      threshold = targetNum;
    } else {
      const raw = Math.round(((i + 1) / dates.length) * targetNum);
      threshold = Math.min(targetNum - 1, Math.max(prevThreshold + 1, raw));
    }
    if (threshold !== undefined) prevThreshold = threshold;
    return { id: `${goalId}-m${i}`, label: m.label || `Etap ${i + 1}`, date: `${m.day} ${monthAbbr(m.month)}`, threshold };
  });
}

export function canProceed(f: GoalFormState, step: number): boolean {
  if (step === 0) return f.name.trim().length > 0 && !!f.kind && (f.kind === 'task' || !!f.character);
  if (isTask(f)) return true;
  if (step === 1) {
    if (!f.cadenceType) return false;
    if (f.cadenceType === 'weekdays') return f.weekdays.length > 0;
    if (f.cadenceType === 'monthly') return !!f.monthDay;
    return true;
  }
  if (isMilestoneStep(f, step)) {
    if (!f.milestonePlan) return false;
    if (f.milestonePlan === 'now') return f.milestoneDates.length > 0;
  }
  return true;
}

/** Buduje finalny obiekt Goal z gotowego formularza (tylko gałąź "cel", nie zadanie). */
export function formStateToGoal(f: GoalFormState, personId: string, existing?: Goal): Goal {
  const id = existing?.id ?? uuid();
  // Poprawka błędu z makiety: `type: ngCharacter === "habit" ? "cykliczny" : ngCharacter`
  // dawało type="cyclicalContent" dla celów cyklicznie-treściowych, co nie
  // pasuje do TYPE_COLOR (tylko "termin" | "cykliczny") i psuło kolory torów.
  const type = f.character === 'termin' ? 'termin' : 'cykliczny';
  // "Dodawaj po drodze" = kamienie dochodzą później (poza tym kreatorem) —
  // przy edycji nie wolno w tym wypadku wyzerować już istniejących.
  const milestones = f.milestonePlan === 'now' ? buildMilestones(id, f.character, f.targetValue, f.milestoneDates) : existing?.milestones ?? [];

  const manualMilestoneDone: Record<string, boolean> | undefined =
    f.character === 'cyclicalContent'
      ? Object.fromEntries(milestones.map((m) => [m.id, existing?.manualMilestoneDone?.[m.id] ?? false]))
      : undefined;

  return {
    id,
    personId,
    title: f.name.trim(),
    type,
    character: f.character!,
    reason: f.reason.trim() || undefined,
    anchor: f.anchor.trim() || undefined,
    minimalVersion: f.minimal.trim() || undefined,
    start: existing?.start ?? startLabel(f),
    cadenceLabel: cadenceLabel(f),
    cadenceSlots: f.cadenceType === 'perWeekCount' ? ['Ten tydzień', 'Przyszły tydzień'] : ['Dziś', 'Jutro'],
    ...(f.character === 'termin' ? { targetValue: f.targetValue, targetUnit: f.targetUnit } : {}),
    ...(f.character === 'termin' ? { completedSessions: existing?.completedSessions ?? 0 } : {}),
    milestones,
    manualMilestoneDone,
    instance: existing?.instance ?? { curr: { status: 'plan', note: '' }, next: { status: 'plan', double: false } },
    rescheduleCount: existing?.rescheduleCount ?? 0,
    visibleToPartner: f.visibleToPartner,
    syncToPhoneCalendar: f.syncToPhoneCalendar,
  };
}

const WEEKDAY_BY_LABEL = new Map<string, number>(DAY_LABELS.map((l, i) => [l, i]));

/**
 * Odtwarza ustawienia kadencji z zapisanego `cadenceLabel` na wejściu do
 * edytora. Makieta tego nie robiła — startEditGoal() zostawiał kadencję i
 * datę startu puste, więc samo otwarcie edycji i zapis (np. tylko po to,
 * żeby poprawić nazwę) po cichu kasował wzorzec powtarzalności celu. Tu
 * naprawione: edycja zawsze startuje z pełnym, zgodnym stanem.
 */
function parseCadenceLabel(label: string): Pick<GoalFormState, 'cadenceType' | 'weekdays' | 'perWeekCount' | 'timeOfDay' | 'monthDay'> {
  const base = emptyFormState();
  if (label === 'codziennie') return { cadenceType: 'daily', weekdays: [], perWeekCount: base.perWeekCount, timeOfDay: '', monthDay: null };

  const perWeekMatch = label.match(/^(\d+)× w tygodniu(?: · (.+))?$/);
  if (perWeekMatch) {
    return { cadenceType: 'perWeekCount', weekdays: [], perWeekCount: parseInt(perWeekMatch[1], 10), timeOfDay: perWeekMatch[2] ?? '', monthDay: null };
  }

  const monthlyMatch = label.match(/^co miesiąc, (?:(\d+)\. dnia|dzień nieustalony)(?: o (.+))?$/);
  if (monthlyMatch) {
    return { cadenceType: 'monthly', weekdays: [], perWeekCount: base.perWeekCount, timeOfDay: monthlyMatch[2] ?? '', monthDay: monthlyMatch[1] ? parseInt(monthlyMatch[1], 10) : null };
  }

  const weekdaysMatch = label.match(/^([^o]+?)(?: o (.+))?$/);
  if (weekdaysMatch) {
    const days = weekdaysMatch[1]
      .split(',')
      .map((d) => d.trim())
      .map((d) => WEEKDAY_BY_LABEL.get(d))
      .filter((i): i is number => i !== undefined);
    if (days.length > 0) return { cadenceType: 'weekdays', weekdays: days, perWeekCount: base.perWeekCount, timeOfDay: weekdaysMatch[2] ?? '', monthDay: null };
  }

  return { cadenceType: null, weekdays: [], perWeekCount: base.perWeekCount, timeOfDay: '', monthDay: null };
}

export function goalToFormState(g: Goal): GoalFormState {
  const base = emptyFormState();
  const referenceYear = today().year;
  const milestoneDates: MilestoneDraft[] = g.milestones
    .map((m) => {
      const parsed = parseShortDate(m.date, referenceYear);
      return parsed ? { ...parsed, label: m.label } : null;
    })
    .filter((m): m is MilestoneDraft => m !== null);

  return {
    ...base,
    kind: 'goal',
    name: g.title,
    reason: g.reason ?? '',
    character: g.character,
    ...parseCadenceLabel(g.cadenceLabel),
    anchor: g.anchor ?? '',
    minimal: g.minimalVersion ?? '',
    milestonePlan: g.milestones.length > 0 ? 'now' : 'later',
    milestoneTarget: g.milestones.length || base.milestoneTarget,
    targetValue: g.targetValue ?? '',
    targetUnit: g.targetUnit ?? '',
    milestoneDates,
    visibleToPartner: g.visibleToPartner,
    syncToPhoneCalendar: g.syncToPhoneCalendar,
  };
}
