// ===== Hich-Officina: vista 3D vera della simulazione (three.js, in locale: three.min.js) =====
// Fresa: il grezzo e fatto di colonne (una per cella) che si abbassano quando la fresa passa; si gira con un dito, si ingrandisce con due.
// Tornio: il pezzo e un solido di rotazione tagliato a spicchio, cosi si vede anche l'interno. Se il telefono non ha WebGL, resta il disegno 2D.
(function () {
  'use strict';
  const A = window.App;
  const webglOk = () => {
    if (!window.THREE) return false;
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  };
  A.webgl3d = webglOk();
  let attuale = null;
  A.vista3DFine = () => { if (attuale) { try { attuale.distruggi(); } catch (e) { /* gia chiuso */ } attuale = null; } };

  /** Crea la vista 3D dentro box. mat = modello di materiale (fresa o tornio). Ritorna {canvas, aggiorna(o), distruggi()} oppure null. */
  function crea3D(box, mat) {
    const T = window.THREE;
    if (!A.webgl3d || !mat || mat.vuoto || mat.tipo === 'troppo') return null;
    A.vista3DFine();
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { A.webgl3d = false; return null; }
    const canvas = renderer.domElement;
    canvas.className = 'vista sim-tela'; canvas.style.touchAction = 'none'; canvas.setAttribute('aria-label', 'Vista 3D: trascina per girare, due dita per ingrandire');
    box.appendChild(canvas);
    const hint = document.createElement('div'); hint.className = 'sim-hint'; hint.textContent = 'Un dito: gira · due dita: zoom · doppio tocco: reset'; box.appendChild(hint);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    const scena = new T.Scene(), cam = new T.PerspectiveCamera(38, 1, 0.5, 8000);
    cam.up.set(0, 0, 1);
    scena.add(new T.AmbientLight(0xffffff, 0.75));
    const l1 = new T.DirectionalLight(0xffffff, 1.5); l1.position.set(1, -1.4, 2.6); scena.add(l1);
    const l2 = new T.DirectionalLight(0xbcd0ff, 0.6); l2.position.set(-1.5, 1, 1); scena.add(l2);
    const tor = mat.tipo === 'tornio';
    // la vista: punto guardato, distanza, angoli
    const centro = tor ? new T.Vector3(0, 0, (mat.zTop + mat.zBot) / 2) : new T.Vector3((mat.x0 + mat.x1) / 2, (mat.y0 + mat.y1) / 2, -mat.lz / 2);
    const diag = tor ? Math.hypot(mat.R * 2, mat.zTop - mat.zBot) : Math.hypot(mat.x1 - mat.x0, mat.y1 - mat.y0, mat.lz);
    const vista0 = { th: tor ? -Math.PI / 3 : -Math.PI / 2.6, ph: tor ? 1.15 : 1.0, r: diag * (tor ? 1.5 : 1.35), t: centro.clone() };
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
    let ultK = -1, ricostruisci;
    const risorse = [];
    if (!tor) {
      const n = mat.nx * mat.ny;
      const geo = new T.BoxGeometry(1, 1, 1), mt = new T.MeshLambertMaterial({ color: 0xffffff });
      const mesh = new T.InstancedMesh(geo, mt, n);
      mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      mesh.frustumCulled = false; scena.add(mesh); risorse.push(geo, mt);
      const tabella = []; for (let q = 0; q < 64; q++) { const c = A.coloreProfondita ? A.coloreProfondita(-(q / 63) * mat.lz, mat.lz) : [180, 190, 210]; const col = new T.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, T.SRGBColorSpace); tabella.push([col.r, col.g, col.b]); }
      const M = mesh.instanceMatrix.array, C = mesh.instanceColor.array, cs = mat.cella;
      ricostruisci = () => {
        const { nx, ny, h, x0, y0, lz } = mat;
        for (let j = 0, k = 0; j < ny; j++) for (let i = 0; i < nx; i++, k++) {
          const v = Math.max(h[k], -lz), alt = v + lz + 0.02, p = k * 16;
          M[p] = cs; M[p + 1] = 0; M[p + 2] = 0; M[p + 3] = 0; M[p + 4] = 0; M[p + 5] = cs; M[p + 6] = 0; M[p + 7] = 0; M[p + 8] = 0; M[p + 9] = 0; M[p + 10] = alt; M[p + 11] = 0;
          M[p + 12] = x0 + (i + 0.5) * cs; M[p + 13] = y0 + (j + 0.5) * cs; M[p + 14] = (v - lz) / 2; M[p + 15] = 1;
          const c = tabella[Math.max(0, Math.min(63, Math.round(-v / lz * 63)))], q = k * 3; C[q] = c[0]; C[q + 1] = c[1]; C[q + 2] = c[2];
        }
        mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
      };
    } else {
      const gruppo = new T.Group(); gruppo.rotation.x = Math.PI / 2; scena.add(gruppo);   // l'asse del solido (Y) diventa l'asse Z della macchina
      const mt = new T.MeshLambertMaterial({ color: 0xb4c2d8, side: T.DoubleSide }), mtSez = new T.MeshLambertMaterial({ color: 0xe6c27a, side: T.DoubleSide });
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
        solido = new T.Mesh(new T.LatheGeometry(pt, 72, Math.PI / 2, Math.PI * 1.5), mt); gruppo.add(solido);
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
    const ambra = new T.MeshLambertMaterial({ color: 0xffb020, transparent: true, opacity: 0.8 });
    let utensile, geoU;
    if (tor) { geoU = new T.BoxGeometry(7, 4, 14); utensile = new T.Mesh(geoU, ambra); } else { geoU = new T.CylinderGeometry(1, 1, 1, 36); utensile = new T.Mesh(geoU, ambra); utensile.rotation.x = Math.PI / 2; }
    scena.add(utensile); risorse.push(geoU, ambra);

    /** o2: {k, px:[x,y,z], raggio, lung}. Aggiorna il materiale, l'utensile e disegna. */
    function aggiorna(o2) {
      const W = canvas.clientWidth || 340, H = canvas.clientHeight || 300;
      if (canvas.width !== Math.round(W * renderer.getPixelRatio()) || canvas.height !== Math.round(H * renderer.getPixelRatio())) { renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); }
      if (o2.k !== ultK) { ricostruisci(); ultK = o2.k; }
      const px = o2.px;
      if (tor) utensile.position.set(px[0] / 2 + 3.5, 0, px[2] + 7);
      else {
        const R = o2.raggio > 0 ? o2.raggio : 3, L = o2.lung > 0 ? Math.min(o2.lung, 60) : Math.max(25, 4 * R);
        utensile.scale.set(R, L, R); utensile.position.set(px[0], px[1], px[2] + L / 2);
      }
      disegna();
    }
    function distruggi() {
      renderer.dispose(); risorse.forEach(r => r.dispose && r.dispose());
      try { renderer.forceContextLoss(); } catch (e) { /* gia perso */ }
      canvas.remove(); hint.remove();
    }
    const v3 = { canvas, hint, aggiorna, distruggi, ridisegna: disegna };
    attuale = v3;
    return v3;
  }
  A.crea3D = crea3D;
})();
