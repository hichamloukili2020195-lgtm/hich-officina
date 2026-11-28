// ===== Hich-Officina: "Ripassa il profilo" sulla foto del disegno =====
// Tornio: 1 tocchi l'asse (la linea tratto e punto), 2 ripassi col dito il profilo sopra l'asse; fresa: ripassi il
// contorno tutto intorno. L'app raddrizza il tratto (rette, spigoli, archi), lo aggancia alle linee del disegno e prende
// le misure dalle quote lette vicino al profilo; quelle che non tornano restano misurate sulla foto, da controllare.
// Due dita: ingrandisci e sposta. Il risultato va nel disegno del tornio o nel CAD della fresa, dove si corregge.
(function () {
  'use strict';
  const A = window.App, O = A.O, el = A.el, fmt = A.fmt;
  const col = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
  const svg = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';

  /**
   * Monta la vista dentro box. ctx = {S (sezione dalDisegno), img: () => immagine caricata o null, quote: () => quote lette,
   * radice: contenitore per lo schermo intero}. Ritorna {aggiorna}.
   */
  A.profiloFoto = function (box, ctx) {
    const S = ctx.S;
    const P = S.prof = S.prof || {};
    if (!P.modo) P.modo = S.modo === 'fresa' ? 'fresa' : 'tornio';
    if (!Array.isArray(P.tratti)) P.tratti = [];
    if (P.aggancia === undefined) P.aggancia = true;
    let vista = { z: 1, x: 0, y: 0 }, tratto = null, dita = new Map(), pinch = null, scegliScala = false;
    let pixel = null, pixelDi = null, ris = null, mod = null;

    const passi = el('div', { class: 'pf-passi', 'aria-live': 'polite' });
    const scelte = el('div', { class: 'chips', role: 'group', 'aria-label': 'Macchina' });
    const tela = el('canvas', { class: 'pf-tela', 'aria-label': 'Foto del disegno: ripassa il profilo col dito, due dita per ingrandire' });
    const barra = el('div', { class: 'chips pf-barra' });
    const esito = el('div', { class: 'pf-esito' });
    const aiuto = el('p', { class: 'pf-aiuto' });
    box.append(scelte, passi, el('div', { class: 'dd-foto pf-foto' }, [tela]), aiuto, barra, esito);

    // ----- pixel della foto: per agganciare le linee e trovare l'asse -----
    const scuro = (x, y) => {
      if (!pixel) return 0;
      const xi = Math.round(x), yi = Math.round(y);
      if (xi < 0 || yi < 0 || xi >= pixel.width || yi >= pixel.height) return 0;
      const k = (yi * pixel.width + xi) * 4, d = pixel.data;
      const lum = 0.3 * d[k] + 0.59 * d[k + 1] + 0.11 * d[k + 2];
      return Math.max(0, Math.min(1, (200 - lum) / 140));
    };
    const caricaPixel = img => {
      if (!img || pixelDi === img) return;
      pixelDi = img;
      try { const c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); pixel = g.getImageData(0, 0, c.width, c.height); } catch (e) { pixel = null; }
    };

    // ----- calcolo -----
    const iw = img => img.naturalWidth || img.width, ih = img => img.naturalHeight || img.height;
    const perSchermo = img => iw(img) / ((tela.clientWidth || 340) * vista.z);   // pixel della foto per pixel dello schermo
    const calcola = () => {
      const img = ctx.img(); ris = null; mod = null;
      if (!img) return;
      const pts = [].concat(...P.tratti);
      if (pts.length < 2 || (P.modo === 'tornio' && !(P.asseY > 0))) return;
      const ps = iw(img) / (tela.clientWidth || 340);   // tolleranza in pixel della foto: 3 pixel dello schermo senza zoom
      mod = O.raddrizza(pts, { tol: 3 * ps / Math.max(1, Math.min(4, P.zTratto || 1)) });
      if (P.aggancia && pixel) mod = O.agganciaBordi(mod, scuro, Math.max(4, Math.round(5 * ps)));
      ris = P.modo === 'tornio' ? O.profiloTornio(mod, P.asseY, ctx.quote(), iw(img), ih(img), { k: P.k, testa: P.testa })
        : O.profiloFresa(mod, ctx.quote(), iw(img), ih(img), { k: P.k });
    };

    // ----- disegno -----
    const daFoto = (img, W) => { const s = W / iw(img) * vista.z; return { s, ox: vista.x, oy: vista.y }; };
    const disegna = () => {
      const img = ctx.img();
      const W = tela.clientWidth || 340, H = img ? Math.round(W * ih(img) / iw(img)) : 160, dpr = window.devicePixelRatio || 1;
      tela.style.height = H + 'px'; tela.width = Math.round(W * dpr); tela.height = Math.round(H * dpr);
      const g = tela.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      if (!img) { g.fillStyle = col('--tenue'); g.font = '14px system-ui'; g.textAlign = 'center'; g.fillText('Fai una foto del disegno, dritta e senza riflessi', W / 2, H / 2); return; }
      const t = daFoto(img, W), X = x => t.ox + x * t.s, Y = y => t.oy + y * t.s;
      g.drawImage(img, t.ox, t.oy, iw(img) * t.s, ih(img) * t.s);
      g.fillStyle = 'rgba(11,18,32,0.18)'; g.fillRect(0, 0, W, H);
      // quote lette: puntini (verdi se usate)
      const usate = new Set(ris && ris.usate || []), vicine = new Set(ris && ris.quoteVicine || []);
      (ctx.quote() || []).forEach(q => {
        if (q.stato === 'no') return;
        g.fillStyle = usate.has(q.id) ? col('--ok') : vicine.has(q.id) ? col('--avviso') : 'rgba(150,160,180,0.6)';
        g.beginPath(); g.arc(X(q.x * iw(img)), Y(q.y * ih(img)), usate.has(q.id) ? 5 : 3.5, 0, 7); g.fill();
      });
      // asse
      if (P.modo === 'tornio' && P.asseY > 0) {
        g.strokeStyle = col('--accento2'); g.lineWidth = 2; g.setLineDash([14, 5, 3, 5]);
        g.beginPath(); g.moveTo(0, Y(P.asseY)); g.lineTo(W, Y(P.asseY)); g.stroke(); g.setLineDash([]);
      }
      // tratti a mano
      g.strokeStyle = 'rgba(255,150,40,0.85)'; g.lineWidth = 2;
      P.tratti.concat(tratto ? [tratto] : []).forEach(tr => { g.beginPath(); tr.forEach((p, i) => (i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y)))); g.stroke(); });
      // profilo corretto (e la sua meta sotto l'asse, per il tornio)
      if (mod && mod.vertici.length > 1) {
        const linea = (spec) => {
          g.beginPath();
          mod.vertici.forEach((p, i) => {
            const y = spec ? 2 * P.asseY - p.y : p.y;
            if (!i) { g.moveTo(X(p.x), Y(y)); return; }
            const l = mod.lati[i - 1];
            if (l.tipo === 'arco' && l.m) {
              const a = mod.vertici[i - 1], m = { x: l.m.x, y: spec ? 2 * P.asseY - l.m.y : l.m.y }, c = O.cerchioPerPunti([{ x: a.x, y: spec ? 2 * P.asseY - a.y : a.y }, m, { x: p.x, y }]);
              if (c) {
                const a0 = Math.atan2((spec ? 2 * P.asseY - a.y : a.y) - c.cy, a.x - c.cx), a1 = Math.atan2(y - c.cy, p.x - c.cx), am = Math.atan2(m.y - c.cy, m.x - c.cx);
                const norm = v => ((v - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
                g.arc(X(c.cx), Y(c.cy), c.r * t.s, a0, a1, norm(am) > norm(a1));
                return;
              }
            }
            g.lineTo(X(p.x), Y(y));
          });
          g.stroke();
        };
        g.lineJoin = 'round'; g.lineCap = 'round';
        g.strokeStyle = col('--ok'); g.lineWidth = 4; linea(false);
        g.fillStyle = col('--ok'); mod.vertici.forEach(p => { g.beginPath(); g.arc(X(p.x), Y(p.y), 4, 0, 7); g.fill(); });
        if (P.modo === 'tornio') { g.globalAlpha = 0.5; g.lineWidth = 2; g.setLineDash([6, 4]); linea(true); g.setLineDash([]); g.globalAlpha = 1; }
      }
    };

    // ----- tocchi: un dito disegna, due dita ingrandiscono e spostano -----
    const inFoto = e => { const img = ctx.img(), b = tela.getBoundingClientRect(), t = daFoto(img, b.width); return { x: (e.clientX - b.left - t.ox) / t.s, y: (e.clientY - b.top - t.oy) / t.s }; };
    const limita = () => { const W = tela.clientWidth || 340, H = tela.clientHeight || 200; vista.z = Math.max(1, Math.min(8, vista.z)); vista.x = Math.min(0, Math.max(W - W * vista.z, vista.x)); vista.y = Math.min(0, Math.max(H - H * vista.z, vista.y)); };
    tela.style.touchAction = 'none';
    tela.addEventListener('pointerdown', e => {
      if (!ctx.img()) return;
      tela.setPointerCapture && tela.setPointerCapture(e.pointerId);
      dita.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (dita.size === 2) {   // due dita: niente tratto, si ingrandisce
        tratto = null;
        const [a, b] = Array.from(dita.values());
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, z: vista.z, vx: vista.x, vy: vista.y };
        return;
      }
      if (dita.size > 1) return;
      const p = inFoto(e);
      if (scegliScala) { tocca(p); return; }
      if (P.modo === 'tornio' && !(P.asseY > 0)) {   // passo 1: l'asse
        const img = ctx.img(), r = Math.round(12 * perSchermo(img));
        P.asseY = pixel ? O.trovaAsse(p.y, scuro, Math.max(0, p.x - iw(img) * 0.25), Math.min(iw(img) - 1, p.x + iw(img) * 0.25), r) : p.y;
        A.salva(); aggiorna(); return;
      }
      tratto = [p];
    });
    tela.addEventListener('pointermove', e => {
      if (!dita.has(e.pointerId)) return;
      dita.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && dita.size === 2) {
        const [a, b] = Array.from(dita.values()), bb = tela.getBoundingClientRect();
        const z = pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / (pinch.d || 1), mx = (a.x + b.x) / 2 - bb.left, my = (a.y + b.y) / 2 - bb.top;
        const px0 = pinch.mx - bb.left, py0 = pinch.my - bb.top;
        vista.z = z; vista.x = mx - (px0 - pinch.vx) * z / pinch.z; vista.y = my - (py0 - pinch.vy) * z / pinch.z;
        limita(); disegna(); return;
      }
      if (tratto) { tratto.push(inFoto(e)); disegna(); }
    });
    const fine = e => {
      dita.delete(e.pointerId);
      if (pinch) { if (dita.size < 2) pinch = null; return; }
      if (tratto && tratto.length > 2) { P.tratti.push(tratto.map(p => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }))); P.zTratto = vista.z; A.salva(); }
      tratto = null; aggiorna();
    };
    tela.addEventListener('pointerup', fine); tela.addEventListener('pointercancel', fine);

    // scala scritta a mano: si tocca un tratto del profilo corretto e si scrive quanto misura
    const tocca = async p => {
      scegliScala = false;
      if (!mod) return;
      let meglio = null, dm = Infinity;
      mod.lati.forEach((l, i) => {
        const a = mod.vertici[i], b = mod.vertici[i + 1], vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy || 1;
        const u = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / L2)), d = Math.hypot(a.x + u * vx - p.x, a.y + u * vy - p.y);
        if (d < dm) { dm = d; meglio = { l, a, b }; }
      });
      const img = ctx.img();
      if (!meglio || dm > 25 * perSchermo(img)) { A.avviso('Tocca una linea verde del profilo'); aggiorna(); return; }
      const diam = P.modo === 'tornio' && meglio.l.dir === 'h';
      const t = await A.chiedi(diam ? 'Diametro di questo tratto (mm)' : 'Lunghezza di questo tratto (mm)', { nota: 'Lo leggi sul disegno: da questa misura l\'app ricava tutte le altre' });
      const v = O.num(t);
      if (!(v > 0)) { aggiorna(); return; }
      const px = diam ? 2 * Math.abs(P.asseY - meglio.a.y) : Math.hypot(meglio.b.x - meglio.a.x, meglio.b.y - meglio.a.y);
      if (px > 1) { P.k = v / px; A.salva(); }
      aggiorna();
    };

    // ----- comandi -----
    const comandi = () => {
      scelte.innerHTML = '';
      [['tornio', 'Tornio'], ['fresa', 'Fresa']].forEach(([k, t]) => scelte.appendChild(el('button', { class: 'chip' + (P.modo === k ? ' attiva' : ''), 'data-pf-modo': k, testo: t, onclick: () => { if (P.modo === k) return; P.modo = k; P.tratti = []; P.k = undefined; A.salva(); aggiorna(); } })));
      barra.innerHTML = '';
      const b = (id, testo, fn, on) => barra.appendChild(el('button', { class: 'chip' + (on ? ' attiva' : ''), id, testo, onclick: fn }));
      if (P.tratti.length) b('pf-annulla', 'Annulla l\'ultimo tratto', () => { P.tratti.pop(); A.salva(); aggiorna(); });
      if (P.tratti.length || P.asseY) b('pf-ricomincia', 'Ricomincia', () => { P.tratti = []; P.asseY = undefined; P.k = undefined; A.salva(); aggiorna(); });
      if (P.modo === 'tornio' && P.asseY > 0) b('pf-asse', 'Sposta l\'asse', () => { P.asseY = undefined; A.salva(); aggiorna(); });
      if (P.modo === 'tornio' && P.tratti.length) b('pf-testa', P.testa === 'sinistra' ? 'Testa a sinistra' : 'Testa a destra', () => { P.testa = P.testa === 'sinistra' ? 'destra' : 'sinistra'; A.salva(); aggiorna(); });
      b('pf-aggancia', 'Aggancia alle linee: ' + (P.aggancia ? 'si' : 'no'), () => { P.aggancia = !P.aggancia; A.salva(); aggiorna(); }, P.aggancia);
      if (mod) b('pf-scala', P.k ? 'Scala scritta a mano: cambia' : 'Scrivi una misura', () => { scegliScala = true; aiuto.textContent = 'Tocca una linea verde del profilo e scrivi quanto misura.'; });
      if (vista.z > 1) b('pf-zoom', 'Vista intera', () => { vista = { z: 1, x: 0, y: 0 }; disegna(); comandi(); });
      b('pf-pieno', document.body.classList.contains('cad-pieno') ? 'Esci dallo schermo intero' : 'Schermo intero', () => { A.schermoPieno(ctx.radice, () => aggiorna()); });
    };

    const mostraEsito = () => {
      esito.innerHTML = '';
      const img = ctx.img();
      if (!img) return;
      const passo = P.modo === 'tornio' && !(P.asseY > 0) ? 1 : !P.tratti.length ? 2 : 3;
      passi.innerHTML = '';
      const nPassi = P.modo === 'tornio' ? ['Tocca l\'asse', 'Ripassa il profilo', 'Controlla e crea'] : ['Ripassa il contorno', 'Controlla e crea'];
      const att = P.modo === 'tornio' ? passo : Math.max(1, passo - 1);
      passi.appendChild(el('ol', { class: 'pf-passo' }, nPassi.map((t, i) => el('li', { class: i + 1 === att ? 'ora' : i + 1 < att ? 'fatto' : '', testo: t }))));
      aiuto.textContent = (passo === 1 ? 'Tocca la linea dell\'asse del pezzo (tratto e punto): l\'app la trova anche se tocchi vicino.'
        : passo === 2 ? (P.modo === 'tornio' ? 'Ripassa col dito il contorno del pezzo sopra l\'asse, dalla testa al mandrino. Anche a mano libera: l\'app raddrizza le linee. Con due dita ingrandisci; puoi staccare il dito e continuare.'
          : 'Ripassa col dito il contorno del pezzo, tutto intorno, e torna al punto di partenza. Con due dita ingrandisci.')
          : 'La linea verde e il profilo corretto. Se non va: Annulla l\'ultimo tratto e ripassa quel pezzo.');
      if (!ris) return;
      if (ris.errore) {
        esito.appendChild(A.info(A.esc(ris.errore), 'avviso'));
        if (ris.serveScala) esito.appendChild(el('button', { class: 'pul', id: 'pf-scrivi', html: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>') + 'Scrivi una misura', onclick: () => { scegliScala = true; aiuto.textContent = 'Tocca una linea verde del profilo e scrivi quanto misura.'; } }));
        return;
      }
      const daQuota = ris.misure.filter(x => x.fonte !== 'foto').length, daFoto = ris.misure.length - daQuota;
      esito.appendChild(el('div', { class: 'sez', testo: 'Il profilo' + (P.k ? ' (scala scritta a mano)' : '') }));
      esito.appendChild(el('div', { class: 'pf-misure' }, ris.misure.map(x => el('span', { class: 'pf-mis ' + (x.fonte === 'foto' ? 'foto' : 'quota'), title: x.fonte === 'foto' ? 'Misurata sulla foto: controllala' : 'Dalla quota del disegno', testo: x.testo }))));
      esito.appendChild(el('p', { class: 'leggenda', testo: daQuota + ' misure dalle quote del disegno' + (daFoto ? ', ' + daFoto + ' misurate sulla foto (in arancione: controllale)' : '') + '.' }));
      if (ris.dubbi.length) esito.appendChild(A.info('<b>Da controllare:</b><br>' + ris.dubbi.map(A.esc).join('<br>'), 'avviso'));
      const crea = P.modo === 'tornio'
        ? el('button', { class: 'pul grande', id: 'pf-crea', html: A.icona('avanti') + 'Apri nel disegno del tornio', onclick: () => {
          const D = A.sezione('disegno');
          // filetto, gola e tolleranza passano sulla linea (il punto alla fine del tratto), come nel disegno del tornio
          D.punti = ris.punti.map(p => {
            const o = { x: String(p.x), z: String(p.z) };
            if (p.tratto) { o.tratto = p.tratto; o.r = String(p.r); }
            ['fil', 'gola', 'golaProf'].forEach(k => { if (p[k] > 0) o[k] = String(p[k]); });
            ['filFam', 'filNome', 'toll'].forEach(k => { if (p[k]) o[k] = p[k]; });
            return o;
          });
          const dMax = Math.max(...ris.punti.map(p => p.x)), lTot = Math.max(...ris.punti.map(p => -p.z));
          D.dg = String(O.barraPer ? O.barraPer(dMax) : Math.ceil(dMax + 3)); D.lg = String(Math.ceil(lTot + 5)); D.vista = '2D';
          if (S.mat !== undefined) D.mat = S.mat;
          A.salva(); A.vai('disegno'); A.avviso('Profilo dalla foto: controlla le misure');
        } })
        : el('button', { class: 'pul grande', id: 'pf-crea', html: A.icona('avanti') + 'Apri nel CAD della fresa', onclick: () => {
          const C = A.sezione('cad');
          if (!Array.isArray(C.entita)) C.entita = [];
          C.prossimo = Math.max(C.prossimo || 0, 1 + Math.max(0, ...C.entita.map(e => e.id || 0)));
          C.entita.push({ id: C.prossimo++, tipo: 'poli', punti: ris.punti.map(p => { const o = { x: p.x, y: p.y }; if (p.tratto) { o.tratto = p.tratto; o.r = p.r; } return o; }), chiuso: true, lav: [{ op: 'contorno', prof: 5, lato: 'esterno' }] });
          A.salva(); A.vai('cad'); A.avviso('Contorno dalla foto: controlla le misure e la profondita');
        } });
      esito.appendChild(crea);
    };

    const aggiorna = () => {
      const img = ctx.img();
      caricaPixel(img);
      calcola(); comandi(); mostraEsito();
      requestAnimationFrame(disegna);
    };
    aggiorna();
    return { aggiorna };
  };
})();
