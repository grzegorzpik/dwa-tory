// Spec §5.8 — panel wysuwany od góry, dzwoneczek jako przełącznik.
// Zamykanie: przycisk "zwiń", przeciągnięcie UCHWYTU w górę (nie całego
// panelu — inaczej koliduje ze scrollem listy), albo zmiana zakładki
// (obsłużona przez rodzica — App.tsx czyści notificationsOpen w goToTab).

import { useRef, useState, type TouchEvent } from 'react';
import { Bell, Check, ChevronLeft, Send } from 'lucide-react';
import { Avatar } from './Avatar';
import { canSendReply, MAX_REPLY_WORDS, REPLY_CHIPS, wordCount } from '../lib/notifications';
import { useAppData } from '../store/AppDataContext';
import { C } from '../theme';

const SWIPE_CLOSE_THRESHOLD = 40;

export function NotificationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUser, partner, notifications, sendReply } = useAppData();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const touchStartY = useRef<number | null>(null);

  const setDraft = (id: string, text: string) => setDrafts((d) => ({ ...d, [id]: text }));

  const onHandleTouchStart = (e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onHandleTouchEnd = (e: TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (delta > SWIPE_CLOSE_THRESHOLD) onClose();
    touchStartY.current = null;
  };

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
      <div
        className="w-10 h-1 rounded-full mx-auto mt-1 mb-3"
        style={{ background: C.line, touchAction: 'none' }}
        onTouchStart={onHandleTouchStart}
        onTouchEnd={onHandleTouchEnd}
      />
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-head text-lg" style={{ color: C.text }}>Powiadomienia</h2>
        <button onClick={onClose} className="flex items-center gap-1 font-body text-xs bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}>
          <ChevronLeft size={15} className="rotate-90" /> zwiń
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="rise flex flex-col items-center text-center py-12 px-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: `${C.gold}1f`, border: `1.5px solid ${C.gold}` }}>
            <Bell size={20} style={{ color: C.gold }} />
          </div>
          <p className="font-body text-xs max-w-[220px]" style={{ color: C.muted }}>Na razie cisza — tu pojawi się to, co zrobi {partner?.name ?? 'partnerka'}.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => {
            const person = n.person === currentUser.id ? currentUser : partner;
            const draft = drafts[n.id] ?? '';
            const count = wordCount(draft);
            const overLimit = count > MAX_REPLY_WORDS;
            return (
              <div key={n.id} className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                <div className="flex items-center gap-2 mb-1.5">
                  {person && <Avatar person={person} size={22} />}
                  <span className="font-body text-[12px] flex-1 min-w-0" style={{ color: C.text }}>
                    <b>{person?.name}</b> {n.text}
                  </span>
                </div>
                <div className="font-body text-[9px] mb-2" style={{ color: C.muted }}>{n.time}</div>

                {n.responded ? (
                  <div className="font-body text-[11px] flex items-center gap-1.5" style={{ color: C.gold }}>
                    <Check size={12} /> Wysłano: „{n.reply}”
                  </div>
                ) : (
                  <>
                    <div className="flex gap-1.5 mb-2 flex-wrap">
                      {REPLY_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => sendReply(n.id, chip)}
                          className="font-body text-[10px] px-2 py-1 rounded-full bg-transparent cursor-pointer"
                          style={{ color: C.muted, border: `1px solid ${C.line}` }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        value={draft}
                        onChange={(e) => setDraft(n.id, e.target.value)}
                        placeholder="Krótkie docenienie…"
                        className="flex-1 font-body text-xs px-2.5 py-1.5 rounded-lg outline-none"
                        style={{ background: C.surface2, color: C.text, border: `1px solid ${overLimit ? C.over : C.line}` }}
                      />
                      <button
                        onClick={() => sendReply(n.id, draft.trim())}
                        disabled={!canSendReply(draft)}
                        className="p-2 rounded-lg flex items-center justify-center cursor-pointer border-0"
                        style={{ background: canSendReply(draft) ? C.gold : C.surface2, color: '#15241F', opacity: canSendReply(draft) ? 1 : 0.5 }}
                        aria-label="Wyślij"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                    <div className="font-body text-[9px] mt-1" style={{ color: overLimit ? C.over : C.muted }}>
                      {count}/{MAX_REPLY_WORDS} słów
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
