// origami.js: origami / papercraft (折纸) style (one of the visual styles of bubble-video-skill's promo/ films; style notes in styles/origami/STYLE.md). Load after promo.js.
// One sheet of paper = a "panel tree": each panel hangs on a crease of its parent panel and rotates by the crease angle (CSS 3D).
// Light and shade come from each panel's facing and one fixed key light; shadows fall on the table; after flattening, the paper still remembers its creases (each panel shaded slightly differently).
// When the paper is fully flat, its content is an ordinary DOM layer (text takes part in the automatic checks as usual); while folding, each panel shows a copy of the content.
//
//   const O = PROMO.origami(F, { paper, back, light, rest })
//   O.desk(parent)                                 the table
//   O.sheet(parent, { x, y, w, h, fold, folded, ... }) one sheet → S: put content in S.front; S.fold / unfold / crease / move / show
//   O.scene(layer, { fold })                       turn a full-screen layer into a sheet (for transitions)
//   O.turn(layer, { at, dur, edge })               page-turn transition
//   O.cards(parent, { at, every, items })          paper-card impact words: one card per beat lands on the table
//   O.model(parent, { def: 'crane' | 'plane' | 'boat' | custom })  3D origami model → m.move / fly / form
//   O.endcard(parent, { at, logo, tagline, url, cta }) end card: paper folded into a small square drops and unfolds
(function () {
  const P = window.PROMO;
  if (!P) throw new Error('origami.js 要在 promo.js 之后加载');
  const { clamp, lerp } = window.EV;
  const { E, seg, set, el } = P;
  const f1 = (n) => Math.round(n * 10) / 10;
  const f3 = (n) => Math.round(n * 1000) / 1000;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return l < 1e-9 ? [0, 0, 1] : [v[0] / l, v[1] / l, v[2] / l]; };
  const tp = (m, p) => { const r = m.transformPoint(new DOMPoint(p[0], p[1], p[2] || 0, 1)); return [r.x, r.y, r.z]; };
  const nrm = (m) => unit(sub(tp(m, [0, 0, 1]), tp(m, [0, 0, 0])));
  const css3 = (m) => 'matrix3d(' + Array.from(m.toFloat64Array(), (x) => (Math.abs(x) < 1e-9 ? 0 : +x.toFixed(6))).join(',') + ')';
  const hex = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) throw new Error(`折纸的颜色请写成 #RRGGBB：${c}`); const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  // relative luminance of a colour (0 black … 1 white)
  const lum = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) return 1; const n = parseInt(m[1], 16), ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]; };
  const centroid = (poly) => poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
  const area = (poly) => Math.abs(poly.reduce((s, p, i) => { const q = poly[(i + 1) % poly.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  // grow panel outlines outwards a tiny bit, so no seam shows between neighbouring panels
  const grow = (poly, d) => { const c = centroid(poly); return poly.map(([u, v]) => { const l = Math.hypot(u - c[0], v - c[1]) || 1; return [u + ((u - c[0]) / l) * d, v + ((v - c[1]) / l) * d]; }); };
  const clipOf = (poly) => `polygon(${poly.map(([u, v]) => `${f1(u)}px ${f1(v)}px`).join(',')})`;
  const pathOf = (poly) => 'M' + poly.map(([u, v]) => `${f1(u)} ${f1(v)}`).join(' L') + ' Z';
  const R4 = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

  // ---------- Quaternions (model orientation: smooth transitions between flight path and keyframes) ----------
  const Q = {
    fromBasis(f, d, z) {
      const [m00, m10, m20] = f, [m01, m11, m21] = d, [m02, m12, m22] = z, tr = m00 + m11 + m22;
      let s;
      if (tr > 0) { s = Math.sqrt(tr + 1) * 2; return [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s]; }
      if (m00 > m11 && m00 > m22) { s = Math.sqrt(1 + m00 - m11 - m22) * 2; return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
      if (m11 > m22) { s = Math.sqrt(1 + m11 - m00 - m22) * 2; return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]; }
      s = Math.sqrt(1 + m22 - m00 - m11) * 2; return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
    },
    euler(rx = 0, ry = 0, rz = 0) { const m = new DOMMatrix().rotateAxisAngle(0, 0, 1, rz).rotateAxisAngle(0, 1, 0, ry).rotateAxisAngle(1, 0, 0, rx); return Q.fromBasis([m.m11, m.m12, m.m13], [m.m21, m.m22, m.m23], [m.m31, m.m32, m.m33]); },
    slerp(a, b, t) {
      let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
      if (d < 0) { b = b.map((x) => -x); d = -d; }
      if (d > 0.9995) { const r = a.map((x, i) => x + (b[i] - x) * t), l = Math.hypot(...r); return r.map((x) => x / l); }
      const th = Math.acos(d), s = Math.sin(th), ka = Math.sin((1 - t) * th) / s, kb = Math.sin(t * th) / s;
      return a.map((x, i) => x * ka + b[i] * kb);
    },
    matrix([x, y, z, w]) {
      return DOMMatrix.fromFloat64Array(new Float64Array([1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0, 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, 0, 0, 0, 1]));
    },
  };

  // ---------- Fold plans (how a w × h sheet splits into panels, and which crease folds first) ----------
  // Each panel: { poly: [[u, v], …] (coordinates on the paper, px), parent: parent panel index, hinge: [[u, v], [u, v]] the crease, crease: crease group name (a group moves together),
  //            type: 'valley' folds towards the camera / 'mountain' folds back, fold: degrees turned when fully folded, lift: px off the parent panel, own: true = has its own content (a pop-up card)}
  // order: crease groups fold() folds in turn; unfold() in reverse
  const PLANS = {
    flat: ({ w, h }) => ({ panels: [{ poly: R4(0, 0, w, h) }], order: [] }),
    // Fold in half. axis 'v' vertical crease / 'h' horizontal crease; at crease position 0–1; moving 'end' right / bottom half folds over, 'start' left / top half; bend 'valley' folds forward / 'mountain' folds back
    half: ({ w, h, axis = 'v', at = 0.5, moving = 'end', bend = 'valley' }) => {
      const c = axis === 'v' ? w * at : h * at;
      const A = axis === 'v' ? R4(0, 0, c, h) : R4(0, 0, w, c), B = axis === 'v' ? R4(c, 0, w, h) : R4(0, c, w, h);
      const hinge = axis === 'v' ? [[c, 0], [c, h]] : [[0, c], [w, c]];
      const [root, kid] = moving === 'end' ? [A, B] : [B, A];
      return { panels: [{ poly: root }, { poly: kid, parent: 0, hinge, crease: 'c1', type: bend }], order: ['c1'] };
    },
    // Map fold: cols × rows cells; vertical creases first (gathered right to left), then horizontal (gathered bottom to top); folded size is the top-left cell
    grid: ({ w, h, cols = 2, rows = 2 }) => {
      const panels = [], id = (i, j) => j * cols + i, cw = w / cols, rh = h / rows;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const p = { poly: R4(i * cw, j * rh, (i + 1) * cw, (j + 1) * rh) };
        if (j === 0 && i > 0) Object.assign(p, { parent: id(i - 1, 0), hinge: [[i * cw, 0], [i * cw, h]], crease: 'v' + i, type: i % 2 ? 'valley' : 'mountain' });
        if (j > 0) Object.assign(p, { parent: id(i, j - 1), hinge: [[0, j * rh], [w, j * rh]], crease: 'h' + j, type: j % 2 ? 'valley' : 'mountain' });
        panels.push(p);
      }
      const order = [...Array.from({ length: cols - 1 }, (_, k) => 'v' + (cols - 1 - k)), ...Array.from({ length: rows - 1 }, (_, k) => 'h' + (rows - 1 - k))];
      return { panels, order };
    },
    // Accordion fold: n strips, alternating mountain and valley, unfolding together; from 'start' | 'center' | 'end': which strip they stack on when gathered
    accordion: ({ w, h, n = 4, axis = 'v', from = 'start' }) => {
      const L = axis === 'v' ? w : h, k = from === 'center' ? Math.floor((n - 1) / 2) : from === 'end' ? n - 1 : 0, panels = [];
      for (let i = 0; i < n; i++) {
        const a = (i * L) / n, b = ((i + 1) * L) / n, p = { poly: axis === 'v' ? R4(a, 0, b, h) : R4(0, a, w, b) };
        if (i !== k) { const e = i > k ? a : b; Object.assign(p, { parent: i > k ? i - 1 : i + 1, hinge: axis === 'v' ? [[e, 0], [e, h]] : [[0, e], [w, e]], crease: 'z', type: Math.abs(i - k) % 2 ? 'valley' : 'mountain' }); }
        panels.push(p);
      }
      return { panels, order: ['z'] };
    },
    // Letter fold (tri-fold): the right side folds in first, then the left covers it
    letter: ({ w, h, axis = 'v' }) => {
      const L = axis === 'v' ? w : h, a = L / 3, b = (2 * L) / 3, r = (x0, x1) => (axis === 'v' ? R4(x0, 0, x1, h) : R4(0, x0, w, x1)), hl = (x) => (axis === 'v' ? [[x, 0], [x, h]] : [[0, x], [w, x]]);
      return { panels: [{ poly: r(a, b) }, { poly: r(0, a), parent: 0, hinge: hl(a), crease: 'c1', type: 'valley', fold: 177.6 }, { poly: r(b, L), parent: 0, hinge: hl(b), crease: 'c2', type: 'valley', fold: 179.3 }], order: ['c2', 'c1'] };
    },
    // Gate fold: the outer quarters close towards the middle at the same time
    gate: ({ w, h, axis = 'v' }) => {
      const L = axis === 'v' ? w : h, a = L / 4, b = (3 * L) / 4, r = (x0, x1) => (axis === 'v' ? R4(x0, 0, x1, h) : R4(0, x0, w, x1)), hl = (x) => (axis === 'v' ? [[x, 0], [x, h]] : [[0, x], [w, x]]);
      return { panels: [{ poly: r(a, b) }, { poly: r(0, a), parent: 0, hinge: hl(a), crease: 'g', type: 'valley' }, { poly: r(b, L), parent: 0, hinge: hl(b), crease: 'g', type: 'valley' }], order: ['g'] };
    },
    // Dog-ear: corner 'tl' | 'tr' | 'bl' | 'br', size the corner's edge length (px). Folding halfway (crease to 0.5) = "lifting a corner"
    //   bend 'valley' (default) folds forward and shows the white back; 'mountain' folds back behind the sheet and shows the sheet underneath (a book page's dog-ear)
    corner: ({ w, h, corner = 'br', size, bend = 'valley' }) => {
      const s = size ?? Math.min(w, h) * 0.3, C = { tl: [0, 0], tr: [w, 0], bl: [0, h], br: [w, h] }[corner], sx = C[0] ? -1 : 1, sy = C[1] ? -1 : 1;
      const A = [C[0] + sx * s, C[1]], B = [C[0], C[1] + sy * s];
      const tri = [A, C, B], rest = { tl: [A, [w, 0], [w, h], [0, h], B], tr: [[0, 0], A, B, [w, h], [0, h]], bl: [[0, 0], [w, 0], [w, h], A, B], br: [[0, 0], [w, 0], B, A, [0, h]] }[corner];
      return { panels: [{ poly: rest }, { poly: tri, parent: 0, hinge: [A, B], crease: 'corner', type: bend }], order: ['corner'] };
    },
    // Pop-up book: a base + a few cards that stand up (items: [{ x, y, w, h, edge: 'bottom' | 'top' | 'left' | 'right', angle: 90, crease }])
    //   cards have their own content (S.panels[i].content, i from 1); fold() = stand up, unfold() = lie down
    popup: ({ w, h, items = [] }) => {
      const panels = [{ poly: R4(0, 0, w, h) }];
      items.forEach((it, k) => {
        const { x, y } = it, e = it.edge ?? 'bottom', x1 = x + it.w, y1 = y + it.h;
        const hinge = { bottom: [[x, y1], [x1, y1]], top: [[x, y], [x1, y]], left: [[x, y], [x, y1]], right: [[x1, y], [x1, y1]] }[e];
        panels.push({ poly: R4(x, y, x1, y1), parent: 0, hinge, crease: it.crease ?? 'p', type: 'valley', fold: it.angle ?? 90, lift: 0.8, own: true, paper: it.paper, back: it.back });
      });
      return { panels, order: [...new Set(panels.slice(1).map((p) => p.crease))] };
    },
    // Narrow strip panels chained from the edge side (makes the paper curl during a page turn; fold = degrees of bend between strips)
    strips: ({ w, h, n = 8, edge = 'left', fold = 14, bend = 'mountain' }) => {
      const v = edge === 'left' || edge === 'right', L = v ? w : h, fwd = edge === 'left' || edge === 'top', panels = [];
      for (let i = 0; i < n; i++) {
        const a = (i * L) / n, b = ((i + 1) * L) / n, [s0, s1] = fwd ? [a, b] : [L - b, L - a];
        const p = { poly: v ? R4(s0, 0, s1, h) : R4(0, s0, w, s1) }, hl = fwd ? s0 : s1;
        if (i) Object.assign(p, { parent: i - 1, hinge: v ? [[hl, 0], [hl, h]] : [[0, hl], [w, hl]], crease: 'curl', type: bend, fold });
        panels.push(p);
      }
      return { panels, order: ['curl'] };
    },
  };

  // ---------- 3D origami models (vertices in units of about ±1; x forward, y down, z towards the camera) ----------
  // { v: vertices, f: triangles (vertex indices), flat: each vertex's position on the unfolded paper [u, v] (needed for form: folding from a flat sheet into the model),
  //   joints: { name: { verts: [moving vertices], axis: [the axis's two vertices] } }, flap: { joint name: direction } (joints that move together when flapping)}
  const MODELS = {
    // Paper plane: nose towards +x; two wings + two keels
    plane: {
      v: [[1, 0, 0], [-1, 0.32, 0], [-1, 0, -0.035], [-1, 0, 0.035], [-1, -0.07, -0.85], [-1, -0.07, 0.85]],
      flat: [[1, 0], [-1, 0], [-1, -0.32], [-1, 0.32], [-1, -1.17], [-1, 1.17]],
      f: [[0, 1, 2], [0, 3, 1], [0, 2, 4], [0, 5, 3]],
      joints: { wingL: { verts: [4], axis: [0, 2] }, wingR: { verts: [5], axis: [3, 0] } },
      flap: { wingL: 1, wingR: 1 },
    },
    // Paper boat: front and back of the hull + the two ends + the sail
    boat: {
      v: [[-1.25, 0, 0.3], [1.25, 0, 0.3], [0.8, 0.42, 0.28], [-0.8, 0.42, 0.28], [-1.25, 0, -0.3], [1.25, 0, -0.3], [0.8, 0.42, -0.28], [-0.8, 0.42, -0.28], [0, -0.95, 0], [-0.62, 0, 0.02], [0.62, 0, 0.02], [-0.62, 0, -0.02], [0.62, 0, -0.02]],
      f: [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [8, 9, 10], [8, 12, 11], [0, 3, 7], [0, 7, 4], [1, 5, 6], [1, 6, 2]],
    },
    // Paper crane: body (puffed out on both sides), neck, head, tail, two wings (can flap)
    crane: {
      v: [[0, -0.12, 0], [0, 0.32, 0], [0.32, 0.1, 0], [-0.32, 0.1, 0], [0, 0.1, -0.2], [0, 0.1, 0.2], [0.2, 0.02, 0], [0.95, -0.9, 0], [1.13, -0.74, 0], [-0.2, 0.02, 0], [-1.0, -0.85, 0], [-0.17, -0.08, 0], [0.17, -0.08, 0], [-0.12, -0.6, -1.0], [-0.12, -0.6, 1.0], [0.86, -0.74, 0]],
      f: [[2, 0, 4], [0, 3, 4], [3, 1, 4], [1, 2, 4], [0, 2, 5], [3, 0, 5], [1, 3, 5], [2, 1, 5], [2, 6, 7], [7, 8, 15], [3, 9, 10], [11, 12, 13], [12, 11, 14]],
      joints: { wingL: { verts: [13], axis: [11, 12] }, wingR: { verts: [14], axis: [12, 11] } },
      flap: { wingL: 1, wingR: 1 },
    },
  };

  // Paper fibre texture (static, tiled; the texture doesn't change over time, so the film compresses well)
  const TEX = {};
  function texture(amount) {
    const k = Math.round(amount * 100);
    if (TEX[k]) return TEX[k];
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), img = g.createImageData(256, 256), r = EV.rng(7331 + k), a = 34 * amount;
    for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - 0.5) * a; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    for (let j = 0; j < 220; j++) { g.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.16 * amount})` : `rgba(0,0,0,${0.12 * amount})`; g.lineWidth = 0.5 + r() * 0.6; g.beginPath(); const x = r() * 256, y = r() * 256, an = r() * Math.PI, l = 3 + r() * 16; g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(an + 0.4) * l * 0.5, y + Math.sin(an + 0.4) * l * 0.5, x + Math.cos(an) * l, y + Math.sin(an) * l); g.stroke(); }
    return (TEX[k] = c.toDataURL('image/png'));
  }

  // Images copied onto panels while folding: wait for them to decode before capturing (otherwise a blank frame gets captured)
  let pending = [];
  const prevWait = EV.waitMedia;
  EV.waitMedia = () => {
    const list = pending; pending = [];
    const mine = list.length ? Promise.all(list.map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => { i.onload = i.onerror = r; })))) : null;
    const theirs = prevWait ? prevWait() : null;
    return mine || theirs ? Promise.all([mine, theirs]) : undefined;
  };

  function origami(F, opt = {}) {
    const O = {
      F,
      paper: opt.paper ?? '#F3EEE4',
      ink: opt.ink,
      back: opt.back ?? '#FBF9F4',
      light: unit(opt.light ?? [-0.5, -0.45, 0.95]),
      ambient: opt.ambient ?? 0.6,
      diffuse: opt.diffuse ?? 0.5,
      rest: opt.rest ?? 6,
      shadow: opt.shadow ?? 0.28,
      persp: F.px(opt.perspective ?? 2600),
      PLANS, MODELS, Q,
    };
    O.tex = texture(opt.grain ?? 0.6);
    // Brightness: 1 = lying flat facing the camera; above 1 = facing the key light, below 1 = turned away
    O.shade = (n) => (O.ambient + O.diffuse * Math.max(0, dot(n, O.light))) / (O.ambient + O.diffuse * O.light[2]);
    // Shading: the dark side multiplies in a warm brown (paper in shadow leans warm, not grey); the lit side gets a layer of warm white
    const shadeCss = (d) => (d < 0 ? { background: `rgba(120,84,52,${f3(Math.min(0.9, -d * 1.45))})`, mixBlendMode: 'multiply' } : { background: `rgba(255,252,244,${f3(Math.min(0.55, d * 0.95))})`, mixBlendMode: 'normal' });
    const overlay = (d) => shadeCss(d).background;
    const tone = (c, s) => (s <= 1 ? c.map((x, i) => x * Math.max(0, s - (1 - s) * [0, 0.06, 0.16][i])) : c.map((x) => x + (255 - x) * Math.min(1, (s - 1) * 1.2)));
    const rgb = (c) => `rgb(${c.map((x) => Math.round(clamp(x, 0, 255))).join(',')})`;
    const surface = (c) => `background-color:${c};background-image:url(${O.tex});background-size:256px 256px;background-blend-mode:overlay;`;
    const L = O.light, kx = -L[0] / L[2], ky = -L[1] / L[2];
    let uid = 0;

    // A 3D space filling the parent layer (perspective origin at the parent layer's centre)
    function space(parent, zIndex, before, persp) {
      // A sheet placed on another sheet (a menu, a chart card): sits above that sheet's crease and "remembered crease" shading — it is a different sheet and doesn't carry the creases of the one underneath
      if ((zIndex === undefined || zIndex === '') && parent.closest && parent.closest('[data-ori-flat]')) zIndex = 2;
      const w = el('div', `inset:0;perspective:${persp ?? O.persp}px;perspective-origin:50% 50%;transform-style:preserve-3d;pointer-events:none;${zIndex !== undefined && zIndex !== '' ? `z-index:${zIndex};` : ''}`);
      if (before) parent.insertBefore(w, before); else parent.appendChild(w);
      return w;
    }
    // Shadow on the table: a contact shadow on the ground + a cast shadow that gets fainter and softer the higher it is
    function shadowLayer(wrap) {
      const id = 'oris' + ++uid;
      const svg = svgEl('svg', { width: F.W, height: F.H }, wrap);
      svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none;transform:translateZ(-1px)';
      const defs = svgEl('defs', {}, svg);
      const fc = svgEl('filter', { id: id + 'c', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs), fs = svgEl('filter', { id: id + 's', x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs);
      svgEl('feGaussianBlur', { stdDeviation: F.px(2.5) }, fc);
      const blur = svgEl('feGaussianBlur', { stdDeviation: 4 }, fs);
      const gs = svgEl('g', { filter: `url(#${id}s)`, fill: '#2a1d10', opacity: 0 }, svg), gc = svgEl('g', { filter: `url(#${id}c)`, fill: '#2a1d10', opacity: f3(O.shadow * 0.85) }, svg);
      return { gc, gs, blur, poly: (g) => svgEl('polygon', { points: '' }, g) };
    }
    // Cast shadow: project a set of panels / triangles (world coordinates) onto the table (z = 0)
    const contactH = F.px(5), lift = F.px(2.5);
    function castShadows(sh, faces) {
      let hs = 0, hn = 0;
      for (const fc of faces) {
        const pts = fc.pts, minZ = Math.min(...pts.map((q) => q[2]));
        const proj = (dz) => pts.map(([x, y, z]) => `${f1(x + kx * (z + dz))},${f1(y + ky * (z + dz))}`).join(' ');
        const touch = minZ < contactH;
        fc.sc.setAttribute('points', touch ? proj(lift) : '');
        fc.ss.setAttribute('points', proj(0));
        for (const q of pts) { hs += Math.max(0, q[2]); hn++; }
      }
      const h = hn ? hs / hn : 0;
      sh.gs.setAttribute('opacity', f3(O.shadow * 0.7 * clamp(h / F.px(25)) * clamp(1.1 - h / F.px(1400))));
      sh.blur.setAttribute('stdDeviation', f1(F.px(3) + h * 0.06));
    }

    // ---------- One sheet ----------
    // o: { x, y, w, h (position in the parent layer when lying flat), fold: plan name | { type, ...params } | { panels, order }, folded: true = starts folded,
    //      front: html text | element (content printed on the front; can also be put into S.front later), paper, back (back colour),
    //      z (height above the table), rx, ry, rz, s, pivot: [u, v] (rotation centre, default the sheet's centre), show: [appear, disappear], zIndex, showThrough (how much the front shows through the back, e.g. 0.08)}
    function sheet(parent, o) {
      const W = o.w, H = o.h;
      const spec = typeof o.fold === 'string' ? { type: o.fold } : o.fold || { type: 'flat' };
      const gen = spec.panels ? null : PLANS[spec.type];
      if (!spec.panels && !gen) throw new Error(`没有这种折法：${spec.type}（可用：${Object.keys(PLANS).join(' / ')}，或者自己写 { panels, order }）`);
      const plan = spec.panels ? spec : gen({ w: W, h: H, ...spec });
      const paper = o.paper ?? O.paper, backPaper = o.back ?? O.back;
      const wrap = space(parent, o.zIndex, o.before, o.perspective && F.px(o.perspective));
      // world: the whole table block (shadows + paper); S.view() rotates this — like the camera looking at the table from another angle, so the paper never sinks below the table
      const world = el('div', 'inset:0;transform-style:preserve-3d', wrap), sh = shadowLayer(world);
      const root = el('div', `left:0;top:0;width:${W}px;height:${H}px;transform-style:preserve-3d;transform-origin:0 0`, world);
      // The flat layer: the real content
      const flat = el('div', `left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;${surface(paper)}`, root);
      flat.dataset.oriFlat = '1';
      const front = o.front instanceof Element ? o.front : el('div', 'inset:0', null, typeof o.front === 'string' ? o.front : undefined);
      flat.appendChild(front);
      // Creases and shading: above the printed content (z 1) but below any other sheet placed on this one (z 2, see space)
      const flatShade = el('div', 'inset:0;pointer-events:none;z-index:1', flat);
      const flatSvg = svgEl('svg', { width: W, height: H }, flat);
      flatSvg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:1';
      // Content of the back: visible only when the paper is turned or folded over (kept in the page so images can preload)
      const back = el('div', `left:0;top:0;width:${W}px;height:${H}px;display:none`, root);
      const pan = plan.panels.map((p, i) => ({ ...p, i, parent: p.parent ?? -1, fold: p.fold ?? 179.3, type: p.type ?? 'valley' }));
      const depth = (p) => (p.parent < 0 ? 0 : 1 + depth(pan[p.parent]));
      const order = [...pan].sort((a, b) => depth(a) - depth(b));
      const paperArea = pan.filter((p) => !p.own).reduce((a, p) => a + area(p.poly), 0);
      const creases = [...new Set(pan.filter((p) => p.parent >= 0).map((p) => p.crease))];
      // Which way a crease turns: valley = the panel turns towards the camera
      for (const p of pan) if (p.parent >= 0) {
        const [a, b] = p.hinge, c = centroid(p.poly);
        const m = new DOMMatrix().translate(a[0], a[1]).rotateAxisAngle(b[0] - a[0], b[1] - a[1], 0, 10).translate(-a[0], -a[1]);
        p.sign = (tp(m, [c[0], c[1], 0])[2] > 0) === (p.type === 'valley') ? 1 : -1;
      }
      const mats = (angleOf) => {
        const M = [];
        for (const p of order) {
          if (p.parent < 0) { M[p.i] = new DOMMatrix(); continue; }
          const [a, b] = p.hinge;
          M[p.i] = M[p.parent].translate(a[0], a[1]).rotateAxisAngle(b[0] - a[0], b[1] - a[1], 0, p.sign * angleOf(p)).translate(-a[0], -a[1]).translate(0, 0, p.lift || 0);
        }
        return M;
      };
      // The paper remembers its creases: the shading difference of each panel folded rest degrees about its own crease (not cumulative), kept after flattening
      const rest = o.rest ?? O.rest;
      for (const p of pan) {
        if (p.parent < 0 || !rest) { p.rest = 0; continue; }
        const [a, b] = p.hinge;
        p.rest = O.shade(nrm(new DOMMatrix().rotateAxisAngle(b[0] - a[0], b[1] - a[1], 0, p.sign * rest))) - 1;
      }
      const creaseLine = (svg, a, b) => {
        svgEl('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'rgba(60,40,20,.13)', 'stroke-width': F.px(1.6) }, svg);
        svgEl('line', { x1: a[0] + 1, y1: a[1] + 1, x2: b[0] + 1, y2: b[1] + 1, stroke: 'rgba(255,255,255,.38)', 'stroke-width': F.px(1) }, svg);
      };
      for (const p of pan) if (!p.own) {
        if (Math.abs(p.rest) > 0.002) svgEl('polygon', { points: p.poly.map((q) => q.join(',')).join(' '), fill: overlay(p.rest), style: `mix-blend-mode:${shadeCss(p.rest).mixBlendMode}` }, flatSvg);
        if (p.parent >= 0 && o.creases !== false) creaseLine(flatSvg, ...p.hinge);
      }
      // Each panel: one layer for the front, one for the back (the side facing away from the camera isn't drawn)
      for (const p of pan) {
        p.el = el('div', `left:0;top:0;width:${W}px;height:${H}px;transform-style:preserve-3d;transform-origin:0 0;display:none`, root);
        const g = grow(p.poly, 0.6);
        p.ff = el('div', `inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;clip-path:${clipOf(g)};${surface(p.paper ?? paper)}`, p.el);
        p.fc = el('div', 'inset:0', p.ff);
        p.fs = el('div', 'inset:0;z-index:3', p.ff);   // shading while folding goes on top (darkening the copied content and any sheets on this sheet too)
        p.bf = el('div', `inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:rotateY(180deg);clip-path:${clipOf(g.map(([u, v]) => [W - u, v]))};${surface(p.back ?? backPaper)}`, p.el);
        p.bc = el('div', 'inset:0', p.bf);
        p.bs = el('div', 'inset:0', p.bf);
        const lines = [...(p.parent >= 0 ? [p.hinge] : []), ...pan.filter((k) => k.parent === p.i && !k.own).map((k) => k.hinge)];
        if (lines.length && o.creases !== false) { const s = svgEl('svg', { width: W, height: H }, p.ff); s.style.cssText = 'position:absolute;left:0;top:0;z-index:1'; for (const [a, b] of lines) creaseLine(s, a, b); }
        // A pop-up card's own content: an area exactly covering this panel (using the card's own coordinates inside)
        if (p.own) { const xs = p.poly.map((q) => q[0]), ys = p.poly.map((q) => q[1]), x0 = Math.min(...xs), y0 = Math.min(...ys); p.content = el('div', `left:${x0}px;top:${y0}px;width:${Math.max(...xs) - x0}px;height:${Math.max(...ys) - y0}px;overflow:hidden`, p.fc); }
        p.sc = sh.poly(sh.gc); p.ss = sh.poly(sh.gs);
      }

      // ---- Time: crease keyframes, movement of the whole sheet ----
      const keys = {}, drive = {}, q0 = {};
      for (const c of creases) q0[c] = o.folded ? 1 : (o.start && o.start[c]) ?? 0;
      const qAt = (c, t) => { let q = q0[c]; for (const k of keys[c] || []) { if (t <= k.at) break; q = lerp(q, k.to, seg(t, k.at, k.at + k.dur, k.ease)); } return drive[c] ? drive[c](t, q) : q; };
      const T0 = { x: o.x ?? 0, y: o.y ?? 0, z: o.z ?? 0, rx: o.rx ?? 0, ry: o.ry ?? 0, rz: o.rz ?? 0, s: o.s ?? 1 }, moves = [], views = [];
      const V0 = { rx: 0, ry: 0, rz: 0, ...(o.view || {}) }, vc = o.viewCenter ?? [T0.x + W / 2, T0.y + H / 2];
      const vf = (t) => { const s = { ...V0 }; for (const k of views) { if (t <= k.at) break; const u = seg(t, k.at, k.at + k.dur, k.ease); for (const p in k.to) s[p] = lerp(s[p], k.to[p], u); } return s; };
      // The rotation centre defaults to the centre of the root panel (every panel ends up stacked on it): a folded square drops and flips about itself instead of swinging out from a corner.
      //   For an unfolded sheet or a pop-up book's base the root panel is the whole sheet, i.e. the sheet's centre
      const rootP = pan.find((p) => p.parent < 0), rootC = centroid(rootP.poly);
      const pv = o.pivot ?? rootC;
      const tf = (t) => {
        const s = { ...T0 };
        for (const k of moves) {
          if (t <= k.at) break;
          const u = seg(t, k.at, k.at + k.dur, k.ease);
          for (const p in k.to) s[p] = lerp(s[p], k.to[p], u);
          if (k.lift) s.z += k.lift * Math.sin(Math.PI * u);
        }
        return s;
      };
      let show = o.show ?? [-1, 1e9];
      const sizeOf = (c) => clamp((pan.filter((p) => p.crease === c).reduce((s, p) => s + area(p.poly), 0) / (F.W * F.H)) * 2.5);

      const S = {
        wrap, root, front, back, flat, panels: pan, w: W, h: H, plan,
        // Centre of the root panel (paper coordinates): the centre of the small square when folded. A "grow from the centre" unfold = start with the sheet shifted by (w/2 − rc[0], h/2 − rc[1]) and shift it back while unfolding
        rc: rootC,
        // Position in the parent layer of paper point (u, v) when lying flat and unmoved (for placing cursors, annotations)
        P: (u, v) => [T0.x + u, T0.y + v],
        // A crease group starts at at and turns to q over dur seconds (0 = flat, 1 = fully folded)
        crease(c, at, dur, q, ease = E.cubicInOut) { if (!creases.includes(c)) throw new Error(`这张纸没有折痕组 "${c}"（有：${creases.join(' / ')}）`); (keys[c] ??= []).push({ at, dur, to: q, ease }); keys[c].sort((a, b) => a.at - b.at); return S; },
        // Compute a crease group's value over time yourself: fn(t, value from the keyframes) → q
        drive(c, fn) { drive[c] = fn; return S; },
        // Fold up / unfold in sequence; o2: { order, overlap (overlap ratio between neighbouring crease groups, default 0.3), ease, to, sfx (sound type; false = none), gain }
        fold(at, dur, o2 = {}) { return run(o2.order ?? plan.order ?? creases, at, dur, o2.to ?? 1, o2, 'fold'); },
        unfold(at, dur, o2 = {}) { return run(o2.order ?? [...(plan.order ?? creases)].reverse(), at, dur, o2.to ?? 0, o2, 'unfold'); },
        // Move / rotate the whole sheet: to = { x, y, z, rx, ry, rz, s }; o2: { ease, lift (how high it rises on the way), sfx (sound at the start), land: true (sound when it lands on the table), gain }
        move(at, dur, to, o2 = {}) {
          moves.push({ at, dur, to, ease: o2.ease ?? E.cubicInOut, lift: o2.lift });
          moves.sort((a, b) => a.at - b.at);
          if (o2.sfx) F.sfx(at, o2.sfx, o2.gain ?? 0.7, { dur, size: 0.5 });
          if (o2.land) F.sfx(at + dur - 0.02, 'land', o2.gain ?? 0.9, { size: clamp((W * H) / (F.W * F.H) * 2) });
          if (dur > 0.05 && o2.blur !== false) F.blur(at, at + dur, 12);
          return S;
        },
        // Look at this sheet and the table under it from another angle: to = { rx, ry, rz } (about the sheet's centre); pop-up books and standing things need this to read as 3D
        view(at, dur, to, o2 = {}) { views.push({ at, dur, to, ease: o2.ease ?? E.cubicInOut }); views.sort((a, b) => a.at - b.at); if (dur > 0.05) F.blur(at, at + dur, 10); return S; },
        show(a, b = 1e9) { show = [a, b]; return S; },
        at: tf,
      };
      function run(list, at, dur, to, o2, type) {
        const n = list.length;
        if (!n) return S;
        const ov = o2.overlap ?? 0.3, per = dur / (n - (n - 1) * ov);
        list.forEach((c, i) => S.crease(c, at + i * per * (1 - ov), per, to, o2.ease));
        if (o2.sfx !== false) {
          const g = o2.gain ?? 0.8, s = Math.max(...list.map(sizeOf));
          if (n <= 2) list.forEach((c, i) => F.sfx(at + i * per * (1 - ov), o2.sfx ?? type, g, { dur: per, size: sizeOf(c) }));
          else F.sfx(at, o2.sfx ?? type, g, { dur, size: s });
        }
        F.blur(at, at + dur, 10);
        return S;
      }

      // ---- Every frame (after all F.add calls: content already looks like this frame) ----
      // Paper dropping into frame from high up: the first frame it appears is a whole block (perspective still enlarged) — registered as an intended appearance so the film check doesn't report a jump
      F.prep(() => { if (show[0] > 0 && tf(show[0]).z > F.px(150)) F.appear(show[0]); });
      F.late((t) => {
        // When the paper's content is hidden entirely (scene layer display:none), the paper doesn't appear either
        const on = t >= show[0] && t < show[1] && front.style.display !== 'none';
        set(wrap, { display: on ? '' : 'none' });
        if (!on) return;
        const tr = tf(t);
        const q = {};
        for (const c of creases) q[c] = qAt(c, t);
        const M = mats((p) => p.fold * q[p.crease]);
        let SM = new DOMMatrix().translate(tr.x, tr.y, tr.z).translate(pv[0], pv[1]).rotateAxisAngle(0, 0, 1, tr.rz).rotateAxisAngle(0, 1, 0, tr.ry).rotateAxisAngle(1, 0, 0, tr.rx).scale(tr.s, tr.s, tr.s).translate(-pv[0], -pv[1]);
        // Paper never folds into the table: when a mountain-folded panel or a sheet flipping backwards dips below the table, the whole sheet is propped up by it.
        //   Without the prop that part would go behind the table's shadow layer, be covered as a dark patch, and the frame it flattens would suddenly brighten (the film check reports a "jump")
        let minZ = 0;
        for (const p of pan) { const W3 = SM.multiply(M[p.i]); for (const [u, v] of p.poly) minZ = Math.min(minZ, tp(W3, [u, v, 0])[2]); }
        if (minZ < -0.5) SM = new DOMMatrix().translate(0, 0, -minZ).multiply(SM);
        set(root, { transform: css3(SM) });
        const vw = vf(t), VM = new DOMMatrix().translate(vc[0], vc[1]).rotateAxisAngle(0, 0, 1, vw.rz).rotateAxisAngle(0, 1, 0, vw.ry).rotateAxisAngle(1, 0, 0, vw.rx).translate(-vc[0], -vc[1]);
        set(world, { transform: vw.rx || vw.ry || vw.rz ? css3(VM) : 'none' });
        set(flatShade, vw.rx || vw.ry ? shadeCss(O.shade(nrm(VM.multiply(SM))) - 1) : { background: 'none' });
        // Which panels are flat now (neither it nor its chain to the root folded, the sheet not flipped): these are drawn by the flat layer (the real content)
        const tilt = Math.abs(tr.rx) > 0.01 || Math.abs(tr.ry) > 0.01;
        for (const p of order) p.flat = !tilt && !p.own && (p.parent < 0 || (pan[p.parent].flat && Math.abs(q[p.crease]) < 1e-4));
        const paperPanels = pan.filter((p) => !p.own), flatSet = paperPanels.filter((p) => p.flat);
        const whole = flatSet.length === paperPanels.length;
        set(flat, { display: flatSet.length ? '' : 'none', clipPath: whole ? 'none' : `path('${flatSet.map((p) => pathOf(grow(p.poly, 0.6))).join(' ')}')` });
        // A large part is folded (a big piece cut out of the flat layer): the automatic checks can't measure properly, so text on the sheet is skipped meanwhile; a small folded corner is checked as usual
        const folded = whole ? 0 : 1 - flatSet.reduce((a, p) => a + area(p.poly), 0) / paperArea, skip = folded > 0.2 ? '1' : '';
        if (flat.dataset.lintSkip !== skip) flat.dataset.lintSkip = skip;
        const faces = [];
        for (const p of pan) {
          const W3 = SM.multiply(M[p.i]);
          faces.push({ pts: p.poly.map(([u, v]) => tp(W3, [u, v, 0])), sc: p.sc, ss: p.ss });
          set(p.el, { display: p.flat ? 'none' : '' });
          if (p.flat) continue;
          set(p.el, { transform: css3(M[p.i]) });
          if (!p.own) {
            const c = front.cloneNode(true);
            p.fc.replaceChildren(c);
            pending.push(...c.querySelectorAll('img'));
            const kids = [];
            if (o.showThrough) { const st = front.cloneNode(true); st.style.opacity = String(o.showThrough); st.style.filter = 'grayscale(1)'; kids.push(st); }
            if (back.childNodes.length) { const b = back.cloneNode(true); b.style.display = ''; kids.push(b); }
            p.bc.replaceChildren(...kids);
            for (const k of kids) pending.push(...k.querySelectorAll('img'));
          }
          const n = nrm(VM.multiply(W3));
          set(p.fs, shadeCss(O.shade(n) - 1 + p.rest));
          set(p.bs, shadeCss(O.shade(mul(n, -1)) - 1 - p.rest));
        }
        castShadows(sh, faces);
      });
      return S;
    }

    // Turn a full-screen layer into a sheet (for transitions like page turn, folding away, unfolding in): the layer sits as-is on the front of the sheet, same position and stacking
    function scene(layer, o = {}) {
      return sheet(layer.parentElement, { x: 0, y: 0, w: F.W, h: F.H, front: layer, zIndex: layer.style.zIndex, before: layer, rest: 0, creases: false, ...o });
    }

    // Page-turn transition: the layer turns over like a page from the edge (spine) side, revealing the next scene below (the next scene must already be in the layer under it)
    // o: { at, dur, edge: 'left' | 'right' | 'top' | 'bottom', curl (how much the paper curls, default 16), strips, sfx }
    function turn(layer, o) {
      const edge = o.edge ?? 'left', d = o.dur ?? 0.9;
      const pivot = { left: [0, F.H / 2], right: [F.W, F.H / 2], top: [F.W / 2, 0], bottom: [F.W / 2, F.H] }[edge];
      // A turning page is lifted by its edge: the free edge leads (valley), perspective pushed further back so the paper doesn't rush at the camera and cover the whole frame as it lifts
      const S = scene(layer, { fold: { type: 'strips', n: o.strips ?? 8, edge, fold: o.curl ?? 9, bend: 'valley' }, pivot, show: [-1, o.at + d], showThrough: o.showThrough ?? 0.07, perspective: o.perspective ?? 7000 });
      const to = { left: { ry: -180 }, right: { ry: 180 }, top: { rx: 180 }, bottom: { rx: -180 } }[edge];
      S.move(o.at, d, to, { ease: o.ease ?? E.cubicInOut, blur: true });
      S.drive('curl', (t) => Math.sin(Math.PI * clamp((t - o.at) / d)));
      if (o.sfx !== false) F.sfx(o.at, o.sfx ?? 'flip', o.gain ?? 0.9, { dur: d, dir: edge === 'left' || edge === 'top' ? -1 : 1, size: 0.8 });
      return S;
    }

    // Paper-card impact words: one card printed with a word per beat lands on the table on top of the previous one; it settles exactly on the beat
    // o: { at, every (default one beat), items: [{ text, sub }], until, x, y (centre), w, h, size, font, weight, color, subColor, subFont, subSize,
    //      papers: [colours…] (used in rotation), tilt (maximum random tilt), drop (drop duration), enter: 'drop' | 'unfold' (drops folded, opens before landing), seed }
    function cards(parent, o) {
      const every = o.every ?? F.B, items = o.items, n = items.length, R = EV.rng(o.seed ?? 'cards');
      const hasSub = items.some((i) => i.sub);
      const w = o.w ?? (F.portrait ? F.W * 0.84 : F.px(1150)), h = o.h ?? F.px(hasSub ? 520 : 400);
      const cx = o.x ?? F.W / 2, cy = o.y ?? F.H / 2, papers = o.papers ?? [O.paper];
      const font = o.font ?? F.theme.fonts.display, weight = o.weight ?? 700, size0 = F.px(o.size ?? 190);
      const meas = document.createElement('canvas').getContext('2d');
      return items.map((it, i) => {
        const d = Math.min(o.drop ?? 0.42, every * 0.85), rz = (R() - 0.5) * 2 * (o.tilt ?? 3.5);
        // As soon as the next card starts dropping it covers this one entirely (perspective enlargement): from then on this card's text is not visible
        const t0 = o.at + i * every, t1 = i < n - 1 ? o.at + (i + 1) * every - d : o.until ?? t0 + every;
        const dx = (R() - 0.5) * F.px(28), dy = (R() - 0.5) * F.px(18);
        const unf = o.enter === 'unfold';
        const S = sheet(parent, { x: cx - w / 2 + dx, y: cy - h / 2 + dy, w, h, z: F.px(o.height ?? (F.portrait ? 480 : 800)), rz: rz + (R() - 0.5) * 24, paper: papers[i % papers.length], show: [t0 - d, o.until ?? 1e9], fold: unf ? { type: 'half', axis: 'h' } : 'flat', folded: unf, zIndex: o.zIndex });
        S.move(t0 - d, d, { z: 0, rz }, { ease: E.quartOut, blur: true });
        if (unf) S.unfold(t0 - d * 0.55, d * 0.55, { sfx: false, ease: E.quartOut });
        // Font size: shrink if it doesn't fit
        meas.font = `${weight} ${size0}px ${font}`;
        const size = Math.min(size0, (w * 0.86) / Math.max(1, meas.measureText(it.text).width / size0));
        const col = el('div', `inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${f1(Math.max(F.px(28), size * 0.24))}px;padding:0 ${F.px(40)}px;text-align:center`, S.front);
        // Text colour: when not given, chosen automatically from the paper's lightness (light text on dark paper)
        const dark = lum(papers[i % papers.length]) < 0.45;
        const big = el('div', `position:relative;font:${weight} ${f1(size)}px/1 ${font};letter-spacing:${o.spacing ?? '-.02em'};color:${o.color ?? (dark ? '#FFFFFF' : O.ink ?? F.theme.ink)};white-space:nowrap`, col, it.text);
        const sub = it.sub ? el('div', `position:relative;font:${o.subStyle ?? 'italic'} ${F.px(o.subSize ?? 56)}px/1.1 ${o.subFont ?? F.theme.fonts.serif};color:${o.subColor ?? (dark ? 'rgba(255,255,255,.82)' : F.theme.accent)}`, col, it.sub) : null;
        F.text(big, 'slam', it.text, t0 - d, t1);
        if (sub) F.text(sub, 'slam-sub', it.sub, t0 - d, t1);
        F.sfx(t0, o.sfx ?? 'land', o.gain ?? 1, { size: 0.75 });
        // Once covered by the next card this card's text is not visible: hide it (so the checks no longer treat it as overlapping text)
        F.add((t) => set(S.front, { visibility: t >= t1 && i < n - 1 ? 'hidden' : 'visible' }));
        return { sheet: S, t0, t1, big, sub };
      });
    }

    // ---------- 3D origami models ----------
    // o: { def: 'crane' | 'plane' | 'boat' | a custom model, size (px per model unit), x, y, z, rx, ry, rz, paper, back, show: [a, b], form (0 = flat sheet, 1 = folded, default 1),
    //      flap: { amp (degrees), hz, from, to } (wing flapping), pose: (t) => ({ joint name: degrees }), zIndex }
    function model(parent, o) {
      const def = typeof o.def === 'string' ? MODELS[o.def] : o.def;
      if (!def) throw new Error(`没有这种折纸模型：${o.def}（有：${Object.keys(MODELS).join(' / ')}，或者自己写 { v, f }）`);
      // Back defaults to one shade darker than the front (not white): the model tumbles in the air, so it's recognisable from either side
      const size = F.px(o.size ?? 140), cf = hex(o.paper ?? O.paper), cb = o.back ? hex(o.back) : cf.map((x) => x * 0.8);
      const wrap = space(parent, o.zIndex, o.before), sh = shadowLayer(wrap);
      const tris = def.f.map((f, i) => ({ f, var: (EV.rng(i * 31 + 5)() - 0.5) * 0.05, el: el('div', `left:0;top:0;width:100px;height:100px;transform-origin:0 0;clip-path:polygon(-1.5px -1.5px,102px -1.5px,-1.5px 102px);background-image:url(${O.tex});background-size:256px 256px;background-blend-mode:overlay`, wrap), sc: sh.poly(sh.gc), ss: sh.poly(sh.gs) }));
      const st0 = { x: o.x ?? F.W / 2, y: o.y ?? F.H / 2, z: o.z ?? 0, q: Q.euler(o.rx, o.ry, o.rz), s: o.s ?? 1, form: o.form ?? 1 }, keys = [];
      let show = o.show ?? [-1, 1e9];
      const curve = (pts, u) => {
        const n = pts.length - 1, x = clamp(u) * n, i = Math.min(n - 1, Math.floor(x)), k = x - i;
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
        return [0, 1, 2].map((j) => { const a = p0[j] ?? 0, b = p1[j] ?? 0, c = p2[j] ?? 0, d = p3[j] ?? 0; return 0.5 * (2 * b + (-a + c) * k + (2 * a - 5 * b + 4 * c - d) * k * k + (-a + 3 * b - 3 * c + d) * k * k * k); });
      };
      const heading = (pts, u) => { const a = curve(pts, clamp(u - 0.01)), b = curve(pts, clamp(u + 0.01)); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
      const orient = (pts, u, bank) => {
        const a = curve(pts, clamp(u - 0.01)), b = curve(pts, clamp(u + 0.01)), f = unit(sub(b, a));
        const down = [0, 1, 0]; let d = sub(down, mul(f, dot(down, f))); d = Math.hypot(...d) < 1e-4 ? [0, 0, 1] : unit(d);
        let turn = heading(pts, u + 0.04) - heading(pts, u - 0.04); turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        const roll = (clamp(turn * bank, -1.1, 1.1));
        const z0 = cross(f, d), d2 = unit(add(mul(d, Math.cos(roll)), mul(z0, Math.sin(roll))));
        return Q.fromBasis(f, d2, cross(f, d2));
      };
      const state = (t) => {
        const s = { ...st0 };
        for (const k of keys) {
          if (t <= k.at) break;
          const u = seg(t, k.at, k.at + k.dur, k.ease);
          if (k.kind === 'move') { for (const p of ['x', 'y', 'z', 's']) if (k.to[p] !== undefined) s[p] = lerp(s[p], k.to[p], u); if (k.rot) s.q = Q.slerp(s.q, k.rot, u); if (k.lift) s.z += k.lift * Math.sin(Math.PI * u); }
          else if (k.kind === 'fly') { const p = curve(k.pts, u); s.x = p[0]; s.y = p[1]; s.z = p[2] ?? 0; s.q = Q.slerp(s.q, orient(k.pts, u, k.bank), clamp((t - k.at) / 0.25)); }
          else if (k.kind === 'form') s.form = lerp(s.form, k.to, u);
        }
        return s;
      };
      const m = {
        wrap,
        // Move / rotate / scale: to = { x, y, z, rx, ry, rz, s } (rotation turns to this orientation); o2: { ease, lift, sfx, land }
        move(at, dur, to, o2 = {}) {
          keys.push({ kind: 'move', at, dur, to, rot: to.rx !== undefined || to.ry !== undefined || to.rz !== undefined ? Q.euler(to.rx, to.ry, to.rz) : null, ease: o2.ease ?? E.cubicInOut, lift: o2.lift });
          keys.sort((a, b) => a.at - b.at);
          if (o2.sfx) F.sfx(at, o2.sfx, o2.gain ?? 0.7, { dur });
          if (o2.land) F.sfx(at + dur - 0.02, 'land', o2.gain ?? 0.8, { size: 0.4 });
          if (dur > 0.05) F.blur(at, at + dur, 12);
          return m;
        },
        // Fly along a curve (through each point [x, y, z] in pts; the first point is where it is now); nose / head faces the direction of travel, banking automatically on turns
        // o2: { ease, bank (amount of banking, default 0.6), sfx (default 'flutter'; false = none), gain }
        fly(at, dur, pts, o2 = {}) {
          keys.push({ kind: 'fly', at, dur, pts, ease: o2.ease ?? E.sine, bank: o2.bank ?? 0.6 });
          keys.sort((a, b) => a.at - b.at);
          if (o2.sfx !== false) F.sfx(at, o2.sfx ?? 'flutter', o2.gain ?? 0.6, { dur, size: 0.4 });
          F.blur(at, at + dur, 12);
          return m;
        },
        // Fold from a flat sheet into the model (to = 1) or lay it back flat (to = 0); the model needs flat
        form(at, dur, to = 1, o2 = {}) {
          if (!def.flat) throw new Error('这个模型没有 flat（展开图），不能 form');
          keys.push({ kind: 'form', at, dur, to, ease: o2.ease ?? E.cubicInOut });
          keys.sort((a, b) => a.at - b.at);
          if (o2.sfx !== false) F.sfx(at, o2.sfx ?? 'fold', o2.gain ?? 0.8, { dur, size: 0.5 });
          return m;
        },
        show(a, b = 1e9) { show = [a, b]; return m; },
        at: state,
      };
      // Joints: rotate some vertices about the axis through two vertices (Rodrigues' formula)
      const rotAbout = (p, a, k, th) => { const v = sub(p, a), c = Math.cos(th), s = Math.sin(th); return add(a, add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)))); };
      const cam = [F.W / 2, F.H / 2, O.persp];
      F.late((t) => {
        const on = t >= show[0] && t < show[1];
        set(wrap, { display: on ? '' : 'none' });
        if (!on) return;
        const s = state(t), R = Q.matrix(s.q), sc = size * s.s;
        let V = def.v.map((v, i) => (def.flat && s.form < 1 ? [lerp(def.flat[i][0], v[0], s.form), lerp(def.flat[i][1], v[1], s.form), v[2] * s.form] : v));
        const ang = {};
        if (o.flap && def.flap) { const fl = o.flap, on2 = t >= (fl.from ?? -1) && t < (fl.to ?? 1e9); if (on2) for (const j in def.flap) ang[j] = (fl.amp ?? 28) * def.flap[j] * Math.sin(2 * Math.PI * (fl.hz ?? 2) * t); }
        if (o.pose) Object.assign(ang, o.pose(t));
        for (const j in ang) { const J = def.joints && def.joints[j]; if (!J || !ang[j]) continue; const a = V[J.axis[0]], k = unit(sub(V[J.axis[1]], a)); V = V.map((p, i) => (J.verts.includes(i) ? rotAbout(p, a, k, (ang[j] * Math.PI) / 180) : p)); }
        const Wp = V.map((p) => add(tp(R, mul(p, sc)), [s.x, s.y, s.z]));
        const faces = [];
        for (const tr of tris) {
          const [a, b, c] = tr.f.map((i) => Wp[i]), e1 = sub(b, a), e2 = sub(c, a), n = unit(cross(e1, e2));
          set(tr.el, { transform: `matrix3d(${[e1[0] / 100, e1[1] / 100, e1[2] / 100, 0, e2[0] / 100, e2[1] / 100, e2[2] / 100, 0, n[0], n[1], n[2], 0, a[0], a[1], a[2], 1].map((x) => +x.toFixed(5)).join(',')})` });
          const mid = mul(add(add(a, b), c), 1 / 3), facing = dot(n, unit(sub(cam, mid))) >= 0;
          set(tr.el, { backgroundColor: rgb(tone(facing ? cf : cb, O.shade(facing ? n : mul(n, -1)) + tr.var)) });
          faces.push({ pts: [a, b, c], sc: tr.sc, ss: tr.ss });
        }
        castShadows(sh, faces);
      });
      return m;
    }

    // ---------- End card ----------
    // A sheet folded into a small square drops to the centre of the frame and unfolds (growing from the centre), printed with the logo, tagline, URL, call to action; the sonic logo plays when the unfold completes
    // o: { at (landing time, put on a beat), logo: { text, font, size, weight } | { src, h }, icon: { src, size, radius } (app icon above the logo, optional),
    //      tagline, url, cta, w, h, paper, color, muted (URL colour), unfold (unfold duration in s), cols, rows, push (size of the slow push-in after unfolding, default 0.035)}
    function endcard(parent, o) {
      const w = o.w ?? (F.portrait ? F.W * 0.86 : F.px(1240)), h = o.h ?? (F.portrait ? F.H * 0.56 : F.px(760));
      const x = (F.W - w) / 2, y = (F.H - h) / 2 - (F.portrait ? F.H * 0.05 : 0);
      const cols = o.cols ?? 2, rows = o.rows ?? 2, d = 0.5, ud = o.unfold ?? 1.2, color = o.color ?? O.ink ?? F.theme.ink;
      // Folded, it is the top-left cell: first land that cell in the centre of the frame, then shift back while unfolding, so it looks like it grows from the centre
      const S = sheet(parent, { x: x + (w - w / cols) / 2, y: y + (h - h / rows) / 2, w, h, z: F.px(900), rz: -14, fold: { type: 'grid', cols, rows }, folded: true, show: [o.at - d, 1e9], paper: o.paper, zIndex: o.zIndex });
      S.move(o.at - d, d, { z: 0, rz: -3 }, { ease: E.quartOut, land: true });
      S.unfold(o.at + 0.08, ud, { ease: E.cubicInOut });
      S.move(o.at + 0.08, ud, { x, y, rz: 0 }, { ease: E.cubicInOut, blur: false });
      const col = el('div', `inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${F.px(18)}px;text-align:center;color:${color}`, S.front);
      if (o.icon) { const ic = el('img', `position:relative;width:${F.px(o.icon.size ?? 200)}px;height:${F.px(o.icon.size ?? 200)}px;border-radius:${F.px(o.icon.radius ?? (o.icon.size ?? 200) * 0.22)}px;margin-bottom:${F.px(6)}px`, col); ic.src = o.icon.src; }
      let logo;
      if (o.logo.src) { logo = el('img', `position:relative;height:${F.px(o.logo.h ?? 180)}px`, col); logo.src = o.logo.src; }
      else logo = el('div', `position:relative;font:${o.logo.weight ?? 700} ${F.px(o.logo.size ?? 200)}px/1 ${o.logo.font ?? F.theme.fonts.script};color:${color}`, col, o.logo.text);
      const tag = o.tagline ? el('div', `position:relative;font:500 ${F.px(o.taglineSize ?? 44)}px/1.3 ${F.theme.fonts.sans};letter-spacing:.05em;text-transform:uppercase`, col, o.tagline) : null;   // 44: about 10px line height on a phone (only 6px at 26)
      const url = o.url ? el('div', `position:relative;margin-top:${F.px(10)}px;font:italic ${F.px(56)}px ${F.theme.fonts.serif};color:${o.muted ?? F.theme.muted}`, col, o.url) : null;
      const cta = o.cta ? el('div', `position:relative;margin-top:${F.px(6)}px;font:${F.px(44)}px/1.25 ${F.theme.fonts.serif}`, col, o.cta) : null;
      const t1 = o.at;
      if (o.logo.text) F.text(logo, 'logo', o.logo.text, t1 - d, 1e9);
      if (tag) F.text(tag, 'endcard', o.tagline, t1 - d, 1e9);
      if (url) F.text(url, 'endcard', o.url, t1 - d, 1e9);
      if (cta) F.text(cta, 'endcard', o.cta, t1 - d, 1e9);
      // When the logo is too wide or the column too tall (portrait, large logo size) shrink the logo automatically so it doesn't overlap the tagline and URL
      F.prep(() => {
        if (o.logo.text) { const cw = logo.scrollWidth, k = cw > w * 0.86 ? (w * 0.86) / cw : 1; if (k < 1) logo.style.fontSize = `${f1(F.px(o.logo.size ?? 200) * k)}px`; }
        const ch = col.scrollHeight, k2 = ch > h * 0.9 ? 1 - (ch - h * 0.9) / Math.max(1, logo.offsetHeight) : 1;
        if (k2 < 1 && o.logo.text) logo.style.fontSize = `${f1(parseFloat(logo.style.fontSize || F.px(o.logo.size ?? 200)) * Math.max(0.5, k2))}px`;
        else if (k2 < 1) logo.style.height = `${f1(logo.offsetHeight * Math.max(0.5, k2))}px`;
      });
      // After unfolding the camera pushes in very slowly (like someone leaning in to look), so the seconds held on the logo are never completely still
      const pushAt = o.at + 0.08 + ud;
      set(S.wrap, { transformOrigin: '50% 45%' });
      F.add((t) => set(S.wrap, { transform: t > pushAt ? `scale(${(1 + (o.push ?? 0.035) * seg(t, pushAt, pushAt + 5, E.sine)).toFixed(4)})` : 'none' }));
      F.sfx(o.at + 0.08 + ud, 'logo', o.gain ?? 1);
      return S;
    }

    // ---------- Table and printing ----------
    // Table: paper-coloured background + fibre texture + a patch of light drifting very slowly (the frame is never completely still). o: { color, glow, vignette }
    function desk(parent, o = {}) {
      const d = el('div', `inset:0;overflow:hidden;${surface(o.color ?? '#E7E1D6')}`, parent);
      const light = el('div', `left:-20%;top:-20%;width:140%;height:140%;background:radial-gradient(ellipse 60% 55% at 42% 36%, rgba(255,251,242,${o.glow ?? 0.42}), rgba(255,251,242,0) 70%), radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 52%, rgba(46,32,16,${o.vignette ?? 0.2}) 100%)`, d);
      F.add((t) => set(light, { transform: `translate(${f1(Math.sin(t / 6.5) * F.px(46))}px,${f1(Math.cos(t / 8.5) * F.px(28))}px)` }));
      return d;
    }
    // Images printed on paper (screenshots, photos): multiplied with the paper colour so they look printed. css overrides position and size
    function print(parent, src, css = '') {
      const im = el('img', `left:0;top:0;width:100%;height:100%;object-fit:cover;mix-blend-mode:multiply;filter:saturate(.94) contrast(.97);${css}`, parent);
      im.src = src;
      return im;
    }

    Object.assign(O, { space, sheet, scene, turn, cards, model, endcard, desk, print, surface });
    return P.infoKit ? P.infoKit(O, { model: 'illustration', sheet: 'panel' }) : O;   // information-density check: info-telling components register automatically when called (promo.js's infoKit)
  }

  P.origami = origami;
  P.origami.PLANS = PLANS;
  P.origami.MODELS = MODELS;
})();
