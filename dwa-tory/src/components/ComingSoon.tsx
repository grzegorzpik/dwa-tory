import type { LucideIcon } from 'lucide-react';
import { C } from '../theme';

/** Placeholder dla zakładek budowanych w kolejnych etapach (spec §10, kroki 4-6). */
export function ComingSoon({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rise flex flex-col items-center text-center py-16 px-4">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ background: `${C.gold}1f`, border: `1.5px solid ${C.gold}` }}
      >
        <Icon size={24} style={{ color: C.gold }} />
      </div>
      <h2 className="font-head text-lg mb-2" style={{ color: C.text }}>
        {title}
      </h2>
      <p className="font-body text-xs max-w-[220px]" style={{ color: C.muted }}>
        {text}
      </p>
    </div>
  );
}
