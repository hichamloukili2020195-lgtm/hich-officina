# Cronologia delle versioni

Hich-Officina: una voce per versione, la piu recente in alto.

## 2.49.0 - Dal disegno al pezzo: ripassa il profilo sulla foto, quote lette meglio
- **Ripassa il profilo** (nuovo, consigliato): sulla foto del disegno tocchi l'asse e ripassi col dito il profilo (tornio) o il contorno (fresa), anche a mano libera e in piu tratti. L'app raddrizza le linee, chiude gli spigoli ad angolo retto, riconosce i raccordi (archi tangenti), aggancia le linee a quelle vere del disegno e trova l'asse anche se tocchi vicino. Due dita: ingrandisci e sposta; schermo intero.
- **Misure dalle quote**: la scala si trova da sola confrontando il profilo con le quote lette vicino (non quelle delle altre viste, delle sezioni o dei dettagli); ogni misura prende la quota che torna (in verde), le altre sono misurate sulla foto, arrotondate al mezzo millimetro e da controllare (in arancione). Senza quote: "Scrivi una misura" su una linea del profilo e l'app ricava le altre.
- Il profilo va nel **disegno del tornio** (punti, archi compresi) o nel **CAD della fresa** (contorno chiuso), dove si corregge e si fa il programma.
- **Quote lette meglio**: non si prendono piu come quote i numeri dei richiami nei cerchietti (restano scartati nella lista, si possono riprendere), la rugosita (1,6/), le tolleranze geometriche (0,02 B), i numeri delle norme (DIN 509 diventava una lunghezza di 509), la scala (2:1, A-A (1:1)) e le scritte dei cartigli in inglese e tedesco. Corretto: "Ø3+0,1 30" diventava "Ø3 +0.130".
- La scheda "Solo le quote" e il modo di prima; nelle quote scartate si vede il motivo.
- Prove: richiami, rugosita, norme, scala e cartiglio su un disegno finto; profilo a gradini e raccordo concavo (con il verso dell'arco nel disegno del tornio), contorno della fresa con angolo raggiato, aggancio alle linee e all'asse, 300 tratti tremolanti; interfaccia: asse, profilo in due tratti, annulla, apertura nel disegno del tornio.

## 2.48.0 - Lettura del programma da una foto piu sicura, righe da controllare, piu foto di seguito
- **Correzioni migliori**: una lettera e un indirizzo solo se ha un valore dopo; se segue un indirizzo vuoto o chiude un numero senza valore e una cifra letta male (YI2 -> Y12, XS0 -> X50, Z-O.5 -> Z-0.5, GOl -> G01, HI -> H1, X1.234S -> X1.2345). Trattini lunghi e ~ diventano il meno; simboli sporchi (», °) si tolgono; 0I234 (PEZZO) -> O1234 (PEZZO).
- Corretto: una Z attaccata tra due numeri (X10Y20Z5) diventava un 2 e cambiava la quota. Le righe con parole intere (macro, altri linguaggi, scritte dei menu) non si toccano piu: prima "CALL 1" diventava "CALL1" e le scritte dei menu potevano passare per programma.
- Corretto: le righe di commento con il numero davanti ("3 ; TASCA") venivano tolte.
- **Righe da controllare**: dopo la lettura ogni riga corretta mostra cosa e stato letto, con i caratteri cambiati evidenziati, e la riga corretta in un campo: si conferma con la spunta o si corregge li. Le righe con caratteri strani in mezzo a un numero sono "dubbie" e si vedono in arancione.
- **Piu foto di seguito**: "Aggiungi un'altra foto" accoda il seguito di un programma lungo; le righe ripetute tra una foto e l'altra restano una volta sola (anche se nel frattempo hai corretto qualcosa).
- Guida: percorsi aggiornati al menu nuovo.
- Prove: 34 errori tipici della foto; 33 righe giuste e i programmi generati (anche tradotti negli altri linguaggi) che non devono cambiare; unione di piu foto; righe da controllare nell'interfaccia.

## 2.47.0 - Menu con uno schema solo, avvio piu rapido, dati piu sicuri
- **Uno schema solo**: la barra in basso e la home hanno gli stessi quattro gruppi: **Disegna** (lavoro guidato, CAD fresa e tornio, dal disegno, ciclo, programma a mano, macro), **Controlla** (apri e simula, programmi salvati, esempi), **Calcoli** (taglio, tolleranze, tabelle, angolo, materiali) e **Archivio** (pezzi, utensili, preferiti, guida). Ogni funzione sta in un posto solo; il gruppo Officina non c'e piu.
- **Avvio piu rapido**: la libreria della vista 3D non si carica piu all'apertura dell'app ma la prima volta che si apre la vista 3D della simulazione (nel frattempo si vede il 2D).
- **Tolleranze nuove**: fori K, M, N, P e alberi r, s (ISO 286-2, sopra i 50 mm con i campi di diametro fitti della norma). Nelle scelte: K6, K7, M6, M7, N7, P7, r6, s6 e gli accoppiamenti H7/r6 e H7/s6.
- **Privacy (APK)**: tolto il servizio con cui la libreria che legge il testo dalle foto poteva spedire statistiche d'uso; la lettura resta sul telefono.
- **Schermo sempre acceso durante la simulazione**: il telefono non si spegne mentre si guarda il percorso; fuori dalla simulazione torna normale.
- **Telefoni stretti (360 px)**: campi numerici, scelte rapide, linee del CAD e pulsanti dello zoom sono grandi almeno 44 pixel; "Spallamento" non e piu tagliato; la barra dello zoom del tornio va a capo invece di allargare la pagina.
- Corretto: una modifica fatta appena prima di passare a un'altra app (o di chiudere l'app) poteva non essere salvata, perche il salvataggio parte con un piccolo ritardo. Ora, quando l'app va in background o si chiude, si salva subito.
- Corretto (APK): quando si sceglieva una foto gia fatta invece di scattarla, o si annullava, restava un'immagine vuota in Immagini/Hich-Officina. Ora si toglie.
- Prove: salvataggio quando l'app va in background e quando la pagina si chiude; libreria 3D non caricata all'avvio; ogni voce del menu in un gruppo solo e barra uguale alla home; bersagli e testo a 360 px; memoria del telefono piena; schermo acceso in simulazione; tolleranze K M N P r s con i valori della norma; statistiche tolte dal manifest.

