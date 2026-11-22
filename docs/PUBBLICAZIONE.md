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
- **Descrizione breve e lunga** in italiano (partire da `presentazione.html`).
- **Informativa sulla privacy** pubblicata a un indirizzo web (partire da "Note legali e privacy" nell'app): dati solo sul telefono, rete solo per l'invio alla macchina e la condivisione.
- **Dichiarazioni dei dati** del negozio: nessun dato raccolto, permessi usati: fotocamera/foto (pezzi e programmi), rete (invio FTP).
- **Classificazione dei contenuti** (questionario) e **categoria** (Strumenti o Produttivita).
- **Test**: per i nuovi account personali lo store chiede un test chiuso con un certo numero di tester per alcune settimane prima di pubblicare. Va pianificato.

## Rischi da valutare
- Programmi di taglio e dati indicativi: serve il testo "controlla sempre" gia presente; valuta con un consulente la responsabilita se l'app e commerciale.
- L'invio FTP e in chiaro (nessuna cifratura): da dire, o da sostituire con un protocollo cifrato.
- Il riconoscimento del testo usa un componente di terzi: elencarlo nelle note.
