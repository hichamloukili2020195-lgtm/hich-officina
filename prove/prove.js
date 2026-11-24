// Prove dei calcoli: node prove/prove.js
'use strict';
const assert = require('assert');
const O = require('../programmi.js');   // carica anche calcoli.js
require('../profilo.js');
require('../filetti.js');
require('../cad.js');
require('../lavoro.js');
require('../ciclo.js');
require('../disegno_foto.js');
require('../iso.js'); require('../spiega.js');
require('../post.js');
require('../ciclo.js');
let n = 0;
const prova = (nome, f) => { try { f(); n++; } catch (e) { console.error('FALLITA: ' + nome + '\n' + e.message); process.exitCode = 1; } };
const vicino = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, a + ' invece di ' + b);

prova('numero con la virgola', () => { vicino(O.num('2,5'), 2.5); assert.ok(isNaN(O.num(''))); });
prova('giri', () => { vicino(O.giri(100, 10), 3183.0989, 1e-3); vicino(O.vcDaGiri(3183.0989, 10), 100, 1e-4); });
prova('fresatura', () => { const r = O.fresatura({ d: 10, z: 3, vc: 100, fz: .05 }); vicino(r.vf, r.n * .15); });
prova('tornitura con limite giri', () => {
  const r = O.tornitura({ d: 10, vc: 200, f: .2, nmax: 3000, r: .8 });
  assert.strictEqual(r.n, 3000); assert.ok(r.limitato); vicino(r.ra, .04 / 25.6 * 1000, 1e-9);
});
prova('tolleranze note', () => {
  const t = (d, c) => { const r = O.tolleranza(d, c); return [r.sup, r.inf]; };
  assert.deepStrictEqual(t(25, 'H7'), [21, 0]);
  assert.deepStrictEqual(t(25, 'g6'), [-7, -20]);
  assert.deepStrictEqual(t(25, 'k6'), [15, 2]);
  assert.deepStrictEqual(t(25, 'p6'), [35, 22]);
  assert.deepStrictEqual(t(50, 'f7'), [-25, -50]);
  assert.deepStrictEqual(t(10, 'F7'), [28, 13]);
  assert.deepStrictEqual(t(100, 'h6'), [0, -22]);
  assert.deepStrictEqual(t(3, 'H7'), [10, 0]);       // 3 sta nel primo campo
  assert.deepStrictEqual(t(3.01, 'H7'), [12, 0]);
  assert.deepStrictEqual(t(40, 'js7'), [12.5, -12.5]);
  assert.deepStrictEqual(t(25, 'k8'), [33, 0]);      // k oltre IT7: scostamento 0
  assert.ok(O.tolleranza(600, 'H7').errore);
  assert.ok(O.tolleranza(20, 'K7').errore);
  assert.ok(O.tolleranza(20, 'x').errore);
});
prova('filetto metrico', () => {
  const f = O.filetto(10, 1.5);
  vicino(f.preforo, 8.5); vicino(f.medio, 9.026, 1e-3); vicino(f.nocciolo, 8.376, 1e-3); vicino(f.hEsterno, .92, 1e-3);
  const p = O.passateFiletto(1, 4); vicino(p[3], 1); assert.ok(p[0] > p[1] - p[0]);
});
prova('cono', () => { vicino(O.cono(30, 20, 40).semiangolo, 7.125016, 1e-5); });
prova('fori su cerchio', () => { const p = O.foriSuCerchio(100, 4, 0); vicino(p[1].x, 0, 1e-9); vicino(p[1].y, 50); });
prova('rugosita', () => { assert.strictEqual(O.rugositaN(1.6), 'N7'); assert.strictEqual(O.rugositaN(1.7), 'N8'); });
prova('numeri G-code', () => { assert.strictEqual(O.gc(10), '10.'); assert.strictEqual(O.gc(-0.0001), '0.'); assert.strictEqual(O.gc(2.5), '2.5'); });

const base = { num: 12, nome: 'prova', t: 2, vc: 200, f: .25, nmax: 3000, codLimite: 'G50', codFiletto: 'G32' };
prova('sgrossatura', () => {
  const r = O.gcodeTornio('sgrossatura', Object.assign({ dg: 40, df: 30, l: 50, ap: 2, sx: .4, sz: .1, finitura: true, smusso: 1, ff: .1 }, base));
  assert.ok(!r.errore);
  assert.strictEqual(r.righe[1], 'O0012 (PROVA)');
  assert.ok(r.righe.includes('T0202')); assert.ok(r.righe.includes('G50 S3000')); assert.ok(r.righe.includes('G96 S200 M3'));
  assert.strictEqual(r.righe.filter(l => /^G1 Z-49\.9/.test(l)).length, 3);
  assert.ok(r.righe.includes('G0 X30.4'));
  assert.ok(r.righe.includes('G1 Z-50.'));
  assert.strictEqual(r.righe[r.righe.length - 2], 'M30');
  // nessun movimento di lavoro sotto il diametro finito
  r.percorso.filter(s => !s.rapido).forEach(s => assert.ok(s.x >= 30 - 1e-9, 'X ' + s.x));
});
prova('sgrossatura: errori', () => {
  assert.ok(O.gcodeTornio('sgrossatura', Object.assign({ dg: 30, df: 40, l: 50, ap: 2 }, base)).errore);
  assert.ok(O.gcodeTornio('sgrossatura', Object.assign({ dg: 40, df: 30, l: 50, ap: 0 }, base)).errore);
});
prova('sfacciatura', () => {
  const r = O.gcodeTornio('sfacciatura', Object.assign({ dg: 40, s: 2.5, ap: 1 }, base));
  assert.deepStrictEqual(r.righe.filter(l => /^G0 Z/.test(l)).slice(0, 3), ['G0 Z1.5', 'G0 Z2.5', 'G0 Z0.5']);
  assert.ok(r.righe.includes('G0 Z0.'));
});
prova('gola', () => {
  const r = O.gcodeTornio('gola', Object.assign({ dg: 40, dfondo: 34, zg: -20, b: 8, w: 3 }, base));
  const zz = r.righe.filter(l => /^G0 Z-/.test(l));
  assert.strictEqual(zz[0], 'G0 Z-20.'); assert.strictEqual(zz[zz.length - 1], 'G0 Z-25.');
  assert.ok(O.gcodeTornio('gola', Object.assign({ dg: 40, dfondo: 34, zg: -20, b: 2, w: 3 }, base)).errore);
});
prova('filetto', () => {
  const r = O.gcodeTornio('filetto', Object.assign({ dg: 20, d: 20, p: 2.5, l: 30, n: 6, giri: 800 }, base));
  const f = r.righe.filter(l => l.startsWith('G32'));
  assert.strictEqual(f.length, 7);
  assert.ok(r.righe.includes('G97 S800 M3'));
  assert.ok(r.righe.includes('G0 X16.933'));
  assert.ok(O.gcodeTornio('filetto', Object.assign({ dg: 20, d: 20, p: 2.5, l: 30, n: 6, giri: 5000 }, base)).errore);
  const g33 = O.gcodeTornio('filetto', Object.assign({ dg: 20, d: 20, p: 2.5, l: 30, n: 6, giri: 800 }, base, { codFiletto: 'G33' }));
  assert.ok(g33.righe.some(l => l.startsWith('G33 Z-30.')));
});

