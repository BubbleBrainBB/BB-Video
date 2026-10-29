// storybook.js: the hand-drawn storybook mascot (手绘绘本吉祥物) style, one of bb-video's visual styles (style notes in styles/storybook/STYLE.md). Load after promo.js.
// One frame: warm light-grey paper with fibres; everything is drawn with ink outlines that wobble a little (seeded, they never boil), filled flat
// and shaded with coloured-pencil hatching and a soft rim (darker along the right and bottom, a light streak top-left). One strong accent colour
// for the cast; props in cream, beige and wood. A project defines its own cast of small cute characters (bean / round / blob / gem / star /
// capsule / pillar bodies, dot or ^ ^ eyes, blush, a sprout or antenna) that act an invisible process out with tangible props on a little
// stage platform on one long ground line: filing cabinets with tab labels, an easel with a sheet, a monitor with log lines, a big push button,
// stacking blocks, signpost cards, paper planes, check cards. Small dark monospace tags float above characters with a ✓ result line under them.
// The telling: one character splits into clones that each carry a task card, each acts its task out on its own stage, they regroup and merge
// back into one, and the results pop out as props. The camera travels along the ground line from stage to stage and pushes in.
//
//   const B = PROMO.storybook(F, { palette: 'teal' | 'cobalt' | 'plum' | 'leaf', colors, wobble: 1, hatch: 1, drift, captions, chapters, maxText, seed })
//   World units: 1 unit = 1 px of a 1080-high frame at zoom 1 (portrait: 1080 wide). y grows downward; the ground line is y = 0 (things stand at y ≤ 0).
//   TONES   'a' accent · 'a2' light accent · 'a0' deep accent · 'b' second colour (the other side) · 'b2' · 'b0' · 'paper' · 'ink' · 'cream' · 'beige'
//           'sand' · 'wood' · 'red' · 'green' · 'screen' · 'white' · 'grey' · 'pink'   (or any css hex: more than two outside the palette are flagged)
//   SHAPES  B.rect / B.circle / B.ellipse / B.poly / B.path / B.line / B.blob / B.text (each { x, y, …, fill, stroke, lw, hatch, rim, gloss, at, until,
//           enter, exit, z, in: group })   B.group(o) → node with .rect / .circle / … children   node.to(at, { x, y, rot, sx, sy, fill, alpha… }, dur, ease)
//           enter: 'pop' | 'drop' | 'rise' | 'slide' (from) | 'grow' | 'draw' (the outline draws on, then the fill) | 'fade' | 'none'
//           exit: { at, to: 'pop' | 'sink' | 'fade' | 'slide' | 'lift' }
//   CAST    B.cast({ Name: { kind, tone, … } })   B.char('Name', { x, at, enter, … }) → c   c.go / c.hop / c.jump / c.act / c.face / c.look / c.carry / c.say / c.to
//           B.split(at, c, targets) → clones   B.merge(at, clones, c)   B.puff  B.ticks  B.sparkle
//   PROPS   B.ground  B.stage  B.cabinet  B.easel  B.monitor  B.button  B.blocks  B.sign  B.plane  B.papers  B.cards  B.bell  B.thermo  B.poster  B.house  B.box  B.shadow
//   TEXT    B.tag(text, { on, at, until, sub, subAt })  dark monospace tag (DOM)   B.title(text, { x, y, size, at, enter: 'write' | 'pop' })  B.text (drawn on paper)
//   CAMERA  B.cam(t, view)  B.move(a, b, view, ease)  view = { x, y, z } | { on: node | [nodes] | box, pad, dx, dy, z }   B.L(landscape, portrait)
// Sounds the runtime emits (styles/storybook/sound.js): pop, drop, rise, slide, draw, hop, jump, squash, split, merge, tag, type, ding, plane, drawer,
//   clack, press, bell, flip, chomp, paper, swish.
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('storybook.js 要在 promo.js 之后加载', 'storybook.js must load after promo.js'));
  const { E, set, el, frameT } = P;
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, q) => a + (b - a) * q;
  const DEG = Math.PI / 180;
  const f1 = (n) => Math.round(n * 10) / 10;
  const hex = (h) => { const s = String(h).replace('#', ''); return s.length === 3 ? s.split('').map((c) => parseInt(c + c, 16)) : [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
  const toHex = (v) => '#' + v.map((x) => Math.round(cl(x, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mixHex = (a, b, q) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => lerp(v, y[i], q))); };
  const units = (t) => { t = String(t ?? ''); return (t.match(/[^\x00-\xff]/g) || []).length + t.replace(/[^\x00-\xff]/g, '').length * 0.56; };
  const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rngOf = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const backIn = (q) => { const c = 1.7; return (c + 1) * q * q * q - c * q * q; };
  const bump = (q) => (q <= 0 || q >= 1 ? 0 : Math.sin(Math.PI * q));

  // the paper, the ink and the props are the same in every palette; the palette sets the cast's accent (a) and the other side (b)
  const BASE = { paper: '#e9e6df', ink: '#2b2521', cream: '#f4ecd9', beige: '#e3d2ae', sand: '#c8ae86', wood: '#b38957', red: '#cc5040', green: '#4e9a4a', screen: '#26221f', white: '#fbf8f1', grey: '#a19a8e', pink: '#eb9e8d' };
  const PALS = {
    teal: { a: '#2f8d89', a2: '#9ccfc6', a0: '#1d5e5b', b: '#a6b23b', b2: '#d8dea2', b0: '#6b7a20' },
    cobalt: { a: '#3e68b5', a2: '#a9bfe6', a0: '#28457e', b: '#e0923a', b2: '#f2cd99', b0: '#a6621e' },
    plum: { a: '#8b4f8e', a2: '#d4b1d4', a0: '#5e3160', b: '#d8a532', b2: '#efd894', b0: '#997114' },
    leaf: { a: '#5a993f', a2: '#bddba6', a0: '#3c6b27', b: '#c55b86', b2: '#ecb7cb', b0: '#8d3a5c' },
  };
  const FONTS = { hand: '"LXGW WenKai", "Noto Sans SC", "PingFang SC", serif', mono: '"LXGW WenKai Mono", "LXGW WenKai", "Noto Sans SC", monospace', sans: '"Noto Sans SC", "PingFang SC", sans-serif' };

  // ---------- coloured-pencil hatching tiles (seeded, drawn once per colour) ----------
  const HT = 180, HS = 2;   // tile size in world units, pixels per unit in the tile
  const hatchTile = (color, kind, seed) => {
    const c = document.createElement('canvas'); c.width = c.height = HT * HS; const x = c.getContext('2d'), r = rngOf(seed);
    x.scale(HS, HS); x.lineCap = 'round'; x.strokeStyle = color;
    const n = kind === 'light' ? 90 : kind === 'shadow' ? 260 : kind === 'band' ? 300 : 230, base = kind === 'shadow' ? -38 : -60;
    const stroke = (px, py, a, len, bend) => { const dx = Math.cos(a) * len, dy = Math.sin(a) * len; for (const ox of [-HT, 0, HT]) for (const oy of [-HT, 0, HT]) { x.beginPath(); x.moveTo(px + ox, py + oy); x.quadraticCurveTo(px + ox + dx / 2 - (dy * bend) / len, py + oy + dy / 2 + (dx * bend) / len, px + ox + dx, py + oy + dy); x.stroke(); } };
    for (let i = 0; i < n; i++) {   // short pencil strokes, a little curved, pressure varying
      x.globalAlpha = kind === 'light' ? 0.3 + r() * 0.4 : 0.14 + r() * 0.36; x.lineWidth = 0.55 + r() * 0.75;
      stroke(r() * HT, r() * HT, (base + (r() - 0.5) * 22) * DEG, 5 + r() * (kind === 'light' ? 16 : 15), (r() - 0.5) * 2.4);
    }
    if (kind === 'band' || kind === 'shadow' || kind === 'dark') for (let i = 0; i < n * (kind === 'dark' ? 0.18 : 0.6); i++) {   // a second layer across the first: cross-hatching where it is darker
      x.globalAlpha = 0.12 + r() * 0.3; x.lineWidth = 0.5 + r() * 0.6;
      stroke(r() * HT, r() * HT, (base + 78 + (r() - 0.5) * 18) * DEG, 4 + r() * 11, (r() - 0.5) * 1.6);
    }
    return c;
  };
  // the paper: warm light grey, faint mottling, fibres and a few specks (screen-fixed, drawn once)
  const paperTile = (bg, ink, size, seed) => {
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), r = rngOf(seed), k = size / 512;
    x.fillStyle = bg; x.fillRect(0, 0, size, size);
    for (let i = 0; i < 26; i++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); const lt = r() < 0.5; g.addColorStop(0, lt ? 'rgba(255,255,255,0.025)' : 'rgba(120,100,80,0.016)'); g.addColorStop(1, 'rgba(0,0,0,0)'); const px = r() * size, py = r() * size, rr = (40 + r() * 110) * k; for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) { x.save(); x.translate(px + ox, py + oy); x.scale(rr, rr); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, Math.PI * 2); x.fill(); x.restore(); } }
    x.lineCap = 'round';
    for (let i = 0; i < 240; i++) {
      const px = r() * size, py = r() * size, a = r() * Math.PI * 2, len = (4 + r() * 14) * k, lt = r() < 0.3;
      x.strokeStyle = lt ? 'rgba(255,255,255,0.32)' : `rgba(90,78,64,${0.08 + r() * 0.16})`; x.lineWidth = (0.5 + r() * 0.7) * k;
      for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) { x.beginPath(); x.moveTo(px + ox, py + oy); x.quadraticCurveTo(px + ox + Math.cos(a + 0.6) * len * 0.6, py + oy + Math.sin(a + 0.6) * len * 0.6, px + ox + Math.cos(a) * len, py + oy + Math.sin(a) * len); x.stroke(); }
    }
    for (let i = 0; i < 110; i++) { x.fillStyle = `rgba(60,50,42,${0.2 + r() * 0.45})`; x.beginPath(); x.arc(r() * size, r() * size, (0.5 + r() * 0.9) * k, 0, Math.PI * 2); x.fill(); }
    return c;
  };

  P.storybook = function (F, opt = {}) {
    const W = F.W, H = F.H, PT = F.portrait, U = F.px(1), FLAT = !!opt.flat, K0 = 1;   // flat mode (kit.js): world units too, drawn at U px each on the scene layer
    const C0 = { ...BASE, ...(PALS[opt.palette] || PALS.teal), ...(opt.colors || {}) };
    for (const r of ['a', 'b']) if (opt.colors && opt.colors[r]) { const c = opt.colors[r]; C0[r + '2'] = opt.colors[r + '2'] ?? mixHex(c, '#ffffff', 0.55); C0[r + '0'] = opt.colors[r + '0'] ?? mixHex(c, '#000000', 0.32); }
    const FONT = { ...FONTS, ...(opt.fonts || {}) };
    const SEED = hash(opt.seed ?? 'storybook');
    const B = { F, colors: C0, fonts: FONT, portrait: PT, L: (land, port) => (PT && port !== undefined ? port : land) };
    const WOB = 1.6 * (opt.wobble ?? 1), HATCH = opt.hatch ?? 1, LW = 4.2;
    const raw = new Set(), derived = new Set();
    const col = (c, d) => { if (c == null || c === false) return d == null ? null : col(d); if (C0[c]) return C0[c]; if (/^#/.test(c)) { if (!Object.values(C0).includes(c.toLowerCase()) && !derived.has(c)) raw.add(c.toLowerCase()); return c; } return c; };
    const mixD = (a, b, q) => { const m = mixHex(a, b, q); derived.add(m); return m; };
    const rimOf = (c) => mixHex(col(c), C0.ink, 0.3);
    const hiOf = (c) => mixHex(col(c), '#ffffff', 0.42);
    B.col = col;

    // ---------- layers: the paper (CSS, screen-fixed), the world canvas, world text (DOM, follows the camera), the HUD ----------
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const ptile = paperTile(C0.paper, C0.ink, Math.round(512 * Math.max(1, U)), SEED);
    let main = null, mx = null, wl = null, hud = null, purl = null;
    B.paperCss = () => `${C0.paper} url(${(purl ??= ptile.toDataURL('image/png'))}) 0 0 / ${f1(512 * Math.max(1, U))}px`;
    if (!FLAT) {
      F.stage.style.background = C0.paper;
      const pl = el('div', `inset:0;z-index:1;pointer-events:none;background:${B.paperCss()}`, F.stage); pl.dataset.motion = 'skip';   // the paper on its own layer: the page's theme sets the stage background too
      main = el('canvas', `left:0;top:0;width:${W}px;height:${H}px;z-index:5`, F.stage); main.width = W; main.height = H; mx = main.getContext('2d');
      main.dataset.motion = 'skip';
      wl = el('div', 'left:0;top:0;width:0;height:0;z-index:10;transform-origin:0 0;pointer-events:none', F.stage); wl.dataset.motion = 'texture';
      hud = el('div', 'inset:0;z-index:30;pointer-events:none', F.stage);
    }
    // canvas text has no DOM: its characters go into a hidden probe so the page's font loader fetches their glyphs
    const probe = el('div', `left:0;top:0;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;font-family:${FONT.mono}`, F.stage); probe.dataset.motion = 'skip';
    const probeH = el('span', `font-family:${FONT.hand}`, probe), probeM = el('span', `font-family:${FONT.mono};font-weight:700`, probe), probeR = el('span', `font-family:${FONT.mono};font-weight:400`, probe);
    const probeText = (s, font) => { const e = font === 'hand' ? probeH : /700|800|900/.test(String(font)) ? probeM : probeR; e.textContent += s; probeM.textContent += font === 'mono' ? s : ''; };

    const pats = new Map();
    const pat = (ctx, color, kind) => { const k = color + '|' + kind; let p = pats.get(k); if (!p) { p = ctx.createPattern(hatchTile(color, kind, SEED ^ hash(k)), 'repeat'); p.setTransform(new DOMMatrix().scale(1 / HS, 1 / HS)); pats.set(k, p); } return p; };

    // ---------- nodes ----------
    const roots = [];
    let seq = 0, curLayer = null;
    B.into = (layer, fn) => { const prev = curLayer; curLayer = layer; if (layer && B.layerCanvas) B.layerCanvas(layer); try { return fn(); } finally { curLayer = prev; } };
    const IN = { pop: 0.5, drop: 0.7, rise: 0.55, slide: 0.85, fade: 0.4, draw: 0.9, grow: 0.5, none: 0 };
    const OUT = { pop: 0.35, sink: 0.45, fade: 0.4, slide: 0.75, lift: 0.5, merge: 0.22, none: 0 };
    const SND = { pop: 'pop', drop: 'drop', rise: 'rise', slide: 'slide', draw: 'draw', grow: 'pop' };
    const sounds = [];
    const node = (kind, o = {}) => {
      const n = { id: ++seq, kind, p: o, kids: [], keys: {}, parent: o.in || null, z: o.z ?? 0, layer: o.layer || (o.in ? null : curLayer), seed: SEED ^ hash(kind + ':' + seq) };
      n.at = o.at ?? (n.parent ? -1 : 0); n.until = o.until ?? 1e9;
      n.enter = o.enter ?? (n.parent || n.at <= 0 ? 'none' : 'pop');
      n.inDur = o.inDur ?? IN[n.enter] ?? 0.5;
      const ex = o.exit ? (typeof o.exit === 'string' ? { to: o.exit } : o.exit) : null;
      n.exit = ex ? ex.to ?? 'pop' : 'pop'; if (ex && ex.at !== undefined) n.until = ex.at;
      n.outDur = (ex && ex.dur) ?? OUT[n.exit] ?? 0.4;
      n.ord = seq;
      if (n.parent) { n.parent.kids.push(n); n.layer ??= n.parent.layer; } else roots.push(n);
      for (const k of ['rect', 'circle', 'ellipse', 'poly', 'path', 'line', 'blob', 'group']) n[k] = (o2 = {}) => B[k]({ ...o2, in: n });
      n.text = (s2, o2 = {}) => B.text(s2, { ...o2, in: n });
      n.add = (fn) => { fn(n); return n; };
      n.to = (at, props, dur = 0.6, ease = E.cubicInOut) => { for (const k in props) { (n.keys[k] ??= []).push([at, at + dur, props[k], ease]); n.keys[k].sort((p, q) => p[0] - q[0]); } (n.changes ??= []).push(at); n.cache = null; return n; };
      n.show = (at, until, enter, exit) => { n.at = at; if (until !== undefined) n.until = until; if (enter) { n.enter = enter; n.inDur = IN[enter] ?? 0.5; } if (exit) { n.exit = exit; n.outDur = OUT[exit] ?? 0.4; } return n; };
      n.bbox = (t) => wbox(n, t ?? Math.max(0, n.at));
      if (!n.parent && o.sfx !== false && n.at > 0 && SND[n.enter]) sounds.push([n, 'in']);
      if (!n.parent && o.sfx !== false && n.until < 1e8 && n.exit !== 'none' && n.exit !== 'merge') sounds.push([n, 'out']);
      return n;
    };
    F.prep(() => { for (const [n, w] of sounds) { if (w === 'in') F.sfx(Math.max(0, n.at), SND[n.enter], n.p.gain ?? 0.4, { dur: n.inDur }); else F.sfx(Math.max(0, n.until - n.outDur), n.exit === 'slide' ? 'slide' : 'pop', 0.22, { dur: n.outDur }); } });
    const isNum = (v) => typeof v === 'number';
    const isCol = (v) => typeof v === 'string' && (v[0] === '#' || C0[v] !== undefined);
    // a parameter at t: a constant, a function of t, then keyed changes (.to) on top; colours mix
    const pv = (n, k, t, d) => {
      let v = n.p[k]; if (typeof v === 'function') v = v(t, n); if (v === undefined) v = d;
      const ks = n.keys[k]; if (!ks) return v;
      for (const [a, b, to, e] of ks) { if (t <= a) break; const q = e(cl((t - a) / Math.max(1e-6, b - a))), tv = typeof to === 'function' ? to(t, n) : to; v = isNum(v) && isNum(tv) ? lerp(v, tv, q) : isCol(v) && isCol(tv) ? (q >= 1 ? tv : mixD(col(v), col(tv), q)) : q >= 1 ? tv : v; }
      return v;
    };
    B.pv = pv;

    // ---------- geometry: every outline is sampled into points, then wobbled along its normals by a seeded, smooth offset ----------
    const svgM = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svgM.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden'; document.body.appendChild(svgM);
    const svgP = document.createElementNS('http://www.w3.org/2000/svg', 'path'); svgM.appendChild(svgP);
    const pathPts = new Map();
    const sampleD = (d) => { if (pathPts.has(d)) return pathPts.get(d); svgP.setAttribute('d', d); const L = svgP.getTotalLength(), n = Math.max(12, Math.ceil(L / 6)), pts = []; for (let i = 0; i <= n; i++) { const p = svgP.getPointAtLength((L * i) / n); pts.push([p.x, p.y]); } const closed = /z\s*$/i.test(d.trim()); if (closed) pts.pop(); const r = { pts, closed }; pathPts.set(d, r); return r; };
    const subdiv = (pts, closed, step = 8) => { const out = []; const m = pts.length; for (let i = 0; i < (closed ? m : m - 1); i++) { const a = pts[i], b = pts[(i + 1) % m], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(d / step)); for (let j = 0; j < k; j++) out.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]); } if (!closed) out.push(pts[m - 1]); return out; };
    const rrPts = (w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); const pts = []; const corner = (cx, cy, a0) => { const n = r > 0 ? Math.max(3, Math.ceil(r / 5)) : 1; for (let i = 0; i <= n; i++) { const a = (a0 + (90 * i) / n) * DEG; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } }; corner(w - r, r, -90); corner(w - r, h - r, 0); corner(r, h - r, 90); corner(r, r, 180); return subdiv(pts, true); };
    const ellPts = (rx, ry, cx = 0, cy = 0) => { const n = cl(Math.round((Math.PI * (rx + ry)) / 7), 18, 160), pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 - Math.PI / 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return pts; };
    const blobPts = (r, lump, k, ph) => { const n = cl(Math.round((Math.PI * 2 * r) / 7), 24, 160), pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const rr = r * (1 + lump * (0.6 * Math.sin(k * a + ph) + 0.4 * Math.sin((k + 3) * a + ph * 1.7))); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); } return pts; };
    const wobble = (pts, closed, seed, amp) => {
      if (!amp || pts.length < 3) return pts;
      let L = 0; const s = [0]; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); s.push(L); }
      if (closed) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
      const r = rngOf(seed), p1 = r() * 6.3, p2 = r() * 6.3, k1 = Math.max(1, Math.round(L / 110)), k2 = Math.max(2, Math.round(L / 41));
      const m = pts.length;
      return pts.map((p, i) => {
        const a = pts[closed ? (i - 1 + m) % m : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % m : Math.min(m - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, u = s[i] / Math.max(1, L);
        const off = amp * (0.62 * Math.sin(2 * Math.PI * k1 * u + p1) + 0.38 * Math.sin(2 * Math.PI * k2 * u + p2)) * (closed ? 1 : Math.min(1, s[i] / 20, (L - s[i]) / 20 + 0.3));
        return [p[0] - (dy / d) * off, p[1] + (dx / d) * off];
      });
    };
    const toPath = (pts, closed) => {
      const p = new Path2D(), m = pts.length; if (!m) return p;
      if (closed) { const mid = (i) => [(pts[i % m][0] + pts[(i + 1) % m][0]) / 2, (pts[i % m][1] + pts[(i + 1) % m][1]) / 2]; let q = mid(0); p.moveTo(q[0], q[1]); for (let i = 1; i <= m; i++) { const c = pts[i % m]; q = mid(i); p.quadraticCurveTo(c[0], c[1], q[0], q[1]); } p.closePath(); }
      else { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < m - 1; i++) { const c = pts[i], q = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; p.quadraticCurveTo(c[0], c[1], q[0], q[1]); } p.lineTo(pts[m - 1][0], pts[m - 1][1]); }
      return p;
    };
    const polyLen = (pts, closed) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (closed && pts.length > 2) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]); return L; };
    // { fill, s1, s2 (a second, thinner pass of the ink), len, closed } for a point list, cached by its signature
    const inked = (key, cache, pts, closed, seed, amp) => {
      if (cache.has(key)) return cache.get(key);
      const w1 = wobble(pts, closed, seed, amp), w2 = wobble(pts, closed, seed ^ 0x9e3779b9, amp * 0.8);
      const g = { fill: toPath(w1, closed), s1: toPath(w1, closed), s2: toPath(w2, closed), len: polyLen(w1, closed), closed };
      if (cache.size > 400) cache.clear(); cache.set(key, g); return g;
    };
    const geoCache = new Map();
    const rawPts = (n, t) => {
      const g = (k, d) => pv(n, k, t, d);
      switch (n.kind) {
        case 'rect': { const w = g('w', 100), h = g('h', 100); return { sig: `r${f1(w)},${f1(h)},${f1(g('r', 6))}`, pts: () => rrPts(w, h, g('r', 6)), closed: true }; }
        case 'circle': { const r = g('r', 50); return { sig: `c${f1(r)}`, pts: () => ellPts(r, r), closed: true }; }
        case 'ellipse': { const a = g('rx', 60), b = g('ry', 40); return { sig: `e${f1(a)},${f1(b)}`, pts: () => ellPts(a, b), closed: true }; }
        case 'blob': { const r = g('r', 60), lump = g('lump', 0.08), k = g('lobes', 5), ph = g('phase', 0); return { sig: `b${f1(r)},${lump},${k},${f1(ph)}`, pts: () => blobPts(r, lump, k, ph), closed: true }; }
        case 'poly': { const pts = g('pts', []); return { sig: 'p' + pts.map((q) => q.map(f1).join(',')).join(';'), pts: () => subdiv(pts, true), closed: true }; }
        case 'line': { const pts = g('pts', []); return { sig: 'l' + pts.map((q) => q.map(f1).join(',')).join(';'), pts: () => subdiv(pts, false, 10), closed: false }; }
        case 'path': { const d = g('d', ''); const s = sampleD(d); return { sig: 'd' + d, pts: () => s.pts, closed: s.closed }; }
      }
      return null;
    };
    const geomOf = (n, t) => { const r = rawPts(n, t); if (!r) return null; const amp = WOB * K0 * (n.p.wob ?? 1); return inked(n.id + '|' + r.sig + '|' + amp, geoCache, r.pts(), r.closed, n.seed, amp); };

    // ---------- boxes ----------
    const mctx = mk(4, 4).getContext('2d');
    const fontOf = (o, size) => `${o.weight ?? (o.font === 'hand' ? 700 : 600)} ${size}px ${o.font === 'hand' ? FONT.hand : o.font === 'sans' ? FONT.sans : FONT.mono}`;
    const textW = (o, s, size) => { mctx.font = fontOf(o, size); return mctx.measureText(s).width; };
    const lbox = (n, t) => {
      const g = (k, d) => pv(n, k, t, d);
      switch (n.kind) {
        case 'rect': return [0, 0, g('w', 100), g('h', 100)];
        case 'circle': { const r = g('r', 50); return [-r, -r, 2 * r, 2 * r]; }
        case 'blob': { const r = g('r', 60) * (1 + g('lump', 0.08)); return [-r, -r, 2 * r, 2 * r]; }
        case 'ellipse': { const a = g('rx', 60), b = g('ry', 40); return [-a, -b, 2 * a, 2 * b]; }
        case 'poly': case 'line': { const pts = g('pts', []); if (!pts.length) return [0, 0, 0, 0]; const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; }
        case 'path': { const s = sampleD(g('d', '')).pts; const xs = s.map((q) => q[0]), ys = s.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; }
        case 'text': { const size = g('size', 24), lines = String(g('text', '')).split('\n'), w = Math.max(...lines.map((l) => textW(n.p, l, size))), h = size * 1.3 * lines.length, al = g('align', 'left'); return [al === 'center' ? -w / 2 : al === 'right' ? -w : 0, -size * 0.65, w, h]; }
        case 'char': { const S = n.spec, top = S.h + S.foot + (S.top && S.top !== 'none' ? S.h * 0.32 : 0), ar = S.arms ? S.w * 0.16 : 0; return [-S.w / 2 - ar, -top, S.w + ar * 2, top]; }
        case 'puff': case 'ticks': { const r = g('r', 60); return [-r, -r, 2 * r, 2 * r]; }
        case 'group': { const bs = n.kids.filter((k) => !k.p.noBox && k.kind !== 'puff' && k.kind !== 'ticks').map((k) => { const b = lbox(k, t), x = pv(k, 'x', t, 0), y = pv(k, 'y', t, 0), s1 = pv(k, 'sx', t, 1), s2 = pv(k, 'sy', t, 1); return [x + Math.min(b[0] * s1, (b[0] + b[2]) * s1), y + Math.min(b[1] * s2, (b[1] + b[3]) * s2), b[2] * Math.abs(s1), b[3] * Math.abs(s2)]; }); if (!bs.length) return [0, 0, 0, 0]; const x0 = Math.min(...bs.map((b) => b[0])), y0 = Math.min(...bs.map((b) => b[1])), x1 = Math.max(...bs.map((b) => b[0] + b[2])), y1 = Math.max(...bs.map((b) => b[1] + b[3])); return [x0, y0, x1 - x0, y1 - y0]; }
      }
      return [0, 0, 0, 0];
    };
    // world box (ancestors' offsets and scales; rotation ignored; a character's hop and lean included)
    const wbox = (n, t) => { let [x, y, w, h] = lbox(n, t); for (let m = n; m; m = m.parent) { const s1 = Math.abs(pv(m, 'sx', t, 1)), s2 = Math.abs(pv(m, 'sy', t, 1)), po = m.kind === 'char' ? poseOf(m, t) : null; x = x * s1 + pv(m, 'x', t, 0) + (po ? po.dx : 0); y = y * s2 + pv(m, 'y', t, 0) + (po ? po.dy : 0); w *= s1; h *= s2; } return { x, y, w, h }; };
    B.box = (n, t) => wbox(n, t ?? Math.max(0, n.at));
    const pivotOf = (n, t) => { const b = lbox(n, t), pv2 = n.p.pivot ?? (n.kind === 'text' ? 'center' : 'bottom'); if (Array.isArray(pv2)) return [b[0] + b[2] * pv2[0], b[1] + b[3] * pv2[1]]; return pv2 === 'center' ? [b[0] + b[2] / 2, b[1] + b[3] / 2] : pv2 === 'top' ? [b[0] + b[2] / 2, b[1]] : [b[0] + b[2] / 2, b[1] + b[3]]; };

    // ---------- entrances and exits ----------
    const stateOf = (n, t) => {
      if (t < n.at || t >= n.until) return null;
      const s = { a: 1, dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, draw: 1 };
      const qi = n.inDur > 0 && n.at > 0 ? cl((t - n.at) / n.inDur) : 1;
      if (qi < 1) switch (n.enter) {
        case 'pop': { const k = E.backOut(qi); s.sx = k * (1 + 0.14 * bump(qi)); s.sy = k * (1 - 0.1 * bump(qi)); s.a = cl(qi * 4); break; }
        case 'grow': { const k = E.spring(qi); s.sx = s.sy = k; s.a = cl(qi * 4); break; }
        case 'drop': { const h = n.p.dropH ?? 260; if (qi < 0.62) { const q = qi / 0.62; s.dy = -h * (1 - q * q); s.sy = 1 + 0.08 * q; s.sx = 1 - 0.05 * q; } else { const q = (qi - 0.62) / 0.38, b = bump(q) * (1 - q * 0.4); s.sy = 1 - 0.16 * b; s.sx = 1 + 0.12 * b; } s.a = cl(qi * 6); break; }
        case 'rise': { const k = E.backOut(qi); s.sy = k; s.sx = 1 + 0.06 * bump(qi); s.a = cl(qi * 5); break; }
        case 'slide': { const q = E.cubicInOut(qi), fr = n.p.from ?? -420; s.dx = (1 - q) * fr; s.dy = -Math.abs(Math.sin(qi * Math.PI * 3)) * 10 * (1 - qi); s.a = cl(qi * 5); break; }
        case 'fade': s.a = E.sine(qi); break;
        case 'draw': s.draw = qi; break;
      }
      const qo = n.until < 1e8 && n.outDur > 0 ? cl((t - (n.until - n.outDur)) / n.outDur) : 0;
      if (qo > 0) switch (n.exit) {
        case 'pop': { const k = 1 - backIn(qo); s.sx *= k; s.sy *= k; s.a *= 1 - cl((qo - 0.6) / 0.4); break; }
        case 'merge': { const k = 1 - E.sine(qo) * 0.7; s.sx *= k; s.sy *= k; s.a *= 1 - qo; break; }
        case 'sink': s.sy *= 1 - E.cubicInOut(qo); s.a *= 1 - cl((qo - 0.7) / 0.3); break;
        case 'fade': s.a *= 1 - E.sine(qo); break;
        case 'slide': s.dx += E.cubicInOut(qo) * (n.p.exitTo ?? 480); s.a *= 1 - cl((qo - 0.7) / 0.3); break;
        case 'lift': s.dy -= E.quartIn(qo) * 160; s.a *= 1 - qo; break;
      }
      return s;
    };

    // the shaded side: denser cross-hatching in a band along the right and bottom edges (the shape minus itself moved up-left)
    const shadeBand = (ctx, path, band, fill, a) => { if (band <= 0.5) return; const p = new Path2D(); p.rect(-1e4, -1e4, 2e4, 2e4); p.addPath(path, new DOMMatrix().translate(-band * 0.75, -band)); ctx.save(); ctx.clip(p, 'evenodd'); ctx.globalAlpha = a; ctx.fillStyle = pat(ctx, mixHex(fill, C0.ink, 0.55), 'band'); ctx.fill(path); ctx.restore(); };
    // ---------- drawing a shape: rim, flat fill, coloured-pencil hatching, a light streak, then the ink line (two passes) ----------
    const drawShape = (ctx, n, t, a, st) => {
      if (n.kind === 'text') return drawText(ctx, n, t, a, st);
      if (n.kind === 'puff' || n.kind === 'ticks') return drawFx(ctx, n, t, a);
      const g = geomOf(n, t); if (!g) return;
      const fill = n.kind === 'line' ? null : col(pv(n, 'fill', t, 'cream')), stroke = pv(n, 'stroke', t, 'ink'), lw = pv(n, 'lw', t, LW) * K0;
      const fq = st.draw < 1 ? cl((st.draw - 0.5) / 0.5) : 1;
      if (fill && fq > 0) {
        ctx.save(); ctx.globalAlpha = a * fq * pv(n, 'fillAlpha', t, 1); ctx.clip(g.fill);
        const b = lbox(n, t), rim = pv(n, 'rim', t, Math.min(11, Math.min(b[2], b[3]) * 0.14)) * K0;
        if (rim > 0.5) { ctx.fillStyle = rimOf(fill); ctx.fill(g.fill); ctx.save(); ctx.translate(-rim * 0.7, -rim); ctx.fillStyle = fill; ctx.fill(g.fill); ctx.restore(); }
        else { ctx.fillStyle = fill; ctx.fill(g.fill); }
        const hq = pv(n, 'hatch', t, fill === C0.white || fill === C0.paper ? 0.25 : 0.7) * HATCH;
        if (hq > 0) { ctx.globalAlpha = a * fq * Math.min(1, hq); ctx.fillStyle = pat(ctx, mixHex(fill, C0.ink, 0.45), 'dark'); ctx.fill(g.fill); ctx.globalAlpha = a * fq * Math.min(1, hq) * 0.8; ctx.fillStyle = pat(ctx, mixHex(fill, '#ffffff', 0.5), 'light'); ctx.fill(g.fill); shadeBand(ctx, g.fill, rim * 2.6, fill, a * fq * Math.min(1, hq)); }
        const gl = pv(n, 'gloss', t, 1);
        if (gl > 0 && rim > 0.5) { ctx.globalAlpha = a * fq * 0.5 * gl; ctx.strokeStyle = hiOf(fill); ctx.lineWidth = rim * 0.55; ctx.translate(rim * 0.5, rim * 0.5); ctx.stroke(g.s1); }
        ctx.restore();
      }
      if (stroke) {
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col(stroke); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        const dash = n.p.dash; if (st.draw < 1) ctx.setLineDash([g.len * E.sine(st.draw), g.len + 10]); else if (dash) ctx.setLineDash(dash.map((v) => v * K0));
        ctx.lineWidth = lw; ctx.stroke(g.s1);
        if (!dash) { ctx.globalAlpha = a * 0.4; ctx.lineWidth = lw * 0.45; ctx.stroke(g.s2); }
        ctx.restore();
      }
    };
    // text drawn on the paper (labels on props, code lines, log lines): it can be covered by what stands in front of it
    const drawText = (ctx, n, t, a, st) => {
      const o = n.p, size = pv(n, 'size', t, 24), tone = col(pv(n, 'tone', t, 'ink')), al = pv(n, 'align', t, 'left');
      let s = String(pv(n, 'text', t, ''));
      if (o.type) { const t0 = o.type.at ?? n.at, per = o.type.per ?? 0.035, k = Math.floor((frameT(t) - t0) / per); s = [...s].slice(0, Math.max(0, k)).join(''); }
      ctx.save(); ctx.globalAlpha = a * (st.draw < 1 ? st.draw : 1);
      ctx.font = fontOf(o, size); ctx.textAlign = al; ctx.textBaseline = 'middle';
      const lines = s.split('\n');
      if (o.mark) { const ma = typeof o.mark === 'object' ? o.mark : { at: 0 }, q = cl((t - (ma.at ?? 0)) / 0.35); if (q > 0) { const w = Math.max(...String(pv(n, 'text', t, '')).split('\n').map((l) => textW(o, l, size))); const x0 = al === 'center' ? -w / 2 : al === 'right' ? -w : 0; ctx.fillStyle = col(ma.tone ?? 'b2'); ctx.globalAlpha = a * 0.75; ctx.fillRect(x0 - size * 0.25, -size * 0.62, (w + size * 0.5) * E.cubicInOut(q), size * 1.24); ctx.globalAlpha = a; } }
      ctx.fillStyle = tone; lines.forEach((l, i) => ctx.fillText(l, 0, i * size * 1.3));
      if (o.strike) { const sa = typeof o.strike === 'object' ? o.strike : { at: 0 }, q = cl((t - (sa.at ?? 0)) / 0.4); if (q > 0) { const w = textW(o, lines[0], size), x0 = al === 'center' ? -w / 2 : al === 'right' ? -w : 0; ctx.strokeStyle = col(sa.tone ?? 'red'); ctx.lineWidth = Math.max(2, size * 0.09); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0 - 4, size * 0.05); ctx.quadraticCurveTo(x0 + w * 0.5 * q, -size * 0.12, x0 + (w + 8) * q, size * 0.02); ctx.stroke(); } }
      ctx.restore();
    };

    const sortKids = (n) => n.kids.slice().sort((p, q) => p.z - q.z || p.ord - q.ord);
    const drawNode = (ctx, n, t, a0) => {
      if (n.kind === 'char') return drawChar(ctx, n, t, a0);
      const st = stateOf(n, t); if (!st || st.a <= 0.002) return;
      const a = a0 * st.a * pv(n, 'alpha', t, 1); if (a <= 0.002) return;
      ctx.save();
      const x = pv(n, 'x', t, 0) + st.dx, y = pv(n, 'y', t, 0) + st.dy, rot = pv(n, 'rot', t, 0) + st.rot, sx = pv(n, 'sx', t, 1) * st.sx, sy = pv(n, 'sy', t, 1) * st.sy;
      ctx.translate(x * K0, y * K0);
      if (rot || sx !== 1 || sy !== 1) { const [px, py] = pivotOf(n, t); ctx.translate(px * K0, py * K0); ctx.rotate(rot * DEG); ctx.scale(sx, sy); ctx.translate(-px * K0, -py * K0); }
      if (K0 !== 1) ctx.scale(K0, K0);
      if (n.kind === 'group') { if (n.p.draw) n.p.draw(ctx, t, a, n); for (const k of sortKids(n)) drawNode(ctx, k, t, a); }
      else { if (K0 !== 1) ctx.scale(1 / K0, 1 / K0); drawShapeK(ctx, n, t, a, st); }
      ctx.restore();
    };
    const drawShapeK = (ctx, n, t, a, st) => { if (K0 !== 1) { ctx.save(); ctx.scale(K0, K0); drawShape(ctx, n, t, a, st); ctx.restore(); } else drawShape(ctx, n, t, a, st); };

    // ---------- primitives ----------
    for (const k of ['rect', 'circle', 'ellipse', 'poly', 'path', 'line', 'blob', 'group']) B[k] = (o = {}) => node(k, o);
    B.text = (text, o = {}) => { const n = node('text', { ...o, text }); probeText(String(text), o.font === 'hand' ? 'hand' : o.weight ?? 600); if (!o.noFact && o.register !== false) (F.facts ??= []).push(String(o.fact ?? text).replace(/\n/g, ' ')); canvasTexts.push(n); return n; };
    const canvasTexts = [];

    // little effects: dust puffs (a split, a landing, a merge), excitement ticks, a sparkle
    const drawFx = (ctx, n, t, a) => {
      const q = cl((t - n.at) / (n.p.dur ?? 0.7)); if (q >= 1) return;
      const r = pv(n, 'r', t, 60), rr = rngOf(n.seed);
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = C0.ink; ctx.globalAlpha = a * (1 - E.quartIn(q));
      if (n.kind === 'puff') {
        for (let i = 0; i < (n.p.n ?? 6); i++) { const ang = (i / (n.p.n ?? 6)) * Math.PI * 2 + rr() * 0.6, d = r * (0.35 + 0.75 * E.quartOut(q)) * (0.8 + rr() * 0.4), cr = r * (0.22 + rr() * 0.1) * (1 - q * 0.7); const g = inked('puff' + cr.toFixed(0), geoCache, ellPts(cr, cr * 0.85), true, n.seed + i, 1); ctx.save(); ctx.translate(Math.cos(ang) * d, Math.sin(ang) * d * 0.55 - r * 0.15 * q); ctx.fillStyle = C0.white; ctx.globalAlpha = a * 0.85 * (1 - q); ctx.fill(g.fill); ctx.globalAlpha = a * (1 - E.quartIn(q)); ctx.lineWidth = 3; ctx.stroke(g.s1); ctx.restore(); }
      } else {
        const sides = n.p.sides ?? [-1, 1]; ctx.lineWidth = 3.4;
        for (const sd of sides) for (let i = 0; i < 3; i++) { const ang = (sd > 0 ? -25 + i * 25 : 205 - i * 25) * DEG, k = E.backOut(cl(q * 3)), r0 = r * 0.75, r1 = r0 + r * 0.32 * k; ctx.beginPath(); ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0); ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1); ctx.stroke(); }
      }
      ctx.restore();
    };
    B.puff = (at, x, y, o = {}) => { const n = node('puff', { x, y, r: o.r ?? 60, n: o.n, dur: o.dur ?? 0.7, at, enter: 'none', until: at + (o.dur ?? 0.7), exit: 'none', z: o.z ?? 8, sfx: false, noBox: true }); if (o.sfx !== false) F.sfx(at, o.sound ?? 'puff', 0.35); return n; };
    B.ticks = (at, x, y, o = {}) => node('ticks', { x, y, r: o.r ?? 70, sides: o.sides, dur: o.dur ?? 0.8, at, enter: 'none', until: at + (o.dur ?? 0.8), exit: 'none', z: o.z ?? 8, sfx: false, noBox: true });
    B.sparkle = (at, x, y, o = {}) => { const s = o.size ?? 22, g = B.group({ x, y, at, until: at + (o.dur ?? 1.1), enter: 'pop', exit: 'pop', z: o.z ?? 8, sfx: false, pivot: 'center' }); g.path({ d: `M0 ${-s} Q${s * 0.12} ${-s * 0.12} ${s} 0 Q${s * 0.12} ${s * 0.12} 0 ${s} Q${-s * 0.12} ${s * 0.12} ${-s} 0 Q${-s * 0.12} ${-s * 0.12} 0 ${-s} Z`, fill: o.tone ?? 'white', lw: 3, rim: 0, hatch: 0, rot: 0 }); return g; };
    B.shadow = (o = {}) => B.ellipse({ x: o.x ?? 0, y: o.y ?? 0, rx: o.w ? o.w / 2 : 80, ry: o.h ?? 9, fill: 'grey', fillAlpha: 0.32, stroke: null, rim: 0, gloss: 0, hatch: 1.3, z: o.z ?? -2, at: o.at, until: o.until, enter: o.enter ?? (o.at > 0 ? 'fade' : 'none'), in: o.in, sfx: false });

    // ---------- the cast: small cute characters on one rig (body kinds, faces, arms, feet, a top) ----------
    const castDefs = {};
    // the cast check (styles/CHARACTERS.md): any two characters must differ in at least two visible attributes (body, colour, top, badge, size, knobs…)
    const LOOK0 = { kind: 'bean', tone: 'a', top: null, badge: null, knobs: false, expr: 'neutral', scale: 1 };
    B.cast = (defs) => { Object.assign(castDefs, defs); if (window.EV && window.EV.castCheck) window.EV.castCheck(defs, (c) => { const v = { ...LOOK0, ...c }; if (v.top == null) v.top = v.kind === 'bean' ? 'sprout' : 'none'; return { kind: v.kind, tone: v.tone, top: v.top, badge: v.badge, knobs: v.knobs, expr: v.expr, size: Math.round(((v.w ?? 0) + (v.h ?? 0)) / 40) }; }, 'storybook'); return B; };
    const KIND = { bean: { w: 150, h: 132 }, round: { w: 136, h: 136 }, blob: { w: 190, h: 170 }, gem: { w: 130, h: 130 }, star: { w: 170, h: 160 }, capsule: { w: 104, h: 156 }, pillar: { w: 96, h: 176 } };
    const EXPR = {
      neutral: { eyes: 'dot', mouth: 'smile' }, happy: { eyes: 'happy', mouth: 'grin' }, proud: { eyes: 'happy', mouth: 'smile' }, surprised: { eyes: 'wide', mouth: 'o' },
      worried: { eyes: 'dot', brows: 'worried', mouth: 'wobble' }, determined: { eyes: 'dot', brows: 'angry', mouth: 'flat' }, angry: { eyes: 'dot', brows: 'angry', mouth: 'frown' },
      sly: { eyes: 'half', brows: 'angry', mouth: 'smirk' }, sleepy: { eyes: 'half', mouth: 'flat' }, sick: { eyes: 'half', brows: 'worried', mouth: 'wobble' }, ko: { eyes: 'x', mouth: 'o' },
      chomp: { eyes: 'happy', mouth: 'chomp' }, calm: { eyes: 'closed', mouth: 'smile' },
    };
    const chars = [];
    B.char = (name, o = {}) => {
      const def = castDefs[name] || castDefs[o.like] || {}, kind = o.kind ?? def.kind ?? 'bean', D = KIND[kind] || KIND.bean;
      const spec = { kind, tone: 'a', expr: 'neutral', top: kind === 'bean' ? 'sprout' : 'none', arms: kind !== 'gem' && kind !== 'pillar', feet: kind !== 'gem' && kind !== 'pillar', cheeks: true, facing: 1, ...def, ...o };
      const sc = spec.scale ?? 1; spec.w = (spec.w ?? D.w) * sc; spec.h = (spec.h ?? D.h) * sc; spec.foot = spec.feet ? spec.h * 0.11 : 0;
      const n = node('char', { x: o.x ?? 0, y: o.y ?? 0, at: o.at, until: o.until, enter: o.enter ?? (o.at > 0 ? 'drop' : 'none'), exit: o.exit, z: o.z ?? 2, sfx: o.sfx, in: o.in, pivot: 'bottom' });
      n.name = name; n.spec = spec; n.acts = []; n.faces = []; n.looks = []; n.cards = []; n.events = [];
      if (spec.tone) n.p.tone = spec.tone;
      n.p.ghost = o.ghost ?? 0;
      const mark = (t) => { n.events.push(t); return n; };
      // walking: hops along the ground line; x is keyed so tags and the camera follow
      n.go = (at, x, dur, o2 = {}) => { const x0 = pv(n, 'x', at, 0), d = dur ?? cl(Math.abs(x - x0) / 260, 0.5, 4); n.to(at, { x }, d, o2.ease ?? E.sine); n.acts.push({ kind: 'walk', a: at, b: at + d, dir: Math.sign(x - x0) || spec.facing, n: o2.hops ?? Math.max(1, Math.round(d * 2.6)), h: o2.h ?? 0.16 }); if (o2.sfx !== false) F.sfx(at, 'hop', 0.3, { dur: d }); return mark(at); };
      n.hop = (at, k = 1, o2 = {}) => { const d = (o2.dur ?? 0.38) * k; n.acts.push({ kind: 'walk', a: at, b: at + d, dir: 0, n: k, h: o2.h ?? 0.22 }); F.sfx(at, 'hop', 0.3, { dur: d }); return mark(at); };
      n.jump = (at, to = {}, o2 = {}) => { const d = o2.dur ?? 0.75; if (to.x !== undefined) n.to(at, { x: to.x }, d, E.lin); if (to.y !== undefined) n.to(at, { y: to.y }, d, E.sine); n.acts.push({ kind: 'jump', a: at, b: at + d, h: o2.h ?? spec.h * 1.1 }); F.sfx(at - 0.1, 'jump', 0.4); F.sfx(at + d, 'squash', 0.3); return mark(at); };
      n.act = (at, kind2, dur, o2 = {}) => { const d = dur ?? { squash: 0.45, shake: 0.6, shiver: 1.2, cheer: 1.1, nod: 0.6, lean: 1, chomp: 1.2, bounce: 1.2, wave: 1.2, think: 1.4, spin: 0.8, point: 1.2, hold: 2, carry: 2 }[kind2] ?? 0.8; n.acts.push({ kind: kind2, a: at, b: at + d, ...o2 }); const snd = { squash: 'squash', cheer: 'hop', chomp: 'chomp', shake: 'shake', spin: 'swish' }[kind2]; if (snd && o2.sfx !== false) F.sfx(at, snd, 0.35, { dur: d }); if (kind2 === 'cheer') n.face(at, 'happy', at + d + 0.4); if (kind2 === 'chomp') n.face(at, 'chomp', at + d); return mark(at); };
      n.face = (at, expr, until) => { n.faces.push({ at, expr, until: until ?? 1e9 }); n.faces.sort((p, q) => p.at - q.at); return mark(at); };
      n.look = (at, dx, dy = 0) => { n.looks.push({ at, dx, dy }); n.looks.sort((p, q) => p.at - q.at); return n; };
      // a task card held in front of the body (mono text, one or two short lines)
      n.carry = (at, text, o2 = {}) => { n.cards.push({ at, until: o2.until ?? 1e9, text: String(text), title: o2.title ?? null }); probeText(String(text) + (o2.title ?? ''), 600); if (o2.fact !== false) (F.facts ??= []).push(String(text).replace(/\n/g, ' ')); F.sfx(at, 'paper', 0.3); return mark(at); };
      n.say = (text, at, until, o2 = {}) => { mark(at); return B.tag(text, { on: n, at, until, ...o2 }); };
      n.tone = (at, tone, dur = 0.6) => { n.to(at, { tone }, dur); return mark(at); };
      chars.push(n);
      return n;
    };
    // a character's motion at t (pure function of t): offsets, squash, lean, arms, feet, which face
    const poseOf = (n, t) => {
      const S = n.spec, ph = (n.seed % 1000) / 159;
      const o = { dx: 0, jx: 0, dy: 0, sx: 1, sy: 1 + 0.018 * Math.sin(t * 2.3 + ph), rot: 0.7 * Math.sin(t * 0.8 + ph), arms: 'down', armQ: 0, feet: [0, 0], mouthOpen: 0, dir: S.facing, walking: false };
      for (const A of n.acts) {
        if (t < A.a - 0.2 || t > A.b + 0.3) continue;
        const q = cl((t - A.a) / (A.b - A.a));
        switch (A.kind) {
          case 'walk': { if (t < A.a || t > A.b) break; const p = q * A.n, f = p % 1, k = Math.floor(p); o.dy -= S.h * A.h * bump(f); o.sy *= 1 + 0.08 * bump(f) - 0.1 * bump(cl((f - 0.85) / 0.3)); o.sx *= 1 - 0.04 * bump(f); if (A.dir) { o.dir = A.dir; o.rot += 4 * A.dir; } o.feet = k % 2 ? [S.h * 0.06 * bump(f), 0] : [0, S.h * 0.06 * bump(f)]; o.walking = true; o.armQ = Math.sin(p * Math.PI); break; }
          case 'jump': { if (t < A.a) { const w = cl((t - (A.a - 0.18)) / 0.18); o.sy *= 1 - 0.18 * bump(w * 0.5 + 0.5 * w); o.sx *= 1 + 0.12 * w; } else if (t <= A.b) { o.dy -= A.h * 4 * q * (1 - q); o.sy *= 1 + 0.12 * bump(q); o.sx *= 1 - 0.06 * bump(q); o.arms = 'up'; } else { const w = cl((t - A.b) / 0.3); o.sy *= 1 - 0.16 * bump(w); o.sx *= 1 + 0.12 * bump(w); } break; }
          case 'squash': { if (t < A.a || t > A.b) break; const w = q < 0.4 ? -bump(q / 0.8) : 0.5 * bump((q - 0.4) / 0.6); o.sy *= 1 + 0.2 * w; o.sx *= 1 - 0.14 * w; break; }
          case 'shake': { if (t < A.a || t > A.b) break; o.rot += 7 * Math.sin(t * 30) * bump(q); break; }
          case 'shiver': { if (t < A.a || t > A.b) break; o.jx += 2.6 * Math.sin(t * 70) * Math.min(1, bump(q) * 3); o.sy *= 1 + 0.012 * Math.sin(t * 55); break; }
          case 'nod': { if (t < A.a || t > A.b) break; o.rot += 7 * Math.sin(q * Math.PI * 2) * (1 - q); o.sy *= 1 - 0.05 * bump(q); break; }
          case 'cheer': { if (t < A.a || t > A.b) break; o.arms = 'up'; o.armQ = Math.sin(t * 16); o.dy -= S.h * 0.2 * Math.abs(Math.sin(q * Math.PI * 2)); o.sy *= 1 + 0.06 * Math.abs(Math.sin(q * Math.PI * 2)); break; }
          case 'bounce': { if (t < A.a || t > A.b) break; const s2 = Math.abs(Math.sin(q * Math.PI * (A.n ?? 4))); o.dy -= S.h * 0.08 * s2; o.sy *= 1 + 0.05 * s2 - 0.05 * (1 - s2); break; }
          case 'wave': { if (t < A.a || t > A.b) break; o.arms = 'wave'; o.armQ = Math.sin(t * 14); break; }
          case 'lean': case 'point': { if (t < A.a || t > A.b) break; const w = Math.min(1, bump(q) * 2.5); o.rot += (A.deg ?? 9) * (A.dir ?? o.dir) * w; o.arms = 'point'; if (A.dir) o.dir = A.dir; break; }
          case 'think': { if (t < A.a || t > A.b) break; o.rot += -6 * Math.min(1, bump(q) * 2); o.lookUp = Math.min(1, bump(q) * 2); break; }
          case 'chomp': { if (t < A.a || t > A.b) break; const c = Math.max(0, Math.sin(q * Math.PI * (A.n ?? 2) * 2)); o.mouthOpen = c; o.sy *= 1 + 0.1 * c; o.sx *= 1 - 0.04 * c; break; }
          case 'spin': { if (t < A.a || t > A.b) break; o.sx *= Math.cos(q * Math.PI * 2); break; }
          case 'hold': case 'carry': { if (t < A.a || t > A.b) break; o.arms = 'hold'; break; }
        }
      }
      return o;
    };
    const faceAt = (n, t) => { let f = n.spec.expr; for (const x of n.faces) { if (x.at <= t && t < x.until) f = x.expr; } return EXPR[f] || EXPR.neutral; };
    const lookAt = (n, t) => { let a = { dx: 0, dy: 0 }, prev = a; for (const l of n.looks) { if (l.at > t) break; const q = E.cubicInOut(cl((t - l.at) / 0.25)); a = { dx: lerp(prev.dx, l.dx, q), dy: lerp(prev.dy, l.dy, q) }; prev = { dx: l.dx, dy: l.dy }; } return a; };
    const blinkAt = (n, t) => { const per = 2.7 + ((n.seed >>> 3) % 100) / 60, ph = ((n.seed >>> 9) % 100) / 100 * per, x = (t + ph) % per; return x < 0.13 ? bump(x / 0.13) : 0; };
    // body outlines by kind, in the body's own box (base of the body at y = 0, centred on x = 0)
    const bodyPts = (S, t) => {
      const w = S.w, h = S.h;
      switch (S.kind) {
        case 'round': return ellPts(w / 2, h / 2, 0, -h / 2);
        case 'gem': { const pts = [], r = w / 2; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; pts.push([Math.cos(a) * r, -h / 2 + Math.sin(a) * r * (h / w)]); } return subdiv(pts.flatMap((p, i) => { const q = pts[(i + 1) % 6]; return [[lerp(p[0], q[0], 0.12), lerp(p[1], q[1], 0.12)], [lerp(p[0], q[0], 0.88), lerp(p[1], q[1], 0.88)]]; }), true, 7); }
        case 'blob': return blobPts(w / 2, 0.06, 5, (S.seedPh ?? 0) + t * 0.5).map(([x, y]) => [x, y * (h / w) - h / 2]);
        case 'star': { const pts = [], k = S.points ?? 5, n = 120; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 - Math.PI / 2, c = Math.cos(k * (a + Math.PI / 2)), r = (w / 2) * (0.66 + 0.34 * Math.pow(Math.max(0, c), 3) - 0.04 * Math.pow(Math.max(0, -c), 2)); pts.push([Math.cos(a) * r, -h / 2 + Math.sin(a) * r * (h / w)]); } return pts; }
        case 'capsule': return rrPts(w, h, w / 2).map(([x, y]) => [x - w / 2, y - h]);
        case 'pillar': return rrPts(w, h, w * 0.32).map(([x, y]) => [x - w / 2, y - h]);
        default: {   // bean: a gumdrop — a tall dome over a flatter, wider bottom
          const pts = [], n = 120, hb = h * 0.34, ht = h - hb;
          for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), top = s < 0; const ex = top ? 2.4 : 3.6, x = (w / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / ex), y = (top ? ht : hb) * Math.sign(s) * Math.pow(Math.abs(s), 2 / ex); pts.push([x, y - hb]); }
          return pts;
        }
      }
    };
    const charCache = new Map();
    const ellG = (rx, ry, seed) => inked(`ell${f1(rx)},${f1(ry)},${seed}`, charCache, ellPts(rx, ry), true, seed, WOB * 0.6);
    const fillInk = (ctx, g, fill, a, o = {}) => {
      ctx.save(); ctx.globalAlpha = a; ctx.clip(g.fill);
      const rim = o.rim ?? 0;
      if (rim > 0) { ctx.fillStyle = rimOf(fill); ctx.fill(g.fill); ctx.save(); ctx.translate(-rim * 0.7, -rim); ctx.fillStyle = fill; ctx.fill(g.fill); ctx.restore(); } else { ctx.fillStyle = fill; ctx.fill(g.fill); }
      if (o.hatch !== 0) { ctx.globalAlpha = a * 0.8 * HATCH * (o.hatch ?? 1); ctx.fillStyle = pat(ctx, mixHex(fill, C0.ink, 0.45), 'dark'); ctx.fill(g.fill); ctx.globalAlpha = a * 0.7 * HATCH * (o.hatch ?? 1); ctx.fillStyle = pat(ctx, mixHex(fill, '#ffffff', 0.5), 'light'); ctx.fill(g.fill); shadeBand(ctx, g.fill, rim * 2.6, fill, a * 0.9 * HATCH * (o.hatch ?? 1)); }
      if (rim > 0) { ctx.globalAlpha = a * 0.55; ctx.strokeStyle = hiOf(fill); ctx.lineWidth = rim * 0.5; ctx.translate(rim * 0.5, rim * 0.5); ctx.stroke(g.s1); }
      ctx.restore();
      if (o.stroke !== false) { ctx.save(); ctx.globalAlpha = a * (o.inkA ?? 1); ctx.strokeStyle = C0.ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = o.lw ?? LW; ctx.stroke(g.s1); ctx.globalAlpha = a * 0.4 * (o.inkA ?? 1); ctx.lineWidth = (o.lw ?? LW) * 0.45; ctx.stroke(g.s2); ctx.restore(); }
    };
    const drawChar = (ctx, n, t, a0) => {
      const st = stateOf(n, t); if (!st || st.a <= 0.002) return;
      const S = n.spec, po = poseOf(n, t), ghost = cl(pv(n, 'ghost', t, 0)), a = a0 * st.a * pv(n, 'alpha', t, 1) * (1 - ghost * 0.35);
      const tone = col(pv(n, 'tone', t, S.tone)), fill = ghost > 0 ? mixD(tone, C0.paper, 0.62 * ghost) : tone, inkA = 1 - ghost * 0.55;
      const x = pv(n, 'x', t, 0) + po.dx + po.jx + st.dx, y = pv(n, 'y', t, 0) + st.dy, w = S.w, h = S.h, foot = S.foot, lw = LW * (S.lw ?? 1);
      ctx.save(); ctx.translate(x * K0, y * K0); if (K0 !== 1) ctx.scale(K0, K0);
      // the ground shadow stays on the ground and shrinks while the body is up in the air
      if (S.shadow !== false && y > -4 && !S.float) { const up = cl(-po.dy / (h * 1.2)); ctx.save(); ctx.globalAlpha = a * 0.3 * (1 - up * 0.6); const g = ellG(w * 0.52 * (1 - up * 0.35), 9, 7); ctx.fillStyle = C0.grey; ctx.fill(g.fill); ctx.globalAlpha = a * 0.55 * (1 - up * 0.6); ctx.fillStyle = pat(ctx, C0.ink, 'shadow'); ctx.fill(g.fill); ctx.restore(); }
      ctx.translate(0, po.dy + (S.float ? Math.sin(t * 2.1 + n.seed % 7) * 6 : 0));
      ctx.rotate((po.rot + st.rot + pv(n, 'rot', t, 0)) * DEG); ctx.scale(po.sx * st.sx * pv(n, 'sx', t, 1), po.sy * st.sy * pv(n, 'sy', t, 1));
      const dir = po.dir || 1, top = -foot - h, cy = -foot - h * 0.48;
      // feet
      if (S.feet) for (const [i, sd] of [[0, -1], [1, 1]]) { const g = ellG(w * 0.11, foot * 0.62, 11 + i); ctx.save(); ctx.translate(sd * w * 0.2, -foot * 0.55 - po.feet[i]); fillInk(ctx, g, mixHex(tone, C0.ink, 0.12), a, { rim: 0, hatch: 0.6, lw: lw * 0.85, inkA }); ctx.restore(); }
      // arms: small mittens at the sides
      const arm = (sd, front) => {
        if (!S.arms) return;
        let ang = sd * 30, ax = sd * (w * 0.47), ay = cy + h * 0.2;
        if (po.arms === 'up') ang = sd * (140 + 14 * po.armQ * sd);
        else if (po.arms === 'wave') ang = sd === dir ? sd * (150 + 22 * po.armQ) : sd * 22;
        else if (po.arms === 'point') ang = sd === dir ? sd * 90 : sd * 20;
        else if (po.arms === 'hold') { ang = sd * 64; ax = sd * w * 0.36; ay = -foot - h * 0.26; }
        else if (po.walking) ang = sd * (22 + 18 * po.armQ * sd);
        if ((po.arms === 'hold') !== front) return;
        const g = ellG(w * 0.085, w * 0.12, 21 + sd);
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(-ang * DEG); ctx.translate(0, w * 0.06); fillInk(ctx, g, tone, a, { rim: 0, hatch: 0.6, lw: lw * 0.85, inkA }); ctx.restore();
      };
      arm(-1, false); arm(1, false);
      // knobs / spikes behind a gem or round body (a virus)
      if (S.knobs) { const k = S.knobs === true ? 10 : S.knobs, R = w / 2; for (let i = 0; i < k; i++) { const an = (i / k) * Math.PI * 2 + 0.3, kx = Math.cos(an) * R * 1.06, ky = cy + Math.sin(an) * R * 1.06 * (h / w); ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = C0.ink; ctx.globalAlpha = a * inkA; ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.moveTo(Math.cos(an) * R * 0.9, cy + Math.sin(an) * R * 0.9 * (h / w)); ctx.lineTo(kx, ky); ctx.stroke(); ctx.restore(); const g = ellG(w * 0.075, w * 0.075, 31 + i); ctx.save(); ctx.translate(kx + Math.cos(an) * w * 0.05, ky + Math.sin(an) * w * 0.05); fillInk(ctx, g, mixHex(tone, C0.white, 0.25), a, { rim: 0, hatch: 0.5, lw: lw * 0.75, inkA }); ctx.restore(); } }
      // body
      const sig = `${S.kind}|${f1(w)}|${f1(h)}|${S.kind === 'blob' ? f1(t * 0.5) : ''}`;
      const bg = inked(n.id + sig, charCache, bodyPts(S, t).map(([px, py]) => [px, py - foot]), true, n.seed, WOB * 0.9);
      fillInk(ctx, bg, fill, a, { rim: Math.min(13, w * 0.09), lw, inkA });
      // facets on a gem body
      if (S.kind === 'gem') { ctx.save(); ctx.globalAlpha = a * 0.55 * inkA; ctx.strokeStyle = C0.ink; ctx.lineWidth = lw * 0.5; ctx.lineCap = 'round'; const r = w / 2; for (let i = 0; i < 6; i += 2) { const an = (i / 6) * Math.PI * 2 - Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(an) * r * 0.86, cy + Math.sin(an) * r * 0.86 * (h / w)); ctx.lineTo(Math.cos(an) * r * 0.36, cy + Math.sin(an) * r * 0.36 * (h / w)); ctx.stroke(); } ctx.restore(); }
      // a top: a sprout, an antenna, a cap, cilia
      const topY = S.kind === 'bean' || S.kind === 'capsule' || S.kind === 'pillar' ? top + 2 : cy - h / 2 + 3;
      ctx.save(); ctx.globalAlpha = a * inkA; ctx.strokeStyle = C0.ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (S.top === 'sprout') { const sw = Math.sin(t * 1.7 + n.seed) * 4; ctx.lineWidth = lw * 0.9; ctx.beginPath(); ctx.moveTo(0, topY + 4); ctx.quadraticCurveTo(2, topY - h * 0.12, sw, topY - h * 0.2); ctx.stroke(); ctx.restore(); for (const sd of [-1, 1]) { const g = ellG(h * 0.1, h * 0.05, 41 + sd); ctx.save(); ctx.translate(sw + sd * h * 0.09, topY - h * 0.22); ctx.rotate(sd * -28 * DEG); fillInk(ctx, g, col(S.leaf ?? 'a2') === fill ? mixHex(fill, '#ffffff', 0.3) : col(S.leaf ?? 'a2'), a, { rim: 0, hatch: 0.5, lw: lw * 0.8, inkA }); ctx.restore(); } ctx.save(); }
      else if (S.top === 'antenna') { ctx.lineWidth = lw * 0.9; const sw = Math.sin(t * 2.2 + n.seed) * 5; ctx.beginPath(); ctx.moveTo(0, topY + 3); ctx.quadraticCurveTo(3, topY - h * 0.14, sw, topY - h * 0.24); ctx.stroke(); ctx.restore(); const g = ellG(h * 0.06, h * 0.06, 51); ctx.save(); ctx.translate(sw, topY - h * 0.26); fillInk(ctx, g, col(S.knob ?? 'b'), a, { rim: 0, hatch: 0.4, lw: lw * 0.8, inkA }); ctx.restore(); ctx.save(); }
      else if (S.top === 'cap') { ctx.restore(); const g = inked(`cap${f1(w)}`, charCache, ellPts(w * 0.4, h * 0.14).filter(([, py]) => py <= 0).concat([[-w * 0.46, 0], [w * 0.46, 0]]).map(([px, py]) => [px, py]), true, 61, WOB * 0.6); ctx.save(); ctx.translate(0, topY + h * 0.1); fillInk(ctx, g, col(S.capTone ?? 'a0'), a, { rim: 4, hatch: 0.6, lw: lw * 0.9, inkA }); ctx.restore(); ctx.save(); }
      else if (S.top === 'cilia' || S.kind === 'pillar') { ctx.lineWidth = lw * 0.6; for (let i = 0; i < 6; i++) { const cx = -w * 0.34 + (i * w * 0.68) / 5, sw = Math.sin(t * 5 - i * 0.9 + n.seed) * 6; ctx.beginPath(); ctx.moveTo(cx, topY + 2); ctx.quadraticCurveTo(cx + sw * 0.4, topY - h * 0.07, cx + sw, topY - h * 0.13); ctx.stroke(); } }
      ctx.restore();
      // badge: a cream disc on the chest with a letter
      if (S.badge) { const g = ellG(w * 0.13, w * 0.13, 71); ctx.save(); ctx.translate(dir * w * 0.0, -foot - h * 0.2); fillInk(ctx, g, C0.cream, a, { rim: 0, hatch: 0.3, lw: lw * 0.7, inkA }); ctx.globalAlpha = a; ctx.fillStyle = C0.ink; ctx.font = `700 ${f1(w * 0.15)}px ${FONT.mono}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(S.badge, 0, 1); ctx.restore(); }
      // face
      const fx = faceAt(n, t), lk = lookAt(n, t), es = Math.min(w, h) * 0.058 * (S.eyeScale ?? 1), ex = w * (S.eyeGap ?? 0.17), ey = (S.kind === 'bean' ? -foot - h * 0.55 : S.kind === 'pillar' || S.kind === 'capsule' ? -foot - h * 0.66 : cy - h * 0.06) + (po.lookUp ? -es * 0.6 * po.lookUp : 0);
      const ox = (lk.dx + (po.walking ? po.dir * 0.4 : 0)) * es * 0.9 + (S.facing && !lk.dx && !po.walking ? 0 : 0), oy = lk.dy * es * 0.7 - (po.lookUp ?? 0) * es * 0.6;
      let eyes = ghost > 0.5 ? 'closed' : fx.eyes; const bl = blinkAt(n, t); if ((eyes === 'dot' || eyes === 'wide' || eyes === 'half') && bl > 0.5) eyes = 'closed';
      ctx.save(); ctx.globalAlpha = a * inkA; ctx.fillStyle = C0.ink; ctx.strokeStyle = C0.ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const sd of [-1, 1]) {
        const px = sd * ex + ox, py = ey + oy;
        ctx.save(); ctx.translate(px, py);
        if (eyes === 'dot' || eyes === 'half') { ctx.beginPath(); ctx.ellipse(0, 0, es * 0.82, es * 1.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C0.white; ctx.beginPath(); ctx.arc(-es * 0.28, -es * 0.42, es * 0.3, 0, Math.PI * 2); ctx.fill(); if (eyes === 'half') { ctx.fillStyle = fill; ctx.fillRect(-es * 1.2, -es * 1.5, es * 2.4, es * 1.35); ctx.lineWidth = lw * 0.7; ctx.beginPath(); ctx.moveTo(-es * 1.05, -es * 0.18); ctx.lineTo(es * 1.05, -es * 0.18); ctx.stroke(); } }
        else if (eyes === 'wide') { ctx.fillStyle = C0.white; ctx.beginPath(); ctx.ellipse(0, 0, es * 1.25, es * 1.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = lw * 0.6; ctx.stroke(); ctx.fillStyle = C0.ink; ctx.beginPath(); ctx.arc(lk.dx * es * 0.4, lk.dy * es * 0.3, es * 0.62, 0, Math.PI * 2); ctx.fill(); }
        else if (eyes === 'happy') { ctx.lineWidth = Math.max(lw * 0.85, es * 0.55); ctx.beginPath(); ctx.moveTo(-es * 1.15, es * 0.45); ctx.quadraticCurveTo(0, -es * 1.3, es * 1.15, es * 0.45); ctx.stroke(); }
        else if (eyes === 'closed') { ctx.lineWidth = Math.max(lw * 0.8, es * 0.45); ctx.beginPath(); ctx.moveTo(-es * 1.05, 0); ctx.quadraticCurveTo(0, es * 0.55, es * 1.05, 0); ctx.stroke(); }
        else if (eyes === 'x') { ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.moveTo(-es, -es); ctx.lineTo(es, es); ctx.moveTo(es, -es); ctx.lineTo(-es, es); ctx.stroke(); }
        if (fx.brows) { ctx.lineWidth = lw * 0.75; const k = fx.brows === 'angry' ? 1 : -1; ctx.beginPath(); ctx.moveTo(-es * 1.2 * sd * -1 * 0 - es * 1.1, -es * 1.9 + k * sd * -es * 0.0 - (k > 0 ? (sd > 0 ? es * 0.35 : -es * 0.35) * -1 : 0)); ctx.lineTo(es * 1.1, -es * 1.9 + (k > 0 ? (sd > 0 ? es * 0.45 : -es * 0.45) : (sd > 0 ? -es * 0.4 : es * 0.4))); ctx.stroke(); }
        ctx.restore();
      }
      // cheeks
      if (S.cheeks && ghost < 0.5) { ctx.save(); ctx.globalAlpha = a * 0.85; for (const sd of [-1, 1]) { const g = ellG(es * 1.25, es * 0.7, 81); ctx.save(); ctx.translate(sd * (ex + es * 1.5) + ox * 0.5, ey + es * 1.7); ctx.fillStyle = col(S.cheekTone ?? 'pink'); ctx.fill(g.fill); ctx.globalAlpha = a * 0.6; ctx.fillStyle = pat(ctx, mixHex(col(S.cheekTone ?? 'pink'), '#ffffff', 0.4), 'light'); ctx.fill(g.fill); ctx.restore(); } ctx.restore(); }
      // mouth
      const my = ey + es * 2.0 + oy * 0.5, mxp = ox * 0.6, mo = Math.max(po.mouthOpen, fx.mouth === 'chomp' ? 0.25 : 0);
      ctx.lineWidth = lw * 0.75;
      if (mo > 0.02 || fx.mouth === 'grin') { const mw = es * (fx.mouth === 'grin' ? 1.4 : 1.2 + mo * 1.6), mh = es * (fx.mouth === 'grin' ? 1.1 : 0.4 + mo * 2.6); ctx.beginPath(); ctx.moveTo(mxp - mw, my - mh * 0.15); ctx.quadraticCurveTo(mxp, my + mh * 1.6, mxp + mw, my - mh * 0.15); ctx.closePath(); ctx.fillStyle = mixHex(C0.ink, C0.red, 0.35); ctx.fill(); ctx.stroke(); }
      else if (fx.mouth === 'o') { ctx.beginPath(); ctx.ellipse(mxp, my + es * 0.2, es * 0.45, es * 0.6, 0, 0, Math.PI * 2); ctx.fillStyle = mixHex(C0.ink, C0.red, 0.35); ctx.fill(); ctx.stroke(); }
      else if (fx.mouth === 'smile') { ctx.beginPath(); ctx.moveTo(mxp - es * 0.8, my); ctx.quadraticCurveTo(mxp, my + es * 0.9, mxp + es * 0.8, my); ctx.stroke(); }
      else if (fx.mouth === 'smirk') { ctx.beginPath(); ctx.moveTo(mxp - es * 0.9, my + es * 0.2); ctx.quadraticCurveTo(mxp + es * 0.2, my + es * 0.6, mxp + es * 0.95, my - es * 0.35); ctx.stroke(); }
      else if (fx.mouth === 'frown') { ctx.beginPath(); ctx.moveTo(mxp - es * 0.8, my + es * 0.5); ctx.quadraticCurveTo(mxp, my - es * 0.3, mxp + es * 0.8, my + es * 0.5); ctx.stroke(); }
      else if (fx.mouth === 'flat') { ctx.beginPath(); ctx.moveTo(mxp - es * 0.7, my + es * 0.2); ctx.lineTo(mxp + es * 0.7, my + es * 0.2); ctx.stroke(); }
      else if (fx.mouth === 'wobble') { ctx.beginPath(); ctx.moveTo(mxp - es * 1.0, my + es * 0.3); for (let i = 1; i <= 4; i++) ctx.lineTo(mxp - es * 1.0 + i * es * 0.5, my + es * 0.3 + (i % 2 ? -es * 0.35 : 0)); ctx.stroke(); }
      ctx.restore();
      // a card held in front of the body, then the mittens over its edges
      const cd = n.cards.filter((c) => t >= c.at && t < c.until).pop();
      if (cd) {
        const q = E.backOut(cl((t - cd.at) / 0.4)), cw = w * (S.cardW ?? 0.84), chh = h * 0.4, lines = cd.text.split('\n');
        const g = inked(`card${f1(cw)},${f1(chh)}`, charCache, rrPts(cw, chh, 4), true, 91, WOB * 0.5);
        ctx.save(); ctx.translate(-cw / 2, -foot - h * 0.4 + (1 - q) * 20); ctx.rotate(-2 * DEG); ctx.globalAlpha = a; ctx.scale(1, q); fillInk(ctx, g, C0.cream, a, { rim: 3, hatch: 0.3, lw: lw * 0.7, inkA });
        ctx.fillStyle = C0.ink; ctx.textBaseline = 'middle'; const fs = Math.min(h * 0.105, (cw * 0.8) / Math.max(1, Math.max(...lines.map((l) => units(l))))); ctx.font = `600 ${f1(fs)}px ${FONT.mono}`;
        if (cd.title) { ctx.fillStyle = col('red'); ctx.font = `600 ${f1(fs * 0.7)}px ${FONT.mono}`; ctx.fillText(cd.title, cw * 0.08, chh * 0.2); ctx.fillStyle = C0.ink; ctx.font = `600 ${f1(fs)}px ${FONT.mono}`; }
        ctx.textAlign = 'center'; lines.forEach((l, i) => ctx.fillText(l, cw / 2, (cd.title ? chh * 0.58 : chh * 0.5 - (lines.length - 1) * fs * 0.6) + i * fs * 1.2));
        ctx.restore();
        po.arms = 'hold';
      }
      arm(-1, true); arm(1, true);
      ctx.restore();
    };

    // background life: characters standing by glance around, nod or hop now and then (seeded) between a and b
    B.idle = (list, a, b, o = {}) => { for (const c of [].concat(list)) { const r = rngOf(c.seed ^ hash('idle' + a)); let t = a + r() * (o.every ?? 3); while (t < b - 0.8) { const k = r(); if (k < 0.4) c.look(t, r() < 0.5 ? -1 : 1, (r() - 0.5) * 0.6); else if (k < 0.65) c.act(t, 'nod', 0.6, { sfx: false }); else if (k < 0.85) c.act(t, 'bounce', 0.7, { n: 2, sfx: false }); else c.act(t, 'squash', 0.45, { sfx: false }); c.events.push(t); t += (o.every ?? 3) * (0.7 + r() * 0.6); } } return B; };

    // splitting into clones and merging back
    const splits = [], merges = [];
    B.split = (at, src, targets, o = {}) => {
      const x0 = pv(src, 'x', at, 0), y0 = pv(src, 'y', at, 0), out = [];
      src.act(at - 0.3, 'squash', 0.45, { sfx: false }); src.face(at - 0.3, 'happy', at + 0.6);
      targets.forEach((tg, i) => {
        const T = typeof tg === 'number' ? { x: tg } : tg, d0 = at + i * (o.every ?? 0.14);
        const c = B.char(T.name ?? `${src.name}·${i + 1}`, { ...src.spec, scale: 1, w: src.spec.w, h: src.spec.h, x: x0, y: y0, at: d0, enter: 'none', z: src.z - 1 - i * 0.01, ...(T.char || {}) });
        c.p.ghost = 1; c.to(d0 + 0.45, { ghost: 0 }, 0.55, E.sine);
        c.go(d0 + 0.05, T.x, T.dur ?? cl(Math.abs(T.x - x0) / 330, 0.6, 2.6), { sfx: false });
        if (T.card) c.carry(d0 + 0.7, T.card, { title: T.cardTitle });
        if (T.tag) c.say(T.tag, d0 + 0.85, T.tagUntil, { sub: T.sub, subAt: T.subAt });
        out.push(c);
      });
      B.puff(at, x0, y0 - src.spec.h * 0.4, { r: src.spec.w * 0.6, sfx: false }); F.sfx(at - 0.05, 'split', 0.5);
      splits.push({ at, src, out }); F.info && F.info('split', at, at + 3);
      return out;
    };
    B.merge = (at, list, into, o = {}) => {
      const xt = o.x ?? pv(into, 'x', at, 0); let last = at;
      list.forEach((c, i) => { if (c === into) return; const a = at + i * (o.every ?? 0.1), d = o.dur ?? 0.7; c.jump(a, { x: xt }, { dur: d, h: c.spec.h * 0.9 }); c.until = a + d + 0.02; c.exit = 'merge'; c.outDur = 0.22; last = Math.max(last, a + d); });
      if (o.x !== undefined) into.go(at, o.x, 0.6);
      into.act(last - 0.05, 'squash', 0.5); into.face(last, o.face ?? 'happy', last + (o.hold ?? 2));
      B.puff(last, xt, pv(into, 'y', last, 0) - into.spec.h * 0.45, { r: into.spec.w * 0.75, sfx: false }); B.ticks(last + 0.1, xt, -into.spec.h * 0.55, { r: into.spec.w * 0.8 });
      F.sfx(last - 0.1, 'merge', 0.5);
      merges.push({ at, last, into, list }); F.info && F.info('merge', at, last + 2);
      return into;
    };

    // ---------- props (each a group; base-anchored: y = the ground under it, x = its centre unless noted) ----------
    const G0 = (o, extra = {}) => B.group({ x: o.x ?? 0, y: o.y ?? 0, at: o.at, until: o.until, enter: o.enter ?? (o.at > 0 ? 'rise' : 'none'), exit: o.exit, z: o.z ?? 0, in: o.in, sfx: o.sfx, ...extra });
    B.ground = (o = {}) => B.line({ pts: [[o.from ?? -3000, 0], [o.to ?? 3000, 0]], stroke: o.tone ?? 'grey', lw: o.lw ?? 2.4, z: -20, wob: 0.6, at: o.at, enter: o.enter ?? 'none', sfx: false });
    // the little stage: a low wooden platform on the ground line, its top dashed
    B.stage = (o = {}) => {
      const w = o.w ?? 900, d = o.d ?? 52, g = G0(o, { z: o.z ?? -10, enter: o.enter ?? (o.at > 0 ? 'fade' : 'none') });
      g.poly({ pts: [[-w / 2 - d * 0.7, d * 0.62], [w / 2 + d * 0.7, d * 0.62], [w / 2, 0], [-w / 2, 0]], fill: o.tone ?? 'beige', hatch: 0.55, rim: 6, lw: 3 });
      g.rect({ x: -w / 2 - d * 0.7, y: d * 0.62, w: w + d * 1.4, h: d * 0.3, r: 3, fill: 'sand', hatch: 0.8, rim: 4, lw: 3 });
      g.poly({ pts: [[-w / 2 - d * 0.25, d * 0.5], [w / 2 + d * 0.25, d * 0.5], [w / 2 - d * 0.1, d * 0.1], [-w / 2 + d * 0.1, d * 0.1]], fill: null, stroke: o.dash ?? 'a', lw: 2, dash: [10, 9], wob: 0.4 });
      return g;
    };
    // a filing cabinet with tab labels; drawers[i].open(at) slides one out and sends papers flying
    B.cabinet = (o = {}) => {
      const w = o.w ?? 170, labels = o.drawers ?? ['', '', '', ''], dh = o.dh ?? 78, h = labels.length * dh + 24, g = G0(o);
      g.rect({ x: -w / 2, y: -h, w, h, r: 4, fill: o.tone ?? 'beige', hatch: 0.7, lw: 4 });
      g.poly({ pts: [[-w / 2, -h], [-w / 2 + 16, -h - 14], [w / 2 + 16, -h - 14], [w / 2, -h]], fill: 'cream', hatch: 0.5, rim: 0, lw: 3.5 });
      g.drawers = labels.map((lab, i) => {
        const y = -h + 12 + i * dh, d = g.group({ x: 0, y, z: 2 });
        d.rect({ x: -w / 2 + 10, y: 0, w: w - 20, h: dh - 10, r: 3, fill: 'cream', hatch: 0.5, lw: 3.4 });
        d.rect({ x: -w * 0.22, y: dh * 0.62, w: w * 0.44, h: 9, r: 3, fill: 'wood', hatch: 0.6, rim: 2, lw: 2.6 });
        if (lab) { d.rect({ x: -w * 0.2, y: dh * 0.14, w: w * 0.4, h: dh * 0.32, r: 2, fill: 'white', hatch: 0.2, rim: 0, lw: 2.4 }); d.text(lab, { x: 0, y: dh * 0.3, size: Math.min(dh * 0.24, (w * 0.36) / Math.max(1, units(lab)) / 0.95), align: 'center', tone: 'ink' }); }
        d.open = (at, k = 1) => { d.to(at, { y: y + 10 * k, x: -14 * k, sx: 1.06 }, 0.35, E.backOut); F.sfx(at, 'drawer', 0.4); return d; };
        d.close = (at) => { d.to(at, { y, x: 0, sx: 1 }, 0.3, E.cubicInOut); F.sfx(at, 'drawer', 0.3); return d; };
        return d;
      });
      B.shadow({ x: o.x ?? 0, w: w * 1.15, at: o.at, in: o.in });
      F.info && F.info('cabinet', o.at ?? 0, o.until);
      return g;
    };
    // an easel with a sheet of lines (code, a recipe, a rule); returns g with .lines (text nodes: .to, strike / mark are options)
    B.easel = (o = {}) => {
      const w = o.w ?? 340, lh = o.lh ?? 40, sh = o.sh ?? (o.lines ? 64 + o.lines.length * lh : 220), legH = o.legH ?? 190, g = G0(o);
      g.line({ pts: [[-w * 0.42, 0], [-w * 0.3, -legH - sh]], lw: 6, stroke: 'wood', z: -1 }); g.line({ pts: [[w * 0.42, 0], [w * 0.3, -legH - sh]], lw: 6, stroke: 'wood', z: -1 }); g.line({ pts: [[0, -legH - sh * 0.5], [w * 0.1, 0]], lw: 5, stroke: 'sand', z: -3 });
      g.rect({ x: -w / 2 - 8, y: -legH - 6, w: w + 16, h: 12, r: 3, fill: 'wood', hatch: 0.7, rim: 3, lw: 3 });
      const sheet = g.group({ x: -w / 2, y: -legH - sh });
      sheet.rect({ x: 0, y: 0, w, h: sh, r: 4, fill: 'cream', hatch: 0.45, lw: 4 });
      if (o.title) { sheet.rect({ x: 0, y: 0, w, h: 40, r: 4, fill: 'beige', hatch: 0.5, rim: 3, lw: 3 }); sheet.circle({ x: 22, y: 20, r: 7, fill: 'red', rim: 0, hatch: 0, lw: 2.4 }); sheet.text(o.title, { x: 40, y: 21, size: 24, weight: 700, tone: 'ink' }); }
      g.lines = (o.lines || []).map((l, i) => { const L = typeof l === 'string' ? { text: l } : l; return sheet.text(L.text, { x: 24, y: (o.title ? 70 : 32) + i * lh, size: L.size ?? 27, tone: L.tone ?? 'ink', at: L.at, enter: L.at ? 'fade' : 'none', type: L.type, strike: L.strike, mark: L.mark, weight: L.weight, noFact: L.noFact }); });
      g.sheet = sheet;
      B.shadow({ x: o.x ?? 0, w: w * 1.0, at: o.at, in: o.in });
      F.info && F.info('easel', o.at ?? 0, o.until);
      return g;
    };
    // a monitor on a stand, dark screen, log lines that type in ({ text, at, tone: 'green' | 'red' | 'b2' …, ok: true → a ✓ line })
    B.monitor = (o = {}) => {
      const w = o.w ?? 360, h = o.h ?? 250, standH = o.standH ?? 70, g = G0(o);
      g.rect({ x: -w * 0.28, y: -12, w: w * 0.56, h: 12, r: 4, fill: 'beige', hatch: 0.6, rim: 3, lw: 3.4 }); g.rect({ x: -w * 0.07, y: -standH, w: w * 0.14, h: standH - 10, r: 2, fill: 'cream', hatch: 0.6, rim: 4, lw: 3.4 });
      const sc = g.group({ x: -w / 2, y: -standH - h });
      sc.rect({ x: 0, y: 0, w, h, r: 10, fill: 'cream', hatch: 0.5, lw: 4.2 });
      if (o.title !== false) { for (let i = 0; i < 3; i++) sc.circle({ x: 22 + i * 20, y: 20, r: 6, fill: ['red', 'b', 'green'][i], hatch: 0, rim: 0, lw: 2 }); if (o.title) sc.text(o.title, { x: 90, y: 21, size: 18, tone: 'grey', weight: 600 }); }
      sc.rect({ x: 16, y: o.title === false ? 16 : 38, w: w - 32, h: h - (o.title === false ? 32 : 54), r: 6, fill: 'screen', hatch: 0.25, rim: 0, gloss: 0, lw: 3.4 });
      const top = o.title === false ? 40 : 62, lh = o.lh ?? 30;
      g.lines = (o.lines || []).map((l, i) => { const L = typeof l === 'string' ? { text: l } : l; const s = (L.ok ? '✓ ' : L.bad ? '✗ ' : '') + L.text; const tx = sc.text(s, { x: 32, y: top + i * lh, size: L.size ?? 20, tone: L.tone ?? (L.ok ? 'green' : L.bad ? 'red' : 'cream'), at: L.at, enter: L.at ? 'fade' : 'none', inDur: 0.12, type: L.at ? { at: L.at, per: L.per ?? 0.03 } : null, strike: L.strike, mark: L.mark, weight: L.ok ? 700 : 600, fact: L.text, noFact: L.noFact }); if (L.at) F.sfx(L.at, L.ok ? 'ding' : 'type', L.ok ? 0.4 : 0.25, { dur: [...s].length * (L.per ?? 0.03) }); return tx; });
      g.screen = sc;
      B.shadow({ x: o.x ?? 0, w: w * 0.7, at: o.at, in: o.in });
      F.info && F.info('monitor', o.at ?? 0, o.until);
      return g;
    };
    // a big push button on a round base: .press(at)
    B.button = (o = {}) => {
      const r = o.r ?? 110, g = G0(o);
      g.ellipse({ x: 0, y: -18, rx: r * 1.25, ry: r * 0.28, fill: 'cream', hatch: 0.5, lw: 3.6 }); g.rect({ x: -r * 1.25, y: -18, w: r * 2.5, h: 18, r: 3, fill: 'beige', hatch: 0.6, rim: 3, lw: 3.4, z: -1 });
      const cap = g.group({ x: 0, y: -22, z: 1 });
      cap.rect({ x: -r * 0.85, y: -r * 0.36, w: r * 1.7, h: r * 0.36, r: 6, fill: o.tone ?? 'a', hatch: 0.6, lw: 3.6 }); cap.ellipse({ x: 0, y: -r * 0.36, rx: r * 0.85, ry: r * 0.2, fill: o.tone ?? 'a', hatch: 0.6, lw: 3.6, rim: 4 });
      if (o.label) cap.text(o.label, { x: 0, y: -r * 0.17, size: r * 0.2, align: 'center', tone: 'cream', weight: 700 });
      g.press = (at) => { cap.to(at, { sy: 0.45 }, 0.12, E.quartOut); cap.to(at + 0.16, { sy: 1 }, 0.35, E.backOut); F.sfx(at, 'press', 0.5); B.ticks(at + 0.05, o.x ?? 0, (o.y ?? 0) - 40, { r: r * 1.1, in: o.in }); return g; };
      cap.p.pivot = 'bottom';
      B.shadow({ x: o.x ?? 0, w: r * 2.7, at: o.at, in: o.in });
      return g;
    };
    // stacking blocks with labels: each drops onto the one under it; { text, tone, at, out: { at } (knocked off, struck) }
    B.blocks = (o = {}) => {
      const w = o.w ?? 330, bh = o.bh ?? 64, g = G0(o, { enter: 'none' });
      g.items = (o.items || []).map((it, i) => {
        const I = typeof it === 'string' ? { text: it } : it, y = -(i + 1) * bh, tone = I.tone ?? (i % 2 ? 'a' : 'cream');
        const b = g.group({ x: (I.dx ?? 0), y, at: I.at ?? o.at, enter: 'drop', dropH: 320, z: i });
        b.rect({ x: -w / 2, y: 0, w: w - (i % 2 ? 12 : 0), h: bh - 4, r: 5, fill: tone, hatch: 0.6, lw: 3.8 });
        b.text(I.text, { x: (w - (i % 2 ? 12 : 0)) / 2 - w / 2, y: bh * 0.47, size: Math.min(bh * 0.4, (w * 0.8) / Math.max(1, units(I.text)) / 0.95), align: 'center', tone: tone === 'cream' || tone === 'white' || tone === 'beige' ? 'ink' : 'cream', weight: 700, strike: I.out ? { at: I.out.at - 0.5 } : null });
        if (I.at ?? o.at) F.sfx((I.at ?? o.at) + 0.42, 'clack', 0.45);
        if (I.out) { b.to(I.out.at, { x: (I.out.x ?? -w * 0.95), y: -bh * 0.5, rot: I.out.rot ?? -12 }, 0.6, E.cubicInOut); F.sfx(I.out.at, 'clack', 0.35); }
        return b;
      });
      F.info && F.info('blocks', o.at ?? (o.items && o.items[0] && o.items[0].at) ?? 0, o.until);
      return g;
    };
    // a signpost card on a stick: a small red title over a line with a › mark
    B.sign = (o = {}) => {
      const w = o.w ?? Math.max(220, units('› ' + (o.text ?? '')) * (o.size ?? 26) + 40), hh = o.ch ?? (o.text && String(o.text).includes('\n') ? 112 : 86), h = o.h ?? 170, g = G0(o);
      g.rect({ x: -4, y: -h, w: 8, h, r: 2, fill: 'wood', hatch: 0.6, rim: 2, lw: 3 });
      g.rect({ x: -w / 2, y: -h - hh * 0.6, w, h: hh, r: 4, fill: 'white', hatch: 0.3, lw: 3.6, rot: o.tilt ?? -2, pivot: 'center' });
      g.circle({ x: w / 2 - 16, y: -h - hh * 0.6 + 14, r: 7, fill: 'red', hatch: 0, rim: 0, lw: 2.2 });
      if (o.title !== false) g.text(o.title ?? M('任务', 'task'), { x: -w / 2 + 14, y: -h - hh * 0.6 + 17, size: 19, tone: 'red', weight: 600, noFact: o.title === undefined });
      g.text('› ' + (o.text ?? ''), { x: -w / 2 + 14, y: -h - hh * 0.6 + (o.title === false ? hh * 0.45 : 46), size: o.size ?? 26, tone: 'ink', weight: 600, fact: o.text });
      F.info && F.info('sign', o.at ?? 0, o.until);
      return g;
    };
    // a paper plane flying from → to along an arc (a message), lands or fades
    B.plane = (o = {}) => {
      const [x0, y0] = o.from, [x1, y1] = o.to, at = o.at ?? 0, d = o.dur ?? 1.2, arc = o.arc ?? 120, s = o.size ?? 1;
      const pos = (q) => [lerp(x0, x1, q), lerp(y0, y1, q) - arc * 4 * q * (1 - q)];
      const g = B.group({ x: (t) => pos(E.sine(cl((t - at) / d)))[0], y: (t) => pos(E.sine(cl((t - at) / d)))[1] + Math.sin(t * 9) * 3, rot: (t) => { const q = E.sine(cl((t - at) / d)), a = pos(q), b = pos(Math.min(1, q + 0.02)); return Math.atan2(b[1] - a[1], b[0] - a[0]) / DEG + (x1 < x0 ? 180 : 0); }, sx: x1 < x0 ? -1 : 1, at, until: o.until ?? at + d + 0.35, enter: 'fade', inDur: 0.15, exit: 'fade', z: o.z ?? 9, pivot: 'center', sfx: false, in: o.in });
      g.poly({ pts: [[-30 * s, -12 * s], [30 * s, 0], [-30 * s, 12 * s], [-18 * s, 0]], fill: o.tone ?? 'white', hatch: 0.3, rim: 0, lw: 3 });
      g.line({ pts: [[-18 * s, 0], [30 * s, 0]], lw: 2.2 });
      F.sfx(at, 'plane', 0.4, { dur: d });
      return g;
    };
    // loose sheets on the ground or flying up out of something
    B.papers = (o = {}) => {
      const r = rngOf(SEED ^ hash('papers' + (o.x ?? 0) + (o.at ?? 0))), n = o.n ?? 5, out = [];
      for (let i = 0; i < n; i++) {
        const x = (o.x ?? 0) + (r() - 0.5) * (o.w ?? 260), rot = (r() - 0.5) * 50, fly = o.fly, at = (o.at ?? 0) + i * (o.every ?? 0.08);
        const p = B.group({ x: fly ? (t) => x + (r2(i) - 0.5) * 140 * E.quartOut(cl((t - at) / 1.2)) : x, y: fly ? (t) => (o.y ?? 0) - 220 * bump(cl((t - at) / 1.6)) * (1 - 0.3 * i / n) + 0 : (o.y ?? 0), rot: fly ? (t) => rot + (t - at) * 90 * (i % 2 ? 1 : -1) * (t < at + 1.6 ? 1 : 0) : rot, at, until: o.until, enter: 'pop', z: o.z ?? 3, sfx: i === 0, in: o.in, pivot: 'center' });
        p.rect({ x: -24, y: -32, w: 48, h: 34, r: 2, fill: 'white', hatch: 0.25, rim: 0, lw: 2.6 }); for (let k = 0; k < 3; k++) p.line({ pts: [[-16, -24 + k * 9], [12 - k * 5, -24 + k * 9]], lw: 1.6, stroke: 'grey' });
        out.push(p);
      }
      const r2 = (i) => ((SEED >>> (i % 20)) % 1000) / 1000;
      if (o.at) F.sfx(o.at, 'paper', 0.4);
      return out;
    };
    // a row of cards that flip from blank to ✓ (or ✗): a count told as things; { n, ok: number or [bool], at, every, w, h, gap, label }
    B.cards = (o = {}) => {
      const n = o.n ?? 8, w = o.w ?? 58, h = o.h ?? 74, gap = o.gap ?? 14, at = o.at ?? 0, every = o.every ?? 0.12, flipAt = o.flipAt ?? at + 0.5, x0 = (o.x ?? 0) - ((n - 1) * (w + gap)) / 2;
      const oks = Array.isArray(o.ok) ? o.ok : Array.from({ length: n }, (_, i) => i < (o.ok ?? n));
      const out = [];
      for (let i = 0; i < n; i++) {
        const fa = flipAt + i * (o.flipEvery ?? every), c = B.group({ x: x0 + i * (w + gap), y: o.y ?? 0, at: at + i * every, until: o.until, enter: o.enter ?? 'drop', dropH: 160, z: o.z ?? 2, sfx: false, in: o.in, rot: o.scatter ? ((i * 37) % 11) - 5 : 0 });
        c.rect({ x: -w / 2, y: -h, w, h, r: 5, fill: 'white', hatch: 0.25, lw: 3.2, sx: (t) => (o.flip === false ? 1 : t < fa ? 1 : Math.abs(Math.cos(cl((t - fa) / 0.3) * Math.PI))), pivot: 'center' });
        if (o.flip !== false) {
          const okI = oks[i];
          c.path({ d: okI ? `M${-w * 0.24} ${-h * 0.52} L${-w * 0.05} ${-h * 0.32} L${w * 0.28} ${-h * 0.72}` : `M${-w * 0.22} ${-h * 0.7} L${w * 0.22} ${-h * 0.3} M${w * 0.22} ${-h * 0.7} L${-w * 0.22} ${-h * 0.3}`, fill: null, stroke: okI ? 'green' : 'red', lw: 6, at: fa + 0.15, enter: 'draw', inDur: 0.25 });
          F.sfx(fa + 0.1, i === n - 1 ? 'ding' : 'flip', i === n - 1 ? 0.4 : 0.22);
        }
        out.push(c);
      }
      F.sfx(at, 'paper', 0.3, { dur: n * every });
      F.info && F.info('cards', at, o.until);
      return out;
    };
    // an alarm bell on a post that rings (shakes with ticks) at each time in ring: [t…]
    B.bell = (o = {}) => {
      const h = o.h ?? 230, g = G0(o), ring = [].concat(o.ring ?? []);
      g.rect({ x: -5, y: -h, w: 10, h, r: 2, fill: 'wood', hatch: 0.6, rim: 2, lw: 3 });
      const b = g.group({ x: 0, y: -h, rot: (t) => { let r = 0; for (const a of ring) if (t >= a && t < a + 1) r += 16 * Math.sin((t - a) * 34) * (1 - (t - a)); return r; }, pivot: 'top' });
      b.path({ d: 'M-46 4 Q-44 -56 0 -60 Q44 -56 46 4 Z', fill: o.tone ?? 'red', hatch: 0.6, lw: 4 }); b.rect({ x: -54, y: 0, w: 108, h: 12, r: 5, fill: 'cream', hatch: 0.4, rim: 2, lw: 3.4 }); b.circle({ x: 0, y: 18, r: 9, fill: 'ink', hatch: 0, rim: 0, lw: 2 });
      for (const a of ring) { F.sfx(a, 'bell', 0.5, { dur: 1 }); B.ticks(a + 0.05, (o.x ?? 0), (o.y ?? 0) - h - 30, { r: 90, in: o.in }); }
      return g;
    };
    // a thermometer: the column rises from → to (°C) between at and at + dur; the reading ticks beside it
    B.thermo = (o = {}) => {
      const h = o.h ?? 300, lo = o.min ?? 35, hi = o.max ?? 41, at = o.at ?? 0, d = o.dur ?? 1.6, g = G0(o);
      const val = (t) => lerp(o.from ?? 36.5, o.to ?? 38, E.cubicInOut(cl((t - (o.riseAt ?? at + 0.4)) / d)));
      const yOf = (v) => -60 - ((v - lo) / (hi - lo)) * (h - 110);
      g.rect({ x: -22, y: -h, w: 44, h: h - 40, r: 22, fill: 'white', hatch: 0.25, lw: 4 });
      g.circle({ x: 0, y: -40, r: 38, fill: 'red', hatch: 0.6, lw: 4 });
      g.rect({ x: -9, y: (t) => yOf(val(t)), w: 18, h: (t) => -60 - yOf(val(t)) + 10, r: 8, fill: 'red', hatch: 0.4, rim: 0, gloss: 0, stroke: null, wob: 0.3 });
      for (let v = Math.ceil(lo); v <= hi; v++) g.line({ pts: [[22, yOf(v)], [v % 1 === 0 ? 38 : 30, yOf(v)]], lw: 2.4 });
      const fmt = o.format ?? ((v) => v.toFixed(1) + '°C');
      if (o.reading !== false) g.text(fmt(o.from ?? 36.5), { x: 56, y: (t) => yOf(val(t)), size: o.size ?? 30, weight: 700, tone: 'red', font: 'hand', fact: fmt(o.to ?? 38) }).p.text = (t) => fmt(val(t));
      F.sfx(o.riseAt ?? at + 0.4, 'rise', 0.35, { dur: d });
      F.info && F.info('thermo', at, o.until);
      return g;
    };
    // a poster pinned to a board: a title strip and a drawing (draw: (g, { w, h }) => …)
    B.poster = (o = {}) => {
      const w = o.w ?? 200, h = o.h ?? 250, g = G0(o, { enter: o.enter ?? (o.at > 0 ? 'pop' : 'none') });
      g.rect({ x: -w / 2, y: -h, w, h, r: 3, fill: 'cream', hatch: 0.45, lw: 3.8, rot: o.tilt ?? 2, pivot: 'center' });
      if (o.title) g.text(o.title, { x: 0, y: -h + 30, size: o.size ?? 30, weight: 700, align: 'center', tone: 'red', font: 'hand' });
      const inner = g.group({ x: 0, y: -h * 0.42 });
      if (o.draw) o.draw(inner, { w, h });
      if (o.caption) g.text(o.caption, { x: 0, y: -24, size: 18, align: 'center', tone: 'ink', weight: 600 });
      g.circle({ x: 0, y: -h + 6, r: 7, fill: 'red', hatch: 0, rim: 0, lw: 2 });
      g.inner = inner;
      F.info && F.info('poster', o.at ?? 0, o.until);
      return g;
    };
    // a small building (a station, a headquarters) with a door that opens: .door(at)
    B.house = (o = {}) => {
      const w = o.w ?? 300, h = o.h ?? 230, g = G0(o);
      g.rect({ x: -w / 2, y: -h, w, h, r: 4, fill: o.tone ?? 'cream', hatch: 0.6, lw: 4.2 });
      g.poly({ pts: [[-w / 2 - 24, -h + 4], [0, -h - (o.roof ?? 110)], [w / 2 + 24, -h + 4]], fill: o.roofTone ?? 'a', hatch: 0.6, lw: 4.2 });
      const dw = w * 0.26, dh = h * 0.5;
      g.rect({ x: -dw / 2, y: -dh, w: dw, h: dh, r: 3, fill: 'screen', hatch: 0.2, rim: 0, gloss: 0, lw: 3.4, z: 1 });
      const door = g.group({ x: -dw / 2, y: -dh, z: 2, pivot: [0, 0.5] }); door.rect({ x: 0, y: 0, w: dw, h: dh, r: 3, fill: 'wood', hatch: 0.6, lw: 3.4 }); door.circle({ x: dw * 0.8, y: dh * 0.55, r: 4, fill: 'cream', hatch: 0, rim: 0, lw: 2 });
      for (const sd of [-1, 1]) g.rect({ x: sd * w * 0.3 - 26, y: -h * 0.78, w: 52, h: 44, r: 3, fill: 'b2', hatch: 0.4, rim: 3, lw: 3.2 });
      if (o.label) { g.rect({ x: -w * 0.36, y: -h - 22, w: w * 0.72, h: 44, r: 4, fill: 'white', hatch: 0.25, rim: 0, lw: 3.2, z: 3 }); g.text(o.label, { x: 0, y: -h, size: Math.min(26, (w * 0.66) / Math.max(1, units(o.label)) / 0.95), align: 'center', weight: 700, tone: 'ink', z: 4 }); }
      g.door = (at, open = true) => { door.to(at, { sx: open ? 0.15 : 1 }, 0.35, E.cubicInOut); F.sfx(at, 'drawer', 0.3); return g; };
      B.shadow({ x: o.x ?? 0, w: w * 1.1, at: o.at, in: o.in });
      return g;
    };
    // a crate / box with a label on its side
    B.box = (o = {}) => { const w = o.w ?? 140, h = o.h ?? 110, g = G0(o, { enter: o.enter ?? (o.at > 0 ? 'drop' : 'none') }); g.rect({ x: -w / 2, y: -h, w, h, r: 4, fill: o.tone ?? 'wood', hatch: 0.7, lw: 4 }); g.line({ pts: [[-w / 2 + 8, -h * 0.5], [w / 2 - 8, -h * 0.5]], lw: 2.6, stroke: 'ink' }); if (o.label) g.text(o.label, { x: 0, y: -h * 0.26, size: Math.min(22, (w * 0.8) / Math.max(1, units(o.label))), align: 'center', weight: 700, tone: 'ink' }); return g; };

    // ---------- tags: small dark monospace chips above a character or a prop, with a ✓ result line under them (DOM: the checks see them) ----------
    const tags = [];
    B.tag = (text, o = {}) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, size = (o.size ?? (PT ? 40 : 46)) * (FLAT ? U : 1), parent = FLAT ? o.layer ?? curLayer : wl;   // flat: positions in world units, drawn at U px each
      const box = el('div', `left:0;top:0;display:none;flex-direction:column;align-items:${o.align ?? 'center'};gap:${f1(size * 0.3)}px;transform-origin:50% 100%;white-space:nowrap;pointer-events:none;${FLAT ? 'z-index:4;' : ''}`, parent);
      const chip = (s, cls) => { const e = el('div', `position:relative;display:inline-block;background:${o.light ? C0.cream : C0.screen};color:${o.light ? C0.ink : C0.cream};font:600 ${size}px/1.3 ${FONT.mono};padding:${f1(size * 0.16)}px ${f1(size * 0.55)}px;border-radius:${f1(size * 0.26)}px;box-shadow:0 ${f1(size * 0.13)}px 0 rgba(43,37,33,.2)${o.light ? `,0 0 0 ${f1(size * 0.1)}px ${C0.ink}` : ''}`, box); e.textContent = s; return e; };
      const main = chip((o.prompt ? '› ' : '') + text);
      const T = { box, main, o, at, until, text, size, sub: null };
      F.text(main, o.kind ?? 'label', text, at, until, { chrome: !!o.chrome });
      if (o.sub) {
        const subAt = o.subAt ?? at + 1, e = el('div', `position:relative;display:inline-block;background:${C0.screen};color:${C0.cream};font:600 ${f1(size * 0.92)}px/1.25 ${FONT.mono};padding:${f1(size * 0.18)}px ${f1(size * 0.5)}px;border-radius:${f1(size * 0.24)}px;box-shadow:0 ${f1(size * 0.12)}px 0 rgba(43,37,33,.2)`, box);
        const ck = el('span', `position:relative;color:${o.subBad ? C0.red : mixHex(C0.green, '#ffffff', 0.25)};margin-right:.45em`, e); ck.textContent = o.subBad ? '✗' : '✓'; const sp = el('span', 'position:relative', e); sp.textContent = o.sub;
        T.sub = { e, sp, at: subAt, text: String(o.sub) };
        F.text(e, o.kind ?? 'label', o.sub, subAt, until);
        F.sfx(subAt, o.subBad ? 'bad' : 'ding', 0.35);
      }
      F.sfx(at, 'tag', 0.3);
      tags.push(T);
      return T;
    };
    const tagFrame = (t) => {
      for (const T of tags) {
        const on = t >= T.at && t < T.until; set(T.box, { display: on ? 'flex' : 'none' }); if (!on) continue;
        let x = T.o.x ?? 0, y = T.o.y ?? 0;
        if (T.o.on) { const b = wbox(T.o.on, t); x += b.x + b.w / 2 + (T.o.dx ?? 0); y += b.y - (T.o.gap ?? 22) + (T.o.dy ?? 0); }
        const qi = cl((t - T.at) / 0.35), qo = T.until < 1e8 ? cl((t - (T.until - 0.25)) / 0.25) : 0, s = E.backOut(qi) * (1 - backIn(qo) * 0.6);
        // a tag keeps one size on screen whatever the zoom (o.fixed: false lets it scale with the world), and stays inside the frame
        const v = FLAT ? null : camAt(t), z = v && T.o.fixed !== false ? v.z : 1, kk = v ? v.z * U : 1;
        let sx2 = v ? (x - v.x) * kk + W / 2 : x * U;
        const bw = (T.bw ??= T.box.offsetWidth) * (v ? (T.o.fixed === false ? kk : U) : 1), m = W * 0.03;
        if (sx2 - bw / 2 < m) sx2 = m + bw / 2; if (sx2 + bw / 2 > W - m) sx2 = W - m - bw / 2;
        if (v) x = (sx2 - W / 2) / kk + v.x; else x = sx2 / U;
        if (FLAT) { x *= U; y *= U; }
        set(T.box, { transform: `translate(${f1(x)}px,${f1(y)}px) translate(-50%,-100%) scale(${(s / z).toFixed(4)})`, opacity: String(cl(qi * 3) * (1 - qo)) });
        if (T.sub) { const sq = frameT(t) - T.sub.at, on2 = sq >= 0; set(T.sub.e, { display: on2 ? 'inline-block' : 'none' }); if (on2) { const n = [...T.sub.text].length, k2 = Math.min(n, Math.ceil(sq / 0.035)); const s2 = [...T.sub.text].slice(0, k2).join(''); if (T.sub.sp.textContent !== s2) T.sub.sp.textContent = s2 || '​'; } }
      }
    };
    // a headline in the world, hand-written (DOM): enter 'write' (wipes on left to right, like a pen) or 'pop'
    const titles = [];
    B.title = (text, o = {}) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, size = (o.size ?? 64) * (FLAT ? U : 1), parent = FLAT ? o.layer ?? curLayer : wl;
      const e = el('div', `left:0;top:0;display:none;white-space:${o.wrap ? 'normal' : 'nowrap'};${o.wrap ? `width:${o.wrap * (FLAT ? U : 1)}px;` : ''}font:${o.weight ?? 700} ${size}px/1.2 ${o.font === 'mono' ? FONT.mono : FONT.hand};color:${col(o.tone ?? 'ink')};text-align:${o.align ?? 'center'};letter-spacing:.02em;pointer-events:none;${FLAT ? 'z-index:4;' : ''}`, parent);
      e.textContent = text;
      const T = { e, o, at, until, enter: o.enter ?? (at > 0 ? 'write' : 'none'), text };
      F.text(e, o.kind ?? 'headline', o.fact ?? text, at, until, { noFact: !!o.noFact });
      if (at > 0 && o.sfx !== false) F.sfx(at, T.enter === 'write' ? 'draw' : 'pop', 0.35, { dur: 0.8 });
      titles.push(T);
      return T;
    };
    const titleFrame = (t) => {
      for (const T of titles) {
        const on = t >= T.at && t < T.until; set(T.e, { display: on ? '' : 'none' }); if (!on) continue;
        let x = T.o.x ?? 0, y = T.o.y ?? 0; if (T.o.on) { const b = wbox(T.o.on, t); x += b.x + b.w / 2; y += b.y; } if (FLAT) { x *= U; y *= U; }
        const dur = T.o.inDur ?? Math.min(1.4, 0.25 + units(T.text) * 0.07), qi = T.enter === 'none' ? 1 : cl((t - T.at) / dur), qo = T.until < 1e8 ? cl((t - (T.until - 0.3)) / 0.3) : 0, ox = T.o.align === 'left' ? 0 : T.o.align === 'right' ? -100 : -50;
        const sc = T.enter === 'pop' ? E.backOut(cl(qi * 1.6)) : 1;
        set(T.e, { transform: `translate(${f1(x)}px,${f1(y)}px) translate(${ox}%,-50%) scale(${sc.toFixed(3)})`, clipPath: T.enter === 'write' && qi < 1 ? `inset(-20% ${f1((1 - E.sine(qi)) * 100)}% -20% -5%)` : '', opacity: String(1 - qo) });
      }
    };

    // ---------- camera: travels along the ground line from stage to stage, holds and breathes, pushes in ----------
    const keys = [];
    const DEF = { x: 0, y: PT ? -260 : -230, z: 1 };
    const bandOf = () => { const top = H * (PT ? 0.12 : 0.1), bot = H * (PT ? 0.73 : 0.83); return { top, bot, cy: (top + bot) / 2, h: bot - top, w: W * 0.9 }; };
    const resolve = (v, t) => {
      if (!v) return { ...DEF };
      if (v.on) {
        // a node with a tag on it around t brings the room above it for the tag (tags keep their size on screen)
        const list = [].concat(v.on), bs = list.map((x) => { if (!x || !x.kind) return x; const b = wbox(x, Math.max(t, x.at)); if (v.tags !== false && tags.some((g) => g.o.on === x && g.at <= t + 1 && g.until > t - 0.5)) return { x: b.x, y: b.y - (v.room ?? 170), w: b.w, h: b.h + (v.room ?? 170) }; return b; }).filter(Boolean);
        const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y)), x1 = Math.max(...bs.map((b) => b.x + b.w)), y1 = Math.max(...bs.map((b) => b.y + b.h));
        const pad = v.pad ?? 1.25, Bd = bandOf(), wk = v.crop ?? (PT && x1 - x0 > (y1 - y0) * 1.5 ? opt.portraitCrop ?? 1.6 : 1), z = v.z ?? cl(Math.min((Bd.w * wk) / ((x1 - x0) * pad * U), Bd.h / ((y1 - y0) * pad * U)), v.zmin ?? 0.3, v.zmax ?? 2.6), k = z * U;
        // portrait: a subject that fills the width sits on the bottom of the band (the ground low in the frame, air above it for tags)
        const wide = (x1 - x0) * pad * k > Bd.w * 0.98, bottom = (v.align ?? (PT && wide ? 'bottom' : 'center')) === 'bottom';
        return { x: (x0 + x1) / 2 + (v.dx ?? 0), y: (bottom ? y1 + ((y1 - y0) * (pad - 1)) / 2 - (Bd.bot - H / 2) / k : (y0 + y1) / 2 - (Bd.cy - H / 2) / k) + (v.dy ?? 0), z };
      }
      return { x: v.x ?? DEF.x, y: v.y ?? DEF.y, z: v.z ?? 1 };
    };
    let kseq = 0;
    B.cam = (t, view, ease) => { keys.push({ a: t, b: t, view, ease: ease ?? E.cubicInOut, i: ++kseq }); keys.sort((p, q) => p.b - q.b); memo.clear(); fromMemo.clear(); return B; };
    B.move = (a, b, view, ease) => { keys.push({ a, b: Math.max(b, a + 0.05), view, ease: ease ?? E.sine, i: ++kseq }); keys.sort((p, q) => p.b - q.b); memo.clear(); fromMemo.clear(); if (b - a > 1 && view && view.sfx !== false) F.sfx(a, 'swish', 0.2, { dur: b - a }); return B; };
    const DRIFT = opt.drift ?? 0.005;
    const memo = new Map(), fromMemo = new Map();
    const held = (k, t) => { const v = memo.get(k) ?? memo.set(k, resolve(k.view, k.b)).get(k), dt = Math.max(0, t - k.b), z = v.z * (1 + Math.min(0.05, DRIFT * dt)); return { x: v.x + Math.sin(dt * 0.3) * 4, y: v.y + Math.sin(dt * 0.23) * 2, z }; };
    // the camera at t: the move that started last governs (a move supersedes every move that started before it, and starts from wherever they had
    // the camera), so the camera never jumps; once it ends the camera holds and breathes on its framing
    const camAt = (t, lim = null) => {
      let gov = null;
      for (const k of keys) { if (lim && (k === lim || k.a > lim.a || (k.a === lim.a && k.i > lim.i))) continue; if (k.a <= t && (!gov || k.a > gov.a || (k.a === gov.a && k.i > gov.i))) gov = k; }
      if (!gov) return { ...DEF, z: DEF.z * (1 + Math.min(0.05, DRIFT * t)) };
      if (t >= gov.b) return held(gov, t);
      const from = fromMemo.get(gov) ?? fromMemo.set(gov, camAt(gov.a, gov)).get(gov), to = held(gov, gov.b), q = gov.ease(cl((t - gov.a) / (gov.b - gov.a))), z = Math.exp(lerp(Math.log(from.z), Math.log(to.z), q));
      return { x: lerp(from.x, to.x, q), y: lerp(from.y, to.y, q), z };
    };
    B.camAt = camAt;
    const camCss = (v) => { const k = v.z * U; return `matrix(${k.toFixed(5)},0,0,${k.toFixed(5)},${(W / 2 - v.x * k).toFixed(2)},${(H / 2 - v.y * k).toFixed(2)})`; };
    const inView = (v, x, y) => { const k = v.z * U, sx2 = (x - v.x) * k + W / 2, sy2 = (y - v.y) * k + H / 2; return sx2 > 0 && sx2 < W && sy2 > 0 && sy2 < H; };

    // ---------- render ----------
    const sorted = () => roots.slice().sort((p, q) => p.z - q.z || p.ord - q.ord);
    if (!FLAT) {
      F.add((t) => {
        const cam = camAt(t), ctx = mx, k = cam.z * U;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
        ctx.setTransform(k, 0, 0, k, W / 2 - cam.x * k, H / 2 - cam.y * k);
        const vx0 = cam.x - W / 2 / k, vx1 = cam.x + W / 2 / k, vy0 = cam.y - H / 2 / k, vy1 = cam.y + H / 2 / k;
        for (const n of sorted()) { if (n.layer) continue; if (t < n.at || t >= n.until) continue; if (n.kind !== 'line' || n.p.wob !== 0.6) { const b = wbox(n, t); if (b.x > vx1 + 300 || b.x + b.w < vx0 - 300 || b.y > vy1 + 300 || b.y + b.h < vy0 - 300) continue; } drawNode(ctx, n, t, 1); }
        set(wl, { transform: camCss(cam) });
        tagFrame(t); titleFrame(t);
      });
    } else {
      const lc = new Map();
      B.layerCanvas = (layer) => { if (!lc.has(layer)) { const c = el('canvas', `left:0;top:0;width:${W}px;height:${H}px;z-index:1;pointer-events:none`, layer); c.width = W; c.height = H; c.dataset.motion = 'skip'; lc.set(layer, c.getContext('2d')); } return lc.get(layer); };
      F.late((t) => {
        for (const [layer, ctx] of lc) {
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
          if (layer.style.display === 'none') continue;
          for (const n of sorted()) { if (n.layer !== layer || t < n.at || t >= n.until) continue; ctx.setTransform(U, 0, 0, U, 0, 0); drawNode(ctx, n, t, 1); }
        }
        tagFrame(t); titleFrame(t);
      });
    }

    // captions: ink, hand-written, a paper halo, low in the frame
    if (!FLAT && F.T && F.voiced && !F.caps && opt.captions !== false) {
      const co = opt.captions || {}, segs = window.EV.captionSegments(F.T, co.max ?? (PT ? 13 : 22)), size = F.px(co.size ?? (PT ? 42 : 40));
      const box = el('div', `left:0;right:0;top:${co.top ?? (PT ? H * 0.77 : H * 0.885)}px;text-align:center;z-index:880;pointer-events:none;display:none`, F.stage);
      const sp = el('span', `position:relative;display:inline-block;max-width:${W * 0.86}px;color:${C0.ink};font:700 ${f1(size)}px/1.35 ${FONT.hand};letter-spacing:.03em;text-shadow:0 0 ${F.px(8)}px ${C0.paper},0 0 ${F.px(4)}px ${C0.paper},0 0 ${F.px(2)}px ${C0.paper}`, box);
      F.add((t) => { const c = segs.find((x) => t >= x.start && t < x.end); set(box, { display: c ? '' : 'none' }); if (c && sp.textContent !== c.text) sp.textContent = c.text; });
      for (const c of segs) { F.appear(c.start); F.appear(c.end); }
      F.caps = segs;
    }
    // the chapter: a dark › chip in the top corner, typed in when the chapter starts
    if (!FLAT && opt.chapters !== false) F.prep(() => {
      const CH = (F.T && F.T.chapters) || []; if (!CH.length) return;
      const size = F.px(PT ? 24 : 22), e = el('div', `left:${f1(W * (PT ? 0.06 : 0.05))}px;top:${f1(H * (PT ? 0.05 : 0.065))}px;background:${C0.screen};color:${C0.cream};font:600 ${f1(size)}px/1.25 ${FONT.mono};padding:${f1(size * 0.22)}px ${f1(size * 0.6)}px;border-radius:${f1(size * 0.26)}px;box-shadow:0 ${f1(size * 0.13)}px 0 rgba(43,37,33,.2);white-space:nowrap;display:none`, hud); e.dataset.motion = 'skip';
      const spans = CH.map((c, i) => { const s = el('span', 'position:relative;display:none', e); s.textContent = '› ' + c.title; F.text(s, 'label', c.title, i ? c.start - 0.2 : 0, i === CH.length - 1 ? F.duration : CH[i + 1].start, { noFact: true, chrome: true, overlap: true }); return s; });
      F.add((t) => { let k = -1; CH.forEach((c, i) => { if (t >= c.start - 0.2) k = i; }); set(e, { display: k >= 0 ? '' : 'none' }); spans.forEach((s, i) => set(s, { display: i === k ? '' : 'none' })); if (k >= 0) { const full = '› ' + CH[k].title, n = Math.min([...full].length, Math.ceil((frameT(t) - (CH[k].start - 0.2)) / 0.04)), s2 = [...full].slice(0, Math.max(2, n)).join(''); if (spans[k].textContent !== s2) spans[k].textContent = s2; } });
    });

    // ---------- checks ----------
    F.addLint(() => {
      const out = [], add = (t, what, msg) => out.push({ level: 'warn', t: Math.round(t * 10) / 10, src: '', what, msg });
      if (raw.size > 2) add(0, M('颜色越界', 'off-palette colours'), M(`用了 ${raw.size} 个调色板以外的颜色（${[...raw].slice(0, 5).join(' ')}）：这个风格是一个角色强调色加第二色，道具用奶油 / 米色 / 木色；用色名 a / a2 / a0 / b / cream / beige / wood …`, `${raw.size} colours outside the palette (${[...raw].slice(0, 5).join(' ')}): the style is one accent for the cast plus a second colour, props in cream / beige / wood; use the tone names a / a2 / a0 / b / cream / beige / wood …`));
      if (FLAT) return out;
      // shapes switched on mid-film with no entrance
      const pops = roots.filter((n) => n.at > 0.3 && n.enter === 'none' && n.kind !== 'puff' && n.kind !== 'ticks' && !n.p.lintOk && !(n.kind === 'char' && pv(n, 'ghost', n.at, 0) > 0));
      if (pops.length) add(pops[0].at, M('东西硬出现', 'switched on'), M(`${pops.length} 个东西在片中直接出现，没有入场（第一个在 ${pops[0].at.toFixed(1)} 秒）：给它 enter: 'pop' / 'drop' / 'rise' / 'draw' / 'slide'`, `${pops.length} things appear mid-film with no entrance (the first at ${pops[0].at.toFixed(1)} s): give them enter: 'pop' / 'drop' / 'rise' / 'draw' / 'slide'`));
      // one entrance over and over
      const ent = roots.filter((n) => n.at > 0.3 && n.enter !== 'none' && n.kind !== 'puff' && n.kind !== 'ticks' && !n.layer).sort((a, b) => a.at - b.at);
      for (let i = 0; i < ent.length;) { let j = i; while (j + 1 < ent.length && ent[j + 1].enter === ent[i].enter && ent[j + 1].at - ent[j].at < 4) j++; if (j - i + 1 >= 7 && ent[j].at - ent[i].at > 3) add(ent[i].at, M('入场单一', 'same entrance'), M(`${ent[i].at.toFixed(1)}–${ent[j].at.toFixed(1)} 秒连续 ${j - i + 1} 个东西都用 '${ent[i].enter}' 入场：换着用弹出、掉落、长高、画出来、滑入，或者让角色把东西搬上来`, `${ent[i].at.toFixed(1)}–${ent[j].at.toFixed(1)} s: ${j - i + 1} things in a row enter with '${ent[i].enter}': vary pop / drop / rise / draw / slide, or let a character bring it on`)); i = j + 1; }
      // the camera: too fast between stages, too close
      let fast = null, peak = 0;
      for (let t = 0; t < F.duration; t += 1 / 15) { const a = camAt(t), b = camAt(t + 1 / 15), sp = ((Math.hypot(b.x - a.x, b.y - a.y) * a.z * U) / Math.max(W, H)) * 15, zs = Math.abs(Math.log(b.z / a.z)) * 15; if (sp > 1.5 || zs > 1.3) { fast ??= t; peak = Math.max(peak, sp); } else if (fast != null) { add(fast, M('镜头太快', 'camera too fast'), M(`${fast.toFixed(1)}–${t.toFixed(1)} 秒镜头每秒移过约 ${peak.toFixed(1)} 个画面（长边）：沿地面线走过去要慢一点（B.move 给更长的时间），远处的舞台就近一点搭`, `${fast.toFixed(1)}–${t.toFixed(1)} s the camera crosses about ${peak.toFixed(1)} frames (long side) a second: travel along the ground line more slowly (a longer B.move), or build far stages nearer`)); fast = null; peak = 0; } }
      for (const k of keys) { const v = memo.get(k) ?? resolve(k.view, k.b); if (v.z > 2.7) { add(k.b, M('推得太近', 'pushed in too far'), M(`${k.b.toFixed(1)} 秒镜头推到 ${v.z.toFixed(1)} 倍：线条和排线都会被放粗。把要看的东西画大一点`, `At ${k.b.toFixed(1)} s the camera is at ${v.z.toFixed(1)}×: lines and hatching blow up. Draw the subject bigger instead`)); break; } }
      // nothing new on screen
      const evts = [...keys.flatMap((k) => [k.a, k.b]), ...roots.flatMap((n) => [n.at, n.until, ...(n.changes || [])]), ...chars.flatMap((c) => c.events), ...tags.flatMap((g) => [g.at, g.sub ? g.sub.at : g.at])].filter((x) => x > 0 && x < F.duration).sort((a, b) => a - b), vEnd = F.T && F.T.lines ? Math.max(...F.T.lines.map((l) => l.end || 0)) : F.duration;
      for (let i = 1; i < evts.length; i++) if (evts[i] - evts[i - 1] > 6 && evts[i - 1] < vEnd) { add(evts[i - 1], M('画面停太久', 'nothing happens'), M(`${evts[i - 1].toFixed(1)}–${evts[i].toFixed(1)} 秒画面上没有新动作：让角色做下一件事（走、跳、拿卡片、按按钮），或者冒出一个结果道具`, `${evts[i - 1].toFixed(1)}–${evts[i].toFixed(1)} s nothing new happens: let a character do the next thing (walk, jump, hold a card, press the button) or pop out a result prop`)); break; }
      // a character standing stiff in view: no act, face, walk or tag for a long while
      for (const c of chars) {
        const ev = [c.at, ...c.events, ...c.acts.flatMap((A) => [A.a, A.b])].filter((x) => x >= 0).sort((a, b) => a - b);
        for (let t = Math.max(0.5, c.at); t < Math.min(c.until, vEnd); t += 0.5) { const v = camAt(t), b = wbox(c, t); if (!inView(v, b.x + b.w / 2, b.y + b.h / 2)) continue; const last = ev.filter((x) => x <= t).pop() ?? c.at; if (t - last > 8) { add(last, M('角色站桩', 'stiff character'), M(`「${c.name}」在镜头里 ${last.toFixed(1)}–${t.toFixed(1)} 秒一动不动（只有呼吸和眨眼）：让它看向说话的东西、点头、蹦一下、换表情，或者让它退场`, `"${c.name}" stands in view ${last.toFixed(1)}–${t.toFixed(1)} s doing nothing (only breathing and blinking): let it look at what is being said, nod, hop, change face, or leave`)); break; } }
      }
      // tags: too many at once, over the captions
      let worstTag = null;
      for (let t = 0.25; t < F.duration; t += 0.5) { const v = camAt(t), n = tags.filter((g) => t >= g.at && t < g.until && g.o.on && (() => { const b = wbox(g.o.on, t); return inView(v, b.x + b.w / 2, b.y); })()).length; if (n > (opt.maxTags ?? 5) && (!worstTag || n > worstTag.n)) worstTag = { t, n }; }
      if (worstTag) add(worstTag.t, M('标签太多', 'too many tags'), M(`${worstTag.t.toFixed(1)} 秒画面上同时有 ${worstTag.n} 个小标签：标签只给正在干活的那几个，别的收起来（until）`, `At ${worstTag.t.toFixed(1)} s there are ${worstTag.n} tags on screen: tag only the ones at work, close the others (until)`));
      let worst = null;
      for (let t = 0.25; t < F.duration; t += 0.5) { const v = camAt(t), n = canvasTexts.filter((T) => { if (t < T.at || t >= T.until || T.p.noFact) return false; let b; try { b = wbox(T, t); } catch (e) { return false; } return inView(v, b.x + b.w / 2, b.y + b.h / 2) && b.h * v.z * U > F.px(12); }).length + tags.filter((g) => t >= g.at && t < g.until).length + titles.filter((g) => t >= g.at && t < g.until).length; if (n > (opt.maxText ?? 12) && (!worst || n > worst.n)) worst = { t, n }; }
      if (worst) add(worst.t, M('字太多', 'too much text'), M(`${worst.t.toFixed(1)} 秒画面上同时有 ${worst.n} 段字：这个风格靠角色演出来，字只放在标签、卡片、屏幕和牌子上`, `At ${worst.t.toFixed(1)} s there are ${worst.n} pieces of text on screen: this style acts things out; text belongs on tags, cards, screens and signs`));
      for (const g of tags) { if (!g.o.on) continue; const t = Math.min(F.duration - 0.05, g.at + 0.4), v = camAt(t), b = wbox(g.o.on, t), k = v.z * U, sy = (b.y - 40 - v.y) * k + H / 2; if (sy < H * 0.04) { add(g.at, M('标签出画', 'tag off frame'), M(`${g.at.toFixed(1)} 秒「${g.text}」的标签顶到画面上沿外面了：镜头框住它（view.on 里加上角色和上方的空间），或者把标签放低`, `At ${g.at.toFixed(1)} s the tag "${g.text}" runs off the top: frame it (include the character and the space above in view.on) or lower the tag`)); break; } }
      // the telling: clones that never come back together
      if (splits.length && !merges.length) add(splits[0].at, M('分身没合体', 'clones never merge'), M(`${splits[0].at.toFixed(1)} 秒分出来的分身到最后都没合回去：这个风格的讲法是分身各干一件事，再回来合成一个（B.merge），结果变成道具`, `The clones split at ${splits[0].at.toFixed(1)} s never merge back: the style's telling is clones each doing one task, then regrouping into one (B.merge) with the results as props`));
      return out;
    });

    B.roots = roots; B.chars = chars; B.tags = tags;
    return P.infoKit ? P.infoKit(B, { tag: 'mark', cards: 'chart', blocks: 'diagram', monitor: 'diagram', easel: 'annotate', cabinet: 'diagram', thermo: 'chart', poster: 'illustration', sign: 'mark', bell: 'illustration', plane: 'arrow', house: 'illustration', char: 'character', split: 'diagram', merge: 'diagram' }) : B;
  };
})();
