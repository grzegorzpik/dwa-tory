// Backend Etap 3 — logowanie magic link (decyzja: bez haseł). Poprzedza
// Onboarding w App.tsx; po kliknięciu linku z maila sesja pojawia się przez
// AuthContext i Gate przełącza się na właściwą appkę.

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { C } from '../theme';

export function Auth() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const sendLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus('sending');
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
    });
    if (error) {
      setError(error.message);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl mb-3" style={{ color: C.text }}>
        DWA <span style={{ color: C.gold }}>TORY</span>
      </h1>
      <p className="font-body text-xs mb-8" style={{ color: C.muted }}>
        Świadome tory, dwie osoby, jeden rytm dnia.
      </p>

      {status === 'sent' ? (
        <div className="rounded-2xl p-4 font-body text-xs w-full" style={{ background: C.surface, border: `1px solid ${C.gold}`, color: C.text }}>
          <Mail size={18} style={{ color: C.gold }} className="mb-2 mx-auto" />
          Wysłaliśmy link logowania na <strong>{email.trim()}</strong>. Otwórz go na tym urządzeniu, żeby wejść do aplikacji.
          <button
            onClick={() => setStatus('idle')}
            className="block mt-3 mx-auto bg-transparent border-0 cursor-pointer font-body text-[11px]"
            style={{ color: C.gold, minHeight: 44 }}
          >
            Wyślij ponownie / zmień adres
          </button>
        </div>
      ) : (
        <div className="w-full">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendLink()}
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
            onClick={sendLink}
            disabled={!email.trim() || status === 'sending'}
            className="w-full font-body text-sm font-semibold py-3 rounded-xl cursor-pointer border-0"
            style={{
              background: C.gold,
              color: '#15241F',
              opacity: !email.trim() || status === 'sending' ? 0.6 : 1,
              minHeight: 44,
            }}
          >
            {status === 'sending' ? 'Wysyłanie…' : 'Wyślij link logowania'}
          </button>
        </div>
      )}
    </div>
  );
}