## 2.46.0 - Tornio: zigrinatura, sovrametallo per rettifica, gola larga e profonda
- **Zigrinatura** su un cilindro (passo 0,8 / 1 / 1,2 / 1,6, diritta o incrociata): fase a giri fissi bassi dopo la finitura; l'utensile entra di mezzo passo e scorre lungo il tratto. Utensile T8 se non c'e un zigrinatore in tabella. Il diametro cresce: la nota lo ricorda e consiglia la prova su un pezzo di scarto. Sui coni viene saltata con una nota.
- **Sovrametallo per la rettifica** (0,2 / 0,3 / 0,5 sul diametro): il tornio lascia il cilindro piu grosso della misura; la nota dice a che diametro e tornito.
- **Gola larga e profonda**: larghezze fino a 10 mm (piu affondamenti con lo stesso utensile) e profondita scelta (0,5 - 3 mm sul raggio) quando la linea non e filettata.
- Le nuove voci sono nel foglio della linea a schermo intero (scorciatoie Zigrinatura e Rettifica), nel pannello della linea e nelle schede dei tratti di Disegna e lavora; sul disegno la zigrinatura si vede tratteggiata e il sovrametallo con una linea.
- Prove: pianificazione e programma con zigrinatura, rettifica e gola profonda; scelte dal foglio e dai tratti.

