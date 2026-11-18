// Jorgo сайтынын service worker'и: колдонмону телефонго орнотууга мүмкүндүк берет
// жана интернет начар болгондо акыркы жүктөлгөн нерселерди көрсөтөт.
// Supabase сыяктуу башка сайттарга суроо-талаптарга тийбейт.
const CACHE = 'jorgo-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Барактар: адегенде интернеттен (жаңы версия), болбосо сакталганынан
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('app-shell', copy));
          return res;
        })
        .catch(() => caches.match('app-shell')),
    );
    return;
  }

  // JS, шрифттер, сүрөттөр: аттарында хэш бар, ошондуктан сакталганынан
  if (url.pathname.includes('/_expo/static/') || url.pathname.includes('/assets/') || url.pathname.endsWith('.png')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
