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
  const NON_QUOTE = /\b(scala|foglio|disegnato|data|rev|revisione|materiale|trattamento|tolleranze generali|iso\s*2768|massa|peso|cliente|codice|n\.?\s*disegno|quantit|firma|sostituisce|denominazione|rugosit|spigoli|bavatur|vietat|propriet)/i;
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
  function quoteDaRighe(righe, W, H) {
    const out = [];
    let id = 1;
    (righe || []).forEach(r => {
      const t = String(r.t || '').trim();
      if (!t || NON_QUOTE.test(t)) return;
      const parole = (t.match(/[A-Za-zàèéìòù]{4,}/g) || []).length;
      if (parole >= 3) return;   // una frase, non una quota
      const Q = O.estraiQuote(t);
      const verticale = r.r === 90 || r.r === 270 || (r.h > r.w * 1.6 && t.length > 2);
      Q.forEach((q, k) => {
        if (q.tipo === 'lunghezza' && Q.some(z => z !== q && (z.tipo === 'diametro' || z.tipo === 'filetto' || z.tipo === 'fori'))) return;   // il numero e gia dentro un'altra quota
        if (q.tipo === 'tolleranza' && Q.some(z => z.tipo === 'diametro' && z.toll === q.valore)) return;
        if (q.tipo === 'diametro' && Q.some(z => z.tipo === 'fori' && z.d === q.valore)) return;   // gia nei fori ripetuti
        if (q.tipo === 'filetto' && Q.some(z => z.tipo === 'fori' && z.filetto && z.filetto.d === q.d)) return;
        out.push(Object.assign({}, q, { id: id++, x: (r.x + r.w / 2) / W, y: (r.y + r.h / 2) / H, w: r.w / W, h: r.h / H, verticale, ordine: k, stato: 'da', riga: t }));
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
    const L = Q.filter(q => q.tipo === 'lunghezza').sort((a, b) => b.valore - a.valore);
    const orizz = L.filter(q => !q.verticale), vert = L.filter(q => q.verticale);
    let lx = orizz[0] ? orizz[0].valore : L[0] ? L[0].valore : NaN;
    let ly = vert[0] ? vert[0].valore : (L.find(q => q.valore !== lx) || {}).valore;
    if (orizz[0]) usate.add(orizz[0].id); else if (L[0]) usate.add(L[0].id);
    const qy = vert[0] || L.find(q => q.valore === ly && !usate.has(q.id));
    if (qy) usate.add(qy.id);
    if (!(lx > 0) || !(ly > 0)) dubbi.push('Non ho trovato lunghezza e larghezza del pezzo: scrivile.');
    // lo spessore: una quota con "sp" vicino, altrimenti la piu piccola tra le rimaste che non e un passo di fori
    const sp = Q.find(q => q.tipo === 'lunghezza' && /\bsp|spess|\bs\s*=/i.test(q.riga || ''));
    let lz = sp ? sp.valore : NaN;
    if (sp) usate.add(sp.id); else dubbi.push('Spessore del pezzo non trovato: scrivilo.');
    const cx = (lx || 100) / 2, cy = (ly || 60) / 2;
    // fori ripetuti
    Q.filter(q => q.tipo === 'fori').forEach(q => {
      usate.add(q.id);
      const base = q.filetto ? { foro: 'maschio', d: q.filetto.d, passo: q.filetto.p } : { foro: q.toll ? 'alesato' : 'foro', d: q.d, toll: q.toll || undefined };
      base.passante = true;
      if (q.n === 4 || q.n === 2) forme.push(Object.assign({ tipo: 'foriGriglia', x0: 10, y0: 10, nx: 2, ny: q.n === 4 ? 2 : 1, px: Math.max(10, (lx || 100) - 20), py: q.n === 4 ? Math.max(10, (ly || 60) - 20) : 0 }, base));
      else forme.push(Object.assign({ tipo: 'foriCerchio', cx, cy, dc: Math.round(Math.min(cx, cy) * 1.4), n: q.n, a0: 0 }, base));
      dubbi.push(q.n + ' fori ' + (q.filetto ? 'M' + q.filetto.d : 'Ø' + q.d) + ': la posizione non si legge con sicurezza, controlla lo schema e le quote.');
    });
    // filetti e fori singoli
    const giaFori = new Set(Q.filter(q => q.tipo === 'fori').map(q => (q.filetto ? 'M' + q.filetto.d : 'D' + q.d)));
    Q.filter(q => q.tipo === 'filetto' && !giaFori.has('M' + q.d)).forEach(q => { usate.add(q.id); forme.push({ tipo: 'foro', x: cx, y: cy, d: q.d, passo: q.p, foro: 'maschio', passante: true }); dubbi.push('Filetto M' + q.d + ': scrivi la posizione.'); });
    Q.filter(q => q.tipo === 'diametro' && !giaFori.has('D' + q.valore)).forEach(q => {
      usate.add(q.id);
      if (q.valore >= 16) forme.push({ tipo: 'tascaTonda', cx, cy, dt: q.valore, prof: lz > 0 ? lz : 5 });
      else forme.push({ tipo: 'foro', x: cx, y: cy, d: q.valore, foro: q.toll ? 'alesato' : 'foro', toll: q.toll || undefined, passante: true });
      dubbi.push('Ø' + q.valore + ': scrivi la posizione.');
    });
    return { grezzo: { lx: lx > 0 ? lx : '', ly: ly > 0 ? ly : '', lz: lz > 0 ? lz : '', sovraZ: 1, contorna: false }, forme, dubbi, usate: Array.from(usate) };
  }

  /** Tornio o fresa? Piu diametri in fila che fori: tornio. */
  function modoDalDisegno(quote) {
    const Q = valide(quote);
    const d = Q.filter(q => q.tipo === 'diametro').length, f = Q.filter(q => q.tipo === 'fori').length;
    return d >= 2 && f === 0 ? 'tornio' : f > 0 || d <= 1 ? 'fresa' : 'tornio';
  }

  const DisegnoFoto = { quoteDaRighe, proponiTornio, proponiFresa, modoDalDisegno, materialeDa, barraPer };
  Object.assign(O, DisegnoFoto);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
