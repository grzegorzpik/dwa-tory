// Spec §5.6 — Kalendarz połączony ze statystykami. Mój/Wiola/Wspólny +
// Tydzień/Miesiąc, Wspólna seria (jedyny pełny gradient w apce), listy
// "Do zrobienia"/"Zrealizowane". Codzienne nawyki bez kamieni świadomie tu
// nie wchodzą — to widok dużych rzeczy, Dziennik jest od codzienności.
//
// Kliknięcie dnia (rozszerzenie na prośbę użytkownika, poza spec) otwiera
// podgląd tego dnia — patrz DayDetailModal.

import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { DayDetailModal } from '../components/DayDetailModal';
import { GoalDetailModal } from '../components/GoalDetailModal';
import { GoalDot } from '../components/GoalDot';
import { MonthCalendar } from '../components/MonthCalendar';
import {
  calendarMilestonesFor,
  dayEntriesFor,
  dayStatusFor,
  milestoneDateKey,
  mutualStreakDays,
  visibleGoals,
  type CalendarMilestone,
  type DayStatus,
} from '../lib/kalendarz';
import { milestonesFor } from '../lib/goals';
import { addDays, DAY_LABELS, MONTH_NAMES, monthAbbr, startOfWeek, today, ymdKey, type Ymd } from '../lib/calendarUtils';
import { useAppData } from '../store/AppDataContext';
import { C, TYPE_COLOR } from '../theme';
import type { Goal, Person } from '../types';

type ViewMode = 'mine' | 'partner' | 'both';
type Period = 'week' | 'month';

function colorForStatus(status: DayStatus, personColor: string): string {
  if (status === 'full') return personColor;
  if (status === 'partial') return `${personColor}66`;
  return C.surface2;
}

const WEEKDAY_NAMES = ['poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę', 'niedzielę'];

