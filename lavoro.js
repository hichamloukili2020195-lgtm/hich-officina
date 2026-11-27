// ===== Hich-Officina: il lavoro guidato (grezzo, forma, lavorazioni, programma), senza interfaccia =====
// Lo stesso percorso per fresa e tornio. La forma si scrive a quote: per il tornio una catena di tratti dalla testa
// verso il mandrino, per la fresa forme pronte (tasche, fori, fori a cerchio e a griglia, asole, profili). Le lavorazioni
// si propongono da sole con le regole di officina; ognuna si puo spegnere o correggere (giri, avanzamento).
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  if (typeof module !== 'undefined' && module.exports) require('./filetti.js');
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
      // filetto conico (gas R, NPT): il tratto cresce 1:16 sul diametro verso il mandrino
      const conico = (t.tipo || 'cil') === 'cil' && pos(num(t.fil)) && O.datiFiletto && O.datiFiletto({ fam: t.filFam, d: dt, p: num(t.fil) }).conico;
      const p = { x: conico ? r3(dt + L / 16) : dt, z };
      if (t.tipo === 'arco') {
        const R = num(t.r);
        const corda = Math.hypot(L, (dt - d) / 2);
        if (!(R >= corda / 2 - 1e-6)) return { errore: 'Tratto ' + (i + 1) + ': raggio troppo piccolo (almeno ' + r3(corda / 2) + ').', punti: [] };
        p.tratto = t.forma === 'incavato' ? 'cw' : 'ccw'; p.r = R;
      }
      if (t.tipo === 'cil') { if (pos(num(t.fil))) { p.fil = num(t.fil); if (t.filFam) p.filFam = t.filFam; if (t.filNome) p.filNome = t.filNome; } if (pos(num(t.gola))) p.gola = num(t.gola); if (pos(num(t.golaProf))) p.golaProf = num(t.golaProf); if (t.toll && String(t.toll).trim()) p.toll = String(t.toll).trim(); if (pos(num(t.zig))) { p.zig = num(t.zig); if (t.zigTipo) p.zigTipo = t.zigTipo; } if (pos(num(t.rett))) p.rett = num(t.rett); }
      spigolo(p, t.spigolo);
      P.push(p);
      d = p.x;
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
      if (pos(num(f.smusso))) l.smusso = num(f.smusso);
      if (pos(num(f.lamD))) { l.lamD = num(f.lamD); l.lamProf = pos(num(f.lamProf)) ? num(f.lamProf) : r3(num(f.d) * 0.6); }
      return l;
    };
    const punto = (x, y, f) => E.push({ id: id++, tipo: 'punto', x: r3(x), y: r3(y), lav: [lavForo(f)] });
    (forme || []).forEach(f => {
      if (f.spenta) return;
      if (f.tipo === 'tasca') {
        const lx = num(f.lx), ly = num(f.ly), cx = num(f.cx), cy = num(f.cy);
        E.push({ id: id++, tipo: 'rett', x0: r3(cx - lx / 2), y0: r3(cy - ly / 2), x1: r3(cx + lx / 2), y1: r3(cy + ly / 2), r: num(f.r) || 0, lav: [{ op: 'tasca', prof: num(f.prof), d: num(f.du), smusso: num(f.smusso) || 0 }] });
      } else if (f.tipo === 'tascaTonda') E.push({ id: id++, tipo: 'cerchio', cx: num(f.cx), cy: num(f.cy), r: num(f.dt) / 2, lav: [{ op: 'tasca', prof: num(f.prof), d: num(f.du), smusso: num(f.smusso) || 0 }] });
      else if (f.tipo === 'asola') E.push({ id: id++, tipo: 'asola', x1: num(f.x1), y1: num(f.y1), x2: num(f.x2), y2: num(f.y2), w: num(f.w), lav: [{ op: 'asola', prof: num(f.prof), d: num(f.du), smusso: num(f.smusso) || 0 }] });
      else if (f.tipo === 'foro') punto(num(f.x), num(f.y), f);
      else if (f.tipo === 'foriCerchio') {
        const n = Math.max(1, Math.round(num(f.n) || 1));
        for (let k = 0; k < n; k++) { const a = ((num(f.a0) || 0) + k * 360 / n) * Math.PI / 180; punto(num(f.cx) + num(f.dc) / 2 * Math.cos(a), num(f.cy) + num(f.dc) / 2 * Math.sin(a), f); }
      } else if (f.tipo === 'foriGriglia') {
        const nx = Math.max(1, Math.round(num(f.nx) || 1)), ny = Math.max(1, Math.round(num(f.ny) || 1));
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) punto(num(f.x0) + i * (num(f.px) || 0), num(f.y0) + j * (num(f.py) || 0), f);
      } else if (f.tipo === 'profilo') {
        E.push({ id: id++, tipo: 'poli', chiuso: f.chiuso !== false, punti: (f.punti || []).map(p => ({ x: num(p.x), y: num(p.y), raccordo: num(p.raccordo) || 0, smusso: num(p.smusso) || 0 })), lav: [{ op: f.lav === 'tasca' ? 'tasca' : 'contorno', prof: num(f.prof), lato: f.lato || 'esterno', d: num(f.du), smusso: num(f.smusso) || 0 }] });
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
      // foro in asse: liscio, filettato (preforo + maschio) o alesato (punta piu piccola + alesatore)
      const tipoF = L.foroTipo === 'maschio' || L.foroTipo === 'alesato' ? L.foroTipo : 'foro', dN = num(L.foroD);
      const pM = tipoF === 'maschio' ? (pos(num(L.foroPasso)) ? num(L.foroPasso) : O.passoGrosso(dN) || 1.5) : 0;
      const dPunta = !pos(dN) ? NaN : tipoF === 'maschio' ? r3(O.filetto(dN, pM).preforo) : tipoF === 'alesato' ? r3(dN - (dN <= 10 ? 0.2 : 0.3)) : dN;
      const profF = pos(num(L.foroP)) ? num(L.foroP) : 2 * dN;
      // con il lato B la troncatura lascia la lunghezza finita piu 1 mm da sfacciare dopo
      const conB = !!(L.fase2 && L.fase2.on && pos(num(L.fase2.lTot)) && num(L.fase2.lTot) > pr.lunghezza);
      const lTaglio = conB ? num(L.fase2.lTot) + 1 : pr.lunghezza;
      const a = O.pianificaAlbero({ dg, lg: Math.max(num(g.lg) || 0, lTaglio + 5), smusso: 0, tratti: [{ d: dg, l: lTaglio }], foro: pos(dN) ? { d: dPunta, prof: profF + (tipoF === 'maschio' ? 2 * pM : 0) } : null, troncatura: !!L.troncatura }, ctx);
      const extra = a.errore ? [] : a.fasi.filter(f => f.op !== 'profilo');
      const prima = extra.filter(f => f.op === 'sfacciatura' || f.op === 'foratura'), dopo = extra.filter(f => f.op === 'troncatura');
      // barenatura interna e filetto interno: dopo il foro in asse (la barenatura) e dopo il filetto esterno (il filetto)
      const I = tipoF === 'foro' ? (L.interno || {}) : {}, dpF = dPunta, di = num(I.di), li = num(I.l);
      const base = { nmax: ctx.nmax || 3000, codLimite: ctx.codLimite, codFiletto: ctx.codFiletto, refrig: ctx.refrig };
      const mt = ctx.mat, tab = ctx.tab || [], nt = { testi: [], daControllare: new Set() };
      let internaF = [], filettoI = [];
      if (pos(di) && pos(li)) {
        if (!pos(dpF)) return { errore: 'La barenatura interna parte dal foro in asse: scrivi il diametro del foro.' };
        if (di <= dpF) return { errore: 'La barenatura (Ø' + di + ') deve essere piu grande del foro (Ø' + dpF + ').' };
        if (di >= dg - 2) return { errore: 'La barenatura (Ø' + di + ') lascia troppo poca parete nel pezzo (Ø' + dg + ').' };
        const tB = O.trovaT(tab, ['bareno'], 0, 7, nt);
        // con il filetto interno la barenatura si ferma al nocciolo (il filetto toglie il resto)
        const FI = pos(num(I.fil)) ? O.datiFiletto({ fam: I.filFam, nome: I.filNome, d: di, p: num(I.fil) }) : null;
        const dBar = FI ? r3(FI.conico ? FI.d1 - li / 16 : FI.d1) : di;
        if (FI && dBar <= dpF) return { errore: 'Il foro in asse (Ø' + dpF + ') e piu grande del nocciolo del filetto interno (Ø' + dBar + '): fai un foro piu piccolo.' };
        // altri tratti interni dopo il primo (cilindri o coni, sempre piu stretti verso il fondo): profilo interno completo
        const altri = (I.altri || []).filter(t => t && pos(num(t.d)) && pos(num(t.l)));
        if (altri.length) {
          const P = [{ x: dBar, z: 0, smusso: FI ? 0 : 0.5 }];
          let z = 0, d = dBar;
          P.push({ x: dBar, z: r3(-li) }); z = -li;
          for (let k = 0; k < altri.length; k++) {
            const t = altri[k], dt = num(t.d);
            if (dt > d + 1e-9) return { errore: 'Tratto interno ' + (k + 2) + ' (Ø' + dt + ') piu largo di quello prima: un allargamento verso il fondo si fa con la gola interna.' };
            if (dt <= dpF) return { errore: 'Tratto interno ' + (k + 2) + ' (Ø' + dt + '): deve essere piu grande del foro in asse (Ø' + dpF + ').' };
            if (t.tipo !== 'cono' && Math.abs(dt - d) > 1e-9) P.push({ x: dt, z });
            z = r3(z - num(t.l)); P.push({ x: dt, z }); d = dt;
          }
          P.push({ x: dpF, z });
          internaF.push({ op: 'profiloInterno', titolo: 'Profilo interno ' + (altri.length + 1) + ' tratti T' + tB, c: Object.assign({}, base, { t: tB, dp: dpF, dg, punti: P, ap: 1, sx: 0.3, sz: 0.1, finitura: true, ff: r3(Math.max(0.05, (mt.lf || 0.2) * 0.3)), vc: r3((mt.lvc || 100) * 0.7), f: r3(Math.max(0.05, (mt.lf || 0.2) * 0.6)) }) });
        } else internaF.push({ op: 'interna', titolo: 'Barenatura interna Ø' + dBar + ' T' + tB, c: Object.assign({}, base, { t: tB, dp: dpF, di: dBar, dg, l: li, ap: 1, sx: FI ? 0 : 0.3, sz: 0.1, finitura: true, ff: r3(Math.max(0.05, (mt.lf || 0.2) * 0.3)), smusso: FI ? 0 : 0.5, vc: r3((mt.lvc || 100) * 0.7), f: r3(Math.max(0.05, (mt.lf || 0.2) * 0.6)) }) });
        if (FI) {
          const tF = O.trovaT(tab, ['bareno', 'inserto'], 0, 8, nt), pF = FI.p;
          const giri = Math.min(base.nmax, Math.max(100, Math.round(1000 * (mt.lvc || 100) * 0.4 / (Math.PI * di) / 10) * 10));
          const np = FI.hInt <= 0.65 ? 5 : FI.hInt <= 0.95 ? 6 : FI.hInt <= 1.25 ? 8 : FI.hInt <= 1.9 ? 10 : 12;
          filettoI.push({ op: 'filettoInt', titolo: 'Filetto interno ' + FI.nome + ' T' + tF, c: Object.assign({}, base, { t: tF, d: di, d2: FI.conico ? r3(di - li / 16) : di, d1: FI.d1, h: FI.hInt, ang: FI.ang, nomeFil: FI.nome, dg: di, p: pF, l: li, n: np, giri, vc: Math.round((mt.lvc || 100) * 0.4), f: pF, metodo: ctx.metodo || 'passate' }) });
          nt.testi.push('Filetto interno ' + FI.nome + ': la barenatura va al nocciolo Ø' + dBar + ', poi il filetto a ' + FI.ang + '°' + (FI.conico ? ' (conico 1:16)' : '') + '.');
        }
      }
      // centrino prima della punta; maschio o alesatore dopo
      const inAsse = [], dopoPunta = [];
      if (pos(dN)) {
        const dtC = O.datiTaglio(mt, { tipo: 'centrino', d: 10, nmax: base.nmax }) || {};
        inAsse.push({ op: 'centrino', titolo: 'Centrino in asse T' + O.trovaT(tab, ['centrino'], 0, 2, nt), c: Object.assign({}, base, { t: O.trovaT(tab, ['centrino'], 0, 2, nt), dg, prof: r3(Math.min(dPunta, 10) / 2), giri: dtC.n || 1000, f: r3(dtC.fn || 0.08), vc: dtC.vc }) });
        if (tipoF === 'maschio') {
          const dtM = O.datiTaglio(mt, { tipo: 'maschio', d: dN, passo: pM, nmax: base.nmax }) || {};
          const tM = O.trovaT(tab, ['maschio'], dN, 5, nt);
          dopoPunta.push({ op: 'maschiatura', titolo: 'Maschio in asse M' + dN + 'x' + pM + ' T' + tM, c: Object.assign({}, base, { t: tM, dg, p: pM, prof: profF, giri: dtM.n || 200, f: pM, vc: dtM.vc }) });
        } else if (tipoF === 'alesato') {
          const dtA = O.datiTaglio(mt, { tipo: 'alesatore', d: dN, nmax: base.nmax }) || {};
          const tA = O.trovaT(tab, ['alesatore'], dN, 6, nt), toll = L.foroToll || 'H7';
          dopoPunta.push({ op: 'alesaturaAsse', titolo: 'Alesatore in asse Ø' + dN + ' ' + toll + ' T' + tA, c: Object.assign({}, base, { t: tA, dg, prof: profF, giri: dtA.n || 300, f: r3(dtA.fn || 0.15), vc: dtA.vc }) });
          (p.misure = p.misure || []).push({ nome: 'Foro in asse Ø' + dN + ' ' + toll, nominale: String(dN), toll });
        }
      }
      // gola interna (a una distanza dalla faccia) e gola di scarico in fondo al filetto interno
      const golaI = [];
      if (internaF.length) {
        const dBar = internaF[0].c.di || internaF[0].c.punti[0].x, tGI = O.trovaT(tab, ['bareno', 'inserto'], 0, 9, nt);
        const golaInt = (zDist, b, dF, titolo) => golaI.push({ op: 'golaInterna', titolo: titolo + ' T' + tGI, c: Object.assign({}, base, { t: tGI, dg, dp: dBar, dfondo: r3(dF), zg: r3(-zDist), b, w: Math.min(3, b), vc: r3((mt.lvc || 100) * 0.5), f: r3(Math.max(0.03, (mt.lf || 0.2) * 0.25)) }) });
        const G = I.gola || {};
        if (I.golaOn && pos(num(G.z)) && pos(num(G.b)) && pos(num(G.d))) {
          if (num(G.z) + num(G.b) > li + 1e-9) return { errore: 'La gola interna esce dal fondo della barenatura (profonda ' + li + ').' };
          if (num(G.d) <= dBar) return { errore: 'Il fondo della gola interna (Ø' + num(G.d) + ') deve essere piu grande del foro (Ø' + dBar + ').' };
          if (num(G.d) >= dg - 2) return { errore: 'La gola interna (Ø' + num(G.d) + ') lascia troppo poca parete.' };
          golaInt(num(G.z), num(G.b), num(G.d), 'Gola interna Ø' + num(G.d) + ' larga ' + num(G.b));
        }
        if (filettoI.length && I.scarico !== false) {
          const fi = filettoI[0].c, b = Math.max(3, Math.round(2 * fi.p * 2) / 2);
          golaInt(li - b, b, fi.d + 0.4, 'Gola di scarico del filetto interno larga ' + b);
          fi.l = r3(li - b / 2);
        }
      }
      // gola frontale sulla faccia
      const golaF = [];
      const GF = L.golaFront || {};
      if (L.golaFrontOn && pos(num(GF.dInt)) && pos(num(GF.dEst)) && pos(num(GF.prof))) {
        const dFaccia = pr.punti[1] ? pr.punti[1].x : dg;
        if (num(GF.dEst) > dFaccia - 1) return { errore: 'La gola frontale (Ø' + num(GF.dEst) + ') esce dalla faccia (Ø' + dFaccia + ').' };
        if (pos(dN) && num(GF.dInt) < (internaF.length ? (internaF[0].c.di || internaF[0].c.punti[0].x) : dPunta) + 1) return { errore: 'La gola frontale tocca il foro in asse: allarga il diametro interno della gola.' };
        const tGF = O.trovaT(tab, ['inserto'], 0, 10, nt);
        golaF.push({ op: 'golaFrontale', titolo: 'Gola frontale Ø' + num(GF.dInt) + '-' + num(GF.dEst) + ' T' + tGF, c: Object.assign({}, base, { t: tGF, dg, dInt: num(GF.dInt), dEst: num(GF.dEst), prof: num(GF.prof), w: Math.min(3, (num(GF.dEst) - num(GF.dInt)) / 2), q: 2, vc: r3((mt.lvc || 100) * 0.5), f: r3(Math.max(0.03, (mt.lf || 0.2) * 0.25)) }) });
      }
      p.note = (p.note || []).concat(nt.testi);
      const iForo = prima.findIndex(f => f.op === 'foratura');
      const dopoForo = iForo >= 0 ? prima.slice(0, iForo).concat(inAsse, prima[iForo], dopoPunta, internaF, golaI, prima.slice(iForo + 1)) : prima.concat(internaF, golaI);
      // il filetto interno va dopo i filetti e le gole esterne, prima della troncatura
      const fasi = dopoForo.concat(p.fasi.slice(0, 1), golaF, p.fasi.slice(1), filettoI, dopo);
      const note = (p.note || []).concat(a.errore ? [] : (a.note || []).filter(t => !/^Utensili non trovati/.test(t)));
      const ft = fasi.find(f => f.op === 'troncatura');
      if (ft && pos(num(L.troncaSmusso))) { ft.c.smusso = num(L.troncaSmusso); const ul = (L.tratti || []).filter(t => t && pos(num(t.d))).pop(); ft.c.dSmusso = ul ? num(ul.d) : dg; ft.titolo = ft.titolo.replace(/^Troncatura/, 'Smusso C' + num(L.troncaSmusso) + ' e troncatura'); }
      // seconda fase: il pezzo tagliato si gira; origine Z0 sulla faccia nuova, sfacciatura a lunghezza e profilo del lato B
      let fase2 = null;
      const F2 = L.fase2 || {};
      if (F2.on) {
        const L1 = ft ? r3(-ft.c.zt) : num(g.lg), lTot = num(F2.lTot);
        const lenB = (F2.tratti || []).filter(t => t && pos(num(t.d)) && pos(num(t.l))).reduce((q, t) => q + num(t.l), 0);
        if (!pos(lTot)) fase2 = { errore: 'Lato B: scrivi la lunghezza finita del pezzo.' };
        else if (!pos(L1)) fase2 = { errore: 'Lato B: serve la troncatura o la lunghezza del grezzo.' };
        else if (lTot >= L1) fase2 = { errore: 'Lato B: il pezzo tagliato e lungo ' + L1 + ' mm, la lunghezza finita (' + lTot + ') deve essere piu corta.' };
        else if (pr.lunghezza + lenB > lTot + 1e-6) fase2 = { errore: 'Lato B: i tratti del lato A (' + r3(pr.lunghezza) + ' mm) e del lato B (' + r3(lenB) + ' mm) sono piu lunghi del pezzo finito (' + lTot + ' mm).' };
        else if (!lenB) fase2 = { errore: 'Lato B: aggiungi almeno un tratto (diametro e lunghezza).' };
        else {
          const p2 = proponiLavoro({ modo: 'tornio', grezzo: { dg, lg: L1 }, tratti: F2.tratti, smussoTesta: F2.smussoTesta }, ctx);
          if (p2.errore) fase2 = { errore: 'Lato B: ' + p2.errore };
          else {
            const sv = r3(L1 - lTot);
            p2.fasi.forEach(f => { f.chiave = 'B:' + f.chiave; if (f.op === 'sfacciatura') { f.c.s = sv; f.titolo = f.titolo.replace(/^Sfacciatura/, 'Sfacciatura a lunghezza ' + lTot + ' (' + sv + ' mm)'); } });
            fase2 = { fasi: p2.fasi, note: ['Lato B: gira il pezzo, serralo sul lato A gia finito (griffe morbide), Z0 sulla faccia grezza meno ' + sv + ' mm.'].concat(p2.note || []), misure: p2.misure || [], punti: p2.punti, modo: 'tornio', L1, lTot, lenB };
          }
        }
      }
      if (ctx.metodo) fasi.forEach(f => { if (f.c) f.c.metodo = ctx.metodo; });
      return { fasi: fasi.map((f, i) => Object.assign(f, { chiave: chiaveFase(f, i) })), note, misure: p.misure || [], punti: pr.punti, modo: 'tornio', fase2 };
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
  /** Le passate che si possono scegliere in una fase: [{id, et, u, v (valore proposto)}]. */
  function passateDi(f) {
    const c = f.c || {}, out = [];
    if (f.op === 'filetto' || f.op === 'filettoInt') out.push({ id: 'np', et: 'Passate del filetto', u: 'n.', v: Math.max(1, Math.round(Number(c.n) || 6)) });
    else if (pos(num(c.ap))) out.push({ id: 'ap', et: f.op === 'sfacciatura' ? 'Passata in Z' : /profilo|interna|cilindr/i.test(f.op) && !c.d ? 'Passata radiale' : 'Passata in Z', u: 'mm', v: num(c.ap) });
    if (pos(num(c.q)) && /G83|G73/.test(String(c.ciclo || ''))) out.push({ id: 'q', et: 'Beccata (Q)', u: 'mm', v: num(c.q) });
    return out;
  }
  /** Profondita di ogni passata di un filetto (mm sul raggio, una per passata): per mostrarla all'operatore. */
  function passateFilettoLavoro(f, n) {
    const c = f.c || {}, h = pos(num(c.h)) ? num(c.h) : 0.613343 * (num(c.p) || 1), np = Math.max(1, Math.round(n || c.n || 6));
    const out = []; let prima = 0;
    for (let i = 1; i <= np; i++) { const pr = h * Math.sqrt(i / np); out.push(Math.round((pr - prima) * 1000) / 1000); prima = pr; }
    return out;
  }
  function programmaLavoro(prop, scelte, comuni) {
    scelte = scelte || {};
    const sp = scelte.spente || {}, cor = scelte.correzioni || {};
    const fasi = prop.fasi.filter(f => !sp[f.chiave]).map(f => {
      const c = Object.assign({}, f.c), k = cor[f.chiave] || {};
      if (pos(num(k.n))) { c.n = num(k.n); if (c.giri) c.giri = num(k.n); }
      if (pos(num(k.f))) c.f = num(k.f);
      if (pos(num(k.vc))) c.vc = num(k.vc);
      // spessore delle passate scelto dall'operatore: profondita di passata, passate del filetto, beccata della foratura
      if (pos(num(k.ap)) && pos(num(c.ap))) c.ap = num(k.ap);
      if (pos(num(k.np)) && (f.op === 'filetto' || f.op === 'filettoInt')) c.n = Math.max(1, Math.min(60, Math.round(num(k.np))));
      if (pos(num(k.q)) && pos(num(c.q))) c.q = num(k.q);
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

  const Lavoro = { puntiTornio, entitaFresa, proponiLavoro, programmaLavoro, passateDi, passateFilettoLavoro, MODELLI_LAVORO: MODELLI, costoPezzo };
  Object.assign(O, Lavoro);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
