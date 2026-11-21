// ===== Hich-Officina: interfaccia =====
(function () {
  'use strict';
  const O = window.Officina;
  const $ = id => document.getElementById(id);
  const el = (tag, attr, figli) => {
    const e = document.createElement(tag);
    for (const k in attr || {}) {
      if (k === 'testo') e.textContent = attr[k];
      else if (k === 'html') e.innerHTML = attr[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attr[k]);
      else e.setAttribute(k, attr[k]);
    }
    (figli || []).forEach(f => f && e.appendChild(f));
    return e;
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /** Numero leggibile all'italiana. */
  function fmt(x, dec) {
    if (x === null || x === undefined || !isFinite(x)) return '—';
    return Number(x).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: dec == null ? 2 : dec });
  }
  const arrot = (x, d) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

  // ----- memoria (solo comodita: se manca, l'app funziona lo stesso) -----
  const CHIAVE = 'hich-officina-v1';
  let memoria = {};
  try { memoria = JSON.parse(localStorage.getItem(CHIAVE) || '{}') || {}; } catch (e) { memoria = {}; }
  function salvaMemoria() { try { localStorage.setItem(CHIAVE, JSON.stringify(memoria)); } catch (e) { /* niente */ } }

  function avviso(t) {
    const x = $('toast'); x.textContent = t; x.classList.add('vedi');
    clearTimeout(avviso._t); avviso._t = setTimeout(() => x.classList.remove('vedi'), 1800);
  }

  // ----- campi -----
  // campo: {id, et, u, v (predefinito), tipo:'num'|'testo'|'scelta'|'spunta', scelte:[[valore,etichetta]], largo}
  function creaCampi(contenitore, campi, valori, alCambio) {
    contenitore.innerHTML = '';
    for (const c of campi) {
      if (c.tipo === 'spunta') {
        const i = el('input', { type: 'checkbox', id: 'f-' + c.id });
        i.checked = valori[c.id] !== undefined ? !!valori[c.id] : !!c.v;
        i.addEventListener('change', () => { valori[c.id] = i.checked; alCambio(); });
        valori[c.id] = i.checked;
        contenitore.appendChild(el('label', { class: 'spunta' }, [i, el('span', { testo: c.et })]));
        continue;
      }
      let ing;
      if (c.tipo === 'scelta') {
        ing = el('select', { id: 'f-' + c.id });
        for (const [val, et] of c.scelte) ing.appendChild(el('option', { value: val, testo: et }));
      } else {
        ing = el('input', {
          id: 'f-' + c.id, type: 'text', autocomplete: 'off', spellcheck: 'false',
          inputmode: c.tipo === 'testo' ? 'text' : 'decimal', enterkeyhint: 'next'
        });
      }
      const val = valori[c.id] !== undefined ? valori[c.id] : c.v;
      ing.value = val === undefined || val === null ? '' : String(val);
      if (c.tipo === 'scelta' && ing.selectedIndex < 0) ing.selectedIndex = 0;
      valori[c.id] = ing.value;
      ing.addEventListener(c.tipo === 'scelta' ? 'change' : 'input', () => { valori[c.id] = ing.value; alCambio(c.id); });
      ing.addEventListener('focus', () => { if (ing.select) try { ing.select(); } catch (e) { /* niente */ } });
      contenitore.appendChild(el('label', { class: 'campo' + (c.largo ? ' largo' : ''), for: 'f-' + c.id }, [
        el('span', { testo: c.et }),
        el('div', { class: 'ingresso' }, [ing, c.u ? el('span', { testo: c.u }) : null])
      ]));
    }
  }
  function imposta(id, v, valori) {
    const i = $('f-' + id); if (!i) return;
    i.value = String(v); valori[id] = i.value;
  }
  const numeri = v => { const o = {}; for (const k in v) o[k] = typeof v[k] === 'boolean' ? v[k] : O.num(v[k]); return o; };

  const sceltaMateriali = [['', '— scegli il materiale —']].concat(O.MATERIALI.map((m, i) => [String(i), m.n]));

  // ----- calcolatori -----
  const CALC = [
    {
      id: 'fresa', t: 'Fresatura',
      campi: [
        { id: 'mat', et: 'Materiale (riempie Vc e fz)', tipo: 'scelta', scelte: sceltaMateriali, largo: true },
        { id: 'd', et: 'Diametro fresa', u: 'mm', v: 10 }, { id: 'z', et: 'Taglienti', u: 'z', v: 3 },
        { id: 'vc', et: 'Velocita di taglio Vc', u: 'm/min', v: 150 }, { id: 'fz', et: 'Avanzamento per dente', u: 'mm', v: 0.05 },
        { id: 'ap', et: 'Profondita ap (facolt.)', u: 'mm', v: '' }, { id: 'ae', et: 'Larghezza ae (facolt.)', u: 'mm', v: '' }
      ],
      mat: (m, v) => ({ vc: m.vc, fz: arrot(O.fzPerDiametro(m.fz, O.num(v.d) || 10), 3) }),
      calc(v) {
        if (!(v.d > 0 && v.vc > 0 && v.z > 0 && v.fz > 0)) return null;
        const r = O.fresatura(v);
        return {
          ris: [['Giri', fmt(r.n, 0), 'giri/min'], ['Avanzamento', fmt(r.vf, 0), 'mm/min'],
            r.q !== undefined ? ['Truciolo asportato', fmt(r.q, 1), 'cm³/min'] : null]
        };
      },
      nota: 'Valori di partenza per fresa in metallo duro. fz dalla tabella e adattato al diametro.'
    },
    {
      id: 'tornio', t: 'Tornitura',
      campi: [
        { id: 'mat', et: 'Materiale (riempie Vc e f)', tipo: 'scelta', scelte: sceltaMateriali, largo: true },
        { id: 'd', et: 'Diametro', u: 'mm', v: 50 }, { id: 'vc', et: 'Velocita di taglio Vc', u: 'm/min', v: 200 },
        { id: 'f', et: 'Avanzamento', u: 'mm/giro', v: 0.2 }, { id: 'nmax', et: 'Giri massimi', u: 'giri/min', v: 3000 },
        { id: 'r', et: 'Raggio punta', u: 'mm', v: 0.8 }, { id: 'ap', et: 'Profondita ap', u: 'mm', v: 2 },
        { id: 'l', et: 'Lunghezza di taglio', u: 'mm', v: 100 }
      ],
      mat: m => ({ vc: m.lvc, f: m.lf }),
      calc(v) {
        if (!(v.d > 0 && v.vc > 0 && v.f > 0)) return null;
        const r = O.tornitura(v);
        return {
          ris: [['Giri', fmt(r.n, 0), 'giri/min'], ['Avanzamento', fmt(r.vf, 0), 'mm/min'],
            r.ra !== undefined ? ['Ra teorica', fmt(r.ra, 2), 'µm (' + O.rugositaN(r.ra) + ')'] : null,
            r.tempo !== undefined ? ['Tempo passata', fmt(r.tempo * 60, 0), 's'] : null,
            r.q !== undefined ? ['Truciolo asportato', fmt(r.q, 1), 'cm³/min'] : null],
          avviso: r.limitato ? 'Giri limitati al massimo: la Vc reale e ' + fmt(r.vcReale, 0) + ' m/min.' : ''
        };
      },
      nota: 'Ra teorica = f² / (32 · r): la finitura reale e sempre peggiore.'
    },
    {
      id: 'foro', t: 'Foratura',
      campi: [
        { id: 'mat', et: 'Materiale (riempie Vc e f)', tipo: 'scelta', scelte: sceltaMateriali, largo: true },
        { id: 'd', et: 'Diametro punta', u: 'mm', v: 8.5 }, { id: 'vc', et: 'Velocita di taglio Vc', u: 'm/min', v: 25 },
        { id: 'f', et: 'Avanzamento', u: 'mm/giro', v: 0.12 }, { id: 'prof', et: 'Profondita foro', u: 'mm', v: '' }
      ],
      mat: (m, v) => ({ vc: m.dvc, f: arrot(m.dfn * Math.min(2, Math.max(.3, (O.num(v.d) || 10) / 10)), 3) }),
      calc(v) {
        if (!(v.d > 0 && v.vc > 0 && v.f > 0)) return null;
        const r = O.foratura(v);
        const punta = 0.3 * v.d;   // punta a 118 gradi: circa 0,3 D
        return {
          ris: [['Giri', fmt(r.n, 0), 'giri/min'], ['Avanzamento', fmt(r.vf, 0), 'mm/min'],
            ['Altezza della punta (118°)', fmt(punta, 2), 'mm'],
            v.prof > 0 ? ['Tempo', fmt((v.prof + punta) / r.vf * 60, 0), 's'] : null],
          avviso: v.prof > 5 * v.d ? 'Foro profondo oltre 5 D: scarico del truciolo (cicli a tratti).' : ''
        };
      },
      nota: 'Valori del materiale per punta HSS-E. Con punta in metallo duro la Vc sale di 2-3 volte.'
    },
    {
      id: 'maschio', t: 'Maschiatura',
      campi: [
        { id: 'fil', et: 'Filetto metrico', tipo: 'scelta', largo: true,
          scelte: [['', '— scegli —']].concat(O.FILETTI_GROSSI.map(f => [f[0] + 'x' + f[1], 'M' + f[0] + ' x ' + f[1] + ' (grosso)']))
            .concat(O.FILETTI_FINI.map(f => [f[0] + 'x' + f[1], 'M' + f[0] + ' x ' + f[1] + ' (fine)'])) },
        { id: 'mat', et: 'Materiale (riempie Vc)', tipo: 'scelta', scelte: sceltaMateriali, largo: true },
        { id: 'd', et: 'Diametro nominale', u: 'mm', v: 10 }, { id: 'p', et: 'Passo', u: 'mm', v: 1.5 },
        { id: 'vc', et: 'Velocita di taglio Vc', u: 'm/min', v: 10 }
      ],
      mat: m => ({ vc: m.tvc }),
      scelta(id, valori) {
        if (id !== 'fil' || !valori.fil) return;
        const [d, p] = valori.fil.split('x');
        imposta('d', d, valori); imposta('p', p, valori);
      },
      calc(v) {
        if (!(v.d > 0 && v.p > 0)) return null;
        const f = O.filetto(v.d, v.p);
        const n = v.vc > 0 ? O.giri(v.vc, v.d) : NaN;
        return {
          ris: [['Preforo (maschio a taglio)', fmt(f.preforo, 2), 'mm'],
            ['Preforo (maschio a rullare)', fmt(v.d - 0.45 * v.p, 2), 'mm'],
            ['Giri', fmt(n, 0), 'giri/min'], ['Avanzamento', fmt(n * v.p, 0), 'mm/min'],
            ['Diametro medio', fmt(f.medio, 3), 'mm'], ['Nocciolo madrevite D1', fmt(f.nocciolo, 3), 'mm']]
        };
      },
      nota: 'Preforo a rullare indicativo (D - 0,45 P): controlla il valore del produttore del maschio.'
    },
    {
      id: 'filetto', t: 'Filettatura al tornio',
      campi: [
        { id: 'tipo', et: 'Tipo', tipo: 'scelta', scelte: [['est', 'Esterno (vite)'], ['int', 'Interno (madrevite)']], largo: true },
        { id: 'd', et: 'Diametro nominale', u: 'mm', v: 20 }, { id: 'p', et: 'Passo', u: 'mm', v: 2.5 },
        { id: 'n', et: 'Numero passate', u: '', v: 8 }
      ],
      calc(v) {
        if (!(v.d > 0 && v.p > 0 && v.n >= 1)) return null;
        const f = O.filetto(v.d, v.p), est = v.tipo !== 'int';
        const h = est ? f.hEsterno : f.hInterno;
        const pas = O.passateFiletto(h, Math.round(v.n));
        const righe = pas.map((pr, i) => '<tr><td>' + (i + 1) + '</td><td>' + fmt(pr, 3) + '</td><td>' +
          fmt(i ? pr - pas[i - 1] : pr, 3) + '</td><td>' + fmt(est ? v.d - 2 * pr : f.nocciolo + 2 * pr, 3) + '</td></tr>').join('');
        return {
          ris: [['Profondita radiale', fmt(h, 3), 'mm'],
            [est ? 'Diametro di fondo' : 'Diametro di partenza (D1)', fmt(est ? v.d - 2 * h : f.nocciolo, 3), 'mm'],
            ['Diametro medio', fmt(f.medio, 3), 'mm']],
          html: '<div class="scorri"><table><tr><th>Passata</th><th>Prof. totale</th><th>Incremento</th><th>Diametro X</th></tr>' + righe + '</table></div>'
        };
      },
      nota: 'Passate a sezione di truciolo costante. Aggiungi una passata a vuoto alla fine.'
    },
    {
      id: 'toll', t: 'Tolleranze ISO',
      campi: [
        { id: 'd', et: 'Diametro nominale', u: 'mm', v: 25 },
        { id: 'foro', et: 'Campo del foro', tipo: 'testo', v: 'H7' }, { id: 'alb', et: 'Campo dell\'albero', tipo: 'testo', v: 'g6' }
      ],
      calc(v, grezzi) {
        if (!(v.d > 0)) return null;
        const a = O.tolleranza(v.d, grezzi.foro), b = O.tolleranza(v.d, grezzi.alb);
        const ris = [];
        let err = '';
        const sc = x => (x > 0 ? '+' : '') + fmt(x, 1);
        if (grezzi.foro) {
          if (a.errore) err += 'Foro: ' + a.errore + ' ';
          else ris.push(['Foro ' + grezzi.foro, fmt(a.min, 4) + ' – ' + fmt(a.max, 4), 'mm (' + sc(a.inf) + ' / ' + sc(a.sup) + ' µm)']);
        }
        if (grezzi.alb) {
          if (b.errore) err += 'Albero: ' + b.errore;
          else ris.push(['Albero ' + grezzi.alb, fmt(b.min, 4) + ' – ' + fmt(b.max, 4), 'mm (' + sc(b.inf) + ' / ' + sc(b.sup) + ' µm)']);
        }
        if (grezzi.foro && grezzi.alb && !a.errore && !b.errore) {
          const gMax = a.sup - b.inf, gMin = a.inf - b.sup;
          const tipo = gMin >= 0 ? 'Con gioco' : gMax <= 0 ? 'Con interferenza (forzato)' : 'Incerto';
          ris.push(['Accoppiamento', tipo, 'gioco da ' + sc(gMin) + ' a ' + sc(gMax) + ' µm']);
        }
        return { ris, errore: err };
      },
      nota: 'Fori: D E F G H JS. Alberi: d e f g h js k m n p. Gradi da IT5 a IT11, fino a 500 mm.'
    },
    {
      id: 'cono', t: 'Cono e smusso',
      campi: [
        { id: 'D', et: 'Diametro maggiore', u: 'mm', v: 30 }, { id: 'dm', et: 'Diametro minore', u: 'mm', v: 20 },
        { id: 'l', et: 'Lunghezza', u: 'mm', v: 40 }
      ],
      calc(v) {
        if (!(v.D > 0 && v.dm >= 0 && v.l > 0) || v.dm > v.D) return null;
        const c = O.cono(v.D, v.dm, v.l);
        return {
          ris: [['Semiangolo (per la torretta)', fmt(c.semiangolo, 4), '°'], ['Angolo del cono', fmt(c.angolo, 4), '°'],
            ['Conicita', c.rapporto > 0 ? '1 : ' + fmt(1 / c.rapporto, 2) : '—', ''], ['Pendenza', fmt(c.rapporto / 2 * 100, 2), '%']]
        };
      },
      nota: 'Smusso a 45° di lato c: diametro minore = maggiore - 2c, lunghezza = c.'
    },
    {
      id: 'cerchio', t: 'Fori su cerchio',
      campi: [
        { id: 'dc', et: 'Diametro della circonferenza', u: 'mm', v: 80 }, { id: 'n', et: 'Numero di fori', u: '', v: 6 },
        { id: 'a', et: 'Angolo del primo foro', u: '°', v: 0 }
      ],
      calc(v) {
        if (!(v.dc > 0 && v.n >= 1 && v.n <= 360)) return null;
        const p = O.foriSuCerchio(v.dc, Math.round(v.n), v.a || 0);
        const corda = v.dc * Math.sin(Math.PI / Math.round(v.n));
        return {
          ris: [['Distanza tra due fori', fmt(corda, 3), 'mm'], ['Angolo tra i fori', fmt(360 / Math.round(v.n), 4), '°']],
          html: '<div class="scorri"><table><tr><th>Foro</th><th>X</th><th>Y</th></tr>' +
            p.map(q => '<tr><td>' + q.n + '</td><td>' + fmt(q.x, 3) + '</td><td>' + fmt(q.y, 3) + '</td></tr>').join('') + '</table></div>'
        };
      },
      nota: 'Centro della circonferenza in X0 Y0, angolo misurato dall\'asse X in senso antiorario.'
    },
    {
      id: 'pollici', t: 'Pollici e mm',
      campi: [
        { id: 'poll', et: 'Pollici (anche 1 1/4 o 3/8)', tipo: 'testo', v: '1/2' }, { id: 'mm', et: 'Millimetri', u: 'mm', v: 12 }
      ],
      calc(v, grezzi) {
        const pol = leggiPollici(grezzi.poll);
        const ris = [];
        if (isFinite(pol)) ris.push([grezzi.poll + '"', fmt(pol * 25.4, 4), 'mm']);
        if (v.mm > 0) {
          const inch = v.mm / 25.4;
          ris.push([fmt(v.mm, 3) + ' mm', fmt(inch, 4), 'pollici']);
          ris.push(['Frazione piu vicina', frazione(inch), 'pollici']);
        }
        return ris.length ? { ris } : null;
      },
      nota: '1 pollice = 25,4 mm esatti.'
    }
  ];

  function leggiPollici(s) {
    const t = String(s || '').trim().replace(',', '.').replace(/"/g, '');
    if (!t) return NaN;
    const m = /^(?:(\d+(?:\.\d+)?)\s+)?(\d+)\s*\/\s*(\d+)$/.exec(t);
    if (m) return (m[1] ? Number(m[1]) : 0) + Number(m[2]) / Number(m[3]);
    return Number(t);
  }
  function frazione(inch) {
    const intero = Math.floor(inch);
    let num = Math.round((inch - intero) * 64), den = 64;
    if (num === 64) return (intero + 1) + '';
    while (num && num % 2 === 0) { num /= 2; den /= 2; }
    const err = (intero + num / den - inch) * 25.4;
    const testo = (intero ? intero + (num ? ' ' : '') : '') + (num ? num + '/' + den : (intero ? '' : '0'));
    return testo + ' (' + (err >= 0 ? '+' : '') + fmt(err, 3) + ' mm)';
  }

  let calcAttivo = memoria.calc || 'fresa';
  function mostraCalcolatore(id) {
    const c = CALC.find(x => x.id === id) || CALC[0];
    calcAttivo = c.id; memoria.calc = c.id; salvaMemoria();
    document.querySelectorAll('#chips-calcoli .chip').forEach(b => b.classList.toggle('attiva', b.dataset.id === c.id));
    memoria.valori = memoria.valori || {};
    const valori = memoria.valori[c.id] = memoria.valori[c.id] || {};
    const carta = el('div', { class: 'carta' });
    const griglia = el('div', { class: 'griglia' });
    const uscita = el('div');
    carta.append(el('h2', { testo: c.t }), griglia, uscita);
    if (c.nota) carta.appendChild(el('p', { class: 'nota', testo: c.nota }));
    const notaMat = el('p', { class: 'nota' });
    carta.appendChild(notaMat);
    const aggiorna = idCambiato => {
      if (idCambiato === 'mat' && valori.mat !== '' && c.mat) {
        const m = O.MATERIALI[Number(valori.mat)];
        const nuovi = c.mat(m, valori);
        for (const k in nuovi) if (nuovi[k] !== undefined && nuovi[k] !== null) imposta(k, nuovi[k], valori);
      }
      if (c.scelta) c.scelta(idCambiato, valori);
      const m = valori.mat !== undefined && valori.mat !== '' ? O.MATERIALI[Number(valori.mat)] : null;
      notaMat.textContent = m ? m.n + ': ' + m.note : '';
      const r = c.calc(numeri(valori), valori);
      uscita.innerHTML = '';
      if (!r) { uscita.appendChild(el('p', { class: 'nota', testo: 'Compila i campi per vedere il risultato.' })); }
      else {
        if (r.errore) uscita.appendChild(el('p', { class: 'errore', testo: r.errore }));
        const box = el('div', { class: 'risultati' });
        (r.ris || []).filter(Boolean).forEach(([et, val, u]) =>
          box.appendChild(el('div', { class: 'ris' }, [el('small', { testo: et }), el('b', { testo: val }), el('small', { testo: u })])));
        uscita.appendChild(box);
        if (r.avviso) uscita.appendChild(el('p', { class: 'nota avviso', testo: r.avviso }));
        if (r.html) uscita.appendChild(el('div', { html: r.html, style: 'margin-top:10px' }));
      }
      salvaMemoria();
    };
    creaCampi(griglia, c.campi, valori, aggiorna);
    $('calcolatore').innerHTML = '';
    $('calcolatore').appendChild(carta);
    aggiorna();
  }
  CALC.forEach(c => $('chips-calcoli').appendChild(el('button', { class: 'chip', 'data-id': c.id, testo: c.t, onclick: () => mostraCalcolatore(c.id) })));

  // ----- G-code tornio -----
  const OPS = {
    sgrossatura: {
      t: 'Sgrossatura esterna', campi: [
        { id: 'dg', et: 'Diametro grezzo', u: 'mm', v: 40 }, { id: 'df', et: 'Diametro finito', u: 'mm', v: 30 },
        { id: 'l', et: 'Lunghezza (da Z0)', u: 'mm', v: 50 }, { id: 'ap', et: 'Profondita passata (raggio)', u: 'mm', v: 2 },
        { id: 'sx', et: 'Sovrametallo X (diametro)', u: 'mm', v: 0.4 }, { id: 'sz', et: 'Sovrametallo Z', u: 'mm', v: 0.1 },
        { id: 'finitura', et: 'Aggiungi la passata di finitura', tipo: 'spunta', v: true },
        { id: 'ff', et: 'Avanzamento finitura', u: 'mm/giro', v: 0.1 }, { id: 'vcf', et: 'Vc finitura', u: 'm/min', v: '' },
        { id: 'tf', et: 'Utensile finitura', u: 'T', v: '' }, { id: 'smusso', et: 'Smusso 45° in testa', u: 'mm', v: 1 }
      ]
    },
    sfacciatura: {
      t: 'Sfacciatura', campi: [
        { id: 'dg', et: 'Diametro grezzo', u: 'mm', v: 40 }, { id: 's', et: 'Sovrametallo in Z', u: 'mm', v: 2 },
        { id: 'ap', et: 'Profondita passata', u: 'mm', v: 1 }
      ]
    },
    gola: {
      t: 'Gola / scanalatura', campi: [
        { id: 'dg', et: 'Diametro esterno', u: 'mm', v: 40 }, { id: 'dfondo', et: 'Diametro di fondo', u: 'mm', v: 34 },
        { id: 'zg', et: 'Z fianco destro', u: 'mm', v: -20 }, { id: 'b', et: 'Larghezza gola', u: 'mm', v: 8 },
        { id: 'w', et: 'Larghezza utensile', u: 'mm', v: 3 }
      ]
    },
    filetto: {
      t: 'Filettatura esterna', campi: [
        { id: 'd', et: 'Diametro nominale', u: 'mm', v: 20 }, { id: 'p', et: 'Passo', u: 'mm', v: 2.5 },
        { id: 'l', et: 'Lunghezza filetto (da Z0)', u: 'mm', v: 30 }, { id: 'n', et: 'Numero passate', u: '', v: 8 },
        { id: 'giri', et: 'Giri fissi', u: 'giri/min', v: 600 }
      ]
    }
  };
  const COMUNI = [
    { id: 'num', et: 'Numero programma', u: 'O', v: 1 }, { id: 'nome', et: 'Nome', tipo: 'testo', v: 'PEZZO' },
    { id: 't', et: 'Utensile', u: 'T', v: 1 }, { id: 'mat', et: 'Materiale', tipo: 'scelta', scelte: sceltaMateriali },
    { id: 'vc', et: 'Velocita di taglio Vc', u: 'm/min', v: 200 }, { id: 'f', et: 'Avanzamento', u: 'mm/giro', v: 0.25 },
    { id: 'nmax', et: 'Giri massimi', u: 'giri/min', v: 2500 },
    { id: 'codLimite', et: 'Codice limite giri', tipo: 'scelta', scelte: [['G50', 'G50 S...'], ['G92', 'G92 S...']] },
    { id: 'codFiletto', et: 'Codice filettatura', tipo: 'scelta', scelte: [['G32', 'G32'], ['G33', 'G33']] },
    { id: 'xCambio', et: 'X cambio utensile', u: 'mm', v: '' }, { id: 'zCambio', et: 'Z cambio utensile', u: 'mm', v: 50 },
    { id: 'refrig', et: 'Refrigerante (M8)', tipo: 'spunta', v: true }
  ];
  let opAttiva = memoria.op || 'sgrossatura';
  let ultimo = null;
  memoria.tornio = memoria.tornio || {};
  memoria.comuni = memoria.comuni || {};

  function mostraOp(op) {
    opAttiva = OPS[op] ? op : 'sgrossatura'; memoria.op = opAttiva; salvaMemoria();
    document.querySelectorAll('#chips-tornio .chip').forEach(b => b.classList.toggle('attiva', b.dataset.id === opAttiva));
    $('tornio-titolo').textContent = OPS[opAttiva].t;
    const valori = memoria.tornio[opAttiva] = memoria.tornio[opAttiva] || {};
    creaCampi($('tornio-campi'), OPS[opAttiva].campi, valori, genera);
    genera();
  }
  creaCampi($('tornio-comuni'), COMUNI, memoria.comuni, id => {
    if (id === 'mat' && memoria.comuni.mat !== '') {
      const m = O.MATERIALI[Number(memoria.comuni.mat)];
      imposta('vc', m.lvc, memoria.comuni); imposta('f', m.lf, memoria.comuni);
    }
    genera();
  });
  Object.keys(OPS).forEach(k => $('chips-tornio').appendChild(el('button', { class: 'chip', 'data-id': k, testo: OPS[k].t, onclick: () => mostraOp(k) })));

  function genera() {
    const v = Object.assign(numeri(memoria.comuni), numeri(memoria.tornio[opAttiva] || {}));
    v.nome = memoria.comuni.nome; v.codLimite = memoria.comuni.codLimite; v.codFiletto = memoria.comuni.codFiletto;
    v.refrig = memoria.comuni.refrig !== false;
    if (opAttiva === 'filetto') v.dg = v.d;
    const r = O.gcodeTornio(opAttiva, v);
    ultimo = r;
    const av = $('tornio-avvisi');
    if (r.errore) { av.className = 'nota errore'; av.textContent = r.errore; $('codice').textContent = ''; }
    else { av.className = 'nota'; av.textContent = r.avvisi.join(' '); $('codice').textContent = r.righe.join('\n'); }
    disegna(r, v);
    salvaMemoria();
  }

  function colore(nome) { return getComputedStyle(document.documentElement).getPropertyValue(nome).trim(); }
  function disegna(r, v) {
    const cv = $('anteprima');
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth || 320, H = cv.clientHeight || 220;
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (r.errore || !r.percorso.length) return;
    // area: Z in orizzontale (0 a destra), raggio in verticale. Scala sul pezzo, non sui rapidi lontani.
    let zMin = 0, zMax = 2, rMax = 0;
    for (const s of r.percorso) {
      if (s.rapido) continue;
      zMin = Math.min(zMin, s.z0, s.z); zMax = Math.max(zMax, s.z0, s.z);
      rMax = Math.max(rMax, s.x0 / 2, s.x / 2);
    }
    const dg = v.dg || 0;
    rMax = Math.max(rMax, dg / 2) + 2;
    zMin -= 4; zMax += 2;
    const m = 14, sc = Math.min((W - 2 * m) / (zMax - zMin), (H - 2 * m) / rMax);
    const X = z => W - m - (zMax - z) * sc, Y = x => H - m - Math.max(x, -2) / 2 * sc;
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
    // grezzo
    g.fillStyle = colore('--bordo');
    g.globalAlpha = .6;
    const zFine = zMin;
    const top = opAttiva === 'sfacciatura' ? Math.max(0, v.s || 0) : 0;
    g.fillRect(X(zFine), Y(dg), X(top) - X(zFine), Y(0) - Y(dg));
    g.globalAlpha = 1;
    // asse
    g.strokeStyle = colore('--tenue'); g.setLineDash([6, 4]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(m, Y(0)); g.lineTo(W - m, Y(0)); g.stroke();
    // percorso
    for (const s of r.percorso) {
      g.setLineDash(s.rapido ? [4, 4] : []);
      g.strokeStyle = s.rapido ? colore('--tenue') : colore('--accento');
      g.lineWidth = s.rapido ? 1 : 2;
      g.beginPath(); g.moveTo(X(s.z0), Y(s.x0)); g.lineTo(X(s.z), Y(s.x)); g.stroke();
    }
    g.setLineDash([]);
    g.restore();
  }

  $('b-copia').addEventListener('click', async () => {
    if (!ultimo || ultimo.errore) return;
    const t = ultimo.righe.join('\n');
    try { await navigator.clipboard.writeText(t); avviso('Programma copiato'); }
    catch (e) {
      const r = document.createRange(); r.selectNodeContents($('codice'));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); avviso('Selezionato: tieni premuto per copiare');
    }
  });
  $('b-salva').addEventListener('click', () => {
    if (!ultimo || ultimo.errore) return;
    const nome = 'O' + String(Math.round(O.num(memoria.comuni.num) || 1)).padStart(4, '0') + '.nc';
    const blob = new Blob([ultimo.righe.join('\r\n') + '\r\n'], { type: 'text/plain' });
    const a = el('a', { href: URL.createObjectURL(blob), download: nome });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    avviso('Salvato ' + nome);
  });

  // ----- tabelle -----
  const TAB = {
    materiali() {
      const gruppi = {};
      O.MATERIALI.forEach(m => (gruppi[m.g] = gruppi[m.g] || []).push(m));
      let h = '<div class="carta"><h2>Materiali e dati di taglio</h2><p class="nota">Valori INDICATIVI di partenza.</p>';
      for (const g in gruppi) {
        h += '<h3>' + esc(g) + '</h3>';
        h += gruppi[g].map(m => '<div class="mat"><b>' + esc(m.n) + '</b><div class="valori">' +
          '<span>Fresa Vc <b>' + m.vc + '</b> fz ' + fmt(m.fz, 3) + '</span>' +
          '<span>Tornio Vc <b>' + m.lvc + '</b> f ' + fmt(m.lf, 2) + '</span>' +
          '<span>Punta Vc <b>' + m.dvc + '</b> f ' + fmt(m.dfn, 2) + '</span>' +
          '<span>Maschio Vc <b>' + m.tvc + '</b></span></div><small>' + esc(m.note) + '</small></div>').join('');
      }
      return h + '<p class="nota">Vc in m/min; fz in mm/dente per fresa D10; f in mm/giro (punta D10).</p></div>';
    },
    filetti() {
      const riga = ([d, p]) => {
        const f = O.filetto(d, p);
        return '<tr><td>M' + fmt(d) + (O.FILETTI_FINI.some(x => x[0] === d && x[1] === p) ? ' x ' + fmt(p) : '') + '</td><td>' + fmt(p) +
          '</td><td><b>' + fmt(f.preforo, 2) + '</b></td><td>' + fmt(f.medio, 3) + '</td><td>' + fmt(f.nocciolo, 3) + '</td><td>' + fmt(f.nocciolo_vite, 3) + '</td></tr>';
      };
      const intest = '<tr><th>Filetto</th><th>Passo</th><th>Preforo</th><th>d2 medio</th><th>D1</th><th>d3</th></tr>';
      return '<div class="carta"><h2>Filetti metrici ISO a passo grosso</h2><div class="scorri"><table>' + intest + O.FILETTI_GROSSI.map(riga).join('') +
        '</table></div></div><div class="carta"><h2>Passo fine</h2><div class="scorri"><table>' + intest + O.FILETTI_FINI.map(riga).join('') +
        '</table></div><p class="nota">Preforo per maschio a taglio = D - P. D1 = nocciolo madrevite, d3 = nocciolo vite (valori teorici del profilo base).</p></div>';
    },
    tolleranze() {
      const campi = ['H7', 'H8', 'G7', 'F7', 'JS7', 'h6', 'h7', 'g6', 'f7', 'js6', 'k6', 'm6', 'n6', 'p6'];
      const scelto = memoria.tabToll || 'H7';
      let h = '<div class="carta"><h2>Tabella tolleranze ISO</h2><div class="chips">' +
        campi.map(c => '<button class="chip' + (c === scelto ? ' attiva' : '') + '" data-toll="' + c + '">' + c + '</button>').join('') + '</div>';
      h += '<div class="scorri"><table><tr><th>Diametro mm</th><th>Sup. µm</th><th>Inf. µm</th><th>IT µm</th></tr>';
      let da = 0;
      for (const lim of O.LIMITI) {
        const t = O.tolleranza(lim, scelto);
        h += '<tr><td>oltre ' + da + ' fino a ' + lim + '</td><td>' + (t.sup > 0 ? '+' : '') + fmt(t.sup, 1) + '</td><td>' +
          (t.inf > 0 ? '+' : '') + fmt(t.inf, 1) + '</td><td>' + t.it + '</td></tr>';
        da = lim;
      }
      return h + '</table></div><p class="nota">Per un diametro preciso e per gli accoppiamenti usa Calcoli → Tolleranze ISO.</p></div>';
    },
    rugosita() {
      const c = [['N12', 50], ['N11', 25], ['N10', 12.5], ['N9', 6.3], ['N8', 3.2], ['N7', 1.6], ['N6', 0.8], ['N5', 0.4], ['N4', 0.2], ['N3', 0.1], ['N2', 0.05], ['N1', 0.025]];
      const lav = { N10: 'sgrossatura', N9: 'tornitura / fresatura media', N8: 'tornitura / fresatura buona', N7: 'finitura accurata, alesatura', N6: 'rettifica', N5: 'rettifica fine', N4: 'lappatura' };
      return '<div class="carta"><h2>Rugosita</h2><div class="scorri"><table><tr><th>Classe</th><th>Ra µm</th><th>Lavorazione tipica</th></tr>' +
        c.map(([n, ra]) => '<tr><td><b>' + n + '</b></td><td>' + fmt(ra, 3) + '</td><td>' + (lav[n] || '') + '</td></tr>').join('') + '</table></div></div>';
    },
    pollici() {
      let h = '<div class="carta"><h2>Frazioni di pollice</h2><div class="scorri"><table><tr><th>Pollici</th><th>Decimale</th><th>mm</th></tr>';
      for (let k = 1; k <= 64; k++) {
        let n = k, d = 64; while (n % 2 === 0) { n /= 2; d /= 2; }
        const testo = d === 1 ? n + '"' : n + '/' + d + '"';
        h += '<tr><td>' + (d <= 16 ? '<b>' + testo + '</b>' : testo) + '</td><td>' + fmt(k / 64, 4) + '</td><td>' + fmt(k / 64 * 25.4, 3) + '</td></tr>';
      }
      return h + '</table></div></div>';
    }
  };
  const NOMI_TAB = { materiali: 'Materiali', filetti: 'Filetti', tolleranze: 'Tolleranze', rugosita: 'Rugosita', pollici: 'Pollici' };
  function mostraTabella(id) {
    const k = TAB[id] ? id : 'materiali';
    memoria.tab = k; salvaMemoria();
    document.querySelectorAll('#chips-tabelle .chip').forEach(b => b.classList.toggle('attiva', b.dataset.id === k));
    $('tabella').innerHTML = TAB[k]();
    $('tabella').querySelectorAll('[data-toll]').forEach(b => b.addEventListener('click', () => { memoria.tabToll = b.dataset.toll; mostraTabella('tolleranze'); }));
  }
  Object.keys(TAB).forEach(k => $('chips-tabelle').appendChild(el('button', { class: 'chip', 'data-id': k, testo: NOMI_TAB[k], onclick: () => mostraTabella(k) })));

  // ----- navigazione -----
  function pagina(p) {
    document.querySelectorAll('.pagina').forEach(s => s.classList.toggle('attiva', s.id === 'p-' + p));
    document.querySelectorAll('nav button').forEach(b => b.classList.toggle('attiva', b.dataset.p === p));
    memoria.pagina = p; salvaMemoria();
    if (p === 'tornio') genera();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => pagina(b.dataset.p)));

  mostraCalcolatore(calcAttivo);
  mostraOp(opAttiva);
  mostraTabella(memoria.tab || 'materiali');
  pagina(memoria.pagina || 'calcoli');
  window.addEventListener('resize', () => { if (memoria.pagina === 'tornio') genera(); });

  // ----- funzionamento senza rete -----
  const rete = () => { $('stato-rete').textContent = navigator.onLine ? '' : 'senza rete'; };
  window.addEventListener('online', rete); window.addEventListener('offline', rete); rete();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* senza cache: funziona lo stesso in linea */ });
  }
})();
