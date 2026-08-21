// Kreator/Edytor celu — spec §5.5. Jeden komponent w dwóch trybach: nowy cel
// (z FAB) i edycja (z karty celu w Cele). Pełne drzewo decyzyjne: typ →
// charakter → kadencja/start/kotwica → wersja minimalna → (opcjonalnie)
// kamienie milowe → podsumowanie z widocznością dla partnerki i sync z
// kalendarzem telefonu.

import { useState } from 'react';
import { ChevronLeft, Flag, Plus, Repeat, Shield, Target, X, Zap } from 'lucide-react';
import { GoalDot } from '../components/GoalDot';
import { MonthCalendar } from '../components/MonthCalendar';
import { OptionCard } from '../components/OptionCard';
import { SelectChip } from '../components/SelectChip';
import { ToggleSwitch } from '../components/ToggleSwitch';
import {
  canProceed,
  cadenceLabel,
  emptyFormState,
  formStateToGoal,
  goalToFormState,
  isMilestoneStep,
  isSummaryStep,
  isTask,
  minimalCapLabel,
  startLabel,
  totalSteps,
  trackColorFor,
  type GoalFormState,
} from '../lib/goalForm';
import { DAY_LABELS, monthAbbr, today } from '../lib/calendarUtils';
import { shareOrOpenIcsForGoal } from '../lib/ics';
import { useAppData } from '../store/AppDataContext';
import { C } from '../theme';
import type { Goal } from '../types';

