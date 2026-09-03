// Warstwa trwałości lokalnej — IndexedDB (spec §3: "Storage lokalny:
// IndexedDB / localStorage dla trybu offline i natychmiastowego startu").
//
// UWAGA: makiety używały `window.storage`, które istnieje wyłącznie w
// środowisku Claude.ai i poza nim się nie uruchomi (spec §3, sekcja
// "KRYTYCZNE"). Ten moduł jest jego jedyną realną trwałą replacementą —
// nic w aplikacji nie powinno odwoływać się do window.storage.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AppNotification, AppSettings, Goal, Person, Task } from '../types';

interface DwaToryDB extends DBSchema {
  people: { key: string; value: Person };
  goals: { key: string; value: Goal; indexes: { personId: string } };
  tasks: { key: string; value: Task; indexes: { personId: string } };
  settings: { key: string; value: AppSettings };
  notifications: { key: string; value: AppNotification };
  meta: { key: string; value: string };
}

const DB_NAME = 'dwa-tory';
const DB_VERSION = 2;
const CURRENT_USER_KEY = 'currentUserId';

/**
 * Część otoczeń (prywatne przeglądanie starszych przeglądarek, mocno
 * odizolowane iframe'y bez podpiętego IndexedDB) potrafi odrzucić
 * `indexedDB.open`. Zamiast wywalać całą appkę na starcie, spadamy wtedy na
 * magazyn w pamięci — appka wciąż działa w ramach sesji, po prostu nic nie
 * przetrwa twardego przeładowania. Prawdziwe środowisko docelowe (przeglądarka
 * na telefonie) ma normalne IndexedDB i tej ścieżki nigdy nie dotknie.
 */
class MemoryStore {
  private stores = new Map<string, Map<string, unknown>>();

  private store(name: string) {
    let s = this.stores.get(name);
    if (!s) {
      s = new Map();
      this.stores.set(name, s);
    }
    return s;
  }

  async get(storeName: string, key: string) {
    return this.store(storeName).get(key);
  }

  async getAll(storeName: string) {
    return Array.from(this.store(storeName).values());
  }

  async getAllFromIndex(storeName: string, indexName: string, value: string) {
    return Array.from(this.store(storeName).values()).filter((v) => (v as Record<string, unknown>)[indexName] === value);
  }

  async put(storeName: string, value: unknown, key?: string) {
    const k = key ?? ((value as Record<string, unknown>).id as string);
    this.store(storeName).set(k, value);
  }

  async delete(storeName: string, key: string) {
    this.store(storeName).delete(key);
  }
}

type Db = IDBPDatabase<DwaToryDB> | MemoryStore;

let dbPromise: Promise<Db> | null = null;

const getDb = (): Promise<Db> => {
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
        if (!db.objectStoreNames.contains('tasks')) {
          const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
          tasks.createIndex('personId', 'personId');
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
    }).catch((e) => {
      console.warn('IndexedDB niedostępne, przechodzę na magazyn w pamięci (dane nie przetrwają przeładowania):', e);
      return new MemoryStore();
    });
  }
  return dbPromise;
};

// --- people -----------------------------------------------------------

export async function getAllPeople(): Promise<Person[]> {
  // Rzutowanie: idb ma precyzyjne przeciążenia per-store, MemoryStore ma
  // uproszczone sygnatury generyczne — adapter godzi je jednym `any` tutaj,
  // każda eksportowana funkcja i tak deklaruje precyzyjny typ zwracany.
  const db = (await getDb()) as any;
  return db.getAll('people');
}

export async function getPerson(id: string): Promise<Person | undefined> {
  // Rzutowanie: idb ma precyzyjne przeciążenia per-store, MemoryStore ma
  // uproszczone sygnatury generyczne — adapter godzi je jednym `any` tutaj,
  // każda eksportowana funkcja i tak deklaruje precyzyjny typ zwracany.
  const db = (await getDb()) as any;
  return db.get('people', id);
}

export async function putPerson(person: Person): Promise<void> {
  // Rzutowanie: idb ma precyzyjne przeciążenia per-store, MemoryStore ma
  // uproszczone sygnatury generyczne — adapter godzi je jednym `any` tutaj,
  // każda eksportowana funkcja i tak deklaruje precyzyjny typ zwracany.
  const db = (await getDb()) as any;
  await db.put('people', person);
}

// --- goals --------------------------------------------------------------

export async function getGoalsForPerson(personId: string): Promise<Goal[]> {
  // Rzutowanie: idb ma precyzyjne przeciążenia per-store, MemoryStore ma
  // uproszczone sygnatury generyczne — adapter godzi je jednym `any` tutaj,
  // każda eksportowana funkcja i tak deklaruje precyzyjny typ zwracany.
  const db = (await getDb()) as any;
  return db.getAllFromIndex('goals', 'personId', personId);
}

export async function putGoal(goal: Goal): Promise<void> {
  // Rzutowanie: idb ma precyzyjne przeciążenia per-store, MemoryStore ma
  // uproszczone sygnatury generyczne — adapter godzi je jednym `any` tutaj,
  // każda eksportowana funkcja i tak deklaruje precyzyjny typ zwracany.
  const db = (await getDb()) as any;
  await db.put('goals', goal);
}

