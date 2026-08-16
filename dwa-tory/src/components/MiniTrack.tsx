import { Fragment } from 'react';
import { C } from '../theme';
import { milestonesFor } from '../lib/goals';
import type { Goal } from '../types';

/** Mini-tor kamieni milowych — tylko jeśli cel ma kamienie (spec §5.3). */
export function MiniTrack({ goal, color }: { goal: Goal; color: string }) {
  const milestones = milestonesFor(goal);
  const doneCount = milestones.filter((m) => m.done).length;
  const total = milestones.length;
  return (
    <div className="flex items-center px-0.5">
      {milestones.map((m, i) => (
        <Fragment key={m.id}>
          <div
            className={i === doneCount - 1 ? 'marker-pulse' : ''}
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: m.done ? color : C.surface2,
              border: `1.5px solid ${m.done ? color : C.line}`,
              flexShrink: 0,
            }}
          />
          {i < total - 1 && <div className="flex-1" style={{ height: 2, background: i < doneCount - 1 ? color : C.line }} />}
        </Fragment>
      ))}
    </div>
  );
}
