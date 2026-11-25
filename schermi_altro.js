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
          el('button', { class: 'elem', style: 'flex:1;min-width:0', onclick: () => { A.param.listato = { righe: p.righe, nome: p.nome, tipo: p.tipo, idSalvato: p.id, iso: p.iso || null, ling: p.ling || 'iso', modificato: !p.iso && p.ling && p.ling !== 'iso' }; A.vai('listato'); } }, [
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
    filetti() { return ''; },
    tolleranze(S) {
      const LETT = ['D', 'E', 'F', 'G', 'H', 'JS', 'd', 'e', 'f', 'g', 'h', 'js', 'k', 'm', 'n', 'p'];
      const mt = /^(js|JS|[a-zA-Z])(\d{1,2})$/.exec(S.toll || 'H7') || ['', 'H', '7'];
      S.tollL = LETT.includes(S.tollL) ? S.tollL : mt[1]; S.tollG = O.GRADI_IT.includes(S.tollG) ? S.tollG : (O.GRADI_IT.includes(mt[2]) ? mt[2] : '7');
      const sc = S.tollL + S.tollG;
      let h = '<div class="sez">Lettera: fori in maiuscolo, alberi in minuscolo</div><div class="chips fam">' + LETT.map(c => '<button class="chip' + (c === S.tollL ? ' attiva' : '') + '" data-toll-l="' + c + '">' + c + '</button>').join('') + '</div>';
      h += '<div class="sez">Grado di tolleranza (IT)</div><div class="chips fam">' + O.GRADI_IT.map(g => '<button class="chip' + (g === S.tollG ? ' attiva' : '') + '" data-toll-g="' + g + '">IT' + g + '</button>').join('') + '</div>';
      h += '<div class="fil-testa"><b>' + sc + '</b></div>';
      h += '<div class="pannello" style="padding:4px 8px"><div class="scorri"><table><tr><th>Diametro mm</th><th>Sup. µm</th><th>Inf. µm</th><th>IT µm</th></tr>';
      let da = 0;
      for (const lim of O.LIMITI) {
        const t = O.tolleranza(lim, sc);
        h += t.errore ? '<tr><td>oltre ' + da + ' fino a ' + lim + '</td><td colspan="3">' + A.esc(t.errore) + '</td></tr>' : '<tr><td>oltre ' + da + ' fino a ' + lim + '</td><td>' + (t.sup > 0 ? '+' : '') + fmt(t.sup, 1) + '</td><td>' + (t.inf > 0 ? '+' : '') + fmt(t.inf, 1) + '</td><td>' + fmt(t.it, 1) + '</td></tr>';
        da = lim;
      }
      h += '</table></div></div>';
      h += '<div class="sez">Tutti i gradi IT (µm)</div><div class="pannello" style="padding:4px 8px"><div class="scorri"><table class="tab-fil"><tr><th>Oltre / fino a</th>' + O.GRADI_IT.map(g => '<th>IT' + g + '</th>').join('') + '</tr>';
      da = 0;
      O.LIMITI.forEach((lim, i) => { h += '<tr><td><b>' + da + ' / ' + lim + '</b></td>' + O.GRADI_IT.map(g => '<td>' + fmt(O.IT[g][i], 1) + '</td>').join('') + '</tr>'; da = lim; });
      return h + '</table></div></div><p class="leggenda">ISO 286, fino a 500 mm. Lettere disponibili: fori D E F G H JS, alberi d e f g h js k m n p. Le altre lettere (a, b, c, r, s, t, u...) servono le tabelle complete della norma.</p>';
    },
    rugosita() {
      const c = [['N12', 50], ['N11', 25], ['N10', 12.5], ['N9', 6.3], ['N8', 3.2], ['N7', 1.6], ['N6', 0.8], ['N5', 0.4], ['N4', 0.2], ['N3', 0.1], ['N2', 0.05], ['N1', 0.025]];
      const lav = { N10: 'sgrossatura', N9: 'tornitura e fresatura media', N8: 'tornitura e fresatura buona', N7: 'finitura accurata, alesatura', N6: 'rettifica', N5: 'rettifica fine', N4: 'lappatura' };
      return '<div class="pannello" style="padding:4px 8px"><div class="scorri"><table><tr><th>Classe</th><th>Ra µm</th><th>Lavorazione tipica</th></tr>' +
        c.map(([n, ra]) => '<tr><td><b>' + n + '</b></td><td>' + fmt(ra, 3) + '</td><td>' + (lav[n] || '') + '</td></tr>').join('') + '</table></div></div>';
    },
    coni() {
      const MORSE = [['0', 9.045, 19.212], ['1', 12.065, 20.047], ['2', 17.780, 20.020], ['3', 23.825, 19.922], ['4', 31.267, 19.254], ['5', 44.399, 19.002], ['6', 63.348, 19.180]];
      const riga = ([n, d, r]) => { const semi = Math.atan(1 / (2 * r)) * 180 / Math.PI; return '<tr><td><b>Morse ' + n + '</b></td><td>' + fmt(d, 3) + '</td><td>1:' + fmt(r, 3) + '</td><td>' + fmt(semi, 4) + '</td><td>' + fmt(semi * 2, 4) + '</td></tr>'; };
      const ISO = [['30', 31.75], ['35', 38.1], ['40', 44.45], ['45', 57.15], ['50', 69.85], ['60', 107.95]];
      const semi724 = Math.atan(7 / 24 / 2) * 180 / Math.PI;
      const rig2 = ([n, d]) => '<tr><td><b>ISO ' + n + '</b></td><td>' + fmt(d, 3) + '</td><td>7:24</td><td>' + fmt(semi724, 4) + '</td><td>' + fmt(semi724 * 2, 4) + '</td></tr>';
      const t = '<tr><th>Cono</th><th>Ø sul piano</th><th>Conicita</th><th>Semiangolo °</th><th>Angolo °</th></tr>';
      const altri = [['Cono metrico 1:20', '1:20'], ['Cono 1:24', '1:24'], ['Cono 1:10', '1:10'], ['Cono 1:5', '1:5'], ['Cono 1:16 (tubi NPT, gas R)', '1:16'], ['Cono 1:50 (spine coniche)', '1:50']]
        .map(([n, c]) => [n, c, Math.atan(1 / (2 * Number(c.split(':')[1]))) * 180 / Math.PI]);
      return '<div class="sez">Coni Morse</div><div class="pannello" style="padding:4px 8px"><div class="scorri"><table>' + t + MORSE.map(riga).join('') + '</table></div></div>' +
        '<div class="sez">Attacchi 7:24 (mandrini della fresa)</div><div class="pannello" style="padding:4px 8px"><div class="scorri"><table>' + t + ISO.map(rig2).join('') + '</table></div></div>' +
        '<div class="sez">Altri coni</div><div class="pannello" style="padding:4px 8px"><div class="scorri"><table><tr><th>Cono</th><th>Conicita</th><th>Semiangolo °</th><th>Angolo °</th></tr>' + altri.map(([n, c, a]) => '<tr><td>' + n + '</td><td>' + c + '</td><td>' + fmt(a, 4) + '</td><td>' + fmt(a * 2, 4) + '</td></tr>').join('') + '</table></div></div>' +
        '<p class="leggenda">Il semiangolo e quello da mettere sul carrello del tornio. Valori teorici: per i coni di precisione vale la norma.</p>';
    },
    pollici() {
      let h = '<div class="pannello" style="padding:4px 8px"><div class="scorri"><table><tr><th>Pollici</th><th>Decimale</th><th>mm</th></tr>';
      for (let k = 1; k <= 64; k++) { let n = k, d = 64; while (n % 2 === 0) { n /= 2; d /= 2; } const t = d === 1 ? n + '"' : n + '/' + d + '"';
        h += '<tr><td>' + (d <= 16 ? '<b>' + t + '</b>' : t) + '</td><td>' + fmt(k / 64, 4) + '</td><td>' + fmt(k / 64 * 25.4, 3) + '</td></tr>'; }
      return h + '</table></div></div>';
    },
    linguaggi(S) {
      const STATO = {
        iso: { fa: 'G0-G3, G17-G19, G40-G43, G54, G65, G73, G80-G89, G32/G33, G50, G71/G70/G74/G75/G76 (tornio), M3-M9, M30, macro con variabili', non: 'cicli fissi del tornio G72, G73, G90, G92, G94; tastatura G31 solo simulata', prova: 'Letto e simulato dall\'app; non provato su una macchina' },
        cicli: { fa: 'T D M6, G17 G90 G71 G40, G96 con LIMS, G33 K, MCALL CYCLE81-85 con parametri, commenti con ;', non: 'macro, cicli fissi del tornio (G71...), profili in programma', prova: 'Tradotto in modo meccanico, mai provato su un controllo vero: i parametri dei cicli vanno controllati sul manuale della macchina' },
        dialogo: { fa: 'BEGIN PGM, BLK FORM, TOOL CALL, L X Y Z R0 F, CYCL DEF 200 (foratura), 201 (alesatura), 207 (maschiatura rigida), M99', non: 'tornio, G41/G42 (RL/RR), archi, macro, profili con raccordi', prova: 'Tradotto in modo meccanico, mai provato su un controllo vero: nomi dei cicli e riga finale da verificare' }
      };
      const b2 = { n: 3000, f: 600, t: 3, zSic: 50, zR: 2 };
      const g = O.gcodeFresa('fori', Object.assign({ punti: O.schemaFori({ tipo: 'cerchio', dc: 60, n: 3 }), prof: 12, ciclo: 'G83', q: 4, d: 8 }, b2));
      let h = '<p class="leggenda">I programmi nascono in ISO e si traducono. Nessun linguaggio e stato provato su una macchina: la prima volta si prova sempre a vuoto.</p>';
      for (const k of Object.keys(O.LINGUAGGI)) {
        const L = O.LINGUAGGI[k], st = STATO[k], t = O.postProcessor(g.righe, { linguaggio: k, modo: 'fresa', nome: 'esempio' });
        h += '<div class="carta-det" style="padding:12px 14px"><b>' + esc(L.nome) + '</b>' +
          '<p style="margin:8px 0 4px"><b>Traduce:</b> ' + esc(st.fa) + '.</p><p style="margin:4px 0"><b>Non traduce:</b> ' + esc(st.non) + '.</p><p style="margin:4px 0"><b>Stato:</b> ' + esc(st.prova) + '.</p>' +
          '<div class="sez" style="margin:10px 0 4px">Esempio: 3 fori a beccate</div><pre class="listato" style="max-height:220px;margin:0">' + esc((t.righe || []).join('\n')) + '</pre></div>';
      }
      return h;
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
      A.CODICI = G.concat(M);
      return '<div class="sez">Codici G piu usati</div>' + t(G) + '<div class="sez">Codici M</div>' + t(M) + '<p class="leggenda" style="margin-top:8px">Il significato puo cambiare da una macchina all\'altra: vale il manuale della macchina.</p>';
    }
  };

  /** Tabella dei filetti: famiglie a schede, ricerca, colonne secondo la famiglia. */
  function filettiDom(S, corpo) {
    S.fam = O.FILETTI_FAMIGLIE.some(f => f.id === S.fam) ? S.fam : 'm';
    if (typeof S.cercaFil !== 'string') S.cercaFil = '';
    const schede = el('div', { class: 'chips fam' }), cerca = el('input', { type: 'search', id: 'f-cercaFil', placeholder: 'Cerca: M12, 1/2, G 3/4, Tr 20…', value: S.cercaFil, 'aria-label': 'Cerca un filetto', autocomplete: 'off' });
    const nota = el('div'), tab = el('div');
    corpo.append(el('div', { class: 'ctrl' }, [cerca]), schede, nota, tab);
    const disegna = () => {
      const f = O.FILETTI_FAMIGLIE.find(x => x.id === S.fam);
      schede.querySelectorAll('.chip').forEach(b => b.classList.toggle('attiva', b.dataset.id === S.fam));
      const righe = O.righeFamiglia(S.fam, S.cercaFil);
      nota.innerHTML = '';
      nota.appendChild(el('div', { class: 'fil-testa' }, [el('b', { testo: f.nome }), el('span', { class: 'badge', testo: 'Profilo ' + f.angolo }), f.conico ? el('span', { class: 'badge', testo: 'Conico 1:16' }) : null]));
      nota.appendChild(el('p', { class: 'leggenda', testo: f.note }));
      const th = '<tr><th>Filetto</th>' + f.colonne.map(c => '<th>' + O.FILETTI_ETICHETTE[c] + '</th>').join('') + '</tr>';
      const celle = r => f.colonne.map(c => '<td' + (c === 'preforo' ? ' class="evid"' : '') + '>' + (r[c] === undefined ? '—' : fmt(r[c], c === 'tpi' ? 1 : 3)) + '</td>').join('');
      tab.innerHTML = righe.length ? '<div class="pannello" style="padding:4px 8px"><div class="scorri"><table class="tab-fil">' + th + righe.map(r => '<tr><td><b>' + A.esc(r.nome) + '</b></td>' + celle(r) + '</tr>').join('') + '</table></div></div>' +
        '<p class="leggenda">' + righe.length + ' misure · quote in mm · valori teorici di base: vale la tabella del costruttore del maschio o dell\'utensile.</p>' : '<p class="leggenda">Nessun filetto trovato.</p>';
    };
    O.FILETTI_FAMIGLIE.forEach(f => schede.appendChild(el('button', { class: 'chip', 'data-id': f.id, testo: f.nome, onclick: () => { S.fam = f.id; A.salva(); disegna(); } })));
    cerca.addEventListener('input', () => { S.cercaFil = cerca.value; disegna(); });
    disegna();
  }
  A.schermi.tabelle = {
    titolo: 'Tabelle',
    render(m) {
      const S = A.sezione('tabelleVista');
      const chips = el('div', { class: 'chips' }), corpo = el('div');
      m.append(chips, corpo);
      const nomi = { filetti: 'Filetti', tolleranze: 'Tolleranze', rugosita: 'Rugosita', pollici: 'Pollici', coni: 'Coni', codici: 'Codici G e M', linguaggi: 'Linguaggi macchina' };
      const mostra = k => {
        S.tab = TAB[k] ? k : 'filetti'; A.salva();
        chips.querySelectorAll('.chip').forEach(b => b.classList.toggle('attiva', b.dataset.id === S.tab));
        corpo.innerHTML = '';
        if (S.tab === 'filetti') filettiDom(S, corpo); else corpo.innerHTML = TAB[S.tab](S);
        corpo.querySelectorAll('[data-toll-l]').forEach(b => b.addEventListener('click', () => { S.tollL = b.dataset.tollL; S.toll = S.tollL + (S.tollG || '7'); mostra('tolleranze'); }));
        corpo.querySelectorAll('[data-toll-g]').forEach(b => b.addEventListener('click', () => { S.tollG = b.dataset.tollG; S.toll = (S.tollL || 'H') + S.tollG; mostra('tolleranze'); }));
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
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('salva') + 'Importa la mia tabella materiali', onclick: () => A.vai('materialiImporta') })]));
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
      m.appendChild(A.info('Valori di partenza per utensili in metallo duro rivestito (maschi in acciaio super rapido da polveri rivestito): sono medie tipiche, da adattare alla macchina e al fissaggio. Per usare i tuoi valori: Importa la mia tabella materiali.'));
    }
  };
  A.schermi.materialiImporta = {
    titolo: 'Importa materiali', preferibile: false,
    render(m) {
      const v = { testo: '' };
      m.appendChild(A.info('<b>Come si fa:</b> in Hich-CAM apri la <b>Libreria materiali</b> e premi <b>JSON</b>: copia tutto il testo. ' +
        'Portalo sul telefono (per esempio mandandotelo per posta o salvandolo in un file .json o .txt), poi incollalo qui sotto o scegli il file. ' +
        'Sono gli stessi valori che usa il programma parametrico quando prendi i materiali da Hich-CAM.'));
      const file = el('input', { type: 'file', accept: '.json,.txt,application/json,text/plain', id: 'f-file', style: 'display:none' });
      const pan = el('div', { class: 'pannello' }), esito = el('div');
      m.append(file, el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', html: A.icona('salvati') + 'Scegli un file', onclick: () => { if (A.ANDROID && A.ANDROID.scegliFile) A.ANDROID.scegliFile(); else file.click(); } })]), pan, esito);
      let letti = null;
      const prova = () => {
        esito.innerHTML = ''; letti = null;
        if (!String(v.testo).trim()) return;
        const r = O.leggiMateriali(v.testo);
        if (r.errore) { esito.appendChild(el('p', { class: 'errore', testo: r.errore })); return; }
        letti = r.materiali;
        esito.appendChild(A.info('<b>' + letti.length + ' materiali</b>: ' + letti.map(x => A.esc(x.n)).join(', ') + '.'));
        const ese = letti.slice(0, 6).map(x => '<tr><td>' + A.esc(x.n) + '</td><td>' + x.vc + '</td><td>' + x.dvc + '</td><td>' + (x.ivc || '—') + '</td><td>' + x.tvc + '</td></tr>').join('');
        esito.appendChild(el('div', { class: 'pannello', style: 'padding:4px 8px;margin-top:10px', html: '<div class="scorri"><table><tr><th>Materiale</th><th>Fresa</th><th>Punta</th><th>Inserti</th><th>Maschio</th></tr>' + ese + '</table></div>' }));
        esito.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('materiale') + 'Usa questi materiali', onclick: () => {
          A.mem.materiali = letti; A.salva(); A.avviso(letti.length + ' materiali presi'); A.vai('materiali');
        } })]));
        esito.appendChild(A.info('I materiali di adesso vengono sostituiti. Tornitura e densita, se mancano, restano quelle di serie.'));
      };
      const f = A.modulo(pan, [{ id: 'testo', et: 'Testo JSON dei materiali', tipo: 'area', mono: true, righe: 8 }], v, prova);
      window.__fileScelto = testo => { f.metti('testo', String(testo || '')); prova(); };
      file.addEventListener('change', () => {
        const x = file.files && file.files[0]; if (!x) return;
        const rd = new FileReader();
        rd.onload = () => { f.metti('testo', String(rd.result || '')); prova(); };
        rd.readAsText(x);
      });
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
        if (s.ftpChiedi) s.ftpPassword = '';   // chiesta a ogni invio: non si tiene
        A.mem.imp = s; A.salva();
        if (id === 'tema' || id === 'guanti' || id === 'contrasto' || id === 'sfondo') A.applicaTema();
      };
      const blocco = (tit, campi) => { m.appendChild(el('div', { class: 'sez', testo: tit })); const p = el('div', { class: 'pannello' }); m.appendChild(p); A.modulo(p, campi, v, salva); };
      blocco('Aspetto', [{ id: 'tema', et: 'Tema', tipo: 'scelta', scelte: [['scuro', 'Scuro'], ['chiaro', 'Chiaro'], ['auto', 'Come il telefono']] }, { id: 'vibra', et: 'Vibrazione sui tasti e sugli avvisi', tipo: 'spunta' },
        { id: 'sfondo', et: 'Sfondo con immagine (solo tema scuro)', tipo: 'spunta' }, { id: 'guanti', et: 'Modalita guanti: testi e pulsanti piu grandi', tipo: 'spunta' }, { id: 'contrasto', et: 'Contrasto alto (officine luminose)', tipo: 'spunta' }, { id: 'tastierino', et: 'Tastierino numerico grande dell\'app (invece della tastiera del telefono)', tipo: 'spunta' }]);
      blocco('Fresatrice', [{ id: 'nmaxFresa', et: 'Giri massimi mandrino', u: 'giri/min' }, { id: 'zSic', et: 'Z di sicurezza', u: 'mm' }, { id: 'zR', et: 'Piano R dei cicli', u: 'mm' },
        { id: 'fineZ', et: 'Z a fine programma', sub: 'vuoto = Z di sicurezza', u: 'mm' }, { id: 'g43', et: 'Correzione lunghezza G43 H', tipo: 'spunta' }]);
      blocco('Tornio', [{ id: 'nmaxTornio', et: 'Giri massimi mandrino', u: 'giri/min' }, { id: 'codLimite', et: 'Limite giri', tipo: 'scelta', scelte: [['G50', 'G50 S...'], ['G92', 'G92 S...']] },
        { id: 'codFiletto', et: 'Filettatura', tipo: 'scelta', scelte: [['G32', 'G32'], ['G33', 'G33']] }, { id: 'xCambio', et: 'X cambio utensile', sub: 'vuoto = grezzo + 22', u: 'mm' },
        { id: 'zCambio', et: 'Z cambio utensile', u: 'mm' }]);
      blocco('Programmi', [{ id: 'numProg', et: 'Numero programma di partenza', u: 'O' }, { id: 'costoOra', et: 'Costo orario della macchina', sub: 'per la stima del costo del pezzo', u: '€/h' }, { id: 'refrig', et: 'Refrigerante M8', tipo: 'spunta' }, { id: 'numerare', et: 'Numeri di riga N10, N20...', tipo: 'spunta' }, { id: 'promemoriaCopia', et: 'Promemoria della copia di sicurezza ogni settimana', tipo: 'spunta' }]);
      blocco('Linguaggio della macchina (post-processor)', [
        { id: 'postFresa', et: 'Fresa', tipo: 'scelta', scelte: Object.keys(O.LINGUAGGI).filter(k => O.LINGUAGGI[k].fresa).map(k => [k, O.LINGUAGGI[k].nome]) },
        { id: 'postTornio', et: 'Tornio', tipo: 'scelta', scelte: Object.keys(O.LINGUAGGI).filter(k => O.LINGUAGGI[k].tornio).map(k => [k, O.LINGUAGGI[k].nome]) }]);
      m.appendChild(A.info('Il programma nasce in ISO e si traduce nel linguaggio scelto; nel listato si puo cambiare al volo. Provalo sempre a vuoto la prima volta.'));
      blocco('Macchina in rete (FTP)', [{ id: 'ftpHost', et: 'Indirizzo della macchina', sub: 'es. 192.168.1.50', tipo: 'testo' }, { id: 'ftpPorta', et: 'Porta', v: 21 },
        { id: 'ftpUtente', et: 'Utente', tipo: 'testo' }, { id: 'ftpChiedi', et: 'Chiedi la password a ogni invio (consigliato)', tipo: 'spunta' },
        { id: 'ftpPassword', et: 'Password', sub: 'resta scritta su questo telefono, non va nelle copie', tipo: 'testo', se: q => !q.ftpChiedi },
        { id: 'ftpCartella', et: 'Cartella sulla macchina', sub: 'vuoto = quella di partenza', tipo: 'testo' },
        { id: 'nomeFtp', et: 'Nome del file', tipo: 'scelta', scelte: [['O0001.nc', 'O0001.nc'], ['O0001.NC', 'O0001.NC'], ['O0001', 'O0001 senza estensione']] }]);
      m.appendChild(A.info('L\'invio diretto funziona dall\'app Android (APK) quando il telefono e nella stessa rete della macchina. Per una cartella condivisa usa "Salva in..." nel programma.'));
      m.appendChild(el('div', { class: 'sez', testo: 'Copia di sicurezza' }));
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul', html: A.icona('condividi') + 'Fai la copia', onclick: () => A.copiaSicurezza() }),
        el('button', { class: 'pul sec', html: A.icona('salvati') + 'Ripristina', onclick: () => A.ripristina() })]));
      m.appendChild(A.info('La copia contiene programmi, macro, pezzi con foto, utensili, materiali e impostazioni. Mandala su Drive o per posta con Condividi.'));
      m.appendChild(el('div', { class: 'sez', testo: 'Dati' }));
      m.appendChild(el('div', { class: 'menu' }, [A.voceMenu(['materiali', 'materiale', 'Materiali', 'Modifica velocita di taglio e avanzamenti']), A.voceMenu(['scambio', 'salva', 'Esporta e importa', 'Utensili, macro e materiali (anche per Hich-CAM)']), A.voceMenu(['note', 'info', 'Note legali e privacy', 'Uso, responsabilita e dati']),
        el('button', { class: 'voce', id: 'segnala', onclick: () => { location.href = A.mailSegnalazione(); } }, [el('span', { class: 'ic', html: A.icona('avviso') }), el('span', { class: 't' }, [el('b', { testo: 'Segnala un problema' }), el('small', { testo: 'Scrivi cosa non va: l\'email parte con versione e schermata' })]), el('span', { html: A.icona('avanti', 'freccia') })])]));
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', html: A.icona('salva') + 'Esporta i miei dati', onclick: () => A.condividi('hich-officina-dati.json', JSON.stringify(A.mem, null, 1)) })]));
      m.appendChild(A.info('Hich-Officina ' + A.VERSIONE + ' · funziona anche senza rete. I dati restano su questo telefono. I valori di taglio sono di partenza: controlla sempre i programmi prima di lavorare.'));
    }
  };
  try { TAB.codici(); } catch (e) { /* niente */ }
})();
