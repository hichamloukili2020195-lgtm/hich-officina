// ===== Hich-Officina: dal disegno (foto) al pezzo, con la conferma di ogni quota =====
// 1 foto del disegno; 2 l'app legge le quote e dove stanno (nell'APK; nel browser si toccano e si scrivono a mano);
// 3 ogni quota numerata sulla foto si conferma, si corregge o si scarta; 4 il pezzo va nel lavoro guidato.
// Finche c'e una quota da controllare il pezzo non si crea.
(function () {
  'use strict';
  const A = window.App, O = A.O, el = A.el, fmt = A.fmt;
  const col = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
  const NOMI = { diametro: 'Diametro', lunghezza: 'Lunghezza', filetto: 'Filetto', fori: 'Fori ripetuti', gruppoFori: 'Fori (richiamo)', smusso: 'Smusso', raggio: 'Raggio', tolleranza: 'Tolleranza', angolo: 'Angolo', cava: 'Fresatura (larghezza x profondita)', lamatura: 'Lamatura', profondita: 'Profondita' };
  const svg = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';

  /** Rimpicciolisce una foto (data URL) per la lettura: al massimo 2000 pixel sul lato lungo. */
  function perLettura(dato) {
    return new Promise(ok => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, 2000 / Math.max(im.width, im.height));
        const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        ok(c.toDataURL('image/jpeg', 0.9));
      };
      im.onerror = () => ok(dato);
      im.src = dato;
    });
  }

  A.schermi.dalDisegno = {
    titolo: 'Dal disegno al pezzo',
    render(m) {
      const S = A.sezione('dalDisegno');
      if (!Array.isArray(S.quote)) S.quote = [];
      let img = null, sel = null, aggiungi = false;
      const tela = el('canvas', { class: 'dd-tela', 'aria-label': 'Foto del disegno con le quote trovate: tocca una quota per sceglierla' });
      const stato = el('div', { class: 'dd-stato', 'aria-live': 'polite' });
      const lista = el('div', { class: 'dd-lista' });
      const proposta = el('div', { class: 'dd-proposta' });
      const barraFoto = el('div', { class: 'pulsanti dd-barra' });
      const bAggiungi = el('button', { class: 'pul sec', id: 'dd-aggiungi', html: svg('<path d="M12 5v14M5 12h14"/>') + 'Aggiungi una quota', onclick: () => { aggiungi = !aggiungi; bAggiungi.classList.toggle('attiva', aggiungi); stato.textContent = aggiungi ? 'Tocca la foto dove c\'e la quota da aggiungere.' : ''; } });
      // due modi: ripassare il profilo sulla foto (consigliato) oppure controllare le quote una per una
      if (!S.vista) S.vista = 'profilo';
      const schede = el('div', { class: 'schede dd-schede' });
      [['profilo', 'Ripassa il profilo'], ['quote', 'Solo le quote']].forEach(([k, t]) => schede.appendChild(el('button', { id: 'dd-vista-' + k, 'data-id': k, testo: t, onclick: () => { S.vista = k; A.salva(); tutto(); } })));
      const profBox = el('div', { class: 'dd-profilo' }), quoteBox = el('div', { class: 'dd-quote' });
      quoteBox.append(el('div', { class: 'dd-foto' }, [tela]), barraFoto, lista, proposta);
      m.append(A.pulsantiFoto({ id: 'f-disegno', dopo: f => carica(f[0]) }), schede, stato, profBox, quoteBox);
      barraFoto.append(bAggiungi);
      const profilo = A.profiloFoto ? A.profiloFoto(profBox, { S, img: () => img, quote: () => S.quote, radice: m }) : null;

      // ----- foto: si tiene con le altre (IndexedDB), si legge, si disegna -----
      const carica = async file => {
        try {
          const id = await A.riduciFoto(file);
          if (S.foto) A.Foto.togli(S.foto);
          S.foto = id; S.quote = []; S.letta = false; sel = null; A.salva();
          await mostraFoto();
          leggi();
        } catch (e) { A.avviso('Foto non caricata: ' + e.message); }
      };
      const mostraFoto = async () => {
        if (!S.foto) { img = null; tutto(); return; }
        const dato = await A.Foto.prendi(S.foto);
        if (!dato) { img = null; tutto(); return; }
        await new Promise(ok => { const im = new Image(); im.onload = () => { img = im; ok(); }; im.onerror = () => ok(); im.src = dato; });
        tutto();
      };
      const leggi = async () => {
        const dato = S.foto ? await A.Foto.prendi(S.foto) : null;
        if (!dato) return;
        if (!A.ANDROID || !A.ANDROID.leggiImmagine) {
          stato.textContent = 'La lettura automatica e nell\'app Android. Qui tocca "Aggiungi una quota" e poi la foto, e scrivi la quota.';
          return;
        }
        stato.textContent = 'Leggo il disegno…';
        window.__righeLette = (r, errore) => {
          window.__righeLette = null;
          if (errore || !r) { stato.textContent = errore || 'Nel disegno non ho trovato testo.'; return; }
          const Q = O.quoteDaRighe(r.righe || [], r.w, r.h);
          S.quote = Q; S.letta = true;
          S.modo = O.modoDalDisegno(Q);
          const mt = O.materialeDa(r.righe || [], A.materiali());
          if (mt !== null) S.mat = String(mt);
          A.salva();
          const nv = Q.filter(q => q.stato !== 'no').length;
          if (S.vista !== 'quote') stato.textContent = nv ? 'Lette ' + nv + ' quote: servono a dare le misure giuste al profilo che ripassi.' : 'Non ho letto quote: dopo il profilo scrivi tu una misura.';
          else stato.textContent = Q.length ? 'Trovate ' + Q.length + ' quote. Controllale una per una: ✓ giusta, ✗ da scartare, oppure correggi il testo.' : 'Non ho trovato quote: aggiungile a mano.';
          tutto();
        };
        A.ANDROID.leggiImmagine(await perLettura(dato));
      };

      // ----- disegno della foto con le quote numerate -----
      const zone = [];
      const disegna = () => {
        const W = tela.clientWidth || 340;
        const H = img ? Math.round(W * img.height / img.width) : 160;
        const dpr = window.devicePixelRatio || 1;
        tela.style.height = H + 'px';
        tela.width = Math.round(W * dpr); tela.height = Math.round(H * dpr);
        const g = tela.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        zone.length = 0;
        if (!img) { g.fillStyle = col('--tenue'); g.font = '14px system-ui'; g.textAlign = 'center'; g.fillText('Fai una foto del disegno, dritta e senza riflessi', W / 2, H / 2); return; }
        g.drawImage(img, 0, 0, W, H);
        S.quote.forEach((q, i) => {
          const x = (q.x - q.w / 2) * W, y = (q.y - q.h / 2) * H, w = Math.max(14, q.w * W), h = Math.max(12, q.h * H);
          const c = q.stato === 'ok' ? col('--ok') : q.stato === 'no' ? col('--errore') : col('--avviso');
          g.lineWidth = q.id === sel ? 3.5 : 2; g.strokeStyle = c; g.globalAlpha = q.stato === 'no' ? 0.55 : 1;
          g.strokeRect(x - 2, y - 2, w + 4, h + 4);
          const n = String(i + 1);
          g.font = '700 12px system-ui';
          const bw = g.measureText(n).width + 10, bx = Math.max(0, x - bw / 2 - 2), by = Math.max(0, y - 18);
          g.fillStyle = c; g.beginPath(); g.roundRect ? g.roundRect(bx, by, bw, 16, 8) : g.rect(bx, by, bw, 16); g.fill();
          g.fillStyle = '#0b1220'; g.textAlign = 'center'; g.fillText(n, bx + bw / 2, by + 12);
          g.globalAlpha = 1;
          zone.push({ x0: Math.min(bx, x - 2), y0: by, x1: Math.max(bx + bw, x + w + 2), y1: y + h + 2, id: q.id });
        });
      };
      tela.addEventListener('click', async e => {
        if (!img) return;
        const b = tela.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
        if (aggiungi) {
          aggiungi = false; bAggiungi.classList.remove('attiva');
          const t = await A.chiedi('Scrivi la quota', { nota: 'Per esempio Ø20 h6, 25, M8x1.25, 4xØ8.5, 1x45°, R2' });
          if (!t || !String(t).trim()) { stato.textContent = ''; return; }
          const Q = O.quoteDaRighe([{ t: String(t), x: x / b.width - 0.03, y: y / b.height - 0.015, w: 0.06, h: 0.03, r: 0 }], 1, 1);
          if (!Q.length) { A.avviso('Non e una quota che conosco: ' + t); return; }
          const base = Math.max(0, ...S.quote.map(q => q.id)) + 1;
          Q.forEach((q, k) => S.quote.push(Object.assign(q, { id: base + k, stato: 'ok', aMano: true })));
          stato.textContent = 'Quota aggiunta.';
          A.salva(); tutto(); return;
        }
        const z = zone.filter(q => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1)[0];
        if (!z) return;
        sel = z.id; tutto();
        const c = lista.querySelector('[data-q="' + z.id + '"]'); if (c) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });

      // ----- elenco delle quote da controllare -----
      const scheda = (q, i) => {
        const inp = el('input', { type: 'text', value: q.testo, 'aria-label': 'Quota ' + (i + 1), id: 'dd-q-' + q.id, autocomplete: 'off', spellcheck: 'false' });
        inp.addEventListener('change', () => {
          const Q = O.quoteDaTesto(inp.value);
          if (!Q.length) { A.avviso('Non e una quota che conosco: ' + inp.value); inp.value = q.testo; return; }
          const nuova = Q.find(z => z.tipo === 'gruppoFori') || Q.find(z => z.tipo === 'fori') || Q.find(z => z.tipo === 'diametro') || Q.find(z => z.tipo === 'filetto') || Q[0];
          ['valore', 'd', 'p', 'n', 'toll', 'filetto', 'passo', 'foro', 'lamD', 'lamProf', 'prof', 'passante', 'equidistanti', 'a180', 'spina', 'larghezza'].forEach(k => delete q[k]);
          Object.assign(q, nuova, { stato: 'ok' });
          A.salva(); tutto();
        });
        const metti = st => { q.stato = q.stato === st ? 'da' : st; sel = q.id; A.salva(); tutto(); };
        return el('div', { class: 'dd-q ' + q.stato + (q.id === sel ? ' scelta' : ''), 'data-q': q.id }, [
          el('span', { class: 'num', testo: String(i + 1) }),
          el('div', { class: 'dd-q-c' }, [el('small', { testo: (NOMI[q.tipo] || q.tipo) + (q.motivo && q.stato === 'no' ? ' · scartata: ' + q.motivo : '') }), inp]),
          el('button', { class: 'dd-si' + (q.stato === 'ok' ? ' on' : ''), 'aria-label': 'Quota ' + (i + 1) + ' giusta', 'aria-pressed': q.stato === 'ok' ? 'true' : 'false', html: svg('<path d="M5 13l4 4L19 7"/>'), onclick: () => metti('ok') }),
          el('button', { class: 'dd-no' + (q.stato === 'no' ? ' on' : ''), 'aria-label': 'Scarta la quota ' + (i + 1), 'aria-pressed': q.stato === 'no' ? 'true' : 'false', html: svg('<path d="M6 6l12 12M18 6L6 18"/>'), onclick: () => metti('no') })]);
      };

      // ----- il pezzo che ne esce -----
      const pezzo = () => (S.modo === 'tornio' ? O.proponiTornio(S.quote, { invertito: !!S.invertito }) : O.proponiFresa(S.quote));
      const mostraProposta = () => {
        proposta.innerHTML = '';
        if (!S.quote.length) return;
        proposta.appendChild(el('div', { class: 'sez', testo: 'Il pezzo' }));
        proposta.appendChild(el('div', { class: 'chips', role: 'group', 'aria-label': 'Macchina' }, [['tornio', 'Tornio'], ['fresa', 'Fresa']].map(([k, t]) => el('button', { class: 'chip' + (S.modo === k ? ' attiva' : ''), 'data-modo': k, testo: t, onclick: () => { S.modo = k; A.salva(); tutto(); } }))));
        const p = pezzo();
        if (p.errore) { proposta.appendChild(el('p', { class: 'errore', testo: p.errore })); return; }
        if (S.modo === 'tornio') {
          proposta.appendChild(el('button', { class: 'pul sec', id: 'dd-inverti', testo: 'Inverti testa e mandrino', onclick: () => { S.invertito = !S.invertito; A.salva(); tutto(); } }));
          proposta.appendChild(el('ol', { class: 'dd-pezzo' }, p.tratti.map(t => el('li', { testo: 'Ø' + fmt(t.d, 3) + (t.toll ? ' ' + t.toll : '') + ' · L ' + (t.l === '' ? '?' : fmt(t.l, 3)) + (t.fil ? ' · filetto M' + fmt(t.d) + 'x' + fmt(t.fil) : '') + (t.gola ? ' · gola ' + fmt(t.gola) : '') }))));
          proposta.appendChild(el('p', { class: 'leggenda', testo: 'Barra Ø' + fmt(p.grezzo.dg) + (p.smussoTesta ? ' · smusso di testa ' + p.smussoTesta : '') + ' · dalla testa verso il mandrino' }));
        } else {
          proposta.appendChild(el('p', { testo: (p.tondo ? 'Pezzo tondo Ø' + p.grezzo.lx : 'Pezzo ' + (p.grezzo.lx || '?') + ' x ' + (p.grezzo.ly || '?')) + ' · spessore ' + (p.grezzo.lz || '?') }));
          const descr = f => (f.tipo === 'foriCerchio' ? f.n + ' fori ' : f.tipo === 'foriGriglia' ? (f.nx * f.ny) + ' fori ' : f.tipo === 'foro' ? '1 foro ' : '') + (f.foro === 'maschio' ? 'M' + fmt(f.d) : f.tipo === 'tascaTonda' ? 'tasca Ø' + fmt(f.dt) : 'Ø' + fmt(f.d)) + (f.toll ? ' ' + f.toll : '') +
            (f.passante === false && f.prof ? ' prof. ' + fmt(f.prof) : f.tipo !== 'tascaTonda' ? ' passanti' : '') + (f.lamD ? ', lamatura Ø' + fmt(f.lamD) + ' prof. ' + fmt(f.lamProf) : '') + (f.tipo === 'foriCerchio' ? ' su Ø' + fmt(f.dc) + ', primo a ' + fmt(f.a0) + '°' : '');
          proposta.appendChild(el('ol', { class: 'dd-pezzo' }, p.forme.map(f => el('li', { testo: descr(f) }))));
        }
        if (p.dubbi.length) proposta.appendChild(A.info('<b>Da controllare:</b><br>' + p.dubbi.map(A.esc).join('<br>'), 'avviso'));
        const daFare = S.quote.filter(q => q.stato === 'da').length;
        const crea = el('button', { class: 'pul grande', id: 'dd-crea', html: A.icona('avanti') + 'Crea il pezzo', disabled: daFare > 0, onclick: () => {
          const L = A.sezione('lavoro');
          L.modo = S.modo; if (S.mat !== undefined) L.mat = S.mat;
          if (S.modo === 'tornio') L.tornio = { grezzo: p.grezzo, tratti: p.tratti, smussoTesta: p.smussoTesta === undefined ? 'C0.5' : p.smussoTesta, troncatura: true, scelte: {} };
          else L.fresa = { grezzo: p.grezzo, forme: p.forme, scelte: {} };
          L.passo = 1; L.aperta = null; L.usato = true; L.daDisegno = true;
          A.salva(); A.vai('lavoro'); A.avviso('Pezzo dal disegno: controlla le quote');
        } });
        proposta.append(daFare ? el('p', { class: 'leggenda', id: 'dd-mancano', testo: 'Prima controlla le quote: ne mancano ' + daFare + '.' }) : el('span'), crea);
      };

      const tutto = () => {
        const prof = S.vista !== 'quote' && !!profilo;
        schede.querySelectorAll('button').forEach(x => x.classList.toggle('attiva', x.dataset.id === (prof ? 'profilo' : 'quote')));
        profBox.hidden = !prof; quoteBox.hidden = prof;
        if (prof) { profilo.aggiorna(); return; }
        lista.innerHTML = '';
        if (S.quote.length) {
          const daFare = S.quote.filter(q => q.stato === 'da').length;
          lista.appendChild(el('div', { class: 'dd-testa' }, [el('div', { class: 'sez', style: 'margin:0', testo: 'Quote (' + S.quote.length + ')' }),
            daFare ? el('button', { class: 'pul sec', id: 'dd-tutte', testo: 'Giuste tutte le ' + daFare + ' rimaste', onclick: () => { S.quote.forEach(q => { if (q.stato === 'da') q.stato = 'ok'; }); A.salva(); tutto(); } }) : el('span')]));
          S.quote.forEach((q, i) => lista.appendChild(scheda(q, i)));
        } else if (img && S.letta !== false) lista.appendChild(el('div', { class: 'vuoto', testo: 'Nessuna quota: aggiungile toccando la foto.' }));
        bAggiungi.hidden = !img;
        mostraProposta();
        requestAnimationFrame(disegna);
      };
      A.ddStato = { S, tutto, leggi };
      mostraFoto();
    }
  };
  window.addEventListener('resize', () => { if (A.attuale && A.attuale() === 'dalDisegno' && A.ddStato) A.ddStato.tutto(); });
})();
