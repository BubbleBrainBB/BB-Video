// drawnworld.js: one continuous picture drawn by a pen, then washed with colour (线稿成世界), one of bb-video's visual styles (style notes in styles/drawnworld/STYLE.md). Load after promo.js.
// One film = one picture. A single black stylus with a soft shadow draws a dense ink illustration stroke by stroke on warm white paper; the camera pushes in on what is
// being drawn and eases back to the whole picture so far; the picture grows outward from one starting structure. When the whole thing is on the page a seeded colour wash
// spreads across it and reveals what the lines never showed (sky, hills, trees), and then the world lives: machines turn, things bob, smoke drifts, lights stir.
// Every part is described once (fills + outlines), so the line stage and the colour stage are the same description; nothing is ever redrawn or swapped.
//
//   const W = PROMO.drawnworld(F, { palette: 'market' | 'dusk' | 'morning' | 'night', seed, wobble: 1, captions: { max, size, top, backing: false }, pen: false, penSoft: 0.09, zMax: 1.9, zWide })
//   World units: 1 unit = 1 px of a 1080-short-side frame at zoom 1. y grows downward.
//   PARTS    const p = W.part({ name, in: group, z, lw, ink, colorOnly })   p.shape(pts, { fill, lw, ink, smooth, seeThrough }) closed: fill + outline, occludes what lies behind it
//            p.line(pts, { lw, ink, smooth }) open stroke · p.rect(cx, cy, w, h, o) · p.circle(x, y, r, o) · p.ellipse(x, y, rx, ry, o) · p.arc(x, y, r, a0, a1, o)
//            fill: '#hex' | { v: [top, bottom] } | { h: [left, right] }   later parts are in front of earlier ones (z moves a whole part)
//   LIBRARY  W.post · beam · platform · arcade · label · stairs · ladder · railing · truss · house · window · door · awning · stall · pipe · valve · tank · chimney · smoke · cable · bunting · gear · mesh · wheel
//            windmill · person · queue · crate · barrel · sack · loaf · basket · coin · bill · tag · lamp · sign · belt · cableway · foliage · tree · vine · hill · cloud · sky · birds · glow
//   TEXT     W.write(text, { x, y, size, align, wrap, plate, in, ink, part }) lettered stroke by stroke with the pen (CJK in real stroke order; digits and Latin as single strokes) · W.strike(pts | part, o)
//   TIME     W.group(name, fn) everything built inside fn belongs to the group
//            W.draw(target, { at, until, line, order: 'near' | 'given', strokes: 'given', pull, zoom, pace }) the pen draws a group / part / list within the window, touring to the nearest part and stroke unless told 'given'; line: 'l3' takes the window from the narration
//   COLOUR   W.wash({ at, dur, from: [[x, y], …] | 'left' | 'right' | 'corners', seed, bands }) the one colour reveal; colour-only parts (sky, hills, foliage…) exist only from here on
//   LIFE     p.spin(rps, { x, y, from, ramp }) · p.bob(amp, period, { axis, phase, from }) · p.sway(deg, period, { x, y, phase, from }) · p.blink(period, { duty, min, from })
//            p.drift(pts, { speed, loop, phase, fade, grow, step: { every, dur }, from })   (from: when it starts; default a moment into the wash)
//   CAMERA   automatic: pushes in on what the pen is drawing, eases back to the picture so far after each W.draw with pull, holds the final wide shot. W.final(view) sets the wide shot; W.cam(t, view) adds a key
//   W.L(landscape, portrait, square) · W.toScreen(x, y, t) · W.into(layer, fn) (kit: a sheet of its own on a scene layer)
// Sounds the runtime emits (styles/drawnworld/sound.js): scratch (the pen), tap (a strike-through, a dot), wash (the colour), whirr (a machine starting).
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('drawnworld.js 要在 promo.js 之后加载', 'drawnworld.js must load after promo.js'));
  const { el, set } = P;
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, q) => a + (b - a) * q;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const smooth = (q) => { q = cl(q); return q * q * (3 - 2 * q); };
  const hex = (h) => { const s = String(h).replace('#', ''); return s.length === 3 ? s.split('').map((c) => parseInt(c + c, 16)) : [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
  const toHex = (v) => '#' + v.map((x) => Math.round(cl(x, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mixHex = (a, b, q) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => lerp(v, y[i], q))); };
  const hashS = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const mix32 = (x) => { x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b); return (x ^ (x >>> 16)) >>> 0; };
  const rnd = (seed, i) => mix32((seed ^ Math.imul(i | 0, 0x9e3779b1)) >>> 0) / 4294967296;
  const rngOf = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const noise1 = (seed, x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rnd(seed, i), rnd(seed, i + 1), u) * 2 - 1; };
  const noise2 = (seed, x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), h = (a, b) => rnd(seed + Math.imul(b, 7919), a); return lerp(lerp(h(i, j), h(i + 1, j), u), lerp(h(i, j + 1), h(i + 1, j + 1), u), v) * 2 - 1; };
  const units = (t) => { t = String(t ?? ''); return (t.match(/[^\x00-\xff]/g) || []).length + t.replace(/[^\x00-\xff]/g, '').length * 0.55; };

  // ---------- palettes: paper and line are the style; everything else belongs to the colour stage. Parts take these by role, every part can override ----------
  const PALS = {
    market: { paper: '#f8f6f0', line: '#17161a', ink: '#2b1a22', sky: ['#17598c', '#3f93ad', '#9fd0bd', '#f6e2ad', '#f8b27a'], cloud: '#fff5df', cloudB: '#f7cfa6', hill: ['#5d9fa8', '#3f8590', '#2c6b70'],
      leaf: ['#0d4a46', '#14665a', '#23896a', '#55ad6f', '#9bd178'], bloom: ['#e0567f', '#f28aa0'], trunk: '#6b3a2e',
      wood: '#b4613a', woodD: '#7d3e2b', wall: '#f3dcae', wallB: '#e7b27c', wallC: '#d9e4cf', roof: '#c9452e', roofB: '#23727f', roofC: '#e08a2e', metal: '#62788c', metalD: '#3d4f60', brass: '#dfa93d', glass: '#8fd0d6', lit: '#ffd76e', awn: ['#e4572e', '#fbf1dc'], awnB: ['#1f8a8a', '#fbf1dc'], note: '#fbf3dc', green: '#3f9d6a', skin: ['#f3c9a0', '#d99a6c', '#a86f4b'], cloth: ['#d9483b', '#2e7f8f', '#e0a032', '#5a4f9a', '#3f9d6a', '#c75b8e'] },
    dusk: { paper: '#f8f6f0', line: '#17161a', ink: '#2a1626', sky: ['#20277a', '#5a3fa0', '#c65a9c', '#f58a6e', '#fbc96f'], cloud: '#f9a58f', cloudB: '#d56f96', hill: ['#6d57a6', '#4a3d8e', '#2e2b6b'],
      leaf: ['#0d2f4f', '#114a5e', '#16705f', '#2c9a6a', '#6ccb7a'], bloom: ['#d44f9a', '#f08bb9'], trunk: '#54264c',
      wood: '#a8452f', woodD: '#6d2a25', wall: '#f0b65e', wallB: '#e68a3e', wallC: '#d8796a', roof: '#c8352e', roofB: '#2b6d8c', roofC: '#e0672a', metal: '#5a6a92', metalD: '#343a68', brass: '#f2b83d', glass: '#7fc8e0', lit: '#ffe07a', awn: ['#e8542e', '#fde8c8'], awnB: ['#2b8a9a', '#fde8c8'], note: '#fde8c8', green: '#3f9d6a', skin: ['#f3c9a0', '#d99a6c', '#a86f4b'], cloth: ['#d9483b', '#2e7f8f', '#e0a032', '#5a4f9a', '#3f9d6a', '#c75b8e'] },
    morning: { paper: '#f8f6f0', line: '#17161a', ink: '#2c2430', sky: ['#7cc4e8', '#a9dcec', '#d8efe6', '#fbf1d0', '#fcdcb6'], cloud: '#ffffff', cloudB: '#e3eff2', hill: ['#a3cdb8', '#7fb79d', '#5a9d80'],
      leaf: ['#1e6a50', '#2e8a5e', '#4eaa66', '#83c970', '#bfe08a'], bloom: ['#f07c9a', '#f8b0c0'], trunk: '#7d5238',
      wood: '#c9824f', woodD: '#8f5a38', wall: '#fbeccb', wallB: '#f4cf9f', wallC: '#d8ecdc', roof: '#df6a48', roofB: '#3f90a8', roofC: '#efa63e', metal: '#7d94a8', metalD: '#50667a', brass: '#e8b84a', glass: '#a8e0e8', lit: '#ffe58a', awn: ['#ee6a48', '#fff6e2'], awnB: ['#34a0a4', '#fff6e2'], note: '#fff6e2', green: '#4eaa66', skin: ['#f3c9a0', '#d99a6c', '#a86f4b'], cloth: ['#d9583b', '#2e8f9f', '#e8a832', '#6a5fb0', '#4fad7a', '#d76b9e'] },
    night: { paper: '#f8f6f0', line: '#17161a', ink: '#101226', sky: ['#070b2c', '#12205a', '#27418a', '#4c6fb0', '#8b97c2'], cloud: '#3c4f8f', cloudB: '#2a3a78', hill: ['#23306e', '#1a2558', '#111a44'],
      leaf: ['#061f33', '#0a3144', '#104a50', '#1b6a5e', '#3a8f6a'], bloom: ['#8a4fa8', '#b878c8'], trunk: '#23214a',
      wood: '#7d4538', woodD: '#4d2a2c', wall: '#d9b98a', wallB: '#b98a68', wallC: '#8ea0b0', roof: '#92383c', roofB: '#265a7c', roofC: '#a8622e', metal: '#4f6288', metalD: '#2d3a60', brass: '#e3b34a', glass: '#ffe08a', lit: '#ffdb70', awn: ['#c8483a', '#e8dcc0'], awnB: ['#26788a', '#e8dcc0'], note: '#e8dcc0', green: '#2f8a6a', skin: ['#d9b090', '#b98a68', '#8a6048'], cloth: ['#b8403a', '#2a6a80', '#c08a30', '#4f478a', '#2f8a6a', '#a8507e'] },
  };

  // ---------- geometry ----------
  const catmull = (pts, closed, seg = 8) => {
    if (pts.length < 3) return pts.map((p) => [...p]);
    const out = [], n = pts.length, g = (i) => (closed ? pts[(i + n) % n] : pts[cl(i, 0, n - 1)]), m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) { const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2); for (let s = 0; s < seg; s++) { const t = s / seg, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3))); } }
    if (!closed) out.push([...pts[n - 1]]);
    return out;
  };
  const ell = (x, y, rx, ry, a0 = 0, sweep = TAU, n) => { const N = n ?? Math.max(10, Math.ceil(Math.abs(sweep) * Math.max(rx, ry) / 7)); return Array.from({ length: N + 1 }, (_, i) => { const a = a0 + (sweep * i) / N; return [x + Math.cos(a) * rx, y + Math.sin(a) * ry]; }); };
  const plen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  const bboxOf = (pts) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } return { x0, y0, x1, y1 }; };
  const inPoly = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const at = (pts, s) => { let acc = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc + d >= s) { const q = d ? (s - acc) / d : 0; return [lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q)]; } acc += d; } return [...pts[pts.length - 1]]; };
  // a band of width 2r along a polyline → closed outline
  const band = (pts, r) => {
    const L = [], R = [], rOf = typeof r === 'function' ? r : () => r, tot = plen(pts); let acc = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d, rr = rOf(tot ? acc / tot : 0);
      L.push([pts[i][0] + nx * rr, pts[i][1] + ny * rr]); R.push([pts[i][0] - nx * rr, pts[i][1] - ny * rr]);
      if (i < pts.length - 1) acc += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    }
    return [...L, ...R.reverse()];
  };
  // split a polyline at its sharp corners: each side is its own stroke (a hand lifts or turns there)
  const splitCorners = (pts, closed, deg = 40) => {
    const n = pts.length; if (n < 3) return [pts];
    const P2 = closed && Math.hypot(pts[0][0] - pts[n - 1][0], pts[0][1] - pts[n - 1][1]) > 0.01 ? [...pts, pts[0]] : pts, out = []; let cur = [P2[0]];
    for (let i = 1; i < P2.length; i++) { cur.push(P2[i]); if (i < P2.length - 1) { const a = Math.atan2(P2[i][1] - P2[i - 1][1], P2[i][0] - P2[i - 1][0]), b = Math.atan2(P2[i + 1][1] - P2[i][1], P2[i + 1][0] - P2[i][0]); let d = Math.abs(a - b); if (d > Math.PI) d = TAU - d; if (d > deg * DEG) { out.push(cur); cur = [P2[i]]; } } }
    out.push(cur); return out;
  };

  // ---------- lettering: single-stroke digits and Latin in a 0..1 box; CJK from Make Me a Hanzi medians (hanzi-writer-data, Arphic Public License) ----------
  const G = (s) => s.split('|').map((g) => { const c = g[0] === '~'; const v = (c ? g.slice(1) : g).trim().split(/\s+/).map((p) => p.split(',').map(Number)); return c ? catmull(v, false, 6) : v; });
  const GL = {
    0: '~.31,0 .08,.17 .03,.5 .08,.84 .31,1 .54,.84 .59,.5 .54,.16 .31,0', 1: '.12,.2 .34,0 .34,1', 2: '~.05,.24 .18,.04 .34,0 .52,.1 .55,.3 .42,.52 .05,1|.05,1 .6,1', 3: '~.06,.12 .28,0 .5,.08 .52,.28 .3,.46|~.3,.46 .56,.6 .56,.84 .32,1 .04,.9', 4: '.46,1 .46,0 .02,.68 .62,.68',
    5: '.55,0 .12,0 .07,.44|~.07,.44 .3,.37 .55,.5 .58,.74 .4,.97 .18,.98 .03,.87', 6: '~.52,.05 .33,0 .12,.15 .04,.5 .08,.85 .3,1 .52,.9 .57,.66 .42,.46 .2,.47 .06,.62', 7: '.02,0 .6,0 .24,1', 8: '~.31,.47 .1,.36 .08,.14 .31,0 .54,.14 .52,.36 .31,.47 .06,.62 .06,.86 .31,1 .56,.86 .56,.62 .31,.47', 9: '~.56,.36 .4,.52 .16,.5 .04,.3 .15,.05 .36,0 .56,.15 .58,.45 .5,.78 .3,1 .1,.95',
    '.': '~.08,.92 .12,.97 .08,.97 .08,.92', ',': '.12,.88 .06,1.08', ':': '~.1,.32 .14,.36 .1,.38 .1,.32|~.1,.86 .14,.9 .1,.92 .1,.86', '%': '.66,0 .08,1|~.16,.04 .05,.17 .16,.3 .27,.17 .16,.04|~.58,.7 .47,.83 .58,.96 .69,.83 .58,.7', '+': '.3,.25 .3,.8|.03,.52 .57,.52', '-': '.06,.55 .42,.55', '–': '.04,.55 .56,.55', '/': '.42,0 .04,1', '×': '.08,.32 .5,.82|.5,.32 .08,.82', '→': '.02,.52 .7,.52|.5,.32 .7,.52 .5,.72', '¥': '.05,0 .3,.5 .55,0|.3,.5 .3,1|.08,.56 .52,.56|.08,.74 .52,.74', '$': '~.5,.16 .3,.08 .1,.2 .14,.4 .3,.5 .48,.62 .5,.82 .3,.92 .08,.84|.3,0 .3,1', '!': '.1,0 .1,.68|~.08,.92 .12,.97 .08,.97 .08,.92', '?': '~.05,.2 .2,.02 .42,.04 .5,.22 .34,.44 .26,.62|~.25,.92 .29,.97 .25,.97 .25,.92', '(': '~.2,0 .06,.5 .2,1', ')': '~.04,0 .18,.5 .04,1',
    A: '.02,1 .32,0 .62,1|.14,.64 .5,.64', B: '.06,1 .06,0|~.06,0 .4,.02 .5,.24 .38,.46 .06,.48|~.06,.48 .44,.5 .56,.74 .4,.98 .06,1', C: '~.58,.16 .36,0 .12,.14 .03,.5 .12,.86 .36,1 .58,.84', D: '.06,1 .06,0|~.06,0 .4,.06 .58,.5 .4,.94 .06,1', E: '.54,0 .06,0 .06,1 .54,1|.06,.48 .46,.48', F: '.54,0 .06,0 .06,1|.06,.48 .46,.48', G: '~.58,.16 .36,0 .12,.14 .03,.5 .12,.86 .36,1 .58,.84 .58,.56|.58,.56 .36,.56', H: '.06,0 .06,1|.58,0 .58,1|.06,.5 .58,.5', I: '.1,0 .1,1', J: '~.44,0 .44,.74 .3,1 .1,.94 .03,.78', K: '.06,0 .06,1|.54,0 .06,.56 .58,1', L: '.06,0 .06,1 .5,1', M: '.04,1 .1,0 .38,.72 .66,0 .72,1', N: '.06,1 .06,0 .58,1 .58,0', O: '~.32,0 .08,.16 .02,.5 .08,.84 .32,1 .56,.84 .62,.5 .56,.16 .32,0', P: '.06,1 .06,0|~.06,0 .42,.03 .54,.26 .42,.5 .06,.54', Q: '~.32,0 .08,.16 .02,.5 .08,.84 .32,1 .56,.84 .62,.5 .56,.16 .32,0|.4,.76 .64,1.02', R: '.06,1 .06,0|~.06,0 .42,.03 .52,.26 .4,.48 .06,.52|.3,.52 .58,1', S: '~.54,.14 .32,0 .1,.12 .12,.34 .32,.48 .52,.62 .54,.86 .32,1 .06,.88', T: '.02,0 .62,0|.32,0 .32,1', U: '~.06,0 .06,.7 .18,.94 .34,1 .5,.94 .6,.7 .6,0', V: '.02,0 .32,1 .62,0', W: '.02,0 .2,1 .38,.3 .56,1 .74,0', X: '.04,0 .58,1|.58,0 .04,1', Y: '.02,0 .32,.5 .62,0|.32,.5 .32,1', Z: '.04,0 .58,0 .04,1 .6,1',
    a: '~.48,.42 .28,.32 .08,.46 .06,.8 .26,1 .48,.82|.48,.34 .5,1', b: '.06,0 .06,1|~.06,.5 .26,.32 .46,.44 .5,.72 .4,.94 .22,1 .06,.86', c: '~.46,.44 .28,.32 .08,.46 .06,.8 .26,1 .46,.88', d: '.48,0 .48,1|~.48,.5 .28,.32 .08,.46 .06,.8 .26,1 .48,.84', e: '.06,.66 .48,.64|~.48,.64 .42,.4 .26,.32 .08,.46 .06,.8 .26,1 .46,.9', f: '~.38,.02 .22,.04 .18,.3 .18,1|.04,.36 .34,.36', g: '~.48,.42 .28,.32 .08,.46 .06,.76 .26,.92 .48,.78|~.48,.34 .48,1 .36,1.22 .16,1.22 .06,1.12', h: '.06,0 .06,1|~.06,.5 .24,.32 .44,.42 .46,.7 .46,1', i: '.1,.36 .1,1|~.09,.1 .12,.13 .09,.15 .09,.1', j: '~.2,.36 .2,1.04 .1,1.2 0,1.16|~.19,.1 .22,.13 .19,.15 .19,.1', k: '.06,0 .06,1|.42,.36 .06,.7 .46,1', l: '.1,0 .1,1', m: '.05,.36 .05,1|~.05,.5 .2,.32 .34,.44 .35,1|~.35,.5 .5,.32 .64,.44 .65,1', n: '.06,.36 .06,1|~.06,.5 .24,.32 .44,.42 .46,.7 .46,1', o: '~.27,.32 .08,.44 .05,.7 .12,.92 .27,1 .44,.92 .5,.68 .44,.42 .27,.32', p: '.06,.34 .06,1.24|~.06,.5 .26,.32 .46,.44 .5,.72 .4,.94 .22,1 .06,.86', q: '.48,.34 .48,1.24|~.48,.5 .28,.32 .08,.46 .06,.8 .26,1 .48,.84', r: '.06,.36 .06,1|~.06,.56 .18,.38 .34,.34', s: '~.42,.4 .24,.32 .08,.42 .12,.58 .28,.66 .44,.76 .42,.94 .22,1 .04,.92', t: '~.18,.08 .18,.8 .26,1 .4,.96|.04,.36 .36,.36', u: '~.06,.36 .06,.8 .2,1 .46,.86|.46,.36 .46,1', v: '.04,.36 .26,1 .48,.36', w: '.03,.36 .17,1 .32,.5 .47,1 .62,.36', x: '.06,.36 .46,1|.46,.36 .06,1', y: '.04,.36 .26,.96|.48,.36 .2,1.24', z: '.06,.36 .46,.36 .06,1 .48,1',
  };
  const ADV = { '.': 0.24, ',': 0.24, ':': 0.26, '%': 0.8, '+': 0.62, '-': 0.5, '–': 0.62, '/': 0.48, '×': 0.6, '→': 0.78, ' ': 0.34, '!': 0.24, '?': 0.56, '(': 0.28, ')': 0.28, i: 0.22, j: 0.28, l: 0.22, m: 0.72, w: 0.68, I: 0.22, M: 0.78, W: 0.8 };
  const glyphOf = (c) => { const g = GL[c]; if (!g) return null; return typeof g === 'string' ? (GL[c] = G(g)) : g; };
  const isCJK = (c) => /[㐀-鿿]/.test(c);
  const CJKP = /[　-〿＀-￯]/;   // full-width punctuation: drawn as a small mark, half a cell
  const STROKES = new Map();
  const loadStrokes = (ch) => {
    if (STROKES.has(ch)) return STROKES.get(ch).p;
    const ent = { data: null };
    ent.p = (async () => {
      for (const base of ['https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/', 'https://unpkg.com/hanzi-writer-data@2.0.1/']) {
        try { const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000), r = await fetch(base + encodeURIComponent(ch) + '.json', { signal: ctl.signal }); clearTimeout(tm); if (!r.ok) continue; const j = await r.json(); ent.data = j.medians; return; } catch (e) { /* the next mirror; without data the lint reports it */ }
      }
    })();
    STROKES.set(ch, ent); return ent.p;
  };

  P.drawnworld = function drawnworld(F, opt = {}) {
    const W0 = F.W, H0 = F.H, PT = F.portrait, SQ = W0 === H0, U = F.u, C = { ...(PALS[opt.palette] || PALS.market), ...(opt.colors || {}) }, seed0 = hashS(opt.seed ?? 'drawnworld'), FLAT = !!opt.flat;
    const WOB = opt.wobble ?? 1, ZMAX = opt.zMax ?? 1.9, FPS = 30;
    const W = { colors: C, opt, mix: mixHex };
    W.L = (l, p, s) => (SQ ? (s !== undefined ? s : l) : PT ? (p !== undefined ? p : l) : l);
    const sheets = [];
    const newSheet = (layer) => { const S = { layer, parts: [], jobs: [], seq: 0, runs: [], order: [] }; sheets.push(S); return S; };
    let S = newSheet(null); const S0 = S;
    let curGroup = null; const groups = new Map();

    // ---------- parts ----------
    W.part = (o = {}) => {
      const sheet = S, p = { name: o.name ?? `part${sheet.parts.length}`, group: o.in ?? curGroup, items: [], motions: [], colorOnly: !!o.colorOnly, lw: o.lw ?? 2.6, ink: o.ink, z: o.z ?? 0, id: sheet.parts.length, sheet, seed: mix32(seed0 ^ hashS(o.name ?? '') ^ (sheet.parts.length * 977)), alpha: o.alpha ?? 1 };
      const add = (pts, a) => { const it = { part: p, pts, closed: !!a.closed, fill: a.fill ?? null, lw: a.lw ?? p.lw, ink: a.ink ?? p.ink, stroke: a.stroke !== false, order: (p.z * 1e7) + (++sheet.seq), occlude: a.occlude ?? (!!a.closed && a.fill != null), seeThrough: !!a.seeThrough, colorOnly: p.colorOnly || !!a.colorOnly, lineOnly: !!a.lineOnly, alpha: a.alpha, id: p.items.length, noSplit: !!a.noSplit, noHand: !!a.noHand }; p.items.push(it); return it; };
      p.shape = (pts, a = {}) => { const q = a.smooth ? catmull(pts, true, a.seg ?? 8) : pts; add(q, { ...a, closed: true, noSplit: a.smooth || a.noSplit }); return p; };
      p.line = (pts, a = {}) => { const q = a.smooth ? catmull(pts, false, a.seg ?? 8) : pts; add(q, { ...a, closed: false, noSplit: a.smooth || a.noSplit }); return p; };
      p.rect = (cx, cy, w, h, a = {}) => p.shape([[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]], a);
      p.circle = (x, y, r, a = {}) => p.shape(ell(x, y, r, r), { noSplit: true, ...a });
      p.ellipse = (x, y, rx, ry, a = {}) => p.shape(ell(x, y, rx, ry), { noSplit: true, ...a });
      p.arc = (x, y, r, a0, a1, a = {}) => p.line(ell(x, y, r, a.ry ?? r, a0, a1 - a0), { noSplit: true, ...a });
      const M0 = (kind, o2) => { p.motions.push({ kind, ...o2 }); return p; };
      p.spin = (rps, o2 = {}) => M0('spin', { rps, x: o2.x ?? p.cx, y: o2.y ?? p.cy, from: o2.from, ramp: o2.ramp ?? 1, phase: o2.phase ?? 0 });
      p.bob = (amp, period, o2 = {}) => M0('bob', { amp, period, axis: o2.axis ?? 'y', phase: o2.phase ?? rnd(p.seed, 3), from: o2.from, ramp: o2.ramp ?? 0.8 });
      p.sway = (deg, period, o2 = {}) => M0('sway', { deg, period, x: o2.x ?? p.cx, y: o2.y ?? p.cy, phase: o2.phase ?? rnd(p.seed, 4), from: o2.from, ramp: o2.ramp ?? 0.8 });
      p.blink = (period, o2 = {}) => M0('blink', { period, duty: o2.duty ?? 0.7, min: o2.min ?? 0.25, phase: o2.phase ?? rnd(p.seed, 5), from: o2.from });
      p.drift = (pts, o2 = {}) => M0('drift', { pts, L: plen(pts), speed: o2.speed ?? 40, loop: o2.loop ?? true, phase: o2.phase ?? 0, fade: o2.fade ?? 0, grow: o2.grow, step: o2.step, from: o2.from, ramp: o2.ramp ?? 1, ox: o2.ox ?? pts[0][0], oy: o2.oy ?? pts[0][1] });
      p.pivot = (x, y) => { p.cx = x; p.cy = y; return p; };
      sheet.parts.push(p);
      if (p.group != null) { if (!groups.has(p.group)) groups.set(p.group, []); groups.get(p.group).push(p); }
      return p;
    };
    W.group = (name, fn) => { const prev = curGroup; curGroup = name; if (!groups.has(name)) groups.set(name, []); const r = fn ? fn() : undefined; curGroup = prev; return r; };
    W.partsOf = (target) => { const list = Array.isArray(target) ? target : [target], out = []; for (const x of list) { if (typeof x === 'string') { if (!groups.has(x)) throw new Error(M(`没有这个组：${x}`, `No such group: ${x}`)); out.push(...groups.get(x)); } else if (x && x.items) out.push(x); else if (x && x.parts) out.push(...W.partsOf(x.parts)); } return out; };
    W.into = (layer, fn) => { let sh = sheets.find((x) => x.layer === layer); if (!sh) sh = newSheet(layer); const prev = S; S = sh; const r = fn(); S = prev; return r; };

    // a soft colour-stage shadow: nothing in the line stage, depth in the colour
    const shade = (p, pts, a = 0.2) => p.shape(pts, { fill: '#1b1030', alpha: a, stroke: false, colorOnly: true, occlude: false });
    W.shade = shade;
    // ---------- the part library: every part is parametric and returns a part (or { parts, … }); colours default by role from the palette ----------
    const flatP = (ps) => ({ parts: ps });
    const rs = (p, i) => rnd(p.seed, i);
    // a timber: closed band, a grain line or two, the odd knot
    W.post = (o) => {
      const p = W.part({ name: o.name ?? 'post', in: o.in, z: o.z, lw: o.lw ?? 3 }), { x, y0, y1 } = o, w = o.w ?? 14, f = o.fill ?? C.wood;
      p.shape([[x - w / 2, y0], [x + w / 2, y0], [x + w / 2 + (o.flare ?? 0), y1], [x - w / 2 - (o.flare ?? 0), y1]], { fill: { h: [f, mixHex(f, C.woodD, 0.5)] } });
      const n = Math.floor(Math.abs(y1 - y0) / 90); for (let i = 0; i < n; i++) { const yy = lerp(y0, y1, (i + rs(p, i)) / Math.max(1, n)), dx = (rs(p, i + 20) - 0.5) * w * 0.6, ln = 18 + rs(p, i + 40) * 44; p.line([[x + dx, yy], [x + dx + 0.6, yy + ln]], { lw: 1.5 }); }
      return p;
    };
    W.beam = (o) => {
      const p = W.part({ name: o.name ?? 'beam', in: o.in, z: o.z, lw: o.lw ?? 2.6 }), t = o.t ?? 12, f = o.fill ?? C.wood, pts = [[o.x0, o.y0], [o.x1, o.y1]];
      p.shape(band(pts, t / 2), { fill: f });
      if (o.bolts !== false && Math.hypot(o.x1 - o.x0, o.y1 - o.y0) > 90) for (const q of [0.06, 0.94]) p.circle(lerp(o.x0, o.x1, q), lerp(o.y0, o.y1, q), 1.8, { fill: C.ink, lw: 1 });
      return p;
    };
    // a deck of planks on brackets: top line, seams, optional posts and braces under it
    W.platform = (o) => {
      const p = W.part({ name: o.name ?? 'platform', in: o.in, z: o.z, lw: o.lw ?? 3.2 }), { x0, x1, y } = o, t = o.t ?? 16, f = o.fill ?? C.wood;
      p.shape([[x0, y], [x1, y], [x1, y + t], [x0, y + t]], { fill: { v: [f, mixHex(f, C.woodD, 0.55)] } });
      const n = Math.max(2, Math.round((x1 - x0) / (o.plank ?? 70))); for (let i = 1; i < n; i++) { const xx = lerp(x0, x1, (i + (rs(p, i) - 0.5) * 0.25) / n); p.line([[xx, y + 1], [xx, y + t - 1]], { lw: 1.4 }); }
      p.line([[x0 + 4, y + t * 0.42], [x1 - 4, y + t * 0.42]], { lw: 1.2, ink: mixHex(f, C.ink, 0.5) });
      if (o.shadow !== false) shade(p, [[x0, y + t], [x1, y + t], [x1, y + t + (o.shadow ?? 20)], [x0, y + t + (o.shadow ?? 20)]], 0.22);
      for (let i = 0; i < n; i++) { const xx = lerp(x0, x1, (i + 0.5) / n); if (rs(p, i + 60) < 0.5) p.circle(xx, y + t * 0.72, 1.6, { fill: C.ink, lw: 0.9 }); }
      return p;
    };
    // stairs: two stringers, treads, and a railing on the near side
    W.stairs = (o) => {
      const p = W.part({ name: o.name ?? 'stairs', in: o.in, z: o.z, lw: o.lw ?? 2.8 }), { x0, y0, x1, y1 } = o, d = o.w ?? 34, n = o.n ?? Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / 20)), f = o.fill ?? C.wood, rail = o.rail ?? 46, sx = o.side ?? 1;
      const a = [x0, y0], b = [x1, y1], off = [0, -d];
      p.shape(band([[a[0] + off[0], a[1] + off[1]], [b[0] + off[0], b[1] + off[1]]], 4), { fill: mixHex(f, C.woodD, 0.5) });
      for (let i = 0; i <= n; i++) { const q = (i + 0.5) / (n + 1), xx = lerp(a[0], b[0], q), yy = lerp(a[1], b[1], q); p.shape([[xx - 5 * sx, yy - d], [xx + 5 * sx, yy - d], [xx + 5 * sx, yy], [xx - 5 * sx, yy]], { fill: mixHex(f, '#ffffff', 0.12), lw: 1.5 }); }
      p.shape(band([a, b], 4.5), { fill: f });
      if (rail) { const k = o.every ?? 2; p.line([[a[0], a[1] - rail], [b[0], b[1] - rail]], { lw: 3 }); for (let i = 0; i <= n; i += k) { const q = i / n, xx = lerp(a[0], b[0], q), yy = lerp(a[1], b[1], q); p.line([[xx, yy], [xx, yy - rail]], { lw: i % (k * 3) === 0 ? 2.4 : 1.4 }); } p.line([[a[0], a[1] - rail * 0.5], [b[0], b[1] - rail * 0.5]], { lw: 1.2 }); }
      return p;
    };
    W.ladder = (o) => {
      const p = W.part({ name: o.name ?? 'ladder', in: o.in, z: o.z, lw: o.lw ?? 2.6 }), { x, y0, y1 } = o, w = o.w ?? 24, n = o.n ?? Math.round(Math.abs(y1 - y0) / 18);
      for (const s of [-1, 1]) p.line([[x + (s * w) / 2, y0], [x + (s * w) / 2, y1]], { lw: 2.8 });
      for (let i = 1; i < n; i++) { const yy = lerp(y0, y1, i / n); p.line([[x - w / 2, yy], [x + w / 2, yy]], { lw: 1.7 }); }
      return p;
    };
    W.railing = (o) => {
      const p = W.part({ name: o.name ?? 'railing', in: o.in, z: o.z, lw: o.lw ?? 2.6 }), { x0, x1, y } = o, h = o.h ?? 44, n = o.n ?? Math.round((x1 - x0) / 13);
      p.shape([[x0 - 3, y - h - 3], [x1 + 3, y - h - 3], [x1 + 3, y - h + 3], [x0 - 3, y - h + 3]], { fill: o.fill ?? C.wood, lw: 2.2 });
      p.line([[x0, y - 6], [x1, y - 6]], { lw: 1.6 });
      for (let i = 0; i <= n; i++) { const xx = lerp(x0, x1, i / n); p.line([[xx, y], [xx, y - h]], { lw: i % 4 === 0 ? 2.6 : 1.4 }); }
      return p;
    };
    // a truss or scaffold: chords, posts every bay, braces (x / n) as thin double-lined timbers
    W.truss = (o) => {
      const { x, y, w, h } = o, n = o.bays ?? Math.max(1, Math.round(w / (o.bay ?? 110))), f = o.fill ?? C.wood, style = o.style ?? 'x', ps = [], t = o.t ?? 7, z = o.z;
      const br = W.part({ name: (o.name ?? 'truss') + '-braces', in: o.in, z });
      for (let i = 0; i < n; i++) {
        const a = x - w / 2 + (w * i) / n, b = a + w / n, y0 = y - h, y1 = y;
        br.shape(band([[a, y1], [b, y0]], t / 2), { fill: mixHex(f, C.woodD, 0.5), lw: 1.7 });
        if (style === 'x' || i % 2 === 0) br.shape(band([[b, y1], [a, y0]], t / 2), { fill: mixHex(f, C.woodD, 0.35), lw: 1.7 });
      }
      ps.push(br);
      for (let i = 0; i <= n; i++) ps.push(W.post({ x: x - w / 2 + (w * i) / n, y0: y - h, y1: y, w: o.post ?? 12, fill: f, in: o.in, z, name: (o.name ?? 'truss') + '-post' + i }));
      ps.push(W.platform({ x0: x - w / 2 - 6, x1: x + w / 2 + 6, y: y - h - 6, t: 10, fill: f, in: o.in, z, name: (o.name ?? 'truss') + '-top' }));
      ps.push(W.platform({ x0: x - w / 2 - 6, x1: x + w / 2 + 6, y: y - 4, t: 10, fill: f, in: o.in, z, name: (o.name ?? 'truss') + '-bottom' }));
      return flatP(ps);
    };
    // window: frame, sill, mullions, optional arch and shutters; lit: warm glass
    W.window = (o) => {
      const p = W.part({ name: o.name ?? 'window', in: o.in, z: o.z, lw: o.lw ?? 2.2 }), { x, y, w, h } = o, cols = o.cols ?? 2, rows = o.rows ?? 2, glass = o.lit ? { v: [C.lit, mixHex(C.lit, C.roofC, 0.4)] } : o.glass ?? { v: [C.glass, mixHex(C.glass, C.roofB, 0.45)] }, fr = o.frame ?? C.woodD;
      const top = y - h / 2, bot = y + h / 2, l = x - w / 2, r = x + w / 2;
      const out = o.arch ? [[l, bot], ...ell(x, top + w / 2, w / 2, w / 2, Math.PI, Math.PI, 14), [r, bot]] : [[l, top], [r, top], [r, bot], [l, bot]];
      p.shape(out, { fill: glass, lw: 2.6, noSplit: !!o.arch, ink: fr });
      for (let i = 1; i < cols; i++) { const xx = lerp(l, r, i / cols); p.line([[xx, o.arch ? top + 2 : top], [xx, bot]], { lw: 1.6, ink: fr }); }
      for (let j = 1; j < rows; j++) { const yy = lerp(o.arch ? top + w / 2 : top, bot, j / rows); p.line([[l, yy], [r, yy]], { lw: 1.6, ink: fr }); }
      if (o.arch) p.line([[l, top + w / 2], [r, top + w / 2]], { lw: 1.6, ink: fr });
      p.shape([[l - 5, bot], [r + 5, bot], [r + 3, bot + 5], [l - 3, bot + 5]], { fill: o.sill ?? C.woodD, lw: 1.6 });
      if (o.shutters) for (const s of [-1, 1]) { const sx = s < 0 ? l - w * 0.34 : r; p.shape([[sx, top], [sx + w * 0.34, top], [sx + w * 0.34, bot], [sx, bot]], { fill: o.shutters === true ? C.roofB : o.shutters, lw: 1.8 }); for (let k = 1; k < 5; k++) { const yy = lerp(top, bot, k / 5); p.line([[sx + 2, yy], [sx + w * 0.34 - 2, yy]], { lw: 1.1 }); } }
      return p;
    };
    W.door = (o) => {
      const p = W.part({ name: o.name ?? 'door', in: o.in, z: o.z, lw: o.lw ?? 2.6 }), { x, y, w, h } = o, f = o.fill ?? C.roofC, l = x - w / 2, r = x + w / 2, top = y - h;
      p.shape(o.arch ? [[l, y], ...ell(x, top + w / 2, w / 2, w / 2, Math.PI, Math.PI, 14), [r, y]] : [[l, top], [r, top], [r, y], [l, y]], { fill: f, noSplit: !!o.arch });
      for (let i = 1; i < 3; i++) p.line([[lerp(l, r, i / 3), o.arch ? top + 4 : top + 2], [lerp(l, r, i / 3), y - 2]], { lw: 1.3 });
      p.circle(r - w * 0.16, y - h * 0.44, 2.4, { fill: C.brass, lw: 1 });
      return p;
    };
    // brick courses and shingle rows, drawn into a part
    W.bricks = (p, x0, y0, x1, y1, o = {}) => { const rh = o.h ?? 14, rw = o.w ?? 30, dens = o.dens ?? 0.45; let row = 0; for (let y = y0; y < y1; y += rh, row++) for (let x = x0 + (row % 2 ? rw / 2 : 0); x < x1 - 4; x += rw) if (rnd(p.seed, row * 97 + Math.round(x)) < dens) { const w2 = Math.min(rw - 3, x1 - x - 1); p.line([[x, y], [x + w2, y], [x + w2, y + rh - 2], [x, y + rh - 2], [x, y]], { lw: 1, noHand: true, noSplit: true, ink: o.ink }); } return p; };
    W.shingles = (p, poly, o = {}) => { const b = bboxOf(poly), rh = o.h ?? 13, rw = o.w ?? 20; let row = 0; for (let y = b.y0 + rh * 0.8; y < b.y1 - 2; y += rh, row++) { const xs = []; for (let x = b.x0; x <= b.x1; x += 2) if (inPoly(poly, x, y) && inPoly(poly, x, y - rh * 0.5)) xs.push(x); if (xs.length < 4) continue; const a = xs[0], z = xs[xs.length - 1]; p.line([[a, y], [z, y]], { lw: 1.2, ink: o.ink }); for (let x = a + (row % 2 ? rw / 2 : 0); x < z; x += rw) if (rnd(p.seed, row * 31 + Math.round(x)) < 0.8) p.line([[x, y], [x, y - rh]], { lw: 1, ink: o.ink }); } return p; };
    // an arcade / retaining wall: stone courses with a row of dark arches. x0..x1, top y0, bottom y1, n arches
    W.arcade = (o) => {
      const p = W.part({ name: o.name ?? 'arcade', in: o.in, z: o.z, lw: o.lw ?? 3 }), { x0, x1, y0, y1 } = o, n = o.n ?? Math.max(1, Math.round((x1 - x0) / 170)), f = o.fill ?? C.wallB, dark = o.dark ?? mixHex(C.woodD, C.ink, 0.45), h = y1 - y0;
      p.shape([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { fill: { v: [f, mixHex(f, C.woodD, 0.42)] } });
      W.bricks(p, x0 + 4, y0 + 8, x1 - 4, y1 - 3, { h: o.courseH ?? 22, w: o.courseW ?? 54, dens: o.dens ?? 0.3, ink: mixHex(f, C.ink, 0.5) });
      for (let i = 0; i < n; i++) { const cx = lerp(x0, x1, (i + 0.5) / n), aw = ((x1 - x0) / n) * (o.open ?? 0.56), top = y0 + h * 0.3, r = aw / 2, arch = [[cx - r, y1], [cx - r, top + r], ...ell(cx, top + r, r, r, Math.PI, Math.PI, 16).slice(1, -1), [cx + r, top + r], [cx + r, y1]]; p.shape(arch, { fill: { v: [dark, mixHex(dark, C.ink, 0.3)] }, noSplit: true, lw: 2.8 }); const nv = 7; for (let k = 0; k <= nv; k++) { const a = Math.PI + (k / nv) * Math.PI, c = Math.cos(a), sn = Math.sin(a); p.line([[cx + c * r, top + r + sn * r], [cx + c * (r + 16), top + r + sn * (r + 16)]], { lw: 1.6 }); } p.line(ell(cx, top + r, r + 16, r + 16, Math.PI, Math.PI, 16), { lw: 1.6, noSplit: true }); }
      p.shape([[x0 - 8, y0 - 6], [x1 + 8, y0 - 6], [x1 + 8, y0 + 8], [x0 - 8, y0 + 8]], { fill: mixHex(f, '#ffffff', 0.25), lw: 2.8 });
      if (o.ground !== false) shade(p, [[x0, y1 - 26], [x1, y1 - 26], [x1, y1], [x0, y1]], 0.14);
      return p;
    };
    // a house: wall, roof of a chosen form, shingles, windows in rows, a door, optional chimney; x = centre, y = ground
    W.house = (o) => {
      const { x, y, w, h } = o, ps = [], wall = o.wall ?? C.wall, roofC = o.roofFill ?? C.roof, form = o.roof ?? 'gable', rh = o.roofH ?? w * 0.42, l = x - w / 2, r = x + w / 2, top = y - h, nm = o.name ?? 'house', ov = o.over ?? 14;
      if (o.chimney) ps.push(W.chimney({ x: x + o.chimney * w * 0.5, y: top - rh * 0.25, w: 26, h: rh * 0.9, in: o.in, z: o.z, name: nm + '-chimney' }));
      const w0 = W.part({ name: nm + '-wall', in: o.in, z: o.z, lw: 3.2 }); w0.shape([[l, top], [r, top], [r, y], [l, y]], { fill: { v: [wall, mixHex(wall, C.wallB, 0.65)] } });
      if (o.brick) W.bricks(w0, l + 4, top + 10, r - 4, y - 4, { dens: o.brick === true ? 0.22 : o.brick, ink: mixHex(wall, C.ink, 0.45) });
      for (let i = 0; i < 2; i++) w0.line([[l + 4, top + 6 + i * 6], [r - 4, top + 6 + i * 6]], { lw: 1.1, ink: mixHex(wall, C.ink, 0.5) });
      shade(w0, [[l, top], [r, top], [r, top + 20], [l, top + 20]], 0.2); shade(w0, [[r - w * 0.16, top + 20], [r, top + 20], [r, y], [r - w * 0.16, y]], 0.08);
      ps.push(w0);
      const rf = W.part({ name: nm + '-roof', in: o.in, z: o.z, lw: 3.4 }); let poly;
      if (form === 'gable') poly = [[l - ov, top], [x, top - rh], [r + ov, top]];
      else if (form === 'shed') poly = [[l - ov, top], [l - ov, top - rh], [r + ov, top - rh * 0.25], [r + ov, top]];
      else if (form === 'hip') poly = [[l - ov, top], [l + w * 0.2, top - rh], [r - w * 0.2, top - rh], [r + ov, top]];
      else if (form === 'dome') poly = [[l - ov, top], ...ell(x, top, w / 2 + ov, rh, Math.PI, Math.PI, 28), [r + ov, top]];
      else if (form === 'barrel') poly = [[l - ov, top], ...catmull([[l - ov, top], [l + w * 0.12, top - rh * 0.82], [x, top - rh], [r - w * 0.12, top - rh * 0.82], [r + ov, top]], false, 8), [r + ov, top]];
      else poly = [[l - ov, top], [l - ov, top - 16], [r + ov, top - 16], [r + ov, top]];
      rf.shape(poly, { fill: { v: [mixHex(roofC, '#ffffff', 0.1), mixHex(roofC, C.woodD, 0.25)] }, noSplit: form === 'dome' || form === 'barrel' });
      if (o.shingles !== false && form !== 'flat') { if (form === 'dome') { for (let i = 1; i < 7; i++) { const q = i / 7, rx = (w / 2 + ov) * Math.cos((q * Math.PI) / 2); rf.line(ell(x, top, rx, rh, Math.PI + 0.02, Math.PI - 0.04, 18), { lw: 1.2, noSplit: true }); } for (let j = 1; j < 4; j++) { const yy = top - (rh * j) / 4, hw = (w / 2 + ov) * Math.sqrt(1 - (j / 4) ** 2); rf.line([[x - hw, yy], [x + hw, yy]], { lw: 1.1, noSplit: true }); } } else W.shingles(rf, poly, { h: o.shingleH ?? 13, w: o.shingleW ?? 22 }); }
      rf.line([[l - ov - 4, top + 3], [r + ov + 4, top + 3]], { lw: 2.6 });
      ps.push(rf);
      const rows = o.rows ?? Math.max(1, Math.floor((h - (o.door ? 0 : 20)) / 120)), cols = o.cols ?? Math.max(1, Math.floor(w / 80)), wh = o.winH ?? Math.min(70, (h / rows) * 0.52), ww = o.winW ?? Math.min(54, (w / cols) * 0.55);
      if (o.windows !== false) for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { if (o.door && j === rows - 1 && cols % 2 === 1 && i === (cols - 1) / 2) continue; const k = i * 7 + j * 13; ps.push(W.window({ x: lerp(l, r, (i + 0.5) / cols), y: top + ((j + 0.5) * h) / rows, w: ww, h: wh, arch: o.arch ?? rnd(seed0 ^ hashS(nm), k) < 0.3, lit: rnd(seed0 ^ hashS(nm), k + 3) < (o.litP ?? 0.35), shutters: o.shutters && rnd(seed0 ^ hashS(nm), k + 5) < 0.5 ? (o.shutterFill ?? true) : false, in: o.in, z: o.z, name: `${nm}-win${i}-${j}` })); }
      if (o.door) ps.push(W.door({ x: o.doorX ?? x, y, w: o.door === true ? 44 : o.door, h: o.doorH ?? 84, arch: o.doorArch ?? true, in: o.in, z: o.z, name: nm + '-door' }));
      return flatP(ps);
    };
    W.chimney = (o) => {
      const p = W.part({ name: o.name ?? 'chimney', in: o.in, z: o.z, lw: 2.8 }), { x, y, h } = o, w = o.w ?? 28, f = o.fill ?? C.roof, top = y - h;
      p.shape([[x - w / 2, top], [x + w / 2, top], [x + w / 2 + (o.flare ?? 0), y], [x - w / 2 - (o.flare ?? 0), y]], { fill: { h: [f, mixHex(f, C.woodD, 0.5)] } });
      W.bricks(p, x - w / 2 + 2, top + 8, x + w / 2 - 2, y - 2, { h: 11, w: 18, dens: 0.3, ink: mixHex(f, C.ink, 0.5) });
      p.shape([[x - w / 2 - 5, top - 9], [x + w / 2 + 5, top - 9], [x + w / 2 + 5, top], [x - w / 2 - 5, top]], { fill: mixHex(f, C.ink, 0.35), lw: 2.4 });
      return p;
    };
    // smoke: colour-stage puffs rising and fading (life from `from`)
    W.smoke = (o) => {
      const { x, y } = o, n = o.n ?? 5, h = o.h ?? 280, c = o.fill ?? mixHex(C.cloud, C.hill[1], 0.2), ps = [], sd = hashS(`${x},${y}`);
      for (let i = 0; i < n; i++) {
        const p = W.part({ name: `smoke${x}-${i}`, in: o.in, z: o.z, colorOnly: true, lw: 2, ink: mixHex(c, C.ink, 0.4) }), r = o.r ?? 20;
        p.shape(ell(x, y, r, r * 0.86).map((q, k) => [q[0] + noise1(sd + i, k * 0.7) * r * 0.16, q[1] + noise1(sd + i + 9, k * 0.7) * r * 0.16]).filter((_, k) => k % 2 === 0), { fill: c, smooth: true, seg: 4, noSplit: true });
        const path = [[x, y], [x + (o.wind ?? 60) * 0.3, y - h * 0.4], [x + (o.wind ?? 60), y - h]];
        p.drift(path, { speed: o.speed ?? 34, loop: true, phase: i / n, fade: 0.28, grow: [0.55, 2.3], from: o.from, ox: x, oy: y });
        ps.push(p);
      }
      return flatP(ps);
    };
    // awning: sloped striped canvas with a scalloped hem. x0..x1 along the top edge at y, drop down, flare out
    W.awning = (o) => {
      const p = W.part({ name: o.name ?? 'awning', in: o.in, z: o.z, lw: o.lw ?? 2.8 }), { x0, x1, y } = o, drop = o.drop ?? 60, fl = o.flare ?? 16, n = o.stripes ?? Math.max(4, Math.round((x1 - x0) / 34)), cols = o.colors ?? C.awn, sc = o.scallop ?? 11;
      for (let i = 0; i < n; i++) { const a = i / n, b = (i + 1) / n, tx0 = lerp(x0, x1, a), tx1 = lerp(x0, x1, b), bx0 = lerp(x0 - fl, x1 + fl, a), bx1 = lerp(x0 - fl, x1 + fl, b), hem = ell((bx0 + bx1) / 2, y + drop, (bx1 - bx0) / 2, sc, 0, Math.PI, 8); p.shape([[tx0, y], [tx1, y], [bx1, y + drop], ...hem.slice(1, -1), [bx0, y + drop]], { fill: cols[i % cols.length], lw: 2, noSplit: false }); }
      p.line([[x0 - 3, y], [x1 + 3, y]], { lw: 3.4 });
      if (o.shadow !== false) shade(p, [[x0 - fl, y + drop + sc], [x1 + fl, y + drop + sc], [x1 + fl - 8, y + drop + sc + 26], [x0 - fl + 8, y + drop + sc + 26]], 0.18);
      return p;
    };
    // goods
    W.loaf = (o) => { const p = W.part({ name: o.name ?? 'loaf', in: o.in, z: o.z, lw: o.lw ?? 2.4 }), { x, y } = o, w = o.w ?? 56, h = o.h ?? w * 0.52, f = o.fill ?? '#d99a4e'; p.shape([[x - w / 2, y], [x - w * 0.5, y - h * 0.5], [x - w * 0.28, y - h], [x + w * 0.1, y - h * 1.04], [x + w * 0.42, y - h * 0.8], [x + w * 0.5, y - h * 0.3], [x + w / 2, y]], { fill: { v: [f, mixHex(f, C.woodD, 0.45)] }, smooth: true }); for (let i = 0; i < 3; i++) { const q = 0.26 + i * 0.24; p.line([[x - w / 2 + w * q, y - h * 0.86], [x - w / 2 + w * q + w * 0.12, y - h * 0.5]], { lw: 1.8 }); } return p; };
    W.crate = (o) => { const p = W.part({ name: o.name ?? 'crate', in: o.in, z: o.z, lw: 2.4 }), { x, y } = o, w = o.w ?? 50, h = o.h ?? w * 0.8, f = o.fill ?? C.wood; p.shape([[x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2, y], [x - w / 2, y]], { fill: mixHex(f, '#ffffff', 0.15) }); for (let i = 1; i < 3; i++) p.line([[x - w / 2, y - (h * i) / 3], [x + w / 2, y - (h * i) / 3]], { lw: 1.3 }); p.line([[x - w / 2 + 2, y - 2], [x + w / 2 - 2, y - h + 2]], { lw: 1.6 }); return p; };
    W.barrel = (o) => { const p = W.part({ name: o.name ?? 'barrel', in: o.in, z: o.z, lw: 2.6 }), { x, y } = o, w = o.w ?? 44, h = o.h ?? w * 1.3, f = o.fill ?? C.wood; p.shape([[x - w * 0.42, y - h], [x + w * 0.42, y - h], [x + w * 0.5, y - h / 2], [x + w * 0.42, y], [x - w * 0.42, y], [x - w * 0.5, y - h / 2]], { fill: { h: [f, mixHex(f, C.woodD, 0.6)] }, smooth: true }); for (const q of [0.22, 0.78]) p.line(ell(x, y - h * q, w * 0.47, 3.5, 0, Math.PI, 8), { lw: 2, noSplit: true }); for (const q of [-0.2, 0.2]) p.line([[x + w * q, y - h + 3], [x + w * q * 1.15, y - h / 2], [x + w * q, y - 3]], { lw: 1.1, smooth: true }); return p; };
    W.sack = (o) => { const p = W.part({ name: o.name ?? 'sack', in: o.in, z: o.z, lw: 2.4 }), { x, y } = o, w = o.w ?? 46, h = o.h ?? w * 1.15, f = o.fill ?? C.note; p.shape([[x - w * 0.46, y], [x - w * 0.5, y - h * 0.5], [x - w * 0.2, y - h * 0.86], [x - w * 0.14, y - h], [x + w * 0.14, y - h], [x + w * 0.2, y - h * 0.86], [x + w * 0.5, y - h * 0.5], [x + w * 0.46, y]], { fill: { v: [f, mixHex(f, C.wallB, 0.6)] }, smooth: true }); p.line([[x - w * 0.2, y - h * 0.86], [x + w * 0.2, y - h * 0.86]], { lw: 2 }); return p; };
    W.basket = (o) => { const p = W.part({ name: o.name ?? 'basket', in: o.in, z: o.z, lw: 2.8 }), { x, y } = o, w = o.w ?? 200, h = o.h ?? w * 0.5, f = o.fill ?? C.roofC; p.arc(x, y - h, w * 0.46, Math.PI, TAU, { ry: h * 0.9, lw: 5 }); p.shape([[x - w / 2, y - h], [x + w / 2, y - h], [x + w * 0.38, y], [x - w * 0.38, y]], { fill: { v: [f, mixHex(f, C.woodD, 0.6)] } }); const nn = Math.round(w / 18); for (let i = 1; i < nn; i++) { const q = i / nn; p.line([[lerp(x - w / 2, x + w / 2, q), y - h + 1], [lerp(x - w * 0.38, x + w * 0.38, q), y - 1]], { lw: 1.2 }); } for (let j = 1; j < 4; j++) { const q = j / 4, hw = lerp(w / 2, w * 0.38, q), yy = y - h + h * q; p.line([[x - hw, yy], [x + hw, yy]], { lw: 1.2 }); } p.shape([[x - w / 2 - 4, y - h - 6], [x + w / 2 + 4, y - h - 6], [x + w / 2 + 2, y - h + 4], [x - w / 2 - 2, y - h + 4]], { fill: mixHex(f, C.woodD, 0.3), lw: 2.2 }); return p; };
    W.coin = (o) => { const p = W.part({ name: o.name ?? 'coin', in: o.in, z: o.z, lw: 2.2 }), { x, y } = o, r = o.r ?? 12, f = o.fill ?? C.brass; p.ellipse(x, y, r, r * (o.flat ?? 1), { fill: { v: [mixHex(f, '#ffffff', 0.25), f] } }); p.line(ell(x, y, r * 0.66, r * (o.flat ?? 1) * 0.66), { lw: 1.1, noSplit: true }); return p; };
    // an invented banknote: a plain frame, a loaf in an oval, a number. Never a real currency's design
    W.bill = (o) => { const p = W.part({ name: o.name ?? 'bill', in: o.in, z: o.z, lw: 2 }), { x, y } = o, w = o.w ?? 66, h = o.h ?? w * 0.5, r = (o.rot ?? 0) * DEG, f = o.fill ?? '#bfe0b0', R = (dx, dy) => [x + dx * Math.cos(r) - dy * Math.sin(r), y + dx * Math.sin(r) + dy * Math.cos(r)]; p.shape([R(-w / 2, -h / 2), R(w / 2, -h / 2), R(w / 2, h / 2), R(-w / 2, h / 2)], { fill: f }); const e = ell(0, 0, w * 0.2, h * 0.32).map((q) => R(q[0], q[1])); p.line(e, { lw: 1.2, noSplit: true }); for (const s of [-1, 1]) { p.line([R((s * w) / 2 - s * 6, -h / 2 + 5), R((s * w) / 2 - s * 6, h / 2 - 5)], { lw: 1 }); } return p; };
    // a price tag on a string; o.hang = [x, y] where the string starts. Returns the part; write on it with W.write
    W.tag = (o) => { const p = W.part({ name: o.name ?? 'tag', in: o.in, z: o.z, lw: 3 }), { x, y } = o, w = o.w ?? 120, h = o.h ?? 170, f = o.fill ?? C.note, nk = Math.min(w, h) * 0.24, top = y - h / 2; p.shape([[x - w / 2 + nk, top], [x + w / 2 - nk, top], [x + w / 2, top + nk], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2], [x - w / 2, top + nk]], { fill: { v: [f, mixHex(f, C.wallB, 0.35)] } }); p.circle(x, top + nk * 0.72, 6, { lw: 2, fill: C.ink }); if (o.hang) p.line([o.hang, [lerp(o.hang[0], x, 0.5) + 3, lerp(o.hang[1], top, 0.6)], [x, top + nk * 0.72]], { lw: 2, smooth: true }); return p; };
    // a signboard on posts (or hanging): the wooden place for numbers and words in the drawing's own language
    W.sign = (o) => { const p = W.part({ name: o.name ?? 'sign', in: o.in, z: o.z, lw: 3 }), { x, y, w, h } = o, f = o.fill ?? C.note; if (o.posts !== false) for (const s of [-0.38, 0.38]) p.shape([[x + s * w - 5, y - h / 2 - 4], [x + s * w + 5, y - h / 2 - 4], [x + s * w + 5, y + h / 2 + (o.leg ?? 60)], [x + s * w - 5, y + h / 2 + (o.leg ?? 60)]], { fill: C.wood }); p.rect(x, y, w, h, { fill: f }); p.line([[x - w / 2 + 6, y - h / 2 + 6], [x + w / 2 - 6, y - h / 2 + 6], [x + w / 2 - 6, y + h / 2 - 6], [x - w / 2 + 6, y + h / 2 - 6], [x - w / 2 + 6, y - h / 2 + 6]], { lw: 1.2, ink: mixHex(f, C.ink, 0.55) }); for (const a of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.circle(x + a[0] * (w / 2 - 4), y + a[1] * (h / 2 - 4), 1.7, { fill: C.ink, lw: 0.8 }); return p; };
    // a hanging shingle with hand-lettering; hang: [x, y] or true (two short strings upward)
    W.label = (text, o = {}) => {
      const size = o.size ?? 44, wd = o.w ?? units(text) * size * 1.08 + size * 0.7, h = o.h ?? size * 1.5, { x, y } = o, s0 = W.part({ name: `lab-str:${text}`, in: o.in, z: o.z, lw: 1.8 }), up = o.hangY ?? y - h / 2 - (o.drop ?? 34);
      if (o.hang !== false) for (const q of [-0.32, 0.32]) s0.line([[x + q * wd, y - h / 2], [x + q * wd * (o.pinch ?? 0.7), up]], { lw: 1.8 });
      const b = W.part({ name: `lab:${text}`, in: o.in, z: o.z, lw: 2.8 }), f = o.fill ?? C.note; b.rect(x, y, wd, h, { fill: { v: [f, mixHex(f, C.wallB, 0.3)] } }); shade(b, [[x - wd / 2, y + h / 2], [x + wd / 2, y + h / 2], [x + wd / 2 - 4, y + h / 2 + 7], [x - wd / 2 + 4, y + h / 2 + 7]], 0.2);
      const tx = W.write(text, { x, y: y + size * 0.03, size, in: o.in, z: o.z, small: o.small, name: `lab-txt:${text}` });
      return { parts: [s0, b, tx], text: tx };
    };
    W.lamp = (o) => { const p = W.part({ name: o.name ?? 'lamp', in: o.in, z: o.z, lw: 2.6 }), { x, y } = o, h = o.h ?? 130, f = o.fill ?? C.metalD; p.shape([[x - 3, y - h], [x + 3, y - h], [x + 4, y], [x - 4, y]], { fill: f }); p.shape([[x - 12, y - h], [x + 12, y - h], [x + 8, y - h - 24], [x - 8, y - h - 24]], { fill: C.lit }); p.shape([[x - 13, y - h - 24], [x + 13, y - h - 24], [x, y - h - 38]], { fill: f }); p.line([[x - 9, y - 10], [x + 9, y - 10]], { lw: 3 }); W.glow({ x, y: y - h - 12, r: 46, in: o.in, z: o.z, from: o.from, period: o.period }); return p; };
    // colour-stage light: a soft halo that breathes
    W.glow = (o) => { const p = W.part({ name: o.name ?? 'glow', in: o.in, z: o.z ?? 2, colorOnly: true }); p.glow = { x: o.x, y: o.y, r: o.r ?? 40, c: o.c ?? C.lit, a: o.a ?? 0.5 }; p.blink(o.period ?? 2.6 + rnd(seed0, Math.round(o.x)) * 2, { duty: 0.6, min: 0.55, from: o.from }); return p; };
    // a tube along a polyline: r may be a function of 0..1 (a pipe that narrows). Flanges every `every` units, rivets, a highlight
    W.pipe = (o) => {
      const p = W.part({ name: o.name ?? 'pipe', in: o.in, z: o.z, lw: o.lw ?? 3 }), pts = o.smooth ? catmull(o.pts, false, 10) : o.pts, r = o.r ?? 18, f = o.fill ?? C.metal, rOf = typeof r === 'function' ? r : () => r;
      p.shape(band(pts, r), { fill: f, noSplit: !!o.smooth });
      const L = plen(pts); p.line(band(pts, (q) => rOf(q) * 0.45).slice(0, pts.length), { lw: 1.2, ink: mixHex(f, '#ffffff', 0.6), noSplit: true });
      const ev = o.every ?? 120;
      for (let s = ev * 0.5; s < L; s += ev) { const a = at(pts, s), b = at(pts, s + 1), d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d, tx = (b[0] - a[0]) / d, ty = (b[1] - a[1]) / d, rr = rOf(s / L) + 4, hw = 5; p.shape([[a[0] + nx * rr - tx * hw, a[1] + ny * rr - ty * hw], [a[0] + nx * rr + tx * hw, a[1] + ny * rr + ty * hw], [a[0] - nx * rr + tx * hw, a[1] - ny * rr + ty * hw], [a[0] - nx * rr - tx * hw, a[1] - ny * rr - ty * hw]], { fill: mixHex(f, C.ink, 0.3), lw: 1.8 }); }
      p.pts = pts; p.rOf = rOf; p.L = L;
      return p;
    };
    // what flows through a pipe or along a chute: tiny things moving on a path (life only)
    W.flow = (o) => { const n = o.n ?? 8, ps = []; for (let i = 0; i < n; i++) { const a = o.pts[0], q = W.part({ name: `flow${i}`, in: o.in, z: o.z, colorOnly: o.colorOnly ?? true, lw: 1.6, ink: o.ink }); (o.make || ((pp) => pp.ellipse(a[0], a[1], o.r ?? 5, (o.r ?? 5) * 0.72, { fill: o.fill ?? C.lit })))(q, a[0], a[1], i); q.drift(o.pts, { speed: o.speed ?? 90, phase: i / n, loop: true, fade: o.fade ?? 0.06, from: o.from, ox: a[0], oy: a[1], step: o.step }); ps.push(q); } return flatP(ps); };
    W.valve = (o) => { const st = W.part({ name: (o.name ?? 'valve') + '-stem', in: o.in, z: o.z, lw: 2.4 }), { x, y } = o, r = o.r ?? 26; st.shape([[x - 7, y - r * 1.5], [x + 7, y - r * 1.5], [x + 7, y], [x - 7, y]], { fill: C.metalD }); const p = W.wheel({ x, y: y - r * 1.5, r, spokes: 4, fill: o.fill ?? C.roof, in: o.in, z: o.z, name: (o.name ?? 'valve') + '-wheel', hub: 5 }); return { parts: [st, p], wheel: p }; };
    W.tank = (o) => {
      const p = W.part({ name: o.name ?? 'tank', in: o.in, z: o.z, lw: 3.2 }), { x, y } = o, w = o.w ?? 120, h = o.h ?? 200, f = o.fill ?? C.metal, l = x - w / 2, r = x + w / 2, top = y - h, dome = o.dome ?? w * 0.22;
      p.shape([[l, y], [l, top], ...ell(x, top, w / 2, dome, Math.PI, Math.PI, 18), [r, y]], { fill: { h: [mixHex(f, '#ffffff', 0.2), mixHex(f, C.ink, 0.35)] }, noSplit: false });
      const nb = o.bands ?? 4; for (let i = 1; i <= nb; i++) { const yy = lerp(top, y, i / (nb + 1)); p.line(ell(x, yy, w / 2, 7, 0, Math.PI, 12), { lw: 1.5, noSplit: true }); const nr = Math.round(w / 22); for (let k = 0; k < nr; k++) { const a = ((k + 0.5) / nr) * Math.PI; p.circle(x + Math.cos(a) * w * 0.47, yy + Math.sin(a) * 7 + 5, 1.2, { fill: C.ink, lw: 0.6 }); } }
      if (o.ladder !== false) { const lx = r - w * 0.2; for (const s of [-8, 8]) p.line([[lx + s, top - 2], [lx + s, y]], { lw: 1.5 }); for (let yy = top + 10; yy < y; yy += 14) p.line([[lx - 8, yy], [lx + 8, yy]], { lw: 1.1 }); }
      return p;
    };
    W.cable = (o) => { const p = W.part({ name: o.name ?? 'cable', in: o.in, z: o.z, lw: o.lw ?? 2 }), [a, b] = [o.a, o.b], sag = o.sag ?? 26; p.line(Array.from({ length: 19 }, (_, i) => { const q = i / 18; return [lerp(a[0], b[0], q), lerp(a[1], b[1], q) + sag * 4 * q * (1 - q)]; }), { noSplit: true }); return p; };
    W.bunting = (o) => {
      const { a, b } = o, sag = o.sag ?? 34, n = o.n ?? Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 30), cols = o.colors ?? C.cloth, ps = [W.cable({ a, b, sag, in: o.in, z: o.z, name: (o.name ?? 'bunting') + '-line', lw: 1.8 })];
      const fl = W.part({ name: (o.name ?? 'bunting') + '-flags', in: o.in, z: o.z, lw: 1.8 });
      for (let i = 0; i < n; i++) { const q0 = (i + 0.15) / n, q1 = (i + 0.85) / n, px = (q) => [lerp(a[0], b[0], q), lerp(a[1], b[1], q) + sag * 4 * q * (1 - q)], A = px(q0), B = px(q1), h = o.h ?? 22; fl.shape([A, B, [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 + h]], { fill: cols[i % cols.length] }); }
      ps.push(fl);
      return flatP(ps);
    };
    // a gear with real teeth; W.mesh ties two by tooth count
    W.gear = (o) => {
      const p = W.part({ name: o.name ?? 'gear', in: o.in, z: o.z, lw: o.lw ?? 2.4 }), { x, y } = o, tn = o.teeth ?? 12, r = o.r ?? 40, d = o.depth ?? Math.min(9, r * 0.22), f = o.fill ?? C.brass, ph = (o.phase ?? 0) * DEG, pts = [];
      for (let i = 0; i < tn; i++) { const a = ph + (i / tn) * TAU, st = TAU / tn; for (const [q, rr] of [[-0.3, r - d], [-0.17, r], [0.17, r], [0.3, r - d]]) pts.push([x + Math.cos(a + q * st) * rr, y + Math.sin(a + q * st) * rr]); }
      p.shape(pts, { fill: { v: [mixHex(f, '#ffffff', 0.18), mixHex(f, C.woodD, 0.3)] }, noSplit: true, noHand: true });
      p.line(ell(x, y, r * 0.62, r * 0.62), { lw: 1.4, noSplit: true });
      const sp = o.spokes ?? (r > 34 ? 5 : 0); for (let i = 0; i < sp; i++) { const a = ph + (i / sp) * TAU; p.line([[x + Math.cos(a) * r * 0.18, y + Math.sin(a) * r * 0.18], [x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6]], { lw: 3 }); }
      p.circle(x, y, Math.max(3, r * 0.14), { fill: C.ink, lw: 1.4 });
      p.pivot(x, y); p.teeth = tn; p.r = r;
      return p;
    };
    W.mesh = (a, b, o = {}) => { const m = a.motions.find((x) => x.kind === 'spin'); if (!m) throw new Error(M('W.mesh：第一个齿轮要先 spin', 'W.mesh: the first gear must spin first')); b.spin((-m.rps * a.teeth) / b.teeth, { from: m.from, ramp: m.ramp, ...o }); return b; };
    // a wheel with a rim and spokes; propeller: blades instead of a rim
    W.wheel = (o) => {
      const p = W.part({ name: o.name ?? 'wheel', in: o.in, z: o.z, lw: o.lw ?? 3 }), { x, y } = o, r = o.r ?? 40, n = o.spokes ?? 8, f = o.fill ?? C.metalD, ph = (o.phase ?? 0) * DEG;
      if (o.blades) { for (let i = 0; i < o.blades; i++) { const a = ph + (i / o.blades) * TAU, w = o.bladeW ?? 0.5, hub = r * 0.14; p.shape([[x + Math.cos(a - 0.08) * hub, y + Math.sin(a - 0.08) * hub], [x + Math.cos(a - w * 0.28) * r, y + Math.sin(a - w * 0.28) * r], [x + Math.cos(a + w) * r * 0.97, y + Math.sin(a + w) * r * 0.97], [x + Math.cos(a + 0.12) * hub, y + Math.sin(a + 0.12) * hub]], { fill: { h: [o.fill ?? C.roof, mixHex(o.fill ?? C.roof, '#ffffff', 0.2)] } }); for (let k = 1; k < 4; k++) { const q = k / 4, rr = lerp(hub, r * 0.97, q); p.line([[x + Math.cos(a - w * 0.28 * q) * rr, y + Math.sin(a - w * 0.28 * q) * rr], [x + Math.cos(a + w * q) * rr, y + Math.sin(a + w * q) * rr]], { lw: 1.2 }); } } }
      else {
        const rim = ell(x, y, r, r), t = o.rim ?? Math.max(4, r * 0.09);
        p.shape(rim, { fill: o.solid ? f : null, seeThrough: true, occlude: false, noSplit: true }); p.line(ell(x, y, r - t, r - t), { lw: 1.6, noSplit: true });
        for (let i = 0; i < n; i++) { const a = ph + (i / n) * TAU; p.line([[x + Math.cos(a) * r * 0.1, y + Math.sin(a) * r * 0.1], [x + Math.cos(a) * (r - t), y + Math.sin(a) * (r - t)]], { lw: o.spokeW ?? 2.2 }); }
      }
      p.circle(x, y, o.hub ?? Math.max(4, r * 0.13), { fill: o.hubFill ?? C.brass, lw: 2 });
      p.pivot(x, y);
      return p;
    };
    W.windmill = (o) => {
      const { x, y } = o, h = o.h ?? 200, r = o.r ?? 90, ps = [], st = W.part({ name: (o.name ?? 'mill') + '-tower', in: o.in, z: o.z, lw: 2.8 });
      const top = y - h, w = o.w ?? h * 0.34;
      for (const s of [-1, 1]) st.shape(band([[x + s * 8, top], [x + (s * w) / 2, y]], 4), { fill: C.woodD });
      const nb = Math.max(2, Math.round(h / 55)); for (let i = 0; i < nb; i++) { const a = i / nb, b = (i + 1) / nb, wa = lerp(8, w / 2, a), wb = lerp(8, w / 2, b), ya = lerp(top, y, a), yb = lerp(top, y, b); st.line([[x - wa, ya], [x + wb, yb]], { lw: 1.6 }); st.line([[x + wa, ya], [x - wb, yb]], { lw: 1.6 }); st.line([[x - wb, yb], [x + wb, yb]], { lw: 2 }); }
      ps.push(st);
      const wh = W.wheel({ x, y: top, r, blades: o.blades ?? 6, fill: o.fill ?? C.roof, in: o.in, z: o.z, name: (o.name ?? 'mill') + '-wheel', phase: o.phase, hub: Math.max(5, r * 0.09) });
      ps.push(wh);
      return { parts: ps, wheel: wh };
    };
    // a townsperson: round head, simple body, dot eyes, optional hat and bag. Invented, never anyone real. x = centre, y = feet
    W.person = (o) => {
      const p = W.part({ name: o.name ?? 'person', in: o.in, z: o.z, lw: o.lw ?? 2.2 }), { x, y } = o, h = o.h ?? 84, f = o.face ?? 1, sd = hashS(`${o.name ?? ''}${x}${y}`), i = sd % 97, c = o.cloth ?? C.cloth[i % C.cloth.length], sk = o.skin ?? C.skin[i % C.skin.length], hr = h * 0.17, by = y - h * 0.3, hy = y - h + hr;
      for (const s of [-1, 1]) { p.line([[x + s * h * 0.07, by + h * 0.04], [x + s * h * 0.08, y - 1]], { lw: h * 0.05 }); p.line([[x + s * h * 0.08, y - 1], [x + s * h * 0.08 + f * h * 0.06, y - 1]], { lw: h * 0.05 }); }
      p.shape([[x - h * 0.17, by + h * 0.08], [x - h * 0.15, hy + hr * 1.3], [x + h * 0.15, hy + hr * 1.3], [x + h * 0.17, by + h * 0.08]], { fill: { v: [c, mixHex(c, C.ink, 0.25)] }, smooth: o.round ?? true, seg: 5, noSplit: true });
      const pose = o.pose ?? 'down', hand = (sx, ang) => { const sh = [x + sx * h * 0.14, hy + hr * 1.55]; return [sh, [sh[0] + Math.cos(ang) * h * 0.3, sh[1] + Math.sin(ang) * h * 0.3]]; };
      const arms = pose === 'up' ? [hand(-1, -2.2), hand(1, -0.9)] : pose === 'reach' ? [hand(f, f > 0 ? -0.15 : Math.PI + 0.15), hand(-f, 1.7)] : pose === 'carry' ? [hand(f, f > 0 ? 0.5 : Math.PI - 0.5), hand(-f, f > 0 ? Math.PI - 1.1 : 1.1)] : [hand(-1, 1.85), hand(1, 1.3)];
      for (const a of arms) p.line(a, { lw: h * 0.045 });
      if (o.bag) { const a = arms[0][1]; p.shape([[a[0] - h * 0.11, a[1]], [a[0] + h * 0.11, a[1]], [a[0] + h * 0.09, a[1] + h * 0.2], [a[0] - h * 0.09, a[1] + h * 0.2]], { fill: o.bag === true ? C.note : o.bag, lw: 1.8 }); }
      p.circle(x, hy, hr, { fill: sk, lw: 2.2 });
      p.line(ell(x, hy, hr, hr, Math.PI + 0.25, Math.PI - 0.5, 10), { lw: 3.2, noSplit: true, ink: o.hair });
      for (const s of [-0.36, 0.34]) p.circle(x + (s + f * 0.22) * hr, hy + hr * 0.08, Math.max(1, h * 0.012), { fill: C.ink, lw: 0.6 });
      p.line(ell(x + f * hr * 0.22, hy + hr * 0.36, hr * 0.2, hr * 0.14, 0.2, Math.PI - 0.4, 5), { lw: 1, noSplit: true });
      if (o.hat) { const hc = o.hat === true ? C.note : o.hat; p.shape([[x - hr * 1.28, hy - hr * 0.52], [x + hr * 1.28, hy - hr * 0.52], [x + hr * 0.82, hy - hr * 0.72], [x + hr * 0.7, hy - hr * 1.3], [x - hr * 0.7, hy - hr * 1.3], [x - hr * 0.82, hy - hr * 0.72]], { fill: hc, lw: 1.8 }); }
      p.pivot(x, y);
      return p;
    };
    // a queue along the ground from (x, y) in direction dir, n people; they shuffle forward in the life stage (step every `every` s, the front one leaves, a new one joins at the tail)
    W.queue = (o) => {
      const { x, y } = o, n = o.n ?? 6, gap = o.gap ?? 52, dir = o.dir ?? 1, ps = [], sd = hashS(`q${x}${y}`), every = o.every ?? 2.2;
      for (let i = 0; i < n; i++) {
        const px = x + dir * gap * i, h = (o.h ?? 84) * (0.9 + rnd(sd, i) * 0.22), p = W.person({ x: px, y: y + (i % 2) * 3, h, face: -dir, hat: rnd(sd, i + 40) < 0.3, bag: rnd(sd, i + 50) < 0.35 ? (C.cloth[i % C.cloth.length]) : false, in: o.in, z: o.z, name: `${o.name ?? 'queue'}-${i}`, pose: i === 0 ? 'reach' : 'down' });
        if (o.live !== false) {
          const L2 = gap * (n + 0.7);
          p.drift([[x + dir * gap * n, y], [x - dir * gap * 0.7, y]], { speed: gap / every, loop: true, phase: (gap * (n - i)) / L2, fade: 0.05, step: { every, dur: 0.55 }, from: o.from, ox: px, oy: y });
        }
        ps.push(p);
      }
      return { parts: ps };
    };
    // a conveyor: two rollers, top and bottom run; life: rollers spin and the goods move
    W.belt = (o) => {
      const { x0, y0, x1, y1 } = o, r = o.r ?? 12, ps = [], f = o.fill ?? C.metalD, d = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / d, ny = (x1 - x0) / d, b = W.part({ name: (o.name ?? 'belt'), in: o.in, z: o.z, lw: 2.6 });
      b.shape([[x0 + nx * r, y0 + ny * r], [x1 + nx * r, y1 + ny * r], [x1 - nx * r, y1 - ny * r], [x0 - nx * r, y0 - ny * r]], { fill: f });
      const nc = Math.round(d / 24); for (let i = 1; i < nc; i++) { const q = i / nc; b.line([[lerp(x0, x1, q) + nx * r, lerp(y0, y1, q) + ny * r], [lerp(x0, x1, q) - nx * r * 0.3, lerp(y0, y1, q) - ny * r * 0.3]], { lw: 1 }); }
      ps.push(b);
      const n = Math.round(d / (o.rollerEvery ?? 90)); for (let i = 0; i <= n; i++) ps.push(W.wheel({ x: lerp(x0, x1, i / n), y: lerp(y0, y1, i / n), r: r * 0.86, spokes: 3, in: o.in, z: o.z, name: `${o.name ?? 'belt'}-r${i}`, fill: C.metal, hub: 3, spokeW: 1.4, rim: 2.5 }));
      return { parts: ps, rollers: ps.slice(1), top: [[x0 - nx * r, y0 - ny * r], [x1 - nx * r, y1 - ny * r]] };
    };
    // a cable loop on pylons through the town: the closed loop, pylons with pulleys, cars that travel round it in the life stage. o.pts = the loop's corners (a pylon at each unless o.pylons)
    W.cableway = (o) => {
      const pts = o.pts, ps = [], ring = catmull(pts, true, 14); ring.push(ring[0]); const cars = o.cars ?? 6, base = o.base;
      const pylons = o.pylons ?? pts.map((q) => ({ x: q[0], y: q[1], base: base ?? q[1] + 220 }));
      for (const [i, py] of pylons.entries()) {
        const pp = W.part({ name: `${o.name ?? 'cableway'}-pylon${i}`, in: o.in, z: o.z, lw: 2.6 }), w = Math.min(56, (py.base - py.y) * 0.22), f = o.fill ?? C.metalD;
        for (const s of [-1, 1]) pp.shape(band([[py.x + s * 5, py.y], [py.x + (s * w) / 2, py.base]], 3), { fill: f });
        const nb = Math.max(2, Math.round((py.base - py.y) / 42)); for (let k = 0; k < nb; k++) { const a = k / nb, b = (k + 1) / nb, wa = lerp(5, w / 2, a), wb = lerp(5, w / 2, b), ya = lerp(py.y, py.base, a), yb = lerp(py.y, py.base, b); pp.line([[py.x - wa, ya], [py.x + wb, yb]], { lw: 1.3 }); pp.line([[py.x + wa, ya], [py.x - wb, yb]], { lw: 1.3 }); pp.line([[py.x - wb, yb], [py.x + wb, yb]], { lw: 1.6 }); }
        ps.push(pp);
      }
      const ln = W.part({ name: `${o.name ?? 'cableway'}-cable`, in: o.in, z: o.z, lw: o.lw ?? 2.6 }); ln.line(ring, { noSplit: true }); ps.push(ln);
      for (const [i, q] of pts.entries()) { if (o.pulleys === false) continue; ps.push(W.wheel({ x: q[0], y: q[1], r: 11, spokes: 4, in: o.in, z: o.z, name: `${o.name ?? 'cableway'}-p${i}`, fill: C.metal, hub: 3, spokeW: 1.2, rim: 2.5 })); }
      const carL = [], L = plen(ring);
      for (let i = 0; i < cars; i++) {
        const q = at(ring, (L * i) / cars), c = W.part({ name: `${o.name ?? 'cableway'}-car${i}`, in: o.in, z: (o.z ?? 0) + 0.001, lw: 2.2 }), x = q[0], y = q[1], cw = o.carW ?? 44, ch = o.carH ?? 32, f = (o.carColors ?? C.cloth)[i % (o.carColors ?? C.cloth).length];
        c.line([[x, y], [x, y + 16]], { lw: 2 });
        c.shape([[x - cw / 2, y + 16], [x + cw / 2, y + 16], [x + cw / 2, y + 16 + ch], [x - cw / 2, y + 16 + ch]], { fill: { v: [f, mixHex(f, C.ink, 0.25)] } });
        c.rect(x - cw * 0.22, y + 16 + ch * 0.38, cw * 0.32, ch * 0.42, { fill: C.lit, lw: 1.4 }); c.rect(x + cw * 0.22, y + 16 + ch * 0.38, cw * 0.32, ch * 0.42, { fill: C.lit, lw: 1.4 });
        c.circle(x, y, 3.4, { fill: C.ink, lw: 1 });
        c.drift(ring, { speed: o.speed ?? 70, loop: true, phase: i / cars, from: o.from, ox: x, oy: y });
        ps.push(c); carL.push(c);
      }
      return { parts: ps, cars: carL, ring };
    };
    // the market stall: posts, counter with planks, shelf, awning. x = centre, y = ground. Returns { parts, counterY, shelfY, awningY }
    W.stall = (o) => {
      const { x, y } = o, w = o.w ?? 280, h = o.h ?? 230, nm = o.name ?? 'stall', ps = [], top = y - h, cy = y - h * 0.34, fw = o.fill ?? C.wood;
      for (const s of [-1, 1]) ps.push(W.post({ x: x + (s * w) / 2 - s * 10, y0: top + 6, y1: y, w: 11, fill: fw, in: o.in, z: o.z, name: `${nm}-post${s}` }));
      const back = W.part({ name: `${nm}-back`, in: o.in, z: o.z, lw: 1.6 }); back.shape([[x - w / 2 + 14, top + 12], [x + w / 2 - 14, top + 12], [x + w / 2 - 14, cy], [x - w / 2 + 14, cy]], { fill: mixHex(C.wallB, C.woodD, 0.25), stroke: false }); ps.push(back);
      const c = W.part({ name: `${nm}-counter`, in: o.in, z: o.z, lw: 3 }); c.shape([[x - w / 2, cy], [x + w / 2, cy], [x + w / 2 - 6, y], [x - w / 2 + 6, y]], { fill: { v: [mixHex(fw, '#ffffff', 0.12), mixHex(fw, C.woodD, 0.6)] } });
      const n = Math.round(w / 26); for (let i = 1; i < n; i++) { const xx = lerp(x - w / 2 + 6, x + w / 2 - 6, i / n); c.line([[xx, cy + 8], [xx + (rnd(seed0, i) - 0.5) * 2, y - 2]], { lw: 1.1 }); } c.shape([[x - w / 2 - 8, cy - 8], [x + w / 2 + 8, cy - 8], [x + w / 2 + 8, cy + 3], [x - w / 2 - 8, cy + 3]], { fill: fw, lw: 2.6 }); ps.push(c);
      ps.push(W.awning({ x0: x - w / 2 + 4, x1: x + w / 2 - 4, y: top, drop: o.drop ?? 56, flare: 18, colors: o.colors, in: o.in, z: o.z, name: `${nm}-awning` }));
      return { parts: ps, counterY: cy - 8, awningY: top, hem: top + (o.drop ?? 56) + 10, x, y, w, h };
    };
    // ---- the world around the drawing: colour-only unless told otherwise ----
    W.sky = (o = {}) => { const p = W.part({ name: 'sky', colorOnly: true, z: -9 }), R = o.R ?? 8000, st = o.stops ?? C.sky; p.sky = { stops: st, y0: o.y0 ?? -1000, y1: o.y1 ?? 500, R }; p.items.push({ part: p, pts: [[-R, -R], [R, -R], [R, R], [-R, R]], closed: true, fill: C.sky[0], skyFill: true, lw: 0, stroke: false, order: -9e7 + ++p.sheet.seq, colorOnly: true, occlude: false }); if (o.stars) { const r = rngOf(seed0 ^ 71); for (let i = 0; i < o.stars; i++) { const sp = W.part({ name: `star${i}`, colorOnly: true, z: -8.9 }), x = (o.x0 ?? -1600) + r() * ((o.x1 ?? 1600) - (o.x0 ?? -1600)), y = (o.starTop ?? -1000) + r() * (o.starH ?? 500), s = 1.4 + r() * 2.4; sp.shape([[x, y - s * 2], [x + s * 0.4, y - s * 0.4], [x + s * 2, y], [x + s * 0.4, y + s * 0.4], [x, y + s * 2], [x - s * 0.4, y + s * 0.4], [x - s * 2, y], [x - s * 0.4, y - s * 0.4]], { fill: '#fff8df', stroke: false }); sp.blink(1.6 + r() * 3, { min: 0.2, duty: 0.5, from: o.from }); } } return p; };
    W.cloud = (o) => { const p = W.part({ name: o.name ?? 'cloud', colorOnly: o.colorOnly ?? true, z: o.z ?? -8, lw: o.lw ?? 0 }), { x, y } = o, w = o.w ?? 420, h = o.h ?? 80, c = o.fill ?? C.cloud, sd = hashS(`${x}${y}c`), pts = []; const n = 16; for (let i = 0; i <= n; i++) { const q = i / n, k = Math.sin(q * Math.PI) ** 0.6; pts.push([x - w / 2 + w * q, y - h * k * (0.6 + 0.4 * noise1(sd, q * 5))]); } for (let i = n; i >= 0; i--) { const q = i / n, k = Math.sin(q * Math.PI) ** 0.8; pts.push([x - w / 2 + w * q, y + h * 0.2 * k]); } p.shape(pts, { fill: { v: [c, o.fillB ?? C.cloudB] }, smooth: true, seg: 4, stroke: false }); p.pivot(x, y); if (o.drift !== false) p.bob(o.amp ?? 26, o.period ?? 22 + rnd(sd, 2) * 14, { axis: 'x', from: o.from, ramp: 2 }); return p; };
    W.hill = (o) => { const p = W.part({ name: o.name ?? 'hill', colorOnly: o.colorOnly ?? true, z: o.z ?? -7, lw: o.lw ?? 0 }), pts = catmull(o.pts, false, 10), base = o.base ?? 1400; p.shape([[pts[0][0], base], ...pts, [pts[pts.length - 1][0], base]], { fill: o.fill ?? C.hill[0], stroke: !!o.lw, noSplit: true }); return p; };
    // foliage: a mass of scalloped clumps in layers, darkest behind, upper clumps first so lower ones overlap like scales. Colour-only by default (the lines never drew it); line: true draws it in the line stage too
    W.foliage = (o) => {
      const { x, y } = o, w = o.w ?? 400, h = o.h ?? 200, sd = hashS(`${o.seed ?? ''}${x}${y}`), r = rngOf(sd), cols = o.colors ?? C.leaf, nL = o.layers ?? 3, dens = o.dens ?? 1, colorOnly = !o.line, sc = o.scale ?? 1;
      const p = W.part({ name: o.name ?? 'foliage', in: o.in, z: o.z ?? 1, colorOnly, lw: o.lw ?? (colorOnly ? 1.8 : 2.4), ink: o.ink ?? mixHex(cols[0], C.ink, 0.55) });
      const clump = (cx, cy, rr, top, bot, tick) => {
        const n = Math.round(7 + rr / 8), pts = []; for (let i = 0; i < n; i++) { const a0 = (i / n) * TAU, a1 = ((i + 0.5) / n) * TAU, peak = rr * (0.98 + r() * 0.16), val = rr * 0.86; pts.push([cx + Math.cos(a0) * val, cy + Math.sin(a0) * val * 0.84], [cx + Math.cos(a1) * peak, cy + Math.sin(a1) * peak * 0.84]); }
        p.shape(pts, { fill: { v: [top, bot] }, smooth: true, seg: 3, noSplit: true, noHand: true, lw: p.lw });
        const nt = Math.round(2 + rr / 16); for (let i = 0; i < nt; i++) { const a = -Math.PI * (0.12 + r() * 0.76), q = 0.25 + r() * 0.55, tx = cx + Math.cos(a) * rr * q, ty = cy + Math.sin(a) * rr * q * 0.8, s2 = (rr * 0.13 + r() * rr * 0.1); p.line(ell(tx, ty, s2, s2 * 0.7, 3.5, 2.2, 5), { lw: 1.2, ink: tick, noSplit: true, noHand: true }); }
      };
      for (let L = 0; L < nL; L++) {
        const q = nL > 1 ? L / (nL - 1) : 1, ci = Math.min(cols.length - 2, Math.floor(q * (cols.length - 1))), f = cols[ci], hi = cols[ci + 1], rr = lerp(1, 0.72, q) * (o.clump ?? 50) * sc, lift = 1 - q * 0.62, n = Math.round((((w * h * lift) / (rr * rr * 1.5)) * dens)), list = [];
        for (let i = 0; i < n; i++) { const ax = r(), edge = Math.pow(Math.max(0, Math.sin(ax * Math.PI)), o.dome ?? 0.5), top = y - h * edge * lift * (0.82 + 0.18 * noise1(sd + L, ax * 9)), cy = lerp(top, y, r() ** 1.3); list.push([x - w / 2 + ax * w, cy, rr * (0.78 + r() * 0.44)]); }
        list.sort((A, B) => A[1] - B[1]);
        for (const c of list) { const d = cl((c[1] - (y - h * lift)) / (h * lift)); clump(c[0], c[1], c[2], mixHex(hi, f, 0.15 + d * 0.5), mixHex(f, cols[0], 0.35 + d * 0.4), mixHex(hi, '#ffffff', 0.3)); }
      }
      if (o.bloom) { for (let i = 0; i < o.bloom; i++) { const cx = x - w / 2 + r() * w, cy = y - r() * h * 0.6, n = 3 + Math.floor(r() * 4); for (let k = 0; k < n; k++) clump(cx + (r() - 0.5) * 66 * sc, cy + (r() - 0.5) * 40 * sc, (14 + r() * 20) * sc, C.bloom[1], C.bloom[0], mixHex(C.bloom[1], '#ffffff', 0.45)); } }
      return p;
    };
    W.tree = (o) => { const { x, y } = o, h = o.h ?? 300, ps = [], t = W.part({ name: (o.name ?? 'tree') + '-trunk', in: o.in, z: o.z ?? 1, colorOnly: !o.line, lw: 2.2 }), tw = h * 0.045; t.shape([[x - tw * 1.3, y], [x - tw * 0.55, y - h * 0.55], [x + tw * 0.55, y - h * 0.55], [x + tw * 1.3, y]], { fill: o.trunk ?? C.trunk }); t.line([[x, y - h * 0.3], [x - h * 0.16, y - h * 0.58]], { lw: tw * 0.7 }); t.line([[x, y - h * 0.38], [x + h * 0.15, y - h * 0.62]], { lw: tw * 0.7 }); ps.push(t); const fl = W.foliage({ x, y: y - h * 0.42, w: o.w ?? h * 0.86, h: h * 0.6, in: o.in, z: o.z ?? 1, line: o.line, colors: o.colors, layers: o.layers ?? 3, clump: o.clump ?? h * 0.11, seed: o.seed, bloom: o.bloom }); ps.push(fl); return { parts: ps, leaves: fl }; };
    W.vine = (o) => { const p = W.part({ name: o.name ?? 'vine', in: o.in, z: o.z ?? 0.5, colorOnly: !o.line, lw: 2, ink: mixHex(C.leaf[0], C.ink, 0.3) }), pts = catmull(o.pts, false, 8), L = plen(pts), n = Math.round(L / (o.every ?? 18)), r = rngOf(hashS(`${o.pts[0]}v`)); p.line(pts, { lw: 2, noSplit: true }); for (let i = 0; i < n; i++) { const q = at(pts, (L * (i + 0.5)) / n), s = i % 2 ? 1 : -1, a = r() * 1.2 + (s > 0 ? -0.3 : 2.6), ll = 9 + r() * 7; p.shape([[q[0], q[1]], [q[0] + Math.cos(a - 0.6) * ll * 0.6, q[1] + Math.sin(a - 0.6) * ll * 0.6], [q[0] + Math.cos(a) * ll, q[1] + Math.sin(a) * ll], [q[0] + Math.cos(a + 0.6) * ll * 0.6, q[1] + Math.sin(a + 0.6) * ll * 0.6]], { fill: o.fill ?? C.leaf[2 + (i % 2)], smooth: true, seg: 3, noSplit: true, noHand: true, lw: 1.2 }); } if (o.sway) p.pivot(o.pts[0][0], o.pts[0][1]).sway(o.sway, 4 + r() * 3, { from: o.from }); return p; };
    W.birds = (o) => { const ps = [], r = rngOf(hashS(`${o.x}${o.y}b`)); for (let i = 0; i < (o.n ?? 5); i++) { const p = W.part({ name: `bird${i}`, colorOnly: true, z: o.z ?? -6, lw: 2, ink: o.ink ?? C.ink }), x = o.x + r() * 90, y = o.y + r() * 46, s = 6 + r() * 4; p.line([[x - s, y - s * 0.4], [x, y], [x + s, y - s * 0.4]], { lw: 2, smooth: true, seg: 4 }); p.drift(o.path ?? [[x, y], [x + 700, y - 60]], { speed: o.speed ?? 34, loop: true, phase: r(), fade: 0.1, from: o.from, ox: x, oy: y }); ps.push(p); } return flatP(ps); };

    // ---------- lettering: the pen writes. Items are made when the stroke data has arrived (a prep) ----------
    const texts = [], pendingChars = new Set();
    W.write = (text, o = {}) => {
      const str = String(text), sheet = S, size = o.size ?? 44, p = o.part ?? W.part({ name: o.name ?? `text:${str.slice(0, 8)}`, in: o.in, z: o.z, lw: o.lw ?? Math.max(1.5, size * 0.07), ink: o.ink }), T = { p, str, o, size, sheet };
      for (const c of str) if (isCJK(c)) pendingChars.add(c);
      // a reserved span of order so later parts still stay in front of it
      T.order0 = sheet.seq; sheet.seq += [...str].length * 30 + 4;
      if (o.fact !== false && !o.noFact) F.fact(str, undefined);
      texts.push(T); p.text = T; return p;
    };
    const layText = (T) => {
      const { p, str, o, size } = T, align = o.align ?? 'center', chars = [...str], lwMul = o.lw ?? Math.max(1.5, size * 0.07), adv = (c) => (isCJK(c) ? 1.02 : CJKP.test(c) ? 0.62 : (ADV[c] ?? (/[A-Z]/.test(c) ? 0.72 : /[a-z]/.test(c) ? 0.58 : 0.68))), wrap = o.wrap ?? Infinity;
      const lines = [[]]; let cw = 0; for (const c of chars) { if (c === '\n') { lines.push([]); cw = 0; continue; } const a = adv(c) * size; if (cw + a > wrap && lines[lines.length - 1].length) { lines.push([]); cw = 0; } lines[lines.length - 1].push(c); cw += a; }
      const lh = size * (o.lh ?? 1.3), H2 = lines.length * lh; let seq = T.order0; const mk = (pts) => p.items.push({ part: p, pts, closed: false, fill: null, lw: lwMul, ink: p.ink, stroke: true, order: p.z * 1e7 + ++seq, occlude: false, colorOnly: p.colorOnly, id: p.items.length, noSplit: true, letter: true, lettered: true, noHand: true });
      const lw2 = lines.map((L) => L.reduce((s, c) => s + adv(c) * size, 0)), maxW = Math.max(...lw2);
      if (o.plate) { const px = o.plate === true ? size * 0.28 : o.plate, x0 = o.x - (align === 'left' ? 0 : align === 'right' ? maxW : maxW / 2) - px, y0 = o.y - H2 / 2 - px * 0.6; const it = { part: p, pts: [[x0, y0], [x0 + maxW + 2 * px, y0], [x0 + maxW + 2 * px, y0 + H2 + px * 1.2], [x0, y0 + H2 + px * 1.2]], closed: true, fill: o.plateFill ?? C.note, lw: 0, ink: p.ink, stroke: false, order: p.z * 1e7 + T.order0 + 0.5, occlude: true, colorOnly: p.colorOnly, id: p.items.length, plate: true }; p.items.unshift(it); }
      T.missing = [];
      lines.forEach((L, li) => {
        let cx = o.x - (align === 'left' ? 0 : align === 'right' ? lw2[li] : lw2[li] / 2); const cyTop = o.y - H2 / 2 + li * lh + (lh - size) / 2;
        for (const c of L) {
          const a = adv(c) * size, jx = (rnd(seed0, seq) - 0.5) * size * 0.02, jy = (rnd(seed0, seq + 7) - 0.5) * size * 0.03;
          if (isCJK(c)) {
            const d = STROKES.get(c) && STROKES.get(c).data;
            if (!d) T.missing.push(c);
            else for (const m of d) { const pts = m.map((q) => [cx + jx + (q[0] / 1024) * size, cyTop + jy + ((900 - q[1]) / 1024) * size]); mk(pts.length > 2 ? catmull(pts, false, 6) : pts); }
          } else if (CJKP.test(c)) { if (/[：；]/.test(c)) { mk(ell(cx + size * 0.2, cyTop + size * 0.32, size * 0.035, size * 0.035, 0, TAU, 6)); mk(ell(cx + size * 0.2, cyTop + size * 0.72, size * 0.035, size * 0.035, 0, TAU, 6)); } else if (/[，。、]/.test(c)) mk(ell(cx + size * 0.14, cyTop + size * 0.8, size * 0.04, size * 0.04, 0, TAU, 6)); }
          else { const g = glyphOf(c); if (g) for (const s of g) mk(s.map((q) => [cx + jx + q[0] * size, cyTop + jy + q[1] * size * 0.92 + size * 0.04])); else if (c !== ' ') T.missing.push(c); }
          cx += a;
        }
      });
      if (T.missing.length) lintNotes.push({ t: o.at ?? 0, what: M('字没有笔画数据', 'no stroke data'), msg: M(`"${str}" 里的 ${[...new Set(T.missing)].join(' ')} 查不到笔画（网络或字库），这些字不会写出来`, `No stroke data for ${[...new Set(T.missing)].join(' ')} in "${str}" (network or dataset): they won't be written`) });
    };
    // a strike-through: a quick pen line across lettering already on the page
    W.strike = (target, o = {}) => { const p = W.part({ name: o.name ?? 'strike', in: o.in, z: o.z ?? 0.01, lw: o.lw ?? 3.4, ink: o.ink }); p.isStrike = true; let a, b; if (Array.isArray(target)) { a = target[0]; b = target[1]; } else { const T = target.text, sz = T.size, wd = units(T.str) * sz * 0.72; a = [T.o.x - wd * 0.55, T.o.y + sz * 0.1]; b = [T.o.x + wd * 0.55, T.o.y - sz * 0.12]; } p.line([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 2], b], { smooth: true, seg: 4, noSplit: true }); return p; };

    // ---------- time: jobs (the pen), the wash, the life ----------
    W.draw = (target, o = {}) => {
      let a = o.at, b = o.until;
      if (o.line && F.T) { a ??= F.T.start(o.line); b ??= F.T.end(o.line); }
      if (a === undefined) throw new Error(M('W.draw 要给 at 或 line', 'W.draw needs at or line'));
      b ??= a + (o.dur ?? 2);
      const sheet = o.sheet ?? S, job = { target, parts: W.partsOf(target), a, b, o, sheet, runs: [] };
      sheet.jobs.push(job);
      F.info(o.kind ?? 'illustration', a, F.duration, { group: 'picture' });
      return job;
    };
    let wash = null, finalView = opt.final ?? null; const camKeys = [];
    W.wash = (o = {}) => { wash = { at: o.at ?? 0, dur: o.dur ?? 4, from: o.from ?? 'corners', seed: o.seed ?? seed0, bands: o.bands ?? 3, soft: o.soft ?? 0.075, o }; F.sfx(wash.at, 'wash', o.gain ?? 0.7, { dur: wash.dur, keep: true }); if (F.musicCue) F.musicCue(wash.at, 'hit'); return wash; };
    W.final = (v) => { finalView = v; };
    W.cam = (t, v) => { camKeys.push({ t, v }); };
    const lifeFrom = () => (wash ? wash.at + wash.dur * 0.6 : 1e9);

    // ---------- finalize: hand strokes, schedule, occlusion ----------
    const lintNotes = [];
    const handOf = (it) => {
      if (it._hand) return it._hand;
      const out = [], sd = mix32(it.part.seed ^ (it.id * 2654435761)), lw = it.lw;
      const segs = it.noSplit ? [it.closed && it.pts.length > 2 && Math.hypot(it.pts[0][0] - it.pts[it.pts.length - 1][0], it.pts[0][1] - it.pts[it.pts.length - 1][1]) > 0.01 ? [...it.pts, it.pts[0]] : it.pts] : splitCorners(it.pts, it.closed);
      segs.forEach((seg, si) => {
        const L = plen(seg); if (L < 0.01) return;
        const s1 = mix32(sd + si * 101), step = it.letter ? Math.max(1.6, Math.min(4, L / 8)) : L < 24 ? Math.max(1.6, L / 6) : L < 120 ? 6 : 10, N = Math.max(2, Math.ceil(L / step) + 1), pts = [];
        const over = !it.letter && !it.noHand && !it.noSplit && L > 26 ? Math.min(5, L * 0.03) * WOB : 0, oA = over * rnd(s1, 1), oB = over * rnd(s1, 2);
        const a = seg[0], a2 = at(seg, Math.min(L, 2)), b = seg[seg.length - 1], b2 = at(seg, Math.max(0, L - 2)), da = Math.hypot(a[0] - a2[0], a[1] - a2[1]) || 1, db = Math.hypot(b[0] - b2[0], b[1] - b2[1]) || 1;
        const amp = it.letter ? Math.min(0.5, L * 0.02) * WOB : it.noHand ? 0.25 * WOB : Math.min(1.25, 0.25 + L * 0.0035) * WOB, fq = 40 + rnd(s1, 3) * 80;
        for (let i = 0; i < N; i++) {
          const s = (i / (N - 1)) * L, q = at(seg, s), q2 = at(seg, Math.min(L, s + 1)), q1 = at(seg, Math.max(0, s - 1)), d = Math.hypot(q2[0] - q1[0], q2[1] - q1[1]) || 1, nx = -(q2[1] - q1[1]) / d, ny = (q2[0] - q1[0]) / d, wb = noise1(s1, s / fq) * amp;
          pts.push([q[0] + nx * wb, q[1] + ny * wb]);
        }
        if (oA > 0.3) pts.unshift([pts[0][0] + ((a[0] - a2[0]) / da) * oA, pts[0][1] + ((a[1] - a2[1]) / da) * oA]);
        if (oB > 0.3) pts.push([pts[pts.length - 1][0] + ((b[0] - b2[0]) / db) * oB, pts[pts.length - 1][1] + ((b[1] - b2[1]) / db) * oB]);
        const st = mkStroke(pts, it, s1); if (st) out.push(st);
        // the odd long line gets a second, lighter pass: how a hand firms up an outline
        if (!it.letter && !it.noHand && lw >= 2.4 && L > 110 && rnd(s1, 5) < 0.28) { const off = 0.9 + rnd(s1, 6) * 1.2, dd = pts.map((q, i) => { const A = pts[Math.max(0, i - 1)], B = pts[Math.min(pts.length - 1, i + 1)], d = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1; return [q[0] - ((B[1] - A[1]) / d) * off, q[1] + ((B[0] - A[0]) / d) * off]; }), u0 = Math.floor(dd.length * rnd(s1, 7) * 0.3), u1 = Math.ceil(dd.length * (0.7 + rnd(s1, 8) * 0.3)); const st2 = mkStroke(dd.slice(u0, u1), it, s1 + 3, 0.55); if (st2) out.push(st2); }
      });
      it._hand = out; return out;
    };
    const mkStroke = (pts, it, sd, wMul = 1) => {
      if (pts.length < 2) return null;
      const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const L = cum[cum.length - 1], lw = it.lw * wMul, w = pts.map((_, i) => { const s = cum[i], tp = Math.min(1, 0.45 + (0.55 * Math.min(s, L - s)) / Math.max(1, lw * 2.4)); return (lw * (0.84 + 0.16 * noise1(sd + 11, s / 60)) * tp) / 2; });
      return { pts, cum, L, w, it, sd };
    };
    // the ribbon of samples [i0, i1] (with an optional live end) added to a Path2D
    const ribbon = (path, st, i0, i1, tip) => {
      const { pts, w } = st, L = [], R = [];
      const push = (x, y, ax, ay, bx, by, r) => { const d = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / d, ny = (bx - ax) / d; L.push(x + nx * r, y + ny * r); R.push(x - nx * r, y - ny * r); };
      for (let i = i0; i <= i1; i++) { const a = pts[Math.max(i0, i - 1)], b = pts[Math.min(tip ? i1 : i1, i + 1)]; push(pts[i][0], pts[i][1], a[0], a[1], b[0], b[1], w[i]); }
      if (tip) { const a = pts[i1]; push(tip[0], tip[1], a[0], a[1], tip[0], tip[1], tip[2]); }
      if (L.length < 4) return;
      path.moveTo(L[0], L[1]); for (let i = 2; i < L.length; i += 2) path.lineTo(L[i], L[i + 1]);
      for (let i = R.length - 2; i >= 0; i -= 2) path.lineTo(R[i], R[i + 1]); path.closePath();
    };
    const SPEED = opt.pace ?? 1;
    const naturalDur = (L, lettered) => (lettered ? 0.02 + 0.0098 * Math.pow(L, 0.8) : 0.016 + 0.0072 * Math.pow(L, 0.74)) / SPEED;
    const finalizeSheet = (sh) => {
      sh.jobs.sort((a, b) => a.a - b.a);
      const drawnPolys = [], cell = 120, grid = new Map(), keyOf = (i, j) => i * 100003 + j, runsByCell = new Map();
      const addPoly = (it, tAt) => { const b = bboxOf(it.pts), e = { it, b, t: tAt }; drawnPolys.push(e); for (let i = Math.floor(b.x0 / cell); i <= Math.floor(b.x1 / cell); i++) for (let j = Math.floor(b.y0 / cell); j <= Math.floor(b.y1 / cell); j++) { const k = keyOf(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(e); } };
      const hiddenAt = (x, y, order) => { const L = grid.get(keyOf(Math.floor(x / cell), Math.floor(y / cell))); if (!L) return false; for (const e of L) if (e.it.order > order && x >= e.b.x0 && x <= e.b.x1 && y >= e.b.y0 && y <= e.b.y1 && inPoly(e.it.pts, x, y)) return true; return false; };
      let pen = null, prevEnd = -1e9; sh.runs = [];
      const seen = new Set();
      for (const job of sh.jobs) {
        const parts = job.parts.filter((p) => !p.colorOnly);
        // tour: by default the pen goes to the nearest unfinished part (short travels, a calm hand); 'given' keeps the declared order. Lettering and strikes hold their place in the list, so a sign is there before its words and words read in order
        // inside a part: fills first, the first stroke item stays first (usually the outline), then the nearest unfinished stroke; lettering keeps its real stroke order; strokes: 'given' keeps the declared one
        const items = [], list = parts.slice(), toured = new Map();
        const strokeEnds = (it) => [it.pts[0], it.closed ? it.pts[0] : it.pts[it.pts.length - 1]], distTo = (e, c) => Math.hypot(e[0] - c[0], e[1] - c[1]);
        const tourItems = (p) => {
          if (toured.has(p)) return toured.get(p);
          const all = p.items.filter((it) => !it.colorOnly), rest = all.filter((it) => it.stroke && it.pts.length); let out = all;
          if (job.o.strokes !== 'given' && !all.some((it) => it.letter) && rest.length >= 3) {
            out = [...all.filter((it) => !it.stroke), rest.shift()]; let cur = out[out.length - 1].pts[out[out.length - 1].pts.length - 1];
            while (rest.length) { let bi = 0, bd = 1e18; rest.forEach((it, i) => { const d = Math.min(...strokeEnds(it).map((e) => distTo(e, cur))); if (d < bd) { bd = d; bi = i; } }); const it = rest.splice(bi, 1)[0], [e0, e1] = strokeEnds(it); out.push(it); cur = distTo(e0, cur) <= distTo(e1, cur) ? e1 : e0; }
          }
          toured.set(p, out); return out;
        };
        const lastEnd = (p) => { const l = [...tourItems(p)].reverse().find((it) => it.stroke && it.pts.length); return l ? l.pts[l.pts.length - 1] : null; };
        if ((job.o.order ?? 'near') === 'near') {
          let cur = pen ?? null; const rest = list.splice(0), holds = (p) => p.isStrike || p.items.some((it) => it.letter);
          while (rest.length) {
            let bi = 0, bd = 1e18;
            for (let i = 0; i < rest.length; i++) {
              const p = rest[i]; if (i > 0 && holds(p)) break;
              const f = tourItems(p).find((it) => it.stroke && it.pts.length), d = !f ? 1e17 : !cur ? i * 1e-6 : Math.min(...strokeEnds(f).map((e) => distTo(e, cur)));
              if (d < bd) { bd = d; bi = i; }
            }
            const nx = rest.splice(bi, 1)[0]; list.push(nx); cur = lastEnd(nx) ?? cur;
          }
        }
        for (const p of list) { if (seen.has(p)) continue; seen.add(p); items.push(...tourItems(p)); }
        job.items = items;
        const jobRuns = []; let cursor = pen;
        for (const it of items) {
          if (it.occlude && it.closed) it._occl = true;
          if (!it.stroke) { if (it._occl) addPoly(it, 0); continue; }
          const strokes = handOf(it).slice();
          for (const st of strokes) {
            // an open stroke can run either way: start at the near end
            let s2 = st;
            if (cursor && !it.closed && !it.letter && !it.noFlip) { const d0 = Math.hypot(st.pts[0][0] - cursor[0], st.pts[0][1] - cursor[1]), d1 = Math.hypot(st.pts[st.pts.length - 1][0] - cursor[0], st.pts[st.pts.length - 1][1] - cursor[1]); if (d1 < d0 * 0.8) { const rp = st.pts.slice().reverse(), rw = st.w.slice().reverse(), cum = [0]; for (let i = 1; i < rp.length; i++) cum.push(cum[i - 1] + Math.hypot(rp[i][0] - rp[i - 1][0], rp[i][1] - rp[i - 1][1])); s2 = { ...st, pts: rp, w: rw, cum }; } }
            // pen-lifts over what already drawn nearer parts hide
            let i0 = -1; const n = s2.pts.length, vis = new Array(n);
            for (let i = 0; i < n; i++) vis[i] = !hiddenAt(s2.pts[i][0], s2.pts[i][1], it.order);
            for (let i = 0; i <= n; i++) { const v = i < n && vis[i]; if (v && i0 < 0) i0 = i; if ((!v || i === n) && i0 >= 0) { const i1 = i - 1; if (i1 > i0) { const run = { st: s2, i0, i1, it, L: s2.cum[i1] - s2.cum[i0], job, off: null }; jobRuns.push(run); cursor = s2.pts[i1]; } i0 = -1; } }
          }
          // from here on this part hides what is behind it for everything drawn later
          if (it.occlude && it.closed) { addPoly(it, 0); }
        }
        // timing: natural durations scaled into the window
        let nat = 0; let prev = pen;
        for (const r of jobRuns) { r.nat = naturalDur(r.L, r.it.lettered); r.trv = prev ? Math.min(0.55, 0.012 + 0.0011 * Math.hypot(r.st.pts[r.i0][0] - prev[0], r.st.pts[r.i0][1] - prev[1])) : 0.1; nat += r.nat + r.trv; prev = r.st.pts[r.i1]; }
        if (FLAT && prevEnd > job.a) { const d = job.b - job.a; job.a = prevEnd; job.b = job.a + Math.max(0.2, d * 0.7); }
        const win = Math.max(0.05, job.b - job.a), scale = job.o.natural ? 1 : win / Math.max(1e-3, nat); job.nat = nat; job.scale = scale;
        let t = job.a;
        for (const r of jobRuns) { r.ta = t + r.trv * scale; r.tb = r.ta + r.nat * scale; r.from = pen; t = r.tb; pen = r.st.pts[r.i1]; }
        job.end = t; prevEnd = t; job.runs = jobRuns; sh.runs.push(...jobRuns);
        job.bbox = (() => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const r of jobRuns) for (let i = r.i0; i <= r.i1; i++) { const q = r.st.pts[i]; if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; } return x0 > x1 ? null : { x0, y0, x1, y1 }; })();
      }
      sh.runs.sort((a, b) => a.ta - b.ta);
      // knock-out: a nearer part drawn after a farther line hides that line as its outline goes round: each hidden sample disappears when the pen passes nearest to it
      const occl = []; for (const job of sh.jobs) for (const it of job.items) if (it._occl) occl.push({ it, b: bboxOf(it.pts), runs: job.runs.filter((r) => r.it === it) });
      const runCell = new Map(); for (const r of sh.runs) { const b = (r._b = bboxOf(r.st.pts.slice(r.i0, r.i1 + 1))); for (let i = Math.floor(b.x0 / cell); i <= Math.floor(b.x1 / cell); i++) for (let j = Math.floor(b.y0 / cell); j <= Math.floor(b.y1 / cell); j++) { const k = keyOf(i, j); if (!runCell.has(k)) runCell.set(k, []); runCell.get(k).push(r); } }
      let knocked = 0;
      for (const oc of occl) {
        const it = oc.it, tOwn = oc.runs.length ? oc.runs[oc.runs.length - 1].tb : null, tStart = oc.runs.length ? oc.runs[0].ta : null, done = new Set();
        if (tOwn === null) { // a fill with no outline of its own (a plate): it arrives with the part's first stroke
          const pr = sh.runs.find((r) => r.it.part === it.part); if (!pr) continue;
          for (let i = Math.floor(oc.b.x0 / cell); i <= Math.floor(oc.b.x1 / cell); i++) for (let j = Math.floor(oc.b.y0 / cell); j <= Math.floor(oc.b.y1 / cell); j++) for (const r of runCell.get(keyOf(i, j)) || []) { if (done.has(r) || r.it.order >= it.order || r.ta >= pr.ta) continue; done.add(r); for (let k = r.i0; k <= r.i1; k++) { const q = r.st.pts[k]; if (q[0] >= oc.b.x0 && q[0] <= oc.b.x1 && q[1] >= oc.b.y0 && q[1] <= oc.b.y1 && inPoly(it.pts, q[0], q[1])) { (r.off ??= new Map()).set(k, Math.min(r.off.get(k) ?? 1e9, pr.ta)); knocked++; } } }
          continue;
        }
        const samples = []; for (const r of oc.runs) { for (let k = r.i0; k <= r.i1; k += 2) { const qq = (r.st.cum[k] - r.st.cum[r.i0]) / Math.max(1e-3, r.L); samples.push([r.st.pts[k][0], r.st.pts[k][1], r.ta + (r.tb - r.ta) * qq]); } }
        for (let i = Math.floor(oc.b.x0 / cell); i <= Math.floor(oc.b.x1 / cell); i++) for (let j = Math.floor(oc.b.y0 / cell); j <= Math.floor(oc.b.y1 / cell); j++) for (const r of runCell.get(keyOf(i, j)) || []) {
          if (done.has(r) || r.it.order >= it.order || r.ta >= tStart) continue; done.add(r);
          for (let k = r.i0; k <= r.i1; k++) {
            const q = r.st.pts[k]; if (q[0] < oc.b.x0 || q[0] > oc.b.x1 || q[1] < oc.b.y0 || q[1] > oc.b.y1 || !inPoly(it.pts, q[0], q[1])) continue;
            let best = tOwn, bd = 1e18; for (const s of samples) { const d = (s[0] - q[0]) ** 2 + (s[1] - q[1]) ** 2; if (d < bd) { bd = d; best = s[2]; } }
            (r.off ??= new Map()).set(k, Math.min(r.off.get(k) ?? 1e9, best)); knocked++;
          }
        }
      }
      sh.knocked = knocked;
      // static geometry: permanent spans go into chunks in draw order; spans that a later part will hide are drawn one by one
      const addPerm = (path, r) => { if (!r.off) { ribbon(path, r.st, r.i0, r.i1); return; } let a = -1; for (let k = r.i0; k <= r.i1 + 1; k++) { const perm = k <= r.i1 && !r.off.has(k); if (perm && a < 0) a = k; if (!perm && a >= 0) { if (k - 1 > a) ribbon(path, r.st, a, k - 1); a = -1; } } };
      const CH = 48; sh.chunks = []; sh.addPerm = addPerm;
      for (let i = 0; i < sh.runs.length;) { const list = []; for (let k = i; k < sh.runs.length && list.length < CH && sh.runs[k].job === sh.runs[i].job; k++) list.push(sh.runs[k]); const path = new Path2D(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const inks = {}; for (const r of list) { x0 = Math.min(x0, r._b.x0); y0 = Math.min(y0, r._b.y0); x1 = Math.max(x1, r._b.x1); y1 = Math.max(y1, r._b.y1); addPerm(path, r); } sh.chunks.push({ path, a: i, b: i + list.length - 1, tb: list[list.length - 1].tb, box: { x0: x0 - 8, y0: y0 - 8, x1: x1 + 8, y1: y1 + 8 }, job: list[0].job }); i += list.length; }
      sh.doomed = sh.runs.filter((r) => r.off);
      sh.tbs = sh.runs.map((r) => r.tb);
    };

    // ---------- the pen's clock ----------
    const lastDone = (sh, t) => { let lo = 0, hi = sh.tbs.length; while (lo < hi) { const m = (lo + hi) >> 1; if (sh.tbs[m] <= t) lo = m + 1; else hi = m; } return lo; };   // how many runs are finished
    const easeRun = (q, L) => (L < 20 ? q : lerp(q, smooth(q), Math.min(1, L / 200)));
    const tipOf = (sh, t) => {
      const R = sh.runs; if (!R.length) return null;
      const n = lastDone(sh, t);
      if (n < R.length && t >= R[n].ta) { const r = R[n], q = easeRun((t - r.ta) / Math.max(1e-4, r.tb - r.ta), r.L), s = r.st.cum[r.i0] + q * r.L; let k = r.i0; while (k < r.i1 && r.st.cum[k + 1] < s) k++; const a = r.st.pts[k], b = r.st.pts[Math.min(k + 1, r.i1)], d = r.st.cum[Math.min(k + 1, r.i1)] - r.st.cum[k], u = d ? (s - r.st.cum[k]) / d : 0; return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), down: true, run: r, k, w: r.st.w[k] }; }
      const prev = R[n - 1], next = R[n];
      if (!prev && next) return { x: next.st.pts[next.i0][0], y: next.st.pts[next.i0][1], down: false, before: true, q: next.ta - t };
      if (!next) { const e = prev.st.pts[prev.i1]; return { x: e[0], y: e[1], down: false, after: true, q: t - prev.tb }; }
      const e = prev.st.pts[prev.i1], s = next.st.pts[next.i0], span = next.ta - prev.tb, trv = next.trv * next.job.scale, q = span > 1e-4 ? cl((t - (next.ta - trv)) / Math.max(1e-4, trv)) : 1, u = smooth(q);
      return { x: lerp(e[0], s[0], u), y: lerp(e[1], s[1], u), down: false, lift: Math.sin(q * Math.PI) };
    };

    // ---------- the camera: built once from the jobs, then a pure function of t ----------
    const VW = (z) => W0 / (z * U), VH = (z) => H0 / (z * U);
    const CAPY = (opt.captions === false || !F.voiced) ? 0 : (PT ? 0.24 : 0.14);   // bottom share kept free for captions
    const fitZ = (b, pad) => Math.min(W0 / ((b.x1 - b.x0 + 2 * pad) * U), (H0 * (1 - CAPY - 0.08)) / ((b.y1 - b.y0 + 2 * pad) * U));
    const poseOf = (b, pad, zHi, zLo) => { const z = cl(fitZ(b, pad), zLo ?? 0.05, zHi ?? ZMAX); return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 + (VH(z) * (CAPY - 0.02)) / 2, z }; };
    let CAM = null, finalPose = null;
    const camAt = (t) => { if (!CAM) return { x: 0, y: 0, z: 1 }; const f = cl(t, 0, F.duration) * FPS, i = Math.min(CAM.x.length - 2, Math.floor(f)), u = f - i; return { x: lerp(CAM.x[i], CAM.x[i + 1], u), y: lerp(CAM.y[i], CAM.y[i + 1], u), z: Math.exp(lerp(CAM.lz[i], CAM.lz[i + 1], u)) }; };
    const gauss = (arr, sigma) => { const r = Math.ceil(sigma * 3), ker = []; let s = 0; for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); ker.push(v); s += v; } const out = new Array(arr.length); for (let i = 0; i < arr.length; i++) { let v = 0; for (let k = -r; k <= r; k++) v += arr[cl(i + k, 0, arr.length - 1)] * ker[k + r]; out[i] = v / s; } return out; };
    // ---------- the pen the viewer sees: the ink stays on the raw clock, the hand does not ----------
    // Several strokes can land in one frame, so a pen pinned to the live end teleports every frame. The visible pen is a smoothed path through the live end, tabulated once, a pure function of t.
    // A stroke long enough to follow (penFollow) is tracked closely; short strokes in a dense area let the hand drift through them. penSoft: 0 puts the pen back on the live end.
    const PEN_HZ = 120;
    const buildPen = (sh) => {
      sh.pen = null; const R = sh.runs, soft = opt.penSoft ?? 0.09; if (!R.length || !soft) return;
      const fine = Math.min(soft, opt.penFine ?? 0.03), t0 = R[0].ta - 0.5, N = Math.ceil((R[R.length - 1].tb + 0.5 - t0) * PEN_HZ) + 1, x = new Array(N), y = new Array(N), lf = new Array(N), fo = new Array(N), [f0, f1] = opt.penFollow ?? [0.12, 0.36];
      for (let i = 0; i < N; i++) { const tip = tipOf(sh, t0 + i / PEN_HZ); x[i] = tip.x; y[i] = tip.y; lf[i] = tip.down || tip.before || tip.after ? 0 : tip.lift ?? 0.35; fo[i] = tip.run ? smooth(((tip.run.tb - tip.run.ta) - f0) / (f1 - f0)) : 0; }
      const hx = gauss(x, soft * PEN_HZ), hy = gauss(y, soft * PEN_HZ), fx = gauss(x, fine * PEN_HZ), fy = gauss(y, fine * PEN_HZ), q = gauss(fo, 0.07 * PEN_HZ);
      sh.pen = { t0, N, x: hx.map((v, i) => lerp(v, fx[i], q[i])), y: hy.map((v, i) => lerp(v, fy[i], q[i])), lift: gauss(lf, 0.07 * PEN_HZ) };
    };
    const penAt = (sh, t) => { const tip = tipOf(sh, t); if (!tip) return null; const P0 = sh.pen; if (!P0) return { ...tip, ix: tip.x, iy: tip.y, x: tip.x, y: tip.y, lift: tip.down ? 0 : tip.lift ?? 0.35 }; const f = cl((t - P0.t0) * PEN_HZ, 0, P0.N - 1.001), i = Math.floor(f), u = f - i; return { ...tip, ix: tip.x, iy: tip.y, x: lerp(P0.x[i], P0.x[i + 1], u), y: lerp(P0.y[i], P0.y[i + 1], u), lift: lerp(P0.lift[i], P0.lift[i + 1], u) }; };
    const buildCamera = () => {
      const sh = S0, N = Math.ceil(F.duration * FPS) + 2, x = new Array(N), y = new Array(N), lz = new Array(N), jobs = sh.jobs;
      // the final wide shot: what the whole picture needs
      let all = null; for (const j of jobs) if (j.bbox) all = all ? { x0: Math.min(all.x0, j.bbox.x0), y0: Math.min(all.y0, j.bbox.y0), x1: Math.max(all.x1, j.bbox.x1), y1: Math.max(all.y1, j.bbox.y1) } : { ...j.bbox };
      const fv = finalView ?? (all ? { on: all, pad: 60 } : { x: 0, y: 0, z: 1 });
      finalPose = fv.on ? poseOf(fv.on, fv.pad ?? 60, 3, 0.05) : { x: fv.x ?? 0, y: fv.y ?? 0, z: fv.z ?? 1 };
      const zW = finalPose.z, washAt = wash ? wash.at : F.duration + 1, soFar = [], overall = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
      for (const j of jobs) { if (j.bbox) { overall.x0 = Math.min(overall.x0, j.bbox.x0); overall.y0 = Math.min(overall.y0, j.bbox.y0); overall.x1 = Math.max(overall.x1, j.bbox.x1); overall.y1 = Math.max(overall.y1, j.bbox.y1); } soFar.push({ ...overall }); }
      const tipsAt = (t) => { const tip = tipOf(sh, t); return tip ? [tip.x, tip.y] : null; };
      const win = (j, t) => { let a0 = 1e9, b0 = 1e9, a1 = -1e9, b1 = -1e9, c = 0; const w = 1.0; for (let u = Math.max(j.a, t - w); u <= Math.min(j.b + 0.01, Math.max(j.a, t) + w); u += 1 / 12) { const q = tipsAt(u); if (!q) continue; c++; a0 = Math.min(a0, q[0]); a1 = Math.max(a1, q[0]); b0 = Math.min(b0, q[1]); b1 = Math.max(b1, q[1]); } return c ? { x0: a0, x1: a1, y0: b0, y1: b1 } : j.bbox; };
      for (let i = 0; i < N; i++) {
        const t = i / FPS; let pose = null;
        if (t >= washAt - 1.1 || !jobs.length) pose = finalPose;
        else {
          let ji = -1; for (let k = 0; k < jobs.length; k++) if (jobs[k].a - (opt.camLead ?? 0.65) <= t) ji = k;
          if (ji < 0) { const j = jobs[0]; pose = j.bbox ? poseOf(j.bbox, j.o.pad ?? 60, j.o.zoom ?? ZMAX, zW) : finalPose; }
          else {
            const j = jobs[ji], inJob = t <= j.b, pullDur = j.o.pull ?? (ji < jobs.length - 1 ? 0 : 1e9);
            if (inJob && j.bbox) {
              const w0 = win(j, t), mix = j.o.follow ?? 0.5, big = j.bbox, bb = { x0: lerp(big.x0, w0.x0, mix), x1: lerp(big.x1, w0.x1, mix), y0: lerp(big.y0, w0.y0, mix), y1: lerp(big.y1, w0.y1, mix) };
              pose = poseOf(bb, j.o.pad ?? 70, j.o.zoom ?? ZMAX, zW);
            } else if (pullDur > 0 && t <= j.b + pullDur + (jobs[ji + 1] ? 0 : 1e9)) {
              const b = soFar[ji]; pose = poseOf(b, 90, ZMAX, zW);
            } else if (j.bbox) { pose = poseOf(j.bbox, j.o.pad ?? 70, j.o.zoom ?? ZMAX, zW); }
            else pose = finalPose;
          }
        }
        x[i] = pose.x; y[i] = pose.y; lz[i] = Math.log(pose.z);
      }
      for (const k of camKeys) { const f = Math.round(k.t * FPS); if (f < N && f >= 0) { const v = k.v.on ? poseOf(k.v.on, k.v.pad ?? 60) : k.v; for (let i = f; i < Math.min(N, f + Math.round((k.v.hold ?? 0.6) * FPS)); i++) { if (v.x !== undefined) x[i] = v.x; if (v.y !== undefined) y[i] = v.y; if (v.z !== undefined) lz[i] = Math.log(v.z); } } }
      // smooth, then keep the pen in frame: wherever the live end would leave the safe area, shift the raw path and smooth again
      const SIG = (opt.camSoft ?? 0.62) * FPS;
      let sx = gauss(x, SIG), sy = gauss(y, SIG), slz = gauss(lz, SIG);
      const safeX = 0.07, safeT = 0.08, safeB = Math.max(0.1, CAPY + 0.03);
      for (let it = 0; it < 14; it++) {
        let moved = 0;
        for (let i = 0; i < N; i++) {
          const t = i / FPS; if (t >= washAt) continue; const tip = penAt(sh, t); if (!tip || !tip.down) continue;
          const z = Math.exp(slz[i]), k = z * U, sxx0 = (tip.ix - sx[i]) * k + W0 / 2, syy0 = (tip.iy - sy[i]) * k + H0 / 2, sxx1 = (tip.x - sx[i]) * k + W0 / 2, syy1 = (tip.y - sy[i]) * k + H0 / 2, loX = Math.min(sxx0, sxx1), hiX = Math.max(sxx0, sxx1), loY = Math.min(syy0, syy1), hiY = Math.max(syy0, syy1);
          const dx = loX < W0 * safeX ? loX - W0 * safeX : hiX > W0 * (1 - safeX) ? hiX - W0 * (1 - safeX) : 0, dy = loY < H0 * safeT ? loY - H0 * safeT : hiY > H0 * (1 - safeB) ? hiY - H0 * (1 - safeB) : 0;
          if (dx || dy) { moved++; const R = Math.round(FPS * 0.5); for (let m = Math.max(0, i - R); m <= Math.min(N - 1, i + R); m++) { x[m] += ((dx / k) * 0.9) / R; y[m] += ((dy / k) * 0.9) / R; } }
        }
        if (!moved) break;
        sx = gauss(x, SIG); sy = gauss(y, SIG);
      }
      // the wash and the final shot hold dead still
      const holdFrom = Math.round((washAt - 0.05) * FPS); for (let i = Math.max(0, holdFrom); i < N; i++) { sx[i] = finalPose.x; sy[i] = finalPose.y; slz[i] = Math.log(finalPose.z); }
      const blendN = Math.round(1.0 * FPS); for (let i = Math.max(0, holdFrom - blendN); i < holdFrom && i < N; i++) { const q = smooth((i - (holdFrom - blendN)) / blendN); sx[i] = lerp(sx[i], finalPose.x, q); sy[i] = lerp(sy[i], finalPose.y, q); slz[i] = lerp(slz[i], Math.log(finalPose.z), q); }
      CAM = { x: sx, y: sy, lz: slz };
    };

    // ---------- the colour stage ----------
    const gradOf = (ctx, it) => { const f = it.fill; if (typeof f === 'string') return f; if (it._grad) return it._grad; const b = bboxOf(it.pts), g = f.v ? ctx.createLinearGradient(0, b.y0, 0, b.y1) : ctx.createLinearGradient(b.x0, 0, b.x1, 0), st = f.v ?? f.h; st.forEach((c, i) => g.addColorStop(i / (st.length - 1), c)); return g; };
    const inkOf = (it) => { if (it._ink) return it._ink; const base = it.ink; let c = base; if (!c) { const f = it.fill ? (typeof it.fill === 'string' ? it.fill : (it.fill.v ?? it.fill.h)[0]) : it.part.items.find((x) => x.fill && !x.skyFill)?.fill; const fc = f ? (typeof f === 'string' ? f : (f.v ?? f.h)[0]) : null; c = fc ? mixHex(fc, C.ink, 0.8) : C.ink; } return (it._ink = c); };
    const itemPaths = (it) => { if (it._fp !== undefined) return; it._fp = null; if (it.fill && it.closed) { const p = new Path2D(); p.moveTo(it.pts[0][0], it.pts[0][1]); for (let i = 1; i < it.pts.length; i++) p.lineTo(it.pts[i][0], it.pts[i][1]); p.closePath(); it._fp = p; } if (it.stroke && it.lw > 0) { const p = new Path2D(); for (const st of handOf(it)) ribbon(p, st, 0, st.pts.length - 1); it._sp = p; } else it._sp = null; };
    const paintItem = (ctx, it) => {
      itemPaths(it);
      if (it.skyFill) return;
      if (it._fp) { const g = typeof it.fill === 'string' ? it.fill : gradOf(ctx, it); ctx.fillStyle = g; ctx.fill(it._fp); }
      if (it._sp) { ctx.fillStyle = inkOf(it); ctx.fill(it._sp); }
    };
    const paintSky = (ctx, sky, vx0, vx1) => { const g = ctx.createLinearGradient(0, sky.y0, 0, sky.y1); sky.stops.forEach((c, i) => g.addColorStop(i / (sky.stops.length - 1), c)); ctx.fillStyle = g; ctx.fillRect(vx0, -sky.R, vx1 - vx0, sky.R * 2); };
    const motionAt = (p, t) => {
      let m = [1, 0, 0, 1, 0, 0], alpha = p.alpha, scale = null; const F0 = lifeFrom();
      for (const mo of p.motions) {
        const from = mo.from ?? F0, tau = t - from;
        if (mo.kind === 'blink') { if (tau < 0) { continue; } const ph = ((t / mo.period + mo.phase) % 1 + 1) % 1, k = 0.5 + 0.5 * Math.cos(ph * TAU); alpha *= lerp(mo.min, 1, smooth(k / mo.duty)); continue; }
        if (mo.kind === 'drift' && tau < 0) continue;
        if (tau <= 0 && mo.kind !== 'drift') continue;
        const ramp = cl(tau / Math.max(1e-3, mo.ramp));
        if (mo.kind === 'spin') { const u = tau < mo.ramp ? (tau * tau) / (2 * mo.ramp) : tau - mo.ramp / 2, a = u * mo.rps * TAU + mo.phase, c = Math.cos(a), s = Math.sin(a); m = mul(m, [c, s, -s, c, mo.x - c * mo.x + s * mo.y, mo.y - s * mo.x - c * mo.y]); }
        else if (mo.kind === 'bob') { const v = Math.sin((tau / mo.period + mo.phase) * TAU) * mo.amp * ramp - Math.sin(mo.phase * TAU) * mo.amp * ramp; m = mul(m, mo.axis === 'x' ? [1, 0, 0, 1, v, 0] : [1, 0, 0, 1, 0, v]); }
        else if (mo.kind === 'sway') { const a = Math.sin((tau / mo.period + mo.phase) * TAU) * mo.deg * DEG * ramp, c = Math.cos(a), s = Math.sin(a); m = mul(m, [c, s, -s, c, mo.x - c * mo.x + s * mo.y, mo.y - s * mo.x - c * mo.y]); }
        else if (mo.kind === 'drift') {
          const u = tau < mo.ramp ? (tau * tau) / (2 * mo.ramp) : tau - mo.ramp / 2;
          let dist;
          if (mo.step) { const ev = mo.step.every, n = Math.floor(tau / ev), f = (tau - n * ev) / ev, st = n + smooth(cl(f / (mo.step.dur / ev))); dist = (st * ev * mo.speed); } else dist = u * mo.speed;
          let s = mo.phase * mo.L + dist, q = 0;
          if (mo.loop) { s = ((s % mo.L) + mo.L) % mo.L; q = s / mo.L; } else { s = Math.min(mo.L, s); q = s / mo.L; }
          const here = at(mo.pts, s), base = mo.restAt ?? (mo.restAt = at(mo.pts, mo.phase * mo.L));
          // the part was built at (ox, oy) on the path's rest point
          m = mul(m, [1, 0, 0, 1, here[0] - mo.ox, here[1] - mo.oy]);
          if (mo.fade) { const fi = Math.min(q, 1 - q) / mo.fade; alpha *= smooth(fi); }
          if (mo.grow) { const g = lerp(mo.grow[0], mo.grow[1], q); scale = [g, mo.ox, mo.oy]; }
          void base;
        }
      }
      if (scale) { const [g, ox, oy] = scale; m = mul(m, [g, 0, 0, g, ox - g * ox, oy - g * oy]); }
      return { m, alpha };
    };
    const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
    // the painter's list, split into baked strata around the moving parts. A moving part slides up past static items it can't touch (its swept box), so few strata are needed
    let strata = null, skyPart = null, bakeRect = null, bakeK = 1;
    const sweptBox = (p) => {
      if (p._sw) return p._sw; const pts = p.items.flatMap((i) => i.pts); if (p.glow) pts.push([p.glow.x - p.glow.r, p.glow.y - p.glow.r], [p.glow.x + p.glow.r, p.glow.y + p.glow.r]); const b = bboxOf(pts); let { x0, y0, x1, y1 } = b; const G0 = 6;
      for (const mo of p.motions) {
        if (mo.kind === 'spin' || mo.kind === 'sway') { const r = Math.max(Math.hypot(b.x0 - mo.x, b.y0 - mo.y), Math.hypot(b.x1 - mo.x, b.y0 - mo.y), Math.hypot(b.x0 - mo.x, b.y1 - mo.y), Math.hypot(b.x1 - mo.x, b.y1 - mo.y)); x0 = Math.min(x0, mo.x - r); x1 = Math.max(x1, mo.x + r); y0 = Math.min(y0, mo.y - r); y1 = Math.max(y1, mo.y + r); }
        else if (mo.kind === 'bob') { if (mo.axis === 'x') { x0 -= mo.amp * 2; x1 += mo.amp * 2; } else { y0 -= mo.amp * 2; y1 += mo.amp * 2; } }
        else if (mo.kind === 'drift') { const q = bboxOf(mo.pts), gg = mo.grow ? mo.grow[1] : 1, hw = ((b.x1 - b.x0) / 2) * gg, hh = ((b.y1 - b.y0) / 2) * gg, ax = mo.ox - b.x0, ay = mo.oy - b.y0; x0 = Math.min(x0, q.x0 - ax * gg - hw); x1 = Math.max(x1, q.x1 + hw * 2); y0 = Math.min(y0, q.y0 - ay * gg - hh); y1 = Math.max(y1, q.y1 + hh * 2); }
      }
      return (p._sw = { x0: x0 - G0, y0: y0 - G0, x1: x1 + G0, y1: y1 + G0 });
    };
    const buildStrata = () => {
      const sh = S0, seq = [];
      for (const p of sh.parts) { if (p.sky) skyPart = p; if (p.lineOnly) continue; if (p.motions.length) { const o = Math.min(...(p.items.length ? p.items.map((i) => i.order) : [p.z * 1e7 + p.id])); seq.push({ moving: p, order: o, order2: Math.max(o, ...(p.items.map((i) => i.order))) }); } else for (const it of p.items) if (!it.skyFill) seq.push({ it, order: it.order }); }
      seq.sort((a, b) => a.order - b.order);
      // move each moving part as late as it may go; static boxes computed once
      const out = []; const movers = [];
      for (const e of seq) { if (e.it) { e.b = (e.it._bb ??= bboxOf(e.it.pts)); out.push(e); } else { movers.push(e); out.push(e); } }
      for (const e of movers.reverse()) {
        const i0 = out.indexOf(e), sw = sweptBox(e.moving); let i = i0;
        while (i + 1 < out.length) { const nx = out[i + 1]; if (nx.moving) { const b2 = sweptBox(nx.moving); if (!(b2.x1 < sw.x0 || b2.x0 > sw.x1 || b2.y1 < sw.y0 || b2.y0 > sw.y1)) break; } else if (!(nx.b.x1 < sw.x0 || nx.b.x0 > sw.x1 || nx.b.y1 < sw.y0 || nx.b.y0 > sw.y1)) break; i++; }
        if (i !== i0) { out.splice(i0, 1); out.splice(i, 0, e); }
      }
      strata = []; let cur = null; for (const e of out) { if (e.moving) { if (!cur || cur.kind !== 'movers') { cur = { kind: 'movers', list: [] }; strata.push(cur); } cur.list.push(e.moving); } else { if (!cur || cur.kind !== 'static') { cur = { kind: 'static', list: [] }; strata.push(cur); } cur.list.push(e.it); } }
      S0.strataCount = strata.filter((s) => s.kind === 'static').length;
    };
    const bakeStatic = (st) => {
      if (st.canvas !== undefined) return st.canvas;
      const c = document.createElement('canvas'); c.width = Math.ceil((bakeRect.x1 - bakeRect.x0) * bakeK); c.height = Math.ceil((bakeRect.y1 - bakeRect.y0) * bakeK);
      const x = c.getContext('2d'); x.setTransform(bakeK, 0, 0, bakeK, -bakeRect.x0 * bakeK, -bakeRect.y0 * bakeK);
      for (const it of st.list) { if (it.alpha !== undefined) x.globalAlpha = it.alpha; paintItem(x, it); x.globalAlpha = 1; }
      for (const it of st.list) { delete it._grad; }
      st.canvas = c; return c;
    };
    const paintColor = (ctx, t, cam) => {
      if (!strata) buildStrata();
      if (!bakeRect) { const f = finalPose, k = f.z * U, m = 0.06, vw = W0 / k, vh = H0 / k; bakeRect = { x0: f.x - vw / 2 - vw * m, x1: f.x + vw / 2 + vw * m, y0: f.y - vh / 2 - vh * m, y1: f.y + vh / 2 + vh * m }; bakeK = k; }
      const k2 = cam.z * U, tx = W0 / 2 - cam.x * k2, ty = H0 / 2 - cam.y * k2, vw = W0 / k2, vx0 = cam.x - vw / 2 - 40, vx1 = cam.x + vw / 2 + 40;
      ctx.setTransform(k2, 0, 0, k2, tx, ty);
      if (skyPart) paintSky(ctx, skyPart.sky, vx0, vx1); else { ctx.fillStyle = C.sky[0]; ctx.fillRect(vx0, -8000, vx1 - vx0, 16000); }
      for (const st of strata) {
        if (st.kind === 'static') { const c = bakeStatic(st); ctx.drawImage(c, bakeRect.x0, bakeRect.y0, bakeRect.x1 - bakeRect.x0, bakeRect.y1 - bakeRect.y0); }
        else for (const p of st.list) {
          const { m, alpha } = motionAt(p, t);
          ctx.save(); ctx.globalAlpha = alpha; ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
          if (p.glow) { const g = ctx.createRadialGradient(p.glow.x, p.glow.y, 0, p.glow.x, p.glow.y, p.glow.r), [r, gg, b] = hex(p.glow.c); g.addColorStop(0, `rgba(${r},${gg},${b},${p.glow.a})`); g.addColorStop(1, `rgba(${r},${gg},${b},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.glow.x, p.glow.y, p.glow.r, 0, TAU); ctx.fill(); }
          for (const it of p.items) { if (it.alpha !== undefined) ctx.globalAlpha = alpha * it.alpha; paintItem(ctx, it); }
          ctx.restore();
        }
      }
    };
    // the wash: an arrival-time field over the final view: seeded distance from the origin points, warped with noise, equalized so the covered area grows steadily
    let mask = null;
    const buildMask = () => {
      const f = finalPose, k = f.z * U, vw = W0 / k, vh = H0 / k, GW = Math.round(Math.max(W0, H0) / 3.2), GH = Math.round((GW * H0) / W0), sd = wash.seed, rect = { x0: f.x - vw * 0.55, y0: f.y - vh * 0.55, w: vw * 1.1, h: vh * 1.1 };
      const seeds = wash.from === 'left' ? [[0, 0.5]] : wash.from === 'right' ? [[1, 0.5]] : wash.from === 'corners' ? [[0, 0], [1, 1], [0, 1]] : Array.isArray(wash.from) ? wash.from.map((q) => [(q[0] - rect.x0) / rect.w, (q[1] - rect.y0) / rect.h]) : [[0, 0], [1, 1]];
      const A = new Float32Array(GW * GH), asp = rect.w / rect.h, wv = wash.o.warp ?? 0.16;
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const u = i / (GW - 1), v = j / (GH - 1), wx = noise2(sd, u * 4, v * 4) * wv + noise2(sd + 5, u * 11, v * 11) * wv * 0.34, wy = noise2(sd + 9, u * 4, v * 4) * wv + noise2(sd + 13, u * 11, v * 11) * wv * 0.34;
        let d = 1e9; seeds.forEach(([sx, sy], si) => { const dd = Math.hypot((u + wx - sx) * asp, v + wy - sy) * (1 + si * 0.14); if (dd < d) d = dd; });
        A[j * GW + i] = d + noise2(sd + 21, u * 26, v * 26) * 0.012;
      }
      const sorted = Float32Array.from(A).sort(), rank = (x) => { let lo = 0, hi = sorted.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < x) lo = m + 1; else hi = m; } return lo / sorted.length; };
      for (let i = 0; i < A.length; i++) A[i] = lerp(rank(A[i]), A[i] / sorted[sorted.length - 1], 0.45);
      const c = document.createElement('canvas'); c.width = GW; c.height = GH;
      mask = { A, GW, GH, rect, c, x: c.getContext('2d'), im: c.getContext('2d').createImageData(GW, GH) };
    };
    const maskAt = (q) => {
      const { A, im } = mask, soft = wash.soft, bands = wash.bands, front = q * (1 + soft), d = im.data;
      for (let i = 0; i < A.length; i++) {
        const v = (front - A[i]) / soft; let a;
        if (v <= 0) a = 0; else if (v >= 1) a = 1; else { const n = bands, s = v * n, fl = Math.floor(s), fr = s - fl, step = (fl + smooth(cl((fr - 0.8) / 0.2))) / n; a = lerp(step, step * step, 0.3) * 0.94 + 0.06 * smooth(s); }
        d[i * 4 + 3] = a * 255;
      }
      mask.x.putImageData(im, 0, 0);
      return mask.c;
    };

    // ---------- the pen ----------
    const drawPen = (ctx, sx, sy, t, lift, tipW) => {
      if (opt.pen === false) return;
      const L = F.px(opt.penL ?? 430), w = F.px(13), tipL = F.px(52), a = ((opt.penAngle ?? 52) + noise1(seed0 + 31, t * 0.5) * 3.2 + (lift || 0) * 2.5) * DEG, c = Math.cos(a), s = Math.sin(a), ox = F.px(9 + lift * 22), oy = F.px(11 + lift * 26);
      const shape = (x) => { x.beginPath(); x.moveTo(0, 0); x.lineTo(tipL, -w / 2); x.lineTo(L - w / 2, -w / 2); x.arc(L - w / 2, 0, w / 2, -Math.PI / 2, Math.PI / 2); x.lineTo(tipL, w / 2); x.closePath(); };
      ctx.save(); ctx.setTransform(1, 0, 0, 1, sx, sy);
      // soft shadow on the paper, longer as the pen lifts
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(a + 0.02); ctx.shadowColor = `rgba(30,24,28,${0.34 - lift * 0.08})`; ctx.shadowBlur = F.px(12 + lift * 14); ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.fillStyle = 'rgba(40,34,38,0.26)'; shape(ctx); ctx.fill(); ctx.restore();
      ctx.rotate(a);
      const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2); g.addColorStop(0, '#2c2b30'); g.addColorStop(0.32, '#121115'); g.addColorStop(1, '#050507');
      ctx.fillStyle = g; shape(ctx); ctx.fill();
      // the sharpened cone (light wood) and the lead
      const cone = ctx.createLinearGradient(0, -w / 2, 0, w / 2); cone.addColorStop(0, '#e6dfd2'); cone.addColorStop(0.55, '#c6bcad'); cone.addColorStop(1, '#8f867a');
      ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(F.px(9), -F.px(1.6)); ctx.lineTo(tipL, -w / 2); ctx.lineTo(tipL, w / 2); ctx.lineTo(F.px(9), F.px(1.6)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#16151a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(F.px(10), -F.px(1.9)); ctx.lineTo(F.px(10), F.px(1.9)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = F.px(1.4); ctx.beginPath(); ctx.moveTo(tipL + F.px(6), -w * 0.24); ctx.lineTo(L - w, -w * 0.24); ctx.stroke();
      ctx.restore();
    };

    // ---------- paper ----------
    let paperPat = null;
    const paperTile = () => { const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), R = rngOf(seed0 ^ 11); x.fillStyle = C.paper; x.fillRect(0, 0, N, N); for (let i = 0; i < 1300; i++) { const px = R() * N, py = R() * N, s = R(); x.fillStyle = s < 0.5 ? `rgba(120,108,90,${0.02 + R() * 0.05})` : `rgba(255,255,255,${0.2 + R() * 0.4})`; x.beginPath(); x.arc(px, py, 0.5 + R() * 1.0, 0, TAU); x.fill(); } for (let i = 0; i < 110; i++) { const px = R() * N, py = R() * N, a = R() * TAU, l = 4 + R() * 10; x.strokeStyle = `rgba(120,108,90,${0.03 + R() * 0.05})`; x.lineWidth = 0.6; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); } return c; };

    // ---------- the bare paper under the captions ----------
    // The picture is full of lines, so the frame's foot stays unpainted paper: lines and colour thin out into it along a seeded wobbling edge, like the rest of the wash, with no frame round the picture
    const capSize = () => F.px((opt.captions && opt.captions.size) ?? (PT ? 44 : 42)), capTop = () => (opt.captions && opt.captions.top) ?? (PT ? H0 * 0.78 : H0 * 0.885);
    const veilOn = () => !FLAT && !!F.T && !!F.voiced && opt.captions !== false && !(opt.captions && opt.captions.backing === false);
    const veilSolid = () => capTop() - capSize() * 0.08, veilFeather = () => capSize() * 1.5;
    const veilAlpha = (y, edge = 0) => { const q = cl((y - (veilSolid() - veilFeather() + edge)) / veilFeather()), bands = 5, st = Math.floor(q * bands) / bands; return q >= 1 ? 1 : lerp(smooth(q), smooth(st + 0.5 / bands), 0.45); };
    let veilCanvas = null;
    const buildVeil = () => {
      const c = document.createElement('canvas'), y0 = Math.max(0, Math.floor(veilSolid() - veilFeather() - capSize())), h = H0 - y0; c.width = W0; c.height = h; const x = c.getContext('2d'), im = x.createImageData(W0, h), amp = capSize() * 0.42;
      for (let i = 0; i < W0; i++) { const e = noise1(seed0 + 77, i / (W0 * 0.13)) * amp + noise1(seed0 + 79, i / (W0 * 0.034)) * amp * 0.34; for (let j = 0; j < h; j++) im.data[(j * W0 + i) * 4 + 3] = Math.round(veilAlpha(y0 + j, e) * 255); }
      x.putImageData(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = x.createPattern(paperTile(), 'repeat'); x.fillRect(0, 0, W0, h); return { c, y0 };
    };
    const paintVeil = (ctx) => { if (!veilOn()) return; veilCanvas ??= buildVeil(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(veilCanvas.c, 0, veilCanvas.y0); };

    // ---------- the line stage ----------
    const paintLines = (ctx, sh, t, cam, ink = C.line) => {
      const k2 = cam.z * U, tx = W0 / 2 - cam.x * k2, ty = H0 / 2 - cam.y * k2, vx0 = cam.x - W0 / 2 / k2, vx1 = cam.x + W0 / 2 / k2, vy0 = cam.y - H0 / 2 / k2, vy1 = cam.y + H0 / 2 / k2;
      ctx.setTransform(k2, 0, 0, k2, tx, ty); ctx.fillStyle = ink;
      const n = lastDone(sh, t), R = sh.runs;
      const fadeOf = (j) => { const h = j.o.hide; return h === undefined ? 1 : 1 - cl((t - (h - 0.28)) / 0.28); };
      for (const c of sh.chunks) { if (c.a >= n) break; const al = fadeOf(c.job); if (al <= 0) continue; ctx.globalAlpha = al; if (c.b < n) { if (c.box.x1 < vx0 || c.box.x0 > vx1 || c.box.y1 < vy0 || c.box.y0 > vy1) continue; ctx.fill(c.path); } else { for (let i = c.a; i < n; i++) { const r = R[i]; (r._p ??= (() => { const p = new Path2D(); sh.addPerm(p, r); return p; })()); ctx.fill(r._p); } } }
      // spans a later nearer part will hide: alive until the pen passes them
      for (const r of sh.doomed) {
        if (r.tb > t) continue;
        if (fadeOf(r.job) <= 0) continue; ctx.globalAlpha = fadeOf(r.job);
        const p = new Path2D(); let a = -1;
        const alive = (k) => !r.off.has(k) || t < r.off.get(k), seg = (k) => k < r.i1 && (r.off.has(k) || r.off.has(k + 1)) && alive(k) && alive(k + 1);
        for (let k = r.i0; k <= r.i1; k++) { const on = seg(k); if (on && a < 0) a = k; if (!on && a >= 0) { ribbon(p, r.st, a, k); a = -1; } }
        ctx.fill(p);
      }
      ctx.globalAlpha = 1;
      if (n < R.length && t >= R[n].ta) { const tip = tipOf(sh, t), r = R[n], p = new Path2D(); ribbon(p, r.st, r.i0, Math.max(r.i0, tip.k), [tip.x, tip.y, tip.w]); ctx.fill(p); }
    };

    // ---------- render ----------
    const SIZE_CANVAS = (parent, z) => { const c = el('canvas', `left:0;top:0;width:${W0}px;height:${H0}px;z-index:${z};pointer-events:none`, parent); c.width = W0; c.height = H0; c.dataset.motion = 'skip'; return c; };
    const main = FLAT ? null : SIZE_CANVAS(F.stage, 1), mx = main && main.getContext('2d');
    if (!FLAT) F.blurBase(1);   // several strokes a frame and a slow camera: motion blur would only stack ghost pens
    let tmp = null;
    W.camAt = camAt; W.tipAt = (t) => tipOf(S0, t); W.toScreen = (x, y, t) => { const c = camAt(t), k = c.z * U; return [(x - c.x) * k + W0 / 2, (y - c.y) * k + H0 / 2]; };
    if (!FLAT) {
      F.add((t) => {
        const cam = camAt(t), k2 = cam.z * U, tx = W0 / 2 - cam.x * k2, ty = H0 / 2 - cam.y * k2;
        const wa = wash ? wash.at : 1e9, wb = wash ? wash.at + wash.dur : 1e9, full = t >= wb;
        mx.setTransform(1, 0, 0, 1, 0, 0);
        if (full) { paintColor(mx, t, cam); }
        else {
          paperPat ??= mx.createPattern(paperTile(), 'repeat');
          mx.setTransform(k2, 0, 0, k2, tx, ty); mx.fillStyle = paperPat; mx.fillRect(cam.x - W0 / 2 / k2 - 2, cam.y - H0 / 2 / k2 - 2, W0 / k2 + 4, H0 / k2 + 4);
          paintLines(mx, S0, t, cam);
          if (t >= wa) {
            if (!mask) buildMask();
            tmp ??= (() => { const c = document.createElement('canvas'); c.width = W0; c.height = H0; return c; })();
            const tc = tmp.getContext('2d'); tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, W0, H0);
            paintColor(tc, t, cam);
            const q = cl((t - wa) / wash.dur), m = maskAt(lerp(q, q * q * (3 - 2 * q), 0.4));
            tc.setTransform(k2, 0, 0, k2, tx, ty); tc.globalCompositeOperation = 'destination-in'; tc.imageSmoothingEnabled = true; tc.imageSmoothingQuality = 'high'; tc.drawImage(m, mask.rect.x0, mask.rect.y0, mask.rect.w, mask.rect.h); tc.globalCompositeOperation = 'source-over';
            mx.setTransform(1, 0, 0, 1, 0, 0); mx.drawImage(tmp, 0, 0);
          }
        }
        paintVeil(mx);
        // the pen: a calm hand through the live end while drawing (buildPen), out of the frame once colour comes
        const tip = penAt(S0, t);
        if (tip && opt.pen !== false) {
          const k = k2, sx = (tip.x - cam.x) * k + W0 / 2, sy = (tip.y - cam.y) * k + H0 / 2; let px = sx, py = sy, lift = tip.lift, vis = true;
          if (tip.before) { const q = smooth(1 - tip.q / 1.1); if (tip.q > 1.1) vis = false; px = lerp(W0 * 1.2, sx, q); py = lerp(H0 * 1.25, sy, q); lift = 1 - q * 0.65; }
          if (tip.after) {
            const leave = wash ? wash.at - 0.9 : F.duration - 1.2, q = smooth((t - leave) / 1.0);
            if (t >= leave) { px = lerp(sx, W0 * 1.25, q); py = lerp(sy, H0 * 1.3, q); lift = 0.35 + q * 0.65; if (q >= 1) vis = false; }
            else { px += F.px(Math.sin(t * 1.3) * 5); py += F.px(Math.cos(t * 1.1) * 4); }
          }
          if (vis) drawPen(mx, px, py, t, lift, tip.w);
        }
      });
    } else {
      // kit: every scene layer is a sheet of its own; the pen appears on it while it draws, the frame holds still
      const lc = new Map();
      const layerCtx = (layer) => { if (!lc.has(layer)) { const c = SIZE_CANVAS(layer, 1); lc.set(layer, c.getContext('2d')); } return lc.get(layer); };
      W.layerCanvas = layerCtx;
      F.late((t) => {
        for (const sh of sheets) {
          if (!sh.layer) continue;
          const ctx = layerCtx(sh.layer); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W0, H0);
          if (sh.layer.style.display === 'none') continue;
          if (!sh.chunks) continue;
          const cam = { x: W0 / 2 / U, y: H0 / 2 / U, z: 1 };
          if (sh.fills && t >= sh.fills.at) { const q = cl((t - sh.fills.at) / sh.fills.dur); ctx.setTransform(U, 0, 0, U, 0, 0); ctx.globalAlpha = 1; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W0 / U, H0 / U); ctx.clip(); const front = (W0 / U) * (q * 1.4); ctx.beginPath(); for (let y = -40; y <= H0 / U + 40; y += 40) { const xx = front - (y / (H0 / U)) * (W0 / U) * 0.25 + Math.sin(y * 0.02 + 1) * 26; if (y === -40) ctx.moveTo(-40, y); ctx.lineTo(xx, y); } ctx.lineTo(-40, H0 / U + 40); ctx.closePath(); ctx.clip(); for (const it of (sh.fills.parts ?? sh.parts).flatMap((p) => p.items).sort((a, b) => a.order - b.order)) { if (it.alpha !== undefined) ctx.globalAlpha = it.alpha; paintItem(ctx, it); ctx.globalAlpha = 1; } ctx.restore(); }
          paintLines(ctx, sh, t, cam);
          const tip = penAt(sh, t);
          if (tip && sh.jobs.some((j) => j.runs.length && t >= j.runs[0].ta - 0.18 && t <= j.end + 0.18)) { const sx = tip.x * U, sy = tip.y * U; drawPen(ctx, sx, sy, t, tip.lift, tip.w); }
        }
      });
      W.colorIn = (layer, at, dur = 0.9, parts) => { const sh = sheets.find((x) => x.layer === layer) ?? S; sh.fills = { at, dur, parts: parts && W.partsOf(parts) }; F.sfx(at, 'wash', 0.45, { dur }); };
    }

    // captions: dark plum with a thick paper edge: readable on the paper and on the colour alike
    if (!FLAT && F.T && F.voiced && !F.caps && opt.captions !== false) {
      const co = opt.captions || {}, segs = window.EV.captionSegments(F.T, co.max ?? (PT ? 13 : 22)), size = capSize();
      const box = el('div', `left:0;right:0;top:${capTop()}px;text-align:center;z-index:880;pointer-events:none;display:none`, F.stage);
      const sp = el('span', `position:relative;display:inline-block;max-width:${W0 * 0.86}px;color:${C.ink};font:700 ${Math.round(size * 10) / 10}px/1.35 ${F.theme.fonts.sans};letter-spacing:.03em;paint-order:stroke fill;-webkit-text-stroke:${Math.round(F.px(9))}px ${C.paper}`, box);
      F.add((t) => { const c = segs.find((x) => t >= x.start && t < x.end); set(box, { display: c ? '' : 'none' }); if (c && sp.textContent !== c.text) sp.textContent = c.text; });
      for (const c of segs) { F.appear(c.start); F.appear(c.end); }
      F.caps = segs;
    }

    // ---------- prep: glyph data, schedule, camera, the life and the sounds ----------
    F.prep(async () => {
      await Promise.all([...pendingChars].map(loadStrokes));
      for (const T of texts) layText(T);
      for (const sh of sheets) { finalizeSheet(sh); buildPen(sh); }
      if (!FLAT) {
        buildCamera();
        // the pen is the film's action until the wash, the life after it
        const R = S0.runs;
        for (const j of S0.jobs) if (j.runs.length) F.live(j.a, Math.max(j.b, j.end));
        if (wash) { F.live(wash.at, wash.at + wash.dur); F.transition(wash.at, wash.at + wash.dur); const lifeStart = lifeFrom(); if (S0.parts.some((p) => p.motions.length)) F.live(lifeStart, F.duration); F.stillMax(1.5); }
        // a quiet pen under the voice (light effects drop out while speaking; they stay in the pauses)
        let lastSfx = -9; for (const r of R) { if (r.ta - lastSfx >= 0.42) { F.sfx(r.ta, r.it.lettered ? 'scratch' : 'scratch', 0.16 + (r.L > 120 ? 0.06 : 0), { dur: cl(r.tb - r.ta, 0.1, 0.5) }); lastSfx = r.ta; } }
        for (const p of S0.parts) { for (const mo of p.motions) if (mo.kind === 'spin' && mo.from !== undefined && mo.announce) F.sfx(mo.from, 'whirr', 0.5, { dur: 1 }); }
      } else {
        for (const sh of sheets) { let last = -9; for (const r of sh.runs || []) if (r.ta - last >= 0.5) { F.sfx(r.ta, 'scratch', 0.16, { dur: 0.3 }); last = r.ta; } }
      }
    });

    // ---------- the checks ----------
    F.addLint(() => {
      const out = [...lintNotes.map((x) => ({ level: 'warn', t: x.t, src: '', what: x.what, msg: x.msg }))], add = (t, what, msg, level = 'warn') => out.push({ level, t, src: '', what, msg });
      if (FLAT) return out;
      const sh = S0, R = sh.runs, D = F.duration;
      if (!R.length) { add(0, M('没有线稿', 'no line stage'), M('笔什么也没画：用 W.draw(组, { line }) 把零件交给笔', 'The pen drew nothing: give parts to the pen with W.draw(group, { line })')); return out; }
      // the pen leaves the frame while it is drawing
      { let outS = [], tot = 0; for (let t = R[0].ta; t <= R[R.length - 1].tb; t += 1 / 15) { const tip = penAt(sh, t); if (!tip || !tip.down) continue; const c = camAt(t), k = c.z * U, xs = [(tip.x - c.x) * k + W0 / 2, (tip.ix - c.x) * k + W0 / 2], ys = [(tip.y - c.y) * k + H0 / 2, (tip.iy - c.y) * k + H0 / 2]; if (Math.min(...xs) < 0 || Math.max(...xs) > W0 || Math.min(...ys) < 0 || Math.max(...ys) > H0) { tot += 1 / 15; if (!outS.length || t - outS[outS.length - 1] > 1) outS.push(t); } } if (outS.length) add(outS[0], M('笔出了画面', 'pen out of frame'), M(`笔或正在画的线有 ${tot.toFixed(1)} 秒在画面外（从 ${outS.slice(0, 4).map((x) => x.toFixed(1) + ' 秒').join('、')} 起）：观众看不到正在画的地方。把这一段拆成两个 W.draw，或放慢镜头（zoom 调小）`, `The pen or the line being drawn is outside the frame for ${tot.toFixed(1)} s (from ${outS.slice(0, 4).map((x) => x.toFixed(1) + ' s').join(', ')}): split this W.draw in two or lower its zoom`)); }
      // the visible pen shaking, and the visible pen too far from the line it is meant to be drawing
      { const m = W.penStats(); if (m) {
        if (m.reversals > (opt.maxPenFlips ?? 6) || m.worst.rate > (opt.maxPenFlips ?? 6) * 1.6) add(m.worst.t, M('笔在抖', 'pen shaking'), M(`看到的笔每秒掉头 ${m.reversals.toFixed(1)} 次，最抖的 3 秒是 ${m.worst.t.toFixed(1)} 秒起每秒 ${m.worst.rate.toFixed(1)} 次（中位每帧跳 ${m.jump.toFixed(1)}% 画面宽）：抖动会抢走观众看字幕和听旁白的注意力。别用 penSoft: 0；调大 penSoft，或让 W.draw 按就近顺序画`, `The visible pen reverses ${m.reversals.toFixed(1)} times a second, ${m.worst.rate.toFixed(1)} in the worst 3 s from ${m.worst.t.toFixed(1)} s (median jump ${m.jump.toFixed(1)}% of the width per frame): the shaking pulls attention from the captions and the voice. Don't use penSoft: 0; raise penSoft, or let W.draw tour by nearness`));
        if (m.gapP90 > (opt.maxPenGap ?? 15)) add(m.gapT, M('笔离线太远', 'pen far from the line'), M(`看到的笔和正在画的线距离的 90 分位是 ${m.gapP90.toFixed(1)}% 画面宽（最远在 ${m.gapT.toFixed(1)} 秒）：不像是这支笔画的。调小 penSoft，或让这段的 W.draw 窗口更长、笔画更近`, `The 90th percentile distance between the visible pen and the line being drawn is ${m.gapP90.toFixed(1)}% of the width (furthest at ${m.gapT.toFixed(1)} s): it stops reading as this pen's line. Lower penSoft, widen this W.draw's window or draw nearer strokes`));
      } }
      // a caption on drawn lines or on the colour: what actually shows through the paper under it
      if (F.caps) {
        const top = capTop(), size = capSize(), hits = [], washAt = wash ? wash.at + wash.dur * 0.6 : D + 1;
        const widthOf = (str) => { let w = 0; for (const ch of str) w += /[\u2e80-\u9fff\uff00-\uffef]/.test(ch) ? size : size * 0.56; return w; };
        for (const c of F.caps) {
          const cw = widthOf(c.text), lines = Math.max(1, Math.ceil(cw / (W0 * 0.86))), w0 = Math.min(cw, W0 * 0.86), x0 = W0 / 2 - w0 / 2, x1 = W0 / 2 + w0 / 2, y0 = top, y1 = top + lines * size * 1.35, see = (y) => (veilOn() ? 1 - veilAlpha(y) : 1);
          let worst = 0, tw = c.start;
          for (const t of [c.start + 0.05, (c.start + c.end) / 2, c.end - 0.05]) {
            let ink = 0;
            if (t >= washAt) { let v = 0, n = 0; for (let y = y0; y <= y1; y += 4) { v += see(y); n++; } ink = (v / n) * w0; }
            else { const cam = camAt(t), k = cam.z * U, wx0 = cam.x + (x0 - W0 / 2) / k, wx1 = cam.x + (x1 - W0 / 2) / k, wy0 = cam.y + (y0 - H0 / 2) / k, wy1 = cam.y + (y1 - H0 / 2) / k;
              for (const r of R) { if (r.ta >= t || r._b.x1 < wx0 || r._b.x0 > wx1 || r._b.y1 < wy0 || r._b.y0 > wy1) continue; for (let i = r.i0; i < r.i1; i++) { const a = r.st.pts[i], b = r.st.pts[i + 1]; if (a[0] < wx0 || a[0] > wx1 || a[1] < wy0 || a[1] > wy1 || (r.off && (r.off.get(i) ?? 1e9) <= t)) continue; ink += Math.hypot(b[0] - a[0], b[1] - a[1]) * k * see((a[1] - cam.y) * k + H0 / 2); } } }
            if (ink > worst) { worst = ink; tw = t; }
          }
          if (worst > w0 * (opt.maxCaptionInk ?? 0.5)) hits.push(tw);
        }
        if (hits.length) add(hits[0], M('字幕压线', 'caption over the drawing'), M(`${hits.length} 句字幕压在线稿或颜色上（${hits.slice(0, 6).map((x) => x.toFixed(1) + ' 秒').join('、')}）：字幕下面要留纸。别关 captions.backing，或把 captions.top 放回画面最下面`, `${hits.length} captions sit on the drawing or the colour (${hits.slice(0, 6).map((x) => x.toFixed(1) + ' s').join(', ')}): keep bare paper under them. Don't turn captions.backing off, or put captions.top back at the foot of the frame`));
      }
      // lines showing through: a closed shape without a fill (it can't hide what is behind it), or colour-stage-only gaps
      { const closedNoFill = []; for (const p of sh.parts) { if (p.colorOnly) continue; for (const it of p.items) if (it.closed && !it.fill && !it.seeThrough && it.stroke && it.pts.length > 3) { const b = bboxOf(it.pts); if ((b.x1 - b.x0) * (b.y1 - b.y0) > 400) closedNoFill.push(p.name); } } if (closedNoFill.length) add(0, M('线会透过去', 'lines show through'), M(`${closedNoFill.length} 个封闭形状没有 fill（${[...new Set(closedNoFill)].slice(0, 4).join('、')}）：它们挡不住后面的线，上色后也是空的。给 fill；真要透明写 seeThrough: true`, `${closedNoFill.length} closed shapes have no fill (${[...new Set(closedNoFill)].slice(0, 4).join(', ')}): they can't hide what's behind them and stay empty in colour. Give a fill, or seeThrough: true if meant`)); }
      // lines actually visible inside a nearer drawn shape at a moment (verification of the occlusion itself)
      { let bad = 0, t0 = 0, badN = ''; const finalT = R[R.length - 1].tb + 0.01, occ = sh.jobs.flatMap((j) => j.items).filter((it) => it._occl); for (const it of occ) { const b = bboxOf(it.pts); it._bb2 = b; } for (const r of R) { if (r.it.lettered) continue; for (let k = r.i0; k <= r.i1; k += 3) { if (r.off && r.off.has(k)) continue; const q = r.st.pts[k]; for (const it of occ) { const b = it._bb2; if (it.order <= r.it.order || q[0] < b.x0 + 1 || q[0] > b.x1 - 1 || q[1] < b.y0 + 1 || q[1] > b.y1 - 1) continue; if (inPoly(it.pts, q[0], q[1])) { let dEdge = 1e9; for (let e = 0, f = it.pts.length - 1; e < it.pts.length; f = e++) { const A = it.pts[f], B = it.pts[e], vx = B[0] - A[0], vy = B[1] - A[1], u = cl(((q[0] - A[0]) * vx + (q[1] - A[1]) * vy) / Math.max(1e-6, vx * vx + vy * vy)), dd = Math.hypot(A[0] + u * vx - q[0], A[1] + u * vy - q[1]); if (dd < dEdge) dEdge = dd; } if (dEdge > 4) { bad++; if (!t0) { t0 = r.ta; badN = `${r.it.part.name} / ${it.part.name}`; } } break; } } } } void finalT; if (bad > 40) add(t0, M('线透过了零件', 'lines through a part'), M(`终稿里有约 ${bad} 个线段点落在前面的零件里面（第一处 ${t0.toFixed(1)} 秒，${badN}）：遮挡没有生效，检查零件是不是漏了 W.draw`, `About ${bad} line samples end up inside a nearer part in the finished picture (first at ${t0.toFixed(1)} s): occlusion didn't apply; check for parts missing from a W.draw`)); }
      // parts never given to the pen
      { const seen = new Set(sh.jobs.flatMap((j) => j.items.map((i) => i.part))), miss = sh.parts.filter((p) => !p.colorOnly && p.items.length && !seen.has(p)); if (miss.length) add(0, M('有零件没画', 'parts never drawn'), M(`${miss.length} 个零件（${miss.slice(0, 5).map((p) => p.name).join('、')}）没交给笔：它们会在上色时凭空出现。放进 W.draw，或写 colorOnly: true`, `${miss.length} parts (${miss.slice(0, 5).map((p) => p.name).join(', ')}) were never given to the pen: they'd appear from nowhere in the wash. Add them to a W.draw, or colorOnly: true`)); }
      // the pen's pace
      for (const j of sh.jobs) { if (!j.runs.length) { add(j.a, M('笔没事做', 'empty draw'), M(`${j.a.toFixed(1)} 秒的 W.draw 里没有线（只有 colorOnly 或已经画过的零件）`, `The W.draw at ${j.a.toFixed(1)} s has no lines in it`)); continue; } if (j.b <= j.a + 0.02) { add(j.a, M('窗口是反的', 'window inverted'), M(`W.draw 的窗口 ${j.a.toFixed(1)}–${j.b.toFixed(1)} 秒结束比开始早`, `W.draw window ${j.a.toFixed(1)}–${j.b.toFixed(1)} s ends before it starts`)); continue; } const rate = j.runs.length / (j.b - j.a); if (rate > (opt.maxRate ?? 240) && j.b - j.a > 0.4) add(j.a, M('笔太快', 'pen racing'), M(`${j.a.toFixed(1)}–${j.b.toFixed(1)} 秒要画 ${j.runs.length} 笔（每秒 ${rate.toFixed(0)} 笔）：像快进了。把窗口拉长，或把这一组拆到别的句子里`, `${j.a.toFixed(1)}–${j.b.toFixed(1)} s has ${j.runs.length} strokes (${rate.toFixed(0)}/s): it reads as fast-forward. Widen the window or spread the group`)); if (rate < 6 && j.b - j.a > 1.5) add(j.a, M('笔太慢', 'pen crawling'), M(`${j.a.toFixed(1)}–${j.b.toFixed(1)} 秒只有 ${j.runs.length} 笔（每秒 ${rate.toFixed(0)} 笔）：画面会显得空。这种风格靠密度，加细节，或缩短窗口`, `${j.a.toFixed(1)}–${j.b.toFixed(1)} s has only ${j.runs.length} strokes (${rate.toFixed(0)}/s): this style lives on density; add detail or shorten the window`)); }
      // the camera: never makes anyone sick
      { let fast = null, zfast = null, flips = 0, flipT = 0; const ext = []; let dir = 0, lastZ = Math.log(camAt(0).z); for (let t = 0; t < D - 1 / 15; t += 1 / 15) { const a = camAt(t), b = camAt(t + 1 / 15), sp = ((Math.hypot(b.x - a.x, b.y - a.y) * a.z * U) / Math.max(W0, H0)) * 15, zs = Math.log(b.z / a.z) * 15; if (sp > 0.85 && (!fast || sp > fast.v)) fast = { t, v: sp }; if (Math.abs(zs) > 0.9 && (!zfast || Math.abs(zs) > zfast.v)) zfast = { t, v: Math.abs(zs) }; const lz = Math.log(a.z), sg = Math.sign(zs); if (Math.abs(zs) > 0.02) { if (dir && sg !== dir) ext.push({ t, lz: lastZ }); dir = sg; } lastZ = lz; } for (let i = 2; i < ext.length; i++) if (ext[i].t - ext[i - 2].t < 3.2 && Math.abs(ext[i].lz - ext[i - 1].lz) > 0.12 && Math.abs(ext[i - 1].lz - ext[i - 2].lz) > 0.12) { flips++; flipT = ext[i].t; } if (fast) add(fast.t, M('镜头太快', 'camera too fast'), M(`${fast.t.toFixed(1)} 秒镜头每秒走 ${(fast.v * 100).toFixed(0)}% 个画面：会晕。拉开两个 W.draw 之间的距离或时间，或给 pull`, `At ${fast.t.toFixed(1)} s the camera moves ${(fast.v * 100).toFixed(0)}% of the frame per second: too fast. Give the move more time`)); if (zfast) add(zfast.t, M('变焦太快', 'zoom too fast'), M(`${zfast.t.toFixed(1)} 秒镜头变焦太快（${zfast.v.toFixed(2)} /秒）：放慢推拉，或把 zoom 调小`, `At ${zfast.t.toFixed(1)} s the zoom changes too fast (${zfast.v.toFixed(2)}/s): lower zoom or give it more time`)); if (flips > 3) add(flipT, M('镜头来回推拉', 'camera pumping'), M(`镜头有 ${flips} 次在 2 秒内由推转拉：看着像在喘。合并相邻的 W.draw，让一次推拉管久一点`, `The camera reverses push / pull ${flips} times within 2 s: it pumps. Merge neighbouring W.draw calls`)); }
      // nothing being drawn while the voice runs before the colour
      if (F.T && F.T.lines && F.T.lines.length) { const washAt = wash ? wash.at : D; let run = null, lim = 1.4, count = 0; for (let t = F.T.lines[0].start; t < Math.min(washAt, F.T.lines[F.T.lines.length - 1].end); t += 0.1) { const tip = tipOf(sh, t), speaking = F.T.lines.some((l) => t >= l.start && t <= l.end); const idle = speaking && !(tip && (tip.down || tip.lift !== undefined)); if (idle) run ??= t; else { if (run !== null && t - run > lim && count++ < 3) add(run, M('笔停了', 'pen idle'), M(`${run.toFixed(1)}–${t.toFixed(1)} 秒旁白在说，笔停着：这句话说的东西应该正在画。把 W.draw 的窗口拉到这句话上`, `${run.toFixed(1)}–${t.toFixed(1)} s the voice runs while the pen rests: what is being said should be being drawn`)); run = null; } } }
      // density
      if (R.length < 500) add(0, M('线太少', 'too sparse'), M(`整张画只有 ${R.length} 笔：这种风格靠密度（楼梯、栏杆、桁架、窗、管道），至少上千笔才像一个世界`, `Only ${R.length} strokes in the whole picture: this style lives on density; a world takes well over a thousand`));
      // colour: one wash, held back; the world lives after it; the voice runs into it
      if (!wash) add(D, M('没有上色', 'no colour'), M('片子没有 W.wash：上色是这种风格的高潮', 'No W.wash: the colour reveal is this style\'s payoff'));
      else {
        if (wash.at < D * 0.45) add(wash.at, M('上色太早', 'colour too early'), M(`${wash.at.toFixed(1)} 秒就开始上色（全片 ${D.toFixed(0)} 秒）：颜色是高潮，等整个机制都画完`, `The wash starts at ${wash.at.toFixed(1)} s of ${D.toFixed(0)} s: colour is the payoff; wait until the whole mechanism is on the page`));
        if (R[R.length - 1].tb > wash.at + 0.2) add(wash.at, M('上色时还在画', 'still drawing during the wash'), M(`上色从 ${wash.at.toFixed(1)} 秒开始，笔要画到 ${R[R.length - 1].tb.toFixed(1)} 秒：先画完再上色`, `The wash starts at ${wash.at.toFixed(1)} s but the pen draws until ${R[R.length - 1].tb.toFixed(1)} s`));
        const hold = D - (wash.at + wash.dur); if (hold < 4) add(wash.at, M('定格太短', 'final shot too short'), M(`上色完只留 ${hold.toFixed(1)} 秒：世界活起来至少要 4 秒以上`, `Only ${hold.toFixed(1)} s after the wash: the world needs at least 4 s to live`));
        const mv = sh.parts.filter((p) => p.motions.some((m) => m.kind !== 'blink'));
        if (!mv.length) add(wash.at + wash.dur, M('定格是死的', 'final shot frozen'), M('上色后没有东西动：给风车、机器、人、烟声明 spin / bob / sway / drift', 'Nothing moves after the wash: declare spin / bob / sway / drift on the machines, people and smoke'));
        else { const per = mv.flatMap((p) => p.motions.filter((m) => m.period).map((m) => m.period)), cnt = {}; for (const x of per) cnt[x.toFixed(2)] = (cnt[x.toFixed(2)] ?? 0) + 1; const mx2 = Math.max(0, ...Object.values(cnt)); if (per.length >= 6 && mx2 / per.length > 0.7) add(wash.at + wash.dur, M('动效呆板', 'stiff motion'), M(`${mx2}/${per.length} 个 bob / sway 周期完全一样：像一起点头。给不同的周期和相位`, `${mx2}/${per.length} bob / sway motions share one period: they nod in unison. Vary period and phase`)); const fr = mv.flatMap((p) => p.motions.filter((m) => m.kind !== 'blink').map((m) => m.from)), allDefault = fr.every((x) => x === undefined); if (mv.length >= 4 && allDefault && F.T && F.voiced) add(wash.at + wash.dur, M('动效呆板', 'stiff motion'), M('所有机器在同一时刻一起动起来：讲解片里让它们跟着旁白一个个启动（from: 这个词的时间）', 'Every machine starts at the same moment: in a narrated film start them one by one on the word (from: the word\'s time)')); }
        if (F.T && F.T.lines && F.T.lines.length) { const lastEnd = F.T.lines[F.T.lines.length - 1].end; if (lastEnd < wash.at + wash.dur + 1) add(wash.at + wash.dur, M('定格没有声音', 'silent final shot'), M('旁白在上色结束前就说完了：定格不能只剩音乐，让最后一句跑进定格', 'The narration ends before the wash does: keep the last line running into the held shot')); }
        if (S0.strataCount > 14) add(wash.at, M('图层太多', 'too many strata'), M(`上色后分了 ${S0.strataCount} 层静态图（每层一张画面大小的图）：运动零件穿插太多，会很吃内存。把运动的零件放到一起，或 z 放前面`, `${S0.strataCount} static strata in the colour stage: moving parts interleave too much and memory will suffer. Group moving parts or put them in front`));
        // a colour stage missing what makes it a payoff
        if (!sh.parts.some((p) => p.sky)) add(wash.at, M('没有天空', 'no sky'), M('上色层没有 W.sky：线稿没画的东西（天空、远山、树）才是上色的惊喜', 'No W.sky in the colour stage: what the lines never drew (sky, hills, trees) is the surprise of the wash'));
      }
      // lettering too small to read when written
      for (const T of texts) { if (T.sheet !== S0 || !T.p.items.length) continue; const r = R.find((x) => x.it.part === T.p); if (!r) continue; const c = camAt(r.ta), px = T.size * c.z * U; if (px < 26 && T.str.length > 1 && !T.o.small) add(r.ta, M('字太小', 'lettering too small'), M(`"${T.str.slice(0, 12)}" 写的时候在屏幕上只有 ${px.toFixed(0)}px 高：放大或推近`, `"${T.str.slice(0, 12)}" is only ${px.toFixed(0)} px high when written: larger or closer`)); }
      // lettering sitting on lines: other parts' ink crossing its box in the finished line stage, unless it has a plate
      { const samples = R.filter((r) => !r.it.lettered && !r.it.part.isStrike); let c2 = 0; for (const T of texts) { if (T.sheet !== S0 || T.o.plate || T.o.over || c2 >= 6) continue; const size = T.size, w = units(T.str) * size * 0.8, h = size * 1.1, x0 = T.o.x - (T.o.align === 'left' ? 0 : T.o.align === 'right' ? w : w / 2), x1 = x0 + w, y0 = T.o.y - h / 2, y1 = T.o.y + h / 2; let ink = 0; for (const r of samples) { if (r.it.part === T.p || r._b.x1 < x0 || r._b.x0 > x1 || r._b.y1 < y0 || r._b.y0 > y1) continue; for (let k = r.i0 + 1; k <= r.i1; k++) { if (r.off && r.off.has(k)) continue; const q = r.st.pts[k]; if (q[0] >= x0 && q[0] <= x1 && q[1] >= y0 && q[1] <= y1) ink += r.st.cum[k] - r.st.cum[k - 1]; } } if (ink > size * 2.2) { c2++; const rr = R.find((x) => x.it.part === T.p); add(rr ? rr.ta : 0, M('字压在线上', 'lettering on lines'), M(`"${T.str.slice(0, 12)}" 压在别的线上（框里约 ${ink.toFixed(0)} 单位的线）：挪到空白处，写到招牌上，或给 plate: true`, `"${T.str.slice(0, 12)}" sits on other lines (about ${ink.toFixed(0)} units of ink in its box): move it, put it on a sign, or give plate: true`)); } } }
      // captions repeating the lettering word for word
      if (F.caps) { const norm = (x) => String(x).replace(/[\s·,，。:：;；、!！?？《》“”"'()（）\-–—]/g, ''); for (const T of texts) { if (T.sheet !== S0) continue; const tn = norm(T.str), cjk = (tn.match(/[㐀-鿿]/g) || []).length; if (cjk < 5) continue; const rr = R.find((x) => x.it.part === T.p); if (!rr) continue; const c = F.caps.find((x) => rr.ta < x.end && rr.tb + 2 > x.start && norm(x.text).includes(tn)); if (c) { add(rr.ta, M('字重复字幕', 'lettering repeats the caption'), M(`"${T.str}" 和当时的字幕一字不差：画上写旁白没说的东西（数字、名字、地点）`, `"${T.str}" says exactly what the caption says: letter what the voice doesn't`)); break; } } }
      return out;
    });

    W.sheets = sheets;
    P.drawnworld.last = W;   // for debugging from the console
    W.groups = groups;
    W.stats = () => ({ pen: W.penStats(), strokes: S0.runs.length, knocked: S0.knocked, strata: S0.strataCount, jobs: S0.jobs.map((j) => ({ a: +j.a.toFixed(1), b: +j.b.toFixed(1), n: j.runs.length, pace: +(1 / j.scale).toFixed(2) })) });
    // the visible pen as the viewer sees it, sampled at the film's frame rate: direction reversals a second, per-frame jump, distance from the line being drawn; the tour's hops
    W.penStats = () => {
      const R = S0.runs; if (FLAT || !R.length || !CAM) return null;
      const a = R[0].ta, b = R[R.length - 1].tb, fps = 30, W_ = Math.max(W0, H0), pts = [], gaps = [], flips = [], jumps = []; let gapT = a, gapMax = 0;
      for (let t = a; t <= b; t += 1 / fps) { const p = penAt(S0, t), c = camAt(t), k = c.z * U; pts.push([(p.x - c.x) * k, (p.y - c.y) * k]); if (p.down) { const g = (Math.hypot(p.x - p.ix, p.y - p.iy) * k) / W_; gaps.push(g); if (g > gapMax) { gapMax = g; gapT = t; } } }
      // the frame is the reference: a pen that holds still on a moving camera is still moving on screen
      const EPS = 0.002 * W_;
      for (let i = 1; i < pts.length; i++) jumps.push(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) / W_);
      for (let i = 1; i < pts.length - 1; i++) { const ux = pts[i][0] - pts[i - 1][0], uy = pts[i][1] - pts[i - 1][1], vx = pts[i + 1][0] - pts[i][0], vy = pts[i + 1][1] - pts[i][1]; if (Math.hypot(ux, uy) > EPS && Math.hypot(vx, vy) > EPS && ux * vx + uy * vy < 0) flips.push(a + i / fps); }
      const pct = (arr, q) => { if (!arr.length) return 0; const s2 = arr.slice().sort((x, y) => x - y); return s2[Math.floor((s2.length - 1) * q)]; };
      let worst = { t: a, rate: 0 }, j0 = 0; for (let j1 = 0; j1 < flips.length; j1++) { while (flips[j1] - flips[j0] > 3) j0++; const rate = (j1 - j0 + 1) / 3; if (rate > worst.rate) worst = { t: flips[j0], rate }; }
      let hop = 0, ink = 0, hops = []; for (let i = 1; i < R.length; i++) { const d = Math.hypot(R[i].st.pts[R[i].i0][0] - R[i - 1].st.pts[R[i - 1].i1][0], R[i].st.pts[R[i].i0][1] - R[i - 1].st.pts[R[i - 1].i1][1]); hop += d; hops.push(d); ink += R[i].L; }
      return { seconds: b - a, reversals: flips.length / Math.max(1, b - a), worst, jump: pct(jumps, 0.5) * 100, jumpP90: pct(jumps, 0.9) * 100, gapP50: pct(gaps, 0.5) * 100, gapP90: pct(gaps, 0.9) * 100, gapMax: gapMax * 100, gapT, hopTotal: hop, inkTotal: ink, hopP50: pct(hops, 0.5), hopP90: pct(hops, 0.9) };
    };
    const drawRaw = W.draw;
    if (P.infoKit) P.infoKit(W, { stall: 'illustration', house: 'illustration', person: 'character', queue: 'character', gear: 'diagram', pipe: 'diagram', sign: 'annotate', tag: 'mark', write: 'annotate', cableway: 'diagram', belt: 'diagram' });
    W.draw = drawRaw;   // the info kit mutes what runs inside its wrappers; a W.draw itself registers the picture
    return W;
  };
})();
