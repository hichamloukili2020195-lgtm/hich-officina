// ===== Hich-Officina: mini CAD/CAM per la fresa, senza interfaccia =====
// Il disegno e una lista di entita (profilo, rettangolo, cerchio, punto, asola). Ogni entita porta le sue lavorazioni
// (contorno, tasca, foro, maschio, alesatura, asola). Da qui si ricava la sequenza di fasi, con i dati di taglio del
// materiale, gli utensili della tabella e l'ordine di officina; il programma lo scrive gcodeSequenza.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  const r3 = x => Math.round(x * 1000) / 1000 + 0;   // + 0: niente -0
  const num = v => { const n = Number(String(v === undefined || v === null ? '' : v).replace(',', '.')); return v === '' || v === null || v === undefined ? NaN : n; };

  /** Lavorazioni possibili per ogni tipo di entita (la prima e quella proposta). */
  const LAVORAZIONI = {
    poli: ['contorno', 'tasca', 'isola', 'incisione'],
    rett: ['contorno', 'tasca', 'isola', 'incisione'],
    cerchio: ['foro', 'maschio', 'alesato', 'tasca', 'contorno', 'isola'],
    punto: ['foro', 'maschio', 'alesato'],
    asola: ['asola'],
    testo: ['incisione']
  };
  const NOMI_LAV = { contorno: 'Contornatura', tasca: 'Tasca', foro: 'Foro', maschio: 'Maschiatura', alesato: 'Alesatura', asola: 'Asola', isola: 'Isola (resta in piedi)', incisione: 'Incisione' };

  /** Punti del profilo di un'entita chiusa o aperta, nel formato di profilo.js. Ritorna {punti, chiuso} o null. */
  function profiloDi(e) {
    if (e.tipo === 'poli') return { punti: (e.punti || []).map(p => ({ x: num(p.x), y: num(p.y), tratto: p.tratto || 'retta', r: num(p.r) || 0, raccordo: num(p.raccordo) || 0, smusso: num(p.smusso) || 0 })), chiuso: !!e.chiuso };
    if (e.tipo === 'rett') {
      const x0 = Math.min(num(e.x0), num(e.x1)), x1 = Math.max(num(e.x0), num(e.x1)), y0 = Math.min(num(e.y0), num(e.y1)), y1 = Math.max(num(e.y0), num(e.y1)), R = num(e.r) || 0;
      return { punti: [{ x: x0, y: y0, raccordo: R }, { x: x1, y: y0, raccordo: R }, { x: x1, y: y1, raccordo: R }, { x: x0, y: y1, raccordo: R }], chiuso: true };
    }
    if (e.tipo === 'asola') {
      const x1 = num(e.x1), y1 = num(e.y1), x2 = num(e.x2), y2 = num(e.y2), r = num(e.w) / 2, L = Math.hypot(x2 - x1, y2 - y1);
      if (!(r > 0) || !(L > 1e-9)) return null;
      const ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy * r, ny = ux * r;
      return { punti: [{ x: x1 - nx, y: y1 - ny, tratto: 'ccw', r }, { x: x2 - nx, y: y2 - ny }, { x: x2 + nx, y: y2 + ny, tratto: 'ccw', r }, { x: x1 + nx, y: y1 + ny }], chiuso: true };
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
      else if (e.tipo === 'testo') { (O.tratteTesto ? O.tratteTesto(e) : []).forEach(tr => tr.forEach(q => dai(q[0], q[1]))); if (!isFinite(x0)) dai(num(e.x), num(e.y)); }
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
    const fasi = [], gruppiFori = new Map(), tasche = [], smussi = [], isole = [];
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
        if (op === 'isola') { if ((LAVORAZIONI[e.tipo] || []).includes('isola')) isole.push({ e, k }); return; }
        if (!(LAVORAZIONI[e.tipo] || []).includes(op)) { nErrore = 'Elemento ' + (k + 1) + ': la lavorazione "' + (NOMI_LAV[op] || op) + '" non si puo fare su questo disegno.'; return; }
        // ----- fori -----
        if (op === 'foro' || op === 'maschio' || op === 'alesato') {
          const c = centroTondo(e, lav);
          if (!isFinite(c.x) || !isFinite(c.y) || !(c.d > 0)) { nErrore = 'Elemento ' + (k + 1) + ': scrivi il diametro del foro.'; return; }
          const passo = num(lav.passo) || O.passoGrosso(c.d);
          const chiave = [op, r3(c.d), op === 'maschio' ? r3(passo) : '', lav.passante ? 'P' : r3(prof), lav.toll || '', lav.smusso || '', num(lav.lamD) > 0 ? 'L' + r3(num(lav.lamD)) + 'x' + r3(num(lav.lamProf)) : ''].join('|');
          if (!gruppiFori.has(chiave)) gruppiFori.set(chiave, { tipo: op, d: c.d, passo, passante: !!lav.passante, prof: prof > 0 ? prof : c.d * 2, toll: lav.toll, smusso: num(lav.smusso), lamD: num(lav.lamD), lamProf: num(lav.lamProf), punti: [] });
          gruppiFori.get(chiave).punti.push([r3(c.x), r3(c.y)]);
          return;
        }
        if (num(lav.smusso) > 0) smussi.push({ e, k, lav, prof: num(lav.prof) });
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
        // ----- incisione: testo, profili aperti e contorni a linea singola -----
        if (op === 'incisione') {
          let tratti;
          if (e.tipo === 'testo') tratti = O.tratteTesto ? O.tratteTesto(e) : [];
          else { const pr = profiloDi(e), g = O.costruisciProfilo && O.costruisciProfilo(pr.punti.map(p => ({ a: p.x, b: p.y, tratto: p.tratto, r: p.r, raccordo: p.raccordo, smusso: p.smusso })), pr.chiuso); if (!g || g.errore) { nErrore = 'Elemento ' + (k + 1) + ': ' + ((g && g.errore) || 'profilo non valido') + '.'; return; } const pl = O.polilineaProfilo(g.tratti, 0.1).map(q => [q.a, q.b]); tratti = [pl]; }
          if (!tratti.length) { nErrore = 'Elemento ' + (k + 1) + ': non c\'e niente da incidere (scrivi il testo).'; return; }
          const u = utFresa(num(lav.d), 6, { d: 1, z: 2, t: 12 }), dt = fresa(u.d, u.z);
          fasi.push({ op: 'incisione', titolo: 'Incisione D' + u.d + ' T' + u.t + ' prof. ' + r3(prof), c: Object.assign({}, base, { t: u.t, d: u.d, n: dt.n, f: Math.min(dt.f || 150, 300), tratti, prof, ap: Math.max(0.1, Math.min(dt.ap || 0.5, prof)) }) });
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
    // isole: profili chiusi che restano in piedi dentro una tasca (la tasca diventa "libera")
    const poliDi = e => { const pr = profiloDi(e); if (!pr || !O.costruisciProfilo) return null; const g = O.costruisciProfilo(pr.punti.map(p => ({ a: p.x, b: p.y, tratto: p.tratto, r: p.r, raccordo: p.raccordo, smusso: p.smusso })), true); return g.errore ? null : O.polilineaProfilo(g.tratti, 0.3); };
    const dentroP = (P, x, y) => { let d = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a.b > y) !== (b.b > y) && x < (b.a - a.a) * (y - a.b) / (b.b - a.b) + a.a) d = !d; } return d; };
    tasche.forEach(t => {
      if (!['poli', 'rett', 'cerchio'].includes(t.e.tipo) || (t.e.tipo === 'poli' && !t.e.chiuso)) return;
      const fuori = poliDi(t.e); if (!fuori) return;
      const dentro = isole.filter(i => i.e.id !== t.e.id && (i.e.tipo !== 'poli' || i.e.chiuso) && (() => { const P = poliDi(i.e); return P && P.length > 2 && P.every(q => dentroP(fuori, q.a, q.b)); })());
      if (dentro.length) { t.libera = true; t.isole = dentro; dentro.forEach(i => { i.usata = true; }); }
    });
    isole.filter(i => !i.usata).forEach(i => note.testi.push('Elemento ' + (i.k + 1) + ': l\'isola non sta dentro nessuna tasca, resta solo disegnata.'));
    // fori: stessi gruppi del ciclo della piastra (centrino, punta, smusso, maschio / alesatore, a fresa se grandi)
    const gruppi = Array.from(gruppiFori.values());
    if (gruppi.length || tasche.some(t => (t.e.tipo === 'rett' || t.e.tipo === 'cerchio') && !t.libera)) {
      const pezzo = { fx: 1, fy: 1, fz, gx: 1, gy: 1, gz: fz, fori: [], tasche: [] };
      gruppi.forEach(g => pezzo.fori.push({ tipo: g.tipo === 'foro' ? 'foro' : g.tipo, d: g.d, passo: g.passo, passante: g.passante, prof: g.prof, toll: g.toll, smusso: g.smusso > 0 ? g.smusso : undefined,
        schema: 'elenco', testo: g.punti.map(p => 'X' + p[0] + ' Y' + p[1]).join('\n'), nf: g.punti.length }));
      tasche.filter(t => (t.e.tipo === 'rett' || t.e.tipo === 'cerchio') && !t.libera).forEach(t => {
        if (t.e.tipo === 'cerchio') pezzo.tasche.push({ tipo: 'circ', cx: num(t.e.cx), cy: num(t.e.cy), dt: 2 * num(t.e.r), prof: t.prof });
        else { const r = rettangolo(t.e); pezzo.tasche.push({ tipo: 'rett', cx: (r.x0 + r.x1) / 2, cy: (r.y0 + r.y1) / 2, lx: r.x1 - r.x0, ly: r.y1 - r.y0, prof: t.prof, r: r.r }); }
      });
      const p = O.pianificaPiastra(pezzo, ctx);
      if (p.errore) return { errore: p.errore };
      fasi.push(...p.fasi.filter(f => f.op !== 'spianatura' && f.op !== 'contorno'));
      // lamature: lamatore sul foro gia fatto, con sosta sul fondo
      gruppi.filter(g => g.lamD > 0).forEach(g => {
        const pr0 = g.lamProf > 0 ? g.lamProf : r3(g.d * 0.6);
        if (tab.length && !tab.some(u => u.tipo === 'lamatore' && Math.abs(Number(u.d) - g.lamD) < 0.05)) {
          // nessun lamatore di quel diametro nella tabella: la lamatura si fa a fresa a elica
          const u = utFresa(0, g.lamD * 0.6, { d: Math.min(10, Math.floor(g.lamD * 0.6)), z: 3, t: 7 }), dt = fresa(u.d, u.z);
          g.punti.forEach((q, i) => fasi.push({ op: 'tascaCircolare', titolo: 'Lamatura Ø' + r3(g.lamD) + ' a fresa ' + (i + 1) + ' D' + u.d + ' T' + u.t, c: Object.assign({}, base, { t: u.t, d: u.d, n: dt.n, f: dt.f, cx: q[0], cy: q[1], dt: g.lamD, prof: pr0, ap: Math.max(0.5, Math.min(dt.ap || 2, pr0)), ae: 40, sovra: 0.1, finitura: true }) }));
          note.testi.push('Lamatura Ø' + r3(g.lamD) + ': nessun lamatore di quel diametro nella tabella, si fa a fresa a elica.');
          return;
        }
        const dt = O.datiTaglio(mt, { tipo: 'lamatore', d: g.lamD, nmax }) || {};
        const t = O.trovaT(tab, ['lamatore'], g.lamD, 11, note);
        const pr = g.lamProf > 0 ? g.lamProf : r3(g.d * 0.6);
        fasi.push({ op: 'fori', tipoUt: 'lamatore', titolo: 'Lamatura Ø' + r3(g.lamD) + ' prof. ' + r3(pr) + ' (' + g.punti.length + ' fori) T' + t,
          c: Object.assign({}, base, { t, n: dt.n || 500, f: dt.f || 60, punti: g.punti.map(q => q.slice()), prof: pr, d: g.lamD, ciclo: 'G82', sosta: 500 }) });
      });
      note.testi.push(...(p.note || []).filter(t => !/^(Spianatura|Contornatura|Utensili non trovati)/.test(t)));
    }
    // tasche libere: sgrossatura a righe + finitura col profilo interno
    tasche.filter(t => t.e.tipo === 'poli' || t.libera).forEach(t => {
      const pr = profiloDi(t.e);
      if ((t.e.tipo === 'poli' && !t.e.chiuso) || (pr.punti.length < 3 && t.e.tipo !== 'cerchio')) { nErrore = 'Elemento ' + (t.k + 1) + ': la tasca vuole un profilo chiuso.'; return; }
      const b = limiti([t.e]);
      const max = Math.min(b.x1 - b.x0, b.y1 - b.y0) / 2;
      const u = utFresa(num(t.lav.d), Math.min(max, 12), { d: 8, z: 3, t: 7 });
      const dt = fresa(u.d, u.z);
      const ap = Math.max(0.5, Math.min(dt.ap || 2, t.prof));
      const punti = pr.punti.map(p => Object.assign({}, p));
      fasi.push({ op: 'tascaLibera', titolo: 'Tasca libera D' + u.d + ' T' + u.t, c: Object.assign({}, base, { t: u.t, d: u.d, n: dt.n, f: dt.f, punti, prof: t.prof, ap, ae: dt.ae, sovra: 0.2, isole: (t.isole || []).map(i => profiloDi(i.e).punti.map(p => Object.assign({}, p))) }) });
      fasi.push({ op: 'profilo', titolo: 'Finitura tasca D' + u.d + ' T' + u.t, c: Object.assign({}, base, { t: u.t, d: u.d, n: dt.n, f: dt.f, punti: punti.map(p => Object.assign({}, p)), chiuso: true, lato: 'interno', prof: t.prof, ap, soloFondo: true }) });
      (t.isole || []).forEach(i => fasi.push({ op: 'profilo', titolo: 'Finitura isola D' + u.d + ' T' + u.t, c: Object.assign({}, base, { t: u.t, d: u.d, n: dt.n, f: dt.f, punti: profiloDi(i.e).punti.map(p => Object.assign({}, p)), chiuso: true, lato: 'esterno', prof: t.prof, ap, soloFondo: true }) }));
    });
    if (nErrore) return { errore: nErrore };
    // smussi dei bordi (tasche, asole, contorni) con lo smussatore a 90°: punta sotto lo smusso di k, percorso spostato di k
    smussi.forEach(({ e, k, lav, prof }) => {
      const c = num(lav.smusso), pr = profiloDi(e);
      if (!pr || !pr.chiuso) { note.testi.push('Elemento ' + (k + 1) + ': lo smusso si fa solo sui profili chiusi.'); return; }
      const kk = Math.min(1, r3(prof - c - 0.2));
      if (!(kk >= 0.2)) { note.testi.push('Elemento ' + (k + 1) + ': smusso C' + c + ' troppo grande per la profondita ' + prof + ': saltato.'); return; }
      const lato = lav.op === 'contorno' ? (lav.lato === 'interno' ? 'interno' : 'esterno') : 'interno';
      const dt = O.datiTaglio(mt, { tipo: 'smussatore', d: 16, nmax }) || {};
      const t = O.trovaT(tab, ['smussatore'], 0, 4, note);
      const stacco = lav.op === 'contorno' && lato === 'esterno';
      fasi.push({ op: 'profilo', smussoBordo: true, staccoFinale: stacco, titolo: 'Smusso C' + c + ' ' + (NOMI_LAV[lav.op] || lav.op).toLowerCase() + ' ' + (k + 1) + ' T' + t,
        c: Object.assign({}, base, { t, d: r3(2 * kk), utTipo: 'smussatore', n: dt.n || 3000, f: dt.f || 300, punti: pr.punti.map(p => Object.assign({}, p)), chiuso: true, lato, prof: r3(c + kk), ap: r3(c + kk) }) });
    });
    if (smussi.length) note.testi.push('Smussi a 45° con lo smussatore a punta: la punta scende sotto lo smusso, la parte che taglia e a meta cono.');
    if (!fasi.length) return { errore: 'Nessuna lavorazione: scegli un elemento e aggiungi una lavorazione.' };
    // due utensili diversi non possono avere lo stesso numero: si rinumera il secondo (i numeri della tabella restano)
    const chiaveUt = f => { const tp = f.op === 'fori' ? f.tipoUt || 'puntaMD' : f.c.utTipo || 'fresa'; return tp + '|' + (tp === 'smussatore' ? 'S' : r3(Number(f.c.d))); };
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

  // ======================= inserimento numerico: espressioni, coordinate assolute, incrementali, polari =======================
  /**
   * Valore di un'espressione scritta a mano: 50/2+3, (10+5)*2, sqrt(2)*10, 30*sin(45), pi*20. Virgola o punto decimale.
   * Niente eval: un piccolo interprete. Ritorna il numero oppure NaN. Gli angoli di sin, cos e tan sono in gradi.
   */
  // parametri nominati del disegno (L, H, spessore...): valgono in tutte le espressioni
  let PARAMETRI = {};
  const RISERVATE = ['pi', 'sqrt', 'abs', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan'];
  /** Nome valido per un parametro: lettere, cifre e _, comincia con una lettera, senza la lettera x (serve per 40x30) e non riservato. */
  function nomeParametroValido(n) { n = String(n || '').trim().toLowerCase(); return /^[a-z][a-z0-9_]*$/.test(n) && n.indexOf('x') < 0 && !RISERVATE.includes(n); }
  /** Imposta i parametri da una lista [{n, v}] (v puo usare i parametri scritti prima). Ritorna {errori:[...]} con i problemi trovati. */
  function impostaParametri(lista) {
    PARAMETRI = {}; const errori = [];
    (lista || []).forEach(p => {
      const n = String(p && p.n || '').trim().toLowerCase();
      if (!n && !String(p && p.v || '').trim()) return;
      if (!nomeParametroValido(n)) { errori.push('Nome non valido: "' + (p && p.n) + '" (lettere e cifre, senza x, non pi/sqrt/sin...)'); return; }
      if (Object.prototype.hasOwnProperty.call(PARAMETRI, n)) { errori.push('Il nome "' + n + '" e scritto due volte.'); return; }
      const v = espressione(p.v);
      if (!isFinite(v)) { errori.push('"' + n + '": valore non valido (' + p.v + ')'); return; }
      PARAMETRI[n] = v;
    });
    return { errori };
  }
  function espressione(testo) {
    const t = String(testo === undefined || testo === null ? '' : testo).replace(/,/g, '.').replace(/\s+/g, '').toLowerCase();
    if (!t) return NaN;
    let i = 0;
    const FUNZ = { sqrt: Math.sqrt, abs: Math.abs, sin: x => Math.sin(x * Math.PI / 180), cos: x => Math.cos(x * Math.PI / 180), tan: x => Math.tan(x * Math.PI / 180), asin: x => Math.asin(x) * 180 / Math.PI, acos: x => Math.acos(x) * 180 / Math.PI, atan: x => Math.atan(x) * 180 / Math.PI };
    const fallisci = () => { throw new Error('x'); };
    function somma() { let v = prodotto(); while (i < t.length && (t[i] === '+' || t[i] === '-')) { const o = t[i++]; const w = prodotto(); v = o === '+' ? v + w : v - w; } return v; }
    function prodotto() { let v = potenza(); while (i < t.length && (t[i] === '*' || t[i] === '/')) { const o = t[i++]; const w = potenza(); if (o === '/') { if (w === 0) fallisci(); v /= w; } else v *= w; } return v; }
    function potenza() { const b = unario(); if (t[i] === '^') { i++; return Math.pow(b, potenza()); } return b; }
    function unario() { if (t[i] === '-') { i++; return -unario(); } if (t[i] === '+') { i++; return unario(); } return atomo(); }
    function atomo() {
      if (t[i] === '(') { i++; const v = somma(); if (t[i] !== ')') fallisci(); i++; return v; }
      const n = /^(\d+\.?\d*|\.\d+)/.exec(t.slice(i));
      if (n) { i += n[0].length; return Number(n[0]); }
      const w = /^[a-z]+/.exec(t.slice(i));
      if (!w) fallisci();
      i += w[0].length;
      if (w[0] === 'pi') return Math.PI;
      if (Object.prototype.hasOwnProperty.call(PARAMETRI, w[0]) && t[i] !== '(') return PARAMETRI[w[0]];
      if (FUNZ[w[0]] && t[i] === '(') { i++; const v = somma(); if (t[i] !== ')') fallisci(); i++; return FUNZ[w[0]](v); }
      return fallisci();
    }
    try { const v = somma(); return i === t.length && isFinite(v) ? v : NaN; } catch (e) { return NaN; }
  }
  /**
   * Un punto scritto a mano. Forme: "50; 30" o "50,30" (assoluto), "@10; 5" (incrementale dall'ultimo punto), "@20<45" (polare dall'ultimo punto:
   * lunghezza < angolo in gradi), "20<45" (polare dall'origine). Ogni parte puo essere un'espressione. Ritorna {x, y, tipo} oppure {errore}.
   */
  function puntoDaTesto(testo, ref) {
    let t = String(testo || '').trim();
    if (!t) return { errore: 'Scrivi un punto, per esempio 50; 30' };
    const incr = t[0] === '@';
    if (incr) t = t.slice(1).trim();
    const base = incr && ref && isFinite(ref.x) && isFinite(ref.y) ? ref : { x: 0, y: 0 };
    if (incr && !(ref && isFinite(ref.x))) { /* senza punto di partenza parte dall'origine */ }
    if (t.indexOf('<') >= 0) {
      const [l, a] = t.split('<');
      const L = espressione(l), ang = espressione(a);
      if (!isFinite(L) || !isFinite(ang)) return { errore: 'Polare non valido: scrivi lunghezza<angolo, per esempio @20<45' };
      return { x: r3(base.x + L * Math.cos(ang * Math.PI / 180)), y: r3(base.y + L * Math.sin(ang * Math.PI / 180)), tipo: 'polare' };
    }
    let parti;
    if (t.indexOf(';') >= 0) parti = t.split(';');
    else if ((t.match(/,/g) || []).length === 1) parti = t.split(',');
    else parti = null;
    if (!parti || parti.length !== 2) return { errore: 'Scrivi X e Y separati da punto e virgola, per esempio 50; 30' };
    const x = espressione(parti[0]), y = espressione(parti[1]);
    if (!isFinite(x) || !isFinite(y)) return { errore: 'Non capisco "' + t + '": controlla i numeri e le parentesi' };
    return { x: r3(base.x + x), y: r3(base.y + y), tipo: incr ? 'incrementale' : 'assoluto' };
  }

  // ======================= archi e poligoni =======================
  const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const norm2pi = a => { a = a % (2 * Math.PI); return a < 0 ? a + 2 * Math.PI : a; };
  /** Arco da tre punti (inizio, un punto sull'arco, fine). Ritorna {cx, cy, r, tratto:'ccw'|'cw', raggio (negativo se oltre 180 gradi), sweep (gradi), punti} o {errore}. */
  function arcoDa3Punti(p1, p2, p3) {
    const d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
    if (Math.abs(d) < 1e-9) return { errore: 'I tre punti sono su una linea: non c\'e un arco.' };
    const q1 = p1.x * p1.x + p1.y * p1.y, q2 = p2.x * p2.x + p2.y * p2.y, q3 = p3.x * p3.x + p3.y * p3.y;
    const cx = (q1 * (p2.y - p3.y) + q2 * (p3.y - p1.y) + q3 * (p1.y - p2.y)) / d, cy = (q1 * (p3.x - p2.x) + q2 * (p1.x - p3.x) + q3 * (p2.x - p1.x)) / d;
    const r = Math.hypot(p1.x - cx, p1.y - cy);
    const cross = (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);
    const ccw = cross > 0, a1 = Math.atan2(p1.y - cy, p1.x - cx), a3 = Math.atan2(p3.y - cy, p3.x - cx);
    const sweep = ccw ? norm2pi(a3 - a1) : norm2pi(a1 - a3);
    return arcoPunti(p1, p3, { cx, cy, r, tratto: ccw ? 'ccw' : 'cw', sweep });
  }
  function arcoPunti(s, f, a) {
    const lungo = a.sweep > Math.PI + 1e-9;
    return { cx: r3(a.cx), cy: r3(a.cy), r: r3(a.r), tratto: a.tratto, raggio: r3(lungo ? -a.r : a.r), sweep: r3(a.sweep * 180 / Math.PI),
      punti: [{ x: r3(s.x), y: r3(s.y) }, { x: r3(f.x), y: r3(f.y), tratto: a.tratto, r: r3(lungo ? -a.r : a.r) }] };
  }
  /** Arco da centro, punto iniziale e punto che da la direzione della fine (si proietta sul cerchio). antiorario = verso. */
  function arcoCentroInizioFine(c, s, f, antiorario) {
    const r = dist2(c, s);
    if (r < 1e-6) return { errore: 'Il punto iniziale e sul centro.' };
    if (dist2(c, f) < 1e-6) return { errore: 'Il punto finale e sul centro.' };
    const a1 = Math.atan2(s.y - c.y, s.x - c.x), a2 = Math.atan2(f.y - c.y, f.x - c.x), ccw = antiorario !== false;
    const sweep = ccw ? norm2pi(a2 - a1) : norm2pi(a1 - a2);
    if (sweep < 1e-6) return { errore: 'Inizio e fine sono nello stesso punto.' };
    return arcoPunti(s, { x: c.x + r * Math.cos(a2), y: c.y + r * Math.sin(a2) }, { cx: c.x, cy: c.y, r, tratto: ccw ? 'ccw' : 'cw', sweep });
  }
  /** Arco da punto iniziale, punto finale e raggio. grande = arco oltre i 180 gradi; orario = verso. */
  function arcoInizioFineRaggio(s, f, raggio, grande, orario) {
    const R = Math.abs(Number(raggio)), d = dist2(s, f);
    if (!(R > 0)) return { errore: 'Scrivi il raggio.' };
    if (d < 1e-6) return { errore: 'Inizio e fine sono nello stesso punto.' };
    if (R < d / 2 - 1e-6) return { errore: 'Il raggio (' + R + ') e piu piccolo di meta della distanza tra i punti (' + r3(d / 2) + ').' };
    const tratto = orario ? 'cw' : 'ccw', lato = tratto === 'cw' ? -1 : 1 * (grande ? -1 : 1) * 1;
    void lato;
    const h = Math.sqrt(Math.max(0, R * R - d * d / 4)), m = { x: (s.x + f.x) / 2, y: (s.y + f.y) / 2 }, ux = (f.x - s.x) / d, uy = (f.y - s.y) / d;
    // come nel profilo: arco corto, centro a destra per l'orario e a sinistra per l'antiorario; grande = centro dall'altra parte
    let l = tratto === 'cw' ? -1 : 1; if (grande) l = -l;
    const c = { x: m.x + l * -uy * h, y: m.y + l * ux * h };
    const a1 = Math.atan2(s.y - c.y, s.x - c.x), a2 = Math.atan2(f.y - c.y, f.x - c.x);
    const sweep = tratto === 'ccw' ? norm2pi(a2 - a1) : norm2pi(a1 - a2);
    return arcoPunti(s, f, { cx: c.x, cy: c.y, r: R, tratto, sweep });
  }
  /** Poligono regolare inscritto nel cerchio (cx, cy, r) con n lati; il primo vertice a angolo0 gradi. Ritorna i punti. */
  function poligonoRegolare(cx, cy, r, n, angolo0) {
    n = Math.round(n);
    if (!(n >= 3) || !(r > 0)) return [];
    const a0 = (Number(angolo0) || 0) * Math.PI / 180, out = [];
    for (let k = 0; k < n; k++) { const a = a0 + k * 2 * Math.PI / n; out.push({ x: r3(cx + r * Math.cos(a)), y: r3(cy + r * Math.sin(a)) }); }
    return out;
  }

  // ======================= aggancio intelligente =======================
  /** Segmenti, cerchi e punti notevoli di tutte le entita (per l'aggancio). */
  function geometriaCAD(entita, esclusa) {
    const G = { seg: [], cerchi: [], estremi: [], centri: [], medi: [] };
    const seg = (a, b, e) => { if (Math.hypot(a.x - b.x, a.y - b.y) > 1e-9) G.seg.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, e: e.id }); };
    (entita || []).forEach(e => {
      if (e.id === esclusa) return;
      if (e.tipo === 'punto') { G.estremi.push({ x: num(e.x), y: num(e.y) }); return; }
      if (e.tipo === 'cerchio') {
        const c = { cx: num(e.cx), cy: num(e.cy), r: num(e.r) };
        G.cerchi.push(Object.assign(c, { e: e.id })); G.centri.push({ x: c.cx, y: c.cy });
        [[c.r, 0], [-c.r, 0], [0, c.r], [0, -c.r]].forEach(q => G.estremi.push({ x: c.cx + q[0], y: c.cy + q[1] }));
        return;
      }
      if (e.tipo === 'asola') {
        const a = { x: num(e.x1), y: num(e.y1) }, b = { x: num(e.x2), y: num(e.y2) };
        G.estremi.push(a, b); G.medi.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }); seg(a, b, e); return;
      }
      const pr = profiloDi(e);
      if (!pr) return;
      const g = O.costruisciProfilo ? O.costruisciProfilo(pr.punti.map(p => ({ a: p.x, b: p.y, tratto: p.tratto, r: p.r, raccordo: p.raccordo, smusso: p.smusso })), pr.chiuso) : { errore: 'x', tratti: [] };
      if (g.errore || !g.tratti.length) { pr.punti.forEach(p => { if (isFinite(p.x) && isFinite(p.y)) G.estremi.push({ x: p.x, y: p.y }); }); return; }
      g.tratti.forEach(t => {
        const p = { x: t.p.a, y: t.p.b }, q = { x: t.q.a, y: t.q.b };
        G.estremi.push(p, q);
        if (t.tipo === 'L') { seg(p, q, e); G.medi.push({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }); }
        else {
          G.centri.push({ x: t.c.a, y: t.c.b });
          const poli = O.polilineaProfilo([t], Math.max(0.1, t.r / 40));
          for (let i = 1; i < poli.length; i++) seg({ x: poli[i - 1].a, y: poli[i - 1].b }, { x: poli[i].a, y: poli[i].b }, e);
          const m = poli[Math.floor(poli.length / 2)]; if (m) G.medi.push({ x: m.a, y: m.b });
        }
      });
    });
    return G;
  }
  const interSegSeg = (s, t) => {
    const d1x = s.bx - s.ax, d1y = s.by - s.ay, d2x = t.bx - t.ax, d2y = t.by - t.ay, den = d1x * d2y - d1y * d2x;
    if (Math.abs(den) < 1e-12) return null;
    const u = ((t.ax - s.ax) * d2y - (t.ay - s.ay) * d2x) / den, v = ((t.ax - s.ax) * d1y - (t.ay - s.ay) * d1x) / den;
    if (u < -1e-9 || u > 1 + 1e-9 || v < -1e-9 || v > 1 + 1e-9) return null;
    return { x: s.ax + u * d1x, y: s.ay + u * d1y };
  };
  const interSegCerchio = (s, c) => {
    const dx = s.bx - s.ax, dy = s.by - s.ay, fx = s.ax - c.cx, fy = s.ay - c.cy, a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), cc = fx * fx + fy * fy - c.r * c.r, D = b * b - 4 * a * cc;
    if (a < 1e-12 || D < 0) return [];
    const r = Math.sqrt(D), out = [];
    [(-b - r) / (2 * a), (-b + r) / (2 * a)].forEach(u => { if (u >= -1e-9 && u <= 1 + 1e-9) out.push({ x: s.ax + u * dx, y: s.ay + u * dy }); });
    return out;
  };
  const interCerchioCerchio = (c1, c2) => {
    const d = Math.hypot(c2.cx - c1.cx, c2.cy - c1.cy);
    if (d < 1e-9 || d > c1.r + c2.r + 1e-9 || d < Math.abs(c1.r - c2.r) - 1e-9) return [];
    const a = (c1.r * c1.r - c2.r * c2.r + d * d) / (2 * d), h = Math.sqrt(Math.max(0, c1.r * c1.r - a * a)), mx = c1.cx + a * (c2.cx - c1.cx) / d, my = c1.cy + a * (c2.cy - c1.cy) / d;
    return [{ x: mx + h * (c2.cy - c1.cy) / d, y: my - h * (c2.cx - c1.cx) / d }, { x: mx - h * (c2.cy - c1.cy) / d, y: my + h * (c2.cx - c1.cx) / d }];
  };
  /**
   * Il punto di aggancio piu utile vicino a (x, y), entro tol mm. Priorita: intersezione, punto (estremo/centro/quadrante), punto medio,
   * perpendicolare e tangente dall'ultimo punto (ref). Ritorna {x, y, tipo} con tipo: 'intersezione' | 'punto' | 'centro' | 'medio' |
   * 'perpendicolare' | 'tangente', oppure null.
   */
  function agganciCAD(entita, x, y, tol, ref, esclusa, G) {
    G = G || geometriaCAD(entita, esclusa);
    const vicini = (a, b) => Math.hypot(a.x - x, a.y - y) <= b;
    const dSeg = s => { const dx = s.bx - s.ax, dy = s.by - s.ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((x - s.ax) * dx + (y - s.ay) * dy) / l2)) : 0; return Math.hypot(x - s.ax - t * dx, y - s.ay - t * dy); };
    const cand = [];   // {x, y, tipo, pri}
    const metti = (p, tipo, pri) => { const d = Math.hypot(p.x - x, p.y - y); if (d <= tol) cand.push({ x: p.x, y: p.y, tipo, pri, d }); };
    // solo la geometria vicina al cursore entra nel calcolo delle intersezioni (veloce anche con migliaia di entita)
    const sv = G.seg.filter(s => dSeg(s) < tol * 3), cv = G.cerchi.filter(c => Math.abs(Math.hypot(x - c.cx, y - c.cy) - c.r) < tol * 3);
    for (let i = 0; i < sv.length; i++) {
      for (let j = i + 1; j < sv.length; j++) if (sv[i].e !== sv[j].e || true) { const p = interSegSeg(sv[i], sv[j]); if (p && !(sv[i].e === sv[j].e && (Math.hypot(sv[i].bx - sv[j].ax, sv[i].by - sv[j].ay) < 1e-6 || Math.hypot(sv[i].ax - sv[j].bx, sv[i].ay - sv[j].by) < 1e-6))) metti(p, 'intersezione', 0); }
      cv.forEach(c => interSegCerchio(sv[i], c).forEach(p => metti(p, 'intersezione', 0)));
    }
    for (let i = 0; i < cv.length; i++) for (let j = i + 1; j < cv.length; j++) interCerchioCerchio(cv[i], cv[j]).forEach(p => metti(p, 'intersezione', 0));
    G.centri.forEach(p => metti(p, 'centro', 1));
    G.estremi.forEach(p => metti(p, 'punto', 1));
    G.medi.forEach(p => metti(p, 'medio', 2));
    if (ref && isFinite(ref.x)) {
      sv.forEach(s => { const dx = s.bx - s.ax, dy = s.by - s.ay, l2 = dx * dx + dy * dy; if (!l2) return; const t = ((ref.x - s.ax) * dx + (ref.y - s.ay) * dy) / l2; if (t > 0.001 && t < 0.999) metti({ x: s.ax + t * dx, y: s.ay + t * dy }, 'perpendicolare', 3); });
      cv.forEach(c => {
        const dx = ref.x - c.cx, dy = ref.y - c.cy, d = Math.hypot(dx, dy);
        if (d <= c.r + 1e-9) return;
        const a = Math.atan2(dy, dx), b = Math.acos(c.r / d);
        [a + b, a - b].forEach(t => metti({ x: c.cx + c.r * Math.cos(t), y: c.cy + c.r * Math.sin(t) }, 'tangente', 3));
      });
    }
    if (!cand.length) return null;
    cand.sort((p, q) => p.pri - q.pri || p.d - q.d);
    // un punto notevole molto piu vicino batte un'intersezione lontana
    const migliore = cand.find(p => p.d <= cand[0].d + tol * 0.6) || cand[0];
    return { x: r3(migliore.x), y: r3(migliore.y), tipo: migliore.tipo };
  }

  const Cad = { impostaParametri, nomeParametroValido, parametriCAD: () => Object.assign({}, PARAMETRI), CAD_LAVORAZIONI: LAVORAZIONI, CAD_NOMI_LAV: NOMI_LAV, profiloCAD: profiloDi, limitiCAD: limiti, pianificaCAD, espressione, puntoDaTesto, arcoDa3Punti, arcoCentroInizioFine, arcoInizioFineRaggio, poligonoRegolare, geometriaCAD, agganciCAD };
  Object.assign(O, Cad);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
