import { MessageCircle } from 'lucide-react';
import { C } from '../theme';

/**
 * Pełnoekranowa nakładka na reakcję partnerki na Twoje osiągnięcie —
 * mirror MilestoneOverlay (te same klasy animacji z index.css), bo panel
 * Powiadomień sam w sobie okazał się za łatwy do przeoczenia (zgłoszenie:
 * "skomentowałem cel, Wiola nic nie dostała" — dostała, po prostu nikt nie
 * zajrzał do panelu). Renderowana na poziomie AppShell (nie tylko
 * Dziennika), żeby złapać uwagę niezależnie od aktywnej zakładki.
 */
export function ReplyOverlay({ eventText, partnerName, reply, color }: { eventText: string; partnerName: string; reply: string; color: string }) {
  return (
    <div
      className="milestone-overlay absolute inset-0 flex items-center justify-center px-6"
      style={{ background: 'rgba(11,21,18,0.72)', backdropFilter: 'blur(6px)', zIndex: 50 }}
    >
      <div className="milestone-banner rounded-2xl p-5 text-center" style={{ background: C.surface, border: `1px solid ${color}` }}>
        <MessageCircle size={26} style={{ color }} className="mb-2 mx-auto" />
        <div className="font-body text-[11px] mb-1" style={{ color: C.muted }}>
          Ty {eventText}
        </div>
        <div className="font-head text-lg" style={{ color: C.text }}>
          {partnerName}: „{reply}”
        </div>
      </div>
    </div>
  );
}
