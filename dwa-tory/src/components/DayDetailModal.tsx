// Podgląd dnia z Kalendarza (na prośbę użytkownika, wykracza poza spec
// §5.6): co się wydarzyło/dzieje się danego dnia dla widocznych celów.
// Kliknięcie wiersza otwiera GoalDetailModal (progres/ustawienia/edycja).
// "Przesuń" ma sens tylko dla żywego "dziś" (kaskada działa na
// curr/next, nie na dowolnym dniu z przeszłości) — dlatego dzisiejszy
// dzień dostaje skrót do Dziennika zamiast duplikowania tej logiki tutaj.

import { Check, ChevronRight, ExternalLink, Trash2, X } from 'lucide-react';
import { Avatar } from './Avatar';
import { GoalDot } from './GoalDot';
import { C, TYPE_COLOR } from '../theme';
import type { DayEntry, TaskEntry } from '../lib/kalendarz';
import type { Goal } from '../types';

const STATUS_LABEL: Record<'done' | 'moved' | 'skipped', string> = {
  done: 'Zrobione',
  moved: 'Przesunięte',
  skipped: 'Odpuszczone',
};

function StatusBadge({ status }: { status: DayEntry['status'] }) {
  if (!status) return null;
  const styles = {
    done: { border: C.ok, color: C.ok },
    moved: { border: C.gold, color: C.gold },
    skipped: { border: C.skipped, color: C.skipped },
  }[status];
  return (
    <span className="font-body text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ border: `1px solid ${styles.border}`, color: styles.color }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function DayDetailModal({
  dateLabel,
  isToday,
  entries,
  taskEntries,
  onEntryClick,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onGoToDziennik,
  onClose,
}: {
  dateLabel: string;
  isToday: boolean;
  entries: DayEntry[];
  /** Własne i (jeśli udostępnione) partnerki "Szybkie zadania" na ten dzień. */
  taskEntries: TaskEntry[];
  onEntryClick: (goal: Goal) => void;
  onToggleTask: (taskId: string) => void;
  onEditTask: (task: TaskEntry['task']) => void;
  onDeleteTask: (taskId: string) => void;
  onGoToDziennik: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(11,21,18,0.72)', backdropFilter: 'blur(4px)', zIndex: 40 }} onClick={onClose}>
      <div
        className="rise w-full rounded-2xl overflow-hidden flex flex-col"
        style={{ background: C.bg, border: `1px solid ${C.line}`, maxHeight: '85%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2" style={{ borderBottom: `1px solid ${C.line}` }}>
          <span className="font-head text-base" style={{ color: C.text }}>{dateLabel}</span>
          <button onClick={onClose} className="bg-transparent border-0 cursor-pointer shrink-0 flex items-center justify-center" style={{ color: C.muted, width: 32, height: 32, margin: '-4px' }} aria-label="Zamknij">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {isToday && (
            <button
              onClick={onGoToDziennik}
              className="w-full rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer text-left border-0"
              style={{ background: `${C.gold}1f`, border: `1px solid ${C.gold}55` }}
            >
              <span className="font-body text-[11px]" style={{ color: C.gold }}>
                Odhaczanie i przesuwanie dzisiejszych zadań — w Dzienniku
              </span>
              <ExternalLink size={13} style={{ color: C.gold }} className="shrink-0" />
            </button>
          )}

          {taskEntries.length > 0 && (
            <div className="flex flex-col gap-2">
              {taskEntries.map(({ task: t, isOwn, person }) => (
                <div key={t.id} className="w-full rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                  {isOwn ? (
                    <button
                      onClick={() => onToggleTask(t.id)}
                      aria-label={t.done ? 'Odznacz zadanie' : 'Zadanie zrobione'}
                      className="rounded-full flex items-center justify-center shrink-0 cursor-pointer bg-transparent"
                      style={{ width: 32, height: 32, margin: '-5px' }}
                    >
                      <span
                        className="rounded-full flex items-center justify-center"
                        style={{ width: 22, height: 22, border: `1.5px solid ${t.done ? C.gold : C.line}`, background: t.done ? C.gold : 'transparent' }}
                      >
                        {t.done && <Check size={12} style={{ color: '#15241F' }} />}
                      </span>
                    </button>
                  ) : (
                    <Avatar person={person} size={20} />
                  )}
                  {isOwn ? (
                    <button
                      onClick={() => onEditTask(t)}
                      className="flex-1 min-w-0 text-left bg-transparent border-0 p-0 cursor-pointer"
                      style={{ font: 'inherit' }}
                      aria-label={`Edytuj zadanie: ${t.title}`}
                    >
                      <div className="font-body text-[12px] truncate" style={{ color: t.done ? C.muted : C.text, textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</div>
                      {t.time && <div className="font-body text-[10px]" style={{ color: C.muted }}>{t.time}</div>}
                    </button>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="font-body text-[12px] truncate" style={{ color: t.done ? C.muted : C.text, textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</div>
                      {t.time && <div className="font-body text-[10px]" style={{ color: C.muted }}>{t.time}</div>}
                    </div>
                  )}
                  {isOwn && (
                    <button onClick={() => onDeleteTask(t.id)} aria-label="Usuń zadanie" className="bg-transparent border-0 cursor-pointer shrink-0 flex items-center justify-center" style={{ color: C.muted, width: 32, height: 32, margin: '-5px' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {entries.length === 0 && taskEntries.length === 0 ? (
            <div className="font-body text-[11px] text-center py-6" style={{ color: C.muted }}>
              Nic tu jeszcze nie ma.
            </div>
          ) : entries.length > 0 ? (
            <div className="flex flex-col gap-2">
              {entries.map((e) => (
                <button
                  key={e.goal.id}
                  onClick={() => onEntryClick(e.goal)}
                  className="w-full rounded-xl px-3 py-2.5 flex items-center gap-2.5 cursor-pointer text-left border-0"
                  style={{ background: C.surface, border: `1px solid ${C.line}` }}
                >
                  <GoalDot color={TYPE_COLOR[e.goal.type]} character={e.goal.character} size={8} />
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-[12px] truncate" style={{ color: C.text }}>{e.goal.title}</div>
                    {e.milestoneLabel && (
                      <div className="font-body text-[10px] truncate" style={{ color: C.gold }}>{e.milestoneLabel}</div>
                    )}
                    {!e.isOwn && <div className="font-body text-[9px]" style={{ color: C.muted }}>{e.person.name}</div>}
                  </div>
                  {e.status ? (
                    <StatusBadge status={e.status} />
                  ) : e.livePending ? (
                    <span className="font-body text-[10px]" style={{ color: C.muted }}>jeszcze nic</span>
                  ) : null}
                  <ChevronRight size={14} style={{ color: C.muted }} className="shrink-0" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
