// Typy service workera (self: ServiceWorkerGlobalScope, event: PushEvent)
// pochodzą z osobnego tsconfig.sw.json (lib: WebWorker) — inny niż reszta
// appki (lib: DOM), bo obu libów nie da się połączyć w jednej kompilacji
// (konfliktujące deklaracje `self`).
//
// Własny service worker (injectManifest) zamiast auto-generowanego przez
// vite-plugin-pwa (generateSW) — Push API wymaga własnych event listenerów
// ('push', 'notificationclick'), których generateSW nie pozwala dopisać.
// precacheAndRoute + trasy cache'owania fontów Google to ten sam zestaw co
// wcześniej w vite.config.ts (workbox.runtimeCaching), przeniesiony tu 1:1.

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-stylesheets',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
);

/**
 * Krok 8 dokończony: prawdziwy Web Push zamiast samej preferencji. Payload
 * wysyłany przez Edge Function `send-push` to zawsze
 * `{ title: string, body: string }` (patrz supabase/functions/send-push).
 * `event.waitUntil` jest wymagany — bez niego przeglądarka może ubić SW,
 * zanim `showNotification` zdąży się wykonać.
 */
self.addEventListener('push', (event) => {
  let title = 'Dwa Tory';
  let body = '';
  try {
    const data = event.data?.json() as { title?: string; body?: string } | undefined;
    if (data?.title) title = data.title;
    if (data?.body) body = data.body;
  } catch {
    body = event.data?.text() ?? '';
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: `${self.registration.scope}icon-192.png`,
      badge: `${self.registration.scope}icon-192.png`,
    }),
  );
});

/** Klik w powiadomienie systemowe otwiera appkę (albo fokusuje już otwartą kartę). */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const scope = self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.startsWith(scope));
      if (existing) return existing.focus();
      return self.clients.openWindow(scope);
    }),
  );
});
