// Sync "Szybkich zadań" z Supabase. Prostszy wzorzec niż goalsSync: zadania
// nie mają partnerki (nie ma dla nich RLS-owej widoczności współdzielonej)
// ani złożonej historii — jak notifications, sam pull na starcie + upsert
// przy zapisie, bez subskrypcji Realtime (własne dane, nie ma na kogo
// czekać — patrz uwaga w komentarzu przy tabeli w migracji 0005).

import { supabase } from './supabaseClient';
import type { Task } from '../types';

interface TaskRow {
  id: string;
  owner_id: string;
  title: string;
  date: string;
  time: string | null;
  done: boolean;
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
    updated_at: task.updatedAt ?? new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function pushTaskDelete(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw new Error(error.message);
}
