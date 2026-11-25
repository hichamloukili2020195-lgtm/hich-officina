// ===== Hich-Officina: tabella utensili, pezzi (attrezzaggio, note, foto, misure), copia di sicurezza =====
(function () {
  'use strict';
  const A = window.App, O = A.O, el = A.el, esc = A.esc, fmt = A.fmt;
  // La tabella sta in mem.tabellaUt. (2.4.0 la metteva in mem.utensili, dove la schermata "Utensili e dati di taglio"
  // tiene i suoi campi: si recupera da li se e una lista.)
  const utensili = () => {
    if (!Array.isArray(A.mem.tabellaUt)) {
      A.mem.tabellaUt = Array.isArray(A.mem.utensili) ? A.mem.utensili : [];
      if (Array.isArray(A.mem.utensili)) delete A.mem.utensili;
      A.salva();
    }
    return A.mem.tabellaUt;
  };
  A.tabellaUt = utensili;
  const pezzi = () => (A.mem.pezzi = A.mem.pezzi || []);
  const oggi = () => new Date().toISOString().slice(0, 10);
  let conferme = {};
  const conferma = (chiave, testo) => {
    if (conferme[chiave]) { delete conferme[chiave]; return true; }
    conferme[chiave] = true; A.avviso(testo || 'Premi ancora per confermare'); setTimeout(() => { delete conferme[chiave]; }, 3000); return false;
  };

  // ----- tabella utensili -----
  A.schermi.tabellaUtensili = {
    titolo: 'Tabella utensili',
    render(m) {
      const L = utensili().slice().sort((a, b) => Number(a.t) - Number(b.t));
      if (!L.length) m.appendChild(el('div', { class: 'vuoto', html: 'Nessun utensile.<br>Aggiungi i tuoi: poi in Nuovo programma ISO li scegli e si riempiono numero T, diametro e taglienti.' }));
      const lista = el('div', { class: 'elenco' });
      L.forEach(u => lista.appendChild(el('button', { class: 'elem', onclick: () => { A.param.utensile = u.id; A.vai('utensile'); } }, [
        el('span', { class: 'ic', testo: 'T' + u.t }), el('span', { class: 't' }, [el('b', { testo: A.descrUt(u) }), el('small', { testo: u.note || '' })]),
        el('span', { class: 'fine', html: A.icona('modifica') })])));
      m.appendChild(lista);
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('piu') + 'Aggiungi utensile', onclick: () => {
        const usati = utensili().map(x => Number(x.t));
        let t = 1; while (usati.includes(t)) t++;
        const u = { id: 'u' + Date.now(), t, tipo: 'fresa', d: 10, z: 3, l: 50, nome: '', note: '' };
        utensili().push(u); A.salva(); A.param.utensile = u.id; A.vai('utensile');
      } })]));
      if (L.length) m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', html: A.icona('condividi') + 'Condividi la tabella', onclick: () => {
        const testo = 'T;Tipo;Nome;Diametro;Lunghezza;Taglienti;Raggio punta;Passo;Note\n' + L.map(u => [u.t, (O.UTENSILI.find(x => x[0] === u.tipo) || [0, u.tipo])[1], u.nome, u.d, u.l, u.z, u.r, u.passo, u.note].map(x => String(x === undefined ? '' : x).replace(/;/g, ',')).join(';')).join('\n');
        A.condividiFile('tabella-utensili.csv', testo, 'text/csv');
      } })]));
    }
  };
  A.schermi.utensile = {
    titolo: 'Utensile', preferibile: false,
    render(m) {
      const u = utensili().find(x => x.id === A.param.utensile);
      if (!u) { A.vai('tabellaUtensili'); return; }
      const v = Object.assign({}, u);
      const pan = el('div', { class: 'pannello' }), msg = el('div');
      m.append(pan, msg);
      A.modulo(pan, [{ id: 't', et: 'Numero T', sub: 'posto nel magazzino o sulla torretta' }, { id: 'tipo', et: 'Tipo', tipo: 'scelta', scelte: O.UTENSILI },
        { id: 'nome', et: 'Nome', sub: 'es. fresa 3 taglienti alluminio', tipo: 'testo' }, { id: 'd', et: 'Diametro', u: 'mm' },
        { id: 'l', et: 'Lunghezza sporgente', u: 'mm' }, { id: 'z', et: 'Taglienti', u: 'z' }, { id: 'r', et: 'Raggio punta / spigolo', u: 'mm' },
        { id: 'passo', et: 'Passo (maschio)', u: 'mm', se: x => x.tipo === 'maschio' }, { id: 'note', et: 'Note', tipo: 'testo', largo: true }], v, () => {});
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('salvati') + 'Salva', onclick: () => {
        const t = Math.round(O.num(v.t));
        if (!(t >= 0 && t <= 9999)) { msg.innerHTML = '<p class="errore">Numero T da 0 a 9999.</p>'; return; }
        if (utensili().some(x => x.id !== u.id && Number(x.t) === t)) { msg.innerHTML = '<p class="errore">Il T' + t + ' e gia nella tabella.</p>'; return; }
        if (v.tipo !== 'inserto' && !(O.num(v.d) > 0)) { msg.innerHTML = '<p class="errore">Scrivi il diametro.</p>'; return; }
        Object.assign(u, { t, tipo: v.tipo, nome: String(v.nome || '').trim(), d: O.num(v.d) || '', l: O.num(v.l) || '', z: Math.round(O.num(v.z)) || '', r: O.num(v.r) || '', passo: O.num(v.passo) || '', note: String(v.note || '') });
        A.salva(); A.avviso('Utensile salvato'); A.vai('tabellaUtensili');
      } })]));
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul peric', html: A.icona('cestino') + 'Elimina', onclick: () => {
        if (!conferma('ut' + u.id, 'Premi ancora Elimina per confermare')) return;
        A.mem.tabellaUt = utensili().filter(x => x.id !== u.id); A.salva(); A.vai('tabellaUtensili');
      } })]));
    }
  };
  /** Le scelte per il campo "Dalla tabella" di Nuovo programma ISO, filtrate per tipo. */
  A.scelteTabella = tipi => [['', utensili().length ? '— scegli dalla tabella —' : 'Tabella utensili vuota']].concat(utensili()
    .filter(u => !tipi || tipi.includes(u.tipo)).sort((a, b) => a.t - b.t).map(u => [u.id, 'T' + u.t + ' ' + A.descrUt(u)]));
  A.utensileDa = id => utensili().find(x => x.id === id);

  // ----- tolleranze scritte a mano -----
  const leggiTolleranza = O.leggiTolleranza;
  A.leggiTolleranza = leggiTolleranza;
  /** Esito di una misura: {ok, scarto (mm, rispetto al limite superato), testo}. */
  function esitoMisura(nom, tol, misurato) {
    if (!(isFinite(misurato))) return null;
    const max = nom + tol.sup, min = nom + tol.inf;
    if (misurato > max + 1e-9) return { ok: false, alto: true, scarto: misurato - max, testo: 'FUORI: alta di ' + fmt(misurato - max, 3) };
    if (misurato < min - 1e-9) return { ok: false, alto: false, scarto: min - misurato, testo: 'FUORI: bassa di ' + fmt(min - misurato, 3) };
    const meta = (max + min) / 2;
    return { ok: true, scarto: misurato - meta, testo: 'BUONA (' + (misurato - meta >= 0 ? '+' : '') + fmt(misurato - meta, 3) + ' dal centro)' };
  }
  A.esitoMisura = esitoMisura;
  O.esitoMisura = esitoMisura;

  // ----- pezzi -----
  A.schermi.pezzi = {
    titolo: 'Pezzi e attrezzaggio',
    render(m) {
      const L = pezzi();
      if (!L.length) m.appendChild(el('div', { class: 'vuoto', html: 'Nessun pezzo.<br>Un pezzo tiene insieme programmi, utensili, origine, note, foto e misure da controllare.' }));
      const lista = el('div', { class: 'elenco' });
      L.forEach(p => lista.appendChild(el('button', { class: 'elem', onclick: () => { A.param.pezzo = p.id; A.vai('pezzo'); } }, [
        el('span', { class: 'ic', html: A.icona('galleria') }), el('span', { class: 't' }, [el('b', { testo: p.nome || 'Pezzo' }),
          el('small', { testo: [p.disegno, p.materiale, (p.programmi || []).length + ' programmi', (p.foto || []).length + ' foto'].filter(Boolean).join(' · ') })]),
        el('span', { class: 'fine', html: A.icona('avanti') })])));
      m.appendChild(lista);
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('piu') + 'Nuovo pezzo', onclick: () => {
        const p = { id: 'p' + Date.now(), nome: 'Pezzo ' + (L.length + 1), disegno: '', materiale: '', grezzo: '', origine: 'G54: spigolo in basso a sinistra, Z0 sulla faccia sopra', fissaggio: '', note: '', programmi: [], foto: [], misure: [], controlli: [], data: oggi() };
        pezzi().unshift(p); A.salva(); A.param.pezzo = p.id; A.vai('pezzo');
      } })]));
    }
  };
  A.schermi.pezzo = {
    titolo: 'Pezzo', preferibile: false,
    render(m) {
      const p = pezzi().find(x => x.id === A.param.pezzo);
      if (!p) { A.vai('pezzi'); return; }
      const pan = el('div', { class: 'pannello' });
      m.append(el('div', { class: 'sez', testo: 'Dati del pezzo' }), pan);
      A.modulo(pan, [{ id: 'nome', et: 'Nome', tipo: 'testo' }, { id: 'disegno', et: 'Disegno / codice', tipo: 'testo' },
        { id: 'materiale', et: 'Materiale', tipo: 'testo' }, { id: 'grezzo', et: 'Grezzo', sub: 'es. 100 x 60 x 25 oppure D40 x 80', tipo: 'testo' },
        { id: 'origine', et: 'Origine', tipo: 'testo', largo: true }, { id: 'origTipo', et: 'Posizione dell\'origine (schema nel foglio)', tipo: 'scelta', scelte: ORIGINI }, { id: 'fissaggio', et: 'Fissaggio', sub: 'morsa, griffe, attrezzatura...', tipo: 'testo', largo: true }, { id: 'sporg', et: 'Sporgenza dal serraggio', u: 'mm', sub: 'quanto il pezzo esce dalla morsa o dalle griffe' },
        { id: 'note', et: 'Note', tipo: 'area', righe: 4 }], p, () => {});
      // programmi collegati
      m.appendChild(el('div', { class: 'sez', testo: 'Programmi' }));
      const progBox = el('div', { class: 'elenco' });
      m.appendChild(progBox);
      const salvati = A.mem.salvati || [];
      const disegnaProg = () => {
        progBox.innerHTML = '';
        (p.programmi || []).forEach(id => {
          const s = salvati.find(x => x.id === id);
          if (!s) return;
          progBox.appendChild(el('div', { style: 'display:flex;gap:6px;align-items:center' }, [
            el('button', { class: 'elem', style: 'flex:1;min-width:0', onclick: () => { A.param.listato = { righe: s.righe, nome: s.nome, tipo: s.tipo, idSalvato: s.id, iso: s.iso || null, ling: s.ling || 'iso', modificato: !s.iso && s.ling && s.ling !== 'iso' }; A.vai('listato'); } }, [
              el('span', { class: 'ic', testo: s.tipo === 'tornio' ? 'T' : 'F' }), el('span', { class: 't' }, [el('b', { testo: s.titolo || s.nome }), el('small', { testo: s.nome + ' · ' + s.righe.length + ' righe' })])]),
            el('button', { class: 'icona-pul', 'aria-label': 'Togli dal pezzo', html: A.icona('cestino'), onclick: () => { p.programmi = p.programmi.filter(x => x !== id); A.salva(); disegnaProg(); } })]));
        });
        const liberi = salvati.filter(s => !(p.programmi || []).includes(s.id));
        if (liberi.length) {
          const sel = el('select', { id: 'f-aggiungiProg' }, [el('option', { value: '', testo: '+ Collega un programma salvato' })].concat(liberi.map(s => el('option', { value: String(s.id), testo: s.nome + ' ' + (s.titolo || '') }))));
          sel.addEventListener('change', () => { if (!sel.value) return; p.programmi = (p.programmi || []).concat(Number(sel.value)); A.salva(); disegnaProg(); });
          progBox.appendChild(el('div', { class: 'ctrl' }, [sel]));
        } else if (!(p.programmi || []).length) progBox.appendChild(A.info('Nessun programma salvato da collegare: genera un programma e premi Tieni.'));
      };
      disegnaProg();
      // foto
      m.appendChild(el('div', { class: 'sez', testo: 'Foto' }));
      const fotoBox = el('div', { class: 'foto-griglia' });
      m.append(fotoBox, A.pulsantiFoto({ id: 'f-foto', multiple: true, dopo: async files => {
        for (const f of files) {
          try { const id = await A.riduciFoto(f); p.foto = (p.foto || []).concat(id); A.salva(); } catch (e) { A.avviso('Foto non aggiunta: ' + e.message); }
        }
        disegnaFoto();
      } }));
      const disegnaFoto = () => {
        fotoBox.innerHTML = '';
        (p.foto || []).forEach(id => {
          const img = el('img', { alt: 'Foto del pezzo', loading: 'lazy' });
          A.Foto.prendi(id).then(d => { if (d) img.src = d; });
          const dd = (p.dida || {})[id];
          fotoBox.appendChild(el('button', { class: 'foto', 'aria-label': 'Apri la foto' + (dd ? ': ' + dd : ''), onclick: () => apriFoto(id, img.src) }, [img, dd ? el('span', { class: 'foto-dida', testo: dd }) : null].filter(Boolean)));
        });
      };
      const apriFoto = (id, src) => {
        const vel = el('div', { class: 'velo', onclick: e => { if (e.target === vel) vel.remove(); } }, [
          el('img', { src, alt: 'Foto del pezzo' }),
          el('div', { class: 'chips foto-chips', role: 'group', 'aria-label': 'Didascalia della foto' }, [''].concat(DIDA).map(t => el('button', { class: 'chip' + (((p.dida || {})[id] || '') === t ? ' attiva' : ''), 'data-dida': t, testo: t || 'Nessuna', onclick: () => { p.dida = p.dida || {}; if (t) p.dida[id] = t; else delete p.dida[id]; A.salva(); vel.remove(); disegnaFoto(); } }))),
          el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', testo: 'Chiudi', onclick: () => vel.remove() }),
            el('button', { class: 'pul peric', html: A.icona('cestino') + 'Elimina', onclick: () => {
              if (!conferma('foto' + id, 'Premi ancora per eliminare la foto')) return;
              p.foto = p.foto.filter(x => x !== id); A.Foto.togli(id); A.salva(); vel.remove(); disegnaFoto();
            } })])]);
        document.body.appendChild(vel);
      };
      disegnaFoto();
      // misure
      m.appendChild(el('div', { class: 'sez', testo: 'Misure da controllare' }));
      const misBox = el('div', { class: 'pannello pieno' });
      m.appendChild(misBox);
      const disegnaMisure = () => {
        misBox.innerHTML = '';
        misBox.appendChild(el('div', { class: 'par-riga mis', style: 'font-size:11.5px;color:var(--tenue)' }, [el('span', { testo: 'Quota' }), el('span', { testo: 'Nominale' }), el('span', { testo: 'Toll.' }), el('span')]));
        (p.misure || []).forEach((q, i) => {
          const N = el('input', { value: q.nome || '', 'aria-label': 'Nome quota ' + (i + 1), autocomplete: 'off' });
          const V = el('input', { value: q.nominale === undefined ? '' : String(q.nominale), inputmode: 'decimal', 'aria-label': 'Nominale ' + (i + 1) });
          const T = el('input', { value: q.toll || '', 'aria-label': 'Tolleranza ' + (i + 1), autocomplete: 'off', spellcheck: 'false' });
          N.addEventListener('input', () => { q.nome = N.value; A.salva(); });
          V.addEventListener('input', () => { q.nominale = V.value; A.salva(); });
          T.addEventListener('input', () => { q.toll = T.value; A.salva(); });
          misBox.appendChild(el('div', { class: 'par-riga mis' }, [N, V, T, el('button', { class: 'icona-pul', 'aria-label': 'Togli quota', html: A.icona('cestino'), onclick: () => { p.misure.splice(i, 1); A.salva(); disegnaMisure(); } })]));
        });
        misBox.appendChild(el('button', { class: 'pul sec', style: 'margin-top:6px', html: A.icona('piu') + 'Aggiungi quota', onclick: () => {
          p.misure = (p.misure || []).concat({ nome: 'Quota ' + ((p.misure || []).length + 1), nominale: '', toll: '' }); A.salva(); disegnaMisure();
        } }));
        misBox.appendChild(el('p', { class: 'leggenda', style: 'margin:8px 0 0', testo: 'Tolleranza: H7, g6, ±0,05 oppure +0,1 -0,05.' }));
      };
      disegnaMisure();
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('tolleranza') + 'Controlla le misure', onclick: () => { A.vai('misure'); } })]));
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('tabella') + 'Foglio di attrezzaggio', onclick: () => foglio(p) })]));
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul peric', html: A.icona('cestino') + 'Elimina il pezzo', onclick: () => {
        if (!conferma('pezzo' + p.id, 'Premi ancora per eliminare il pezzo')) return;
        (p.foto || []).forEach(id => A.Foto.togli(id));
        A.mem.pezzi = pezzi().filter(x => x.id !== p.id); A.salva(); A.vai('pezzi');
      } })]));
    }
  };

  // ----- controllo misure -----
  A.schermi.misure = {
    titolo: 'Controllo misure', preferibile: false,
    render(m) {
      const p = pezzi().find(x => x.id === A.param.pezzo);
      if (!p) { A.vai('pezzi'); return; }
      const Q = (p.misure || []).filter(q => O.num(q.nominale) > 0 || O.num(q.nominale) === 0 && String(q.nominale).trim() !== '');
      if (!Q.length) { m.appendChild(el('div', { class: 'vuoto', html: 'Nessuna quota.<br>Aggiungile nel pezzo: nome, nominale e tolleranza.' })); return; }
      m.appendChild(el('div', { class: 'sez', testo: p.nome }));
      const valori = {};
      const righe = [];
      const pan = el('div', { class: 'pannello' });
      m.appendChild(pan);
      Q.forEach((q, i) => {
        const nom = O.num(q.nominale), tol = leggiTolleranza(nom, q.toll);
        const ing = el('input', { id: 'f-mis' + i, inputmode: 'decimal', autocomplete: 'off', placeholder: 'misurata' });
        const esito = el('div', { class: 'esito' });
        const limiti = tol.errore ? tol.errore : fmt(nom + tol.inf, 3) + ' … ' + fmt(nom + tol.sup, 3);
        pan.appendChild(el('div', { class: 'riga-campo' }, [el('label', { for: 'f-mis' + i }, [q.nome || ('Quota ' + (i + 1)), el('small', { testo: fmt(nom, 3) + ' ' + (q.toll || '') + ' → ' + limiti })]),
          el('div', { style: 'flex:0 1 52%;min-width:120px;display:flex;flex-direction:column;gap:4px' }, [el('div', { class: 'ctrl' }, [ing, el('span', { class: 'u', testo: 'mm' })]), esito])]));
        ing.addEventListener('input', () => {
          valori[i] = O.num(ing.value);
          const e = tol.errore ? null : esitoMisura(nom, tol, valori[i]);
          esito.textContent = e ? e.testo : '';
          esito.className = 'esito ' + (e ? (e.ok ? 'buona' : 'fuori') : '');
        });
        righe.push({ q, nom, tol });
      });
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('salvati') + 'Salva il controllo', onclick: () => {
        const voce = { data: new Date().toLocaleString('it-IT'), valori: righe.map((r, i) => ({ nome: r.q.nome, misurato: isFinite(valori[i]) ? valori[i] : null, ok: isFinite(valori[i]) && !r.tol.errore ? esitoMisura(r.nom, r.tol, valori[i]).ok : null })) };
        p.controlli = [voce].concat(p.controlli || []).slice(0, 30); A.salva(); A.avviso('Controllo salvato'); A.ridisegna();
      } })]));
      if ((p.controlli || []).length) {
        m.appendChild(el('div', { class: 'sez', testo: 'Controlli fatti' }));
        m.appendChild(el('div', { class: 'pannello', style: 'padding:4px 8px', html: '<div class="scorri"><table><tr><th>Data</th>' + Q.map(q => '<th>' + esc(q.nome || '') + '</th>').join('') + '</tr>' +
          p.controlli.map(c => '<tr><td>' + esc(c.data) + '</td>' + Q.map(q => { const v = c.valori.find(x => x.nome === q.nome); return '<td class="' + (v && v.ok === false ? 'fuori' : '') + '">' + (v && v.misurato !== null ? fmt(v.misurato, 3) : '') + '</td>'; }).join('') + '</tr>').join('') + '</table></div>' }));
      }
    }
  };

  // ----- foglio di attrezzaggio -----
  const DIDA = ['Morsa', 'Origine', 'Utensili', 'Pezzo', 'Altro'];
  const ORIGINI = [['bs', 'Angolo in basso a sinistra'], ['as', 'Angolo in alto a sinistra'], ['c', 'Centro del pezzo']];
  /** Schema dell'origine in SVG: dall'alto per la fresa, di lato per il tornio. */
  function schemaOrigine(p) {
    const nums = String(p.grezzo || '').replace(/,/g, '.').match(/\d+(?:\.\d+)?/g) || [];
    const d = p.dim || {};
    if (p.modo === 'tornio') {
      const dg = Number(d.dg) || Number(nums[0]) || 40, lg = Number(d.lg) || Number(nums[1]) || 80, k = Math.min(200 / lg, 80 / dg), w = lg * k, h = dg * k, x0 = 60, y0 = 20;
      return '<svg viewBox="0 0 340 130" width="340" height="130" role="img" aria-label="Schema dell\'origine al tornio"><rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h + '" fill="#dfe8f5" stroke="#1f3a66"/>' +
        '<rect x="14" y="' + (y0 - 8) + '" width="' + (x0 - 14) + '" height="' + (h + 16) + '" fill="#bbb" stroke="#555"/><text x="18" y="' + (y0 + h / 2 + 3) + '" font-size="9" fill="#333">griffe</text>' +
        '<line x1="8" y1="' + (y0 + h / 2) + '" x2="' + (x0 + w + 30) + '" y2="' + (y0 + h / 2) + '" stroke="#999" stroke-dasharray="6 3 1 3"/>' +
        '<line x1="' + (x0 + w) + '" y1="' + (y0 - 12) + '" x2="' + (x0 + w) + '" y2="' + (y0 + h + 12) + '" stroke="#d33" stroke-width="1.6"/><text x="' + (x0 + w - 10) + '" y="' + (y0 + h + 24) + '" font-size="10" fill="#d33">Z0 faccia</text>' +
        '<text x="' + (x0 + w + 6) + '" y="' + (y0 + h / 2 - 4) + '" font-size="9" fill="#555">asse X0</text>' +
        '<text x="' + (x0 + w / 2 - 22) + '" y="' + (y0 + 12) + '" font-size="9" fill="#1f3a66">Ø' + dg + ' · L' + lg + '</text></svg>';
    }
    const lx = Number(d.lx) || Number(nums[0]) || 100, ly = Number(d.ly) || Number(nums[1]) || 60, k = Math.min(220 / lx, 110 / ly), w = lx * k, h = ly * k, x0 = 50, y0 = 14;
    const tipo = ORIGINI.some(q => q[0] === p.origTipo) ? p.origTipo : 'bs';
    const ox = tipo === 'c' ? x0 + w / 2 : x0, oy = tipo === 'as' ? y0 : tipo === 'c' ? y0 + h / 2 : y0 + h;
    const dirY = tipo === 'as' ? 1 : -1;
    return '<svg viewBox="0 0 340 150" width="340" height="150" role="img" aria-label="Schema dell\'origine alla fresa"><rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h + '" fill="#dfe8f5" stroke="#1f3a66"/>' +
      '<line x1="' + ox + '" y1="' + oy + '" x2="' + (ox + 46) + '" y2="' + oy + '" stroke="#d33" stroke-width="2"/><text x="' + (ox + 48) + '" y="' + (oy + 4) + '" font-size="11" fill="#d33">X</text>' +
      '<line x1="' + ox + '" y1="' + oy + '" x2="' + ox + '" y2="' + (oy + dirY * 46) + '" stroke="#d33" stroke-width="2"/><text x="' + (ox - 4) + '" y="' + (oy + dirY * 56) + '" font-size="11" fill="#d33">Y</text>' +
      '<circle cx="' + ox + '" cy="' + oy + '" r="4" fill="#d33"/><text x="' + (ox + 7) + '" y="' + (oy + (dirY < 0 ? 14 : -6)) + '" font-size="10" fill="#d33">X0 Y0</text>' +
      '<text x="' + (x0 + w + 10) + '" y="' + (y0 + 12) + '" font-size="9" fill="#555">vista dall\'alto</text><text x="' + (x0 + w + 10) + '" y="' + (y0 + 25) + '" font-size="9" fill="#555">' + lx + ' x ' + ly + '</text><text x="' + (x0 + w + 10) + '" y="' + (y0 + 38) + '" font-size="9" fill="#555">Z0 sopra</text></svg>';
  }
  function htmlFoglio(p, programmi, foto) {
    const tab = utensili();
    const st = 'body{font:12px/1.4 system-ui,sans-serif;color:#111;margin:16px}h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:16px 0 6px;border-bottom:2px solid #1f7aff;padding-bottom:2px}' +
      'table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}th{background:#eef2f8;font-size:11px}' +
      '.dati td:first-child{width:28%;font-weight:600}.foto{display:flex;flex-wrap:wrap;gap:8px}.foto img{width:48%;max-height:260px;object-fit:contain;border:1px solid #ccc}' +
      '.piccolo{color:#555;font-size:11px}@page{margin:12mm}.schema{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:6px}figure.fg{margin:0;width:48%;break-inside:avoid}figure.fg img{width:100%;max-height:260px;object-fit:contain;border:1px solid #ccc}figcaption{font-size:11px;font-weight:600;margin-top:2px}.corto{color:#b00020;font-weight:700}.grup{break-inside:avoid}';
    let h = '<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Attrezzaggio ' + esc(p.nome || '') + '</title><style>' + st + '</style></head><body>';
    h += '<h1>Foglio di attrezzaggio: ' + esc(p.nome || '') + '</h1><div class="piccolo">Hich-Officina · ' + esc(new Date().toLocaleDateString('it-IT')) + '</div>';
    h += '<h2>Pezzo</h2><table class="dati">' + [['Disegno / codice', p.disegno], ['Materiale', p.materiale], ['Grezzo', p.grezzo]]
      .map(([a, b]) => '<tr><td>' + a + '</td><td>' + esc(b || '') + '</td></tr>').join('') + '</table>';
    h += '<h2>Serraggio e origine</h2><table class="dati">' + [['Fissaggio', p.fissaggio], ['Sporgenza dal serraggio', p.sporg ? p.sporg + ' mm' : ''], ['Origine', p.origine]]
      .map(([a, b]) => '<tr><td>' + a + '</td><td>' + esc(b || '') + '</td></tr>').join('') + '</table><div class="schema">' + schemaOrigine(p) + '</div>';
    if ((p.fasi || []).length) {
      h += '<h2>Sequenza delle lavorazioni</h2><table><tr><th>N.</th><th>Lavorazione</th><th>T</th><th>Dati di taglio</th><th>Fatta</th></tr>' + p.fasi.map((f, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(f.titolo || '') + '</td><td>' + esc(f.t === undefined ? '' : 'T' + f.t) + '</td><td>' + esc(f.dati || '') + '</td><td style="width:44px"></td></tr>').join('') + '</table>';
    }
    programmi.forEach(pr => {
      const r = O.eseguiISO((pr.iso || pr.righe).join('\n'), { modo: pr.tipo === 'tornio' ? 'tornio' : pr.tipo ? 'fresa' : 'auto' });
      const L = r.limiti, q = k => (L[k].minLavoro === null ? '—' : fmt(L[k].minLavoro, 3) + ' / ' + fmt(L[k].maxLavoro, 3));
      h += '<h2>Programma ' + esc(pr.nome || '') + (pr.titolo ? ' · ' + esc(pr.titolo) : '') + '</h2>';
      h += '<table class="dati"><tr><td>Tempo stimato</td><td>' + fmt(r.tempo, 1) + ' min</td></tr><tr><td>Quote di lavoro X</td><td>' + q('x') + '</td></tr>' +
        (r.modo === 'tornio' ? '' : '<tr><td>Quote di lavoro Y</td><td>' + q('y') + '</td></tr>') + '<tr><td>Quote di lavoro Z</td><td>' + q('z') + '</td></tr></table>';
      const fr = r.modo !== 'tornio', zmin = {};
      if (fr) r.segmenti.forEach(sg => { if (!sg.rapido) zmin[sg.t] = Math.min(zmin[sg.t] === undefined ? 0 : zmin[sg.t], sg.z0, sg.z); });
      h += '<table style="margin-top:6px"><tr><th>T</th><th>Utensile</th><th>Sporgenza' + (fr ? ' (minima)' : '') + '</th><th>S</th><th>F</th><th>Montato</th></tr>' + r.utensili.map(u => {
        const d = tab.find(x => Number(x.t) === u.t), serve = fr && zmin[u.t] < 0 ? Math.ceil(-zmin[u.t] + 3) : 0, ha = d && d.l ? O.num(d.l) : 0;
        const sp = (ha ? fmt(ha) + ' mm' : '') + (serve ? (ha ? ' · ' : '') + 'serve almeno ' + serve + ' mm' : '') + (serve && ha && ha < serve ? ' <span class="corto">TROPPO CORTO</span>' : '');
        return '<tr><td><b>' + u.t + '</b></td><td>' + esc(d ? A.descrUt(d) : (u.commento || '')) + '</td><td>' + sp + '</td><td>' + u.s.join(', ') + '</td><td>' + u.f.map(x => fmt(x, 3)).join(', ') + '</td><td style="width:60px"></td></tr>';
      }).join('') + '</table>';
      if (r.avvisi.length) h += '<p class="piccolo">' + esc(r.avvisi.slice(0, 6).join(' · ')) + '</p>';
    });
    if ((p.misure || []).length) {
      h += '<h2>Misure da controllare</h2><table><tr><th>Quota</th><th>Nominale</th><th>Tolleranza</th><th>Min</th><th>Max</th><th>Misurata</th></tr>' + p.misure.map(q => {
        const nom = O.num(q.nominale), t = leggiTolleranza(nom, q.toll);
        return '<tr><td>' + esc(q.nome || '') + '</td><td>' + fmt(nom, 3) + '</td><td>' + esc(q.toll || '') + '</td><td>' + (t.errore ? '' : fmt(nom + t.inf, 3)) + '</td><td>' + (t.errore ? '' : fmt(nom + t.sup, 3)) + '</td><td style="width:80px"></td></tr>';
      }).join('') + '</table>';
    }
    if (p.note) h += '<h2>Note</h2><p>' + esc(p.note).replace(/\n/g, '<br>') + '</p>';
    if (foto.length) {
      // le foto con la didascalia (Morsa, Origine, Utensili, Pezzo, Altro) in quest'ordine; foto = [dataURL] oppure [{src, dida}]
      const F = foto.map(f => (typeof f === 'string' ? { src: f, dida: '' } : f));
      const ord = DIDA.concat(['']);
      F.sort((a, b) => ord.indexOf(DIDA.includes(a.dida) ? a.dida : '') - ord.indexOf(DIDA.includes(b.dida) ? b.dida : ''));
      h += '<h2>Foto</h2><div class="foto">' + F.map(f => '<figure class="fg"><img src="' + f.src + '" alt="' + esc(f.dida || 'Foto') + '">' + (f.dida ? '<figcaption>' + esc(f.dida) + '</figcaption>' : '') + '</figure>').join('') + '</div>';
    }
    return h + '</body></html>';
  }
  async function foglio(p) {
    const salvati = A.mem.salvati || [];
    const programmi = (p.programmi || []).map(id => salvati.find(x => x.id === id)).filter(Boolean);
    const foto = [];
    for (const id of (p.foto || [])) { const d = await A.Foto.prendi(id); if (d) foto.push({ src: d, dida: (p.dida || {})[id] || '' }); }
    const html = htmlFoglio(Object.assign({ modo: /^\s*D\s*\d/i.test(p.grezzo || '') || /^\s*(barra|Ø)/i.test(p.grezzo || '') ? 'tornio' : 'fresa' }, p), programmi, foto);
    A.param.foglio = { titolo: 'Attrezzaggio ' + (p.nome || ''), html, nome: 'attrezzaggio-' + String(p.nome || 'pezzo').replace(/[^A-Za-z0-9_-]+/g, '_') + '.html' };
    A.vai('foglio');
  }
  A.foglioDaProgramma = L => {
    const p = { nome: L.nome, origine: '', misure: [], foto: [] };
    const html = htmlFoglio(p, [{ righe: L.righe, nome: L.nome, tipo: L.tipo }], []);
    A.param.foglio = { titolo: 'Attrezzaggio ' + L.nome, html, nome: 'attrezzaggio-' + String(L.nome).replace(/[^A-Za-z0-9_-]+/g, '_') + '.html' };
    A.vai('foglio');
  };
  O.htmlFoglio = htmlFoglio; O.schemaOrigine = schemaOrigine;
  A.schermi.foglio = {
    titolo: 'Foglio di attrezzaggio', preferibile: false,
    render(m) {
      const F = A.param.foglio;
      if (!F) { A.vai('pezzi'); return; }
      const fr = el('iframe', { class: 'anteprima-foglio', title: 'Anteprima del foglio', sandbox: 'allow-same-origin' });
      m.appendChild(fr);
      fr.srcdoc = F.html;
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('salva') + 'Stampa o PDF', onclick: () => A.stampa(F.titolo, F.html) }),
        el('button', { class: 'pul sec', html: A.icona('condividi') + 'Condividi', onclick: () => A.condividiFile(F.nome, F.html, 'text/html') })]));
      m.appendChild(A.info('Con Stampa scegli la stampante oppure "Salva come PDF".'));
    }
  };

  // ----- copia di sicurezza -----
  A.copiaSicurezza = async function () {
    const foto = {};
    for (const p of pezzi()) for (const id of (p.foto || [])) { const d = await A.Foto.prendi(id); if (d) foto[id] = d; }
    // la password della macchina non finisce mai in una copia
    const mem = JSON.parse(JSON.stringify(A.mem)); if (mem.imp) mem.imp.ftpPassword = '';
    const corpo = { mem, foto };
    const dati = { app: 'hich-officina', versione: A.VERSIONE, schema: A.SCHEMA, data: new Date().toISOString(), controllo: A.hash(JSON.stringify(corpo)), mem, foto };
    A.mem.ultimaCopia = oggi(); A.mem.promemoriaFino = null; A.salva();
    A.condividiFile('hich-officina-copia-' + oggi() + '.json', JSON.stringify(dati), 'application/json');
  };
  /** Controlla il file di copia e ritorna {mem, foto} o {errore}. */
  function leggiCopia(testo) {
    let d;
    try { d = JSON.parse(String(testo || '').replace(/^﻿/, '')); } catch (e) { return { errore: 'Il file non e una copia di Hich-Officina (JSON non valido).' }; }
    if (!d || d.app !== 'hich-officina' || !d.mem || typeof d.mem !== 'object') return { errore: 'Il file non e una copia di Hich-Officina.' };
    const foto = d.foto && typeof d.foto === 'object' ? d.foto : {};
    // controllo: la copia non deve essere stata modificata, tagliata o rovinata
    let avvertenza = '';
    if (!d.controllo) avvertenza = 'Questa copia non ha il controllo di integrita (e di una versione vecchia): controlla i numeri qui sotto.';
    else if (d.controllo !== A.hash(JSON.stringify({ mem: d.mem, foto }))) avvertenza = 'Il file e stato modificato o e rovinato: la somma di controllo non torna. Ripristinarlo puo dare dati sbagliati.';
    return { mem: A.migra(JSON.parse(JSON.stringify(d.mem))), foto, data: d.data, versione: d.versione, avvertenza, danneggiata: !!d.controllo && !!avvertenza };
  }
  O.leggiCopia = leggiCopia;
  A.ripristina = function () {
    A.scegliTesto(async testo => {
      const c = leggiCopia(testo);
      if (c.errore) { A.avviso(c.errore); return; }
      A.param.copia = c;
      A.vai('ripristino');
    }, '.json,application/json');
  };
  A.schermi.ripristino = {
    titolo: 'Ripristina la copia', preferibile: false,
    render(m) {
      const c = A.param.copia;
      if (!c) { A.vai('impostazioni'); return; }
      const n = k => (Array.isArray(c.mem[k]) ? c.mem[k].length : 0);
      m.appendChild(A.info('Copia del <b>' + esc(String(c.data || '').slice(0, 10)) + '</b> (versione ' + esc(c.versione || '?') + '): ' +
        n('salvati') + ' programmi, ' + n('macro') + ' macro, ' + n('pezzi') + ' pezzi, ' + (n('tabellaUt') || n('utensili')) + ' utensili, ' + Object.keys(c.foto).length + ' foto' +
        (Array.isArray(c.mem.materiali) ? ', materiali personali' : '') + '.'));
      if (c.avvertenza) m.appendChild(A.info(esc(c.avvertenza), 'avviso'));
      m.appendChild(A.info('Tutti i dati di adesso su questo telefono vengono sostituiti da quelli della copia.', 'avviso'));
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('salvati') + (c.danneggiata ? 'Ripristina comunque' : 'Ripristina'), onclick: async () => {
        if (!(await A.conferma('Ripristinare la copia?', 'I dati di adesso su questo telefono vengono sostituiti.' + (c.danneggiata ? ' Il file risulta rovinato.' : ''), 'Ripristina', true))) return;
        const pw = (A.mem.imp || {}).ftpPassword;
        for (const id in c.foto) await A.Foto.metti(id, c.foto[id]);
        Object.keys(A.mem).forEach(k => delete A.mem[k]);
        Object.assign(A.mem, c.mem);
        A.mem.versione = A.VERSIONE;
        if (pw) { A.mem.imp = A.mem.imp || {}; A.mem.imp.ftpPassword = pw; }
        try { localStorage.setItem('hich-officina-v2', JSON.stringify(A.mem)); } catch (e) { A.avviso('Non salvato: ' + e.message); return; }
        A.param.copia = null; A.applicaTema(); A.avviso('Copia ripristinata'); A.vai('home');
      } })]));
    }
  };

  // ----- ricerca veloce dalla home -----
  /** Risultati per un testo: [{titolo, sotto, vai()}]. */
  A.cerca = function (q) {
    const t = String(q || '').trim();
    if (t.length < 2) return [];
    const T = t.toUpperCase().replace(',', '.'), out = [];
    const metti = (titolo, sotto, fn) => out.push({ titolo, sotto, vai: fn });
    // filetti: M10, M10x1, M10 x 1.25
    let m = /^M\s*(\d+(?:\.\d+)?)(?:\s*X\s*(\d+(?:\.\d+)?))?$/.exec(T);
    if (m) {
      const d = Number(m[1]);
      const lista = O.FILETTI_GROSSI.filter(f => f[0] === d).concat(O.FILETTI_FINI.filter(f => f[0] === d)).filter(f => !m[2] || Math.abs(f[1] - Number(m[2])) < 1e-9);
      lista.forEach(([dd, p]) => {
        const f = O.filetto(dd, p);
        metti('M' + fmt(dd) + ' x ' + fmt(p), 'Preforo ' + fmt(f.preforo, 2) + ' · nocciolo D1 ' + fmt(f.nocciolo, 3) + ' · medio ' + fmt(f.medio, 3), () => {
          const val = A.sezione('valori'); val.maschio = Object.assign(val.maschio || {}, { fil: dd + 'x' + p, d: String(dd), p: String(p) }); A.mem.calc = 'maschio'; A.salva(); A.vai('calcoli');
        });
      });
    }
    // tolleranze: H7, g6, H7 25, 25 H7
    m = /^(?:(\d+(?:\.\d+)?)\s+)?(JS|[A-Z])(\d{1,2})(?:\s+(\d+(?:\.\d+)?))?$/i.exec(t.replace(',', '.'));
    if (m && !/^M$/i.test(m[2]) && !/^[GT]$/i.test(m[2])) {
      const campo = (/^[A-Z]/.test(t.replace(/^[\d.,\s]+/, '')[0]) ? m[2].toUpperCase() : m[2].toLowerCase()) + m[3];
      const d = Number(m[1] || m[4]) || 0;
      const r = O.tolleranza(d > 0 ? d : 25, campo);
      if (!r.errore) metti('Tolleranza ' + campo + (d > 0 ? ' su D' + fmt(d) : ''), d > 0 ? fmt(r.min, 3) + ' … ' + fmt(r.max, 3) + ' mm (' + (r.inf > 0 ? '+' : '') + fmt(r.inf, 1) + ' / ' + (r.sup > 0 ? '+' : '') + fmt(r.sup, 1) + ' µm)' : 'Scrivi anche il diametro, es. "' + campo + ' 25"', () => {
        const v = A.sezione('tolleranze'); v.libero = campo; if (d > 0) v.d = String(d); A.salva(); A.vai('tolleranze');
      });
    }
    // codici G e M
    if (/^[GM]\d{1,3}$/.test(T) && A.CODICI) {
      const n = Number(T.slice(1)), L = T[0];
      A.CODICI.filter(([c]) => c.split(/[/…]/).map(x => x.trim()).some(x => x === L + n || (x.includes('…') ? false : false)) || (c === 'G54…G59' && L === 'G' && n >= 54 && n <= 59))
        .forEach(([c, d]) => metti(c, d, () => { A.sezione('tabelleVista').tab = 'codici'; A.salva(); A.vai('tabelle'); }));
    }
    const qq = t.toLowerCase();
    // materiali
    A.materiali().forEach((x, i) => {
      if (x.n.toLowerCase().includes(qq) || String(x.g).toLowerCase().includes(qq)) metti(x.n, 'Fresa ' + x.vc + ' · Punta ' + x.dvc + ' · Maschio ' + x.tvc + (x.lvc ? ' · Tornio ' + x.lvc : '') + ' m/min', () => { A.param.materiale = i; A.vai('materiale'); });
    });
    // utensili della tabella: T5 oppure il nome
    utensili().forEach(u => {
      if (T === 'T' + u.t || A.descrUt(u).toLowerCase().includes(qq)) metti('T' + u.t + ' ' + A.descrUt(u), u.note || 'Tabella utensili', () => { A.param.utensile = u.id; A.vai('utensile'); });
    });
    // schermate e calcolatori
    A.MENU.forEach(([id, , tt, sotto]) => { if ((tt + ' ' + sotto).toLowerCase().includes(qq)) metti(tt, sotto, () => A.vai(id)); });
    (A.CALC || []).forEach(c => { if (c.t.toLowerCase().includes(qq)) metti('Calcolatrice: ' + c.t, 'Calcolatrice di taglio', () => { A.mem.calc = c.id; A.salva(); A.vai('calcoli'); }); });
    // programmi, pezzi, macro
    (A.mem.salvati || []).forEach(p => { if ((p.nome + ' ' + (p.titolo || '')).toLowerCase().includes(qq)) metti(p.nome + ' ' + (p.titolo || ''), 'Programma salvato · ' + p.data, () => { A.param.listato = { righe: p.righe, nome: p.nome, tipo: p.tipo, idSalvato: p.id, iso: p.iso || null, ling: p.ling || 'iso' }; A.vai('listato'); }); });
    pezzi().forEach(p => { if ((p.nome + ' ' + (p.disegno || '') + ' ' + (p.materiale || '')).toLowerCase().includes(qq)) metti(p.nome, 'Pezzo' + (p.disegno ? ' · ' + p.disegno : ''), () => { A.param.pezzo = p.id; A.vai('pezzo'); }); });
    (A.mem.macro || []).forEach((mc, i) => { if ((mc.nome + ' ' + mc.num).toLowerCase().includes(qq)) metti(mc.nome, 'Macro O' + mc.num, () => { A.param.macro = { i }; A.vai('macroModifica'); }); });
    O.MACRO_MODELLI.forEach(mc => { if ((mc.nome + ' ' + mc.num).toLowerCase().includes(qq)) metti(mc.nome, 'Modello di macro O' + mc.num, () => { A.param.macro = { modello: mc.id }; A.vai('macroModifica'); }); });
    return out.slice(0, 15);
  };
})();