export function Kalendarz({ onEditGoal, onGoToDziennik }: { onEditGoal: (goal: Goal) => void; onGoToDziennik: () => void }) {
  const { currentUser, partner, goals, partnerGoals, settings } = useAppData();
  const [view, setView] = useState<ViewMode>(partner ? settings.defaultCalendarView : 'mine');
  const [period, setPeriod] = useState<Period>(settings.defaultCalendarPeriod);
  const [anchor, setAnchor] = useState<Ymd>(today());
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const t = today();
  const todayKey = ymdKey(t);
  const myVisible = visibleGoals(goals, true);
  const partnerVisible = partner ? visibleGoals(partnerGoals, false) : [];

  const showMine = view === 'mine' || view === 'both';
  const showPartner = (view === 'partner' || view === 'both') && !!partner;

  const peopleWithGoals: { person: Person; goals: Goal[]; isOwn: boolean }[] = [
    ...(showMine ? [{ person: currentUser, goals: myVisible, isOwn: true }] : []),
    ...(showPartner && partner ? [{ person: partner, goals: partnerVisible, isOwn: false }] : []),
  ];

  const milestones = calendarMilestonesFor(peopleWithGoals);
  const upcoming = milestones.filter((m) => !m.done).sort((a, b) => (milestoneDateKey(a, t.year) ?? '').localeCompare(milestoneDateKey(b, t.year) ?? ''));
  const doneList = milestones.filter((m) => m.done).slice().reverse();
  const upcomingShown = showAllUpcoming ? upcoming : upcoming.slice(0, 5);
  const doneShown = showAllDone ? doneList : doneList.slice(0, 5);

  const milestonesByDay = (dateKey: string) => milestones.filter((m) => milestoneDateKey(m, t.year) === dateKey);

  const selectedDayEntries = selectedDay ? dayEntriesFor(peopleWithGoals, selectedDay, t.year, selectedDay === todayKey) : [];
  const selectedDayLabel = selectedDay ? dayDetailLabel(selectedDay, todayKey) : '';

  return (
    <div className="rise flex flex-col gap-3 relative min-h-full">
      {selectedDay && (
        <DayDetailModal
          dateLabel={selectedDayLabel}
          isToday={selectedDay === todayKey}
          entries={selectedDayEntries}
          onEntryClick={(goal) => {
            setSelectedDay(null);
            setSelectedGoal(goal);
          }}
          onGoToDziennik={onGoToDziennik}
          onClose={() => setSelectedDay(null)}
        />
      )}
      {selectedGoal && (
        <GoalDetailModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onEdit={selectedGoal.personId === currentUser.id ? () => { onEditGoal(selectedGoal); setSelectedGoal(null); } : undefined}
        />
      )}

      {partner && (
        <div className="flex gap-1.5">
          {([
            { id: 'mine', label: 'Mój' },
            { id: 'partner', label: partner.name },
            { id: 'both', label: 'Wspólny' },
          ] as { id: ViewMode; label: string }[]).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setView(opt.id)}
              className="flex-1 font-body text-[11px] py-1.5 rounded-lg bg-transparent cursor-pointer"
              style={{ border: `1px solid ${view === opt.id ? C.gold : C.line}`, color: view === opt.id ? C.gold : C.muted, minHeight: 44 }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {view === 'both' && partner && (
        <div className="rounded-2xl py-4 flex flex-col items-center justify-center" style={{ background: `linear-gradient(135deg, ${currentUser.color}, ${partner.color})` }}>
          <div className="font-body text-[10px] uppercase tracking-wide" style={{ color: '#15241F', opacity: 0.75 }}>Wspólna seria</div>
          <div className="font-display text-3xl" style={{ color: '#15241F' }}>{mutualStreakDays(myVisible, partnerVisible, t)}</div>
        </div>
      )}

      <div className="flex justify-end gap-1.5">
        {([{ id: 'week', label: 'Tydzień' }, { id: 'month', label: 'Miesiąc' }] as { id: Period; label: string }[]).map((opt) => (
          <button
            key={opt.id}
            onClick={() => setPeriod(opt.id)}
            className="font-body text-[10px] px-2.5 py-1 rounded-full bg-transparent cursor-pointer"
            style={{ border: `1px solid ${period === opt.id ? C.gold : C.line}`, color: period === opt.id ? C.gold : C.muted, minHeight: 28 }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {period === 'week' ? (
        <WeekView anchor={anchor} onAnchorChange={setAnchor} view={view} currentUser={currentUser} partner={partner} myVisible={myVisible} partnerVisible={partnerVisible} milestonesByDay={milestonesByDay} today={t} onDayClick={setSelectedDay} />
      ) : (
        <MonthView anchor={anchor} onAnchorChange={setAnchor} view={view} currentUser={currentUser} partner={partner} myVisible={myVisible} partnerVisible={partnerVisible} milestonesByDay={milestonesByDay} today={t} onDayClick={setSelectedDay} />
      )}

      <div>
        <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Cele</div>
        {peopleWithGoals.every((p) => p.goals.length === 0) ? (
          <EmptyRow text="Brak celów do pokazania." />
        ) : (
          <div className="flex flex-col gap-2">
            {peopleWithGoals.flatMap(({ person, goals: personGoals }) =>
              personGoals.map((g) => (
                <GoalListRow key={g.id} goal={g} person={person} showAvatar={view === 'both'} onClick={() => setSelectedGoal(g)} />
              )),
            )}
          </div>
        )}
      </div>

      <div>
        <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Do zrobienia</div>
        {upcomingShown.length === 0 ? (
          <EmptyRow text="Brak nadchodzących kamieni." />
        ) : (
          <div className="flex flex-col gap-2">
            {upcomingShown.map((m) => (
              <MilestoneRow key={m.id} m={m} showAvatar={view === 'both'} person={m.personId === currentUser.id ? currentUser : partner} />
            ))}
          </div>
        )}
        {!showAllUpcoming && upcoming.length > 5 && <ShowMoreButton onClick={() => setShowAllUpcoming(true)} />}
      </div>

      <div>
        <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Zrealizowane</div>
        {doneShown.length === 0 ? (
          <EmptyRow text="Jeszcze żadnego kamienia." />
        ) : (
          <div className="flex flex-col gap-2">
            {doneShown.map((m) => (
              <MilestoneRow key={m.id} m={m} showAvatar={view === 'both'} person={m.personId === currentUser.id ? currentUser : partner} />
            ))}
          </div>
        )}
        {!showAllDone && doneList.length > 5 && <ShowMoreButton onClick={() => setShowAllDone(true)} />}
      </div>
    </div>
  );
}

function dayDetailLabel(dateKey: string, todayKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const ymd: Ymd = { year: y, month: m - 1, day: d };
  const base = `${d} ${MONTH_NAMES[m - 1].toLowerCase()} ${y}`;
  if (dateKey === todayKey) return `Dziś, ${base}`;
  return `${WEEKDAY_NAMES[startOfWeekIndex(ymd)]}, ${base}`;
}

function startOfWeekIndex(ymd: Ymd): number {
  // poniedziałek=0 — spójne z resztą kalendarza (calendarUtils.isoWeekday)
  return (new Date(ymd.year, ymd.month, ymd.day).getDay() + 6) % 7;
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="font-body text-[11px] text-center py-4" style={{ color: C.muted }}>
      {text}
    </div>
  );
}

function ShowMoreButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full font-body text-[10px] py-2 mt-1 bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}>
      Pokaż więcej
    </button>
  );
}

/** Lista celów widocznych w tej zakładce — dostępna od razu po dodaniu celu, bez czekania na kamień milowy czy pierwsze odhaczenie (na prośbę użytkownika, poza spec). */
function GoalListRow({ goal, person, showAvatar, onClick }: { goal: Goal; person: Person; showAvatar: boolean; onClick: () => void }) {
  const trackColor = TYPE_COLOR[goal.type];
  const milestones = milestonesFor(goal);
  const doneCount = milestones.filter((m) => m.done).length;
  const subtitle =
    goal.milestones.length > 0
      ? `${doneCount}/${goal.milestones.length} kamieni`
      : goal.character === 'habit'
        ? `nawyk · ${goal.cadenceLabel}`
        : goal.cadenceLabel;

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl px-3 py-2.5 flex items-center gap-3 cursor-pointer text-left border-0 bg-transparent"
      style={{ background: C.surface, border: `1px solid ${C.line}` }}
    >
      {showAvatar && <Avatar person={person} size={20} />}
      <GoalDot color={trackColor} character={goal.character} size={8} />
      <div className="flex-1 min-w-0">
        <div className="font-body text-[12px] truncate" style={{ color: C.text }}>{goal.title}</div>
        <div className="font-body text-[10px] truncate" style={{ color: C.muted }}>{subtitle}</div>
      </div>
      <ChevronRight size={14} style={{ color: C.muted }} className="shrink-0" />
    </button>
  );
}

function MilestoneRow({ m, showAvatar, person }: { m: CalendarMilestone; showAvatar: boolean; person: Person | null }) {
  return (
    <div className="rounded-xl px-3 py-2.5 flex items-center gap-3" style={{ background: C.surface, border: `1px solid ${C.line}`, opacity: m.done ? 0.5 : 1 }}>
      <div className="w-12 shrink-0 font-display text-sm text-center" style={{ color: C.gold }}>{m.date}</div>
      <div style={{ width: 1, height: 24, background: C.line }} />
      {showAvatar && person && <Avatar person={person} size={20} />}
      <div className="flex-1 min-w-0">
        <div className="font-body text-[12px] truncate" style={{ color: C.text, textDecoration: m.done ? 'line-through' : 'none' }}>{m.label}</div>
        <div className="font-body text-[10px] truncate" style={{ color: C.muted }}>{m.goalTitle}</div>
      </div>
      {m.done && <Check size={14} style={{ color: C.ok }} />}
    </div>
  );
}

interface PeriodViewProps {
  anchor: Ymd;
  onAnchorChange: (y: Ymd) => void;
  view: ViewMode;
  currentUser: Person;
  partner: Person | null;
  myVisible: ReturnType<typeof visibleGoals>;
  partnerVisible: ReturnType<typeof visibleGoals>;
  milestonesByDay: (dateKey: string) => CalendarMilestone[];
  today: Ymd;
  onDayClick: (dateKey: string) => void;
}

function DayBar({ dateKey, view, currentUser, partner, myVisible, partnerVisible }: Pick<PeriodViewProps, 'view' | 'currentUser' | 'partner' | 'myVisible' | 'partnerVisible'> & { dateKey: string }) {
  if (view === 'both' && partner) {
    const top = colorForStatus(dayStatusFor(myVisible, dateKey), currentUser.color);
    const bottom = colorForStatus(dayStatusFor(partnerVisible, dateKey), partner.color);
    return <div className="rounded-full" style={{ width: 5, alignSelf: 'stretch', background: `linear-gradient(to bottom, ${top} 50%, ${bottom} 50%)` }} />;
  }
  const person = view === 'partner' && partner ? partner : currentUser;
  const visible = view === 'partner' ? partnerVisible : myVisible;
  const color = colorForStatus(dayStatusFor(visible, dateKey), person.color);
  return <div className="rounded-full" style={{ width: 5, alignSelf: 'stretch', background: color }} />;
}

function WeekView({ anchor, onAnchorChange, view, currentUser, partner, myVisible, partnerVisible, milestonesByDay, today: t, onDayClick }: PeriodViewProps) {
  const weekStart = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const sameMonth = days[0].month === days[6].month;
  const periodLabel = sameMonth
    ? `${days[0].day}–${days[6].day} ${MONTH_NAMES[days[0].month]} ${days[0].year}`
    : `${days[0].day} ${monthAbbr(days[0].month)} – ${days[6].day} ${monthAbbr(days[6].month)}`;

  return (
    <div>
      <WeekNav label={periodLabel} onPrev={() => onAnchorChange(addDays(anchor, -7))} onNext={() => onAnchorChange(addDays(anchor, 7))} />
      <div className="flex flex-col gap-1.5">
        {days.map((d, i) => {
          const dateKey = ymdKey(d);
          const isToday = dateKey === ymdKey(t);
          const dayMilestones = milestonesByDay(dateKey);
          return (
            <button
              key={dateKey}
              onClick={() => onDayClick(dateKey)}
              className="rounded-xl px-3 py-2 flex items-center gap-3 cursor-pointer text-left border-0"
              style={{ background: C.surface, border: `1px solid ${isToday ? C.text : C.line}` }}
            >
              <DayBar dateKey={dateKey} view={view} currentUser={currentUser} partner={partner} myVisible={myVisible} partnerVisible={partnerVisible} />
              <div className="w-9 shrink-0">
                <div className="font-body text-[9px]" style={{ color: C.muted }}>{DAY_LABELS[i]}</div>
                <div className="font-display text-sm" style={{ color: C.text }}>{d.day}</div>
              </div>
              <div className="flex-1 min-w-0 font-body text-[11px] truncate" style={{ color: dayMilestones.length ? C.gold : C.muted }}>
                {dayMilestones.length > 0 ? dayMilestones.map((m) => m.label).join(', ') : '—'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({ anchor, onAnchorChange, view, currentUser, partner, myVisible, partnerVisible, milestonesByDay, today: t, onDayClick }: PeriodViewProps) {
  return (
    <div className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <MonthCalendar
        year={anchor.year}
        month={anchor.month}
        onPrev={() => onAnchorChange(addDays({ year: anchor.year, month: anchor.month, day: 1 }, -1))}
        onNext={() => onAnchorChange(addDays({ year: anchor.year, month: anchor.month, day: 28 }, 5))}
        renderDay={(d) => {
          const dateKey = ymdKey({ year: anchor.year, month: anchor.month, day: d });
          const isToday = dateKey === ymdKey(t);
          const hasMilestone = milestonesByDay(dateKey).length > 0;
          const bg =
            view === 'both' && partner
              ? `linear-gradient(to bottom, ${colorForStatus(dayStatusFor(myVisible, dateKey), currentUser.color)} 50%, ${colorForStatus(dayStatusFor(partnerVisible, dateKey), partner.color)} 50%)`
              : colorForStatus(dayStatusFor(view === 'partner' ? partnerVisible : myVisible, dateKey), (view === 'partner' && partner ? partner : currentUser).color);
          return (
            <button
              onClick={() => onDayClick(dateKey)}
              className="w-full aspect-square rounded-md flex items-center justify-center font-body cursor-pointer border-0"
              style={{ fontSize: 10, background: bg, color: C.text, border: `1.5px solid ${hasMilestone ? C.gold : isToday ? C.text : 'transparent'}` }}
            >
              {d}
            </button>
          );
        }}
      />
    </div>
  );
}

function WeekNav({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <button onClick={onPrev} className="font-body text-xs bg-transparent border-0 cursor-pointer px-2" style={{ color: C.muted, minHeight: 44 }}>‹</button>
      <span className="font-body text-[11px]" style={{ color: C.muted }}>{label}</span>
      <button onClick={onNext} className="font-body text-xs bg-transparent border-0 cursor-pointer px-2" style={{ color: C.muted, minHeight: 44 }}>›</button>
    </div>
  );
}
