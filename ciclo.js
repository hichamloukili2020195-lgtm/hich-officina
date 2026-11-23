// ===== Hich-Officina: ciclo di lavoro proposto e quote lette da un disegno (senza interfaccia) =====
// Dal pezzo descritto a misure (albero da tornio o piastra da fresa) si propone la sequenza completa delle lavorazioni,
// con i dati di taglio del materiale, gli utensili della tabella e l'ordine di officina. Tutto da controllare.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  const r3 = x => Math.round(x * 1000) / 1000;
  const giriDa = (vc, d, nmax) => Math.min(nmax, Math.max(100, Math.round(1000 * vc / (Math.PI * d) / 10) * 10));

  /** Numero T dalla tabella utensili (stesso tipo e diametro), altrimenti quello proposto. */
  function trovaT(tab, tipi, d, proposto, note) {
    const u = (tab || []).find(x => tipi.includes(x.tipo) && (!(d > 0) || Math.abs(Number(x.d) - d) < 0.05));
    if (u) return Number(u.t);
    note.daControllare.add(proposto);
    return proposto;
  }

  // ----- quote lette da un disegno -----
  /**
   * Cerca le quote nel testo letto da una foto di disegno.
   * Ritorna [{tipo:'diametro'|'filetto'|'lunghezza'|'smusso'|'raggio'|'fori'|'tolleranza', testo, valore, ...}]
   */
  function estraiQuote(testo) {
    const out = [], visti = new Set();
    const metti = q => { const k = q.tipo + '|' + q.testo; if (!visti.has(k)) { visti.add(k); out.push(q); } };
    let t = String(testo || '').replace(/\r/g, '').replace(/[⌀Ø∅ø]/g, 'Ø').replace(/(\d),(\d)/g, '$1.$2');
    // tolleranze geometriche (riquadri con il simbolo e i riferimenti): non sono quote del pezzo
    if (/[⌖⊕◎⌯⏥⌭]/.test(t) || (/Ø\s*0\.\d+/.test(t) && /(?:^|\s)[A-F](?:\s+[A-F])*\s*$/.test(t.trim()))) return out;
    // quote di riferimento tra parentesi e scostamenti tra parentesi: si tolgono
    t = t.replace(/\(\s*\d+(?:\.\d+)?\s*\)/g, ' ').replace(/\(\s*[+\-±][^)]*\)?/g, ' ');
    let m;
    // fori ripetuti: 4xØ8.5, 6 x M8, 4 fori Ø9, N°4 Fori Ø13, N°2 Fori spina Ø 10 H7, n.4 fori M10
    const reFori = /(?:[Nn]\s*°\s*|[Nn]\.\s*|[Nn]r\.?\s*)?(\d{1,3})\s*(?:x|X|×|[Ff]ori|FORI|pz)[^Ø\d\n]{0,30}?(Ø\s*\d+(?:\.\d+)?|M\s*\d+(?:\.\d+)?(?:\s*[xX×]\s*\d+(?:\.\d+)?)?)(?:\s*((?:js|JS|[A-Za-z])\d{1,2})(?![\d.]))?/g;
    while ((m = reFori.exec(t))) {
      const n = Number(m[1]), q = m[2].replace(/\s+/g, '');
      if (n < 1 || n > 999) continue;
      if (q[0] === 'M') { const [d, p] = q.slice(1).split(/[xX×]/).map(Number); metti({ tipo: 'fori', testo: n + ' x ' + q, n, filetto: { d, p: p || passoGrosso(d) } }); }
      else metti({ tipo: 'fori', testo: n + ' x ' + q + (m[3] ? ' ' + m[3] : ''), n, d: Number(q.slice(1)), toll: m[3] || '' });
    }
    const t2 = t.replace(reFori, ' ');
    // fresature (cave): Fresatura 3 Profondita 2
    const reCava = /fresatura\s*(\d+(?:\.\d+)?)\s*(?:mm\s*)?profondit[aà]\s*(\d+(?:\.\d+)?)/gi;
    while ((m = reCava.exec(t2))) metti({ tipo: 'cava', testo: m[1] + 'x' + m[2], larghezza: Number(m[1]), prof: Number(m[2]) });
    // lamatura e profondita (nei richiami dei fori)
    const reLam = /lamatur[ae]\s*Ø\s*(\d+(?:\.\d+)?)/gi;
    while ((m = reLam.exec(t2))) metti({ tipo: 'lamatura', testo: 'lamatura Ø' + m[1], d: Number(m[1]) });
    const reProf = /(?:prof\.?\s*(lamatura|foro)?\s*|profondit[aà]\s*)(\d+(?:\.\d+)?)/gi;
    while ((m = reProf.exec(t2.replace(reCava, ' ')))) metti({ tipo: 'profondita', testo: 'prof. ' + (m[1] ? m[1].toLowerCase() + ' ' : '') + m[2], valore: Number(m[2]), di: m[1] ? m[1].toLowerCase() : '' });
    const t3 = t2.replace(reCava, ' ').replace(reLam, ' ').replace(reProf, ' ');
    // filetti: M20x1.5, M8
    const reM = /(?:^|[^A-Z\d])M\s*(\d+(?:\.\d+)?)(?:\s*[xX×]\s*(\d+(?:\.\d+)?))?/g;
    while ((m = reM.exec(t3))) { const d = Number(m[1]); if (d >= 1 && d <= 200) metti({ tipo: 'filetto', testo: 'M' + m[1] + (m[2] ? 'x' + m[2] : ''), d, p: m[2] ? Number(m[2]) : passoGrosso(d) }); }
    // diametri: Ø20, Ø20h6, Ø20 H7, Ø 20 ±0.02
    const reD = /Ø\s*(\d+(?:\.\d+)?)\s*((?:js|JS|[a-zA-Z])\d{1,2}(?![\d.]))?(?:\s*(±\s*\d*\.?\d+|[+-]\s*\d*\.?\d+\s*\/?\s*[+-]?\s*\d*\.?\d+))?/g;
    while ((m = reD.exec(t3))) { if (Number(m[1]) <= 0) continue; metti({ tipo: 'diametro', testo: 'Ø' + m[1] + (m[2] ? ' ' + m[2] : '') + (m[3] ? ' ' + m[3].replace(/\s+/g, '') : ''), valore: Number(m[1]), toll: m[2] || (m[3] ? m[3].replace(/\s+/g, '') : '') }); }
    // smussi: 1x45°, 0.5 x 45
    const reC = /(\d+(?:\.\d+)?)\s*[xX×]\s*45\s*°?/g;
    while ((m = reC.exec(t3))) metti({ tipo: 'smusso', testo: m[1] + 'x45°', valore: Number(m[1]) });
    // raggi: R2, R0.5
    const reR = /(?:^|[^A-Z])R\s*(\d+(?:\.\d+)?)/g;
    while ((m = reR.exec(t3))) metti({ tipo: 'raggio', testo: 'R' + m[1], valore: Number(m[1]) });
    // angoli: 30°, 22.5°, A 180° (non gli smussi a 45 gradi)
    const t4 = t3.replace(reC, ' ');
    const reA = /(?:^|[^\d.])(\d{1,3}(?:\.\d+)?)\s*°/g;
    while ((m = reA.exec(t4))) { const v = Number(m[1]); if (v > 0 && v <= 360) metti({ tipo: 'angolo', testo: m[1] + '°', valore: v }); }
    // tolleranze isolate: H7, g6 (senza diametro davanti; non le sigle delle flange come ISO F12)
    const reT = /(?:^|\s)((?:JS|js|[A-HJ-NP-Za-hj-np-z])\d{1,2})(?=\s|$)/g;
    while ((m = reT.exec(t3))) {
      if (/ISO\s*$/i.test(t3.slice(0, m.index + m[0].indexOf(m[1])).replace(/[\s-]+$/, ' ').trimEnd() + ' ')) continue;
      if (/ISO\s*-?\s*$/i.test(t3.slice(0, m.index + m[0].indexOf(m[1])))) continue;
      if (!O.tolleranza(10, m[1]).errore) metti({ tipo: 'tolleranza', testo: m[1], valore: m[1] });
    }
    // lunghezze: numeri rimasti (quote lineari), non gli scostamenti (+0.2, -0.1) ne gli angoli
    const resto = t4.replace(reM, ' ').replace(reD, ' ').replace(reR, ' ').replace(reA, ' ').replace(/ISO\s*[A-Z]\d+/gi, ' ');
    const reL = /(?:^|[^\w.+\-±])(\d{1,4}(?:\.\d+)?)(?![\w.°])/g;
    while ((m = reL.exec(resto))) { const v = Number(m[1]); if (v > 0 && v < 5000) metti({ tipo: 'lunghezza', testo: m[1], valore: v }); }
    return out;
  }
  function passoGrosso(d) { const f = O.FILETTI_GROSSI.find(x => x[0] === d); return f ? f[1] : 1; }

  // ----- albero da tornio -----
  /**
   * pezzo = {dg, lg, smusso (sugli spigoli), tratti:[{d, l, toll, passo (filetto)}], foro:{d, prof}, troncatura}
   * ctx = {mat, tab (tabella utensili), nmax, metodo}
   * Ritorna {fasi:[{op, c, titolo}], note:[], misure:[{nome, nominale, toll}], errore}
   */
  function pianificaAlbero(pezzo, ctx) {
    const note = { testi: [], daControllare: new Set() };
    const mt = ctx.mat, tab = ctx.tab || [], nmax = ctx.nmax || 3000;
    const dg = Number(pezzo.dg), lg = Number(pezzo.lg) || 0, c = Number(pezzo.smusso) || 0;
    const tratti = (pezzo.tratti || []).map(t => ({ d: Number(t.d), l: Number(t.l), toll: String(t.toll || '').trim(), passo: Number(t.passo) || 0 })).filter(t => t.d > 0 && t.l > 0);
    if (!(dg > 0)) return { errore: 'Scrivi il diametro del grezzo.' };
    if (!tratti.length) return { errore: 'Scrivi almeno un diametro con la sua lunghezza.' };
    if (!mt || !(mt.lvc > 0)) return { errore: 'Il materiale non ha i dati di tornitura.' };
    for (let i = 1; i < tratti.length; i++) if (tratti[i].d < tratti[i - 1].d - 1e-9) return { errore: 'I diametri calano verso il mandrino (Ø' + tratti[i].d + ' dopo Ø' + tratti[i - 1].d + '): il pezzo si fa in due prese. Scrivi qui solo il lato da lavorare per primo, dalla testa.' };
    if (tratti.some(t => t.d > dg + 1e-9)) return { errore: 'Un diametro e piu grosso del grezzo.' };
    const lFin = tratti.reduce((s, t) => s + t.l, 0);
    const misure = [];
    // diametri di finitura: al centro della tolleranza
    const dFin = tratti.map((t, i) => {
      if (t.passo > 0) return t.d - 0.1;   // filetto: un decimo sotto il nominale
      if (!t.toll) return t.d;
      const tol = leggiTol(t.d, t.toll);
      if (tol.errore) { note.testi.push('Tolleranza "' + t.toll + '" su Ø' + t.d + ' non capita: si fa al nominale.'); return t.d; }
      misure.push({ nome: 'Ø' + t.d + ' ' + t.toll, nominale: String(t.d), toll: t.toll });
      return r3(t.d + (tol.sup + tol.inf) / 2);
    });
    if (dFin.some((d, i) => d !== tratti[i].d && !tratti[i].passo)) note.testi.push('I diametri con tolleranza si finiscono al centro della tolleranza.');
    const mezzo = mt.lvc >= 300 ? 3 : mt.lvc <= 100 ? 1 : 2;
    const base = { nmax, codLimite: ctx.codLimite, codFiletto: ctx.codFiletto, refrig: ctx.refrig };
    const fasi = [];
    const tSgr = trovaT(tab, ['inserto'], 0, 1, note);
    // 1. sfacciatura
    fasi.push({ op: 'sfacciatura', titolo: 'Sfacciatura T' + tSgr, c: Object.assign({}, base, { t: tSgr, dg, s: 1, ap: 1, vc: mt.lvc, f: r3(mt.lf * 0.8) }) });
    // 2. foro in asse
    const foro = pezzo.foro || {};
    if (Number(foro.d) > 0 && Number(foro.prof) > 0) {
      const dp = Number(foro.d);
      const dt = O.datiTaglio(mt, { tipo: dp > 20 ? 'puntaIns' : 'puntaMD', d: dp, nmax }) || {};
      const tP = trovaT(tab, ['puntaMD', 'puntaIns'], dp, 5, note);
      fasi.push({ op: 'foratura', titolo: 'Foro in asse Ø' + dp + ' T' + tP, c: Object.assign({}, base, { t: tP, dg, dpunta: dp, prof: r3(Number(foro.prof) + dp * 0.3), q: dp > 20 ? 0 : dp, giri: dt.n, f: r3(dt.fn || 0.1), vc: dt.vc }) });
    }
    // 3. profilo: sgrossatura e finitura
    const punti = [{ x: 0, z: 0 }];
    let z = 0;
    tratti.forEach((t, i) => {
      const d = dFin[i];
      const cc = Math.min(t.passo > 0 ? Math.max(c, t.passo * 0.6) : c, t.l / 2, d / 4);
      if (cc > 0) { punti.push({ x: r3(d - 2 * cc), z: r3(z) }, { x: d, z: r3(z - cc) }); }
      else punti.push({ x: d, z: r3(z) });
      z -= t.l;
      punti.push({ x: d, z: r3(z) });
    });
    if (dFin[dFin.length - 1] < dg - 1e-9) punti.push({ x: dg, z: r3(z) });
    const ff = r3(Math.max(0.05, mt.lf * 0.4));
    fasi.push({ op: 'profilo', titolo: 'Sgrossatura e finitura del profilo T' + tSgr, c: Object.assign({}, base, { t: tSgr, dg, punti, ap: mezzo, sx: 0.4, sz: 0.1, ff, finitura: true, metodo: ctx.metodo || 'passate', vc: mt.lvc, f: mt.lf }) });
    // 4. gole di scarico e filetti
    let zz = 0;
    tratti.forEach((t, i) => {
      const zIn = zz; zz -= t.l;
      if (!(t.passo > 0)) return;
      const h = 0.613343 * t.passo, b = Math.max(3, r3(2 * t.passo));
      const spalla = i < tratti.length - 1 || dFin[i] < dg - 1e-9;
      let lFil = t.l;
      if (spalla && t.l > b + 2) {
        const tG = trovaT(tab, ['inserto'], 0, 4, note);
        fasi.push({ op: 'gola', titolo: 'Gola di scarico del M' + t.d + ' T' + tG, c: Object.assign({}, base, { t: tG, dg: t.d, dfondo: r3(t.d - 2 * h - 0.2), zg: r3(zz + b), b, w: Math.min(3, b), vc: r3(mt.lvc * 0.6), f: r3(Math.max(0.03, mt.lf * 0.3)) }) });
        lFil = t.l - b / 2;
        note.testi.push('Gola di scarico larga ' + b + ' alla fine del filetto M' + t.d + '.');
      }
      const tF = trovaT(tab, ['inserto'], 0, 3, note);
      const np = t.passo <= 1 ? 5 : t.passo <= 1.5 ? 6 : t.passo <= 2 ? 8 : t.passo <= 3 ? 10 : 12;
      fasi.push({ op: 'filetto', titolo: 'Filetto M' + t.d + 'x' + t.passo + ' T' + tF, c: Object.assign({}, base, { t: tF, dg: t.d, d: t.d, p: t.passo, l: r3(-zIn + lFil), n: np, giri: giriDa(mt.lvc * 0.5, t.d, nmax), metodo: ctx.metodo || 'passate', vc: Math.round(mt.lvc * 0.5) }) });
      if (zIn < 0) note.testi.push('Il filetto M' + t.d + ' non parte dalla testa: le passate partono da Z0 e vanno in aria fino al filetto.');
    });
    // 5. troncatura
    if (pezzo.troncatura && lg > lFin + 8) {
      const tT = trovaT(tab, ['inserto'], 0, 6, note);
      fasi.push({ op: 'troncatura', titolo: 'Troncatura a ' + lFin + ' T' + tT, c: Object.assign({}, base, { t: tT, dg, zt: r3(-lFin), w: 3, q: 3, vc: r3(mt.lvc * 0.6), f: r3(Math.max(0.03, mt.lf * 0.3)) }) });
      note.testi.push('Troncatura con la lama larga 3 (fianco destro a Z-' + lFin + ').');
    } else if (pezzo.troncatura) note.testi.push('Grezzo troppo corto per troncare (servono ' + (lFin + 8) + ' mm): niente troncatura.');
    misure.push({ nome: 'Lunghezza totale', nominale: String(lFin), toll: '±0.1' });
    return { fasi, misure, note: finisci(note), modo: 'tornio' };
  }

  // ----- piastra o flangia da fresa -----
  /**
   * pezzo = {gx, gy, gz (grezzo), fx, fy, fz (finito, origine nello spigolo in basso a sinistra, Z0 sopra il finito),
   *          tasche:[{tipo:'rett'|'circ', cx, cy, lx, ly, dt, prof}], fori:[{tipo:'foro'|'maschio'|'alesato', d, passo, prof, passante,
   *          schema:'cerchio'|'griglia'|'elenco', ...}]}
   */
  function pianificaPiastra(pezzo, ctx) {
    const note = { testi: [], daControllare: new Set() };
    const mt = ctx.mat, tab = ctx.tab || [], nmax = ctx.nmax || 12000, Pg = O.schemaFori ? O : null;
    if (!mt) return { errore: 'Scegli il materiale.' };
    const fx = Number(pezzo.fx), fy = Number(pezzo.fy), fz = Number(pezzo.fz);
    const gx = Number(pezzo.gx) || fx, gy = Number(pezzo.gy) || fy, gz = Number(pezzo.gz) || fz;
    if (!(fx > 0 && fy > 0 && fz > 0)) return { errore: 'Scrivi le misure del pezzo finito.' };
    const base = { zSic: ctx.zSic || 50, zR: ctx.zR || 2, refrig: ctx.refrig, g43: ctx.g43 };
    const fasi = [], misure = [];
    const fresa = (tipo, d, z) => { const dt = O.datiTaglio(mt, { tipo, d, z, nmax }) || {}; return { n: dt.n, f: dt.f, ap: dt.ap, ae: dt.ae && d ? Math.round(dt.ae / d * 100) : 50 }; };
    const frese = tab.filter(u => u.tipo === 'fresa' && Number(u.d) > 0).sort((a, b) => Number(b.d) - Number(a.d));
    const sceltaFresa = (max, prop) => { const u = frese.find(x => Number(x.d) <= max + 1e-9); if (u) return { d: Number(u.d), z: Number(u.z) || 3, t: Number(u.t) }; note.daControllare.add(prop.t); return prop; };
    // 1. spianatura
    const sov = gz - fz;
    if (sov > 0.05) {
      const u = sceltaFresa(80, { d: 50, z: 5, t: 1 });
      const dt = fresa('fresa', u.d, u.z);
      fasi.push({ op: 'spianatura', titolo: 'Spianatura (' + r3(sov) + ' mm) D' + u.d + ' T' + u.t, c: Object.assign({}, base, { t: u.t, d: u.d, n: dt.n, f: dt.f, lx: Math.max(gx, fx), ly: Math.max(gy, fy), prof: r3(sov), ap: Math.min(r3(sov), Math.max(0.5, Math.min(2, dt.ap || 1))), ae: 70, zTop: r3(sov) }) });
      note.testi.push('Spianatura dal grezzo (' + gz + ') al finito (' + fz + '): Z0 sulla faccia finita.');
    }
    // 2. fori
    (pezzo.fori || []).forEach((g, k) => {
      const punti = O.schemaFori(Object.assign({}, g, { tipo: g.schema || 'elenco', testo: g.testo, n: Number(g.nf), dc: Number(g.dc), cx: Number(g.cx) || 0, cy: Number(g.cy) || 0, a: Number(g.a) || 0, x0: Number(g.x0) || 0, y0: Number(g.y0) || 0, nx: Number(g.nx), ny: Number(g.ny), px: Number(g.px), py: Number(g.py) }));
      if (!punti.length) { note.testi.push('Gruppo di fori ' + (k + 1) + ' senza posizioni: saltato.'); return; }
      const tipo = g.tipo || 'foro', d = Number(g.d), passo = Number(g.passo) || passoGrosso(d);
      if (!(d > 0)) return;
      const passante = !!g.passante;
      const prof = passante ? fz + 1 : Number(g.prof) || d * 2;
      const fil = tipo === 'maschio' ? O.filetto(d, passo) : null;
      const dPre = tipo === 'maschio' ? fil.preforo : tipo === 'alesato' ? r3(d - (d <= 10 ? 0.2 : 0.3)) : d;
      const fase = (tipoUt, dd, pr, t, extra, titolo) => {
        const dt = O.datiTaglio(mt, { tipo: tipoUt, d: dd, passo, nmax }) || {};
        const giri = dt.n || 500, f = tipoUt === 'maschio' ? Math.round(passo * giri) : dt.f || 100;
        const ciclo = tipoUt === 'maschio' ? 'G84' : tipoUt === 'alesatore' ? 'G85' : tipoUt === 'smussatore' ? 'G82' : (tipoUt === 'puntaMD' && pr > 3 * dd ? 'G83' : 'G81');
        return { op: 'fori', tipoUt, titolo: titolo + ' T' + t, c: Object.assign({}, base, { t, n: giri, f, punti, prof: r3(pr), d: dd, ciclo, q: dd }, extra || {}) };
      };
      const nome = (tipo === 'maschio' ? 'M' + d + 'x' + passo : 'Ø' + d + (tipo === 'alesato' ? ' ' + (g.toll || 'H7') : '')) + ' (' + punti.length + ' fori)';
      if (dPre > 40) {
        // foro grande: tasca circolare
        const u = sceltaFresa(dPre * 0.6, { d: 16, z: 4, t: 7 });
        const dt = fresa('fresa', u.d, u.z);
        punti.forEach((p, i) => fasi.push({ op: 'tascaCircolare', titolo: 'Foro Ø' + d + ' a fresa ' + (i + 1) + ' D' + u.d + ' T' + u.t, c: Object.assign({}, base, { t: u.t, d: u.d, n: dt.n, f: dt.f, cx: p[0], cy: p[1], dt: dPre, prof: r3(prof), ap: Math.max(0.5, Math.min(dt.ap || 2, 5)), ae: 40, sovra: 0.2, finitura: true }) }));
      } else {
        fasi.push(fase('centrino', 10, Math.min(dPre, 10) / 2, trovaT(tab, ['centrino'], 0, 2, note), null, 'Centrino ' + nome));
        const ins = dPre > 20;
        const tipoP = ins ? 'puntaIns' : 'puntaMD';
        fasi.push(fase(tipoP, dPre, prof + (tipo === 'maschio' && !passante ? 2 * passo : 0) + (ins ? 0 : dPre * 0.182), trovaT(tab, [tipoP], dPre, ins ? 8 : 3, note), null, (ins ? 'Punta a inserti Ø' : 'Punta Ø') + dPre + ' per ' + nome));
        if (tipo !== 'foro' || Number(g.smusso) > 0) {
          const cc = Number(g.smusso) > 0 ? Number(g.smusso) : d < 10 ? 0.5 : 1;
          fasi.push(fase('smussatore', 16, (d + 2 * cc) / 2, trovaT(tab, ['smussatore'], 0, 4, note), null, 'Smusso ' + cc + 'x45° ' + nome));
        }
        if (tipo === 'maschio') fasi.push(fase('maschio', d, prof, trovaT(tab, ['maschio'], d, 5, note), { passo }, 'Maschio ' + nome));
        if (tipo === 'alesato') { fasi.push(fase('alesatore', d, prof, trovaT(tab, ['alesatore'], d, 6, note), null, 'Alesatore ' + nome)); misure.push({ nome: 'Fori ' + nome, nominale: String(d), toll: g.toll || 'H7' }); }
      }
    });
    // 3. tasche
    (pezzo.tasche || []).forEach((q, k) => {
      const prof = Number(q.prof);
      if (!(prof > 0)) return;
      if (q.tipo === 'circ') {
        const dt0 = Number(q.dt); if (!(dt0 > 0)) return;
        const u = sceltaFresa(dt0 * 0.6, { d: 10, z: 3, t: 7 });
        const dt = fresa('fresa', u.d, u.z);
        fasi.push({ op: 'tascaCircolare', titolo: 'Tasca Ø' + dt0 + ' D' + u.d + ' T' + u.t, c: Object.assign({}, base, { t: u.t, d: u.d, n: dt.n, f: dt.f, cx: Number(q.cx) || 0, cy: Number(q.cy) || 0, dt: dt0, prof, ap: Math.max(0.5, Math.min(dt.ap || 2, prof)), ae: 40, sovra: 0.2, finitura: true }) });
      } else {
        const lx = Number(q.lx), ly = Number(q.ly); if (!(lx > 0 && ly > 0)) return;
        const rAng = Number(q.r) || 0;
        const max = Math.min(lx, ly) / 2, u = sceltaFresa(rAng > 0 ? Math.min(max, 2 * rAng) : max, { d: Math.min(10, Math.floor(max)), z: 3, t: 7 });
        const dt = fresa('fresa', u.d, u.z);
        fasi.push({ op: 'tasca', titolo: 'Tasca ' + lx + 'x' + ly + ' D' + u.d + ' T' + u.t, c: Object.assign({}, base, { t: u.t, d: u.d, n: dt.n, f: dt.f, cx: Number(q.cx) || 0, cy: Number(q.cy) || 0, lx, ly, prof, ap: Math.max(0.5, Math.min(dt.ap || 2, prof)), ae: 50, sovra: 0.2, finitura: true }) });
        if (rAng > 0 && u.d / 2 > rAng + 1e-9) note.testi.push('Tasca ' + (k + 1) + ': raggio negli angoli ' + rAng + ' piu piccolo di quello della fresa (' + u.d / 2 + '): serve la ripresa degli angoli.');
      }
    });
    // 4. contorno (se il grezzo e piu grande del finito)
    if (gx > fx + 0.05 || gy > fy + 0.05) {
      const u = sceltaFresa(20, { d: 12, z: 4, t: 9 });
      const dt = fresa('fresa', u.d, u.z);
      const pr = Math.max(1, r3(fz - 3));
      fasi.push({ op: 'contorno', titolo: 'Contornatura ' + fx + 'x' + fy + ' D' + u.d + ' T' + u.t, c: Object.assign({}, base, { t: u.t, d: u.d, n: dt.n, f: dt.f, lx: fx, ly: fy, prof: pr, ap: Math.max(0.5, Math.min(dt.ap || 2, pr)), sovra: 0.2, finitura: true }) });
      note.testi.push('Contornatura fino a 3 mm dal fondo (' + pr + ' mm): il resto resta nella morsa.');
    }
    misure.push({ nome: 'Spessore', nominale: String(fz), toll: '±0.05' });
    if (gx > fx + 0.05) misure.push({ nome: 'Lunghezza X', nominale: String(fx), toll: '±0.05' });
    if (gy > fy + 0.05) misure.push({ nome: 'Larghezza Y', nominale: String(fy), toll: '±0.05' });
    const ordinate = O.ordinaFasi ? O.ordinaFasi(fasi) : fasi;
    return { fasi: ordinate, misure, note: finisci(note), modo: 'fresa' };
  }
  function finisci(note) {
    const t = note.testi.slice();
    if (note.daControllare.size) t.push('Utensili non trovati nella tabella: numeri proposti ' + Array.from(note.daControllare).sort((a, b) => a - b).map(x => 'T' + x).join(' ') + ', da controllare.');
    return t;
  }
  const leggiTol = (d, testo) => O.leggiTolleranza(d, testo);

  // ----- programma del tornio con piu lavorazioni -----
  function gcodeSequenzaTornio(fasi, comuni) {
    const err = e => ({ errore: e, righe: [], percorso: [], avvisi: [] });
    if (!fasi.length) return err('Nessuna lavorazione.');
    const R = [], P = [], avvisi = [];
    let tPrima = null;
    for (let i = 0; i < fasi.length; i++) {
      const f = fasi[i];
      const r = O.gcodeTornio(f.op, Object.assign({}, f.c, { num: comuni.num, nome: comuni.nome }));
      if (r.errore) return err('Fase ' + (i + 1) + ' (' + f.titolo + '): ' + r.errore);
      const iT = r.righe.findIndex(l => /^T\d{4}$/.test(l)), iFine = r.righe.lastIndexOf('M30');
      if (!R.length) R.push(...r.righe.slice(0, iT));
      R.push('(FASE ' + (i + 1) + ': ' + String(f.titolo || f.op).toUpperCase().replace(/[()']/g, ' ') + ')');
      r.righe.slice(iT, iFine).forEach(l => { if (/^T\d{4}$/.test(l) && Number(l.slice(1, 3)) === tPrima) return; R.push(l); });
      tPrima = Number(f.c.t);
      P.push(...r.percorso);
      r.avvisi.forEach(a => avvisi.push('Fase ' + (i + 1) + ': ' + a));
    }
    R.push('M30', '%');
    // i blocchi N100/N200 dei cicli G71/G70 non si devono ripetere: ogni fase ha i suoi (N1100, N2100...)
    const righe = R.slice();
    let fase = 0;
    for (let i = 0; i < righe.length; i++) {
      if (/^\(FASE /.test(R[i])) fase++;
      righe[i] = R[i].replace(/\b([PQ])(100|200)\b/g, (m0, a, n) => a + (Number(n) + fase * 1000)).replace(/^N(100|200)\b/, (m0, n) => 'N' + (Number(n) + fase * 1000));
    }
    return { righe, percorso: P, avvisi };
  }

  /**
   * Programma dal profilo disegnato: profilo (sgrossatura e finitura) piu le lavorazioni messe sulle linee
   * (gola di scarico alla fine, filetto, tolleranza). punti = [{x, z, tratto, r, raccordo, smusso, fil (passo), gola (larghezza), toll}]
   */
  function pianificaProfilo(punti, ctx) {
    const note = { testi: [], daControllare: new Set() };
    const mt = ctx.mat, tab = ctx.tab || [], nmax = ctx.nmax || 3000, dg = Number(ctx.dg);
    if (!mt || !(mt.lvc > 0)) return { errore: 'Il materiale non ha i dati di tornitura.' };
    if (!(dg > 0)) return { errore: 'Scrivi il diametro del grezzo.' };
    const P = punti.map(p => Object.assign({}, p, { x: Number(p.x), z: Number(p.z) }));
    const misure = [];
    // diametri dei cilindri con tolleranza o filetto: si spostano tutti e due i punti della linea
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      if (Math.abs(a.x - b.x) > 1e-9 || Math.abs(a.z - b.z) < 1e-9) continue;
      const d = Number(punti[i].x);
      let nuovo = d;
      if (Number(b.fil) > 0) nuovo = d - 0.1;
      else if (b.toll) {
        const t = leggiTol(d, b.toll);
        if (t.errore) note.testi.push('Tolleranza "' + b.toll + '" su Ø' + d + ' non capita: al nominale.');
        else { nuovo = r3(d + (t.sup + t.inf) / 2); misure.push({ nome: 'Ø' + d + ' ' + b.toll, nominale: String(d), toll: b.toll }); }
      }
      a.x = nuovo; b.x = nuovo;
    }
    const base = { nmax, codLimite: ctx.codLimite, codFiletto: ctx.codFiletto, refrig: ctx.refrig };
    const tSgr = trovaT(tab, ['inserto'], 0, 1, note);
    const mezzo = mt.lvc >= 300 ? 3 : mt.lvc <= 100 ? 1 : 2;
    const fasi = [{ op: 'profilo', titolo: 'Sgrossatura e finitura del profilo T' + tSgr, c: Object.assign({}, base, { t: tSgr, dg, punti: P.map(p => ({ x: p.x, z: p.z, tratto: p.tratto, r: Number(p.r) || 0, raccordo: Number(p.raccordo) || 0, smusso: Number(p.smusso) || 0 })),
      ap: mezzo, sx: 0.4, sz: 0.1, ff: r3(Math.max(0.05, mt.lf * 0.4)), finitura: true, metodo: ctx.metodo || 'passate', vc: mt.lvc, f: mt.lf }) }];
    if (P.some((p, i) => Number(punti[i].toll) || punti[i].toll)) note.testi.push('I cilindri con tolleranza si finiscono al centro della tolleranza.');
    // gole alla fine delle linee, poi i filetti
    for (let i = 1; i < punti.length; i++) {
      const b = punti[i], d = Number(b.x), zA = Number(punti[i - 1].z), zB = Number(b.z);
      if (Number(b.gola) > 0) {
        const w = Number(b.gola), pf = Number(b.fil) > 0 ? 0.613343 * Number(b.fil) + 0.1 : Math.max(0.5, Number(b.golaProf) || 0.5);
        const tG = trovaT(tab, ['inserto'], 0, 4, note);
        fasi.push({ op: 'gola', titolo: 'Gola di scarico su Ø' + d + ' larga ' + w + ' T' + tG, c: Object.assign({}, base, { t: tG, dg: d, dfondo: r3(d - 2 * pf), zg: r3(zB + w), b: w, w: Math.min(3, w), vc: r3(mt.lvc * 0.6), f: r3(Math.max(0.03, mt.lf * 0.3)) }) });
      }
    }
    for (let i = 1; i < punti.length; i++) {
      const b = punti[i], p = Number(b.fil);
      if (!(p > 0)) continue;
      const d = Number(b.x), zA = Number(punti[i - 1].z), zB = Number(b.z);
      const w = Number(b.gola) > 0 ? Number(b.gola) : 0;
      const tF = trovaT(tab, ['inserto'], 0, 3, note);
      const np = p <= 1 ? 5 : p <= 1.5 ? 6 : p <= 2 ? 8 : p <= 3 ? 10 : 12;
      fasi.push({ op: 'filetto', titolo: 'Filetto M' + d + 'x' + p + ' T' + tF, c: Object.assign({}, base, { t: tF, dg: d, d, p, l: r3(-zB - w / 2), n: np, giri: giriDa(mt.lvc * 0.5, d, nmax), metodo: ctx.metodo || 'passate', vc: Math.round(mt.lvc * 0.5) }) });
      if (zA < 0) note.testi.push('Il filetto M' + d + ' non parte dalla testa: le prime passate vanno in aria.');
      if (!w && i < punti.length - 1 && Number(punti[i + 1].x) > d) note.testi.push('Il filetto M' + d + ' finisce contro uno spallamento senza gola di scarico.');
    }
    return { fasi, misure, note: finisci(note), modo: 'tornio' };
  }

  const Ciclo = { pianificaProfilo, estraiQuote, pianificaAlbero, pianificaPiastra, gcodeSequenzaTornio, passoGrosso, trovaT };
  Object.assign(O, Ciclo);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
