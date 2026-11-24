# Cronologia delle versioni

Hich-Officina: una voce per versione, la piu recente in alto.

## 2.29.0 - Margini su Android recente
- Su Android 15 e successivi la barra in alto e i tasti in basso non coprono piu l'app: il contenuto resta dentro i margini del sistema. Sui telefoni piu vecchi non cambia nulla.

## 2.28.1 - Nuova icona, testata e sfondo (fatti con Canva)
- **Nuova icona**: un calibro che racchiude un ingranaggio con il centro azzurro, acciaio su blu notte. Per il telefono (quadrata e tonda di Android), per il negozio e per il sito. La cornice dell'immagine originale e stata tolta per usarla a tutto campo.
- **Nuova testata della home**: un ingranaggio, il mandrino e le scintille. Dall'immagine originale sono ritagliati i pannelli con scritte in inglese e dati finti, che nell'app non devono comparire; sopra c'e una sfumatura scura per leggere titolo e ricerca.
- **Sfondo con immagine** dietro le schermate (metallo scuro con ingranaggi), con una velatura che tiene i testi leggibili. Si toglie da Impostazioni, "Sfondo con immagine"; nel tema chiaro non c'e.
- Il marchio nella home usa la nuova icona. Le immagini sono leggere (testata e sfondo meno di 200 KB) e funzionano anche senza rete.
- Una prova controlla misure e peso delle immagini, che il funzionamento senza rete le includa e che lo sfondo non renda illeggibili i testi.

## 2.28.0 - Grafica: un colore per gruppo
- La home ha **un colore per ogni gruppo**: Calcola giallo, Controlla verde, Officina viola, con il bordo colorato e l'icona nello stesso colore. Il blu resta il colore principale dell'app.
- **Blu piu profondo** nel tema scuro (fondo, pannelli e bordi) e testi secondari piu leggibili.
- **Tema chiaro** con i colori dei gruppi scuriti per leggersi bene sul bianco.
- Una **prova automatica controlla il contrasto** (livello AA) di testi, pulsanti e colori dei gruppi in entrambi i temi.

## 2.27.0 - Velocita di taglio e avanzamento in primo piano
- **In cima alla home** c'e il calcolo rapido: materiale, utensile e diametro (con il tastierino grande e i taglienti a un tocco) danno subito **giri al minuto, avanzamento e velocita di taglio**, piu fz o fn, passata e passo laterale.
- Vale per tutti gli utensili (fresa, punta, alesatore, bareno, maschio, lamatore, inserto da tornio) e usa gli stessi dati della calcolatrice completa: i valori restano gli stessi tra le due. Il tasto "Completa" apre la calcolatrice con tutti gli utensili.
- I giri restano limitati al massimo delle Impostazioni, e la nota ricorda che i valori sono di partenza.

## 2.26.0 - Segnala un problema
- **Impostazioni, "Segnala un problema"**: apre l'email gia scritta con versione, schermata, telefono e misura dello schermo, per i tester e per chi usa l'app.
- L'indirizzo di contatto viene da `sito.json` (copiato in `contatto.js` da `node tools/sito.js`): non e scritto nel codice.
- `docs/TEST_CHIUSO.md`: come iscrivere i tester, il messaggio da mandare, le cinque prove e cosa chiedere nel resoconto.

## 2.25.0 - Dal disegno: richiami dei fori, flange, tolleranze geometriche
- **Richiami su piu righe** letti come una quota sola: "N°4 Fori Ø13 / Passanti / Equidistanti", "N°3 Fori Lamati Ø13 / Lamatura Ø18.5 / Prof.lamatura 13", "N°2 Fori spina Ø10 H7 / Prof.foro 10 / A 180°". Prima "N°" e "Fori" con la maiuscola non si capivano e le righe sotto si perdevano.
- **Riquadri di tolleranza geometrica** (posizione, concentricita) ignorati: prima "Ø 0.1 A B" diventava un foro.
- Ignorati anche il **cartiglio** con le tolleranze generali (smussi, raggi, angoli, rugosita), le **date**, le **quote di riferimento tra parentesi** e gli **scostamenti** (+0.2); le sigle delle flange (ISO F12) non sono tolleranze.
- Nuove quote: **angoli** (30°, 22,5°, A 180°), **fresature** (Fresatura 3 Profondita 2), lamature e profondita.
- **Pezzi tondi** (flange, dischi): il diametro piu grande e il pezzo, il centro e nel mezzo; ogni gruppo di fori va sul **suo cerchio** (la scritta "Fori spina" lega il cerchio ai fori spina), il primo foro all'angolo di mezzo passo se e quotato.
- **Lamatura** nei fori: nel passo Forma (interruttore Lamatura) e nel programma, con il lamatore dopo la punta e la sosta sul fondo.
- Ogni dubbio si dice: spessore che non c'e nella pianta, cerchio e angolo dei fori da controllare, diametri del tornio, fresature da mettere dove vanno.

