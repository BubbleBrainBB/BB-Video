// pencil.js: hand-drawn pencil-test animation (铅笔手绘动画), one of bb-video's visual styles (style notes in styles/pencil/STYLE.md). Load after promo.js.
// One frame: a sheet of warm off-white animation paper with tooth, a soft vignette, the peg holes and the drawing number of a pencil test; everything
// is drawn in graphite — light blue construction lines first (circles, ovals, the line of action), the darker clean-up line laid over them with
// pressure-driven weight and two offset passes per stroke, shading laid in as graphite smudge and hatching. The drawings are on twos (15 a second at 30 fps)
// and every line boils a little from drawing to drawing (seeded: the same frame always renders the same). Mostly monochrome; one warm accent wash
// may bloom at an emotional peak. Drawings turn into the next drawing (D.morph) instead of cutting; the camera follows the motion.
//
//   const D = PROMO.pencil(F, { palette: 'graphite' | 'cool' | 'sepia', accent, boil: 1, twos: true, sheet: true, light, seed, captions, chapters, maxText })
//   World units: 1 unit = 1 px of a 1080-high frame at zoom 1 (portrait: 1080 wide). y grows downward; a figure's ground line is its y.
//   TONES   'lead' clean graphite · 'soft' lighter graphite · 'blue' construction · 'accent' the one warm colour · 'paper' · 'shade' (or any css hex)
//   SHAPES  D.line / D.circle / D.ellipse / D.rect / D.poly / D.path (SVG d: M L H V C S Q T Z) / D.arc / D.group(o) → node with the same children
//           common options { x, y, rot, s, at, until, enter: 'draw' | 'fade' | 'none', exit: 'erase' | 'fade' | 'none', inDur, z, in: group,
//           lw, tone, construct (blue lines first; default true for 'draw'), shade (hatching 0–1), smudge (graphite tone 0–1), angle, closed }
//           node.to(at, { x, y, rot, s, alpha }, dur, ease)   group options: clean: t | false (rough until t / stays rough), ghostAt: t (turns to blue onion skin)
//   MORPH   D.morph(at, from, to, { dur })  one drawing redraws itself into the next (used instead of cuts; the pairing of lines is automatic)
//   FIGURE  const f = D.figure({ x, y, height, face: 'right' | 'left' | 'camera' | 'back', look: 'gesture' | 'silhouette' | 'rough' | 'line', wear: { top, bottom, number }, at, enter })
//           f.pose(at, name | fields, { dur }) · f.walk(at, toX, { speed, run }) · f.turn · f.jump(at, { x, base }) · f.sit · f.lie · f.fall · f.bow · f.cheer(at, until)
//           f.look(at, target | 'up' | 'down') · f.gesture(at, pose, { until }) · f.reach(at, point, { hand, until }) · f.keys(at, [{ t, …pose }])
//           f.bounce(at, until, ball, { hand, every }) · f.shoot(at, ball, target, { h }) · f.onion(a, b, { every, n }) · node.hold(f, a, b, { hand }) · node.arc(a, b, to, { h })
//   INFO    D.timing (a timing chart: steps / a timeline) · D.onion (a sequence of drawings, earlier ones turning to onion skin) · D.versus (rough vs clean-up)
//           D.tally (tally marks) · D.marks (growth marks on a post) · D.numeral (stroke-drawn numerals that redraw into the next value) · D.note · D.ring
//   MACHINES D.drive(keys) → fn(t) · D.wheel · D.crank · D.sprocket · D.chain · D.link2 · D.span · D.live({ draw: (t, pen) => … }) · node.onion(a, b)  (STYLE.md §11)
//   LIGHT   D.light({ at, until, on | x, y, r, dark }) a pool of light in a graphite haze · D.bloom(at, { on, until }) the warm accent wash
//   PROPS   D.prop('ball' | 'hoop' | 'court' | 'cup' | 'medal' | 'banner' | 'board' | 'door' | 'window' | 'chair' | 'table' | 'lamp' | 'tree' | 'house' | 'hills' | 'cloud' | 'globe' | 'crowd' | 'frame' | 'film', o)
//   TEXT    D.write(text, { x, y, size, at, until, align, wrap, screen, guide, tone, kind })  hand-lettered over ruled blue guidelines (DOM: the checks see it)
//   CAMERA  D.cam(t, view) · D.move(a, b, view, ease) · D.follow(a, b, target, { z, lag, lead, dx, dy })  view = { x, y, z } | { on: node | [nodes], pad, z }   D.L(landscape, portrait)
// Sounds the runtime emits (styles/pencil/sound.js): sketch (lines going down), scribble (shading), erase, flip (a morph: pages flipping), tap (a tick, a tally
//   mark), tick (a numeral changing), step, thud (a landing, a bounce), swish (a camera move, a throw), bloom (the accent wash), rim (a ball meeting a rim).
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('pencil.js 要在 promo.js 之后加载', 'pencil.js must load after promo.js'));
  const { E, set, el, frameT } = P;
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, q) => a + (b - a) * q;
  const f1 = (n) => Math.round(n * 10) / 10;
  const r2 = (n) => Math.round(n * 100) / 100;
  const DEG = Math.PI / 180, TAU = Math.PI * 2;
  const smooth = (q) => { q = cl(q); return q * q * (3 - 2 * q); };
  const inOut = (q) => E.cubicInOut(cl(q));
  const backInOut = (s) => (q) => { q = cl(q); const c = s * 1.525; return q < 0.5 ? (Math.pow(2 * q, 2) * ((c + 1) * 2 * q - c)) / 2 : (Math.pow(2 * q - 2, 2) * ((c + 1) * (q * 2 - 2) + c) + 2) / 2; };
  const hex = (h) => { const s = String(h).replace('#', ''); return s.length === 3 ? s.split('').map((c) => parseInt(c + c, 16)) : [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
  const toHex = (v) => '#' + v.map((x) => Math.round(cl(x, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mixHex = (a, b, q) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => lerp(v, y[i], q))); };
  const units = (t) => { t = String(t ?? ''); return (t.match(/[^\x00-\xff]/g) || []).length + t.replace(/[^\x00-\xff]/g, '').length * 0.55; };
  const hashS = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const mix32 = (x) => { x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b); return (x ^ (x >>> 16)) >>> 0; };
  const rnd = (seed, i) => mix32((seed ^ Math.imul(i | 0, 0x9e3779b1)) >>> 0) / 4294967296;
  const rngOf = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // smooth value noise in [-1, 1] along x (seeded)
  const noise1 = (seed, x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rnd(seed, i), rnd(seed, i + 1), u) * 2 - 1; };

  // ---------- palettes: the paper and the graphite are the style; the accent is the one warm colour that may bloom ----------
  const PALS = {
    graphite: { paper: '#eee8db', lead: '#2c2a27', soft: '#5d5952', blue: '#6f9cc6', shade: '#4a4741', haze: '#3f3a48', accent: '#d8902e' },
    cool: { paper: '#e9e8e3', lead: '#26272a', soft: '#585a5e', blue: '#6b98c8', shade: '#44464b', haze: '#36394a', accent: '#c85a3a' },
    sepia: { paper: '#ece0c8', lead: '#3a2e24', soft: '#6b5a4a', blue: '#7f9fb8', shade: '#55463a', haze: '#45372f', accent: '#c4632c' },
  };
  const FONTS = { hand: '"LXGW WenKai", "Noto Sans SC", "PingFang SC", serif', bold: '"LXGW WenKai", "Noto Sans SC", serif' };

  // ---------- textures ----------
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  // graphite pigment on paper tooth: mostly solid with small pale holes (the tooth the lead skipped)
  const grainTile = (color, seed) => {
    const N = 192, c = mk(N, N), x = c.getContext('2d'), im = x.createImageData(N, N), [r, g, b] = hex(color), R = rngOf(seed);
    const cell = 3, nc = N / cell, val = Array.from({ length: nc * nc }, () => R());
    const at = (i, j) => val[((j % nc + nc) % nc) * nc + ((i % nc + nc) % nc)];
    for (let y = 0; y < N; y++) for (let xx = 0; xx < N; xx++) {
      const fx = xx / cell, fy = y / cell, i = Math.floor(fx), j = Math.floor(fy), u = smooth(fx - i), v = smooth(fy - j);
      const n = lerp(lerp(at(i, j), at(i + 1, j), u), lerp(at(i, j + 1), at(i + 1, j + 1), u), v), w = R();
      const a = cl(0.28 + 0.85 * (n * 0.55 + w * 0.45) ** 0.8, 0, 1), k = (y * N + xx) * 4;
      im.data[k] = r; im.data[k + 1] = g; im.data[k + 2] = b; im.data[k + 3] = Math.round(a * 255);
    }
    x.putImageData(im, 0, 0); return c;
  };
  // hatching: short, slightly curved parallel strokes at one angle (wraps seamlessly)
  const hatchTile = (color, angle, dens, seed) => {
    const N = 160, c = mk(N, N), x = c.getContext('2d'), R = rngOf(seed), a = angle * DEG, n = Math.round(150 * dens);
    x.strokeStyle = color; x.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const px = R() * N, py = R() * N, len = 9 + R() * 20, dx = Math.cos(a) * len, dy = Math.sin(a) * len, bend = (R() - 0.5) * 2.4;
      x.globalAlpha = 0.25 + R() * 0.5; x.lineWidth = 0.7 + R() * 0.9;
      for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { x.beginPath(); x.moveTo(px + ox, py + oy); x.quadraticCurveTo(px + ox + dx / 2 - (dy * bend) / len, py + oy + dy / 2 + (dx * bend) / len, px + ox + dx, py + oy + dy); x.stroke(); }
    }
    return c;
  };
  // the sheet: warm off-white with tooth, faint mottling, fibres, an old smudge or two (screen-fixed, drawn once)
  const paperTile = (bg, lead, size, seed) => {
    const c = mk(size, size), x = c.getContext('2d'), R = rngOf(seed), k = size / 1024;
    x.fillStyle = bg; x.fillRect(0, 0, size, size);
    const im = x.getImageData(0, 0, size, size), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const v = (R() - 0.5) * 10 + (R() < 0.02 ? -12 : 0); d[i] += v; d[i + 1] += v; d[i + 2] += v * 0.9; }
    x.putImageData(im, 0, 0);
    for (let i = 0; i < 30; i++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 1), lt = R() < 0.5; g.addColorStop(0, lt ? 'rgba(255,255,255,0.035)' : 'rgba(110,95,80,0.02)'); g.addColorStop(1, 'rgba(0,0,0,0)'); const px = R() * size, py = R() * size, rr = (50 + R() * 140) * k, asp = 0.5 + R(); for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) { x.save(); x.translate(px + ox, py + oy); x.scale(rr, rr * asp); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, TAU); x.fill(); x.restore(); } }
    x.lineCap = 'round';
    for (let i = 0; i < 520; i++) { const px = R() * size, py = R() * size, a = R() * TAU, len = (4 + R() * 12) * k; x.strokeStyle = R() < 0.35 ? 'rgba(255,255,255,0.3)' : `rgba(110,96,80,${0.03 + R() * 0.07})`; x.lineWidth = (0.5 + R() * 0.6) * k; for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) { x.beginPath(); x.moveTo(px + ox, py + oy); x.quadraticCurveTo(px + ox + Math.cos(a + 0.5) * len * 0.6, py + oy + Math.sin(a + 0.5) * len * 0.6, px + ox + Math.cos(a) * len, py + oy + Math.sin(a) * len); x.stroke(); } }
    // ghosts of erased lines: a few faint graphite strokes rubbed half away
    const [lr, lg, lb] = hex(lead);
    for (let i = 0; i < 3; i++) { const px = size * (0.2 + R() * 0.6), py = size * (0.2 + R() * 0.6), a = R() * TAU, len = (60 + R() * 140) * k; x.strokeStyle = `rgba(${lr},${lg},${lb},${0.015 + R() * 0.02})`; x.lineWidth = (2 + R() * 3) * k; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 0.4) * len * 0.5, py + Math.sin(a + 0.4) * len * 0.5, px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke(); }
    return c;
  };

  // ---------- geometry ----------
  const catmull = (pts, closed, seg = 6) => {
    if (pts.length < 3) return pts.map((p) => [...p]);
    const out = [], n = pts.length, g = (i) => (closed ? pts[(i + n) % n] : pts[cl(i, 0, n - 1)]);
    const m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) { const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2); for (let s = 0; s < seg; s++) { const t = s / seg, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3))); } }
    out.push(closed ? [...pts[0]] : [...pts[n - 1]]);
    return out;
  };
  const ellPts = (cx, cy, rx, ry, rot = 0, a0 = -Math.PI / 2, n = 40, sweep = TAU) => { const c = Math.cos(rot), s = Math.sin(rot); return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (sweep * i) / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * c - y * s, cy + x * s + y * c]; }); };
  // SVG path → polylines (M L H V C S Q T Z, absolute and relative)
  const parsePath = (d) => {
    const toks = String(d).match(/[MLHVCSQTZmlhvcsqtz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [], out = [];
    let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cur = null, cmd = 'M', lc = null;
    const num = () => parseFloat(toks[i++]);
    const bez = (pts, n = 12) => { for (let s = 1; s <= n; s++) { const t = s / n, u = 1 - t; let x, y; if (pts.length === 3) { x = u * u * pts[0][0] + 2 * u * t * pts[1][0] + t * t * pts[2][0]; y = u * u * pts[0][1] + 2 * u * t * pts[1][1] + t * t * pts[2][1]; } else { x = u ** 3 * pts[0][0] + 3 * u * u * t * pts[1][0] + 3 * u * t * t * pts[2][0] + t ** 3 * pts[3][0]; y = u ** 3 * pts[0][1] + 3 * u * u * t * pts[1][1] + 3 * u * t * t * pts[2][1] + t ** 3 * pts[3][1]; } cur.push([x, y]); } };
    while (i < toks.length) {
      if (/[a-z]/i.test(toks[i])) cmd = toks[i++];
      const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? cx : 0, oy = rel ? cy : 0;
      if (C === 'Z') { if (cur) { cur.push([sx, sy]); cur.closed = true; } cx = sx; cy = sy; cur = null; continue; }
      if (C === 'M') { cx = ox + num(); cy = oy + num(); sx = cx; sy = cy; cur = [[cx, cy]]; out.push(cur); cmd = rel ? 'l' : 'L'; lc = null; continue; }
      if (!cur) { cur = [[cx, cy]]; out.push(cur); }
      if (C === 'L') { cx = ox + num(); cy = oy + num(); cur.push([cx, cy]); lc = null; }
      else if (C === 'H') { cx = ox + num(); cur.push([cx, cy]); lc = null; }
      else if (C === 'V') { cy = (rel ? cy : 0) + num(); cur.push([cx, cy]); lc = null; }
      else if (C === 'C') { const a = [ox + num(), oy + num()], b = [ox + num(), oy + num()], e = [ox + num(), oy + num()]; bez([[cx, cy], a, b, e]); lc = b; cx = e[0]; cy = e[1]; }
      else if (C === 'S') { const a = lc ? [2 * cx - lc[0], 2 * cy - lc[1]] : [cx, cy], b = [ox + num(), oy + num()], e = [ox + num(), oy + num()]; bez([[cx, cy], a, b, e]); lc = b; cx = e[0]; cy = e[1]; }
      else if (C === 'Q') { const a = [ox + num(), oy + num()], e = [ox + num(), oy + num()]; bez([[cx, cy], a, e]); lc = a; cx = e[0]; cy = e[1]; }
      else if (C === 'T') { const a = lc ? [2 * cx - lc[0], 2 * cy - lc[1]] : [cx, cy], e = [ox + num(), oy + num()]; bez([[cx, cy], a, e]); lc = a; cx = e[0]; cy = e[1]; }
      else i++;
    }
    return out.filter((p) => p.length > 1);
  };
  const plen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  // resample a polyline at an even spacing (n points, or every `step` units)
  const resample = (pts, step, n) => {
    const L = plen(pts); if (L < 1e-6) return { p: [pts[0], pts[0]], L: 0 };
    const N = n ?? Math.max(2, Math.ceil(L / step) + 1), out = [];
    let j = 1, acc = 0;
    for (let i = 0; i < N; i++) {
      const s = (L * i) / (N - 1);
      while (j < pts.length - 1 && acc + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]) < s) { acc += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]); j++; }
      const sl = Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]) || 1, q = cl((s - acc) / sl);
      out.push([lerp(pts[j - 1][0], pts[j][0], q), lerp(pts[j - 1][1], pts[j][1], q)]);
    }
    return { p: out, L };
  };
  const centroid = (pts) => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; };
  const bboxOf = (list) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const s of list) for (const p of s.pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } return x0 > x1 ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
  // 2D affine [a, b, c, d, e, f]
  const MI = [1, 0, 0, 1, 0, 0];
  const mmul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const mapp = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
  const mtrs = (x, y, rot, s, sx = 1, sy = 1) => { const c = Math.cos(rot) * s, n = Math.sin(rot) * s; return [c * sx, n * sx, -n * sy, c * sy, x, y]; };

  // ---------- stroke-drawn numerals: single-stroke glyphs in a 0..1 box (width ~0.62), smoothed through their control points ----------
  const GL = {
    0: [{ c: [[0.31, 0], [0.08, 0.17], [0.03, 0.5], [0.08, 0.84], [0.31, 1], [0.54, 0.84], [0.59, 0.5], [0.54, 0.16]], closed: true }],
    1: [{ l: [[0.12, 0.2], [0.34, 0], [0.34, 1]] }],
    2: [{ c: [[0.05, 0.24], [0.18, 0.04], [0.34, 0], [0.52, 0.1], [0.55, 0.3], [0.42, 0.52], [0.05, 1]] }, { l: [[0.05, 1], [0.6, 1]] }],
    3: [{ c: [[0.06, 0.12], [0.28, 0], [0.5, 0.08], [0.52, 0.28], [0.3, 0.46]] }, { c: [[0.3, 0.46], [0.56, 0.6], [0.56, 0.84], [0.32, 1], [0.04, 0.9]] }],
    4: [{ l: [[0.46, 1], [0.46, 0], [0.02, 0.68], [0.62, 0.68]] }],
    5: [{ l: [[0.55, 0], [0.12, 0], [0.07, 0.44]] }, { c: [[0.07, 0.44], [0.3, 0.37], [0.55, 0.5], [0.58, 0.74], [0.4, 0.97], [0.18, 0.98], [0.03, 0.87]] }],
    6: [{ c: [[0.52, 0.05], [0.33, 0], [0.12, 0.15], [0.04, 0.5], [0.08, 0.85], [0.3, 1], [0.52, 0.9], [0.57, 0.66], [0.42, 0.46], [0.2, 0.47], [0.06, 0.62]] }],
    7: [{ l: [[0.02, 0], [0.6, 0], [0.24, 1]] }],
    8: [{ c: [[0.31, 0.47], [0.1, 0.36], [0.08, 0.14], [0.31, 0], [0.54, 0.14], [0.52, 0.36], [0.31, 0.47], [0.06, 0.62], [0.06, 0.86], [0.31, 1], [0.56, 0.86], [0.56, 0.62], [0.31, 0.47]] }],
    9: [{ c: [[0.56, 0.36], [0.4, 0.52], [0.16, 0.5], [0.04, 0.3], [0.15, 0.05], [0.36, 0], [0.56, 0.15], [0.58, 0.45], [0.5, 0.78], [0.3, 1], [0.1, 0.95]] }],
    '.': [{ e: [0.1, 0.95, 0.035] }], ',': [{ l: [[0.12, 0.9], [0.06, 1.08]] }], ':': [{ e: [0.12, 0.35, 0.035] }, { e: [0.12, 0.9, 0.035] }],
    '%': [{ l: [[0.66, 0], [0.08, 1]] }, { e: [0.16, 0.17, 0.12] }, { e: [0.58, 0.83, 0.12] }], '+': [{ l: [[0.3, 0.25], [0.3, 0.8]] }, { l: [[0.03, 0.52], [0.57, 0.52]] }],
    '-': [{ l: [[0.06, 0.55], [0.42, 0.55]] }], '–': [{ l: [[0.04, 0.55], [0.56, 0.55]] }], '/': [{ l: [[0.42, 0], [0.04, 1]] }], '×': [{ l: [[0.08, 0.32], [0.5, 0.82]] }, { l: [[0.5, 0.32], [0.08, 0.82]] }],
  };
  const ADV = { '.': 0.24, ',': 0.24, ':': 0.26, '%': 0.78, '+': 0.62, '-': 0.5, '–': 0.62, '/': 0.48, '×': 0.6, ' ': 0.34 };
  const glyphStrokes = (str, size, align = 'center') => {
    const chars = [...String(str)], adv = chars.map((c) => ADV[c] ?? 0.68), W0 = adv.reduce((a, b) => a + b, 0) - 0.06, x0 = align === 'left' ? 0 : align === 'right' ? -W0 * size : (-W0 * size) / 2, out = [];
    let ox = x0;
    chars.forEach((c, ci) => {
      for (const g of GL[c] || []) {
        let pts;
        if (g.e) pts = ellPts(g.e[0], g.e[1], g.e[2], g.e[2], 0, -Math.PI / 2, 10);
        else if (g.c) pts = catmull(g.c, !!g.closed, 6);
        else pts = g.l.map((p) => [...p]);
        out.push({ pts: pts.map((p) => [ox + p[0] * size, (p[1] - 0.5) * size]), closed: !!g.closed || !!g.e, ci });
      }
      ox += adv[ci] * size;
    });
    return { list: out, w: W0 * size };
  };

  // ---------- pairing two drawings' lines for a morph: nearest centroid, similar length; leftovers grow from / shrink into their nearest partner ----------
  const MN = 22;
  const prepM = (s) => { const r = resample(s.pts, 0, MN); return { s, p: r.p, L: r.L, c: centroid(r.p) }; };
  const pairUp = (A, B) => {
    const a = A.map(prepM), b = B.map(prepM), pairs = [], cost = [];
    a.forEach((x, i) => b.forEach((y, j) => cost.push([Math.hypot(x.c[0] - y.c[0], x.c[1] - y.c[1]) + 0.4 * Math.abs(x.L - y.L), i, j])));
    cost.sort((p, q) => p[0] - q[0]);
    const ua = new Set(), ub = new Set();
    for (const [, i, j] of cost) { if (ua.has(i) || ub.has(j)) continue; ua.add(i); ub.add(j); pairs.push([a[i], b[j]]); }
    const near = (x, L) => L.reduce((best, y) => { const d = Math.hypot(x.c[0] - y.c[0], x.c[1] - y.c[1]); return !best || d < best.d ? { y, d } : best; }, null);
    a.forEach((x, i) => { if (!ua.has(i) && b.length) { const n = near(x, b).y; pairs.push([x, { ...n, p: n.p.map(() => [...n.c]), collapse: true }]); } else if (!ua.has(i)) pairs.push([x, { s: x.s, p: x.p.map(() => [...x.c]), collapse: true }]); });
    b.forEach((y, j) => { if (!ub.has(j) && a.length) { const n = near(y, a).y; pairs.push([{ ...n, p: n.p.map(() => [...n.c]), collapse: true }, y]); } else if (!ub.has(j)) pairs.push([{ s: y.s, p: y.p.map(() => [...y.c]), collapse: true }, y]); });
    // run each pair's points in the direction that travels least
    for (const pr of pairs) { const [x, y] = pr; let d0 = 0, d1 = 0; for (let k = 0; k < MN; k++) { d0 += Math.hypot(x.p[k][0] - y.p[k][0], x.p[k][1] - y.p[k][1]); d1 += Math.hypot(x.p[k][0] - y.p[MN - 1 - k][0], x.p[k][1] - y.p[MN - 1 - k][1]); } if (d1 < d0) pr[1] = { ...y, p: y.p.slice().reverse() }; }
    return pairs;
  };

  // ---------- figure rig (adapted from the parable style's stick-figure rig; here drawn as gesture strokes) ----------
  // proportions in metres: a real-proportioned person (head small, shoulders wide), height ~1.72 m
  const DIM = { hr: 0.105, neck: 0.075, th: 0.44, sh: 0.43, ua: 0.3, fa: 0.28, tl: 0.5, sw: 0.18, hw: 0.1, fr: 0.07 };
  const STAND_U = DIM.fr + (DIM.th + DIM.sh) * 0.985;
  const POSES = {
    stand: { hf: 0, hu: STAND_U, lean: 0.03, tilt: 0, twist: 0, nod: 0.04, hL: [0.02, 0.86, -0.24], hR: [0.04, 0.86, 0.24], fL: [0, DIM.fr, -0.1], fR: [0.04, DIM.fr, 0.1] },
    ready: { hf: -0.04, hu: STAND_U - 0.1, lean: 0.25, nod: 0.05, hL: [0.3, 0.95, -0.25], hR: [0.3, 0.95, 0.25], fL: [-0.08, DIM.fr, -0.17], fR: [0.12, DIM.fr, 0.17] },
    crouch: { hf: -0.1, hu: 0.55, lean: 0.55, nod: 0.2, hL: [0.38, 0.35, -0.2], hR: [0.4, 0.35, 0.2], fL: [0.1, DIM.fr, -0.14], fR: [0.14, DIM.fr, 0.14] },
    kneel: { hf: -0.04, hu: 0.56, lean: 0.15, nod: 0.15, hL: [0.12, 0.5, -0.2], hR: [0.3, 0.6, 0.16], fL: [-0.36, DIM.fr, -0.1], fR: [0.3, DIM.fr, 0.1] },
    sitFloor: { hf: 0, hu: 0.1, lean: -0.1, nod: 0.1, hL: [-0.22, 0.07, -0.26], hR: [-0.22, 0.07, 0.26], fL: [0.6, DIM.fr, -0.13], fR: [0.62, DIM.fr, 0.12] },
    sitEdge: { hf: 0, hu: 0.08, lean: -0.04, nod: 0.08, hL: [0.05, 0.08, -0.28], hR: [0.05, 0.08, 0.28], fL: [0.3, -0.42, -0.12], fR: [0.32, -0.44, 0.12] },
    lie: { hf: 0, hu: 0.1, lean: -1.5, nod: -0.25, hL: [-0.8, 0.3, -0.32], hR: [-0.8, 0.3, 0.32], fL: [0.8, DIM.fr, -0.1], fR: [0.42, DIM.fr, 0.12] },
    slump: { hf: 0, hu: STAND_U - 0.04, lean: 0.38, nod: 0.6, hL: [0.16, 0.66, -0.2], hR: [0.18, 0.66, 0.2], fL: [0, DIM.fr, -0.1], fR: [0.02, DIM.fr, 0.1] },
    cheer: { hf: 0, hu: STAND_U - 0.02, lean: -0.1, nod: -0.25, hL: [0.05, 2.05, -0.38], hR: [0.05, 2.05, 0.38], fL: [0, DIM.fr, -0.13], fR: [0.02, DIM.fr, 0.13] },
    fist: { hf: 0, hu: STAND_U - 0.03, lean: -0.05, nod: -0.15, hL: [0.05, 0.86, -0.24], hR: [0.08, 1.95, 0.3], fL: [0, DIM.fr, -0.12], fR: [0.04, DIM.fr, 0.12] },
    cross: { hf: 0, hu: STAND_U, lean: -0.02, nod: 0, hL: [0.22, 1.16, 0.08], hR: [0.22, 1.2, -0.08], fL: [0, DIM.fr, -0.11], fR: [0.02, DIM.fr, 0.11] },
    think: { hf: 0, hu: STAND_U, lean: 0.06, nod: 0.2, hL: [0.12, 1.08, 0.02], hR: [0.16, 1.5, 0.06], fL: [0, DIM.fr, -0.1], fR: [0.02, DIM.fr, 0.1] },
    point: { hf: 0, hu: STAND_U, lean: 0.02, nod: 0, hL: [0.02, 0.86, -0.24], hR: [0.62, 1.42, 0.2], fL: [0, DIM.fr, -0.1], fR: [0.06, DIM.fr, 0.12] },
    shrug: { hf: 0, hu: STAND_U, lean: -0.02, nod: -0.1, hL: [0.22, 1.16, -0.44], hR: [0.22, 1.16, 0.44], fL: [0, DIM.fr, -0.1], fR: [0.02, DIM.fr, 0.1] },
    hold: { hf: 0, hu: STAND_U, lean: 0.04, nod: 0.12, hL: [0.3, 1.1, -0.12], hR: [0.3, 1.1, 0.12], fL: [0, DIM.fr, -0.1], fR: [0.04, DIM.fr, 0.1] },
    bowHead: { hf: 0, hu: STAND_U - 0.02, lean: 0.12, nod: 0.75, hL: [0.1, 0.84, -0.18], hR: [0.12, 0.84, 0.18], fL: [0, DIM.fr, -0.09], fR: [0.03, DIM.fr, 0.09] },
  };
  const FACES = { right: 0, camera: Math.PI / 2, left: Math.PI, back: -Math.PI / 2 };
  const faceOf = (f, cur = 0) => (typeof f === 'number' ? f : f in FACES ? FACES[f] : cur);
  const angLerp = (a, b, q) => { let d = (b - a + Math.PI) % TAU; if (d < 0) d += TAU; return a + (d - Math.PI) * q; };
  const fill = (o) => ({ x: 0, z: 0, yaw: 0, base: 0, hf: 0, hu: STAND_U, lean: 0, tilt: 0, twist: 0, nod: 0, lookW: 0, look: null, ...o, hL: [...(o.hL || POSES.stand.hL)], hR: [...(o.hR || POSES.stand.hR)], fL: [...(o.fL || POSES.stand.fL)], fR: [...(o.fR || POSES.stand.fR)] });
  const v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], sc: (a, s) => [a[0] * s, a[1] * s, a[2] * s], adds: (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len: (a) => Math.hypot(a[0], a[1], a[2]), lerp: (a, b, q) => [lerp(a[0], b[0], q), lerp(a[1], b[1], q), lerp(a[2], b[2], q)] };
  v3.norm = (a) => { const l = v3.len(a) || 1; return v3.sc(a, 1 / l); };
  // two-bone IK with a soft reach and a second pole blended in as the reach lines up with the first (the middle joint never flips)
  const ik = (A, T, a, b, pole, pole2) => {
    const d = v3.sub(T, A); let L = v3.len(d); const dir = v3.sc(d, 1 / Math.max(L, 1e-6));
    const Lm = a + b, sk = 0.05 * Lm; if (L > Lm - sk) L = Lm - sk * Math.exp(-(L - (Lm - sk)) / sk);
    L = cl(L, Math.abs(a - b) + 1e-3, Lm - 1e-4);
    const x = (a * a - b * b + L * L) / (2 * L), h = Math.sqrt(Math.max(0, a * a - x * x));
    let p = v3.norm(pole); p = v3.adds(p, dir, -v3.dot(p, dir));
    if (pole2) { let p2 = v3.norm(pole2); p2 = v3.adds(p2, dir, -v3.dot(p2, dir)); p = v3.adds(p, p2, 1 - smooth((v3.len(p) - 0.15) / 0.5)); }
    if (v3.len(p) < 1e-4) p = v3.adds([0, 1, 0], dir, -dir[1]);
    p = v3.norm(p);
    return [v3.adds(v3.adds(A, dir, x), p, h), v3.adds(A, dir, L)];
  };

  P.pencil = function (F, opt = {}) {
    const W = F.W, H = F.H, PT = F.portrait, U = F.px(1), FLAT = !!opt.flat;
    const C0 = { ...(PALS[opt.palette] || PALS.graphite), ...(opt.colors || {}) };
    if (opt.accent) C0.accent = opt.accent;
    const FONT = { ...FONTS, ...(opt.fonts || {}) };
    const SEED = hashS(opt.seed ?? 'pencil');
    const D = { F, colors: C0, fonts: FONT, portrait: PT, L: (land, port) => (PT && port !== undefined ? port : land) };
    // on twos: at 30 fps that is 15 drawings a second, each held exactly two frames (12 a second would alternate two and three frames, an uneven step). The boil keeps its own, slower rate
    const BOIL = opt.boil ?? 1, TWOS = opt.twos !== false, FPSD = opt.drawings ?? 15;
    const Q = (t) => (TWOS ? Math.floor(t * FPSD + 1e-6) / FPSD : t);
    const bkOf = (tq) => (BOIL ? Math.floor(tq * 12 + 1e-6) % 3 : 0);
    const raw = new Set();
    const col = (c, d) => { if (c == null || c === false) return d == null ? null : col(d); if (C0[c]) return C0[c]; if (/^#/.test(c)) { if (!Object.values(C0).includes(c.toLowerCase())) raw.add(c.toLowerCase()); return c; } return c; };
    D.col = col;
    // drawings on twos with no motion blur (a pencil test has none); the picture is never still (the line boils), so the frame check's freeze limit is fine
    if (!FLAT) F.blurBase(1);

    // ---------- layers: paper (CSS, screen-fixed), the drawing canvas, the light (multiply), world text (DOM, follows the camera), the sheet HUD ----------
    const ptile = paperTile(C0.paper, C0.lead, Math.round(1024 * Math.max(1, U)), SEED);
    let purl = null;
    D.paperCss = () => `${C0.paper} url(${(purl ??= ptile.toDataURL('image/png'))}) 0 0 / ${f1(1024 * Math.max(1, U))}px`;
    let main = null, mx = null, lightC = null, lx = null, wl = null, hud = null, hx = null;
    const grainUrl = (() => { const c = grainTile('#000000', SEED ^ 77); return c.toDataURL('image/png'); })();
    if (!FLAT) {
      F.stage.style.background = C0.paper;
      const pl = el('div', `inset:0;z-index:1;pointer-events:none;background:${D.paperCss()}`, F.stage); pl.dataset.motion = 'skip';
      main = el('canvas', `left:0;top:0;width:${W}px;height:${H}px;z-index:5`, F.stage); main.width = W; main.height = H; mx = main.getContext('2d'); main.dataset.motion = 'skip';
      lightC = el('canvas', `left:0;top:0;width:${W}px;height:${H}px;z-index:7;mix-blend-mode:multiply;pointer-events:none`, F.stage); lightC.width = W; lightC.height = H; lx = lightC.getContext('2d'); lightC.dataset.motion = 'skip';
      const vg = el('div', `inset:0;z-index:8;pointer-events:none;mix-blend-mode:multiply;background:radial-gradient(ellipse 75% 70% at 50% 46%, rgba(0,0,0,0) 55%, ${mixHex(C0.paper, C0.shade, 0.22)} 100%)`, F.stage); vg.dataset.motion = 'skip';
      wl = el('div', 'left:0;top:0;width:0;height:0;z-index:10;transform-origin:0 0;pointer-events:none', F.stage); wl.dataset.motion = 'texture';
      hud = el('div', 'inset:0;z-index:30;pointer-events:none', F.stage);
      const hc = el('canvas', `left:0;top:0;width:${W}px;height:${H}px;z-index:2;pointer-events:none`, F.stage); hc.width = W; hc.height = H; hx = hc.getContext('2d'); hc.dataset.motion = 'skip';
    }
    // a soft, rough edge on lettering: a little displacement (like graphite on tooth)
    if (!document.getElementById('pencil-rough')) {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.style.position = 'absolute';
      s.innerHTML = '<filter id="pencil-rough" x="-5%" y="-10%" width="110%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter>';
      document.body.appendChild(s);
    }
    // canvas text has no DOM: its characters go into a hidden probe so the page's font loader fetches their glyphs
    const probe = el('div', `left:0;top:0;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;font-family:${FONT.hand}`, F.stage); probe.dataset.motion = 'skip';

    // ---------- patterns (screen-anchored: the grain stays with the paper while the camera moves) ----------
    const pats = new Map(), live = new Set();
    let patM = new DOMMatrix();
    const patOf = (ctx, key, make) => { let p = pats.get(key); if (!p) { p = { pat: ctx.createPattern(make(), 'repeat') }; pats.set(key, p); } return p.pat; };
    const grainPat = (ctx, color) => { const p = patOf(ctx, 'g' + color, () => grainTile(color, SEED ^ hashS(color))); p.setTransform(patM); return p; };
    const hatchPat = (ctx, color, angle, dens, bk) => { const p = patOf(ctx, `h${color}|${angle}|${dens}`, () => hatchTile(color, angle, dens, SEED ^ hashS(color + angle))); p.setTransform(patM.translate(bk * 37, bk * 23)); return p; };

    // ---------- stroke rendering: a ribbon per pass, its width from pressure, wobbling along its length; the wobble boils from drawing to drawing ----------
    let sid = 0;
    const pressure = (u, sd, s) => { const a = smooth(u / 0.1), b = smooth((1 - u) / 0.14); return (0.5 + 0.5 * Math.min(a, b)) * (0.85 + 0.25 * noise1(sd + 5, s / 70)); };
    const ribbon = (st, pass, bk, prog) => {
      const R = st._r ??= resample(st.closed ? [...st.pts, st.pts[0]] : st.pts, 4.5), L = R.L, pp = R.p, n = pp.length;
      const cons = st.kind === 'construct', sd = (st.seed + pass * 1013) >>> 0, bs = (sd ^ Math.imul(bk + 1, 7919)) >>> 0;
      const amp = st.wob ?? (cons ? 2.2 : 1.5), bAmp = BOIL * (cons ? 1.5 : 0.85), w = st.w;
      const e0 = st.noOver ? 0 : (rnd(sd, 1) - 0.3) * (cons ? 16 : 5) * Math.min(1, L / 60), e1 = st.noOver ? 0 : (rnd(sd, 2) - 0.3) * (cons ? 16 : 6) * Math.min(1, L / 60) + (st.closed ? (cons ? 14 : 6) : 0);
      const shift = pass ? (rnd(sd, 3) - 0.5) * Math.max(1.2, w * 0.45) : 0;
      const Lp = prog * L, s1 = Lp + (prog >= 1 ? e1 : 0), s0 = -e0;
      if (s1 - s0 < 0.5) return null;
      const at = (s) => { // point and tangent at arc length s (extrapolated past the ends)
        const sc2 = cl(s, 0, L), f = L ? (sc2 / L) * (n - 1) : 0, i = Math.min(n - 2, Math.floor(f)), q = f - i;
        const a = pp[i], b = pp[i + 1], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
        let x = lerp(a[0], b[0], q), y = lerp(a[1], b[1], q);
        if (s < 0 || s > L) { x += (tx / tl) * (s < 0 ? s : s - L); y += (ty / tl) * (s < 0 ? s : s - L); }
        return [x, y, tx / tl, ty / tl];
      };
      const step = 4.5, N = Math.max(2, Math.ceil((s1 - s0) / step) + 1), lt = [], rt = [];
      for (let i = 0; i < N; i++) {
        const s = lerp(s0, s1, i / (N - 1)), [x, y, tx, ty] = at(s), u = (s - s0) / Math.max(1e-6, (L + e1 + e0));
        const off = noise1(sd, s / 46) * amp + noise1(bs, s / 28) * bAmp + shift;
        const hw = w * 0.5 * (st.taper === false ? 1 : pressure(u, sd, s)) * (pass ? 0.55 : 1);
        lt.push([x - ty * (off + hw), y + tx * (off + hw)]); rt.push([x - ty * (off - hw), y + tx * (off - hw)]);
      }
      const p2 = new Path2D(); p2.moveTo(lt[0][0], lt[0][1]); for (let i = 1; i < N; i++) p2.lineTo(lt[i][0], lt[i][1]); for (let i = N - 1; i >= 0; i--) p2.lineTo(rt[i][0], rt[i][1]); p2.closePath();
      return p2;
    };
    const areaPath = (st, bk) => {
      const sd = st.seed >>> 0, R = st._r ??= resample(st.closed ? [...st.pts, st.pts[0]] : st.pts, 4.5);
      const p2 = new Path2D(), n = R.p.length;
      R.p.forEach((p, i) => { const a = (i / n) * 40, o = noise1(sd + bk * 17, a) * 1.6; i ? p2.lineTo(p[0] + o, p[1] - o) : p2.moveTo(p[0] + o, p[1] - o); });
      p2.closePath(); return p2;
    };
    const cache = (st, key, mk2) => { if (!st.static) return mk2(); const c = (st._c ??= new Map()); if (!c.has(key)) c.set(key, mk2()); return c.get(key); };
    // draw one stroke: kinds line / construct (ribbons), tone (graphite smudge), hatch, wash (the accent, coloured-pencil)
    const drawStroke = (ctx, st, bk, prog = 1, alpha = 1) => {
      if (prog <= 0 || alpha <= 0.002) return;
      const a = (st.alpha ?? 1) * alpha;
      if (a <= 0.002) return;
      if (st.kind === 'line' || st.kind === 'construct') {
        const passes = st.passes ?? (st.kind === 'construct' ? 1 : 2), colr = st.color;
        for (let pass = 0; pass < passes; pass++) {
          const p2 = prog >= 1 ? cache(st, pass + '|' + bk, () => ribbon(st, pass, bk, 1)) : ribbon(st, pass, bk, prog);
          if (!p2) continue;
          ctx.globalAlpha = a * (pass ? 0.45 : st.kind === 'construct' ? 0.8 : 0.92); ctx.fillStyle = grainPat(ctx, colr); ctx.fill(p2);
        }
        return;
      }
      const p2 = cache(st, 'a|' + bk, () => areaPath(st, bk)), q = cl(prog);
      if (st.kind === 'tone') { ctx.globalAlpha = a * q; ctx.fillStyle = grainPat(ctx, st.color); ctx.fill(p2); }
      else if (st.kind === 'hatch') { ctx.globalAlpha = a * q; ctx.fillStyle = hatchPat(ctx, st.color, st.angle ?? 58, st.dens ?? 1, bk); ctx.fill(p2); }
      else if (st.kind === 'wash') { ctx.save(); if (st.clip) { const c = st.clip; const cp = new Path2D(); cp.ellipse(c.x, c.y, Math.max(0.1, c.r), Math.max(0.1, c.r), 0, 0, TAU); ctx.clip(cp); } ctx.globalAlpha = a * q * 0.55; ctx.fillStyle = grainPat(ctx, st.color); ctx.fill(p2); ctx.globalAlpha = a * q; ctx.fillStyle = hatchPat(ctx, st.color, 38, 1.4, bk); ctx.fill(p2); ctx.restore(); }
    };
    D.drawStroke = drawStroke;
    const mkStroke = (pts, o) => ({ pts, closed: !!o.closed, kind: o.kind ?? 'line', w: o.w ?? 3.4, color: o.color, alpha: o.alpha, passes: o.passes, wob: o.wob, angle: o.angle, dens: o.dens, seed: o.seed ?? (SEED ^ mix32(++sid * 2654435761)), static: o.static !== false, noOver: o.noOver, taper: o.taper, noWash: o.noWash });

    // ---------- nodes ----------
    const roots = [], all = [];
    let seq = 0, curLayer = null;
    D.into = (layer, fn) => { const prev = curLayer; curLayer = layer; if (layer && D.layerCanvas) D.layerCanvas(layer); try { return fn(); } finally { curLayer = prev; } };
    const IN = { draw: 1.0, fade: 0.5, none: 0 }, OUT = { erase: 0.5, fade: 0.45, none: 0 };
    const node = (kind, o = {}) => {
      const n = { id: ++seq, kind, o, kids: [], keys: {}, tracks: [], parent: o.in || null, z: o.z ?? 0, layer: o.layer || (o.in ? null : curLayer), seed: SEED ^ mix32(seq * 40503 + 17), geo: [], blooms: [] };
      n.at = o.at ?? (n.parent ? -1 : 0); n.until = o.until ?? 1e9;
      n.enter = o.enter ?? (n.parent || n.at <= 0 ? 'none' : 'draw');
      n.inDur = o.inDur ?? IN[n.enter] ?? 0.8;
      const ex = o.exit ? (typeof o.exit === 'string' ? { to: o.exit } : o.exit) : null;
      n.exit = ex ? ex.to ?? 'erase' : 'erase'; if (ex && ex.at !== undefined) n.until = ex.at;
      n.outDur = (ex && ex.dur) ?? OUT[n.exit] ?? 0.45;
      if (n.parent) { n.parent.kids.push(n); n.layer ??= n.parent.layer; } else roots.push(n);
      all.push(n);
      for (const k of ['line', 'circle', 'ellipse', 'rect', 'poly', 'path', 'arc', 'group']) n[k] = (o2 = {}) => D[k]({ ...o2, in: n });
      n.to = (at, props, dur = 0.6, ease = inOut) => { for (const [k, v] of Object.entries(props)) (n.keys[k] ??= []).push({ at, v, dur, ease }); for (const k of Object.keys(props)) n.keys[k].sort((p, q) => p.at - q.at); (n.changes ??= []).push(at, at + dur); return n; };
      n.hold = (fg, a, b, o2 = {}) => { n.tracks.push({ a, b, fn: (t) => fg.handAt(t, o2.hand ?? 'R', o2.off) }); n.tracks.sort((p, q) => p.a - q.a); return n; };
      n.arc = (a, b, to, o2 = {}) => { const from = o2.from; n.tracks.push({ a, b, arc: true, fn: (t) => { const s0 = from ? (typeof from === 'function' ? from(a) : from) : posAt(n, a - 1e-3), s1 = typeof to === 'function' ? to(b) : to.kind ? centerOf(to, b) : to, q = cl((t - a) / (b - a)), h = o2.h ?? 200; return [lerp(s0[0], s1[0], q), lerp(s0[1], s1[1], q) - 4 * h * q * (1 - q)]; } }); n.tracks.sort((p, q) => p.a - q.a); (n.changes ??= []).push(a, b); if (o2.sfx !== false) F.sfx(a, 'swish', 0.3, { dur: b - a }); return n; };
      n.onion = (a, b, o2 = {}) => { (n.onions ??= []).push({ a, b, every: o2.every ?? 0.25, n: o2.n ?? 3, alpha: o2.alpha ?? 0.7 }); return n; };
      n.track = (a, b, fn) => { n.tracks.push({ a, b, fn }); n.tracks.sort((p, q) => p.a - q.a); return n; };
      return n;
    };
    const pv = (n, k, t, d) => { let v = n.o[k] ?? d; if (typeof v === 'function') v = v(t); const ks = n.keys[k]; if (ks) for (const kk of ks) { if (t < kk.at) break; const q = kk.dur ? kk.ease(cl((t - kk.at) / kk.dur)) : 1; v = typeof v === 'number' ? lerp(v, kk.v, q) : q >= 1 ? kk.v : v; } return v; };
    const trackAt = (n, t) => { let tr = null; for (const x of n.tracks) if (t >= x.a && t <= x.b) tr = x; if (!tr) { const done = n.tracks.filter((x) => x.b < t && x.stay !== false); tr = done.length ? { fn: () => done[done.length - 1].fn(done[done.length - 1].b) } : null; } return tr; };
    const localM = (n, t) => { const tr = trackAt(n, t); let x = pv(n, 'x', t, 0), y = pv(n, 'y', t, 0); if (tr) { const p = tr.fn(t); x = p[0]; y = p[1]; } return mtrs(x, y, pv(n, 'rot', t, 0) * DEG, pv(n, 's', t, 1), pv(n, 'sx', t, 1), pv(n, 'sy', t, 1)); };
    const worldM = (n, t) => (n.parent ? mmul(worldM(n.parent, t), localM(n, t)) : localM(n, t));
    const posAt = (n, t) => { const m = worldM(n, t); return [m[4], m[5]]; };
    D.pos = posAt;
    D.toWorld = (n, t, p) => mapp(worldM(n, Q(t)), p);
    const visible = (n, t) => t >= n.at && t < n.until;
    const effAt = (n) => (n.at >= 0 ? n.at : n.parent ? effAt(n.parent) : 0);
    // the node's own strokes in world space at t (shapes: geometry × transform, cached while the transform holds)
    const ownStrokes = (n, t) => {
      if (n.gen) return n.gen(t);
      if (!n.geo.length) return [];
      const m = worldM(n, t), key = m.map((v) => v.toFixed(2)).join(',');
      if (n._wk === key) return n._ws;
      n._wk = key; n._ws = n.geo.map((g) => ({ ...g, pts: g.pts.map((p) => mapp(m, p)), _r: undefined, _c: g._cc ??= new Map(), static: g.static !== false && !n.keys.x && !n.tracks.length, src: g }));
      // keep the ribbon cache per transform: a moved drawing gets fresh ribbons; a held one keeps them
      for (const s of n._ws) { s._c = new Map(); }
      return n._ws;
    };
    // a node and its inheriting children as one drawing (children with their own at are their own drawings)
    const collect = (n, t, out, own) => {
      if (!own && (t < effAt(n) || t >= n.until)) return out;
      const a0 = pv(n, 'alpha', t, 1);
      for (const s of ownStrokes(n, t)) out.push({ s, n, a: a0 });
      for (const k of n.kids.slice().sort((p, q) => p.z - q.z)) if (k.at < 0) collect(k, t, out, false);
      return out;
    };
    const ancestors = (n) => { const L = []; for (let p = n; p; p = p.parent) L.push(p); return L; };
    // the drawing order of an entrance: construction lines, then the clean-up line over them, then the shading (by stroke length)
    const phaseOf = (k) => (k === 'construct' ? [0, 0.5] : k === 'line' ? [0.3, 0.92] : [0.74, 1]);
    const allot = (items) => {
      const by = {}; for (const it of items) { const ph = it.s.kind === 'construct' ? 'c' : it.s.kind === 'line' ? 'l' : 'f'; (by[ph] ??= []).push(it); }
      for (const L of Object.values(by)) { const lens = L.map((it) => (it.s.kind === 'line' || it.s.kind === 'construct' ? plen(it.s.pts) + 25 : 40)), tot = lens.reduce((a, b) => a + b, 0) || 1; let acc = 0; L.forEach((it, i) => { it.r0 = acc / tot; acc += lens[i]; it.r1 = acc / tot; }); }
    };
    const progOf = (it, q) => { const [a, b] = phaseOf(it.s.kind), qq = cl((q - a) / (b - a)); return cl((qq - it.r0) / Math.max(1e-4, it.r1 - it.r0)); };

    // ---------- shapes ----------
    const sty = (o) => ({ w: o.lw ?? o.w2 ?? 3.4, color: col(o.tone ?? 'lead'), alpha: o.alpha2 });
    // a shape's geometry: its clean line, the construction under it (blue, looser, overshooting), and its shading
    const shapeGeo = (n, polys, o) => {
      let own = n; while (own.parent && own.at < 0) own = own.parent;
      const cons = o.construct ?? (own === n ? o.enter ?? n.enter : own.enter) === 'draw', base = sty(o);
      for (const p0 of polys) for (const p of splitCorners(p0)) {
        if (cons && o.lineOnly !== true) n.geo.push(mkStroke(o.consPts ? o.consPts(p) : p, { kind: 'construct', w: Math.max(2, base.w * 0.6), color: col(o.consTone ?? 'blue'), closed: !!p.closed, wob: (o.wob ?? 1) * 2.4, noOver: o.noOver }));
      }
      for (const p0 of polys) for (const p of splitCorners(p0)) if (o.line !== false) n.geo.push(mkStroke(p, { kind: 'line', w: base.w, color: base.color, closed: !!p.closed, passes: o.passes, wob: o.wob, alpha: o.lineAlpha }));
      for (const p of polys) {
        if (!p.closed && !o.area) continue;
        n.geo.push({ ...mkStroke(p, { kind: 'tone', alpha: 0, closed: true }), area: true });
        if (o.smudge) n.geo.push(mkStroke(p, { kind: 'tone', color: col(o.smudgeTone ?? 'shade'), alpha: o.smudge * 0.42, closed: true }));
        if (o.shade) n.geo.push(mkStroke(p, { kind: 'hatch', color: col(o.shadeTone ?? 'lead'), alpha: o.shade * 0.7, angle: o.angle ?? 58, dens: o.dens ?? 1, closed: true }));
        if (o.wash) n.geo.push(mkStroke(p, { kind: 'wash', color: col('accent'), alpha: o.wash, closed: true }));
      }
      return n;
    };
    const closedP = (pts) => { pts.closed = true; return pts; };
    const splitCorners = (p) => {
      if (p.length > 14 || p.smooth) return [p];
      const pts = p.closed ? [...p, p[0]] : p, cut = [0];
      for (let i = 1; i < pts.length - 1; i++) { const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), b = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]); let d = Math.abs(b - a); if (d > Math.PI) d = TAU - d; if (d > 0.6) cut.push(i); }
      cut.push(pts.length - 1);
      if (cut.length <= 2 && !p.closed) return [p];
      const out = []; for (let i = 0; i < cut.length - 1; i++) out.push(pts.slice(cut[i], cut[i + 1] + 1));
      return out;
    };
    D.line = (o = {}) => { const n = node('shape', o); const pts = o.smooth ? catmull(o.pts, false, 6) : o.pts.map((p) => [...p]); if (o.smooth) pts.smooth = true; return shapeGeo(n, [pts], o); };
    D.poly = (o = {}) => { const n = node('shape', o); const pts = (o.smooth ? catmull(o.pts, o.closed !== false, 6) : o.pts.map((p) => [...p])); if (o.smooth) pts.smooth = true; if (o.closed !== false) closedP(pts); return shapeGeo(n, [pts], o); };
    D.circle = (o = {}) => D.ellipse({ ...o, rx: o.r ?? 40, ry: o.r ?? 40 });
    D.ellipse = (o = {}) => { const n = node('shape', o); const p = closedP(ellPts(o.cx ?? 0, o.cy ?? 0, o.rx ?? 40, o.ry ?? 30, (o.tilt ?? 0) * DEG, o.a0 ?? -Math.PI / 2 - 0.3, Math.max(16, Math.round((o.rx ?? 40) / 4)))); p.pop(); return shapeGeo(n, [p], o); };
    D.arc = (o = {}) => { const n = node('shape', o); const r = o.r ?? 60, a0 = (o.from ?? 0) * DEG, a1 = (o.to ?? 180) * DEG; return shapeGeo(n, [ellPts(o.cx ?? 0, o.cy ?? 0, o.rx ?? r, o.ry ?? r, 0, a0, Math.max(8, Math.round((Math.abs(a1 - a0) * r) / 8)), a1 - a0)], o); };
    D.rect = (o = {}) => { const n = node('shape', o); const x = o.rx0 ?? -(o.w ?? 100) / 2, y = o.ry0 ?? -(o.h ?? 80), w = o.w ?? 100, h = o.h ?? 80; const p = closedP([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); return shapeGeo(n, [p], o); };
    D.path = (o = {}) => { const n = node('shape', o); const polys = parsePath(o.d).map((p) => { const q = p.map((v) => [v[0] * (o.scale ?? 1), v[1] * (o.scale ?? 1)]); if (p.closed) closedP(q); return q; }); return shapeGeo(n, polys, o); };
    D.group = (o = {}) => node('group', o);
    D.geo = (n) => n.geo;

    // ---------- the accent wash: blooms out from a point over a drawing's closed areas (and its figure's body) ----------
    const blooms = [];
    D.bloom = (at, o = {}) => {
      const tgt = o.on, dur = o.dur ?? 1.1, b = { at, until: o.until ?? 1e9, dur, tgt, amount: o.amount ?? 0.8, from: o.from, lines: o.lines };
      if (tgt) tgt.blooms.push(b);
      blooms.push(b);
      F.sfx(at, 'bloom', 0.45, { dur });
      return b;
    };
    const bloomStrokes = (n, t, list) => {
      const out = [];
      for (const b of n.blooms) {
        if (t < b.at || t >= b.until) continue;
        const bb = bboxOf(list.map((it) => it.s)); if (!bb) continue;
        const c = b.from ?? [bb.x + bb.w * 0.5, bb.y + bb.h * 0.45], rMax = Math.hypot(bb.w, bb.h) * 0.75, q = E.quartOut(cl((t - b.at) / b.dur)), fadeOut = b.until < 1e8 ? 1 - cl((t - (b.until - 0.6)) / 0.6) : 1;
        let any = false;
        for (const it of list) { const s = it.s; if (!(s.closed || s.area) || s.kind === 'construct' || s.kind === 'wash' || s.noWash) continue; any = true; out.push({ s: { ...s, kind: 'wash', color: C0.accent, alpha: b.amount * fadeOut, clip: { x: c[0], y: c[1], r: rMax * q }, static: false, _r: s._r }, n, a: 1 }); }
        // line-only drawings (numerals, a figure in outline): a soft coloured-pencil glow blooms behind them
        if (!any || b.glow) { const r = Math.max(bb.w, bb.h) * 0.62, pts = ellPts(c[0], c[1], r * 1.1 * q + 1, r * 0.8 * q + 1, -0.2, 0, 28); pts.pop(); out.unshift({ s: { ...mkStroke(pts, { kind: 'wash', color: C0.accent, alpha: 0.32 * b.amount * fadeOut, closed: true, static: false, seed: n.seed ^ 515 }) }, n, a: 1 }); }
      }
      return out;
    };

    // ---------- morph: one drawing redraws itself into the next ----------
    const morphs = [];
    D.morph = (at, A, B, o = {}) => {
      const dur = o.dur ?? 0.9;
      A.until = Math.min(A.until, at); A.exit = 'none';
      B.at = at + dur; B.enter = 'none';
      const m = node('morph', { at, until: at + dur, enter: 'none', exit: 'none', z: o.z ?? Math.max(A.z, B.z), layer: A.layer });
      m.from = A; m.to = B; m.dur = dur;
      m.gen = (t) => {
        if (!m.pairs) {
          const lines = (n, tt) => collect(n, tt, [], true).map((it) => it.s).filter((s) => s.kind === 'line');
          const fills = (n, tt) => collect(n, tt, [], true).map((it) => it.s).filter((s) => s.kind !== 'line' && s.kind !== 'construct');
          m.pairs = pairUp(lines(A, at - 1e-4), lines(B, at + dur + 1e-4)); m.fa = fills(A, at - 1e-4); m.fb = fills(B, at + dur + 1e-4);
        }
        const q = inOut((t - at) / dur), sw = Math.sin(Math.PI * q), out = [], rough = B.o.clean === false || (B.o.clean !== undefined && B.o.clean > at + dur);
        m.pairs.forEach(([a, b], i) => {
          const amp = (a.collapse || b.collapse ? 0.3 : 1) * 30 * sw, ph = rnd(m.seed, i) * TAU;
          const pts = a.p.map((p, k) => { const u = k / (MN - 1), bend = Math.sin(Math.PI * u + ph) * amp; const nx = -(b.p[MN - 1][1] - a.p[0][1]), ny = b.p[MN - 1][0] - a.p[0][0], nl = Math.hypot(nx, ny) || 1; return [lerp(p[0], b.p[k][0], q) + (nx / nl) * bend * 0.4, lerp(p[1], b.p[k][1], q) + (ny / nl) * bend * 0.4]; });
          const w = lerp(a.s.w, b.s.w, q), colr = mixHex(a.s.color, b.s.color, q), shrink = a.collapse ? q : b.collapse ? 1 - q : 1;
          // the inbetween is rough: a blue construction line runs a little ahead, the graphite follows
          out.push(mkStroke(pts, { kind: 'construct', w: Math.max(1.6, w * 0.5), color: C0.blue, alpha: rough ? 0.3 + 0.7 * q : 0.7 * sw, static: false, seed: m.seed + i * 31, wob: 2.4 }));
          out.push(mkStroke(pts, { kind: 'line', w: w * (0.55 + 0.45 * shrink), color: colr, alpha: rough ? 1 - q : 0.35 + 0.65 * Math.max(shrink, Math.abs(1 - 2 * q)), static: false, seed: m.seed + i * 31 + 7 }));
        });
        for (const s of m.fa) out.push({ ...s, alpha: (s.alpha ?? 1) * (1 - q), static: false });
        if (!rough) for (const s of m.fb) out.push({ ...s, alpha: (s.alpha ?? 1) * q, static: false });
        return out;
      };
      morphs.push(m);
      F.transition(at, at + dur);
      if (o.sfx !== false) F.sfx(at, 'flip', 0.5, { dur });
      return m;
    };

    // ---------- figures ----------
    const figures = [];
    const KZX = 0.24, KZY = 0.1;
    D.figure = (o = {}) => {
      const n = node('figure', { ...o, enter: o.enter ?? ((o.at ?? 0) > 0 ? 'draw' : 'none') });
      const S = (o.height ?? 400) / 1.72, oy = o.y ?? 0, k = 1, look = o.look ?? 'gesture';
      const fg = { n, S, oy, look, body: [], upper: [], idle: o.idle ?? 1, seed: (n.seed % 1000) / 37, wear: o.wear || null, events: [], acts: [] };
      n.fig = fg;
      const start = fill({ ...POSES.stand, x: (o.x ?? 0) / S, z: o.z ?? 0, yaw: faceOf(o.face ?? 'right'), base: (o.base ?? 0) / S });
      fg.start = start;
      const endPose = (track) => (track.length ? track[track.length - 1].fn(1e9) : start);
      fg.state = () => endPose(fg.body);
      const push = (track, sg) => { const last = track[track.length - 1]; if (last && sg.a < last.a - 1e-6) console.warn(M(`pencil：人物的动作要按时间顺序写（${r2(sg.a)}s 写在了 ${r2(last.a)}s 之后）`, `pencil: write a figure's actions in time order (${r2(sg.a)}s comes after ${r2(last.a)}s)`)); track.push({ blend: 0.45, overlap: 1, antic: 1, ...sg }); track.sort((p, q) => p.a - q.a); fg.events.push(sg.a); if (sg.dur) fg.acts.push({ a: sg.a, b: sg.a + sg.dur }); return sg; };
      const W8 = (sg, t) => { const q = (d) => cl((t - sg.a - d * sg.overlap) / sg.blend), s = 0.7 * sg.antic; return { root: inOut(q(0)), hip: backInOut(s)(q(0)), feet: inOut(q(0)), torso: backInOut(0.6 * sg.antic)(q(0.05)), arms: backInOut(0.35 * sg.antic)(q(0.09)), head: backInOut(0.5 * sg.antic)(q(0.13)) }; };
      const mix = (A, B, w) => {
        const o2 = { ...B };
        o2.x = lerp(A.x, B.x, w.root); o2.z = lerp(A.z, B.z, w.root); o2.yaw = angLerp(A.yaw, B.yaw, w.root); o2.base = lerp(A.base, B.base, w.root);
        o2.hf = lerp(A.hf, B.hf, w.hip); o2.hu = lerp(A.hu, B.hu, w.hip);
        for (const f of ['lean', 'tilt', 'twist']) o2[f] = lerp(A[f], B[f], w.torso);
        o2.nod = lerp(A.nod, B.nod, w.head); o2.lookW = lerp(A.lookW || 0, B.lookW || 0, cl(w.head));
        o2.look = B.look && A.look ? B.look.map((v, i) => lerp(A.look[i], v, cl(w.head))) : B.look || A.look;
        for (const f of ['fL', 'fR']) o2[f] = B[f].map((v, i) => lerp(A[f][i], v, w.feet));
        for (const f of ['hL', 'hR']) o2[f] = B[f].map((v, i) => lerp(A[f][i], v, w.arms));
        return o2;
      };
      const inBlend = (sg, t) => t < sg.a + sg.blend + 0.13 * sg.overlap * 1.01;
      const evalTrack = (track, t, base0) => { let i = -1; for (let j = 0; j < track.length; j++) if (track[j].a <= t) i = j; else break; const at = (k2, depth) => { if (k2 < 0) return base0; const sg = track[k2], cur = sg.fn(t); return depth < 6 && inBlend(sg, t) ? mix(at(k2 - 1, depth + 1), cur, W8(sg, t)) : cur; }; return at(i, 0); };
      const evalUpper = (t, body) => { let i = -1; for (let j = 0; j < fg.upper.length; j++) if (fg.upper[j].a <= t) i = j; else break; if (i < 0) return body; const pick = (s2) => (s2 && s2.fn ? { ...body, ...s2.fn(t, body) } : body); const at = (k2, depth) => { if (k2 < 0) return body; const sg = fg.upper[k2], cur = pick(sg); return depth < 6 && t < sg.a + sg.blend + 0.2 ? mix(at(k2 - 1, depth + 1), cur, { ...W8(sg, t), root: 1, hip: 1, feet: 1 }) : cur; }; return at(i, 0); };
      fg.poseBody = (t) => evalTrack(fg.body, t, start);
      fg.poseAt = (t) => { let p = evalTrack(fg.body, t, start); p = evalUpper(t, p); const br = fg.idle * Math.sin(TAU * (t / 3.4) + fg.seed), sw = fg.idle * Math.sin(TAU * (t / 5.3) + fg.seed * 2); return { ...p, hu: p.hu + 0.006 * br, lean: p.lean + 0.012 * br + 0.006 * sw, nod: p.nod + 0.02 * sw, tilt: p.tilt + 0.01 * sw }; };
      const basis = (p) => ({ f: [Math.cos(p.yaw), 0, Math.sin(p.yaw)], s: [-Math.sin(p.yaw), 0, Math.cos(p.yaw)], u: [0, 1, 0] });
      const toW = (p, B, v) => v3.adds(v3.adds(v3.adds([p.x, p.base, p.z], B.f, v[0] * k), B.u, v[1] * k), B.s, v[2] * k);
      fg.joints = (t, pose) => {
        const p = pose || fg.poseAt(t), B = basis(p);
        const pel = toW(p, B, [p.hf, p.hu, 0]);
        const front = v3.adds(v3.sc(B.f, Math.cos(p.lean)), B.u, -Math.sin(p.lean));
        let d = v3.adds(v3.sc(B.u, Math.cos(p.lean)), B.f, Math.sin(p.lean)); d = v3.norm(v3.adds(v3.sc(d, Math.cos(p.tilt)), B.s, Math.sin(p.tilt)));
        const chest = v3.adds(pel, d, DIM.tl * k), shAx = v3.adds(v3.sc(B.s, Math.cos(p.twist)), B.f, Math.sin(p.twist));
        const shL = v3.adds(v3.adds(chest, d, -0.04 * k), shAx, -DIM.sw * k), shR = v3.adds(v3.adds(chest, d, -0.04 * k), shAx, DIM.sw * k);
        let hd = v3.adds(v3.sc(d, Math.cos(p.nod)), front, Math.sin(p.nod));
        if (p.look && p.lookW > 0.001) { const g2 = v3.norm(v3.sub(p.look, chest)); hd = v3.norm(v3.adds(v3.sc(hd, 1 - 0.4 * p.lookW), g2, 0.4 * p.lookW)); }
        const neckB = v3.adds(chest, d, 0.0), headC = v3.adds(chest, hd, (DIM.neck + DIM.hr) * k);
        const hipL = v3.adds(pel, B.s, -DIM.hw * k), hipR = v3.adds(pel, B.s, DIM.hw * k);
        const legPole = v3.adds(B.f, B.u, 0.35);
        const [knL, ftL] = ik(hipL, toW(p, B, p.fL), DIM.th * k, DIM.sh * k, v3.adds(legPole, B.s, -0.15));
        const [knR, ftR] = ik(hipR, toW(p, B, p.fR), DIM.th * k, DIM.sh * k, v3.adds(legPole, B.s, 0.15));
        const armPole = (sd) => v3.adds(v3.adds(v3.sc(B.f, -0.3), B.u, -0.3), B.s, 0.85 * sd), armPole2 = v3.adds(v3.sc(B.f, -0.5), B.u, -0.85);
        const [elL, haL] = ik(shL, toW(p, B, p.hL), DIM.ua * k, DIM.fa * k, armPole(-1), armPole2);
        const [elR, haR] = ik(shR, toW(p, B, p.hR), DIM.ua * k, DIM.fa * k, armPole(1), armPole2);
        return { p, B, d, pel, chest, neckB, headC, hd, shL, shR, elL, elR, haL, haR, hipL, hipR, knL, knR, ftL, ftR };
      };
      // rig metres → world units (an oblique view: depth shifts a little right and down)
      const pr = (v) => [v[0] * S + v[2] * S * KZX, oy - v[1] * S + v[2] * S * KZY];
      fg.pr = pr;
      fg.handAt = (t, hand = 'R', off) => { const J = fg.joints(Q(t)), h = pr(hand === 'L' ? J.haL : hand === 'both' ? v3.lerp(J.haL, J.haR, 0.5) : J.haR); return off ? [h[0] + off[0], h[1] + off[1]] : h; };
      fg.headAt = (t) => pr(fg.joints(Q(t)).headC);
      fg.pelAt = (t) => pr(fg.joints(Q(t)).pel);
      fg.toRig = (wx) => wx / S;
      // ----- actions -----
      const named = (pose) => (typeof pose === 'string' ? POSES[pose] || (console.warn(M(`pencil：没有这个姿势："${pose}"`, `pencil: no such pose: "${pose}"`)), POSES.stand) : pose);
      fg.pose = (at, pose, o2 = {}) => { const s0 = fg.state(), pp = fill({ ...named(pose), x: o2.x !== undefined ? o2.x / S : s0.x, z: o2.z ?? s0.z, yaw: o2.face !== undefined ? faceOf(o2.face, s0.yaw) : s0.yaw, base: o2.base !== undefined ? o2.base / S : s0.base }); push(fg.body, { a: at, fn: () => pp, blend: o2.dur ?? 0.45, overlap: o2.overlap ?? 1, antic: o2.antic ?? 1, kind: typeof pose === 'string' ? pose : 'pose', dur: o2.dur ?? 0.45 }); if (o2.sfx) F.sfx(at + (o2.dur ?? 0.45) * 0.8, o2.sfx, 0.3); return fg; };
      fg.turn = (at, face, o2 = {}) => { const s0 = fg.state(); return fg.pose(at, { ...s0 }, { dur: 0.45, ...o2, face }); };
      // walk (or run) to x (world units): planted feet, a bob, arms against the legs; run: longer stride, a flight phase, forward lean, pumping arms
      fg.walk = (at, to, o2 = {}) => {
        const s0 = fg.state(), tx = (typeof to === 'number' ? to : to.x) / S, tz = typeof to === 'object' && to.z !== undefined ? to.z : s0.z, dx = tx - s0.x, dz = tz - s0.z, Dd = Math.hypot(dx, dz);
        if (Dd < 0.02) return fg;
        const run = !!o2.run, yaw = Math.atan2(dz, dx), v = o2.speed ?? (run ? 3.6 : 1.2), dur = Dd / v + (run ? 0.5 : 0.35), stride = run ? 1.25 : 0.66 * Math.sqrt(v / 1.2);
        const endYaw = o2.face !== undefined ? faceOf(o2.face, yaw) : yaw;
        const fn = (t) => {
          const q = cl((t - at) / dur), s = Dd * E.sine(q), env = cl(Math.min(s / (stride * 0.6), (Dd - s) / (stride * 0.6), 1)), ph = (s / (2 * stride)) * TAU;
          const foot = (off) => { const u = ((((s / stride) + 0.5 + off) % 2) + 2) % 2; let f2, h; if (u < 1) { f2 = 0.5 - u; h = 0; } else { const w = u - 1; f2 = -0.5 + E.sine(w); h = Math.sin(Math.PI * w) * (run ? 0.3 : 0.11); } return [f2 * stride * env, DIM.fr + h * env, 0]; };
          const fL = foot(0), fR = foot(1); fL[2] = -0.1; fR[2] = 0.1;
          const sw = Math.sin(ph) * (run ? 0.34 : 0.22) * env, lift = run ? 0.05 * Math.abs(Math.sin(ph)) * env : 0;
          const turnQ = cl((t - at) / 0.35), endQ = cl((t - (at + dur - 0.3)) / 0.3);
          return fill({ x: s0.x + Math.cos(yaw) * s, z: s0.z + Math.sin(yaw) * s, yaw: angLerp(angLerp(s0.yaw, yaw, inOut(turnQ)), endYaw, inOut(endQ)), base: s0.base + lift,
            hf: 0.02 * env, hu: STAND_U - (run ? 0.07 : 0.025) * env + 0.022 * Math.abs(Math.cos(ph)) * env, lean: 0.06 + (run ? 0.22 : 0.05) * env, tilt: 0.02 * Math.sin(ph) * env, twist: (run ? 0.2 : 0.12) * Math.sin(ph) * env, nod: run ? -0.05 : 0.04,
            fL, fR, hL: run ? [sw * 1.1, 1.05 + 0.1 * Math.sin(ph), -0.24] : [sw, 0.86, -0.24], hR: run ? [-sw * 1.1, 1.05 - 0.1 * Math.sin(ph), 0.24] : [-sw, 0.86, 0.24] });
        };
        push(fg.body, { a: at, fn, blend: 0.3, kind: run ? 'run' : 'walk', dur });
        if (o2.sfx !== false) for (let s = 0.5; s < Dd / stride - 0.2; s += 1) { const tq = at + dur * (Math.acos(1 - 2 * cl((s * stride) / Dd)) / Math.PI); F.sfx(tq, 'step', run ? 0.2 : 0.14); }
        return fg;
      };
      // keyframed body moves: keys [{ t (s after at), …pose fields, pose: name, x (world units), ease }], eased between, then held
      const keyed = (at, keys, kind, blend = 0.3) => {
        const s0 = fg.state(); let acc = { ...s0 };
        const K = keys.map((kk) => (acc = fill({ ...acc, ...named(kk.pose || {}), ...kk, ...(kk.x !== undefined ? { x: kk.x / S } : {}), ...(kk.base !== undefined ? { base: kk.base / S } : {}), ...(kk.face !== undefined ? { yaw: faceOf(kk.face, acc.yaw) } : {}) })));
        const ts = keys.map((kk) => kk.t);
        const fn = (t) => { const lt = t - at; if (lt <= ts[0]) return K[0]; for (let i = 1; i < K.length; i++) if (lt < ts[i]) { const q = (keys[i].ease || inOut)((lt - ts[i - 1]) / (ts[i] - ts[i - 1])); return mix(K[i - 1], K[i], { root: q, hip: q, feet: q, torso: q, arms: q, head: q }); } return K[K.length - 1]; };
        push(fg.body, { a: at, fn, blend, kind, dur: ts[ts.length - 1] });
        return at + ts[ts.length - 1];
      };
      fg.keys = (at, keys, o2 = {}) => keyed(at, [{ t: 0 }, ...keys], o2.kind ?? 'keys', o2.blend ?? 0.3);
      // jump to { x, base } (world units): crouch, take off, a quadratic arc (gravity), land with knees giving; reach: arms up at the apex
      fg.jump = (at, to = {}, o2 = {}) => {
        const s0 = fg.state(), tb = to.base !== undefined ? to.base / S : s0.base, tx = to.x !== undefined ? to.x / S : s0.x, hgt = (o2.h ?? 0.45), apex = Math.max(s0.base, tb) + hgt;
        const sl = o2.slow ?? 1, T = (x) => x * sl * Math.sqrt(hgt / 0.45);
        const arms = o2.reach ? [[0.18, 2.1, -0.16], [0.22, 2.15, 0.16]] : [[0.3, 1.5, -0.28], [0.3, 1.5, 0.28]];
        F.sfx(at + T(0.25), 'swish', 0.2); F.sfx(at + T(0.85), 'thud', 0.4);
        return keyed(at, [{ t: 0 }, { t: T(0.22), hu: 0.66, lean: 0.4, hL: [-0.25, 0.7, -0.24], hR: [-0.25, 0.7, 0.24], ease: inOut },
          { t: T(0.55), x: (s0.x + tx) / 2, base: apex, hu: STAND_U, lean: 0.02, hL: arms[0], hR: arms[1], fL: [-0.1, 0.22, -0.1], fR: [0.08, 0.32, 0.1], ease: (q) => 1 - (1 - q) * (1 - q) },
          { t: T(0.85), x: tx, base: tb, hu: 0.74, lean: 0.22, hL: [0.3, 0.9, -0.26], hR: [0.3, 0.9, 0.26], fL: [0, DIM.fr, -0.13], fR: [0.06, DIM.fr, 0.13], ease: (q) => q * q },
          { t: T(1.02), x: tx, base: tb, hu: 0.64, lean: 0.34, hL: [0.3, 0.8, -0.26], hR: [0.3, 0.8, 0.26], ease: E.quartOut },
          { t: T(1.4), x: tx, base: tb, pose: 'stand', ease: inOut }].map((kk) => ({ ...kk, ...(kk.x !== undefined ? { x: kk.x * S } : {}), ...(kk.base !== undefined ? { base: kk.base * S } : {}) })), 'jump', 0.2);
      };
      fg.sit = (at, o2 = {}) => { const s0 = fg.state(), top = o2.on !== undefined ? o2.on / S : s0.base, edge = o2.on !== undefined; const end = keyed(at, [{ t: 0 }, { t: 0.4, base: top * S, hu: 0.45, lean: 0.3 }, { t: 0.85, base: top * S, pose: edge ? 'sitEdge' : 'sitFloor', ease: backInOut(0.5), ...(o2.face ? { face: o2.face } : {}) }], 'sit', 0.3); F.sfx(at + 0.7, 'thud', 0.22); return end; };
      fg.lie = (at, o2 = {}) => { const end = keyed(at, [{ t: 0 }, { t: 0.45, pose: 'sitFloor' }, { t: 1.05, pose: 'lie', ease: backInOut(0.4) }], 'lie', 0.35); F.sfx(at + 0.4, 'thud', 0.16); return end; };
      fg.fall = (at) => { F.sfx(at + 0.1, 'swish', 0.2); F.sfx(at + 0.55, 'thud', 0.4); return keyed(at, [{ t: 0 }, { t: 0.15, lean: 0.12, hL: [0.3, 1.3, -0.3], hR: [0.3, 1.3, 0.3] }, { t: 0.55, pose: 'lie', lean: -1.62, ease: E.quartIn }, { t: 0.75, pose: 'lie', lean: -1.45, ease: E.sine }, { t: 0.95, pose: 'lie', ease: E.sine }], 'fall', 0.15); };
      fg.bow = (at, until, o2 = {}) => { fg.pose(at, 'bowHead', { dur: o2.dur ?? 0.9 }); if (until) fg.pose(until, 'stand', { dur: 0.8 }); return fg; };
      fg.cheer = (at, until, o2 = {}) => {
        const s0 = fg.state(), per = o2.every ?? 0.55, nn = Math.max(1, Math.round((until - at) / per)), hop = o2.hop ?? 0.08;
        const fn = (t) => { const lt = t - at, i = Math.floor(lt / per), q = (lt % per) / per, h = i < nn ? Math.sin(Math.PI * q) * hop * (0.7 + 0.6 * rnd(n.seed, i)) : 0; return fill({ ...s0, ...POSES[o2.pose ?? 'cheer'], base: s0.base + h, hu: STAND_U - 0.02 - 0.05 * Math.cos(TAU * q) * (i < nn ? 1 : 0), hL: [0.05 + 0.08 * rnd(n.seed, i + 3), (o2.pose === 'fist' ? 0.86 : 2.05), -0.36], hR: [0.05 + 0.08 * rnd(n.seed, i + 5), 2.0 + 0.06 * rnd(n.seed, i + 9), 0.36] }); };
        push(fg.body, { a: at, fn, blend: 0.3, kind: 'cheer', dur: until - at });
        return fg;
      };
      const pushU = (at, fn, o2 = {}) => push(fg.upper, { a: at, fn, blend: o2.dur ?? 0.4, overlap: 1, antic: o2.antic ?? 0.7, ...o2 });
      const toLocal = (b, w) => { const Bp = basis(b), d2 = v3.sub(w, [b.x, b.base, b.z]); return [v3.dot(d2, Bp.f) / k, d2[1] / k, v3.dot(d2, Bp.s) / k]; };
      const worldOf = (tg, t) => (tg && tg.fig ? tg.fig.joints(t, tg.fig.poseBody(t)).headC : Array.isArray(tg) ? [tg[0] / S, (oy - tg[1]) / S, tg[2] ?? 0] : tg && tg.kind ? (() => { const c = centerOf(tg, t); return [c[0] / S, (oy - c[1]) / S, 0]; })() : null);
      fg.look = (at, target, o2 = {}) => { pushU(at, (t, b) => (target === 'up' ? { nod: -0.55, lookW: 0 } : target === 'down' ? { nod: 0.75, lookW: 0 } : { look: worldOf(target, t), lookW: 1, nod: b.nod * 0.3 }), { dur: o2.dur ?? 0.5, kind: 'look' }); if (o2.until) fg.free(o2.until); return fg; };
      fg.free = (at, o2 = {}) => { pushU(at, null, { dur: o2.dur ?? 0.45, kind: 'free' }); return fg; };
      fg.gesture = (at, pose, o2 = {}) => { const pp = named(pose); pushU(at, () => ({ hL: pp.hL, hR: pp.hR, lean: pp.lean ?? 0, nod: pp.nod ?? 0, tilt: 0, twist: 0, lookW: 0 }), { dur: o2.dur ?? 0.45, kind: 'gesture' }); if (o2.until) fg.free(o2.until); return fg; };
      // reach one hand (or both) to a world point [x, y] (units) and hold it there
      fg.reach = (at, pt, o2 = {}) => { const hand = o2.hand ?? 'R'; pushU(at, (t, b) => { const w = [pt[0] / S, (oy - pt[1]) / S, 0], l = toLocal(b, w); return hand === 'both' ? { hL: [l[0], l[1], l[2] - 0.12], hR: [l[0], l[1], l[2] + 0.12], look: w, lookW: 1 } : { ['h' + hand]: l, look: w, lookW: 1 }; }, { dur: o2.dur ?? 0.5, kind: 'reach' }); if (o2.until) fg.free(o2.until); return fg; };
      // bounce a ball off the floor with one hand (a dribble): the hand pumps, the ball goes hand → floor → hand, never twice quite the same
      fg.bounce = (at, until, ball, o2 = {}) => {
        const hand = o2.hand ?? 'R', per = o2.every ?? 0.5, side = hand === 'R' ? 1 : -1;
        pushU(at, (t, b) => { const lt = Math.max(0, t - at), q = (lt % per) / per, i = Math.floor(lt / per), v = rnd(n.seed, i), push2 = Math.sin(TAU * q) * 0.08 * (0.8 + 0.4 * v); return { ['h' + hand]: [0.32, 0.88 + push2, 0.26 * side], lean: b.lean + 0.08, nod: b.nod + 0.1 }; }, { dur: 0.35, kind: 'bounce' });
        const r = o2.r ?? 18;
        ball.track(at + 0.3, until, (t) => { const lt = t - at - 0.3, q = ((lt % per) + per) % per / per, h = fg.handAt(t, hand), floor = oy + fg.state().base * -S - r; const d = Math.abs(1 - 2 * q); return [h[0] + 4, lerp(floor, h[1] + r * 0.8, d * d)]; });
        for (let t = at + 0.3 + per / 2; t < until; t += per) F.sfx(t, 'thud', 0.28);
        if (o2.until !== false) fg.free(until);
        return fg;
      };
      // shoot: dip, rise, the arm extends over the head, the ball leaves the hand on an arc to the target (world [x, y] or a node), follow-through held
      fg.shoot = (at, ball, target, o2 = {}) => {
        const hand = o2.hand ?? 'R', rel = at + (o2.release ?? 0.8), fly = o2.fly ?? 1.0, g0 = at + 0.3;
        pushU(at, (t, b) => { const q = smooth((t - g0) / (rel - g0)); return { hL: [0.26, lerp(1.12, 1.72, q), -0.1], hR: [lerp(0.26, 0.32, q), lerp(1.14, 2.02, q), 0.06], nod: lerp(-0.05, -0.25, q), lean: b.lean - 0.05 * q }; }, { dur: 0.32, kind: 'shoot' });
        if (o2.jump !== false) fg.jump(rel - 0.42, {}, { h: o2.jumpH ?? 0.22 });
        ball.track(at, rel, (t) => fg.handAt(t, hand, [0, -16]));
        ball.arc(rel, rel + fly, target, { h: o2.h ?? 260, from: () => fg.handAt(rel, hand, [0, -16]) });
        fg.free(rel + (o2.hold ?? 0.9), { dur: 0.85 });   // arms come down from over the head slowly (a quick drop reads as a snap)
        return rel + fly;
      };
      // onion skin: the figure's past poses (every s, n of them) stay as blue rough drawings behind it, fading
      fg.onion = (a, b, o2 = {}) => { (fg.onions ??= []).push({ a, b, every: o2.every ?? 0.25, n: o2.n ?? 3 }); return fg; };
      // ----- drawing: construction (blue), clean-up contours (graphite), smudge on the shadow side; silhouette / rough / line looks -----
      const RAD = { ua: [0.052, 0.04], fa: [0.04, 0.03], th: [0.085, 0.056], sh: [0.058, 0.035] };
      const limbStrokes = (A3, B3, r0, r1, id, out, ln, opt2) => {
        const A = pr(A3), B = pr(B3), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, R0 = r0 * S, R1 = r1 * S, bulge = (side) => (side > 0 ? 1.12 : 1.05);
        const side = (sg) => { const pts = []; for (let i = 0; i <= 6; i++) { const u = i / 6, r = lerp(R0, R1, u) * (1 + (bulge(sg) - 1) * Math.sin(Math.PI * (sg > 0 ? u * 0.9 : u * 1.1))); pts.push([A[0] + dx * u + nx * r * sg - ux * R0 * 0.25 * (1 - u), A[1] + dy * u + ny * r * sg - uy * R0 * 0.25 * (1 - u)]); } return pts; };
        const lft = side(1), rgt = side(-1);
        if (ln) { out.push(mkStroke(lft, { kind: 'line', w: opt2.w, color: opt2.color, static: false, seed: fg.seedOf(id + 'a') })); out.push(mkStroke(rgt, { kind: 'line', w: opt2.w * 0.9, color: opt2.color, static: false, seed: fg.seedOf(id + 'b') })); }
        // the shadow side (light from the top left): the half facing down-right gets graphite
        const shadowSide = nx + ny > 0 ? lft : rgt, mid = Array.from({ length: 7 }, (_, i) => [A[0] + dx * (i / 6), A[1] + dy * (i / 6)]);
        const tube = [...lft, ...rgt.slice().reverse()]; tube.closed = true;
        if (opt2.sil) out.push({ ...mkStroke(tube, { kind: 'tone', color: opt2.silTone, alpha: 0.82, closed: true, static: false, seed: fg.seedOf(id + 't') }), noWash: false });
        else if (opt2.smudge) { const half = [...shadowSide, ...mid.slice().reverse()]; half.closed = true; out.push(mkStroke(half, { kind: 'tone', color: C0.shade, alpha: 0.32, closed: true, static: false, seed: fg.seedOf(id + 's') })); }
        if (opt2.washTube) out.push({ ...mkStroke(tube, { kind: 'tone', color: C0.shade, alpha: 0, closed: true, static: false, seed: fg.seedOf(id + 'w') }), area: true });
        return tube;
      };
      fg.seedOf = (s) => (n.seed ^ hashS(s)) >>> 0;
      const gen = (tq, lk = look, alphaK = 1) => {
        const J = fg.joints(tq), out = [], P2 = (v) => pr(v), lineC = col(o.tone ?? 'lead'), sil = lk === 'silhouette', rough = lk === 'rough';
        const lw = o.lw ?? Math.max(2.4, S * 0.012);
        // construction: the line of action, head circle, ribcage and pelvis ovals, the limbs as sticks, joint circles
        if (o.construct !== false || rough) {
          const cs = (pts, id, w = Math.max(1.5, lw * 0.5), closed = false) => out.push(mkStroke(pts, { kind: 'construct', w, color: C0.blue, static: false, seed: fg.seedOf(id), closed, wob: 2.6 }));
          const footLow = J.ftL[1] < J.ftR[1] ? J.ftL : J.ftR;
          cs(catmull([P2(J.headC), P2(J.chest), P2(J.pel), P2(v3.lerp(J.pel, footLow, 0.55)), P2(footLow)], false, 5), 'loa', lw * 0.6);
          const hc = P2(J.headC); cs(ellPts(hc[0], hc[1], DIM.hr * S * 1.05, DIM.hr * S * 1.12, 0, 0, 16), 'hc', undefined, true);
          const rc = P2(v3.lerp(J.chest, J.pel, 0.28)), rr = DIM.tl * S * 0.36, ang = Math.atan2(P2(J.pel)[1] - P2(J.chest)[1], P2(J.pel)[0] - P2(J.chest)[0]) - Math.PI / 2;
          cs(ellPts(rc[0], rc[1], DIM.sw * S * 1.05, rr, ang, 0, 18), 'rib', undefined, true);
          const pc = P2(J.pel); cs(ellPts(pc[0], pc[1], DIM.hw * S * 1.5, DIM.hw * S * 1.0, ang, 0, 14), 'pel', undefined, true);
          for (const [a, b, id] of [[J.shL, J.elL, 'sl'], [J.elL, J.haL, 'el'], [J.shR, J.elR, 'sr'], [J.elR, J.haR, 'er'], [J.hipL, J.knL, 'hl'], [J.knL, J.ftL, 'kl'], [J.hipR, J.knR, 'hr'], [J.knR, J.ftR, 'kr'], [J.shL, J.shR, 'sh']]) cs([P2(a), P2(b)], id);
          for (const [j, id] of [[J.elL, 'je1'], [J.elR, 'je2'], [J.knL, 'jk1'], [J.knR, 'jk2']]) { const c = P2(j); cs(ellPts(c[0], c[1], S * 0.03, S * 0.03, 0, 0, 8), id, undefined, true); }
        }
        if (rough) return out;
        const opt2 = { w: lw, color: lineC, smudge: lk === 'gesture', sil, silTone: C0.lead };
        const ln = true, Z = (v) => v[2];
        // far side first
        const limbs = [
          { z: (Z(J.knL) + Z(J.hipL)) / 2, f: () => { limbStrokes(J.hipL, J.knL, ...RAD.th, 'thL', out, ln, opt2); limbStrokes(J.knL, J.ftL, ...RAD.sh, 'shL', out, ln, opt2); foot(J.knL, J.ftL, 'fL'); } },
          { z: (Z(J.knR) + Z(J.hipR)) / 2, f: () => { limbStrokes(J.hipR, J.knR, ...RAD.th, 'thR', out, ln, opt2); limbStrokes(J.knR, J.ftR, ...RAD.sh, 'shR', out, ln, opt2); foot(J.knR, J.ftR, 'fR'); } },
          { z: (Z(J.chest) + Z(J.pel)) / 2 + 0.001, f: () => torso() },
          { z: (Z(J.elL) + Z(J.shL)) / 2, f: () => { limbStrokes(J.shL, J.elL, ...RAD.ua, 'uaL', out, ln, opt2); limbStrokes(J.elL, J.haL, ...RAD.fa, 'faL', out, ln, opt2); handS(J.haL, J.elL, 'hL'); } },
          { z: (Z(J.elR) + Z(J.shR)) / 2, f: () => { limbStrokes(J.shR, J.elR, ...RAD.ua, 'uaR', out, ln, opt2); limbStrokes(J.elR, J.haR, ...RAD.fa, 'faR', out, ln, opt2); handS(J.haR, J.elR, 'hR'); } },
          { z: Z(J.headC) + 0.002, f: () => head() },
        ].sort((a, b) => a.z - b.z);
        function foot(kn, ft, id) { const a = P2(ft), toe = P2(v3.adds(v3.adds(ft, J.B.f, 0.17), [0, -1, 0], 0.05)), heel = P2(v3.adds(v3.adds(ft, J.B.f, -0.05), [0, -1, 0], 0.06)); const pts = [heel, a, [lerp(a[0], toe[0], 0.6), lerp(a[1], toe[1], 0.6) - S * 0.02], toe, heel]; pts.closed = true; out.push(mkStroke(pts, { kind: 'line', w: opt2.w * 0.9, color: lineC, static: false, seed: fg.seedOf(id), closed: true })); if (sil) out.push(mkStroke(pts, { kind: 'tone', color: C0.lead, alpha: 0.82, closed: true, static: false, seed: fg.seedOf(id + 't') })); }
        function handS(ha, el2, id) { const c = P2(ha), e2 = P2(el2), a = Math.atan2(c[1] - e2[1], c[0] - e2[0]); const pts = ellPts(c[0] + Math.cos(a) * S * 0.03, c[1] + Math.sin(a) * S * 0.03, S * 0.052, S * 0.04, a, 0, 10); out.push(mkStroke(pts, { kind: 'line', w: opt2.w * 0.85, color: lineC, static: false, seed: fg.seedOf(id), closed: true })); if (sil) out.push(mkStroke(pts, { kind: 'tone', color: C0.lead, alpha: 0.82, closed: true, static: false, seed: fg.seedOf(id + 't') })); }
        function torso() {
          const ch = P2(J.chest), pe = P2(J.pel), nk = P2(J.neckB), ax = [ch[0] - pe[0], ch[1] - pe[1]], al = Math.hypot(ax[0], ax[1]) || 1, nx = -ax[1] / al, ny = ax[0] / al;
          const dist2 = (a2, b2) => Math.hypot(a2[0] - b2[0], a2[1] - b2[1]);
          const shW = Math.max(dist2(P2(J.shL), P2(J.shR)) / 2 + S * 0.03, S * 0.12), hipW = Math.max(dist2(P2(J.hipL), P2(J.hipR)) / 2 + S * 0.04, S * 0.11), waistW = Math.min(shW, hipW) * 0.84;
          const fp = P2(v3.add(J.pel, J.B.f)), fs = Math.sign((fp[0] - pe[0]) * nx + (fp[1] - pe[1]) * ny) || 1;
          const width = (u) => (u < 0.45 ? lerp(hipW, waistW, smooth(u / 0.45)) : lerp(waistW, shW, smooth((u - 0.45) / 0.47)));
          const pt = (u, sd) => { const bul = S * 0.035 * Math.sin(Math.PI * cl((u - 0.4) / 0.6)) * (sd === fs ? 1 : 0.3); return [pe[0] + ax[0] * u + nx * sd * (width(u) + bul), pe[1] + ax[1] * u + ny * sd * (width(u) + bul)]; };
          const us = [0.96, 0.78, 0.6, 0.42, 0.22, 0.02];
          const left = catmull(us.map((u) => pt(u, 1)), false, 4), right = catmull(us.map((u) => pt(u, -1)), false, 4);
          const cx = (ch[0] + pe[0]) / 2, cy = (ch[1] + pe[1]) / 2, wst = (a2, b2, q) => [lerp(a2[0], b2[0], q), lerp(a2[1], b2[1], q)];
          const shL = pt(0.96, 1), shR = pt(0.96, -1), hipL = pt(0.02, 1), hipR = pt(0.02, -1);
          const top = catmull([shL, [lerp(shL[0], nk[0], 0.6) + ax[0] / al * S * 0.02, lerp(shL[1], nk[1], 0.6) + ax[1] / al * S * 0.02], [lerp(shR[0], nk[0], 0.6) + ax[0] / al * S * 0.02, lerp(shR[1], nk[1], 0.6) + ax[1] / al * S * 0.02], shR], false, 4), bottom = catmull([hipL, [pe[0] - ax[0] / al * S * 0.05, pe[1] - ax[1] / al * S * 0.05], hipR], false, 4);
          out.push(mkStroke(left, { kind: 'line', w: lw, color: lineC, static: false, seed: fg.seedOf('tl') }));
          out.push(mkStroke(right, { kind: 'line', w: lw, color: lineC, static: false, seed: fg.seedOf('tr') }));
          out.push(mkStroke(top, { kind: 'line', w: lw * 0.85, color: lineC, static: false, seed: fg.seedOf('tt') }));
          const body = [...left, ...bottom.slice(1, -1), ...right.slice().reverse(), ...top.slice(1, -1).reverse()]; body.closed = true;
          if (sil) out.push(mkStroke(body, { kind: 'tone', color: C0.lead, alpha: 0.82, closed: true, static: false, seed: fg.seedOf('tbt') }));
          else if (opt2.smudge) { const sh2 = (shR[0] + shR[1] > shL[0] + shL[1]) ? right : left, half = [...sh2, ...catmull([pe, ch], false, 3).reverse()]; half.closed = true; out.push(mkStroke(half, { kind: 'tone', color: C0.shade, alpha: 0.26, closed: true, static: false, seed: fg.seedOf('tsm') })); }
          body.area = true; out.push({ ...mkStroke(body, { kind: 'tone', color: C0.shade, alpha: 0, closed: true, static: false, seed: fg.seedOf('tw') }), area: true });
          const wr = fg.wear;
          if (wr) {
            if (wr.top === 'tank' || wr.top === 'shirt') {
              const arm = (sh, sg) => catmull([sh, [lerp(sh[0], cx, 0.32), lerp(sh[1], cy, 0.32) + S * 0.06], wst(sh, sg ? hipR : hipL, 0.32)], false, 4);
              out.push(mkStroke(arm(shL, 0), { kind: 'line', w: lw * 0.7, color: lineC, static: false, seed: fg.seedOf('al') })); out.push(mkStroke(arm(shR, 1), { kind: 'line', w: lw * 0.7, color: lineC, static: false, seed: fg.seedOf('ar') }));
              const back = J.B.f[2] < -0.3;
              if (!back) out.push(mkStroke(catmull([[lerp(shL[0], nk[0], 0.55), lerp(shL[1], nk[1], 0.55)], [nk[0], nk[1] + S * 0.1], [lerp(shR[0], nk[0], 0.55), lerp(shR[1], nk[1], 0.55)]], false, 4), { kind: 'line', w: lw * 0.7, color: lineC, static: false, seed: fg.seedOf('nl') }));
            }
            if (wr.bottom === 'shorts') {
              const kL = P2(J.knL), kR = P2(J.knR), hemL = wst(hipL, kL, 0.62), hemR = wst(hipR, kR, 0.62), dL = [-(kL[1] - hipL[1]), kL[0] - hipL[0]], dR = [-(kR[1] - hipR[1]), kR[0] - hipR[0]], nl = (d) => { const l = Math.hypot(d[0], d[1]) || 1; return [d[0] / l, d[1] / l]; };
              const a = nl(dL), b = nl(dR), w2 = S * 0.11;
              out.push(mkStroke([[hipL[0] - a[0] * w2 * 0.4, hipL[1]], [hemL[0] - a[0] * w2, hemL[1] - a[1] * w2]], { kind: 'line', w: lw * 0.8, color: lineC, static: false, seed: fg.seedOf('s1') }));
              out.push(mkStroke([[hipR[0] + b[0] * w2 * 0.4, hipR[1]], [hemR[0] + b[0] * w2, hemR[1] + b[1] * w2]], { kind: 'line', w: lw * 0.8, color: lineC, static: false, seed: fg.seedOf('s2') }));
              out.push(mkStroke([[hemL[0] - a[0] * w2, hemL[1] - a[1] * w2], [hemL[0] + a[0] * w2 * 0.8, hemL[1] + a[1] * w2 * 0.8]], { kind: 'line', w: lw * 0.75, color: lineC, static: false, seed: fg.seedOf('s3') }));
              out.push(mkStroke([[hemR[0] + b[0] * w2, hemR[1] + b[1] * w2], [hemR[0] - b[0] * w2 * 0.8, hemR[1] - b[1] * w2 * 0.8]], { kind: 'line', w: lw * 0.75, color: lineC, static: false, seed: fg.seedOf('s4') }));
            }
            // a plain numeral on the back (or the front with wear.front): stroke-drawn, sized to the torso
            const showNum = wr.number !== undefined && wr.number !== null && (J.B.f[2] < -0.3 || wr.front);
            if (showNum) {
              const num = typeof wr.number === 'function' ? wr.number(tq) : wr.number, c = P2(v3.lerp(J.chest, J.pel, 0.42)), sz = Math.hypot(ch[0] - pe[0], ch[1] - pe[1]) * 0.5, g = glyphStrokes(String(num), sz);
              for (const s of g.list) out.push(mkStroke(s.pts.map((p) => [c[0] + p[0], c[1] + p[1]]), { kind: 'line', w: lw * 1.25, color: lineC, static: false, seed: fg.seedOf('num' + s.ci + num), closed: s.closed, noWash: true }));
            }
          }
        }
        function head() {
          const c = P2(J.headC), nb = P2(J.neckB), hd = [c[0] - nb[0], c[1] - nb[1]], hl = Math.hypot(hd[0], hd[1]) || 1, a = Math.atan2(hd[1], hd[0]) + Math.PI / 2;
          const pts = ellPts(c[0], c[1], DIM.hr * S * 0.95, DIM.hr * S * 1.18, a, -Math.PI / 2 - 0.4, 18);
          out.push(mkStroke(pts, { kind: 'line', w: lw, color: lineC, static: false, seed: fg.seedOf('hd'), closed: true }));
          const nx = -hd[1] / hl, ny = hd[0] / hl, r = S * 0.035, base = [nb[0], nb[1]], topN = [c[0] - (hd[0] / hl) * DIM.hr * S * 0.9, c[1] - (hd[1] / hl) * DIM.hr * S * 0.9];
          out.push(mkStroke([[base[0] + nx * r, base[1] + ny * r], [topN[0] + nx * r * 0.9, topN[1] + ny * r * 0.9]], { kind: 'line', w: lw * 0.8, color: lineC, static: false, seed: fg.seedOf('n1') }));
          out.push(mkStroke([[base[0] - nx * r, base[1] - ny * r], [topN[0] - nx * r * 0.9, topN[1] - ny * r * 0.9]], { kind: 'line', w: lw * 0.8, color: lineC, static: false, seed: fg.seedOf('n2') }));
          if (sil) out.push(mkStroke(pts, { kind: 'tone', color: C0.lead, alpha: 0.85, closed: true, static: false, seed: fg.seedOf('hdt') }));
          else if (opt2.smudge) { const half = ellPts(c[0] + S * 0.01, c[1] + S * 0.01, DIM.hr * S * 0.85, DIM.hr * S * 1.05, 0, -Math.PI / 4, 10, Math.PI * 0.9); half.closed = true; out.push(mkStroke(half, { kind: 'tone', color: C0.shade, alpha: 0.28, closed: true, static: false, seed: fg.seedOf('hds') })); }
        }
        for (const L of limbs) L.f();
        if (alphaK !== 1) for (const s of out) s.alpha = (s.alpha ?? 1) * alphaK;
        return out;
      };
      fg.gen = gen;
      n.gen = (t) => {
        const tq = Q(t);
        if (fg._ct === tq && fg._cl) return fg._cl;
        let out = gen(tq);
        for (const on of fg.onions || []) if (tq >= on.a && tq < on.b) for (let i = on.n; i >= 1; i--) { const tp = tq - i * on.every; if (tp < on.a - 0.5) continue; out = [...gen(tp, 'rough', 0.7 * (1 - i / (on.n + 1))), ...out]; }
        fg._ct = tq; fg._cl = out;
        return out;
      };
      figures.push(fg);
      return n;
    };

    // ---------- props (each a group; base-anchored: y = the ground under it, x = its centre) ----------
    const G0 = (o, d = {}) => D.group({ x: o.x ?? 0, y: o.y ?? 0, s: o.s ?? 1, rot: o.rot ?? 0, at: o.at, until: o.until, enter: o.enter ?? d.enter, exit: o.exit, inDur: o.inDur ?? d.inDur, z: o.z, in: o.in, layer: o.layer });
    const PROPS = {
      ball: (g, o) => { const r = o.r ?? 26; g.circle({ cy: -r, r, smudge: 0.5, shade: 0.25 }); g.path({ d: `M${-r * 0.02} ${-2 * r} C${r * 0.35} ${-r * 1.4} ${r * 0.35} ${-r * 0.6} ${r * 0.02} 0`, lw: 2.2 }); g.line({ pts: [[-r, -r], [r, -r]], lw: 2.2 }); g.path({ d: `M${-r * 0.7} ${-r * 1.7} C${-r * 0.3} ${-r * 1.3} ${-r * 0.3} ${-r * 0.7} ${-r * 0.7} ${-r * 0.3}`, lw: 2 }); g.path({ d: `M${r * 0.7} ${-r * 1.7} C${r * 0.3} ${-r * 1.3} ${r * 0.3} ${-r * 0.7} ${r * 0.7} ${-r * 0.3}`, lw: 2 }); },
      hoop: (g, o) => { const h = o.h ?? 600, side = o.side ?? 1, bw = o.bw ?? 180, bh = o.bh ?? 112, rim = o.rim ?? 46; g.line({ pts: [[0, 0], [0, -h - bh * 0.6]], lw: 5 }); g.line({ pts: [[10 * side, 0], [10 * side, -h - bh * 0.5]], lw: 3 }); g.line({ pts: [[0, -h - bh * 0.3], [side * 90, -h - bh * 0.3]], lw: 3.4 }); g.rect({ rx0: side * 90 - (side < 0 ? 0 : 0) + (side < 0 ? -12 : 0), ry0: -h - bh * 0.9, w: 12, h: bh, lw: 3, smudge: 0.3, area: true }); const fx = side * 102; g.line({ pts: [[fx, -h - 10], [fx + side * 16, -h]], lw: 3 }); g.ellipse({ cx: fx + side * (16 + rim), cy: -h, rx: rim, ry: rim * 0.24, lw: 3.4, tone: 'lead' }); for (let i = 0; i <= 5; i++) { const u = i / 5, x0 = fx + side * (16 + rim * 2 * u), x1 = fx + side * (16 + rim * (0.35 + 1.3 * u)); g.line({ pts: [[x0, -h + 2], [x1, -h + rim * 1.2]], lw: 1.6, tone: 'soft' }); } g.line({ pts: [[fx + side * (16 + rim * 0.3), -h + rim * 0.6], [fx + side * (16 + rim * 1.7), -h + rim * 0.6]], lw: 1.4, tone: 'soft' }); },
      court: (g, o) => { const w = o.w ?? 1400, d = o.d ?? 260; g.line({ pts: [[-w / 2, 0], [w / 2, 0]], lw: 2.6 }); g.line({ pts: [[-w / 2 + d * 0.6, -d], [w / 2 - d * 0.6, -d]], lw: 2, tone: 'soft' }); g.poly({ pts: [[-90, -d * 0.02], [90, -d * 0.02], [70, -d * 0.6], [-70, -d * 0.6]], lw: 2.2, tone: 'soft', closed: true }); g.ellipse({ cy: -d * 0.6, rx: 70, ry: 16, lw: 2, tone: 'soft' }); g.arc({ cy: -d * 0.95, rx: w * 0.32, ry: d * 0.9, from: 10, to: 170, lw: 2, tone: 'soft' }); },
      cup: (g, o) => { const h = o.h ?? 160, w = o.w ?? 110; g.path({ d: `M${-w / 2} ${-h} C${-w / 2} ${-h * 0.45} ${-w * 0.2} ${-h * 0.42} ${-w * 0.08} ${-h * 0.36} L${-w * 0.08} ${-h * 0.14} L${-w * 0.3} ${-h * 0.1} L${-w * 0.3} 0 L${w * 0.3} 0 L${w * 0.3} ${-h * 0.1} L${w * 0.08} ${-h * 0.14} L${w * 0.08} ${-h * 0.36} C${w * 0.2} ${-h * 0.42} ${w / 2} ${-h * 0.45} ${w / 2} ${-h} Z`, smudge: 0.35, shade: 0.3 }); g.ellipse({ cy: -h, rx: w / 2, ry: w * 0.1 }); g.path({ d: `M${-w / 2} ${-h * 0.9} C${-w * 0.85} ${-h * 0.9} ${-w * 0.8} ${-h * 0.55} ${-w * 0.25} ${-h * 0.5}`, lw: 2.6 }); g.path({ d: `M${w / 2} ${-h * 0.9} C${w * 0.85} ${-h * 0.9} ${w * 0.8} ${-h * 0.55} ${w * 0.25} ${-h * 0.5}`, lw: 2.6 }); },
      medal: (g, o) => { const r = o.r ?? 46, L = o.len ?? 90; g.poly({ pts: [[-r * 0.7, -L - r * 2], [-r * 0.15, -r * 2], [r * 0.15, -r * 2], [r * 0.7, -L - r * 2]], closed: false, lw: 2.6 }); g.circle({ cy: -r, r, smudge: 0.3, shade: 0.35 }); g.circle({ cy: -r, r: r * 0.68, lw: 2 }); },
      banner: (g, o) => { const w = o.w ?? 130, h = o.h ?? 190; g.line({ pts: [[-w * 0.6, -h - 18], [w * 0.6, -h - 18]], lw: 2.4 }); g.poly({ pts: [[-w / 2, -h], [w / 2, -h], [w / 2, -h * 0.12], [0, 0], [-w / 2, -h * 0.12]], smudge: 0.18, area: true }); if (o.text !== undefined) D.numeral({ in: g, x: 0, y: -h * 0.55, size: h * 0.36, keys: [[-1, String(o.text)]] }); },
      board: (g, o) => { const w = o.w ?? 420, h = o.h ?? 180; g.rect({ rx0: -w / 2, ry0: -h, w, h, smudge: 0.55, shade: 0.4 }); g.line({ pts: [[-w * 0.3, -h], [-w * 0.3, -h - 60]], lw: 2 }); g.line({ pts: [[w * 0.3, -h], [w * 0.3, -h - 60]], lw: 2 }); },
      door: (g, o) => { const w = o.w ?? 150, h = o.h ?? 320; g.rect({ rx0: -w / 2, ry0: -h, w, h }); g.rect({ rx0: -w / 2 + 14, ry0: -h + 14, w: w - 28, h: h - 14, lw: 2.4, shade: 0.22, area: true }); g.circle({ cx: w * 0.3, cy: -h * 0.48, r: 6, lw: 2 }); },
      window: (g, o) => { const w = o.w ?? 180, h = o.h ?? 200; g.rect({ rx0: -w / 2, ry0: -h, w, h }); g.line({ pts: [[0, -h], [0, 0]], lw: 2.4 }); g.line({ pts: [[-w / 2, -h / 2], [w / 2, -h / 2]], lw: 2.4 }); },
      chair: (g, o) => { const s = o.size ?? 1; g.poly({ pts: [[-40 * s, 0], [-40 * s, -90 * s], [40 * s, -90 * s], [40 * s, 0]], closed: false }); g.line({ pts: [[-40 * s, -90 * s], [-48 * s, -190 * s]], lw: 3.2 }); g.line({ pts: [[-48 * s, -190 * s], [-30 * s, -190 * s]], lw: 3 }); },
      table: (g, o) => { const w = o.w ?? 260, h = o.h ?? 150; g.line({ pts: [[-w / 2, -h], [w / 2, -h]], lw: 4 }); g.line({ pts: [[-w / 2 + 16, -h], [-w / 2 + 22, 0]] }); g.line({ pts: [[w / 2 - 16, -h], [w / 2 - 22, 0]] }); },
      lamp: (g, o) => { const h = o.h ?? 420; g.line({ pts: [[0, 0], [0, -h]], lw: 3.2 }); g.poly({ pts: [[-40, -h - 10], [40, -h - 10], [24, -h - 60], [-24, -h - 60]], smudge: 0.3 }); g.line({ pts: [[-30, 0], [30, 0]], lw: 3.4 }); },
      tree: (g, o) => { const h = o.h ?? 300; g.path({ d: `M-10 0 C-8 ${-h * 0.3} -14 ${-h * 0.5} -6 ${-h * 0.62} M10 0 C8 ${-h * 0.3} 12 ${-h * 0.5} 6 ${-h * 0.62}` }); g.poly({ pts: catmull([[0, -h], [h * 0.32, -h * 0.82], [h * 0.3, -h * 0.58], [0, -h * 0.5], [-h * 0.3, -h * 0.58], [-h * 0.32, -h * 0.82]], true, 5), shade: 0.35, smudge: 0.25 }); },
      house: (g, o) => { const w = o.w ?? 240, h = o.h ?? 170; g.rect({ rx0: -w / 2, ry0: -h, w, h, shade: 0.15, area: true }); g.poly({ pts: [[-w / 2 - 18, -h], [0, -h - w * 0.45], [w / 2 + 18, -h]], closed: false }); g.rect({ rx0: -18, ry0: -70, w: 36, h: 70, lw: 2.4 }); g.rect({ rx0: w * 0.18, ry0: -h * 0.72, w: 40, h: 36, lw: 2.2 }); },
      hills: (g, o) => { const w = o.w ?? 1600, h = o.h ?? 160, R0 = rngOf((o.seed ?? 3) * 999), pts = []; for (let i = 0; i <= 8; i++) pts.push([-w / 2 + (w * i) / 8, -h * (0.35 + 0.65 * R0())]); g.line({ pts, smooth: true, lw: 3 }); const p2 = [...catmull(pts, false, 6), [w / 2, 0], [-w / 2, 0]]; p2.closed = true; g.poly({ pts: p2, line: false, construct: false, shade: 0.3, smudge: 0.25, angle: 30 }); },
      cloud: (g, o) => { const w = o.w ?? 900, h = o.h ?? 120, R0 = rngOf((o.seed ?? 5) * 777); for (let k = 0; k < (o.rows ?? 3); k++) { const pts = []; for (let i = 0; i <= 10; i++) pts.push([-w / 2 + (w * i) / 10, -h * (k / 3) - h * 0.2 * R0()]); g.line({ pts, smooth: true, lw: 2, tone: 'soft' }); } const band = []; for (let i = 0; i <= 12; i++) band.push([-w / 2 + (w * i) / 12, -h * (0.55 + 0.35 * R0())]); for (let i = 12; i >= 0; i--) band.push([-w / 2 + (w * i) / 12 + 20, -h * (0.05 + 0.2 * R0())]); g.poly({ pts: band, smooth: true, line: false, construct: false, smudge: (o.dark ?? 0.5) * 0.7, angle: 10 }); },
      globe: (g, o) => { const r = o.r ?? 160; g.circle({ cy: -r, r, smudge: 0.2 }); for (const k of [-0.5, 0, 0.5]) g.ellipse({ cy: -r + r * k, rx: r * Math.sqrt(1 - k * k), ry: r * 0.12 * Math.sqrt(1 - k * k), lw: 1.8, tone: 'soft' }); for (const k of [0.35, 0.75]) g.ellipse({ cy: -r, rx: r * k, ry: r, lw: 1.8, tone: 'soft' }); },
      crowd: (g, o) => { const w = o.w ?? 1200, rows = o.rows ?? 3, R0 = rngOf((o.seed ?? 9) * 313); for (let r = 0; r < rows; r++) for (let x = -w / 2; x < w / 2; x += 34 + R0() * 16) { const y = -r * 46 - 10 * R0(); g.circle({ cx: x, cy: y - 34, r: 11 + R0() * 3, lw: 1.6, tone: 'soft', construct: false }); g.arc({ cx: x, cy: y, rx: 20, ry: 20, from: 200, to: 340, lw: 1.6, tone: 'soft', construct: false }); } },
      frame: (g, o) => { const w = o.w ?? 300, h = o.h ?? 220; g.rect({ rx0: -w / 2, ry0: -h, w, h }); g.rect({ rx0: -w / 2 + 16, ry0: -h + 16, w: w - 32, h: h - 32, lw: 2 }); },
      film: (g, o) => { const w = o.w ?? 380, h = o.h ?? 120; g.rect({ rx0: -w / 2, ry0: -h, w, h, smudge: 0.4 }); for (let x = -w / 2 + 14; x < w / 2 - 10; x += 28) { g.rect({ rx0: x, ry0: -h + 8, w: 12, h: 12, lw: 1.6, construct: false }); g.rect({ rx0: x, ry0: -20, w: 12, h: 12, lw: 1.6, construct: false }); } for (let i = 1; i < 3; i++) g.line({ pts: [[-w / 2 + (w * i) / 3, -h + 28], [-w / 2 + (w * i) / 3, -28]], lw: 2 }); },
    };
    D.prop = (kind, o = {}) => {
      const g = G0(o, { enter: (o.at ?? 0) > 0 ? 'draw' : 'none', inDur: o.inDur ?? 1.2 });
      const mkp = PROPS[kind]; if (!mkp) { console.warn(M(`pencil：没有这个道具："${kind}"`, `pencil: no such prop: "${kind}"`)); return g; }
      mkp(g, o); g.prop = kind;
      if (g.at > 0 && g.enter === 'draw' && o.sfx !== false) F.sfx(g.at, 'sketch', 0.35, { dur: g.inDur });
      return g;
    };

    // ---------- live drawings and mechanisms: strokes recomputed from t on every drawing, so a shape can really change and a machine really runs ----------
    const consOf = (n, o) => { let own = n; while (own.parent && own.at < 0) own = own.parent; return o.construct ?? own.enter === 'draw'; };
    // D.live({ draw: (t, pen) => { pen.line(pts, o); pen.circle(cx, cy, r, o); pen.poly(pts, o); }, x, y, … }): coordinates local to the node; part seeds are stable by call order, so the boil stays a boil
    D.live = (o = {}) => {
      const n = node('live', o);
      n.gen = (t) => {
        const tq = Q(t), m = worldM(n, tq), out = [], cons = consOf(n, o); let i = 0;
        const W2 = (p) => mapp(m, p), sc = Math.hypot(m[0], m[1]);
        const push = (pts, o2 = {}) => {
          const id = n.seed + (i++) * 131, base = o2.smooth ? catmull(pts, !!o2.closed, 6) : pts, wp = base.map(W2), closed = !!o2.closed, w = (o2.lw ?? o.lw ?? 3.4) * sc;
          if (o2.construct ?? cons) out.push(mkStroke(wp, { kind: 'construct', w: Math.max(2, w * 0.6), color: C0.blue, closed, static: false, seed: id + 1, wob: 2.6 }));
          if (o2.line !== false) out.push(mkStroke(wp, { kind: 'line', w, color: col(o2.tone ?? o.tone ?? 'lead'), closed, static: false, seed: id, alpha: o2.alpha, passes: o2.passes, noWash: o2.noWash }));
          if (closed) { if (!o2.noWash) out.push({ ...mkStroke(wp, { kind: 'tone', alpha: 0, closed: true, static: false, seed: id + 2 }), area: true }); if (o2.smudge) out.push(mkStroke(wp, { kind: 'tone', color: C0.shade, alpha: o2.smudge * 0.42, closed: true, static: false, seed: id + 3 })); if (o2.shade) out.push(mkStroke(wp, { kind: 'hatch', color: C0.lead, alpha: o2.shade * 0.7, angle: o2.angle ?? 58, closed: true, static: false, seed: id + 4 })); if (o2.wash) out.push(mkStroke(wp, { kind: 'wash', color: C0.accent, alpha: o2.wash, closed: true, static: false, seed: id + 5 })); }
        };
        const pen = { line: (pts, o2) => push(pts, o2), poly: (pts, o2) => push(pts, { closed: true, ...o2 }), circle: (cx, cy, r, o2 = {}) => { const p = ellPts(cx, cy, r, o2.ry ?? r, o2.tilt ?? 0, -Math.PI / 2 - 0.3, Math.max(14, Math.round(r / 5))); p.pop(); push(p, { closed: true, ...o2 }); } };
        o.draw(tq, pen);
        return out;
      };
      return n;
    };
    // a shaft's angle over time: keys [[t, turns per second], …], the rate ramps linearly between keys and holds after the last (so it never starts or stops dead) → fn(t) radians; angle increasing = clockwise on the sheet = rolling to the right
    D.drive = (keys, o = {}) => {
      const K = keys.slice().sort((a, b) => a[0] - b[0]), acc = [o.from ?? 0];
      for (let i = 1; i < K.length; i++) acc.push(acc[i - 1] + ((K[i - 1][1] + K[i][1]) / 2) * (K[i][0] - K[i - 1][0]) * TAU);
      return (t) => { if (!K.length || t <= K[0][0]) return acc[0] ?? 0; let i = K.length - 1; while (i > 0 && t < K[i][0]) i--; if (i === K.length - 1) return acc[i] + K[i][1] * (t - K[i][0]) * TAU; const dt = t - K[i][0], span = K[i + 1][0] - K[i][0], r = lerp(K[i][1], K[i + 1][1], dt / span); return acc[i] + ((K[i][1] + r) / 2) * dt * TAU; };
    };
    const fnOf = (v, d) => (typeof v === 'function' ? v : () => v ?? d);
    const turnOf = (n, t) => (n.turnFn ? n.turnFn(t) : 0);
    // how far a shaft's repeating parts have outrun the eye: 0 while each lands well short of the next one's place from one drawing to the next, 1 once it lands past halfway or more (a strobe, or a wheel seen running backwards)
    const spinBlur = (n, tq, pitch) => { const q = cl((Math.abs(turnOf(n, tq) - turnOf(n, tq - 1 / FPSD)) / pitch - 0.3) / 0.35); return q * q * (3 - 2 * q); };
    // the point on a shaft at radius / angle, on the sheet
    const onShaft = (n, t, rad, ang) => mapp(worldM(n, Q(t)), [Math.cos(ang) * rad, Math.sin(ang) * rad]);
    // D.wheel({ x, y, r (or fn(t)), spokes, kind: 'wood' | 'wire', tyre (thickness; 0 = a bare rim), turn: fn(t) | a fixed angle, mark: true (one painted spot, so its turns can be counted), blur: false (keep sharp spokes however fast), hub, in, at… })
    D.wheel = (o = {}) => {
      const n = node('wheel', o), rf = fnOf(o.r, 200), wood = o.kind === 'wood', nSp = o.spokes ?? (wood ? 12 : 24), tyre = fnOf(o.tyre, 0), lw = o.lw ?? 3.6;
      n.turnFn = fnOf(o.turn, 0); n.rAt = (t) => rf(t); n.spotAt = (t) => onShaft(n, t, rf(Q(t)) * 0.92, turnOf(n, Q(t)));
      n.spinAt = (t) => (o.blur === false ? 0 : spinBlur(n, Q(t), TAU / Math.max(1, nSp)));
      n.gen = (t) => {
        const tq = Q(t), m = worldM(n, tq), r = rf(tq), th = turnOf(n, tq), out = [], W2 = (p) => mapp(m, p), sc = Math.hypot(m[0], m[1]), cons = consOf(n, o), ty = tyre(tq), sid2 = n.seed;
        const circle = (rr) => { const p = ellPts(0, 0, rr, rr, 0, -Math.PI / 2 - 0.3, Math.max(24, Math.round(rr / 4))); p.pop(); return p.map(W2); };
        if (cons) { out.push(mkStroke(circle(r), { kind: 'construct', w: 2.2, color: C0.blue, closed: true, static: false, seed: sid2 + 1, wob: 3 })); for (const a of [0, Math.PI / 2]) out.push(mkStroke([W2([Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08]), W2([-Math.cos(a) * r * 1.08, -Math.sin(a) * r * 1.08])], { kind: 'construct', w: 1.8, color: C0.blue, static: false, seed: sid2 + 2 + a })); }
        const rim = r - ty, sw = wood ? lw * 1.15 : lw * 0.42, stone = wood ? C0.lead : C0.soft, blur = n.spinAt(tq);
        // too fast to follow: the spokes thin out into a soft disc and a few arcs held still, as a hand draws a spinning wheel; the rim, the hub and the painted spot stay sharp, so its turns can still be counted
        if (blur > 0.01) { out.push(mkStroke(circle(rim), { kind: 'tone', color: C0.shade, alpha: 0.08 * blur, closed: true, static: false, seed: sid2 + 13, noWash: true })); [[0.42, 0.5], [0.62, 2.6], [0.8, 4.4]].forEach(([q, a0], i) => { const pts = Array.from({ length: 13 }, (_, k) => { const a = a0 + (k / 12) * 1.25; return W2([Math.cos(a) * rim * q, Math.sin(a) * rim * q]); }); out.push(mkStroke(pts, { kind: 'line', w: sw * sc, color: C0.soft, alpha: 0.75 * blur, static: false, seed: sid2 + 14 + i, passes: 1, noOver: true, noWash: true })); }); }
        for (let i = 0; i < nSp; i++) { const a = th + (i / nSp) * TAU; out.push(mkStroke([W2([Math.cos(a) * (o.hub ?? r * 0.05 + 6), Math.sin(a) * (o.hub ?? r * 0.05 + 6)]), W2([Math.cos(a) * rim, Math.sin(a) * rim])], { kind: 'line', w: sw * sc, color: stone, alpha: blur > 0.01 ? 1 - 0.72 * blur : undefined, static: false, seed: sid2 + 40 + i * 3, passes: 1, noOver: true, noWash: true, wob: 0.8 })); }
        out.push(mkStroke(circle(r), { kind: 'line', w: lw * sc, color: C0.lead, closed: true, static: false, seed: sid2 + 7, noWash: !o.washable }));
        if (ty > 0) { out.push(mkStroke(circle(rim), { kind: 'line', w: lw * 0.7 * sc, color: C0.lead, closed: true, static: false, seed: sid2 + 8, noWash: true })); out.push(mkStroke(circle(r - ty / 2), { kind: 'line', w: ty * 0.8 * sc, color: C0.shade, alpha: o.tyreAlpha ?? 0.42, closed: true, static: false, seed: sid2 + 9, passes: 1, taper: false, noWash: true })); }
        else if (wood || o.band) out.push(mkStroke(circle(r * 0.955), { kind: 'line', w: lw * 0.6 * sc, color: C0.soft, closed: true, static: false, seed: sid2 + 8, passes: 1, noWash: true }));
        const hb = ellPts(0, 0, o.hubR ?? Math.max(7, r * 0.045), o.hubR ?? Math.max(7, r * 0.045), 0, 0, 12); hb.pop(); out.push(mkStroke(hb.map(W2), { kind: 'line', w: lw * 0.8 * sc, color: C0.lead, closed: true, static: false, seed: sid2 + 10, noWash: true }));
        if (o.mark) { const mr = r - ty - Math.max(6, r * 0.04), c = [Math.cos(th) * mr, Math.sin(th) * mr], dot = ellPts(c[0], c[1], o.markR ?? 8, o.markR ?? 8, 0, 0, 10); dot.pop(); const wp = dot.map(W2); out.push(mkStroke(wp, { kind: 'tone', color: C0.lead, alpha: 0.9, closed: true, static: false, seed: sid2 + 11, noWash: true })); out.push(mkStroke(wp, { kind: 'line', w: 2.2 * sc, color: C0.lead, closed: true, static: false, seed: sid2 + 12, passes: 1, noWash: true })); }
        return out;
      };
      return n;
    };
    // D.crank({ x, y, len, turn, phase, pedal: width, twin: true (the arm opposite, lighter) }) → node with .pedalAt(t, side) on the sheet
    D.crank = (o = {}) => {
      const n = node('crank', o), L = o.len ?? 70, pw = o.pedal ?? 26, ph = o.phase ?? 0, lw = o.lw ?? 5;
      n.turnFn = fnOf(o.turn, 0);
      n.pedalAt = (t, side = 1) => onShaft(n, t, L, turnOf(n, Q(t)) + ph + (side < 0 ? Math.PI : 0));
      n.gen = (t) => {
        const tq = Q(t), m = worldM(n, tq), th = turnOf(n, tq) + ph, out = [], W2 = (p) => mapp(m, p), sc = Math.hypot(m[0], m[1]);
        const arm = (a, tone, w, id) => { const p = [Math.cos(a) * L, Math.sin(a) * L]; out.push(mkStroke([W2([0, 0]), W2(p)], { kind: 'line', w: w * sc, color: tone, static: false, seed: n.seed + id, noOver: true })); if (pw) out.push(mkStroke([W2([p[0] - pw, p[1]]), W2([p[0] + pw, p[1]])], { kind: 'line', w: w * 1.2 * sc, color: tone, static: false, seed: n.seed + id + 1, taper: false, noOver: true })); };
        if (o.twin !== false) arm(th + Math.PI, C0.soft, lw * 0.8, 3);
        arm(th, C0.lead, lw, 1);
        return out;
      };
      return n;
    };
    // D.sprocket({ x, y, teeth, pitch (units per tooth) | r, turn }): teeth really turn; D.chain joins two of them
    D.sprocket = (o = {}) => {
      const n = node('sprocket', o), T = o.teeth ?? 32, r = o.r ?? (T * (o.pitch ?? 5.2)) / TAU, lw = o.lw ?? 2.8;
      n.teeth = T; n.r = r; n.turnFn = fnOf(o.turn, 0);
      n.gen = (t) => {
        const tq = Q(t), m = worldM(n, tq), th = turnOf(n, tq), out = [], W2 = (p) => mapp(m, p), sc = Math.hypot(m[0], m[1]);
        const c = ellPts(0, 0, r, r, 0, -Math.PI / 2 - 0.3, Math.max(20, Math.round(r / 3))); c.pop();
        out.push(mkStroke(c.map(W2), { kind: 'line', w: lw * sc, color: C0.lead, closed: true, static: false, seed: n.seed + 1, noWash: true }));
        for (let i = 0; i < T; i++) { const a = th + (i / T) * TAU; out.push(mkStroke([W2([Math.cos(a) * r, Math.sin(a) * r]), W2([Math.cos(a) * (r + Math.max(4, r * 0.1)), Math.sin(a) * (r + Math.max(4, r * 0.1))])], { kind: 'line', w: Math.max(2.4, lw * 0.9) * sc, color: C0.lead, static: false, seed: n.seed + 10 + i, passes: 1, noOver: true, taper: false, noWash: true })); }
        for (let i = 0; i < (o.spokes ?? 5); i++) { const a = th + (i / (o.spokes ?? 5)) * TAU; out.push(mkStroke([W2([0, 0]), W2([Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92])], { kind: 'line', w: lw * 0.75 * sc, color: C0.soft, static: false, seed: n.seed + 200 + i, passes: 1, noOver: true, noWash: true })); }
        return out;
      };
      return n;
    };
    // D.chain({ a, b, spacing }): a chain over two sprockets in the same parent. b is geared to a: it turns a.teeth / b.teeth times per turn of a, always; links travel at a's rim speed. → node with .ratio and .turnB(t)
    D.chain = (o = {}) => {
      const a = o.a, b = o.b, n = node('chain', { ...o, in: o.in ?? a.parent, a: undefined, b: undefined }), ratio = a.teeth / b.teeth, spacing = o.spacing ?? 16, b0 = o.phase ?? 0;
      n.ratio = ratio; n.turnB = (t) => turnOf(a, t) * ratio + b0;
      b.turnFn = n.turnB;
      n.gen = (t) => {
        const tq = Q(t), A = [pv(a, 'x', tq, 0), pv(a, 'y', tq, 0)], B = [pv(b, 'x', tq, 0), pv(b, 'y', tq, 0)], m = n.parent ? worldM(n.parent, tq) : MI, W2 = (p) => mapp(m, p), sc = Math.hypot(m[0], m[1]);
        const dx = A[0] - B[0], dy = A[1] - B[1], Ld = Math.hypot(dx, dy) || 1, ux = dx / Ld, uy = dy / Ld, ra = a.r + 2, rb = b.r + 2, sb = cl((rb - ra) / Ld, -0.99, 0.99), cb = Math.sqrt(1 - sb * sb);
        // travel clockwise round the pair: along the upper tangent from b to a, round a, back along the lower tangent, round b
        const n1 = [uy * cb + ux * sb, -ux * cb + uy * sb], n2 = [-uy * cb + ux * sb, ux * cb + uy * sb];
        const ang = (v) => Math.atan2(v[1], v[0]), arc = (c, r, a0, a1) => { let d = a1 - a0; while (d < 0) d += TAU; const k = Math.max(4, Math.round((d * r) / 8)); return Array.from({ length: k + 1 }, (_, i) => [c[0] + Math.cos(a0 + (d * i) / k) * r, c[1] + Math.sin(a0 + (d * i) / k) * r]); };
        const up = [[B[0] + n1[0] * rb, B[1] + n1[1] * rb], [A[0] + n1[0] * ra, A[1] + n1[1] * ra]], lo = [[A[0] + n2[0] * ra, A[1] + n2[1] * ra], [B[0] + n2[0] * rb, B[1] + n2[1] * rb]];
        const path = [...up, ...arc(A, ra, ang(n1), ang(n2)).slice(1), ...lo.slice(1), ...arc(B, rb, ang(n2), ang(n1)).slice(1)];
        const R = resample(path, spacing / 3), L = R.L, out = [];
        out.push(mkStroke(up.map(W2), { kind: 'line', w: 2 * sc, color: C0.soft, static: false, seed: n.seed + 1, passes: 1, noOver: true, noWash: true }));
        out.push(mkStroke(lo.map(W2), { kind: 'line', w: 2 * sc, color: C0.soft, static: false, seed: n.seed + 2, passes: 1, noOver: true, noWash: true }));
        // the links: dark rollers carried round the loop at the front sprocket's rim speed
        const s0 = ((turnOf(a, tq) * a.r) % spacing + spacing) % spacing, nL = Math.floor(L / spacing), step = L / Math.max(1, R.p.length - 1);
        for (let i = 0; i < nL; i++) { const sv = (s0 + i * spacing) % L, j = Math.min(R.p.length - 2, Math.floor(sv / step)), p = R.p[j], q2 = R.p[j + 1], tl = Math.hypot(q2[0] - p[0], q2[1] - p[1]) || 1, tx = (q2[0] - p[0]) / tl, ty = (q2[1] - p[1]) / tl; out.push(mkStroke([W2([p[0] - tx * spacing * 0.3, p[1] - ty * spacing * 0.3]), W2([p[0] + tx * spacing * 0.3, p[1] + ty * spacing * 0.3])], { kind: 'line', w: 4.2 * sc, color: C0.lead, static: false, seed: n.seed + 5 + i, passes: 1, noOver: true, taper: false, noWash: true, wob: 0.4 })); }
        return out;
      };
      return n;
    };
    // D.link2({ from: [x, y] | fn(t), to: fn(t), a, b, bend: 1 | -1, lw }): two bars and a joint between them, solved from the two ends (a leg on a pedal, a linkage); points on the sheet, not in a parent
    D.link2 = (o = {}) => {
      const n = node('link2', o), fa = fnOf(o.from, [0, 0]), fb = fnOf(o.to, [0, 0]), a = o.a ?? 100, b = o.b ?? 100, sg = o.bend ?? 1, lw = o.lw ?? 3.4;
      n.gen = (t) => {
        const tq = Q(t), A = fa(tq), T = fb(tq), dx = T[0] - A[0], dy = T[1] - A[1], L = cl(Math.hypot(dx, dy) || 1, Math.abs(a - b) + 1, a + b - 0.5), ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1), xx = (a * a - b * b + L * L) / (2 * L), hh = Math.sqrt(Math.max(0, a * a - xx * xx));
        const J = [A[0] + ux * xx - uy * hh * sg, A[1] + uy * xx + ux * hh * sg], E2 = [A[0] + ux * L, A[1] + uy * L], tone = col(o.tone ?? 'lead');
        return [mkStroke([A, J], { kind: 'line', w: lw, color: tone, static: false, seed: n.seed + 1 }), mkStroke([J, E2], { kind: 'line', w: lw * 0.85, color: tone, static: false, seed: n.seed + 2 })];
      };
      return n;
    };
    // D.span({ x0, x1, y, label, at, until, tone }): a pencil dimension span along a line — two end ticks and the rule between them, the value lettered over it (how far one turn goes, how long a thing is)
    D.span = (o = {}) => {
      const until = o.until ?? 1e9, at = o.at ?? 0, y = o.y ?? 0, a = o.x0 ?? 0, b = o.x1 ?? 100, x1f = fnOf(o.x1, 100), tone = o.tone ?? 'lead';
      const dur = o.inDur ?? 0.7, n = D.live({ at, until, enter: 'none', layer: o.layer, z: o.z ?? 3, lintOk: true, in: o.in, construct: false, draw: (t, pen) => { const q = E.sine(cl((t - at) / dur)), x1 = lerp(a, x1f(t), q); pen.line([[a, y - 16], [a, y + 16]], { lw: 3, tone, construct: false }); pen.line([[a, y], [x1, y]], { lw: 2.6, tone, construct: false }); pen.line([[x1, y - 16], [x1, y + 16]], { lw: 3, tone, construct: false }); } });
      if (o.label) D.write(o.label, { x: (o.lx ?? (a + (typeof b === 'number' ? b : x1f(until < 1e8 ? until : at + dur))) / 2), y: y + (o.ly ?? -44), size: o.size ?? 56, at: at + dur * 0.5, until, guide: false, tone, kind: 'label', layer: o.layer });
      F.sfx(at, 'sketch', 0.3, { dur });
      return n;
    };

    // ---------- numerals: stroke-drawn, over two blue guidelines; a new value redraws itself out of the old one ----------
    const numerals = [];
    D.numeral = (o = {}) => {
      const n = node('numeral', { ...o, enter: o.enter ?? ((o.at ?? 0) > 0 ? 'draw' : 'none'), inDur: o.inDur ?? 0.9 });
      const size = o.size ?? 200, lw = o.lw ?? Math.max(4, size * 0.045), mdur = o.morph ?? 0.55, align = o.align ?? 'center';
      const keys = (o.keys || (o.value !== undefined ? [[o.at ?? 0, String(o.value)]] : [])).map(([t, v]) => [t, String(v)]).sort((a, b) => a[0] - b[0]);
      n.keysN = keys;
      const glyphAt = (str) => (n._g ??= new Map()).get(str) ?? n._g.set(str, glyphStrokes(str, size, align)).get(str);
      const pairsOf = (i) => (n._p ??= new Map()).get(i) ?? n._p.set(i, pairUp(glyphAt(keys[i - 1][1]).list.map((s) => ({ pts: s.pts, closed: s.closed })), glyphAt(keys[i][1]).list.map((s) => ({ pts: s.pts, closed: s.closed })))).get(i);
      const valueAt = (t) => { if (o.count) { const c = o.count, q = cl((t - c.a) / (c.b - c.a)), v = lerp(c.from ?? 0, c.to, (c.ease ?? E.quartOut)(q)); return (c.fmt ?? ((x) => String(Math.round(x))))(v); } let i = -1; for (let j = 0; j < keys.length; j++) if (keys[j][0] <= t) i = j; return i; };
      for (const [t, v] of keys) { if (o.noFact !== true) F.fact(v, t, o.until); if (t > (o.at ?? 0) + 0.05) F.sfx(t, 'tick', 0.35); }
      if (o.count) { F.fact(o.count.fmt ? o.count.fmt(o.count.to) : String(o.count.to), o.count.b, o.until); for (let t = o.count.a; t < o.count.b; t += 1 / 6) F.sfx(t, 'tick', 0.12); }
      const guide = o.guide !== false;
      n.gen = (t) => {
        const tq = Q(t), m = worldM(n, tq), out = [], tone = col(o.tone ?? 'lead');
        let strokes, mq = 1, pair = null;
        if (o.count) strokes = glyphAt(valueAt(tq)).list;
        else { const i = valueAt(tq); if (i < 0) return out; if (i > 0 && tq < keys[i][0] + mdur) { pair = pairsOf(i); mq = inOut((tq - keys[i][0]) / mdur); } else strokes = glyphAt(keys[i][1]).list; }
        if (guide) { const gw = glyphAt(o.count ? valueAt(tq) : keys[Math.max(0, valueAt(tq))][1]).w * 0.6 + size * 0.5, x0 = align === 'left' ? -size * 0.15 : align === 'right' ? -gw * 1.6 : -gw; for (const yy of [-size * 0.5, size * 0.5]) out.push(mkStroke([mapp(m, [x0, yy]), mapp(m, [x0 + gw * 2, yy])], { kind: 'construct', w: 1.6, color: C0.blue, seed: n.seed + (yy > 0 ? 3 : 4), static: false })); }
        if (pair) pair.forEach(([a, b], k) => { const pts = a.p.map((p, j) => mapp(m, [lerp(p[0], b.p[j][0], mq), lerp(p[1], b.p[j][1], mq) - Math.sin(Math.PI * mq) * size * 0.06])); out.push(mkStroke(pts, { kind: 'construct', w: 1.8, color: C0.blue, alpha: Math.sin(Math.PI * mq), static: false, seed: n.seed + k * 7 + 1, wob: 2.4 })); out.push(mkStroke(pts, { kind: 'line', w: lw * (a.collapse ? 1 - mq * 0.6 : b.collapse ? 0.4 + 0.6 * (1 - mq) : 1), color: tone, static: false, seed: n.seed + k * 7 })); });
        else strokes.forEach((s, k) => out.push(mkStroke(s.pts.map((p) => mapp(m, p)), { kind: 'line', w: lw, color: tone, closed: s.closed, static: false, seed: n.seed + k * 7 + (o.count ? hashS(valueAt(tq)) : 0) })));
        return out;
      };
      numerals.push(n);
      return n;
    };

    // ---------- information, the pencil way ----------
    // timing chart: a ruled line drawn on across the sheet, a short tick per key with its number circled in pencil, small breakdown ticks between keys,
    // the key's label written over it (and a sub line under). Steps, a timeline, a career. → positions [{ x, y }]
    D.timing = (o = {}) => {
      const keys = o.keys || [], k = keys.length, x = o.x ?? 0, y = o.y ?? 0, w = o.w ?? 1400, until = o.until ?? 1e9, gap = k > 1 ? w / (k - 1) : 0, T = o.T || keys.map((_, i) => (o.at ?? 0) + i * (o.every ?? 1.5));
      const g = D.group({ at: T[0] - 0.6, until, enter: 'none', z: o.z ?? 0, layer: o.layer, lintOk: true });
      const pos = keys.map((_, i) => ({ x: x + (o.xs ? o.xs[i] : gap * i), y }));
      // the rule reaches each key as it lands
      pos.forEach((p, i) => { const a = i ? pos[i - 1].x : x - 40, b = i === k - 1 ? p.x + 40 : p.x; D.line({ in: undefined, pts: [[a, y], [b, y]], lw: 3, at: T[i] - 0.55, until, enter: 'draw', inDur: 0.5, z: o.z, layer: o.layer, sfx: false }); if (i) for (let j = 1; j <= 3; j++) { const bx = lerp(pos[i - 1].x, p.x, j / 4); D.line({ pts: [[bx, y - 10], [bx, y + 10]], lw: 1.8, tone: 'soft', at: T[i] - 0.5 + j * 0.08, until, enter: 'draw', inDur: 0.15, z: o.z, layer: o.layer, construct: false }); } });
      keys.forEach((kk, i) => {
        const p = pos[i], up = o.below ? false : o.alt ? i % 2 === 0 : true, t0 = T[i];
        D.line({ pts: [[p.x, y - 26], [p.x, y + 26]], lw: 3.6, at: t0 - 0.1, until, enter: 'draw', inDur: 0.2, z: o.z, layer: o.layer, construct: false });
        D.circle({ cx: p.x, cy: y, r: o.r ?? 22, lw: 2.6, tone: kk.hot ? 'accent' : 'lead', at: t0, until, enter: 'draw', inDur: 0.35, z: o.z, layer: o.layer, construct: false, wash: kk.hot ? 0.6 : 0 });
        F.sfx(t0, 'tap', 0.4);
        const ls = o.size ?? (PT ? 44 : 46);
        if (kk.label) D.write(kk.label, { x: p.x, y: up ? y - 58 - ls * 0.5 : y + 58 + ls * 0.5, size: ls, at: t0 + 0.1, until, layer: o.layer, kind: 'label', tone: kk.hot ? 'accent' : 'lead', wrap: o.wrap });
        if (kk.sub) D.write(kk.sub, { x: p.x, y: up ? y + 56 + ls * 0.4 : y - 56 - ls * 0.4, size: ls * 0.72, at: t0 + 0.35, until, layer: o.layer, kind: 'label', tone: 'soft', guide: false, wrap: o.wrap });
      });
      g.pos = pos;
      return pos;
    };
    // onion skin: a sequence of drawings, one per step; when the next arrives the earlier ones turn into light blue roughs (the animator's onion skin)
    D.onion = (o = {}) => {
      const n = o.n ?? (o.items ? o.items.length : 3), T = o.T || Array.from({ length: n }, (_, i) => (o.at ?? 0) + i * (o.every ?? 1.2)), until = o.until ?? 1e9, out = [];
      for (let i = 0; i < n; i++) {
        const g = D.group({ x: (o.x ?? 0) + (o.dx ?? 0) * i, y: (o.y ?? 0) + (o.dy ?? 0) * i, at: T[i], until, enter: 'draw', inDur: o.inDur ?? 0.8, ghostAt: o.keep ? undefined : i < n - 1 ? T[i + 1] : undefined, z: (o.z ?? 0) + i, layer: o.layer });
        if (o.draw) o.draw(g, i, T[i]);
        F.sfx(T[i], 'sketch', 0.35, { dur: 0.8 });
        out.push(g);
      }
      return out;
    };
    // rough vs clean-up: each side starts as a blue rough; the side that wins is cleaned up (graphite over the rough) and may bloom; the other stays rough
    D.versus = (o = {}) => {
      const sides = o.sides || [], T = o.T || sides.map((_, i) => (o.at ?? 0) + i * 1.2), until = o.until ?? 1e9, k = sides.length, x = o.x ?? 0, y = o.y ?? 0, w = o.w ?? 1300, h = o.h ?? 560, stack = o.stack ?? (PT && w < h * 1.3);
      const cw = stack ? w : w / k, ch = stack ? h / k : h, hotT = o.hotAt ?? T[k - 1] + 1.4, res = [];
      // a pencil fold line between the sides (a ruled line, not a box)
      if (k > 1) for (let i = 1; i < k; i++) { const fx = stack ? x - w / 2 : x - w / 2 + cw * i, fy = stack ? y - h / 2 + ch * i : y - h / 2; D.line({ pts: stack ? [[fx + 30, fy], [fx + w - 30, fy]] : [[fx, fy + 20], [fx, fy + h - 20]], lw: 2, tone: 'soft', at: T[0] - 0.4, until, enter: 'draw', inDur: 0.6, layer: o.layer, construct: true }); }
      sides.forEach((sd, i) => {
        const cx = stack ? x : x - w / 2 + cw * (i + 0.5), cy = stack ? y - h / 2 + ch * (i + 0.5) : y, hot = !!sd.hot;
        const g = D.group({ x: cx, y: cy + (stack ? ch * 0.08 : ch * 0.1), at: T[i], until, enter: 'draw', inDur: 1.0, clean: hot ? hotT : false, layer: o.layer, z: o.z });
        if (sd.draw) sd.draw(g, i);
        const ts = o.size ?? (PT ? 50 : 54);
        if (sd.title) D.write(sd.title, { x: cx, y: cy - ch / 2 + ts * 0.9, size: ts, at: T[i] + 0.2, until, layer: o.layer, kind: 'label', tone: hot ? 'lead' : 'soft' });
        (sd.points || []).forEach((pt, r) => D.write(pt, { x: cx, y: cy + ch / 2 - (sd.points.length - r) * ts * 0.95, size: ts * 0.66, at: (o.at2 ? o.at2(i, r) : T[i] + 0.6 + r * 0.5), until, layer: o.layer, kind: 'label', tone: 'soft', guide: false }));
        if (hot) { D.bloom(hotT + 0.5, { on: g, until }); D.ring({ on: g, at: hotT + 0.2, until, tone: 'accent', pad: 30 }); }
        res.push({ x: cx, y: cy, g });
      });
      return res;
    };
    // tally marks: counted out one by one in gates of five (n marks; or count(t))
    D.tally = (o = {}) => {
      const nMax = o.n ?? 10, size = o.size ?? 90, gap = size * 0.22, per = o.perRow ?? 5, at = o.at ?? 0, every = o.every ?? 0.18, T = o.T || Array.from({ length: nMax }, (_, i) => at + i * every);
      const g = D.group({ x: o.x ?? 0, y: o.y ?? 0, at: T[0] - 0.05, until: o.until, enter: 'none', z: o.z, layer: o.layer, lintOk: true });
      const gw = gap * 4 + size * 0.45;
      for (let i = 0; i < nMax; i++) {
        const gate = Math.floor(i / 5), j = i % 5, row = Math.floor(gate / per), gx = (gate % per) * gw, gy = row * size * 1.35, r0 = rnd(g.seed, i);
        const pts = j < 4 ? [[gx + j * gap + (r0 - 0.5) * 6, gy - size / 2], [gx + j * gap + (r0 - 0.5) * 10, gy + size / 2]] : [[gx - gap * 0.6, gy + size * 0.32], [gx + gap * 3.7, gy - size * 0.3]];
        D.line({ in: g, pts, lw: o.lw ?? 4.2, at: T[i], enter: 'draw', inDur: 0.16, construct: false, tone: o.hot && i === nMax - 1 ? 'accent' : 'lead' });
        F.sfx(T[i], 'tap', 0.3);
      }
      F.fact(String(nMax), T[nMax - 1], o.until);
      g.w = (Math.min(per, Math.ceil(nMax / 5)) * gw); g.h = Math.ceil(Math.ceil(nMax / 5) / per) * size * 1.35;
      return g;
    };
    // growth marks on a post: a pencil tick across a door-frame post per item, height for value, the value and label written beside it, bottom up
    D.marks = (o = {}) => {
      const items = o.items || [], x = o.x ?? 0, y = o.y ?? 0, h = o.h ?? 600, max = o.max ?? Math.max(...items.map((it) => +it.value)) * 1.08, until = o.until ?? 1e9, T = o.T || items.map((_, i) => (o.at ?? 0) + 0.8 + i * (o.every ?? 1.1));
      D.line({ pts: [[x - 22, y], [x - 22, y - h - 40]], lw: 3.6, at: (o.at ?? T[0] - 0.8), until, enter: 'draw', inDur: 0.7, layer: o.layer, z: o.z });
      D.line({ pts: [[x + 22, y], [x + 22, y - h - 40]], lw: 2.6, at: (o.at ?? T[0] - 0.8) + 0.15, until, enter: 'draw', inDur: 0.7, layer: o.layer, z: o.z, shade: 0 });
      const pos = [];
      items.forEach((it, i) => {
        const yy = y - (h * +it.value) / max, t0 = T[i], hot = !!it.hot, side = o.side ?? 1;
        D.line({ pts: [[x - 34, yy], [x + 40 + 50 * side, yy]], lw: 4, tone: hot ? 'accent' : 'lead', at: t0, until, enter: 'draw', inDur: 0.25, construct: false, layer: o.layer, z: o.z });
        const ts = o.size ?? 46;
        D.write(`${o.prefix ?? ''}${it.value}${o.unit ?? ''}`, { x: x + side * 110, y: yy - ts * 0.15, size: ts * 1.1, align: side > 0 ? 'left' : 'right', at: t0 + 0.2, until, layer: o.layer, kind: 'label', tone: hot ? 'accent' : 'lead', guide: false });
        if (it.label) D.write(it.label, { x: x - side * 70, y: yy, size: ts * 0.72, align: side > 0 ? 'right' : 'left', at: t0 + 0.4, until, layer: o.layer, kind: 'label', tone: 'soft', guide: false });
        F.sfx(t0, 'tap', 0.4);
        pos.push({ x, y: yy });
      });
      return pos;
    };
    // a note in the margin: handwritten, with a quick looping leader towards what it is about (a pencil gesture, not an arrow)
    D.note = (text, o = {}) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, tg = o.on ? centerOf(o.on, at + 0.5) : [o.tx ?? 0, o.ty ?? 0], nx = o.x ?? tg[0] + (o.dx ?? 260), ny = o.y ?? tg[1] + (o.dy ?? -160), size = o.size ?? 44;
      const tw = Math.min(units(text) * size, o.wrap ?? 1e9), sx = nx + (nx > tg[0] ? -tw / 2 - 16 : tw / 2 + 16), mx2 = (sx + tg[0]) / 2 + (ny - tg[1]) * 0.18, my2 = (ny + tg[1]) / 2 - (sx - tg[0]) * 0.12;
      D.write(text, { x: nx, y: ny, size, at, until, layer: o.layer, kind: o.kind ?? 'label', tone: o.tone ?? 'lead', wrap: o.wrap, screen: o.screen });
      const r = o.r ?? 18, end = [tg[0] + (sx > tg[0] ? r * 2 : -r * 2), tg[1] - r];
      D.line({ pts: [[sx, ny + size * 0.2], [mx2, my2], end], smooth: true, lw: 2.4, at: at + 0.3, until, enter: 'draw', inDur: 0.35, construct: false, layer: o.layer, z: o.z ?? 4 });
      return { x: nx, y: ny };
    };
    // a loose double loop around something (emphasis), graphite or the accent
    D.ring = (o = {}) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, bb = o.on ? wbox(o.on, at + 0.6) : { x: (o.x ?? 0) - (o.w ?? 120) / 2, y: (o.y ?? 0) - (o.h ?? 120) / 2, w: o.w ?? 120, h: o.h ?? 120 }, pad = o.pad ?? 24;
      const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2, rx = bb.w / 2 + pad, ry = bb.h / 2 + pad, pts = [];
      for (let i = 0; i <= 64; i++) { const a = -2.2 + (i / 64) * TAU * 1.12, w = 1 + 0.06 * Math.sin(i * 0.4); pts.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w * (1 + i / 640)]); }
      F.sfx(at, 'sketch', 0.4, { dur: 0.4 });
      return D.line({ pts, lw: o.lw ?? 3.6, tone: o.tone ?? 'lead', at, until, enter: 'draw', inDur: 0.45, construct: false, z: o.z ?? 5, layer: o.layer, sfx: false });
    };

    // ---------- the light: a pool of light in a graphite haze (multiply) ----------
    const lights = [];
    D.light = (o = {}) => { const L = { at: o.at ?? 0, until: o.until ?? 1e9, o, fade: o.fade ?? 0.8 }; lights.push(L); return L; };
    const hazePat = () => { const p = patOf(lx, 'haze', () => grainTile(C0.haze, SEED ^ 99)); return p; };
    const drawLight = (t, cam) => {
      if (!lx) return;
      lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, W, H);
      const k = cam.z * U;
      for (const L of lights) {
        if (t < L.at || t >= L.until) continue;
        const qa = smooth((t - L.at) / L.fade) * (L.until < 1e8 ? smooth((L.until - t) / L.fade) : 1), o = L.o;
        const c = o.on ? centerOf(o.on, Q(t)) : [o.x ?? 0, o.y ?? 0], sx = (c[0] - cam.x) * k + W / 2 + (o.dx ?? 0) * k, sy = (c[1] - cam.y) * k + H / 2 + (o.dy ?? 0) * k, r = (o.r ?? 420) * k;
        lx.save(); lx.globalAlpha = qa * (o.dark ?? 0.55); lx.fillStyle = hazePat(); lx.fillRect(0, 0, W, H); lx.restore();
        lx.save(); lx.globalCompositeOperation = 'destination-out'; lx.globalAlpha = qa;
        const g = lx.createRadialGradient(sx, sy, r * 0.25, sx, sy, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        lx.fillStyle = g; lx.beginPath(); lx.ellipse(sx, sy, r * (o.wide ?? 1), r, 0, 0, TAU); lx.fill();
        if (o.cone) { lx.filter = `blur(${f1(r * 0.07)}px)`; lx.beginPath(); lx.moveTo(sx - r * 0.25, 0); lx.lineTo(sx + r * 0.25, 0); lx.lineTo(sx + r * 0.85, sy); lx.lineTo(sx - r * 0.85, sy); lx.closePath(); const g2 = lx.createLinearGradient(0, 0, 0, sy); g2.addColorStop(0, 'rgba(0,0,0,0.5)'); g2.addColorStop(1, 'rgba(0,0,0,0.85)'); lx.fillStyle = g2; lx.fill(); lx.filter = 'none'; }
        lx.restore();
      }
    };

    // ---------- lettering (DOM): blue guidelines ruled first, then the words written on left to right in graphite ----------
    const texts = [];
    D.write = (text, o = {}) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, screen = !!o.screen, size = (o.size ?? 64) * (FLAT || screen ? U : 1), parent = FLAT ? o.layer ?? curLayer ?? hud : screen ? hud : wl;
      const e = el('div', `left:0;top:0;display:none;white-space:${o.wrap ? 'normal' : 'nowrap'};${o.wrap ? `width:${o.wrap * (FLAT || screen ? U : 1)}px;` : ''}font:${o.weight ?? 700} ${size}px/1.25 ${FONT.hand};color:${o.tone === 'accent' ? mixHex(C0.accent, C0.lead, 0.42) : col(o.tone ?? 'lead')};text-align:${o.align ?? 'center'};letter-spacing:.03em;pointer-events:none;filter:url(#pencil-rough);-webkit-mask-image:url(${grainUrl});-webkit-mask-size:${f1(192 * Math.max(1, U) * 0.5)}px;${FLAT ? 'z-index:4;' : ''}`, parent);
      e.textContent = text;
      const T = { e, o, at, until, text, screen, enter: o.enter ?? (at > 0 ? 'write' : 'none') };
      F.text(e, o.kind ?? ((o.size ?? 64) >= 60 ? 'headline' : 'label'), o.fact ?? text, at, until, { noFact: !!o.noFact, chrome: !!o.chrome, bleed: !!o.bleed });
      if (at > 0 && o.sfx !== false) F.sfx(at, 'sketch', 0.32, { dur: Math.min(1.4, 0.3 + units(text) * 0.08) });
      // guidelines: two blue rules at the cap height and the baseline, ruled just before the words (world text only: they are pencil on the sheet)
      if (o.guide !== false && !screen && at > 0 && typeof o.x !== 'function' && typeof o.y !== 'function') {
        const tw = Math.min(units(text) * (o.size ?? 64), o.wrap ?? 1e9), x0 = (o.align === 'left' ? o.x : o.align === 'right' ? o.x - tw : o.x - tw / 2) - 24, sz = o.size ?? 64;
        for (const yy of [-sz * 0.42, sz * 0.46]) D.line({ pts: [[x0, (o.y ?? 0) + yy], [x0 + tw + 48, (o.y ?? 0) + yy + (rnd(hashS(text), yy > 0 ? 1 : 2) - 0.5) * 3]], kind: 'construct', lineOnly: true, line: false, construct: true, lw: 2.6, at: at - 0.35, until, enter: 'draw', inDur: 0.3, exit: 'fade', z: -5, sfx: false, consTone: 'blue', noOver: true, isGuide: true });
      }
      texts.push(T);
      return T;
    };
    D.title = D.write;
    const textFrame = (t) => {
      for (const T of texts) {
        const on = t >= T.at && t < T.until; set(T.e, { display: on ? '' : 'none' }); if (!on) continue;
        const tp = FLAT || T.screen ? t : Q(t);   // lettering on the sheet travels with the drawings and the camera; on ones it would saw against them
        let x = fnOf(T.o.x, 0)(tp), y = fnOf(T.o.y, 0)(tp); if (T.o.on) { const c = centerOf(T.o.on, Q(t)); x += c[0]; y += c[1]; }
        if (FLAT || T.screen) { x *= U; y *= U; }
        const dur = T.o.inDur ?? Math.min(1.4, 0.3 + units(T.text) * 0.08), qi = T.enter === 'none' ? 1 : cl((t - T.at) / dur), qo = T.until < 1e8 ? cl((t - (T.until - 0.35)) / 0.35) : 0, ox = T.o.align === 'left' ? 0 : T.o.align === 'right' ? -100 : -50;
        set(T.e, { transform: `translate(${f1(x)}px,${f1(y)}px) translate(${ox}%,-50%) translateX(${f1(qo * 6)}px)`, clipPath: T.enter === 'write' && qi < 1 ? `inset(-30% ${f1((1 - E.sine(qi)) * 100)}% -30% -5%)` : '', opacity: String(1 - qo * 0.95), filter: qo > 0 ? `url(#pencil-rough) blur(${f1(qo * 2.5)}px)` : 'url(#pencil-rough)' });
      }
    };

    // ---------- boxes and centres ----------
    const wbox = (n, t) => {
      if (n.fig) { const J = n.fig.joints(Q(t)), pts = ['headC', 'haL', 'haR', 'ftL', 'ftR', 'pel', 'chest', 'elL', 'elR', 'knL', 'knR'].map((k2) => n.fig.pr(J[k2])), r = DIM.hr * n.fig.S * 1.3; const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return { x: Math.min(...xs) - r, y: Math.min(...ys) - r, w: Math.max(...xs) - Math.min(...xs) + 2 * r, h: Math.max(...ys) - Math.min(...ys) + 2 * r }; }
      const list = []; const walk = (m) => { for (const s of ownStrokes(m, t)) list.push(s); for (const k2 of m.kids) walk(k2); }; walk(n);
      return bboxOf(list) || (() => { const p = posAt(n, t); return { x: p[0], y: p[1], w: 1, h: 1 }; })();
    };
    const centerOf = (n, t) => { if (Array.isArray(n)) return n; if (n.fig) return n.fig.pelAt(t); const b = wbox(n, t); return [b.x + b.w / 2, b.y + b.h / 2]; };
    D.box = (n, t) => wbox(n, t ?? Math.max(0, effAt(n)));
    D.center = centerOf;

    // ---------- camera: holds and breathes, pushes in, travels; follows a moving figure with a little lag and a little lead ----------
    const keys = [];
    const DEF = { x: 0, y: PT ? -300 : -280, z: 1 };
    const bandOf = () => { const top = H * (PT ? 0.12 : 0.08), bot = H * (PT ? 0.74 : 0.84); return { top, bot, cy: (top + bot) / 2, h: bot - top, w: W * 0.9 }; };
    const resolve = (v, t) => {
      if (!v) return { ...DEF };
      if (v.on) {
        const bs = [].concat(v.on).map((x2) => (x2 && (x2.kind || x2.fig) ? wbox(x2, Math.max(t, effAt(x2))) : x2)).filter(Boolean);
        const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y)), x1 = Math.max(...bs.map((b) => b.x + b.w)), y1 = Math.max(...bs.map((b) => b.y + b.h));
        const pad = v.pad ?? 1.3, Bd = bandOf(), z = v.z ?? cl(Math.min(Bd.w / ((x1 - x0) * pad * U), Bd.h / ((y1 - y0) * pad * U)), v.zmin ?? 0.3, v.zmax ?? 2.4), kk = z * U;
        return { x: (x0 + x1) / 2 + (v.dx ?? 0), y: (y0 + y1) / 2 - (Bd.cy - H / 2) / kk + (v.dy ?? 0), z };
      }
      return { x: v.x ?? DEF.x, y: v.y ?? DEF.y, z: v.z ?? 1 };
    };
    let kseq = 0;
    D.cam = (t, view, ease) => { keys.push({ a: t, b: t, view, ease: ease ?? E.cubicInOut, i: ++kseq }); memo.clear(); fromMemo.clear(); return D; };
    D.move = (a, b, view, ease) => { keys.push({ a, b: Math.max(b, a + 0.05), view, ease: ease ?? E.sine, i: ++kseq }); memo.clear(); fromMemo.clear(); if (b - a > 1 && view && view.sfx !== false) F.sfx(a, 'swish', 0.18, { dur: b - a }); return D; };
    // follow a figure / node from a to b: the camera trails it (lag s) and leans into where it is going (lead), easing in from wherever it was
    D.follow = (a, b, target, o = {}) => { keys.push({ a, b, follow: target, fo: { lag: 0.45, lead: 0.35, ease: 0.8, ...o }, ease: E.sine, i: ++kseq }); memo.clear(); fromMemo.clear(); return D; };
    const followAt = (kf, t) => {
      const o = kf.fo, dt = 1 / 15, N = Math.max(1, Math.round((o.lag * 3) / dt)), tg = kf.follow, z = o.z ?? 1;
      const pos = (tt) => (tg.fig ? tg.fig.pelAt(tt) : centerOf(tg, tt));
      let sx = 0, sy = 0, sw = 0; for (let i = 0; i <= N; i++) { const tt = Math.max(kf.a, t - i * dt), w = Math.exp((-i * dt) / Math.max(0.05, o.lag)), p = pos(tt); sx += p[0] * w; sy += p[1] * w; sw += w; }
      const p0 = pos(t), p1 = pos(Math.max(kf.a, t - 0.3)), Bd = bandOf(), kk = z * U;
      return { x: sx / sw + (p0[0] - p1[0]) * o.lead + (o.dx ?? 0), y: sy / sw + (p0[1] - p1[1]) * o.lead * 0.3 + (o.dy ?? 0) - (Bd.cy - H / 2) / kk - (tg.fig ? tg.fig.S * 0.1 : 0), z };
    };
    const DRIFT = opt.drift ?? 0.005;
    const memo = new Map(), fromMemo = new Map();
    const held = (k2, t) => { const v = k2.follow ? followAt(k2, k2.b) : memo.get(k2) ?? memo.set(k2, resolve(k2.view, k2.b)).get(k2), dt = Math.max(0, t - k2.b), z = v.z * (1 + Math.min(0.05, DRIFT * dt)); return { x: v.x + Math.sin(dt * 0.3) * 4, y: v.y + Math.sin(dt * 0.23) * 2, z }; };
    const camAt = (t, lim = null) => {
      let gov = null;
      for (const k2 of keys) { if (lim && (k2 === lim || k2.a > lim.a || (k2.a === lim.a && k2.i > lim.i))) continue; if (k2.a <= t && (!gov || k2.a > gov.a || (k2.a === gov.a && k2.i > gov.i))) gov = k2; }
      if (!gov) return { ...DEF, z: DEF.z * (1 + Math.min(0.05, DRIFT * t)) };
      if (t >= gov.b) return held(gov, t);
      const from = fromMemo.get(gov) ?? fromMemo.set(gov, camAt(gov.a, gov)).get(gov);
      if (gov.follow) { const f = followAt(gov, t), q = smooth((t - gov.a) / gov.fo.ease); return { x: lerp(from.x, f.x, q), y: lerp(from.y, f.y, q), z: Math.exp(lerp(Math.log(from.z), Math.log(f.z), q)) }; }
      const to = held(gov, gov.b), q = gov.ease(cl((t - gov.a) / (gov.b - gov.a))), z = Math.exp(lerp(Math.log(from.z), Math.log(to.z), q));
      return { x: lerp(from.x, to.x, q), y: lerp(from.y, to.y, q), z };
    };
    D.camAt = camAt;
    const camCss = (v) => { const k2 = v.z * U; return `matrix(${k2.toFixed(5)},0,0,${k2.toFixed(5)},${(W / 2 - v.x * k2).toFixed(2)},${(H / 2 - v.y * k2).toFixed(2)})`; };
    const inView = (v, x, y) => { const k2 = v.z * U, sx2 = (x - v.x) * k2 + W / 2, sy2 = (y - v.y) * k2 + H / 2; return sx2 > 0 && sx2 < W && sy2 > 0 && sy2 < H; };

    // ---------- render one root drawing: entrance (draw on), exit (erase sweep / fade), ghost (onion skin), clean (rough first) ----------
    const ghostOf = (n, t) => ancestors(n).some((a) => a.o.ghostAt !== undefined && t >= a.o.ghostAt);
    const cleanOf = (n) => { for (const a of ancestors(n)) if (a.o.clean !== undefined) return a.o.clean; return undefined; };
    const renderNode = (ctx, n, t, bk) => {
      if (!visible(n, t)) return;
      for (const on of n.onions || []) if (t >= on.a && t < on.b) for (let i = on.n; i >= 1; i--) { const tp = t - i * on.every; if (tp < on.a) continue; for (const it of collect(n, tp, [], true)) if (it.s.kind === 'line') drawStroke(ctx, { ...it.s, kind: 'construct', color: C0.blue, w: Math.max(1.6, it.s.w * 0.6), passes: 1, static: false, _r: undefined, _c: undefined, alpha: on.alpha * (1 - i / (on.n + 1)) }, bk, 1, 1); }
      const items = collect(n, t, [], false);
      // children with their own entrance: their own drawings
      const own = n.kids.filter((k2) => k2.at >= 0);
      let q = 1; if (n.enter === 'draw' || n.enter === 'fade') q = n.inDur ? cl((t - n.at) / n.inDur) : 1;
      const qo = n.until < 1e8 && n.exit !== 'none' ? cl((t - (n.until - n.outDur)) / n.outDur) : 0;
      let list = items;
      if (n.enter === 'draw' && q < 1) { allot(list); }
      const cln = cleanOf(n), gh = ghostOf(n, t);
      // the accent wash
      const wash = [...bloomStrokes(n, t, items)];
      for (const a of ancestors(n).slice(1)) if (a.blooms.length) wash.push(...bloomStrokes(a, t, items));
      let clip = null;
      if (qo > 0 && n.exit === 'erase') { const bb = bboxOf(list.map((it) => it.s)); if (bb) { clip = new Path2D(); const ex = bb.x + bb.w * E.sine(qo) * 1.05 - 10; clip.rect(ex, bb.y - 60, bb.x + bb.w - ex + 80, bb.h + 120); } }
      if (clip) { ctx.save(); ctx.clip(clip); }
      const fadeA = n.enter === 'fade' ? q : 1, outA = n.exit === 'fade' ? 1 - qo : 1;
      let tint = 0; for (const a of ancestors(n)) for (const b of a.blooms) if (t >= b.at && t < b.until) tint = Math.max(tint, (b.lines ?? 1) * b.amount * smooth((t - b.at) / b.dur) * (b.until < 1e8 ? 1 - smooth((t - (b.until - 0.6)) / 0.6) : 1));
      for (const it of [...wash, ...list]) {
        let s = it.s, prog = 1, a = it.a * fadeA * outA;
        if (n.enter === 'draw' && q < 1 && it.r0 !== undefined) prog = progOf(it, q);
        if (gh) { if (s.kind === 'line') s = { ...s, kind: 'construct', color: C0.blue, alpha: (s.alpha ?? 1) * 0.6, _c: s._c ? (s._gc ??= new Map()) : undefined }; else if (s.kind !== 'construct') continue; }
        else if (cln !== undefined && cln !== null && s.kind !== 'construct' && !s.isGuide) { if (cln === false || t < cln) continue; const qc = cl((t - cln) / 0.9); if (qc < 1) prog = Math.min(prog, s.kind === 'line' ? qc : cl(qc * 2 - 1)); }
        if (prog <= 0) continue;
        if (tint > 0.01 && s.kind === 'line') s = { ...s, color: mixHex(s.color, C0.accent, Math.min(0.9, tint)) };
        drawStroke(ctx, s, bk, prog, a);
      }
      if (clip) { ctx.restore(); const bb = bboxOf(list.map((it) => it.s)); if (bb && qo < 1) { ctx.globalAlpha = 0.07 * (1 - qo); ctx.fillStyle = grainPat(ctx, C0.shade); ctx.fillRect(bb.x, bb.y, bb.w * E.sine(qo), bb.h); } }
      for (const k2 of own.slice().sort((p, q2) => p.z - q2.z)) renderNode(ctx, k2, t, bk);
    };

    // ---------- the sheet: peg holes and the drawing number of a pencil test (screen-fixed) ----------
    const sheet = opt.sheet !== false && !FLAT;
    const drawSheet = (t) => {
      if (!hx) return;
      hx.setTransform(1, 0, 0, 1, 0, 0); hx.clearRect(0, 0, W, H);
      if (!sheet) return;
      const cx = W / 2, cy = H * (PT ? 0.035 : 0.045), r = F.px(PT ? 15 : 13);
      hx.fillStyle = mixHex(C0.paper, C0.shade, 0.38);
      hx.beginPath(); hx.arc(cx - F.px(120), cy, r, 0, TAU); hx.fill(); hx.beginPath(); hx.arc(cx + F.px(120), cy, r, 0, TAU); hx.fill();
      hx.beginPath(); hx.ellipse(cx, cy, r * 2.2, r * 0.95, 0, 0, TAU); hx.fill();
      // the drawing number, top right: stroke-drawn digits, light graphite, changes every drawing
      const tq = Q(t), num = String(Math.floor(tq * FPSD) + 1).padStart(4, '0'), sz = F.px(PT ? 30 : 28), g = glyphStrokes(num, sz, 'right');
      patM = new DOMMatrix();
      for (const s of g.list) drawStroke(hx, mkStroke(s.pts.map((p) => [W - W * 0.04 + p[0], cy + p[1]]), { kind: 'line', w: F.px(2.2), color: C0.soft, closed: s.closed, static: false, seed: 31 + s.ci, passes: 1 }), bkOf(tq), 1, 0.65);
      const lx2 = W - W * 0.04 - g.w - F.px(22); drawStroke(hx, mkStroke([[lx2 - F.px(40), cy + sz * 0.5], [lx2, cy + sz * 0.5]], { kind: 'line', w: F.px(2), color: C0.soft, static: false, seed: 77, passes: 1 }), bkOf(tq), 1, 0.5);
    };

    // ---------- render ----------
    const sorted = (L) => L.slice().sort((p, q) => p.z - q.z || p.id - q.id);
    if (!FLAT) {
      F.add((t) => {
        // the camera is on the same exposure sheet as the drawings: a camera on ones over a subject on twos saws back and forth by a whole step of travel every drawing, the faster and the closer the worse
        const tq = Q(t), bk = bkOf(tq), cam = camAt(tq), ctx = mx, k2 = cam.z * U;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
        const tx = W / 2 - cam.x * k2, ty = H / 2 - cam.y * k2;
        ctx.setTransform(k2, 0, 0, k2, tx, ty);
        patM = new DOMMatrix([1 / k2, 0, 0, 1 / k2, -tx / k2, -ty / k2]);
        const vx0 = cam.x - W / 2 / k2, vx1 = cam.x + W / 2 / k2, vy0 = cam.y - H / 2 / k2, vy1 = cam.y + H / 2 / k2;
        for (const n of sorted(roots)) { if (n.layer || n.screen) continue; if (!visible(n, tq)) continue; if (n.kind !== 'figure' && !n.gen) { const b = wbox(n, tq); if (b && (b.x > vx1 + 200 || b.x + b.w < vx0 - 200 || b.y > vy1 + 200 || b.y + b.h < vy0 - 200)) continue; } renderNode(ctx, n, tq, bk); }
        ctx.globalAlpha = 1;
        set(wl, { transform: camCss(cam) });
        drawLight(t, cam); drawSheet(t); textFrame(t);
      });
    } else {
      const lc = new Map();
      D.layerCanvas = (layer) => { if (!lc.has(layer)) { const c = el('canvas', `left:0;top:0;width:${W}px;height:${H}px;z-index:1;pointer-events:none`, layer); c.width = W; c.height = H; c.dataset.motion = 'skip'; lc.set(layer, c.getContext('2d')); } return lc.get(layer); };
      F.late((t) => {
        const tq = Q(t), bk = bkOf(tq);
        for (const [layer, ctx] of lc) {
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
          if (layer.style.display === 'none') continue;
          ctx.setTransform(U, 0, 0, U, 0, 0); patM = new DOMMatrix([1 / U, 0, 0, 1 / U, 0, 0]);
          for (const n of sorted(roots)) { if (n.layer !== layer || !visible(n, tq)) continue; renderNode(ctx, n, tq, bk); }
          ctx.globalAlpha = 1;
        }
        textFrame(t);
      });
    }

    // captions: graphite, hand-lettered, a paper halo, low in the frame
    if (!FLAT && F.T && F.voiced && !F.caps && opt.captions !== false) {
      const co = opt.captions || {}, segs = window.EV.captionSegments(F.T, co.max ?? (PT ? 13 : 22)), size = F.px(co.size ?? (PT ? 42 : 40));
      const box = el('div', `left:0;right:0;top:${co.top ?? (PT ? H * 0.77 : H * 0.885)}px;text-align:center;z-index:880;pointer-events:none;display:none`, F.stage);
      const sp = el('span', `position:relative;display:inline-block;max-width:${W * 0.86}px;color:${C0.lead};font:700 ${f1(size)}px/1.35 ${FONT.hand};letter-spacing:.03em;text-shadow:0 0 ${F.px(8)}px ${C0.paper},0 0 ${F.px(4)}px ${C0.paper},0 0 ${F.px(2)}px ${C0.paper}`, box);
      F.add((t) => { const c = segs.find((x) => t >= x.start && t < x.end); set(box, { display: c ? '' : 'none' }); if (c && sp.textContent !== c.text) sp.textContent = c.text; });
      for (const c of segs) { F.appear(c.start); F.appear(c.end); }
      F.caps = segs;
    }
    // the chapter: the scene slate in the top-left corner of the sheet, "SC. 2 · title", written in with a blue rule under it
    if (!FLAT && opt.chapters !== false) F.prep(() => {
      const CH = (F.T && F.T.chapters) || []; if (!CH.length) return;
      const size = F.px(PT ? 30 : 28), e = el('div', `left:${f1(W * (PT ? 0.06 : 0.045))}px;top:${f1(H * (PT ? 0.05 : 0.055))}px;color:${C0.soft};font:700 ${f1(size)}px/1.3 ${FONT.hand};white-space:nowrap;display:none;border-bottom:${f1(F.px(2))}px solid ${mixHex(C0.blue, C0.paper, 0.3)};padding:0 ${f1(F.px(6))}px ${f1(F.px(4))}px;filter:url(#pencil-rough)`, hud); e.dataset.motion = 'skip';
      const spans = CH.map((c, i) => { const s = el('span', 'position:relative;display:none', e); s.textContent = `SC. ${i + 1} · ${c.title}`; F.text(s, 'label', c.title, i ? c.start - 0.2 : 0, i === CH.length - 1 ? F.duration : CH[i + 1].start, { noFact: true, chrome: true, overlap: true }); return s; });
      F.add((t) => { let k2 = -1; CH.forEach((c, i) => { if (t >= c.start - 0.2) k2 = i; }); set(e, { display: k2 >= 0 ? '' : 'none' }); spans.forEach((s, i) => set(s, { display: i === k2 ? '' : 'none' })); if (k2 >= 0) { const q = cl((t - (CH[k2].start - 0.2)) / 0.6); set(e, { clipPath: q < 1 ? `inset(-20% ${f1((1 - q) * 100)}% -20% 0)` : '' }); } });
    });

    // a figure visibly acting counts as action for the gap checks (dead air / nothing new): spans where a joint moves ≥ 0.35 m/s
    const JN = ['pel', 'chest', 'headC', 'haL', 'haR', 'elL', 'elR', 'knL', 'knR', 'ftL', 'ftR'];
    let SPD = null;
    const speedsAll = () => (SPD ??= figures.map((fg) => { const dt = 1 / FPSD, out = []; let prev = fg.joints(0); for (let t = dt; t <= F.duration + 1e-6; t += dt) { const cur = fg.joints(t), d = JN.map((nm) => v3.len(v3.sub(cur[nm], prev[nm]))); out.push({ t, d, v: Math.max(...d) / dt, vis: visible(fg.n, t) && visible(fg.n, t - dt) }); prev = cur; } return out; }));
    D.run = () => {};
    F.prep(() => {
      const S2 = speedsAll(), dt = 1 / FPSD, nn = S2.length ? S2[0].length : 0;
      let a = null;
      for (let i = 0; i <= nn; i++) { const act = i < nn && S2.some((L2) => L2[i].vis && L2[i].v >= 0.35); const t = (i + 1) * dt; if (act && a === null) a = t; if (!act && a !== null) { if (t - a >= 0.25) F.live(a - 0.05, t + 0.15); a = null; } }
      // morphs and draw-ons are action too: a line going down is the picture moving
      for (const m of morphs) F.live(m.at, m.until);
      for (const n of all) if (n.enter === 'draw' && n.at > 0 && !n.parent && n.inDur >= 0.5) F.live(n.at, n.at + n.inDur);
    });

    // ---------- checks: measured from the drawings (the canvas is invisible to the DOM motion sheet) ----------
    F.addLint(() => {
      const out = [], add = (t, what, msg, level = 'warn') => out.push({ level, t: Math.round(t * 10) / 10, src: '', what, msg }), seen = new Set(), once = (k2) => { if (seen.has(k2)) return false; seen.add(k2); return true; };
      if (raw.size > 2) add(0, M('颜色越界', 'off-palette colours'), M(`用了 ${raw.size} 个调色板以外的颜色（${[...raw].slice(0, 5).join(' ')}）：铅笔风只有石墨、蓝色构造线和一个暖色强调；用 lead / soft / blue / accent / shade`, `${raw.size} colours outside the palette (${[...raw].slice(0, 5).join(' ')}): the pencil style is graphite, blue construction and one warm accent; use lead / soft / blue / accent / shade`));
      if (!BOIL) add(0, M('线条不抖', 'no line boil'), M('boil: 0 关掉了线条抖动：停住的铅笔画像印出来的图片，失去手绘动画的生命感（保留默认 1，嫌太抖用 0.5）', 'boil: 0 turns the line boil off: a held pencil drawing then reads as a printed picture (keep the default 1, or 0.5 if it is too lively)'));
      if (FLAT) return out;
      const vEnd = F.T && F.T.lines ? Math.max(...F.T.lines.map((l) => l.end || 0)) : F.duration;
      // things that appear mid-film with no entrance
      const pops = roots.filter((n) => n.at > 0.3 && n.enter === 'none' && n.kind !== 'morph' && !morphs.some((m) => m.to === n) && !n.o.lintOk);
      if (pops.length) add(pops[0].at, M('东西硬出现', 'switched on'), M(`${pops.length} 个画面元素在片中直接出现，没有画出来的过程（第一个在 ${pops[0].at.toFixed(1)} 秒）：给它 enter: 'draw'，或者用 D.morph 从上一张画变过来`, `${pops.length} drawings appear mid-film without being drawn (the first at ${pops[0].at.toFixed(1)} s): give them enter: 'draw', or D.morph them out of the previous drawing`));
      // hard cuts where a morph belongs
      const cuts = (F.cuts || []).filter((c) => c > 0.5 && c < F.duration - 0.5);
      if (cuts.length) add(cuts[0], M('硬切', 'hard cut'), M(`${cuts.length} 处硬切（第一处 ${cuts[0].toFixed(1)} 秒）：铅笔动画不切镜头，用 D.morph 让上一张画变成下一张，或者让镜头跟着动作走过去`, `${cuts.length} hard cuts (the first at ${cuts[0].toFixed(1)} s): pencil animation does not cut; D.morph one drawing into the next, or let the camera travel with the action`));
      // the same entrance over and over: a long run of draw-ons with no morph, figure or camera move between them
      const ent = roots.filter((n) => n.at > 0.3 && n.enter === 'draw' && !n.o.isGuide && n.kind !== 'figure').sort((a, b) => a.at - b.at);
      for (let i = 0; i < ent.length;) { let j = i; while (j + 1 < ent.length && ent[j + 1].at - ent[j].at < 2.5) j++; if (j - i + 1 >= 14 && ent[j].at - ent[i].at > 6 && !morphs.some((m) => m.at > ent[i].at && m.at < ent[j].at) && !keys.some((k2) => k2.a > ent[i].at && k2.a < ent[j].at)) add(ent[i].at, M('入场单一', 'same entrance'), M(`${ent[i].at.toFixed(1)}–${ent[j].at.toFixed(1)} 秒连续 ${j - i + 1} 个东西都是原地画出来：中间插一次变形（D.morph）、让人物动起来，或者镜头跟着走`, `${ent[i].at.toFixed(1)}–${ent[j].at.toFixed(1)} s: ${j - i + 1} drawings in a row are simply drawn in place: put a morph (D.morph), a figure's action or a camera move between them`)); i = j + 1; }
      // the camera: too fast, pushed in too far
      let fast = null, peak = 0;
      for (let t = 0; t < F.duration; t += 1 / 15) { const a = camAt(t), b = camAt(t + 1 / 15), sp = ((Math.hypot(b.x - a.x, b.y - a.y) * a.z * U) / Math.max(W, H)) * 15, zs = Math.abs(Math.log(b.z / a.z)) * 15; if (sp > 1.4 || zs > 1.3) { fast ??= t; peak = Math.max(peak, sp); } else if (fast != null) { if (once('cf' + Math.round(fast))) add(fast, M('镜头太快', 'camera too fast'), M(`${fast.toFixed(1)}–${t.toFixed(1)} 秒镜头每秒移过约 ${peak.toFixed(1)} 个画面：跟拍加大 lag，或者 D.move 给更长时间`, `${fast.toFixed(1)}–${t.toFixed(1)} s the camera crosses about ${peak.toFixed(1)} frames a second: raise the follow's lag, or give D.move more time`)); fast = null; peak = 0; } }
      for (const k2 of keys) { if (k2.follow) continue; const v = memo.get(k2) ?? resolve(k2.view, k2.b); if (v.z > 2.6) { add(k2.b, M('推得太近', 'pushed in too far'), M(`${k2.b.toFixed(1)} 秒镜头推到 ${v.z.toFixed(1)} 倍：线条会被放得很粗。把要看的东西画大一点`, `At ${k2.b.toFixed(1)} s the camera is at ${v.z.toFixed(1)}×: the lines blow up. Draw the subject bigger instead`)); break; } }
      // figures: snaps, too fast, hard starts, frozen, standing stiff in view
      const S2 = speedsAll();
      figures.forEach((fg, fi) => {
        const L2 = S2[fi], nm = fg.n.o.name ?? `figure ${fi + 1}`, Sk = fg.S / 230;
        const cutAt = (t) => (F.cuts || []).some((c) => Math.abs(c - t) < 0.1) || morphs.some((m) => t >= m.at - 0.1 && t <= m.until + 0.1);
        // a jump / fall / sit / lie is allowed its impact (gravity stops at the floor in one drawing): no snap is called inside one
        const inMove = (t) => fg.body.some((sg) => ['jump', 'fall', 'lie', 'sit'].includes(sg.kind) && t >= sg.a && t <= sg.a + (sg.dur ?? 0) + 0.15);
        for (let i = 1; i < L2.length - 1; i++) { const s = L2[i]; if (!s.vis || cutAt(s.t) || inMove(s.t)) continue; for (let j = 0; j < JN.length; j++) { const d = s.d[j], nb = Math.max(L2[i - 1].d[j], L2[i + 1].d[j]); if (d > 0.14 && d > 3 * nb && once('snap' + fi + Math.round(s.t * 2))) add(s.t, M('动作跳帧', 'limb snaps'), M(`${nm} 的 ${JN[j]} 在 ${r2(s.t)}s 一张画跳了 ${d.toFixed(2)} 米（前后只动 ${nb.toFixed(2)} 米）：两个动作之间没有过渡（给后一个动作 dur），或者两段动作叠在一起了`, `${nm}'s ${JN[j]} jumps ${d.toFixed(2)} m in one drawing at ${r2(s.t)}s (the drawings around it move ${nb.toFixed(2)} m): give the second action a dur, or the two actions overlap`)); } }
        for (const s of L2) if (s.vis && s.v > 16 && !cutAt(s.t) && once('fast' + fi + Math.round(s.t))) add(s.t, M('动作太快', 'too fast'), M(`${nm} 在 ${r2(s.t)}s 有关节快到 ${s.v.toFixed(0)} 米/秒：放慢这个动作`, `${nm} has a joint at ${s.v.toFixed(0)} m/s at ${r2(s.t)}s: give the move more time`));
        for (let i = 2; i < L2.length; i++) if (L2[i].vis && L2[i - 1].v < 0.12 && L2[i - 2].v < 0.12 && L2[i].v > 1.6 && !cutAt(L2[i].t) && once('hard' + fi + Math.round(L2[i].t))) add(L2[i].t, M('动作硬起步', 'hard start'), M(`${nm} 在 ${r2(L2[i].t)}s 从静止一张画就到全速：给动作留出预备（默认的过渡有预备和惯性，别把 dur 设成 0）`, `${nm} goes from still to full speed in one drawing at ${r2(L2[i].t)}s: let the move wind up (don't set dur to 0)`));
        let run = 0; for (const s of L2) { if (s.vis && s.v < 0.004) run += 1 / FPSD; else { if (run > 1.5 && once('frz' + fi + Math.round(s.t))) add(s.t - run, M('人物冻住', 'figure frozen'), M(`${nm} 在 ${r2(s.t - run)}–${r2(s.t)}s 一动不动（连呼吸都没有）：别关 idle`, `${nm} does not move at all ${r2(s.t - run)}–${r2(s.t)}s (not even breathing): keep idle on`)); run = 0; } }
        // stiff: in view for a long time without any action (breathing only)
        const ev = [effAt(fg.n), ...fg.events, ...fg.acts.flatMap((A) => [A.a, A.b])].filter((x) => x >= 0).sort((a, b) => a - b);
        for (let t = Math.max(0.5, effAt(fg.n)); t < Math.min(fg.n.until, vEnd); t += 0.5) { const v = camAt(t), b = wbox(fg.n, t); if (!inView(v, b.x + b.w / 2, b.y + b.h / 2)) continue; const last = ev.filter((x) => x <= t).pop() ?? effAt(fg.n); if (t - last > 7) { add(last, M('人物站桩', 'stiff figure'), M(`${nm} 在镜头里 ${last.toFixed(1)}–${t.toFixed(1)} 秒只是站着呼吸：让他转身、看向别处、换个姿势、走两步，或者画面换走`, `${nm} stands in view ${last.toFixed(1)}–${t.toFixed(1)} s only breathing: let it turn, look, change pose, take a few steps, or move the picture on`)); break; } }
      });
      // nothing new on screen for long
      const evts = [...keys.flatMap((k2) => [k2.a, k2.b]), ...all.flatMap((n) => [n.at, n.until, ...(n.changes || []), ...(n.tracks || []).flatMap((x) => [x.a, x.b]), ...(n.keysN || []).map((kk) => kk[0])]), ...figures.flatMap((fg) => [...fg.events, ...fg.acts.flatMap((A) => [A.a, A.b])]), ...texts.map((x) => x.at), ...blooms.map((b) => b.at)].filter((x) => x > 0 && x < F.duration).sort((a, b) => a - b);
      for (let i = 1; i < evts.length; i++) if (evts[i] - evts[i - 1] > 6 && evts[i - 1] < vEnd) { add(evts[i - 1], M('画面停太久', 'nothing happens'), M(`${evts[i - 1].toFixed(1)}–${evts[i].toFixed(1)} 秒画面上没有新东西（只有线条在抖）：画下一笔、让人物动、变形到下一张，或者镜头推过去`, `${evts[i - 1].toFixed(1)}–${evts[i].toFixed(1)} s nothing new happens (only the line boils): draw the next thing, move a figure, morph, or push the camera`)); break; }
      // the accent: one warm colour, for peaks only
      const acc = blooms.filter((b) => b.at < F.duration);
      if (acc.length > (opt.maxBlooms ?? 4)) add(acc[opt.maxBlooms ?? 4].at, M('暖色用太多', 'too much accent'), M(`暖色晕染用了 ${acc.length} 次：铅笔动画几乎是单色的，暖色只留给情绪最高的一两处（STYLE.md §3）`, `the warm wash blooms ${acc.length} times: pencil animation is nearly monochrome; keep the warm colour for one or two emotional peaks (STYLE.md §3)`));
      const accT = acc.reduce((s, b) => s + Math.max(0, Math.min(b.until, F.duration) - b.at), 0);
      if (accT > F.duration * 0.35) add(acc[0].at, M('暖色铺太久', 'accent too long'), M(`暖色晕染在画面上一共 ${accT.toFixed(0)} 秒（全片 ${F.duration.toFixed(0)} 秒）：让它开出来再退掉（until），别一直铺着`, `the warm wash stays on for ${accT.toFixed(0)} s of ${F.duration.toFixed(0)} s: let it bloom and fade (until), not stay`));
      // a near-blank sheet while the voice runs: everything erased and the next drawing not down yet (or the camera between drawings). Measured as pencil in the frame: px of line, construction and soft lines count little, lettering counts
      const inkPx = (t) => {
        const tq = Q(t), cam = camAt(t), k2 = cam.z * U, vx0 = cam.x - W / 2 / k2, vx1 = cam.x + W / 2 / k2, vy0 = cam.y - H / 2 / k2, vy1 = cam.y + H / 2 / k2, inV = (x, y) => x >= vx0 && x <= vx1 && y >= vy0 && y <= vy1;
        let ink = 0;
        const walk = (n) => {
          if (!visible(n, tq) || n.layer) return;
          const items = collect(n, tq, [], false), q = n.enter === 'draw' && n.inDur ? cl((tq - n.at) / n.inDur) : 1, qo = n.until < 1e8 && n.exit !== 'none' ? cl((tq - (n.until - n.outDur)) / n.outDur) : 0, cln = cleanOf(n);
          if (q < 1) allot(items);
          for (const it of items) {
            const st = it.s; if ((st.kind !== 'line' && st.kind !== 'construct') || (st.alpha ?? 1) <= 0) continue;
            if (st.kind === 'line' && cln !== undefined && (cln === false || tq < cln)) continue;
            let len = 0; for (let i = 1; i < st.pts.length; i++) { const A = st.pts[i - 1], B = st.pts[i]; if (inV((A[0] + B[0]) / 2, (A[1] + B[1]) / 2)) len += Math.hypot(B[0] - A[0], B[1] - A[1]); }
            ink += len * k2 * (st.kind === 'construct' ? 0.2 : st.color === C0.soft ? 0.3 : 1) * (q < 1 && it.r0 !== undefined ? progOf(it, q) : 1) * (1 - qo) * (st.alpha ?? 1);
          }
          for (const kid of n.kids) if (kid.at >= 0) walk(kid);
        };
        for (const n of roots) walk(n);
        for (const T of texts) { if (t < T.at || t >= T.until || T.o.chrome) continue; const x = fnOf(T.o.x, 0)(t), y = fnOf(T.o.y, 0)(t); if (!T.screen && !inV(x, y)) continue; const qi = T.enter === 'none' ? 1 : cl((t - T.at) / (T.o.inDur ?? Math.min(1.4, 0.3 + units(T.text) * 0.08))), qo = T.until < 1e8 ? cl((t - (T.until - 0.35)) / 0.35) : 0; ink += units(T.text) * (T.o.size ?? 64) * (T.screen ? U : k2) * 3 * qi * (1 - qo); }
        return ink;
      };
      D.inkPx = inkPx;
      if (F.T && F.T.lines && F.T.lines.length) {
        const a0 = F.T.lines[0].start + 0.3, b0 = F.T.lines[F.T.lines.length - 1].end, lim = W * 0.8;
        let run = null, seenB = 0;
        for (let t = a0; t <= b0 + 1e-6; t += 1 / FPSD) {
          const low = t < b0 && inkPx(t) < lim;
          if (low) run ??= t;
          else { if (run !== null && t - run >= 0.16 && seenB++ < 4) add(run, M('空白页', 'near-blank sheet'), M(`${run.toFixed(1)}–${t.toFixed(1)} 秒旁白还在说，纸上几乎是空的：上一张画先擦了、下一张还没画，或者镜头走在两张画中间。让下一张先开始画再擦上一张（until 晚于下一张的 at），或者用 D.morph 直接变过去，或者让镜头走到时新画已经在纸上`, `${run.toFixed(1)}–${t.toFixed(1)} s the voice is running over a nearly empty sheet: the last drawing is erased before the next one starts, or the camera is between drawings. Start the next drawing before erasing the last (until later than the next one's at), D.morph straight into it, or have the new drawing on the sheet when the camera arrives`)); run = null; }
        }
      }
      // a caption over a drawing: a figure or a prop reaches down into the caption band (wide grounds and hills are allowed behind it)
      if (F.caps) {
        const size = F.px((opt.captions && opt.captions.size) ?? (PT ? 42 : 40)), top = (opt.captions && opt.captions.top) ?? (PT ? H * 0.77 : H * 0.885), done = new Set();
        for (const c of F.caps) {
          const t = (c.start + c.end) / 2, cam = camAt(t), k2 = cam.z * U, tw = units(c.text) * size, x0 = W / 2 - tw / 2, x1 = W / 2 + tw / 2, y1 = top + size * 1.4;
          for (const n of roots) {
            if (n.layer || done.has(n) || !visible(n, Q(t)) || !(n.fig || n.kind === 'wheel' || n.kind === 'numeral' || n.prop)) continue;
            const b = wbox(n, Q(t)), sx0 = (b.x - cam.x) * k2 + W / 2, sx1 = (b.x + b.w - cam.x) * k2 + W / 2, sy0 = (b.y - cam.y) * k2 + H / 2, sy1 = (b.y + b.h - cam.y) * k2 + H / 2;
            if (sx1 - sx0 > W * 0.7) continue;
            if (sx1 > x0 && sx0 < x1 && sy1 > top + size * 0.15 && sy0 < y1) { done.add(n); add(t, M('字幕压画', 'caption over a drawing'), M(`${t.toFixed(1)} 秒字幕压在${n.fig ? '人物' : '画'}上（屏幕 y ${Math.round(sy1)}，字幕带从 ${Math.round(top)} 开始）：把镜头往下挪（view.y 加大）或者拉远，地面线要在字幕带上面`, `At ${t.toFixed(1)} s the caption sits on ${n.fig ? 'a figure' : 'a drawing'} (screen y ${Math.round(sy1)}, the caption band starts at ${Math.round(top)}): move the camera down (a larger view.y) or pull out; keep the ground line above the band`)); }
          }
        }
        // lettering on the sheet that says word for word what the caption says at that moment: the sheet should add something the voice doesn't (a number, a date, a label)
        const norm = (x) => String(x).replace(/[\s·,，。:：;；、!！?？《》“”"'()（）\-–—]/g, '');
        let rep = 0;
        for (const T of texts) { if (T.o.chrome) continue; const tn = norm(T.text), cjk = (tn.match(/[\u3400-\u9fff]/g) || []).length; if (cjk < 4) continue; const c = F.caps.find((x) => T.at < x.end && T.until > x.start && norm(x.text).includes(tn)); if (c && rep++ < 3) add(T.at, M('上屏字重复字幕', 'text repeats the caption'), M(`"${T.text}" 和当时的字幕一字不差：纸上写字幕没说的东西（一个数字、一个日期、一个部件名），或者删掉它，让画来讲`, `"${T.text}" says word for word what the caption says at that moment: put something on the sheet the voice doesn't say (a number, a date, a part's name), or drop it and let the drawing tell it`)); }
      }
      // lettering or a drawn numeral sitting on a drawing: pencil lines crossing its box on screen for a moment (o.over: true = it belongs there, e.g. a number on a banner)
      {
        const clip = (A, B, R) => { let t0 = 0, t1 = 1; const dx = B[0] - A[0], dy = B[1] - A[1]; for (const [p2, q2] of [[-dx, A[0] - R.x0], [dx, R.x1 - A[0]], [-dy, A[1] - R.y0], [dy, R.y1 - A[1]]]) { if (p2 === 0) { if (q2 < 0) return 0; } else { const r = q2 / p2; if (p2 < 0) { if (r > t1) return 0; if (r > t0) t0 = r; } else { if (r < t0) return 0; if (r < t1) t1 = r; } } } return Math.max(0, t1 - t0) * Math.hypot(dx, dy); };
        const hits = new Map(), showT = new Set();
        const note = (key, label, t, ink, lim) => { const h = hits.get(key) ?? { n: 0, t: 0, ink: 0, label }; if (ink >= lim) { h.n++; if (h.n === 1 || ink > h.ink) { h.t = t; h.ink = ink; } } else if (h.n < 2) { h.n = 0; h.ink = 0; } hits.set(key, h); };
        for (let t = 0.25; t < F.duration; t += 0.25) {
          const tq = Q(t), cam = camAt(t), k2 = cam.z * U, toS = (p) => [(p[0] - cam.x) * k2 + W / 2, (p[1] - cam.y) * k2 + H / 2];
          const active = texts.filter((T) => t >= T.at + 0.15 && t < T.until - 0.35 && !T.o.chrome && !T.o.over), nums = numerals.filter((n) => visible(n, tq) && !n.o.over && !(n.parent && n.parent.prop));
          if (!active.length && !nums.length) continue;
          const segs = []; const walk = (n) => { if (!visible(n, tq) || n.layer) return; const q0 = n.enter === 'draw' && n.inDur ? cl((tq - n.at) / n.inDur) : 1, cln = cleanOf(n), rough = ghostOf(n, tq) || cln === false || (cln !== undefined && tq < cln); if (!n.o.isGuide) for (const it of collect(n, tq, [], false)) { const st = it.s, blue = st.kind === 'construct'; if ((st.kind !== 'line' && !blue) || (st.kind === 'line' && rough) || (st.alpha ?? 1) < 0.15 || q0 < 0.5) continue; const P2 = st.pts.map(toS); for (let i = 1; i < P2.length; i++) segs.push({ a: P2[i - 1], b: P2[i], n: it.n, wt: blue ? 0.35 : 1 }); } for (const kid of n.kids) if (kid.at >= 0) walk(kid); };
          for (const n of roots) walk(n);
          const inkIn = (R, self) => { let L = 0; for (const g of segs) { if (self && (g.n === self)) continue; L += clip(g.a, g.b, R) * g.wt; } return L; };
          for (const T of active) {
            const size = (T.o.size ?? 64) * (T.screen ? U : k2), wrapW = T.o.wrap ? T.o.wrap * (T.screen ? U : k2) : Infinity, w0 = units(T.text) * size * 1.03, tw = Math.min(w0, wrapW), rows = Math.ceil(w0 / tw), th = rows * size * 1.25;
            const x = fnOf(T.o.x, 0)(t), y = fnOf(T.o.y, 0)(t), c = T.screen ? [x * U, y * U] : toS([x, y]), x0 = T.o.align === 'left' ? c[0] : T.o.align === 'right' ? c[0] - tw : c[0] - tw / 2;
            const air = size * 0.25;   // a little clear air round the words: text just touching a head counts too
            note(T, T.text, t, inkIn({ x0: x0 - air, x1: x0 + tw + air, y0: c[1] - th / 2 - air, y1: c[1] + th / 2 + air }), Math.max(F.px(24), size * 0.5));
          }
          for (const n of nums) { const own = n.gen(tq); const b = bboxOf(own.filter((x) => x.kind === 'line')); if (!b) continue; const A = toS([b.x, b.y]), B = toS([b.x + b.w, b.y + b.h]); note(n, (n.keysN && n.keysN.length ? n.keysN[n.keysN.length - 1][1] : n.o.count ? String(n.o.count.to) : M('数字', 'a numeral')), t, inkIn({ x0: A[0], x1: B[0], y0: A[1], y1: B[1] }, n), Math.max(F.px(30), (B[1] - A[1]) * 0.35)); }
        }
        let cnt = 0;
        for (const [, h] of hits) if (h.n >= 2 && cnt++ < 6) add(h.t, M('字压在画上', 'lettering on a drawing'), M(`${h.t.toFixed(1)} 秒"${h.label}"压在线条上（框里有约 ${Math.round(h.ink)}px 的铅笔线）：挪到空白纸上。确实属于那里的（数字写在旗子上），写 over: true`, `At ${h.t.toFixed(1)} s "${h.label}" sits on the drawing (about ${Math.round(h.ink)} px of pencil line inside its box): move it to clear paper. If it belongs there (a number on a banner), write over: true`));
      }
      // too much text at once
      let worst = null;
      for (let t = 0.25; t < F.duration; t += 0.5) { const n2 = texts.filter((g) => t >= g.at && t < g.until && !g.o.chrome).length; if (n2 > (opt.maxText ?? 9) && (!worst || n2 > worst.n)) worst = { t, n: n2 }; }
      if (worst) add(worst.t, M('字太多', 'too much text'), M(`${worst.t.toFixed(1)} 秒画面上同时有 ${worst.n} 段字：这个风格靠画讲，字只写关键的数字、年份和名字`, `At ${worst.t.toFixed(1)} s there are ${worst.n} pieces of text on screen: this style tells by drawing; write only the key numbers, years and names`));
      return out;
    });

    D.roots = roots; D.figures = figures; D.texts = texts; D.morphs = morphs;
    return P.infoKit ? P.infoKit(D, { timing: 'flow', onion: 'flow', versus: 'compare', tally: 'chart', marks: 'chart', numeral: 'chart', note: 'annotate', ring: 'mark', figure: 'character', prop: 'illustration', morph: 'diagram', wheel: 'diagram', crank: 'diagram', sprocket: 'diagram', chain: 'diagram', span: 'chart', live: 'illustration' }) : D;
  };
})();
