// ===== Hich-Officina: ciclo di lavoro proposto (albero da tornio o piastra da fresa) e quote lette dal disegno =====
(function () {
  'use strict';
  const A = window.App, O = A.O, el = A.el, fmt = A.fmt, esc = A.esc;
  const sezione = () => {
    const S = A.sezione('ciclo');
    S.tab = S.tab || 'albero';
    S.albero = S.albero || { mat: '4', dg: '40', lg: '100', smusso: '0.5', metodo: 'passate', troncatura: true, fd: '', fprof: '', tratti: [{ d: '20', l: '25', toll: '', passo: '2.5' }, { d: '30', l: '20', toll: 'h6', passo: '' }, { d: '36', l: '15', toll: '', passo: '' }] };
    S.piastra = S.piastra || { mat: '0', gx: '105', gy: '85', gz: '22', fx: '100', fy: '80', fz: '20', tasche: [{ tipo: 'rett', cx: '50', cy: '40', lx: '40', ly: '30', dt: '', prof: '8', r: '6' }],
      fori: [{ tipo: 'maschio', d: '8', passo: '1.25', prof: '', passante: true, toll: '', schema: 'griglia', x0: '10', y0: '10', nx: '2', ny: '2', px: '80', py: '60', cx: '', cy: '', dc: '', nf: '', a: '0', testo: '' }] };
    return S;
  };

  /** Una lista di elementi modificabili, ognuno con i suoi campi e il pulsante per toglierlo. */
  function lista(box, arr, titolo, campi, nuovo, alCambio) {
    const disegna = () => {
      box.innerHTML = '';
      arr.forEach((it, i) => {
        const pan = el('div', { class: 'pannello' });
        box.appendChild(el('div', { class: 'riga-titolo' }, [el('div', { class: 'sez', style: 'margin:10px 2px 4px', testo: titolo + ' ' + (i + 1) }),
          el('button', { class: 'icona-pul', 'aria-label': 'Togli ' + titolo + ' ' + (i + 1), html: A.icona('cestino'), onclick: () => { arr.splice(i, 1); A.salva(); disegna(); alCambio(); } })]));
        box.appendChild(pan);
        const f = A.modulo(pan, campi(it), it, () => { f.aggiorna(); alCambio(); });
        // gli id dei campi devono essere unici nella pagina
        pan.querySelectorAll('[id^="f-"]').forEach(e => { const id = e.id + '-' + titolo.replace(/\W/g, '') + i; const lb = pan.querySelector('label[for="' + e.id + '"]'); if (lb) lb.setAttribute('for', id); e.id = id; });
      });
      box.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', html: A.icona('piu') + 'Aggiungi ' + titolo.toLowerCase(), onclick: () => { arr.push(nuovo()); A.salva(); disegna(); alCambio(); } })]));
    };
    disegna();
    return disegna;
  }

  A.schermi.ciclo = {
    titolo: 'Ciclo di lavoro proposto',
    render(m) {
      const S = sezione();
      const schede = el('div', { class: 'schede' });
      [['albero', 'Albero (tornio)'], ['piastra', 'Piastra (fresa)']].forEach(([id, t]) => schede.appendChild(el('button', { 'data-id': id, testo: t, onclick: () => { S.tab = id; A.salva(); A.ridisegna(); } })));
      schede.querySelectorAll('button').forEach(b => b.classList.toggle('attiva', b.dataset.id === S.tab));
      m.appendChild(schede);
      // ----- quote dal disegno -----
      const quoteBox = el('div');
      let ultimoCampo = null;
      m.addEventListener('focusin', e => { if (e.target && e.target.matches && e.target.matches('input')) ultimoCampo = e.target; });
      const mostraQuote = testo => {
        const Q = O.estraiQuote(testo);
        S.quote = Q; A.salva();
        disegnaQuote();
      };
      const disegnaQuote = () => {
        quoteBox.innerHTML = '';
        const Q = S.quote || [];
        if (!Q.length) return;
        quoteBox.appendChild(A.info('<b>' + Q.length + ' quote lette.</b> Tocca un campo e poi una quota per scriverla li; senza un campo scelto, un Ø aggiunge un diametro (albero) e i fori aggiungono un gruppo di fori (piastra).'));
        const chips = el('div', { class: 'chips quote' });
        Q.forEach(q => chips.appendChild(el('button', { class: 'chip quota-' + q.tipo, testo: q.testo, onclick: () => usaQuota(q) })));
        quoteBox.appendChild(chips);
      };
      const usaQuota = q => {
        const scrivi = (inp, v) => { inp.value = String(v); inp.dispatchEvent(new Event('input', { bubbles: true })); };
        if (ultimoCampo && document.body.contains(ultimoCampo)) {
          const v = q.tipo === 'tolleranza' ? q.valore : q.tipo === 'diametro' ? q.valore : q.tipo === 'filetto' ? q.d : q.tipo === 'fori' ? (q.d || (q.filetto && q.filetto.d)) : q.valore;
          scrivi(ultimoCampo, v);
          A.avviso(q.testo + ' scritto nel campo');
          return;
        }
        const P = S[S.tab];
        if (S.tab === 'albero' && (q.tipo === 'diametro' || q.tipo === 'filetto')) { P.tratti.push({ d: String(q.d || q.valore), l: '', toll: q.toll || '', passo: q.tipo === 'filetto' ? String(q.p) : '' }); A.salva(); A.ridisegna(); A.avviso('Diametro aggiunto: scrivi la lunghezza'); return; }
        if (S.tab === 'piastra' && q.tipo === 'fori') {
          P.fori.push({ tipo: q.filetto ? 'maschio' : q.toll ? 'alesato' : 'foro', d: String(q.filetto ? q.filetto.d : q.d), passo: q.filetto ? String(q.filetto.p) : '', prof: '', passante: true, toll: q.toll || '', schema: 'cerchio', cx: '', cy: '', dc: '', nf: String(q.n), a: '0', x0: '', y0: '', nx: '', ny: '', px: '', py: '', testo: '' });
          A.salva(); A.ridisegna(); A.avviso('Gruppo di fori aggiunto: scrivi dove sono'); return;
        }
        A.avviso('Tocca prima il campo dove scrivere ' + q.testo);
      };
      const foto = el('button', { class: 'pul sec', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>Quote da una foto del disegno', onclick: () => {
        if (!A.ANDROID || !A.ANDROID.leggiFoto) { A.avviso('La lettura delle foto funziona nell\'app Android (APK). Qui puoi incollare il testo delle quote.'); incolla.hidden = false; return; }
        window.__fotoLetta = (testo, errore) => { if (errore || !testo) { A.avviso(errore || 'Nella foto non ho trovato testo'); return; } mostraQuote(testo); };
        A.ANDROID.leggiFoto();
      } });
      const incolla = el('div', { hidden: true });
      const vIn = { testo: '' };
      A.modulo(incolla, [{ id: 'quoteTesto', et: 'Testo con le quote (es. Ø20h6 M20x1,5 4xØ8,5 1x45°)', tipo: 'area', righe: 3 }], vIn, () => {});
      incolla.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', testo: 'Leggi le quote', onclick: () => mostraQuote(vIn.quoteTesto || '') })]));
      m.append(el('div', { class: 'pulsanti' }, [foto, el('button', { class: 'pul sec', testo: 'Incolla il testo', onclick: () => { incolla.hidden = !incolla.hidden; } })]), incolla, quoteBox);
      disegnaQuote();

      // ----- il pezzo -----
      const P = S[S.tab];
      const pan = el('div', { class: 'pannello' });
      const corpo = el('div');
      m.append(el('div', { class: 'sez', testo: 'Pezzo' }), pan, corpo);
      const esito = el('div');
      const cambiato = () => { A.salva(); esito.innerHTML = ''; };
      if (S.tab === 'albero') {
        A.modulo(pan, [{ id: 'mat', et: 'Materiale', tipo: 'scelta', scelte: () => A.sceltaMateriali() }, { id: 'dg', et: 'Diametro del grezzo', u: 'mm' }, { id: 'lg', et: 'Lunghezza del grezzo', u: 'mm' },
          { id: 'smusso', et: 'Smussi sugli spigoli', u: 'mm' }, { id: 'metodo', et: 'Come', tipo: 'scelta', scelte: [['passate', 'Passate scritte una per una'], ['ciclo', 'Cicli fissi della macchina']] },
          { id: 'fd', et: 'Foro in asse: diametro', sub: 'vuoto = niente foro', u: 'mm' }, { id: 'fprof', et: 'Foro in asse: profondita', u: 'mm' },
          { id: 'troncatura', et: 'Tronca il pezzo alla fine', tipo: 'spunta' }], P, cambiato);
        const box = el('div');
        corpo.append(el('div', { class: 'sez', testo: 'Diametri dalla testa verso il mandrino' }), box);
        lista(box, P.tratti, 'Diametro', () => [{ id: 'd', et: 'Diametro', u: 'mm' }, { id: 'l', et: 'Lunghezza', u: 'mm' },
          { id: 'toll', et: 'Tolleranza', sub: 'es. h6 o ±0,02', tipo: 'testo' }, { id: 'passo', et: 'Filetto: passo', sub: 'vuoto = liscio', u: 'mm' }], () => ({ d: '', l: '', toll: '', passo: '' }), cambiato);
      } else {
        A.modulo(pan, [{ id: 'mat', et: 'Materiale', tipo: 'scelta', scelte: () => A.sceltaMateriali() },
          { id: 'gx', et: 'Grezzo X', u: 'mm' }, { id: 'gy', et: 'Grezzo Y', u: 'mm' }, { id: 'gz', et: 'Grezzo spessore', u: 'mm' },
          { id: 'fx', et: 'Finito X', u: 'mm' }, { id: 'fy', et: 'Finito Y', u: 'mm' }, { id: 'fz', et: 'Finito spessore', u: 'mm' }], P, cambiato);
        const boxF = el('div'), boxT = el('div');
        corpo.append(el('div', { class: 'sez', testo: 'Fori (origine nello spigolo in basso a sinistra, Z0 sopra)' }), boxF, el('div', { class: 'sez', testo: 'Tasche' }), boxT);
        const ser = x => x.schema === 'cerchio', gri = x => x.schema === 'griglia', ele = x => x.schema === 'elenco';
        lista(boxF, P.fori, 'Fori', () => [{ id: 'tipo', et: 'Tipo', tipo: 'scelta', scelte: [['foro', 'Foro'], ['maschio', 'Filettato'], ['alesato', 'Alesato (tolleranza)']] },
          { id: 'd', et: 'Diametro (nominale per il filetto)', u: 'mm' }, { id: 'passo', et: 'Passo', u: 'mm', se: x => x.tipo === 'maschio' }, { id: 'toll', et: 'Tolleranza', tipo: 'testo', se: x => x.tipo === 'alesato' },
          { id: 'passante', et: 'Passante', tipo: 'spunta' }, { id: 'prof', et: 'Profondita', u: 'mm', se: x => !x.passante },
          { id: 'schema', et: 'Posizione', tipo: 'scelta', scelte: [['cerchio', 'Su circonferenza'], ['griglia', 'A griglia'], ['elenco', 'Elenco X Y']] },
          { id: 'cx', et: 'Centro X', u: 'mm', se: ser }, { id: 'cy', et: 'Centro Y', u: 'mm', se: ser }, { id: 'dc', et: 'Diametro circonferenza', u: 'mm', se: ser }, { id: 'nf', et: 'Numero fori', se: ser }, { id: 'a', et: 'Angolo primo foro', u: '°', se: ser },
          { id: 'x0', et: 'Primo foro X', u: 'mm', se: gri }, { id: 'y0', et: 'Primo foro Y', u: 'mm', se: gri }, { id: 'nx', et: 'Fori in X', se: gri }, { id: 'ny', et: 'Fori in Y', se: gri }, { id: 'px', et: 'Passo X', u: 'mm', se: gri }, { id: 'py', et: 'Passo Y', u: 'mm', se: gri },
          { id: 'testo', et: 'Coordinate X Y, una per riga', tipo: 'area', mono: true, se: ele }],
          () => ({ tipo: 'foro', d: '', passo: '', prof: '', passante: true, toll: '', schema: 'elenco', testo: '', cx: '', cy: '', dc: '', nf: '', a: '0', x0: '', y0: '', nx: '', ny: '', px: '', py: '' }), cambiato);
        lista(boxT, P.tasche, 'Tasca', () => [{ id: 'tipo', et: 'Tipo', tipo: 'scelta', scelte: [['rett', 'Rettangolare'], ['circ', 'Circolare']] },
          { id: 'cx', et: 'Centro X', u: 'mm' }, { id: 'cy', et: 'Centro Y', u: 'mm' }, { id: 'lx', et: 'Lunghezza X', u: 'mm', se: x => x.tipo !== 'circ' }, { id: 'ly', et: 'Larghezza Y', u: 'mm', se: x => x.tipo !== 'circ' },
          { id: 'r', et: 'Raggio negli angoli', u: 'mm', se: x => x.tipo !== 'circ' }, { id: 'dt', et: 'Diametro', u: 'mm', se: x => x.tipo === 'circ' }, { id: 'prof', et: 'Profondita', u: 'mm' }],
          () => ({ tipo: 'rett', cx: '', cy: '', lx: '', ly: '', r: '', dt: '', prof: '' }), cambiato);
      }
      // ----- proposta -----
      const proponi = el('button', { class: 'pul', html: A.icona('tabella') + 'Proponi il ciclo' });
      m.append(el('div', { class: 'pulsanti' }, [proponi]), esito);
      proponi.addEventListener('click', () => {
        const I = A.imp(), mt = A.materiale(P.mat || 0), tab = A.tabellaUt ? A.tabellaUt() : [];
        let pr;
        if (S.tab === 'albero') pr = O.pianificaAlbero({ dg: P.dg, lg: P.lg, smusso: O.num(P.smusso) || 0, tratti: P.tratti, foro: { d: O.num(P.fd), prof: O.num(P.fprof) }, troncatura: P.troncatura },
          { mat: mt, tab, nmax: I.nmaxTornio, metodo: P.metodo, codLimite: I.codLimite, codFiletto: I.codFiletto, refrig: I.refrig });
        else pr = O.pianificaPiastra({ gx: P.gx, gy: P.gy, gz: P.gz, fx: P.fx, fy: P.fy, fz: P.fz, tasche: P.tasche, fori: P.fori.map(f => Object.assign({}, f, { prof: O.num(f.prof) })) },
          { mat: mt, tab, nmax: I.nmaxFresa, zSic: I.zSic, zR: I.zR, refrig: I.refrig, g43: I.g43 });
        esito.innerHTML = '';
        if (pr.errore) { esito.appendChild(el('p', { class: 'errore', testo: pr.errore })); return; }
        const comuni = { num: I.numProg, nome: S.tab === 'albero' ? 'ALBERO' : 'PIASTRA', numerare: I.numerare };
        const r = S.tab === 'albero' ? O.gcodeSequenzaTornio(pr.fasi, comuni) : O.gcodeSequenza(pr.fasi, comuni);
        if (r.errore) { esito.appendChild(el('p', { class: 'errore', testo: r.errore })); return; }
        const ctl = O.controllaISO(r.righe.join('\n'), { modo: pr.modo });
        const cv = el('canvas', { class: 'vista', 'aria-label': 'Anteprima del ciclo' });
        esito.appendChild(el('div', { class: 'sez', testo: 'Ciclo proposto: ' + pr.fasi.length + ' lavorazioni, ' + new Set(pr.fasi.map(f => f.c.t)).size + ' utensili, circa ' + fmt(ctl.tempo, 1) + ' min' }));
        esito.appendChild(cv);
        const L = el('div', { class: 'elenco' });
        pr.fasi.forEach((f, i) => {
          const giri = f.c.n || f.c.giri || (f.c.vc ? Math.round(1000 * f.c.vc / (Math.PI * (f.c.dg || f.c.d || 10))) : 0);
          L.appendChild(el('div', { class: 'elem fase' }, [el('span', { class: 'ic', testo: String(i + 1) }), el('span', { class: 't' }, [el('b', { testo: f.titolo }),
            el('small', { testo: pr.modo === 'tornio' ? [f.c.vc ? 'Vc ' + fmt(f.c.vc, 0) : '', f.op === 'filetto' ? 'passo ' + fmt(f.c.p, 2) : f.c.f ? 'F' + fmt(f.c.f, 3) + ' mm/giro' : ''].filter(Boolean).join(' · ') : 'S' + fmt(giri, 0) + ' · F' + fmt(f.c.f, 0) })])]));
        });
        esito.appendChild(L);
        if (pr.note.length) esito.appendChild(A.info(esc(pr.note.join(' ')), 'avviso'));
        const nErr = ctl.segnalazioni.filter(x => x.livello === 'errore').length;
        esito.appendChild(A.info(nErr ? '<b>Il controllo trova ' + nErr + ' errori: guardali nel listato.</b>' : 'Controllo del programma: nessun errore.' + ' I dati vengono dai materiali e dalla tabella utensili: controlla utensili, origini e staffaggio prima di lavorare.', nErr ? 'avviso' : null));
        if (pr.modo === 'tornio') A.disegnaTornio(cv, r, { dg: O.num(P.dg) }, 0); else A.disegnaIso(cv, Object.assign({}, r, { pezzo: { x0: 0, y0: 0, x1: O.num(P.fx), y1: O.num(P.fy), z0: -O.num(P.fz), z1: 0 } }));
        const apri = () => { A.param.listato = { righe: r.righe, iso: r.righe.slice(), nome: (r.righe[1] || 'O0001').split(' ')[0], tipo: pr.modo, avvisi: pr.note }; A.vai('listato'); };
        const pulsanti = [el('button', { class: 'pul', html: A.icona('codice') + 'Crea il programma', onclick: apri })];
        if (pr.modo === 'fresa') pulsanti.push(el('button', { class: 'pul sec', html: A.icona('modifica') + 'Modifica in Sequenza', onclick: () => { const Pg = A.sezione('programma'); Pg.fasi = JSON.parse(JSON.stringify(pr.fasi)); Pg.tab = 'seq'; A.salva(); A.vai('programma'); } }));
        esito.appendChild(el('div', { class: 'pulsanti' }, pulsanti));
        esito.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', html: A.icona('galleria') + 'Crea il pezzo con le misure da controllare', onclick: () => {
          const L2 = { righe: r.righe, nome: (r.righe[1] || 'O0001').split(' ')[0], tipo: pr.modo, iso: r.righe.slice() };
          A.salvaInArchivio(L2);
          const pz = { id: 'p' + Date.now(), nome: (S.tab === 'albero' ? 'Albero ' : 'Piastra ') + new Date().toLocaleDateString('it-IT'), disegno: '', materiale: mt ? mt.n : '',
            grezzo: S.tab === 'albero' ? 'D' + P.dg + ' x ' + P.lg : P.gx + ' x ' + P.gy + ' x ' + P.gz, origine: S.tab === 'albero' ? 'Z0 sulla faccia in testa' : 'G54: spigolo in basso a sinistra, Z0 sopra il finito',
            fissaggio: '', note: pr.note.join('\n'), programmi: [L2.idSalvato], foto: [], misure: pr.misure, controlli: [], data: new Date().toISOString().slice(0, 10) };
          (A.mem.pezzi = A.mem.pezzi || []).unshift(pz); A.salva(); A.param.pezzo = pz.id; A.vai('pezzo');
        } })]));
      });
    }
  };
})();
