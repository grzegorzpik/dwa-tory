// Wspólny wzorzec rozwijanej pozycji w Profilu (spec §5.7: "wszystkie
// pozycje rozwijają się w miejscu, jednym wzorcem — klik → obrót strzałki
// → rozwinięcie"). Jeden komponent zamiast kopiowanego markupu per wiersz.

import { ChevronDown, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { C } from '../theme';

export function SettingsRow({
  icon: Icon,
  title,
  subtitle,
  expanded,
  onToggle,
  disabled,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <button
        onClick={onToggle}
        disabled={disabled}
        className="w-full flex items-center gap-3 px-3 py-3 bg-transparent border-0 cursor-pointer text-left"
        style={{ minHeight: 44, opacity: disabled ? 0.6 : 1, cursor: disabled ? 'default' : 'pointer' }}
      >
        <Icon size={16} style={{ color: C.muted }} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-body text-[12px]" style={{ color: C.text }}>{title}</div>
          {subtitle && <div className="font-body text-[10px] mt-0.5" style={{ color: C.muted }}>{subtitle}</div>}
        </div>
        {!disabled && (
          <ChevronDown size={15} className="shrink-0 transition-transform" style={{ color: C.muted, transform: expanded ? 'rotate(180deg)' : 'none' }} />
        )}
      </button>
      {expanded && !disabled && (
        <div className="rise px-3 pb-3 pt-1" style={{ borderTop: `1px solid ${C.line}` }}>
          {children}
        </div>
      )}
    </div>
  );
}
