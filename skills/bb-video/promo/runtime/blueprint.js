// blueprint.js: blueprint engineering drawing (蓝图工程图, one of bb-video's visual styles; style notes in styles/blueprint/STYLE.md). Load after promo.js.
// One frame: a viewport over a large drawing sheet. Deep cyanotype blue with paper grain, an uneven fade and a fine grid; thin white / pale-cyan line work
// drawn to draughting convention (ISO 128 line types: visible, thin, hidden dashed, centre dash-dot, phantom, construction), dimensions with arrowheads,
// leaders with numbered balloons, a parts list, section views with hatching, detail circles, a title block, technical lettering; one red pencil as the accent.
// Every line is *drafted* in: construction lines first (thin, quick, they stay faint), then the final weight, with a plotter pen riding the tip.
// Mechanisms are first-class: gear trains with real tooth counts (meshing phase and ratio solved), escapements, balances and hairsprings, levers, cams,
// racks, coil and spiral springs, rods, hands — all driven by one mechanism clock, so wheels mesh and turn at the right relative speeds.
// SVG line work (non-scaling strokes: line weights stay the drawing's, whatever the view's scale) + DOM lettering (the automatic checks work as usual).
//
//   const B = PROMO.blueprint(F, { ground: 'blue' | 'white', accent, colors })
//   const S = B.sheet({ a, z, w, h, grid, enter: 'expose' | 'slide' | 'cut', dur })     a drawing sheet (one big sheet per film is usual; a new sheet = a transition)
//   S.cam([{ at, x, y, zoom, rot, dur, ease }]) · S.fit(box, pad) → { x, y, zoom }      camera over the sheet (sheet units = 1080p design px at zoom 1)
//   const V = B.view(S, { x, y, scale, rot, clip })                                     a view: local units (e.g. mm) placed on the sheet at a drawing scale
//   B.group(V) → G (G.to({ at, dx, dy, rot, dur }), G.cut / G.only({ shape, … , at, dur }))   a movable sub-assembly (exploded views, cutaways)
//   Line work:  B.line / B.poly / B.circle / B.arc / B.rect / B.path (V, { …, kind, at, dur, until, pen, cons })     drafted strokes
//               B.centre(V, { x, y, r }) centre-line cross · B.hatch(V, { pts | rect | circle, angle, gap, at }) section hatching
//   Annotation: B.dim(V, { a, b, off, text, kind: 'linear' | 'dia' | 'radius' | 'angle', at }) · B.leader(V, { from, to, n, text, at })
//               B.label(V, { x, y, text, size, font, align, rot, at }) · B.title(V, { x, y, text, sub, at }) · B.table(V, { x, y, rows, cols, head, at, every })
//               B.detail(V, { x, y, r, letter, to, scale, at }) → detail view · B.cutline(V, { a, b, letter, at }) · B.pencil(V, { kind, … , at })
//               B.readout(V, { x, y, text: (t) => '…', facts: [...], at }) · B.dial(V, { x, y, r, at })
//   B.focus(V, { x, y, r | w, h, at, dur, dim }) on a push-in: the drawing outside the part falls back, the part reads as a detail
//   Sheet furniture (frame-fixed): B.frame({ at }) border with zone marks · B.block({ title, no, scale, date, sheets, keys, at }) title block
//   Mechanisms: const M = B.mech(V, { time: B.clock([{ at, rate }]) })
//               M.gear({ id, x, y | mesh, dir, arbor, teeth, m, kind: 'wheel' | 'pinion' | 'escape' | 'barrel', spokes, drive, rate, at })
//               M.escapement({ wheel, bph, amp, fork, balance, at }) · M.spiral({ … }) · M.coil({ a, b }) · M.part({ pivot, pts, angle | follow })
//               M.cam({ … }) · M.rack({ mesh, … }) · M.rod({ a, b }) · M.hand({ arbor, len }) · M.spin(id, { text }) · M.angle(id, tm) · M.ratio(a, b) · M.rate(id)
//   B.wipe({ at, kind: 'expose' | 'slide' }) is the same as giving the next sheet enter: kind.
//
// Units: sheet coordinates are 1080p design px (at zoom 1 the frame shows W × H of them); a view's local units are whatever you draw in (mm for a watch),
// scaled by the view's `scale`. Sizes of type, arrowheads, balloons and line weights are always sheet units. Time: at = drawn and readable; until = gone.
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('blueprint.js 要在 promo.js 之后加载', 'blueprint.js must load after promo.js'));
  const { lerp } = window.EV;
  const { E, seg, set, el } = P;
  const NS = 'http://www.w3.org/2000/svg';
  const f1 = (n) => Math.round(n * 10) / 10;
  const f2 = (n) => Math.round(n * 100) / 100;
  const f3 = (n) => Math.round(n * 1000) / 1000;
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (q) => { q = clamp(q); return q * q * (3 - 2 * q); };
  // a plotter's move: short acceleration and deceleration ramps around a constant-speed run
  const trap = (q) => { q = clamp(q); const r = 0.18, v = 1 / (1 - r); return q < r ? (v * q * q) / (2 * r) : q > 1 - r ? 1 - (v * (1 - q) * (1 - q)) / (2 * r) : v * (q - r / 2); };
  const sv = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs || {}) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const cjk = (s) => /[⺀-鿿豈-﫿＀-￯]/.test(String(s));
  let uid = 0;

  // ---------- geometry ----------
  const lenOf = (pts) => { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return c; };
  // the first q of a polyline (by length)
  const trunc = (pts, cum, q) => {
    if (q >= 1) return pts; if (q <= 0) return [];
    const L = cum[cum.length - 1] * q; let i = 1; while (i < cum.length && cum[i] < L) i++;
    if (i >= cum.length) return pts;
    const a = pts[i - 1], b = pts[i], s = (L - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
    return [...pts.slice(0, i), [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]];
  };
  const dOf = (pts, close) => { if (!pts.length) return ''; let s = 'M' + f2(pts[0][0]) + ' ' + f2(pts[0][1]); for (let i = 1; i < pts.length; i++) s += 'L' + f2(pts[i][0]) + ' ' + f2(pts[i][1]); return close ? s + 'Z' : s; };
  const arcPts = (cx, cy, r, a0, a1, k = 1) => { const n = Math.max(8, Math.min(360, Math.round((Math.abs(a1 - a0) * r * k) / 4))); return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }); };
  const rot = (p, a, c = [0, 0]) => { const s = Math.sin(a), co = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * co - y * s, c[1] + x * s + y * co]; };
  // an SVG path string → points (sampled along its length; used for paths given as d)
  let probe = null;
  const sample = (d, step = 2) => { probe ??= sv('path', {}, sv('svg', { width: 0, height: 0, style: 'position:absolute;left:-9999px' }, document.body)); probe.setAttribute('d', d); const L = probe.getTotalLength(), n = Math.max(2, Math.min(4000, Math.ceil(L / step))); return Array.from({ length: n + 1 }, (_, i) => { const p = probe.getPointAtLength((L * i) / n); return [p.x, p.y]; }); };
  // a 2D affine matrix [a, b, c, d, e, f] (x' = a x + c y + e, y' = b x + d y + f)
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const apply = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
  const mTRS = (x, y, r, k, ox = 0, oy = 0) => { const c = Math.cos(r) * k, s = Math.sin(r) * k; return [c, s, -s, c, x - c * ox + s * oy, y - s * ox - c * oy]; };
  const ID = [1, 0, 0, 1, 0, 0];

  // ---------- gear tooth profiles (local, tooth 0 centred on angle 0) ----------
  // wheel: radial flanks below the pitch circle and a rounded ogive above it (horological cycloidal form); pinion: short rounded leaves;
  // escape: Swiss club teeth leaning the way the wheel turns; barrel / ratchet: the barrel's toothed rim (fine teeth).
  function gearPts(N, m, kind, lean = 1) {
    const rp = (m * N) / 2, pitch = TAU / N, pts = [];
    if (kind === 'escape') {
      const ra = rp + m * 1.0, rf = rp - m * 2.2;
      for (let i = 0; i < N; i++) {
        const a0 = i * pitch - pitch * 0.5;
        const P2 = (a, r) => [r * Math.cos(a), r * Math.sin(a)];
        // root → the long back of the tooth sweeping up to the tip (leaning forward) → the club's impulse face → the front dropping back to the root
        pts.push(P2(a0, rf));
        for (let s = 1; s <= 6; s++) { const q = s / 6; pts.push(P2(a0 + lean * pitch * 0.55 * q, rf + (ra - rf) * Math.pow(q, 0.8))); }
        pts.push(P2(a0 + lean * pitch * 0.72, ra - m * 0.35));
        pts.push(P2(a0 + lean * pitch * 0.66, rf + (ra - rf) * 0.45));
        pts.push(P2(a0 + lean * pitch * 0.62, rf));
        for (let s = 1; s <= 3; s++) pts.push(P2(a0 + lean * (pitch * 0.62 + pitch * 0.38 * (s / 3)), rf));
      }
      if (lean < 0) pts.reverse();
      return { pts, rp, ra: rp + m, rf };
    }
    const add = kind === 'pinion' ? 0.75 : kind === 'barrel' ? 1.0 : 1.35, ded = kind === 'pinion' ? 1.2 : kind === 'barrel' ? 1.25 : 1.6;
    const ra = rp + m * add, rf = rp - m * ded, w = (pitch / 4) * (kind === 'pinion' ? 0.95 : 0.9);
    for (let i = 0; i < N; i++) {
      const c = i * pitch;
      pts.push([rf * Math.cos(c - w), rf * Math.sin(c - w)]);
      pts.push([rp * Math.cos(c - w), rp * Math.sin(c - w)]);
      for (let s = 1; s <= 6; s++) { const q = (s / 6) * (Math.PI / 2), a = c - w * Math.cos(q), r = rp + (ra - rp) * Math.sin(q); pts.push([r * Math.cos(a), r * Math.sin(a)]); }
      for (let s = 5; s >= 0; s--) { const q = (s / 6) * (Math.PI / 2), a = c + w * Math.cos(q), r = rp + (ra - rp) * Math.sin(q); pts.push([r * Math.cos(a), r * Math.sin(a)]); }
      pts.push([rf * Math.cos(c + w), rf * Math.sin(c + w)]);
      for (let s = 1; s <= 3; s++) { const a = c + w + ((pitch - 2 * w) * s) / 4; pts.push([rf * Math.cos(a), rf * Math.sin(a)]); }
    }
    return { pts, rp, ra, rf };
  }

  // ---------- palettes: cyanotype blue (white line work) and diazo whiteprint (blue-violet lines on pale paper) ----------
  const PAL = {
    blue: { bg: '#123F77', bg2: '#0B2B55', line: '#EEF6FF', thin: 'rgba(230,242,255,.84)', cons: 'rgba(175,215,255,.34)', grid: 'rgba(185,222,255,.07)', grid2: 'rgba(185,222,255,.14)', text: '#F2F8FF', mute: 'rgba(200,226,250,.74)', acc: '#FF5D4D', hatch: 'rgba(222,238,255,.5)', pen: '#FFFFFF', fill: 'rgba(205,232,255,.06)', knock: '#123F77' },
    white: { bg: '#EBEDE5', bg2: '#D9DCD0', line: '#22398A', thin: 'rgba(34,57,138,.86)', cons: 'rgba(34,57,138,.26)', grid: 'rgba(34,57,138,.055)', grid2: 'rgba(34,57,138,.11)', text: '#1C3282', mute: 'rgba(34,57,138,.62)', acc: '#D2352B', hatch: 'rgba(34,57,138,.5)', pen: '#22398A', fill: 'rgba(34,57,138,.05)', knock: '#EBEDE5' },
  };
  // ISO 128 line types (widths and dashes in sheet units: they keep their weight whatever the view's scale)
  const KIND = {
    visible: { w: 3, c: 'line' }, thick: { w: 4.2, c: 'line' }, thin: { w: 1.5, c: 'thin' }, hidden: { w: 2, c: 'thin', dash: '11 6' },
    centre: { w: 1.3, c: 'thin', dash: '30 5 4 5' }, center: { w: 1.3, c: 'thin', dash: '30 5 4 5' }, phantom: { w: 1.4, c: 'thin', dash: '24 5 3 5 3 5' },
    cons: { w: 1, c: 'cons' }, cut: { w: 1.6, c: 'line', dash: '30 5 4 5' }, pencil: { w: 3.4, c: 'acc' }, hatch: { w: 1.1, c: 'hatch' },
  };

  P.blueprint = function (F, opt = {}) {
    const B = { F }, W = F.W, H = F.H, PT = F.portrait, u = F.px(1);
    const pal = { ...(PAL[opt.ground ?? 'blue'] ?? PAL.blue), ...(opt.colors || {}) };
    if (opt.accent) pal.acc = opt.accent;
    B.colors = pal; B.ground = opt.ground ?? 'blue';
    const fonts = F.theme.fonts || {};
    B.font = { tech: opt.font ?? fonts.sans ?? '"Saira Condensed", "Noto Sans SC", sans-serif', stencil: opt.stencil ?? fonts.display ?? '"Saira Stencil One", "Noto Sans SC", sans-serif' };
    B.L = (a, b) => (PT ? b : a);
    const col = (c) => pal[c] ?? c;
    const sheets = [];
    let pens = 0;
    // anything scheduled before its sheet enters is already on that sheet when it appears (a new sheet arrives drawn): no pen, no sound
    const before = (V, t) => !!(V && V.S && V.S.a !== undefined && t < V.S.a - 0.02);
    const sfx = (V, t, ...r) => { if (!before(V, t)) F.sfx(t, ...r); };
    // what each sheet carries (strokes and lettering), for the framing check; clip regions of clipped views (detail circles)
    const track = (V, el, at, kind, text) => { if (V && V.S && V.S.items) V.S.items.push({ el, at, kind, text }); };
    const clips = {};
    // lettering on a sheet only counts as on screen while its sheet is (until the next sheet starts to cover it)
    const clampTexts = (S) => { const z = S.zText ?? S.z; for (const e of S.texts || []) { e.win[0] = Math.max(e.win[0], S.a); e.win[1] = Math.min(e.win[1], z); if (e.win[1] < e.win[0]) e.win[1] = e.win[0]; } };

    // ---------- sheets and the camera ----------
    // A sheet: ground (cyanotype blue, grid, uneven fade) + one SVG for line work + a lettering layer, all inside one camera-moved box.
    // Sheet units = 1080p design px; the camera at zoom 1 shows W × H of them centred on (x, y).
    B.sheet = (o = {}) => {
      const a = o.a ?? 0, z = o.z ?? 1e9, sw = o.w ?? W / u * 3, sh = o.h ?? H / u * 3, ox = o.x ?? 0, oy = o.y ?? 0;
      const layer = F.layer('overflow:hidden', o.layer ?? 2 + sheets.length);
      const box = el('div', `left:0;top:0;width:${f1(sw)}px;height:${f1(sh)}px;transform-origin:0 0`, layer);
      box.dataset.what = 'B.sheet';
      // the ground: blue with a slow uneven fade (diazo / sun-faded paper), a fine grid with a heavier line every 5 cells
      const step = o.grid ?? 40;
      const gr = el('div', `left:-4000px;top:-4000px;right:-4000px;bottom:-4000px;background:${pal.bg};background-image:radial-gradient(ellipse 60% 45% at 30% 35%, rgba(255,255,255,.055), transparent 70%),radial-gradient(ellipse 50% 60% at 78% 70%, rgba(0,0,0,.16), transparent 70%),radial-gradient(ellipse 40% 30% at 65% 15%, rgba(255,255,255,.04), transparent 70%),linear-gradient(${pal.grid2} 1.4px, transparent 1.4px),linear-gradient(90deg, ${pal.grid2} 1.4px, transparent 1.4px),linear-gradient(${pal.grid} 1px, transparent 1px),linear-gradient(90deg, ${pal.grid} 1px, transparent 1px);background-size:100% 100%,100% 100%,100% 100%,${step * 5}px ${step * 5}px,${step * 5}px ${step * 5}px,${step}px ${step}px,${step}px ${step}px;background-position:0 0,0 0,0 0,${4000 + ox}px ${4000 + oy}px,${4000 + ox}px ${4000 + oy}px,${4000 + ox}px ${4000 + oy}px,${4000 + ox}px ${4000 + oy}px`, box);
      gr.dataset.what = 'B.ground';
      const svg = sv('svg', { width: sw, height: sh, style: 'position:absolute;left:0;top:0;overflow:visible' }, box);
      const defs = sv('defs', {}, svg), root = sv('g', {}, svg), top = sv('g', {}, svg);
      const text = el('div', 'left:0;top:0;width:0;height:0', box);
      // frame-fixed texture: paper grain and a soft vignette (not moved by the camera)
      const grainSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 -.18'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
      const tex = el('div', `inset:0;pointer-events:none;background-image:url("data:image/svg+xml,${encodeURIComponent(grainSvg)}");opacity:${B.ground === 'white' ? 0.35 : 0.22};mix-blend-mode:${B.ground === 'white' ? 'multiply' : 'screen'}`, layer);
      tex.dataset.motion = 'skip';
      const vig = el('div', `inset:0;pointer-events:none;background:radial-gradient(ellipse 75% 70% at 50% 48%, transparent 55%, ${B.ground === 'white' ? 'rgba(80,70,40,.16)' : 'rgba(2,12,30,.42)'} 100%)`, layer);
      vig.dataset.motion = 'skip';
      const S = { a, z, layer, box, svg, defs, root, top, text, w: sw, h: sh, ox, oy, keys: [], dyn: [], items: [], texts: [] };
      // the sheet's own origin: (ox, oy) is where sheet coordinate (0, 0) sits inside the box (so views can use negative coordinates)
      S.toBox = (p) => [p[0] + ox, p[1] + oy];
      root.setAttribute('transform', `translate(${ox},${oy})`); top.setAttribute('transform', `translate(${ox},${oy})`);
      // camera keys: arrive at `at` (move from at - dur); before the first key the first pose holds
      S.cam = (keys) => { for (const k of [].concat(keys)) S.keys.push({ zoom: 1, rot: 0, dur: 1.4, ease: E.cubicInOut, ...k }); S.keys.sort((p, q) => p.at - q.at); return S; };
      S.pose = (t) => {
        const K = S.keys; if (!K.length) return { x: W / u / 2, y: H / u / 2, zoom: 1, rot: 0 };
        let cur = { x: K[0].x, y: K[0].y, zoom: K[0].zoom, rot: K[0].rot };
        for (const k of K) { const q = seg(t, k.at - k.dur, k.at, k.ease); if (q <= 0) break; cur = { x: lerp(cur.x, k.x ?? cur.x, q), y: lerp(cur.y, k.y ?? cur.y, q), zoom: Math.exp(lerp(Math.log(cur.zoom), Math.log(k.zoom ?? cur.zoom), q)), rot: lerp(cur.rot, k.rot ?? cur.rot, q) }; }
        return cur;
      };
      // fit a box of sheet coordinates (x, y, w, h) into the frame, with padding (fraction of the frame) and an optional caption band kept free
      S.fit = (b, pad = 0.08, band = 0) => { const zw = (W / u) * (1 - 2 * pad) / b.w, zh = (H / u) * (1 - 2 * pad - band) / b.h; return { x: b.x + b.w / 2, y: b.y + b.h / 2 + ((H / u) * band) / 2 / Math.min(zw, zh), zoom: Math.min(zw, zh) }; };
      S.toFrame = (p, t) => { const c = S.pose(t), s = c.zoom * u, r = c.rot * RAD, x = (p[0] - c.x) * s, y = (p[1] - c.y) * s; return [W / 2 + x * Math.cos(r) - y * Math.sin(r), H / 2 + x * Math.sin(r) + y * Math.cos(r)]; };
      // entering: expose = a UV lamp bar sweeps across and the new print develops behind it; slide = a fresh sheet slides over the old one; cut = hard cut
      const enter = o.enter ?? (sheets.length ? 'expose' : 'cut'), ed = o.dur ?? (enter === 'slide' ? 0.9 : 1.1);
      let bar = null;
      if (enter === 'expose' && sheets.length) {
        bar = el('div', `top:0;width:${f1(W * 0.16)}px;height:100%;background:linear-gradient(90deg, transparent, rgba(225,240,255,.55) 45%, rgba(255,255,255,.85) 52%, rgba(225,240,255,.35) 60%, transparent);mix-blend-mode:screen;display:none;z-index:5`, layer);
        bar.dataset.motion = 'skip';
        F.transition(a, a + ed); F.sfx(a, 'expose', 0.5, { dur: ed });
      } else if (enter === 'slide' && sheets.length) { F.transition(a, a + ed); F.sfx(a, 'slide', 0.5, { dur: ed }); F.blur(a, a + ed, 10); }
      else if (sheets.length) F.cut(a);
      S.enterEnd = enter === 'cut' ? a : a + ed;
      // the sheet before stays until this one has fully entered
      const prev = sheets[sheets.length - 1]; if (prev && prev.z > S.enterEnd) { prev.z = S.enterEnd; prev.zText = a; clampTexts(prev); }
      sheets.push(S);
      F.add((t) => {
        const on = t >= a && t < S.z; set(layer, { display: on ? '' : 'none' }); if (!on) return;
        const c = S.pose(t), s = c.zoom * u;
        // once the next sheet has covered it, the old one fades out of the stack (unseen; nothing on it is switched off in one frame)
        if (S.z < 1e8) set(layer, { opacity: String(f3(1 - seg(t, S.z - 0.16, S.z))) });
        layer.dataset.lintSkip = S.zText !== undefined && t >= S.zText ? '1' : '0';   // being covered: the text checks look at the new sheet only
        set(box, { transform: `translate(${f1(W / 2)}px,${f1(H / 2)}px) rotate(${f2(c.rot)}deg) scale(${f3(s)}) translate(${f1(-c.x - ox)}px,${f1(-c.y - oy)}px)` });
        if (enter === 'expose' && bar) { const q = seg(t, a, a + ed, E.sine), x = lerp(-W * 0.16, W * 1.02, q); set(layer, { clipPath: q < 1 ? `inset(0 ${f1(Math.max(0, W - x - W * 0.08))}px 0 0)` : '' }); set(bar, { display: q > 0 && q < 1 ? '' : 'none', transform: `translateX(${f1(x)}px)` }); }
        if (enter === 'slide' && sheets.indexOf(S) > 0) { const q = seg(t, a, a + ed, E.expoInOut); set(layer, { transform: q < 1 ? `translateX(${f1((1 - q) * W * 1.04)}px)` : '', boxShadow: q < 1 ? `-${f1(W * 0.02)}px 0 ${f1(W * 0.03)}px rgba(0,0,0,.35)` : '' }); }
        for (const d of S.dyn) d(t);
      });
      return S;
    };
    B.wipe = (o) => o.at;   // transitions belong to the next sheet (B.sheet({ a, enter })); kept for symmetry with other styles
    // a static drawing sheet inside a layer you already have (no camera, no own visibility window): the common interface draws its scenes on these.
    //   Coordinates are 1080p design px of the frame (x = frame px / F.px(1)); B.view / B.line / B.label … work on it as on a sheet
    B.paper = (layer, o = {}) => {
      const step = o.grid ?? 40, v = o.variant ?? 0, PW = W / u, PH = H / u;
      const wrap = el('div', `left:0;top:0;width:${f1(PW)}px;height:${f1(PH)}px;transform:scale(${f3(u)});transform-origin:0 0;overflow:hidden`, layer);
      const g2 = v % 2 ? pal.grid2 : pal.grid;
      const gr = el('div', `inset:0;background:${pal.bg};background-image:radial-gradient(ellipse 60% 45% at ${30 + v * 12}% 35%, rgba(255,255,255,.055), transparent 70%),radial-gradient(ellipse 50% 60% at 78% 70%, rgba(0,0,0,.16), transparent 70%),linear-gradient(${pal.grid2} 1.4px, transparent 1.4px),linear-gradient(90deg, ${pal.grid2} 1.4px, transparent 1.4px),linear-gradient(${g2} 1px, transparent 1px),linear-gradient(90deg, ${g2} 1px, transparent 1px);background-size:100% 100%,100% 100%,${step * 5}px ${step * 5}px,${step * 5}px ${step * 5}px,${step}px ${step}px,${step}px ${step}px`, wrap);
      gr.dataset.what = 'B.ground';
      const svg = sv('svg', { width: PW, height: PH, style: 'position:absolute;left:0;top:0;overflow:visible' }, wrap);
      const defs = sv('defs', {}, svg), root = sv('g', {}, svg), top = sv('g', {}, svg), text = el('div', 'left:0;top:0;width:0;height:0', wrap);
      const tex = el('div', `inset:0;pointer-events:none;background:radial-gradient(ellipse 75% 70% at 50% 48%, transparent 55%, ${B.ground === 'white' ? 'rgba(80,70,40,.16)' : 'rgba(2,12,30,.42)'} 100%)`, wrap);
      tex.dataset.motion = 'skip';
      const S = { layer, box: wrap, svg, defs, root, top, text, w: PW, h: PH, ox: 0, oy: 0, dyn: [], paper: true };
      S.toFrame = (p2) => [p2[0] * u, p2[1] * u];
      S.view = B.view(S, { x: 0, y: 0, scale: 1 });
      return S;
    };

    // ---------- views and groups: coordinate spaces drawn into ----------
    // a space knows its SVG group, its parent, its local → sheet matrix at time t, and its scale (local units → sheet units)
    const spaceOf = (S, parent, g, k, mat, dynamic) => ({ S, parent, g, k, mat, dyn: dynamic, toSheet(p, t) { return apply(this.matAt(t), p); }, matAt(t) { const m = this.mat(t); return this.parent ? mul(this.parent.matAt(t), m) : m; }, isDyn() { return this.dyn || (this.parent ? this.parent.isDyn() : false); } });
    B.view = (S, o = {}) => {
      const x = o.x ?? 0, y = o.y ?? 0, k = o.scale ?? 1, r = (o.rot ?? 0) * RAD, ox2 = o.ox ?? 0, oy2 = o.oy ?? 0;
      const g = sv('g', { transform: `translate(${f2(x)} ${f2(y)}) rotate(${f2(o.rot ?? 0)}) scale(${k}) translate(${f2(-ox2)} ${f2(-oy2)})` }, o.into ?? S.root);
      const m = mTRS(x, y, r, k, ox2, oy2), V = spaceOf(S, null, g, k, () => m, false);
      V.rot = r;
      if (o.clip) {
        const id = 'bpc' + ++uid, cp = sv('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, S.defs); const c = o.clip; if (c.r) sv('circle', { cx: c.x ?? ox2, cy: c.y ?? oy2, r: c.r }, cp); else sv('rect', { x: c.x, y: c.y, width: c.w, height: c.h }, cp); g.setAttribute('clip-path', `url(#${id})`);
        const cs = c.r ? [[(c.x ?? ox2) - c.r, (c.y ?? oy2) - c.r], [(c.x ?? ox2) + c.r, (c.y ?? oy2) + c.r]] : [[c.x, c.y], [c.x + c.w, c.y + c.h]], q = [cs[0], [cs[1][0], cs[0][1]], cs[1], [cs[0][0], cs[1][1]]].map((p) => apply(m, p));
        clips[id] = { S, box: [Math.min(...q.map((p) => p[0])), Math.min(...q.map((p) => p[1])), Math.max(...q.map((p) => p[0])), Math.max(...q.map((p) => p[1]))] };
      }
      return V;
    };
    // a movable sub-assembly: G.to({ at, dx, dy, rot, dur }) slides it (exploded views reassemble with dx: 0); G.cut / G.only cut a growing hole / show only inside a shape
    B.group = (V, o = {}) => {
      const outer = sv('g', {}, V.g), keys = [], piv = o.pivot ?? [0, 0];
      const pose = (t) => { let c = { dx: 0, dy: 0, rot: 0 }; for (const k of keys) { const q = seg(t, k.at - k.dur, k.at, k.ease); if (q <= 0) break; c = { dx: lerp(c.dx, k.dx ?? c.dx, q), dy: lerp(c.dy, k.dy ?? c.dy, q), rot: lerp(c.rot, k.rot ?? c.rot, q) }; } return c; };
      const G = spaceOf(V.S, V, outer, V.k, (t) => { const c = pose(t); return mul(mTRS(c.dx + piv[0], c.dy + piv[1], c.rot * RAD, 1), mTRS(-piv[0], -piv[1], 0, 1)); }, true);
      G.k = V.k; G.rot = V.rot ?? 0;
      let last = '';
      F.add((t) => { const c = pose(t), s = `translate(${f2(c.dx)} ${f2(c.dy)}) rotate(${f2(c.rot)} ${f2(piv[0])} ${f2(piv[1])})`; if (s !== last) { outer.setAttribute('transform', s); last = s; } });
      G.to = (k) => { keys.push({ dur: 0.9, ease: E.cubicInOut, ...k }); keys.sort((p, q) => p.at - q.at); if (k.sfx !== false) sfx(V, k.at - (k.dur ?? 0.9), 'explode', k.gain ?? 0.35, { dur: k.dur ?? 0.9 }); return G; };
      const masked = (inside, mo) => {
        const id = 'bpm' + ++uid, mk = sv('mask', { id, maskUnits: 'userSpaceOnUse', x: -1e5, y: -1e5, width: 2e5, height: 2e5 }, V.S.defs);
        sv('rect', { x: -1e5, y: -1e5, width: 2e5, height: 2e5, fill: inside ? '#000' : '#fff' }, mk);
        const sh = mo.r ? sv('circle', { cx: mo.x, cy: mo.y, r: 0, fill: inside ? '#fff' : '#000' }, mk) : sv('rect', { x: mo.x, y: mo.y, width: 0, height: mo.h, fill: inside ? '#fff' : '#000' }, mk);
        outer.setAttribute('mask', `url(#${id})`);
        const at = mo.at, d = mo.dur ?? 0.9;
        F.add((t) => { const q = mo.instant ? (t >= at ? 1 : 0) : seg(t, at - d, at, E.cubicInOut); if (mo.r) sh.setAttribute('r', f2(mo.r * q)); else { const w = mo.w * q; sh.setAttribute('width', f2(w)); if (mo.from === 'right') sh.setAttribute('x', f2(mo.x + mo.w - w)); } });
        if (mo.sfx !== false && !mo.instant) sfx(V, at - d, 'cut', 0.35, { dur: d });
        return G;
      };
      G.cut = (mo) => masked(false, mo);
      G.only = (mo) => masked(true, mo);
      return G;
    };

    // ---------- drafted strokes ----------
    // draw(space, pts, o): the stroke draws on from at - dur to at (plotter ease), construction lines (o.cons: points or true) a little before;
    //   o.until = fades out; o.pen = a plotter pen rides the tip; o.close = closed shape; o.fill = a faint fill once drawn
    const penOf = (S) => {
      const g = sv('g', { style: 'display:none' }, S.top), r = 7;
      sv('circle', { r: r * 2.2, fill: pal.pen, opacity: 0.12 }, g);
      sv('circle', { r, fill: 'none', stroke: pal.pen, 'stroke-width': 1.6 }, g);
      sv('circle', { r: 2.2, fill: pal.pen }, g);
      sv('path', { d: `M${-r * 2} 0H${-r * 1.2}M${r * 1.2} 0H${r * 2}M0 ${-r * 2}V${-r * 1.2}M0 ${r * 1.2}V${r * 2}`, stroke: pal.pen, 'stroke-width': 1.2 }, g);
      return g;
    };
    const draw = (V, pts, o = {}) => {
      if (before(V, o.at ?? 0) && !o.instant) o = { ...o, instant: true, pen: false, sfx: false };
      const K = KIND[o.kind ?? 'visible'] ?? KIND.visible, at = o.at ?? 0, until = o.until ?? 1e9;
      const len = lenOf(pts), L = len[len.length - 1] * V.k;
      const dur = o.dur ?? clamp(0.25 + L / 1400, 0.3, 1.6), a0 = o.instant ? at : at - dur;
      const p = sv('path', { fill: 'none', stroke: o.color ? col(o.color) : col(K.c), 'stroke-width': o.w ?? K.w, 'stroke-dasharray': o.dash ?? K.dash, 'stroke-linecap': K.dash ? 'butt' : 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke', style: 'display:none' }, o.into ?? V.g);
      if (o.kind !== 'cons') track(V, p, a0, 'line');
      const close = !!o.close, P2 = close && pts.length > 1 ? [...pts, pts[0]] : pts, len2 = close ? lenOf(P2) : len;
      let fillEl = null;
      if (o.fill) fillEl = sv('path', { d: dOf(pts, true), fill: o.fill === true ? pal.fill : col(o.fill), stroke: 'none', style: 'display:none' }, p.parentNode), p.parentNode.insertBefore(fillEl, p);
      // construction pass: thin, quick, before the final line; it stays faint (draughtsmen don't erase their construction)
      let cons = null;
      if (o.cons && !o.instant) {
        const cp = o.cons === true ? (close ? P2 : pts) : o.cons, cd = Math.max(0.25, dur * 0.45);
        cons = draw(V, cp, { kind: 'cons', at: a0 - 0.05, dur: cd, until, into: o.into, keep: o.consKeep ?? 0.45, sfx: false });
      }
      let pen = null, lastQ = -1, lastOp = -1;
      if (o.pen && !o.instant) pen = penOf(V.S);
      if (o.sfx !== false && o.pen && !o.instant) sfx(V, a0 + 0.02, 'draw', o.gain ?? 0.26, { dur });
      const keep = o.keep;   // construction lines dim to this opacity after the final line is drawn
      F.add((t) => {
        const on = t >= a0 && t < until; if (!on) { if (lastQ !== -2) { p.style.display = 'none'; if (fillEl) fillEl.style.display = 'none'; if (pen) pen.style.display = 'none'; lastQ = -2; } return; }
        const q = o.instant ? 1 : trap(seg(t, a0, at));
        if (q !== lastQ) { p.setAttribute('d', dOf(trunc(P2, len2, q), false)); p.style.display = ''; lastQ = q; }
        let op = until < 1e8 ? 1 - seg(t, until - 0.3, until) : 1;
        if (keep !== undefined) op *= lerp(1, keep, seg(t, at + 0.2, at + 0.9));
        if (op !== lastOp) { p.setAttribute('opacity', f3(op)); lastOp = op; }
        if (fillEl) { const fq = seg(t, at, at + 0.4); fillEl.style.display = fq > 0 ? '' : 'none'; fillEl.setAttribute('opacity', f3(fq * op)); }
        if (pen) { const drawing = q > 0 && q < 1; pen.style.display = drawing ? '' : 'none'; if (drawing) { const tp = trunc(P2, len2, q), e2 = V.toSheet(tp[tp.length - 1], t); pen.setAttribute('transform', `translate(${f2(e2[0])} ${f2(e2[1])})`); } }
      });
      return { el: p, a0, at, cons };
    };
    B.draw = draw;
    const lineSet = (V, o, pts) => draw(V, pts, { pen: o.pen ?? ((o.kind ?? 'visible') === 'visible' || o.kind === 'thick'), ...o });
    // a straight line; cons: true extends it both ways (the construction line it was ruled from)
    B.line = (V, o) => { const a = o.a ?? [o.x1, o.y1], b = o.b ?? [o.x2, o.y2]; const ext = 0.18, d = [b[0] - a[0], b[1] - a[1]]; return lineSet(V, { ...o, cons: o.cons === true ? [[a[0] - d[0] * ext, a[1] - d[1] * ext], [b[0] + d[0] * ext, b[1] + d[1] * ext]] : o.cons }, [a, b]); };
    B.poly = (V, o) => lineSet(V, o, o.pts);
    B.path = (V, o) => lineSet(V, o, sample(o.d, (o.step ?? 2) / V.k));
    B.circle = (V, o) => { const a0 = o.from ?? -Math.PI / 2; return lineSet(V, { ...o, cons: o.cons === true ? arcPts(o.x, o.y, o.r * 1.0, 0, TAU, V.k) : o.cons }, arcPts(o.x, o.y, o.r, a0, a0 + TAU, V.k)); };
    B.arc = (V, o) => lineSet(V, o, arcPts(o.x, o.y, o.r, o.a0 * RAD, o.a1 * RAD, V.k));
    B.rect = (V, o) => { const { x, y, w, h, lw, ...rest } = o; return lineSet(V, { ...rest, w: lw, close: true }, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); };   // w / h are the rectangle's; lw = a line weight of its own
    // centre-line cross (dash-dot), extending a little past the circle it marks
    B.centre = (V, o) => { const r = (o.r ?? 10) * 1.18 + 8 / V.k, at = o.at ?? 0; B.line(V, { a: [o.x - r, o.y], b: [o.x + r, o.y], kind: 'centre', at, dur: o.dur ?? 0.35, until: o.until, pen: false, into: o.into }); return B.line(V, { a: [o.x, o.y - r], b: [o.x, o.y + r], kind: 'centre', at: at + 0.08, dur: o.dur ?? 0.35, until: o.until, pen: false, into: o.into }); };
    B.center = B.centre;

    // ---------- section hatching: thin 45° lines clipped to the cut face, swept in ----------
    B.hatch = (V, o) => {
      const pts = o.pts ?? (o.circle ? arcPts(o.circle.x, o.circle.y, o.circle.r, 0, TAU, V.k) : (() => { const { x, y, w, h } = o.rect; return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; })());
      const id = 'bph' + ++uid, cp = sv('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, V.S.defs);
      sv('path', { d: dOf(pts, true) + (o.hole ? dOf(arcPts(o.hole.x, o.hole.y, o.hole.r, 0, TAU, V.k), true) : ''), 'clip-rule': 'evenodd' }, cp);
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const ang = (o.angle ?? 45) * RAD, gap = (o.gap ?? 9) / V.k, dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, D = Math.hypot(x1 - x0, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const n = Math.ceil(D / gap), lines = Array.from({ length: n + 1 }, (_, i) => { const s = (i - n / 2) * gap; return [[cx + nx * s - dx * D / 2, cy + ny * s - dy * D / 2], [cx + nx * s + dx * D / 2, cy + ny * s + dy * D / 2]]; });
      const g = sv('g', { 'clip-path': `url(#${id})` }, o.into ?? V.g);
      const p = sv('path', { fill: 'none', stroke: o.color ? col(o.color) : pal.hatch, 'stroke-width': KIND.hatch.w, 'vector-effect': 'non-scaling-stroke', style: 'display:none' }, g);
      const at = o.at ?? 0, dur = o.dur ?? 0.7, until = o.until ?? 1e9; let lastK = -1;
      if (o.sfx !== false) sfx(V, at - dur, 'hatch', 0.3, { dur });
      F.add((t) => {
        const on = t >= at - dur && t < until; p.style.display = on ? '' : 'none'; if (!on) return;
        const q = seg(t, at - dur, at), kk = Math.round(q * lines.length * 4) / 4;
        if (kk !== lastK) { let d = ''; lines.forEach((l, i) => { const f = clamp(kk - i); if (f > 0) d += dOf([l[0], [l[0][0] + (l[1][0] - l[0][0]) * f, l[0][1] + (l[1][1] - l[0][1]) * f]]); }); p.setAttribute('d', d); lastK = kk; }
        p.setAttribute('opacity', f3(until < 1e8 ? 1 - seg(t, until - 0.3, until) : 1));
      });
      return { el: g };
    };

    // ---------- lettering ----------
    // technical lettering plotted in left to right (a wipe with the pen's rhythm); it follows a moving space (an exploded part) frame by frame
    B.label = (V, o) => {
      if (before(V, o.at ?? 0) && !o.instant) o = { ...o, instant: true, sfx: false, pre: true };
      const at = o.at ?? 0, until = o.until ?? 1e9, text = String(o.text), size = o.size ?? 26, font = o.font === 'stencil' ? B.font.stencil : B.font.tech;
      const align = o.align ?? 'left', va = o.valign ?? 'middle', tx = align === 'left' ? '0' : align === 'right' ? '-100%' : '-50%', ty = va === 'top' ? '0' : va === 'bottom' ? '-100%' : '-50%';
      const wrap = el('div', `left:0;top:0;white-space:${o.maxW ? 'normal' : 'pre'};${o.maxW ? `width:${f1(o.maxW)}px;` : ''}font:${o.weight ?? (o.font === 'stencil' ? 400 : 500)} ${f1(size)}px/${o.lh ?? 1.18} ${font};letter-spacing:${o.track ?? (cjk(text) ? 0.06 : 0.04)}em;color:${col(o.color ?? 'text')};text-align:${align};display:none;z-index:${o.z ?? 5}${o.knock ? `;background:${o.knock === true ? pal.knock : col(o.knock)};padding:0 ${f1(size * 0.18)}px` : ''}`, V.S.text);
      wrap.dataset.what = o.what ?? 'B.label';
      wrap.textContent = text;
      const dur = o.dur ?? clamp(0.12 + [...text].length * 0.035, 0.25, 0.9), a0 = o.instant ? at : at - dur;
      F.text(wrap, o.kind ?? 'label', text, a0, until, { noFact: o.fact === false, chrome: !!o.chrome, overlap: !!o.overlap });
      if (V.S.texts) { const e = F.texts[F.texts.length - 1]; V.S.texts.push(e); clampTexts({ texts: [e], a: V.S.a, z: V.S.z, zText: V.S.zText }); }
      track(V, wrap, a0, 'text', text);
      if (o.instant && !o.pre) F.appear(at);
      if (o.sfx !== false && !o.instant) F.sfx(a0 + 0.02, 'letter', o.gain ?? 0.2, { dur });
      const place = (t) => { const p = V.toSheet([o.x, o.y], t); return S2(p); };
      const S2 = (p) => [p[0] + V.S.ox, p[1] + V.S.oy];
      const r0 = o.rot ?? 0;   // sheet degrees: lettering stays upright in a rotated view unless a dimension aligns it
      let fixed = null;
      F.add((t) => {
        const on = t >= a0 && t < until; set(wrap, { display: on ? '' : 'none' }); if (!on) return;
        const p = V.isDyn() || !fixed ? place(t) : fixed; if (!V.isDyn()) fixed = p;
        const q = o.instant ? 1 : seg(t, a0, at, E.lin), qo = until < 1e8 ? seg(t, until - 0.28, until) : 0;
        set(wrap, { left: f1(p[0]) + 'px', top: f1(p[1]) + 'px', transform: `translate(${tx},${ty}) rotate(${f2(r0)}deg)`, transformOrigin: `${align === 'left' ? 0 : align === 'right' ? 100 : 50}% 50%`, clipPath: q < 1 ? `inset(-20% ${f1((1 - q) * 100)}% -20% -4%)` : '', opacity: qo ? String(f3(1 - qo)) : '' });
      });
      return { el: wrap };
    };
    // a view title: stencil lettering with a heavy underline and a thin one, an optional sub line (SCALE 5:1)
    B.title = (V, o) => {
      const at = o.at ?? 0, size = o.size ?? 40, k = V.k, align = o.align ?? 'center';
      const L1 = B.label(V, { x: o.x, y: o.y, text: o.text, size, font: 'stencil', align, at, until: o.until, kind: o.kind ?? 'headline', track: 0.08, gain: 0.3 });
      const wEst = (o.w ?? Math.min(900, [...String(o.text)].reduce((s, c) => s + (cjk(c) ? 1.08 : 0.62), 0) * size * 1.08)) / k, x0 = align === 'left' ? o.x : align === 'right' ? o.x - wEst : o.x - wEst / 2, uy = o.y + (size * 0.72) / k;
      B.line(V, { a: [x0, uy], b: [x0 + wEst, uy], kind: 'thick', at: at + 0.15, dur: 0.35, until: o.until, pen: false, sfx: false });
      B.line(V, { a: [x0, uy + 7 / k], b: [x0 + wEst, uy + 7 / k], kind: 'thin', at: at + 0.25, dur: 0.35, until: o.until, pen: false });
      if (o.sub) B.label(V, { x: align === 'left' ? x0 : align === 'right' ? x0 + wEst : o.x, y: uy + (size * 0.62) / k, text: o.sub, size: size * 0.52, align, at: at + 0.35, until: o.until, color: 'mute', kind: 'label' });
      return L1;
    };
    // a value that changes (a counter, a clock time, a beat count): retyped each frame; facts = the strings it can show that the fact check should see
    B.readout = (V, o) => {
      const r = B.label(V, { ...o, text: o.text(o.at ?? 0), fact: false });
      for (const s of o.facts || []) F.fact(s, o.at, o.until);
      F.add((t) => { const s = o.text(P.frameT(t)); if (r.el.textContent !== s) r.el.textContent = s; });
      return r;
    };

    // ---------- dimensions ----------
    // linear: extension lines, a dimension line with arrowheads, the value in the line's gap; dia / radius across a circle; angle: an arc between two rays
    const arrowHead = (V, tip, dir, o) => { const s = (o.size ?? 15) / V.k, wv = s * 0.32, back = [tip[0] - dir[0] * s, tip[1] - dir[1] * s], n = [-dir[1], dir[0]]; return draw(V, [[back[0] + n[0] * wv, back[1] + n[1] * wv], tip, [back[0] - n[0] * wv, back[1] - n[1] * wv]], { kind: 'thin', close: true, fill: o.color ? col(o.color) : pal.thin, at: o.at, dur: 0.12, until: o.until, into: o.into, sfx: false, color: o.color }); };
    B.dim = (V, o) => {
      const at = o.at ?? 0, until = o.until, kind = o.kind ?? 'linear', k = V.k, ts = o.size ?? 24, color = o.color;
      if (kind === 'dia' || kind === 'radius') {
        const ang = (o.angle ?? -35) * RAD, d = [Math.cos(ang), Math.sin(ang)], r = o.r, c = [o.x, o.y];
        const a = kind === 'dia' ? [c[0] - d[0] * r, c[1] - d[1] * r] : c, b = [c[0] + d[0] * r, c[1] + d[1] * r], ext = (o.ext ?? 60) / k, e2 = [b[0] + d[0] * ext, b[1] + d[1] * ext];
        draw(V, [a, e2], { kind: 'thin', at: at - 0.15, dur: 0.4, until, sfx: false, color });
        arrowHead(V, b, d, { at: at - 0.05, until, color });
        if (kind === 'dia') arrowHead(V, a, [-d[0], -d[1]], { at: at - 0.05, until, color });
        const tp = [e2[0] + d[0] * 6 / k, e2[1] + d[1] * 6 / k], right = d[0] >= 0;
        sfx(V, at - 0.3, 'dim', 0.25);
        return B.label(V, { x: tp[0], y: tp[1], text: o.text, size: ts, align: right ? 'left' : 'right', at: at + 0.25, until, kind: 'label', color: color ?? 'text' });
      }
      if (kind === 'angle') {
        const c = [o.x, o.y], r = o.r, a0 = o.a0 * RAD, a1 = o.a1 * RAD, am = (a0 + a1) / 2;
        draw(V, arcPts(c[0], c[1], r, a0, a1, k), { kind: 'thin', at: at - 0.1, dur: 0.4, until, sfx: false, color });
        const t0 = [-Math.sin(a0), Math.cos(a0)], t1 = [Math.sin(a1), -Math.cos(a1)], sg = a1 > a0 ? 1 : -1;
        arrowHead(V, [c[0] + r * Math.cos(a0), c[1] + r * Math.sin(a0)], [-t0[0] * sg, -t0[1] * sg], { at, until, color });
        arrowHead(V, [c[0] + r * Math.cos(a1), c[1] + r * Math.sin(a1)], [-t1[0] * sg, -t1[1] * sg], { at, until, color });
        if (o.rays !== false) { draw(V, [c, [c[0] + (r + 14 / k) * Math.cos(a0), c[1] + (r + 14 / k) * Math.sin(a0)]], { kind: 'thin', at: at - 0.3, dur: 0.25, until, sfx: false, color }); draw(V, [c, [c[0] + (r + 14 / k) * Math.cos(a1), c[1] + (r + 14 / k) * Math.sin(a1)]], { kind: 'thin', at: at - 0.3, dur: 0.25, until, sfx: false, color }); }
        sfx(V, at - 0.3, 'dim', 0.25);
        const rr = r + (ts * 0.9) / k;
        return B.label(V, { x: c[0] + rr * Math.cos(am), y: c[1] + rr * Math.sin(am), text: o.text, size: ts, align: 'center', at: at + 0.25, until, kind: 'label', color: color ?? 'text' });
      }
      const a = o.a, b = o.b, d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]) || 1, dn = [d[0] / L, d[1] / L], n = [-dn[1], dn[0]], off = (o.off ?? 40) / k, g = 6 / k, ov = 10 / k;
      const A = [a[0] + n[0] * off, a[1] + n[1] * off], Bp = [b[0] + n[0] * off, b[1] + n[1] * off], sgn = Math.sign(off) || 1;
      draw(V, [[a[0] + n[0] * g * sgn, a[1] + n[1] * g * sgn], [A[0] + n[0] * ov * sgn, A[1] + n[1] * ov * sgn]], { kind: 'thin', at: at - 0.45, dur: 0.22, until, sfx: false, color });
      draw(V, [[b[0] + n[0] * g * sgn, b[1] + n[1] * g * sgn], [Bp[0] + n[0] * ov * sgn, Bp[1] + n[1] * ov * sgn]], { kind: 'thin', at: at - 0.4, dur: 0.22, until, sfx: false, color });
      // the dimension line grows from the middle out to both arrowheads
      const mid = [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2];
      draw(V, [mid, A], { kind: 'thin', at: at - 0.12, dur: 0.28, until, sfx: false, color }); draw(V, [mid, Bp], { kind: 'thin', at: at - 0.12, dur: 0.28, until, sfx: false, color });
      arrowHead(V, A, [-dn[0], -dn[1]], { at: at - 0.02, until, color }); arrowHead(V, Bp, dn, { at: at - 0.02, until, color });
      sfx(V, at - 0.45, 'dim', 0.25);
      let ang = Math.atan2(dn[1], dn[0]) / RAD + ((V.rot ?? 0) / RAD); if (ang > 90.5) ang -= 180; if (ang < -89.5) ang += 180;
      const lift = (ts * 0.62) / k * (o.below ? -1 : 1) * sgn, tp = [mid[0] + n[0] * lift, mid[1] + n[1] * lift];
      return B.label(V, { x: tp[0], y: tp[1], text: o.text, size: ts, align: 'center', rot: ang, at: at + 0.3, until, kind: 'label', color: color ?? 'text' });
    };

    // ---------- leaders and balloons ----------
    // a dot on the part, a thin leader to a numbered balloon, the part's name beside it; from may sit on a moving space (on: G)
    B.leader = (V, o) => {
      const at = o.at ?? 0, until = o.until, k = V.k, br = (o.r ?? 21) / k, on = o.on ?? V;
      const to = o.to, side = o.side ?? (to[0] >= o.from[0] ? 1 : -1);
      const fromIn = (t) => { const p = on.toSheet(o.from, t), m = V.matAt(t), det = m[0] * m[3] - m[1] * m[2], x = p[0] - m[4], y = p[1] - m[5]; return [(m[3] * x - m[2] * y) / det, (-m[1] * x + m[0] * y) / det]; };
      const tail = sv('path', { fill: 'none', stroke: o.color ? col(o.color) : pal.thin, 'stroke-width': KIND.thin.w, 'vector-effect': 'non-scaling-stroke', style: 'display:none' }, V.g);
      const dot = sv('circle', { r: 4.5 / k, fill: o.color ? col(o.color) : pal.line, style: 'display:none' }, V.g);
      const a0 = at - 0.55;
      F.add((t) => {
        const vis = t >= a0 && t < (until ?? 1e9); tail.style.display = vis ? '' : 'none'; dot.style.display = vis && t >= a0 ? '' : 'none'; if (!vis) return;
        const f = fromIn(t), d = [to[0] - f[0], to[1] - f[1]], L = Math.hypot(d[0], d[1]) || 1, end = [to[0] - (d[0] / L) * br, to[1] - (d[1] / L) * br];
        const q = trap(seg(t, a0 + 0.05, at - 0.2)), pts = trunc([f, end], lenOf([f, end]), q);
        tail.setAttribute('d', dOf(pts)); dot.setAttribute('cx', f2(f[0])); dot.setAttribute('cy', f2(f[1]));
        const op = until ? 1 - seg(t, until - 0.3, until) : 1; tail.setAttribute('opacity', f3(op)); dot.setAttribute('opacity', f3(op * seg(t, a0, a0 + 0.12)));
      });
      if (o.n !== undefined && o.n !== null && o.n !== '') {
        B.circle(V, { x: to[0], y: to[1], r: br, kind: 'thin', at: at - 0.05, dur: 0.25, until, pen: false, sfx: false, color: o.color });
        B.label(V, { x: to[0], y: to[1], text: String(o.n), size: (o.r ?? 21) * 1.12, align: 'center', at: at + 0.05, dur: 0.15, until, fact: false, kind: 'label', sfx: false, color: o.color ?? 'text', font: 'tech', weight: 600 });
      }
      sfx(V, a0 + 0.05, 'dim', 0.22);
      if (o.text) return B.label(V, { x: to[0] + side * (br + 10 / k), y: to[1], text: o.text, size: o.size ?? 26, align: side > 0 ? 'left' : 'right', at: at + 0.35, until, kind: o.kind ?? 'label', color: o.color ?? 'text', maxW: o.maxW });
      return null;
    };

    // ---------- tables: parts list, spec table ----------
    // ruled rows drafted in one by one; cols = widths in sheet units; hot = row indices marked with the red pencil
    B.table = (V, o) => {
      const k = V.k, at = o.at ?? 0, every = o.every ?? 0.35, until = o.until, cols = o.cols, rh = (o.rowH ?? 46) / k, ts = o.size ?? 24;
      const rows = o.head ? [o.head, ...o.rows] : o.rows, w = cols.reduce((s, c) => s + c, 0) / k, x0 = o.x, y0 = o.y, ats = o.ats;
      const tAt = (i) => (ats && i > 0 ? ats[i - (o.head ? 1 : 0)] ?? at + i * every : at + i * every);
      B.line(V, { a: [x0, y0], b: [x0 + w, y0], kind: 'visible', at: tAt(0) - 0.1, dur: 0.4, until, pen: false });
      rows.forEach((r, i) => {
        const t = tAt(i), y = y0 + rh * (i + 1), head = o.head && i === 0;
        B.line(V, { a: [x0, y], b: [x0 + w, y], kind: head || i === rows.length - 1 ? 'visible' : 'thin', at: t, dur: 0.3, until, pen: false, sfx: false });
        let cx = x0; cols.forEach((c, j) => {
          B.line(V, { a: [cx, y - rh], b: [cx, y], kind: j === 0 ? 'visible' : 'thin', at: t, dur: 0.18, until, pen: false, sfx: false });
          const s = r[j]; if (s !== undefined && s !== null && s !== '') B.label(V, { x: cx + 10 / k, y: y - rh / 2, text: String(s), size: head ? ts * 0.78 : ts, color: head ? 'mute' : 'text', at: t + 0.2 + j * 0.06, until, kind: 'label', fact: head ? false : o.fact, sfx: j === 0 });
          cx += c / k;
        });
        B.line(V, { a: [x0 + w, y - rh], b: [x0 + w, y], kind: 'visible', at: t, dur: 0.18, until, pen: false, sfx: false });
        if ((o.hot || []).includes(i - (o.head ? 1 : 0))) B.pencil(V, { kind: 'tick', x: x0 - 26 / k, y: y - rh / 2, at: t + 0.6, until });
      });
      return { x: x0, y: y0, w, h: rh * rows.length, rowY: (i) => y0 + rh * (i + (o.head ? 1.5 : 0.5)) };
    };

    // ---------- red pencil: the one accent (a correction, a ring round the thing that matters, an arrow, a tick, a note) ----------
    B.pencil = (V, o) => {
      const at = o.at ?? 0, k = V.k, rng = window.EV.rng(Math.round((o.x ?? (o.a || [0])[0]) * 13 + at * 1000) + 3), j = (s) => (rng() - 0.5) * s / k;
      let pts = [];
      if (o.kind === 'ring' || !o.kind) { const rx = o.r ?? o.rx, ry = o.ry ?? rx, n = 48; for (let i = 0; i <= n * 1.12; i++) { const a = -2.2 + (i / n) * TAU, wob = 1 + 0.035 * Math.sin(i * 0.7) + j(0.4) * k * 0.02; pts.push([o.x + Math.cos(a) * rx * wob, o.y + Math.sin(a) * ry * wob]); } }
      else if (o.kind === 'underline') { const n = 16; for (let i = 0; i <= n; i++) pts.push([o.x + (o.w * i) / n, o.y + Math.sin(i * 0.9) * 2 / k + j(2)]); }
      else if (o.kind === 'tick') { const s = (o.size ?? 22) / k; pts = [[o.x - s * 0.5, o.y], [o.x - s * 0.1, o.y + s * 0.45], [o.x + s * 0.7, o.y - s * 0.55]]; }
      else if (o.kind === 'cross') { const s = (o.size ?? 22) / k; draw(V, [[o.x - s, o.y - s], [o.x + s, o.y + s]], { kind: 'pencil', at: at - 0.1, dur: 0.18, until: o.until, sfx: false }); pts = [[o.x + s, o.y - s], [o.x - s, o.y + s]]; }
      else if (o.kind === 'arrow') { const a = o.a, b = o.b, d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]), n2 = [-d[1] / L, d[0] / L], bend = (o.bend ?? 0.12) * L; const c = [(a[0] + b[0]) / 2 + n2[0] * bend, (a[1] + b[1]) / 2 + n2[1] * bend]; for (let i = 0; i <= 20; i++) { const s = i / 20; pts.push([(1 - s) * (1 - s) * a[0] + 2 * (1 - s) * s * c[0] + s * s * b[0], (1 - s) * (1 - s) * a[1] + 2 * (1 - s) * s * c[1] + s * s * b[1]]); } const e0 = pts[pts.length - 3], dir = [b[0] - e0[0], b[1] - e0[1]], dl = Math.hypot(dir[0], dir[1]), h = 18 / k, dn = [dir[0] / dl, dir[1] / dl], nn = [-dn[1], dn[0]]; draw(V, [[b[0] - dn[0] * h + nn[0] * h * 0.6, b[1] - dn[1] * h + nn[1] * h * 0.6], b, [b[0] - dn[0] * h - nn[0] * h * 0.6, b[1] - dn[1] * h - nn[1] * h * 0.6]], { kind: 'pencil', at: at + 0.12, dur: 0.15, until: o.until, sfx: false }); }
      const r = draw(V, pts, { kind: 'pencil', at, dur: o.dur ?? (o.kind === 'tick' ? 0.22 : 0.5), until: o.until, into: o.into, sfx: false });
      sfx(V, r.a0, 'pencil', o.gain ?? 0.4, { dur: o.dur ?? 0.5 });
      if (o.text) B.label(V, { x: o.tx ?? o.x, y: o.ty ?? o.y, text: o.text, size: o.size2 ?? 28, color: 'acc', align: o.align ?? 'left', at: at + 0.3, until: o.until, kind: 'label', weight: 600 });
      return r;
    };

    // ---------- detail views, cutting planes, dials ----------
    // a detail callout: a thin circle with a letter on the source view, and a magnified view (clipped to a circle) elsewhere on the sheet, titled DETAIL A (5:1).
    //   The returned view uses the *same local coordinates* as the source: draw the same parts into it (call the same build function) and they line up
    B.detail = (V, o) => {
      const at = o.at ?? 0, letter = o.letter ?? 'A', r = o.r, sc = o.scale ?? 4, k = V.k;
      B.circle(V, { x: o.x, y: o.y, r, kind: 'thin', at, dur: 0.5, until: o.until, pen: true, sfx: true });
      const la = (o.labelAngle ?? -45) * RAD, lp = [o.x + Math.cos(la) * (r + 26 / k), o.y + Math.sin(la) * (r + 26 / k)];
      B.label(V, { x: lp[0], y: lp[1], text: letter, size: 34, font: 'stencil', align: 'center', at: at + 0.2, until: o.until, fact: false });
      const D = B.view(V.S, { x: o.to[0], y: o.to[1], scale: k * sc, ox: o.x, oy: o.y, clip: { x: o.x, y: o.y, r }, rot: (V.rot ?? 0) / RAD });
      D.ann = B.view(V.S, { x: o.to[0], y: o.to[1], scale: k * sc, ox: o.x, oy: o.y, rot: (V.rot ?? 0) / RAD });   // same coordinates, not clipped: leaders and notes that reach outside the circle
      const ring = B.view(V.S, { x: o.to[0], y: o.to[1], scale: 1 });
      B.circle(ring, { x: 0, y: 0, r: r * k * sc, kind: 'thin', at: (o.drawAt ?? at + 0.9), dur: 0.6, until: o.until, pen: true });
      if (o.title !== false) B.title(ring, { x: 0, y: r * k * sc + 46, text: o.title ?? `DETAIL ${letter}`, sub: o.sub ?? `SCALE ${sc}:1`, size: 34, at: (o.drawAt ?? at + 0.9) + 0.4, until: o.until, kind: 'label' });
      D.ring = ring;
      return D;
    };
    // focus: the camera pushes into a part on the drawing itself and the rest of the line work falls back (to dim), so the part reads as a detail
    //   (what a DETAIL callout does on paper, without a second copy). Only the strokes of V are dimmed: draw the callout, leaders and notes on another view
    //   with the same placement (B.view(S, same x / y / scale)); lettering is never dimmed. back: true brings the whole drawing back
    B.focus = (V, o) => {
      const id = 'bpf' + ++uid, at = o.at ?? 0, dur = o.dur ?? 0.8, dim = o.dim ?? 0.14;
      const mk = sv('mask', { id, maskUnits: 'userSpaceOnUse', x: -1e5, y: -1e5, width: 2e5, height: 2e5 }, V.S.defs);
      const bg = sv('rect', { x: -1e5, y: -1e5, width: 2e5, height: 2e5, fill: '#fff' }, mk);
      if (o.r) sv('circle', { cx: o.x, cy: o.y, r: o.r, fill: '#fff' }, mk); else sv('rect', { x: o.x, y: o.y, width: o.w, height: o.h, fill: '#fff' }, mk);
      V.g.setAttribute('mask', `url(#${id})`);
      let last = -1;
      F.add((t) => { let q = seg(t, at, at + dur, E.sine); if (o.back !== undefined) q *= 1 - seg(t, o.back, o.back + dur, E.sine); const v = Math.round(255 * lerp(1, dim, q)); if (v !== last) { bg.setAttribute('fill', `rgb(${v},${v},${v})`); last = v; } });
      return V;
    };
    // a cutting plane: chain line with thick ends, arrows showing the viewing direction, letters at both ends (A–A)
    B.cutline = (V, o) => {
      const at = o.at ?? 0, k = V.k, a = o.a, b = o.b, d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]), dn = [d[0] / L, d[1] / L], n = o.flip ? [dn[1], -dn[0]] : [-dn[1], dn[0]], e = 30 / k;
      draw(V, [a, b], { kind: 'cut', at, dur: 0.6, until: o.until, pen: true });
      draw(V, [a, [a[0] + dn[0] * e, a[1] + dn[1] * e]], { kind: 'thick', at: at - 0.3, dur: 0.15, until: o.until, sfx: false });
      draw(V, [b, [b[0] - dn[0] * e, b[1] - dn[1] * e]], { kind: 'thick', at: at + 0.05, dur: 0.15, until: o.until, sfx: false });
      for (const p of [a, b]) { const tip = [p[0] + n[0] * 34 / k, p[1] + n[1] * 34 / k]; draw(V, [p, tip], { kind: 'thin', at: at + 0.1, dur: 0.15, until: o.until, sfx: false }); arrowHead(V, tip, n, { at: at + 0.2, until: o.until, size: 18 }); B.label(V, { x: tip[0] + n[0] * 22 / k, y: tip[1] + n[1] * 22 / k, text: o.letter ?? 'A', size: 32, font: 'stencil', align: 'center', at: at + 0.35, until: o.until, fact: false }); }
    };
    B.dial = (V, o) => {
      const at = o.at ?? 0, r = o.r, k = V.k;
      B.circle(V, { x: o.x, y: o.y, r, kind: 'visible', at, dur: 0.7, until: o.until, cons: true });
      const n = o.ticks ?? 60, d = sv('path', { fill: 'none', stroke: pal.thin, 'stroke-width': 1.4, 'vector-effect': 'non-scaling-stroke', style: 'display:none' }, V.g);
      let s = ''; for (let i = 0; i < n; i++) { const a = (i / n) * TAU - Math.PI / 2, big = i % (n / 12) === 0, r1 = r * (big ? 0.86 : 0.93); s += dOf([[o.x + Math.cos(a) * r1, o.y + Math.sin(a) * r1], [o.x + Math.cos(a) * r * 0.985, o.y + Math.sin(a) * r * 0.985]]); }
      d.setAttribute('d', s);
      F.add((t) => { const q = seg(t, at, at + 0.5); d.style.display = q > 0 && t < (o.until ?? 1e9) ? '' : 'none'; d.setAttribute('stroke-dasharray', `${f1(q * 4000)} 4000`); });
    };

    // ---------- frame-fixed furniture: drawing border with zone marks, title block ----------
    let fur = null;
    const furniture = () => fur ??= F.layer('pointer-events:none', 80);
    B.frame = (o = {}) => {
      const L = furniture(), m = F.px(o.margin ?? 22), lw = F.px(2.2), at = o.at ?? 0;
      B._frameIn = m + lw;
      const box = el('div', `left:${m}px;top:${m}px;right:${m}px;bottom:${m}px;box-shadow:inset 0 0 0 ${lw}px ${pal.thin}, inset 0 0 0 ${lw + F.px(9)}px transparent, inset 0 0 0 ${lw + F.px(10.4)}px ${pal.cons};opacity:0`, L);
      box.dataset.what = 'B.frame';
      const nz = PT ? [4, 8] : [8, 4], marks = [];
      for (let i = 1; i < nz[0]; i++) marks.push(el('div', `left:${f1(m + ((W - 2 * m) * i) / nz[0])}px;top:${m}px;width:${f1(lw * 0.7)}px;height:${F.px(10)}px;background:${pal.thin};opacity:0`, L), el('div', `left:${f1(m + ((W - 2 * m) * i) / nz[0])}px;bottom:${m}px;width:${f1(lw * 0.7)}px;height:${F.px(10)}px;background:${pal.thin};opacity:0`, L));
      for (let i = 1; i < nz[1]; i++) marks.push(el('div', `top:${f1(m + ((H - 2 * m) * i) / nz[1])}px;left:${m}px;height:${f1(lw * 0.7)}px;width:${F.px(10)}px;background:${pal.thin};opacity:0`, L), el('div', `top:${f1(m + ((H - 2 * m) * i) / nz[1])}px;right:${m}px;height:${f1(lw * 0.7)}px;width:${F.px(10)}px;background:${pal.thin};opacity:0`, L));
      for (const x of [box, ...marks]) x.dataset.motion = 'skip';
      F.add((t) => { const q = String(f3(seg(t, at, at + 0.6))); set(box, { opacity: q }); for (const x of marks) set(x, { opacity: q }); });
    };
    // title block: drawing title, number, scale, sheet n / N, date, drawn by; keys = [{ at, sheet, scale, title }] update fields (they are re-lettered)
    B.block = (o = {}) => {
      const L = furniture(), m = F.px(22), at = o.at ?? 0, s = F.px(1), bw = s * (PT ? 1080 - 44 : 440), bh = s * (PT ? 96 : 156);
      const x0 = PT ? m : W - m - bw, y0 = H - m - bh;
      const blk = el('div', `left:${f1(x0)}px;top:${f1(y0)}px;width:${f1(bw)}px;height:${f1(bh)}px;background:${pal.bg};box-shadow:inset 0 0 0 ${f1(s * 2.2)}px ${pal.thin};opacity:0;font-family:${B.font.tech};color:${pal.text}`, L);
      blk.dataset.what = 'B.block'; blk.dataset.motion = 'skip'; B._block = blk;
      // cells: [x, y, w, h] fractions; the title cell is the big one
      const cells = PT ? { title: [0, 0, 0.5, 1], no: [0.5, 0, 0.22, 0.5], scale: [0.72, 0, 0.14, 0.5], sheet: [0.86, 0, 0.14, 0.5], date: [0.5, 0.5, 0.22, 0.5], by: [0.72, 0.5, 0.28, 0.5] }
        : { title: [0, 0, 1, 0.46], no: [0, 0.46, 0.5, 0.27], scale: [0.5, 0.46, 0.25, 0.27], sheet: [0.75, 0.46, 0.25, 0.27], date: [0, 0.73, 0.5, 0.27], by: [0.5, 0.73, 0.5, 0.27] };
      const NAMES = { no: 'DWG NO.', scale: 'SCALE', sheet: 'SHEET', date: 'DATE', by: 'DRAWN', title: 'TITLE' };
      const fields = {};
      for (const [key, [cx, cy, cw, ch]] of Object.entries(cells)) {
        const c = el('div', `left:${f1(cx * bw)}px;top:${f1(cy * bh)}px;width:${f1(cw * bw)}px;height:${f1(ch * bh)}px;box-shadow:inset 0 0 0 ${f1(s * 1)}px ${pal.cons};overflow:hidden`, blk);
        const nm = el('div', `left:${f1(s * 7)}px;top:${f1(s * 3)}px;font:500 ${f1(s * 11)}px/1 ${B.font.tech};letter-spacing:.14em;color:${pal.mute}`, c); nm.textContent = NAMES[key];
        const big = key === 'title', v = el('div', `left:${f1(s * 7)}px;bottom:${f1(s * (big ? 6 : 3))}px;right:${f1(s * 6)}px;white-space:nowrap;font:${big ? 400 : 500} ${f1(s * (big ? (PT ? 24 : 28) : PT ? 17 : 18))}px/1.1 ${big ? B.font.stencil : B.font.tech};letter-spacing:${big ? 0.06 : 0.05}em;color:${pal.text}`, c);
        fields[key] = v;
      }
      const vals = { title: o.title ?? '', no: o.no ?? 'BP-001', scale: o.scale ?? '1:1', sheet: o.sheet ?? `1/${o.sheets ?? 1}`, date: o.date ?? '', by: o.by ?? '' };
      const keys = [{ at, ...vals }, ...(o.keys || []).map((k) => ({ ...k }))].sort((p, q) => p.at - q.at);
      // resolve each key against the one before; register each field value for the checks (the title and drawing data are facts; layout labels are not)
      let cur = {}; keys.forEach((k, i) => { cur = { ...cur, ...k }; k.v = { ...cur }; k.end = keys[i + 1] ? keys[i + 1].at : 1e9; });
      for (const key of Object.keys(fields)) {
        let segs = []; keys.forEach((k, i) => { const v = k.v[key]; if (!segs.length || segs[segs.length - 1].v !== v) segs.push({ v, a: k.at, b: k.end }); else segs[segs.length - 1].b = k.end; });
        fields[key]._segs = segs;
        for (const sg of segs) if (sg.v) F.fact(String(sg.v), sg.a, sg.b);
      }
      F.add((t) => {
        set(blk, { opacity: String(f3(seg(t, at, at + 0.5))) });
        for (const key of Object.keys(fields)) {
          const segs = fields[key]._segs, sg = segs.find((x) => t >= x.a && t < x.b) ?? segs[0], v = fields[key];
          if (v.textContent !== String(sg.v ?? '')) v.textContent = String(sg.v ?? '');
          const q = seg(t, sg.a + 0.1, sg.a + 0.1 + clamp(0.1 + String(sg.v ?? '').length * 0.03, 0.2, 0.7));
          set(v, { clipPath: q < 1 ? `inset(-10% ${f1((1 - q) * 100)}% -10% 0)` : '' });
        }
      });
      for (const k of keys.slice(1)) if (k.sheet) F.sfx(k.at + 0.1, 'stamp', 0.22);
      return { el: blk, box: { x: x0, y: y0, w: bw, h: bh } };
    };

    // ---------- mechanism clock ----------
    // mechanism time = ∫ rate dt; rate eases from key to key (slow motion 1/16, real time 1, time-lapse 60…); rate 0 = stopped
    B.clock = (keys = [{ at: 0, rate: 1 }]) => {
      const K = [...keys].sort((p, q) => p.at - q.at), ramp = (k) => k.ramp ?? 0.5;
      const rate = (t) => { let r = K[0].rate; for (const k of K) { if (t < k.at - ramp(k)) break; r = lerp(r, k.rate, smooth((t - (k.at - ramp(k))) / Math.max(1e-6, ramp(k)))); } return r; };
      // integrate on a fine grid once (pure, deterministic)
      const dt = 1 / 240, N = Math.ceil(((F.duration ?? 120) + 2) / dt), acc = new Float64Array(N + 1);
      for (let i = 1; i <= N; i++) acc[i] = acc[i - 1] + rate((i - 0.5) * dt) * dt;
      const fn = (t) => { if (t <= 0) return t * K[0].rate; const x = t / dt, i = Math.min(N - 1, Math.floor(x)); return acc[i] + (acc[i + 1] - acc[i]) * (x - i); };
      fn.rate = rate;
      return fn;
    };

    // ---------- mechanisms ----------
    B.mech = (V, mo = {}) => {
      const Mx = { V }, time = mo.time ?? ((t) => t), bodies = {}, edges = [];
      let driver = null, solved = false, tNow = 0;
      F.add((t) => { tNow = t; });   // first each frame: components that depend on the on-screen speed read it
      const need = () => { if (!solved) solve(); };
      // kinematic solve: from the driver outward, every body's angle = k · θ_driver(tm) + c (meshing pairs turn the other way at the tooth ratio,
      //   with the phase set so a tooth of one sits in a gap of the other on the line of centres; bodies on one arbor turn together)
      function solve() {
        solved = true;
        for (const b of Object.values(bodies)) { b.k = 0; b.c = b.phase ?? 0; b.done = false; }
        if (!driver) return;
        const r = bodies[driver]; r.k = 1; r.c = r.phase ?? 0; r.done = true;
        const queue = [r];
        while (queue.length) {
          const a = queue.shift();
          for (const e of edges) {
            const other = e.a === a.id ? e.b : e.b === a.id ? e.a : null; if (!other) continue;
            const b = bodies[other]; if (b.done) continue;
            if (e.type === 'arbor') { b.k = a.k; b.c = a.c + (b.phase ?? 0) - (a.phase ?? 0); }
            else if (e.type === 'mesh') {
              const phi = Math.atan2(b.y - a.y, b.x - a.x), ratio = a.N / b.N, pb = TAU / b.N;
              b.k = -ratio * a.k; b.c = -ratio * a.c + (phi + Math.PI - pb / 2 + ratio * phi) + (b.toothOff ?? 0) - ratio * (a.toothOff ?? 0);
            } else if (e.type === 'rack') { b.k = -a.k * a.rp; b.c = 0; }
            b.done = true; queue.push(b);
          }
        }
      }
      const angle = (id, tm) => { need(); const b = bodies[id]; if (!b) return 0; if (b.fn) return b.fn(tm); if (!driver) return b.phase ?? 0; return b.k * bodies[driver].drive(tm) + b.c; };
      Mx.angle = angle;
      Mx.ratio = (a, b) => { need(); return bodies[a].k / bodies[b].k; };
      // average turning rate in turns per mechanism-second (sign: + clockwise on screen)
      Mx.rate = (id) => { need(); return driver ? (bodies[id].k * bodies[driver].avg) / TAU : 0; };
      Mx.body = (id) => bodies[id];
      Mx.time = time;
      Mx.drive = (id, fn, avg) => { driver = id; bodies[id].drive = fn; bodies[id].avg = avg ?? 0; solved = false; return Mx; };
      // a point fixed on a body, in the mechanism view's coordinates, at frame time t
      Mx.pt = (id, p) => (t) => { const b = bodies[id], tm = time(t), a = b.rot ? angle(id, tm) : 0, off = b.off ? b.off(tm) : [0, 0]; const q = rot(p, a); return [b.x + q[0] + off[0], b.y + q[1] + off[1]]; };
      // a rotating body: an outer group at (x, y) and an inner group turned by angle(id, tm) each frame
      const body = (o, kind) => {
        const id = o.id ?? `${kind}${++uid}`;
        const host = o.into ?? V.g, outer = sv('g', { transform: `translate(${f2(o.x)} ${f2(o.y)})` }), inner = sv('g', {}, outer);
        if (o.under) host.insertBefore(outer, host.firstChild); else host.appendChild(outer);   // under: beneath what is already drawn (a wheel below its neighbour)
        const b = { id, kind, x: o.x, y: o.y, g: inner, outer, phase: (o.phase ?? 0) * RAD, rot: true };
        bodies[id] = b; solved = false;
        const space = spaceOf(V.S, V, inner, V.k, (t) => { const tm = time(t), a = angle(id, tm), off = b.off ? b.off(tm) : [0, 0]; return mTRS(b.x + off[0], b.y + off[1], a, 1); }, true);
        space.k = V.k; space.rot = V.rot ?? 0; b.space = space;
        let last = '';
        F.add((t) => { const tm = time(t), a = b.rot ? angle(id, tm) / RAD : 0, off = b.off ? b.off(tm) : [0, 0]; const s = `translate(${f2(b.x + off[0])} ${f2(b.y + off[1])})`; if (b.off && s !== b._lt) { outer.setAttribute('transform', s); b._lt = s; } const r = `rotate(${f3(a)})`; if (r !== last) { inner.setAttribute('transform', r); last = r; } });
        return b;
      };
      Mx.space = (id) => bodies[id].space;

      // M.gear: kind wheel | pinion | escape | barrel; teeth N, module m; place with x, y — or mesh: 'id', dir: degrees (centre distance = m (N1 + N2) / 2) — or arbor: 'id' (same axis)
      //   drive: (tm) => angle (radians) or rate: turns per mech-second makes it the driver; spokes (0 = solid, 3–6 crossings), hub, bore; jewel: true draws the jewel bearing
      Mx.gear = (o) => {
        const kind = o.kind ?? 'wheel', N = o.teeth, m = o.m ?? 1, at = o.at ?? 0, until = o.until;
        let x = o.x, y = o.y;
        const mate = o.mesh ? bodies[o.mesh] : null, ax = o.arbor ? bodies[o.arbor] : null;
        if (ax) { x = ax.x; y = ax.y; }
        if (mate && (x === undefined || y === undefined)) { const d = ((mate.m + m) / 2) * ((mate.N + N) / 2), a = (o.dir ?? 0) * RAD; x = mate.x + Math.cos(a) * d; y = mate.y + Math.sin(a) * d; }
        const lean = o.lean ?? 1;
        const G = gearPts(N, m, kind, lean), b = body({ ...o, x, y }, 'gear');
        Object.assign(b, { N, m, rp: G.rp, ra: G.ra, rf: G.rf, gkind: kind, explicit: o.x !== undefined && !!mate });
        if (mate) { edges.push({ type: 'mesh', a: mate.id, b: b.id }); b.mate = mate.id; }
        if (ax) edges.push({ type: 'arbor', a: ax.id, b: b.id });
        if (o.drive || o.rate !== undefined) Mx.drive(b.id, o.drive ?? ((tm) => tm * o.rate * TAU), o.rate !== undefined ? o.rate * TAU : 0);
        const g = b.g, K = (k2) => k2 / V.k;
        const dur = o.dur ?? clamp(0.6 + N * 0.006, 0.6, 1.4), kd = o.line ?? 'visible';
        // construction: the pitch circle (it stays: a gear is drawn with its pitch circle as a thin chain line) and the tip circle, then the centre lines
        if (o.pitch !== false) draw(V, arcPts(0, 0, G.rp, 0, TAU, V.k), { kind: 'centre', at: at - dur - 0.1, dur: 0.45, until, into: g, sfx: false });
        if (!o.instant) draw(V, arcPts(0, 0, G.ra, 0, TAU, V.k), { kind: 'cons', at: at - dur - 0.15, dur: 0.4, until, into: g, keep: 0, sfx: false });
        if (o.centre !== false) { const cr = G.ra * 1.08 + K(10); B.line({ ...V, g: b.outer }, { a: [-cr, 0], b: [cr, 0], kind: 'centre', at: at - dur, dur: 0.3, until, pen: false, sfx: false }); B.line({ ...V, g: b.outer }, { a: [0, -cr], b: [0, cr], kind: 'centre', at: at - dur + 0.05, dur: 0.3, until, pen: false, sfx: false }); }
        draw(b.space, G.pts, { kind: kd, close: true, at, dur, until, into: g, pen: o.pen ?? !o.instant, instant: o.instant, fill: o.fill });
        // body: crossings (spoked windows) or a solid web, the hub and the bore
        const spokes = o.spokes ?? (kind === 'pinion' ? 0 : kind === 'escape' ? 4 : kind === 'barrel' ? 0 : 5);
        const rim = G.rf - Math.max(m * 1.2, G.rf * 0.12), hub = o.hub ?? Math.max(G.rf * 0.2, m * 2.2);
        const wins = [];
        if (spokes && rim > hub * 1.6) {
          const arm = Math.max(0.09, 0.32 / spokes);
          for (let i = 0; i < spokes; i++) {
            const a0 = (i / spokes) * TAU + arm, a1 = ((i + 1) / spokes) * TAU - arm, hr = hub * 1.35;
            const pts = [...arcPts(0, 0, rim, a0, a1, V.k), ...arcPts(0, 0, hr, a1 - arm * 0.6, a0 + arm * 0.6, V.k)];
            wins.push(pts);
            draw(b.space, pts, { kind: kd, close: true, at: at + 0.1 + i * 0.05, dur: 0.35, until, into: g, sfx: false });
          }
        }
        if (kind !== 'pinion') draw(b.space, arcPts(0, 0, hub, 0, TAU, V.k), { kind: kd, at: at + 0.15, dur: 0.3, until, into: g, sfx: false });
        const bore = o.bore ?? Math.max(K(5), hub * 0.38);
        draw(b.space, arcPts(0, 0, bore, 0, TAU, V.k), { kind: 'thin', at: at + 0.2, dur: 0.25, until, into: g, sfx: false });
        if (o.jewel) { draw(V, arcPts(0, 0, bore * 1.9, 0, TAU, V.k), { kind: 'thin', at: at + 0.3, dur: 0.3, until, into: b.outer, sfx: false, color: o.jewelColor }); }
        // solid: the part is opaque (it hides what lies beneath it on the drawing), with its crossings and bore open
        if (o.solid !== false) {
          let d = dOf(G.pts, true) + dOf(arcPts(0, 0, bore, 0, TAU, V.k), true);
          for (const wp of wins) d += dOf(wp, true);
          const sp = sv('path', { d, fill: o.solidColor ? col(o.solidColor) : pal.bg, 'fill-rule': 'evenodd', stroke: 'none', style: 'display:none' }, g);
          g.insertBefore(sp, g.firstChild);
          F.add((t) => { const q = seg(t, at - dur * 0.25, at + 0.2), on = q > 0 && t < (until ?? 1e9); sp.style.display = on ? '' : 'none'; if (on) sp.setAttribute('opacity', f3(q * (until ? 1 - seg(t, until - 0.3, until) : 1))); });
        }
        // speed blur: a wheel turning more than ~0.3 tooth pitch per frame would strobe (teeth seem to stand still or run backwards):
        //   its teeth fade and a soft ring takes their place, the way a fast wheel looks to the eye
        if (o.blur !== false) {
          const ring = sv('circle', { r: f3((G.ra + G.rf) / 2), fill: 'none', stroke: pal.line, 'stroke-width': f3((G.ra - G.rf) * 1.3), opacity: 0, style: 'display:none' }, b.outer);
          b.blurOn = true;
          F.add((t) => {
            if (t < at || t >= (until ?? 1e9)) { ring.style.display = 'none'; return; }
            const st = Math.abs(angle(b.id, time(t)) - angle(b.id, time(t - 1 / 30))) / (TAU / N), q = smooth((st - 0.22) / 0.2);
            ring.style.display = q > 0.01 ? '' : 'none'; if (q > 0.01) ring.setAttribute('opacity', f3(q * 0.22));
            g.setAttribute('opacity', f3(1 - q * 0.62));
          });
        }
        // a reference mark on the web (turning is visible even when the teeth blur)
        if (o.mark !== false && kind !== 'pinion') { const mr = kind === 'barrel' ? G.rf * 0.75 : (rim + hub) / 2; draw(b.space, [[hub * 1.1, 0], [spokes ? hub * 1.35 : mr, 0]], { kind: 'thin', at: at + 0.25, dur: 0.2, until, into: g, sfx: false }); }
        return b;
      };

      // M.escapement: the Swiss lever escapement and the balance. wheel = an escape gear (kind 'escape'); bph = beats per hour (28,800 = 4 Hz);
      //   amp = balance amplitude in degrees; impulse = the fraction of a beat the wheel spends moving (stylized: real impulses are a few % of a beat);
      //   fork: { dist, angle (deg, direction from the wheel), swing (deg) }, balance: { r, dist }. It becomes the driver of the train:
      //   the escape wheel advances half a tooth per beat; the fork flips side on each beat; the balance swings A·sin(π·beats).
      //   Ticks: one 'tick' / 'tock' sound per beat whenever the beats are slower than ~6 per second on screen.
      Mx.escapement = (o) => {
        const ew = bodies[o.wheel], Nz = ew.N, pitch = TAU / Nz, at = o.at ?? 0, until = o.until, dir = o.dir ?? 1;
        const f = (o.bph ?? 28800) / 7200, A = (o.amp ?? 270) * RAD, w = o.impulse ?? 0.16, span = (o.span ?? 2.5) * pitch;
        const fa = (o.fork?.angle ?? -90) * RAD, fd = o.fork?.dist ?? ew.ra * 1.55, Pf = [ew.x + Math.cos(fa) * fd, ew.y + Math.sin(fa) * fd], swing = (o.fork?.swing ?? 9) * RAD;
        const bd = o.balance?.dist ?? fd * 1.25, br = o.balance?.r ?? ew.ra * 1.9, Bc = [Pf[0] + Math.cos(fa) * bd, Pf[1] + Math.sin(fa) * bd];
        // beats x(tm) = 2 f tm; progress p(x) = round(x) + smoothstep over the impulse window centred on each integer (the balance's zero crossing)
        const prog = (x) => { const k = Math.round(x); return k + smooth((x - k) / w + 0.5); };
        // fast on screen: blend to the smooth average (no strobing)
        const ratePx = (t) => Math.abs(2 * f * ((time(t + 0.02) - time(t - 0.02)) / 0.04));
        const pAt = (tm) => { const x = 2 * f * tm, r = ratePx(tNow), s = smooth((r - 4) / 6); return lerp(prog(x), x, s); };
        // phase: a tooth tip just short of the entry pallet's locking face at p = 0
        const phiC = Math.atan2(Pf[1] - ew.y, Pf[0] - ew.x), phiEntry = phiC - (dir * span) / 2, phiExit = phiC + (dir * span) / 2;
        const tipA = (-pitch * 0.5 + dir * pitch * 0.55 * 1), lockA = o.lock ?? pitch * 0.06;
        const c0 = phiEntry - dir * lockA - tipA;
        Mx.drive(ew.id, (tm) => c0 + dir * pAt(tm) * (pitch / 2), dir * f * pitch);
        ew.phase = 0;   // the driver's phase lives inside its drive function
        // the pallet fork: pallets on the tip circle at ±span/2 about the line of centres, rocking ±swing; the lever to the balance ends in the fork slot
        const fork = body({ id: o.forkId ?? 'fork', x: Pf[0], y: Pf[1], into: o.into }, 'fork');
        // too fast to follow (beats faster than ~6 per second on screen): the fork and the balance blur instead of strobing
        const fastQ = () => smooth((ratePx(tNow) - 4) / 6);
        fork.fn = (tm) => inE * swing * Math.cos(Math.PI * pAt(tm)) * (1 - fastQ());
        const lockIn = ew.ra - (o.depth ?? ew.m * 0.7), Rk = (p, a) => rot([p[0] - Pf[0], p[1] - Pf[1]], a);
        // which way must the fork turn to bring each stone *in*? Turning the fork moves a stone round its arbor; the sign whose motion points away from
        //   the wheel's centre lifts it out. Entry and exit stones lie on opposite sides of the line of centres, so their signs are opposite.
        const inSign = (phi) => { const P2 = [ew.x + Math.cos(phi) * lockIn, ew.y + Math.sin(phi) * lockIn], v = [P2[0] - Pf[0], P2[1] - Pf[1]], r = [Math.cos(phi), Math.sin(phi)]; return -Math.sign(-v[1] * r[0] + v[0] * r[1]) || 1; };
        const inE = inSign(phiEntry), inX = inSign(phiExit);
        if (inE === inX) console.warn('blueprint escapement: both pallets lock on the same fork swing — move the fork (fork.angle / fork.dist)');
        const stone = (phi, sgn) => {
          // the stone's locking corner sits at radius lockIn on the wheel when the fork is at sgn·swing; in fork coordinates it is that point turned back
          const tip = [ew.x + Math.cos(phi) * lockIn, ew.y + Math.sin(phi) * lockIn], rad = [Math.cos(phi), Math.sin(phi)], tg = [-rad[1], rad[0]];
          const L2 = ew.m * 3.0, W2 = pitch * ew.ra * 0.34;
          // the locking face is the stone's trailing edge (facing the oncoming tooth); the body lies ahead of it
          const pts = [tip, [tip[0] + rad[0] * L2, tip[1] + rad[1] * L2], [tip[0] + rad[0] * L2 + tg[0] * W2 * dir, tip[1] + rad[1] * L2 + tg[1] * W2 * dir], [tip[0] + tg[0] * W2 * dir + rad[0] * ew.m * 0.5, tip[1] + tg[1] * W2 * dir + rad[1] * ew.m * 0.5]];
          return pts.map((p) => Rk(p, -sgn * swing));
        };
        const sE = stone(phiEntry, inE), sX = stone(phiExit, inX), fs = fork.space, at2 = at + 0.6;
        // the fork as one solid part (opaque: it hides the wheel beneath): the lever to the balance with its horns and slot, two arms out to the stones, the hub
        const hubR = ew.m * 2.4, slotD = bd - (o.balance?.roller ?? br * 0.22), d0 = [Math.cos(fa), Math.sin(fa)], nn = [-d0[1], d0[0]];   // the lever points from the fork's arbor to the balance
        const lw = ew.m * 1.1, horn = ew.m * 1.9, slotW = ew.m * 0.9, Ls = slotD, P3 = (a2, b2) => [d0[0] * a2 + nn[0] * b2, d0[1] * a2 + nn[1] * b2];
        const leverPts = [P3(0, lw), P3(Ls - horn, lw), P3(Ls + horn * 0.6, horn), P3(Ls + horn * 0.3, slotW), P3(Ls - horn * 0.4, slotW), P3(Ls - horn * 0.4, -slotW), P3(Ls + horn * 0.3, -slotW), P3(Ls + horn * 0.6, -horn), P3(Ls - horn, -lw), P3(0, -lw)];
        const solid = o.forkFill ?? 'bg';
        draw(fs, leverPts, { kind: 'visible', close: true, at: at + 0.4, dur: 0.6, until, into: fork.g, pen: o.pen ?? true, fill: solid });
        const back = (st) => [(st[1][0] + st[2][0]) / 2, (st[1][1] + st[2][1]) / 2], aw = ew.m * 1.25;
        for (const st of [sE, sX]) {
          const bk = back(st), L0 = Math.hypot(bk[0], bk[1]), u2 = [bk[0] / L0, bk[1] / L0], v2 = [-u2[1], u2[0]], e2 = [bk[0] + u2[0] * ew.m * 0.3, bk[1] + u2[1] * ew.m * 0.3];
          draw(fs, [[v2[0] * aw, v2[1] * aw], [e2[0] + v2[0] * aw, e2[1] + v2[1] * aw], [e2[0] - v2[0] * aw, e2[1] - v2[1] * aw], [-v2[0] * aw, -v2[1] * aw]], { kind: 'visible', close: true, at: at + 0.5, dur: 0.4, until, into: fork.g, sfx: false, fill: solid });
        }
        draw(fs, arcPts(0, 0, hubR * 0.85, 0, TAU, V.k), { kind: 'visible', at: at + 0.55, dur: 0.3, until, into: fork.g, sfx: false, fill: solid });
        draw(fs, arcPts(0, 0, hubR * 0.3, 0, TAU, V.k), { kind: 'thin', at: at + 0.6, dur: 0.2, until, into: fork.g, sfx: false });
        // the pallet stones (jewels), set into the arms' ends
        draw(fs, sE, { kind: 'visible', close: true, at: at2, dur: 0.3, until, into: fork.g, fill: o.stoneFill ?? 'thin', sfx: false });
        draw(fs, sX, { kind: 'visible', close: true, at: at2 + 0.1, dur: 0.3, until, into: fork.g, fill: o.stoneFill ?? 'thin', sfx: false });
        // banking pins: the lever's two stops
        for (const sg of [-1, 1]) { const bp = rot([d0[0] * Ls * 0.55 + nn[0] * (lw + ew.m * 0.8) * sg, d0[1] * Ls * 0.55 + nn[1] * (lw + ew.m * 0.8) * sg], sg * swing); draw(V, arcPts(Pf[0] + bp[0] + nn[0] * sg * ew.m * 0.45, Pf[1] + bp[1] + nn[1] * sg * ew.m * 0.45, ew.m * 0.45, 0, TAU, V.k), { kind: 'thin', at: at + 0.7, dur: 0.2, until, into: o.into, sfx: false }); }
        // the balance: rim, arms, timing screws, roller with the impulse pin (pointing at the fork at rest), and the hairspring
        const bal = body({ id: o.balanceId ?? 'balance', x: Bc[0], y: Bc[1], into: o.into }, 'balance');
        bal.fn = (tm) => A * Math.sin(Math.PI * 2 * f * tm) * (1 - fastQ());
        { const blurR = sv('circle', { cx: Bc[0], cy: Bc[1], r: f3(br * 0.94), fill: 'none', stroke: pal.line, 'stroke-width': f3(br * 0.14), opacity: 0, style: 'display:none' }, o.into ?? V.g);
          F.add((t) => { const q = t >= at && t < (until ?? 1e9) ? fastQ() : 0; blurR.style.display = q > 0.01 ? '' : 'none'; blurR.setAttribute('opacity', f3(q * 0.25)); bal.g.setAttribute('opacity', f3(1 - q * 0.6)); }); }
        const bs = bal.space, bg2 = bal.g, toFork = Math.atan2(Pf[1] - Bc[1], Pf[0] - Bc[0]);
        draw(bs, arcPts(0, 0, br, 0, TAU, V.k), { kind: 'visible', at: at + 0.9, dur: 0.7, until, into: bg2, pen: o.pen ?? true, cons: true });
        draw(bs, arcPts(0, 0, br * 0.88, 0, TAU, V.k), { kind: 'visible', at: at + 1.0, dur: 0.6, until, into: bg2, sfx: false });
        const arms = o.balance?.arms ?? 3;
        for (let i = 0; i < arms; i++) { const a = toFork + Math.PI / arms + (i / arms) * TAU, n2 = [-Math.sin(a), Math.cos(a)], aw = br * 0.045; draw(bs, [[n2[0] * aw, n2[1] * aw], [Math.cos(a) * br * 0.88 + n2[0] * aw, Math.sin(a) * br * 0.88 + n2[1] * aw], [Math.cos(a) * br * 0.88 - n2[0] * aw, Math.sin(a) * br * 0.88 - n2[1] * aw], [-n2[0] * aw, -n2[1] * aw]], { kind: 'visible', close: true, at: at + 1.1 + i * 0.05, dur: 0.3, until, into: bg2, sfx: false }); }
        for (let i = 0; i < (o.balance?.screws ?? 8); i++) { const a = toFork + Math.PI / 8 + (i / (o.balance?.screws ?? 8)) * TAU; draw(bs, arcPts(Math.cos(a) * br * 1.04, Math.sin(a) * br * 1.04, br * 0.05, 0, TAU, V.k), { kind: 'thin', at: at + 1.3, dur: 0.2, until, into: bg2, sfx: false }); }
        const roller = o.balance?.roller ?? br * 0.22;
        draw(bs, arcPts(0, 0, roller, 0, TAU, V.k), { kind: 'visible', at: at + 1.2, dur: 0.3, until, into: bg2, sfx: false });
        const ip = [Math.cos(toFork) * roller * 0.82, Math.sin(toFork) * roller * 0.82];
        draw(bs, arcPts(ip[0], ip[1], ew.m * 0.42, 0, TAU, V.k), { kind: 'visible', at: at + 1.3, dur: 0.2, until, into: bg2, fill: o.stoneFill ?? true, sfx: false });
        // hairspring: an Archimedean spiral; the inner end turns with the balance, the outer end is pinned at the stud, so the coils breathe
        if (o.hairspring !== false) {
          const hs = sv('path', { fill: 'none', stroke: pal.line, 'stroke-width': 1.6, 'vector-effect': 'non-scaling-stroke', style: 'display:none' }, V.g);
          const r0 = roller * 1.15, r1 = br * 0.66, turns = o.balance?.turns ?? 9, n = turns * 48, stud = toFork + Math.PI * 0.8;
          const pts = (ab, q) => { const out = []; const m2 = Math.max(2, Math.round(n * q)); for (let i = 0; i <= m2; i++) { const s = i / n, r = r0 + (r1 - r0) * s, a = stud - TAU * turns * (1 - s) + ab * (1 - s) * 1; out.push([Bc[0] + Math.cos(a) * r, Bc[1] + Math.sin(a) * r]); } return out; };
          const a0 = at + 1.5, hd = 0.9;
          F.add((t) => { const on = t >= a0 - hd && t < (until ?? 1e9); hs.style.display = on ? '' : 'none'; if (!on) return; hs.setAttribute('d', dOf(pts(angle(bal.id, time(t)), trap(seg(t, a0 - hd, a0))))); hs.setAttribute('opacity', f3(until ? 1 - seg(t, until - 0.3, until) : 1)); });
          if (o.pen !== false) sfx(V, a0 - hd, 'draw', 0.22, { dur: hd });
          const sp = [Bc[0] + Math.cos(stud) * r1, Bc[1] + Math.sin(stud) * r1];
          draw(V, arcPts(sp[0], sp[1], ew.m * 0.6, 0, TAU, V.k), { kind: 'visible', at: a0, dur: 0.2, until, into: o.into, sfx: false });
        }
        // ticks on the beats (tick, tock alternating), only when they are slow enough to hear as beats
        if (o.sound !== false) {
          const step = 1 / 120; let lastK = null;
          for (let t = Math.max(0, at); t < Math.min(F.duration ?? 0, until ?? 1e9); t += step) {
            const x = 2 * f * time(t), k = Math.floor(x + 0.5 - w * 0.0);
            const gn = typeof o.gain === 'function' ? o.gain(t) : o.gain ?? 0.32;   // gain may follow the film: louder where the escapement is the subject
            if (lastK !== null && k !== lastK && ratePx(t) < 6 && ratePx(t) > 0.05 && gn > 0) F.sfx(t, k % 2 ? 'tock' : 'tick', gn);
            lastK = k;
          }
        }
        Mx.esc = { f, Pf, Bc, br, fork: fork.id, balance: bal.id };
        return Mx.esc;
      };

      // M.spiral: a spiral spring centred on (x, y) — a mainspring in its barrel (wind: (t) => 0 relaxed … 1 fully wound: the coils pack round the arbor)
      //   or a hairspring (follow: body id: the inner end turns with that body, the outer end stays pinned)
      Mx.spiral = (o) => {
        const at = o.at ?? 0, until = o.until, r0 = o.r0, r1 = o.r1, turns = o.turns ?? 10, n = Math.round(turns * 40);
        const p = sv('path', { fill: 'none', stroke: col(o.color ?? 'line'), 'stroke-width': o.w ?? 2.2, 'vector-effect': 'non-scaling-stroke', style: 'display:none' }, o.into ?? V.g);
        const dur = o.dur ?? 1.1, a0 = at - dur;
        F.add((t) => {
          const on = t >= a0 && t < (until ?? 1e9); p.style.display = on ? '' : 'none'; if (!on) return;
          const wd = o.wind ? clamp(o.wind(t)) : 0, base = o.follow ? angle(o.follow, time(t)) : 0, q = trap(seg(t, a0, at));
          // wound: the coils pack into the inner ~45% of the space (more turns); relaxed: spread out against the barrel wall
          const rOut = lerp(r1, r0 + (r1 - r0) * (o.packed ?? 0.45), wd), tn = turns + wd * (o.extra ?? 4), m2 = Math.max(2, Math.round(n * q)), pts = [];
          for (let i = 0; i <= m2; i++) { const s = i / n, r = lerp(r0, rOut, Math.pow(s, lerp(0.7, 1, wd))), a = (o.phase ?? 0) * RAD + TAU * tn * s + base * (o.follow ? 1 - s : 1) + (o.relax ?? 0); pts.push([o.x + Math.cos(a) * r, o.y + Math.sin(a) * r]); }
          if (!o.wind && o.follow === undefined && q >= 1 && p._done) return;
          p.setAttribute('d', dOf(pts)); p._done = q >= 1;
          p.setAttribute('opacity', f3(until ? 1 - seg(t, until - 0.3, until) : 1));
        });
        if (o.sfx !== false) sfx(V, a0, 'draw', 0.24, { dur });
        return { el: p };
      };
      // M.coil: a helical spring between two points (side view zigzag); a, b = [x, y] or (t) => [x, y] (from M.pt, so it stretches with the parts)
      Mx.coil = (o) => {
        const at = o.at ?? 0, until = o.until, n = o.coils ?? 8, wv = o.w ?? 10, P2 = (p, t) => (typeof p === 'function' ? p(t) : p);
        const path = sv('path', { fill: 'none', stroke: col(o.color ?? 'line'), 'stroke-width': KIND.visible.w * 0.8, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round', style: 'display:none' }, o.into ?? V.g);
        F.add((t) => {
          const on = t >= at - 0.5 && t < (until ?? 1e9); path.style.display = on ? '' : 'none'; if (!on) return;
          const a = P2(o.a, t), b = P2(o.b, t), d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]) || 1, dn = [d[0] / L, d[1] / L], nm = [-dn[1], dn[0]], lead = Math.min(L * 0.08, wv), pts = [a, [a[0] + dn[0] * lead, a[1] + dn[1] * lead]];
          for (let i = 0; i < n * 2; i++) { const s = lead + ((L - 2 * lead) * (i + 0.5)) / (n * 2), sg = i % 2 ? -1 : 1; pts.push([a[0] + dn[0] * s + nm[0] * wv * sg, a[1] + dn[1] * s + nm[1] * wv * sg]); }
          pts.push([b[0] - dn[0] * lead, b[1] - dn[1] * lead], b);
          const q = trap(seg(t, at - 0.5, at)); path.setAttribute('d', dOf(trunc(pts, lenOf(pts), q)));
        });
        return { el: path };
      };
      // M.part: any rigid piece (lever, pawl, arm, slider). pivot [x, y]; pts in the part's own coordinates (relative to the pivot) or d;
      //   angle: (tm) => radians, or follow: id (+ ratio, offset degrees); slide: (tm) => [dx, dy] translates it
      Mx.part = (o) => {
        const b = body({ ...o, x: o.pivot[0], y: o.pivot[1] }, 'part');
        if (o.angle) b.fn = o.angle; else if (o.follow) { const r = o.ratio ?? 1, off = (o.offset ?? 0) * RAD; b.fn = (tm) => angle(o.follow, tm) * r + off; } else b.rot = !!o.angle;
        if (o.slide) b.off = o.slide;
        const pts = o.pts ?? sample(o.d, 2 / V.k);
        draw(b.space, pts, { kind: o.kind ?? 'visible', close: o.close ?? true, at: o.at ?? 0, dur: o.dur, until: o.until, into: b.g, pen: true, fill: o.fill, cons: o.cons });
        if (o.pin !== false) draw(b.space, arcPts(0, 0, (o.pinR ?? 6) / V.k, 0, TAU, V.k), { kind: 'visible', at: (o.at ?? 0) + 0.2, dur: 0.2, until: o.until, into: b.g, sfx: false });
        return b;
      };
      // M.cam: a cam turning with a body (follow) or on its own (rate), and a follower that rides it along `dir` (degrees);
      //   profile: (θ) => radius (θ measured on the cam) or e: an eccentric of radius r offset by e
      Mx.cam = (o) => {
        const prof = o.profile ?? ((th) => { const e = o.e ?? o.r * 0.25; return e * Math.cos(th) + Math.sqrt(o.r * o.r - e * e * Math.sin(th) * Math.sin(th)); });
        const n = 180, pts = Array.from({ length: n }, (_, i) => { const th = (i / n) * TAU; return [Math.cos(th) * prof(th), Math.sin(th) * prof(th)]; });
        const b = body({ ...o }, 'cam');
        if (o.follow) b.fn = (tm) => angle(o.follow, tm) * (o.ratio ?? 1); else if (o.rate !== undefined) b.fn = (tm) => tm * o.rate * TAU;
        draw(b.space, pts, { kind: 'visible', close: true, at: o.at ?? 0, dur: o.dur, until: o.until, into: b.g, pen: true });
        draw(b.space, arcPts(0, 0, (o.bore ?? 6) / V.k, 0, TAU, V.k), { kind: 'thin', at: (o.at ?? 0) + 0.2, dur: 0.2, until: o.until, into: b.g, sfx: false });
        if (o.follower) {
          const fo = o.follower, da = (fo.dir ?? -90) * RAD, dv = [Math.cos(da), Math.sin(da)], len = fo.len ?? o.r * 2, fw = fo.w ?? o.r * 0.18;
          const lift = (tm) => prof(da - angle(b.id, tm));
          const fb = body({ id: fo.id ?? b.id + '-follower', x: o.x, y: o.y, into: o.into }, 'follower');
          fb.rot = false; fb.off = (tm) => [dv[0] * lift(tm), dv[1] * lift(tm)];
          const nv = [-dv[1], dv[0]], foot = fo.roller ? [] : [[nv[0] * fw, nv[1] * fw], [-nv[0] * fw, -nv[1] * fw]];
          const rp = [[nv[0] * fw * 0.45, nv[1] * fw * 0.45], [dv[0] * len + nv[0] * fw * 0.45, dv[1] * len + nv[1] * fw * 0.45], [dv[0] * len - nv[0] * fw * 0.45, dv[1] * len - nv[1] * fw * 0.45], [-nv[0] * fw * 0.45, -nv[1] * fw * 0.45]];
          draw(fb.space, rp, { kind: 'visible', close: true, at: (o.at ?? 0) + 0.3, dur: 0.4, until: o.until, into: fb.g, sfx: false });
          if (foot.length) draw(fb.space, foot, { kind: 'visible', at: (o.at ?? 0) + 0.35, dur: 0.2, until: o.until, into: fb.g, sfx: false });
          b.follower = fb;
        }
        return b;
      };
      // M.rack: a toothed bar meshing with a gear; it slides along `dir` (degrees) by the gear's turning × its pitch radius
      Mx.rack = (o) => {
        const g = bodies[o.mesh], m = g.m, side = (o.side ?? 90) * RAD, dir = (o.dir ?? 0) * RAD, len = o.len ?? g.rp * 4, n = Math.round(len / (Math.PI * m));
        const cx = g.x + Math.cos(side) * g.rp, cy = g.y + Math.sin(side) * g.rp, dv = [Math.cos(dir), Math.sin(dir)], nv = [Math.cos(side), Math.sin(side)];
        const b = body({ id: o.id, x: cx, y: cy, into: o.into }, 'rack'); b.rot = false;
        const sgn = (dv[0] * -nv[1] + dv[1] * nv[0]) >= 0 ? 1 : -1;
        b.off = (tm) => { const s = angle(g.id, tm) * g.rp * sgn; return [dv[0] * s, dv[1] * s]; };
        const pts = [], pp = Math.PI * m, hgt = o.h ?? m * 5;
        for (let i = -n / 2; i < n / 2; i++) { const s0 = i * pp; for (const [s, h] of [[0, -1.25], [0.15, 1], [0.35, 1], [0.5, -1.25]]) pts.push([dv[0] * (s0 + s * pp) - nv[0] * h * m, dv[1] * (s0 + s * pp) - nv[1] * h * m]); }
        const e0 = pts[pts.length - 1], s0 = pts[0];
        pts.push([e0[0] + nv[0] * hgt, e0[1] + nv[1] * hgt], [s0[0] + nv[0] * hgt, s0[1] + nv[1] * hgt]);
        draw(b.space, pts, { kind: 'visible', close: true, at: o.at ?? 0, dur: o.dur, until: o.until, into: b.g, pen: true });
        return b;
      };
      // M.rod: a link between two moving points (a connecting rod, a cable); a, b = [x, y] or (t) => [x, y]
      Mx.rod = (o) => {
        const P2 = (p, t) => (typeof p === 'function' ? p(t) : p), at = o.at ?? 0;
        const path = sv('path', { fill: 'none', stroke: col(o.color ?? 'line'), 'stroke-width': o.w ?? KIND.visible.w, 'stroke-dasharray': o.kind ? KIND[o.kind].dash : undefined, 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round', style: 'display:none' }, o.into ?? V.g);
        F.add((t) => { const on = t >= at - 0.4 && t < (o.until ?? 1e9); path.style.display = on ? '' : 'none'; if (!on) return; const a = P2(o.a, t), b = P2(o.b, t), q = trap(seg(t, at - 0.4, at)); path.setAttribute('d', dOf([a, [lerp(a[0], b[0], q), lerp(a[1], b[1], q)]])); });
        return { el: path };
      };
      // M.hand: a watch hand on an arbor (turns with that body; offset degrees sets the time it shows at tm = 0)
      Mx.hand = (o) => {
        const len = o.len, w = o.w ?? len * 0.06, tail = o.tail ?? len * 0.18, ax = bodies[o.arbor];
        const b = body({ id: o.id, x: ax.x, y: ax.y, into: o.into }, 'hand');
        b.fn = (tm) => angle(ax.id, tm) * (o.ratio ?? 1) + (o.offset ?? 0) * RAD;
        const pts = o.kind === 'second' ? [[-tail, -w * 0.3], [len, -w * 0.18], [len, w * 0.18], [-tail, w * 0.3]] : [[-tail, -w * 0.6], [0, -w], [len * 0.82, -w * 0.7], [len, 0], [len * 0.82, w * 0.7], [0, w], [-tail, w * 0.6]];
        draw(b.space, pts.map((p) => rot(p, -Math.PI / 2)), { kind: 'visible', close: true, at: o.at ?? 0, dur: o.dur ?? 0.5, until: o.until, into: b.g, pen: true, fill: o.fill });
        draw(b.space, arcPts(0, 0, w * 1.2, 0, TAU, V.k), { kind: 'visible', at: (o.at ?? 0) + 0.15, dur: 0.2, until: o.until, into: b.g, sfx: false });
        return b;
      };
      // M.spin: a curved arrow round a body showing which way it turns, with an optional rate label (e.g. '1 r/min')
      Mx.spin = (id, o = {}) => {
        need();
        const b = bodies[id], sgn = Math.sign(b.k || 1) * (driver && bodies[driver].avg < 0 ? -1 : 1), r = (o.r ?? (b.ra ?? 20) * 1.18), a0 = (o.angle ?? -60) * RAD, sweep = (o.sweep ?? 70) * RAD * sgn;
        const pts = arcPts(b.x, b.y, r, a0, a0 + sweep, V.k), e = pts[pts.length - 1], pe = pts[pts.length - 3], d = [e[0] - pe[0], e[1] - pe[1]], dl = Math.hypot(d[0], d[1]);
        draw(V, pts, { kind: 'thin', at: o.at ?? 0, dur: 0.4, until: o.until, sfx: false, color: o.color });
        arrowHead(V, e, [d[0] / dl, d[1] / dl], { at: (o.at ?? 0) + 0.05, until: o.until, color: o.color });
        if (o.text) { const am = a0 + sweep / 2, rr = r + (o.gap ?? 34) / V.k; return B.label(V, { x: b.x + Math.cos(am) * rr, y: b.y + Math.sin(am) * rr, text: o.text, size: o.size ?? 24, align: o.align ?? (Math.cos(am) >= 0 ? 'left' : 'right'), at: (o.at ?? 0) + 0.3, until: o.until, color: o.color ?? 'text' }); }
        return null;
      };

      // checks: meshing gears placed by hand must sit at the right centre distance with the same module; teeth that move more than ~1/3 pitch per frame strobe
      F.addLint(() => {
        const out = [], add = (t, what, msg) => out.push({ level: 'warn', t, src: '', what, msg });
        for (const b of Object.values(bodies)) {
          if (b.kind !== 'gear' || !b.mate) continue;
          const a = bodies[b.mate];
          if (Math.abs(a.m - b.m) > 1e-6) add(0, M('齿轮', 'gears'), M(`${a.id} 和 ${b.id} 啮合但模数不同（${a.m} vs ${b.m}）：同一对啮合齿轮模数必须一样`, `${a.id} and ${b.id} mesh with different modules (${a.m} vs ${b.m}): a meshing pair shares one module`));
          const want = (a.m * (a.N + b.N)) / 2, got = Math.hypot(b.x - a.x, b.y - a.y);
          if (b.explicit && Math.abs(got - want) > want * 0.02) add(0, M('齿轮', 'gears'), M(`${a.id}–${b.id} 中心距 ${got.toFixed(2)}，应该是 m(z1+z2)/2 = ${want.toFixed(2)}：用 mesh + dir 自动放`, `${a.id}–${b.id} centre distance ${got.toFixed(2)}, should be m(z1+z2)/2 = ${want.toFixed(2)}: place it with mesh + dir`));
        }
        const fps = 30, seen = new Set();
        for (const b of Object.values(bodies)) {
          if (b.kind !== 'gear' || b.blurOn || seen.has(b.id)) continue;
          for (let t = 0; t < (F.duration ?? 0); t += 0.25) {
            const d = Math.abs(angle(b.id, time(t + 1 / fps)) - angle(b.id, time(t))), pt = TAU / b.N;
            if (d > pt * 0.34 && d < TAU * 0.9) { seen.add(b.id); add(t, M('齿轮', 'gears'), M(`${t.toFixed(1)} 秒 ${b.id} 每帧转过 ${(d / pt).toFixed(2)} 个齿距：齿会频闪（看起来倒转），把机构时钟放慢`, `At ${t.toFixed(1)} s ${b.id} turns ${(d / pt).toFixed(2)} tooth pitches per frame: the teeth strobe (look reversed); slow the mechanism clock`)); break; }
          }
        }
        return out;
      });

      return P.infoKit ? P.infoKit(Mx, { gear: 'mechanism', escapement: 'mechanism', part: 'mechanism', cam: 'mechanism', rack: 'mechanism', spiral: 'mechanism', coil: 'mechanism', hand: 'mechanism' }) : Mx;
    };

    // framing: a new subject gets a new sheet (B.sheet with enter); on one sheet the camera only pushes into a part (a DETAIL) or pulls out to the whole.
    //   A fast pan across the sheet reads as sliding the paper, not as a cut, and leaves the last view's corners in the next one. Checked from the camera keys,
    //   then at the end of every rest pose: something cut by the frame edge that was drawn for an earlier view (a neighbour's corner showing), or this view's own lettering cut off
    F.addLint(() => {
      const out = [], add = (t, what, msg) => out.push({ level: 'warn', t: Math.round(t * 10) / 10, src: '', what, msg });
      const stage = document.getElementById('stage'); if (!stage || !sheets.length) return out;
      const rectOf = (c) => { const w2 = W / u / c.zoom / 2, h2 = H / u / c.zoom / 2; return [c.x - w2, c.y - h2, c.x + w2, c.y + h2]; };
      const within = (a, b) => { const tx = (b[2] - b[0]) * 0.06, ty = (b[3] - b[1]) * 0.06; return a[0] >= b[0] - tx && a[1] >= b[1] - ty && a[2] <= b[2] + tx && a[3] <= b[3] + ty; };
      const isect = (a, b) => [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
      const area = (r) => Math.max(0, r[2] - r[0]) * Math.max(0, r[3] - r[1]);
      const R = (el) => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
      const shown = (el) => { for (let e = el; e && e !== stage; e = e.parentNode) { const st = e.style; if (st && st.display === 'none') return false; const op = e.getAttribute && e.getAttribute('opacity'); if (op !== null && op !== undefined && +op < 0.05) return false; if (st && st.opacity !== '' && +st.opacity < 0.05) return false; } return true; };
      const clipOf = (el, S, toClient) => { for (let e = el; e && e !== S.svg; e = e.parentNode) { const c = e.getAttribute && e.getAttribute('clip-path'), id = c && (c.match(/#(bpc\d+)/) || [])[1]; if (id && clips[id]) { const b = clips[id].box; const p = toClient([b[0], b[1]]), q = toClient([b[2], b[3]]); return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])]; } } return null; };
      const names = (L) => { const tx = L.filter((x) => x.kind === 'text').map((x) => `「${String(x.text).slice(0, 14)}」`), n = L.length - tx.length; return [...new Set(tx)].slice(0, 3).join('、') + (n ? `${tx.length ? '、' : ''}${M(`线条 ×${n}`, `${n} line(s)`)}` : ''); };
      let reports = 0;
      for (const S of sheets) {
        if (!S.items || !S.items.length) continue;
        const end = Math.min(S.zText ?? S.z, F.duration ?? 1e9);
        const moves = S.keys.filter((k) => k.at > S.a + 0.01 && k.at - k.dur < end).map((k) => {
          const a = Math.max(k.at - k.dur, S.a), r0 = rectOf(S.pose(a)), r1 = rectOf(S.pose(k.at)), w0 = r0[2] - r0[0], w1 = r1[2] - r1[0];
          const shift = Math.hypot((r1[0] + r1[2] - r0[0] - r0[2]) / 2, (r1[1] + r1[3] - r0[1] - r0[3]) / 2) / Math.min(w0, w1);
          const c1 = [(r1[0] + r1[2]) / 2, (r1[1] + r1[3]) / 2], zin = w0 / w1, cIn = c1[0] > r0[0] && c1[0] < r0[2] && c1[1] > r0[1] && c1[1] < r0[3];
          const kind = within(r1, r0) || (zin >= 1.25 && cIn) ? 'push' : within(r0, r1) || (zin <= 0.8 && within(r0, r1.map((v, i) => v + (i < 2 ? -1 : 1) * (r1[2] - r1[0]) * 0.1))) ? 'pull' : k.dur >= 2.8 ? 'track' : 'pan';
          return { a, at: k.at, dur: k.dur, kind, shift };
        });
        for (const mv of moves) if (mv.kind === 'pan' && mv.shift > 0.35)
          add(mv.a, M('平移换场', 'pan between subjects'), M(`${mv.a.toFixed(1)} 秒镜头在同一张图纸上平移到别处（${mv.dur.toFixed(1)} 秒，移了 ${Math.round(mv.shift * 100)}% 画面宽）：看起来是在挪图纸，不是换镜头，上一块的边角会留在下一个画面里。换话题就换一张新图纸：B.sheet({ a, enter: 'expose' | 'slide' | 'cut' })；同一张图纸上的镜头只推近局部（DETAIL）或拉远看全貌`, `At ${mv.a.toFixed(1)} s the camera pans across the same sheet (${mv.dur.toFixed(1)} s, ${Math.round(mv.shift * 100)}% of the frame width): it reads as sliding the paper, not a cut, and the last view's corners stay in the next one. A new subject gets a new sheet: B.sheet({ a, enter: 'expose' | 'slide' | 'cut' }); on one sheet the camera only pushes into a part (a DETAIL) or pulls out to the whole`));
        // rest poses: the end of each hold (everything of that view is drawn by then)
        const rests = [], starts = moves.map((m) => m.a);
        if (!moves.length || starts[0] > S.enterEnd + 0.6) rests.push({ t: Math.min(starts[0] ?? end, end) - 0.15, shot: S.a, kind: 'enter' });
        moves.forEach((mv, i) => { const t = Math.min(starts[i + 1] ?? end, end) - 0.15; if (t > mv.at + 0.2) rests.push({ t, shot: mv.a, kind: mv.kind }); });
        for (const rs of rests) {
          if (reports >= 14) break;
          F.render(rs.t);
          if (S.layer.style.display === 'none') continue;
          const sr = stage.getBoundingClientRect(), k = sr.width / W, inn = (B._frameIn ?? 0) * k, frame = [sr.left + inn, sr.top + inn, sr.right - inn, sr.bottom - inn];
          const toClient = (p) => { const f = S.toFrame(p, rs.t); return [sr.left + f[0] * k, sr.top + f[1] * k]; };
          const blk = B._block && shown(B._block) ? R(B._block) : null;
          const stray = [], cut = [], under = [];
          for (const it of S.items) {
            if (it.at > rs.t || !it.el.isConnected || !shown(it.el)) continue;
            let r = R(it.el); if (r[2] - r[0] < 0.5 && r[3] - r[1] < 0.5) continue;
            const c = clipOf(it.el, S, toClient); if (c) { r = isect(r, c); if (area(r) <= 0 && (r[2] < r[0] || r[3] < r[1])) continue; }
            r = [r[0], r[1], Math.max(r[2], r[0] + 1), Math.max(r[3], r[1] + 1)];
            const fr = area(isect(r, frame)) / area(r);
            if (fr < 0.002) continue;
            if (fr >= (it.kind === 'text' ? 0.985 : 0.97)) { if (it.kind === 'text' && blk && area(isect(r, blk)) > area(r) * 0.15) under.push(it); continue; }
            const earlier = it.at < rs.shot - 0.01;
            if (earlier && (rs.kind === 'push' || rs.kind === 'track')) continue;   // pushing into a part crops its surroundings: that is the move
            (earlier ? stray : cut).push(it);
          }
          const tt = rs.t.toFixed(1);
          if (stray.length) { reports++; add(rs.t, M('串场', 'stray content'), M(`${tt} 秒画面边上露出前一个画面的东西（${names(stray)}）：换话题就换一张新图纸（B.sheet enter），或者把这一块画得离它远一点`, `At ${tt} s the frame edge shows things drawn for an earlier view (${names(stray)}): a new subject gets a new sheet (B.sheet enter), or draw this part further away`)); }
          if (cut.length) { reports++; add(rs.t, M('出画', 'cut off'), M(`${tt} 秒这个画面自己的内容被画面边裁掉（${names(cut)}）：框大一点，或者挪进画面`, `At ${tt} s this view's own content is cut by the frame edge (${names(cut)}): frame wider or move it in`)); }
          if (under.length) { reports++; add(rs.t, M('压图签', 'under the title block'), M(`${tt} 秒${names(under)}压在右下角图签上：框的时候给图签留位置`, `At ${tt} s ${names(under)} sits under the title block: leave room for it when framing`)); }
        }
      }
      return out;
    });

    // red pencil budget: the accent is a correction, not a colour scheme
    F.addLint(() => {
      const out = [], ps = (F.sfxList || []).filter((x) => x.type === 'pencil').map((x) => x.t).sort((a, b) => a - b);
      if (ps.length > Math.max(4, (F.duration ?? 60) / 9)) out.push({ level: 'warn', t: ps[0], src: '', what: M('红铅笔', 'red pencil'), msg: M(`红铅笔用了 ${ps.length} 次：它是图纸上唯一的强调色（一处更正、一个圈），大约每 10 秒最多一次`, `Red pencil used ${ps.length} times: it is the sheet's one accent (a correction, a ring), about once per 10 s at most`) });
      return out;
    });

    return P.infoKit ? P.infoKit(B, { dim: 'dimension', leader: 'annotate', table: 'table', detail: 'annotate', hatch: 'section', cutline: 'section', dial: 'diagram' }) : B;
  };
})();
