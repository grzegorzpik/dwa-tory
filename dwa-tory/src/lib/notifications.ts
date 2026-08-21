// Logika odpowiedzi na powiadomienie (spec §5.8). Twardy limit 5 słów —
// to ma być symboliczny gest docenienia, nie czat. Apka nie ma być
// komunikatorem.

export const MAX_REPLY_WORDS = 5;

/** Formatuje ISO timestamp z Supabase (`notifications.created_at`) do krótkiego, czytelnego czasu względnego. */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'przed chwilą';
  if (minutes < 60) return `${minutes} min temu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} godz. temu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'wczoraj';
  if (days < 7) return `${days} dni temu`;
  const d = new Date(iso);
  const MONTH_ABBR = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`;
}

export const REPLY_CHIPS = ['Super robota!', 'Dumny/a z Ciebie', 'Brawo 👏', 'Jesteś świetna'] as const;

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Puste pole nie wysyła; przekroczenie limitu blokuje wysyłkę (spec: "blokada wysyłki po przekroczeniu"). */
export function canSendReply(text: string): boolean {
  const count = wordCount(text);
  return count > 0 && count <= MAX_REPLY_WORDS;
}
