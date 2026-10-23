// cutout.js: the Matisse cut-paper style (one of the visual styles of bubble-video-skill's promo/; style notes in styles/cutout/STYLE.md). Load after promo.js.
// Matisse's late cut-outs (Jazz, the Blue Nudes, corals and seaweed): paper brushed with opaque gouache, cut into organic shapes with scissors, pasted piece by piece on off-white backing paper.
// One piece of paper = one clip-path (seeded deterministic noise → irregular hand-cut edges, short straight segments one snip at a time; identical on every render of a frame)
//          + gouache brush-stroke texture + a very light shadow (the higher the paper lifts off the backing, the bigger and softer the shadow).
// All text is DOM (automatic checks work as usual): big titles are "cut-out letters", captions sit on hand-cut paper strips.
//
//   const C = PROMO.cutout(F, { colors, paper, head, body })
//   C.desk(parent)                                     off-white backing paper (paper grain)
//   C.piece(parent, { shape, color, x, y, w, h, rot, at, until, enter, exit, sway, drift }) one paper cut-out → p: p.move(...) / p.el / p.inner
//     shapes: blob | circle | rect | leaf (seaweed leaf) | petal | coral | star | spiral | wave | capsule (limb) | your own point list / function
//     enter: paste (default) | cut (scissors cut along the outline) | fade | none; exit: peel (default) | lift | drop | fade | none
//   C.photo(parent, { src, x, y, w, h, crop, mat, tape, at }) real material (screenshots, covers) pasted as-is on a hand-cut paper mat
//   C.collage(parent, { at, every, items })            pieces pasted one after another, building an icon / interface / pattern
//   C.figure(parent, { x, y, h, color, pose, at })     a human figure (a few pieces of paper, like the Blue Nudes)
//   C.drift(parent, { at, until, n, area })            drifting paper bits (little seaweed, stars slowly floating, turning)
//   C.title(parent, { at, until, text, size, colors }) cut-out big title: letters pasted one by one like paper pieces
//   C.strip(parent, { at, until, text, size, paper })  a hand-cut paper strip + the text on it (captions, labels, buttons, titles on a strip)
//   C.peel(element, { at, dur, edge })                 peel / reveal: a layer lifts from one edge and flies off, revealing what's below
//   C.wipe({ at, dur, color, from, out })              transition: a big sheet of coloured paper covers the frame, then tears / peels / slides away; returns the moment of full cover
//   C.endcard(parent, { at, title, tagline, url })     end card: big title pasted, paper strips, a ring of cut-outs closes in
//
// Timing: at = the moment the paper **settles** (on the beat) — the pasting motion starts lead earlier (default 0.3 s); until = the moment it is **fully gone** (the exit plays out before it, matching F.text registration).
(function () {
  const P = window.PROMO;
  if (!P) throw new Error('cutout.js 要在 promo.js 之后加载');
  const { clamp, lerp } = window.EV;
  const { E, seg, set, el } = P;
  const f1 = (n) => Math.round(n * 10) / 10;
  const f3 = (n) => Math.round(n * 1000) / 1000;
  const TAU = Math.PI * 2;
  const cubicIn = (q) => q * q * q;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = (seed) => EV.rng(seed >>> 0);
  // relative luminance of a colour (0 black … 1 white): text on a strip picks dark / light automatically
  const lum = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) return 1; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); };
  const OUT = { paper: 1, light: 1, ink: 1 };

  // ---------- shapes (closed point lists in a unit box; stretched to w × h later) ----------
  // build an outline from a few basic shapes (union): draw on a small canvas, then trace the boundary (Moore-neighbourhood tracing) → point list
  //   draw(g) draws in unit coordinates (g already scaled); tube(g, points, startRadius, endRadius) draws a tube that tapers
  const tube = (g, pts, r0, r1) => { const n = pts.length; for (let i = 0; i < n - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0), k = Math.max(2, Math.ceil(L / 0.008)); for (let j = 0; j <= k; j++) { const q = j / k, u = (i + q) / (n - 1); g.beginPath(); g.arc(lerp(x0, x1, q), lerp(y0, y1, q), lerp(r0, r1, u), 0, TAU); g.fill(); } } };
  function union(draw, res = 280) {
    const c = document.createElement('canvas'); c.width = c.height = res; const g = c.getContext('2d');
    // draw in [-0.5, 1.5] first (a shape may reach outside the unit box), keep only the opaque part
    g.setTransform(res / 2, 0, 0, res / 2, res / 4, res / 4); g.fillStyle = '#000'; draw(g);
    const a = g.getImageData(0, 0, res, res).data, on = (x, y) => x >= 0 && y >= 0 && x < res && y < res && a[(y * res + x) * 4 + 3] > 127;
    let sx = -1, sy = -1; for (let y = 0; y < res && sx < 0; y++) for (let x = 0; x < res; x++) if (on(x, y)) { sx = x; sy = y; break; }
    if (sx < 0) return [[0, 0], [1, 0], [1, 1], [0, 1]];
    const D = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]], out = [];
    let x = sx, y = sy, dir = 6;
    for (let guard = 0; guard < res * res; guard++) {
      out.push([x, y]); let found = false;
      for (let k = 0; k < 8; k++) { const d = (dir + 6 + k) % 8, nx = x + D[d][0], ny = y + D[d][1]; if (on(nx, ny)) { x = nx; y = ny; dir = d; found = true; break; } }
      if (!found || (x === sx && y === sy)) break;
    }
    // remove pixel stair-steps: moving average
    const n = out.length, w = 3;
    return out.map((_, i) => { let mx = 0, my = 0; for (let j = -w; j <= w; j++) { const p = out[(i + j + n) % n]; mx += p[0]; my += p[1]; } return [mx / (2 * w + 1), my / (2 * w + 1)]; }).filter((_, i) => i % 2 === 0);
  }
  const ring = (n, f) => Array.from({ length: n }, (_, i) => f((i / n) * TAU));
  const SHAPES = {
    rect: () => [[0, 0], [1, 0], [1, 1], [0, 1]],
    circle: () => ring(96, (a) => [Math.cos(a), Math.sin(a)]),
    // blob: a few low-frequency undulations stacked
    blob: (r, o) => { const w = o.wobble ?? 0.13, k = [2, 3, 4, 5].map((n) => [(w * (0.4 + r())) / (n * 0.5), r() * TAU]); return ring(120, (a) => { const rr = 1 + k.reduce((s, [amp, ph], i) => s + amp * Math.sin((i + 2) * a + ph), 0); return [Math.cos(a) * rr, Math.sin(a) * rr]; }); },
    // seaweed leaf: a curved stem with plump lobes of uneven length growing alternately on both sides (Matisse's algue)
    leaf: (r, o) => union((g) => {
      const bend = o.bend ?? (r() - 0.5) * 0.5, n = o.lobes ?? 5 + Math.floor(r() * 3), stem = (s) => [0.5 + bend * Math.sin(Math.PI * s * 0.9), 1 - s];
      tube(g, [...Array(12)].map((_, i) => stem(i / 11)), 0.05, 0.025);
      for (let i = 0; i < n; i++) {
        const s0 = 0.1 + (0.8 * i) / Math.max(1, n - 1) + (r() - 0.5) * 0.06, side = i % 2 ? 1 : -1, [x, y] = stem(s0), up = 1 - 0.55 * s0;
        const ang = -Math.PI / 2 + side * (0.6 + 0.5 * r()), len = (0.26 + 0.2 * r()) * up + 0.08, rad = (0.07 + 0.05 * r()) * (0.7 + 0.4 * up);
        tube(g, [[x, y], [x + Math.cos(ang) * len * 0.55, y + Math.sin(ang) * len * 0.55 - 0.02], [x + Math.cos(ang) * len, y + Math.sin(ang) * len]], rad * 0.75, rad);
      }
      const [tx, ty] = stem(1); tube(g, [stem(0.85), [tx, ty + 0.02]], 0.06, 0.07);
    }),
    // petal: a leaf pointed at both ends, bulging a little on one side
    petal: (r, o) => { const k = 0.85 + 0.3 * r(), M = 80, A = [], B = []; for (let i = 0; i <= M; i++) { const y = i / M, w = Math.pow(Math.sin(Math.PI * y), 0.8) * (1 - 0.25 * y); A.push([0.5 + 0.5 * w * k, y]); B.push([0.5 - 0.5 * w, y]); } return [...A, ...B.reverse()]; },
    // coral: branches growing up from the bottom (the trunk splits into two or three, each splits again), rounded tips
    coral: (r, o) => union((g) => {
      const grow = (x, y, ang, len, rad, d) => {
        const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len, mx = (x + ex) / 2 + (r() - 0.5) * len * 0.25, my = (y + ey) / 2;
        tube(g, [[x, y], [mx, my], [ex, ey]], rad, rad * 0.8);
        if (d <= 0) { g.beginPath(); g.arc(ex, ey, rad * 1.15, 0, TAU); g.fill(); return; }
        const k = 2 + (r() < 0.35 ? 1 : 0);
        for (let i = 0; i < k; i++) grow(ex, ey, ang + (i - (k - 1) / 2) * (0.55 + 0.35 * r()) + (r() - 0.5) * 0.2, len * (0.62 + 0.2 * r()), rad * 0.78, d - 1);
      };
      grow(0.5, 1, -Math.PI / 2 + (r() - 0.5) * 0.2, 0.3, o.thick ?? 0.065, o.depth ?? 3);
    }),
    // star: points of uneven length, not a regular five-point star
    star: (r, o) => { const n = o.points ?? 5 + Math.floor(r() * 3), inner = o.inner ?? 0.42, rot = r() * TAU, pts = []; for (let i = 0; i < 2 * n; i++) { const a = rot + (Math.PI * i) / n + (r() - 0.5) * 0.2, rr = i % 2 ? inner * (0.82 + 0.36 * r()) : 0.82 + 0.36 * r(); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); } return pts; },
    // spiral: a paper ribbon that widens as it winds round a few times
    spiral: (r, o) => { const turns = o.turns ?? 2.2, M = 280, A = [], B = []; for (let i = 0; i <= M; i++) { const q = i / M, a = q * turns * TAU, rad = 0.08 + 0.92 * q, w = 0.05 + 0.13 * q; A.push([Math.cos(a) * (rad + w / 2), Math.sin(a) * (rad + w / 2)]); B.push([Math.cos(a) * Math.max(0.01, rad - w / 2), Math.sin(a) * Math.max(0.01, rad - w / 2)]); } return [...A, ...B.reverse()]; },
    // wave: two undulating edges, top and bottom
    wave: (r, o) => { const f = o.waves ?? 2.5, p = r() * TAU, amp = o.amp ?? 0.22, M = 160, A = [], B = []; for (let i = 0; i <= M; i++) { const x = i / M; A.push([x, 0.3 + amp * Math.sin(TAU * f * x + p)]); B.push([x, 0.7 + amp * Math.sin(TAU * f * x + p + 0.6)]); } return [...A, ...B.reverse()]; },
    // capsule: an ellipse wider at the top than the bottom (torso, arms, legs of a figure)
    capsule: (r, o) => { const tp = o.taper ?? 0.3; return ring(100, (a) => { const c = Math.cos(a), s = Math.sin(a); return [c * 0.5 * (1 - tp * (0.5 + 0.5 * s)), s]; }); },
  };
  const normPts = (pts) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } const w = x1 - x0 || 1, h = y1 - y0 || 1; return pts.map(([x, y]) => [(x - x0) / w, (y - y0) / h]); };
  // resample by arc length (closed)
  function resample(pts, step) {
    const n = pts.length, acc = [0];
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; acc.push(acc[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const L = acc[n], m = Math.max(16, Math.round(L / step)), out = [];
    let j = 0;
    for (let k = 0; k < m; k++) { const s = (k / m) * L; while (acc[j + 1] < s) j++; const a = pts[j], b = pts[(j + 1) % n], q = (s - acc[j]) / (acc[j + 1] - acc[j] || 1); out.push([lerp(a[0], b[0], q), lerp(a[1], b[1], q)]); }
    return out;
  }

  function make(F, opt = {}) {
    const C = { F, seed: opt.seed ?? 11, n: 0 };
    C.colors = { blue: '#1F3C9A', red: '#E4533B', yellow: '#F2BF2C', green: '#2E8B4F', black: '#1C1B1A', rose: '#D9497D', white: '#FBF8F1', ...(opt.colors || {}) };
    C.paper = opt.paper ?? '#F3ECDD';
    C.ink = opt.ink ?? C.colors.black;
    C.fonts = { head: opt.head ?? '"ZCOOL QingKe HuangYou", "PingFang SC", sans-serif', body: opt.body ?? '"PingFang SC", "Noto Sans SC", sans-serif' };
    C.shadow = opt.shadow ?? 1;
    C.lead = opt.lead ?? 0.3;
    C.SHAPES = SHAPES; C.union = union; C.tube = tube;   // build your own shape: shape: (r) => C.union((g) => { C.tube(g, points, radius0, radius1); g.arc(...) })
    const uid = () => ++C.n;

    // ---------- paper ----------
    // gouache-brushed paper: base colour + strokes in one direction (broad strokes a little lighter / darker) + fine bristle lines + very light grain. The texture is a static tile (the render compresses well)
    const TEX = {}, S = 384;
    C.texture = (color, kind = 'gouache') => {
      const key = color + '|' + kind;
      if (TEX[key]) return TEX[key];
      const c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d'), r = rng(hashStr(key)), desk = kind === 'desk', a0 = r() * Math.PI;
      g.fillStyle = color; g.fillRect(0, 0, S, S);
      const dark = lum(color) < 0.08;
      const stroke = (x, y, an, l, bend) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.beginPath(); g.moveTo(x + dx, y + dy); g.quadraticCurveTo(x + dx + (Math.cos(an) * l) / 2 - Math.sin(an) * bend, y + dy + (Math.sin(an) * l) / 2 + Math.cos(an) * bend, x + dx + Math.cos(an) * l, y + dy + Math.sin(an) * l); g.stroke(); } };
      g.lineCap = 'round';
      for (let j = 0; j < (desk ? 0 : 150); j++) {
        const light = r() < 0.5, a = (desk ? 0.008 : 0.03) + r() * (desk ? 0.01 : 0.035) * (dark ? 1.6 : 1);
        g.strokeStyle = light ? `rgba(255,255,255,${f3(a)})` : `rgba(0,0,0,${f3(a * 0.7)})`; g.lineWidth = (desk ? 30 : 6) + r() * (desk ? 60 : 16);
        stroke(r() * S, r() * S, a0 + (r() - 0.5) * 0.3, 140 + r() * 240, (r() - 0.5) * 30);
      }
      // fine bristle lines: along the stroke direction
      for (let j = 0; j < (desk ? 0 : 150); j++) { g.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${f3(0.03 + r() * 0.03)})` : `rgba(0,0,0,${f3(0.02 + r() * 0.025)})`; g.lineWidth = 0.7 + r() * 1.1; stroke(r() * S, r() * S, a0 + (r() - 0.5) * 0.15, 30 + r() * 110, (r() - 0.5) * 8); }
      // backing paper: scattered fibres
      for (let j = 0; j < (desk ? 260 : 0); j++) { g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.18)' : 'rgba(90,70,40,.07)'; g.lineWidth = 0.5 + r() * 0.6; stroke(r() * S, r() * S, r() * Math.PI, 3 + r() * 14, (r() - 0.5) * 6); }
      const img = g.getImageData(0, 0, S, S), d = img.data, amt = desk ? 6 : 7;
      for (let i = 0; i < d.length; i += 4) { const v = (r() - 0.5) * amt; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
      g.putImageData(img, 0, 0);
      return (TEX[key] = c.toDataURL('image/jpeg', 0.92));
    };
    C.surface = (color, ox = 0, oy = 0, kind) => `background-color:${color};background-image:url(${C.texture(color, kind)});background-size:${S}px ${S}px;background-position:${f1(ox)}px ${f1(oy)}px;`;
    C.desk = (parent, o = {}) => el('div', `inset:0;${C.surface(o.color ?? C.paper, 0, 0, 'desk')}${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);

    // hand-cut edge: resample the outline by arc length → add low-frequency noise along the normal (an unsteady hand) → keep one vertex every 2–4 points (short straight snips; corners kept)
    C.cutPath = (raw, w, h, seed, rough = 1) => {
      const r = rng(seed), pts = normPts(raw).map(([x, y]) => [x * w, y * h]);
      const size = Math.sqrt(w * h), step = clamp(size * 0.008, 1.5, F.px(6)), P0 = resample(pts, step), N = P0.length;
      const K = Math.max(5, Math.round(N / 22)), nv = Array.from({ length: K }, () => r() * 2 - 1);
      const amp = rough * Math.min(size * 0.013, F.px(7), Math.min(w, h) * 0.06);
      const nz = (i) => { const p = (i / N) * K, a = Math.floor(p), f = p - a, s = f * f * (3 - 2 * f); return lerp(nv[a % K], nv[(a + 1) % K], s); };
      const Q = P0.map((p, i) => { const a = P0[(i - 1 + N) % N], b = P0[(i + 1) % N]; let nx = b[1] - a[1], ny = a[0] - b[0]; const l = Math.hypot(nx, ny) || 1; const dd = amp * nz(i) + amp * 0.22 * (r() * 2 - 1); return [p[0] + (nx / l) * dd, p[1] + (ny / l) * dd]; });
      const out = []; let next = 0;
      for (let i = 0; i < N; i++) {
        const a = P0[(i - 1 + N) % N], p = P0[i], b = P0[(i + 1) % N];
        let turn = Math.abs(Math.atan2(b[1] - p[1], b[0] - p[0]) - Math.atan2(p[1] - a[1], p[0] - a[0])); if (turn > Math.PI) turn = TAU - turn;
        if (i >= next || turn > 0.45) { out.push(Q[i]); next = i + 2 + Math.floor(r() * 3); }
      }
      return { pts: out, d: 'M' + out.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(' L') + ' Z' };
    };
    const rawShape = (o, seed) => { const s = o.shape ?? 'blob'; if (typeof s === 'function') return s(rng(seed + 1), o); if (Array.isArray(s)) return s; const fn = SHAPES[s]; if (!fn) throw new Error(`没有这种剪纸形状：${s}（有：${Object.keys(SHAPES).join(' / ')}，或者传点列 / 函数）`); return fn(rng(seed + 1), o); };

    // shadow: lift 0 = pasted flat (very light), 1 = picked up (big, soft, offset to the lower right: light comes from the upper left)
    const shadowCss = (lift, k = 1) => { const L = Math.max(0, lift), a = (0.2 - 0.06 * Math.min(1, L)) * C.shadow * k; return `drop-shadow(${f1(F.px(1.6 + 12 * L))}px ${f1(F.px(2.4 + 18 * L))}px ${f1(F.px(2.5 + 20 * L))}px rgba(52,38,22,${f3(a)}))`; };
    C.shadowCss = shadowCss;

    // ---------- scissors ----------
    // flat-colour scissors (dark blades + coloured handles), pointing right; the cutting point is at (100, 40) (in a 160 × 80 design box)
    const scissors = (parent, k, color) => {
      const s = el('div', `left:0;top:0;width:${f1(160 * k)}px;height:${f1(80 * k)}px;transform-origin:${f1(100 * k)}px ${f1(40 * k)}px;pointer-events:none;display:none`, parent);
      const svg = svgEl('svg', { width: f1(160 * k), height: f1(80 * k), viewBox: '0 0 160 80', style: 'position:absolute;left:0;top:0;overflow:visible' }, s);
      const half = (up) => {
        const g = svgEl('g', {}, svg);
        svgEl('path', { d: up ? 'M64 37 L154 39.2 L156 40.4 L66 44 Z' : 'M64 43 L154 40.8 L156 39.6 L66 36 Z', fill: '#2A2B2F', stroke: '#8E939B', 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, g);
        svgEl('path', { d: up ? 'M70 41 L44 52' : 'M70 39 L44 28', stroke: color, 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
        svgEl('ellipse', { cx: 28, cy: up ? 56 : 24, rx: 18, ry: 12.5, fill: 'none', stroke: color, 'stroke-width': 7 }, g);
        return g;
      };
      const A = half(true), B = half(false);
      svgEl('circle', { cx: 70, cy: 40, r: 3.4, fill: '#D9D6CF', stroke: '#2A2B2F', 'stroke-width': 1.2 }, svg);
      return { el: s, pose(x, y, ang, open, show) { set(s, { display: show ? '' : 'none' }); if (!show) return; set(s, { transform: `translate(${f1(x - 100 * k)}px,${f1(y - 40 * k)}px) rotate(${f1(ang)}deg)` }); A.setAttribute('transform', `rotate(${f1(-open)} 70 40)`); B.setAttribute('transform', `rotate(${f1(open)} 70 40)`); } };
    };
    C.scissors = scissors;

    // ---------- one paper cut-out ----------
    // o: { shape, color, x, y (centre), w, h, rot (degrees), z, seed, rough (how irregular the edge is, default 1),
    //      at (moment it settles), until (moment it is fully gone), lead (how early pasting starts, default 0.3), enter: paste | cut | fade | none, exit: peel | lift | drop | fade | none, exitDur,
    //      cutDur (cutting duration, default 0.9), scissors (handle colour), sway: { amp (degrees), period (seconds) } or a number, drift: { vx, vy (px/s), spin (degrees/s) },
    //      from: [dx, dy] (which side it drops in from when pasted, default upper left), tilt (lift angle as it drops, default 16), sfx (sound on settling, false = none), shadow (shadow strength multiplier) }
    // returns p: p.el (outer element, to put into other layers), p.inner (put content on the paper: text, small icons), p.move(at, dur, { x, y, rot, s }, { lift, ease }), p.cutEnd (moment cutting ends)
    C.piece = (parent, o) => {
      const id = uid(), seed = o.seed ?? C.seed * 7919 + id * 104729, r = rng(seed), w = o.w, h = o.h ?? o.w, color = o.color ?? C.colors.blue;
      const shape = C.cutPath(rawShape(o, seed), w, h, seed, o.rough ?? 1);
      const at = o.at ?? 0, lead = o.lead ?? C.lead, enter = o.enter ?? 'paste', exit = o.exit ?? 'peel', until = o.until ?? 1e9;
      const exitDur = o.exitDur ?? (exit === 'peel' ? 0.5 : exit === 'drop' ? 0.55 : 0.35);
      const start = enter === 'paste' || enter === 'cut' ? at - lead : enter === 'fade' ? at - 0.25 : at;
      const ox = -r() * S, oy = -r() * S;
      const wrap = el('div', `left:0;top:0;width:${f1(w)}px;height:${f1(h)}px;transform-origin:50% 50%;display:none;pointer-events:none;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      let sheet = null, scrap = null, cutLine = null, sc = null, cutPts = null, cutL = null, m = 0;
      const cutDur = o.cutDur ?? 0.9, cutStart = at + 0.08, cutEnd = enter === 'cut' ? cutStart + cutDur : at;
      if (enter === 'cut') {
        // an uncut sheet (same colour, a size larger); after cutting, the outer ring (scrap) falls away
        m = Math.max(F.px(30), Math.sqrt(w * h) * 0.14);
        const sh = C.cutPath(SHAPES.rect(), w + 2 * m, h + 2 * m, seed + 5, 0.8);
        const inner = shape.pts.map(([x, y]) => `${f1(x + m)} ${f1(y + m)}`).join(' L');
        sheet = el('div', `left:${f1(-m)}px;top:${f1(-m)}px;width:${f1(w + 2 * m)}px;height:${f1(h + 2 * m)}px;clip-path:path('${sh.d}');${C.surface(color, ox + m, oy + m)}`, wrap);
        scrap = el('div', `left:${f1(-m)}px;top:${f1(-m)}px;width:${f1(w + 2 * m)}px;height:${f1(h + 2 * m)}px;clip-path:path(evenodd, '${sh.d} M${inner} Z');${C.surface(color, ox + m, oy + m)};display:none;transform-origin:50% 0%`, wrap);
        // the scissors enter from the paper's top edge, go to the shape's topmost point, then cut round the outline
        let k0 = 0; shape.pts.forEach((p, i) => { if (p[1] < shape.pts[k0][1]) k0 = i; });
        const loop = [...shape.pts.slice(k0), ...shape.pts.slice(0, k0 + 1)];
        cutPts = [[loop[0][0], -m * 0.98], ...loop]; cutL = [0];
        for (let i = 1; i < cutPts.length; i++) cutL.push(cutL[i - 1] + Math.hypot(cutPts[i][0] - cutPts[i - 1][0], cutPts[i][1] - cutPts[i - 1][1]));
        const svg = svgEl('svg', { width: f1(w), height: f1(h), style: 'position:absolute;left:0;top:0;overflow:visible' }, null);
        cutLine = svgEl('polyline', { fill: 'none', stroke: C.paper, 'stroke-width': f1(F.px(2.6)), 'stroke-linejoin': 'round', 'stroke-linecap': 'round', points: '' }, svg);
        sc = scissors(wrap, F.px(o.scissorsSize ?? 1.7), o.scissors ?? C.colors.red);
        wrap.insertBefore(svg, sc.el);
        // the scissors open and close: one sound each time they close
        const per = o.snip ?? 0.27;
        for (let tc = cutStart + per; tc < cutEnd - 0.05; tc += per) F.sfx(tc, 'snip', 0.5, { size: 0.4 });
        F.sfx(cutEnd + 0.05, 'rustle', 0.4, { dur: 0.45 });
      }
      const face = el('div', `left:0;top:0;width:${f1(w)}px;height:${f1(h)}px;clip-path:path('${shape.d}');${C.surface(color, ox, oy)}`, wrap);
      if (sc) wrap.appendChild(sc.el); // scissors above the paper
      const inner = el('div', 'inset:0', wrap);
      if (enter === 'paste' || enter === 'cut' || enter === 'none') F.appear(start);
      if (o.sfx !== false && enter !== 'none') F.sfx(at, o.sfx ?? 'paste', o.gain ?? 0.5, { size: clamp(Math.sqrt(w * h) / F.px(900)) });
      const base = { x: o.x, y: o.y, rot: o.rot ?? 0, s: o.s ?? 1 };
      const moves = [];
      const [fx, fy] = o.from ?? [-0.35 - r() * 0.3, -1];
      const tilt0 = o.tilt ?? 16, tAx = [0.3 + r() * 0.7, -(0.3 + r() * 0.7)], rot0 = (r() - 0.5) * 14;
      const sway = typeof o.sway === 'number' ? { amp: o.sway, period: 3 } : o.sway, swPh = r() * TAU;
      const peelEdge = o.edge ?? ['right', 'top', 'left'][Math.floor(r() * 3)];
      const p = {
        el: wrap, face, inner, w, h, cutEnd, at, start, until, shape,
        move(t0, dur, to, mo = {}) { moves.push({ at: t0, dur, to, lift: mo.lift ?? 0.7, ease: mo.ease ?? E.cubicInOut }); moves.sort((a, b) => a.at - b.at); if (mo.sfx !== false) F.sfx(t0, mo.sfx ?? 'rustle', 0.35, { dur }); return p; },
        poseAt(t) { const c = { ...base }; let lift = 0; for (const mv of moves) { if (t <= mv.at) break; const q = seg(t, mv.at, mv.at + mv.dur, mv.ease); for (const k in mv.to) c[k] = lerp(c[k], mv.to[k], q); if (q < 1) lift = Math.max(lift, Math.sin(Math.PI * q) * mv.lift); } return [c, lift]; },
      };
      F.add((t) => {
        const on = t >= start && t < until;
        set(wrap, { display: on ? '' : 'none' });
        if (!on) return;
        let [c, lift] = p.poseAt(t);
        let x = c.x, y = c.y, rot = c.rot, s = c.s, op = 1, tx = 0, ty = 0, ax = tAx[0], ay = tAx[1], th = 0, origin = '50% 50%';
        if (o.drift) { const dt = t - start; x += (o.drift.vx ?? 0) * dt; y += (o.drift.vy ?? 0) * dt; rot += (o.drift.spin ?? 0) * dt; }
        if (sway) { const ph = TAU * (t - start) / (sway.period ?? 3) + swPh; rot += (sway.amp ?? 2) * Math.sin(ph); y += F.px(sway.bob ?? 4) * Math.sin(ph * 0.5 + 1); }
        // pasting: drops in from the upper left, the lifted edge lands first, and as it flattens the other edge gives a small bounce
        if ((enter === 'paste' || enter === 'cut') && t < at + 0.4) {
          const q = seg(t, at - lead, at, E.quartOut), up = 1 - q;
          lift = Math.max(lift, up * 1.1); s *= 1 + 0.07 * up; rot += rot0 * up; tx += fx * F.px(70) * up; ty += fy * F.px(55) * up;
          th = tilt0 * up + (t > at ? -tilt0 * 0.42 * Math.sin(Math.PI * seg(t, at, at + 0.34)) * (1 - seg(t, at, at + 0.34)) : 0);
          op = clamp((t - (at - lead)) / 0.07);
        } else if (enter === 'fade') op = seg(t, at - 0.25, at, E.sine);
        // cut done: the paper is lifted a little
        if (enter === 'cut' && t > cutEnd && t < cutEnd + 0.5) lift = Math.max(lift, 0.35 * Math.sin(Math.PI * seg(t, cutEnd, cutEnd + 0.5)));
        // exit
        if (t > until - exitDur && exit !== 'none') {
          const q = seg(t, until - exitDur, until, cubicIn);
          if (exit === 'peel') {
            const dir = { right: [1, 0], left: [-1, 0], top: [0, -1], bottom: [0, 1] }[peelEdge];
            origin = { right: '0% 50%', left: '100% 50%', top: '50% 100%', bottom: '50% 0%' }[peelEdge];
            ax = dir[1] ? 1 : 0; ay = dir[0] ? 1 : 0; th = (dir[0] > 0 || dir[1] > 0 ? -1 : 1) * 70 * E.sine(q) * (dir[1] ? -1 : 1);
            tx += dir[0] * Math.max(w, F.px(300)) * 0.9 * q * q; ty += dir[1] * Math.max(h, F.px(300)) * 0.9 * q * q; lift = Math.max(lift, q * 1.2); op = 1 - seg(q, 0.55, 1);
          } else if (exit === 'lift') { lift = Math.max(lift, q * 1.3); s *= 1 + 0.12 * q; tx -= F.px(40) * q; ty -= F.px(80) * q; op = 1 - seg(q, 0.3, 1); }
          else if (exit === 'drop') { ty += F.H * 0.5 * q * q; rot += 25 * q * (rot0 > 0 ? 1 : -1); op = 1 - seg(q, 0.6, 1); }
          else if (exit === 'fade') op = 1 - q;
        }
        const tf = `translate(${f1(x - w / 2 + tx)}px,${f1(y - h / 2 + ty)}px) rotate(${f1(rot)}deg)` + (Math.abs(th) > 0.05 ? ` perspective(${f1(F.px(1600))}px) rotate3d(${f3(ax)},${f3(ay)},0,${f1(th)}deg)` : '') + ` scale(${f3(s)})`;
        set(wrap, { transform: tf, transformOrigin: origin, opacity: f3(op), filter: shadowCss(lift, o.shadow ?? 1) });
        if (enter === 'cut') {
          const cutting = t >= cutStart && t < cutEnd, done = t >= cutEnd, q = seg(t, cutStart, cutEnd, E.sine);
          set(sheet, { display: done ? 'none' : '' }); set(scrap, { display: done && t < cutEnd + 0.6 ? '' : 'none' });
          if (done) { const qd = seg(t, cutEnd, cutEnd + 0.6, E.quartIn); set(scrap, { transform: `translate(${f1(F.px(20) * qd)}px,${f1(F.px(260) * qd)}px) rotate(${f1(9 * qd)}deg)`, opacity: f3(1 - seg(qd, 0.5, 1)) }); }
          // the cut slit: drawn from the entry point to the current position
          const L = cutL[cutL.length - 1] * q; let i = 1; while (i < cutL.length - 1 && cutL[i] < L) i++;
          const a = cutPts[i - 1], b = cutPts[i], k = (L - cutL[i - 1]) / (cutL[i] - cutL[i - 1] || 1), pt = [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
          set(cutLine, { display: cutting ? '' : 'none' });
          if (cutting) cutLine.setAttribute('points', cutPts.slice(0, i).concat([pt]).map(([x0, y0]) => `${f1(x0)},${f1(y0)}`).join(' '));
          // scissors: along the tangent, opening and closing; slide off the paper when done
          const look = cutPts[Math.min(cutPts.length - 1, i + 3)], ang = (Math.atan2(look[1] - pt[1], look[0] - pt[0]) * 180) / Math.PI;
          const open = 16 * (0.5 + 0.5 * Math.cos((TAU * (t - cutStart)) / (o.snip ?? 0.27)));
          const showS = t >= at - 0.05 && t < cutEnd + 0.3, qa = seg(t, at - 0.05, cutStart, E.quartOut), qx = seg(t, cutEnd, cutEnd + 0.3, E.quartIn);
          sc.pose(pt[0] - F.px(120) * (1 - qa) + F.px(200) * qx, pt[1] - F.px(60) * (1 - qa) - F.px(120) * qx, ang, open, showS);
          set(sc.el, { opacity: f3(Math.min(qa, 1 - qx)) });
        }
      });
      return p;
    };

    // ---------- pasted photo (real material) ----------
    // Screenshots and covers are pasted as-is on a hand-cut paper mat: the image itself is not stylised (square, colours unchanged); the cut-paper feel comes only from the mat, the pasting motion and the shadow; two strips of washi tape can be added.
    // o: { src, x, y (centre), w, h (displayed image size), crop: { x, y, w, h } (take only part of the image, 0–1; then h = w × image height × crop.h / (image width × crop.w)),
    //      mat (mat colour, default white; false = no mat, just image and shadow), pad (mat margin, default 14), tape (true = washi tape on the top two corners), radius (image corner radius),
    //      rot, at, until, enter, exit, z, sfx, seed, sway, from, edge, lead }  → p (p.img is the image element; p.w / p.h include the mat)
    C.photo = (parent, o) => {
      const pad = o.mat === false ? 0 : F.px(o.pad ?? 14), w = o.w + 2 * pad, h = o.h + 2 * pad;
      const p = C.piece(parent, { ...o, shape: 'rect', color: o.mat || C.colors.white, w, h, rough: o.rough ?? 0.45, tilt: o.tilt ?? 10 });
      if (o.mat === false) p.face.style.display = 'none';
      const c = o.crop ?? { x: 0, y: 0, w: 1, h: 1 }, iw = o.w / c.w, ih = o.h / c.h;
      const box = el('div', `left:${f1(pad)}px;top:${f1(pad)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;overflow:hidden;${o.radius ? `border-radius:${f1(F.px(o.radius))}px;` : ''}`, p.inner);
      const img = el('img', `left:${f1(-c.x * iw)}px;top:${f1(-c.y * ih)}px;width:${f1(iw)}px;height:${f1(ih)}px;max-width:none`, box);
      img.src = o.src;
      p.img = img;
      const tp = o.tape ? el('div', 'inset:0;opacity:.86', p.inner) : null;   // washi tape is translucent (piece writes its own opacity every frame, so the transparency goes on an outer layer)
      if (o.tape) [[0.12, -4], [0.88, 5]].forEach(([fx, rot], i) => {
        C.piece(tp, { shape: 'rect', color: '#F1EADB', x: w * fx, y: F.px(6), w: Math.max(F.px(60), w * 0.22), h: F.px(34), rot: rot + (i ? 30 : -30), at: (o.at ?? 0) + 0.08, until: o.until, exit: 'none', sfx: false, rough: 1.2, seed: (o.seed ?? 1) * 13 + i, shadow: 0.5 });
      });
      return p;
    };

    // ---------- collage ----------
    // o: { at, every (default half a beat), until, items: [{ shape, color, x, y, w, h, rot, ... }], defaults, sfxEvery (sound every how many pieces, default 2) }
    C.collage = (parent, o) => o.items.map((it, i) => C.piece(parent, { ...(o.defaults || {}), ...it, at: it.at ?? o.at + i * (o.every ?? F.B / 2), until: it.until ?? o.until, sfx: it.sfx ?? (i % (o.sfxEvery ?? 2) === 0 ? 'paste' : false) }));

    // ---------- human figure ----------
    // A person made of a few same-colour pieces (like the Blue Nudes): head, torso, two arms, two legs. o: { x, y (centre), h (height), color, pose: dance | stand | reach or your own part list, at, every, until, sway }
    const POSES = {
      dance: [['circle', 0.04, -0.4, 0.15, 0.16, 0], ['capsule', 0, -0.13, 0.22, 0.36, 6], ['capsule', -0.17, -0.4, 0.075, 0.32, -32], ['capsule', 0.2, -0.37, 0.075, 0.3, 40], ['capsule', -0.07, 0.2, 0.11, 0.42, 12], ['capsule', 0.15, 0.15, 0.1, 0.4, -50]],
      stand: [['circle', 0, -0.41, 0.15, 0.16, 0], ['capsule', 0, -0.14, 0.22, 0.36, 0], ['capsule', -0.15, -0.12, 0.07, 0.32, 14], ['capsule', 0.15, -0.12, 0.07, 0.32, -14], ['capsule', -0.06, 0.24, 0.1, 0.44, 4], ['capsule', 0.06, 0.24, 0.1, 0.44, -4]],
      reach: [['circle', -0.02, -0.38, 0.15, 0.16, 0], ['capsule', 0, -0.12, 0.22, 0.36, -8], ['capsule', 0.2, -0.3, 0.075, 0.34, 62], ['capsule', -0.18, -0.08, 0.07, 0.3, 30], ['capsule', -0.04, 0.24, 0.1, 0.43, 8], ['capsule', 0.1, 0.23, 0.1, 0.43, -16]],
    };
    C.figure = (parent, o) => {
      const H = o.h, parts = Array.isArray(o.pose) ? o.pose : POSES[o.pose ?? 'dance'];
      return parts.map(([shape, dx, dy, w, h, rot], i) => C.piece(parent, { shape, color: o.color ?? C.colors.blue, x: o.x + dx * H, y: o.y + dy * H, w: w * H, h: h * H, rot, taper: shape === 'capsule' ? 0.32 : 0, at: o.at + i * (o.every ?? 0.08), until: o.until, exit: o.exit, sway: o.sway, z: o.z, sfx: i === 0 ? 'paste' : false, rough: 0.8 }));
    };

    // ---------- drifting paper bits ----------
    // o: { at, until, n, area: { x, y, w, h }, shapes, colors, size: [min, max], speed (drift speed multiplier), z, seed }
    C.drift = (parent, o) => {
      const r = rng(o.seed ?? 77), A = o.area ?? { x: 0, y: 0, w: F.W, h: F.H }, shapes = o.shapes ?? ['leaf', 'star', 'coral', 'blob', 'spiral'], cols = o.colors ?? [C.colors.blue, C.colors.red, C.colors.yellow, C.colors.green], [s0, s1] = o.size ?? [F.px(70), F.px(150)], sp = o.speed ?? 1;
      return Array.from({ length: o.n ?? 8 }, (_, i) => { const sh = shapes[i % shapes.length], sz = lerp(s0, s1, r()), tall = sh === 'leaf' || sh === 'coral';
        return C.piece(parent, { shape: sh, color: cols[i % cols.length], x: A.x + r() * A.w, y: A.y + r() * A.h, w: tall ? sz * 0.6 : sz, h: sz, rot: r() * 360, at: o.at + i * (o.every ?? 0.07), until: o.until ? o.until - (o.n - 1 - i) * 0.04 : undefined, exit: o.exit ?? 'lift', sfx: false, z: o.z, sway: { amp: 4 + r() * 5, period: 2.5 + r() * 2, bob: 6 }, drift: { vx: (r() - 0.5) * F.px(30) * sp, vy: -F.px(8 + r() * 14) * sp, spin: (r() - 0.5) * 20 * sp } });
      });
    };

    // ---------- cut-out big title ----------
    // Each letter is like a cut piece of coloured paper, slightly askew, colours varying, pasted one by one; on exit lifted off one by one.
    // o: { at (first letter settles), until, text (\n for line breaks), size, x, y (centre of the line), align: center | left | right, colors (cycled per letter; one-to-one when the length matches the letter count),
    //      every (gap between letters, default 0.05), jitter (how askew, default 1), font, weight, maxW (shrinks automatically if too wide), kind (default headline), sfx, z, exit: lift | peel | none }
    C.title = (parent, o) => {
      const size = F.px(o.size ?? 150), until = o.until ?? 1e9, r = rng(o.seed ?? hashStr(o.text)), align = o.align ?? 'center', every = o.every ?? 0.05, lead = 0.22, jit = o.jitter ?? 1;
      const cols = o.colors ?? [C.colors.blue, C.colors.red, C.colors.green, C.colors.yellow, C.colors.black];
      const left = align === 'left' ? o.x ?? 0 : align === 'right' ? (o.x ?? F.W) - 2 * F.W : (o.x ?? F.W / 2) - F.W;
      const lines = String(o.text).split('\n').length;
      const box = el('div', `left:${f1(left)}px;width:${f1(2 * F.W)}px;top:${f1((o.y ?? F.H / 2) - (size * 1.15 * lines) / 2)}px;text-align:${align};white-space:nowrap;display:none;pointer-events:none;font:${o.weight ?? 400} ${f1(size)}px/1.15 ${o.font ?? C.fonts.head};transform-origin:${align === 'left' ? '0%' : align === 'right' ? '100%' : '50%'} 50%;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      const chars = []; let ci = 0;
      for (const ch of Array.from(String(o.text))) {
        if (ch === '\n') { box.appendChild(document.createElement('br')); continue; }
        if (ch === ' ') { box.appendChild(document.createTextNode(' ')); continue; }
        const c = el('span', `position:relative;display:inline-block;color:${cols.length === Array.from(String(o.text).replace(/[\s\n]/g, '')).length ? cols[ci] : cols[ci % cols.length]};margin:0 ${f1(size * 0.015)}px`, box); c.textContent = ch;
        chars.push({ el: c, i: ci, rot: (r() - 0.5) * 8 * jit, dy: (r() - 0.5) * 0.06 * size * jit, s: 1 + (r() - 0.5) * 0.06 * jit, fx: (r() - 0.5) * 2 });
        ci++;
      }
      // shrink if too wide: measure only the letters (the box is 2W wide); the parent layer may not be shown yet, so measure on the stage first
      const n = chars.length, fit = 1; let fitK = 1;
      if (o.maxW !== false) { F.stage.appendChild(box); set(box, { display: '' }); const rg = document.createRange(); rg.selectNodeContents(box); const tw = rg.getBoundingClientRect().width, lim = o.maxW ?? F.W * 0.92; if (tw > lim) fitK = lim / tw; set(box, { display: 'none' }); parent.appendChild(box); }
      F.text(box, o.kind ?? 'headline', String(o.text).replace(/\n/g, ''), o.at - lead, until);
      if (o.sfx !== false) { F.sfx(o.at, o.sfx ?? 'paste', o.gain ?? 0.55, { size: 0.6 }); if (n > 5 && o.sfxEnd !== false) F.sfx(o.at + (n - 1) * every, o.sfx ?? 'paste', (o.gain ?? 0.55) * 0.7, { size: 0.5 }); }
      F.appear(o.at - lead);
      const exitDur = 0.32, exit = o.exit ?? 'lift';
      F.add((t) => {
        const on = t >= o.at - lead && t < until;
        set(box, { display: on ? '' : 'none' });
        if (!on) return;
        set(box, { transform: `scale(${f3(fit * fitK)})` });
        for (const c of chars) {
          const land = o.at + c.i * every, q = seg(t, land - lead, land, E.quartOut), up = 1 - q;
          let lift = up, op = clamp((t - (land - lead)) / 0.06), x = c.fx * size * 0.12 * up, y = c.dy - size * 0.22 * up, rot = c.rot + c.fx * 12 * up, s = c.s * (1 + 0.14 * up);
          if (t > land && t < land + 0.3) { const b = Math.sin(Math.PI * seg(t, land, land + 0.3)) * (1 - seg(t, land, land + 0.3)); s *= 1 - 0.03 * b; }
          if (exit !== 'none') { const t0 = until - exitDur - (n - 1 - c.i) * every * 0.5, qe = seg(t, t0, t0 + exitDur, cubicIn); if (qe > 0) { lift = Math.max(lift, qe * 1.2); y -= size * 0.35 * qe; x += c.fx * size * 0.2 * qe; rot += c.fx * 14 * qe; op = Math.min(op, 1 - seg(qe, 0.35, 1)); } }
          set(c.el, { transform: `translate(${f1(x)}px,${f1(y)}px) rotate(${f1(rot)}deg) scale(${f3(s)})`, opacity: f3(op), filter: shadowCss(lift * 0.8, 0.9) });
        }
      });
      return { el: box, chars };
    };

    // ---------- paper strip ----------
    // A hand-cut rectangular strip with DOM text on it (captions, labels, buttons; large size + head font = a title on a strip). The strip sizes to the text.
    // o: { at, until, text, size (design size, default 46), x, y (centre y), align: center | left | right (x is centre / left edge / right edge), paper (paper colour), ink (text colour, picked from the paper colour by default),
    //      font, weight, maxW (max text width; wraps beyond it), pad: [horizontal, vertical] (relative to font size), rot, kind (default label), enter, exit, z, sfx, textAlign }
    C.strip = (parent, o) => {
      const size = F.px(o.size ?? 46), paper = o.paper ?? C.colors.white, ink = o.ink ?? (lum(paper) < 0.35 ? '#FFFFFF' : C.ink), [pxk, pyk] = o.pad ?? [0.55, 0.3];
      const tx = el('div', `left:0;top:0;font:${o.weight ?? 700} ${f1(size)}px/1.28 ${o.font ?? C.fonts.body};color:${ink};white-space:${o.maxW ? 'normal' : 'nowrap'};${o.maxW ? `width:max-content;max-width:${f1(o.maxW)}px;` : ''}text-align:${o.textAlign ?? 'left'};letter-spacing:${o.spacing ?? '0.01em'}`, F.stage);   // measure on the stage first (the parent layer may not be shown yet)
      tx.textContent = o.text;
      const tw = tx.offsetWidth, th = tx.offsetHeight, w = tw + 2 * size * pxk, h = th + 2 * size * pyk;
      const align = o.align ?? 'center', cx = align === 'left' ? o.x + w / 2 : align === 'right' ? o.x - w / 2 : o.x ?? F.W / 2;
      const rs = rng(o.seed ?? hashStr(o.text) + 3);
      const p = C.piece(parent, { shape: 'rect', color: paper, x: cx, y: o.y, w, h, rot: o.rot ?? (rs() - 0.5) * 3, at: o.at, until: o.until, enter: o.enter, exit: o.exit ?? 'peel', z: o.z, rough: o.rough ?? 0.7, sfx: o.sfx, gain: o.gain ?? 0.4, seed: o.seed, sway: o.sway, lead: o.lead, from: o.from, tilt: o.tilt ?? 10, edge: o.edge });
      p.inner.appendChild(tx);
      set(tx, { left: `${f1(size * pxk)}px`, top: `${f1(size * pyk)}px` });
      F.text(tx, o.kind ?? 'label', o.text, p.start, o.until ?? 1e9);
      p.text = tx;
      return p;
    };

    // ---------- peel / reveal ----------
    // A layer (any element: a layer, a piece of paper, a card) is lifted from its edge side, flips up and flies off, revealing the layer below. o: { at, dur (default 0.6), edge: right | left | top | bottom, angle (max lift angle, default 75), sfx }
    C.peel = (elx, o) => {
      const d = o.dur ?? 0.6, edge = o.edge ?? 'right', dir = { right: [1, 0], left: [-1, 0], top: [0, -1], bottom: [0, 1] }[edge];
      const origin = { right: '0% 50%', left: '100% 50%', top: '50% 100%', bottom: '50% 0%' }[edge];
      if (o.sfx !== false) F.sfx(o.at, o.sfx ?? 'lift', 0.55, { dur: d, dir: dir[0] });
      F.blur(o.at, o.at + d, 10);
      F.add((t) => {
        if (t < o.at) { set(elx, { transform: '', filter: '', opacity: '' }); return; }
        const q = seg(t, o.at, o.at + d, cubicIn), th = (o.angle ?? 75) * E.sine(Math.min(1, q * 1.25));
        const rx = dir[1] ? (dir[1] > 0 ? 1 : -1) * th : 0, ry = dir[0] ? (dir[0] > 0 ? -1 : 1) * th : 0;
        const big = Math.max(F.W, F.H);
        set(elx, { transformOrigin: origin, transform: q >= 1 ? 'translate(-9999px,0)' : `translate(${f1(dir[0] * big * 0.8 * q * q)}px,${f1(dir[1] * big * 0.8 * q * q)}px) perspective(${f1(F.px(2200))}px) rotateX(${f1(rx)}deg) rotateY(${f1(ry)}deg)`, filter: shadowCss(q * 1.4), opacity: f3(1 - seg(q, 0.6, 1)) });
      });
    };

    // ---------- transition: a big sheet of coloured paper covers the frame, then tears open ----------
    // o: { at, dur (default 1.0), color, from: left | right | top | bottom (side it covers from), out: tear (tears open from the middle, default) | slide (keeps sliding off) | peel (peels away), z, seed }
    // Returns the moment of full cover (= at + dur/2; switch scenes then). It holds fully covered for about 10% of the duration.
    C.wipe = (o) => {
      const d = o.dur ?? 1.0, color = o.color ?? C.colors.blue, from = o.from ?? 'left', out = o.out ?? 'tear', r = rng(o.seed ?? Math.round(o.at * 1000) + 9);
      const layer = el('div', `inset:0;pointer-events:none;display:none;z-index:${o.z ?? 850}`, F.stage), group = el('div', 'inset:0', layer);
      const W = F.W, H = F.H, ex = F.px(70), mid = o.at + d / 2;
      // the tear: a vertical jagged line (low-frequency wobble + fine fraying); the paper's outer edges are hand-cut too
      const K = 7, nv = Array.from({ length: K + 1 }, () => r() * 2 - 1), jag = [];
      for (let i = 0; i <= 60; i++) { const v = i / 60, p = v * K, a = Math.floor(p), f = p - a, s = f * f * (3 - 2 * f); jag.push([W / 2 + lerp(nv[a], nv[Math.min(K, a + 1)], s) * W * 0.06 + (r() - 0.5) * F.px(14), -ex + v * (H + 2 * ex)]); }
      const edge = (x0) => Array.from({ length: 24 }, (_, i) => [x0 + (r() - 0.5) * F.px(10), H + ex - (i / 23) * (H + 2 * ex)]);   // bottom to top
      const poly = (pts) => `polygon(${pts.map(([x, y]) => `${f1(x)}px ${f1(y)}px`).join(',')})`;
      const eL = edge(-W * 0.3), eR = edge(W * 1.3), tex = C.surface(color, 0, 0), core = C.surface(C.colors.white, 0, 0);
      // while covering it's one whole sheet (two halves side by side show a thin line at the seam); at the moment of tearing it becomes two halves, the tear showing the white paper core (uneven width)
      const whole = el('div', `inset:0;clip-path:${poly([...eL, ...eR.slice().reverse()])};${tex}`, group);
      const half = (side) => {
        const wrap = el('div', 'inset:0;display:none', group), outer = side < 0 ? eL : eR;
        el('div', `inset:0;clip-path:${poly([...jag.map(([x, y]) => [x - side * (F.px(4) + r() * F.px(10)), y]), ...outer])};${core}`, wrap);
        el('div', `inset:0;clip-path:${poly([...jag, ...outer])};${tex}`, wrap);
        return wrap;
      };
      const L = half(-1), R = half(1);
      if (o.sfx !== false) { F.sfx(o.at, 'cover', 0.7, { dur: d * 0.45, dir: from === 'left' ? 1 : from === 'right' ? -1 : 0 }); F.sfx(o.at + d * 0.55, out === 'tear' ? 'tear' : 'lift', 0.75, { dur: d * 0.4 }); }
      F.blur(o.at, o.at + d, 12);
      const vec = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] }[from];
      F.add((t) => {
        const on = t >= o.at && t < o.at + d;
        set(layer, { display: on ? '' : 'none' });
        if (!on) return;
        const q = (t - o.at) / d, qi = E.cubicInOut(clamp(q / 0.45)), qo = clamp((q - 0.55) / 0.45);
        // covering: the whole sheet slides in from one side, slightly askew and lifted off the surface (big shadow), flattening once it covers
        const k = 1 - qi, dist = (vec[0] ? W : H) * 1.45;
        let gt = `translate(${f1(vec[0] * dist * k)}px,${f1(vec[1] * dist * k)}px) rotate(${f1(vec[0] * -3 * k + vec[1] * 2 * k)}deg)`;
        let lt = '', rt = '', lift = k;
        if (q > 0.55) {
          const e = cubicIn(qo);
          if (out === 'tear') { lt = `translate(${f1(-W * 0.75 * e)}px,${f1(F.px(30) * e)}px) rotate(${f1(-7 * e)}deg)`; rt = `translate(${f1(W * 0.75 * e)}px,${f1(-F.px(20) * e)}px) rotate(${f1(6 * e)}deg)`; lift = e * 0.8; }
          else if (out === 'slide') { gt = `translate(${f1(-vec[0] * dist * e)}px,${f1(-vec[1] * dist * e)}px) rotate(${f1(vec[0] * 4 * e)}deg)`; lift = e; }
          else if (out === 'peel') { const th = 80 * E.sine(Math.min(1, e * 1.2)); gt = `translate(${f1(-vec[0] * W * 0.5 * e * e)}px,${f1(-vec[1] * H * 0.5 * e * e)}px) perspective(${f1(F.px(2200))}px) rotateY(${f1(vec[0] ? vec[0] * th : 0)}deg) rotateX(${f1(vec[1] ? -vec[1] * th : 0)}deg)`; lift = e * 1.3; set(group, { transformOrigin: vec[0] < 0 ? '100% 50%' : vec[0] > 0 ? '0% 50%' : vec[1] < 0 ? '50% 100%' : '50% 0%' }); }
        }
        const torn = out === 'tear' && q > 0.55;
        set(group, { transform: gt, filter: torn ? 'none' : shadowCss(lift, 1.4) });
        set(whole, { display: torn ? 'none' : '' }); set(L, { display: torn ? '' : 'none' }); set(R, { display: torn ? '' : 'none' });
        if (torn) { set(L, { transform: lt, filter: shadowCss(lift, 1.4) }); set(R, { transform: rt, filter: shadowCss(lift, 1.4) }); }
      });
      return mid;
    };

    // ---------- end card ----------
    // o: { at (first letter of the title settles), title: { text, colors, size }, tagline, url, cta, y, ring (number of cut-outs in the ring, default 10), gap (beats between texts, default 2 beats / 1 beat), z }
    C.endcard = (parent, o) => {
      const PT = F.portrait; let cy = o.y ?? F.H * 0.4; const ts = o.title.size ?? (PT ? 150 : 190), r = rng(o.seed ?? 4242);
      // mark: a graphic mark above the title (a logo icon made of paper pieces): { h (height), build(parent, x, y, at) }; the title and the text below shift down as a whole
      const mh = o.mark ? F.px(o.mark.h ?? 220) : 0, ty = cy + mh * 0.55;
      const out = {};
      if (o.mark) out.mark = o.mark.build(parent, F.W / 2, ty - F.px(ts) * 0.62 - mh / 2 - F.px(24), o.mark.at ?? o.at - 1);
      const title = C.title(parent, { at: o.at, text: o.title.text, colors: o.title.colors, size: ts, y: ty, kind: 'logo', every: o.title.every ?? 0.06, font: o.title.font, exit: 'none', z: 3 });
      out.title = title;
      cy = ty;
      let yy = cy + F.px(ts) * 0.62 + F.px(70);
      if (o.tagline) {
        const tsz = o.taglineSize ?? (PT ? 60 : 54);
        out.tagline = C.strip(parent, { at: o.taglineAt ?? o.at + (o.gap ?? 2) * F.B, text: o.tagline, size: tsz, y: yy, paper: C.colors.white, kind: 'endcard', exit: 'none', z: 3, maxW: F.W * 0.82, textAlign: 'center' });
        // when a long tagline wraps to two lines: the strip moves down (not covering the title), the URL follows it down
        const extra = Math.max(0, out.tagline.h - F.px(tsz) * (1.28 + 0.6));
        if (extra > 1) out.tagline.move(0, 0.001, { y: yy + extra / 2 }, { sfx: false, lift: 0 });
        yy += F.px(PT ? 135 : 118) + extra;
      }
      if (o.url) out.url = C.strip(parent, { at: o.urlAt ?? o.at + ((o.gap ?? 2) + 1) * F.B, text: o.url, size: o.urlSize ?? (PT ? 62 : 58), y: yy, paper: o.urlPaper ?? C.colors.blue, font: o.urlFont ?? C.fonts.body, kind: 'endcard', exit: 'none', z: 3, sfx: 'paste' });
      // a ring of cut-outs closes in (avoiding the text in the middle), then keeps swaying gently
      const n = o.ring ?? 10, shapes = ['leaf', 'star', 'coral', 'spiral', 'blob', 'leaf', 'wave', 'star'], cols = o.colors ?? [C.colors.blue, C.colors.red, C.colors.yellow, C.colors.green, C.colors.rose];
      out.ring = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * TAU + r() * 0.3, rx = F.W * (PT ? 0.42 : 0.44), ry = F.H * (PT ? 0.44 : 0.4), sz = F.px(PT ? 190 : 210) * (0.75 + 0.5 * r()), sh = shapes[i % shapes.length];
        const tall = sh === 'leaf' || sh === 'coral';
        return C.piece(parent, { shape: sh, color: cols[i % cols.length], x: F.W / 2 + Math.cos(a) * rx, y: F.H / 2 + Math.sin(a) * ry, w: tall ? sz * 0.62 : sh === 'wave' ? sz * 1.4 : sz, h: sh === 'wave' ? sz * 0.5 : sz, rot: (a * 180) / Math.PI + 90 + (r() - 0.5) * 30, at: (o.ringAt ?? o.at - 0.25) + i * 0.05, exit: 'none', sway: { amp: 2.5, period: 3 + r() * 1.5, bob: 5 }, sfx: false, z: 2 });
      });
      return out;
    };

    return P.infoKit ? P.infoKit(C, { piece: 'shape', photo: 'image', figure: 'character' }) : C;   // info-density check: info-carrying components register themselves when called (promo.js's infoKit)
  }

  P.cutout = make;
})();
