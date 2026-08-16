import { Settings } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { ComingSoon } from '../components/ComingSoon';
import { useAppData } from '../store/AppDataContext';
import { C } from '../theme';
import { milestonesFor } from '../lib/goals';

export function Profil() {
  const { currentUser, goals } = useAppData();
  const milestonesReached = goals.reduce((sum, g) => sum + milestonesFor(g).filter((m) => m.done).length, 0);

  return (
    <div className="rise">
      <div className="flex flex-col items-center text-center pt-4 pb-5">
        <Avatar person={currentUser} size={64} />
        <div className="font-head text-lg mt-3" style={{ color: C.text }}>
          {currentUser.name}
        </div>
      </div>

      <div className="rounded-2xl p-3 flex justify-between mb-6" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        {[
          [String(currentUser.streak), 'seria'],
          [String(currentUser.longestStreak), 'rekord'],
          [String(milestonesReached), 'kamieni'],
        ].map(([v, l]) => (
          <div key={l} className="text-center flex-1">
            <div className="font-display text-lg" style={{ color: C.gold }}>
              {v}
            </div>
            <div className="font-body" style={{ fontSize: 10, color: C.muted }}>
              {l}
            </div>
          </div>
        ))}
      </div>

      <ComingSoon
        icon={Settings}
        title="Reszta Profilu"
        text="Twoja podróż w czasie i rozwijane ustawienia (powiadomienia, partner, samouczek) trafią tu w kolejnym etapie budowy."
      />
    </div>
  );
}
