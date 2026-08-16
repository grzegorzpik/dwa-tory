import { C } from '../theme';
import type { DayInstance, NextInstance } from '../types';

/** Stany moved/skipped mają neutralne kolory — nie czerwone (spec §4: to nie porażka). */
export function DayChip({ label, inst, color }: { label: string; inst: DayInstance | NextInstance; color: string }) {
  const styles = {
    plan: { border: `1.5px solid ${C.line}`, background: 'transparent', text: C.muted },
    done: { border: `1.5px solid ${color}`, background: color, text: '#15241F' },
    moved: { border: `1.5px dashed ${C.gold}`, background: 'transparent', text: C.gold },
    skipped: { border: `1.5px solid ${C.skipped}`, background: 'transparent', text: C.skipped },
  } as const;
  const s = styles[inst.status];
  const double = 'double' in inst && inst.double;
  return (
    <div className="rounded-lg px-2.5 py-1.5 font-body text-[11px] flex items-center gap-1" style={{ border: s.border, background: s.background, color: s.text }}>
      {label}
      {double && <span className="font-display" style={{ fontSize: 10 }}>2×</span>}
    </div>
  );
}
