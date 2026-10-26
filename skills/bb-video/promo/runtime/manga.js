// manga.js: the manga-panel / motion-comic (日漫 · 漫画分镜) style, one of bb-video's visual styles (style notes in styles/manga/STYLE.md). Load after promo.js.
// One frame: a black-and-white manga page — white paper, black ink line, screentone (flat dots, gradient dots, sand) laid per region — cut into
// panels with gutters (wider between tiers than between columns), slanted panels, borderless and bleeding panels, figures breaking out of the
// frame. Speed lines, focus lines (集中线), beta flashes, sweat drops and vein marks; big hand-lettered sound effects (ドン / ゴゴゴ / 轰 / 咚) that
// are part of the art; speech balloons (round, jagged shout, thought cloud, narration box) set vertically or horizontally. One optional spot colour.
// The camera reads the page panel by panel in reading order (right to left by default), punches into key panels, shakes on impacts; panels ink
// in, tones fade in; pages turn, get slashed open, and a full-page splash carries the climax. Characters are code-drawn on a jointed rig (poses,
// expressions, eyes close-ups, fists, silhouettes, chibi reactions). Original designs only.
//
//   const R = PROMO.manga(F, { spot, dir: 'rtl' | 'ltr', captions, chapters, fonts, surround })
//   World units: frame height = 1000 (R.g(v) → px); a page is w × h units (default: a spread 1500 × 1000 landscape, one page 700 × 1000 portrait).
//   PAGES     const pg = R.page(a, b, { w, h, in: 'cut' | 'fade' | 'turn' | 'slash' | 'tear' | 'ink', dur, margin, gutter: [col, row] })
//             pg.tiers(rows, { at, margin, gutter }) → panels in reading order; rows = [[1, 2], …] (column weights) or [{ h, cols, slant, cuts }]
//             pg.panel([x, y, w, h] | { poly: [[x, y]…] } (page fractions), { border, bw, bleed, at, enter, bg })  → P
//   CAMERA    pg.cam(t, view, ease)  view = 'page' | { on: P | [P…], pad } | { x, y, h };  pg.read([P, …], [t, …], { travel, pad })
//             pg.punch(t, P | box, { pad, hold, back })  a hard push-in;  R.shake(t, { amp, dur });  R.flash(t, { kind: 'white' | 'black' | 'invert' | 'spot' })
//   IN PANELS (positions are panel fractions 0–1; sizes are fractions of the panel's height)
//             P.bg(kind, o)  'white' | 'black' | 'tone' | 'grad' | 'speed' | 'focus' | 'flash' | 'burst' | 'odoro' | 'sparkle'
//             P.tone(shape, o)  dot / grad / sand / hatch tone on a region;  P.lines(kind, o) effect lines over part of a panel
//             P.char(who, { x, y, size, pose, face, shot: 'full' | 'bust' | 'face' | 'eyes' | 'chibi' | 'silhouette', facing | faceTo, at, until, breakout })
//               → C: C.pose(t, pose, dur)  C.face(t, expr)  C.move(t, { x, y }, dur)  C.hit(t)  C.shake(t, dur)
//             P.fist({ x, y, size, at, dir });  P.manpu(kind, { x, y, size, at })  sweat / vein / sparkle / steam / zzz / exclaim / question / gloom / tears / dots
//             P.sfx(text, { x, y, size, rot, fill, at, until, style: 'impact' | 'rumble' | 'pop' | 'whisper', vertical, font })
//             P.balloon(kind, text, { x, y, w, vertical, size, tail, at, until })  'talk' | 'shout' | 'think' | 'narr' | 'whisper' | 'black'
//             P.label(text, { x, y, to: [x, y], at })  a hand-lettered note with a leader;  P.intro(text, { name, lines, x, y, at })  the battle-manga intro box
//             P.chart({ kind: 'line' | 'bars', values, labels, at, dur, unit, marks })  a graph inked on the page;  P.draw((g, k) => …, { at, info })
//   WHOLE     R.splash(a, b, { in, title, draw }) a one-panel bleed page;  R.end(a, b, { title, sub, sources })  the last page (完)
//             R.cast({ name: spec });  R.ink / R.tones / R.kit  drawing helpers
// Times: at = when a thing is in place (readable); motion starts a little before. until = gone.
(function () {
  const P0 = window.PROMO;
  const M = (P0 && P0.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P0) throw new Error(M('manga.js 要在 promo.js 之后加载', 'manga.js must load after promo.js'));
  const { E, seg, set, el, esc } = P0;
  const NS = 'http://www.w3.org/2000/svg';
  const sv = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const sa = (e, attrs) => { const c = e._a || (e._a = {}); for (const k in attrs) { const v = attrs[k]; if (c[k] !== v) { c[k] = v; e.setAttribute(k, v); } } };
  const rnd = (s) => window.EV.rng(s);
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mix = (a, b, q) => a + (b - a) * q;
  const f2 = (n) => Math.round(n * 100) / 100;
  const D2R = Math.PI / 180;
  const node = (tag, css, parent, html) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (html !== undefined) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  // vertical text: runs of 1–3 digits / latin letters sit sideways in one cell (縦中横), the rest stays upright
  const tcy = (s) => esc(s).replace(/[0-9A-Za-z%]{1,3}/g, (m) => `<span style="text-combine-upright:all">${m}</span>`);
  const ptsD = (pts, close = true) => 'M' + pts.map((p) => `${f2(p[0])},${f2(p[1])}`).join('L') + (close ? 'Z' : '');
  let UID = 0;
  const uid = (p) => `mg${p}${++UID}`;

  P0.manga = function (F, opt = {}) {
    const W = F.W, H = F.H, PT = F.portrait, g = H / 1000, FW = W / g, AR = W / H, gx = (v) => v * g;
    const C = { ink: '#141414', paper: '#ffffff', surround: '#16161a', spot: '#e0442a', tone: '#141414', ...(opt.colors || {}) };
    if (opt.spot !== undefined) C.spot = opt.spot || null;
    const DIR = opt.dir === 'ltr' ? 1 : -1;   // reading direction: rtl (manga) reads the right-most panel first
    const FONT = {
      sfx: '"Dela Gothic One", "ZCOOL QingKe HuangYou", "Noto Sans SC", sans-serif',
      sfxZh: '"ZCOOL QingKe HuangYou", "Dela Gothic One", "Noto Sans SC", sans-serif',
      talk: '"Noto Sans SC", "PingFang SC", sans-serif',
      narr: '"Noto Serif SC", "Songti SC", serif',
      ...(opt.fonts || {}),
    };
    const R = { F, g: gx, FW, AR, colors: C, fonts: FONT, dir: DIR };
    F.stillMax(1.0);   // a manga panel holds; effect lines drift and the camera breathes
    F.blurBase(1);     // camera pans and punches register their own F.blur spans

    // ---------- layers: screen (shake wrapper → shots), flash, HUD (chapter tag, captions) ----------
    const screen = el('div', `left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;z-index:10;background:${C.surround}`, F.stage);
    const shaker = el('div', `left:0;top:0;width:${W}px;height:${H}px`, screen);
    shaker.dataset.motion = 'texture';   // the camera shaking on an impact is a texture, not a move
    const flashEl = el('div', `inset:0;z-index:800;pointer-events:none;opacity:0;background:#fff`, screen);
    flashEl.dataset.motion = 'skip';
    const hud = el('div', 'inset:0;z-index:860;pointer-events:none', F.stage);
    Object.assign(R, { screen, shaker, hud });

    // ---------- shake and flash (both registered as transitions: the frame check expects the jump) ----------
    const shakes = [], flashes = [];
    R.shake = (t, o = {}) => { const s = { t, amp: o.amp ?? 14, dur: o.dur ?? 0.45, freq: o.freq ?? 26, seed: shakes.length * 13 + 5 }; shakes.push(s); F.transition(t, t + s.dur); return R; };
    R.flash = (t, o = {}) => {
      const k = o.kind ?? 'white', f = { t, k, dur: o.dur ?? (k === 'invert' ? 0.1 : 0.14), color: k === 'black' ? C.ink : k === 'spot' ? C.spot || '#fff' : '#fff' };
      flashes.push(f); F.transition(t - 0.04, t + f.dur + 0.08);
      return R;
    };
    const shakeAt = (t) => {
      let x = 0, y = 0, r = 0, env = 0;
      for (const s of shakes) if (t >= s.t && t < s.t + s.dur) {
        const q = (t - s.t) / s.dur, d = Math.pow(1 - q, 1.6) * s.amp, ph = (t - s.t) * s.freq; env = Math.max(env, Math.pow(1 - q, 1.6));
        x += d * (Math.sin(ph * 6.1 + s.seed) * 0.6 + Math.sin(ph * 9.7 + s.seed * 3) * 0.4);
        y += d * (Math.sin(ph * 7.3 + s.seed * 2) * 0.6 + Math.sin(ph * 11.1 + s.seed) * 0.4);
        r += d * 0.04 * Math.sin(ph * 5.3 + s.seed);
      }
      return { x, y, r, env };
    };
    F.add((t) => {
      const s = shakeAt(t);
      set(shaker, { transform: s.env > 0.001 ? `translate(${gx(s.x).toFixed(2)}px,${gx(s.y).toFixed(2)}px) rotate(${s.r.toFixed(3)}deg) scale(${(1 + 0.03 * s.env).toFixed(4)})` : 'none' });   // the slight zoom that hides the edges eases out with the shake
      let op = 0, col = '#fff', inv = false;
      for (const f of flashes) if (t >= f.t - 0.001 && t < f.t + f.dur) { if (f.k === 'invert') inv = true; else { op = Math.max(op, 1 - Math.pow((t - f.t) / f.dur, 2)); col = f.color; } }
      set(flashEl, { opacity: op.toFixed(3), background: col });
      set(screen, { filter: inv ? 'invert(1)' : 'none' });
    });

    // ---------- tones: dot patterns (SVG), gradient / sand tones (canvas, made once per size) ----------
    const toneImg = {};
    const toneCanvas = (kind, w, h, o = {}) => {
      const key = [kind, Math.round(w), Math.round(h), o.from ?? '', o.to ?? '', o.angle ?? '', o.cell ?? '', o.seed ?? ''].join(':');
      if (toneImg[key]) return toneImg[key];
      const res = o.res ?? 2, cw = Math.max(4, Math.round(w * res)), ch = Math.max(4, Math.round(h * res));
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      const c = cv.getContext('2d'); c.fillStyle = C.tone;
      const r = rnd(o.seed ?? 7);
      if (kind === 'sand') {   // FM tone: random grains, denser where darker
        const n = Math.round(cw * ch * 0.06);
        for (let i = 0; i < n; i++) { const x = r() * cw, y = r() * ch, q = gradQ(x / cw, y / ch, o); if (r() < q) c.fillRect(x, y, res * 1.1, res * 1.1); }
      } else {   // AM gradation: dots on a 45° grid, their size following the gradient
        const cell = (o.cell ?? 7) * res, an = 45 * D2R, ca = Math.cos(an), s2 = Math.sin(an), RR = Math.hypot(cw, ch);
        for (let v = -RR; v < RR; v += cell) for (let u = -RR; u < RR; u += cell) {
          const x = cw / 2 + u * ca - v * s2, y = ch / 2 + u * s2 + v * ca;
          if (x < -cell || y < -cell || x > cw + cell || y > ch + cell) continue;
          const q = gradQ(x / cw, y / ch, o); if (q < 0.03) continue;
          const rad = cell * Math.sqrt(q / Math.PI) * 1.02;
          c.beginPath(); c.arc(x, y, rad, 0, 6.2832); c.fill();
        }
      }
      return (toneImg[key] = cv.toDataURL('image/png'));
    };
    // gradient value 0–1 at (u, v) in the box: from → to along angle (deg; 90 = top to bottom), or radial (o.radial: [cx, cy, r])
    function gradQ(u, v, o) {
      const a = o.from ?? 0.55, b = o.to ?? 0;
      if (o.radial) { const [cx, cy, rr] = o.radial; return mix(a, b, cl(Math.hypot(u - cx, (v - cy)) / rr)); }
      const an = (o.angle ?? 90) * D2R, d = (u - 0.5) * Math.cos(an) + (v - 0.5) * Math.sin(an);
      return mix(a, b, cl(d + 0.5));
    }
    R.toneCanvas = toneCanvas;

    // ---------- ink: tapered strokes, line bundles (speed / focus), jagged shapes ----------
    // a tapered stroke from p0 to p1: width w at the thick end, pointed at the other(s); taper 'end' | 'both' | 'start'
    const wedge = (x0, y0, x1, y1, w, taper = 'end') => {
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2;
      if (taper === 'both') { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; return `M${f2(x0)},${f2(y0)}L${f2(mx + nx)},${f2(my + ny)}L${f2(x1)},${f2(y1)}L${f2(mx - nx)},${f2(my - ny)}Z`; }
      if (taper === 'start') return `M${f2(x0)},${f2(y0)}L${f2(x1 + nx)},${f2(y1 + ny)}L${f2(x1 - nx)},${f2(y1 - ny)}Z`;
      return `M${f2(x0 + nx)},${f2(y0 + ny)}L${f2(x1)},${f2(y1)}L${f2(x0 - nx)},${f2(y0 - ny)}Z`;
    };
    // focus lines (集中线): wedges from outside a w × h box towards (cx, cy), stopping at a ragged inner ellipse
    const focusD = (w, h, o, seed) => {
      const r = rnd(seed), n = o.n ?? Math.round(110 * (o.density ?? 1)), cx = (o.cx ?? 0.5) * w, cy = (o.cy ?? 0.5) * h;
      const R0 = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) * 1.05, rin = (o.inner ?? 0.36), ax = rin * w * 0.5 * (o.ratio ?? 1.2), ay = rin * h * 0.5;
      let d = '';
      for (let i = 0; i < n; i++) {
        const a = (i + r() * 0.9) / n * Math.PI * 2, ca = Math.cos(a), s = Math.sin(a), j = 1 + r() * (o.jag ?? 0.75) * (r() < 0.25 ? 1.6 : 0.6);
        const x1 = cx + ca * ax * j, y1 = cy + s * ay * j, ww = (o.width ?? 9) * (0.35 + r() * 1.1) * (r() < 0.12 ? 2.4 : 1);
        d += wedge(cx + ca * R0, cy + s * R0, x1, y1, ww);
      }
      return d;
    };
    // speed lines: parallel tapered streaks across a box at angle (deg)
    const speedD = (w, h, o, seed) => {
      const r = rnd(seed), an = (o.angle ?? 0) * D2R, ca = Math.cos(an), s = Math.sin(an), n = o.n ?? Math.round(70 * (o.density ?? 1)), RR = Math.hypot(w, h);
      let d = '';
      for (let i = 0; i < n; i++) {
        const off = (r() - 0.5) * RR * 1.05, len = RR * (0.25 + r() * 0.7), mid = (r() - 0.5) * RR * 0.8, ww = (o.width ?? 5) * (0.3 + r() * 1.2);
        const mx = w / 2 + ca * mid - s * off, my = h / 2 + s * mid + ca * off;
        d += wedge(mx - ca * len / 2, my - s * len / 2, mx + ca * len / 2, my + s * len / 2, ww, 'both');
      }
      return d;
    };
    // rays from a centre outwards (the white burst of a beta flash, or black uni-flash spikes)
    const raysD = (w, h, o, seed) => {
      const r = rnd(seed), n = o.n ?? 90, cx = (o.cx ?? 0.5) * w, cy = (o.cy ?? 0.5) * h, R0 = Math.hypot(w, h) * 0.75, rin = (o.inner ?? 0.05) * Math.min(w, h);
      let d = '';
      for (let i = 0; i < n; i++) { const a = (i + r()) / n * Math.PI * 2, L = R0 * (0.35 + r() * (r() < 0.3 ? 0.9 : 0.45)), ww = (o.width ?? 14) * (0.4 + r() * 1.2); d += wedge(cx + Math.cos(a) * rin, cy + Math.sin(a) * rin, cx + Math.cos(a) * L, cy + Math.sin(a) * L, ww, 'end'); }
      return d;
    };
    // odoro lines (おどろ線): wavy tendrils creeping in from the edges
    const odoroD = (w, h, o, seed) => {
      const r = rnd(seed), n = o.n ?? 26;
      let d = '';
      for (let i = 0; i < n; i++) {
        const side = i % 4, q = r(), len = (0.18 + r() * 0.3) * Math.min(w, h);
        let x = side === 0 ? q * w : side === 1 ? w : side === 2 ? q * w : 0, y = side === 0 ? 0 : side === 1 ? q * h : side === 2 ? h : q * h;
        const ang = Math.atan2(h / 2 - y, w / 2 - x) + (r() - 0.5) * 0.6, pts = [], k = 9, ph = r() * 6;
        for (let s = 0; s <= k; s++) { const tq = s / k, a2 = ang + Math.sin(tq * 5 + ph) * 0.5 * tq; pts.push([x, y]); x += Math.cos(a2) * len / k; y += Math.sin(a2) * len / k; }
        d += taperD(pts, (o.width ?? 7) * (0.6 + r() * 0.8), 'end');
      }
      return d;
    };
    // a jagged closed outline around an ellipse (shout balloons, impact stars)
    const jagD = (cx, cy, rx, ry, n, depth, seed) => {
      const r = rnd(seed), pts = [];
      for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, out = i % 2 === 0, k = out ? 1 + depth * (0.6 + r() * 0.8) : 1 - depth * 0.15; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
      return ptsD(pts);
    };
    R.ink = { wedge, focusD, speedD, raysD, odoroD, jagD };

    // ---------- shots = pages, each a world the camera frames ----------
    const shots = [];
    let pageNo = 0;
    const SAFE = { top: 0.03, bottom: F.T && F.voiced && opt.captions !== false ? 0.15 : 0.03 };   // captions own the bottom of the frame: framing keeps the subject above them
    R.page = (a, b, o = {}) => {
      const w = o.w ?? (PT ? 700 : 1500), h = o.h ?? 1000;
      const root = el('div', `inset:0;overflow:hidden;background:${o.surround ?? C.surround}`, shaker);
      const lens = el('div', 'inset:0', root);
      const world = el('div', 'left:0;top:0;width:0;height:0;transform-origin:0 0', lens);
      const paper = el('div', `left:0;top:0;width:${gx(w)}px;height:${gx(h)}px;background:${C.paper};box-shadow:0 ${gx(8)}px ${gx(40)}px rgba(0,0,0,.55)`, world);
      const svg = sv('svg', { viewBox: `0 0 ${w} ${h}`, width: gx(w), height: gx(h), style: 'position:absolute;left:0;top:0;overflow:visible' }, paper);
      const defs = sv('defs', {}, svg);
      const panelsG = sv('g', {}, svg), overG = sv('g', {}, svg);
      const textLayer = el('div', `left:0;top:0;width:${gx(w)}px;height:${gx(h)}px;pointer-events:none`, paper);
      const S = { a, b, w, h, root, world, paper, svg, defs, panelsG, overG, textLayer, keys: [], punches: [], panels: [], in: o.in || (shots.length ? 'cut' : 'fade'), dur: o.dur ?? ({ turn: 0.7, slash: 0.45, tear: 0.55, fade: 0.45, ink: 0.6 }[o.in || 'cut'] ?? 0), drift: o.drift ?? 0.035, seed: ++pageNo * 97, margin: o.margin ?? 36, gutter: o.gutter ?? [14, 30], end: b, no: pageNo };
      S.patterns = {};
      const prev = shots[shots.length - 1];
      shots.push(S);
      if (prev) { prev.next = S; prev.end = Math.max(prev.end, a + S.dur); }
      if (S.in === 'cut') { if (a > 0.01) F.cut(a); }
      else if (a > 0.01) {
        F.transition(a, a + S.dur + 0.1);
        const snd = { turn: 'page', slash: 'slash', tear: 'tear', ink: 'whoosh', fade: 'whoosh' }[S.in];
        if (snd) F.sfx(a, snd, S.in === 'fade' ? 0.3 : S.in === 'tear' ? 0.4 : 0.5, { dur: S.dur });
        if (S.in !== 'fade') F.blur(a, a + S.dur, 4);
      }
      if (S.in === 'slash' || S.in === 'tear') S.slashSeed = S.seed + 3;
      Object.assign(S, pageApi(S));
      S.cam(a, o.view ?? 'page');
      return S;
    };

    function pageApi(S) {
      const api = {};
      // a dot-tone pattern in this page's defs (density = ink coverage 0–1, cell = dot spacing in page units)
      api.dots = (density = 0.25, cell = 6, angle = 45) => {
        const k = `${density}:${cell}:${angle}`; if (S.patterns[k]) return S.patterns[k];
        const id = uid('d'), p = sv('pattern', { id, patternUnits: 'userSpaceOnUse', width: cell, height: cell, patternTransform: `rotate(${angle})` }, S.defs);
        const rr = cell * Math.sqrt(cl(density, 0.01, 0.95) / Math.PI);
        if (density > 0.7) { sv('rect', { width: cell, height: cell, fill: C.tone }, p); const r2 = cell * Math.sqrt((1 - density) / Math.PI); sv('circle', { cx: cell / 2, cy: cell / 2, r: f2(r2), fill: C.paper }, p); }
        else sv('circle', { cx: cell / 2, cy: cell / 2, r: f2(rr), fill: C.tone }, p);
        return (S.patterns[k] = `url(#${id})`);
      };
      api.hatch = (gap = 5, angle = 45, wd = 1.2) => {
        const k = `h${gap}:${angle}:${wd}`; if (S.patterns[k]) return S.patterns[k];
        const id = uid('h'), p = sv('pattern', { id, patternUnits: 'userSpaceOnUse', width: gap, height: gap, patternTransform: `rotate(${angle})` }, S.defs);
        sv('rect', { x: 0, y: 0, width: wd, height: gap, fill: C.tone }, p);
        return (S.patterns[k] = `url(#${id})`);
      };
      // camera
      api.cam = (t, view, ease) => { S.keys.push({ t, view, ease: ease || E.cubicInOut }); S.keys.sort((p, q) => p.t - q.t); S.rk = null; return S; };
      // read panels in order: arrive on each at its time (the move takes `travel` s before it), hold with a slow drift in between
      api.read = (list, times, o = {}) => {
        const tr = o.travel ?? 0.5;
        list.forEach((p, i) => {
          const t = times[i], v = p && p.view ? p : { on: p, pad: o.pad ?? 1.12 };
          if (i > 0 || o.first !== false) { api.cam(t - tr, { hold: true }); api.cam(t, v, o.ease || E.cubicInOut); F.blur(t - tr, t, 4); F.sfx(t - tr, 'pan', 0.22, { dur: tr }); }
        });
        return S;
      };
      // a punch-in: within ~0.15 s the camera slams closer on the target, holds, and (back: true) eases back out
      api.punch = (t, target, o = {}) => { S.punches.push({ t, target, pad: o.pad ?? 1.05, hold: o.hold ?? 0.6, back: o.back ?? false, k: o.k ?? 1 }); F.blur(t, t + 0.16, 6); F.appear(t); if (o.sfx !== false) F.sfx(t, 'punch', 0.55); return S; };
      // panels
      api.panel = (rect, o = {}) => makePanel(S, rect, o);
      api.tiers = (rows, o = {}) => {
        const m = o.margin ?? S.margin, [gc, gr] = o.gutter ?? S.gutter, W2 = S.w - 2 * m, H2 = S.h - 2 * m;
        const R2 = rows.map((r) => (Array.isArray(r) ? { cols: r } : r)), hs = R2.reduce((s, r) => s + (r.h ?? 1), 0);
        let y = m; const out = [];
        // row boundaries as lines y = y0 + k (x - centre): slant = drop of the line across the page width (page fraction of h)
        const bounds = [{ y0: m, k: 0 }];
        R2.forEach((r, i) => { y += H2 * (r.h ?? 1) / hs; bounds.push(i === R2.length - 1 ? { y0: S.h - m, k: 0 } : { y0: y, k: ((r.slant ?? 0) * S.h) / S.w }); });
        R2.forEach((r, i) => {
          const top = bounds[i], bot = bounds[i + 1], cols = r.cols, cs = cols.reduce((s, c) => s + c, 0);
          const yT = (x) => top.y0 + top.k * (x - S.w / 2) + (i ? gr / 2 : 0), yB = (x) => bot.y0 + bot.k * (x - S.w / 2) - (i < R2.length - 1 ? gr / 2 : 0);
          // column boundaries x = x0 + m (y - mid): cuts = horizontal shift of each inner boundary's bottom end relative to its top (page fraction of w)
          const xs = [m]; let acc = m; cols.forEach((c, j) => { acc += W2 * c / cs; xs.push(j === cols.length - 1 ? S.w - m : acc); });
          const midY = (top.y0 + bot.y0) / 2, rowH = Math.max(1, bot.y0 - top.y0);
          const cut = (j) => (j === 0 || j === cols.length ? 0 : ((r.cuts && r.cuts[j - 1]) || 0) * S.w / rowH);
          const panelsRow = [];
          for (let j = 0; j < cols.length; j++) {
            const xl = (yy) => xs[j] + cut(j) * (yy - midY) + (j ? gc / 2 : 0), xr = (yy) => xs[j + 1] + cut(j + 1) * (yy - midY) - (j < cols.length - 1 ? gc / 2 : 0);
            // corners: intersect the (possibly slanted) row lines with the column lines (two passes are enough for the small slopes used)
            const corner = (xf, yf) => { let yy = yf(xf(midY)); for (let it = 0; it < 3; it++) yy = yf(xf(yy)); return [xf(yy), yy]; };
            const poly = [corner(xl, yT), corner(xr, yT), corner(xr, yB), corner(xl, yB)].map(([x, yy]) => [x / S.w, yy / S.h]);
            panelsRow.push({ poly, ...((r.opts && r.opts[j]) || {}) });
          }
          if (DIR < 0) panelsRow.reverse();   // right to left: the right-most panel is read first
          for (const pr of panelsRow) out.push(pr);
        });
        const ats = Array.isArray(o.at) ? o.at : null;
        return out.map((pr, i) => makePanel(S, { poly: pr.poly }, { ...o.panel, ...pr, poly: undefined, at: ats ? ats[i] : o.at ?? S.a }));
      };
      // a chapter-title block set on the page (heavy lettering, vertical by default)
      api.title = (text, o = {}) => {
        const at = o.at ?? S.a, size = o.size ?? 120, x = (o.x ?? 0.85) * S.w, y = (o.y ?? 0.1) * S.h, vert = o.vertical ?? true;
        const e = node('div', `position:absolute;left:${gx(x)}px;top:${gx(y)}px;font:400 ${gx(size)}px/1.05 ${FONT.sfxZh};color:${C.ink};${vert ? 'writing-mode:vertical-rl;text-orientation:upright;inline-size:max-content;block-size:max-content;' : ''}letter-spacing:.04em;white-space:nowrap;opacity:0;transform:translateX(-50%);-webkit-text-stroke:${gx(size * 0.03)}px ${C.paper};paint-order:stroke fill`, S.textLayer, vert ? tcy(text) : esc(text));
        F.text(e, 'headline', text, at, o.until ?? S.b);
        F.add((t) => set(e, { opacity: seg(t, at, at + 0.25).toFixed(3) }));
        if (o.kicker) { const k = node('div', `position:absolute;left:${gx(x - size * (vert ? 1.05 : 0))}px;top:${gx(y + (vert ? 0 : size * 1.2))}px;font:900 ${gx(size * 0.26)}px/1.2 ${FONT.talk};color:${C.paper};background:${C.ink};padding:${gx(size * 0.08)}px ${gx(size * 0.12)}px;${vert ? 'writing-mode:vertical-rl;text-orientation:upright;' : ''}white-space:nowrap;opacity:0;transform:translateX(-50%)`, S.textLayer, esc(o.kicker)); F.text(k, 'label', o.kicker, at + 0.2, o.until ?? S.b); F.add((t) => set(k, { opacity: seg(t, at + 0.2, at + 0.4).toFixed(3) })); }
        F.sfx(at, 'ink', 0.5);
        return e;
      };
      return api;
    }

    // ---------- the camera ----------
    const boxOf = (S, on) => {
      if (Array.isArray(on)) { const bs = on.map((x) => boxOf(S, x)); const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y)), x1 = Math.max(...bs.map((b) => b.x + b.w)), y1 = Math.max(...bs.map((b) => b.y + b.h)); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
      if (on && on.pbox) return on.pbox();
      if (on && on.box) return on.box();
      return on;
    };
    const fit = (bx, pad) => {
      const avail = 1 - SAFE.top - SAFE.bottom, h = Math.max((bx.h * pad) / avail, (bx.w * pad) / AR);
      return { x: bx.x + bx.w / 2, y: bx.y + bx.h / 2 + (SAFE.bottom - SAFE.top) * h / 2, h, r: 0 };
    };
    // keep the view on the paper: a view bigger than the page centres it, a smaller one stays inside its edges (no dark band past the page)
    const clampView = (S, v) => {
      const m = 24, vw = v.h * AR, availH = v.h * (1 - SAFE.top - SAFE.bottom), off = (SAFE.bottom - SAFE.top) * v.h / 2;
      const x = vw >= S.w + 2 * m ? S.w / 2 : cl(v.x, vw / 2 - m, S.w - vw / 2 + m);
      const y = availH >= S.h + 2 * m ? S.h / 2 + off : cl(v.y, availH / 2 - m + off, S.h - availH / 2 + m + off);
      return { ...v, x, y };
    };
    const resolveView = (S, v) => {
      if (!v || v === 'page') return clampView(S, fit({ x: 0, y: 0, w: S.w, h: S.h }, 1.04));
      if (v.on) { const f2v = fit(boxOf(S, v.on), v.pad ?? 1.1), r0 = { ...f2v, x: f2v.x + (v.dx ?? 0), y: f2v.y + (v.dy ?? 0), h: v.h ?? f2v.h, r: v.r ?? 0 }; return v.free ? r0 : clampView(S, r0); }
      return { x: v.x ?? S.w / 2, y: v.y ?? S.h / 2, h: v.h ?? 1000, r: v.r ?? 0 };
    };
    const lerpV = (p, q, e) => ({ x: mix(p.x, q.x, e), y: mix(p.y, q.y, e), h: Math.exp(mix(Math.log(p.h), Math.log(q.h), e)), r: mix(p.r, q.r, e) });
    const camAt = (S, t) => {
      if (!S.rk) {   // resolve keys once: { hold: true } repeats the view before it
        S.rk = []; let last = resolveView(S, 'page');
        for (const k of S.keys) { const v = k.view && k.view.hold ? { ...last } : resolveView(S, k.view); S.rk.push({ t: k.t, v, ease: k.ease }); last = v; }
      }
      const K = S.rk; let v;
      if (t <= K[0].t) v = { ...K[0].v };
      else if (t >= K[K.length - 1].t) v = { ...K[K.length - 1].v };
      else { let i = 0; while (K[i + 1].t < t) i++; const p = K[i], q = K[i + 1]; v = lerpV(p.v, q.v, (q.ease || E.cubicInOut)(cl((t - p.t) / Math.max(1e-6, q.t - p.t)))); }
      for (const pu of S.punches) if (t >= pu.t) {
        const tv = resolveView(S, { on: pu.target, pad: pu.pad }), qin = E.expoOut(seg(t, pu.t, pu.t + 0.16)), qout = pu.back ? E.cubicInOut(seg(t, pu.t + pu.hold, pu.t + pu.hold + 0.5)) : 0;
        v = lerpV(v, tv, qin * (1 - qout) * pu.k);
      }
      v.h *= 1 - S.drift * cl((t - S.a) / Math.max(0.1, S.b - S.a));
      return v;
    };
    R.camAt = camAt;

    // ---------- per frame: visibility, transitions, cameras ----------
    F.add((t) => {
      for (const S of shots) {
        const vis = t >= S.a - 1e-6 && t < S.end;
        set(S.root, { display: vis ? '' : 'none' });
        if (!vis) continue;
        const v = camAt(S, t), k = 1000 / v.h;
        set(S.world, { transform: `translate(${W / 2}px,${H / 2}px) rotate(${v.r.toFixed(3)}deg) scale(${k.toFixed(5)}) translate(${(-v.x * g).toFixed(2)}px,${(-v.y * g).toFixed(2)}px)` });
        // incoming transition of this page
        const qi = S.dur ? seg(t, S.a, S.a + S.dur) : 1;
        let op = 1, clip = 'none', tf = 'none', z = 1;
        if (S.in === 'fade') op = E.sine(qi);
        if ((S.in === 'slash' || S.in === 'tear') && qi < 1) clip = `path('${slashPath(S, E.expoOut(qi))}')`;
        if (S.in === 'ink' && qi < 1) clip = `circle(${(E.quartIn(qi) * 120).toFixed(2)}% at ${DIR < 0 ? '85%' : '15%'} 50%)`;
        // outgoing: the next page turns this one away (it lies on top and folds about its spine)
        const N = S.next;
        if (N && N.in === 'turn' && t >= N.a) { const q = E.cubicInOut(seg(t, N.a, N.a + N.dur)); tf = `perspective(${gx(2600)}px) rotateY(${(DIR * -100 * q).toFixed(2)}deg)`; z = 3; }
        else if (N && t >= N.a) z = 0;
        set(S.root, { opacity: op.toFixed(3), clipPath: clip, transform: tf, transformOrigin: DIR < 0 ? '100% 50%' : '0% 50%', zIndex: String(z) });
        S.root.dataset.lintSkip = N && t >= N.a ? '1' : '0';
        if (S.turnShade) set(S.turnShade, { opacity: N && N.in === 'turn' && t >= N.a ? (0.6 * seg(t, N.a, N.a + N.dur)).toFixed(3) : '0' });
        if (S.slashInk) drawSlashInk(S, t);
        for (const p of S.panels) p.frame(t);
      }
    });
    // the slash: the new page opens along a diagonal band; a white cut line and ink spatter on its edges
    function slashPath(S, q) {
      const r = rnd(S.slashSeed), x0 = W * (DIR < 0 ? 0.72 : 0.28), wdt = q * Math.hypot(W, H) * 1.2, sl = 0.62, jag = S.in === 'tear';
      const pts1 = [], pts2 = [], K = jag ? 28 : 2;
      for (let i = 0; i <= K; i++) { const yy = -H * 0.1 + (H * 1.2 * i) / K, xc = x0 + (yy - H / 2) * sl * DIR * -1, j = jag ? (r() - 0.5) * W * 0.03 : 0; pts1.push([xc - wdt / 2 + j, yy]); pts2.push([xc + wdt / 2 + j * 0.7, yy]); }
      return ptsD([...pts1, ...pts2.reverse()]);
    }
    function drawSlashInk(S, t) {
      const q = seg(t, S.a, S.a + S.dur);
      set(S.slashInk, { opacity: q > 0 && q < 1 ? (1 - q).toFixed(3) : '0' });
    }

    // ---------- panels ----------
    function makePanel(S, rect, o = {}) {
      let poly;
      if (Array.isArray(rect)) { const [x, y, w, h] = rect; poly = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
      else if (rect.poly) poly = rect.poly;
      else { const { x, y, w, h } = rect; poly = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
      poly = poly.map(([x, y]) => [x * S.w, y * S.h]);
      // bleed: push the named sides past the page edge (true = every side that touches the margin)
      if (o.bleed) {
        const sides = o.bleed === true ? ['l', 'r', 't', 'b'] : [].concat(o.bleed), mg = S.margin + 2;
        poly = poly.map(([x, y]) => [sides.includes('l') && x <= mg ? -40 : sides.includes('r') && x >= S.w - mg ? S.w + 40 : x, sides.includes('t') && y <= mg ? -40 : sides.includes('b') && y >= S.h - mg ? S.h + 40 : y]);
      }
      const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
      const bx = { x: Math.min(...xs), y: Math.min(...ys) }; bx.w = Math.max(...xs) - bx.x; bx.h = Math.max(...ys) - bx.y;
      const P = { S, poly, x0: bx.x, y0: bx.y, w: bx.w, h: bx.h, at: o.at ?? S.a, until: o.until ?? 1e9, enter: o.enter ?? 'ink', fx: [], seed: S.seed + S.panels.length * 17 + 1, no: S.panels.length };
      const lp = poly.map(([x, y]) => [x - bx.x, y - bx.y]);
      P.lpoly = lp;
      P.root = sv('g', { transform: `translate(${f2(bx.x)},${f2(bx.y)})`, opacity: 0 }, S.panelsG);
      const cid = uid('c'); const cp = sv('clipPath', { id: cid }, S.defs); sv('path', { d: ptsD(lp) }, cp);
      P.clip = sv('g', { 'clip-path': `url(#${cid})` }, P.root);
      P.wipe = sv('g', {}, P.clip);
      const wid = uid('w'); P.wipeClip = sv('clipPath', { id: wid }, S.defs); P.wipeRect = sv('rect', { x: 0, y: -10, width: 0, height: P.h + 20 }, P.wipeClip);
      sa(P.wipe, { 'clip-path': `url(#${wid})` });
      P.base = sv('rect', { x: -2, y: -2, width: P.w + 4, height: P.h + 4, fill: C.paper }, P.wipe);
      P.bgG = sv('g', {}, P.wipe); P.toneG = sv('g', {}, P.wipe); P.artG = sv('g', {}, P.wipe); P.fxG = sv('g', {}, P.wipe);
      // the frame line (drawn after the content so it sits on top); broken = with gaps where things break out
      const bw = o.bw ?? 3.2, bstyle = o.border ?? 'solid';
      P.border = bstyle === 'none' ? null : sv('path', { d: ptsD(lp), fill: 'none', stroke: C.ink, 'stroke-width': bw, 'stroke-linejoin': 'miter', ...(bstyle === 'wavy' ? { 'stroke-dasharray': '2 0' } : {}) }, P.root);
      if (P.border && bstyle === 'wavy') sa(P.border, { d: wavyD(lp, 6, P.seed) });
      if (P.border) { const L = perim(lp); P.blen = L; sa(P.border, { 'stroke-dasharray': `${f2(L)} ${f2(L)}`, 'stroke-dashoffset': f2(L) }); }
      // breakout layer: art that crosses the frame (drawn above the border, unclipped)
      P.outG = sv('g', { transform: `translate(${f2(bx.x)},${f2(bx.y)})`, opacity: 0 }, S.overG);
      P.box = () => ({ x: P.x0, y: P.y0, w: P.w, h: P.h });
      P.pbox = P.box;
      P.X = (f) => f * P.w; P.Y = (f) => f * P.h;
      P.frame = (t) => {
        const a = P.at, show = t >= a - 0.4 && t < P.until + 0.3;
        if (!show) { sa(P.root, { opacity: 0 }); sa(P.outG, { opacity: 0 }); for (const f of P.fx) f(t); return; }   // overlays (lettering, balloons, labels) live outside the panel: let them hide themselves
        let op = 1, wipe = 1, bq = 1, sc = 1;
        if (P.enter === 'ink') { bq = E.quartOut(seg(t, a - 0.36, a - 0.12)); wipe = E.cubicInOut(seg(t, a - 0.22, a)); op = t >= a - 0.36 ? 1 : 0; }
        else if (P.enter === 'fade') { op = E.sine(seg(t, a - 0.3, a)); }
        else if (P.enter === 'pop') { const q = seg(t, a - 0.18, a); op = q > 0 ? 1 : 0; sc = 0.86 + 0.14 * E.backOut(q); }
        else op = t >= a ? 1 : 0;
        if (t > P.until) op *= 1 - seg(t, P.until, P.until + 0.25);
        sa(P.root, { opacity: op.toFixed(3), transform: sc === 1 ? `translate(${f2(P.x0)},${f2(P.y0)})` : `translate(${f2(P.x0 + P.w * (1 - sc) / 2)},${f2(P.y0 + P.h * (1 - sc) / 2)}) scale(${sc.toFixed(4)})` });
        sa(P.outG, { opacity: (op * (P.enter === 'ink' ? seg(t, a - 0.1, a) : 1)).toFixed(3) });
        const wx = DIR < 0 ? P.w * (1 - wipe) : 0;
        sa(P.wipeRect, { x: f2(wx - 10), width: f2(P.w * wipe + 20) });
        if (P.border) sa(P.border, { 'stroke-dashoffset': f2(P.blen * (1 - bq)) });
        for (const f of P.fx) f(t);
      };
      if (P.at > S.a + 0.05 && P.enter === 'ink') F.sfx(P.at - 0.32, 'pen', 0.3, { dur: 0.3 });
      if (P.enter === 'pop') F.sfx(P.at - 0.15, 'pop', 0.4);
      S.panels.push(P);
      Object.assign(P, panelApi(P));
      if (o.bg) P.bg(o.bg, typeof o.bgOpt === 'object' ? o.bgOpt : {});
      return P;
    }
    const perim = (pts) => pts.reduce((s, p, i) => s + Math.hypot(pts[(i + 1) % pts.length][0] - p[0], pts[(i + 1) % pts.length][1] - p[1]), 0);
    function wavyD(pts, amp, seed) {
      const out = [];
      pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(2, Math.round(L / 22)); for (let k = 0; k < n; k++) { const u = k / n, nx = -(q[1] - p[1]) / L, ny = (q[0] - p[0]) / L, w2 = Math.sin(u * n * Math.PI) * amp; out.push([mix(p[0], q[0], u) + nx * w2, mix(p[1], q[1], u) + ny * w2]); } });
      return ptsD(out);
    }

    // a timed element inside a panel: fades / pops in at `at`, out at `until`
    const timed = (P, e, at, until, o = {}) => {
      const pop = o.pop ?? false;
      P.fx.push((t) => {
        let op = seg(t, at - (o.fade ?? 0.2), at); if (until != null) op *= 1 - seg(t, until, until + 0.25);
        const attrs = { opacity: op.toFixed(3) };
        if (pop && e._tf) { const q = E.backOut(seg(t, at - 0.16, at)); attrs.transform = `${e._tf} scale(${(0.7 + 0.3 * q).toFixed(4)})`; }
        sa(e, attrs);
      });
    };

    // effect lines that stay alive by moving smoothly (a frame-swapping boil reads as constant jumping on video):
    //   speed lines stream along their direction in a seamless loop; focus lines and rays turn and breathe a little; odoro lines sway
    function liveLines(P, g2, kind, w, h, oo, seed, col) {
      if (kind === 'speed') {
        const an = oo.angle ?? 0, diag = Math.hypot(w, h), Lp = diag * 1.2, r = rnd(seed), n = Math.round(diag / 9 * (oo.density ?? 1)), wd = oo.width ?? 6;
        let d = '';
        for (let i = 0; i < n; i++) { const y = (r() - 0.5) * diag, len = diag * (0.2 + r() * 0.5), x0 = (r() - 0.5) * Lp, ww = wd * (0.3 + r() * 1.2); for (const k of [-1, 0, 1]) d += wedge(x0 + k * Lp - len / 2, y, x0 + k * Lp + len / 2, y, ww, 'both'); }
        const rot = sv('g', { transform: `translate(${f2(w / 2)},${f2(h / 2)}) rotate(${f2(an)})` }, g2), mv = sv('g', {}, rot);
        const p = sv('path', { d, fill: col }, mv); p.dataset.motion = 'skip'; mv.dataset.motion = 'skip';
        const v = (oo.speed ?? 0.9) * diag * (oo.flow ?? -1);
        P.fx.push((t) => { const sh = ((t * v) % Lp + Lp) % Lp - (v < 0 ? Lp : 0); sa(mv, { transform: `translate(${f2(sh)},0)` }); });
        return;
      }
      const fn = { focus: focusD, flash: raysD, burst: raysD, odoro: odoroD, rays: raysD }[kind];
      const cx = (oo.cx ?? 0.5) * w, cy = (oo.cy ?? 0.5) * h, mv = sv('g', {}, g2);
      const p = sv('path', { d: fn(w, h, { ...oo, n: oo.n ?? (kind === 'focus' ? Math.round(150 * (oo.density ?? 1)) : undefined) }, seed), fill: col }, mv); p.dataset.motion = 'skip'; mv.dataset.motion = 'skip';
      if (kind === 'odoro') P.fx.push((t) => sa(mv, { transform: `translate(${f2(Math.sin(t * 1.3) * w * 0.006)},${f2(Math.sin(t * 1.1 + 1) * h * 0.006)})` }));
      else P.fx.push((t) => { const a = Math.sin(t * 0.9 + seed) * 2.2 + t * (oo.spin ?? 1.2), k = 1 + 0.025 * Math.sin(t * 1.7 + seed); sa(mv, { transform: `translate(${f2(cx)},${f2(cy)}) rotate(${f2(a)}) scale(${k.toFixed(4)}) translate(${f2(-cx)},${f2(-cy)})` }); });
    }
    function panelApi(P) {
      const S = P.S, api = {};
      const at0 = (o) => o.at ?? P.at;
      // whole-panel backgrounds
      api.bg = (kind, o = {}) => {
        const at = at0(o), until = o.until ?? null, g2 = sv('g', { opacity: 0 }, P.bgG), w = P.w, h = P.h;
        const fill = (f) => sv('rect', { x: -20, y: -20, width: w + 40, height: h + 40, fill: f }, g2);
        if (kind === 'black') fill(C.ink);
        else if (kind === 'white') fill(C.paper);
        else if (kind === 'tone') fill(S.dots(o.density ?? 0.22, o.cell ?? 6));
        else if (kind === 'grad') sv('image', { href: toneCanvas('grad', w, h, { from: o.from ?? 0.6, to: o.to ?? 0, angle: o.angle ?? 90, cell: o.cell }), x: 0, y: 0, width: w, height: h, preserveAspectRatio: 'none' }, g2);
        else if (kind === 'spot' && C.spot) fill(C.spot);
        const lineKinds = { speed: speedD, focus: focusD, flash: raysD, burst: raysD, odoro: odoroD };
        if (kind === 'flash') fill(C.ink);
        if (kind === 'burst' && o.tone !== false) sv('image', { href: toneCanvas('grad', w, h, { radial: [o.cx ?? 0.5, o.cy ?? 0.5, 0.75], from: 0, to: 0.5 }), x: 0, y: 0, width: w, height: h, preserveAspectRatio: 'none' }, g2);
        if (lineKinds[kind]) {
          const col = kind === 'flash' || o.white ? C.paper : C.ink;
          const oo = { ...o, width: o.width ?? (kind === 'flash' ? 16 : kind === 'focus' ? 9 * Math.max(1, Math.min(w, h) / 500) : 6) };
          if (kind === 'burst') oo.inner = o.inner ?? 0.18;
          liveLines(P, g2, kind, w, h, oo, P.seed * 7 + kind.length, col);
        }
        if (kind === 'sparkle') for (let k = 0; k < (o.n ?? 14); k++) { const r = rnd(P.seed + k * 7), x = r() * w, y = r() * h, s = (10 + r() * 26) * Math.max(1, h / 600); sparkle(g2, x, y, s); }
        timed(P, g2, at, until, { fade: o.fade ?? 0.15 });
        if (lineKinds[kind]) F.info('effect', at, until ?? P.until, { visual: false });
        return g2;
      };
      // effect lines over part of a panel: P.lines('focus' | 'speed' | 'odoro', { box: [x, y, w, h] (fractions), … })
      api.lines = (kind, o = {}) => {
        const [bx, by, bw, bh] = o.box ?? [0, 0, 1, 1], g2 = sv('g', { transform: `translate(${f2(bx * P.w)},${f2(by * P.h)})` }, P.fxG);
        const w = bw * P.w, h = bh * P.h;
        liveLines(P, g2, kind, w, h, { ...o, width: o.width ?? 5 }, P.seed * 3 + kind.length, o.white ? C.paper : C.ink);
        timed(P, g2, at0(o), o.until ?? null, { fade: 0.12 });
        return g2;
      };
      // screentone on a region: shape = { rect: [x, y, w, h] } | { ellipse: [cx, cy, rx, ry] } | { poly: [[x, y]…] } | { d: 'svg path in panel units' }
      api.tone = (shape, o = {}) => {
        const kind = o.kind ?? 'dot', at = (o.at ?? P.at) + (o.delay ?? 0.15), w = P.w, h = P.h;
        const d = shape.d ?? (shape.rect ? ptsD([[shape.rect[0] * w, shape.rect[1] * h], [(shape.rect[0] + shape.rect[2]) * w, shape.rect[1] * h], [(shape.rect[0] + shape.rect[2]) * w, (shape.rect[1] + shape.rect[3]) * h], [shape.rect[0] * w, (shape.rect[1] + shape.rect[3]) * h]]) : shape.ellipse ? ellipseD(shape.ellipse[0] * w, shape.ellipse[1] * h, shape.ellipse[2] * w, shape.ellipse[3] * w) : ptsD(shape.poly.map(([x, y]) => [x * w, y * h])));
        let e;
        if (kind === 'grad' || kind === 'sand') {
          const id = uid('t'), cp = sv('clipPath', { id }, S.defs); sv('path', { d }, cp);
          e = sv('image', { href: toneCanvas(kind, w, h, o), x: 0, y: 0, width: w, height: h, preserveAspectRatio: 'none', 'clip-path': `url(#${id})` }, P.toneG);
        } else e = sv('path', { d, fill: kind === 'hatch' ? S.hatch(o.gap ?? 5, o.angle ?? 45, o.width ?? 1.2) : S.dots(o.density ?? 0.2, o.cell ?? 6, o.angle ?? 45) }, P.toneG);
        sa(e, { opacity: 0 }); timed(P, e, at, o.until ?? null, { fade: 0.3 });
        return e;
      };
      // custom drawing in panel units: fn(g, kit) with kit = { w, h, X, Y, ink, dots, hatch, tone, line, shade, sparkle, wedge, focusD, speedD, raysD, jagD }
      api.draw = (fn, o = {}) => {
        const g2 = sv('g', { opacity: 0 }, o.breakout ? P.outG : P.artG);
        fn(g2, kit(P));
        timed(P, g2, at0(o), o.until ?? null, { fade: o.fade ?? 0.2 });
        if (o.info) F.info(o.info, at0(o), o.until ?? P.until);
        return g2;
      };
      api.char = (who, o = {}) => placeChar(P, who, o);
      api.fist = (o = {}) => placeFist(P, o);
      api.manpu = (kind, o = {}) => manpu(P, kind, o);
      api.sfx = (text, o = {}) => sfx(P, text, o);
      api.balloon = (kind, text, o = {}) => balloon(P, kind, text, o);
      api.label = (text, o = {}) => label(P, text, o);
      api.intro = (text, o = {}) => intro(P, text, o);
      api.chart = (o = {}) => chart(P, o);
      // your own animation inside the panel: fn(t) runs every frame (set attributes with R.sa(el, { … }))
      api.anim = (fn) => { P.fx.push(fn); return P; };
      api.dim = (t, o = {}) => { const r2 = sv('rect', { x: -10, y: -10, width: P.w + 20, height: P.h + 20, fill: C.ink, opacity: 0 }, P.fxG); P.fx.push((tt) => sa(r2, { opacity: ((o.to ?? 0.55) * seg(tt, t, t + (o.dur ?? 0.4)) * (o.until ? 1 - seg(tt, o.until, o.until + 0.3) : 1)).toFixed(3) })); return r2; };
      return api;
    }
    const ellipseD = (cx, cy, rx, ry) => `M${f2(cx - rx)},${f2(cy)}a${f2(rx)},${f2(ry)} 0 1,0 ${f2(rx * 2)},0a${f2(rx)},${f2(ry)} 0 1,0 ${f2(-rx * 2)},0Z`;
    function sparkle(g2, x, y, s, col = C.ink) {
      sv('path', { d: `M${f2(x)},${f2(y - s)}Q${f2(x + s * 0.12)},${f2(y - s * 0.12)} ${f2(x + s)},${f2(y)}Q${f2(x + s * 0.12)},${f2(y + s * 0.12)} ${f2(x)},${f2(y + s)}Q${f2(x - s * 0.12)},${f2(y + s * 0.12)} ${f2(x - s)},${f2(y)}Q${f2(x - s * 0.12)},${f2(y - s * 0.12)} ${f2(x)},${f2(y - s)}Z`, fill: C.paper, stroke: col, 'stroke-width': Math.max(1.2, s * 0.08) }, g2);
    }
    const kit = (P) => ({ w: P.w, h: P.h, X: P.X, Y: P.Y, sv, ink: C.ink, paper: C.paper, spot: C.spot, dots: P.S.dots, hatch: P.S.hatch, toneCanvas, wedge, focusD, speedD, raysD, jagD, ellipseD, ptsD, sparkle: (g2, x, y, s) => sparkle(g2, x, y, s), rnd, f2,
      // an inked line along points, pressure-tapered at both ends (w = max width)
      line: (g2, pts, w = 4, o = {}) => sv('path', { d: taperD(pts, w, o.taper ?? 'both'), fill: o.color ?? C.ink }, g2),
      // a closed shape: white fill, ink outline, optional tone shading on the side away from the light
      shape: (g2, d, o = {}) => shaded(P.S, g2, d, o) });
    R.kit = kit; R.sa = sa; R.sv = sv;
    // a polyline as a filled, tapered ribbon
    function taperD(pts, w, taper = 'both') {
      if (pts.length < 2) return '';
      const L = [], R2 = [], n = pts.length;
      for (let i = 0; i < n; i++) {
        const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, q = i / (n - 1);
        const k = taper === 'both' ? Math.sin(Math.PI * cl(q * 0.9 + 0.05)) : taper === 'end' ? 1 - q * 0.92 : taper === 'start' ? 0.08 + q * 0.92 : 1;
        const hw = (w / 2) * k, nx = (-dy / len) * hw, ny = (dx / len) * hw;
        L.push([p[0] + nx, p[1] + ny]); R2.push([p[0] - nx, p[1] - ny]);
      }
      return ptsD([...L, ...R2.reverse()]);
    }
    R.taperD = taperD;
    // white shape with an ink outline and (optionally) a dot tone over the shadow side: the shadow = the shape minus itself moved towards the light
    function shaded(S, g2, d, o = {}) {
      const grp = sv('g', {}, g2);
      if (o.fill && String(o.fill).startsWith('url(')) sv('path', { d, fill: C.paper }, grp);
      sv('path', { d, fill: o.fill ?? C.paper, stroke: 'none' }, grp);
      if (o.tone) {
        const id = uid('m'), mk = sv('mask', { id, maskUnits: 'userSpaceOnUse', x: -5000, y: -5000, width: 10000, height: 10000 }, S.defs);
        sv('path', { d, fill: '#fff' }, mk);
        const [lx, ly] = o.light ?? [-0.3, -0.3], s = o.shade ?? 12;
        sv('path', { d, fill: '#000', transform: `translate(${f2(lx * s * 3)},${f2(ly * s * 3)})` }, mk);
        sv('path', { d, fill: o.tone === true ? S.dots(0.3, 5) : o.tone, mask: `url(#${id})` }, grp);
      }
      if (o.stroke !== false) sv('path', { d, fill: 'none', stroke: o.ink ?? C.ink, 'stroke-width': o.lw ?? 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, grp);
      return grp;
    }
    R.shaded = shaded;

    // ---------- manpu (漫符): the little marks of manga emotion ----------
    function manpu(P, kind, o = {}) {
      const x = (o.x ?? 0.5) * P.w, y = (o.y ?? 0.3) * P.h, s = (o.size ?? 0.12) * P.h, at = at1(P, o);
      const g2 = sv('g', { opacity: 0 }, o.breakout ? P.outG : P.fxG), lw = Math.max(2, s * 0.06);
      const ink = { fill: 'none', stroke: C.ink, 'stroke-width': lw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
      if (kind === 'sweat') { for (const [dx, dy, k] of o.drops ?? [[0, 0, 1]]) { const sx = x + dx * s, sy = y + dy * s, r2 = s * 0.28 * k; sv('path', { d: `M${f2(sx)},${f2(sy - r2 * 2.2)}C${f2(sx + r2 * 0.4)},${f2(sy - r2)} ${f2(sx + r2)},${f2(sy - r2 * 0.2)} ${f2(sx + r2)},${f2(sy + r2 * 0.4)}A${f2(r2)},${f2(r2)} 0 1,1 ${f2(sx - r2)},${f2(sy + r2 * 0.4)}C${f2(sx - r2)},${f2(sy - r2 * 0.2)} ${f2(sx - r2 * 0.4)},${f2(sy - r2)} ${f2(sx)},${f2(sy - r2 * 2.2)}Z`, fill: C.paper, ...ink }, g2); sv('path', { d: `M${f2(sx - r2 * 0.35)},${f2(sy + r2 * 0.1)}q${f2(r2 * 0.1)},${f2(r2 * 0.5)} ${f2(r2 * 0.45)},${f2(r2 * 0.65)}`, ...ink, 'stroke-width': lw * 0.7 }, g2); } }
      else if (kind === 'vein') { for (let k = 0; k < 4; k++) { const a = k * 90 + 45, ca = Math.cos(a * D2R), sa2 = Math.sin(a * D2R); sv('path', { d: `M${f2(x + ca * s * 0.12)},${f2(y + sa2 * s * 0.12)}Q${f2(x + ca * s * 0.55 + sa2 * s * 0.12)},${f2(y + sa2 * s * 0.55 - ca * s * 0.12)} ${f2(x + ca * s * 0.5 - sa2 * s * 0.3)},${f2(y + sa2 * s * 0.5 + ca * s * 0.3)}`, ...ink, stroke: o.spot && C.spot ? C.spot : C.ink, 'stroke-width': lw * 1.5 }, g2); } }
      else if (kind === 'sparkle') { sparkle(g2, x, y, s * 0.5); sparkle(g2, x + s * 0.45, y - s * 0.4, s * 0.25); sparkle(g2, x - s * 0.4, y + s * 0.35, s * 0.18); }
      else if (kind === 'steam') { for (let k = 0; k < 3; k++) sv('path', { d: ellipseD(x + (k - 1) * s * 0.42, y - Math.abs(k - 1) * s * 0.15, s * 0.26, s * 0.2), fill: C.paper, ...ink }, g2); }
      else if (kind === 'zzz') { [0, 1, 2].forEach((k) => { const tx = sv('text', { x: x + k * s * 0.42, y: y - k * s * 0.42, 'font-family': FONT.sfx, 'font-size': s * (0.5 + k * 0.18), fill: C.paper, stroke: C.ink, 'stroke-width': lw * 1.2, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }, g2); tx.textContent = 'Z'; }); }
      else if (kind === 'exclaim' || kind === 'question') { const tx = sv('text', { x, y, 'text-anchor': 'middle', 'font-family': FONT.sfx, 'font-size': s * 1.1, fill: C.ink, stroke: C.paper, 'stroke-width': lw * 1.6, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }, g2); tx.textContent = kind === 'exclaim' ? (o.n === 2 ? '!!' : '!') : '?'; }
      else if (kind === 'gloom') { const r = rnd(P.seed + 5); for (let k = 0; k < (o.n ?? 9); k++) { const lx = x + (k / ((o.n ?? 9) - 1) - 0.5) * s * 2.2, l = s * (0.8 + r() * 0.6); sv('path', { d: wedge(lx, y - s * 0.6, lx, y - s * 0.6 + l, lw * 1.6, 'end'), fill: C.ink }, g2); } }
      else if (kind === 'tears') { for (const sd of [-1, 1]) sv('path', { d: `M${f2(x + sd * s * 0.4)},${f2(y)}q${f2(sd * s * 0.1)},${f2(s * 0.5)} ${f2(sd * s * 0.05)},${f2(s * 1.1)}`, ...ink, 'stroke-width': lw * 2.2 }, g2); }
      else if (kind === 'dots') { for (let k = 0; k < 3; k++) sv('circle', { cx: x + (k - 1) * s * 0.4, cy: y, r: s * 0.09, fill: C.ink }, g2); }
      else if (kind === 'shock') { for (let k = 0; k < 3; k++) { const a = (-60 + k * 40) * D2R; sv('path', { d: wedge(x + Math.cos(a) * s * 0.9, y + Math.sin(a) * s * 0.9, x + Math.cos(a) * s * 0.35, y + Math.sin(a) * s * 0.35, lw * 2.4, 'start'), fill: C.ink }, g2); } }
      timed(P, g2, at, o.until ?? null, { fade: 0.1 });
      if (o.sfx !== false) F.sfx(at - 0.05, { sweat: 'drip', vein: 'pop', sparkle: 'ting', exclaim: 'pop', question: 'pop', steam: 'puff', zzz: 'pop', gloom: 'gloom', tears: 'drip', dots: 'tick', shock: 'pop' }[kind] || 'pop', kind === 'sweat' || kind === 'tears' ? 0.24 : 0.35);
      if (o.wobble !== false && (kind === 'sweat' || kind === 'tears')) P.fx.push((t) => { if (t < at) return; sa(g2, { transform: `translate(0,${f2(Math.min(1, (t - at) * 0.6) * s * 0.15)})` }); });
      return g2;
    }
    const at1 = (P, o) => o.at ?? P.at;

    // ---------- sound-effect lettering (描き文字): part of the art ----------
    const isKana = (s) => /[぀-ヿ]/.test(s);
    function sfx(P, text, o = {}) {
      const S = P.S, at = at1(P, o), until = o.until ?? null, chars = [...String(text)], style = o.style ?? 'impact';
      const size = (o.size ?? 0.34) * Math.min(P.h, P.w * 1.2), vert = o.vertical ?? (chars.length > 1 && P.h > P.w * 0.9), font = o.font === 'kana' ? FONT.sfx : o.font === 'zh' ? FONT.sfxZh : o.font || (isKana(text) ? FONT.sfx : FONT.sfxZh);
      const cx = S.w * 0 + P.x0 + (o.x ?? 0.5) * P.w, cy = P.y0 + (o.y ?? 0.5) * P.h, r = rnd(P.seed + chars.length * 11 + (o.seed ?? 0));
      const fillC = o.fill === 'black' ? C.ink : o.fill === 'spot' && C.spot ? C.spot : C.paper, strokeC = o.fill === 'black' ? C.paper : C.ink;
      const grp = sv('g', { opacity: 0 }, S.overG), step = size * (o.tight ?? 0.86), n = chars.length;
      const rot = o.rot ?? (vert ? -6 : -8), glyphs = [];
      chars.forEach((ch, i) => {
        const along = (i - (n - 1) / 2) * step, sc = (style === 'rumble' ? 1 : 1 + (i === 0 ? 0.18 : 0) + (r() - 0.5) * 0.18) * (o.scales ? o.scales[i] ?? 1 : 1);
        const px = vert ? cx + (r() - 0.5) * size * 0.16 + (style === 'rumble' ? 0 : i * size * 0.06) : cx + along, py = vert ? cy + along : cy + (r() - 0.5) * size * 0.2 - i * size * 0.05;
        const gg = sv('g', {}, grp), tf = `translate(${f2(px)},${f2(py)}) rotate(${f2(rot + (r() - 0.5) * 16)}) skewX(${f2(o.skew ?? -8)})`; gg._tf = tf; sa(gg, { transform: tf });
        const mk = (attrs) => { const e = sv('text', { x: 0, y: size * 0.36 * sc, 'text-anchor': 'middle', 'font-family': font, 'font-size': f2(size * sc), 'stroke-linejoin': 'round', ...attrs }, gg); e.textContent = ch; return e; };
        mk({ fill: 'none', stroke: fillC === C.paper ? C.paper : C.ink, 'stroke-width': f2(size * sc * 0.2) });   // outer halo
        mk({ fill: 'none', stroke: strokeC, 'stroke-width': f2(size * sc * 0.11) });
        mk({ fill: fillC });
        glyphs.push({ gg, tf, i });
      });
      // a speed trail behind the letters (impact) or tremble (rumble)
      if (o.trail) { const tg = sv('g', {}, grp); grp.insertBefore(tg, grp.firstChild); for (let k = 0; k < 7; k++) { const yy = cy + (k - 3) * size * 0.22, len = size * (1.2 + r() * 1.4), x0 = cx - DIR * size * n * 0.3; sv('path', { d: wedge(x0, yy, x0 + DIR * len * -1 * -1, yy, size * 0.07, 'start'), fill: C.ink }, tg); } }
      // registered as text for the reading-time checks, but it is art: no fact check, may cross balloons and frames
      const proxy = node('div', `position:absolute;left:${gx(cx - (vert ? size / 2 : n * step / 2))}px;top:${gx(cy - (vert ? n * step / 2 : size / 2))}px;width:${gx(vert ? size : n * step)}px;height:${gx(vert ? n * step : size)}px;font-size:${gx(size)}px;color:transparent;overflow:hidden;opacity:0`, S.textLayer);
      proxy.textContent = text;
      const stag = o.stagger ?? (style === 'rumble' ? 0.12 : 0.05);
      for (let i = 0; i < n; i++) F.appear(at - (n - 1 - i) * stag - 0.12);   // each glyph slams in: an intended appearance, not a glitch
      P.fx.push((t) => {
        let op = until != null ? 1 - seg(t, until, until + 0.2) : 1; op *= t >= at - 0.05 - (n - 1) * stag ? 1 : 0;
        sa(grp, { opacity: op.toFixed(3) }); set(proxy, { opacity: op > 0 ? '1' : '0' });
        for (const gl of glyphs) {
          const ta = at - (n - 1 - gl.i) * stag, q = seg(t, ta - 0.12, ta);
          let extra = '';
          if (style === 'impact' || style === 'pop') extra = ` scale(${(1 + (1 - E.quartOut(q)) * (style === 'pop' ? 0.6 : 1.1)).toFixed(4)})`;
          if (style === 'rumble' && t > ta) { const ph = Math.floor(t * 15); extra = ` translate(${f2((Math.sin(ph * 2.3 + gl.i) * size) * 0.025)},${f2((Math.cos(ph * 3.1 + gl.i) * size) * 0.02)})`; }
          sa(gl.gg, { opacity: q > 0 ? Math.min(1, q * 3).toFixed(3) : '0', transform: gl.tf + extra });
        }
      });
      if (o.sound !== false) F.sfx(at - 0.04, o.sound || (style === 'rumble' ? 'rumble' : style === 'pop' ? 'pop' : 'hit'), o.gain ?? (style === 'pop' ? 0.45 : 0.75), { dur: style === 'rumble' ? (until ?? at + 1.5) - at : 0.4 });
      F.text(proxy, 'slam', text, at - (n - 1) * stag - 0.05, until ?? P.until, { noFact: true, overlap: true });
      return grp;
    }

    // ---------- balloons: shapes in the page's SVG, the lettering in HTML over it ----------
    function balloon(P, kind, text, o = {}) {
      const S = P.S, at = at1(P, o), until = o.until ?? null, vert = o.vertical ?? false;
      const size = o.size ?? (kind === 'shout' ? 34 : kind === 'narr' || kind === 'black' ? 26 : 29), lines = String(text).split(/\n|\|/);
      const cx = P.x0 + (o.x ?? 0.5) * P.w, cy = P.y0 + (o.y ?? 0.25) * P.h;
      const weight = kind === 'shout' ? 900 : kind === 'narr' ? 600 : kind === 'black' ? 700 : 700, font = kind === 'narr' ? FONT.narr : FONT.talk;
      const tx = node('div', `position:absolute;left:0;top:0;white-space:nowrap;text-align:center;font:${weight} ${gx(size)}px/1.28 ${font};color:${kind === 'black' ? C.paper : C.ink};${vert ? 'writing-mode:vertical-rl;text-orientation:upright;letter-spacing:.02em;' : ''}opacity:0`, S.textLayer, lines.map(vert ? tcy : esc).join('<br>'));
      const tw = tx.offsetWidth / g, th = tx.offsetHeight / g;
      const box = kind === 'narr' || kind === 'black';
      const padX = box ? size * 0.6 : size * (vert ? 0.85 : 1.0), padY = box ? size * 0.5 : size * (vert ? 1.0 : 0.75);
      const rx = (tw / 2 + padX) * (box ? 1 : 1.12), ry = (th / 2 + padY) * (box ? 1 : 1.12);
      set(tx, { left: `${gx(cx - tw / 2).toFixed(1)}px`, top: `${gx(cy - th / 2).toFixed(1)}px` });
      const grp = sv('g', { opacity: 0 }, S.overG);
      const lw = o.lw ?? 2.6;
      // the tail points at a spot in the panel ([x, y] fractions) or a character (its head)
      let tail = o.tail;
      if (tail && tail.headAt) tail = tail.headAt();
      else if (Array.isArray(tail)) tail = [P.x0 + tail[0] * P.w, P.y0 + tail[1] * P.h];
      let shapeD;
      if (box) shapeD = ptsD([[cx - rx, cy - ry], [cx + rx, cy - ry], [cx + rx, cy + ry], [cx - rx, cy + ry]]);
      else if (kind === 'shout') shapeD = jagD(cx, cy, rx * 1.02, ry * 1.02, o.spikes ?? 13, 0.2, P.seed + lines.length);
      else if (kind === 'think') { shapeD = ''; const n = 12; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; shapeD += ellipseD(cx + Math.cos(a) * rx * 0.86, cy + Math.sin(a) * ry * 0.86, rx * 0.3, ry * 0.3); } shapeD += ellipseD(cx, cy, rx * 0.9, ry * 0.9); }
      else shapeD = ellipseD(cx, cy, rx, ry);
      if (tail && kind !== 'think' && !box) {   // the tail is drawn under the balloon so the join is seamless
        const ang = Math.atan2(tail[1] - cy, tail[0] - cx), bxp = cx + Math.cos(ang) * rx * 0.8, byp = cy + Math.sin(ang) * ry * 0.8, nx = -Math.sin(ang), ny = Math.cos(ang), wt = Math.min(rx, ry) * 0.32, len = Math.hypot(tail[0] - bxp, tail[1] - byp), tl = Math.min(len * 0.85, Math.max(rx, ry) * 0.9);
        const tip = [bxp + Math.cos(ang) * tl, byp + Math.sin(ang) * tl], bend = (o.bend ?? 0.25) * tl;
        const td = `M${f2(bxp + nx * wt)},${f2(byp + ny * wt)}Q${f2((bxp + tip[0]) / 2 + nx * bend)},${f2((byp + tip[1]) / 2 + ny * bend)} ${f2(tip[0])},${f2(tip[1])}Q${f2((bxp + tip[0]) / 2 + nx * bend * 0.4)},${f2((byp + tip[1]) / 2 + ny * bend * 0.4)} ${f2(bxp - nx * wt)},${f2(byp - ny * wt)}Z`;
        sv('path', { d: td, fill: C.paper, stroke: C.ink, 'stroke-width': lw, 'stroke-linejoin': 'round' }, grp);
      }
      if (kind === 'think' && tail) for (let k = 0; k < 3; k++) { const q = 0.25 + k * 0.25, bxx = mix(cx, tail[0], 0.55 + q * 0.4), byy = mix(cy + ry, tail[1], q); sv('path', { d: ellipseD(bxx, byy, size * (0.42 - k * 0.11), size * (0.34 - k * 0.09)), fill: C.paper, stroke: C.ink, 'stroke-width': lw }, grp); }
      sv('path', { d: shapeD, fill: kind === 'black' ? C.ink : C.paper, stroke: C.ink, 'stroke-width': kind === 'shout' ? lw * 1.4 : lw, 'stroke-linejoin': kind === 'shout' ? 'miter' : 'round', ...(kind === 'whisper' ? { 'stroke-dasharray': `${size * 0.3} ${size * 0.22}` } : {}) }, grp);
      if (kind === 'think') sv('path', { d: ellipseD(cx, cy, rx * 0.9, ry * 0.9), fill: C.paper, stroke: 'none' }, grp);
      if (tail && !box && kind !== 'think') sv('path', { d: ellipseD(cx, cy, rx - lw * 0.6, ry - lw * 0.6), fill: kind === 'black' ? C.ink : C.paper, stroke: 'none' }, grp);
      const pop = kind === 'shout';
      P.fx.push((t) => {
        let op = seg(t, at - 0.12, at); if (until != null) op *= 1 - seg(t, until, until + 0.2);
        const sc = pop ? 1 + (1 - E.backOut(seg(t, at - 0.14, at))) * -0.25 : 1;
        sa(grp, { opacity: op.toFixed(3), transform: sc === 1 ? '' : `translate(${f2(cx * (1 - sc))},${f2(cy * (1 - sc))}) scale(${sc.toFixed(4)})` });
        set(tx, { opacity: op.toFixed(3) });
      });
      F.text(tx, 'label', text.replace(/[|\n]/g, ''), at, until ?? P.until, { noFact: o.noFact });
      if (o.sound !== false) F.sfx(at - 0.1, kind === 'shout' ? 'shout' : 'blip', kind === 'shout' ? 0.45 : 0.14);
      return { grp, el: tx, box: () => ({ x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 }) };
    }

    // ---------- explanation devices drawn the manga way ----------
    // a hand-lettered note with a leader line to the thing it names
    function label(P, text, o = {}) {
      const S = P.S, at = at1(P, o), size = o.size ?? 26, x = P.x0 + (o.x ?? 0.5) * P.w, y = P.y0 + (o.y ?? 0.15) * P.h;
      const tx = node('div', `position:absolute;left:0;top:0;white-space:nowrap;font:900 ${gx(size)}px/1.2 ${FONT.talk};color:${C.ink};background:${C.paper};border:${gx(2.4)}px solid ${C.ink};padding:${gx(size * 0.15)}px ${gx(size * 0.35)}px;opacity:0;${o.vertical ? 'writing-mode:vertical-rl;text-orientation:upright;' : ''}`, S.textLayer, esc(text));
      const tw = tx.offsetWidth / g, th = tx.offsetHeight / g; set(tx, { left: `${gx(x - tw / 2).toFixed(1)}px`, top: `${gx(y - th / 2).toFixed(1)}px` });
      let line = null;
      if (o.to) {
        const tx2 = P.x0 + o.to[0] * P.w, ty2 = P.y0 + o.to[1] * P.h, ang = Math.atan2(ty2 - y, tx2 - x), sx = x + Math.cos(ang) * Math.min(tw / 2, Math.abs((th / 2) / (Math.sin(ang) || 1e-6))), sy = y + Math.sin(ang) * Math.min(th / 2, Math.abs((tw / 2) / (Math.cos(ang) || 1e-6)));
        line = sv('g', { opacity: 0 }, S.overG);
        sv('path', { d: taperD([[sx, sy], [mix(sx, tx2, 0.5) + 6, mix(sy, ty2, 0.5) - 6], [tx2, ty2]], 4.2, 'end'), fill: C.ink }, line);
        sv('circle', { cx: tx2, cy: ty2, r: 5, fill: C.ink }, line);
      }
      P.fx.push((t) => { const op = seg(t, at - 0.15, at) * (o.until != null ? 1 - seg(t, o.until, o.until + 0.2) : 1); set(tx, { opacity: op.toFixed(3) }); if (line) sa(line, { opacity: op.toFixed(3) }); });
      F.text(tx, 'label', text, at, o.until ?? P.until, { noFact: o.noFact });
      F.info('annotate', at, o.until ?? P.until);
      if (o.sound !== false) F.sfx(at - 0.05, 'pen', 0.25, { dur: 0.2 });
      return tx;
    }
    // the battle-manga intro box: a big name, small lines of facts, set beside the character as it enters
    function intro(P, text, o = {}) {
      const S = P.S, at = at1(P, o), size = o.size ?? 54, x = P.x0 + (o.x ?? 0.2) * P.w, y = P.y0 + (o.y ?? 0.2) * P.h, lines = o.lines || [];
      const box = node('div', `position:absolute;left:${gx(x)}px;top:${gx(y)}px;opacity:0;${o.align === 'right' ? 'transform:translateX(-100%);text-align:right;' : ''}`, S.textLayer);
      const nm = node('div', `font:400 ${gx(size)}px/1.05 ${FONT.sfxZh};color:${C.ink};-webkit-text-stroke:${gx(size * 0.05)}px ${C.paper};paint-order:stroke fill;white-space:nowrap`, box, esc(o.name ?? text));
      const items = lines.map((ln) => node('div', `display:inline-block;margin-top:${gx(6)}px;font:700 ${gx(size * 0.42)}px/1.3 ${FONT.talk};color:${C.paper};background:${C.ink};padding:${gx(3)}px ${gx(10)}px;white-space:nowrap`, node('div', '', box), esc(ln)));
      const bar = node('div', `height:${gx(5)}px;background:${C.spot || C.ink};margin:${gx(4)}px 0 ${gx(2)}px;transform-origin:${o.align === 'right' ? '100%' : '0'} 50%`, box);
      box.insertBefore(bar, box.children[1] || null);
      P.fx.push((t) => {
        const q = E.quartOut(seg(t, at - 0.2, at)); let op = seg(t, at - 0.2, at - 0.05); if (o.until != null) op *= 1 - seg(t, o.until, o.until + 0.2);
        set(box, { opacity: op.toFixed(3) }); set(bar, { transform: `scaleX(${q.toFixed(3)})` });
        items.forEach((it, i) => set(it, { opacity: seg(t, at + 0.12 * i, at + 0.12 * i + 0.15).toFixed(3) }));
      });
      F.text(nm, 'headline', o.name ?? text, at - 0.2, o.until ?? P.until);
      items.forEach((it, i) => F.text(it, 'label', lines[i], at + 0.12 * i, o.until ?? P.until));
      F.info('annotate', at, o.until ?? P.until);
      F.sfx(at - 0.15, 'slash', 0.4, { dur: 0.2 });
      return box;
    }
    // a graph inked on the page: hand-ruled axes, the line drawn on (or bars rising), tone under the curve, notes at points
    function chart(P, o = {}) {
      const S = P.S, at = at1(P, o), dur = o.dur ?? 1.4, vals = o.values || [], n = vals.length, lo = o.min ?? 0, hi = o.max ?? Math.max(...vals);
      const m = o.margin ?? [0.14, 0.16, 0.08, 0.2], X0 = m[0] * P.w, X1 = P.w * (1 - m[2]), Y0 = m[1] * P.h, Y1 = P.h * (1 - m[3]);
      const X = (i) => X0 + ((X1 - X0) * i) / Math.max(1, n - 1), Y = (v) => Y1 - ((Y1 - Y0) * (v - lo)) / (hi - lo || 1);
      const g2 = sv('g', { opacity: 0 }, P.artG), lw = Math.max(3, P.h / 160);
      sv('path', { d: taperD([[X0, Y0 - 10], [X0 - 1, (Y0 + Y1) / 2], [X0, Y1]], lw * 1.3, 'none'), fill: C.ink }, g2);
      sv('path', { d: taperD([[X0, Y1], [(X0 + X1) / 2, Y1 + 1], [X1 + 10, Y1]], lw * 1.3, 'none'), fill: C.ink }, g2);
      const pts = vals.map((v, i) => [X(i), Y(v)]);
      let lineEl, areaEl, len = 0;
      if ((o.kind ?? 'line') === 'line') {
        const d = 'M' + pts.map((p) => `${f2(p[0])},${f2(p[1])}`).join('L');
        areaEl = sv('path', { d: d + `L${f2(X(n - 1))},${f2(Y1)}L${f2(X0)},${f2(Y1)}Z`, fill: S.dots(0.28, 6) }, g2);
        lineEl = sv('path', { d, fill: 'none', stroke: C.spot && o.spot ? C.spot : C.ink, 'stroke-width': lw * 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g2);
        len = pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
        sa(lineEl, { 'stroke-dasharray': `${f2(len)} ${f2(len)}` });
      }
      const bars = (o.kind === 'bars') ? pts.map((p, i) => { const bw2 = (X1 - X0) / n * 0.55, r2 = sv('rect', { x: p[0] - bw2 / 2, y: Y1, width: bw2, height: 0, fill: i === o.hi ? C.ink : S.dots(0.3, 6), stroke: C.ink, 'stroke-width': lw }, g2); return { r2, p, bw2 }; }) : [];
      const texts = [];
      (o.labels || []).forEach((lb, i) => { if (lb == null || lb === '') return; const e = node('div', `position:absolute;white-space:nowrap;font:700 ${gx(o.labelSize ?? 22)}px/1 ${FONT.talk};color:${C.ink};opacity:0;transform:translate(-50%,0)`, S.textLayer, esc(lb)); set(e, { left: `${gx(P.x0 + X(i)).toFixed(1)}px`, top: `${gx(P.y0 + Y1 + 10).toFixed(1)}px` }); texts.push({ e, at }); F.text(e, 'label', lb, at - 0.2, o.until ?? P.until); });
      if (o.unit) { const e = node('div', `position:absolute;white-space:nowrap;font:700 ${gx(22)}px/1 ${FONT.talk};color:${C.ink};opacity:0`, S.textLayer, esc(o.unit)); set(e, { left: `${gx(P.x0 + X0 + 10).toFixed(1)}px`, top: `${gx(P.y0 + Y0 - 34).toFixed(1)}px` }); texts.push({ e, at }); F.text(e, 'label', o.unit, at - 0.2, o.until ?? P.until); }
      (o.marks || []).forEach((mk) => { const tA = mk.at ?? at + dur; const lb = label(P, mk.text, { x: X(mk.i) / P.w + (mk.dx ?? 0), y: Y(vals[mk.i]) / P.h - (mk.dy ?? 0.16), to: [X(mk.i) / P.w, Y(vals[mk.i]) / P.h], at: tA, size: mk.size ?? 24, until: o.until, noFact: mk.noFact }); void lb; });
      P.fx.push((t) => {
        let op = seg(t, at - 0.2, at); if (o.until != null) op *= 1 - seg(t, o.until, o.until + 0.25);
        sa(g2, { opacity: op.toFixed(3) });
        const q = E.cubicInOut(seg(t, at, at + dur));
        if (lineEl) { sa(lineEl, { 'stroke-dashoffset': f2(len * (1 - q)) }); sa(areaEl, { opacity: q.toFixed(3) }); }
        for (const b of bars) { const hh = (Y1 - b.p[1]) * q; sa(b.r2, { y: f2(Y1 - hh), height: f2(hh) }); }
        for (const tt of texts) set(tt.e, { opacity: op.toFixed(3) });
      });
      F.sfx(at, 'pen', 0.35, { dur }); F.info('chart', at, o.until ?? P.until);
      return { X: (i) => X(i) / P.w, Y: (v) => Y(v) / P.h };
    }

    // ================= characters: a jointed rig drawn in clean manga line =================
    // Rig units: a standing adult is ~1000 tall, feet at (0, 0), facing +x. spec = { build, hair, hairTone, eyes, brows, outfit, mark, head, scarf, proportions }
    const cast = {};
    R.cast = (list) => {
      Object.assign(cast, list);
      if (window.EV && window.EV.castCheck) window.EV.castCheck(list, (c) => { const o = {}; for (const [k, v] of Object.entries(c)) if (typeof v !== 'function' && typeof v !== 'object') o[k] = v; else if (v && typeof v === 'object') for (const [k2, v2] of Object.entries(v)) if (typeof v2 !== 'function') o[k + '.' + k2] = v2; return o; }, 'manga');
      return R;
    };
    R.castList = cast;
    const POSES = {
      stand: { lean: 0, neck: 0, a: [10, 12], b: [-10, 12], f: [5, 0], r: [-5, 0] },
      walk: { lean: 4, neck: 0, a: [-22, 15], b: [24, 18], f: [24, -6], r: [-20, -24] },
      ready: { lean: 10, neck: -6, a: [72, 95], b: [38, 115], f: [28, -24], r: [-26, -16], dy: 30, fist: true },
      run: { lean: 22, neck: -8, a: [-55, 70], b: [65, 80], f: [55, -70], r: [-45, -75], dy: 20, fist: true },
      dash: { lean: 38, neck: -14, a: [-75, 15], b: [-62, 20], f: [62, -95], r: [-55, -45], dy: 40 },
      punch: { lean: 18, neck: -6, a: [92, 2], b: [-35, 125], f: [38, -18], r: [-32, -6], dy: 20, fist: true },
      block: { lean: 6, neck: 6, a: [45, 135], b: [35, 145], f: [18, -10], r: [-18, -6], dy: 15, fist: true },
      point: { lean: 4, neck: -4, a: [100, 4], b: [-6, 16], f: [8, 0], r: [-8, 0] },
      victory: { lean: -4, neck: -10, a: [152, 22], b: [-14, 22], f: [10, 0], r: [-12, 0], fist: true },
      cheer: { lean: -4, neck: -12, a: [155, 20], b: [-155, -20], f: [12, 0], r: [-12, 0], fist: true },
      crossarms: { lean: -3, neck: 4, a: [28, 132], b: [34, 140], f: [7, 0], r: [-7, 0] },
      sit: { lean: -4, neck: 0, a: [20, 50], b: [15, 55], f: [88, -86], r: [82, -88], dy: 260 },
      slump: { lean: 24, neck: 26, a: [-3, 4], b: [3, 6], f: [4, 0], r: [-4, 0], dy: 10 },
      sleep: { lean: 0, neck: 12, a: [20, 70], b: [10, 80], f: [12, -14], r: [-6, -10], lie: true },
      fall: { lean: -38, neck: 18, a: [150, 40], b: [125, 50], f: [45, -20], r: [-10, -30], dy: 60, rot: -18 },
      shock: { lean: -14, neck: -6, a: [140, 120], b: [-120, -110], f: [10, -4], r: [-14, -4] },
      shove: { lean: 26, neck: -6, a: [85, 30], b: [80, 40], f: [40, -20], r: [-35, -10], dy: 20 },
      drag: { lean: 30, neck: 22, a: [-15, 20], b: [10, 10], f: [22, -10], r: [-25, -25], dy: 15 },
      lift: { lean: -6, neck: -14, a: [170, 8], b: [-170, -8], f: [16, 0], r: [-16, 0] },
    };
    R.poses = POSES;
    const PROP = {
      hero: { head: 168, torso: 285, neck: 32, ua: 166, fa: 156, th: 262, sh: 252, sw: 96, hw: 62, limb: 1 },
      stocky: { head: 162, torso: 285, neck: 22, ua: 156, fa: 146, th: 232, sh: 222, sw: 108, hw: 80, limb: 1.15 },
      chibi: { head: 380, torso: 150, neck: 0, ua: 80, fa: 70, th: 92, sh: 84, sw: 92, hw: 70, limb: 1.6, chibi: true },
    };
    const BUILD = { slim: { w: 0.9, limb: 0.88 }, normal: { w: 1, limb: 1 }, heavy: { w: 1.25, limb: 1.25, belly: 1 } };
    // forward kinematics: angle 0 = straight down, 90 = forward (+x), 180 = up
    const dirv = (a) => [Math.sin(a * D2R), Math.cos(a * D2R)];
    const add = (p, a, len) => { const v = dirv(a); return [p[0] + v[0] * len, p[1] + v[1] * len]; };
    function skeleton(spec, pose) {
      const pr = PROP[spec.proportions ?? 'hero'], bd = BUILD[spec.build ?? 'normal'], k = (pose.dy ?? 0);
      const legLen = pr.th + pr.sh, hipY = -(legLen + 20) + k;
      const hip = [0, hipY], lean = pose.lean ?? 0;
      const chest = [hip[0] + Math.sin(lean * D2R) * pr.torso, hip[1] - Math.cos(lean * D2R) * pr.torso];
      const nk = pose.neck ?? 0, neck = [chest[0] + Math.sin((lean + nk) * D2R) * pr.neck, chest[1] - Math.cos((lean + nk) * D2R) * pr.neck];
      const headC = [neck[0] + Math.sin((lean + nk) * D2R) * pr.head * 0.42, neck[1] - Math.cos((lean + nk) * D2R) * pr.head * 0.42];
      const sw = pr.sw * bd.w, hw = pr.hw * bd.w;
      const shA = [chest[0] + sw * 0.68, chest[1] + 30], shB = [chest[0] - sw * 0.8, chest[1] + 26];
      const arm = (sh, [a1, b1]) => { const el2 = add(sh, a1, pr.ua), hand = add(el2, a1 + b1, pr.fa); return [sh, el2, hand]; };
      const leg = (hp, [a1, b1]) => { const kn = add(hp, a1, pr.th), ft = add(kn, a1 + b1, pr.sh); return [hp, kn, ft]; };
      return { pr, bd, hip, chest, neck, headC, lean, nk, armA: arm(shA, pose.a), armB: arm(shB, pose.b), legF: leg([hip[0] + hw * 0.45, hip[1] + 12], pose.f), legR: leg([hip[0] - hw * 0.5, hip[1] + 12], pose.r) };
    }
    const lerpPose = (p, q, e) => { const o = { ...q }; for (const k of ['lean', 'neck', 'dy', 'rot']) o[k] = mix(p[k] ?? 0, q[k] ?? 0, e); for (const k of ['a', 'b', 'f', 'r']) o[k] = [mix(p[k][0], q[k][0], e), mix(p[k][1], q[k][1], e)]; o.fist = e < 0.5 ? p.fist : q.fist; o.lie = e < 0.5 ? p.lie : q.lie; return o; };

    // ----- the head, in head units (crown y ≈ -60, chin y = +46), facing +x in a three-quarter view: the near side (ear, larger eye) is -x,
    //       the far cheek contour, the nose and the smaller far eye are +x. turn 0 = front … 0.6 = almost profile
    const bez = (p0, p1, p2, p3, n = 10) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, d = t ** 3; out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]); } return out; };
    R.bez = bez;
    const faceGeo = (turn, jaw = 1) => {
      const t = turn, NA = -33 + 3 * t, CH = 8 + 12 * t, FJ = 25 + 6 * t, FC = 36 + 3 * t, FT = 37 + 2 * t;
      const d = `M-38,-10 C-38.5,4 -36.5,${f2(11)} ${f2(NA * jaw)},${f2(19)} C${f2(NA * jaw + 6)},29 ${f2(-12 + 6 * t)},${f2(41)} ${f2(CH)},46 C${f2(CH + 6)},45.5 ${f2(FJ - 5)},38 ${f2(FJ * jaw)},${f2(30)} C${f2(FJ + 5)},22 ${f2(FC)},14 ${f2(FC)},6 C${f2(FC + 1)},-2 ${f2(FT)},-8 ${f2(FT)},-12 C42,-48 14,-64 -6,-62 C-28,-60 -42,-44 -38,-10Z`;
      return { d, near: [-10 + 7 * t, 4], far: [21 + 9 * t, 4], nose: [22 + 10 * t, 19], mouth: [13 + 9 * t, 32], ear: -36, chin: [CH, 46], neckL: [-19 + 3 * t, 34], neckR: [16 + 4 * t, 37] };
    };
    R.faceGeo = faceGeo;
    const EXPR = {   // lids, brows and mouth per expression: open (upper lid), tilt (+ angry, - worried), iris size, highlight
      calm: { open: 1, tilt: 0.2 }, smile: { closedUp: true, tilt: -0.2 }, grin: { open: 0.85, tilt: 0.6 }, smug: { open: 0.6, tilt: 0.5 },
      determined: { open: 0.82, tilt: 1 }, angry: { open: 0.85, tilt: 1.2 }, shout: { open: 1.05, tilt: 1.2 }, grit: { open: 0.8, tilt: 1.1 },
      shock: { open: 1.3, tilt: -0.6, iris: 0.42, noHi: true }, scared: { open: 1.2, tilt: -1, iris: 0.55 }, pain: { open: 0.5, tilt: -0.6 },
      tired: { open: 0.5, tilt: -0.4, bags: true }, sleep: { closed: true, tilt: -0.3 }, closed: { closed: true, tilt: 0 }, sad: { open: 0.75, tilt: -1 },
    };
    R.expressions = EXPR;
    function drawHead(gH, spec, expr, S, o = {}) {
      const turn = o.turn ?? spec.turn ?? 0.35, lw = o.lw ?? 2.4, ink = C.ink, sil = o.silhouette, fg = faceGeo(turn, spec.jaw ?? 1);
      const face = sil ? C.ink : C.paper;
      const hairFill = sil ? C.ink : spec.hairTone === 'white' ? C.paper : spec.hairTone === 'tone' ? S.dots(0.36, 4) : ink;
      if (spec.hairBack) spec.hairBack(gH, { sv, ink, paper: C.paper, fill: hairFill, S, lw });
      // the near ear
      if (!spec.noEars) { sv('path', { d: `M-35,1 C-45,-3 -47,14 -40,21 C-37,24 -34,23 -32,20`, fill: face, stroke: sil ? 'none' : ink, 'stroke-width': lw, 'stroke-linejoin': 'round' }, gH); if (!sil) sv('path', { d: 'M-38,6 C-42,8 -41,14 -37,16', fill: 'none', stroke: ink, 'stroke-width': lw * 0.6, 'stroke-linecap': 'round' }, gH); }
      sv('path', { d: fg.d, fill: face, stroke: sil ? 'none' : ink, 'stroke-width': lw * 1.15, 'stroke-linejoin': 'round' }, gH);
      if (!sil) {
        // shade: a tone band down the near side under the cheekbone and along the jaw (light from the +x side)
        if (o.shade !== false) { const id = uid('hs'), cp = sv('clipPath', { id }, S.defs); sv('path', { d: fg.d }, cp); sv('path', { d: `M-50,-20 C-30,-14 -30,6 -26,18 C-20,30 -6,38 ${f2(fg.chin[0] - 2)},50 L-60,60Z`, fill: S.dots(0.26, 3.6), 'clip-path': `url(#${id})` }, gH); }
        const ex = EXPR[expr] ? expr : 'calm', es = spec.eyes ?? 'sharp';
        drawEye(gH, fg.near[0], fg.near[1], 23 * (1 - turn * 0.1), { style: es, expr: ex, S, lw, mir: -1 });
        drawEye(gH, fg.far[0], fg.far[1], 18 * (1 - turn * 0.45), { style: es, expr: ex, S, lw, mir: 1, far: true });
        const [nx, ny] = fg.nose;
        sv('path', { d: taperD([[nx, ny - 3], [nx + 2, ny + 1], [nx + 3.5, ny + 4]], 2.2, 'start'), fill: ink }, gH);
        drawMouth(gH, fg.mouth[0], fg.mouth[1] - (ex === 'shout' ? 6 : 0), ex, lw, S);
        if (spec.cheek) for (const k of [0, 1, 2]) sv('path', { d: `M${f2(fg.near[0] - 6 + k * 4)},${f2(fg.near[1] + 13)} l-2,4`, stroke: ink, 'stroke-width': lw * 0.5, fill: 'none' }, gH);
      }
      drawHair(gH, spec, hairFill, S, { lw, sil, turn });
      if (!sil) { const ex = EXPR[expr] ? expr : 'calm'; drawBrow(gH, fg.near[0], fg.near[1], 23, ex, spec, -1); drawBrow(gH, fg.far[0], fg.far[1], 17 * (1 - turn * 0.4), ex, spec, 1); }
      if (spec.headgear && !sil) spec.headgear(gH, { sv, ink, paper: C.paper, S, lw, turn });
      if (spec.mark && !sil && o.mark !== false && spec.markOn !== 'chest') spec.mark(gH, { sv, ink, paper: C.paper, S, lw, turn, where: 'head' });
      return fg;
    }
    // an eye of width w centred at (cx, cy): thick upper lid with a lash flick at the outer corner, the iris tucked under the lid (tone, pupil,
    //   two highlights), a short lower lash line. mir = -1: the outer corner is at -x (the near eye of a figure facing +x)
    function drawEye(gE, cx, cy, w, o) {
      const S = o.S, X = EXPR[o.expr] || EXPR.calm, st = o.style ?? 'sharp', lw = o.lw ?? 2.4, m = o.mir ?? 1;
      const P2 = (u, v) => [cx + u * w * m, cy + v * w];
      const tilt = X.tilt ?? 0, sty = st === 'round' ? 1.18 : st === 'sleepy' ? 0.78 : st === 'narrow' ? 0.72 : 0.92, open = (X.open ?? 1) * (st === 'sleepy' ? 0.62 : 1), lowO = st === 'round' ? 1.15 : 1;
      if (X.closed) { sv('path', { d: taperD(bez(P2(-0.5, 0.06), P2(-0.15, 0.24), P2(0.25, 0.24), P2(0.55, 0.02), 10), w * 0.11, 'both'), fill: C.ink }, gE); sv('path', { d: taperD([P2(0.5, 0.04), P2(0.62, -0.02), P2(0.7, -0.08)], w * 0.07, 'end'), fill: C.ink }, gE); return; }
      if (X.closedUp) { sv('path', { d: taperD(bez(P2(-0.5, 0.12), P2(-0.2, -0.2), P2(0.25, -0.22), P2(0.55, 0.08), 10), w * 0.12, 'both'), fill: C.ink }, gE); return; }
      const I = P2(-0.5, 0.05 + 0.09 * tilt), O = P2(0.5, -0.05 - 0.02 * tilt);
      const top = (k) => -0.3 * sty * open * k;
      const U1 = P2(-0.22, top(1) + 0.11 * tilt), U2 = P2(0.24, top(1.12) + 0.02 * tilt);
      const L1 = P2(0.36, 0.25 * sty * lowO), L2 = P2(-0.18, 0.29 * sty * lowO);
      const upper = bez(I, U1, U2, O, 14), lower = bez(O, L1, L2, I, 14);
      const openD = ptsD([...upper, ...lower.slice(1)]);
      sv('path', { d: openD, fill: C.paper }, gE);
      const id = uid('e'), cp = sv('clipPath', { id }, S.defs); sv('path', { d: openD }, cp);
      const ig = sv('g', { 'clip-path': `url(#${id})` }, gE);
      const ir = 0.29 * (X.iris ?? 1) * (st === 'round' ? 1.1 : 1), ic = P2(0.04, 0.04 + (open < 0.7 ? 0.05 : 0));
      if (X.iris && X.iris < 0.5) { sv('ellipse', { cx: ic[0], cy: ic[1], rx: ir * w, ry: ir * w * 1.15, fill: C.paper, stroke: C.ink, 'stroke-width': lw * 0.8 }, ig); sv('circle', { cx: ic[0], cy: ic[1], r: ir * w * 0.45, fill: C.ink }, ig); }
      else {
        sv('ellipse', { cx: ic[0], cy: ic[1], rx: ir * w, ry: ir * w * 1.3, fill: C.ink }, ig);
        sv('ellipse', { cx: ic[0], cy: ic[1] + ir * w * 0.42, rx: ir * w * 0.78, ry: ir * w * 0.72, fill: S.dots(0.5, Math.max(1.2, w * 0.07)) }, ig);
        sv('ellipse', { cx: ic[0], cy: ic[1] + ir * w * 0.08, rx: ir * w * 0.42, ry: ir * w * 0.58, fill: C.ink }, ig);
        if (!X.noHi) { sv('ellipse', { cx: ic[0] - ir * w * 0.42, cy: ic[1] - ir * w * 0.5, rx: ir * w * 0.3, ry: ir * w * 0.38, fill: C.paper }, ig); sv('circle', { cx: ic[0] + ir * w * 0.42, cy: ic[1] + ir * w * 0.62, r: ir * w * 0.13, fill: C.paper }, ig); }
      }
      // the lid's shadow on the eyeball
      sv('path', { d: taperD(upper.map(([x, y]) => [x, y + w * 0.03]), w * 0.12, 'both'), fill: S.dots(0.4, Math.max(1.2, w * 0.07)) }, ig);
      // upper lid: thicker towards the outer corner, ending in the flick
      const lidTop = bez(P2(-0.54, (I[1] - cy) / w - 0.03), P2(-0.2, top(1) + 0.11 * tilt - 0.12), P2(0.26, top(1.12) + 0.02 * tilt - 0.2), P2(0.6, -0.2 - 0.02 * tilt), 14);
      const flick = [P2(0.74, -0.1 - 0.03 * tilt), P2(0.56, -0.04 - 0.02 * tilt)];
      sv('path', { d: ptsD([...lidTop, ...flick, ...upper.slice().reverse()]), fill: C.ink, stroke: C.ink, 'stroke-width': lw * 0.4, 'stroke-linejoin': 'round' }, gE);
      if (st === 'sleepy' || X.bags) sv('path', { d: taperD(bez(P2(-0.3, top(1) - 0.2), P2(-0.05, top(1.1) - 0.3), P2(0.25, top(1.1) - 0.3), P2(0.5, -0.24), 8), w * 0.045, 'both'), fill: C.ink }, gE);
      // lower lash line on the outer half, and bags under tired eyes
      sv('path', { d: taperD(lower.slice(1, 8).map(([x, y]) => [x, y + w * 0.025]), w * 0.05, 'both'), fill: C.ink }, gE);
      if (X.bags) sv('path', { d: taperD(lower.slice(2, 13).map(([x, y]) => [x, y + w * 0.12]), w * 0.035, 'both'), fill: C.ink }, gE);
      if (X.iris && X.iris < 0.6) for (let k = 0; k < 3; k++) sv('path', { d: taperD([P2(-0.55 + k * 0.5, -0.62), P2(-0.5 + k * 0.5, -0.85)], w * 0.04, 'both'), fill: C.ink }, gE);   // shock lines
    }
    function drawBrow(gB, cx, cy, w, ex, spec, m) {
      const X = EXPR[ex] || EXPR.calm, tl = X.tilt ?? 0, th = spec.brows === 'thick' ? 1.5 : spec.brows === 'thin' ? 0.7 : 1;
      const P2 = (u, v) => [cx + u * w * m, cy + v * w];
      const pts = bez(P2(-0.48, -0.66 + 0.24 * Math.max(0, tl) + 0.12 * Math.min(0, tl)), P2(-0.1, -0.86 + 0.16 * Math.max(0, tl) - 0.06 * Math.min(0, tl)), P2(0.3, -0.84 + 0.04 * tl), P2(0.66, -0.62 + 0.04 * tl), 10);
      sv('path', { d: taperD(pts, w * 0.16 * th, 'end'), fill: C.ink, stroke: C.paper, 'stroke-width': w * 0.05, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }, gB);
    }
    function drawMouth(gM, x, y, ex, lw, S) {
      const L = (d, w = lw) => sv('path', { d, fill: 'none', stroke: C.ink, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, gM);
      if (ex === 'shout') { const d = `M${x - 12},${y - 5} C${x - 4},${y - 8} ${x + 8},${y - 8} ${x + 13},${y - 6} C${x + 12},${y + 8} ${x + 6},${y + 17} ${x},${y + 17} C${x - 7},${y + 16} ${x - 12},${y + 6} ${x - 12},${y - 5}Z`; sv('path', { d, fill: C.ink, stroke: C.ink, 'stroke-width': lw, 'stroke-linejoin': 'round' }, gM); sv('path', { d: `M${x - 7},${y + 12} C${x - 2},${y + 7} ${x + 5},${y + 7} ${x + 8},${y + 12} C${x + 4},${y + 16} ${x - 3},${y + 16} ${x - 7},${y + 12}Z`, fill: S.dots(0.35, 2) }, gM); sv('path', { d: `M${x - 10},${y - 4} L${x + 11},${y - 5} L${x + 10},${y - 1} L${x - 9},${y}Z`, fill: C.paper }, gM); }
      else if (ex === 'grin' || ex === 'smug') { sv('path', { d: `M${x - 11},${y - 2} C${x - 3},${y + 1} ${x + 7},${y} ${x + 12},${y - 6} C${x + 10},${y + 5} ${x + 4},${y + 8} ${x - 2},${y + 7} C${x - 7},${y + 6} ${x - 10},${y + 2} ${x - 11},${y - 2}Z`, fill: C.paper, stroke: C.ink, 'stroke-width': lw, 'stroke-linejoin': 'round' }, gM); L(`M${x - 9},${y + 1.5} L${x + 10},${y - 1.5}`, lw * 0.6); }
      else if (ex === 'grit' || ex === 'pain') { sv('path', { d: `M${x - 11},${y - 3} L${x + 11},${y - 4} L${x + 10},${y + 4} L${x - 10},${y + 4}Z`, fill: C.paper, stroke: C.ink, 'stroke-width': lw, 'stroke-linejoin': 'round' }, gM); for (const k of [-5, 0, 5]) L(`M${x + k},${y - 3.5} L${x + k},${y + 4}`, lw * 0.5); L(`M${x - 11},${y + 0.5} L${x + 11},${y}`, lw * 0.5); }
      else if (ex === 'shock' || ex === 'scared') sv('ellipse', { cx: x, cy: y + 3, rx: 4.5, ry: 6.5, fill: C.ink }, gM);
      else if (ex === 'smile') L(`M${x - 9},${y - 2} C${x - 4},${y + 4} ${x + 5},${y + 4} ${x + 10},${y - 3}`);
      else if (ex === 'tired' || ex === 'sleep' || ex === 'sad') L(`M${x - 7},${y + 1} C${x - 4},${y - 2} ${x - 1},${y - 2} ${x + 1},${y} C${x + 3},${y + 2} ${x + 6},${y + 1} ${x + 8},${y - 1}`);
      else if (ex === 'determined' || ex === 'angry') { L(`M${x - 8},${y} L${x + 9},${y - 1}`, lw * 1.15); L(`M${x - 4},${y + 4} L${x + 3},${y + 4}`, lw * 0.5); }
      else { L(`M${x - 6},${y} C${x - 2},${y + 1.2} ${x + 3},${y + 1.2} ${x + 7},${y - 0.5}`); L(`M${x - 2},${y + 4.5} L${x + 3},${y + 4.5}`, lw * 0.45); }
    }
    // hair: one outline per style (spiky clumps swept back, fluffy scallops, short, long, bald) or a function (gH, kit) of your own
    function hairPath(spec, turn) {
      const hs = spec.hair ?? 'short', back = spec.sweep ?? 0.5;
      const cap = (a, r = 1) => [Math.cos(a * D2R) * 47 * r - 2, -15 + Math.sin(a * D2R) * 50 * r];
      if (hs === 'spiky') {
        const n = spec.spikes ?? 7, tall = spec.tall ?? [], pts = [[-42, 22]];
        // spikes from the near side (behind the ear, angle 165°) over the top to the front (-15°), each swept back towards -x
        for (let i = 0; i < n; i++) {
          const a0 = 168 + (i / n) * (360 - 168 - 12 - (360 - 168 - 12) * 0), a1 = 168 + ((i + 1) / n) * (180), am = (a0 + a1) / 2;
          const len = tall.includes(i) ? 1.95 : 1.45 + ((i * 37) % 5) * 0.06, tip = [Math.cos((am - 18 * back) * D2R) * 47 * len - 2 - back * 10, -15 + Math.sin((am - 18 * back) * D2R) * 50 * len];
          const b0 = cap(a0), b1 = cap(a1), mid = cap(am, 1.15);
          pts.push(...bez(b0, [mix(b0[0], tip[0], 0.45), mix(b0[1], tip[1], 0.45) + 3], [mix(b0[0], tip[0], 0.8), mix(b0[1], tip[1], 0.8)], tip, 4).slice(1));
          pts.push(...bez(tip, [mix(tip[0], b1[0], 0.3), mix(tip[1], b1[1], 0.3)], [mix(mid[0], b1[0], 0.5), mix(mid[1], b1[1], 0.5)], b1, 4).slice(1));
        }
        // bangs across the forehead (front to back): tips hang down over the brow line
        const bangs = spec.bangs ?? [[40, -6], [31, -28], [27, -9], [15, -30], [6, -12], [-5, -30], [-14, -13], [-24, -30], [-35, -6]];
        pts.push(...bangs);
        return ptsD(pts);
      }
      if (hs === 'fluffy') {
        const pts = [], n = 10;
        for (let i = 0; i < n; i++) { const a0 = 165 + (i / n) * 210, a1 = 165 + ((i + 1) / n) * 210, b0 = cap(a0, 1.08), b1 = cap(a1, 1.08), mo = cap((a0 + a1) / 2, 1.38); pts.push(...bez(b0, [mix(b0[0], mo[0], 0.8) - 2, mix(b0[1], mo[1], 0.8)], [mix(b1[0], mo[0], 0.8) + 2, mix(b1[1], mo[1], 0.8)], b1, 5).slice(i ? 1 : 0)); }
        const bang = [[42, -8], [32, -20], [24, -6], [12, -20], [2, -4], [-10, -20], [-20, -6], [-30, -18], [-40, 0]];
        for (let i = 0; i < bang.length - 1; i += 2) { const p = bang[i], q = bang[i + 2] || bang[i + 1], c = bang[i + 1]; pts.push(...bez(p, [p[0], p[1] + 8], [c[0] + 4, c[1] + 10], [c[0], c[1]], 3).slice(1)); if (bang[i + 2]) pts.push(...bez(c, [c[0] - 4, c[1] + 10], [q[0], q[1] + 8], q, 3).slice(1)); }
        pts.push([-44, 16]);
        return ptsD(pts);
      }
      if (hs === 'long') return `M-46,52 C-56,-10 -40,-66 -2,-66 C34,-66 54,-36 48,40 L40,14 C40,0 38,-8 36,-14 L30,-4 L22,-24 L12,-2 L2,-26 L-10,-4 L-20,-24 L-28,-6 L-36,-20 C-40,0 -40,24 -38,40Z`;
      if (hs === 'bald' || hs === 'none') return '';
      return `M-42,4 C-50,-44 -22,-66 0,-64 C30,-62 50,-44 44,-4 C42,-12 40,-16 37,-20 L33,-6 L24,-24 L18,-6 L8,-26 L0,-8 L-10,-26 L-16,-8 L-26,-24 L-30,-4 L-36,-18 C-38,-10 -40,-4 -42,4Z`;
    }
    function drawHair(gH, spec, fill, S, o) {
      const hs = spec.hair ?? 'short', lw = o.lw, stroke = o.sil ? 'none' : C.ink;
      if (typeof hs === 'function') return hs(gH, { sv, ink: C.ink, paper: C.paper, fill, S, lw, turn: o.turn, taperD, bez });
      const d = hairPath(spec, o.turn); if (!d) return;
      sv('path', { d, fill, stroke, 'stroke-width': lw * 1.1, 'stroke-linejoin': 'round' }, gH);
      if (o.sil) return;
      // clump separations and the shine: thin strokes following the flow (white on black hair, black on light hair)
      const col = fill === C.ink ? C.paper : C.ink, r = rnd(String(hs).length * 13 + (spec.spikes ?? 7));
      for (let k = 0; k < 6; k++) { const a = 200 + k * 26, x0 = Math.cos(a * D2R) * 30, y0 = -15 + Math.sin(a * D2R) * 34; sv('path', { d: taperD(bez([x0, y0], [x0 * 1.1 - 4, y0 * 1.1 - 4], [x0 * 1.25 - 8, y0 * 1.3 - 6], [x0 * 1.35 - 12 - r() * 6, y0 * 1.45 - 10], 6), lw * (fill === C.ink ? 1.4 : 0.9), 'both'), fill: col, opacity: fill === C.ink ? 0.9 : 1 }, gH); }
      if (fill === C.ink) sv('path', { d: taperD(bez([-30, -38], [-14, -50], [10, -52], [30, -40], 10), lw * 2.2, 'both'), fill: C.paper, opacity: 0.85 }, gH);
    }
    // the body: tapered limb shapes (rear arm and leg behind, front ones over the torso), a torso with shoulders and waist, a long coat
    //   (sleeves, open front, a skirt flaring back in the wind), scarf, shoes, then the head. Rig units: standing height ≈ 1000, feet at y = 0
    const smoothD = (pts, k = 0.2) => {   // a closed Catmull-Rom curve through the points
      const n = pts.length; let d = `M${f2(pts[0][0])},${f2(pts[0][1])}`;
      for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]; d += `C${f2(p1[0] + (p2[0] - p0[0]) * k)},${f2(p1[1] + (p2[1] - p0[1]) * k)} ${f2(p2[0] - (p3[0] - p1[0]) * k)},${f2(p2[1] - (p3[1] - p1[1]) * k)} ${f2(p2[0])},${f2(p2[1])}`; }
      return d + 'Z';
    };
    R.smoothD = smoothD;
    const capsule = (p0, r0, p1, r1, n = 7) => {
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1, th = Math.atan2(dy, dx), al = Math.asin(cl((r0 - r1) / L, -0.9, 0.9)), h = Math.PI / 2 + al, pts = [];
      for (let i = 0; i <= n; i++) { const a = th + h - (2 * h * i) / n; pts.push([p1[0] + Math.cos(a) * r1, p1[1] + Math.sin(a) * r1]); }
      for (let i = 0; i <= n; i++) { const a = th - h - ((2 * Math.PI - 2 * h) * i) / n; pts.push([p0[0] + Math.cos(a) * r0, p0[1] + Math.sin(a) * r0]); }
      return ptsD(pts);
    };
    R.capsule = capsule;
    function drawFigure(g0, spec, pose, expr, S, o = {}) {
      const sk = skeleton(spec, pose), pr = sk.pr, bd = sk.bd, sil = o.silhouette, lw = o.lw ?? 5, ink = C.ink;
      const fillOf = (v, dflt) => (sil ? ink : v === 'black' ? ink : v === 'tone' ? S.dots(0.3, 5) : v === 'white' ? C.paper : dflt);
      const top = fillOf(spec.outfit?.top, C.paper), bottom = fillOf(spec.outfit?.bottom, ink), coatC = spec.outfit?.coat ? fillOf(spec.outfit.coat, C.paper) : null, skin = sil ? ink : C.paper;
      const sleeve = coatC ?? top, L = pr.limb * bd.limb, ext = coatC ? 7 : 0;
      const shape = (d, fill, tone = true) => (sil ? sv('path', { d, fill: ink, stroke: ink, 'stroke-width': lw }, g0) : shaded(S, g0, d, { fill, tone: tone && fill === C.paper ? S.dots(0.3, 5) : false, lw, light: [0.5, -0.35], shade: 9 }));
      const limb = (j, r, fills) => { shape(capsule(j[0], r[0], j[1], r[1]), fills[0]); shape(capsule(j[1], r[1] * 1.02, j[2], r[2]), fills[1]); };
      const hand = (p, prev, fist) => {
        const a = Math.atan2(p[1] - prev[1], p[0] - prev[0]), r = 23 * L, c = [p[0] + Math.cos(a) * r * 0.6, p[1] + Math.sin(a) * r * 0.6];
        const d = fist ? smoothD([[-1, -0.8], [0.6, -0.95], [1.15, -0.4], [1.1, 0.5], [0.4, 0.95], [-0.9, 0.8]].map(([u, v]) => [c[0] + (u * Math.cos(a) - v * Math.sin(a)) * r, c[1] + (u * Math.sin(a) + v * Math.cos(a)) * r]))
          : smoothD([[-0.9, -0.7], [0.9, -0.6], [1.5, -0.1], [1.2, 0.5], [-0.8, 0.75]].map(([u, v]) => [c[0] + (u * Math.cos(a) - v * Math.sin(a)) * r, c[1] + (u * Math.sin(a) + v * Math.cos(a)) * r]));
        shape(d, skin, false);
        if (fist && !sil) { const q0 = [c[0] + Math.cos(a) * r * 0.5 - Math.sin(a) * r * -0.7, c[1] + Math.sin(a) * r * 0.5 + Math.cos(a) * r * -0.7], q1 = [c[0] + Math.cos(a) * r * 0.5 - Math.sin(a) * r * 0.55, c[1] + Math.sin(a) * r * 0.5 + Math.cos(a) * r * 0.55]; sv('path', { d: `M${f2(q0[0])},${f2(q0[1])} Q${f2(c[0] + Math.cos(a) * r * 0.25)},${f2(c[1] + Math.sin(a) * r * 0.25)} ${f2(q1[0])},${f2(q1[1])}`, fill: 'none', stroke: ink, 'stroke-width': lw * 0.6, 'stroke-linecap': 'round' }, g0); }
      };
      const foot = (kn, ft) => { const toe = [ft[0] + 62, ft[1] + 6], d = smoothD([[ft[0] - 26, ft[1] - 20], [ft[0] + 16, ft[1] - 24], [toe[0], toe[1] - 10], [toe[0] + 4, toe[1] + 4], [ft[0] - 28, ft[1] + 12]]); shape(d, fillOf(spec.outfit?.shoes, ink), false); };
      const cuff = (j, r) => { if (!coatC || sil) return; const a = Math.atan2(j[2][1] - j[1][1], j[2][0] - j[1][0]), p = [mix(j[1][0], j[2][0], 0.82), mix(j[1][1], j[2][1], 0.82)], nx = -Math.sin(a) * r, ny = Math.cos(a) * r; sv('path', { d: `M${f2(p[0] + nx)},${f2(p[1] + ny)} L${f2(p[0] - nx)},${f2(p[1] - ny)}`, stroke: ink, 'stroke-width': lw * 0.8 }, g0); };
      const lean = sk.lean, ca = Math.cos(lean * D2R), sn = Math.sin(lean * D2R), T = pr.torso, sw = pr.sw * bd.w, hw = pr.hw * bd.w, belly = bd.belly ? 1 : 0;
      const at2 = (u, v) => [sk.hip[0] + u * ca - v * sn, sk.hip[1] + u * sn + v * ca];
      const tw = (o.t ?? 0) * 5, wind = o.wind ?? 1;
      // scarf tails and the coat's skirt fly behind everything
      if (spec.scarf && !o.noScarf) { const base = at2(-sw * 0.2, -T - 4), pts = [base]; for (let k = 1; k <= 6; k++) pts.push([base[0] - k * 62 * wind, base[1] + k * 16 + Math.sin(tw * 1.3 + k * 0.9) * 14 * k * 0.35]); const sf = sil ? ink : spec.scarf === 'black' ? ink : spec.scarf === 'spot' && C.spot ? C.spot : C.paper; sv('path', { d: taperD(pts, 64, 'end'), fill: sf, stroke: ink, 'stroke-width': lw, 'stroke-linejoin': 'round' }, g0); }
      let coatFront = null;
      if (coatC && !pr.chibi) {   // the coat's skirt: a back tail flaring out in the wind and a front panel, both ending in points
        const fl = (1 + Math.max(0, lean) / 30) * wind, wv = (k) => Math.sin(tw + k) * 10;
        const back = [at2(-hw * 0.2, -T * 0.38), at2(-hw * 1.1, -10), at2(-hw * 1.3 - 40 * fl, 120 + wv(1)), at2(-hw * 1.2 - 110 * fl, 250 + wv(2)), at2(-hw * 0.6 - 60 * fl, 232 + wv(2.5)), at2(-hw * 0.2 - 20 * fl, 250 + wv(3)), at2(hw * 0.2, 160), at2(hw * 0.3, -T * 0.3)];
        shape(ptsD(back), coatC);
        const front = [at2(hw * 0.2, -T * 0.36), at2(hw * 1.08, -14), at2(hw * 1.15, 120 + wv(0.5)), at2(hw * 0.9 + 10 * fl, 248 + wv(1.5)), at2(hw * 0.35, 200), at2(hw * 0.2, 40)];
        coatFront = front;
      }
      // rear leg and arm
      limb(sk.legR, [42 * L, 32 * L, 24 * L], [bottom, bottom]); foot(sk.legR[1], sk.legR[2]);
      limb(sk.armB, [(31 + ext) * L, (25 + ext) * L, (19 + ext * 0.6) * L], [sleeve, sleeve]); cuff(sk.armB, 22 * L); hand(sk.armB[2], sk.armB[1], pose.fist);
      // torso
      const torso = smoothD([at2(-24, -T - 10), at2(26, -T - 10), at2(sw * 0.8, -T + 2), at2(sw * 0.86, -T + 40), at2(sw * 0.62 + belly * 30, -T + 110), at2(sw * 0.52 + belly * 48, -T * 0.42), at2(hw * 1.04 + belly * 30, -8), at2(hw * 0.8, 36), at2(-hw * 0.9, 36), at2(-hw * 1.06 - belly * 20, -8), at2(-sw * 0.58 - belly * 30, -T * 0.42), at2(-sw * 0.7, -T + 110), at2(-sw * 0.96, -T + 40), at2(-sw * 0.88, -T + 4)], 0.16);
      shape(torso, coatC ?? top);
      if (!sil) {
        if (coatC) { shape(smoothD([at2(-6, -T - 8), at2(24, -T - 8), at2(30, -T * 0.55), at2(16, -T * 0.08), at2(2, -T * 0.08), at2(-12, -T * 0.55)], 0.1), top, false); sv('path', { d: `M${at2(-8, -T - 8).map(f2)} L${at2(-34, -T * 0.5).map(f2)} L${at2(-10, 30).map(f2)} M${at2(26, -T - 8).map(f2)} L${at2(46, -T * 0.5).map(f2)} L${at2(30, 30).map(f2)}`, fill: 'none', stroke: ink, 'stroke-width': lw * 0.7, 'stroke-linejoin': 'round' }, g0); }
        else if (spec.outfit?.collar) sv('path', { d: `M${at2(-20, -T - 6).map(f2)} L${at2(2, -T + 50).map(f2)} L${at2(24, -T - 6).map(f2)}`, fill: 'none', stroke: ink, 'stroke-width': lw * 0.8 }, g0);
        if (spec.outfit?.belt) sv('path', { d: taperD([at2(-hw * 1.05, -10), at2(0, -6), at2(hw * 1.05, -10)], 18, 'none'), fill: ink }, g0);
        sv('path', { d: `M${at2(-hw * 0.2, 30).map(f2)} q${f2(-6 * sn)},${f2(-14 * ca)} ${f2(-4 * sn - 14 * ca)},${f2(-20 * ca + 14 * sn)}`, fill: 'none', stroke: ink, 'stroke-width': lw * 0.5 }, g0);
        if (spec.mark && spec.markOn !== 'head') { const mc = at2(-sw * 0.3, -T * 0.62); spec.mark(sv('g', { transform: `translate(${f2(mc[0])},${f2(mc[1])}) rotate(${f2(lean)}) scale(.9)` }, g0), { sv, ink, paper: C.paper, S, lw, where: 'chest' }); }
      }
      // front leg, neck and head, front arm last (it crosses the body)
      limb(sk.legF, [44 * L, 33 * L, 24 * L], [bottom, bottom]); foot(sk.legF[1], sk.legF[2]);
      if (coatFront) shape(ptsD(coatFront), coatC);
      if (!sil) for (const lg of [sk.legF]) { const k2 = lg[1]; sv('path', { d: `M${f2(k2[0] - 12)},${f2(k2[1] - 18)} q10,8 22,4`, fill: 'none', stroke: ink, 'stroke-width': lw * 0.6, 'stroke-linecap': 'round' }, g0); }
      const hn = sk.headC, hk = pr.head / 100;
      shape(ptsD([at2(-20, -T - 2), [hn[0] - 18 * hk, hn[1] + 30 * hk], [hn[0] + 18 * hk, hn[1] + 34 * hk], at2(22, -T - 2)]), skin, false);
      if (spec.scarf && !o.noScarf) { const sf = sil ? ink : spec.scarf === 'black' ? ink : spec.scarf === 'spot' && C.spot ? C.spot : C.paper; const c1 = at2(-34, -T - 2), c2 = at2(36, -T - 2); sv('path', { d: smoothD([c1, [mix(c1[0], c2[0], 0.5), mix(c1[1], c2[1], 0.5) - 26 * ca], c2, [c2[0] + 6, c2[1] + 30], [mix(c1[0], c2[0], 0.5), mix(c1[1], c2[1], 0.5) + 30], [c1[0] - 6, c1[1] + 26]], 0.18), fill: sf, stroke: ink, 'stroke-width': lw, 'stroke-linejoin': 'round' }, g0); }
      const hg = sv('g', { transform: `translate(${f2(hn[0])},${f2(hn[1] - 6 * hk)}) rotate(${f2(lean * 0.35 + (pose.neck ?? 0) * 0.8)}) scale(${f2(hk)})` }, g0);
      drawHead(hg, spec, expr, S, { lw: Math.max(2.2, (lw * 0.62) / hk), silhouette: sil, turn: o.turn });
      limb(sk.armA, [(32 + ext) * L, (26 + ext) * L, (20 + ext * 0.6) * L], [sleeve, sleeve]); cuff(sk.armA, 23 * L); hand(sk.armA[2], sk.armA[1], pose.fist);
      return sk;
    }
    R.drawFigure = drawFigure; R.drawHead = drawHead; R.drawEye = drawEye;

    // shoulders and chest under a head (head units): neck, collar / coat lapels, scarf, the chest mark
    function bustBody(hg, spec, S, expr, turn) {
      const bw = BUILD[spec.build ?? 'normal'].w, W2 = 74 * bw, ink = C.ink, fg = faceGeo(turn);
      const top = spec.outfit?.top === 'black' ? ink : spec.outfit?.top === 'tone' ? S.dots(0.3, 3) : C.paper, coat = spec.outfit?.coat;
      sv('path', { d: `M${f2(fg.neckL[0])},${f2(fg.neckL[1])} C${f2(fg.neckL[0] - 1)},52 ${f2(fg.neckL[0] - 2)},64 ${f2(fg.neckL[0] - 3)},76 L${f2(fg.neckR[0] + 1)},78 C${f2(fg.neckR[0])},64 ${f2(fg.neckR[0])},52 ${f2(fg.neckR[0])},${f2(fg.neckR[1])}Z`, fill: C.paper, stroke: ink, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, hg);
      sv('path', { d: `M${f2(fg.neckL[0] - 1)},46 C${f2(fg.neckL[0] + 10)},56 ${f2(fg.neckR[0] - 8)},58 ${f2(fg.neckR[0])},50 L${f2(fg.neckR[0])},60 C${f2(fg.neckR[0] - 10)},66 ${f2(fg.neckL[0] + 8)},64 ${f2(fg.neckL[0] - 2)},58Z`, fill: S.dots(0.3, 3) }, hg);
      const body = `M${f2(fg.neckL[0] - 3)},72 C${f2(-W2 * 0.55)},78 ${f2(-W2 * 0.95)},84 ${f2(-W2 * 1.06)},100 C${f2(-W2 * 1.2)},118 ${f2(-W2 * 1.25)},150 ${f2(-W2 * 1.3)},190 L${f2(W2 * 1.3)},190 C${f2(W2 * 1.25)},150 ${f2(W2 * 1.18)},118 ${f2(W2 * 1.02)},102 C${f2(W2 * 0.9)},86 ${f2(W2 * 0.5)},80 ${f2(fg.neckR[0] + 1)},74Z`;
      shaded(S, hg, body, { fill: coat ? (coat === 'black' ? ink : coat === 'tone' ? S.dots(0.3, 3) : C.paper) : top, tone: (coat || top) === C.paper || coat === 'white' ? S.dots(0.28, 3) : false, lw: 2.4, light: [0.5, -0.1], shade: 6 });
      if (coat) { sv('path', { d: `M${f2(fg.neckL[0] - 6)},74 L${f2(-6)},128 L${f2(-W2 * 0.55)},190 M${f2(fg.neckR[0] + 4)},76 L${f2(8)},126 L${f2(W2 * 0.5)},190`, fill: 'none', stroke: ink, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, hg); sv('path', { d: `M${f2(fg.neckL[0] - 4)},76 L-5,126 L8,126 L${f2(fg.neckR[0] + 2)},78Z`, fill: top, stroke: ink, 'stroke-width': 1.8 }, hg); }
      else if (spec.outfit?.collar) sv('path', { d: `M${f2(fg.neckL[0] - 4)},74 L0,104 L${f2(fg.neckR[0] + 3)},76`, fill: 'none', stroke: ink, 'stroke-width': 2, 'stroke-linejoin': 'round' }, hg);
      if (spec.scarf) { const sf = spec.scarf === 'black' ? ink : spec.scarf === 'spot' && C.spot ? C.spot : C.paper; sv('path', { d: `M${f2(fg.neckL[0] - 10)},62 C${f2(fg.neckL[0])},78 ${f2(fg.neckR[0])},80 ${f2(fg.neckR[0] + 10)},64 L${f2(fg.neckR[0] + 14)},80 C${f2(fg.neckR[0] + 2)},96 ${f2(fg.neckL[0] - 2)},96 ${f2(fg.neckL[0] - 14)},80Z M${f2(fg.neckL[0] - 8)},86 C-40,100 -60,110 -84,104 L-80,120 C-56,126 -34,114 ${f2(fg.neckL[0] - 4)},96Z`, fill: sf, stroke: ink, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, hg); }
      if (spec.mark && spec.markOn !== 'head') { const mg = sv('g', { transform: 'translate(-34,140) scale(.45)' }, hg); spec.mark(mg, { sv, ink, paper: C.paper, S, lw: 4, where: 'chest' }); }
      if (spec.extra) spec.extra(hg, { sv, ink, paper: C.paper, S, where: 'bust' });
    }
    // a white rim around a silhouette (dilate the shape, flood it white, the black shape on top)
    const rimFilter = (S) => {
      if (S.rimId) return S.rimId;
      const id = (S.rimId = uid('rim')), f = sv('filter', { id, x: '-20%', y: '-20%', width: '140%', height: '140%' }, S.defs);
      sv('feMorphology', { operator: 'dilate', radius: 9, in: 'SourceAlpha', result: 'd' }, f); sv('feFlood', { 'flood-color': C.paper, result: 'w' }, f); sv('feComposite', { in: 'w', in2: 'd', operator: 'in', result: 'rim' }, f);
      const mg = sv('feMerge', {}, f); sv('feMergeNode', { in: 'rim' }, mg); sv('feMergeNode', { in: 'SourceGraphic' }, mg);
      return id;
    };
    // place a character in a panel; shot decides the framing, the rig does the rest
    function placeChar(P, who, o = {}) {
      const S = P.S, spec = typeof who === 'string' ? cast[who] : who;
      if (!spec) throw new Error(M(`角色表里没有"${who}"：先 R.cast({ ${who}: { … } })`, `"${who}" is not in the cast: first R.cast({ ${who}: { … } })`));
      const shot = o.shot ?? 'full', at = at1(P, o), until = o.until ?? null;
      let facing = o.facing ?? 1;
      if (o.faceTo) facing = (o.faceTo.x0 ?? 0) > (o.x ?? 0.5) ? 1 : -1;
      const layer = sv('g', { opacity: 0 }, o.breakout ? P.outG : P.artG), inner = sv('g', {}, layer);
      if (shot === 'silhouette' || o.rim) inner.setAttribute('filter', '');
      const state = { x: o.x ?? 0.5, y: o.y ?? 0.95, pose: typeof o.pose === 'object' ? { ...POSES.stand, ...o.pose } : POSES[o.pose ?? 'stand'], expr: o.face ?? 'calm', keysP: [], keysF: [], keysM: [], hits: [], shakes: [] };
      const sizeU = (o.size ?? 0.85) * P.h;
      const C2 = { P, who, spec, x0: state.x, facing };
      // redraw only when the pose / expression changes (poses blend over dur; the rig is re-inked per frame while blending)
      let lastKey = '';
      const render = (pose, expr, t) => {
        const key = JSON.stringify([pose, expr, shot, spec.scarf || spec.outfit?.coat ? Math.floor(t * 8) : 0]);
        if (key === lastKey) return; lastKey = key;
        while (inner.firstChild) inner.removeChild(inner.firstChild);
        const sil = shot === 'silhouette';
        if (shot === 'full' || shot === 'silhouette' || shot === 'chibi') {
          const sp = shot === 'chibi' ? { ...spec, proportions: 'chibi' } : spec, hgt = shot === 'chibi' ? 640 : 1000, k = sizeU / hgt;
          const fg = sv('g', { transform: `scale(${f2(k * facing)},${f2(k)})${pose.lie ? ' rotate(-90) translate(-260,-120)' : ''}${pose.rot ? ` rotate(${f2(pose.rot)})` : ''}` }, inner);
          drawFigure(fg, sp, pose, expr, S, { silhouette: sil, t, lw: shot === 'chibi' ? 7 : 5.5, turn: o.turn });
          if (sil && o.rim !== false) sa(fg, { filter: `url(#${rimFilter(S)})` });
        } else if (shot === 'bust' || shot === 'face') {
          // head (and shoulders for bust): size = the head's height as a fraction of the panel height; x / y = where the face centre sits
          const k = sizeU / 100, hg = sv('g', { transform: `scale(${f2(k * facing)},${f2(k)})` }, inner);
          if (shot === 'bust') bustBody(hg, spec, S, expr, o.turn ?? spec.turn ?? 0.35);
          drawHead(sv('g', {}, hg), spec, expr, S, { lw: 2.4, turn: o.turn });
        } else if (shot === 'eyes') {
          // the extreme close-up: the same head, scaled so the eyes span the panel; the panel's frame crops it to the eye band
          const k = (P.w * (o.zoom ?? 1)) / 60, turn = o.turn ?? spec.turn ?? 0.3, fgx = faceGeo(turn), cx = (fgx.near[0] + fgx.far[0]) / 2;
          const hg = sv('g', { transform: `scale(${f2(k * facing)},${f2(k)}) translate(${f2(-cx)},${f2(-fgx.near[1] + 2)})` }, inner);
          drawHead(sv('g', {}, hg), spec, expr, S, { lw: 1.5, turn, shade: true });
        }
      };
      // pose / expression timeline
      const poseAt = (t) => { let p = state.pose, from = null, q = 1; for (const k of state.keysP) if (t >= k.t - k.dur) { from = p; p = POSES[k.pose] || k.pose; q = k.dur ? E.cubicInOut(seg(t, k.t - k.dur, k.t)) : 1; if (t >= k.t) { from = null; q = 1; } } return from && q < 1 ? lerpPose(from, p, q) : p; };
      const exprAt = (t) => { let e = state.expr; for (const k of state.keysF) if (t >= k.t) e = k.expr; return e; };
      const posAt = (t) => { let x = state.x, y = state.y; for (const k of state.keysM) { const q = E.cubicInOut(seg(t, k.t - k.dur, k.t)); x = mix(x, k.x ?? x, q); y = mix(y, k.y ?? y, q); } return [x, y]; };
      P.fx.push((t) => {
        let op = seg(t, at - (o.fade ?? 0.18), at); if (until != null) op *= 1 - seg(t, until, until + 0.25);
        sa(layer, { opacity: op.toFixed(3) });
        if (op <= 0) return;
        render(poseAt(t), exprAt(t), t);
        let [x, y] = posAt(t); let dx = 0, dy = 0;
        for (const h of state.hits) if (t >= h.t && t < h.t + 0.35) { const q = (t - h.t) / 0.35; dx += -facing * Math.sin(q * Math.PI) * sizeU * 0.06; }
        for (const s2 of state.shakes) if (t >= s2.t && t < s2.t + s2.dur) { const ph = Math.floor(t * 20); dx += Math.sin(ph * 2.7) * sizeU * 0.008; dy += Math.cos(ph * 3.3) * sizeU * 0.006; }
        const enterQ = o.enter === 'slide' ? E.quartOut(seg(t, at - 0.35, at)) : 1;
        dx += (1 - enterQ) * -facing * P.w * 0.3;
        sa(inner, { transform: `translate(${f2(x * P.w + dx)},${f2(y * P.h + dy)})` });
      });
      Object.assign(C2, {
        pose: (t, pose, dur = 0.25) => { state.keysP.push({ t, pose, dur }); state.keysP.sort((a, b) => a.t - b.t); return C2; },
        face: (t, expr) => { state.keysF.push({ t, expr }); state.keysF.sort((a, b) => a.t - b.t); return C2; },
        move: (t, to, dur = 0.5) => { state.keysM.push({ t, x: to.x, y: to.y, dur }); state.keysM.sort((a, b) => a.t - b.t); return C2; },
        hit: (t) => { state.hits.push({ t }); return C2; },
        shake: (t, dur = 0.5) => { state.shakes.push({ t, dur }); return C2; },
        headAt: () => { const [x, y] = [state.x, state.y]; const k = shot === 'full' || shot === 'silhouette' ? 0.88 : shot === 'chibi' ? 0.72 : 0.6; return shot === 'bust' || shot === 'face' ? [P.x0 + x * P.w, P.y0 + y * P.h] : [P.x0 + x * P.w + facing * sizeU * 0.05, P.y0 + y * P.h - sizeU * k]; },
        layer,
      });
      F.info('figure', at, until ?? P.until);
      return C2;
    }
    // a fist punching at the viewer: knuckles towards us, the arm shrinking back into the distance
    function placeFist(P, o = {}) {
      const at = at1(P, o), s = (o.size ?? 0.7) * P.h, x = (o.x ?? 0.5) * P.w, y = (o.y ?? 0.55) * P.h, dir = o.dir ?? -30;
      const g2 = sv('g', { opacity: 0 }, o.breakout ? P.outG : P.artG), gi = sv('g', {}, g2), S = P.S, lw = s * 0.012;
      const k = s / 200; const tf = `translate(${f2(x)},${f2(y)}) scale(${f2(k)})`; gi._tf = tf;
      const arm = sv('g', { transform: `rotate(${dir + 180})` }, gi);
      shaded(S, arm, 'M-58,30 L-30,230 L30,230 L58,30Z', { fill: o.sleeve === 'black' ? C.ink : C.paper, tone: S.dots(0.3, 3), lw: lw / k * 1.1, light: [0.6, 0], shade: 6 });
      sv('path', { d: 'M-34,226 L34,226 L40,250 L-40,250Z', fill: C.ink }, arm);
      // the fist: four knuckles across the top, folded fingers, the thumb across the front
      const fd = 'M-72,-48 C-74,-78 -50,-86 -36,-74 C-30,-92 -6,-94 2,-78 C10,-94 34,-92 38,-74 C52,-86 76,-76 72,-48 C76,-10 70,40 46,56 C20,70 -28,70 -52,54 C-74,36 -76,-12 -72,-48Z';
      shaded(S, gi, fd, { tone: S.dots(0.32, 3), lw: lw / k * 1.2, light: [-0.4, -0.5], shade: 8 });
      for (const xx of [-36, 2, 38]) sv('path', { d: `M${xx},-72 C${xx - 2},-50 ${xx + 2},-30 ${xx},-8`, fill: 'none', stroke: C.ink, 'stroke-width': lw / k * 0.9, 'stroke-linecap': 'round' }, gi);
      sv('path', { d: 'M-70,-6 C-40,-14 10,-14 34,0 C48,8 46,24 30,26 C0,30 -40,26 -64,18', fill: C.paper, stroke: C.ink, 'stroke-width': lw / k * 1.1, 'stroke-linejoin': 'round' }, gi);
      sv('path', { d: 'M18,8 C24,10 28,16 24,20', fill: 'none', stroke: C.ink, 'stroke-width': lw / k * 0.8 }, gi);
      if (o.mark) { const mg = sv('g', { transform: 'translate(-10,-40) scale(.32)' }, gi); o.mark(mg, { sv, ink: C.ink, paper: C.paper, S }); }
      P.fx.push((t) => { const q = E.expoOut(seg(t, at - 0.14, at)); let op = q > 0 ? 1 : 0; if (o.until != null) op *= 1 - seg(t, o.until, o.until + 0.2); sa(g2, { opacity: op }); sa(gi, { transform: `${tf} scale(${(0.35 + 0.65 * q).toFixed(4)})` }); });
      F.blur(at - 0.14, at, 8); F.appear(at - 0.14); F.appear(at - 0.07); F.info('figure', at, o.until ?? P.until);
      if (o.sound !== false) F.sfx(at - 0.06, 'punch', 0.7);
      return g2;
    }

    // ---------- whole pages: the splash, the last page ----------
    R.splash = (a, b, o = {}) => {
      const pg = R.page(a, b, { w: FW, ...o, in: o.in ?? 'slash' });
      const P = pg.panel([0, 0, 1, 1], { bleed: true, border: 'none', at: a + (o.delay ?? 0.05), enter: o.enter ?? 'cut', bg: o.bg ?? 'focus', bgOpt: o.bgOpt });
      pg.cam(a, { x: pg.w / 2, y: pg.h / 2, h: 1000 * 0.76 });   // the splash frames the page itself (it bleeds past every edge): no caption margin, no clamp
      pg.cam(a + (o.settle ?? 0.9), { x: pg.w / 2, y: pg.h / 2, h: 1000 * (o.pad ?? 0.97) }, E.expoOut);
      if (o.flash !== false) R.flash(a + 0.02, { kind: o.flash ?? 'white' });
      if (o.shake !== false) R.shake(a + 0.05, { amp: 18, dur: 0.5 });
      F.musicCue(a, 'hit');
      if (o.draw) P.draw(o.draw, { at: a });
      pg.P = P;
      return pg;
    };
    R.end = (a, b, o = {}) => {
      const pg = R.page(a, b, { in: o.in ?? 'turn', w: PT ? 700 : 1500 });
      const P = pg.panel([0, 0, 1, 1], { border: 'none', at: a + 0.1, enter: 'fade' });
      P.draw((g2, k) => {
        const s = Math.min(k.w, k.h) * (PT ? 0.34 : 0.42);
        sv('text', { x: k.w * (PT ? 0.5 : 0.74), y: k.h * (PT ? 0.3 : 0.52), 'text-anchor': 'middle', 'font-family': FONT.narr, 'font-weight': 900, 'font-size': s, fill: C.ink }, g2).textContent = o.mark ?? M('完', 'END');
        sv('path', { d: ellipseD(k.w * (PT ? 0.5 : 0.74), k.h * (PT ? 0.3 : 0.52) - s * 0.35, s * 0.75, s * 0.75), fill: 'none', stroke: C.ink, 'stroke-width': s * 0.035 }, g2);
      }, { at: a + 0.2 });
      const lines = [];
      if (o.title) lines.push(['t', o.title]); if (o.sub) lines.push(['s', o.sub]);
      if ((o.sources || []).length) { lines.push(['h', M('资料来源', 'Sources')]); for (const s2 of o.sources) lines.push(['r', s2]); }
      for (const n of o.notes || []) lines.push(['n', n]);
      const col = node('div', `position:absolute;left:${gx(PT ? 50 : 110)}px;top:${gx(PT ? 430 : 150)}px;width:${gx(PT ? 580 : 760)}px`, pg.textLayer);
      lines.forEach(([k2, s2], i) => {
        const la = a + 0.5 + i * Math.min(0.5, (b - a - 1.5) / Math.max(1, lines.length));
        const css = k2 === 't' ? `font:400 ${gx(PT ? 70 : 92)}px/1.15 ${FONT.sfxZh};margin-bottom:${gx(12)}px` : k2 === 's' ? `font:700 ${gx(PT ? 32 : 38)}px/1.4 ${FONT.talk};margin-bottom:${gx(28)}px` : k2 === 'h' ? `display:inline-block;font:700 ${gx(26)}px/1.3 ${FONT.talk};color:${C.paper};background:${C.ink};padding:${gx(4)}px ${gx(12)}px;margin:${gx(10)}px 0 ${gx(8)}px` : `font:500 ${gx(k2 === 'n' ? 22 : PT ? 22 : 25)}px/1.5 ${FONT.talk};color:${k2 === 'n' ? '#555' : '#222'}`;
        const e = node('div', css + ';opacity:0', col, esc(s2));
        F.add((t) => set(e, { opacity: seg(t, la, la + 0.3).toFixed(3) }));
        F.text(e, k2 === 't' ? 'headline' : 'label', s2, la, b, k2 === 'r' || k2 === 'n' || k2 === 'h' ? { noFact: true, chrome: true } : {});
      });
      F.scene(a, b, { end: true }); F.musicCue(a + 0.2, 'name');
      return pg;
    };

    // ---------- HUD: chapter tag (a black box with a white chapter number, like a chapter header) ----------
    R.chapters = (list) => {
      const C2 = list || (F.T && F.T.chapters) || []; if (C2.length < 2) return;
      C2.forEach((c, i) => {
        const box = el('div', `left:${gx(PT ? 30 : 40)}px;top:${gx(PT ? 90 : 34)}px;display:flex;align-items:stretch;opacity:0;filter:drop-shadow(0 ${gx(3)}px ${gx(6)}px rgba(0,0,0,.35))`, hud);
        node('div', `font:400 ${gx(30)}px/1 ${FONT.sfxZh};color:${C.paper};background:${C.ink};padding:${gx(10)}px ${gx(14)}px;border:${gx(3)}px solid ${C.paper}`, box, esc(M(`第${i + 1}话`, `CH.${i + 1}`)));
        const nm = node('div', `font:900 ${gx(30)}px/1 ${FONT.talk};color:${C.ink};background:${C.paper};padding:${gx(10)}px ${gx(16)}px;border:${gx(3)}px solid ${C.ink};border-left:none`, box, esc(c.title));
        box.dataset.motion = 'skip';
        const a = c.start, b = Math.min(c.end, c.start + 3.2);
        F.add((t) => { const q = seg(t, a + 0.1, a + 0.35) * (1 - seg(t, b - 0.3, b)); set(box, { opacity: q.toFixed(3), transform: `translateX(${((1 - E.quartOut(seg(t, a + 0.1, a + 0.4))) * gx(-30)).toFixed(1)}px)` }); });
        F.text(nm, 'label', c.title, a + 0.1, b, { noFact: true, chrome: true });
      });
    };
    if (opt.chapters !== false) R.chapters(Array.isArray(opt.chapters) ? opt.chapters : null);

    // ---------- captions: anime-subtitle white with a black outline ----------
    if (F.T && F.voiced && !F.caps && opt.captions !== false) {
      const co = opt.captions || {}, segs = window.EV.captionSegments(F.T, co.max ?? (PT ? 14 : 20)), size = gx(co.size ?? (PT ? 50 : 46));
      const box = el('div', `left:0;right:0;top:${co.top ?? H * (PT ? 0.86 : 0.875)}px;text-align:center;z-index:880;pointer-events:none;display:none`, F.stage);
      const ring = []; for (let k = 0; k < 16; k++) { const an = (k / 16) * Math.PI * 2; ring.push(`${(Math.cos(an) * size * 0.075).toFixed(1)}px ${(Math.sin(an) * size * 0.075).toFixed(1)}px 0 #000`); }
      const sp = node('span', `position:relative;display:inline-block;max-width:${W * 0.88}px;color:#fff;font:900 ${size}px/1.25 ${FONT.talk};text-shadow:${ring.join(',')}`, box);
      F.add((t) => { const c = segs.find((x) => t >= x.start && t < x.end); set(box, { display: c ? '' : 'none' }); if (c && sp.textContent !== c.text) sp.textContent = c.text; });
      for (const c of segs) { F.appear(c.start); F.appear(c.end); }
      F.caps = segs;
    }

    // ---------- checks ----------
    F.addLint(() => {
      const out = [], add = (t, what, msg) => out.push({ level: 'warn', t, src: '', what, msg });
      for (const S of shots) {
        const holds = S.keys.filter((k) => !(k.view && k.view.hold)).length;
        if (S.b - S.a > 8 && holds < 2 && !S.punches.length) add(S.a, M('页', 'page'), M(`${S.a.toFixed(1)}–${S.b.toFixed(1)} 秒这一页 ${(S.b - S.a).toFixed(1)} 秒镜头不动：按阅读顺序读格子（pg.read），或者推进关键格（pg.punch）`, `The page at ${S.a.toFixed(1)}–${S.b.toFixed(1)} s holds ${(S.b - S.a).toFixed(1)} s without a camera move: read the panels (pg.read) or punch into one (pg.punch)`));
        for (const p of S.panels) if (p.at > S.b) add(p.at, M('格子', 'panel'), M(`第 ${S.no} 页的一格在 ${p.at.toFixed(2)} 秒出现，但这一页 ${S.b.toFixed(2)} 秒就翻走了`, `A panel on page ${S.no} appears at ${p.at.toFixed(2)} s, after the page leaves at ${S.b.toFixed(2)} s`));
      }
      return out;
    });

    return R;
  };
})();
