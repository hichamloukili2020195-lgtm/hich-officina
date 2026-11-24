// ===== Hich-Officina: materiale che si asporta, utensile con il suo diametro, urti (disegno e collegamento alla simulazione) =====
(function () {
  'use strict';
  const A = window.App, O = A.O;
  const num = v => { const x = O.num(v); return x > 0 ? x : 0; };

  /** Diametro e lunghezza dell'utensile T: tabella utensili, poi il raggio scritto, poi il commento del T. null se non si sa. */
  function datiUtensile(r, v, t) {
    v = v || {};
    const tab = A.tabellaUt ? A.tabellaUt() : [];
    const u = tab.find(x => Number(x.t) === Number(t) && Number(x.d) > 0);
    if (u) return { d: Number(u.d), l: num(u.l) };
    if (num(v.raggioDef) > 0) return { d: 2 * num(v.raggioDef), l: 0 };
    const ut = (r.utensili || []).find(x => x.t === t);
    const d = O.diametroDaCommento(ut && ut.commento);
    return d > 0 ? { d, l: 0 } : null;
  }
  A.datiUtensile = datiUtensile;

  /** Il modello del materiale per un programma letto (con la memoria: si rifa solo se cambia qualcosa). Aggiunge a r.segnalazioni gli urti trovati. */
  function modelloMateriale(r, testo, v) {
    v = v || {};
    const tab = A.tabellaUt ? A.tabellaUt() : [];
    const chiave = [testo, v.glx, v.gly, v.glz, v.gtd, v.gtl, v.gts, v.raggioDef, JSON.stringify(tab)].join('|');
    const memo = A.param.matMemo;
    let mat;
    if (memo && memo.chiave === chiave) mat = memo.mat;
    else {
      const tor = r.modo === 'tornio';
      const utensile = t => A.datiUtensile(r, v, t);
      let S = r.segmenti;
      if (!tor && S.some(q => q.comp)) {
        if (!r.segmentiCentro) r.segmentiCentro = O.centroFresa(S, A.raggioDi ? A.raggioDi(v.raggioDef) : 0);
        S = r.segmentiCentro;
      }
      mat = O.creaMateriale({ modo: tor ? 'tornio' : 'fresa', S, utensile, foro: t => { const u = utensile(t); return u ? u.d : 8; },
        grezzo: tor ? { d: num(v.gtd), l: num(v.gtl), s: v.gts === '' || v.gts === undefined || v.gts === null ? undefined : O.num(v.gts) } : { lx: num(v.glx), ly: num(v.gly), lz: num(v.glz) } });
      if (mat.utensili) Object.keys(mat.utensili).forEach(t => { if (mat.utensili[t].ipotizzato) mat.note.push('T' + t + ': il diametro non si sa, uso ' + A.fmt(mat.utensili[t].d, 0) + ' mm. Scrivilo nella tabella utensili o nel commento (es. FRESA D10).'); });
      A.param.matMemo = { chiave, mat };
    }
    if (mat.collisioni) {
      const S2 = r.segnalazioni = r.segnalazioni || [];
      mat.collisioni.forEach(c => { if (!S2.some(x => x.riga === c.riga && (x.testo === c.testo || (/rapido/.test(x.testo) && /rapido/.test(c.testo) && x.livello === 'errore')))) S2.push(c); });
      S2.sort((a, b) => (a.livello === b.livello ? 0 : a.livello === 'errore' ? -1 : 1) || a.riga - b.riga);
    }
    return mat;
  }
  A.modelloMateriale = modelloMateriale;

  // ----- disegno del materiale -----
  const lega = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const ACCIAIO = [176, 190, 212], BLU = [62, 108, 200], FONDO = [26, 44, 84];
  const rgb = c => 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
  const colorePer = (h, lz) => {
    const d = Math.max(0, Math.min(1, -h / (lz || 1)));
    return d < 0.5 ? lega(ACCIAIO, BLU, d * 2) : lega(BLU, FONDO, (d - 0.5) * 2);
  };
  A.coloreProfondita = colorePer;
  const tela = (mat, w, h) => { if (!mat._cv) { mat._cv = document.createElement('canvas'); } if (mat._cv.width !== w || mat._cv.height !== h) { mat._cv.width = w; mat._cv.height = h; } return mat._cv; };

  /** Il materiale rimasto, nella vista scelta. c: {mat, vista, P2, cur}. */
  function disegnaMateriale(g, c) {
    const mat = c.mat, P2 = c.P2;
    if (!mat || mat.vuoto || mat.tipo === 'troppo') return;
    if (mat.tipo === 'tornio') {
      const cv = tela(mat, mat.nz, mat.nr), cx = cv.getContext('2d'), im = cx.createImageData(mat.nz, mat.nr), d = im.data;
      for (let a = 0; a < mat.nz; a++) for (let b = 0; b < mat.nr; b++) {
        if (!mat.occ[a * mat.nr + b]) continue;
        const p = ((mat.nr - 1 - b) * mat.nz + a) * 4, f = 0.78 + 0.22 * (b / mat.nr);   // piu scuro vicino all'asse
        d[p] = ACCIAIO[0] * f; d[p + 1] = ACCIAIO[1] * f; d[p + 2] = ACCIAIO[2] * f; d[p + 3] = 235;
      }
      cx.putImageData(im, 0, 0);
      const sx = P2(0, 0, mat.zBot), dx = P2(0, 0, mat.zTop), top = P2(mat.R * 2, 0, 0), bas = P2(0, 0, 0);
      g.imageSmoothingEnabled = false;
      g.drawImage(cv, Math.min(sx[0], dx[0]), top[1], Math.abs(dx[0] - sx[0]), bas[1] - top[1]);
      return;
    }
    const { nx, ny, h, x0, y0, x1, y1, lz, cella } = mat;
    if (c.vista === 'xy') {
      const cv = tela(mat, nx, ny), cx = cv.getContext('2d'), im = cx.createImageData(nx, ny), d = im.data;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const k = j * nx + i, v = h[k];
        let col = colorePer(v, lz);
        const dx = (i + 1 < nx ? h[k + 1] : v) - (i > 0 ? h[k - 1] : v), dy = (j + 1 < ny ? h[k + nx] : v) - (j > 0 ? h[k - nx] : v);
        const luce = 1 + Math.max(-0.25, Math.min(0.25, (dx - dy) * 0.08));
        const p = ((ny - 1 - j) * nx + i) * 4;
        d[p] = Math.min(255, col[0] * luce); d[p + 1] = Math.min(255, col[1] * luce); d[p + 2] = Math.min(255, col[2] * luce); d[p + 3] = 255;
      }
      cx.putImageData(im, 0, 0);
      const a = P2(x0, y1, 0), b = P2(x1, y0, 0);
      g.imageSmoothingEnabled = false;
      g.drawImage(cv, a[0], a[1], b[0] - a[0], b[1] - a[1]);
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    } else if (c.vista === 'xz') {
      const y = c.cur ? (c.cur.y !== undefined ? c.cur.y : y0) : y0;
      const j = Math.max(0, Math.min(ny - 1, Math.floor((y - y0) / cella)));
      g.beginPath();
      let p = P2(x0, 0, -lz); g.moveTo(p[0], p[1]);
      for (let i = 0; i < nx; i++) { const q0 = P2(x0 + i * cella, 0, h[j * nx + i]), q1 = P2(x0 + (i + 1) * cella, 0, h[j * nx + i]); g.lineTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); }
      p = P2(x1, 0, -lz); g.lineTo(p[0], p[1]); g.closePath();
      g.fillStyle = rgb(ACCIAIO); g.globalAlpha = 0.9; g.fill(); g.globalAlpha = 1;
      g.strokeStyle = rgb(BLU); g.lineWidth = 1.5; g.stroke();
    } else {
      // 3D: a blocchi, dal fondo verso chi guarda (si disegnano prima i piu lontani)
      const s = Math.max(1, Math.ceil(Math.max(nx, ny) / 56)), cw = Math.ceil(nx / s), ch = Math.ceil(ny / s);
      const alt = new Float32Array(cw * ch);
      for (let J = 0; J < ch; J++) for (let I = 0; I < cw; I++) {
        let mn = 0; for (let j = J * s; j < Math.min(ny, J * s + s); j++) for (let i = I * s; i < Math.min(nx, I * s + s); i++) if (h[j * nx + i] < mn) mn = h[j * nx + i];
        alt[J * cw + I] = mn;
      }
      const quad = (pts, col) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let q = 1; q < pts.length; q++) g.lineTo(pts[q][0], pts[q][1]); g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = col; g.lineWidth = 0.7; g.stroke(); };
      for (let dgl = cw + ch - 2; dgl >= 0; dgl--) {
        for (let J = Math.max(0, dgl - cw + 1); J <= Math.min(ch - 1, dgl); J++) {
          const I = dgl - J, v = alt[J * cw + I];
          const xa = x0 + I * s * cella, xb = Math.min(x1, xa + s * cella), ya = y0 + J * s * cella, yb = Math.min(y1, ya + s * cella);
          const vx = I > 0 ? alt[J * cw + I - 1] : -lz, vy = J > 0 ? alt[(J - 1) * cw + I] : -lz;
          if (v > vx + 1e-6) quad([P2(xa, ya, v), P2(xa, yb, v), P2(xa, yb, vx), P2(xa, ya, vx)], rgb(lega(colorePer(v, lz), [0, 0, 0], 0.38)));
          if (v > vy + 1e-6) quad([P2(xa, ya, v), P2(xb, ya, v), P2(xb, ya, vy), P2(xa, ya, vy)], rgb(lega(colorePer(v, lz), [0, 0, 0], 0.22)));
          quad([P2(xa, ya, v), P2(xb, ya, v), P2(xb, yb, v), P2(xa, yb, v)], rgb(colorePer(v, lz)));
        }
      }
    }
  }
  A.disegnaMateriale = disegnaMateriale;

  // ----- l'utensile con le sue misure -----
  /** c: {modo, vista, P2, sc, px:[x,y,z], raggio (mm), lung (mm) }. */
  function disegnaUtensile(g, c) {
    const P2 = c.P2, px = c.px, amb = c.colore('--avviso');
    g.save();
    g.fillStyle = amb; g.strokeStyle = amb;
    if (c.modo === 'tornio') {
      const tip = (dz, dr) => P2(2 * (px[0] / 2 + dr), 0, px[2] + dz);
      const poli = [tip(0, 0), tip(14, 0), tip(14, 7), tip(0, 7)];
      g.globalAlpha = 0.45; g.beginPath(); g.moveTo(poli[0][0], poli[0][1]); poli.slice(1).forEach(q => g.lineTo(q[0], q[1])); g.closePath(); g.fill();
      g.globalAlpha = 1; g.lineWidth = 2; g.stroke();
      const p = P2(...px); g.beginPath(); g.arc(p[0], p[1], 4, 0, Math.PI * 2); g.fill();
      g.restore(); return;
    }
    const R = c.raggio > 0 ? c.raggio : 0, L = c.lung > 0 ? Math.min(c.lung, 60) : Math.max(25, 4 * R), p = P2(...px);
    if (c.vista === 'xy') {
      g.globalAlpha = 0.3; g.beginPath(); g.arc(p[0], p[1], Math.max(3, R * c.sc), 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.moveTo(p[0] - 6, p[1]); g.lineTo(p[0] + 6, p[1]); g.moveTo(p[0], p[1] - 6); g.lineTo(p[0], p[1] + 6); g.stroke();
    } else if (c.vista === 'xz') {
      const a = P2(px[0] - R, px[1], px[2]), b = P2(px[0] + R, px[1], px[2] + L);
      g.globalAlpha = 0.45; g.fillRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(4, Math.abs(b[0] - a[0])), Math.abs(b[1] - a[1]));
      g.globalAlpha = 1; g.lineWidth = 2; g.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(4, Math.abs(b[0] - a[0])), Math.abs(b[1] - a[1]));
    } else {
      const ell = z => { const o = []; for (let q = 0; q < 28; q++) { const t = q / 28 * Math.PI * 2; o.push(P2(px[0] + R * Math.cos(t), px[1] + R * Math.sin(t), z)); } return o; };
      const giu = ell(px[2]), su = ell(px[2] + L);
      let mn = Infinity, Mx = -Infinity; giu.forEach(q => { mn = Math.min(mn, q[0]); Mx = Math.max(Mx, q[0]); });
      const Lpx = su[0][1] - giu[0][1];
      g.globalAlpha = 0.45; g.fillRect(mn, p[1] + Lpx, Math.max(3, Mx - mn), -Lpx);
      g.beginPath(); giu.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); g.globalAlpha = 0.75; g.fill();
      g.globalAlpha = 1; g.lineWidth = 2; g.beginPath(); g.moveTo(mn, p[1]); g.lineTo(mn, p[1] + Lpx); g.moveTo(Mx, p[1]); g.lineTo(Mx, p[1] + Lpx); g.stroke();
      g.beginPath(); su.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); g.stroke();
    }
    g.restore();
  }
  A.disegnaUtensile = disegnaUtensile;
})();
