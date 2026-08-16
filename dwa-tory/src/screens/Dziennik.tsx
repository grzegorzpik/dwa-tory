// Spec §5.3 — ekran główny. Jedna karta ze wszystkimi torami użytkownika
// (nie stos osobnych kart), hierarchia "Zrobione" > "przesuń", kaskada
// przesuwania z konfliktem, kamienie milowe, "Czas dla siebie" opcjonalnie.

import { useState } from 'react';
import { Check, CalendarClock, ChevronDown, Info, X, Flame, Sparkles, Heart, Undo2 } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { DayChip } from '../components/DayChip';
import { MiniTrack } from '../components/MiniTrack';
import { MilestoneOverlay } from '../components/MilestoneOverlay';
import { useAppData } from '../store/AppDataContext';
import { C, TYPE_COLOR } from '../theme';
import type { Goal } from '../types';

export function Dziennik() {
  const {
    currentUser,
    goals,
    justCompleted,
    celebrateAllDone,
    milestoneCelebration,
    markDone,
    undoDone,
    requestMove,
    resolveDoubleUp,
    resolveDrop,
    settings,
  } = useAppData();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState<string | null>(null);
  const [selfTimeActive, setSelfTimeActive] = useState<string | null>(null); // duration label albo null

  const allDoneToday = goals.length > 0 && goals.every((g) => g.instance.curr.status === 'done');
  const streakAlpha = Math.min(48, currentUser.streak * 3).toString(16).padStart(2, '0');

  const handleMove = (goalId: string) => {
    const needsDecision = requestMove(goalId);
    if (needsDecision) setConflict(goalId);
  };

  const handleMarkDone = (goalId: string) => {
    markDone(goalId, noteDrafts[goalId] || '');
  };

  return (
    <div className="rise relative">
      {milestoneCelebration && (
        <MilestoneOverlay
          goalTitle={milestoneCelebration.goalTitle}
          milestoneLabel={milestoneCelebration.milestone.label}
          color={milestoneCelebration.color}
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
          <Avatar person={currentUser} size={22} />
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
            Brak celów. Dodaj pierwszy w zakładce „Cele”.
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
                    onClick={() => setSelfTimeActive(d)}
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

  return (
    <div style={{ borderTop: isFirst ? 'none' : `1px solid ${C.line}`, paddingTop: isFirst ? 0 : 10 }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: trackColor }} />
        <span className="font-body text-[12px] truncate" style={{ color: C.text }}>
          {goal.title}
        </span>
        {goal.milestones.length > 0 && (
          <div className="flex-1 min-w-[24px]">
            <MiniTrack goal={goal} color={trackColor} />
          </div>
        )}
      </div>

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
              placeholder="Notatka (opcjonalnie, tylko do wglądu)"
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
    </div>
  );
}
