// Warstwa trwałości lokalnej — IndexedDB (spec §3: "Storage lokalny:
// IndexedDB / localStorage dla trybu offline i natychmiastowego startu").
//
// UWAGA: makiety używały `window.storage`, które istnieje wyłącznie w
// środowisku Claude.ai i poza nim się nie uruchomi (spec §3, sekcja
// "KRYTYCZNE"). Ten moduł jest jego jedyną realną trwałą replacementą —
// nic w aplikacji nie powinno odwoływać się do window.storage.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AppNotification, AppSettings, Goal, Person } from '../types';

interface DwaToryDB extends DBSchema {
  people: { key: string; value: Person };
  goals: { key: string; value: Goal; indexes: { personId: string } };
  settings: { key: string; value: AppSettings };
  notifications: { key: string; value: AppNotification };
  meta: { key: string; value: string };
}

const DB_NAME = 'dwa-tory';
const DB_VERSION = 1;
const CURRENT_USER_KEY = 'currentUserId';

let dbPromise: Promise<IDBPDatabase<DwaToryDB>> | null = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB<DwaToryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('people')) {
          db.createObjectStore('people', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('goals')) {
          const goals = db.createObjectStore('goals', { keyPath: 'id' });
          goals.createIndex('personId', 'personId');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('notifications')) {
          db.createObjectStore('notifications', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      },
    });
  }
  return dbPromise;
};

// --- people -----------------------------------------------------------

export async function getAllPeople(): Promise<Person[]> {
  const db = await getDb();
  return db.getAll('people');
}

export async function getPerson(id: string): Promise<Person | undefined> {
  const db = await getDb();
  return db.get('people', id);
}

export async function putPerson(person: Person): Promise<void> {
  const db = await getDb();
  await db.put('people', person);
}

// --- goals --------------------------------------------------------------

export async function getGoalsForPerson(personId: string): Promise<Goal[]> {
  const db = await getDb();
  return db.getAllFromIndex('goals', 'personId', personId);
}

export async function putGoal(goal: Goal): Promise<void> {
  const db = await getDb();
  await db.put('goals', goal);
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('goals', id);
}

// --- settings -------------------------------------------------------------

const SETTINGS_KEY = 'app';

export async function getSettings(): Promise<AppSettings | undefined> {
  const db = await getDb();
  return db.get('settings', SETTINGS_KEY);
}

export async function putSettings(settings: AppSettings): Promise<void> {
  const db = await getDb();
  await db.put('settings', settings, SETTINGS_KEY);
}

// --- notifications ----------------------------------------------------

export async function getAllNotifications(): Promise<AppNotification[]> {
  const db = await getDb();
  return db.getAll('notifications');
}

export async function putNotification(n: AppNotification): Promise<void> {
  const db = await getDb();
  await db.put('notifications', n);
}

// --- meta (bieżący użytkownik urządzenia) ------------------------------

export async function getCurrentUserId(): Promise<string | undefined> {
  const db = await getDb();
  return db.get('meta', CURRENT_USER_KEY);
}

export async function setCurrentUserId(id: string): Promise<void> {
  const db = await getDb();
  await db.put('meta', id, CURRENT_USER_KEY);
}

// --- inicjalizacja / seed --------------------------------------------------

/**
 * Współdzielona obietnica na moduł, żeby dwa równoległe wywołania (np. React
 * StrictMode odpalające efekt dwukrotnie w development) NIE wykonały seeda
 * dwa razy i nie zduplikowały danych — IndexedDB samo w sobie nie chroni
 * przed tym wyścigiem, bo "sprawdź czy puste, potem zapisz" nie jest
 * atomowe między dwoma równoległymi wywołaniami.
 */
let initPromise: Promise<void> | null = null;

export function ensureInitialized(seedFn: () => Promise<void>): Promise<void> {
  if (!initPromise) initPromise = seedFn();
  return initPromise;
}
