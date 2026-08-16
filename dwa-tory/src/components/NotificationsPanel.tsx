// Spec §5.8: panel wysuwany od góry, dzwoneczek jako przełącznik. Pełna
// logika (chipy odpowiedzi, limit słów) to krok 8 planu budowy — na razie
// sam mechanizm otwierania/zamykania panelu, żeby nagłówek był kompletny.

import { ChevronLeft, Bell } from 'lucide-react';
import { C } from '../theme';

export function NotificationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 overflow-y-auto px-4 pb-4"
      style={{
        background: C.bg,
        transform: open ? 'translateY(0)' : 'translateY(-102%)',
        transition: 'transform 0.3s ease',
        pointerEvents: open ? 'auto' : 'none',
        zIndex: 30,
      }}
    >
      <div className="w-10 h-1 rounded-full mx-auto mt-1 mb-3" style={{ background: C.line }} />
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-head text-lg" style={{ color: C.text }}>
          Powiadomienia
        </h2>
        <button onClick={onClose} className="flex items-center gap-1 font-body text-xs bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}>
          <ChevronLeft size={15} className="rotate-90" /> zwiń
        </button>
      </div>
      <div className="rise flex flex-col items-center text-center py-12 px-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: `${C.gold}1f`, border: `1.5px solid ${C.gold}` }}>
          <Bell size={20} style={{ color: C.gold }} />
        </div>
        <p className="font-body text-xs max-w-[220px]" style={{ color: C.muted }}>
          Panel powiadomień od partnerki trafi tu w kolejnym etapie budowy.
        </p>
      </div>
    </div>
  );
}
