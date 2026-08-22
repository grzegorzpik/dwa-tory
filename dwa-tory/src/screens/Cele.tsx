// Spec §5.4 — tylko moje cele. Kliknięcie karty → edycja. Kolor zawsze z
// TYPE_COLOR[goal.type], nigdy kolor osoby.

import { AlertTriangle, ChevronRight, Plus } from 'lucide-react';
import { GoalDot } from '../components/GoalDot';
import { MiniTrack } from '../components/MiniTrack';
import { milestonesFor, RESCHEDULE_WARNING_THRESHOLD } from '../lib/goals';
import { useAppData } from '../store/AppDataContext';
import { C, TYPE_COLOR } from '../theme';
import type { Goal } from '../types';

export function Cele({ onNewGoal, onEditGoal }: { onNewGoal: () => void; onEditGoal: (goal: Goal) => void }) {
  const { goals } = useAppData();

  return (
    <div className="rise">
      {goals.length === 0 ? (
        <div className="font-body text-xs text-center py-10" style={{ color: C.muted }}>
          Brak celów. Dodaj pierwszy poniżej.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} onClick={() => onEditGoal(g)} />
          ))}
        </div>
      )}
      <button
        onClick={onNewGoal}
        className="mt-2 w-full font-body text-[11px] py-2 rounded-lg flex items-center justify-center gap-1 bg-transparent cursor-pointer"
        style={{ border: `1px dashed ${C.line}`, color: C.muted, minHeight: 44 }}
      >
        <Plus size={13} /> Nowy cel
      </button>
    </div>
  );
}

function GoalCard({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const trackColor = TYPE_COLOR[goal.type];
  const milestones = milestonesFor(goal);
  const doneCount = milestones.filter((m) => m.done).length;
  const showSuggestion = goal.rescheduleCount >= RESCHEDULE_WARNING_THRESHOLD;

  return (
    <button onClick={onClick} className="w-full rounded-xl p-3 cursor-pointer flex items-start justify-between gap-2 text-left border-0" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <GoalDot color={trackColor} character={goal.character} size={8} />
          <span className="font-body text-xs" style={{ color: C.text }}>{goal.title}</span>
        </div>
        {goal.milestones.length > 0 ? (
          <>
            <MiniTrack goal={goal} color={trackColor} />
            <div className="font-body text-[10px] mt-1" style={{ color: C.muted }}>
              {doneCount}/{goal.milestones.length} kamieni
            </div>
          </>
        ) : (
          <div className="font-body text-[10px]" style={{ color: C.muted }}>
            {goal.character === 'habit' ? `nawyk · ${goal.cadenceLabel}` : goal.cadenceLabel}
          </div>
        )}
        {showSuggestion && (
          <div className="font-body text-[10px] flex items-center gap-1.5 mt-1.5 pt-1.5" style={{ color: C.gold, borderTop: `1px solid ${C.line}` }}>
            <AlertTriangle size={11} className="shrink-0" />
            {goal.rescheduleCount}× przesunięte — sprawdź tempo
          </div>
        )}
      </div>
      <ChevronRight size={15} style={{ color: C.muted }} className="shrink-0 mt-0.5" />
    </button>
  );
}
