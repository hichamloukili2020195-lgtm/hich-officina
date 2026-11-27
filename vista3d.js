// ===== Hich-Officina: vista 3D vera della simulazione (three.js, in locale: three.min.js, caricato quando serve) =====
// Fresa: il grezzo e fatto di colonne (una per cella) che si abbassano quando la fresa passa; si gira con un dito, si ingrandisce con due.
// Tornio: come in macchina, mandrino a sinistra e asse Z orizzontale; il pezzo e intero (a richiesta tagliato a spicchio per vedere
// l'interno), le griffe girano mentre si lavora; torretta con portautensile e inserto. Se il telefono non ha WebGL, resta il disegno 2D.
(function () {
  'use strict';
  const A = window.App;
  const webglOk = () => {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  };
  A.webgl3d = webglOk();
  // three.min.js (750 KB) non sta tra gli script dell'avvio: si carica (in locale) la prima volta che serve la vista 3D.
  // fatto(true) quando e pronto; fatto(false) se il file non si carica (la simulazione resta in 2D).
  let attese = null;
  A.carica3D = fatto => {
    if (window.THREE) { fatto(true); return; }
    if (attese) { attese.push(fatto); return; }
    attese = [fatto];
    const s = document.createElement('script');
    s.src = 'three.min.js';
    const fine = esito => { const l = attese; attese = null; if (!esito) A.webgl3d = false; l.forEach(f => { try { f(esito); } catch (e) { /* la schermata e gia chiusa */ } }); };
    s.onload = () => fine(!!window.THREE);
    s.onerror = () => { s.remove(); fine(false); };
    document.head.appendChild(s);
  };
  let attuale = null;
  A.vista3DFine = () => { if (attuale) { try { attuale.distruggi(); } catch (e) { /* gia chiuso */ } attuale = null; } };

  /** Crea la vista 3D dentro box. mat = modello di materiale (fresa o tornio). Ritorna {canvas, aggiorna(o), distruggi()} oppure null. */
  function crea3D(box, mat) {
    const T = window.THREE;
    if (!T || !A.webgl3d || !mat || mat.vuoto || mat.tipo === 'troppo') return null;
    A.vista3DFine();
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { A.webgl3d = false; return null; }
    const canvas = renderer.domElement;
    canvas.className = 'vista sim-tela'; canvas.style.touchAction = 'none'; canvas.setAttribute('aria-label', 'Vista 3D: trascina per girare, due dita per ingrandire');
    box.appendChild(canvas);
    const hint = document.createElement('div'); hint.className = 'sim-hint'; hint.textContent = 'Un dito: gira · due dita: zoom · doppio tocco: reset'; box.appendChild(hint);
    let bSez = null;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    const scena = new T.Scene(), cam = new T.PerspectiveCamera(38, 1, 0.5, 8000);
    cam.up.set(0, 0, 1);
    // luce da officina: cielo e pavimento, una luce forte davanti in alto e una di riempimento fredda
    scena.add(new T.HemisphereLight(0xe8f0ff, 0x30353f, 1.05));
    scena.add(new T.AmbientLight(0xffffff, 0.25));
    const l1 = new T.DirectionalLight(0xffffff, 1.7); l1.position.set(1, -1.4, 2.6); scena.add(l1);
    const l2 = new T.DirectionalLight(0xbcd0ff, 0.7); l2.position.set(-1.5, 1, 1); scena.add(l2);
    const tor = mat.tipo === 'tornio';
    // tornio: X della scena = Z della macchina (verso destra), Z della scena = raggio (in alto); il mandrino sta a sinistra
    const zMv = tor && mat.mandrino ? mat.mandrino.zM : (tor ? mat.zBot : 0);
    const centro = tor ? new T.Vector3((mat.zTop + zMv) / 2 + 0.12 * (mat.zTop - zMv), 0, mat.R * 0.2) : new T.Vector3((mat.x0 + mat.x1) / 2, (mat.y0 + mat.y1) / 2, -mat.lz / 2);
    const diag = tor ? Math.hypot(mat.R * 2 + 20, mat.zTop - zMv + 30) : Math.hypot(mat.x1 - mat.x0, mat.y1 - mat.y0, mat.lz);
    const vista0 = { th: tor ? -Math.PI / 2 - 0.35 : -Math.PI / 2.6, ph: tor ? 1.18 : 1.0, r: diag * (tor ? 2.4 : 1.35), t: centro.clone() };
    const sv3 = A.sezione ? A.sezione('simVista') : {};
    const o = { th: vista0.th, ph: vista0.ph, r: vista0.r, t: vista0.t.clone() };
    const disegna = () => {
      cam.position.set(o.t.x + o.r * Math.sin(o.ph) * Math.cos(o.th), o.t.y + o.r * Math.sin(o.ph) * Math.sin(o.th), o.t.z + o.r * Math.cos(o.ph));
      cam.lookAt(o.t); renderer.render(scena, cam);
    };
    // dita: uno gira, due ingrandiscono e spostano
    const dita = new Map(); let prec = null;
    const stato2 = () => { const p = [...dita.values()]; return p.length === 2 ? { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 } : null; };
    canvas.addEventListener('pointerdown', e => { try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* nessuna cattura */ } dita.set(e.pointerId, { x: e.clientX, y: e.clientY }); prec = stato2(); });
    canvas.addEventListener('pointermove', e => {
      const p = dita.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (dita.size === 1) { o.th -= dx * 0.009; o.ph = Math.max(0.08, Math.min(Math.PI - 0.08, o.ph - dy * 0.009)); }
      else if (dita.size === 2) {
        const s = stato2();
        if (prec && s.d > 0 && prec.d > 0) {
          o.r = Math.max(diag * 0.25, Math.min(diag * 5, o.r * prec.d / s.d));
          const dx2 = s.x - prec.x, dy2 = s.y - prec.y, k = o.r * 0.0016;
          const dx3 = new T.Vector3().setFromMatrixColumn(cam.matrix, 0), dy3 = new T.Vector3().setFromMatrixColumn(cam.matrix, 1);
          o.t.addScaledVector(dx3, -dx2 * k).addScaledVector(dy3, dy2 * k);
        }
        prec = s;
      }
      disegna();
    });
    const su = e => { dita.delete(e.pointerId); prec = stato2(); };
    canvas.addEventListener('pointerup', su); canvas.addEventListener('pointercancel', su);
    canvas.addEventListener('wheel', e => { e.preventDefault(); o.r = Math.max(diag * 0.25, Math.min(diag * 5, o.r * (1 + e.deltaY * 0.001))); disegna(); }, { passive: false });
    canvas.addEventListener('dblclick', () => { o.th = vista0.th; o.ph = vista0.ph; o.r = vista0.r; o.t.copy(vista0.t); disegna(); });

    // ----- il materiale -----
    let ultK = -1, ricostruisci, statoConf = null, ultConf = null;
    const risorse = [];
    if (!tor) {
      const n = mat.nx * mat.ny;
      const geo = new T.BoxGeometry(1, 1, 1), mt = new T.MeshLambertMaterial({ color: 0xffffff });
      const mesh = new T.InstancedMesh(geo, mt, n);
      mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      mesh.frustumCulled = false; scena.add(mesh); risorse.push(geo, mt);
      const tabella = []; for (let q = 0; q < 64; q++) { const c = A.coloreProfondita ? A.coloreProfondita(-(q / 63) * mat.lz, mat.lz) : [180, 190, 210]; const col = new T.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, T.SRGBColorSpace); tabella.push([col.r, col.g, col.b]); }
      const M = mesh.instanceMatrix.array, C = mesh.instanceColor.array, cs = mat.cella;
      const lin = c => { const col = new T.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, T.SRGBColorSpace); return [col.r, col.g, col.b]; };
      const colArancio = lin((A.COLORI_CONFRONTO || {}).ARANCIO || [255, 150, 40]), colRosso = lin((A.COLORI_CONFRONTO || {}).ROSSO || [230, 55, 60]);
      ricostruisci = () => {
        const { nx, ny, h, x0, y0, lz } = mat;
        for (let j = 0, k = 0; j < ny; j++) for (let i = 0; i < nx; i++, k++) {
          const v = Math.max(h[k], -lz), alt = v + lz + 0.02, p = k * 16;
          M[p] = cs; M[p + 1] = 0; M[p + 2] = 0; M[p + 3] = 0; M[p + 4] = 0; M[p + 5] = cs; M[p + 6] = 0; M[p + 7] = 0; M[p + 8] = 0; M[p + 9] = 0; M[p + 10] = alt; M[p + 11] = 0;
          M[p + 12] = x0 + (i + 0.5) * cs; M[p + 13] = y0 + (j + 0.5) * cs; M[p + 14] = (v - lz) / 2; M[p + 15] = 1;
          const so = statoConf && statoConf[k], c = so === 1 ? colArancio : so === 2 ? colRosso : tabella[Math.max(0, Math.min(63, Math.round(-v / lz * 63)))], q = k * 3; C[q] = c[0]; C[q + 1] = c[1]; C[q + 2] = c[2];
        }
        mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
      };
    } else {
      const gruppo = new T.Group(); gruppo.rotation.z = -Math.PI / 2; scena.add(gruppo);   // l'asse del solido (Y) diventa l'asse Z della macchina, orizzontale
      const mt = new T.MeshStandardMaterial({ color: 0xc3ccd8, metalness: 0.55, roughness: 0.38, side: T.DoubleSide }), mtSez = new T.MeshStandardMaterial({ color: 0xe0b866, metalness: 0.2, roughness: 0.6, side: T.DoubleSide });
      risorse.push(mt, mtSez);
      let solido = null, sezioni = null;
      ricostruisci = () => {
        const { nz, nr, occ, cella, zBot } = mat, passo = Math.max(1, Math.floor(nz / 220));
        const zs = [], ro = [], ri = [];
        for (let a = 0; a < nz; a += passo) {
          let b0 = -1, b1 = -1;
          for (let b = 0; b < nr; b++) if (occ[a * nr + b]) { if (b0 < 0) b0 = b; b1 = b; }
          if (b0 < 0) continue;
          zs.push(zBot + (a + 0.5) * cella); ro.push((b1 + 1) * cella); ri.push(b0 * cella);
        }
        if (solido) { gruppo.remove(solido); solido.geometry.dispose(); solido = null; }
        if (sezioni) { gruppo.remove(sezioni); sezioni.geometry.dispose(); sezioni = null; }
        if (zs.length < 2) return;
        const pt = [new T.Vector2(ri[0], zs[0]), new T.Vector2(ro[0], zs[0])];
        for (let i = 0; i < zs.length; i++) pt.push(new T.Vector2(ro[i], zs[i]));
        const u = zs.length - 1; pt.push(new T.Vector2(ri[u], zs[u]));
        for (let i = u; i >= 0; i--) pt.push(new T.Vector2(ri[i], zs[i]));
        const taglio = !!sv3.sez3d;
        solido = new T.Mesh(taglio ? new T.LatheGeometry(pt, 72, Math.PI / 2, Math.PI * 1.5) : new T.LatheGeometry(pt, 96), mt); gruppo.add(solido);
        if (!taglio) return;
        // le due facce del taglio a spicchio (a φ = π/2 e a φ = 2π)
        const pos = [], v = (r, y, fi) => [r * Math.sin(fi), y, r * Math.cos(fi)];
        [Math.PI / 2, Math.PI * 2].forEach(fi => {
          for (let i = 0; i < zs.length - 1; i++) {
            const A1 = v(ro[i], zs[i], fi), B1 = v(ro[i + 1], zs[i + 1], fi), C1 = v(ri[i + 1], zs[i + 1], fi), D1 = v(ri[i], zs[i], fi);
            pos.push(...A1, ...B1, ...C1, ...A1, ...C1, ...D1);
          }
        });
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
        sezioni = new T.Mesh(g, mtSez); gruppo.add(sezioni);
      };
    }
    // ----- l'utensile -----
    const ambra = new T.MeshStandardMaterial({ color: 0xffb020, metalness: 0.35, roughness: 0.4, transparent: true, opacity: 0.92 });
    let utensile, geoU;
    if (tor) {
      // portautensile, inserto rombico (la punta e l'origine del gruppo) e un pezzo di torretta
      utensile = new T.Group(); geoU = new T.BoxGeometry(1, 1, 1);
      const nero = new T.MeshStandardMaterial({ color: 0x2a2f38, metalness: 0.6, roughness: 0.45 }), oro = new T.MeshStandardMaterial({ color: 0xd8a640, metalness: 0.7, roughness: 0.3 });
      const ins = new T.Mesh(new T.CylinderGeometry(5.5, 5.5, 3, 4), oro); ins.rotation.x = Math.PI / 2; ins.scale.set(1, 1, 0.62); ins.position.set(3.4, 0, 3.4); ins.rotation.y = 0;
      const port = new T.Mesh(geoU, nero); port.scale.set(16, 14, 46); port.position.set(9, 0, 28);
      const torr = new T.Mesh(geoU, new T.MeshStandardMaterial({ color: 0x5b6577, metalness: 0.5, roughness: 0.5 })); torr.scale.set(46, 46, 30); torr.position.set(12, 0, 66);
      utensile.add(ins, port, torr); risorse.push(nero, oro, ins.geometry, torr.material);
    } else { geoU = new T.CylinderGeometry(1, 1, 1, 36); utensile = new T.Mesh(geoU, ambra); utensile.rotation.x = Math.PI / 2; }
    scena.add(utensile); risorse.push(geoU, ambra);
    // attrezzi: ganasce della morsa, mandrino con tre griffe, portautensile
    const acciaio = new T.MeshStandardMaterial({ color: 0x56637a, metalness: 0.6, roughness: 0.42 }), acciaio2 = new T.MeshStandardMaterial({ color: 0x8b97ab, metalness: 0.65, roughness: 0.35 });
    risorse.push(acciaio, acciaio2);
    (mat.ganasce || []).forEach(q => {
      const gb = new T.BoxGeometry(q.x1 - q.x0, q.y1 - q.y0, q.z1 - q.z0), me = new T.Mesh(gb, acciaio);
      me.position.set((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, (q.z0 + q.z1) / 2); scena.add(me); risorse.push(gb);
    });
    let mandrino = null;
    if (tor) {
      const R = mat.mandrino ? mat.mandrino.R : mat.R, zM = mat.mandrino ? mat.mandrino.zM : mat.zBot;
      // mandrino che gira: corpo, tre griffe a gradini; dietro la testa (fissa) e sotto il bancale
      mandrino = new T.Group(); scena.add(mandrino);
      const gc = new T.CylinderGeometry(R + 50, R + 50, 40, 48), corpo = new T.Mesh(gc, acciaio);
      corpo.rotation.z = Math.PI / 2; corpo.position.set(zM - 25 - 20, 0, 0); mandrino.add(corpo); risorse.push(gc);
      if (mat.mandrino) [90, 210, 330].forEach(a => {
        const ar = a * Math.PI / 180, gb = new T.BoxGeometry(25, 22, 22), gb2 = new T.BoxGeometry(14, 22, 20);
        const g1 = new T.Mesh(gb, acciaio2), g2 = new T.Mesh(gb2, acciaio2);
        g1.position.set(zM - 12.5, (R + 11) * Math.cos(ar), (R + 11) * Math.sin(ar)); g1.rotation.x = ar;
        g2.position.set(zM - 31, (R + 31) * Math.cos(ar), (R + 31) * Math.sin(ar)); g2.rotation.x = ar;
        mandrino.add(g1, g2); risorse.push(gb, gb2);
      });
      const testa = new T.Mesh(new T.BoxGeometry(60, 2 * R + 110, 2 * R + 120), new T.MeshStandardMaterial({ color: 0x3d4656, metalness: 0.3, roughness: 0.7 }));
      testa.position.set(zM - 65 - 30, 0, 0); scena.add(testa); risorse.push(testa.geometry, testa.material);
      const lb = Math.max(200, mat.zTop - zM + 220), banco = new T.Mesh(new T.BoxGeometry(lb, 2 * R + 220, 24), new T.MeshStandardMaterial({ color: 0x2b313c, metalness: 0.2, roughness: 0.8 }));
      banco.position.set(zM - 65 + lb / 2 - 70, 30, -(R + 110)); scena.add(banco); risorse.push(banco.geometry, banco.material);
    }
    if (!tor) {
      const lx = mat.x1 - mat.x0, ly = mat.y1 - mat.y0, tav = new T.Mesh(new T.BoxGeometry(lx + 80, ly + 80, 12), new T.MeshStandardMaterial({ color: 0x3a4250, metalness: 0.35, roughness: 0.7 }));
      const zSotto = -mat.lz - (mat.ganasce && mat.ganasce.length ? 22 : 0);
      tav.position.set((mat.x0 + mat.x1) / 2, (mat.y0 + mat.y1) / 2, zSotto - 6); scena.add(tav); risorse.push(tav.geometry, tav.material);
    }
    let porta = null;
    if (!tor && mat.porta > 0) {
      const gp = new T.CylinderGeometry(1, 1, 1, 32); porta = new T.Mesh(gp, new T.MeshLambertMaterial({ color: 0xa7b2c4, transparent: true, opacity: 0.85 }));
      porta.rotation.x = Math.PI / 2; scena.add(porta); risorse.push(gp, porta.material);
    }

    /** o2: {k, px:[x,y,z], raggio, lung}. Aggiorna il materiale, l'utensile e disegna. */
    function aggiorna(o2) {
      const W = canvas.clientWidth || 340, H = canvas.clientHeight || 300;
      if (canvas.width !== Math.round(W * renderer.getPixelRatio()) || canvas.height !== Math.round(H * renderer.getPixelRatio())) { renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); }
      statoConf = o2.stato || null;
      if (o2.k !== ultK || !!statoConf !== ultConf) { ricostruisci(); ultK = o2.k; ultConf = !!statoConf; }
      const px = o2.px;
      if (tor) { utensile.position.set(px[2], 0, px[0] / 2); if (mandrino) mandrino.rotation.x = o2.k * 0.45; }
      else {
        const R = o2.raggio > 0 ? o2.raggio : 3, L = o2.lung > 0 ? Math.min(o2.lung, 60) : Math.max(25, 4 * R);
        utensile.scale.set(R, L, R); utensile.position.set(px[0], px[1], px[2] + L / 2);
        if (porta) { porta.scale.set(mat.porta / 2, 35, mat.porta / 2); porta.position.set(px[0], px[1], px[2] + L + 17.5); }
      }
      disegna();
    }
    function distruggi() {
      renderer.dispose(); risorse.forEach(r => r.dispose && r.dispose());
      try { renderer.forceContextLoss(); } catch (e) { /* gia perso */ }
      canvas.remove(); hint.remove(); if (bSez) bSez.remove();
    }
    if (tor) {
      bSez = document.createElement('button'); bSez.className = 'chip sim-sez' + (sv3.sez3d ? ' attiva' : ''); bSez.id = 'sim-sez3d'; bSez.type = 'button';
      bSez.textContent = sv3.sez3d ? 'Sezione: si' : 'Sezione: no'; bSez.setAttribute('aria-label', 'Taglia il pezzo per vedere l\'interno');
      bSez.addEventListener('click', () => { sv3.sez3d = !sv3.sez3d; if (A.salva) A.salva(); bSez.textContent = sv3.sez3d ? 'Sezione: si' : 'Sezione: no'; bSez.classList.toggle('attiva', !!sv3.sez3d); ricostruisci(); disegna(); });
      box.appendChild(bSez);
    }
    const v3 = { canvas, hint, aggiorna, distruggi, ridisegna: disegna, get sezione() { return !!sv3.sez3d; } };
    attuale = v3;
    return v3;
  }
  A.crea3D = crea3D;
})();
