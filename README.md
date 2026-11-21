# Hich-Officina

App per telefono Android (e per qualsiasi browser) per fresatori e tornitori. Funziona anche senza rete,
non usa librerie esterne: sono solo file HTML e JavaScript.

## Cosa fa
- **Calcoli**: fresatura (giri, avanzamento, truciolo), tornitura (giri con limite, Ra teorica, tempo),
  foratura, maschiatura (preforo, giri, avanzamento), filettatura al tornio (profondita e passate),
  tolleranze ISO con accoppiamento foro/albero, cono e smusso, fori su circonferenza, pollici e millimetri.
- **G-code tornio** (ISO, X in diametro, avanzamento al giro): sgrossatura esterna con finitura e smusso,
  sfacciatura, gola, filettatura esterna. Anteprima del percorso, copia e salvataggio del file `.nc`.
  Codice del limite giri (G50/G92) e della filettatura (G32/G33) a scelta.
- **Tabelle**: materiali e dati di taglio, filetti metrici (grosso e fine), tolleranze, rugosita, frazioni di pollice.

I dati di taglio sono **indicativi**. Ogni programma va controllato prima di lavorare (simulazione, prova a vuoto).

## Installarla sul telefono
1. Metti la cartella su un sito statico in https (serve https per l'installazione e per il funzionamento senza rete).
2. Apri l'indirizzo con il browser del telefono e scegli **Installa app** (o **Aggiungi a schermata Home**) dal menu.
3. L'icona compare tra le app; dopo la prima apertura funziona anche senza rete.

Per provarla sul computer: `npx serve .` oppure `python3 -m http.server` nella cartella, poi apri `http://localhost:...`.

## Prove
- `node prove/prove.js`: calcoli, tolleranze e programmi del tornio.
- `node prove/ui.js [cartella-schermate]`: interfaccia in un browser a misura di telefono (serve Playwright).

## Aggiornare
Dopo ogni modifica cambia `VERSIONE` in `sw.js`, cosi i telefoni scaricano i file nuovi.

## File
- `calcoli.js`: tutte le formule e il generatore G-code (senza interfaccia).
- `app.js`: interfaccia. `index.html`: pagina e stile. `sw.js`: funzionamento senza rete. `manifest.webmanifest`: installazione.
