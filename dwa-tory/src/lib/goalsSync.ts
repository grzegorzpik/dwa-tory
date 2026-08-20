// Synchronizacja celów z Supabase (Backend Etap 5). Wzorzec: zapis lokalnie
// → widoczne od razu w UI → w tle push tutaj. Konflikty: ostatni zapis
// wygrywa po Goal.updatedAt (patrz reconcileOwnGoals w AppDataContext).
//
// pullGoalsForOwner() służy zarówno do ściągania WŁASNYCH celów (nowe
// urządzenie / odzyskiwanie dostępu) jak i celów PARTNERA (Kalendarz) — RLS
// z Etapu 2 filtruje drugie automatycznie do visible_to_partner=true.

import { today, ymdKey } from './calendarUtils';
import { supabase } from './supabaseClient';
import type { Goal, InstanceStatus } from '../types';

function goalToRow(goal: Goal, ownerId: string) {
  return {
    id: goal.id,
    owner_id: ownerId,
    title: goal.title,
    type: goal.type,
    character: goal.character,
    reason: goal.reason ?? null,
    anchor: goal.anchor ?? null,
    minimal_version: goal.minimalVersion ?? null,
    start: goal.start,
    cadence_type: goal.cadenceType,
    cadence_weekdays: goal.cadenceWeekdays ?? null,
    cadence_per_week_count: goal.cadencePerWeekCount ?? null,
    cadence_month_day: goal.cadenceMonthDay ?? null,
    cadence_time_of_day: goal.cadenceTimeOfDay ?? null,
    cadence_label: goal.cadenceLabel,
    cadence_slots: goal.cadenceSlots,
    target_value: goal.targetValue ?? null,
    target_unit: goal.targetUnit ?? null,
    completed_sessions: goal.completedSessions ?? null,
    manual_milestone_done: goal.manualMilestoneDone ?? {},
    instance_curr: goal.instance.curr,
    instance_next: goal.instance.next,
    reschedule_count: goal.rescheduleCount,
    visible_to_partner: goal.visibleToPartner,
    sync_to_phone_calendar: goal.syncToPhoneCalendar,
    updated_at: goal.updatedAt ?? new Date().toISOString(),
  };
}

/** Upsert celu + (jeśli się zmienił) dzisiejszego wpisu historii — WYSTARCZA po markDone/przesuń/odpuść, bo to jedyny dzień, który te akcje ruszają (patrz lib/goals.ts: logToday). */
export async function pushGoal(goal: Goal, ownerId: string): Promise<void> {
  const { error } = await supabase.from('goals').upsert(goalToRow(goal, ownerId));
  if (error) throw error;

  const key = ymdKey(today());
  const status = goal.history?.[key];
  if (status) {
    const { error: iErr } = await supabase.from('instances').upsert({ goal_id: goal.id, owner_id: ownerId, date: key, status });
    if (iErr) throw iErr;
  } else {
    const { error: dErr } = await supabase.from('instances').delete().eq('goal_id', goal.id).eq('date', key);
    if (dErr) throw dErr;
  }
}

/** Kamienie — proste delete-then-insert (małe liczby na cel, wołane tylko z Kreatora/Edytora, nie przy każdym markDone). */
export async function pushGoalMilestones(goal: Goal): Promise<void> {
  const { error: delErr } = await supabase.from('milestones').delete().eq('goal_id', goal.id);
  if (delErr) throw delErr;
  if (goal.milestones.length === 0) return;
  const rows = goal.milestones.map((m, i) => ({
    id: m.id,
    goal_id: goal.id,
    label: m.label,
    date: m.date,
    threshold: m.threshold ?? null,
    sort_order: i,
  }));
  const { error } = await supabase.from('milestones').insert(rows);
  if (error) throw error;
}

export async function pushGoalDelete(goalId: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', goalId);
  if (error) throw error;
}

