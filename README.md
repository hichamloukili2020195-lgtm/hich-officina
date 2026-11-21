# Hich-Officina

App per telefono Android (e per qualsiasi browser) per fresatori e tornitori. Funziona anche senza rete e non usa
librerie esterne: sono solo file HTML, CSS e JavaScript.

Sito: https://hichamloukili2020195-lgtm.github.io/hich-officina/

## Cosa fa
- **Nuovo programma ISO** con anteprima del percorso:
  - fresatura: spianatura, contornatura esterna con finitura, tasca rettangolare con discesa a rampa;
  - foratura: centrino, punta in metallo duro, punta a inserti, alesatore, bareno, maschio, lamatore; fori su
    circonferenza, a griglia o da elenco; ciclo automatico (G81, G82, G83, G84, G85) o scelto a mano;
  - tornitura: sgrossatura esterna e interna con finitura e smusso, sfacciatura, gola, foratura in asse,
    filetto esterno e interno.
  Il listato si copia, si condivide, si salva come `.nc` o si tiene in **Programmi salvati**.
- **Calcolatrice di taglio**: fresatura, tornitura, foratura, maschiatura, filettatura al tornio, cono, fori su
  cerchio, peso del grezzo, triangolo rettangolo, rugosita e avanzamento, pollici e millimetri.
- **Utensili e dati di taglio**: giri e avanzamenti per ogni tipo di utensile nel materiale scelto.
- **Tolleranze e accoppiamenti** ISO 286 con disegno delle zone.
- **Macro CNC**: modelli pronti (foratura profonda, tasca circolare, centraggio, cambio utensile, pausa ogni N pezzi,
  scanalatura) e macro personali con parametri. Chiamata `G65 P....` con argomenti a lettere (A = #1, B = #2, ...).
- **Galleria esempi**, **Tabelle** (filetti, tolleranze, rugosita, pollici, codici G e M), **Preferiti**,
  **Impostazioni** (tema, giri massimi, quote di sicurezza, codici del tornio, numeri di riga).
- **Materiali**: gli stessi del programma parametrico, con gli stessi valori e le stesse regole (in officina solo
  metallo duro: le Vc si usano cosi come sono). Tornitura e densita sono aggiunte qui. Si possono modificare
  oppure **importare** la propria tabella: in Hich-CAM, Libreria materiali, pulsante JSON, si copia il testo e lo si
  incolla (o si sceglie il file) in Materiali > Importa la mia tabella materiali.

I dati di taglio sono **di partenza**. Ogni programma va controllato prima di lavorare (simulazione, prova a vuoto).

## Installarla sul telefono
Apri il sito con il browser del telefono e scegli **Installa app** (o **Aggiungi a schermata Home**) dal menu.
Dopo la prima apertura funziona anche senza rete.

## Prove
- `node prove/prove.js`: calcoli, materiali, dati di taglio, programmi di fresa e tornio, macro.
- `node prove/ui.js [cartella-schermate]`: tutte le schermate in un browser a misura di telefono (serve Playwright).

## Aggiornare
Dopo ogni modifica cambia `VERSIONE` in `sw.js`, cosi i telefoni scaricano i file nuovi.

## File
- `calcoli.js`: formule, materiali, dati di taglio, tolleranze, programmi del tornio.
- `programmi.js`: programmi della fresatrice, schemi dei fori, macro.
- `app.js`: base dell'interfaccia (schermate, memoria, moduli). `schermi_*.js`: le schermate. `stile.css`: aspetto.
- `sw.js`: funzionamento senza rete. `manifest.webmanifest`: installazione.
