// ===== Hich-Officina: carattere a tratti singoli per l'incisione (scritto da noi) =====
// Ogni lettera e fatta di linee (non di contorni): la fresa incisore le segue una volta. Maiuscole, cifre e qualche segno;
// le minuscole diventano maiuscole e le lettere accentate perdono l'accento. tratteTesto(e) ritorna le polilinee del testo in mm.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  // griglia: larghezza 4, altezza 6 (maiuscole); la riga base e y = 0
  const O_ = [[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]];
  const P_ = [[0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]];
  const G = {
    A: [[[0, 0], [2, 6], [4, 0]], [[0.7, 2], [3.3, 2]]],
    B: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]], [[3, 3], [4, 2], [4, 1], [3, 0], [0, 0]]],
    C: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1]]],
    D: [[[0, 0], [0, 6], [2.5, 6], [4, 4.5], [4, 1.5], [2.5, 0], [0, 0]]],
    E: [[[4, 6], [0, 6], [0, 0], [4, 0]], [[0, 3], [3, 3]]],
    F: [[[4, 6], [0, 6], [0, 0]], [[0, 3], [3, 3]]],
    G: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1], [4, 3], [2, 3]]],
    H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
    I: [[[1, 6], [3, 6]], [[2, 6], [2, 0]], [[1, 0], [3, 0]]],
    J: [[[4, 6], [4, 1], [3, 0], [1, 0], [0, 1]]],
    K: [[[0, 0], [0, 6]], [[4, 6], [0, 2.5]], [[1.2, 3.7], [4, 0]]],
    L: [[[0, 6], [0, 0], [4, 0]]],
    M: [[[0, 0], [0, 6], [2, 3], [4, 6], [4, 0]]],
    N: [[[0, 0], [0, 6], [4, 0], [4, 6]]],
    O: [O_],
    P: [P_],
    Q: [O_, [[2.5, 2], [4, 0]]],
    R: [P_, [[2, 3], [4, 0]]],
    S: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 4], [1, 3], [3, 3], [4, 2], [4, 1], [3, 0], [1, 0], [0, 1]]],
    T: [[[0, 6], [4, 6]], [[2, 6], [2, 0]]],
    U: [[[0, 6], [0, 1], [1, 0], [3, 0], [4, 1], [4, 6]]],
    V: [[[0, 6], [2, 0], [4, 6]]],
    W: [[[0, 6], [1, 0], [2, 4], [3, 0], [4, 6]]],
    X: [[[0, 0], [4, 6]], [[0, 6], [4, 0]]],
    Y: [[[0, 6], [2, 3], [4, 6]], [[2, 3], [2, 0]]],
    Z: [[[0, 6], [4, 6], [0, 0], [4, 0]]],
    '0': [O_, [[0.8, 1], [3.2, 5]]],
    '1': [[[1, 5], [2, 6], [2, 0]], [[1, 0], [3, 0]]],
    '2': [[[0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [0, 0], [4, 0]]],
    '3': [[[0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3], [1.5, 3]], [[3, 3], [4, 2], [4, 1], [3, 0], [1, 0], [0, 1]]],
    '4': [[[3, 0], [3, 6], [0, 2], [4, 2]]],
    '5': [[[4, 6], [0, 6], [0, 3], [3, 3], [4, 2], [4, 1], [3, 0], [1, 0], [0, 1]]],
    '6': [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]]],
    '7': [[[0, 6], [4, 6], [1.5, 0]]],
    '8': [[[1, 3], [0, 4], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3], [1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3]]],
    '9': [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 4], [1, 3], [4, 3]]],
    '-': [[[0.5, 3], [3.5, 3]]],
    '_': [[[0, -0.8], [4, -0.8]]],
    '.': [[[1.8, 0], [2.2, 0], [2.2, 0.4], [1.8, 0.4], [1.8, 0]]],
    ',': [[[2, 0.6], [2, 0], [1.4, -1]]],
    ':': [[[1.8, 0], [2.2, 0], [2.2, 0.4], [1.8, 0.4], [1.8, 0]], [[1.8, 3.6], [2.2, 3.6], [2.2, 4], [1.8, 4], [1.8, 3.6]]],
    '/': [[[0, 0], [4, 6]]],
    '+': [[[0.5, 3], [3.5, 3]], [[2, 1.5], [2, 4.5]]],
    '=': [[[0.5, 2], [3.5, 2]], [[0.5, 4], [3.5, 4]]],
    '(': [[[3, 6], [1.5, 4.5], [1.5, 1.5], [3, 0]]],
    ')': [[[1, 6], [2.5, 4.5], [2.5, 1.5], [1, 0]]],
    '%': [[[0, 0], [4, 6]], [[0.4, 5], [1.6, 5], [1.6, 6], [0.4, 6], [0.4, 5]], [[2.4, 0], [3.6, 0], [3.6, 1], [2.4, 1], [2.4, 0]]],
    '#': [[[1, 0], [1.5, 6]], [[2.5, 0], [3, 6]], [[0, 2], [4, 2]], [[0, 4], [4, 4]]],
    '*': [[[0.5, 1.5], [3.5, 4.5]], [[0.5, 4.5], [3.5, 1.5]], [[2, 1], [2, 5]]],
    '°': [[[1, 4.5], [2.5, 4.5], [2.5, 6], [1, 6], [1, 4.5]]],
    'Ø': [O_, [[0, 0], [4, 6]]],
    "'": [[[2, 6], [2, 4.5]]],
    '"': [[[1.3, 6], [1.3, 4.5]], [[2.7, 6], [2.7, 4.5]]],
    '?': [[[0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [2, 3], [2, 2]], [[1.8, 0], [2.2, 0], [2.2, 0.4], [1.8, 0.4], [1.8, 0]]],
    '!': [[[2, 6], [2, 2]], [[1.8, 0], [2.2, 0], [2.2, 0.4], [1.8, 0.4], [1.8, 0]]]
  };
  const ALTEZZA = 6, LARGHEZZA = 4, AVANZO = 5.5;
  const normale = ch => {
    let c = ch.toUpperCase();
    if (G[c]) return c;
    const base = c.normalize ? c.normalize('NFD').replace(/[̀-ͯ]/g, '') : c;
    return G[base] ? base : (c === ' ' ? ' ' : '?');
  };
  /** Caratteri che il carattere a tratti sa scrivere (tutti gli altri diventano ?). */
  const caratteriTesto = () => Object.keys(G).join('') + ' ';
  /** Larghezza del testo in mm. e = {testo, h, spazio}: h altezza delle maiuscole, spazio = spazio in piu tra le lettere (mm). */
  function larghezzaTesto(e) {
    const t = String(e.testo || ''), s = (Number(e.h) || 5) / ALTEZZA, sp = Number(e.spazio) || 0;
    return t.length ? (t.length * AVANZO - (AVANZO - LARGHEZZA)) * s + Math.max(0, t.length - 1) * sp : 0;
  }
  /**
   * Le polilinee del testo, in mm, dal punto (x, y) = angolo in basso a sinistra della prima lettera, ruotate di ang gradi.
   * Ritorna [[[x, y], ...], ...].
   */
  function tratteTesto(e) {
    const t = String(e.testo || ''), h = Number(e.h) || 5, s = h / ALTEZZA, sp = Number(e.spazio) || 0, a = (Number(e.ang) || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const x0 = Number(e.x) || 0, y0 = Number(e.y) || 0, out = [];
    let i = 0;
    for (const ch of t) {
      const c = normale(ch);
      if (c !== ' ') G[c].forEach(tr => out.push(tr.map(([gx, gy]) => { const lx = i * (AVANZO * s + sp) + gx * s, ly = gy * s; return [Math.round((x0 + lx * ca - ly * sa) * 1000) / 1000, Math.round((y0 + lx * sa + ly * ca) * 1000) / 1000]; })));
      i++;
    }
    return out;
  }

  const Font = { tratteTesto, larghezzaTesto, caratteriTesto };
  Object.assign(O, Font);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
