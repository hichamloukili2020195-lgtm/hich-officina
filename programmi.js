// ===== Hich-Officina: programmi per fresatrice e macro (senza interfaccia) =====
// ISO a 3 assi: G90, piano XY, origine pezzo con G54, Z0 sulla faccia superiore, compensazione lunghezza G43.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  const gc = O.gc;
  const pos = v => v > 0;

  /**
   * Programma per fresatrice.
   * c comuni = {num, nome, t, n (giri), f (mm/min), fp (avanzamento in Z), zSic, zR, refrig, g43, fineZ, numerare}
   * op = 'spianatura' | 'contorno' | 'tasca' | 'fori'
   * Ritorna {righe, percorso:[{x0,y0,z0,x,y,z,rapido}], pezzo:{x0,y0,x1,y1,z0,z1}, avvisi, errore}
   */
  function gcodeFresa(op, c) {
    const R = [], P = [], avvisi = [];
    const err = e => ({ errore: e, righe: [], percorso: [], avvisi: [] });
    let X = NaN, Y = NaN, Z = NaN;
    const muovi = (g, x, y, z, extra) => {
      const p = [g];
      if (x !== null && x !== X) p.push('X' + gc(x));
      if (y !== null && y !== Y) p.push('Y' + gc(y));
      if (z !== null && z !== Z) p.push('Z' + gc(z));
      if (extra) p.push(extra);
      if (p.length === 1) return;
      R.push(p.join(' '));
      const n = { x: x === null ? X : x, y: y === null ? Y : y, z: z === null ? Z : z };
      if (!isNaN(X) && !isNaN(Y) && !isNaN(Z)) P.push({ x0: X, y0: Y, z0: Z, x: n.x, y: n.y, z: n.z, rapido: g === 'G0' });
      X = n.x; Y = n.y; Z = n.z;
    };
    const rap = (x, y, z, e) => muovi('G0', x, y, z, e);
    let fUltimo = null;
    const lav = (x, y, z, f) => {
      const e = f && f !== fUltimo ? 'F' + Math.round(f) : '';
      if (e) fUltimo = f;
      muovi('G1', x, y, z, e);
    };
    { const k = O.campoNonValido(c); if (k) return err('Il valore di "' + k + '" non e valido (numero infinito, non numerico o enorme).'); }
    if (!pos(c.n)) return err('Giri mancanti.');
    if (!pos(c.f)) return err('Avanzamento mancante.');
    const fp = pos(c.fp) ? c.fp : Math.round(c.f * 0.3);
    const zSic = pos(c.zSic) ? c.zSic : 50, zR = pos(c.zR) ? c.zR : 2;
    const t = Math.max(1, Math.round(c.t || 1));
    const testa = () => {
      R.push('%');
      R.push('O' + String(Math.max(1, Math.round(c.num || 1))).padStart(4, '0') + ' (' + String(c.nome || op).toUpperCase().replace(/[()]/g, '') + ')');
      R.push('(CONTROLLARE IL PROGRAMMA PRIMA DI LAVORARE)');
      R.push('G21 G17 G40 G49 G80 G90');
      R.push('T' + t + ' M6');
      R.push('G54');
      R.push('S' + Math.round(c.n) + ' M3');
    };
    const avvicina = (x, y) => {
      rap(x, y, null);
      if (c.g43 === false) rap(null, null, zSic, c.refrig === false ? '' : 'M8');
      else { R.push('G43 H' + t + ' Z' + gc(zSic) + (c.refrig === false ? '' : ' M8')); Z = zSic; }
    };
    const coda = () => {
      rap(null, null, zSic);
      R.push('M5');
      if (c.refrig !== false) R.push('M9');
      if (pos(c.fineZ) && c.fineZ !== zSic) rap(null, null, c.fineZ);
      R.push('M30');
      R.push('%');
    };
    const livelli = (prof, ap) => {
      const L = [];
      const n = Math.max(1, Math.ceil(prof / ap - 1e-9));
      for (let i = 1; i <= n; i++) L.push(-prof * i / n);   // passate uguali
      return L;
    };
    /** Arco G2/G3 nel piano XY (anche elica con z), con I J dal punto di partenza; l'anteprima lo spezza. */
    const arco = (cw, x, y, z, cx, cy, f, extra) => {
      const p = [cw ? 'G2' : 'G3', 'X' + gc(x), 'Y' + gc(y)];
      if (z !== null && z !== undefined && z !== Z) p.push('Z' + gc(z));
      p.push('I' + gc(cx - X), 'J' + gc(cy - Y));
      if (f && f !== fUltimo) { p.push('F' + Math.round(f)); fUltimo = f; }
      if (extra) p.push(extra);
      R.push(p.join(' '));
      const z1 = z === null || z === undefined ? Z : z;
      const r0 = Math.hypot(X - cx, Y - cy);
      let a0 = Math.atan2(Y - cy, X - cx), a1 = Math.atan2(y - cy, x - cx), d = a1 - a0;
      if (cw) { while (d >= -1e-9) d -= 2 * Math.PI; } else { while (d <= 1e-9) d += 2 * Math.PI; }
      const k = Math.max(6, Math.ceil(Math.abs(d) * r0 / 1.5));
      let px = X, py = Y, pz = Z;
      for (let i = 1; i <= k; i++) {
        const a = a0 + d * i / k, nx = i === k ? x : cx + r0 * Math.cos(a), ny = i === k ? y : cy + r0 * Math.sin(a), nz = Z + (z1 - Z) * i / k;
        P.push({ x0: px, y0: py, z0: pz, x: nx, y: ny, z: nz, rapido: false });
        px = nx; py = ny; pz = nz;
      }
      X = x; Y = y; Z = z1;
    };
    let pezzo = null;

    if (op === 'spianatura') {
      const { lx, ly, prof, ap, d } = c;
      if (!pos(lx) || !pos(ly)) return err('Misure del pezzo mancanti.');
      if (!pos(d)) return err('Diametro della fresa mancante.');
      if (!pos(prof) || !pos(ap)) return err('Sovrametallo e profondita di passata mancanti.');
      const step = d * Math.min(0.9, Math.max(0.1, (c.ae > 0 ? c.ae : 70) / 100));
      const ys = [];
      let y = step - d / 2;
      for (let k = 0; k < 1000; k++) { ys.push(y); if (y + d / 2 >= ly - 1e-9) break; y += step; }
      const xA = -d / 2 - 3, xB = lx + d / 2 + 3;
      testa();
      avvicina(xA, ys[0]);
      const zTop = c.zTop > 0 ? c.zTop : 0;   // sopra del grezzo (Z0 sulla faccia finita): si spiana da zTop a zTop - prof
      for (const z0 of livelli(prof, ap)) {
        const z = z0 + zTop;
        rap(xA, ys[0], null); rap(null, null, z + zR);
        lav(null, null, z, fp);
        ys.forEach((yy, i) => {
          if (i) lav(null, yy, null, c.f);
          lav(i % 2 ? xA : xB, null, null, c.f);
        });
        rap(null, null, zR);
      }
      coda();
      pezzo = { x0: 0, y0: 0, x1: lx, y1: ly, z0: -Math.max(prof * 3, 5), z1: zTop };
      avvisi.push(ys.length + ' passate per livello, passo laterale ' + gc(step) + ' mm. Origine nello spigolo in basso a sinistra.');
    } else if (op === 'contorno') {
      const { lx, ly, prof, ap, d } = c;
      if (!pos(lx) || !pos(ly)) return err('Misure del pezzo mancanti.');
      if (!pos(d)) return err('Diametro della fresa mancante.');
      if (!pos(prof) || !pos(ap)) return err('Profondita e profondita di passata mancanti.');
      const s = c.sovra > 0 ? c.sovra : 0;
      const giro = rr => {
        // fuori dal pezzo in senso orario: fresatura concorde con mandrino M3
        lav(-rr, ly + rr, null, c.f); lav(lx + rr, null, null, c.f); lav(null, -rr, null, c.f); lav(-rr - d, null, null, c.f);
      };
      testa();
      const ingresso = rr => [-rr, -rr - d];
      const r0 = d / 2 + s;
      avvicina(...ingresso(r0));
      for (const z of livelli(prof, ap)) {
        rap(...ingresso(r0), null); rap(null, null, zR);
        lav(null, null, z, fp);
        lav(null, -r0, null, c.f);
        giro(r0);
        rap(null, null, zR);
      }
      if (s > 0 && c.finitura) {
        R.push('(FINITURA)');
        const r1 = d / 2;
        rap(...ingresso(r1), null); rap(null, null, zR);
        lav(null, null, -prof, fp);
        lav(null, -r1, null, c.f);
        giro(r1);
        rap(null, null, zR);
      }
      coda();
      pezzo = { x0: 0, y0: 0, x1: lx, y1: ly, z0: -prof - 5, z1: 0 };
      avvisi.push('Contorno esterno con origine nello spigolo in basso a sinistra, fresatura concorde. Spigoli vivi.');
    } else if (op === 'tasca') {
      const { cx = 0, cy = 0, lx, ly, prof, ap, d } = c;
      if (!pos(lx) || !pos(ly)) return err('Misure della tasca mancanti.');
      if (!pos(d)) return err('Diametro della fresa mancante.');
      if (!pos(prof) || !pos(ap)) return err('Profondita e profondita di passata mancanti.');
      const s = c.sovra > 0 ? c.sovra : 0;
      const a = lx / 2 - d / 2 - s, b = ly / 2 - d / 2 - s;
      if (a < 0 || b < 0) return err('La fresa e troppo grande per la tasca.');
      const step = d * Math.min(0.9, Math.max(0.1, (c.ae > 0 ? c.ae : 50) / 100));
      const n = Math.ceil(Math.max(a, b) / step - 1e-9);
      const giri = [];
      for (let i = n; i >= 0; i--) giri.push([Math.max(a - i * step, 0), Math.max(b - i * step, 0)]);
      const rett = (ha, hb) => {
        // dentro la tasca in senso antiorario: fresatura concorde
        lav(cx + ha, cy - hb, null, c.f); lav(null, cy + hb, null, c.f); lav(cx - ha, null, null, c.f);
        lav(null, cy - hb, null, c.f); lav(cx + ha, null, null, c.f);
      };
      // discesa a rampa lungo il lato lungo (3 gradi), altrimenti dritta
      const lungoX = a >= b, mezza = Math.min(lungoX ? a : b, d / 2 + 2);
      testa();
      avvicina(cx, cy);
      let zPrima = 0;
      for (const z of livelli(prof, ap)) {
        if (Z > zR) rap(cx, cy, null);
        rap(null, null, zPrima + 1);
        if (mezza >= 1) {
          const dzMax = mezza * Math.tan(3 * Math.PI / 180);   // prudente: 3 gradi anche sul primo tratto
          let zz = zPrima + 0.5, lato = 1;
          lav(null, null, zz, fp);
          while (zz > z + 1e-9) {
            zz = Math.max(zz - dzMax, z);
            if (lungoX) lav(cx + lato * mezza, null, zz, fp); else lav(null, cy + lato * mezza, zz, fp);
            lato = -lato;
          }
          if (lungoX) lav(cx, null, null, c.f); else lav(null, cy, null, c.f);
        } else lav(null, null, z, fp);
        for (const [ha, hb] of giri) {
          lav(cx + ha, cy - hb, null, c.f);
          rett(ha, hb);
        }
        lav(cx, cy, null, c.f);
        zPrima = z;
      }
      if (s > 0 && c.finitura) {
        R.push('(FINITURA)');
        const A = lx / 2 - d / 2, B = ly / 2 - d / 2;
        lav(cx + A, cy - B, null, c.f);
        rett(A, B);
        lav(cx, cy, null, c.f);
      }
      rap(null, null, zR);
      coda();
      pezzo = { x0: cx - lx / 2 - 10, y0: cy - ly / 2 - 10, x1: cx + lx / 2 + 10, y1: cy + ly / 2 + 10, z0: -prof - 8, z1: 0,
        tasca: { x0: cx - lx / 2, y0: cy - ly / 2, x1: cx + lx / 2, y1: cy + ly / 2 } };
      avvisi.push((n + 1) + ' giri per livello, discesa a rampa di 3°. Raggio negli spigoli = raggio della fresa (' + gc(d / 2) + ').');
    } else if (op === 'fori') {
      const pti = c.punti || [];
      if (!pti.length) return err('Nessun foro: scrivi le coordinate o scegli uno schema.');
      if (!pos(c.prof)) return err('Profondita mancante.');
      const ciclo = c.ciclo || 'G81';
      testa();
      avvicina(pti[0][0], pti[0][1]);
      rap(null, null, zR + 10 > zSic ? zSic : zR + 10);
      const pz = -c.prof;
      let riga = 'G98 ' + ciclo + ' X' + gc(pti[0][0]) + ' Y' + gc(pti[0][1]) + ' Z' + gc(pz) + ' R' + gc(zR);
      if (ciclo === 'G83' || ciclo === 'G73') riga += ' Q' + gc(c.q > 0 ? c.q : c.d || 2);
      if (ciclo === 'G82') riga += ' P' + Math.round(c.sosta > 0 ? c.sosta : 300);
      riga += ' F' + Math.round(c.f);
      R.push(riga);
      const zTop = Z;
      pti.forEach(([x, y], i) => {
        if (i) R.push('X' + gc(x) + ' Y' + gc(y));
        P.push({ x0: x, y0: y, z0: zR, x, y, z: pz, rapido: false });
        if (i < pti.length - 1) P.push({ x0: x, y0: y, z0: zTop, x: pti[i + 1][0], y: pti[i + 1][1], z: zTop, rapido: true });
      });
      R.push('G80');
      X = pti[pti.length - 1][0]; Y = pti[pti.length - 1][1];
      coda();
      const xs = pti.map(p => p[0]), ys = pti.map(p => p[1]);
      const m = Math.max(10, (c.d || 5) * 2);
      pezzo = { x0: Math.min(...xs) - m, y0: Math.min(...ys) - m, x1: Math.max(...xs) + m, y1: Math.max(...ys) + m, z0: Math.min(pz - 5, -10), z1: 0 };
      avvisi.push(pti.length + ' fori con ' + ciclo + ', piano R' + gc(zR) + ', ritorno al piano iniziale (G98).');
      if (ciclo === 'G84') avvisi.push('Maschiatura: avanzamento = passo x giri. Su alcune macchine serve la maschiatura rigida prima del ciclo.');
    } else if (op === 'profilo') {
      if (!O.percorsoFresaProfilo) return err('Profili non disponibili.');
      if (!pos(c.prof) || !pos(c.ap)) return err('Profondita e profondita di passata mancanti.');
      const pr = O.percorsoFresaProfilo(Object.assign({}, c, { f: c.f, fp, zR, t }));
      if (pr.errore) return err(pr.errore);
      testa();
      const m0 = pr.mosse[0];
      avvicina(m0.x, m0.y);
      for (const m of pr.mosse) {
        if (m.g === 0) rap(m.x === undefined ? null : m.x, m.y === undefined ? null : m.y, m.z === undefined ? null : m.z);
        else if (m.g === 1) {
          if (m.extra) { const prima = R.length; lav(m.x === undefined ? null : m.x, m.y === undefined ? null : m.y, m.z === undefined ? null : m.z, m.f); if (R.length > prima) R[R.length - 1] = R[R.length - 1].replace(/^G1/, 'G1 ' + m.extra); }
          else lav(m.x === undefined ? null : m.x, m.y === undefined ? null : m.y, m.z === undefined ? null : m.z, m.f);
        } else arco(m.g === 2, m.x, m.y, null, m.cx, m.cy, m.f);
      }
      coda();
      const xs = [], ys = [];
      P.forEach(s => { if (!s.rapido) { xs.push(s.x); ys.push(s.y); } });
      pezzo = { x0: Math.min(...xs) - 5, y0: Math.min(...ys) - 5, x1: Math.max(...xs) + 5, y1: Math.max(...ys) + 5, z0: -c.prof - 5, z1: 0 };
      avvisi.push(...pr.avvisi);
      avvisi.unshift(pr.livelli + ' passate in Z, ' + pr.tratti.length + ' tratti.');
    } else if (op === 'tascaCircolare') {
      const { cx = 0, cy = 0, dt, prof, ap, d } = c;
      if (!pos(dt) || !pos(d)) return err('Diametro della tasca e della fresa mancanti.');
      if (!pos(prof) || !pos(ap)) return err('Profondita e passata mancanti.');
      const s = c.sovra > 0 ? c.sovra : 0;
      const rf = dt / 2 - d / 2;
      if (rf <= 0.05) return err('La fresa e troppo grande per la tasca.');
      const rr = Math.max(rf - s, 0.05);
      const step = d * Math.min(0.9, Math.max(0.1, (c.ae > 0 ? c.ae : 40) / 100));
      const re = Math.min(rr, d * 0.25);                 // raggio dell'elica di discesa
      const passoElica = Math.max(0.1, 2 * Math.PI * re * Math.tan(3 * Math.PI / 180));
      testa();
      avvicina(cx, cy);
      rap(null, null, zR);
      let zPrima = 0;
      for (const z of livelli(prof, ap)) {
        // dal centro, perpendicolare, all'inizio dell'elica; giu a elica fino al livello; un giro in piano
        lav(cx + re, cy, zPrima + 0.2, fp);
        let zz = zPrima + 0.2;
        while (zz > z + 1e-9) { const zn = Math.max(zz - passoElica, z); arco(false, cx + re, cy, zn, cx, cy, fp); zz = zn; }
        arco(false, cx + re, cy, null, cx, cy, c.f);
        // cerchi verso fuori
        let r = re;
        while (r < rr - 1e-9) { r = Math.min(r + step, rr); lav(cx + r, cy, null, c.f); arco(false, cx + r, cy, null, cx, cy, c.f); }
        lav(cx, cy, null, c.f);   // si torna al centro, perpendicolare
        zPrima = z;
      }
      if (s > 0 && c.finitura) {
        R.push('(FINITURA)');
        lav(cx + rf, cy, null, c.f);
        arco(false, cx + rf, cy, null, cx, cy, c.f);
        lav(cx, cy, null, c.f);
      }
      rap(null, null, zR);
      coda();
      pezzo = { x0: cx - dt / 2 - 10, y0: cy - dt / 2 - 10, x1: cx + dt / 2 + 10, y1: cy + dt / 2 + 10, z0: -prof - 8, z1: 0 };
      avvisi.push('Discesa a elica (3°) dal centro, cerchi verso fuori, uscita al centro.');
    } else if (op === 'asola') {
      const { x1 = 0, y1 = 0, x2, y2 = 0, w, prof, ap, d } = c;
      if (!isFinite(x2) || !pos(w) || !pos(d)) return err('Punti dell\'asola, larghezza e fresa mancanti.');
      if (!pos(prof) || !pos(ap)) return err('Profondita e passata mancanti.');
      if (w < d - 1e-9) return err('L\'asola e piu stretta della fresa.');
      const L = Math.hypot(x2 - x1, y2 - y1);
      if (L < 1e-6) return err('I due centri dell\'asola coincidono: e un foro, usa la tasca circolare.');
      const ux = (x2 - x1) / L, uy = (y2 - y1) / L;
      const off = (w - d) / 2;
      const giri = [];
      if (off > 1e-6) { const passo = d * 0.8; for (let o = Math.min(passo, off); ; o = Math.min(o + passo, off)) { giri.push(o); if (o >= off - 1e-9) break; } }
      testa();
      avvicina(x1, y1);
      rap(null, null, zR);
      let zPrima = 0;
      const dz = L * Math.tan(3 * Math.PI / 180);
      for (const z of livelli(prof, ap)) {
        // rampa avanti e indietro sulla linea di mezzo
        let zz = zPrima + 0.2, avanti = true;
        lav(null, null, zz, fp);
        while (zz > z + 1e-9) { zz = Math.max(zz - dz, z); lav(avanti ? x2 : x1, avanti ? y2 : y1, zz, fp); avanti = !avanti; }
        lav(avanti ? x2 : x1, avanti ? y2 : y1, null, c.f);
        if (!avanti) lav(x1, y1, null, c.f);
        for (const o of giri) {
          // giro antiorario (concorde dentro l'asola)
          const nx = uy * o, ny = -ux * o;   // a destra della direzione 1 -> 2
          lav(x1 + nx, y1 + ny, null, c.f);
          lav(x2 + nx, y2 + ny, null, c.f);
          arco(false, x2 - nx, y2 - ny, null, x2, y2, c.f);
          lav(x1 - nx, y1 - ny, null, c.f);
          arco(false, x1 + nx, y1 + ny, null, x1, y1, c.f);
          lav(x1, y1, null, c.f);
        }
        zPrima = z;
      }
      rap(null, null, zR);
      coda();
      pezzo = { x0: Math.min(x1, x2) - w - 5, y0: Math.min(y1, y2) - w - 5, x1: Math.max(x1, x2) + w + 5, y1: Math.max(y1, y2) + w + 5, z0: -prof - 5, z1: 0 };
      avvisi.push('Asola lunga ' + gc(L + w) + ' e larga ' + gc(w) + ': discesa a rampa sulla linea di mezzo' + (giri.length ? ', ' + giri.length + ' giri sul bordo.' : '.'));
    } else if (op === 'filettoFresa') {
      const { cx = 0, cy = 0, D, p, prof, d } = c;
      const interno = c.tipoFil !== 'esterno';
      if (!pos(D) || !pos(p) || !pos(prof) || !pos(d)) return err('Diametro, passo, lunghezza del filetto e fresa mancanti.');
      const f = O.filetto(D, p);
      const np = Math.max(1, Math.round(c.np || 1));
      // raggio del centro fresa: all'esterno del profilo per l'interno, verso il pezzo per l'esterno
      const rFin = interno ? D / 2 - d / 2 : D / 2 - f.hEsterno + d / 2;
      const rIni = interno ? f.nocciolo / 2 - d / 2 + 0.05 : D / 2 + d / 2 + 0.05;
      if (interno && d >= f.nocciolo - 0.2) return err('La fresa (D' + gc(d) + ') non entra nel preforo D' + gc(f.nocciolo) + '.');
      if (interno && rFin <= 0) return err('Fresa troppo grande per il filetto.');
      const giriElica = Math.ceil(prof / p) + 1;
      testa();
      if (interno) {
        avvicina(cx, cy);
        rap(null, null, zR);
        for (let k = 1; k <= np; k++) {
          const rc = rIni + (rFin - rIni) * k / np;
          lav(null, null, -prof - p / 2, fp);
          lav(cx + rc, cy, null, c.f);                          // entrata perpendicolare dal centro
          for (let g = 1; g <= giriElica; g++) arco(false, cx + rc, cy, -prof - p / 2 + p * g, cx, cy, c.f);   // G3 in salita: destro, concorde
          lav(cx, cy, null, c.f);                               // uscita al centro
        }
      } else {
        const rFuori = rIni + 2;
        avvicina(cx + rFuori, cy);
        rap(null, null, zR);
        for (let k = 1; k <= np; k++) {
          const rc = rIni + (rFin - rIni) * k / np;
          lav(null, null, p / 2, fp);
          lav(cx + rc, cy, null, c.f);
          for (let g = 1; g <= giriElica; g++) arco(true, cx + rc, cy, p / 2 - p * g, cx, cy, c.f);       // G2 in discesa: destro, concorde
          lav(cx + rFuori, cy, null, c.f);
          rap(null, null, zR);
        }
      }
      rap(null, null, zR);
      coda();
      pezzo = { x0: cx - D, y0: cy - D, x1: cx + D, y1: cy + D, z0: -prof - 5, z1: 0, tasca: interno ? { x0: cx - f.nocciolo / 2, y0: cy - f.nocciolo / 2, x1: cx + f.nocciolo / 2, y1: cy + f.nocciolo / 2 } : null };
      avvisi.push('Filetto M' + String(D).replace('.', ',') + 'x' + String(p).replace('.', ',') + (interno ? ' interno' : ' esterno') + ' destro, ' + np + ' passate radiali, ' + giriElica + ' giri d\'elica. Fresa a un profilo con passo ' + gc(p) + '; centro a raggio ' + gc(rFin) + ': correggi con il raggio nel correttore se serve.');
    } else {
      return err('Lavorazione sconosciuta.');
    }
    // numeri di riga a richiesta (non sulla % e sulla riga O)
    let righe = R;
    if (c.numerare) {
      let k = 0;
      righe = R.map(l => (/^(%|O\d|N\d)/.test(l) ? l : 'N' + (k += 10) + ' ' + l));
    }
    return { righe, percorso: P, pezzo, avvisi };
  }

  // ----- piu lavorazioni nello stesso programma -----
  // Ordine di officina (lo stesso di serie del programma parametrico): spianatura, centrini, punte a inserti, forature,
  // lamature, fori a fresa, alesature, smusso d'imbocco e maschiatura, smussi, profili. Lo stesso utensile di seguito
  // non fa il cambio; un ordine che non si puo lavorare non si accetta.
  const ORDINE = { spianatura: 0, centrino: 1, puntaIns: 2, puntaMD: 3, lamatore: 4, tascaCircolare: 5, alesatore: 6, bareno: 6,
    smussoMaschio: 7, maschio: 7.5, filettoFresa: 7.5, smussatore: 8, contorno: 9, profilo: 9, tasca: 9, asola: 9 };
  const NOME_FASE = { spianatura: 'Spianatura', centrino: 'Centrinatura', puntaIns: 'Punta a inserti', puntaMD: 'Foratura', lamatore: 'Lamatura',
    tascaCircolare: 'Tasca circolare', alesatore: 'Alesatura', bareno: 'Barenatura', smussoMaschio: 'Smusso d\'imbocco', maschio: 'Maschiatura',
    filettoFresa: 'Filetto a fresa', smussatore: 'Smusso', contorno: 'Contornatura', profilo: 'Profilo', tasca: 'Tasca', asola: 'Asola' };
  const PREFORO = ['puntaMD', 'puntaIns', 'tascaCircolare'];
  const DOPO_PREFORO = ['maschio', 'alesatore', 'bareno', 'filettoFresa', 'smussoMaschio'];
  /** Chiave dei punti di una fase (per sapere se due fasi lavorano gli stessi fori). */
  const chiavePunti = f => {
    const pts = f.op === 'fori' ? (f.c.punti || []) : (f.op === 'tascaCircolare' || f.op === 'filettoFresa') ? [[f.c.cx || 0, f.c.cy || 0]] : null;
    return pts ? pts.map(p => p.map(v => Math.round(v * 100) / 100).join(',')).sort().join(';') : null;
  };
  /** Il tipo di una fase per l'ordine: l'utensile per i fori, la lavorazione per il resto. */
  function tipoFase(f, fasi) {
    if (f.op !== 'fori') return f.op;
    const t = f.tipoUt || 'puntaMD';
    if (t === 'smussatore') {
      const k = chiavePunti(f);
      if ((fasi || []).some(g => g !== f && (g.tipoUt === 'maschio' || g.op === 'filettoFresa') && chiavePunti(g) === k)) return 'smussoMaschio';
    }
    return t;
  }
  function ordinaFasi(fasi) {
    return fasi.map((f, i) => ({ f, i, k: ORDINE[tipoFase(f, fasi)] !== undefined ? ORDINE[tipoFase(f, fasi)] : 9 }))
      .sort((a, b) => a.k - b.k || a.i - b.i).map(x => x.f);
  }
  /** Errori di un ordine che non si puo lavorare. */
  function controllaFasi(fasi) {
    const errori = [];
    fasi.forEach((f, i) => {
      const tipo = tipoFase(f, fasi);
      if (!DOPO_PREFORO.includes(tipo)) return;
      const k = chiavePunti(f);
      const dopo = fasi.findIndex((g, j) => j > i && PREFORO.includes(tipoFase(g, fasi)) && chiavePunti(g) === k);
      if (dopo >= 0) errori.push('Fase ' + (i + 1) + ' (' + NOME_FASE[tipo] + ' T' + f.c.t + ') viene prima del suo preforo (fase ' + (dopo + 1) + ').');
    });
    return errori;
  }
  /** Un programma solo con tutte le fasi: fasi = [{op, c, titolo, tipoUt}], comuni = {num, nome, numerare}. */
  function gcodeSequenza(fasi, comuni) {
    const err = e => ({ errore: e, righe: [], percorso: [], avvisi: [] });
    if (!fasi.length) return err('La sequenza e vuota: aggiungi le lavorazioni.');
    const errori = controllaFasi(fasi);
    if (errori.length) return err(errori.join(' '));
    const R = [], P = [], avvisi = [];
    let pezzo = null, tPrima = null;
    for (let i = 0; i < fasi.length; i++) {
      const f = fasi[i];
      const r = gcodeFresa(f.op, Object.assign({}, f.c, { numerare: false, num: comuni.num, nome: comuni.nome }));
      if (r.errore) return err('Fase ' + (i + 1) + ' (' + (f.titolo || f.op) + '): ' + r.errore);
      const iT = r.righe.findIndex(l => /^T\d+ M6$/.test(l));
      const iFine = r.righe.lastIndexOf('M30');
      if (!R.length) R.push(...r.righe.slice(0, iT), 'G54');
      R.push('(FASE ' + (i + 1) + ': ' + String(f.titolo || NOME_FASE[tipoFase(f, fasi)] || f.op).toUpperCase().replace(/[()']/g, ' ') + ')');
      r.righe.slice(iT, iFine).forEach(l => {
        if (l === 'G54') return;
        if (/^T\d+ M6$/.test(l) && Number(l.slice(1).split(' ')[0]) === tPrima) return;   // stesso utensile: niente cambio
        R.push(l);
      });
      tPrima = Number(f.c.t);
      P.push(...r.percorso);
      r.avvisi.forEach(a => avvisi.push('Fase ' + (i + 1) + ': ' + a));
      if (r.pezzo) pezzo = pezzo ? { x0: Math.min(pezzo.x0, r.pezzo.x0), y0: Math.min(pezzo.y0, r.pezzo.y0), x1: Math.max(pezzo.x1, r.pezzo.x1), y1: Math.max(pezzo.y1, r.pezzo.y1), z0: Math.min(pezzo.z0, r.pezzo.z0), z1: 0 } : Object.assign({}, r.pezzo, { tasca: null });
    }
    R.push('M30', '%');
    let righe = R;
    if (comuni.numerare) { let k = 0; righe = R.map(l => (/^(%|O\d|N\d)/.test(l) ? l : 'N' + (k += 10) + ' ' + l)); }
    return { righe, percorso: P, pezzo, avvisi };
  }

  /** Punti di foratura da uno schema. */
  function schemaFori(s) {
    const out = [];
    if (s.tipo === 'griglia') {
      const nx = Math.max(1, Math.round(s.nx || 1)), ny = Math.max(1, Math.round(s.ny || 1));
      for (let j = 0; j < ny; j++) {
        const fila = [];
        for (let i = 0; i < nx; i++) fila.push([(s.x0 || 0) + i * (s.px || 0), (s.y0 || 0) + j * (s.py || 0)]);
        if (j % 2) fila.reverse();   // a serpentina: meno strada
        out.push(...fila);
      }
    } else if (s.tipo === 'cerchio') {
      const n = Math.max(1, Math.round(s.n || 1));
      for (let k = 0; k < n; k++) {
        const a = ((s.a || 0) + k * 360 / n) * Math.PI / 180;
        out.push([(s.cx || 0) + s.dc / 2 * Math.cos(a), (s.cy || 0) + s.dc / 2 * Math.sin(a)]);
      }
    } else {
      String(s.testo || '').split(/\n|;/).forEach(r => {
        const m = r.trim().replace(/,/g, '.').match(/^X?\s*(-?\d*\.?\d+)\s+Y?\s*(-?\d*\.?\d+)/i);
        if (m) out.push([Number(m[1]), Number(m[2])]);
      });
    }
    return out;
  }

  // ----- macro -----
  // Macro con chiamata G65 P.... e argomenti a lettere: ogni lettera arriva nel sottoprogramma come variabile locale.
  const LETTERE_VAR = { A: 1, B: 2, C: 3, I: 4, J: 5, K: 6, D: 7, E: 8, F: 9, H: 11, M: 13, Q: 17, R: 18, S: 19, T: 20, U: 21, V: 22, W: 23, X: 24, Y: 25, Z: 26 };

  const MACRO_MODELLI = [
    {
      id: 'forprof', nome: 'Foratura profonda', num: 9001,
      desc: 'Foratura a beccate con risalita completa e scarico del truciolo, avanzamento che cala con la profondita.',
      par: [['Z', 'Profondita finale (negativa)', -50], ['Q', 'Beccata', 5], ['R', 'Piano di partenza', 2], ['F', 'Avanzamento mm/min', 200]],
      corpo: [
        '(FORATURA PROFONDA: Z=#26 Q=#17 R=#18 F=#9)',
        'IF [#26 GE 0] GOTO 90',
        'IF [#17 LE 0] GOTO 90',
        '#100 = #18',
        'G0 Z#18',
        'WHILE [#100 GT #26] DO1',
        '#101 = #100 - #17',
        'IF [#101 LT #26] THEN #101 = #26',
        'G1 Z#101 F#9',
        'G0 Z#18',
        'G0 Z[#101 + 0.5]',
        '#100 = #101',
        'END1',
        'G0 Z#18',
        'GOTO 99',
        'N90 #3000 = 1 (DATI SBAGLIATI)',
        'N99 M99'
      ]
    },
    {
      id: 'tasca', nome: 'Tasca circolare', num: 9002,
      desc: 'Tasca tonda a spirale di cerchi, dal centro verso il bordo, a passate in Z.',
      par: [['D', 'Diametro tasca', 40], ['T', 'Diametro fresa', 10], ['Z', 'Profondita (negativa)', -10], ['Q', 'Passata in Z', 2], ['F', 'Avanzamento mm/min', 600]],
      corpo: [
        '(TASCA CIRCOLARE AL PUNTO X Y ATTUALE)',
        '#110 = #5001 (X ATTUALE)',
        '#111 = #5002 (Y ATTUALE)',
        '#112 = [#7 - #20] / 2 (RAGGIO DEL CENTRO FRESA)',
        'IF [#112 LE 0] GOTO 90',
        '#113 = #20 * 0.4 (PASSO LATERALE)',
        '#114 = 0',
        'WHILE [#114 GT #26] DO1',
        '#114 = #114 - #17',
        'IF [#114 LT #26] THEN #114 = #26',
        'G1 Z#114 F[#9 / 3]',
        '#115 = #113',
        'WHILE [#115 LT #112] DO2',
        'G1 X[#110 + #115] Y#111 F#9',
        'G3 I-#115',
        '#115 = #115 + #113',
        'END2',
        'G1 X[#110 + #112] Y#111',
        'G3 I-#112',
        'G1 X#110 Y#111',
        'END1',
        'G0 Z2.',
        'GOTO 99',
        'N90 #3000 = 2 (FRESA PIU GRANDE DELLA TASCA)',
        'N99 M99'
      ]
    },
    {
      id: 'centraggio', nome: 'Centraggio foro', num: 9003,
      desc: 'Trova il centro di un foro con il tastatore: tocca a X+ X- Y+ Y- e scrive il centro nell\'origine scelta.',
      par: [['D', 'Diametro indicativo del foro', 30], ['F', 'Avanzamento di tastatura', 100], ['W', 'Origine da scrivere (54-59)', 54]],
      corpo: [
        '(CENTRAGGIO: TASTATORE NEL FORO, SOTTO IL BORDO)',
        '(CONTROLLA IL CODICE DI TASTATURA E LE VARIABILI DELLA TUA MACCHINA)',
        '#120 = #7 / 2 + 2',
        'G91 G31 X#120 F#9',
        '#121 = #5061',
        'G90 G0 X[#121 - 1]',
        'G91 G31 X-[#7 + 4] F#9',
        '#122 = #5061',
        '#123 = [#121 + #122] / 2',
        'G90 G0 X#123',
        'G91 G31 Y#120 F#9',
        '#124 = #5062',
        'G90 G0 Y[#124 - 1]',
        'G91 G31 Y-[#7 + 4] F#9',
        '#125 = #5062',
        '#126 = [#124 + #125] / 2',
        'G90 G0 Y#126',
        '(DIAMETRO MISURATO IN X: #121 - #122)',
        '#127 = 5221 + [#23 - 54] * 20',
        '#[#127] = #5021',
        '#[#127 + 1] = #5022',
        'M99'
      ]
    },
    {
      id: 'cambio', nome: 'Cambio utensile sicuro', num: 9004,
      desc: 'Porta Z in alto, ferma mandrino e refrigerante, cambia utensile e richiama la correzione lunghezza.',
      par: [['T', 'Numero utensile', 1], ['Z', 'Z di sicurezza', 100]],
      corpo: [
        '(CAMBIO UTENSILE SICURO)',
        'IF [#20 LE 0] GOTO 90',
        'M5',
        'M9',
        'G90 G0 G53 Z0',
        'T#20 M6',
        'G43 H#20 Z#26',
        'GOTO 99',
        'N90 #3000 = 3 (MANCA IL NUMERO UTENSILE)',
        'N99 M99'
      ]
    },
    {
      id: 'pausa', nome: 'Pausa condizionale', num: 9005,
      desc: 'Ferma il programma ogni N pezzi (controllo misura o cambio inserto) contando nella variabile scelta.',
      par: [['C', 'Ogni quanti pezzi', 10], ['V', 'Variabile contatore (500-999)', 500]],
      corpo: [
        '(PAUSA OGNI #3 PEZZI, CONTATORE #[#22])',
        '#[#22] = #[#22] + 1',
        'IF [#[#22] LT #3] GOTO 99',
        '#[#22] = 0',
        'M5',
        'M9',
        '#3006 = 1 (CONTROLLA IL PEZZO)',
        'N99 M99'
      ]
    },
    {
      id: 'scanalatura', nome: 'Scanalatura a passate', num: 9006,
      desc: 'Scanalatura dritta in X dal punto attuale, a passate in Z con andata e ritorno.',
      par: [['X', 'Lunghezza in X (anche negativa)', 50], ['Z', 'Profondita (negativa)', -6], ['Q', 'Passata in Z', 1], ['F', 'Avanzamento mm/min', 400]],
      corpo: [
        '(SCANALATURA DAL PUNTO ATTUALE)',
        '#130 = #5001',
        '#131 = 0',
        '#132 = 1',
        'WHILE [#131 GT #26] DO1',
        '#131 = #131 - #17',
        'IF [#131 LT #26] THEN #131 = #26',
        'G1 Z#131 F[#9 / 3]',
        'IF [#132 EQ 1] THEN #133 = #130 + #24',
        'IF [#132 EQ -1] THEN #133 = #130',
        'G1 X#133 F#9',
        '#132 = -#132',
        'END1',
        'G0 Z2.',
        'M99'
      ]
    },
    {
      id: 'misura', nome: 'Misura con tastatore', num: 9007,
      desc: 'Tocca in Z al punto X Y attuale, confronta con la quota e la tolleranza, scrive l\'errore nella variabile scelta.',
      par: [['Z', 'Quota nominale della superficie', 0], ['R', 'Distanza di partenza sopra la quota', 5], ['T', 'Tolleranza piu o meno', 0.05],
        ['F', 'Avanzamento di tastatura', 100], ['V', 'Variabile del risultato (500-999)', 510]],
      corpo: [
        '(MISURA IN Z AL PUNTO X Y ATTUALE)',
        '(CONTROLLA IL CODICE DI TASTATURA E LE VARIABILI DELLA TUA MACCHINA)',
        'IF [#20 LE 0] GOTO 90',
        'G90 G0 Z[#26 + #18]',
        'G91 G31 Z-[#18 + 5] F#9',
        '#140 = #5063 (Z TOCCATA)',
        'G90 G0 Z[#26 + #18]',
        '#141 = #140 - #26 (ERRORE)',
        '#[#22] = #141',
        'IF [ABS[#141] LE #20] GOTO 99',
        '#3000 = 10 (QUOTA FUORI TOLLERANZA)',
        'N90 #3000 = 12 (MANCA LA TOLLERANZA)',
        'N99 M99'
      ]
    },
    {
      id: 'serie', nome: 'Pezzi in serie con contatore', num: 9008,
      desc: 'Ripete il programma del pezzo per tutto il lotto, ferma per il cambio pezzo e conta nella variabile scelta.',
      par: [['C', 'Pezzi del lotto', 10], ['S', 'Numero del programma del pezzo', 1001], ['V', 'Variabile contatore (500-999)', 500]],
      corpo: [
        '(LOTTO: RIPETE IL PROGRAMMA DEL PEZZO #3 VOLTE)',
        'IF [#[#22] EQ #0] THEN #[#22] = 0',
        'WHILE [#[#22] LT #3] DO1',
        'M98 P#19',
        '#[#22] = #[#22] + 1',
        'M0 (CAMBIA IL PEZZO E PREMI START)',
        'END1',
        '#[#22] = 0',
        '#3006 = 1 (LOTTO FINITO)',
        'M99'
      ]
    },
    {
      id: 'origini', nome: 'Griglia di pezzi su piu origini', num: 9009,
      desc: 'Esegue lo stesso programma su piu pezzi montati, uno per origine da G54 in avanti.',
      par: [['A', 'Quante origini (da 1 a 6, da G54)', 4], ['S', 'Numero del programma del pezzo', 1001]],
      corpo: [
        '(RIPETE IL PROGRAMMA DEL PEZZO SU #1 ORIGINI DA G54)',
        'IF [#1 LT 1] GOTO 90',
        'IF [#1 GT 6] GOTO 90',
        '#150 = 1',
        'WHILE [#150 LE #1] DO1',
        '#151 = 53 + #150',
        'G#151',
        'M98 P#19',
        '#150 = #150 + 1',
        'END1',
        'G54',
        'GOTO 99',
        'N90 #3000 = 11 (ORIGINI DA 1 A 6)',
        'N99 M99'
      ]
    }
  ];

  /** Controlla una macro e ne scrive la chiamata e il sottoprogramma. */
  function scriviMacro(m) {
    const errori = [];
    const num = Math.round(Number(m.num));
    if (!(num >= 1 && num <= 9999)) errori.push('Numero del sottoprogramma da 1 a 9999.');
    const usate = {};
    const arg = [];
    (m.par || []).forEach(([l, desc, v], i) => {
      const L = String(l || '').trim().toUpperCase();
      if (!L) return;
      if (!LETTERE_VAR[L]) errori.push('Parametro ' + (i + 1) + ': la lettera ' + L + ' non si puo usare (vanno ' + Object.keys(LETTERE_VAR).join(' ') + ').');
      else if (usate[L]) errori.push('La lettera ' + L + ' e usata due volte.');
      usate[L] = true;
      const n = Number(String(v).replace(',', '.'));
      if (String(v).trim() === '' || isNaN(n)) errori.push('Parametro ' + L + ': manca il valore.');
      else arg.push(L + gc(n));
    });
    const chiamata = 'G65 P' + String(num).padStart(4, '0') + (arg.length ? ' ' + arg.join(' ') : '');
    const legenda = (m.par || []).filter(p => LETTERE_VAR[String(p[0]).toUpperCase()])
      .map(p => '(' + String(p[0]).toUpperCase() + ' = #' + LETTERE_VAR[String(p[0]).toUpperCase()] + ' ' + String(p[1] || '').toUpperCase().replace(/[()]/g, '') + ')');
    const sotto = ['O' + String(num).padStart(4, '0') + ' (' + String(m.nome || 'MACRO').toUpperCase().replace(/[()]/g, '') + ')']
      .concat(legenda, String(Array.isArray(m.corpo) ? m.corpo.join('\n') : m.corpo || '').split('\n').map(r => r.trimEnd()).filter(r => r !== ''));
    if (!sotto.some(r => /M99\b/.test(r))) sotto.push('M99');
    return { errori, chiamata, sotto };
  }

  const Prog = { gcodeFresa, gcodeSequenza, ordinaFasi, controllaFasi, tipoFase, NOME_FASE, ORDINE_FASI: ORDINE, schemaFori, MACRO_MODELLI, LETTERE_VAR, scriviMacro };
  Object.assign(O, Prog);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
