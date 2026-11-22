# Hich-Officina: regole per Claude Code

App per officina (fresa e tornio) in italiano: calcoli di taglio, programmi ISO, macro, simulazione, controllo errori,
pezzi e attrezzaggio. Sito (pagine statiche) + APK Android (WebView). Lavora in italiano: messaggi, commenti, CHANGELOG,
manuale. Rispondi in modo breve.

## Regole che non si cambiano
- **Nomi di aziende, marchi e controlli**: mai, da nessuna parte (codice, interfaccia, README, commit). **Unica eccezione**
  (decisa dall'utente): i post-processor possono dire con quali controlli sono compatibili, solo come indicazione di
  compatibilita, senza loghi e senza versioni del linguaggio.
- **Mai programmi dei clienti** nelle prove o nel materiale pubblico.
- **Niente librerie nuove senza chiedere.** Gia presente solo nell'APK: il riconoscimento del testo del telefono.
- Fasi piccole: prima gli errori, poi i miglioramenti. Ogni bug: prima la prova che lo riproduce, poi la correzione.
  Ogni funzione nuova: una prova.
- Le regole di officina (ordine delle lavorazioni, preforo, smussi, entrata e uscita perpendicolari al centro) non si
  cambiano senza chiedere.
- I dati di taglio e i programmi sono indicativi: vanno sempre controllati prima di lavorare.

## Struttura
- `calcoli.js` formule, materiali, dati di taglio, tolleranze, programmi del tornio. `programmi.js` fresa, sequenza, schemi
  dei fori, macro. `profilo.js` profili liberi. `iso.js` lettura, simulazione e controllo dei programmi ISO e delle macro.
  `post.js` linguaggi delle macchine. `ciclo.js` ciclo di lavoro proposto e quote da un disegno.
- `app.js` base dell'interfaccia (schermate a pila con `#nome`, memoria, moduli). `schermi_*.js` le schermate. `stile.css`.
- Sito: `index.html`, `guida.html`, `novita.html`, `privacy.html`, `404.html`, `sito.css` si GENERANO con `node tools/sito.js` (dati personali in `sito.json`): non si modificano a mano. L'app e `app.html`.
- `sw.js` funzionamento senza rete (cambia VERSIONE a ogni rilascio). `manifest.webmanifest`. `android/` progetto Android.
- Le schermate si registrano in `App.schermi`; i campi si costruiscono con `App.modulo`; i dati sono in `App.mem`
  (`localStorage`, chiave `hich-officina-v2`).

## Prove
- `node prove/tutte.js` (= `npm test`): sintassi, versione coerente, pagine del sito aggiornate, calcoli (`prove/prove.js`), prova a tappeto
  (`prove/tappeto.js`: migliaia di combinazioni, senza NaN e senza segnalazioni), interfaccia (`prove/ui.js`, serve il
  browser di prova gia installato: se manca viene saltata).
- Il lavoro automatico dell'APK lancia calcoli e tappeto: se falliscono non si costruisce l'APK.

## Rilascio (una fase = un rilascio)
1. Modifiche e prove verdi. Versione nuova in `app.js` (`VERSIONE`), `sw.js`, `package.json`, voce in `CHANGELOG.md`.
2. Commit su `main` con il trailer indicato dall'ambiente della sessione, push: GitHub pubblica il sito e costruisce
   l'APK (pagina di download "apk").
3. Resoconto: cosa e cambiato, cosa non e stato provato (macchina reale, telefono vero), cosa serve decidere.
