// Cache per usare l'app senza rete. Cambia VERSIONE a ogni aggiornamento dei file.
const VERSIONE = 'hich-officina-2.48.0';
const FILE = ['./app.html', './stile.css', './calcoli.js', './programmi.js', './profilo.js', './filetti.js', './iso.js', './spiega.js', './materiale.js', './post.js', './ciclo.js', './cad.js', './modifica.js', './vincoli.js', './font.js', './durezze.js', './dxf.js', './qr.js', './pdf.js', './lavoro.js', './disegno_foto.js', './contatto.js', './app.js', './schermi_calcoli.js',
  './schermi_programma.js', './schermi_macro.js', './schermi_altro.js', './schermi_iso.js', './schermi_spiega.js', './schermi_materiale.js', './vista3d.js', './three.min.js', './schermi_officina.js', './schermi_disegno.js', './schermi_cad.js', './schermi_lavoro.js', './schermi_disegno_foto.js', './schermi_ciclo.js', './schermi_angolo.js', './schermi_dati.js', './guida_dati.js', './schermi_guida.js', './manifest.webmanifest',
  './icone/icona-192.png', './icone/testata.jpg', './icone/sfondo.jpg', './icone/icona-512.png', './icone/icona-maskable-512.png'];
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
