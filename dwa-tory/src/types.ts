// Model danych — spec §4. Trzymany w jednym miejscu, importowany przez
// warstwę storage i wszystkie ekrany.

import type { GoalType } from './theme';

export interface Photo {
  /** Przycięty przez <canvas>, skompresowany JPEG jako data URL (spec §8: nigdy surowy plik z aparatu). */
  src: string;
}

export interface Person {
  id: string;
  name: string;
  initials: string;
  color: string;
  photo?: Photo;
  streak: number;
  longestStreak: number;
  cheers: number;
}

export type GoalCharacter = 'habit' | 'termin' | 'cyclicalContent';

export interface Milestone {
  id: string;
  label: string;
  /** Data w formacie czytelnym, np. "12 sie" — spójne z resztą UI. */
  date: string;
  /**
   * Próg tylko dla celów liczonych automatycznie (completedSessions >= threshold).
   * Dla kamieni ręcznych (treściowych) status "done" trzymany osobno w `manualDone`.
   */
  threshold?: number;
}

export type InstanceStatus = 'plan' | 'done' | 'moved' | 'skipped';

export interface DayInstance {
  status: InstanceStatus;
  note?: string;
}

export interface NextInstance {
  status: InstanceStatus;
  double?: boolean;
}

export interface GoalInstance {
  curr: DayInstance;
  next: NextInstance;
}

export interface Goal {
  id: string; // crypto.randomUUID() — spec §8, nigdy Date.now()
  personId: string; // właściciel — edycja cudzych celów nie ma sensu (spec §5.4)
  title: string;
  type: GoalType; // "termin" | "cykliczny" — determinuje TYPE_COLOR
  character: GoalCharacter;
  reason?: string;
  anchor?: string;
  minimalVersion?: string;
  /** Data startu w formie czytelnej ("dziś" albo "12 sie") — punkt "Start" w Twojej podróży. */
  start: string;
  cadenceLabel: string;
  cadenceSlots: [string, string]; // ["Dziś","Jutro"] albo ["Ten tydzień","Przyszły tydzień"]
  targetValue?: string; // tylko type="termin"
  targetUnit?: string; // tylko type="termin"
  completedSessions?: number; // tylko type="termin" — napędza kamienie liczone automatycznie
  /** Dla kamieni ręcznych (bez threshold) — czy dany kamień jest odhaczony. Klucz = milestone.id. */
  manualMilestoneDone?: Record<string, boolean>;
  milestones: Milestone[];
  instance: GoalInstance;
  rescheduleCount: number;
  visibleToPartner: boolean;
  syncToPhoneCalendar: boolean;
}

export interface MilestoneWithDone extends Milestone {
  done: boolean;
}

export interface AppSettings {
  selfTimeEnabled: boolean;
  pushEnabled: boolean;
  soundEnabled: boolean;
  defaultCalendarView: 'mine' | 'partner' | 'both';
  defaultCalendarPeriod: 'week' | 'month';
  hasCompletedOnboarding: boolean;
}

export interface AppNotification {
  id: string;
  person: 'a' | 'b';
  text: string;
  time: string;
  responded: boolean;
  reply?: string;
}
