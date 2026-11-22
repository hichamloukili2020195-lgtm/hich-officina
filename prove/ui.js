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
  // stato di un telefono che ha aperto "Utensili e dati di taglio" (bug 2.4.0: Nuovo programma ISO si bloccava)
  await pg.evaluate(() => { localStorage.setItem('hich-officina-v2', JSON.stringify({ utensili: { mat: '3', tipo: 'fresa', d: '10' }, versione: '2.4.0' })); });
  await pg.reload();
  for (const tab of ['fresa', 'fori', 'tornio']) {
    await vai('programma'); await pg.click('.schede button[data-id="' + tab + '"]');
    await erroreSchermo('programma ' + tab + ' con i dati vecchi');
    ok((await pg.$$eval('#schermo .riga-campo', x => x.length)) > 8, tab + ': i campi non ci sono');
  }
  await vai('tabellaUtensili'); await erroreSchermo('tabella utensili con i dati vecchi');
  await vai('home');
  await foto('01-home');
  const voci = await pg.$$eval('.menu .voce', x => x.length);
  ok(voci === 14, 'voci del menu: ' + voci);
  await largo('home');

  // tutte le schermate si aprono
  for (const s of ['programma', 'calcoli', 'utensili', 'tolleranze', 'macro', 'galleria', 'salvati', 'tabelle', 'materiali', 'preferiti', 'impostazioni', 'apri', 'pezzi', 'tabellaUtensili', 'simula', 'listato', 'disegno', 'ciclo', 'angolo']) {
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

  // un posto solo per le velocita: "Utensili e dati di taglio" porta alla Calcolatrice, scheda Per utensile
  await vai('utensili'); await pg.waitForTimeout(80);
  ok((await pg.evaluate(() => location.hash)) === '#calcoli', 'utensili non porta alla calcolatrice');
  ok(await pg.$eval('.chips .chip.attiva', b => b.dataset.id === 'utensile'), 'scheda Per utensile non attiva');
  ok(!(await pg.evaluate(() => App.MENU.map(v => v[0]))).includes('utensili'), 'voce doppia nel menu');
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
  await pg.click('text=Controlla e simula');
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

  // post-processor: linguaggio della macchina
  await vai('impostazioni');
  await pg.selectOption('#f-postFresa', 'dialogo');
  ok((await pg.$$eval('#f-postTornio option', o => o.map(x => x.value))).join() === 'iso,cicli', 'il dialogo a testo non e per il tornio');
  await vai('programma'); await pg.click('.schede button[data-id="fori"]');
  await pg.click('text=Genera programma ISO'); await pg.waitForTimeout(80);
  ok(/^0 BEGIN PGM /.test(await pg.textContent('.listato div span:nth-child(2)')), 'il listato non e nel linguaggio scelto');
  ok((await pg.textContent('.listato')).includes('CYCL DEF'), 'ciclo di foratura non tradotto');
  await pg.selectOption('#f-ling', 'cicli'); await pg.waitForTimeout(60);
  ok((await pg.textContent('.listato')).includes('MCALL CYCLE'), 'cambio del linguaggio nel listato');
  await foto('16-post');
  await pg.click('text=Simula'); await pg.waitForTimeout(200);
  ok(!(await pg.$('#schermo .errore')), 'simulazione di un programma tradotto');
  await vai('impostazioni'); await pg.selectOption('#f-postFresa', 'iso');

  // ===== 2.7.0 =====
  // profilo libero in fresa: editor dei punti
  await vai('programma'); await pg.click('.schede button[data-id="fresa"]');
  await pg.selectOption('#f-op', 'profilo'); await pg.waitForTimeout(60);
  ok((await pg.$$eval('.punto-riga', x => x.length)) === 8, 'editor del profilo: 4 punti');
  ok(!(await pg.$('#schermo .errore')), 'profilo fresa con errore: ' + ((await pg.$('#schermo .errore')) ? await pg.textContent('#schermo .errore') : ''));
  await pg.click('text=Aggiungi punto');
  ok((await pg.$$eval('.punto-riga', x => x.length)) === 10, 'aggiungi punto');
  await pg.click('[aria-label="Togli il punto 5"]');
  await foto('17-profilo-fresa');
  await pg.click('text=Aggiungi alla sequenza'); await pg.waitForTimeout(40);
  // tornio: profilo a ciclo fisso
  await pg.click('.schede button[data-id="tornio"]');
  await pg.selectOption('#f-op', 'profilo'); await pg.waitForTimeout(60);
  await pg.selectOption('#f-metodo', 'ciclo'); await pg.waitForTimeout(40);
  await foto('18-profilo-tornio');
  await pg.click('text=Genera programma ISO'); await pg.waitForTimeout(80);
  ok((await pg.textContent('.listato')).includes('G71 P100 Q200'), 'profilo tornio con G71');
  await pg.click('text=Simula'); await pg.waitForTimeout(200);
  ok((await pg.$eval('#f-passo', e => Number(e.max))) > 30, 'simulazione del G71');
  // foro completo M10 e sequenza
  await vai('programma'); await pg.click('.schede button[data-id="fori"]');
  await pg.selectOption('#f-tipoUt', 'maschio'); await pg.fill('#f-d', '10'); await pg.fill('#f-passo', '1,5');
  await pg.click('text=Foro completo'); await pg.waitForTimeout(40);
  await pg.click('.schede button[data-id="seq"]'); await pg.waitForTimeout(60);
  ok((await pg.$$eval('.elem.fase', x => x.length)) === 5, 'sequenza: profilo + 4 fasi del foro');
  await pg.click('text=Ordina come in officina'); await pg.waitForTimeout(40);
  const ordine = await pg.$$eval('.elem.fase b', x => x.map(e => e.textContent));
  ok(/^Centrino/.test(ordine[0]) && /^Punta/.test(ordine[1]) && /^Smusso/.test(ordine[2]) && /^Maschio/.test(ordine[3]) && /^Profilo/.test(ordine[4]), 'ordine di officina: ' + ordine.join(' | '));
  ok((await pg.textContent('.elem.fase:nth-child(2) b')).includes('8,5'), 'preforo del M10');
  await foto('19-sequenza');
  // maschio prima della punta: non si accetta
  await pg.click('.elem.fase:nth-child(4) [aria-label="Su"]'); await pg.click('.elem.fase:nth-child(3) [aria-label="Su"]');
  ok((await pg.textContent('#schermo .errore')).includes('prima del suo preforo'), 'ordine impossibile accettato');
  await pg.click('text=Ordina come in officina'); await pg.waitForTimeout(40);
  await pg.click('text=Genera programma ISO'); await pg.waitForTimeout(80);
  const seq = await pg.textContent('.listato');
  ok(seq.includes('(FASE 5') && seq.includes('G84') && seq.includes('G41'), 'programma della sequenza');
  // ricerca dalla home
  await vai('home');
  const cercaH = async (q, atteso) => { await pg.fill('#f-cerca-home', q); await pg.waitForTimeout(40); const t = await pg.textContent('#schermo'); ok(t.includes(atteso), 'ricerca "' + q + '": manca "' + atteso + '"'); };
  await cercaH('M10', 'Preforo 8,5');
  await cercaH('h7 25', '24,979');
  await cercaH('H7 25', '25,021');
  await cercaH('acciaio off', 'Acciaio officina');   // a questo punto della prova ci sono i materiali importati
  await cercaH('G83', 'beccate');
  await cercaH('flangia', 'Flangia prova');
  await foto('20-ricerca');
  await pg.fill('#f-cerca-home', 'M10'); await pg.waitForTimeout(40);
  await pg.click('text=M10 x 1,5'); await pg.waitForTimeout(80);
  ok((await pg.inputValue('#f-d')) === '10' && (await pg.inputValue('#f-p')) === '1.5', 'ricerca M10 apre la maschiatura');
  await largo('fine 2.7.0');

  // ===== 2.8.0: disegno col dito e pannello =====
  await vai('disegno'); await pg.waitForTimeout(80);
  ok((await pg.$$eval('.disegno-tela', x => x.length)) === 1, 'tela del disegno');
  await pg.click('text=Cancella tutto');
  const tela = await pg.$('.disegno-tela'); const bb = await tela.boundingBox();
  // la tela: Z a destra = 0; tocchi da destra verso sinistra
  const tocca = async (fx, fy) => { await pg.mouse.click(bb.x + bb.width * fx, bb.y + bb.height * fy); await pg.waitForTimeout(30); };
  await tocca(0.93, 0.5); await tocca(0.93, 0.33); await tocca(0.6, 0.34); await tocca(0.6, 0.25); await tocca(0.3, 0.25);
  const pts = await pg.evaluate(() => App.mem.disegno.punti);
  ok(pts.length === 5, 'punti col dito: ' + pts.length);
  ok(pts[1].z === pts[0].z && pts[2].x === pts[1].x, 'aggancio orizzontale e verticale: ' + JSON.stringify(pts.slice(0, 3)));
  ok(pts.every(q => Number(q.z) <= 0 && Number(q.x) >= 0 && Math.abs(Number(q.x) * 2 - Math.round(Number(q.x) * 2)) < 1e-9), 'punti sulla griglia');
  // trascina il punto 4
  const p4 = await pg.evaluate(() => App.mem.disegno.punti[3]);
  await pg.click('text=Annulla'); await pg.waitForTimeout(30);
  ok((await pg.evaluate(() => App.mem.disegno.punti.length)) === 4, 'annulla');
  // tratto a mano
  await pg.click('text=A mano libera');
  await pg.mouse.move(bb.x + bb.width * 0.95, bb.y + bb.height * 0.5); await pg.mouse.down();
  for (let i = 0; i <= 20; i++) await pg.mouse.move(bb.x + bb.width * (0.95 - i * 0.02), bb.y + bb.height * (0.4 - (i > 10 ? 0.1 : 0)));
  await pg.mouse.up(); await pg.waitForTimeout(60);
  const mano = await pg.evaluate(() => App.mem.disegno.punti.length);
  ok(mano >= 2 && mano <= 8, 'tratto a mano semplificato: ' + mano);
  await foto('21-disegno');
  // modifica di un punto con le quote
  await pg.click('text=Tocca: punti e linee');
  await pg.evaluate(() => { App.mem.disegno.punti = [{ x: '0', z: '0' }, { x: '16', z: '0' }, { x: '20', z: '-2' }, { x: '20', z: '-20' }, { x: '30', z: '-25', tratto: 'ccw', r: '5' }, { x: '30', z: '-40' }, { x: '40', z: '-40' }]; });
  await vai('home'); await vai('disegno'); await pg.waitForTimeout(60);
  await pg.click('.schede button[data-id="3D"]'); await pg.waitForTimeout(80);
  const pieno = await pg.$eval('.disegno-tela', c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n / (d.length / 4); });
  ok(pieno > 0.05, 'vista 3D vuota: ' + pieno);
  await foto('22-pezzo-3d');
  await pg.click('.schede button[data-id="2D"]');
  await pg.click('text=Crea il programma'); await pg.waitForTimeout(100);
  ok((await pg.evaluate(() => location.hash)) === '#programma' && (await pg.inputValue('#f-op')) === 'profilo', 'il disegno non apre il profilo');
  ok((await pg.$$eval('.punto-riga', x => x.length)) === 14, 'punti del disegno nel programma');
  ok(!(await pg.$('#schermo .errore')), 'programma dal disegno con errore');
  // pannello della simulazione
  await pg.click('text=Genera programma ISO'); await pg.waitForTimeout(80);
  await pg.click('text=Simula'); await pg.waitForTimeout(400);
  ok((await pg.$$eval('.dro-riga', x => x.length)) === 2, 'quote X Z del pannello');
  ok(/\d/.test(await pg.textContent('.dro-giri b')), 'giri nel pannello');
  ok((await pg.$$eval('.sim-righe .attuale', x => x.length)) === 1, 'riga del programma evidenziata');
  await pg.click('[aria-label="Alla fine"]'); await pg.waitForTimeout(60);
  await foto('23-pannello');
  await pg.setViewportSize({ width: 1180, height: 820 }); await pg.waitForTimeout(150);
  await vai('home'); await vai('simula'); await pg.waitForTimeout(300);
  await pg.click('[aria-label="Alla fine"]'); await pg.waitForTimeout(60);
  ok(await pg.$eval('.sim-griglia', g => getComputedStyle(g).gridTemplateColumns.split(' ').length === 2), 'pannello su due colonne sul tablet');
  await foto('24-pannello-tablet');
  await largo('pannello tablet');
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(100);

  // ===== 2.11.0: disegno piu comodo =====
  await vai('disegno'); await pg.waitForTimeout(80);
  await pg.click('.schede button[data-id="2D"]');
  await pg.evaluate(() => { App.mem.disegno.punti = [{ x: '0', z: '0' }, { x: '20', z: '0' }, { x: '20', z: '-20' }, { x: '30', z: '-20' }, { x: '30', z: '-40' }]; App.salva(); });
  await vai('home'); await vai('disegno'); await pg.waitForTimeout(80);
  // linee aggiunte con i bottoni, dopo l'ultima
  const aggiungi = async () => { await pg.click('.pannello button.pul:has-text("Aggiungi")'); await pg.waitForTimeout(40); };
  await pg.click('.tipo-linea[data-id="cil"]'); await pg.fill('#f-qa', '10'); await aggiungi();
  let ult = await pg.evaluate(() => App.mem.disegno.punti.slice(-1)[0]);
  ok(ult.x === '30' && ult.z === '-50', 'cilindro lungo 10: ' + JSON.stringify(ult));
  await pg.click('.tipo-linea[data-id="spalla"]'); await pg.fill('#f-qd', '36'); await aggiungi();
  ult = await pg.evaluate(() => App.mem.disegno.punti.slice(-1)[0]);
  ok(ult.x === '36' && ult.z === '-50', 'spallamento: ' + JSON.stringify(ult));
  await pg.click('.tipo-linea[data-id="cono"]'); await pg.fill('#f-qa', '10'); await pg.fill('#f-qd', ''); await pg.fill('#f-qang', '5,71059'); await aggiungi();
  ult = await pg.evaluate(() => App.mem.disegno.punti.slice(-1)[0]);
  ok(Math.abs(Number(ult.x) - 38) < 0.01 && ult.z === '-60', 'cono: ' + JSON.stringify(ult));
  await pg.click('.tipo-linea[data-id="arco"]'); await pg.fill('#f-qd', '40'); await pg.fill('#f-qa', '1'); await pg.fill('#f-qr', '1'); await aggiungi();
  ult = await pg.evaluate(() => App.mem.disegno.punti.slice(-1)[0]);
  ok(ult.tratto === 'ccw' && ult.r === '1' && ult.z === '-61', 'arco: ' + JSON.stringify(ult));
  ok(!(await pg.$('#schermo .errore')), 'linee aggiunte con errore');
  // elenco delle linee e eliminazione di un cilindro: il resto si accosta
  const righe0 = await pg.$$eval('.linea-riga', x => x.map(e => e.textContent));
  ok(righe0.some(t => t.includes('Cilindro Ø20 lungo 20')) && righe0.some(t => t.includes('Cono da Ø36 a Ø38')), 'elenco delle linee: ' + righe0.join(' | '));
  await pg.click('.linea-testo:has-text("Cilindro Ø20 lungo 20")'); await pg.waitForTimeout(40);
  ok((await pg.textContent('#schermo')).includes('Linea 2: Cilindro Ø20 lungo 20'), 'linea scelta dall\'elenco');
  await pg.click('text=Elimina (il resto si accosta)'); await pg.waitForTimeout(40);
  let pp = await pg.evaluate(() => App.mem.disegno.punti.map(p => p.x + '/' + p.z).join(' '));
  ok(pp.startsWith('0/0 20/0 30/0 30/-20'), 'cilindro tolto e resto accostato: ' + pp);
  await pg.click('[aria-label="Annulla"]'); await pg.waitForTimeout(40);
  pp = await pg.evaluate(() => App.mem.disegno.punti.map(p => p.x + '/' + p.z).join(' '));
  ok(pp.startsWith('0/0 20/0 20/-20 30/-20'), 'annulla: ' + pp);
  await pg.click('[aria-label="Ripeti"]'); await pg.waitForTimeout(40);
  ok((await pg.evaluate(() => App.mem.disegno.punti[2].z)) === '0', 'ripeti');
  await pg.click('[aria-label="Annulla"]'); await pg.waitForTimeout(40);
  // modifica della lunghezza di una linea: il resto si sposta
  await pg.click('.linea-testo:has-text("Cilindro Ø20 lungo 20")'); await pg.waitForTimeout(40);
  await pg.fill('#f-L', '25'); await pg.waitForTimeout(40);
  ok((await pg.evaluate(() => App.mem.disegno.punti[4].z)) === '-45', 'lunghezza cambiata e resto spostato');
  await pg.fill('#f-d', '22'); await pg.waitForTimeout(40);
  ok((await pg.evaluate(() => App.mem.disegno.punti[1].x + '/' + App.mem.disegno.punti[2].x)) === '22/22', 'diametro del cilindro cambiato');
  await pg.click('text=Dividi a meta'); await pg.waitForTimeout(40);
  ok((await pg.evaluate(() => App.mem.disegno.punti[2].z)) === '-12.5', 'dividi a meta');
  // toccare una linea sul disegno la sceglie (non aggiunge punti)
  const nPunti = await pg.evaluate(() => App.mem.disegno.punti.length);
  await pg.click('text=Adatta');
  const tela1 = await pg.$('.disegno-tela'); await tela1.scrollIntoViewIfNeeded(); const bb1 = await tela1.boundingBox();
  const xyL = await pg.evaluate(() => { const c = document.querySelector('.disegno-tela'); const W = c.clientWidth, H = c.clientHeight; const S = App.mem.disegno; const dg = Number(S.dg) || 40, lg = Number(S.lg) || 50;
    const rMax = Math.max(dg / 2, ...S.punti.map(p => Number(p.x) / 2)) + 4, zMin = Math.min(-lg, ...S.punti.map(p => Number(p.z))) - 4, zMax = 4; const sc = Math.min((W - 24) / (zMax - zMin), (H - 24) / (2 * rMax));
    const a = S.punti[4], b = S.punti[5]; const z = (Number(a.z) + Number(b.z)) / 2, r = (Number(a.x) + Number(b.x)) / 4; return [W - 12 - (zMax - z) * sc, H / 2 - r * sc]; });
  await pg.mouse.click(bb1.x + xyL[0], bb1.y + xyL[1]); await pg.waitForTimeout(60);
  ok((await pg.evaluate(() => App.mem.disegno.punti.length)) === nPunti && (await pg.$$eval('.linea-riga.attiva', x => x.length)) === 1, 'tocco su una linea: scelta');
  await pg.evaluate(() => { App.mem.disegno.punti = [{ x: '0', z: '0' }, { x: '20', z: '0' }, { x: '20', z: '-20' }, { x: '30', z: '-20' }, { x: '30', z: '-40' }, { x: '30', z: '-50' }, { x: '36', z: '-50' }, { x: '38', z: '-60' }]; App.salva(); });
  await vai('home'); await vai('disegno'); await pg.waitForTimeout(80);
  await foto('30-disegno-linee');
  // smusso e raggio con un tocco sul punto scelto (P3 e il punto scelto dopo la modifica? si sceglie toccandolo)
  await pg.evaluate(() => {});
  const tela2 = await pg.$('.disegno-tela'); const b2 = await tela2.boundingBox();
  const posP = await pg.evaluate(i => { const c = document.querySelector('.disegno-tela'); return null; }, 2);
  // P3 (Ø20 Z-20): lo si cerca toccando vicino al punto con l'aiuto delle coordinate della vista
  await pg.click('text=Adatta');
  // tocco su P3 calcolato dalla stessa geometria della vista
  const xy = await pg.evaluate(() => { const c = document.querySelector('.disegno-tela'); const W = c.clientWidth, H = c.clientHeight; const S = App.mem.disegno; const dg = Number(S.dg) || 40, lg = Number(S.lg) || 50;
    const rMax = Math.max(dg / 2, ...S.punti.map(p => Number(p.x) / 2)) + 4, zMin = Math.min(-lg, ...S.punti.map(p => Number(p.z))) - 4, zMax = 4; const sc = Math.min((W - 24) / (zMax - zMin), (H - 24) / (2 * rMax));
    return [W - 12 - (zMax - -20) * sc, H / 2 - 10 * sc]; });
  await tela2.scrollIntoViewIfNeeded(); const b3 = await tela2.boundingBox();
  await pg.mouse.click(b3.x + xy[0], b3.y + xy[1]); await pg.waitForTimeout(60);
  await pg.click('.chips button:text-is("R2")'); await pg.waitForTimeout(40);
  ok((await pg.evaluate(() => App.mem.disegno.punti[2].raccordo)) === '2', 'raggio con un tocco');
  await pg.click('.chips button:text-is("C1")'); await pg.waitForTimeout(40);
  const p3 = await pg.evaluate(() => App.mem.disegno.punti[2]);
  ok(p3.smusso === '1' && !p3.raccordo, 'smusso con un tocco: ' + JSON.stringify(p3));
  ok(!(await pg.$('#schermo .errore')), 'disegno con errore dopo lo smusso');
  // tutti gli spigoli
  await pg.click('text=Tutti gli spigoli:'); // etichetta, non fa niente
  await pg.click('.chips button:text-is("C0.5")'); await pg.waitForTimeout(40);
  // zoom: rotella e due dita
  const z0 = await pg.evaluate(() => document.querySelector('.lettura') !== null);
  ok(z0, 'barra della vista');
  await tela2.scrollIntoViewIfNeeded(); const b4 = await tela2.boundingBox();
  await pg.mouse.move(b4.x + b4.width / 2, b4.y + b4.height / 2);
  await pg.mouse.wheel(0, -300); await pg.waitForTimeout(60);
  const pinch = await pg.evaluate(() => {
    const c = document.querySelector('.disegno-tela'), r = c.getBoundingClientRect();
    const ev = (t, id, x, y) => c.dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: r.left + x, clientY: r.top + y, bubbles: true, pointerType: 'touch', isPrimary: id === 1 }));
    const n0 = App.mem.disegno.punti.length;
    ev('pointerdown', 1, 150, 150); ev('pointerdown', 2, 200, 150);
    for (let k = 1; k <= 5; k++) { ev('pointermove', 1, 150 - k * 10, 150); ev('pointermove', 2, 200 + k * 10, 150); }
    ev('pointerup', 1, 100, 150); ev('pointerup', 2, 250, 150);
    return App.mem.disegno.punti.length === n0;
  });
  ok(pinch, 'lo zoom con due dita non deve aggiungere punti');
  await foto('29-disegno-zoom');
  await pg.click('text=Adatta');

  // ===== 2.13.0: lavorazioni sulle linee, angolo da una foto =====
  await vai('disegno'); await pg.waitForTimeout(80);
  await pg.evaluate(() => { App.mem.disegno.punti = [{ x: '0', z: '0' }, { x: '20', z: '0', smusso: '1' }, { x: '20', z: '-25' }, { x: '30', z: '-25' }, { x: '30', z: '-45' }, { x: '40', z: '-45' }]; App.salva(); });
  await vai('home'); await vai('disegno'); await pg.waitForTimeout(80);
  await pg.click('.linea-testo:has-text("Cilindro Ø20 lungo 25")'); await pg.waitForTimeout(40);
  await pg.selectOption('#f-fil', '2.5'); await pg.waitForTimeout(60);
  let pl = await pg.evaluate(() => App.mem.disegno.punti[2]);
  ok(pl.fil === '2.5' && Number(pl.gola) >= 3, 'filetto e gola sulla linea: ' + JSON.stringify(pl));
  await pg.click('.linea-testo:has-text("Cilindro Ø30 lungo 20")'); await pg.waitForTimeout(40);
  await pg.fill('#f-toll', 'h6'); await pg.waitForTimeout(40);
  ok((await pg.textContent('.elenco-linee')).includes('filetto M20x2,5') && (await pg.textContent('.elenco-linee')).includes('h6'), 'lavorazioni nell\'elenco');
  await foto('31-disegno-filetto');
  await pg.click('text=Crea il programma'); await pg.waitForTimeout(120);
  const lst = await pg.textContent('.listato');
  ok(lst.includes('(FASE 3: FILETTO M20X2.5') && lst.includes('G75') === false && lst.includes('X29.994'), 'programma con profilo, gola e filetto');
  // angolo da una foto: immagine fatta qui con un fianco a 60 gradi
  await vai('angolo'); await pg.waitForTimeout(80);
  const png64 = await pg.evaluate(() => { const c = document.createElement('canvas'); c.width = 800; c.height = 600; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 800, 600);
    g.fillStyle = '#333'; g.beginPath(); g.moveTo(100, 550); g.lineTo(100, 450); g.lineTo(450, 450); g.lineTo(450 + 150, 450 - 150 * Math.tan(Math.PI / 3)); g.lineTo(700, 450 - 150 * Math.tan(Math.PI / 3)); g.lineTo(700, 550); g.closePath(); g.fill();
    return c.toDataURL('image/png').split(',')[1]; });
  await pg.setInputFiles('#f-fotoAngolo', { name: 'pezzo.png', mimeType: 'image/png', buffer: Buffer.from(png64, 'base64') });
  await pg.waitForTimeout(300);
  const ang = await pg.evaluate(() => { const st = App.angoloStato; st.pti = [{ x: 150, y: 456 }, { x: 400, y: 445 }, { x: 476, y: 404 }, { x: 566, y: 247 }]; App.angoloCalcola(); const prima = st.alfa; App.angoloAggancia(); App.angoloDisegna(); return [prima, st.alfa]; });
  ok(Math.abs(ang[0] - 60) > 1 && Math.abs(ang[1] - 60) < 1, 'aggancio ai bordi: ' + ang.map(a => a.toFixed(2)).join(' -> '));
  const tes = await pg.textContent('#schermo');
  ok(tes.includes('Smussatore (angolo di punta): 60') && tes.includes('di serie 60°') && tes.includes('coda di rondine'), 'utensili per 60 gradi');
  await pg.selectOption('#f-cosa', 'cava'); await pg.waitForTimeout(40);
  ok((await pg.textContent('#schermo')).includes('Fresa a V'), 'cava a V');
  await foto('32-angolo');
  await largo('fine 2.13.0');

  // ===== 2.10.0: ciclo proposto e quote dal disegno =====
  await vai('ciclo'); await pg.waitForTimeout(80);
  await pg.click('.schede button[data-id="albero"]'); await pg.waitForTimeout(60);
  await pg.click('text=Proponi il ciclo'); await pg.waitForTimeout(150);
  ok((await pg.$$eval('#schermo .elem.fase', x => x.length)) === 5, 'albero: 5 lavorazioni (senza foro in asse)');
  ok(!(await pg.$('#schermo .errore')), 'albero con errore');
  await foto('26-ciclo-albero');
  await pg.click('text=Crea il programma'); await pg.waitForTimeout(80);
  ok((await pg.textContent('.listato')).includes('(FASE 5: TRONCATURA'), 'programma dell\'albero');
  await pg.goBack(); await pg.waitForTimeout(80);
  await pg.click('text=Proponi il ciclo'); await pg.waitForTimeout(150);
  await pg.click('text=Crea il pezzo con le misure da controllare'); await pg.waitForTimeout(100);
  ok((await pg.evaluate(() => location.hash)) === '#pezzo' && (await pg.inputValue('[aria-label="Tolleranza 1"]')) === 'h6', 'pezzo con le misure');
  // quote incollate
  await vai('ciclo'); await pg.waitForTimeout(60);
  await pg.click('text=Incolla il testo');
  await pg.fill('[id^="f-quoteTesto"]', 'Ø25h6  M12x1,75  4xØ9  1x45°');
  await pg.click('text=Leggi le quote'); await pg.waitForTimeout(60);
  ok((await pg.$$eval('.chips.quote .chip', x => x.length)) >= 4, 'quote lette');
  const prima = await pg.evaluate(() => App.mem.ciclo.albero.tratti.length);
  await pg.click('.chips.quote .chip:text("Ø25 h6")'); await pg.waitForTimeout(80);
  ok((await pg.evaluate(() => App.mem.ciclo.albero.tratti.length)) === prima + 1 && (await pg.evaluate(() => App.mem.ciclo.albero.tratti.slice(-1)[0].toll)) === 'h6', 'quota aggiunta come diametro');
  // un campo scelto: la quota va li
  await pg.click('[id="f-lg"]');
  await pg.click('.chips.quote .chip:text("Ø25 h6")'); await pg.waitForTimeout(60);
  ok((await pg.inputValue('#f-lg')) === '25', 'quota scritta nel campo scelto');
  await foto('27-quote');
  // piastra
  await pg.click('.schede button[data-id="piastra"]'); await pg.waitForTimeout(80);
  const fori0 = await pg.evaluate(() => App.mem.ciclo.piastra.fori.length);
  await pg.click('.chips.quote .chip:text("4 x Ø9")'); await pg.waitForTimeout(80);
  ok((await pg.evaluate(() => App.mem.ciclo.piastra.fori.length)) === fori0 + 1, 'fori dalla quota');
  await pg.evaluate(() => { App.mem.ciclo.piastra.fori.pop(); App.salva(); }); await vai('home'); await vai('ciclo'); await pg.waitForTimeout(80);
  await pg.click('text=Proponi il ciclo'); await pg.waitForTimeout(200);
  ok(!(await pg.$('#schermo .errore')), 'piastra con errore: ' + ((await pg.$('#schermo .errore')) ? await pg.textContent('#schermo .errore') : ''));
  const nf = await pg.$$eval('#schermo .elem.fase', x => x.length);
  ok(nf >= 7, 'piastra: lavorazioni ' + nf);
  await foto('28-ciclo-piastra');
  await pg.click('text=Modifica in Sequenza'); await pg.waitForTimeout(100);
  ok((await pg.$$eval('.elem.fase', x => x.length)) === nf, 'piastra nella sequenza');
  await largo('fine 2.10.0');

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
  ok((await pg.$$eval('.elenco .elem', x => x.length)) >= 1, 'programma salvato perso');
  const sw = await pg.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
  ok(sw, 'service worker non registrato');

  // lettura da foto: telefono finto che restituisce il testo letto (nel browser la lettura non c'e)
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx2.addInitScript(() => { window.Android = { leggiFoto() { setTimeout(() => window.__fotoLetta('Program Edit\n1 %\n2 O0007 (PROVA)\n3 G21 G17 G9O\n4 T1 M6\n5 S2OOO M3\n6 G0 X1O Y1O Z5\n7 G1 Z-2 F15O\n8 G1 X5O\n9 G0 Z-1\n10 G0 X0 Y0\n11 M30', null), 20); } }; });
  const pg2 = await ctx2.newPage();
  pg2.on('pageerror', e => errori.push('pagina 2: ' + e.message));
  await pg2.goto(url + '#apri'); await pg2.waitForTimeout(150);
  await pg2.click('text=Leggi da una foto'); await pg2.waitForTimeout(250);
  const letto = await pg2.inputValue('#f-testo');
  ok(letto.startsWith('%\nO0007 (PROVA)\nG21 G17 G90') && letto.includes('S2000 M3') && letto.includes('F150'), 'testo letto dalla foto: ' + JSON.stringify(letto.slice(0, 80)));
  const ctl = await pg2.textContent('.controllo');
  ok(ctl.includes('Riga 10') && ctl.includes('sotto Z0'), 'errore del rapido sotto Z0 non segnalato: ' + ctl.slice(0, 200));
  ok(/1 errore/.test(await pg2.textContent('.controllo-esito')), 'esito del controllo');
  if (dirFoto) await pg2.screenshot({ path: path.join(dirFoto, '25-foto-letta.png'), fullPage: true });
  await pg2.click('button.pul:text-is("Simula")'); await pg2.waitForTimeout(200);
  ok((await pg2.$$eval('.dro-riga', x => x.length)) === 3, 'simulazione del programma letto');
  await ctx2.close();

  await b.close(); server.close();
  if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1); }
  console.log('OK interfaccia');
})().catch(e => { console.error(e); process.exit(1); });
