// ===== Hich-Officina: base dell'interfaccia (schermate, memoria, moduli, icone) =====
// Ogni schermata si registra in App.schermi e si apre con l'indirizzo #nome: il tasto Indietro del telefono funziona.
(function () {
  'use strict';
  const O = window.Officina;
  const $ = id => document.getElementById(id);

  // ----- icone (tratto 1.8, 24x24) -----
  const IC = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    stella: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
    ingranaggio: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    indietro: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    avanti: '<path d="M9 6l6 6-6 6"/>',
    nuovo: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 8v8M8 12h8"/>',
    calcolo: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3M8 18h.01M12 18h.01"/>',
    utensile: '<path d="M10 2h4v5l-1 1v13h-2V8l-1-1z"/><path d="M10 11l4-2M10 14l4-2M10 17l4-2"/>',
    tolleranza: '<path d="M4 7h16M4 17h16"/><path d="M8 4v6M16 14v6"/><path d="M12 9v6"/>',
    codice: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>',
    galleria: '<path d="M3 8l9-5 9 5-9 5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    tabella: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16"/>',
    salvati: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    materiale: '<path d="M4 8l8-4 8 4-8 4z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>',
    copia: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    condividi: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
    salva: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 19h14"/>',
    cestino: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    piu: '<path d="M12 5v14M5 12h14"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    avviso: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
    tornio: '<path d="M3 9h5v6H3zM8 10h7v4H8zM15 11h4v2h-4zM19 12h2"/>',
    foro: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    fresa: '<path d="M4 18h16v3H4z"/><path d="M10 3h4v9h-4z"/><path d="M10 12l2 4 2-4"/>',
    modifica: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    fotocamera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    immagine: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18l5-5 4 4 3-3 4 4"/>'
  };
  const icona = (n, cl) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' + (cl ? ' class="' + cl + '"' : '') + ' aria-hidden="true">' + (IC[n] || '') + '</svg>';

  // ----- piccoli aiuti -----
  const el = (tag, attr, figli) => {
    const e = document.createElement(tag);
    for (const k in attr || {}) {
      const v = attr[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === 'testo') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    (figli || []).forEach(f => { if (f) e.appendChild(typeof f === 'string' ? document.createTextNode(f) : f); });
    return e;
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function fmt(x, dec) {
    if (x === null || x === undefined || !isFinite(x)) return '—';
    return Number(x).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: dec == null ? 2 : dec });
  }
  const arrot = (x, d) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

  // ----- memoria: solo su questo telefono; se non c'e l'app va lo stesso -----
  const CHIAVE = 'hich-officina-v2';
  const SCHEMA = 2;
  /** Porta i dati salvati da qualunque versione precedente alla forma di adesso. Non perde niente di quello che si capisce. */
  function migra(m) {
    if (!m || typeof m !== 'object' || Array.isArray(m)) m = {};
    const lista = k => { if (!Array.isArray(m[k])) m[k] = []; };
    // 2.5.0: la tabella utensili sta a parte (prima nello stesso posto dei campi della schermata utensili)
    if (Array.isArray(m.utensili)) { if (!Array.isArray(m.tabellaUt)) m.tabellaUt = m.utensili; delete m.utensili; }
    ['salvati', 'pezzi', 'macro', 'preferiti', 'recenti', 'tabellaUt', 'lavori'].forEach(lista);
    if (m.materiali !== undefined && !Array.isArray(m.materiali)) delete m.materiali;
    if (Array.isArray(m.materiali) && !m.materiali.length) delete m.materiali;
    if (!m.imp || typeof m.imp !== 'object' || Array.isArray(m.imp)) m.imp = {};
    ['valori', 'programma', 'ciclo', 'disegno', 'tolleranze', 'tabelleVista', 'galleriaVista', 'macroVista', 'simVista', 'angolo', 'cad', 'lavoro', 'dalDisegno', 'pezziVista'].forEach(k => { if (m[k] !== undefined && (typeof m[k] !== 'object' || m[k] === null || Array.isArray(m[k]))) delete m[k]; });
    // programmi salvati e pezzi: solo voci complete
    m.salvati = m.salvati.filter(x => x && Array.isArray(x.righe)).map(x => Object.assign({ id: Date.now() + Math.random(), nome: 'O0001', data: '' }, x));
    m.pezzi = m.pezzi.filter(x => x && typeof x === 'object').map(x => Object.assign({ id: 'p' + Date.now() + Math.floor(Math.random() * 1e6), nome: 'Pezzo', programmi: [], foto: [], misure: [], controlli: [] }, x));
    m.pezzi.forEach(x => ['programmi', 'foto', 'misure', 'controlli'].forEach(k => { if (!Array.isArray(x[k])) x[k] = []; }));
    // 2.2.0: i dati di taglio dei programmi non sono piu campi giri/avanzamento
    ['fresa', 'fori', 'tornio'].forEach(t => { const v = m.programma && m.programma[t]; if (v && typeof v === 'object' && !v._taglio2) { delete v.giri; delete v.avanz; } });
    m.schema = SCHEMA;
    return m;
  }
  /** Somma di controllo semplice (FNV-1a) per accorgersi di una copia rovinata o modificata. */
  function hash(testo) {
    let h = 0x811c9dc5;
    for (let i = 0; i < testo.length; i++) { h ^= testo.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }
  let mem = {};
  try { mem = JSON.parse(localStorage.getItem(CHIAVE) || '{}') || {}; } catch (e) { mem = {}; }
  // valori della versione 1 (calcolatori): si tengono
  try { const v1 = JSON.parse(localStorage.getItem('hich-officina-v1') || 'null'); if (v1 && !mem.valori && v1.valori) mem.valori = v1.valori; } catch (e) { /* niente */ }
  mem = migra(mem);
  if (!mem.primoUso) mem.primoUso = new Date().toISOString().slice(0, 10);
  let salvaTimer = null, salvaFallito = false;
  function scrivi() {
    salvaTimer = null;
    try { localStorage.setItem(CHIAVE, JSON.stringify(mem)); salvaFallito = false; }
    catch (e) {
      // memoria piena o bloccata: si dice una volta sola, perche non si perda il lavoro senza saperlo
      if (!salvaFallito) { salvaFallito = true; try { avviso('Non riesco a salvare i dati su questo telefono: fai la copia di sicurezza (Impostazioni)'); } catch (x) { /* niente */ } }
    }
  }
  function salva() {
    clearTimeout(salvaTimer);
    salvaTimer = setTimeout(scrivi, 150);
  }
  // se il telefono manda l'app in background (o la chiude) prima che passi il ritardo, si salva subito:
  // in background il sistema puo fermare i timer o chiudere l'app e l'ultima modifica andrebbe persa
  const salvaSeInSospeso = () => { if (salvaTimer !== null) { clearTimeout(salvaTimer); scrivi(); } };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') salvaSeInSospeso(); });
  window.addEventListener('pagehide', salvaSeInSospeso);
  const sezione = k => (mem[k] = mem[k] || {});

  // ----- impostazioni -----
  const IMPOSTAZIONI_SERIE = {
    tema: 'scuro', vibra: true, guanti: false, sfondo: true, tastierino: true, contrasto: false, promemoriaCopia: true, ftpChiedi: true, nmaxFresa: 24000, nmaxTornio: 3000, zSic: 50, zR: 2, refrig: true, g43: true, numerare: false, ppCambio: 'T{t} M6', ppM8: 'M8', ppM9: 'M9', ppFine: 'M30', ppG43: true, ppPercento: true, ppCommenti: 'tonde', ppDec: 3, ppPasso: 0, ppIni: '', ppFin: '',
    codLimite: 'G50', codFiletto: 'G32', xCambio: '', zCambio: 50, fineZ: '', numProg: 1, costoOra: 60,
    postFresa: 'iso', postTornio: 'iso', ftpHost: '', ftpPorta: 21, ftpUtente: '', ftpPassword: '', ftpCartella: '', nomeFtp: 'O0001.nc'
  };
  const imp = () => Object.assign({}, IMPOSTAZIONI_SERIE, mem.imp || {});
  function applicaTema() {
    const t = imp().tema;
    if (t === 'chiaro') document.documentElement.setAttribute('data-theme', 'light');
    else if (t === 'scuro') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    document.body.classList.toggle('guanti', !!imp().guanti);
    document.body.classList.toggle('contrasto', !!imp().contrasto);
    document.body.classList.toggle('con-sfondo', imp().sfondo !== false);
  }

  // ----- materiali: quelli di serie con le modifiche fatte sul telefono -----
  function materiali() {
    const mod = mem.materiali;
    if (Array.isArray(mod) && mod.length) return mod;
    return O.MATERIALI;
  }
  const materiale = i => materiali()[Number(i)] || null;
  const sceltaMateriali = (vuota) => (vuota ? [['', vuota]] : []).concat(materiali().map((m, i) => [String(i), m.n]));

  // ----- avvisi brevi -----
  function avviso(t) {
    const x = $('toast'); x.textContent = t; x.classList.add('vedi');
    vibra(10);
    clearTimeout(avviso._t); avviso._t = setTimeout(() => x.classList.remove('vedi'), 2000);
  }

  // ----- moduli: una riga per campo, etichetta a sinistra e valore a destra -----
  // def = {id, et, sub, u, v, tipo:'num'|'testo'|'scelta'|'spunta'|'area', scelte, ph, largo, se:(valori)=>bool}
  function modulo(contenitore, campi, valori, alCambio) {
    const righe = [];
    contenitore.innerHTML = '';
    for (const c of campi) {
      let nodo, ing;
      const iniziale = valori[c.id] !== undefined ? valori[c.id] : (c.v === undefined ? '' : c.v);
      if (c.tipo === 'spunta') {
        ing = el('input', { type: 'checkbox', id: 'f-' + c.id });
        ing.checked = !!iniziale;
        valori[c.id] = ing.checked;
        ing.addEventListener('change', () => { valori[c.id] = ing.checked; salva(); alCambio && alCambio(c.id); });
        nodo = el('label', { class: 'interr', for: 'f-' + c.id }, [ing, el('span', { testo: c.et })]);
      } else {
        if (c.tipo === 'scelta') {
          ing = el('select', { id: 'f-' + c.id });
          for (const [v, t] of (typeof c.scelte === 'function' ? c.scelte() : c.scelte)) ing.appendChild(el('option', { value: v, testo: t }));
        } else if (c.tipo === 'area') {
          ing = el('textarea', { id: 'f-' + c.id, rows: c.righe || 4, spellcheck: 'false', class: c.mono ? 'codice-in' : null });
        } else {
          ing = el('input', { id: 'f-' + c.id, type: 'text', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'next',
            inputmode: c.tipo === 'testo' ? 'text' : 'decimal' });
        }
        ing.value = String(iniziale);
        if (c.tipo === 'scelta' && ing.selectedIndex < 0) ing.selectedIndex = 0;
        valori[c.id] = ing.value;
        ing.addEventListener(c.tipo === 'scelta' ? 'change' : 'input', () => { valori[c.id] = ing.value; salva(); alCambio && alCambio(c.id); });
        if (c.tipo !== 'scelta' && c.tipo !== 'area') ing.addEventListener('focus', () => { try { ing.select(); } catch (e) { /* niente */ } });
        nodo = el('div', { class: 'riga-campo' + (c.largo || c.tipo === 'area' ? ' largo' : '') }, [
          el('label', { for: 'f-' + c.id }, [c.et, c.sub ? el('small', { testo: c.sub }) : null]),
          el('div', { class: 'ctrl' }, [ing, c.u ? el('span', { class: 'u', testo: c.u }) : null])
        ]);
      }
      contenitore.appendChild(nodo);
      righe.push({ c, nodo, ing });
    }
    const aggiorna = () => {
      for (const r of righe) {
        if (r.c.se) r.nodo.hidden = !r.c.se(valori);
        if (r.c.ph && r.ing && r.ing.placeholder !== undefined) {
          const p = r.c.ph(valori);
          r.ing.placeholder = p === null || p === undefined ? '' : String(p);
        }
      }
    };
    aggiorna();
    return {
      aggiorna,
      metti(id, v) {
        const r = righe.find(x => x.c.id === id); if (!r) return;
        if (r.c.tipo === 'spunta') r.ing.checked = !!v; else r.ing.value = String(v);
        valori[id] = r.c.tipo === 'spunta' ? !!v : r.ing.value; salva();
      }
    };
  }
  const numeri = v => { const o = {}; for (const k in v) o[k] = typeof v[k] === 'boolean' ? v[k] : O.num(v[k]); return o; };

  // ----- risultati -----
  const ARCO = '<svg viewBox="0 0 78 60" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M9 52a30 30 0 1 1 60 0" opacity=".25"/><path d="M9 52a30 30 0 0 1 48-24"/><circle cx="39" cy="45" r="4" fill="currentColor" stroke="none"/><path d="M39 45l14-14" stroke-width="3"/></svg>';
  function misuratore(et, val, u) {
    return el('div', { class: 'misuratore' }, [el('div', { html: ARCO }), el('div', {}, [el('small', { testo: et }), el('b', { html: esc(val) + (u ? '<span>' + esc(u) + '</span>' : '') })])]);
  }
  function griglia(voci) {
    const g = el('div', { class: 'risultati' });
    voci.filter(Boolean).forEach(([et, val, u]) => g.appendChild(el('div', { class: 'ris' }, [el('small', { testo: et }), el('b', { testo: val }), u ? el('i', { testo: u }) : null])));
    return g;
  }
  function info(testo, tipo) {
    return el('div', { class: 'info' + (tipo ? ' ' + tipo : '') }, [el('div', { html: icona(tipo === 'avviso' ? 'avviso' : 'info') }), el('div', { html: testo })]);
  }

  // ----- copia, salva, condividi -----
  // Nell'APK la pagina ha window.Android: salva, condividi, appunti e scelta dei file passano da li.
  const ANDROID = window.Android || null;
  async function copia(testo, cosa) {
    if (ANDROID) { try { if (ANDROID.copia(testo)) { avviso((cosa || 'Testo') + ' copiato'); return true; } } catch (e) { /* sotto */ } }
    try { await navigator.clipboard.writeText(testo); avviso((cosa || 'Testo') + ' copiato'); return true; } catch (e) {
      const t = el('textarea', { style: 'position:fixed;opacity:0' }); t.value = testo; document.body.appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (x) { ok = false; }
      t.remove(); avviso(ok ? (cosa || 'Testo') + ' copiato' : 'Non riesco a copiare: tieni premuto sul testo'); return ok;
    }
  }
  function scarica(nome, testo) {
    if (ANDROID) { try { avviso(ANDROID.salvaFile(nome, testo)); return; } catch (e) { /* sotto */ } }
    const blob = new Blob([testo], { type: /\.pdf$/i.test(nome) ? 'application/pdf' : 'text/plain' });
    const a = el('a', { href: URL.createObjectURL(blob), download: nome });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    avviso('Salvato ' + nome);
  }
  /** Salva un file binario dato in base64 (immagini): nell'APK in Download/Hich-Officina, nel browser come scaricamento. */
  function scaricaBin(nome, b64, tipo) {
    if (ANDROID && ANDROID.salvaBase64) { try { avviso(ANDROID.salvaBase64(nome, b64, tipo || 'application/octet-stream')); return; } catch (e) { /* sotto */ } }
    const bin = atob(b64), dati = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) dati[i] = bin.charCodeAt(i);
    const a = el('a', { href: URL.createObjectURL(new Blob([dati], { type: tipo || 'application/octet-stream' })), download: nome });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    avviso('Salvato ' + nome);
  }
  /** Condivide un file binario (immagine) dato in base64. */
  async function condividiBin(nome, b64, tipo) {
    if (ANDROID && ANDROID.condividiBase64) { try { ANDROID.condividiBase64(nome, b64, tipo || 'application/octet-stream'); return; } catch (e) { /* sotto */ } }
    try {
      const bin = atob(b64), dati = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) dati[i] = bin.charCodeAt(i);
      const file = new File([dati], nome, { type: tipo || 'application/octet-stream' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: nome }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    scaricaBin(nome, b64, tipo);
  }
  async function condividi(nome, testo) {
    if (ANDROID) { try { ANDROID.condividi(nome, testo); return; } catch (e) { /* sotto */ } }
    try {
      const file = new File([testo], nome, { type: 'text/plain' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: nome }); return; }
      if (navigator.share) { await navigator.share({ title: nome, text: testo }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    scarica(nome, testo);
  }

  /** Condivide un file vero (Drive, posta...). */
  async function condividiFile(nome, testo, tipo) {
    if (ANDROID && ANDROID.condividiFile) { try { ANDROID.condividiFile(nome, testo, tipo || 'text/plain'); return; } catch (e) { /* sotto */ } }
    try {
      const file = new File([testo], nome, { type: tipo || 'text/plain' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: nome }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    scarica(nome, testo);
  }
  /** "Salva in...": si sceglie la cartella (nell'APK anche le cartelle offerte dalle altre app). */
  async function salvaIn(nome, testo) {
    if (ANDROID && ANDROID.salvaIn) { try { ANDROID.salvaIn(nome, testo); return; } catch (e) { /* sotto */ } }
    if (window.showSaveFilePicker) {
      try {
        const h = await window.showSaveFilePicker({ suggestedName: nome });
        const w = await h.createWritable(); await w.write(testo); await w.close(); avviso('File salvato'); return;
      } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    scarica(nome, testo);
  }
  /** Stampa (o PDF) di una pagina HTML intera. */
  function stampa(titolo, html) {
    if (ANDROID && ANDROID.stampa) { try { ANDROID.stampa(titolo, html); return; } catch (e) { /* sotto */ } }
    const f = el('iframe', { style: 'position:fixed;right:0;bottom:0;width:0;height:0;border:0', title: titolo });
    document.body.appendChild(f);
    const d = f.contentWindow.document; d.open(); d.write(html); d.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { avviso('Stampa non disponibile qui: usa Condividi'); } setTimeout(() => f.remove(), 60000); }, 300);
  }
  /** Sceglie un file di testo: nell'APK con Android, nel browser con un input nascosto. */
  function scegliTesto(cb, accetta) {
    if (ANDROID && ANDROID.scegliFile) { window.__fileScelto = t => cb(String(t || '')); ANDROID.scegliFile(); return; }
    const i = el('input', { type: 'file', accept: accetta || '.nc,.txt,.json,.iso,.tap,.min,.mpf,text/plain,application/json', style: 'display:none' });
    document.body.appendChild(i);
    i.addEventListener('change', () => {
      const x = i.files && i.files[0]; i.remove(); if (!x) return;
      const r = new FileReader(); r.onload = () => cb(String(r.result || '')); r.readAsText(x);
    });
    i.click();
  }

  // ----- foto: IndexedDB, e se manca localStorage -----
  const Foto = (() => {
    let db = null;
    const apri = () => new Promise(ok => {
      if (db !== null) return ok(db);
      try {
        const r = indexedDB.open('hich-officina-foto', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('foto');
        r.onsuccess = () => { db = r.result; ok(db); };
        r.onerror = () => { db = false; ok(false); };
      } catch (e) { db = false; ok(false); }
    });
    const tx = (modo, fn) => apri().then(d => new Promise((ok, ko) => {
      if (!d) return ko(new Error('nodb'));
      const t = d.transaction('foto', modo), st = t.objectStore('foto');
      const r = fn(st); t.oncomplete = () => ok(r && r.result); t.onerror = () => ko(t.error);
    }));
    const ls = k => 'hich-foto-' + k;
    return {
      metti: (id, dato) => tx('readwrite', st => st.put(dato, id)).catch(() => { localStorage.setItem(ls(id), dato); }),
      prendi: id => tx('readonly', st => st.get(id)).then(v => v || localStorage.getItem(ls(id))).catch(() => { try { return localStorage.getItem(ls(id)); } catch (e) { return null; } }),
      togli: id => tx('readwrite', st => st.delete(id)).catch(() => { try { localStorage.removeItem(ls(id)); } catch (e) { /* niente */ } })
    };
  })();
  /** Riduce una foto (max 1600 px, JPEG) e la mette da parte. Ritorna l'id. */
  function riduciFoto(file) {
    return new Promise((ok, ko) => {
      const r = new FileReader();
      r.onerror = () => ko(new Error('foto non leggibile'));
      r.onload = () => {
        const img = new Image();
        img.onerror = () => ko(new Error('foto non leggibile'));
        img.onload = () => {
          const k = Math.min(1, 1600 / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          const dato = c.toDataURL('image/jpeg', 0.8), id = 'f' + Date.now() + Math.floor(Math.random() * 1000);
          Foto.metti(id, dato).then(() => ok(id), ko);
        };
        img.src = String(r.result);
      };
      r.readAsDataURL(file);
    });
  }

  /** Due pulsanti per le foto: "Scatta una foto" (fotocamera subito) e "Dalla galleria". dopo(files) riceve i file. */
  function pulsantiFoto(opz) {
    const id = opz.id || 'f-foto';
    const mk = (suffisso, capture) => {
      const attr = { type: 'file', accept: 'image/*', id: id + suffisso, style: 'display:none' };
      if (opz.multiple && !capture) attr.multiple = true;
      if (capture) attr.capture = 'environment';
      const i = el('input', attr);
      i.addEventListener('change', () => { const f = Array.from(i.files || []); i.value = ''; if (f.length) opz.dopo(f); });
      return i;
    };
    const iGal = mk('', false), iCam = mk('-cam', true);
    return el('div', { class: 'pulsanti' }, [iGal, iCam,
      el('button', { class: 'pul', id: id + '-scatta', html: icona('fotocamera') + 'Scatta una foto', onclick: () => iCam.click() }),
      el('button', { class: 'pul sec', id: id + '-galleria', html: icona('immagine') + 'Dalla galleria', onclick: () => iGal.click() })]);
  }

  // ----- schermo intero per i disegni: nasconde testata e barra, lascia girare lo schermo -----
  const ORIENTA = ['libero', 'orizzontale', 'verticale'];
  function orienta(modo) {
    try {
      if (window.Android && window.Android.orientamento) window.Android.orientamento(modo);
      else if (window.screen && screen.orientation && screen.orientation.lock) {
        if (modo === 'libero') screen.orientation.unlock(); else screen.orientation.lock(modo === 'orizzontale' ? 'landscape' : 'portrait').catch(() => { /* non permesso */ });
      }
    } catch (e) { /* niente */ }
  }
  /** Schermo intero: ritorna true se ora e intero. dopo() ridisegna. */
  function schermoPieno(radice, dopo) {
    const on = !document.body.classList.contains('cad-pieno');
    document.body.classList.toggle('cad-pieno', on); radice.classList.toggle('pieno', on);
    orienta('libero');
    App.orientaPieno = 0;
    App.esciPieno = on ? () => schermoPieno(radice, dopo) : null;
    if (dopo) setTimeout(dopo, 60);
    return on;
  }
  /** Con lo schermo intero: libero > orizzontale > verticale. */
  function ruotaSchermo(dopo) {
    App.orientaPieno = ((App.orientaPieno || 0) + 1) % ORIENTA.length;
    orienta(ORIENTA[App.orientaPieno]);
    if (dopo) setTimeout(dopo, 300);
    return ORIENTA[App.orientaPieno];
  }

  // ----- tastierino numerico dell'app: grande, sempre uguale, senza la tastiera del telefono -----
  let tastAperto = null, contaCampi = 0;
  function chiudiTastierino() { if (tastAperto) { tastAperto.box.remove(); document.body.classList.remove('con-tastierino'); tastAperto = null; } }
  function apriTastierino(input, opz) {
    if (tastAperto && tastAperto.input === input) return;
    chiudiTastierino(); document.body.classList.remove('con-lav-barra');
    const disp = el('div', { class: 'tast-val', 'aria-live': 'polite' });
    const titolo = el('div', { class: 'tast-tit', testo: opz.etichetta || '' });
    let v = String(input.value || ''), nuovo = true;
    const mostraV = () => { disp.textContent = (v === '' ? '0' : v) + (opz.unita ? ' ' + opz.unita : ''); };
    const scrivi = () => { input.value = v; input.dispatchEvent(new Event('input', { bubbles: true })); };
    const tasto = (t, fz, cl, et) => el('button', { type: 'button', class: 'tast-k' + (cl ? ' ' + cl : ''), 'aria-label': et || t, testo: t, onclick: e => { vibra(5); fz(e); } });
    const cifra = c => () => { if (nuovo) { v = ''; nuovo = false; } if (c === ',' && v.includes(',')) return; if (c === ',' && v === '') v = '0'; v += c; mostraV(); scrivi(); };
    const prossimo = () => {
      const visibili = () => Array.from(document.querySelectorAll('input[data-tast]')).filter(x => x.offsetParent !== null);
      const i = visibili().indexOf(input);
      chiudiTastierino(); input.dispatchEvent(new Event('change', { bubbles: true }));
      // la schermata puo essersi ridisegnata: si cerca il campo dopo per posizione
      setTimeout(() => { const dopo = visibili()[i + 1]; if (dopo) { dopo.focus(); dopo.scrollIntoView({ block: 'center' }); } }, 0);
    };
    const box = el('div', { class: 'tastierino', role: 'dialog', 'aria-label': 'Tastierino numerico' }, [
      el('div', { class: 'tast-testa' }, [titolo, disp]),
      el('div', { class: 'tast-griglia' }, [
        ...['7', '8', '9'].map(c => tasto(c, cifra(c))), tasto('⌫', () => { nuovo = false; v = v.slice(0, -1); mostraV(); scrivi(); }, 'fn', 'Cancella una cifra'),
        ...['4', '5', '6'].map(c => tasto(c, cifra(c))), tasto('C', () => { nuovo = false; v = ''; mostraV(); scrivi(); }, 'fn', 'Cancella tutto'),
        ...['1', '2', '3'].map(c => tasto(c, cifra(c))), tasto('±', () => { nuovo = false; v = v.startsWith('-') ? v.slice(1) : '-' + v; mostraV(); scrivi(); }, 'fn', 'Cambia segno'),
        tasto(',', cifra(','), '', 'Virgola'), tasto('0', cifra('0')), tasto('Avanti', prossimo, 'fn', 'Campo dopo'), tasto('OK', () => { chiudiTastierino(); input.dispatchEvent(new Event('change', { bubbles: true })); input.blur(); }, 'ok', 'Conferma')])]);
    mostraV();
    document.body.appendChild(box); document.body.classList.add('con-tastierino');
    tastAperto = { box, input };
    setTimeout(() => input.scrollIntoView({ block: 'nearest' }), 30);
  }
  /** Campo numerico con il tastierino dell'app. o[k] e il valore (testo); dopo(k) dopo ogni cambio. */
  function campoNum(o, k, etichetta, unita, dopo, extra) {
    const id = 'n-' + k + '-' + (++contaCampi);
    const i = el('input', Object.assign({ type: 'text', inputmode: imp().tastierino === false ? 'decimal' : 'none', autocomplete: 'off', 'data-tast': '1', id, class: 'campo-num', value: o[k] === undefined || o[k] === null || (typeof o[k] === 'number' && !isFinite(o[k])) ? '' : String(o[k]).replace('.', ','), 'aria-label': etichetta }, extra || {}));
    i.addEventListener('focus', () => { if (imp().tastierino !== false) apriTastierino(i, { etichetta, unita }); });
    i.addEventListener('click', () => { if (imp().tastierino !== false) apriTastierino(i, { etichetta, unita }); });
    i.addEventListener('input', () => { o[k] = i.value.replace(',', '.'); if (dopo) dopo(k, false); });
    i.addEventListener('change', () => { if (dopo) dopo(k, true); });
    return el('label', { class: 'cn', for: i.id }, [el('span', { class: 'cn-et', testo: etichetta }), el('span', { class: 'cn-box' }, [i, unita ? el('span', { class: 'cn-u', testo: unita }) : null])]);
  }
  document.addEventListener('pointerdown', e => { if (tastAperto && !tastAperto.box.contains(e.target) && e.target !== tastAperto.input) chiudiTastierino(); }, true);

  // ----- dialoghi dentro la pagina (alert, confirm e prompt non esistono nell'APK) -----
  function dialogo(titolo, corpo, pulsanti) {
    return new Promise(ok => {
      const chiudi = v => { vel.remove(); ok(v); };
      const vel = el('div', { class: 'velo dialogo', role: 'dialog', 'aria-modal': 'true', 'aria-label': titolo }, [el('div', { class: 'dialogo-box' }, [el('b', { testo: titolo })].concat(corpo(chiudi), [el('div', { class: 'pulsanti' }, pulsanti(chiudi))]))]);
      document.body.appendChild(vel);
      const i = vel.querySelector('input'); if (i) i.focus();
    });
  }
  /** Chiede un testo (anche una password): ritorna il testo o null se si annulla. */
  function chiedi(titolo, opz) {
    opz = opz || {};
    const inp = el('input', { type: opz.password ? 'password' : 'text', id: 'f-chiedi', autocomplete: 'off', 'aria-label': titolo, inputmode: opz.numerico ? 'numeric' : null });
    return dialogo(titolo, chiudi => { inp.addEventListener('keydown', e => { if (e.key === 'Enter') chiudi(inp.value); }); return [opz.nota ? el('p', { class: 'leggenda', testo: opz.nota }) : null, el('div', { class: 'ctrl' }, [inp])]; },
      chiudi => [el('button', { class: 'pul sec', testo: 'Annulla', onclick: () => chiudi(null) }), el('button', { class: 'pul', testo: 'OK', onclick: () => chiudi(inp.value) })]);
  }
  /** Chiede conferma: ritorna true o false. */
  function conferma(titolo, testo, etichetta, pericolo) {
    return dialogo(titolo, () => [el('p', { testo: testo || '' })],
      chiudi => [el('button', { class: 'pul sec', testo: 'Annulla', onclick: () => chiudi(false) }), el('button', { class: 'pul' + (pericolo ? ' peric' : ''), testo: etichetta || 'Conferma', onclick: () => chiudi(true) })]);
  }

  /** Indirizzo mailto per segnalare un problema: versione, schermata e telefono gia scritti. Il contatto viene da contatto.js (da sito.json). */
  function mailSegnalazione(schermata) {
    const a = window.CONTATTO || '';
    const sch = schermata || (typeof attuale !== 'undefined' && attuale) || 'home';
    const corpo = 'Cosa non va (scrivi qui sotto):\n\n\n\n--- non cancellare ---\nVersione: ' + App.VERSIONE + '\nSchermata: ' + sch + '\nTelefono: ' + (navigator.userAgent || '').replace(/\s+/g, ' ').slice(0, 160) + '\nSchermo: ' + window.innerWidth + 'x' + window.innerHeight;
    return 'mailto:' + a + '?subject=' + encodeURIComponent('Hich-Officina ' + App.VERSIONE + ': segnalazione') + '&body=' + encodeURIComponent(corpo);
  }

  // ----- schermate -----
  const App = {
    migra, hash, chiedi, conferma, SCHEMA,
    persPost: i => ({ cambio: i.ppCambio, m8: i.ppM8, m9: i.ppM9, fine: i.ppFine, g43: i.ppG43 !== false, percento: i.ppPercento !== false, commenti: i.ppCommenti, decimali: i.ppDec, passoN: i.ppPasso, iniziali: i.ppIni, finali: i.ppFin }),
    condividiBin,
    O, $, el, esc, fmt, arrot, icona, mem, salva, sezione, imp, IMPOSTAZIONI_SERIE, applicaTema, materiali, materiale, sceltaMateriali,
    avviso, modulo, numeri, ANDROID, misuratore, griglia, info, copia, scarica, scaricaBin, condividi, condividiFile, salvaIn, stampa, scegliTesto, Foto, riduciFoto, pulsantiFoto, schermoPieno, ruotaSchermo, campoNum, chiudiTastierino, mailSegnalazione,
    schermi: {}, param: {}, VERSIONE: '2.47.0'
  };
  window.App = App;

  let attuale = null;
  // quale voce della barra in basso e "accesa" per ogni schermata
  // 2.47.0: uno schema solo, la barra ha gli stessi gruppi della home
  const VOCI_BARRA = { 'g-disegna': ['g-disegna', 'lavoro', 'cad', 'disegno', 'dalDisegno', 'ciclo', 'programma', 'macro', 'macroModifica'],
    'g-controlla': ['g-controlla', 'apri', 'listato', 'simula', 'salvati', 'galleria', 'spiega'],
    'g-calcola': ['g-calcola', 'calcoli', 'tolleranze', 'tabelle', 'angolo', 'misure', 'materiali', 'materiale', 'materialiImporta'],
    'g-archivio': ['g-archivio', 'pezzi', 'pezzo', 'tabellaUtensili', 'utensile', 'utensili', 'preferiti', 'foglio', 'guida', 'note', 'ripristino', 'scambio'] };
  function voceBarra(id) { if (id === 'home') return 'home'; for (const k of Object.keys(VOCI_BARRA)) if (VOCI_BARRA[k].includes(id)) return k; return ''; }
  // 2.47.0: durante la simulazione lo schermo resta acceso (il telefono non si spegne mentre si guarda il percorso).
  // Nell'APK lo fa il ponte Android; nel browser il blocco dello schermo, se c'e. Fuori dalla simulazione torna normale.
  let accesoOra = false, bloccoSchermo = null;
  function schermoAcceso(si) {
    if (si === accesoOra) return;
    accesoOra = si;
    if (window.Android && window.Android.schermoAcceso) { try { window.Android.schermoAcceso(si); } catch (e) { /* ponte vecchio */ } return; }
    try {
      if (si && navigator.wakeLock) navigator.wakeLock.request('screen').then(b => { if (accesoOra) bloccoSchermo = b; else b.release(); }).catch(() => { /* non permesso */ });
      else if (!si && bloccoSchermo) { bloccoSchermo.release(); bloccoSchermo = null; }
    } catch (e) { /* niente */ }
  }
  // il blocco del browser si perde quando l'app va in background: si riprende al ritorno
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && accesoOra && !(window.Android && window.Android.schermoAcceso)) { accesoOra = false; schermoAcceso(true); } });
  function mostra() {
    chiudiTastierino();
    if (document.body.classList.contains('cad-pieno')) { document.body.classList.remove('cad-pieno'); $('schermo').classList.remove('pieno'); App.esciPieno = null; App.orientaPieno = 0; if (window.Android && window.Android.orientamento) window.Android.orientamento('libero'); }
    const h = (location.hash || '').replace(/^#/, '');
    const id = App.schermi[h] ? h : 'home';
    const s = App.schermi[id];
    attuale = id;
    document.body.classList.toggle('home', id === 'home');
    $('titolo').textContent = s.titolo || 'Hich-Officina';
    const ind = $('b-indietro');
    ind.hidden = id === 'home';
    const azioni = $('azioni'); azioni.innerHTML = '';
    if (s.preferibile !== false && id !== 'home' && id !== 'preferiti' && id !== 'impostazioni') {
      const pref = (mem.preferiti || []).includes(id);
      azioni.appendChild(el('button', { class: 'icona-pul' + (pref ? ' attiva' : ''), 'aria-label': pref ? 'Togli dai preferiti' : 'Aggiungi ai preferiti',
        html: icona('stella'), onclick: () => preferito(id) }));
    }
    (s.azioni ? s.azioni() : []).forEach(a => azioni.appendChild(a));
    schermoAcceso(id === 'simula');
    const voce = voceBarra(id);
    document.querySelectorAll('#barra button').forEach(b => { const on = b.dataset.vai === voce; b.classList.toggle('attiva', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    $('b-imp').classList.toggle('attiva', id === 'impostazioni');
    // schermate usate di recente (per la home)
    if (!['home', 'preferiti', 'impostazioni', 'listato', 'simula', 'foglio', 'ripristino', 'macroModifica', 'materiale', 'utensile', 'pezzo', 'misure', 'materialiImporta'].includes(id)) {
      const R = mem.recenti = (mem.recenti || []).filter(x => x !== id); R.unshift(id); if (R.length > 5) R.length = 5; salva();
    }
    const main = $('schermo'); main.innerHTML = '';
    try { s.render(main); } catch (e) { main.appendChild(el('p', { class: 'errore', testo: 'Errore in questa schermata: ' + e.message })); console.error(e); }
    window.scrollTo(0, 0);
  }
  function preferito(id) {
    const L = mem.preferiti = mem.preferiti || [];
    const i = L.indexOf(id);
    if (i >= 0) { L.splice(i, 1); avviso('Tolto dai preferiti'); } else { L.push(id); avviso('Aggiunto ai preferiti'); }
    salva(); mostra();
  }
  /** Vibrazione breve (conferme, tasti, avvisi): dal ponte Android se c'e, se no dal browser. Si spegne in Impostazioni. */
  function vibra(ms) {
    try {
      if ((mem.imp || {}).vibra === false) return;
      if (window.Android && window.Android.vibra) window.Android.vibra(Math.round(ms));
      else if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { /* nessuna vibrazione */ }
  }
  App.vibra = vibra;
  App.vai = function (id) {
    if (('#' + id) === location.hash) mostra(); else location.hash = id;
  };
  App.indietro = function () {
    if (App.esciPieno) { App.esciPieno(); return; }
    if (history.length > 1 && App._dentro) history.back(); else App.vai('home');
  };
  App.ridisegna = () => mostra();
  App.attuale = () => attuale;
  window.addEventListener('hashchange', () => { App._dentro = true; mostra(); });

  // ----- home -----
  // testata della home e marchio: immagini (icone/testata.jpg, icone/icona-192.png)
  const SCENA = '<img class="scena" src="icone/testata.jpg" width="1170" height="630" alt="Fresa che lavora un ingranaggio in acciaio" decoding="async">';
  const MARCHIO = '<img src="icone/icona-192.png" width="64" height="64" alt="" decoding="async">';

  const MENU = [
    ['dalDisegno', 'galleria', 'Dal disegno al pezzo', 'Foto del disegno: le quote lette e confermate diventano il pezzo e il programma'],
    ['lavoro', 'fresa', 'Disegna e lavora', 'Dal pezzo al programma in 4 passi: grezzo, forma, lavorazioni, programma'],
    ['programma', 'nuovo', 'Nuovo programma ISO', 'Fresatura, foratura e tornitura con anteprima'],
    ['calcoli', 'calcolo', 'Calcolatrice di taglio', 'Giri e avanzamenti per utensile e materiale, filetti, peso...'],
    ['tolleranze', 'tolleranza', 'Tolleranze e accoppiamenti', 'ISO 286: fori, alberi, gioco e interferenza'],
    ['macro', 'codice', 'Macro CNC', 'Modelli pronti e macro personali con parametri'],
    ['galleria', 'galleria', 'Galleria esempi', 'Programmi d\'esempio da aprire e modificare'],
    ['ciclo', 'tabella', 'Ciclo di lavoro proposto', 'Dal pezzo (o dalle quote di un disegno) alla lavorazione completa'],
    ['angolo', 'tolleranza', 'Angolo da una foto', 'Misura un lato inclinato e trova la fresa (60°, 90°...)'],
    ['cad', 'fresa', 'Disegna e programma (fresa)', 'Profili, fori, tasche e asole col dito; il programma e la simulazione'],
    ['disegno', 'tornio', 'Disegna un profilo (tornio)', 'Col dito sullo schermo, con la vista 3D del pezzo'],
    ['apri', 'codice', 'Controlla e simula un programma', 'Da una foto dello schermo, da un file o incollato: errori, percorso, tempo'],
    ['salvati', 'salvati', 'Programmi salvati', 'I programmi tenuti su questo telefono'],
    ['pezzi', 'galleria', 'Pezzi e attrezzaggio', 'Foglio di attrezzaggio, note, foto e controllo misure'],
    ['tabellaUtensili', 'utensile', 'Tabella utensili', 'I tuoi utensili: numero T, diametro, lunghezza, taglienti'],
    ['preferiti', 'stella', 'Preferiti', 'Le schermate che hai segnato con la stella'],
    ['guida', 'info', 'Come si fa', 'Ogni funzione in pochi passi, stampabile in PDF'],
    ['tabelle', 'tabella', 'Tabelle', 'Filetti, tolleranze, rugosita, pollici'],
    ['materiali', 'materiale', 'Materiali', 'Velocita di taglio e avanzamenti per materiale']
  ];
  // la home: quattro ingressi grandi, gli stessi della barra in basso; ogni funzione sta in un gruppo solo
  const GRUPPI = {
    disegna: { t: 'Disegna', s: 'Lavoro guidato, CAD, programma', ic: 'fresa', voci: ['lavoro', 'cad', 'disegno', 'dalDisegno', 'ciclo', 'programma', 'macro'] },
    controlla: { t: 'Controlla', s: 'Apri, simula, programmi salvati', ic: 'codice', voci: ['apri', 'salvati', 'galleria'] },
    calcola: { t: 'Calcola', s: 'Giri, tolleranze, filetti, materiali', ic: 'calcolo', voci: ['calcoli', 'tolleranze', 'tabelle', 'angolo', 'materiali'] },
    archivio: { t: 'Archivio', s: 'Pezzi, utensili, preferiti, guida', ic: 'salvati', voci: ['pezzi', 'tabellaUtensili', 'preferiti', 'guida'] }
  };
  const TITOLO_BREVE = { cad: 'CAD fresa libero', disegno: 'CAD tornio libero', programma: 'Programma ISO a mano', macro: 'Macro CNC', ciclo: 'Ciclo di lavoro', calcoli: 'Calcolatrice di taglio', tolleranze: 'Tolleranze',
    angolo: 'Angolo da una foto', tabelle: 'Tabelle e filetti', apri: 'Controlla e simula', galleria: 'Esempi', pezzi: 'Pezzi e attrezzaggio', tabellaUtensili: 'Tabella utensili', salvati: 'Programmi salvati', materiali: 'Materiali', guida: 'Come si fa' };
  function tessera([id, ic, t, s]) {
    return el('button', { class: 'tessera', 'data-vai': id, 'aria-label': t, onclick: () => App.vai(id) }, [
      el('span', { class: 'ic', html: icona(ic) }), el('b', { testo: TITOLO_BREVE[id] || t }), el('small', { testo: s })]);
  }
  Object.keys(GRUPPI).forEach(k => {
    App.schermi['g-' + k] = { titolo: GRUPPI[k].t, render(m) { m.appendChild(el('div', { class: 'tessere' }, GRUPPI[k].voci.map(id => MENU.find(x => x[0] === id)).filter(Boolean).map(tessera))); } };
  });
  function voceMenu([id, ic, t, s]) {
    return el('button', { class: 'voce', onclick: () => App.vai(id) }, [
      el('span', { class: 'ic', html: icona(ic) }), el('span', { class: 't' }, [el('b', { testo: t }), el('small', { testo: s })]),
      el('span', { html: icona('avanti', 'freccia') })
    ]);
  }
  App.MENU = MENU; App.voceMenu = voceMenu;
  App.schermi.home = {
    titolo: 'Hich-Officina', preferibile: false,
    render(m) {
      const eroe = el('div', { class: 'eroe', html: SCENA + '<div class="marchio">' + MARCHIO + '<div><b>Hich-Officina</b><small>Calcoli e programmi CNC</small></div></div>' });
      eroe.appendChild(el('button', { class: 'icona-pul home-imp', 'aria-label': 'Impostazioni', html: icona('ingranaggio'), onclick: () => { vibra(8); App.vai('impostazioni'); } }));
      m.appendChild(eroe);
      const cerca = el('input', { id: 'f-cerca-home', type: 'search', placeholder: 'Cerca: M10, H7 25, 316, G83, T5...', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'search' });
      const risultati = el('div', { class: 'menu', hidden: true });
      const menu = el('div', { class: 'menu-sezioni' });
      if (App.calcoloRapido) menu.appendChild(App.calcoloRapido());
      const L = mem.lavoro;
      const haLavoro = L && L.usato && ((L.fresa && (L.fresa.forme || []).length) || (L.tornio && (L.tornio.tratti || []).length));
      // primo avvio: una scheda (non blocca niente) con la macchina e i giri massimi
      if (!mem.benvenuto && !haLavoro && !(mem.salvati || []).length) {
        const I = imp(), v = { nmaxFresa: I.nmaxFresa, nmaxTornio: I.nmaxTornio };
        let modo = 'fresa';
        const scelte = el('div', { class: 'chips' }, [['fresa', 'Fresa'], ['tornio', 'Tornio'], ['entrambe', 'Tutte e due']].map(([k, t]) => el('button', { class: 'chip' + (k === modo ? ' attiva' : ''), 'data-macchina': k, testo: t, onclick: e => { modo = k; scelte.querySelectorAll('.chip').forEach(b => b.classList.toggle('attiva', b === e.currentTarget)); } })));
        const chiudi = vai => { mem.benvenuto = true; mem.imp = Object.assign({}, mem.imp || {}, { nmaxFresa: Number(v.nmaxFresa) || I.nmaxFresa, nmaxTornio: Number(v.nmaxTornio) || I.nmaxTornio }); const Lv = sezione('lavoro'); Lv.modo = modo === 'tornio' ? 'tornio' : 'fresa'; salva(); if (vai) App.vai('lavoro'); else App.ridisegna(); };
        menu.appendChild(el('div', { class: 'benvenuto', id: 'h-benvenuto' }, [el('b', { testo: 'Benvenuto' }), el('p', { testo: 'Disegni il pezzo scrivendo le quote, l\'app propone le lavorazioni e scrive il programma. Dimmi la tua macchina:' }), scelte,
          el('div', { class: 'lav-campi due' }, [campoNum(v, 'nmaxFresa', 'Giri massimi fresa', 'giri'), campoNum(v, 'nmaxTornio', 'Giri massimi tornio', 'giri')]),
          el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', id: 'h-inizia', testo: 'Prova con un esempio', onclick: () => chiudi(true) }), el('button', { class: 'pul sec', id: 'h-salta', testo: 'Salta', onclick: () => chiudi(false) })])]));
      }
      if (haLavoro) menu.appendChild(el('button', { class: 'continua', id: 'h-continua', onclick: () => App.vai('lavoro') }, [el('span', { class: 'ic', html: icona('avanti') }),
        el('span', { class: 't' }, [el('b', { testo: 'Continua l\'ultimo lavoro' }), el('small', { testo: (L.modo === 'tornio' ? 'Tornio' : 'Fresa') + ' · passo ' + ((Number(L.passo) || 0) + 1) + ' di 4' })])]));
      menu.appendChild(el('div', { class: 'ingressi' }, Object.entries(GRUPPI).map(([k, g]) => el('button', { class: 'ingresso' + (k === 'disegna' ? ' primo' : ''), 'data-gruppo': k, onclick: () => App.vai(g.vai || 'g-' + k) }, [
        el('span', { class: 'ic', html: icona(g.ic) }), el('span', { class: 'tt' }, [el('b', { testo: g.t }), el('small', { testo: g.s })])]))));
      const rec = (mem.recenti || []).map(id => MENU.find(x => x[0] === id)).filter(Boolean).slice(0, 4);
      // promemoria della copia di sicurezza: una settimana dall'ultima copia (o dal primo uso) se ci sono dati
      const ha = ['salvati', 'pezzi', 'macro', 'tabellaUt'].some(k => (mem[k] || []).length) || Array.isArray(mem.materiali);
      const giorni = d => Math.floor((Date.now() - new Date(d + (String(d).length === 10 ? 'T12:00:00' : '')).getTime()) / 86400000);
      const rif = mem.ultimaCopia || mem.primoUso;
      const dovuta = imp().promemoriaCopia && ha && rif && giorni(rif) >= 7 && !(mem.promemoriaFino && new Date(mem.promemoriaFino) > new Date());
      const promemoria = dovuta ? el('div', { class: 'info avviso', role: 'alert' }, [el('div', { html: icona('avviso') }), el('div', {}, [
        el('div', { html: '<b>' + (mem.ultimaCopia ? 'Ultima copia di sicurezza ' + giorni(mem.ultimaCopia) + ' giorni fa' : 'Non hai ancora fatto la copia di sicurezza') + '.</b> Programmi, macro, pezzi e utensili stanno solo su questo telefono.' }),
        el('div', { class: 'pulsanti', style: 'margin:8px 0 0' }, [el('button', { class: 'pul', style: 'padding:9px', testo: 'Fai la copia', onclick: () => App.copiaSicurezza && App.copiaSicurezza() }),
          el('button', { class: 'pul sec', style: 'padding:9px', testo: 'Tra 3 giorni', onclick: () => { mem.promemoriaFino = new Date(Date.now() + 3 * 86400000).toISOString(); salva(); promemoria.remove(); } })])])]) : null;
      const recBox = rec.length ? el('div', { class: 'recenti' }, [el('div', { class: 'sez', style: 'margin:0 2px 6px', testo: 'Usati di recente' }), el('div', { class: 'chips' }, rec.map(v => el('button', { class: 'chip', testo: v[2], onclick: () => App.vai(v[0]) })))]) : null;
      m.append(...[el('div', { class: 'ctrl cerca-home' }, [el('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>' }), cerca]), promemoria, recBox, risultati, menu].filter(Boolean));   // senza i null: append(null) scrive la parola "null"
      cerca.addEventListener('input', () => {
        const q = cerca.value.trim();
        const L = App.cerca ? App.cerca(q) : [];
        risultati.innerHTML = '';
        risultati.hidden = q.length < 2; menu.hidden = q.length >= 2; if (recBox) recBox.hidden = q.length >= 2;
        if (q.length < 2) return;
        if (!L.length) risultati.appendChild(el('div', { class: 'vuoto', testo: 'Niente per "' + q + '". Prova M10, H7 25, 316, G83, T5 o il nome di un pezzo.' }));
        L.forEach(r => risultati.appendChild(el('button', { class: 'voce', onclick: r.vai }, [el('span', { class: 't' }, [el('b', { testo: r.titolo }), el('small', { testo: r.sotto })]), el('span', { html: icona('avanti', 'freccia') })])));
      });
    }
  };

  /** Ricerca in tutta l'app: lente in testata, finestra sopra qualunque schermata. */
  App.apriCerca = () => {
    document.querySelectorAll('.cerca-globale').forEach(x => x.remove());
    const chiudi = () => { box.remove(); document.removeEventListener('keydown', tasto); };
    const tasto = e => { if (e.key === 'Escape') chiudi(); };
    const campo = el('input', { id: 'f-cerca-globale', type: 'search', placeholder: 'Cerca: M10, H7 25, 316, G83, T5, un pezzo...', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'search', 'aria-label': 'Cerca in tutta l\'app' });
    const ris = el('div', { class: 'elenco', id: 'cerca-globale-ris' });
    const box = el('div', { class: 'cerca-globale', role: 'dialog', 'aria-label': 'Ricerca' }, [
      el('div', { class: 'cerca-globale-testa' }, [campo, el('button', { class: 'pul sec', id: 'cerca-globale-x', type: 'button', testo: 'Chiudi', onclick: chiudi })]), ris]);
    const mostra2 = () => {
      const q = campo.value.trim(); ris.innerHTML = '';
      if (q.length < 2) { ris.appendChild(el('div', { class: 'vuoto', testo: 'Scrivi almeno due lettere: programmi, pezzi, materiali, filetti, tolleranze, codici G e M, utensili, durezze, schermate.' })); return; }
      const L = App.cerca ? App.cerca(q) : [];
      if (!L.length) ris.appendChild(el('div', { class: 'vuoto', testo: 'Niente per "' + q + '".' }));
      L.forEach(r => ris.appendChild(el('button', { class: 'voce', onclick: () => { chiudi(); r.vai(); } }, [el('span', { class: 't' }, [el('b', { testo: r.titolo }), el('small', { testo: r.sotto })]), el('span', { html: icona('avanti') })])));
    };
    campo.addEventListener('input', mostra2);
    document.addEventListener('keydown', tasto);
    document.body.appendChild(box); mostra2(); campo.focus();
  };

  // ----- avvio (dopo che tutti gli script hanno registrato le schermate) -----
  document.addEventListener('DOMContentLoaded', () => {
    applicaTema();
    document.querySelectorAll('[data-ic]').forEach(s => { s.outerHTML = icona(s.dataset.ic); });
    $('b-indietro').innerHTML = icona('indietro');
    $('b-indietro').addEventListener('click', App.indietro);
    $('b-cerca').addEventListener('click', () => { vibra(8); App.apriCerca(); });
    document.querySelectorAll('#barra button, #b-imp').forEach(b => b.addEventListener('click', () => { vibra(8); App.vai(b.dataset.vai); }));
    mostra();
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      try {
        // quando arriva una versione nuova: la pagina si ricarica una volta da sola
        const avevaControllo = !!navigator.serviceWorker.controller;
        let ricaricata = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => { if (avevaControllo && !ricaricata) { ricaricata = true; location.reload(); } });
        navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => { /* senza cache funziona lo stesso in linea */ });
      } catch (e) { /* niente */ }
    }
    if (mem.versione !== App.VERSIONE) {
      if (mem.versione) setTimeout(() => avviso('App aggiornata alla versione ' + App.VERSIONE), 400);
      mem.versione = App.VERSIONE; salva();
    }
  });
})();
