// ===== Hich-Officina: vincoli tra gli elementi del disegno (senza interfaccia) =====
// Ogni profilo puo portare dei vincoli in e.vinc: [{t, i, ...}]. Il segmento i e quello che arriva al vertice i (dal vertice i-1;
// per i = 0 in un profilo chiuso, quello dall'ultimo). Tipi:
//   H, V        segmento orizzontale / verticale
//   L (v)       lunghezza = v (numero o formula con i parametri)
//   PAR (e2,j)  parallelo al segmento j del profilo e2;  PERP: perpendicolare;  UGU: stessa lunghezza
//   FIX (x,y)   vertice bloccato
//   COI (e2,j)  vertice i coincide con il vertice j del profilo e2
//   RAG (v)     raggio dell'arco che arriva al vertice i
// Altri elementi: rettangolo {t:'LARG'|'ALT', v}, cerchio {t:'DIAM', v}, asola {t:'LARGA', v} (larghezza).
// Il risolutore sposta i vertici il meno possibile (i primi punti di un profilo si muovono meno degli ultimi) con minimi quadrati smorzati.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  const r4 = x => Math.round(x * 10000) / 10000 + 0;
  const num = v => { const n = Number(String(v === undefined || v === null ? '' : v).replace(',', '.')); return v === '' || v === null || v === undefined ? NaN : n; };
  const copia = e => JSON.parse(JSON.stringify(e));
  const NOMI = { H: 'Orizzontale', V: 'Verticale', L: 'Lunghezza', PAR: 'Parallelo', PERP: 'Perpendicolare', UGU: 'Stessa lunghezza', FIX: 'Punto bloccato', COI: 'Punti coincidenti', RAG: 'Raggio', LARG: 'Larghezza', ALT: 'Altezza', DIAM: 'Diametro', LARGA: 'Larghezza asola' };
  const SEGMENTO = ['H', 'V', 'L', 'PAR', 'PERP', 'UGU'];

  const prec = (e, i) => (i > 0 ? i - 1 : (e.chiuso ? e.punti.length - 1 : -1));
  const valore = (v, errori, nome) => { const x = O.espressione(String(v)); if (!isFinite(x)) { errori.push(nome + ': valore non valido (' + v + ')'); return NaN; } return x; };

  /** Testo corto di un vincolo, per l'elenco e per il disegno. */
  function descrivi(c) {
    const n = NOMI[c.t] || c.t;
    if (c.t === 'L' || c.t === 'RAG' || c.t === 'LARG' || c.t === 'ALT' || c.t === 'DIAM' || c.t === 'LARGA') return n + ' = ' + c.v;
    if (c.t === 'FIX') return n + ' (' + c.x + '; ' + c.y + ')';
    return n;
  }
  /** Sigla da mostrare sul disegno. */
  const sigla = c => ({ H: 'H', V: 'V', L: 'L', PAR: '∥', PERP: '⊥', UGU: '=', FIX: '⚓', COI: '◎', RAG: 'R', LARG: 'L', ALT: 'A', DIAM: 'Ø', LARGA: 'L' })[c.t] || '?';

  /** Aggiunge un vincolo a un'entita (sostituisce uno uguale sullo stesso segmento). Ritorna l'entita nuova (stesso id) o {errore}. */
  function aggiungiVincolo(e, c) {
    const n = copia(e); n.vinc = (n.vinc || []).filter(q => !(q.t === c.t && q.i === c.i && (c.t === 'PAR' || c.t === 'PERP' || c.t === 'UGU' || c.t === 'COI' ? q.e2 === c.e2 && q.j === c.j : true)));
    if (e.tipo === 'poli') {
      const k = e.punti.length;
      if (!(c.i >= 0 && c.i < k)) return { errore: 'Vertice non valido.' };
      if (SEGMENTO.includes(c.t) && prec(e, c.i) < 0) return { errore: 'Scegli un vertice che abbia un segmento prima di se.' };
      if (c.t === 'H') n.vinc = n.vinc.filter(q => !(q.t === 'V' && q.i === c.i));
      if (c.t === 'V') n.vinc = n.vinc.filter(q => !(q.t === 'H' && q.i === c.i));
      if (c.t === 'RAG' && !(e.punti[c.i].tratto === 'cw' || e.punti[c.i].tratto === 'ccw')) return { errore: 'Il tratto che arriva a questo punto non e un arco.' };
    }
    n.vinc.push(c);
    return n;
  }
  const togliVincolo = (e, k) => { const n = copia(e); n.vinc = (n.vinc || []).filter((q, i) => i !== k); if (!n.vinc.length) delete n.vinc; return n; };

  // ---------- risolutore ----------
  function risolviSistema(A, b, n) {   // elimina di Gauss con pivot; A n x n (modificata)
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-14) return null;
      [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
      for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; if (f) { for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; } }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = s / A[r][r]; }
    return x;
  }

  /**
   * Applica tutti i vincoli. opz.fisso = {id, i}: un vertice che l'utente sta trascinando e che non deve spostarsi.
   * Ritorna {entita: [le entita cambiate, copie con lo stesso id], ok, errori: [...], scarto (mm)}. Non tocca la lista originale.
   */
  function risolvi(lista, opz) {
    opz = opz || {};
    const errori = [], per = new Map();
    (lista || []).forEach(e => per.set(e.id, e));
    const cambiate = new Map();
    const lavora = id => { if (!cambiate.has(id)) cambiate.set(id, copia(per.get(id))); return cambiate.get(id); };
    // 1. vincoli che si risolvono da soli (rettangolo, cerchio, asola, raggio)
    (lista || []).forEach(e => {
      (e.vinc || []).forEach(c => {
        if (e.tipo === 'rett' && (c.t === 'LARG' || c.t === 'ALT')) {
          const v = valore(c.v, errori, NOMI[c.t]); if (!(v > 0)) { if (isFinite(v)) errori.push(NOMI[c.t] + ': deve essere maggiore di zero.'); return; }
          const w = lavora(e.id), x0 = Math.min(num(w.x0), num(w.x1)), y0 = Math.min(num(w.y0), num(w.y1));
          if (c.t === 'LARG') { w.x0 = r4(x0); w.x1 = r4(x0 + v); w.y0 = r4(y0); w.y1 = r4(Math.max(num(w.y0), num(w.y1))); } else { w.y0 = r4(y0); w.y1 = r4(y0 + v); w.x0 = r4(x0); w.x1 = r4(Math.max(num(w.x0), num(w.x1))); }
        } else if (e.tipo === 'cerchio' && c.t === 'DIAM') { const v = valore(c.v, errori, 'Diametro'); if (v > 0) lavora(e.id).r = r4(v / 2); }
        else if (e.tipo === 'asola' && c.t === 'LARGA') { const v = valore(c.v, errori, 'Larghezza asola'); if (v > 0) lavora(e.id).w = r4(v); }
      });
    });
    // 2. profili con vincoli (e quelli a cui si riferiscono)
    const poli = (lista || []).filter(e => e.tipo === 'poli' && (e.vinc || []).some(c => ['H', 'V', 'L', 'PAR', 'PERP', 'UGU', 'FIX', 'COI', 'RAG'].includes(c.t)));
    const inclusi = new Map();
    poli.forEach(e => { inclusi.set(e.id, true); (e.vinc || []).forEach(c => { if (c.e2 !== undefined && per.get(c.e2) && per.get(c.e2).tipo === 'poli') inclusi.set(c.e2, true); }); });
    if (opz.fisso && per.get(opz.fisso.id) && per.get(opz.fisso.id).tipo === 'poli') inclusi.set(opz.fisso.id, true);
    if (!inclusi.size) { return { entita: Array.from(cambiate.values()), ok: !errori.length, errori, scarto: 0 }; }
    const idx = new Map(), x0 = [];   // (id:k) -> indice della x ; la y e indice+1
    const entitaI = [];
    inclusi.forEach((_, id) => { const e = per.get(id); entitaI.push(e); e.punti.forEach((p, k) => { idx.set(id + ':' + k, x0.length); x0.push(num(p.x), num(p.y)); }); });
    const X = x0.slice(), N = X.length;
    const P = (v, id, k) => { const a = idx.get(id + ':' + k); return [v[a], v[a + 1]]; };
    // residui: ogni voce {pes, f(v) -> [numeri]}
    const R = [];
    const segmento = (e, i) => { const a = prec(e, i); return a < 0 ? null : [a, i]; };
    entitaI.forEach(e => {
      (e.vinc || []).forEach(c => {
        const nome = NOMI[c.t];
        if (c.t === 'FIX') R.push({ c, f: v => { const p = P(v, e.id, c.i); return [p[0] - num(c.x), p[1] - num(c.y)]; } });
        else if (c.t === 'COI') { const e2 = per.get(c.e2); if (!e2 || !(c.j >= 0 && c.j < e2.punti.length)) { errori.push(nome + ': l\'altro elemento non c\'e piu.'); return; } R.push({ c, f: v => { const p = P(v, e.id, c.i), q = P(v, e2.id, c.j); return [p[0] - q[0], p[1] - q[1]]; } }); }
        else if (SEGMENTO.includes(c.t)) {
          const s = segmento(e, c.i); if (!s) { errori.push(nome + ': segmento non valido.'); return; }
          const d = v => { const a = P(v, e.id, s[0]), b = P(v, e.id, s[1]); return [b[0] - a[0], b[1] - a[1]]; };
          if (c.t === 'H') R.push({ c, f: v => [d(v)[1]] });
          else if (c.t === 'V') R.push({ c, f: v => [d(v)[0]] });
          else if (c.t === 'L') { const L = valore(c.v, errori, 'Lunghezza'); if (!(L > 0)) { if (isFinite(L)) errori.push('Lunghezza: deve essere maggiore di zero.'); return; } R.push({ c, f: v => { const q = d(v); return [Math.hypot(q[0], q[1]) - L]; } }); }
          else {
            const e2 = per.get(c.e2), s2 = e2 && e2.tipo === 'poli' ? segmento(e2, c.j) : null;
            if (!s2) { errori.push(nome + ': l\'altro segmento non c\'e piu.'); return; }
            const d2 = v => { const a = P(v, e2.id, s2[0]), b = P(v, e2.id, s2[1]); return [b[0] - a[0], b[1] - a[1]]; };
            if (c.t === 'PAR') R.push({ c, f: v => { const p = d(v), q = d2(v), L = Math.hypot(q[0], q[1]) || 1; return [(p[0] * q[1] - p[1] * q[0]) / L]; } });
            else if (c.t === 'PERP') R.push({ c, f: v => { const p = d(v), q = d2(v), L = Math.hypot(q[0], q[1]) || 1; return [(p[0] * q[0] + p[1] * q[1]) / L]; } });
            else R.push({ c, f: v => { const p = d(v), q = d2(v); return [Math.hypot(p[0], p[1]) - Math.hypot(q[0], q[1])]; } });
          }
        }
      });
    });
    if (opz.fisso) { const o = opz.fisso, e = per.get(o.id); if (e && o.i >= 0 && o.i < e.punti.length) { const tx = num(e.punti[o.i].x), ty = num(e.punti[o.i].y); R.push({ c: { t: 'FIX' }, f: v => { const p = P(v, e.id, o.i); return [p[0] - tx, p[1] - ty]; } }); } }
    // quasi niente da risolvere: finito
    if (R.length) {
      // regolarizzazione: i primi punti di un profilo si muovono meno degli ultimi
      const reg = [];
      entitaI.forEach(e => { const k = e.punti.length; e.punti.forEach((p, j) => { const eps = 1e-4 * (1 + 9 * (1 - j / Math.max(1, k - 1))); const a = idx.get(e.id + ':' + j); reg.push([a, eps]); }); });
      const calcola = v => { const out = []; R.forEach(r => r.f(v).forEach(x => out.push(x))); const m = out.length; reg.forEach(([a, eps]) => { out.push(eps * (v[a] - x0[a]), eps * (v[a + 1] - x0[a + 1])); }); return { out, m }; };
      let mu = 1e-3, cur = calcola(X);
      const costo = c => c.out.reduce((s, x) => s + x * x, 0);
      for (let it = 0; it < 120; it++) {
        const maxV = Math.max(...cur.out.slice(0, cur.m).map(Math.abs), 0);
        if (maxV < 1e-9) break;
        // jacobiana numerica
        const M = cur.out.length, J = Array.from({ length: M }, () => new Array(N).fill(0));
        for (let k = 0; k < N; k++) { const h = 1e-6 * (1 + Math.abs(X[k])), s = X[k]; X[k] = s + h; const c2 = calcola(X); X[k] = s; for (let r = 0; r < M; r++) J[r][k] = (c2.out[r] - cur.out[r]) / h; }
        const JTJ = Array.from({ length: N }, () => new Array(N).fill(0)), g = new Array(N).fill(0);
        for (let r = 0; r < M; r++) { const Jr = J[r]; for (let a = 0; a < N; a++) { if (!Jr[a]) continue; g[a] -= Jr[a] * cur.out[r]; for (let b = a; b < N; b++) JTJ[a][b] += Jr[a] * Jr[b]; } }
        for (let a = 0; a < N; a++) for (let b = 0; b < a; b++) JTJ[a][b] = JTJ[b][a];
        let migliorato = false;
        for (let tent = 0; tent < 12; tent++) {
          const A = JTJ.map((riga, a) => riga.map((x, b) => (a === b ? x + mu * (1 + x) : x)));
          const dx = risolviSistema(A, g.slice(), N);
          if (!dx) { mu *= 10; continue; }
          const Y = X.map((x, k) => x + dx[k]), cY = calcola(Y);
          if (costo(cY) < costo(cur)) { for (let k = 0; k < N; k++) X[k] = Y[k]; cur = cY; mu = Math.max(1e-9, mu / 5); migliorato = true; break; }
          mu *= 8;
        }
        if (!migliorato) break;
      }
    }
    // scrive i punti risolti (solo se qualcosa e cambiato)
    entitaI.forEach(e => {
      let diverso = false; const w = copia(e);
      w.punti.forEach((p, k) => { const a = idx.get(e.id + ':' + k), nx = r4(X[a]), ny = r4(X[a + 1]); if (Math.abs(nx - num(p.x)) > 1e-9 || Math.abs(ny - num(p.y)) > 1e-9) diverso = true; p.x = nx; p.y = ny; });
      if (diverso) cambiate.set(e.id, w);
    });
    // verifica con le coordinate arrotondate
    const Xr = X.map(r4); let scarto = 0;
    R.forEach(r => { if (r.c.t === 'FIX' && r.c.x === undefined) { /* il punto trascinato: non conta */ } r.f(Xr).forEach(x => { scarto = Math.max(scarto, Math.abs(x)); }); });
    const ok = !errori.length && scarto < 2e-3;
    if (scarto >= 2e-3) errori.push('I vincoli sono in conflitto o non si possono rispettare insieme (scarto ' + r4(scarto) + ' mm).');
    // vincoli del raggio: si impostano dopo, sui punti arco
    (lista || []).forEach(e => {
      (e.vinc || []).forEach(c => {
        if (c.t !== 'RAG') return;
        const w = lavora(e.id), p = w.punti[c.i];
        if (!p || !(p.tratto === 'cw' || p.tratto === 'ccw')) { errori.push('Raggio: il tratto non e piu un arco.'); return; }
        const v = valore(c.v, errori, 'Raggio'); if (!(v > 0)) return;
        p.r = r4((num(p.r) < 0 ? -1 : 1) * v);
        const a = prec(w, c.i), q = w.punti[a], ch = Math.hypot(num(p.x) - num(q.x), num(p.y) - num(q.y));
        if (ch > 2 * v + 1e-6) errori.push('Raggio ' + v + ': troppo piccolo per i punti (la corda e ' + r4(ch) + ').');
      });
    });
    return { entita: Array.from(cambiate.values()), ok: !errori.length && ok, errori, scarto: r4(scarto) };
  }

  /** Segni da mostrare sul disegno: [{x, y, testo, e}] a meta di ogni segmento vincolato. */
  function segni(lista) {
    const out = [];
    (lista || []).forEach(e => {
      (e.vinc || []).forEach(c => {
        if (e.tipo === 'poli' && c.i !== undefined) {
          const a = prec(e, c.i), p = e.punti[c.i];
          if (!p) return;
          if (a < 0 || !SEGMENTO.includes(c.t)) { out.push({ x: num(p.x), y: num(p.y), testo: sigla(c), e: e.id }); return; }
          const q = e.punti[a]; out.push({ x: (num(p.x) + num(q.x)) / 2, y: (num(p.y) + num(q.y)) / 2, testo: sigla(c), e: e.id });
        } else if (e.tipo === 'rett') out.push({ x: (num(e.x0) + num(e.x1)) / 2, y: c.t === 'LARG' ? Math.min(num(e.y0), num(e.y1)) : (num(e.y0) + num(e.y1)) / 2, testo: sigla(c), e: e.id });
        else if (e.tipo === 'cerchio') out.push({ x: num(e.cx), y: num(e.cy) + num(e.r), testo: sigla(c), e: e.id });
        else if (e.tipo === 'asola') out.push({ x: (num(e.x1) + num(e.x2)) / 2, y: (num(e.y1) + num(e.y2)) / 2, testo: sigla(c), e: e.id });
      });
    });
    return out;
  }

  const Vinc = { risolviVincoli: risolvi, aggiungiVincolo, togliVincolo, descriviVincolo: descrivi, segniVincoli: segni, NOMI_VINCOLI: NOMI };
  Object.assign(O, Vinc);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
