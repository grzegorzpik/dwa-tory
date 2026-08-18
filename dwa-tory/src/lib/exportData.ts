// Eksport/backup danych z poziomu Profilu — domyka lukę ze spec §7
// ("Luka do domknięcia: eksport / backup danych"). Minimalna wersja: JSON
// z własnymi danymi, do pobrania. Nie eksportujemy danych partnerki —
// to nie nasze dane do zabrania.

import type { AppSettings, Goal, Person } from '../types';

export interface ExportPayload {
  exportedAt: string;
  app: 'dwa-tory';
  version: 1;
  person: Person;
  goals: Goal[];
  settings: AppSettings;
}

export function buildExportPayload(person: Person, goals: Goal[], settings: AppSettings): ExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    app: 'dwa-tory',
    version: 1,
    person,
    goals,
    settings,
  };
}

/** Startuje pobranie pliku w przeglądarce — Blob + tymczasowy <a download>. */
export function downloadJson(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
