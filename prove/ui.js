// Prova dell'interfaccia in un browser a misura di telefono: node prove/ui.js [cartella-schermate]
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const radice = path.join(__dirname, '..');
const tipi = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => {
  const f = path.join(radice, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!f.startsWith(radice) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': tipi[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
});
(async () => {
  await new Promise(ok => server.listen(0, ok));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const dirFoto = process.argv[2];
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const errori = [];
  pg.on('pageerror', e => errori.push(e.message));
  pg.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });
  await pg.goto(url);
  const ok = (c, msg) => { if (!c) { errori.push(msg); } };
  const foto = async n => { if (dirFoto) await pg.screenshot({ path: path.join(dirFoto, n + '.png'), fullPage: true }); };

  // calcolatori: ognuno deve dare un risultato senza errori
  const ids = await pg.$$eval('#chips-calcoli .chip', b => b.map(x => x.dataset.id));
  for (const id of ids) {
    await pg.click('#chips-calcoli .chip[data-id="' + id + '"]');
    const n = await pg.$$eval('#calcolatore .ris', x => x.length);
    ok(n > 0, 'nessun risultato in ' + id);
    await foto('calc-' + id);
  }
  // materiale: riempie Vc
  await pg.click('#chips-calcoli .chip[data-id="fresa"]');
  await pg.selectOption('#f-mat', { label: 'Alluminio' });
  ok(await pg.inputValue('#f-vc') === '400', 'materiale non applicato');
  // virgola come separatore
  await pg.fill('#f-d', '12,5');
  const giri = await pg.textContent('#calcolatore .ris b');
  ok(giri === (400000 / (Math.PI * 12.5)).toLocaleString('it-IT', { maximumFractionDigits: 0 }), 'giri con la virgola: ' + giri);
  // tolleranze
  await pg.click('#chips-calcoli .chip[data-id="toll"]');
  const t = await pg.textContent('#calcolatore .risultati');
  ok(t.includes('Con gioco'), 'H7/g6 deve essere con gioco: ' + t);

  // tornio
  await pg.click('nav button[data-p="tornio"]');
  for (const op of ['sgrossatura', 'sfacciatura', 'gola', 'filetto']) {
    await pg.click('#chips-tornio .chip[data-id="' + op + '"]');
    const codice = await pg.textContent('#codice');
    ok(codice.startsWith('%') && codice.includes('M30'), 'programma vuoto in ' + op);
    await foto('tornio-' + op);
  }
  await pg.click('#chips-tornio .chip[data-id="sgrossatura"]');
  await pg.fill('#f-df', '50');
  ok((await pg.textContent('#tornio-avvisi')).includes('minore del grezzo'), 'errore non mostrato');
  await pg.fill('#f-df', '30');

  // tabelle
  await pg.click('nav button[data-p="tabelle"]');
  for (const k of ['materiali', 'filetti', 'tolleranze', 'rugosita', 'pollici']) {
    await pg.click('#chips-tabelle .chip[data-id="' + k + '"]');
    await foto('tab-' + k);
  }
  // larghezza: niente scorrimento orizzontale della pagina
  const largo = await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok(!largo, 'la pagina scorre in orizzontale');

  // memoria: dopo il ricarico torna sulla stessa pagina
  await pg.reload();
  ok(await pg.$eval('#p-tabelle', e => e.classList.contains('attiva')), 'pagina non ricordata');
  // service worker registrato
  const sw = await pg.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
  ok(sw, 'service worker non registrato');

  await b.close(); server.close();
  if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1); }
  console.log('OK interfaccia');
})().catch(e => { console.error(e); process.exit(1); });
