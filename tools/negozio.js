// Schermate per la scheda del negozio (1080x1920) e immagine di presentazione (1024x500) in docs/store.
// Si lancia con: node tools/negozio.js   (serve il browser di prova di Playwright, gia installato)
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const radice = path.join(__dirname, '..'), uscita = process.argv[2] || path.join(radice, 'docs', 'store');
const tipi = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => {
  const f = path.join(radice, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!f.startsWith(radice) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': tipi[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
});

const FRESA = ['%', 'O0101 (PIASTRA CON TASCA)', 'G21 G90 G17 G40 G49', 'T1 M6 (FRESA D10)', 'S3000 M3', 'G0 X20 Y20', 'G43 H1 Z5', 'G1 Z-3 F250',
  'G1 X60 F500', 'G1 Y40', 'G1 X20', 'G1 Y20', 'G1 X28 Y28', 'G1 X52', 'G1 Y32', 'G1 X28', 'G1 Y28', 'G0 Z2', 'G0 X20 Y20', 'G1 Z-6 F250',
  'G1 X60 F500', 'G1 Y40', 'G1 X20', 'G1 Y20', 'G1 X28 Y28', 'G1 X52', 'G1 Y32', 'G1 X28', 'G1 Y28', 'G0 Z50', 'M5',
  'T2 M6 (PUNTA D8.5)', 'S1200 M3', 'G43 H2 Z50', 'G98 G83 X8 Y8 Z-12 R2 Q4 F120', 'X72', 'Y52', 'X8', 'G80', 'G0 Z100', 'M5', 'M30', '%'].join('\n');
const ALBERO = ['%', 'O0102 (ALBERO)', 'G21 G18 G99', 'T0101', 'G50 S2500', 'G96 S200 M3', 'G0 X62 Z2', 'G1 Z0 F.2', 'G1 X-1',
  'G0 X56 Z2', 'G1 Z-45 F.25', 'G1 X60', 'G0 Z2', 'G0 X52', 'G1 Z-45', 'G1 X56', 'G0 Z2', 'G0 X48', 'G1 Z-30', 'G1 X52', 'G0 Z2', 'G0 X47', 'G1 Z-30', 'G1 X51', 'G0 Z2',
  'G0 X40 Z2', 'G1 X44 Z0 F.1', 'G1 X45 Z-.5', 'G1 Z-30', 'G1 X50', 'G1 Z-45', 'G1 X60', 'G0 X100 Z50', 'M30', '%'].join('\n');
const DIFETTI = ['%', 'O0103 (PIASTRA)', 'G21 G90 G17', '(PUNTA 8.5)', 'T1 M6', 'S1200 M3', 'G0 X10 Y10', 'G43 H1 Z50', 'G83 X10 Y10 Z-12 R2 Q4 F150', 'X40', 'G0 Z100', 'T2', 'G0 X0 Y0', 'M5', '%'].join('\n');

