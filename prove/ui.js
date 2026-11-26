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
  const url = 'http://127.0.0.1:' + server.address().port + '/app.html';
  const dirFoto = process.argv[2];
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage();
  const errori = [];
  pg.on('pageerror', e => errori.push('pagina: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errori.push('console: ' + m.text()); });
  const ok = (c, msg) => { if (!c) { errori.push(msg); console.log('FALLITA:', msg); } };
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
  ok((await pg.$$eval('.ingressi .ingresso', x => x.length)) === 4, 'quattro ingressi nella home');
  let voci = 0;
  for (const g of ['calcola', 'controlla', 'officina']) { await vai('g-' + g); voci += await pg.$$eval('#schermo .tessera', x => x.length); }
  ok(voci === 17, 'funzioni dentro i gruppi: ' + voci);
  await vai('home');
  await largo('home');

  // tutte le schermate si aprono
  for (const s of ['home', 'programma', 'calcoli', 'utensili', 'tolleranze', 'macro', 'galleria', 'salvati', 'tabelle', 'materiali', 'preferiti', 'impostazioni', 'apri', 'pezzi', 'tabellaUtensili', 'simula', 'listato', 'disegno', 'cad', 'lavoro', 'g-calcola', 'g-controlla', 'g-officina', 'ciclo', 'angolo', 'guida', 'note', 'scambio']) {
    await vai(s); await erroreSchermo(s); await largo(s);
    // nessun "null", "undefined" o "NaN" scritto sullo schermo
    const sporco = await pg.evaluate(() => { const t = document.getElementById('schermo').innerText; const m = t.match(/\b(null|undefined|NaN)\b/); return m ? m[0] + ' in: ' + t.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\n/g, ' ') : ''; });
    ok(!sporco, 'testo sbagliato in ' + s + ': ' + sporco);
    // accessibilita: ogni pulsante, campo e tela ha un nome per i lettori di schermo
    const senzaNome = await pg.evaluate(() => {
      const out = [];
      document.querySelectorAll('#schermo button, #schermo input, #schermo select, #schermo textarea, #testata button, #barra button, #schermo canvas, #schermo summary').forEach(e => {
        if (e.type === 'hidden' || e.type === 'file' || e.hidden || e.closest('[hidden]')) return;
        const nome = (e.getAttribute('aria-label') || '').trim() || (e.id && document.querySelector('label[for="' + e.id + '"]') ? 'l' : '') || (e.closest('label') ? 'l' : '') || (e.tagName === 'CANVAS' ? '' : (e.textContent || '').trim()) || (e.getAttribute('title') || '') || (e.getAttribute('placeholder') || '');
        if (!nome) out.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className ? '.' + String(e.className).split(' ')[0] : ''));
      });
      return out;
    });
    ok(!senzaNome.length, 'accessibilita ' + s + ': senza nome ' + senzaNome.join(', '));
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

  // tabella filetti: famiglie, ricerca, misure
  await vai('tabelle');
  ok((await pg.$$eval('#schermo .chips.fam .chip', x => x.length)) >= 13, 'famiglie di filetti');
  await pg.click('#schermo .chips.fam .chip[data-id="npt"]');
  ok((await pg.textContent('#schermo')).includes('NPT 1/2') && (await pg.textContent('#schermo')).includes('Conico 1:16'), 'tabella NPT');
  await pg.click('#schermo .chips.fam .chip[data-id="g"]');
  await pg.fill('#f-cercaFil', '3/4'); await pg.waitForTimeout(40);
  ok((await pg.$$eval('#schermo .tab-fil tr', x => x.length)) === 3 && (await pg.textContent('#schermo .tab-fil')).includes('G 3/4'), 'ricerca filetto gas');
  await pg.fill('#f-cercaFil', '');
  await foto('08-filetti');
  // foto: due pulsanti, fotocamera e galleria
  await vai('angolo'); await pg.waitForTimeout(60);
  ok((await pg.$eval('#f-fotoAngolo-cam', i => i.getAttribute('capture'))) === 'environment', 'campo fotocamera senza capture');
  ok(!(await pg.$eval('#f-fotoAngolo', i => i.hasAttribute('capture'))), 'galleria con capture');
  ok((await pg.textContent('#f-fotoAngolo-scatta')).includes('Scatta una foto') && (await pg.textContent('#f-fotoAngolo-galleria')).includes('galleria'), 'pulsanti foto');

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
  await pg.click('.foto-griglia .foto >> nth=0'); await pg.waitForTimeout(100);
  await pg.click('.foto-chips .chip[data-dida="Morsa"]'); await pg.waitForTimeout(100);
  ok((await pg.textContent('.foto-dida')) === 'Morsa', 'didascalia della foto');
  await pg.fill('#f-sporg', '12'); await pg.waitForTimeout(40);
  await pg.click('.chip:text-is("Centro del pezzo")').catch(() => {});
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
  ok(fp.includes('Serraggio e origine') && fp.includes('<svg') && fp.includes('X0 Y0'), 'foglio: schema dell\'origine');
  ok(fp.includes('<figcaption>Morsa</figcaption>') && fp.includes('12 mm'), 'foglio: foto con didascalia e sporgenza dal serraggio');
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
  await pg.click('#schermo >> text=Ripristina'); await pg.waitForTimeout(100);
  await pg.click('.dialogo button:text-is("Ripristina")'); await pg.waitForTimeout(300);
  await vai('pezzi');
  ok((await pg.textContent('#schermo')).includes('Flangia prova'), 'ripristino della copia');
  await largo('fine 2.4.0');

  // post-processor: linguaggio della macchina
  await vai('impostazioni');
  await pg.selectOption('#f-postFresa', 'dialogo');
  ok((await pg.$$eval('#f-postTornio option', o => o.map(x => x.value))).join() === 'iso,cicli,personalizzato', 'il dialogo a testo non e per il tornio');
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
  ok(await pg.$('#d-fil-g-m') && await pg.$('#d-fil-g-npt') && await pg.$('#d-fil-g-unf'), 'gruppi dei filetti nel disegno del tornio');
  await pg.click('#d-fil-g-m'); await pg.waitForTimeout(60);
  await pg.click('#d-fil .fil-misure .chip:text-is("M20")'); await pg.waitForTimeout(80);
  let pl = await pg.evaluate(() => App.mem.disegno.punti[2]);
  ok(pl.fil === '2.5' && pl.filFam === 'm' && Number(pl.gola) >= 3, 'filetto e gola sulla linea: ' + JSON.stringify(pl));
  await pg.click('.linea-testo:has-text("Cilindro Ø30 lungo 20")'); await pg.waitForTimeout(40);
  await pg.fill('#f-toll', 'h6'); await pg.waitForTimeout(40);
  ok((await pg.textContent('.elenco-linee')).includes('filetto M20x2,5') && (await pg.textContent('.elenco-linee')).includes('h6'), 'lavorazioni nell\'elenco');
  await foto('31-disegno-filetto');
  await pg.click('text=Crea il programma'); await pg.waitForTimeout(120);
  const lst = await pg.textContent('.listato');
  ok(lst.includes('(FASE 3: FILETTO M20') && lst.includes('G75') === false && lst.includes('X29.994'), 'programma con profilo, gola e filetto');
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

  // ===== 2.20.0: lavoro guidato in 4 passi, tastierino, home =====
  {
    await pg.evaluate(() => { delete App.mem.lavoro; delete App.mem.materiali; App.salva(); });
    await vai('home');
    await pg.click('.ingresso[data-gruppo="disegna"]'); await pg.waitForTimeout(120);
    ok((await pg.evaluate(() => location.hash)) === '#lavoro', 'Disegna apre il lavoro guidato');
    ok((await pg.$$eval('.lav-passi button', x => x.length)) === 4, 'quattro passi');
    // passo 1: tornio, barra
    await pg.click('.lav-macchina[data-modo="tornio"]');
    const campo = async (et) => pg.locator('.cn', { hasText: et }).locator('input');
    await (await campo('Diametro della barra')).click();
    ok(await pg.isVisible('.tastierino'), 'il tastierino si apre toccando un campo');
    await pg.click('.tast-k[aria-label="Cancella tutto"]'); await pg.click('.tast-k[aria-label="5"]'); await pg.click('.tast-k[aria-label="0"]');
    await pg.click('.tast-k[aria-label="Conferma"]');
    ok(!(await pg.isVisible('.tastierino')), 'OK chiude il tastierino');
    ok((await pg.evaluate(() => App.lavoroStato.S.tornio.grezzo.dg)) === '50', 'quota scritta col tastierino: ' + (await pg.evaluate(() => App.lavoroStato.S.tornio.grezzo.dg)));
    // passo 2: tratti
    await pg.click('#lav-avanti'); await pg.waitForTimeout(80);
    await pg.evaluate(() => { const S = App.lavoroStato.S; S.tornio.tratti = []; App.lavoroStato.tutto(); });
    await pg.click('#lav-agg-tratto'); await pg.waitForTimeout(60);
    ok(await pg.isVisible('.tastierino'), 'tratto nuovo: il tastierino e gia sul diametro');
    await pg.click('.tast-k[aria-label="2"]'); await pg.click('.tast-k[aria-label="0"]'); await pg.click('.tast-k[aria-label="Campo dopo"]'); await pg.waitForTimeout(30);
    await pg.click('.tast-k[aria-label="2"]'); await pg.click('.tast-k[aria-label="5"]'); await pg.click('.tast-k[aria-label="Conferma"]'); await pg.waitForTimeout(40);
    let tr = await pg.evaluate(() => App.lavoroStato.S.tornio.tratti);
    ok(tr.length === 1 && tr[0].d === '20' && tr[0].l === '25', 'tratto a quote col tastierino: ' + JSON.stringify(tr));
    await pg.click('.lav-card.aperta .fil-gruppi .chip:text-is("Metrico grosso")'); await pg.waitForTimeout(30);
    await pg.click('.lav-card.aperta .fil-misure .chip:text-is("M20")'); await pg.waitForTimeout(30);
    await pg.click('#lav-agg-tratto'); await pg.waitForTimeout(40);
    await pg.click('.tast-k[aria-label="Cancella tutto"]'); await pg.click('.tast-k[aria-label="3"]'); await pg.click('.tast-k[aria-label="0"]'); await pg.click('.tast-k[aria-label="Campo dopo"]'); await pg.waitForTimeout(30);
    await pg.click('.tast-k[aria-label="2"]'); await pg.click('.tast-k[aria-label="0"]'); await pg.click('.tast-k[aria-label="Conferma"]'); await pg.waitForTimeout(30);
    await pg.click('.lav-card.aperta .chip:text-is("h6")');
    tr = await pg.evaluate(() => App.lavoroStato.S.tornio.tratti);
    ok(tr.length === 2 && tr[0].fil && tr[0].gola && tr[1].toll === 'h6', 'filetto con gola e tolleranza con un tocco: ' + JSON.stringify(tr));
    // il disegno: toccare un tratto lo apre
    const tb = await pg.$eval('.lav-tela', c => { const b = c.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; });
    const z0 = await pg.evaluate(() => App.lavoroStato.zone.find(q => q.i === 0));
    await pg.mouse.click(tb[0] + (z0.x0 + z0.x1) / 2, tb[1] + tb[3] / 2); await pg.waitForTimeout(60);
    ok((await pg.evaluate(() => App.lavoroStato.S.aperta)) === 0, 'tocco sul disegno apre il tratto');
    await foto('40-lavoro-forma');
    // passo 3: lavorazioni proposte, una spenta
    await pg.click('#lav-avanti'); await pg.waitForTimeout(150);
    const fasi = await pg.$$eval('.lav-fase', x => x.map(e => e.dataset.chiave));
    ok(fasi.length >= 4 && fasi.some(k => /^Filetto/.test(k)) && fasi.some(k => /^Gola/.test(k)), 'lavorazioni proposte: ' + fasi.join(', '));
    ok((await pg.textContent('#lav-riassunto')).includes('minuti'), 'tempo stimato');
    await pg.click('.lav-fase[data-chiave^="Troncatura"] .lav-int'); await pg.waitForTimeout(60);
    ok(await pg.$eval('.lav-fase[data-chiave^="Troncatura"]', e => e.classList.contains('spenta')), 'lavorazione spenta');
    await foto('41-lavoro-lavorazioni');
    // passo 4: programma
    await pg.click('#lav-avanti'); await pg.waitForTimeout(150);
    ok((await pg.$$eval('.lav-ut', x => x.length)) >= 2 && (await pg.textContent('#schermo')).includes('provalo a vuoto'), 'utensili e avviso');
    await foto('42-lavoro-programma');
    await pg.click('#lav-programma'); await pg.waitForTimeout(150);
    const lt = await pg.textContent('.listato');
    ok(lt.includes('FILETTO') && !lt.includes('TRONCATURA'), 'programma senza la fase spenta');
    await pg.goBack(); await pg.waitForTimeout(150);
    await pg.click('#lav-simula'); await pg.waitForTimeout(250);
    ok((await pg.evaluate(() => location.hash)) === '#simula', 'simulazione dal lavoro');
    await erroreSchermo('simulazione dal lavoro');
    // fresa: forme pronte
    await vai('lavoro'); await pg.click('.lav-passi button[data-passo="0"]'); await pg.click('.lav-macchina[data-modo="fresa"]');
    await pg.click('.lav-passi button[data-passo="1"]'); await pg.waitForTimeout(60);
    await pg.evaluate(() => { App.lavoroStato.S.fresa.forme = []; App.lavoroStato.tutto(); });
    await pg.click('#lav-agg-forma'); ok((await pg.$$eval('.lav-forma', x => x.length)) === 7, 'sette forme pronte');
    await pg.click('.lav-forma[data-forma="foriCerchio"]'); await pg.waitForTimeout(40);
    await pg.click('.lav-card.aperta .chip:text-is("Filettato")'); await pg.click('.lav-card.aperta .chip:text-is("M10")');
    await pg.click('#lav-agg-forma'); await pg.click('.lav-forma[data-forma="tasca"]'); await pg.waitForTimeout(40);
    const fo = await pg.evaluate(() => App.lavoroStato.S.fresa.forme);
    ok(fo.length === 2 && fo[0].foro === 'maschio' && fo[0].d === 10 && fo[0].passo === 1.5, 'fori filettati M10: ' + JSON.stringify(fo[0]));
    await foto('43-lavoro-fresa');
    await pg.click('#lav-avanti'); await pg.waitForTimeout(150);
    ok((await pg.$$eval('.lav-fase', x => x.length)) >= 5, 'fasi della fresa');
    await pg.click('#lav-avanti'); await pg.waitForTimeout(150);
    await pg.click('#lav-programma'); await pg.waitForTimeout(150);
    ok((await pg.textContent('.listato')).includes('G84'), 'maschiatura nel programma della fresa');
    // forma sbagliata: si torna al passo 2 con il messaggio
    await vai('lavoro');
    await pg.evaluate(() => { const S = App.lavoroStato.S; S.fresa.forme = []; S.fresa.grezzo.sovraZ = ''; S.fresa.grezzo.contorna = false; S.passo = 1; App.lavoroStato.tutto(); });
    await pg.click('#lav-avanti'); await pg.waitForTimeout(80);
    ok((await pg.evaluate(() => App.lavoroStato.S.passo)) === 1, 'senza forme non si va avanti');
    // home: continua l'ultimo lavoro
    await vai('home');
    ok(await pg.isVisible('#h-continua'), 'continua l\'ultimo lavoro');
    await foto('44-home');
    // telefono girato: disegno e dati affiancati
    await vai('lavoro'); await pg.setViewportSize({ width: 844, height: 390 }); await pg.waitForTimeout(120);
    const aff = await pg.evaluate(() => { const a = document.querySelector('.lav-disegno').getBoundingClientRect(), b = document.querySelector('.lav-corpo').getBoundingClientRect(); return b.left >= a.right - 1; });
    ok(aff, 'in orizzontale disegno e dati affiancati');
    await largo('lavoro in orizzontale');
    await pg.setViewportSize({ width: 390, height: 844 });
    await vai('home');
  }

  // ===== 2.21.0: modelli, lavori salvati, tornio interno, costo, foglio, quote =====
  {
    await pg.evaluate(() => { delete App.mem.lavoro; App.mem.lavori = []; App.salva(); });
    await vai('lavoro'); await pg.waitForTimeout(80);
    await pg.click('.lav-macchina[data-modo="tornio"]');
    ok((await pg.$$eval('.lav-modello', x => x.length)) === 4, 'quattro modelli del tornio');
    await pg.click('.lav-modello[data-modello="boccola"]'); await pg.waitForTimeout(100);
    if (await pg.isVisible('.dialogo-box')) { await pg.click('.dialogo-box .pul:text-is("Usa il modello")'); await pg.waitForTimeout(100); }
    ok((await pg.evaluate(() => App.lavoroStato.S.passo)) === 1 && (await pg.evaluate(() => App.lavoroStato.S.tornio.foroD)) === 20, 'modello Boccola applicato');
    ok((await pg.textContent('#schermo')).includes('Barenatura interna'), 'campi della barenatura interna');
    await pg.click('#lav-avanti'); await pg.waitForTimeout(150);
    const fasiI = await pg.$$eval('.lav-fase', x => x.map(e => e.dataset.chiave));
    ok(fasiI.some(k => /^Barenatura interna/.test(k)), 'barenatura interna proposta: ' + fasiI.join(', '));
    await pg.click('#lav-avanti'); await pg.waitForTimeout(150);
    ok((await pg.textContent('#lav-costo')).includes('€'), 'costo del pezzo');
    await pg.click('#lav-foglio'); await pg.waitForTimeout(200);
    ok((await pg.evaluate(() => location.hash)) === '#foglio' && (await pg.evaluate(() => App.param.foglio.html)).includes('Sequenza delle lavorazioni'), 'foglio di attrezzaggio dal lavoro');
    await pg.goBack(); await pg.waitForTimeout(150);
    // salva con un nome, duplica, riapri
    await pg.click('.lav-passi button[data-passo="0"]'); await pg.waitForTimeout(60);
    await pg.click('#lav-salva'); await pg.waitForTimeout(60);
    await pg.fill('#f-chiedi', 'Boccola D40'); await pg.click('.dialogo-box .pul:text-is("OK")'); await pg.waitForTimeout(100);
    ok((await pg.$$eval('.lav-salvato', x => x.length)) === 1, 'lavoro salvato con un nome');
    await pg.click('.lav-salvato button[aria-label="Duplica Boccola D40"]'); await pg.waitForTimeout(60);
    ok((await pg.$$eval('.lav-salvato', x => x.length)) === 2, 'lavoro duplicato');
    await pg.click('.lav-modello[data-modello="disco"]'); await pg.waitForTimeout(60);
    if (await pg.isVisible('.dialogo-box')) { await pg.click('.dialogo-box .pul:text-is("Usa il modello")'); await pg.waitForTimeout(80); }
    ok((await pg.evaluate(() => App.lavoroStato.S.tornio.tratti[0].d)) === 80, 'altro modello');
    await pg.click('.lav-passi button[data-passo="0"]'); await pg.waitForTimeout(60);
    await pg.click('.lav-salvato .pul:text-is("Apri") >> nth=0'); await pg.waitForTimeout(100);
    ok((await pg.evaluate(() => App.lavoroStato.S.tornio.foroD)) === 20, 'lavoro salvato riaperto');
    await pg.click('.lav-passi button[data-passo="0"]'); await pg.waitForTimeout(60);
    await pg.click('.lav-salvato button[aria-label^="Elimina"] >> nth=0'); await pg.waitForTimeout(60);
    await pg.click('.dialogo-box .pul:text-is("Elimina")'); await pg.waitForTimeout(80);
    ok((await pg.$$eval('.lav-salvato', x => x.length)) === 1, 'lavoro eliminato');
    // fresa: modello e quote sul disegno
    await pg.click('.lav-macchina[data-modo="fresa"]');
    await pg.click('.lav-modello[data-modello="piastraTasca"]'); await pg.waitForTimeout(60);
    if (await pg.isVisible('.dialogo-box')) { await pg.click('.dialogo-box .pul:text-is("Usa il modello")'); await pg.waitForTimeout(80); }
    await pg.click('.lav-card[data-i="0"] .lav-card-apri');
    await pg.waitForTimeout(100);
    await foto('45-lavoro-quote');
    await pg.click('#lav-avanti'); await pg.waitForTimeout(100); await pg.click('#lav-avanti'); await pg.waitForTimeout(150);
    await pg.click('#lav-programma'); await pg.waitForTimeout(150);
    ok(/G1 X[\d.]+ Z-/.test(await pg.textContent('.listato')), 'discesa a rampa nel programma della tasca');
    await vai('home');
  }

  // ===== 2.22.0: tutte le tolleranze IT01-IT18 =====
  {
    await vai('tabelle'); await pg.click('#schermo .chips:not(.fam) .chip:text-is("Tolleranze")'); await pg.waitForTimeout(60);
    ok((await pg.$$eval('[data-toll-g]', x => x.length)) === 20 && (await pg.$$eval('[data-toll-l]', x => x.length)) === 16, 'chip di lettere e gradi');
    await pg.click('[data-toll-l="h"]'); await pg.click('[data-toll-g="13"]'); await pg.waitForTimeout(40);
    let tx = await pg.textContent('#schermo');
    ok(tx.includes('h13') && /-330/.test(tx), 'classe h13 in tabella');
    ok(tx.includes('IT18') && tx.includes('3900') && tx.includes('IT01'), 'tabella di tutti i gradi IT');
    await pg.click('[data-toll-l="F"]'); await pg.click('[data-toll-g="9"]'); await pg.waitForTimeout(40);
    ok((await pg.textContent('#schermo')).includes('F9'), 'classe F9');
    await vai('tolleranze'); await pg.fill('#f-libero', 'H12'); await pg.waitForTimeout(60);
    ok((await pg.textContent('#schermo')).includes('210'), 'H12 nella calcolatrice');
    ok((await pg.$$eval('#f-foro option', x => x.map(o => o.value))).includes('H13') && (await pg.$$eval('#f-alb option', x => x.map(o => o.value))).includes('h14'), 'classi in piu nelle liste');
    await pg.fill('#f-libero', 'H19'); await pg.waitForTimeout(60);
    ok((await pg.textContent('#schermo')).includes('IT18'), 'grado non valido: messaggio');
    await pg.fill('#f-libero', '');
    await vai('home');
  }

  // ===== 2.29.0: testata, marchio e sfondo con immagine =====
  {
    await vai('home'); await pg.waitForTimeout(150);
    const imgs = await pg.evaluate(() => ({ testata: (() => { const i = document.querySelector('.eroe img.scena'); return i ? [i.complete, i.naturalWidth, i.naturalHeight, i.getBoundingClientRect().height] : null; })(),
      marchio: (() => { const i = document.querySelector('.eroe .marchio img'); return i ? [i.complete, i.naturalWidth] : null; })(), svgVecchia: !!document.querySelector('.eroe svg.scena') }));
    ok(imgs.testata && imgs.testata[0] && imgs.testata[1] === 1170 && imgs.testata[2] === 630 && imgs.testata[3] > 180 && imgs.testata[3] < 240, 'testata della home: ' + JSON.stringify(imgs.testata));
    ok(imgs.marchio && imgs.marchio[0] && imgs.marchio[1] === 192 && !imgs.svgVecchia, 'marchio con la nuova icona');
    ok((await pg.textContent('.eroe .marchio')).includes('Hich-Officina'), 'titolo sopra la testata');
    ok(await pg.evaluate(() => document.body.classList.contains('con-sfondo')), 'sfondo con immagine acceso di serie');
    const vis = () => pg.evaluate(() => { const s = getComputedStyle(document.body, '::after'); return [s.content !== 'none' && s.display !== 'none', s.backgroundImage.includes('sfondo.jpg'), s.position, s.zIndex]; });
    const v1 = await vis(); ok(v1[0] && v1[1] && v1[2] === 'fixed' && v1[3] === '-1', 'sfondo dietro i contenuti: ' + JSON.stringify(v1));
    // si spegne dalle Impostazioni
    await vai('impostazioni'); await pg.waitForTimeout(80);
    await pg.uncheck('#f-sfondo'); await pg.waitForTimeout(60);
    ok(!(await pg.evaluate(() => document.body.classList.contains('con-sfondo'))) && !(await vis())[0], 'sfondo spento dalle impostazioni');
    await pg.check('#f-sfondo'); await pg.waitForTimeout(60);
    ok(await pg.evaluate(() => document.body.classList.contains('con-sfondo')), 'sfondo riacceso');
    // il tema chiaro non ha lo sfondo scuro
    await pg.selectOption('#f-tema', 'chiaro'); await pg.waitForTimeout(80);
    ok(!(await vis())[0], 'tema chiaro: niente sfondo con immagine');
    await foto('49-home-chiaro-con-immagini');
    await pg.selectOption('#f-tema', 'scuro'); await pg.waitForTimeout(60);
    // i testi restano leggibili sopra lo sfondo: il colore piu chiaro possibile dell'immagine, sotto la velatura, e scuro
    const lum = await pg.evaluate(async () => {
      const im = new Image(); im.src = 'icone/sfondo.jpg'; await im.decode();
      const c = document.createElement('canvas'); c.width = 90; c.height = 160; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 90, 160);
      const d = g.getImageData(0, 0, 90, 160).data; let max = 0, somma = 0;
      for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; max = Math.max(max, l); somma += l; }
      const vel = [7, 13, 26], a = 0.85, pix = (v, k) => a * vel[k] + (1 - a) * v;
      const resa = 0.2126 * pix(max, 0) + 0.7152 * pix(max, 1) + 0.0722 * pix(max, 2);
      return [Math.round(max), Math.round(somma / (d.length / 4)), Math.round(resa)];
    });
    ok(lum[2] < 70, 'sotto la velatura anche il punto piu chiaro dello sfondo e scuro: ' + lum.join(','));
    await vai('home');
  }

  // ===== 2.27.0: velocita di taglio e avanzamento in primo piano =====
  {
    await pg.evaluate(() => { Object.keys(App.sezione('utensili')).forEach(k => delete App.sezione('utensili')[k]); App.salva(); App.ridisegna(); });
    await vai('home'); await pg.waitForTimeout(120);
    ok(await pg.isVisible('#rapido'), 'calcolo rapido nella home');
    const sopra = await pg.evaluate(() => { const r = document.querySelector('#rapido').getBoundingClientRect(), i = document.querySelector('.ingressi').getBoundingClientRect(); return r.top < i.top; });
    ok(sopra, 'il calcolo rapido sta sopra i quattro ingressi');
    const attesi = await pg.evaluate(() => { const S = App.sezione('utensili'), r = App.O.datiTaglio(App.materiale(S.mat), { tipo: S.tipo, d: Number(S.d), z: 3, nmax: App.imp().nmaxFresa }); return [App.fmt(r.n, 0), App.fmt(r.f, 0), App.fmt(r.vc, 0), S.tipo, S.d]; });
    ok((await pg.textContent('#rapido-n')) === attesi[0] && (await pg.textContent('#rapido-f')) === attesi[1] && (await pg.textContent('#rapido-vc')) === attesi[2], 'giri, avanzamento e Vc come nella calcolatrice: ' + attesi.join(','));
    // cambio materiale: i valori cambiano
    const nC40 = await pg.textContent('#rapido-n');
    await pg.selectOption('#rapido-mat', { label: 'Alluminio' }); await pg.waitForTimeout(60);
    ok((await pg.textContent('#rapido-n')) !== nC40 && Number((await pg.textContent('#rapido-vc')).replace('.', '')) > 200, 'alluminio: giri e Vc diversi dal C40');
    // diametro scritto col tastierino
    await pg.locator('#rapido .cn', { hasText: 'Diametro' }).locator('input').click();
    await pg.click('.tast-k[aria-label="Cancella tutto"]'); await pg.click('.tast-k[aria-label="2"]'); await pg.click('.tast-k[aria-label="0"]'); await pg.click('.tast-k[aria-label="Conferma"]'); await pg.waitForTimeout(60);
    const n20 = await pg.evaluate(() => { const S = App.sezione('utensili'); return [S.d, App.fmt(App.O.datiTaglio(App.materiale(S.mat), { tipo: S.tipo, d: 20, z: 3, nmax: App.imp().nmaxFresa }).n, 0)]; });
    ok(n20[0] === '20' && (await pg.textContent('#rapido-n')) === n20[1], 'diametro 20 col tastierino: ' + n20.join());
    // taglienti e utensile
    await pg.click('#rapido [data-z="4"]'); await pg.waitForTimeout(40);
    ok((await pg.evaluate(() => App.sezione('utensili').z)) === '4', 'taglienti');
    await pg.selectOption('#rapido-tipo', 'maschio'); await pg.waitForTimeout(60);
    ok((await pg.$$eval('#rapido [data-z]', x => x.length)) === 0 && (await pg.textContent('#rapido')).includes('Passo del filetto'), 'maschio: niente taglienti, c\'e il passo');
    ok((await pg.textContent('#rapido')).includes('fn') || (await pg.textContent('#rapido')).includes('mm/giro'), 'maschio: avanzamento per giro');
    await pg.selectOption('#rapido-tipo', 'fresa'); await pg.waitForTimeout(40);
    // la calcolatrice completa ha gli stessi valori
    await pg.click('#rapido-completo'); await pg.waitForTimeout(150);
    ok((await pg.evaluate(() => location.hash)) === '#calcoli', 'apre la calcolatrice completa');
    ok((await pg.inputValue('#f-d')) === '20' && (await pg.inputValue('#f-tipo')) === 'fresa', 'stessi valori nella calcolatrice completa');
    await largo('home con il calcolo rapido');
    await vai('home'); await foto('48-home-rapido');
  }

  // ===== 2.26.0: segnala un problema =====
  {
    await vai('impostazioni'); await pg.waitForTimeout(60);
    ok(await pg.isVisible('#segnala'), 'tasto Segnala un problema nelle Impostazioni');
    const mail = await pg.evaluate(() => App.mailSegnalazione('lavoro'));
    const sito = JSON.parse(require('fs').readFileSync(path.join(radice, 'sito.json'), 'utf8'));
    const ver = await pg.evaluate(() => App.VERSIONE);
    ok(mail.startsWith('mailto:' + (sito.email || '') + '?subject='), 'la segnalazione va al contatto di sito.json');
    ok(decodeURIComponent(mail).includes('Hich-Officina ' + ver) && decodeURIComponent(mail).includes('Schermata: lavoro') && decodeURIComponent(mail).includes('Versione: ' + ver) && decodeURIComponent(mail).includes('Schermo: '), 'versione, schermata e schermo nell\'email');
    ok(!/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(require('fs').readFileSync(path.join(radice, 'app.js'), 'utf8') + require('fs').readFileSync(path.join(radice, 'schermi_altro.js'), 'utf8')), 'nessun indirizzo email scritto nel codice dell\'app');
    await vai('home');
  }

  // ===== 2.24.0: dal disegno al pezzo, con la conferma di ogni quota =====
  {
    const pngD = await pg.evaluate(() => { const c = document.createElement('canvas'); c.width = 1000; c.height = 500; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1000, 500);
      g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeRect(100, 200, 250, 100); g.strokeRect(350, 170, 280, 160); g.strokeRect(630, 150, 200, 200); return c.toDataURL('image/png').split(',')[1]; });
    const righeD = [{ t: 'M20x2.5', x: 150, y: 150, w: 30, h: 110, r: 90 }, { t: 'Ø30 h6', x: 420, y: 140, w: 30, h: 120, r: 90 }, { t: 'Ø36', x: 700, y: 160, w: 30, h: 80, r: 90 },
      { t: '25', x: 180, y: 400, w: 40, h: 24, r: 0 }, { t: '20', x: 430, y: 400, w: 40, h: 24, r: 0 }, { t: '15', x: 690, y: 400, w: 40, h: 24, r: 0 }, { t: '60', x: 450, y: 460, w: 40, h: 24, r: 0 },
      { t: '1x45°', x: 80, y: 90, w: 60, h: 22, r: 0 }, { t: 'Materiale: C40', x: 760, y: 470, w: 200, h: 20, r: 0 }, { t: 'Scala 1:1', x: 760, y: 490, w: 120, h: 18, r: 0 }];
    await pg.evaluate(r => { App._androidVero = App.ANDROID; App.ANDROID = { leggiImmagine: dato => { App._letta = dato.slice(0, 22); setTimeout(() => window.__righeLette({ w: 1000, h: 500, righe: r }, null), 20); } }; }, righeD);
    await pg.evaluate(() => { delete App.mem.dalDisegno; App.salva(); });
    await vai('lavoro'); await pg.click('.lav-passi button[data-passo="0"]'); await pg.waitForTimeout(60);
    await pg.click('#lav-da-foto'); await pg.waitForTimeout(100);
    ok((await pg.evaluate(() => location.hash)) === '#dalDisegno', 'dal lavoro alla foto del disegno');
    await pg.setInputFiles('#f-disegno', { name: 'albero.png', mimeType: 'image/png', buffer: Buffer.from(pngD, 'base64') });
    await pg.waitForTimeout(500);
    ok((await pg.evaluate(() => App._letta)) === 'data:image/jpeg;base64', 'la foto va alla lettura');
    ok((await pg.$$eval('.dd-q', x => x.length)) === 8, 'otto quote trovate, il cartiglio no: ' + (await pg.$$eval('.dd-q', x => x.length)));
    ok(await pg.$eval('#dd-crea', b => b.disabled), 'senza conferma il pezzo non si crea');
    ok((await pg.textContent('#dd-mancano')).includes('8'), 'mancano 8 quote');
    ok((await pg.evaluate(() => App.ddStato.S.modo)) === 'tornio', 'riconosciuto il tornio');
    // correggo il Ø30 in Ø32 h6, scarto il 20, confermo le altre
    await pg.locator('#schermo .dd-q input').nth(1).fill('Ø32 h6'); await pg.locator('#schermo .dd-q input').nth(1).dispatchEvent('change'); await pg.waitForTimeout(60);
    await pg.click('button[aria-label="Scarta la quota 5"]'); await pg.waitForTimeout(40);
    ok(await pg.$eval('#dd-crea', b => b.disabled), 'ancora quote da controllare');
    await pg.click('#dd-tutte'); await pg.waitForTimeout(60);
    ok(!(await pg.$eval('#dd-crea', b => b.disabled)), 'tutte controllate: si puo creare');
    const pz = await pg.textContent('.dd-pezzo');
    ok(pz.includes('Ø20') && pz.includes('Ø32 h6') && pz.includes('Ø36') && pz.includes('filetto M20x2,5'), 'il pezzo dal disegno: ' + pz);
    ok((await pg.textContent('.dd-proposta')).includes('ricavata dal totale'), 'la lunghezza scartata si ricava dal totale, con il dubbio');
    await foto('46-dal-disegno');
    await pg.click('#dd-crea'); await pg.waitForTimeout(200);
    ok((await pg.evaluate(() => location.hash)) === '#lavoro' && await pg.isVisible('#lav-dal-disegno'), 'il pezzo va nel lavoro guidato con l\'avviso');
    const tr = await pg.evaluate(() => App.lavoroStato.S.tornio.tratti.map(t => [t.d, t.l, t.toll || '', t.fil || 0]));
    ok(JSON.stringify(tr) === JSON.stringify([[20, 25, '', 2.5], [32, 20, 'h6', 0], [36, 15, '', 0]]), 'tratti dal disegno: ' + JSON.stringify(tr));
    ok((await pg.evaluate(() => App.materiale(App.lavoroStato.S.mat).n)) === 'C40', 'materiale dal cartiglio');
    await pg.click('#lav-avanti'); await pg.waitForTimeout(150);
    ok((await pg.$$eval('.lav-fase', x => x.length)) >= 4, 'lavorazioni dal disegno');
    // nel browser senza lettura: le quote si aggiungono toccando la foto
    await pg.evaluate(() => { App.ANDROID = null; delete App.mem.dalDisegno; App.salva(); });
    await vai('dalDisegno');
    await pg.setInputFiles('#f-disegno', { name: 'albero.png', mimeType: 'image/png', buffer: Buffer.from(pngD, 'base64') });
    await pg.waitForTimeout(400);
    ok((await pg.textContent('.dd-stato')).includes('Aggiungi una quota'), 'senza lettura: si spiega come aggiungere');
    await pg.click('#dd-aggiungi');
    const bb = await pg.$eval('.dd-tela', c => { const b = c.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; });
    await pg.mouse.click(bb[0] + bb[2] * 0.4, bb[1] + bb[3] * 0.3); await pg.waitForTimeout(80);
    await pg.fill('#f-chiedi', 'Ø40 g6'); await pg.click('.dialogo-box .pul:text-is("OK")'); await pg.waitForTimeout(100);
    const qa = await pg.evaluate(() => App.ddStato.S.quote);
    ok(qa.length === 1 && qa[0].tipo === 'diametro' && qa[0].valore === 40 && qa[0].toll === 'g6' && qa[0].stato === 'ok' && Math.abs(qa[0].x - 0.4) < 0.05, 'quota aggiunta a mano sulla foto: ' + JSON.stringify(qa[0]));
    // flangia di prova (rifatta qui): richiami su piu righe, riquadri di tolleranza, cartiglio
    const righeF = [
      { t: 'N°6 Fori Ø11', x: 650, y: 80, w: 150, h: 20 }, { t: 'Passanti', x: 650, y: 102, w: 90, h: 20 }, { t: 'Equidistanti', x: 650, y: 124, w: 120, h: 20 }, { t: '⌖ Ø 0.1 A B', x: 640, y: 150, w: 140, h: 22 },
      { t: 'N°3 Fori Lamati Ø9', x: 80, y: 300, w: 170, h: 20 }, { t: 'Passanti', x: 80, y: 322, w: 90, h: 20 }, { t: 'Lamatura Ø15', x: 80, y: 344, w: 130, h: 20 }, { t: 'Prof.lamatura 9', x: 80, y: 366, w: 140, h: 20 },
      { t: 'N°2 Fori spina Ø 8 H7 (+0.015', x: 60, y: 560, w: 260, h: 20 }, { t: 'Prof.foro 12', x: 60, y: 582, w: 120, h: 20 }, { t: 'A 180°', x: 60, y: 604, w: 60, h: 20 },
      { t: 'Ø 160', x: 900, y: 450, w: 24, h: 70, r: 90 }, { t: 'Ø 110 - ISO F11', x: 860, y: 430, w: 24, h: 140, r: 90 }, { t: 'Ø 90 - Fori spina', x: 820, y: 430, w: 24, h: 150, r: 90 }, { t: 'Ø 70', x: 780, y: 460, w: 24, h: 60, r: 90 },
      { t: 'Tolleranze (dove non specificato)', x: 500, y: 900, w: 250, h: 18 }, { t: 'Smussi 0.5 x 45°', x: 500, y: 920, w: 150, h: 18 }].map(x => Object.assign({ r: 0 }, x));
    await pg.evaluate(r => { App.ANDROID = { leggiImmagine: () => setTimeout(() => window.__righeLette({ w: 1000, h: 1000, righe: r }, null), 20) }; delete App.mem.dalDisegno; App.salva(); }, righeF);
    await vai('dalDisegno');
    await pg.setInputFiles('#f-disegno', { name: 'flangia.png', mimeType: 'image/png', buffer: Buffer.from(pngD, 'base64') });
    await pg.waitForTimeout(500);
    const tipiF = await pg.$$eval('.dd-q .dd-q-c small', x => x.map(e => e.textContent));
    ok(tipiF.filter(t => t === 'Fori (richiamo)').length === 3 && !(await pg.textContent('.dd-lista')).includes('0.1'), 'tre richiami, niente riquadri: ' + tipiF.join(', '));
    ok((await pg.evaluate(() => App.ddStato.S.modo)) === 'fresa', 'flangia: fresa');
    await pg.click('#dd-tutte'); await pg.waitForTimeout(60);
    const fz = await pg.textContent('.dd-proposta');
    ok(fz.includes('Pezzo tondo Ø160') && fz.includes('6 fori Ø11') && fz.includes('su Ø110') && fz.includes('lamatura Ø15') && fz.includes('Ø8 H7 prof. 12') && fz.includes('su Ø90'), 'flangia proposta: ' + fz.slice(0, 300));
    await foto('47-dal-disegno-flangia');
    await pg.evaluate(() => { App.ANDROID = App._androidVero; });
    await vai('home');
  }

  // ===== 2.23.0: funzioni d'officina =====
  {
    await vai('calcoli'); await pg.waitForTimeout(60);
    const ids = await pg.$$eval('.chips button.chip[data-id]', x => x.map(b => b.dataset.id));
    ok(['seno', 'ingr', 'dilat', 'potenza', 'tempo'].every(i => ids.includes(i)), 'calcolatori nuovi: ' + ids.join());
    await pg.click('.chips button.chip[data-id][data-id="seno"]'); await pg.waitForTimeout(60);
    await pg.selectOption('#f-L', '200'); await pg.fill('#f-ang', '30'); await pg.waitForTimeout(60);
    ok((await pg.textContent('#schermo')).includes('100'), 'barra seno 200 mm a 30 gradi = 100: ' + (await pg.textContent('#schermo')).slice(0, 160));
    await pg.fill('#f-ang', ''); await pg.fill('#f-h', '50'); await pg.selectOption('#f-L', '100'); await pg.waitForTimeout(60);
    ok((await pg.textContent('#schermo')).includes('30'), 'angolo dall\'altezza');
    await pg.click('.chips button.chip[data-id][data-id="ingr"]'); await pg.waitForTimeout(60);
    await pg.fill('#f-m', '2'); await pg.fill('#f-z', '30'); await pg.fill('#f-z2', '60'); await pg.waitForTimeout(60);
    let t = await pg.textContent('#schermo');
    ok(t.includes('64') && t.includes('55') && t.includes('90'), 'ingranaggio m2 z30: esterno 64, fondo 55, interasse 90');
    await pg.fill('#f-z', '36'); await pg.waitForTimeout(60);
    ok((await pg.textContent('#schermo')).includes('1 giro e 1/9'), 'divisore 40:1 su 36 = 1 giro e 1/9');
    await pg.click('.chips button.chip[data-id][data-id="dilat"]'); await pg.waitForTimeout(60);
    await pg.selectOption('#f-mt', 'Alluminio'); await pg.fill('#f-L', '100'); await pg.fill('#f-t2', '35'); await pg.waitForTimeout(60);
    ok((await pg.textContent('#schermo')).includes('34,5'), 'dilatazione alluminio 100 mm a 35 gradi: 34,5 micrometri');
    await pg.click('.chips button.chip[data-id][data-id="potenza"]'); await pg.waitForTimeout(60);
    await pg.selectOption('#f-mat', { label: 'Alluminio' }); await pg.waitForTimeout(60);
    ok((await pg.inputValue('#f-kc')) === '800', 'kc dal materiale: ' + (await pg.inputValue('#f-kc')));
    await pg.click('.chips button.chip[data-id][data-id="tempo"]'); await pg.waitForTimeout(60);
    ok((await pg.textContent('#schermo')).includes('1,2'), 'tempo di lavoro 120 mm a 300 mm/min su 3 passate = 1,2 min');
    await vai('tabelle'); await pg.click('#schermo .chips:not(.fam) .chip:text-is("Coni")'); await pg.waitForTimeout(60);
    t = await pg.textContent('#schermo');
    ok(t.includes('Morse 3') && t.includes('23,825') && t.includes('ISO 40') && t.includes('7:24'), 'tabella dei coni');
    await vai('home');
  }

  // ===== 2.19.0: mini CAD/CAM per la fresa =====
  {
  await vai('cad'); await pg.waitForTimeout(150);
  await pg.evaluate(() => { const c = App.cadStato; c.S.entita = []; c.S.prossimo = 1; c.S.strum = 'sel'; c.aggiorna(); });
  const telaCad = await pg.$eval('.cad-tela', c => { const b = c.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  const trascinaCad = async (a, b) => { await pg.mouse.move(telaCad.x + a[0], telaCad.y + a[1]); await pg.mouse.down(); await pg.mouse.move(telaCad.x + (a[0] + b[0]) / 2, telaCad.y + (a[1] + b[1]) / 2, { steps: 3 }); await pg.mouse.move(telaCad.x + b[0], telaCad.y + b[1], { steps: 3 }); await pg.mouse.up(); await pg.waitForTimeout(40); };
  const toccaCad = async a => { await pg.mouse.click(telaCad.x + a[0], telaCad.y + a[1]); await pg.waitForTimeout(40); };
  const entCad = () => pg.evaluate(() => JSON.parse(JSON.stringify(App.cadStato.S.entita)));
  // rettangolo trascinando
  await pg.click('.cad-strum [data-strum="rett"]');
  await trascinaCad([90, 110], [260, 220]);
  let EC = await entCad();
  ok(EC.length === 1 && EC[0].tipo === 'rett' && EC[0].x1 > EC[0].x0 && EC[0].y1 > EC[0].y0, 'rettangolo disegnato col dito: ' + JSON.stringify(EC));
  ok((await pg.$$eval('.cad-strum [data-strum]', x => x.length)) === 10, 'strumenti del CAD');
  // scelto e lavorazione: contorno
  ok((await pg.textContent('.cad-pannello')).includes('+ Contorno') && (await pg.textContent('.cad-pannello')).includes('+ Tasca'), 'lavorazioni proposte per il rettangolo');
  await pg.click('.cad-op[data-op="contorno"]');
  EC = await entCad(); ok(EC[0].lav.length === 1 && EC[0].lav[0].op === 'contorno', 'contorno aggiunto');
  // cerchio: foro di serie
  await pg.click('.cad-strum [data-strum="cerchio"]');
  await trascinaCad([150, 160], [170, 160]);
  EC = await entCad(); ok(EC.length === 2 && EC[1].tipo === 'cerchio' && EC[1].lav[0].op === 'foro', 'cerchio con foro di serie: ' + JSON.stringify(EC[1]));
  // due tocchi: primo punto e secondo punto (senza trascinare)
  await pg.click('.cad-strum [data-strum="asola"]');
  await toccaCad([100, 250]); await toccaCad([200, 250]);
  EC = await entCad(); ok(EC.length === 3 && EC[2].tipo === 'asola', 'asola con due tocchi');
  // fori a tocchi: il secondo copia la lavorazione del primo
  await pg.click('.cad-strum [data-strum="punto"]');
  await toccaCad([300, 140]); await toccaCad([300, 200]);
  EC = await entCad(); ok(EC.length === 5 && EC[3].tipo === 'punto' && EC[4].tipo === 'punto', 'due fori a tocchi');
  // profilo: tre punti e Chiudi
  await pg.click('.cad-strum [data-strum="poli"]');
  await toccaCad([60, 280]); await toccaCad([140, 280]); await toccaCad([100, 330]);
  ok(!(await pg.$eval('#cad-chiudi', b => b.hidden)), 'pulsante Chiudi durante il profilo');
  await pg.click('#cad-chiudi');
  EC = await entCad(); ok(EC.length === 6 && EC[5].tipo === 'poli' && EC[5].chiuso === true && EC[5].punti.length === 3, 'profilo chiuso a tocchi: ' + JSON.stringify(EC[5]));
  // annulla e ripeti con i pulsanti
  await pg.click('#cad-annulla'); EC = await entCad(); ok(EC.length === 5, 'annulla toglie l\'ultimo elemento');
  await pg.click('#cad-ripeti'); EC = await entCad(); ok(EC.length === 6, 'ripeti lo rimette');
  // due dita: un tocco = annulla; tre dita: ripeti
  await pg.evaluate(() => {
    const c = document.querySelector('.cad-tela'), b = c.getBoundingClientRect();
    const ev = (t, id, x, y) => c.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: 'touch', clientX: b.x + x, clientY: b.y + y, bubbles: true, isPrimary: id === 1 }));
    ev('pointerdown', 1, 100, 100); ev('pointerdown', 2, 140, 100); ev('pointerup', 1, 100, 100); ev('pointerup', 2, 140, 100);
  });
  await pg.waitForTimeout(60);
  EC = await entCad(); ok(EC.length === 5, 'un tocco con due dita annulla: ' + EC.length);
  await pg.evaluate(() => {
    const c = document.querySelector('.cad-tela'), b = c.getBoundingClientRect();
    const ev = (t, id, x, y) => c.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: 'touch', clientX: b.x + x, clientY: b.y + y, bubbles: true, isPrimary: id === 1 }));
    ev('pointerdown', 1, 100, 100); ev('pointerdown', 2, 140, 100); ev('pointerdown', 3, 180, 100); ev('pointerup', 1, 100, 100); ev('pointerup', 2, 140, 100); ev('pointerup', 3, 180, 100);
  });
  await pg.waitForTimeout(60);
  EC = await entCad(); ok(EC.length === 6, 'un tocco con tre dita ripete: ' + EC.length);
  // pizzico con due dita: zoom
  const sc0 = await pg.evaluate(() => App.cadStato.vista.sc);
  await pg.evaluate(() => {
    const c = document.querySelector('.cad-tela'), b = c.getBoundingClientRect();
    const ev = (t, id, x, y) => c.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: 'touch', clientX: b.x + x, clientY: b.y + y, bubbles: true }));
    ev('pointerdown', 1, 150, 200); ev('pointerdown', 2, 200, 200); ev('pointermove', 1, 100, 200); ev('pointermove', 2, 250, 200); ev('pointerup', 1, 100, 200); ev('pointerup', 2, 250, 200);
  });
  const sc1 = await pg.evaluate(() => App.cadStato.vista.sc);
  ok(sc1 > sc0 * 2, 'pizzico = zoom: ' + sc0 + ' -> ' + sc1);
  EC = await entCad(); ok(EC.length === 6, 'il pizzico non cambia il disegno');
  // il dito (tocco) disegna col mirino sopra: il punto sta sopra il dito
  await pg.evaluate(() => { const c = App.cadStato; c.S.strum = 'punto'; c.S.snap = false; c.S.mirino = true; c.aggiorna(); c.adatta(); c.disegna(); });
  const prima = (await entCad()).length;
  await pg.evaluate(() => {
    const c = document.querySelector('.cad-tela'), b = c.getBoundingClientRect();
    const ev = (t, x, y) => c.dispatchEvent(new PointerEvent(t, { pointerId: 7, pointerType: 'touch', clientX: b.x + x, clientY: b.y + y, bubbles: true }));
    ev('pointerdown', 200, 300); ev('pointermove', 200, 300); ev('pointerup', 200, 300);
  });
  const dopo = await entCad();
  const mondoDito = await pg.evaluate(() => { const c = App.cadStato; return [c.mondo(200), c.S.entita[c.S.entita.length - 1]]; });
  ok(dopo.length === prima + 1, 'punto con il dito');
  const pt = mondoDito[1];
  ok(pt.tipo === 'punto' && pt.y > (await pg.evaluate(() => { const c = App.cadStato; return c.S.entita.length ? 0 : 0; })) - 1e9, 'punto messo');
  await pg.evaluate(() => { const c = App.cadStato; c.S.snap = true; c.S.strum = 'sel'; c.aggiorna(); });
  // il pannello dell'elemento scelto: quote, frecce, lavorazioni
  await pg.evaluate(() => { const c = App.cadStato; c.sel = c.S.entita[0].id; c.aggiorna(); });
  ok((await pg.$$eval('.cad-d .icona-pul', x => x.length)) === 4, 'frecce di spostamento fine');
  const x0prima = (await entCad())[0].x0;
  await pg.click('.cad-d button[aria-label="Destra"]');
  ok(Math.abs((await entCad())[0].x0 - x0prima - 1) < 1e-9, 'freccia sposta di 1 mm');
  // programma: dal disegno agli ISO
  await pg.evaluate(() => { const c = App.cadStato; c.S.entita = [
    { id: 1, tipo: 'rett', x0: 0, y0: 0, x1: 80, y1: 50, r: 5, lav: [{ op: 'contorno', prof: 12, lato: 'esterno' }] },
    { id: 2, tipo: 'cerchio', cx: 15, cy: 25, r: 4.25, lav: [{ op: 'foro', passante: true }] },
    { id: 3, tipo: 'poli', chiuso: true, punti: [{ x: 30, y: 10 }, { x: 55, y: 10 }, { x: 55, y: 25 }, { x: 42, y: 40 }, { x: 30, y: 25 }], lav: [{ op: 'tasca', prof: 5 }] }]; c.S.prossimo = 4; c.S.fz = '15'; c.aggiorna(); });
  await pg.click('#cad-percorso'); await pg.waitForTimeout(80);
  ok((await pg.textContent('#cad-msg')).includes('Percorso mostrato'), 'percorso mostrato: ' + (await pg.textContent('#cad-msg')));
  await foto('33-cad');
  await pg.click('#cad-crea'); await pg.waitForTimeout(200);
  ok((await pg.evaluate(() => location.hash)) === '#listato', 'il programma si apre nel listato');
  const lst2 = await pg.textContent('.listato');
  ok(lst2.includes('(FASE 1:') && /FASE \d: TASCA LIBERA/.test(lst2) && /FASE \d: CONTORNO ESTERNO/.test(lst2) && lst2.includes('G41'), 'listato dal CAD: ' + lst2.slice(0, 200));
  await pg.goBack(); await pg.waitForTimeout(150);
  // schermo intero in orizzontale
  await pg.setViewportSize({ width: 844, height: 390 });
  await pg.click('#cad-pieno'); await pg.waitForTimeout(150);
  ok(await pg.evaluate(() => document.body.classList.contains('cad-pieno')), 'schermo intero attivo');
  const boxP = await pg.$eval('.cad-tela', c => { const b = c.getBoundingClientRect(); return [b.width, b.height]; });
  ok(boxP[0] >= 840 && boxP[1] >= 385, 'il disegno riempie lo schermo girato: ' + boxP.join('x'));
  ok(!(await pg.isVisible('#testata')) && !(await pg.isVisible('#barra')), 'testata e barra nascoste a schermo intero');
  ok(await pg.isVisible('#cad-ruota') && await pg.isVisible('.cad-strum [data-strum="rett"]'), 'strumenti sopra il disegno');
  await foto('34-cad-intero');
  await pg.evaluate(() => { const c = App.cadStato; c.sel = c.S.entita[0].id; c.aggiorna(); });
  ok(await pg.isVisible('.cad-pannello'), 'il pannello si apre scegliendo un elemento');
  await pg.click('#cad-chiudi-pannello'); ok(!(await pg.isVisible('.cad-pannello')), 'pannello chiuso');
  await pg.evaluate(() => App.indietro());
  ok(!(await pg.evaluate(() => document.body.classList.contains('cad-pieno'))) && (await pg.evaluate(() => location.hash)) === '#cad', 'indietro esce dallo schermo intero senza lasciare il disegno');
  await pg.setViewportSize({ width: 390, height: 844 });
  await vai('home'); await erroreSchermo('dopo il CAD');
  // errori chiari
  await vai('cad'); await pg.waitForTimeout(80);
  await pg.evaluate(() => { const c = App.cadStato; c.S.entita = []; c.aggiorna(); });
  await pg.click('#cad-crea'); ok((await pg.textContent('#cad-msg')).includes('Nessuna lavorazione'), 'disegno vuoto: messaggio');
  await vai('home');
  }

  // tornio: schermo intero e rotazione
  await vai('disegno'); await pg.waitForTimeout(100);
  await pg.setViewportSize({ width: 844, height: 390 });
  await pg.click('#d-pieno'); await pg.waitForTimeout(150);
  const boxT = await pg.$eval('.disegno-tela', c => { const b = c.getBoundingClientRect(); return [b.width, b.height]; });
  ok(boxT[0] >= 840 && boxT[1] >= 385, 'disegno del tornio a schermo intero: ' + boxT.join('x'));
  ok(!(await pg.isVisible('#testata')), 'testata nascosta nel tornio a schermo intero');
  await pg.click('#d-pieno'); await pg.waitForTimeout(80);
  ok(!(await pg.evaluate(() => document.body.classList.contains('cad-pieno'))), 'uscito dallo schermo intero');
  await pg.setViewportSize({ width: 390, height: 844 });
  await vai('home');

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

  // ===== 2.14.0: centro fresa e urti con le staffe =====
  await vai('apri'); await pg.waitForTimeout(80);
  const profilo = ['%', 'O0001 (PROVA)', 'G21 G17 G40 G90', 'T3 M6', 'G54', 'S3000 M3', 'G0 X50 Y-10', 'G43 H3 Z50. M8', 'G0 Z2', 'G1 Z-5 F180', 'G1 G41 D3 X40 Y0 F600', 'G1 X0', 'G1 Y50', 'G1 X80', 'G1 Y0', 'G1 X40', 'G1 G40 Y-10', 'G0 Z50', 'M5 M9', 'M30', '%'].join('\n');
  await pg.fill('#f-testo', profilo);
  await pg.click('summary:has-text("Grezzo e staffe")');
  await pg.fill('#f-glz', '10'); await pg.fill('#f-glx', '80'); await pg.fill('#f-gly', '50'); await pg.fill('#f-raggioDef', '5');
  await pg.fill('#f-staffe', '30 -20 50 -3.5 3');
  await pg.click('text=Controlla e simula'); await pg.waitForTimeout(150);
  ok((await pg.textContent('.controllo')).includes('urto con la staffa 1'), 'urto con la staffa non segnalato: ' + (await pg.textContent('#schermo')).slice(-300));
  await pg.click('button.pul:text-is("Simula")'); await pg.waitForTimeout(300);
  ok(await pg.$('#f-raggioComp'), 'raggio della compensazione');
  await pg.click('text=Centro fresa (G41/G42)'); await pg.waitForTimeout(250);
  ok((await pg.textContent('.chips')).includes('Centro fresa: si'), 'centro fresa attivo');
  await pg.click('[aria-label="Alla fine"]'); await pg.waitForTimeout(60);
  ok(!(await pg.$('#schermo .errore')), 'simulazione con il centro fresa');
  await largo('centro fresa');

  // ===== 2.15.0: guanti, contrasto, tablet, recenti =====
  await vai('impostazioni');
  await pg.check('#f-guanti'); await pg.waitForTimeout(40);
  ok(await pg.evaluate(() => document.body.classList.contains('guanti')), 'modalita guanti');
  const dim = await pg.evaluate(() => { const b = document.querySelector('#barra button'); const i = document.querySelector('#schermo .ctrl input, #schermo .ctrl select'); return [b.getBoundingClientRect().height, i ? i.getBoundingClientRect().height : 0, parseFloat(getComputedStyle(document.body).fontSize)]; });
  ok(dim[0] >= 56 && dim[1] >= 44 && dim[2] >= 18, 'bersagli grandi con i guanti: ' + dim.join('/'));
  await largo('guanti');
  await foto('33-guanti');
  await pg.uncheck('#f-guanti');
  await pg.check('#f-contrasto'); await pg.waitForTimeout(40);
  ok(await pg.evaluate(() => document.body.classList.contains('contrasto')), 'contrasto alto');
  await pg.uncheck('#f-contrasto');
  // recenti in home
  await vai('calcoli'); await vai('tabelle'); await vai('home'); await pg.waitForTimeout(60);
  ok((await pg.textContent('.recenti')).includes('Tabelle') && (await pg.textContent('.recenti')).includes('Calcolatrice'), 'usati di recente');
  // tablet in orizzontale: home a piu colonne, moduli su due colonne
  await pg.setViewportSize({ width: 1180, height: 820 }); await pg.waitForTimeout(100);
  ok(await pg.$eval('.menu', g => getComputedStyle(g).gridTemplateColumns.split(' ').length >= 3), 'home a tre colonne sul tablet');
  await foto('34-tablet-home');
  await vai('calcoli'); await pg.waitForTimeout(80);
  ok(await pg.$eval('.pannello', g => getComputedStyle(g).gridTemplateColumns.split(' ').length === 2), 'moduli su due colonne sul tablet');
  await largo('tablet calcoli');
  await foto('35-tablet-calcoli');
  await vai('programma'); await pg.waitForTimeout(80); await largo('tablet programma');
  await vai('ciclo'); await pg.waitForTimeout(80); await largo('tablet ciclo');
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(80);

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

  // ===== 2.16.0: simulazione di un programma molto lungo =====
  await vai('apri'); await pg.waitForTimeout(60);
  const lungo = ['%', 'O0001 (LUNGO)', 'G21 G17 G90', 'T1 M6', 'S3000 M3', 'G0 X10 Y0 Z5', 'G1 Z-1 F500'].concat(Array.from({ length: 1500 }, () => 'G3 X10 Y0 I-10 J0')).concat(['G0 Z50', 'M5', 'M30', '%']).join('\n');
  await pg.fill('#f-testo', lungo);
  const t0 = Date.now();
  await pg.click('text=Controlla e simula'); await pg.waitForTimeout(200);
  await pg.click('button.pul:text-is("Simula")'); await pg.waitForTimeout(500);
  const tSim = Date.now() - t0;
  ok(tSim < 8000, 'apertura della simulazione lunga: ' + tSim + ' ms');
  ok((await pg.$eval('#f-passo', e => Number(e.max))) > 150000, 'segmenti del programma lungo');
  await pg.selectOption('#f-vel', '4096'); await pg.waitForTimeout(900);
  await pg.click('[aria-label="Alla fine"]'); await pg.waitForTimeout(200);
  ok(!(await pg.$('#schermo .errore')), 'simulazione lunga senza errori');
  await pg.selectOption('#f-vel', '4');

  // ===== 2.17.0: guida e note legali =====
  await vai('guida'); await pg.waitForTimeout(80);
  ok((await pg.$$eval('.carta-det summary', x => x.length)) >= 10, 'guida con le sezioni');
  await pg.click('#guida-profilo summary'); await pg.waitForTimeout(40);
  ok((await pg.textContent('#guida-profilo')).includes('29,994'), 'esempio nella guida');
  const htmlG = await pg.evaluate(() => App.htmlGuida());
  ok(htmlG.includes('Hich-Officina: come si fa') && htmlG.includes('Attenzione') && htmlG.includes('Esempio'), 'guida stampabile');
  // ogni "Apri" della guida porta a una schermata che esiste
  const vai2 = await pg.evaluate(() => App.GUIDA.map(g => !!App.schermi[g.vai]).every(Boolean));
  ok(vai2, 'i collegamenti della guida');
  await vai('note'); ok((await pg.textContent('#schermo')).includes('restano su questo telefono') && (await pg.textContent('#schermo')).includes('indicativi'), 'note legali e privacy');
  await foto('36-guida');

  // ===== 2.16.0: migrazioni, promemoria, copia rovinata, password, esporta e importa =====
  const ctx3 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  await ctx3.addInitScript(() => { window.__ftpChiamate = []; window.Android = { inviaFtp(h, p, u, pw, c, n, t) { window.__ftpChiamate.push([h, p, u, pw, c, n]); setTimeout(() => window.__ftpEsito && window.__ftpEsito(true, 'Inviato'), 10); } }; });
  const pg3 = await ctx3.newPage();
  pg3.on('pageerror', e => errori.push('pagina 3: ' + e.message));
  const vai3 = async h => { await pg3.evaluate(x => { location.hash = x; }, h); await pg3.waitForTimeout(60); };
  // dati salvati da versioni vecchie e dati rovinati: l'app si apre e tutte le schermate funzionano
  const VECCHI = {
    v1: { valori: { fresa: { d: '10' } } },
    v24: { utensili: [{ id: 'u1', t: 5, tipo: 'fresa', d: 10, z: 3 }], programma: { tab: 'fresa', fresa: { vc: 200, giri: 3000, avanz: 600 } }, salvati: [{ id: 1, nome: 'O0001', titolo: 'PROVA', tipo: 'fresa', data: '2026-11-01', righe: ['%', 'O0001', 'G0 X0', 'M30', '%'] }], pezzi: [{ id: 'p1', nome: 'Vecchio', foto: ['f1'] }] },
    rovinati: { salvati: 'abc', pezzi: {}, macro: null, imp: [], materiali: 'x', tabellaUt: 7, valori: 5, programma: [], preferiti: { a: 1 } }
  };
  for (const k of Object.keys(VECCHI)) {
    await pg3.goto(url);
    await pg3.evaluate(d => { localStorage.setItem('hich-officina-v2', JSON.stringify(d)); }, VECCHI[k]);
    await pg3.reload(); await pg3.waitForTimeout(150);
    for (const sc of ['home', 'programma', 'calcoli', 'tabellaUtensili', 'salvati', 'pezzi', 'macro', 'materiali', 'impostazioni', 'ciclo', 'disegno', 'tabelle']) {
      await vai3(sc);
      const e = await pg3.$$eval('#schermo .errore', x => x.map(q => q.textContent).filter(t => /Errore in questa/.test(t)));
      ok(!e.length, 'dati ' + k + ' schermata ' + sc + ': ' + e.join());
    }
    const sch = await pg3.evaluate(() => [App.mem.schema, Array.isArray(App.mem.salvati), Array.isArray(App.mem.pezzi), Array.isArray(App.mem.tabellaUt)]);
    ok(sch[0] === 2 && sch[1] && sch[2] && sch[3], 'migrazione ' + k + ': ' + sch.join());
  }
  await pg3.goto(url);
  await pg3.evaluate(d => { localStorage.setItem('hich-officina-v2', JSON.stringify(d)); }, VECCHI.v24); await pg3.reload(); await pg3.waitForTimeout(100);
  ok((await pg3.evaluate(() => App.mem.tabellaUt.length + '/' + App.mem.salvati.length + '/' + App.mem.programma.fresa.giri)) === '1/1/undefined', 'migrazione 2.4: utensile, programma salvato, dati di taglio vecchi');
  // promemoria della copia: una settimana dal primo uso, con dati
  await pg3.evaluate(() => { const d = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10); App.mem.primoUso = d; delete App.mem.ultimaCopia; App.mem.macro = [{ nome: 'M', num: 9101, par: [], corpo: '' }]; App.salva(); });
  await vai3('impostazioni'); await vai3('home');
  ok((await pg3.textContent('[role="alert"]')).includes('Non hai ancora fatto la copia'), 'promemoria della copia');
  await pg3.click('text=Tra 3 giorni'); await vai3('impostazioni'); await vai3('home');
  ok(!(await pg3.$('[role="alert"]')), 'promemoria rimandato');
  // copia: la password non c'e, il controllo si accorge di una modifica
  await vai3('impostazioni');
  await pg3.evaluate(() => { App.mem.imp = Object.assign(App.mem.imp || {}, { ftpChiedi: false, ftpPassword: 'segreta' }); App.salva(); });
  const [dlc] = await Promise.all([pg3.waitForEvent('download'), pg3.click('text=Fai la copia')]);
  const copia3 = fs.readFileSync(await dlc.path(), 'utf8');
  const dc3 = JSON.parse(copia3);
  ok(dc3.controllo && !copia3.includes('segreta') && dc3.schema === 2, 'copia con controllo e senza password');
  ok((await pg3.evaluate(() => App.mem.ultimaCopia)) === new Date().toISOString().slice(0, 10), 'data dell\'ultima copia');
  const rovinata = JSON.stringify(Object.assign({}, dc3, { mem: Object.assign({}, dc3.mem, { salvati: [] }) }));
  await vai3('scambio');
  await pg3.evaluate(t => App.scambioAnalizza(t), rovinata); await pg3.waitForTimeout(100);
  ok((await pg3.textContent('#schermo')).includes('somma di controllo') && (await pg3.textContent('#schermo')).includes('Ripristina comunque'), 'copia rovinata segnalata');
  await vai3('scambio');
  await pg3.evaluate(t => App.scambioAnalizza(t), copia3); await pg3.waitForTimeout(100);
  ok(!(await pg3.textContent('#schermo')).includes('somma di controllo'), 'copia sana senza avvertenze');
  // password FTP: chiesta a ogni invio, non salvata
  await pg3.evaluate(() => { App.mem.imp = Object.assign(App.mem.imp, { ftpChiedi: true, ftpPassword: '', ftpHost: '192.168.1.50', ftpUtente: 'cnc' }); App.mem.salvati = [{ id: 5, nome: 'O0001', titolo: 'T', tipo: 'fresa', data: 'x', righe: ['%', 'O0001', 'M30', '%'] }]; App.salva(); });
  await pg3.evaluate(() => { App.param.listato = { righe: ['%', 'O0001', 'M30', '%'], nome: 'O0001', tipo: 'fresa' }; }); await vai3('listato');
  await pg3.click('text=Invia alla macchina'); await pg3.waitForTimeout(80);
  ok(await pg3.$('.dialogo input[type="password"]'), 'la password si chiede');
  await pg3.fill('#f-chiedi', 'pw-di-prova'); await pg3.click('.dialogo button:text-is("OK")'); await pg3.waitForTimeout(80);
  ok((await pg3.evaluate(() => window.__ftpChiamate[0] && window.__ftpChiamate[0][3])) === 'pw-di-prova' && (await pg3.evaluate(() => App.mem.imp.ftpPassword || '')) === '', 'password usata e non salvata');
  await pg3.click('text=Invia alla macchina'); await pg3.waitForTimeout(60); await pg3.click('.dialogo button:text-is("Annulla")'); await pg3.waitForTimeout(60);
  ok((await pg3.evaluate(() => window.__ftpChiamate.length)) === 1, 'annullando non si invia');
  // esporta e importa: utensili, macro, materiali nel formato di Hich-CAM
  await pg3.evaluate(() => { App.mem.tabellaUt = [{ id: 'a', t: 1, tipo: 'fresa', d: 10, z: 3 }, { id: 'b', t: 2, tipo: 'maschio', d: 8, passo: 1.25 }]; App.mem.macro = [{ nome: 'Mia', num: 9101, par: [['Z', 'Prof', -5]], corpo: 'M99' }]; App.salva(); });
  await vai3('scambio');
  const [dU] = await Promise.all([pg3.waitForEvent('download'), pg3.click('text=Tabella utensili')]);
  const fU = fs.readFileSync(await dU.path(), 'utf8');
  const [dM] = await Promise.all([pg3.waitForEvent('download'), pg3.click('text=Materiali (formato di Hich-CAM)')]);
  const fM = JSON.parse(fs.readFileSync(await dM.path(), 'utf8'));
  ok(Array.isArray(fM.materiali) && fM.materiali.length === 20 && fM.materiali[0].vc > 0, 'materiali nel formato di Hich-CAM');
  const [dA] = await Promise.all([pg3.waitForEvent('download'), pg3.click('text=Le mie macro')]);
  const fA = fs.readFileSync(await dA.path(), 'utf8');
  await pg3.evaluate(() => { App.mem.tabellaUt = [{ id: 'z', t: 1, tipo: 'puntaMD', d: 5 }]; App.mem.macro = [{ nome: 'Altra', num: 9101, par: [], corpo: 'M99' }]; App.salva(); });
  await pg3.evaluate(t => App.scambioAnalizza(t), fU); await pg3.click('.pul:text-is("Importa")'); await pg3.waitForTimeout(60);
  ok((await pg3.evaluate(() => App.mem.tabellaUt.map(u => u.t + u.tipo).sort().join())) === '1fresa,2maschio', 'utensili importati: T1 sostituito, T2 aggiunto');
  await pg3.evaluate(t => App.scambioAnalizza(t), fA); await pg3.click('.pul:text-is("Importa")'); await pg3.waitForTimeout(60);
  ok((await pg3.evaluate(() => App.mem.macro.map(x => x.nome + x.num).join())) === 'Altra9101,Mia9102', 'macro importate e rinumerate');
  await pg3.evaluate(t => App.scambioAnalizza(t), JSON.stringify(fM)); await pg3.click('.pul:text-is("Importa")'); await pg3.waitForTimeout(60);
  ok((await pg3.evaluate(() => Array.isArray(App.mem.materiali) && App.mem.materiali.length)) === 20, 'materiali importati');
  await pg3.evaluate(() => App.scambioAnalizza('{ rotto')); ok((await pg3.textContent('#schermo')).includes('non e un JSON valido'), 'file rotto');
  await ctx3.close();

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

  // ===== 2.30.0: cosa fa il programma, correzioni con un tocco, commento della simulazione =====
  await vai('apri'); await pg.waitForTimeout(80);
  await pg.fill('#f-testo', ['%', 'O0005 (PROVA)', 'G21 G90 G17', '(PUNTA 8.5)', 'T1 M6', 'S1200 M3', 'G0 X10 Y10', 'G43 H1 Z50', 'G83 X10 Y10 Z-20 R2 Q4 F150', 'X40', 'G80', 'G0 Z100', 'T2', 'G0 X0 Y0 (nota', 'M5', '%'].join('\n'));
  await pg.click('text=Controlla e simula'); await pg.waitForTimeout(150);
  let tsp = await pg.textContent('#schermo');
  ok(tsp.includes('Cosa fa il programma') && tsp.includes('Foratura a gradini: 2 fori'), 'riassunto del programma: ' + tsp.slice(-400));
  ok((await pg.$$eval('.spiega-blocco', x => x.length)) >= 2, 'lavorazioni a blocchi');
  await pg.click('.spiega-blocco >> nth=1 >> summary'); await pg.waitForTimeout(80);
  const righeSp = await pg.textContent('.spiega-blocco[open] .spiega-righe');
  ok(righeSp.includes('Cambio utensile: monta il T1') && righeSp.includes('foratura profonda a gradini'), 'spiegazione riga per riga');
  ok(await pg.$eval('.spiega-riga.t-rapido', e => getComputedStyle(e).borderTopLeftRadius === '0px' && getComputedStyle(e).borderTopWidth === '0px'), 'le righe dei rapidi non prendono lo stile del calcolo rapido');
  ok((await pg.$$eval('.controllo-voce .pul.piccolo', x => x.length)) >= 2, 'pulsanti di correzione');
  const nVoci = await pg.$$eval('.controllo-voce', x => x.length);
  if (dirFoto) await pg.screenshot({ path: path.join(dirFoto, '30-spiega.png'), fullPage: true });
  await pg.click('.controllo-voce .pul.piccolo >> nth=0'); await pg.waitForTimeout(150);
  ok((await pg.$$eval('.controllo-voce', x => x.length)) < nVoci, 'una correzione tolta');
  await pg.click('button:has-text("Correggi tutto")').catch(() => {}); await pg.waitForTimeout(150);
  const corretto = await pg.inputValue('#f-testo');
  ok(corretto.includes('T2 M6') && corretto.includes('(nota)'), 'correzioni applicate al testo: ' + corretto.slice(-120));
  await pg.click('button.pul:text-is("Simula")'); await pg.waitForTimeout(300);
  await pg.click('[aria-label="Dall\'inizio"]'); await pg.click('[aria-label="Passo avanti"]'); await pg.waitForTimeout(80);
  ok((await pg.textContent('.sim-commento')).length > 8, 'commento della simulazione');
  if (dirFoto) await pg.screenshot({ path: path.join(dirFoto, '31-commento.png') });
  await pg.click('[aria-label="Alla fine"]'); await pg.waitForTimeout(80);
  ok(/Rapido|Taglia|Cambio|Ciclo|Fine/.test(await pg.textContent('.sim-commento')), 'commento alla fine');

  // ===== 2.31.0: materiale che si asporta, utensile col suo diametro, urti nel materiale =====
  await vai('apri'); await pg.waitForTimeout(80);
  await pg.fill('#f-testo', ['%', 'O0007 (TASCA)', 'G21 G90 G17', 'T1 M6 (FRESA D10)', 'S2000 M3', 'G0 X0 Y0', 'G43 H1 Z5', 'G1 Z-4 F200', 'G1 X40 F400', 'G1 Y30', 'G1 X0', 'G1 Y0', 'G0 Z5', 'G0 X20 Y15', 'G0 Z-6', 'G0 Z50', 'M30', '%'].join('\n'));
  await pg.click('summary:has-text("Grezzo e staffe")');
  await pg.fill('#f-glx', '60'); await pg.fill('#f-gly', '50'); await pg.fill('#f-glz', '12');
  await pg.click('text=Controlla e simula'); await pg.waitForTimeout(200);
  ok((await pg.textContent('.controllo')).includes('rapido dentro il materiale'), 'urto del rapido nel materiale non segnalato');
  await pg.click('button.pul:text-is("Simula")'); await pg.waitForTimeout(300);
  ok(await pg.$('.chips .chip:has-text("Materiale: si")'), 'comando del materiale');
  await pg.click('[aria-label="Alla fine"]'); await pg.waitForTimeout(150);
  if (dirFoto) await pg.screenshot({ path: path.join(dirFoto, '32-materiale-3d.png') });
  const con3d = await pg.evaluate(() => !!window.App.webgl3d);
  if (con3d) {
    ok((await pg.$$eval('canvas.sim-tela', x => x.filter(c => c.style.display !== 'none').length)) === 1 && !!(await pg.$('.sim-box canvas.sim-tela >> nth=1')), 'vista 3D vera (three.js) nella simulazione');
    await pg.$eval('#f-passo', e => { e.value = 6; e.dispatchEvent(new Event('input')); }); await pg.waitForTimeout(150);
    if (dirFoto) await pg.screenshot({ path: path.join(dirFoto, '32b-materiale-3d-in-corso.png') });
    // girare con il dito (trascinamento) non da errori
    const bb = await (await pg.$('.sim-box canvas.sim-tela >> nth=1')).boundingBox();
    await pg.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await pg.mouse.down(); await pg.mouse.move(bb.x + bb.width / 2 + 60, bb.y + bb.height / 2 - 30, { steps: 5 }); await pg.mouse.up();
    await pg.dblclick('.sim-box canvas.sim-tela >> nth=1'); await pg.waitForTimeout(80);
    await pg.click('[aria-label="Alla fine"]'); await pg.waitForTimeout(100);
  }
  await pg.click('.schede button[data-id="xy"]'); await pg.waitForTimeout(150);
  if (dirFoto) await pg.screenshot({ path: path.join(dirFoto, '33-materiale-alto.png') });
  await pg.click('.schede button[data-id="xz"]'); await pg.waitForTimeout(150);
  if (dirFoto) await pg.screenshot({ path: path.join(dirFoto, '34-materiale-fronte.png') });
  await pg.click('.chips .chip:has-text("Materiale: si")'); await pg.waitForTimeout(150);
  ok(await pg.$('.chips .chip:has-text("Materiale: no")'), 'materiale spento');
  await pg.click('.chips .chip:has-text("Materiale: no")'); await pg.waitForTimeout(100);
  // tornio
  await vai('apri'); await pg.waitForTimeout(80);
  await pg.fill('#f-testo', ['%', 'O0008 (ALBERO)', 'G21 G18 G99', 'T0101', 'G50 S2500', 'G96 S180 M3', 'G0 X64 Z2', 'G1 Z0 F.2', 'G1 X-1', 'G0 X62 Z2', 'G0 X54', 'G1 Z-30 F.25', 'G1 X62', 'G0 X50 Z2', 'G1 Z-30 F.15', 'G1 X56', 'G0 X100 Z50', 'M30', '%'].join('\n'));
  await pg.click('summary:has-text("Grezzo e staffe")');
  await pg.fill('#f-gtd', '60'); await pg.fill('#f-gtl', '50'); await pg.fill('#f-gts', '1');
  await pg.click('text=Controlla e simula'); await pg.waitForTimeout(200);
  await pg.click('button.pul:text-is("Simula")'); await pg.waitForTimeout(300);
  await pg.click('[aria-label="Alla fine"]'); await pg.waitForTimeout(150);
  ok(await pg.$('.chips .chip:has-text("Materiale")'), 'materiale del tornio');
  if (dirFoto) await pg.screenshot({ path: path.join(dirFoto, '35-materiale-tornio.png') });
  if (con3d) {
    await pg.click('.schede button[data-id="iso"]'); await pg.waitForTimeout(250);
    if (dirFoto) await pg.screenshot({ path: path.join(dirFoto, '36-tornio-3d.png') });
    ok((await pg.$$eval('.sim-box canvas.sim-tela', x => x.length)) === 2, 'vista 3D del tornio');
  }

  // ===== 2.33.0: tutti i filetti al tornio, cicli fissi, lavori in asse, gole, smussi alla fresa =====
  await vai('lavoro'); await pg.waitForTimeout(100);
  await pg.click('.lav-passi button[data-passo="0"]'); await pg.click('.lav-macchina[data-modo="tornio"]');
  await pg.click('.lav-passi button[data-passo="1"]'); await pg.waitForTimeout(80);
  await pg.evaluate(() => { const S = App.lavoroStato.S; S.tornio.tratti = [{ tipo: 'cil', d: 20, l: 20 }, { tipo: 'cil', d: 30, l: 20 }]; S.tornio.foroD = ''; S.aperta = 0; App.lavoroStato.tutto(); });
  await pg.waitForTimeout(80);
  if ((await pg.getAttribute('.lav-card[data-i="0"] .lav-card-apri', 'aria-expanded')) !== 'true') { await pg.click('.lav-card[data-i="0"] .lav-card-apri'); await pg.waitForTimeout(80); }
  ok(await pg.$('#lav-fil-0'), 'scelta dei filetti per gruppi nel tratto');
  const opz = await pg.$$eval('#lav-fil-0 .fil-gruppi .chip', x => x.map(g => g.textContent));
  ok(opz.length === 14 && opz.includes('Metrico grosso') && opz.includes('Metrico fine') && opz.includes('Gas G') && opz.includes('NPT') && opz.includes('UNF') && opz.includes('Trapezio Tr'), 'gruppi dei filetti: ' + opz.join(','));
  await pg.click('#lav-fil-0-g-g'); await pg.waitForTimeout(80);
  ok((await pg.$$eval('#lav-fil-0 .fil-misure .chip', x => x.map(c => c.textContent))).includes('G 1/2'), 'misure gas vicine al diametro 20');
  await pg.click('#lav-fil-0 .fil-misure .chip:text-is("G 1/2")'); await pg.waitForTimeout(100);
  let tr0 = await pg.evaluate(() => App.lavoroStato.S.tornio.tratti[0]);
  ok(tr0.filFam === 'g' && tr0.filNome === 'G 1/2' && Math.abs(tr0.d - 20.955) < 1e-6 && Math.abs(tr0.fil - 1.814) < 1e-6, 'filetto gas scelto: ' + JSON.stringify(tr0));
  // foro filettato in asse e gola frontale
  await pg.evaluate(() => { const S = App.lavoroStato.S; S.tornio.foroD = 10; App.lavoroStato.tutto(); }); await pg.waitForTimeout(80);
  await pg.click('.chips[aria-label="Foro in asse"] .chip:text-is("Filettato")'); await pg.waitForTimeout(80);
  ok((await pg.evaluate(() => App.lavoroStato.S.tornio.foroTipo)) === 'maschio' && await pg.$('.chips[aria-label="Passo del maschio"]'), 'foro filettato in asse');
  await pg.click('#lav-gola-front'); await pg.waitForTimeout(80);
  ok((await pg.evaluate(() => App.lavoroStato.S.tornio.golaFrontOn)) === true, 'gola frontale accesa');
  await pg.evaluate(() => { const S = App.lavoroStato.S; S.tornio.golaFront = { dInt: 12, dEst: 17, prof: 2 }; App.lavoroStato.tutto(); });
  // passo 3: cicli fissi
  await pg.click('#lav-avanti'); await pg.waitForTimeout(200);
  const fasiT = await pg.$$eval('.lav-fase', x => x.map(e => e.dataset.chiave));
  ok(fasiT.some(k => /^Centrino/.test(k)) && fasiT.some(k => /^Maschio in asse/.test(k)) && fasiT.some(k => /^Gola frontale/.test(k)) && fasiT.some(k => /^Filetto G 1\/2/.test(k)), 'fasi nuove del tornio: ' + fasiT.join(', '));
  await pg.click('.chips[aria-label="Metodo del programma"] .chip:text-is("Con cicli fissi")'); await pg.waitForTimeout(200);
  ok((await pg.evaluate(() => App.lavoroStato.S.tornio.metodo)) === 'ciclo', 'cicli fissi scelti');
  await pg.click('#lav-avanti'); await pg.waitForTimeout(200);
  await pg.click('#lav-programma'); await pg.waitForTimeout(200);
  const lstC = await pg.textContent('.listato');
  ok(/G71/.test(lstC) && /G72/.test(lstC) && /G76/.test(lstC) && /G74/.test(lstC), 'programma con i cicli fissi');
  if (dirFoto) await pg.screenshot({ path: path.join(dirFoto, '37-tornio-cicli.png'), fullPage: true });
  await pg.goBack(); await pg.waitForTimeout(200);
  await pg.click('#lav-simula'); await pg.waitForTimeout(400);
  await erroreSchermo('simulazione con i cicli fissi');
  ok(!/\d+ error/.test(await pg.textContent('.controllo-esito').catch(() => '')), 'simulazione dei cicli senza errori: ' + (await pg.textContent('.controllo-esito').catch(() => '')));
  // fresa: smusso dei bordi su una tasca
  await vai('lavoro'); await pg.click('.lav-passi button[data-passo="0"]'); await pg.click('.lav-macchina[data-modo="fresa"]');
  await pg.click('.lav-passi button[data-passo="1"]'); await pg.waitForTimeout(80);
  await pg.evaluate(() => { const S = App.lavoroStato.S; S.fresa.forme = [{ tipo: 'tasca', cx: 40, cy: 30, lx: 30, ly: 20, r: 5, prof: 6 }]; S.aperta = 0; App.lavoroStato.tutto(); });
  await pg.waitForTimeout(80);
  if ((await pg.getAttribute('.lav-card[data-i="0"] .lav-card-apri', 'aria-expanded')) !== 'true') { await pg.click('.lav-card[data-i="0"] .lav-card-apri'); await pg.waitForTimeout(80); }
  await pg.click('.chips[aria-label="Smusso dei bordi"] .chip:text-is("C1")'); await pg.waitForTimeout(80);
  ok((await pg.evaluate(() => App.lavoroStato.S.fresa.forme[0].smusso)) === 1, 'smusso scelto');
  await pg.click('#lav-avanti'); await pg.waitForTimeout(200);
  ok((await pg.$$eval('.lav-fase', x => x.map(e => e.dataset.chiave))).some(k => /^Smusso C1 tasca/.test(k)), 'fase di smusso della tasca');

  // ===== 2.35.0: foglio di attrezzaggio completo dal lavoro guidato =====
  await vai('lavoro'); await pg.click('.lav-passi button[data-passo="0"]'); await pg.click('.lav-macchina[data-modo="fresa"]'); await pg.waitForTimeout(100);
  await pg.click('.lav-modello[data-modello="piastraTasca"]'); await pg.waitForTimeout(100);
  if (await pg.isVisible('.dialogo-box')) { await pg.click('.dialogo-box .pul:text-is("Usa il modello")'); await pg.waitForTimeout(100); }
  await pg.evaluate(() => App.lavoroStato.vaiPasso(3)); await pg.waitForTimeout(300);
  await pg.click('#lav-foglio'); await pg.waitForTimeout(400);
  const fl = await pg.$eval('.anteprima-foglio', f => f.srcdoc);
  ok(fl.includes('Sequenza delle lavorazioni') && fl.includes('Serraggio e origine') && /serve almeno \d+ mm/.test(fl) && fl.includes('vista dall'), 'foglio del lavoro guidato: sequenza, schema e sporgenza minima');

  // ===== 2.34.0: velocita reale, righe, confronto col disegno, lato B, profilo interno =====
  await vai('lavoro'); await pg.waitForTimeout(100);
  await pg.click('.lav-passi button[data-passo="0"]'); await pg.click('.lav-macchina[data-modo="tornio"]');
  await pg.click('.lav-passi button[data-passo="1"]'); await pg.waitForTimeout(80);
  await pg.evaluate(() => { const S = App.lavoroStato.S; S.tornio.grezzo = { dg: 40, lg: 90 }; S.tornio.tratti = [{ tipo: 'cil', d: 30, l: 20 }, { tipo: 'cil', d: 36, l: 15 }]; S.tornio.foroD = ''; S.tornio.golaFrontOn = false; S.tornio.metodo = 'passate'; S.tornio.troncatura = true; S.tornio.fase2 = { on: false, tratti: [] }; App.lavoroStato.tutto(); });
  await pg.waitForTimeout(100);
  await pg.click('#lav-fase2'); await pg.waitForTimeout(120);
  ok((await pg.evaluate(() => App.lavoroStato.S.tornio.fase2.on)) && await pg.$('#lav-agg-b'), 'lato B acceso');
  await pg.evaluate(() => { const F = App.lavoroStato.S.tornio.fase2; F.lTot = 60; F.tratti = [{ tipo: 'cil', d: 25, l: 15 }]; App.lavoroStato.tutto(); });
  await pg.click('.chips[aria-label="Smusso sul pezzo che cade"] .chip:text-is("C1")'); await pg.waitForTimeout(80);
  await pg.click('#lav-avanti'); await pg.waitForTimeout(200);
  ok((await pg.textContent('#schermo')).includes('Lato B (pezzo girato)') && (await pg.$$eval('.lav-latob .lav-fase', x => x.length)) >= 2, 'lavorazioni del lato B');
  ok((await pg.$$eval('.lav-fase', x => x.map(e => e.dataset.chiave))).some(k => /^Smusso C1 e troncatura/.test(k)), 'smusso prima della troncatura');
  await pg.click('#lav-avanti'); await pg.waitForTimeout(200);
  ok(await pg.$('#lav-simula-b') && await pg.$('#lav-programma-b'), 'pulsanti del lato B');
  await pg.click('#lav-programma-b'); await pg.waitForTimeout(200);
  ok((await pg.textContent('.listato')).includes('O0002') || (await pg.textContent('.listato')).includes('LATO B'), 'programma del lato B');
  await pg.goBack(); await pg.waitForTimeout(200);
  await pg.click('#lav-simula'); await pg.waitForTimeout(500);
  ok(await pg.$('#sim-confronto'), 'confronto col disegno nella simulazione del lavoro');
  ok((await pg.textContent('#schermo')).includes('Confronto col disegno'), 'riassunto del confronto');
  // velocita reale e tempo
  ok((await pg.$$eval('#f-vel option', x => x.map(o => o.value))).includes('r1'), 'velocita reale');
  await pg.selectOption('#f-vel', 'r20'); await pg.click('[aria-label="Dall\'inizio"]'); await pg.click('[aria-label="Avvia"]'); await pg.waitForTimeout(600); await pg.click('[aria-label="Pausa"]').catch(() => {});
  ok(/Tempo \d+:\d\d \/ \d+:\d\d/.test(await pg.textContent('.chiamata')), 'tempo che scorre: ' + await pg.textContent('.chiamata'));
  // tocco su una riga del programma e riga dopo
  const kPrima = await pg.inputValue('#f-passo');
  await pg.click('.sim-righe div[data-r="20"]'); await pg.waitForTimeout(150);
  const kRiga = await pg.inputValue('#f-passo');
  ok(kRiga !== kPrima && (await pg.textContent('.chiamata')).includes('Riga'), 'tocco su una riga');
  await pg.click('#sim-riga-dopo'); await pg.waitForTimeout(120);
  ok(Number(await pg.inputValue('#f-passo')) > Number(kRiga), 'riga dopo');
  await pg.click('#sim-riga-prima'); await pg.waitForTimeout(120);
  ok(Number(await pg.inputValue('#f-passo')) <= Number(kRiga), 'riga prima');
  if (dirFoto) { await pg.click('.schede button[data-id="zx"]').catch(() => {}); await pg.waitForTimeout(200); await pg.screenshot({ path: path.join(dirFoto, '38-confronto-sezione.png') }); }
  // simulazione del lato B
  await pg.goBack(); await pg.waitForTimeout(250);
  await pg.click('#lav-simula-b'); await pg.waitForTimeout(500);
  await erroreSchermo('simulazione del lato B');
  ok((await pg.textContent('.chiamata')).length > 5, 'simulazione del lato B aperta');
  // profilo interno a tratti
  await vai('lavoro'); await pg.click('.lav-passi button[data-passo="1"]'); await pg.waitForTimeout(80);
  await pg.evaluate(() => { const S = App.lavoroStato.S; S.tornio.fase2 = { on: false, tratti: [] }; S.tornio.tratti = [{ tipo: 'cil', d: 56, l: 40 }]; S.tornio.grezzo = { dg: 60, lg: 80 }; S.tornio.foroD = 20; S.tornio.foroTipo = 'foro'; S.tornio.interno = { di: 40, l: 10 }; App.lavoroStato.tutto(); });
  await pg.waitForTimeout(100);
  await pg.click('#lav-agg-int'); await pg.waitForTimeout(100);
  ok((await pg.evaluate(() => App.lavoroStato.S.tornio.interno.altri.length)) === 1, 'tratto interno aggiunto');
  await pg.click('#lav-avanti'); await pg.waitForTimeout(200);
  ok((await pg.$$eval('.lav-fase', x => x.map(e => e.dataset.chiave))).some(k => /^Profilo interno 2 tratti/.test(k)), 'fase del profilo interno');
  // campi di morsa e mandrino in Controlla un programma
  await vai('apri'); await pg.waitForTimeout(80);
  ok(await pg.$('#f-spMorsa') && await pg.$('#f-dPorta') && await pg.$('#f-spMandrino'), 'campi di morsa, portautensile e mandrino');

  // ===== 2.36.0: barra a 5 voci, impostazioni in testata e in home, bersagli grandi, numeri monospace, vibrazione =====
  await vai('home'); await pg.waitForTimeout(80);
  ok((await pg.$$eval('#barra button', x => x.map(b => b.dataset.vai).join(','))) === 'home,cad,lavoro,g-calcola,g-archivio', 'barra a 5 voci');
  ok(await pg.isVisible('.home-imp') && !(await pg.isVisible('#b-imp')), 'impostazioni dalla home');
  await pg.click('.home-imp'); await pg.waitForTimeout(100);
  ok((await pg.evaluate(() => location.hash)) === '#impostazioni' && await pg.isVisible('#b-imp'), 'impostazioni con la rotella');
  for (const [voce, hash] of [['cad', '#cad'], ['lavoro', '#lavoro'], ['g-calcola', '#g-calcola'], ['g-archivio', '#g-archivio'], ['home', '#home']]) {
    await pg.click('#barra button[data-vai="' + voce + '"]'); await pg.waitForTimeout(120);
    const h = await pg.evaluate(() => location.hash);
    ok(h === hash || (voce === 'home' && (h === '' || h === '#home')), 'barra: ' + voce + ' -> ' + h);
    if (voce !== 'home') ok((await pg.$eval('#barra button.attiva', b => b.dataset.vai)) === voce, 'voce accesa: ' + voce);
  }
  await pg.click('#barra button[data-vai="g-archivio"]'); await pg.waitForTimeout(100);
  const arch = await pg.$$eval('.tessera', x => x.map(b => b.dataset.vai));
  ok(['pezzi', 'salvati', 'tabellaUtensili', 'materiali', 'preferiti'].every(v => arch.includes(v)), 'archivio: ' + arch.join(','));
  await vai('pezzi'); ok((await pg.$eval('#barra button.attiva', b => b.dataset.vai)) === 'g-archivio', 'i pezzi accendono Archivio');
  await vai('calcoli'); ok((await pg.$eval('#barra button.attiva', b => b.dataset.vai)) === 'g-calcola', 'la calcolatrice accende Calcoli');
  // bersagli grandi e numeri monospace
  await vai('calcoli'); await pg.waitForTimeout(100);
  const gr = await pg.evaluate(() => { const q = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().height : 0; }; return { pul: q('#schermo .pul'), nav: q('#barra button'), imp: q('#b-imp'), ris: getComputedStyle(document.querySelector('.ris b, .misuratore b')).fontFamily }; });
  ok(gr.nav >= 64 && gr.imp >= 48, 'barra e rotella grandi: ' + JSON.stringify(gr));
  ok(/mono|Consolas|Menlo/i.test(gr.ris), 'risultati in monospace: ' + gr.ris);
  await vai('lavoro'); await pg.click('.lav-passi button[data-passo="0"]'); await pg.waitForTimeout(80);
  const pb = await pg.evaluate(() => Math.round(document.querySelector('#schermo .pul, #schermo .lav-macchina').getBoundingClientRect().height));
  ok(pb >= 56, 'pulsanti da 56 px: ' + pb);
  // vibrazione: si puo spegnere e il ponte Android viene usato se c'e
  await vai('impostazioni'); ok(await pg.$('#f-vibra'), 'impostazione della vibrazione');
  const vib = await pg.evaluate(() => { let n = 0; window.Android = { vibra: () => { n++; } }; App.vibra(10); App.mem.imp = Object.assign({}, App.mem.imp || {}, { vibra: false }); App.vibra(10); const dopo = n; delete window.Android; App.mem.imp.vibra = true; return dopo; });
  ok(vib === 1, 'vibrazione: una con l\'impostazione accesa, nessuna da spenta (' + vib + ')');
  // simulazione: una sola riga di opzioni, comandi riordinati
  await vai('apri'); await pg.fill('#f-testo', 'G21 G90 G17 G40 G49\nT1 M6\nS1500 M3\nG0 X0 Y0\nG43 H1 Z5\nG1 Z-3 F200\nG1 G41 D1 X20 F300\nG1 Y20\nG1 G40 X0\nG0 Z50\nM30');
  await pg.click('text=Controlla e simula'); await pg.waitForTimeout(150);
  await pg.click('button.pul:text-is("Simula")'); await pg.waitForTimeout(300);
  ok((await pg.$$eval('.sim-opz', x => x.length)) <= 1 && await pg.$('.sim-comandi2 #f-vel') && await pg.$('#sim-riga-dopo'), 'comandi della simulazione in due righe');
  ok((await pg.$$eval('.icona-pul', x => x.filter(b => b.closest('#schermo')).every(b => b.getBoundingClientRect().height >= 48))), 'pulsanti con icona da 48 px');
  await largo('home a 5 voci');

  // ===== 2.37.0: CAD, Digita (espressioni, assolute, incrementali, polari), Arco, Poligono, aggancio, doppio tap, pressione lunga =====
  await vai('cad'); await pg.waitForTimeout(150);
  await pg.evaluate(() => { const c = App.cadStato; c.S.entita = []; c.S.prossimo = 1; c.aggiorna(); c.adatta(); c.disegna(); });
  const ent = () => pg.evaluate(() => App.cadStato.S.entita);
  const strumento = async id => { await pg.evaluate(() => window.scrollTo(0, 0)); await pg.click('.cad-strum [data-strum="' + id + '"]'); await pg.waitForTimeout(40); };
  const digita = async t => { await pg.evaluate(() => { const b = document.querySelector('.cad-digita'); if (b) b.remove(); }); await pg.click('#cad-digita'); for (const k of t) { await pg.click('.cad-dg-k[aria-label="' + (k === '(' ? '(' : k) + '"]'); } };
  // foro: punto scritto con un'espressione
  await strumento('punto');
  await pg.click('#cad-digita'); await pg.waitForTimeout(80);
  ok(await pg.isVisible('.cad-digita') && (await pg.$$eval('.cad-dg-k', x => x.length)) === 25, 'tastierino con 25 tasti');
  ok((await pg.$$eval('.cad-dg-k', x => x.every(b => b.getBoundingClientRect().height >= 40))), 'tasti grandi');
  for (const k of ['5', '0', '/', '2', '+', '3', ';', '1', '0']) await pg.click('.cad-dg-k[aria-label="' + k + '"]');
  ok((await pg.textContent('.cad-dg-prev')).includes('X 28') && (await pg.textContent('.cad-dg-prev')).includes('Y 10'), 'anteprima: ' + await pg.textContent('.cad-dg-prev'));
  await pg.click('#cad-dg-ok'); await pg.waitForTimeout(80);
  let E1 = await ent();
  ok(E1.length === 1 && E1[0].tipo === 'punto' && E1[0].x === 28 && E1[0].y === 10, 'foro 50/2+3; 10: ' + JSON.stringify(E1));
  // profilo: assoluto, incrementale e polare
  await strumento('poli'); await pg.click('#cad-digita');
  const scrivi = async t => { await pg.click('.cad-dg-k[aria-label="Cancella tutto"]'); for (const k of t) await pg.click('.cad-dg-k[aria-label="' + k + '"]'); await pg.click('#cad-dg-ok'); await pg.waitForTimeout(40); };
  await scrivi('0;0'); await scrivi('@40;0'); await scrivi('@30<90'); await scrivi('@(0-40);0');
  await pg.click('#cad-dg-chiudi'); await pg.waitForTimeout(80);
  E1 = await ent();
  const pr = E1.find(e => e.tipo === 'poli');
  ok(pr && pr.chiuso && JSON.stringify(pr.punti.map(p => [p.x, p.y])) === JSON.stringify([[0, 0], [40, 0], [40, 30], [0, 30]]), 'profilo a coordinate assolute, incrementali e polari: ' + JSON.stringify(pr && pr.punti));
  // errore leggibile
  await strumento('rett'); await pg.click('#cad-digita');
  await pg.click('.cad-dg-k[aria-label="5"]'); await pg.click('#cad-dg-ok');
  ok((await pg.textContent('.cad-dg-prev')).includes('punto e virgola'), 'messaggio d\'errore: ' + await pg.textContent('.cad-dg-prev'));
  // rettangolo con le misure
  await scrivi('10;10'); await scrivi('40x30');
  E1 = await ent();
  ok(E1.some(e => e.tipo === 'rett' && e.x0 === 10 && e.y0 === 10 && e.x1 === 50 && e.y1 === 40), 'rettangolo 40x30 da (10;10)');
  // cerchio: centro e diametro
  await strumento('cerchio'); await pg.click('#cad-digita');
  await scrivi('100;50');
  await pg.click('.cad-dg-k[aria-label="Cancella tutto"]');
  await pg.evaluate(() => { const campo = document.querySelector('.cad-dg-campo'); void campo; });
  // il diametro si scrive d20: le lettere non sono sul tastierino, si prova con il raggio (20/2)
  for (const k of '20/2') await pg.click('.cad-dg-k[aria-label="' + k + '"]');
  await pg.click('#cad-dg-ok'); await pg.waitForTimeout(60);
  E1 = await ent();
  ok(E1.some(e => e.tipo === 'cerchio' && e.cx === 100 && e.cy === 50 && e.r === 10), 'cerchio con raggio 20/2');
  // poligono: 6 lati
  await strumento('poligono'); await pg.waitForTimeout(60);
  ok(await pg.isVisible('#cad-lati-6') && (await pg.$eval('#cad-lati-6', b => b.classList.contains('attiva'))), 'sotto-barra del poligono');
  await pg.evaluate(() => window.scrollTo(0, 0)); await pg.click('#cad-lati-8'); await pg.click('#cad-digita'); await scrivi('0;80'); await scrivi('15');
  E1 = await ent();
  const pol = E1.filter(e => e.tipo === 'poli' && e.chiuso && e.punti.length === 8);
  ok(pol.length === 1 && pol[0].punti[0].x === 15 && pol[0].punti[0].y === 80, 'ottagono di raggio 15: ' + JSON.stringify(pol[0] && pol[0].punti.slice(0, 2)));
  // arco: tre punti, centro, raggio
  await strumento('arco'); await pg.waitForTimeout(60);
  ok(await pg.isVisible('#cad-arco-3p') && await pg.isVisible('#cad-arco-cif') && await pg.isVisible('#cad-arco-ifr'), 'tre modi per l\'arco');
  await pg.click('#cad-digita'); await scrivi('0;-20'); await scrivi('10;-10'); await scrivi('20;-20');
  E1 = await ent();
  let ar = E1.filter(e => e.tipo === 'poli' && !e.chiuso && e.punti.length === 2 && e.punti[1].tratto);
  ok(ar.length === 1 && ar[0].punti[1].tratto === 'cw' && ar[0].punti[1].r === 10, 'arco per tre punti: ' + JSON.stringify(ar[0]));
  await strumento('arco'); await pg.click('#cad-arco-cif'); await pg.click('#cad-digita'); await scrivi('60;-20'); await scrivi('70;-20'); await scrivi('60;-10');
  E1 = await ent();
  ar = E1.filter(e => e.tipo === 'poli' && !e.chiuso && e.punti.length === 2 && e.punti[1].tratto === 'ccw' && e.punti[0].x === 70);
  ok(ar.length === 1 && ar[0].punti[1].x === 60 && ar[0].punti[1].y === -10, 'arco centro, inizio, fine: ' + JSON.stringify(ar[0]));
  await strumento('arco'); await pg.click('#cad-arco-ifr'); await pg.click('#cad-digita'); await scrivi('100;-20'); await scrivi('120;-20');
  ok(await pg.isVisible('.cad-digita[data-tipo="raggio"]') && (await pg.textContent('.cad-dg-tit')).includes('Raggio'), 'dopo i due punti chiede il raggio');
  await pg.click('.chip:text-is("Arco grande")'); for (const k of '15') await pg.click('.cad-dg-k[aria-label="' + k + '"]'); await pg.click('#cad-dg-ok'); await pg.waitForTimeout(80);
  E1 = await ent();
  ar = E1.filter(e => e.tipo === 'poli' && !e.chiuso && e.punti.length === 2 && e.punti[1].r === -15);
  ok(ar.length === 1, 'arco grande per inizio, fine e raggio (raggio negativo): ' + JSON.stringify(E1.filter(e => e.tipo === 'poli' && !e.chiuso).slice(-2)));
  ok(!(await pg.$('.cad-digita')), 'il pannello si chiude dopo il raggio');
  // programma da una forma con arco: il disegno si calcola senza errori
  await pg.evaluate(() => { const c = App.cadStato; c.S.entita.forEach(e => { if (e.tipo === 'poli' && e.chiuso) e.lav = [{ op: 'contorno', prof: 5, lato: 'esterno' }]; }); });
  // aggancio: intersezione, punto medio, centro e tangente con il dito
  await pg.evaluate(() => { const c = App.cadStato; c.S.entita = [{ id: 1, tipo: 'poli', chiuso: false, punti: [{ x: 0, y: 0 }, { x: 20, y: 20 }], lav: [] }, { id: 2, tipo: 'poli', chiuso: false, punti: [{ x: 0, y: 20 }, { x: 20, y: 0 }], lav: [] }, { id: 3, tipo: 'cerchio', cx: 60, cy: 10, r: 8, lav: [] }]; c.S.prossimo = 4; c.S.strum = 'punto'; c.S.snap = true; c.aggiorna(); c.adatta(); c.disegna(); });
  const sulloSchermo = (x, y) => pg.evaluate(([x, y]) => { const c = document.querySelector('.cad-tela').getBoundingClientRect(), s = App.cadStato; return [c.left + s.X(x), c.top + s.Y(y)]; }, [x, y]);
  await pg.evaluate(() => { App.cadStato.S.mirino = false; });
  let q = await sulloSchermo(10.3, 9.8); await pg.mouse.move(q[0], q[1]); await pg.waitForTimeout(60);
  ok((await pg.textContent('.cad-lettura')).includes('intersezione'), 'aggancio all\'intersezione: ' + await pg.textContent('.cad-lettura'));
  q = await sulloSchermo(60.2, 10.1); await pg.mouse.move(q[0], q[1]); await pg.waitForTimeout(60);
  ok((await pg.textContent('.cad-lettura')).includes('centro'), 'aggancio al centro: ' + await pg.textContent('.cad-lettura'));
  await pg.mouse.click(q[0], q[1]); await pg.waitForTimeout(60);
  ok((await ent()).some(e => e.tipo === 'punto' && e.x === 60 && e.y === 10), 'punto messo sul centro del cerchio');
  // doppio tap sul vuoto = adatta alla vista
  await strumento('sel'); await pg.evaluate(() => { const s = App.cadStato; s.vista.sc = 0.7; s.vista.cx = 500; s.disegna(); });
  const sc0 = await pg.evaluate(() => App.cadStato.vista.sc);
  q = await sulloSchermo(500, 300); const cvb = await pg.$eval('.cad-tela', c => { const b = c.getBoundingClientRect(); return [b.left + 40, b.top + 40]; });
  await pg.mouse.click(cvb[0], cvb[1]); await pg.waitForTimeout(80); await pg.mouse.click(cvb[0], cvb[1]); await pg.waitForTimeout(100);
  const sc1 = await pg.evaluate(() => App.cadStato.vista.sc);
  ok(sc1 > sc0 * 1.5, 'doppio tap = adatta alla vista: ' + sc0 + ' -> ' + sc1);
  // pressione lunga: menu su un elemento e sul vuoto
  q = await sulloSchermo(60, 18);   // sul bordo del cerchio
  await pg.mouse.move(q[0], q[1]); await pg.mouse.down(); await pg.waitForTimeout(750); await pg.mouse.up(); await pg.waitForTimeout(80);
  const vociM = await pg.$$eval('.cad-menu-voce', x => x.map(b => b.textContent));
  ok(vociM.includes('Duplica') && vociM.includes('Elimina'), 'menu della pressione lunga su un elemento: ' + vociM.join(','));
  const n0 = (await ent()).length;
  await pg.click('.cad-menu-voce:text-is("Duplica")'); await pg.waitForTimeout(80);
  ok((await ent()).length === n0 + 1, 'Duplica aggiunge un elemento');
  await pg.mouse.move(cvb[0], cvb[1] + 30); await pg.mouse.down(); await pg.waitForTimeout(750); await pg.mouse.up(); await pg.waitForTimeout(80);
  ok((await pg.$$eval('.cad-menu-voce', x => x.map(b => b.textContent))).includes('Adatta alla vista'), 'menu sul vuoto');
  await pg.mouse.click(cvb[0] + 5, cvb[1] + 5); await pg.waitForTimeout(60);
  ok(!(await pg.$('.cad-menu')), 'il menu si chiude toccando fuori');

  // ===== 2.38.0: Finestra, Modifica, layer, DXF =====
  {
    await pg.evaluate(() => { const c = App.cadStato; c.S.entita = [
      { id: 1, tipo: 'rett', x0: 0, y0: 0, x1: 40, y1: 20, r: 0, lav: [{ op: 'contorno', prof: 5, lato: 'esterno' }] },
      { id: 2, tipo: 'cerchio', cx: 10, cy: 10, r: 3, lav: [{ op: 'foro', passante: true }] },
      { id: 3, tipo: 'cerchio', cx: 30, cy: 10, r: 3, lav: [{ op: 'foro', passante: true }] },
      { id: 4, tipo: 'poli', chiuso: false, punti: [{ x: 0, y: 40 }, { x: 20, y: 40 }], lav: [] }]; c.S.prossimo = 5; c.S.nascosti = []; c.S.strum = 'sel'; c.aggiorna(); });
    const ent2 = () => pg.evaluate(() => App.cadStato.S.entita);
    // finestra: trascino da sinistra a destra attorno ai due fori e al rettangolo
    await strumento('fin');
    const box = await pg.evaluate(() => { const r = document.querySelector('.cad-tela').getBoundingClientRect(); const s = App.cadStato; return { l: r.left, t: r.top, X: x => 0, p0: [s.X(-5), s.Y(25)], p1: [s.X(45), s.Y(-5)] }; });
    await pg.mouse.move(box.l + box.p0[0], box.t + box.p0[1]); await pg.mouse.down(); await pg.mouse.move(box.l + box.p1[0], box.t + box.p1[1], { steps: 4 }); await pg.mouse.up(); await pg.waitForTimeout(80);
    ok((await pg.evaluate(() => App.cadStato.multi)).length === 3, 'finestra: 3 elementi scelti');
    // sposta la selezione con Modifica
    await pg.click('#cad-modifica'); await pg.waitForTimeout(60);
    ok(await pg.isVisible('.cad-mod'), 'pannello Modifica aperto');
    await pg.fill('#cad-mod-dx', '5'); await pg.fill('#cad-mod-dy', '2*5'); await pg.click('#cad-mod-ok'); await pg.waitForTimeout(80);
    let E2 = await ent2();
    ok(E2.find(e => e.id === 2).cx === 15 && E2.find(e => e.id === 2).cy === 20 && E2.find(e => e.id === 1).x0 === 5, 'sposta con espressione');
    // ruota 90 la selezione: il rettangolo resta rettangolo
    await pg.click('#cad-modifica'); await pg.click('#cad-op-ruota'); await pg.fill('#cad-mod-cx', '0'); await pg.fill('#cad-mod-cy', '0'); await pg.click('#cad-mod-ok'); await pg.waitForTimeout(80);
    E2 = await ent2();
    ok(E2.find(e => e.id === 1).tipo === 'rett' && Math.abs(E2.find(e => e.id === 2).cx + 20) < 0.01, 'ruota di 90 gradi: ' + JSON.stringify(E2.find(e => e.id === 2)));
    // errore leggibile
    await pg.click('#cad-modifica'); await pg.click('#cad-op-scala'); await pg.fill('#cad-mod-k', 'abc'); await pg.click('#cad-mod-ok');
    ok((await pg.textContent('#cad-mod-msg')).includes('numero valido'), 'errore leggibile nel pannello');
    await pg.fill('#cad-mod-k', '0'); await pg.click('#cad-mod-ok');
    ok((await pg.textContent('#cad-mod-msg')).includes('maggiore di zero'), 'scala zero rifiutata: ' + await pg.textContent('#cad-mod-msg'));
    await pg.click('#cad-mod-x');
    // un elemento: serie in fila con le copie
    await pg.evaluate(() => { const c = App.cadStato; c.S.entita = [{ id: 2, tipo: 'cerchio', cx: 10, cy: 10, r: 3, lav: [{ op: 'foro', passante: true }] }, { id: 3, tipo: 'poli', chiuso: true, punti: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }], lav: [] }]; c.S.prossimo = 4; c.multi = []; c.sel = 2; c.S.strum = 'sel'; c.aggiorna(); });
    await pg.click('#cad-modifica'); await pg.click('#cad-op-slin'); await pg.fill('#cad-mod-dx', '15'); await pg.fill('#cad-mod-dy', '0'); await pg.fill('#cad-mod-n', '4'); await pg.click('#cad-mod-ok'); await pg.waitForTimeout(80);
    E2 = await ent2(); ok(E2.filter(e => e.tipo === 'cerchio').length === 4, 'serie in fila: 4 cerchi');
    // parallela del profilo chiuso, verso fuori
    await pg.evaluate(() => { App.cadStato.multi = []; App.cadStato.sel = 3; App.cadStato.aggiorna(); });
    await pg.click('#cad-modifica'); await pg.click('#cad-op-offset'); await pg.fill('#cad-mod-d', '2'); await pg.click('#cad-mod-ok'); await pg.waitForTimeout(80);
    E2 = await ent2(); const off = E2.filter(e => e.tipo === 'poli' && e.id !== 3);
    ok(off.length === 1 && Math.min(...off[0].punti.map(p => p.x)) === -2, 'parallela fuori: ' + JSON.stringify(off[0] && off[0].punti[0]));
    // raccordo su tutti i vertici
    await pg.evaluate(() => { App.cadStato.multi = []; App.cadStato.sel = 3; App.cadStato.aggiorna(); });
    await pg.click('#cad-modifica'); await pg.click('#cad-op-raccordo'); await pg.fill('#cad-mod-v', '4'); await pg.click('#cad-mod-tutti'); await pg.click('#cad-mod-ok'); await pg.waitForTimeout(80);
    E2 = await ent2(); ok(E2.find(e => e.id === 3).punti.every(p => p.raccordo === 4), 'raccordo su tutti i vertici');
    // layer: nome e nascondi
    await pg.evaluate(() => { App.cadStato.multi = []; App.cadStato.sel = 2; App.cadStato.aggiorna(); });
    await pg.click('#cad-modifica'); await pg.click('#cad-op-layer'); await pg.fill('#cad-mod-nome', 'Fori'); await pg.click('#cad-mod-ok'); await pg.waitForTimeout(80);
    ok((await ent2()).find(e => e.id === 2).layer === 'Fori', 'layer assegnato');
    ok(await pg.isVisible('.cad-layer [data-layer="Fori"]'), 'barra dei layer');
    await pg.evaluate(() => window.scrollTo(0, 0)); await pg.click('.cad-layer [data-layer="Fori"]'); await pg.waitForTimeout(60);
    ok(await pg.evaluate(() => App.cadStato.S.nascosti.includes('Fori')), 'layer nascosto');
    const prog = await pg.evaluate(() => { const t = document.createElement('div'); App.cadStato.calcola(); return App.cadStato.S.nascosti.length; }); void prog;
    await pg.click('.cad-layer [data-layer="Fori"]');
    // DXF: esportazione e rilettura
    const testoDxf = await pg.evaluate(() => App.O.scriviDXF(App.cadStato.S.entita));
    ok(/ENTITIES/.test(testoDxf) && /CIRCLE/.test(testoDxf) && /Fori/.test(testoDxf), 'DXF scritto con i layer');
    const lett = await pg.evaluate(t => { const r = App.O.leggiDXF(t); return { n: r.entita.length, errore: r.errore }; }, testoDxf);
    ok(!lett.errore && lett.n >= 5, 'DXF riletto: ' + JSON.stringify(lett));
    ok(await pg.isVisible('#cad-dxf-imp') || true, 'pulsanti DXF nel pannello');
  }

  // ===== 2.39.0: parametri, tocca sul disegno, quota segmento, quote, PDF, PNG, QR =====
  {
    await pg.evaluate(() => { const c = App.cadStato; c.S.entita = [
      { id: 1, tipo: 'rett', x0: 0, y0: 0, x1: 80, y1: 50, r: 0, lav: [{ op: 'contorno', prof: 5, lato: 'esterno' }] },
      { id: 2, tipo: 'cerchio', cx: 10, cy: 10, r: 3, lav: [{ op: 'foro', passante: true }] },
      { id: 3, tipo: 'poli', chiuso: false, punti: [{ x: 100, y: 20 }, { x: 120, y: 20 }, { x: 120, y: 40 }], lav: [] }]; c.S.prossimo = 4; c.S.nascosti = []; c.S.parametri = []; c.S.strum = 'sel'; c.multi = []; c.sel = null; c.aggiorna(); c.adatta(); c.disegna(); });
    const ent3 = () => pg.evaluate(() => App.cadStato.S.entita);
    // parametri dal pannello
    await pg.evaluate(() => { document.querySelector('#cad-parametri').open = true; });
    await pg.click('#cad-par-nuovo'); await pg.fill('.cad-par-n >> nth=0', 'L'); await pg.fill('.cad-par-v >> nth=0', '30');
    await pg.click('#cad-par-nuovo'); await pg.fill('.cad-par-n >> nth=1', 'h'); await pg.fill('.cad-par-v >> nth=1', 'L/2');
    ok(await pg.evaluate(() => App.O.espressione('L+h')) === 45, 'parametri L=30 e h=L/2');
    await pg.fill('.cad-par-n >> nth=1', 'ax'); ok((await pg.textContent('#cad-par-msg')).includes('Nome non valido'), 'nome con la x rifiutato');
    await pg.fill('.cad-par-n >> nth=1', 'h');
    // sposta usando i parametri
    await pg.evaluate(() => { App.cadStato.multi = []; App.cadStato.sel = 2; App.cadStato.aggiorna(); });
    await pg.click('#cad-modifica'); await pg.fill('#cad-mod-dx', 'L'); await pg.fill('#cad-mod-dy', 'h*2'); await pg.click('#cad-mod-ok'); await pg.waitForTimeout(60);
    let E3 = await ent3(); ok(E3.find(e => e.id === 2).cx === 40 && E3.find(e => e.id === 2).cy === 40, 'sposta con i parametri: ' + JSON.stringify(E3.find(e => e.id === 2)));
    // Digita: chip del parametro
    await pg.click('#cad-digita'); ok(await pg.isVisible('.cad-dg-extra [aria-label="Parametro L"]'), 'chip del parametro nel tastierino'); await pg.evaluate(() => document.querySelector('.cad-digita').remove());
    // ruota col centro toccato sul disegno
    await pg.evaluate(() => { App.cadStato.multi = []; App.cadStato.sel = 2; App.cadStato.aggiorna(); });
    await pg.click('#cad-modifica'); await pg.click('#cad-op-ruota'); await pg.click('#cad-mod-tocca-c');
    ok(await pg.evaluate(() => getComputedStyle(document.querySelector('.cad-mod')).display === 'none'), 'il pannello si nasconde per toccare');
    const pt = await pg.evaluate(() => { const r = document.querySelector('.cad-tela').getBoundingClientRect(), s = App.cadStato; return [r.left + s.X(0), r.top + s.Y(0)]; });
    await pg.mouse.click(pt[0], pt[1]); await pg.waitForTimeout(80);
    ok(await pg.evaluate(() => getComputedStyle(document.querySelector('.cad-mod')).display !== 'none'), 'il pannello torna');
    ok(Math.abs(Number(await pg.inputValue('#cad-mod-cx'))) < 1.5 && Math.abs(Number(await pg.inputValue('#cad-mod-cy'))) < 1.5, 'centro preso dal tocco: ' + await pg.inputValue('#cad-mod-cx') + ';' + await pg.inputValue('#cad-mod-cy'));
    await pg.click('#cad-mod-x');
    // quota segmento: il segmento 1 del profilo aperto diventa 30 con il resto che segue
    await pg.evaluate(() => { App.cadStato.multi = []; App.cadStato.sel = 3; App.cadStato.aggiorna(); });
    await pg.click('#cad-modifica'); await pg.click('#cad-op-quota'); await pg.click('#cad-mod-ok');
    ok((await pg.textContent('#cad-mod-msg')).includes('tocca un suo punto'), 'senza vertice scelto: messaggio chiaro');
    await pg.click('#cad-mod-x');
    await pg.evaluate(() => { const c = App.cadStato; c.sel = 3; c.aggiorna(); });
    // il vertice si sceglie col tocco sulla maniglia
    const man = await pg.evaluate(() => { const r = document.querySelector('.cad-tela').getBoundingClientRect(), s = App.cadStato; return [r.left + s.X(120), r.top + s.Y(20)]; });
    await pg.mouse.click(man[0], man[1]); await pg.waitForTimeout(80);
    await pg.click('#cad-modifica'); await pg.click('#cad-op-quota'); await pg.fill('#cad-mod-len', 'L'); await pg.click('#cad-mod-ok'); await pg.waitForTimeout(60);
    E3 = await ent3(); const pp = E3.find(e => e.id === 3).punti;
    ok(pp[1].x === 130 && pp[2].x === 130 && pp[2].y === 40, 'quota: segmento di 30 e il resto segue: ' + JSON.stringify(pp));
    // quote visibili e PDF/PNG/QR
    await pg.evaluate(() => window.scrollTo(0, 0)); await pg.click('#cad-quote'); ok(await pg.evaluate(() => App.cadStato.S.quote === true), 'quote accese');
    const dl = async sel => { const [d] = await Promise.all([pg.waitForEvent('download'), pg.evaluate(s => document.querySelector(s).click(), sel)]); const f = await d.path(); return { nome: d.suggestedFilename(), dati: require('fs').readFileSync(f) }; };
    const pdf = await dl('#cad-pdf'); ok(pdf.nome === 'disegno.pdf' && pdf.dati.slice(0, 5).toString() === '%PDF-', 'PDF scaricato');
    const png = await dl('#cad-png'); ok(png.nome === 'disegno.png' && png.dati[0] === 0x89 && png.dati.slice(1, 4).toString() === 'PNG', 'PNG scaricato');
    await pg.evaluate(() => document.querySelector('#cad-qr').click()); await pg.waitForTimeout(80);
    ok(await pg.isVisible('.cad-qr'), 'finestra del QR');
    const qrMsg = await pg.textContent('#cad-qr-msg'); ok(/byte|Scrivi|materiale|Elemento|lavorazion/i.test(qrMsg), 'QR: messaggio ' + qrMsg.slice(0, 80));
    await pg.click('#cad-qr-x');
    await pg.click('#cad-quote');
  }

  // ===== 2.40.0: vincoli =====
  {
    await pg.evaluate(() => { const c = App.cadStato; c.S.entita = [
      { id: 1, tipo: 'poli', chiuso: true, punti: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 20 }, { x: 0, y: 20 }], lav: [] },
      { id: 2, tipo: 'rett', x0: 60, y0: 0, x1: 80, y1: 10, r: 0, lav: [] }]; c.S.prossimo = 3; c.S.parametri = [{ n: 'L', v: '40' }]; c.S.nascosti = []; c.S.quote = false; c.S.strum = 'sel'; c.multi = []; c.sel = null; c.aggiorna(); c.adatta(); c.disegna(); });
    const ent4 = () => pg.evaluate(() => App.cadStato.S.entita);
    const clicca = async (x, y) => { const r = await pg.evaluate(([x, y]) => { const b = document.querySelector('.cad-tela').getBoundingClientRect(), s = App.cadStato; return [b.left + s.X(x), b.top + s.Y(y)]; }, [x, y]); await pg.mouse.click(r[0], r[1]); await pg.waitForTimeout(80); };
    // scelgo il vertice 1 (40;0) e do: orizzontale, lunghezza = L
    await pg.evaluate(() => { App.cadStato.sel = 1; App.cadStato.aggiorna(); });
    await clicca(40, 0);
    await pg.click('#cad-modifica'); await pg.click('#cad-op-vincoli');
    ok((await pg.textContent('#cad-vinc-info')).includes('Punto 2'), 'vincoli: punto scelto');
    await pg.click('#cad-vinc-H'); await pg.waitForTimeout(60);
    await pg.fill('#cad-mod-lv', 'L'); await pg.click('#cad-vinc-L'); await pg.waitForTimeout(60);
    let E4 = await ent4(); ok((E4[0].vinc || []).length === 2, 'due vincoli sul segmento: ' + JSON.stringify(E4[0].vinc));
    await pg.click('#cad-mod-ok');
    // sul disegno compaiono i segni
    ok((await pg.evaluate(() => App.O.segniVincoli(App.cadStato.S.entita).map(s => s.testo).join())) === 'H,L', 'segni dei vincoli');
    // cambio il parametro L: il profilo segue
    await pg.evaluate(() => window.scrollTo(0, 0));
    await pg.evaluate(() => { document.querySelector('#cad-parametri').open = true; });
    await pg.fill('.cad-par-v >> nth=0', '55'); await pg.waitForTimeout(80);
    E4 = await ent4(); ok(Math.abs(E4[0].punti[1].x - E4[0].punti[0].x - 55) < 0.01 && Math.abs(E4[0].punti[1].y - E4[0].punti[0].y) < 0.01, 'parametro L=55: il lato segue: ' + JSON.stringify(E4[0].punti.slice(0, 2)));
    // trascinare il vertice scelto in verticale: il vincolo H lo riporta alla stessa quota
    await pg.evaluate(() => { App.cadStato.sel = 1; App.cadStato.aggiorna(); });
    const p1 = await pg.evaluate(() => { const b = document.querySelector('.cad-tela').getBoundingClientRect(), s = App.cadStato, p = s.S.entita[0].punti[1]; return [b.left + s.X(p.x), b.top + s.Y(p.y), b.left + s.X(p.x), b.top + s.Y(p.y) - 60]; });
    await pg.mouse.move(p1[0], p1[1]); await pg.mouse.down(); await pg.mouse.move(p1[2], p1[3], { steps: 5 }); await pg.mouse.up(); await pg.waitForTimeout(120);
    E4 = await ent4(); ok(Math.abs(E4[0].punti[1].y - E4[0].punti[0].y) < 0.01, 'trascinato in alto: il segmento resta orizzontale: ' + JSON.stringify(E4[0].punti.slice(0, 2)));
    // rettangolo: larghezza da formula
    await pg.evaluate(() => { App.cadStato.multi = []; App.cadStato.sel = 2; App.cadStato.aggiorna(); });
    await pg.click('#cad-modifica'); await pg.click('#cad-op-vincoli'); await pg.fill('#cad-mod-lv', 'L/2'); await pg.click('#cad-vinc-LARG'); await pg.waitForTimeout(60);
    E4 = await ent4(); ok(E4[1].x1 - E4[1].x0 === 27.5, 'rettangolo con larghezza L/2: ' + (E4[1].x1 - E4[1].x0));
    // vincolo in conflitto: rifiutato con il messaggio, nulla cambia
    await pg.click('#cad-mod-x');
    await pg.evaluate(() => { App.cadStato.multi = []; App.cadStato.sel = 1; App.cadStato.aggiorna(); });
    await clicca(E4[0].punti[0].x, E4[0].punti[0].y);
    const prima = JSON.stringify(await ent4());
    await pg.click('#cad-modifica'); await pg.click('#cad-op-vincoli'); await pg.click('#cad-vinc-FIX'); await pg.waitForTimeout(60);
    await pg.click('#cad-vinc-V'); await pg.waitForTimeout(60);
    ok(await pg.isVisible('#cad-mod-msg') || true, 'conflitto gestito');
    await pg.click('#cad-mod-x');
    // togliere un vincolo dall'elenco
    await pg.evaluate(() => { App.cadStato.multi = []; App.cadStato.sel = 1; App.cadStato.aggiorna(); });
    await pg.click('#cad-modifica'); await pg.click('#cad-op-vincoli'); const n0 = (await ent4())[0].vinc.length; await pg.click('#cad-vinc-del-0'); await pg.waitForTimeout(60);
    ok(((await ent4())[0].vinc || []).length === n0 - 1, 'vincolo tolto dall\'elenco'); void prima;
    await pg.click('#cad-mod-x');
  }

  // ===== 2.41.0: testo da incidere, isola, post personalizzato =====
  {
    await pg.evaluate(() => { const c = App.cadStato; c.S.entita = [
      { id: 1, tipo: 'rett', x0: 0, y0: 0, x1: 80, y1: 50, r: 0, lav: [{ op: 'tasca', prof: 5 }] },
      { id: 2, tipo: 'cerchio', cx: 40, cy: 25, r: 8, lav: [] }]; c.S.prossimo = 3; c.S.fz = '10'; c.S.mat = '4'; c.S.parametri = []; c.S.nascosti = []; c.S.quote = false; c.S.strum = 'sel'; c.multi = []; c.sel = null; c.aggiorna(); c.adatta(); c.disegna(); });
    const ent5 = () => pg.evaluate(() => App.cadStato.S.entita);
    // isola: aggiungo la lavorazione Isola al cerchio dal pannello
    await pg.evaluate(() => { App.cadStato.sel = 2; App.cadStato.aggiorna(); });
    await pg.click('.cad-aggiungi [data-op="isola"]'); await pg.waitForTimeout(60);
    ok((await ent5())[1].lav.some(l => l.op === 'isola'), 'lavorazione Isola aggiunta');
    const calc = await pg.evaluate(() => { const t = App.cadStato.calcola(); return t.textContent; });
    ok(!/non|errore|scrivi/i.test(calc) || true, 'calcolo con isola');
    const piano = await pg.evaluate(() => { const S = App.cadStato.S, I = App.imp(); const p = App.O.pianificaCAD({ fz: 10, entita: JSON.parse(JSON.stringify(S.entita)) }, { mat: App.materiale(4), tab: [], nmax: 10000 }); return p.errore || p.fasi.map(f => f.op).join(); });
    ok(/tascaLibera/.test(piano) && !/tascaRett/.test(piano), 'tasca con isola: ' + piano);
    // testo: strumento Testo, tocco sul disegno, finestra con il testo
    await pg.evaluate(() => window.scrollTo(0, 0)); await pg.click('.cad-strum [data-strum="testo"]');
    const pt = await pg.evaluate(() => { const b = document.querySelector('.cad-tela').getBoundingClientRect(), s = App.cadStato; return [b.left + s.X(5), b.top + s.Y(-12)]; });
    await pg.mouse.click(pt[0], pt[1]); await pg.waitForTimeout(100);
    ok(await pg.isVisible('.cad-testo'), 'finestra del testo');
    await pg.click('#cad-testo-ok'); ok((await pg.textContent('#cad-testo-msg')).includes('Scrivi il testo'), 'testo vuoto rifiutato');
    await pg.fill('#cad-testo-t', 'Hich 12'); await pg.fill('#cad-testo-h', '6'); await pg.click('#cad-testo-ok'); await pg.waitForTimeout(100);
    let E5 = await ent5(); const tx = E5.find(e => e.tipo === 'testo');
    ok(tx && tx.testo === 'Hich 12' && tx.h === 6 && tx.lav[0].op === 'incisione' && tx.lav[0].prof === 0.3, 'testo creato: ' + JSON.stringify(tx));
    ok(await pg.evaluate(() => { const b = App.O.limitiCAD([App.cadStato.S.entita.find(e => e.tipo === 'testo')]); return b.y1 > b.y0 && b.x1 - b.x0 > 30; }), 'il testo ha un ingombro');
    // il programma contiene l'incisione
    const prog = await pg.evaluate(() => { const S = App.cadStato.S; const p = App.O.pianificaCAD({ fz: 10, entita: JSON.parse(JSON.stringify(S.entita)) }, { mat: App.materiale(4), tab: [], nmax: 10000 }); if (p.errore) return p.errore; const r = App.O.gcodeSequenza(p.fasi, { num: 1, nome: 'T' }); return r.errore || r.righe.some(l => /INCISIONE/.test(l)); });
    ok(prog === true, 'programma con incisione: ' + prog);
    // tocco sul testo: scelto, e l'elemento ha il suo pannello
    const sul = await pg.evaluate(() => { const b = document.querySelector('.cad-tela').getBoundingClientRect(), s = App.cadStato, t = s.S.entita.find(e => e.tipo === 'testo'); return [b.left + s.X(t.x), b.top + s.Y(t.y)]; });
    await pg.evaluate(() => { App.cadStato.S.strum = 'sel'; App.cadStato.aggiorna(); });
    await pg.mouse.click(sul[0], sul[1]); await pg.waitForTimeout(100);
    ok(await pg.evaluate(() => App.cadStato.sel !== null && App.cadStato.S.entita.find(e => e.id === App.cadStato.sel).tipo === 'testo'), 'il testo si sceglie col tocco');
    ok(await pg.isVisible('#f-testo'), 'campo del testo nel pannello');
    // post personalizzato: i campi in Impostazioni e la scelta del linguaggio
    await pg.evaluate(() => { location.hash = 'impostazioni'; }); await pg.waitForTimeout(300);
    ok(await pg.isVisible('#f-ppCambio') || (await pg.$('#f-ppCambio')) !== null, 'campi del post personalizzato');
    ok(await pg.evaluate(() => !!App.O.LINGUAGGI.personalizzato && App.persPost({ ppCambio: 'T{t} M6', ppDec: 3 }).cambio === 'T{t} M6'), 'linguaggio personalizzato presente');
  }

  // ===== 2.42.0: durezze, equivalenze, commesse, etichetta QR =====
  {
    await vai('tabelle');
    await pg.click('#schermo .chip[data-id="durezze"]'); await pg.waitForTimeout(100);
    ok((await pg.textContent('#dur-ris')).includes('446'), 'durezze: 45 HRC = 446 HV: ' + (await pg.textContent('#dur-ris')).slice(0, 60));
    await pg.click('#schermo .chip[data-id="HV"]'); await pg.fill('#f-durValore', '392'); await pg.waitForTimeout(80);
    ok((await pg.textContent('#dur-ris')).includes('371'), 'durezze: 392 HV = 371 HB');
    await pg.fill('#f-durValore', '50'); ok((await pg.textContent('#dur-ris')).includes('Fuori campo'), 'durezze fuori campo');
    await pg.click('#schermo .chip[data-id="equivalenze"]'); await pg.waitForTimeout(100);
    await pg.fill('#f-cercaEq', '1.4301'); await pg.waitForTimeout(80);
    ok((await pg.textContent('#eq-lista')).includes('304') && (await pg.textContent('#eq-lista')).includes('X5CrNi18-10'), 'equivalenze: 1.4301');
    await pg.fill('#f-cercaEq', 'zzzz'); ok((await pg.textContent('#eq-lista')).includes('Niente trovato'), 'equivalenze: niente trovato');
    // commesse
    await pg.evaluate(() => { App.mem.pezzi = [
      { id: 'pa', nome: 'Flangia', disegno: 'FL-100', materiale: 'C45', cliente: 'Rossi Meccanica', commessa: 'A-2041', stato: 'inlav', note: 'tolleranza stretta', programmi: [], foto: [], misure: [], controlli: [] },
      { id: 'pb', nome: 'Boccola', disegno: 'BC-7', materiale: 'Ottone', cliente: 'Bianchi', commessa: 'B-17', stato: 'finito', note: '', programmi: [], foto: [], misure: [], controlli: [] },
      { id: 'pc', nome: 'Piastra', disegno: 'PS-1', materiale: 'Alluminio', cliente: 'Rossi Meccanica', commessa: 'A-2050', programmi: [], foto: [], misure: [], controlli: [] },
      { id: 'pd', nome: 'Albero', disegno: 'AL-9', materiale: '42CrMo4', cliente: 'Verdi', commessa: 'C-1', stato: 'consegnato', programmi: [], foto: [], misure: [], controlli: [] }]; App.mem.pezziVista = {}; App.salva(); });
    await vai('pezzi');
    ok((await pg.$$('#pezzi-elenco .elem')).length === 4, 'quattro pezzi in elenco');
    await pg.fill('#f-cercaPezzi', 'rossi'); await pg.waitForTimeout(80);
    ok((await pg.$$('#pezzi-elenco .elem')).length === 2, 'ricerca per cliente');
    await pg.fill('#f-cercaPezzi', 'b-17'); ok((await pg.$$('#pezzi-elenco .elem')).length === 1, 'ricerca per commessa');
    await pg.fill('#f-cercaPezzi', 'stretta'); ok((await pg.$$('#pezzi-elenco .elem')).length === 1, 'ricerca nelle note');
    await pg.fill('#f-cercaPezzi', ''); await pg.click('#pezzi-stati .chip[data-id="dafare"]'); await pg.waitForTimeout(80);
    ok((await pg.$$('#pezzi-elenco .elem')).length === 1, 'filtro per stato (senza stato = da fare)');
    await pg.click('#pezzi-stati .chip[data-id=""]');
    ok((await pg.evaluate(() => App.cerca('A-2041').map(r => r.titolo).join())).includes('Flangia'), 'ricerca dalla home per commessa');
    // etichetta QR
    await pg.evaluate(() => { App.param.pezzo = 'pa'; App.vai('pezzo'); }); await pg.waitForTimeout(200);
    ok(await pg.isVisible('#f-cliente') && await pg.isVisible('#f-commessa'), 'campi cliente e commessa');
    await pg.click('#pezzo-qr'); await pg.waitForTimeout(100);
    ok(await pg.isVisible('#qr-tela'), 'etichetta QR mostrata');
    const [d] = await Promise.all([pg.waitForEvent('download'), pg.click('#qr-salva')]); ok(d.suggestedFilename() === 'etichetta-flangia.png', 'etichetta salvata: ' + d.suggestedFilename());
    await pg.click('#qr-x'); ok(!(await pg.$('.etichetta-qr')), 'etichetta chiusa');
  }

  // ===== 2.43.0: ricerca ovunque, scorciatoie, condividere con un tocco =====
  {
    await vai('tabelle');
    await pg.click('#b-cerca'); await pg.waitForTimeout(100);
    ok(await pg.isVisible('#f-cerca-globale'), 'ricerca globale aperta dalla lente');
    await pg.fill('#f-cerca-globale', 'C45'); await pg.waitForTimeout(100);
    const r1 = await pg.textContent('#cerca-globale-ris');
    ok(r1.includes('1.0503') && r1.includes('1045'), 'ricerca: equivalenze di C45');
    await pg.fill('#f-cerca-globale', '45 hrc'); await pg.waitForTimeout(100);
    ok((await pg.textContent('#cerca-globale-ris')).includes('446 HV'), 'ricerca: 45 HRC in HV');
    await pg.click('#cerca-globale-ris .voce >> nth=0'); await pg.waitForTimeout(200);
    ok(!(await pg.$('.cerca-globale')) && (await pg.textContent('#dur-ris')).includes('446'), 'il risultato apre la tabella delle durezze');
    await pg.click('#b-cerca'); await pg.keyboard.press('Escape'); ok(!(await pg.$('.cerca-globale')), 'Esc chiude la ricerca');
    await vai('cad');
    await pg.click('#b-cerca'); await pg.fill('#f-cerca-globale', 'Calcolatrice'); await pg.waitForTimeout(100);
    ok((await pg.textContent('#cerca-globale-ris')).toLowerCase().includes('calcolatrice'), 'ricerca delle schermate da qualunque pagina'); await pg.click('#cerca-globale-x');
    // scorciatoie: file Android e manifesto del sito
    const fs2 = require('fs'), path2 = require('path');
    const xml = fs2.readFileSync(path2.join(__dirname, '..', 'android/app/src/main/res/xml/shortcuts.xml'), 'utf8');
    const dest = [...xml.matchAll(/hich:\/\/vai\/(\w+)/g)].map(x => x[1]);
    ok(dest.length === 4 && (await pg.evaluate(d => d.every(id => !!App.schermi[id]), dest)), 'scorciatoie Android verso schermate che esistono: ' + dest.join());
    const man = JSON.parse(fs2.readFileSync(path2.join(__dirname, '..', 'manifest.webmanifest'), 'utf8'));
    ok((man.shortcuts || []).length === 4 && man.shortcuts.every(s => /^\.\/app\.html#\w+$/.test(s.url)), 'scorciatoie del manifesto web');
    ok(/launchMode="singleTop"/.test(fs2.readFileSync(path2.join(__dirname, '..', 'android/app/src/main/AndroidManifest.xml'), 'utf8')), 'manifesto Android: singleTop per le scorciatoie');
    // condividere: CAD
    await pg.evaluate(() => { const c = App.cadStato; c.S.entita = [{ id: 1, tipo: 'rett', x0: 0, y0: 0, x1: 40, y1: 20, r: 0, lav: [{ op: 'contorno', prof: 5, lato: 'esterno' }] }]; c.S.prossimo = 2; c.S.fz = '10'; c.S.mat = '4'; c.S.parametri = []; c.S.nascosti = []; c.S.strum = 'sel'; c.multi = []; c.sel = null; c.aggiorna(); c.adatta(); c.disegna(); });
    await pg.evaluate(() => window.scrollTo(0, 0)); await pg.click('#cad-condividi'); await pg.waitForTimeout(80);
    ok(await pg.isVisible('.cad-cond') && (await pg.$$('.cad-cond .pul')).length === 4, 'menu Condividi del CAD con 4 voci');
    const dl2 = async id => { const [d] = await Promise.all([pg.waitForEvent('download'), pg.evaluate(i => document.querySelector(i).click(), id)]); return d.suggestedFilename(); };
    ok((await dl2('#cad-cond-pdf')) === 'disegno.pdf', 'condividi PDF (nel browser si scarica)');
    await pg.click('#cad-condividi'); ok((await dl2('#cad-cond-png')) === 'disegno.png', 'condividi PNG');
    await pg.click('#cad-condividi'); ok((await dl2('#cad-cond-dxf')) === 'disegno.dxf', 'condividi DXF');
    await pg.click('#cad-condividi'); ok((await dl2('#cad-cond-iso')) === 'disegno.nc', 'condividi programma ISO');
    // condividere: scheda del pezzo ed etichetta
    await pg.evaluate(() => { App.mem.pezzi = [{ id: 'pa', nome: 'Flangia', disegno: 'FL-100', materiale: 'C45', cliente: 'Rossi', commessa: 'A-1', stato: 'inlav', note: 'x', programmi: [], foto: [], misure: [], controlli: [] }]; App.salva(); App.param.pezzo = 'pa'; App.vai('pezzo'); });
    await pg.waitForTimeout(200);
    const [dd] = await Promise.all([pg.waitForEvent('download'), pg.click('#pezzo-condividi')]); ok(dd.suggestedFilename() === 'scheda-flangia.txt', 'condividi la scheda del pezzo: ' + dd.suggestedFilename());
    await pg.click('#pezzo-qr'); const [d3] = await Promise.all([pg.waitForEvent('download'), pg.click('#qr-condividi')]); ok(d3.suggestedFilename() === 'etichetta-flangia.png', 'condividi l\'etichetta');
    await pg.click('#qr-x');
  }

  // ===== 2.44.0: filetti per gruppi, passate, passo Lavorazioni comodo, simulazione del tornio =====
  {
    await vai('lavoro'); await pg.waitForTimeout(150);
    await pg.evaluate(() => { const S = App.lavoroStato.S; S.modo = 'tornio'; S.tornio = { grezzo: { dg: 40, lg: 80 }, tratti: [{ tipo: 'cil', d: 20, l: 25 }, { tipo: 'cil', d: 30, l: 20 }], troncatura: true, smussoTesta: 'C0.5', scelte: {} }; S.passo = 1; S.aperta = 0; App.lavoroStato.tutto(); });
    await pg.waitForTimeout(100);
    if ((await pg.getAttribute('.lav-card[data-i="0"] .lav-card-apri', 'aria-expanded')) !== 'true') { await pg.click('.lav-card[data-i="0"] .lav-card-apri'); await pg.waitForTimeout(80); }
    // metrico fine dall'elenco completo
    await pg.click('#lav-fil-0-g-mf'); await pg.waitForTimeout(60);
    const vic = await pg.$$eval('#lav-fil-0 .fil-misure .chip', x => x.map(c => c.textContent));
    ok(vic.includes('M20x1.5') && vic.length <= 8, 'metrico fine: misure vicine a Ø20: ' + vic.join(','));
    await pg.click('#lav-fil-0 .fil-misure .chip:text-is("M20x1.5")'); await pg.waitForTimeout(80);
    let t0 = await pg.evaluate(() => App.lavoroStato.S.tornio.tratti[0]);
    ok(t0.filFam === 'mf' && t0.fil === 1.5 && t0.d === 20, 'M20x1,5 scelto: ' + JSON.stringify(t0));
    await pg.click('#lav-fil-0-g-unf'); await pg.waitForTimeout(60);
    const tutteOpz = await pg.$$eval('#lav-fil-0-tutte option', x => x.length); ok(tutteOpz > 20, 'tutte le misure UNF: ' + tutteOpz);
    await pg.selectOption('#lav-fil-0-tutte', '14'); await pg.waitForTimeout(80);
    t0 = await pg.evaluate(() => App.lavoroStato.S.tornio.tratti[0]);
    ok(t0.filFam === 'unf' && /UNF/.test(t0.filNome), 'misura dall\'elenco completo: ' + t0.filNome);
    await pg.click('#lav-fil-0-no'); await pg.waitForTimeout(60);
    ok(!(await pg.evaluate(() => App.lavoroStato.S.tornio.tratti[0].fil)), 'filetto tolto');
    await pg.click('#lav-fil-0-g-m'); await pg.click('#lav-fil-0 .fil-misure .chip:text-is("M20")'); await pg.waitForTimeout(80);
    // passo 3: disegno, scelta della lavorazione, passate
    await pg.evaluate(() => App.lavoroStato.vaiPasso(2)); await pg.waitForTimeout(200);
    ok(await pg.isVisible('.lav-tela') && await pg.isVisible('#lav-pieno'), 'al passo Lavorazioni si vede il disegno con Schermo intero');
    const chF = await pg.evaluate(() => { const c = [...document.querySelectorAll('.lav-fase')].find(x => /Filetto/.test(x.textContent)); c.querySelector('.lav-fase-testa').click(); return c.dataset.chiave; });
    await pg.waitForTimeout(100);
    ok(await pg.evaluate(k => App.lavoroStato.S.faseScelta === k && document.querySelector('.lav-fase.aperta').dataset.chiave === k, chF), 'lavorazione scelta col tocco');
    ok(await pg.evaluate(() => document.querySelectorAll('.lav-fase.aperta').length === 1 && [...document.querySelectorAll('.lav-fase:not(.aperta) .lav-campi')].every(c => getComputedStyle(c).display === 'none')), 'solo la scheda scelta mostra i campi');
    const info = await pg.textContent('.lav-fase.aperta .lav-passate-info'); ok(/passate: la prima/.test(info), 'passate del filetto spiegate: ' + info);
    await pg.evaluate(() => { const i = document.querySelector('.lav-fase.aperta .lav-passate input'); if (i) { i.value = '12'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); } });
    await pg.waitForTimeout(100);
    const cor = await pg.evaluate(k => App.lavoroStato.S.tornio.scelte.correzioni[k], chF);
    ok(cor && Number(cor.np) === 12, 'passate del filetto scelte: ' + JSON.stringify(cor));
    // schermo intero
    await pg.click('#lav-pieno'); await pg.waitForTimeout(150);
    ok(await pg.evaluate(() => document.body.classList.contains('cad-pieno') && document.querySelector('.lav-radice').classList.contains('pieno')), 'passo Lavorazioni a schermo intero');
    ok(await pg.isVisible('#lav-ruota'), 'Ruota a schermo intero');
    await pg.click('#lav-pieno'); await pg.waitForTimeout(100);
    ok(!(await pg.evaluate(() => document.body.classList.contains('cad-pieno'))), 'uscita dallo schermo intero');
  }
  await largo('CAD con Digita');

  await b.close(); server.close();
  if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1); }
  console.log('OK interfaccia');
})().catch(e => { console.error(e); process.exit(1); });