## 2.24.0 - Dal disegno al pezzo, con la conferma di ogni quota
- **Foto del disegno**: l'app legge le quote **e dove stanno** sul disegno, anche quelle scritte in verticale (la foto si legge anche girata di 90 gradi). Il cartiglio (scala, revisione, tolleranze generali, note) non da quote; il materiale scritto nel cartiglio si prende.
- Le quote sono **numerate sulla foto** con il colore dello stato: da controllare, giusta, scartata. Ognuna si conferma, si scarta o si corregge scrivendo; quelle mancanti si aggiungono toccando la foto.
- **Tornio**: i diametri si mettono in fila lungo l'asse, la testa e dove c'e il filetto (o il diametro piu piccolo), le lunghezze vanno al loro diametro; una lunghezza mancante si ricava dal totale, una somma che non torna si dice. Filetto con gola, tolleranze, smusso di testa, barra commerciale. "Inverti testa e mandrino" se serve.
- **Fresa**: misure del pezzo, spessore, fori ripetuti, filetti e fori singoli; le posizioni dei fori si propongono e vanno controllate.
- **Niente senza conferma**: "Crea il pezzo" si accende solo quando tutte le quote sono controllate; il pezzo va nel lavoro guidato con l'avviso di ricontrollarlo.
- Nel browser (senza la lettura del telefono) le quote si aggiungono a mano sulla foto.

## 2.23.0 - Funzioni d'officina
- **Barra seno**: altezza dei blocchetti per un angolo, o l'angolo da un'altezza, con l'errore per 0,01 mm.
- **Ingranaggi e divisore**: da modulo e denti i diametri (primitivo, esterno, di fondo, di base), il passo, l'altezza e lo spessore del dente, l'interasse con la ruota accoppiata e i giri di manovella del divisore (40:1 e altri).
- **Dilatazione termica** di nove materiali dalla temperatura di riferimento a quella del pezzo.
- **Potenza e coppia del mandrino**: asportazione in cm3/min, potenza al tagliente e al mandrino, coppia; la forza specifica di taglio si riempie dal materiale.
- **Tempo di lavoro** di un percorso, per passate e per numero di pezzi.
- **Tabelle, Coni**: Morse 0-6, attacchi 7:24 (ISO 30-60) e altri coni, con il semiangolo per il carrello del tornio.

## 2.22.0 - Tolleranze: tutti i gradi IT01-IT18
- Tutti i **gradi di tolleranza normalizzati da IT01 a IT18** (prima da IT5 a IT11), per ogni classe: H12, h13, D10, js14, f9, k4...
- **Tabelle, Tolleranze**: scegli la lettera (16) e il grado (20) con i tasti; in fondo la tabella di tutti i gradi IT per ogni campo di diametro.
- La calcolatrice delle tolleranze ha piu classi nelle liste (H5-H14, h5-h14, D10, E9, js7...) e accetta qualsiasi classe nel campo "Altra classe".
- Disegno del lavoro: lista di tutte le classi d-p dai gradi 5 a 14 per i cilindri.
- Le altre lettere della norma (a, b, c, r, s, t, u, v, x, y, z) non ci sono ancora: servono le tabelle complete di ISO 286-2, che l'app non puo ricavare con formule senza arrotondamenti diversi dal libro.

