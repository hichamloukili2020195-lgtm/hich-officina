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
    const segnalazioni = [];   // {riga, livello:'errore'|'avviso', testo}: il controllo del programma
    const avvisa = (m, riga, livello) => {
      const t = (riga !== undefined ? 'Riga ' + (riga + 1) + ': ' : '') + m;
      if (avvisi.length < 40 && !avvisi.includes(t)) avvisi.push(t);
      if (segnalazioni.length < 300 && !segnalazioni.some(x => x.riga === riga && x.testo === m)) segnalazioni.push({ riga: riga === undefined ? -1 : riga, livello: livello || 'avviso', testo: m });
    };
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
      const s = { x0: st.x, y0: st.y, z0: st.z, x, y, z, rapido, riga, t: st.t, f: st.f, n: Math.round(st.g96 ? giriAttuali(x) : st.s), g96: st.g96, taglio: !!taglio };
      const l = Math.hypot((x - st.x) / (tornio ? 2 : 1), y - st.y, z - st.z);
      if (l < 1e-9) return;
      segmenti.push(s);
      segna('x', x, !rapido); segna('y', y, !rapido); segna('z', z, !rapido);
      if (!rapido && segmenti.length > 1) { segna('x', st.x, true); segna('y', st.y, true); segna('z', st.z, true); }
      let fmm = st.f;
      if (!rapido && st.perGiro) fmm = st.f * giriAttuali((st.x + x) / 2);
      tempo += rapido ? l / RAPIDO : (fmm > 0 ? l / fmm : 0);
      if (!rapido && !(st.f > 0)) avvisa('movimento di lavoro senza avanzamento F', riga, 'errore');
      if (!rapido && !st.mandrino && !st.mandrinoAvvisato && opz.controlloMandrino !== false) { avvisa('taglio con il mandrino fermo: manca M3 o M4 (o la S)', riga, 'errore'); st.mandrinoAvvisato = true; }
      if (rapido && !tornio && z < -1e-6 && st.z < -1e-6 && Math.hypot(x - st.x, y - st.y) > 1e-6) avvisa('rapido in X Y sotto Z0: possibile urto con il pezzo', riga, 'errore');
      if (rapido && !tornio && !st.inCiclo && z < -1e-6 && st.z >= -1e-6) avvisa('rapido che scende sotto Z0: controlla che li non ci sia materiale', riga, 'avviso');
      if ([x, y, z].some(v => Math.abs(v) > 3000)) avvisa('quota oltre 3000 mm: forse un numero letto male', riga, 'errore');
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
      st.inCiclo = true;
      try { cicloForoDentro(x, y, riga); } finally { st.inCiclo = false; }
    }
    function cicloForoDentro(x, y, riga) {
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

    // ----- cicli fissi del tornio (forma a due blocchi: il primo con U/R o P/Q/R, il secondo con i dati) -----
    const cicli = {};
    let g70 = null;   // {fine: riga di Q, ritorno}
    function profiloPQ(nP, nQ, riga) {
      const kP = etichetta(nP, riga), kQ = etichetta(nQ, riga);
      if (kP < 0 || kQ < 0 || kQ < kP) return null;
      const pts = [{ a: st.z, b: st.x / 2 }];
      let x = st.x, z = st.z, g = 0;
      for (let k = kP; k <= kQ; k++) {
        const t = pulisci(P.righe[k]).testo;
        if (!t) continue;
        const w = parole(t, k), sc = scala();
        w.G.forEach(v => { const gg = Math.round(v); if ([0, 1, 2, 3].includes(gg)) g = gg; });
        let xn = x, zn = z;
        if (w.X !== undefined) xn = w.X * sc; if (w.Z !== undefined) zn = w.Z * sc;
        if (w.U !== undefined) xn = x + w.U * sc; if (w.W !== undefined) zn = z + w.W * sc;
        if (xn === x && zn === z) continue;
        if ((g === 2 || g === 3) && w.R !== undefined && O.centroArco) {
          const p0 = { a: z, b: x / 2 }, p1 = { a: zn, b: xn / 2 };
          const c = O.centroArco(p0, p1, w.R * sc, g === 2);
          if (c) {
            const a0 = Math.atan2(p0.b - c.b, p0.a - c.a), a1 = Math.atan2(p1.b - c.b, p1.a - c.a), rr = Math.hypot(p0.a - c.a, p0.b - c.b);
            let d = a1 - a0; if (g === 2) { while (d > 1e-9) d -= 2 * Math.PI; } else { while (d < -1e-9) d += 2 * Math.PI; }
            const n = Math.max(4, Math.ceil(Math.abs(d) * rr / 0.3));
            for (let i = 1; i < n; i++) { const an = a0 + d * i / n; pts.push({ a: c.a + rr * Math.cos(an), b: c.b + rr * Math.sin(an) }); }
          }
        }
        pts.push({ a: zn, b: xn / 2 });
        x = xn; z = zn;
      }
      return { pts, kQ };
    }
    function cicloTornio(gg, w, riga) {
      const sc = scala();
      if (gg === 70) {
        if (w.P === undefined || w.Q === undefined) return false;
        const kP = etichetta(Math.round(w.P), riga), kQ = etichetta(Math.round(w.Q), riga);
        if (kP < 0 || kQ < 0) return false;
        g70 = { fine: kQ, ritorno: pc, x: st.x, z: st.z };
        pc = kP;
        return true;
      }
      const datiCiclo = gg === 71 ? (w.P !== undefined && w.Q !== undefined) : gg === 74 ? w.Z !== undefined : (w.X !== undefined || w.Z !== undefined);
      if (!datiCiclo) {
        // primo blocco: i dati del ciclo
        cicli[gg] = Object.assign({}, w);
        return true;
      }
      const x0 = st.x, z0 = st.z;
      if (gg === 71) {
        const prima = cicli[71] || {};
        const ap = (prima.U !== undefined ? prima.U : 1) * sc;
        const pr = profiloPQ(Math.round(w.P), Math.round(w.Q), riga);
        if (!pr || !O.sgrossaTornio) return false;
        const zLim = pr.pts.length > 1 && Math.abs(pr.pts[1].b - pr.pts[0].b) < 1e-9 ? pr.pts[1].a : pr.pts[0].a;
        const sg = O.sgrossaTornio(pr.pts.slice(1), x0, ap, (w.U || 0) * sc, (w.W || 0) * sc, z0, zLim + (w.W || 0) * sc);
        if (w.F !== undefined) st.f = w.F;
        sg.passate.forEach(pa => {
          muovi(pa.x, st.y, z0, true, riga);
          muovi(pa.x, st.y, pa.z1, false, riga, true);
          muovi(pa.x + 1, st.y, pa.z1 + 0.5, false, riga, true);
          muovi(pa.x + 1, st.y, z0, true, riga);
        });
        // passata sul profilo con il sovrametallo
        if (sg.passate.length) {
          const sx = (w.U || 0) * sc, sz = (w.W || 0) * sc;
          pr.pts.slice(1).forEach((q, i) => muovi(2 * q.b + sx, st.y, Math.min(q.a + sz, z0), i === 0, riga, i > 0));
        }
        muovi(x0, st.y, st.z, true, riga);
        muovi(x0, st.y, z0, true, riga);
        if (!sg.monotono) avvisa('profilo del G71 con gole: la simulazione non le scava', riga);
        pc = pr.kQ + 1;
        return true;
      }
      if (gg === 74) {
        const zf = w.Z * sc, q = (w.Q || 0) / 1000 * sc || Math.abs(zf - z0);
        if (w.F !== undefined) st.f = w.F;
        let z = z0, k = 0;
        while (z > zf + 1e-9 && k++ < 2000) { const zn = Math.max(z - q, zf); muovi(st.x, st.y, zn, false, riga, true); muovi(st.x, st.y, zn + 0.5, true, riga); z = zn; }
        muovi(st.x, st.y, z0, true, riga);
        return true;
      }
      if (gg === 75) {
        const xf = w.X * sc, zf = w.Z !== undefined ? w.Z * sc : z0, dq = (w.Q || 0) / 1000 * sc;
        if (w.F !== undefined) st.f = w.F;
        const zz = [];
        if (dq > 0) { for (let z = z0; z > zf + 1e-9; z -= dq) zz.push(z); }
        zz.push(zf);
        zz.forEach(z => { muovi(x0, st.y, z, true, riga); muovi(xf, st.y, z, false, riga, true); muovi(x0, st.y, z, true, riga); });
        muovi(x0, st.y, z0, true, riga);
        return true;
      }
      if (gg === 76) {
        const prima = cicli[76] || {};
        const h = (w.P || 0) / 1000 * sc, d1 = (w.Q || 0) / 1000 * sc, xf = w.X * sc, zf = w.Z * sc, i = (w.R || 0) * sc * 2;
        if (!(h > 0) || !(d1 > 0)) return false;
        const fin = prima.P !== undefined ? Math.floor(Math.round(prima.P) / 10000) : 1;
        if (w.F !== undefined) st.f = w.F;
        const xs = xf + 2 * h + i;    // diametro della cresta all'inizio
        const prof = [];
        for (let k = 1; prof.length < 500; k++) { const p = Math.min(d1 * Math.sqrt(k), h); prof.push(p); if (p >= h - 1e-9) break; }
        for (let k = 0; k < fin; k++) prof.push(h);
        prof.forEach(p => {
          muovi(xs - 2 * p, st.y, z0, true, riga);
          muovi(xf + 2 * h - 2 * p, st.y, zf, false, riga, true);
          muovi(x0, st.y, zf, true, riga);
          muovi(x0, st.y, z0, true, riga);
        });
        return true;
      }
      return false;
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
        if (g70 && pc === g70.fine + 1) { pc = g70.ritorno; g70 = null; }   // finitura G70 finita: si torna dopo il G70
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
        // blocco normale (una riga che non si capisce si segnala e si salta)
        let w;
        try { w = parole(t, riga); } catch (e) {
          if (!e.iso) throw e;
          avvisa(e.message, riga, 'errore');
          if (!st.primoErrore) st.primoErrore = e.message + ' (riga ' + (riga + 1) + ')';
          continue;
        }
        const sc = scala();
        let mossa = null, numG = null, senzaAssi = false;
        for (const g of w.G) {
          const gg = Math.round(g * 10) / 10;
          if (gg === 0 || gg === 1 || gg === 2 || gg === 3) { if (st.ciclo) avvisa('ciclo fisso G' + st.ciclo + ' chiuso senza G80', riga, 'avviso'); st.moto = gg; mossa = gg; st.ciclo = null; }
          else if (gg === 4) { st.pausa += (w.P !== undefined ? w.P / 1000 : (w.X || w.U || 0)); senzaAssi = true; }
          else if (gg === 17 || gg === 18 || gg === 19) st.piano = gg;
          else if (gg === 20) st.pollici = true; else if (gg === 21) st.pollici = false;
          else if (gg === 90) st.ass = true; else if (gg === 91) st.ass = false;
          else if (gg === 94) st.perGiro = false; else if (gg === 95) st.perGiro = true;
          else if (gg === 96) { st.g96 = true; if (tornio && !st.giriMax && !w.G.some(v => Math.round(v) === 50 || Math.round(v) === 92)) avvisa('G96 (Vc costante) senza limite dei giri G50 S... o G92 S...: vicino al centro il mandrino va al massimo', riga, 'errore'); } else if (gg === 97) st.g96 = false;
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
          else if (tornio && [70, 71, 74, 75, 76].includes(gg)) { if (!cicloTornio(gg, w, riga)) avvisa('ciclo G' + gg + ' scritto in un modo che non simulo: il percorso manca', riga); senzaAssi = true; numG = 'ciclo'; }
          else if (tornio && [72, 73, 90, 92, 94].includes(gg)) { avvisa('ciclo fisso del tornio G' + gg + ': non simulato, il percorso manca', riga); senzaAssi = true; }
          else if (gg === 65) numG = 65;
          else if (gg === 28 || gg === 30 || gg === 53) { numG = gg; }
          else if (gg === 31) { st.moto = 31; mossa = 31; }
          else if ([40, 41, 42, 43, 44, 49, 15, 16, 61, 64, 68, 69, 69.1, 54, 55, 56, 57, 58, 59, 54.1, 40.1, 5, 5.1, 8, 9].includes(gg)) {
            if (gg === 41 || gg === 42) avvisa('compensazione raggio G' + gg + ': la simulazione mostra il profilo programmato, non il centro utensile', riga, 'nota');
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
        if (w.F !== undefined && ((st.perGiro && w.F > 3 && !w.G.some(v => [32, 33, 76].includes(Math.round(v))) && st.moto !== 32) || (!st.perGiro && w.F > 20000))) avvisa('avanzamento F' + w.F + ' molto alto: controlla (numero letto male?)', riga, 'avviso');
        if (w.H !== undefined && w.G.some(v => Math.round(v) === 43) && st.t && Math.round(w.H) !== st.t) avvisa('G43 H' + Math.round(w.H) + ' con l\'utensile T' + st.t + ': correttore di un altro utensile?', riga, 'avviso');
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
          if (k === 3 || k === 4) { st.mandrino = true; st.mandrinoAvvisato = false; if (!(st.s > 0) && w.S === undefined) avvisa('mandrino acceso senza giri S', riga, 'avviso'); }
          else if (k === 5 || k === 6) st.mandrino = false;
          if (k === 30 || k === 2) { st.mandrino = false; if (pila.length === 0) st.finito = true; }
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
      avvisa(e.message, pc - 1, 'errore');
      return risultato(e.message + ' (riga ' + (pc) + ')');
    }
    return risultato(st.primoErrore || null);

    function risultato(err) {
      const fin = v => (isFinite(v) ? v : 0);
      const L = {};
      for (const k of ['x', 'y', 'z']) L[k] = { min: fin(lim[k][0]), max: fin(lim[k][1]), minLavoro: isFinite(lim.lavoro[k][0]) ? lim.lavoro[k][0] : null, maxLavoro: isFinite(lim.lavoro[k][1]) ? lim.lavoro[k][1] : null };
      segnalazioni.sort((a, b) => (a.livello === b.livello ? 0 : a.livello === 'errore' ? -1 : 1) || a.riga - b.riga);
      return { modo, segmenti, limiti: L, utensili, tempo: tempo + st.pausa / 60, avvisi, messaggi, errore: err, segnalazioni, vars: Object.assign({}, globali), locali: Object.assign({}, locali), righe: P.righe };
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

  /** Controllo del programma: esecuzione piu i controlli sul testo. Ritorna il risultato di esegui con le segnalazioni. */
  function controlla(testo, opz) {
    const r = esegui(testo, opz);
    const S = r.segnalazioni, righe = r.righe;
    const metti = (riga, livello, t) => { if (!S.some(x => x.riga === riga && x.testo === t)) S.push({ riga, livello, testo: t }); };
    let fine = false;
    righe.forEach((l, i) => {
      const senza = l.replace(/;.*$/, '');
      const ap = (senza.match(/\(/g) || []).length, ch = (senza.match(/\)/g) || []).length;
      if (ap !== ch) metti(i, 'errore', 'parentesi del commento non chiuse');
      const t = pulisci(l).testo;
      if (/\bM0?(30|2|99)\b/.test(t)) fine = true;
      if (r.modo === 'fresa' && /(^|[^A-Z#])T\d+/.test(t) && !/\bM0?6\b/.test(t)) {
        const dopo = righe.slice(i + 1, i + 3).map(x => pulisci(x).testo).join(' ');
        if (!/\bM0?6\b/.test(dopo) && !/G65|M98/.test(t)) metti(i, 'avviso', 'T senza M6: l\'utensile si prepara ma non si cambia');
      }
    });
    if (!fine && righe.some(l => pulisci(l).testo)) metti(righe.length - 1, 'avviso', 'manca la fine del programma (M30 o M2)');
    S.sort((a, b) => (a.livello === b.livello ? 0 : a.livello === 'errore' ? -1 : 1) || a.riga - b.riga);
    return r;
  }

  /**
   * Pulizia del testo letto da una foto: lettere maiuscole, O e I lette al posto di 0 e 1 dentro i numeri,
   * virgole al posto dei punti, spazi dentro i numeri, numeri di riga dello schermo, righe che non sono programma.
   * Ritorna {testo, cambiate, tolte}.
   */
  function pulisciLettura(testo) {
    let cambiate = 0, tolte = 0, numeri = 0;
    const out = [];
    String(testo || '').replace(/\r/g, '').split('\n').forEach(riga => {
      let r = riga.replace(/[‘’´`]/g, "'").replace(/[“”]/g, '"').replace(/\t/g, ' ').trim();
      if (!r) return;
      const prima = r;
      // commenti a parte: non si toccano
      const pezzi = r.split(/(\([^)]*\)?)/);
      r = pezzi.map(p => {
        if (p.startsWith('(')) return p.toUpperCase();
        let q = p.toUpperCase();
        q = q.replace(/(\d)\s*[,]\s*(\d)/g, '$1.$2');                   // 10,5 -> 10.5
        q = q.replace(/([A-Z#])\s+(?=[-+]?[\d.#[])/g, '$1');              // X 10 -> X10
        q = q.replace(/([-+\d.])\s+(?=[\d.])/g, (m0, a) => a);             // 10 .5 -> 10.5
        // lettere lette al posto delle cifre, dentro un numero
        q = q.replace(/[\d.][\dOLI|.]*/g, m0 => m0.replace(/O/g, '0').replace(/[LI|]/g, '1'));   // 1O.5 -> 10.5, 2OO -> 200
        q = q.replace(/([GM])O(?=[\dO])/g, '$10').replace(/([GM])O(?=[\dO])/g, '$10');            // GO1 -> G01
        let s2 = '';
        const mappa = { S: '5', B: '8', Z: '2', D: '0', Q: '0' };
        for (let i = 0; i < q.length; i++) {
          const c = q[i], pr = s2[s2.length - 1] || '', nx = q[i + 1] || '';
          if (mappa[c] && /[-+\d.]/.test(pr) && /[\d.]/.test(nx) && !/[A-Z]/.test(pr)) { s2 += mappa[c]; continue; }   // Z-S.0 -> Z-5.0
          s2 += c;
        }
        return s2;
      }).join('');
      // numero di riga dello schermo davanti (non la N del programma): si toglie, non conta come correzione
      const senzaNumero = r.replace(/^\d{1,5}\s+(?=[A-Z%(#:])/, '');
      const primaN = prima.toUpperCase().replace(/^\d{1,5}\s+(?=[A-Z%(#:])/, '');
      if (senzaNumero !== r) numeri++;
      r = senzaNumero;
      if (!/^(%|[O:]\d+|\(|;)/.test(r) && !/[GMXYZUWFSTNIJKRPQ#]-?[\d.#[]/.test(r) && !/^(IF|WHILE|END|GOTO|DO)/.test(r)) { tolte++; return; }
      if (r !== primaN && r.replace(/\s+/g, '') !== primaN.replace(/\s+/g, '').replace(/,/g, '.')) cambiate++;
      out.push(r);
    });
    return { testo: out.join('\n'), cambiate, tolte, numeri };
  }

  const Iso = { eseguiISO: esegui, controllaISO: controlla, pulisciLettura, indovinaModo, pulisciRiga: pulisci };
  Object.assign(O, Iso);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
