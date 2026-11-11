/* Ludoteca PenTech · service worker
   Sube CACHE en cada publicación (ludoteca-v2 → ludoteca-v3 …).

   Importante: esta app vive en la raíz del sitio y los contadores cuelgan de ella.
   Este service worker SOLO atiende a la lanzadera (sus archivos y las imágenes que
   ella pide). Todo lo que pidan los contadores pasa de largo, sin tocarlo. */
const CACHE = 'ludoteca-v2';
const BASE = new URL(self.registration.scope).pathname;
const PROPIOS = [
  '', 'index.html', 'manifest.json',
  'fonts/bagel-fat-one.woff2', 'fonts/bricolage-grotesque.woff2',
  'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png',
  'apple-touch-icon.png', 'favicon-32.png'
].map(f => BASE + f);
const PAGINAS = [BASE, BASE + 'index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PROPIOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('ludoteca-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const propio = PROPIOS.includes(url.pathname);
  let pedidoPorLanzadera = false;
  if (!propio && req.destination === 'image' && req.referrer) {
    try { pedidoPorLanzadera = PAGINAS.includes(new URL(req.referrer).pathname); } catch (err) {}
  }
  if (!propio && !pedidoPorLanzadera) return;   // es cosa de un contador: no se toca

  // Red primero (los cambios se ven al momento); la caché solo sirve sin conexión.
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return res;
    }).catch(() =>
      caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match(BASE) : Response.error()))
    )
  );
});
