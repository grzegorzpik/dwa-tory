import { useState, type ReactNode } from 'react';
import { Splash } from './components/Splash';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { NotificationsPanel } from './components/NotificationsPanel';
import { ReplyOverlay } from './components/ReplyOverlay';
import { TutorialCardsOverlay } from './components/TutorialCardsOverlay';
import { Auth } from './screens/Auth';
import { Dziennik } from './screens/Dziennik';
import { Cele } from './screens/Cele';
import { GoalEditor } from './screens/GoalEditor';
import { Kalendarz } from './screens/Kalendarz';
import { Onboarding } from './screens/Onboarding';
import { Profil } from './screens/Profil';
import { AppDataProvider, useAppData } from './store/AppDataContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import { C, SHELL_BG } from './theme';
import type { Goal, Task } from './types';

export type TabId = 'dziennik' | 'cele' | 'kalendarz' | 'profil';

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="phone-shell" style={{ background: SHELL_BG }}>
      <div className="phone-card" style={{ background: C.bg, borderColor: C.line }}>
        {children}
      </div>
    </div>
  );
}

function AppShell() {
  const { loading, currentUser, partner, notifications, settings, replyCelebration } = useAppData();
  const [tab, setTab] = useState<TabId>('dziennik');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  // 'new' = kreator pustego formularza; Goal = edycja istniejącego celu (wejście: FAB albo karta celu — spec §5.5)
  const [goalEditor, setGoalEditor] = useState<'new' | Goal | null>(null);
  // Osobny stan od goalEditor — edycja "Szybkiego zadania" (wejście: dotknięcie wiersza zadania w Dzienniku/Kalendarzu, na prośbę użytkownika).
  const [taskEditor, setTaskEditor] = useState<Task | null>(null);

  const goToTab = (id: TabId) => {
    setNotificationsOpen(false);
    setTab(id);
  };

  if (loading || !currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="font-display text-xl" style={{ color: C.gold }}>
          DWA TORY
        </span>
      </div>
    );
  }

  if (!settings.hasCompletedOnboarding) return <Onboarding />;

  if (goalEditor !== null) {
    return <GoalEditor goal={goalEditor === 'new' ? undefined : goalEditor} onClose={() => setGoalEditor(null)} />;
  }
  if (taskEditor !== null) {
    return <GoalEditor task={taskEditor} onClose={() => setTaskEditor(null)} />;
  }

  return (
    <>
      <Header
        currentUser={currentUser}
        showStreak={tab === 'dziennik'}
        unreadNotifications={notifications.filter((n) => !n.responded).length}
        onAvatarClick={() => goToTab('profil')}
        onBellClick={() => setNotificationsOpen((o) => !o)}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-4 relative">
        <NotificationsPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
        {replyCelebration && partner && (
          <ReplyOverlay eventText={replyCelebration.eventText} partnerName={partner.name} reply={replyCelebration.reply} color={C.gold} />
        )}
        {tab === 'dziennik' && <Dziennik onEditGoal={(g) => setGoalEditor(g)} onEditTask={(t) => setTaskEditor(t)} onNewGoal={() => setGoalEditor('new')} />}
        {tab === 'cele' && <Cele onNewGoal={() => setGoalEditor('new')} onEditGoal={(g) => setGoalEditor(g)} />}
        {tab === 'kalendarz' && <Kalendarz onEditGoal={(g) => setGoalEditor(g)} onEditTask={(t) => setTaskEditor(t)} onGoToDziennik={() => goToTab('dziennik')} />}
        {tab === 'profil' && <Profil onOpenTutorial={() => setTutorialOpen(true)} />}
      </div>

      <BottomNav tab={tab} onChange={goToTab} />

      {/* Poza przewijaną treścią (nie zagnieżdżony w overflow-y-auto Profilu) — inset-0
          musi pokryć całą ramkę telefonu niezależnie od aktualnego scrolla wewnątrz Profilu. */}
      {tutorialOpen && <TutorialCardsOverlay onClose={() => setTutorialOpen(false)} />}
    </>
  );
}

/** Backend Etap 3 — dopiero po realnej sesji Supabase (magic link) montujemy dane appki. */
function Gate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="font-display text-xl" style={{ color: C.gold }}>
          DWA TORY
        </span>
      </div>
    );
  }

  if (!session?.user) return <Auth />;

  return (
    <AppDataProvider userId={session.user.id}>
      <AppShell />
    </AppDataProvider>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  return (
    <AuthProvider>
      <PhoneFrame>
        <Gate />
        {showSplash && <Splash onDone={() => setShowSplash(false)} />}
      </PhoneFrame>
    </AuthProvider>
  );
}