## 2.21.0 - Modelli, lavori salvati, barenatura, costo e rampa
- **Modelli pronti** per partire: perno con filetto, albero a gradini, boccola, disco con foro (tornio); piastra con 4 fori M8, piastra con tasca, staffa con asole, flangia a 6 fori (fresa).
- **Lavori salvati con un nome**: salva, apri, duplica ed elimina, dal primo passo.
- **Tornio: barenatura interna e filetto interno** nel lavoro guidato, dopo il foro in asse.
- **Fresa: quote sul disegno** della forma scelta (larghezza, altezza, distanza dall'origine; Ø e coordinate di ogni foro).
- **Tasca libera con discesa a rampa** (3°) lungo le righe e lungo il primo tratto del giro, invece della discesa dritta.
- **Costo del pezzo**: numero pezzi e materiale; costo orario della macchina in Impostazioni.
- **Foglio di attrezzaggio** con un tocco dal passo 4: utensili, quote di lavoro, tempo.
- Ripasso grafico leggero delle schermate vecchie (raggi, spazi, schede piu grandi, stati vuoti).

## 2.20.0 - Disegna e lavora: dal pezzo al programma in 4 passi
- **Lavoro guidato**, uguale per fresa e tornio: 1 Grezzo, 2 Forma, 3 Lavorazioni, 4 Programma. Un passo alla volta, con Indietro e Avanti sempre in basso.
- La forma si scrive **a quote**. Tornio: un tratto dopo l'altro (cilindro, cono, arco) con filetto, gola, tolleranza e spigolo a un tocco. Fresa: forme pronte (tasca, tasca tonda, foro, fori a cerchio, fori a griglia, asola, profilo). Il disegno si aggiorna mentre scrivi; toccandolo si apre il tratto o la forma.
- **Tastierino numerico grande** dentro l'app: cifre, virgola, segno, Avanti al campo dopo, OK. Si puo tornare alla tastiera del telefono nelle Impostazioni.
- Lavorazioni **proposte da sole** con le regole di officina di sempre: ognuna si spegne con un interruttore, giri e avanzamento si correggono. Tempo stimato, numero di utensili e lista da montare.
- Passo 4: Simula e Programma ISO con un tocco.
- **Home nuova**: quattro ingressi grandi (Disegna e lavora, Calcola, Controlla, Officina) e "Continua l'ultimo lavoro". Le altre funzioni stanno dentro i gruppi; CAD libero di fresa e tornio sono in Officina.
- Primo avvio: una scheda con la macchina (fresa, tornio o tutte e due) e i giri massimi, senza bloccare niente.
- Telefono girato o tablet: disegno e dati affiancati. Stile comune (spazi, raggi, interruttori) per le schermate nuove.

## 2.19.0 - Mini CAD/CAM, tabella dei filetti, foto e nuova icona
- **CAD fresa** (nuova schermata): disegni profili, rettangoli, cerchi, fori e asole col dito e dai a ognuno la lavorazione (contorno, tasca, foro, maschio, alesatura, asola). L'app scrive il programma nell'ordine di officina, con i dati di taglio del materiale, e lo apri nella simulazione.
- Gesti: un dito disegna e sposta (mirino sopra il dito, il punto si mette quando lo alzi, lente d'ingrandimento); due dita zoom e spostamento; un tocco con due dita annulla, con tre ripete. Aggancio ai punti, alla griglia e alle linee dritte; quote scritte e frecce di 0,1 / 1 / 10 mm per la precisione.
- Schermo intero e rotazione dello schermo, per il CAD della fresa e per il disegno del tornio.
- Nuova lavorazione "tasca libera": righe dentro un profilo qualsiasi piu un giro lungo le pareti, finitura con il profilo interno. La fresa non va mai a meno di raggio piu sovrametallo dalla parete.
- Il contorno esterno chiuso va sempre per ultimo; due utensili diversi non hanno mai lo stesso numero T.
- **Tabella filetti** rifatta: metrico, metrico fine, UNC, UNF, UNEF, NPT, gas G e R/Rc, Whitworth BSW e BSF, trapezio Tr, ACME e Pg, con ricerca e le misure di ogni famiglia (preforo, diametro medio, nocciolo). Valori teorici di base.
- **Foto**: ora ci sono "Scatta una foto" (fotocamera subito) e "Dalla galleria".
- **Home** a tessere per gruppo di lavoro. Nuova icona dell'app (ingranaggio con fresa) e icona adattiva su Android.
- Il sito mostra il telefono con la cornice e le nuove schermate.

## 2.18.0 - Il sito di Hich-Officina
- Un sito vero: pagina principale con funzioni, schermate, installazione e domande frequenti; guida, novita e informativa sulla privacy; pagina "non trovata".
- L'app si apre da `app.html`. Chi l'ha gia installata viene portato all'app da solo.
- Le pagine si generano da una sola fonte (`node tools/sito.js`): guida e novita seguono l'app e il CHANGELOG, e le prove controllano che siano aggiornate.
- Nome, email e data della privacy si scrivono in `sito.json`.
- Corretto: nella home compariva la scritta "null" sotto la ricerca quando non c'era il promemoria della copia. Ora una prova cerca "null", "undefined" e "NaN" scritti sullo schermo in tutte le schermate.

## 2.17.1 - Preparazione per il negozio di app
- Informativa sulla privacy (`privacy.html`) e testi della scheda (`docs/SCHEDA_STORE.md`), con i campi personali da compilare.
- Android: livello di API 36 (richiesto dal negozio per le app nuove), strumenti di costruzione aggiornati.
- Il lavoro automatico costruisce anche il pacchetto per il negozio (AAB), ma solo se c'e la chiave dei segreti.

## 2.17.0 - Guida, note legali e presentazione
- "Come si fa": ogni funzione in pochi passi con un esempio, stampabile in PDF.
- Note legali e privacy: valori indicativi, responsabilita, dati solo sul telefono, marchi e componenti.
- Pagina di presentazione con le schermate (`presentazione.html`) e i passi per la pubblicazione su uno store (`docs/PUBBLICAZIONE.md`).

## 2.16.0 - Dati, sicurezza e prestazioni
- Promemoria della copia di sicurezza (una settimana, rimandabile) in home.
- La copia ha una somma di controllo: un file modificato o rovinato viene segnalato prima di ripristinare; il ripristino chiede conferma. La password della macchina non finisce mai nella copia.
- Password FTP chiesta a ogni invio e non salvata (si puo tornare a salvarla in Impostazioni).
- Migrazioni dei dati: i dati di versioni vecchie e anche rovinati si portano alla forma di adesso; provate su tutte le schermate.
- Esporta e importa: tabella utensili, macro, materiali nel formato della libreria di Hich-CAM.
- Simulazione di programmi molto lunghi (centinaia di migliaia di movimenti) senza piantarsi: strati in memoria, velocita fino a x4096; corretto un errore di pila su programmi enormi.
- Una sola funzione per leggere le tolleranze scritte a mano.
- APK: la chiave di firma puo venire dai segreti del repository (vedi README).

## 2.15.0 - Interfaccia e uso in officina
- Modalita guanti (testi, campi e pulsanti piu grandi) e contrasto alto, in Impostazioni.
- Tablet in orizzontale: home a tre colonne, moduli su due colonne, elenchi e risultati su piu colonne.
- Home: "Usati di recente".
- Se la memoria del telefono e piena o bloccata, l'app lo dice (prima falliva in silenzio).
- Prova automatica dell'accessibilita: ogni pulsante, campo e tela ha un nome per i lettori di schermo.

## 2.14.0 - Basi del progetto e affidabilita
- Prova a tappeto (migliaia di combinazioni di lavorazioni, utensili e materiali): nessun NaN, nessuna segnalazione.
- Prove contro le norme: tolleranze ISO 286 e filetti metrici.
- Valori non validi (infiniti, enormi) nei programmi: messaggio chiaro invece di NaN nel listato.
- Il controllo non segnala piu "rapido sotto Z0" nelle spianature a piu livelli.
- Un comando unico di prova (`node prove/tutte.js`) e le prove nel lavoro che costruisce l'APK.
- Compensazione G41/G42 calcolata: la simulazione mostra il centro fresa con il raggio (dalla tabella utensili o scritto).
- Urti con le staffe e taglio sotto il fondo del grezzo, nel controllo dei programmi (grezzo e staffe facoltativi).
- Tabelle > Linguaggi macchina: cosa traduce, cosa no, stato (mai provati su una macchina) e un programma d'esempio.
- `CLAUDE.md`, `CHANGELOG.md`, `package.json`.

## 2.13.0 - lavorazioni sulle linee del profilo, angolo da una foto
- Disegno: su un cilindro scelto filetto, gola di scarico alla fine e tolleranza;
  "Crea il programma" fa profilo, gole e filetti in un programma solo (diametri con
  tolleranza al centro, filetti un decimo sotto).
- Angolo da una foto: due linee sui lati con la lente, aggancio ai bordi della foto,
  angolo e utensile (smussatore, coda di rondine, fresa a V, inclinazione) con
  l'angolo di serie piu vicino.

## 2.12.0 - disegno del profilo a linee, piu semplice e completo
- Tocco su una linea: si sceglie; si elimina (un cilindro tolto fa accostare il resto),
  si cambiano Ø e lunghezza (quello che viene dopo si sposta), si divide, diventa arco
  o retta, smusso o raggio alla fine con un tocco.
- Elenco delle linee in parole con la ✕ per eliminarle.
- Linee nuove con i bottoni Cilindro, Spallamento, Cono, Arco (bombato o incavato) e
  Punto a quote, dopo la linea scelta o in fondo.
- Annulla e Ripeti; un tocco nel vuoto con qualcosa scelto toglie la scelta.

## 2.11.0 - disegno del profilo piu comodo e preciso
- Zoom con due dita, rotella e pulsanti, Adatta; la griglia segue lo zoom.
- Quote Ø e lunghezze sul disegno, quote vive con la croce mentre si trascina.
- Tocco su un tratto: punto in mezzo. Smussi e raggi con un tocco sul punto scelto o su
  tutti gli spigoli.
- Punto con le quote: avanti di una lunghezza, spallamento fino a un Ø, cono con
  lunghezza e semiangolo, quote esatte.

## 2.10.0 - ciclo di lavoro proposto e quote dal disegno
- Ciclo di lavoro proposto: dal pezzo descritto a misure (albero da tornio o piastra da
  fresa) la lavorazione completa con utensili della tabella, dati del materiale e ordine
  di officina; diametri con tolleranza finiti al centro, preforature giuste, gole di
  scarico, fori grandi a fresa. Poi programma, Sequenza o pezzo con le misure.
- Programma del tornio a piu fasi (cicli G71/G70 numerati per fase).
- Quote da una foto del disegno (o dal testo): Ø, tolleranze, filetti, fori ripetuti,
  smussi, raggi, lunghezze da toccare per riempire i campi.

## 2.9.0 - programma da una foto, controllo degli errori
- Controlla e simula un programma: lettura da una foto dello schermo (nell'APK, con il
  riconoscimento del testo del telefono, senza rete) e pulizia del testo letto (O e I al
  posto di 0 e 1, virgole, spazi, numeri di riga dello schermo).
- Controllo del programma riga per riga: taglio senza F o a mandrino fermo, rapidi in
  X Y sotto Z0, G96 senza limite dei giri, T senza M6, H di un altro utensile, valori
  fuori misura, parentesi, cicli senza G80, fine mancante, righe non capite (la lettura
  va avanti e le segnala tutte).

## 2.8.0 - profilo disegnato col dito, pezzo 3D, simulazione a pannello
- Disegna un profilo (tornio): punti col tocco o tratto a mano libera semplificato in
  rette, aggancio alla griglia e alle orizzontali e verticali, punti da trascinare,
  quote, raccordi e smussi; vista 3D del pezzo tornito da girare col dito; il profilo
  passa a Nuovo programma ISO.
- Simulazione a pannello: quote grandi, giri con indicatore, avanzamento, utensile,
  righe del programma con la riga in lavoro; su tablet grafico e pannello affiancati.

## 2.7.0 - profili liberi, sequenza, foro completo, cicli del tornio, ricerca
- Profilo libero (rette, archi, raccordi, smussi): fresa con G41/G42 ed entrata e
  uscita; tornio con sgrossatura, passata sul sovrametallo e finitura G42.
- Fresa: tasca circolare a elica (parte e finisce al centro), asola, filetto a fresa.
- Tornio: troncatura, filetti trapezi e conici, cicli fissi a scelta (G71/G70, G75,
  G74, G76); la simulazione legge anche questi cicli.
- Sequenza: piu lavorazioni in un programma nell'ordine di officina, senza cambio per
  lo stesso utensile, con il controllo degli ordini impossibili. Foro completo:
  centrino, punta, smusso, maschio o alesatore.
- Ricerca veloce dalla home. Corretto: cambiando strategia in Fresatura i campi della
  lavorazione non si aggiornavano.

## 2.6.0 - velocita di taglio in un posto solo
- "Utensili e dati di taglio" diventa la prima scheda della Calcolatrice di taglio
- ("Per utensile"); la voce doppia esce dal menu. Chi l'aveva nei preferiti arriva alla
- calcolatrice.

## 2.5.1 - i post-processor dicono con quali controlli sono compatibili
- ISO: controlli Fanuc e simili. Cicli a nome: controlli Siemens Sinumerik. Dialogo a
- testo: controlli Heidenhain. Solo indicazione di compatibilita (nuova regola).

## 2.5.0 - correzione della tabella utensili, post-processor
- Correzione: la tabella utensili usava lo stesso posto della schermata "Utensili e
  dati di taglio"; dopo averla aperta, Nuovo programma ISO si bloccava senza campi.
  Ora la tabella sta a parte e si recupera quella gia fatta. Prova che lo riproduce.
- Post-processor: ISO, ISO con cicli a nome (fresa e tornio), dialogo a testo con
  righe numerate e cicli con parametri Q (fresa). Si sceglie in Impostazioni o nel
  listato; simulazione e foglio di attrezzaggio leggono sempre l'ISO.

## 2.4.0 - simulazione, apertura programmi, tabella utensili, pezzi, invio FTP
- Lettura ed esecuzione dei programmi ISO e delle macro (iso.js): archi, cicli di
  foratura, variabili, IF, WHILE, G65, M98; quote, utensili, tempo stimato.
- Simulazione animata passo per passo (3D, dall'alto, di fronte, sezione tornio).
- Apri un programma da testo o da file; listato con ricerca, modifica, Salva in...
- Tabella utensili personale da scegliere in Nuovo programma ISO.
- Pezzi: dati, origine, fissaggio, programmi, note, foto, misure con tolleranze,
  controllo delle misure prese con storico, foglio di attrezzaggio da stampare.
- Macro: misura con tastatore, pezzi in serie, griglia su piu origini; simulazione
  della macro con i valori dei parametri.
- APK: invio alla macchina via FTP, Salva in..., condivisione di file, stampa, foto.
- Copia di sicurezza di tutti i dati in un file e ripristino.

## 2.3.0 - dati di taglio per utensili in metallo duro
- Velocita di taglio e avanzamenti di serie rifatti per tutti i materiali con valori
- medi tipici dei cataloghi: fresa di sgrossatura e di finitura, punta in metallo duro,
- punta a inserti, alesatore, bareno, inserto da tornio, maschio rivestito. Prima le punte
- e gli alesatori avevano valori da acciaio rapido.

## 2.2.0 - APK per Android costruito dal repository
- Progetto Android (WebView) che apre le pagine dell'app dagli asset, con salvataggio
  in Download/Hich-Officina, condivisione, appunti e scelta dei file.
- Lavoro automatico: a ogni aggiornamento di main costruisce l'APK firmato sempre con
  la stessa chiave e lo pubblica nella pagina di download "apk".
- La pagina usa le funzioni del telefono quando gira dentro l'APK.

## 2.1.0 - Vc che segue il materiale, importa la tabella materiali
- Nuovo programma ISO: Vc e avanzamento sono campi veri, si riempiono dal materiale
  quando cambiano materiale, utensile, diametro o lavorazione, e si possono correggere.
  Giri e avanzamento al minuto si vedono subito sotto. Prima i valori automatici erano
  solo in grigio e la Vc non si vedeva.
- Materiali: importa la propria tabella dal testo JSON della libreria di Hich-CAM
  (incollato o da file); tornitura e densita restano quelle di serie se mancano.
- Calcolatrice fresatura: fz riadattato quando cambia il diametro.

## 2.0.0 - nuova grafica, programmi di fresa e tornio, macro, utensili
- Schermate a pila con home, preferiti e impostazioni; tema scuro blu e tema chiaro.
- Nuovo programma ISO: spianatura, contorno, tasca; foratura con centrino, punte in
  metallo duro e a inserti, alesatore, bareno, maschio, lamatore; tornio con interna,
  foratura in asse e filetto interno. Anteprima, listato colorato, programmi salvati.
- Macro CNC: modelli pronti e macro personali con parametri.
- Materiali del programma parametrico, modificabili; dati di taglio per utensile.
- Calcolatrice con peso, triangolo, rugosita; tolleranze con disegno; galleria esempi.

## 1.0.0 - calcolatori, G-code tornio e tabelle per telefono
- App web installabile, funziona senza rete. Prove dei calcoli e dell'interfaccia.