(async () => {
  await new Promise(ok => server.listen(0, ok));
  const url = 'http://127.0.0.1:' + server.address().port + '/app.html';
  fs.mkdirSync(uscita, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage();
  const errori = [];
  pg.on('pageerror', e => errori.push(e.message));
  const vai = async h => { await pg.evaluate(x => { location.hash = x; }, h); await pg.waitForTimeout(250); await pg.evaluate(() => window.scrollTo(0, 0)); };
  const foto = async nome => { await pg.waitForTimeout(250); await pg.evaluate(() => document.querySelectorAll('.sim-hint').forEach(e => { e.style.display = 'none'; })); await pg.screenshot({ path: path.join(uscita, nome + '.png') }); console.log('fatto', nome); };
  const apri = async (testo, campi) => {
    await vai('apri');
    await pg.fill('#f-testo', testo);
    if (campi) { await pg.click('summary:has-text("Grezzo e staffe")'); for (const [id, v] of Object.entries(campi)) await pg.fill('#f-' + id, v); }
    await pg.click('text=Controlla e simula'); await pg.waitForTimeout(300);
  };
  const simula = async () => { await pg.click('button.pul:text-is("Simula")'); await pg.waitForTimeout(400); await pg.click('[aria-label="Alla fine"]'); await pg.waitForTimeout(400); };

  await pg.goto(url); await pg.waitForTimeout(400);
  await pg.evaluate(() => { const m = JSON.parse(localStorage.getItem('hich-officina-v2') || '{}'); m.benvenuto = true; localStorage.setItem('hich-officina-v2', JSON.stringify(m)); });
  await pg.reload(); await pg.waitForTimeout(400);

  await vai('home'); await foto('1-home');

  await apri(FRESA, { glx: '80', gly: '60', glz: '15' }); await simula();
  await pg.$eval('#f-passo', e => { e.value = Math.round(e.max * 0.93); e.dispatchEvent(new Event('input')); }); await pg.waitForTimeout(300);
  await foto('2-simulazione-3d-fresa');

  await apri(ALBERO, { gtd: '60', gtl: '70', gts: '1' }); await simula();
  await pg.click('.schede button[data-id="iso"]'); await pg.waitForTimeout(500);
  await foto('3-simulazione-3d-tornio');

  await vai('apri');
  await pg.fill('#f-testo', DIFETTI);
  await pg.click('summary:has-text("Grezzo e staffe")');
  for (const id of ['glx', 'gly', 'glz', 'gtd', 'gtl', 'gts']) await pg.fill('#f-' + id, '');
  await pg.click('text=Controlla e simula'); await pg.waitForTimeout(300);
  await pg.$eval('.controllo-esito', e => e.scrollIntoView({ block: 'start' })); await pg.evaluate(() => window.scrollBy(0, -70));
  await foto('4-controllo-correzioni');
  await pg.click('button:has-text("Correggi tutto")'); await pg.waitForTimeout(400);
  await pg.click('.spiega-blocco >> nth=1 >> summary'); await pg.waitForTimeout(150);
  await pg.$eval('.spiega-blocco[open]', e => e.scrollIntoView({ block: 'start' })); await pg.evaluate(() => window.scrollBy(0, -80));
  await foto('5-spiegazione-programma');

  await vai('cad');
  await pg.evaluate(() => { const c = App.cadStato; c.S.entita = [
    { id: 1, tipo: 'rett', x0: 0, y0: 0, x1: 80, y1: 50, r: 5, lav: [{ op: 'contorno', prof: 12, lato: 'esterno' }] },
    { id: 2, tipo: 'cerchio', cx: 15, cy: 25, r: 4.25, lav: [{ op: 'foro', passante: true }] },
    { id: 3, tipo: 'poli', chiuso: true, punti: [{ x: 30, y: 10 }, { x: 55, y: 10 }, { x: 55, y: 25 }, { x: 42, y: 40 }, { x: 30, y: 25 }], lav: [{ op: 'tasca', prof: 5 }] }]; c.S.prossimo = 4; c.S.fz = '15'; c.aggiorna(); });
  await pg.click('#cad-percorso'); await pg.waitForTimeout(300);
  await pg.evaluate(() => window.scrollTo(0, 0));
  await foto('6-cad-fresa');

  await vai('tolleranze'); await pg.selectOption('#f-acc', 'H7/p6').catch(() => {}); await foto('7-tolleranze');
  await vai('tabelle'); await pg.click('#schermo .chips.fam .chip[data-id="g"]'); await foto('8-filetti');

  await ctx.close();
  // ----- immagine di presentazione 1024x500 -----
  const img = f => 'data:image/png;base64,' + fs.readFileSync(path.resolve(uscita, f)).toString('base64');
  const icona = 'data:image/png;base64,' + fs.readFileSync(path.join(radice, 'icone', 'icona-192.png')).toString('base64');
  const html = `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;width:1024px;height:500px;overflow:hidden;font-family:Inter,Roboto,Arial,sans-serif;color:#e8eef8;background:radial-gradient(ellipse at 80% 40%,#1c4aa8 0%,#0f2554 45%,#08122a 100%);position:relative}
  .t{position:absolute;left:56px;top:70px;width:520px}.t img{width:96px;height:96px;border-radius:22px;display:block}
  h1{font-size:62px;margin:34px 0 8px;letter-spacing:-1px;color:#fff}.s{font-size:27px;line-height:1.3;color:#b9cdf0}.p{margin-top:26px;font-size:17px;color:#8fb0e6}
  .tel{position:absolute;width:262px;height:470px;border-radius:30px;border:7px solid #0a1020;overflow:hidden;background:#000;box-shadow:0 18px 40px rgba(0,0,0,.5)}
  .tel img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
  .a{left:548px;top:36px;transform:rotate(-4deg)}.c{left:790px;top:84px;transform:rotate(4deg)}</style>
  <div class="t"><img src="${icona}"><h1>Hich-Officina</h1><div class="s">Dal disegno al programma CNC,<br>con simulazione 3D.</div><div class="p">Fresa e tornio · Senza account · Funziona senza rete</div></div>
  <div class="tel a"><img src="${img('2-simulazione-3d-fresa.png')}"></div><div class="tel c"><img src="${img('3-simulazione-3d-tornio.png')}"></div>`;
  const p2 = await b.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  await p2.setContent(html); await p2.waitForTimeout(300);
  await p2.screenshot({ path: path.join(uscita, 'presentazione-1024x500.png') });
  console.log('fatto presentazione');
  await b.close(); server.close();
  if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
