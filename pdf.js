// ===== Hich-Officina: disegno in PDF (scritto da noi, nessuna libreria) =====
// scriviPDF(entita, opz) -> testo PDF tutto ASCII (si salva come un normale file di testo). Una pagina A4 con il disegno in scala,
// le quote (se richieste), il cartiglio con le righe di testo e, se c'e, un codice QR disegnato con quadratini.
// opz: {titolo, righe:[testo], quote: bool, qr: matrice di qrMatrice | null, data}
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  const PT = 72 / 25.4;                       // punti per mm
  const f2 = x => (Math.round(x * 100) / 100 + 0).toString();
  const num = v => { const n = Number(String(v === undefined || v === null ? '' : v).replace(',', '.')); return v === '' || v === null || v === undefined ? NaN : n; };
  const SCALE = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01];   // 100 = 100:1 ... 0.01 = 1:100

  /** Testo per PDF: tra parentesi, con i caratteri speciali e gli accenti in ottale (codifica WinAnsi). */
  function testoPdf(t) {
    let o = '';
    for (const ch of String(t === undefined || t === null ? '' : t)) {
      const c = ch.codePointAt(0);
      if (ch === '(' || ch === ')' || ch === '\\') o += '\\' + ch;
      else if (c >= 32 && c < 127) o += ch;
      else if (c === 0x20AC) o += '\\200';
      else if (c >= 0xA0 && c <= 0xFF) o += '\\' + c.toString(8);
      else if (c === 10 || c === 13 || c === 9) o += ' ';
      else o += '?';
    }
    return '(' + o + ')';
  }
  function polilinee(e) {
    if (e.tipo === 'punto') return { croce: { x: num(e.x), y: num(e.y) } };
    const pr = O.profiloCAD(e);
    if (!pr) return null;
    const g = O.costruisciProfilo(pr.punti.map(p => ({ a: p.x, b: p.y, tratto: p.tratto, r: p.r, raccordo: p.raccordo, smusso: p.smusso })), pr.chiuso);
    if (g.errore || !g.tratti.length) return { poli: pr.punti.map(p => ({ a: p.x, b: p.y })), chiuso: pr.chiuso };
    return { poli: O.polilineaProfilo(g.tratti, 0.15), chiuso: pr.chiuso };
  }

  function scriviPDF(entita, opz) {
    opz = opz || {};
    const E = (entita || []).filter(e => O.limitiCAD([e]));
    const b = O.limitiCAD(E) || { x0: 0, y0: 0, x1: 10, y1: 10 };
    const bw = Math.max(b.x1 - b.x0, 1), bh = Math.max(b.y1 - b.y0, 1);
    const orizzontale = bw >= bh;
    const PW = orizzontale ? 297 : 210, PH = orizzontale ? 210 : 297, M = 12, CART = 34;
    const aw = PW - 2 * M - 16, ah = PH - 2 * M - CART - 16;          // area utile del disegno (con spazio per le quote)
    const scala = SCALE.find(s => bw * s <= aw && bh * s <= ah) || SCALE[SCALE.length - 1];
    const ox = M + 8 + (aw - bw * scala) / 2, oy = M + CART + 8 + (ah - bh * scala) / 2;   // origine della pagina (mm) per x0, y0 del disegno
    const X = x => (ox + (x - b.x0) * scala) * PT, Y = y => (oy + (y - b.y0) * scala) * PT;
    const c = [];
    const testo = (x, y, t, dim, grassetto) => c.push('BT /F' + (grassetto ? 2 : 1) + ' ' + f2(dim) + ' Tf ' + f2(x) + ' ' + f2(y) + ' Td ' + testoPdf(t) + ' Tj ET');
    const larg = (t, dim) => String(t).length * dim * 0.52;
    // cornice
    c.push('0.5 w ' + f2(M * PT) + ' ' + f2(M * PT) + ' ' + f2((PW - 2 * M) * PT) + ' ' + f2((PH - 2 * M) * PT) + ' re S');
    c.push(f2(M * PT) + ' ' + f2((M + CART) * PT) + ' m ' + f2((PW - M) * PT) + ' ' + f2((M + CART) * PT) + ' l S');
    // disegno
    c.push('0 G 0.8 w');
    E.forEach(e => {
      const q = polilinee(e); if (!q) return;
      if (q.croce) { const x = X(q.croce.x), y = Y(q.croce.y); c.push(f2(x - 4) + ' ' + f2(y) + ' m ' + f2(x + 4) + ' ' + f2(y) + ' l ' + f2(x) + ' ' + f2(y - 4) + ' m ' + f2(x) + ' ' + f2(y + 4) + ' l S'); return; }
      q.poli.forEach((p, i) => c.push(f2(X(p.a)) + ' ' + f2(Y(p.b)) + (i ? ' l' : ' m')));
      c.push(q.chiuso ? 'h S' : 'S');
      if (e.tipo === 'cerchio') { const x = X(num(e.cx)), y = Y(num(e.cy)); c.push('0.3 w ' + f2(x - 5) + ' ' + f2(y) + ' m ' + f2(x + 5) + ' ' + f2(y) + ' l ' + f2(x) + ' ' + f2(y - 5) + ' m ' + f2(x) + ' ' + f2(y + 5) + ' l S 0.8 w'); }
    });
    // origine
    c.push('0.4 0.4 0.4 RG 0.3 w ' + f2(X(0) - 6) + ' ' + f2(Y(0)) + ' m ' + f2(X(0) + 6) + ' ' + f2(Y(0)) + ' l ' + f2(X(0)) + ' ' + f2(Y(0) - 6) + ' m ' + f2(X(0)) + ' ' + f2(Y(0) + 6) + ' l S 0 G');
    if (X(0) >= M * PT && X(0) <= (PW - M) * PT && Y(0) >= (M + CART) * PT && Y(0) <= (PH - M) * PT) testo(X(0) + 4, Y(0) - 10, 'X0 Y0', 6);
    // quote
    if (opz.quote) {
      const Q = O.quoteCAD ? O.quoteCAD(E) : [];
      c.push('0.2 0.2 0.8 rg 0.2 0.2 0.8 RG 0.3 w');
      Q.forEach(d => {
        if (d.tipo === 'lin') {
          const mx = (d.x0 + d.x1) / 2, my = (d.y0 + d.y1) / 2;
          let tx = X(mx) - larg(d.testo, 7) / 2, ty = Y(my) + 3;
          if (d.lato === 'sotto') ty = Y(my) - 10; else if (d.lato === 'destra') { tx = X(mx) + 4; ty = Y(my) - 2; }
          testo(tx, ty, d.testo, 7);
        } else if (d.tipo === 'dia') testo(X(d.x0) + 4, Y(d.y0) + 4, d.testo, 7);
        else testo(X(d.x0) + 3, Y(d.y0) + 3, d.testo, 7);
      });
      c.push('0 g 0 G');
    }
    // cartiglio
    const titolo = opz.titolo || 'Disegno';
    testo((M + 4) * PT, (M + CART - 9) * PT, titolo, 14, true);
    const righe = (opz.righe || []).slice(0, 5);
    righe.forEach((r, i) => testo((M + 4) * PT, (M + CART - 18 - i * 6) * PT, r, 9));
    testo((M + 4) * PT, (M + 3) * PT, 'Scala ' + (scala >= 1 ? scala + ':1' : '1:' + Math.round(1 / scala)) + '  -  Hich-Officina' + (opz.data ? '  -  ' + opz.data : '') + '  -  quote in mm, da controllare', 7);
    if (opz.qr && opz.qr.m) {
      const n = opz.qr.n, mod = Math.min(1.1, (CART - 4) / (n + 2)), lato = mod * n;
      const qx = PW - M - 3 - lato, qy = M + 2;
      c.push('1 g ' + f2((qx - mod) * PT) + ' ' + f2((qy - mod) * PT) + ' ' + f2((lato + 2 * mod) * PT) + ' ' + f2((lato + 2 * mod) * PT) + ' re f 0 g');
      for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (opz.qr.m[r][k]) c.push(f2((qx + k * mod) * PT) + ' ' + f2((qy + (n - 1 - r) * mod) * PT) + ' ' + f2(mod * PT + 0.05) + ' ' + f2(mod * PT + 0.05) + ' re f');
    }
    const flusso = c.join('\n') + '\n';
    const ogg = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + f2(PW * PT) + ' ' + f2(PH * PT) + '] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>',
      '<< /Length ' + flusso.length + ' >>\nstream\n' + flusso + 'endstream',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
    let out = '%PDF-1.4\n'; const pos = [];
    ogg.forEach((o, i) => { pos.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    const xref = out.length;
    out += 'xref\n0 ' + (ogg.length + 1) + '\n0000000000 65535 f \n' + pos.map(p => String(p).padStart(10, '0') + ' 00000 n \n').join('');
    out += 'trailer\n<< /Size ' + (ogg.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    return out;
  }

  const Pdf = { scriviPDF };
  Object.assign(O, Pdf);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
