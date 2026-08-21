// Sync "Szybkich zadań" z Supabase. Wzorzec bliski goalsSync: pullTasksForOwner
// służy zarówno do ściągania WŁASNYCH zadań jak i zadań PARTNERA (Kalendarz) —
// RLS z 0006_tasks_partner_visibility.sql filtruje drugie automatycznie do
// visible_to_partner=true. Bez złożonej historii/kamieni, więc bez osobnych
// tabel jak przy celach — sam pull + upsert, plus Realtime dla widoku
// partnerki (patrz AppDataContext, ten sam wzorzec co partnerGoals).

import { supabase } from './supabaseClient';
import type { Task } from '../types';

interface TaskRow {
  id: string;
  owner_id: string;
  title: string;
  date: string;
  time: string | null;
  done: boolean;
  visible_to_partner: boolean;
  updated_at: string;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    personId: row.owner_id,
    title: row.title,
    date: row.date,
    time: row.time ?? undefined,
    done: row.done,
    visibleToPartner: row.visible_to_partner,
    updatedAt: row.updated_at,
  };
}

export async function pullTasksForOwner(ownerId: string): Promise<Task[]> {
  const { data, error } = await supabase.from('tasks').select('*').eq('owner_id', ownerId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToTask);
}

export async function pushTask(task: Task, ownerId: string): Promise<void> {
  const { error } = await supabase.from('tasks').upsert({
    id: task.id,
    owner_id: ownerId,
    title: task.title,
    date: task.date,
    time: task.time ?? null,
    done: task.done,
    visible_to_partner: task.visibleToPartner,
    updated_at: task.updatedAt ?? new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function pushTaskDelete(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw new Error(error.message);
}
