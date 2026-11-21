// ===== Hich-Officina: disegno del profilo da tornio col dito, vista 3D del pezzo tornito =====
// Il profilo si disegna a punti (un tocco = un punto) o a mano libera (il tratto si semplifica in rette). I punti si
// agganciano alla griglia e alle rette orizzontali e verticali; si spostano trascinandoli; quote, raccordi e smussi si
// scrivono nel riquadro del punto scelto. Poi diventa il "Profilo libero esterno" di Nuovo programma ISO.
(function () {
  'use strict';
  const A = window.App, O = A.O, el = A.el, fmt = A.fmt;
  const ESEMPIO = [{ x: 0, z: 0 }, { x: 16, z: 0 }, { x: 20, z: -2 }, { x: 20, z: -20 }, { x: 30, z: -25, tratto: 'ccw', r: 5 }, { x: 30, z: -40 }, { x: 40, z: -40 }];
  const col = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
  const num = v => O.num(v);
  const testo = p => { const o = {}; for (const k in p) o[k] = typeof p[k] === 'number' ? String(Math.round(p[k] * 1000) / 1000) : p[k]; return o; };

  /** Polilinea (z, raggio) del profilo; null se il profilo ha un errore. */
  function poliDi(punti) {
    const pts = punti.map(p => ({ x: num(p.x), z: num(p.z), tratto: p.tratto, r: num(p.r) || 0, raccordo: num(p.raccordo) || 0, smusso: num(p.smusso) || 0 })).filter(p => isFinite(p.x) && isFinite(p.z));
    if (pts.length < 2) return { poli: pts.map(p => ({ a: p.z, b: p.x / 2 })), errore: null };
    const g = O.trattiTornio(pts);
    if (g.errore) return { poli: pts.map(p => ({ a: p.z, b: p.x / 2 })), errore: g.errore };
    return { poli: O.polilineaProfilo(g.tratti, 0.25), errore: null, avvisi: g.avvisi };
  }

  // ----- vista 3D: superficie di rivoluzione con ombre, si gira trascinando -----
  function disegna3D(cv, poli, stato) {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 340, H = cv.clientHeight || 300;
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (!poli || poli.length < 2) return;
    const N = 48, ya = stato.yaw, pa = stato.pitch;
    const cy = Math.cos(ya), sy = Math.sin(ya), cp = Math.cos(pa), sp = Math.sin(pa);
    const zc = (Math.min(...poli.map(p => p.a)) + Math.max(...poli.map(p => p.a))) / 2;
    const proj = (z, r, t) => {
      const X = z - zc, Y = r * Math.cos(t), Z = r * Math.sin(t);
      const x1 = X * cy + Z * sy, z1 = -X * sy + Z * cy;
      const y2 = Y * cp - z1 * sp, z2 = Y * sp + z1 * cp;
      return [x1, -y2, z2];
    };
    const quads = [];
    const anelli = poli.map(p => Array.from({ length: N }, (_, j) => proj(p.a, Math.max(p.b, 0), j / N * Math.PI * 2)));
    for (let i = 1; i < poli.length; i++) {
      if (poli[i].b < 1e-6 && poli[i - 1].b < 1e-6) continue;
      for (let j = 0; j < N; j++) {
        const q = [anelli[i - 1][j], anelli[i - 1][(j + 1) % N], anelli[i][(j + 1) % N], anelli[i][j]];
        quads.push(q);
      }
    }
    // facce piane alle due estremita
    [0, poli.length - 1].forEach(i => { if (poli[i].b > 1e-6) quads.push(anelli[i].slice()); });
    // scala per stare nella tela
    let mx = Infinity, Mx = -Infinity, my = Infinity, My = -Infinity;
    anelli.forEach(a => a.forEach(p => { mx = Math.min(mx, p[0]); Mx = Math.max(Mx, p[0]); my = Math.min(my, p[1]); My = Math.max(My, p[1]); }));
    const sc = Math.min((W - 30) / ((Mx - mx) || 1), (H - 30) / ((My - my) || 1)) * stato.zoom;
    const ox = W / 2 - (mx + Mx) / 2 * sc, oy = H / 2 - (my + My) / 2 * sc;
    const luce = (() => { const l = [-0.45, -0.6, 0.66]; const n = Math.hypot(...l); return l.map(v => v / n); })();
    quads.map(q => {
      const a = q[0], b = q[1], c = q[2];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const ln = Math.hypot(...n) || 1; n = n.map(x => x / ln);
      if (n[2] < 0) n = n.map(x => -x);
      const prof = q.reduce((s, p) => s + p[2], 0) / q.length;
      const d = Math.max(0, n[0] * luce[0] + n[1] * luce[1] + n[2] * luce[2]);
      const spec = Math.pow(d, 18) * 0.5;
      return { q, prof, k: 0.28 + 0.62 * d + spec };
    }).sort((p, q) => p.prof - q.prof).forEach(f => {
      const r = Math.min(255, Math.round(150 * f.k + 40)), gg = Math.min(255, Math.round(158 * f.k + 42)), bb = Math.min(255, Math.round(172 * f.k + 46));
      g.fillStyle = g.strokeStyle = 'rgb(' + r + ',' + gg + ',' + bb + ')';
      g.lineWidth = 0.6;
      g.beginPath(); f.q.forEach((p, i) => { const X = ox + p[0] * sc, Y = oy + p[1] * sc; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.fill(); g.stroke();
    });
  }
  A.disegna3DTornio = disegna3D;

  // ----- schermata -----
  A.schermi.disegno = {
    titolo: 'Disegna il profilo',
    render(m) {
      const S = A.sezione('disegno');
      if (!Array.isArray(S.punti)) S.punti = ESEMPIO.map(testo);
      if (S.dg === undefined) S.dg = '40';
      if (S.lg === undefined) S.lg = '50';
      if (S.passo === undefined) S.passo = '1';
      S.modo = S.modo || 'punti'; S.vista = S.vista || '2D';
      const storia = [];
      const ricorda = () => { storia.push(JSON.stringify(S.punti)); if (storia.length > 50) storia.shift(); };
      const v3 = { yaw: -0.55, pitch: 0.42, zoom: 1 };
      let sel = null;

      const schede = el('div', { class: 'schede' });
      [['2D', 'Disegno'], ['3D', 'Pezzo 3D']].forEach(([id, t]) => schede.appendChild(el('button', { 'data-id': id, testo: t, onclick: () => { S.vista = id; A.salva(); tutto(); } })));
      const cv = el('canvas', { class: 'vista disegno-tela', 'aria-label': 'Disegno del profilo: tocca per mettere i punti' });
      const chips = el('div', { class: 'chips' });
      const [cPunti, cMano] = [['punti', 'Un tocco = un punto'], ['mano', 'A mano libera']].map(([id, t]) => { const b = el('button', { class: 'chip', 'data-id': id, testo: t, onclick: () => { S.modo = id; A.salva(); tutto(); } }); chips.appendChild(b); return b; });
      const bAnnulla = el('button', { class: 'chip', testo: 'Annulla', onclick: () => { if (!storia.length) return; S.punti = JSON.parse(storia.pop()); sel = null; A.salva(); tutto(); } });
      const bCancella = el('button', { class: 'chip', testo: 'Cancella tutto', onclick: () => { ricorda(); S.punti = []; sel = null; A.salva(); tutto(); } });
      chips.append(bAnnulla, bCancella);
      const editor = el('div'), msg = el('div'), panGrezzo = el('div', { class: 'pannello' });
      const crea = el('button', { class: 'pul', html: A.icona('codice') + 'Crea il programma' });
      m.append(schede, cv, chips, msg, editor, el('div', { class: 'sez', testo: 'Grezzo e griglia' }), panGrezzo, el('div', { class: 'pulsanti' }, [crea]));
      A.modulo(panGrezzo, [{ id: 'dg', et: 'Diametro del grezzo', u: 'mm' }, { id: 'lg', et: 'Lunghezza da disegnare', u: 'mm' },
        { id: 'passo', et: 'Passo della griglia', tipo: 'scelta', scelte: [['0.5', '0,5 mm'], ['1', '1 mm'], ['2', '2 mm'], ['5', '5 mm']] }], S, () => tutto());

      // ----- coordinate: Z in orizzontale (0 a destra), raggio in verticale; mezzo pezzo sopra l'asse, specchio sotto -----
      let vis = null;
      const prepara = () => {
        const W = cv.clientWidth || 340, H = cv.clientHeight || 300;
        const dg = num(S.dg) || 40, lg = num(S.lg) || 50;
        const rMax = Math.max(dg / 2, ...S.punti.map(p => (num(p.x) || 0) / 2)) + 4;
        const zMin = Math.min(-lg, ...S.punti.map(p => num(p.z) || 0)) - 4, zMax = 4;
        const sc = Math.min((W - 24) / (zMax - zMin), (H - 24) / (2 * rMax));
        vis = { W, H, sc, X: z => W - 12 - (zMax - z) * sc, Y: r => H / 2 - r * sc, zDa: px => zMax - (W - 12 - px) / sc, rDa: py => (H / 2 - py) / sc, dg, lg };
      };
      const aggancia = (z, r, prima) => {
        const p = num(S.passo) || 1;
        z = Math.round(z / p) * p; r = Math.round(Math.max(0, r) * 2 / p) * p / 2;   // il diametro sulla griglia
        if (z > 0) z = 0;
        if (prima) {
          const dz = z - prima.z, dr = r - prima.r, t = Math.tan(6 * Math.PI / 180);
          if (Math.abs(dr) < t * Math.abs(dz)) r = prima.r;
          else if (Math.abs(dz) < t * Math.abs(dr)) z = prima.z;
        }
        return { z: Math.round(z * 1000) / 1000, r: Math.round(r * 1000) / 1000 };
      };
      const disegna2D = () => {
        prepara();
        const dpr = window.devicePixelRatio || 1, { W, H, X, Y, sc } = vis;
        cv.width = W * dpr; cv.height = H * dpr;
        const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        // griglia ogni 5 mm, piu marcata ogni 10
        g.lineWidth = 1;
        for (let z = 0; X(z) > 0; z -= 5) { g.strokeStyle = col('--bordo'); g.globalAlpha = z % 10 === 0 ? 0.9 : 0.4; g.beginPath(); g.moveTo(X(z), 0); g.lineTo(X(z), H); g.stroke(); }
        for (let r = 0; Y(r) > 0; r += 2.5) { g.globalAlpha = (r * 2) % 10 === 0 ? 0.9 : 0.4; g.beginPath(); g.moveTo(0, Y(r)); g.lineTo(W, Y(r)); g.moveTo(0, Y(-r)); g.lineTo(W, Y(-r)); g.stroke(); }
        g.globalAlpha = 1;
        // grezzo
        g.fillStyle = col('--tenue'); g.globalAlpha = 0.16;
        g.fillRect(X(-vis.lg), Y(vis.dg / 2), X(0) - X(-vis.lg), vis.dg * sc);
        g.globalAlpha = 1;
        // asse
        g.strokeStyle = col('--tenue'); g.setLineDash([10, 4, 2, 4]); g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(W, Y(0)); g.stroke(); g.setLineDash([]);
        // quote dell'asse Z
        g.fillStyle = col('--tenue'); g.font = '10px system-ui'; g.textAlign = 'center';
        for (let z = 0; X(z) > 14; z -= 10) g.fillText(String(z), X(z), H - 4);
        // profilo con raccordi, e il suo specchio
        const { poli, errore } = poliDi(S.punti);
        const linea = (k, w, c, a) => { g.strokeStyle = c; g.lineWidth = w; g.globalAlpha = a; g.beginPath(); poli.forEach((p, i) => { const x = X(p.a), y = Y(k * p.b); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.globalAlpha = 1; };
        if (poli.length > 1) {
          // pezzo pieno, colorato tra profilo e asse
          g.fillStyle = col('--accento'); g.globalAlpha = 0.14;
          g.beginPath(); g.moveTo(X(poli[0].a), Y(0)); poli.forEach(p => g.lineTo(X(p.a), Y(p.b))); g.lineTo(X(poli[poli.length - 1].a), Y(0)); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(X(poli[0].a), Y(0)); poli.forEach(p => g.lineTo(X(p.a), Y(-p.b))); g.lineTo(X(poli[poli.length - 1].a), Y(0)); g.closePath(); g.fill();
          g.globalAlpha = 1;
          linea(1, 2.6, errore ? col('--errore') : col('--accento2'), 1);
          linea(-1, 1.2, col('--accento2'), 0.45);
        }
        // punti
        S.punti.forEach((p, i) => {
          const x = X(num(p.z)), y = Y(num(p.x) / 2);
          g.fillStyle = i === sel ? col('--avviso') : col('--testo');
          g.beginPath(); g.arc(x, y, i === sel ? 7 : 4.5, 0, Math.PI * 2); g.fill();
          g.fillStyle = col('--tenue'); g.font = '10px system-ui'; g.textAlign = 'left'; g.fillText('P' + (i + 1), x + 6, y - 6);
        });
        if (tratto.length > 1) { g.strokeStyle = col('--avviso'); g.lineWidth = 2; g.beginPath(); tratto.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
      };

      // ----- tocchi -----
      let tratto = [], premuto = null;
      const posizione = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
      const vicino = (px, py) => { let k = -1, best = 22; S.punti.forEach((p, i) => { const d = Math.hypot(vis.X(num(p.z)) - px, vis.Y(num(p.x) / 2) - py); if (d < best) { best = d; k = i; } }); return k; };
      cv.addEventListener('pointerdown', e => {
        if (S.vista === '3D') { premuto = { x: e.clientX, y: e.clientY, yaw: v3.yaw, pitch: v3.pitch }; cv.setPointerCapture(e.pointerId); return; }
        prepara();
        const [px, py] = posizione(e);
        cv.setPointerCapture(e.pointerId);
        const k = vicino(px, py);
        if (S.modo === 'mano' && k < 0) { tratto = [[px, py]]; premuto = { mano: true }; return; }
        premuto = { k, px, py, mosso: false };
        if (k >= 0) { sel = k; ricorda(); }
      });
      cv.addEventListener('pointermove', e => {
        if (!premuto) return;
        if (S.vista === '3D') { v3.yaw = premuto.yaw + (e.clientX - premuto.x) * 0.01; v3.pitch = Math.max(-1.2, Math.min(1.2, premuto.pitch + (e.clientY - premuto.y) * 0.01)); tutto(true); return; }
        const [px, py] = posizione(e);
        if (premuto.mano) { tratto.push([px, py]); disegna2D(); return; }
        if (Math.hypot(px - premuto.px, py - premuto.py) > 6) premuto.mosso = true;
        if (premuto.k >= 0 && premuto.mosso) {
          const a = aggancia(vis.zDa(px), Math.abs(vis.rDa(py)), premuto.k > 0 ? { z: num(S.punti[premuto.k - 1].z), r: num(S.punti[premuto.k - 1].x) / 2 } : null);
          S.punti[premuto.k].z = String(a.z); S.punti[premuto.k].x = String(a.r * 2);
          disegna2D();
        }
      });
      cv.addEventListener('pointerup', e => {
        const p = premuto; premuto = null;
        if (!p || S.vista === '3D') return;
        const [px, py] = posizione(e);
        if (p.mano) {
          // tratto a mano: si semplifica in poche rette agganciate alla griglia
          const pts = tratto.map(([x, y]) => ({ z: vis.zDa(x), r: Math.abs(vis.rDa(y)) }));
          tratto = [];
          if (pts.length < 2) { disegna2D(); return; }
          const semp = A.semplifica(pts, Math.max(0.6, (num(S.passo) || 1)));
          ricorda();
          // dalla testa verso il mandrino
          if (semp[0].z < semp[semp.length - 1].z) semp.reverse();
          const out = [];
          semp.forEach(q => { const a = aggancia(q.z, q.r, out.length ? out[out.length - 1] : null); const u = out[out.length - 1]; if (!u || Math.hypot(u.z - a.z, u.r - a.r) > 1e-6) out.push(a); });
          S.punti = out.map(q => ({ x: String(q.r * 2), z: String(q.z) }));
          sel = null; A.salva(); tutto(); return;
        }
        if (p.k >= 0) { if (!p.mosso) storia.pop(); A.salva(); tutto(); return; }
        // un tocco: punto nuovo alla fine
        const ult = S.punti[S.punti.length - 1];
        const a = aggancia(vis.zDa(px), Math.abs(vis.rDa(py)), ult ? { z: num(ult.z), r: num(ult.x) / 2 } : null);
        ricorda();
        S.punti.push({ x: String(a.r * 2), z: String(a.z) });
        sel = S.punti.length - 1;
        A.salva(); tutto();
      });

      // ----- riquadro del punto scelto -----
      const mostraEditor = () => {
        editor.innerHTML = '';
        if (sel === null || !S.punti[sel]) { editor.appendChild(A.info(S.modo === 'mano' ? 'Disegna il profilo con il dito dalla testa (a destra) verso il mandrino: il tratto diventa rette sulla griglia. Tocca un punto per correggerlo.' : 'Tocca per mettere i punti, dalla testa (a destra) verso il mandrino. Trascina un punto per spostarlo, toccalo per scrivere le quote, il raccordo o lo smusso.')); return; }
        const p = S.punti[sel];
        const pan = el('div', { class: 'pannello' });
        editor.append(el('div', { class: 'sez', testo: 'Punto P' + (sel + 1) }), pan);
        A.modulo(pan, [{ id: 'x', et: 'X (diametro)', u: 'mm' }, { id: 'z', et: 'Z', u: 'mm' },
          { id: 'tratto', et: 'Ci si arriva con', tipo: 'scelta', scelte: [['retta', 'una retta'], ['cw', 'un arco G2'], ['ccw', 'un arco G3']] },
          { id: 'r', et: 'Raggio dell\'arco', u: 'mm', se: q => q.tratto === 'cw' || q.tratto === 'ccw' },
          { id: 'raccordo', et: 'Raccordo nello spigolo', u: 'R' }, { id: 'smusso', et: 'Smusso nello spigolo', u: 'C' }], p, id => { if (id === 'tratto') { A.salva(); tutto(); } else { A.salva(); disegna(); } });
        editor.appendChild(el('div', { class: 'pulsanti' }, [
          el('button', { class: 'pul sec', html: A.icona('piu') + 'Punto dopo', onclick: () => { ricorda(); const q = S.punti[sel + 1]; const nuovo = q ? { x: String((num(p.x) + num(q.x)) / 2), z: String((num(p.z) + num(q.z)) / 2) } : { x: p.x, z: String(num(p.z) - 10) }; S.punti.splice(sel + 1, 0, nuovo); sel++; A.salva(); tutto(); } }),
          el('button', { class: 'pul peric', html: A.icona('cestino') + 'Togli', onclick: () => { ricorda(); S.punti.splice(sel, 1); sel = null; A.salva(); tutto(); } })]));
      };
      const disegna = () => {
        const { poli, errore, avvisi } = poliDi(S.punti);
        msg.innerHTML = '';
        if (errore) msg.appendChild(el('p', { class: 'errore', testo: errore }));
        else if (poli.length > 1) {
          const dMax = Math.max(...poli.map(q => q.b)) * 2, zMin = Math.min(...poli.map(q => q.a));
          msg.appendChild(el('div', { class: 'riassunto' }, [el('span', { testo: S.punti.length + ' punti' }), el('span', { testo: 'D max ' + fmt(dMax, 2) }), el('span', { testo: 'lungo ' + fmt(-zMin, 2) })].concat(dMax > (num(S.dg) || 0) + 1e-6 ? [el('span', { class: 'errore', style: 'margin:0', testo: 'piu grosso del grezzo' })] : [])));
          if (avvisi && avvisi.length) msg.appendChild(A.info(A.esc(avvisi.join(' ')), 'avviso'));
        }
        if (S.vista === '3D') disegna3D(cv, poli, v3); else disegna2D();
      };
      const tutto = soloDisegno => {
        if (!soloDisegno) {
          schede.querySelectorAll('button').forEach(b => b.classList.toggle('attiva', b.dataset.id === S.vista));
          [cPunti, cMano].forEach(b => b.classList.toggle('attiva', b.dataset.id === S.modo));
          chips.hidden = S.vista === '3D';
          cv.setAttribute('aria-label', S.vista === '3D' ? 'Pezzo tornito in 3D: trascina per girarlo' : 'Disegno del profilo: tocca per mettere i punti');
          mostraEditor();
        }
        disegna();
      };
      crea.addEventListener('click', () => {
        const { errore, poli } = poliDi(S.punti);
        if (errore) { A.avviso(errore); return; }
        if (poli.length < 2) { A.avviso('Servono almeno due punti'); return; }
        const P = A.sezione('programma');
        P.tab = 'tornio';
        P.tornio = Object.assign(P.tornio || {}, { op: 'profilo', punti: JSON.parse(JSON.stringify(S.punti)), dg: S.dg });
        A.salva(); A.vai('programma');
      });
      tutto();
      A.disegnoRidisegna = () => tutto(true);
    }
  };
  window.addEventListener('resize', () => { if (A.attuale && A.attuale() === 'disegno' && A.disegnoRidisegna) A.disegnoRidisegna(); });

  /** Semplifica un tratto a mano (Ramer-Douglas-Peucker) in coordinate (z, r). */
  A.semplifica = function (pts, tol) {
    if (pts.length < 3) return pts.slice();
    const dist = (p, a, b) => { const dz = b.z - a.z, dr = b.r - a.r, l = Math.hypot(dz, dr); if (l < 1e-9) return Math.hypot(p.z - a.z, p.r - a.r); return Math.abs(dz * (a.r - p.r) - (a.z - p.z) * dr) / l; };
    const rdp = (s, e) => {
      let k = -1, dm = 0;
      for (let i = s + 1; i < e; i++) { const d = dist(pts[i], pts[s], pts[e]); if (d > dm) { dm = d; k = i; } }
      if (dm > tol) return rdp(s, k).slice(0, -1).concat(rdp(k, e));
      return [pts[s], pts[e]];
    };
    return rdp(0, pts.length - 1);
  };
})();
