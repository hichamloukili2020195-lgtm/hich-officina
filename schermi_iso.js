// ===== Hich-Officina: listato (cerca, modifica, invia), apertura di un programma e simulazione animata =====
(function () {
  'use strict';
  const A = window.App, O = A.O, el = A.el, esc = A.esc, fmt = A.fmt;

  const nomeFile = L => {
    if (L.nomeFile) return L.nomeFile;
    const f = A.imp().nomeFtp || 'O0001.nc';
    const base = (L.nome || 'O0001').replace(/[^A-Za-z0-9_-]/g, '') || 'O0001';
    return f === 'O0001' ? base : base + (f === 'O0001.NC' ? '.NC' : '.nc');
  };
  A.nomeFile = nomeFile;
  function salvaInArchivio(L) {
    const arch = A.mem.salvati = A.mem.salvati || [];
    const titolo = ((L.righe[1] || '').match(/\(([^)]*)\)/) || [])[1] || L.nome;
    const voce = { id: Date.now(), nome: L.nome, titolo, tipo: L.tipo, data: new Date().toISOString().slice(0, 10), righe: L.righe.slice(),
      iso: L.iso && !L.modificato ? L.iso.slice() : null, ling: L.ling || 'iso' };
    arch.unshift(voce);
    if (arch.length > 100) arch.length = 100;
    L.idSalvato = voce.id;
    A.salva(); A.avviso('Salvato in Programmi salvati');
  }
  A.salvaInArchivio = salvaInArchivio;

  /** Manda il programma alla macchina (solo nell'APK). */
  function inviaMacchina(L) {
    const I = A.imp();
    if (!A.ANDROID || !A.ANDROID.inviaFtp) { A.avviso('L\'invio alla macchina si fa dall\'app Android (APK)'); return; }
    if (!I.ftpHost) { A.avviso('Scrivi prima l\'indirizzo della macchina in Impostazioni'); A.vai('impostazioni'); return; }
    window.__ftpEsito = (ok, msg) => A.avviso(msg);
    A.avviso('Invio a ' + I.ftpHost + '...');
    A.ANDROID.inviaFtp(String(I.ftpHost), Number(I.ftpPorta) || 21, String(I.ftpUtente || ''), String(I.ftpPassword || ''), String(I.ftpCartella || ''), nomeFile(L), L.righe.join('\r\n') + '\r\n');
  }
  A.inviaMacchina = inviaMacchina;

  // ----- listato -----
  A.schermi.listato = {
    titolo: 'Programma ISO', preferibile: false,
    azioni() {
      const L = A.param.listato;
      if (!L) return [];
      return [el('button', { class: 'icona-pul', 'aria-label': 'Copia', html: A.icona('copia'), onclick: () => A.copia(L.righe.join('\n'), 'Programma') }),
        el('button', { class: 'icona-pul', 'aria-label': 'Condividi', html: A.icona('condividi'), onclick: () => A.condividiFile(nomeFile(L), L.righe.join('\r\n') + '\r\n', 'text/plain') })];
    },
    render(m) {
      const L = A.param.listato;
      if (!L) { m.appendChild(el('div', { class: 'vuoto', testo: 'Nessun programma: generane uno o aprine uno.' })); return; }
      // linguaggio della macchina (post-processor): si traduce dal programma ISO
      const modoL = L.tipo === 'tornio' ? 'tornio' : 'fresa';
      if (L.iso && !L.modificato) {
        const I = A.imp();
        if (!L.ling) L.ling = modoL === 'tornio' ? I.postTornio : I.postFresa;
        if (!O.LINGUAGGI[L.ling] || !O.LINGUAGGI[L.ling][modoL]) L.ling = 'iso';
        const tr = O.postProcessor(L.iso, { linguaggio: L.ling, modo: modoL, nome: ((L.iso[1] || '').match(/\(([^)]*)\)/) || [])[1] || L.nome });
        if (tr.errore) { L.ling = 'iso'; L.righe = L.iso.slice(); L.nomeFile = null; m.appendChild(A.info(esc(tr.errore), 'avviso')); }
        else { L.righe = tr.righe; L.nomeFile = tr.nomeFile || null; if (tr.avvisi.length) m.appendChild(A.info(esc(tr.avvisi.join(' ')), 'avviso')); }
        const sel = el('select', { id: 'f-ling' }, Object.keys(O.LINGUAGGI).filter(k => O.LINGUAGGI[k][modoL]).map(k => el('option', { value: k, testo: O.LINGUAGGI[k].nome })));
        sel.value = L.ling;
        sel.addEventListener('change', () => { L.ling = sel.value; A.ridisegna(); });
        m.appendChild(el('div', { class: 'pannello' }, [el('div', { class: 'riga-campo' }, [el('label', { for: 'f-ling', testo: 'Linguaggio della macchina' }), el('div', { class: 'ctrl' }, [sel])])]));
      } else if (L.ling && L.ling !== 'iso') m.appendChild(A.info('Programma modificato a mano nel linguaggio della macchina: non si traduce piu.'));
      if (L.riassunto) m.appendChild(el('div', { class: 'riassunto' }, L.riassunto.map(t => el('span', { testo: t }))));
      // ricerca
      const cerca = el('input', { id: 'f-cerca', type: 'search', placeholder: 'Cerca nel programma (es. T3, G83, Z-)', autocomplete: 'off', spellcheck: 'false' });
      const conta = el('span', { class: 'u' });
      let trovati = [], att = -1;
      const su = el('button', { class: 'icona-pul', 'aria-label': 'Precedente', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 15l6-6 6 6"/></svg>' });
      const giu = el('button', { class: 'icona-pul', 'aria-label': 'Successivo', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>' });
      m.appendChild(el('div', { style: 'display:flex;gap:4px;align-items:center;margin-bottom:8px' }, [el('div', { class: 'ctrl', style: 'flex:1' }, [cerca, conta]), su, giu]));
      const box = el('div', { class: 'listato' });
      const area = el('textarea', { class: 'codice-in', id: 'f-listato', spellcheck: 'false', style: 'width:100%;min-height:340px;background:var(--campo);color:var(--testo);border:1px solid var(--bordo);border-radius:12px;padding:10px', hidden: true });
      m.append(box, area);
      const disegna = () => {
        const q = cerca.value.trim().toUpperCase();
        trovati = [];
        box.innerHTML = L.righe.map((r, i) => {
          const si = q && r.toUpperCase().includes(q);
          if (si) trovati.push(i);
          return '<div' + (si ? ' class="trovato"' : '') + ' data-i="' + i + '"><span class="n">' + (i + 1) + '</span><span>' + A.colora(r) + '</span></div>';
        }).join('');
        conta.textContent = q ? (trovati.length ? trovati.length + ' righe' : 'nessuna') : '';
        att = -1;
      };
      const vaiA = d => {
        if (!trovati.length) return;
        att = (att + d + trovati.length) % trovati.length;
        box.querySelectorAll('.attuale').forEach(x => x.classList.remove('attuale'));
        const r = box.querySelector('[data-i="' + trovati[att] + '"]');
        if (r) { r.classList.add('attuale'); box.scrollTop = r.offsetTop - box.clientHeight / 2; }
        conta.textContent = (att + 1) + ' di ' + trovati.length;
      };
      cerca.addEventListener('input', disegna);
      cerca.addEventListener('keydown', e => { if (e.key === 'Enter') vaiA(1); });
      su.addEventListener('click', () => vaiA(-1)); giu.addEventListener('click', () => vaiA(1));
      disegna();
      // modifica
      const bMod = el('button', { class: 'pul sec', html: A.icona('modifica') + 'Modifica' });
      bMod.addEventListener('click', () => {
        if (area.hidden) { area.value = L.righe.join('\n'); area.hidden = false; box.hidden = true; bMod.innerHTML = A.icona('salvati') + 'Fine modifica'; area.focus(); return; }
        L.righe = area.value.replace(/\r/g, '').split('\n');
        while (L.righe.length > 1 && L.righe[L.righe.length - 1] === '') L.righe.pop();
        if (L.ling && L.ling !== 'iso') L.modificato = true; else if (L.iso) L.iso = L.righe.slice();
        if (L.idSalvato) { const v = (A.mem.salvati || []).find(x => x.id === L.idSalvato); if (v) { v.righe = L.righe.slice(); v.iso = L.modificato ? null : (L.iso || null); A.salva(); } }
        area.hidden = true; box.hidden = false; bMod.innerHTML = A.icona('modifica') + 'Modifica'; disegna();
        A.avviso(L.idSalvato ? 'Modifiche salvate' : 'Modifiche fatte: premi Tieni per salvarle');
      });
      m.appendChild(el('div', { class: 'pulsanti' }, [
        el('button', { class: 'pul', html: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Simula', onclick: () => {
          const isoOk = L.iso && !L.modificato ? L.iso : (!L.ling || L.ling === 'iso' ? L.righe : null);
          if (!isoOk) { A.avviso('La simulazione legge solo il programma ISO'); return; }
          A.param.sim = { testo: isoOk.join('\n'), modo: L.tipo === 'tornio' ? 'tornio' : L.tipo ? 'fresa' : 'auto', titolo: L.nome }; A.vai('simula');
        } }),
        bMod]));
      m.appendChild(el('div', { class: 'pulsanti' }, [
        el('button', { class: 'pul sec', html: A.icona('salva') + 'File .nc', onclick: () => A.scarica(nomeFile(L), L.righe.join('\r\n') + '\r\n') }),
        el('button', { class: 'pul sec', html: A.icona('salvati') + 'Salva in...', onclick: () => A.salvaIn(nomeFile(L), L.righe.join('\r\n') + '\r\n') })]));
      m.appendChild(el('div', { class: 'pulsanti' }, [
        el('button', { class: 'pul sec', html: A.icona('condividi') + 'Invia alla macchina', onclick: () => inviaMacchina(L) }),
        el('button', { class: 'pul sec', html: A.icona('salvati') + 'Tieni', onclick: () => salvaInArchivio(L) })]));
      m.appendChild(el('div', { class: 'pulsanti' }, [
        el('button', { class: 'pul sec', html: A.icona('tabella') + 'Foglio di attrezzaggio', onclick: () => A.foglioDaProgramma && A.foglioDaProgramma(Object.assign({}, L, { righe: L.iso && !L.modificato ? L.iso : L.righe })) })]));
      if (L.avvisi && L.avvisi.length) m.appendChild(A.info(esc(L.avvisi.join(' '))));
      m.appendChild(A.info('Controlla sempre il programma in simulazione o a vuoto prima di lavorare.', 'avviso'));
    }
  };

  // ----- apri un programma -----
  A.schermi.apri = {
    titolo: 'Apri un programma',
    render(m) {
      const v = A.sezione('apri');
      const pan = el('div', { class: 'pannello' }), esito = el('div');
      m.append(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', html: A.icona('salvati') + 'Scegli un file', onclick: () => A.scegliTesto(t => { f.metti('testo', t); analizza(); }) })]), pan,
        el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('codice') + 'Leggi il programma', onclick: () => analizza() })]), esito);
      const f = A.modulo(pan, [{ id: 'modo', et: 'Macchina', tipo: 'scelta', scelte: [['auto', 'La riconosce da sola'], ['fresa', 'Fresa'], ['tornio', 'Tornio']] },
        { id: 'testo', et: 'Programma (incollalo qui)', tipo: 'area', mono: true, righe: 10 }], v, () => {});
      const analizza = () => {
        esito.innerHTML = '';
        if (!String(v.testo || '').trim()) { esito.appendChild(A.info('Incolla un programma o scegli un file.')); return; }
        const r = O.eseguiISO(v.testo, { modo: v.modo });
        mostraAnalisi(esito, r, v.testo, 'Programma aperto');
      };
      if (String(v.testo || '').trim()) analizza();
    }
  };
  /** Riassunto di un programma letto: quote, utensili, tempo, avvisi, pulsanti. */
  function mostraAnalisi(m, r, testo, titolo) {
    if (r.errore) m.appendChild(el('p', { class: 'errore', testo: 'Il programma si ferma: ' + r.errore }));
    const Lm = r.limiti, q = (k, w) => (Lm[k][w] === null ? '—' : fmt(Lm[k][w], 3));
    m.appendChild(A.misuratore('Tempo stimato', fmt(r.tempo, r.tempo < 10 ? 1 : 0), 'min'));
    const tor = r.modo === 'tornio';
    m.appendChild(el('div', { class: 'sez', testo: 'Quote di lavoro (min / max)' }));
    m.appendChild(A.griglia([[tor ? 'X (diametro)' : 'X', q('x', 'minLavoro') + ' / ' + q('x', 'maxLavoro'), 'mm'],
      !tor ? ['Y', q('y', 'minLavoro') + ' / ' + q('y', 'maxLavoro'), 'mm'] : null, ['Z', q('z', 'minLavoro') + ' / ' + q('z', 'maxLavoro'), 'mm'],
      ['Corsa totale X', fmt(Lm.x.min, 1) + ' / ' + fmt(Lm.x.max, 1), 'mm'], ['Corsa totale Z', fmt(Lm.z.min, 1) + ' / ' + fmt(Lm.z.max, 1), 'mm']]));
    if (r.utensili.length) {
      m.appendChild(el('div', { class: 'sez', testo: 'Utensili' }));
      const tab = A.tabellaUt ? A.tabellaUt() : [];
      m.appendChild(el('div', { class: 'pannello', style: 'padding:4px 8px', html: '<div class="scorri"><table><tr><th>T</th><th>Descrizione</th><th>S</th><th>F</th><th>Lavoro</th></tr>' +
        r.utensili.map(u => { const d = tab.find(x => Number(x.t) === u.t); return '<tr><td><b>' + u.t + '</b></td><td>' + esc(d ? descrUt(d) : (u.commento || '')) + '</td><td>' + u.s.join(', ') + '</td><td>' + u.f.map(x => fmt(x, 3)).join(', ') + '</td><td>' + fmt(u.lunghezza / 1000, 2) + ' m</td></tr>'; }).join('') + '</table></div>' }));
    }
    if (r.messaggi.length) m.appendChild(A.info(r.messaggi.map(x => '<b>' + esc(x.testo) + '</b> (riga ' + (x.riga + 1) + ')').join('<br>'), 'avviso'));
    if (r.avvisi.length) m.appendChild(A.info(esc(r.avvisi.join(' · ')), 'avviso'));
    m.appendChild(el('div', { class: 'pulsanti' }, [
      el('button', { class: 'pul', html: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Simula', onclick: () => { A.param.sim = { testo, modo: r.modo, titolo }; A.vai('simula'); } }),
      el('button', { class: 'pul sec', html: A.icona('codice') + 'Listato', onclick: () => {
        const righe = String(testo).replace(/\r/g, '').split('\n');
        const nome = (righe.find(x => /^\s*O\d+/i.test(x)) || 'O0001').trim().split(/\s|\(/)[0];
        A.param.listato = { righe, nome, tipo: r.modo }; A.vai('listato');
      } })]));
    m.appendChild(A.info('Senza origini, correttori e cicli fissi del tornio: il percorso e quello scritto nel programma, a centro utensile.'));
  }
  A.mostraAnalisi = mostraAnalisi;
  function descrUt(u) {
    const tipo = (O.UTENSILI.find(x => x[0] === u.tipo) || [0, u.tipo || ''])[1];
    return (u.nome ? u.nome + ' · ' : '') + tipo + (u.d ? ' D' + fmt(O.num(u.d)) : '') + (u.l ? ' L' + fmt(O.num(u.l)) : '') + (u.z ? ' z' + u.z : '');
  }
  A.descrUt = descrUt;

  // ----- simulazione -----
  function viste(modo) { return modo === 'tornio' ? [['zx', 'Sezione']] : [['iso', '3D'], ['xy', 'Dall\'alto'], ['xz', 'Di fronte']]; }
  A.schermi.simula = {
    titolo: 'Simulazione', preferibile: false,
    render(m) {
      const P = A.param.sim;
      if (!P) { m.appendChild(el('div', { class: 'vuoto', testo: 'Apri o genera un programma, poi premi Simula.' })); return; }
      const r = P.risultato && P.risultato.testo === P.testo ? P.risultato.r : O.eseguiISO(P.testo, { modo: P.modo, vars: P.vars });
      P.risultato = { testo: P.testo, r };
      const S = r.segmenti, N = S.length;
      const sv = A.sezione('simVista');
      const modo = r.modo;
      if (!viste(modo).some(x => x[0] === sv.vista)) sv.vista = viste(modo)[0][0];
      const cv = el('canvas', { class: 'vista', style: 'height:300px', 'aria-label': 'Simulazione del percorso' });
      const schede = el('div', { class: 'schede' });
      viste(modo).forEach(([id, t]) => schede.appendChild(el('button', { 'data-id': id, testo: t, onclick: () => { sv.vista = id; A.salva(); schede.querySelectorAll('button').forEach(b => b.classList.toggle('attiva', b.dataset.id === id)); prepara(); disegna(); } })));
      schede.querySelectorAll('button').forEach(b => b.classList.toggle('attiva', b.dataset.id === sv.vista));
      const cursore = el('input', { type: 'range', min: 0, max: N, value: N, id: 'f-passo', style: 'width:100%;accent-color:var(--accento)', 'aria-label': 'Avanzamento della simulazione' });
      const stato = el('div', { class: 'chiamata', style: 'white-space:pre-wrap;font-size:13px' });
      const b = (svg, et, fn) => el('button', { class: 'icona-pul', 'aria-label': et, html: '<svg viewBox="0 0 24 24" fill="currentColor">' + svg + '</svg>', onclick: fn });
      let k = N, gira = false, timer = null;
      const vel = el('select', { id: 'f-vel', 'aria-label': 'Velocita' });
      [['1', 'x1'], ['4', 'x4'], ['16', 'x16'], ['64', 'x64'], ['256', 'x256']].forEach(([v, t]) => vel.appendChild(el('option', { value: v, testo: t })));
      vel.value = sv.vel || '4';
      vel.addEventListener('change', () => { sv.vel = vel.value; A.salva(); });
      const bPlay = b('<path d="M8 5v14l11-7z"/>', 'Avvia', () => (gira ? ferma() : avvia()));
      const comandi = el('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:4px;margin:6px 0' }, [
        b('<path d="M6 6h2v12H6zM9.5 12l8.5 6V6z"/>', 'Dall\'inizio', () => { ferma(); vai(0); }),
        b('<path d="M15 6l-8 6 8 6z"/>', 'Passo indietro', () => { ferma(); vai(Math.max(0, k - 1)); }),
        bPlay,
        b('<path d="M9 6l8 6-8 6z"/>', 'Passo avanti', () => { ferma(); vai(Math.min(N, k + 1)); }),
        b('<path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/>', 'Alla fine', () => { ferma(); vai(N); }),
        el('div', { class: 'ctrl', style: 'flex:0 0 auto;min-width:76px' }, [vel])]);
      m.append(schede, cv, cursore, comandi, stato);
      const sotto = el('div');
      m.appendChild(sotto);
      // riassunto sotto la simulazione
      if (P.macro) {
        const vv = Object.keys(r.vars).filter(n => Number(n) >= 100).map(n => '<tr><td>#' + n + '</td><td>' + fmt(r.vars[n], 4) + '</td></tr>').join('');
        if (r.messaggi.length) sotto.appendChild(A.info(r.messaggi.map(x => '<b>' + esc(x.testo) + '</b> (riga ' + (x.riga + 1) + ')').join('<br>'), 'avviso'));
        if (vv) sotto.appendChild(el('div', { class: 'pannello', style: 'padding:4px 8px;margin-top:10px', html: '<div class="sez" style="margin:6px 0">Variabili alla fine</div><table>' + vv + '</table>' }));
        if (r.errore) sotto.appendChild(el('p', { class: 'errore', testo: r.errore }));
        if (r.avvisi.length) sotto.appendChild(A.info(esc(r.avvisi.join(' · ')), 'avviso'));
      } else mostraAnalisi(sotto, r, P.testo, P.titolo);
      // proiezione
      let proj = null;
      const prepara = () => {
        const v = sv.vista;
        const c30 = Math.cos(Math.PI / 6);
        let f;
        if (v === 'iso') f = (x, y, z) => [(x - y) * c30, -(x + y) * 0.5 - z];
        else if (v === 'xy') f = (x, y) => [x, -y];
        else if (v === 'xz') f = (x, y, z) => [x, -z];
        else f = (x, y, z) => [z, -x / 2];
        // area: tutti i punti di lavoro e i rapidi vicini al pezzo
        const pts = [];
        const zMaxL = r.limiti.z.maxLavoro !== null ? r.limiti.z.maxLavoro : 0;
        S.forEach(s => { if (!s.rapido || modo === 'tornio' || s.z <= zMaxL + 10) { pts.push(f(s.x0, s.y0, s.z0)); pts.push(f(s.x, s.y, s.z)); } });
        if (!pts.length) S.forEach(s => pts.push(f(s.x, s.y, s.z)));
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        proj = { f, mx: Math.min(...xs), Mx: Math.max(...xs), my: Math.min(...ys), My: Math.max(...ys) };
        if (modo === 'tornio') proj.My = Math.max(proj.My, 0);
      };
      const colore = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      const disegna = () => {
        const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 340, H = cv.clientHeight || 300;
        cv.width = W * dpr; cv.height = H * dpr;
        const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        if (!N || !proj) return;
        const sc = Math.min((W - 30) / ((proj.Mx - proj.mx) || 1), (H - 30) / ((proj.My - proj.my) || 1));
        const ox = (W - (proj.Mx - proj.mx) * sc) / 2 - proj.mx * sc, oy = (H - (proj.My - proj.my) * sc) / 2 - proj.my * sc;
        const P2 = (x, y, z) => { const q = proj.f(x, y, z); return [ox + q[0] * sc, oy + q[1] * sc]; };
        // asse del tornio
        if (modo === 'tornio') { g.strokeStyle = colore('--tenue'); g.setLineDash([8, 4, 2, 4]); g.beginPath(); g.moveTo(0, oy); g.lineTo(W, oy); g.stroke(); g.setLineDash([]); }
        const acc = colore('--accento2'), ten = colore('--tenue'), fatti = colore('--ok');
        // tutto il percorso, tenue
        g.lineWidth = 1; g.globalAlpha = 0.35;
        g.beginPath();
        S.forEach(s => { if (s.rapido) return; const a = P2(s.x0, s.y0, s.z0), c = P2(s.x, s.y, s.z); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); });
        g.strokeStyle = acc; g.stroke();
        g.globalAlpha = 1;
        // fatto fin qui
        g.lineWidth = 1.6; g.beginPath();
        for (let i = 0; i < k; i++) { const s = S[i]; if (s.rapido) continue; const a = P2(s.x0, s.y0, s.z0), c = P2(s.x, s.y, s.z); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); }
        g.strokeStyle = fatti; g.stroke();
        g.setLineDash([4, 4]); g.lineWidth = 1; g.beginPath();
        for (let i = Math.max(0, k - 200); i < k; i++) { const s = S[i]; if (!s.rapido) continue; const a = P2(s.x0, s.y0, s.z0), c = P2(s.x, s.y, s.z); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); }
        g.strokeStyle = ten; g.stroke(); g.setLineDash([]);
        // utensile
        const cur = k > 0 ? S[k - 1] : S[0];
        const px = k > 0 ? [cur.x, cur.y, cur.z] : [cur.x0, cur.y0, cur.z0];
        const p = P2(...px);
        g.fillStyle = colore('--avviso'); g.strokeStyle = colore('--avviso'); g.lineWidth = 3;
        g.beginPath(); g.arc(p[0], p[1], 5, 0, Math.PI * 2); g.fill();
        if (modo !== 'tornio' && sv.vista !== 'xy') { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0], p[1] - 34); g.stroke(); }
        // testo dello stato
        const riga = k > 0 ? cur.riga : (S[0] ? S[0].riga : 0);
        stato.textContent = 'Riga ' + (riga + 1) + ':  ' + (r.righe[riga] || '').trim() + '\n' +
          (modo === 'tornio' ? 'X' + fmt(px[0], 3) + '  Z' + fmt(px[2], 3) : 'X' + fmt(px[0], 3) + '  Y' + fmt(px[1], 3) + '  Z' + fmt(px[2], 3)) +
          '   T' + (cur.t || 0) + '  F' + fmt(cur.f, 3) + '   ' + k + ' / ' + N;
      };
      const vai = i => { k = i; cursore.value = String(i); disegna(); };
      const passo = () => {
        const n = Number(vel.value) || 4;
        if (k >= N) { ferma(); return; }
        vai(Math.min(N, k + n));
      };
      const avvia = () => { if (k >= N) k = 0; gira = true; bPlay.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>'; bPlay.setAttribute('aria-label', 'Pausa'); timer = setInterval(passo, 40); };
      const ferma = () => { gira = false; clearInterval(timer); bPlay.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'; bPlay.setAttribute('aria-label', 'Avvia'); };
      cursore.addEventListener('input', () => { ferma(); vai(Number(cursore.value)); });
      A.simFerma = ferma;
      prepara(); disegna();
      if (!N) stato.textContent = r.errore ? 'Errore: ' + r.errore : 'Nessun movimento da simulare.';
      else if (!P.fermo) { k = 0; avvia(); }
    }
  };
  window.addEventListener('hashchange', () => { if (A.simFerma && location.hash !== '#simula') A.simFerma(); });
})();
