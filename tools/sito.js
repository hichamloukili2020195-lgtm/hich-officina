// Genera le pagine del sito (index, guida, novita, privacy, 404) da una sola fonte.
//   node tools/sito.js            scrive le pagine
//   node tools/sito.js --controlla   non scrive: fallisce se le pagine non sono aggiornate (usato dalle prove)
// I dati personali (nome, email, data, indirizzo del file APK, dominio) stanno in sito.json: vuoti = non si mostrano.
'use strict';
const fs = require('fs'), path = require('path');
const radice = path.join(__dirname, '..');
const cfg = Object.assign({ nome: '', email: '', data: '', apkUrl: '', dominio: '' }, JSON.parse(fs.readFileSync(path.join(radice, 'sito.json'), 'utf8')));
const GUIDA = require('../guida_dati.js');
const versione = JSON.parse(fs.readFileSync(path.join(radice, 'package.json'), 'utf8')).version;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const base = cfg.dominio ? 'https://' + cfg.dominio.replace(/^https?:\/\//, '').replace(/\/$/, '') + '/' : '';

const NAV = [['index.html', 'Home'], ['index.html#funzioni', 'Funzioni'], ['index.html#installa', 'Installa'], ['guida.html', 'Guida'], ['novita.html', 'Novita'], ['privacy.html', 'Privacy']];

function pagina({ file, titolo, descrizione, corpo, attiva, indicizza = true }) {
  const t = titolo === 'Hich-Officina' ? 'Hich-Officina: calcoli e programmi CNC per fresa e tornio' : titolo + ' · Hich-Officina';
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t)}</title>
<meta name="description" content="${esc(descrizione)}">
<meta name="theme-color" content="#0b1220">
${indicizza ? '' : '<meta name="robots" content="noindex">\n'}<meta property="og:type" content="website">
<meta property="og:title" content="${esc(t)}">
<meta property="og:description" content="${esc(descrizione)}">
${base ? '<meta property="og:image" content="' + base + 'icone/icona-512.png">\n<link rel="canonical" href="' + base + (file === 'index.html' ? '' : file) + '">\n' : ''}<link rel="icon" href="icone/icona.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icone/icona-192.png">
<link rel="stylesheet" href="sito.css">
</head>
<body>
<a class="salta" href="#contenuto">Vai al contenuto</a>
<header class="testata"><div class="largo">
  <a class="marchio" href="index.html"><img src="icone/icona.svg" alt="" width="32" height="32"><span>Hich-Officina</span></a>
  <nav aria-label="Principale"><ul>${NAV.map(([h, n]) => `<li><a href="${h}"${attiva === h ? ' aria-current="page"' : ''}>${n}</a></li>`).join('')}</ul></nav>
  <a class="pul corto" href="app.html">Apri l'app</a>
</div></header>
<main id="contenuto">
${corpo}
</main>
<footer class="piede"><div class="largo">
  <p><b>Hich-Officina</b> ${esc(versione)}${cfg.nome ? ' · ' + esc(cfg.nome) : ''}</p>
  <p class="piccolo">I valori di taglio e i programmi sono di partenza e indicativi: vanno sempre controllati e provati a vuoto prima di lavorare. I nomi dei controlli citati nell'app indicano solo la compatibilita e appartengono ai rispettivi proprietari.</p>
  <p class="piccolo"><a href="privacy.html">Privacy</a> · <a href="guida.html">Guida</a> · <a href="novita.html">Novita</a>${cfg.email ? ' · <a href="mailto:' + esc(cfg.email) + '">' + esc(cfg.email) + '</a>' : ''}</p>
