// Sync panelu Powiadomień z Supabase (domyka krok 7 — tabela `notifications`
// i jej RLS istniały od Etapu 1-2, ale nic w appce się do niej nie odzywało).
// Prostszy wzorzec niż goalsSync: powiadomienia nikt nie edytuje poza
// odpowiedzią odbiorcy (RLS: notifications_update_reply_by_recipient), więc
// bez scalania po updatedAt — sam pull + Realtime, jak partnerGoals w
// AppDataContext.

import { supabase } from './supabaseClient';
import type { AppNotification } from '../types';

interface NotificationRow {
  id: string;
  pair_id: string;
  actor_id: string;
  text: string;
  created_at: string;
  responded: boolean;
  reply: string | null;
}

function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    actorId: row.actor_id,
    text: row.text,
    createdAt: row.created_at,
    responded: row.responded,
    reply: row.reply ?? undefined,
  };
}

export async function pullNotifications(pairId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('pair_id', pairId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToNotification);
}

/** Zapisuje zdarzenie do wspólnego feedu pary — RLS wymaga actor_id = auth.uid() (spec §5.8: widzi je druga osoba). */
export async function pushNotification(pairId: string, actorId: string, text: string): Promise<void> {
  const { error } = await supabase.from('notifications').insert({ pair_id: pairId, actor_id: actorId, text });
  if (error) throw new Error(error.message);
}

/** Tylko odbiorca może odpowiedzieć (RLS: actor_id <> auth.uid()) — limit słów (MAX_REPLY_WORDS) egzekwowany po stronie klienta (lib/notifications.ts). */
export async function replyToNotification(id: string, reply: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ responded: true, reply, replied_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
