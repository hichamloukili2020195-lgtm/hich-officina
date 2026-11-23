# Pubblicare Hich-Officina su uno store di app (passi proposti, da non fare senza decidere)

Oggi l'app si distribuisce come sito installabile e come APK. Per un negozio di app per Android servono questi passi.

## Prima di tutto: decisioni
1. **Chi pubblica**: un account sviluppatore (a nome tuo o di una ditta; costo una tantum, e per le ditte serve verificare l'identita).
2. **Nome e marchio**: "Hich-Officina" va controllato (non gia usato) prima di pubblicare.
3. **Licenza e uso**: oggi il codice e riservato (nessuna licenza aperta). Decidi se l'app e gratuita, a pagamento o per clienti.
4. **Chiave di firma**: usa una chiave tua, fuori dal repository (README, "Chiave di firma dai segreti"). Con lo store la chiave si affida al negozio: va conservata in un posto sicuro, perderla blocca gli aggiornamenti.

## Cosa serve tecnicamente
- Pacchetto in formato **app bundle** (AAB) firmato, non l'APK. Il lavoro automatico oggi costruisce solo l'APK: va aggiunto il passo AAB.
- **Livello di API** richiesto dallo store (ora target 35): gia a posto, da riverificare a ogni scadenza dello store.
- **Icona** 512x512, **immagine di presentazione** 1024x500 e almeno 2 **schermate** (ci sono in `docs/schermate`).
- **Descrizione breve e lunga** in italiano (partire dalla pagina principale del sito).
- **Informativa sulla privacy** pubblicata a un indirizzo web (partire da "Note legali e privacy" nell'app): dati solo sul telefono, rete solo per l'invio alla macchina e la condivisione.
- **Dichiarazioni dei dati** del negozio: nessun dato raccolto, permessi usati: fotocamera/foto (pezzi e programmi), rete (invio FTP).
- **Classificazione dei contenuti** (questionario) e **categoria** (Strumenti o Produttivita).
- **Test**: per i nuovi account personali lo store chiede un test chiuso con un certo numero di tester per alcune settimane prima di pubblicare. Va pianificato.

## Rischi da valutare
- Programmi di taglio e dati indicativi: serve il testo "controlla sempre" gia presente; valuta con un consulente la responsabilita se l'app e commerciale.
- L'invio FTP e in chiaro (nessuna cifratura): da dire, o da sostituire con un protocollo cifrato.
- Il riconoscimento del testo usa un componente di terzi: elencarlo nelle note.

## Passi con l'account confermato (Play Console)
1. **Crea l'app**: Tutte le app, Crea app. Nome "Hich-Officina" (se e gia preso, un nome in piu dopo il trattino), italiano, App, Gratuita o A pagamento (il prezzo gratuito non si puo cambiare in a pagamento: decidilo prima), categoria Strumenti.
2. **Contenuti dell'app** (menu Criteri e programmi): privacy (indirizzo di `privacy.html`, da compilare con nome, email e data in `sito.json`), annunci: no, accesso all'app: tutto accessibile senza account, pubblico: adulti, sicurezza dei dati (risposte in `docs/SCHEDA_STORE.md`), classificazione dei contenuti (questionario), app governativa: no.
3. **Scheda**: testi da `docs/SCHEDA_STORE.md`; icona `icone/icona-512.png`; immagine di presentazione `docs/store/presentazione-1024x500.png`; schermate da telefono `docs/store/1-...7-*.png` (1080x1920).
4. **Chiave di caricamento e pacchetto AAB**: crea la chiave (fuori dal repository), mettila nei tre segreti di GitHub (`FIRMA_KEYSTORE_B64`, `FIRMA_PASSWORD`, `FIRMA_ALIAS`); alla prossima costruzione il lavoro automatico produce anche l'AAB (release `apk`). Alla prima pubblicazione attiva "Firma dell'app di Play": la chiave vera la custodisce il negozio, la tua serve solo per caricare.
5. **Test chiuso**: per un account personale nuovo servono almeno **12 tester** (con un account Google, iscritti con il link di invito) che restino iscritti per **14 giorni di fila**; poi si chiede l'accesso alla produzione. Tester: amici e colleghi con telefono Android. Va fatto prima di poter pubblicare.
6. **Produzione**: dopo l'approvazione si pubblica; la prima revisione puo durare qualche giorno.

### Attenzione alle due chiavi
La chiave con cui sono firmati gli APK di oggi sta nel repository, che e pubblico: chiunque potrebbe firmare con quella. Per il negozio si usa una chiave nuova e segreta. Chi ha installato l'APK a mano dovra **disinstallare e reinstallare** quando passa alla versione del negozio (le firme sono diverse): prima fa la copia di sicurezza dei dati dall'app.
