// Spec §5.2 — stały nagłówek na wszystkich zakładkach.
// Zasada: cyfra na miniaturce pojawia się WYŁĄCZNIE przy dzwoneczku, awatar
// zawsze czysty (żadnego badge'a na avatarze).

import { Bell, Flame } from 'lucide-react';
import { Avatar } from './Avatar';
import { C } from '../theme';
import type { Person } from '../types';

export function Header({
  currentUser,
  showStreak,
  unreadNotifications,
  onAvatarClick,
  onBellClick,
}: {
  currentUser: Person;
  showStreak: boolean;
  unreadNotifications: number;
  onAvatarClick: () => void;
  onBellClick: () => void;
}) {
  return (
    <div className="px-4 pt-6 pb-4 flex items-center justify-between shrink-0">
      <h1 className="font-display text-3xl" style={{ color: C.text }}>
        DWA <span style={{ color: C.gold }}>TORY</span>
      </h1>
      <div className="flex items-center gap-3">
        {showStreak && (
          <span className="font-body text-[11px] flex items-center gap-1" style={{ color: C.gold }}>
            <Flame size={12} /> {currentUser.streak}
          </span>
        )}
        <button
          onClick={onAvatarClick}
          className="bg-transparent border-0 cursor-pointer flex items-center justify-center"
          style={{ width: 44, height: 44, margin: '-7px' }}
          aria-label="Profil"
        >
          <Avatar person={currentUser} size={30} />
        </button>
        <button
          onClick={onBellClick}
          className="relative bg-transparent border-0 cursor-pointer flex items-center justify-center"
          style={{ width: 44, height: 44, margin: '-12px -8px -12px 0' }}
          aria-label="Powiadomienia"
        >
          <span className="relative flex items-center justify-center" style={{ width: 20, height: 20 }}>
            <Bell size={20} style={{ color: C.text }} />
            {unreadNotifications > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-[3px] rounded-full flex items-center justify-center font-body"
                style={{ background: C.gold, color: '#15241F', fontSize: 8 }}
              >
                {unreadNotifications}
              </span>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
