import { C } from '../theme';

/** Chip wyboru (wzorzec powtarzalności, start itd. — spec §5.5). */
export function SelectChip({ label, selected, onClick, color }: { label: string; selected: boolean; onClick: () => void; color?: string }) {
  const accent = color || C.gold;
  return (
    <button
      onClick={onClick}
      className="font-body text-[12px] px-3 py-1.5 rounded-full bg-transparent cursor-pointer"
      style={{ border: `1px solid ${selected ? accent : C.line}`, color: selected ? accent : C.muted }}
    >
      {label}
    </button>
  );
}
