// Dźwięk powiadomienia (Profil → Ustawienia → Powiadomienia → "Dźwięk").
// Czysty Web Audio (żaden plik audio do pobrania/spakowania) — gra tylko gdy
// appka jest OTWARTA i odbiera nowe powiadomienie partnerki przez Realtime
// (patrz refreshNotifications w AppDataContext). Prawdziwy push (krok 7,
// wciąż nie zbudowany — patrz README) wymagałby VAPID + service workera +
// serwerowego triggera; bez tego appka po prostu nie wie o niczym, gdy jest
// zamknięta, więc dźwięk w tle/offline nie jest tu możliwy do zrobienia.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/**
 * Krótki dwutonowy "ding" (kwinta czysta, 880Hz → 1320Hz), generowany na
 * żywo zamiast odtwarzany z pliku. iOS wymaga, żeby AudioContext był
 * odblokowany prawdziwym gestem użytkownika — appka i tak jest w tym
 * momencie otwarta i używana (Realtime działa tylko wtedy), więc w
 * praktyce kontekst jest już odblokowany wcześniejszym dotknięciem
 * ekranu. Błąd (np. brak wsparcia, zablokowany autoplay) tylko logowany,
 * nigdy nie przerywa reszty odświeżania powiadomień.
 */
export function playNotificationSound(): void {
  const audioCtx = getContext();
  if (!audioCtx) return;
  const resume = audioCtx.state === 'suspended' ? audioCtx.resume() : Promise.resolve();
  resume
    .then(() => {
      const now = audioCtx.currentTime;
      [880, 1320].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const start = now + i * 0.09;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + 0.2);
      });
    })
    .catch((e) => console.error('Nie udało się odtworzyć dźwięku powiadomienia', e));
}
