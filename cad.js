// ===== Hich-Officina: mini CAD/CAM per la fresa, senza interfaccia =====
// Il disegno e una lista di entita (profilo, rettangolo, cerchio, punto, asola). Ogni entita porta le sue lavorazioni
// (contorno, tasca, foro, maschio, alesatura, asola). Da qui si ricava la sequenza di fasi, con i dati di taglio del
// materiale, gli utensili della tabella e l'ordine di officina; il programma lo scrive gcodeSequenza.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  const r3 = x => Math.round(x * 1000) / 1000;
  const num = v => { const n = Number(String(v === undefined || v === null ? '' : v).replace(',', '.')); return v === '' || v === null || v === undefined ? NaN : n; };

  /** Lavorazioni possibili per ogni tipo di entita (la prima e quella proposta). */
  const LAVORAZIONI = {
    poli: ['contorno', 'tasca'],
    rett: ['contorno', 'tasca'],
    cerchio: ['foro', 'maschio', 'alesato', 'tasca', 'contorno'],
    punto: ['foro', 'maschio', 'alesato'],
    asola: ['asola']
  };
  const NOMI_LAV = { contorno: 'Contornatura', tasca: 'Tasca', foro: 'Foro', maschio: 'Maschiatura', alesato: 'Alesatura', asola: 'Asola' };

  /** Punti del profilo di un'entita chiusa o aperta, nel formato di profilo.js. Ritorna {punti, chiuso} o null. */
  function profiloDi(e) {
    if (e.tipo === 'poli') return { punti: (e.punti || []).map(p => ({ x: num(p.x), y: num(p.y), tratto: p.tratto || 'retta', r: num(p.r) || 0, raccordo: num(p.raccordo) || 0, smusso: num(p.smusso) || 0 })), chiuso: !!e.chiuso };
    if (e.tipo === 'rett') {
      const x0 = Math.min(num(e.x0), num(e.x1)), x1 = Math.max(num(e.x0), num(e.x1)), y0 = Math.min(num(e.y0), num(e.y1)), y1 = Math.max(num(e.y0), num(e.y1)), R = num(e.r) || 0;
      return { punti: [{ x: x0, y: y0, raccordo: R }, { x: x1, y: y0, raccordo: R }, { x: x1, y: y1, raccordo: R }, { x: x0, y: y1, raccordo: R }], chiuso: true };
    }
    if (e.tipo === 'cerchio') {
      const cx = num(e.cx), cy = num(e.cy), r = num(e.r);
      return { punti: [{ x: cx + r, y: cy, tratto: 'ccw', r }, { x: cx - r, y: cy, tratto: 'ccw', r }], chiuso: true };
    }
    return null;
  }

  /** Rettangolo che contiene tutto il disegno: {x0, y0, x1, y1} oppure null. */
  function limiti(entita) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const dai = (x, y) => { if (isFinite(x) && isFinite(y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } };
    (entita || []).forEach(e => {
      if (e.tipo === 'poli') (e.punti || []).forEach(p => dai(num(p.x), num(p.y)));
      else if (e.tipo === 'rett') { dai(num(e.x0), num(e.y0)); dai(num(e.x1), num(e.y1)); }
      else if (e.tipo === 'cerchio') { const r = num(e.r) || 0; dai(num(e.cx) - r, num(e.cy) - r); dai(num(e.cx) + r, num(e.cy) + r); }
      else if (e.tipo === 'punto') dai(num(e.x), num(e.y));
      else if (e.tipo === 'asola') { const w = num(e.w) / 2 || 0; dai(num(e.x1) - w, num(e.y1) - w); dai(num(e.x2) + w, num(e.y2) + w); dai(num(e.x1) + w, num(e.y1) + w); dai(num(e.x2) - w, num(e.y2) - w); }
    });
    return isFinite(x0) ? { x0, y0, x1, y1 } : null;
  }

  /** Il centro e il diametro di un'entita tonda (cerchio o punto con diametro nella lavorazione). */
  function centroTondo(e, lav) {
    if (e.tipo === 'cerchio') return { x: num(e.cx), y: num(e.cy), d: 2 * num(e.r) };
    return { x: num(e.x), y: num(e.y), d: num(lav.d) };
  }
  const rettangolo = e => { const p = profiloDi(e).punti; return { x0: p[0].x, y0: p[0].y, x1: p[2].x, y1: p[2].y, r: num(e.r) || 0 }; };

  /**
   * Dalle entita alle fasi. modello = {fz (spessore), entita:[{id, tipo, ..., lav:[{op, prof, d, lato, passante, passo, toll, smusso}]}]}
   * ctx = {mat, tab, nmax, zSic, zR, refrig, g43}
   * Ritorna {fasi, note, errore} con fasi pronte per gcodeSequenza.
   */
  function pianificaCAD(modello, ctx) {
    const mt = ctx.mat, tab = ctx.tab || [], nmax = ctx.nmax || 12000;
    if (!mt) return { errore: 'Scegli il materiale.' };
    const fz = num(modello.fz);
    if (!(fz > 0)) return { errore: 'Scrivi lo spessore del pezzo.' };
    const note = { testi: [], daControllare: new Set() };
    const base = { zSic: ctx.zSic || 50, zR: ctx.zR || 2, refrig: ctx.refrig, g43: ctx.g43 };
    const fasi = [], gruppiFori = new Map(), tasche = [];
    const fresa = (d, z) => { const dt = O.datiTaglio(mt, { tipo: 'fresa', d, z, nmax }) || {}; return { n: dt.n, f: dt.f, ap: dt.ap, ae: dt.ae && d ? Math.round(dt.ae / d * 100) : 50 }; };
    const frese = tab.filter(u => u.tipo === 'fresa' && Number(u.d) > 0).sort((a, b) => Number(b.d) - Number(a.d));
    const utFresa = (dDato, max, prop) => {
      if (dDato > 0) { const t = O.trovaT(tab, ['fresa'], dDato, prop.t, note); return { d: dDato, z: (frese.find(u => Math.abs(Number(u.d) - dDato) < 0.05) || {}).z || prop.z, t }; }
      const u = frese.find(x => Number(x.d) <= max + 1e-9);
      if (u) return { d: Number(u.d), z: Number(u.z) || prop.z, t: Number(u.t) };
      note.daControllare.add(prop.t); return { d: Math.max(1, Math.min(prop.d, Math.floor(max))), z: prop.z, t: prop.t };
    };
    let nErrore = null;
    (modello.entita || []).forEach((e, k) => {
      if (nErrore) return;
      const lista = e.lav || [];
      lista.forEach(lav => {
        if (nErrore) return;
        const prof = num(lav.prof);
        const op = lav.op;
        if (!(LAVORAZIONI[e.tipo] || []).includes(op)) { nErrore = 'Elemento ' + (k + 1) + ': la lavorazione "' + (NOMI_LAV[op] || op) + '" non si puo fare su questo disegno.'; return; }
        // ----- fori -----
        if (op === 'foro' || op === 'maschio' || op === 'alesato') {
          const c = centroTondo(e, lav);
          if (!isFinite(c.x) || !isFinite(c.y) || !(c.d > 0)) { nErrore = 'Elemento ' + (k + 1) + ': scrivi il diametro del foro.'; return; }
          const passo = num(lav.passo) || O.passoGrosso(c.d);
          const chiave = [op, r3(c.d), op === 'maschio' ? r3(passo) : '', lav.passante ? 'P' : r3(prof), lav.toll || '', lav.smusso || ''].join('|');
          if (!gruppiFori.has(chiave)) gruppiFori.set(chiave, { tipo: op, d: c.d, passo, passante: !!lav.passante, prof: prof > 0 ? prof : c.d * 2, toll: lav.toll, smusso: num(lav.smusso), punti: [] });
          gruppiFori.get(chiave).punti.push([r3(c.x), r3(c.y)]);
          return;
        }
        // ----- asola -----
        if (op === 'asola') {
          const w = num(e.w);
          if (!(w > 0) || !(prof > 0)) { nErrore = 'Elemento ' + (k + 1) + ': scrivi larghezza e profondita dell\'asola.'; return; }
          const u = utFresa(num(lav.d), w, { d: 6, z: 3, t: 7 });
          const dt = fresa(u.d, u.z);
          fasi.push({ op: 'asola', titolo: 'Asola ' + r3(w) + ' D' + u.d + ' T' + u.t, c: Object.assign({}, base, { t: u.t, d: u.d, n: dt.n, f: dt.f, x1: num(e.x1), y1: num(e.y1), x2: num(e.x2), y2: num(e.y2), w, prof, ap: Math.max(0.5, Math.min(dt.ap || 2, prof)) }) });
          return;
        }
        if (!(prof > 0)) { nErrore = 'Elemento ' + (k + 1) + ': scrivi la profondita.'; return; }
        if (prof > fz + 1e-9) note.testi.push('Elemento ' + (k + 1) + ': profondita ' + r3(prof) + ' oltre lo spessore del pezzo (' + r3(fz) + '): si taglia anche il piano di lavoro.');
        // ----- tasche -----
        if (op === 'tasca') {
          tasche.push({ e, k, lav, prof });
          return;
        }
        // ----- contorno -----
        if (op === 'contorno') {
          const pr = profiloDi(e);
          let lato = lav.lato || 'esterno';
          if (!pr.chiuso && (lato === 'esterno' || lato === 'interno')) lato = 'sinistra';
          if (pr.chiuso && (lato === 'sinistra' || lato === 'destra')) lato = 'esterno';
          const dMax = e.tipo === 'rett' ? Math.min(Math.abs(num(e.x1) - num(e.x0)), Math.abs(num(e.y1) - num(e.y0))) : 20;
          const u = utFresa(num(lav.d), lato === 'interno' ? Math.min(dMax / 2, 20) : 20, { d: 10, z: 4, t: 9 });
          const dt = fresa(u.d, u.z);
          const punti = pr.punti.map(p => Object.assign({}, p));
          fasi.push({ op: 'profilo', staccoFinale: pr.chiuso && lato === 'esterno', titolo: 'Contorno ' + (lato === 'interno' ? 'interno' : lato === 'esterno' ? 'esterno' : lato) + ' D' + u.d + ' T' + u.t,
            c: Object.assign({}, base, { t: u.t, d: u.d, n: dt.n, f: dt.f, punti, chiuso: pr.chiuso, lato, prof, ap: Math.max(0.5, Math.min(dt.ap || 2, prof)) }) });
        }
      });
    });
    if (nErrore) return { errore: nErrore };
    // fori: stessi gruppi del ciclo della piastra (centrino, punta, smusso, maschio / alesatore, a fresa se grandi)
    const gruppi = Array.from(gruppiFori.values());
    if (gruppi.length || tasche.some(t => t.e.tipo === 'rett' || t.e.tipo === 'cerchio')) {
      const pezzo = { fx: 1, fy: 1, fz, gx: 1, gy: 1, gz: fz, fori: [], tasche: [] };
      gruppi.forEach(g => pezzo.fori.push({ tipo: g.tipo === 'foro' ? 'foro' : g.tipo, d: g.d, passo: g.passo, passante: g.passante, prof: g.prof, toll: g.toll, smusso: g.smusso > 0 ? g.smusso : undefined,
        schema: 'elenco', testo: g.punti.map(p => 'X' + p[0] + ' Y' + p[1]).join('\n'), nf: g.punti.length }));
      tasche.filter(t => t.e.tipo === 'rett' || t.e.tipo === 'cerchio').forEach(t => {
        if (t.e.tipo === 'cerchio') pezzo.tasche.push({ tipo: 'circ', cx: num(t.e.cx), cy: num(t.e.cy), dt: 2 * num(t.e.r), prof: t.prof });
        else { const r = rettangolo(t.e); pezzo.tasche.push({ tipo: 'rett', cx: (r.x0 + r.x1) / 2, cy: (r.y0 + r.y1) / 2, lx: r.x1 - r.x0, ly: r.y1 - r.y0, prof: t.prof, r: r.r }); }
      });
      const p = O.pianificaPiastra(pezzo, ctx);
      if (p.errore) return { errore: p.errore };
      fasi.push(...p.fasi.filter(f => f.op !== 'spianatura' && f.op !== 'contorno'));
      note.testi.push(...(p.note || []).filter(t => !/^(Spianatura|Contornatura|Utensili non trovati)/.test(t)));
    }
    // tasche libere: sgrossatura a righe + finitura col profilo interno
    tasche.filter(t => t.e.tipo === 'poli').forEach(t => {
      const pr = profiloDi(t.e);
      if (!t.e.chiuso || pr.punti.length < 3) { nErrore = 'Elemento ' + (t.k + 1) + ': la tasca vuole un profilo chiuso.'; return; }
      const b = limiti([t.e]);
      const max = Math.min(b.x1 - b.x0, b.y1 - b.y0) / 2;
      const u = utFresa(num(t.lav.d), Math.min(max, 12), { d: 8, z: 3, t: 7 });
      const dt = fresa(u.d, u.z);
      const ap = Math.max(0.5, Math.min(dt.ap || 2, t.prof));
      const punti = pr.punti.map(p => Object.assign({}, p));
      fasi.push({ op: 'tascaLibera', titolo: 'Tasca libera D' + u.d + ' T' + u.t, c: Object.assign({}, base, { t: u.t, d: u.d, n: dt.n, f: dt.f, punti, prof: t.prof, ap, ae: dt.ae, sovra: 0.2 }) });
      fasi.push({ op: 'profilo', titolo: 'Finitura tasca D' + u.d + ' T' + u.t, c: Object.assign({}, base, { t: u.t, d: u.d, n: dt.n, f: dt.f, punti: punti.map(p => Object.assign({}, p)), chiuso: true, lato: 'interno', prof: t.prof, ap, soloFondo: true }) });
    });
    if (nErrore) return { errore: nErrore };
    if (!fasi.length) return { errore: 'Nessuna lavorazione: scegli un elemento e aggiungi una lavorazione.' };
    // due utensili diversi non possono avere lo stesso numero: si rinumera il secondo (i numeri della tabella restano)
    const chiaveUt = f => (f.op === 'fori' ? f.tipoUt || 'puntaMD' : 'fresa') + '|' + r3(Number(f.c.d));
    const perT = new Map(), perChiave = new Map();
    fasi.forEach(f => { const k = chiaveUt(f), t = Number(f.c.t); if (!perT.has(t)) { perT.set(t, k); if (!perChiave.has(k)) perChiave.set(k, t); } });
    fasi.forEach(f => {
      const k = chiaveUt(f), t = Number(f.c.t);
      if (perT.get(t) === k) return;
      let nt = perChiave.get(k);
      if (nt === undefined) { nt = Math.max(6, ...Array.from(perT.keys())) + 1; perT.set(nt, k); perChiave.set(k, nt); }
      f.c.t = nt; f.titolo = String(f.titolo).replace(/ T\d+$/, ' T' + nt);
    });
    note.daControllare = new Set(fasi.map(f => Number(f.c.t)).filter(t => !tab.some(u => Number(u.t) === t)));
    // il contorno esterno chiuso taglia il pezzo dal grezzo: va per ultimo
    const ordinate = O.ordinaFasi(fasi);
    ordinate.sort((a, b) => (a.staccoFinale ? 1 : 0) - (b.staccoFinale ? 1 : 0));
    const testi = note.testi.slice();
    if (note.daControllare.size) testi.push('Utensili non trovati nella tabella: numeri proposti ' + Array.from(note.daControllare).sort((a, b) => a - b).map(x => 'T' + x).join(' ') + ', da controllare.');
    return { fasi: ordinate, note: testi };
  }

  const Cad = { CAD_LAVORAZIONI: LAVORAZIONI, CAD_NOMI_LAV: NOMI_LAV, profiloCAD: profiloDi, limitiCAD: limiti, pianificaCAD };
  Object.assign(O, Cad);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
