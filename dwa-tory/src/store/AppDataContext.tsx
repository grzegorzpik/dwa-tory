// Centralny stan aplikacji: wczytanie z IndexedDB, seed przy pierwszym
// starcie, mutacje Dziennika z natychmiastowym zapisem lokalnym (spec §8:
// tryb offline — appka działa i pokazuje dane bez sieci).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as db from '../lib/db';
import { applyDoubleUp, applyDrop, applyMarkDone, applySimpleMove, applyUndoDone, nextSlotIsOccupied } from '../lib/goals';
import { seedGoals, seedPeople, seedSettings } from '../lib/seedData';
import type { AppSettings, Goal, Milestone, Person } from '../types';

interface MilestoneCelebration {
  goalTitle: string;
  milestone: Milestone;
  color: string;
}

interface AppDataValue {
  loading: boolean;
  currentUser: Person;
  partner: Person | null;
  goals: Goal[]; // cele bieżącego użytkownika
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
}

const AppDataContext = createContext<AppDataValue | null>(null);

const CURRENT_USER_ID = 'a'; // urządzenie należy do Grzeska — w kroku "Backend" zastąpione realnym logowaniem

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [goals, setGoals] = useState<Goal[]>([]);
  const [settings, setSettings] = useState<AppSettings>(seedSettings());
  const [justCompleted, setJustCompleted] = useState(false);
  const [celebrateAllDone, setCelebrateAllDone] = useState(false);
  const [milestoneCelebration, setMilestoneCelebration] = useState<MilestoneCelebration | null>(null);
  const wasAllDone = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        // Seed wykonuje się co najwyżej raz na cały cykl życia modułu (patrz
        // ensureInitialized) — bezpieczne nawet gdy ten efekt odpali się
        // dwukrotnie (React StrictMode w developmencie).
        await db.ensureInitialized(async () => {
          const existing = await db.getAllPeople();
          if (existing.length > 0) return;
          await Promise.all(seedPeople().map(db.putPerson));
          await Promise.all(seedGoals().map(db.putGoal));
          await db.setCurrentUserId(CURRENT_USER_ID);
          await db.putSettings(seedSettings());
        });

        const [allPeople, myGoals, savedSettings] = await Promise.all([
          db.getAllPeople(),
          db.getGoalsForPerson(CURRENT_USER_ID),
          db.getSettings(),
        ]);
        setPeople(Object.fromEntries(allPeople.map((p) => [p.id, p])));
        setGoals(myGoals);
        if (savedSettings) setSettings(savedSettings);
      } catch (e) {
        // Awaryjnie: pokaż appkę z samymi danymi w pamięci zamiast zawiesić
        // ekran ładowania, gdyby storage lokalnie zawiódł w nieoczekiwany sposób.
        console.error('Nie udało się wczytać danych lokalnych', e);
        const fallbackPeople = seedPeople();
        setPeople(Object.fromEntries(fallbackPeople.map((p) => [p.id, p])));
        setGoals(seedGoals().filter((g) => g.personId === CURRENT_USER_ID));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentUser = people[CURRENT_USER_ID];
  const partner = useMemo(() => Object.values(people).find((p) => p.id !== CURRENT_USER_ID) ?? null, [people]);

  const persistGoal = useCallback((goal: Goal) => {
    db.putGoal(goal).catch((e) => console.error('Nie udało się zapisać celu lokalnie', e));
  }, []);

  const bumpStreak = useCallback((delta: number) => {
    setPeople((prev) => {
      const p = prev[CURRENT_USER_ID];
      if (!p) return prev;
      const nextStreak = Math.max(0, p.streak + delta);
      const updated: Person = { ...p, streak: nextStreak, longestStreak: Math.max(p.longestStreak, nextStreak) };
      db.putPerson(updated).catch((e) => console.error('Nie udało się zapisać serii lokalnie', e));
      return { ...prev, [CURRENT_USER_ID]: updated };
    });
  }, []);

  const markDone = useCallback(
    (goalId: string, note: string) => {
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goalId) return g;
          const { goal, reachedMilestone } = applyMarkDone(g, note);
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
          const goal = applyUndoDone(g);
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
    goals,
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
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData musi być użyty wewnątrz AppDataProvider');
  return ctx;
}
