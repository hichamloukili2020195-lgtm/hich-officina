// Prova del sito nel browser: nessuno scorrimento laterale, link interni e immagini a posto, titolo e h1, app gia installata
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const radice = path.join(__dirname, '..');
const tipi = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const server = http.createServer((q, r) => {
  const f = path.join(radice, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!f.startsWith(radice) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': tipi[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
});
(async () => {
  await new Promise(ok => server.listen(0, ok));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const b = await chromium.launch();
  const errori = [];
  const dirFoto = process.argv[2];
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const pg = await ctx.newPage();
    const rotte = [];
    pg.on('response', r => { if (r.status() >= 400) rotte.push(r.status() + ' ' + r.url()); });
    pg.on('pageerror', e => errori.push('errore di pagina: ' + e.message));
    for (const f of ['index.html', 'guida.html', 'novita.html', 'privacy.html', '404.html']) {
      await pg.goto(base + f); await pg.waitForTimeout(150);
      const r = await pg.evaluate(() => ({
        largo: document.documentElement.scrollWidth > innerWidth + 1,
        h1: document.querySelectorAll('h1').length, main: document.querySelectorAll('main').length, titolo: document.title,
        desc: !!document.querySelector('meta[name=description]'),
        img: Array.from(document.images).filter(i => !i.complete || !i.naturalWidth).map(i => i.src),
        link: Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href')),
        ancore: Array.from(document.querySelectorAll('[id]')).map(e => e.id)
      }));
      const dove = f + ' a ' + w + 'px';
      if (r.largo) errori.push(dove + ': scorre in orizzontale');
      if (r.h1 !== 1) errori.push(dove + ': h1 ' + r.h1);
      if (r.main !== 1) errori.push(dove + ': main ' + r.main);
      if (!r.desc || r.titolo.length < 10) errori.push(dove + ': titolo o descrizione');
      if (r.img.length) errori.push(dove + ': immagini rotte ' + r.img.join(', '));
      for (const l of r.link) {
        if (/^(mailto:|https?:|#?$)/.test(l)) continue;
        const [file, ancora] = l.split('#');
        const dest = file || f;
        if (!fs.existsSync(path.join(radice, dest))) { errori.push(dove + ': link rotto ' + l); continue; }
        if (ancora && dest.endsWith('.html')) { const t = fs.readFileSync(path.join(radice, dest), 'utf8'); if (!t.includes('id="' + ancora + '"')) errori.push(dove + ': ancora mancante ' + l); }
      }
      if (f === 'privacy.html' && r.largo === false && dirFoto && w === 390) await pg.screenshot({ path: path.join(dirFoto, 'sito-privacy.png'), fullPage: false });
      if (f === 'index.html' && dirFoto) await pg.screenshot({ path: path.join(dirFoto, 'sito-home-' + w + '.png'), fullPage: true });
    }
    if (rotte.length) errori.push('risposte con errore a ' + w + ': ' + Array.from(new Set(rotte)).join(' | '));
    await ctx.close();
  }
  // l'app gia installata (apertura a schermo intero) viene portata all'app
  const ctxI = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctxI.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { get: () => true }); });
  const pgI = await ctxI.newPage();
  await pgI.goto(base + 'index.html#calcoli'); await pgI.waitForTimeout(400);
  if (!/app\.html#calcoli$/.test(pgI.url())) errori.push('l\'app installata non va a app.html: ' + pgI.url());
  if (!(await pgI.$('#schermo'))) errori.push('app.html non si apre dopo il reindirizzamento');
  // da browser normale: la pagina principale resta
  const pgN = await (await b.newContext()).newPage();
  await pgN.goto(base + 'index.html'); await pgN.waitForTimeout(200);
  if (!/index\.html$/.test(pgN.url())) errori.push('da browser normale la home non deve cambiare pagina: ' + pgN.url());
  // il link per scaricare l'APK: nascosto in locale (nessun indirizzo noto), con indirizzo scritto se c'e
  const apk = await pgN.$eval('#apk', a => ({ nascosto: a.hidden, href: a.getAttribute('href') }));
  if (!apk.nascosto && !/Hich-Officina\.apk$/.test(apk.href)) errori.push('link APK: ' + JSON.stringify(apk));
  await b.close(); server.close();
  if (errori.length) { console.error('ERRORI DEL SITO:\n' + errori.join('\n')); process.exit(1); }
  console.log('OK sito');
})().catch(e => { console.error(e); process.exit(1); });