export function GoalEditor({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { currentUser, saveGoal, removeGoal } = useAppData();
  const isEditMode = !!goal;

  const [form, setForm] = useState<GoalFormState>(() => (goal ? goalToFormState(goal) : emptyFormState()));
  const [step, setStep] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const t = today();
  const [calYear, setCalYear] = useState(t.year);
  const [calMonth, setCalMonth] = useState(t.month);

  const patch = (p: Partial<GoalFormState>) => setForm((f) => ({ ...f, ...p }));

  const changeCalMonth = (delta: number) => {
    let m = calMonth + delta;
    let y = calYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setCalMonth(m);
    setCalYear(y);
  };

  const steps = totalSteps(form);
  const trackColor = trackColorFor(form.character);
  const hasData = form.name.trim().length > 0 || !!form.kind;

  const handleBack = () => {
    if (step === 0) {
      if (hasData && !isEditMode) setConfirmExit(true);
      else onClose();
    } else {
      setStep((s) => s - 1);
    }
  };

  const submit = () => {
    if (isTask(form)) {
      // Spec §4 nie definiuje osobnego modelu dla "szybkiego zadania" — to
      // jednorazowa rzecz bez śledzenia, docelowo do jednokierunkowej
      // synchronizacji z kalendarzem telefonu (krok 10, jeszcze nie
      // zbudowany). Świadomie nie zapisujemy jej jako Goal.
      onClose();
      return;
    }
    const savedGoal = formStateToGoal(form, currentUser.id, goal);
    saveGoal(savedGoal);
    // Sync z kalendarzem telefonu (krok 10) — jeśli WŁAŚNIE się włączył (nowy
    // cel z sync=true, albo edycja z wyłączonego na włączony), pokaż arkusz
    // "Dodaj do kalendarza" od razu, zamiast zostawiać to jako osobną
    // czynność wymagającą ponownego wejścia w podgląd celu. Bez re-triggera
    // przy zwykłym zapisie edycji z sync już wcześniej włączonym — nie ma
    // co nagabywać przy każdej drobnej poprawce. Wywołanie MUSI być
    // synchroniczne (patrz lib/ics.ts) — nie awaitować niczego przed nim.
    const syncJustEnabled = savedGoal.syncToPhoneCalendar && !goal?.syncToPhoneCalendar;
    if (syncJustEnabled) {
      shareOrOpenIcsForGoal(savedGoal);
    }
    onClose();
  };

  const toggleWeekday = (i: number) => patch({ weekdays: form.weekdays.includes(i) ? form.weekdays.filter((x) => x !== i) : [...form.weekdays, i] });

  const dateKey = (d: { day: number; month: number; year: number }) => `${d.year}-${d.month}-${d.day}`;
  const toggleMilestoneDay = (day: number) => {
    const key = dateKey({ day, month: calMonth, year: calYear });
    const exists = form.milestoneDates.some((m) => dateKey(m) === key);
    if (exists) {
      patch({ milestoneDates: form.milestoneDates.filter((m) => dateKey(m) !== key) });
    } else {
      const next = [...form.milestoneDates, { day, month: calMonth, year: calYear, label: '' }].sort(
        (a, b) => a.year - b.year || a.month - b.month || a.day - b.day,
      );
      patch({ milestoneDates: next });
    }
  };
  const updateMilestoneLabel = (key: string, label: string) =>
    patch({ milestoneDates: form.milestoneDates.map((m) => (dateKey(m) === key ? { ...m, label } : m)) });
  const removeMilestoneDate = (key: string) => patch({ milestoneDates: form.milestoneDates.filter((m) => dateKey(m) !== key) });

  const canGoNext = canProceed(form, step);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={handleBack} className="p-1 bg-transparent border-0 cursor-pointer" style={{ color: C.muted, minWidth: 44, minHeight: 44 }} aria-label="Wstecz">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 flex gap-1">
            {Array.from({ length: steps }).map((_, i) => (
              <div key={i} className="flex-1 rounded-full" style={{ height: 3, background: i <= step ? trackColor : C.line }} />
            ))}
          </div>
        </div>
        <h1 className="font-display text-2xl" style={{ color: C.text }}>
          {isEditMode ? 'EDYTUJ' : 'NOWY'} <span style={{ color: C.gold }}>CEL</span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
        {confirmExit ? (
          <div className="rise rounded-2xl p-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
            <div className="font-body text-xs mb-3" style={{ color: C.text }}>
              Porzucić to, co wpisałeś? Nic się nie zapisze.
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 font-body text-[11px] py-2 rounded-lg border-0 cursor-pointer" style={{ background: C.over, color: '#15241F' }}>
                Tak, porzuć
              </button>
              <button onClick={() => setConfirmExit(false)} className="flex-1 font-body text-[11px] py-2 rounded-lg bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.muted }}>
                Wróć i dokończ
              </button>
            </div>
          </div>
        ) : (
          <>
            {step === 0 && (
              <div className="rise flex flex-col gap-4">
                <div>
                  <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Jak to nazwać?</div>
                  <input
                    value={form.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    placeholder="np. Codzienna medytacja"
                    autoFocus
                    className="w-full font-body text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
                  />
                </div>
                <div>
                  <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Dlaczego to robisz? (opcjonalnie)</div>
                  <input
                    value={form.reason}
                    onChange={(e) => patch({ reason: e.target.value })}
                    placeholder="np. żeby mieć więcej energii"
                    className="w-full font-body text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
                  />
                </div>
                <div>
                  <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Co dodajesz?</div>
                  <div className="flex flex-col gap-2">
                    <OptionCard icon={Zap} title="Szybkie zadanie" desc="Jednorazowe, bez śledzenia w czasie" selected={form.kind === 'task'} onClick={() => patch({ kind: 'task' })} />
                    <OptionCard icon={Target} title="Cel do śledzenia" desc="Będziesz do tego wracać — nawyk albo projekt" selected={form.kind === 'goal'} onClick={() => patch({ kind: 'goal' })} />
                  </div>
                </div>
                {form.kind === 'goal' && (
                  <div>
                    <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Charakter w czasie</div>
                    <div className="flex flex-col gap-2">
                      <OptionCard icon={Repeat} color={trackColorFor('habit')} title="Nawyk bez końca" desc="Liczy się regularność, nie ma mety" selected={form.character === 'habit'} onClick={() => patch({ character: 'habit' })} />
                      <OptionCard icon={Flag} color={trackColorFor('termin')} title="Cel z konkretnym targetem" desc="Ma liczbę i termin" selected={form.character === 'termin'} onClick={() => patch({ character: 'termin' })} />
                      <OptionCard icon={Target} color={trackColorFor('cyclicalContent')} title="Cel z etapami" desc="Powtarza się, ale ma kolejne etapy do zaliczenia" selected={form.character === 'cyclicalContent'} onClick={() => patch({ character: 'cyclicalContent' })} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {isTask(form) && step === 1 && (
              <div className="rise flex flex-col gap-4">
                <div className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                  <MonthCalendar
                    year={calYear}
                    month={calMonth}
                    onPrev={() => changeCalMonth(-1)}
                    onNext={() => changeCalMonth(1)}
                    renderDay={(d) => {
                      const selected = form.taskDay?.day === d && form.taskDay?.month === calMonth && form.taskDay?.year === calYear;
                      return (
                        <button
                          onClick={() => patch({ taskDay: selected ? null : { day: d, month: calMonth, year: calYear } })}
                          className="w-full aspect-square rounded-md flex items-center justify-center font-body cursor-pointer"
                          style={{ fontSize: 10, background: selected ? C.gold : 'transparent', color: selected ? '#15241F' : C.text, border: `1px solid ${selected ? C.gold : C.line}` }}
                        >
                          {d}
                        </button>
                      );
                    }}
                  />
                </div>
                <input
                  value={form.taskTime}
                  onChange={(e) => patch({ taskTime: e.target.value })}
                  placeholder="O której? np. 14:00 (opcjonalnie)"
                  className="w-full font-body text-sm px-3 py-2.5 rounded-xl outline-none"
                  style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
                />
              </div>
            )}

            {!isTask(form) && step === 1 && (
              <div className="rise flex flex-col gap-4">
                <div className="font-body text-[11px]" style={{ color: C.muted }}>Wzorzec powtarzalności</div>
                <div className="flex gap-2 flex-wrap">
                  <SelectChip label="Codziennie" selected={form.cadenceType === 'daily'} onClick={() => patch({ cadenceType: 'daily' })} color={trackColor} />
                  <SelectChip label="Konkretne dni tygodnia" selected={form.cadenceType === 'weekdays'} onClick={() => patch({ cadenceType: 'weekdays' })} color={trackColor} />
                  <SelectChip label="X razy w tygodniu" selected={form.cadenceType === 'perWeekCount'} onClick={() => patch({ cadenceType: 'perWeekCount' })} color={trackColor} />
                  <SelectChip label="Co miesiąc" selected={form.cadenceType === 'monthly'} onClick={() => patch({ cadenceType: 'monthly' })} color={trackColor} />
                </div>

                {form.cadenceType === 'weekdays' && (
                  <div className="rounded-xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {DAY_LABELS.map((l, i) => (
                        <button
                          key={l}
                          onClick={() => toggleWeekday(i)}
                          className="w-8 h-8 rounded-full font-body text-[11px] cursor-pointer"
                          style={{ background: form.weekdays.includes(i) ? trackColor : 'transparent', color: form.weekdays.includes(i) ? '#15241F' : C.muted, border: `1px solid ${form.weekdays.includes(i) ? trackColor : C.line}` }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <input
                      value={form.timeOfDay}
                      onChange={(e) => patch({ timeOfDay: e.target.value })}
                      placeholder="O której? np. 18:00 (opcjonalnie)"
                      className="w-full font-body text-xs px-2.5 py-2 rounded-lg outline-none"
                      style={{ background: C.surface2, color: C.text, border: `1px solid ${C.line}` }}
                    />
                  </div>
                )}

                {form.cadenceType === 'perWeekCount' && (
                  <div className="rounded-xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-body text-xs" style={{ color: C.text }}>Razy w tygodniu</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => patch({ perWeekCount: Math.max(1, form.perWeekCount - 1) })} className="w-7 h-7 rounded-full bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.text }}>−</button>
                        <span className="font-display text-lg" style={{ color: trackColor }}>{form.perWeekCount}</span>
                        <button onClick={() => patch({ perWeekCount: Math.min(7, form.perWeekCount + 1) })} className="w-7 h-7 rounded-full bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.text }}>+</button>
                      </div>
                    </div>
                    <input
                      value={form.timeOfDay}
                      onChange={(e) => patch({ timeOfDay: e.target.value })}
                      placeholder="Preferowana pora dnia (opcjonalnie)"
                      className="w-full font-body text-xs px-2.5 py-2 rounded-lg outline-none"
                      style={{ background: C.surface2, color: C.text, border: `1px solid ${C.line}` }}
                    />
                  </div>
                )}

                {form.cadenceType === 'monthly' && (
                  <div className="rounded-xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                    <div className="font-body text-[10px] mb-2" style={{ color: C.muted }}>Którego dnia miesiąca?</div>
                    <div className="grid gap-1 mb-3" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <button
                          key={d}
                          onClick={() => patch({ monthDay: form.monthDay === d ? null : d })}
                          className="aspect-square rounded-md flex items-center justify-center font-body cursor-pointer"
                          style={{ fontSize: 9, background: form.monthDay === d ? trackColor : 'transparent', color: form.monthDay === d ? '#15241F' : C.text, border: `1px solid ${form.monthDay === d ? trackColor : C.line}` }}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <input
                      value={form.timeOfDay}
                      onChange={(e) => patch({ timeOfDay: e.target.value })}
                      placeholder="O której? np. 18:00 (opcjonalnie)"
                      className="w-full font-body text-xs px-2.5 py-2 rounded-lg outline-none"
                      style={{ background: C.surface2, color: C.text, border: `1px solid ${C.line}` }}
                    />
                  </div>
                )}

                {!isEditMode && (
                  <div>
                    <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Kiedy zaczynasz?</div>
                    <div className="flex gap-2 mb-2">
                      <SelectChip label="Dziś" selected={form.startsToday} onClick={() => patch({ startsToday: true, startDay: null })} color={trackColor} />
                      <SelectChip label="Wybierz dzień" selected={!form.startsToday} onClick={() => patch({ startsToday: false })} color={trackColor} />
                    </div>
                    {!form.startsToday && (
                      <div className="rounded-xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                        <MonthCalendar
                          year={calYear}
                          month={calMonth}
                          onPrev={() => changeCalMonth(-1)}
                          onNext={() => changeCalMonth(1)}
                          renderDay={(d) => {
                            const selected = form.startDay?.day === d && form.startDay?.month === calMonth && form.startDay?.year === calYear;
                            return (
                              <button
                                onClick={() => patch({ startDay: selected ? null : { day: d, month: calMonth, year: calYear } })}
                                className="w-full aspect-square rounded-md flex items-center justify-center font-body cursor-pointer"
                                style={{ fontSize: 10, background: selected ? trackColor : 'transparent', color: selected ? '#15241F' : C.text, border: `1px solid ${selected ? trackColor : C.line}` }}
                              >
                                {d}
                              </button>
                            );
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Po czym to zrobisz? (opcjonalnie)</div>
                  <input
                    value={form.anchor}
                    onChange={(e) => patch({ anchor: e.target.value })}
                    placeholder="np. po porannej kawie"
                    className="w-full font-body text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
                  />
                </div>
              </div>
            )}

            {!isTask(form) && step === 2 && (
              <div className="rise flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Shield size={15} style={{ color: trackColor }} />
                  <div className="font-body text-[11px]" style={{ color: C.muted }}>Wersja minimalna (opcjonalnie)</div>
                </div>
                <input
                  value={form.minimal}
                  onChange={(e) => patch({ minimal: e.target.value })}
                  placeholder="np. 1 pompka zamiast pełnego treningu"
                  className="w-full font-body text-sm px-3 py-2.5 rounded-xl outline-none"
                  style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
                />
                {form.minimal.trim() && form.cadenceType && (
                  <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: C.surface2, border: `1px solid ${trackColor}55` }}>
                    <Shield size={13} style={{ color: trackColor }} className="shrink-0" />
                    <span className="font-body text-[10px]" style={{ color: C.muted }}>{minimalCapLabel(form)}</span>
                  </div>
                )}
              </div>
            )}

            {!isTask(form) && isMilestoneStep(form, step) && (
              <div className="rise flex flex-col gap-4">
                {form.character === 'termin' && (
                  <>
                    <div>
                      <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Co mierzysz?</div>
                      <div className="flex gap-2">
                        <input
                          value={form.targetValue}
                          onChange={(e) => patch({ targetValue: e.target.value.replace(/[^\d.]/g, '') })}
                          placeholder="np. 100"
                          className="w-1/2 font-body text-sm px-3 py-2.5 rounded-xl outline-none"
                          style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
                        />
                        <input
                          value={form.targetUnit}
                          onChange={(e) => patch({ targetUnit: e.target.value })}
                          placeholder="np. dni, kg, km"
                          className="w-1/2 font-body text-sm px-3 py-2.5 rounded-xl outline-none"
                          style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-body text-[11px]" style={{ color: C.muted }}>Liczba kamieni</span>
                      <button onClick={() => patch({ milestoneTarget: Math.max(1, form.milestoneTarget - 1) })} className="w-7 h-7 rounded-full bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.text }}>−</button>
                      <span className="font-display text-lg" style={{ color: trackColor }}>{form.milestoneTarget}</span>
                      <button onClick={() => patch({ milestoneTarget: Math.min(12, form.milestoneTarget + 1) })} className="w-7 h-7 rounded-full bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.text }}>+</button>
                    </div>
                  </>
                )}
                <div className="flex flex-col gap-2">
                  <OptionCard icon={Flag} title="Zaplanuj teraz na mapie" desc="Rozmieść etapy na kalendarzu" selected={form.milestonePlan === 'now'} onClick={() => patch({ milestonePlan: 'now' })} color={trackColor} />
                  <OptionCard icon={Plus} title="Dodawaj po drodze" desc="Dopiszesz kolejny, gdy skończysz poprzedni" selected={form.milestonePlan === 'later'} onClick={() => patch({ milestonePlan: 'later' })} color={trackColor} />
                </div>
                {form.milestonePlan === 'now' && (
                  <>
                    <div className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                      <div className="font-body text-[10px] mb-2" style={{ color: C.muted }}>Stuknij dzień, żeby dodać etap</div>
                      <MonthCalendar
                        year={calYear}
                        month={calMonth}
                        onPrev={() => changeCalMonth(-1)}
                        onNext={() => changeCalMonth(1)}
                        renderDay={(d) => {
                          const marked = form.milestoneDates.some((m) => m.day === d && m.month === calMonth && m.year === calYear);
                          const atLimit = form.character === 'termin' && form.milestoneDates.length >= form.milestoneTarget && !marked;
                          return (
                            <button
                              onClick={() => !atLimit && toggleMilestoneDay(d)}
                              className="w-full aspect-square rounded-md flex items-center justify-center font-body cursor-pointer"
                              style={{ fontSize: 10, background: marked ? trackColor : 'transparent', color: marked ? '#15241F' : atLimit ? C.line : C.text, border: `1px solid ${marked ? trackColor : C.line}`, opacity: atLimit ? 0.5 : 1 }}
                            >
                              {d}
                            </button>
                          );
                        }}
                      />
                    </div>
                    {form.milestoneDates.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {form.milestoneDates.map((m) => {
                          const key = dateKey(m);
                          return (
                            <div key={key} className="flex gap-2 items-center">
                              <div className="font-display text-xs w-14 text-center shrink-0" style={{ color: trackColor }}>{m.day} {monthAbbr(m.month)}</div>
                              <input
                                value={m.label}
                                onChange={(e) => updateMilestoneLabel(key, e.target.value)}
                                placeholder="Nazwa etapu"
                                className="flex-1 font-body text-xs px-2.5 py-1.5 rounded-lg outline-none"
                                style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
                              />
                              <button onClick={() => removeMilestoneDate(key)} className="bg-transparent border-0 cursor-pointer p-2.5 -m-1.5" style={{ color: C.muted }}><X size={14} /></button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {isSummaryStep(form, step) && (
              <div className="rise flex flex-col gap-3">
                <div className="font-body text-[11px] mb-1" style={{ color: C.muted }}>Podgląd</div>
                <div className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {form.character ? (
                      <GoalDot color={trackColor} character={form.character} size={8} />
                    ) : (
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: trackColor }} />
                    )}
                    <span className="font-body text-xs" style={{ color: C.text }}>{form.name || 'Bez nazwy'}</span>
                  </div>
                  <div className="font-body text-[10px]" style={{ color: C.muted }}>
                    {isTask(form)
                      ? `Szybkie zadanie${form.taskDay ? ` · ${form.taskDay.day} ${monthAbbr(form.taskDay.month)}` : ''}${form.taskTime ? ` · ${form.taskTime}` : ''}`
                      : `${form.character === 'habit' ? 'Nawyk' : form.character === 'termin' ? 'Cel z terminem' : 'Cel z etapami'} · ${cadenceLabel(form)}${form.anchor ? ` · po: ${form.anchor}` : ''}`}
                  </div>
                  {!isTask(form) && form.character === 'termin' && form.targetValue && (
                    <div className="font-body text-[10px] mt-1" style={{ color: C.muted }}>Cel: {form.targetValue} {form.targetUnit}</div>
                  )}
                  {!isTask(form) && (
                    <div className="font-body text-[10px] mt-1" style={{ color: C.muted }}>Start: {isEditMode ? goal!.start : startLabel(form)}</div>
                  )}
                  {!isTask(form) && form.minimal.trim() && (
                    <div className="font-body text-[10px] mt-1 flex items-center gap-1" style={{ color: trackColor }}><Shield size={10} /> wersja minimalna: {form.minimal}</div>
                  )}
                  {!isTask(form) && form.reason && <div className="font-body text-[10px] mt-1 italic" style={{ color: C.muted }}>„{form.reason}”</div>}
                </div>

                {!isTask(form) && (
                  <div className="rounded-xl p-3 flex flex-col gap-2.5" style={{ background: C.surface2, border: `1px solid ${C.line}` }}>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-body text-[11px]" style={{ color: C.text }}>Widoczne dla partnerki</span>
                      <ToggleSwitch checked={form.visibleToPartner} onChange={(v) => patch({ visibleToPartner: v })} color={trackColor} />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-body text-[11px]" style={{ color: C.text }}>Sync z kalendarzem telefonu</span>
                      <ToggleSwitch checked={form.syncToPhoneCalendar} onChange={(v) => patch({ syncToPhoneCalendar: v })} color={trackColor} />
                    </label>
                    {form.syncToPhoneCalendar && (
                      <div className="font-body text-[9px]" style={{ color: C.muted }}>
                        Po zapisaniu znajdziesz przycisk „Dodaj do Kalendarza” w podglądzie celu (Dziennik → dotknij nazwę celu).
                      </div>
                    )}
                  </div>
                )}

                {!isTask(form) && (
                  <div className="rounded-xl p-3" style={{ background: C.surface2, border: `1px solid ${C.line}` }}>
                    <div className="font-body text-[10px]" style={{ color: C.muted }}>Pominięcie dnia jest ok — apka to widzi, ale nie robi z tego dramatu.</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-4 pb-5 pt-2 shrink-0">
        {!confirmExit && isEditMode && isSummaryStep(form, step) && (
          <div className="mb-2">
            {confirmDelete ? (
              <div className="flex gap-2">
                <button onClick={() => { removeGoal(goal!.id); onClose(); }} className="flex-1 font-body text-[11px] py-2 rounded-lg border-0 cursor-pointer" style={{ background: C.over, color: '#15241F' }}>
                  Tak, usuń
                </button>
                <button onClick={() => setConfirmDelete(false)} className="flex-1 font-body text-[11px] py-2 rounded-lg bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.muted }}>
                  Anuluj
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="w-full font-body text-[11px] py-1 bg-transparent border-0 cursor-pointer" style={{ color: C.over }}>
                Usuń cel
              </button>
            )}
          </div>
        )}
        {!confirmExit && (
          <button
            onClick={() => (isSummaryStep(form, step) ? submit() : setStep((s) => s + 1))}
            disabled={!canGoNext}
            className="w-full font-body text-sm font-semibold py-3 rounded-xl border-0 cursor-pointer"
            style={{ background: canGoNext ? trackColor : C.surface2, color: canGoNext ? '#15241F' : C.muted, opacity: canGoNext ? 1 : 0.6 }}
          >
            {isSummaryStep(form, step) ? (isEditMode ? 'Zapisz zmiany' : isTask(form) ? 'Dodaj zadanie' : 'Dodaj cel') : 'Dalej'}
          </button>
        )}
      </div>
    </div>
  );
}
