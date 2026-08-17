import { Check, Undo2 } from 'lucide-react';
import { C } from '../theme';

/**
 * Wiersz "X razy w tygodniu" w Dzienniku — realny licznik tygodniowy, nie
 * pojedynczy dzień-slot. Bez tego różniłoby się od "konkretnych dni
 * tygodnia" wyłącznie etykietą, mimo innego sensu (spec §5.5: elastyczność
 * "kiedy wyjdzie w tym tygodniu" zamiast sztywnych dni).
 */
export function WeeklyProgress({
  count,
  target,
  color,
  onMarkDone,
  onUndo,
}: {
  count: number;
  target: number;
  color: string;
  onMarkDone: () => void;
  onUndo: () => void;
}) {
  const done = count >= target;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: target }).map((_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{ width: 9, height: 9, background: i < count ? color : C.surface2, border: `1.5px solid ${i < count ? color : C.line}` }}
            />
          ))}
        </div>
        <span className="font-body text-[10px]" style={{ color: C.muted }}>
          {count}/{target} w tym tygodniu
        </span>
      </div>
      <div className="flex gap-2 items-stretch">
        <button
          onClick={onMarkDone}
          disabled={done}
          className="font-body text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5 border-0 cursor-pointer flex-1"
          style={{ background: done ? C.surface2 : color, color: done ? C.muted : '#15241F', opacity: done ? 0.7 : 1 }}
        >
          <Check size={15} /> {done ? 'Zrobione na ten tydzień' : 'Zrobione'}
        </button>
        {count > 0 && (
          <button onClick={onUndo} className="font-body text-[10px] flex items-center gap-1 bg-transparent border-0 cursor-pointer px-2" style={{ color: C.muted }}>
            <Undo2 size={11} /> cofnij
          </button>
        )}
      </div>
    </div>
  );
}
