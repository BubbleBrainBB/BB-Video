// grain.js: the flat grain-illustration (扁平颗粒插画) style, one of bb-video's visual styles (style notes in styles/grain/STYLE.md). Load after promo.js.
// One frame: a flat vector illustration on warm off-white paper in two spot colours (coral and navy by default) and their tints. Shapes have no
// outlines; volume and light are made with stipple grain, never smooth gradients: a colour breaks into dots as it fades into its tint, its shade
// or the paper. Simple abstract figures (round heads, block bodies), a thin ground line, very little text (years, signs, a timeline ruler).
// Information is told the way the illustration is drawn: circular inset close-ups, a small diagram card, ticking readouts (a dial, a price sign,
// a clock wedge), rows of repeated things for quantity, columns rising from the ground line, a scene that grows from one era into the next.
// The grain is a seeded noise field anchored to each shape: it never boils between frames. Camera: a stage that holds, breathes and pushes in;
// the world transforms in place; chapters pass through an iris (a circle opening from a detail into the next scene).
//
//   const G = PROMO.grain(F, { palette: 'coral' | 'mint' | 'amber', colors, grain: 1.1, drift, captions, ruler, fonts })
//   World units: 1 unit = 1 px of a 1080-high frame at zoom 1 (portrait: 1080 wide). y grows downward; the ground line is y = 0 (things stand at y ≤ 0).
//   TONES   'a' coral · 'a2' pink · 'a3' blush · 'a0' deep coral · 'b' navy · 'b2' blue · 'b3' pale blue · 'b0' deep navy · 'paper' · 'white' · 'skin'
//           (aliases in every palette: coral / pink / blush / deep · navy / blue / sky / ink)
//   SHADE   shade: 'top' | 'bottom' | 'left' | 'right' | 'fade' | 'fadeUp' | 'fadeL' | 'fadeR' | 'glow' | 'round' | 'speckle' | 'flat' | [layers]
//           a layer: { c: tone, d: [d0, d1], dir: deg (0 → right, 90 → down) | 'radial', s: [s0, s1], at: [cx, cy] (radial, 0–1 of the box) }
//   SHAPES  G.rect / G.circle / G.ellipse / G.poly / G.path / G.line / G.arc (each { x, y, …, fill, shade, stroke, w, at, until, enter, exit, z, in: group })
//           G.group(o) → a node with .rect / .circle / … to add children (local coordinates)   node.to(at, { x, y, h, rot, sx, sy, … }, dur, ease)
//           enter: 'grain' (stipple in) | 'rise' | 'pop' | 'drop' | 'slide' (from) | 'wipe' (dir) | 'draw' (lines) | 'none'   exit: { at, to: 'grain' | 'sink' | 'pop' | 'slide' | 'lift' | 'wipe' }
//   PROPS   G.ground  G.hill  G.tree  G.cloud  G.sun  G.building  G.figure  G.car  G.pole  G.wire  G.glow  G.beam  G.smoke
//   INFO    G.inset  G.card  G.gauge  G.sign  G.clock  G.row  G.bars  G.ruler / G.year  G.number  G.tag
//   TEXT    G.text(text, { x, y, size, tone, weight, at, until, enter: 'grain' | 'rise' | 'type', align })   (DOM text in the world: the checks see it)
//   CAMERA  G.cam(t, view)  G.move(a, b, view, ease)  G.iris(a, b, view, { from })   view = { x, y, z } | { on: node | [nodes] | box, pad, dx, dy, z }
//   WHOLE   G.flood(at, tone, { dur, how: 'grain' | 'radial' | 'up', from })  the ground changes colour (night)   G.spot(a, b, { on, tone })  the full-colour spotlight beat
//           G.swap(at, oldNode, newNode)  one era turns into the next in place   G.L(landscape, portrait)
// Sounds the runtime emits (styles/grain/sound.js): grain, rise, pop, drop, slide, fill, draw, tick, roll, needle, chime, iris, flood, spot, drive.
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('grain.js 要在 promo.js 之后加载', 'grain.js must load after promo.js'));
  const { E, seg, set, el, frameT } = P;
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, q) => a + (b - a) * q;
  const sm = (q) => { q = cl(q); return q * q * (3 - 2 * q); };
  const DEG = Math.PI / 180;
  const f1 = (n) => Math.round(n * 10) / 10;
  const hex = (h) => { const s = String(h).replace('#', ''); const v = s.length === 3 ? s.split('').map((c) => parseInt(c + c, 16)) : [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); return v; };
  const toHex = (v) => '#' + v.map((x) => Math.round(cl(x, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mixHex = (a, b, q) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => lerp(v, y[i], q))); };
  const units = (t) => { t = String(t ?? ''); return (t.match(/[^\x00-\xff]/g) || []).length + t.replace(/[^\x00-\xff]/g, '').length * 0.56; };
  const bounce = (q) => { const n1 = 7.5625, d1 = 2.75; if (q < 1 / d1) return n1 * q * q; if (q < 2 / d1) return n1 * (q -= 1.5 / d1) * q + 0.75; if (q < 2.5 / d1) return n1 * (q -= 2.25 / d1) * q + 0.9375; return n1 * (q -= 2.625 / d1) * q + 0.984375; };
  const softBounce = (q) => lerp(E.quartOut(q), bounce(q), 0.45);

  // Palettes: two spot colours (a, b) and their tints / shades on a warm paper. Every name used in a film resolves through these roles.
  const PALS = {
    coral: { paper: '#f7f3e9', a: '#ef6a5e', a2: '#f6aca5', a3: '#f8d4ce', a0: '#d8504a', b: '#2e4683', b2: '#5470b4', b3: '#c3cde6', b0: '#1b2b55', white: '#fffaf1', skin: '#7a4232' },
    mint: { paper: '#f4f1e8', a: '#2f9c8a', a2: '#86c9b9', a3: '#cfe8df', a0: '#1f7a6b', b: '#3d2f5e', b2: '#6c5c96', b3: '#d3cde3', b0: '#271d40', white: '#fdfbf4', skin: '#6a3f30' },
    amber: { paper: '#f6efe2', a: '#e7a13a', a2: '#f2c983', a3: '#f8e3bf', a0: '#c9821f', b: '#1f4d58', b2: '#3f7682', b3: '#c4d8da', b0: '#13343c', white: '#fffaf0', skin: '#6e3f2c' },
  };
  const ALIAS = { coral: 'a', pink: 'a2', blush: 'a3', deep: 'a0', navy: 'b', blue: 'b2', sky: 'b3', ink: 'b0' };
  const LIGHTER = { a0: 'a', a: 'a2', a2: 'a3', a3: 'paper', b0: 'b', b: 'b2', b2: 'b3', b3: 'paper', skin: 'a0', paper: 'white', white: 'white' };
  const DARKER = { a3: 'a2', a2: 'a', a: 'a0', a0: 'b0', b3: 'b2', b2: 'b', b: 'b0', b0: 'b0', skin: 'b0', paper: 'a3', white: 'paper' };

  // ---------- the noise field: one seeded tile, rank-equalised so a density d shows exactly d of the dots ----------
  const NT = 256, LV = 24;
  let NOISE = null;
  const noiseTile = () => {
    if (NOISE) return NOISE;
    const r = window.EV.rng(90127), n = NT * NT, w = new Float32Array(n), b = new Float32Array(n), v = new Float32Array(n);
    for (let i = 0; i < n; i++) w[i] = r();
    for (let y = 0; y < NT; y++) for (let x = 0; x < NT; x++) { let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += w[((y + dy + NT) % NT) * NT + ((x + dx + NT) % NT)]; b[y * NT + x] = s / 9; }
    const G2 = 32, lat = []; for (let i = 0; i < (NT / G2) * (NT / G2); i++) lat.push(r());
    const lf = (x, y) => { const gx = x / G2, gy = y / G2, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = sm(gx - x0), fy = sm(gy - y0), m = NT / G2, at = (i, j) => lat[((j + m) % m) * m + ((i + m) % m)]; return lerp(lerp(at(x0, y0), at(x0 + 1, y0), fx), lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), fx), fy); };
    for (let y = 0; y < NT; y++) for (let x = 0; x < NT; x++) { const i = y * NT + x; v[i] = 0.8 * w[i] + 0.12 * b[i] + 0.08 * lf(x, y); }
    const idx = Array.from({ length: n }, (_, i) => i).sort((p, q) => v[p] - v[q]);
    const rank = new Float32Array(n); idx.forEach((i, k) => { rank[i] = (k + 0.5) / n; });
    NOISE = rank;
    return NOISE;
  };
  const tileCanvas = (color, lev) => {
    const N = noiseTile(), c = document.createElement('canvas'); c.width = c.height = NT;
    const x = c.getContext('2d'), img = x.createImageData(NT, NT), [R, Gc, B] = color ? hex(color) : [0, 0, 0], th = lev / LV;
    for (let i = 0; i < NT * NT; i++) if (N[i] < th) { img.data[i * 4] = R; img.data[i * 4 + 1] = Gc; img.data[i * 4 + 2] = B; img.data[i * 4 + 3] = 255; }
    x.putImageData(img, 0, 0);
    return c;
  };

  P.grain = function (F, opt = {}) {
    const W = F.W, H = F.H, PT = F.portrait, U = F.px(1), FLAT = !!opt.flat;
    const C0 = { ...(PALS[opt.palette] || PALS.coral), ...(opt.colors || {}) };
    // a replaced spot colour (a brand colour) brings its own tints and shade unless they are given too
    for (const r of ['a', 'b']) if (opt.colors && opt.colors[r]) { const c = opt.colors[r]; C0[r + '2'] = opt.colors[r + '2'] ?? mixHex(c, C0.paper, 0.45); C0[r + '3'] = opt.colors[r + '3'] ?? mixHex(c, C0.paper, 0.74); C0[r + '0'] = opt.colors[r + '0'] ?? mixHex(c, '#000000', 0.16); }
    const FONT = { sans: '"Inter", "Noto Sans SC", "PingFang SC", sans-serif', num: '"Inter", "Noto Sans SC", sans-serif', ...(opt.fonts || {}) };
    const G = { F, colors: C0, fonts: FONT, portrait: PT, LV, L: (land, port) => (PT && port !== undefined ? port : land) };
    const GS = (opt.grain ?? 1.1);   // world units per noise cell (≈ px at zoom 1): the dot size
    const raw = new Set();
    // a tone name → colour (role, alias or any css hex; hex outside the palette is remembered for the colour check)
    const col = (c, d) => { if (c == null) return d == null ? null : col(d); if (C0[c]) return C0[c]; if (ALIAS[c]) return C0[ALIAS[c]]; if (/^#/.test(c)) { if (!Object.values(C0).includes(c.toLowerCase())) raw.add(c.toLowerCase()); return c; } return c; };
    const role = (c) => (C0[c] ? c : ALIAS[c] ?? null);
    const lighter = (c) => { const r = role(c); return r ? col(LIGHTER[r]) : mixHex(col(c), C0.paper, 0.45); };
    const darker = (c) => { const r = role(c); return r ? col(DARKER[r]) : mixHex(col(c), '#000000', 0.22); };
    G.col = col; G.lighter = lighter; G.darker = darker;

    // ---------- canvases: the world (camera) and, in flat mode (kit.js), one canvas per scene layer ----------
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const scratch = mk(W, H), sx = scratch.getContext('2d'), maskCv = mk(W, H), mkx = maskCv.getContext('2d');
    let main = null, mx = null, wlA = null, wlB = null, hud = null;
    if (!FLAT) {
      F.stage.style.background = C0.paper;
      main = el('canvas', `left:0;top:0;width:${W}px;height:${H}px;z-index:5`, F.stage); main.width = W; main.height = H; mx = main.getContext('2d');
      main.dataset.motion = 'skip';
      // world text: two layers (the incoming view of an iris draws in the second, clipped to the circle); measured as if the camera stood still
      wlA = el('div', 'left:0;top:0;width:0;height:0;z-index:10;transform-origin:0 0;pointer-events:none', F.stage); wlA.dataset.motion = 'texture';
      wlB = el('div', 'left:0;top:0;width:0;height:0;z-index:11;transform-origin:0 0;pointer-events:none;display:none', F.stage); wlB.dataset.motion = 'texture';
      hud = el('div', 'inset:0;z-index:30;pointer-events:none', F.stage);
    }
    const pats = new Map();
    const pat = (ctx, color, lev) => { const k = color + '|' + lev; let p = pats.get(k); if (!p) { p = ctx.createPattern(tileCanvas(color, lev), 'repeat'); pats.set(k, p); } return p; };
    const masks = [];   // DOM text dissolve: data-url masks per level
    const maskUrl = (lev) => { if (!masks[lev]) masks[lev] = `url(${tileCanvas('#000000', lev).toDataURL()})`; return masks[lev]; };

    // ---------- nodes ----------
    const roots = [];
    let seq = 0, curLayer = null;
    // flat mode (kit.js): everything built inside G.into(layer, fn) draws on that scene layer's canvas, its text in that layer
    G.into = (layer, fn) => { const prev = curLayer; curLayer = layer; if (layer && G.layerCanvas) G.layerCanvas(layer); try { return fn(); } finally { curLayer = prev; } };
    const IN = { grain: 0.6, rise: 0.6, pop: 0.45, drop: 0.65, slide: 0.95, wipe: 0.85, draw: 0.9, none: 0, fade: 0.45 };
    const SND = { grain: 'grain', rise: 'rise', pop: 'pop', drop: 'drop', slide: 'slide', wipe: 'fill', draw: 'draw' };
    const node = (kind, o = {}) => {
      const n = { id: ++seq, kind, p: o, kids: [], keys: {}, parent: o.in || null, z: o.z ?? 0, layer: o.layer || (o.in ? null : curLayer) };
      n.at = o.at ?? (n.parent ? -1 : 0); n.until = o.until ?? 1e9;
      n.enter = o.enter ?? (n.parent || n.at <= 0 ? 'none' : 'grain');
      n.inDur = o.inDur ?? IN[n.enter] ?? 0.55;
      const ex = o.exit ? (typeof o.exit === 'string' ? { to: o.exit } : o.exit) : null;
      n.exit = ex ? ex.to ?? 'grain' : 'grain'; if (ex && ex.at !== undefined) n.until = ex.at;
      n.outDur = (ex && ex.dur) ?? (n.exit === 'slide' ? 0.9 : 0.5);
      n.ord = seq;
      if (n.parent) { n.parent.kids.push(n); n.layer ??= n.parent.layer; } else roots.push(n);
      // sugar: build children inside a group
      for (const k of ['rect', 'circle', 'ellipse', 'poly', 'path', 'line', 'arc', 'group']) n[k] = (o2 = {}) => G[k]({ ...o2, in: n });
      n.add = (fn) => { fn(n); return n; };
      n.to = (at, props, dur = 0.6, ease = E.cubicInOut) => { for (const k in props) (n.keys[k] ??= []).push([at, at + dur, props[k], ease]); return n; };
      n.show = (at, until, enter, exit) => { n.at = at; if (until !== undefined) n.until = until; if (enter) { n.enter = enter; n.inDur = IN[enter] ?? 0.55; } if (exit) n.exit = exit; return n; };
      n.bbox = (t) => wbox(n, t ?? n.at);
      if (!n.parent && o.sfx !== false && n.at > 0 && SND[n.enter]) sounds.push([n, 'in']);
      if (!n.parent && o.sfx !== false && n.until < 1e8 && n.exit !== 'none') sounds.push([n, 'out']);
      return n;
    };
    const sounds = [];
    F.prep(() => { for (const [n, w] of sounds) { if (w === 'in') F.sfx(Math.max(0, n.at - n.inDur * 0.8), SND[n.enter], n.p.gain ?? 0.4, { dur: n.inDur }); else F.sfx(n.until - n.outDur, n.exit === 'slide' ? 'slide' : 'grain', 0.25, { dur: n.outDur }); } });
    const isNum = (v) => typeof v === 'number';
    // parameter value at t: a constant, a function of t, then keyed changes (.to) on top; colours mix
    const pv = (n, k, t, d) => {
      let v = n.p[k]; if (typeof v === 'function') v = v(t, n); if (v === undefined) v = d;
      const ks = n.keys[k]; if (!ks) return v;
      for (const [a, b, to, e] of ks) { if (t <= a) break; const q = e(cl((t - a) / Math.max(1e-6, b - a))), tv = typeof to === 'function' ? to(t, n) : to; v = isNum(v) && isNum(tv) ? lerp(v, tv, q) : typeof tv === 'string' && typeof v === 'string' && v[0] !== '#' && tv[0] !== '#' && !C0[v] && !ALIAS[v] ? (q < 1 ? v : tv) : typeof tv === 'string' && v != null ? mixHex(col(v), col(tv), q) : q >= 1 ? tv : v; }
      return v;
    };
    G.pv = pv;

    // ---------- geometry ----------
    const pathOf = (n, t) => {
      const g = (k, d) => pv(n, k, t, d), p = new Path2D();
      switch (n.kind) {
        case 'rect': { const w = g('w', 100), h = g('h', 100), r = Math.min(g('r', 0), w / 2, h / 2); if (r > 0) p.roundRect(0, 0, w, h, r); else p.rect(0, 0, w, h); break; }
        case 'circle': p.arc(0, 0, Math.max(0, g('r', 50)), 0, Math.PI * 2); break;
        case 'ellipse': p.ellipse(0, 0, Math.max(0, g('rx', 60)), Math.max(0, g('ry', 40)), 0, 0, Math.PI * 2); break;
        case 'poly': { const pts = g('pts', []); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); break; }
        case 'path': return new Path2D(g('d', ''));
        case 'line': { const pts = g('pts', []); if (g('curve', false) && pts.length > 2) { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const mxp = (pts[i][0] + pts[i + 1][0]) / 2, myp = (pts[i][1] + pts[i + 1][1]) / 2; p.quadraticCurveTo(pts[i][0], pts[i][1], i === pts.length - 2 ? pts[i + 1][0] : mxp, i === pts.length - 2 ? pts[i + 1][1] : myp); } } else pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); break; }
        case 'arc': { const r = g('r', 50), r0 = g('r0', 0), a0 = g('a0', -90) * DEG, a1 = g('a1', 0) * DEG; if (r0 > 0) { p.arc(0, 0, r, a0, a1); p.arc(0, 0, r0, a1, a0, true); } else { p.moveTo(0, 0); p.arc(0, 0, r, a0, a1); } p.closePath(); break; }
      }
      return p;
    };
    const svgM = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svgM.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden'; document.body.appendChild(svgM);
    const svgP = document.createElementNS('http://www.w3.org/2000/svg', 'path'); svgM.appendChild(svgP);
    const pathBox = new Map();
    const lbox = (n, t) => {   // local box [x, y, w, h] of a shape
      const g = (k, d) => pv(n, k, t, d);
      switch (n.kind) {
        case 'rect': return [0, 0, g('w', 100), g('h', 100)];
        case 'circle': { const r = g('r', 50); return [-r, -r, 2 * r, 2 * r]; }
        case 'arc': { const r = g('r', 50); return [-r, -r, 2 * r, 2 * r]; }
        case 'ellipse': { const a = g('rx', 60), b = g('ry', 40); return [-a, -b, 2 * a, 2 * b]; }
        case 'poly': case 'line': { const pts = g('pts', []); if (!pts.length) return [0, 0, 0, 0]; const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), lw = n.kind === 'line' ? g('w', 3) / 2 : 0; return [Math.min(...xs) - lw, Math.min(...ys) - lw, Math.max(...xs) - Math.min(...xs) + 2 * lw, Math.max(...ys) - Math.min(...ys) + 2 * lw]; }
        case 'path': { const d = g('d', ''); if (!pathBox.has(d)) { svgP.setAttribute('d', d); const b = svgP.getBBox(); pathBox.set(d, [b.x, b.y, b.width, b.height]); } return pathBox.get(d); }
        case 'group': { const bs = n.kids.filter((k) => !k.p.noBox).map((k) => { const b = lbox(k, t), x = pv(k, 'x', t, 0), y = pv(k, 'y', t, 0), s1 = pv(k, 'sx', t, 1), s2 = pv(k, 'sy', t, 1); return [x + Math.min(b[0] * s1, (b[0] + b[2]) * s1), y + Math.min(b[1] * s2, (b[1] + b[3]) * s2), b[2] * Math.abs(s1), b[3] * Math.abs(s2)]; }); if (n.p.clip) { const r = pv(n, 'r', t, 100); return [-r, -r, 2 * r, 2 * r]; } if (!bs.length) return [0, 0, 0, 0]; const x0 = Math.min(...bs.map((b) => b[0])), y0 = Math.min(...bs.map((b) => b[1])), x1 = Math.max(...bs.map((b) => b[0] + b[2])), y1 = Math.max(...bs.map((b) => b[1] + b[3])); return [x0, y0, x1 - x0, y1 - y0]; }
      }
      return [0, 0, 0, 0];
    };
    // world box (ancestors' offsets and scales; rotation ignored)
    const wbox = (n, t) => { let [x, y, w, h] = lbox(n, t); for (let m = n; m; m = m.parent) { const s1 = Math.abs(pv(m, 'sx', t, 1)), s2 = Math.abs(pv(m, 'sy', t, 1)), k = m.p.clip ? pv(m, 'zoom', t, 1) : 1; if (m !== n) { x *= k; y *= k; w *= k; h *= k; } x = x * s1 + pv(m, 'x', t, 0); y = y * s2 + pv(m, 'y', t, 0); w *= s1; h *= s2; } return { x, y, w, h }; };
    G.box = (n, t) => wbox(n, t ?? n.at);

    // ---------- shading ----------
    const preset = (name, base, o) => {
      const t = lighter(base), d = darker(base), k = o.amount ?? 1;
      switch (name) {
        case 'top': return { layers: [{ c: t, d: [k, 0], dir: 90, s: [0, 0.62] }] };
        case 'bottom': return { layers: [{ c: d, d: [0, 0.85 * k], dir: 90, s: [0.35, 1] }] };
        case 'left': return { layers: [{ c: t, d: [0.95 * k, 0], dir: 0, s: [0, 0.6] }] };
        case 'right': case 'side': return { layers: [{ c: d, d: [0, 0.9 * k], dir: 0, s: [0.3, 1] }] };
        case 'fade': return { base: { d: [1, 0], dir: 90, s: [0.15, 1] }, layers: [] };
        case 'fadeUp': return { base: { d: [1, 0], dir: -90, s: [0.15, 1] }, layers: [] };
        case 'fadeL': return { base: { d: [1, 0], dir: 180, s: [0.2, 1] }, layers: [] };
        case 'fadeR': return { base: { d: [1, 0], dir: 0, s: [0.2, 1] }, layers: [] };
        case 'glow': return { layers: [{ c: t, d: [k, 0], dir: 'radial', s: [0, 0.75], at: [0.5, 0.5] }] };
        case 'round': return { layers: [{ c: t, d: [0.9 * k, 0], dir: 'radial', s: [0, 0.7], at: [0.32, 0.28] }, { c: d, d: [0, 0.8 * k], dir: 'radial', s: [0.55, 1.15], at: [0.4, 0.35] }] };
        case 'speckle': return { layers: [{ c: t, d: [0.14 * k, 0.06 * k], dir: 90, s: [0, 1] }] };
        default: return { layers: [] };
      }
    };
    const shadeOf = (n, t, base) => {
      const s = pv(n, 'shade', t, null);
      if (!s) return { layers: [] };
      if (typeof s === 'string') return preset(s, base, n.p);
      const arr = Array.isArray(s) ? s : [s];
      return { base: arr.find((l) => l.base)?.base ?? null, layers: arr.filter((l) => !l.base).map((l) => ({ ...l, c: col(l.c ?? lighter(base)) })) };
    };
    const SL = 40;
    // one grain layer inside the current clip: slices along an axis (or rings), each filled with the noise pattern at its density level
    const layerFill = (ctx, bb, L, m, prof, gs) => {
      const [bx, by, bw, bh] = bb, dfn = (q) => { const [d0, d1] = L.d ?? [1, 1], [s0, s1] = L.s ?? [0, 1]; return lerp(d0, d1, sm((q - s0) / Math.max(1e-6, s1 - s0))); };
      const fillLev = (lev, fn) => { if (lev <= 0) return; if (lev >= LV) ctx.fillStyle = L.c; else { const p = pat(ctx, L.c, lev); p.setTransform(new DOMMatrix().scaleSelf(gs, gs)); ctx.fillStyle = p; } fn(); };
      if (L.dir === 'radial' && !prof) {
        const [ax, ay] = L.at ?? [0.5, 0.5], cx = bx + bw * ax, cy = by + bh * ay, R = Math.max(1, (L.r ?? Math.max(bw, bh) / 2)), far = Math.hypot(Math.max(cx - bx, bx + bw - cx), Math.max(cy - by, by + bh - cy)) + 2, sMax = far / R;
        const runs = []; for (let i = 0; i < SL; i++) { const q0 = (i / SL) * sMax, q1 = ((i + 1) / SL) * sMax, lev = Math.round(cl(dfn((q0 + q1) / 2) * m) * LV); if (runs.length && runs[runs.length - 1][2] === lev) runs[runs.length - 1][1] = q1; else runs.push([q0, q1, lev]); }
        for (const [q0, q1, lev] of runs) fillLev(lev, () => { ctx.beginPath(); ctx.arc(cx, cy, q1 * R, 0, Math.PI * 2); if (q0 > 0) ctx.arc(cx, cy, q0 * R, 0, Math.PI * 2, true); ctx.fill(); });
        return;
      }
      // the slicing axis: the wipe's when one is running, else the layer's
      const ang = (prof ? prof.dir : L.dir === 'radial' ? 90 : L.dir ?? 90) * DEG, ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
      const cs = [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]], ps = cs.map(([x, y]) => x * ux + y * uy), qs = cs.map(([x, y]) => x * vx + y * vy);
      const p0 = Math.min(...ps) - 1, p1 = Math.max(...ps) + 1, q0 = Math.min(...qs) - 1, q1 = Math.max(...qs) + 1;
      const la = L.dir === 'radial' ? 90 * DEG : (L.dir ?? 90) * DEG, lu = [Math.cos(la), Math.sin(la)], lps = cs.map(([x, y]) => x * lu[0] + y * lu[1]), lp0 = Math.min(...lps), lp1 = Math.max(...lps);
      const runs = [];
      for (let i = 0; i < SL; i++) {
        const a = i / SL, b = (i + 1) / SL, mid = p0 + (p1 - p0) * ((a + b) / 2);
        // the layer's own position at this slice's centre line (when the wipe's axis differs, at the box centre across it)
        const qc = (q0 + q1) / 2, wx = mid * ux + qc * vx, wy = mid * uy + qc * vy, ls = (wx * lu[0] + wy * lu[1] - lp0) / Math.max(1e-6, lp1 - lp0);
        const lev = Math.round(cl(dfn(prof ? ls : (a + b) / 2) * m * (prof ? prof.f((a + b) / 2) : 1)) * LV);
        if (runs.length && runs[runs.length - 1][2] === lev) runs[runs.length - 1][1] = b; else runs.push([a, b, lev]);
      }
      for (const [a, b, lev] of runs) fillLev(lev, () => { const pa = p0 + (p1 - p0) * a - 0.5, pb = p0 + (p1 - p0) * b + 0.5; ctx.beginPath(); ctx.moveTo(pa * ux + q0 * vx, pa * uy + q0 * vy); ctx.lineTo(pb * ux + q0 * vx, pb * uy + q0 * vy); ctx.lineTo(pb * ux + q1 * vx, pb * uy + q1 * vy); ctx.lineTo(pa * ux + q1 * vx, pa * uy + q1 * vy); ctx.closePath(); ctx.fill(); });
    };
    // a static stipple on any 2D context (kit montage cells, covers): spec = { c, d: [d0, d1], dir, s, at, r }
    G.stipple = (ctx, box, spec, gs = GS * U) => { ctx.save(); ctx.beginPath(); ctx.rect(box[0], box[1], box[2], box[3]); ctx.clip(); layerFill(ctx, box, { ...spec, c: String(spec.c)[0] === '#' ? spec.c : col(spec.c) }, 1, null, gs); ctx.restore(); };
    const lineLen = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };
    const drawShape = (ctx, n, t, m, prof, drawQ, gs) => {
      const g = (k, d) => pv(n, k, t, d), path = pathOf(n, t), bb = lbox(n, t);
      const fill = n.kind === 'line' ? null : col(g('fill', n.kind === 'line' ? null : 'a'));
      if (fill) {
        const sh = shadeOf(n, t, g('fill', 'a'));
        if (m >= 1 && !prof && !sh.base && !sh.layers.length) { ctx.fillStyle = fill; ctx.fill(path); }
        else {
          ctx.save(); ctx.clip(path);
          layerFill(ctx, bb, { c: fill, ...(sh.base || { d: [1, 1], dir: 90 }) }, m, prof, gs);
          for (const L of sh.layers) layerFill(ctx, bb, L, m * (L.only ?? 1), prof, gs);
          ctx.restore();
        }
      }
      const st = col(g('stroke', n.kind === 'line' ? 'b' : null));
      if (st) {
        const lw = g('w', 3), lev = Math.round(cl(m) * LV);
        if (lev <= 0) return;
        ctx.lineWidth = lw; ctx.lineCap = g('cap', 'round'); ctx.lineJoin = 'round';
        if (lev >= LV) ctx.strokeStyle = st; else { const p = pat(ctx, st, lev); p.setTransform(new DOMMatrix().scaleSelf(gs, gs)); ctx.strokeStyle = p; }
        const dash = g('dash', null);
        if (drawQ < 1 && n.kind === 'line') { const L = lineLen(g('pts', [])); ctx.setLineDash([L * drawQ, L + 1]); } else if (dash) ctx.setLineDash(dash); else ctx.setLineDash([]);
        ctx.stroke(path); ctx.setLineDash([]);
      }
    };

    // ---------- entrances and exits: one state per node per frame ----------
    const stateOf = (n, t) => {
      const s = { m: 1, dx: 0, dy: 0, sx: 1, sy: 1, prof: null, draw: 1, piv: null };
      if (t < n.at - n.inDur || t >= n.until) return null;
      const qi = n.inDur > 0 ? cl((t - (n.at - n.inDur)) / n.inDur) : 1, qo = n.until < 1e8 ? cl((t - (n.until - n.outDur)) / n.outDur) : 0;
      const dist = n.p.dist ?? 260, side = (f) => (f === 'left' ? -1 : f === 'right' ? 1 : f === 'top' ? -1 : 1);
      const wipe = (q, dir, rev) => { const band = 0.18, f = q * (1 + band); return { dir: { up: -90, down: 90, left: 180, right: 0 }[dir] ?? (isNum(dir) ? dir : -90), f: (x) => (rev ? cl((x - (1 - f)) / band + 1) * 0 + cl(((1 - x) - (1 - f) + band) / band) : cl((f - x) / band)) }; };
      if (qi < 1) {
        switch (n.enter) {
          case 'grain': case 'fade': s.m = E.sine(qi); break;
          case 'rise': s.sy = E.springSoft(qi); s.m = cl(qi * 5); s.piv = 'bottom'; break;
          case 'pop': { const k = E.backOut(qi); s.sx = s.sy = Math.max(0.001, k); s.m = cl(qi * 4); s.piv = 'center'; break; }
          case 'drop': s.dy = -(1 - softBounce(qi)) * (n.p.dist ?? 180); s.m = cl(qi * 4); break;
          case 'slide': { const f = n.p.from ?? 'left', k = 1 - E.quartOut(qi); if (f === 'top' || f === 'bottom') s.dy = side(f) * dist * k; else s.dx = side(f) * dist * k; s.m = cl(qi * 3); break; }
          case 'wipe': s.prof = wipe(E.sine(qi), n.p.dir ?? 'up'); break;
          case 'draw': if (n.kind === 'line') s.draw = E.cubicInOut(qi); else s.m = E.sine(qi); break;
        }
      }
      if (qo > 0) {
        switch (n.exit) {
          case 'grain': case 'fade': s.m *= 1 - E.sine(qo); break;
          case 'sink': s.sy *= 1 - E.cubicInOut(qo); s.piv = 'bottom'; break;
          case 'pop': { const k = 1 - E.backOut(1 - qo) * 0 - E.quartIn(qo); s.sx *= Math.max(0.001, k); s.sy *= Math.max(0.001, k); s.piv = 'center'; break; }
          case 'slide': { const f = n.p.to ?? (n.p.from === 'left' ? 'right' : 'left'), k = E.quartIn(qo); s.dx += side(f) * dist * 1.4 * k; s.m *= 1 - cl((qo - 0.7) / 0.3); break; }
          case 'lift': s.dy -= 140 * E.quartIn(qo); s.m *= 1 - E.sine(qo); break;
          case 'wipe': s.prof = wipe(1 - E.sine(qo), n.p.dir ?? 'up'); break;
        }
      }
      return s;
    };

    // ---------- drawing ----------
    let curGS = GS;
    const drawNode = (ctx, n, t, m, gs, inScratch) => {
      const s = stateOf(n, t); if (!s) return;
      const g = (k, d) => pv(n, k, t, d);
      const x = g('x', 0) + s.dx + (n.p.ox ? n.p.ox(t) : 0), y = g('y', 0) + s.dy, rot = g('rot', 0), ssx = g('sx', 1) * s.sx, ssy = g('sy', 1) * s.sy;
      n._ex = x;
      ctx.save();
      ctx.translate(x, y);
      if (rot || ssx !== 1 || ssy !== 1) {
        let px = g('px', null), py = g('py', null);
        if (px === null || py === null) { const b = lbox(n, t); const pv2 = s.piv ?? n.p.pivot ?? (n.kind === 'circle' || n.kind === 'arc' || n.kind === 'ellipse' ? 'origin' : 'bottom'); if (pv2 === 'center') { px ??= b[0] + b[2] / 2; py ??= b[1] + b[3] / 2; } else if (pv2 === 'origin') { px ??= 0; py ??= 0; } else { px ??= b[0] + b[2] / 2; py ??= b[1] + b[3]; } }
        ctx.translate(px, py); if (rot) ctx.rotate(rot * DEG); ctx.scale(ssx, ssy); ctx.translate(-px, -py);
      }
      const mm = m * s.m * g('o', 1);
      // within: clip to another shape (a glow inside a cave or a room); above: clip to above a world line (the ground)
      const wn = n.p.within, ab = n.p.above;
      if (wn || ab !== undefined) {
        ctx.save();
        if (wn) { let ox = 0, oy = 0; for (let q = wn; q; q = q.parent) { ox += pv(q, 'x', t, 0); oy += pv(q, 'y', t, 0); } let nx = 0, ny = 0; for (let q = n; q; q = q.parent) { nx += pv(q, 'x', t, 0); ny += pv(q, 'y', t, 0); } ctx.translate(ox - nx - s.dx, oy - ny - s.dy); ctx.clip(pathOf(wn, t)); ctx.translate(-(ox - nx - s.dx), -(oy - ny - s.dy)); }
        if (ab !== undefined) { let ny = 0; for (let q = n; q; q = q.parent) ny += pv(q, 'y', t, 0); ctx.beginPath(); ctx.rect(-1e5, -1e5, 2e5, 1e5 + ab - ny - s.dy); ctx.clip(); }
      }
      if (n.kind === 'group') {
        const zoom = n.p.clip ? g('zoom', 1) : 1, kids = n.kids.slice().sort((p, q) => p.z - q.z || p.ord - q.ord);
        const viaScratch = !inScratch && (s.m < 1 || s.prof) && mm > 0.004 && n.kids.length > 1;
        const tgt = viaScratch ? sx : ctx;
        if (viaScratch) { sx.setTransform(1, 0, 0, 1, 0, 0); sx.clearRect(0, 0, W, H); sx.setTransform(ctx.getTransform()); }
        if (n.p.clip) {   // an inset: a disc of its own colour, the content clipped and magnified, a ring
          const r = g('r', 100);
          tgt.save(); tgt.beginPath(); tgt.arc(0, 0, r, 0, Math.PI * 2); tgt.fillStyle = col(g('bg', 'b3')); tgt.fill(); tgt.clip();
          tgt.scale(zoom, zoom);
          for (const k of kids) drawNode(tgt, k, t, viaScratch ? 1 : mm, gs / zoom, inScratch || viaScratch);
          tgt.restore();
          const rw = g('ringW', 9); if (rw > 0) { tgt.beginPath(); tgt.arc(0, 0, r + rw / 2 - 0.5, 0, Math.PI * 2); tgt.lineWidth = rw; tgt.strokeStyle = col(g('ring', 'b2')); tgt.stroke(); }
        } else for (const k of kids) drawNode(tgt, k, t, viaScratch ? 1 : mm, gs, inScratch || viaScratch);
        if (viaScratch) {
          // the whole group dissolves / wipes as one picture: keep only the dots of the mask
          //   (the mask is drawn on its own canvas and composited over the whole frame: where it has no dots the group is cleared, even when no dot is drawn at all)
          const b = lbox(n, t), pad = 4;
          mkx.setTransform(1, 0, 0, 1, 0, 0); mkx.clearRect(0, 0, W, H); mkx.setTransform(ctx.getTransform());
          mkx.beginPath(); mkx.rect(b[0] - pad, b[1] - pad, b[2] + 2 * pad, b[3] + 2 * pad); mkx.save(); mkx.clip();
          layerFill(mkx, [b[0] - pad, b[1] - pad, b[2] + 2 * pad, b[3] + 2 * pad], { c: '#000000', d: [1, 1], dir: 90 }, cl(mm), s.prof, gs);
          mkx.restore();
          sx.save(); sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'destination-in'; sx.drawImage(maskCv, 0, 0); sx.restore();
          ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(scratch, 0, 0); ctx.restore();
        }
      } else drawShape(ctx, n, t, mm, s.prof, s.draw, gs);
      if (wn || ab !== undefined) ctx.restore();
      ctx.restore();
    };

    // ---------- the ground colour: floods (night, the spotlight beat) ----------
    const floods = [];
    G.flood = (at, tone, o = {}) => { floods.push({ at, dur: o.dur ?? 1.2, tone, how: o.how ?? 'grain', from: o.from ?? [0.5, 0.35] }); floods.sort((a, b) => a.at - b.at); if (o.sfx !== false) F.sfx(at, 'flood', o.gain ?? 0.45, { dur: o.dur ?? 1.2 }); return G; };
    const groundAt = (ctx, t) => {
      let base = C0.paper; const live = [];
      for (const f of floods) { if (t >= f.at + f.dur) base = col(f.tone); else if (t >= f.at) live.push(f); }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
      for (const f of live) {
        const q = E.sine((t - f.at) / f.dur), c = col(f.tone);
        ctx.save();
        if (f.how === 'radial') { const cx = f.from[0] * W, cy = f.from[1] * H, R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)); layerFill(ctx, [0, 0, W, H], { c, d: [1, 0], dir: 'radial', s: [q * 1.05 - 0.12, q * 1.05 + 0.05], at: f.from, r: R }, 1, null, GS * U); }
        else if (f.how === 'up') layerFill(ctx, [0, 0, W, H], { c, d: [0, 1], dir: 90, s: [1 - q * 1.2, 1.2 - q * 1.2] }, 1, null, GS * U);
        else layerFill(ctx, [0, 0, W, H], { c, d: [1, 1], dir: 90 }, q, null, GS * U);
        ctx.restore();
        base = q >= 1 ? c : base;
      }
      return base;
    };
    G.groundAt = (t) => { let b = C0.paper; for (const f of floods) if (t >= f.at + f.dur * 0.5) b = col(f.tone); return b; };

    // ---------- camera ----------
    const keys = [];   // { a, b, view, ease, iris }
    const DEF = { x: 0, y: PT ? -230 : -200, z: 1 };
    const bandOf = () => { const top = H * (PT ? 0.1 : 0.1), bot = H * (PT ? 0.68 : ruler ? 0.74 : 0.83); return { top, bot, cy: (top + bot) / 2, h: bot - top, w: W * (PT ? 0.9 : 0.9) }; };
    const resolve = (v, t) => {
      if (!v) return { ...DEF };
      if (v.on) {
        const list = [].concat(v.on), bs = list.map((x) => (x && x.kind ? wbox(x, Math.max(t, x.at)) : x)).filter(Boolean);
        const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y)), x1 = Math.max(...bs.map((b) => b.x + b.w)), y1 = Math.max(...bs.map((b) => b.y + b.h));
        const pad = v.pad ?? 1.2, B = bandOf(), wk = v.crop ?? (PT && (x1 - x0) > (y1 - y0) * 1.6 ? opt.portraitCrop ?? 1.7 : 1), z = v.z ?? cl(Math.min((B.w * wk) / ((x1 - x0) * pad * U), B.h / ((y1 - y0) * pad * U)), v.zmin ?? 0.3, v.zmax ?? 2.2), k = z * U;   // crop: how far a wide subject may run past the sides (portrait frames by height and lets a street run off the edges)
        return { x: (x0 + x1) / 2 + (v.dx ?? 0), y: (y0 + y1) / 2 - (B.cy - H / 2) / k + (v.dy ?? 0), z };
      }
      return { x: v.x ?? DEF.x, y: v.y ?? DEF.y, z: v.z ?? 1 };
    };
    G.cam = (t, view, ease) => { keys.push({ a: t, b: t, view, ease: ease ?? E.cubicInOut }); keys.sort((p, q) => p.b - q.b); memo.clear(); fromMemo?.clear(); return G; };
    G.move = (a, b, view, ease) => { keys.push({ a, b: Math.max(b, a + 0.05), view, ease: ease ?? E.cubicInOut }); keys.sort((p, q) => p.b - q.b); memo.clear(); fromMemo?.clear(); return G; };
    G.iris = (a, b, view, o = {}) => { keys.push({ a, b, view, ease: E.lin, iris: { from: o.from ?? null, ring: o.ring ?? 'b2' } }); keys.sort((p, q) => p.b - q.b); memo.clear(); fromMemo?.clear(); F.transition(a, b); if (o.sfx !== false) F.sfx(a, 'iris', 0.5, { dur: b - a }); F.appear(b); return G; };
    const DRIFT = opt.drift ?? 0.004;
    const memo = new Map();
    const held = (k, t) => { const v = memo.get(k) ?? memo.set(k, resolve(k.view, k.b)).get(k), dt = Math.max(0, t - k.b), z = v.z * (1 + Math.min(0.05, DRIFT * dt)); return { x: v.x + Math.sin(dt * 0.35) * 3, y: v.y, z }; };
    // the view at t from the keys before index n (a move starts from wherever the earlier keys left the camera)
    const fromMemo = new Map();
    const camAt = (t, n = keys.length) => {
      let last = null, cur = null, ci = -1;
      for (let i = 0; i < n; i++) { const k = keys[i]; if (k.b <= t) last = k; else if (k.a <= t && !cur) { cur = k; ci = i; } }
      if (cur) {
        const from = fromMemo.get(cur) ?? fromMemo.set(cur, ci > 0 ? camAt(cur.a, ci) : { ...DEF }).get(cur);
        if (cur.iris) return from;
        const to = held(cur, cur.b), q = cur.ease(cl((t - cur.a) / (cur.b - cur.a))), z = Math.exp(lerp(Math.log(from.z), Math.log(to.z), q));
        return { x: lerp(from.x, to.x, q), y: lerp(from.y, to.y, q), z };
      }
      return last ? held(last, t) : { ...DEF, z: DEF.z * (1 + Math.min(0.05, DRIFT * t)) };
    };
    const irisAt = (t) => { const k = keys.find((x) => x.iris && t >= x.a && t < x.b); if (!k) return null; const to = held(k, k.b); return { k, to, q: E.cubicInOut((t - k.a) / (k.b - k.a)) }; };
    G.camAt = camAt;

    // ---------- text in the world (DOM: the checks see it) ----------
    const texts = [];
    G.text = (text, o = {}) => {
      const size = o.size ?? 34, tone = o.tone ?? 'b', at = o.at ?? 0, until = o.until ?? 1e9, enter = o.enter ?? (at > 0 ? 'grain' : 'none'), align = o.align ?? 'center';
      const parent = FLAT ? o.layer ?? curLayer : wlA;
      const e = el('div', `left:0;top:0;${FLAT ? 'z-index:2;' : ''}white-space:${o.wrap ? 'normal' : 'nowrap'};${o.wrap ? `width:${o.wrap}px;` : ''}font:${o.weight ?? 700} ${size}px/1.15 ${o.font ?? FONT.sans};color:${col(tone)};letter-spacing:${o.track ?? (/[^\x00-\xff]/.test(text) ? '0.02em' : '0')};text-align:${align};font-variant-numeric:tabular-nums;${o.css ?? ''}`, parent);
      e.textContent = text;
      const T = { e, o, at, until, enter, size, align, text, k: 1 };
      texts.push(T);
      if (o.register !== false) F.text(e, o.kind ?? 'label', o.fact ?? text, enter === 'none' ? at : at - 0.45, until, { noFact: !!o.noFact, chrome: !!o.chrome, overlap: !!o.overlap });   // fact: what the fact check reads (a rolling readout's final value)
      if (o.sfx && at > 0) F.sfx(at - 0.3, o.sfx, 0.3);
      T.set = (s) => { if (e.textContent !== s) e.textContent = s; };
      return T;
    };
    const textPos = (T, t) => { const o = T.o; let x = typeof o.x === 'function' ? o.x(t) : o.x ?? 0, y = typeof o.y === 'function' ? o.y(t) : o.y ?? 0; if (o.on) { const b = wbox(o.on, t), st = stateOf(o.on, t); x += b.x + b.w * (o.ax ?? 0.5) + (st ? st.dx : 0); y += b.y + b.h * (o.ay ?? 0) + (st ? st.dy : 0); } return [x, y]; };
    const textFrame = (t, cam, iris) => {
      for (const T of texts) {
        const o = T.o, on = t >= T.at - (T.enter === 'none' ? 0 : 0.5) && t < T.until;
        set(T.e, { display: on ? '' : 'none' }); if (!on) continue;
        const [x, y] = textPos(T, t);
        const qi = T.enter === 'none' ? 1 : cl((t - (T.at - 0.5)) / 0.5), qo = T.until < 1e8 ? cl((t - (T.until - 0.4)) / 0.4) : 0;
        let dy = 0, mk2 = null, clip = '';
        if (T.enter === 'rise') { dy = (1 - E.quartOut(qi)) * T.size * 0.6; clip = `inset(-20% -10% ${f1((1 - E.quartOut(qi)) * 100)}% -10%)`; }
        if (T.enter === 'type') { const n2 = [...T.text].length, k = Math.round(n2 * cl((frameT(t) - (T.at - 0.5)) / Math.max(0.3, 0.06 * n2))); T.set([...T.text].slice(0, k).join('') || '​'); }
        const mlev = (T.enter === 'grain' && qi < 1 ? Math.round(E.sine(qi) * LV) : LV) - (qo > 0 ? Math.round(E.sine(qo) * LV) : 0);
        if (mlev < LV) mk2 = maskUrl(Math.max(0, mlev));
        const ox = T.align === 'left' ? 0 : T.align === 'right' ? -1 : -0.5;
        set(T.e, { transform: `translate(${f1(x)}px,${f1(y + dy)}px) translate(${ox * 100}%,-50%)`, clipPath: clip, webkitMaskImage: mk2 || '', maskImage: mk2 || '', webkitMaskSize: mk2 ? `${NT * GS}px` : '', maskSize: mk2 ? `${NT * GS}px` : '' });
        if (!FLAT && iris) { const inNew = inView(iris.to, x, y), inOld = inView(cam, x, y); const want = inNew && !inOld ? wlB : wlA; if (T.e.parentElement !== want) want.appendChild(T.e); }
        else if (!FLAT && T.e.parentElement !== wlA) wlA.appendChild(T.e);
      }
    };
    const inView = (v, x, y) => { const k = v.z * U, sx2 = (x - v.x) * k + W / 2, sy2 = (y - v.y) * k + H / 2; return sx2 > -W * 0.1 && sx2 < W * 1.1 && sy2 > -H * 0.1 && sy2 < H * 1.1; };
    const camCss = (v) => { const k = v.z * U; return `matrix(${k.toFixed(5)},0,0,${k.toFixed(5)},${(W / 2 - v.x * k).toFixed(2)},${(H / 2 - v.y * k).toFixed(2)})`; };

    // ---------- primitives ----------
    for (const k of ['rect', 'circle', 'ellipse', 'poly', 'path', 'line', 'arc', 'group']) G[k] = (o = {}) => node(k, o);
    G.swap = (at, a, b, o = {}) => { const d = o.dur ?? 0.7; a.until = at + d * 0.5; a.exit = o.out ?? 'grain'; a.outDur = d; b.at = at + d * 0.5; b.enter = o.in ?? 'grain'; b.inDur = d; if (o.sfx !== false) F.sfx(at - d * 0.3, 'grain', 0.4, { dur: d }); return b; };

    // ---------- props (each a group, base-anchored: x = left or centre as noted, y = the ground under it) ----------
    G.ground = (o = {}) => G.line({ ...o, pts: [[o.from ?? -3000, 0], [o.to ?? 3000, 0]], stroke: o.tone ?? 'a', w: o.w ?? 3, x: 0, y: o.y ?? 0, cap: 'butt', enter: o.enter ?? (o.at > 0 ? 'draw' : 'none'), z: o.z ?? -5 });
    G.hill = (o = {}) => { const w = o.w ?? 420, h = o.h ?? 160, g = G.group({ ...o, x: (o.x ?? 0) - w / 2, y: o.y ?? 0, z: o.z ?? -3 }); g.path({ d: o.flat ? `M0 0 L${w * 0.18} ${-h} L${w * 0.82} ${-h} L${w} 0 Z` : `M0 0 C${w * 0.22} 0 ${w * 0.3} ${-h} ${w / 2} ${-h} C${w * 0.7} ${-h} ${w * 0.78} 0 ${w} 0 Z`, fill: o.tone ?? 'a2', shade: o.shade ?? 'fade' }); return g; };
    G.tree = (o = {}) => {
      const h = o.h ?? 120, g = G.group({ ...o, x: o.x ?? 0, y: o.y ?? 0 }), kind = o.kind ?? 'round', tone = o.tone ?? 'a';
      g.rect({ x: -h * 0.03, y: -h * 0.42, w: h * 0.06, h: h * 0.42, fill: o.trunk ?? 'a0' });
      if (kind === 'cone') g.poly({ pts: [[0, -h], [h * 0.24, -h * 0.28], [-h * 0.24, -h * 0.28]], fill: tone, shade: 'left' });
      else if (kind === 'poplar') g.ellipse({ x: 0, y: -h * 0.62, rx: h * 0.13, ry: h * 0.38, fill: tone, shade: 'left' });
      else g.circle({ x: 0, y: -h * 0.66, r: h * 0.3, fill: tone, shade: 'round' });
      return g;
    };
    G.cloud = (o = {}) => { const w = o.w ?? 160, g = G.group({ ...o, x: o.x ?? 0, y: o.y ?? -400 }), r = w * 0.2; g.path({ d: `M${-w / 2} 0 A${r} ${r} 0 0 1 ${-w * 0.22} ${-r * 1.05} A${r * 1.25} ${r * 1.25} 0 0 1 ${w * 0.18} ${-r * 1.15} A${r} ${r} 0 0 1 ${w / 2} 0 Z`, fill: o.tone ?? 'a3', shade: o.shade ?? 'top' }); return g; };
    G.sun = (o = {}) => G.circle({ ...o, x: o.x ?? 0, y: o.y ?? -260, r: o.r ?? 110, fill: o.tone ?? 'a2', shade: o.shade ?? 'fade', z: o.z ?? -4 });
    G.building = (o = {}) => {
      const w = o.w ?? 160, h = o.h ?? 220, tone = o.tone ?? 'a', g = G.group({ ...o, x: o.x ?? 0, y: o.y ?? 0 }), roof = o.roof ?? 'flat';
      const body = g.rect({ x: 0, y: -h, w, h, fill: tone, shade: o.shade ?? 'top' });
      const rt = o.roofTone ?? 'b';
      if (roof === 'gable') g.poly({ pts: [[-w * 0.06, -h], [w / 2, -h - w * 0.42], [w * 1.06, -h]], fill: rt, shade: 'right' });
      else if (roof === 'saw') { const n = Math.max(2, Math.round(w / 70)), sw = w / n; for (let i = 0; i < n; i++) g.poly({ pts: [[i * sw, -h], [i * sw, -h - sw * 0.55], [(i + 1) * sw, -h]], fill: rt }); }
      else if (roof === 'dome') g.arc({ x: w / 2, y: -h, r: w * 0.32, a0: 180, a1: 360, fill: rt, shade: 'round' });
      else if (roof === 'spire') g.poly({ pts: [[w * 0.15, -h], [w / 2, -h - w * 1.1], [w * 0.85, -h]], fill: rt, shade: 'right' });
      else g.rect({ x: -w * 0.04, y: -h - 10, w: w * 1.08, h: 12, fill: rt });
      if (o.chimney) g.rect({ x: w * 0.7, y: -h - (roof === 'gable' ? w * 0.4 : 40), w: w * 0.09, h: roof === 'gable' ? w * 0.3 : 40, fill: rt, z: -1 });
      const win = o.windows === false ? null : { cols: Math.max(1, Math.round(w / 55)), rows: Math.max(1, Math.round((h - (o.door === false ? 30 : 80)) / 65)), tone: 'a3', ...(o.windows || {}) };
      g.windows = [];
      if (win) {
        const mxg = w * 0.14, top = h * 0.12, bot = o.door === false ? h * 0.1 : Math.min(h * 0.38, 90), cw = (w - mxg * 2) / win.cols, rh = (h - top - bot) / win.rows;
        for (let r = 0; r < win.rows; r++) for (let c = 0; c < win.cols; c++) g.windows.push(g.rect({ x: mxg + c * cw + cw * 0.18, y: -h + top + r * rh + rh * 0.16, w: cw * 0.64, h: rh * 0.66, r: win.round ? cw * 0.32 : 0, fill: win.tone, shade: win.shade ?? 'speckle' }));
      }
      if (o.door !== false) g.door = g.rect({ x: w / 2 - w * 0.11, y: -Math.min(h * 0.3, 70), w: w * 0.22, h: Math.min(h * 0.3, 70), fill: o.doorTone ?? 'b', r: 0 });
      g.body = body;
      return g;
    };
    // people: generic figures — a round head, a block body, stick limbs. Roles, never likenesses
    G.figure = (o = {}) => {
      const h = o.h ?? 120, g = G.group({ ...o, x: o.x ?? 0, y: o.y ?? 0, sx: (o.face === 'left' ? -1 : 1) * (o.sx ?? 1) }), tone = o.tone ?? 'a', pose = o.pose ?? 'stand', limb = o.limb ?? 'b', lw = Math.max(3, h * 0.055);
      const legH = pose === 'sit' ? h * 0.22 : h * 0.4, hip = -legH, bodyH = h * 0.36, sh = hip - bodyH, head = h * 0.11;
      const swing = (ph, amp) => (t) => (o.walk ? Math.sin(t * (o.pace ?? 7) + ph) * amp : 0);
      if (pose === 'sit') { g.line({ pts: [[-h * 0.04, hip], [h * 0.14, hip], [h * 0.14, 0]], stroke: limb, w: lw }); g.line({ pts: [[h * 0.03, hip], [h * 0.2, hip], [h * 0.2, 0]], stroke: limb, w: lw }); }
      else { for (const [ph, dx] of [[0, -h * 0.035], [Math.PI, h * 0.035]]) { const L = g.line({ x: dx, y: hip, pts: [[0, 0], [0, legH]], stroke: limb, w: lw, cap: 'butt' }); L.p.rot = swing(ph, 22); L.p.px = 0; L.p.py = 0; } }
      g.body = g.rect({ x: -h * 0.095, y: sh, w: h * 0.19, h: bodyH + 2, r: h * 0.03, fill: tone, shade: o.shade ?? 'right' });
      const arm = (side, deg) => { const a = g.line({ x: side * h * 0.07, y: sh + h * 0.03, pts: [[0, 0], [0, h * 0.3]], stroke: o.arm ?? tone, w: lw, z: side > 0 ? 1 : -1 }); a.p.px = 0; a.p.py = 0; a.p.rot = typeof deg === 'function' ? deg : (t) => deg + (o.walk ? swing(side > 0 ? Math.PI : 0, 18)(t) : 0); return a; };
      const POSE = { stand: [8, -8], walk: [8, -8], sit: [-40, -30], point: [8, -100], wave: [8, (t) => -150 + Math.sin(t * 6) * 18], work: [(t) => -60 + Math.sin(t * 5) * 22, -50], read: [-70, -70], hold: [-80, 8], cheer: [-160, 160] };
      const [aL, aR] = POSE[pose] ?? POSE.stand; g.armL = arm(-1, aL); g.armR = arm(1, aR);
      g.head = g.circle({ x: 0, y: sh - head * 1.15, r: head, fill: o.head ?? 'skin' });
      if (o.hat === 'top') { g.rect({ x: -head * 0.75, y: sh - head * 3.2, w: head * 1.5, h: head * 1.2, fill: 'b0' }); g.rect({ x: -head * 1.15, y: sh - head * 2.08, w: head * 2.3, h: head * 0.22, fill: 'b0' }); }
      else if (o.hat === 'cap') g.arc({ x: 0, y: sh - head * 1.35, r: head * 1.05, a0: 180, a1: 360, fill: 'b' });
      else if (o.hat === 'hair') g.arc({ x: 0, y: sh - head * 1.2, r: head * 1.04, a0: 170, a1: 370, fill: 'b0' });
      return g;
    };
    G.car = (o = {}) => {
      const w = o.w ?? 200, h = w * 0.36, g = G.group({ ...o, x: o.x ?? 0, y: o.y ?? 0, sx: o.face === 'left' ? -1 : 1 }), tone = o.tone ?? 'a', r = w * 0.11;
      g.path({ d: `M${w * 0.04} ${-r * 0.7} L${w * 0.04} ${-h * 0.62} Q${w * 0.06} ${-h * 0.72} ${w * 0.2} ${-h * 0.72} L${w * 0.3} ${-h * 0.72} L${w * 0.4} ${-h * 1.12} L${w * 0.7} ${-h * 1.12} L${w * 0.82} ${-h * 0.72} L${w * 0.94} ${-h * 0.66} Q${w} ${-h * 0.6} ${w} ${-h * 0.4} L${w} ${-r * 0.7} Z`, fill: tone, shade: 'top' });
      g.poly({ pts: [[w * 0.42, -h * 1.04], [w * 0.55, -h * 1.04], [w * 0.55, -h * 0.76], [w * 0.36, -h * 0.76]], fill: 'b3' });
      g.poly({ pts: [[w * 0.58, -h * 1.04], [w * 0.68, -h * 1.04], [w * 0.77, -h * 0.76], [w * 0.58, -h * 0.76]], fill: 'b3' });
      for (const cx of [w * 0.22, w * 0.78]) { const wh = g.group({ x: cx, y: -r }); wh.circle({ r, fill: 'b0' }); wh.circle({ r: r * 0.42, fill: 'b3' }); wh.rect({ x: -r * 0.08, y: -r * 0.42, w: r * 0.16, h: r * 0.84, fill: 'b0' }); wh.p.rot = (t) => ((g._ex ?? 0) / r) * (180 / Math.PI) * (o.face === 'left' ? -1 : 1); wh.p.pivot = 'origin'; }
      return g;
    };
    G.pole = (o = {}) => { const h = o.h ?? 240, g = G.group({ ...o, x: o.x ?? 0, y: o.y ?? 0 }); g.rect({ x: -4, y: -h, w: 8, h, fill: o.tone ?? 'a' }); if (o.arm !== false) g.rect({ x: -26, y: -h, w: 52, h: 8, fill: o.tone ?? 'a' }); return g; };
    G.wire = (o = {}) => { const [x1, y1] = o.from ?? [0, -240], [x2, y2] = o.to ?? [400, -240], sag = o.sag ?? 40, n = 16, pts = []; for (let i = 0; i <= n; i++) { const q = i / n; pts.push([lerp(x1, x2, q), lerp(y1, y2, q) + sag * 4 * q * (1 - q)]); } return G.line({ ...o, pts, stroke: o.tone ?? 'b', w: o.w ?? 2.5, x: 0, y: 0, enter: o.enter ?? (o.at > 0 ? 'draw' : 'none') }); };
    G.glow = (o = {}) => { const r = o.r ?? 120; return G.circle({ ...o, x: o.x ?? 0, y: o.y ?? -200, r, fill: o.tone ?? 'a3', shade: [{ base: { d: [o.d ?? 0.95, 0], dir: 'radial', s: [o.core ?? 0.15, 1], at: [0.5, 0.5] } }], z: o.z ?? -2, enter: o.enter ?? (o.at > 0 ? 'grain' : 'none') }); };
    G.beam = (o = {}) => { const len = o.len ?? 600, sp = (o.spread ?? 26) * DEG, a = (o.angle ?? 90) * DEG, p1 = [Math.cos(a - sp / 2) * len, Math.sin(a - sp / 2) * len], p2 = [Math.cos(a + sp / 2) * len, Math.sin(a + sp / 2) * len]; return G.poly({ ...o, pts: [[0, 0], p1, p2], fill: o.tone ?? 'paper', shade: [{ base: { d: [o.d ?? 0.95, 0], dir: (o.angle ?? 90), s: [0.1, 1] } }], z: o.z ?? -2 }); };
    G.smoke = (o = {}) => { const g = G.group({ ...o, x: o.x ?? 0, y: o.y ?? -200 }), n = o.n ?? 3; for (let i = 0; i < n; i++) { const c = g.circle({ x: 0, y: 0, r: (o.r ?? 16) * (1 + i * 0.35), fill: o.tone ?? 'a3', shade: 'top' }); c.p.y = (t) => -((t * 26 + i * 30) % 90) - i * 6; c.p.x = (t) => Math.sin(t * 1.3 + i) * 8 + i * 6; } return g; };

    // ---------- information ----------
    // a circular close-up: pops out of the spot it shows (from), its content built in its own coordinates (centre 0,0) and magnified (zoom)
    G.inset = (o = {}) => {
      const r = o.r ?? 150, x = o.x ?? 0, y = o.y ?? -300, at = o.at ?? 0, from = o.from ? (o.from.kind ? (() => { const b = wbox(o.from, at); return [b.x + b.w / 2, b.y + b.h / 2]; })() : o.from) : null;
      const g = G.group({ x, y, r, clip: true, zoom: o.zoom ?? 1, bg: o.bg ?? 'b3', ring: o.ring ?? 'b2', ringW: o.ringW ?? 9, at, until: o.until, enter: 'pop', exit: o.exit ?? 'pop', z: o.z ?? 20, pivot: 'origin', gain: 0.45 });
      if (from) g.p.ox = (t) => { const q = 1 - E.quartOut(cl((t - (at - g.inDur)) / g.inDur)), qo = g.until < 1e8 ? E.quartIn(cl((t - (g.until - g.outDur)) / g.outDur)) : 0; return (from[0] - x) * Math.max(q, qo); };
      if (from) g.keys.y = [[at - g.inDur, at, y, E.quartOut]]; if (from) g.p.y = from[1];
      if (from && g.until < 1e8) g.keys.y.push([g.until - g.outDur, g.until, from[1], E.quartIn]);
      if (o.build) o.build(g);
      g.anchor = from;
      insets.push({ g, at, until: g.until, r, o });
      return g;
    };
    const insets = [];
    // a small diagram card: a navy panel (grain-lit from the top), an inner rule, content drawn in pale line work, a coral tag
    G.card = (o = {}) => {
      const w = o.w ?? 300, h = o.h ?? 200, g = G.group({ x: o.x ?? 0, y: o.y ?? -400, at: o.at ?? 0, until: o.until, enter: o.enter ?? 'pop', exit: o.exit, z: o.z ?? 18, pivot: 'center' });
      g.rect({ x: 0, y: 0, w, h, r: o.radius ?? 6, fill: o.tone ?? 'b', shade: 'top', amount: 0.55 });
      g.rect({ x: 10, y: 10, w: w - 20, h: h - 20, r: 3, fill: null, stroke: o.rule ?? 'b2', w: 2 });
      const inner = g.group({ x: 0, y: 0 });
      if (o.build) o.build(inner, { w, h });
      g.inner = inner; cards.push({ g, o });
      const at = o.at ?? 0;
      if (o.title) G.text(o.title, { x: (o.x ?? 0) + w / 2, y: (o.y ?? -400) + 34, size: o.titleSize ?? 24, tone: 'paper', weight: 700, at, until: o.until, enter: 'grain' });
      if (o.tag) { const tw = units(o.tag) * (o.tagSize ?? 22) + 28, tx = (o.x ?? 0) + w - tw * 0.8, ty = (o.y ?? -400) + h - 18; g.rect({ x: w - tw * 0.8 - (o.x ?? 0) * 0 , y: h - 36, w: tw, h: 38, fill: 'a', rot: -8, pivot: 'center', z: 3 }); G.text(o.tag, { x: tx + tw / 2, y: ty + 2, size: o.tagSize ?? 22, tone: 'paper', weight: 800, at: at + 0.2, until: o.until, enter: 'grain', css: 'transform-origin:50% 50%;rotate:-8deg' }); }
      return g;
    };
    const cards = [];
    // a dial: ticks, a coral needle swinging from → to (values in min..max), optional marks at the ends and a readout under it
    G.gauge = (o = {}) => {
      const r = o.r ?? 70, at = o.at ?? 0, dur = o.dur ?? 1.4, min = o.min ?? 0, max = o.max ?? 1, a0 = o.a0 ?? 140, a1 = o.a1 ?? 400, ang = (v) => lerp(a0, a1, (v - min) / (max - min));
      const g = G.group({ x: o.x ?? 0, y: o.y ?? -300, at: o.show ?? at - 0.6, until: o.until, enter: 'pop', z: o.z ?? 16, pivot: 'center' });
      if (o.pole) g.rect({ x: -5, y: r, w: 10, h: o.pole, fill: 'b', z: -1 });
      g.circle({ r: r + 9, fill: 'b' }); g.circle({ r, fill: 'paper' });
      const n = o.ticks ?? 8; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n) * DEG, l = i % 2 ? 0.12 : 0.2; g.line({ pts: [[Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86], [Math.cos(a) * r * (0.86 - l), Math.sin(a) * r * (0.86 - l)]], stroke: 'b', w: 3 }); }
      if (o.zone) g.arc({ r: r * 0.86, r0: r * 0.72, a0: ang(o.zone[0]), a1: ang(o.zone[1]), fill: 'a2' });
      const nd = g.poly({ pts: [[-r * 0.06, 0], [0, -r * 0.8], [r * 0.06, 0]], fill: 'a', pivot: 'origin' });
      nd.p.rot = (t) => { const q = E.cubicInOut(cl((t - at) / dur)), v = lerp(o.from ?? min, o.to ?? max, q); return ang(v) + 90 + (q > 0 && q < 1 ? Math.sin(t * 40) * 1.2 : 0); };
      g.circle({ r: r * 0.1, fill: 'b' });
      if (o.label) G.text(o.label, { x: (o.x ?? 0), y: (o.y ?? -300) + r * 0.5, size: o.labelSize ?? 18, tone: 'b', weight: 700, at: g.at, until: o.until, enter: 'grain' });
      if (o.value) { const T = G.text(o.value(o.from ?? min), { fact: o.value(o.to ?? max), x: (o.x ?? 0), y: (o.y ?? -300) + r + 40, size: o.valueSize ?? 30, tone: 'a', weight: 800, at: g.at, until: o.until, enter: 'grain' }); F.add((t) => T.set(o.value(lerp(o.from ?? min, o.to ?? max, E.cubicInOut(cl((frameT(t) - at) / dur)))))); }
      F.sfx(at, 'needle', 0.4, { dur });
      return g;
    };
    // a sign board: a title strip, a big number that ticks from → to
    G.sign = (o = {}) => {
      const w = o.w ?? 150, h = o.h ?? 170, x = o.x ?? 0, y = o.y ?? -380, at = o.at ?? 0, dur = o.dur ?? 1.2, show = o.show ?? at - 0.8;
      const g = G.group({ x, y, at: show, until: o.until, enter: o.enter ?? 'rise', z: o.z ?? 15 });
      if (o.pole !== false) g.rect({ x: w / 2 - 5, y: h, w: 10, h: o.pole ?? (-y - h), fill: 'b', z: -1 });
      g.rect({ x: 0, y: 0, w, h, fill: 'b', shade: 'top', amount: 0.45 });
      g.rect({ x: 0, y: 0, w, h: h * 0.24, fill: 'a' });
      if (o.title) G.text(o.title, { x: x + w / 2, y: y + h * 0.12, size: Math.min(h * 0.15, w * 0.8 / Math.max(1, units(o.title))), tone: 'paper', weight: 800, at: show, until: o.until, enter: 'grain' });
      const fmt = o.format ?? ((v) => (o.prefix ?? '') + v.toFixed(o.decimals ?? 0) + (o.unit ?? ''));
      const T = G.text(fmt(o.from ?? 0), { fact: fmt(o.to ?? 0), x: x + w / 2, y: y + h * 0.58, size: o.size ?? Math.min(h * 0.38, (w * 0.86) / Math.max(1, units(fmt(o.to ?? 0)))), tone: 'paper', weight: 800, font: FONT.num, at: show, until: o.until, enter: 'grain' });
      F.add((t) => T.set(fmt(lerp(o.from ?? 0, o.to ?? 0, E.cubicInOut(cl((frameT(t) - at) / dur))))));
      if (o.sub) G.text(o.sub, { x: x + w / 2, y: y + h * 0.86, size: o.subSize ?? Math.min(h * 0.1, 20), tone: 'b3', weight: 600, at: show, until: o.until, enter: 'grain' });
      F.sfx(at, 'roll', 0.4, { dur });
      return g;
    };
    // a clock: a coral wedge for a duration (hours on a 12-hour face) that grows / shrinks from → to, a readout beside it
    G.clock = (o = {}) => {
      const r = o.r ?? 60, at = o.at ?? 0, dur = o.dur ?? 1.4, g = G.group({ x: o.x ?? 0, y: o.y ?? -300, at: o.show ?? at - 0.7, until: o.until, enter: 'pop', z: o.z ?? 16, pivot: 'center' });
      g.circle({ r: r + 8, fill: 'b' }); g.circle({ r, fill: 'paper' });
      const hrs = (t) => lerp(o.from ?? 1, o.to ?? 1, E.cubicInOut(cl((t - at) / dur)));
      const per = o.per ?? 12, dg = 360 / per;   // hours per turn of the face (24: a day dial)
      const wd = g.arc({ r: r * 0.86, a0: -90, a1: (t) => -90 + Math.min(359.9, hrs(t) * dg), fill: 'a' });
      for (let i = 0; i < 12; i++) { const a = (i * 30 - 90) * DEG; g.line({ pts: [[Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9], [Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78]], stroke: 'b', w: i % 3 ? 2 : 4 }); }
      const hand = g.line({ pts: [[0, 0], [0, -r * 0.72]], stroke: 'b', w: 5, pivot: 'origin' }); hand.p.px = 0; hand.p.py = 0; hand.p.rot = (t) => hrs(t) * dg;
      g.circle({ r: r * 0.09, fill: 'b' });
      if (o.label) { const T = G.text(o.label(o.from ?? 1), { fact: o.label(o.to ?? 1), x: (o.x ?? 0) + (o.labelAt ?? [0, r + 40])[0], y: (o.y ?? -300) + (o.labelAt ?? [0, r + 40])[1], size: o.labelSize ?? 28, tone: 'a', weight: 800, at: g.at, until: o.until, enter: 'grain' }); F.add((t) => T.set(o.label(hrs(frameT(t))))); }
      F.sfx(at, 'tick', 0.35, { dur });
      g.wedge = wd;
      return g;
    };
    // rows of repeated things for quantity: n copies built by make(group, i) (or a prop name), entering one after another
    G.row = (o = {}) => {
      const n = o.n ?? 5, gap = o.gap ?? 90, at = o.at ?? 0, every = o.every ?? 0.12, cols = o.cols ?? n, rgap = o.rowGap ?? gap;
      const g = G.group({ x: o.x ?? 0, y: o.y ?? 0, z: o.z ?? 0 }), out = [];
      for (let i = 0; i < n; i++) {
        const c = i % cols, r = Math.floor(i / cols), a2 = at + (o.order === 'random' ? ((i * 7919) % n) / n * every * n : i * every);
        const it = g.group({ x: c * gap, y: r * rgap, at: a2, until: o.until, enter: o.enter ?? 'pop', exit: o.exit, pivot: 'bottom' });
        if (typeof o.make === 'function') o.make(it, i); else if (o.item) G[o.item]({ ...(o.props || {}), ...(typeof o.props === 'function' ? o.props(i) : {}), in: it });
        out.push(it);
      }
      rowsAll.push({ g, at, n, every });
      F.sfx(at, 'pop', 0.35); if (n > 3) F.sfx(at + every * (n - 1), 'pop', 0.3);
      g.items = out;
      return g;
    };
    const rowsAll = [];
    // columns rising from the ground line (lin / log scale), the value ticking up with the top, the label under the line
    G.bars = (o = {}) => {
      const items = o.items ?? [], n = items.length, x0 = o.x ?? 0, y0 = o.y ?? 0, W2 = o.w ?? 600, Hmax = o.h ?? 300, gap = o.gap ?? 0.35, bw = W2 / (n + (n - 1) * gap), every = o.every ?? 0.6, at = o.at ?? 0;
      const vals = items.map((it) => it.value), max = o.max ?? Math.max(...vals), min = o.min ?? Math.min(...vals.filter((v) => v > 0)) / 2;
      const hOf = (v) => (o.scale === 'log' ? Math.max(0.04, Math.log10(v / min) / Math.log10(max / min)) : v / max) * Hmax;
      const g = G.group({ x: 0, y: 0 }), out = [];
      items.forEach((it, i) => {
        const a2 = it.at ?? at + i * every, bx = x0 + i * bw * (1 + gap), h = hOf(it.value), tone = it.tone ?? (it.hot ? 'a' : 'b');
        const c = G.rect({ in: g, x: bx, y: y0 - h, w: bw, h, fill: tone, shade: it.shade ?? 'top', amount: 0.6, at: a2, until: o.until, enter: 'wipe', dir: 'up', inDur: o.grow ?? 0.9 });
        const fmt = it.format ?? ((v) => (o.prefix ?? '') + (v >= 100 || (o.decimals ?? null) === 0 ? Math.round(v).toLocaleString('en-US') : v.toFixed(o.decimals ?? (v < 1 ? 1 : 0))) + (o.unit ?? ''));
        const vt = G.text(it.text ?? fmt(it.value), { x: bx + bw / 2, y: (t) => y0 - h * E.sine(cl((t - (a2 - (o.grow ?? 0.9))) / (o.grow ?? 0.9))) - (o.valueSize ?? 30) * 0.8, size: o.valueSize ?? 30, tone: it.hot ? 'a' : 'b', weight: 800, at: a2, until: o.until, enter: 'grain' });
        if (!it.text && o.roll !== false) F.add((t) => { const q = E.sine(cl((frameT(t) - (a2 - (o.grow ?? 0.9))) / (o.grow ?? 0.9))); vt.set(fmt(o.scale === 'log' ? min * Math.pow(max / min, (hOf(it.value) / Hmax) * q) * (q >= 1 ? it.value / (min * Math.pow(max / min, hOf(it.value) / Hmax)) : 1) : it.value * q)); });
        if (it.label) G.text(it.label, { x: bx + bw / 2, y: y0 + (o.labelSize ?? 24) * 1.1, size: o.labelSize ?? 24, tone: 'b', weight: 600, at: a2 - 0.4, until: o.until, enter: 'grain', wrap: it.wrap });
        out.push({ col: c, text: vt });
      });
      barsAll.push({ g, o });
      g.items = out;
      F.sfx(at, 'fill', 0.35);
      return g;
    };
    const barsAll = [];
    G.number = (o = {}) => {
      const at = o.at ?? 0, dur = o.dur ?? 1.2, fmt = o.format ?? ((v) => (o.prefix ?? '') + (Math.abs(o.to ?? 0) >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(o.decimals ?? 0)) + (o.unit ?? ''));
      const T = G.text(fmt(o.from ?? 0), { ...o, fact: fmt(o.to ?? 0), at: o.show ?? at - 0.5, enter: o.enter ?? 'grain', weight: o.weight ?? 800, tone: o.tone ?? 'a', size: o.size ?? 64, font: FONT.num });
      F.add((t) => T.set(fmt(lerp(o.from ?? 0, o.to ?? 0, E.cubicInOut(cl((frameT(t) - at) / dur))))));
      if (o.sfx !== false) F.sfx(at, 'roll', 0.35, { dur });
      return T;
    };
    // a small coral tag (FREE / 免费): a tilted label pinned on something
    G.tag = (text, o = {}) => {
      const size = o.size ?? 22, w = units(text) * size + size * 1.2, x = o.x ?? 0, y = o.y ?? -300, at = o.at ?? 0;
      const g = G.group({ x, y, at, until: o.until, enter: 'pop', z: o.z ?? 22, rot: o.rot ?? -6, pivot: 'center' }); g.rect({ x: -w / 2, y: -size * 0.85, w, h: size * 1.7, fill: o.tone ?? 'a' });
      G.text(text, { x, y, size, tone: o.ink ?? 'paper', weight: 800, at, until: o.until, enter: 'grain', css: `rotate:${o.rot ?? -6}deg` });
      return g;
    };

    // ---------- the timeline ruler (screen space): ticks, the coral window and marker, the year ticking over; the chapter at its left end ----------
    let ruler = null;
    G.ruler = (o = {}) => { ruler = { from: o.from ?? 1800, to: o.to ?? 2030, step: o.step ?? 2, major: o.major ?? 10, a: o.at ?? 0, b: o.until ?? 1e9, y: o.y ?? (PT ? 0.715 : 0.795), span: o.span ?? 60, keys: [] }; return G; };
    G.year = (at, year, o = {}) => { if (!ruler) G.ruler(); ruler.keys.push({ at, year, dur: o.dur ?? 0.9 }); ruler.keys.sort((a, b) => a.at - b.at); if (o.sfx !== false) F.sfx(at, 'chime', 0.3); return G; };
    const yearAt = (t) => { const ks = ruler.keys; if (!ks.length) return ruler.from; let v = ks[0].year; for (const k of ks) { if (t >= k.at + k.dur) v = k.year; else if (t > k.at) return lerp(v, k.year, E.cubicInOut((t - k.at) / k.dur)); } return v; };
    let rulerText = null, rulerNext = null;
    F.prep(() => {
      if (!ruler || FLAT) return;
      const ys = ruler.keys.map((k) => String(k.year));
      rulerText = el('div', `left:0;top:${f1(ruler.y * H + F.px(PT ? 26 : 30))}px;width:${W}px;text-align:center;font:800 ${f1(F.px(PT ? 40 : 34))}px/1 ${FONT.num};color:${C0.a};font-variant-numeric:tabular-nums;display:none`, hud);
      rulerText.dataset.motion = 'skip';
      F.text(rulerText, 'label', ys[0] ?? '', ruler.a, ruler.b, { chrome: true, overlap: true, noFact: true });
      for (const y of ys) (F.facts ??= []).push(y);
      rulerNext = el('div', `left:0;top:${f1(ruler.y * H + F.px(PT ? 26 : 30))}px;font:700 ${f1(F.px(PT ? 30 : 26))}px/1 ${FONT.num};color:${C0.a2};display:none`, hud); rulerNext.dataset.motion = 'skip';
    });
    const rulerQ = (t) => (!ruler || t < ruler.a || t >= ruler.b ? 0 : E.sine(cl((t - ruler.a) / 0.6)) * (1 - E.sine(cl((t - (ruler.b - 0.5)) / 0.5))));
    const drawRuler = (ctx, t) => {
      if (!ruler || t < ruler.a || t >= ruler.b) { if (rulerText) set(rulerText, { display: 'none' }); if (rulerNext) set(rulerNext, { display: 'none' }); return; }
      const q = rulerQ(t), y = ruler.y * H, cx = W / 2, yr = yearAt(t), pxPerYear = (W * (PT ? 0.9 : 0.8)) / ruler.span;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = q;
      const x0 = W * (PT ? 0.05 : 0.1), x1 = W * (PT ? 0.95 : 0.9);
      ctx.fillStyle = C0.a2; ctx.fillRect(cx - pxPerYear * ruler.step * 2.2, y - F.px(2), pxPerYear * ruler.step * 4.4, F.px(4));
      ctx.fillStyle = C0.b; ctx.strokeStyle = C0.b;
      const first = Math.ceil((yr - ruler.span / 2) / ruler.step) * ruler.step;
      for (let v = first; v <= yr + ruler.span / 2; v += ruler.step) { const x = cx + (v - yr) * pxPerYear; if (x < x0 || x > x1) continue; const maj = Math.round(v) % ruler.major === 0, edge = Math.min((x - x0) / (W * 0.08), (x1 - x) / (W * 0.08), 1); ctx.globalAlpha = q * cl(edge) * (maj ? 0.9 : 0.55); ctx.fillRect(x - F.px(0.75), y - F.px(maj ? 9 : 5), F.px(1.5), F.px(maj ? 9 : 5)); }
      ctx.globalAlpha = q; ctx.fillStyle = C0.a; ctx.beginPath(); ctx.moveTo(cx - F.px(5), y - F.px(16)); ctx.lineTo(cx + F.px(5), y - F.px(16)); ctx.lineTo(cx, y - F.px(10)); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (rulerText) { set(rulerText, { display: '', opacity: q.toFixed(3) }); const ks = ruler.keys, live = ks.find((k) => t > k.at && t < k.at + k.dur); rulerText.textContent = String(Math.round(frameT(t) >= 0 ? yearAt(frameT(t)) : yr)); set(rulerText, { transform: live ? `translateY(${f1(Math.sin(cl((t - live.at) / live.dur) * Math.PI) * -F.px(4))}px)` : 'none' }); }
      if (rulerNext) { const nx = ruler.keys.find((k) => k.at > t && k.at - t < 1.6); if (nx) { const k2 = 1 - (nx.at - t) / 1.6; set(rulerNext, { display: '', opacity: (q * 0.8 * sm(k2 * 2)).toFixed(3), left: f1(cx + (nx.year - yr) * pxPerYear - F.px(30)) + 'px' }); rulerNext.textContent = String(nx.year); } else set(rulerNext, { display: 'none' }); }
    };

    // ---------- the spotlight beat: the ground floods to the spot colour, two cones of paper light fall on the subject ----------
    const spots = [];
    G.spot = (a, b, o = {}) => {
      const tone = o.tone ?? 'a', on = o.on ? (o.on.kind ? wbox(o.on, a) : o.on) : { x: 0, y: -100, w: 0, h: 0 };
      const v = resolve(o.view ?? (o.on ? { on: o.on, pad: o.pad ?? 2.2 } : null), a), k = v.z * U, top = v.y - (H / 2) / k, left = v.x - (W / 2) / k, right = v.x + (W / 2) / k;
      const tx = on.x + on.w / 2, ty = on.y + on.h;
      for (const [sx2, sy2] of [[left + (W / k) * 0.08, top - 20], [right - (W / k) * 0.08, top - 20]].slice(0, o.beams ?? 2)) {
        const ang = Math.atan2(ty - sy2, tx - sx2) / DEG, len = Math.hypot(tx - sx2, ty - sy2) * 1.15;
        G.beam({ x: sx2, y: sy2, angle: ang, spread: o.spread ?? 24, len, tone: o.light ?? 'paper', d: 0.9, at: a + 0.5, until: b, enter: 'grain', exit: 'grain', z: -1, sfx: false });
        G.glow({ x: sx2, y: sy2 + 10, r: 70, tone: o.light ?? 'paper', d: 1, core: 0.35, at: a + 0.4, until: b, sfx: false, z: 0 });
      }
      G.flood(a, tone, { dur: 0.7, how: 'radial', from: [0.5, 0.4], sfx: false }); G.flood(b - 0.6, o.back ?? 'paper', { dur: 0.6, how: 'grain', sfx: false });
      F.sfx(a + 0.3, 'spot', 0.6); F.musicCue(a + 0.4, 'hit');
      spots.push({ a, b });
      return G;
    };

    // ---------- render ----------
    if (!FLAT) {
      F.add((t) => {
        const ir = irisAt(t), cam = camAt(t), ctx = mx;
        groundAt(ctx, t);
        const view = (v, cull) => { const k = v.z * U; ctx.setTransform(k, 0, 0, k, W / 2 - v.x * k, H / 2 - v.y * k); const vx0 = v.x - W / 2 / k, vx1 = v.x + W / 2 / k, vy0 = v.y - H / 2 / k, vy1 = v.y + H / 2 / k; for (const n of roots.slice().sort((p, q) => p.z - q.z || p.ord - q.ord)) { if (n.layer) continue; if (t < n.at - n.inDur || t >= n.until) continue; if (cull) { const b = wbox(n, t); if (b.x > vx1 + 400 || b.x + b.w < vx0 - 400 || b.y > vy1 + 400 || b.y + b.h < vy0 - 400) continue; } drawNode(ctx, n, t, 1, GS, false); } };
        view(cam, true);
        if (ir) {
          const k = ir.k, fp = k.iris.from ? (k.iris.from.kind ? (() => { const b = wbox(k.iris.from, k.a), kk = cam.z * U; return [(b.x + b.w / 2 - cam.x) * kk + W / 2, (b.y + b.h / 2 - cam.y) * kk + H / 2]; })() : [k.iris.from[0] * W, k.iris.from[1] * H]) : [W / 2, H * 0.45];
          const R = Math.hypot(Math.max(fp[0], W - fp[0]), Math.max(fp[1], H - fp[1])) * ir.q;
          ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.arc(fp[0], fp[1], Math.max(0.5, R), 0, Math.PI * 2); ctx.clip();
          groundAt(ctx, t); view(ir.to, true); ctx.restore();
          ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.arc(fp[0], fp[1], Math.max(0.5, R + F.px(5)), 0, Math.PI * 2); ctx.lineWidth = F.px(10) * (1 - ir.q * 0.6); ctx.strokeStyle = col(k.iris.ring); ctx.stroke(); ctx.restore();
          set(wlB, { display: '', transform: camCss(ir.to), clipPath: `circle(${f1(R / (ir.to.z * U))}px at ${f1((fp[0] - (W / 2 - ir.to.x * ir.to.z * U)) / (ir.to.z * U))}px ${f1((fp[1] - (H / 2 - ir.to.y * ir.to.z * U)) / (ir.to.z * U))}px)` });
        } else set(wlB, { display: 'none' });
        set(wlA, { transform: camCss(cam) });
        textFrame(t, cam, ir);
        drawRuler(ctx, t);
      });
    } else {
      // flat (kit.js): each scene layer gets its own canvas in frame px; no camera, no ruler
      const lc = new Map();
      G.layerCanvas = (layer) => { if (!lc.has(layer)) { const c = el('canvas', `left:0;top:0;width:${W}px;height:${H}px;z-index:1;pointer-events:none`, layer); c.width = W; c.height = H; c.dataset.motion = 'skip'; lc.set(layer, c.getContext('2d')); } return lc.get(layer); };
      F.late((t) => {   // after every F.add: the kit has shown / hidden this frame's scene layers by now
        for (const [layer, ctx] of lc) {
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
          if (layer.style.display === 'none') continue;
          for (const n of roots.slice().sort((p, q) => p.z - q.z || p.ord - q.ord)) { if (n.layer !== layer || t < n.at - n.inDur || t >= n.until) continue; ctx.setTransform(1, 0, 0, 1, 0, 0); drawNode(ctx, n, t, 1, GS * U, false); }
        }
        textFrame(t, null, null);
      });
    }

    // captions: navy, no box, a paper halo, low in the frame (portrait above the platform overlay)
    if (!FLAT && F.T && F.voiced && !F.caps && opt.captions !== false) {
      const co = opt.captions || {}, segs = window.EV.captionSegments(F.T, co.max ?? (PT ? 13 : 22)), size = F.px(co.size ?? (PT ? 40 : 38));
      const box = el('div', `left:0;right:0;top:${co.top ?? (PT ? H * 0.775 : H * 0.885)}px;text-align:center;z-index:880;pointer-events:none;display:none`, F.stage);
      const sp = el('span', `position:relative;display:inline-block;max-width:${W * 0.84}px;color:${C0.b0};font:600 ${f1(size)}px/1.35 ${FONT.sans};letter-spacing:.02em;text-shadow:0 0 ${F.px(8)}px ${C0.paper},0 0 ${F.px(4)}px ${C0.paper},0 0 ${F.px(2)}px ${C0.paper}`, box);
      F.add((t) => { const c = segs.find((x) => t >= x.start && t < x.end); set(box, { display: c ? '' : 'none' }); if (c && sp.textContent !== c.text) sp.textContent = c.text; const night = G.groundAt(t) !== C0.paper && G.groundAt(t) !== C0.white; set(sp, { color: night ? C0.paper : C0.b0, textShadow: night ? `0 0 ${F.px(8)}px ${G.groundAt(t)},0 0 ${F.px(3)}px ${G.groundAt(t)}` : `0 0 ${F.px(8)}px ${C0.paper},0 0 ${F.px(4)}px ${C0.paper},0 0 ${F.px(2)}px ${C0.paper}` }); });
      for (const c of segs) { F.appear(c.start); F.appear(c.end); }
      F.caps = segs;
    }
    // the chapter name: small caps at the ruler's left end, shown with the ruler (a film without a ruler: top left). Never alone where the ruler is missing
    if (!FLAT && opt.chapters !== false) F.prep(() => {
      const CH = (F.T && F.T.chapters) || []; if (!CH.length) return;
      const e = el('div', `left:${f1(W * (PT ? 0.06 : 0.1))}px;top:${f1(ruler ? ruler.y * H + F.px(PT ? 30 : 34) : H * 0.06)}px;font:700 ${f1(F.px(PT ? 22 : 20))}px/1 ${FONT.sans};letter-spacing:.14em;color:${C0.b};opacity:.8;white-space:nowrap`, hud); e.dataset.motion = 'skip';
      const spans = CH.map((c, i) => { const s = el('span', 'position:relative;display:none', e); s.textContent = c.title; F.text(s, 'label', c.title, i ? c.start : 0, i === CH.length - 1 ? F.duration : CH[i + 1].start, { noFact: true, chrome: true, overlap: true }); return s; });
      F.add((t) => { let k = 0; CH.forEach((c, i) => { if (t >= c.start) k = i; }); spans.forEach((s, i) => set(s, { display: i === k ? '' : 'none' })); const night = G.groundAt(t) !== C0.paper, rq = ruler ? rulerQ(t) : 1; set(e, { color: night ? C0.paper : C0.b, display: rq > 0.01 ? '' : 'none', opacity: (0.8 * rq).toFixed(3) }); });
    });

    // ---------- checks ----------
    F.addLint(() => {
      const out = [], add = (t, what, msg) => out.push({ level: 'warn', t: Math.round(t * 10) / 10, src: '', what, msg });
      if (FLAT) { if (raw.size > 2) add(0, M('颜色越界', 'off-palette colours'), M(`用了 ${raw.size} 个调色板以外的颜色：这个风格只有两种专色加它们的浅色 / 深色`, `${raw.size} colours outside the palette: the style has two spot colours with their tints and shades`)); return out; }   // the common interface cuts between its own layers
      // shapes switched on: a top-level shape that appears mid-film with no entrance (not under an iris)
      const covered = (t) => keys.some((k) => k.iris && t >= k.a - 0.05 && t <= k.b + 0.05) || floods.some((f) => t >= f.at && t <= f.at + f.dur);
      const pops = roots.filter((n) => n.at > 0.3 && n.enter === 'none' && !covered(n.at) && !n.p.lintOk);
      if (pops.length) add(pops[0].at, M('形状硬出现', 'shape switched on'), M(`${pops.length} 个形状在片中直接出现，没有入场（第一个在 ${pops[0].at.toFixed(1)} 秒）：给它 enter: 'grain'（颗粒浮现）/ 'rise' / 'pop' / 'wipe'`, `${pops.length} shapes appear mid-film with no entrance (the first at ${pops[0].at.toFixed(1)} s): give them enter: 'grain' (stipple in) / 'rise' / 'pop' / 'wipe'`));
      // the same entrance over and over
      const ent = roots.filter((n) => n.at > 0.3 && n.enter !== 'none' && !n.layer).sort((a, b) => a.at - b.at);
      for (let i = 0; i < ent.length;) { let j = i; while (j + 1 < ent.length && ent[j + 1].enter === ent[i].enter && ent[j + 1].at - ent[j].at < 4) j++; if (j - i + 1 >= 7 && ent[j].at - ent[i].at > 3) { add(ent[i].at, M('入场单一', 'same entrance'), M(`${ent[i].at.toFixed(1)}–${ent[j].at.toFixed(1)} 秒连续 ${j - i + 1} 个东西都用 '${ent[i].enter}' 入场：换着用颗粒浮现、长高、弹出、滑入、颗粒擦入，或者让场景原地生长 / 变形（G.swap、node.to）`, `${ent[i].at.toFixed(1)}–${ent[j].at.toFixed(1)} s: ${j - i + 1} things in a row enter with '${ent[i].enter}': vary grain / rise / pop / slide / wipe, or let the scene grow and transform in place (G.swap, node.to)`)); } i = j + 1; }
      // colours: two spot colours and their tints; hex colours outside the palette break the look
      if (raw.size > 2) add(0, M('颜色越界', 'off-palette colours'), M(`用了 ${raw.size} 个调色板以外的颜色（${[...raw].slice(0, 5).join(' ')}）：这个风格只有两种专色加它们的浅色 / 深色，用色名 a / a2 / a3 / a0 / b / b2 / b3 / b0`, `${raw.size} colours outside the palette (${[...raw].slice(0, 5).join(' ')}): the style has two spot colours with their tints and shades; use the tone names a / a2 / a3 / a0 / b / b2 / b3 / b0`));
      // camera: grain blown up, too fast, parked
      for (const k of keys) { const v = memo.get(k) ?? resolve(k.view, k.b); if (v.z > 2.3) { add(k.b, M('颗粒放大', 'grain blown up'), M(`${k.b.toFixed(1)} 秒镜头推到 ${v.z.toFixed(1)} 倍：颗粒跟着放大成色块。细节用 G.inset（圆形特写，颗粒保持原大）`, `At ${k.b.toFixed(1)} s the camera is at ${v.z.toFixed(1)}×: the grain grows into blobs. Show details with G.inset (a circular close-up keeps the grain size)`)); break; } }
      let fast = null, peak = 0;
      for (let t = 0; t < F.duration; t += 1 / 15) { if (irisAt(t) || irisAt(t + 1 / 15)) { fast = null; continue; } const a = camAt(t), b = camAt(t + 1 / 15), sp = (Math.hypot(b.x - a.x, b.y - a.y) * a.z * U) / Math.max(W, H) * 15, zs = Math.abs(Math.log(b.z / a.z)) * 15; if (sp > 1.6 || zs > 1.4) { fast ??= t; peak = Math.max(peak, sp); } else if (fast != null) { add(fast, M('镜头太快', 'camera too fast'), M(`${fast.toFixed(1)}–${t.toFixed(1)} 秒镜头每秒移过约 ${peak.toFixed(1)} 个画面（长边）：这个风格的镜头是稳的舞台，远处换场用 G.iris（圆形转场）`, `${fast.toFixed(1)}–${t.toFixed(1)} s the camera crosses about ${peak.toFixed(1)} frames (long side) a second: this style's camera is a steady stage; go far with G.iris (the circle transition)`)); fast = null; peak = 0; } }
      const evts = [...keys.flatMap((k) => [k.a, k.b]), ...roots.flatMap((n) => [n.at, n.until]), ...floods.map((f) => f.at)].filter((x) => x > 0 && x < F.duration).sort((a, b) => a - b), vEnd = F.T && F.T.lines ? Math.max(...F.T.lines.map((l) => l.end || 0)) : F.duration;
      for (let i = 1; i < evts.length; i++) if (evts[i] - evts[i - 1] > 7 && evts[i - 1] < vEnd) { add(evts[i - 1], M('画面停太久', 'nothing happens'), M(`${evts[i - 1].toFixed(1)}–${evts[i].toFixed(1)} 秒画面上没有新东西（只有镜头呼吸）：让场景长出下一件东西、开一个圆形特写，或者推近`, `${evts[i - 1].toFixed(1)}–${evts[i].toFixed(1)} s nothing new happens (only the camera breathing): grow the next thing, open an inset, or push in`)); break; }
      // irises are chapter turns: about one every 12 s at most
      const ir = keys.filter((k) => k.iris); if (ir.length > Math.max(2, F.duration / 12)) add(ir[0].a, M('圆形转场太多', 'too many irises'), M(`用了 ${ir.length} 次圆形转场：它是换章节用的，大约 12 秒最多一次；章内让场景原地生长、变形，镜头推拉`, `${ir.length} irises: they turn chapters, about one every 12 s at most; within a chapter let the scene grow and transform while the camera pushes and pulls`));
      // insets and cards with nothing inside
      for (const s of insets) if (!s.g.kids.length) add(s.at, M('空的特写圈', 'empty inset'), M(`${s.at.toFixed(1)} 秒的圆形特写里什么都没画：用 build: (g) => { … } 画出放大的细节`, `The inset at ${s.at.toFixed(1)} s is empty: draw the magnified detail with build: (g) => { … }`));
      for (const c of cards) if (!c.g.inner.kids.length && !c.o.title) add(c.g.at, M('空卡片', 'empty card'), M(`${c.g.at.toFixed(1)} 秒的图解卡片是空的：用 build 画图、给 title`, `The card at ${c.g.at.toFixed(1)} s is empty: draw its diagram with build and give it a title`));
      // very little text: count registered world text on screen together
      let worst = null;
      for (let t = 0.25; t < F.duration; t += 0.5) { const v = FLAT ? null : camAt(t), n = texts.filter((T) => { if (T.o.chrome || t < T.at || t >= T.until || T.o.register === false) return false; if (!v) return true; const [x, y] = textPos(T, t); return inView(v, x, y) && Math.abs((x - v.x) * v.z * U) < W * 0.5 && Math.abs((y - v.y) * v.z * U) < H * 0.5; }).length; if (n > (opt.maxText ?? 7) && (!worst || n > worst.n)) worst = { t, n }; }
      if (worst) add(worst.t, M('字太多', 'too much text'), M(`${worst.t.toFixed(1)} 秒画面上同时有 ${worst.n} 段字：这个风格几乎不用字（年份、招牌、读数），把信息画出来——一排东西、仪表、圆形特写`, `At ${worst.t.toFixed(1)} s there are ${worst.n} pieces of text on screen: this style uses very little text (years, signs, readouts); draw the information — a row of things, a dial, an inset`));
      // insets landing on the captions / ruler band
      if (!FLAT) for (const s of insets) { const t = Math.min(F.duration - 0.05, s.at + 0.2), v = camAt(t), k = v.z * U, cy = (pv(s.g, 'y', t, 0) - v.y) * k + H / 2, r = s.r * k; if (cy + r > H * (PT ? 0.76 : ruler ? 0.78 : 0.86)) add(s.at, M('压住标尺 / 字幕', 'over the ruler / captions'), M(`${s.at.toFixed(1)} 秒的圆形特写下沿压到了标尺 / 字幕区：往上放，或者缩小 r`, `The inset at ${s.at.toFixed(1)} s reaches into the ruler / caption band: move it up or make r smaller`)); }
      return out;
    });

    G.roots = roots;
    // the information components register themselves when called (F.info: --check's density check)
    return P.infoKit ? P.infoKit(G, { inset: 'annotate', card: 'diagram', gauge: 'chart', sign: 'mark', clock: 'chart', row: 'chart', bars: 'chart', number: 'mark', tag: 'mark', spot: 'mark', figure: 'figure' }) : G;
  };
})();
