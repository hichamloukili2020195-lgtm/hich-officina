// ===== Hich-Officina: scambio di disegni in formato DXF (scritto da noi, nessuna libreria) =====
// Scrive un DXF di testo semplice (stile R12: LINE, CIRCLE, POINT, POLYLINE con archi a "bulge") che tutti i programmi leggono.
// Legge LINE, ARC, CIRCLE, POINT, LWPOLYLINE e POLYLINE; unisce rette e archi con gli estremi uguali in profili.
// Non legge: spline, ellisse, quote, testi, blocchi (si dice quanti ne ha saltati).
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  const r3 = x => Math.round(x * 1000) / 1000 + 0;
  const num = v => { const n = Number(String(v === undefined || v === null ? '' : v).replace(',', '.')); return v === '' || v === null || v === undefined ? NaN : n; };
  const f4 = x => String(Math.round(x * 10000) / 10000 + 0);
  const norma = a => { while (a < 0) a += 2 * Math.PI; while (a >= 2 * Math.PI) a -= 2 * Math.PI; return a; };

  // ======================= scrittura =======================
  const pulisciLayer = s => String(s || '0').replace(/[<>\/\\":;?*|=`\r\n]/g, '_').slice(0, 31) || '0';
  /** Vertici con bulge di un'entita chiusa o aperta (rette e archi, raccordi compresi). Ritorna {v:[{x,y,b}], chiuso} oppure null. */
  function vertici(e) {
    const pr = O.profiloCAD(e);
    if (!pr) return null;
    const g = O.costruisciProfilo(pr.punti.map(p => ({ a: p.x, b: p.y, tratto: p.tratto, r: p.r, raccordo: p.raccordo, smusso: p.smusso })), pr.chiuso);
    if (g.errore || !g.tratti.length) return null;
    const v = [];
    g.tratti.forEach(t => {
      let b = 0;
      if (t.tipo === 'A') {
        const a1 = Math.atan2(t.p.b - t.c.b, t.p.a - t.c.a), a2 = Math.atan2(t.q.b - t.c.b, t.q.a - t.c.a), sw = t.cw ? norma(a1 - a2) : norma(a2 - a1);
        b = Math.tan((sw || 0) / 4) * (t.cw ? -1 : 1);
      }
      v.push({ x: t.p.a, y: t.p.b, b });
    });
    const u = g.tratti[g.tratti.length - 1];
    if (!pr.chiuso) v.push({ x: u.q.a, y: u.q.b, b: 0 });
    return { v, chiuso: pr.chiuso };
  }
  /** Il disegno (lista di entita del CAD) in testo DXF. */
  function scriviDXF(entita) {
    const o = [];
    const g = (c, v) => { o.push(String(c), String(v)); };
    g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$ACADVER'); g(1, 'AC1009'); g(9, '$INSUNITS'); g(70, 4); g(0, 'ENDSEC');
    const layer = [...new Set((entita || []).map(e => pulisciLayer(e.layer)).concat(['0']))];
    g(0, 'SECTION'); g(2, 'TABLES'); g(0, 'TABLE'); g(2, 'LAYER'); g(70, layer.length);
    layer.forEach(l => { g(0, 'LAYER'); g(2, l); g(70, 0); g(62, 7); g(6, 'CONTINUOUS'); });
    g(0, 'ENDTAB'); g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'ENTITIES');
    (entita || []).forEach(e => {
      const L = pulisciLayer(e.layer);
      if (e.tipo === 'punto') { g(0, 'POINT'); g(8, L); g(10, f4(num(e.x))); g(20, f4(num(e.y))); g(30, 0); return; }
      if (e.tipo === 'cerchio') { g(0, 'CIRCLE'); g(8, L); g(10, f4(num(e.cx))); g(20, f4(num(e.cy))); g(30, 0); g(40, f4(num(e.r))); return; }
      if (e.tipo === 'testo') {
        (O.tratteTesto ? O.tratteTesto(e) : []).forEach(tr => {
          if (tr.length === 2) { g(0, 'LINE'); g(8, L); g(10, f4(tr[0][0])); g(20, f4(tr[0][1])); g(30, 0); g(11, f4(tr[1][0])); g(21, f4(tr[1][1])); g(31, 0); return; }
          g(0, 'POLYLINE'); g(8, L); g(66, 1); g(10, 0); g(20, 0); g(30, 0); g(70, 0);
          tr.forEach(p => { g(0, 'VERTEX'); g(8, L); g(10, f4(p[0])); g(20, f4(p[1])); g(30, 0); });
          g(0, 'SEQEND'); g(8, L);
        });
        return;
      }
      const q = vertici(e);
      if (!q) return;
      if (!q.chiuso && q.v.length === 2 && !q.v[0].b) { g(0, 'LINE'); g(8, L); g(10, f4(q.v[0].x)); g(20, f4(q.v[0].y)); g(30, 0); g(11, f4(q.v[1].x)); g(21, f4(q.v[1].y)); g(31, 0); return; }
      g(0, 'POLYLINE'); g(8, L); g(66, 1); g(10, 0); g(20, 0); g(30, 0); g(70, q.chiuso ? 1 : 0);
      q.v.forEach(p => { g(0, 'VERTEX'); g(8, L); g(10, f4(p.x)); g(20, f4(p.y)); g(30, 0); if (p.b) g(42, f4(p.b)); });
      g(0, 'SEQEND'); g(8, L);
    });
    g(0, 'ENDSEC'); g(0, 'EOF');
    return o.join('\r\n') + '\r\n';
  }

  // ======================= lettura =======================
  function coppie(testo) {
    const R = String(testo || '').split(/\r\n|\n|\r/), out = [];
    for (let i = 0; i + 1 < R.length; i += 2) { const c = parseInt(R[i].trim(), 10); if (!isFinite(c)) { i--; continue; } out.push([c, R[i + 1].trim()]); }
    return out;
  }
  /**
   * Legge un DXF di testo. Ritorna {entita:[...] (formato del CAD, senza id), avvisi:[...], unita, saltati:{TIPO:n}} oppure {errore}.
   * I pezzi con gli estremi uguali (entro 0,01 mm) si uniscono in un solo profilo; un rettangolo con i lati sugli assi diventa rettangolo.
   */
  function leggiDXF(testo) {
    if (!/\bENTITIES\b/.test(String(testo || ''))) return { errore: 'Non sembra un file DXF di testo (manca la sezione ENTITIES). I DXF binari non si leggono.' };
    const C = coppie(testo), avvisi = [], saltati = {};
    let k = 0, fattore = 1, unita = 'mm';
    // unita dall'intestazione
    for (let i = 0; i < C.length; i++) if (C[i][0] === 9 && C[i][1] === '$INSUNITS' && C[i + 1] && C[i + 1][0] === 70) { const u = Number(C[i + 1][1]); if (u === 1) { fattore = 25.4; unita = 'pollici'; } else if (u === 5) { fattore = 10; unita = 'cm'; } else if (u === 6) { fattore = 1000; unita = 'm'; } }
    while (k < C.length && !(C[k][0] === 2 && C[k][1] === 'ENTITIES')) k++;
    k++;
    const pezzi = [], altre = [];       // pezzi: rette e archi da unire; altre: entita gia pronte
    const leggi = () => {   // un'entita: ritorna {tipo, dati: Map-like con liste per codice}
      const tipo = C[k][1], d = { ord: [] }; k++;
      while (k < C.length && C[k][0] !== 0) { (d[C[k][0]] = d[C[k][0]] || []).push(C[k][1]); d.ord.push(C[k]); k++; }
      return { tipo, d };
    };
    const n1 = (d, c, def) => (d[c] && isFinite(Number(d[c][0]))) ? Number(d[c][0]) : def;
    const S = x => x * fattore;
    const vert = [];   // vertici di una polilinea: {x,y,b}
    const polilinea = (d, chiuso, v, layer) => {
      if (v.length < 2) return;
      const punti = [{ x: r3(S(v[0].x)), y: r3(S(v[0].y)) }];
      const ultimo = chiuso ? v.length : v.length - 1;
      for (let i = 0; i < ultimo; i++) {
        const a = v[i], b = v[(i + 1) % v.length], p = { x: r3(S(b.x)), y: r3(S(b.y)) };
        if (a.b) {
          const sw = 4 * Math.atan(Math.abs(a.b)), dd = Math.hypot(S(b.x - a.x), S(b.y - a.y)), R = dd / (2 * Math.sin(sw / 2));
          p.tratto = a.b > 0 ? 'ccw' : 'cw'; p.r = r3(sw > Math.PI + 1e-9 ? -R : R);
        }
        if (chiuso && i === v.length - 1) { if (p.tratto) { punti[0].tratto = p.tratto; punti[0].r = p.r; } }
        else punti.push(p);
      }
      altre.push({ tipo: 'poli', punti, chiuso: !!chiuso, lav: [], layer });
    };
    while (k < C.length && !(C[k][0] === 0 && (C[k][1] === 'ENDSEC' || C[k][1] === 'EOF'))) {
      if (C[k][0] !== 0) { k++; continue; }
      const { tipo, d } = leggi();
      const layer = d[8] ? d[8][0] : '0';
      if (tipo === 'LINE') pezzi.push({ a: { x: S(n1(d, 10, 0)), y: S(n1(d, 20, 0)) }, b: { x: S(n1(d, 11, 0)), y: S(n1(d, 21, 0)) }, layer });
      else if (tipo === 'ARC') {
        const cx = S(n1(d, 10, 0)), cy = S(n1(d, 20, 0)), r = S(n1(d, 40, 0)), a1 = n1(d, 50, 0) * Math.PI / 180, a2 = n1(d, 51, 0) * Math.PI / 180, sw = norma(a2 - a1) || 2 * Math.PI;
        pezzi.push({ a: { x: cx + r * Math.cos(a1), y: cy + r * Math.sin(a1) }, b: { x: cx + r * Math.cos(a2), y: cy + r * Math.sin(a2) }, arco: { tratto: 'ccw', r: sw > Math.PI + 1e-9 ? -r : r }, layer });
      } else if (tipo === 'CIRCLE') altre.push({ tipo: 'cerchio', cx: r3(S(n1(d, 10, 0))), cy: r3(S(n1(d, 20, 0))), r: r3(S(n1(d, 40, 0))), lav: [], layer });
      else if (tipo === 'POINT') altre.push({ tipo: 'punto', x: r3(S(n1(d, 10, 0))), y: r3(S(n1(d, 20, 0))), lav: [], layer });
      else if (tipo === 'LWPOLYLINE') {
        // le coordinate si ripetono: il bulge (42) va col vertice che lo precede
        const v = []; let cur = null;
        d.ord.forEach(([c, val]) => { if (c === 10) { cur = { x: Number(val), y: 0, b: 0 }; v.push(cur); } else if (c === 20 && cur) cur.y = Number(val); else if (c === 42 && cur) cur.b = Number(val); });
        polilinea(d, (n1(d, 70, 0) & 1) === 1, v, layer);
      } else if (tipo === 'POLYLINE') {
        const chiuso = (n1(d, 70, 0) & 1) === 1, v = [];
        while (k < C.length && C[k][0] === 0 && C[k][1] === 'VERTEX') { const w = leggi(); v.push({ x: n1(w.d, 10, 0), y: n1(w.d, 20, 0), b: n1(w.d, 42, 0) }); }
        if (k < C.length && C[k][0] === 0 && C[k][1] === 'SEQEND') leggi();
        polilinea(d, chiuso, v, layer);
      } else if (tipo === 'VERTEX' || tipo === 'SEQEND') { /* gia letti */ }
      else saltati[tipo] = (saltati[tipo] || 0) + 1;
    }
    // ---------- unione di rette e archi ----------
    const TOL = 0.01, chiave = p => Math.round(p.x / TOL) + '|' + Math.round(p.y / TOL);
    const usato = new Array(pezzi.length).fill(false), perEstremo = new Map();
    pezzi.forEach((s, i) => { [s.a, s.b].forEach(p => { const c = chiave(p); if (!perEstremo.has(c)) perEstremo.set(c, []); perEstremo.get(c).push(i); }); });
    const cercaVicino = (p, scarta) => { const c = chiave(p); return (perEstremo.get(c) || []).find(i => !usato[i] && i !== scarta); };
    const rovescia = s => ({ a: s.b, b: s.a, arco: s.arco ? { tratto: s.arco.tratto === 'ccw' ? 'cw' : 'ccw', r: s.arco.r } : null, layer: s.layer });
    pezzi.forEach((s0, i0) => {
      if (usato[i0]) return;
      usato[i0] = true;
      let catena = [s0];
      for (;;) {   // in avanti
        const ult = catena[catena.length - 1], j = cercaVicino(ult.b, -1);
        if (j === undefined) break;
        usato[j] = true; const s = pezzi[j]; catena.push(chiave(s.a) === chiave(ult.b) ? s : rovescia(s));
      }
      for (;;) {   // all'indietro
        const prima = catena[0], j = cercaVicino(prima.a, -1);
        if (j === undefined) break;
        usato[j] = true; const s = pezzi[j]; catena.unshift(chiave(s.b) === chiave(prima.a) ? s : rovescia(s));
      }
      const chiuso = catena.length >= 2 && chiave(catena[catena.length - 1].b) === chiave(catena[0].a);
      const punti = [{ x: r3(catena[0].a.x), y: r3(catena[0].a.y) }];
      catena.forEach((s, i) => {
        const p = { x: r3(s.b.x), y: r3(s.b.y) };
        if (s.arco) { p.tratto = s.arco.tratto; p.r = r3(s.arco.r); }
        if (chiuso && i === catena.length - 1) { if (p.tratto) { punti[0].tratto = p.tratto; punti[0].r = p.r; } } else punti.push(p);
      });
      altre.push({ tipo: 'poli', punti, chiuso, lav: [], layer: s0.layer });
    });
    // ---------- rettangoli ----------
    const entita = altre.map(e => {
      if (e.tipo === 'poli' && e.chiuso && e.punti.length === 4 && !e.punti.some(p => p.tratto)) {
        const P = e.punti, ok = [0, 1, 2, 3].every(i => { const a = P[i], b = P[(i + 1) % 4]; return Math.abs(a.x - b.x) < 1e-6 || Math.abs(a.y - b.y) < 1e-6; }) && (Math.abs(P[0].x - P[1].x) < 1e-6) !== (Math.abs(P[1].x - P[2].x) < 1e-6);
        if (ok) { const xs = P.map(p => p.x), ys = P.map(p => p.y); return { tipo: 'rett', x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), r: 0, lav: [], layer: e.layer }; }
      }
      return e;
    });
    if (!entita.length) return { errore: 'Nel file non ho trovato nulla che si possa leggere (rette, archi, cerchi, punti, polilinee).' };
    const sk = Object.keys(saltati);
    if (sk.length) avvisi.push('Non letti: ' + sk.map(t => saltati[t] + ' ' + t).join(', ') + '.');
    if (fattore !== 1) avvisi.push('Il file e in ' + unita + ': convertito in millimetri.');
    return { entita, avvisi, unita, saltati };
  }

  const Dxf = { scriviDXF, leggiDXF };
  Object.assign(O, Dxf);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
