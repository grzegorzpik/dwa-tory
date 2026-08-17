import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { buildMonthGrid, DAY_LABELS, MONTH_NAMES } from '../lib/calendarUtils';
import { C } from '../theme';

/** Siatka miesiąca do wielokrotnego użytku — start celu, dzień zadania, mapa kamieni, Kalendarz. */
export function MonthCalendar({
  year,
  month,
  onPrev,
  onNext,
  renderDay,
}: {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  renderDay: (day: number) => ReactNode;
}) {
  const grid = buildMonthGrid(year, month);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={onPrev} className="p-1 bg-transparent border-0 cursor-pointer" style={{ color: C.muted }} aria-label="Poprzedni miesiąc">
          <ChevronLeft size={16} />
        </button>
        <span className="font-head text-sm" style={{ color: C.text }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={onNext} className="p-1 bg-transparent border-0 cursor-pointer" style={{ color: C.muted }} aria-label="Następny miesiąc">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {DAY_LABELS.map((l) => (
          <div key={l} className="text-center font-body" style={{ fontSize: 8, color: C.muted }}>
            {l}
          </div>
        ))}
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {grid.map((d, i) => (d == null ? <div key={i} /> : <div key={i}>{renderDay(d)}</div>))}
      </div>
    </div>
  );
}
