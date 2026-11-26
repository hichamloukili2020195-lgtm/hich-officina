// ===== Hich-Officina: tabelle dei filetti (metrici, unificati, gas, coniche, trapezi, Whitworth, Pg, ACME), senza interfaccia =====
// Le misure si calcolano dalle formule del profilo (non sono scritte a mano riga per riga): diametro nominale e passo
// vengono dalle norme, il resto si ricava. Sono valori teorici di base: per il lavoro vale la tabella del costruttore.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  const IN = 25.4;
  const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100, r3 = x => Math.round(x * 1000) / 1000;

  // Metrico/unificato D1 = D - 1,082532 P; d3 = D - 1,226869 P; Whitworth/gas d1 = D - 1,280654 P
  function misure60(d, p) { return { d: r3(d), p: r3(p), medio: r3(d - 0.649519 * p), nocciolo: r3(d - 1.082532 * p), noccioloVite: r3(d - 1.226869 * p), preforo: r2(d - p) }; }
  function misure55(d, p) { return { d: r3(d), p: r3(p), medio: r3(d - 0.640327 * p), nocciolo: r3(d - 1.280654 * p), noccioloVite: r3(d - 1.280654 * p), preforo: r1(d - 1.2 * p) }; }

  // ----- unificati (inch): [nome, diametro in pollici, filetti per pollice] -----
  const num = n => 0.060 + 0.013 * n;                 // diametro del numero (#n) in pollici
  const UNC = [['#1', num(1), 64], ['#2', num(2), 56], ['#3', num(3), 48], ['#4', num(4), 40], ['#5', num(5), 40], ['#6', num(6), 32], ['#8', num(8), 32],
    ['#10', num(10), 24], ['#12', num(12), 24], ['1/4', 1 / 4, 20], ['5/16', 5 / 16, 18], ['3/8', 3 / 8, 16], ['7/16', 7 / 16, 14], ['1/2', 1 / 2, 13],
    ['9/16', 9 / 16, 12], ['5/8', 5 / 8, 11], ['3/4', 3 / 4, 10], ['7/8', 7 / 8, 9], ['1', 1, 8], ['1 1/8', 1.125, 7], ['1 1/4', 1.25, 7],
    ['1 3/8', 1.375, 6], ['1 1/2', 1.5, 6], ['1 3/4', 1.75, 5], ['2', 2, 4.5]];
  const UNF = [['#0', num(0), 80], ['#1', num(1), 72], ['#2', num(2), 64], ['#3', num(3), 56], ['#4', num(4), 48], ['#5', num(5), 44], ['#6', num(6), 40],
    ['#8', num(8), 36], ['#10', num(10), 32], ['#12', num(12), 28], ['1/4', 1 / 4, 28], ['5/16', 5 / 16, 24], ['3/8', 3 / 8, 24], ['7/16', 7 / 16, 20],
    ['1/2', 1 / 2, 20], ['9/16', 9 / 16, 18], ['5/8', 5 / 8, 18], ['3/4', 3 / 4, 16], ['7/8', 7 / 8, 14], ['1', 1, 12], ['1 1/8', 1.125, 12],
    ['1 1/4', 1.25, 12], ['1 3/8', 1.375, 12], ['1 1/2', 1.5, 12]];
  const UNEF = [['1/4', 1 / 4, 32], ['5/16', 5 / 16, 32], ['3/8', 3 / 8, 32], ['7/16', 7 / 16, 28], ['1/2', 1 / 2, 28], ['9/16', 9 / 16, 24],
    ['5/8', 5 / 8, 24], ['11/16', 11 / 16, 24], ['3/4', 3 / 4, 20], ['13/16', 13 / 16, 20], ['7/8', 7 / 8, 20], ['15/16', 15 / 16, 20], ['1', 1, 20]];
  const unificato = ([nome, dIn, tpi], serie) => Object.assign({ nome: nome + '-' + tpi + ' ' + serie, tpi }, misure60(dIn * IN, IN / tpi));

  // ----- Whitworth (55 gradi): BSW passo grosso, BSF passo fine -----
  const BSW = [['1/8', 1 / 8, 40], ['3/16', 3 / 16, 24], ['1/4', 1 / 4, 20], ['5/16', 5 / 16, 18], ['3/8', 3 / 8, 16], ['7/16', 7 / 16, 14], ['1/2', 1 / 2, 12],
    ['9/16', 9 / 16, 12], ['5/8', 5 / 8, 11], ['3/4', 3 / 4, 10], ['7/8', 7 / 8, 9], ['1', 1, 8], ['1 1/8', 1.125, 7], ['1 1/4', 1.25, 7], ['1 1/2', 1.5, 6],
    ['1 3/4', 1.75, 5], ['2', 2, 4.5]];
  const BSF = [['3/16', 3 / 16, 32], ['7/32', 7 / 32, 28], ['1/4', 1 / 4, 26], ['5/16', 5 / 16, 22], ['3/8', 3 / 8, 20], ['7/16', 7 / 16, 18], ['1/2', 1 / 2, 16],
    ['9/16', 9 / 16, 16], ['5/8', 5 / 8, 14], ['11/16', 11 / 16, 14], ['3/4', 3 / 4, 12], ['7/8', 7 / 8, 11], ['1', 1, 10], ['1 1/8', 1.125, 9], ['1 1/4', 1.25, 9],
    ['1 1/2', 1.5, 8]];
  const whit = ([nome, dIn, tpi], serie) => Object.assign({ nome: serie + ' ' + nome + '-' + tpi, tpi }, misure55(dIn * IN, IN / tpi));

  // ----- gas: diametro esterno in mm e filetti per pollici (ISO 228 cilindrico G, ISO 7 conico R/Rc/Rp) -----
  const GAS = [['1/16', 7.723, 28], ['1/8', 9.728, 28], ['1/4', 13.157, 19], ['3/8', 16.662, 19], ['1/2', 20.955, 14], ['5/8', 22.911, 14], ['3/4', 26.441, 14],
    ['7/8', 30.201, 14], ['1', 33.249, 11], ['1 1/8', 37.897, 11], ['1 1/4', 41.910, 11], ['1 1/2', 47.803, 11], ['1 3/4', 53.746, 11], ['2', 59.614, 11],
    ['2 1/4', 65.710, 11], ['2 1/2', 75.184, 11], ['3', 87.884, 11], ['3 1/2', 100.330, 11], ['4', 113.030, 11], ['5', 138.430, 11], ['6', 163.830, 11]];
  const gasG = ([nome, d, tpi]) => { const m = misure55(d, IN / tpi); return Object.assign({ nome: 'G ' + nome, tpi }, m); };
  const gasR = ([nome, d, tpi]) => {
    // conico 1:16: d e il diametro sul piano di misura; all'estremita piccola il diametro e minore (L = lunghezza utile)
    const m = misure55(d, IN / tpi);
    m.preforo = r1(d - 1.35 * IN / tpi);
    return Object.assign({ nome: 'R / Rc ' + nome, tpi, conicita: '1:16' }, m);
  };

  // ----- NPT / NPTF (60 gradi, conico 1:16): [misura, diametro esterno in pollici, filetti/pollice, preforo in mm, impegno a mano L1 in pollici] -----
  const NPT = [['1/16', 0.3125, 27, 6.0, 0.160], ['1/8', 0.405, 27, 8.7, 0.2639], ['1/4', 0.540, 18, 11.1, 0.402], ['3/8', 0.675, 18, 14.5, 0.408],
    ['1/2', 0.840, 14, 18.3, 0.534], ['3/4', 1.050, 14, 23.4, 0.546], ['1', 1.315, 11.5, 29.4, 0.682], ['1 1/4', 1.660, 11.5, 38.1, 0.707],
    ['1 1/2', 1.900, 11.5, 44.5, 0.724], ['2', 2.375, 11.5, 56.4, 0.756], ['2 1/2', 2.875, 8, 68.2, 1.1375], ['3', 3.500, 8, 84.1, 1.200],
    ['4', 4.500, 8, 109.5, 1.300], ['5', 5.563, 8, 136.5, 1.4063], ['6', 6.625, 8, 163.5, 1.5125]];
  const npt = ([nome, dIn, tpi, pre, l1]) => {
    const P = IN / tpi, E0 = (dIn - (0.05 * dIn + 1.1) / tpi) * IN;      // diametro medio sul piano di partenza
    return { nome: 'NPT ' + nome, tpi, d: r3(dIn * IN), p: r3(P), medio: r3(E0), preforo: pre, l1: r2(l1 * IN), conicita: '1:16' };
  };

  // ----- trapezi metrici ISO 2904 (30 gradi): [diametro, passo] -----
  const TR = [[8, 1.5], [10, 2], [12, 3], [14, 3], [16, 4], [18, 4], [20, 4], [22, 5], [24, 5], [26, 5], [28, 5], [30, 6], [32, 6], [36, 6], [40, 7], [44, 7],
    [48, 8], [50, 8], [52, 8], [55, 9], [60, 9], [65, 10], [70, 10], [75, 10], [80, 10], [90, 12], [100, 12]];
  const tr = ([d, p]) => {
    const ac = p <= 1.5 ? 0.15 : p <= 5 ? 0.25 : p <= 12 ? 0.5 : 1;
    const h = 0.5 * p + ac;
    return { nome: 'Tr ' + d + 'x' + p, d, p, medio: r3(d - 0.5 * p), nocciolo: r3(d - p), noccioloVite: r3(d - 2 * h), esterno: r3(d + 2 * ac), profondita: r3(h) };
  };
  // ACME (29 gradi): [diametro pollici, filetti/pollice]
  const ACME = [[1 / 4, 16], [5 / 16, 14], [3 / 8, 12], [7 / 16, 12], [1 / 2, 10], [5 / 8, 8], [3 / 4, 6], [7 / 8, 6], [1, 5], [1.25, 5], [1.5, 4], [1.75, 4], [2, 4], [2.5, 3], [3, 2]];
  const acme = ([dIn, tpi]) => {
    const P = IN / tpi, d = dIn * IN, h = 0.5 * P + 0.127;   // profondita con gioco 0,005"
    return { nome: 'ACME ' + r3(dIn).toString().replace('.', ',') + '"-' + tpi, tpi, d: r3(d), p: r3(P), medio: r3(d - 0.5 * P), nocciolo: r3(d - P), noccioloVite: r3(d - 2 * h), profondita: r3(h) };
  };
  // Pg (80 gradi, passacavi): [nome, diametro esterno, filetti/pollice]
  const PG = [['Pg 7', 12.5, 20], ['Pg 9', 15.2, 18], ['Pg 11', 18.6, 18], ['Pg 13,5', 20.4, 18], ['Pg 16', 22.5, 18], ['Pg 21', 28.3, 16], ['Pg 29', 37.0, 16],
    ['Pg 36', 47.0, 16], ['Pg 42', 54.0, 16], ['Pg 48', 59.3, 16]];
  const pg = ([nome, d, tpi]) => { const P = IN / tpi; return { nome, tpi, d, p: r3(P), nocciolo: r3(d - 2 * 0.5 * P * 1.1), preforo: r1(d - 1.1 * P) }; };

  // ----- metrici: grosso e fine (ISO 262) -----
  const M_FINI = [[3, .35], [4, .5], [5, .5], [6, .75], [8, .75], [8, 1], [10, .75], [10, 1], [10, 1.25], [12, 1], [12, 1.25], [12, 1.5], [14, 1], [14, 1.25], [14, 1.5],
    [16, 1], [16, 1.5], [18, 1.5], [18, 2], [20, 1], [20, 1.5], [20, 2], [22, 1.5], [22, 2], [24, 1.5], [24, 2], [27, 1.5], [27, 2], [30, 1.5], [30, 2], [30, 3],
    [33, 1.5], [33, 2], [36, 1.5], [36, 2], [36, 3], [39, 1.5], [39, 2], [39, 3], [42, 1.5], [42, 2], [42, 3], [45, 1.5], [45, 2], [45, 3], [48, 1.5], [48, 2], [48, 3],
    [52, 1.5], [52, 2], [52, 3], [56, 1.5], [56, 2], [56, 4], [60, 1.5], [60, 2], [60, 4], [64, 2], [64, 4], [72, 2], [72, 4], [80, 2], [80, 4], [100, 2], [100, 4]];
  const metrico = (d, p, fine) => Object.assign({ nome: 'M' + d + (fine ? 'x' + p : ''), rullare: r2(d - 0.45 * p) }, misure60(d, p));
  const metricoGrosso = () => O.FILETTI_GROSSI.map(([d, p]) => metrico(d, p, false));

  /** Famiglie: id, nome, angolo, note e righe. colonne = quali misure mostrare (le altre non servono). */
  const FAMIGLIE = [
    { id: 'm', nome: 'Metrico M', angolo: '60°', note: 'ISO 262, passo grosso. Preforo = D - P. Il maschio a rullare usa un foro piu grande (D - 0,45 P).', colonne: ['d', 'p', 'preforo', 'rullare', 'medio', 'nocciolo', 'noccioloVite'], righe: metricoGrosso },
    { id: 'mf', nome: 'Metrico fine MF', angolo: '60°', note: 'Passo fine (ISO 262): si scrive M10x1. Preforo = D - P.', colonne: ['d', 'p', 'preforo', 'rullare', 'medio', 'nocciolo', 'noccioloVite'], righe: () => M_FINI.map(([d, p]) => metrico(d, p, true)) },
    { id: 'unc', nome: 'UNC', angolo: '60°', note: 'Unificato pollici, passo grosso. Il numero dopo il trattino sono i filetti per pollice.', colonne: ['d', 'tpi', 'p', 'preforo', 'medio', 'nocciolo', 'noccioloVite'], righe: () => UNC.map(x => unificato(x, 'UNC')) },
    { id: 'unf', nome: 'UNF', angolo: '60°', note: 'Unificato pollici, passo fine.', colonne: ['d', 'tpi', 'p', 'preforo', 'medio', 'nocciolo', 'noccioloVite'], righe: () => UNF.map(x => unificato(x, 'UNF')) },
    { id: 'unef', nome: 'UNEF', angolo: '60°', note: 'Unificato pollici, passo extra fine.', colonne: ['d', 'tpi', 'p', 'preforo', 'medio', 'nocciolo', 'noccioloVite'], righe: () => UNEF.map(x => unificato(x, 'UNEF')) },
    { id: 'npt', nome: 'NPT', angolo: '60°', conico: true, note: 'Tubi americani, conico 1:16 (1°47\'). Il diametro e quello all\'inizio del filetto. NPTF ha le stesse misure ma tiene senza sigillante. Il preforo e per maschio conico, indicativo.', colonne: ['d', 'tpi', 'p', 'medio', 'preforo', 'l1'], righe: () => NPT.map(npt) },
    { id: 'g', nome: 'Gas G (cilindrico)', angolo: '55°', note: 'ISO 228, filetto cilindrico non a tenuta. Il preforo e indicativo (D - 1,2 P): vale il costruttore del maschio.', colonne: ['d', 'tpi', 'p', 'preforo', 'medio', 'nocciolo'], righe: () => GAS.map(gasG) },
    { id: 'r', nome: 'Gas R / Rc conico', angolo: '55°', conico: true, note: 'ISO 7, conico 1:16: R e il maschio (esterno), Rc la femmina, Rp la femmina cilindrica. Il diametro e sul piano di misura. Preforo per maschio conico, indicativo.', colonne: ['d', 'tpi', 'p', 'preforo', 'medio', 'nocciolo'], righe: () => GAS.map(gasR) },
    { id: 'bsw', nome: 'Whitworth BSW', angolo: '55°', note: 'Whitworth pollici, passo grosso.', colonne: ['d', 'tpi', 'p', 'preforo', 'medio', 'nocciolo'], righe: () => BSW.map(x => whit(x, 'BSW')) },
    { id: 'bsf', nome: 'Whitworth BSF', angolo: '55°', note: 'Whitworth pollici, passo fine.', colonne: ['d', 'tpi', 'p', 'preforo', 'medio', 'nocciolo'], righe: () => BSF.map(x => whit(x, 'BSF')) },
    { id: 'tr', nome: 'Trapezio Tr', angolo: '30°', note: 'ISO 2904, viti di manovra. Il gioco sul fondo cambia col passo. Si lavora con utensile da trapezio.', colonne: ['d', 'p', 'medio', 'nocciolo', 'noccioloVite', 'esterno', 'profondita'], righe: () => TR.map(tr) },
    { id: 'acme', nome: 'ACME', angolo: '29°', note: 'Trapezio americano in pollici, viti di manovra.', colonne: ['d', 'tpi', 'p', 'medio', 'nocciolo', 'noccioloVite', 'profondita'], righe: () => ACME.map(acme) },
    { id: 'pg', nome: 'Pg', angolo: '80°', note: 'Passacavi tedeschi (norma ritirata, ancora diffusi). Diametro esterno e filetti per pollice.', colonne: ['d', 'tpi', 'p', 'preforo', 'nocciolo'], righe: () => PG.map(pg) }
  ];
  const ETICHETTE = { d: 'Ø nominale', p: 'Passo', tpi: 'Filetti/"', preforo: 'Preforo', rullare: 'Rullare', medio: 'd2 medio', nocciolo: 'D1 dado', noccioloVite: 'd3 vite', esterno: 'D4 dado', profondita: 'Profondita', l1: 'Impegno a mano' };

  /** Righe di una famiglia, filtrate da un testo (nome o diametro). */
  function righeFamiglia(id, testo) {
    const f = FAMIGLIE.find(x => x.id === id);
    if (!f) return [];
    const righe = f.righe();
    const t = String(testo || '').trim().toLowerCase().replace(/,/g, '.');
    if (!t) return righe;
    return righe.filter(r => r.nome.toLowerCase().replace(/,/g, '.').includes(t) || String(r.d) === t);
  }

  // ----- filetti al tornio: angolo dell'inserto, profondita esterna e interna, conicita -----
  const TORNIO = {
    m: { ang: 60 }, mf: { ang: 60 }, unc: { ang: 60 }, unf: { ang: 60 }, unef: { ang: 60 },
    g: { ang: 55 }, r: { ang: 55, conico: true }, bsw: { ang: 55 }, bsf: { ang: 55 },
    npt: { ang: 60, conico: true }, tr: { ang: 30, trapezio: true }, acme: { ang: 29, trapezio: true }, pg: { ang: 80 }
  };
  /**
   * Dati per filettare al tornio. f = {fam, nome, d, p}: senza famiglia e metrico.
   * Ritorna {fam, nome, d, p, ang, conico, trapezio, hEst (profondita radiale della vite), hInt (della madrevite), d1 (nocciolo della madrevite)}.
   * Conici (R, NPT): 1:16 sul diametro, il diametro scritto e quello all'inizio del filetto.
   */
  function datiFiletto(f) {
    const fam = TORNIO[f && f.fam] ? f.fam : 'm', T = TORNIO[fam];
    const d = Number(f.d), p = Number(f.p);
    let hEst, hInt, d1;
    if (fam === 'tr' || fam === 'acme') { const ac = fam === 'acme' ? 0.127 : p <= 1.5 ? 0.15 : p <= 5 ? 0.25 : p <= 12 ? 0.5 : 1; hEst = hInt = 0.5 * p + ac; d1 = d - p; }
    else if (fam === 'npt') { hEst = hInt = 0.8 * p; d1 = d - 1.6 * p; }
    else if (fam === 'pg') { hEst = hInt = 0.55 * p; d1 = d - 1.1 * p; }
    else if (T.ang === 55) { hEst = hInt = 0.640327 * p; d1 = d - 1.280654 * p; }
    else { hEst = 0.613343 * p; hInt = 0.541266 * p; d1 = d - 1.082532 * p; }
    const nome = f.nome || ('M' + r3(d) + 'x' + r3(p));
    return { fam, nome, d, p, ang: T.ang, conico: !!T.conico, trapezio: !!T.trapezio, hEst: r3(hEst), hInt: r3(hInt), d1: r3(d1) };
  }
  /** Tutti i filetti che si fanno al tornio, per famiglia: [{fam, nomeFam, righe:[{nome, d, p}]}]. */
  function filettiTornio() {
    return FAMIGLIE.filter(f => TORNIO[f.id]).map(f => ({ fam: f.id, nomeFam: f.nome + ' (' + f.angolo + ')', righe: f.righe().filter(r => Number(r.d) > 0 && Number(r.p) > 0).map(r => ({ nome: r.nome, d: Number(r.d), p: Number(r.p) })) }));
  }

  /** I gruppi di filetti da scegliere al tornio, nell'ordine dell'officina. */
  const GRUPPI = [['m', 'Metrico grosso'], ['mf', 'Metrico fine'], ['g', 'Gas G'], ['r', 'Gas conico R'], ['npt', 'NPT'], ['unc', 'UNC'], ['unf', 'UNF'], ['unef', 'UNEF'],
    ['bsw', 'Whitworth BSW'], ['bsf', 'Whitworth BSF'], ['tr', 'Trapezio Tr'], ['acme', 'ACME'], ['pg', 'Pg']];
  /**
   * Le misure di un gruppo, quelle vicine al diametro d per prime. Ritorna {righe:[{nome, d, p}] (tutte, in ordine di tabella),
   * vicine:[...] (le n piu vicine a d; senza d le prime n)}.
   */
  function filettiGruppo(fam, d, n) {
    const f = FAMIGLIE.find(x => x.id === fam && TORNIO[x.id]);
    if (!f) return { righe: [], vicine: [] };
    const righe = f.righe().filter(r => Number(r.d) > 0 && Number(r.p) > 0).map(r => ({ nome: r.nome, d: Number(r.d), p: Number(r.p) }));
    const k = n > 0 ? n : 8, dd = Number(d);
    const vicine = dd > 0 ? righe.map((r, i) => ({ r, i, s: Math.abs(r.d - dd) })).sort((a, b) => a.s - b.s || a.i - b.i).slice(0, k).sort((a, b) => a.i - b.i).map(x => x.r) : righe.slice(0, k);
    return { righe, vicine };
  }
  /** Il gruppo di un filetto gia scelto: {fam} se c'e, altrimenti metrico grosso o fine dal passo. */
  function gruppoDi(o) {
    if (o && o.filFam && TORNIO[o.filFam]) return o.filFam;
    if (!(Number(o && o.fil) > 0)) return '';
    const d = Number(o.d !== undefined ? o.d : o.di);
    const g = (O.FILETTI_GROSSI || []).find(x => x[0] === d);
    return g && Math.abs(g[1] - Number(o.fil)) < 1e-9 ? 'm' : 'mf';
  }

  const Filetti = { GRUPPI_FILETTO: GRUPPI, filettiGruppo, gruppoFiletto: gruppoDi, FILETTI_FAMIGLIE: FAMIGLIE, FILETTI_ETICHETTE: ETICHETTE, righeFamiglia, datiFiletto, filettiTornio };
  Object.assign(O, Filetti);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
