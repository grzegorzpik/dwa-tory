// Miniaturowy podgląd ekranu w samouczku (spec §5.1). Port z
// docs/makiety/onboarding.tsx — przełożony na TYPE_COLOR/PERSON_COLOR
// z theme.ts zamiast lokalnych stałych mockupu (C.a → TYPE_COLOR.termin,
// C.b → TYPE_COLOR.cykliczny), żeby nie duplikować palety.

import { Fragment } from 'react';
import { Flame } from 'lucide-react';
import { C, TYPE_COLOR } from '../theme';
import type { TutorialStep } from '../lib/tutorialSteps';

const FILLED_DAYS = [3, 8, 14, 17];
const FILLED_MILESTONES = [1, 1, 0, 0];

export function TutorialPreview({ kind }: { kind: TutorialStep['key'] }) {
  if (kind === 'dziennik') {
    return (
      <div className="rounded-2xl p-3" style={{ background: `linear-gradient(135deg, ${TYPE_COLOR.termin}22, ${C.surface})`, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="w-6 h-6 rounded-full" style={{ background: TYPE_COLOR.termin }} />
          <span className="font-body text-[10px] flex items-center gap-1" style={{ color: C.gold }}>
            <Flame size={11} /> 12
          </span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: TYPE_COLOR.termin }} />
          <span className="font-body text-[11px]" style={{ color: C.text }}>Maraton treningowy</span>
        </div>
        <div className="rounded-lg py-2 text-center font-body text-[11px] font-semibold" style={{ background: TYPE_COLOR.termin, color: '#15241F' }}>
          ✓ Zrobione
        </div>
      </div>
    );
  }

  if (kind === 'cele') {
    return (
      <div className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full" style={{ background: TYPE_COLOR.termin }} />
          <span className="font-body text-[11px]" style={{ color: C.text }}>Maraton treningowy</span>
        </div>
        <div className="flex items-center gap-1 mb-2">
          {FILLED_MILESTONES.map((f, i) => (
            <Fragment key={i}>
              <div className="rounded-[2px]" style={{ width: 8, height: 8, background: f ? TYPE_COLOR.termin : C.surface2, border: `1px solid ${f ? TYPE_COLOR.termin : C.line}` }} />
              {i < FILLED_MILESTONES.length - 1 && <div className="flex-1" style={{ height: 1.5, background: f ? TYPE_COLOR.termin : C.line }} />}
            </Fragment>
          ))}
        </div>
        <div className="font-body text-[9px]" style={{ color: C.muted }}>2/4 kamieni</div>
      </div>
    );
  }

  if (kind === 'kalendarz') {
    return (
      <div className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {Array.from({ length: 21 }, (_, i) => (
            <div
              key={i}
              className="aspect-square rounded-[2px]"
              style={{ background: FILLED_DAYS.includes(i) ? TYPE_COLOR.termin : C.surface2, opacity: FILLED_DAYS.includes(i) ? 1 : 0.6 }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <div className="flex justify-between">
        {([['12', 'seria'], ['19', 'rekord'], ['6', 'kamieni']] as const).map(([v, l]) => (
          <div key={l} className="text-center">
            <div className="font-display text-base" style={{ color: C.gold }}>{v}</div>
            <div className="font-body" style={{ fontSize: 8, color: C.muted }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
