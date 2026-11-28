// ===== Hich-Officina: dal disegno (foto) al pezzo, senza interfaccia =====
// La lettura del telefono da righe di testo con la loro posizione sulla foto. Qui ogni riga diventa una o piu quote
// (diametro, lunghezza, filetto, fori, smusso, raggio, tolleranza) con il suo posto; poi si propone il pezzo:
// per il tornio i diametri in fila lungo l'asse con le loro lunghezze, per la fresa misure, fori e filetti.
// Niente va nel pezzo senza conferma: le quote scartate non contano, i dubbi si dicono.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  const r3 = x => Math.round(x * 1000) / 1000;

  // righe del cartiglio e note: non sono quote
  const NON_QUOTE = /\b(scala|foglio|disegnato|data|rev|revisione|materiale|trattamento|tolleranze|iso\s*2768|massa|peso|cliente|codice|n\.?\s*disegno|quantit|firma|sostituisce|denominazione|rugosit|spigoli|bavatur|vietat|propriet|dove non|smussi|raggi|angoli|concentricit|perpendicol|parallelism|planarit|approvato|titolo|soggetto|documento|dettaglio|sezione|marcatura|zona|dimensioni in|formato|class|size|pag\.)/i;
  const DATA = /\b\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}\b/;
  // cartigli e note in inglese e tedesco (disegni che arrivano da fuori)
  const NON_QUOTE_ESTERO = /\b(places?|view|sheet|scale|drawn|draw|check(ed)?|date|material|weight|title|tolerance|deburr|edges|stainless|steel|section|detail|surface|finish|unless|otherwise|specified|dimensions|initiale|gewicht|format|massstab|ma(ss|ß)stab|blatt|werkstoff|datum|zeichnung|name|approved|part|qty|quantity|revision|units?)\b/i;
  const SCALA = /\b\d+\s*:\s*\d+\b/;                          // 2:1, A-A (1:1), C(4:1)
  const NORMA = /\b(DIN|ISO|UNI|EN|ANSI|ASME|JIS|BS)\s*\d/;       // E 0,4x0,2 DIN 509: il numero della norma non e una quota
  const RUGOSITA = /^\s*(Ra\s*)?\d+[.,]\d+\s*[\/√]|√|\bRa\s*\d/;  // 1,6/  3,2/(√)
  const GEOMETRICA = /^[^\dA-Za-z]*\d*[.,]?\d+\s+[A-F](\s*[A-F])*\s*$/;  // 0,02 B (tolleranza geometrica con il riferimento)
  // numeri di richiamo nei cerchietti: soli (7), tra parentesi davanti ((22) 8+0,1) o in fondo a una quota (Ø30 31, 3 (20))
  const RICHIAMO_SOLO = /^\(?\s*(\d{1,2})\s*\)?$/, RICHIAMO_DAVANTI = /^\(\s*(\d{1,2})\s*\)\s+(?=\S)/, RICHIAMO_DIETRO = /(\S)\s+\(?(\d{1,2})\)?\s*$/;
  /** Ci sono i richiami numerati? Tanti numeri piccoli diversi che coprono buona parte di 1..N. */
  function conRichiami(righe) {
    const visti = new Set();
    (righe || []).forEach(r => {
      const t = String(r.t || '').trim();
      let m = RICHIAMO_SOLO.exec(t);
      if (m && (!(r.w > 0) || !(r.h > 0) || r.w <= 2.6 * Math.max(r.h, 1) || r.h <= 2.6 * r.w)) visti.add(Number(m[1]));
      if ((m = RICHIAMO_DAVANTI.exec(t))) visti.add(Number(m[1]));
      if ((m = RICHIAMO_DIETRO.exec(t)) && /[Øø⌀R±°]|\d\s*[xX×]|[+\-]\s*\d|\d[.,]\d|\d/.test(t.slice(0, m.index + 1))) visti.add(Number(m[2]));
    });
    visti.delete(0);
    if (visti.size < 6) return false;
    const max = Math.max(...visti);
    return visti.size >= 0.4 * max;
  }
  /** Il materiale scritto nel cartiglio, se e uno di quelli dell'app. */
  function materialeDa(righe, materiali) {
    const testo = righe.map(r => r.t).join(' \n ');
    if (!/materiale|mat\./i.test(testo)) return null;
    const lista = (materiali || []).map((m, i) => ({ i, n: String(m.n || '') })).filter(m => m.n.length >= 3);
    for (const r of righe) {
      if (!/materiale|mat\./i.test(r.t)) continue;
      const m = lista.find(x => r.t.toLowerCase().includes(x.n.toLowerCase().split(/[ (]/)[0]));
      if (m) return m.i;
    }
    return null;
  }

  /**
   * Dalle righe lette alle quote. righe = [{t, x, y, w, h, r}] in pixel, W e H la misura della foto.
   * Ritorna [{id, tipo, testo, valore, d, p, n, toll, x, y, w, h (da 0 a 1), verticale, stato:'da'}]
   */
  /** Un richiamo di fori su piu righe: N°4 Fori Ø13 / Passanti / Lamatura Ø18.5 / Prof.lamatura 13 / Equidistanti / A 180°. */
  const INIZIO_FORI = /(?:^|\s)(?:[Nn]\s*°\s*|[Nn]\.\s*|[Nn]r\.?\s*)?\d{1,3}\s*(?:x|X|×)?\s*(?:[Ff]ori|FORI)\b/;
  function gruppoFori(testo) {
    const t = String(testo).replace(/[⌀Ø∅ø]/g, 'Ø').replace(/(\d),(\d)/g, '$1.$2');
    const n = /(?:[Nn]\s*°\s*|[Nn]\.\s*|[Nn]r\.?\s*)?(\d{1,3})\s*(?:x|X|×)?\s*(?:fori)/i.exec(t);
    if (!n) return null;
    const dopo = t.slice(n.index + n[0].length);
    const fil = /M\s*(\d+(?:\.\d+)?)(?:\s*[xX×]\s*(\d+(?:\.\d+)?))?/.exec(dopo), dia = /Ø\s*(\d+(?:\.\d+)?)\s*((?:js|JS|[A-Za-z])\d{1,2}(?![\d.]))?/.exec(dopo);
    if (!fil && !dia) return null;
    const usaFil = fil && (!dia || fil.index < dia.index);
    const g = { tipo: 'gruppoFori', n: Number(n[1]) };
    if (usaFil) { g.d = Number(fil[1]); g.passo = fil[2] ? Number(fil[2]) : passoGrosso(g.d); g.foro = 'maschio'; }
    else { g.d = Number(dia[1]); g.toll = dia[2] || ''; g.foro = g.toll ? 'alesato' : 'foro'; }
    g.spina = /spin/i.test(t);
    const lam = /lamatur[ae]\s*Ø\s*(\d+(?:\.\d+)?)/i.exec(t) || (/di\s+cui/i.test(t) && /lamati\s+Ø?\s*(\d+(?:\.\d+)?)/i.exec(t));
    if (lam) g.lamD = Number(lam[1]);
    const lp = /prof\.?\s*lamatura\s*(\d+(?:\.\d+)?)/i.exec(t);
    if (lp) g.lamProf = Number(lp[1]);
    const pf = /prof\.?\s*foro\s*(\d+(?:\.\d+)?)|profondit[aà]\s*(\d+(?:\.\d+)?)/i.exec(t.replace(/prof\.?\s*lamatura\s*\d+(?:\.\d+)?/i, ' '));
    if (pf) g.prof = Number(pf[1] || pf[2]);
    g.passante = /passant/i.test(t) || (!pf && !/cieco|ciechi/i.test(t));
    g.equidistanti = /equidist/i.test(t);
    g.a180 = /\b180\s*°/.test(t);
    const parz = /di\s+cui\s+(\d+)\s+lamat/i.exec(t);
    if (parz) g.lamati = Number(parz[1]);
    g.testo = 'N°' + g.n + ' Fori ' + (g.spina ? 'spina ' : '') + (g.foro === 'maschio' ? 'M' + g.d + (fil[2] ? 'x' + fil[2] : '') : 'Ø' + g.d + (g.toll ? ' ' + g.toll : '')) + (g.passante ? ' Passanti' : g.prof ? ' Prof.foro ' + g.prof : '') +
      (g.lamD ? ' Lamatura Ø' + g.lamD + (g.lamProf ? ' Prof.lamatura ' + g.lamProf : '') : '') + (g.equidistanti ? ' Equidistanti' : '') + (g.a180 ? ' A 180°' : '');
    return g;
  }
  const passoGrosso = d => (O.passoGrosso ? O.passoGrosso(d) : 1);
  /** Le quote di un testo scritto (anche un richiamo intero): quello che si usa per correggere e aggiungere. */
  function quoteDaTesto(t) {
    if (INIZIO_FORI.test(t)) { const g = gruppoFori(t); if (g) return [g]; }
    return O.estraiQuote(t);
  }

  /** Righe vicine, una sotto l'altra e allineate a sinistra, sono lo stesso richiamo. */
  function blocchi(righe, W, H) {
    const R = (righe || []).map((r, i) => Object.assign({ i }, r)).filter(r => String(r.t || '').trim());
    R.sort((a, b) => a.y - b.y || a.x - b.x);
    const usate = new Set(), out = [];
    R.forEach(r => {
      if (usate.has(r.i)) return;
      usate.add(r.i);
      const b = [r];
      if (INIZIO_FORI.test(r.t) && !(r.r === 90 || r.r === 270)) {
        let u = r;
        for (;;) {
          const dopo = R.find(z => !usate.has(z.i) && !(z.r === 90 || z.r === 270) && Math.abs(z.x - r.x) < 0.04 * W && z.y >= u.y && z.y - (u.y + u.h) < 1.3 * Math.max(u.h, 8) && !INIZIO_FORI.test(z.t));
          if (!dopo) break;
          b.push(dopo); usate.add(dopo.i); u = dopo;
        }
      }
      out.push(b);
    });
    return out.sort((a, b) => a[0].i - b[0].i);   // nell'ordine della lettura
  }

  /**
   * Dalle righe lette alle quote. righe = [{t, x, y, w, h, r}] in pixel, W e H la misura della foto.
   * Ritorna [{id, tipo, testo, valore, d, p, n, toll, x, y, w, h (da 0 a 1), verticale, stato:'da'}]
   */
  function quoteDaRighe(righe, W, H) {
    const out = [];
    let id = 1;
    const richiami = conRichiami(righe);
    blocchi(righe, W, H).forEach(b => {
      const r = b[0];
      const x0 = Math.min(...b.map(z => z.x)), y0 = Math.min(...b.map(z => z.y)), x1 = Math.max(...b.map(z => z.x + z.w)), y1 = Math.max(...b.map(z => z.y + z.h));
      const box = { x: (x0 + x1) / 2 / W, y: (y0 + y1) / 2 / H, w: (x1 - x0) / W, h: (y1 - y0) / H };
      const verticale = r.r === 90 || r.r === 270 || (r.h > r.w * 1.6 && String(r.t).length > 2);
      // un richiamo di fori: una quota sola con tutto dentro
      if (b.length > 1 || INIZIO_FORI.test(r.t)) {
        const testo = b.map(z => z.t).join(' ');
        const g = INIZIO_FORI.test(r.t) ? gruppoFori(testo) : null;
        if (g) { out.push(Object.assign(g, box, { id: id++, verticale, stato: 'da', riga: testo })); return; }
      }
      b.forEach(z => {
        let t = String(z.t || '').trim();
        if (!t || NON_QUOTE.test(t) || DATA.test(t) || NON_QUOTE_ESTERO.test(t) || SCALA.test(t) || NORMA.test(t) || RUGOSITA.test(t) || GEOMETRICA.test(t)) return;
        if (richiami) {
          const solo = RICHIAMO_SOLO.exec(t);
          if (solo) {   // resta nella lista, scartato: se era davvero una quota si riprende con la spunta
            out.push({ tipo: 'lunghezza', testo: solo[1], valore: Number(solo[1]), id: id++, x: (z.x + z.w / 2) / W, y: (z.y + z.h / 2) / H, w: z.w / W, h: z.h / H, verticale: false, ordine: 0, stato: 'no', motivo: 'numero di richiamo (nel cerchietto)', riga: t });
            return;
          }
          t = t.replace(RICHIAMO_DAVANTI, '');
          const m = RICHIAMO_DIETRO.exec(t);
          if (m && /[Øø⌀R±°]|\d\s*[xX×]|[+\-]\s*\d|\d[.,]\d|\d/.test(t.slice(0, m.index + 1))) t = t.slice(0, m.index + 1);
        }
        const parole = (t.match(/[A-Za-zàèéìòù]{4,}/g) || []).length;
        if (parole >= 3) return;   // una frase, non una quota
        const Q = O.estraiQuote(t);
        const vert = z.r === 90 || z.r === 270 || (z.h > z.w * 1.6 && t.length > 2);
        Q.forEach((q, k) => {
          if (q.tipo === 'lunghezza' && Q.some(u => u !== q && (u.tipo === 'diametro' || u.tipo === 'filetto' || u.tipo === 'fori' || u.tipo === 'cava'))) return;   // il numero e gia dentro un'altra quota
          if (q.tipo === 'tolleranza' && Q.some(u => u.tipo === 'diametro' && u.toll === q.valore)) return;
          if (q.tipo === 'diametro' && Q.some(u => u.tipo === 'fori' && u.d === q.valore)) return;   // gia nei fori ripetuti
          if (q.tipo === 'filetto' && Q.some(u => u.tipo === 'fori' && u.filetto && u.filetto.d === q.d)) return;
          out.push(Object.assign({}, q, { id: id++, x: (z.x + z.w / 2) / W, y: (z.y + z.h / 2) / H, w: z.w / W, h: z.h / H, verticale: vert, ordine: k, stato: 'da', riga: t }));
        });
      });
    });
    return out;
  }

  const valide = Q => (Q || []).filter(q => q.stato !== 'no');

  /** Barra commerciale: il primo diametro tondo sopra il pezzo con almeno 2 mm sul diametro. */
  function barraPer(d) {
    const serie = [6, 8, 10, 12, 14, 15, 16, 18, 20, 22, 25, 28, 30, 32, 35, 36, 38, 40, 42, 45, 50, 55, 60, 63, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 125, 130, 140, 150, 160, 180, 200, 220, 250, 280, 300];
    return serie.find(x => x >= d + 2) || Math.ceil((d + 3) / 10) * 10;
  }

  /**
   * Proposta per il tornio. opz = {invertito: true se la testa e dall'altra parte}.
   * Ritorna {tratti, grezzo:{dg, lg}, smussoTesta, dubbi:[], asse:'x'|'y', usate:[id]}
   */
  function proponiTornio(quote, opz) {
    opz = opz || {};
    const Q = valide(quote), dubbi = [], usate = new Set();
    const D = Q.filter(q => (q.tipo === 'diametro' && q.valore > 0) || (q.tipo === 'filetto' && q.d > 0));
    if (!D.length) return { errore: 'Nel disegno non ho trovato diametri (Ø) ne filetti (M): aggiungili o correggili.' };
    // l'asse del pezzo: la direzione in cui i diametri sono piu sparsi
    const spread = k => Math.max(...D.map(q => q[k])) - Math.min(...D.map(q => q[k]));
    const asse = D.length < 2 || spread('x') >= spread('y') ? 'x' : 'y';
    const pos = q => q[asse];
    // diametri in fila lungo l'asse; un filetto sopra lo stesso diametro gli si unisce
    let fila = D.slice().sort((a, b) => pos(a) - pos(b)).map(q => ({ q, d: q.tipo === 'filetto' ? q.d : q.valore, fil: q.tipo === 'filetto' ? q.p : 0, toll: q.toll || '', pos: pos(q) }));
    const unite = [];
    fila.forEach(f => {
      const u = unite[unite.length - 1];
      if (u && Math.abs(u.d - f.d) < 1e-6 && Math.abs(u.pos - f.pos) < 0.06) { if (f.fil) u.fil = f.fil; if (f.toll && !u.toll) u.toll = f.toll; u.ids.push(f.q.id); return; }
      unite.push(Object.assign(f, { ids: [f.q.id] }));
    });
    fila = unite;
    // la testa: dove c'e il filetto, altrimenti dove c'e il diametro piu piccolo
    let testaAllaFine = false;
    const iFil = fila.findIndex(f => f.fil > 0);
    if (iFil >= 0) testaAllaFine = iFil > (fila.length - 1) / 2;
    else testaAllaFine = fila[fila.length - 1].d < fila[0].d;
    if (opz.invertito) testaAllaFine = !testaAllaFine;
    if (testaAllaFine) fila.reverse();
    // tolleranze isolate: al diametro piu vicino
    Q.filter(q => q.tipo === 'tolleranza').forEach(q => {
      let best = null, bd = 0.15;
      fila.forEach(f => { const d = Math.hypot(f.q.x - q.x, f.q.y - q.y); if (d < bd) { bd = d; best = f; } });
      if (best && !best.toll && !/^[A-Z]/.test(q.valore)) { best.toll = q.valore; usate.add(q.id); }
    });
    // lunghezze: a ogni diametro la quota lineare piu vicina lungo l'asse, tra quelle dentro il suo tratto
    const lineari = Q.filter(q => q.tipo === 'lunghezza');
    const lungo = lineari.filter(q => (asse === 'x' ? !q.verticale : q.verticale) || lineari.length <= fila.length + 1);
    // la quota piu grande e il totale se ci sono piu lunghezze che diametri, oppure se sta su un'altra fila di quote
    const perp = asse === 'x' ? 'y' : 'x';
    const massima = lungo.slice().sort((a, b) => b.valore - a.valore)[0];
    const altre = lungo.filter(q => q !== massima);
    const filaDiversa = massima && altre.length && Math.abs(massima[perp] - altre.reduce((s, q) => s + q[perp], 0) / altre.length) > 0.04 && massima.valore > altre.reduce((s, q) => Math.max(s, q.valore), 0);
    const totale = massima && (lungo.length > fila.length || filaDiversa) ? massima.valore : NaN;
    const bordi = fila.map((f, i) => {
      const prima = i > 0 ? (f.pos + fila[i - 1].pos) / 2 : -Infinity, dopo = i < fila.length - 1 ? (f.pos + fila[i + 1].pos) / 2 : Infinity;
      return [Math.min(prima, dopo), Math.max(prima, dopo)];
    });
    const libere = lungo.filter(q => !(isFinite(totale) && fila.length > 1 && q.valore === totale && lungo.filter(z => z.valore === totale).length === 1));
    const presa = new Set();
    fila.forEach((f, i) => {
      const [a, b] = bordi[i];
      const qui = libere.filter(q => !presa.has(q.id) && q[asse] >= a && q[asse] <= b).sort((u, v) => Math.abs(u[asse] - f.pos) - Math.abs(v[asse] - f.pos));
      if (qui.length) { f.l = qui[0].valore; f.lId = qui[0].id; presa.add(qui[0].id); usate.add(qui[0].id); }
    });
    // una sola lunghezza mancante: dal totale
    const senza = fila.filter(f => !(f.l > 0));
    if (senza.length === 1 && isFinite(totale) && fila.length > 1) {
      const resto = totale - fila.filter(f => f.l > 0).reduce((s, f) => s + f.l, 0);
      if (resto > 0) { senza[0].l = r3(resto); senza[0].calcolata = true; dubbi.push('Lunghezza del Ø' + senza[0].d + ' ricavata dal totale ' + totale + ': controllala.'); const t = lungo.find(q => q.valore === totale); if (t) usate.add(t.id); }
    } else if (fila.length === 1 && !(fila[0].l > 0) && isFinite(totale)) { fila[0].l = totale; const t = lungo.find(q => q.valore === totale); if (t) usate.add(t.id); }
    fila.filter(f => !(f.l > 0)).forEach(f => dubbi.push('Manca la lunghezza del Ø' + f.d + ': scrivila.'));
    const somma = fila.reduce((s, f) => s + (f.l > 0 ? f.l : 0), 0);
    if (isFinite(totale) && fila.length > 1 && fila.every(f => f.l > 0) && Math.abs(somma - totale) > 0.01 && fila.every(f => !f.calcolata)) dubbi.push('La somma delle lunghezze (' + r3(somma) + ') non torna con il totale ' + totale + ': forse alcune quote partono dalla testa.');
    // smussi e raggi: il primo smusso va sulla testa, gli altri sugli spigoli
    const smussi = Q.filter(q => q.tipo === 'smusso'), raggi = Q.filter(q => q.tipo === 'raggio');
    const smussoTesta = smussi.length ? 'C' + smussi[0].valore : '';
    smussi.forEach(q => usate.add(q.id));
    raggi.forEach(q => usate.add(q.id));
    fila.forEach(f => f.ids.forEach(x => usate.add(x)));
    const tratti = fila.map((f, i) => {
      const t = { tipo: 'cil', d: f.d, l: f.l > 0 ? f.l : '' };
      if (f.fil) { t.fil = f.fil; if (i < fila.length - 1 && fila[i + 1].d > f.d) t.gola = Math.max(3, Math.round(2 * f.fil * 10) / 10); }
      if (f.toll) t.toll = f.toll;
      if (i < fila.length - 1 && fila[i + 1].d > f.d) t.spigolo = smussi[1] ? 'C' + smussi[1].valore : raggi[0] ? 'R' + raggi[0].valore : '';
      return t;
    });
    for (let i = 1; i < tratti.length; i++) if (tratti[i].d < tratti[i - 1].d) { dubbi.push('Il Ø' + tratti[i].d + ' e piu piccolo del Ø' + tratti[i - 1].d + ' che viene prima: serve una seconda presa, oppure la testa e dall\'altra parte (Inverti).'); break; }
    const dMax = Math.max(...tratti.map(t => t.d));
    const lTot = tratti.reduce((s, t) => s + (Number(t.l) || 0), 0);
    return { tratti, grezzo: { dg: barraPer(dMax), lg: Math.ceil(lTot + 15) }, smussoTesta, dubbi, asse, usate: Array.from(usate), testaAllaFine };
  }

  /**
   * Proposta per la fresa: misure del pezzo dalle tre quote piu grandi, fori e filetti in gruppi.
   * Ritorna {grezzo:{lx, ly, lz}, forme, dubbi, usate}
   */
  function proponiFresa(quote) {
    const Q = valide(quote), dubbi = [], usate = new Set(), forme = [];
    const G = Q.filter(q => q.tipo === 'gruppoFori');
    const D = Q.filter(q => q.tipo === 'diametro').sort((a, b) => b.valore - a.valore);
    const L = Q.filter(q => q.tipo === 'lunghezza').sort((a, b) => b.valore - a.valore);
    // pezzo tondo (flangia, disco): il diametro piu grande e piu grande di ogni lunghezza e ci sono fori su cerchio
    const tondo = (G.length || Q.some(q => q.tipo === 'fori')) && D.length >= 2 && (!L.length || D[0].valore >= L[0].valore);
    let lx, ly, cx, cy;
    if (tondo) {
      lx = ly = D[0].valore; cx = cy = lx / 2; usate.add(D[0].id);
      dubbi.push('Pezzo tondo Ø' + lx + ': nella fresa l\'origine e nell\'angolo del quadrato di ' + lx + ' mm, il centro e X' + r3(cx) + ' Y' + r3(cy) + '. Diametri esterni e foro centrale si fanno al tornio.');
    } else {
      const orizz = L.filter(q => !q.verticale), vert = L.filter(q => q.verticale);
      lx = orizz[0] ? orizz[0].valore : L[0] ? L[0].valore : NaN;
      ly = vert[0] ? vert[0].valore : (L.find(q => q.valore !== lx) || {}).valore;
      if (orizz[0]) usate.add(orizz[0].id); else if (L[0]) usate.add(L[0].id);
      const qy = vert[0] || L.find(q => q.valore === ly && !usate.has(q.id));
      if (qy) usate.add(qy.id);
      if (!(lx > 0) || !(ly > 0)) dubbi.push('Non ho trovato lunghezza e larghezza del pezzo: scrivile.');
      cx = (lx || 100) / 2; cy = (ly || 60) / 2;
    }
    // lo spessore: una quota con "sp" vicino
    const sp = Q.find(q => q.tipo === 'lunghezza' && /\bsp|spess|\bs\s*=/i.test(q.riga || ''));
    const lz = sp ? sp.valore : NaN;
    if (sp) usate.add(sp.id); else dubbi.push('Spessore del pezzo non trovato: scrivilo.');
    // richiami di fori: su un cerchio (i diametri dei cerchi dei fori, dal piu grande); la scritta "spina" li lega
    const angoli = Q.filter(q => q.tipo === 'angolo').map(q => q.valore);
    const cerchi = D.filter(q => !usate.has(q.id)).map(q => ({ q, spina: /spin/i.test(q.riga || ''), preso: false }));
    const ordine = G.slice().sort((a, b) => (a.spina ? 1 : 0) - (b.spina ? 1 : 0) || b.n - a.n);
    const base = g => {
      const f = { foro: g.foro, d: g.d, passante: g.passante !== false };
      if (g.foro === 'maschio') f.passo = g.passo;
      if (g.toll) f.toll = g.toll;
      if (!f.passante && g.prof > 0) f.prof = g.prof;
      if (g.lamD > 0) { f.lamD = g.lamD; f.lamProf = g.lamProf > 0 ? g.lamProf : r3(g.d * 0.6); }
      return f;
    };
    ordine.forEach(g => {
      usate.add(g.id);
      const ok = c => !c.preso && c.q.valore > 2 * g.d && c.q.valore < (tondo ? lx : Infinity);
      const c = (g.spina && cerchi.find(z => z.spina && ok(z))) || cerchi.find(z => !z.spina && ok(z)) || cerchi.find(ok);
      const nome = g.n + ' fori ' + (g.foro === 'maschio' ? 'M' : 'Ø') + g.d;
      if (g.n === 1) { forme.push(Object.assign({ tipo: 'foro', x: cx, y: cy }, base(g))); dubbi.push(nome + ': scrivi la posizione.'); return; }
      let dc = NaN;
      if (c) { c.preso = true; dc = c.q.valore; usate.add(c.q.id); }
      else dubbi.push(nome + ': non ho trovato il diametro del cerchio dei fori, scrivilo.');
      const passo = 360 / g.n, mezzo = angoli.find(a => Math.abs(a - passo / 2) < 0.01);
      const a0 = g.a180 ? 0 : mezzo !== undefined ? mezzo : 0;
      forme.push(Object.assign({ tipo: 'foriCerchio', cx, cy, dc: dc > 0 ? dc : Math.round(Math.min(cx, cy) * 1.4), n: g.n, a0 }, base(g)));
      dubbi.push(nome + (dc > 0 ? ' sul cerchio Ø' + dc : '') + ', primo foro a ' + a0 + '° dall\'asse X: controlla cerchio e angolo.' + (g.lamati && g.lamati < g.n ? ' Solo ' + g.lamati + ' sono lamati: separali nel passo Forma.' : ''));
    });
    // fori ripetuti scritti su una riga sola
    Q.filter(q => q.tipo === 'fori').forEach(q => {
      usate.add(q.id);
      const b = q.filetto ? { foro: 'maschio', d: q.filetto.d, passo: q.filetto.p } : { foro: q.toll ? 'alesato' : 'foro', d: q.d, toll: q.toll || undefined };
      b.passante = true;
      if (q.n === 4 || q.n === 2) forme.push(Object.assign({ tipo: 'foriGriglia', x0: 10, y0: 10, nx: 2, ny: q.n === 4 ? 2 : 1, px: Math.max(10, (lx || 100) - 20), py: q.n === 4 ? Math.max(10, (ly || 60) - 20) : 0 }, b));
      else forme.push(Object.assign({ tipo: 'foriCerchio', cx, cy, dc: Math.round(Math.min(cx, cy) * 1.4), n: q.n, a0: 0 }, b));
      dubbi.push(q.n + ' fori ' + (q.filetto ? 'M' + q.filetto.d : 'Ø' + q.d) + ': la posizione non si legge con sicurezza, controlla lo schema e le quote.');
    });
    // filetti e fori singoli (non nei pezzi tondi: li i diametri rimasti sono del tornio)
    const giaFori = new Set(Q.filter(q => q.tipo === 'fori').map(q => (q.filetto ? 'M' + q.filetto.d : 'D' + q.d)));
    Q.filter(q => q.tipo === 'filetto' && !giaFori.has('M' + q.d)).forEach(q => { usate.add(q.id); forme.push({ tipo: 'foro', x: cx, y: cy, d: q.d, passo: q.p, foro: 'maschio', passante: true }); dubbi.push('Filetto M' + q.d + ': scrivi la posizione.'); });
    Q.filter(q => q.tipo === 'diametro' && !usate.has(q.id) && !giaFori.has('D' + q.valore)).forEach(q => {
      if (tondo) { dubbi.push('Ø' + q.valore + ': diametro del tornio o foro da fare? Se va fresato, aggiungilo nel passo Forma.'); return; }
      usate.add(q.id);
      if (q.valore >= 16) forme.push({ tipo: 'tascaTonda', cx, cy, dt: q.valore, prof: lz > 0 ? lz : 5 });
      else forme.push({ tipo: 'foro', x: cx, y: cy, d: q.valore, foro: q.toll ? 'alesato' : 'foro', toll: q.toll || undefined, passante: true });
      dubbi.push('Ø' + q.valore + ': scrivi la posizione.');
    });
    Q.filter(q => q.tipo === 'cava').forEach(q => { usate.add(q.id); dubbi.push('Fresatura ' + q.larghezza + ' profondita ' + q.prof + ': aggiungila come asola larga ' + q.larghezza + ' nel passo Forma, dove va.'); });
    return { grezzo: { lx: lx > 0 ? lx : '', ly: ly > 0 ? ly : '', lz: lz > 0 ? lz : '', sovraZ: tondo ? 0 : 1, contorna: false }, forme, dubbi, usate: Array.from(usate), tondo };
  }

  /** Tornio o fresa? Piu diametri in fila che fori: tornio. */
  function modoDalDisegno(quote) {
    const Q = valide(quote);
    const d = Q.filter(q => q.tipo === 'diametro').length, f = Q.filter(q => q.tipo === 'fori' || q.tipo === 'gruppoFori').length;
    return d >= 2 && f === 0 ? 'tornio' : f > 0 || d <= 1 ? 'fresa' : 'tornio';
  }

  const DisegnoFoto = { quoteDaTesto, quoteDaRighe, proponiTornio, proponiFresa, modoDalDisegno, materialeDa, barraPer };
  Object.assign(O, DisegnoFoto);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
