// ===== Hich-Officina: modifiche al disegno CAD (senza interfaccia) =====
// Sposta, ruota, scala, specchia, copia in serie, offset (parallela), raccordo e smusso su un vertice, taglia/estendi,
// selezione a finestra. Lavora sulle entita di cad.js (poli, rett, cerchio, punto, asola); ogni funzione ritorna entita nuove
// (senza id: lo da il chiamante) oppure {errore}. Gli archi dei profili: il raggio negativo e un arco oltre i 180 gradi.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  const r3 = x => Math.round(x * 1000) / 1000 + 0;
  const num = v => { const n = Number(String(v === undefined || v === null ? '' : v).replace(',', '.')); return v === '' || v === null || v === undefined ? NaN : n; };
  const copia = e => JSON.parse(JSON.stringify(e));
  const RAD = Math.PI / 180;

  // ---------- trasformazioni ----------
  /** Una trasformazione: {tipo:'sposta', dx, dy} | {tipo:'ruota', cx, cy, ang} | {tipo:'scala', cx, cy, k} | {tipo:'specchia', x1, y1, x2, y2}. Ritorna una funzione punto. */
  function mappa(T) {
    if (T.tipo === 'sposta') return (x, y) => [x + T.dx, y + T.dy];
    if (T.tipo === 'ruota') { const c = Math.cos(T.ang * RAD), s = Math.sin(T.ang * RAD); return (x, y) => [T.cx + (x - T.cx) * c - (y - T.cy) * s, T.cy + (x - T.cx) * s + (y - T.cy) * c]; }
    if (T.tipo === 'scala') return (x, y) => [T.cx + (x - T.cx) * T.k, T.cy + (y - T.cy) * T.k];
    if (T.tipo === 'specchia') {
      const dx = T.x2 - T.x1, dy = T.y2 - T.y1, L2 = dx * dx + dy * dy;
      return (x, y) => { const t = ((x - T.x1) * dx + (y - T.y1) * dy) / L2, px = T.x1 + t * dx, py = T.y1 + t * dy; return [2 * px - x, 2 * py - y]; };
    }
    return (x, y) => [x, y];
  }
  const quasi = (a, b) => Math.abs(a - b) < 1e-9;
  /** Il rettangolo resta rettangolo solo se la trasformazione lo lascia con i lati sugli assi. */
  const restaRett = T => T.tipo === 'sposta' || T.tipo === 'scala' || (T.tipo === 'ruota' && quasi(((T.ang % 90) + 90) % 90, 0)) || (T.tipo === 'specchia' && (quasi(T.x1, T.x2) || quasi(T.y1, T.y2)));

  /** Trasforma un'entita e ne ritorna una copia (stesse lavorazioni e layer). */
  function trasforma(e, T) {
    if (T.tipo === 'scala' && !(T.k > 0)) return { errore: 'Il fattore di scala deve essere maggiore di zero.' };
    if (T.tipo === 'specchia' && Math.hypot(T.x2 - T.x1, T.y2 - T.y1) < 1e-9) return { errore: 'I due punti dell\'asse di simmetria coincidono.' };
    const f = mappa(T), k = T.tipo === 'scala' ? T.k : 1, spec = T.tipo === 'specchia';
    let n = copia(e); delete n.id;
    const P = p => { const q = f(num(p.x), num(p.y)); return [r3(q[0]), r3(q[1])]; };
    // i vincoli valgono ancora solo se l'elemento si sposta soltanto (e senza punti bloccati o legati ad altri elementi)
    if (n.vinc) { n.vinc = T.tipo === 'sposta' ? n.vinc.filter(c => c.t !== 'FIX' && c.t !== 'COI' && c.e2 === undefined) : []; if (!n.vinc.length) delete n.vinc; }
    if (e.tipo === 'poli') {
      n.punti = (e.punti || []).map(p => {
        const q = P(p), o = Object.assign({}, p, { x: q[0], y: q[1] });
        if (spec && (p.tratto === 'cw' || p.tratto === 'ccw')) o.tratto = p.tratto === 'cw' ? 'ccw' : 'cw';
        if (k !== 1) { if (num(p.r)) o.r = r3(num(p.r) * k); if (num(p.raccordo)) o.raccordo = r3(num(p.raccordo) * k); if (num(p.smusso)) o.smusso = r3(num(p.smusso) * k); }
        return o;
      });
    } else if (e.tipo === 'rett') {
      if (restaRett(T)) {
        const a = P({ x: e.x0, y: e.y0 }), b = P({ x: e.x1, y: e.y1 });
        n.x0 = a[0]; n.y0 = a[1]; n.x1 = b[0]; n.y1 = b[1];
        if (num(e.r)) n.r = r3(num(e.r) * k);
      } else {
        const pr = O.profiloCAD(e);
        n = { tipo: 'poli', chiuso: true, lav: copia(e.lav || []), layer: e.layer, punti: pr.punti.map(p => { const q = P(p); return { x: q[0], y: q[1], raccordo: r3((p.raccordo || 0) * k) }; }) };
      }
    } else if (e.tipo === 'cerchio') { const c = P({ x: e.cx, y: e.cy }); n.cx = c[0]; n.cy = c[1]; n.r = r3(num(e.r) * k); }
    else if (e.tipo === 'punto') { const c = P(e); n.x = c[0]; n.y = c[1]; }
    else if (e.tipo === 'asola') { const a = P({ x: e.x1, y: e.y1 }), b = P({ x: e.x2, y: e.y2 }); n.x1 = a[0]; n.y1 = a[1]; n.x2 = b[0]; n.y2 = b[1]; n.w = r3(num(e.w) * k); }
    else return { errore: 'Questo elemento non si puo trasformare.' };
    return n;
  }

  /** Copie in fila: n e il numero totale di elementi (l'originale compreso). Ritorna le n-1 copie. */
  function serieLineare(e, dx, dy, n) {
    n = Math.round(n);
    if (!(n >= 2) || n > 500) return { errore: 'Il numero di elementi deve essere tra 2 e 500.' };
    if (Math.hypot(dx, dy) < 1e-9) return { errore: 'Il passo e zero: le copie sarebbero una sopra l\'altra.' };
    const out = [];
    for (let i = 1; i < n; i++) { const c = trasforma(e, { tipo: 'sposta', dx: dx * i, dy: dy * i }); if (c.errore) return c; out.push(c); }
    return out;
  }
  /** Copie sul cerchio attorno a (cx, cy): n elementi totali in angTot gradi (360 = giro completo). Le copie sono ruotate. */
  function seriePolare(e, cx, cy, n, angTot) {
    n = Math.round(n); angTot = Number(angTot);
    if (!(n >= 2) || n > 500) return { errore: 'Il numero di elementi deve essere tra 2 e 500.' };
    if (!isFinite(angTot) || Math.abs(angTot) < 1e-9) return { errore: 'Scrivi l\'angolo totale (360 per il giro completo).' };
    const passo = Math.abs(Math.abs(angTot) - 360) < 1e-9 ? angTot / n : angTot / (n - 1), out = [];
    for (let i = 1; i < n; i++) { const c = trasforma(e, { tipo: 'ruota', cx, cy, ang: passo * i }); if (c.errore) return c; out.push(c); }
    return out;
  }

  // ---------- offset (parallela) ----------
  const norma = a => { while (a < 0) a += 2 * Math.PI; while (a >= 2 * Math.PI) a -= 2 * Math.PI; return a; };
  function areaFirmata(tratti) {
    const poli = O.polilineaProfilo(tratti, 0.5);
    let s = 0;
    for (let i = 0; i < poli.length; i++) { const p = poli[i], q = poli[(i + 1) % poli.length]; s += p.a * q.b - q.a * p.b; }
    return s / 2;
  }
  const cerchioDa = t => ({ cx: t.c.a, cy: t.c.b, r: t.r });
  const rettaDa = t => ({ ax: t.p.a, ay: t.p.b, bx: t.q.a, by: t.q.b });
  function interRettaRetta(s, t) {
    const d1x = s.bx - s.ax, d1y = s.by - s.ay, d2x = t.bx - t.ax, d2y = t.by - t.ay, den = d1x * d2y - d1y * d2x;
    if (Math.abs(den) < 1e-12) return [];
    const u = ((t.ax - s.ax) * d2y - (t.ay - s.ay) * d2x) / den;
    return [{ x: s.ax + u * d1x, y: s.ay + u * d1y }];
  }
  function interRettaCerchio(s, c) {
    const dx = s.bx - s.ax, dy = s.by - s.ay, fx = s.ax - c.cx, fy = s.ay - c.cy, a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), cc = fx * fx + fy * fy - c.r * c.r, D = b * b - 4 * a * cc;
    if (a < 1e-12 || D < 0) return [];
    const r = Math.sqrt(D);
    return [(-b - r) / (2 * a), (-b + r) / (2 * a)].map(u => ({ x: s.ax + u * dx, y: s.ay + u * dy }));
  }
  function interCerchioCerchio(c1, c2) {
    const d = Math.hypot(c2.cx - c1.cx, c2.cy - c1.cy);
    if (d < 1e-9 || d > c1.r + c2.r + 1e-9 || d < Math.abs(c1.r - c2.r) - 1e-9) return [];
    const a = (c1.r * c1.r - c2.r * c2.r + d * d) / (2 * d), h = Math.sqrt(Math.max(0, c1.r * c1.r - a * a)), mx = c1.cx + a * (c2.cx - c1.cx) / d, my = c1.cy + a * (c2.cy - c1.cy) / d;
    return [{ x: mx + h * (c2.cy - c1.cy) / d, y: my - h * (c2.cx - c1.cx) / d }, { x: mx - h * (c2.cy - c1.cy) / d, y: my + h * (c2.cx - c1.cx) / d }];
  }
  const interElementi = (A, B) => {
    if (A.tipo === 'L' && B.tipo === 'L') return interRettaRetta(rettaDa(A), rettaDa(B));
    if (A.tipo === 'L') return interRettaCerchio(rettaDa(A), cerchioDa(B));
    if (B.tipo === 'L') return interRettaCerchio(rettaDa(B), cerchioDa(A));
    return interCerchioCerchio(cerchioDa(A), cerchioDa(B));
  };
  const puntiDaTratti = (tratti, chiuso) => {
    const n = tratti.length, att = t => t.tipo === 'A' ? { tratto: t.cw ? 'cw' : 'ccw', r: r3(t.sweepGrande ? -t.r : t.r) } : {};
    const out = [];
    if (chiuso) { out.push(Object.assign({ x: r3(tratti[n - 1].q.a), y: r3(tratti[n - 1].q.b) }, att(tratti[n - 1]))); for (let k = 0; k < n - 1; k++) out.push(Object.assign({ x: r3(tratti[k].q.a), y: r3(tratti[k].q.b) }, att(tratti[k]))); }
    else { out.push({ x: r3(tratti[0].p.a), y: r3(tratti[0].p.b) }); tratti.forEach(t => out.push(Object.assign({ x: r3(t.q.a), y: r3(t.q.b) }, att(t)))); }
    return out;
  };
  /**
   * Parallela a distanza d (mm, positiva). lato: 'fuori' o 'dentro' per i profili chiusi; 'sx' o 'dx' (rispetto al verso del disegno)
   * per i profili aperti. Rettangoli, cerchi e asole restano della loro forma. Ritorna l'entita nuova o {errore}.
   * I raccordi e gli smussi del profilo sono presi come sono (diventano archi e rette). Controlla sempre il risultato sul disegno.
   */
  function offset(e, d, lato) {
    d = Number(d);
    if (!(d > 0)) return { errore: 'La distanza deve essere maggiore di zero.' };
    const fuori = lato === 'fuori' || lato === 'sx' ? (lato === 'fuori' ? 1 : 0) : 0;
    if (e.tipo === 'cerchio') {
      const r = num(e.r) + (lato === 'fuori' || lato === 'sx' ? d : -d);
      if (!(r > 1e-6)) return { errore: 'Il cerchio verso l\'interno sparisce: la distanza e troppo grande.' };
      const n = copia(e); delete n.id; n.r = r3(r); return n;
    }
    if (e.tipo === 'rett') {
      const k = lato === 'fuori' || lato === 'sx' ? d : -d, x0 = Math.min(num(e.x0), num(e.x1)), x1 = Math.max(num(e.x0), num(e.x1)), y0 = Math.min(num(e.y0), num(e.y1)), y1 = Math.max(num(e.y0), num(e.y1));
      if (x1 - x0 + 2 * k <= 1e-6 || y1 - y0 + 2 * k <= 1e-6) return { errore: 'Il rettangolo verso l\'interno sparisce: la distanza e troppo grande.' };
      const n = copia(e); delete n.id; n.x0 = r3(x0 - k); n.y0 = r3(y0 - k); n.x1 = r3(x1 + k); n.y1 = r3(y1 + k); n.r = r3(Math.max(0, (num(e.r) || 0) + k)); return n;
    }
    if (e.tipo === 'asola') {
      const w = num(e.w) + 2 * (lato === 'fuori' || lato === 'sx' ? d : -d);
      if (!(w > 1e-6)) return { errore: 'L\'asola verso l\'interno sparisce: la distanza e troppo grande.' };
      const n = copia(e); delete n.id; n.w = r3(w); return n;
    }
    if (e.tipo !== 'poli') return { errore: 'Questo elemento non ha una parallela.' };
    const pr = O.profiloCAD(e);
    const g = O.costruisciProfilo(pr.punti.map(p => ({ a: p.x, b: p.y, tratto: p.tratto, r: p.r, raccordo: p.raccordo, smusso: p.smusso })), pr.chiuso);
    if (g.errore || !g.tratti.length) return { errore: g.errore || 'Il profilo non e valido.' };
    // verso: s = +1 a sinistra del percorso, -1 a destra
    let s;
    if (pr.chiuso) { const ccw = areaFirmata(g.tratti) > 0; s = (lato === 'fuori') === ccw ? -1 : 1; }
    else s = lato === 'sx' ? 1 : -1;
    void fuori;
    const el = [];
    for (const t of g.tratti) {
      if (t.tipo === 'L') {
        const dx = t.q.a - t.p.a, dy = t.q.b - t.p.b, L = Math.hypot(dx, dy), nx = -dy / L * s * d, ny = dx / L * s * d;
        el.push({ tipo: 'L', p: { a: t.p.a + nx, b: t.p.b + ny }, q: { a: t.q.a + nx, b: t.q.b + ny } });
      } else {
        const r2 = t.r + (t.cw ? 1 : -1) * s * d;
        if (!(r2 > 1e-6)) return { errore: 'Un arco di raggio ' + r3(t.r) + ' sparisce con questa distanza: usa una distanza piu piccola.' };
        const k = r2 / t.r, pt = a => ({ a: t.c.a + (a.a - t.c.a) * k, b: t.c.b + (a.b - t.c.b) * k });
        el.push({ tipo: 'A', p: pt(t.p), q: pt(t.q), c: t.c, cw: t.cw, r: r2, originale: t });
      }
    }
    // vertici: intersezione di due elementi vicini (la piu vicina all'incontro previsto)
    const n = el.length, giunti = [];
    const nGiunti = pr.chiuso ? n : n - 1;
    for (let i = 0; i < nGiunti; i++) {
      const A = el[i], B = el[(i + 1) % n], atteso = { x: (A.q.a + B.p.a) / 2, y: (A.q.b + B.p.b) / 2 };
      let cand = interElementi(A, B);
      if (Math.hypot(A.q.a - B.p.a, A.q.b - B.p.b) < 1e-6) cand = [{ x: A.q.a, y: A.q.b }];
      if (!cand.length) return { errore: 'La parallela non si chiude in un angolo (distanza troppo grande?). Prova una distanza piu piccola.' };
      cand.sort((u, v) => Math.hypot(u.x - atteso.x, u.y - atteso.y) - Math.hypot(v.x - atteso.x, v.y - atteso.y));
      giunti.push(cand[0]);
    }
    el.forEach((t, i) => {
      if (pr.chiuso) { const prima = giunti[(i - 1 + n) % n], dopo = giunti[i]; t.p = { a: prima.x, b: prima.y }; t.q = { a: dopo.x, b: dopo.y }; }
      else { if (i > 0) t.p = { a: giunti[i - 1].x, b: giunti[i - 1].y }; if (i < n - 1) t.q = { a: giunti[i].x, b: giunti[i].y }; }
      if (t.tipo === 'A') {
        const a1 = Math.atan2(t.p.b - t.c.b, t.p.a - t.c.a), a2 = Math.atan2(t.q.b - t.c.b, t.q.a - t.c.a);
        const sweep = t.cw ? norma(a1 - a2) : norma(a2 - a1);
        t.sweepGrande = sweep > Math.PI + 1e-9;
        // un arco che cambia verso (si e rovesciato) non e valido
        if (t.originale) { const o = t.originale, ao1 = Math.atan2(o.p.b - o.c.b, o.p.a - o.c.a), ao2 = Math.atan2(o.q.b - o.c.b, o.q.a - o.c.a), so = o.cw ? norma(ao1 - ao2) : norma(ao2 - ao1); if (Math.abs(sweep - so) > Math.PI) t.rovesciato = true; }
      }
    });
    if (el.some(t => t.rovesciato)) return { errore: 'Un arco si rovescia con questa distanza: usa una distanza piu piccola.' };
    const nu = { tipo: 'poli', chiuso: pr.chiuso, punti: puntiDaTratti(el, pr.chiuso), lav: copia(e.lav || []) };
    if (e.layer) nu.layer = e.layer;
    return nu;
  }

  // ---------- raccordo e smusso su un vertice ----------
  /** Raccordo (raggio R) o smusso (lato C) sul vertice i di un profilo. valore 0 = toglie. Ritorna l'entita nuova o {errore}. */
  function angolo(e, i, tipo, valore) {
    valore = Number(valore);
    if (!(valore >= 0)) return { errore: 'Scrivi un valore maggiore di zero (0 per togliere).' };
    const n = copia(e); delete n.id;
    if (e.tipo === 'rett') {
      if (tipo === 'smusso') return { errore: 'Lo smusso del rettangolo non c\'e: trasformalo in profilo (Modifica) oppure usa il raccordo.' };
      const w = Math.abs(num(e.x1) - num(e.x0)), h = Math.abs(num(e.y1) - num(e.y0));
      if (valore * 2 > Math.min(w, h) + 1e-9) return { errore: 'Il raccordo e troppo grande per il rettangolo (massimo ' + r3(Math.min(w, h) / 2) + ' mm).' };
      n.r = r3(valore); return n;
    }
    if (e.tipo !== 'poli') return { errore: 'Raccordi e smussi si fanno sui profili e sui rettangoli.' };
    const P = n.punti, ch = !!e.chiuso;
    if (!(i >= 0 && i < P.length)) return { errore: 'Vertice non valido.' };
    if (!ch && (i === 0 || i === P.length - 1)) return { errore: 'Un estremo del profilo aperto non ha angolo.' };
    P[i].raccordo = tipo === 'raccordo' ? r3(valore) : 0;
    P[i].smusso = tipo === 'smusso' ? r3(valore) : 0;
    const prova = O.profiloCAD(n);
    const g = O.costruisciProfilo(prova.punti.map(p => ({ a: p.x, b: p.y, tratto: p.tratto, r: p.r, raccordo: p.raccordo, smusso: p.smusso })), prova.chiuso);
    if (g.errore) return { errore: g.errore };
    if ((g.avvisi || []).some(a => /raccord|smuss/i.test(a))) return { errore: g.avvisi.find(a => /raccord|smuss/i.test(a)) };
    return n;
  }

  // ---------- taglia / estendi ----------
  /** Il tratto retta in testa o in coda a un profilo aperto: {i (indice punto che si sposta), j (punto fisso)} oppure null. */
  function trattoTerminale(e, fine) {
    if (e.tipo !== 'poli' || e.chiuso || (e.punti || []).length < 2) return null;
    const P = e.punti, n = P.length;
    if (fine === 'fine') return P[n - 1].tratto === 'cw' || P[n - 1].tratto === 'ccw' ? null : { i: n - 1, j: n - 2 };
    return P[1].tratto === 'cw' || P[1].tratto === 'ccw' ? null : { i: 0, j: 1 };
  }
  /**
   * Porta l'estremo ('inizio' o 'fine') di un profilo aperto A sul taglio con B: se A arriva oltre B lo accorcia, se non ci arriva lo
   * allunga lungo la sua direzione. B e un'altra entita (profilo, rettangolo, cerchio, asola). Ritorna A nuovo o {errore}.
   */
  function tagliaEstendi(A, fine, B) {
    const t = trattoTerminale(A, fine);
    if (!t) return { errore: 'Si puo tagliare o estendere solo l\'estremo retto di un profilo aperto.' };
    const G = O.geometriaCAD([Object.assign({}, B, { id: 1 })], 0);
    const P = A.punti, a = { x: num(P[t.j].x), y: num(P[t.j].y) }, b = { x: num(P[t.i].x), y: num(P[t.i].y) };
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L < 1e-9) return { errore: 'Il tratto ha lunghezza zero.' };
    const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, GRANDE = 1e6;
    const retta = { ax: a.x - ux * GRANDE, ay: a.y - uy * GRANDE, bx: a.x + ux * GRANDE, by: a.y + uy * GRANDE };
    const cand = [];
    const inter = (p) => { const dist = (p.x - a.x) * ux + (p.y - a.y) * uy; if (dist > 1e-6) cand.push({ p, dist }); };
    G.seg.forEach(s => { const q = interRettaRetta(retta, s); if (q.length) { const p = q[0], dx = s.bx - s.ax, dy = s.by - s.ay, u = ((p.x - s.ax) * dx + (p.y - s.ay) * dy) / (dx * dx + dy * dy); if (u >= -1e-9 && u <= 1 + 1e-9) inter(p); } });
    G.cerchi.forEach(c => interRettaCerchio(retta, c).forEach(inter));
    if (!cand.length) return { errore: 'La retta non incontra l\'altro elemento.' };
    cand.sort((u, v) => Math.abs(u.dist - L) - Math.abs(v.dist - L));
    const n = copia(A); delete n.id; n.punti[t.i].x = r3(cand[0].p.x); n.punti[t.i].y = r3(cand[0].p.y);
    return n;
  }
  /** Porta insieme gli estremi di due profili aperti sul loro incrocio (angolo vivo). Ritorna {a, b} nuovi o {errore}. */
  function unisciAngolo(A, fineA, B, fineB) {
    const ta = trattoTerminale(A, fineA), tb = trattoTerminale(B, fineB);
    if (!ta || !tb) return { errore: 'Servono due profili aperti con l\'estremo retto.' };
    const ra = i => ({ ax: num(A.punti[i].x), ay: num(A.punti[i].y) }), rb = i => ({ ax: num(B.punti[i].x), ay: num(B.punti[i].y) });
    const a1 = ra(ta.j), a2 = ra(ta.i), b1 = rb(tb.j), b2 = rb(tb.i);
    const p = interRettaRetta({ ax: a1.ax, ay: a1.ay, bx: a2.ax, by: a2.ay }, { ax: b1.ax, ay: b1.ay, bx: b2.ax, by: b2.ay });
    if (!p.length) return { errore: 'Le due rette sono parallele: non si incontrano.' };
    const na = copia(A), nb = copia(B); delete na.id; delete nb.id;
    na.punti[ta.i].x = r3(p[0].x); na.punti[ta.i].y = r3(p[0].y); nb.punti[tb.i].x = r3(p[0].x); nb.punti[tb.i].y = r3(p[0].y);
    return { a: na, b: nb };
  }

  // ---------- selezione a finestra ----------
  /** Le entita dentro il rettangolo (x0,y0)-(x1,y1). incrocio = anche quelle che lo toccano; altrimenti solo quelle tutte dentro. */
  function entitaInFinestra(entita, x0, y0, x1, y1, incrocio) {
    const a = Math.min(x0, x1), b = Math.min(y0, y1), c = Math.max(x0, x1), d = Math.max(y0, y1);
    return (entita || []).filter(e => {
      const l = O.limitiCAD([e]); if (!l) return false;
      if (incrocio) return !(l.x1 < a || l.x0 > c || l.y1 < b || l.y0 > d);
      return l.x0 >= a - 1e-9 && l.x1 <= c + 1e-9 && l.y0 >= b - 1e-9 && l.y1 <= d + 1e-9;
    }).map(e => e.id);
  }


  // ---------- quote e allineamenti ----------
  /**
   * Cambia un segmento retto di un profilo: il segmento che arriva al vertice i (dal vertice i-1; per i = 0 in un profilo chiuso, quello dall'ultimo).
   * o = {lunghezza, angolo (gradi, assoluto), orienta: 'H' | 'V', segue (i vertici dopo si spostano uguale: la forma resta)}. Ritorna l'entita nuova o {errore}.
   */
  function quotaSegmento(e, i, o) {
    o = o || {};
    if (e.tipo !== 'poli') return { errore: 'Le quote dei segmenti si cambiano sui profili.' };
    const P = e.punti, n = P.length;
    const prec = i > 0 ? i - 1 : (e.chiuso ? n - 1 : -1);
    if (!(i >= 0 && i < n) || prec < 0) return { errore: 'Scegli un vertice che abbia un segmento prima di se (non il primo punto di un profilo aperto).' };
    if (P[i].tratto === 'cw' || P[i].tratto === 'ccw') return { errore: 'Questo tratto e un arco: cambia il raggio o i punti.' };
    const a = { x: num(P[prec].x), y: num(P[prec].y) }, b = { x: num(P[i].x), y: num(P[i].y) };
    let dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
    if (o.orienta === 'H' || o.orienta === 'V') { const L0 = L; dx = o.orienta === 'H' ? (dx < 0 ? -L0 : L0) : 0; dy = o.orienta === 'V' ? (dy < 0 ? -L0 : L0) : 0; }
    if (o.angolo !== undefined && o.angolo !== null) { if (!isFinite(Number(o.angolo))) return { errore: 'Angolo non valido.' }; const ang = Number(o.angolo) * RAD; dx = Math.cos(ang) * L; dy = Math.sin(ang) * L; }
    if (o.lunghezza !== undefined && o.lunghezza !== null) {
      const nl = Number(o.lunghezza);
      if (!(nl > 0)) return { errore: 'La lunghezza deve essere maggiore di zero.' };
      const cur = Math.hypot(dx, dy);
      if (cur < 1e-9) return { errore: 'Il segmento ha lunghezza zero: scegli prima una direzione (angolo, H o V).' };
      dx *= nl / cur; dy *= nl / cur;
    }
    const nuovo = { x: a.x + dx, y: a.y + dy }, delta = { x: nuovo.x - b.x, y: nuovo.y - b.y };
    const nu = copia(e); delete nu.id;
    const muovi = k => { nu.punti[k].x = r3(num(nu.punti[k].x) + delta.x); nu.punti[k].y = r3(num(nu.punti[k].y) + delta.y); };
    if (i === 0) muovi(0); else { muovi(i); if (o.segue) for (let k = i + 1; k < n; k++) muovi(k); }
    if (i === 0 && o.segue) for (let k = 1; k < n; k++) muovi(k);
    return nu;
  }
  /** Le quote da mostrare sul disegno: [{tipo:'lin'|'dia'|'raggio', x0,y0,x1,y1 (punti misurati), testo, e (id)}]. */
  function quote(entita) {
    const out = [], f = v => String(r3(v)).replace('.', ',');
    (entita || []).forEach(e => {
      if (e.tipo === 'rett') {
        const x0 = Math.min(num(e.x0), num(e.x1)), x1 = Math.max(num(e.x0), num(e.x1)), y0 = Math.min(num(e.y0), num(e.y1)), y1 = Math.max(num(e.y0), num(e.y1));
        out.push({ tipo: 'lin', x0, y0, x1, y1: y0, testo: f(x1 - x0), lato: 'sotto', e: e.id }, { tipo: 'lin', x0: x1, y0, x1, y1, testo: f(y1 - y0), lato: 'destra', e: e.id });
      } else if (e.tipo === 'cerchio') out.push({ tipo: 'dia', x0: num(e.cx), y0: num(e.cy), x1: num(e.r), y1: 0, testo: 'Ø' + f(2 * num(e.r)), e: e.id });
      else if (e.tipo === 'asola') out.push({ tipo: 'lin', x0: num(e.x1), y0: num(e.y1), x1: num(e.x2), y1: num(e.y2), testo: f(Math.hypot(num(e.x2) - num(e.x1), num(e.y2) - num(e.y1))) + ' x ' + f(num(e.w)), lato: 'sopra', e: e.id });
      else if (e.tipo === 'poli') {
        const P = e.punti || [], n = P.length;
        for (let i = 1; i <= (e.chiuso ? n : n - 1); i++) {
          const a = P[i - 1], b = P[i % n];
          if (b.tratto === 'cw' || b.tratto === 'ccw') { out.push({ tipo: 'raggio', x0: num(b.x), y0: num(b.y), x1: num(a.x), y1: num(a.y), testo: 'R' + f(Math.abs(num(b.r))), e: e.id }); continue; }
          const L = Math.hypot(num(b.x) - num(a.x), num(b.y) - num(a.y));
          if (L > 1e-9) out.push({ tipo: 'lin', x0: num(a.x), y0: num(a.y), x1: num(b.x), y1: num(b.y), testo: f(L), lato: 'sopra', e: e.id });
        }
      }
    });
    return out;
  }

  const Mod = { trasformaCAD: trasforma, serieLineare, seriePolare, offsetCAD: offset, angoloCAD: angolo, tagliaEstendiCAD: tagliaEstendi, unisciAngoloCAD: unisciAngolo, entitaInFinestra, quotaSegmentoCAD: quotaSegmento, quoteCAD: quote };
  Object.assign(O, Mod);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
