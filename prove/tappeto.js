// Prova a tappeto: molte combinazioni di materiali, diametri, utensili e lavorazioni.
// Ogni programma generato deve uscire senza NaN, senza errori e senza segnalazioni del controllo.
'use strict';
const O = require('../programmi.js');
require('../profilo.js'); require('../iso.js'); require('../spiega.js'); require('../materiale.js'); require('../post.js'); require('../ciclo.js');
let n = 0, guasti = 0;
const dice = m => { guasti++; if (guasti <= 40) console.error('GUASTO: ' + m); };
const nan = r => /NaN|undefined|Infinity/.test(r.righe.join('\n'));
const controlla = (nome, r, modo) => {
  n++;
  if (r.errore) return dice(nome + ': ' + r.errore);
  if (nan(r)) return dice(nome + ': NaN o undefined nel programma');
  const c = O.controllaISO(r.righe.join('\n'), { modo });
  if (c.errore) return dice(nome + ': errore di lettura ' + c.errore);
  const s = c.segnalazioni.filter(x => x.livello !== 'nota');
  if (s.length) dice(nome + ': ' + s.map(x => 'riga ' + (x.riga + 1) + ' ' + x.testo).join(' | '));
  ['ISO', 'cicli', 'dialogo'].forEach(l => {
    const ok = O.LINGUAGGI[l] && O.LINGUAGGI[l][modo];
    if (!ok) return;
    const t = O.postProcessor(r.righe, { linguaggio: l, modo, nome });
    if (t.errore) dice(nome + ' post ' + l + ': ' + t.errore); else if (/NaN|undefined/.test(t.righe.join('\n'))) dice(nome + ' post ' + l + ': NaN');
  });
};
const b = { zSic: 50, zR: 2, n: 3000, f: 600, t: 3 };
const diam = [3, 6, 8, 10, 12, 16, 20, 25, 32, 40, 50];
// fresa
for (const d of [4, 6, 10, 16, 25]) {
  for (const prof of [1, 5, 20]) {
    controlla('spianatura d' + d + ' p' + prof, O.gcodeFresa('spianatura', Object.assign({ lx: 120, ly: 70, prof, ap: Math.min(prof, 2), d: Math.max(d, 20) }, b)), 'fresa');
    controlla('contorno d' + d + ' p' + prof, O.gcodeFresa('contorno', Object.assign({ lx: 80, ly: 50, prof, ap: Math.min(prof, 4), d, sovra: 0.2, finitura: true }, b)), 'fresa');
    controlla('tasca d' + d + ' p' + prof, O.gcodeFresa('tasca', Object.assign({ cx: 40, cy: 25, lx: 50, ly: 30, prof, ap: Math.min(prof, 3), d: Math.min(d, 12), sovra: 0.2, finitura: true }, b)), 'fresa');
    controlla('tascaCirc d' + d + ' p' + prof, O.gcodeFresa('tascaCircolare', Object.assign({ cx: 10, cy: 10, dt: 40, prof, ap: Math.min(prof, 3), d: Math.min(d, 16), sovra: 0.2, finitura: true }, b)), 'fresa');
    controlla('asola d' + d + ' p' + prof, O.gcodeFresa('asola', Object.assign({ x1: 0, y1: 0, x2: 40, y2: 10, w: 14, prof, ap: Math.min(prof, 3), d: Math.min(d, 10) }, b)), 'fresa');
    controlla('profilo d' + d + ' p' + prof, O.gcodeFresa('profilo', Object.assign({ punti: [{ x: 0, y: 0 }, { x: 70, y: 0 }, { x: 70, y: 40, raccordo: 8 }, { x: 0, y: 40, smusso: 4 }], chiuso: true, lato: 'esterno', prof, ap: Math.min(prof, 4), d }, b)), 'fresa');
  }
}
for (const D of [6, 8, 10, 12, 16, 20]) {
  const f = O.MATERIALI.length;
  controlla('filettoFresa interno M' + D, O.gcodeFresa('filettoFresa', Object.assign({ D, p: O.passoGrosso ? O.passoGrosso(D) : 1.5, prof: 12, d: Math.max(3, D * 0.55), np: 1 }, b)), 'fresa');
  controlla('filettoFresa esterno M' + D, O.gcodeFresa('filettoFresa', Object.assign({ D, p: O.passoGrosso ? O.passoGrosso(D) : 1.5, prof: 12, d: Math.max(3, D * 0.55), tipoFil: 'esterno' }, b)), 'fresa');
}
// fori: ogni ciclo con ogni schema
const schemi = [{ tipo: 'cerchio', dc: 60, n: 6 }, { tipo: 'griglia', nx: 3, ny: 2, px: 20, py: 15 }, { tipo: 'elenco', testo: '10 10\n30 10\n30 40' }];
for (const s of schemi) for (const ciclo of ['G81', 'G82', 'G83', 'G73', 'G84', 'G85', 'G86']) for (const prof of [5, 25]) {
  const pts = O.schemaFori(s);
  controlla('fori ' + s.tipo + ' ' + ciclo + ' p' + prof, O.gcodeFresa('fori', Object.assign({ punti: pts, prof, ciclo, q: 4, d: 8 }, b)), 'fresa');
}
// tornio
const bt = { nmax: 3000, vc: 200, f: 0.2, t: 1, dg: 40 };
for (const metodo of ['passate', 'ciclo']) {
  for (const smusso of [0, 1]) for (const ap of [1, 2.5]) controlla('sgrossatura ' + metodo + ' s' + smusso + ' ap' + ap, O.gcodeTornio('sgrossatura', Object.assign({}, bt, { df: 30, l: 50, ap, sx: 0.4, sz: 0.1, finitura: true, smusso, metodo })), 'tornio');
  controlla('gola ' + metodo, O.gcodeTornio('gola', Object.assign({}, bt, { dfondo: 34, zg: -20, b: 8, w: 3, metodo })), 'tornio');
  controlla('foratura ' + metodo, O.gcodeTornio('foratura', Object.assign({}, bt, { dg: 50, dpunta: 20, prof: 40, q: 10, giri: 800, metodo })), 'tornio');
  for (const [d, p] of [[10, 1.5], [20, 2.5], [30, 3.5]]) controlla('filetto M' + d + ' ' + metodo, O.gcodeTornio('filetto', Object.assign({}, bt, { dg: d, d, p, l: 25, n: 8, giri: 600, metodo })), 'tornio');
  controlla('profilo ' + metodo, O.gcodeTornio('profilo', Object.assign({}, bt, { punti: [{ x: 0, z: 0 }, { x: 16, z: 0 }, { x: 20, z: -2 }, { x: 20, z: -20 }, { x: 30, z: -25, tratto: 'ccw', r: 5 }, { x: 30, z: -40 }, { x: 40, z: -40 }], ap: 2, sx: 0.4, sz: 0.1, ff: 0.1, finitura: true, metodo })), 'tornio');
}
controlla('sfacciatura', O.gcodeTornio('sfacciatura', Object.assign({}, bt, { s: 2, ap: 1 })), 'tornio');
controlla('interna', O.gcodeTornio('interna', Object.assign({}, bt, { dp: 20, di: 30, dg: 60, l: 25, ap: 1, sx: 0.3, sz: 0.1, finitura: true, smusso: 0.5 })), 'tornio');
controlla('filettoInt', O.gcodeTornio('filettoInt', Object.assign({}, bt, { dg: 50, d: 30, p: 2, l: 20, n: 8, giri: 600 })), 'tornio');
controlla('troncatura', O.gcodeTornio('troncatura', Object.assign({}, bt, { zt: -30, w: 3, q: 3 })), 'tornio');
// ciclo di lavoro proposto per ogni materiale
for (const mt of O.MATERIALI.filter(x => x.lvc > 0)) {
  n++;
  const a = O.pianificaAlbero({ dg: 40, lg: 100, smusso: 0.5, tratti: [{ d: 20, l: 25, passo: 2.5 }, { d: 30, l: 20, toll: 'h6' }, { d: 36, l: 15 }], foro: { d: 8, prof: 20 }, troncatura: true }, { mat: mt, nmax: 3000 });
  if (a.errore) { dice('albero ' + mt.n + ': ' + a.errore); continue; }
  const r = O.gcodeSequenzaTornio(a.fasi, { num: 1 });
  if (r.errore) dice('albero ' + mt.n + ': ' + r.errore); else controlla('albero ' + mt.n, r, 'tornio');
  const p = O.pianificaPiastra({ gx: 105, gy: 85, gz: 22, fx: 100, fy: 80, fz: 20, tasche: [{ tipo: 'rett', cx: 50, cy: 40, lx: 40, ly: 30, prof: 8, r: 6 }, { tipo: 'circ', cx: 20, cy: 20, dt: 24, prof: 5 }],
    fori: [{ tipo: 'maschio', d: 8, passante: true, schema: 'griglia', x0: 10, y0: 10, nx: 2, ny: 2, px: 80, py: 60 }, { tipo: 'alesato', d: 10, prof: 15, schema: 'elenco', testo: '30 70\n70 10' }] }, { mat: mt, nmax: 12000 });
  if (p.errore) { dice('piastra ' + mt.n + ': ' + p.errore); continue; }
  const q = O.gcodeSequenza(p.fasi, { num: 1 });
  if (q.errore) dice('piastra ' + mt.n + ': ' + q.errore); else controlla('piastra ' + mt.n, q, 'fresa');
}
// dati di taglio: mai NaN, sempre positivi
for (const mt of O.MATERIALI) for (const t of O.UTENSILI.map(x => x[0])) for (const d of diam) {
  n++;
  const r = O.datiTaglio(mt, { tipo: t, d, z: 3, passo: 1.5, nmax: 12000 });
  if (!r) { if (t !== 'inserto') dice('datiTaglio null ' + mt.n + ' ' + t + ' D' + d); continue; }
  if (!(r.n > 0) || !(r.f > 0) || !isFinite(r.n) || !isFinite(r.f)) dice('datiTaglio non valido ' + mt.n + ' ' + t + ' D' + d + ' ' + JSON.stringify(r));
}
// valori estremi: nessun NaN, o un errore chiaro
for (const v of [0, -5, NaN, Infinity, 1e9, '', null, undefined]) {
  n++;
  for (const [nome, f] of [['fresa', () => O.gcodeFresa('spianatura', { n: v, f: v, lx: v, ly: v, prof: v, ap: v, d: v })], ['tornio', () => O.gcodeTornio('sgrossatura', { dg: v, df: v, l: v, ap: v, vc: v, f: v, nmax: v })], ['filetto', () => O.filetto(v, v)], ['tolleranza', () => O.tolleranza(v, 'H7')], ['cono', () => O.cono(v, v, v)], ['peso', () => O.peso('tondo', { d: v, l: v }, v)]]) {
    try { const r = f(); const t = JSON.stringify(r === undefined ? null : r); if (r && r.righe && r.righe.length && /NaN|Infinity/.test(r.righe.join('\n'))) dice('estremo ' + nome + ' ' + v + ': NaN nel programma'); }
    catch (e) { dice('estremo ' + nome + ' ' + v + ': eccezione ' + e.message); }
  }
}
console.log(guasti ? 'TAPPETO: ' + guasti + ' guasti su ' + n + ' prove' : 'OK tappeto: ' + n + ' prove');
process.exit(guasti ? 1 : 0);
