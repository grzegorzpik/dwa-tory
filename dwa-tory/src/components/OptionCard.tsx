import type { LucideIcon } from 'lucide-react';
import { C } from '../theme';

/** Karta wyboru w kreatorze (spec §5.5) — typ/charakter/plan kamieni. */
export function OptionCard({
  icon: Icon,
  title,
  desc,
  selected,
  onClick,
  color,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
  color?: string;
}) {
  const accent = color || C.gold;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-2xl text-left bg-transparent cursor-pointer"
      style={{ border: `1.5px solid ${selected ? accent : C.line}`, background: selected ? `${accent}14` : 'transparent' }}
    >
      <Icon size={18} style={{ color: selected ? accent : C.muted, marginTop: 1 }} />
      <div className="min-w-0">
        <div className="font-body text-[13px] font-semibold" style={{ color: C.text }}>
          {title}
        </div>
        <div className="font-body text-[11px] mt-0.5" style={{ color: C.muted }}>
          {desc}
        </div>
      </div>
    </button>
  );
}
