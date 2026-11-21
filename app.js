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
    modifica: '<path d="M4 20h4L19 9l-4-4L4 16z"/>'
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
  let mem = {};
  try { mem = JSON.parse(localStorage.getItem(CHIAVE) || '{}') || {}; } catch (e) { mem = {}; }
  // valori della versione 1 (calcolatori): si tengono
  try { const v1 = JSON.parse(localStorage.getItem('hich-officina-v1') || 'null'); if (v1 && !mem.valori && v1.valori) mem.valori = v1.valori; } catch (e) { /* niente */ }
  let salvaTimer = null;
  function salva() {
    clearTimeout(salvaTimer);
    salvaTimer = setTimeout(() => { try { localStorage.setItem(CHIAVE, JSON.stringify(mem)); } catch (e) { /* niente */ } }, 150);
  }
  const sezione = k => (mem[k] = mem[k] || {});

  // ----- impostazioni -----
  const IMPOSTAZIONI_SERIE = {
    tema: 'scuro', nmaxFresa: 24000, nmaxTornio: 3000, zSic: 50, zR: 2, refrig: true, g43: true, numerare: false,
    codLimite: 'G50', codFiletto: 'G32', xCambio: '', zCambio: 50, fineZ: '', numProg: 1
  };
  const imp = () => Object.assign({}, IMPOSTAZIONI_SERIE, mem.imp || {});
  function applicaTema() {
    const t = imp().tema;
    if (t === 'chiaro') document.documentElement.setAttribute('data-theme', 'light');
    else if (t === 'scuro') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
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
  async function copia(testo, cosa) {
    try { await navigator.clipboard.writeText(testo); avviso((cosa || 'Testo') + ' copiato'); return true; } catch (e) {
      const t = el('textarea', { style: 'position:fixed;opacity:0' }); t.value = testo; document.body.appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (x) { ok = false; }
      t.remove(); avviso(ok ? (cosa || 'Testo') + ' copiato' : 'Non riesco a copiare: tieni premuto sul testo'); return ok;
    }
  }
  function scarica(nome, testo) {
    const blob = new Blob([testo], { type: 'text/plain' });
    const a = el('a', { href: URL.createObjectURL(blob), download: nome });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    avviso('Salvato ' + nome);
  }
  async function condividi(nome, testo) {
    try {
      const file = new File([testo], nome, { type: 'text/plain' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: nome }); return; }
      if (navigator.share) { await navigator.share({ title: nome, text: testo }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    scarica(nome, testo);
  }

  // ----- schermate -----
  const App = {
    O, $, el, esc, fmt, arrot, icona, mem, salva, sezione, imp, IMPOSTAZIONI_SERIE, applicaTema, materiali, materiale, sceltaMateriali,
    avviso, modulo, numeri, misuratore, griglia, info, copia, scarica, condividi,
    schermi: {}, param: {}, VERSIONE: '2.1.0'
  };
  window.App = App;

  let attuale = null;
  function mostra() {
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
    document.querySelectorAll('#barra button').forEach(b => b.classList.toggle('attiva', b.dataset.vai === id));
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
  App.vai = function (id) {
    if (('#' + id) === location.hash) mostra(); else location.hash = id;
  };
  App.indietro = function () {
    if (history.length > 1 && App._dentro) history.back(); else App.vai('home');
  };
  App.ridisegna = () => mostra();
  App.attuale = () => attuale;
  window.addEventListener('hashchange', () => { App._dentro = true; mostra(); });

  // ----- home -----
  const SCENA = '<svg class="scena" viewBox="0 0 400 250" role="img" aria-label="Fresa che lavora un blocco di acciaio">' +
    '<defs><linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2b4a"/><stop offset="1" stop-color="#070c16"/></linearGradient>' +
    '<linearGradient id="gM" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5b6678"/><stop offset=".45" stop-color="#d9e1ec"/><stop offset="1" stop-color="#4a5466"/></linearGradient>' +
    '<linearGradient id="gF" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b7486"/><stop offset=".5" stop-color="#f2f5fa"/><stop offset="1" stop-color="#5a6274"/></linearGradient>' +
    '<linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa6b8"/><stop offset="1" stop-color="#4b5567"/></linearGradient>' +
    '<radialGradient id="gL" cx=".62" cy=".35" r=".6"><stop offset="0" stop-color="#3d7bff" stop-opacity=".35"/><stop offset="1" stop-color="#3d7bff" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="400" height="250" fill="url(#gC)"/><rect width="400" height="250" fill="url(#gL)"/>' +
    '<g opacity=".18" stroke="#8fb4ff" stroke-width=".6">' + Array.from({ length: 9 }, (_, i) => '<path d="M' + (i * 50) + ' 0v250"/>').join('') + '</g>' +
    // mandrino
    '<rect x="196" y="-10" width="96" height="62" rx="6" fill="url(#gM)"/><rect x="206" y="52" width="76" height="20" rx="3" fill="#3a4354"/>' +
    '<path d="M214 72h60l-8 26h-44z" fill="url(#gM)"/><rect x="230" y="98" width="28" height="14" fill="#2c3442"/>' +
    // fresa con le eliche
    '<rect x="234" y="112" width="20" height="62" fill="url(#gF)"/>' +
    '<g stroke="#4a5262" stroke-width="2.2" fill="none"><path d="M234 120l20 9M234 133l20 9M234 146l20 9M234 159l20 9"/></g>' +
    // blocco
    '<path d="M70 176l150-34 140 26-150 40z" fill="#c3ccd8"/><path d="M70 176v44l140 30v-42z" fill="url(#gB)"/><path d="M210 208v42l150-38v-44z" fill="#5d6779"/>' +
    '<path d="M170 168l60-12 58 10-60 13z" fill="#7d889a"/><path d="M170 168v10l58 12v-11z" fill="#6a7486"/>' +
    // trucioli
    '<g fill="#e3c27a" opacity=".9"><path d="M262 168c8-6 14-2 10 4-3 4-8 2-6-1"/><path d="M216 172c-6-5-12-1-8 4 3 3 7 1 5-1"/><path d="M280 150c6-3 9 1 6 4"/><path d="M200 160c-5-2-8 2-5 4"/></g>' +
    '<g fill="#fff" opacity=".7"><circle cx="270" cy="160" r="1.4"/><circle cx="290" cy="170" r="1"/><circle cx="210" cy="164" r="1.2"/></g>' +
    '<rect y="150" width="400" height="100" fill="url(#gC)" opacity=".35"/></svg>';
  const MARCHIO = '<svg viewBox="0 0 64 64" aria-hidden="true"><g transform="translate(32 32)"><g fill="#1f7aff">' +
    Array.from({ length: 8 }, (_, i) => '<rect x="-5" y="-30" width="10" height="12" rx="2" transform="rotate(' + i * 45 + ')"/>').join('') +
    '</g><circle r="21" fill="#1f7aff"/><circle r="15" fill="#0b1220"/><path d="M-6 6l12-12" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle r="3.5" fill="#fff"/></g></svg>';

  const MENU = [
    ['programma', 'nuovo', 'Nuovo programma ISO', 'Fresatura, foratura e tornitura con anteprima'],
    ['calcoli', 'calcolo', 'Calcolatrice di taglio', 'Giri, avanzamenti, filetti, coni, peso...'],
    ['utensili', 'utensile', 'Utensili e dati di taglio', 'Punte, inserti, alesatori, bareni, maschi, frese'],
    ['tolleranze', 'tolleranza', 'Tolleranze e accoppiamenti', 'ISO 286: fori, alberi, gioco e interferenza'],
    ['macro', 'codice', 'Macro CNC', 'Modelli pronti e macro personali con parametri'],
    ['galleria', 'galleria', 'Galleria esempi', 'Programmi d\'esempio da aprire e modificare'],
    ['salvati', 'salvati', 'Programmi salvati', 'I programmi tenuti su questo telefono'],
    ['tabelle', 'tabella', 'Tabelle', 'Filetti, tolleranze, rugosita, pollici'],
    ['materiali', 'materiale', 'Materiali', 'Velocita di taglio e avanzamenti per materiale']
  ];
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
      m.appendChild(el('div', { class: 'eroe', html: SCENA + '<div class="marchio">' + MARCHIO + '<div><b>Hich-Officina</b><small>Calcoli e programmi CNC</small></div></div>' }));
      const menu = el('div', { class: 'menu' });
      MENU.forEach(v => menu.appendChild(voceMenu(v)));
      m.appendChild(menu);
    }
  };

  // ----- avvio (dopo che tutti gli script hanno registrato le schermate) -----
  document.addEventListener('DOMContentLoaded', () => {
    applicaTema();
    document.querySelectorAll('[data-ic]').forEach(s => { s.outerHTML = icona(s.dataset.ic); });
    $('b-indietro').innerHTML = icona('indietro');
    $('b-indietro').addEventListener('click', App.indietro);
    document.querySelectorAll('#barra button').forEach(b => b.addEventListener('click', () => App.vai(b.dataset.vai)));
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