## 2.45.0 - Tornio a schermo intero: foglio con le lavorazioni della linea
- **Disegna un profilo (tornio) a schermo intero**: toccando una linea (o un punto) si apre un foglio con le sue lavorazioni sul tornio: filetto per gruppi, gola di scarico, tolleranza, spigolo alla fine, quote, dividi, arco o retta, elimina. Con il telefono in orizzontale il foglio sta a destra e il disegno si stringe a sinistra senza coprire il pezzo; in verticale sta in basso. Scorciatoie in alto: Filetto, Gola, Tolleranza, Spigolo. Chiudi toglie la scelta.
- **Scelte rapide col dito** per gola di scarico (3, 4, 5, 6 mm) e tolleranza (h6, h7, g6, f7, k6, js6), anche fuori dallo schermo intero.
- Corretto: a schermo intero le file di pulsanti del pannello (per esempio "Tutti gli spigoli") finivano sopra la barra in alto.
- Prove: foglio della linea a schermo intero, filetto, gola e tolleranza dal foglio.

## 2.44.0 - Filetti per gruppi, spessore delle passate, simulazione del tornio piu vera, lavorazioni comode sul telefono
- **Filetti per gruppi** (Disegna e lavora e disegno del tornio): prima il gruppo (metrico grosso, metrico fine, gas G, gas conico R, NPT, UNC, UNF, UNEF, Whitworth BSW e BSF, trapezio, ACME, Pg), poi la misura. Le misure vicine al diametro del tratto sono a portata di dito, le altre in "Tutte le misure". Se la misura scelta ha un altro diametro, il tratto si adegua (e il programma lo dice).
- **Spessore delle passate**: al passo Lavorazioni ogni lavorazione mostra e fa cambiare la passata (in Z o radiale), le passate del filetto (con la profondita della prima e dell'ultima) e la beccata dei fori. Nel CAD della fresa: "Passata in Z" per contorno, tasca libera e asola. Vuoto = valore proposto dal materiale.
- **Simulazione del tornio come in macchina**: mandrino a sinistra e asse Z orizzontale, pezzo intero (non piu tagliato a spicchio; "Sezione: si" per vedere l'interno), griffe che girano, testa, bancale, torretta con portautensile e inserto. Nella vista di sezione il pezzo e intero (sopra e sotto l'asse) con le griffe sui due lati e l'utensile con inserto e portautensile.
- **Grafica**: materiali metallici e luce da officina nella vista 3D; tavola sotto il pezzo alla fresa.
- **Passo Lavorazioni sul telefono**: il disegno resta visibile e mostra il percorso della lavorazione toccata; le schede sono compatte (campi solo in quella scelta). "Schermo intero" e "Ruota": disegno grande a sinistra e lavorazioni a destra con il telefono in orizzontale.
- Prove: gruppi e misure dei filetti, passate (filetto, sgrossatura, CAD), passo Lavorazioni a schermo intero, interfaccia.

## 2.43.0 - Ricerca ovunque, scorciatoie dell'icona, condividere con un tocco
- **Ricerca in tutta l'app**: la lente in alto (su ogni schermata) apre la ricerca su programmi, pezzi (anche per cliente e commessa), materiali, filetti (M10), tolleranze (H7 25), codici G e M, utensili, schermate e calcolatori. Nuovo: equivalenze dei materiali (`C45`, `1.4301`, `304`) e conversione delle durezze (`45 HRC`, `392 HV`). Esc o Chiudi per uscire.
- **Scorciatoie sull'icona** (tieni premuta l'icona dell'app): CAD, Calcoli, Nuovo programma, Controlla. Funzionano anche con l'app gia aperta. Le stesse quattro per la versione installabile dal sito.
- **Condividi con un tocco**: nel CAD un menu con PDF del disegno, immagine PNG, file DXF e programma ISO; sul pezzo la scheda (cliente, commessa, stato, origine, fissaggio, note, programmi) e l'etichetta con il codice QR. Si manda con il menu di Android (WhatsApp, posta, Drive...); nel browser il file si scarica.
- Corretto: nel CAD la riga dei pulsanti del pannello poteva allargare la pagina oltre lo schermo.
- Prove: ricerca globale, scorciatoie (schermate esistenti, manifesti), condivisioni, interfaccia.

## 2.42.0 - Fase 4: durezze, equivalenze dei materiali, commesse, etichetta QR
- **Durezze** (Tabelle > Durezze): converti HRC, HV e HB e ottieni la resistenza a trazione approssimata (3,45 x HB). Valori indicativi per acciai, da 20 a 65 HRC; HB solo fino a 50 HRC; fuori campo lo dice.
- **Equivalenze dei materiali** (Tabelle > Equivalenze materiali): sigla EN, numero materiale e sigla americana piu vicina per acciai, inox, ghise, alluminio, ottone e titanio. Cerca per qualsiasi sigla. Sono equivalenze indicative: vale il certificato del materiale.
- **Commesse**: ogni pezzo ha cliente, commessa/ordine, stato (da fare, in lavorazione, finito, consegnato) e quantita. L'elenco ha la ricerca su nome, cliente, commessa, codice, materiale, grezzo e note, e il filtro per stato. La ricerca dalla home trova anche cliente e commessa.
- **Etichetta con codice QR** dal pezzo: nome, cliente, commessa, disegno, materiale e quantita in un QR (si legge con qualsiasi lettore), con le righe di testo sotto; si salva come immagine da stampare.
- Non fatto: le lettere rare delle tolleranze ISO 286 (a, b, c, s, t, u...): servono le tabelle ufficiali per non rischiare valori sbagliati; le lettere usate in officina ci sono gia.
- Prove: conversioni delle durezze (andata, ritorno, fuori campo), equivalenze, ricerca e filtri dei pezzi, etichetta QR, interfaccia.

## 2.41.0 - Fase 3 CAM: isole nelle tasche, incisione di testo, post personalizzato
- **Isole nelle tasche**: dai la lavorazione **Isola** a un profilo chiuso, a un rettangolo o a un cerchio che sta dentro una tasca. La fresa lo gira intorno: righe di sgrossatura che non entrano nell'isola, un giro di pulizia attorno a ogni isola e la finitura dell'isola a profondita piena. Un'isola fuori da ogni tasca resta solo disegnata e il programma lo scrive nelle note. La tasca rettangolare o circolare con un'isola passa alla tasca libera.
- **Incisione**: nuova lavorazione per i profili e per il nuovo elemento **Testo**. La fresa segue le linee a profondita fissa (preimpostata 0,3 mm), senza compensazione, con piu passate se serve. Utensile: il piu piccolo della tabella oppure il diametro scritto.
- **Strumento Testo**: tocca il disegno, scrivi il testo, l'altezza, la profondita e l'angolo. Il carattere a linee singole e scritto da noi (maiuscole, cifre e - _ . , : / + = ( ) % # * ? ! e i simboli di diametro e gradi; le minuscole diventano maiuscole e gli accenti si tolgono). Il testo si sposta, ruota, scala; non si specchia. Esce anche in DXF e PDF.
- **ISO personalizzato** (Impostazioni e scelta nel listato): le regole della tua macchina applicate al testo ISO dell'app: cambio utensile (T{t} M6...), refrigerante acceso e spento, fine programma, G43 si o no, % si o no, commenti tra parentesi o dopo il punto e virgola o senza, decimali, numeri di riga, righe dopo il numero programma e prima della fine. Mai provato su una macchina: prova a vuoto.
- Non fatto: i post con il nome della marca del controllo, in attesa della tua decisione su come scriverli; nel frattempo "ISO personalizzato" copre le differenze piu comuni.
- Prove: tasca con isola (nessun punto di lavoro dentro l'isola), carattere e testo, pianificazione dal CAD, trasformazioni, DXF, PDF, post personalizzato, interfaccia.

## 2.40.0 - Fase 2d CAD: vincoli veri
- **Vincoli** (Modifica > Vincoli): restano legati al disegno e si riapplicano da soli quando cambi qualcosa.
  - Su un segmento di profilo (quello che arriva al punto scelto): orizzontale, verticale, lunghezza fissa (numero o formula con i parametri), parallelo, perpendicolare o stessa lunghezza rispetto a un altro profilo (tocca il suo segmento).
  - Su un punto: bloccato, oppure coincidente con un punto di un altro profilo. Su un arco: raggio fisso.
  - Rettangolo: larghezza e altezza da formula; cerchio: diametro; asola: larghezza.
- **Parametri vivi**: se cambi `L` nel pannello, i profili con vincoli di lunghezza `L` si ridisegnano. Un risolutore (minimi quadrati, scritto da noi) sposta i punti il meno possibile; gli ultimi punti di un profilo si muovono prima dei primi.
- **Trascinando un punto** i vincoli restano veri (un lato orizzontale resta orizzontale). Se i vincoli sono in conflitto il movimento si annulla e il messaggio dice perche; lo stesso quando aggiungi un vincolo impossibile.
- Segni sul disegno (H, V, L, parallelo, perpendicolare...) e elenco dei vincoli con il cestino per toglierli.
- Le copie (serie, specchia, ruota, scala, parallela) non portano i vincoli che non valgono piu; spostando soltanto, restano.
- Non fatto: vincoli di tangenza e di simmetria; le coordinate scritte a mano nel pannello dell'elemento non riapplicano i vincoli finche non muovi o cambi qualcosa.
- Prove: risolutore (rettangolo storto, triangolo, conflitto, parallelo, perpendicolare, punto trascinato, tempo con 60 punti), interfaccia.

## 2.39.0 - Fase 2c CAD: parametri, quote, punti toccando, PDF, PNG e QR
- **Punti toccando il disegno**: in Modifica, accanto ai campi dei punti c'e "Tocca": centro di rotazione e scala, asse di simmetria, centro della serie, spostamento da punto a punto. Il pannello si nasconde, tocchi il punto (con l'aggancio) e torna con i numeri scritti.
- **Parametri**: dai un nome a una misura (L = 80, h = L/2) nel pannello; vale in ogni campo numerico, nel tastierino Digita (con i tasti dei nomi) e in Modifica. Il nome non puo contenere la x.
- **Quote**: il pulsante Quote mostra sul disegno lunghezze dei lati, larghezza e altezza dei rettangoli, diametri, raggi. Nuova operazione **Quota segmento** (in Modifica): cambia lunghezza o angolo del segmento che arriva a un punto, oppure lo rende orizzontale o verticale; il resto del profilo segue o resta fermo.
- **Esporta PDF** (A4, in scala, con cartiglio e quote) e **PNG**, scritti da noi senza librerie. Nel PDF c'e anche il QR del programma, se ci sta.
- **QR del programma**: codice QR scritto da noi (fino a 858 byte) per portare il testo del programma su un altro telefono. Se e troppo lungo lo dice.
- Android: salvataggio dei file immagine in Download/Hich-Officina e tipo giusto per i PDF.
- Non fatto: vincoli veri tra gli elementi (parallelo, tangente, uguale) che si riapplicano da soli; le quote cambiano la geometria una volta, non restano legate.
- Prove: parametri, quote, QR (letto con un lettore esterno nelle prove di sviluppo), PDF (struttura e indici), interfaccia.

## 2.38.0 - Fase 2b CAD: modifiche al disegno, layer e DXF
- **Finestra**: nuovo strumento per scegliere piu elementi trascinando un rettangolo (da sinistra a destra = solo quelli tutti dentro; da destra a sinistra = anche quelli toccati). Un tocco aggiunge o toglie un elemento.
- **Modifica** (pulsante in basso, o pressione lunga): sposta, ruota, scala, specchia (asse verticale, orizzontale o due punti), serie in fila, serie in cerchio, parallela (fuori/dentro o a sinistra/destra), raccordo e smusso su un vertice o su tutti, taglia/estendi, angolo vivo tra due profili aperti, layer. Si scrivono i numeri anche come espressioni (`50/2+3`); gli errori sono scritti in chiaro; si puo tenere l'originale (Copia).
- **Layer**: un nome per gruppo di elementi (Sagoma, Fori...); una barra per mostrarli e nasconderli. Gli elementi nascosti non sono disegnati, non agganciano e non entrano nel programma.
- **DXF**, scritto da noi senza librerie: esporta il disegno (rette, cerchi, punti, polilinee con archi, layer) e importa rette, archi, cerchi, punti e polilinee. Rette e archi con gli estremi uguali si uniscono in un profilo; un rettangolo sugli assi torna rettangolo; i pollici si convertono. Spline, testi e quote si saltano e il messaggio dice quanti. Controlla sempre le quote dopo l'importazione.
- Prove: trasformazioni, serie, parallela, raccordi, taglia/estendi, finestra, DXF (scrittura e rilettura), interfaccia.

## 2.37.0 - Fase 2a CAD: Digita, archi, poligono, aggancio intelligente
- **Digita**: tastierino per scrivere i punti con espressioni (`50/2+3`, `pi`, seno e coseno in gradi), assoluti (`50;30`), incrementali (`@10;5`) e polari (`@20<45`); anteprima in diretta e messaggi d'errore chiari. Per il rettangolo anche le misure `40x30`.
- **Arco** in tre modi: tre punti, centro-inizio-fine, inizio-fine-raggio (arco piccolo o grande).
- **Poligono regolare** con numero di lati a scelta.
- **Aggancio intelligente**: intersezioni, punti e centri, medi, tangenti e perpendicolari, griglia; ogni tipo ha il suo segno e la sua etichetta.
- **Doppio tocco** sul vuoto = adatta alla vista; **pressione lunga** = menu (duplica, elimina, lavorazioni; adatta, digita, aggancio).
- Prove: espressioni, archi, poligono, aggancio con 3000 elementi, interfaccia.

## 2.36.0 - Fase 1: navigazione a 5 voci, bersagli grandi, numeri monospace, vibrazione
- **Barra in basso a 5 voci**: Home, CAD, CAM, Calcoli, Archivio (prima: Home, Preferiti, Impostazioni). La voce della sezione in cui sei e accesa con una linea in alto. **Archivio** raccoglie pezzi, programmi salvati, tabella utensili, materiali, preferiti e guida.
- **Impostazioni**: rotella in alto a destra su ogni schermata (e nella testata della home); i Preferiti stanno in Archivio.
- **Bersagli piu grandi**: pulsanti da 56 px, icone da 48 px, campi da 52 px, barra da 64 px, interruttori da 56 px; con la modalita guanti restano piu grandi.
- **Numeri sempre in monospace** con cifre di larghezza uguale (risultati, quote, campi numerici, tastierino): si leggono in colonna.
- **Vibrazione breve** sui tasti del tastierino, sulla barra e sugli avvisi (dal ponte Android, o dal browser); si spegne in Impostazioni, "Vibrazione sui tasti e sugli avvisi".
- **Simulazione piu ordinata**: le opzioni (centro fresa, materiale, confronto) stanno in una sola riga; sotto i comandi c'e una seconda riga con "Riga" prima e dopo e la velocita, a pulsanti grandi.
- Animazioni ridotte se il telefono lo chiede.
- Non ancora fatto della Fase 1: italiano e inglese (decisione da prendere), tema "arancione sicurezza" (da confermare: la grafica e blu come scelto con Canva).

## 2.35.0 - Foglio di attrezzaggio completo
- **Foto con didascalia**: apri una foto del pezzo e scegli Morsa, Origine, Utensili, Pezzo o Altro. Nel foglio le foto stanno in quest'ordine, ognuna con la sua didascalia; la didascalia si vede anche sulla miniatura.
- **Serraggio e origine**: nuovi campi "Sporgenza dal serraggio" e "Posizione dell'origine" (angolo in basso, in alto o centro). Nel foglio c'e lo schema dell'origine: dall'alto per la fresa (X0 Y0 e assi), di lato per il tornio (griffe, asse e Z0 sulla faccia).
- **Sporgenza minima degli utensili** (fresa): per ogni utensile il foglio scrive quanto deve sporgere (profondita del lavoro piu 3 mm) e segna in rosso "TROPPO CORTO" se la sporgenza della tabella utensili non basta.
- **Sequenza delle lavorazioni** nel foglio del lavoro guidato, con utensile, dati di taglio e una casella "Fatta" da spuntare a mano.
- Il foglio si stampa, si salva in PDF o si condivide (WhatsApp, email) come prima.

## 2.34.0 - Simulazione con morsa e mandrino, confronto col disegno, lato B, profili interni
- **Simulazione in tempo reale**: velocita "Reale", "Reale x5", "Reale x20" con il tempo che scorre (anche a meta di un movimento lungo). Tocca una riga del programma e la simulazione va li; "Riga prima" e "Riga dopo".
- **Morsa, mandrino e portautensile**: le ganasce della morsa (fresa), il mandrino con tre griffe (tornio) e il portautensile si vedono in 2D e in 3D. Urti segnalati: fresa contro le ganasce, portautensile contro le ganasce o il pezzo (con la sporgenza della tabella utensili), utensile contro le griffe, lavori oltre la sporgenza dal mandrino. In "Controlla un programma" si scrivono sporgenza dalla morsa, Ø del portautensile e sporgenza dal mandrino; nel lavoro guidato sono ipotizzate.
- **Confronto col disegno** (simulazione dal lavoro guidato): in arancione il materiale che resta, in rosso quello tagliato troppo, con il riassunto in mm³. Spigoli, smussi e filetti non si confrontano (tolleranza 0,2 mm).
- **Tornio, profilo interno completo**: dopo il primo tratto interno se ne aggiungono altri (cilindri o coni) verso il fondo; sgrossatura a passate e finitura con G41.
- **Tornio, smusso sul pezzo che cade** prima della troncatura (C0,5, C1, C2).
- **Tornio, lato B (pezzo girato)**: lunghezza finita e tratti del secondo lato; la troncatura lascia 1 mm, il programma del lato B (numero dopo) fa la sfacciatura a lunghezza e il profilo, con la sua simulazione.
- Simulazione del materiale piu precisa: niente materiale tolto sotto la quota programmata, gole e troncatura dal lato giusto della lama, bareno riconosciuto dentro il foro, punte e centrini a cono, sfacciatura oltre il centro.
- Il controllo della fresa "oltre la lunghezza tagliente" ora si chiama per quello che e: la misura L della tabella utensili e la sporgenza, e il controllo e il portautensile che tocca il pezzo.

## 2.33.0 - Tutti i filetti al tornio, cicli fissi, nuove lavorazioni
- **Filetti al tornio di tutte le famiglie**, esterni e interni: metrici grossi e fini, UNC, UNF, UNEF, gas G, gas R/Rc conico, NPT conico, Whitworth BSW e BSF, trapezio Tr, ACME, Pg. Nel tratto (e nel filetto interno) c'e "Altro filetto": diametro e passo si mettono da soli. Profondita e angolo dell'inserto (60°, 55°, 30°, 29°, 80°) cambiano con la famiglia; i conici crescono 1:16.
- **Correzione**: con il filetto interno la barenatura andava al diametro del filetto (toglieva tutto il materiale da filettare); ora si ferma al nocciolo.
- **Cicli fissi del tornio a scelta** nel passo Lavorazioni: "A passate" o "Con cicli fissi" (G71/G70 profilo, G72 sfacciatura, G74 foratura e gola frontale, G75 gole e troncatura, G76 filetti anche interni). La simulazione li fa tutti, G72 compreso.
- **Tornio, lavori in asse**: centrino prima della punta; foro filettato (preforo e maschio con G32 e M4) o alesato (punta piu piccola e alesatore, misura H7 nel foglio delle misure).
- **Tornio, gole**: gola frontale sulla faccia, gola interna dentro la barenatura, gola di scarico in fondo al filetto interno (si puo spegnere).
- **Fresa, smussi dei bordi** (C0,5, C1, C2) su tasche, tasche tonde, asole, profili e fori, con lo smussatore a punta.
- **Fresa, fori e lamature a fresa**: se nella tabella utensili manca la punta (o il lamatore) di quel diametro, il foro o la lamatura si fanno a fresa a elica.
- Con il linguaggio a cicli a nome, i cicli fissi del tornio restano in ISO: l'app lo dice e consiglia il programma a passate.

## 2.32.1 - Correzione grafica nella spiegazione del programma
- Nella spiegazione riga per riga, le righe dei rapidi (G0) apparivano dentro un riquadro tondo preso dal calcolo rapido della home. Corretto: ora hanno solo la barretta colorata a sinistra come le altre.

## 2.32.0 - 3D vero con three.js
- **Vista 3D vera** nella simulazione (libreria three.js, approvata dall'utente, MIT, inclusa nel programma: non carica nulla dal web). Fresa: il grezzo con il suo materiale che si scava, l'utensile col suo diametro, luci e ombre. Tornio: nuova vista "3D" con il pezzo tornito, tagliato a spicchio per vedere anche l'interno. Si gira con un dito, si ingrandisce con due, doppio tocco per tornare alla vista iniziale.
- Se il telefono non ha WebGL resta il disegno di prima.
- La licenza di three.js e in `docs/LICENZE_TERZI.md`.

## 2.31.0 - Materiale che si asporta, utensile col suo diametro, urti
- **Utensile con le sue misure** nella simulazione della fresa: il cerchio del diametro dall'alto, il corpo con la parte tagliente di fronte e in 3D. Il diametro viene dalla tabella utensili, dal raggio scritto o dal commento del T (es. `T1 M6 (FRESA D10)`); se non si sa, usa 6 mm e lo dice.
- **Materiale che si asporta**: il grezzo diventa il pezzo mentre la simulazione va avanti, in 3D, dall'alto (colorato per profondita) e di fronte (sezione). Nel tornio si vede la sezione del grezzo che si trasforma in pezzo, anche con l'alesatura. Il pulsante "Materiale: si/no" lo toglie. In "Controlla un programma" si scrivono le misure del grezzo (fresa: X, Y, spessore; tornio: diametro, lunghezza, sovrametallo davanti); senza misure il grezzo e ipotizzato e la simulazione lo dice.
- **Urti**: il rapido che entra nel materiale (errore se il grezzo e scritto, avviso se e ipotizzato) e la fresa che taglia piu in profondita della sua lunghezza tagliente (misura L nella tabella utensili). Compaiono nel controllo degli errori.
- E una stima: utensile piatto, inserto del tornio con misure di prova, niente flessioni. Oltre 400.000 movimenti il materiale non si simula.

## 2.30.0 - Spiegazione del programma, correzioni e commento della simulazione
- **Cosa fa il programma** (in "Controlla un programma" e sotto la simulazione): riassunto (macchina, utensili, lavorazioni, tempo, profondita, fori, giri, fine) e il programma diviso per utensile. Ogni lavorazione si apre e mostra, sotto ogni riga, una frase semplice: "Rapido a X 10, Y 10", "Foratura profonda a gradini nel punto X 40 (fondo Z -20, piano R 2, passo Q 4)", "Cambio utensile: monta il T2".
- **Correzione con un tocco** sotto gli errori che si possono sistemare: chiudere la parentesi, aggiungere M6 dopo il T, aggiungere G80 prima di un movimento, aggiungere M30 alla fine. C'e anche "Correggi tutto". Cambia solo il testo: va riletto prima di usarlo.
- **Commento nella simulazione**: sotto il disegno una frase dice cosa sta facendo la macchina in quella riga (con "movimento 2 di 5" dentro i cicli).
- Le frasi sono indicative: i codici meno comuni possono voler dire altro su un controllo diverso. Il programma si controlla sempre con il manuale e a vuoto.

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