</div></footer>
</body>
</html>
`;
}

const FUNZIONI = [
  ['Programmi di fresa, foratura e tornio', 'Spianatura, tasche, profili con G41/G42, fori con tutti i cicli, filetti, troncatura e cicli fissi. Piu lavorazioni in un programma, nell\'ordine di officina.'],
  ['Controllo e simulazione', 'Trova gli errori riga per riga, anche da una foto dello schermo. Simulazione animata con quote, giri, centro fresa e urti con le staffe.'],
  ['Dalla foto del disegno al pezzo', 'L\'app legge le quote e dove stanno sul disegno, le numera sulla foto e tu le confermi una per una: diventano il pezzo e il programma.'],
  ['Disegna e lavora in 4 passi', 'Grezzo, forma a quote con il tastierino grande, lavorazioni proposte dalle regole di officina, programma con tempo e utensili. Uguale per fresa e tornio.'],
  ['Mini CAD/CAM per fresa e tornio', 'Disegni col dito, a schermo intero e girando il telefono: profili, fori, tasche, asole, filetti e gole. A ogni disegno dai la lavorazione e l\'app scrive il programma e lo simula.'],
  ['Ciclo di lavoro proposto', 'Dal pezzo, o dalle quote di un disegno, alla lavorazione completa con utensili e dati di taglio.'],
  ['Dati di taglio e tabelle', 'Giri e avanzamenti per utensile e materiale, tolleranze ISO, codici G e M e la tabella dei filetti: metrici, pollici, gas, NPT, trapezi, Whitworth e altri.'],
  ['Macro, pezzi, attrezzaggio', 'Modelli di macro con simulazione, fogli di attrezzaggio da stampare, foto e controllo delle misure.']
];
const SCHERMATE = [['home', 'Home con i quattro ingressi', 'Home'], ['lavoro', 'Lavoro guidato: la forma a quote', 'Disegna e lavora'], ['listato', 'Programma ISO generato', 'Programma'], ['simulazione', 'Simulazione a pannello con quote e giri', 'Simulazione'],
  ['cad', 'Disegno della fresa con le lavorazioni', 'CAD fresa'], ['disegno', 'Disegno del profilo del tornio', 'CAD tornio'], ['angolo', 'Angolo misurato su una foto', 'Angolo da una foto'], ['ciclo', 'Ciclo di lavoro proposto per una piastra', 'Ciclo proposto']];
const DOMANDE = [
  ['Funziona senza internet?', 'Si. Dopo la prima apertura l\'app funziona senza rete. La rete serve solo per mandare un programma alla macchina o condividere un file.'],
  ['Dove vanno i miei dati?', 'Restano sul tuo telefono. Non c\'e un account, non c\'e pubblicita e non c\'e nessun tracciamento. Per non perderli, fai ogni tanto la copia di sicurezza dall\'app.'],
  ['Quanto sono affidabili i valori di taglio?', 'Sono valori di partenza per utensili in metallo duro. Vanno adattati a macchina, fissaggio e utensile, e ogni programma va provato a vuoto. Puoi sostituirli con i tuoi.'],
  ['Posso mandare il programma alla macchina?', 'Con l\'app Android si invia via FTP alla macchina, nella stessa rete. In alternativa copi il programma, lo salvi come file o lo condividi.'],
  ['Per quali macchine fa i programmi?', 'Per fresa a tre assi e tornio, in ISO, con due altri linguaggi di controllo. Nessun linguaggio e stato provato su una macchina vera: prova sempre a vuoto la prima volta.'],
  ['Serve installare qualcosa?', 'No: si apre dal browser e si puo aggiungere alla schermata Home. Per la lettura delle foto e l\'invio alla macchina serve l\'app Android (APK).']
];

function indexHtml() {
  const apk = cfg.apkUrl;
  return pagina({ file: 'index.html', titolo: 'Hich-Officina', attiva: 'index.html',
    descrizione: 'Calcoli di taglio, programmi ISO, macro, simulazione e controllo degli errori per fresatori e tornitori. Sul telefono, anche senza rete.',
    corpo: `<script>if (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone) location.replace('app.html' + location.hash);</script>
