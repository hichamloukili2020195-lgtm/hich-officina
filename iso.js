// ===== Hich-Officina: lettura ed esecuzione di un programma ISO (senza interfaccia) =====
// Serve alla simulazione, all'apertura dei programmi, al foglio di attrezzaggio e alla prova delle macro.
// Capisce: G0 G1 G2 G3 (I J K o R), G90 G91, G17 G18 G19, G20 G21, G94 G95/G98 G99, cicli di foratura G73 G81-G89
// (fresa), G32 G33 (tornio), U W incrementali (tornio), T S F M; variabili #, espressioni [ ], funzioni, IF GOTO,
// IF THEN, WHILE DO END, GOTO, G65 (macro con argomenti), M98 / M99 (sottoprogrammi nello stesso testo).
// Quello che non capisce lo segnala negli avvisi e va avanti.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;

  const LETTERE_VAR = { A: 1, B: 2, C: 3, I: 4, J: 5, K: 6, D: 7, E: 8, F: 9, H: 11, M: 13, Q: 17, R: 18, S: 19, T: 20, U: 21, V: 22, W: 23, X: 24, Y: 25, Z: 26 };
  const RAPIDO = 10000;   // mm/min per la stima del tempo dei rapidi

  /** Il programma diviso in righe e in sottoprogrammi (righe O....). */
  function prepara(testo) {
    const righe = String(testo || '').replace(/\r/g, '').split('\n');
    const prog = {};   // numero -> indice della prima riga
    righe.forEach((r, i) => {
      const m = /^\s*[O:](\d+)/i.exec(r);
      if (m && prog[Number(m[1])] === undefined) prog[Number(m[1])] = i;
    });
    return { righe, prog };
  }

  /** Toglie commenti, spazi e numero di riga. Ritorna {testo, n (etichetta N), commento}. */
  function pulisci(riga) {
    let commento = '';
    let t = String(riga).replace(/\(([^)]*)\)/g, (x, c) => { commento += (commento ? ' ' : '') + c.trim(); return ' '; });
    t = t.replace(/;.*$/, '').trim();
    if (t === '%' || /^[O:]\d+/i.test(t)) return { testo: '', n: null, commento, intestazione: true };
    let n = null;
    const mn = /^N(\d+)\s*/i.exec(t);
    if (mn) { n = Number(mn[1]); t = t.slice(mn[0].length); }
    if (t.startsWith('/')) t = t.slice(1);   // salto di blocco: si esegue
    return { testo: t.toUpperCase(), n, commento };
  }

  // ----- espressioni -----
  function errore(msg) { const e = new Error(msg); e.iso = true; return e; }
  /** Divide un'espressione in pezzi. */
  function pezzi(s) {
    const T = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === ' ' || c === '\t') { i++; continue; }
      const num = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
      if (num) { T.push({ t: 'n', v: Number(num[0]) }); i += num[0].length; continue; }
      const parola = /^[A-Z]+/.exec(s.slice(i));
      if (parola) { T.push({ t: 'w', v: parola[0] }); i += parola[0].length; continue; }
      if ('#[]+-*/,='.includes(c)) { T.push({ t: c }); i++; continue; }
      throw errore('carattere non capito: ' + c);
    }
    return T;
  }
  const FUNZ = {
    SIN: x => Math.sin(x * Math.PI / 180), COS: x => Math.cos(x * Math.PI / 180), TAN: x => Math.tan(x * Math.PI / 180),
    ASIN: x => Math.asin(x) * 180 / Math.PI, ACOS: x => Math.acos(x) * 180 / Math.PI,
    SQRT: Math.sqrt, ABS: Math.abs, ROUND: Math.round, FIX: Math.trunc, FUP: x => (x < 0 ? Math.floor(x) : Math.ceil(x)),
    LN: Math.log, EXP: Math.exp
  };
  const CONFR = { EQ: (a, b) => a === b, NE: (a, b) => a !== b, GT: (a, b) => a > b, GE: (a, b) => a >= b, LT: (a, b) => a < b, LE: (a, b) => a <= b };
  /** Valuta i pezzi da p.i: espressione con + - * / , funzioni, confronti, AND OR. */
  function espr(T, p, leggi) {
    const vuoto = v => (v === null || v === undefined ? 0 : v);
    function primario() {
      const x = T[p.i];
      if (!x) throw errore('espressione incompleta');
      if (x.t === 'n') { p.i++; return x.v; }
      if (x.t === '-') { p.i++; return -vuoto(primario()); }
      if (x.t === '+') { p.i++; return primario(); }
      if (x.t === '#') { p.i++; const k = primario(); return leggi(Math.round(vuoto(k))); }
      if (x.t === '[') { p.i++; const v = logico(); if (!T[p.i] || T[p.i].t !== ']') throw errore('manca ]'); p.i++; return v; }
      if (x.t === 'w' && x.v === 'ATAN') {
        p.i++;
        if (!T[p.i] || T[p.i].t !== '[') throw errore('ATAN senza [');
        p.i++; const a = vuoto(logico());
        let b = 1;
        if (T[p.i] && (T[p.i].t === '/' || T[p.i].t === ',')) { p.i++; if (T[p.i] && T[p.i].t === '[') { p.i++; b = vuoto(logico()); if (T[p.i] && T[p.i].t === ']') p.i++; } else b = vuoto(logico()); }
        if (!T[p.i] || T[p.i].t !== ']') throw errore('manca ] dopo ATAN'); p.i++;
        let g = Math.atan2(a, b) * 180 / Math.PI; if (g < 0) g += 360; return g;
      }
      if (x.t === 'w' && FUNZ[x.v]) { p.i++; return FUNZ[x.v](vuoto(primario())); }
      throw errore('non capisco ' + (x.v || x.t));
    }
    function prodotto() {
      let v = primario();
      while (T[p.i] && (T[p.i].t === '*' || T[p.i].t === '/' || (T[p.i].t === 'w' && T[p.i].v === 'MOD'))) {
        const op = T[p.i].t === 'w' ? 'MOD' : T[p.i].t; p.i++;
        const b = vuoto(primario());
        if (op === '*') v = vuoto(v) * b; else if (op === '/') { if (b === 0) throw errore('divisione per zero'); v = vuoto(v) / b; } else v = vuoto(v) % b;
      }
      return v;
    }
    function somma() {
      let v = prodotto();
      while (T[p.i] && (T[p.i].t === '+' || T[p.i].t === '-')) { const op = T[p.i].t; p.i++; const b = vuoto(prodotto()); v = op === '+' ? vuoto(v) + b : vuoto(v) - b; }
      return v;
    }
    function confronto() {
      const a = somma();
      if (T[p.i] && T[p.i].t === 'w' && CONFR[T[p.i].v]) {
        const op = T[p.i].v; p.i++;
        const b = somma();
        if (op === 'EQ' || op === 'NE') { const u = (a === null || a === undefined) && (b === null || b === undefined); const r = u || Math.abs(vuoto(a) - vuoto(b)) < 1e-9; return op === 'EQ' ? (r ? 1 : 0) : (r ? 0 : 1); }
        return CONFR[op](vuoto(a), vuoto(b)) ? 1 : 0;
      }
      return a;
    }
    function logico() {
      let v = confronto();
      while (T[p.i] && T[p.i].t === 'w' && (T[p.i].v === 'AND' || T[p.i].v === 'OR')) {
        const op = T[p.i].v; p.i++; const b = confronto();
        v = op === 'AND' ? (v && b ? 1 : 0) : (v || b ? 1 : 0);
      }
      return v;
    }
    return logico();
  }

  // ----- esecuzione -----
  /**
   * Esegue un programma. opz = {modo:'fresa'|'tornio'|'auto', inizio:{x,y,z}, maxPassi, vars:{n:valore}}
   * Ritorna {modo, segmenti:[{x0,y0,z0,x,y,z,rapido,riga,t,f,taglio}], limiti, utensili:[{t,s,f,righe}], tempo (min),
   *          avvisi, errore, messaggi (allarmi e stop delle macro), vars (comuni e locali dell'ultimo livello)}
   */
  function esegui(testo, opz) {
    opz = opz || {};
    const P = prepara(testo);
    let modo = opz.modo && opz.modo !== 'auto' ? opz.modo : indovinaModo(testo);
    const tornio = modo === 'tornio';
    const avvisi = [], messaggi = [], segmenti = [];
    const avvisa = (m, riga) => { const t = (riga !== undefined ? 'Riga ' + (riga + 1) + ': ' : '') + m; if (avvisi.length < 40 && !avvisi.includes(t)) avvisi.push(t); };
    const globali = Object.assign({}, opz.vars || {});
    // stato macchina (in tornio x = diametro)
    const st = {
      x: opz.inizio && opz.inizio.x !== undefined ? opz.inizio.x : 0, y: opz.inizio && opz.inizio.y !== undefined ? opz.inizio.y : 0,
      z: opz.inizio && opz.inizio.z !== undefined ? opz.inizio.z : (tornio ? 50 : 100),
      moto: 0, ass: true, piano: tornio ? 18 : 17, pollici: false, perGiro: tornio, f: 0, s: 0, t: 0, g96: false,
      ciclo: null, ritornoR: false, zIniz: null, r: null, q: null, zc: null, pausa: 0, finito: false
    };
    const utensili = [];
    let utAtt = null;
    const lim = { x: [Infinity, -Infinity], y: [Infinity, -Infinity], z: [Infinity, -Infinity], lavoro: { x: [Infinity, -Infinity], y: [Infinity, -Infinity], z: [Infinity, -Infinity] } };
    let tempo = 0;
    const segna = (k, v, lavoro) => { lim[k][0] = Math.min(lim[k][0], v); lim[k][1] = Math.max(lim[k][1], v); if (lavoro) { lim.lavoro[k][0] = Math.min(lim.lavoro[k][0], v); lim.lavoro[k][1] = Math.max(lim.lavoro[k][1], v); } };
    const scala = () => (st.pollici ? 25.4 : 1);
    const giriAttuali = (x) => {
      if (!st.g96) return st.s;
      const d = Math.abs(x) || 1;
      const n = st.s * 1000 / (Math.PI * d);
      return st.giriMax ? Math.min(n, st.giriMax) : n;
    };
    function muovi(x, y, z, rapido, riga, taglio) {
      const s = { x0: st.x, y0: st.y, z0: st.z, x, y, z, rapido, riga, t: st.t, f: st.f, taglio: !!taglio };
      const l = Math.hypot((x - st.x) / (tornio ? 2 : 1), y - st.y, z - st.z);
      if (l < 1e-9) return;
      segmenti.push(s);
      segna('x', x, !rapido); segna('y', y, !rapido); segna('z', z, !rapido);
      if (!rapido && segmenti.length > 1) { segna('x', st.x, true); segna('y', st.y, true); segna('z', st.z, true); }
      let fmm = st.f;
      if (!rapido && st.perGiro) fmm = st.f * giriAttuali((st.x + x) / 2);
      tempo += rapido ? l / RAPIDO : (fmm > 0 ? l / fmm : 0);
      if (!rapido && !(st.f > 0)) avvisa('movimento di lavoro senza avanzamento F', riga);
      if (utAtt && !rapido) utAtt.lunghezza += l;
      st.x = x; st.y = y; st.z = z;
    }
    function arco(xf, yf, zf, cw, parole, riga) {
      // piano XY (fresa) o ZX (tornio, G18): coordinate (a, b) del piano e asse perpendicolare
      const g18 = st.piano === 18, g19 = st.piano === 19;
      const rx = v => (tornio ? v / 2 : v);   // in tornio il raggio
      let a0, b0, a1, b1, ca, cb;
      if (g18) { a0 = st.z; b0 = rx(st.x); a1 = zf; b1 = rx(xf); } else if (g19) { a0 = st.y; b0 = st.z; a1 = yf; b1 = zf; } else { a0 = st.x; b0 = st.y; a1 = xf; b1 = yf; }
      const sc = scala();
      if (parole.R !== undefined) {
        const r = parole.R * sc;
        const dx = a1 - a0, dy = b1 - b0, d = Math.hypot(dx, dy);
        if (d < 1e-9) { avvisa('arco con R senza movimento', riga); return; }
        if (Math.abs(r) < d / 2 - 1e-6) { avvisa('raggio R troppo piccolo per l\'arco', riga); }
        const h = Math.sqrt(Math.max(0, r * r - d * d / 4));
        const mx = (a0 + a1) / 2, my = (b0 + b1) / 2;
        // centro a sinistra o a destra della corda secondo verso e segno di R
        // G2/G3 visti dal lato positivo dell'asse perpendicolare: con Z a destra e X in alto il verso e quello del disegno
        let lato = cw ? -1 : 1;
        if (r < 0) lato = -lato;
        ca = mx + lato * (-dy / d) * h; cb = my + lato * (dx / d) * h;
      } else {
        let i = (parole.I || 0) * sc, j = (parole.J || 0) * sc, k = (parole.K || 0) * sc;
        if (g18) { ca = a0 + k; cb = b0 + i; } else if (g19) { ca = a0 + j; cb = b0 + k; } else { ca = a0 + i; cb = b0 + j; }
      }
      const r0 = Math.hypot(a0 - ca, b0 - cb), r1 = Math.hypot(a1 - ca, b1 - cb);
      if (Math.abs(r0 - r1) > 0.01 + r0 * 1e-4) avvisa('arco con raggio d\'inizio e di fine diversi (' + O.gc(r0) + ' / ' + O.gc(r1) + ')', riga);
      let t0 = Math.atan2(b0 - cb, a0 - ca), t1 = Math.atan2(b1 - cb, a1 - ca);
      const orario = cw;
      let dt = t1 - t0;
      if (orario) { while (dt >= -1e-9) dt -= 2 * Math.PI; } else { while (dt <= 1e-9) dt += 2 * Math.PI; }
      const passi = Math.max(4, Math.min(180, Math.ceil(Math.abs(dt) * Math.max(r0, 1) / 0.5)));
      const perp0 = g18 ? st.y : g19 ? st.x : st.z, perp1 = g18 ? yf : g19 ? xf : zf;
      for (let k = 1; k <= passi; k++) {
        const t = t0 + dt * k / passi, a = ca + r0 * Math.cos(t), b = cb + r0 * Math.sin(t), p = perp0 + (perp1 - perp0) * k / passi;
        const fine = k === passi;
        if (g18) muovi(fine ? xf : (tornio ? b * 2 : b), p, fine ? zf : a, false, riga, true);
        else if (g19) muovi(p, fine ? yf : a, fine ? zf : b, false, riga, true);
        else muovi(fine ? xf : a, fine ? yf : b, p, false, riga, true);
      }
    }
    function cicloForo(x, y, riga) {
      const c = st.ciclo, sc = scala();
      const zIn = st.zIniz !== null ? st.zIniz : st.z;
      const r = st.r !== null ? st.r : zIn, zf = st.zc;
      if (zf === null) { avvisa('ciclo senza Z', riga); return; }
      muovi(x, y, st.z, true, riga);
      muovi(x, y, r, true, riga);
      if ((c === 83 || c === 73) && st.q > 0) {
        let z = r;
        let n = 0;
        while (z > zf + 1e-9 && n++ < 1000) {
          const zn = Math.max(z - st.q * sc, zf);
          if (z < r) muovi(x, y, c === 83 ? z + 0.5 : z, true, riga);
          muovi(x, y, zn, false, riga, true);
          if (c === 83) muovi(x, y, r, true, riga); else muovi(x, y, zn + 0.5, true, riga);
          z = zn;
        }
      } else muovi(x, y, zf, false, riga, true);
      // ritorno: avanzamento per alesatura e maschiatura, rapido per gli altri
      const lento = c === 85 || c === 84 || c === 89 || c === 74;
      muovi(x, y, r, !lento, riga);
      if (!st.ritornoR) muovi(x, y, zIn, true, riga);
    }

    // pila delle chiamate: {riga di ritorno, locali, ripetizioni}
    const pila = [];
    let locali = {};
    const leggiVar = n => {
      if (n === 0) return null;
      if (n >= 1 && n <= 33) return locali[n] === undefined ? null : locali[n];
      if (n === 5001 || n === 5021 || n === 5041) return st.x;
      if (n === 5002 || n === 5022 || n === 5042) return st.y;
      if (n === 5003 || n === 5023 || n === 5043) return st.z;
      if (n === 5061) return st.saltoX !== undefined ? st.saltoX : st.x;
      if (n === 5062) return st.saltoY !== undefined ? st.saltoY : st.y;
      if (n === 5063) return st.saltoZ !== undefined ? st.saltoZ : st.z;
      if (n === 4120) return st.t;
      if (n === 4109) return st.f;
      if (n === 4119) return st.s;
      return globali[n] === undefined ? null : globali[n];
    };
    const scriviVar = (n, v, riga) => {
      if (n >= 1 && n <= 33) { locali[n] = v; return; }
      if (n === 3000) { messaggi.push({ tipo: 'allarme', testo: 'Allarme ' + v + (st.ultimoCommento ? ': ' + st.ultimoCommento : ''), riga }); st.finito = true; return; }
      if (n === 3006) { messaggi.push({ tipo: 'stop', testo: 'Stop ' + v + (st.ultimoCommento ? ': ' + st.ultimoCommento : ''), riga }); return; }
      if (n >= 5000 && n < 6000) { avvisa('variabile di sistema #' + n + ' scritta: non simulata', riga); return; }
      globali[n] = v;
    };
    /** Le parole di un blocco: lettera -> valore (numeri, #n, [espressioni]). */
    function parole(testo, riga) {
      const out = {}, G = [], M = [];
      let i = 0;
      while (i < testo.length) {
        const c = testo[i];
        if (c === ' ' || c === '\t') { i++; continue; }
        if (!/[A-Z]/.test(c)) throw errore('mi aspettavo una lettera, trovo ' + c);
        i++;
        // il valore arriva fino alla prossima lettera fuori dalle parentesi
        let j = i, prof = 0;
        while (j < testo.length) {
          const d = testo[j];
          if (d === '[') prof++; else if (d === ']') prof--;
          else if (prof === 0 && /[A-Z]/.test(d)) {
            // funzioni dentro un valore senza parentesi non sono ammesse: lettera nuova
            break;
          }
          j++;
        }
        const val = testo.slice(i, j).trim();
        i = j;
        if (val === '') { avvisa('lettera ' + c + ' senza valore', riga); continue; }
        const T = pezzi(val), p = { i: 0 };
        const v = espr(T, p, leggiVar);
        if (p.i < T.length) throw errore('valore non capito dopo ' + c + ': ' + val);
        if (c === 'G') G.push(v); else if (c === 'M') M.push(v); else out[c] = v;
      }
      out.G = G; out.M = M;
      return out;
    }

    const passiMax = opz.maxPassi || 200000;
    let pc = 0, passi = 0;
    // si parte dalla prima riga dopo l'intestazione del primo programma
    const etichetta = (n, da) => {
      // cerca N n nel programma che contiene la riga da (fino alla prossima O)
      let inizio = da, fine = da;
      while (inizio > 0 && !/^\s*[O:]\d+/i.test(P.righe[inizio])) inizio--;
      fine = inizio + 1;
      while (fine < P.righe.length && !/^\s*[O:]\d+/i.test(P.righe[fine])) fine++;
      for (let k = inizio; k < fine; k++) { const m = /^\s*N(\d+)/i.exec(P.righe[k]); if (m && Number(m[1]) === n) return k; }
      return -1;
    };
    const cicliWhile = [];   // {fine: indice riga END, inizio}
    try {
      while (pc < P.righe.length && !st.finito) {
        if (++passi > passiMax) { avvisa('troppi blocchi eseguiti: forse un ciclo infinito. Mi fermo.'); break; }
        const riga = pc;
        const raw = P.righe[pc];
        pc++;
        // un sottoprogramma che inizia mentre si esegue il principale: fine del principale
        if (/^\s*[O:]\d+/i.test(raw) && riga > 0 && pila.length === 0 && segmenti.length + utensili.length > 0) {
          // il principale e finito senza M30: ci si ferma
          break;
        }
        const b = pulisci(raw);
        if (b.commento) st.ultimoCommento = b.commento;
        let t = b.testo;
        if (!t) continue;
        // istruzioni delle macro
        let m;
        if ((m = /^#/.exec(t)) && /=/.test(t)) {
          const [sx, dx] = [t.slice(0, t.indexOf('=')), t.slice(t.indexOf('=') + 1)];
          const Ts = pezzi(sx), ps = { i: 0 };
          if (!Ts[0] || Ts[0].t !== '#') throw errore('assegnazione non capita');
          ps.i = 1;
          const n = Math.round(espr(Ts, ps, leggiVar) || 0);
          const Td = pezzi(dx), pd = { i: 0 };
          const v = espr(Td, pd, leggiVar);
          scriviVar(n, v, riga);
          continue;
        }
        if ((m = /^IF\s*\[(.*)\]\s*GOTO\s*(.+)$/.exec(t))) {
          const c = espr(pezzi('[' + m[1] + ']'), { i: 0 }, leggiVar);
          if (c) { const n = Math.round(espr(pezzi(m[2]), { i: 0 }, leggiVar)); const k = etichetta(n, riga); if (k < 0) throw errore('GOTO ' + n + ': etichetta N' + n + ' non trovata'); pc = k; }
          continue;
        }
        if ((m = /^IF\s*\[(.*)\]\s*THEN\s*(.+)$/.exec(t))) {
          const c = espr(pezzi('[' + m[1] + ']'), { i: 0 }, leggiVar);
          if (c) {
            const a = m[2];
            if (/^#.*=/.test(a)) {
              const sx = a.slice(0, a.indexOf('=')), dx = a.slice(a.indexOf('=') + 1);
              const Ts = pezzi(sx); const n = Math.round(espr(Ts, { i: 1 }, leggiVar) || 0);
              scriviVar(n, espr(pezzi(dx), { i: 0 }, leggiVar), riga);
            } else avvisa('IF THEN con un comando che non e un\'assegnazione', riga);
          }
          continue;
        }
        if ((m = /^GOTO\s*(.+)$/.exec(t))) {
          const n = Math.round(espr(pezzi(m[1]), { i: 0 }, leggiVar)); const k = etichetta(n, riga);
          if (k < 0) throw errore('GOTO ' + n + ': etichetta N' + n + ' non trovata'); pc = k; continue;
        }
        if ((m = /^WHILE\s*\[(.*)\]\s*DO\s*(\d+)$/.exec(t))) {
          const c = espr(pezzi('[' + m[1] + ']'), { i: 0 }, leggiVar);
          // trova END con lo stesso numero
          let k = pc, prof = 0;
          for (; k < P.righe.length; k++) {
            const tt = pulisci(P.righe[k]).testo;
            if (new RegExp('DO\\s*' + m[2] + '$').test(tt)) prof++;
            if (new RegExp('^END\\s*' + m[2] + '$').test(tt)) { if (prof === 0) break; prof--; }
          }
          if (k >= P.righe.length) throw errore('WHILE DO' + m[2] + ' senza END' + m[2]);
          if (c) cicliWhile.push({ inizio: riga, fine: k }); else pc = k + 1;
          continue;
        }
        if ((m = /^END\s*(\d+)$/.exec(t))) {
          const w = cicliWhile.pop();
          if (w) pc = w.inizio;
          continue;
        }
        if (/^DO\s*\d+$/.test(t)) continue;
        // blocco normale
        const w = parole(t, riga);
        const sc = scala();
        let mossa = null, numG = null, senzaAssi = false;
        for (const g of w.G) {
          const gg = Math.round(g * 10) / 10;
          if (gg === 0 || gg === 1 || gg === 2 || gg === 3) { st.moto = gg; mossa = gg; st.ciclo = null; }
          else if (gg === 4) { st.pausa += (w.P !== undefined ? w.P / 1000 : (w.X || w.U || 0)); senzaAssi = true; }
          else if (gg === 17 || gg === 18 || gg === 19) st.piano = gg;
          else if (gg === 20) st.pollici = true; else if (gg === 21) st.pollici = false;
          else if (gg === 90) st.ass = true; else if (gg === 91) st.ass = false;
          else if (gg === 94) st.perGiro = false; else if (gg === 95) st.perGiro = true;
          else if (gg === 96) st.g96 = true; else if (gg === 97) st.g96 = false;
          else if (gg === 98) { if (tornio) st.perGiro = false; else st.ritornoR = false; }
          else if (gg === 99) { if (tornio) st.perGiro = true; else st.ritornoR = true; }
          else if (gg === 50 && tornio) { if (w.S !== undefined) { st.giriMax = w.S; w.S = undefined; } senzaAssi = true; }
          else if (gg === 92 && tornio && w.S !== undefined && w.X === undefined && w.Z === undefined) { st.giriMax = w.S; w.S = undefined; }
          else if ((gg === 10 || gg === 52 || gg === 92) && !tornio) { senzaAssi = true; if (gg !== 10) avvisa('G' + gg + ': spostamento dell\'origine non simulato', riga); }
          else if (gg === 32 || gg === 33) { st.moto = 32; mossa = 32; }
          else if (gg === 80) { st.ciclo = null; }
          else if ([73, 74, 76, 81, 82, 83, 84, 85, 86, 87, 88, 89].includes(gg) && !tornio) {
            st.ciclo = gg; st.zIniz = st.z;
            if (gg === 76 || gg === 87 || gg === 88) avvisa('ciclo G' + gg + ' simulato come foratura semplice', riga);
          }
          else if (tornio && [70, 71, 72, 73, 74, 75, 76, 90, 92, 94].includes(gg)) { avvisa('ciclo fisso del tornio G' + gg + ': non simulato, il percorso manca', riga); senzaAssi = true; }
          else if (gg === 65) numG = 65;
          else if (gg === 28 || gg === 30 || gg === 53) { numG = gg; }
          else if (gg === 31) { st.moto = 31; mossa = 31; }
          else if ([40, 41, 42, 43, 44, 49, 15, 16, 61, 64, 68, 69, 69.1, 54, 55, 56, 57, 58, 59, 54.1, 40.1, 5, 5.1, 8, 9].includes(gg)) {
            if (gg === 41 || gg === 42) avvisa('compensazione raggio G' + gg + ': la simulazione mostra il centro utensile del programma', riga);
          }
          else avvisa('G' + gg + ' non simulato', riga);
        }
        // G65: chiamata di macro con argomenti
        if (numG === 65) {
          const num = Math.round(w.P || 0);
          if (P.prog[num] === undefined) { avvisa('G65 P' + num + ': il sottoprogramma O' + num + ' non e nel testo', riga); continue; }
          const nuovi = {};
          for (const l in w) if (LETTERE_VAR[l] && w[l] !== undefined && l !== 'P' && l !== 'L') nuovi[LETTERE_VAR[l]] = w[l];
          const volte = Math.max(1, Math.round(w.L || 1));
          pila.push({ ritorno: pc, locali, volte: volte - 1, inizio: P.prog[num] + 1, args: nuovi });
          if (pila.length > 8) throw errore('troppe chiamate una dentro l\'altra');
          locali = Object.assign({}, nuovi);
          pc = P.prog[num] + 1;
          continue;
        }
        if (numG === 28 || numG === 30 || numG === 53) { avvisa('G' + numG + ': ritorno al punto macchina, non simulato', riga); continue; }
        if (w.F !== undefined) st.f = w.F * (st.perGiro ? 1 : sc);
        if (w.S !== undefined) { st.s = w.S; if (utAtt && !utAtt.s.includes(Math.round(w.S))) utAtt.s.push(Math.round(w.S)); }
        if (w.T !== undefined) {
          const tt = Math.round(w.T);
          st.t = tornio && tt > 99 ? Math.floor(tt / 100) : tt;
          utAtt = utensili.find(u => u.t === st.t);
          if (!utAtt) { utAtt = { t: st.t, riga, s: [], f: [], lunghezza: 0, commento: st.ultimoCommento && /T\s*\d/.test(raw) ? b.commento : '' }; utensili.push(utAtt); }
          if (!utAtt.commento && b.commento) utAtt.commento = b.commento;
        }
        if (w.F !== undefined && utAtt && !utAtt.f.includes(w.F)) utAtt.f.push(w.F);
        // M
        for (const mm of w.M) {
          const k = Math.round(mm);
          if (k === 30 || k === 2) { if (pila.length === 0) st.finito = true; }
          else if (k === 0 || k === 1) messaggi.push({ tipo: 'stop', testo: 'M' + k + (st.ultimoCommento ? ': ' + st.ultimoCommento : ''), riga });
          else if (k === 98) {
            const num = Math.round(w.P || 0);
            if (P.prog[num] === undefined) { avvisa('M98 P' + num + ': il sottoprogramma O' + num + ' non e nel testo', riga); continue; }
            const volte = Math.max(1, Math.round(w.L || 1));
            pila.push({ ritorno: pc, locali, volte: volte - 1, inizio: P.prog[num] + 1, args: null, m98: true });
            if (pila.length > 8) throw errore('troppe chiamate una dentro l\'altra');
            pc = P.prog[num] + 1;
          } else if (k === 99) {
            const c = pila[pila.length - 1];
            if (!c) { if (pila.length === 0) st.finito = true; continue; }
            if (c.volte > 0) { c.volte--; pc = c.inizio; if (c.args) locali = Object.assign({}, c.args); continue; }
            pila.pop(); pc = c.ritorno; if (!c.m98) locali = c.locali;
          }
        }
        if (w.M.some(k => Math.round(k) === 98 || Math.round(k) === 99) || senzaAssi) continue;
        // coordinate
        const haAssi = w.X !== undefined || w.Y !== undefined || w.Z !== undefined || w.U !== undefined || w.W !== undefined || (!tornio && w.V !== undefined);
        if (!haAssi && mossa === null) continue;
        let x = st.x, y = st.y, z = st.z;
        if (tornio) {
          if (w.X !== undefined) x = st.ass ? w.X * sc : st.x + w.X * sc;
          if (w.Z !== undefined) z = st.ass ? w.Z * sc : st.z + w.Z * sc;
          if (w.U !== undefined) x = st.x + w.U * sc;
          if (w.W !== undefined) z = st.z + w.W * sc;
          if (w.Y !== undefined) y = st.ass ? w.Y * sc : st.y + w.Y * sc;
        } else {
          if (st.ciclo && !mossa) {
            // nei cicli Z e R sono i dati del ciclo
            if (w.Z !== undefined) st.zc = st.ass ? w.Z * sc : (st.r !== null ? st.r : st.z) + w.Z * sc;
            if (w.R !== undefined) st.r = st.ass ? w.R * sc : st.z + w.R * sc;
            if (w.Q !== undefined) st.q = w.Q;
            const xc = w.X !== undefined ? (st.ass ? w.X * sc : st.x + w.X * sc) : st.x;
            const yc = w.Y !== undefined ? (st.ass ? w.Y * sc : st.y + w.Y * sc) : st.y;
            if (w.X !== undefined || w.Y !== undefined || w.Z !== undefined || w.R !== undefined || w.G.some(g => [73, 81, 82, 83, 84, 85, 86, 87, 88, 89].includes(Math.round(g)))) cicloForo(xc, yc, riga);
            continue;
          }
          if (w.X !== undefined) x = st.ass ? w.X * sc : st.x + w.X * sc;
          if (w.Y !== undefined) y = st.ass ? w.Y * sc : st.y + w.Y * sc;
          if (w.Z !== undefined) z = st.ass ? w.Z * sc : st.z + w.Z * sc;
        }
        const g = mossa !== null ? mossa : st.moto;
        if (g === 0) muovi(x, y, z, true, riga);
        else if (g === 1 || g === 32 || g === 31) {
          if (g === 32) { const pf = w.F !== undefined ? w.F : (w.E !== undefined ? w.E : st.f); muovi(x, y, z, false, riga, true); if (!(pf > 0)) avvisa('filettatura senza passo F', riga); }
          else muovi(x, y, z, false, riga, true);
          if (g === 31) { st.saltoX = x; st.saltoY = y; st.saltoZ = z; avvisa('G31 tastatura: simulata come se il tastatore toccasse alla fine della corsa', riga); }
        } else if (g === 2 || g === 3) arco(x, y, z, g === 2, w, riga);
      }
    } catch (e) {
      if (!e.iso) throw e;
      return risultato(e.message + ' (riga ' + (pc) + ')');
    }
    return risultato(null);

    function risultato(err) {
      const fin = v => (isFinite(v) ? v : 0);
      const L = {};
      for (const k of ['x', 'y', 'z']) L[k] = { min: fin(lim[k][0]), max: fin(lim[k][1]), minLavoro: isFinite(lim.lavoro[k][0]) ? lim.lavoro[k][0] : null, maxLavoro: isFinite(lim.lavoro[k][1]) ? lim.lavoro[k][1] : null };
      return { modo, segmenti, limiti: L, utensili, tempo: tempo + st.pausa / 60, avvisi, messaggi, errore: err, vars: Object.assign({}, globali), locali: Object.assign({}, locali), righe: P.righe };
    }
  }

  /** Tornio o fresa dal contenuto. */
  function indovinaModo(testo) {
    const t = String(testo || '').toUpperCase().replace(/\([^)]*\)/g, '');
    let tor = 0, fre = 0;
    if (/\bG18\b/.test(t)) tor += 2;
    if (/\bG9[67]\b/.test(t)) tor += 2;
    if (/\bG50\s*S/.test(t)) tor += 2;
    if (/\bT\d{4}\b/.test(t)) tor += 2;
    if (/\bG3[23]\b/.test(t)) tor += 1;
    if (/[^A-Z]U-?\d|[^A-Z]W-?\d/.test(' ' + t) && !/#/.test(t)) tor += 1;
    if (/\bG17\b/.test(t)) fre += 2;
    if (/\bM0?6\b/.test(t)) fre += 2;
    if (/\bG4[39]\b/.test(t)) fre += 2;
    if (/\bG8[1-9]\b|\bG73\b/.test(t)) fre += 1;
    if (/\bY-?[\d.#[]/.test(t)) fre += 2;
    return tor > fre ? 'tornio' : 'fresa';
  }

  const Iso = { eseguiISO: esegui, indovinaModo, pulisciRiga: pulisci };
  Object.assign(O, Iso);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
