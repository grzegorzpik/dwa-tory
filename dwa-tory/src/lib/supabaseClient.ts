// Klient Supabase — jedyne miejsce, które importuje @supabase/supabase-js
// (spec §3: backend = Supabase). Zmienne z .env.local (VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY), wstrzykiwane przez Vite w czasie builda.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Brak VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — sprawdź .env.local (dev) albo sekrety builda (produkcja).');
}

export const supabase = createClient(url, anonKey);
