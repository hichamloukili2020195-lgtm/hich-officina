# Hich-Officina

App per telefono Android (e per qualsiasi browser) per fresatori e tornitori. Funziona anche senza rete e non usa
librerie esterne: sono solo file HTML, CSS e JavaScript.

Il sito si pubblica da solo dal ramo `main` (pagine del repository). La pagina principale presenta l'app; l'app si apre da `app.html`.

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
- **Ciclo di lavoro proposto**: descrivi il pezzo a misure e l'app propone la lavorazione completa da controllare:
  - albero da tornio (diametri dalla testa con tolleranze e filetti, foro in asse, troncatura): sfacciatura, foro,
    profilo con finitura al centro della tolleranza, gole di scarico, filetti, troncatura;
  - piastra da fresa (grezzo e finito, fori lisci, filettati o alesati su cerchio, griglia o elenco, tasche):
    spianatura, centrini, preforature giuste, smussi, maschi, alesatori, fori grandi a fresa, tasche, contornatura,
    nell'ordine di officina.
  Utensili dalla tabella (se mancano, numeri proposti da controllare), dati di taglio dal materiale, controllo del
  programma; poi il programma, la Sequenza da modificare o il pezzo con le misure da controllare.
  **Quote da una foto del disegno** (nell'APK) o dal testo incollato: Ø con tolleranze, filetti, fori ripetuti
  (4xØ9, 6xM8), smussi, raggi, lunghezze diventano bottoni da toccare per riempire i campi.
- **CAD fresa** col dito (2.19.0): profili, rettangoli, cerchi, fori e asole; a ognuno la sua lavorazione (contorno, tasca
  anche libera, foro, maschio, alesatura, asola); il programma esce nell'ordine di officina e si simula. Mirino sopra il dito,
  aggancio, frecce di precisione, due dita zoom, un tocco con due dita annulla, tre ripete; schermo intero e rotazione.
- **Tabella filetti**: metrico, fine, UNC/UNF/UNEF, NPT, gas G e R/Rc, Whitworth, trapezio, ACME, Pg.
- **Disegna un profilo (tornio)** col dito: a punti o a mano libera (il tratto diventa rette), aggancio alla griglia e
  alle rette orizzontali e verticali, punti da trascinare, quote, raccordi e smussi da scrivere, **vista 3D del pezzo
  tornito** da girare col dito; poi diventa il profilo libero di Nuovo programma ISO. **Zoom con due dita** (e
  rotella, pulsanti + e -, Adatta), griglia che segue lo zoom, quote Ø e lunghezze sul disegno, quote vive mentre si
  trascina; tocco su un tratto per mettere un punto in mezzo; **smussi e raggi con un tocco** sul punto scelto o su
  tutti gli spigoli; **punto con le quote**: avanti di una lunghezza, spallamento fino a un Ø, cono con lunghezza e
  semiangolo, quote esatte. Dalla 2.12.0 il disegno ragiona a **linee**: tocchi una linea e la elimini (un cilindro
  tolto fa accostare il resto), le cambi Ø e lunghezza (il resto si sposta), la dividi, la fai diventare arco; l'elenco
  delle linee in parole ("Cilindro Ø20 lungo 25", "Cono da Ø30 a Ø38") con la ✕; le linee nuove con i bottoni
  Cilindro, Spallamento, Cono, Arco (bombato o incavato), Punto a quote; Annulla e Ripeti.
  Su un cilindro scelto si mettono le **lavorazioni**: filetto (passi della tabella), gola di scarico alla fine,
  tolleranza; "Crea il programma" fa profilo, gole e filetti in un programma solo.
- **Simulazione a pannello**: quote X Y Z grandi, giri con l'indicatore, avanzamento, utensile, righe del programma che
  scorrono con la riga in lavoro; su tablet in orizzontale grafico e pannello affiancati.
- **Angolo da una foto**: sulla foto del pezzo si mettono due punti sul lato di riferimento e due sul lato inclinato
  (lente per la precisione, zoom con due dita), "Aggancia ai bordi" li porta sui bordi veri; l'app dà l'angolo e
  l'utensile: smussatore (angolo di punta), fresa a coda di rondine, fresa a V, inclinazione del pezzo, con l'angolo
  di serie piu vicino.
- **Ricerca veloce dalla home**: M10 (filetto e preforo), H7 25 (tolleranza), 316 (materiale), G83 (codice), T5
  (utensile), nomi di pezzi, programmi e macro.
- **Calcolatrice di taglio**: fresatura, tornitura, foratura, maschiatura, filettatura al tornio, cono, fori su
  cerchio, peso del grezzo, triangolo rettangolo, rugosita e avanzamento, pollici e millimetri.
- **Utensili e dati di taglio**: giri e avanzamenti per ogni tipo di utensile nel materiale scelto.
- **Tolleranze e accoppiamenti** ISO 286 con disegno delle zone.
- **Macro CNC**: modelli pronti (foratura profonda, tasca circolare, centraggio, cambio utensile, pausa ogni N pezzi,
  scanalatura, misura con tastatore, pezzi in serie con contatore, griglia di pezzi su piu origini) e macro personali
  con parametri, da simulare con i valori scritti. Chiamata `G65 P....` con argomenti a lettere (A = #1, B = #2, ...).
- **Controlla e simula un programma**: anche **da una foto** dello schermo della macchina o del computer (nell'APK:
  il testo si legge sul telefono, senza rete; le lettere lette al posto delle cifre si correggono). Il **controllo**
  segnala riga per riga: taglio senza F o con il mandrino fermo, rapidi in X Y sotto Z0, G96 senza limite dei giri,
  T senza M6, correttore H di un altro utensile, avanzamenti o quote fuori misura, parentesi aperte, cicli senza G80,
  fine programma mancante, righe che non si capiscono. Poi un programma ISO incollato o da file (anche fatto da altri) diventa un percorso con
  simulazione animata passo per passo (3D, dall'alto, di fronte, sezione del tornio), quote massime di lavoro,
  utensili con giri e avanzamenti, tempo stimato. Legge anche le macro (variabili, IF, WHILE, G65, M98) e i cicli
  del tornio G71/G70, G74, G75, G76.
- **Centro fresa** (G41/G42 calcolato con il raggio) nella simulazione; **grezzo e staffe** nel controllo: urti e tagli
  sotto il fondo del grezzo.
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

## Documentazione
- **Come si fa** nell'app (Home, Come si fa): ogni funzione in pochi passi con un esempio, stampabile in PDF.
- **Note legali e privacy** nell'app (Impostazioni).
- **Sito** (`index.html`, `guida.html`, `novita.html`, `privacy.html`): pagine generate da `node tools/sito.js` (guida, novita e privacy vengono dall'app e da `CHANGELOG.md`). Nome, email e data della privacy, indirizzo dell'APK e dominio si scrivono in `sito.json`. L'app sta in `app.html`.
- `docs/PUBBLICAZIONE.md`: i passi, da decidere, per pubblicare l'app su uno store.
- `CHANGELOG.md`: cronologia delle versioni. `CLAUDE.md`: regole di lavoro.

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

### Chiave di firma dai segreti (consigliato)
La chiave di serie sta nel repository (`android/firma`): serve solo a far funzionare gli aggiornamenti, ma chi vede il
repository potrebbe firmare un APK con la stessa firma. Per usare una chiave tua: crea un file di chiavi, convertilo in
testo con `base64` e metti nei segreti del repository `FIRMA_KEYSTORE_B64`, `FIRMA_PASSWORD` e (se serve) `FIRMA_ALIAS`.
Cambiare chiave obbliga a disinstallare l'app gia installata: prima fai la copia di sicurezza.

## Prove
- `node prove/prove.js`: calcoli, materiali, dati di taglio, programmi di fresa e tornio, macro.
- `node prove/ui.js [cartella-schermate]`: tutte le schermate in un browser a misura di telefono (serve la libreria di prova del browser gia installata).

## Aggiornare
Dopo ogni modifica cambia `VERSIONE` in `sw.js`, cosi i telefoni scaricano i file nuovi.

## File
- `calcoli.js`: formule, materiali, dati di taglio, tolleranze, programmi del tornio.
- `programmi.js`: programmi della fresatrice, sequenza, schemi dei fori, macro.
- `ciclo.js`: ciclo di lavoro proposto (albero e piastra), quote lette da un disegno, programma del tornio a piu fasi.
- `schermi_dati.js`: esporta e importa. `schermi_guida.js`: guida e note legali.
- `schermi_angolo.js`: angolo misurato su una foto e utensile.
- `schermi_disegno.js`: disegno del profilo col dito e vista 3D del pezzo tornito.
- `profilo.js`: profili liberi (raccordi, smussi, archi), percorso con G41/G42, sgrossatura dei profili da tornio.
- `post.js`: post-processor verso gli altri linguaggi delle macchine.
- `iso.js`: lettura ed esecuzione dei programmi ISO e delle macro (per simulazione, apertura, foglio di attrezzaggio).
- `app.js`: base dell'interfaccia (schermate, memoria, moduli). `schermi_*.js`: le schermate. `stile.css`: aspetto.
- `sw.js`: funzionamento senza rete. `manifest.webmanifest`: installazione.
