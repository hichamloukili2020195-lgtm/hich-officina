// ===== Hich-Officina: il lavoro guidato in 4 passi (grezzo, forma, lavorazioni, programma) =====
// Un percorso solo per fresa e tornio. La forma si scrive a quote con il tastierino dell'app; il disegno si aggiorna
// mentre scrivi; le lavorazioni si propongono da sole; alla fine programma, tempo, utensili e simulazione.
(function () {
  'use strict';
  const A = window.App, O = A.O, el = A.el, fmt = A.fmt;
  const col = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
  const num = v => { if (v === '' || v === null || v === undefined) return NaN; return Number(String(v).replace(',', '.')); };
  const r1 = x => Math.round(x * 10) / 10;
  const PASSI = [['grezzo', 'Grezzo'], ['forma', 'Forma'], ['lav', 'Lavorazioni'], ['prog', 'Programma']];
  const svg = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const IC = {
    cil: '<path d="M3 15h18"/><path d="M3 9h18" opacity=".35"/>', cono: '<path d="M4 16l16-6"/>', arco: '<path d="M4 18c2-9 7-12 16-12"/>',
    tasca: '<rect x="4" y="6" width="16" height="12" rx="2"/><rect x="8" y="9" width="8" height="6" rx="1"/>', tascaTonda: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
    foro: '<circle cx="12" cy="12" r="4"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>', foriCerchio: '<circle cx="12" cy="12" r="8" stroke-dasharray="2 3"/><circle cx="12" cy="4" r="1.6"/><circle cx="20" cy="12" r="1.6"/><circle cx="12" cy="20" r="1.6"/><circle cx="4" cy="12" r="1.6"/>',
    foriGriglia: '<circle cx="7" cy="7" r="1.8"/><circle cx="17" cy="7" r="1.8"/><circle cx="7" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/>', asola: '<rect x="3" y="9" width="18" height="6" rx="3"/>',
    profilo: '<path d="M4 18V8l6-4h10v14z"/>', fresa: '<path d="M4 18h16v3H4z"/><path d="M10 3h4v9h-4z"/><path d="M10 12l2 4 2-4"/>', tornio: '<path d="M3 9h5v6H3zM8 10h7v4H8zM15 11h4v2h-4zM19 12h2"/>',
    su: '<path d="M6 15l6-6 6 6"/>', giu: '<path d="M6 9l6 6 6-6"/>', piu: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  const FORME = [['tasca', 'Tasca', 'Rettangolare, con raggio agli angoli'], ['tascaTonda', 'Tasca tonda', 'Fresata a elica'], ['foro', 'Foro', 'Liscio, filettato o alesato'],
    ['foriCerchio', 'Fori a cerchio', 'Su una circonferenza'], ['foriGriglia', 'Fori a griglia', 'File e colonne'], ['asola', 'Asola', 'Tra due centri'], ['profilo', 'Profilo', 'A punti, contorno o tasca']];
  const NOMI_FORMA = Object.fromEntries(FORME.map(f => [f[0], f[1]]));
  const MASCHI = [[3, .5], [4, .7], [5, .8], [6, 1], [8, 1.25], [10, 1.5], [12, 1.75], [16, 2], [20, 2.5]];

  function nuovaForma(tipo, g) {
    const cx = (num(g.lx) || 100) / 2, cy = (num(g.ly) || 60) / 2;
    if (tipo === 'tasca') return { tipo, cx, cy, lx: Math.round(cx * 0.6), ly: Math.round(cy * 0.6), r: 5, prof: 5 };
    if (tipo === 'tascaTonda') return { tipo, cx, cy, dt: Math.round(Math.min(cx, cy)), prof: 5 };
    if (tipo === 'foro') return { tipo, x: 10, y: 10, d: 8, foro: 'maschio', passo: 1.25, passante: true };
    if (tipo === 'foriCerchio') return { tipo, cx, cy, dc: Math.round(Math.min(cx, cy) * 1.6), n: 6, a0: 0, d: 6.6, foro: 'foro', passante: true };
    if (tipo === 'foriGriglia') return { tipo, x0: 10, y0: 10, nx: 2, ny: 2, px: Math.max(10, 2 * cx - 20), py: Math.max(10, 2 * cy - 20), d: 8.5, foro: 'foro', passante: true };
    if (tipo === 'asola') return { tipo, x1: cx - 15, y1: cy, x2: cx + 15, y2: cy, w: 10, prof: 5 };
    return { tipo: 'profilo', chiuso: true, lav: 'contorno', lato: 'esterno', prof: 5, punti: [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 50, y: 40 }, { x: 10, y: 40 }] };
  }

  A.schermi.lavoro = {
    titolo: 'Disegna e lavora',
    render(m) {
      const S = A.sezione('lavoro');
      if (S.modo !== 'tornio') S.modo = 'fresa';
      S.usato = true;
      S.passo = Math.max(0, Math.min(3, Number(S.passo) || 0));
      if (S.mat === undefined) S.mat = '4';
      S.fresa = S.fresa || { grezzo: { lx: 100, ly: 60, lz: 20, sovraZ: 1, contorna: false }, forme: [nuovaForma('tasca', { lx: 100, ly: 60 }), Object.assign(nuovaForma('foriGriglia', { lx: 100, ly: 60 }))], scelte: {} };
      S.tornio = S.tornio || { grezzo: { dg: 40, lg: 80 }, tratti: [{ tipo: 'cil', d: 20, l: 25, fil: 2.5, gola: 4, spigolo: 'C1' }, { tipo: 'cil', d: 30, l: 20, toll: 'h6', spigolo: 'C0.5' }], troncatura: true, smussoTesta: 'C0.5', scelte: {} };
      const L = () => S[S.modo];
      let scelta = typeof S.aperta === 'number' ? S.aperta : null;   // forma o tratto aperto
      let prop = null;

      // ----- struttura: passi in alto, disegno, contenuto, barra in basso -----
      const passi = el('ol', { class: 'lav-passi', 'aria-label': 'Passi del lavoro' });
      const tela = el('canvas', { class: 'lav-tela', 'aria-label': 'Disegno del pezzo: tocca una forma per correggerla' });
      const corpo = el('div', { class: 'lav-corpo' });
      const indietro = el('button', { class: 'pul sec', id: 'lav-indietro', testo: 'Indietro', onclick: () => vaiPasso(S.passo - 1) });
      const avanti = el('button', { class: 'pul', id: 'lav-avanti', testo: 'Avanti', onclick: () => vaiPasso(S.passo + 1) });
      const barra = el('div', { class: 'lav-barra' }, [indietro, avanti]);
      const disegnoBox = el('div', { class: 'lav-disegno' }, [tela]);
      m.append(passi, el('div', { class: 'lav-grid' }, [disegnoBox, corpo]), barra);
      document.body.classList.add('con-lav-barra');
      PASSI.forEach(([id, t], i) => passi.appendChild(el('li', {}, [el('button', { 'data-passo': i, 'aria-label': 'Passo ' + (i + 1) + ': ' + t, onclick: () => vaiPasso(i) }, [el('span', { class: 'n', testo: String(i + 1) }), el('span', { class: 't', testo: t })])])));
      const vaiPasso = i => {
        if (i < 0 || i > 3) return;
        if (i >= 2) { prop = calcolaProposta(); if (prop.errore) { S.passo = 1; A.salva(); tutto(); A.avviso(prop.errore); return; } }
        S.passo = i; A.salva(); A.chiudiTastierino(); tutto(); window.scrollTo(0, 0);
      };
      const ctx = () => { const I = A.imp(); return { mat: A.materiale(S.mat || 0), tab: A.tabellaUt ? A.tabellaUt() : [], nmax: S.modo === 'tornio' ? I.nmaxTornio : I.nmaxFresa, zSic: I.zSic, zR: I.zR, refrig: I.refrig, g43: I.g43, codLimite: I.codLimite, codFiletto: I.codFiletto, metodo: S.modo === 'tornio' && L().metodo === 'ciclo' ? 'ciclo' : 'passate' }; };
      const calcolaProposta = () => O.proponiLavoro(Object.assign({ modo: S.modo }, L()), ctx());

      // ----- disegno del pezzo (si aggiorna mentre scrivi) -----
      const zone = [];   // aree toccabili: {x0,y0,x1,y1,i}
      const disegna = () => {
        const W = tela.clientWidth || 340, H = tela.clientHeight || 220, dpr = window.devicePixelRatio || 1;
        tela.width = Math.round(W * dpr); tela.height = Math.round(H * dpr);
        const g = tela.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        zone.length = 0;
        g.font = '600 11px system-ui'; g.textAlign = 'center';
        if (S.modo === 'tornio') disegnaTornio(g, W, H); else disegnaFresa(g, W, H);
      };
      const quota = (g, t, x, y, c) => { g.font = '600 11px system-ui'; const w = g.measureText(t).width + 8; g.fillStyle = col('--pannello'); g.globalAlpha = 0.85; g.fillRect(x - w / 2, y - 9, w, 15); g.globalAlpha = 1; g.fillStyle = c || col('--testo'); g.fillText(t, x, y + 2); };
      const disegnaTornio = (g, W, H) => {
        const T = L(), dg = num(T.grezzo.dg) || 40;
        const pr = O.puntiTornio(T.tratti, { dg, smussoTesta: T.smussoTesta });
        const lung = pr.errore ? (num(T.grezzo.lg) || 50) : Math.max(pr.lunghezza, 10);
        const zMin = -lung - 6, zMax = 4, rMax = dg / 2 + 3;
        const sc = Math.min((W - 24) / (zMax - zMin), (H - 56) / (2 * rMax));
        const largo = (zMax - zMin) * sc, X = z => (W + largo) / 2 - (zMax - z) * sc, Y = r => H / 2 - r * sc;
        // grezzo e asse
        g.fillStyle = col('--tenue'); g.globalAlpha = 0.14; g.fillRect(X(zMin + 2), Y(dg / 2), X(0) - X(zMin + 2), dg * sc); g.globalAlpha = 1;
        g.strokeStyle = col('--tenue'); g.setLineDash([10, 4, 2, 4]); g.beginPath(); g.moveTo(4, Y(0)); g.lineTo(W - 4, Y(0)); g.stroke(); g.setLineDash([]);
        if (pr.errore) { quota(g, pr.errore, W / 2, H / 2, col('--errore')); return; }
        const gt = O.trattiTornio(pr.punti.map(p => Object.assign({}, p)));
        const poli = gt.errore ? pr.punti.map(p => ({ a: p.z, b: p.x / 2 })) : O.polilineaProfilo(gt.tratti, 0.25);
        [1, -1].forEach(k => {
          g.fillStyle = col('--accento'); g.globalAlpha = 0.2;
          g.beginPath(); g.moveTo(X(poli[0].a), Y(0)); poli.forEach(p => g.lineTo(X(p.a), Y(k * p.b))); g.lineTo(X(poli[poli.length - 1].a), Y(0)); g.closePath(); g.fill(); g.globalAlpha = 1;
          g.strokeStyle = gt.errore ? col('--errore') : col('--accento2'); g.lineWidth = k > 0 ? 2.4 : 1.2; g.globalAlpha = k > 0 ? 1 : 0.5;
          g.beginPath(); poli.forEach((p, i) => (i ? g.lineTo(X(p.a), Y(k * p.b)) : g.moveTo(X(p.a), Y(k * p.b)))); g.stroke(); g.globalAlpha = 1;
        });
        // tratti: zona toccabile, quote, filetti
        let z = 0;
        T.tratti.forEach((t, i) => {
          const d = num(t.d), l = num(t.l); if (!(d > 0 && l > 0)) return;
          const za = z, zb = z - l; z = zb;
          const x0 = X(za), x1 = X(zb);
          zone.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: 0, y1: H, i });
          if (i === scelta) { g.fillStyle = col('--avviso'); g.globalAlpha = 0.18; g.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), H); g.globalAlpha = 1; }
          if (num(t.fil) > 0 && t.tipo === 'cil') { g.strokeStyle = col('--ok'); g.lineWidth = 1.2; g.beginPath(); for (let zz = za, k = 0; zz > zb + (num(t.gola) || 0); zz -= Math.max(num(t.fil), 3 / sc) / 2, k++) { const y = Y(d / 2 - (k % 2 ? Math.min(0.6 * num(t.fil), d * 0.15) : 0)); k ? g.lineTo(X(zz), y) : g.moveTo(X(zz), y); } g.stroke(); }
          if (Math.abs(x1 - x0) > 34) quota(g, 'Ø' + fmt(d, 2) + (t.toll ? ' ' + t.toll : '') + (num(t.fil) > 0 ? ' ' + (t.filNome || 'M') : ''), (x0 + x1) / 2, Y(d / 2) - 10, i === scelta ? col('--avviso') : null);
          if (Math.abs(x1 - x0) > 24) quota(g, fmt(l, 2), (x0 + x1) / 2, Y(-d / 2) + 12, col('--tenue'));
          g.fillStyle = i === scelta ? col('--avviso') : col('--tenue'); g.font = '700 10px system-ui'; g.fillText(String(i + 1), (x0 + x1) / 2, H - 4);
        });
      };
      const disegnaFresa = (g, W, H) => {
        const F = L(), lx = num(F.grezzo.lx) || 100, ly = num(F.grezzo.ly) || 60;
        const m0 = 30, sc = Math.min((W - 2 * m0) / lx, (H - 2 * m0) / ly);
        const ox = (W - lx * sc) / 2, oy = (H + ly * sc) / 2;
        const X = x => ox + x * sc, Y = y => oy - y * sc;
        g.fillStyle = col('--campo'); g.strokeStyle = col('--bordo'); g.lineWidth = 1.5;
        g.fillStyle = col('--accento'); g.globalAlpha = 0.12; g.fillRect(X(0), Y(ly), lx * sc, ly * sc); g.globalAlpha = 1;
        g.strokeStyle = F.grezzo.contorna ? col('--accento2') : col('--tenue'); g.lineWidth = F.grezzo.contorna ? 2.2 : 1.2; g.strokeRect(X(0), Y(ly), lx * sc, ly * sc);
        // origine e quote del pezzo
        g.strokeStyle = col('--tenue'); g.lineWidth = 1.2; g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(0) + 22, Y(0)); g.moveTo(X(0), Y(0)); g.lineTo(X(0), Y(0) - 22); g.stroke();
        quota(g, fmt(lx, 2), X(lx / 2), Y(0) + 12, col('--tenue')); g.save(); g.translate(X(lx) + 12, Y(ly / 2)); g.rotate(-Math.PI / 2); quota(g, fmt(ly, 2), 0, 0, col('--tenue')); g.restore();
        let ent = [];
        try { ent = O.entitaFresa(F.forme.map(f => Object.assign({}, f, { spenta: false })), null); } catch (e) { ent = []; }
        // ogni forma: il suo gruppo di entita (in ordine)
        let k = 0;
        F.forme.forEach((f, i) => {
          const n = f.tipo === 'foriCerchio' ? Math.max(1, Math.round(num(f.n) || 1)) : f.tipo === 'foriGriglia' ? Math.max(1, Math.round(num(f.nx) || 1)) * Math.max(1, Math.round(num(f.ny) || 1)) : 1;
          const mie = ent.slice(k, k + n); k += n;
          const sel = i === scelta, c = sel ? col('--avviso') : /^fori|^foro/.test(f.tipo) ? col('--avviso') : col('--ok');
          let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
          const box = (x, y, r) => { bx0 = Math.min(bx0, x - r); bx1 = Math.max(bx1, x + r); by0 = Math.min(by0, y - r); by1 = Math.max(by1, y + r); };
          mie.forEach(e => {
            g.strokeStyle = c; g.fillStyle = c; g.lineWidth = sel ? 3 : 2;
            if (e.tipo === 'punto') { const r = Math.max(3, num(e.lav[0].d) / 2 * sc); g.globalAlpha = 0.25; g.beginPath(); g.arc(X(e.x), Y(e.y), r, 0, 7); g.fill(); g.globalAlpha = 1; g.beginPath(); g.arc(X(e.x), Y(e.y), r, 0, 7); g.stroke(); box(X(e.x), Y(e.y), r + 6); return; }
            if (e.tipo === 'cerchio') { g.globalAlpha = 0.2; g.beginPath(); g.arc(X(e.cx), Y(e.cy), e.r * sc, 0, 7); g.fill(); g.globalAlpha = 1; g.beginPath(); g.arc(X(e.cx), Y(e.cy), e.r * sc, 0, 7); g.stroke(); box(X(e.cx), Y(e.cy), e.r * sc); return; }
            if (e.tipo === 'asola') { g.save(); g.lineCap = 'round'; g.lineWidth = Math.max(3, e.w * sc); g.globalAlpha = 0.3; g.beginPath(); g.moveTo(X(e.x1), Y(e.y1)); g.lineTo(X(e.x2), Y(e.y2)); g.stroke(); g.restore(); box(X(e.x1), Y(e.y1), e.w * sc / 2); box(X(e.x2), Y(e.y2), e.w * sc / 2); return; }
            const pr = O.profiloCAD(e);
            const gg = O.costruisciProfilo(pr.punti.map(p => ({ a: p.x, b: p.y, tratto: p.tratto, r: p.r, raccordo: p.raccordo, smusso: p.smusso })), pr.chiuso);
            const poli = gg.errore ? pr.punti.map(p => ({ a: p.x, b: p.y })) : O.polilineaProfilo(gg.tratti, 0.5);
            g.beginPath(); poli.forEach((p, j) => (j ? g.lineTo(X(p.a), Y(p.b)) : g.moveTo(X(p.a), Y(p.b)))); if (pr.chiuso) g.closePath();
            g.globalAlpha = 0.18; g.fill(); g.globalAlpha = 1; g.strokeStyle = gg.errore ? col('--errore') : c; g.stroke();
            poli.forEach(p => box(X(p.a), Y(p.b), 0));
          });
          // quote sul disegno della forma scelta
          if (sel && mie.length) {
            const lim = O.limitiCAD(mie);
            const dim = (xa, ya, xb, yb, t) => {
              g.strokeStyle = col('--avviso'); g.fillStyle = col('--avviso'); g.lineWidth = 1;
              g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke();
              [[xa, ya], [xb, yb]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - (yb === ya ? 0 : 4), y - (yb === ya ? 4 : 0)); g.lineTo(x + (yb === ya ? 0 : 4), y + (yb === ya ? 4 : 0)); g.stroke(); });
              quota(g, t, (xa + xb) / 2, (ya + yb) / 2 - (yb === ya ? 8 : 0), col('--avviso'));
            };
            if (/^foro$|^fori/.test(f.tipo)) {
              mie.slice(0, 12).forEach(e => { const d = num(e.lav[0].d); quota(g, (f.foro === 'maschio' ? 'M' : 'Ø') + fmt(d, 2) + '  X' + fmt(e.x, 2) + ' Y' + fmt(e.y, 2), X(e.x), Y(e.y) + Math.max(14, d / 2 * sc + 12), col('--avviso')); });
            } else if (lim) {
              const wx = lim.x1 - lim.x0, wy = lim.y1 - lim.y0;
              dim(X(lim.x0), Y(lim.y0) + 16, X(lim.x1), Y(lim.y0) + 16, fmt(wx, 2));
              dim(X(lim.x1) + 16, Y(lim.y1), X(lim.x1) + 16, Y(lim.y0), fmt(wy, 2));
              quota(g, 'da origine X' + fmt(lim.x0, 2) + ' Y' + fmt(lim.y0, 2), Math.min(Math.max(X(lim.x0) + 48, 60), 330), Math.min(Y(lim.y0) + 32, H - 8), col('--avviso'));
            }
          }
          if (isFinite(bx0)) { zone.push({ x0: bx0 - 4, y0: by0 - 4, x1: bx1 + 4, y1: by1 + 4, i }); quota(g, String(i + 1) + ' ' + NOMI_FORMA[f.tipo], (bx0 + bx1) / 2, Math.max(10, by0 - 8), sel ? col('--avviso') : col('--testo')); }
        });
      };
      tela.addEventListener('click', e => {
        const b = tela.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
        const z = zone.filter(q => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1).sort((a, c) => (a.x1 - a.x0) * (a.y1 - a.y0) - (c.x1 - c.x0) * (c.y1 - c.y0))[0];
        if (!z) return;
        if (S.passo !== 1) S.passo = 1;
        scelta = z.i; S.aperta = scelta; A.salva(); tutto();
        const card = corpo.querySelector('[data-i="' + z.i + '"]'); if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });

      // ----- passo 1: grezzo e materiale -----
      const passoGrezzo = () => {
        corpo.appendChild(el('div', { class: 'lav-scelta', role: 'radiogroup', 'aria-label': 'Macchina' }, [['fresa', 'Fresa', 'Piastre: tasche, fori, asole'], ['tornio', 'Tornio', 'Alberi: diametri, coni, filetti']].map(([id, t, s]) =>
          el('button', { class: 'lav-macchina' + (S.modo === id ? ' attiva' : ''), role: 'radio', 'aria-checked': S.modo === id ? 'true' : 'false', 'data-modo': id, onclick: () => { S.modo = id; scelta = null; S.aperta = null; A.salva(); tutto(); } }, [el('span', { class: 'ic', html: svg(IC[id]) }), el('b', { testo: t }), el('small', { testo: s })]))));
        corpo.appendChild(el('button', { class: 'lav-foto', id: 'lav-da-foto', onclick: () => A.vai('dalDisegno') }, [el('span', { class: 'ic', html: A.icona('fotocamera') }), el('span', { class: 't' }, [el('b', { testo: 'Parti da una foto del disegno' }), el('small', { testo: 'Le quote lette, controllate da te, diventano il pezzo' })])]));
        corpo.appendChild(el('div', { class: 'sez', testo: 'Materiale' }));
        const mats = A.sceltaMateriali();
        const usati = mats.slice(0, 6);
        const tess = el('div', { class: 'lav-mat' }, usati.map(([v, t]) => el('button', { class: 'chip' + (String(S.mat) === String(v) ? ' attiva' : ''), testo: t, onclick: () => { S.mat = v; A.salva(); tutto(); } })));
        const altri = el('select', { 'aria-label': 'Altri materiali', id: 'lav-mat' }, mats.map(([v, t]) => el('option', { value: v, testo: t })));
        altri.value = String(S.mat); altri.addEventListener('change', () => { S.mat = altri.value; A.salva(); tutto(); });
        corpo.append(tess, el('div', { class: 'ctrl' }, [altri]));
        const mt = A.materiale(S.mat || 0);
        if (S.modo === 'tornio' && mt && !(mt.lvc > 0)) corpo.appendChild(A.info('Questo materiale non ha i dati di tornitura: scegline un altro o completalo in Materiali.', 'avviso'));
        corpo.appendChild(el('div', { class: 'sez', testo: S.modo === 'tornio' ? 'Barra' : 'Pezzo finito' }));
        const g = L().grezzo, box = el('div', { class: 'lav-campi' });
        const agg = (k, fine) => { A.salva(); disegna(); if (fine) tutto(); };
        if (S.modo === 'tornio') box.append(A.campoNum(g, 'dg', 'Diametro della barra', 'mm', agg), A.campoNum(g, 'lg', 'Lunghezza fuori dal mandrino', 'mm', agg));
        else {
          box.append(A.campoNum(g, 'lx', 'Lunghezza X', 'mm', agg), A.campoNum(g, 'ly', 'Larghezza Y', 'mm', agg), A.campoNum(g, 'lz', 'Spessore', 'mm', agg), A.campoNum(g, 'sovraZ', 'Da spianare sopra', 'mm', agg));
          box.appendChild(interruttore('Contorna il pezzo (taglio esterno)', !!g.contorna, v => { g.contorna = v; A.salva(); tutto(); }, 'lav-contorna'));
        }
        corpo.appendChild(box);
        corpo.appendChild(el('p', { class: 'leggenda', testo: S.modo === 'tornio' ? 'Z0 sulla faccia di testa, X in diametro.' : 'Origine nello spigolo in basso a sinistra, Z0 sulla faccia finita.' }));
        // modelli pronti
        corpo.appendChild(el('div', { class: 'sez', testo: 'Parti da un modello' }));
        corpo.appendChild(el('div', { class: 'lav-modelli' }, O.MODELLI_LAVORO.filter(x => x.modo === S.modo).map(x => el('button', { class: 'lav-modello', 'data-modello': x.id, onclick: async () => {
          const pieno = S.modo === 'tornio' ? L().tratti.length : L().forme.length;
          if (pieno && !(await A.conferma('Usare il modello?', 'Il disegno di adesso viene sostituito da "' + x.nome + '". Puoi salvarlo prima con un nome.', 'Usa il modello'))) return;
          S[S.modo] = x.dati(); scelta = null; S.aperta = null; S.passo = 1; A.salva(); tutto(); A.avviso('Modello "' + x.nome + '": correggi le quote');
        } }, [el('b', { testo: x.nome }), el('small', { testo: x.descr })]))));
        // lavori salvati
        corpo.appendChild(el('div', { class: 'sez', testo: 'Lavori salvati' }));
        const salvati = A.mem.lavori = A.mem.lavori || [];
        corpo.appendChild(el('button', { class: 'pul sec', id: 'lav-salva', html: A.icona('salva') + 'Salva questo lavoro con un nome', onclick: async () => {
          const nome = await A.chiedi('Nome del lavoro', { nota: 'Per esempio il codice del disegno.' });
          if (nome === null || !String(nome).trim()) return;
          salvati.unshift({ id: 'l' + Date.now(), nome: String(nome).trim(), data: new Date().toISOString().slice(0, 10), stato: JSON.parse(JSON.stringify({ modo: S.modo, mat: S.mat, fresa: S.fresa, tornio: S.tornio })) });
          A.salva(); tutto(); A.avviso('Lavoro salvato');
        } }));
        if (!salvati.length) corpo.appendChild(el('p', { class: 'leggenda', testo: 'Nessun lavoro salvato: salva il primo e lo ritrovi qui.' }));
        salvati.forEach(w => corpo.appendChild(el('div', { class: 'lav-salvato', 'data-lavoro': w.id }, [
          el('div', { class: 't' }, [el('b', { testo: w.nome }), el('small', { testo: (w.stato.modo === 'tornio' ? 'Tornio' : 'Fresa') + ' · ' + w.data })]),
          el('button', { class: 'pul sec', testo: 'Apri', 'aria-label': 'Apri ' + w.nome, onclick: () => { const st = JSON.parse(JSON.stringify(w.stato)); S.modo = st.modo; S.mat = st.mat; S.fresa = st.fresa; S.tornio = st.tornio; scelta = null; S.aperta = null; S.passo = 1; A.salva(); tutto(); } }),
          el('button', { class: 'icona-pul', 'aria-label': 'Duplica ' + w.nome, html: A.icona('copia'), onclick: () => { salvati.unshift({ id: 'l' + Date.now(), nome: w.nome + ' (copia)', data: new Date().toISOString().slice(0, 10), stato: JSON.parse(JSON.stringify(w.stato)) }); A.salva(); tutto(); } }),
          el('button', { class: 'icona-pul', 'aria-label': 'Elimina ' + w.nome, html: A.icona('cestino'), onclick: async () => { if (!(await A.conferma('Eliminare il lavoro?', '"' + w.nome + '" viene tolto dall\'elenco.', 'Elimina', true))) return; A.mem.lavori = salvati.filter(x => x.id !== w.id); A.salva(); tutto(); } })])));
      };
      const interruttore = (testo, on, cambia, id) => el('button', { class: 'lav-int' + (on ? ' on' : ''), role: 'switch', 'aria-checked': on ? 'true' : 'false', id, onclick: () => cambia(!on) }, [el('span', { class: 't', testo }), el('span', { class: 'sw', 'aria-hidden': 'true' })]);
      /** Tutti i filetti del tornio, per famiglia: o e il tratto (o l'interno) con fil/filFam/filNome. */
      const sceltaFiletto = (o, id, scegli) => {
        const fam = O.filettiTornio ? O.filettiTornio() : [];
        const sel = el('select', { class: 'lav-altro-fil', id, 'aria-label': 'Altro filetto' }, [el('option', { value: '', testo: 'Altro filetto (gas, NPT, UNC, Whitworth, trapezio…)' })].concat(fam.map(f => {
          const g = document.createElement('optgroup'); g.label = f.nomeFam;
          f.righe.forEach(r => g.appendChild(el('option', { value: f.fam + '|' + r.nome, testo: r.nome + ' · Ø' + fmt(r.d, 3) + ' · passo ' + fmt(r.p, 3) })));
          return g;
        })));
        sel.value = o.filFam && o.filNome ? o.filFam + '|' + o.filNome : '';
        sel.addEventListener('change', () => { if (!sel.value) return; const [fm, nome] = sel.value.split('|'); const f = fam.find(x => x.fam === fm), r = f && f.righe.find(x => x.nome === nome); if (r) scegli({ fam: fm, nome, d: r.d, p: r.p }); });
        return el('div', { class: 'ctrl' }, [sel]);
      };
      const chips = (valori, attuale, cambia, etichetta) => el('div', { class: 'chips lav-chips', role: 'group', 'aria-label': etichetta }, valori.map(([v, t]) => el('button', { class: 'chip' + (String(attuale) === String(v) ? ' attiva' : ''), testo: t, onclick: () => cambia(v) })));

      // ----- passo 2: forma -----
      const testa = (i, icona, titolo, sotto, n) => el('div', { class: 'lav-card-testa' }, [
        el('button', { class: 'lav-card-apri', 'aria-expanded': i === scelta ? 'true' : 'false', onclick: () => { scelta = scelta === i ? null : i; S.aperta = scelta; A.salva(); tutto(); } }, [el('span', { class: 'num', testo: String(i + 1) }), el('span', { class: 'ic', html: svg(icona) }), el('span', { class: 't' }, [el('b', { testo: titolo }), el('small', { testo: sotto })])]),
        el('div', { class: 'lav-card-az' }, [
          el('button', { class: 'icona-pul', 'aria-label': 'Sposta su ' + (i + 1), html: svg(IC.su), disabled: i === 0, onclick: () => sposta(i, -1) }),
          el('button', { class: 'icona-pul', 'aria-label': 'Sposta giu ' + (i + 1), html: svg(IC.giu), disabled: i === n - 1, onclick: () => sposta(i, 1) }),
          el('button', { class: 'icona-pul', 'aria-label': 'Elimina ' + (i + 1), html: A.icona('cestino'), onclick: () => togli(i) })])]);
      const lista = () => (S.modo === 'tornio' ? L().tratti : L().forme);
      const sposta = (i, d) => { const a = lista(), j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; scelta = j; S.aperta = j; A.salva(); tutto(); };
      const togli = i => { const a = lista(); const via = a.splice(i, 1)[0]; S.ultimoTolto = { modo: S.modo, i, x: via }; scelta = null; S.aperta = null; A.salva(); tutto(); A.avviso('Eliminato. Premi Ripristina per riaverlo'); };
      const descriviTratto = t => {
        const d = fmt(num(t.d), 3), l = fmt(num(t.l), 3);
        const base = t.tipo === 'cono' ? 'Cono fino a Ø' + d + ' · L ' + l : t.tipo === 'arco' ? 'Arco R' + fmt(num(t.r), 2) + ' fino a Ø' + d + ' · L ' + l : 'Ø ' + d + ' · L ' + l;
        const extra = [num(t.fil) > 0 ? 'filetto ' + (t.filNome || 'M' + d + 'x' + fmt(num(t.fil), 2)) : '', num(t.gola) > 0 ? 'gola ' + fmt(num(t.gola), 2) : '', t.toll || '', t.spigolo || ''].filter(Boolean).join(' · ');
        return [base, extra];
      };
      const passoFormaTornio = () => {
        const T = L();
        T.tratti.forEach((t, i) => {
          const [tit, sotto] = descriviTratto(t);
          const card = el('div', { class: 'lav-card' + (i === scelta ? ' aperta' : ''), 'data-i': i }, [testa(i, IC[t.tipo] || IC.cil, tit, sotto || 'Tocca per scegliere filetto, gola, tolleranza, spigolo', T.tratti.length)]);
          if (i === scelta) {
            const ed = el('div', { class: 'lav-card-corpo' });
            const ri = () => { A.salva(); tutto(); };
            const agg = (k, fine) => { A.salva(); disegna(); const tt = card.querySelector('.t b'); if (tt) tt.textContent = descriviTratto(t)[0]; if (fine) tutto(); };
            ed.append(chips([['cil', 'Cilindro'], ['cono', 'Cono'], ['arco', 'Arco']], t.tipo || 'cil', v => { t.tipo = v; if (v !== 'cil') { delete t.fil; delete t.gola; delete t.toll; } if (v === 'arco' && !(num(t.r) > 0)) t.r = Math.max(2, num(t.l) || 5); ri(); }, 'Tipo di tratto'));
            const campi = el('div', { class: 'lav-campi' }, [A.campoNum(t, 'd', t.tipo === 'cil' ? 'Diametro Ø' : 'Diametro alla fine Ø', 'mm', agg), A.campoNum(t, 'l', 'Lunghezza', 'mm', agg)]);
            if (t.tipo === 'arco') { campi.appendChild(A.campoNum(t, 'r', 'Raggio', 'mm', agg)); }
            ed.appendChild(campi);
            if (t.tipo === 'arco') ed.appendChild(chips([['bombato', 'Bombato'], ['incavato', 'Incavato']], t.forma || 'bombato', v => { t.forma = v; ri(); }, 'Forma dell\'arco'));
            if ((t.tipo || 'cil') === 'cil') {
              const d = num(t.d), pg = O.passoGrosso(d);
              const passi = Array.from(new Set([pg].concat(O.FILETTI_FINI.filter(f => f[0] === d).map(f => f[1])))).filter(p => p > 0);
              ed.append(el('div', { class: 'lav-et', testo: 'Filetto' }), chips([['', 'No']].concat(passi.map(p => [p, 'M' + fmt(d) + 'x' + fmt(p)])), t.filFam ? '' : (t.fil || ''), v => { delete t.filFam; delete t.filNome; if (v) { t.fil = v; if (!t.gola && i < T.tratti.length - 1) t.gola = Math.max(3, Math.round(2 * v * 10) / 10); } else delete t.fil; ri(); }, 'Filetto'));
              ed.appendChild(sceltaFiletto(t, 'lav-altro-fil-' + i, F => { t.d = F.d; t.fil = F.p; t.filFam = F.fam; t.filNome = F.nome; if (!t.gola && i < T.tratti.length - 1) t.gola = Math.max(3, Math.round(2 * F.p * 10) / 10); ri(); }));
              ed.append(el('div', { class: 'lav-et', testo: 'Gola di scarico alla fine' }), chips([['', 'No'], [3, '3 mm'], [4, '4 mm'], [5, '5 mm'], [6, '6 mm']], t.gola || '', v => { if (v) t.gola = v; else delete t.gola; ri(); }, 'Gola'));
              ed.append(el('div', { class: 'lav-et', testo: 'Tolleranza' }), chips([['', 'No'], ['h6', 'h6'], ['h7', 'h7'], ['g6', 'g6'], ['f7', 'f7'], ['k6', 'k6'], ['js6', 'js6']], t.toll || '', v => { if (v) t.toll = v; else delete t.toll; ri(); }, 'Tolleranza'));
              const tutte = [];
              ['d', 'e', 'f', 'g', 'h', 'js', 'k', 'm', 'n', 'p'].forEach(l => ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14'].forEach(g => tutte.push(l + g)));
              const altre = el('select', { class: 'lav-altra-toll', 'aria-label': 'Altra tolleranza', id: 'lav-altra-toll-' + i }, [el('option', { value: '', testo: 'Altra tolleranza…' })].concat(tutte.map(c => el('option', { value: c, testo: c }))));
              altre.value = tutte.includes(t.toll) ? t.toll : '';
              altre.addEventListener('change', () => { if (altre.value) t.toll = altre.value; else delete t.toll; ri(); });
              ed.appendChild(el('div', { class: 'ctrl' }, [altre]));
            }
            ed.append(el('div', { class: 'lav-et', testo: 'Spigolo alla fine' }), chips([['', 'Vivo'], ['C0.5', 'C0,5'], ['C1', 'C1'], ['C2', 'C2'], ['R0.5', 'R0,5'], ['R1', 'R1'], ['R2', 'R2']], t.spigolo || '', v => { t.spigolo = v; ri(); }, 'Spigolo'));
            card.appendChild(ed);
          }
          corpo.appendChild(card);
        });
        corpo.appendChild(el('button', { class: 'lav-aggiungi', id: 'lav-agg-tratto', html: svg(IC.piu) + 'Aggiungi un tratto', onclick: () => {
          const u = T.tratti[T.tratti.length - 1];
          if (u && num(u.fil) > 0 && !(num(u.gola) > 0)) u.gola = Math.max(3, Math.round(2 * num(u.fil) * 10) / 10);   // filetto contro uno spallamento: gola di scarico
          T.tratti.push({ tipo: 'cil', d: u ? Math.min(num(T.grezzo.dg) || 40, num(u.d) + 6) : 20, l: 10 });
          scelta = T.tratti.length - 1; S.aperta = scelta; A.salva(); tutto();
          setTimeout(() => { const i = corpo.querySelector('.lav-card.aperta input'); if (i) i.focus(); }, 50);
        } }));
        corpo.appendChild(el('div', { class: 'sez', testo: 'Testa e fine' }));
        corpo.append(el('div', { class: 'lav-et', testo: 'Smusso sulla testa' }), chips([['', 'Vivo'], ['C0.5', 'C0,5'], ['C1', 'C1'], ['C2', 'C2']], T.smussoTesta === undefined ? 'C0.5' : T.smussoTesta, v => { T.smussoTesta = v; A.salva(); tutto(); }, 'Smusso di testa'));
        const agg2 = (k, f) => { A.salva(); if (f) tutto(); };
        const box = el('div', { class: 'lav-campi' }, [A.campoNum(T, 'foroD', T.foroTipo === 'maschio' ? 'Foro filettato M' : 'Foro in asse Ø (vuoto = no)', 'mm', agg2)].concat(num(T.foroD) > 0 ? [A.campoNum(T, 'foroP', 'Profondita del foro', 'mm', agg2)] : []));
        corpo.append(box);
        if (num(T.foroD) > 0) {
          const dF = num(T.foroD), tipoF = T.foroTipo === 'maschio' || T.foroTipo === 'alesato' ? T.foroTipo : 'foro';
          corpo.append(chips([['foro', 'Liscio'], ['maschio', 'Filettato'], ['alesato', 'Alesato']], tipoF, v => { T.foroTipo = v; if (v === 'maschio' && !(num(T.foroPasso) > 0)) T.foroPasso = O.passoGrosso(dF) || 1.5; A.salva(); tutto(); }, 'Foro in asse'));
          if (tipoF === 'maschio') {
            const passi = Array.from(new Set([O.passoGrosso(dF)].concat(O.FILETTI_FINI.filter(f => f[0] === dF).map(f => f[1])))).filter(q => q > 0);
            corpo.append(el('div', { class: 'lav-et', testo: 'Passo del maschio' }), chips(passi.map(q => [q, 'M' + fmt(dF) + 'x' + fmt(q)]), num(T.foroPasso) || passi[0], v => { T.foroPasso = v; A.salva(); tutto(); }, 'Passo del maschio'));
          } else if (tipoF === 'alesato') corpo.append(el('div', { class: 'lav-et', testo: 'Tolleranza del foro' }), chips([['H7', 'H7'], ['H8', 'H8'], ['G7', 'G7']], T.foroToll || 'H7', v => { T.foroToll = v; A.salva(); tutto(); }, 'Tolleranza del foro'));
          else {
            T.interno = T.interno || {};
            const I = T.interno;
            corpo.append(el('div', { class: 'lav-et', testo: 'Barenatura interna (vuoto = solo il foro)' }), el('div', { class: 'lav-campi' }, [A.campoNum(I, 'di', 'Ø finito del foro', 'mm', agg2), A.campoNum(I, 'l', 'Profondita', 'mm', agg2)]));
            if (num(I.di) > 0) {
              // altri tratti interni dopo il primo, verso il fondo (sempre piu stretti): profilo interno completo
              I.altri = I.altri || [];
              I.altri.forEach((t, k) => corpo.appendChild(el('div', { class: 'lav-punto' }, [el('span', { class: 'n', testo: 'I' + (k + 2) }), A.campoNum(t, 'd', t.tipo === 'cono' ? 'Ø alla fine' : 'Ø', 'mm', agg2), A.campoNum(t, 'l', 'Lunghezza', 'mm', agg2),
                el('button', { class: 'chip' + (t.tipo === 'cono' ? ' attiva' : ''), testo: t.tipo === 'cono' ? 'Cono' : 'Cilindro', onclick: () => { t.tipo = t.tipo === 'cono' ? 'cil' : 'cono'; A.salva(); tutto(); } }),
                el('button', { class: 'icona-pul', 'aria-label': 'Togli il tratto interno ' + (k + 2), html: svg(IC.x), onclick: () => { I.altri.splice(k, 1); A.salva(); tutto(); } })])));
              corpo.append(el('button', { class: 'pul sec', id: 'lav-agg-int', html: svg(IC.piu) + 'Tratto interno piu in fondo', onclick: () => { const u = I.altri[I.altri.length - 1]; const dPrec = u ? num(u.d) : num(I.di); I.altri.push({ tipo: 'cil', d: Math.max(num(T.foroD) + 2, dPrec - 6), l: 8 }); A.salva(); tutto(); } }));
              corpo.append(el('div', { class: 'lav-et', testo: 'Filetto interno' }), chips([['', 'No'], [O.passoGrosso(num(I.di)) || 1.5, 'M' + fmt(num(I.di)) + 'x' + fmt(O.passoGrosso(num(I.di)) || 1.5)]], I.filFam ? '' : (I.fil || ''), v => { delete I.filFam; delete I.filNome; if (v) I.fil = v; else delete I.fil; A.salva(); tutto(); }, 'Filetto interno'),
                sceltaFiletto(I, 'lav-altro-fil-int', F => { I.di = F.d; I.fil = F.p; I.filFam = F.fam; I.filNome = F.nome; A.salva(); tutto(); }));
              if (num(I.fil) > 0) corpo.append(interruttore('Gola di scarico in fondo al filetto', I.scarico !== false, v => { I.scarico = v; A.salva(); tutto(); }, 'lav-scarico-int'));
              corpo.append(interruttore('Gola interna', !!I.golaOn, v => { I.golaOn = v; I.gola = I.gola || { z: 5, b: 3, d: r1(num(I.di) + 3) }; A.salva(); tutto(); }, 'lav-gola-int'));
              if (I.golaOn) { I.gola = I.gola || {}; corpo.append(el('div', { class: 'lav-campi' }, [A.campoNum(I.gola, 'z', 'Distanza dalla faccia', 'mm', agg2), A.campoNum(I.gola, 'b', 'Larghezza', 'mm', agg2), A.campoNum(I.gola, 'd', 'Ø del fondo', 'mm', agg2)])); }
            }
          }
        }
        corpo.append(interruttore('Gola frontale sulla faccia', !!T.golaFrontOn, v => { T.golaFrontOn = v; const d0 = num((T.tratti[0] || {}).d) || 30; T.golaFront = T.golaFront || { dInt: r1(d0 * 0.5), dEst: r1(d0 * 0.75), prof: 2 }; A.salva(); tutto(); }, 'lav-gola-front'));
        if (T.golaFrontOn) { T.golaFront = T.golaFront || {}; corpo.append(el('div', { class: 'lav-campi' }, [A.campoNum(T.golaFront, 'dInt', 'Ø interno', 'mm', agg2), A.campoNum(T.golaFront, 'dEst', 'Ø esterno', 'mm', agg2), A.campoNum(T.golaFront, 'prof', 'Profondita', 'mm', agg2)])); }
        corpo.append( interruttore('Troncatura alla fine', !!T.troncatura, v => { T.troncatura = v; A.salva(); tutto(); }, 'lav-tronca'));
        if (T.troncatura) corpo.append(el('div', { class: 'lav-et', testo: 'Smusso sul pezzo che cade' }), chips([['', 'No'], [0.5, 'C0,5'], [1, 'C1'], [2, 'C2']], T.troncaSmusso || '', v => { if (v) T.troncaSmusso = v; else delete T.troncaSmusso; A.salva(); tutto(); }, 'Smusso sul pezzo che cade'));
        // seconda fase: pezzo girato (lato B)
        corpo.appendChild(el('div', { class: 'sez', testo: 'Lato B (pezzo girato)' }));
        T.fase2 = T.fase2 || { on: false, tratti: [] };
        const F2 = T.fase2;
        corpo.append(interruttore('Seconda fase: giro il pezzo e lavoro l\'altro lato', !!F2.on, v => { F2.on = v; if (v && !(num(F2.lTot) > 0)) { const lA = (T.tratti || []).reduce((q, t) => q + (num(t.l) || 0), 0); F2.lTot = Math.round(lA + 15); } if (v && !F2.tratti.length) F2.tratti.push({ tipo: 'cil', d: Math.max(5, (num((T.tratti[0] || {}).d) || 20)), l: 10 }); if (v) T.troncatura = true; A.salva(); tutto(); }, 'lav-fase2'));
        if (F2.on) {
          corpo.append(el('p', { class: 'leggenda', testo: 'Dopo la troncatura il pezzo si gira e si serra sul lato A. Il lato B parte dalla faccia nuova (Z0), i tratti vanno verso il lato A.' }),
            el('div', { class: 'lav-campi' }, [A.campoNum(F2, 'lTot', 'Lunghezza finita del pezzo', 'mm', agg2)]));
          F2.tratti.forEach((t, k) => corpo.appendChild(el('div', { class: 'lav-punto' }, [el('span', { class: 'n', testo: 'B' + (k + 1) }), A.campoNum(t, 'd', 'Ø', 'mm', agg2), A.campoNum(t, 'l', 'Lunghezza', 'mm', agg2),
            el('button', { class: 'icona-pul', 'aria-label': 'Togli il tratto B' + (k + 1), html: svg(IC.x), disabled: F2.tratti.length <= 1, onclick: () => { F2.tratti.splice(k, 1); A.salva(); tutto(); } })])));
          corpo.append(el('button', { class: 'pul sec', id: 'lav-agg-b', html: svg(IC.piu) + 'Tratto del lato B', onclick: () => { const u = F2.tratti[F2.tratti.length - 1]; F2.tratti.push({ tipo: 'cil', d: u ? num(u.d) + 6 : 20, l: 10 }); A.salva(); tutto(); } }),
            el('div', { class: 'lav-et', testo: 'Smusso sulla testa del lato B' }), chips([['', 'Vivo'], ['C0.5', 'C0,5'], ['C1', 'C1'], ['C2', 'C2']], F2.smussoTesta === undefined ? 'C0.5' : F2.smussoTesta, v => { F2.smussoTesta = v; A.salva(); tutto(); }, 'Smusso di testa lato B'));
        }
      };
      const passoFormaFresa = () => {
        const F = L();
        F.forme.forEach((f, i) => {
          const sotto = f.tipo === 'tasca' ? fmt(num(f.lx)) + ' x ' + fmt(num(f.ly)) + ' · prof. ' + fmt(num(f.prof)) : f.tipo === 'tascaTonda' ? 'Ø' + fmt(num(f.dt)) + ' · prof. ' + fmt(num(f.prof))
            : /^fori|^foro/.test(f.tipo) ? (f.foro === 'maschio' ? 'M' + fmt(num(f.d)) + 'x' + fmt(num(f.passo) || O.passoGrosso(num(f.d))) : 'Ø' + fmt(num(f.d)) + (f.foro === 'alesato' ? ' ' + (f.toll || 'H7') : '')) + (f.passante !== false ? ' passante' : ' prof. ' + fmt(num(f.prof))) + (f.tipo === 'foriCerchio' ? ' · ' + fmt(num(f.n)) + ' fori' : f.tipo === 'foriGriglia' ? ' · ' + fmt(num(f.nx) * num(f.ny)) + ' fori' : '')
              : f.tipo === 'asola' ? 'larga ' + fmt(num(f.w)) + ' · prof. ' + fmt(num(f.prof)) : (f.lav === 'tasca' ? 'Tasca' : 'Contorno') + ' · ' + (f.punti || []).length + ' punti';
          const card = el('div', { class: 'lav-card' + (i === scelta ? ' aperta' : ''), 'data-i': i }, [testa(i, IC[f.tipo], NOMI_FORMA[f.tipo], sotto, F.forme.length)]);
          if (i === scelta) card.appendChild(editorForma(f));
          corpo.appendChild(card);
        });
        const menu = el('div', { class: 'lav-forme', hidden: !S.menuForme });
        FORME.forEach(([id, t, s]) => menu.appendChild(el('button', { class: 'lav-forma', 'data-forma': id, onclick: () => { F.forme.push(nuovaForma(id, F.grezzo)); scelta = F.forme.length - 1; S.aperta = scelta; S.menuForme = false; A.salva(); tutto(); } }, [el('span', { class: 'ic', html: svg(IC[id]) }), el('b', { testo: t }), el('small', { testo: s })])));
        corpo.append(el('button', { class: 'lav-aggiungi', id: 'lav-agg-forma', html: svg(IC.piu) + 'Aggiungi una forma', onclick: () => { S.menuForme = !S.menuForme; menu.hidden = !S.menuForme; A.salva(); } }), menu);
      };
      const editorForma = f => {
        const ed = el('div', { class: 'lav-card-corpo' });
        const ri = () => { A.salva(); tutto(); };
        const agg = (k, fine) => { A.salva(); disegna(); if (fine) tutto(); };
        const campi = (lista2) => el('div', { class: 'lav-campi' }, lista2.map(([k, t, u]) => A.campoNum(f, k, t, u || 'mm', agg)));
        if (f.tipo === 'tasca') ed.append(campi([['cx', 'Centro X'], ['cy', 'Centro Y'], ['lx', 'Lunghezza X'], ['ly', 'Larghezza Y'], ['r', 'Raggio agli angoli'], ['prof', 'Profondita']]));
        else if (f.tipo === 'tascaTonda') ed.append(campi([['cx', 'Centro X'], ['cy', 'Centro Y'], ['dt', 'Diametro Ø'], ['prof', 'Profondita']]));
        else if (f.tipo === 'asola') ed.append(campi([['x1', 'Centro 1 X'], ['y1', 'Centro 1 Y'], ['x2', 'Centro 2 X'], ['y2', 'Centro 2 Y'], ['w', 'Larghezza'], ['prof', 'Profondita']]));
        else if (f.tipo === 'profilo') {
          ed.append(chips([['contorno', 'Contorno'], ['tasca', 'Tasca']], f.lav || 'contorno', v => { f.lav = v; ri(); }, 'Lavorazione del profilo'));
          if ((f.lav || 'contorno') === 'contorno') ed.append(chips([['esterno', 'Fresa fuori'], ['interno', 'Fresa dentro'], ['centro', 'Sulla linea']], f.lato || 'esterno', v => { f.lato = v; ri(); }, 'Lato della fresa'));
          ed.append(campi([['prof', 'Profondita']]));
          (f.punti || []).forEach((p, j) => ed.appendChild(el('div', { class: 'lav-punto' }, [el('span', { class: 'n', testo: 'P' + (j + 1) }), A.campoNum(p, 'x', 'X', 'mm', agg), A.campoNum(p, 'y', 'Y', 'mm', agg),
            el('button', { class: 'icona-pul', 'aria-label': 'Togli il punto ' + (j + 1), html: svg(IC.x), disabled: f.punti.length <= 2, onclick: () => { f.punti.splice(j, 1); ri(); } })])));
          ed.appendChild(el('button', { class: 'pul sec', html: svg(IC.piu) + 'Punto', onclick: () => { const u = f.punti[f.punti.length - 1] || { x: 0, y: 0 }; f.punti.push({ x: num(u.x) + 10, y: num(u.y) }); ri(); } }));
        } else {
          ed.append(chips([['foro', 'Liscio'], ['maschio', 'Filettato'], ['alesato', 'Alesato']], f.foro || 'foro', v => { f.foro = v; if (v === 'maschio' && !(num(f.passo) > 0)) f.passo = O.passoGrosso(num(f.d)) || 1.25; ri(); }, 'Tipo di foro'));
          if (f.foro === 'maschio') ed.append(chips(MASCHI.map(([d, p]) => [d + 'x' + p, 'M' + d]), num(f.d) + 'x' + num(f.passo), v => { const [d, p] = v.split('x').map(Number); f.d = d; f.passo = p; ri(); }, 'Misura del filetto'));
          const lst = f.tipo === 'foro' ? [['x', 'X'], ['y', 'Y']] : f.tipo === 'foriCerchio' ? [['cx', 'Centro X'], ['cy', 'Centro Y'], ['dc', 'Diametro del cerchio'], ['n', 'Numero di fori', 'n.'], ['a0', 'Angolo del primo', '°']] : [['x0', 'Primo X'], ['y0', 'Primo Y'], ['nx', 'Fori in X', 'n.'], ['ny', 'Fori in Y', 'n.'], ['px', 'Passo X'], ['py', 'Passo Y']];
          ed.append(campi([['d', f.foro === 'maschio' ? 'Filetto Ø' : 'Diametro Ø']].concat(lst)));
          if (f.foro === 'maschio') ed.append(campi([['passo', 'Passo']]));
          if (f.foro === 'alesato') ed.append(chips([['H7', 'H7'], ['H8', 'H8'], ['G7', 'G7']], f.toll || 'H7', v => { f.toll = v; ri(); }, 'Tolleranza'));
          ed.append(interruttore('Passante', f.passante !== false, v => { f.passante = v; ri(); }));
          if (f.foro !== 'maschio') ed.append(interruttore('Lamatura', num(f.lamD) > 0, v => { if (v) { f.lamD = Math.round(num(f.d) * 1.6 * 2) / 2; f.lamProf = Math.round(num(f.d) * 0.6 * 2) / 2; } else { delete f.lamD; delete f.lamProf; } ri(); }), num(f.lamD) > 0 ? campi([['lamD', 'Lamatura Ø'], ['lamProf', 'Profondita lamatura']]) : el('span'));
          if (f.passante === false) ed.append(campi([['prof', 'Profondita']]));
        }
        if (f.tipo !== 'profilo' || (f.lav || 'contorno') === 'tasca' || f.lato !== 'centro') ed.append(el('div', { class: 'lav-et', testo: 'Smusso dei bordi' }), chips([['', 'No'], [0.5, 'C0,5'], [1, 'C1'], [2, 'C2']], f.smusso || '', v => { if (v) f.smusso = v; else delete f.smusso; ri(); }, 'Smusso dei bordi'));
        return ed;
      };

      // ----- passo 3: lavorazioni proposte -----
      const passoLavorazioni = () => {
        if (!prop) prop = calcolaProposta();
        if (prop.errore) { corpo.appendChild(el('p', { class: 'errore', role: 'alert', testo: prop.errore })); return; }
        const sc = L().scelte = L().scelte || {}; sc.spente = sc.spente || {}; sc.correzioni = sc.correzioni || {};
        if (prop.modo === 'tornio') {
          corpo.append(el('div', { class: 'lav-et', testo: 'Come scrivere il programma' }), chips([['passate', 'A passate'], ['ciclo', 'Con cicli fissi']], L().metodo === 'ciclo' ? 'ciclo' : 'passate', v => { L().metodo = v; prop = null; A.salva(); tutto(); }, 'Metodo del programma'));
          corpo.appendChild(el('p', { class: 'leggenda', testo: L().metodo === 'ciclo' ? 'Cicli fissi: G71/G70 profilo, G72 sfacciatura, G74 foratura, G75 gole e troncatura, G76 filetti. Programma corto, da controllare sul manuale della macchina.' : 'A passate: ogni movimento scritto per esteso, va bene su ogni controllo.' }));
        }
        corpo.appendChild(el('p', { class: 'leggenda', testo: 'Proposte dalle regole di officina. Spegni quelle che non servono; giri e avanzamento si possono correggere.' }));
        prop.fasi.forEach((f, i) => {
          const on = !sc.spente[f.chiave];
          const c = sc.correzioni[f.chiave] = sc.correzioni[f.chiave] || {};
          const tornio = prop.modo === 'tornio';
          const card = el('div', { class: 'lav-fase' + (on ? '' : ' spenta'), 'data-chiave': f.chiave }, [
            el('div', { class: 'lav-fase-testa' }, [el('span', { class: 'num', testo: String(i + 1) }), el('span', { class: 't' }, [el('b', { testo: String(f.titolo).replace(/ T\d+$/, '') }), el('small', { testo: 'T' + f.c.t + (tornio ? ' · Vc ' + fmt(f.c.vc, 0) + ' · f ' + fmt(f.c.f, 3) : ' · S' + fmt(f.c.n, 0) + ' · F' + fmt(f.c.f, 0)) })]),
              interruttore('', on, v => { if (v) delete sc.spente[f.chiave]; else sc.spente[f.chiave] = true; A.salva(); tutto(); }, null)])]);
          card.querySelector('.lav-int').setAttribute('aria-label', 'Lavorazione ' + (i + 1) + ' accesa');
          if (on) {
            const agg = () => { A.salva(); riassunto(); };
            card.appendChild(el('div', { class: 'lav-campi due' }, tornio
              ? [A.campoNum(c, 'vc', 'Vc (vuoto = ' + fmt(f.c.vc, 0) + ')', 'm/min', agg), A.campoNum(c, 'f', 'Avanzamento (vuoto = ' + fmt(f.c.f, 3) + ')', 'mm/giro', agg)]
              : [A.campoNum(c, 'n', 'Giri (vuoto = ' + fmt(f.c.n, 0) + ')', 'giri', agg), A.campoNum(c, 'f', 'Avanzamento (vuoto = ' + fmt(f.c.f, 0) + ')', 'mm/min', agg)]));
          }
          corpo.appendChild(card);
        });
        if (prop.note && prop.note.length) corpo.appendChild(el('details', { class: 'lav-note' }, [el('summary', { testo: 'Note (' + prop.note.length + ')' }), el('ul', {}, prop.note.map(t => el('li', { testo: t })))]));
        const rias = el('div', { class: 'lav-riassunto', id: 'lav-riassunto' });
        corpo.appendChild(rias);
        const riassunto = () => {
          const r = O.programmaLavoro(prop, L().scelte, { num: A.imp().numProg, nome: 'LAVORO' });
          rias.innerHTML = '';
          if (r.errore) { rias.appendChild(el('p', { class: 'errore', testo: r.errore })); return; }
          rias.append(el('div', { class: 'lav-kpi' }, [el('div', {}, [el('b', { testo: isFinite(r.tempo) ? fmt(r.tempo, 1) : '—' }), el('small', { testo: 'minuti stimati' })]), el('div', {}, [el('b', { testo: String(r.utensili.length) }), el('small', { testo: 'utensili' })]), el('div', {}, [el('b', { testo: String(r.fasi.length) }), el('small', { testo: 'lavorazioni' })])]));
        };
        riassunto();
        listaLatoB();
      };

      const listaLatoB = () => {
        if (!prop || !prop.fase2) return;
        corpo.appendChild(el('div', { class: 'sez', testo: 'Lato B (pezzo girato)' }));
        if (prop.fase2.errore) { corpo.appendChild(el('p', { class: 'errore', role: 'alert', testo: prop.fase2.errore })); return; }
        corpo.appendChild(el('div', { class: 'lav-latob' }, prop.fase2.fasi.map((f, i) => el('div', { class: 'lav-fase', 'data-chiave': f.chiave }, [el('div', { class: 'lav-fase-testa' }, [el('span', { class: 'num', testo: 'B' + (i + 1) }), el('span', { class: 't' }, [el('b', { testo: String(f.titolo).replace(/ T\d+$/, '') }), el('small', { testo: 'T' + f.c.t + ' · Vc ' + fmt(f.c.vc, 0) + ' · f ' + fmt(f.c.f, 3) })])])]))));
        prop.fase2.note.forEach(t => corpo.appendChild(A.info(A.esc(t))));
      };
      // ----- passo 4: programma -----
      const passoProgramma = () => {
        if (!prop) prop = calcolaProposta();
        if (prop.errore) { corpo.appendChild(el('p', { class: 'errore', role: 'alert', testo: prop.errore })); return; }
        const r = O.programmaLavoro(prop, L().scelte, { num: A.imp().numProg, nome: S.modo === 'tornio' ? 'ALBERO' : 'PIASTRA', numerare: A.imp().numerare });
        if (r.errore) { corpo.appendChild(el('p', { class: 'errore', role: 'alert', testo: r.errore })); return; }
        corpo.append(el('div', { class: 'lav-kpi' }, [el('div', {}, [el('b', { testo: isFinite(r.tempo) ? fmt(r.tempo, 1) : '—' }), el('small', { testo: 'minuti stimati' })]), el('div', {}, [el('b', { testo: String(r.righe.length) }), el('small', { testo: 'righe' })]), el('div', {}, [el('b', { testo: String(r.utensili.length) }), el('small', { testo: 'utensili' })])]));
        const apri = dove => {
          A.param.listato = { righe: r.righe, iso: r.righe.slice(), nome: (r.righe[1] || 'O0001').split(' ')[0], tipo: S.modo, avvisi: prop.note.concat(r.avvisi) };
          if (dove === 'simula') {
            // la simulazione sa il grezzo vero, la morsa o il mandrino, i diametri degli utensili e la forma voluta (per il confronto)
            const Lw = L(), sp = (Lw.scelte && Lw.scelte.spente) || {}, on = prop.fasi.filter(f => !sp[f.chiave]), g = Lw.grezzo || {};
            const uD = {};
            const uT = {};
            on.forEach(f => { const d = f.op === 'foratura' ? Number(f.c.dpunta) : Number(f.c.d); if (Number(f.c.t) > 0 && d > 0 && (S.modo === 'fresa' || f.op === 'foratura')) { uD[f.c.t] = d; if (f.tipoUt) uT[f.c.t] = f.tipoUt; } });
            let ing;
            if (S.modo === 'tornio') {
              const lung = prop.punti && prop.punti.length ? -Math.min(...prop.punti.map(q => Number(q.z))) : 0, lg = num(g.lg) > 0 ? num(g.lg) : lung + 40;
              ing = { gtd: g.dg, gtl: lg, gts: 1, spMandrino: Math.max(lung + 5, Math.min(lg - 10, lung + 15)), utensiliD: uD, bersaglio: { tipo: 'tornio', punti: prop.punti, fasi: on.map(f => ({ op: f.op, c: f.c })) } };
            } else ing = { glx: g.lx, gly: g.ly, glz: g.lz, spMorsa: num(g.lz) > 6 ? num(g.lz) - 3 : '', morsaIpotizzata: true, utensiliD: uD, utensiliTipo: uT, bersaglio: { tipo: 'fresa', entita: prop.entita, lz: num(g.lz) } };
            A.param.sim = { testo: r.righe.join('\n'), modo: S.modo, nome: A.param.listato.nome, ingombri: ing };
          }
          A.vai(dove);
        };
        corpo.append(el('div', { class: 'lav-azioni' }, [
          el('button', { class: 'pul grande', id: 'lav-simula', html: svg('<path d="M7 4l12 8-12 8z"/>') + 'Simula', onclick: () => apri('simula') }),
          el('button', { class: 'pul sec grande', id: 'lav-programma', html: A.icona('codice') + 'Programma ISO', onclick: () => apri('listato') })]));
        // lato B: un programma a parte (numero dopo), con la sua simulazione
        if (prop.fase2 && !prop.fase2.errore) {
          const F2 = prop.fase2;
          const apriB = dove => {
            const r2 = O.programmaLavoro(F2, L().scelte, { num: (Number(A.imp().numProg) || 1) + 1, nome: 'LATO B', numerare: A.imp().numerare });
            if (r2.errore) { A.avviso(r2.errore); return; }
            A.param.listato = { righe: r2.righe, iso: r2.righe.slice(), nome: (r2.righe[1] || 'O0002').split(' ')[0], tipo: 'tornio', avvisi: F2.note.concat(r2.avvisi) };
            if (dove === 'simula') {
              const g = L().grezzo || {};
              A.param.sim = { testo: r2.righe.join('\n'), modo: 'tornio', nome: A.param.listato.nome, ingombri: { gtd: g.dg, gtl: F2.L1, gts: r1(F2.L1 - F2.lTot), spMandrino: Math.min(F2.L1 - 3, F2.lenB + 10), bersaglio: { tipo: 'tornio', punti: F2.punti, fasi: F2.fasi.map(f => ({ op: f.op, c: f.c })) } } };
            }
            A.vai(dove);
          };
          corpo.append(el('div', { class: 'sez', testo: 'Lato B (pezzo girato): programma a parte' }), el('div', { class: 'lav-azioni' }, [
            el('button', { class: 'pul grande', id: 'lav-simula-b', html: svg('<path d="M7 4l12 8-12 8z"/>') + 'Simula lato B', onclick: () => apriB('simula') }),
            el('button', { class: 'pul sec grande', id: 'lav-programma-b', html: A.icona('codice') + 'Programma lato B', onclick: () => apriB('listato') })]));
        }
        // costo del pezzo
        const K = L().costo = L().costo || { pezzi: 1, materiale: '' };
        const ris = el('div', { class: 'lav-costo', id: 'lav-costo' });
        const calcCosto = () => {
          const c = O.costoPezzo({ tempo: r.tempo, utensili: r.utensili.length, costoOra: A.imp().costoOra, materiale: K.materiale, pezzi: K.pezzi });
          ris.innerHTML = '';
          ris.append(el('div', { class: 'lav-kpi' }, [el('div', {}, [el('b', { testo: fmt(c.pezzo, 2) + ' €' }), el('small', { testo: 'a pezzo' })]), el('div', {}, [el('b', { testo: fmt(c.lotto, 2) + ' €' }), el('small', { testo: c.pezzi + (c.pezzi === 1 ? ' pezzo' : ' pezzi') })]), el('div', {}, [el('b', { testo: fmt(c.tempoLotto, 1) }), el('small', { testo: 'minuti totali' })])]),
            el('p', { class: 'leggenda', testo: 'Stima: tempo di taglio piu 0,2 minuti a cambio utensile, a ' + fmt(A.imp().costoOra, 2) + ' €/h (cambialo in Impostazioni). Il costo del materiale lo scrivi tu.' }));
        };
        corpo.append(el('div', { class: 'sez', testo: 'Costo del pezzo' }), el('div', { class: 'lav-campi' }, [A.campoNum(K, 'pezzi', 'Numero di pezzi', 'n.', calcCosto), A.campoNum(K, 'materiale', 'Materiale a pezzo', '€', calcCosto)]), ris);
        calcCosto();
        corpo.appendChild(el('div', { class: 'sez', testo: 'Utensili da montare' }));
        corpo.appendChild(el('div', { class: 'lav-utensili' }, r.utensili.map(u => el('div', { class: 'lav-ut' }, [el('b', { testo: 'T' + u.t }), el('span', { testo: u.uso })]))));
        corpo.appendChild(el('button', { class: 'pul sec', id: 'lav-foglio', html: A.icona('salva') + 'Foglio di attrezzaggio', onclick: () => {
          const g = L().grezzo, mt = A.materiale(S.mat || 0);
          const note = 'Utensili: ' + r.utensili.map(u => 'T' + u.t + ' ' + u.uso).join('; ');
          const pz = { nome: S.modo === 'tornio' ? 'ALBERO' : 'PIASTRA', materiale: mt ? mt.n : '', grezzo: S.modo === 'tornio' ? 'barra Ø' + fmt(num(g.dg)) : fmt(num(g.lx)) + ' x ' + fmt(num(g.ly)) + ' x ' + fmt(num(g.lz)), origine: S.modo === 'tornio' ? 'Z0 sulla faccia di testa, X sull\'asse' : 'Spigolo in basso a sinistra, Z0 sulla faccia finita', misure: (prop.misure || []).map(x => ({ nome: x.nome, nominale: x.nominale, toll: x.toll })), note, foto: [] };
          const html = O.htmlFoglio(pz, [{ righe: r.righe, nome: pz.nome, tipo: S.modo }], []);
          A.param.foglio = { titolo: 'Attrezzaggio ' + pz.nome, html, nome: 'attrezzaggio-' + String(pz.nome).replace(/[^A-Za-z0-9_-]+/g, '_') + '.html' };
          A.vai('foglio');
        } }));
        corpo.appendChild(el('p', { class: 'leggenda lav-fiducia', testo: 'Programma indicativo: controllalo e provalo a vuoto prima di lavorare.' }));
      };

      // ----- insieme -----
      const tutto = () => {
        passi.querySelectorAll('button').forEach((b, i) => { b.classList.toggle('attivo', i === S.passo); b.classList.toggle('fatto', i < S.passo); if (i === S.passo) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
        corpo.innerHTML = '';
        corpo.appendChild(el('h2', { class: 'lav-titolo', testo: ['Grezzo e materiale', S.modo === 'tornio' ? 'Il pezzo, dalla testa al mandrino' : 'Tasche, fori e profili', 'Lavorazioni', 'Programma pronto'][S.passo] }));
        if (S.passo === 0) passoGrezzo();
        else if (S.passo === 1) { if (S.daDisegno) corpo.appendChild(el('div', { class: 'info avviso', id: 'lav-dal-disegno' }, [el('div', { html: A.icona('avviso') }), el('div', {}, [el('b', { testo: 'Pezzo preso dal disegno. ' }), document.createTextNode('Ricontrolla le quote con il disegno in mano, poi Avanti. '), el('button', { class: 'pul sec', style: 'padding:6px 10px;margin-top:6px', testo: 'Ho controllato', onclick: () => { S.daDisegno = false; A.salva(); tutto(); } })])])); if (S.modo === 'tornio') passoFormaTornio(); else passoFormaFresa(); if (S.ultimoTolto && S.ultimoTolto.modo === S.modo) corpo.appendChild(el('button', { class: 'pul sec', id: 'lav-ripristina', testo: 'Ripristina l\'ultimo eliminato', onclick: () => { lista().splice(Math.min(S.ultimoTolto.i, lista().length), 0, S.ultimoTolto.x); S.ultimoTolto = null; A.salva(); tutto(); } })); }
        else if (S.passo === 2) passoLavorazioni();
        else passoProgramma();
        disegnoBox.hidden = S.passo >= 2;
        indietro.disabled = S.passo === 0;
        avanti.hidden = S.passo === 3;
        avanti.textContent = S.passo === 2 ? 'Crea il programma' : 'Avanti';
        requestAnimationFrame(disegna);
      };
      A.lavoroStato = { S, tutto, disegna, zone, vaiPasso, proposta: () => (prop = calcolaProposta()) };
      tutto();
    }
  };
  window.addEventListener('resize', () => { if (A.attuale && A.attuale() === 'lavoro' && A.lavoroStato) A.lavoroStato.disegna(); });
})();
