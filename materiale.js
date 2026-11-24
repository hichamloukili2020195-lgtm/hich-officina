// ===== Hich-Officina: il materiale che si asporta durante la simulazione (senza interfaccia) =====
// Fresa: il grezzo e una griglia di altezze (vista dall'alto); ogni movimento di lavoro passa con il disco dell'utensile e abbassa
// l'altezza. Tornio: il grezzo e una sezione (Z, raggio) fatta a celle; l'utensile toglie il materiale che attraversa.
// In piu segnala i rapidi che entrano nel materiale e le frese che tagliano oltre la loro lunghezza tagliente.
// E una stima: utensile piatto, senza vibrazioni ne flessioni, inserto del tornio con misure di prova.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  const n = v => String(Math.round(v * 100) / 100).replace('.', ',');
  const MAX_SEG = 400000;     // oltre questo numero di movimenti il materiale non si simula
  const MAX_SEGNALAZIONI = 25;

  /** Il diametro scritto nel commento del T: "FRESA D10", "PUNTA 8.5", "MASCHIO M8". 0 se non c'e. */
  function diametroDaCommento(c) {
    const t = String(c || '').toUpperCase().replace(/,/g, '.');
    let m = /(?:Ø|DIA\.?|\bD)\s*(\d+(?:\.\d+)?)/.exec(t) || /\bM\s*(\d+(?:\.\d+)?)/.exec(t) || /(\d+\.\d+|\d+)/.exec(t);
    const d = m ? Number(m[1]) : 0;
    return d >= 0.3 && d <= 120 ? d : 0;
  }

  // ============================== FRESA ==============================
  function creaFresa(S, opz) {
    const N = S.length;
    const utensili = {};
    const raggioDi = t => {
      if (utensili[t]) return utensili[t].d / 2;
      const info = opz.utensile ? opz.utensile(t) : null;   // {d, l, ipotizzato}
      utensili[t] = { d: info && info.d > 0 ? info.d : 6, l: info && info.l > 0 ? info.l : 0, ipotizzato: !info || !(info.d > 0) };
      return utensili[t].d / 2;
    };
    // area di lavoro
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity, minz = Infinity, rmax = 0;
    S.forEach(s => {
      if (s.rapido) return;
      minx = Math.min(minx, s.x0, s.x); maxx = Math.max(maxx, s.x0, s.x); miny = Math.min(miny, s.y0, s.y); maxy = Math.max(maxy, s.y0, s.y); minz = Math.min(minz, s.z0, s.z);
      rmax = Math.max(rmax, raggioDi(s.t));
    });
    const m = { tipo: 'fresa', N, utensili, collisioni: [], note: [], ipotizzato: false, vuoto: !isFinite(minx) };
    if (m.vuoto) { m.vaiA = () => {}; return m; }
    const G = opz.grezzo || {};
    let x0, y0, x1, y1, lz;
    if (G.lx > 0 && G.ly > 0) { x0 = 0; y0 = 0; x1 = G.lx; y1 = G.ly; } else { const mg = rmax + 2; x0 = minx - mg; y0 = miny - mg; x1 = maxx + mg; y1 = maxy + mg; m.ipotizzato = true; }
    if (G.lz > 0) lz = G.lz; else { lz = Math.max(2, -Math.min(minz, 0) + 1); m.ipotizzato = true; }
    const sx = x1 - x0, sy = y1 - y0;
    const cella = Math.max(0.05, Math.max(sx, sy) / (opz.celle || 150));
    const nx = Math.max(1, Math.ceil(sx / cella)), ny = Math.max(1, Math.ceil(sy / cella));
    const h = new Float32Array(nx * ny);   // altezza della faccia sopra (0 = Z0)
    Object.assign(m, { nx, ny, cella, x0, y0, x1, y1, lz, h });
    if (m.ipotizzato) m.note.push('Grezzo ipotizzato: ' + n(sx) + ' x ' + n(sy) + ' x ' + n(lz) + ' mm, faccia sopra a Z0. Scrivi le misure vere nel grezzo per un controllo piu giusto.');
    const livello = m.ipotizzato ? 'avviso' : 'errore';
    const segnalati = new Set();
    const segnala = (riga, testo, liv) => {
      const k = riga + '|' + testo.slice(0, 24);
      if (segnalati.has(k)) return; segnalati.add(k);
      if (m.collisioni.length < MAX_SEGNALAZIONI) m.collisioni.push({ riga, livello: liv || livello, testo });
      else if (m.collisioni.length === MAX_SEGNALAZIONI) m.collisioni.push({ riga: -1, livello: 'avviso', testo: 'Altre segnalazioni del materiale non mostrate' });
    };
    const taglia = (s, R, conferma) => {
      const ax = s.x0, ay = s.y0, bx = s.x, by = s.y, az = s.z0, bz = s.z, dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - R - x0) / cella)), i1 = Math.min(nx - 1, Math.floor((Math.max(ax, bx) + R - x0) / cella));
      const j0 = Math.max(0, Math.floor((Math.min(ay, by) - R - y0) / cella)), j1 = Math.min(ny - 1, Math.floor((Math.max(ay, by) + R - y0) / cella));
      const R2 = R * R, zMin = Math.min(az, bz);
      let massimo = -Infinity;
      for (let j = j0; j <= j1; j++) {
        const cy = y0 + (j + 0.5) * cella;
        for (let i = i0; i <= i1; i++) {
          const cx = x0 + (i + 0.5) * cella;
          let t = L2 > 1e-12 ? ((cx - ax) * dx + (cy - ay) * dy) / L2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const px = ax + t * dx - cx, py = ay + t * dy - cy;
          if (px * px + py * py > R2) continue;
          const zt = L2 > 1e-12 ? az + t * (bz - az) : zMin;
          const k = j * nx + i, v = h[k];
          if (v > massimo) massimo = v;
          if (zt < v) h[k] = zt;
        }
      }
      return massimo;
    };
    // il rapido entra nel materiale? (punto per punto lungo il movimento)
    const rapidoDentro = (s, R) => {
      if (s.z > s.z0 && Math.hypot(s.x - s.x0, s.y - s.y0) < 1e-6) return null;   // risale dal foro: non e un urto
      const L = Math.hypot(s.x - s.x0, s.y - s.y0, s.z - s.z0), passi = Math.max(1, Math.ceil(L / (cella * 0.8)));
      for (let p = 0; p <= passi; p++) {
        const t = p / passi, x = s.x0 + t * (s.x - s.x0), y = s.y0 + t * (s.y - s.y0), z = s.z0 + t * (s.z - s.z0);
        if (z >= 0) continue;
        const i0 = Math.max(0, Math.floor((x - R - x0) / cella)), i1 = Math.min(nx - 1, Math.floor((x + R - x0) / cella));
        const j0 = Math.max(0, Math.floor((y - R - y0) / cella)), j1 = Math.min(ny - 1, Math.floor((y + R - y0) / cella));
        let mx = -Infinity;
        for (let j = j0; j <= j1; j++) { const cy = y0 + (j + 0.5) * cella; for (let i = i0; i <= i1; i++) { const cx = x0 + (i + 0.5) * cella; if ((cx - x) * (cx - x) + (cy - y) * (cy - y) <= R * R && h[j * nx + i] > mx) mx = h[j * nx + i]; } }
        if (mx - z > 0.05) return { x, y, z, mx };
      }
      return null;
    };
    const ogni = Math.max(400, Math.ceil(N / 48));
    const cp = [{ k: 0, h: new Float32Array(h) }];
    for (let i = 0; i < N; i++) {
      const s = S[i], R = raggioDi(s.t), U = utensili[s.t];
      if (s.rapido) {
        const d = rapidoDentro(s, R);
        if (d) segnala(s.riga, 'rapido dentro il materiale: la fresa T' + s.t + ' (D' + n(U.d) + (U.ipotizzato ? ', diametro ipotizzato' : '') + ') arriva a Z ' + n(d.z) + ' in X ' + n(d.x) + ' Y ' + n(d.y) + ' dove il pezzo e ancora a Z ' + n(d.mx));
      } else {
        const mx = taglia(s, R);
        const prof = mx - Math.min(s.z0, s.z);
        if (U.l > 0 && prof > U.l + 0.01) segnala(s.riga, 'la fresa T' + s.t + ' taglia ' + n(prof) + ' mm in profondita ma la parte tagliente e lunga ' + n(U.l) + ' mm: urta con il gambo o il portautensile');
      }
      if ((i + 1) % ogni === 0 && i + 1 < N) cp.push({ k: i + 1, h: new Float32Array(h) });
    }
    let applicati = N;
    m.vaiA = k => {
      k = Math.max(0, Math.min(N, Math.round(k)));
      if (k === applicati) return;
      if (k < applicati) { let c = cp[0]; for (const q of cp) if (q.k <= k) c = q; h.set(c.h); applicati = c.k; }
      for (; applicati < k; applicati++) { const s = S[applicati]; if (!s.rapido) taglia(s, raggioDi(s.t)); }
    };
    m.altezza = (x, y) => { const i = Math.floor((x - x0) / cella), j = Math.floor((y - y0) / cella); return i < 0 || j < 0 || i >= nx || j >= ny ? null : h[j * nx + i]; };
    return m;
  }

  // ============================== TORNIO ==============================
  function creaTornio(S, opz) {
    const N = S.length, T = Object.assign({ rn: 0.4, W: 3, H: 10 }, opz.tornio || {});
    const m = { tipo: 'tornio', N, collisioni: [], note: [], ipotizzato: false, vuoto: false, utensili: {} };
    let maxX = 0, zMaxF = -Infinity, zMinF = Infinity;
    S.forEach(s => { if (s.rapido) return; maxX = Math.max(maxX, Math.abs(s.x0), Math.abs(s.x)); zMaxF = Math.max(zMaxF, s.z0, s.z); zMinF = Math.min(zMinF, s.z0, s.z); });
    if (!isFinite(zMinF) || maxX <= 0) { m.vuoto = true; m.vaiA = () => {}; return m; }
    const G = opz.grezzo || {};
    let R, zTop, zBot;
    if (G.d > 0) { R = G.d / 2; } else { R = maxX / 2; m.ipotizzato = true; }
    if (G.d > 0 && G.l > 0) { const sov = G.s > 0 ? G.s : G.s === 0 ? 0 : 1; zTop = sov; zBot = sov - G.l; } else { zTop = Math.max(zMaxF, 0); zBot = zMinF; m.ipotizzato = true; }
    if (!(zTop - zBot > 0.1)) { zTop = zBot + 1; }
    const cella = Math.max(0.05, Math.max(R, zTop - zBot) / (opz.celle || 380));
    const nz = Math.max(1, Math.ceil((zTop - zBot) / cella)), nr = Math.max(1, Math.ceil(R / cella));
    const occ = new Uint8Array(nz * nr).fill(1);   // indice iz * nr + ir (z dal basso, raggio dall'asse)
    Object.assign(m, { nz, nr, cella, zBot, zTop, R, occ, rn: T.rn });
    if (m.ipotizzato) m.note.push('Grezzo ipotizzato: diametro ' + n(R * 2) + ' mm (il piu grande lavorato), da Z' + n(zBot) + ' a Z' + n(zTop) + '. Scrivi il grezzo vero per un controllo piu giusto.');
    const livello = m.ipotizzato ? 'avviso' : 'errore';
    const segnalati = new Set();
    const segnala = (riga, testo) => { const k = riga + '|' + testo.slice(0, 24); if (segnalati.has(k)) return; segnalati.add(k); if (m.collisioni.length < MAX_SEGNALAZIONI) m.collisioni.push({ riga, livello, testo }); };
    const zi = z => Math.floor((z - zBot) / cella), ri = r => Math.floor(r / cella);
    const pieno = (z, r) => { const a = zi(z), b = ri(r); return a >= 0 && b >= 0 && a < nz && b < nr && occ[a * nr + b] === 1; };
    const vuota = (a, b0, b1) => { b0 = Math.max(0, b0); b1 = Math.min(nr - 1, b1); for (let b = b0; b <= b1; b++) occ[a * nr + b] = 0; };
    const taglia = (s) => {
      const z0 = s.z0, z1 = s.z, r0 = Math.abs(s.x0) / 2, r1 = Math.abs(s.x) / 2;
      const L = Math.hypot(z1 - z0, r1 - r0), passi = Math.max(1, Math.ceil(L / (cella * 0.7)));
      const radiale = Math.abs(r1 - r0) > Math.abs(z1 - z0);
      // lato dell'inserto in lavoro longitudinale: dall'esterno (tornitura) o dall'interno del foro (alesatura)
      let lato = 1;
      { const zz = z0, rr = r0; if (rr - 0.8 > 0 && !pieno(zz, rr - 0.8) && pieno(zz, rr + 0.8)) lato = -1; }
      const rn = T.rn;
      for (let p = 0; p <= passi; p++) {
        const t = p / passi, z = z0 + t * (z1 - z0), r = r0 + t * (r1 - r0);
        if (radiale) {
          const a0 = Math.max(0, zi(z - rn)), a1 = Math.min(nz - 1, zi(z + T.W));
          for (let a = a0; a <= a1; a++) vuota(a, ri(r - rn), ri(r + rn));
        } else {
          const a0 = Math.max(0, zi(z - rn)), a1 = Math.min(nz - 1, zi(z + rn));
          let b0, b1;
          if (r < 0.05) { b0 = 0; b1 = ri(opz.foro ? opz.foro(s.t) / 2 : 4); }   // sull'asse: una punta
          else if (lato > 0) { b0 = ri(r - rn); b1 = ri(r + T.H); } else { b0 = ri(r - T.H); b1 = ri(r + rn); }
          for (let a = a0; a <= a1; a++) vuota(a, b0, b1);
        }
      }
    };
    const rapidoDentro = (s) => {
      const L = Math.hypot(s.z - s.z0, (s.x - s.x0) / 2), passi = Math.max(1, Math.ceil(L / (cella * 0.8)));
      for (let p = 0; p <= passi; p++) {
        const t = p / passi, z = s.z0 + t * (s.z - s.z0), r = Math.abs(s.x0 + t * (s.x - s.x0)) / 2;
        if (r > 0.15 && pieno(z, r - 0.15)) return { z, x: r * 2 };
        if (r <= 0.15 && pieno(z, 0.05)) return { z, x: 0 };
      }
      return null;
    };
    const ogni = Math.max(400, Math.ceil(N / 40));
    const cp = [{ k: 0, occ: new Uint8Array(occ) }];
    for (let i = 0; i < N; i++) {
      const s = S[i];
      if (s.rapido) { const d = rapidoDentro(s); if (d) segnala(s.riga, 'rapido dentro il materiale: l\'utensile T' + s.t + ' arriva a X ' + n(d.x) + ' Z ' + n(d.z) + ' dove c\'e ancora il grezzo'); } else taglia(s);
      if ((i + 1) % ogni === 0 && i + 1 < N) cp.push({ k: i + 1, occ: new Uint8Array(occ) });
    }
    let applicati = N;
    m.vaiA = k => {
      k = Math.max(0, Math.min(N, Math.round(k)));
      if (k === applicati) return;
      if (k < applicati) { let c = cp[0]; for (const q of cp) if (q.k <= k) c = q; occ.set(c.occ); applicati = c.k; }
      for (; applicati < k; applicati++) { const s = S[applicati]; if (!s.rapido) taglia(s); }
    };
    return m;
  }

  /**
   * Crea il modello del materiale. opz: {modo, S (movimenti, per la fresa a centro utensile), utensile: t => {d, l, ipotizzato},
   * grezzo: {lx, ly, lz} (fresa) o {d, l, s} (tornio), tornio: {rn, W, H}, foro: t => diametro della punta}.
   * Ritorna {tipo, collisioni:[{riga, livello, testo}], note, ipotizzato, vaiA(k), ...} oppure {tipo:'troppo', note}.
   */
  function creaMateriale(opz) {
    const S = opz.S || [];
    if (S.length > MAX_SEG) return { tipo: 'troppo', N: S.length, collisioni: [], note: ['Programma molto lungo (' + S.length + ' movimenti): il materiale non viene simulato.'], vaiA: () => {} };
    return opz.modo === 'tornio' ? creaTornio(S, opz) : creaFresa(S, opz);
  }

  Object.assign(O, { creaMateriale, diametroDaCommento });
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
