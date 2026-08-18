// Samouczek uruchamiany ponownie z Profilu (spec §5.7 "Uruchom samouczek
// ponownie" + §5.1). Ta sama treść (TUTORIAL_STEPS/TutorialPreview) co w
// pełnym onboardingu, ale bez ekranu powitalnego/profilu/partnera — tylko
// same 4 karty funkcji, z przyciskiem zamknięcia.

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { TUTORIAL_STEPS } from '../lib/tutorialSteps';
import { TutorialPreview } from './TutorialPreview';
import { C } from '../theme';

export function TutorialCardsOverlay({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const t = TUTORIAL_STEPS[step];
  const Icon = t.icon;
  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <div className="rise absolute inset-0 flex flex-col px-6 pb-6 pt-5" style={{ background: C.bg, zIndex: 40 }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex gap-1">
          {TUTORIAL_STEPS.map((_, i) => (
            <div key={i} className="flex-1 rounded-full" style={{ height: 3, background: i <= step ? C.gold : C.line }} />
          ))}
        </div>
        <button onClick={onClose} className="p-1 bg-transparent border-0 cursor-pointer" style={{ color: C.muted, minWidth: 28, minHeight: 28 }} aria-label="Zamknij samouczek">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: `${C.gold}1f`, border: `1.5px solid ${C.gold}` }}>
          <Icon size={22} style={{ color: C.gold }} />
        </div>
        <h2 className="font-head text-xl mb-2" style={{ color: C.text }}>{t.title}</h2>
        <p className="font-body text-xs mb-5" style={{ color: C.muted }}>{t.text}</p>
        <div className="w-full">
          <TutorialPreview kind={t.key} />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-3 rounded-xl bg-transparent cursor-pointer flex items-center justify-center"
            style={{ border: `1px solid ${C.line}`, color: C.muted, minHeight: 44 }}
            aria-label="Wstecz"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <button
          onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
          className="flex-1 font-body text-sm font-semibold py-3 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 border-0"
          style={{ background: C.gold, color: '#15241F', minHeight: 44 }}
        >
          {isLast ? 'Zamknij' : 'Dalej'}
          {!isLast && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
}
