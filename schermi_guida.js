// ===== Hich-Officina: guida "Come si fa" (stampabile in PDF) e note legali e privacy =====
(function () {
  'use strict';
  const A = window.App, el = A.el, esc = A.esc;

  const GUIDA = [
    { id: 'giri', t: 'Calcolare giri e avanzamenti', vai: 'calcoli',
      passi: ['Home, Calcolatrice di taglio, scheda "Per utensile".', 'Scegli il materiale, il tipo di utensile e il diametro.', 'Leggi giri al minuto, velocita di taglio, avanzamento e tutti gli utensili del materiale in tabella.'],
      esempio: 'Fresa D10 a 3 taglienti in C40: Vc 180 m/min, circa 5.730 giri/min, avanzamento 0,055 mm/dente.', attenzione: 'I valori sono di partenza: adattali a macchina, fissaggio e utensile.' },
    { id: 'programma', t: 'Fare un programma di fresa, foratura o tornio', vai: 'programma',
      passi: ['Home, Nuovo programma ISO. Scegli Fresatura, Foratura o Tornitura.', 'Scegli materiale e lavorazione, poi scrivi le misure.', 'Vc e avanzamento si riempiono dal materiale: li puoi correggere.', '"Genera programma ISO": copia, condividi, salva o simula.'],
      esempio: 'Foratura: M10x1,5 su 6 fori a cerchio D80: preforo 8,5, ciclo G84, giri e avanzamento dal materiale.', attenzione: 'Prova sempre a vuoto la prima volta.' },
    { id: 'sequenza', t: 'Piu lavorazioni in un programma', vai: 'programma',
      passi: ['In Fresatura o Foratura premi "Aggiungi alla sequenza" dopo ogni lavorazione.', '"Foro completo" aggiunge centrino, punta, smusso e maschio o alesatore.', 'Scheda Sequenza: sposta con le frecce o "Ordina come in officina".'],
      esempio: 'Spianatura, 4 fori M8 e contorno: l\'ordine di officina li mette nella sequenza giusta e non fa il cambio utensile due volte.', attenzione: 'Un maschio prima del suo preforo non viene accettato.' },
    { id: 'profilo', t: 'Disegnare un profilo da tornio', vai: 'disegno',
      passi: ['Home, Disegna un profilo. Tocca nel vuoto per i punti, a mano libera per un tratto.', 'Tocca una linea: la elimini, ne cambi Ø e lunghezza, la dividi, la fai arco.', 'Aggiungi linee con i bottoni Cilindro, Spallamento, Cono, Arco.', 'Su un cilindro: filetto, gola di scarico, tolleranza. Smussi e raggi con un tocco.', '"Crea il programma" fa sgrossatura, finitura, gole e filetti.'],
      esempio: 'Albero: Ø20 lungo 25 con filetto M20x2,5 e gola, Ø30 h6 lungo 20: il Ø30 si finisce a 29,994.', attenzione: 'Due dita per lo zoom, la lente non c\'e nel disegno: scrivi le quote nel riquadro della linea.' },
    { id: 'ciclo', t: 'Ciclo di lavoro proposto', vai: 'ciclo',
      passi: ['Home, Ciclo di lavoro proposto. Scegli Albero (tornio) o Piastra (fresa).', 'Scrivi il pezzo: grezzo, finito, diametri, fori, tasche.', '"Proponi il ciclo": lavorazioni in ordine, utensili dalla tabella, dati dal materiale.', 'Poi crea il programma, modificalo in Sequenza o crea il pezzo con le misure da controllare.'],
      esempio: 'Piastra 100x80x20: spianatura, centrini, punte 6,75 per M8, maschi, tasca e contornatura.', attenzione: 'I numeri T non trovati in tabella sono proposti: controllali.' },
    { id: 'controllo', t: 'Controllare e simulare un programma', vai: 'apri',
      passi: ['Home, Controlla e simula un programma. Incolla il testo, scegli un file o, nell\'app Android, "Leggi da una foto".', 'Controlla il testo letto dalla foto con lo schermo: una cifra sbagliata cambia la quota.', '"Controlla e simula": errori e avvisi riga per riga, quote massime, utensili, tempo.', 'Facoltativo: grezzo e staffe per gli urti; "Simula" per vedere il percorso, con il centro fresa per G41/G42.'],
      esempio: 'Rapido in X Y sotto Z0, G96 senza limite dei giri, T senza M6, taglio senza F: tutti segnalati con il numero di riga.', attenzione: 'Il controllo aiuta, non sostituisce la prova a vuoto.' },
    { id: 'angolo', t: 'Misurare un angolo da una foto', vai: 'angolo',
      passi: ['Home, Angolo da una foto. Scatta la foto del pezzo, dritta e vicina.', 'Trascina le due linee: A sul lato di riferimento, B sul lato inclinato. Usa la lente.', '"Aggancia ai bordi" porta le linee sui bordi veri della foto.', 'Leggi l\'angolo e l\'utensile: smussatore, coda di rondine, fresa a V.'],
      esempio: 'Lato a 60 gradi: smussatore con angolo di punta 60 oppure coda di rondine a 60.', attenzione: 'Precisione circa 1-2 gradi: per un angolo preciso serve il goniometro.' },
    { id: 'tolleranze', t: 'Tolleranze e controllo misure', vai: 'tolleranze',
      passi: ['Tolleranze e accoppiamenti: scegli foro e albero (o scrivi H7, g6...).', 'Scrivi la misura presa: l\'app dice se e buona o fuori e di quanto.', 'Nei Pezzi: misure da controllare con nominale e tolleranza, storico dei controlli.'],
      esempio: 'Ø25 H7 misurato 25,015: buona, 0,0045 dal centro.', attenzione: '' },
    { id: 'macro', t: 'Macro', vai: 'macro',
      passi: ['Home, Macro CNC. Scegli un modello o crea la tua con nome, numero, parametri e righe.', 'La chiamata si scrive con G65 P e le lettere dei parametri.', '"Simula con questi valori" esegue la macro e mostra percorso, allarmi e variabili.'],
      esempio: 'G65 P9001 Z-50. Q5. R2. F200. = foratura profonda a beccate da 5 fino a -50.', attenzione: 'Le variabili e i codici di tastatura dipendono dalla macchina.' },
    { id: 'pezzi', t: 'Pezzi, foto e foglio di attrezzaggio', vai: 'pezzi',
      passi: ['Pezzi e attrezzaggio, Nuovo pezzo: disegno, materiale, grezzo, origine, fissaggio, note.', 'Collega i programmi salvati, aggiungi foto e misure da controllare.', 'Foglio di attrezzaggio: stampa, PDF o condividi.'],
      esempio: '', attenzione: '' },
    { id: 'utensili', t: 'Tabella utensili e materiali', vai: 'tabellaUtensili',
      passi: ['Tabella utensili: numero T, tipo, diametro, lunghezza, taglienti.', 'Nei programmi scegli "Dalla tabella utensili": T, diametro e taglienti si riempiono.', 'Materiali: modifica i valori o importa la tua tabella (anche da Hich-CAM).'],
      esempio: '', attenzione: '' },
    { id: 'macchina', t: 'Mandare il programma alla macchina', vai: 'impostazioni',
      passi: ['Impostazioni: Macchina in rete, indirizzo, utente, cartella.', 'Nel listato premi "Invia alla macchina": la password si chiede a ogni invio.', 'Per una cartella condivisa usa "Salva in...".'],
      esempio: '', attenzione: 'L\'invio funziona dall\'app Android, con il telefono nella stessa rete della macchina.' },
    { id: 'copia', t: 'Copia di sicurezza', vai: 'impostazioni',
      passi: ['Impostazioni, Fai la copia: mandala su Drive o per posta.', 'Ripristina: scegli il file, controlla cosa contiene, conferma.', 'L\'app ti ricorda la copia ogni settimana.'],
      esempio: '', attenzione: 'Programmi, macro, pezzi e utensili stanno solo sul telefono.' }
  ];

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
