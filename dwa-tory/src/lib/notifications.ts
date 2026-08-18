// Logika odpowiedzi na powiadomienie (spec §5.8). Twardy limit 5 słów —
// to ma być symboliczny gest docenienia, nie czat. Apka nie ma być
// komunikatorem.

export const MAX_REPLY_WORDS = 5;

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
