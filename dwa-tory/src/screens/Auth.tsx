// Backend Etap 3 — logowanie. Magic link jako pierwszy wybór, hasło jako
// alternatywa (dodane po odkryciu w testach: dodanie appki do ekranu
// głównego na iOS tworzy osobny, izolowany magazyn danych od zwykłej
// Safari, a link z maila zawsze otwiera się w Safari — magic link nigdy nie
// dotrze do sesji ikony na ekranie głównym. Hasło da się wpisać wprost w
// appce dodanej do ekranu głównego, bez wychodzenia do maila).
// Poprzedza Onboarding w App.tsx; po uzyskaniu sesji Gate przełącza się na
// właściwą appkę.

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { C } from '../theme';

type Mode = 'magicLink' | 'password';
type PasswordAction = 'signIn' | 'signUp';
type Status = 'idle' | 'busy' | 'sent' | 'signedUpPendingConfirm' | 'error';

export function Auth() {
  const [mode, setMode] = useState<Mode>('magicLink');
  const [passwordAction, setPasswordAction] = useState<PasswordAction>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;

  const switchMode = (next: Mode) => {
    setMode(next);
    setStatus('idle');
    setError('');
  };

  const sendMagicLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus('busy');
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ email: trimmed, options: { emailRedirectTo: redirectTo } });
    if (error) {
      setError(error.message);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  };

  const submitPassword = async () => {
    const trimmed = email.trim();
    if (!trimmed || password.length < 6) return;
    setStatus('busy');
    setError('');
    if (passwordAction === 'signIn') {
      const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
      if (error) {
        setError(error.message);
        setStatus('error');
      }
      // Sukces: onAuthStateChange w AuthContext przełączy Gate samo — nic więcej nie robimy.
    } else {
      const { data, error } = await supabase.auth.signUp({ email: trimmed, password, options: { emailRedirectTo: redirectTo } });
      if (error) {
        setError(error.message);
        setStatus('error');
      } else if (!data.session) {
        // Projekt wymaga potwierdzenia e-maila przed pierwszym logowaniem — jednorazowe, potem hasło działa bez maila.
        setStatus('signedUpPendingConfirm');
      }
    }
  };

  const passwordTooShort = password.length > 0 && password.length < 6;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl mb-3" style={{ color: C.text }}>
        DWA <span style={{ color: C.gold }}>TORY</span>
      </h1>
      <p className="font-body text-xs mb-6" style={{ color: C.muted }}>
        Świadome tory, dwie osoby, jeden rytm dnia.
      </p>

      {status !== 'sent' && status !== 'signedUpPendingConfirm' && (
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: C.surface2 }}>
          <button
            onClick={() => switchMode('magicLink')}
            className="font-body text-[11px] px-3 py-1.5 rounded-lg cursor-pointer border-0"
            style={{ background: mode === 'magicLink' ? C.gold : 'transparent', color: mode === 'magicLink' ? '#15241F' : C.muted, minHeight: 44 }}
          >
            Link e-mail
          </button>
          <button
            onClick={() => switchMode('password')}
            className="font-body text-[11px] px-3 py-1.5 rounded-lg cursor-pointer border-0"
            style={{ background: mode === 'password' ? C.gold : 'transparent', color: mode === 'password' ? '#15241F' : C.muted, minHeight: 44 }}
          >
            Hasło
          </button>
        </div>
      )}

      {status === 'sent' && (
        <div className="rounded-2xl p-4 font-body text-xs w-full" style={{ background: C.surface, border: `1px solid ${C.gold}`, color: C.text }}>
          <Mail size={18} style={{ color: C.gold }} className="mb-2 mx-auto" />
          Wysłaliśmy link logowania na <strong>{email.trim()}</strong>. Otwórz go na tym urządzeniu, żeby wejść do aplikacji.
          <div className="font-body text-[10px] mt-2" style={{ color: C.muted }}>
            Uwaga: jeśli appka jest dodana do ekranu głównego, otwórz link w zwykłej przeglądarce i zaloguj się tam hasłem — link z maila i tak nie dotrze do ikony na ekranie głównym.
          </div>
          <button
            onClick={() => setStatus('idle')}
            className="block mt-3 mx-auto bg-transparent border-0 cursor-pointer font-body text-[11px]"
            style={{ color: C.gold, minHeight: 44 }}
          >
            Wyślij ponownie / zmień adres
          </button>
        </div>
      )}

      {status === 'signedUpPendingConfirm' && (
        <div className="rounded-2xl p-4 font-body text-xs w-full" style={{ background: C.surface, border: `1px solid ${C.gold}`, color: C.text }}>
          <Mail size={18} style={{ color: C.gold }} className="mb-2 mx-auto" />
          Wysłaliśmy link potwierdzający na <strong>{email.trim()}</strong>. Kliknij go raz, żeby aktywować konto — potem zaloguj się tutaj hasłem, bez potrzeby maila.
          <button
            onClick={() => {
              setStatus('idle');
              setPasswordAction('signIn');
            }}
            className="block mt-3 mx-auto bg-transparent border-0 cursor-pointer font-body text-[11px]"
            style={{ color: C.gold, minHeight: 44 }}
          >
            Wróć do logowania
          </button>
        </div>
      )}

      {status !== 'sent' && status !== 'signedUpPendingConfirm' && mode === 'magicLink' && (
        <div className="w-full">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMagicLink()}
            placeholder="twoj@email.pl"
            autoFocus
            className="w-full font-body text-sm px-3 py-2.5 rounded-xl outline-none mb-3"
            style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
          />
          {status === 'error' && (
            <div className="font-body text-[11px] mb-3" style={{ color: C.over }}>
              {error}
            </div>
          )}
          <button
            onClick={sendMagicLink}
            disabled={!email.trim() || status === 'busy'}
            className="w-full font-body text-sm font-semibold py-3 rounded-xl cursor-pointer border-0"
            style={{ background: C.gold, color: '#15241F', opacity: !email.trim() || status === 'busy' ? 0.6 : 1, minHeight: 44 }}
          >
            {status === 'busy' ? 'Wysyłanie…' : 'Wyślij link logowania'}
          </button>
        </div>
      )}

      {status !== 'sent' && status !== 'signedUpPendingConfirm' && mode === 'password' && (
        <div className="w-full">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="twoj@email.pl"
            autoFocus
            className="w-full font-body text-sm px-3 py-2.5 rounded-xl outline-none mb-2.5"
            style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
          />
          <input
            type="password"
            autoComplete={passwordAction === 'signIn' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
            placeholder="hasło (min. 6 znaków)"
            className="w-full font-body text-sm px-3 py-2.5 rounded-xl outline-none mb-2.5"
            style={{ background: C.surface, color: C.text, border: `1px solid ${passwordTooShort ? C.over : C.line}` }}
          />
          {status === 'error' && (
            <div className="font-body text-[11px] mb-2.5" style={{ color: C.over }}>
              {error}
            </div>
          )}
          <button
            onClick={submitPassword}
            disabled={!email.trim() || password.length < 6 || status === 'busy'}
            className="w-full font-body text-sm font-semibold py-3 rounded-xl cursor-pointer border-0 mb-2.5"
            style={{
              background: C.gold,
              color: '#15241F',
              opacity: !email.trim() || password.length < 6 || status === 'busy' ? 0.6 : 1,
              minHeight: 44,
            }}
          >
            {status === 'busy' ? '…' : passwordAction === 'signIn' ? 'Zaloguj' : 'Załóż konto'}
          </button>
          <button
            onClick={() => {
              setPasswordAction((a) => (a === 'signIn' ? 'signUp' : 'signIn'));
              setStatus('idle');
              setError('');
            }}
            className="font-body text-[11px] bg-transparent border-0 cursor-pointer"
            style={{ color: C.muted, minHeight: 44 }}
          >
            {passwordAction === 'signIn' ? 'Nie masz konta? Załóż je' : 'Masz już konto? Zaloguj się'}
          </button>
        </div>
      )}
    </div>
  );
}
