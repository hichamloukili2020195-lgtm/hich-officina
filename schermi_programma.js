// ===== Hich-Officina: nuovo programma ISO (fresatura, foratura, tornitura) e listato =====
(function () {
  'use strict';
  const A = window.App, O = A.O, el = A.el, fmt = A.fmt;

  // ----- lavorazioni -----
  const MAT = { id: 'mat', et: 'Materiale', tipo: 'scelta', scelte: () => A.sceltaMateriali() };
  const dalMat = 'dal materiale, si puo cambiare';
  const FRESA = {
    spianatura: { t: 'Spianatura', campi: [
      { id: 'lx', et: 'Lunghezza pezzo X', u: 'mm', v: 100 }, { id: 'ly', et: 'Larghezza pezzo Y', u: 'mm', v: 60 },
      { id: 'prof', et: 'Sovrametallo da togliere', u: 'mm', v: 2 }] },
    contorno: { t: 'Contornatura esterna', campi: [
      { id: 'lx', et: 'Lunghezza pezzo X', u: 'mm', v: 80 }, { id: 'ly', et: 'Larghezza pezzo Y', u: 'mm', v: 50 },
      { id: 'prof', et: 'Profondita', u: 'mm', v: 10 }, { id: 'sovra', et: 'Sovrametallo di finitura', u: 'mm', v: 0.2 },
      { id: 'finitura', et: 'Passata di finitura', tipo: 'spunta', v: true }] },
    tasca: { t: 'Tasca rettangolare', campi: [
      { id: 'cx', et: 'Centro X', u: 'mm', v: 0 }, { id: 'cy', et: 'Centro Y', u: 'mm', v: 0 },
      { id: 'lx', et: 'Lunghezza tasca X', u: 'mm', v: 60 }, { id: 'ly', et: 'Larghezza tasca Y', u: 'mm', v: 40 },
      { id: 'prof', et: 'Profondita', u: 'mm', v: 10 }, { id: 'sovra', et: 'Sovrametallo di finitura', u: 'mm', v: 0.2 },
      { id: 'finitura', et: 'Passata di finitura', tipo: 'spunta', v: true }] }
  };
  const TORNIO = {
    sgrossatura: { t: 'Sgrossatura esterna', campi: [
      { id: 'dg', et: 'Diametro grezzo', u: 'mm', v: 40 }, { id: 'df', et: 'Diametro finito', u: 'mm', v: 30 },
      { id: 'l', et: 'Lunghezza da Z0', u: 'mm', v: 50 }, { id: 'ap', et: 'Passata (sul raggio)', u: 'mm', v: 2 },
      { id: 'sx', et: 'Sovrametallo X (diam.)', u: 'mm', v: 0.4 }, { id: 'sz', et: 'Sovrametallo Z', u: 'mm', v: 0.1 },
      { id: 'finitura', et: 'Passata di finitura', tipo: 'spunta', v: true }, { id: 'ff', et: 'Avanzamento finitura', u: 'mm/giro', v: 0.1 },
      { id: 'smusso', et: 'Smusso 45° in testa', u: 'mm', v: 1 }] },
    interna: { t: 'Sgrossatura interna', campi: [
      { id: 'dp', et: 'Diametro preforo', u: 'mm', v: 20 }, { id: 'di', et: 'Diametro finito', u: 'mm', v: 30 },
      { id: 'dg', et: 'Diametro esterno pezzo', u: 'mm', v: 60 }, { id: 'l', et: 'Lunghezza da Z0', u: 'mm', v: 25 },
      { id: 'ap', et: 'Passata (sul raggio)', u: 'mm', v: 1 }, { id: 'sx', et: 'Sovrametallo X (diam.)', u: 'mm', v: 0.3 },
      { id: 'sz', et: 'Sovrametallo Z', u: 'mm', v: 0.1 }, { id: 'finitura', et: 'Passata di finitura', tipo: 'spunta', v: true },
      { id: 'ff', et: 'Avanzamento finitura', u: 'mm/giro', v: 0.08 }, { id: 'smusso', et: 'Smusso 45° all\'imbocco', u: 'mm', v: 0.5 }] },
    sfacciatura: { t: 'Sfacciatura', campi: [
      { id: 'dg', et: 'Diametro grezzo', u: 'mm', v: 40 }, { id: 's', et: 'Sovrametallo in Z', u: 'mm', v: 2 }, { id: 'ap', et: 'Passata', u: 'mm', v: 1 }] },
    gola: { t: 'Gola', campi: [
      { id: 'dg', et: 'Diametro esterno', u: 'mm', v: 40 }, { id: 'dfondo', et: 'Diametro di fondo', u: 'mm', v: 34 },
      { id: 'zg', et: 'Z fianco destro', u: 'mm', v: -20 }, { id: 'b', et: 'Larghezza gola', u: 'mm', v: 8 }, { id: 'w', et: 'Larghezza utensile', u: 'mm', v: 3 }] },
    foratura: { t: 'Foratura in asse', campi: [
      { id: 'dg', et: 'Diametro esterno pezzo', u: 'mm', v: 50 }, { id: 'dpunta', et: 'Diametro punta', u: 'mm', v: 20 },
      { id: 'prof', et: 'Profondita (punta compresa)', u: 'mm', v: 40 }, { id: 'q', et: 'Beccata', sub: 'vuoto = tutta in una volta', u: 'mm', v: 10 },
      { id: 'tipoPunta', et: 'Punta', tipo: 'scelta', scelte: [['puntaMD', 'Metallo duro'], ['puntaIns', 'A inserti']] }] },
    filetto: { t: 'Filetto esterno', campi: [
      { id: 'd', et: 'Diametro nominale', u: 'mm', v: 20 }, { id: 'p', et: 'Passo', u: 'mm', v: 2.5 },
      { id: 'l', et: 'Lunghezza filetto da Z0', u: 'mm', v: 30 }, { id: 'n', et: 'Numero passate', v: 8 }] },
    filettoInt: { t: 'Filetto interno', campi: [
      { id: 'd', et: 'Diametro nominale', u: 'mm', v: 30 }, { id: 'p', et: 'Passo', u: 'mm', v: 2 },
      { id: 'l', et: 'Lunghezza filetto da Z0', u: 'mm', v: 20 }, { id: 'n', et: 'Numero passate', v: 8 },
      { id: 'dg', et: 'Diametro esterno pezzo', u: 'mm', v: 50 }] }
  };
  const UT_FORI = [['centrino', 'Centrino'], ['puntaMD', 'Punta in metallo duro'], ['puntaIns', 'Punta a inserti'], ['alesatore', 'Alesatore'],
    ['bareno', 'Bareno'], ['maschio', 'Maschio'], ['lamatore', 'Lamatore']];
  const CICLI = [['auto', 'Automatico'], ['G81', 'G81 foratura'], ['G82', 'G82 con sosta'], ['G83', 'G83 a beccate'], ['G73', 'G73 rompitruciolo'],
    ['G84', 'G84 maschiatura'], ['G85', 'G85 alesatura'], ['G86', 'G86 barenatura']];
  function cicloAuto(t, prof, d) {
    if (t === 'maschio') return 'G84';
    if (t === 'alesatore' || t === 'bareno') return 'G85';
    if (t === 'lamatore') return 'G82';
    if (t === 'puntaMD' && prof > 3 * d) return 'G83';
    return 'G81';
  }

  // ----- anteprime -----
  function tela(cv) {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 340, H = cv.clientHeight || 210;
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    return { g, W, H };
  }
  const col = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
  /** Vista isometrica del blocco e del percorso della fresa. */
  function disegnaIso(cv, r) {
    const { g, W, H } = tela(cv);
    if (!r || r.errore || !r.pezzo) return;
    const p = r.pezzo;
    const c30 = Math.cos(Math.PI / 6), s30 = 0.5;
    const pr = (x, y, z) => [(x - y) * c30, -(x + y) * s30 - z];
    const pts = [];
    for (const x of [p.x0, p.x1]) for (const y of [p.y0, p.y1]) for (const z of [p.z0, p.z1]) pts.push(pr(x, y, z));
    r.percorso.forEach(s => { if (!s.rapido || s.z <= 5) pts.push(pr(s.x, s.y, Math.min(s.z, 5))); });
    const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
    const mx = Math.min(...xs), Mx = Math.max(...xs), my = Math.min(...ys), My = Math.max(...ys);
    const sc = Math.min((W - 24) / (Mx - mx || 1), (H - 24) / (My - my || 1));
    const ox = (W - (Mx - mx) * sc) / 2 - mx * sc, oy = (H - (My - my) * sc) / 2 - my * sc;
    const P = (x, y, z) => { const q = pr(x, y, z); return [ox + q[0] * sc, oy + q[1] * sc]; };
    const faccia = (vv, fill) => { g.beginPath(); vv.forEach((q, i) => { const s = P(...q); i ? g.lineTo(...s) : g.moveTo(...s); }); g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.stroke(); };
    // blocco: sopra, fronte (y0), lato destro (x1)
    faccia([[p.x0, p.y0, p.z0], [p.x1, p.y0, p.z0], [p.x1, p.y0, p.z1], [p.x0, p.y0, p.z1]], '#5f6b80');
    faccia([[p.x0, p.y0, p.z0], [p.x0, p.y1, p.z0], [p.x0, p.y1, p.z1], [p.x0, p.y0, p.z1]], '#7c889c');
    faccia([[p.x0, p.y0, p.z1], [p.x1, p.y0, p.z1], [p.x1, p.y1, p.z1], [p.x0, p.y1, p.z1]], '#aeb8c8');
    if (p.tasca) {
      const t = p.tasca;
      faccia([[t.x0, t.y0, 0], [t.x1, t.y0, 0], [t.x1, t.y1, 0], [t.x0, t.y1, 0]], '#56627a');
    }
    // percorso
    g.lineWidth = 1.4;
    r.percorso.forEach(s => {
      if (s.rapido && s.z0 > 5 && s.z > 5) return;
      g.setLineDash(s.rapido ? [4, 4] : []);
      g.strokeStyle = s.rapido ? col('--tenue') : col('--accento2');
      g.beginPath(); g.moveTo(...P(s.x0, s.y0, Math.min(s.z0, 5))); g.lineTo(...P(s.x, s.y, Math.min(s.z, 5))); g.stroke();
    });
    g.setLineDash([]);
  }
  /** Mezzo pezzo da tornio in sezione, Z in orizzontale. */
  function disegnaTornio(cv, r, v, interno) {
    const { g, W, H } = tela(cv);
    if (!r || r.errore || !r.percorso.length) return;
    let zMin = 0, zMax = 2, rMax = 0;
    for (const s of r.percorso) { if (s.rapido) continue; zMin = Math.min(zMin, s.z0, s.z); zMax = Math.max(zMax, s.z0, s.z); rMax = Math.max(rMax, s.x0 / 2, s.x / 2); }
    const dg = v.dg || v.d || 0;
    rMax = Math.max(rMax, dg / 2) + 2; zMin -= 4; zMax += 2;
    const m = 12, sc = Math.min((W - 2 * m) / (zMax - zMin), (H - 2 * m) / rMax);
    const X = z => W - m - (zMax - z) * sc, Y = x => H - m - Math.max(x, -2) / 2 * sc;
    g.fillStyle = '#8f9bb0'; g.globalAlpha = .55;
    const top = v.s > 0 ? v.s : 0;
    g.fillRect(X(zMin), Y(dg), X(top) - X(zMin), Y(0) - Y(dg));
    if (interno > 0) { g.fillStyle = col('--pannello'); g.globalAlpha = 1; g.fillRect(X(zMin), Y(interno), X(top) - X(zMin), Y(0) - Y(interno)); }
    g.globalAlpha = 1;
    g.strokeStyle = col('--tenue'); g.setLineDash([8, 4, 2, 4]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(m, Y(0)); g.lineTo(W - m, Y(0)); g.stroke();
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
    for (const s of r.percorso) {
      g.setLineDash(s.rapido ? [4, 4] : []);
      g.strokeStyle = s.rapido ? col('--tenue') : col('--accento2'); g.lineWidth = s.rapido ? 1 : 1.8;
      g.beginPath(); g.moveTo(X(s.z0), Y(s.x0)); g.lineTo(X(s.z), Y(s.x)); g.stroke();
    }
    g.restore(); g.setLineDash([]);
  }

  // ----- costruzione del programma dai valori -----
  // Vc e avanzamento sono campi veri: si riempiono dal materiale quando cambiano materiale, utensile, diametro o
  // lavorazione; poi si possono correggere a mano. I giri e l'avanzamento al minuto vengono da li.
  const giriDa = (vc, d, nmax) => (vc > 0 && d > 0 ? Math.min(nmax, Math.max(100, Math.round(1000 * vc / (Math.PI * d) / 10) * 10)) : NaN);
  const r3 = x => (isFinite(x) ? Math.round(x * 1000) / 1000 : '');
  /** I valori di taglio dal materiale per la scheda e la lavorazione di adesso. */
  function autoTaglio(tab, v) {
    const I = A.imp(), n = A.numeri(v), mt = A.materiale(v.mat || 0);
    if (!mt) return {};
    if (tab === 'fresa') {
      const dt = O.datiTaglio(mt, { tipo: v.tipoUt || 'fresa', d: n.d, z: n.z, nmax: I.nmaxFresa });
      if (!dt) return {};
      return { vc: dt.vc, fz: r3(dt.fz), ap: Math.round(dt.ap * 100) / 100, ae: Math.round(mt.ae) };
    }
    if (tab === 'fori') {
      const dt = O.datiTaglio(mt, { tipo: v.tipoUt || 'puntaMD', d: n.d, passo: n.passo, nmax: I.nmaxFresa });
      return dt ? { vc: dt.vc, fn: r3(dt.fn) } : {};
    }
    const op = TORNIO[v.op] ? v.op : 'sgrossatura';
    if (op === 'foratura') {
      const dt = O.datiTaglio(mt, { tipo: v.tipoPunta || 'puntaMD', d: n.dpunta });
      return dt ? { vc: dt.vc, f: r3(dt.fn) } : {};
    }
    if (op === 'filetto' || op === 'filettoInt') return { vc: mt.lvc > 0 ? Math.round(mt.lvc * 0.5) : '' };
    return { vc: mt.lvc > 0 ? mt.lvc : '', f: mt.lf > 0 ? mt.lf : '' };
  }
  const RIEMPI = { fresa: ['mat', 'tipoUt', 'd'], fori: ['mat', 'tipoUt', 'd', 'passo'], tornio: ['mat', 'op', 'dpunta', 'tipoPunta'] };

  function costruisci(tab, op, v) {
    const I = A.imp();
    const comuni = { num: O.num(v.num) || I.numProg, nome: v.nome || '', t: O.num(v.t) || 1, zSic: I.zSic, zR: I.zR,
      refrig: I.refrig, g43: I.g43, numerare: I.numerare, fineZ: O.num(I.fineZ) };
    const n = A.numeri(v);
    if (tab === 'fresa') {
      const giri = giriDa(n.vc, n.d, I.nmaxFresa), avanz = Math.round(n.fz * (n.z || 1) * giri);
      const ap = n.ap > 0 ? Math.min(n.ap, n.prof || n.ap) : n.prof, ae = n.ae > 0 ? n.ae : 50;
      if (!(giri > 0)) return { errore: 'Scrivi la velocita di taglio Vc e il diametro della fresa.', righe: [], percorso: [], avvisi: [] };
      if (!(avanz > 0)) return { errore: 'Scrivi l\'avanzamento al dente fz.', righe: [], percorso: [], avvisi: [] };
      const r = O.gcodeFresa(op, Object.assign({}, n, comuni, { nome: comuni.nome || FRESA[op].t, n: giri, f: avanz, ap, ae, finitura: v.finitura }));
      r.taglio = { giri, avanz, vc: n.vc, limitato: giri >= I.nmaxFresa };
      r.riassunto = ['T' + comuni.t, 'D' + fmt(n.d), 'Vc ' + fmt(n.vc, 0), 'S' + fmt(giri, 0), 'F' + fmt(avanz, 0), 'ap ' + fmt(ap, 2)];
      return r;
    }
    if (tab === 'fori') {
      const tipo = v.tipoUt || 'puntaMD';
      const giri = giriDa(n.vc, n.d, I.nmaxFresa);
      const avanz = tipo === 'maschio' ? Math.round((n.passo || 0) * giri) : Math.round((n.fn || 0) * giri);
      if (!(giri > 0)) return { errore: 'Scrivi la velocita di taglio Vc e il diametro.', righe: [], percorso: [], avvisi: [] };
      if (!(avanz > 0)) return { errore: tipo === 'maschio' ? 'Scrivi il passo del maschio.' : 'Scrivi l\'avanzamento al giro.', righe: [], percorso: [], avvisi: [] };
      const punti = O.schemaFori(Object.assign({}, n, { tipo: v.schema || 'cerchio', testo: v.testo, n: n.nf }));
      let prof = n.prof;
      const coni = { puntaMD: 70, centrino: 0, puntaIns: 0 };
      if (v.conPunta && coni[tipo] > 0 && n.d > 0) prof += n.d / (2 * Math.tan(coni[tipo] * Math.PI / 180));
      const ciclo = v.ciclo && v.ciclo !== 'auto' ? v.ciclo : cicloAuto(tipo, prof, n.d);
      const r = O.gcodeFresa('fori', Object.assign({}, comuni, { nome: comuni.nome || 'FORATURA', n: giri, f: avanz, punti, prof, ciclo, q: n.q, d: n.d }));
      r.taglio = { giri, avanz, vc: n.vc, limitato: giri >= I.nmaxFresa };
      r.riassunto = ['T' + comuni.t, (tipo === 'maschio' ? 'M' : 'D') + fmt(n.d), ciclo, 'Vc ' + fmt(n.vc, 0), 'S' + fmt(giri, 0), 'F' + fmt(avanz, 0), 'Z-' + fmt(prof, 2)];
      return r;
    }
    // tornio
    const c = Object.assign({}, n, comuni, { nome: comuni.nome || TORNIO[op].t, nmax: n.nmax > 0 ? n.nmax : I.nmaxTornio, codLimite: I.codLimite, codFiletto: I.codFiletto,
      xCambio: O.num(I.xCambio), zCambio: O.num(I.zCambio), finitura: v.finitura });
    let giriFissi = null;
    if (op === 'filetto' || op === 'filettoInt') {
      c.dg = op === 'filetto' ? n.d : n.dg;
      giriFissi = c.giri = giriDa(n.vc, n.d, c.nmax);
    }
    if (op === 'foratura') giriFissi = c.giri = giriDa(n.vc, n.dpunta, c.nmax);
    const r = O.gcodeTornio(op, c);
    const dRif = op === 'interna' ? n.di : op === 'foratura' ? n.dpunta : (n.dg || n.d);
    const giri = giriFissi || giriDa(n.vc, dRif, c.nmax);
    r.taglio = { giri, avanz: /filetto/.test(op) ? Math.round(giri * n.p) : Math.round(giri * (n.f || 0)), vc: n.vc, fissi: !!giriFissi, limitato: giri >= c.nmax };
    r.riassunto = ['T' + pad(c.t) + pad(c.t), 'Vc ' + fmt(n.vc, 0), giriFissi ? 'S' + fmt(giriFissi, 0) + ' fissi' : 'G96', /filetto/.test(op) ? 'passo ' + fmt(n.p, 2) : 'F' + fmt(n.f, 3) + ' mm/giro', 'max ' + fmt(c.nmax, 0) + ' giri'];
    r.vista = c;
    return r;
  }
  const pad = t => String(Math.max(0, Math.round(t))).padStart(2, '0');

  // ----- schermata -----
  A.schermi.programma = {
    titolo: 'Nuovo programma ISO',
    render(m) {
      const S = A.sezione('programma');
      S.tab = S.tab || 'fresa';
      const schede = el('div', { class: 'schede' });
      const corpo = el('div');
      m.append(schede, corpo);
      const TABS = [['fresa', 'Fresatura'], ['fori', 'Foratura'], ['tornio', 'Tornitura']];
      TABS.forEach(([id, t]) => schede.appendChild(el('button', { 'data-id': id, testo: t, onclick: () => { S.tab = id; A.salva(); apri(); } })));
      const apri = () => {
        schede.querySelectorAll('button').forEach(b => b.classList.toggle('attiva', b.dataset.id === S.tab));
        corpo.innerHTML = '';
        const tab = S.tab;
        const v = S[tab] = S[tab] || {};
        if (!v._taglio2) {   // prima versione: giri e avanzamento erano campi a parte
          delete v.giri; delete v.avanz; delete v.vc; delete v.f;
          v._taglio2 = true; A.salva();
        }
        const cv = el('canvas', { class: 'vista', 'aria-label': 'Anteprima del percorso' });
        const pan = el('div', { class: 'pannello' });
        const panLav = el('div', { class: 'pannello' });
        const panTaglio = el('div', { class: 'pannello' });
        const msg = el('div');
        const genera = el('button', { class: 'pul', html: A.icona('codice') + 'Genera programma ISO' });
        corpo.append(cv, el('div', { class: 'leggenda', testo: tab === 'tornio' ? 'Sezione del mezzo pezzo: blu lavoro, tratteggio rapido.' : 'Vista del pezzo: blu lavoro, tratteggio rapido.' }),
          pan, el('div', { class: 'sez', testo: 'Lavorazione' }), panLav, el('div', { class: 'sez', testo: 'Dati di taglio e programma' }), panTaglio, msg, genera);
        let campiTesta, campiLav, campiTaglio;
        if (tab === 'fresa') {
          campiTesta = [MAT, { id: 'op', et: 'Strategia', tipo: 'scelta', scelte: Object.keys(FRESA).map(k => [k, FRESA[k].t]) },
            { id: 'ut', et: 'Dalla tabella utensili', tipo: 'scelta', scelte: () => A.scelteTabella(['fresa', 'fresaFin']) },
            { id: 'tipoUt', et: 'Utensile', tipo: 'scelta', scelte: [['fresa', 'Fresa metallo duro sgrossatura'], ['fresaFin', 'Fresa metallo duro finitura']] },
            { id: 'd', et: 'Diametro fresa', u: 'mm', v: 10 }, { id: 'z', et: 'Taglienti', u: 'z', v: 3 }];
          campiLav = FRESA[v.op || 'spianatura'] ? FRESA[v.op || 'spianatura'].campi : FRESA.spianatura.campi;
          campiTaglio = [
            { id: 'vc', et: 'Velocita di taglio Vc', sub: dalMat, u: 'm/min' },
            { id: 'fz', et: 'Avanzamento al dente fz', sub: dalMat, u: 'mm' },
            { id: 'ap', et: 'Profondita passata ap', sub: dalMat, u: 'mm' },
            { id: 'ae', et: 'Passo laterale ae', sub: dalMat, u: '% D' },
            { id: 't', et: 'Numero utensile T', v: 1 }, { id: 'num', et: 'Numero programma O', v: '', ph: () => A.imp().numProg }, { id: 'nome', et: 'Nome', tipo: 'testo', v: '' }];
        } else if (tab === 'fori') {
          campiTesta = [MAT, { id: 'ut', et: 'Dalla tabella utensili', tipo: 'scelta', scelte: () => A.scelteTabella(UT_FORI.map(x => x[0])) },
            { id: 'tipoUt', et: 'Utensile', tipo: 'scelta', scelte: UT_FORI, v: 'puntaMD' },
            { id: 'd', et: 'Diametro', sub: 'nominale per il maschio', u: 'mm', v: 8.5 },
            { id: 'passo', et: 'Passo', u: 'mm', v: 1.5, se: x => x.tipoUt === 'maschio' },
            { id: 'prof', et: 'Profondita', sub: 'parte cilindrica', u: 'mm', v: 20 },
            { id: 'conPunta', et: 'Aggiungi il cono della punta (140°)', tipo: 'spunta', v: true, se: x => x.tipoUt === 'puntaMD' }];
          campiLav = [{ id: 'schema', et: 'Posizione dei fori', tipo: 'scelta', scelte: [['cerchio', 'Su circonferenza'], ['griglia', 'A griglia'], ['elenco', 'Elenco X Y']] },
            { id: 'cx', et: 'Centro X', u: 'mm', v: 0, se: x => x.schema === 'cerchio' || !x.schema }, { id: 'cy', et: 'Centro Y', u: 'mm', v: 0, se: x => x.schema === 'cerchio' || !x.schema },
            { id: 'dc', et: 'Diametro circonferenza', u: 'mm', v: 80, se: x => x.schema === 'cerchio' || !x.schema },
            { id: 'nf', et: 'Numero fori', v: 6, se: x => x.schema === 'cerchio' || !x.schema }, { id: 'a', et: 'Angolo primo foro', u: '°', v: 0, se: x => x.schema === 'cerchio' || !x.schema },
            { id: 'x0', et: 'Primo foro X', u: 'mm', v: 10, se: x => x.schema === 'griglia' }, { id: 'y0', et: 'Primo foro Y', u: 'mm', v: 10, se: x => x.schema === 'griglia' },
            { id: 'nx', et: 'Fori in X', v: 4, se: x => x.schema === 'griglia' }, { id: 'ny', et: 'Fori in Y', v: 2, se: x => x.schema === 'griglia' },
            { id: 'px', et: 'Passo in X', u: 'mm', v: 20, se: x => x.schema === 'griglia' }, { id: 'py', et: 'Passo in Y', u: 'mm', v: 20, se: x => x.schema === 'griglia' },
            { id: 'testo', et: 'Coordinate, una per riga: X Y', tipo: 'area', mono: true, v: '10 10\n50 10\n50 40', se: x => x.schema === 'elenco' }];
          campiTaglio = [{ id: 'ciclo', et: 'Ciclo', tipo: 'scelta', scelte: CICLI },
            { id: 'q', et: 'Beccata Q', sub: 'G83 e G73', u: 'mm', v: '', ph: x => fmt(O.num(x.d) || 2, 2) },
            { id: 'vc', et: 'Velocita di taglio Vc', sub: dalMat, u: 'm/min' },
            { id: 'fn', et: 'Avanzamento al giro', sub: dalMat, u: 'mm/giro', se: x => x.tipoUt !== 'maschio' },
            { id: 't', et: 'Numero utensile T', v: 1 }, { id: 'num', et: 'Numero programma O', v: '', ph: () => A.imp().numProg }, { id: 'nome', et: 'Nome', tipo: 'testo', v: '' }];
        } else {
          const op = TORNIO[v.op] ? v.op : 'sgrossatura';
          campiTesta = [MAT, { id: 'op', et: 'Lavorazione', tipo: 'scelta', scelte: Object.keys(TORNIO).map(k => [k, TORNIO[k].t]) },
            { id: 'ut', et: 'Dalla tabella utensili', tipo: 'scelta', scelte: () => A.scelteTabella(op === 'foratura' ? ['puntaMD', 'puntaIns'] : ['inserto']) }];
          campiLav = TORNIO[op].campi;
          campiTaglio = [
            { id: 'vc', et: 'Velocita di taglio Vc', sub: /filetto/.test(op) ? 'dal materiale, meta della tornitura' : dalMat, u: 'm/min' },
            { id: 'f', et: 'Avanzamento', sub: dalMat, u: 'mm/giro', se: () => !/filetto/.test(op) },
            { id: 'nmax', et: 'Giri massimi', sub: 'vuoto = impostazioni', u: 'giri/min', v: '', ph: () => A.imp().nmaxTornio },
            { id: 't', et: 'Numero utensile T', v: 1 }, { id: 'num', et: 'Numero programma O', v: '', ph: () => A.imp().numProg }, { id: 'nome', et: 'Nome', tipo: 'testo', v: '' }];
        }
        let fT, fL, fD, ultimo = null;
        const aggiorna = id => {
          if (id === 'ut' && v.ut) {
            const u = A.utensileDa(v.ut);
            if (u) {
              fD.metti('t', u.t);
              if (tab !== 'tornio') { fT.metti('tipoUt', u.tipo); if (u.d) fT.metti('d', u.d); if (u.z && tab === 'fresa') fT.metti('z', u.z); if (u.passo && tab === 'fori') fT.metti('passo', u.passo); }
              else if (v.op === 'foratura' && u.d) { fL.metti('dpunta', u.d); fL.metti('tipoPunta', u.tipo); }
              const nuovi = autoTaglio(tab, v); for (const k in nuovi) fD.metti(k, nuovi[k]);
            }
          }
          if (id && RIEMPI[tab].includes(id)) {
            const nuovi = autoTaglio(tab, v);
            if (id === 'op') { Object.assign(v, nuovi); A.salva(); apri(); return; }
            for (const k in nuovi) fD.metti(k, nuovi[k]);
          }
          fT.aggiorna(); fL.aggiorna(); fD.aggiorna();
          const op = tab === 'fresa' ? (FRESA[v.op] ? v.op : 'spianatura') : tab === 'tornio' ? (TORNIO[v.op] ? v.op : 'sgrossatura') : 'fori';
          const r = costruisci(tab, op, v);
          ultimo = { r, tab, op };
          msg.innerHTML = '';
          if (r.errore) msg.appendChild(el('p', { class: 'errore', testo: r.errore }));
          else {
            const t = r.taglio || {};
            msg.appendChild(A.misuratore(t.fissi ? 'Giri fissi S' : tab === 'tornio' ? 'Giri al diametro di lavoro' : 'Velocita mandrino S', fmt(t.giri, 0), 'giri/min'));
            msg.appendChild(A.griglia([['Velocita di taglio', fmt(t.vc, 0), 'm/min'], ['Avanzamento', fmt(t.avanz, 0), 'mm/min']]));
            if (t.limitato) msg.appendChild(A.info('Giri limitati al massimo delle impostazioni: la Vc vera e piu bassa.', 'avviso'));
            const mt0 = A.materiale(v.mat || 0);
            msg.appendChild(A.info((mt0 ? '<b>' + A.esc(mt0.n) + '</b>. ' : '') + A.esc(r.avvisi.join(' ')) + (r.riassunto ? '<br><b>' + A.esc(r.riassunto.join('  ·  ')) + '</b>' : '')));
          }
          const mt = A.materiale(v.mat || 0);
          if (mt && mt.nohss && tab === 'fori' && (v.tipoUt === 'maschio')) msg.appendChild(A.info('Materiale temprato: maschiatura sconsigliata.', 'avviso'));
          if (tab === 'tornio') {
            const c = r.vista || {};
            disegnaTornio(cv, r, c, op === 'interna' ? c.dp : op === 'filettoInt' ? c.d - 1.0825 * c.p : 0);
          } else disegnaIso(cv, r);
        };
        fT = A.modulo(pan, campiTesta, v, aggiorna);
        fL = A.modulo(panLav, campiLav, v, aggiorna);
        fD = A.modulo(panTaglio, campiTaglio, v, aggiorna);
        if (!(O.num(v.vc) > 0)) { const nuovi = autoTaglio(tab, v); for (const k in nuovi) fD.metti(k, nuovi[k]); }
        genera.addEventListener('click', () => {
          if (!ultimo || ultimo.r.errore) { A.avviso(ultimo ? ultimo.r.errore : 'Compila i campi'); return; }
          A.param.listato = { righe: ultimo.r.righe, iso: ultimo.r.righe.slice(), nome: (ultimo.r.righe[1] || 'O0001').split(' ')[0], tipo: ultimo.tab, riassunto: ultimo.r.riassunto, avvisi: ultimo.r.avvisi };
          A.vai('listato');
        });
        aggiorna();
        A.anteprimaRidisegna = () => aggiorna();
      };
      apri();
    }
  };
  window.addEventListener('resize', () => { if (A.attuale && A.attuale() === 'programma' && A.anteprimaRidisegna) A.anteprimaRidisegna(); });

  // apre la schermata con valori gia pronti (galleria)
  A.apriProgramma = function (tab, valori) {
    const S = A.sezione('programma');
    S.tab = tab; S[tab] = Object.assign({}, valori); A.salva();
    A.vai('programma');
  };

  // ----- listato -----
  function colora(riga) {
    const e = A.esc(riga);
    if (/^\s*\(.*\)\s*$/.test(riga) || riga === '%' || /^\s*(\d+\s+)?;/.test(riga)) return '<span class="c-com">' + e + '</span>';
    let c = e;
    const pv = c.indexOf(';'), coda = pv >= 0 ? '<span class="c-com">' + c.slice(pv) + '</span>' : '';
    if (pv >= 0) c = c.slice(0, pv);
    if (!/CYCLE\d+\(/.test(c)) c = c.replace(/(\([^)]*\))/g, '<span class="c-com">$1</span>');
    return c.replace(/\b(G\d+(?:\.\d)?)\b/g, '<span class="c-g">$1</span>')
      .replace(/\b(M\d+)\b/g, '<span class="c-m">$1</span>')
      .replace(/\b([TO]\d+|TOOL CALL|CYCL DEF|MCALL|CYCLE\d+)\b/g, '<span class="c-t">$1</span>') + coda;
  }
  A.colora = colora;
  // il listato, la simulazione e l'apertura dei programmi stanno in schermi_iso.js
})();
