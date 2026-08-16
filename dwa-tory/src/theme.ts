// Jedyne źródło prawdy dla design tokenów. Wymóg ze specyfikacji (sekcja 8):
// "Jeden moduł motywu — theme.ts (...) importowany wszędzie" — kolory, typy i
// animacje NIE mogą być duplikowane w komponentach ekranów.

/** Paleta aplikacji (spec §7). */
export const C = {
  bg: '#12211D',
  surface: '#1B322B',
  surface2: '#213C33',
  line: '#2C4A40',
  gold: '#E3A542',
  text: '#F3EFE4',
  muted: '#9FB3AC',
  skipped: '#5A6B65',
  over: '#D9604E',
  ok: '#6FAE8C',
} as const;

/**
 * Kolor osoby i kolor typu celu to dwa różne wymiary (spec §7, dopisek).
 * Nie wolno ich mylić mimo zbliżonych wartości — trzymane jako osobne stałe.
 */
export const PERSON_COLOR = {
  a: '#E8724F', // Grzesiek
  b: '#5FA8AE', // Wiola
} as const;

/** Kolor toru wynika z TYPU celu, nigdy z koloru osoby (spec §5.4). */
export const TYPE_COLOR = {
  termin: '#E8724F',
  cykliczny: '#8AAE9E',
} as const;

export type GoalType = keyof typeof TYPE_COLOR;

/** Splash / okładka aplikacji poza kartą telefonu. */
export const SHELL_BG = '#0B1512';

export const FONTS = {
  display: "'Bebas Neue', sans-serif", // nagłówki / duże liczby
  head: "'Fraunces', serif", // podtytuły
  body: "'Inter', sans-serif", // treść
} as const;

export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap';

/** Nazwane czasy trwania animacji (spec §7) — jedno źródło, żeby JS i CSS się nie rozjechały. */
export const ANIM_MS = {
  flameBurst: 600,
  milestoneOverlay: 3400,
  splash: 1700,
  cardCelebrate: 1100,
} as const;

/** Minimalny rozmiar celu dotykowego (spec §8). */
export const MIN_TAP_PX = 44;
