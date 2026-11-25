# AUDIT di Hich-Officina (versione 2.35.0)

Analisi senza modifiche al codice. Serve a decidere cosa fare del lavoro richiesto (grafica, CAD touch, CAM guidato, funzioni da officina). Alla fine ci sono le domande che bloccano la partenza.

## 1. Com'e fatta l'app davvero

**Non e un'app Android nativa.** E un sito a pagine statiche in JavaScript puro (senza framework) che gira dentro una WebView; l'app Android (`android/`, un solo file Java di 477 righe piu un FTP di 92) fa da contenitore e da ponte per cio che la WebView non sa fare: salvataggio file, condivisione, stampa, fotocamera, lettura del testo dalle foto (ML Kit), invio FTP.

| Parte | Come e fatta | Dimensione |
|---|---|---|
| Logica (calcoli, programmi, CAD, CAM, simulazione) | moduli JS senza interfaccia, provabili in Node (`calcoli.js`, `programmi.js`, `iso.js`, `cad.js`, `lavoro.js`, `ciclo.js`, `profilo.js`, `filetti.js`, `materiale.js`, `spiega.js`, `post.js`) | circa 5.000 righe |
| Interfaccia | `schermi_*.js` + `app.js` + `stile.css`, canvas 2D per il disegno, three.js (in locale) per il 3D | circa 5.000 righe |
| Android | WebView + ponte JS, firma, AAB/APK dal lavoro automatico di GitHub | 570 righe Java |
| Funzionamento senza rete | service worker + tutti i file in locale | gia c'e |
| Prove | 67 prove unitarie, 339 controlli di interfaccia (Playwright), prova a tappeto (2.873 combinazioni), controllo versione e sito | tutte verdi |

Dipendenze: nessuna nel JS (three.js e un file locale, MIT), ML Kit per il testo sul telefono.

## 2. Mappa delle schermate e delle funzioni

- **Home**: calcolo rapido di velocita e avanzamento in primo piano, ricerca, 4 gruppi (Disegna e lavora, Calcola, Controlla, Officina), "continua l'ultimo lavoro".
- **Disegna e lavora** (`lavoro`): 4 passi (grezzo, forma, lavorazioni, programma). Tornio: tratti a quote con tastierino, filetti di tutte le famiglie, gole, tolleranze, foro in asse, barenatura interna a tratti, lato B, troncatura con smusso. Fresa: tasche, fori, fori a cerchio e griglia, asole, profili, smussi. Lavorazioni proposte con regole di officina, cicli fissi a scelta, costo, foglio di attrezzaggio, simulazione, confronto col disegno.
- **CAD fresa** (`cad`): disegno a tocco (linee, rettangoli, cerchi, punti, asole, profili), mirino sopra il dito, snap, annulla con due dita e ripeti con tre, schermo intero e rotazione, lavorazioni per entita, percorso mostrato sul disegno.
- **Disegno del tornio** (`disegno`): profilo a linee, zoom e pan con due dita, 3D.
- **Dal disegno** e **foto del disegno**: lettura delle quote con posizione (ML Kit), conferma una per una, proposta tornio e fresa.
- **Controlla un programma** (`apri`): incolla, file o foto dello schermo; controllo errori con correzione a un tocco; riassunto, lavorazioni, spiegazione riga per riga; grezzo, staffe, morsa, mandrino.
- **Simulazione** (`simula`): 2D e 3D, materiale che si asporta, utensile con il suo diametro, urti, tempo reale, salto alla riga, commento, confronto col disegno.
- **Programma ISO / listato / macro**: generatori (fresa, fori, tornio), macro con tastatura, listato con ricerca e modifica, invio FTP, 3 linguaggi macchina.
- **Calcoli**: velocita di taglio e avanzamento, tolleranze ISO IT01-IT18 con accoppiamenti, filetti (13 famiglie), coni, barra seno, ingranaggi, divisore, dilatazione, potenza, rugosita, peso, triangolo, angolo da foto.
- **Officina**: tabella utensili, materiali modificabili, pezzi (foto con didascalia, misure da controllare, foglio di attrezzaggio in PDF), programmi salvati, copia di sicurezza.
- Impostazioni (tema scuro/chiaro/auto, modalita guanti, sfondo, giri massimi, post-processor, ecc.) e guida.

## 3. Confronto con quello che chiedi (cosa c'e, cosa manca)

Legenda: **C** = c'e, **P** = c'e in parte, **M** = manca.

### Fase 1 - grafica
| Richiesta | Stato | Nota |
|---|---|---|
| Material 3 / Compose | M | l'app e web: servirebbe riscrivere tutto (vedi domande) |
| Tema officina scuro e chiaro, alto contrasto | C | scuro blu, chiaro, "contrasto" e "guanti" in impostazioni; contrasto AA provato |
| Target touch 56-64 dp, numeri monospace | P | modalita guanti ingrandisce; il resto ha 44-50 px; numeri monospace nel listato, non ovunque |
| Feedback aptico, animazioni brevi | P | ponte Android per orientamento e salvataggi, nessuna vibrazione |
| Home a schede (CAD, CAM, Calcolatori, Utensili, Archivio) | P | home a 4 gruppi con calcolo rapido; barra in basso Home/Preferiti/Impostazioni |
| Telefono e tablet adattivo, orizzontale per il CAD | C | layout a due colonne in orizzontale, CAD a schermo intero |
| Italiano e inglese | M | tutti i testi sono nel codice in italiano |

