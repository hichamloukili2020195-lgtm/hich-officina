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

  // ----- funzioni d'officina: barra seno, ingranaggi, divisore, dilatazione, potenza, tempo -----
  /** Barra seno: altezza dei blocchetti per un angolo, o l'angolo da un'altezza. L = interasse dei rulli. */
  function barraSeno(L, angolo, altezza) {
    if (!(L > 0)) return null;
    if (angolo > 0 && angolo < 90) return { altezza: L * Math.sin(angolo * Math.PI / 180), angolo };
    if (altezza > 0 && altezza < L) return { altezza, angolo: Math.asin(altezza / L) * 180 / Math.PI };
    return null;
  }
  /** Ingranaggio cilindrico a denti dritti, profilo ad evolvente. Ritorna i diametri e le misure del dente (mm). */
  function ingranaggio(m, z, alfa) {
    if (!(m > 0) || !(z >= 6) || z !== Math.round(z)) return null;
    const a = (alfa > 0 ? alfa : 20) * Math.PI / 180;
    return { primitivo: m * z, esterno: m * (z + 2), fondo: m * (z - 2.5), passo: Math.PI * m, altezzaDente: 2.25 * m, testa: m, piede: 1.25 * m,
      base: m * z * Math.cos(a), spessoreDente: Math.PI * m / 2, passoBase: Math.PI * m * Math.cos(a), interasseCon: z2 => (z2 > 0 ? m * (z + z2) / 2 : NaN) };
  }
  /** Divisore semplice: giri di manovella per N divisioni, con rapporto r (es. 40). Ritorna {giri, frazione:[num, den]} o null. */
  function divisore(r, n) {
    if (!(r > 0) || !(n >= 2) || n !== Math.round(n) || r !== Math.round(r)) return null;
    let num = r, den = n;
    const mcd = (a, b) => (b ? mcd(b, a % b) : a), g = mcd(num, den);
    num /= g; den /= g;
    const interi = Math.floor(num / den), resto = num - interi * den;
    return { giri: r / n, interi, frazione: resto ? [resto, den] : null };
  }
  /** Dilatazione termica lineare: coefficienti in 1/K per i materiali comuni. */
  const DILATAZIONE = [['Acciaio', 11.5e-6], ['Inox austenitico', 16e-6], ['Ghisa', 10.5e-6], ['Alluminio', 23e-6], ['Ottone', 19e-6], ['Bronzo', 18e-6], ['Rame', 17e-6], ['Titanio', 8.6e-6], ['Plastica (nylon)', 80e-6]];
  function dilatazione(alfa, L, t1, t2) {
    if (!(alfa > 0) || !(L > 0) || !isFinite(t1) || !isFinite(t2)) return null;
    const d = alfa * L * (t2 - t1);
    return { delta: d * 1000, finale: L + d };   // delta in micrometri
  }
  /** Forza specifica di taglio indicativa (N/mm2) dal materiale. */
  function kcMateriale(m) {
    const t = ((m && m.g) || '') + ' ' + ((m && m.n) || '');
    if (/allumin/i.test(t)) return 800;
    if (/rame|ottone|bronzo/i.test(t)) return 1000;
    if (/superleghe|nichel/i.test(t)) return 3000;
    if (/temprat|utensili|420|1\.2379|X153/i.test(t)) return 3200;
    if (/duplex/i.test(t)) return 2800;
    if (/inox|AISI|17-4/i.test(t)) return 2400;
    if (/K12|ghisa/i.test(t)) return 1100;
    if (/legno|plastic/i.test(t)) return 400;
    return 2000;
  }
  /** Asportazione e potenza di fresatura: ap, ae (mm), vf (mm/min), kc (N/mm2), rendimento, giri. */
  function potenzaTaglio(ap, ae, vf, kc, eta, n) {
    if (!(ap > 0 && ae > 0 && vf > 0 && kc > 0)) return null;
    const q = ap * ae * vf / 1000;                                  // cm3/min
    const pc = ap * ae * vf * kc / 60e6;                            // kW al tagliente
    const e = eta > 0 && eta <= 1 ? eta : 0.8, pm = pc / e;          // kW al mandrino
    return { asportazione: q, potenzaTaglio: pc, potenzaMandrino: pm, coppia: n > 0 ? pm * 9550 / n : NaN };
  }
  /** Tempo di taglio (minuti) di un percorso di lunghezza L (mm) con avanzamento vf (mm/min), n passate. */
  function tempoTaglio(L, vf, passate) {
    if (!(L > 0) || !(vf > 0)) return null;
    const n = Math.max(1, Math.round(passate || 1));
    return { minuti: L * n / vf, passate: n };
  }

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
  // gradi di tolleranza normalizzati IT01..IT18 (ISO 286-1), in micrometri, per i 13 campi di diametro
  const IT = {
    '01': [0.3, 0.4, 0.4, 0.5, 0.6, 0.6, 0.8, 1, 1.2, 2, 2.5, 3, 4],
    '0': [0.5, 0.6, 0.6, 0.8, 1, 1, 1.2, 1.5, 2, 3, 4, 5, 6],
    '1': [0.8, 1, 1, 1.2, 1.5, 1.5, 2, 2.5, 3.5, 4.5, 6, 7, 8],
    '2': [1.2, 1.5, 1.5, 2, 2.5, 2.5, 3, 4, 5, 7, 8, 9, 10],
    '3': [2, 2.5, 2.5, 3, 4, 4, 5, 6, 8, 10, 12, 13, 15],
    '4': [3, 4, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20],
    '5': [4, 5, 6, 8, 9, 11, 13, 15, 18, 20, 23, 25, 27],
    '6': [6, 8, 9, 11, 13, 16, 19, 22, 25, 29, 32, 36, 40],
    '7': [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57, 63],
    '8': [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89, 97],
    '9': [25, 30, 36, 43, 52, 62, 74, 87, 100, 115, 130, 140, 155],
    '10': [40, 48, 58, 70, 84, 100, 120, 140, 160, 185, 210, 230, 250],
    '11': [60, 75, 90, 110, 130, 160, 190, 220, 250, 290, 320, 360, 400],
    '12': [100, 120, 150, 180, 210, 250, 300, 350, 400, 460, 520, 570, 630],
    '13': [140, 180, 220, 270, 330, 390, 460, 540, 630, 720, 810, 890, 970],
    '14': [250, 300, 360, 430, 520, 620, 740, 870, 1000, 1150, 1300, 1400, 1550],
    '15': [400, 480, 580, 700, 840, 1000, 1200, 1400, 1600, 1850, 2100, 2300, 2500],
    '16': [600, 750, 900, 1100, 1300, 1600, 1900, 2200, 2500, 2900, 3200, 3600, 4000],
    '17': [1000, 1200, 1500, 1800, 2100, 2500, 3000, 3500, 4000, 4600, 5200, 5700, 6300],
    '18': [1400, 1800, 2200, 2700, 3300, 3900, 4600, 5400, 6300, 7200, 8100, 8900, 9700]
  };
  const GRADI_IT = Object.keys(IT);
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
    const lettera = m[1], grado = Number(m[2]), chiave = m[2];
    if (!(d > 0) || d > 500) return { errore: 'Diametro da 0 a 500 mm.' };
    if (!IT[chiave]) return { errore: 'Gradi disponibili: da IT01 a IT18.' };
    const i = LIMITI.findIndex(l => d <= l);
    const it = IT[chiave][i];
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

  /**
   * Tolleranza scritta a mano: "H7", "g6", "±0,05", "+0,1 -0,05", "0/-0.02". Ritorna {sup, inf} in mm oppure {errore}.
   * (una sola funzione per tutta l'app: misure del pezzo, ciclo proposto, profilo disegnato)
   */
  function leggiTolleranza(nominale, testo) {
    const t = String(testo || '').trim().replace(/,/g, '.');
    if (!t) return { sup: 0, inf: 0 };
    if (/^(js|JS|[a-zA-Z])\d{1,2}$/.test(t)) {
      const r = tolleranza(nominale, t);
      return r.errore ? { errore: r.errore } : { sup: r.sup / 1000, inf: r.inf / 1000 };
    }
    let m = /^(?:±|\+\/?-|\+-)\s*(\d*\.?\d+)$/.exec(t);
    if (m) return { sup: Number(m[1]), inf: -Number(m[1]) };
    m = /^([+-]?\d*\.?\d+)\s*[/ ;]\s*([+-]?\d*\.?\d+)$/.exec(t);
    if (m) { const a = Number(m[1]), b = Number(m[2]); return { sup: Math.max(a, b), inf: Math.min(a, b) }; }
    return { errore: 'Tolleranza non capita: scrivi H7, ±0,05 oppure +0,1 -0,05' };
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

  /** Un valore numerico non valido (NaN, infinito, enorme) in un'impostazione: ritorna il nome del campo. */
  function campoNonValido(c) {
    for (const k in c) {
      const v = c[k];
      // un campo vuoto (NaN) e "non scritto": lo gestiscono i controlli dei dati mancanti; qui solo infiniti ed enormi
      if (typeof v === 'number' && !isNaN(v) && (!isFinite(v) || Math.abs(v) > 1e6)) return k;
    }
    return null;
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
    const tx = v => String(Math.round(v * 1000) / 1000).replace('.', ',');   // numeri nei messaggi
    { const k = campoNonValido(c); if (k) return err('Il valore di "' + k + '" non e valido (numero infinito, non numerico o enorme).'); }
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
      let passate = 0;
      const sfaccia = () => {
        let z = s;
        while (z > 1e-9 && passate < 500) {
          z = Math.max(z - ap, 0);
          va(null, z, true);
          va(-0.8, null, false, 'F' + gc(c.f));
          va(null, z + 1, true);
          va(sic, null, true);
          passate++;
        }
      };
      if (c.metodo === 'ciclo') {
        soloPercorso(sfaccia);
        R.push('G72 W' + gc(ap) + ' R0.5');
        R.push('G72 P100 Q200 U0 W0 F' + gc(c.f));
        R.push('N100 G0 Z0');
        R.push('N200 G1 X-0.8');
        x0 = sic; z0 = s + 1;
        avvisi.push('Ciclo fisso G72 (sgrossatura frontale) con la faccia da N100 a N200.');
      } else sfaccia();
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
    } else if (op === 'zigrinatura') {
      // zigrinatura a pressione: giri fissi bassi, l'utensile entra di mezza profondita del passo e scorre lungo il tratto
      const { d, za, zb } = c, pz = pos(c.pz) ? c.pz : 1;
      if (!pos(d)) return err('Diametro da zigrinare mancante.');
      if (!(za > zb)) return err('Il tratto da zigrinare ha lunghezza zero.');
      const giriZ = Math.round(c.giri || 0);
      if (!pos(giriZ)) return err('Giri al minuto mancanti.');
      if (giriZ > c.nmax) return err('I giri superano il massimo impostato.');
      const fz = pos(c.f) ? c.f : 0.15, dz = Math.round((d - 0.5 * pz) * 1000) / 1000;
      R.push('G97 S' + giriZ + ' M3');
      va(d + 2, za + 1, true, refrig.trim());
      va(dz, null, false, 'F0.05');
      va(null, zb, false, 'F' + gc(fz));
      va(d + 2, null, true);
      va(null, zSic, true);
      avvisi.push('Zigrinatura ' + (c.incrociata ? 'incrociata' : 'diritta') + ' passo ' + tx(pz) + ': entra a Ø' + tx(dz) + ' e scorre da Z' + tx(za) + ' a Z' + tx(zb) + '. Il diametro della zigrinatura cresce: tornisci il cilindro un po\' sotto misura e prova su un pezzo di scarto.');
    } else if (op === 'filetto') {
      const { d, p, l, n } = c;
      if (!pos(d) || !pos(p) || !pos(l)) return err('Diametro, passo e lunghezza mancanti.');
      const np = Math.max(1, Math.round(n || 6));
      const giriF = Math.round(c.giri || 0);
      if (!pos(giriF)) return err('Giri al minuto mancanti.');
      if (giriF > c.nmax) return err('I giri superano il massimo impostato.');
      const trap = c.tipoFil === 'trapezio';
      const h = pos(c.h) ? c.h : trap ? 0.5 * p + (p <= 1.5 ? 0.15 : p <= 5 ? 0.25 : p <= 12 ? 0.5 : 1) : 0.613343 * p;
      const ang = c.ang > 0 ? Math.round(c.ang) : trap ? 30 : 60;
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
        R.push('G76 P01' + '00' + String(ang).padStart(2, '0') + ' Q50 R0.02');
        R.push('G76 X' + gc(d2 - 2 * h) + ' Z' + gc(-l) + (conico ? ' R' + gc((dIn - d2) / 2) : '') + ' P' + Math.round(h * 1000) + ' Q' + Math.round(h / Math.sqrt(np) * 1000) + ' F' + gc(p));
        avvisi.push('Ciclo fisso G76 (P e Q in millesimi di mm, una passata di finitura, angolo ' + ang + '°).');
      } else passate();
      avvisi.push((c.nomeFil ? 'Filetto ' + c.nomeFil : trap ? 'Trapezio' : 'Metrico') + (Math.abs(d2 - d) > 1e-9 ? ' conico (D' + gc(d) + ' a Z0, D' + gc(d2) + ' a Z' + gc(-l) + ')' : '') + ': profondita radiale ' + gc(h) + ' mm in ' + np + ' passate + 1 a vuoto.');
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
    } else if (op === 'profiloInterno') {
      // profilo interno a tratti (dall'imbocco verso il fondo, diametri che non crescono): passate e finitura con G41
      const { dp, ap, sx = 0, sz = 0 } = c;
      if (!pos(dp) || !pos(ap)) return err('Foro di partenza e profondita di passata mancanti.');
      if (!pos(c.vc) || !pos(c.f)) return err('Velocita di taglio e avanzamento mancanti.');
      if (!Officina.trattiTornio) return err('Profili non disponibili.');
      const g = Officina.trattiTornio(c.punti || []);
      if (g.errore) return err(g.errore);
      const poli = Officina.polilineaProfilo(g.tratti, 0.3);
      avvioG96();
      const dentro = Math.max(dp - 1, 0);
      va(dentro, zSic, true, refrig.trim());
      const rMax = Math.max(...poli.map(q => q.b));
      let x = dp, passate = 0;
      while (x < 2 * rMax - sx - 1e-9 && passate < 500) {
        const xPrec = x;
        x = Math.min(x + 2 * ap, 2 * rMax - sx);
        // fin dove il profilo (meno il sovrametallo) e almeno largo come la passata
        const rp = x / 2 + sx / 2;
        let zF = poli[poli.length - 1].a;
        for (let i = 1; i < poli.length; i++) { const a = poli[i - 1], b = poli[i]; if (b.b < rp - 1e-9) { zF = Math.abs(b.b - a.b) > 1e-9 ? a.a + (b.a - a.a) * (rp - a.b) / (b.b - a.b) : a.a; break; } }
        zF = Math.min(zF + sz, -0.01);
        va(x, null, true);
        va(null, zF, false, 'F' + gc(c.f));
        va(x - Math.min(1, x - xPrec), null, false);
        va(null, zSic, true);
        va(dentro, null, true);
        passate++;
      }
      if (c.finitura) {
        const ff = pos(c.ff) ? c.ff : c.f / 2, p0 = g.tratti[0].p;
        R.push('(FINITURA)');
        va(p0.b * 2, zSic, true);
        va(null, p0.a, false, 'F' + gc(ff));
        R[R.length - 1] = R[R.length - 1].replace(/^G1/, 'G1 G41');
        g.tratti.forEach(t => tratto(t));
        va(dentro, null, false);
        R.push('G40'); va(null, zSic, true);
      }
      avvisi.push(passate + ' passate interne e finitura del profilo con G41. Controlla che il bareno entri nel foro e che lo stelo non tocchi il fondo.');
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
    } else if (op === 'centrino' || op === 'alesaturaAsse' || op === 'maschiatura') {
      // in asse: centrino, alesatore (entra e esce in lavoro), maschio (G32 avanti, M4, G32 indietro)
      const prof = c.prof, giriF = Math.round(c.giri || 0);
      if (!pos(prof)) return err('Profondita mancante.');
      if (!pos(giriF)) return err('Giri al minuto mancanti.');
      if (giriF > c.nmax) return err('I giri superano il massimo impostato.');
      const zA = op === 'maschiatura' ? Math.max(5, 3 * (c.p || 1)) : zSic;
      R.push('G97 S' + giriF + ' M3');
      va(0, zA, true, refrig.trim());
      if (op === 'maschiatura') {
        if (!pos(c.p)) return err('Passo del maschio mancante.');
        va(null, -prof, false, 'F' + gc(c.p));
        R[R.length - 1] = R[R.length - 1].replace(/^G1/, c.codFiletto || 'G32');
        R.push('M4');
        va(null, zA, false, 'F' + gc(c.p));
        R[R.length - 1] = R[R.length - 1].replace(/^G1/, c.codFiletto || 'G32');
        R.push('M3');
        avvisi.push('Maschio in asse con ' + (c.codFiletto || 'G32') + ' e inversione M4: serve un portamaschi compensato. Avanzamento = passo ' + tx(c.p) + ' mm/giro.');
      } else {
        if (!pos(c.f)) return err('Avanzamento mancante.');
        va(null, -prof, false, 'F' + gc(c.f));
        if (op === 'alesaturaAsse') { va(null, zSic, false); avvisi.push('Alesatore in asse: entra ed esce in lavoro.'); }
        else { R.push('G4 X0.3'); va(null, zSic, true); avvisi.push('Centrino a Z' + tx(-prof) + '.'); }
      }
      va(null, zSic, true);
    } else if (op === 'golaFrontale') {
      // gola sulla faccia: lama assiale, X sul diametro esterno della lama, Z sullo spigolo che tocca la faccia
      const { dInt, dEst, prof, w } = c;
      if (!pos(dInt) || !pos(dEst) || dEst <= dInt) return err('Il diametro esterno della gola deve essere maggiore di quello interno.');
      if (!pos(prof) || !pos(w)) return err('Profondita della gola e larghezza della lama mancanti.');
      if (dEst - dInt < 2 * w - 1e-9) return err('La lama (' + gc(w) + ' mm) e piu larga della gola (' + gc((dEst - dInt) / 2) + ' mm).');
      if (!pos(c.vc) || !pos(c.f)) return err('Velocita di taglio e avanzamento mancanti.');
      avvioG96();
      const xx = [], passo = 0.8 * w, xUlt = dInt + 2 * w;
      for (let x = dEst; x > xUlt + 1e-9; x -= 2 * passo) xx.push(x);
      xx.push(xUlt);
      const q = pos(c.q) ? c.q : 2;
      va(dEst, zSic, true, refrig.trim());
      const affonda = () => xx.forEach(x => {
        va(x, null, true);
        let z = 0, k = 0;
        while (z > -prof + 1e-9 && k++ < 200) { const zn = Math.max(z - q, -prof); if (z < 0) va(null, z + 0.3, true); va(null, zn, false, 'F' + gc(c.f)); va(null, 1, true); z = zn; }
      });
      if (c.metodo === 'ciclo') {
        va(null, 1, true);
        soloPercorso(affonda);
        R.push('G74 R0.5');
        R.push('G74 X' + gc(xUlt) + ' Z' + gc(-prof) + ' P' + Math.round(passo * 1000) + ' Q' + Math.round(q * 1000) + ' F' + gc(c.f));
        x0 = dEst; z0 = 1;
        avvisi.push('Ciclo fisso G74 per la gola frontale (P e Q in millesimi di mm).');
      } else affonda();
      va(null, zSic, true);
      avvisi.push('Gola frontale da Ø' + tx(dInt) + ' a Ø' + tx(dEst) + ', profonda ' + tx(prof) + ': ' + xx.length + ' affondamenti. Serve una lama per gole frontali con il raggio adatto ai diametri.');
    } else if (op === 'golaInterna') {
      // gola dentro il foro: si entra al diametro del foro, si affonda verso l'esterno
      const { dp, dfondo, zg, b, w } = c;
      if (!pos(dp) || !pos(dfondo) || dfondo <= dp) return err('Il fondo della gola interna deve essere piu grande del foro.');
      if (!pos(b) || !pos(w) || w > b + 1e-9) return err('Larghezza della gola e della lama non valide.');
      if (!(zg < 0)) return err('La gola interna deve stare dentro il foro (Z negativa).');
      if (!pos(c.vc) || !pos(c.f)) return err('Velocita di taglio e avanzamento mancanti.');
      avvioG96();
      const dentro = dp - 1, passo = 0.8 * w, zUlt = zg - (b - w), zz = [];
      for (let z = zg; z > zUlt + 1e-9; z -= passo) zz.push(z);
      zz.push(zUlt);
      va(dentro, zSic, true, refrig.trim());
      const affonda = () => zz.forEach(z => { va(null, z, true); va(dfondo, null, false, 'F' + gc(c.f)); va(dentro, null, true); });
      if (c.metodo === 'ciclo') {
        va(null, zg, true);
        soloPercorso(affonda);
        R.push('G75 R0.3');
        R.push('G75 X' + gc(dfondo) + ' Z' + gc(zUlt) + ' P' + Math.round((dfondo - dp) / 2 * 1000) + ' Q' + Math.round(passo * 1000) + ' F' + gc(c.f));
        x0 = dentro; z0 = zg;
        avvisi.push('Ciclo fisso G75 per la gola interna.');
      } else affonda();
      va(dentro, null, true);
      va(null, zSic, true);
      avvisi.push('Gola interna Ø' + tx(dfondo) + ' larga ' + tx(b) + ' a Z' + tx(zg) + ' (fianco DESTRO della lama). Controlla che la lama entri nel foro Ø' + tx(dp) + '.');
    } else if (op === 'filettoInt') {
      const { d, p, l, n } = c;
      if (!pos(d) || !pos(p) || !pos(l)) return err('Diametro, passo e lunghezza mancanti.');
      const np = Math.max(1, Math.round(n || 6));
      const giriF = Math.round(c.giri || 0);
      if (!pos(giriF)) return err('Giri al minuto mancanti.');
      if (giriF > c.nmax) return err('I giri superano il massimo impostato.');
      // h profondita radiale, d1 nocciolo all'imbocco; conico (Rc, NPT): d2 = diametro in fondo, piu piccolo
      const h = pos(c.h) ? c.h : 0.541266 * p, d1 = pos(c.d1) ? c.d1 : d - 1.082532 * p;
      const d2 = pos(c.d2) ? c.d2 : d, conico = Math.abs(d2 - d) > 1e-9;
      const zA = Math.max(3 * p, 3);
      const dIn = d + (d - d2) * zA / l;                  // diametro allungato fino al punto di partenza
      const nIn = d1 + (dIn - d), nFin = d1 - (d - d2);    // nocciolo all'inizio e in fondo
      const dentro = Math.min(nIn, nFin) - 1;
      if (dentro <= 0) return err('Diametro troppo piccolo per filettare all\'interno.');
      const ang = c.ang > 0 ? Math.round(c.ang) : 60;
      R.push('G97 S' + giriF + ' M3');
      va(dentro, zA, true, refrig.trim());
      const prof = passateFiletto(h, np);
      prof.push(h);
      const passate = () => prof.forEach((pr, i) => {
        if (i === np) R.push('(PASSATA A VUOTO)');
        va(nIn + 2 * pr, null, true);
        va(nFin + 2 * pr, -l, false, 'F' + gc(p));
        R[R.length - 1] = R[R.length - 1].replace(/^G1/, c.codFiletto || 'G32');
        va(dentro, null, true);
        va(null, zA, true);
      });
      if (c.metodo === 'ciclo') {
        soloPercorso(passate);
        R.push('G76 P01' + '00' + String(ang).padStart(2, '0') + ' Q50 R0.02');
        R.push('G76 X' + gc(d2) + ' Z' + gc(-l) + (conico ? ' R' + gc((nIn - nFin) / 2) : '') + ' P' + Math.round(h * 1000) + ' Q' + Math.round(h / Math.sqrt(np) * 1000) + ' F' + gc(p));
        avvisi.push('Ciclo fisso G76 interno (P e Q in millesimi di mm, angolo ' + ang + '°).');
      } else passate();
      avvisi.push((c.nomeFil ? 'Filetto interno ' + c.nomeFil + ': ' : '') + 'si parte dal nocciolo D1 ' + gc(d1) + ' fino al diametro ' + gc(d) + (conico ? ' (conico, Ø' + gc(d2) + ' in fondo)' : '') + ', ' + np + ' passate + 1 a vuoto.');
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
      // smusso sul pezzo che cade: prima una gola poco profonda, poi lo spigolo destro della lama fa lo smusso
      const cS = pos(c.smusso) ? c.smusso : 0, dS = pos(c.dSmusso) ? c.dSmusso : dg;
      if (cS > 0) {
        R.push('(SMUSSO ' + tx(cS) + ' SUL PEZZO)');
        va(dS - 2 * cS - 1, null, false, 'F' + gc(c.f));
        va(x, null, true);
        va(null, zt + cS, true);
        va(dS + 0.2, null, true);
        va(dS - 2 * cS, zt, false);
        va(x, null, true);
        va(null, zt, true);
        avvisi.push('Smusso ' + tx(cS) + 'x45° sul pezzo prima di troncare (con lo spigolo destro della lama).');
      }
      const tronca = () => {
        while (x > fine + 1e-9 && k++ < 1000) {
          const xn = Math.max(x - 2 * q, fine);
          va(xn, null, false, 'F' + gc(c.f));
          if (xn > fine + 1e-9) { va(xn + 1, null, true); va(xn, null, true); }
          x = xn;
        }
      };
      if (c.metodo === 'ciclo') {
        soloPercorso(tronca);
        R.push('G75 R0.5');
        R.push('G75 X' + gc(fine) + ' Z' + gc(zt) + ' P' + Math.round(q * 1000) + ' F' + gc(c.f));
        x0 = dg + 1; z0 = zt;
        avvisi.push('Ciclo fisso G75 per la troncatura (P in millesimi di mm).');
      } else tronca();
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
    leggiTolleranza, campoNonValido, num, MATERIALI, UTENSILI, datiTaglio, leggiMateriali, peso, triangolo, giri, vcDaGiri, fzPerDiametro, fresatura, tornitura, foratura,
    FILETTI_GROSSI, FILETTI_FINI, filetto, passateFiletto,
    tolleranza, CAMPI_FORI, CAMPI_ALBERI, LIMITI, IT, GRADI_IT, barraSeno, ingranaggio, divisore, DILATAZIONE, dilatazione, kcMateriale, potenzaTaglio, tempoTaglio,
    cono, foriSuCerchio, rugositaN, gc, gcodeTornio
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Officina;
  else radice.Officina = Officina;
})(typeof self !== 'undefined' ? self : this);