export async function deleteGoal(id: string): Promise<void> {
  // Rzutowanie: idb ma precyzyjne przeciążenia per-store, MemoryStore ma
  // uproszczone sygnatury generyczne — adapter godzi je jednym `any` tutaj,
  // każda eksportowana funkcja i tak deklaruje precyzyjny typ zwracany.
  const db = (await getDb()) as any;
  await db.delete('goals', id);
}

// --- tasks (szybkie zadania — jednorazowe, bez śledzenia) --------------

export async function getTasksForPerson(personId: string): Promise<Task[]> {
  // Rzutowanie: idb ma precyzyjne przeciążenia per-store, MemoryStore ma
  // uproszczone sygnatury generyczne — adapter godzi je jednym `any` tutaj,
  // każda eksportowana funkcja i tak deklaruje precyzyjny typ zwracany.
  const db = (await getDb()) as any;
  return db.getAllFromIndex('tasks', 'personId', personId);
}

export async function putTask(task: Task): Promise<void> {
  // Rzutowanie: idb ma precyzyjne przeciążenia per-store, MemoryStore ma
  // uproszczone sygnatury generyczne — adapter godzi je jednym `any` tutaj,
  // każda eksportowana funkcja i tak deklaruje precyzyjny typ zwracany.
  const db = (await getDb()) as any;
  await db.put('tasks', task);
}

export async function deleteTask(id: string): Promise<void> {
  // Rzutowanie: idb ma precyzyjne przeciążenia per-store, MemoryStore ma
  // uproszczone sygnatury generyczne — adapter godzi je jednym `any` tutaj,
  // każda eksportowana funkcja i tak deklaruje precyzyjny typ zwracany.
  const db = (await getDb()) as any;
  await db.delete('tasks', id);
}

// --- settings -------------------------------------------------------------

const SETTINGS_KEY = 'app';

export async function getSettings(): Promise<AppSettings | undefined> {
  // Rzutowanie: idb ma precyzyjne przeciążenia per-store, MemoryStore ma
  // uproszczone sygnatury generyczne — adapter godzi je jednym `any` tutaj,
  // każda eksportowana funkcja i tak deklaruje precyzyjny typ zwracany.
  const db = (await getDb()) as any;
  return db.get('settings', SETTINGS_KEY);
}

export async function putSettings(settings: AppSettings): Promise<void> {
  // Rzutowanie: idb ma precyzyjne przeciążenia per-store, MemoryStore ma
  // uproszczone sygnatury generyczne — adapter godzi je jednym `any` tutaj,
  // każda eksportowana funkcja i tak deklaruje precyzyjny typ zwracany.
  const db = (await getDb()) as any;
  await db.put('settings', settings, SETTINGS_KEY);
}

// --- notifications ----------------------------------------------------

export async function getAllNotifications(): Promise<AppNotification[]> {
  // Rzutowanie: idb ma precyzyjne przeciążenia per-store, MemoryStore ma
  // uproszczone sygnatury generyczne — adapter godzi je jednym `any` tutaj,
  // każda eksportowana funkcja i tak deklaruje precyzyjny typ zwracany.
  const db = (await getDb()) as any;
  return db.getAll('notifications');
}

export async function putNotification(n: AppNotification): Promise<void> {
  // Rzutowanie: idb ma precyzyjne przeciążenia per-store, MemoryStore ma
  // uproszczone sygnatury generyczne — adapter godzi je jednym `any` tutaj,
  // każda eksportowana funkcja i tak deklaruje precyzyjny typ zwracany.
  const db = (await getDb()) as any;
  await db.put('notifications', n);
}

// --- meta (bieżący użytkownik urządzenia) ------------------------------

export async function getCurrentUserId(): Promise<string | undefined> {
  // Rzutowanie: idb ma precyzyjne przeciążenia per-store, MemoryStore ma
  // uproszczone sygnatury generyczne — adapter godzi je jednym `any` tutaj,
  // każda eksportowana funkcja i tak deklaruje precyzyjny typ zwracany.
  const db = (await getDb()) as any;
  return db.get('meta', CURRENT_USER_KEY);
}

export async function setCurrentUserId(id: string): Promise<void> {
  // Rzutowanie: idb ma precyzyjne przeciążenia per-store, MemoryStore ma
  // uproszczone sygnatury generyczne — adapter godzi je jednym `any` tutaj,
  // każda eksportowana funkcja i tak deklaruje precyzyjny typ zwracany.
  const db = (await getDb()) as any;
  await db.put('meta', id, CURRENT_USER_KEY);
}

// --- powiadomienia: id "moich" wpisów z reakcją partnerki, które już
// widziałem (napędza odznakę dzwonka — spec: "coś wpadło", nie tylko
// "czeka na Twoją odpowiedź") ----------------------------------------

const SEEN_REPLY_IDS_KEY = 'seenReplyIds';

export async function getSeenReplyIds(): Promise<string[]> {
  const db = (await getDb()) as any;
  const raw = await db.get('meta', SEEN_REPLY_IDS_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function addSeenReplyIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = (await getDb()) as any;
  const existing = await getSeenReplyIds();
  const merged = Array.from(new Set([...existing, ...ids]));
  await db.put('meta', JSON.stringify(merged), SEEN_REPLY_IDS_KEY);
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
