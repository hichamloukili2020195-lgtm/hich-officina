// ===== Hich-Officina: calcolatrice di taglio, utensili e dati di taglio, tolleranze =====
(function () {
  'use strict';
  const A = window.App, O = A.O, el = A.el, fmt = A.fmt, arrot = A.arrot;
  const selMat = { id: 'mat', et: 'Materiale', tipo: 'scelta', scelte: () => A.sceltaMateriali('— scegli —') };

  // ----- calcolatori -----
  // calc(v numeri, grezzi) -> {gauge:[et,val,u], ris:[[et,val,u]], avviso, html, errore} | null
  const CALC = [
    {
      id: 'fresa', t: 'Fresatura',
      campi: [selMat, { id: 'd', et: 'Diametro fresa', u: 'mm', v: 10 }, { id: 'z', et: 'Taglienti', u: 'z', v: 3 },
        { id: 'vc', et: 'Velocita di taglio Vc', u: 'm/min', v: 180 }, { id: 'fz', et: 'Avanzamento al dente', u: 'mm', v: 0.04 },
        { id: 'ap', et: 'Profondita ap', sub: 'facoltativa', u: 'mm', v: '' }, { id: 'ae', et: 'Larghezza ae', sub: 'facoltativa', u: 'mm', v: '' }],
      mat: (m, v) => { const r = O.datiTaglio(m, { tipo: 'fresa', d: O.num(v.d) || 10, z: 1 }); return { vc: r.vc, fz: arrot(r.fz, 3) }; },
      calc(v) {
        if (!(v.d > 0 && v.vc > 0 && v.z > 0 && v.fz > 0)) return null;
        const r = O.fresatura(v);
        return { gauge: ['Velocita mandrino (n)', fmt(r.n, 0), 'giri/min'],
          ris: [['Avanzamento al dente', fmt(v.fz, 3), 'mm/dente'], ['Avanzamento lineare', fmt(r.vf, 0), 'mm/min'],
            r.q !== undefined ? ['Truciolo asportato', fmt(r.q, 1), 'cm³/min'] : null] };
      },
      nota: 'Con il materiale: Vc e fz della fresa in metallo duro (fz adattato al diametro, come nel programma parametrico).'
    },
    {
      id: 'tornio', t: 'Tornitura',
      campi: [selMat, { id: 'd', et: 'Diametro', u: 'mm', v: 50 }, { id: 'vc', et: 'Velocita di taglio Vc', u: 'm/min', v: 200 },
        { id: 'f', et: 'Avanzamento', u: 'mm/giro', v: 0.2 }, { id: 'nmax', et: 'Giri massimi', u: 'giri/min', v: '', ph: () => A.imp().nmaxTornio },
        { id: 'r', et: 'Raggio punta', u: 'mm', v: 0.8 }, { id: 'ap', et: 'Profondita ap', u: 'mm', v: 2 }, { id: 'l', et: 'Lunghezza di taglio', u: 'mm', v: 100 }],
      mat: m => (m.lvc > 0 ? { vc: m.lvc, f: m.lf } : {}),
      calc(v) {
        if (!(v.d > 0 && v.vc > 0 && v.f > 0)) return null;
        const r = O.tornitura(Object.assign({}, v, { nmax: v.nmax > 0 ? v.nmax : A.imp().nmaxTornio }));
        return { gauge: ['Velocita mandrino (n)', fmt(r.n, 0), 'giri/min'],
          ris: [['Avanzamento', fmt(r.vf, 0), 'mm/min'], r.ra !== undefined ? ['Ra teorica', fmt(r.ra, 2), 'µm ' + O.rugositaN(r.ra)] : null,
            r.tempo !== undefined ? ['Tempo passata', fmt(r.tempo * 60, 0), 's'] : null, r.q !== undefined ? ['Truciolo', fmt(r.q, 1), 'cm³/min'] : null],
          avviso: r.limitato ? 'Giri limitati al massimo: la Vc vera e ' + fmt(r.vcReale, 0) + ' m/min.' : '' };
      },
      nota: 'Ra teorica = f² / (32 · r): la finitura vera e sempre un po peggiore.'
    },
    {
      id: 'foro', t: 'Foratura',
      campi: [selMat, { id: 'tipo', et: 'Punta', tipo: 'scelta', scelte: [['puntaMD', 'Metallo duro'], ['puntaIns', 'A inserti'], ['centrino', 'Centrino']] },
        { id: 'd', et: 'Diametro punta', u: 'mm', v: 8.5 }, { id: 'vc', et: 'Velocita di taglio Vc', u: 'm/min', v: 80 },
        { id: 'f', et: 'Avanzamento', u: 'mm/giro', v: 0.15 }, { id: 'prof', et: 'Profondita foro', u: 'mm', v: '' }],
      mat: (m, v) => { const r = O.datiTaglio(m, { tipo: v.tipo || 'puntaMD', d: O.num(v.d) || 10 }); return { vc: r.vc, f: arrot(r.fn, 3) }; },
      ricalcolaMat: ['tipo', 'd'],
      calc(v, g) {
        if (!(v.d > 0 && v.vc > 0 && v.f > 0)) return null;
        const r = O.foratura(v);
        const punta = g.tipo === 'puntaIns' ? 0 : v.d / (2 * Math.tan(70 * Math.PI / 180));   // 140 gradi
        return { gauge: ['Velocita mandrino (n)', fmt(r.n, 0), 'giri/min'],
          ris: [['Avanzamento', fmt(r.vf, 0), 'mm/min'], ['Altezza della punta 140°', fmt(punta, 2), 'mm'],
            v.prof > 0 ? ['Tempo', fmt((v.prof + punta) / r.vf * 60, 0), 's'] : null],
          avviso: v.prof > 5 * v.d && g.tipo !== 'puntaIns' ? 'Foro oltre 5 D: scarico del truciolo (ciclo a beccate) o punta lunga con refrigerante interno.' : '' };
      }
    },
    {
      id: 'maschio', t: 'Maschiatura',
      campi: [{ id: 'fil', et: 'Filetto', tipo: 'scelta', scelte: [['', '— scegli —']].concat(O.FILETTI_GROSSI.map(f => [f[0] + 'x' + f[1], 'M' + f[0] + ' x ' + f[1]]))
        .concat(O.FILETTI_FINI.map(f => [f[0] + 'x' + f[1], 'M' + f[0] + ' x ' + f[1] + ' fine'])) },
      selMat, { id: 'd', et: 'Diametro nominale', u: 'mm', v: 10 }, { id: 'p', et: 'Passo', u: 'mm', v: 1.5 }, { id: 'vc', et: 'Velocita di taglio Vc', u: 'm/min', v: 10 }],
      mat: m => ({ vc: m.tvc }),
      scelta(id, v, f) { if (id === 'fil' && v.fil) { const [d, p] = v.fil.split('x'); f.metti('d', d); f.metti('p', p); } },
      calc(v) {
        if (!(v.d > 0 && v.p > 0)) return null;
        const f = O.filetto(v.d, v.p), n = v.vc > 0 ? O.giri(v.vc, v.d) : NaN;
        return { gauge: ['Velocita mandrino (n)', fmt(n, 0), 'giri/min'],
          ris: [['Avanzamento', fmt(n * v.p, 0), 'mm/min'], ['Preforo maschio a taglio', fmt(f.preforo, 2), 'mm'],
            ['Preforo maschio a rullare', fmt(v.d - 0.45 * v.p, 2), 'mm'], ['Nocciolo madrevite D1', fmt(f.nocciolo, 3), 'mm']] };
      },
      nota: 'Preforo a rullare indicativo (D - 0,45 P): vale quello del costruttore del maschio.'
    },
    {
      id: 'filetto', t: 'Filettatura al tornio',
      campi: [{ id: 'tipo', et: 'Tipo', tipo: 'scelta', scelte: [['est', 'Esterno (vite)'], ['int', 'Interno (madrevite)']] },
        { id: 'd', et: 'Diametro nominale', u: 'mm', v: 20 }, { id: 'p', et: 'Passo', u: 'mm', v: 2.5 }, { id: 'n', et: 'Numero passate', v: 8 }],
      calc(v, g) {
        if (!(v.d > 0 && v.p > 0 && v.n >= 1)) return null;
        const f = O.filetto(v.d, v.p), est = g.tipo !== 'int', h = est ? f.hEsterno : f.hInterno;
        const pas = O.passateFiletto(h, Math.round(v.n));
        return { ris: [['Profondita radiale', fmt(h, 3), 'mm'], [est ? 'Diametro di fondo' : 'Si parte da D1', fmt(est ? v.d - 2 * h : f.nocciolo, 3), 'mm'], ['Diametro medio', fmt(f.medio, 3), 'mm']],
          html: '<div class="scorri"><table><tr><th>Passata</th><th>Prof.</th><th>Incremento</th><th>X</th></tr>' + pas.map((pr, i) => '<tr><td>' + (i + 1) + '</td><td>' + fmt(pr, 3) +
            '</td><td>' + fmt(i ? pr - pas[i - 1] : pr, 3) + '</td><td>' + fmt(est ? v.d - 2 * pr : f.nocciolo + 2 * pr, 3) + '</td></tr>').join('') + '</table></div>' };
      },
      nota: 'Passate a sezione di truciolo costante, poi una passata a vuoto.'
    },
    {
      id: 'cono', t: 'Cono',
      campi: [{ id: 'D', et: 'Diametro maggiore', u: 'mm', v: 30 }, { id: 'dm', et: 'Diametro minore', u: 'mm', v: 20 }, { id: 'l', et: 'Lunghezza', u: 'mm', v: 40 }],
      calc(v) {
        if (!(v.D > 0 && v.dm >= 0 && v.l > 0) || v.dm > v.D) return null;
        const c = O.cono(v.D, v.dm, v.l);
        return { ris: [['Semiangolo', fmt(c.semiangolo, 4), '°'], ['Angolo del cono', fmt(c.angolo, 4), '°'],
          ['Conicita', c.rapporto > 0 ? '1:' + fmt(1 / c.rapporto, 2) : '—'], ['Pendenza', fmt(c.rapporto / 2 * 100, 2), '%']] };
      }
    },
    {
      id: 'cerchio', t: 'Fori su cerchio',
      campi: [{ id: 'dc', et: 'Diametro circonferenza', u: 'mm', v: 80 }, { id: 'n', et: 'Numero fori', v: 6 }, { id: 'a', et: 'Angolo primo foro', u: '°', v: 0 }],
      calc(v) {
        if (!(v.dc > 0 && v.n >= 1 && v.n <= 360)) return null;
        const n = Math.round(v.n), p = O.foriSuCerchio(v.dc, n, v.a || 0);
        return { ris: [['Distanza tra due fori', fmt(v.dc * Math.sin(Math.PI / n), 3), 'mm'], ['Angolo tra i fori', fmt(360 / n, 4), '°']],
          html: '<div class="scorri"><table><tr><th>Foro</th><th>X</th><th>Y</th></tr>' + p.map(q => '<tr><td>' + q.n + '</td><td>' + fmt(q.x, 3) + '</td><td>' + fmt(q.y, 3) + '</td></tr>').join('') + '</table></div>' };
      }
    },
    {
      id: 'peso', t: 'Peso del grezzo',
      campi: [selMat, { id: 'forma', et: 'Forma', tipo: 'scelta', scelte: [['tondo', 'Tondo'], ['tubo', 'Tubo'], ['piatto', 'Piatto / blocco'], ['esagono', 'Esagono']] },
        { id: 'd', et: 'Diametro', u: 'mm', v: 50, se: v => v.forma === 'tondo' || v.forma === 'tubo' || !v.forma },
        { id: 'di', et: 'Diametro interno', u: 'mm', v: 30, se: v => v.forma === 'tubo' },
        { id: 'a', et: 'Larghezza', u: 'mm', v: 100, se: v => v.forma === 'piatto' }, { id: 'b', et: 'Spessore', u: 'mm', v: 20, se: v => v.forma === 'piatto' },
        { id: 's', et: 'Chiave (su piani)', u: 'mm', v: 30, se: v => v.forma === 'esagono' },
        { id: 'l', et: 'Lunghezza', u: 'mm', v: 200 }, { id: 'rho', et: 'Densita', u: 'kg/dm³', v: 7.85 }],
      mat: m => ({ rho: m.rho }),
      calc(v, g) {
        if (!(v.l > 0 && v.rho > 0)) return null;
        const kg = O.peso(g.forma || 'tondo', v, v.rho);
        if (!(kg > 0)) return null;
        return { gauge: ['Peso', fmt(kg, kg < 10 ? 3 : 2), 'kg'], ris: [['Peso al metro', fmt(kg / v.l * 1000, 2), 'kg/m'], ['Volume', fmt(kg / v.rho, 3), 'dm³']] };
      }
    },
    {
      id: 'triangolo', t: 'Triangolo rettangolo',
      campi: [{ id: 'a', et: 'Cateto a', sub: 'opposto all\'angolo α', u: 'mm', v: 10 }, { id: 'b', et: 'Cateto b', u: 'mm', v: '' },
        { id: 'c', et: 'Ipotenusa c', u: 'mm', v: '' }, { id: 'A', et: 'Angolo α', u: '°', v: 30 }],
      calc(v) {
        const r = O.triangolo(v);
        if (!r) return { errore: 'Scrivi due dati: due lati, oppure un lato e l\'angolo (minore di 90°). Lascia vuoti gli altri.' };
        return { ris: [['Cateto a', fmt(r.a, 4), 'mm'], ['Cateto b', fmt(r.b, 4), 'mm'], ['Ipotenusa c', fmt(r.c, 4), 'mm'], ['Angolo α', fmt(r.A, 4), '°'], ['Angolo β', fmt(r.B, 4), '°']] };
      },
      nota: 'Si usano i primi due dati scritti, in quest\'ordine: a e b, a e c, b e c, angolo e un lato.'
    },
    {
      id: 'rugo', t: 'Rugosita e avanzamento',
      campi: [{ id: 'ra', et: 'Ra voluta', u: 'µm', v: 1.6 }, { id: 'r', et: 'Raggio punta', u: 'mm', v: 0.8 }],
      calc(v) {
        if (!(v.ra > 0 && v.r > 0)) return null;
        const f = Math.sqrt(v.ra / 1000 * 32 * v.r);
        return { gauge: ['Avanzamento massimo', fmt(f, 3), 'mm/giro'], ris: [['Classe', O.rugositaN(v.ra)], ['Avanzamento consigliato', fmt(f * 0.8, 3), 'mm/giro']] };
      },
      nota: 'Dalla formula teorica Ra = f² / (32 · r); il consigliato tiene un margine del 20%.'
    },
    {
      id: 'pollici', t: 'Pollici e mm',
      campi: [{ id: 'poll', et: 'Pollici', sub: 'anche 1 1/4 o 3/8', tipo: 'testo', v: '1/2' }, { id: 'mm', et: 'Millimetri', u: 'mm', v: 12 }],
      calc(v, g) {
        const pol = leggiPollici(g.poll), ris = [];
        if (isFinite(pol)) ris.push([g.poll + '"', fmt(pol * 25.4, 4), 'mm']);
        if (v.mm > 0) { ris.push([fmt(v.mm, 3) + ' mm', fmt(v.mm / 25.4, 4), 'pollici']); ris.push(['Frazione piu vicina', frazione(v.mm / 25.4)]); }
        return ris.length ? { ris } : null;
      }
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
    if (num === 64) return String(intero + 1) + '"';
    while (num && num % 2 === 0) { num /= 2; den /= 2; }
    const err = (intero + num / den - inch) * 25.4;
    return (intero ? intero + (num ? ' ' : '') : '') + (num ? num + '/' + den : (intero ? '' : '0')) + '" (' + (err >= 0 ? '+' : '') + fmt(err, 3) + ' mm)';
  }

  function mostraRisultato(uscita, r) {
    uscita.innerHTML = '';
    if (!r) { uscita.appendChild(A.info('Compila i campi per vedere il risultato.')); return; }
    if (r.errore) uscita.appendChild(el('p', { class: 'errore', testo: r.errore }));
    if (r.gauge) uscita.appendChild(A.misuratore(...r.gauge));
    if (r.ris && r.ris.filter(Boolean).length) uscita.appendChild(A.griglia(r.ris));
    if (r.avviso) uscita.appendChild(A.info(A.esc(r.avviso), 'avviso'));
    if (r.html) uscita.appendChild(el('div', { class: 'pannello', style: 'margin-top:10px;padding:4px 8px', html: r.html }));
  }

  /** Una calcolatrice con materiale, moduli e risultati: usata anche da altre schermate. */
  function calcolatore(m, c) {
    const valori = A.sezione('valori')[c.id] = A.sezione('valori')[c.id] || {};
    const pan = el('div', { class: 'pannello' });
    const uscita = el('div');
    const notaMat = el('div');
    m.append(pan, uscita, notaMat);
    if (c.nota) m.appendChild(A.info(A.esc(c.nota)));
    let f;
    const aggiorna = id => {
      if (c.mat && valori.mat !== '' && valori.mat !== undefined && (id === 'mat' || (c.ricalcolaMat || []).includes(id))) {
        const mt = A.materiale(valori.mat);
        if (mt) { const nuovi = c.mat(mt, valori); for (const k in nuovi) if (nuovi[k] !== undefined && nuovi[k] !== null) f.metti(k, nuovi[k]); }
      }
      if (c.scelta) c.scelta(id, valori, f);
      f.aggiorna();
      const mt = valori.mat !== undefined && valori.mat !== '' ? A.materiale(valori.mat) : null;
      notaMat.innerHTML = '';
      if (mt) notaMat.appendChild(A.info('<b>' + A.esc(mt.n) + '</b>: ' + A.esc(mt.note || '')));
      mostraRisultato(uscita, c.calc(A.numeri(valori), valori));
    };
    f = A.modulo(pan, c.campi, valori, aggiorna);
    aggiorna();
  }
  A.calcolatore = calcolatore;

  A.schermi.calcoli = {
    titolo: 'Calcolatrice di taglio',
    render(m) {
      const chips = el('div', { class: 'chips' });
      const corpo = el('div');
      m.append(chips, corpo);
      const apri = id => {
        const c = CALC.find(x => x.id === id) || CALC[0];
        A.mem.calc = c.id; A.salva();
        chips.querySelectorAll('.chip').forEach(b => b.classList.toggle('attiva', b.dataset.id === c.id));
        corpo.innerHTML = '';
        calcolatore(corpo, c);
      };
      CALC.forEach(c => chips.appendChild(el('button', { class: 'chip', 'data-id': c.id, testo: c.t, onclick: () => apri(c.id) })));
      apri(A.mem.calc || 'fresa');
      const att = chips.querySelector('.attiva'); if (att && att.scrollIntoView) try { att.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* niente */ }
    }
  };
  A.CALC = CALC;

  // ----- utensili e dati di taglio -----
  A.schermi.utensili = {
    titolo: 'Utensili e dati di taglio',
    render(m) {
      const v = A.sezione('utensili');
      const pan = el('div', { class: 'pannello' }), uscita = el('div'), tabella = el('div');
      m.append(pan, uscita, tabella);
      const campi = [
        { id: 'mat', et: 'Materiale', tipo: 'scelta', scelte: () => A.sceltaMateriali() },
        { id: 'tipo', et: 'Utensile', tipo: 'scelta', scelte: O.UTENSILI },
        { id: 'd', et: 'Diametro', sub: 'del pezzo per l\'inserto da tornio', u: 'mm', v: 10 },
        { id: 'z', et: 'Taglienti', u: 'z', v: 3, se: x => /^(fresa|fresaFin|filettaFresa)$/.test(x.tipo) },
        { id: 'passo', et: 'Passo', u: 'mm', v: 1.5, se: x => x.tipo === 'maschio' }
      ];
      const aggiorna = () => {
        f.aggiorna();
        const mt = A.materiale(v.mat || 0), n = A.numeri(v);
        const nmax = v.tipo === 'inserto' ? A.imp().nmaxTornio : A.imp().nmaxFresa;
        const r = O.datiTaglio(mt, { tipo: v.tipo, d: n.d, z: n.z, passo: n.passo, nmax });
        uscita.innerHTML = '';
        if (!r) { uscita.appendChild(A.info(n.d > 0 ? 'Per questo materiale non ci sono dati per questo utensile.' : 'Scrivi il diametro.')); }
        else {
          uscita.appendChild(A.misuratore('Velocita mandrino (n)', fmt(r.n, 0), 'giri/min'));
          uscita.appendChild(A.griglia([['Velocita di taglio', fmt(r.vc, 0), 'm/min'],
            r.fz !== undefined ? ['Avanzamento al dente', fmt(r.fz, 3), 'mm/dente'] : ['Avanzamento al giro', fmt(r.fn, 3), 'mm/giro'],
            ['Avanzamento', fmt(r.f, 0), 'mm/min'], r.ap !== undefined ? ['Profondita ap', fmt(r.ap, 1), 'mm'] : null,
            r.ae !== undefined ? ['Passo laterale ae', fmt(r.ae, 1), 'mm'] : null]));
          uscita.appendChild(A.info('<b>' + A.esc(mt.n) + '</b>: ' + A.esc(r.testo) + '. ' + A.esc(mt.note || '') +
            (r.n >= nmax ? ' <b>Giri limitati al massimo delle impostazioni (' + nmax + ').</b>' : '')));
        }
        // tutti gli utensili per questo materiale e diametro
        if (mt && n.d > 0) {
          let h = '<div class="sez">Tutti gli utensili, D' + fmt(n.d) + ' in ' + A.esc(mt.n) + '</div><div class="pannello" style="padding:4px 8px"><div class="scorri"><table><tr><th>Utensile</th><th>Vc</th><th>Giri</th><th>Avanz.</th></tr>';
          for (const [t, nome] of O.UTENSILI) {
            const x = O.datiTaglio(mt, { tipo: t, d: n.d, z: n.z > 0 ? n.z : 3, passo: n.passo > 0 ? n.passo : 1, nmax: t === 'inserto' ? A.imp().nmaxTornio : A.imp().nmaxFresa });
            if (!x) continue;
            h += '<tr><td>' + A.esc(nome) + '</td><td>' + fmt(x.vc, 0) + '</td><td>' + fmt(x.n, 0) + '</td><td>' + fmt(x.f, 0) + ' <small>mm/min</small></td></tr>';
          }
          tabella.innerHTML = h + '</table></div></div>';
        } else tabella.innerHTML = '';
      };
      const f = A.modulo(pan, campi, v, aggiorna);
      aggiorna();
    }
  };

  // ----- tolleranze e accoppiamenti -----
  function disegnoAccoppiamento(a, b, foro, alb) {
    // zone di tolleranza rispetto alla linea dello zero (micrometri in verticale)
    const vals = [a.sup, a.inf, b.sup, b.inf, 0];
    const max = Math.max(...vals), min = Math.min(...vals), span = Math.max(max - min, 1);
    const H = 150, top = 16, sc = (H - 2 * top) / span, Y = x => top + (max - x) * sc;
    const zona = (x, s, i, col, et) => '<rect x="' + x + '" y="' + Y(s) + '" width="70" height="' + Math.max(2, (s - i) * sc) + '" rx="4" fill="' + col + '" opacity=".85"/>' +
      '<text x="' + (x + 35) + '" y="' + (Y(s) - 4) + '" text-anchor="middle" font-size="12" fill="var(--testo)">' + et + '</text>' +
      '<text x="' + (x + 76) + '" y="' + (Y(s) + 4) + '" font-size="10.5" fill="var(--tenue)">' + (s > 0 ? '+' : '') + fmt(s, 1) + '</text>' +
      '<text x="' + (x + 76) + '" y="' + (Y(i) + 4) + '" font-size="10.5" fill="var(--tenue)">' + (i > 0 ? '+' : '') + fmt(i, 1) + '</text>';
    return '<svg viewBox="0 0 320 ' + H + '" style="width:100%;max-width:420px;margin:0 auto" role="img" aria-label="Zone di tolleranza">' +
      '<line x1="10" x2="310" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="var(--tenue)" stroke-dasharray="5 4"/>' +
      '<text x="12" y="' + (Y(0) - 4) + '" font-size="10.5" fill="var(--tenue)">0</text>' +
      zona(60, a.sup, a.inf, 'var(--accento)', 'Foro ' + A.esc(foro)) + zona(190, b.sup, b.inf, 'var(--ok)', 'Albero ' + A.esc(alb)) + '</svg>';
  }
  const SCELTE_FORI = ['H6', 'H7', 'H8', 'H9', 'H11', 'G6', 'G7', 'F7', 'F8', 'E8', 'D9', 'JS6', 'JS7'].map(x => [x, x]);
  const SCELTE_ALB = ['h6', 'h7', 'h9', 'h11', 'g6', 'f7', 'e8', 'd9', 'js6', 'k6', 'm6', 'n6', 'p6', 'k5', 'g5', 'h5'].map(x => [x, x]);
  const SCELTE_ACC = [['H7/g6', 'H7/g6 con gioco preciso'], ['H7/h6', 'H7/h6 scorrevole'], ['H7/f7', 'H7/f7 girevole'], ['H8/f7', 'H8/f7 girevole largo'],
    ['H7/js6', 'H7/js6 incerto'], ['H7/k6', 'H7/k6 incerto (bloccato)'], ['H7/m6', 'H7/m6 leggermente forzato'], ['H7/n6', 'H7/n6 forzato'], ['H7/p6', 'H7/p6 a pressa'],
    ['H11/d9', 'H11/d9 con molto gioco'], ['', 'Scegli foro e albero']];
  A.schermi.tolleranze = {
    titolo: 'Tolleranze e accoppiamenti',
    render(m) {
      const v = A.sezione('tolleranze');
      const pan = el('div', { class: 'pannello' }), uscita = el('div');
      m.append(pan, uscita);
      const campi = [{ id: 'd', et: 'Diametro nominale', u: 'mm', v: 25 }, { id: 'acc', et: 'Accoppiamento', tipo: 'scelta', scelte: SCELTE_ACC },
        { id: 'foro', et: 'Classe del foro', tipo: 'scelta', scelte: SCELTE_FORI, v: 'H7' }, { id: 'alb', et: 'Classe dell\'albero', tipo: 'scelta', scelte: SCELTE_ALB, v: 'g6' },
        { id: 'libero', et: 'Altra classe', sub: 'es. H9 o k5: vale questa', tipo: 'testo', v: '' }];
      const aggiorna = id => {
        if (id === 'acc' && v.acc) { const [x, y] = v.acc.split('/'); f.metti('foro', x); f.metti('alb', y); }
        if ((id === 'foro' || id === 'alb') && v.acc !== '') f.metti('acc', SCELTE_ACC.some(s => s[0] === v.foro + '/' + v.alb) ? v.foro + '/' + v.alb : '');
        const d = O.num(v.d);
        uscita.innerHTML = '';
        if (!(d > 0)) { uscita.appendChild(A.info('Scrivi il diametro.')); return; }
        const lib = String(v.libero || '').trim();
        if (lib) {
          const t = O.tolleranza(d, lib);
          if (t.errore) { uscita.appendChild(el('p', { class: 'errore', testo: t.errore })); return; }
          uscita.appendChild(A.misuratore('Campo di tolleranza ' + lib, fmt(t.it / 1000, 3), 'mm'));
          uscita.appendChild(A.griglia([['Massimo', fmt(t.max, 4), 'mm'], ['Minimo', fmt(t.min, 4), 'mm'], ['Scostamento superiore', (t.sup > 0 ? '+' : '') + fmt(t.sup, 1), 'µm'], ['Scostamento inferiore', (t.inf > 0 ? '+' : '') + fmt(t.inf, 1), 'µm']]));
          return;
        }
        const a = O.tolleranza(d, v.foro), b = O.tolleranza(d, v.alb);
        if (a.errore || b.errore) { uscita.appendChild(el('p', { class: 'errore', testo: a.errore || b.errore })); return; }
        const gMax = a.sup - b.inf, gMin = a.inf - b.sup;
        const tipo = gMin >= 0 ? 'Gioco' : gMax <= 0 ? 'Interferenza' : 'Incerto';
        uscita.appendChild(A.misuratore('Campo di tolleranza del foro', fmt(a.it / 1000, 3), 'mm'));
        uscita.appendChild(A.griglia([['Foro ' + v.foro, fmt(a.min, 3) + ' / ' + fmt(a.max, 3), 'mm'], ['Albero ' + v.alb, fmt(b.min, 3) + ' / ' + fmt(b.max, 3), 'mm'],
          ['Accoppiamento', tipo], [tipo === 'Interferenza' ? 'Interferenza' : 'Gioco', (gMin > 0 ? '+' : '') + fmt(gMin, 1) + ' … ' + (gMax > 0 ? '+' : '') + fmt(gMax, 1), 'µm']]));
        uscita.appendChild(el('div', { class: 'pannello pieno', style: 'margin-top:10px', html: disegnoAccoppiamento(a, b, v.foro, v.alb) }));
        uscita.appendChild(A.info(tipo === 'Gioco' ? 'Per un accoppiamento con gioco si usano H7/g6 o simili.' : tipo === 'Interferenza' ? 'Montaggio a pressa o a caldo.' : 'Puo venire con gioco o con interferenza: montaggio con il martello di plastica.'));
      };
      const f = A.modulo(pan, campi, v, aggiorna);
      aggiorna();
    }
  };
})();
