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
  /** "H7", "g6", "±0,05", "+0,1 -0,05", "+0.1/0", "0 -0.02" -> {sup, inf} in mm, oppure {errore}. */
  function leggiTolleranza(nominale, testo) {
    const t = String(testo || '').trim().replace(/,/g, '.');
    if (!t) return { sup: 0, inf: 0 };
    if (/^(js|JS|[a-zA-Z])\d{1,2}$/.test(t)) {
      const r = O.tolleranza(nominale, t);
      return r.errore ? { errore: r.errore } : { sup: r.sup / 1000, inf: r.inf / 1000 };
    }
    let m = /^(?:±|\+\/?-|\+-)\s*(\d*\.?\d+)$/.exec(t);
    if (m) return { sup: Number(m[1]), inf: -Number(m[1]) };
    m = /^([+-]?\d*\.?\d+)\s*[/ ;]\s*([+-]?\d*\.?\d+)$/.exec(t);
    if (m) { const a = Number(m[1]), b = Number(m[2]); return { sup: Math.max(a, b), inf: Math.min(a, b) }; }
    return { errore: 'Tolleranza non capita: scrivi H7, ±0,05 oppure +0,1 -0,05' };
  }
  A.leggiTolleranza = leggiTolleranza;
  O.leggiTolleranza = leggiTolleranza;
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
        { id: 'origine', et: 'Origine', tipo: 'testo', largo: true }, { id: 'fissaggio', et: 'Fissaggio', sub: 'morsa, griffe, attrezzatura...', tipo: 'testo', largo: true },
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
      const input = el('input', { type: 'file', accept: 'image/*', multiple: true, id: 'f-foto', style: 'display:none' });
      m.append(fotoBox, input, el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', html: A.icona('piu') + 'Aggiungi foto', onclick: () => input.click() })]));
      const disegnaFoto = () => {
        fotoBox.innerHTML = '';
        (p.foto || []).forEach(id => {
          const img = el('img', { alt: 'Foto del pezzo', loading: 'lazy' });
          A.Foto.prendi(id).then(d => { if (d) img.src = d; });
          fotoBox.appendChild(el('button', { class: 'foto', 'aria-label': 'Apri la foto', onclick: () => apriFoto(id, img.src) }, [img]));
        });
      };
      const apriFoto = (id, src) => {
        const vel = el('div', { class: 'velo', onclick: e => { if (e.target === vel) vel.remove(); } }, [
          el('img', { src, alt: 'Foto del pezzo' }),
          el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', testo: 'Chiudi', onclick: () => vel.remove() }),
            el('button', { class: 'pul peric', html: A.icona('cestino') + 'Elimina', onclick: () => {
              if (!conferma('foto' + id, 'Premi ancora per eliminare la foto')) return;
              p.foto = p.foto.filter(x => x !== id); A.Foto.togli(id); A.salva(); vel.remove(); disegnaFoto();
            } })])]);
        document.body.appendChild(vel);
      };
      input.addEventListener('change', async () => {
        const files = Array.from(input.files || []);
        for (const f of files) {
          try { const id = await A.riduciFoto(f); p.foto = (p.foto || []).concat(id); A.salva(); } catch (e) { A.avviso('Foto non aggiunta: ' + e.message); }
        }
        input.value = '';
        disegnaFoto();
      });
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
  function htmlFoglio(p, programmi, foto) {
    const tab = utensili();
    const st = 'body{font:12px/1.4 system-ui,sans-serif;color:#111;margin:16px}h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:16px 0 6px;border-bottom:2px solid #1f7aff;padding-bottom:2px}' +
      'table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}th{background:#eef2f8;font-size:11px}' +
      '.dati td:first-child{width:28%;font-weight:600}.foto{display:flex;flex-wrap:wrap;gap:8px}.foto img{width:48%;max-height:260px;object-fit:contain;border:1px solid #ccc}' +
      '.piccolo{color:#555;font-size:11px}@page{margin:12mm}';
    let h = '<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Attrezzaggio ' + esc(p.nome || '') + '</title><style>' + st + '</style></head><body>';
    h += '<h1>Foglio di attrezzaggio: ' + esc(p.nome || '') + '</h1><div class="piccolo">Hich-Officina · ' + esc(new Date().toLocaleDateString('it-IT')) + '</div>';
    h += '<h2>Pezzo</h2><table class="dati">' + [['Disegno / codice', p.disegno], ['Materiale', p.materiale], ['Grezzo', p.grezzo], ['Origine', p.origine], ['Fissaggio', p.fissaggio]]
      .map(([a, b]) => '<tr><td>' + a + '</td><td>' + esc(b || '') + '</td></tr>').join('') + '</table>';
    programmi.forEach(pr => {
      const r = O.eseguiISO((pr.iso || pr.righe).join('\n'), { modo: pr.tipo === 'tornio' ? 'tornio' : pr.tipo ? 'fresa' : 'auto' });
      const L = r.limiti, q = k => (L[k].minLavoro === null ? '—' : fmt(L[k].minLavoro, 3) + ' / ' + fmt(L[k].maxLavoro, 3));
      h += '<h2>Programma ' + esc(pr.nome || '') + (pr.titolo ? ' · ' + esc(pr.titolo) : '') + '</h2>';
      h += '<table class="dati"><tr><td>Tempo stimato</td><td>' + fmt(r.tempo, 1) + ' min</td></tr><tr><td>Quote di lavoro X</td><td>' + q('x') + '</td></tr>' +
        (r.modo === 'tornio' ? '' : '<tr><td>Quote di lavoro Y</td><td>' + q('y') + '</td></tr>') + '<tr><td>Quote di lavoro Z</td><td>' + q('z') + '</td></tr></table>';
      h += '<table style="margin-top:6px"><tr><th>T</th><th>Utensile</th><th>Lunghezza</th><th>S</th><th>F</th><th>Montato</th></tr>' + r.utensili.map(u => {
        const d = tab.find(x => Number(x.t) === u.t);
        return '<tr><td><b>' + u.t + '</b></td><td>' + esc(d ? A.descrUt(d) : (u.commento || '')) + '</td><td>' + (d && d.l ? fmt(O.num(d.l)) + ' mm' : '') + '</td><td>' + u.s.join(', ') + '</td><td>' + u.f.map(x => fmt(x, 3)).join(', ') + '</td><td style="width:60px"></td></tr>';
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
    if (foto.length) h += '<h2>Foto</h2><div class="foto">' + foto.map(f => '<img src="' + f + '" alt="">').join('') + '</div>';
    return h + '</body></html>';
  }
  async function foglio(p) {
    const salvati = A.mem.salvati || [];
    const programmi = (p.programmi || []).map(id => salvati.find(x => x.id === id)).filter(Boolean);
    const foto = [];
    for (const id of (p.foto || [])) { const d = await A.Foto.prendi(id); if (d) foto.push(d); }
    const html = htmlFoglio(p, programmi, foto);
    A.param.foglio = { titolo: 'Attrezzaggio ' + (p.nome || ''), html, nome: 'attrezzaggio-' + String(p.nome || 'pezzo').replace(/[^A-Za-z0-9_-]+/g, '_') + '.html' };
    A.vai('foglio');
  }
  A.foglioDaProgramma = L => {
    const p = { nome: L.nome, origine: '', misure: [], foto: [] };
    const html = htmlFoglio(p, [{ righe: L.righe, nome: L.nome, tipo: L.tipo }], []);
    A.param.foglio = { titolo: 'Attrezzaggio ' + L.nome, html, nome: 'attrezzaggio-' + String(L.nome).replace(/[^A-Za-z0-9_-]+/g, '_') + '.html' };
    A.vai('foglio');
  };
  O.htmlFoglio = htmlFoglio;
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
    const dati = { app: 'hich-officina', versione: A.VERSIONE, data: new Date().toISOString(), mem: A.mem, foto };
    A.condividiFile('hich-officina-copia-' + oggi() + '.json', JSON.stringify(dati), 'application/json');
  };
  /** Controlla il file di copia e ritorna {mem, foto} o {errore}. */
  function leggiCopia(testo) {
    let d;
    try { d = JSON.parse(String(testo || '').replace(/^﻿/, '')); } catch (e) { return { errore: 'Il file non e una copia di Hich-Officina (JSON non valido).' }; }
    if (!d || d.app !== 'hich-officina' || !d.mem || typeof d.mem !== 'object') return { errore: 'Il file non e una copia di Hich-Officina.' };
    return { mem: d.mem, foto: d.foto || {}, data: d.data, versione: d.versione };
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
      m.appendChild(A.info('Tutti i dati di adesso su questo telefono vengono sostituiti da quelli della copia.', 'avviso'));
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('salvati') + 'Ripristina', onclick: async () => {
        for (const id in c.foto) await A.Foto.metti(id, c.foto[id]);
        Object.keys(A.mem).forEach(k => delete A.mem[k]);
        Object.assign(A.mem, c.mem);
        A.mem.versione = A.VERSIONE;
        try { localStorage.setItem('hich-officina-v2', JSON.stringify(A.mem)); } catch (e) { A.avviso('Non salvato: ' + e.message); return; }
        A.param.copia = null; A.applicaTema(); A.avviso('Copia ripristinata'); A.vai('home');
      } })]));
    }
  };
})();
