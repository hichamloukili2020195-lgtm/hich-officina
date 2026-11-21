// ===== Hich-Officina: post-processor (dal programma ISO dell'app ai linguaggi delle macchine) =====
// I programmi dell'app nascono in ISO; qui si traducono. Linguaggi:
//   iso      ISO con codici G e M e cicli G81-G89 (come esce dall'app): controlli Fanuc e simili
//   cicli    ISO con cicli a nome e parametri (CYCLE81..., MCALL, LIMS, G33 K), commenti con ;   fresa e tornio:
//            controlli Siemens Sinumerik
//   dialogo  dialogo a testo con righe numerate (L, TOOL CALL, CYCL DEF con parametri Q)          solo fresa:
//            controlli Heidenhain
// Si traducono i programmi generati dall'app (non le macro e non programmi qualsiasi). Sempre da provare a vuoto.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;

  // Il nome della marca serve solo a dire con quali controlli e compatibile il programma (regola dell'utente).
  const LINGUAGGI = {
    iso: { nome: 'ISO - compatibile con controlli Fanuc e simili', fresa: true, tornio: true },
    cicli: { nome: 'Cicli a nome - compatibile con controlli Siemens Sinumerik', fresa: true, tornio: true, estensione: '.MPF' },
    dialogo: { nome: 'Dialogo a testo - compatibile con controlli Heidenhain', fresa: true, tornio: false, estensione: '.H' }
  };

  const numero = v => { const s = O.gc(v); return s.endsWith('.') ? s.slice(0, -1) : s; };
  const segno = v => (v >= 0 ? '+' : '') + numero(v);

  /** Una riga ISO dell'app: {parole:{G:[],M:[],X..}, commento, testo}. */
  function leggi(riga) {
    let commento = '';
    const t = String(riga).replace(/\(([^)]*)\)/g, (x, c) => { commento += (commento ? ' ' : '') + c.trim(); return ' '; }).trim();
    const p = { G: [], M: [] };
    const re = /([A-Z])\s*(-?\d*\.?\d+)/g;
    let m;
    while ((m = re.exec(t.toUpperCase()))) {
      const v = Number(m[2]);
      if (m[1] === 'G') p.G.push(v); else if (m[1] === 'M') p.M.push(v); else p[m[1]] = v;
    }
    return { p, commento, testo: t };
  }

  /**
   * Traduce. righe = programma ISO dell'app; opz = {linguaggio, modo:'fresa'|'tornio', nome}.
   * Ritorna {righe, estensione, avvisi, errore}.
   */
  function postProcessor(righe, opz) {
    const ling = (opz && opz.linguaggio) || 'iso';
    const modo = (opz && opz.modo) || 'fresa';
    const L = LINGUAGGI[ling];
    if (!L) return { errore: 'Linguaggio sconosciuto: ' + ling, righe: [] };
    if (!L[modo]) return { errore: 'Il linguaggio "' + L.nome + '" e solo per la fresa.', righe: [] };
    if (ling === 'iso') return { righe: righe.slice(), estensione: null, avvisi: [] };
    if (righe.some(r => /\bG65\b|#|WHILE|GOTO/.test(r))) return { errore: 'Le macro restano in ISO: il post traduce i programmi generati dall\'app.', righe: [] };
    const nome = String((opz && opz.nome) || 'PEZZO').toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 24) || 'PEZZO';
    return ling === 'cicli' ? cicli(righe, modo, nome) : dialogo(righe, nome, opz || {});
  }

  // ----- ISO con cicli a nome -----
  function cicli(righe, modo, nome) {
    const out = [], avvisi = [];
    const tornio = modo === 'tornio';
    let z = null, s = null, lims = null, inCiclo = false, f = null;
    for (const r of righe) {
      if (r === '%') continue;
      const { p, commento, testo } = leggi(r);
      if (/^O\d+/.test(testo)) { if (commento) out.push('; ' + commento); continue; }
      if (!testo) { if (commento) out.push('; ' + commento); continue; }
      const gs = p.G.map(g => Math.round(g));
      if (gs.includes(21)) { out.push(tornio ? 'G18 G90 G71 G40 G95 DIAMON' : 'G17 G90 G71 G40'); continue; }
      if (p.T !== undefined && !gs.length && p.M.includes(6)) { out.push('T' + numero(p.T) + ' D1'); out.push('M6'); continue; }
      if (p.T !== undefined && tornio) { const t = Math.floor(p.T / 100) || p.T; out.push('T' + t + ' D' + (p.T % 100 || 1)); continue; }
      if (gs.includes(50) && tornio) { lims = p.S; continue; }
      if (gs.includes(43)) { z = p.Z; out.push('G0 Z' + numero(p.Z) + (p.M.includes(8) ? ' M8' : '')); continue; }
      if (gs.includes(96)) { s = p.S; out.push('G96 S' + numero(p.S) + (lims ? ' LIMS=' + numero(lims) : '') + (p.M.length ? ' ' + p.M.map(m => 'M' + m).join(' ') : '')); continue; }
      if (gs.includes(97) || (p.S !== undefined && !gs.length)) { s = p.S; out.push(r.replace(/\.(?=\s|$)/g, '')); continue; }
      const ciclo = gs.find(g => [73, 81, 82, 83, 84, 85, 86].includes(g));
      if (ciclo) {
        const rtp = z !== null ? z : 50, sdis = p.R || 2, dp = p.Z;
        const ff = p.F !== undefined ? p.F : f;
        if (ff) out.push('F' + numero(ff));
        let c;
        if (ciclo === 81) c = 'CYCLE81(' + [rtp, 0, sdis, dp].map(numero).join(', ') + ')';
        else if (ciclo === 82) c = 'CYCLE82(' + [rtp, 0, sdis, dp].map(numero).join(', ') + ', , ' + numero((p.P || 300) / 1000) + ')';
        else if (ciclo === 83 || ciclo === 73) {
          const q = p.Q || 2;
          c = 'CYCLE83(' + [rtp, 0, sdis, dp].map(numero).join(', ') + ', , ' + numero(-q) + ', , ' + numero(q) + ', 0, 0, 1, ' + (ciclo === 83 ? 1 : 0) + ')';
        } else if (ciclo === 84) {
          const pit = s && ff ? ff / s : 1;
          c = 'CYCLE84(' + [rtp, 0, sdis, dp].map(numero).join(', ') + ', , 0, 3, , ' + numero(pit) + ', 0, ' + numero(s || 100) + ', ' + numero(s || 100) + ')';
        } else {
          c = 'CYCLE85(' + [rtp, 0, sdis, dp].map(numero).join(', ') + ', , 0, ' + numero(ff || 100) + ', ' + numero(ff || 100) + ')';
          if (ciclo === 86) avvisi.push('G86 tradotto con CYCLE85 (uscita in avanzamento).');
        }
        out.push('MCALL ' + c);
        out.push('X' + numero(p.X) + ' Y' + numero(p.Y));
        inCiclo = true;
        continue;
      }
      if (gs.includes(80)) { if (inCiclo) out.push('MCALL'); inCiclo = false; continue; }
      if (gs.includes(32) || gs.includes(33)) {
        out.push('G33' + (p.X !== undefined ? ' X' + numero(p.X) : '') + (p.Z !== undefined ? ' Z' + numero(p.Z) : '') + ' K' + numero(p.F));
        continue;
      }
      if (p.F !== undefined) f = p.F;
      if (p.Z !== undefined) z = p.Z;
      // il resto (G0 G1 G54 M3 M5 M8 M9 M30, posizioni nei cicli) resta com'e, senza il punto finale dei numeri
      out.push(testo.replace(/(\d)\.(?=\s|$)/g, '$1') + (commento ? ' ; ' + commento : ''));
    }
    return { righe: out, estensione: '.MPF', avvisi, nomeFile: nome + '.MPF' };
  }

  // ----- dialogo a testo -----
  const CICLI_DIALOGO = {
    foratura: (q) => ['CYCL DEF 200 FORATURA ~', 'Q200=' + segno(q.sdis) + ' ;DISTANZA DI SICUREZZA ~', 'Q201=' + segno(q.dp) + ' ;PROFONDITA ~',
      'Q206=' + segno(q.f) + ' ;AVANZAMENTO IN PROFONDITA ~', 'Q202=' + segno(q.passo) + ' ;PROFONDITA INCREMENTO ~', 'Q210=+0 ;TEMPO ATTESA SOPRA ~',
      'Q203=+0 ;COORD. SUPERFICIE ~', 'Q204=' + segno(q.sic2) + ' ;2. DISTANZA SICUREZZA ~', 'Q211=' + segno(q.sosta) + ' ;TEMPO ATTESA SOTTO'],
    alesatura: (q) => ['CYCL DEF 201 ALESATURA ~', 'Q200=' + segno(q.sdis) + ' ;DISTANZA DI SICUREZZA ~', 'Q201=' + segno(q.dp) + ' ;PROFONDITA ~',
      'Q206=' + segno(q.f) + ' ;AVANZAMENTO IN PROFONDITA ~', 'Q211=+0 ;TEMPO ATTESA SOTTO ~', 'Q208=' + segno(q.f) + ' ;AVANZAMENTO DI RITORNO ~',
      'Q203=+0 ;COORD. SUPERFICIE ~', 'Q204=' + segno(q.sic2) + ' ;2. DISTANZA SICUREZZA'],
    maschiatura: (q) => ['CYCL DEF 207 MASCHIATURA RIGIDA ~', 'Q200=' + segno(q.sdis) + ' ;DISTANZA DI SICUREZZA ~', 'Q201=' + segno(q.dp) + ' ;PROFONDITA ~',
      'Q239=' + segno(q.pitch) + ' ;PASSO FILETTATURA ~', 'Q203=+0 ;COORD. SUPERFICIE ~', 'Q204=' + segno(q.sic2) + ' ;2. DISTANZA SICUREZZA']
  };
  function dialogo(righe, nome, opz) {
    const out = [], avvisi = [];
    let n = 0;
    const b = t => { out.push((n++) + ' ' + t); };
    const cont = t => { out.push('  ' + t); };
    // grezzo dalle quote di lavoro
    let blk = opz.grezzo || null;
    if (!blk && O.eseguiISO) {
      const r = O.eseguiISO(righe.join('\n'), { modo: 'fresa' });
      const Lm = r.limiti;
      if (Lm.x.minLavoro !== null) blk = { x0: Lm.x.minLavoro, y0: Lm.y.minLavoro, z0: Math.min(Lm.z.minLavoro, -1), x1: Lm.x.maxLavoro, y1: Lm.y.maxLavoro, z1: 0 };
    }
    b('BEGIN PGM ' + nome + ' MM');
    if (blk) {
      b('BLK FORM 0.1 Z X' + segno(blk.x0) + ' Y' + segno(blk.y0) + ' Z' + segno(blk.z0));
      b('BLK FORM 0.2 X' + segno(blk.x1) + ' Y' + segno(blk.y1) + ' Z' + segno(blk.z1));
    }
    let X = null, Y = null, Z = null, Fm = null, t = null, s = null, mAttese = [], inCiclo = false, zIn = null;
    const mStr = () => { if (!mAttese.length) return ''; let m = [...new Set(mAttese)]; if (m.includes(30)) m = [30]; if (m.includes(3) && m.includes(8)) m = m.filter(k => k !== 3 && k !== 8).concat(13); mAttese = []; return ' ' + m.map(k => 'M' + k).join(' '); };
    const L = (x, y, z, rapido, f) => {
      let c = 'L';
      if (x !== undefined && x !== X) { c += ' X' + segno(x); X = x; }
      if (y !== undefined && y !== Y) { c += ' Y' + segno(y); Y = y; }
      if (z !== undefined && z !== Z) { c += ' Z' + segno(z); Z = z; }
      if (c === 'L' && !mAttese.length) return;
      if (c === 'L') c += ' Z' + segno(Z === null ? 50 : Z);
      c += ' R0 ' + (rapido ? 'FMAX' : (f && f !== Fm ? 'F' + numero(f) : (Fm ? 'F' + numero(Fm) : 'F100')));
      if (!rapido && f) Fm = f;
      b(c + mStr());
    };
    for (const r of righe) {
      if (r === '%') continue;
      const { p, commento, testo } = leggi(r);
      if (/^O\d+/.test(testo)) { if (commento) b('; ' + commento); continue; }
      if (!testo) { if (commento) b('; ' + commento.replace(/[~]/g, '')); continue; }
      const gs = p.G.map(g => Math.round(g));
      if (gs.includes(21)) continue;
      if (gs.includes(54)) { b('; ORIGINE: PRESET ATTIVO (G54 NEL PROGRAMMA ISO)'); continue; }
      if (p.T !== undefined && p.M.includes(6)) { t = p.T; continue; }
      if (p.S !== undefined && !gs.length) {
        s = p.S;
        b('TOOL CALL ' + numero(t || 1) + ' Z S' + numero(s));
        if (p.M.includes(3)) mAttese.push(3);
        continue;
      }
      if (gs.includes(43)) { if (p.M.includes(8)) mAttese.push(8); L(X === null ? undefined : X, Y === null ? undefined : Y, p.Z, true); zIn = p.Z; continue; }
      const ciclo = gs.find(g => [73, 81, 82, 83, 84, 85, 86].includes(g));
      if (ciclo) {
        const f = p.F !== undefined ? p.F : Fm || 100;
        const q = { sdis: p.R || 2, dp: p.Z, f, passo: (ciclo === 83 || ciclo === 73) ? (p.Q || 2) : Math.abs(p.Z), sic2: (Z !== null ? Z : 50) - 0, sosta: ciclo === 82 ? (p.P || 300) / 1000 : 0, pitch: s ? f / s : 1 };
        const righeC = ciclo === 84 ? CICLI_DIALOGO.maschiatura(q) : (ciclo === 85 || ciclo === 86) ? CICLI_DIALOGO.alesatura(q) : CICLI_DIALOGO.foratura(q);
        b(righeC[0]); righeC.slice(1).forEach(cont);
        if (ciclo === 73) avvisi.push('G73 tradotto con il ciclo 200 (scarico completo del truciolo).');
        mAttese.push(99);
        L(p.X, p.Y, undefined, true);
        inCiclo = true;
        continue;
      }
      if (gs.includes(80)) { inCiclo = false; continue; }
      if (inCiclo && (p.X !== undefined || p.Y !== undefined) && !gs.length) { mAttese.push(99); L(p.X, p.Y, undefined, true); continue; }
      if (gs.includes(0) || gs.includes(1)) {
        const rap = gs.includes(0);
        if (p.M.length) mAttese.push(...p.M);
        if (X === null && p.X === undefined && rap) { L(p.X, p.Y, p.Z, true); continue; }
        L(p.X, p.Y, p.Z, rap, p.F);
        continue;
      }
      if (p.M.length && !gs.length) {
        const ms = p.M.map(Math.round);
        if (ms.includes(30)) { mAttese.push(30); L(undefined, undefined, undefined, true); continue; }
        mAttese.push(...ms);
        continue;
      }
      avvisi.push('Riga non tradotta: ' + r);
    }
    if (mAttese.length) L(undefined, undefined, undefined, true);
    b('END PGM ' + nome + ' MM');
    return { righe: out, estensione: '.H', avvisi, nomeFile: nome + '.H' };
  }

  const Post = { LINGUAGGI, postProcessor };
  Object.assign(O, Post);
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
