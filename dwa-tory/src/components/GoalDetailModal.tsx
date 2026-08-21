// Podgląd szczegółów celu z Dziennika — dotychczasowy progres, perspektywa
// najbliższych zadań, wybrane ustawienia, wejście do edycji. Spec nie
// opisuje osobno tego ekranu (Cele idzie prosto do edycji — §5.4), to
// rozszerzenie na prośbę użytkownika: szybki podgląd bez wchodzenia w
// wieloetapowy kreator tylko po to, żeby zobaczyć postęp.

import type { ReactNode } from 'react';
import { CalendarPlus, Pencil, Users, CalendarSync, X } from 'lucide-react';
import { DayChip } from './DayChip';
import { GoalDot } from './GoalDot';
import { MiniTrack } from './MiniTrack';
import { milestonesFor, weekProgressFor } from '../lib/goals';
import { icsDataUri } from '../lib/ics';
import { C, TYPE_COLOR } from '../theme';
import type { Goal } from '../types';

const CHARACTER_LABEL: Record<Goal['character'], string> = {
  habit: 'Nawyk bez końca',
  termin: 'Cel z terminem',
  cyclicalContent: 'Cel z etapami',
};

export function GoalDetailModal({ goal, onClose, onEdit }: { goal: Goal; onClose: () => void; onEdit?: () => void }) {
  const trackColor = TYPE_COLOR[goal.type];
  const milestones = milestonesFor(goal);
  const doneCount = milestones.filter((m) => m.done).length;
  const upcoming = milestones.filter((m) => !m.done).slice(0, 4);
  const [labelCurr, labelNext] = goal.cadenceSlots;

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(11,21,18,0.72)', backdropFilter: 'blur(4px)', zIndex: 40 }} onClick={onClose}>
      <div
        className="rise w-full rounded-2xl overflow-hidden flex flex-col"
        style={{ background: C.bg, border: `1px solid ${C.line}`, maxHeight: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2" style={{ borderBottom: `1px solid ${C.line}` }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <GoalDot color={trackColor} character={goal.character} size={9} />
              <span className="font-head text-base truncate" style={{ color: C.text }}>{goal.title}</span>
            </div>
            <div className="font-body text-[10px]" style={{ color: C.muted }}>{CHARACTER_LABEL[goal.character]}</div>
          </div>
          <button onClick={onClose} className="bg-transparent border-0 cursor-pointer shrink-0 flex items-center justify-center" style={{ color: C.muted, width: 32, height: 32, margin: '-4px' }} aria-label="Zamknij">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
          <div>
            <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Dotychczasowy progres</div>
            {typeof goal.completedSessions === 'number' ? (
              <div className="rounded-xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                <div className="flex items-baseline gap-1 mb-1.5">
                  <span className="font-display text-2xl" style={{ color: trackColor }}>{goal.completedSessions}</span>
                  <span className="font-body text-xs" style={{ color: C.muted }}>/ {goal.targetValue} {goal.targetUnit}</span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 5, background: C.surface2 }}>
                  <div style={{ width: `${Math.min(100, (goal.completedSessions / (parseInt(goal.targetValue ?? '1', 10) || 1)) * 100)}%`, height: '100%', background: trackColor }} />
                </div>
              </div>
            ) : goal.milestones.length > 0 ? (
              <div className="rounded-xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                <div className="font-body text-xs mb-2" style={{ color: C.text }}>{doneCount}/{goal.milestones.length} etapów</div>
                <MiniTrack goal={goal} color={trackColor} />
              </div>
            ) : (
              <div className="rounded-xl p-3 font-body text-[11px]" style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.muted }}>
                Nawyk bez mety — liczy się regularność, nie liczba.
              </div>
            )}
          </div>

          <div>
            <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Co dalej</div>
            {goal.cadenceType === 'perWeekCount' ? (
              (() => {
                const { count, target } = weekProgressFor(goal);
                return <div className="font-body text-xs" style={{ color: C.text }}>{count}/{target} w tym tygodniu</div>;
              })()
            ) : upcoming.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {upcoming.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                    <span className="font-display text-xs shrink-0" style={{ color: trackColor }}>{m.date}</span>
                    <span className="font-body text-[11px] truncate" style={{ color: C.text }}>{m.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <DayChip label={labelCurr} inst={goal.instance.curr} color={trackColor} />
                <div style={{ width: 12, height: 1, background: C.line }} />
                <DayChip label={labelNext} inst={goal.instance.next} color={trackColor} />
              </div>
            )}
          </div>

          <div>
            <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Ustawienia</div>
            <div className="rounded-xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <SettingRow label="Kadencja" value={goal.cadenceLabel} />
              <SettingRow label="Start" value={goal.start} />
              {goal.anchor && <SettingRow label="Kotwica" value={`po: ${goal.anchor}`} />}
              {goal.minimalVersion && <SettingRow label="Wersja minimalna" value={goal.minimalVersion} />}
              <SettingRow
                label="Widoczne dla partnerki"
                value={goal.visibleToPartner ? 'Tak' : 'Nie'}
                icon={<Users size={12} style={{ color: C.muted }} />}
              />
              <SettingRow
                label="Sync z kalendarzem"
                value={goal.syncToPhoneCalendar ? 'Tak' : 'Nie'}
                icon={<CalendarSync size={12} style={{ color: C.muted }} />}
                last
              />
            </div>
            {goal.syncToPhoneCalendar && (
              <a
                href={icsDataUri(goal)}
                className="mt-2 w-full font-body text-[11px] py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                style={{ border: `1px solid ${trackColor}`, color: trackColor, minHeight: 44, textDecoration: 'none' }}
              >
                <CalendarPlus size={13} /> Dodaj do Kalendarza (iPhone)
              </a>
            )}
          </div>

          {goal.reason && <div className="font-body text-[11px] italic" style={{ color: C.muted }}>„{goal.reason}”</div>}
        </div>

        {onEdit && (
          <div className="px-4 pb-4 pt-2 shrink-0">
            <button
              onClick={onEdit}
              className="w-full font-body text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 border-0 cursor-pointer"
              style={{ background: trackColor, color: '#15241F' }}
            >
              <Pencil size={14} /> Edytuj cel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingRow({ label, value, icon, last }: { label: string; value: string; icon?: ReactNode; last?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: last ? 'none' : `1px solid ${C.line}` }}>
      <span className="font-body text-[11px] flex items-center gap-1.5" style={{ color: C.muted }}>
        {icon}
        {label}
      </span>
      <span className="font-body text-[11px]" style={{ color: C.text }}>{value}</span>
    </div>
  );
}
