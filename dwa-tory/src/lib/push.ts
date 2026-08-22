// Web Push (dokończenie kroku 8 — Profil → Powiadomienia → "Push").
// Subskrypcja przeglądarki zapisana w Supabase; samo wysyłanie robi Edge
// Function `send-push`, wyzwalana Database Webhookiem na INSERT do
// `notifications` (patrz README i supabase/functions/send-push).
//
// Ograniczenie platformy (bez obejścia po stronie appki, jak przy
// wycofanej integracji z kalendarzem — patrz README "Uwaga historyczna"):
// Push API na iOS działa WYŁĄCZNIE po zainstalowaniu appki na ekranie
// głównym (standalone), od iOS 16.4. W zwykłej karcie Safari
// `'PushManager' in window` jest false — stąd `isPushSupported()`
// eksportowane osobno, żeby Profil mógł jasno to zakomunikować zamiast
// pokazywać przełącznik, który wygląda na działający, a nic nie robi.

import { supabase } from './supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
}

// Web Push wymaga klucza binarnego (Uint8Array), nie base64url stringa —
// standardowa konwersja z dokumentacji MDN/web.dev, bo `atob` sam nie
// rozumie base64url (-_ zamiast +/) ani paddingu.
function urlBase64ToUint8Array(base64Url: string): BufferSource {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Prosi o zgodę na powiadomienia (jeśli jeszcze nie udzielona), subskrybuje
 * Push Manager i zapisuje subskrypcję w Supabase. Rzuca wyjątek przy
 * odmowie/błędzie — wołający (Profil.tsx) cofa wtedy przełącznik i pokazuje
 * komunikat, zamiast cicho udawać sukces.
 */
export async function subscribeToPush(personId: string): Promise<void> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) throw new Error('Push nie jest wspierany w tej przeglądarce.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Brak zgody na powiadomienia.');

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) throw new Error('Subskrypcja push bez kluczy szyfrowania.');

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ person_id: personId, endpoint: subscription.endpoint, p256dh, auth }, { onConflict: 'endpoint' });
  if (error) throw new Error(error.message);
}

/** Usuwa subskrypcję z przeglądarki i z Supabase — wołane, gdy użytkownik wyłącza "Push". */
export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  if (error) console.error('Nie udało się usunąć subskrypcji push z Supabase', error);
}
