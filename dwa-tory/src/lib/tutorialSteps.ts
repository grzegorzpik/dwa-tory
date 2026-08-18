// Treść samouczka — spec §5.1, wspólna dla pełnego onboardingu i dla
// samodzielnego relaunchu z Profilu (jedno źródło, nie kopiowane).

import { BookOpen, Calendar, Target, User, type LucideIcon } from 'lucide-react';

export interface TutorialStep {
  key: 'dziennik' | 'cele' | 'kalendarz' | 'profil';
  icon: LucideIcon;
  title: string;
  text: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { key: 'dziennik', icon: BookOpen, title: 'Dziennik', text: 'Codzienne odhaczanie — Twoje tory, jeden dotyk, bez rozklikiwania.' },
  { key: 'cele', icon: Target, title: 'Cele', text: 'Zakładanie i podgląd celów — typ, kolor, kamienie milowe na mapie.' },
  { key: 'kalendarz', icon: Calendar, title: 'Kalendarz', text: 'Tydzień albo miesiąc, Twój widok albo wspólny z partnerką.' },
  { key: 'profil', icon: User, title: 'Profil', text: 'Rekordy, Twoja podróż w czasie, i ustawienia całej aplikacji.' },
];
