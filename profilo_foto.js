// ===== Hich-Officina: profilo ripassato col dito sulla foto del disegno, senza interfaccia =====
// Il tratto a mano libera (pixel della foto) diventa rette e archi: le rette quasi orizzontali o verticali si
// raddrizzano, gli spigoli si chiudono, i pezzetti si uniscono; a richiesta le linee si agganciano ai bordi veri del
// disegno. Poi la scala: si cerca il rapporto mm/pixel che fa tornare piu misure con le quote lette vicino al profilo
// (diametri, lunghezze, raggi); ogni misura prende la quota che torna, altrimenti resta quella della foto (da controllare).
// Tornio: mezzo profilo sopra l'asse -> punti del disegno del tornio (x = diametro, z dalla testa verso il mandrino).
// Fresa: contorno chiuso -> profilo (poli) per il CAD della fresa, origine nell'angolo in basso a sinistra.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  // le misure prese dalla foto si arrotondano al mezzo millimetro: la foto non e piu precisa di cosi
  const r1 = x => Math.round(x * 2) / 2 + 0, r3 = x => Math.round(x * 1000) / 1000 + 0;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  /** Ramer-Douglas-Peucker: gli indici dei punti che restano. */
  function rdp(P, tol) {
    const tieni = new Array(P.length).fill(false);
    tieni[0] = tieni[P.length - 1] = true;
    const pila = [[0, P.length - 1]];
    while (pila.length) {
      const [s, e] = pila.pop();
      const a = P[s], b = P[e], L = dist(a, b) || 1e-9;
      let dm = 0, k = -1;
      for (let i = s + 1; i < e; i++) {
        const d = Math.abs((b.x - a.x) * (a.y - P[i].y) - (a.x - P[i].x) * (b.y - a.y)) / L;
        if (d > dm) { dm = d; k = i; }
      }
      if (dm > tol && k > 0) { tieni[k] = true; pila.push([s, k], [k, e]); }
    }
    return tieni.map((t, i) => (t ? i : -1)).filter(i => i >= 0);
  }

  /** Cerchio per i punti (minimi quadrati). Ritorna {cx, cy, r, err (scarto massimo)} oppure null. */
  function cerchio(P) {
    if (P.length < 3) return null;
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
    const n = P.length, mx = P.reduce((s, p) => s + p.x, 0) / n, my = P.reduce((s, p) => s + p.y, 0) / n;
    P.forEach(p => { const x = p.x - mx, y = p.y - my, z = x * x + y * y; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z; });
    // x^2+y^2 + D x + E y + F = 0
    const M = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], v = [-sxz, -syz, -sz];
    const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const d0 = det(M);
    if (Math.abs(d0) < 1e-9) return null;
    const col = (k) => M.map((r, i) => r.map((c, j) => (j === k ? v[i] : c)));
    const D = det(col(0)) / d0, E = det(col(1)) / d0, F = det(col(2)) / d0;
    const cx = -D / 2, cy = -E / 2, r2 = cx * cx + cy * cy - F;
    if (!(r2 > 0)) return null;
    const r = Math.sqrt(r2);
    const err = Math.max(...P.map(p => Math.abs(Math.hypot(p.x - mx - cx, p.y - my - cy) - r)));
    return { cx: cx + mx, cy: cy + my, r, err };
  }
  const giro = (a, m, b) => (m.x - a.x) * (b.y - m.y) - (m.y - a.y) * (b.x - m.x);   // > 0: a sinistra (antiorario con y in su)

  /**
   * Il tratto a mano diventa un profilo pulito. punti = [{x, y}] in pixel; opz = {tol (pixel), angolo (gradi per
   * raddrizzare)}. Ritorna {vertici: [{x, y}], lati: [{tipo:'retta'|'arco', dir:'h'|'v'|'', r, m (punto di mezzo dell'arco)}]}
   * (il lato i va dal vertice i al vertice i+1).
   */
  function raddrizza(punti, opz) {
    opz = opz || {};
    let tol = opz.tol || 4;
    const angTol = opz.angolo || 8;
    const P = [];
    (punti || []).forEach(p => { if (isFinite(p.x) && isFinite(p.y) && (!P.length || dist(P[P.length - 1], p) >= 1)) P.push({ x: p.x, y: p.y }); });
    if (P.length < 2) return { vertici: [], lati: [] };
    // il dito trema: la tolleranza cresce con il tremolio misurato sul tratto
    if (P.length > 6) {
      const sc = []; for (let i = 1; i < P.length - 1; i++) sc.push(Math.hypot(P[i].x - (P[i - 1].x + P[i + 1].x) / 2, P[i].y - (P[i - 1].y + P[i + 1].y) / 2));
      sc.sort((a, b) => a - b);
      tol = Math.max(tol, 2.5 * (sc[Math.floor(sc.length / 2)] || 0));
    }
    const idx = rdp(P, tol);
    // pezzi del tratto tra due punti rimasti; poi archi: piu pezzi di fila che stanno su un cerchio
    const lati = [];
    let i = 0;
    while (i < idx.length - 1) {
      let fine = i + 1, arco = null;
      for (let j = i + 2; j < idx.length; j++) {
        const pezzo = P.slice(idx[i], idx[j] + 1);
        const c = cerchio(pezzo);
        if (!c || c.err > tol * 0.9) break;
        const a = P[idx[i]], b = P[idx[j]], corda = dist(a, b);
        // tutti i pezzi girano dalla stessa parte
        const segni = []; for (let k = i + 1; k < j; k++) segni.push(Math.sign(giro(P[idx[k - 1]], P[idx[k]], P[idx[k + 1]])));
        if (segni.some(s => s !== segni[0])) break;
        if (c.r > corda * 6) continue;                                    // ancora quasi dritto: forse piu avanti
        const m = pezzo[Math.floor(pezzo.length / 2)];
        const freccia = Math.abs(giro(a, m, b)) / (corda || 1);
        if (freccia < tol * 1.5) continue;
        fine = j; arco = { tipo: 'arco', r: c.r, c: { x: c.cx, y: c.cy }, m: { x: m.x, y: m.y }, pezzo };
      }
      const pezzo = P.slice(idx[i], idx[fine] + 1);
      if (arco) lati.push({ tipo: 'arco', r: arco.r, c: arco.c, m: arco.m, a: idx[i], b: idx[fine] });
      else {
        const a = P[idx[i]], b = P[idx[fine]];
        const ang = Math.abs(Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI);
        // le estremita di un tratto corto sono incerte quanto la tolleranza: l'angolo accettato cresce
        const at = Math.max(angTol, Math.atan2(2.5 * tol, dist(a, b)) * 180 / Math.PI);
        const dir = ang <= at || ang >= 180 - at ? 'h' : Math.abs(ang - 90) <= at ? 'v' : '';
        const media = k => pezzo.reduce((s, p) => s + p[k], 0) / pezzo.length;
        lati.push({ tipo: 'retta', dir, pos: dir === 'h' ? media('y') : dir === 'v' ? media('x') : NaN, a: idx[i], b: idx[fine] });
      }
      i = fine;
    }
    let V = [P[idx[0]]].concat(lati.map(l => P[l.b])).map(p => ({ x: p.x, y: p.y }));
    const L = lati.map(l => ({ tipo: l.tipo, dir: l.dir || '', pos: l.pos, r: l.r, c: l.c, m: l.m }));
    return pulisci({ vertici: V, lati: L }, tol);
  }

  /** Spigoli chiusi (i vertici prendono la riga delle rette orizzontali e la colonna delle verticali), lati uguali uniti, pezzetti tolti. */
  function pulisci(mod, tol) {
    let V = mod.vertici.map(p => ({ x: p.x, y: p.y })), L = mod.lati.map(l => Object.assign({}, l));
    for (let giri = 0; giri < 6; giri++) {
      let cambiato = false;
      // due rette di fila con la stessa direzione e quasi la stessa riga: una sola
      for (let i = 0; i < L.length - 1; i++) {
        const a = L[i], b = L[i + 1];
        if (a.tipo === 'retta' && b.tipo === 'retta' && a.dir && a.dir === b.dir && Math.abs(a.pos - b.pos) < tol * 1.5) {
          const la = dist(V[i], V[i + 1]), lb = dist(V[i + 1], V[i + 2]);
          a.pos = (a.pos * la + b.pos * lb) / ((la + lb) || 1);
          L.splice(i + 1, 1); V.splice(i + 1, 1); cambiato = true; break;
        }
        if (a.tipo === 'retta' && b.tipo === 'retta' && !a.dir && !b.dir && Math.abs(giro(V[i], V[i + 1], V[i + 2])) / (dist(V[i], V[i + 2]) || 1) < tol * 0.7) {
          L.splice(i + 1, 1); V.splice(i + 1, 1); cambiato = true; break;
        }
      }
      if (cambiato) continue;
      // pezzetto storto corto tra due lati: sparisce, lo spigolo si chiude
      for (let i = 0; i < L.length; i++) {
        const l = L[i];
        if (l.tipo === 'retta' && !l.dir && dist(V[i], V[i + 1]) < tol * 2.5 && L.length > 1) {
          const m = { x: (V[i].x + V[i + 1].x) / 2, y: (V[i].y + V[i + 1].y) / 2 };
          L.splice(i, 1); V.splice(i, 2, m); cambiato = true; break;
        }
      }
      if (!cambiato) break;
    }
    // vertici sulle righe e colonne delle rette vicine
    V = V.map((p, i) => {
      const q = { x: p.x, y: p.y };
      [L[i - 1], L[i]].forEach(l => { if (l && l.tipo === 'retta') { if (l.dir === 'h') q.y = l.pos; if (l.dir === 'v') q.x = l.pos; } });
      return q;
    });
    // arco tangente a una retta orizzontale o verticale: l'estremo va nel punto di tangenza (il raccordo)
    L.forEach((l, i) => {
      if (l.tipo !== 'arco' || !l.c) return;
      [[L[i - 1], i], [L[i + 1], i + 1]].forEach(([r, k]) => {
        if (!r || r.tipo !== 'retta' || !r.dir) return;
        if (r.dir === 'h' && Math.abs(Math.abs(l.c.y - r.pos) - l.r) < 2 * Math.max(tol, 1.5)) V[k] = { x: l.c.x, y: r.pos };
        if (r.dir === 'v' && Math.abs(Math.abs(l.c.x - r.pos) - l.r) < 2 * Math.max(tol, 1.5)) V[k] = { x: r.pos, y: l.c.y };
      });
    });
    // rette rimaste senza lunghezza (l'arco le ha mangiate): via
    for (let i = L.length - 1; i >= 0; i--) if (L[i].tipo === 'retta' && L.length > 1 && dist(V[i], V[i + 1]) < 0.5) { L.splice(i, 1); V.splice(i + 1, 1); }
    // archi: il raggio non puo essere meno di mezza corda
    L.forEach((l, i) => { if (l.tipo === 'arco') l.r = Math.max(l.r, dist(V[i], V[i + 1]) / 2 + 1e-6); });
    return { vertici: V, lati: L };
  }

  /**
   * Aggancia le rette orizzontali e verticali alle linee scure del disegno vicine (entro raggio pixel).
   * scuro(x, y) da 0 (bianco) a 1 (nero). Ritorna un modello nuovo.
   */
  function agganciaBordi(mod, scuro, raggio) {
    raggio = raggio || 6;
    const L = mod.lati.map(l => Object.assign({}, l)), V = mod.vertici;
    L.forEach((l, i) => {
      if (l.tipo !== 'retta' || !l.dir) return;
      const a = V[i], b = V[i + 1];
      const h = l.dir === 'h';
      const s0 = h ? Math.min(a.x, b.x) : Math.min(a.y, b.y), s1 = h ? Math.max(a.x, b.x) : Math.max(a.y, b.y);
      const da = s0 + (s1 - s0) * 0.15, fino = s1 - (s1 - s0) * 0.15;
      if (fino - da < 3) return;
      const punteggio = off => {
        let t = 0, n = 0;
        for (let s = da; s <= fino; s += Math.max(1, (fino - da) / 40)) { t += h ? scuro(s, l.pos + off) : scuro(l.pos + off, s); n++; }
        return n ? t / n : 0;
      };
      const base = punteggio(0);
      let meglio = 0, pm = base - 0;
      for (let off = -raggio; off <= raggio; off++) { const p = punteggio(off) - 0.004 * Math.abs(off); if (p > pm) { pm = p; meglio = off; } }
      if (meglio && pm > 0.35 && pm > base + 0.05) l.pos += meglio;
    });
    return pulisci({ vertici: V, lati: L }, 1);
  }

  /** La riga dell'asse vicina al tocco: la riga piu scura (linea tratto punto) entro raggio pixel. */
  function trovaAsse(y, scuro, x0, x1, raggio) {
    raggio = raggio || 10;
    let meglio = y, pm = -1;
    for (let off = -raggio; off <= raggio; off++) {
      let t = 0, n = 0;
      for (let x = x0; x <= x1; x += Math.max(1, (x1 - x0) / 120)) { t += scuro(x, y + off); n++; }
      const p = t / Math.max(1, n) - 0.002 * Math.abs(off);
      if (p > pm) { pm = p; meglio = y + off; }
    }
    return meglio;
  }

  // ----- misure dalle quote -----
  const vicino = (a, b, rel) => Math.abs(a - b) <= Math.max(0.25, Math.abs(b) * (rel || 0.035));
  /** Le quote che stanno vicino al profilo (non quelle delle altre viste). zona = {x0, y0, x1, y1} in pixel. */
  function quoteVicine(quote, W, H, zona) {
    // le quote d'ingombro stanno anche un po' lontano dal pezzo: margine dalla misura piu grande del profilo
    const mx = Math.max(zona.x1 - zona.x0, zona.y1 - zona.y0) * 0.35 + 20, my = mx;
    return (quote || []).filter(q => q.stato !== 'no').filter(q => { const x = q.x * W, y = q.y * H; return x >= zona.x0 - mx && x <= zona.x1 + mx && y >= zona.y0 - my && y <= zona.y1 + my; });
  }
  const valoriDi = (Q, tipi) => Q.filter(q => tipi.includes(q.tipo)).map(q => ({ v: q.tipo === 'filetto' ? q.d : q.valore, id: q.id, testo: q.testo })).filter(x => x.v > 0);

  /** Il rapporto mm/pixel che fa tornare piu misure. coppie = [{px, quote: [{v}]}]. Ritorna {k, tornano} oppure null. */
  function scala(misure) {
    const cand = [];
    misure.forEach(m => m.quote.forEach(q => { if (m.px > 2) cand.push(q.v / m.px); }));
    let meglio = null;
    cand.forEach(k => {
      let n = 0, err = 0;
      const prese = new Set();
      misure.forEach(m => {
        let b = null;
        m.quote.forEach(q => { if (!prese.has(m.gruppo + '|' + q.id) && vicino(m.px * k, q.v) && (!b || Math.abs(m.px * k - q.v) < Math.abs(m.px * k - b.v))) b = q; });
        if (b) { n += m.peso || 1; err += Math.abs(m.px * k - b.v) / b.v; prese.add(m.gruppo + '|' + b.id); }
      });
      if (!meglio || n > meglio.tornano + 1e-9 || (Math.abs(n - meglio.tornano) < 1e-9 && err < meglio.err)) meglio = { k, tornano: n, err };
    });
    return meglio;
  }

  /**
   * Posizioni lungo un asse (in mm misurati, dalla base 0) agganciate alle quote: dalla base (quote in serie dal bordo)
   * o da una posizione gia fissata (quote in catena). Ritorna [{v, fonte:'quota'|'foto', id}] nello stesso ordine.
   */
  function posizioni(mis, lung) {
    const out = [{ v: 0, fonte: 'base' }];
    for (let j = 1; j < mis.length; j++) {
      let b = null;
      const prova = (val, id) => { if (vicino(mis[j], val, 0.04) && (!b || Math.abs(mis[j] - val) < Math.abs(mis[j] - b.v))) b = { v: val, fonte: 'quota', id }; };
      lung.forEach(q => {
        prova(q.v, q.id);
        for (let i = 0; i < j; i++) prova(out[i].v + q.v, q.id);
      });
      out.push(b || { v: r1(mis[j]), fonte: 'foto' });
    }
    return out;
  }
  /** Raggruppa coordinate vicine (entro tol): ritorna {gruppi: [valore medio], di: indice del gruppo di ogni coordinata}. */
  function gruppi(vals, tol) {
    const ord = vals.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const G = [], di = new Array(vals.length);
    ord.forEach(o => { const g = G[G.length - 1]; if (g && o.v - g.ult <= tol) { g.s += o.v; g.n++; g.ult = o.v; di[o.i] = G.length - 1; } else { G.push({ s: o.v, n: 1, ult: o.v }); di[o.i] = G.length - 1; } });
    return { gruppi: G.map(g => g.s / g.n), di };
  }

  /**
   * Un arco da un quarto di cerchio (raccordo): la coordinata misurata sulla foto si ricava dall'altra, che viene da una
   * quota, piu o meno il raggio. P = posizioni [{v, fonte}] di un asse, gi/gj = gruppi dei due estremi, d = differenza misurata.
   */
  function dalRaggio(P, gi, gj, d, R) {
    if (gi === gj || Math.abs(Math.abs(d) - R) > 0.12 * R) return false;
    const a = P[gi], b = P[gj];
    if (a.fonte !== 'foto' && b.fonte === 'foto') { b.v = r3(a.v + Math.sign(d) * R); b.fonte = 'raggio'; return true; }
    if (b.fonte !== 'foto' && a.fonte === 'foto') { a.v = r3(b.v - Math.sign(d) * R); a.fonte = 'raggio'; return true; }
    return false;
  }

  /**
   * Tornio. mod = profilo raddrizzato (pixel), asseY = riga dell'asse, quote lette (posizioni da 0 a 1), W e H della foto.
   * opz = {k (mm/pixel scelto a mano), testa: 'destra'|'sinistra'}.
   * Ritorna {punti: [{x, z, tratto, r}], k, misure: [{testo, fonte, id}], dubbi, usate} oppure {errore}.
   */
  function profiloTornio(mod, asseY, quote, W, H, opz) {
    opz = opz || {};
    if (!mod || mod.vertici.length < 2) return { errore: 'Ripassa il profilo col dito, sopra l\'asse.' };
    let V = mod.vertici.map(p => ({ x: p.x, y: p.y })), L = mod.lati.slice();
    const testaDestra = opz.testa !== 'sinistra';
    // dalla testa verso il mandrino
    if ((testaDestra && V[0].x < V[V.length - 1].x) || (!testaDestra && V[0].x > V[V.length - 1].x)) { V = V.reverse(); L = L.slice().reverse(); }
    const xh = V[0].x, segno = testaDestra ? 1 : -1;
    const U = V.map(p => ({ u: (p.x - xh) * segno, v: Math.abs(asseY - p.y) }));   // u <= 0 verso il mandrino, v = raggio in pixel
    const ys = V.map(p => p.y), xs = V.map(p => p.x);
    const zona = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys, 2 * asseY - Math.max(...ys)), y1: Math.max(...ys, 2 * asseY - Math.min(...ys)) };
    const Q = quoteVicine(quote, W, H, zona);
    const dq = valoriDi(Q, ['diametro', 'filetto']), lq = valoriDi(Q, ['lunghezza']), rq = valoriDi(Q, ['raggio']);
    // diametri delle rette orizzontali e distanze tra le posizioni lungo l'asse
    const gz = gruppi(U.map(p => -p.u), 3);
    const misure = [];
    L.forEach((l, i) => { if (l.tipo === 'retta' && l.dir === 'h' && U[i].v > 2) misure.push({ px: 2 * U[i].v, quote: dq, gruppo: 'd' + i, peso: 1.2 }); });
    for (let a = 0; a < gz.gruppi.length; a++) for (let b = a + 1; b < gz.gruppi.length; b++) misure.push({ px: gz.gruppi[b] - gz.gruppi[a], quote: lq, gruppo: 'l' + a + '-' + b, peso: 1 });
    let k = opz.k > 0 ? opz.k : NaN, dubbi = [];
    if (!(k > 0)) {
      const s = scala(misure);
      if (!s || s.tornano < 2) return { errore: 'Non riesco a trovare la scala dalle quote vicine al profilo: tocca una misura del profilo e scrivi quanto vale.', serveScala: true };
      k = s.k;
    }
    const usate = new Set(), mis = [];
    // raggi (meta del diametro) di ogni vertice, dalle rette orizzontali agganciate ai diametri letti
    const rag = U.map(p => p.v * k);
    const dVert = new Array(V.length).fill(null);
    L.forEach((l, i) => {
      if (l.tipo !== 'retta' || l.dir !== 'h') return;
      const D = 2 * U[i].v * k;
      let b = null; dq.forEach(q => { if (vicino(D, q.v) && (!b || Math.abs(D - q.v) < Math.abs(D - b.v))) b = q; });
      const val = b ? b.v : r1(D);
      if (b) usate.add(b.id);
      dVert[i] = dVert[i + 1] = val;
      mis.push({ testo: 'Ø' + val, fonte: b ? 'quota' : 'foto', id: b ? b.id : null });
      if (!b) dubbi.push('Ø' + val + ' misurato sulla foto (nessuna quota vicina torna): controllalo.');
    });
    // posizioni lungo l'asse
    const pz = posizioni(gz.gruppi.map(v => v * k), lq);
    pz.forEach((p, j) => { if (p.id) usate.add(p.id); if (j && p.fonte === 'foto') dubbi.push('Posizione Z-' + p.v + ' misurata sulla foto: controllala.'); });
    const punti = V.map((p, i) => ({ x: r3(dVert[i] !== null ? dVert[i] : r1(2 * rag[i])), z: r3(-pz[gz.di[i]].v) }));
    // archi: raggio agganciato ai raggi letti, verso nel piano (z, raggio)
    L.forEach((l, i) => {
      if (l.tipo !== 'arco') return;
      const R = l.r * k;
      let b = null; rq.forEach(q => { if (vicino(R, q.v, 0.08) && (!b || Math.abs(R - q.v) < Math.abs(R - b.v))) b = q; });
      const a = { x: U[i].u, y: U[i].v }, c = { x: U[i + 1].u, y: U[i + 1].v }, m = { x: (l.m.x - xh) * segno, y: Math.abs(asseY - l.m.y) };
      const corda = Math.hypot(punti[i + 1].z - punti[i].z, (punti[i + 1].x - punti[i].x) / 2);
      const Rv = Math.max(b ? b.v : r1(R), r3(corda / 2 + 0.001));
      punti[i + 1].tratto = giro(a, m, c) > 0 ? 'ccw' : 'cw';
      punti[i + 1].r = Rv;
      if (b) usate.add(b.id); else dubbi.push('Raggio R' + Rv + ' misurato sulla foto: controllalo.');
      mis.push({ testo: 'R' + Rv, fonte: b ? 'quota' : 'foto', id: b ? b.id : null });
    });
    // la testa parte dall'asse
    if (punti[0].x > 0) punti.unshift({ x: 0, z: 0 });
    // fino al mandrino: l'ultimo punto e il diametro piu grosso dell'ultimo tratto
    pz.forEach((p, j) => { if (j && p.fonte === 'quota') mis.push({ testo: 'Z-' + p.v, fonte: 'quota', id: p.id }); });
    return { punti, k, misure: mis, dubbi, usate: Array.from(usate), quoteVicine: Q.map(q => q.id) };
  }

  /**
   * Fresa: contorno chiuso. Ritorna {punti: [{x, y, tratto, r}], k, misure, dubbi, usate} oppure {errore}.
   * Origine nell'angolo in basso a sinistra del contorno, Y verso l'alto.
   */
  function profiloFresa(mod, quote, W, H, opz) {
    opz = opz || {};
    if (!mod || mod.vertici.length < 3) return { errore: 'Ripassa il contorno del pezzo col dito, tutto intorno.' };
    let V = mod.vertici.map(p => ({ x: p.x, y: p.y })), L = mod.lati.slice();
    // chiuso: l'ultimo punto torna sul primo
    if (dist(V[0], V[V.length - 1]) < Math.max(12, 0.08 * Math.hypot(Math.max(...V.map(p => p.x)) - Math.min(...V.map(p => p.x)), Math.max(...V.map(p => p.y)) - Math.min(...V.map(p => p.y))))) {
      const ultimo = L[L.length - 1];
      if (ultimo && ultimo.tipo === 'retta' && ultimo.dir) { if (ultimo.dir === 'h') V[0].y = ultimo.pos; else V[0].x = ultimo.pos; }
      V.pop(); L.pop();
      // il lato di chiusura torna al primo vertice
      const a = V[V.length - 1], b = V[0];
      const ang = Math.abs(Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI);
      L.push({ tipo: 'retta', dir: ang <= 8 || ang >= 172 ? 'h' : Math.abs(ang - 90) <= 8 ? 'v' : '', pos: NaN });
    } else L.push({ tipo: 'retta', dir: '', pos: NaN });
    const xs = V.map(p => p.x), ys = V.map(p => p.y), x0 = Math.min(...xs), y1 = Math.max(...ys);
    const zona = { x0, x1: Math.max(...xs), y0: Math.min(...ys), y1 };
    const Q = quoteVicine(quote, W, H, zona);
    const lq = valoriDi(Q, ['lunghezza']), rq = valoriDi(Q, ['raggio']), dq = valoriDi(Q, ['diametro']);
    const gx = gruppi(V.map(p => p.x - x0), 3), gy = gruppi(V.map(p => y1 - p.y), 3);
    const misure = [];
    [gx, gy].forEach((g, ax) => { for (let a = 0; a < g.gruppi.length; a++) for (let b = a + 1; b < g.gruppi.length; b++) misure.push({ px: g.gruppi[b] - g.gruppi[a], quote: lq, gruppo: ax + ':' + a + '-' + b }); });
    L.forEach((l, i) => { if (l.tipo === 'arco') misure.push({ px: l.r, quote: rq.concat(dq.map(q => ({ v: q.v / 2, id: q.id }))), gruppo: 'r' + i }); });
    let k = opz.k > 0 ? opz.k : NaN;
    if (!(k > 0)) {
      const s = scala(misure);
      if (!s || s.tornano < 2) return { errore: 'Non riesco a trovare la scala dalle quote vicine al contorno: tocca una misura e scrivi quanto vale.', serveScala: true };
      k = s.k;
    }
    const dubbi = [], usate = new Set(), mis = [];
    const px = posizioni(gx.gruppi.map(v => v * k), lq), py = posizioni(gy.gruppi.map(v => v * k), lq);
    // senso antiorario (Y in su): il contorno si percorre sempre nello stesso verso
    const punti = V.map((p, i) => ({ x: r3(px[gx.di[i]].v), y: r3(py[gy.di[i]].v) }));
    L.forEach((l, i) => {
      if (l.tipo !== 'arco') return;
      const j = (i + 1) % V.length, R = l.r * k;
      let b = null; rq.concat(dq.map(q => ({ v: q.v / 2, id: q.id }))).forEach(q => { if (vicino(R, q.v, 0.08) && (!b || Math.abs(R - q.v) < Math.abs(R - b.v))) b = q; });
      const a = { x: V[i].x, y: -V[i].y }, c = { x: V[j].x, y: -V[j].y }, m = { x: l.m.x, y: -l.m.y };
      const corda = Math.hypot(punti[j].x - punti[i].x, punti[j].y - punti[i].y);
      const Rv = Math.max(b ? b.v : r1(R), r3(corda / 2 + 0.001));
      punti[j].tratto = giro(a, m, c) > 0 ? 'ccw' : 'cw'; punti[j].r = Rv;
      if (b) usate.add(b.id); else dubbi.push('Raggio R' + Rv + ' misurato sulla foto: controllalo.');
      mis.push({ testo: 'R' + Rv, fonte: b ? 'quota' : 'foto', id: b ? b.id : null });
      // raccordo a quarto di cerchio: la coordinata misurata viene dall'altra e dal raggio
      [[px, gx, 'x'], [py, gy, 'y']].forEach(([P, g, ax]) => dalRaggio(P, g.di[i], g.di[j], punti[j][ax] - punti[i][ax], Rv));
      V.forEach((p, z) => { punti[z].x = r3(px[gx.di[z]].v); punti[z].y = r3(py[gy.di[z]].v); });
    });
    [[px, 'X'], [py, 'Y']].forEach(([P, n]) => P.forEach((p, j) => {
      if (p.id) usate.add(p.id);
      if (!j) return;
      mis.push({ testo: n + p.v, fonte: p.fonte, id: p.id || null });
      if (p.fonte === 'foto') dubbi.push(n + p.v + ' misurato sulla foto: controllalo.');
    }));
    return { punti, k, misure: mis, dubbi, usate: Array.from(usate), quoteVicine: Q.map(q => q.id) };
  }

  const ProfiloFoto = { raddrizza, agganciaBordi, trovaAsse, profiloTornio, profiloFresa, cerchioPerPunti: cerchio };
  Object.assign(O, ProfiloFoto);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
