// Cache per usare l'app senza rete. Cambia VERSIONE a ogni aggiornamento dei file.
const VERSIONE = 'hich-officina-2.17.1';
const FILE = ['./', './index.html', './stile.css', './calcoli.js', './programmi.js', './profilo.js', './iso.js', './post.js', './ciclo.js', './app.js', './schermi_calcoli.js',
  './schermi_programma.js', './schermi_macro.js', './schermi_altro.js', './schermi_iso.js', './schermi_officina.js', './schermi_disegno.js', './schermi_ciclo.js', './schermi_angolo.js', './schermi_dati.js', './schermi_guida.js', './manifest.webmanifest',
  './icone/icona.svg', './icone/icona-192.png', './icone/icona-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(FILE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== VERSIONE).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
