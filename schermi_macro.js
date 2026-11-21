// ===== Hich-Officina: macro CNC (modelli pronti e macro personali) =====
// Chiamata G65 P.... con argomenti a lettere; il sottoprogramma legge le variabili locali (#1 = A, #2 = B, ...).
(function () {
  'use strict';
  const A = window.App, O = A.O, el = A.el, esc = A.esc;
  const mie = () => (A.mem.macro = A.mem.macro || []);
  const copiaProfonda = x => JSON.parse(JSON.stringify(x));

  function elemento(mc, sotto, apri) {
    return el('button', { class: 'elem', onclick: apri }, [
      el('span', { class: 'ic', html: A.icona('codice') }),
      el('span', { class: 't' }, [el('b', { testo: mc.nome }), el('small', { testo: sotto })]),
      el('span', { class: 'fine', html: A.icona('avanti') })
    ]);
  }

  A.schermi.macro = {
    titolo: 'Macro CNC',
    render(m) {
      const S = A.sezione('macroVista');
      const schede = el('div', { class: 'schede' });
      const corpo = el('div');
      m.append(schede, corpo);
      const mostra = () => {
        schede.querySelectorAll('button').forEach(b => b.classList.toggle('attiva', b.dataset.id === (S.tab || 'mie')));
        corpo.innerHTML = '';
        const lista = el('div', { class: 'elenco' });
        if ((S.tab || 'mie') === 'mie') {
          if (!mie().length) lista.appendChild(el('div', { class: 'vuoto', html: 'Nessuna macro personale.<br>Crea la tua oppure parti da un modello.' }));
          mie().forEach((mc, i) => lista.appendChild(elemento(mc, 'O' + String(mc.num).padStart(4, '0') + ' · ' + (mc.desc || ''), () => { A.param.macro = { i }; A.vai('macroModifica'); })));
        } else {
          O.MACRO_MODELLI.forEach(mc => lista.appendChild(elemento(mc, 'O' + mc.num + ' · ' + mc.desc, () => { A.param.macro = { modello: mc.id }; A.vai('macroModifica'); })));
        }
        corpo.appendChild(lista);
        corpo.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('piu') + 'Crea macro personalizzata',
          onclick: () => { A.param.macro = { nuova: true }; A.vai('macroModifica'); } })]));
        corpo.appendChild(A.info('La macro si chiama con <b>G65 P</b> e il numero del sottoprogramma; ogni lettera passata arriva come variabile: ' +
          Object.keys(O.LETTERE_VAR).map(l => l + '=#' + O.LETTERE_VAR[l]).join(' ') + '. Controlla che la tua macchina abbia le macro con variabili.'));
      };
      [['mie', 'Le mie macro'], ['modelli', 'Modelli']].forEach(([id, t]) => schede.appendChild(el('button', { 'data-id': id, testo: t, onclick: () => { S.tab = id; A.salva(); mostra(); } })));
      mostra();
    }
  };

  A.schermi.macroModifica = {
    titolo: 'Creazione macro', preferibile: false,
    render(m) {
      const P = A.param.macro || { nuova: true };
      let mc;
      if (P.i !== undefined && mie()[P.i]) mc = copiaProfonda(mie()[P.i]);
      else if (P.modello) { const md = O.MACRO_MODELLI.find(x => x.id === P.modello); mc = copiaProfonda({ nome: md.nome, num: md.num, desc: md.desc, par: md.par, corpo: md.corpo.join('\n') }); }
      else {
        const usati = mie().map(x => Number(x.num));
        let num = 9101; while (usati.includes(num)) num++;
        mc = { nome: 'Nuova macro', num, desc: '', par: [['A', 'Primo parametro', 10]], corpo: '(SCRIVI QUI IL SOTTOPROGRAMMA)\n(USA #1 PER A, #2 PER B, ...)\nM99' };
      }
      if (!Array.isArray(mc.corpo)) mc.corpo = String(mc.corpo || '');
      else mc.corpo = mc.corpo.join('\n');
      const v = { nome: mc.nome, num: mc.num, desc: mc.desc || '', corpo: mc.corpo };
      const pan = el('div', { class: 'pannello' });
      const parBox = el('div', { class: 'pannello pieno' });
      const corpoBox = el('div', { class: 'pannello' });
      const uscita = el('div');
      m.append(pan, el('div', { class: 'sez', testo: 'Parametri' }), parBox, el('div', { class: 'sez', testo: 'Sottoprogramma' }), corpoBox, uscita);
      const aggiorna = () => {
        mc.nome = v.nome; mc.num = O.num(v.num); mc.desc = v.desc; mc.corpo = v.corpo;
        const r = O.scriviMacro(mc);
        uscita.innerHTML = '';
        if (r.errori.length) r.errori.forEach(e => uscita.appendChild(el('p', { class: 'errore', testo: e })));
        uscita.appendChild(el('div', { class: 'sez', testo: 'Chiamata' }));
        uscita.appendChild(el('div', { class: 'chiamata', testo: r.chiamata }));
        uscita.appendChild(el('div', { class: 'pulsanti' }, [
          el('button', { class: 'pul sec', html: A.icona('copia') + 'Chiamata', onclick: () => A.copia(r.chiamata, 'Chiamata') }),
          el('button', { class: 'pul sec', html: A.icona('copia') + 'Sottoprogramma', onclick: () => A.copia(['%'].concat(r.sotto, ['%']).join('\n'), 'Sottoprogramma') })]));
        uscita.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Simula con questi valori', onclick: () => {
          if (r.errori.length) { A.avviso('Correggi prima gli errori'); return; }
          const testo = ['%', 'O0001 (PROVA DELLA MACRO)', 'G90 G17 G0 X0 Y0 Z50', r.chiamata, 'M30', '%'].concat(r.sotto, ['%']).join('\n');
          A.param.sim = { testo, modo: 'fresa', titolo: 'Macro ' + mc.nome, macro: true }; A.vai('simula');
        } })]));
        uscita.appendChild(el('div', { class: 'sez', testo: 'Anteprima' }));
        const box = el('div', { class: 'listato', style: 'max-height:320px' });
        box.innerHTML = r.sotto.map((x, i) => '<div><span class="n">' + (i + 1) + '</span><span>' + A.colora(x) + '</span></div>').join('');
        uscita.appendChild(box);
        const azioni = el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('salvati') + 'Salva macro', onclick: () => {
          if (r.errori.length) { A.avviso('Correggi prima gli errori'); return; }
          const L = mie();
          const altra = L.findIndex((x, i) => Number(x.num) === mc.num && i !== P.i);
          if (altra >= 0) { A.avviso('Il numero O' + mc.num + ' e gia usato da "' + L[altra].nome + '"'); return; }
          const copia = copiaProfonda(mc);
          if (P.i !== undefined && L[P.i]) L[P.i] = copia; else { L.push(copia); P.i = L.length - 1; delete P.modello; delete P.nuova; }
          A.salva(); A.avviso('Macro salvata');
        } })]);
        uscita.appendChild(azioni);
        uscita.appendChild(el('div', { class: 'pulsanti' }, [
          el('button', { class: 'pul sec', html: A.icona('condividi') + 'Condividi', onclick: () => A.condividi('O' + String(mc.num).padStart(4, '0') + '.nc', ['%'].concat(r.sotto, ['%']).join('\r\n') + '\r\n') }),
          P.i !== undefined && mie()[P.i] ? el('button', { class: 'pul peric', html: A.icona('cestino') + 'Elimina', onclick: () => elimina() }) : null]));
      };
      let conferma = false;
      const elimina = () => {
        if (!conferma) { conferma = true; A.avviso('Premi ancora Elimina per confermare'); setTimeout(() => { conferma = false; }, 3000); return; }
        mie().splice(P.i, 1); A.salva(); A.avviso('Macro eliminata'); A.vai('macro');
      };
      A.modulo(pan, [{ id: 'nome', et: 'Nome macro', tipo: 'testo' }, { id: 'num', et: 'Numero sottoprogramma', sub: 'O e P della chiamata', v: 9101 },
        { id: 'desc', et: 'Descrizione', tipo: 'testo', largo: true }], v, aggiorna);
      A.modulo(corpoBox, [{ id: 'corpo', et: 'Righe del sottoprogramma (senza la riga O)', tipo: 'area', mono: true, righe: 12 }], v, aggiorna);
      const disegnaPar = () => {
        parBox.innerHTML = '';
        parBox.appendChild(el('div', { class: 'par-riga', style: 'font-size:11.5px;color:var(--tenue)' }, [el('span', { testo: 'Lettera' }), el('span', { testo: 'Descrizione' }), el('span', { testo: 'Valore' }), el('span')]));
        mc.par.forEach((p, i) => {
          const L = el('input', { value: p[0], maxlength: 1, 'aria-label': 'Lettera ' + (i + 1), autocomplete: 'off' });
          const D = el('input', { value: p[1], 'aria-label': 'Descrizione ' + (i + 1), autocomplete: 'off' });
          const V = el('input', { value: p[2], inputmode: 'decimal', 'aria-label': 'Valore ' + (i + 1), autocomplete: 'off' });
          L.addEventListener('input', () => { p[0] = L.value.toUpperCase(); aggiorna(); });
          D.addEventListener('input', () => { p[1] = D.value; aggiorna(); });
          V.addEventListener('input', () => { p[2] = V.value; aggiorna(); });
          const togli = el('button', { class: 'icona-pul', 'aria-label': 'Togli parametro', html: A.icona('cestino'), onclick: () => { mc.par.splice(i, 1); disegnaPar(); aggiorna(); } });
          parBox.appendChild(el('div', { class: 'par-riga' }, [L, D, V, togli]));
        });
        parBox.appendChild(el('button', { class: 'pul sec', style: 'margin-top:6px', html: A.icona('piu') + 'Aggiungi parametro', onclick: () => {
          const libere = Object.keys(O.LETTERE_VAR).filter(l => !mc.par.some(p => String(p[0]).toUpperCase() === l) && !'GLNOP'.includes(l));
          mc.par.push([libere[0] || '', '', 0]); disegnaPar(); aggiorna();
        } }));
      };
      disegnaPar();
      aggiorna();
    }
  };
})();
