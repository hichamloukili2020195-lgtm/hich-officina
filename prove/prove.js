// Prove dei calcoli: node prove/prove.js
'use strict';
const assert = require('assert');
const O = require('../programmi.js');   // carica anche calcoli.js
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

prova('materiali del programma parametrico', () => {
  assert.strictEqual(O.MATERIALI.length, 20);
  const c40 = O.MATERIALI.find(m => m.n === 'C40');
  assert.deepStrictEqual([c40.vc, c40.fz, c40.dvc, c40.dfn, c40.tvc, c40.rvc, c40.rfn, c40.bvc, c40.bfn], [170, .05, 30, .15, 12, 15, .22, 150, .09]);
  O.MATERIALI.forEach(m => ['vc', 'fz', 'ap', 'ae', 'dvc', 'dfn', 'tvc', 'rvc', 'rfn', 'bvc', 'bfn', 'rho'].forEach(k => assert.ok(m[k] > 0, m.n + ' ' + k)));
});
prova('dati di taglio come nel programma parametrico', () => {
  const m = O.MATERIALI.find(x => x.n === 'C40');
  const fr = O.datiTaglio(m, { tipo: 'fresa', d: 10, z: 4 });
  assert.strictEqual(fr.n, 5410); assert.strictEqual(fr.f, Math.round(.05 * 4 * 5410));
  const p = O.datiTaglio(m, { tipo: 'puntaMD', d: 8.5 });
  vicino(p.fn, .15 * .85); assert.strictEqual(p.n, 1120);
  const ins = O.datiTaglio(Object.assign({}, m, { ivc: 200, ifn: .1 }), { tipo: 'puntaIns', d: 20 });
  assert.strictEqual(ins.vc, 200); vicino(ins.fn, .2);
  assert.strictEqual(O.datiTaglio(m, { tipo: 'puntaIns', d: 20 }).vc, 30);   // senza dati: quelli della punta
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
console.log(process.exitCode ? 'PROVE FALLITE' : 'OK ' + n + ' prove');
