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
  // vc fresa (m/min, metallo duro), fz (mm/dente per D10), dvc/dfn punta HSS-E (m/min, mm/giro per D10),
  // tvc maschio (m/min), lvc/lf tornitura con inserto (m/min, mm/giro in sgrossatura).
  const MATERIALI = [
    { n: 'Alluminio', g: 'Alluminio e leghe leggere', vc: 400, fz: .06, dvc: 90, dfn: .20, tvc: 25, lvc: 500, lf: .25, note: 'Lubrificazione abbondante o nebbia; utensili lucidati.' },
    { n: 'Ottone', g: 'Rame e leghe', vc: 300, fz: .06, dvc: 70, dfn: .18, tvc: 25, lvc: 300, lf: .20, note: 'A secco o con poca emulsione; punte con angolo di spoglia ridotto.' },
    { n: 'Bronzo', g: 'Rame e leghe', vc: 180, fz: .05, dvc: 40, dfn: .15, tvc: 15, lvc: 200, lf: .20, note: 'Bronzo all\'alluminio piu duro: scendi del 30%.' },
    { n: 'Ferro (Fe360)', g: 'Acciai al carbonio', vc: 200, fz: .06, dvc: 35, dfn: .18, tvc: 14, lvc: 250, lf: .30, note: 'Acciaio dolce: il truciolo si incolla, usa emulsione.' },
    { n: 'C40', g: 'Acciai al carbonio', vc: 170, fz: .05, dvc: 30, dfn: .15, tvc: 12, lvc: 220, lf: .25, note: 'Acciaio da bonifica non bonificato (circa 200 HB).' },
    { n: 'Bonificato (30-40 HRC)', g: 'Acciai al carbonio', vc: 110, fz: .04, dvc: 20, dfn: .12, tvc: 8, lvc: 160, lf: .20, note: 'Meno profondita, emulsione abbondante.' },
    { n: 'Temprato (45-55 HRC)', g: 'Acciai temprati', vc: 60, fz: .02, dvc: 8, dfn: .05, tvc: 3, lvc: 80, lf: .10, note: 'Solo metallo duro rivestito, passate leggere. Foratura e maschiatura sconsigliate.' },
    { n: 'AISI 303', g: 'Inox', vc: 150, fz: .05, dvc: 25, dfn: .15, tvc: 9, lvc: 200, lf: .20, note: 'Inox automatico (solforato).' },
    { n: 'AISI 304/304L', g: 'Inox', vc: 120, fz: .04, dvc: 15, dfn: .12, tvc: 6, lvc: 170, lf: .20, note: 'Si incrudisce: non fermare l\'utensile nel taglio e non strisciare.' },
    { n: 'AISI 316/316L', g: 'Inox', vc: 100, fz: .035, dvc: 12, dfn: .10, tvc: 5, lvc: 150, lf: .20, note: 'Piu duro da lavorare del 304.' },
    { n: 'AISI 420', g: 'Inox', vc: 130, fz: .04, dvc: 20, dfn: .12, tvc: 8, lvc: 180, lf: .20, note: 'Martensitico ricotto; se temprato usa "Temprato".' },
    { n: 'AISI 17-4 PH', g: 'Inox', vc: 85, fz: .035, dvc: 12, dfn: .10, tvc: 6, lvc: 130, lf: .15, note: 'Valori per stato solubilizzato.' },
    { n: 'Duplex', g: 'Inox duplex', vc: 70, fz: .03, dvc: 10, dfn: .08, tvc: 4, lvc: 100, lf: .15, note: 'Forze di taglio alte: attrezzatura rigida e refrigerazione abbondante.' },
    { n: 'Lega di nichel', g: 'Superleghe', vc: 30, fz: .02, dvc: 5, dfn: .05, tvc: 2, lvc: 50, lf: .12, note: 'Refrigerazione ad alta pressione, usura rapida.' },
    { n: 'Acciaio per utensili ricotto', g: 'Acciai per utensili', vc: 95, fz: .04, dvc: 14, dfn: .10, tvc: 7, lvc: 150, lf: .20, note: 'Circa 250 HB. Se temprato usa "Temprato".' },
    { n: 'Ghisa grigia', g: 'Ghise', vc: 180, fz: .07, dvc: 30, dfn: .20, tvc: 10, lvc: 220, lf: .30, note: 'A secco, aspirazione della polvere.' },
    { n: 'Plastica', g: 'Altri', vc: 300, fz: .1, dvc: 60, dfn: .20, tvc: 25, lvc: 300, lf: .20, note: 'Evita il surriscaldamento: aria compressa, utensili ben affilati.' }
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
      for (const z of zz) {
        va(null, z, true);
        va(dfondo, null, false, 'F' + gc(c.f));
        va(dg + 1, null, true);
      }
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
      const h = 0.613343 * p;
      R.push('G97 S' + giriF + ' M3');
      const zA = Math.max(3 * p, 3);
      va(d + 2, zA, true, refrig.trim());
      const prof = passateFiletto(h, np);
      prof.push(h);   // passata a vuoto
      prof.forEach((pr, i) => {
        if (i === np) R.push('(PASSATA A VUOTO)');
        va(d - 2 * pr, null, true);
        va(null, -l, false, 'F' + gc(p));
        R[R.length - 1] = R[R.length - 1].replace(/^G1/, c.codFiletto || 'G32');
        va(d + 2, null, true);
        va(null, zA, true);
      });
      avvisi.push('Profondita radiale ' + gc(h) + ' mm in ' + np + ' passate + 1 a vuoto. Diametro di fondo ' + gc(d - 2 * h) + '.');
      avvisi.push('Lascia una gola di scarico o tieni conto della rampa di uscita del filetto.');
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
    num, MATERIALI, giri, vcDaGiri, fzPerDiametro, fresatura, tornitura, foratura,
    FILETTI_GROSSI, FILETTI_FINI, filetto, passateFiletto,
    tolleranza, CAMPI_FORI, CAMPI_ALBERI, LIMITI, IT,
    cono, foriSuCerchio, rugositaN, gc, gcodeTornio
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Officina;
  else radice.Officina = Officina;
})(typeof self !== 'undefined' ? self : this);
