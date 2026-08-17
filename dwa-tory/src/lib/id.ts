// ID: crypto.randomUUID(), nie Date.now() (spec §8).
export const uuid = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
