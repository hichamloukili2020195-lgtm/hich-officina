# Cronologia delle versioni

Hich-Officina: una voce per versione, la piu recente in alto.

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

## 2.2.0 - APK per Android costruito da GitHub
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

