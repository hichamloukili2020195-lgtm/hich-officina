// ===== Hich-Officina: codice QR (scritto da noi, nessuna libreria) =====
// Modo byte (UTF-8), correzione errori L, versioni 1-20 (fino a 858 byte). qrMatrice(testo) -> {n, m: [[0|1]], versione, byte} oppure {errore}.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;

  // per versione: [codewords dati, codewords correzione per blocco, [numero blocchi gruppo 1, dati], [numero blocchi gruppo 2, dati]]
  const VERS = [null,
    [19, 7, [1, 19]], [34, 10, [1, 34]], [55, 15, [1, 55]], [80, 20, [1, 80]], [108, 26, [1, 108]], [136, 18, [2, 68]], [156, 20, [2, 78]], [194, 24, [2, 97]],
    [232, 30, [2, 116]], [274, 18, [2, 68], [2, 69]], [324, 20, [4, 81]], [370, 24, [2, 92], [2, 93]], [428, 26, [4, 107]], [461, 30, [3, 115], [1, 116]],
    [523, 22, [5, 87], [1, 88]], [589, 24, [5, 98], [1, 99]], [647, 28, [1, 107], [5, 108]], [721, 30, [5, 120], [1, 121]], [795, 28, [3, 113], [4, 114]], [861, 28, [3, 107], [5, 108]]];
  const ALLINEA = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70],
    [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90]];
  const RESTO = v => (v === 1 ? 0 : v <= 6 ? 7 : v <= 13 ? 0 : 3);

  // ----- campo di Galois GF(256), polinomio 0x11D -----
  const EXP = new Array(512), LOG = new Array(256);
  (() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
  const generatore = n => { let p = [1]; for (let i = 0; i < n; i++) { const q = new Array(p.length + 1).fill(0); p.forEach((c, j) => { q[j] ^= c; q[j + 1] ^= mul(c, EXP[i]); }); p = q; } return p; };
  const correzione = (dati, n) => {
    const g = generatore(n), r = new Array(n).fill(0);
    dati.forEach(d => { const f = d ^ r[0]; r.shift(); r.push(0); if (f) for (let i = 0; i < n; i++) r[i] ^= mul(g[i + 1], f); });
    return r;
  };
  const bch = (valore, bitDati, poli, bitTot) => { let v = valore << (bitTot - bitDati); for (let i = bitTot - 1; i >= bitTot - bitDati; i--) if ((v >> i) & 1) v ^= poli << (i - (bitTot - bitDati)); return (valore << (bitTot - bitDati)) | v; };

  const utf8 = t => { const o = []; for (const ch of String(t)) { let c = ch.codePointAt(0); if (c < 0x80) o.push(c); else if (c < 0x800) o.push(0xC0 | (c >> 6), 0x80 | (c & 63)); else if (c < 0x10000) o.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); else o.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); } return o; };

  function matrice(testo) {
    const dati = utf8(testo);
    let v = 1;
    for (; v <= 20; v++) { const bitCount = v <= 9 ? 8 : 16; if (4 + bitCount + dati.length * 8 <= VERS[v][0] * 8) break; }
    if (v > 20) return { errore: 'Testo troppo lungo per il codice QR (' + dati.length + ' byte, massimo 858).' };
    const V = VERS[v], capacita = V[0], bitCount = v <= 9 ? 8 : 16;
    // flusso di bit
    const bit = [];
    const metti = (x, n) => { for (let i = n - 1; i >= 0; i--) bit.push((x >> i) & 1); };
    metti(4, 4); metti(dati.length, bitCount); dati.forEach(b => metti(b, 8));
    metti(0, Math.min(4, capacita * 8 - bit.length));
    while (bit.length % 8) bit.push(0);
    const cw = []; for (let i = 0; i < bit.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bit[i + j]; cw.push(b); }
    for (let k = 0; cw.length < capacita; k++) cw.push(k % 2 ? 0x11 : 0xEC);
    // blocchi
    const blocchi = []; let pos = 0;
    [V[2], V[3]].filter(Boolean).forEach(([n, d]) => { for (let i = 0; i < n; i++) { const dd = cw.slice(pos, pos + d); pos += d; blocchi.push({ dati: dd, ec: correzione(dd, V[1]) }); } });
    const fin = [];
    const maxD = Math.max(...blocchi.map(b => b.dati.length));
    for (let i = 0; i < maxD; i++) blocchi.forEach(b => { if (i < b.dati.length) fin.push(b.dati[i]); });
    for (let i = 0; i < V[1]; i++) blocchi.forEach(b => fin.push(b.ec[i]));
    const flusso = []; fin.forEach(b => metti2(flusso, b, 8)); for (let i = 0; i < RESTO(v); i++) flusso.push(0);
    function metti2(arr, x, n) { for (let i = n - 1; i >= 0; i--) arr.push((x >> i) & 1); }

    const n = 17 + 4 * v;
    const mk = () => Array.from({ length: n }, () => new Array(n).fill(0)), M = mk(), riserva = mk();
    const set = (r, c, val) => { if (r >= 0 && c >= 0 && r < n && c < n) { M[r][c] = val ? 1 : 0; riserva[r][c] = 1; } };
    const cercatore = (r0, c0) => { for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) { const r = r0 + dr, c = c0 + dc; const dentro = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6; const nero = dentro && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)); set(r, c, nero); } };
    cercatore(0, 0); cercatore(0, n - 7); cercatore(n - 7, 0);
    for (let i = 8; i < n - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const al = ALLINEA[v];
    al.forEach((r, i) => al.forEach((c, j) => { if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return; for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1); }));
    set(n - 8, 8, 1);   // modulo nero fisso
    // aree riservate per formato e versione
    for (let i = 0; i < 9; i++) { riserva[8][i] = 1; riserva[i][8] = 1; }
    for (let i = 0; i < 8; i++) { riserva[8][n - 1 - i] = 1; riserva[n - 1 - i][8] = 1; }
    if (v >= 7) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { riserva[i][n - 11 + j] = 1; riserva[n - 11 + j][i] = 1; }
    // dati a zig-zag
    const posizioni = [];
    let su = true;
    for (let c = n - 1; c > 0; c -= 2) {
      if (c === 6) c--;
      for (let k = 0; k < n; k++) { const r = su ? n - 1 - k : k; for (const cc of [c, c - 1]) if (!riserva[r][cc]) posizioni.push([r, cc]); }
      su = !su;
    }
    const maschere = [(r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0, (r, c) => ((r / 2 | 0) + (c / 3 | 0)) % 2 === 0,
      (r, c) => (r * c) % 2 + (r * c) % 3 === 0, (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0, (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0];
    const costruisci = mask => {
      const B = M.map(r => r.slice());
      posizioni.forEach(([r, c], i) => { let b = flusso[i] || 0; if (maschere[mask](r, c)) b ^= 1; B[r][c] = b; });
      // formato: livello L = 01
      const f = bch((1 << 3) | mask, 5, 0x537, 15) ^ 0x5412;
      const fb = i => (f >> i) & 1;
      for (let i = 0; i <= 5; i++) B[i][8] = fb(i);
      B[7][8] = fb(6); B[8][8] = fb(7); B[8][7] = fb(8);
      for (let i = 9; i < 15; i++) B[8][14 - i] = fb(i);
      for (let i = 0; i < 8; i++) B[8][n - 1 - i] = fb(i);
      for (let i = 8; i < 15; i++) B[n - 15 + i][8] = fb(i);
      B[n - 8][8] = 1;
      if (v >= 7) { const w = bch(v, 6, 0x1F25, 18); for (let i = 0; i < 18; i++) { const b = (w >> i) & 1, r = i / 3 | 0, c = i % 3; B[r][n - 11 + c] = b; B[n - 11 + c][r] = b; } }
      return B;
    };
    const penalita = B => {
      let p = 0;
      for (let t = 0; t < 2; t++) {
        for (let a = 0; a < n; a++) {
          let corsa = 1;
          for (let b = 1; b < n; b++) { const x = t ? B[b][a] : B[a][b], y = t ? B[b - 1][a] : B[a][b - 1]; if (x === y) { corsa++; if (corsa === 5) p += 3; else if (corsa > 5) p++; } else corsa = 1; }
        }
      }
      for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) { const x = B[r][c]; if (x === B[r][c + 1] && x === B[r + 1][c] && x === B[r + 1][c + 1]) p += 3; }
      const pat = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], pat2 = pat.slice().reverse();
      for (let t = 0; t < 2; t++) for (let a = 0; a < n; a++) for (let b = 0; b + 11 <= n; b++) {
        let m1 = true, m2 = true;
        for (let k = 0; k < 11; k++) { const x = t ? B[b + k][a] : B[a][b + k]; if (x !== pat[k]) m1 = false; if (x !== pat2[k]) m2 = false; }
        if (m1) p += 40; if (m2) p += 40;
      }
      let neri = 0; B.forEach(r => r.forEach(x => { neri += x; }));
      p += Math.floor(Math.abs(neri * 100 / (n * n) - 50) / 5) * 10;
      return p;
    };
    let migliore = null, pm = Infinity;
    for (let m = 0; m < 8; m++) { const B = costruisci(m); const p = penalita(B); if (p < pm) { pm = p; migliore = B; } }
    return { n, m: migliore, versione: v, byte: dati.length };
  }

  const Qr = { qrMatrice: matrice };
  Object.assign(O, Qr);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