<section class="eroe"><div class="largo eroe-griglia">
  <div>
    <p class="sopra">Per fresatori e tornitori</p>
    <h1>Calcoli e programmi CNC, in tasca.</h1>
    <p class="sotto">Calcoli di taglio, programmi ISO di fresa e tornio, macro, simulazione e controllo degli errori. Sul telefono, anche senza rete.</p>
    <p class="azioni"><a class="pul" href="app.html">Apri l'app</a> <a class="pul sec" id="apk" href="#installa" data-apk="${esc(apk)}">Scarica l'APK Android</a></p>
    <p class="piccolo">Nessun account, nessuna pubblicita, i dati restano sul telefono.</p>
  </div>
  <div class="telefono"><img class="eroe-img" src="docs/schermate/home.png" alt="La home dell'app con il menu delle funzioni" width="390" height="844"></div>
</div></section>
<section id="funzioni" class="sezione"><div class="largo">
  <h2>Cosa fa</h2>
  <div class="griglia">${FUNZIONI.map(([t, d]) => `<div class="scheda"><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('')}</div>
</div></section>
<section class="sezione"><div class="largo">
  <h2>Le schermate</h2>
  <div class="schermate" role="list">${SCHERMATE.map(([f, alt, d]) => `<figure role="listitem"><img src="docs/schermate/${f}.png" alt="${esc(alt)}" loading="lazy" height="520"><figcaption>${esc(d)}</figcaption></figure>`).join('')}</div>
</div></section>
<section id="installa" class="sezione"><div class="largo">
  <h2>Come si installa</h2>
  <div class="griglia due">
    <div class="scheda"><h3>Dal browser</h3><ol><li>Apri <a href="app.html">l'app</a> dal browser del telefono.</li><li>Dal menu scegli "Installa app" (o "Aggiungi a schermata Home").</li><li>Dopo la prima apertura funziona anche senza rete.</li></ol></div>
    <div class="scheda"><h3>App Android (APK)</h3><ol><li>Scarica il file con il pulsante qui sopra.</li><li>Aprilo e consenti l'installazione da quella fonte.</li><li>Aggiunge la lettura delle foto, l'invio alla macchina e il salvataggio dei file.</li></ol></div>
  </div>
  <p class="piccolo">Gli aggiornamenti si installano sopra la versione vecchia e i dati restano. Prima di aggiornare fai la copia di sicurezza dall'app (Impostazioni).</p>
</div></section>
<section class="sezione"><div class="largo">
  <h2>Domande frequenti</h2>
  ${DOMANDE.map(([d, r]) => `<details class="dom"><summary>${esc(d)}</summary><p>${esc(r)}</p></details>`).join('\n  ')}
</div></section>
<section class="sezione"><div class="largo"><p class="avviso"><b>Da sapere:</b> i valori di taglio e i programmi sono di partenza e indicativi. La responsabilita di quello che si lavora e di chi usa il programma. Leggi anche la <a href="guida.html">guida</a> e l'<a href="privacy.html">informativa sulla privacy</a>.</p></div></section>
<script>(function () { var a = document.getElementById('apk'); if (!a) return; var u = a.getAttribute('data-apk'); if (!u) { var h = location.hostname.split('.'), r = location.pathname.split('/')[1]; if (h.length >= 3 && r && h[1] === 'github') u = 'https://github.com/' + h[0] + '/' + r + '/releases/download/apk/Hich-Officina.apk'; } if (u) a.href = u; else a.hidden = true; })();</script>` });
}

