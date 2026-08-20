// Centralny stan aplikacji: wczytanie z IndexedDB, bootstrap przy pierwszym
// logowaniu, mutacje Dziennika z natychmiastowym zapisem lokalnym (spec §8:
// tryb offline — appka działa i pokazuje dane bez sieci).
//
// Backend Etap 3: userId pochodzi teraz z realnej sesji Supabase Auth
// (App.tsx → Gate), nie z atrapy CURRENT_USER_ID='a'. Parowanie kont
// (partner/partnerGoals) i zdalna synchronizacja celów wracają w Etapach 4-5
// — do tego czasu partner jest zawsze null, a zapis dotyczy tylko IndexedDB.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import * as db from '../lib/db';
import {
  applyDoubleUp,
  applyDrop,
  applyMarkDone,
  applyMarkDoneWeekly,
  applySimpleMove,
  applyUndoDone,
  applyUndoDoneWeekly,
  nextSlotIsOccupied,
} from '../lib/goals';
import { disconnectPair, fetchMyPairing } from '../lib/pairing';
import { supabase } from '../lib/supabaseClient';
import { PERSON_COLOR } from '../theme';
import type { AppNotification, AppSettings, Goal, Milestone, Person } from '../types';

interface MilestoneCelebration {
  goalTitle: string;
  milestone: Milestone;
  color: string;
}

interface AppDataValue {
  loading: boolean;
  currentUser: Person;
  partner: Person | null;
  /** null, gdy niesparowany — potrzebne do rozłączenia (DELETE FROM pairs). */
  pairId: string | null;
  /** Odświeża status parowania z Supabase (my_pairing()) — wołane po wygenerowaniu/wpisaniu kodu. */
  refreshPairing: () => Promise<void>;
  /** Rozłącza bieżącą parę (spec: zwalnia oboje do ponownego parowania). */
  disconnectPartner: () => Promise<void>;
  goals: Goal[]; // cele bieżącego użytkownika
  /** Cele partnerki, do odczytu w Kalendarzu z egzekwowanym visibleToPartner. Realne dane od Etapu 5 (sync). */
  partnerGoals: Goal[];
  settings: AppSettings;
  justCompleted: boolean;
  celebrateAllDone: boolean;
  milestoneCelebration: MilestoneCelebration | null;
  dismissMilestoneCelebration: () => void;
  markDone: (goalId: string, note: string) => void;
  undoDone: (goalId: string) => void;
  /** Zwraca true, jeśli slot jest zajęty i wymaga decyzji (ekran powinien pokazać dialog konfliktu). */
  requestMove: (goalId: string) => boolean;
  resolveDoubleUp: (goalId: string) => void;
  resolveDrop: (goalId: string, which: 'curr' | 'next') => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  /** Upsert — Kreator/Edytor buduje cały obiekt Goal (nowy albo edytowany) i przekazuje go tutaj. */
  saveGoal: (goal: Goal) => void;
  removeGoal: (goalId: string) => void;
  /** Edycja własnego profilu (na razie zdjęcie — spec §5.7 "Zdjęcie profilowe"). */
  updateProfile: (patch: Partial<Pick<Person, 'photo' | 'name'>>) => void;
  notifications: AppNotification[];
  sendReply: (notificationId: string, text: string) => void;
}

const AppDataContext = createContext<AppDataValue | null>(null);

const DEFAULT_SETTINGS: AppSettings = {
  selfTimeEnabled: false,
  pushEnabled: true,
  soundEnabled: true,
  defaultCalendarView: 'mine',
  defaultCalendarPeriod: 'week',
  hasCompletedOnboarding: false,
};

/**
 * Wiersz w public.profiles musi istnieć zanim Etap 4 (parowanie) będzie mógł
 * odwołać się do niego jako created_by/owner_id. Zakładany raz przy pierwszym
 * logowaniu i odświeżany po każdej zmianie profilu (patrz updateProfile).
 * Zapis w tle — błąd sieci nie może zablokować pracy offline.
 */
