// ===== Hich-Officina: profili liberi (rette, archi, raccordi, smussi) per fresa e tornio, senza interfaccia =====
// Un profilo e una lista di punti. Ogni punto dice come ci si arriva dal punto prima (retta, arco orario o antiorario
// con raggio) e cosa c'e nello spigolo (raccordo R o smusso C). Coordinate (a, b): in fresa (X, Y); in tornio (Z, raggio).
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  const gc = O.gc;
  const EPS = 1e-9;
  const sub = (p, q) => ({ a: p.a - q.a, b: p.b - q.b });
  const len = v => Math.hypot(v.a, v.b);
  const unit = v => { const l = len(v) || 1; return { a: v.a / l, b: v.b / l }; };
  const add = (p, v, k) => ({ a: p.a + v.a * k, b: p.b + v.b * k });
  const cross = (u, v) => u.a * v.b - u.b * v.a;

  /** Centro di un arco da due punti, raggio e verso (cw = orario visto con a a destra e b in alto). */
  function centroArco(p, q, r, cw) {
    const d = len(sub(q, p));
    if (d < EPS) return null;
    const R = Math.abs(r);
    if (R < d / 2 - 1e-6) return null;
    const h = Math.sqrt(Math.max(0, R * R - d * d / 4));
    const m = { a: (p.a + q.a) / 2, b: (p.b + q.b) / 2 }, u = unit(sub(q, p));
    let lato = cw ? -1 : 1;            // arco corto: centro a destra per l'orario, a sinistra per l'antiorario
    if (r < 0) lato = -lato;           // R negativo: arco lungo
    return { a: m.a + lato * -u.b * h, b: m.b + lato * u.a * h };
  }

  /**
   * Costruisce i tratti del profilo.
   * punti = [{a, b, tratto:'retta'|'cw'|'ccw', r (raggio dell'arco), raccordo, smusso}], chiuso = bool
   * Ritorna {tratti:[{tipo:'L'|'A', p, q, c, cw, r}], errore, avvisi}
   */
  function costruisci(punti, chiuso) {
    const avvisi = [];
    const P = punti.filter(p => isFinite(p.a) && isFinite(p.b));
    if (P.length < 2) return { errore: 'Servono almeno due punti.', tratti: [], avvisi };
    // tratti grezzi tra i punti
    const grezzi = [];
    const n = P.length;
    const ultimo = chiuso ? n : n - 1;
    for (let i = 0; i < ultimo; i++) {
      const p = P[i], q = P[(i + 1) % n];
      if (len(sub(q, p)) < 1e-6) { avvisi.push('Punto ' + (i + 2) + ' uguale al precedente: saltato.'); continue; }
      const tipo = q.tratto || 'retta';
      if (tipo === 'cw' || tipo === 'ccw') {
        const c = centroArco(p, q, q.r || 0, tipo === 'cw');
        if (!c) return { errore: 'Arco al punto ' + ((i + 1) % n + 1) + ': raggio troppo piccolo per la distanza tra i punti.', tratti: [], avvisi };
        grezzi.push({ tipo: 'A', p, q, c, cw: tipo === 'cw', r: Math.abs(q.r), ip: i, iq: (i + 1) % n });
      } else grezzi.push({ tipo: 'L', p, q, ip: i, iq: (i + 1) % n });
    }
    if (chiuso && grezzi.length < 2) return { errore: 'Un profilo chiuso ha bisogno di almeno tre punti.', tratti: [], avvisi };
    // raccordi e smussi negli spigoli tra due rette
    const out = grezzi.map(t => Object.assign({}, t));
    const spigoli = [];
    for (let k = 0; k < out.length; k++) {
      const nx = k + 1 < out.length ? k + 1 : (chiuso ? 0 : -1);
      if (nx < 0) break;
      spigoli.push([k, nx]);
    }
    const aggiunte = [];   // {dopo: k, tratto}
    for (const [k, nx] of spigoli) {
      const t1 = out[k], t2 = out[nx], V = P[t1.iq];
      const R = Number(V.raccordo) || 0, C = Number(V.smusso) || 0;
      if (!(R > 0) && !(C > 0)) continue;
      if (t1.tipo !== 'L' || t2.tipo !== 'L') { avvisi.push('Raccordo o smusso al punto ' + (t1.iq + 1) + ' tra un arco: non fatto.'); continue; }
      const u = unit(sub(t1.q, t1.p)), v = unit(sub(t2.q, t2.p));
      const cosA = Math.max(-1, Math.min(1, -(u.a * v.a + u.b * v.b)));
      const ang = Math.acos(cosA);                       // angolo interno dello spigolo
      if (ang < 1e-3 || Math.abs(ang - Math.PI) < 1e-3) { avvisi.push('Spigolo al punto ' + (t1.iq + 1) + ' piatto: niente raccordo.'); continue; }
      const dist = R > 0 ? R / Math.tan(ang / 2) : C;
      if (dist > len(sub(t1.q, t1.p)) + 1e-6 || dist > len(sub(t2.q, t2.p)) + 1e-6) return { errore: (R > 0 ? 'Raccordo' : 'Smusso') + ' al punto ' + (t1.iq + 1) + ' troppo grande per i tratti vicini.', tratti: [], avvisi };
      const T1 = add(V, u, -dist), T2 = add(V, v, dist);
      t1.q = T1; t2.p = T2;
      if (R > 0) {
        const cw = cross(u, v) < 0;
        const bis = unit({ a: v.a - u.a, b: v.b - u.b });
        const dc = R / Math.sin(ang / 2);
        const c = add(V, bis, dc);
        aggiunte.push({ dopo: k, tratto: { tipo: 'A', p: T1, q: T2, c, cw, r: R } });
      } else aggiunte.push({ dopo: k, tratto: { tipo: 'L', p: T1, q: T2 } });
    }
    const finale = [];
    out.forEach((t, k) => {
      finale.push(t);
      aggiunte.filter(x => x.dopo === k).forEach(x => finale.push(x.tratto));
    });
    // un profilo chiuso con raccordo nel primo punto: si parte dalla fine del raccordo
    const tratti = finale.filter(t => len(sub(t.q, t.p)) > 1e-7).map(t => ({ tipo: t.tipo, p: t.p, q: t.q, c: t.c, cw: t.cw, r: t.r }));
    return { tratti, avvisi, errore: null };
  }

  /** Punti di un tratto (archi spezzati in pezzi di lunghezza ~passo). */
  function puntiTratto(t, passo) {
    if (t.tipo === 'L') return [t.q];
    const a0 = Math.atan2(t.p.b - t.c.b, t.p.a - t.c.a), a1 = Math.atan2(t.q.b - t.c.b, t.q.a - t.c.a);
    let d = a1 - a0;
    if (t.cw) { while (d > 1e-9) d -= 2 * Math.PI; } else { while (d < -1e-9) d += 2 * Math.PI; }
    const r = Math.hypot(t.p.a - t.c.a, t.p.b - t.c.b);
    const k = Math.max(2, Math.ceil(Math.abs(d) * r / (passo || 0.3)));
    const out = [];
    for (let i = 1; i <= k; i++) { const a = a0 + d * i / k; out.push(i === k ? t.q : { a: t.c.a + r * Math.cos(a), b: t.c.b + r * Math.sin(a) }); }
    return out;
  }
  function polilinea(tratti, passo) {
    if (!tratti.length) return [];
    const out = [tratti[0].p];
    tratti.forEach(t => out.push(...puntiTratto(t, passo)));
    return out;
  }
  /** Area con segno (positiva = antiorario). */
  function area(poli) {
    let s = 0;
    for (let i = 0; i < poli.length - 1; i++) s += poli[i].a * poli[i + 1].b - poli[i + 1].a * poli[i].b;
    return s / 2;
  }
  function inverti(tratti) {
    return tratti.slice().reverse().map(t => ({ tipo: t.tipo, p: t.q, q: t.p, c: t.c, cw: t.tipo === 'A' ? !t.cw : t.cw, r: t.r }));
  }

  // ----- fresa -----
  /**
   * Righe di movimento del profilo per la fresa (dopo testa e avvicinamento): G41/G42 con entrata e uscita.
   * c = {punti, chiuso, lato:'esterno'|'interno'|'sinistra'|'destra'|'centro', prof, ap, d, f, fp, zR, t}
   * Ritorna {mosse:[{g, x, y, z, f, extra, cw, i, j}], avvisi, errore, comp:'G41'|'G42'|null, inizio:{x,y}}
   */
  function percorsoFresa(c) {
    const pts = (c.punti || []).map(p => ({ a: Number(p.x), b: Number(p.y), tratto: p.tratto, r: Number(p.r), raccordo: Number(p.raccordo), smusso: Number(p.smusso) }));
    const chiuso = !!c.chiuso;
    const g = costruisci(pts, chiuso);
    if (g.errore) return { errore: g.errore, mosse: [], avvisi: g.avvisi };
    let tratti = g.tratti;
    const avvisi = g.avvisi.slice();
    let comp = null;
    if (chiuso) {
      const s = area(polilinea(tratti, 1));
      // fresatura concorde (M3) con G41: esterno in senso orario, interno in senso antiorario
      if (c.lato === 'esterno' && s > 0) tratti = inverti(tratti);
      if (c.lato === 'interno' && s < 0) tratti = inverti(tratti);
      comp = c.lato === 'centro' ? null : 'G41';
    } else comp = c.lato === 'sinistra' ? 'G41' : c.lato === 'destra' ? 'G42' : null;
    if (chiuso && c.lato !== 'esterno' && c.lato !== 'interno' && c.lato !== 'centro') return { errore: 'Profilo chiuso: scegli esterno, interno o centro.', mosse: [], avvisi };
    if (!chiuso && (c.lato === 'esterno' || c.lato === 'interno')) return { errore: 'Profilo aperto: scegli a sinistra, a destra o centro.', mosse: [], avvisi };
    // per il chiuso si parte a meta del tratto piu lungo dritto (o del primo)
    if (chiuso) {
      let k = 0, best = -1;
      tratti.forEach((t, i) => { const l = len(sub(t.q, t.p)); if (t.tipo === 'L' && l > best) { best = l; k = i; } });
      const t = tratti[k];
      if (t.tipo === 'L') {
        const m = { a: (t.p.a + t.q.a) / 2, b: (t.p.b + t.q.b) / 2 };
        tratti = [{ tipo: 'L', p: m, q: t.q }].concat(tratti.slice(k + 1), tratti.slice(0, k), [{ tipo: 'L', p: t.p, q: m }]);
      } else avvisi.push('Profilo chiuso senza tratti dritti: l\'entrata e sul primo arco.');
    }
    const r = (c.d || 10) / 2, L = Math.max(r * 2, 4);
    const P0 = tratti[0].p, PN = tratti[tratti.length - 1].q;
    const dirIn = tratti[0].tipo === 'L' ? unit(sub(tratti[0].q, tratti[0].p)) : unit({ a: -(P0.b - tratti[0].c.b) * (tratti[0].cw ? -1 : 1), b: (P0.a - tratti[0].c.a) * (tratti[0].cw ? -1 : 1) });
    const ultimoT = tratti[tratti.length - 1];
    const dirOut = ultimoT.tipo === 'L' ? unit(sub(ultimoT.q, ultimoT.p)) : unit({ a: -(PN.b - ultimoT.c.b) * (ultimoT.cw ? -1 : 1), b: (PN.a - ultimoT.c.a) * (ultimoT.cw ? -1 : 1) });
    // lato libero: a sinistra della direzione con G41, a destra con G42
    const fuori = (u, cmp) => (cmp === 'G42' ? { a: u.b, b: -u.a } : { a: -u.b, b: u.a });
    const nIn = comp ? fuori(dirIn, comp) : { a: 0, b: 0 }, nOut = comp ? fuori(dirOut, comp) : { a: 0, b: 0 };
    const A = comp ? add(add(P0, dirIn, -L), nIn, L) : add(P0, dirIn, -L);
    const B = comp ? add(add(PN, dirOut, L), nOut, L) : add(PN, dirOut, L);
    const mosse = [];
    const livelli = [];
    const nl = Math.max(1, Math.ceil(c.prof / (c.ap > 0 ? c.ap : c.prof) - 1e-9));
    for (let i = 1; i <= nl; i++) livelli.push(-c.prof * i / nl);
    livelli.forEach(z => {
      mosse.push({ g: 0, x: A.a, y: A.b });
      mosse.push({ g: 0, z: (c.zR || 2) });
      mosse.push({ g: 1, z, f: c.fp });
      mosse.push({ g: 1, x: P0.a, y: P0.b, f: c.f, extra: comp ? comp + ' D' + (c.t || 1) : '' });
      tratti.forEach(t => {
        if (t.tipo === 'L') mosse.push({ g: 1, x: t.q.a, y: t.q.b });
        else mosse.push({ g: t.cw ? 2 : 3, x: t.q.a, y: t.q.b, i: t.c.a - t.p.a, j: t.c.b - t.p.b, cx: t.c.a, cy: t.c.b });
      });
      mosse.push({ g: 1, x: B.a, y: B.b });
      if (comp) mosse.push({ g: 1, x: B.a + nOut.a * 2, y: B.b + nOut.b * 2, extra: 'G40' });
      mosse.push({ g: 0, z: (c.zR || 2) });
    });
    if (comp) avvisi.push('Compensazione ' + comp + ' D' + (c.t || 1) + ': nel correttore il raggio della fresa (piu il sovrametallo per sgrossare). La simulazione mostra il profilo, non il centro fresa.');
    return { mosse, avvisi, errore: null, comp, livelli: nl, tratti };
  }

  // ----- tornio -----
  /** Profilo da tornio: punti {x (diametro), z}. Ritorna i tratti in (a = Z, b = raggio). */
  function trattiTornio(punti) {
    const pts = (punti || []).map(p => ({ a: Number(p.z), b: Number(p.x) / 2, tratto: p.tratto, r: Number(p.r), raccordo: Number(p.raccordo), smusso: Number(p.smusso) }));
    return costruisci(pts, false);
  }
  /**
   * Passate di sgrossatura esterna su un profilo (polilinea in (z, raggio) da destra verso il mandrino).
   * Usata dal generatore e dalla simulazione del ciclo G71. Ritorna {passate:[{x, z0, z1}], monotono}
   * x = diametro della passata, da z0 (inizio) a z1 (fine taglio).
   */
  function sgrossaTornio(poli, dg, ap, sx, sz, zInizio, zLimite) {
    if (zLimite === undefined) zLimite = zInizio;
    // profilo spostato del sovrametallo: raggio + sx/2, z + sz
    const P = poli.map(p => ({ z: p.a + (sz || 0), r: p.b + (sx || 0) / 2 }));
    let monotono = true;
    for (let i = 1; i < P.length; i++) if (P[i].r < P[i - 1].r - 1e-6 && P[i].z < P[i - 1].z) monotono = false;
    let rMin = Infinity; for (const p of P) if (p.r < rMin) rMin = p.r;
    const passate = [];
    let r = dg / 2;
    let k = 0;
    while (r > rMin + 1e-6 && k++ < 1000) {
      r = Math.max(r - ap, rMin);
      // primo punto, andando verso il mandrino, dove il profilo arriva al raggio r
      let zFine = P[P.length - 1].z;
      for (let i = 1; i < P.length; i++) {
        const a = P[i - 1], b = P[i];
        if ((a.r - r) * (b.r - r) <= 0 && Math.abs(b.r - a.r) > 1e-9) { zFine = a.z + (b.z - a.z) * (r - a.r) / (b.r - a.r); break; }
        if (a.r >= r - 1e-9) { zFine = a.z; break; }
      }
      if (zFine < Math.min(zInizio, zLimite) - 0.01) passate.push({ x: 2 * r, z0: zInizio, z1: zFine });
    }
    return { passate, monotono };
  }

  /** Righe ISO del profilo da tornio (G1/G2/G3 in X diametro e Z). */
  function righeTornio(tratti, ff) {
    const R = [];
    let primo = true;
    tratti.forEach(t => {
      const x = gc(t.q.b * 2), z = gc(t.q.a);
      if (t.tipo === 'L') R.push('G1 X' + x + ' Z' + z + (primo && ff ? ' F' + gc(ff) : ''));
      else R.push((t.cw ? 'G2' : 'G3') + ' X' + x + ' Z' + z + ' R' + gc(t.r) + (primo && ff ? ' F' + gc(ff) : ''));
      primo = false;
    });
    return R;
  }

  const Profilo = { costruisciProfilo: costruisci, polilineaProfilo: polilinea, areaProfilo: area, percorsoFresaProfilo: percorsoFresa, trattiTornio, sgrossaTornio, righeTornio, centroArco };
  Object.assign(O, Profilo);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