function guidaHtml() {
  return pagina({ file: 'guida.html', titolo: 'Guida', attiva: 'guida.html', descrizione: 'Come si fa: ogni funzione di Hich-Officina in pochi passi, con un esempio.',
    corpo: `<section class="sezione"><div class="largo stretto">
  <h1>Come si fa</h1>
  <p class="sotto">Ogni funzione in pochi passi, con un esempio. La stessa guida e nell'app, con il pulsante per stampare o salvare in PDF.</p>
  <ul class="indice">${GUIDA.map(g => `<li><a href="#${g.id}">${esc(g.t)}</a></li>`).join('')}</ul>
  ${GUIDA.map(g => `<article id="${g.id}" class="guida"><h2>${esc(g.t)}</h2><ol>${g.passi.map(p => `<li>${esc(p)}</li>`).join('')}</ol>${g.esempio ? `<p class="esempio"><b>Esempio:</b> ${esc(g.esempio)}</p>` : ''}${g.attenzione ? `<p class="avviso"><b>Attenzione:</b> ${esc(g.attenzione)}</p>` : ''}</article>`).join('\n  ')}
</div></section>` });
}

function novitaHtml() {
  const md = fs.readFileSync(path.join(radice, 'CHANGELOG.md'), 'utf8');
  const voci = [];
  md.split(/^## /m).slice(1).forEach(b => {
    const righe = b.split('\n'), m = /^([\d.]+) - (.*)$/.exec(righe[0]);
    if (!m) return;
    voci.push({ v: m[1], t: m[2], punti: righe.slice(1).filter(r => /^- /.test(r)).map(r => r.slice(2)) });
  });
  return pagina({ file: 'novita.html', titolo: 'Novita', attiva: 'novita.html', descrizione: 'Cronologia delle versioni di Hich-Officina.',
    corpo: `<section class="sezione"><div class="largo stretto">
  <h1>Novita</h1>
  <p class="sotto">Cosa e cambiato in ogni versione, dalla piu recente.</p>
  ${voci.map(v => `<article class="versione"><h2><span class="num">${esc(v.v)}</span> ${esc(v.t)}</h2><ul>${v.punti.map(p => `<li>${esc(p)}</li>`).join('')}</ul></article>`).join('\n  ')}
</div></section>` });
}

function privacyHtml() {
  const nome = cfg.nome ? esc(cfg.nome) : '<mark>[NOME SVILUPPATORE: da compilare in sito.json]</mark>';
  const email = cfg.email ? '<a href="mailto:' + esc(cfg.email) + '">' + esc(cfg.email) + '</a>' : '<mark>[EMAIL DI CONTATTO: da compilare in sito.json]</mark>';
  const data = cfg.data ? esc(cfg.data) : '<mark>[DATA]</mark>';
  return pagina({ file: 'privacy.html', titolo: 'Informativa sulla privacy', attiva: 'privacy.html', descrizione: 'Hich-Officina non raccoglie ne invia dati personali: tutto resta sul tuo telefono.',
    corpo: `<section class="sezione"><div class="largo stretto">
<h1>Informativa sulla privacy</h1>
<p class="piccolo">App: Hich-Officina · Ultimo aggiornamento: ${data}</p>
<p class="riquadro"><b>In breve:</b> Hich-Officina non raccoglie, non invia e non vende dati personali. Tutto quello che scrivi o crei resta sul tuo telefono. Non c'e un account e non c'e pubblicita.</p>
<h2>Chi siamo</h2>
<p>L'app e pubblicata da <b>${nome}</b>. Contatto per qualsiasi domanda sulla privacy: <b>${email}</b>.</p>
<h2>Quali dati usa l'app</h2>
<ul>
<li><b>Dati che inserisci:</b> misure, programmi, macro, pezzi, utensili, materiali, note e impostazioni. Sono salvati solo sul tuo telefono, nella memoria dell'app.</li>
<li><b>Foto:</b> le foto di programmi, disegni e pezzi si scattano o si scelgono tu; sono lette e salvate sul telefono. Il riconoscimento del testo dalle foto avviene sul telefono, senza inviare nulla in rete.</li>
<li><b>Copie di sicurezza e file:</b> li crei tu e scegli tu dove mandarli (per esempio un servizio di archiviazione o la posta). L'app non li invia da sola. La password della macchina non viene inclusa nelle copie.</li>
</ul>
<h2>Uso della rete</h2>
<p>L'app non contatta server dell'autore. Usa la rete solo quando lo chiedi tu: per inviare un programma alla macchina all'indirizzo che scrivi nelle impostazioni (invio FTP, non cifrato: usalo solo in una rete di cui ti fidi) e quando condividi un file con un'altra app. Non contiene pubblicita, strumenti di analisi o di tracciamento.</p>
<h2>Autorizzazioni</h2>
<ul>
<li><b>Rete:</b> solo per l'invio alla macchina.</li>
<li><b>Fotocamera e foto:</b> si usano tramite il selettore di sistema, solo quando premi i pulsanti per aggiungere una foto.</li>
<li><b>Salvataggio file:</b> i programmi esportati vanno nella cartella Download/Hich-Officina o dove scegli tu.</li>
</ul>
<h2>Condivisione con terzi</h2>
<p>Nessun dato viene condiviso con terzi dall'app. Il riconoscimento del testo usa un componente software installato con l'app, che lavora sul telefono.</p>
<h2>Conservazione e cancellazione</h2>
<p>I dati restano sul telefono finche non li cancelli o non disinstalli l'app: in quel caso si perdono. Non abbiamo copie, quindi non possiamo recuperarli: usa la copia di sicurezza dell'app.</p>
<h2>Minori</h2>
<p>L'app e uno strumento di lavoro e non e rivolta ai bambini.</p>
<h2>Modifiche</h2>
<p>Se questa informativa cambia, la nuova versione e pubblicata a questo indirizzo con la data di aggiornamento.</p>
<h2>Responsabilita</h2>
<p>I valori di taglio e i programmi dell'app sono indicativi e vanno sempre controllati prima di lavorare.</p>
</div></section>` });
}

