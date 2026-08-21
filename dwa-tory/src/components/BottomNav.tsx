import { BookOpen, Target, Calendar, User, type LucideIcon } from 'lucide-react';
import { C } from '../theme';
import type { TabId } from '../App';

const TABS: { id: TabId; icon: LucideIcon; label: string }[] = [
  { id: 'dziennik', icon: BookOpen, label: 'Dziennik' },
  { id: 'cele', icon: Target, label: 'Cele' },
  { id: 'kalendarz', icon: Calendar, label: 'Kalendarz' },
  { id: 'profil', icon: User, label: 'Profil' },
];

export function BottomNav({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  return (
    <div
      className="flex shrink-0"
      // safe-area-inset-bottom = strefa pod paskiem gestów iOS (index.html ma
      // viewport-fit=cover, żeby ta zmienna w ogóle była dostępna) — bez tego
      // pasek zachodzi na system home indicator na telefonach bez przycisku Home.
      style={{ borderTop: `1px solid ${C.line}`, paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
    >
      {TABS.map(({ id, icon: Icon, label }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex flex-col items-center gap-1 py-3 flex-1 font-body text-[11px] bg-transparent border-0 cursor-pointer"
            style={{ color: active ? C.gold : C.muted, minHeight: 44 }}
          >
            <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
