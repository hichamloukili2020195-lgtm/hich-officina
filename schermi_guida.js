// ===== Hich-Officina: guida "Come si fa" (stampabile in PDF) e note legali e privacy =====
(function () {
  'use strict';
  const A = window.App, el = A.el, esc = A.esc;

  const GUIDA = window.GuidaDati;

  function htmlGuida() {
    const st = 'body{font:13px/1.5 system-ui,sans-serif;color:#111;margin:18px}h1{font-size:20px}h2{font-size:15px;margin:18px 0 4px;border-bottom:2px solid #1f7aff;padding-bottom:2px}ol{margin:4px 0 4px 20px;padding:0}li{margin:2px 0}.es{background:#eef2f8;padding:6px 8px;border-radius:6px;margin:6px 0}.at{color:#9a5b00;margin:4px 0}.p{color:#555;font-size:11px}@page{margin:14mm}';
    let h = '<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Hich-Officina: come si fa</title><style>' + st + '</style></head><body><h1>Hich-Officina: come si fa</h1><div class="p">Versione ' + esc(A.VERSIONE) + '. I valori di taglio e i programmi sono di partenza: vanno sempre controllati prima di lavorare.</div>';
    GUIDA.forEach(g => {
      h += '<h2>' + esc(g.t) + '</h2><ol>' + g.passi.map(p => '<li>' + esc(p) + '</li>').join('') + '</ol>';
      if (g.esempio) h += '<div class="es"><b>Esempio:</b> ' + esc(g.esempio) + '</div>';
      if (g.attenzione) h += '<div class="at"><b>Attenzione:</b> ' + esc(g.attenzione) + '</div>';
    });
    return h + '</body></html>';
  }
  A.htmlGuida = htmlGuida; A.GUIDA = GUIDA;

  A.schermi.guida = {
    titolo: 'Come si fa',
    azioni() { return [el('button', { class: 'icona-pul', 'aria-label': 'Stampa o PDF', html: A.icona('salva'), onclick: () => A.stampa('Hich-Officina: come si fa', htmlGuida()) })]; },
    render(m) {
      m.appendChild(A.info('Ogni funzione in pochi passi, con un esempio. Il pulsante in alto stampa la guida o la salva in PDF.'));
      GUIDA.forEach(g => {
        const d = el('details', { class: 'carta-det', id: 'guida-' + g.id }, [el('summary', { testo: g.t })]);
        d.appendChild(el('ol', { class: 'guida-passi' }, g.passi.map(p => el('li', { testo: p }))));
        if (g.esempio) d.appendChild(el('div', { class: 'info' }, [el('div', { html: A.icona('info') }), el('div', { html: '<b>Esempio:</b> ' + esc(g.esempio) })]));
        if (g.attenzione) d.appendChild(A.info('<b>Attenzione:</b> ' + esc(g.attenzione), 'avviso'));
        d.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', html: A.icona('avanti') + 'Apri', onclick: () => A.vai(g.vai) })]));
        m.appendChild(d);
      });
    }
  };

  A.schermi.note = {
    titolo: 'Note legali e privacy', preferibile: false,
    render(m) {
      const blocco = (t, righe) => { m.appendChild(el('div', { class: 'sez', testo: t })); m.appendChild(el('div', { class: 'pannello pieno' }, righe.map(r => el('p', { style: 'margin:0 0 8px', html: r })))); };
      blocco('Uso e responsabilita', [
        'I <b>valori di taglio, i calcoli, i programmi generati, il controllo degli errori e la simulazione sono indicativi</b>, senza alcuna garanzia di esattezza o di adatta all\'uso.',
        'Ogni programma va controllato dall\'operatore e provato a vuoto prima di lavorare. L\'app non sostituisce il manuale della macchina, le norme di sicurezza e la formazione.',
        'La responsabilita di quello che si lavora, dei danni a macchine, utensili e pezzi e della sicurezza delle persone e di chi usa il programma.']);
      blocco('Privacy', [
        '<b>I tuoi dati restano su questo telefono</b>: programmi, macro, pezzi, foto, utensili e materiali non vengono inviati a nessun server dell\'app. Non c\'e un account e non c\'e nessun tracciamento.',
        'La rete si usa solo quando lo chiedi: l\'invio alla macchina (verso l\'indirizzo che scrivi tu) e la condivisione (verso l\'app che scegli).',
        'Le foto di programmi, disegni e pezzi si leggono sul telefono, senza rete. Le copie di sicurezza le crei e le conservi tu; non contengono la password della macchina.',
        'Cancellando i dati dell\'app o disinstallandola, i dati sul telefono si perdono: fai la copia di sicurezza.']);
      blocco('Marchi e componenti', [
        'I nomi dei controlli citati nei linguaggi macchina servono solo a indicare la compatibilita e appartengono ai rispettivi proprietari. L\'app non e prodotta, approvata o legata a quelle aziende.',
        'Nell\'app Android il riconoscimento del testo delle foto usa un componente di terzi, installato con l\'app, che lavora sul telefono.']);
      m.appendChild(el('div', { class: 'pulsanti' }, [el('button', { class: 'pul sec', html: A.icona('info') + 'Come si fa', onclick: () => A.vai('guida') })]));
    }
  };
})();
