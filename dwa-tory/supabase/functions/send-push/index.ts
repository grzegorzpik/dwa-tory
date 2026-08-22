// Dwa Tory — Edge Function wywoływana Database Webhookiem po INSERT do
// public.notifications (patrz README, sekcja "Push"). Wysyła realny Web
// Push do ADRESATA zdarzenia — czyli drugiej osoby w parze, NIE do actor_id,
// który sam wykonał akcję opisaną w treści powiadomienia.
//
// Sekrety (Supabase Dashboard → Edge Functions → send-push → Settings, albo
// `supabase secrets set`), NIGDY w repo:
//   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY — para z `npx web-push generate-vapid-keys`
//   VAPID_SUBJECT — "mailto:twoj@email.com" (wymóg specyfikacji Web Push)
// SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY są wstrzykiwane automatycznie do
// każdej Edge Function przez runtime — nie trzeba ich ustawiać ręcznie.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:brak-kontaktu@example.com';

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

interface NotificationRow {
  id: string;
  pair_id: string;
  actor_id: string;
  text: string;
}

interface WebhookPayload {
  type: 'INSERT';
  table: 'notifications';
  record: NotificationRow;
}

Deno.serve(async (req) => {
  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response('nieprawidłowy JSON', { status: 400 });
  }

  const notification = payload.record;
  if (!notification) return new Response('brak record w payloadzie webhooka', { status: 400 });

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Adresat = DRUGI członek pary (nie autor akcji) — dokładnie ta sama
  // reguła co po stronie klienta (AppDataContext filtruje actorId !== userId).
  const { data: members, error: membersError } = await supabase
    .from('pair_members')
    .select('user_id')
    .eq('pair_id', notification.pair_id);
  if (membersError) {
    console.error('Nie udało się odczytać pair_members', membersError);
    return new Response('błąd odczytu pary', { status: 500 });
  }
  const recipientId = members?.find((m) => m.user_id !== notification.actor_id)?.user_id;
  if (!recipientId) return new Response('brak adresata (para niekompletna)', { status: 200 });

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('person_id', recipientId);
  if (subsError) {
    console.error('Nie udało się odczytać push_subscriptions', subsError);
    return new Response('błąd odczytu subskrypcji', { status: 500 });
  }
  if (!subs || subs.length === 0) return new Response('adresat bez subskrypcji push', { status: 200 });

  const body = JSON.stringify({ title: 'Dwa Tory', body: notification.text });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
      } catch (e) {
        const statusCode = (e as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subskrypcja martwa (użytkownik wylogował się z konta Google/Apple,
          // odinstalował appkę, wyczyścił dane przeglądarki) — usuń, żeby nie
          // próbować bez końca przy każdym kolejnym powiadomieniu.
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('Nie udało się wysłać push do subskrypcji', sub.id, e);
        }
      }
    }),
  );

  return new Response('ok', { status: 200 });
});
