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
      utensili[t] = { d: info && info.d > 0 ? info.d : 6, l: info && info.l > 0 ? info.l : 0, cono: info && info.cono > 0 ? info.cono : 0, ipotizzato: !info || !(info.d > 0) };
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
    const taglia = (s, R, cono) => {
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
          const q2 = px * px + py * py;
          if (q2 > R2) continue;
          // punta, centrino, smussatore: la punta e un cono (zt sale con la distanza dall'asse)
          const zt = (L2 > 1e-12 ? az + t * (bz - az) : zMin) + (cono ? cono * Math.sqrt(q2) : 0);
          const k = j * nx + i, v = h[k];
          if (v > massimo) massimo = v;
          if (zt < v) h[k] = zt;
        }
      }
      return massimo;
    };
    // il rapido entra nel materiale? (punto per punto lungo il movimento)
    const rapidoDentro = (s, R, cono) => {
      if (s.z > s.z0 && Math.hypot(s.x - s.x0, s.y - s.y0) < 1e-6) return null;   // risale dal foro: non e un urto
      const L = Math.hypot(s.x - s.x0, s.y - s.y0, s.z - s.z0), passi = Math.max(1, Math.ceil(L / (cella * 0.8)));
      for (let p = 0; p <= passi; p++) {
        const t = p / passi, x = s.x0 + t * (s.x - s.x0), y = s.y0 + t * (s.y - s.y0), z = s.z0 + t * (s.z - s.z0);
        if (z >= 0) continue;
        const i0 = Math.max(0, Math.floor((x - R - x0) / cella)), i1 = Math.min(nx - 1, Math.floor((x + R - x0) / cella));
        const j0 = Math.max(0, Math.floor((y - R - y0) / cella)), j1 = Math.min(ny - 1, Math.floor((y + R - y0) / cella));
        let mx = -Infinity, sopra = -Infinity;   // sopra: quanto il materiale sta sopra la superficie dell'utensile (cono compreso)
        for (let j = j0; j <= j1; j++) { const cy = y0 + (j + 0.5) * cella; for (let i = i0; i <= i1; i++) { const cx = x0 + (i + 0.5) * cella, q2 = (cx - x) * (cx - x) + (cy - y) * (cy - y); if (q2 > R * R) continue; const v = h[j * nx + i], d = v - (z + (cono ? cono * Math.sqrt(q2) : 0)); if (d > sopra) { sopra = d; mx = v; } } }
        if (sopra > 0.05) return { x, y, z, mx };
      }
      return null;
    };
    // morsa: due ganasce sui lati Y del grezzo, alte fino a "sporgenza" sotto la faccia; portautensile sopra la fresa
    const MO = opz.morsa || {}, spM = Number(MO.sp), Dp = Number(opz.porta) > 0 ? Number(opz.porta) : 40;
    m.ganasce = [];
    if (spM > 0 && spM < lz) {
      const W = Math.max(x1 - x0 + 20, 120), cx = (x0 + x1) / 2, top = -spM, fondo = -lz - 30;
      m.ganasce.push({ x0: cx - W / 2, x1: cx + W / 2, y0: y0 - 25, y1: y0, z0: fondo, z1: top }, { x0: cx - W / 2, x1: cx + W / 2, y0: y1, y1: y1 + 25, z0: fondo, z1: top });
      if (MO.ipotizzata) m.note.push('Morsa ipotizzata: il pezzo esce di ' + n(spM) + ' mm dalle ganasce (lo spessore meno 3 mm). Se lo tieni in un altro modo, gli urti con la morsa non valgono.');
    } else if (spM >= lz) m.note.push('Il pezzo esce tutto dalla morsa (sporgenza ' + n(spM) + ' su ' + n(lz) + ' mm): le ganasce non si disegnano.');
    m.porta = Dp;
    const discoInRett = (x, y, r, g) => { const qx = Math.max(g.x0, Math.min(x, g.x1)), qy = Math.max(g.y0, Math.min(y, g.y1)); return (qx - x) * (qx - x) + (qy - y) * (qy - y) < r * r - 1e-9; };
    const liv2 = m.ipotizzato ? 'avviso' : 'errore';
    /** Urti con la morsa (fresa e portautensile) e del portautensile con il pezzo, punto per punto lungo il movimento. */
    const urti = (s, R, U) => {
      const L = Math.hypot(s.x - s.x0, s.y - s.y0, s.z - s.z0), passi = Math.max(1, Math.ceil(L / Math.max(1, cella)));
      for (let p = 0; p <= passi; p++) {
        const t = p / passi, x = s.x0 + t * (s.x - s.x0), y = s.y0 + t * (s.y - s.y0), z = s.z0 + t * (s.z - s.z0);
        for (const g of m.ganasce) {
          if (z < g.z1 - 0.01 && discoInRett(x, y, R, g)) return 'la fresa T' + s.t + ' tocca la ganascia della morsa (X ' + n(x) + ' Y ' + n(y) + ' Z ' + n(z) + ')';
          if (U.l > 0 && z + U.l < g.z1 - 0.01 && discoInRett(x, y, Dp / 2, g)) return 'il portautensile della T' + s.t + ' tocca la ganascia della morsa (sporgenza ' + n(U.l) + ' mm, Z ' + n(z) + ')';
        }
        if (U.l > 0 && z + U.l < -0.01) {
          // portautensile sotto la faccia del grezzo: tocca il materiale rimasto?
          const zh = z + U.l, rh = Dp / 2;
          const i0 = Math.max(0, Math.floor((x - rh - x0) / cella)), i1 = Math.min(nx - 1, Math.floor((x + rh - x0) / cella));
          const j0 = Math.max(0, Math.floor((y - rh - y0) / cella)), j1 = Math.min(ny - 1, Math.floor((y + rh - y0) / cella));
          for (let j = j0; j <= j1; j++) { const cy = y0 + (j + 0.5) * cella; for (let i = i0; i <= i1; i++) { const cx = x0 + (i + 0.5) * cella; if ((cx - x) * (cx - x) + (cy - y) * (cy - y) <= rh * rh && h[j * nx + i] > zh + 0.05) return 'il portautensile della T' + s.t + ' (Ø' + n(Dp) + ', sporgenza ' + n(U.l) + ' mm) tocca il pezzo a Z ' + n(zh); } }
        }
      }
      return null;
    };
    const ogni = Math.max(400, Math.ceil(N / 48));
    const cp = [{ k: 0, h: new Float32Array(h) }];
    for (let i = 0; i < N; i++) {
      const s = S[i], R = raggioDi(s.t), U = utensili[s.t];
      { const u = urti(s, R, U); if (u) segnala(s.riga, u + (MO.ipotizzata && /ganascia/.test(u) ? ' (morsa ipotizzata)' : ''), MO.ipotizzata && /ganascia/.test(u) ? 'avviso' : liv2); }
      if (s.rapido) {
        const d = rapidoDentro(s, R, U.cono);
        if (d) segnala(s.riga, 'rapido dentro il materiale: la fresa T' + s.t + ' (D' + n(U.d) + (U.ipotizzato ? ', diametro ipotizzato' : '') + ') arriva a Z ' + n(d.z) + ' in X ' + n(d.x) + ' Y ' + n(d.y) + ' dove il pezzo e ancora a Z ' + n(d.mx));
      } else {
        taglia(s, R, U.cono);
      }
      if ((i + 1) % ogni === 0 && i + 1 < N) cp.push({ k: i + 1, h: new Float32Array(h) });
    }
    let applicati = N;
    m.vaiA = k => {
      k = Math.max(0, Math.min(N, Math.round(k)));
      if (k === applicati) return;
      if (k < applicati) { let c = cp[0]; for (const q of cp) if (q.k <= k) c = q; h.set(c.h); applicati = c.k; }
      for (; applicati < k; applicati++) { const s = S[applicati]; if (!s.rapido) taglia(s, raggioDi(s.t), utensili[s.t].cono); }
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
    const segnala = (riga, testo, liv) => { const k = riga + '|' + testo.slice(0, 24); if (segnalati.has(k)) return; segnalati.add(k); if (m.collisioni.length < MAX_SEGNALAZIONI) m.collisioni.push({ riga, livello: liv || livello, testo }); };
    const zi = z => Math.floor((z - zBot) / cella), ri = r => Math.floor(r / cella);
    const zSu = z => Math.ceil((z - zBot) / cella - 0.5), rSu = r => Math.ceil(r / cella - 0.5), rGiu = r => Math.floor(r / cella - 0.5);
    const pieno = (z, r) => { const a = zi(z), b = ri(r); return a >= 0 && b >= 0 && a < nz && b < nr && occ[a * nr + b] === 1; };
    const vuota = (a, b0, b1) => { b0 = Math.max(0, b0); b1 = Math.min(nr - 1, b1); for (let b = b0; b <= b1; b++) occ[a * nr + b] = 0; };
    const latoT = new Map();
    const taglia = (s) => {
      const z0 = s.z0, z1 = s.z, r0 = Math.abs(s.x0) / 2, r1 = Math.abs(s.x) / 2;
      const L = Math.hypot(z1 - z0, r1 - r0), passi = Math.max(1, Math.ceil(L / (cella * 0.7)));
      const radiale = Math.abs(r1 - r0) > Math.abs(z1 - z0);
      // lato dell'inserto in lavoro longitudinale: dall'esterno (tornitura) o dall'interno del foro (alesatura)
      let lato = 1;
      // dall'interno (alesatura) o dall'esterno: il materiale da togliere e dalla parte dove il vuoto e piu vicino
      { let zz = (z0 + z1) / 2, rr = (r0 + r1) / 2;
        if (!pieno(zz, rr) && !pieno(zz, rr + cella) && !pieno(zz, Math.max(0, rr - cella))) { zz = z1; rr = r1; }   // a meta e in aria: si guarda la fine
        let dIn = Infinity, dOut = Infinity;
        for (let q = rr; q > 0; q -= cella) if (!pieno(zz, q)) { dIn = rr - q; break; }
        for (let q = rr; q < R + 2 * cella; q += cella) if (!pieno(zz, q)) { dOut = q - rr; break; }
        if (dIn < dOut && dIn <= T.H) lato = -1;
        // un utensile lavora sempre dalla stessa parte (bareno dentro, utensile da esterni fuori): vale la prima decisione sicura
        if (latoT.has(s.t)) lato = latoT.get(s.t); else if (!radiale && pieno(zz, rr) && isFinite(Math.min(dIn, dOut))) latoT.set(s.t, lato); }
      const rn = T.rn;
      let segGola = null;
      for (let p = 0; p <= passi; p++) {
        const t = p / passi, z = z0 + t * (z1 - z0), r = Math.abs(s.x0 + t * (s.x - s.x0)) / 2;   // passa anche per il centro (X negativa)
        // si tolgono solo le celle col centro oltre la punta (niente materiale tolto sotto la quota programmata)
        if (radiale) {
          // sfacciatura (davanti alla punta c'e solo il sovrametallo) o gola/troncatura (materiale da tutte e due le parti:
          // la lama e larga W e sta a sinistra della quota, fianco destro sulla Z programmata)
          // si decide una volta, al primo punto dentro il materiale: oltre la lama c'e ancora il pezzo = gola o troncatura
          if (segGola === null && pieno(z, Math.max(0, r - cella))) segGola = pieno(z + T.W + 0.5, Math.max(0, r - cella));
          const gola = segGola === null ? pieno(z + T.W + 0.5, Math.max(0, r - cella)) : segGola;
          const a0 = Math.max(0, gola ? zSu(z - T.W) : zSu(z)), a1 = Math.min(nz - 1, gola ? zi(z) : zi(z + T.W));
          for (let a = a0; a <= a1; a++) vuota(a, rSu(r - 1e-6), ri(r + rn));
        } else {
          const a0 = Math.max(0, zSu(z)), a1 = Math.min(nz - 1, zi(z + rn));
          let b0, b1;
          if (r < 0.05) { b0 = 0; b1 = rGiu((opz.foro ? opz.foro(s.t) : 8) / 2); }   // sull'asse: una punta
          else if (lato > 0) { b0 = rSu(r); b1 = ri(r + T.H); } else { b0 = ri(r - T.H); b1 = rGiu(r); }
          for (let a = a0; a <= a1; a++) vuota(a, b0, b1);
        }
      }
    };
    const rapidoDentro = (s) => {
      const L = Math.hypot(s.z - s.z0, (s.x - s.x0) / 2), passi = Math.max(1, Math.ceil(L / (cella * 0.8)));
      for (let p = 0; p <= passi; p++) {
        const t = p / passi, z = s.z0 + t * (s.z - s.z0), r = Math.abs(s.x0 + t * (s.x - s.x0)) / 2;
        // dentro il materiale davvero (non sulla superficie appena lavorata): pieno anche un po' intorno
        const e = 0.25;
        if (pieno(z, r) && pieno(z + e, r) && pieno(z - e, r) && pieno(z, r + e) && (r < e || pieno(z, r - e))) return { z, x: r * 2 };
      }
      return null;
    };
    // mandrino: le griffe stringono il grezzo da "sporgenza" mm dietro la faccia davanti
    const spT = Number((opz.mandrino || {}).sp);
    if (spT > 0) {
      m.mandrino = { zM: zTop - spT, R };
      // lavori sul diametro esterno oltre le griffe (i fori in asse possono andare dentro il pezzo serrato)
      let zOD = Infinity;
      S.forEach(q => { if (!q.rapido && Math.max(Math.abs(q.x0), Math.abs(q.x)) / 2 >= R - 1) zOD = Math.min(zOD, q.z0, q.z); });
      if (zTop - spT > zOD + 1e-6) m.collisioni.push({ riga: -1, livello: 'errore', testo: 'Il programma lavora sul diametro esterno fino a Z ' + n(zOD) + ' ma il grezzo esce dal mandrino solo fino a Z ' + n(zTop - spT) + ': aumenta la sporgenza.' });
    }
    const griffe = s => {
      if (!m.mandrino) return null;
      const L = Math.hypot(s.z - s.z0, (s.x - s.x0) / 2), passi = Math.max(1, Math.ceil(L / Math.max(0.5, cella * 2)));
      for (let p = 0; p <= passi; p++) {
        const t = p / passi, z = s.z0 + t * (s.z - s.z0), r = Math.abs(s.x0 + t * (s.x - s.x0)) / 2;
        if (z < m.mandrino.zM - 0.05 && r >= m.mandrino.R - 0.2) return 'l\'utensile T' + s.t + ' tocca le griffe del mandrino (X ' + n(r * 2) + ' Z ' + n(z) + ')';
      }
      return null;
    };
    const ogni = Math.max(400, Math.ceil(N / 40));
    const cp = [{ k: 0, occ: new Uint8Array(occ) }];
    for (let i = 0; i < N; i++) {
      const s = S[i];
      { const u = griffe(s); if (u) segnala(s.riga, u, 'errore'); }
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

  // ============================== CONFRONTO CON IL DISEGNO ==============================
  const TOLL = 0.2;   // mm: sotto questa differenza il pezzo e uguale al disegno
  /** Distanza di un punto da una polilinea [{a,b}]. */
  function distPoli(x, y, P) {
    let d = Infinity;
    for (let i = 0; i < P.length - 1; i++) {
      const ax = P[i].a, ay = P[i].b, bx = P[i + 1].a, by = P[i + 1].b, dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      let t = L2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const q = Math.hypot(ax + t * dx - x, ay + t * dy - y); if (q < d) d = q;
    }
    return d;
  }
  function dentroPoli(x, y, P) {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a.b > y) !== (b.b > y) && x < (b.a - a.a) * (y - a.b) / (b.b - a.b) + a.a) c = !c; }
    return c;
  }
  /**
   * Prepara la forma voluta (dal lavoro guidato) sulla griglia del materiale.
   * Fresa: b = {tipo:'fresa', entita (come pianificaCAD), lz}. Tornio: b = {tipo:'tornio', punti, fasi:[{op, c}]}.
   */
  function preparaBersaglio(m, b) {
    if (!m || m.vuoto || !b) return false;
    if (m.tipo === 'fresa' && b.tipo === 'fresa') {
      const { nx, ny, cella, x0, y0, lz } = m, tgt = new Float32Array(nx * ny), bordo = new Float32Array(nx * ny).fill(Infinity), ign = new Float32Array(nx * ny);
      const zone = [];   // {P (poligono chiuso), fuori (contorno esterno), z, smusso}
      const poli = e => { const pr = O.profiloCAD ? O.profiloCAD(e) : null; if (!pr || !pr.chiuso) return null; const g = O.costruisciProfilo(pr.punti.map(q => ({ a: q.x, b: q.y, tratto: q.tratto, r: q.r, raccordo: q.raccordo, smusso: q.smusso })), true); if (g.errore) return null; const P = O.polilineaProfilo(g.tratti, 0.3); if (P.length && (P[0].a !== P[P.length - 1].a || P[0].b !== P[P.length - 1].b)) P.push(P[0]); return P; };
      const cerchio = (cx, cy, r) => { const P = []; for (let k = 0; k <= 64; k++) { const t = k / 64 * 2 * Math.PI; P.push({ a: cx + r * Math.cos(t), b: cy + r * Math.sin(t) }); } return P; };
      (b.entita || []).forEach(e => (e.lav || []).forEach(l => {
        const sm = Number(l.smusso) || 0, prof = Number(l.prof);
        if (l.op === 'foro' || l.op === 'maschio' || l.op === 'alesato') {
          const cx = e.tipo === 'cerchio' ? Number(e.cx) : Number(e.x), cy = e.tipo === 'cerchio' ? Number(e.cy) : Number(e.y), d = e.tipo === 'cerchio' ? 2 * Number(e.r) : Number(l.d);
          if (!(d > 0)) return;
          zone.push({ P: cerchio(cx, cy, d / 2), z: l.passante ? -lz : -(prof > 0 ? prof : d * 2), smusso: sm + (l.op === 'maschio' ? d * 0.1 : 0) });
          if (Number(l.lamD) > 0) zone.push({ P: cerchio(cx, cy, Number(l.lamD) / 2), z: -(Number(l.lamProf) || d * 0.6), smusso: 0 });
          return;
        }
        if (!(prof > 0)) return;
        const P = poli(e); if (!P) return;
        if (l.op === 'contorno') zone.push({ P, fuori: (l.lato || 'esterno') === 'esterno', z: -prof, smusso: sm, solo: l.lato === 'interno' ? false : undefined });
        else zone.push({ P, z: -prof, smusso: sm });
      }));
      if (!zone.length) return false;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x = x0 + (i + 0.5) * cella, y = y0 + (j + 0.5) * cella, k = j * nx + i;
        let z = 0, vicino = Infinity;
        zone.forEach(q => {
          const dentro = dentroPoli(x, y, q.P), d = distPoli(x, y, q.P);
          if (d < q.smusso + cella + TOLL) ign[k] = 1;
          if ((q.fuori ? !dentro : dentro) && q.z < z) z = q.z;
          vicino = Math.min(vicino, d);
        });
        tgt[k] = z; bordo[k] = vicino;
      }
      m.bersaglio = { tipo: 'fresa', tgt, ign };
      return true;
    }
    if (m.tipo === 'tornio' && b.tipo === 'tornio' && O.trattiTornio) {
      const g = O.trattiTornio(b.punti || []);
      if (g.errore) return false;
      const P = O.polilineaProfilo(g.tratti, 0.2);
      const zFine = Math.min.apply(null, P.map(q => q.a));
      const rOut = z => { let r = -Infinity; for (let i = 0; i < P.length - 1; i++) { const a = P[i], c = P[i + 1]; const lo = Math.min(a.a, c.a), hi = Math.max(a.a, c.a); if (z < lo - 1e-9 || z > hi + 1e-9) continue; const rr = Math.abs(c.a - a.a) < 1e-9 ? Math.max(a.b, c.b) : a.b + (c.b - a.b) * (z - a.a) / (c.a - a.a); if (rr > r) r = rr; } return r; };
      const vuoti = [], ignora = [];   // rettangoli in (z, r): [z0, z1, r0, r1]
      let rIn = () => 0, zTronca = -Infinity;
      const fori = [], profIn = [];
      (b.fasi || []).forEach(({ op, c }) => {
        if (op === 'foratura') fori.push([-(c.prof - c.dpunta * 0.3), c.dpunta / 2, -c.prof]);
        else if (op === 'interna') fori.push([-c.l, c.di / 2, -c.l]);
        else if (op === 'profiloInterno') { const gi = O.trattiTornio(c.punti || []); if (!gi.errore) profIn.push(O.polilineaProfilo(gi.tratti, 0.2)); }
        else if (op === 'filetto') { const d1 = Math.min(c.d, c.d2 || c.d) / 2 - (c.h || 0.7 * c.p) - 0.3; ignora.push([-c.l - 1, 5, d1, Math.max(c.d, c.d2 || c.d) / 2 + 0.3]); }
        else if (op === 'filettoInt') ignora.push([-c.l - 0.5, 5, (c.d1 || c.d * 0.85) / 2 - 0.3, Math.max(c.d, c.d2 || c.d) / 2 + 0.3]);
        else if (op === 'gola') vuoti.push([c.zg - c.b, c.zg, c.dfondo / 2, 1e9]);
        else if (op === 'golaFrontale') vuoti.push([-c.prof, 1, c.dInt / 2, c.dEst / 2]);
        else if (op === 'golaInterna') vuoti.push([c.zg - c.b, c.zg, 0, c.dfondo / 2]);
        else if (op === 'maschiatura' || op === 'alesaturaAsse') ignora.push([-(c.prof || 0) - 3, 5, 'foro', 0]);
        else if (op === 'troncatura') zTronca = c.zt;
      });
      const raggioPoli = (Q, z) => { let r = -Infinity; for (let i = 0; i < Q.length - 1; i++) { const a = Q[i], c = Q[i + 1]; if (z < Math.min(a.a, c.a) - 1e-9 || z > Math.max(a.a, c.a) + 1e-9) continue; const rr = Math.abs(c.a - a.a) < 1e-9 ? Math.min(a.b, c.b) : a.b + (c.b - a.b) * (z - a.a) / (c.a - a.a); if (rr > r) r = rr; } return r; };
      rIn = z => { let r = 0; fori.forEach(([zf, rr, zc]) => { if (z >= zf - 1e-9 && z <= 0.5 && rr > r) r = rr; }); profIn.forEach(Q => { const rr = raggioPoli(Q, Math.min(z, 0)); if (z <= 0.5 && rr > r) r = rr; }); return r; };
      // maschio e alesatore: il foro finito e un po' piu grande della punta, la zona intorno non si guarda
      ignora.forEach(v => { if (v[2] === 'foro') { const rr = fori.length ? fori[0][1] : 0; v[2] = Math.max(0, rr - 1.5); v[3] = rr + 2.5; } });
      const { nz, nr, cella, zBot } = m, ts = new Int8Array(nz * nr);
      for (let a = 0; a < nz; a++) {
        const z = zBot + (a + 0.5) * cella, dz = TOLL + cella / 2;
        // vicino a uno spallamento o al fondo di un foro il raggio cambia: si prendono il piu piccolo e il piu grande
        const roA = [rOut(z - dz), rOut(z), rOut(z + dz)].filter(isFinite), riA = [rIn(z - dz), rIn(z), rIn(z + dz)];
        const ro = roA.length ? Math.min.apply(null, roA) : -Infinity, roM = roA.length ? Math.max.apply(null, roA) : -Infinity, ri = Math.max.apply(null, riA), riM = Math.min.apply(null, riA);
        for (let q = 0; q < nr; q++) {
          const r = (q + 0.5) * cella, k = a * nr + q;
          let st;
          if (z < Math.max(zFine, zTronca) + TOLL + cella) st = -1;           // oltre il pezzo (verso il mandrino o dopo la troncatura)
          else if (z > -TOLL - cella / 2) st = z > TOLL + cella / 2 ? 0 : -1;   // davanti alla faccia: vuoto (vicino alla faccia non si guarda)
          else if (!isFinite(ro)) st = -1;
          else if (r > roM + TOLL + cella / 2 || r < riM - TOLL - cella / 2) st = 0;
          else if (r < ro - TOLL - cella / 2 && r > ri + TOLL + cella / 2) st = 1;
          else st = -1;
          if (st === 1 && vuoti.some(v => z >= v[0] - 1e-9 && z <= v[1] + 1e-9 && r >= v[2] && r <= v[3])) st = 0;
          if (st !== -1 && vuoti.some(v => Math.abs(z - v[0]) < cella + TOLL || Math.abs(z - v[1]) < cella + TOLL || Math.abs(r - v[2]) < cella + TOLL || Math.abs(r - v[3]) < cella + TOLL) && vuoti.some(v => z >= v[0] - cella - TOLL && z <= v[1] + cella + TOLL && r >= v[2] - cella - TOLL && r <= v[3] + cella + TOLL)) st = -1;
          if (st !== -1 && ignora.some(v => z >= v[0] && z <= v[1] && r >= v[2] && r <= v[3])) st = -1;
          if (st !== -1 && z > -1.2 && (Math.abs(r - ri) < 1.2 || Math.abs(r - roM) < 1.2)) st = -1;   // smussi d'imbocco sugli spigoli della faccia
          if (st !== -1 && fori.some(([zf, rr, zc]) => z >= zc - TOLL - cella && z <= zf + TOLL + cella && r < rr + cella + TOLL)) st = -1;   // fondo del foro (cono della punta)
          ts[k] = st;
        }
      }
      m.bersaglio = { tipo: 'tornio', ts };
      return true;
    }
    return false;
  }
  /** Confronto dello stato attuale con la forma voluta: stato per cella (1 resta materiale, 2 tagliato troppo, 0 giusto, -1 non si guarda). */
  function confronta(m) {
    const B = m && m.bersaglio; if (!B) return null;
    let resta = 0, troppo = 0, vR = 0, vT = 0;
    if (B.tipo === 'fresa') {
      const { h, cella, lz } = m, st = m._stato || (m._stato = new Int8Array(h.length)), A2 = cella * cella;
      for (let k = 0; k < h.length; k++) {
        if (B.ign[k]) { st[k] = -1; continue; }
        const v = Math.max(h[k], -lz), d = v - Math.max(B.tgt[k], -lz);
        if (d > TOLL) { st[k] = 1; resta++; vR += d * A2; } else if (d < -TOLL) { st[k] = 2; troppo++; vT += -d * A2; } else st[k] = 0;
      }
      return { stato: st, resta, troppo, volResta: vR, volTroppo: vT };
    }
    const { occ, nr, cella } = m, st = m._stato || (m._stato = new Int8Array(occ.length));
    for (let k = 0; k < occ.length; k++) {
      const t = B.ts[k]; if (t < 0) { st[k] = -1; continue; }
      const r = ((k % nr) + 0.5) * cella, v = 2 * Math.PI * r * cella * cella;
      if (occ[k] && t === 0) { st[k] = 1; resta++; vR += v; } else if (!occ[k] && t === 1) { st[k] = 2; troppo++; vT += v; } else st[k] = 0;
    }
    return { stato: st, resta, troppo, volResta: vR, volTroppo: vT };
  }

  Object.assign(O, { creaMateriale, diametroDaCommento, preparaBersaglio, confrontaMateriale: confronta });
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
