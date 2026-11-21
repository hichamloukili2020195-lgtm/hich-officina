// Prova dell'interfaccia in un browser a misura di telefono: node prove/ui.js [cartella-schermate]
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const radice = path.join(__dirname, '..');
const tipi = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => {
  const f = path.join(radice, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!f.startsWith(radice) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': tipi[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
});
(async () => {
  await new Promise(ok => server.listen(0, ok));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const dirFoto = process.argv[2];
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage();
  const errori = [];
  pg.on('pageerror', e => errori.push('pagina: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errori.push('console: ' + m.text()); });
  const ok = (c, msg) => { if (!c) errori.push(msg); };
  const foto = async n => { if (dirFoto) await pg.screenshot({ path: path.join(dirFoto, n + '.png'), fullPage: true }); };
  const largo = async dove => { const w = await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1); ok(!w, 'scorre in orizzontale: ' + dove); };
  const vai = async h => { await pg.evaluate(x => { location.hash = x; }, h); await pg.waitForTimeout(60); };
  const erroreSchermo = async dove => { const t = await pg.$$eval('#schermo .errore', x => x.map(e => e.textContent).filter(s => /Errore in questa/.test(s))); ok(!t.length, dove + ': ' + t.join()); };

  await pg.goto(url);
  await foto('01-home');
  const voci = await pg.$$eval('.menu .voce', x => x.length);
  ok(voci === 9, 'voci del menu: ' + voci);
  await largo('home');

  // tutte le schermate si aprono
  for (const s of ['programma', 'calcoli', 'utensili', 'tolleranze', 'macro', 'galleria', 'salvati', 'tabelle', 'materiali', 'preferiti', 'impostazioni']) {
    await vai(s); await erroreSchermo(s); await largo(s);
  }

  // nuovo programma: ogni scheda e ogni strategia genera un programma
  await vai('programma');
  for (const tab of ['fresa', 'fori', 'tornio']) {
    await pg.click('.schede button[data-id="' + tab + '"]');
    const ops = tab === 'fori' ? [null] : await pg.$$eval('#f-op option', o => o.map(x => x.value));
    for (const op of ops) {
      if (op) await pg.selectOption('#f-op', op);
      const err = await pg.$$eval('#schermo .errore', x => x.map(e => e.textContent));
      ok(!err.length, tab + ' ' + op + ': ' + err.join());
      await largo(tab + ' ' + op);
      if (dirFoto && (op === 'tasca' || op === null || op === 'sgrossatura')) await foto('02-programma-' + tab);
    }
  }
  // fori: schemi
  await pg.click('.schede button[data-id="fori"]');
  for (const sc of ['griglia', 'elenco', 'cerchio']) { await pg.selectOption('#f-schema', sc); ok(!(await pg.$('#schermo .errore')), 'schema ' + sc); }
  await pg.selectOption('#f-tipoUt', 'maschio');
  ok((await pg.textContent('#schermo .info')).includes('G84'), 'maschio senza G84');
  // genera e listato
  await pg.click('.schede button[data-id="fresa"]');
  await pg.selectOption('#f-op', 'tasca');
  await pg.click('text=Genera programma ISO');
  await pg.waitForTimeout(80);
  ok((await pg.evaluate(() => location.hash)) === '#listato', 'il listato non si apre');
  const righe = await pg.$$eval('.listato div', x => x.length);
  ok(righe > 20, 'listato corto: ' + righe);
  await foto('03-listato');
  await pg.click('text=Tieni');
  await pg.goBack(); await pg.waitForTimeout(80);
  ok((await pg.evaluate(() => location.hash)) === '#programma', 'Indietro non torna al programma');

  // calcolatrice: ogni chip da un risultato
  await vai('calcoli');
  const chips = await pg.$$eval('.chips .chip', x => x.map(c => c.dataset.id));
  for (const c of chips) {
    await pg.click('.chips .chip[data-id="' + c + '"]');
    const n = await pg.$$eval('#schermo .ris, #schermo .misuratore', x => x.length);
    ok(n > 0, 'nessun risultato in ' + c);
    await largo('calcoli ' + c);
  }
  await pg.click('.chips .chip[data-id="fresa"]');
  await pg.selectOption('#f-mat', { label: 'Alluminio' });
  ok(await pg.inputValue('#f-vc') === '400', 'materiale non applicato');
  await foto('04-calcoli');

  // utensili
  await vai('utensili');
  for (const t of ['puntaMD', 'puntaIns', 'alesatore', 'bareno', 'maschio', 'inserto']) {
    await pg.selectOption('#f-tipo', t);
    ok(await pg.$('#schermo .misuratore'), 'utensile ' + t + ' senza giri');
  }
  await foto('05-utensili');

  // tolleranze
  await vai('tolleranze');
  ok((await pg.textContent('#schermo')).includes('Gioco'), 'H7/g6 deve dare gioco');
  await pg.selectOption('#f-acc', 'H7/p6');
  ok((await pg.textContent('#schermo')).includes('Interferenza'), 'H7/p6 deve dare interferenza');
  await foto('06-tolleranze');

  // macro: da un modello, salva, compare nelle mie
  await vai('macro');
  await pg.click('.schede button[data-id="modelli"]');
  await foto('07-macro');
  await pg.click('text=Foratura profonda');
  await pg.waitForTimeout(60);
  ok((await pg.textContent('.chiamata')) === 'G65 P9001 Z-50. Q5. R2. F200.', 'chiamata della macro');
  await pg.fill('#f-num', '9201');
  await pg.click('text=Salva macro');
  await foto('08-macro-modifica');
  await vai('macro');
  await pg.click('.schede button[data-id="mie"]');
  ok((await pg.$$eval('.elenco .elem', x => x.length)) === 1, 'macro non salvata');
  // macro nuova con lettera sbagliata
  await pg.click('text=Crea macro personalizzata');
  await pg.fill('.par-riga input[aria-label="Lettera 1"]', 'G');
  ok((await pg.$$eval('#schermo .errore', x => x.length)) > 0, 'lettera G non segnalata');

  // galleria apre un programma
  await vai('galleria');
  await pg.click('.schede button[data-id="tornio"]');
  await pg.click('text=Filetto M20x2,5');
  await pg.waitForTimeout(60);
  ok((await pg.inputValue('#f-d')) === '20', 'esempio non caricato');
  await foto('09-galleria-filetto');

  // preferiti
  await vai('tabelle');
  await pg.click('#azioni .icona-pul');
  await vai('preferiti');
  ok((await pg.$$eval('.menu .voce', x => x.length)) === 1, 'preferito non aggiunto');

  // materiali: modifica e valore usato
  await vai('materiali');
  await pg.click('text=C40');
  await pg.fill('#f-vc', '190');
  await pg.click('text=Salva');
  await vai('utensili');
  await pg.selectOption('#f-mat', { label: 'C40' });
  await pg.selectOption('#f-tipo', 'fresa');
  ok((await pg.textContent('#schermo .risultati')).includes('190'), 'materiale modificato non usato');

  // impostazioni: tema chiaro
  await vai('impostazioni');
  await pg.selectOption('#f-tema', 'chiaro');
  ok(await pg.evaluate(() => document.documentElement.getAttribute('data-theme') === 'light'), 'tema chiaro');
  await vai('home'); await foto('10-home-chiaro');
  await vai('impostazioni'); await pg.selectOption('#f-tema', 'scuro');

  // memoria dopo il ricarico
  await pg.waitForTimeout(300);
  await pg.reload();
  await vai('salvati');
  ok((await pg.$$eval('.elenco .elem', x => x.length)) === 1, 'programma salvato perso');
  const sw = await pg.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
  ok(sw, 'service worker non registrato');

  await b.close(); server.close();
  if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1); }
  console.log('OK interfaccia');
})().catch(e => { console.error(e); process.exit(1); });
