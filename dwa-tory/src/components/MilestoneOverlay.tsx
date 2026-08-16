import { Sparkles } from 'lucide-react';
import { C } from '../theme';

/** Pełnoekranowa nakładka kamienia z blurem tła (spec §7, 3,4s). */
export function MilestoneOverlay({
  goalTitle,
  milestoneLabel,
  color,
}: {
  goalTitle: string;
  milestoneLabel: string;
  color: string;
}) {
  return (
    <div
      className="milestone-overlay absolute inset-0 flex items-center justify-center px-6"
      style={{ background: 'rgba(11,21,18,0.72)', backdropFilter: 'blur(6px)', zIndex: 50 }}
    >
      <div className="milestone-banner rounded-2xl p-5 text-center" style={{ background: C.surface, border: `1px solid ${color}` }}>
        <Sparkles size={26} style={{ color }} className="mb-2 mx-auto" />
        <div className="font-body text-[11px] mb-1" style={{ color: C.muted }}>
          Kamień milowy — {goalTitle}
        </div>
        <div className="font-head text-lg" style={{ color: C.text }}>
          {milestoneLabel}
        </div>
      </div>
    </div>
  );
}