function nonTrovata() {
  return pagina({ file: '404.html', titolo: 'Pagina non trovata', descrizione: 'Pagina non trovata.', indicizza: false,
    corpo: `<section class="sezione"><div class="largo stretto"><h1>Pagina non trovata</h1><p class="sotto">L'indirizzo non esiste piu o e scritto male.</p><p class="azioni"><a class="pul" href="index.html">Torna alla home</a> <a class="pul sec" href="app.html">Apri l'app</a></p></div></section>` });
}

const robots = 'User-agent: *\nAllow: /\n' + (base ? 'Sitemap: ' + base + 'sitemap.xml\n' : '');
// l'indirizzo di contatto per "Segnala un problema" nell'app: copiato da sito.json, mai scritto a mano nel codice
const contatto = '// Generato da tools/sito.js da sito.json: non modificare.\nwindow.CONTATTO = ' + JSON.stringify(cfg.email || '') + ';\n';
const PAGINE = { 'contatto.js': contatto, 'index.html': indexHtml(), 'guida.html': guidaHtml(), 'novita.html': novitaHtml(), 'privacy.html': privacyHtml(), '404.html': nonTrovata(), 'robots.txt': robots };
if (base) PAGINE['sitemap.xml'] = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ['', 'guida.html', 'novita.html', 'privacy.html'].map(p => '  <url><loc>' + base + p + '</loc></url>').join('\n') + '\n</urlset>\n';

const controlla = process.argv.includes('--controlla');
let fuori = [];
for (const f in PAGINE) {
  const p = path.join(radice, f);
  const attuale = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  if (attuale !== PAGINE[f]) { fuori.push(f); if (!controlla) fs.writeFileSync(p, PAGINE[f]); }
}
if (controlla) { if (fuori.length) { console.error('Pagine del sito non aggiornate: ' + fuori.join(', ') + '. Lancia: node tools/sito.js'); process.exit(1); } console.log('sito aggiornato'); }
else console.log(fuori.length ? 'scritte: ' + fuori.join(', ') : 'niente da cambiare');
