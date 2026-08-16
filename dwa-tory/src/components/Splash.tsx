// Spec §5.0: pokazuje się przy KAŻDYM uruchomieniu apki (nie tylko pierwszym),
// ale nie przy powrocie z innej karty/aplikacji — dlatego stan żyje tylko w
// pamięci komponentu nadrzędnego (useState w App), nigdy w storage.

import { useEffect } from 'react';
import { C, SHELL_BG, ANIM_MS } from '../theme';

export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, ANIM_MS.splash);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="splash-fade absolute inset-0 flex items-center justify-center"
      style={{ background: SHELL_BG, zIndex: 60 }}
    >
      <h1 className="font-display text-4xl" style={{ color: C.text }}>
        DWA <span style={{ color: C.gold }}>TORY</span>
      </h1>
    </div>
  );
}
