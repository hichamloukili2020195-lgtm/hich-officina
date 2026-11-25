// ===== Hich-Officina: mini CAD/CAM per la fresa, col dito =====
// Disegni profili, rettangoli, cerchi, fori e asole; a ognuno dai la lavorazione; l'app scrive il programma ISO.
// Gesti: un dito disegna e sposta (il mirino sta sopra il dito e il punto si mette quando lo alzi), due dita
// zoom e spostamento, un tocco con due dita = annulla, con tre dita = ripeti. Schermo intero e rotazione dal menu.
(function () {
  'use strict';
  const A = window.App, O = A.O, el = A.el, fmt = A.fmt;
  const col = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
  const R3 = x => Math.round(x * 1000) / 1000;
  const num = v => { const n = Number(String(v === undefined || v === null ? '' : v).replace(',', '.')); return v === '' || v === null || v === undefined ? NaN : n; };
  const ESEMPIO = () => [
    { id: 1, tipo: 'rett', x0: 0, y0: 0, x1: 80, y1: 50, r: 5, lav: [{ op: 'contorno', prof: 12, lato: 'esterno' }] },
    { id: 2, tipo: 'cerchio', cx: 15, cy: 25, r: 4.25, lav: [{ op: 'foro', passante: true }] },
    { id: 3, tipo: 'cerchio', cx: 65, cy: 25, r: 4.25, lav: [{ op: 'foro', passante: true }] },
    { id: 4, tipo: 'rett', x0: 28, y0: 15, x1: 52, y1: 35, r: 3, lav: [{ op: 'tasca', prof: 6 }] }];
  const STRUM = [['sel', 'Seleziona', '<path d="M5 3l14 8-6 2-3 6z"/>'], ['poli', 'Profilo', '<path d="M4 18l5-9 5 6 6-10"/><circle cx="4" cy="18" r="1.6"/><circle cx="20" cy="5" r="1.6"/>'],
    ['rett', 'Rettangolo', '<rect x="4" y="6" width="16" height="12" rx="1.5"/>'], ['cerchio', 'Cerchio', '<circle cx="12" cy="12" r="8"/><path d="M12 12h8"/>'],
    ['arco', 'Arco', '<path d="M4 18a9 9 0 0 1 16 0"/><circle cx="4" cy="18" r="1.6"/><circle cx="20" cy="18" r="1.6"/>'], ['poligono', 'Poligono', '<path d="M12 3l8 6-3 10H7L4 9z"/>'],
    ['punto', 'Foro', '<circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>'], ['asola', 'Asola', '<rect x="3" y="8" width="18" height="8" rx="4"/>']];
  const COLORE_LAV = { contorno: '--accento2', tasca: '--ok', foro: '--avviso', maschio: '--avviso', alesato: '--avviso', asola: '--ok' };
  const NOME_E = { poli: 'Profilo', rett: 'Rettangolo', cerchio: 'Cerchio', punto: 'Punto', asola: 'Asola' };

  A.schermi.cad = {
    titolo: 'Disegna e programma (fresa)',
    render(m) {
      const S = A.sezione('cad');
      if (!Array.isArray(S.entita)) { S.entita = ESEMPIO(); S.prossimo = 10; }
      S.prossimo = S.prossimo || (Math.max(0, ...S.entita.map(e => e.id || 0)) + 1);
      if (S.fz === undefined) S.fz = '15';
      if (S.mat === undefined) S.mat = '4';
      if (S.mirino === undefined) S.mirino = true;
      if (S.snap === undefined) S.snap = true;
      if (!STRUM.some(t => t[0] === S.strum)) S.strum = 'sel';
      const storia = [], futuro = [];
      const ricorda = () => { storia.push(JSON.stringify(S.entita)); if (storia.length > 100) storia.shift(); futuro.length = 0; };
      if (!['3p', 'cif', 'ifr'].includes(S.arcoModo)) S.arcoModo = '3p';
      if (!(S.latiPol >= 3)) S.latiPol = 6;
      if (S.arcoOrario === undefined) S.arcoOrario = false;
      let arco = null;                             // arco in costruzione: {punti:[{x,y}], chiede:bool}
      let Gc = null, GcEsc = undefined;            // geometria per l'aggancio (si rifa a ogni gesto)
      let sel = null, selV = null;                 // entita scelta (id) e suo punto scelto (indice)
      let nuova = null;                            // profilo in costruzione
      let anteprima = null;                        // percorso calcolato, da mostrare
      const vista = { cx: 40, cy: 25, sc: 4 };
      let adattato = false;

      const radice = el('div', { class: 'cad' });
      const cv = el('canvas', { class: 'cad-tela', 'aria-label': 'Disegno: tocca per disegnare, due dita per zoom e spostamento' });
      const barra = el('div', { class: 'cad-strum', role: 'toolbar', 'aria-label': 'Strumenti di disegno' });
      const azioni = el('div', { class: 'cad-azioni' });
      const lettura = el('div', { class: 'cad-lettura', 'aria-live': 'polite' });
      const pannello = el('div', { class: 'cad-pannello' });
      const area = el('div', { class: 'cad-area' }, [barra, el('div', { class: 'cad-tela-box' }, [cv, lettura]), azioni]);
      radice.append(area, pannello);
      m.appendChild(radice);

      // ----- vista -----
      const dim = () => ({ W: cv.clientWidth || 340, H: cv.clientHeight || 300 });
      const X = x => dim().W / 2 + (x - vista.cx) * vista.sc, Y = y => dim().H / 2 - (y - vista.cy) * vista.sc;
      const mx = px => vista.cx + (px - dim().W / 2) / vista.sc, my = py => vista.cy - (py - dim().H / 2) / vista.sc;
      const adatta = () => {
        const b = O.limitiCAD(S.entita) || { x0: 0, y0: 0, x1: 80, y1: 50 };
        const { W, H } = dim();
        const w = Math.max(b.x1 - b.x0, 20), h = Math.max(b.y1 - b.y0, 20);
        vista.sc = Math.min((W - 60) / w, (H - 60) / h);
        vista.cx = (b.x0 + b.x1) / 2; vista.cy = (b.y0 + b.y1) / 2;
      };
      const passoGriglia = () => { const p = [0.5, 1, 2, 5, 10, 20, 50, 100, 200].find(q => q * vista.sc >= 14) || 200; return p; };
      const trovaE = id => S.entita.find(e => e.id === id);

      // ----- punti notevoli per l'aggancio e le maniglie -----
      const maniglie = e => {
        if (e.tipo === 'poli') return e.punti.map((p, i) => ({ i, x: num(p.x), y: num(p.y) }));
        if (e.tipo === 'rett') return [{ i: 0, x: e.x0, y: e.y0 }, { i: 1, x: e.x1, y: e.y0 }, { i: 2, x: e.x1, y: e.y1 }, { i: 3, x: e.x0, y: e.y1 }];
        if (e.tipo === 'cerchio') return [{ i: 0, x: e.cx, y: e.cy }, { i: 1, x: e.cx + e.r, y: e.cy }];
        if (e.tipo === 'punto') return [{ i: 0, x: e.x, y: e.y }];
        return [{ i: 0, x: e.x1, y: e.y1 }, { i: 1, x: e.x2, y: e.y2 }];
      };
      const puntiAggancio = esclusa => {
        const L = [];
        S.entita.forEach(e => { if (e.id === esclusa) return; maniglie(e).forEach(h => L.push([h.x, h.y])); if (e.tipo === 'cerchio') { L.push([e.cx - e.r, e.cy], [e.cx, e.cy + e.r], [e.cx, e.cy - e.r]); } });
        L.push([0, 0]);
        return L;
      };
      const geom = esclusa => { if (!Gc || GcEsc !== esclusa) { Gc = O.geometriaCAD(S.entita, esclusa); GcEsc = esclusa; } return Gc; };
      /** Aggancia un punto (mm): intersezioni, estremi, centri, punti medi, tangenti e perpendicolari, poi le linee orizzontali/verticali e la griglia. */
      const aggancia = (x, y, ref, esclusa) => {
        if (!S.snap) return { x: R3(x), y: R3(y), tipo: null };
        const tol = 14 / vista.sc;
        const a = O.agganciCAD(S.entita, x, y, tol, ref, esclusa, geom(esclusa));
        if (a) return a;
        if (Math.hypot(x, y) < tol) return { x: 0, y: 0, tipo: 'punto' };
        if (nuova && nuova.punti.length > 2) { const p0 = nuova.punti[0], d = Math.hypot(num(p0.x) - x, num(p0.y) - y); if (d < tol) return { x: num(p0.x), y: num(p0.y), tipo: 'punto' }; }
        const pg = passoGriglia();
        let gx = Math.round(x / pg) * pg, gy = Math.round(y / pg) * pg, tipo = 'griglia';
        if (ref) {
          const dx = x - ref.x, dy = y - ref.y, t = Math.tan(6 * Math.PI / 180);
          if (Math.abs(dy) < t * Math.abs(dx) && Math.abs(dx) > 3 / vista.sc) { gy = ref.y; tipo = 'oriz'; }
          else if (Math.abs(dx) < t * Math.abs(dy) && Math.abs(dy) > 3 / vista.sc) { gx = ref.x; tipo = 'vert'; }
        }
        return { x: R3(gx), y: R3(gy), tipo };
      };

      // ----- disegno -----
      const forma = e => {
        const pr = O.profiloCAD(e);
        if (pr) {
          const g = O.costruisciProfilo(pr.punti.map(p => ({ a: p.x, b: p.y, tratto: p.tratto, r: p.r, raccordo: p.raccordo, smusso: p.smusso })), pr.chiuso);
          if (!g.errore && g.tratti.length) return { poli: O.polilineaProfilo(g.tratti, Math.max(0.15, 1 / vista.sc)), chiuso: pr.chiuso };
          return { poli: pr.punti.filter(p => isFinite(p.x) && isFinite(p.y)).map(p => ({ a: p.x, b: p.y })), chiuso: pr.chiuso, errore: g.errore };
        }
        return null;
      };
      let mirino = null, tratto = null;   // posizione agganciata del mirino, anteprima in corso
      /** Il segno dell'aggancio: ogni tipo ha la sua forma (estremo quadrato, centro cerchio col punto, intersezione X, medio triangolo...). */
      const segnoAggancio = (g, x, y, tipo) => {
        g.beginPath();
        if (tipo === 'intersezione') { g.moveTo(x - 9, y - 9); g.lineTo(x + 9, y + 9); g.moveTo(x + 9, y - 9); g.lineTo(x - 9, y + 9); }
        else if (tipo === 'punto') g.rect(x - 9, y - 9, 18, 18);
        else if (tipo === 'medio') { g.moveTo(x, y - 10); g.lineTo(x + 10, y + 8); g.lineTo(x - 10, y + 8); g.closePath(); }
        else if (tipo === 'centro') { g.arc(x, y, 10, 0, 7); g.moveTo(x + 2, y); g.arc(x, y, 2, 0, 7); }
        else if (tipo === 'tangente') { g.arc(x, y, 7, 0, 7); g.moveTo(x - 12, y - 11); g.lineTo(x + 12, y - 11); }
        else if (tipo === 'perpendicolare') { g.moveTo(x - 10, y + 9); g.lineTo(x - 10, y - 9); g.moveTo(x - 10, y + 9); g.lineTo(x + 10, y + 9); g.moveTo(x - 10, y); g.lineTo(x, y); g.lineTo(x, y + 9); }
        else g.arc(x, y, 7, 0, 7);
        g.stroke();
      };
      const disegna = () => {
        const { W, H } = dim();
        const dpr = window.devicePixelRatio || 1;
        if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
        const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        // griglia
        const pg = passoGriglia();
        g.lineWidth = 1; g.strokeStyle = col('--bordo');
        for (let x = Math.floor(mx(0) / pg) * pg; x <= mx(W); x += pg) { g.globalAlpha = Math.abs(x / (pg * 5) - Math.round(x / (pg * 5))) < 1e-6 ? 0.9 : 0.35; g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), H); g.stroke(); }
        for (let y = Math.floor(my(H) / pg) * pg; y <= my(0); y += pg) { g.globalAlpha = Math.abs(y / (pg * 5) - Math.round(y / (pg * 5))) < 1e-6 ? 0.9 : 0.35; g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(W, Y(y)); g.stroke(); }
        g.globalAlpha = 1;
        // origine
        g.strokeStyle = col('--tenue'); g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(X(0) - 12, Y(0)); g.lineTo(X(0) + 28, Y(0)); g.moveTo(X(0), Y(0) + 12); g.lineTo(X(0), Y(0) - 28); g.stroke();
        g.fillStyle = col('--tenue'); g.font = '600 10px system-ui'; g.textAlign = 'left'; g.fillText('X', X(0) + 30, Y(0) + 4); g.fillText('Y', X(0) + 4, Y(0) - 30);
        // quote sugli assi
        g.textAlign = 'center'; g.font = '10px system-ui';
        const pq = [1, 2, 5, 10, 20, 50, 100, 200].find(q => q * vista.sc >= 60) || 200;
        for (let x = Math.ceil(mx(0) / pq) * pq; x <= mx(W); x += pq) g.fillText(String(R3(x)), X(x), H - 4);
        g.textAlign = 'left';
        for (let y = Math.ceil(my(H) / pq) * pq; y <= my(0); y += pq) g.fillText(String(R3(y)), 3, Y(y) - 3);
        // entita
        const percorso = (poli, chiuso) => { g.beginPath(); poli.forEach((p, i) => (i ? g.lineTo(X(p.a), Y(p.b)) : g.moveTo(X(p.a), Y(p.b)))); if (chiuso) g.closePath(); };
        S.entita.forEach(e => {
          const scelta = e.id === sel;
          const c0 = (e.lav && e.lav[0]) ? col(COLORE_LAV[e.lav[0].op] || '--accento2') : col('--testo');
          g.strokeStyle = scelta ? col('--avviso') : c0; g.fillStyle = c0; g.lineWidth = scelta ? 3 : 2;
          if (e.tipo === 'punto') { g.beginPath(); g.arc(X(e.x), Y(e.y), 5, 0, 7); g.fill(); g.beginPath(); g.moveTo(X(e.x) - 9, Y(e.y)); g.lineTo(X(e.x) + 9, Y(e.y)); g.moveTo(X(e.x), Y(e.y) - 9); g.lineTo(X(e.x), Y(e.y) + 9); g.stroke(); return; }
          if (e.tipo === 'asola') {
            const w = num(e.w) || 8, dx = e.x2 - e.x1, dy = e.y2 - e.y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
            g.save(); g.lineWidth = Math.max(2, w * vista.sc); g.lineCap = 'round'; g.globalAlpha = 0.25; g.beginPath(); g.moveTo(X(e.x1), Y(e.y1)); g.lineTo(X(e.x2), Y(e.y2)); g.stroke(); g.restore();
            g.beginPath(); g.moveTo(X(e.x1), Y(e.y1)); g.lineTo(X(e.x2), Y(e.y2)); g.setLineDash([6, 4]); g.stroke(); g.setLineDash([]);
            [[e.x1, e.y1], [e.x2, e.y2]].forEach(q => { g.beginPath(); g.arc(X(q[0]), Y(q[1]), w / 2 * vista.sc, 0, 7); g.stroke(); });
            void ux; void uy; return;
          }
          const f = forma(e);
          if (!f) return;
          g.globalAlpha = 0.12; percorso(f.poli, f.chiuso); g.fill(); g.globalAlpha = 1;
          g.strokeStyle = f.errore ? col('--errore') : (scelta ? col('--avviso') : c0); percorso(f.poli, f.chiuso); g.stroke();
          if (e.tipo === 'cerchio') { g.strokeStyle = col('--tenue'); g.lineWidth = 1; g.beginPath(); g.moveTo(X(e.cx) - 6, Y(e.cy)); g.lineTo(X(e.cx) + 6, Y(e.cy)); g.moveTo(X(e.cx), Y(e.cy) - 6); g.lineTo(X(e.cx), Y(e.cy) + 6); g.stroke(); }
        });
        // etichette delle lavorazioni
        g.font = '700 11px system-ui'; g.textAlign = 'left';
        S.entita.forEach((e, k) => {
          if (!e.lav || !e.lav.length) return;
          const b = O.limitiCAD([e]); if (!b) return;
          const t = (k + 1) + ' ' + e.lav.map(l => O.CAD_NOMI_LAV[l.op]).join(' + ');
          const px = X((b.x0 + b.x1) / 2), py = Y(b.y1) - 8;
          const w = g.measureText(t).width + 10;
          g.fillStyle = col('--pannello'); g.globalAlpha = 0.9; g.fillRect(px - w / 2, py - 14, w, 17); g.globalAlpha = 1;
          g.fillStyle = col(COLORE_LAV[e.lav[0].op] || '--testo'); g.textAlign = 'center'; g.fillText(t, px, py - 1);
        });
        // percorso calcolato
        if (anteprima) {
          g.lineWidth = 1.2;
          anteprima.forEach(s => { if (s.rapido) return; g.strokeStyle = col('--avviso'); g.globalAlpha = 0.8; g.beginPath(); g.moveTo(X(s.x0), Y(s.y0)); g.lineTo(X(s.x), Y(s.y)); g.stroke(); });
          g.globalAlpha = 1;
        }
        // maniglie dell'entita scelta
        const es = trovaE(sel);
        if (es) maniglie(es).forEach(h => { g.fillStyle = h.i === selV ? col('--avviso') : col('--testo'); g.strokeStyle = col('--fondo'); g.lineWidth = 2; g.beginPath(); g.arc(X(h.x), Y(h.y), h.i === selV ? 8 : 6, 0, 7); g.fill(); g.stroke(); });
        // profilo in costruzione
        if (nuova) {
          const pts = nuova.punti.map(p => ({ x: num(p.x), y: num(p.y) }));
          g.strokeStyle = col('--avviso'); g.lineWidth = 2.4; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y)))); if (mirino) g.lineTo(X(mirino.x), Y(mirino.y)); g.stroke();
          pts.forEach((p, i) => { g.fillStyle = i === 0 ? col('--ok') : col('--testo'); g.beginPath(); g.arc(X(p.x), Y(p.y), i === 0 ? 7 : 5, 0, 7); g.fill(); });
        }
        // anteprima di rettangolo, cerchio, asola mentre si disegna
        if (tratto && mirino) {
          g.strokeStyle = col('--avviso'); g.lineWidth = 2.2; g.setLineDash([6, 4]);
          const a = tratto;
          if (a.tipo === 'rett') g.strokeRect(X(Math.min(a.x, mirino.x)), Y(Math.max(a.y, mirino.y)), Math.abs(mirino.x - a.x) * vista.sc, Math.abs(mirino.y - a.y) * vista.sc);
          else if (a.tipo === 'cerchio') { g.beginPath(); g.arc(X(a.x), Y(a.y), Math.hypot(mirino.x - a.x, mirino.y - a.y) * vista.sc, 0, 7); g.stroke(); g.beginPath(); g.moveTo(X(a.x), Y(a.y)); g.lineTo(X(mirino.x), Y(mirino.y)); g.stroke(); }
          else if (a.tipo === 'asola') { g.beginPath(); g.moveTo(X(a.x), Y(a.y)); g.lineTo(X(mirino.x), Y(mirino.y)); g.stroke(); }
          else if (a.tipo === 'poligono') {
            const r = Math.hypot(mirino.x - a.x, mirino.y - a.y);
            if (r > 0.05) { const pts = O.poligonoRegolare(a.x, a.y, r, S.latiPol, Math.atan2(mirino.y - a.y, mirino.x - a.x) * 180 / Math.PI); g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(X(q.x), Y(q.y)) : g.moveTo(X(q.x), Y(q.y)))); g.closePath(); g.stroke(); }
            g.beginPath(); g.moveTo(X(a.x), Y(a.y)); g.lineTo(X(mirino.x), Y(mirino.y)); g.stroke();
          }
          g.setLineDash([]);
        }
        // arco in costruzione
        if (arco && arco.punti.length) {
          g.strokeStyle = col('--avviso'); g.fillStyle = col('--testo'); g.lineWidth = 2.2; g.setLineDash([6, 4]);
          const P = arco.punti.concat(mirino ? [{ x: mirino.x, y: mirino.y }] : []);
          if (P.length >= 3 && S.arcoModo !== 'ifr') { const r = calcolaArco(P.slice(0, 3)); if (!r.errore) tracciaPunti(g, r.punti); }
          else if (P.length >= 2) { g.beginPath(); g.moveTo(X(P[0].x), Y(P[0].y)); g.lineTo(X(P[1].x), Y(P[1].y)); g.stroke(); }
          g.setLineDash([]);
          arco.punti.forEach((q, i) => { g.fillStyle = i === 0 ? col('--ok') : col('--testo'); g.beginPath(); g.arc(X(q.x), Y(q.y), 6, 0, 7); g.fill(); });
        }
        // mirino con le quote e lente
        if (mirino) {
          const x = X(mirino.x), y = Y(mirino.y);
          g.strokeStyle = col('--avviso'); g.lineWidth = 1; g.setLineDash([3, 3]);
          g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); g.setLineDash([]);
          g.lineWidth = 2.4; segnoAggancio(g, x, y, mirino.tipo);
          const NOMI = { punto: 'estremo', centro: 'centro', intersezione: 'intersezione', medio: 'punto medio', tangente: 'tangente', perpendicolare: 'perpendicolare', oriz: 'orizzontale', vert: 'verticale', griglia: '' };
          const nm = NOMI[mirino.tipo] || '';
          lettura.textContent = 'X' + fmt(mirino.x, 3) + '  Y' + fmt(mirino.y, 3) + (nm ? '  · ' + nm : '');
          if (nm && ['punto', 'centro', 'intersezione', 'medio', 'tangente', 'perpendicolare'].includes(mirino.tipo)) { g.font = '700 11px system-ui'; const w = g.measureText(nm).width + 10; g.fillStyle = col('--pannello'); g.globalAlpha = 0.92; g.fillRect(x + 14, y - 30, w, 18); g.globalAlpha = 1; g.fillStyle = col('--avviso'); g.textAlign = 'left'; g.fillText(nm, x + 19, y - 17); }
        }
      };
      const ridisegna = () => { if (!adattato && cv.clientWidth > 10) { adattato = true; adatta(); } disegna(); };
      // lente d'ingrandimento sopra il dito (si ridisegna dopo il disegno)
      const lente = (px, py) => {
        const g = cv.getContext('2d'), dpr = window.devicePixelRatio || 1, { W } = dim();
        const R = 46, k = 2.6, cx = Math.min(Math.max(R + 6, px), W - R - 6), cy = py - 110 < R + 6 ? py + 110 : py - 110;
        g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
        g.fillStyle = col('--fondo'); g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
        g.drawImage(cv, (px - R / k) * dpr, (py - R / k) * dpr, 2 * R / k * dpr, 2 * R / k * dpr, cx - R, cy - R, 2 * R, 2 * R);
        g.restore();
        g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.strokeStyle = col('--avviso'); g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
        g.lineWidth = 1; g.beginPath(); g.moveTo(cx - 10, cy); g.lineTo(cx + 10, cy); g.moveTo(cx, cy - 10); g.lineTo(cx, cy + 10); g.stroke(); g.restore();
      };

      // ----- gesti -----
      const attivi = new Map();
      let gesto = null, pinch = null, tocchiDue = null, ultimoTocco = 0, timerLungo = null, ultimoTap = null;
      const pos = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
      const dito = e => e.pointerType === 'mouse' ? 0 : (S.mirino ? 56 : 0);   // mirino sopra il dito
      const mondo = (e, esclusa, ref) => { const [px, py] = pos(e); const a = aggancia(mx(px), my(py - dito(e)), ref, esclusa); return Object.assign(a, { px, py }); };
      const distSeg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0; return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
      /** Cosa c'e sotto il dito: una maniglia dell'entita scelta, oppure un'entita. */
      const trova = (px, py) => {
        const es = trovaE(sel);
        if (es) { let bd = 22; let hit = null; maniglie(es).forEach(h => { const d = Math.hypot(X(h.x) - px, Y(h.y) - py); if (d < bd) { bd = d; hit = h; } }); if (hit) return { e: es, h: hit }; }
        let best = null, bd = 16;
        S.entita.forEach(e => {
          let d = Infinity;
          if (e.tipo === 'punto') d = Math.hypot(X(e.x) - px, Y(e.y) - py);
          else if (e.tipo === 'asola') d = distSeg(px, py, X(e.x1), Y(e.y1), X(e.x2), Y(e.y2)) - (num(e.w) || 8) / 2 * vista.sc;
          else if (e.tipo === 'cerchio') { d = Math.abs(Math.hypot(X(e.cx) - px, Y(e.cy) - py) - e.r * vista.sc); if (Math.hypot(X(e.cx) - px, Y(e.cy) - py) < e.r * vista.sc * 0.35) d = Math.min(d, 8); }
          else { const f = forma(e); if (f) { const p = f.poli; for (let i = 1; i < p.length; i++) d = Math.min(d, distSeg(px, py, X(p[i - 1].a), Y(p[i - 1].b), X(p[i].a), Y(p[i].b))); if (f.chiuso && p.length > 2) d = Math.min(d, distSeg(px, py, X(p[p.length - 1].a), Y(p[p.length - 1].b), X(p[0].a), Y(p[0].b))); } }
          if (d < bd) { bd = d; best = e; }
        });
        return best ? { e: best, h: null } : null;
      };
      const sposta = (e, h, x, y) => {
        if (e.tipo === 'poli') { e.punti[h.i].x = x; e.punti[h.i].y = y; }
        else if (e.tipo === 'rett') { const opp = maniglie(e)[(h.i + 2) % 4]; e.x0 = Math.min(x, opp.x); e.x1 = Math.max(x, opp.x); e.y0 = Math.min(y, opp.y); e.y1 = Math.max(y, opp.y); }
        else if (e.tipo === 'cerchio') { if (h.i === 0) { e.cx = x; e.cy = y; } else e.r = Math.max(0.1, R3(Math.hypot(x - e.cx, y - e.cy))); }
        else if (e.tipo === 'punto') { e.x = x; e.y = y; }
        else { if (h.i === 0) { e.x1 = x; e.y1 = y; } else { e.x2 = x; e.y2 = y; } }
      };
      const muoviTutto = (e, dx, dy) => {
        if (e.tipo === 'poli') e.punti.forEach(p => { p.x = R3(num(p.x) + dx); p.y = R3(num(p.y) + dy); });
        else if (e.tipo === 'rett') { e.x0 = R3(e.x0 + dx); e.x1 = R3(e.x1 + dx); e.y0 = R3(e.y0 + dy); e.y1 = R3(e.y1 + dy); }
        else if (e.tipo === 'cerchio') { e.cx = R3(e.cx + dx); e.cy = R3(e.cy + dy); }
        else if (e.tipo === 'punto') { e.x = R3(e.x + dx); e.y = R3(e.y + dy); }
        else { e.x1 = R3(e.x1 + dx); e.x2 = R3(e.x2 + dx); e.y1 = R3(e.y1 + dy); e.y2 = R3(e.y2 + dy); }
      };
      const nuovaE = e => {
        ricorda(); e.id = S.prossimo++;
        if (!e.lav) e.lav = e.tipo === 'cerchio' ? [{ op: 'foro', passante: true }] : e.tipo === 'punto' ? [Object.assign({ op: 'foro', passante: true, d: 6.8 }, S.ultimoForo || {})] : e.tipo === 'asola' ? [nuovaLav(e, 'asola')] : [];
        S.entita.push(e); sel = e.id; selV = null; anteprima = null;
        if (e.tipo !== 'punto') S.strum = 'sel';
        A.salva(); aggiorna(); return e;
      };
      const chiudiProfilo = chiuso => {
        if (!nuova) return;
        if (nuova.punti.length < 2) { nuova = null; aggiorna(); return; }
        const e = nuovaE({ tipo: 'poli', punti: nuova.punti, chiuso: !!chiuso && nuova.punti.length > 2 });
        nuova = null; S.strum = 'sel'; aggiorna(); return e;
      };

      cv.addEventListener('pointerdown', e => {
        attivi.set(e.pointerId, pos(e));
        try { cv.setPointerCapture(e.pointerId); } catch (x) { /* niente */ }
        Gc = null; chiudiMenu();
        if (attivi.size === 2) {
          // due dita: zoom e spostamento (o un tocco veloce = annulla)
          gesto = null; mirino = null; tratto = tratto && tratto.fermo ? tratto : null;
          const [a, b] = Array.from(attivi.values());
          pinch = { d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, sc0: vista.sc, wx: mx((a[0] + b[0]) / 2), wy: my((a[1] + b[1]) / 2), t0: Date.now(), mosso: false };
          return;
        }
        if (attivi.size === 3) { pinch = null; tocchiDue = { t0: Date.now(), tre: true, mosso: false, p: Array.from(attivi.values()) }; return; }
        if (attivi.size > 3) return;
        const [px, py] = pos(e);
        const strum = S.strum;
        if (strum === 'sel') {
          const t = trova(px, py);
          if (t) {
            const hh = t.h ? maniglie(t.e).find(q => q.i === t.h.i) : null;
            gesto = { tipo: 'sposta', id: t.e.id, e: t.e, h: t.h, px, py, mosso: false, prima: JSON.stringify(S.entita), wx: mx(px), wy: my(py), h0: hh ? { x: hh.x, y: hh.y } : null, a0: maniglie(t.e)[0] };
            if (sel !== t.e.id) { sel = t.e.id; selV = t.h ? t.h.i : null; pannelloAgg(); } else selV = t.h ? t.h.i : selV;
          }
          else gesto = { tipo: 'vuoto', px, py, mosso: false };
          // pressione lunga: menu contestuale
          clearTimeout(timerLungo);
          const gg = gesto;
          timerLungo = setTimeout(() => { if (gesto === gg && !gg.mosso && attivi.size === 1) { gg.lungo = true; menuContestuale(px, py, t ? t.e : null); } }, 550);
          disegna(); return;
        }
        // strumenti di disegno
        const ref = nuova && nuova.punti.length ? { x: num(nuova.punti[nuova.punti.length - 1].x), y: num(nuova.punti[nuova.punti.length - 1].y) } : null;
        const w = mondo(e, null, ref);
        mirino = w;
        gesto = { tipo: 'disegna', strum, px, py, mosso: false, inizio: tratto && tratto.fermo ? tratto : null };
        if ((strum === 'rett' || strum === 'cerchio' || strum === 'asola' || strum === 'poligono') && !gesto.inizio) tratto = { tipo: strum, x: w.x, y: w.y };
        disegna(); if (e.pointerType !== 'mouse') lente(w.px, w.py);
      });
      cv.addEventListener('pointermove', e => {
        if (attivi.has(e.pointerId)) attivi.set(e.pointerId, pos(e));
        if (pinch && attivi.size === 2) {
          const [a, b] = Array.from(attivi.values());
          const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
          if (Math.abs(d - pinch.d0) > 6 || Date.now() - pinch.t0 > 250) pinch.mosso = true;
          vista.sc = Math.max(0.3, Math.min(400, pinch.sc0 * d / pinch.d0));
          vista.cx = pinch.wx - (cx - dim().W / 2) / vista.sc; vista.cy = pinch.wy + (cy - dim().H / 2) / vista.sc;
          disegna(); return;
        }
        if (tocchiDue) return;
        if (!gesto) { if (e.pointerType === 'mouse') { const w = mondo(e); if (S.strum !== 'sel') { mirino = w; disegna(); } else lettura.textContent = 'X' + fmt(w.x, 3) + '  Y' + fmt(w.y, 3); } return; }
        const [px, py] = pos(e);
        if (Math.hypot(px - gesto.px, py - gesto.py) > 7) gesto.mosso = true;
        if (gesto.mosso) clearTimeout(timerLungo);
        if (gesto.tipo === 'sposta' && gesto.mosso) {
          S.entita = JSON.parse(gesto.prima); gesto.e = trovaE(gesto.id);
          const dx = mx(px) - gesto.wx, dy = my(py) - gesto.wy;
          if (gesto.h) {
            const ref = gesto.e.tipo === 'poli' && gesto.h.i > 0 ? { x: num(gesto.e.punti[gesto.h.i - 1].x), y: num(gesto.e.punti[gesto.h.i - 1].y) } : null;
            const w = aggancia(gesto.h0.x + dx, gesto.h0.y + dy, ref, gesto.id); sposta(gesto.e, gesto.h, w.x, w.y); mirino = Object.assign(w, { px, py });
          } else {
            const w = aggancia(gesto.a0.x + dx, gesto.a0.y + dy, null, gesto.id); muoviTutto(gesto.e, R3(w.x - gesto.a0.x), R3(w.y - gesto.a0.y)); mirino = Object.assign(w, { px, py });
          }
          anteprima = null; disegna(); if (e.pointerType !== 'mouse') lente(px, py); return;
        }
        if (gesto.tipo === 'vuoto' && gesto.mosso) { const dx = px - gesto.px, dy = py - gesto.py; vista.cx -= dx / vista.sc; vista.cy += dy / vista.sc; gesto.px = px; gesto.py = py; disegna(); return; }
        if (gesto.tipo === 'disegna') {
          const ref = nuova && nuova.punti.length ? { x: num(nuova.punti[nuova.punti.length - 1].x), y: num(nuova.punti[nuova.punti.length - 1].y) } : (tratto ? { x: tratto.x, y: tratto.y } : null);
          mirino = mondo(e, null, ref); disegna(); if (e.pointerType !== 'mouse') lente(mirino.px, mirino.py);
        }
      });
      const fine = e => {
        attivi.delete(e.pointerId);
        if (pinch) {
          gesto = null;
          if (attivi.size === 0) {
            if (!pinch.mosso && Date.now() - pinch.t0 < 350) annulla();
            pinch = null; mirino = null;
          }
          disegna(); return;
        }
        if (tocchiDue) {
          if (attivi.size === 0) { if (Date.now() - tocchiDue.t0 < 350) ripeti(); tocchiDue = null; }
          return;
        }
        Gc = null; clearTimeout(timerLungo);
        const g = gesto; gesto = null;
        if (!g) { mirino = null; disegna(); return; }
        if (g.lungo) { mirino = null; disegna(); return; }
        const w = g.tipo === 'disegna' ? mirino : null;
        const ultimo = mirino; mirino = null;
        if (g.tipo === 'vuoto') {
          if (!g.mosso) {
            // doppio tap sul vuoto = adatta alla vista
            const ora = Date.now();
            if (ultimoTap && ora - ultimoTap.t < 330 && Math.hypot(g.px - ultimoTap.px, g.py - ultimoTap.py) < 28) { ultimoTap = null; adatta(); A.vibra && A.vibra(10); disegna(); return; }
            ultimoTap = { t: ora, px: g.px, py: g.py };
            sel = null; selV = null; pannelloAgg();
          }
          disegna(); return;
        }
        if (g.tipo === 'sposta') {
          if (g.mosso) { storia.push(g.prima); futuro.length = 0; A.salva(); pannelloAgg(); }
          else { sel = g.e.id; if (g.h) selV = g.h.i; pannelloAgg(); }
          disegna(); return;
        }
        // strumenti di disegno: il punto si mette quando alzi il dito
        if (!w) { disegna(); return; }
        const strum = g.strum;
        if (strum === 'poli') {
          nuova = nuova || { punti: [] };
          const p0 = nuova.punti[0];
          if (nuova.punti.length > 2 && p0 && Math.hypot(num(p0.x) - w.x, num(p0.y) - w.y) < 1e-6) { chiudiProfilo(true); return; }
          const ult = nuova.punti[nuova.punti.length - 1];
          if (ult && Math.hypot(num(ult.x) - w.x, num(ult.y) - w.y) < 1e-6) { chiudiProfilo(false); return; }   // secondo tocco sullo stesso punto = fine
          nuova.punti.push({ x: w.x, y: w.y });
          statoBarra(); pannelloAgg(); disegna(); return;
        }
        if (strum === 'punto') { nuovaE({ tipo: 'punto', x: w.x, y: w.y }); return; }
        if (strum === 'arco') { arcoAggiungi(w); return; }
        if (strum === 'rett' || strum === 'cerchio' || strum === 'asola' || strum === 'poligono') {
          const a = g.inizio || tratto;
          if (!a || (!g.inizio && !g.mosso)) { tratto = Object.assign({}, tratto, { fermo: true }); lettura.textContent = 'Tocca il punto finale'; disegna(); return; }   // un tocco: primo punto, poi il secondo
          tratto = null;
          if (strum === 'rett') { if (Math.abs(w.x - a.x) < 0.01 || Math.abs(w.y - a.y) < 0.01) { disegna(); return; } nuovaE({ tipo: 'rett', x0: Math.min(a.x, w.x), y0: Math.min(a.y, w.y), x1: Math.max(a.x, w.x), y1: Math.max(a.y, w.y), r: 0 }); }
          else if (strum === 'cerchio') { const r = R3(Math.hypot(w.x - a.x, w.y - a.y)); if (r < 0.05) { disegna(); return; } nuovaE({ tipo: 'cerchio', cx: a.x, cy: a.y, r }); }
          else if (strum === 'poligono') { if (!creaPoligono(a, w)) disegna(); }
          else { if (Math.hypot(w.x - a.x, w.y - a.y) < 0.05) { disegna(); return; } nuovaE({ tipo: 'asola', x1: a.x, y1: a.y, x2: w.x, y2: w.y, w: 8 }); }
        }
        void ultimo;
      };
      cv.addEventListener('pointerup', fine);
      cv.addEventListener('pointercancel', e => { attivi.delete(e.pointerId); clearTimeout(timerLungo); pinch = null; gesto = null; mirino = null; tocchiDue = null; disegna(); });
      cv.addEventListener('wheel', e => { e.preventDefault(); const [px, py] = pos(e), wx = mx(px), wy = my(py); vista.sc = Math.max(0.3, Math.min(400, vista.sc * (e.deltaY < 0 ? 1.2 : 1 / 1.2))); vista.cx = wx - (px - dim().W / 2) / vista.sc; vista.cy = wy + (py - dim().H / 2) / vista.sc; disegna(); }, { passive: false });
      cv.addEventListener('dblclick', () => { if (nuova && S.strum === 'poli') chiudiProfilo(false); });

      // ----- poligono, arco -----
      const creaPoligono = (a, w) => {
        const r = R3(Math.hypot(w.x - a.x, w.y - a.y));
        if (r < 0.05) return false;
        const ang = Math.atan2(w.y - a.y, w.x - a.x) * 180 / Math.PI;
        tratto = null; nuovaE({ tipo: 'poli', punti: O.poligonoRegolare(a.x, a.y, r, S.latiPol, ang), chiuso: true }); return true;
      };
      const calcolaArco = (P, o) => S.arcoModo === '3p' ? O.arcoDa3Punti(P[0], P[1], P[2]) : S.arcoModo === 'cif' ? O.arcoCentroInizioFine(P[0], P[1], P[2], !S.arcoOrario) : O.arcoInizioFineRaggio(P[0], P[1], (o || {}).raggio, (o || {}).grande, S.arcoOrario);
      const arcoAggiungi = (w, raggio, grande) => {
        arco = arco || { punti: [] };
        const ult = arco.punti[arco.punti.length - 1];
        if (raggio === undefined && ult && Math.hypot(ult.x - w.x, ult.y - w.y) < 1e-6) { A.avviso('Quel punto e uguale al precedente'); return; }
        if (raggio === undefined) arco.punti.push({ x: w.x, y: w.y });
        const n = arco.punti.length;
        if (S.arcoModo === 'ifr' && n === 2 && raggio === undefined) { statoBarra(); disegna(); promptRaggio(); return; }
        if ((S.arcoModo !== 'ifr' && n === 3) || (S.arcoModo === 'ifr' && raggio !== undefined)) {
          const r = calcolaArco(arco.punti, { raggio, grande });
          if (r.errore) { A.avviso(r.errore); if (S.arcoModo !== 'ifr') arco.punti.pop(); statoBarra(); disegna(); return; }
          arco = null; nuovaE({ tipo: 'poli', punti: r.punti, chiuso: false }); return;
        }
        statoBarra(); pannelloAgg(); disegna();
      };
      let promptRaggio = () => {};   // si completa dopo, col pannello "Digita"
      /** Un arco (o altra forma) a pezzi su canvas: dai punti del profilo. */
      const tracciaPunti = (g, punti) => {
        const gg = O.costruisciProfilo(punti.map(p => ({ a: p.x, b: p.y, tratto: p.tratto, r: p.r })), false);
        if (gg.errore || !gg.tratti.length) return;
        const poli = O.polilineaProfilo(gg.tratti, Math.max(0.15, 1 / vista.sc));
        g.beginPath(); poli.forEach((q, i) => (i ? g.lineTo(X(q.a), Y(q.b)) : g.moveTo(X(q.a), Y(q.b)))); g.stroke();
      };

      // ----- menu contestuale (pressione lunga) -----
      let menuEl = null;
      const chiudiMenu = () => { if (menuEl) { menuEl.remove(); menuEl = null; } };
      const duplica = e => { ricorda(); const c = JSON.parse(JSON.stringify(e)); c.id = S.prossimo++; muoviTutto(c, 5, 5); S.entita.push(c); sel = c.id; selV = null; anteprima = null; A.salva(); aggiorna(); };
      const menuContestuale = (px, py, e) => {
        chiudiMenu();
        if (e) { sel = e.id; selV = null; pannelloAgg(); disegna(); }
        const voci = e ? [['Duplica', () => duplica(e)], ['Elimina', () => { sel = e.id; elimina(); }], ['Lavorazioni e quote', () => { radice.classList.add('pannello-aperto'); aggiorna(); }]]
          : [['Adatta alla vista', () => { adatta(); disegna(); }], ['Digita un punto', () => apriDigita()], [S.snap ? 'Aggancio: spegni' : 'Aggancio: accendi', () => { S.snap = !S.snap; A.salva(); aggiorna(); }]];
        menuEl = el('div', { class: 'cad-menu', role: 'menu', 'aria-label': e ? 'Menu dell\'elemento' : 'Menu del disegno' }, voci.map(([t, fn]) => el('button', { class: 'cad-menu-voce', role: 'menuitem', testo: t, onclick: ev => { ev.stopPropagation(); chiudiMenu(); fn(); } })));
        const box = cv.parentNode; box.appendChild(menuEl);
        const W = box.clientWidth, H = box.clientHeight, mw = menuEl.offsetWidth || 190, mh = menuEl.offsetHeight || voci.length * 56;
        menuEl.style.left = Math.max(6, Math.min(W - mw - 6, px - mw / 2)) + 'px';
        menuEl.style.top = Math.max(6, Math.min(H - mh - 6, py - mh - 30 < 6 ? py + 30 : py - mh - 30)) + 'px';
        A.vibra && A.vibra(15);
      };

      // ----- annulla / ripeti / elimina -----
      const annulla = () => {
        if (arco && arco.punti.length) { arco.punti.pop(); if (!arco.punti.length) arco = null; chiudiDigitaSeRaggio(); statoBarra(); disegna(); return; }
        if (nuova && nuova.punti.length) { nuova.punti.pop(); if (!nuova.punti.length) nuova = null; statoBarra(); pannelloAgg(); disegna(); return; }
        if (!storia.length) return;
        futuro.push(JSON.stringify(S.entita)); S.entita = JSON.parse(storia.pop()); if (!trovaE(sel)) { sel = null; selV = null; } anteprima = null; A.salva(); aggiorna();
      };
      const ripeti = () => { if (!futuro.length) return; storia.push(JSON.stringify(S.entita)); S.entita = JSON.parse(futuro.pop()); if (!trovaE(sel)) { sel = null; selV = null; } anteprima = null; A.salva(); aggiorna(); };
      const elimina = () => { const e = trovaE(sel); if (!e) return; ricorda(); S.entita = S.entita.filter(x => x.id !== e.id); sel = null; selV = null; anteprima = null; A.salva(); aggiorna(); };

      // ----- inserimento numerico: tastierino con espressioni, assolute, incrementali, polari -----
      let digitaBox = null;
      const chiudiDigita = () => { if (digitaBox) { digitaBox.remove(); digitaBox = null; mirino = null; disegna(); } };
      const chiudiDigitaSeRaggio = () => { if (digitaBox && digitaBox.dataset.tipo === 'raggio') chiudiDigita(); };
      const ultimoPunto = () => nuova && nuova.punti.length ? { x: num(nuova.punti[nuova.punti.length - 1].x), y: num(nuova.punti[nuova.punti.length - 1].y) } : tratto ? { x: tratto.x, y: tratto.y } : arco && arco.punti.length ? arco.punti[arco.punti.length - 1] : null;
      /** Cosa si aspetta lo strumento adesso: {titolo, aiuto, tipo:'punto'|'misura'|'raggio'}. */
      const attesa = () => {
        const st = S.strum, n = arco ? arco.punti.length : 0;
        if (digitaBox && digitaBox.dataset.tipo === 'raggio') return { titolo: 'Raggio dell\'arco', aiuto: 'Un numero (anche 50/2); poi scegli arco piccolo o grande', tipo: 'raggio' };
        if (st === 'punto') return { titolo: 'Foro: dove?', aiuto: '50; 30  ·  @10; 5 dall\'ultimo punto  ·  @20<45 polare', tipo: 'punto' };
        if (st === 'poli') return { titolo: 'Punto ' + ((nuova ? nuova.punti.length : 0) + 1) + ' del profilo', aiuto: '50; 30  ·  @10; 5 (relativo)  ·  @20<45 (lunghezza<angolo)', tipo: 'punto' };
        if (st === 'rett') return tratto ? { titolo: 'Angolo opposto', aiuto: 'Un punto (50; 30, @40; 30) oppure le misure 40x30', tipo: 'punto', misure: true } : { titolo: 'Primo angolo', aiuto: '0; 0  ·  @10; 5  ·  espressioni, per esempio 50/2; 10+5', tipo: 'punto' };
        if (st === 'cerchio') return tratto ? { titolo: 'Raggio', aiuto: 'Il raggio (25/2), oppure d20 per il diametro, oppure un punto', tipo: 'punto', raggio: true } : { titolo: 'Centro del cerchio', aiuto: '40; 25  ·  @10; 0', tipo: 'punto' };
        if (st === 'asola') return { titolo: tratto ? 'Centro finale' : 'Centro iniziale', aiuto: '20; 10  ·  @30; 0 (relativo)', tipo: 'punto' };
        if (st === 'poligono') return tratto ? { titolo: 'Raggio (' + S.latiPol + ' lati)', aiuto: 'Il raggio dal centro ai vertici, oppure un punto', tipo: 'punto', raggio: true } : { titolo: 'Centro del poligono', aiuto: '40; 25', tipo: 'punto' };
        if (st === 'arco') return { titolo: S.arcoModo === '3p' ? ['Inizio dell\'arco', 'Un punto sull\'arco', 'Fine dell\'arco'][n] : S.arcoModo === 'cif' ? ['Centro dell\'arco', 'Punto iniziale', 'Punto finale'][n] : ['Inizio dell\'arco', 'Fine dell\'arco'][n], aiuto: '50; 30  ·  @10; 5  ·  @20<45', tipo: 'punto' };
        if (sel && selV !== null) return { titolo: 'Sposta il punto scelto', aiuto: '50; 30  ·  @1; 0 (relativo al punto)', tipo: 'sposta' };
        return { titolo: 'Scegli uno strumento', aiuto: 'Poi scrivi qui il punto', tipo: 'niente' };
      };
      const daTesto = (testo, o) => {
        const att = attesa(), ref = ultimoPunto();
        if (att.tipo === 'raggio') {
          const r = O.espressione(testo); if (!(r > 0)) return { errore: 'Il raggio deve essere un numero positivo' };
          arcoAggiungi(null, r, !!o.grande); return { ok: true };
        }
        if (att.tipo === 'niente') return { errore: att.aiuto };
        const t = String(testo).trim();
        if (att.misure && tratto && /^[^x]+x[^x]+$/i.test(t.replace(/\s+/g, ''))) {
          const [a, b] = t.replace(/\s+/g, '').toLowerCase().split('x'), L = O.espressione(a), H = O.espressione(b);
          if (!isFinite(L) || !isFinite(H) || !L || !H) return { errore: 'Misure non valide: scrivi, per esempio, 40x30' };
          return finisciPunto({ x: R3(tratto.x + L), y: R3(tratto.y + H) });
        }
        if (att.raggio && tratto) {
          const d = /^[dDØø]\s*/.test(t); const v = O.espressione(d ? t.replace(/^[dDØø]\s*/, '') : t);
          if (isFinite(v) && !/[;<@]/.test(t)) { const r = d ? v / 2 : v; if (!(r > 0)) return { errore: 'Il raggio deve essere positivo' }; return finisciPunto({ x: R3(tratto.x + r), y: tratto.y }); }
        }
        const p = O.puntoDaTesto(t, ref || { x: 0, y: 0 });
        if (p.errore) return p;
        if (att.tipo === 'sposta') { const e = trovaE(sel), h = e && maniglie(e).find(q => q.i === selV); if (!e || !h) return { errore: 'Scegli prima un punto' }; const q = O.puntoDaTesto(t, { x: h.x, y: h.y }); if (q.errore) return q; ricorda(); sposta(e, h, q.x, q.y); anteprima = null; A.salva(); aggiorna(); return { ok: true }; }
        return finisciPunto(p);
      };
      /** Mette un punto scritto a mano come se fosse toccato: stessa strada del dito. */
      const finisciPunto = w => {
        const st = S.strum;
        if (st === 'punto') { nuovaE({ tipo: 'punto', x: w.x, y: w.y }); return { ok: true }; }
        if (st === 'poli') { nuova = nuova || { punti: [] }; nuova.punti.push({ x: w.x, y: w.y }); statoBarra(); pannelloAgg(); disegna(); return { ok: true }; }
        if (st === 'arco') { arcoAggiungi(w); return { ok: true }; }
        if (st === 'rett' || st === 'cerchio' || st === 'asola' || st === 'poligono') {
          if (!tratto) { tratto = { tipo: st, x: w.x, y: w.y, fermo: true }; statoBarra(); disegna(); return { ok: true }; }
          const a = tratto; tratto = null;
          if (st === 'rett') { if (Math.abs(w.x - a.x) < 0.01 || Math.abs(w.y - a.y) < 0.01) { tratto = a; return { errore: 'Larghezza e altezza devono essere diverse da zero' }; } nuovaE({ tipo: 'rett', x0: Math.min(a.x, w.x), y0: Math.min(a.y, w.y), x1: Math.max(a.x, w.x), y1: Math.max(a.y, w.y), r: 0 }); }
          else if (st === 'cerchio') { const r = R3(Math.hypot(w.x - a.x, w.y - a.y)); if (r < 0.05) { tratto = a; return { errore: 'Il raggio e troppo piccolo' }; } nuovaE({ tipo: 'cerchio', cx: a.x, cy: a.y, r }); }
          else if (st === 'poligono') { if (!creaPoligono(a, w)) { tratto = a; return { errore: 'Il raggio e troppo piccolo' }; } }
          else { if (Math.hypot(w.x - a.x, w.y - a.y) < 0.05) { tratto = a; return { errore: 'I due centri sono uguali' }; } nuovaE({ tipo: 'asola', x1: a.x, y1: a.y, x2: w.x, y2: w.y, w: 8 }); }
          return { ok: true };
        }
        return { errore: 'Scegli uno strumento di disegno' };
      };
      const apriDigita = (tipo) => {
        if (digitaBox) chiudiDigita();
        let testo = '', grande = false;
        const box = el('div', { class: 'cad-digita', role: 'dialog', 'aria-label': 'Inserimento numerico' });
        if (tipo) box.dataset.tipo = tipo;
        const tit = el('div', { class: 'cad-dg-tit' }), aiuto = el('div', { class: 'cad-dg-aiuto' }), campo = el('div', { class: 'cad-dg-campo', 'aria-live': 'polite' }), prev = el('div', { class: 'cad-dg-prev', 'aria-live': 'polite' });
        const extra = el('div', { class: 'chips cad-dg-extra' });
        const aggiornaDg = () => {
          const att = attesa();
          tit.textContent = att.titolo; aiuto.textContent = att.aiuto; campo.textContent = testo || ' '; mostraAz();
          extra.innerHTML = '';
          if (att.tipo === 'raggio') {
            extra.append(el('button', { class: 'chip' + (!grande ? ' attiva' : ''), testo: 'Arco piccolo', onclick: () => { grande = false; aggiornaDg(); } }), el('button', { class: 'chip' + (grande ? ' attiva' : ''), testo: 'Arco grande', onclick: () => { grande = true; aggiornaDg(); } }),
              el('button', { class: 'chip', testo: S.arcoOrario ? 'Orario' : 'Antiorario', onclick: () => { S.arcoOrario = !S.arcoOrario; A.salva(); aggiornaDg(); } }));
          }
          // anteprima del punto
          prev.classList.remove('errore');
          if (!testo.trim()) { prev.textContent = ''; mirino = null; disegna(); return; }
          if (att.tipo === 'raggio' || (att.raggio && !/[;<@,]/.test(testo))) { const d = /^[dDØø]/.test(testo.trim()); const v = O.espressione(testo.trim().replace(/^[dDØø]\s*/, '')); prev.textContent = isFinite(v) ? (d ? 'Diametro ' + fmt(v, 3) + ' → raggio ' + fmt(v / 2, 3) : 'Raggio ' + fmt(v, 3)) : 'Scrivi un numero'; prev.classList.toggle('errore', !isFinite(v)); return; }
          if (att.misure && /^[^x;<@,]+x[^x]+$/i.test(testo.replace(/\s+/g, ''))) { prev.textContent = 'Misure ' + testo.replace(/\s+/g, ''); return; }
          const ref = att.tipo === 'sposta' ? (() => { const e = trovaE(sel), h = e && maniglie(e).find(q => q.i === selV); return h ? { x: h.x, y: h.y } : null; })() : ultimoPunto();
          const p = O.puntoDaTesto(testo, ref || { x: 0, y: 0 });
          if (p.errore) { prev.textContent = p.errore; prev.classList.add('errore'); mirino = null; disegna(); return; }
          prev.textContent = 'X ' + fmt(p.x, 3) + '   Y ' + fmt(p.y, 3) + '  (' + p.tipo + ')';
          mirino = { x: p.x, y: p.y, tipo: 'griglia' }; disegna();
        };
        const premi = t => { A.vibra && A.vibra(5); if (t === '⌫') testo = testo.slice(0, -1); else if (t === 'C') testo = ''; else testo += t; aggiornaDg(); };
        const TASTI = [['7', '8', '9', '/', '⌫'], ['4', '5', '6', '*', 'C'], ['1', '2', '3', '-', '('], ['0', ',', ';', '+', ')'], ['@', '<', '^', 'x', 'pi']];
        const griglia = el('div', { class: 'cad-dg-tasti' }, [].concat(...TASTI).map(t => el('button', { class: 'cad-dg-k' + (/[0-9]/.test(t) ? ' num' : ''), type: 'button', 'aria-label': t === '⌫' ? 'Cancella' : t === 'C' ? 'Cancella tutto' : t === 'sqrt(' ? 'radice' : t, testo: t === 'sqrt(' ? '√(' : t, onclick: () => premi(t) })));
        const ok = () => {
          const r = daTesto(testo, { grande });
          if (r.errore) { prev.textContent = r.errore; prev.classList.add('errore'); A.vibra && A.vibra(25); return; }
          testo = ''; mirino = null;
          if (box.dataset.tipo === 'raggio') { box.remove(); digitaBox = null; disegna(); return; }
          aggiornaDg(); disegna();
        };
        const azioniDg = el('div', { class: 'cad-dg-az' }, [
          el('button', { class: 'chip', id: 'cad-dg-annulla', testo: 'Annulla', onclick: () => { annulla(); aggiornaDg(); } }),
          el('button', { class: 'chip', id: 'cad-dg-fine', testo: 'Fine profilo', onclick: () => { chiudiProfilo(false); aggiornaDg(); } }),
          el('button', { class: 'chip', id: 'cad-dg-chiudi', testo: 'Chiudi profilo', onclick: () => { chiudiProfilo(true); aggiornaDg(); } })]);
        const mostraAz = () => { const inProfilo = !!(nuova && nuova.punti.length); azioniDg.querySelector('#cad-dg-fine').hidden = azioniDg.querySelector('#cad-dg-chiudi').hidden = !inProfilo; azioniDg.querySelector('#cad-dg-chiudi').disabled = !(nuova && nuova.punti.length > 2); };
        box.append(el('div', { class: 'cad-dg-testa' }, [tit, el('button', { class: 'icona-pul', 'aria-label': 'Chiudi l\'inserimento numerico', testo: '✕', onclick: chiudiDigita })]), aiuto, campo, prev, extra, griglia, azioniDg,
          el('button', { class: 'pul cad-dg-ok', id: 'cad-dg-ok', testo: 'OK', onclick: ok }));
        digitaBox = box; radice.appendChild(box);
        aggiornaDg();
      };
      promptRaggio = () => apriDigita('raggio');

      // ----- barra degli strumenti e delle azioni -----
      const icoSvg = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
      STRUM.forEach(([id, nome, d]) => barra.appendChild(el('button', { class: 'cad-b', 'data-strum': id, 'aria-label': nome, title: nome, html: icoSvg(d) + '<span>' + nome + '</span>', onclick: () => {
        if (nuova) chiudiProfilo(false);
        arco = null; chiudiDigita();
        S.strum = id; tratto = null; A.salva(); if (id !== 'sel') { sel = null; selV = null; } aggiorna();
      } })));
      const bUndo = el('button', { class: 'cad-b', id: 'cad-annulla', 'aria-label': 'Annulla', html: icoSvg('<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12"/>') + '<span>Annulla</span>', onclick: annulla });
      const bRedo = el('button', { class: 'cad-b', id: 'cad-ripeti', 'aria-label': 'Ripeti', html: icoSvg('<path d="M15 7l5 5-5 5"/><path d="M20 12H10a6 6 0 0 0 0 12"/>') + '<span>Ripeti</span>', onclick: ripeti });
      const bFine = el('button', { class: 'cad-b cad-fine', id: 'cad-fine', 'aria-label': 'Fine del profilo', html: icoSvg('<path d="M5 13l4 4L19 7"/>') + '<span>Fine</span>', onclick: () => chiudiProfilo(false) });
      const bChiudi = el('button', { class: 'cad-b cad-fine', id: 'cad-chiudi', 'aria-label': 'Chiudi il profilo', html: icoSvg('<path d="M5 5h14v14H5z"/>') + '<span>Chiudi</span>', onclick: () => chiudiProfilo(true) });
      const bAdatta = el('button', { class: 'cad-b', id: 'cad-adatta', 'aria-label': 'Adatta alla vista', html: icoSvg('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>') + '<span>Adatta</span>', onclick: () => { adatta(); disegna(); } });
      const bPieno = el('button', { class: 'cad-b', id: 'cad-pieno', 'aria-label': 'Schermo intero', html: icoSvg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>') + '<span>Schermo intero</span>', onclick: () => { const on = A.schermoPieno(radice, () => { disegna(); }); radice.classList.remove('pannello-aperto'); bPieno.querySelector('span').textContent = on ? 'Esci' : 'Schermo intero'; } });
      const bRuota = el('button', { class: 'cad-b cad-solopieno', id: 'cad-ruota', 'aria-label': 'Ruota lo schermo', html: icoSvg('<path d="M20 12a8 8 0 1 1-3-6.2M20 4v5h-5"/>') + '<span>Ruota</span>', onclick: () => { const o = A.ruotaSchermo(() => { disegna(); }); bRuota.querySelector('span').textContent = o === 'libero' ? 'Ruota' : o === 'orizzontale' ? 'Orizzontale' : 'Verticale'; } });
      const bSnap = el('button', { class: 'cad-b', id: 'cad-snap', 'aria-label': 'Aggancio', html: icoSvg('<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="4"/>') + '<span>Aggancio</span>', onclick: () => { S.snap = !S.snap; A.salva(); aggiorna(); } });
      const bMir = el('button', { class: 'cad-b', id: 'cad-mirino', 'aria-label': 'Mirino sopra il dito', html: icoSvg('<circle cx="12" cy="9" r="5"/><path d="M12 14v7"/>') + '<span>Mirino</span>', onclick: () => { S.mirino = !S.mirino; A.salva(); aggiorna(); } });
      const bPan = el('button', { class: 'cad-b cad-solopieno', id: 'cad-pannello-b', 'aria-label': 'Apri o chiudi il pannello', html: icoSvg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>') + '<span>Pannello</span>', onclick: () => radice.classList.toggle('pannello-aperto') });
      const bDigita = el('button', { class: 'cad-b', id: 'cad-digita', 'aria-label': 'Scrivi le coordinate con il tastierino', html: icoSvg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>') + '<span>Digita</span>', onclick: () => (digitaBox ? chiudiDigita() : apriDigita()) });
      azioni.append(bUndo, bRedo, bDigita, bFine, bChiudi, bAdatta, bSnap, bMir, bPan, bRuota, bPieno);

      // ----- pannello: lavorazioni dell'entita scelta, dati del pezzo, crea -----
      const OP_TESTO = { contorno: ['Contorno', 'Taglia lungo la linea con G41/G42'], tasca: ['Tasca', 'Svuota l\'interno'], foro: ['Foro', 'Centrino, punta e smusso'], maschio: ['Maschio', 'Foro filettato'], alesato: ['Alesato', 'Foro con alesatore'], asola: ['Asola', 'Fresa a spirale lungo la linea'] };
      function nuovaLav(e, op) {
        const l = { op };
        if (op === 'contorno') { l.prof = Number(S.fz) > 0 ? num(S.fz) : 10; l.lato = e.tipo === 'poli' && !e.chiuso ? 'sinistra' : 'esterno'; }
        else if (op === 'tasca') l.prof = Math.min(6, num(S.fz) || 6);
        else if (op === 'asola') l.prof = Math.min(5, num(S.fz) || 5);
        else if (op === 'maschio') { l.passante = true; l.passo = String(O.passoGrosso(e.tipo === 'cerchio' ? 2 * e.r : 8) || 1.25); }
        else { l.passante = true; if (e.tipo === 'punto') l.d = 6.8; }
        return l;
      }
      const pannelloAgg = () => {
        pannello.innerHTML = '';
        pannello.appendChild(el('button', { class: 'pul sec cad-solopieno', id: 'cad-chiudi-pannello', testo: 'Chiudi il pannello', onclick: () => radice.classList.remove('pannello-aperto') }));
        // dati del pezzo
        const p0 = el('div', { class: 'pannello' });
        A.modulo(p0, [{ id: 'fz', et: 'Spessore del pezzo', sub: 'Z0 e sulla faccia superiore', u: 'mm' }, { id: 'mat', et: 'Materiale', tipo: 'scelta', scelte: () => A.sceltaMateriali() }], S, () => { anteprima = null; A.salva(); });
        if (nuova) { pannello.append(A.info('<b>Profilo in costruzione</b>: ' + nuova.punti.length + ' punti. Tocca per aggiungere; <b>Chiudi</b> collega all\'inizio, <b>Fine</b> lo lascia aperto.')); }
        const e = trovaE(sel);
        if (e && radice.classList.contains('pieno') && !nuova) radice.classList.add('pannello-aperto');
        if (!e) {
          pannello.appendChild(A.info(S.strum === 'sel' ? '<b>Tocca un disegno</b> per sceglierlo e dargli le lavorazioni. <b>Trascina</b> le maniglie per correggerlo. <b>Due dita</b>: zoom e spostamento; un tocco con due dita annulla, con tre ripete.' : 'Tocca (o trascina) per disegnare: il mirino sta sopra il dito e il punto si mette quando lo alzi. Per rettangolo, cerchio e asola: trascina dal primo punto al secondo, oppure tocca due volte.'));
        } else mostraEntita(e);
        pannello.append(el('div', { class: 'sez', testo: 'Pezzo' }), p0);
        // elenco di tutti gli elementi
        pannello.append(el('div', { class: 'sez', testo: 'Elementi (' + S.entita.length + ')' }));
        const el0 = el('div', { class: 'elenco-linee' });
        if (!S.entita.length) el0.appendChild(el('div', { class: 'vuoto', testo: 'Il disegno e vuoto: scegli uno strumento e disegna.' }));
        S.entita.forEach((x, k) => el0.appendChild(el('div', { class: 'linea-riga' + (x.id === sel ? ' attiva' : '') }, [
          el('button', { class: 'linea-testo', onclick: () => { S.strum = 'sel'; sel = x.id; selV = null; aggiorna(); } }, [el('span', { testo: (k + 1) + '. ' + NOME_E[x.tipo] + ' ' + (x.lav && x.lav.length ? '· ' + x.lav.map(l => O.CAD_NOMI_LAV[l.op]).join(' + ') : '· senza lavorazione') })]),
          el('button', { class: 'icona-pul', 'aria-label': 'Elimina ' + NOME_E[x.tipo] + ' ' + (k + 1), html: A.icona('cestino'), onclick: () => { ricorda(); S.entita = S.entita.filter(y => y.id !== x.id); if (sel === x.id) sel = null; anteprima = null; A.salva(); aggiorna(); } })])));
        pannello.appendChild(el0);
        // crea
        const msg = el('div', { id: 'cad-msg' });
        pannello.append(msg, el('div', { class: 'pulsanti' }, [
          el('button', { class: 'pul sec', id: 'cad-percorso', html: A.icona('modifica') + 'Mostra il percorso', onclick: () => calcola(false, msg) }),
          el('button', { class: 'pul', id: 'cad-crea', html: A.icona('codice') + 'Crea il programma', onclick: () => calcola(true, msg) })]));
        pannello.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', testo: 'Carica un disegno di prova', onclick: () => { ricorda(); S.entita = ESEMPIO(); S.prossimo = 10; sel = null; anteprima = null; adattato = false; A.salva(); aggiorna(); adatta(); disegna(); } })]));
      };
      /** Il pannello dell'entita scelta: dati, punti, lavorazioni. */
      const mostraEntita = e => {
        const box = el('div', { class: 'cad-ent' });
        pannello.appendChild(box);
        box.appendChild(el('div', { class: 'sez', testo: NOME_E[e.tipo] + ' ' + (S.entita.indexOf(e) + 1) }));
        // quote
        const v = {};
        const campi = [];
        const campo = (id, et, valore, u, aggiorna2) => { v[id] = String(valore === undefined ? '' : R3(valore)); campi.push({ id, et, u: u || 'mm', _agg: aggiorna2 }); };
        if (e.tipo === 'rett') { campo('x0', 'X sinistra', e.x0, 'mm', x => { e.x0 = x; }); campo('y0', 'Y sotto', e.y0, 'mm', x => { e.y0 = x; }); campo('x1', 'X destra', e.x1, 'mm', x => { e.x1 = x; }); campo('y1', 'Y sopra', e.y1, 'mm', x => { e.y1 = x; }); campo('r', 'Raggio degli angoli', e.r || 0, 'R', x => { e.r = Math.max(0, x); }); }
        else if (e.tipo === 'cerchio') { campo('cx', 'Centro X', e.cx, 'mm', x => { e.cx = x; }); campo('cy', 'Centro Y', e.cy, 'mm', x => { e.cy = x; }); campo('dd', 'Diametro Ø', e.r * 2, 'mm', x => { if (x > 0) e.r = x / 2; }); }
        else if (e.tipo === 'punto') { campo('x', 'X', e.x, 'mm', x => { e.x = x; }); campo('y', 'Y', e.y, 'mm', x => { e.y = x; }); }
        else if (e.tipo === 'asola') { campo('x1', 'Centro iniziale X', e.x1, 'mm', x => { e.x1 = x; }); campo('y1', 'Centro iniziale Y', e.y1, 'mm', x => { e.y1 = x; }); campo('x2', 'Centro finale X', e.x2, 'mm', x => { e.x2 = x; }); campo('y2', 'Centro finale Y', e.y2, 'mm', x => { e.y2 = x; }); campo('w', 'Larghezza', e.w, 'mm', x => { if (x > 0) e.w = x; }); }
        if (campi.length) {
          const pan = el('div', { class: 'pannello' }); box.appendChild(pan);
          A.modulo(pan, campi.map(c => ({ id: c.id, et: c.et, u: c.u })), v, id => { const c = campi.find(q => q.id === id), n = num(v[id]); if (isFinite(n) && c._agg) { ricorda(); c._agg(n); anteprima = null; A.salva(); disegna(); } });
        }
        if (e.tipo === 'poli') mostraProfilo(e, box);
        // spostamento fine con le frecce
        const passi = ['0.1', '1', '10'];
        S.passoFreccia = passi.includes(S.passoFreccia) ? S.passoFreccia : '1';
        const mv = (dx, dy) => { ricorda(); const p = num(S.passoFreccia); const h = selV !== null && e.tipo !== 'asola' ? maniglie(e).find(q => q.i === selV) : null; if (h && (e.tipo === 'poli' || e.tipo === 'rett')) sposta(e, h, R3(h.x + dx * p), R3(h.y + dy * p)); else muoviTutto(e, dx * p, dy * p); anteprima = null; A.salva(); aggiorna(); };
        box.appendChild(el('div', { class: 'cad-frecce' }, [
          el('span', { class: 'leggenda', style: 'margin:0', testo: selV !== null && (e.tipo === 'poli' || e.tipo === 'rett') ? 'Sposta il punto scelto di' : 'Sposta di' }),
          el('div', { class: 'chips' }, passi.map(p => el('button', { class: 'chip' + (S.passoFreccia === p ? ' attiva' : ''), testo: p.replace('.', ',') + ' mm', onclick: () => { S.passoFreccia = p; A.salva(); aggiorna(); } }))),
          el('div', { class: 'cad-d' }, [el('button', { class: 'icona-pul', 'aria-label': 'Su', html: '▲', onclick: () => mv(0, 1) }), el('button', { class: 'icona-pul', 'aria-label': 'Sinistra', html: '◀', onclick: () => mv(-1, 0) }),
            el('button', { class: 'icona-pul', 'aria-label': 'Giu', html: '▼', onclick: () => mv(0, -1) }), el('button', { class: 'icona-pul', 'aria-label': 'Destra', html: '▶', onclick: () => mv(1, 0) })])]));
        // lavorazioni
        box.appendChild(el('div', { class: 'sez', testo: 'Lavorazioni' }));
        (e.lav || []).forEach((l, i) => box.appendChild(editLav(e, l, i)));
        const possibili = O.CAD_LAVORAZIONI[e.tipo].filter(op => op === 'asola' || !(e.lav || []).some(l => l.op === op));
        const aggiungi = el('div', { class: 'cad-aggiungi' }, possibili.map(op => el('button', { class: 'cad-op', 'data-op': op, onclick: () => { ricorda(); (e.lav = e.lav || []).push(nuovaLav(e, op)); anteprima = null; A.salva(); aggiorna(); } }, [el('b', { testo: '+ ' + OP_TESTO[op][0] }), el('small', { testo: OP_TESTO[op][1] })])));
        box.appendChild(aggiungi);
        box.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul peric', id: 'cad-elimina', html: A.icona('cestino') + 'Elimina', onclick: elimina })]));
      };
      const mostraProfilo = (e, box) => {
        if (selV === null || !e.punti[selV]) { box.appendChild(el('p', { class: 'leggenda', testo: 'Tocca una maniglia per scegliere un punto: raggio, smusso e arco.' })); return; }
        const p = e.punti[selV];
        const pan = el('div', { class: 'pannello' });
        const metti = (k, val) => { ricorda(); delete p.smusso; delete p.raccordo; if (k) p[k] = val; anteprima = null; A.salva(); aggiorna(); };
        box.append(el('div', { class: 'sez', testo: 'Punto ' + (selV + 1) + ': spigolo' }), el('div', { class: 'chips' }, [['C0.5', 'smusso', '0.5'], ['C1', 'smusso', '1'], ['C2', 'smusso', '2'], ['R1', 'raccordo', '1'], ['R2', 'raccordo', '2'], ['R5', 'raccordo', '5'], ['Vivo', null, null]]
          .map(([t, k, val]) => el('button', { class: 'chip' + ((k && String(p[k]) === val) || (!k && !(num(p.smusso) > 0) && !(num(p.raccordo) > 0)) ? ' attiva' : ''), testo: t, onclick: () => metti(k, val) }))), pan);
        const v = { x: String(p.x), y: String(p.y), tratto: p.tratto || 'retta', r: p.r || '', raccordo: p.raccordo || '', smusso: p.smusso || '' };
        A.modulo(pan, [{ id: 'x', et: 'X', u: 'mm' }, { id: 'y', et: 'Y', u: 'mm' }, { id: 'tratto', et: 'Ci si arriva con', tipo: 'scelta', scelte: [['retta', 'una retta'], ['cw', 'un arco G2 (orario)'], ['ccw', 'un arco G3 (antiorario)']] },
          { id: 'r', et: 'Raggio dell\'arco', u: 'mm', se: q => q.tratto === 'cw' || q.tratto === 'ccw' }, { id: 'raccordo', et: 'Raccordo', u: 'R' }, { id: 'smusso', et: 'Smusso', u: 'C' }], v, id => {
          ricorda();
          p.x = num(v.x); p.y = num(v.y); p.tratto = v.tratto; p.r = num(v.r) || 0; p.raccordo = num(v.raccordo) || 0; p.smusso = num(v.smusso) || 0;
          anteprima = null; A.salva(); if (id === 'tratto') aggiorna(); else disegna();
        });
        const ultimo = e.punti.length > 2;
        box.appendChild(el('div', { class: 'pulsanti' }, [
          el('button', { class: 'pul sec', html: A.icona('piu') + 'Punto dopo', onclick: () => { ricorda(); const q = e.punti[selV + 1] || e.punti[0]; e.punti.splice(selV + 1, 0, { x: R3((num(p.x) + num(q.x)) / 2), y: R3((num(p.y) + num(q.y)) / 2) }); selV++; anteprima = null; A.salva(); aggiorna(); } }),
          el('button', { class: 'pul peric', html: A.icona('cestino') + 'Togli il punto', onclick: () => { if (!ultimo) { A.avviso('Servono almeno due punti'); return; } ricorda(); e.punti.splice(selV, 1); selV = null; anteprima = null; A.salva(); aggiorna(); } })]));
        box.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', testo: e.chiuso ? 'Rendi aperto' : 'Rendi chiuso', onclick: () => { ricorda(); e.chiuso = !e.chiuso; anteprima = null; A.salva(); aggiorna(); } })]));
      };
      const editLav = (e, l, i) => {
        const casella = el('div', { class: 'cad-lav ' + l.op });
        const testa = el('div', { class: 'cad-lav-testa' }, [el('b', { testo: O.CAD_NOMI_LAV[l.op] }), el('button', { class: 'icona-pul', 'aria-label': 'Togli la lavorazione ' + O.CAD_NOMI_LAV[l.op], html: A.icona('cestino'), onclick: () => { ricorda(); e.lav.splice(i, 1); anteprima = null; A.salva(); aggiorna(); } })]);
        const v = { prof: l.prof === undefined ? '' : String(l.prof), lato: l.lato || 'esterno', d: l.d === undefined ? '' : String(l.d), passante: !!l.passante, passo: l.passo || '', toll: l.toll || '', smusso: l.smusso === undefined ? '' : String(l.smusso) };
        const campi = [];
        if (l.op === 'contorno') {
          const aperto = e.tipo === 'poli' && !e.chiuso;
          campi.push({ id: 'lato', et: 'Fresa', tipo: 'scelta', scelte: aperto ? [['sinistra', 'A sinistra della linea (G41)'], ['destra', 'A destra della linea (G42)'], ['centro', 'Sulla linea, senza compensazione']] : [['esterno', 'Fuori dal disegno (il pezzo e dentro)'], ['interno', 'Dentro il disegno'], ['centro', 'Sulla linea, senza compensazione']] },
            { id: 'prof', et: 'Profondita', u: 'mm' }, { id: 'd', et: 'Diametro fresa', sub: 'vuoto = scelta dalla tabella utensili', u: 'mm' });
        } else if (l.op === 'tasca') campi.push({ id: 'prof', et: 'Profondita', u: 'mm' }, { id: 'd', et: 'Diametro fresa', sub: 'vuoto = la piu grande che ci sta', u: 'mm' });
        else if (l.op === 'asola') campi.push({ id: 'prof', et: 'Profondita', u: 'mm' }, { id: 'd', et: 'Diametro fresa', sub: 'vuoto = dalla tabella', u: 'mm' });
        else {
          if (e.tipo === 'punto') campi.push({ id: 'd', et: l.op === 'maschio' ? 'Diametro del filetto' : 'Diametro del foro', u: 'mm' });
          campi.push({ id: 'passante', et: 'Foro passante', tipo: 'spunta' }, { id: 'prof', et: 'Profondita', sub: 'se non e passante', u: 'mm', se: q => !q.passante });
          if (l.op === 'maschio') campi.push({ id: 'passo', et: 'Passo', u: 'mm' });
          if (l.op === 'alesato') campi.push({ id: 'toll', et: 'Tolleranza', sub: 'es. H7', tipo: 'testo' });
          campi.push({ id: 'smusso', et: 'Smusso all\'imbocco', sub: 'vuoto = automatico', u: 'mm' });
        }
        A.modulo(casella, campi, v, id => {
          ricorda();
          if ('lato' in v && l.op === 'contorno') l.lato = v.lato;
          l.prof = v.prof === '' ? undefined : num(v.prof);
          l.d = v.d === '' ? undefined : num(v.d);
          if (campi.some(c => c.id === 'passante')) l.passante = !!v.passante;
          if (campi.some(c => c.id === 'passo')) l.passo = v.passo;
          if (campi.some(c => c.id === 'toll')) l.toll = v.toll;
          if (campi.some(c => c.id === 'smusso')) l.smusso = v.smusso === '' ? undefined : num(v.smusso);
          if (e.tipo === 'punto' && /^(foro|maschio|alesato)$/.test(l.op)) S.ultimoForo = JSON.parse(JSON.stringify(l));
          anteprima = null; A.salva(); if (id === 'passante') aggiorna();
        });
        casella.prepend(testa);
        return casella;
      };

      // ----- calcolo del programma -----
      const calcola = (crea, msg) => {
        msg.innerHTML = '';
        const I = A.imp();
        const modello = { fz: num(S.fz), entita: JSON.parse(JSON.stringify(S.entita)).map(e => { e.lav = (e.lav || []).map(l => Object.assign({}, l, { prof: num(l.prof), d: num(l.d), smusso: num(l.smusso), passo: num(l.passo) })); return e; }) };
        const p = O.pianificaCAD(modello, { mat: A.materiale(S.mat || 0), tab: A.tabellaUt ? A.tabellaUt() : [], nmax: I.nmaxFresa, zSic: I.zSic, zR: I.zR, refrig: I.refrig, g43: I.g43 });
        if (p.errore) { msg.appendChild(el('p', { class: 'errore', role: 'alert', testo: p.errore })); return; }
        const r = O.gcodeSequenza(p.fasi, { num: I.numProg, nome: 'DISEGNO', numerare: I.numerare });
        if (r.errore) { msg.appendChild(el('p', { class: 'errore', role: 'alert', testo: r.errore })); return; }
        if (!crea) {
          anteprima = r.percorso; disegna();
          msg.appendChild(A.info('Percorso mostrato sul disegno (' + p.fasi.length + ' lavorazioni, ' + r.righe.length + ' righe). Con <b>Crea il programma</b> lo vedi in simulazione.'));
          if (p.note.length) msg.appendChild(A.info(A.esc(p.note.join(' ')), 'avviso'));
          return;
        }
        A.param.listato = { righe: r.righe, iso: r.righe.slice(), nome: (r.righe[1] || 'O0001').split(' ')[0], tipo: 'fresa', avvisi: p.note.concat(p.fasi.map((f, k) => (k + 1) + '. ' + f.titolo), r.avvisi) };
        A.vai('listato');
      };

      const sub = el('div', { class: 'cad-sub', role: 'group', 'aria-label': 'Opzioni dello strumento' });
      area.insertBefore(sub, area.children[1]);
      const sottoBarra = () => {
        sub.innerHTML = '';
        const chip = (t, on, fn, id) => el('button', { class: 'chip' + (on ? ' attiva' : ''), id, testo: t, onclick: () => { fn(); A.salva(); aggiorna(); } });
        if (S.strum === 'arco') {
          sub.append(...[['3p', 'Tre punti'], ['cif', 'Centro'], ['ifr', 'Raggio']].map(([m, t]) => chip(t, S.arcoModo === m, () => { S.arcoModo = m; arco = null; chiudiDigita(); }, 'cad-arco-' + m)));
          if (S.arcoModo !== '3p') sub.append(chip(S.arcoOrario ? 'Orario' : 'Antiorario', false, () => { S.arcoOrario = !S.arcoOrario; }, 'cad-arco-verso'));
        } else if (S.strum === 'poligono') sub.append(...[3, 4, 5, 6, 8, 10, 12].map(n => chip(n + ' lati', S.latiPol === n, () => { S.latiPol = n; }, 'cad-lati-' + n)));
        sub.hidden = !sub.childNodes.length;
      };
      const statoBarra = () => {
        sottoBarra();
        barra.querySelectorAll('[data-strum]').forEach(b => b.classList.toggle('attiva', b.dataset.strum === S.strum));
        bUndo.disabled = !storia.length && !(nuova && nuova.punti.length); bRedo.disabled = !futuro.length;
        bFine.hidden = bChiudi.hidden = !(nuova && nuova.punti.length); bChiudi.disabled = !(nuova && nuova.punti.length > 2);
        bSnap.classList.toggle('attiva', !!S.snap); bMir.classList.toggle('attiva', !!S.mirino);
        radice.dataset.strum = S.strum;
      };
      const aggiorna = () => { Gc = null; statoBarra(); pannelloAgg(); ridisegna(); };
      A.cadRidisegna = () => { adatta(); disegna(); };
      A.cadStato = { S, vista, get sel() { return sel; }, set sel(v) { sel = v; }, aggiorna, adatta, disegna, nuovaE, X, Y, mondo: mx, calcola: () => { const t = el('div'); calcola(false, t); return t; } };
      aggiorna();
      requestAnimationFrame(() => { adatta(); disegna(); });
    }
  };
  window.addEventListener('resize', () => { if (A.attuale && A.attuale() === 'cad' && A.cadRidisegna) A.cadRidisegna(); });
  window.addEventListener('orientationchange', () => { if (A.attuale && A.attuale() === 'cad' && A.cadRidisegna) setTimeout(A.cadRidisegna, 250); });
})();
