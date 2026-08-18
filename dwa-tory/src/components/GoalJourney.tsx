// "Twoja podróż" (spec §5.7) — pionowa oś czasu: Start → zdobyte kamienie
// → pulsujące "Dziś" → przyszłe (puste kropki). Tylko cele z liczonym
// postępem (termin/cyclicalContent) — nawyk bez końca nie ma czego liczyć.

import { GoalDot } from './GoalDot';
import { milestonesFor } from '../lib/goals';
import { C, TYPE_COLOR } from '../theme';
import type { Goal } from '../types';

type Node = { kind: 'start' } | { kind: 'today' } | { kind: 'milestone'; label: string; date: string; done: boolean };

function buildNodes(goal: Goal): Node[] {
  const milestones = milestonesFor(goal);
  const todayIndex = milestones.filter((m) => m.done).length; // wstaw "dziś" tuż przed pierwszym nieodhaczonym
  const nodes: Node[] = [{ kind: 'start' }];
  milestones.forEach((m, i) => {
    if (i === todayIndex) nodes.push({ kind: 'today' });
    nodes.push({ kind: 'milestone', label: m.label, date: m.date, done: m.done });
  });
  if (todayIndex >= milestones.length) nodes.push({ kind: 'today' });
  return nodes;
}

export function GoalJourney({ goal }: { goal: Goal }) {
  const trackColor = TYPE_COLOR[goal.type];
  const nodes = buildNodes(goal);
  const todayLabel = typeof goal.completedSessions === 'number' ? `Dziś — dzień ${goal.completedSessions}` : 'Dziś';

  return (
    <div className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <div className="flex items-center gap-2 mb-3">
        <GoalDot color={trackColor} character={goal.character} size={8} />
        <span className="font-body text-xs" style={{ color: C.text }}>{goal.title}</span>
      </div>
      <div className="flex flex-col">
        {nodes.map((node, i) => {
          const isLast = i === nodes.length - 1;
          if (node.kind === 'start') {
            return (
              <div key="start" className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="rounded-full" style={{ width: 8, height: 8, background: trackColor }} />
                  {!isLast && <div className="flex-1" style={{ width: 1.5, background: trackColor, minHeight: 18 }} />}
                </div>
                <div className="pb-3">
                  <div className="font-body text-[11px]" style={{ color: C.text }}>Start</div>
                  <div className="font-body text-[9px]" style={{ color: C.muted }}>{goal.start}</div>
                </div>
              </div>
            );
          }
          if (node.kind === 'today') {
            return (
              <div key="today" className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="marker-pulse rounded-full" style={{ width: 10, height: 10, background: C.gold, marginLeft: -1, marginRight: -1 }} />
                  {!isLast && <div className="flex-1" style={{ width: 1.5, background: C.line, minHeight: 18 }} />}
                </div>
                <div className="pb-3">
                  <div className="font-body text-[11px] font-semibold" style={{ color: C.gold }}>{todayLabel}</div>
                </div>
              </div>
            );
          }
          return (
            <div key={`${node.label}-${i}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="rounded-full"
                  style={{ width: 8, height: 8, background: node.done ? trackColor : 'transparent', border: `1.5px solid ${node.done ? trackColor : C.line}` }}
                />
                {!isLast && <div className="flex-1" style={{ width: 1.5, background: node.done ? trackColor : C.line, minHeight: 18 }} />}
              </div>
              <div className="pb-3">
                <div className="font-body text-[11px]" style={{ color: node.done ? C.text : C.muted }}>{node.label}</div>
                <div className="font-body text-[9px]" style={{ color: C.muted }}>{node.date}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
