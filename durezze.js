// ===== Hich-Officina: durezze (conversioni per acciai) ed equivalenze dei materiali =====
// Valori INDICATIVI: le conversioni valgono per acciai non legati e basso legati e sono arrotondate; le equivalenze tra norme
// sono "piu vicine", non identiche. Per un lavoro serio vale il certificato del materiale.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;

  // [HRC, HV, HB (10 mm, 3000 kgf)]; HB vale fino a 50 HRC
  const TAB = [[20, 238, 226], [25, 266, 253], [30, 302, 286], [35, 345, 327], [40, 392, 371], [45, 446, 421], [50, 513, 481], [55, 595, null], [60, 697, null], [65, 832, null]];

  const interpola = (pts, x) => {   // pts ordinati per x crescente: [[x, y], ...]; fuori campo: null
    if (!pts.length || x < pts[0][0] - 1e-9 || x > pts[pts.length - 1][0] + 1e-9) return null;
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0] + 1e-9) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
    return pts[pts.length - 1][1];
  };
  /**
   * Converte una durezza. scala: 'HRC' | 'HV' | 'HB'. Ritorna {HRC, HV, HB, Rm} (null dove non vale) oppure {errore}.
   * Rm e la resistenza a trazione approssimata in MPa (3,45 x HB), solo per acciai fino a circa 450 HB.
   */
  function convertiDurezza(scala, valore) {
    const v = Number(String(valore).replace(',', '.')), s = String(scala || '').toUpperCase();
    if (!isFinite(v) || !(v > 0)) return { errore: 'Scrivi un numero maggiore di zero.' };
    let hrc;
    const hrcHv = TAB.map(r => [r[0], r[1]]), hrcHb = TAB.filter(r => r[2] !== null).map(r => [r[0], r[2]]);
    if (s === 'HRC') hrc = v;
    else if (s === 'HV') hrc = interpola(hrcHv.map(([a, b]) => [b, a]), v);
    else if (s === 'HB') hrc = interpola(hrcHb.map(([a, b]) => [b, a]), v);
    else return { errore: 'Scala sconosciuta (HRC, HV o HB).' };
    if (hrc === null) return { errore: s === 'HRC' ? '' : 'Fuori campo: la tabella vale da 20 a 65 HRC (HV 238-832, HB 226-481).' };
    if (s === 'HRC' && (v < 20 || v > 65)) return { errore: 'Fuori campo: la tabella vale da 20 a 65 HRC.' };
    const HV = interpola(hrcHv, hrc), HB = interpola(hrcHb, hrc), r = x => (x === null ? null : Math.round(x));
    return { HRC: Math.round(hrc * 10) / 10, HV: r(HV), HB: r(HB), Rm: HB !== null && HB <= 450 ? Math.round(3.45 * HB / 5) * 5 : null };
  }

  // [famiglia, EN, numero materiale, AISI/SAE o altra sigla americana, nota]
  const EQUIV = [
    ['Acciaio da costruzione', 'S235JR', '1.0038', 'A36 (simile)', 'saldabile, uso generale'],
    ['Acciaio da costruzione', 'S355J2', '1.0577', 'A572 gr.50 (simile)', ''],
    ['Acciaio al carbonio', 'C22', '1.0402', '1020', ''],
    ['Acciaio al carbonio', 'C45', '1.0503', '1045', 'bonifica o normalizzato'],
    ['Acciaio automatico', '11SMn30', '1.0715', '1213', 'ottima truciolabilita'],
    ['Acciaio da bonifica', '42CrMo4', '1.7225', '4140', ''],
    ['Acciaio da bonifica', '34CrNiMo6', '1.6582', '4340 (simile)', ''],
    ['Acciaio da cementazione', '16MnCr5', '1.7131', '5115 (simile)', ''],
    ['Acciaio da cementazione', '20MnCr5', '1.7147', '5120 (simile)', ''],
    ['Acciaio per cuscinetti', '100Cr6', '1.3505', '52100', ''],
    ['Acciaio per utensili', 'X153CrMoV12', '1.2379', 'D2', 'temprato, duro da lavorare'],
    ['Acciaio per utensili', 'X40CrMoV5-1', '1.2344', 'H13', 'stampi'],
    ['Inox austenitico', 'X5CrNi18-10', '1.4301', '304', ''],
    ['Inox austenitico', 'X2CrNi19-11', '1.4306', '304L', ''],
    ['Inox austenitico', 'X5CrNiMo17-12-2', '1.4401', '316', ''],
    ['Inox austenitico', 'X2CrNiMo17-12-2', '1.4404', '316L', ''],
    ['Inox ferritico', 'X6Cr17', '1.4016', '430', ''],
    ['Inox martensitico', 'X20Cr13', '1.4021', '420', ''],
    ['Ghisa grigia', 'EN-GJL-250', '0.6025', 'classe 35 (simile)', ''],
    ['Ghisa sferoidale', 'EN-GJS-500-7', '0.7050', '80-55-06', ''],
    ['Alluminio', 'EN AW-6061 (AlMg1SiCu)', '3.3211', '6061', 'uso generale'],
    ['Alluminio', 'EN AW-6082 (AlSi1MgMn)', '3.2315', '6082', ''],
    ['Alluminio', 'EN AW-7075 (AlZn5,5MgCu)', '3.4365', '7075', 'alta resistenza'],
    ['Alluminio', 'EN AW-5083 (AlMg4,5Mn0,7)', '3.3547', '5083', 'marino, saldabile'],
    ['Ottone', 'CuZn39Pb3 (CW614N)', '2.0401', 'C38500 (simile)', 'automatico'],
    ['Titanio', 'Ti6Al4V', '3.7165', 'grado 5', '']
  ];
  const normalizza = t => String(t || '').toLowerCase().replace(/[\s.\-_(),]/g, '');
  /** Cerca per sigla EN, numero materiale, sigla americana, famiglia o nota. Ritorna le righe {famiglia, en, numero, usa, nota}. */
  function equivalenze(testo) {
    const q = normalizza(testo);
    return EQUIV.filter(r => !q || r.some(x => normalizza(x).indexOf(q) >= 0)).map(r => ({ famiglia: r[0], en: r[1], numero: r[2], usa: r[3], nota: r[4] }));
  }

  const Dur = { convertiDurezza, equivalenze, TABELLA_DUREZZE: TAB };
  Object.assign(O, Dur);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
