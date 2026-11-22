// ===== Hich-Officina: esporta e importa i dati (utensili, materiali, macro) =====
// I materiali escono nel formato della libreria di Hich-CAM ({materiali:[...]}): si caricano li con il pulsante JSON.
(function () {
  'use strict';
  const A = window.App, O = A.O, el = A.el, esc = A.esc;
  const oggi = () => new Date().toISOString().slice(0, 10);

  /** Cosa c'e in un file di dati: {tipo, dati, errore}. */
  function leggiFile(testo) {
    let d;
    try { d = JSON.parse(String(testo || '').replace(/^﻿/, '')); } catch (e) { return { errore: 'Il file non e un JSON valido.' }; }
    if (d && Array.isArray(d.materiali)) { const r = O.leggiMateriali(JSON.stringify(d)); return r.errore ? { errore: r.errore } : { tipo: 'materiali', dati: r.materiali }; }
    if (d && d.app === 'hich-officina' && d.mem) return { tipo: 'copia', dati: d };
    if (d && d.app === 'hich-officina' && d.tipo === 'utensili' && Array.isArray(d.dati)) {
      const ok = d.dati.filter(u => u && Number(u.t) >= 0 && u.tipo);
      return ok.length ? { tipo: 'utensili', dati: ok } : { errore: 'Nel file non ci sono utensili validi.' };
    }
    if (d && d.app === 'hich-officina' && d.tipo === 'macro' && Array.isArray(d.dati)) {
      const ok = d.dati.filter(x => x && x.nome && Number(x.num) > 0 && Array.isArray(x.par));
      return ok.length ? { tipo: 'macro', dati: ok } : { errore: 'Nel file non ci sono macro valide.' };
    }
    return { errore: 'Il file non e di un tipo che conosco (utensili, macro, materiali o copia di sicurezza).' };
  }
  O.leggiFileDati = leggiFile;
  /** Unisce utensili: lo stesso numero T sostituisce quello che c'e. Ritorna {aggiunti, sostituiti}. */
  function unisciUtensili(tab, nuovi) {
    let agg = 0, sost = 0;
    nuovi.forEach(u => {
      const x = Object.assign({}, u, { id: u.id || 'u' + Date.now() + Math.floor(Math.random() * 1e6), t: Number(u.t) });
      const i = tab.findIndex(y => Number(y.t) === x.t);
      if (i >= 0) { x.id = tab[i].id; tab[i] = x; sost++; } else { tab.push(x); agg++; }
    });
    return { aggiunti: agg, sostituiti: sost };
  }
  /** Unisce macro: un numero gia usato prende il primo libero dopo. */
  function unisciMacro(lista, nuove) {
    let agg = 0, rinum = 0;
    nuove.forEach(m => {
      const x = JSON.parse(JSON.stringify(m));
      const usati = lista.map(y => Number(y.num));
      if (usati.includes(Number(x.num))) { let n = Number(x.num); while (usati.includes(n)) n++; x.num = n; rinum++; }
      lista.push(x); agg++;
    });
    return { aggiunte: agg, rinumerate: rinum };
  }
  O.unisciUtensili = unisciUtensili; O.unisciMacro = unisciMacro;

  A.schermi.scambio = {
    titolo: 'Esporta e importa', preferibile: false,
    render(m) {
      const tab = () => (A.tabellaUt ? A.tabellaUt() : []);
      const esporta = (tipo) => {
        if (tipo === 'utensili') { if (!tab().length) { A.avviso('La tabella utensili e vuota'); return; } A.condividiFile('utensili-' + oggi() + '.json', JSON.stringify({ app: 'hich-officina', tipo: 'utensili', dati: tab() }, null, 1), 'application/json'); }
        else if (tipo === 'macro') { const L = A.mem.macro || []; if (!L.length) { A.avviso('Non ci sono macro tue da esportare'); return; } A.condividiFile('macro-' + oggi() + '.json', JSON.stringify({ app: 'hich-officina', tipo: 'macro', dati: L }, null, 1), 'application/json'); }
        else if (tipo === 'materiali') A.condividiFile('materiali-' + oggi() + '.json', JSON.stringify({ materiali: A.materiali() }, null, 1), 'application/json');
      };
      m.appendChild(el('div', { class: 'sez', testo: 'Esporta' }));
      m.appendChild(el('div', { class: 'menu' }, [
        ['utensili', 'utensile', 'Tabella utensili', 'File JSON da portare su un altro telefono'],
        ['materiali', 'materiale', 'Materiali (formato di Hich-CAM)', 'Si carica nella libreria materiali di Hich-CAM con il pulsante JSON'],
        ['macro', 'codice', 'Le mie macro', 'File JSON con parametri e sottoprogrammi']].map(([id, ic, t, sotto]) => el('button', { class: 'voce', onclick: () => esporta(id) }, [
        el('span', { class: 'ic', html: A.icona(ic) }), el('span', { class: 't' }, [el('b', { testo: t }), el('small', { testo: sotto })]), el('span', { html: A.icona('condividi', 'freccia') })]))));
      m.appendChild(el('div', { class: 'sez', testo: 'Importa' }));
      const esito = el('div');
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('salvati') + 'Scegli un file', onclick: () => A.scegliTesto(testo => analizza(testo), '.json,application/json') })]));
      m.appendChild(esito);
      m.appendChild(A.info('Si importano file di utensili, macro, materiali (anche della libreria di Hich-CAM) e le copie di sicurezza. Prima di cambiare qualcosa vedi cosa c\'e dentro.'));
      function analizza(testo) {
        esito.innerHTML = '';
        const r = leggiFile(testo);
        if (r.errore) { esito.appendChild(el('p', { class: 'errore', testo: r.errore })); return; }
        if (r.tipo === 'copia') { const c = O.leggiCopia(testo); A.param.copia = c; A.vai('ripristino'); return; }
        const t = r.tipo, n = r.dati.length;
        esito.appendChild(A.info('<b>' + n + (t === 'utensili' ? ' utensili' : t === 'macro' ? ' macro' : ' materiali') + '</b>: ' + r.dati.slice(0, 8).map(x => esc(t === 'utensili' ? 'T' + x.t + ' ' + (O.UTENSILI.find(u => u[0] === x.tipo) || [0, x.tipo])[1] : t === 'macro' ? x.nome : x.n)).join(', ') + (n > 8 ? '...' : '') + '.'));
        const avviso = t === 'materiali' ? 'I materiali di adesso vengono sostituiti.' : t === 'utensili' ? 'Lo stesso numero T sostituisce l\'utensile che c\'e; gli altri restano.' : 'Un numero di macro gia usato prende il primo libero.';
        esito.appendChild(A.info(avviso, 'avviso'));
        esito.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('salvati') + 'Importa', onclick: () => {
          if (t === 'materiali') { A.mem.materiali = r.dati; A.salva(); A.avviso(n + ' materiali presi'); }
          else if (t === 'utensili') { const x = unisciUtensili(tab(), r.dati); A.salva(); A.avviso(x.aggiunti + ' aggiunti, ' + x.sostituiti + ' sostituiti'); }
          else { A.mem.macro = A.mem.macro || []; const x = unisciMacro(A.mem.macro, r.dati); A.salva(); A.avviso(x.aggiunte + ' macro aggiunte' + (x.rinumerate ? ', ' + x.rinumerate + ' rinumerate' : '')); }
          esito.innerHTML = '';
        } })]));
      }
      A.scambioAnalizza = analizza;
    }
  };
})();
