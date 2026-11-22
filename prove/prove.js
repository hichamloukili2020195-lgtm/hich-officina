// Prove dei calcoli: node prove/prove.js
'use strict';
const assert = require('assert');
const O = require('../programmi.js');   // carica anche calcoli.js
require('../profilo.js');
require('../iso.js');
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
console.log(process.exitCode ? 'PROVE FALLITE' : 'OK ' + n + ' prove');
