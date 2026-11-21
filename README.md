# Hich-Officina

App per telefono Android (e per qualsiasi browser) per fresatori e tornitori. Funziona anche senza rete e non usa
librerie esterne: sono solo file HTML, CSS e JavaScript.

Il sito si pubblica da solo dal ramo `main` (pagine del repository).

## Cosa fa
- **Nuovo programma ISO** con anteprima del percorso:
  - fresatura: spianatura, contornatura esterna, tasca rettangolare con rampa, **profilo libero** (rette, archi,
    raccordi, smussi) con G41/G42 e entrata/uscita, **tasca circolare** a elica, **asola**, **filetto a fresa**
    (interno ed esterno, destro, concorde);
  - foratura: centrino, punte, alesatore, bareno, maschio, lamatore, smussatore; fori su circonferenza, a griglia o da
    elenco; **Foro completo**: centrino, punta (preforo giusto), smusso, maschio o alesatore sugli stessi fori;
  - tornitura: sgrossatura esterna e interna, **profilo libero** con finitura G42, sfacciatura, gola, **troncatura**,
    foratura in asse, filetto esterno (metrico, **trapezio**, **conico**) e interno; **a passate o con i cicli fissi**
    (G71/G70, G75, G74, G76);
  - **Sequenza**: piu lavorazioni in un programma, nell'ordine di officina (spianatura, centrini, punte a inserti,
    forature, lamature, fori a fresa, alesature, smusso d'imbocco e maschiatura, smussi, profili), senza cambio per lo
    stesso utensile di seguito; un ordine impossibile (maschio prima del preforo) non si accetta.
  Il listato si copia, si condivide, si salva come `.nc` o si tiene in **Programmi salvati**.
- **Ricerca veloce dalla home**: M10 (filetto e preforo), H7 25 (tolleranza), 316 (materiale), G83 (codice), T5
  (utensile), nomi di pezzi, programmi e macro.
- **Calcolatrice di taglio**: fresatura, tornitura, foratura, maschiatura, filettatura al tornio, cono, fori su
  cerchio, peso del grezzo, triangolo rettangolo, rugosita e avanzamento, pollici e millimetri.
- **Utensili e dati di taglio**: giri e avanzamenti per ogni tipo di utensile nel materiale scelto.
- **Tolleranze e accoppiamenti** ISO 286 con disegno delle zone.
- **Macro CNC**: modelli pronti (foratura profonda, tasca circolare, centraggio, cambio utensile, pausa ogni N pezzi,
  scanalatura, misura con tastatore, pezzi in serie con contatore, griglia di pezzi su piu origini) e macro personali
  con parametri, da simulare con i valori scritti. Chiamata `G65 P....` con argomenti a lettere (A = #1, B = #2, ...).
- **Apri e simula un programma**: un programma ISO incollato o da file (anche fatto da altri) diventa un percorso con
  simulazione animata passo per passo (3D, dall'alto, di fronte, sezione del tornio), quote massime di lavoro,
  utensili con giri e avanzamenti, tempo stimato. Legge anche le macro (variabili, IF, WHILE, G65, M98) e i cicli
  del tornio G71/G70, G74, G75, G76.
- **Listato**: ricerca, modifica, simulazione, file `.nc`, "Salva in..." (anche cartelle offerte da altre app),
  **invio alla macchina via FTP** (solo nell'APK), foglio di attrezzaggio.
- **Post-processor**: il programma nasce in ISO e si traduce nel linguaggio della macchina (Impostazioni, o al volo nel
  listato). I nomi delle marche dicono solo con quali controlli e compatibile il programma:
  - ISO con codici G e M: compatibile con controlli Fanuc e simili (fresa e tornio);
  - cicli a nome (CYCLE81..., MCALL, LIMS, G33 K): compatibile con controlli Siemens Sinumerik (fresa e tornio);
  - dialogo a testo con righe numerate (TOOL CALL, L, CYCL DEF con parametri Q): compatibile con controlli Heidenhain
    (fresa).
  La simulazione legge sempre l'ISO.
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
- `programmi.js`: programmi della fresatrice, sequenza, schemi dei fori, macro.
- `profilo.js`: profili liberi (raccordi, smussi, archi), percorso con G41/G42, sgrossatura dei profili da tornio.
- `post.js`: post-processor verso gli altri linguaggi delle macchine.
- `iso.js`: lettura ed esecuzione dei programmi ISO e delle macro (per simulazione, apertura, foglio di attrezzaggio).
- `app.js`: base dell'interfaccia (schermate, memoria, moduli). `schermi_*.js`: le schermate. `stile.css`: aspetto.
- `sw.js`: funzionamento senza rete. `manifest.webmanifest`: installazione.
