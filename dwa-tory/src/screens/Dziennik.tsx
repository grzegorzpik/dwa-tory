// Spec §5.3 — ekran główny. Jedna karta ze wszystkimi torami użytkownika
// (nie stos osobnych kart), hierarchia "Zrobione" > "przesuń", kaskada
// przesuwania z konfliktem, kamienie milowe, "Czas dla siebie" opcjonalnie.

import { useState } from 'react';
import { Check, CalendarClock, ChevronDown, ChevronRight, Info, Plus, X, Flame, Sparkles, Heart, Trash2, Undo2 } from 'lucide-react';
import { DayChip } from '../components/DayChip';
import { GoalDetailModal } from '../components/GoalDetailModal';
import { GoalDot } from '../components/GoalDot';
import { MiniTrack } from '../components/MiniTrack';
import { MilestoneOverlay } from '../components/MilestoneOverlay';
import { WeeklyProgress } from '../components/WeeklyProgress';
import { ymdKey, today } from '../lib/calendarUtils';
import { weekProgressFor } from '../lib/goals';
import { useAppData } from '../store/AppDataContext';
import { C, TYPE_COLOR } from '../theme';
import type { Goal, Task } from '../types';

export function Dziennik({
  onEditGoal,
  onEditTask,
  onNewGoal,
}: {
  onEditGoal: (goal: Goal) => void;
  onEditTask: (task: Task) => void;
  /** Kreator (nowy cel ALBO szybkie zadanie) — dotąd dostępny tylko z zakładki "Cele" (zgłoszenie UX: brak dostępu z Dziennika). */
  onNewGoal: () => void;
}) {
  const {
    currentUser,
    goals,
    tasks,
    toggleTaskDone,
    removeTask,
    justCompleted,
    celebrateAllDone,
    milestoneCelebration,
    markDone,
    undoDone,
    requestMove,
    resolveDoubleUp,
    resolveDrop,
    settings,
    sendSelfTimeSignal,
  } = useAppData();

  const todayTasks = tasks.filter((t) => t.date === ymdKey(today()));

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState<string | null>(null);
  const [selfTimeActive, setSelfTimeActive] = useState<string | null>(null); // duration label albo null
  const [detailGoal, setDetailGoal] = useState<Goal | null>(null);

  const allDoneToday = goals.length > 0 && goals.every((g) => g.instance.curr.status === 'done');
  const streakAlpha = Math.min(48, currentUser.streak * 3).toString(16).padStart(2, '0');

  const handleMove = (goalId: string) => {
    const needsDecision = requestMove(goalId);
    if (needsDecision) setConflict(goalId);
  };

  const handleMarkDone = (goalId: string) => {
    markDone(goalId, noteDrafts[goalId] || '');
  };

  // Trzymamy referencję na żywo, żeby modal detali odświeżał się po akcji (np. "Zrobione" kliknięte z modala w przyszłości).
  const liveDetailGoal = detailGoal ? goals.find((g) => g.id === detailGoal.id) ?? null : null;

  return (
    <div className="rise relative min-h-full">
      <h1 className="font-head text-lg mb-3" style={{ color: C.text }}>Plan na dziś</h1>

      {milestoneCelebration && (
        <MilestoneOverlay
          goalTitle={milestoneCelebration.goalTitle}
          milestoneLabel={milestoneCelebration.milestone.label}
          color={milestoneCelebration.color}
        />
      )}

      {liveDetailGoal && (
        <GoalDetailModal
          goal={liveDetailGoal}
          onClose={() => setDetailGoal(null)}
          onEdit={() => {
            onEditGoal(liveDetailGoal);
            setDetailGoal(null);
          }}
        />
      )}

      <div
        className={`rounded-2xl p-3 mb-3 ${celebrateAllDone ? 'card-celebrate' : ''}`}
        style={{
          background: `linear-gradient(135deg, ${currentUser.color}${streakAlpha}, ${C.surface} 60%)`,
          border: `1px solid ${allDoneToday ? C.gold : C.line}`,
        }}
      >
        <div className="flex items-center justify-between mb-3 relative">
          <span className="font-body text-[11px]" style={{ color: C.muted }}>Cele</span>
          <span
            className={`font-body text-[10px] flex items-center gap-0.5 shrink-0 ${justCompleted ? 'flame-burst' : ''}`}
            style={{ color: C.gold }}
          >
            <Flame size={11} /> {currentUser.streak}
          </span>
          {celebrateAllDone && (
            <>
              <Sparkles size={10} className="sparkle" style={{ color: C.gold, right: 28, top: -2 }} />
              <Sparkles size={8} className="sparkle" style={{ color: C.gold, right: 44, top: 4, animationDelay: '0.15s' }} />
              <Sparkles size={9} className="sparkle" style={{ color: C.gold, right: 12, top: 6, animationDelay: '0.3s' }} />
            </>
          )}
        </div>

        {goals.length === 0 ? (
          <div className="font-body text-xs text-center py-6" style={{ color: C.muted }}>
            Brak celów. Dodaj pierwszy poniżej.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {goals.map((g, gi) => (
              <GoalTrack
                key={g.id}
                goal={g}
                isFirst={gi === 0}
                showConflict={conflict === g.id}
                expanded={!!expanded[g.id]}
                noteOpen={!!noteOpen[g.id]}
                noteDraft={noteDrafts[g.id] || ''}
                onOpenDetail={() => setDetailGoal(g)}
                onToggleExpanded={() => setExpanded((e) => ({ ...e, [g.id]: !e[g.id] }))}
                onOpenNote={() => setNoteOpen((n) => ({ ...n, [g.id]: true }))}
                onNoteChange={(v) => setNoteDrafts((n) => ({ ...n, [g.id]: v }))}
                onMarkDone={() => handleMarkDone(g.id)}
                onUndoDone={() => undoDone(g.id)}
                onStartMove={() => handleMove(g.id)}
                onDoubleUp={() => {
                  resolveDoubleUp(g.id);
                  setConflict(null);
                }}
                onDrop={(which) => {
                  resolveDrop(g.id, which);
                  setConflict(null);
                }}
                onCancelConflict={() => setConflict(null)}
              />
            ))}
          </div>
        )}

        {settings.selfTimeEnabled && (
          <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10, marginTop: 4 }}>
            {selfTimeActive ? (
              <div className="flex items-center justify-between">
                <span className="font-body text-[11px] flex items-center gap-1.5" style={{ color: C.gold }}>
                  <Heart size={12} /> Czas dla siebie: {selfTimeActive}
                </span>
                <button onClick={() => setSelfTimeActive(null)} className="font-body text-[10px] bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}>
                  zakończ
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-body text-[11px] mr-1" style={{ color: C.muted }}>
                  Czas dla siebie:
                </span>
                {['1h', '2h', 'Wieczór'].map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setSelfTimeActive(d);
                      sendSelfTimeSignal(d);
                    }}
                    className="font-body text-[10px] px-2 py-1 rounded-full bg-transparent cursor-pointer"
                    style={{ border: `1px solid ${C.line}`, color: C.muted }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {todayTasks.length > 0 && (
        <div className="rounded-2xl p-3 mb-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Zadania</div>
          <div className="flex flex-col gap-1.5">
            {todayTasks.map((t) => (
              <TaskRow key={t.id} title={t.title} time={t.time} done={t.done} onToggle={() => toggleTaskDone(t.id)} onEdit={() => onEditTask(t)} onDelete={() => removeTask(t.id)} />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onNewGoal}
        className="w-full font-body text-[11px] py-2 rounded-lg flex items-center justify-center gap-1 bg-transparent cursor-pointer"
        style={{ border: `1px dashed ${C.line}`, color: C.muted, minHeight: 44 }}
      >
        <Plus size={13} /> Nowy cel / zadanie
      </button>
    </div>
  );
}

/**
 * Cały wiersz poza checkboxem/usuwaniem to przycisk "edytuj" — nie mała
 * ikonka (zgłoszenie UX: ikony przejścia do edycji były za małe). Checkbox
 * i usuwanie są osobnymi przyciskami obok, nie zagnieżdżonymi w nim.
 */
function TaskRow({ title, time, done, onToggle, onEdit, onDelete }: { title: string; time?: string; done: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        aria-label={done ? 'Odznacz zadanie' : 'Zadanie zrobione'}
        className="rounded-full flex items-center justify-center shrink-0 cursor-pointer bg-transparent"
        style={{ width: 32, height: 32, margin: '-5px' }}
      >
        <span
          className="rounded-full flex items-center justify-center"
          style={{ width: 22, height: 22, border: `1.5px solid ${done ? C.gold : C.line}`, background: done ? C.gold : 'transparent' }}
        >
          {done && <Check size={12} style={{ color: '#15241F' }} />}
        </span>
      </button>
      <button
        onClick={onEdit}
        className="flex-1 min-w-0 text-left bg-transparent border-0 p-0 cursor-pointer"
        style={{ font: 'inherit' }}
        aria-label={`Edytuj zadanie: ${title}`}
      >
        <div className="font-body text-[12px] truncate" style={{ color: done ? C.muted : C.text, textDecoration: done ? 'line-through' : 'none' }}>{title}</div>
        {time && <div className="font-body text-[10px]" style={{ color: C.muted }}>{time}</div>}
      </button>
      <button onClick={onDelete} aria-label="Usuń zadanie" className="bg-transparent border-0 cursor-pointer shrink-0 flex items-center justify-center" style={{ color: C.muted, width: 32, height: 32, margin: '-5px' }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function GoalTrack({
  goal,
  isFirst,
  showConflict,
  expanded,
  noteOpen,
  noteDraft,
  onOpenDetail,
  onToggleExpanded,
  onOpenNote,
  onNoteChange,
  onMarkDone,
  onUndoDone,
  onStartMove,
  onDoubleUp,
  onDrop,
  onCancelConflict,
}: {
  goal: Goal;
  isFirst: boolean;
  showConflict: boolean;
  expanded: boolean;
  noteOpen: boolean;
  noteDraft: string;
  onOpenDetail: () => void;
  onToggleExpanded: () => void;
  onOpenNote: () => void;
  onNoteChange: (v: string) => void;
  onMarkDone: () => void;
  onUndoDone: () => void;
  onStartMove: () => void;
  onDoubleUp: () => void;
  onDrop: (which: 'curr' | 'next') => void;
  onCancelConflict: () => void;
}) {
  const [labelCurr, labelNext] = goal.cadenceSlots;
  const trackColor = TYPE_COLOR[goal.type];
  const isWeekly = goal.cadenceType === 'perWeekCount';

  return (
    <div style={{ borderTop: isFirst ? 'none' : `1px solid ${C.line}`, paddingTop: isFirst ? 0 : 10 }}>
      <button
        onClick={onOpenDetail}
        className="w-full flex items-center gap-2 mb-2 bg-transparent border-0 p-0 text-left cursor-pointer"
        style={{ font: 'inherit' }}
        aria-label={`Szczegóły celu: ${goal.title}`}
      >
        <GoalDot color={trackColor} character={goal.character} size={8} />
        <span className="font-body text-[12px] truncate" style={{ color: C.text }}>
          {goal.title}
        </span>
        {goal.milestones.length > 0 && (
          <div className="flex-1 min-w-[24px]">
            <MiniTrack goal={goal} color={trackColor} />
          </div>
        )}
        <ChevronRight size={13} className="shrink-0 ml-auto" style={{ color: C.muted }} />
      </button>

      {isWeekly ? (
        (() => {
          const { count, target } = weekProgressFor(goal);
          return (
            <div className="flex flex-col gap-2">
              {noteOpen && (
                <input
                  value={noteDraft}
                  onChange={(e) => onNoteChange(e.target.value)}
                  placeholder="Notatka (opcjonalnie, nic nie zmienia)"
                  autoFocus
                  className="w-full font-body text-xs px-2.5 py-1.5 rounded-lg outline-none rise"
                  style={{ background: C.surface2, color: C.text, border: `1px solid ${C.line}` }}
                />
              )}
              <WeeklyProgress count={count} target={target} color={trackColor} onMarkDone={onMarkDone} onUndo={onUndoDone} />
              {!noteOpen && count < target && (
                <button onClick={onOpenNote} className="font-body text-[10px] self-start bg-transparent border-0 p-0 cursor-pointer" style={{ color: C.muted, fontSize: 10 }}>
                  + notatka
                </button>
              )}
            </div>
          );
        })()
      ) : (
        <>
          <button
            onClick={onToggleExpanded}
            className="w-full flex items-center gap-2 mb-2 bg-transparent border-0 p-0 text-left cursor-pointer"
            style={{ font: 'inherit' }}
          >
            <DayChip label={labelCurr} inst={goal.instance.curr} color={trackColor} />
            <div style={{ width: 12, height: 1, background: C.line }} />
            <DayChip label={labelNext} inst={goal.instance.next} color={trackColor} />
            {goal.instance.curr.note && (
              <ChevronDown size={13} className="ml-auto transition-transform" style={{ color: C.muted, transform: expanded ? 'rotate(180deg)' : 'none' }} />
            )}
          </button>

          {expanded && goal.instance.curr.status === 'done' && goal.instance.curr.note && (
            <div className="font-body text-[11px] italic mb-1 rise" style={{ color: C.muted }}>
              „{goal.instance.curr.note}”
            </div>
          )}

          {goal.instance.curr.status === 'done' && (
            <button
              onClick={onUndoDone}
              className="font-body text-[10px] flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer"
              style={{ color: C.muted }}
            >
              <Undo2 size={11} /> cofnij
            </button>
          )}

          {goal.instance.curr.status === 'plan' && !showConflict && (
            <div className="flex flex-col gap-2">
              {noteOpen && (
                <input
                  value={noteDraft}
                  onChange={(e) => onNoteChange(e.target.value)}
                  placeholder="Notatka (opcjonalnie, nic nie zmienia)"
                  autoFocus
                  className="w-full font-body text-xs px-2.5 py-1.5 rounded-lg outline-none rise"
                  style={{ background: C.surface2, color: C.text, border: `1px solid ${C.line}` }}
                />
              )}
              <div className="flex gap-2 items-stretch">
                <button
                  onClick={onMarkDone}
                  className="font-body text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5 border-0 cursor-pointer"
                  style={{ background: trackColor, color: '#15241F', flex: '3 1 0%' }}
                >
                  <Check size={15} /> Zrobione
                </button>
                <button
                  onClick={onStartMove}
                  className="font-body text-[10px] py-1 rounded-lg flex items-center justify-center gap-1 bg-transparent border-0 cursor-pointer"
                  style={{ color: C.muted, fontSize: 10, flex: '1 1 0%' }}
                >
                  <CalendarClock size={11} /> przesuń
                </button>
              </div>
              {!noteOpen && (
                <button onClick={onOpenNote} className="font-body text-[10px] self-start bg-transparent border-0 p-0 cursor-pointer" style={{ color: C.muted, fontSize: 10 }}>
                  + notatka
                </button>
              )}
            </div>
          )}

          {showConflict && (
            <div className="rounded-xl p-3 mt-1 rise" style={{ background: C.surface2, border: `1px solid ${C.gold}55` }}>
              <div className="font-body text-[11px] flex items-start gap-1.5 mb-2" style={{ color: C.gold }}>
                <Info size={13} className="mt-0.5 shrink-0" /> {labelNext} masz już zaplanowane. Co zrobić?
              </div>
              <button onClick={onDoubleUp} className="w-full font-body text-[11px] py-2 rounded-lg border-0 cursor-pointer" style={{ background: trackColor, color: '#15241F' }}>
                Zrób oba naraz (2×)
              </button>
              <div className="flex gap-1.5 mt-1.5">
                <button onClick={() => onDrop('curr')} className="flex-1 font-body text-[11px] py-1.5 rounded-lg bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.muted }}>
                  Odpuść {labelCurr.toLowerCase()}
                </button>
                <button onClick={() => onDrop('next')} className="flex-1 font-body text-[11px] py-1.5 rounded-lg bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.muted }}>
                  Odpuść {labelNext.toLowerCase()}
                </button>
              </div>
              <button onClick={onCancelConflict} className="w-full font-body text-[10px] py-1.5 mt-1 flex items-center justify-center gap-1 bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}>
                <X size={11} /> Anuluj
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
