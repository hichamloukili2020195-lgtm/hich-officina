// ===== Hich-Officina: il lavoro guidato (grezzo, forma, lavorazioni, programma), senza interfaccia =====
// Lo stesso percorso per fresa e tornio. La forma si scrive a quote: per il tornio una catena di tratti dalla testa
// verso il mandrino, per la fresa forme pronte (tasche, fori, fori a cerchio e a griglia, asole, profili). Le lavorazioni
// si propongono da sole con le regole di officina; ognuna si puo spegnere o correggere (giri, avanzamento).
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  const r3 = x => Math.round(x * 1000) / 1000;
  const num = v => { if (v === '' || v === null || v === undefined) return NaN; return Number(String(v).replace(',', '.')); };
  const pos = v => isFinite(v) && v > 0;

  // ----- tornio: tratti -> punti del profilo -----
  /**
   * tratti = [{tipo:'cil'|'cono'|'arco', d, l, r, forma:'bombato'|'incavato', fil (passo), gola (larghezza), toll, spigolo:'C1'|'R2'|''}]
   * Il profilo parte dalla faccia (Z0) e scende verso il mandrino. Ritorna {punti, errore, lunghezza, dMax}.
   */
  function puntiTornio(tratti, opz) {
    opz = opz || {};
    const T = (tratti || []).filter(t => t && pos(num(t.d)) && (pos(num(t.l)) || t.tipo === 'spalla'));
    if (!T.length) return { errore: 'Aggiungi almeno un tratto con diametro e lunghezza.', punti: [] };
    const P = [{ x: 0, z: 0 }];
    let z = 0, d = num(T[0].tipo === 'cono' ? (pos(num(T[0].d0)) ? T[0].d0 : T[0].d) : T[0].d);
    const spigolo = (p, s) => {
      const m = /^([CR])\s*(\d+(?:[.,]\d+)?)$/i.exec(String(s || '').trim());
      if (!m) return;
      if (m[1].toUpperCase() === 'C') p.smusso = num(m[2]); else p.raccordo = num(m[2]);
    };
    // la faccia di testa fino al primo diametro, con lo smusso di testa
    const p0 = { x: d, z: 0 };
    spigolo(p0, opz.smussoTesta === undefined ? 'C0.5' : opz.smussoTesta);
    P.push(p0);
    for (let i = 0; i < T.length; i++) {
      const t = T[i], dt = num(t.d), L = num(t.l);
      if ((t.tipo || 'cil') === 'cil' && Math.abs(dt - d) > 1e-9) { P.push({ x: dt, z }); d = dt; }   // spallamento verso il nuovo diametro
      else if (t.tipo === 'cono' && pos(num(t.d0)) && Math.abs(num(t.d0) - d) > 1e-9) { P.push({ x: num(t.d0), z }); d = num(t.d0); }
      z = r3(z - L);
      const p = { x: dt, z };
      if (t.tipo === 'arco') {
        const R = num(t.r);
        const corda = Math.hypot(L, (dt - d) / 2);
        if (!(R >= corda / 2 - 1e-6)) return { errore: 'Tratto ' + (i + 1) + ': raggio troppo piccolo (almeno ' + r3(corda / 2) + ').', punti: [] };
        p.tratto = t.forma === 'incavato' ? 'cw' : 'ccw'; p.r = R;
      }
      if (t.tipo === 'cil') { if (pos(num(t.fil))) p.fil = num(t.fil); if (pos(num(t.gola))) p.gola = num(t.gola); if (t.toll && String(t.toll).trim()) p.toll = String(t.toll).trim(); }
      spigolo(p, t.spigolo);
      P.push(p);
      d = dt;
    }
    const dg = num(opz.dg);
    if (pos(dg) && d < dg - 1e-9) P.push({ x: dg, z });
    else { delete P[P.length - 1].smusso; delete P[P.length - 1].raccordo; }
    const dMax = Math.max(...P.map(p => p.x));
    return { punti: P, lunghezza: -z, dMax, errore: null };
  }

  // ----- fresa: forme pronte -> entita del CAD -----
  /** forme = [{tipo:'tasca'|'tascaTonda'|'asola'|'foro'|'foriCerchio'|'foriGriglia'|'profilo', ...}] */
  function entitaFresa(forme, grezzo) {
    const E = [];
    let id = 1;
    const lavForo = f => {
      const tipo = f.foro === 'maschio' ? 'maschio' : f.foro === 'alesato' ? 'alesato' : 'foro';
      const l = { op: tipo, d: num(f.d), passante: f.passante !== false, prof: num(f.prof) };
      if (tipo === 'maschio') l.passo = pos(num(f.passo)) ? num(f.passo) : O.passoGrosso(num(f.d));
      if (tipo === 'alesato') l.toll = f.toll || 'H7';
      if (pos(num(f.lamD))) { l.lamD = num(f.lamD); l.lamProf = pos(num(f.lamProf)) ? num(f.lamProf) : r3(num(f.d) * 0.6); }
      return l;
    };
    const punto = (x, y, f) => E.push({ id: id++, tipo: 'punto', x: r3(x), y: r3(y), lav: [lavForo(f)] });
    (forme || []).forEach(f => {
      if (f.spenta) return;
      if (f.tipo === 'tasca') {
        const lx = num(f.lx), ly = num(f.ly), cx = num(f.cx), cy = num(f.cy);
        E.push({ id: id++, tipo: 'rett', x0: r3(cx - lx / 2), y0: r3(cy - ly / 2), x1: r3(cx + lx / 2), y1: r3(cy + ly / 2), r: num(f.r) || 0, lav: [{ op: 'tasca', prof: num(f.prof), d: num(f.du) }] });
      } else if (f.tipo === 'tascaTonda') E.push({ id: id++, tipo: 'cerchio', cx: num(f.cx), cy: num(f.cy), r: num(f.dt) / 2, lav: [{ op: 'tasca', prof: num(f.prof), d: num(f.du) }] });
      else if (f.tipo === 'asola') E.push({ id: id++, tipo: 'asola', x1: num(f.x1), y1: num(f.y1), x2: num(f.x2), y2: num(f.y2), w: num(f.w), lav: [{ op: 'asola', prof: num(f.prof), d: num(f.du) }] });
      else if (f.tipo === 'foro') punto(num(f.x), num(f.y), f);
      else if (f.tipo === 'foriCerchio') {
        const n = Math.max(1, Math.round(num(f.n) || 1));
        for (let k = 0; k < n; k++) { const a = ((num(f.a0) || 0) + k * 360 / n) * Math.PI / 180; punto(num(f.cx) + num(f.dc) / 2 * Math.cos(a), num(f.cy) + num(f.dc) / 2 * Math.sin(a), f); }
      } else if (f.tipo === 'foriGriglia') {
        const nx = Math.max(1, Math.round(num(f.nx) || 1)), ny = Math.max(1, Math.round(num(f.ny) || 1));
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) punto(num(f.x0) + i * (num(f.px) || 0), num(f.y0) + j * (num(f.py) || 0), f);
      } else if (f.tipo === 'profilo') {
        E.push({ id: id++, tipo: 'poli', chiuso: f.chiuso !== false, punti: (f.punti || []).map(p => ({ x: num(p.x), y: num(p.y), raccordo: num(p.raccordo) || 0, smusso: num(p.smusso) || 0 })), lav: [{ op: f.lav === 'tasca' ? 'tasca' : 'contorno', prof: num(f.prof), lato: f.lato || 'esterno', d: num(f.du) }] });
      }
    });
    if (grezzo && grezzo.contorna) E.push({ id: id++, tipo: 'rett', x0: 0, y0: 0, x1: num(grezzo.lx), y1: num(grezzo.ly), r: num(grezzo.raggio) || 0, lav: [{ op: 'contorno', lato: 'esterno', prof: num(grezzo.lz) }] });
    return E;
  }

  /** Chiave stabile di una fase (per spegnerla o correggerla). */
  const chiaveFase = (f, i) => String(f.titolo || f.op).replace(/ T\d+$/, '') + '#' + i;

  /**
   * Il lavoro completo: modo 'fresa'|'tornio', grezzo, forma; ctx come per i piani (mat, tab, nmax...).
   * Ritorna {fasi (tutte, con chiave e acceso), errore, note, misure}.
   */
  function proponiLavoro(L, ctx) {
    const g = L.grezzo || {};
    if (L.modo === 'tornio') {
      const dg = num(g.dg);
      if (!pos(dg)) return { errore: 'Scrivi il diametro del grezzo.' };
      const pr = puntiTornio(L.tratti, { dg, smussoTesta: L.smussoTesta });
      if (pr.errore) return { errore: pr.errore };
      if (pr.dMax > dg + 1e-9) return { errore: 'Il pezzo (Ø' + r3(pr.dMax) + ') e piu grosso del grezzo (Ø' + dg + ').' };
      const p = O.pianificaProfilo(pr.punti, Object.assign({}, ctx, { dg }));
      if (p.errore) return { errore: p.errore };
      // sfacciatura, foro in asse e troncatura come nel ciclo dell'albero
      const a = O.pianificaAlbero({ dg, lg: Math.max(num(g.lg) || 0, pr.lunghezza + 5), smusso: 0, tratti: [{ d: dg, l: pr.lunghezza }], foro: pos(num(L.foroD)) ? { d: num(L.foroD), prof: num(L.foroP) || 2 * num(L.foroD) } : null, troncatura: !!L.troncatura }, ctx);
      const extra = a.errore ? [] : a.fasi.filter(f => f.op !== 'profilo');
      const prima = extra.filter(f => f.op === 'sfacciatura' || f.op === 'foratura'), dopo = extra.filter(f => f.op === 'troncatura');
      // barenatura interna e filetto interno: dopo il foro in asse (la barenatura) e dopo il filetto esterno (il filetto)
      const I = L.interno || {}, dpF = num(L.foroD), di = num(I.di), li = num(I.l);
      const base = { nmax: ctx.nmax || 3000, codLimite: ctx.codLimite, codFiletto: ctx.codFiletto, refrig: ctx.refrig };
      const mt = ctx.mat, tab = ctx.tab || [], nt = { testi: [], daControllare: new Set() };
      let internaF = [], filettoI = [];
      if (pos(di) && pos(li)) {
        if (!pos(dpF)) return { errore: 'La barenatura interna parte dal foro in asse: scrivi il diametro del foro.' };
        if (di <= dpF) return { errore: 'La barenatura (Ø' + di + ') deve essere piu grande del foro (Ø' + dpF + ').' };
        if (di >= dg - 2) return { errore: 'La barenatura (Ø' + di + ') lascia troppo poca parete nel pezzo (Ø' + dg + ').' };
        const tB = O.trovaT(tab, ['bareno'], 0, 7, nt);
        internaF.push({ op: 'interna', titolo: 'Barenatura interna Ø' + di + ' T' + tB, c: Object.assign({}, base, { t: tB, dp: dpF, di, dg, l: li, ap: 1, sx: 0.3, sz: 0.1, finitura: true, ff: r3(Math.max(0.05, (mt.lf || 0.2) * 0.3)), smusso: 0.5, vc: r3((mt.lvc || 100) * 0.7), f: r3(Math.max(0.05, (mt.lf || 0.2) * 0.6)) }) });
        if (pos(num(I.fil))) {
          const tF = O.trovaT(tab, ['bareno', 'inserto'], 0, 8, nt), pF = num(I.fil);
          const giri = Math.min(base.nmax, Math.max(100, Math.round(1000 * (mt.lvc || 100) * 0.4 / (Math.PI * di) / 10) * 10));
          filettoI.push({ op: 'filettoInt', titolo: 'Filetto interno M' + di + 'x' + pF + ' T' + tF, c: Object.assign({}, base, { t: tF, d: di, dg: di, p: pF, l: li, n: pF <= 1 ? 5 : pF <= 1.5 ? 6 : pF <= 2 ? 8 : 10, giri, vc: Math.round((mt.lvc || 100) * 0.4), f: pF, metodo: 'passate' }) });
          nt.testi.push('Filetto interno: la barenatura va a ' + r3(di - 1.082532 * pF) + ' (nocciolo), poi la fresa filetti o il filetto a passate.');
        }
        p.note = (p.note || []).concat(nt.testi);
      }
      const iForo = prima.findIndex(f => f.op === 'foratura');
      const dopoForo = iForo >= 0 ? prima.slice(0, iForo + 1).concat(internaF, prima.slice(iForo + 1)) : prima.concat(internaF);
      // il filetto interno va dopo i filetti e le gole esterne, prima della troncatura
      const fasi = dopoForo.concat(p.fasi, filettoI, dopo);
      const note = (p.note || []).concat(a.errore ? [] : (a.note || []).filter(t => !/^Utensili non trovati/.test(t)));
      return { fasi: fasi.map((f, i) => Object.assign(f, { chiave: chiaveFase(f, i) })), note, misure: p.misure || [], punti: pr.punti, modo: 'tornio' };
    }
    const lx = num(g.lx), ly = num(g.ly), lz = num(g.lz);
    if (!(pos(lx) && pos(ly) && pos(lz))) return { errore: 'Scrivi le misure del pezzo (lunghezza, larghezza, spessore).' };
    const entita = entitaFresa(L.forme, g);
    const fasi = [];
    const note = [];
    if (pos(num(g.sovraZ))) {
      const sp = O.pianificaPiastra({ fx: lx, fy: ly, fz: lz, gx: lx, gy: ly, gz: lz + num(g.sovraZ) }, ctx);
      if (!sp.errore) fasi.push(...sp.fasi.filter(f => f.op === 'spianatura'));
    }
    if (entita.length) {
      const p = O.pianificaCAD({ fz: lz, entita }, ctx);
      if (p.errore) return { errore: p.errore };
      fasi.push(...p.fasi);
      note.push(...p.note);
    }
    if (!fasi.length) return { errore: 'Aggiungi almeno una forma (tasca, foro, asola...) o la spianatura.' };
    // la spianatura va sempre per prima; il numero T non deve coincidere con altri utensili
    const ordinate = fasi.filter(f => f.op === 'spianatura').concat(fasi.filter(f => f.op !== 'spianatura'));
    return { fasi: ordinate.map((f, i) => Object.assign(f, { chiave: chiaveFase(f, i) })), note, misure: [], entita, modo: 'fresa' };
  }

  /**
   * Il programma dalle fasi proposte, con quelle spente tolte e le correzioni applicate.
   * scelte = {spente: {chiave: true}, correzioni: {chiave: {n, f, vc}}}. Ritorna {righe, errore, tempo, utensili, avvisi}.
   */
  function programmaLavoro(prop, scelte, comuni) {
    scelte = scelte || {};
    const sp = scelte.spente || {}, cor = scelte.correzioni || {};
    const fasi = prop.fasi.filter(f => !sp[f.chiave]).map(f => {
      const c = Object.assign({}, f.c), k = cor[f.chiave] || {};
      if (pos(num(k.n))) { c.n = num(k.n); if (c.giri) c.giri = num(k.n); }
      if (pos(num(k.f))) c.f = num(k.f);
      if (pos(num(k.vc))) c.vc = num(k.vc);
      return Object.assign({}, f, { c });
    });
    if (!fasi.length) return { errore: 'Tutte le lavorazioni sono spente.' };
    const r = prop.modo === 'tornio' ? O.gcodeSequenzaTornio(fasi, comuni || {}) : O.gcodeSequenza(fasi, comuni || {});
    if (r.errore) return { errore: r.errore };
    let tempo = NaN;
    try { if (O.eseguiISO) tempo = O.eseguiISO(r.righe.join('\n'), { modo: prop.modo }).tempo; } catch (e) { /* senza stima */ }
    const visti = new Map();
    fasi.forEach(f => { const t = Number(f.c.t); if (!visti.has(t)) visti.set(t, String(f.titolo).replace(/ T\d+$/, '')); });
    const utensili = Array.from(visti.entries()).map(([t, uso]) => ({ t, uso }));
    return { righe: r.righe, avvisi: r.avvisi || [], tempo, utensili, fasi };
  }


  // ----- modelli pronti da cui partire (misure di esempio: si correggono) -----
  const MODELLI = [
    { id: 'perno', modo: 'tornio', nome: 'Perno con filetto', descr: 'Ø20 con filetto M20x2,5 e gola, Ø30 h6, Ø36',
      dati: () => ({ grezzo: { dg: 40, lg: 80 }, tratti: [{ tipo: 'cil', d: 20, l: 25, fil: 2.5, gola: 4, spigolo: 'C1' }, { tipo: 'cil', d: 30, l: 20, toll: 'h6', spigolo: 'C0.5' }, { tipo: 'cil', d: 36, l: 15 }], troncatura: true, smussoTesta: 'C0.5', scelte: {} }) },
    { id: 'albero', modo: 'tornio', nome: 'Albero a gradini', descr: 'Tre diametri con smussi e raccordo',
      dati: () => ({ grezzo: { dg: 40, lg: 100 }, tratti: [{ tipo: 'cil', d: 20, l: 25, spigolo: 'C1' }, { tipo: 'cil', d: 25, l: 30, toll: 'g6', spigolo: 'R1' }, { tipo: 'cil', d: 32, l: 30 }], troncatura: true, smussoTesta: 'C1', scelte: {} }) },
    { id: 'boccola', modo: 'tornio', nome: 'Boccola', descr: 'Ø40 con foro Ø20 barenato a Ø24',
      dati: () => ({ grezzo: { dg: 45, lg: 60 }, tratti: [{ tipo: 'cil', d: 40, l: 30, spigolo: 'C1' }], troncatura: true, smussoTesta: 'C1', foroD: 20, interno: { di: 24, l: 25 }, scelte: {} }) },
    { id: 'disco', modo: 'tornio', nome: 'Disco con foro', descr: 'Ø80 spesso 12 con foro centrale',
      dati: () => ({ grezzo: { dg: 85, lg: 40 }, tratti: [{ tipo: 'cil', d: 80, l: 12, spigolo: 'C1' }], troncatura: true, smussoTesta: 'C1', foroD: 22, scelte: {} }) },
    { id: 'piastraFori', modo: 'fresa', nome: 'Piastra con 4 fori M8', descr: '100x60x15, fori filettati e contorno',
      dati: () => ({ grezzo: { lx: 100, ly: 60, lz: 15, sovraZ: 1, contorna: true, raggio: 4 }, forme: [{ tipo: 'foriGriglia', x0: 15, y0: 12, nx: 2, ny: 2, px: 70, py: 36, d: 8, foro: 'maschio', passo: 1.25, passante: true }], scelte: {} }) },
    { id: 'piastraTasca', modo: 'fresa', nome: 'Piastra con tasca', descr: 'Tasca 50x30 e 4 fori passanti',
      dati: () => ({ grezzo: { lx: 100, ly: 60, lz: 20, sovraZ: 1, contorna: false }, forme: [{ tipo: 'tasca', cx: 50, cy: 30, lx: 50, ly: 30, r: 5, prof: 8 }, { tipo: 'foriGriglia', x0: 10, y0: 10, nx: 2, ny: 2, px: 80, py: 40, d: 6.6, foro: 'foro', passante: true }], scelte: {} }) },
    { id: 'staffa', modo: 'fresa', nome: 'Staffa con asole', descr: '80x40x10, due asole e due fori',
      dati: () => ({ grezzo: { lx: 80, ly: 40, lz: 10, sovraZ: 0, contorna: true, raggio: 5 }, forme: [{ tipo: 'asola', x1: 20, y1: 20, x2: 35, y2: 20, w: 8, prof: 10 }, { tipo: 'asola', x1: 45, y1: 20, x2: 60, y2: 20, w: 8, prof: 10 }, { tipo: 'foro', x: 8, y: 20, d: 5, foro: 'foro', passante: true }, { tipo: 'foro', x: 72, y: 20, d: 5, foro: 'foro', passante: true }], scelte: {} }) },
    { id: 'flangia', modo: 'fresa', nome: 'Flangia a 6 fori', descr: '100x100x12, foro centrale e fori su cerchio',
      dati: () => ({ grezzo: { lx: 100, ly: 100, lz: 12, sovraZ: 1, contorna: true, raggio: 10 }, forme: [{ tipo: 'tascaTonda', cx: 50, cy: 50, dt: 30, prof: 12 }, { tipo: 'foriCerchio', cx: 50, cy: 50, dc: 70, n: 6, a0: 0, d: 9, foro: 'foro', passante: true }], scelte: {} }) }
  ];

  /**
   * Costo del pezzo: tempo di lavoro + cambi utensile (0,2 min l'uno, stima) per il costo orario, piu il materiale.
   * c = {tempo (min), utensili, costoOra (€/h), materiale (€ a pezzo), pezzi}
   */
  function costoPezzo(c) {
    const tempo = (isFinite(c.tempo) ? c.tempo : 0) + 0.2 * (c.utensili || 0);
    const ora = pos(num(c.costoOra)) ? num(c.costoOra) : 0;
    const mat = isFinite(num(c.materiale)) && num(c.materiale) > 0 ? num(c.materiale) : 0;
    const n = Math.max(1, Math.round(num(c.pezzi) || 1));
    const lav = tempo / 60 * ora;
    return { tempoPezzo: tempo, lavorazione: lav, materiale: mat, pezzo: lav + mat, pezzi: n, lotto: (lav + mat) * n, tempoLotto: tempo * n };
  }

  const Lavoro = { puntiTornio, entitaFresa, proponiLavoro, programmaLavoro, MODELLI_LAVORO: MODELLI, costoPezzo };
  Object.assign(O, Lavoro);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