async function syncProfileToSupabase(person: Person) {
  try {
    const { error } = await supabase.from('profiles').upsert({
      id: person.id,
      name: person.name || 'Nowy użytkownik',
      initials: person.initials,
      color: person.color,
      photo_src: person.photo?.src ?? null,
      streak: person.streak,
      longest_streak: person.longestStreak,
      cheers: person.cheers,
    });
    if (error) console.error('Nie udało się zsynchronizować profilu z Supabase', error);
  } catch (e) {
    console.error('Nie udało się zsynchronizować profilu z Supabase', e);
  }
}

export function AppDataProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [goals, setGoals] = useState<Goal[]>([]);
  const [partner, setPartner] = useState<Person | null>(null);
  const [pairId, setPairId] = useState<string | null>(null);
  const [partnerGoals] = useState<Goal[]>([]); // realne dane partnera dopiero w Etapie 5 (sync)
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [justCompleted, setJustCompleted] = useState(false);
  const [celebrateAllDone, setCelebrateAllDone] = useState(false);
  const [milestoneCelebration, setMilestoneCelebration] = useState<MilestoneCelebration | null>(null);
  const wasAllDone = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        let person = await db.getPerson(userId);
        if (!person) {
          person = {
            id: userId,
            name: '',
            initials: '?',
            color: PERSON_COLOR.a,
            streak: 0,
            longestStreak: 0,
            cheers: 0,
          };
          await db.putPerson(person);
          await db.putSettings(DEFAULT_SETTINGS);
          void syncProfileToSupabase(person);
        }
        await db.setCurrentUserId(userId);

        const [myGoals, savedSettings, allNotifications] = await Promise.all([
          db.getGoalsForPerson(userId),
          db.getSettings(),
          db.getAllNotifications(),
        ]);
        if (cancelled) return;
        setPeople({ [userId]: person });
        setGoals(myGoals);
        setNotifications(allNotifications);
        setSettings(savedSettings ?? DEFAULT_SETTINGS);
      } catch (e) {
        console.error('Nie udało się wczytać/zainicjalizować danych lokalnych', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const currentUser = people[userId];

  const refreshPairing = useCallback(async () => {
    try {
      const pairing = await fetchMyPairing();
      setPairId(pairing?.pairId ?? null);
      setPartner(pairing?.partner ?? null);
    } catch (e) {
      // Offline albo Supabase chwilowo niedostępne — appka ma dalej działać z tym, co już wie.
      console.error('Nie udało się pobrać statusu parowania', e);
    }
  }, []);

  // Status parowania sprawdzamy przy każdym starcie z nowym userId — nie
  // blokuje `loading` (to tylko dane lokalne), bo appka ma działać offline-first.
  useEffect(() => {
    void refreshPairing();
  }, [userId, refreshPairing]);

  const disconnectPartner = useCallback(async () => {
    if (!pairId) return;
    await disconnectPair(pairId);
    setPairId(null);
    setPartner(null);
  }, [pairId]);

  const persistGoal = useCallback((goal: Goal) => {
    db.putGoal(goal).catch((e) => console.error('Nie udało się zapisać celu lokalnie', e));
  }, []);

  const bumpStreak = useCallback(
    (delta: number) => {
      setPeople((prev) => {
        const p = prev[userId];
        if (!p) return prev;
        const nextStreak = Math.max(0, p.streak + delta);
        const updated: Person = { ...p, streak: nextStreak, longestStreak: Math.max(p.longestStreak, nextStreak) };
        db.putPerson(updated).catch((e) => console.error('Nie udało się zapisać serii lokalnie', e));
        return { ...prev, [userId]: updated };
      });
    },
    [userId],
  );

  const updateProfile = useCallback(
    (patch: Partial<Pick<Person, 'photo' | 'name'>>) => {
      setPeople((prev) => {
        const p = prev[userId];
        if (!p) return prev;
        const updated: Person = { ...p, ...patch };
        db.putPerson(updated).catch((e) => console.error('Nie udało się zapisać profilu lokalnie', e));
        void syncProfileToSupabase(updated);
        return { ...prev, [userId]: updated };
      });
    },
    [userId],
  );

  const markDone = useCallback(
    (goalId: string, note: string) => {
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goalId) return g;
          // "X razy w tygodniu" ma osobny licznik tygodniowy — nie pojedynczy slot dnia (patrz lib/goals.ts).
          const { goal, reachedMilestone } = g.cadenceType === 'perWeekCount' ? applyMarkDoneWeekly(g, note) : applyMarkDone(g, note);
          persistGoal(goal);
          if (reachedMilestone) {
            setMilestoneCelebration({ goalTitle: goal.title, milestone: reachedMilestone, color: goal.type === 'termin' ? '#E8724F' : '#8AAE9E' });
          }
          return goal;
        }),
      );
      bumpStreak(1);
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 600);
    },
    [persistGoal, bumpStreak],
  );

  const undoDone = useCallback(
    (goalId: string) => {
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goalId) return g;
          const goal = g.cadenceType === 'perWeekCount' ? applyUndoDoneWeekly(g) : applyUndoDone(g);
          persistGoal(goal);
          return goal;
        }),
      );
      bumpStreak(-1);
    },
    [persistGoal, bumpStreak],
  );

  const requestMove = useCallback(
    (goalId: string): boolean => {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return false;
      if (nextSlotIsOccupied(goal)) return true; // ekran pokaże dialog decyzji
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goalId) return g;
          const updated = applySimpleMove(g);
          persistGoal(updated);
          return updated;
        }),
      );
      return false;
    },
    [goals, persistGoal],
  );

  const resolveDoubleUp = useCallback(
    (goalId: string) => {
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goalId) return g;
          const updated = applyDoubleUp(g);
          persistGoal(updated);
          return updated;
        }),
      );
    },
    [persistGoal],
  );

  const resolveDrop = useCallback(
    (goalId: string, which: 'curr' | 'next') => {
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goalId) return g;
          const updated = applyDrop(g, which);
          persistGoal(updated);
          return updated;
        }),
      );
    },
    [persistGoal],
  );

  const saveGoal = useCallback(
    (goal: Goal) => {
      setGoals((prev) => (prev.some((g) => g.id === goal.id) ? prev.map((g) => (g.id === goal.id ? goal : g)) : [...prev, goal]));
      persistGoal(goal);
    },
    [persistGoal],
  );

  const removeGoal = useCallback((goalId: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    db.deleteGoal(goalId).catch((e) => console.error('Nie udało się usunąć celu lokalnie', e));
  }, []);

  const sendReply = useCallback((notificationId: string, text: string) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id !== notificationId) return n;
        const updated: AppNotification = { ...n, responded: true, reply: text };
        db.putNotification(updated).catch((e) => console.error('Nie udało się zapisać odpowiedzi lokalnie', e));
        return updated;
      }),
    );
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...patch };
      db.putSettings(updated).catch((e) => console.error('Nie udało się zapisać ustawień lokalnie', e));
      return updated;
    });
  }, []);

  // Wszystkie dzisiejsze cele zrobione → jednorazowe świętowanie (spec §5.3, iskierki).
  useEffect(() => {
    const allDone = goals.length > 0 && goals.every((g) => g.instance.curr.status === 'done');
    if (allDone && !wasAllDone.current) {
      setCelebrateAllDone(true);
      setTimeout(() => setCelebrateAllDone(false), 1100);
    }
    wasAllDone.current = allDone;
  }, [goals]);

  const dismissMilestoneCelebration = useCallback(() => setMilestoneCelebration(null), []);

  useEffect(() => {
    if (!milestoneCelebration) return;
    const t = setTimeout(() => setMilestoneCelebration(null), 3400);
    return () => clearTimeout(t);
  }, [milestoneCelebration]);

  const value: AppDataValue = {
    loading,
    currentUser,
    partner,
    pairId,
    refreshPairing,
    disconnectPartner,
    goals,
    partnerGoals,
    settings,
    justCompleted,
    celebrateAllDone,
    milestoneCelebration,
    dismissMilestoneCelebration,
    markDone,
    undoDone,
    requestMove,
    resolveDoubleUp,
    resolveDrop,
    updateSettings,
    saveGoal,
    removeGoal,
    updateProfile,
    notifications,
    sendReply,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData musi być użyty wewnątrz AppDataProvider');
  return ctx;
}
