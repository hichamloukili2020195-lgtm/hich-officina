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
  ok(voci === 12, 'voci del menu: ' + voci);
  await largo('home');

  // tutte le schermate si aprono
  for (const s of ['programma', 'calcoli', 'utensili', 'tolleranze', 'macro', 'galleria', 'salvati', 'tabelle', 'materiali', 'preferiti', 'impostazioni', 'apri', 'pezzi', 'tabellaUtensili', 'simula', 'listato']) {
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
  // la Vc cambia con il materiale in ogni scheda (bug: restava ferma)
  for (const tab of ['fresa', 'fori', 'tornio']) {
    await pg.click('.schede button[data-id="' + tab + '"]');
    await pg.selectOption('#f-mat', { label: 'Alluminio' });
    const vA = await pg.inputValue('#f-vc'), sA = await pg.textContent('#schermo .misuratore b');
    await pg.selectOption('#f-mat', { label: 'AISI 316/316L' });
    const vB = await pg.inputValue('#f-vc'), sB = await pg.textContent('#schermo .misuratore b');
    ok(vA !== vB && vB !== '', tab + ': la Vc non cambia con il materiale (' + vA + ' / ' + vB + ')');
    ok(sA !== sB, tab + ': i giri non cambiano con il materiale');
    await pg.fill('#f-vc', '77');
    ok((await pg.textContent('#schermo .risultati')).includes('77'), tab + ': la Vc scritta a mano non vale');
  }
  await pg.click('.schede button[data-id="fori"]');
  await pg.selectOption('#f-mat', { label: 'C40' });
  await pg.selectOption('#f-tipoUt', 'puntaMD');
  const vMD = await pg.inputValue('#f-vc');
  await pg.selectOption('#f-tipoUt', 'alesatore');
  ok((await pg.inputValue('#f-vc')) !== vMD, 'la Vc non cambia con l\'utensile');
  await pg.selectOption('#f-tipoUt', 'puntaMD');
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
  ok(await pg.inputValue('#f-vc') === '500', 'materiale non applicato');
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

  // importa la tabella materiali (testo JSON della libreria di Hich-CAM)
  await vai('materialiImporta');
  const json = JSON.stringify({ materiali: [{ n: 'Acciaio officina', g: 'Acciai al carbonio', vc: 210, fz: .05, ap: .7, ae: 40, dvc: 95, dfn: .15, tvc: 12, rvc: 15, rfn: .22, bvc: 150, bfn: .09 }] });
  await pg.fill('#f-testo', json);
  await pg.click('text=Usa questi materiali');
  await vai('programma');
  await pg.click('.schede button[data-id="fori"]');
  await pg.selectOption('#f-mat', { label: 'Acciaio officina' });
  await pg.selectOption('#f-tipoUt', 'centrino'); await pg.selectOption('#f-tipoUt', 'puntaMD');
  ok((await pg.inputValue('#f-vc')) === '95', 'materiali importati non usati');
  await foto('11-programma-importato');

  // ===== 2.4.0 =====
  // tabella utensili e scelta nel programma
  await vai('tabellaUtensili');
  await pg.click('text=Aggiungi utensile');
  await pg.fill('#f-t', '5'); await pg.fill('#f-d', '12'); await pg.fill('#f-z', '4'); await pg.fill('#f-l', '45'); await pg.fill('#f-nome', 'fresa alluminio');
  await pg.click('text=Salva'); await pg.waitForTimeout(80);
  ok((await pg.textContent('#schermo')).includes('T5'), 'utensile non salvato');
  await vai('programma');
  await pg.click('.schede button[data-id="fresa"]');
  const idU = await pg.$$eval('#f-ut option', o => o.map(x => x.value).filter(Boolean)[0]);
  await pg.selectOption('#f-ut', idU);
  ok((await pg.inputValue('#f-d')) === '12' && (await pg.inputValue('#f-t')) === '5' && (await pg.inputValue('#f-z')) === '4', 'utensile dalla tabella non applicato');
  await pg.selectOption('#f-op', 'tasca');
  await pg.click('text=Genera programma ISO'); await pg.waitForTimeout(80);
  // listato: ricerca e modifica
  await pg.fill('#f-cerca', 'T5');
  ok((await pg.$$eval('.listato .trovato', x => x.length)) >= 1, 'ricerca nel listato');
  await pg.click('text=Modifica');
  const testoMod = (await pg.inputValue('#f-listato')).replace('(CONTROLLARE IL PROGRAMMA PRIMA DI LAVORARE)', '(PROVA MODIFICA)');
  await pg.fill('#f-listato', testoMod);
  await pg.click('text=Fine modifica');
  ok((await pg.textContent('.listato')).includes('PROVA MODIFICA'), 'modifica del listato');
  // foglio dal programma
  await pg.click('text=Foglio di attrezzaggio'); await pg.waitForTimeout(150);
  const foglioT = await pg.$eval('.anteprima-foglio', f => f.srcdoc);
  ok(foglioT.includes('fresa alluminio') && foglioT.includes('L45') || foglioT.includes('45 mm'), 'foglio senza la descrizione dell\'utensile');
  await pg.goBack(); await pg.waitForTimeout(80);
  // simulazione
  await pg.click('text=Simula'); await pg.waitForTimeout(300);
  ok((await pg.textContent('.chiamata')).includes('Riga'), 'simulazione senza stato');
  await pg.click('[aria-label="Alla fine"]');
  const fine = await pg.textContent('.chiamata');
  ok(/(\d+) \/ \1/.test(fine), 'simulazione non arriva alla fine: ' + fine);
  for (const vv of ['xy', 'xz', 'iso']) await pg.click('.schede button[data-id="' + vv + '"]');
  ok((await pg.textContent('#schermo')).includes('Tempo stimato'), 'riassunto della simulazione');
  await foto('12-simula');
  // apri un programma incollato (tornio)
  await vai('apri');
  await pg.fill('#f-testo', '%\nO0100 (BOCCOLA)\nG21 G18 G99\nT0202\nG50 S2500\nG96 S180 M3\nG0 X52 Z2\nG1 X50 Z0 F.15\nG1 Z-30\nG2 X56 Z-33 R3\nG0 X100 Z50\nM30\n%');
  await pg.click('text=Leggi il programma');
  const ap = await pg.textContent('#schermo');
  ok(ap.includes('Tempo stimato') && ap.includes('-33'), 'apertura del programma');
  await foto('13-apri');
  // macro: simulazione con i valori
  await vai('macro');
  await pg.click('.schede button[data-id="modelli"]');
  await pg.click('text=Tasca circolare'); await pg.waitForTimeout(60);
  await pg.click('text=Simula con questi valori'); await pg.waitForTimeout(300);
  ok(!(await pg.$('#schermo .errore')), 'macro simulata con errore');
  ok((await pg.$eval('#f-passo', e => Number(e.max))) > 50, 'macro senza percorso');
  await vai('macro'); await pg.click('.schede button[data-id="modelli"]'); await pg.click('text=Misura con tastatore'); await pg.waitForTimeout(60);
  await pg.click('text=Simula con questi valori'); await pg.waitForTimeout(200);
  ok((await pg.textContent('#schermo')).includes('Allarme') || (await pg.textContent('#schermo')).includes('#510'), 'macro misura: niente risultato');
  // pezzi: misure, foto, foglio
  await vai('pezzi');
  await pg.click('text=Nuovo pezzo');
  await pg.fill('#f-nome', 'Flangia prova');
  await pg.click('text=Aggiungi quota');
  await pg.fill('[aria-label="Nominale 1"]', '20'); await pg.fill('[aria-label="Tolleranza 1"]', 'H7');
  await pg.click('text=Aggiungi quota');
  await pg.fill('[aria-label="Nominale 2"]', '50'); await pg.fill('[aria-label="Tolleranza 2"]', '±0,05');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP4z8DwHwyYQAwYBgBmlAX7xQ0tKwAAAABJRU5ErkJggg==', 'base64');
  await pg.setInputFiles('#f-foto', { name: 'pezzo.png', mimeType: 'image/png', buffer: png });
  await pg.waitForTimeout(400);
  ok((await pg.$$eval('.foto-griglia img', x => x.length)) === 1, 'foto non aggiunta');
  await foto('14-pezzo');
  await pg.click('text=Controlla le misure'); await pg.waitForTimeout(60);
  await pg.fill('#f-mis0', '20,01');
  ok((await pg.textContent('.esito')).includes('BUONA'), 'misura buona non riconosciuta');
  await pg.fill('#f-mis0', '20,03');
  ok((await pg.textContent('.esito')).includes('FUORI'), 'misura fuori non riconosciuta');
  await pg.fill('#f-mis1', '49,9');
  await pg.click('text=Salva il controllo'); await pg.waitForTimeout(60);
  ok((await pg.$$eval('td.fuori', x => x.length)) === 2, 'controllo salvato senza le misure fuori');
  await foto('15-misure');
  await pg.goBack(); await pg.waitForTimeout(80);
  await pg.click('text=Foglio di attrezzaggio'); await pg.waitForTimeout(300);
  const fp = await pg.$eval('.anteprima-foglio', f => f.srcdoc);
  ok(fp.includes('Flangia prova') && fp.includes('data:image') && fp.includes('20,021'), 'foglio del pezzo incompleto');
  // tolleranze scritte a mano
  const tol = await pg.evaluate(() => [App.leggiTolleranza(20, 'H7'), App.leggiTolleranza(10, '±0,05'), App.leggiTolleranza(10, '+0,1 -0,05'), App.leggiTolleranza(10, '0/-0.02'), App.leggiTolleranza(10, 'boh').errore ? 'e' : 'x']);
  ok(JSON.stringify(tol) === JSON.stringify([{ sup: 0.021, inf: 0 }, { sup: 0.05, inf: -0.05 }, { sup: 0.1, inf: -0.05 }, { sup: 0, inf: -0.02 }, 'e']), 'tolleranze: ' + JSON.stringify(tol));
  // misura presa in Tolleranze
  await vai('tolleranze');
  await pg.fill('#f-misura', '25,015');
  ok((await pg.textContent('#schermo .esito')).includes('BUONA'), 'misura presa in tolleranze');
  // copia di sicurezza e ripristino
  await vai('impostazioni');
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('text=Fai la copia')]);
  const copia = fs.readFileSync(await dl.path(), 'utf8');
  const dc = JSON.parse(copia);
  ok(dc.app === 'hich-officina' && dc.mem.pezzi.length === 1 && Object.keys(dc.foto).length === 1, 'copia di sicurezza incompleta');
  await pg.evaluate(() => { App.mem.pezzi = []; App.salva(); });
  const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('text=Ripristina')]);
  await fc.setFiles({ name: 'copia.json', mimeType: 'application/json', buffer: Buffer.from(copia) });
  await pg.waitForTimeout(200);
  await pg.click('#schermo >> text=Ripristina'); await pg.waitForTimeout(300);
  await vai('pezzi');
  ok((await pg.textContent('#schermo')).includes('Flangia prova'), 'ripristino della copia');
  await largo('fine 2.4.0');

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
