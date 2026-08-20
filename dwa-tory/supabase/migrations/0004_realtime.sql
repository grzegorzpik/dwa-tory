-- Dwa Tory — Realtime (Etap 5 planu backendu).
--
-- Dołącza tabele, o których zmianach partner musi się dowiedzieć bez
-- ręcznego odświeżania (spec §6, krok 5), do domyślnej publikacji Supabase
-- Realtime. RLS z Etapu 2 nadal obowiązuje na strumieniu zmian — cel z
-- visible_to_partner = false nie wygeneruje eventu u partnera.

alter publication supabase_realtime add table public.goals;
alter publication supabase_realtime add table public.instances;
alter publication supabase_realtime add table public.milestones;
