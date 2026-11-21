# Hich-Officina

App per telefono Android (e per qualsiasi browser) per fresatori e tornitori. Funziona anche senza rete e non usa
librerie esterne: sono solo file HTML, CSS e JavaScript.

Il sito si pubblica da solo dal ramo `main` (pagine del repository).

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
  scanalatura, misura con tastatore, pezzi in serie con contatore, griglia di pezzi su piu origini) e macro personali
  con parametri, da simulare con i valori scritti. Chiamata `G65 P....` con argomenti a lettere (A = #1, B = #2, ...).
- **Apri e simula un programma**: un programma ISO incollato o da file (anche fatto da altri) diventa un percorso con
  simulazione animata passo per passo (3D, dall'alto, di fronte, sezione del tornio), quote massime di lavoro,
  utensili con giri e avanzamenti, tempo stimato. Legge anche le macro (variabili, IF, WHILE, G65, M98).
- **Listato**: ricerca, modifica, simulazione, file `.nc`, "Salva in..." (anche cartelle offerte da altre app),
  **invio alla macchina via FTP** (solo nell'APK), foglio di attrezzaggio.
- **Post-processor**: il programma nasce in ISO e si traduce nel linguaggio della macchina (Impostazioni, o al volo nel
  listato): ISO con codici G e M; ISO con cicli a nome (CYCLE81..., MCALL, LIMS, G33 K) per fresa e tornio; dialogo a
  testo con righe numerate (TOOL CALL, L, CYCL DEF con parametri Q) per la fresa. La simulazione legge sempre l'ISO.
- **Tabella utensili** personale (T, tipo, diametro, lunghezza, taglienti): si sceglie in Nuovo programma ISO.
- **Pezzi e attrezzaggio**: dati del pezzo, origine, fissaggio, programmi collegati, note, foto, misure da controllare
  con tolleranze (H7, ±0,05, +0,1 -0,05), controllo delle misure prese con storico, **foglio di attrezzaggio** da
  stampare, salvare in PDF o condividere.
- **Copia di sicurezza** di tutti i dati (foto comprese) in un file da mandare su Drive o per posta, e ripristino.
- **Galleria esempi**, **Tabelle** (filetti, tolleranze, rugosita, pollici, codici G e M), **Preferiti**,
  **Impostazioni** (tema, giri massimi, quote di sicurezza, codici del tornio, numeri di riga).
- **Materiali**: gli stessi nomi e campi del programma parametrico, con valori di partenza per utensili in metallo duro
  rivestito (fresa di sgrossatura e di finitura, punta in metallo duro, punta a inserti, alesatore, bareno, inserto da
  tornio; maschi in acciaio super rapido da polveri rivestito). Le Vc si usano cosi come sono. Si possono modificare
  oppure **importare** la propria tabella: in Hich-CAM, Libreria materiali, pulsante JSON, si copia il testo e lo si
  incolla (o si sceglie il file) in Materiali > Importa la mia tabella materiali.

I dati di taglio sono **di partenza**. Ogni programma va controllato prima di lavorare (simulazione, prova a vuoto).

## Installarla sul telefono
Apri il sito con il browser del telefono e scegli **Installa app** (o **Aggiungi a schermata Home**) dal menu.
Dopo la prima apertura funziona anche senza rete.

## APK per Android
A ogni aggiornamento di `main` il lavoro automatico "APK Android" del repository costruisce l'APK e lo mette nella
pagina di download del repository (versione "apk", file `Hich-Officina.apk`).

Sul telefono: scarica il file, aprilo e consenti l'installazione da questa fonte quando Android lo chiede. Per
aggiornare si installa sopra quello vecchio: macro, programmi e materiali restano (la chiave di firma e sempre la
stessa, in `android/firma`; serve solo a questa app).

Il progetto Android (`android/`) e una WebView che apre le stesse pagine del sito, copiate negli asset; salva i file
in Download/Hich-Officina, condivide, copia negli appunti e sceglie i file.

## Prove
- `node prove/prove.js`: calcoli, materiali, dati di taglio, programmi di fresa e tornio, macro.
- `node prove/ui.js [cartella-schermate]`: tutte le schermate in un browser a misura di telefono (serve la libreria di prova del browser gia installata).

## Aggiornare
Dopo ogni modifica cambia `VERSIONE` in `sw.js`, cosi i telefoni scaricano i file nuovi.

## File
- `calcoli.js`: formule, materiali, dati di taglio, tolleranze, programmi del tornio.
- `programmi.js`: programmi della fresatrice, schemi dei fori, macro.
- `post.js`: post-processor verso gli altri linguaggi delle macchine.
- `iso.js`: lettura ed esecuzione dei programmi ISO e delle macro (per simulazione, apertura, foglio di attrezzaggio).
- `app.js`: base dell'interfaccia (schermate, memoria, moduli). `schermi_*.js`: le schermate. `stile.css`: aspetto.
- `sw.js`: funzionamento senza rete. `manifest.webmanifest`: installazione.
