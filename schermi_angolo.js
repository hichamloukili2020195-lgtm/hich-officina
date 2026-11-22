// ===== Hich-Officina: angolo misurato su una foto del pezzo, e la fresa che serve =====
// Si apre la foto, si mettono due punti sul lato di riferimento e due sul lato inclinato (con la lente per la
// precisione); "Aggancia ai bordi" sposta le linee sui bordi veri della foto. L'angolo diventa l'utensile: smussatore,
// fresa a coda di rondine, fresa a V o inclinazione del pezzo, con l'angolo di serie piu vicino.
(function () {
  'use strict';
  const A = window.App, O = A.O, el = A.el, fmt = A.fmt;
  const col = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';

  /** Angolo tra due rette (gradi, 0-90 l'acuto) date da due coppie di punti {x, y}. */
  function angoloTra(a1, a2, b1, b2) {
    const ua = Math.atan2(a2.y - a1.y, a2.x - a1.x), ub = Math.atan2(b2.y - b1.y, b2.x - b1.x);
    let d = Math.abs(ua - ub) * 180 / Math.PI;
    d = d % 180; if (d > 90) d = 180 - d;
    return d;
  }
  /** Gli utensili per l'angolo misurato. cosa = 'fianco' (lato inclinato rispetto al piano) o 'cava' (angolo tra due fianchi). */
  function utensiliPerAngolo(alfa, cosa) {
    const vicino = (v, serie) => serie.reduce((b, s) => (Math.abs(s - v) < Math.abs(b - v) ? s : b), serie[0]);
    const out = [];
    if (cosa === 'cava') {
      const s = vicino(alfa, [60, 90, 120]);
      out.push({ nome: 'Fresa a V / smussatore', angolo: alfa, serie: s, nota: 'angolo incluso della cava' });
      return out;
    }
    const punta = 180 - 2 * alfa;
    if (punta > 0) out.push({ nome: 'Smussatore (angolo di punta)', angolo: punta, serie: vicino(punta, [60, 82, 90, 100, 118, 120, 140]), nota: 'asse della fresa perpendicolare al piano' });
    if (alfa < 89) out.push({ nome: 'Fresa a coda di rondine', angolo: alfa, serie: vicino(alfa, [45, 50, 55, 60, 65, 70]), nota: 'fianco a ' + fmt(alfa, 1) + '° dal fondo' });
    out.push({ nome: 'Inclinare il pezzo (fresa cilindrica)', angolo: alfa, serie: null, nota: 'inclina di ' + fmt(alfa, 1) + '° per fare il fianco con il fondo della fresa, o di ' + fmt(90 - alfa, 1) + '° per farlo con il fianco' });
    return out;
  }
  O.angoloTra = angoloTra;
  O.utensiliPerAngolo = utensiliPerAngolo;

  A.schermi.angolo = {
    titolo: 'Angolo da una foto',
    render(m) {
      const S = A.sezione('angolo');
      S.cosa = S.cosa || 'fianco';
      const st = { img: null, W: 0, H: 0, pti: null, zoom: 1, dx: 0, dy: 0, grad: null };
      A.angoloStato = st;
      const input = el('input', { type: 'file', accept: 'image/*', id: 'f-fotoAngolo', style: 'display:none' });
      const cv = el('canvas', { class: 'vista angolo-tela', 'aria-label': 'Foto del pezzo: trascina i quattro punti sui due lati' });
      const esito = el('div'), pan = el('div', { class: 'pannello' });
      m.append(input, el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>Scatta o scegli la foto', onclick: () => input.click() })]),
        cv, el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', testo: 'Aggancia ai bordi', onclick: () => { if (!st.img) return; aggancia(); disegna(); } }), el('button', { class: 'pul sec', testo: 'Adatta', onclick: () => { st.zoom = 1; st.dx = st.dy = 0; disegna(); } })]),
        pan, esito);
      A.modulo(pan, [{ id: 'cosa', et: 'Cosa misuri', tipo: 'scelta', scelte: [['fianco', 'Un lato inclinato rispetto a un piano (smusso, fianco)'], ['cava', 'L\'angolo tra due fianchi (cava a V)']] }], S, () => calcola());

      // ----- foto -----
      input.addEventListener('change', () => {
        const f = input.files && input.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => { const im = new Image(); im.onload = () => carica(im); im.src = String(r.result); };
        r.readAsDataURL(f);
        input.value = '';
      });
      function carica(im) {
        // si lavora su una copia di al massimo 1400 pixel
        const k = Math.min(1, 1400 / Math.max(im.width, im.height));
        const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const g = c.getContext('2d'); g.drawImage(im, 0, 0, c.width, c.height);
        st.img = c; st.W = c.width; st.H = c.height; st.grad = null; st.zoom = 1; st.dx = st.dy = 0;
        st.pti = [{ x: 0.15 * st.W, y: 0.75 * st.H }, { x: 0.5 * st.W, y: 0.75 * st.H }, { x: 0.55 * st.W, y: 0.75 * st.H }, { x: 0.8 * st.W, y: 0.35 * st.H }];
        disegna(); calcola();
      }
      A.angoloCarica = carica;

      // ----- vista -----
      const vista = () => {
        const W = cv.clientWidth || 340, H = cv.clientHeight || 360;
        const sc0 = Math.min(W / (st.W || 1), H / (st.H || 1)), sc = sc0 * st.zoom;
        const ox = (W - st.W * sc) / 2 + st.dx, oy = (H - st.H * sc) / 2 + st.dy;
        return { W, H, sc, X: x => ox + x * sc, Y: y => oy + y * sc, xDa: px => (px - ox) / sc, yDa: py => (py - oy) / sc };
      };
      let tocco = null;   // punto trascinato: si disegna la lente
      function disegna() {
        const dpr = window.devicePixelRatio || 1, v = vista();
        cv.width = v.W * dpr; cv.height = v.H * dpr;
        const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, v.W, v.H);
        if (!st.img) {
          g.fillStyle = col('--tenue'); g.font = '14px system-ui'; g.textAlign = 'center';
          g.fillText('Scatta la foto del pezzo, dritta e vicina,', v.W / 2, v.H / 2 - 10);
          g.fillText('con i due lati ben visibili', v.W / 2, v.H / 2 + 12);
          return;
        }
        g.drawImage(st.img, v.X(0), v.Y(0), st.W * v.sc, st.H * v.sc);
        const P = st.pti.map(p => [v.X(p.x), v.Y(p.y)]);
        const retta = (a, b, c) => {
          const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, k = 3000 / L;
          g.strokeStyle = c; g.lineWidth = 1; g.setLineDash([6, 5]);
          g.beginPath(); g.moveTo(a[0] - dx * k, a[1] - dy * k); g.lineTo(b[0] + dx * k, b[1] + dy * k); g.stroke(); g.setLineDash([]);
          g.lineWidth = 3; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        };
        retta(P[0], P[1], '#2f8cff'); retta(P[2], P[3], '#ff8a1f');
        P.forEach((p, i) => {
          g.fillStyle = i < 2 ? '#2f8cff' : '#ff8a1f'; g.strokeStyle = '#fff'; g.lineWidth = 2;
          g.beginPath(); g.arc(p[0], p[1], 9, 0, Math.PI * 2); g.fill(); g.stroke();
          g.fillStyle = '#fff'; g.font = '600 10px system-ui'; g.textAlign = 'center'; g.fillText(i < 2 ? 'A' : 'B', p[0], p[1] + 3.5);
        });
        // lente: 4 volte la foto intorno al punto trascinato
        if (tocco !== null) {
          const p = st.pti[tocco], R = 56, k = 4;
          const cx = P[tocco][0] < v.W / 2 ? v.W - R - 8 : R + 8, cy = R + 8;
          g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
          g.drawImage(st.img, p.x - R / (k * v.sc), p.y - R / (k * v.sc), 2 * R / (k * v.sc), 2 * R / (k * v.sc), cx - R, cy - R, 2 * R, 2 * R);
          g.strokeStyle = '#ff3b3b'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
          g.restore(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
        }
      }
      A.angoloDisegna = disegna;

      // ----- tocchi: un dito sposta i punti (il punto resta 40 pixel sopra il dito), due dita zoom -----
      const attivi = new Map();
      let pinch = null, preso = null;
      const pos = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
      cv.addEventListener('pointerdown', e => {
        if (!st.img) return;
        attivi.set(e.pointerId, pos(e));
        try { cv.setPointerCapture(e.pointerId); } catch (x) { /* niente */ }
        const v = vista();
        if (attivi.size === 2) {
          const [a, b] = Array.from(attivi.values());
          pinch = { d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z0: st.zoom, x: v.xDa((a[0] + b[0]) / 2), y: v.yDa((a[1] + b[1]) / 2) };
          preso = null; tocco = null; return;
        }
        const [px, py] = pos(e);
        let k = -1, best = 34;
        st.pti.forEach((p, i) => { const d = Math.hypot(v.X(p.x) - px, v.Y(p.y) - py); if (d < best) { best = d; k = i; } });
        if (k >= 0) { preso = { k, dx: v.X(st.pti[k].x) - px, dy: v.Y(st.pti[k].y) - py }; tocco = k; disegna(); }
      });
      cv.addEventListener('pointermove', e => {
        if (!attivi.has(e.pointerId)) return;
        attivi.set(e.pointerId, pos(e));
        if (pinch && attivi.size === 2) {
          const [a, b] = Array.from(attivi.values());
          st.zoom = Math.max(1, Math.min(12, pinch.z0 * (Math.hypot(a[0] - b[0], a[1] - b[1]) || 1) / pinch.d0));
          const v = vista(), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
          st.dx += mx - v.X(pinch.x); st.dy += my - v.Y(pinch.y);
          disegna(); return;
        }
        if (!preso) return;
        const v = vista(), [px, py] = pos(e);
        st.pti[preso.k] = { x: Math.max(0, Math.min(st.W, v.xDa(px + preso.dx))), y: Math.max(0, Math.min(st.H, v.yDa(py + preso.dy))) };
        disegna(); calcola();
      });
      const lascia = e => { attivi.delete(e.pointerId); if (attivi.size < 2) pinch = null; if (!attivi.size) { preso = null; tocco = null; disegna(); } };
      cv.addEventListener('pointerup', lascia); cv.addEventListener('pointercancel', lascia);
      cv.addEventListener('wheel', e => { if (!st.img) return; e.preventDefault(); const v = vista(), [px, py] = pos(e); const x = v.xDa(px), y = v.yDa(py); st.zoom = Math.max(1, Math.min(12, st.zoom * (e.deltaY < 0 ? 1.25 : 0.8))); const v2 = vista(); st.dx += px - v2.X(x); st.dy += py - v2.Y(y); disegna(); }, { passive: false });

      // ----- aggancio ai bordi: ogni meta della linea si sposta di lato dove il bordo e piu netto -----
      function gradiente() {
        if (st.grad) return st.grad;
        const { W, H } = st, d = st.img.getContext('2d').getImageData(0, 0, W, H).data;
        const lum = new Float32Array(W * H);
        for (let i = 0; i < W * H; i++) lum[i] = 0.299 * d[4 * i] + 0.587 * d[4 * i + 1] + 0.114 * d[4 * i + 2];
        const gr = new Float32Array(W * H);
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          const gx = -lum[i - W - 1] - 2 * lum[i - 1] - lum[i + W - 1] + lum[i - W + 1] + 2 * lum[i + 1] + lum[i + W + 1];
          const gy = -lum[i - W - 1] - 2 * lum[i - W] - lum[i - W + 1] + lum[i + W - 1] + 2 * lum[i + W] + lum[i + W + 1];
          gr[i] = Math.hypot(gx, gy);
        }
        st.grad = gr; return gr;
      }
      function aggancia() {
        const gr = gradiente(), { W, H } = st;
        const val = (x, y) => { const xi = Math.round(x), yi = Math.round(y); return xi < 1 || yi < 1 || xi >= W - 1 || yi >= H - 1 ? 0 : gr[yi * W + xi]; };
        const R = Math.max(6, Math.round(Math.hypot(W, H) * 0.012));
        [[0, 1], [2, 3]].forEach(([i, j]) => {
          for (let giro = 0; giro < 3; giro++) {
            const p = st.pti[i], q = st.pti[j], L = Math.hypot(q.x - p.x, q.y - p.y) || 1;
            const n = { x: -(q.y - p.y) / L, y: (q.x - p.x) / L };
            const meglio = (t0, t1) => {
              let best = 0, bv = -1;
              for (let o = -R; o <= R; o++) {
                let s = 0;
                for (let k = 0; k <= 20; k++) { const t = t0 + (t1 - t0) * k / 20; s += val(p.x + (q.x - p.x) * t + n.x * o, p.y + (q.y - p.y) * t + n.y * o); }
                if (s > bv) { bv = s; best = o; }
              }
              return best;
            };
            const o1 = meglio(0.05, 0.45), o2 = meglio(0.55, 0.95);
            // le due meta danno lo spostamento a un quarto e a tre quarti: si riportano agli estremi
            const e1 = o1 + (o1 - o2) * 0.5, e2 = o2 + (o2 - o1) * 0.5;
            st.pti[i] = { x: p.x + n.x * e1, y: p.y + n.y * e1 };
            st.pti[j] = { x: q.x + n.x * e2, y: q.y + n.y * e2 };
          }
        });
        calcola();
      }
      A.angoloAggancia = aggancia;

      // ----- risultato -----
      function calcola() {
        esito.innerHTML = '';
        if (!st.img || !st.pti) { esito.appendChild(A.info('Metti la linea <b>A</b> (blu) sul lato di riferimento e la linea <b>B</b> (arancione) sul lato inclinato. Trascina i punti: sopra il dito compare la lente.')); return; }
        const [a1, a2, b1, b2] = st.pti;
        if (Math.hypot(a2.x - a1.x, a2.y - a1.y) < 5 || Math.hypot(b2.x - b1.x, b2.y - b1.y) < 5) { esito.appendChild(A.info('Allunga le due linee.', 'avviso')); return; }
        const alfa = angoloTra(a1, a2, b1, b2);
        st.alfa = alfa;
        esito.appendChild(A.misuratore('Angolo tra le linee', fmt(alfa, 1), '°'));
        esito.appendChild(A.griglia([['Supplementare', fmt(180 - alfa, 1), '°'], ['Complementare', fmt(90 - alfa, 1), '°']]));
        const L = el('div', { class: 'elenco' });
        utensiliPerAngolo(alfa, S.cosa).forEach(u => L.appendChild(el('div', { class: 'elem fase' }, [el('span', { class: 'ic', html: A.icona('fresa') }),
          el('span', { class: 't' }, [el('b', { testo: u.nome + ': ' + fmt(u.angolo, 1) + '°' + (u.serie ? '  →  di serie ' + u.serie + '°' : '') }), el('small', { testo: u.nota + (u.serie && Math.abs(u.serie - u.angolo) > 2 ? ' · differenza ' + fmt(Math.abs(u.serie - u.angolo), 1) + '°: misura meglio o serve un utensile speciale' : '') })])])));
        esito.append(el('div', { class: 'sez', testo: 'Utensile' }), L);
        esito.appendChild(A.info('Precisione di una foto: circa 1-2 gradi, se la foto e dritta (il telefono parallelo al lato) e il pezzo e vicino. Per un angolo preciso misura con il goniometro.', 'avviso'));
      }
      A.angoloCalcola = calcola;
      disegna(); calcola();
      A.angoloRidisegna = () => disegna();
    }
  };
  window.addEventListener('resize', () => { if (A.attuale && A.attuale() === 'angolo' && A.angoloRidisegna) A.angoloRidisegna(); });
})();