prova('materiali: stessi nomi del programma parametrico, valori per il metallo duro', () => {
  assert.strictEqual(O.MATERIALI.length, 20);
  const c40 = O.MATERIALI.find(m => m.n === 'C40');
  assert.deepStrictEqual([c40.vc, c40.fz, c40.dvc, c40.dfn, c40.ivc, c40.tvc, c40.rvc, c40.rfn, c40.bvc, c40.bfn], [180, .055, 90, .18, 200, 15, 50, .22, 180, .09]);
  O.MATERIALI.filter(m => m.n !== 'Legno').forEach(m => ['fvc', 'ffz', 'ivc', 'ifn', 'lvc', 'lf'].forEach(k => assert.ok(m[k] > 0, m.n + ' ' + k)));
  O.MATERIALI.forEach(m => { assert.ok(m.fvc >= m.vc, m.n + ' finitura'); assert.ok(m.dvc < m.vc, m.n + ' punta'); });
  O.MATERIALI.forEach(m => ['vc', 'fz', 'ap', 'ae', 'dvc', 'dfn', 'tvc', 'rvc', 'rfn', 'bvc', 'bfn', 'rho'].forEach(k => assert.ok(m[k] > 0, m.n + ' ' + k)));
});
prova('dati di taglio come nel programma parametrico', () => {
  const m = O.MATERIALI.find(x => x.n === 'C40');
  const fr = O.datiTaglio(m, { tipo: 'fresa', d: 10, z: 4 });
  assert.strictEqual(fr.n, 5730); assert.strictEqual(fr.f, Math.round(.055 * 4 * 5730));
  const p = O.datiTaglio(m, { tipo: 'puntaMD', d: 8.5 });
  vicino(p.fn, .18 * .85); assert.strictEqual(p.n, 3370);
  const ins = O.datiTaglio(Object.assign({}, m, { ivc: 200, ifn: .1 }), { tipo: 'puntaIns', d: 20 });
  assert.strictEqual(ins.vc, 200); vicino(ins.fn, .2);
  assert.strictEqual(O.datiTaglio(m, { tipo: 'puntaIns', d: 20 }).vc, 200);
  assert.strictEqual(O.datiTaglio(Object.assign({}, m, { ivc: undefined, ifn: undefined }), { tipo: 'puntaIns', d: 20 }).vc, 90);   // senza dati: quelli della punta
  vicino(O.datiTaglio(m, { tipo: 'alesatore', d: 40 }).fn, .22 * 2);
  vicino(O.datiTaglio(m, { tipo: 'bareno', d: 10 }).fn, .09);
  assert.strictEqual(O.datiTaglio(m, { tipo: 'maschio', d: 10, passo: 1.5 }).f, Math.round(1.5 * O.datiTaglio(m, { tipo: 'maschio', d: 10 }).n));
  assert.strictEqual(O.datiTaglio(m, { tipo: 'fresa', d: 1, nmax: 12000 }).n, 12000);
  assert.strictEqual(O.datiTaglio(O.MATERIALI.find(x => x.n === 'Legno'), { tipo: 'inserto', d: 50 }), null);
});
prova('peso e triangolo', () => {
  vicino(O.peso('tondo', { d: 100, l: 1000 }, 7.85), 61.65, 0.01);
  vicino(O.peso('piatto', { a: 100, b: 10, l: 1000 }, 7.85), 7.85, 1e-9);
  const t = O.triangolo({ a: 3, b: 4 }); vicino(t.c, 5); vicino(t.A, 36.8699, 1e-4);
  vicino(O.triangolo({ A: 30, c: 10 }).a, 5, 1e-9);
  assert.strictEqual(O.triangolo({ a: 3 }), null);
});
prova('tornio: interna, foratura, filetto interno', () => {
  const r = O.gcodeTornio('interna', Object.assign({ dg: 60, dp: 20, di: 30, l: 25, ap: 1.5, sx: .3, sz: .1, finitura: true }, base));
  assert.ok(!r.errore); r.percorso.filter(s => !s.rapido).forEach(s => assert.ok(s.x <= 30 + 1e-9, 'X ' + s.x));
  assert.ok(r.righe.includes('G1 Z-25.'));
  const f = O.gcodeTornio('foratura', Object.assign({ dg: 50, dpunta: 20, prof: 40, q: 10, giri: 800 }, base));
  assert.strictEqual(f.righe.filter(l => /^G1 Z-/.test(l)).length, 4); assert.ok(f.righe.includes('G0 X0. Z2. M8'));
  const fi = O.gcodeTornio('filettoInt', Object.assign({ dg: 50, d: 30, p: 2, l: 20, n: 6, giri: 600 }, base));
  const xs = fi.righe.map((l, i) => (/^G32/.test(l) ? Number(fi.righe[i - 1].slice(4)) : NaN)).filter(x => !isNaN(x));
  vicino(Math.max(...xs), 30, 1e-3); assert.ok(Math.min(...xs) > 30 - 1.0826 * 2);
  assert.ok(O.gcodeTornio('interna', Object.assign({ dp: 30, di: 20, l: 10, ap: 1, dg: 50 }, base)).errore);
});
const bf = { n: 3000, f: 600, t: 3, zSic: 50, zR: 2 };
prova('fresa: spianatura copre tutto il pezzo', () => {
  const r = O.gcodeFresa('spianatura', Object.assign({ lx: 100, ly: 60, prof: 2, ap: 1, d: 50, ae: 70 }, bf));
  assert.ok(!r.errore);
  const ys = [...new Set(r.percorso.filter(s => !s.rapido && s.z === -2).map(s => s.y))];
  assert.ok(Math.min(...ys) - 25 <= 0 && Math.max(...ys) + 25 >= 60, ys.join());
  assert.ok(r.righe.includes('T3 M6') && r.righe.includes('G43 H3 Z50. M8'));
  assert.strictEqual(r.righe.filter(l => /^G1 Z-/.test(l)).length, 2);
});
prova('fresa: contorno fuori dal pezzo, tasca dentro', () => {
  const c = O.gcodeFresa('contorno', Object.assign({ lx: 80, ly: 50, prof: 10, ap: 5, d: 10, sovra: .2, finitura: true }, bf));
  c.percorso.filter(s => !s.rapido && s.z < 0).forEach(s => assert.ok(s.x <= -5 + 1e-9 || s.x >= 85 - 1e-9 || s.y <= -5 + 1e-9 || s.y >= 55 - 1e-9, s.x + ' ' + s.y));
  const t = O.gcodeFresa('tasca', Object.assign({ cx: 40, cy: 25, lx: 40, ly: 20, prof: 6, ap: 3, d: 10, sovra: .2, finitura: true }, bf));
  t.percorso.filter(s => s.z < 0).forEach(s => assert.ok(s.x >= 25 - 1e-9 && s.x <= 55 + 1e-9 && s.y >= 20 - 1e-9 && s.y <= 30 + 1e-9, s.x + ' ' + s.y));
  assert.ok(Math.min(...t.percorso.map(s => s.z)) >= -6 - 1e-9);
  assert.ok(O.gcodeFresa('tasca', Object.assign({ lx: 8, ly: 8, prof: 2, ap: 1, d: 10 }, bf)).errore);
});
prova('fresa: fori e schemi', () => {
  const p = O.schemaFori({ tipo: 'griglia', x0: 0, y0: 0, nx: 3, ny: 2, px: 10, py: 20 });
  assert.deepStrictEqual(p, [[0, 0], [10, 0], [20, 0], [20, 20], [10, 20], [0, 20]]);
  assert.deepStrictEqual(O.schemaFori({ tipo: 'elenco', testo: 'X10 Y5\n-3,5 7\nniente' }), [[10, 5], [-3.5, 7]]);
  const r = O.gcodeFresa('fori', Object.assign({ punti: p, prof: 15, ciclo: 'G83', q: 3 }, bf));
  assert.ok(r.righe.includes('G98 G83 X0. Y0. Z-15. R2. Q3. F600'));
  assert.strictEqual(r.righe.filter(l => /^X/.test(l)).length, 5); assert.ok(r.righe.includes('G80'));
  const n = O.gcodeFresa('fori', Object.assign({ punti: p, prof: 15, ciclo: 'G81', numerare: true }, bf));
  assert.ok(n.righe[2].startsWith('N10 (')); assert.ok(n.righe[1].startsWith('O'));
});
prova('macro: modelli e controlli', () => {
  O.MACRO_MODELLI.forEach(m => {
    const r = O.scriviMacro(m);
    assert.deepStrictEqual(r.errori, [], m.nome);
    assert.ok(r.sotto[0].startsWith('O' + m.num)); assert.ok(r.sotto.some(l => /M99/.test(l)));
    let p = 0; r.sotto.forEach(l => { p += (l.match(/\[/g) || []).length - (l.match(/\]/g) || []).length; }); assert.strictEqual(p, 0, m.nome + ' parentesi');
    const DO = r.sotto.filter(l => /\bDO\d/.test(l)).length, END = r.sotto.filter(l => /^END\d/.test(l)).length; assert.strictEqual(DO, END, m.nome);
  });
  assert.strictEqual(O.scriviMacro(O.MACRO_MODELLI[0]).chiamata, 'G65 P9001 Z-50. Q5. R2. F200.');
  const e = O.scriviMacro({ nome: 'x', num: 9100, par: [['G', 'no', 1], ['A', 'a', ''], ['B', 'b', 2], ['B', 'b', 3]], corpo: 'G0 X#2' });
  assert.strictEqual(e.errori.length, 3);
  assert.deepStrictEqual(O.scriviMacro({ nome: 'x', num: 9100, par: [], corpo: 'G0 X1' }).sotto.slice(-1), ['M99']);
});
prova('importa materiali da Hich-CAM', () => {
  const testo = JSON.stringify({ materiali: [
    { n: 'C40', g: 'Acciai al carbonio', vc: 180, fz: .05, ap: .7, ae: 40, dvc: 80, dfn: .15, tvc: 12, rvc: 15, rfn: .22, bvc: 150, bfn: .09, ivc: 160, ifn: .08, note: 'mio' },
    { n: 'Mio acciaio', g: 'Acciai al carbonio', vc: 150, fz: .04, ap: .5, ae: 30, dvc: 70, dfn: .12, tvc: 10, rvc: 12, rfn: .2, bvc: 120, bfn: .08 }] }, null, 1);
  const r = O.leggiMateriali(testo);
  assert.ok(!r.errore, r.errore);
  assert.strictEqual(r.materiali.length, 2);
  assert.strictEqual(r.materiali[0].dvc, 80); assert.strictEqual(r.materiali[0].ivc, 160);
  assert.strictEqual(r.materiali[0].lvc, 240);   // tornitura di serie con lo stesso nome
  assert.strictEqual(r.materiali[1].lvc, 280);   // ... o dello stesso gruppo
  assert.strictEqual(O.datiTaglio(r.materiali[0], { tipo: 'puntaIns', d: 20 }).vc, 160);
  assert.ok(O.leggiMateriali('{ rotto').errore);
  assert.ok(O.leggiMateriali('{"materiali":[{"n":"X","vc":100}]}').errore);
  assert.ok(O.leggiMateriali(JSON.stringify([{ n: 'A', vc: 1, fz: 1 }])).errore.includes('mancano'));
  assert.ok(!O.leggiMateriali(JSON.stringify([O.MATERIALI[0]])).errore);   // anche la lista semplice
});
prova('lettura ISO: fresa, quote e tempo', () => {
  const f = O.gcodeFresa('tasca', Object.assign({ cx: 40, cy: 25, lx: 40, ly: 20, prof: 6, ap: 3, d: 10, sovra: .2, finitura: true }, bf));
  const r = O.eseguiISO(f.righe.join('\n'));
  assert.strictEqual(r.modo, 'fresa'); assert.strictEqual(r.errore, null); assert.deepStrictEqual(r.avvisi, []);
  vicino(r.limiti.x.minLavoro, 25); vicino(r.limiti.x.maxLavoro, 55); vicino(r.limiti.z.minLavoro, -6);
  assert.strictEqual(r.utensili.length, 1); assert.strictEqual(r.utensili[0].t, 3);
  assert.ok(r.tempo > 0.5 && r.tempo < 10, 'tempo ' + r.tempo);
  // stesso percorso del generatore (i segmenti di lavoro)
  const lav = r.segmenti.filter(s => !s.rapido).length, lav0 = f.percorso.filter(s => !s.rapido).length;
  assert.strictEqual(lav, lav0);
});
prova('lettura ISO: cicli di foratura e archi', () => {
  const p = O.schemaFori({ tipo: 'cerchio', dc: 60, n: 4 });
  const f = O.gcodeFresa('fori', Object.assign({ punti: p, prof: 15, ciclo: 'G83', q: 5 }, bf));
  const r = O.eseguiISO(f.righe.join('\n'));
  assert.strictEqual(r.errore, null);
  const fondi = r.segmenti.filter(s => !s.rapido && Math.abs(s.z + 15) < 1e-9);
  assert.strictEqual(fondi.length, 4);
  vicino(r.limiti.x.maxLavoro, 30); vicino(r.limiti.y.minLavoro, -30);
  const c = O.eseguiISO('G90 G17 G0 X10 Y0 Z0 S1000 M3\nG1 F100\nG2 X-10 Y0 I-10 J0\nG2 X10 Y0 R10\nG3 X10 Y0 I-10 J0', { modo: 'fresa' });
  assert.deepStrictEqual(c.avvisi, []);
  vicino(c.limiti.y.minLavoro, -10, 0.01); vicino(c.limiti.y.maxLavoro, 10, 0.01);   // primo arco sotto, secondo sopra, cerchio intero
  const t = O.eseguiISO('G18 G0 X0 Z2\nG1 Z0 F.1\nG3 X20 Z-10 R10', { modo: 'tornio' });
  const m = t.segmenti.filter(s => s.riga === 2);
  m.forEach(s => vicino(Math.hypot(s.x / 2, s.z + 10), 10, 1e-6));   // arco convesso con centro in Z-10
});
prova('lettura ISO: macro, variabili e salti', () => {
  O.MACRO_MODELLI.forEach(md => {
    const mm = O.scriviMacro(md);
    const r = O.eseguiISO(['%', 'O0001', 'G90 G0 X50 Y50 Z5', mm.chiamata, 'M30', '%'].concat(mm.sotto).join('\n'), { modo: 'fresa' });
    assert.strictEqual(r.errore, null, md.nome + ': ' + r.errore);
  });
  const r = O.eseguiISO('#1=0\n#2=0\nWHILE [#1 LT 5] DO1\n#1=#1+1\n#2=#2+[#1*2]\nEND1\nIF [#2 EQ 30] GOTO 10\n#3=1\nN10 #4=SQRT[16]+ATAN[1]/[1]\nG0 X#4', { modo: 'fresa' });
  assert.strictEqual(r.errore, null);
  assert.strictEqual(r.locali[2], 30); assert.strictEqual(r.locali[3], undefined); vicino(r.locali[4], 49);
  const a = O.eseguiISO('#3000=1 (ROTTO)\nG0 X10', { modo: 'fresa' });
  assert.strictEqual(a.messaggi[0].tipo, 'allarme'); assert.strictEqual(a.segmenti.length, 0);
  assert.ok(O.eseguiISO('#1=1/0', { modo: 'fresa' }).errore.includes('zero'));
  assert.ok(O.eseguiISO('WHILE [1 EQ 1] DO1\nEND1', { modo: 'fresa', maxPassi: 1000 }).avvisi.some(x => /ciclo infinito/.test(x)));
});
prova('lettura ISO: tornio dal generatore', () => {
  const g = O.gcodeTornio('sgrossatura', Object.assign({ dg: 40, df: 30, l: 50, ap: 2, sx: .4, sz: .1, finitura: true, smusso: 1, ff: .1 }, base));
  const r = O.eseguiISO(g.righe.join('\n'));
  assert.strictEqual(r.modo, 'tornio'); assert.strictEqual(r.errore, null);
  vicino(r.limiti.x.minLavoro, 26); vicino(r.limiti.z.minLavoro, -50);   // 26: inizio dello smusso
  assert.ok(O.indovinaModo('G0 X10 Y10\nT1 M6') === 'fresa');
});
prova('post-processor: cicli a nome', () => {
  const f = O.gcodeFresa('fori', Object.assign({ punti: O.schemaFori({ tipo: 'cerchio', dc: 60, n: 3 }), prof: 15, ciclo: 'G83', q: 3 }, bf));
  const r = O.postProcessor(f.righe, { linguaggio: 'cicli', modo: 'fresa', nome: 'flangia' });
  assert.ok(!r.errore); assert.strictEqual(r.nomeFile, 'FLANGIA.MPF');
  assert.ok(r.righe.includes('MCALL CYCLE83(12, 0, 2, -15, , -3, , 3, 0, 0, 1, 1)'));
  assert.strictEqual(r.righe.filter(x => x === 'MCALL').length, 1);
  assert.ok(r.righe.includes('T3 D1') && r.righe.includes('M6') && r.righe.includes('M30'));
  assert.ok(!r.righe.some(x => /\bG8[0-9]\b|\bG43\b|^%|^O\d/.test(x)), 'restano codici ISO');
  const m = O.gcodeFresa('fori', Object.assign({ punti: [[0, 0]], prof: 12, ciclo: 'G84' }, bf, { n: 500, f: 625 }));
  assert.ok(O.postProcessor(m.righe, { linguaggio: 'cicli' }).righe.some(x => /^MCALL CYCLE84\(.*, 1.25, 0, 500, 500\)$/.test(x)));
  const t = O.gcodeTornio('sgrossatura', Object.assign({ dg: 40, df: 30, l: 50, ap: 3 }, base));
  const rt = O.postProcessor(t.righe, { linguaggio: 'cicli', modo: 'tornio', nome: 'albero' });
  assert.ok(rt.righe.includes('G96 S200 LIMS=3000 M3') && rt.righe.includes('T2 D2'));
  const fil = O.gcodeTornio('filetto', Object.assign({ dg: 20, d: 20, p: 2.5, l: 30, n: 3, giri: 800 }, base));
  assert.ok(O.postProcessor(fil.righe, { linguaggio: 'cicli', modo: 'tornio' }).righe.includes('G33 Z-30 K2.5'));
});
prova('post-processor: dialogo a testo', () => {
  const f = O.gcodeFresa('fori', Object.assign({ punti: O.schemaFori({ tipo: 'griglia', nx: 2, ny: 1, px: 20 }), prof: 15, ciclo: 'G81' }, bf));
  const r = O.postProcessor(f.righe, { linguaggio: 'dialogo', modo: 'fresa', nome: 'piastra' });
  assert.ok(!r.errore);
  assert.strictEqual(r.righe[0], '0 BEGIN PGM PIASTRA MM'); assert.strictEqual(r.righe[r.righe.length - 1].replace(/^\d+ /, ''), 'END PGM PIASTRA MM');
  assert.ok(r.righe.some(x => /^\d+ TOOL CALL 3 Z S3000$/.test(x)));
  assert.ok(r.righe.some(x => /CYCL DEF 200 FORATURA/.test(x)) && r.righe.includes('  Q201=-15 ;PROFONDITA ~'));
  assert.strictEqual(r.righe.filter(x => / M99$/.test(x)).length, 2);
  assert.ok(r.righe.some(x => / M30$/.test(x)));
  // numeri di riga in ordine
  const n = r.righe.filter(x => /^\d+ /.test(x)).map(x => Number(x.split(' ')[0]));
  n.forEach((v, i) => assert.strictEqual(v, i));
  // tutte le coordinate con il segno
  r.righe.filter(x => /^\d+ L /.test(x)).forEach(x => assert.ok(!/ [XYZ]\d/.test(x), x));
  const c = O.gcodeFresa('tasca', Object.assign({ cx: 40, cy: 25, lx: 40, ly: 20, prof: 6, ap: 3, d: 10 }, bf));
  const rc = O.postProcessor(c.righe, { linguaggio: 'dialogo' });
  assert.deepStrictEqual(rc.avvisi, []);
  assert.ok(O.postProcessor(O.gcodeTornio('sfacciatura', Object.assign({ dg: 40, s: 2, ap: 1 }, base)).righe, { linguaggio: 'dialogo', modo: 'tornio' }).errore);
  assert.ok(O.postProcessor(['G65 P9001 A1'], { linguaggio: 'cicli' }).errore);
});
prova('profilo: raccordi, smussi, archi', () => {
  const g = O.costruisciProfilo([{ a: 0, b: 0 }, { a: 80, b: 0 }, { a: 80, b: 50, raccordo: 10 }, { a: 0, b: 50, smusso: 5 }], true);
  assert.strictEqual(g.errore, null);
  const arco = g.tratti.find(t => t.tipo === 'A');
  vicino(arco.c.a, 70); vicino(arco.c.b, 40); vicino(arco.p.a, 80); vicino(arco.p.b, 40); vicino(arco.q.a, 70); vicino(arco.q.b, 50);
  assert.strictEqual(arco.cw, false);   // antiorario: il giro 0,0 -> 80,0 -> 80,50 e antiorario
  assert.ok(g.tratti.some(t => t.tipo === 'L' && Math.abs(t.p.a - 5) < 1e-9 && Math.abs(t.q.b - 45) < 1e-9));
  assert.ok(O.costruisciProfilo([{ a: 0, b: 0 }, { a: 10, b: 0, raccordo: 20 }, { a: 10, b: 10 }], false).errore.includes('troppo grande'));
  assert.ok(O.costruisciProfilo([{ a: 0, b: 0 }, { a: 10, b: 0, tratto: 'cw', r: 2 }], false).errore.includes('raggio'));
  const c = O.centroArco({ a: 0, b: 0 }, { a: 10, b: 10 }, 10, false);
  vicino(c.a, 0); vicino(c.b, 10);
});
prova('fresa: profilo con G41/G42', () => {
  const b2 = { n: 3000, f: 600, t: 3, zSic: 50, zR: 2 };
  const r = O.gcodeFresa('profilo', Object.assign({ punti: [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 50, raccordo: 10 }, { x: 0, y: 50, smusso: 5 }], chiuso: true, lato: 'esterno', prof: 10, ap: 5, d: 10 }, b2));
  assert.ok(!r.errore, r.errore);
  assert.strictEqual(r.righe.filter(l => /G41 D3/.test(l)).length, 2);
  assert.strictEqual(r.righe.filter(l => /^G1 G40/.test(l)).length, 2);
  assert.ok(r.righe.includes('G2 X80. Y40. I0. J-10.'));   // esterno in senso orario: concorde
  const s2 = O.eseguiISO(r.righe.join('\n'));
  assert.strictEqual(s2.errore, null); vicino(s2.limiti.z.minLavoro, -10);
  const t = O.gcodeFresa('profilo', Object.assign({ punti: [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 50 }, { x: 0, y: 50 }], chiuso: true, lato: 'interno', prof: 5, ap: 5, d: 10 }, b2));
  assert.ok(t.righe.some(l => /^G1 G41/.test(l)));
  const a = O.gcodeFresa('profilo', Object.assign({ punti: [{ x: 0, y: 0 }, { x: 50, y: 0 }], chiuso: false, lato: 'destra', prof: 2, ap: 2, d: 10 }, b2));
  assert.ok(a.righe.some(l => /G42 D3/.test(l)));
  assert.ok(O.gcodeFresa('profilo', Object.assign({ punti: [{ x: 0, y: 0 }, { x: 50, y: 0 }], chiuso: false, lato: 'esterno', prof: 2, ap: 2, d: 10 }, b2)).errore);
});
prova('fresa: tasca circolare, asola, filetto a fresa', () => {
  const b2 = { n: 3000, f: 600, t: 3, zSic: 50, zR: 2 };
  const tc = O.gcodeFresa('tascaCircolare', Object.assign({ cx: 10, cy: 5, dt: 40, prof: 6, ap: 3, d: 10, sovra: .2, finitura: true }, b2));
  const s1 = O.eseguiISO(tc.righe.join('\n'));
  assert.strictEqual(s1.errore, null); assert.deepStrictEqual(s1.avvisi, []);
  vicino(s1.limiti.x.maxLavoro, 25, 1e-6); vicino(s1.limiti.x.minLavoro, -5, 0.01); vicino(s1.limiti.z.minLavoro, -6);
  // parte e finisce al centro (regola di officina)
  const lav = s1.segmenti.filter(x => !x.rapido);
  vicino(lav[lav.length - 1].x, 10); vicino(lav[lav.length - 1].y, 5);
  assert.ok(O.gcodeFresa('tascaCircolare', Object.assign({ dt: 10, prof: 6, ap: 3, d: 10 }, b2)).errore);
  const as = O.gcodeFresa('asola', Object.assign({ x1: 0, y1: 0, x2: 40, y2: 0, w: 14, prof: 6, ap: 3, d: 10 }, b2));
  const s2 = O.eseguiISO(as.righe.join('\n'));
  assert.strictEqual(s2.errore, null); vicino(s2.limiti.y.maxLavoro, 2, 0.05); vicino(s2.limiti.x.maxLavoro, 42, 0.05);
  const fi = O.gcodeFresa('filettoFresa', Object.assign({ cx: 0, cy: 0, D: 20, p: 2.5, prof: 15, d: 12, np: 2 }, b2));
  const s3 = O.eseguiISO(fi.righe.join('\n'));
  assert.strictEqual(s3.errore, null); vicino(s3.limiti.x.maxLavoro, 4, 1e-6);
  assert.ok(fi.righe.some(l => /^G3 .*Z-/.test(l)), 'interno destro: G3 in salita');
  assert.ok(O.gcodeFresa('filettoFresa', Object.assign({ D: 10, p: 1.5, prof: 10, d: 10 }, b2)).errore.includes('non entra'));
  const fe = O.gcodeFresa('filettoFresa', Object.assign({ D: 20, p: 2.5, prof: 15, d: 12, tipoFil: 'esterno' }, b2));
  assert.ok(fe.righe.some(l => /^G2 /.test(l)), 'esterno destro: G2 in discesa');
});
prova('tornio: profilo, cicli fissi e simulazione dei cicli', () => {
  const pts = [{ x: 0, z: 0 }, { x: 16, z: 0 }, { x: 20, z: -2 }, { x: 20, z: -20 }, { x: 30, z: -25, tratto: 'ccw', r: 5 }, { x: 30, z: -40 }, { x: 40, z: -40 }];
  const p1 = O.gcodeTornio('profilo', Object.assign({}, base, { dg: 40, punti: pts, ap: 2, sx: .4, sz: .1, ff: .1, finitura: true, metodo: 'passate' }));
  const p2 = O.gcodeTornio('profilo', Object.assign({}, base, { dg: 40, punti: pts, ap: 2, sx: .4, sz: .1, ff: .1, finitura: true, metodo: 'ciclo' }));
  assert.ok(!p1.errore && !p2.errore);
  assert.ok(p2.righe.includes('G71 U2. R0.5') && p2.righe.includes('G71 P100 Q200 U0.4 W0.1 F0.25') && p2.righe.includes('G70 P100 Q200'));
  assert.ok(p2.righe.includes('G3 X30. Z-25. R5.'));
  // nessuna passata di lavoro sotto il profilo (sgrossatura sopra il sovrametallo)
  const prof = z => (z > -2 ? 16 + (-z) * 2 : z >= -20 ? 20 : z >= -25 ? 20 + 2 * (5 - Math.sqrt(Math.max(0, 25 - (z + 20) * (z + 20)))) : 30);
  p1.percorso.filter(q => !q.rapido && q.z < -0.5 && q.z > -39.5).forEach(q => assert.ok(q.x >= prof(q.z) - 0.02, 'X' + q.x + ' Z' + q.z));
  const s1 = O.eseguiISO(p1.righe.join('\n')), s2 = O.eseguiISO(p2.righe.join('\n'));
  assert.strictEqual(s2.errore, null);
  vicino(s2.limiti.x.minLavoro, 0); vicino(s2.limiti.z.minLavoro, -40);
  assert.ok(s2.segmenti.filter(q => !q.rapido).length > 30, 'il G71 si simula');
  assert.ok(s1.segmenti.length > 0);
  const g76 = O.gcodeTornio('filetto', Object.assign({}, base, { dg: 20, d: 20, p: 2.5, l: 30, n: 6, giri: 600, metodo: 'ciclo' }));
  assert.ok(g76.righe.includes('G76 P010060 Q50 R0.02') && g76.righe.includes('G76 X16.933 Z-30. P1533 Q626 F2.5'));
  const s3 = O.eseguiISO(g76.righe.join('\n')); vicino(s3.limiti.x.minLavoro, 16.933, 1e-3);
  const g74 = O.gcodeTornio('foratura', Object.assign({}, base, { dg: 50, dpunta: 20, prof: 40, q: 10, giri: 800, metodo: 'ciclo' }));
  vicino(O.eseguiISO(g74.righe.join('\n')).limiti.z.minLavoro, -40);
  const g75 = O.gcodeTornio('gola', Object.assign({}, base, { dg: 40, dfondo: 34, zg: -20, b: 8, w: 3, metodo: 'ciclo' }));
  const s5 = O.eseguiISO(g75.righe.join('\n')); vicino(s5.limiti.x.minLavoro, 34); vicino(s5.limiti.z.minLavoro, -25);
  const con = O.gcodeTornio('filetto', Object.assign({}, base, { dg: 22, d: 20, d2: 22, p: 2, l: 30, n: 4, giri: 600 }));
  assert.ok(con.righe.some(l => /^G32 X\d.* Z-30\. F2\.$/.test(l)), 'conico: G32 con X e Z');
  const tr = O.gcodeTornio('filetto', Object.assign({}, base, { dg: 30, d: 30, p: 6, l: 40, n: 12, giri: 300, tipoFil: 'trapezio' }));
  assert.ok(tr.avvisi.join().includes('3.5'));
  const tro = O.gcodeTornio('troncatura', Object.assign({}, base, { dg: 40, zt: -30, w: 3, q: 3 }));
  assert.ok(!tro.errore); assert.ok(tro.righe.includes('G1 X-1. F0.25'));
  const sg = O.gcodeTornio('sgrossatura', Object.assign({}, base, { dg: 40, df: 30, l: 50, ap: 2, sx: .4, sz: .1, finitura: true, smusso: 1, metodo: 'ciclo' }));
  assert.ok(sg.righe.includes('N100 G0 G42 X28.'));
});
prova('sequenza: ordine di officina e controlli', () => {
  const b2 = { zSic: 50, zR: 2 }, pts = O.schemaFori({ tipo: 'cerchio', dc: 60, n: 4 });
  const F = [
    { op: 'fori', tipoUt: 'maschio', c: Object.assign({}, b2, { t: 6, n: 400, f: 500, punti: pts, prof: 15, ciclo: 'G84' }) },
    { op: 'contorno', c: Object.assign({}, b2, { t: 1, n: 3000, f: 600, lx: 100, ly: 80, prof: 10, ap: 5, d: 10 }) },
    { op: 'fori', tipoUt: 'puntaMD', c: Object.assign({}, b2, { t: 3, n: 2000, f: 300, punti: pts, prof: 20, ciclo: 'G83', q: 5 }) },
    { op: 'spianatura', c: Object.assign({}, b2, { t: 1, n: 3000, f: 800, lx: 100, ly: 80, prof: 1, ap: 1, d: 50 }) },
    { op: 'fori', tipoUt: 'centrino', c: Object.assign({}, b2, { t: 2, n: 2500, f: 200, punti: pts, prof: 2, ciclo: 'G81' }) },
    { op: 'fori', tipoUt: 'smussatore', c: Object.assign({}, b2, { t: 5, n: 1500, f: 150, punti: pts, prof: 4.4, ciclo: 'G82' }) }];
  assert.ok(O.gcodeSequenza(F, { num: 7, nome: 'x' }).errore.includes('prima del suo preforo'));
  const ord = O.ordinaFasi(F);
  assert.deepStrictEqual(ord.map(f => O.tipoFase(f, ord)), ['spianatura', 'centrino', 'puntaMD', 'smussoMaschio', 'maschio', 'contorno']);
  const r = O.gcodeSequenza(ord, { num: 7, nome: 'flangia' });
  assert.ok(!r.errore);
  assert.strictEqual(r.righe.filter(l => /^T\d+ M6$/.test(l)).length, 6);
  assert.strictEqual(r.righe.filter(l => l === 'M30').length, 1);
  assert.strictEqual(r.righe.filter(l => l === 'G54').length, 1);
  const s = O.eseguiISO(r.righe.join('\n'));
  assert.strictEqual(s.errore, null); assert.deepStrictEqual(s.utensili.map(u => u.t), [1, 2, 3, 5, 6]);
  // stesso utensile di seguito: niente cambio
  const due = [ord[0], Object.assign({}, ord[5], { c: Object.assign({}, ord[5].c, { t: 1 }) })];
  assert.strictEqual(O.gcodeSequenza(due, { num: 1 }).righe.filter(l => /^T\d+ M6$/.test(l)).length, 1);
  assert.ok(O.gcodeSequenza([], {}).errore);
});
prova('controllo del programma: errori trovati', () => {
  const bad = '%\nO0001\nG21 G17 G90\nT1\nG0 X0 Y0 Z5\nG1 Z-5\nG0 X50 Y0\nG1 X10 Y10 F99999\nG1 X(10 Y5\n';
  const r = O.controllaISO(bad);
  const tipo = (riga, frammento) => r.segnalazioni.find(x => x.riga === riga - 1 && x.testo.includes(frammento));
  assert.ok(tipo(6, 'senza avanzamento F') && tipo(6, 'mandrino fermo'), 'F e mandrino');
  assert.strictEqual(tipo(7, 'rapido in X Y sotto Z0').livello, 'errore');
  assert.ok(tipo(9, 'parentesi') && tipo(4, 'T senza M6') && tipo(8, 'molto alto'));
  assert.ok(r.segnalazioni.some(x => /fine del programma/.test(x.testo)));
  assert.strictEqual(r.segnalazioni[0].livello, 'errore');   // prima gli errori
  const t = O.controllaISO('G18 T0101\nG96 S200 M3\nG0 X40 Z2\nG1 X30 F.2\nM30', { modo: 'tornio' });
  assert.ok(t.segnalazioni.some(x => /G96.*senza limite/.test(x.testo) && x.livello === 'errore'));
  // i programmi dell'app passano senza errori ne avvisi
  const b2 = { n: 3000, f: 600, t: 3, zSic: 50, zR: 2 };
  [['spianatura', { lx: 100, ly: 60, prof: 2, ap: 1, d: 50 }], ['tasca', { cx: 40, cy: 25, lx: 40, ly: 20, prof: 6, ap: 3, d: 10 }], ['fori', { punti: [[0, 0], [10, 0]], prof: 10, ciclo: 'G83', q: 2 }],
    ['tascaCircolare', { dt: 40, prof: 6, ap: 3, d: 10 }], ['asola', { x2: 40, w: 14, prof: 6, ap: 3, d: 10 }], ['filettoFresa', { D: 20, p: 2.5, prof: 15, d: 12 }]].forEach(([op, x]) => {
    const g = O.gcodeFresa(op, Object.assign({}, b2, x));
    assert.deepStrictEqual(O.controllaISO(g.righe.join('\n')).segnalazioni.filter(q => q.livello !== 'nota'), [], op);
  });
  [['sgrossatura', { dg: 40, df: 30, l: 50, ap: 2, finitura: true, smusso: 1 }], ['filetto', { dg: 20, d: 20, p: 2.5, l: 30, n: 6, giri: 600, metodo: 'ciclo' }], ['troncatura', { dg: 40, zt: -30, w: 3 }]].forEach(([op, x]) => {
    const g = O.gcodeTornio(op, Object.assign({}, base, x));
    assert.deepStrictEqual(O.controllaISO(g.righe.join('\n')).segnalazioni.filter(q => q.livello !== 'nota'), [], op);
  });
});
prova('lettura da foto: pulizia del testo', () => {
  const p = O.pulisciLettura('12  G0l X1O.5 Y-2,5 Z5\n13 GO1 Z-S.0 F2OO\nMenu Edit Program\n14 G01 X 10 . 5 Y20\n(COMMENTO O1)\nM3O\nO0001 (PEZZO)\nT1 M6');
  assert.deepStrictEqual(p.testo.split('\n'), ['G01 X10.5 Y-2.5 Z5', 'G01 Z-5.0 F200', 'G01 X10.5 Y20', '(COMMENTO O1)', 'M30', 'O0001 (PEZZO)', 'T1 M6']);
  assert.strictEqual(p.tolte, 1);
  // un programma gia pulito resta uguale
  const g = O.gcodeFresa('tasca', { n: 3000, f: 600, t: 3, zSic: 50, zR: 2, cx: 40, cy: 25, lx: 40, ly: 20, prof: 6, ap: 3, d: 10 });
  assert.strictEqual(O.pulisciLettura(g.righe.join('\n')).testo, g.righe.join('\n'));
});
prova('ciclo proposto: albero', () => {
  const mt = O.MATERIALI.find(m => m.n === 'C40');
  const a = O.pianificaAlbero({ dg: 40, lg: 100, smusso: 0.5, tratti: [{ d: 20, l: 25, passo: 2.5 }, { d: 30, l: 20, toll: 'h6' }, { d: 36, l: 15 }], foro: { d: 8, prof: 20 }, troncatura: true }, { mat: mt, nmax: 3000 });
  assert.ok(!a.errore);
  assert.deepStrictEqual(a.fasi.map(f => f.op), ['sfacciatura', 'foratura', 'profilo', 'gola', 'filetto', 'troncatura']);
  const prof = a.fasi[2].c.punti;
  assert.ok(prof.some(p => Math.abs(p.x - 29.9935) < 0.001), 'Ø30 h6 al centro della tolleranza');
  assert.ok(prof.some(p => p.x === 19.9), 'filetto un decimo sotto');
  assert.strictEqual(a.fasi[5].c.zt, -60);
  assert.ok(a.misure.some(m => m.toll === 'h6'));
  const r = O.gcodeSequenzaTornio(a.fasi, { num: 9, nome: 'albero' });
  assert.ok(!r.errore);
  const c = O.controllaISO(r.righe.join('\n'));
  assert.deepStrictEqual(c.segnalazioni.filter(x => x.livello !== 'nota'), []);
  vicino(c.limiti.z.minLavoro, -60);
  assert.ok(O.pianificaAlbero({ dg: 40, tratti: [{ d: 30, l: 10 }, { d: 20, l: 10 }] }, { mat: mt }).errore.includes('due prese'));
  // con i cicli fissi: ogni G71 ha i suoi blocchi
  const b = O.pianificaAlbero({ dg: 40, lg: 50, tratti: [{ d: 30, l: 20 }] }, { mat: mt, nmax: 3000, metodo: 'ciclo' });
  const rb = O.gcodeSequenzaTornio(b.fasi, { num: 1 });
  assert.ok(rb.righe.some(l => /^G71 P2100 Q2200/.test(l)) && rb.righe.some(l => /^N2100 /.test(l)));
  assert.strictEqual(O.controllaISO(rb.righe.join('\n')).errore, null);
});
prova('ciclo proposto: piastra', () => {
  const mt = O.MATERIALI.find(m => m.n === 'C40');
  const p = O.pianificaPiastra({ gx: 105, gy: 85, gz: 22, fx: 100, fy: 80, fz: 20, tasche: [{ tipo: 'rett', cx: 50, cy: 40, lx: 40, ly: 30, prof: 8, r: 6 }],
    fori: [{ tipo: 'maschio', d: 8, passante: true, schema: 'griglia', x0: 10, y0: 10, nx: 2, ny: 2, px: 80, py: 60 }, { tipo: 'alesato', d: 10, prof: 15, schema: 'elenco', testo: '30 70\n70 10' }] }, { mat: mt, nmax: 12000 });
  assert.ok(!p.errore);
  const tipi = p.fasi.map(f => O.tipoFase(f, p.fasi));
  assert.strictEqual(tipi[0], 'spianatura'); assert.strictEqual(tipi[tipi.length - 1], 'contorno');
  assert.ok(tipi.indexOf('maschio') > tipi.indexOf('puntaMD') && tipi.indexOf('alesatore') > tipi.indexOf('puntaMD'));
  assert.ok(p.fasi.some(f => f.tipoUt === 'puntaMD' && Math.abs(f.c.d - 6.75) < 1e-9), 'preforo M8');
  assert.ok(p.fasi.some(f => f.tipoUt === 'puntaMD' && Math.abs(f.c.d - 9.8) < 1e-9), 'preforo alesatura');
  const q = O.gcodeSequenza(p.fasi, { num: 10 });
  assert.ok(!q.errore);
  const c = O.controllaISO(q.righe.join('\n'));
  assert.deepStrictEqual(c.segnalazioni.filter(x => x.livello !== 'nota'), []);
  vicino(c.limiti.z.maxLavoro, 2);   // la spianatura parte dal grezzo, 2 sopra Z0
  // con la tabella utensili: i numeri T vengono da li
  const tab = [{ t: 12, tipo: 'maschio', d: 8 }, { t: 15, tipo: 'fresa', d: 10, z: 3 }];
  const p2 = O.pianificaPiastra({ fx: 50, fy: 50, fz: 10, tasche: [{ tipo: 'circ', cx: 25, cy: 25, dt: 30, prof: 5 }], fori: [{ tipo: 'maschio', d: 8, passante: true, schema: 'elenco', testo: '5 5' }] }, { mat: mt, tab });
  assert.ok(p2.fasi.some(f => f.tipoUt === 'maschio' && f.c.t === 12) && p2.fasi.some(f => f.op === 'tascaCircolare' && f.c.t === 15));
});
prova('quote lette da un disegno', () => {
  const q = O.estraiQuote('Ø20h6  Ø30 ±0,02 M20x1,5 4xØ8,5 6 x M8 1x45° R2 H7 120 35');
  const tipo = (t, testo) => q.find(x => x.tipo === t && x.testo === testo);
  assert.ok(tipo('diametro', 'Ø20 h6') && tipo('diametro', 'Ø30 ±0.02'));
  assert.ok(tipo('filetto', 'M20x1.5') && tipo('fori', '4 x Ø8.5') && tipo('fori', '6 x M8'));
  assert.strictEqual(tipo('fori', '6 x M8').filetto.p, 1.25);
  assert.ok(tipo('smusso', '1x45°') && tipo('raggio', 'R2') && tipo('tolleranza', 'H7') && tipo('lunghezza', '120') && tipo('lunghezza', '35'));
  assert.ok(!q.some(x => x.tipo === 'lunghezza' && (x.valore === 20 || x.valore === 45)));
});
prova('norme: tolleranze ISO 286 e filetti metrici', () => {
  // valori ufficiali (micrometri) per alcuni diametri: scostamento superiore e inferiore
  const T = [[6, 'H7', 12, 0], [12, 'H7', 18, 0], [25, 'H7', 21, 0], [40, 'H7', 25, 0], [65, 'H7', 30, 0], [100, 'H7', 35, 0], [25, 'H6', 13, 0], [25, 'H8', 33, 0], [25, 'H11', 130, 0],
    [25, 'h6', 0, -13], [25, 'h7', 0, -21], [25, 'h9', 0, -52], [25, 'g6', -7, -20], [25, 'f7', -20, -41], [25, 'e8', -40, -73], [25, 'd9', -65, -117],
    [25, 'k6', 15, 2], [25, 'm6', 21, 8], [25, 'n6', 28, 15], [25, 'p6', 35, 22], [40, 'js7', 12.5, -12.5], [50, 'G7', 34, 9], [25, 'F7', 41, 20], [25, 'E8', 73, 40]];
  T.forEach(([d, c, sup, inf]) => { const r = O.tolleranza(d, c); assert.deepStrictEqual([r.sup, r.inf], [sup, inf], c + ' su ' + d); });
  // il campo IT non cala mai all'aumentare del diametro, e cresce con il grado
  ['H6', 'H7', 'H8', 'H9'].forEach(c => { let prima = 0; [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500].forEach(d => { const it = O.tolleranza(d, c).it; assert.ok(it >= prima, c + ' ' + d); prima = it; }); });
  // filetti metrici ISO: D1, d2, d3 (mm)
  const F = [[10, 1.5, 8.376, 9.026, 8.160], [8, 1.25, 6.647, 7.188, 6.466], [12, 1.75, 10.106, 10.863, 9.853], [20, 2.5, 17.294, 18.376, 16.933], [6, 1, 4.917, 5.350, 4.773]];
  F.forEach(([d, p, D1, d2, d3]) => { const f = O.filetto(d, p); vicino(f.nocciolo, D1, 0.002); vicino(f.medio, d2, 0.002); vicino(f.nocciolo_vite, d3, 0.002); vicino(f.preforo, d - p, 1e-9); });
  // passi grossi ISO
  const G = { 3: 0.5, 4: 0.7, 5: 0.8, 6: 1, 8: 1.25, 10: 1.5, 12: 1.75, 14: 2, 16: 2, 20: 2.5, 24: 3, 30: 3.5, 36: 4, 42: 4.5, 48: 5 };
  for (const d in G) assert.strictEqual(O.FILETTI_GROSSI.find(f => f[0] === Number(d))[1], G[d], 'M' + d);
  // rugosita e cono
  assert.strictEqual(O.rugositaN(0.8), 'N6'); assert.strictEqual(O.rugositaN(3.2), 'N8');
  vicino(O.cono(40, 20, 100).semiangolo, 5.7106, 1e-3);   // 1:5 su Ø
  // giri: Vc 100 m/min su D50 = 637 giri/min
  vicino(O.giri(100, 50), 636.62, 0.01);
});
prova('valori vuoti o non validi: messaggio, mai NaN nel programma', () => {
  assert.ok(O.gcodeFresa('spianatura', { n: Infinity, f: 1, lx: 1, ly: 1, prof: 1, ap: 1, d: 1 }).errore.includes('non e valido'));
  assert.ok(O.gcodeTornio('sgrossatura', { dg: 1e9, df: 1, l: 1, ap: 1, vc: 1, f: 1, nmax: 1 }).errore.includes('non e valido'));
  // campi facoltativi vuoti (NaN) non bloccano un programma valido
  const r = O.gcodeFresa('spianatura', { n: 3000, f: 600, lx: 100, ly: 60, prof: 2, ap: 1, d: 50, nome: NaN, num: NaN, sovra: NaN });
  assert.ok(!r.errore && !/NaN/.test(r.righe.join('\n')));
  assert.ok(O.gcodeFresa('spianatura', { n: NaN, f: 600, lx: 100, ly: 60, prof: 2, ap: 1, d: 50 }).errore);
});
prova('compensazione G41/G42 calcolata e urti con le staffe', () => {
  const b2 = { n: 3000, f: 600, t: 3, zSic: 50, zR: 2 };
  const g = O.gcodeFresa('profilo', Object.assign({ punti: [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 50 }, { x: 0, y: 50 }], chiuso: true, lato: 'esterno', prof: 5, ap: 5, d: 10 }, b2));
  const s = O.eseguiISO(g.righe.join('\n'));
  assert.ok(s.segmenti.some(q => q.comp === 41) && s.segmenti.some(q => q.comp === 0));
  const c = O.centroFresa(s.segmenti, 5);
  const lav = c.filter((q, i) => s.segmenti[i].comp && Math.hypot(q.x - q.x0, q.y - q.y0) > 30);   // i lati lunghi, senza le uscite
  vicino(Math.min(...lav.map(q => q.x)), -5); vicino(Math.max(...lav.map(q => q.x)), 85);
  vicino(Math.min(...lav.map(q => q.y)), -5); vicino(Math.max(...lav.map(q => q.y)), 55);
  // interno: il centro sta dentro
  const gi = O.gcodeFresa('profilo', Object.assign({ punti: [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 50 }, { x: 0, y: 50 }], chiuso: true, lato: 'interno', prof: 5, ap: 5, d: 10 }, b2));
  const si = O.eseguiISO(gi.righe.join('\n'));
  const ci = O.centroFresa(si.segmenti, 5).filter((q, i) => si.segmenti[i].comp && Math.hypot(q.x - q.x0, q.y - q.y0) > 30);
  vicino(Math.min(...ci.map(q => q.x)), 5); vicino(Math.max(...ci.map(q => q.x)), 75);
  // urto con una staffa: lo vede solo con il centro fresa (raggio 5)
  s.segmentiCentro = c;
  const ing = { grezzo: { lx: 80, ly: 50, lz: 5 }, staffe: [{ x0: 30, y0: -20, x1: 50, y1: -3.5, z: 3 }], raggio: 5 };
  const u = O.controllaIngombri(s, ing);
  assert.ok(u.some(x => x.livello === 'errore' && /staffa 1/.test(x.testo)), 'urto con la staffa');
  assert.strictEqual(O.controllaIngombri(s, { staffe: [{ x0: 30, y0: -20, x1: 50, y1: -3.5, z: -8 }], raggio: 5 }).length, 0);   // staffa piu bassa del taglio
  // sotto il fondo del grezzo
  assert.ok(O.controllaIngombri(s, { grezzo: { lx: 80, ly: 50, lz: 1 }, raggio: 5 }).some(x => x.livello === 'errore' && /sotto il fondo/.test(x.testo)));
});
prova('tabelle dei filetti: famiglie e misure dalle norme', () => {
  const ids = O.FILETTI_FAMIGLIE.map(f => f.id);
  ['m', 'mf', 'unc', 'unf', 'unef', 'npt', 'g', 'r', 'bsw', 'bsf', 'tr', 'acme', 'pg'].forEach(i => assert.ok(ids.includes(i), 'manca ' + i));
  const tutte = O.FILETTI_FAMIGLIE.map(f => [f, f.righe()]);
  tutte.forEach(([f, righe]) => { assert.ok(righe.length > 5, f.id); righe.forEach(r => f.colonne.forEach(c => { if (r[c] !== undefined) assert.ok(isFinite(r[c]) && r[c] > 0, f.id + ' ' + r.nome + ' ' + c); })); });
  const r = (id, nome) => O.righeFamiglia(id, nome).find(x => x.nome === nome || x.nome.startsWith(nome + ' '));
  // valori di riferimento
  vicino(r('g', 'G 1/2').nocciolo, 18.631, 0.01);          // gas 1/2: diametro di nocciolo ISO 228
  vicino(r('g', 'G 1/2').p, 1.814, 0.001);
  vicino(r('g', 'G 1').d, 33.249, 1e-9);
  vicino(r('npt', 'NPT 1/2').medio, 19.264, 0.01);         // NPT 1/2: diametro medio all'inizio, 0,75843"
  vicino(r('npt', 'NPT 1/2').preforo, 18.3);
  vicino(r('unc', '1/4-20').p, 1.27, 0.001);
  vicino(r('unc', '1/4-20').preforo, 5.08, 0.01);
  vicino(r('unf', '#10-32').d, 4.826, 0.001);
  vicino(r('m', 'M12').preforo, 10.25, 0.001);
  vicino(r('tr', 'Tr 20x4').noccioloVite, 15.5, 0.01);     // d3 = d - 2 (P/2 + ac) = 20 - 2*2,25
  vicino(r('tr', 'Tr 20x4').nocciolo, 16, 1e-9);
  vicino(r('pg', 'Pg 21').d, 28.3, 1e-9);
  vicino(r('bsw', 'BSW 1/2-12').d, 12.7, 0.001);
  assert.strictEqual(O.righeFamiglia('npt', '1/2').length, 3);        // NPT 1/2, 1 1/2 e 2 1/2 contengono "1/2"
  assert.strictEqual(O.righeFamiglia('r', 'zzz').length, 0);
  assert.ok(O.righeFamiglia('m', 'M12').length >= 1);
});
prova('tasca libera: fresa sempre dentro il profilo e lontana dalle pareti', () => {
  const pts = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 30 }, { x: 30, y: 30 }, { x: 30, y: 60 }, { x: 0, y: 60 }];   // a L
  const d = 8, sov = 0.2, marg = d / 2 + sov;
  const r = O.gcodeFresa('tascaLibera', { n: 3000, f: 600, t: 1, d, prof: 6, ap: 3, ae: 50, sovra: sov, punti: pts });
  assert.ok(!r.errore, r.errore);
  const poli = pts.map(p => ({ a: p.x, b: p.y })); poli.push(poli[0]);
  const dist = (x, y) => { let m = Infinity; for (let i = 1; i < poli.length; i++) { const a = poli[i - 1], b = poli[i], dx = b.a - a.a, dy = b.b - a.b, t = Math.max(0, Math.min(1, ((x - a.a) * dx + (y - a.b) * dy) / (dx * dx + dy * dy))); m = Math.min(m, Math.hypot(x - a.a - t * dx, y - a.b - t * dy)); } return m; };
  const dentro = (x, y) => x > 0 && y > 0 && x < 60 && y < 60 && !(x > 30 && y > 30);
  const lav = r.percorso.filter(s => !s.rapido && s.z === s.z0);
  assert.ok(lav.length > 20);
  lav.forEach(s => { [[s.x0, s.y0], [s.x, s.y], [(s.x0 + s.x) / 2, (s.y0 + s.y) / 2]].forEach(([x, y]) => assert.ok(dentro(x, y) && dist(x, y) >= marg - 0.02, 'fresa troppo vicina alla parete in ' + x + ',' + y)); });
  // si toglie davvero la maggior parte: le righe coprono tutta l'altezza dell'asse corto
  assert.ok(Math.min(...lav.map(s => s.y)) < 4.5 && Math.max(...lav.map(s => s.y)) > 55);
  assert.ok(O.gcodeFresa('tascaLibera', { n: 3000, f: 600, t: 1, d: 70, prof: 6, ap: 3, punti: pts }).errore.includes('troppo grande'));
  // la simulazione legge il programma senza errori
  assert.ok(!O.eseguiISO(r.righe.join('\n')).errore);
});
prova('mini CAD: dalle entita al programma con le regole di officina', () => {
  const mt = O.MATERIALI.find(m => m.n === 'C40');
  const modello = { fz: 20, entita: [
    { id: 1, tipo: 'rett', x0: 0, y0: 0, x1: 100, y1: 60, r: 5, lav: [{ op: 'contorno', prof: 15, lato: 'esterno' }] },
    { id: 2, tipo: 'cerchio', cx: 20, cy: 30, r: 4.25, lav: [{ op: 'foro', passante: true }] },
    { id: 3, tipo: 'cerchio', cx: 80, cy: 30, r: 4, lav: [{ op: 'maschio', passante: true, passo: 1.25 }] },
    { id: 4, tipo: 'poli', chiuso: true, punti: [{ x: 35, y: 10 }, { x: 65, y: 10 }, { x: 65, y: 30 }, { x: 50, y: 50 }, { x: 35, y: 30 }], lav: [{ op: 'tasca', prof: 6 }] },
    { id: 5, tipo: 'asola', x1: 20, y1: 50, x2: 40, y2: 50, w: 8, lav: [{ op: 'asola', prof: 5 }] },
    { id: 6, tipo: 'punto', x: 50, y: 5, lav: [{ op: 'foro', d: 3, prof: 8 }] }] };
  const p = O.pianificaCAD(modello, { mat: mt, tab: [], nmax: 6000 });
  assert.ok(!p.errore, p.errore);
  const t = p.fasi.map(f => f.titolo);
  const i = s => t.findIndex(x => x.startsWith(s));
  assert.ok(i('Centrino') < i('Punta') && i('Punta') < i('Maschio'), 'centrino, punta, maschio');
  assert.ok(i('Punta') >= 0 && i('Smusso') > i('Punta') && i('Smusso') < i('Maschio'), 'smusso prima del maschio');
  assert.strictEqual(t[t.length - 1].split(' ')[0], 'Contorno', 'il contorno esterno e l\'ultimo');
  assert.ok(i('Tasca libera') >= 0 && i('Finitura tasca') > i('Tasca libera'), 'tasca libera e finitura');
  // numeri T: due utensili diversi non hanno lo stesso numero
  const perT = {}; p.fasi.forEach(f => { const k = (f.op === 'fori' ? f.tipoUt : 'fresa') + '|' + f.c.d; if (perT[f.c.t] && perT[f.c.t] !== k) assert.fail('T' + f.c.t + ' usato per ' + perT[f.c.t] + ' e ' + k); perT[f.c.t] = k; });
  const r = O.gcodeSequenza(p.fasi, { num: 1, nome: 'CAD' });
  assert.ok(!r.errore, r.errore);
  assert.ok(r.righe.some(l => /^G84 /.test(l)) || r.righe.some(l => /G84/.test(l)));
  assert.ok(!O.eseguiISO(r.righe.join('\n')).errore);
  // errori chiari
  assert.ok(O.pianificaCAD({ fz: 20, entita: [] }, { mat: mt }).errore.includes('Nessuna lavorazione'));
  assert.ok(O.pianificaCAD({ fz: 0, entita: [] }, { mat: mt }).errore.includes('spessore'));
  assert.ok(O.pianificaCAD({ fz: 20, entita: [{ tipo: 'punto', x: 1, y: 1, lav: [{ op: 'tasca', prof: 3 }] }] }, { mat: mt }).errore.includes('non si puo fare'));
  assert.ok(O.pianificaCAD({ fz: 20, entita: [{ tipo: 'poli', chiuso: false, punti: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], lav: [{ op: 'tasca', prof: 3 }] }] }, { mat: mt }).errore.includes('profilo chiuso'));
  // contorno di un cerchio e di un profilo aperto (a sinistra)
  const c = O.pianificaCAD({ fz: 10, entita: [{ tipo: 'cerchio', cx: 0, cy: 0, r: 15, lav: [{ op: 'contorno', prof: 5, lato: 'esterno' }] }, { tipo: 'poli', chiuso: false, punti: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 20 }], lav: [{ op: 'contorno', prof: 3, lato: 'esterno' }] }] }, { mat: mt });
  assert.ok(!c.errore, c.errore);
  const rc = O.gcodeSequenza(c.fasi, { num: 2, nome: 'X' });
  assert.ok(!rc.errore, rc.errore);
  assert.ok(rc.righe.some(l => /G41|G42/.test(l)));
  // i limiti del disegno
  const b = O.limitiCAD(modello.entita);
  vicino(b.x0, 0); vicino(b.x1, 100); vicino(b.y1, 60);
});
prova('lavoro guidato: tornio a tratti, fresa a forme, fasi spente e corrette', () => {
  const mt = O.MATERIALI.find(m => m.n === 'C40');
  const tr = [{ tipo: 'cil', d: 20, l: 25, fil: 2.5, gola: 4, spigolo: 'C1' }, { tipo: 'cil', d: 30, l: 20, toll: 'h6', spigolo: 'R1' }, { tipo: 'cono', d: 36, l: 8 }, { tipo: 'arco', d: 38, l: 4, r: 6 }];
  const pt = O.puntiTornio(tr, { dg: 40 });
  assert.ok(!pt.errore, pt.errore);
  vicino(pt.lunghezza, 57); assert.strictEqual(pt.dMax, 40);
  assert.deepStrictEqual(pt.punti.slice(0, 4).map(p => [p.x, p.z]), [[0, 0], [20, 0], [20, -25], [30, -25]]);
  assert.strictEqual(pt.punti[2].fil, 2.5); assert.strictEqual(pt.punti[2].smusso, 1); assert.strictEqual(pt.punti[4].raccordo, 1); assert.strictEqual(pt.punti[4].toll, 'h6');
  assert.strictEqual(pt.punti[6].tratto, 'ccw');
  assert.ok(O.puntiTornio([{ tipo: 'arco', d: 30, l: 20, r: 1 }], {}).errore.includes('raggio troppo piccolo'));
  assert.ok(O.puntiTornio([], {}).errore);
  const T = { modo: 'tornio', grezzo: { dg: 40, lg: 80 }, tratti: tr, troncatura: true, foroD: 8 };
  const p = O.proponiLavoro(T, { mat: mt, nmax: 3000 });
  assert.ok(!p.errore, p.errore);
  const ops = p.fasi.map(f => f.op);
  assert.deepStrictEqual([ops[0], ops[1], ops[2], ops[ops.length - 1]], ['sfacciatura', 'foratura', 'profilo', 'troncatura']);
  assert.ok(ops.includes('gola') && ops.includes('filetto') && ops.indexOf('gola') < ops.indexOf('filetto'));
  assert.ok(O.proponiLavoro(Object.assign({}, T, { grezzo: { dg: 30 } }), { mat: mt }).errore.includes('piu grosso del grezzo'));
  // spegnere una fase e correggere i giri
  const kForo = p.fasi[1].chiave, kFil = p.fasi.find(f => f.op === 'filetto').chiave;
  const r = O.programmaLavoro(p, { spente: { [kForo]: true } }, { num: 1, nome: 'A' });
  assert.ok(!r.errore && !r.righe.some(l => /G83|G74|FORO IN ASSE/.test(l)), 'foro spento');
  assert.ok(r.tempo > 0 && r.utensili.length >= 3);
  const r2 = O.programmaLavoro(p, { correzioni: { [kFil]: { n: 777 } } }, { num: 1, nome: 'A' });
  assert.ok(r2.righe.some(l => /S777\b/.test(l)), 'giri corretti nel filetto');
  assert.ok(O.programmaLavoro(p, { spente: Object.fromEntries(p.fasi.map(f => [f.chiave, true])) }, {}).errore.includes('spente'));
  // fresa
  const F = { modo: 'fresa', grezzo: { lx: 100, ly: 60, lz: 20, sovraZ: 1, contorna: true }, forme: [{ tipo: 'tasca', cx: 50, cy: 30, lx: 40, ly: 20, r: 5, prof: 6 }, { tipo: 'foriCerchio', cx: 50, cy: 30, dc: 44, n: 4, a0: 45, d: 8, foro: 'maschio' },
    { tipo: 'foriGriglia', x0: 10, y0: 10, nx: 2, ny: 2, px: 80, py: 40, d: 6.6 }, { tipo: 'asola', x1: 20, y1: 30, x2: 30, y2: 30, w: 8, prof: 4 }, { tipo: 'foro', x: 90, y: 30, d: 10, foro: 'alesato' }] };
  const E = O.entitaFresa(F.forme, F.grezzo);
  assert.strictEqual(E.filter(e => e.tipo === 'punto').length, 9);
  vicino(E[1].x, 50 + 22 * Math.cos(Math.PI / 4), 1e-3);
  const q = O.proponiLavoro(F, { mat: mt, nmax: 8000 });
  assert.ok(!q.errore, q.errore);
  const tit = q.fasi.map(f => f.titolo);
  assert.ok(tit[0].startsWith('Spianatura'), 'spianatura per prima');
  assert.ok(tit[tit.length - 1].startsWith('Contorno esterno'), 'contorno per ultimo');
  assert.ok(tit.some(x => x.startsWith('Maschio M8')) && tit.some(x => x.startsWith('Alesatore')) && tit.some(x => x.startsWith('Asola')));
  const s = O.programmaLavoro(q, {}, { num: 2, nome: 'B' });
  assert.ok(!s.errore, s.errore);
  assert.ok(!O.eseguiISO(s.righe.join('\n')).errore);
  assert.ok(O.proponiLavoro({ modo: 'fresa', grezzo: { lx: 100, ly: 60, lz: 20 }, forme: [] }, { mat: mt }).errore.includes('Aggiungi'));
  assert.ok(O.proponiLavoro({ modo: 'fresa', grezzo: { lx: 100 }, forme: [] }, { mat: mt }).errore.includes('misure'));
});
prova('lavoro: barenatura interna, modelli, costo del pezzo, rampa della tasca', () => {
  const mt = O.MATERIALI.find(m => m.n === 'C40');
  const T = { modo: 'tornio', grezzo: { dg: 50, lg: 80 }, tratti: [{ tipo: 'cil', d: 40, l: 30 }, { tipo: 'cil', d: 46, l: 20 }], troncatura: true, foroD: 20, interno: { di: 24, l: 25, fil: 2 } };
  const p = O.proponiLavoro(T, { mat: mt, nmax: 3000 });
  assert.ok(!p.errore, p.errore);
  const ops = p.fasi.map(f => f.op);
  assert.ok(ops.indexOf('foratura') < ops.indexOf('interna') && ops.indexOf('interna') < ops.indexOf('profilo') && ops.indexOf('profilo') < ops.indexOf('filettoInt') && ops.indexOf('filettoInt') < ops.indexOf('troncatura'), 'ordine: ' + ops.join());
  assert.ok(O.proponiLavoro(Object.assign({}, T, { interno: { di: 15, l: 10 } }), { mat: mt }).errore.includes('piu grande del foro'));
  assert.ok(O.proponiLavoro(Object.assign({}, T, { interno: { di: 49, l: 10 } }), { mat: mt }).errore.includes('poca parete'));
  assert.ok(O.proponiLavoro(Object.assign({}, T, { foroD: '', interno: { di: 24, l: 10 } }), { mat: mt }).errore.includes('foro in asse'));
  assert.ok(!O.eseguiISO(O.programmaLavoro(p, {}, { num: 1, nome: 'A' }).righe.join('\n'), { modo: 'tornio' }).errore);
  // ogni modello da un programma senza errori
  assert.strictEqual(O.MODELLI_LAVORO.length, 8);
  O.MODELLI_LAVORO.forEach(m => {
    const q = O.proponiLavoro(Object.assign({ modo: m.modo }, m.dati()), { mat: mt, nmax: m.modo === 'tornio' ? 3000 : 8000 });
    assert.ok(!q.errore, m.id + ': ' + q.errore);
    const r = O.programmaLavoro(q, {}, { num: 1, nome: 'X' });
    assert.ok(!r.errore && !O.eseguiISO(r.righe.join('\n'), { modo: m.modo }).errore, m.id);
  });
  // costo
  const c = O.costoPezzo({ tempo: 4, utensili: 5, costoOra: 60, materiale: 3, pezzi: 10 });
  vicino(c.tempoPezzo, 5); vicino(c.lavorazione, 5); vicino(c.pezzo, 8); vicino(c.lotto, 80); vicino(c.tempoLotto, 50);
  vicino(O.costoPezzo({ tempo: NaN, utensili: 0, costoOra: 60, materiale: '', pezzi: '' }).pezzo, 0);
  // rampa: la discesa non e mai dritta nelle righe lunghe, e dentro il profilo
  const pts = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 30 }, { x: 30, y: 30 }, { x: 30, y: 60 }, { x: 0, y: 60 }];
  const r = O.gcodeFresa('tascaLibera', { n: 3000, f: 600, t: 1, d: 8, prof: 6, ap: 3, ae: 50, sovra: 0.2, punti: pts });
  const scese = r.percorso.filter(s => !s.rapido && s.z < s.z0 - 1e-9);
  const rampe = scese.filter(s => Math.hypot(s.x - s.x0, s.y - s.y0) > 1);
  assert.ok(rampe.length > 4 && scese.every(s => Math.hypot(s.x - s.x0, s.y - s.y0) > 1 || s.z0 - s.z <= 1.01), 'discese a rampa, non dritte');
  rampe.forEach(s => { const m = Math.atan2(s.z0 - s.z, Math.hypot(s.x - s.x0, s.y - s.y0)) * 180 / Math.PI; assert.ok(m <= 3.01, 'pendenza ' + m); });
  assert.ok(!O.eseguiISO(r.righe.join('\n')).errore);
});
prova('tolleranze: tutti i gradi IT01-IT18 e le classi con ogni grado', () => {
  assert.strictEqual(O.GRADI_IT.length, 20);
  // ogni grado cresce con il grado e con il diametro
  const ord = ['01', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];
  ord.forEach((g, k) => { O.IT[g].forEach((v, i) => { if (i) assert.ok(v >= O.IT[g][i - 1], 'IT' + g + ' cresce col diametro'); if (k) assert.ok(v > O.IT[ord[k - 1]][i], 'IT' + g + ' maggiore del precedente a ' + i); }); });
  // valori di riferimento della norma
  const IT = (d, g) => O.tolleranza(d, 'H' + g).it;
  vicino(IT(25, 7), 21); vicino(IT(25, 6), 13); vicino(IT(40, 8), 39); vicino(IT(100, 9), 87); vicino(IT(10, 11), 90);
  vicino(IT(25, 12), 210); vicino(IT(25, 13), 330); vicino(IT(40, 14), 620); vicino(IT(40, 18), 3900); vicino(IT(200, 16), 2900);
  vicino(IT(25, '01'), 0.6); vicino(IT(25, '0'), 1); vicino(IT(25, 1), 1.5); vicino(IT(25, 4), 6); vicino(IT(2, 1), 0.8);
  // lo stesso grado a fori e alberi, con i sensi giusti
  const h13 = O.tolleranza(25, 'h13'), H13 = O.tolleranza(25, 'H13');
  vicino(h13.sup, 0); vicino(h13.inf, -330); vicino(H13.inf, 0); vicino(H13.sup, 330);
  const js14 = O.tolleranza(40, 'js14'); vicino(js14.sup, 310); vicino(js14.inf, -310);
  const d10 = O.tolleranza(25, 'D10'); vicino(d10.inf, 65); vicino(d10.sup, 65 + 84);
  vicino(O.tolleranza(25, 'f9').sup, -20); vicino(O.tolleranza(25, 'f9').inf, -72);
  vicino(O.tolleranza(25, 'h5').inf, -9); vicino(O.tolleranza(25, 'k4').inf, 2);
  assert.ok(O.tolleranza(25, 'H19').errore.includes('IT18'));
  assert.ok(O.tolleranza(25, 'H7').sup === 21 && O.tolleranza(25, 'g6').sup === -7);
  // la tolleranza scritta a mano usa gli stessi gradi
  const t = O.leggiTolleranza(25, 'h12'); vicino(t.sup, 0); vicino(t.inf, -0.21);
});
prova('funzioni d\'officina: barra seno, ingranaggi, divisore, dilatazione, potenza, tempo', () => {
  // barra seno: 200 mm a 30 gradi = 100 mm; l'inverso torna all'angolo
  vicino(O.barraSeno(200, 30).altezza, 100, 1e-9); vicino(O.barraSeno(100, 0, 50).angolo, 30, 1e-9);
  assert.strictEqual(O.barraSeno(100, 95), null); assert.strictEqual(O.barraSeno(100, 0, 150), null); assert.strictEqual(O.barraSeno(0, 30), null);
  // ingranaggio m2 z30: primitivo 60, esterno 64, fondo 55, passo pi*2, altezza 4,5
  const g = O.ingranaggio(2, 30, 20);
  vicino(g.primitivo, 60); vicino(g.esterno, 64); vicino(g.fondo, 55); vicino(g.passo, 2 * Math.PI); vicino(g.altezzaDente, 4.5); vicino(g.base, 60 * Math.cos(20 * Math.PI / 180));
  vicino(g.interasseCon(60), 90); assert.ok(isNaN(g.interasseCon(0)));
  assert.strictEqual(O.ingranaggio(2, 5), null); assert.strictEqual(O.ingranaggio(2, 30.5), null); assert.strictEqual(O.ingranaggio(0, 30), null);
  // divisore 40:1
  assert.deepStrictEqual(O.divisore(40, 36), { giri: 40 / 36, interi: 1, frazione: [1, 9] });
  assert.deepStrictEqual(O.divisore(40, 8), { giri: 5, interi: 5, frazione: null });
  assert.deepStrictEqual(O.divisore(40, 7).frazione, [5, 7]); assert.strictEqual(O.divisore(40, 7).interi, 5);
  assert.strictEqual(O.divisore(40, 1), null); assert.strictEqual(O.divisore(40, 7.5), null);
  assert.strictEqual(O.divisore(40, 100).interi, 0); assert.deepStrictEqual(O.divisore(40, 100).frazione, [2, 5]);
  // dilatazione: acciaio 500 mm da 20 a 60 gradi = 230 micrometri; alluminio 100 mm a 35 = 34,5
  vicino(O.dilatazione(11.5e-6, 500, 20, 60).delta, 230, 1e-6); vicino(O.dilatazione(23e-6, 100, 20, 35).delta, 34.5, 1e-6);
  vicino(O.dilatazione(11.5e-6, 100, 20, 0).delta, -23, 1e-6); assert.strictEqual(O.dilatazione(0, 100, 20, 30), null);
  // potenza: 5x10 mm a 800 mm/min = 40 cm3/min; con kc 2000 sono 1,33 kW al tagliente
  const p = O.potenzaTaglio(5, 10, 800, 2000, 0.8, 3000);
  vicino(p.asportazione, 40); vicino(p.potenzaTaglio, 4 / 3, 1e-9); vicino(p.potenzaMandrino, 5 / 3, 1e-9); vicino(p.coppia, 5 / 3 * 9550 / 3000, 1e-9);
  assert.strictEqual(O.potenzaTaglio(0, 10, 800, 2000, 0.8, 3000), null);
  assert.ok(O.kcMateriale({ g: 'Alluminio e leghe leggere', n: 'Alluminio' }) < O.kcMateriale({ g: 'Acciai al carbonio', n: 'C40' }) && O.kcMateriale({ g: 'Inox', n: 'AISI 304' }) > O.kcMateriale({ g: 'Acciai al carbonio', n: 'C40' }));
  O.MATERIALI.forEach(m => assert.ok(O.kcMateriale(m) >= 400 && O.kcMateriale(m) <= 3500, m.n));
  // tempo
  vicino(O.tempoTaglio(120, 300, 3).minuti, 1.2, 1e-9); assert.strictEqual(O.tempoTaglio(0, 300), null); assert.strictEqual(O.tempoTaglio(10, 300, 0).passate, 1);
});
prova('dal disegno al pezzo: quote con la posizione, tornio e fresa', () => {
  const mt = O.MATERIALI.find(m => m.n === 'C40');
  // albero di prova (disegnato qui): asse orizzontale, Ø in verticale, lunghezze sotto, cartiglio in basso
  const righe = [
    { t: 'M20x2.5', x: 150, y: 150, w: 30, h: 110, r: 90 }, { t: 'Ø30 h6', x: 420, y: 140, w: 30, h: 120, r: 90 }, { t: 'Ø36', x: 700, y: 160, w: 30, h: 80, r: 90 },
    { t: '25', x: 180, y: 400, w: 40, h: 24, r: 0 }, { t: '20', x: 430, y: 400, w: 40, h: 24, r: 0 }, { t: '15', x: 690, y: 400, w: 40, h: 24, r: 0 }, { t: '60', x: 450, y: 460, w: 40, h: 24, r: 0 },
    { t: '1x45°', x: 80, y: 90, w: 60, h: 22, r: 0 }, { t: 'Materiale: C40', x: 760, y: 470, w: 200, h: 20, r: 0 }, { t: 'Scala 1:1', x: 760, y: 490, w: 120, h: 18, r: 0 },
    { t: 'Tolleranze generali ISO 2768-m', x: 500, y: 490, w: 250, h: 18, r: 0 }, { t: 'Rev. 3 del 12.04', x: 860, y: 450, w: 130, h: 18, r: 0 }];
  const Q = O.quoteDaRighe(righe, 1000, 500);
  assert.deepStrictEqual(Q.map(q => q.tipo), ['filetto', 'diametro', 'diametro', 'lunghezza', 'lunghezza', 'lunghezza', 'lunghezza', 'smusso'], 'il cartiglio non da quote: ' + Q.map(q => q.testo).join());
  assert.ok(Q.every(q => q.stato === 'da' && q.x > 0 && q.x < 1 && q.y > 0 && q.y < 1));
  assert.ok(Q[0].verticale && !Q[3].verticale);
  assert.strictEqual(O.modoDalDisegno(Q), 'tornio');
  assert.strictEqual(O.MATERIALI[O.materialeDa(righe, O.MATERIALI)].n, 'C40');
  const t = O.proponiTornio(Q);
  assert.deepStrictEqual(t.tratti.map(x => [x.d, x.l]), [[20, 25], [30, 20], [36, 15]]);
  assert.strictEqual(t.tratti[0].fil, 2.5); assert.ok(t.tratti[0].gola > 0); assert.strictEqual(t.tratti[1].toll, 'h6');
  assert.strictEqual(t.smussoTesta, 'C1'); assert.strictEqual(t.grezzo.dg, 38); assert.deepStrictEqual(t.dubbi, []);
  assert.ok(!O.proponiLavoro({ modo: 'tornio', grezzo: t.grezzo, tratti: t.tratti, smussoTesta: t.smussoTesta, troncatura: true }, { mat: mt, nmax: 3000 }).errore);
  // la quota scartata non conta: senza il 20 la lunghezza del Ø30 viene dal totale 60, con il dubbio
  const Q2 = Q.map(q => Object.assign({}, q, { stato: q.testo === '20' ? 'no' : 'ok' }));
  const t2 = O.proponiTornio(Q2);
  assert.deepStrictEqual(t2.tratti.map(x => x.l), [25, 20, 15]);
  assert.ok(t2.dubbi.some(d => /ricavata dal totale/.test(d)));
  // testa dall'altra parte: lo stesso disegno specchiato
  const spec = righe.slice(0, 8).map(r => Object.assign({}, r, { x: 1000 - r.x - r.w }));
  const t3 = O.proponiTornio(O.quoteDaRighe(spec, 1000, 500));
  assert.deepStrictEqual(t3.tratti.map(x => x.d), [20, 30, 36], 'la testa e dove c\'e il filetto');
  assert.deepStrictEqual(O.proponiTornio(O.quoteDaRighe(spec, 1000, 500), { invertito: true }).tratti.map(x => x.d), [36, 30, 20]);
  // somma che non torna col totale: si dice
  const r4 = righe.slice(0, 7).map(r => (r.t === '60' ? Object.assign({}, r, { t: '70' }) : r));
  assert.ok(O.proponiTornio(O.quoteDaRighe(r4, 1000, 500)).dubbi.some(d => /non torna con il totale 70/.test(d)));
  // tolleranza scritta da sola vicino al diametro
  const r5 = [{ t: 'Ø25', x: 300, y: 150, w: 30, h: 90, r: 90 }, { t: 'g6', x: 300, y: 250, w: 30, h: 30, r: 90 }, { t: 'Ø40', x: 600, y: 150, w: 30, h: 90, r: 90 }, { t: '30', x: 300, y: 400, w: 40, h: 24, r: 0 }, { t: '20', x: 600, y: 400, w: 40, h: 24, r: 0 }];
  const t5 = O.proponiTornio(O.quoteDaRighe(r5, 1000, 500));
  assert.strictEqual(t5.tratti[0].toll, 'g6'); assert.deepStrictEqual(t5.tratti.map(x => [x.d, x.l]), [[25, 30], [40, 20]]);
  assert.ok(O.proponiTornio([]).errore);
  // piastra di prova
  const p = [{ t: '100', x: 450, y: 470, w: 50, h: 22, r: 0 }, { t: '60', x: 960, y: 230, w: 22, h: 40, r: 90 }, { t: '4x Ø8.5', x: 150, y: 60, w: 110, h: 24, r: 0 }, { t: 'M10', x: 500, y: 250, w: 50, h: 22, r: 0 }, { t: 'sp. 15', x: 800, y: 60, w: 70, h: 22, r: 0 }];
  const QP = O.quoteDaRighe(p, 1000, 500);
  assert.ok(!QP.some(q => q.tipo === 'diametro'), 'il Ø8,5 dei 4 fori non e un diametro in piu');
  assert.strictEqual(O.modoDalDisegno(QP), 'fresa');
  const f = O.proponiFresa(QP);
  assert.deepStrictEqual([f.grezzo.lx, f.grezzo.ly, f.grezzo.lz], [100, 60, 15]);
  assert.strictEqual(f.forme.length, 2); assert.strictEqual(f.forme[0].tipo, 'foriGriglia'); assert.strictEqual(f.forme[0].d, 8.5); assert.strictEqual(f.forme[1].foro, 'maschio');
  assert.ok(f.dubbi.length >= 2, 'le posizioni dei fori sono da controllare');
  const q = O.proponiLavoro({ modo: 'fresa', grezzo: f.grezzo, forme: f.forme }, { mat: mt, nmax: 8000 });
  assert.ok(!q.errore, q.errore);
  assert.strictEqual(O.barraPer(36), 38); assert.strictEqual(O.barraPer(40), 42);
});
prova('disegno: richiami di fori su piu righe, tolleranze geometriche, cartiglio, flangia', () => {
  const Q1 = t => O.estraiQuote(t).map(q => q.tipo + ':' + q.testo);
  // le quote singole come si scrivono in officina
  assert.deepStrictEqual(Q1('⌖ Ø 0.1 A B'), [], 'tolleranza di posizione: non e un foro');
  assert.deepStrictEqual(Q1('◎ Ø 0.05 A'), []);
  assert.deepStrictEqual(Q1('(11.5)'), [], 'quota tra parentesi: di riferimento');
  assert.deepStrictEqual(Q1('17 +0.2'), ['lunghezza:17'], 'lo scostamento non e una lunghezza');
  assert.ok(!Q1('Ø 110 - ISO F11').includes('tolleranza:F11'), 'ISO F11 e la flangia, non una tolleranza');
  assert.deepStrictEqual(Q1('Fresatura 4 Profondità 2'), ['cava:4x2']);
  assert.deepStrictEqual(Q1('30°'), ['angolo:30°']); assert.deepStrictEqual(Q1('A 180°'), ['angolo:180°']);
  assert.deepStrictEqual(Q1('Smussi 0.5 x 45°'), ['smusso:0.5x45°']);
  assert.deepStrictEqual(Q1('N°6 Fori Ø11'), ['fori:6 x Ø11']);
  assert.deepStrictEqual(Q1('N°2 Fori spina Ø 8 H7'), ['fori:2 x Ø8 H7']);
  assert.deepStrictEqual(Q1('4 FORI M8'), ['fori:4 x M8']);
  // flangia di prova rifatta qui (numeri inventati): pianta con richiami e cartiglio
  const W = 1000, H = 1000;
  const r = [
    { t: 'N°6 Fori Ø11', x: 650, y: 80, w: 150, h: 20 }, { t: 'Passanti', x: 650, y: 102, w: 90, h: 20 }, { t: 'Equidistanti', x: 650, y: 124, w: 120, h: 20 },
    { t: '⌖ Ø 0.1 A B', x: 640, y: 150, w: 140, h: 22 },
    { t: 'N°3 Fori Lamati Ø9', x: 80, y: 300, w: 170, h: 20 }, { t: 'Passanti', x: 80, y: 322, w: 90, h: 20 }, { t: 'Lamatura Ø15', x: 80, y: 344, w: 130, h: 20 }, { t: 'Prof.lamatura 9', x: 80, y: 366, w: 140, h: 20 }, { t: 'Equidistanti', x: 80, y: 388, w: 120, h: 20 },
    { t: 'N°2 Fori spina Ø 8 H7 (+0.015', x: 60, y: 560, w: 260, h: 20 }, { t: 'Prof.foro 12', x: 60, y: 582, w: 120, h: 20 }, { t: 'A 180°', x: 60, y: 604, w: 60, h: 20 },
    { t: 'Ø 160', x: 900, y: 450, w: 24, h: 70, r: 90 }, { t: 'Ø 110 - ISO F11', x: 860, y: 430, w: 24, h: 140, r: 90 }, { t: 'Ø 90 - Fori spina', x: 820, y: 430, w: 24, h: 150, r: 90 }, { t: 'Ø 70', x: 780, y: 460, w: 24, h: 60, r: 90 },
    { t: '30°', x: 300, y: 200, w: 40, h: 20 }, { t: 'Fresatura 4 Profondità 2', x: 600, y: 480, w: 180, h: 20 },
    { t: 'Tolleranze (dove non specificato)', x: 500, y: 900, w: 250, h: 18 }, { t: 'Smussi 0.5 x 45°', x: 500, y: 920, w: 150, h: 18 }, { t: 'Raggi 0.4', x: 500, y: 940, w: 100, h: 18 },
    { t: 'Angoli ±0.5°', x: 500, y: 960, w: 100, h: 18 }, { t: '12-03-21', x: 900, y: 30, w: 80, h: 20 }, { t: 'Materiale C40', x: 760, y: 960, w: 150, h: 18 }].map(x => Object.assign({ r: 0 }, x));
  const Q = O.quoteDaRighe(r, W, H);
  const g = Q.filter(q => q.tipo === 'gruppoFori');
  assert.strictEqual(g.length, 3, 'tre richiami di fori: ' + Q.map(q => q.tipo + ':' + q.testo).join(' | '));
  const g6 = g.find(q => q.n === 6), g3 = g.find(q => q.n === 3), g2 = g.find(q => q.n === 2);
  assert.ok(g6.d === 11 && g6.passante && g6.equidistanti, 'N°6 fori passanti equidistanti');
  assert.ok(g3.d === 9 && g3.lamD === 15 && g3.lamProf === 9 && g3.passante, 'lamatura e profondita della lamatura');
  assert.ok(g2.d === 8 && g2.toll === 'H7' && g2.foro === 'alesato' && !g2.passante && g2.prof === 12 && g2.a180, 'fori spina H7 non passanti a 180 gradi');
  assert.ok(!Q.some(q => q.tipo === 'diametro' && q.valore < 1), 'niente Ø0,1 dai riquadri');
  assert.ok(!Q.some(q => /dove non|Raggi|Angoli|12-03/.test(q.riga || '')), 'il cartiglio e la data non danno quote');
  assert.ok(Q.some(q => q.tipo === 'cava' && q.larghezza === 4 && q.prof === 2));
  assert.strictEqual(O.modoDalDisegno(Q), 'fresa');
  const f = O.proponiFresa(Q.map(q => Object.assign(q, { stato: 'ok' })));
  assert.deepStrictEqual([f.grezzo.lx, f.grezzo.ly], [160, 160], 'pezzo tondo Ø160');
  const fc = f.forme.filter(x => x.tipo === 'foriCerchio');
  assert.strictEqual(fc.length, 3);
  const c6 = fc.find(x => x.n === 6), c3 = fc.find(x => x.n === 3), c2 = fc.find(x => x.n === 2);
  assert.ok(c6.dc === 110 && c2.dc === 90 && c3.dc === 70, 'cerchi dei fori: ' + [c6.dc, c3.dc, c2.dc].join());
  assert.ok(c6.cx === 80 && c6.cy === 80, 'centro del pezzo tondo');
  assert.ok(c3.lamD === 15 && c3.lamProf === 9 && c2.foro === 'alesato' && c2.toll === 'H7' && c2.passante === false && c2.prof === 12);
  assert.ok(f.dubbi.some(d => /tondo/.test(d)) && f.dubbi.some(d => /Fresatura 4/.test(d)));
  // dal pezzo al programma: centrino, punte, lamatura, alesatura, nell'ordine di officina
  const mt = O.MATERIALI.find(m => m.n === 'C40');
  assert.ok(f.dubbi.some(d => /Spessore/.test(d)), 'lo spessore non c\'e nella pianta: si chiede');
  const p = O.proponiLavoro({ modo: 'fresa', grezzo: Object.assign({}, f.grezzo, { lz: 20 }), forme: f.forme }, { mat: mt, nmax: 8000 });
  assert.ok(!p.errore, p.errore);
  const t = p.fasi.map(x => x.titolo);
  const i = s => t.findIndex(x => x.startsWith(s));
  assert.ok(i('Lamatura') > i('Punta') && i('Lamatura') >= 0, 'lamatura dopo la punta: ' + t.join(' / '));
  assert.ok(i('Alesatore') > i('Lamatura'));
  const lam = p.fasi.find(x => x.titolo.startsWith('Lamatura'));
  assert.strictEqual(lam.c.punti.length, 3); assert.strictEqual(lam.c.prof, 9); assert.strictEqual(lam.c.d, 15);
  assert.ok(!O.eseguiISO(O.programmaLavoro(p, {}, { num: 1, nome: 'F' }).righe.join('\n')).errore);
});
prova('grafica: contrasto dei colori (WCAG AA) nel tema scuro e in quello chiaro', () => {
  const css = require('fs').readFileSync(require('path').join(__dirname, '..', 'stile.css'), 'utf8');
  const blocco = re => { const m = re.exec(css); const v = {}; (m ? m[1] : '').replace(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g, (x, k, c) => { v[k] = c; }); return v; };
  const scuro = blocco(/^:root\{([^}]*)\}/m), chiaro = Object.assign({}, scuro, blocco(/:root\[data-theme="light"\]\{([^}]*)\}/));
  const lum = c => { const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255).map(x => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const rapp = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  [['scuro', scuro], ['chiaro', chiaro]].forEach(([nome, t]) => {
    ['fondo', 'pannello', 'riga', 'campo', 'testo', 'tenue', 'accento', 'accento2', 'su-accento', 'ok', 'avviso', 'errore', 'g-calcola', 'g-controlla', 'g-officina'].forEach(k => assert.ok(t[k], nome + ': manca --' + k));
    const ctrl = (a, b, min, perche) => assert.ok(rapp(t[a], t[b]) >= min, nome + ': ' + perche + ' ' + rapp(t[a], t[b]).toFixed(2) + ' (serve ' + min + ')');
    ['fondo', 'pannello', 'riga', 'campo'].forEach(s => { ctrl('testo', s, 7, 'testo su ' + s); ctrl('tenue', s, 4.5, 'testo tenue su ' + s); });
    ['pannello', 'riga'].forEach(s => ['accento2', 'ok', 'avviso', 'errore', 'g-calcola', 'g-controlla', 'g-officina'].forEach(k => ctrl(k, s, 4.5, k + ' come testo su ' + s)));
    ctrl('su-accento', 'accento', 4.5, 'testo sui pulsanti');
    ctrl('accento', 'fondo', 3, 'accento come bordo o icona sul fondo');
  });
  // le due palette sono diverse e l'accento e blu
  assert.notStrictEqual(scuro.fondo, chiaro.fondo);
  assert.ok(parseInt(scuro.accento.slice(5, 7), 16) > parseInt(scuro.accento.slice(1, 3), 16), 'accento blu: piu blu che rosso');
});
prova('immagini: icona, testata e sfondo (misure, peso, nel funzionamento senza rete)', () => {
  const fs = require('fs'), path = require('path'), r = p => path.join(__dirname, '..', p);
  const png = p => { const b = fs.readFileSync(r(p)); assert.strictEqual(b.slice(1, 4).toString(), 'PNG', p); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  const jpg = p => { const b = fs.readFileSync(r(p)); assert.strictEqual(b[0], 0xff); assert.strictEqual(b[1], 0xd8); let i = 2; while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1]; if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + b.readUInt16BE(i + 2); } return null; };
  assert.deepStrictEqual(png('icone/icona-512.png'), [512, 512]); assert.deepStrictEqual(png('icone/icona-192.png'), [192, 192]); assert.deepStrictEqual(png('icone/icona-maskable-512.png'), [512, 512]);
  [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]].forEach(([d, n]) => assert.deepStrictEqual(png('android/app/src/main/res/mipmap-' + d + '/ic_launcher.png'), [n, n], d));
  assert.deepStrictEqual(png('android/app/src/main/res/drawable-nodpi/ic_primo_piano.png'), [432, 432]); assert.deepStrictEqual(png('android/app/src/main/res/drawable-nodpi/ic_sfondo.png'), [432, 432]);
  const th = jpg('icone/testata.jpg'), sf = jpg('icone/sfondo.jpg');
  assert.deepStrictEqual(th, [1170, 630]); assert.ok(sf[0] >= 600 && sf[1] / sf[0] > 1.6 && sf[1] / sf[0] < 2.1, 'sfondo verticale');
  ['icone/testata.jpg', 'icone/sfondo.jpg'].forEach(p => assert.ok(fs.statSync(r(p)).size < 300 * 1024, p + ' troppo pesante'));
  const sw = fs.readFileSync(r('sw.js'), 'utf8');
  ['testata.jpg', 'sfondo.jpg', 'icona-192.png', 'icona-512.png', 'icona-maskable-512.png'].forEach(f => assert.ok(sw.includes('./icone/' + f), 'sw.js non ha ' + f));
  const html = ['app.html', 'index.html', 'guida.html', 'novita.html', 'privacy.html', '404.html', 'sw.js', 'manifest.webmanifest', 'tools/sito.js'].map(f => fs.readFileSync(r(f), 'utf8')).join('\n');
  assert.ok(!html.includes('icona.svg'), 'resta un riferimento a icona.svg, che non c\'e piu');
  // tutte le immagini nominate dai file esistono
  (html.match(/icone\/[a-z0-9-]+\.(?:png|jpg)/g) || []).forEach(f => assert.ok(fs.existsSync(r(f)), 'manca ' + f));
});
prova('android: margini del sistema su Android 15 e successivi (barre non coprono il contenuto)', () => {
  const j = require('fs').readFileSync(require('path').join(__dirname, '..', 'android/app/src/main/java/it/hich/officina/MainActivity.java'), 'utf8');
  assert.ok(/private void margini\(\)/.test(j) && /margini\(\);/.test(j), 'manca margini()');
  assert.ok(/SDK_INT < 35/.test(j) && /Type\.systemBars\(\)/.test(j) && /setPadding\(b\.left, b\.top, b\.right, b\.bottom\)/.test(j));
});
prova('spiegazione: righe, lavorazioni a blocchi, riassunto, commento della simulazione', () => {
  const prog = ['%', 'O0001 (PIASTRA)', 'G21 G90 G17 G40 G49', '(PUNTA 8.5)', 'T1 M6', 'G54 G0 X10 Y10', 'G43 H1 Z50 S1200 M3', 'M8', 'G83 X10 Y10 Z-20 R2 Q4 F150', 'X40', 'X70 Y30', 'G80', 'G0 Z100', 'T2 M6', 'G0 X0 Y0', 'G1 Z-3 F300', 'G2 X20 Y0 R10', 'G1 X50', 'M30', '%'].join('\n');
  const r = O.controllaISO(prog), sp = O.spiegaProgramma(prog, r);
  const fr = i => sp.righe[i - 1].frase;
  assert.ok(/Numero del programma: O0001/.test(fr(2)), fr(2));
  assert.ok(/Misure in millimetri/.test(fr(3)) && /Quote assolute/.test(fr(3)), fr(3));
  assert.ok(/Cambio utensile: monta il T1/.test(fr(5)), fr(5));
  assert.ok(/Rapido/.test(fr(6)) && /X 10, Y 10/.test(fr(6)) && /origine pezzo G54/.test(fr(6)), fr(6));
  assert.ok(/correzione della lunghezza utensile \(correttore H1\)/.test(fr(7)) && /1200 giri/.test(fr(7)), fr(7));
  assert.ok(/foratura profonda a gradini/.test(fr(9)) && /fondo Z -20/.test(fr(9)) && /passo Q 4/.test(fr(9)), fr(9));
  assert.ok(/nel punto X 40/.test(fr(10)), fr(10));      // il ciclo resta attivo: la riga con solo X e un altro foro
  assert.ok(/Annulla il ciclo fisso/.test(fr(12)), fr(12));
  assert.ok(/Taglia in linea retta fino a Z -3 con avanzamento 300 mm\/min/.test(fr(16)), fr(16));
  assert.ok(/Arco in senso orario/.test(fr(17)) && /raggio 10/.test(fr(17)), fr(17));
  assert.ok(/Fine del programma/.test(fr(19)), fr(19));
  assert.deepStrictEqual(sp.blocchi.filter(b => b.t != null).map(b => [b.t, b.fori]), [[1, 3], [2, 0]]);
  assert.ok(/Foratura a gradini: 3 fori/.test(sp.blocchi.find(b => b.t === 1).titolo));
  assert.strictEqual(sp.blocchi.find(b => b.t === 2).titolo, 'Fresatura');
  assert.strictEqual(sp.blocchi.find(b => b.t === 1).commento, 'PUNTA 8.5');
  const rs = Object.fromEntries(sp.riassunto);
  assert.ok(rs.Macchina === 'Fresa' && /T1, T2/.test(rs.Utensili) && /Z -20/.test(rs['Profondita massima']) && /M30/.test(rs.Fine), JSON.stringify(rs));
  assert.ok(/movimento 2 di 3/.test(O.commentoPasso(sp, 8, 2, 3)) && !/movimento/.test(O.commentoPasso(sp, 5, 1, 1)));
  // tornio
  const tor = ['G21 G18 G99', 'T0202', 'G50 S2500', 'G96 S180 M3', 'G0 X52 Z2', 'G1 X50 Z0 F.15', 'G71 U1 R.5', 'G71 P10 Q20 U.5 W.1 F.25', 'M30'].join('\n');
  const st = O.spiegaProgramma(tor, O.controllaISO(tor, { modo: 'tornio' }));
  assert.strictEqual(st.modo, 'tornio');
  assert.ok(/Utensile 2 con correttore 2/.test(st.righe[1].frase) && /Limite massimo dei giri: 2500/.test(st.righe[2].frase) && /Velocita di taglio costante a 180 m\/min/.test(st.righe[3].frase), st.righe.map(x => x && x.frase).join(' | '));
  assert.ok(/diametro\) 52/.test(st.righe[4].frase) && /Sgrossatura longitudinale/.test(st.righe[7].frase));
  assert.ok(/Sgrossatura/.test(st.blocchi.find(b => b.t === 2).titolo));
});
prova('correzioni: parentesi, T senza M6, G80, M30 alla fine (e il programma corretto non ha piu quegli errori)', () => {
  const bad = 'G21\nG0 X1 (nota\nT2\nM3 S500\nG1 X5 F100\nG81 X1 Y1 Z-3 R2 F50\nG0 Z50';
  const r = O.controllaISO(bad), c = O.correzioniISO(bad, r);
  assert.deepStrictEqual(c.map(x => x.etichetta).sort(), ['Aggiungi G80 prima', 'Aggiungi M30 alla fine', 'Aggiungi M6', 'Chiudi la parentesi']);
  const buono = O.applicaCorrezioni(bad, c);
  assert.strictEqual(buono, 'G21\nG0 X1 (nota)\nT2 M6\nM3 S500\nG1 X5 F100\nG81 X1 Y1 Z-3 R2 F50\nG80\nG0 Z50\nM30');
  const dopo = O.controllaISO(buono).segnalazioni.filter(q => /parentesi|T senza M6|G80|manca la fine/.test(q.testo));
  assert.deepStrictEqual(dopo, []);
  // una sola correzione; M30 prima del % finale; una parentesi chiusa prima del ; del commento
  assert.strictEqual(O.applicaCorrezioni('G0 X1\n%', [{ op: { riga: Infinity, tipo: 'fine', testo: 'M30' } }]), 'G0 X1\nM30\n%');
  const p2 = 'G0 X1 (a (b ; resto'; assert.strictEqual(O.applicaCorrezioni(p2, O.correzioniISO(p2, { segnalazioni: [{ riga: 0, livello: 'errore', testo: 'parentesi del commento non chiuse' }] })), 'G0 X1 (a (b)) ; resto');
  // niente correzione se non si sa cosa fare
  assert.deepStrictEqual(O.correzioniISO('G1 X5', { segnalazioni: [{ riga: 0, livello: 'errore', testo: 'movimento di lavoro senza avanzamento F' }] }), []);
});
console.log(process.exitCode ? 'PROVE FALLITE' : 'OK ' + n + ' prove');
