// ===== Hich-Officina: galleria, programmi salvati, tabelle, materiali, preferiti, impostazioni =====
(function () {
  'use strict';
  const A = window.App, O = A.O, el = A.el, esc = A.esc, fmt = A.fmt;
  const iMat = nome => String(Math.max(0, A.materiali().findIndex(m => m.n === nome)));

  // ----- galleria -----
  const ESEMPI = {
    fresa: [
      { t: 'Spianatura blocco', s: 'Alluminio, fresa a spianare D50', v: () => ({ mat: iMat('Alluminio'), op: 'spianatura', tipoUt: 'fresa', d: 50, z: 5, lx: 120, ly: 80, prof: 1.5, t: 1, nome: 'SPIANATURA' }) },
      { t: 'Contornatura pezzo', s: 'C40, fresa D12 con finitura', v: () => ({ mat: iMat('C40'), op: 'contorno', tipoUt: 'fresa', d: 12, z: 4, lx: 80, ly: 50, prof: 15, sovra: 0.2, finitura: true, t: 2, nome: 'CONTORNO' }) },
      { t: 'Tasca rettangolare', s: 'AISI 304, fresa D10, rampa a 3°', v: () => ({ mat: iMat('AISI 304/304L'), op: 'tasca', tipoUt: 'fresa', d: 10, z: 4, cx: 40, cy: 25, lx: 50, ly: 30, prof: 8, sovra: 0.2, finitura: true, t: 3, nome: 'TASCA' }) }
    ],
    fori: [
      { t: 'Flangia: 6 fori su cerchio', s: 'Punta metallo duro D9, ciclo automatico', v: () => ({ mat: iMat('Ferro (Fe360)'), tipoUt: 'puntaMD', d: 9, prof: 20, conPunta: true, schema: 'cerchio', cx: 0, cy: 0, dc: 100, nf: 6, a: 0, ciclo: 'auto', t: 4, nome: 'FLANGIA FORI' }) },
      { t: 'Maschiatura M8 a griglia', s: 'Maschio M8x1,25, G84', v: () => ({ mat: iMat('C40'), tipoUt: 'maschio', d: 8, passo: 1.25, prof: 16, schema: 'griglia', x0: 15, y0: 15, nx: 3, ny: 2, px: 25, py: 30, ciclo: 'auto', t: 5, nome: 'MASCHIATURA M8' }) },
      { t: 'Alesatura D10 H7', s: 'Alesatore, ciclo G85', v: () => ({ mat: iMat('C40'), tipoUt: 'alesatore', d: 10, prof: 18, schema: 'elenco', testo: '20 20\n60 20\n60 50', ciclo: 'auto', t: 6, nome: 'ALESATURA D10' }) },
      { t: 'Foro profondo a inserti', s: 'Punta a inserti D25', v: () => ({ mat: iMat('Ferro (Fe360)'), tipoUt: 'puntaIns', d: 25, prof: 60, schema: 'elenco', testo: '0 0', ciclo: 'auto', t: 7, nome: 'FORO D25' }) }
    ],
    tornio: [
      { t: 'Albero con smusso', s: 'Sgrossatura e finitura D40 a D30', v: () => ({ mat: iMat('C40'), op: 'sgrossatura', dg: 40, df: 30, l: 50, ap: 2, sx: 0.4, sz: 0.1, finitura: true, ff: 0.1, smusso: 1, t: 1, nome: 'ALBERO' }) },
      { t: 'Filetto M20x2,5', s: 'Filetto esterno a 8 passate', v: () => ({ mat: iMat('C40'), op: 'filetto', d: 20, p: 2.5, l: 30, n: 8, t: 3, nome: 'FILETTO M20' }) },
      { t: 'Boccola: foro e barenatura', s: 'Foratura D20 e interna a D30', v: () => ({ mat: iMat('Bronzo'), op: 'interna', dp: 20, di: 30, dg: 50, l: 25, ap: 1, sx: 0.3, sz: 0.1, finitura: true, ff: 0.08, smusso: 0.5, t: 5, nome: 'BOCCOLA' }) },
      { t: 'Gola di scarico', s: 'Gola larga 8 con utensile da 3', v: () => ({ mat: iMat('Ferro (Fe360)'), op: 'gola', dg: 40, dfondo: 34, zg: -20, b: 8, w: 3, t: 4, nome: 'GOLA' }) }
    ]
  };
  A.schermi.galleria = {
    titolo: 'Galleria esempi',
    render(m) {
      const S = A.sezione('galleriaVista');
      const schede = el('div', { class: 'schede' }), corpo = el('div', { class: 'elenco' });
      m.append(schede, corpo);
      const mostra = () => {
        const tab = S.tab || 'fresa';
        schede.querySelectorAll('button').forEach(b => b.classList.toggle('attiva', b.dataset.id === tab));
        corpo.innerHTML = '';
        ESEMPI[tab].forEach(e => corpo.appendChild(el('button', { class: 'elem', onclick: () => A.apriProgramma(tab, e.v()) }, [
          el('span', { class: 'ic', html: A.icona(tab === 'tornio' ? 'tornio' : tab === 'fori' ? 'foro' : 'galleria') }),
          el('span', { class: 't' }, [el('b', { testo: e.t }), el('small', { testo: e.s })]),
          el('span', { class: 'fine', html: A.icona('salva') })])));
      };
      [['fresa', 'Fresatura'], ['fori', 'Foratura'], ['tornio', 'Tornitura']].forEach(([id, t]) => schede.appendChild(el('button', { 'data-id': id, testo: t, onclick: () => { S.tab = id; A.salva(); mostra(); } })));
      mostra();
      m.appendChild(A.info('L\'esempio si apre in Nuovo programma ISO: cambia le misure e genera il programma.'));
    }
  };
  A.ESEMPI = ESEMPI;

  // ----- programmi salvati -----
  A.schermi.salvati = {
    titolo: 'Programmi salvati',
    render(m) {
      const L = A.mem.salvati || [];
      if (!L.length) { m.appendChild(el('div', { class: 'vuoto', html: 'Nessun programma salvato.<br>Dal programma generato premi <b>Tieni</b>.' })); return; }
      const lista = el('div', { class: 'elenco' });
      L.forEach((p, i) => {
        const riga = el('div', { style: 'display:flex;gap:6px;align-items:center' }, [
          el('button', { class: 'elem', style: 'flex:1;min-width:0', onclick: () => { A.param.listato = { righe: p.righe, nome: p.nome, tipo: p.tipo }; A.vai('listato'); } }, [
            el('span', { class: 'ic', testo: p.tipo === 'tornio' ? 'T' : 'F' }),
            el('span', { class: 't' }, [el('b', { testo: p.titolo || p.nome }), el('small', { testo: p.nome + ' · ' + p.data + ' · ' + p.righe.length + ' righe' })])]),
          el('button', { class: 'icona-pul', 'aria-label': 'Elimina ' + (p.titolo || p.nome), html: A.icona('cestino'), onclick: e => {
            const b = e.currentTarget;
            if (b.dataset.conf) { L.splice(i, 1); A.salva(); A.ridisegna(); A.avviso('Eliminato'); }
            else { b.dataset.conf = '1'; b.style.color = 'var(--errore)'; A.avviso('Premi ancora per eliminare'); }
          } })]);
        lista.appendChild(riga);
      });
      m.appendChild(lista);
      m.appendChild(A.info('I programmi restano solo su questo telefono. Per tenerli al sicuro usa Condividi o File .nc.'));
    }
  };

  // ----- tabelle -----
  const TAB = {
    filetti() {
      const riga = ([d, p], fine) => { const f = O.filetto(d, p); return '<tr><td>M' + fmt(d) + (fine ? 'x' + fmt(p) : '') + '</td><td>' + fmt(p) + '</td><td><b>' + fmt(f.preforo, 2) + '</b></td><td>' + fmt(f.medio, 3) + '</td><td>' + fmt(f.nocciolo, 3) + '</td><td>' + fmt(f.nocciolo_vite, 3) + '</td></tr>'; };
      const t = '<tr><th>Filetto</th><th>Passo</th><th>Preforo</th><th>d2</th><th>D1</th><th>d3</th></tr>';
      return '<div class="sez">Metrico ISO passo grosso</div><div class="pannello" style="padding:4px 8px"><div class="scorri"><table>' + t + O.FILETTI_GROSSI.map(x => riga(x)).join('') + '</table></div></div>' +
        '<div class="sez">Passo fine</div><div class="pannello" style="padding:4px 8px"><div class="scorri"><table>' + t + O.FILETTI_FINI.map(x => riga(x, true)).join('') + '</table></div></div>';
    },
    tolleranze(S) {
      const campi = ['H7', 'H8', 'G7', 'F7', 'JS7', 'h6', 'h7', 'g6', 'f7', 'js6', 'k6', 'm6', 'n6', 'p6'], sc = S.toll || 'H7';
      let h = '<div class="chips">' + campi.map(c => '<button class="chip' + (c === sc ? ' attiva' : '') + '" data-toll="' + c + '">' + c + '</button>').join('') + '</div>';
      h += '<div class="pannello" style="padding:4px 8px"><div class="scorri"><table><tr><th>Diametro mm</th><th>Sup. µm</th><th>Inf. µm</th><th>IT</th></tr>';
      let da = 0;
      for (const lim of O.LIMITI) { const t = O.tolleranza(lim, sc); h += '<tr><td>oltre ' + da + ' fino a ' + lim + '</td><td>' + (t.sup > 0 ? '+' : '') + fmt(t.sup, 1) + '</td><td>' + (t.inf > 0 ? '+' : '') + fmt(t.inf, 1) + '</td><td>' + t.it + '</td></tr>'; da = lim; }
      return h + '</table></div></div>';
    },
    rugosita() {
      const c = [['N12', 50], ['N11', 25], ['N10', 12.5], ['N9', 6.3], ['N8', 3.2], ['N7', 1.6], ['N6', 0.8], ['N5', 0.4], ['N4', 0.2], ['N3', 0.1], ['N2', 0.05], ['N1', 0.025]];
      const lav = { N10: 'sgrossatura', N9: 'tornitura e fresatura media', N8: 'tornitura e fresatura buona', N7: 'finitura accurata, alesatura', N6: 'rettifica', N5: 'rettifica fine', N4: 'lappatura' };
      return '<div class="pannello" style="padding:4px 8px"><div class="scorri"><table><tr><th>Classe</th><th>Ra µm</th><th>Lavorazione tipica</th></tr>' +
        c.map(([n, ra]) => '<tr><td><b>' + n + '</b></td><td>' + fmt(ra, 3) + '</td><td>' + (lav[n] || '') + '</td></tr>').join('') + '</table></div></div>';
    },
    pollici() {
      let h = '<div class="pannello" style="padding:4px 8px"><div class="scorri"><table><tr><th>Pollici</th><th>Decimale</th><th>mm</th></tr>';
      for (let k = 1; k <= 64; k++) { let n = k, d = 64; while (n % 2 === 0) { n /= 2; d /= 2; } const t = d === 1 ? n + '"' : n + '/' + d + '"';
        h += '<tr><td>' + (d <= 16 ? '<b>' + t + '</b>' : t) + '</td><td>' + fmt(k / 64, 4) + '</td><td>' + fmt(k / 64 * 25.4, 3) + '</td></tr>'; }
      return h + '</table></div></div>';
    },
    codici() {
      const G = [['G0', 'Rapido'], ['G1', 'Interpolazione lineare'], ['G2 / G3', 'Arco orario / antiorario'], ['G4', 'Sosta'], ['G17 / G18', 'Piano XY / ZX'], ['G21', 'Millimetri'],
        ['G28', 'Ritorno al punto di riferimento'], ['G32 / G33', 'Filettatura (tornio)'], ['G40 / G41 / G42', 'Compensazione raggio: via / sinistra / destra'], ['G43 / G49', 'Correzione lunghezza / via'],
        ['G50 / G92', 'Limite giri (tornio)'], ['G54…G59', 'Origini pezzo'], ['G65', 'Chiamata macro con argomenti'], ['G73 / G83', 'Foratura a beccate'], ['G80', 'Fine ciclo fisso'],
        ['G81 / G82', 'Foratura / con sosta'], ['G84', 'Maschiatura'], ['G85 / G86', 'Alesatura / barenatura'], ['G90 / G91', 'Assoluto / incrementale'], ['G94 / G95', 'Avanzamento al minuto / al giro (fresa)'],
        ['G96 / G97', 'Vc costante / giri fissi'], ['G98 / G99', 'Ritorno al piano iniziale / R (fresa); al minuto / al giro (tornio)']];
      const M = [['M0 / M1', 'Arresto / arresto facoltativo'], ['M3 / M4 / M5', 'Mandrino orario / antiorario / fermo'], ['M6', 'Cambio utensile'], ['M8 / M9', 'Refrigerante si / no'],
        ['M30', 'Fine programma e ritorno all\'inizio'], ['M98 / M99', 'Chiamata / fine sottoprogramma']];
      const t = L => '<div class="pannello" style="padding:4px 8px"><table>' + L.map(([c, d]) => '<tr><td style="white-space:nowrap"><b>' + c + '</b></td><td>' + d + '</td></tr>').join('') + '</table></div>';
      return '<div class="sez">Codici G piu usati</div>' + t(G) + '<div class="sez">Codici M</div>' + t(M) + '<p class="leggenda" style="margin-top:8px">Il significato puo cambiare da una macchina all\'altra: vale il manuale della macchina.</p>';
    }
  };
  A.schermi.tabelle = {
    titolo: 'Tabelle',
    render(m) {
      const S = A.sezione('tabelleVista');
      const chips = el('div', { class: 'chips' }), corpo = el('div');
      m.append(chips, corpo);
      const nomi = { filetti: 'Filetti', tolleranze: 'Tolleranze', rugosita: 'Rugosita', pollici: 'Pollici', codici: 'Codici G e M' };
      const mostra = k => {
        S.tab = TAB[k] ? k : 'filetti'; A.salva();
        chips.querySelectorAll('.chip').forEach(b => b.classList.toggle('attiva', b.dataset.id === S.tab));
        corpo.innerHTML = TAB[S.tab](S);
        corpo.querySelectorAll('[data-toll]').forEach(b => b.addEventListener('click', () => { S.toll = b.dataset.toll; mostra('tolleranze'); }));
      };
      Object.keys(TAB).forEach(k => chips.appendChild(el('button', { class: 'chip', 'data-id': k, testo: nomi[k], onclick: () => mostra(k) })));
      mostra(S.tab || 'filetti');
    }
  };

  // ----- materiali -----
  const CAMPI_MAT = [['n', 'Nome', ''], ['g', 'Gruppo', ''],
    ['vc', 'Fresa sgrossatura: Vc', 'm/min'], ['fz', 'Fresa sgrossatura: fz per D10', 'mm/dente'], ['ap', 'Fresa: profondita di passata', 'x D'], ['ae', 'Fresa: passo laterale', '% D'],
    ['fvc', 'Fresa finitura: Vc', 'm/min', 'vuoto = sgrossatura'], ['ffz', 'Fresa finitura: fz per D10', 'mm/dente', 'vuoto = sgrossatura'],
    ['dvc', 'Punta metallo duro: Vc', 'm/min'], ['dfn', 'Punta metallo duro: fn per D10', 'mm/giro'],
    ['ivc', 'Punta a inserti: Vc', 'm/min', 'vuoto = punta metallo duro'], ['ifn', 'Punta a inserti: fn per D10', 'mm/giro', 'vuoto = punta metallo duro'],
    ['tvc', 'Maschio: Vc', 'm/min'], ['rvc', 'Alesatore: Vc', 'm/min'], ['rfn', 'Alesatore: fn', 'mm/giro'], ['bvc', 'Bareno: Vc', 'm/min'], ['bfn', 'Bareno: fn', 'mm/giro'],
    ['lvc', 'Tornitura con inserto: Vc', 'm/min'], ['lf', 'Tornitura: avanzamento', 'mm/giro'], ['rho', 'Densita', 'kg/dm³'], ['note', 'Note', '']];
  const TESTO = ['n', 'g', 'note'], FACOLT = ['fvc', 'ffz', 'ivc', 'ifn', 'lvc', 'lf'];
  A.schermi.materiali = {
    titolo: 'Materiali',
    render(m) {
      const L = A.materiali();
      const gruppi = {};
      L.forEach((x, i) => (gruppi[x.g] = gruppi[x.g] || []).push([x, i]));
      for (const g in gruppi) {
        m.appendChild(el('div', { class: 'sez', testo: g }));
        const lista = el('div', { class: 'elenco' });
        gruppi[g].forEach(([x, i]) => lista.appendChild(el('button', { class: 'elem', onclick: () => { A.param.materiale = i; A.vai('materiale'); } }, [
          el('span', { class: 't' }, [el('b', { testo: x.n }), el('small', { testo: 'Fresa ' + x.vc + ' · Punta ' + x.dvc + ' · Maschio ' + x.tvc + ' · Tornio ' + (x.lvc || '—') + ' m/min' })]),
          el('span', { class: 'fine', html: A.icona('modifica') })])));
        m.appendChild(lista);
      }
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', html: A.icona('materiale') + 'Aggiungi materiale', onclick: () => {
        const nuovi = JSON.parse(JSON.stringify(A.materiali()));
        nuovi.push(Object.assign({}, nuovi[3] || nuovi[0], { n: 'Nuovo materiale', g: 'Miei materiali', note: '' }));
        A.mem.materiali = nuovi; A.salva(); A.param.materiale = nuovi.length - 1; A.vai('materiale');
      } })]));
      if (Array.isArray(A.mem.materiali)) m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul peric', testo: 'Rimetti i materiali di serie', onclick: e => {
        const b = e.currentTarget;
        if (!b.dataset.conf) { b.dataset.conf = '1'; b.textContent = 'Premi ancora: le modifiche si perdono'; return; }
        delete A.mem.materiali; A.salva(); A.ridisegna(); A.avviso('Materiali di serie');
      } })]));
      m.appendChild(A.info('Gli stessi materiali e valori del programma parametrico (in officina solo metallo duro: le Vc si usano cosi come sono). La tornitura e la densita sono aggiunte qui e sono indicative.'));
    }
  };
  A.schermi.materiale = {
    titolo: 'Materiale', preferibile: false,
    render(m) {
      const i = A.param.materiale || 0;
      const x = A.materiali()[i];
      if (!x) { A.vai('materiali'); return; }
      const v = {};
      CAMPI_MAT.forEach(([k]) => { v[k] = x[k] === undefined || x[k] === null ? '' : String(x[k]); });
      const pan = el('div', { class: 'pannello' }), msg = el('div');
      m.append(pan, msg);
      A.modulo(pan, CAMPI_MAT.map(([k, et, u, sub]) => ({ id: k, et, u, sub, tipo: TESTO.includes(k) ? 'testo' : undefined, largo: k === 'note' })), v, () => { msg.innerHTML = ''; });
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('salvati') + 'Salva', onclick: () => {
        const nuovo = { n: String(v.n).trim(), g: String(v.g).trim() || 'Miei materiali', note: String(v.note || '') };
        if (!nuovo.n) { msg.innerHTML = '<p class="errore">Il nome non puo essere vuoto.</p>'; return; }
        for (const [k, et] of CAMPI_MAT) {
          if (TESTO.includes(k)) continue;
          const s = String(v[k]).trim();
          if (s === '' && FACOLT.includes(k)) continue;
          const n = O.num(s);
          if (!(n > 0)) { msg.innerHTML = '<p class="errore">' + esc(et) + ': serve un numero maggiore di zero.</p>'; return; }
          nuovo[k] = n;
        }
        if (x.nohss) nuovo.nohss = true;
        const tutti = JSON.parse(JSON.stringify(A.materiali()));
        if (tutti.some((y, j) => j !== i && y.n === nuovo.n)) { msg.innerHTML = '<p class="errore">Esiste gia un materiale con questo nome.</p>'; return; }
        tutti[i] = nuovo; A.mem.materiali = tutti; A.salva(); A.avviso('Materiale salvato'); A.vai('materiali');
      } })]));
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul peric', html: A.icona('cestino') + 'Elimina materiale', onclick: e => {
        const b = e.currentTarget;
        if (!b.dataset.conf) { b.dataset.conf = '1'; b.lastChild.textContent = 'Premi ancora per eliminare'; return; }
        const tutti = JSON.parse(JSON.stringify(A.materiali()));
        if (tutti.length < 2) { A.avviso('Deve restare almeno un materiale'); return; }
        tutti.splice(i, 1); A.mem.materiali = tutti; A.salva(); A.vai('materiali');
      } })]));
    }
  };

  // ----- preferiti -----
  A.schermi.preferiti = {
    titolo: 'Preferiti', preferibile: false,
    render(m) {
      const L = (A.mem.preferiti || []).filter(id => A.schermi[id]);
      if (!L.length) { m.appendChild(el('div', { class: 'vuoto', html: 'Nessun preferito.<br>Apri una schermata e tocca la stella in alto.' })); return; }
      const menu = el('div', { class: 'menu' });
      L.forEach(id => { const v = A.MENU.find(x => x[0] === id) || [id, 'stella', A.schermi[id].titolo, '']; menu.appendChild(A.voceMenu(v)); });
      m.appendChild(menu);
    }
  };

  // ----- impostazioni -----
  A.schermi.impostazioni = {
    titolo: 'Impostazioni', preferibile: false,
    render(m) {
      const v = Object.assign({}, A.imp());
      const salva = id => {
        const s = {};
        for (const k in A.IMPOSTAZIONI_SERIE) {
          const def = A.IMPOSTAZIONI_SERIE[k];
          if (typeof def === 'boolean') s[k] = !!v[k];
          else if (typeof def === 'number') { const n = O.num(v[k]); s[k] = n > 0 ? n : def; }
          else s[k] = v[k];
        }
        A.mem.imp = s; A.salva();
        if (id === 'tema') A.applicaTema();
      };
      const blocco = (tit, campi) => { m.appendChild(el('div', { class: 'sez', testo: tit })); const p = el('div', { class: 'pannello' }); m.appendChild(p); A.modulo(p, campi, v, salva); };
      blocco('Aspetto', [{ id: 'tema', et: 'Tema', tipo: 'scelta', scelte: [['scuro', 'Scuro'], ['chiaro', 'Chiaro'], ['auto', 'Come il telefono']] }]);
      blocco('Fresatrice', [{ id: 'nmaxFresa', et: 'Giri massimi mandrino', u: 'giri/min' }, { id: 'zSic', et: 'Z di sicurezza', u: 'mm' }, { id: 'zR', et: 'Piano R dei cicli', u: 'mm' },
        { id: 'fineZ', et: 'Z a fine programma', sub: 'vuoto = Z di sicurezza', u: 'mm' }, { id: 'g43', et: 'Correzione lunghezza G43 H', tipo: 'spunta' }]);
      blocco('Tornio', [{ id: 'nmaxTornio', et: 'Giri massimi mandrino', u: 'giri/min' }, { id: 'codLimite', et: 'Limite giri', tipo: 'scelta', scelte: [['G50', 'G50 S...'], ['G92', 'G92 S...']] },
        { id: 'codFiletto', et: 'Filettatura', tipo: 'scelta', scelte: [['G32', 'G32'], ['G33', 'G33']] }, { id: 'xCambio', et: 'X cambio utensile', sub: 'vuoto = grezzo + 22', u: 'mm' },
        { id: 'zCambio', et: 'Z cambio utensile', u: 'mm' }]);
      blocco('Programmi', [{ id: 'numProg', et: 'Numero programma di partenza', u: 'O' }, { id: 'refrig', et: 'Refrigerante M8', tipo: 'spunta' }, { id: 'numerare', et: 'Numeri di riga N10, N20...', tipo: 'spunta' }]);
      m.appendChild(el('div', { class: 'sez', testo: 'Dati' }));
      m.appendChild(el('div', { class: 'menu' }, [A.voceMenu(['materiali', 'materiale', 'Materiali', 'Modifica velocita di taglio e avanzamenti'])]));
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', html: A.icona('salva') + 'Esporta i miei dati', onclick: () => A.condividi('hich-officina-dati.json', JSON.stringify(A.mem, null, 1)) })]));
      m.appendChild(A.info('Hich-Officina 2.0.0 · funziona anche senza rete. I dati restano su questo telefono. I valori di taglio sono di partenza: controlla sempre i programmi prima di lavorare.'));
    }
  };
})();
