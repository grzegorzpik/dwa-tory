// Jedyne źródło prawdy dla logiki dat/kalendarza (spec §8: "theme.ts +
// calendarUtils.ts importowane wszędzie" — Dziennik, Cele, Kreator i
// Kalendarz mają korzystać z tych samych funkcji, nie duplikować własnych).

export interface Ymd {
  year: number;
  month: number; // 0-11
  day: number;
}

export const DAY_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'] as const;

export const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
] as const;

export const monthAbbr = (month: number) => MONTH_NAMES[month].slice(0, 3).toLowerCase();

const MONTH_ABBR_TO_INDEX = new Map(MONTH_NAMES.map((_, i) => [monthAbbr(i), i]));

export const formatShortDate = (ymd: Ymd) => `${ymd.day} ${monthAbbr(ymd.month)}`;

/** Odwrotność formatShortDate — "12 sie" + rok odniesienia → Ymd. */
export const parseShortDate = (label: string, referenceYear: number): Ymd | null => {
  const [dayStr, abbr] = label.trim().split(/\s+/);
  const day = parseInt(dayStr, 10);
  const month = MONTH_ABBR_TO_INDEX.get(abbr);
  if (!day || month === undefined) return null;
  return { year: referenceYear, month, day };
};

export const today = (): Ymd => {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
};

export const toYmd = (date: Date): Ymd => ({ year: date.getFullYear(), month: date.getMonth(), day: date.getDate() });
export const toDate = (ymd: Ymd) => new Date(ymd.year, ymd.month, ymd.day);

export const addDays = (ymd: Ymd, n: number): Ymd => {
  const d = toDate(ymd);
  d.setDate(d.getDate() + n);
  return toYmd(d);
};

export const isSameDay = (a: Ymd, b: Ymd) => a.year === b.year && a.month === b.month && a.day === b.day;

/** Poniedziałek = 0 (spec/makiety liczą tydzień od poniedziałku). */
export const isoWeekday = (ymd: Ymd) => (toDate(ymd).getDay() + 6) % 7;

export const startOfWeek = (ymd: Ymd): Ymd => addDays(ymd, -isoWeekday(ymd));

/** Klucz stabilny do porównań/zapisu w bazie: YYYY-MM-DD. */
export const ymdKey = (ymd: Ymd) => `${ymd.year}-${String(ymd.month + 1).padStart(2, '0')}-${String(ymd.day).padStart(2, '0')}`;

/** Klucz bieżącego tygodnia (poniedziałek) — napędza reset licznika "X razy w tygodniu". */
export const currentWeekKey = () => ymdKey(startOfWeek(today()));

export const buildMonthGrid = (year: number, month: number): (number | null)[] => {
  const startOffset = isoWeekday({ year, month, day: 1 });
  const numDays = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

/** Ile razy w miesiącu wypada dana kadencja — napędza limit wersji minimalnej (spec §5.5). */
export const sessionsPerMonth = (
  cadenceType: 'daily' | 'weekdays' | 'perWeekCount' | 'monthly' | null,
  weekdaysCount: number,
  perWeekCount: number,
): number => {
  if (cadenceType === 'daily') return 30;
  if (cadenceType === 'weekdays') return weekdaysCount * 4.34;
  if (cadenceType === 'perWeekCount') return perWeekCount * 4.34;
  return 1;
};

export const minimalVersionCap = (sessions: number) => Math.max(1, Math.round(sessions * 0.25));
