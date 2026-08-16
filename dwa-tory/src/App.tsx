import { useState } from 'react';
import { Splash } from './components/Splash';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { NotificationsPanel } from './components/NotificationsPanel';
import { Dziennik } from './screens/Dziennik';
import { Cele } from './screens/Cele';
import { Kalendarz } from './screens/Kalendarz';
import { Profil } from './screens/Profil';
import { AppDataProvider, useAppData } from './store/AppDataContext';
import { C, SHELL_BG } from './theme';

export type TabId = 'dziennik' | 'cele' | 'kalendarz' | 'profil';

function AppShell() {
  const { loading, currentUser } = useAppData();
  const [showSplash, setShowSplash] = useState(true);
  const [tab, setTab] = useState<TabId>('dziennik');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const goToTab = (id: TabId) => {
    setNotificationsOpen(false);
    setTab(id);
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center py-8" style={{ background: SHELL_BG }}>
      <div
        className="w-full max-w-sm overflow-hidden flex flex-col relative"
        style={{ background: C.bg, border: `1px solid ${C.line}`, height: 820, borderRadius: '2.2rem' }}
      >
        {loading || !currentUser ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="font-display text-xl" style={{ color: C.gold }}>
              DWA TORY
            </span>
          </div>
        ) : (
          <>
            <Header
              currentUser={currentUser}
              showStreak={tab === 'dziennik'}
              unreadNotifications={0}
              onAvatarClick={() => goToTab('profil')}
              onBellClick={() => setNotificationsOpen((o) => !o)}
            />

            <div className="flex-1 overflow-y-auto px-4 pb-4 relative">
              <NotificationsPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
              {tab === 'dziennik' && <Dziennik />}
              {tab === 'cele' && <Cele />}
              {tab === 'kalendarz' && <Kalendarz />}
              {tab === 'profil' && <Profil />}
            </div>

            <BottomNav tab={tab} onChange={goToTab} />
          </>
        )}

        {showSplash && <Splash onDone={() => setShowSplash(false)} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppDataProvider>
      <AppShell />
    </AppDataProvider>
  );
}