interface GoalRow {
  id: string;
  owner_id: string;
  title: string;
  type: Goal['type'];
  character: Goal['character'];
  reason: string | null;
  anchor: string | null;
  minimal_version: string | null;
  start: string;
  cadence_type: Goal['cadenceType'];
  cadence_weekdays: number[] | null;
  cadence_per_week_count: number | null;
  cadence_month_day: number | null;
  cadence_time_of_day: string | null;
  cadence_label: string;
  cadence_slots: string[];
  target_value: string | null;
  target_unit: string | null;
  completed_sessions: number | null;
  manual_milestone_done: Record<string, boolean> | null;
  instance_curr: Goal['instance']['curr'];
  instance_next: Goal['instance']['next'];
  reschedule_count: number;
  visible_to_partner: boolean;
  sync_to_phone_calendar: boolean;
  updated_at: string;
}

interface MilestoneRow {
  id: string;
  goal_id: string;
  label: string;
  date: string;
  threshold: number | null;
  sort_order: number;
}

interface InstanceRow {
  goal_id: string;
  date: string;
  status: InstanceStatus;
}

function rowToGoal(row: GoalRow, milestoneRows: MilestoneRow[], instanceRows: InstanceRow[]): Goal {
  const history: Record<string, 'done' | 'moved' | 'skipped'> = {};
  for (const r of instanceRows) if (r.status !== 'plan') history[r.date] = r.status;

  return {
    id: row.id,
    personId: row.owner_id,
    title: row.title,
    type: row.type,
    character: row.character,
    reason: row.reason ?? undefined,
    anchor: row.anchor ?? undefined,
    minimalVersion: row.minimal_version ?? undefined,
    start: row.start,
    cadenceType: row.cadence_type,
    cadenceWeekdays: row.cadence_weekdays ?? undefined,
    cadencePerWeekCount: row.cadence_per_week_count ?? undefined,
    cadenceMonthDay: row.cadence_month_day ?? undefined,
    cadenceTimeOfDay: row.cadence_time_of_day ?? undefined,
    cadenceLabel: row.cadence_label,
    cadenceSlots: row.cadence_slots as [string, string],
    targetValue: row.target_value ?? undefined,
    targetUnit: row.target_unit ?? undefined,
    completedSessions: row.completed_sessions ?? undefined,
    manualMilestoneDone: row.manual_milestone_done ?? undefined,
    milestones: milestoneRows
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({ id: m.id, label: m.label, date: m.date, threshold: m.threshold ?? undefined })),
    instance: { curr: row.instance_curr, next: row.instance_next },
    rescheduleCount: row.reschedule_count,
    visibleToPartner: row.visible_to_partner,
    syncToPhoneCalendar: row.sync_to_phone_calendar,
    history,
    updatedAt: row.updated_at,
  };
}

/**
 * Ściąga wszystkie cele danego właściciela z Supabase, złożone z powrotem w
 * kształt Goal (kamienie + historia). Dla owner_id = partner RLS z Etapu 2 i
 * tak zwróci tylko te z visible_to_partner=true — nie trzeba tego filtrować
 * tutaj ponownie.
 */
export async function pullGoalsForOwner(ownerId: string): Promise<Goal[]> {
  const { data: goalRows, error } = await supabase.from('goals').select('*').eq('owner_id', ownerId);
  if (error) throw error;
  if (!goalRows || goalRows.length === 0) return [];

  const goalIds = goalRows.map((g) => g.id);
  const [milestonesRes, instancesRes] = await Promise.all([
    supabase.from('milestones').select('*').in('goal_id', goalIds),
    supabase.from('instances').select('goal_id, date, status').in('goal_id', goalIds),
  ]);
  if (milestonesRes.error) throw milestonesRes.error;
  if (instancesRes.error) throw instancesRes.error;

  const milestonesByGoal = new Map<string, MilestoneRow[]>();
  for (const m of milestonesRes.data ?? []) {
    const arr = milestonesByGoal.get(m.goal_id) ?? [];
    arr.push(m);
    milestonesByGoal.set(m.goal_id, arr);
  }
  const instancesByGoal = new Map<string, InstanceRow[]>();
  for (const inst of instancesRes.data ?? []) {
    const arr = instancesByGoal.get(inst.goal_id) ?? [];
    arr.push(inst);
    instancesByGoal.set(inst.goal_id, arr);
  }

  return (goalRows as GoalRow[]).map((row) => rowToGoal(row, milestonesByGoal.get(row.id) ?? [], instancesByGoal.get(row.id) ?? []));
}
