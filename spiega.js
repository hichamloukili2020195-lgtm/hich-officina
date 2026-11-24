// ===== Hich-Officina: spiegazione di un programma ISO (senza interfaccia) =====
// Dice in italiano semplice cosa fa ogni riga, raggruppa il programma per utensile (lavorazioni),
// scrive il riassunto e propone le correzioni degli errori piu comuni. Serve anche al commento della simulazione.
// Le frasi sono indicative: ogni controllo ha il suo manuale, e i codici meno comuni possono voler dire altro.
(function (radice) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./calcoli.js') : radice.Officina;
  if (typeof module !== 'undefined' && module.exports) require('./iso.js');

  const n = v => (typeof v === 'number' ? String(Math.round(v * 10000) / 10000).replace('.', ',') : String(v));
  const CICLI = {
    73: 'foratura a gradini (rompe il truciolo)', 74: 'maschiatura a sinistra', 76: 'alesatura fine', 81: 'foratura semplice',
    82: 'foratura con sosta sul fondo', 83: 'foratura profonda a gradini con ritorno', 84: 'maschiatura', 85: 'alesatura (entra e esce in lavoro)',
    86: 'alesatura con arresto del mandrino', 87: 'alesatura con rotazione inversa', 88: 'alesatura con sosta e arresto', 89: 'alesatura con sosta'
  };
  const GRUPPO_CICLO = { 73: 'foratura', 81: 'foratura', 82: 'foratura', 83: 'foratura', 84: 'maschiatura', 74: 'maschiatura', 76: 'alesatura', 85: 'alesatura', 86: 'alesatura', 87: 'alesatura', 88: 'alesatura', 89: 'alesatura' };

  /** Divide una riga pulita in parole: {G:[numeri], M:[numeri], v:{lettera: testo}}. */
  function parole(t) {
    const W = { G: [], M: [], v: {} };
    const re = /([A-Z])\s*(-?\s*(?:\d+\.?\d*|\.\d+)|#\d+|\[[^\]]*\])/g;
    let m;
    while ((m = re.exec(t))) {
      const val = m[2].replace(/\s+/g, '');
      if (m[1] === 'G' || m[1] === 'M') { const x = Number(val); if (isFinite(x)) W[m[1]].push(x); } else if (W.v[m[1]] === undefined) W.v[m[1]] = val;
    }
    return W;
  }
  const num = s => (s === undefined ? NaN : Number(s));
  const vis = s => { const x = num(s); return isFinite(x) ? n(x) : String(s); };

  function contesto(modo) {
    return { modo: modo === 'tornio' ? 'tornio' : 'fresa', perGiro: modo === 'tornio', inc: false, moto: null, ciclo: null, pollici: false, g96: false, ut: null, mand: null, piano: modo === 'tornio' ? 18 : 17 };
  }

  /** Spiega una riga e aggiorna il contesto c. Ritorna {frase, tipo, cambioT, ciclo, punto} oppure null se la riga e vuota. */
  function spiegaRiga(raw, c) {
    const p = O.pulisciRiga(raw);
    const t = p.testo;
    if (!t) {
      if (p.intestazione) {
        const m = /^\s*[O:](\d+)/i.exec(String(raw));
        return { tipo: 'testa', frase: m ? 'Numero del programma: O' + m[1] + (p.commento ? ' (' + p.commento + ')' : '') + '. Con questo nome lo trovi sulla macchina.' : 'Segno di inizio o di fine del file (%).' };
      }
      return p.commento ? { tipo: 'nota', frase: 'Nota scritta dal programmatore: ' + p.commento } : null;
    }
    const tor = c.modo === 'tornio';
    let m;
    if ((m = /^IF\s*\[(.*)\]\s*GOTO\s*(\d+)/.exec(t))) return { tipo: 'macro', frase: 'Macro: se [' + m[1] + '] e vero, salta alla riga N' + m[2] + '.' };
    if ((m = /^WHILE\s*\[(.*)\]\s*DO\s*(\d+)/.exec(t))) return { tipo: 'macro', frase: 'Macro: ripete le righe fino a END ' + m[2] + ' finche [' + m[1] + '] e vero.' };
    if ((m = /^GOTO\s*(\d+)/.exec(t))) return { tipo: 'macro', frase: 'Macro: salta alla riga N' + m[1] + '.' };
    if ((m = /^END\s*(\d+)/.exec(t))) return { tipo: 'macro', frase: 'Macro: fine del blocco ripetuto ' + m[1] + '.' };
    if ((m = /^#(\d+)\s*=\s*(.+)$/.exec(t))) return { tipo: 'macro', frase: 'Macro: mette ' + m[2] + ' nella variabile #' + m[1] + '.' };

    const W = parole(t), v = W.v, G = W.G, M = W.M;
    const parti = [];
    let tipo = 'altro', cambioT = null, ciclo = null, punto = false, filetto = false;
    const moti = G.filter(g => g >= 0 && g <= 3);
    const dis = k => (v[k] !== undefined ? vis(v[k]) : null);
    const assi = (tor ? ['X', 'Z', 'U', 'W'] : ['X', 'Y', 'Z', 'A', 'B', 'C']).filter(a => v[a] !== undefined);
    const dove = () => assi.map(a => (tor && a === 'X' ? 'X (diametro) ' : tor && a === 'U' ? 'U (diametro, in piu) ' : tor && a === 'W' ? 'W (in piu) ' : a + ' ') + vis(v[a])).join(', ');
    const incr = c.inc || assi.some(a => a === 'U' || a === 'W');

    // ---- codici G (senza il movimento) ----
    G.forEach(g => {
      const D = dis('D'), H = dis('H'), P = dis('P');
      if (!tor && CICLI[g]) { c.ciclo = g; ciclo = g; return; }
      switch (g) {
        case 0: case 1: case 2: case 3: break;
        case 4: parti.push('Pausa' + (v.X !== undefined || v.U !== undefined ? ' di ' + vis(v.X !== undefined ? v.X : v.U) + ' secondi' : P ? ' (P' + P + ' millisecondi)' : '')); break;
        case 17: c.piano = 17; parti.push('Piano di lavoro XY (vale per archi e compensazione)'); break;
        case 18: c.piano = 18; parti.push('Piano di lavoro ZX (vale per archi e compensazione)'); break;
        case 19: c.piano = 19; parti.push('Piano di lavoro YZ (vale per archi e compensazione)'); break;
        case 20: c.pollici = true; parti.push('Misure in pollici'); break;
        case 21: c.pollici = false; parti.push('Misure in millimetri'); break;
        case 28: parti.push('Ritorno al punto di riferimento della macchina (zero macchina)'); break;
        case 30: parti.push('Ritorno al secondo punto di riferimento (di solito per il cambio utensile)'); break;
        case 40: parti.push('Annulla la compensazione del raggio utensile'); break;
        case 41: parti.push('Compensazione raggio a sinistra del profilo' + (D ? ' (correttore D' + D + ')' : '')); break;
        case 42: parti.push('Compensazione raggio a destra del profilo' + (D ? ' (correttore D' + D + ')' : '')); break;
        case 43: parti.push('Attiva la correzione della lunghezza utensile' + (H ? ' (correttore H' + H + ')' : '')); break;
        case 49: parti.push('Annulla la correzione della lunghezza utensile'); break;
        case 50: parti.push(tor ? 'Limite massimo dei giri' + (v.S ? ': ' + vis(v.S) + ' giri/min' : '') : 'Annulla il fattore di scala'); break;
        case 52: case 53: parti.push(g === 53 ? 'Quote nel sistema della macchina (solo in questa riga)' : 'Sposta l\'origine locale'); break;
        case 54: case 55: case 56: case 57: case 58: case 59: parti.push('Usa l\'origine pezzo G' + g + ' (lo zero del pezzo)'); break;
        case 54.1: parti.push('Usa un\'origine pezzo supplementare' + (P ? ' P' + P : '')); break;
        case 61: parti.push('Arresto preciso a ogni movimento'); break;
        case 64: parti.push('Modo di taglio continuo (arrotonda gli spigoli)'); break;
        case 65: parti.push('Chiama la macro O' + (dis('P') || '?') + ' con gli argomenti: ' + (Object.keys(v).filter(k => k !== 'P').map(k => k + '=' + vis(v[k])).join(', ') || 'nessuno')); tipo = 'macro'; break;
        case 80: c.ciclo = null; parti.push('Annulla il ciclo fisso'); break;
        case 90: if (tor && (v.X !== undefined || v.Z !== undefined) && (v.R !== undefined || v.F !== undefined)) parti.push('Ciclo di tornitura (G90)'); else { c.inc = false; parti.push('Quote assolute (misurate dallo zero pezzo)'); } break;
        case 91: c.inc = true; parti.push('Quote incrementali (misurate dalla posizione attuale)'); break;
        case 92: parti.push(tor ? 'Limite dei giri o impostazione dell\'origine' + (v.S ? ': ' + vis(v.S) + ' giri/min' : '') : 'Imposta l\'origine con le quote scritte'); break;
        case 94: c.perGiro = false; parti.push('Avanzamento in millimetri al minuto' + (v.F ? ': ' + vis(v.F) : '')); break;
        case 95: c.perGiro = true; parti.push('Avanzamento in millimetri al giro' + (v.F ? ': ' + vis(v.F) : '')); break;
        case 96: c.g96 = true; parti.push('Velocita di taglio costante' + (v.S ? ' a ' + vis(v.S) + ' m/min' : '') + ': i giri cambiano col diametro'); break;
        case 97: c.g96 = false; parti.push('Giri costanti' + (v.S ? ': ' + vis(v.S) + ' giri/min' : '')); break;
        case 98: parti.push('Nei cicli torna al piano di partenza'); break;
        case 99: parti.push('Nei cicli torna al piano R'); break;
        case 32: case 33: filetto = true; parti.push('Filettatura con passo ' + (dis('F') || dis('K') || '?') + ' mm' + (assi.length ? ' fino a ' + dove() : '')); break;
        case 70: parti.push('Finitura del profilo scritto tra le righe N' + (dis('P') || '?') + ' e N' + (dis('Q') || '?')); break;
        case 71: parti.push(v.P !== undefined ? 'Sgrossatura longitudinale seguendo il profilo (righe N' + dis('P') + ' - N' + (dis('Q') || '?') + ')' + (dis('U') ? ', sovrametallo X ' + dis('U') : '') : 'Ciclo di sgrossatura: passata ' + (dis('U') || '?') + ' mm, ritorno ' + (dis('R') || '?') + ' mm'); break;
        case 72: parti.push('Sgrossatura frontale con ciclo'); break;
        case 74: parti.push('Ciclo di foratura profonda o gola frontale'); break;
        case 75: parti.push('Ciclo di gola o di troncatura'); break;
        case 76: parti.push('Ciclo di filettatura (passo ' + (dis('F') || dis('P') || '?') + ')'); filetto = true; break;
        default:
          if (CICLI[g] && tor && g === 73) parti.push('Ciclo di sgrossatura che ripete il profilo');
          else parti.push('Codice G' + n(g) + ' (non lo conosco: guarda il manuale della macchina)');
      }
    });
    if (moti.length) { c.moto = moti[moti.length - 1]; c.ciclo = null; ciclo = null; }
    if (G.some(g => CICLI[g]) && !tor) ciclo = G.filter(g => CICLI[g]).pop();

    // ---- utensile ----
    if (v.T !== undefined) {
      const raw = String(v.T).replace('-', '');
      const nT = tor && raw.length >= 3 ? Number(raw.slice(0, raw.length - 2)) : Number(raw);
      const corr = tor && raw.length >= 3 ? Number(raw.slice(-2)) : null;
      if (tor) { c.ut = nT; cambioT = nT; parti.push('Utensile ' + nT + (corr ? ' con correttore ' + corr : '') + (p.commento ? ' (' + p.commento + ')' : '')); } else if (M.includes(6)) { c.ut = nT; cambioT = nT; parti.push('Cambio utensile: monta il T' + nT + (p.commento ? ' (' + p.commento + ')' : '')); } else { c.preparato = nT; parti.push('Prepara il T' + nT + ' (si monta con M6)'); }
      tipo = 'utensile';
    } else if (M.includes(6)) {
      if (c.preparato !== undefined) { c.ut = c.preparato; cambioT = c.preparato; }
      parti.push('Cambio utensile' + (c.preparato !== undefined ? ': monta il T' + c.preparato : ' (monta quello preparato)') + (p.commento ? ' (' + p.commento + ')' : '')); tipo = 'utensile';
    }

    // ---- mandrino, refrigerante, altri M ----
    M.forEach(mm => {
      const S = dis('S');
      switch (mm) {
        case 0: parti.push('Stop programma: la macchina aspetta che premi Avvio'); break;
        case 1: parti.push('Stop opzionale (si ferma solo se il tasto e attivo)'); break;
        case 2: parti.push('Fine del programma'); tipo = 'fine'; break;
        case 30: parti.push('Fine del programma e ritorno all\'inizio'); tipo = 'fine'; break;
        case 3: c.mand = 'orario'; parti.push('Accende il mandrino in senso orario' + (S && !c.g96 ? ' a ' + S + ' giri/min' : '')); break;
        case 4: c.mand = 'antiorario'; parti.push('Accende il mandrino in senso antiorario' + (S && !c.g96 ? ' a ' + S + ' giri/min' : '')); break;
        case 5: c.mand = null; parti.push('Ferma il mandrino'); break;
        case 6: break;
        case 7: parti.push('Accende il refrigerante a nebbia'); break;
        case 8: parti.push('Accende il refrigerante'); break;
        case 9: parti.push('Spegne il refrigerante'); break;
        case 13: c.mand = 'orario'; parti.push('Mandrino in senso orario e refrigerante acceso'); break;
        case 14: c.mand = 'antiorario'; parti.push('Mandrino in senso antiorario e refrigerante acceso'); break;
        case 19: parti.push('Orienta il mandrino'); break;
        case 98: parti.push('Chiama il sottoprogramma O' + (dis('P') || '?') + (v.L ? ', ' + vis(v.L) + ' volte' : '')); tipo = 'macro'; break;
        case 99: parti.push('Fine del sottoprogramma: torna al programma principale'); tipo = 'macro'; break;
        case 41: case 42: case 43: case 44: parti.push('Gamma del mandrino M' + mm); break;
        case 48: parti.push('Attiva le manopole di regolazione (override)'); break;
        case 49: parti.push('Disattiva le manopole di regolazione (override)'); break;
        default: parti.push('Funzione M' + mm + ' (dipende dalla macchina)');
      }
    });
    if (v.S !== undefined && !M.some(x => x === 3 || x === 4) && !G.some(g => g === 50 || g === 92 || g === 96 || g === 97)) parti.push(c.g96 ? 'Velocita di taglio ' + vis(v.S) + ' m/min' : 'Giri del mandrino ' + vis(v.S) + ' al minuto');

    // ---- movimento ----
    const haXY = assi.some(a => a === 'X' || a === 'Y' || a === 'U');
    const haMoto = assi.length > 0 && !G.some(g => [28, 30, 53, 92, 4, 70, 71, 72, 74, 75, 76, 32, 33].includes(g) || (g === 90 && tor && parti.some(x => /Ciclo di tornitura/.test(x))));
    const fTxt = v.F !== undefined ? ' con avanzamento ' + vis(v.F) + (tor || c.perGiro ? ' mm/giro' : ' mm/min') : '';
    if (c.ciclo && !tor && !moti.length && (ciclo || haXY || v.Z !== undefined)) {
      const q = [];
      if (v.Z !== undefined) q.push('fondo Z ' + vis(v.Z)); if (v.R !== undefined) q.push('piano R ' + vis(v.R));
      if (v.Q !== undefined) q.push('passo Q ' + vis(v.Q)); if (v.P !== undefined) q.push('sosta P ' + vis(v.P)); if (v.F !== undefined) q.push('F ' + vis(v.F));
      const nome = CICLI[c.ciclo] || 'ciclo G' + c.ciclo;
      parti.push((ciclo ? 'Ciclo fisso G' + c.ciclo + ': ' : 'Ciclo G' + c.ciclo + ': ') + nome + (haXY ? ' nel punto ' + assi.filter(a => a !== 'Z').map(a => a + ' ' + vis(v[a])).join(', ') : ' (dati del ciclo)') + (q.length ? ' (' + q.join(', ') + ')' : ''));
      punto = haXY; tipo = 'ciclo';
    } else if (haMoto) {
      const mt = moti.length ? c.moto : c.moto;
      if (mt === 0) { parti.push('Rapido (senza tagliare) ' + (incr ? 'di ' : 'a ') + dove()); tipo = 'rapido'; }
      else if (mt === 1) { parti.push('Taglia in linea retta ' + (incr ? 'di ' : 'fino a ') + dove() + fTxt); tipo = 'lavoro'; }
      else if (mt === 2 || mt === 3) {
        const cen = ['I', 'J', 'K'].filter(k => v[k] !== undefined).map(k => k + ' ' + vis(v[k])).join(', ');
        parti.push('Arco in senso ' + (mt === 2 ? 'orario' : 'antiorario') + ' fino a ' + dove() + (v.R !== undefined ? ', raggio ' + vis(v.R) : cen ? ', centro a distanza ' + cen : '') + fTxt); tipo = 'lavoro';
      } else { parti.push('Si sposta ' + (incr ? 'di ' : 'a ') + dove() + fTxt); tipo = 'lavoro'; }
    } else if (v.F !== undefined && !parti.some(x => /Filettatura|passo|avanzamento/i.test(x))) parti.push('Avanzamento ' + vis(v.F) + (tor || c.perGiro ? ' mm/giro' : ' mm/min'));
    if (filetto) tipo = 'lavoro';
    if (!parti.length) parti.push('Riga che non so spiegare: controllala sul manuale');
    if (tipo === 'altro' && G.length) tipo = 'macchina';
    let frase = parti.join('; ') + '.';
    frase = frase.charAt(0).toUpperCase() + frase.slice(1);
    return { frase, tipo, cambioT, ciclo: ciclo || (c.ciclo && punto ? c.ciclo : null), punto, filetto, g: G.slice() };
  }

  /** Spiegazione di tutte le righe (solo testo). Ritorna [{riga, frase, tipo, ...} | null]. */
  function spiegaRighe(testo, modo) {
    const righe = String(testo || '').replace(/\r/g, '').split('\n');
    const m = modo && modo !== 'auto' ? modo : O.indovinaModo(testo);
    const c = contesto(m);
    return { modo: m, righe: righe.map((l, i) => { const s = spiegaRiga(l, c); return s ? Object.assign({ riga: i }, s) : null; }) };
  }

  /** Il programma a blocchi per utensile, con riassunto. r = risultato di controllaISO (facoltativo ma consigliato). */
  function spiegaProgramma(testo, r) {
    const E = spiegaRighe(testo, r && r.modo);
    const tor = E.modo === 'tornio';
    const righe = String(testo || '').replace(/\r/g, '').split('\n');
    const inizi = [];
    E.righe.forEach((s, i) => { if (s && s.cambioT != null) inizi.push(i); });
    const blocchi = [];
    const prima = (i) => { for (let k = i - 1; k >= Math.max(0, i - 2); k--) { const q = O.pulisciRiga(righe[k]); if (q.testo) return ''; if (q.commento) return q.commento; } return ''; };
    const taglia = (da, a, t, titoloBase) => {
      const B = { t, da, a, commento: '', fori: 0, cicli: [], tipi: {}, lavoroM: 0, zmin: null, titolo: titoloBase };
      for (let i = da; i <= a; i++) {
        const s = E.righe[i]; if (!s) continue;
        if (s.ciclo && s.punto) { B.fori++; const g = GRUPPO_CICLO[s.ciclo]; if (g) B.tipi[g] = true; if (!B.cicli.includes(s.ciclo)) B.cicli.push(s.ciclo); }
        (s.g || []).forEach(g => {
          if (tor) { if ([71, 72, 73].includes(g)) B.tipi.sgrossatura = true; if (g === 70) B.tipi.finitura = true; if ([76, 32, 33].includes(g)) B.tipi.filettatura = true; if (g === 75) B.tipi.gola = true; if (g === 74) B.tipi.foratura = true; }
        });
      }
      if (r && r.segmenti) r.segmenti.forEach(s => {
        if (s.riga < da || s.riga > a || s.rapido) return;
        B.lavoroM += Math.hypot((s.x - s.x0) / (tor ? 2 : 1), s.y - s.y0, s.z - s.z0) / 1000;
        B.zmin = B.zmin === null ? Math.min(s.z, s.z0) : Math.min(B.zmin, s.z, s.z0);
      });
      const nomi = [];
      if (B.tipi.maschiatura) nomi.push('Maschiatura' + (B.fori ? ': ' + B.fori + (B.fori === 1 ? ' foro' : ' fori') : ''));
      else if (B.tipi.foratura && !tor) nomi.push((B.cicli.some(g => g === 73 || g === 83) ? 'Foratura a gradini' : 'Foratura') + (B.fori ? ': ' + B.fori + (B.fori === 1 ? ' foro' : ' fori') : ''));
      if (B.tipi.alesatura) nomi.push('Alesatura' + (B.fori ? ': ' + B.fori + (B.fori === 1 ? ' foro' : ' fori') : ''));
      if (tor) {
        if (B.tipi.sgrossatura) nomi.push('Sgrossatura'); if (B.tipi.finitura) nomi.push('Finitura'); if (B.tipi.filettatura) nomi.push('Filettatura');
        if (B.tipi.gola) nomi.push('Gola o troncatura'); if (B.tipi.foratura) nomi.push('Foratura profonda o gola frontale');
      }
      if (!nomi.length) nomi.push(B.lavoroM > 0 ? (tor ? 'Tornitura' : 'Fresatura') : 'Solo movimenti e preparazione');
      B.titolo = nomi.join(' e ');
      return B;
    };
    if (!inizi.length) {
      const B = taglia(0, Math.max(0, righe.length - 1), null, 'Programma');
      blocchi.push(B);
    } else {
      if (inizi[0] > 0 && E.righe.slice(0, inizi[0]).some(s => s && s.tipo !== 'testa' && s.tipo !== 'nota')) { const B = taglia(0, inizi[0] - 1, null, 'Preparazione'); B.titolo = 'Preparazione'; blocchi.push(B); }
      inizi.forEach((da, k) => {
        const a = k + 1 < inizi.length ? inizi[k + 1] - 1 : righe.length - 1;
        const B = taglia(da, a, E.righe[da].cambioT, '');
        const q = O.pulisciRiga(righe[da]); B.commento = q.commento || prima(da);
        blocchi.push(B);
      });
    }
    // riassunto
    const riass = [];
    riass.push(['Macchina', tor ? 'Tornio' : 'Fresa']);
    const ut = blocchi.filter(b => b.t != null).map(b => b.t);
    const unici = ut.filter((x, i) => ut.indexOf(x) === i);
    if (unici.length) riass.push(['Utensili', unici.length + ': ' + unici.map(x => 'T' + x).join(', ')]);
    const lav = blocchi.filter(b => b.t != null || blocchi.length === 1).map(b => (b.t != null ? 'T' + b.t + ' ' : '') + b.titolo.toLowerCase());
    if (lav.length) riass.push(['Lavorazioni', lav.join('; ')]);
    if (r && isFinite(r.tempo)) riass.push(['Tempo stimato', n(Math.round(r.tempo * 10) / 10) + ' min']);
    if (r && r.limiti) {
      const L = r.limiti, z = L.z, q = (a, k) => (a[k] === null || !isFinite(a[k]) ? null : n(a[k]));
      if (q(z, 'minLavoro') !== null) riass.push(['Profondita massima', 'Z ' + q(z, 'minLavoro') + ' mm']);
      if (!tor && q(L.x, 'minLavoro') !== null) riass.push(['Zona lavorata', 'X ' + q(L.x, 'minLavoro') + ' / ' + q(L.x, 'maxLavoro') + ', Y ' + q(L.y, 'minLavoro') + ' / ' + q(L.y, 'maxLavoro') + ' mm']);
      if (tor && q(L.x, 'minLavoro') !== null) riass.push(['Diametri lavorati', 'da ' + q(L.x, 'minLavoro') + ' a ' + q(L.x, 'maxLavoro') + ' mm']);
    }
    const fori = blocchi.reduce((s, b) => s + b.fori, 0);
    if (fori) riass.push(['Fori', fori + ' (con i cicli fissi)']);
    if (r && r.utensili && r.utensili.length) {
      const S = [].concat(...r.utensili.map(u => u.s)).filter(x => x > 0);
      if (S.length) riass.push(['Giri mandrino', Math.round(Math.min.apply(null, S)) + (Math.min.apply(null, S) === Math.max.apply(null, S) ? '' : ' - ' + Math.round(Math.max.apply(null, S))) + ' giri/min']);
    }
    const fine = E.righe.some(s => s && s.tipo === 'fine');
    riass.push(['Fine', fine ? 'Il programma finisce con M2 o M30' : 'Manca M30 o M2: controlla il fondo del listato']);
    return { modo: E.modo, righe: E.righe, blocchi, riassunto: riass };
  }

  /** La frase del commento della simulazione: la spiegazione della riga + il passo dentro la riga. */
  function commentoPasso(sp, riga, ordine, di) {
    const s = sp && sp.righe && sp.righe[riga];
    if (!s) return '';
    return s.frase + (di > 1 && (s.tipo === 'ciclo' || s.filetto || (s.g || []).some(g => g >= 70 && g <= 76)) ? ' (movimento ' + ordine + ' di ' + di + ')' : '');
  }

  // ----- correzioni con un tocco -----
  /** Le correzioni che l'app sa fare da sola per le segnalazioni di controllaISO: [{riga, etichetta, op}]. */
  function correzioniISO(testo, r) {
    const righe = String(testo || '').replace(/\r/g, '').split('\n');
    const out = [];
    (r.segnalazioni || []).forEach(sg => {
      const i = sg.riga, l = i >= 0 ? righe[i] : '';
      if (/^parentesi del commento non chiuse/.test(sg.testo) && i >= 0) {
        const senza = l.replace(/;.*$/, '');
        const mancano = (senza.match(/\(/g) || []).length - (senza.match(/\)/g) || []).length;
        if (mancano > 0) { const k = l.indexOf(';'); const nuova = k >= 0 ? l.slice(0, k).replace(/\s+$/, '') + ')'.repeat(mancano) + ' ' + l.slice(k) : l + ')'.repeat(mancano); out.push({ riga: i, testo: sg.testo, etichetta: 'Chiudi la parentesi', op: { riga: i, tipo: 'sostituisci', testo: nuova } }); }
      } else if (/^T senza M6/.test(sg.testo) && i >= 0) {
        const nuova = l.replace(/(^|[^A-Za-z#])([Tt]\d+)/, (x, a, b) => a + b + ' M6');
        if (nuova !== l) out.push({ riga: i, testo: sg.testo, etichetta: 'Aggiungi M6', op: { riga: i, tipo: 'sostituisci', testo: nuova } });
      } else if (/^manca la fine del programma/.test(sg.testo)) out.push({ riga: i, testo: sg.testo, etichetta: 'Aggiungi M30 alla fine', op: { riga: Infinity, tipo: 'fine', testo: 'M30' } });
      else if (/^ciclo fisso G\d+ chiuso senza G80/.test(sg.testo) && i >= 0) out.push({ riga: i, testo: sg.testo, etichetta: 'Aggiungi G80 prima', op: { riga: i, tipo: 'prima', testo: 'G80' } });
    });
    return out;
  }
  /** Applica una o piu correzioni al testo e ritorna il testo nuovo (dal fondo, cosi i numeri di riga restano giusti). */
  function applicaCorrezioni(testo, correzioni) {
    const righe = String(testo || '').replace(/\r/g, '').split('\n');
    const ops = correzioni.map(c => c.op || c).sort((a, b) => b.riga - a.riga);
    const fatte = new Set();
    ops.forEach(o => {
      const chiave = o.tipo + ':' + o.riga + ':' + o.testo; if (fatte.has(chiave)) return; fatte.add(chiave);
      if (o.tipo === 'sostituisci') righe[o.riga] = o.testo;
      else if (o.tipo === 'prima') righe.splice(o.riga, 0, o.testo);
      else if (o.tipo === 'fine') {
        let k = righe.length; while (k > 0 && !righe[k - 1].trim()) k--;
        if (k > 0 && righe[k - 1].trim() === '%') righe.splice(k - 1, 0, o.testo); else righe.splice(k, 0, o.testo);
      }
    });
    return righe.join('\n');
  }

  Object.assign(O, { spiegaRiga, spiegaRighe, spiegaProgramma, commentoPasso, correzioniISO, applicaCorrezioni });
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
