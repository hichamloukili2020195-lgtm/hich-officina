// ===== Hich-Officina: calcoli (senza interfaccia, provati da prove/prove.js) =====
// Tutti i valori di taglio sono INDICATIVI: sono un punto di partenza, non sostituiscono i dati dell'utensile.
(function (radice) {
  'use strict';

  /** Legge un numero accettando anche la virgola. NaN se vuoto o sbagliato. */
  function num(s) {
    if (typeof s === 'number') return s;
    const t = String(s == null ? '' : s).trim().replace(',', '.');
    if (t === '') return NaN;
    return Number(t);
  }

  // ----- materiali -----
  // Valori di partenza per utensili in METALLO DURO rivestito (maschi in acciaio super rapido da polveri rivestito),
  // valori medi tipici dei cataloghi utensili, INDICATIVI (aggiornati nella 2.3.0). Stessi nomi e stessi campi del
  // programma parametrico: le Vc si usano cosi come sono, gli avanzamenti si adattano al diametro.
  // vc/fz fresa sgrossatura (fz per D10), ap in volte D, ae in % di D, fvc/ffz fresa di finitura,
  // dvc/dfn punta in metallo duro (fn per D10), ivc/ifn punta a inserti (fn per D10), tvc maschio,
  // rvc/rfn alesatore in metallo duro, bvc/bfn bareno con inserto, lvc/lf tornitura con inserto in sgrossatura,
  // rho densita (kg/dm3). La propria tabella si importa dall'app (Materiali > Importa).
  const MATERIALI = [
    {n: "Alluminio", g: "Alluminio e leghe leggere", vc: 500, fz: 0.08, ap: 1, ae: 50, fvc: 600, ffz: 0.06, dvc: 200, dfn: 0.25, ivc: 300, ifn: 0.1, tvc: 40, rvc: 150, rfn: 0.3, bvc: 400, bfn: 0.1, lvc: 600, lf: 0.3, rho: 2.7, note: "Lubrificazione abbondante o nebbia; fresa a 2-3 taglienti lucidata."},
    {n: "Ottone", g: "Rame e leghe", vc: 300, fz: 0.07, ap: 1, ae: 50, fvc: 350, ffz: 0.05, dvc: 150, dfn: 0.2, ivc: 250, ifn: 0.08, tvc: 30, rvc: 100, rfn: 0.25, bvc: 250, bfn: 0.08, lvc: 350, lf: 0.25, rho: 8.5, note: "Ottone automatico: a secco o con poca emulsione; punte con angolo di spoglia ridotto."},
    {n: "Bronzo", g: "Rame e leghe", vc: 200, fz: 0.06, ap: 0.8, ae: 40, fvc: 240, ffz: 0.05, dvc: 100, dfn: 0.18, ivc: 180, ifn: 0.08, tvc: 20, rvc: 60, rfn: 0.22, bvc: 180, bfn: 0.08, lvc: 250, lf: 0.22, rho: 8.8, note: "Bronzi al piombo piu facili; bronzo all'alluminio piu duro: scendi del 30%."},
    {n: "Ferro (Fe360)", g: "Acciai al carbonio", vc: 220, fz: 0.06, ap: 0.8, ae: 45, fvc: 260, ffz: 0.05, dvc: 110, dfn: 0.2, ivc: 220, ifn: 0.08, tvc: 18, rvc: 60, rfn: 0.25, bvc: 200, bfn: 0.1, lvc: 280, lf: 0.3, rho: 7.85, note: "Acciaio dolce S235/Fe360: attenzione al truciolo che si incolla, usa emulsione."},
    {n: "C40", g: "Acciai al carbonio", vc: 180, fz: 0.055, ap: 0.7, ae: 40, fvc: 220, ffz: 0.045, dvc: 90, dfn: 0.18, ivc: 200, ifn: 0.07, tvc: 15, rvc: 50, rfn: 0.22, bvc: 180, bfn: 0.09, lvc: 240, lf: 0.28, rho: 7.85, note: "Acciaio da bonifica non bonificato (circa 200 HB)."},
    {n: "TR bonificato (30-40 HRC)", g: "Acciai al carbonio", vc: 120, fz: 0.045, ap: 0.5, ae: 30, fvc: 150, ffz: 0.035, dvc: 60, dfn: 0.14, ivc: 150, ifn: 0.06, tvc: 8, rvc: 35, rfn: 0.18, bvc: 140, bfn: 0.08, lvc: 180, lf: 0.22, rho: 7.85, note: "Acciaio bonificato (42CrMo4, 39NiCrMo3): meno profondita, emulsione abbondante."},
    {n: "Temprato (45-55 HRC)", g: "Acciai temprati", vc: 80, fz: 0.03, ap: 0.15, ae: 10, fvc: 100, ffz: 0.025, dvc: 35, dfn: 0.06, ivc: 70, ifn: 0.04, tvc: 3, rvc: 15, rfn: 0.1, bvc: 80, bfn: 0.05, nohss: true, lvc: 100, lf: 0.12, rho: 7.85, note: "Solo metallo duro con rivestimento TiAlN, profondita e passo laterale piccoli. Foratura e maschiatura sconsigliate: meglio eroditura o preforo prima della tempra."},
    {n: "AISI 303", g: "Inox", vc: 160, fz: 0.05, ap: 0.6, ae: 35, fvc: 190, ffz: 0.04, dvc: 70, dfn: 0.15, ivc: 160, ifn: 0.06, tvc: 10, rvc: 30, rfn: 0.2, bvc: 150, bfn: 0.08, lvc: 220, lf: 0.25, rho: 7.9, note: "Inox automatico (solforato)."},
    {n: "AISI 304/304L", g: "Inox", vc: 130, fz: 0.045, ap: 0.5, ae: 30, fvc: 160, ffz: 0.035, dvc: 55, dfn: 0.12, ivc: 140, ifn: 0.06, tvc: 8, rvc: 25, rfn: 0.18, bvc: 130, bfn: 0.07, lvc: 190, lf: 0.22, rho: 7.9, note: "Austenitico: si incrudisce, non fermare l'utensile nel taglio e non strisciare."},
    {n: "AISI 316/316L", g: "Inox", vc: 110, fz: 0.04, ap: 0.4, ae: 28, fvc: 140, ffz: 0.035, dvc: 45, dfn: 0.11, ivc: 120, ifn: 0.05, tvc: 6, rvc: 20, rfn: 0.16, bvc: 110, bfn: 0.07, lvc: 170, lf: 0.22, rho: 8, note: "Austenitico al molibdeno: piu duro da lavorare del 304."},
    {n: "AISI 420", g: "Inox", vc: 140, fz: 0.045, ap: 0.5, ae: 28, fvc: 170, ffz: 0.035, dvc: 60, dfn: 0.13, ivc: 150, ifn: 0.06, tvc: 8, rvc: 25, rfn: 0.18, bvc: 140, bfn: 0.07, lvc: 200, lf: 0.22, rho: 7.7, note: "Martensitico ricotto; se temprato usa i valori di \"Temprato\"."},
    {n: "AISI 430", g: "Inox", vc: 150, fz: 0.05, ap: 0.6, ae: 28, fvc: 180, ffz: 0.04, dvc: 65, dfn: 0.14, ivc: 160, ifn: 0.06, tvc: 9, rvc: 28, rfn: 0.18, bvc: 140, bfn: 0.07, lvc: 210, lf: 0.22, rho: 7.7, note: "Ferritico."},
    {n: "AISI 17-4 PH", g: "Inox", vc: 90, fz: 0.04, ap: 0.4, ae: 22, fvc: 110, ffz: 0.03, dvc: 40, dfn: 0.1, ivc: 110, ifn: 0.05, tvc: 5, rvc: 18, rfn: 0.15, bvc: 100, bfn: 0.06, lvc: 150, lf: 0.18, rho: 7.8, note: "Indurente per precipitazione: valori per stato solubilizzato."},
    {n: "F51 (duplex 2205)", g: "Inox duplex", vc: 80, fz: 0.035, ap: 0.3, ae: 20, fvc: 100, ffz: 0.03, dvc: 35, dfn: 0.09, ivc: 100, ifn: 0.05, tvc: 4, rvc: 15, rfn: 0.14, bvc: 90, bfn: 0.06, lvc: 130, lf: 0.18, rho: 7.8, note: "Duplex: forze di taglio alte, attrezzatura rigida e refrigerazione abbondante."},
    {n: "F55 (super duplex 2507)", g: "Inox duplex", vc: 65, fz: 0.03, ap: 0.25, ae: 15, fvc: 80, ffz: 0.025, dvc: 28, dfn: 0.08, ivc: 80, ifn: 0.045, tvc: 3, rvc: 12, rfn: 0.12, bvc: 75, bfn: 0.05, lvc: 110, lf: 0.16, rho: 7.8, note: "Super duplex: ancora piu severo del F51."},
    {n: "Lega di nichel 625/718", g: "Superleghe", vc: 35, fz: 0.025, ap: 0.2, ae: 10, fvc: 45, ffz: 0.02, dvc: 18, dfn: 0.06, ivc: 40, ifn: 0.04, tvc: 2, rvc: 8, rfn: 0.1, bvc: 40, bfn: 0.05, nohss: true, lvc: 50, lf: 0.15, rho: 8.3, note: "Solo metallo duro (meglio ceramica per sgrossare), refrigerazione ad alta pressione, usura rapida: sostituisci presto gli inserti."},
    {n: "Acciaio X153CrMoV12 (1.2379)", g: "Acciai per utensili", vc: 110, fz: 0.045, ap: 0.4, ae: 25, fvc: 140, ffz: 0.035, dvc: 55, dfn: 0.12, ivc: 130, ifn: 0.06, tvc: 7, rvc: 25, rfn: 0.16, bvc: 120, bfn: 0.07, lvc: 170, lf: 0.22, rho: 7.7, note: "Acciaio per lavorazioni a freddo ricotto (circa 250 HB). Temprato: vedi \"Temprato\"."},
    {n: "K12", g: "Acciai per utensili", vc: 110, fz: 0.045, ap: 0.4, ae: 25, fvc: 140, ffz: 0.035, dvc: 55, dfn: 0.12, ivc: 130, ifn: 0.06, tvc: 7, rvc: 25, rfn: 0.16, bvc: 120, bfn: 0.07, lvc: 170, lf: 0.22, rho: 7.7, note: "DA VERIFICARE: ho usato gli stessi valori dell'acciaio X153CrMoV12 perche non conosco con certezza la designazione. Correggili con i dati della tua scheda materiale."},
    {n: "Legno", g: "Altri", vc: 600, fz: 0.1, ap: 1, ae: 60, fvc: 700, ffz: 0.08, dvc: 150, dfn: 0.3, tvc: 30, rvc: 80, rfn: 0.4, bvc: 400, bfn: 0.1, rho: 0.7, note: "Router: fresa a 2 taglienti, aspirazione."},
    {n: "Plastica", g: "Altri", vc: 350, fz: 0.1, ap: 0.5, ae: 55, fvc: 400, ffz: 0.08, dvc: 120, dfn: 0.2, ivc: 200, ifn: 0.08, tvc: 25, rvc: 60, rfn: 0.3, bvc: 300, bfn: 0.1, lvc: 300, lf: 0.2, rho: 1.2, note: "Evita il surriscaldamento: aria compressa o poco liquido, utensili ben affilati."}
  ];

  // ----- formule di base -----
  const giri = (vc, d) => vc * 1000 / (Math.PI * d);           // n [giri/min] da Vc [m/min] e D [mm]
  const vcDaGiri = (n, d) => n * Math.PI * d / 1000;            // Vc [m/min]

  /** Avanzamento per dente adattato al diametro della fresa (il valore di tabella e per D10). */
  function fzPerDiametro(fz10, d) {
    return fz10 * Math.min(2, Math.max(0.3, d / 10));
  }

  function fresatura(p) {
    const n = giri(p.vc, p.d);
    const vf = n * p.z * p.fz;
    const r = { n, vf };
    if (p.ae > 0 && p.ap > 0) r.q = p.ae * p.ap * vf / 1000;   // cm3/min
    return r;
  }

  function tornitura(p) {
    let n = giri(p.vc, p.d);
    const limitato = p.nmax > 0 && n > p.nmax;
    if (limitato) n = p.nmax;
    const vf = n * p.f;
    const r = { n, vf, limitato, vcReale: vcDaGiri(n, p.d) };
    if (p.r > 0) r.ra = p.f * p.f / (32 * p.r) * 1000;   // Ra teorica [um], approssimazione f^2/(32 r)
    if (p.l > 0) r.tempo = p.l / vf;                      // minuti
    if (p.ap > 0) r.q = p.vc * p.ap * p.f;                // cm3/min
    return r;
  }

  function foratura(p) {
    const n = giri(p.vc, p.d);
    return { n, vf: n * p.f };
  }

  // ----- dati di taglio per tipo di utensile (stesse regole del programma parametrico) -----
  const UTENSILI = [
    ['fresa', 'Fresa metallo duro (sgrossatura)'], ['fresaFin', 'Fresa metallo duro (finitura)'],
    ['puntaMD', 'Punta in metallo duro'], ['puntaIns', 'Punta a inserti'], ['centrino', 'Centrino'],
    ['alesatore', 'Alesatore'], ['bareno', 'Bareno'], ['maschio', 'Maschio'], ['lamatore', 'Lamatore'], ['smussatore', 'Smussatore 90°'],
    ['filettaFresa', 'Fresa per filettare'], ['inserto', 'Inserto da tornio']
  ];
  const giriArrot = (vc, d, nmax) => Math.min(nmax || 24000, Math.max(100, Math.round(1000 * vc / (Math.PI * d) / 10) * 10));
  /**
   * Giri e avanzamenti di partenza per un utensile in un materiale.
   * p = {tipo, d, z, passo (maschio), nmax}. Ritorna {vc, n, fz|fn, f (mm/min), ap, ae, testo} oppure null.
   */
  function datiTaglio(m, p) {
    const d = p.d, z = p.z || 1;
    if (!m || !(d > 0)) return null;
    const r = { tipo: p.tipo };
    const perGiro = (vc, fn, testo) => {
      r.vc = vc; r.fn = fn; r.n = giriArrot(vc, d, p.nmax); r.f = Math.round(fn * r.n); r.testo = testo;
      return r;
    };
    switch (p.tipo) {
      case 'puntaMD': case 'centrino':
        return perGiro(m.dvc, Math.max(0.02, m.dfn * d / 10), 'Vc della punta in metallo duro, fn per D10 adattato al diametro');
      case 'puntaIns':
        return perGiro(m.ivc > 0 ? m.ivc : m.dvc, Math.max(0.02, (m.ifn > 0 ? m.ifn : m.dfn) * d / 10),
          m.ivc > 0 ? 'Vc della punta a inserti' : 'Senza dati per la punta a inserti: quelli della punta in metallo duro');
      case 'alesatore':
        return perGiro(m.rvc, Math.max(0.02, m.rfn * Math.sqrt(d / 10)), 'fn adattato alla radice del diametro');
      case 'bareno':
        return perGiro(m.bvc, Math.max(0.02, m.bfn * Math.sqrt(d / 10)), 'fn adattato alla radice del diametro');
      case 'smussatore':
        return perGiro(m.dvc, Math.max(0.02, m.dfn * Math.min(1.5, d / 10) * 0.5), 'Vc della punta, avanzamento x0,5');
      case 'lamatore':
        return perGiro(m.dvc, Math.max(0.02, m.dfn * Math.min(1.5, d / 10) * 0.7), 'Vc della punta, avanzamento x0,7');
      case 'inserto':
        if (!(m.lvc > 0)) return null;
        r.vc = m.lvc; r.fn = m.lf; r.n = giriArrot(m.lvc, d, p.nmax); r.f = Math.round(m.lf * r.n); r.testo = 'Sgrossatura con inserto';
        return r;
      case 'maschio': {
        const passo = p.passo > 0 ? p.passo : 1;
        r.vc = m.tvc; r.fn = passo; r.n = giriArrot(m.tvc, d, p.nmax); r.f = Math.round(passo * r.n); r.testo = 'Avanzamento = passo x giri';
        return r;
      }
      case 'filettaFresa': {
        const fz = m.fz * 0.5 * Math.min(1, Math.max(0.3, Math.sqrt(d / 10)));
        r.vc = m.vc; r.fz = fz; r.n = giriArrot(m.vc, d, p.nmax); r.f = Math.max(1, Math.round(fz * z * r.n)); r.testo = 'fz sul filetto';
        return r;
      }
      default: {   // fresa e fresaFin
        const fin = p.tipo === 'fresaFin';
        const vc = fin && m.fvc > 0 ? m.fvc : m.vc;
        const fz = (fin && m.ffz > 0 ? m.ffz : m.fz) * Math.min(1.6, Math.max(0.35, Math.sqrt(d / 10)));
        r.vc = vc; r.fz = fz; r.n = giriArrot(vc, d, p.nmax); r.f = Math.round(fz * z * r.n);
        r.ap = m.ap * d; r.ae = m.ae * d / 100;
        r.testo = fin ? 'Finitura' + (m.fvc > 0 ? '' : ': senza dati, quelli della sgrossatura') : 'Sgrossatura';
        return r;
      }
    }
  }

  /**
   * Legge una libreria materiali incollata o caricata da file: {materiali:[...]} (Hich-CAM, pulsante JSON) oppure [...].
   * Tiene i campi di tornitura e densita di quelli di serie con lo stesso nome (o dello stesso gruppo).
   */
  function leggiMateriali(testo) {
    let a;
    try { a = JSON.parse(String(testo || '').trim().replace(/^﻿/, '')); } catch (e) { return { errore: 'Il testo non e un JSON valido: copia tutto, dalla prima { all\'ultima }.' }; }
    if (a && !Array.isArray(a)) a = a.materiali || a.mats || (a.prog && a.prog.mats);
    if (!Array.isArray(a) || !a.length) return { errore: 'Nel testo non trovo la lista dei materiali.' };
    const NUM = ['vc', 'fz', 'ap', 'ae', 'dvc', 'dfn', 'tvc', 'rvc', 'rfn', 'bvc', 'bfn', 'ivc', 'ifn', 'fvc', 'ffz', 'lvc', 'lf', 'rho'];
    const out = [], nomi = {};
    for (let i = 0; i < a.length; i++) {
      const x = a[i] || {};
      const n = String(x.n || '').trim();
      if (!n) return { errore: 'Il materiale numero ' + (i + 1) + ' non ha il nome.' };
      if (!(num(x.vc) > 0) || !(num(x.fz) > 0)) return { errore: n + ': mancano la Vc o lo fz della fresa.' };
      if (nomi[n]) return { errore: 'Il materiale ' + n + ' compare due volte.' };
      nomi[n] = true;
      const serie = MATERIALI.find(m => m.n === n) || MATERIALI.find(m => m.g === x.g) || {};
      const m = { n, g: String(x.g || serie.g || 'Altri') };
      for (const k of NUM) {
        const v = num(x[k]);
        if (v > 0) m[k] = v;
        else if ((k === 'lvc' || k === 'lf' || k === 'rho') && serie[k] > 0) m[k] = serie[k];
        else if (!['ivc', 'ifn', 'fvc', 'ffz', 'lvc', 'lf'].includes(k)) m[k] = serie[k] > 0 ? serie[k] : (k === 'rho' ? 7.85 : NaN);
      }
      const manca = NUM.filter(k => k !== 'rho' && !['ivc', 'ifn', 'fvc', 'ffz', 'lvc', 'lf'].includes(k) && !(m[k] > 0));
      if (manca.length) return { errore: n + ': mancano ' + manca.join(', ') + '.' };
      if (x.nohss) m.nohss = true;
      m.note = String(x.note || serie.note || '');
      out.push(m);
    }
    return { materiali: out };
  }

  // ----- peso e trigonometria -----
  /** Peso in kg: forma 'tondo' {d,l}, 'tubo' {d,di,l}, 'piatto' {a,b,l}, 'esagono' {s,l} (s = chiave). mm e kg/dm3. */
  function peso(forma, q, rho) {
    let area;   // mm2
    if (forma === 'tondo') area = Math.PI * q.d * q.d / 4;
    else if (forma === 'tubo') area = Math.PI * (q.d * q.d - q.di * q.di) / 4;
    else if (forma === 'piatto') area = q.a * q.b;
    else if (forma === 'esagono') area = Math.sqrt(3) / 2 * q.s * q.s;
    else return NaN;
    return area * q.l * rho / 1e6;
  }
  /** Triangolo rettangolo da due dati qualsiasi: a,b cateti, c ipotenusa, A angolo opposto ad a (gradi). */
  function triangolo(t) {
    const rad = Math.PI / 180;
    let { a, b, c, A } = t;
    const ok = x => x > 0;
    if (ok(a) && ok(b)) { c = Math.hypot(a, b); A = Math.atan2(a, b) / rad; }
    else if (ok(a) && ok(c) && c > a) { b = Math.sqrt(c * c - a * a); A = Math.asin(a / c) / rad; }
    else if (ok(b) && ok(c) && c > b) { a = Math.sqrt(c * c - b * b); A = Math.acos(b / c) / rad; }
    else if (ok(A) && A < 90 && ok(a)) { b = a / Math.tan(A * rad); c = a / Math.sin(A * rad); }
    else if (ok(A) && A < 90 && ok(b)) { a = b * Math.tan(A * rad); c = b / Math.cos(A * rad); }
    else if (ok(A) && A < 90 && ok(c)) { a = c * Math.sin(A * rad); b = c * Math.cos(A * rad); }
    else return null;
    return { a, b, c, A, B: 90 - A };
  }

  // ----- filetti metrici ISO -----
  const FILETTI_GROSSI = [
    [1, .25], [1.2, .25], [1.6, .35], [2, .4], [2.5, .45], [3, .5], [4, .7], [5, .8], [6, 1], [8, 1.25], [10, 1.5],
    [12, 1.75], [14, 2], [16, 2], [18, 2.5], [20, 2.5], [22, 2.5], [24, 3], [27, 3], [30, 3.5], [33, 3.5], [36, 4],
    [39, 4], [42, 4.5], [45, 4.5], [48, 5], [52, 5], [56, 5.5], [60, 5.5], [64, 6]
  ];
  const FILETTI_FINI = [
    [8, 1], [10, 1], [10, 1.25], [12, 1], [12, 1.25], [12, 1.5], [14, 1.5], [16, 1.5], [18, 1.5], [20, 1.5], [22, 1.5],
    [24, 1.5], [24, 2], [27, 2], [30, 1.5], [30, 2], [36, 2], [36, 3], [42, 2], [42, 3], [48, 2], [48, 3]
  ];

  /** Dati di un filetto metrico ISO (profilo base, valori teorici). */
  function filetto(d, p) {
    const H = 0.866025 * p;
    return {
      d, p,
      preforo: d - p,                       // preforo per maschio a taglio (uso comune)
      nocciolo: d - 1.082532 * p,           // D1 diametro minimo madrevite
      nocciolo_vite: d - 1.226869 * p,      // d3 diametro di nocciolo della vite
      medio: d - 0.649519 * p,              // d2
      hEsterno: 0.613343 * p,               // profondita radiale vite (tornitura)
      hInterno: 0.541266 * p,               // profondita radiale madrevite (tornitura)
      H
    };
  }

  /** Profondita radiali cumulate di filettatura, passate a sezione costante (la prima piu profonda). */
  function passateFiletto(h, n) {
    const out = [];
    for (let i = 1; i <= n; i++) out.push(h * Math.sqrt(i / n));
    return out;
  }

  // ----- tolleranze ISO 286 (fino a 500 mm) -----
  const LIMITI = [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500];
  const IT = {
    5: [4, 5, 6, 8, 9, 11, 13, 15, 18, 20, 23, 25, 27],
    6: [6, 8, 9, 11, 13, 16, 19, 22, 25, 29, 32, 36, 40],
    7: [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57, 63],
    8: [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89, 97],
    9: [25, 30, 36, 43, 52, 62, 74, 87, 100, 115, 130, 140, 155],
    10: [40, 48, 58, 70, 84, 100, 120, 140, 160, 185, 210, 230, 250],
    11: [60, 75, 90, 110, 130, 160, 190, 220, 250, 290, 320, 360, 400]
  };
  // scostamento superiore degli alberi d..h (micrometri)
  const ES_ALBERO = {
    d: [-20, -30, -40, -50, -65, -80, -100, -120, -145, -170, -190, -210, -230],
    e: [-14, -20, -25, -32, -40, -50, -60, -72, -85, -100, -110, -125, -135],
    f: [-6, -10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68],
    g: [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20],
    h: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };
  // scostamento inferiore degli alberi k..p (micrometri)
  const EI_ALBERO = {
    k: [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5],     // solo gradi da 4 a 7, altrimenti 0
    m: [2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21, 23],
    n: [4, 8, 10, 12, 15, 17, 20, 23, 27, 31, 34, 37, 40],
    p: [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68]
  };

  const CAMPI_FORI = ['D', 'E', 'F', 'G', 'H', 'JS'];
  const CAMPI_ALBERI = ['d', 'e', 'f', 'g', 'h', 'js', 'k', 'm', 'n', 'p'];

  /**
   * Scostamenti di una tolleranza ISO, es. tolleranza(25,'H7') -> {sup:21, inf:0} in micrometri.
   * Restituisce {errore} se il campo o il diametro non sono nella tabella.
   */
  function tolleranza(d, campo) {
    const m = /^(js|JS|[a-zA-Z])(\d{1,2})$/.exec(String(campo || '').trim());
    if (!m) return { errore: 'Scrivi il campo come H7, g6, js6...' };
    const lettera = m[1], grado = Number(m[2]);
    if (!(d > 0) || d > 500) return { errore: 'Diametro da 0 a 500 mm.' };
    if (!IT[grado]) return { errore: 'Gradi disponibili: da IT5 a IT11.' };
    const i = LIMITI.findIndex(l => d <= l);
    const it = IT[grado][i];
    const foro = lettera === lettera.toUpperCase() && lettera !== lettera.toLowerCase();
    const l = lettera.toLowerCase();
    let sup, inf;
    if (l === 'js') { sup = it / 2; inf = -it / 2; }
    else if (ES_ALBERO[l]) {
      const es = ES_ALBERO[l][i];
      if (foro) { inf = -es; sup = inf + it; } else { sup = es; inf = es - it; }
    } else if (EI_ALBERO[l] && !foro) {
      const ei = l === 'k' && (grado < 4 || grado > 7) ? 0 : EI_ALBERO[l][i];
      inf = ei; sup = ei + it;
    } else {
      return { errore: 'Campi disponibili: fori ' + CAMPI_FORI.join(' ') + ', alberi ' + CAMPI_ALBERI.join(' ') + '.' };
    }
    sup += 0; inf += 0;   // niente -0
    return { sup, inf, it, foro, max: d + sup / 1000, min: d + inf / 1000 };
  }

  // ----- geometria -----
  /** Cono: semiangolo in gradi da diametro maggiore, minore e lunghezza. */
  function cono(dMax, dMin, l) {
    const a = Math.atan((dMax - dMin) / (2 * l)) * 180 / Math.PI;
    return { semiangolo: a, angolo: 2 * a, rapporto: (dMax - dMin) / l };
  }

  /** Fori su circonferenza: coordinate X Y (centro 0,0). */
  function foriSuCerchio(diametro, n, angoloInizio) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = (angoloInizio + k * 360 / n) * Math.PI / 180;
      out.push({ n: k + 1, x: diametro / 2 * Math.cos(a), y: diametro / 2 * Math.sin(a) });
    }
    return out;
  }

  /** Classe di rugosita N da Ra in micrometri. */
  function rugositaN(ra) {
    const classi = [[.025, 'N1'], [.05, 'N2'], [.1, 'N3'], [.2, 'N4'], [.4, 'N5'], [.8, 'N6'], [1.6, 'N7'], [3.2, 'N8'],
      [6.3, 'N9'], [12.5, 'N10'], [25, 'N11'], [50, 'N12']];
    for (const c of classi) if (ra <= c[0] + 1e-9) return c[1];
    return 'oltre N12';
  }

  // ----- G-code tornio (ISO, diametri in X, avanzamento al giro) -----
  /** Numero per il G-code: sempre con il punto, al massimo 3 decimali. */
  function gc(x) {
    let s = (Math.round(x * 1000) / 1000).toFixed(3).replace(/0+$/, '');
    if (s === '-0.') s = '0.';
    return s;
  }
  const pad2 = t => String(Math.max(0, Math.round(t))).padStart(2, '0');

  /**
   * Genera un programma per tornio.
   * c = impostazioni comuni {num, nome, t, vc, nmax, f, codLimite:'G50'|'G92', codFiletto:'G32'|'G33', refrig}
   * op = 'sgrossatura' | 'sfacciatura' | 'gola' | 'filetto'
   * Ritorna {righe, percorso:[{x,z,rapido}], grezzo:{d,l}, avvisi, errore}
   */
  function gcodeTornio(op, c) {
    const R = [], P = [], avvisi = [];
    let x0 = 0, z0 = 0;
    const va = (x, z, rapido, extra) => {
      const parti = [rapido ? 'G0' : 'G1'];
      if (x !== null && x !== x0) parti.push('X' + gc(x));
      if (z !== null && z !== z0) parti.push('Z' + gc(z));
      if (extra) parti.push(extra);
      if (parti.length === 1) return;
      R.push(parti.join(' '));
      P.push({ x0, z0, x: x === null ? x0 : x, z: z === null ? z0 : z, rapido });
      if (x !== null) x0 = x;
      if (z !== null) z0 = z;
    };
    const err = e => ({ errore: e, righe: [], percorso: [], avvisi: [] });
    const pos = v => v > 0;
    if (!pos(c.dg)) return err('Diametro del grezzo mancante.');
    if (!pos(c.nmax)) return err('Giri massimi mancanti.');

    const sic = c.dg + 2;             // diametro di sicurezza
    const zSic = 2;
    R.push('%');
    R.push('O' + String(Math.max(1, Math.round(c.num || 1))).padStart(4, '0') + ' (' + String(c.nome || op).toUpperCase().replace(/[()]/g, '') + ')');
    R.push('(CONTROLLARE IL PROGRAMMA PRIMA DI LAVORARE)');
    R.push('G21 G18 G40 G99');
    R.push('T' + pad2(c.t || 1) + pad2(c.t || 1));
    const refrig = c.refrig === false ? '' : ' M8';

    /** Esegue fn tenendo il percorso ma togliendo le righe: per mostrare i cicli fissi nell'anteprima. */
    const soloPercorso = fn => { const k = R.length; fn(); R.length = k; };
    /** Un tratto di profilo (in Z e raggio) come riga G1/G2/G3 con il percorso spezzato. */
    const tratto = (t, extraPrimo) => {
      if (t.tipo === 'L') { va(t.q.b * 2, t.q.a, false, extraPrimo); return; }
      R.push((t.cw ? 'G2' : 'G3') + ' X' + gc(t.q.b * 2) + ' Z' + gc(t.q.a) + ' R' + gc(t.r) + (extraPrimo ? ' ' + extraPrimo : ''));
      const a0 = Math.atan2(t.p.b - t.c.b, t.p.a - t.c.a), a1 = Math.atan2(t.q.b - t.c.b, t.q.a - t.c.a), rr = Math.hypot(t.p.a - t.c.a, t.p.b - t.c.b);
      let d = a1 - a0;
      if (t.cw) { while (d > 1e-9) d -= 2 * Math.PI; } else { while (d < -1e-9) d += 2 * Math.PI; }
      const k = Math.max(4, Math.ceil(Math.abs(d) * rr / 0.5));
      for (let i = 1; i <= k; i++) {
        const an = a0 + d * i / k, nz = i === k ? t.q.a : t.c.a + rr * Math.cos(an), nx = i === k ? t.q.b * 2 : 2 * (t.c.b + rr * Math.sin(an));
        P.push({ x0, z0, x: nx, z: nz, rapido: false }); x0 = nx; z0 = nz;
      }
    };
    /** Sgrossatura e finitura di un profilo esterno (a passate o con i cicli G71/G70). */
    const profiloEsterno = (punti, o) => {
      if (!Officina.trattiTornio) return 'Profili non disponibili.';
      const g = Officina.trattiTornio(punti);
      if (g.errore) return g.errore;
      avvisi.push(...g.avvisi);
      const tr = g.tratti, p0 = tr[0].p, zIn = p0.a + 2, ff = pos(o.ff) ? o.ff : c.f / 2;
      const ultimo = tr[tr.length - 1].q;
      if (ultimo.b * 2 > o.dg + 1e-6) return 'Il profilo esce dal grezzo (D' + gc(ultimo.b * 2) + ' oltre D' + gc(o.dg) + ').';
      const poli = Officina.polilineaProfilo(tr, 0.3);
      const sg = Officina.sgrossaTornio(poli, o.dg, o.ap, o.sx || 0, o.sz || 0, zIn, p0.a + (o.sz || 0));
      if (!sg.monotono) avvisi.push('ATTENZIONE: il profilo ha gole o sottosquadri: la sgrossatura non li scava e la finitura li farebbe in una passata sola. Toglili dal profilo e fai la gola a parte.');
      const corpo = () => {
        sg.passate.forEach(pa => {
          va(pa.x, null, true);
          va(null, pa.z1, false, 'F' + gc(c.f));
          va(pa.x + 1, pa.z1 + 0.5, false);
          va(null, zIn, true);
        });
        // passata sul profilo con il sovrametallo, per togliere gli scalini
        if (sg.passate.length && ((o.sx || 0) > 0 || (o.sz || 0) > 0)) {
          const sp = poli.map(q => ({ x: 2 * (q.b + (o.sx || 0) / 2), z: q.a + (o.sz || 0) }));
          va(sp[0].x, zIn, true);
          sp.forEach(q => va(q.x, Math.min(q.z, zIn), false));
          va(o.dg + 2, null, false);
          va(null, zIn, true);
        }
      };
      const fin = () => {
        va(p0.b * 2, zIn, true);
        va(null, p0.a, false, 'F' + gc(ff));
        R[R.length - 1] = R[R.length - 1].replace(/^G1/, 'G1 G42');
        tr.forEach(t => tratto(t));
        if (ultimo.b * 2 < o.dg + 2) va(o.dg + 2, null, false);
        R.push('G40'); va(null, zIn, true);
      };
      if (o.metodo === 'ciclo') {
        soloPercorso(() => { corpo(); if (o.finitura) fin(); });
        R.push('G71 U' + gc(o.ap) + ' R0.5');
        R.push('G71 P100 Q200 U' + gc(o.sx || 0) + ' W' + gc(o.sz || 0) + ' F' + gc(c.f));
        R.push('N100 G0 G42 X' + gc(p0.b * 2));
        R.push('G1 Z' + gc(p0.a) + ' F' + gc(ff));
        tr.forEach(t => R.push(t.tipo === 'L' ? 'G1 X' + gc(t.q.b * 2) + ' Z' + gc(t.q.a) : (t.cw ? 'G2' : 'G3') + ' X' + gc(t.q.b * 2) + ' Z' + gc(t.q.a) + ' R' + gc(t.r)));
        R.push('N200 G1 X' + gc(o.dg + 2));
        if (o.finitura) R.push('G70 P100 Q200');
        R.push('G40');
        x0 = o.dg + 2; z0 = zIn;
        avvisi.push('Cicli fissi G71 (sgrossatura) e G70 (finitura) con il profilo da N100 a N200.');
      } else { corpo(); if (o.finitura) { R.push('(FINITURA)'); fin(); } }
      avvisi.push(sg.passate.length + ' passate di sgrossatura. Finitura con G42: nel correttore il raggio della punta e il suo quadrante.');
      return null;
    };
    const avvioG96 = () => {
      R.push((c.codLimite || 'G50') + ' S' + Math.round(c.nmax));
      R.push('G96 S' + Math.round(c.vc) + ' M3');
    };
    x0 = NaN; z0 = NaN;

    if (op === 'sgrossatura') {
      const { dg, df, l, ap, sx = 0, sz = 0, smusso = 0 } = c;
      if (!pos(df) || df >= dg) return err('Il diametro finito deve essere minore del grezzo.');
      if (!pos(l)) return err('Lunghezza mancante.');
      if (!pos(ap)) return err('Profondita di passata mancante.');
      if (!pos(c.vc) || !pos(c.f)) return err('Velocita di taglio e avanzamento mancanti.');
      if (c.metodo === 'ciclo') {
        avvioG96();
        va(sic, 2, true, refrig.trim());
        const pt = smusso > 0 ? [{ x: df - 2 * smusso, z: 0 }, { x: df, z: -smusso }] : [{ x: df, z: 0 }];
        pt.push({ x: df, z: -l }, { x: dg, z: -l });
        const e = profiloEsterno(pt, { dg, ap, sx, sz, ff: c.ff, finitura: c.finitura, metodo: 'ciclo' });
        if (e) return err(e);
      } else {
      avvioG96();
      va(sic, zSic, true, refrig.trim());
      const xFin = df + sx, zFin = -(l - sz);
      let x = dg, passate = 0;
      while (x > xFin + 1e-9 && passate < 500) {
        x = Math.max(x - 2 * ap, xFin);
        va(x, null, true);
        va(null, zFin, false, 'F' + gc(c.f));
        va(x + 1, null, false);
        va(null, zSic, true);
        passate++;
      }
      if (c.finitura) {
        const ff = pos(c.ff) ? c.ff : c.f / 2;
        R.push('(FINITURA)');
        if (pos(c.tf) && c.tf !== c.t) {
          va(c.xCambio || sic + 20, c.zCambio || 50, true);
          R.push('T' + pad2(c.tf) + pad2(c.tf));
        }
        if (pos(c.vcf)) R.push('G96 S' + Math.round(c.vcf) + ' M3');
        if (smusso > 0) {
          va(df - 2 * smusso - 2, 1, true);
          va(df, -smusso, false, 'F' + gc(ff));
        } else {
          va(df, 1, true);
          va(null, 0, false, 'F' + gc(ff));
        }
        va(null, -l, false);
        va(dg + 1, null, false);
        va(sic, null, true);
        va(null, zSic, true);
        if (df - 2 * smusso - 2 < 0) avvisi.push('Smusso troppo grande per il diametro.');
      }
      avvisi.push(passate + ' passate di sgrossatura.');
      avvisi.push('Senza compensazione del raggio della punta: su smussi e coni la quota esce spostata del raggio.');
      }
    } else if (op === 'sfacciatura') {
      const { dg, s, ap } = c;
      if (!pos(s) || !pos(ap)) return err('Sovrametallo e profondita mancanti.');
      if (!pos(c.vc) || !pos(c.f)) return err('Velocita di taglio e avanzamento mancanti.');
      avvioG96();
      va(sic, s + 1, true, refrig.trim());
      let z = s, passate = 0;
      while (z > 1e-9 && passate < 500) {
        z = Math.max(z - ap, 0);
        va(null, z, true);
        va(-0.8, null, false, 'F' + gc(c.f));
        va(null, z + 1, true);
        va(sic, null, true);
        passate++;
      }
      avvisi.push(passate + ' passate fino a Z0, la punta supera il centro di 0.4 mm.');
    } else if (op === 'gola') {
      const { dg, dfondo, zg, b, w } = c;
      if (!pos(dfondo) || dfondo >= dg) return err('Il diametro del fondo deve essere minore del grezzo.');
      if (!pos(b) || !pos(w)) return err('Larghezza della gola e dell\'utensile mancanti.');
      if (w > b + 1e-9) return err('L\'utensile e piu largo della gola.');
      if (!pos(c.vc) || !pos(c.f)) return err('Velocita di taglio e avanzamento mancanti.');
      if (zg > 0) return err('La Z della gola deve essere 0 o negativa.');
      avvioG96();
      va(dg + 1, zSic, true, refrig.trim());
      const passo = 0.8 * w, zUltima = zg - (b - w);
      const zz = [];
      for (let z = zg; z > zUltima + 1e-9; z -= passo) zz.push(z);
      zz.push(zUltima);
      const affonda = () => { for (const z of zz) { va(null, z, true); va(dfondo, null, false, 'F' + gc(c.f)); va(dg + 1, null, true); } };
      if (c.metodo === 'ciclo') {
        va(null, zg, true);
        soloPercorso(affonda);
        R.push('G75 R0.5');
        R.push('G75 X' + gc(dfondo) + ' Z' + gc(zUltima) + ' P' + Math.round((pos(c.q) ? c.q : (dg - dfondo) / 2) * 1000) + ' Q' + Math.round(passo * 1000) + ' F' + gc(c.f));
        avvisi.push('Ciclo fisso G75 (P e Q in millesimi di mm).');
      } else affonda();
      va(sic, null, true);
      va(null, zSic, true);
      avvisi.push(zz.length + ' affondamenti. Z riferita al fianco DESTRO dell\'utensile.');
    } else if (op === 'filetto') {
      const { d, p, l, n } = c;
      if (!pos(d) || !pos(p) || !pos(l)) return err('Diametro, passo e lunghezza mancanti.');
      const np = Math.max(1, Math.round(n || 6));
      const giriF = Math.round(c.giri || 0);
      if (!pos(giriF)) return err('Giri al minuto mancanti.');
      if (giriF > c.nmax) return err('I giri superano il massimo impostato.');
      const trap = c.tipoFil === 'trapezio';
      const h = trap ? 0.5 * p + (p <= 1.5 ? 0.15 : p <= 5 ? 0.25 : p <= 12 ? 0.5 : 1) : 0.613343 * p;
      const d2 = pos(c.d2) ? c.d2 : d;            // diametro alla fine: diverso = filetto conico
      const zA = Math.max(3 * p, 3);
      const dIn = d - (d2 - d) * zA / l;          // diametro allungato fino al punto di partenza
      R.push('G97 S' + giriF + ' M3');
      va(Math.max(dIn, d2) + 2, zA, true, refrig.trim());
      const prof = passateFiletto(h, np);
      prof.push(h);   // passata a vuoto
      const passate = () => prof.forEach((pr, i) => {
        if (i === np) R.push('(PASSATA A VUOTO)');
        va(dIn - 2 * pr, null, true);
        va(d2 - 2 * pr, -l, false, 'F' + gc(p));
        R[R.length - 1] = R[R.length - 1].replace(/^G1/, c.codFiletto || 'G32');
        va(Math.max(dIn, d2) + 2, null, true);
        va(null, zA, true);
      });
      if (c.metodo === 'ciclo') {
        soloPercorso(passate);
        const conico = Math.abs(d2 - d) > 1e-9;
        R.push('G76 P01' + '00' + (trap ? '30' : '60') + ' Q50 R0.02');
        R.push('G76 X' + gc(d2 - 2 * h) + ' Z' + gc(-l) + (conico ? ' R' + gc((dIn - d2) / 2) : '') + ' P' + Math.round(h * 1000) + ' Q' + Math.round(h / Math.sqrt(np) * 1000) + ' F' + gc(p));
        avvisi.push('Ciclo fisso G76 (P e Q in millesimi di mm, una passata di finitura, angolo ' + (trap ? 30 : 60) + '°).');
      } else passate();
      avvisi.push((trap ? 'Trapezio' : 'Metrico') + (Math.abs(d2 - d) > 1e-9 ? ' conico (D' + gc(d) + ' a Z0, D' + gc(d2) + ' a Z' + gc(-l) + ')' : '') + ': profondita radiale ' + gc(h) + ' mm in ' + np + ' passate + 1 a vuoto.');
      if (trap) avvisi.push('Trapezio: inserto con il profilo a 30°, passate leggere; con passi grandi meglio l\'entrata sul fianco.');
      avvisi.push('Lascia una gola di scarico o tieni conto della rampa di uscita del filetto.');
    } else if (op === 'interna') {
      const { dp, di, l, ap, sx = 0, sz = 0, smusso = 0 } = c;
      if (!pos(dp) || !pos(di) || di <= dp) return err('Il diametro finito deve essere maggiore del preforo.');
      if (!pos(l) || !pos(ap)) return err('Lunghezza e profondita di passata mancanti.');
      if (!pos(c.vc) || !pos(c.f)) return err('Velocita di taglio e avanzamento mancanti.');
      avvioG96();
      const dentro = Math.max(dp - 1, 0);
      va(dentro, zSic, true, refrig.trim());
      const xFin = di - sx, zFin = -(l - sz);
      let x = dp, passate = 0;
      while (x < xFin - 1e-9 && passate < 500) {
        const xPrec = x;
        x = Math.min(x + 2 * ap, xFin);
        va(x, null, true);
        va(null, zFin, false, 'F' + gc(c.f));
        va(x - Math.min(1, x - xPrec), null, false);
        va(null, zSic, true);
        va(dentro, null, true);
        passate++;
      }
      if (c.finitura) {
        const ff = pos(c.ff) ? c.ff : c.f / 2;
        R.push('(FINITURA)');
        if (smusso > 0) {
          va(di + 2 * smusso + 2, 1, true);
          va(di, -smusso, false, 'F' + gc(ff));
        } else {
          va(di, 1, true);
          va(null, 0, false, 'F' + gc(ff));
        }
        va(null, -l, false);
        va(dentro, null, false);
        va(null, zSic, true);
      }
      avvisi.push(passate + ' passate interne. Controlla che il bareno entri nel preforo e che lo stelo non tocchi.');
    } else if (op === 'foratura') {
      const { dpunta, prof, q } = c;
      if (!pos(dpunta) || !pos(prof)) return err('Diametro della punta e profondita mancanti.');
      if (!pos(c.f)) return err('Avanzamento mancante.');
      const giriF = Math.round(c.giri || 0);
      if (!pos(giriF)) return err('Giri al minuto mancanti.');
      if (giriF > c.nmax) return err('I giri superano il massimo impostato.');
      R.push('G97 S' + giriF + ' M3');
      va(0, zSic, true, refrig.trim());
      const passo = pos(q) ? q : prof;
      let beccate = 0;
      const fora = () => {
        let z = 0; beccate = 0;
        while (z > -prof + 1e-9 && beccate < 500) {
          const zN = Math.max(z - passo, -prof);
          if (z < 0) va(null, z + 0.5, true);
          va(null, zN, false, 'F' + gc(c.f));
          va(null, zSic, true);
          z = zN; beccate++;
        }
      };
      if (c.metodo === 'ciclo') {
        soloPercorso(fora);
        R.push('G74 R0.5');
        R.push('G74 Z' + gc(-prof) + ' Q' + Math.round(passo * 1000) + ' F' + gc(c.f));
        avvisi.push('Ciclo fisso G74 (Q in millesimi di mm).');
      } else fora();
      avvisi.push(beccate + ' beccate fino a Z' + gc(-prof) + ' (profondita della punta, cono compreso).');
    } else if (op === 'filettoInt') {
      const { d, p, l, n } = c;
      if (!pos(d) || !pos(p) || !pos(l)) return err('Diametro, passo e lunghezza mancanti.');
      const np = Math.max(1, Math.round(n || 6));
      const giriF = Math.round(c.giri || 0);
      if (!pos(giriF)) return err('Giri al minuto mancanti.');
      if (giriF > c.nmax) return err('I giri superano il massimo impostato.');
      const h = 0.541266 * p, d1 = d - 1.082532 * p, dentro = d1 - 1;
      if (dentro <= 0) return err('Diametro troppo piccolo per filettare all\'interno.');
      R.push('G97 S' + giriF + ' M3');
      const zA = Math.max(3 * p, 3);
      va(dentro, zA, true, refrig.trim());
      const prof = passateFiletto(h, np);
      prof.push(h);
      prof.forEach((pr, i) => {
        if (i === np) R.push('(PASSATA A VUOTO)');
        va(d1 + 2 * pr, null, true);
        va(null, -l, false, 'F' + gc(p));
        R[R.length - 1] = R[R.length - 1].replace(/^G1/, c.codFiletto || 'G32');
        va(dentro, null, true);
        va(null, zA, true);
      });
      avvisi.push('Si parte dal nocciolo D1 ' + gc(d1) + ' fino al diametro ' + gc(d) + ', ' + np + ' passate + 1 a vuoto.');
    } else if (op === 'profilo') {
      if (!pos(c.ap)) return err('Profondita di passata mancante.');
      if (!pos(c.vc) || !pos(c.f)) return err('Velocita di taglio e avanzamento mancanti.');
      if (!Array.isArray(c.punti) || c.punti.length < 2) return err('Scrivi almeno due punti del profilo.');
      avvioG96();
      va(sic, Number(c.punti[0].z) + 2, true, refrig.trim());
      const e = profiloEsterno(c.punti, { dg: c.dg, ap: c.ap, sx: c.sx, sz: c.sz, ff: c.ff, finitura: c.finitura, metodo: c.metodo });
      if (e) return err(e);
    } else if (op === 'troncatura') {
      const { dg, zt, w } = c;
      const dfin = pos(c.dfin) ? c.dfin : 0;
      if (!pos(w)) return err('Larghezza della lama mancante.');
      if (!(zt <= 0)) return err('La Z del taglio deve essere 0 o negativa.');
      if (dfin >= dg) return err('Il diametro finale deve essere minore del grezzo.');
      if (!pos(c.vc) || !pos(c.f)) return err('Velocita di taglio e avanzamento mancanti.');
      avvioG96();
      va(dg + 2, zSic, true, refrig.trim());
      va(null, zt, true);
      const q = pos(c.q) ? c.q : 3;
      const fine = dfin > 0 ? dfin : -1;
      let x = dg + 1, k = 0;
      va(x, null, true);
      while (x > fine + 1e-9 && k++ < 1000) {
        const xn = Math.max(x - 2 * q, fine);
        va(xn, null, false, 'F' + gc(c.f));
        if (xn > fine + 1e-9) { va(xn + 1, null, true); va(xn, null, true); }
        x = xn;
      }
      va(dg + 2, null, true);
      va(null, zSic, true);
      avvisi.push('Troncatura a Z' + gc(zt) + ' (fianco DESTRO della lama), beccate di ' + gc(q) + ' mm sul raggio fino a ' + (dfin > 0 ? 'D' + gc(dfin) : 'oltre il centro') + '. Vicino al centro i giri arrivano al massimo: tieni basso il limite.');
    } else {
      return err('Lavorazione sconosciuta.');
    }

    const xC = pos(c.xCambio) ? c.xCambio : sic + 20, zC = pos(c.zCambio) ? c.zCambio : 50;
    va(xC, zC, true);
    R.push('M9');
    R.push('M5');
    R.push('M30');
    R.push('%');
    return { righe: R, percorso: P.filter(s => !isNaN(s.x0) && !isNaN(s.z0)), avvisi };
  }

  const Officina = {
    num, MATERIALI, UTENSILI, datiTaglio, leggiMateriali, peso, triangolo, giri, vcDaGiri, fzPerDiametro, fresatura, tornitura, foratura,
    FILETTI_GROSSI, FILETTI_FINI, filetto, passateFiletto,
    tolleranza, CAMPI_FORI, CAMPI_ALBERI, LIMITI, IT,
    cono, foriSuCerchio, rugositaN, gc, gcodeTornio
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Officina;
  else radice.Officina = Officina;
})(typeof self !== 'undefined' ? self : this);