### Fase 2 - CAD touch
| Richiesta | Stato |
|---|---|
| Pan/pinch, doppio tap = adatta, pressione lunga = menu | P (pan, pinch e "Adatta" ci sono; doppio tap e pressione lunga no) |
| Mirino sopra il dito, snap | P (estremo/centro/griglia; mancano punto medio, intersezione, tangente; manca la lente) |
| Tastierino numerico, coordinate assolute/incrementali/polari, espressioni | P (tastierino grande si; polari ed espressioni no) |
| Linea, polilinea, cerchio, rettangolo, asola | C |
| Arco (3 modalita), poligono, raccordo, smusso, offset, taglia/estendi, specchia, ruota, scala, serie | M (raccordi e smussi esistono come proprieta dei vertici dei profili) |
| Quote parametriche modificabili, vincoli | M (le quote si scrivono, non guidano la geometria) |
| Annulla/ripeti illimitati, layer, selezione a finestra, pannello proprieta | P (annulla/ripeti si; layer e finestra no; pannello dell'elemento si) |
| Modalita tornio con mezzo profilo e quote in diametro | C |
| Import/export DXF, PDF e PNG del disegno quotato | M (esistono foglio di attrezzaggio PDF e programmi, non il disegno) |
| 60 fps con migliaia di entita, struttura spaziale | M (disegno ridisegnato per intero: va bene fino a qualche centinaio di entita; mai misurato con migliaia) |

### Fase 3 - CAM
| Richiesta | Stato |
|---|---|
| Procedura guidata Grezzo, Utensile, Lavorazione, Parametri, Simulazione, G-code | C (4 passi, utensili proposti dalla tabella) |
| Spianatura, contornatura con compensazione, tasca, foratura G81/G83/G84, spirale | C |
| Tasca con isole, incisione di testo | M |
| Tornio: G71/G70, G72, G74, G75, G76, gole, filetti, sfacciatura, compensazione inserto | C |
| Simulazione animata con rimozione materiale, collisioni, rapidi evidenziati | C (tempo reale, urti con morsa/mandrino/portautensile, confronto col disegno) |
| Post-processor: Fanuc, Haas, Siemens, Heidenhain, Mazak, personalizzato | P (ISO "compatibile Fanuc e simili", cicli a nome Siemens, dialogo Heidenhain; mancano Haas, Mazak e il profilo personalizzabile) |
| Stima tempo e lunghezze | C (tempo; lunghezza dei percorsi nei riassunti) |
| Editor G-code con evidenziazione e backplot da G-code importato | C (listato colorato, simulazione di qualsiasi programma ISO) |

### Fase 4 - funzioni da officina
| Richiesta | Stato |
|---|---|
| Dati di taglio collegati a materiali e utensili | C (potenza assorbita compresa) |
| Libreria utensili personale | C (tabella con diametro, lunghezza, taglienti, passo, note) |
| Tolleranze ISO 286 | P (gradi IT01-IT18 e lettere piu usate; mancano le lettere rare) |
| Tabelle filettature con preforo e dati tornio | C (13 famiglie) |
| Calcolatori (triangolo, fori su circonferenza, conicita, barra seno, Ra, peso, mm/pollici) | C |
| Durezze HRC/HB/HV, equivalenze EN/AISI/W.Nr. dei materiali | P (HRC presente nei dati; manca la tabella di conversione e le equivalenze) |
| Preventivo rapido | C |
| Archivio commesse con foto, note, ricerca | P (pezzi con foto e note; ricerca per cliente/codice debole) |
| PDF di disegno + G-code + scheda; QR | P (foglio e programmi in PDF/condivisione; disegno e QR mancano) |
| Tutto offline | C |

## 4. Problemi trovati

**Grafica e UX**
1. Molti testi lunghi nei campi e nelle note: sul telefono piccolo vanno a capo male (visto nelle schermate di prova a 360 px).
2. Il CAD non ha doppio tap per adattare la vista ne pressione lunga: i gesti sono incompleti rispetto a un CAD vero.
3. Le schermate nuove (simulazione, foglio, confronto) sono dense: tanti pulsanti piccoli ("chip") uno sotto l'altro nella simulazione.
4. La barra in basso ha solo tre voci: la navigazione per "CAD / CAM / Calcolatori / Utensili / Archivio" richiede due tocchi dalla home.
5. Nessuna lingua oltre l'italiano.

**Prestazioni**
6. Il disegno del CAD ridisegna tutte le entita a ogni movimento: con migliaia di entita scatterebbe. Non misurato.
7. La vista 3D usa istanze per ogni cella (circa 22.000): su telefoni economici da misurare. Il materiale non si simula oltre 400.000 movimenti.
8. `three.min.js` pesa 750 KB e si carica all'avvio anche quando il 3D non serve.

**Bug e rischi**
9. La simulazione del materiale e una stima (utensile piatto, inserto di prova, niente flessioni): puo segnalare urti che non ci sono o perderne. Gia dichiarato nel foglio e nelle note, ma va tenuto d'occhio con programmi veri.
10. Il lato B del tornio e il G76 interno, il G72/G74 frontali e i filetti conici non sono mai stati provati su una macchina.
11. Nessuna prova su un Android 15 o 16 vero: i margini di sistema sono stati corretti ma non visti.
12. Le prove di interfaccia usano un browser desktop con il telefono emulato: il tocco vero (guanti, mani sporche, due dita) non e provato.

**Debiti tecnici**
13. File lunghi che fanno troppo: `schermi_lavoro.js` (523 righe con righe molto lunghe), `schermi_iso.js` (simulazione, apri, listato insieme), `calcoli.js` (964 righe, generatori del tornio in un solo `if` per lavorazione).
14. Le funzioni di interfaccia sono provate soprattutto dal browser; poche prove unitarie sul disegno (canvas).
15. Formato dei dati: tutto in `localStorage` (una sola chiave JSON) e le foto in IndexedDB. Va bene per ora; con archivio grande e DXF diventa stretto.
16. Nessun modulo separato "cad-core / cam-core / ui": i moduli di logica sono gia senza interfaccia, ma stanno in un'unica cartella e con funzioni globali sull'oggetto `Officina`.

## 5. Piano di lavoro proposto (a fasi, con priorita e complessita)

Il piano **non** riscrive l'app in Compose: parte da quello che c'e e colma i vuoti, una fase alla volta, con un rilascio per fase. Complessita: B bassa (1 giorno di lavoro), M media (2-4), A alta (una settimana o piu).

| Fase | Contenuto | Priorita | Complessita |
|---|---|---|---|
| 0 | Questo audit; decisioni sotto | - | B |
| 1 | **Grafica**: target piu grandi e numeri monospace ovunque; navigazione in basso a 5 voci (Home, CAD, CAM, Calcoli, Archivio); feedback aptico (ponte Android); riordino della simulazione (barra unica, comandi raccolti); italiano e inglese con file di testi | alta | M (lingue: A) |
| 2 | **CAD**: doppio tap = adatta, pressione lunga = menu, lente sotto il dito, snap completo (punto medio, intersezione, tangente), polari ed espressioni nel tastierino, arco 3 modalita, offset/specchia/ruota/scala/serie, layer, selezione a finestra, quote guida con vincoli base, struttura spaziale e misura a 60 fps | alta | A |
| 3 | **Esportazioni**: DXF in e out, PDF e PNG del disegno quotato, QR di condivisione | media | M-A (DXF: serve un lettore scritto da noi, senza librerie) |
| 4 | **CAM**: tasca con isole, incisione di testo, post-processor Haas e Mazak e profilo personalizzabile | media | M-A |
| 5 | **Officina**: durezze HRC/HB/HV, equivalenze dei materiali, tolleranze ISO complete (servono le tue tabelle), archivio con ricerca per cliente e codice | media | M |
| 6 | **Prestazioni e solidita**: misura con migliaia di entita, caricamento a richiesta di three.js, divisione dei file lunghi, prove sul tocco vero con i tester | alta | M |

Regole che resto a rispettare: prima la prova che fissa il comportamento, poi la modifica; un rilascio per blocco con tutte le prove verdi; niente librerie nuove senza il tuo permesso; i marchi solo come "compatibile con controlli ...", senza loghi; l'avviso "il G-code va verificato prima di lavorare" resta in ogni programma.

## 6. Domande che bloccano la partenza

1. **Compose o no?** La tua richiesta parte da Android nativo con Jetpack Compose e Material 3. L'app e web dentro una WebView, con circa 10.000 righe di logica e interfaccia e 400 controlli automatici. Riscriverla in Compose significherebbe rifare tutto da capo (mesi, e il test chiuso di Google Play ripartirebbe da zero). **Consiglio: restare sul web**, rifare la grafica in stile Material 3 con il nostro CSS, e tenere Android solo come contenitore. Dimmi se vuoi davvero la riscrittura.
2. **Lingue**: inglese solo, o altre? Ogni lingua costa un file di testi da mantenere a ogni versione.
3. **DXF**: va bene un lettore e scrittore scritto da noi (linee, archi, cerchi, polilinee, testi) senza librerie? E piu lento ma rispetta la regola delle librerie.
4. **Post-processor**: Haas e Mazak vanno scritti come "compatibile con controlli ..." (eccezione ai nomi di marca gia decisa). Confermi?
5. **Priorita**: partiamo dalla Fase 1 (grafica e navigazione) o dalla Fase 2 (CAD)? Io consiglio 1 poi 2, con un rilascio per fase.
6. **Test chiuso**: ogni versione nuova carica un AAB nuovo; durante i 14 giorni di test e meglio non cambiare troppo la grafica. Vuoi aspettare la fine del test per le fasi grosse?
