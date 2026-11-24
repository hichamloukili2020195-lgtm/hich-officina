// ===== Hich-Officina: "Cosa fa il programma" (riassunto, lavorazioni, riga per riga) e correzioni con un tocco =====
(function () {
  'use strict';
  const A = window.App, O = A.O, el = A.el, esc = A.esc;
  const MAX_RIGHE = 1500;   // righe mostrate per blocco: oltre, il resto si legge nel listato

  /** Le righe di un blocco con la spiegazione sotto ognuna (si costruiscono quando il blocco si apre). */
  function righeBlocco(sp, r, B) {
    const box = el('div', { class: 'spiega-righe' });
    const fine = Math.min(B.a, B.da + MAX_RIGHE - 1);
    for (let i = B.da; i <= fine; i++) {
      const s = sp.righe[i];
      const testo = (r.righe[i] || '').trim();
      if (!testo && !s) continue;
      box.appendChild(el('div', { class: 'spiega-riga ' + (s ? s.tipo : '') }, [
        el('div', { class: 'spiega-cod' }, [el('span', { class: 'n', testo: String(i + 1) }), el('code', { html: A.colora ? A.colora(testo) : esc(testo) })]),
        s ? el('div', { class: 'spiega-frase', testo: s.frase }) : null]));
    }
    if (B.a > fine) box.appendChild(el('p', { class: 'nota', testo: 'Altre ' + (B.a - fine) + ' righe: leggile nel listato.' }));
    return box;
  }

  function mostraSpiegazione(m, r, testo) {
    if (!r || r.errore && !r.segmenti.length) return;
    const memo = A.param.spiegaMemo;
    const sp = memo && memo.testo === testo ? memo.sp : O.spiegaProgramma(testo, r);
    A.param.spiegaMemo = { testo, sp };
    m.appendChild(el('div', { class: 'sez', testo: 'Cosa fa il programma' }));
    m.appendChild(el('div', { class: 'pannello spiega-riass', html: '<table>' + sp.riassunto.map(x => '<tr><th>' + esc(x[0]) + '</th><td>' + esc(x[1]) + '</td></tr>').join('') + '</table>' }));
    m.appendChild(el('div', { class: 'sez', testo: 'Lavorazioni, riga per riga' }));
    sp.blocchi.forEach((B, k) => {
      const intest = (B.t != null ? 'T' + B.t + (B.commento ? ' (' + B.commento + ')' : '') + ' · ' : '') + B.titolo;
      const det = el('details', { class: 'carta-det spiega-blocco' }, [el('summary', {}, [el('b', { testo: intest }), el('span', { class: 'nota', testo: ' righe ' + (B.da + 1) + '-' + (B.a + 1) + (B.lavoroM > 0 ? ' · ' + A.fmt(B.lavoroM, 2) + ' m di lavoro' : '') + (B.zmin !== null && B.zmin < 0 ? ' · fino a Z' + A.fmt(B.zmin, 2) : '') })])]);
      let fatto = false;
      det.addEventListener('toggle', () => { if (det.open && !fatto) { fatto = true; det.appendChild(righeBlocco(sp, r, B)); } });
      if (sp.blocchi.length === 1 && k === 0) det.open = true;
      m.appendChild(det);
    });
    m.appendChild(A.info('Le frasi spiegano cosa dice ogni riga: i codici meno comuni possono voler dire altro su un controllo diverso. Controlla sempre con il manuale della macchina.', 'avviso'));
  }
  A.mostraSpiegazione = mostraSpiegazione;
})();
