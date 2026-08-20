// Parowanie kont (Backend Etap 4, spec §6 "Łączenie kont"). Generowanie kodu
// to zwykły INSERT (pokryty RLS z Etapu 2); wymiana kodu na parę idzie przez
// redeem_invite_code() (SECURITY DEFINER, Etap 4 migracja SQL), bo wymaga
// sprawdzeń krzyżowych niewyrażalnych bezpiecznie samym RLS.

import { supabase } from './supabaseClient';
import type { Person } from '../types';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bez znaków mylących: 0/O, 1/I/L
const CODE_LENGTH = 6;
export const CODE_TTL_MINUTES = 15;

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = '';
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

export interface MyInviteCode {
  code: string;
  expiresAt: string;
}

export async function createInviteCode(userId: string): Promise<MyInviteCode> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();
  const { error } = await supabase.from('invite_codes').insert({ code, created_by: userId, expires_at: expiresAt });
  if (error) throw new Error(error.message);
  return { code, expiresAt };
}

/** Rzuca z komunikatem z redeem_invite_code() (kod zły/wygasły/użyty/już sparowani) — do pokazania wprost użytkownikowi. */
export async function redeemInviteCode(code: string): Promise<void> {
  const { error } = await supabase.rpc('redeem_invite_code', { p_code: code.trim().toUpperCase() });
  if (error) throw new Error(error.message);
}

export interface PairingStatus {
  pairId: string;
  partner: Person;
}

export async function fetchMyPairing(): Promise<PairingStatus | null> {
  const { data, error } = await supabase.rpc('my_pairing');
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  return {
    pairId: row.pair_id,
    partner: {
      id: row.partner_id,
      name: row.partner_name,
      initials: row.partner_initials,
      color: row.partner_color,
      photo: row.partner_photo_src ? { src: row.partner_photo_src } : undefined,
      streak: row.partner_streak,
      longestStreak: row.partner_longest_streak,
      cheers: row.partner_cheers,
    },
  };
}

export async function disconnectPair(pairId: string): Promise<void> {
  const { error } = await supabase.from('pairs').delete().eq('id', pairId);
  if (error) throw new Error(error.message);
}
