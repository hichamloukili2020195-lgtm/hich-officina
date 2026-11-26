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
      const futuro = [];
      const ricorda = () => { storia.push(JSON.stringify(S.punti)); if (storia.length > 80) storia.shift(); futuro.length = 0; };
      const v3 = { yaw: -0.55, pitch: 0.42, zoom: 1 };
      let sel = null, selL = null;   // punto scelto oppure linea scelta (la linea i va dal punto i-1 al punto i)

      const schede = el('div', { class: 'schede' });
      [['2D', 'Disegno'], ['3D', 'Pezzo 3D']].forEach(([id, t]) => schede.appendChild(el('button', { 'data-id': id, testo: t, onclick: () => { S.vista = id; A.salva(); tutto(); } })));
      const cv = el('canvas', { class: 'vista disegno-tela', 'aria-label': 'Disegno del profilo: tocca per mettere i punti' });
      const chips = el('div', { class: 'chips' });
      if (S.modo !== 'mano') S.modo = 'punti';
      const [cPunti, cMano] = [['punti', 'Tocca: punti e linee'], ['mano', 'A mano libera']].map(([id, t]) => { const b = el('button', { class: 'chip', 'data-id': id, testo: t, onclick: () => { S.modo = id; A.salva(); tutto(); } }); chips.appendChild(b); return b; });
      const bAnnulla = el('button', { class: 'chip', testo: '↶ Annulla', 'aria-label': 'Annulla', onclick: () => { if (!storia.length) return; futuro.push(JSON.stringify(S.punti)); S.punti = JSON.parse(storia.pop()); sel = selL = null; A.salva(); tutto(); } });
      const bRipeti = el('button', { class: 'chip', testo: '↷ Ripeti', 'aria-label': 'Ripeti', onclick: () => { if (!futuro.length) return; storia.push(JSON.stringify(S.punti)); S.punti = JSON.parse(futuro.pop()); sel = selL = null; A.salva(); tutto(); } });
      const bCancella = el('button', { class: 'chip', testo: 'Cancella tutto', onclick: () => { ricorda(); S.punti = []; sel = selL = null; A.salva(); tutto(); } });
      chips.append(bAnnulla, bRipeti, bCancella);
      const editor = el('div'), msg = el('div'), panGrezzo = el('div', { class: 'pannello' });
      const crea = el('button', { class: 'pul', html: A.icona('codice') + 'Crea il programma' });
      m.append(schede, cv, chips, msg, editor, el('div', { class: 'sez', testo: 'Grezzo e griglia' }), panGrezzo, el('div', { class: 'pulsanti' }, [crea]));
      if (S.mat === undefined) S.mat = '4';
      A.modulo(panGrezzo, [{ id: 'mat', et: 'Materiale', tipo: 'scelta', scelte: () => A.sceltaMateriali() }, { id: 'dg', et: 'Diametro del grezzo', u: 'mm' }, { id: 'lg', et: 'Lunghezza da disegnare', u: 'mm' },
        { id: 'passo', et: 'Passo della griglia', tipo: 'scelta', scelte: [['0.5', '0,5 mm'], ['1', '1 mm'], ['2', '2 mm'], ['5', '5 mm']] }], S, () => tutto());

      // ----- vista: zoom e spostamento (due dita, rotella, pulsanti) -----
      const vista = { zoom: 1, dx: 0, dy: 0 };
      const lettura = el('span', { class: 'lettura', 'aria-live': 'polite' });
      const barraVista = el('div', { class: 'barra-vista' }, [
        el('button', { class: 'icona-pul', 'aria-label': 'Rimpicciolisci', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14"/></svg>', onclick: () => zoomA(1 / 1.5) }),
        el('button', { class: 'icona-pul', 'aria-label': 'Ingrandisci', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5v14"/></svg>', onclick: () => zoomA(1.5) }),
        el('button', { class: 'chip', testo: 'Adatta', onclick: () => { vista.zoom = 1; vista.dx = 0; vista.dy = 0; v3.zoom = 1; disegna(); } }),
        el('button', { class: 'chip', id: 'd-pieno', testo: 'Schermo intero', 'aria-label': 'Schermo intero', onclick: e => { const on = A.schermoPieno(m, () => disegna()); e.currentTarget.textContent = on ? 'Esci' : 'Schermo intero'; } }),
        el('button', { class: 'chip', id: 'd-ruota', testo: 'Ruota', 'aria-label': 'Ruota lo schermo', onclick: e => { const o = A.ruotaSchermo(() => disegna()); e.currentTarget.textContent = o === 'libero' ? 'Ruota' : o === 'orizzontale' ? 'Orizzontale' : 'Verticale'; } }), lettura]);
      cv.after(barraVista);

      // ----- coordinate: Z in orizzontale (0 a destra), raggio in verticale; mezzo pezzo sopra l'asse, specchio sotto -----
      let vis = null;
      const prepara = () => {
        const W = cv.clientWidth || 340, H = cv.clientHeight || 300;
        const dg = num(S.dg) || 40, lg = num(S.lg) || 50;
        const rMax = Math.max(dg / 2, ...S.punti.map(p => (num(p.x) || 0) / 2)) + 4;
        const zMin = Math.min(-lg, ...S.punti.map(p => num(p.z) || 0)) - 4, zMax = 4;
        const sc = Math.min((W - 24) / (zMax - zMin), (H - 24) / (2 * rMax)) * vista.zoom;
        const ox = W - 12 + vista.dx, oy = H / 2 + vista.dy;
        vis = { W, H, sc, X: z => ox - (zMax - z) * sc, Y: r => oy - r * sc, zDa: px => zMax - (ox - px) / sc, rDa: py => (oy - py) / sc, dg, lg };
      };
      const zoomA = (f, cx, cy) => {
        if (S.vista === '3D') { v3.zoom = Math.max(0.3, Math.min(6, v3.zoom * f)); disegna(); return; }
        prepara();
        cx = cx === undefined ? vis.W / 2 : cx; cy = cy === undefined ? vis.H / 2 : cy;
        const z = vis.zDa(cx), r = vis.rDa(cy);
        vista.zoom = Math.max(0.5, Math.min(60, vista.zoom * f));
        prepara();
        vista.dx += cx - vis.X(z); vista.dy += cy - vis.Y(r);
        disegna();
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
      const fq = v => fmt(v, 3);
      let mira = null;   // punto che si sta trascinando o aggiungendo: si mostra con le quote
      const disegna2D = () => {
        prepara();
        const dpr = window.devicePixelRatio || 1, { W, H, X, Y, sc } = vis;
        cv.width = W * dpr; cv.height = H * dpr;
        const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        // griglia: il passo segue lo zoom (righe almeno 8 pixel)
        const passi = [0.5, 1, 2, 5, 10, 20, 50];
        const pg = passi.find(q => q * sc >= 8) || 50;
        g.lineWidth = 1; g.strokeStyle = col('--bordo');
        const zA = Math.floor(vis.zDa(0) / pg) * pg, zB = vis.zDa(W);
        for (let z = zA; z <= zB; z += pg) { g.globalAlpha = Math.abs(z / (pg * 5) - Math.round(z / (pg * 5))) < 1e-6 ? 0.9 : 0.35; g.beginPath(); g.moveTo(X(z), 0); g.lineTo(X(z), H); g.stroke(); }
        const rA = Math.floor(vis.rDa(H) / (pg / 2)) * (pg / 2), rB = vis.rDa(0);
        for (let r = rA; r <= rB; r += pg / 2) { g.globalAlpha = Math.abs(r / (pg * 2.5) - Math.round(r / (pg * 2.5))) < 1e-6 ? 0.9 : 0.35; g.beginPath(); g.moveTo(0, Y(r)); g.lineTo(W, Y(r)); g.stroke(); }
        g.globalAlpha = 1;
        // grezzo
        g.fillStyle = col('--tenue'); g.globalAlpha = 0.16;
        g.fillRect(X(-vis.lg), Y(vis.dg / 2), X(0) - X(-vis.lg), vis.dg * sc);
        g.globalAlpha = 1;
        // asse
        g.strokeStyle = col('--tenue'); g.setLineDash([10, 4, 2, 4]); g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(W, Y(0)); g.stroke(); g.setLineDash([]);
        // quote dell'asse Z
        g.fillStyle = col('--tenue'); g.font = '10px system-ui'; g.textAlign = 'center';
        const pq = passi.find(q => q * sc >= 40) || 50;
        for (let z = Math.ceil(zA / pq) * pq; z <= zB; z += pq) g.fillText(String(Math.round(z * 100) / 100), X(z), H - 4);
        // profilo con raccordi, e il suo specchio
        const { poli, errore } = poliDi(S.punti);
        const linea = (k, w, c, a) => { g.strokeStyle = c; g.lineWidth = w; g.globalAlpha = a; g.beginPath(); poli.forEach((p, i) => { const x = X(p.a), y = Y(k * p.b); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.globalAlpha = 1; };
        if (poli.length > 1) {
          g.fillStyle = col('--accento'); g.globalAlpha = 0.14;
          g.beginPath(); g.moveTo(X(poli[0].a), Y(0)); poli.forEach(p => g.lineTo(X(p.a), Y(p.b))); g.lineTo(X(poli[poli.length - 1].a), Y(0)); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(X(poli[0].a), Y(0)); poli.forEach(p => g.lineTo(X(p.a), Y(-p.b))); g.lineTo(X(poli[poli.length - 1].a), Y(0)); g.closePath(); g.fill();
          g.globalAlpha = 1;
          linea(1, 2.6, errore ? col('--errore') : col('--accento2'), 1);
          linea(-1, 1.2, col('--accento2'), 0.45);
        }
        // la linea scelta
        if (selL !== null && S.punti[selL] && S.punti[selL - 1]) {
          const a = S.punti[selL - 1], b = S.punti[selL];
          const g2 = O.trattiTornio([{ x: num(a.x), z: num(a.z) }, { x: num(b.x), z: num(b.z), tratto: b.tratto, r: num(b.r) }]);
          const pl = g2.errore ? [{ a: num(a.z), b: num(a.x) / 2 }, { a: num(b.z), b: num(b.x) / 2 }] : O.polilineaProfilo(g2.tratti, 0.25);
          g.strokeStyle = col('--avviso'); g.lineWidth = 6; g.globalAlpha = 0.85; g.lineCap = 'round';
          g.beginPath(); pl.forEach((q, k) => (k ? g.lineTo(X(q.a), Y(q.b)) : g.moveTo(X(q.a), Y(q.b)))); g.stroke(); g.globalAlpha = 1; g.lineCap = 'butt';
        }
        // lavorazioni sulle linee: filetto (denti) e gola di scarico
        for (let i = 1; i < S.punti.length; i++) {
          const a = S.punti[i - 1], b = S.punti[i], r = num(b.x) / 2, za = num(a.z), zb = num(b.z);
          if (Math.abs(num(a.x) - num(b.x)) > 1e-9) continue;
          if (num(b.fil) > 0) {
            const pz = Math.max(num(b.fil), 4 / sc), h = Math.min(0.6134 * num(b.fil), r * 0.3);
            g.strokeStyle = col('--ok'); g.lineWidth = 1.3;
            g.beginPath();
            for (let z = za, k = 0; z > zb + (num(b.gola) || 0) - 1e-9; z -= pz / 2, k++) { const y = k % 2 ? Y(r - h) : Y(r); k ? g.lineTo(X(z), y) : g.moveTo(X(z), y); }
            g.stroke();
          }
          if (num(b.gola) > 0) {
            const w = num(b.gola), pf = num(b.fil) > 0 ? 0.6134 * num(b.fil) + 0.1 : 0.5;
            g.fillStyle = col('--avviso'); g.globalAlpha = 0.5;
            g.fillRect(X(zb + w), Y(r), X(zb) - X(zb + w), Math.max(2, pf * sc)); g.globalAlpha = 1;
          }
        }
        // quote: Ø sopra i tratti cilindrici, lunghezza sotto lo specchio
        g.font = '600 11px system-ui'; g.textAlign = 'center';
        for (let i = 1; i < S.punti.length; i++) {
          const a = S.punti[i - 1], b = S.punti[i];
          const xa = num(a.x), xb = num(b.x), za = num(a.z), zb = num(b.z);
          if (Math.abs(xa - xb) < 1e-9 && Math.abs(za - zb) > 1e-9 && xa > 0 && (b.tratto || 'retta') === 'retta') {
            const xm = (X(za) + X(zb)) / 2;
            if (Math.abs(X(za) - X(zb)) < 26) continue;
            g.fillStyle = col('--testo'); g.fillText('Ø' + fmt(xa, 3), xm, Y(xa / 2) - 6);
            g.fillStyle = col('--tenue'); g.fillText(fmt(Math.abs(za - zb), 3), xm, Y(-xa / 2) + 14);
          }
        }
        // punti
        S.punti.forEach((p, i) => {
          const x = X(num(p.z)), y = Y(num(p.x) / 2);
          g.fillStyle = i === sel ? col('--avviso') : col('--testo');
          g.beginPath(); g.arc(x, y, i === sel ? 7 : 4.5, 0, Math.PI * 2); g.fill();
          g.fillStyle = col('--tenue'); g.font = '10px system-ui'; g.textAlign = 'left';
          const extra = (num(p.raccordo) > 0 ? ' R' + fmt(num(p.raccordo)) : '') + (num(p.smusso) > 0 ? ' C' + fmt(num(p.smusso)) : '');
          g.fillText('P' + (i + 1) + extra, x + 6, y - 6);
        });
        // il punto in movimento: croce e quote in un riquadro sopra il dito
        if (mira) {
          const x = X(mira.z), y = Y(mira.r);
          g.strokeStyle = col('--avviso'); g.lineWidth = 1; g.setLineDash([3, 3]);
          g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); g.setLineDash([]);
          const t = 'Ø' + fq(mira.r * 2) + '  Z' + fq(mira.z);
          g.font = '600 13px system-ui'; const w = g.measureText(t).width + 14;
          const bx = Math.min(Math.max(4, x - w / 2), W - w - 4), by = Math.max(4, y - 56);
          g.fillStyle = col('--pannello'); g.strokeStyle = col('--avviso'); g.lineWidth = 1.5;
          g.beginPath(); g.roundRect ? g.roundRect(bx, by, w, 24, 6) : g.rect(bx, by, w, 24); g.fill(); g.stroke();
          g.fillStyle = col('--testo'); g.textAlign = 'left'; g.fillText(t, bx + 7, by + 16);
        }
        if (tratto.length > 1) { g.strokeStyle = col('--avviso'); g.lineWidth = 2; g.beginPath(); tratto.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
      };

      // ----- tocchi: un dito disegna, due dita zoom e spostamento -----
      let tratto = [], premuto = null, pinch = null, dopoPinch = false;
      const attivi = new Map();
      const posizione = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
      const vicino = (px, py) => { let k = -1, best = 22; S.punti.forEach((p, i) => { const d = Math.hypot(vis.X(num(p.z)) - px, vis.Y(num(p.x) / 2) - py); if (d < best) { best = d; k = i; } }); return k; };
      /** Il tratto (tra due punti) vicino al tocco: per inserire un punto in mezzo. */
      const suTratto = (px, py) => {
        let best = 14, k = -1, pr = null;
        for (let i = 1; i < S.punti.length; i++) {
          const ax = vis.X(num(S.punti[i - 1].z)), ay = vis.Y(num(S.punti[i - 1].x) / 2), bx = vis.X(num(S.punti[i].z)), by = vis.Y(num(S.punti[i].x) / 2);
          const L2 = (bx - ax) ** 2 + (by - ay) ** 2; if (L2 < 1) continue;
          const t = Math.max(0.05, Math.min(0.95, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / L2));
          const d = Math.hypot(ax + t * (bx - ax) - px, ay + t * (by - ay) - py);
          if (d < best) { best = d; k = i; pr = t; }
        }
        return k < 0 ? null : { i: k, t: pr };
      };
      const mostraLettura = (z, r) => { lettura.textContent = 'Ø' + fq(r * 2) + '  Z' + fq(z); };
      cv.addEventListener('pointerdown', e => {
        attivi.set(e.pointerId, posizione(e));
        try { cv.setPointerCapture(e.pointerId); } catch (x) { /* niente */ }
        if (attivi.size === 2) {
          // comincia lo zoom: il disegno o il tratto in corso si lasciano
          if (premuto && premuto.k >= 0 && premuto.mosso && storia.length) { S.punti = JSON.parse(storia[storia.length - 1]); }
          premuto = null; tratto = []; mira = null;
          const [a, b] = Array.from(attivi.values());
          prepara();
          const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
          pinch = { d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z0: vista.zoom, v30: v3.zoom, z: vis.zDa(mx), r: vis.rDa(my) };
          dopoPinch = true;
          return;
        }
        if (attivi.size > 2) return;
        dopoPinch = false;
        if (S.vista === '3D') { premuto = { x: e.clientX, y: e.clientY, yaw: v3.yaw, pitch: v3.pitch }; return; }
        prepara();
        const [px, py] = posizione(e);
        const k = vicino(px, py);
        if (S.modo === 'mano' && k < 0) { tratto = [[px, py]]; premuto = { mano: true }; return; }
        premuto = { k, px, py, mosso: false };
        if (k >= 0) { sel = k; selL = null; ricorda(); }
      });
      cv.addEventListener('pointermove', e => {
        if (attivi.has(e.pointerId)) attivi.set(e.pointerId, posizione(e));
        if (pinch && attivi.size === 2) {
          const [a, b] = Array.from(attivi.values());
          const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
          if (S.vista === '3D') { v3.zoom = Math.max(0.3, Math.min(6, pinch.v30 * d / pinch.d0)); disegna(); return; }
          vista.zoom = Math.max(0.5, Math.min(60, pinch.z0 * d / pinch.d0));
          prepara();
          vista.dx += mx - vis.X(pinch.z); vista.dy += my - vis.Y(pinch.r);
          disegna2D();
          return;
        }
        if (S.vista !== '3D' && vis) { const [px, py] = posizione(e); if (!premuto) mostraLettura(...Object.values(aggancia(vis.zDa(px), Math.abs(vis.rDa(py)), null))); }
        if (!premuto) return;
        if (S.vista === '3D') { v3.yaw = premuto.yaw + (e.clientX - premuto.x) * 0.01; v3.pitch = Math.max(-1.2, Math.min(1.2, premuto.pitch + (e.clientY - premuto.y) * 0.01)); tutto(true); return; }
        const [px, py] = posizione(e);
        if (premuto.mano) { tratto.push([px, py]); disegna2D(); return; }
        if (Math.hypot(px - premuto.px, py - premuto.py) > 6) premuto.mosso = true;
        if (premuto.k >= 0 && premuto.mosso) {
          const a = aggancia(vis.zDa(px), Math.abs(vis.rDa(py)), premuto.k > 0 ? { z: num(S.punti[premuto.k - 1].z), r: num(S.punti[premuto.k - 1].x) / 2 } : null);
          S.punti[premuto.k].z = String(a.z); S.punti[premuto.k].x = String(a.r * 2);
          mira = a; mostraLettura(a.z, a.r);
          disegna2D();
        }
      });
      const fine = e => {
        attivi.delete(e.pointerId);
        if (pinch) { if (attivi.size < 2) pinch = null; premuto = null; return; }
        const p = premuto; premuto = null; mira = null;
        if (!p || S.vista === '3D' || dopoPinch) { if (attivi.size === 0) dopoPinch = false; return; }
        const [px, py] = posizione(e);
        if (p.mano) {
          // tratto a mano: si semplifica in poche rette agganciate alla griglia
          const pts = tratto.map(([x, y]) => ({ z: vis.zDa(x), r: Math.abs(vis.rDa(y)) }));
          tratto = [];
          if (pts.length < 2) { disegna2D(); return; }
          const semp = A.semplifica(pts, Math.max(0.6, (num(S.passo) || 1)) / Math.max(1, vista.zoom));
          ricorda();
          if (semp[0].z < semp[semp.length - 1].z) semp.reverse();   // dalla testa verso il mandrino
          const out = [];
          semp.forEach(q => { const a = aggancia(q.z, q.r, out.length ? out[out.length - 1] : null); const u = out[out.length - 1]; if (!u || Math.hypot(u.z - a.z, u.r - a.r) > 1e-6) out.push(a); });
          S.punti = out.map(q => ({ x: String(q.r * 2), z: String(q.z) }));
          sel = null; A.salva(); tutto(); return;
        }
        if (p.k >= 0) { if (!p.mosso) storia.pop(); A.salva(); tutto(); return; }
        // un tocco su una linea: si sceglie (per eliminarla, misurarla, dividerla); nel vuoto: punto nuovo in fondo
        const tr = suTratto(px, py);
        if (tr) { selL = tr.i; sel = null; ricorda(); storia.pop(); A.salva(); tutto(); return; }
        if (selL !== null || (sel !== null && sel !== S.punti.length - 1)) { sel = selL = null; tutto(); return; }
        ricorda();
        {
          const ult = S.punti[S.punti.length - 1];
          const a = aggancia(vis.zDa(px), Math.abs(vis.rDa(py)), ult ? { z: num(ult.z), r: num(ult.x) / 2 } : null);
          S.punti.push({ x: String(a.r * 2), z: String(a.z) });
          sel = S.punti.length - 1; selL = null;
        }
        A.salva(); tutto();
      };
      cv.addEventListener('pointerup', fine);
      cv.addEventListener('pointercancel', e => { attivi.delete(e.pointerId); if (attivi.size < 2) pinch = null; premuto = null; mira = null; tratto = []; disegna(); });
      cv.addEventListener('wheel', e => { e.preventDefault(); const [px, py] = posizione(e); zoomA(e.deltaY < 0 ? 1.25 : 1 / 1.25, px, py); }, { passive: false });

      // ----- aggiungi una linea: cilindro, spallamento, cono, arco o quote esatte -----
      S.qv = S.qv || {};
      S.qv.qtipo = ['cil', 'spalla', 'cono', 'arco', 'esatto'].includes(S.qv.qtipo) ? S.qv.qtipo : 'cil';
      const panQuote = el('div', { class: 'pannello' });
      const tipiLinea = el('div', { class: 'tipi-linea' });
      const ICONE = { cil: '<path d="M3 15h18"/><path d="M3 9h18" opacity=".35"/>', spalla: '<path d="M6 17V7h12"/>', cono: '<path d="M4 17l16-8"/>', arco: '<path d="M4 18c2-9 7-12 16-12"/>', esatto: '<circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>' };
      const NOMI = { cil: 'Cilindro', spalla: 'Spallamento', cono: 'Cono', arco: 'Arco', esatto: 'Punto a quote' };
      Object.keys(NOMI).forEach(k => tipiLinea.appendChild(el('button', { class: 'tipo-linea', 'data-id': k, html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' + ICONE[k] + '</svg><span>' + NOMI[k] + '</span>', onclick: () => { S.qv.qtipo = k; A.salva(); mostraQuote(); } })));
      const campiQuote = el('div');
      const mostraQuote = () => {
        tipiLinea.querySelectorAll('button').forEach(b => b.classList.toggle('attiva', b.dataset.id === S.qv.qtipo));
        const t = S.qv.qtipo;
        const campi = t === 'cil' ? [{ id: 'qa', et: 'Lunghezza', u: 'mm' }]
          : t === 'spalla' ? [{ id: 'qd', et: 'Fino al diametro Ø', u: 'mm' }]
          : t === 'cono' ? [{ id: 'qa', et: 'Lunghezza', u: 'mm' }, { id: 'qd', et: 'Diametro alla fine Ø', sub: 'oppure il semiangolo', u: 'mm' }, { id: 'qang', et: 'Semiangolo', sub: 'se il Ø e vuoto', u: '°' }]
          : t === 'arco' ? [{ id: 'qd', et: 'Diametro alla fine Ø', u: 'mm' }, { id: 'qa', et: 'Lunghezza', u: 'mm' }, { id: 'qr', et: 'Raggio', u: 'mm' }, { id: 'qforma', et: 'Forma', tipo: 'scelta', scelte: [['bombato', 'Bombato (convesso)'], ['incavato', 'Incavato (concavo)']] }]
          : [{ id: 'qd', et: 'Diametro Ø', u: 'mm' }, { id: 'qz', et: 'Z', u: 'mm' }];
        A.modulo(campiQuote, campi, S.qv, () => {});
      };
      const aggiungiQuote = () => {
        const q = S.qv;
        const dopo = selL !== null ? selL : sel !== null && S.punti[sel] ? sel : S.punti.length - 1;
        const base = S.punti[dopo];
        const bx = base ? num(base.x) : 0, bz = base ? num(base.z) : 0;
        let x, z, extra = {};
        const t = q.qtipo;
        const L = num(q.qa), D = num(q.qd);
        if (t === 'cil') { if (!(L > 0)) { A.avviso('Scrivi la lunghezza'); return; } x = bx; z = bz - L; }
        else if (t === 'spalla') { if (!(D >= 0)) { A.avviso('Scrivi il diametro'); return; } x = D; z = bz; }
        else if (t === 'cono') {
          if (!(L > 0)) { A.avviso('Scrivi la lunghezza'); return; }
          z = bz - L;
          if (D >= 0) x = D; else { const an = num(q.qang); if (!isFinite(an) || Math.abs(an) >= 89) { A.avviso('Scrivi il Ø alla fine o il semiangolo'); return; } x = bx + 2 * L * Math.tan(an * Math.PI / 180); }
        } else if (t === 'arco') {
          const R = num(q.qr);
          if (!(D >= 0) || !(L >= 0) || !(R > 0)) { A.avviso('Scrivi Ø alla fine, lunghezza e raggio'); return; }
          x = D; z = bz - L;
          const corda = Math.hypot(L, (D - bx) / 2);
          if (R < corda / 2 - 1e-6) { A.avviso('Raggio troppo piccolo: almeno ' + fmt(corda / 2, 3)); return; }
          extra = { tratto: q.qforma === 'incavato' ? 'cw' : 'ccw', r: String(R) };
        } else { const Z = num(q.qz); if (!(D >= 0) || !isFinite(Z)) { A.avviso('Scrivi Ø e Z'); return; } x = D; z = Z; }
        if (x < 0) { A.avviso('Il diametro verrebbe negativo'); return; }
        ricorda();
        const idx = dopo + 1;
        S.punti.splice(Math.max(0, idx), 0, Object.assign({ x: String(Math.round(x * 1000) / 1000), z: String(Math.round(z * 1000) / 1000) }, extra));
        sel = null; selL = Math.max(1, idx); if (!S.punti[selL - 1]) selL = null;
        A.salva(); tutto();
      };
      panQuote.append(tipiLinea, campiQuote, el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('piu') + 'Aggiungi', onclick: aggiungiQuote })]));
      mostraQuote();
      const tuttiSpigoli = el('div', { class: 'chips' }, [el('span', { class: 'leggenda', style: 'margin:0 4px 0 2px;align-self:center', testo: 'Tutti gli spigoli:' })].concat(
        [['C0.5', 'smusso', '0.5'], ['C1', 'smusso', '1'], ['R1', 'raccordo', '1'], ['vivi', null, null]].map(([t, k, v]) => el('button', { class: 'chip', testo: t, onclick: () => {
          ricorda();
          for (let i = 1; i < S.punti.length - 1; i++) {
            const p = S.punti[i];
            if (num(S.punti[i - 1].x) === 0 && num(p.x) === 0) continue;
            if ((p.tratto || 'retta') !== 'retta' || (S.punti[i + 1].tratto || 'retta') !== 'retta') continue;
            delete p.smusso; delete p.raccordo;
            if (k) p[k] = v;
          }
          A.salva(); tutto();
        } }))));
      const elenco = el('div', { class: 'elenco-linee' });
      panGrezzo.previousSibling.before(el('div', { class: 'sez', testo: 'Aggiungi una linea (dopo quella scelta, o in fondo)' }), panQuote, el('div', { class: 'sez', testo: 'Linee del profilo' }), elenco, tuttiSpigoli);

      // ----- le linee in parole -----
      const tipoLinea = i => {
        const a = S.punti[i - 1], b = S.punti[i];
        const xa = num(a.x), xb = num(b.x), za = num(a.z), zb = num(b.z);
        if ((b.tratto || 'retta') !== 'retta') return 'arco';
        if (Math.abs(xa - xb) < 1e-9 && Math.abs(za - zb) < 1e-9) return 'doppio';
        if (Math.abs(xa - xb) < 1e-9) return 'cil';
        if (Math.abs(za - zb) < 1e-9) return xa === 0 ? 'faccia' : 'spalla';
        return 'cono';
      };
      const descrivi = i => {
        const a = S.punti[i - 1], b = S.punti[i], t = tipoLinea(i);
        const xa = num(a.x), xb = num(b.x), L = Math.abs(num(a.z) - num(b.z));
        if (t === 'cil') return 'Cilindro Ø' + fmt(xa, 3) + ' lungo ' + fmt(L, 3) + (num(b.fil) > 0 ? ' · filetto M' + fmt(xa, 3) + 'x' + fmt(num(b.fil), 3) : '') + (num(b.gola) > 0 ? ' · gola ' + fmt(num(b.gola), 2) : '') + (b.toll ? ' · ' + b.toll : '');
        if (t === 'faccia') return 'Faccia fino a Ø' + fmt(xb, 3);
        if (t === 'spalla') return 'Spallamento da Ø' + fmt(xa, 3) + ' a Ø' + fmt(xb, 3);
        if (t === 'cono') return 'Cono da Ø' + fmt(xa, 3) + ' a Ø' + fmt(xb, 3) + ', lungo ' + fmt(L, 3) + ' (' + fmt(Math.atan(Math.abs(xb - xa) / 2 / L) * 180 / Math.PI, 2) + '°)';
        if (t === 'arco') return 'Arco R' + fmt(num(b.r), 3) + ' ' + (b.tratto === 'cw' ? 'incavato' : 'bombato') + ' fino a Ø' + fmt(xb, 3) + ', lungo ' + fmt(L, 3);
        return 'Punto doppio (da togliere)';
      };
      const ICONA_TIPO = { cil: ICONE.cil, spalla: ICONE.spalla, faccia: ICONE.spalla, cono: ICONE.cono, arco: ICONE.arco, doppio: ICONE.esatto };
      /** Elimina la linea i: un cilindro si toglie e il resto si accosta; le altre linee uniscono i punti vicini. */
      const eliminaLinea = i => {
        ricorda();
        const t = tipoLinea(i), a = S.punti[i - 1], b = S.punti[i];
        if (t === 'cil' && i < S.punti.length - 1) {
          const dz = num(a.z) - num(b.z);
          for (let k = i + 1; k < S.punti.length; k++) S.punti[k].z = String(Math.round((num(S.punti[k].z) + dz) * 1000) / 1000);
        }
        S.punti.splice(i === 1 && S.punti.length > 2 && t !== 'cil' ? 0 : i, 1);
        sel = selL = null; A.salva(); tutto();
      };
      const disegnaElenco = () => {
        elenco.innerHTML = '';
        if (S.punti.length < 2) { elenco.appendChild(el('div', { class: 'vuoto', testo: 'Ancora nessuna linea: tocca il disegno o usa Aggiungi.' })); return; }
        for (let i = 1; i < S.punti.length; i++) {
          const t = tipoLinea(i);
          elenco.appendChild(el('div', { class: 'linea-riga' + (i === selL ? ' attiva' : '') }, [
            el('button', { class: 'linea-testo', onclick: () => { selL = i; sel = null; tutto(); } }, [el('span', { class: 'ic', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' + ICONA_TIPO[t] + '</svg>' }), el('span', { testo: i + '. ' + descrivi(i) })]),
            el('button', { class: 'icona-pul', 'aria-label': 'Elimina la linea ' + i, html: A.icona('cestino'), onclick: () => eliminaLinea(i) })]));
        }
      };

      // ----- riquadro della linea scelta -----
      const mostraLinea = () => {
        const i = selL, a = S.punti[i - 1], b = S.punti[i], t = tipoLinea(i);
        editor.appendChild(el('div', { class: 'sez', testo: 'Linea ' + i + ': ' + descrivi(i) }));
        const pan = el('div', { class: 'pannello' });
        editor.appendChild(pan);
        const v = { d: b.x, L: String(Math.abs(num(a.z) - num(b.z))), r: b.r || '', forma: b.tratto === 'cw' ? 'incavato' : 'bombato' };
        const cambiaL = nuova => {   // lunghezza: si sposta tutto quello che viene dopo
          const L0 = Math.abs(num(a.z) - num(b.z)), dz = nuova - L0;
          if (!(nuova >= 0)) return;
          for (let k = i; k < S.punti.length; k++) S.punti[k].z = String(Math.round((num(S.punti[k].z) - dz) * 1000) / 1000);
        };
        const cambiaD = nuovo => {   // diametro alla fine: segue anche il cilindro che c'e dopo
          if (!(nuovo >= 0)) return;
          const vecchio = num(b.x);
          for (let k = i; k < S.punti.length && (k === i || (num(S.punti[k].x) === vecchio && (S.punti[k].tratto || 'retta') === 'retta')); k++) S.punti[k].x = String(nuovo);
          if (t === 'cil') a.x = String(nuovo);
        };
        const campi = t === 'cil' ? [{ id: 'd', et: 'Diametro Ø', u: 'mm' }, { id: 'L', et: 'Lunghezza', sub: 'quello che viene dopo si sposta', u: 'mm' }]
          : t === 'spalla' || t === 'faccia' ? [{ id: 'd', et: 'Fino al diametro Ø', u: 'mm' }]
          : t === 'cono' ? [{ id: 'd', et: 'Diametro alla fine Ø', u: 'mm' }, { id: 'L', et: 'Lunghezza', u: 'mm' }]
          : t === 'arco' ? [{ id: 'd', et: 'Diametro alla fine Ø', u: 'mm' }, { id: 'L', et: 'Lunghezza', u: 'mm' }, { id: 'r', et: 'Raggio', u: 'mm' }, { id: 'forma', et: 'Forma', tipo: 'scelta', scelte: [['bombato', 'Bombato (convesso)'], ['incavato', 'Incavato (concavo)']] }] : [];
        A.modulo(pan, campi, v, id => {
          if (id === 'd') cambiaD(num(v.d));
          if (id === 'L') cambiaL(num(v.L));
          if (id === 'r') b.r = v.r;
          if (id === 'forma') b.tratto = v.forma === 'incavato' ? 'cw' : 'ccw';
          A.salva(); disegna(); disegnaElenco();
        });
        if (t === 'cil') {
          const d = num(b.x);
          const lv = { gola: b.gola || '', toll: b.toll || '' };
          editor.appendChild(el('div', { class: 'sez', testo: 'Lavorazioni su questa linea' }));
          const panL = el('div', { class: 'pannello' });
          editor.appendChild(panL);
          editor.insertBefore(A.sceltaFiletto({ d, fil: b.fil, filFam: b.filFam, filNome: b.filNome }, { id: 'd-fil', d, cambia: F => {
            if (!F) { delete b.fil; delete b.filFam; delete b.filNome; A.salva(); tutto(); return; }
            if (Math.abs(F.d - d) > 0.001) { cambiaD(Math.round(F.d * 1000) / 1000); A.avviso('Diametro portato a ' + fmt(F.d, 3) + ' per il filetto ' + F.nome); }
            b.fil = String(F.p); b.filFam = F.fam; b.filNome = F.nome;
            if (!b.gola && i < S.punti.length - 1 && num(S.punti[i + 1].x) > F.d) { b.gola = String(Math.max(3, Math.round(2 * F.p * 10) / 10)); A.avviso('Aggiunta la gola di scarico larga ' + b.gola); }
            A.salva(); tutto();
          } }), panL);
          A.modulo(panL, [
            { id: 'gola', et: 'Gola di scarico alla fine', sub: 'larghezza; vuoto = niente', u: 'mm' },
            { id: 'toll', et: 'Tolleranza', sub: 'es. h6, ±0,02', tipo: 'testo' }], lv, id => {
            if (id === 'fil') { if (lv.fil) b.fil = lv.fil; else delete b.fil; if (lv.fil && !b.gola && i < S.punti.length - 1 && num(S.punti[i + 1].x) > d) { b.gola = String(Math.max(3, Math.round(2 * num(lv.fil) * 10) / 10)); A.avviso('Aggiunta la gola di scarico larga ' + b.gola); } A.salva(); tutto(); return; }
            if (id === 'gola') { if (num(lv.gola) > 0) b.gola = lv.gola; else delete b.gola; }
            if (id === 'toll') { if (String(lv.toll).trim()) b.toll = lv.toll.trim(); else delete b.toll; }
            A.salva(); disegna(); disegnaElenco();
          });
        }
        const ultimo = i === S.punti.length - 1;
        if (!ultimo) {
          const metti = (k, val) => { ricorda(); delete b.smusso; delete b.raccordo; if (k) b[k] = val; A.salva(); tutto(); };
          editor.appendChild(el('div', { class: 'leggenda', style: 'margin:6px 2px', testo: 'Spigolo alla fine della linea:' }));
          editor.appendChild(el('div', { class: 'chips' }, [['C0.5', 'smusso', '0.5'], ['C1', 'smusso', '1'], ['R1', 'raccordo', '1'], ['R2', 'raccordo', '2'], ['Vivo', null, null]]
            .map(([tt, k, val]) => el('button', { class: 'chip' + ((k && String(b[k]) === val) || (!k && !(num(b.smusso) > 0) && !(num(b.raccordo) > 0)) ? ' attiva' : ''), testo: tt, onclick: () => metti(k, val) }))));
        }
        editor.appendChild(el('div', { class: 'pulsanti' }, [
          el('button', { class: 'pul peric', html: A.icona('cestino') + (t === 'cil' && !ultimo ? 'Elimina (il resto si accosta)' : 'Elimina la linea'), onclick: () => eliminaLinea(i) }),
          el('button', { class: 'pul sec', html: A.icona('piu') + 'Dividi a meta', onclick: () => {
            ricorda();
            const m = { x: String(Math.round((num(a.x) + num(b.x)) / 2 * 1000) / 1000), z: String(Math.round((num(a.z) + num(b.z)) / 2 * 1000) / 1000) };
            if ((b.tratto || 'retta') !== 'retta') { A.avviso('Un arco non si divide: trasformalo prima in retta'); storia.pop(); return; }
            S.punti.splice(i, 0, m); selL = i; A.salva(); tutto();
          } })]));
        editor.appendChild(el('div', { class: 'pulsanti' }, [
          el('button', { class: 'pul sec', html: A.icona('modifica') + (t === 'arco' ? 'Diventa una retta' : 'Diventa un arco'), onclick: () => {
            ricorda();
            if (t === 'arco') { b.tratto = 'retta'; delete b.r; }
            else { const corda = Math.hypot(num(a.z) - num(b.z), (num(a.x) - num(b.x)) / 2); b.tratto = 'ccw'; b.r = String(Math.round(corda * 1000) / 1000); }
            A.salva(); tutto();
          } })]));
      };

      // ----- riquadro del punto scelto -----
      const mostraEditor = () => {
        editor.innerHTML = '';
        if (selL !== null && S.punti[selL] && S.punti[selL - 1]) { mostraLinea(); return; }
        selL = null;
        if (sel === null || !S.punti[sel]) { editor.appendChild(A.info(S.modo === 'mano' ? 'Disegna il profilo con il dito dalla testa (a destra) verso il mandrino: il tratto diventa rette sulla griglia. Tocca una linea o un punto per correggerlo.' : '<b>Tocca nel vuoto</b> per mettere un punto in fondo, <b>tocca una linea</b> per eliminarla, misurarla o dividerla, <b>trascina un punto</b> per spostarlo. Oppure usa <b>Aggiungi una linea</b> qui sotto.')); return; }
        const p = S.punti[sel];
        const pan = el('div', { class: 'pannello' });
        const metti = (k, v) => { ricorda(); delete p.smusso; delete p.raccordo; if (k) p[k] = v; A.salva(); tutto(); };
        const rapidi = el('div', { class: 'chips' }, [['C0.5', 'smusso', '0.5'], ['C1', 'smusso', '1'], ['C2', 'smusso', '2'], ['R1', 'raccordo', '1'], ['R2', 'raccordo', '2'], ['R5', 'raccordo', '5'], ['Vivo', null, null]]
          .map(([t, k, v]) => el('button', { class: 'chip' + ((k && String(p[k]) === v) || (!k && !(num(p.smusso) > 0) && !(num(p.raccordo) > 0)) ? ' attiva' : ''), testo: t, onclick: () => metti(k, v) })));
        editor.append(el('div', { class: 'sez', testo: 'Punto P' + (sel + 1) + ': spigolo' }), rapidi, pan);
        A.modulo(pan, [{ id: 'x', et: 'X (diametro)', u: 'mm' }, { id: 'z', et: 'Z', u: 'mm' },
          { id: 'tratto', et: 'Ci si arriva con', tipo: 'scelta', scelte: [['retta', 'una retta'], ['cw', 'un arco G2'], ['ccw', 'un arco G3']] },
          { id: 'r', et: 'Raggio dell\'arco', u: 'mm', se: q => q.tratto === 'cw' || q.tratto === 'ccw' },
          { id: 'raccordo', et: 'Raccordo nello spigolo', u: 'R' }, { id: 'smusso', et: 'Smusso nello spigolo', u: 'C' }], p, id => { if (id === 'tratto') { A.salva(); tutto(); } else { A.salva(); disegna(); } });
        editor.appendChild(el('div', { class: 'pulsanti' }, [
          el('button', { class: 'pul sec', html: A.icona('piu') + 'Punto dopo', onclick: () => { ricorda(); const q = S.punti[sel + 1]; const nuovo = q ? { x: String((num(p.x) + num(q.x)) / 2), z: String((num(p.z) + num(q.z)) / 2) } : { x: p.x, z: String(num(p.z) - 10) }; S.punti.splice(sel + 1, 0, nuovo); sel++; A.salva(); tutto(); } }),
          el('button', { class: 'pul peric', html: A.icona('cestino') + 'Elimina il punto', onclick: () => { ricorda(); S.punti.splice(sel, 1); sel = null; A.salva(); tutto(); } })]));
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
          bAnnulla.disabled = !storia.length; bRipeti.disabled = !futuro.length;
          disegnaElenco();
          cv.setAttribute('aria-label', S.vista === '3D' ? 'Pezzo tornito in 3D: trascina per girarlo' : 'Disegno del profilo: tocca per mettere i punti');
          mostraEditor();
        }
        disegna();
      };
      crea.addEventListener('click', () => {
        const { errore, poli } = poliDi(S.punti);
        if (errore) { A.avviso(errore); return; }
        if (poli.length < 2) { A.avviso('Servono almeno due punti'); return; }
        const conLav = S.punti.some(p => num(p.fil) > 0 || num(p.gola) > 0 || (p.toll && String(p.toll).trim()));
        if (conLav) {
          const I = A.imp();
          const pr = O.pianificaProfilo(S.punti, { mat: A.materiale(S.mat || 0), tab: A.tabellaUt ? A.tabellaUt() : [], dg: num(S.dg), nmax: I.nmaxTornio, codLimite: I.codLimite, codFiletto: I.codFiletto, refrig: I.refrig });
          if (pr.errore) { A.avviso(pr.errore); return; }
          const r = O.gcodeSequenzaTornio(pr.fasi, { num: I.numProg, nome: 'PROFILO' });
          if (r.errore) { A.avviso(r.errore); return; }
          A.param.listato = { righe: r.righe, iso: r.righe.slice(), nome: (r.righe[1] || 'O0001').split(' ')[0], tipo: 'tornio', avvisi: pr.note.concat(pr.fasi.map((f, k) => (k + 1) + '. ' + f.titolo)) };
          A.vai('listato');
          return;
        }
        const P = A.sezione('programma');
        P.tab = 'tornio';
        P.tornio = Object.assign(P.tornio || {}, { op: 'profilo', punti: JSON.parse(JSON.stringify(S.punti)), dg: S.dg, mat: S.mat });
        A.salva(); A.vai('programma');
      });
      tutto();
      A.disegnoRidisegna = () => tutto(true);
    }
  };
  window.addEventListener('orientationchange', () => { if (A.attuale && A.attuale() === 'disegno' && A.disegnoRidisegna) setTimeout(A.disegnoRidisegna, 250); });
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
