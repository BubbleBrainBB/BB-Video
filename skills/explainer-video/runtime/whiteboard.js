// whiteboard.js: drawing toolkit for the hand-drawn whiteboard style (self-written, zero third-party animation libraries)
// All items are created once during build; each frame, board.render(t) updates their state from the time.
// Coordinates: world coordinates in pixels; with camera zoom=1 centered at (960,540), world coordinates equal screen coordinates.
(function () {
  const { clamp, lerp, ease, rng, progress } = window.EV;
  const NS = 'http://www.w3.org/2000/svg';

  const COLORS = { ink: '#1F2328', blue: '#1E5BC6', red: '#D6342C', green: '#1E8A4C', orange: '#E07B00', purple: '#6B45C2', gray: '#8A8F98', white: '#FFFFFF' };
  const HL = { yellow: '#FFE45C', pink: '#FFB8D2', green: '#B8F0A6', blue: '#B9DDFF', orange: '#FFD29E' };
  const NOTE = { yellow: '#FFF1A8', pink: '#FFD9E6', green: '#D8F5CB', blue: '#D9ECFF', orange: '#FFE4C4' };
  // Fonts: the list is searched front to back and the first available one wins. The first two (LXGW WenKai, Excalifont) are handled by fonts.css
  // ("local install → on-demand network download"); if neither is available it falls back to the later fonts, and rendering still works.
  // Each video can swap in its own fonts with WB.board({ fonts: { hand: '...', en: '...' } }).
  const FONTS = {
    hand: '"LXGW WenKai", "Hannotate SC", "Kaiti SC", "STKaiti", "KaiTi", cursive',
    en: '"Excalifont", "Noteworthy", "Segoe Print", "LXGW WenKai", cursive',
    ui: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
    caption: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
    mono: '"SF Mono", Menlo, Consolas, monospace',
  };
  const col = (c) => COLORS[c] || c || COLORS.ink;
  const NO_LINE_START = /[，。、：；！？）」』》】〉…—,.:;!?)\]}%]/;

  function svgEl(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // ---------- Geometry helpers ----------
  const fmt = (n) => Math.round(n * 10) / 10;
  // 2D affine matrix [a, b, c, d, e, f]: x' = a·x + c·y + e, y' = b·x + d·y + f
  const M_ID = [1, 0, 0, 1, 0, 0];
  const mMul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  const mApply = (M, x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];

  // Catmull-Rom spline: joins a point list into a smooth path
  function smoothD(pts, closed) {
    if (pts.length < 2) return '';
    if (pts.length === 2) return `M${fmt(pts[0][0])},${fmt(pts[0][1])}L${fmt(pts[1][0])},${fmt(pts[1][1])}`;
    const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
    let d = `M${fmt(P[1][0])},${fmt(P[1][1])}`;
    for (let i = 1; i < P.length - 2; i++) {
      const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${fmt(c1[0])},${fmt(c1[1])} ${fmt(c2[0])},${fmt(c2[1])} ${fmt(p2[0])},${fmt(p2[1])}`;
    }
    return d;
  }

  // Smooth noise: used for hand jitter
  function noise1(seed) {
    const r = rng(seed);
    const comps = [1, 2, 3].map((i) => ({ f: (0.006 + r() * 0.01) * i, ph: r() * Math.PI * 2, a: 1 / i }));
    return (s) => comps.reduce((v, c) => v + c.a * Math.sin(s * c.f + c.ph), 0) / 1.83;
  }

  // Adds hand jitter along the path normal, plus a slight overall bow
  function wobble(pts, amp, seed, bow = 0) {
    if (amp <= 0 && !bow) return pts;
    const n = noise1(seed);
    let s = 0;
    const cum = pts.map((p, i) => (i ? (s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])) : 0));
    const L = s || 1;
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const off = amp * n(cum[i]) + bow * Math.sin((Math.PI * cum[i]) / L);
      return [p[0] + nx * off, p[1] + ny * off];
    });
  }

  let measurer = null;
  // Splits any SVG path (absolute-coordinate commands) into subpaths and samples each into a point list
  function samplePathD(d) {
    if (!measurer) {
      const s = svgEl('svg', { width: 1, height: 1, style: 'position:absolute;left:-9999px;top:-9999px' }, document.body);
      measurer = svgEl('path', {}, s);
    }
    const subs = d.trim().split(/(?=M)/).filter((x) => x.trim());
    return subs.map((sd) => {
      measurer.setAttribute('d', sd);
      const L = measurer.getTotalLength();
      const n = Math.max(6, Math.ceil(L / 7));
      const pts = [];
      for (let i = 0; i <= n; i++) { const p = measurer.getPointAtLength((L * i) / n); pts.push([p.x, p.y]); }
      return { pts, closed: /z\s*$/i.test(sd.trim()) };
    });
  }

  function linePts(x1, y1, x2, y2) {
    const L = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(2, Math.ceil(L / 12));
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push([lerp(x1, x2, i / n), lerp(y1, y2, i / n)]);
    return pts;
  }

  function quadPts(x1, y1, cx, cy, x2, y2) {
    const L = Math.hypot(cx - x1, cy - y1) + Math.hypot(x2 - cx, y2 - cy);
    const n = Math.max(4, Math.ceil(L / 10));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u;
      pts.push([v * v * x1 + 2 * v * u * cx + u * u * x2, v * v * y1 + 2 * v * u * cy + u * u * y2]);
    }
    return pts;
  }

  const boxOf = (t) => (t && t.box ? t.box : t);

  // ---------- Scatter: pick points inside an area (reproducible; with gap > 0 points keep their distance) ----------
  // area: { x, y, w, h } (rectangle) | { cx, cy, r } or { cx, cy, rx, ry } (circle / ellipse)
  //       | { shape: 'mound', cx, cy, w, h } (a small mound whose base midpoint is at (cx, cy), narrowing toward the top)
  function areaOf(area) {
    const shape = area.shape || (area.cx === undefined ? 'rect' : 'ellipse');
    if (shape === 'rect') return { size: area.w * area.h, pick: (r) => [area.x + r() * area.w, area.y + r() * area.h] };
    if (shape === 'mound') {
      const { cx, cy, w, h } = area;
      return { size: (Math.PI / 4) * w * h, pick: (r) => { const x = cx + (r() - 0.5) * w; const top = h * Math.sqrt(Math.max(0, 1 - Math.pow((2 * (x - cx)) / w, 2))); return [x, cy - r() * top]; } };
    }
    const rx = area.rx ?? area.r, ry = area.ry ?? area.r, { cx, cy } = area;
    return { size: Math.PI * rx * ry, pick: (r) => { const a = r() * Math.PI * 2, k = Math.sqrt(r()); return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]; } };
  }
  function scatterPoints(area, { count = 12, gap, seed = 1 } = {}) {
    const A = areaOf(area), r = rng(seed);
    const g = gap ?? 0.7 * Math.sqrt(A.size / count);
    const pts = [];
    for (let tries = 0; pts.length < count && tries < count * 400; tries++) {
      const p = A.pick(r);
      if (pts.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) >= g)) pts.push(p);
    }
    return pts;
  }
  // Small shapes: (x, y) is the center, s the approximate outer diameter, r the random generator; returns { d } etc., used by pile / sprinkle / sketch
  const circleD = (x, y, rr) => `M${x + rr},${y} A${rr},${rr} 0 1 0 ${x - rr},${y} A${rr},${rr} 0 1 0 ${x + rr},${y} Z`;
  const SHAPES = {
    chunk: (x, y, s, r) => { const a = r() * Math.PI / 2; const P = [0, 1, 2, 3].map((k) => [x + Math.cos(a + (k * Math.PI) / 2) * s * 0.5 * (0.9 + r() * 0.2), y + Math.sin(a + (k * Math.PI) / 2) * s * 0.5 * (0.9 + r() * 0.2)]); return { d: `M${P.map((p) => p.join(',')).join('L')}Z` }; },
    ring: (x, y, s) => ({ d: circleD(x, y, s / 2) }),
    dot: (x, y, s) => ({ d: circleD(x, y, s / 2), dot: true }),
    grain: (x, y, s, r) => { const a = r() * Math.PI, c = Math.cos(a), si = Math.sin(a), L = s / 2, W = s / 4.5; return { d: `M${x - c * L},${y - si * L} Q${x - si * W},${y + c * W} ${x + c * L},${y + si * L} Q${x + si * W},${y - c * W} ${x - c * L},${y - si * L} Z` }; },
    dash: (x, y, s, r) => { const a = r() * Math.PI; return { d: `M${x - (Math.cos(a) * s) / 2},${y - (Math.sin(a) * s) / 2} L${x + (Math.cos(a) * s) / 2},${y + (Math.sin(a) * s) / 2}`, open: true }; },
    blob: (x, y, s, r) => { const n = 7, pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = (s / 2) * (0.85 + r() * 0.2); pts.push([x + Math.cos(a) * k, y + Math.sin(a) * k]); } return { d: smoothD(pts, true) + 'Z' }; },
  };
  const unionBox = (boxes) => {
    boxes = boxes.filter(Boolean);
    const x = Math.min(...boxes.map((b) => b.x)), y = Math.min(...boxes.map((b) => b.y));
    const r = Math.max(...boxes.map((b) => b.x + b.w)), btm = Math.max(...boxes.map((b) => b.y + b.h));
    return { x, y, w: r - x, h: btm - y };
  };  // Treats several items as one unit (for compound graphics such as timer and level): has .start .end .box and can erase / pulse / move together
  const groupOf = (items, kind) => ({
    items, kind,
    get start() { return Math.min(...items.map((i) => i.start)); },
    get end() { return Math.max(...items.map((i) => i.end)); },
    get box() { return unionBox(items.map((i) => i.box)); },
    erase(at, dur) { items.forEach((i) => i.erase(at, dur)); return this; },
    pulse(at, amt, dur) { items.forEach((i) => i.pulse(at, amt, dur)); return this; },
    move(at, dx, dy, dur, e) { items.forEach((i) => i.move(at, dx, dy, dur, e)); return this; },
  });


  // ---------- Item base class ----------
  class Item {
    constructor(board, o, node) {
      this.b = board;
      this.o = o;
      this.node = node;
      let start = o.at;
      if (start && typeof start === 'object') start = start.end;
      if (start === undefined || start === null) start = board.cursor;
      this.start = start + (o.delay || 0);
      // Record which line of index.html created this item, for lint check reports
      // When created through a helper function, give both the line inside the helper and the line that called it
      const frames = (new Error().stack || '').split('\n').filter((l) => /\.html:\d+/.test(l) && !/\/lib\//.test(l))
        .map((l) => /\/([^\/\s)]+\.html):(\d+)/.exec(l)).filter(Boolean).map((m) => `${m[1]}:${m[2]}`);
      this.src = [...new Set(frames)].slice(0, 2).join(' ← ');
      this.exits = [];
      this.pulses = [];
      this.moves = [];
      this._p = -1;
      this._vis = null;
    }
    get end() { return this.start + this.dur; }
    // Time when drawing is finished (including the fill)
    get done() { return this.end + (this.hasFill && this.dur > 0 ? 0.35 : 0); }
    describe() {
      const b = this.box;
      const txt = this.label ? `"${this.label.slice(0, 14)}${this.label.length > 14 ? '…' : ''}"` : '';
      return `${this.kind || 'item'}${txt}` + (b ? ` (${Math.round(b.x + b.w / 2)}, ${Math.round(b.y + b.h / 2)})` : '');
    }
    // Erase (fade out): starts at second `at`, lasts `dur` seconds
    erase(at, dur = 0.4) { this.exits.push({ at: at ?? this.b.cursor, dur }); return this; }
    // Emphasis: scale up briefly, then back
    pulse(at, amt = 1.08, dur = 0.6) { this.pulses.push({ at, amt, dur }); return this; }
    // Translate: starting at `at`, move by (dx, dy) over `dur` seconds. e is the easing (use EV.ease.in for falling)
    move(at, dx, dy, dur = 0.8, e = ease.inOut) { return this.transform(at, { dx, dy }, dur, e); }
    // General transform animation: starts at `at`, completes within `dur` seconds
    //   dx, dy   translation
    //   rotate   rotation angle around origin (degrees, positive = clockwise)
    //   scale    scale around origin: a number, or [sx, sy] ([-1, 1] = horizontal flip)
    //   origin   [x, y] in world coordinates; defaults to the item's center at the start of this transform
    // Multiple calls stack in order of start time. Rotate/scale first, then translate.
    transform(at, o = {}, dur = 0.8, e = ease.inOut) {
      this.moves.push({ at, dur, e, ...o });
      this.moves.sort((a, b) => a.at - b.at);
      return this;
    }
    // The item's transform matrix at time t, [a, b, c, d, e, f] (same as SVG matrix)
    matrixAt(t) {
      let M = M_ID;
      const b = this.box;
      for (const m of this.moves) {
        const q = progress(t, m.at, m.dur, m.e);
        if (q <= 0) continue;
        const [ox, oy] = m.origin || (b ? mApply(M, b.x + b.w / 2, b.y + b.h / 2) : [0, 0]);
        const [sx, sy] = Array.isArray(m.scale) ? m.scale : [m.scale ?? 1, m.scale ?? 1];
        const r = ((m.rotate || 0) * q * Math.PI) / 180;
        let T = mMul([1, 0, 0, 1, -ox, -oy], M_ID);
        T = mMul([lerp(1, sx, q), 0, 0, lerp(1, sy, q), 0, 0], T);
        T = mMul([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0], T);
        T = mMul([1, 0, 0, 1, ox + (m.dx || 0) * q, oy + (m.dy || 0) * q], T);
        M = mMul(T, M);
      }
      return M;
    }
    // Bounding box at time t (after move, rotate, scale); .box is always the original position
    boxAt(t) {
      const b = this.box;
      if (!b || !this.moves.length) return b;
      const M = this.matrixAt(t);
      const ps = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].map(([x, y]) => mApply(M, x, y));
      const xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    update(t) {
      let fade = 1;
      for (const x of this.exits) fade = Math.min(fade, 1 - progress(t, x.at, x.dur, ease.inOut));
      const visible = t >= this.start && fade > 0.001;
      // Use display rather than visibility: if a child sets visibility:visible itself, the parent's hidden has no effect
      if (visible !== this._vis) { this.node.style.display = visible ? '' : 'none'; this._vis = visible; }
      if (!visible) { this._p = -1; return; }
      this.node.style.opacity = fade < 1 ? fade : '';
      if (this.o.crop && !this.o.hud && !this._cropped) this.applyCrop();
      let s = 1;
      for (const pl of this.pulses) {
        const q = clamp((t - pl.at) / pl.dur);
        if (q > 0 && q < 1) s *= 1 + (pl.amt - 1) * Math.sin(Math.PI * q);
      }
      let M = this.moves.length ? this.matrixAt(t) : M_ID;
      if (s !== 1 && this.box) {
        const b = this.box, [cx, cy] = mApply(M, b.x + b.w / 2, b.y + b.h / 2);
        M = mMul([s, 0, 0, s, cx * (1 - s), cy * (1 - s)], M);
      }
      const p = progress(t, this.start, this.dur, this.ease || ease.pen);
      if (p !== this._p) { this.draw(p, t); this._p = p; }
      this.applyMatrix(M);
    }
    // Items with crop: true keep only the part visible in "the camera view when it was drawn", so they don't suddenly become whole when the camera zooms out
    applyCrop() {
      this._cropped = true;
      const b = this.b, c = b.camAt(this.done);
      const r = { x: c.x - b.W / 2 / c.zoom, y: c.y - b.H / 2 / c.zoom, w: b.W / c.zoom, h: b.H / c.zoom };
      this.cropRect = r;
      if (this.node instanceof SVGElement) {
        const id = 'crop' + b.nextSeed();
        svgEl('rect', { x: r.x, y: r.y, width: r.w, height: r.h }, svgEl('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, this.node.ownerSVGElement));
        this.node.setAttribute('clip-path', `url(#${id})`);
      } else if (this.box) {
        const bx = this.box;
        this.node.style.clipPath = `inset(${Math.max(0, r.y - bx.y)}px ${Math.max(0, bx.x + bx.w - r.x - r.w)}px ${Math.max(0, bx.y + bx.h - r.y - r.h)}px ${Math.max(0, r.x - bx.x)}px)`;
      }
    }
    applyMatrix(M) {
      const key = M.join(',');
      if (key === this._tf) return;
      this._tf = key;
      const ident = key === M_ID.join(',');
      if (this.node instanceof SVGElement) {
        if (ident) this.node.removeAttribute('transform');
        else this.node.setAttribute('transform', `matrix(${M.join(' ')})`);
      } else {
        // An HTML element's transform uses its own center as origin: convert the world-space matrix accordingly
        const b = this.box;
        let css = '';
        if (!ident && b) {
          const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
          const L = mMul([1, 0, 0, 1, -cx, -cy], mMul(M, [1, 0, 0, 1, cx, cy]));
          css = `matrix(${L.join(',')}) `;
        }
        this.node.style.transform = css + (this.baseTransform || '');
      }
      this.onMatrix(M);
    }
    onMatrix() {}
    draw() {}
  }

  // Stroke items: several strokes drawn in order, with optional fill
  class Strokes extends Item {
    // strokes: [{pts, closed, color, width, fill, dash}]
    constructor(board, strokes, o) {
      const layer = o.hud ? board.hudSvg : o.layer === 'top' ? board.topSvg : o.layer === 'hl' ? board.hlSvg : board.inkSvg;
      const g = svgEl('g', {}, layer);
      super(board, o, g);
      const seed = o.seed ?? board.nextSeed();
      const rough = o.rough ?? 1;
      this.parts = strokes.map((s, i) => {
        const w = s.width ?? o.width ?? board.strokeWidth;
        const color = col(s.color ?? o.color);
        let pts = s.pts;
        if (!s.exact) {
          const L = pts.reduce((a, p, k) => (k ? a + Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]) : 0), 0);
          const r = rng(seed + i * 7919);
          const bow = s.closed ? 0 : (r() - 0.5) * Math.min(10, L * 0.012) * rough;
          pts = wobble(pts, 1.6 * rough, seed + i * 104729, bow);
        }
        const d = smoothD(pts, s.closed);
        const fillColor = s.fill ?? o.fill;
        let fillPath = null;
        if (fillColor) {
          fillPath = svgEl('path', { d, fill: col(fillColor), 'fill-opacity': s.fillOpacity ?? o.fillOpacity ?? 0.9, stroke: 'none', opacity: 0 }, g);
        }
        const path = svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
        const len = path.getTotalLength() || 1;
        let dashPath = null, maskPath = null;
        const dash = s.dash ?? o.dash;
        if (dash) {
          // Dashed lines: use a mask to make the stroke grow
          const id = 'm' + board.nextSeed();
          const mask = svgEl('mask', { id, maskUnits: 'userSpaceOnUse', x: -1e5, y: -1e5, width: 2e5, height: 2e5 }, g);
          maskPath = svgEl('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': w + 6, 'stroke-linecap': 'round' }, mask);
          path.setAttribute('stroke-dasharray', dash.join(' '));
          path.setAttribute('mask', `url(#${id})`);
          dashPath = path;
        }
        const target = maskPath || path;
        target.style.strokeDasharray = `${len} ${len + 10}`;
        target.style.strokeDashoffset = len;
        if (!dash) path.style.visibility = 'hidden';
        return { path: target, visPath: path, fillPath, len, dash, w, maskPath };
      });
      const total = this.parts.reduce((a, p) => a + p.len, 0) + 60 * (this.parts.length - 1);
      this.dur = o.dur ?? clamp(total / (o.speed || board.penSpeed), 0.25, 3);
      this.hasFill = this.parts.some((p) => p.fillPath);
      const allPts = strokes.flatMap((s) => s.pts);
      const xs = allPts.map((p) => p[0]), ys = allPts.map((p) => p[1]);
      this.box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      this._total = total;
      board.add(this);
    }
    update(t) {
      super.update(t);
      if (this.hasFill && this._vis) {
        const f = progress(t, this.end, this.dur > 0 ? 0.35 : 0, ease.out);
        for (const p of this.parts) if (p.fillPath) p.fillPath.setAttribute('opacity', f);
      }
    }
    // During scale animations the stroke width stays constant (as if drawn with the same pen); with o.scaleStroke = true the width scales too
    onMatrix(M) {
      const k = this.o.scaleStroke ? 1 : Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) || 1;
      if (k === this._k) return;
      this._k = k;
      for (const part of this.parts) {
        part.visPath.setAttribute('stroke-width', part.w / k);
        if (part.maskPath) part.maskPath.setAttribute('stroke-width', (part.w + 6) / k);
        if (part.dash) part.visPath.setAttribute('stroke-dasharray', part.dash.map((v) => v / k).join(' '));
      }
    }
    draw(p) {
      let budget = p * this._total;
      for (const part of this.parts) {
        const q = clamp(budget / part.len);
        budget -= part.len + 60;
        if (!part.dash) part.path.style.visibility = q > 0 ? 'visible' : 'hidden';
        part.path.style.strokeDashoffset = part.len * (1 - q);
      }
    }
  }

  // Handwritten text: "written" out character by character
  class TextItem extends Item {
    constructor(board, str, o, parentEl) {
      const div = document.createElement('div');
      div.className = 'wb-text';
      (parentEl || (o.hud ? board.hudHtml : board.html)).appendChild(div);
      super(board, o, div);
      this.kind = 'text';
      this.label = str.replace(/\{(\w+|#[0-9a-fA-F]{3,8}):([^}]*)\}/g, '$2').replace(/\n/g, ' ');
      const size = o.size ?? 56;
      const s = div.style;
      s.fontFamily = board.fonts[o.font] || o.font || board.fonts.hand;
      s.fontSize = size + 'px';
      s.color = col(o.color);
      if (o.weight) s.fontWeight = o.weight;
      if (o.lineHeight) s.lineHeight = o.lineHeight;
      if (o.maxWidth) { s.width = o.maxWidth + 'px'; s.whiteSpace = 'normal'; }
      if (o.align) s.textAlign = o.align;
      if (o.letterSpacing) s.letterSpacing = o.letterSpacing;
      this.chars = [];
      // Supports {red:text} for coloring part of the text
      const segs = [];
      str.replace(/\{(\w+|#[0-9a-fA-F]{3,8}):([^}]*)\}|([^{]+|\{)/g, (m, c, inner, plain) => {
        segs.push(c ? { color: col(c), text: inner } : { text: plain });
        return m;
      });
      for (const seg of segs) {
        const re = /([A-Za-z0-9'’\-.%]+)|(\n)|( )|([\s\S])/g;
        let m;
        while ((m = re.exec(seg.text))) {
          if (m[2]) { div.appendChild(document.createElement('br')); continue; }
          if (m[3]) { div.appendChild(document.createTextNode(' ')); continue; }
          const holder = m[1] ? document.createElement('span') : div;
          if (m[1]) { holder.className = 'w'; div.appendChild(holder); }
          for (const ch of m[1] || m[4]) {
            const c = document.createElement('span');
            c.className = 'c';
            c.textContent = ch;
            if (seg.color) c.style.color = seg.color;
            c.style.visibility = 'hidden';
            const prev = this.chars.length ? this.chars[this.chars.length - 1].el : null;
            if (holder === div && prev && NO_LINE_START.test(ch)) {
              // Chinese typesetting rule: punctuation such as commas, colons and closing brackets must not start a line; glue it to the preceding character
              let glue = prev.parentElement;
              if (!glue.classList.contains('w')) {
                glue = document.createElement('span');
                glue.className = 'w';
                prev.replaceWith(glue);
                glue.appendChild(prev);
              }
              glue.appendChild(c);
            } else holder.appendChild(c);
            this.chars.push({ el: c, q: -1 });
          }
        }
      }
      this.parentEl = parentEl;
      if (!parentEl) this.place(o.x ?? 960, o.y ?? 540, o.anchor || o.align || 'left', o.valign || 'top');
      const latin = (str.match(/[A-Za-z]/g) || []).length / Math.max(1, this.chars.length);
      const speed = o.speed || (latin > 0.5 ? 18 : 8);
      this.dur = o.dur ?? clamp(this.chars.length / speed, 0.3, 5);
      this.ease = ease.linear;
      if (!parentEl) board.add(this);
    }
    place(x, y, anchor, valign) {
      const w = this.node.offsetWidth, h = this.node.offsetHeight;
      const left = anchor === 'center' ? x - w / 2 : anchor === 'right' ? x - w : x;
      const top = valign === 'middle' ? y - h / 2 : valign === 'bottom' ? y - h : y;
      this.node.style.left = left + 'px';
      this.node.style.top = top + 'px';
      this.box = { x: left, y: top, w, h };
    }
    draw(p) {
      const n = this.chars.length, k = p * (n + 0.6);
      for (let i = 0; i < n; i++) {
        const c = this.chars[i];
        const q = clamp((k - i) / 1.6);
        if (q === c.q) continue;
        c.q = q;
        c.el.style.visibility = q > 0 ? 'visible' : 'hidden';
        c.el.style.clipPath = q > 0 && q < 1 ? `inset(-20% ${(1 - q) * 100}% -20% -10%)` : '';
      }
    }
  }

  // KaTeX formula: "written" out from left to right
  class MathItem extends Item {
    constructor(board, latex, o) {
      const div = document.createElement('div');
      div.className = 'wb-math';
      (o.hud ? board.hudHtml : board.html).appendChild(div);
      super(board, o, div);
      this.kind = 'formula';
      this.label = latex;
      div.style.fontSize = (o.size ?? 56) + 'px';
      div.style.color = col(o.color);
      window.katex.render(o.inline ? latex : '\\displaystyle ' + latex, div, { displayMode: !!o.display, throwOnError: false, trust: true, strict: false, output: 'html' });
      const w = div.offsetWidth, h = div.offsetHeight;
      const x = o.x ?? 960, y = o.y ?? 540, anchor = o.anchor || o.align || 'left', valign = o.valign || 'top';
      const left = anchor === 'center' ? x - w / 2 : anchor === 'right' ? x - w : x;
      const top = valign === 'middle' ? y - h / 2 : valign === 'bottom' ? y - h : y;
      div.style.left = left + 'px';
      div.style.top = top + 'px';
      this.box = { x: left, y: top, w, h };
      this.dur = o.dur ?? clamp(0.5 + latex.replace(/\\[a-zA-Z]+|[{}\s^_]/g, '').length * 0.07, 0.6, 4);
      this.ease = ease.inOutSine;
      board.add(this);
    }
    // World-space box of the \htmlClass{name}{...} part of the formula; use it to circle, strike or highlight one term
    part(name) {
      const el = this.node.querySelector('.' + name);
      if (!el) throw new Error(`\\htmlClass{${name}} not found in the formula`);
      const r = el.getBoundingClientRect(), R = this.node.getBoundingClientRect();
      const k = this.node.offsetWidth / R.width || 1;
      return { x: this.box.x + (r.left - R.left) * k, y: this.box.y + (r.top - R.top) * k, w: r.width * k, h: r.height * k };
    }
    draw(p) {
      this.node.style.clipPath = p >= 1 ? '' : `inset(-30% ${(1 - p) * 100}% -30% -5%)`;
    }
  }

  // Sticky note: stuck on, then written on
  class NoteItem extends Item {
    constructor(board, str, o) {
      const div = document.createElement('div');
      div.className = 'wb-note';
      (o.hud ? board.hudHtml : board.html).appendChild(div);
      super(board, o, div);
      this.kind = 'sticky note';
      this.label = str.replace(/\{(\w+|#[0-9a-fA-F]{3,8}):([^}]*)\}/g, '$2').replace(/\n/g, ' ');
      div.style.background = NOTE[o.color || 'yellow'] || o.color;
      div.style.width = (o.w ?? 460) + 'px';
      if (o.h) div.style.minHeight = o.h + 'px';
      this.text = new TextItem(board, str, { size: o.size ?? 44, color: o.textColor, align: o.align, font: o.font, at: 0, lineHeight: o.lineHeight }, div);
      const w = div.offsetWidth, h = div.offsetHeight;
      const x = o.x ?? 960, y = o.y ?? 540;
      const anchor = o.anchor || 'left';
      const left = anchor === 'center' ? x - w / 2 : anchor === 'right' ? x - w : x;
      const top = o.valign === 'middle' ? y - h / 2 : y;
      div.style.left = left + 'px';
      div.style.top = top + 'px';
      this.box = { x: left, y: top, w, h };
      this.rot = o.rotate ?? -1.5;
      this.landDur = 0.4;
      this.dur = o.dur ?? this.landDur + this.text.dur;
      this.ease = ease.linear;
      board.add(this);
    }
    draw(p) {
      const t = this.dur > 0 ? p * this.dur : 1e9; // dur: 0 = already stuck on and written from the start
      const land = ease.out(clamp(t / this.landDur));
      this.baseTransform = `rotate(${this.rot}deg) translateY(${(1 - land) * -40}px) scale(${1 + (1 - land) * 0.06})`;
      this.node.style.transform = this.baseTransform;
      this._tf = null;
      this.node.style.opacity = land;
      this.text.draw(clamp((t - this.landDur) / Math.max(0.01, this.dur - this.landDur)));
    }
  }

  // Highlighter: swept from left to right
  class HighlightItem extends Item {
    constructor(board, box, o) {
      const g = svgEl('g', {}, o.hud ? board.hudSvg : board.hlSvg);
      super(board, o, g);
      const pad = o.pad ?? 6, r = rng(o.seed ?? board.nextSeed());
      const x = box.x - pad, y = box.y + box.h * (o.from ?? 0.12), w = box.w + pad * 2, h = box.h * ((o.to ?? 0.95) - (o.from ?? 0.12));
      const sk = () => (r() - 0.5) * 8;
      const d = `M${x + sk()},${y + sk() * 0.5} L${x + w + sk()},${y + sk() * 0.5} L${x + w + sk()},${y + h + sk() * 0.5} L${x + sk()},${y + h + sk() * 0.5} Z`;
      const id = 'c' + board.nextSeed();
      const cp = svgEl('clipPath', { id }, g);
      this.clipRect = svgEl('rect', { x: x - 10, y: y - 20, width: 0, height: h + 40 }, cp);
      svgEl('path', { d, fill: HL[o.color || 'yellow'] || o.color, opacity: 0.85, 'clip-path': `url(#${id})`, style: 'mix-blend-mode:multiply' }, g);
      this.box = { x, y, w, h };
      this.w = w + 20;
      this.dur = o.dur ?? clamp(w / 1100, 0.25, 1.2);
      this.ease = ease.inOutSine;
      board.add(this);
    }
    draw(p) { this.clipRect.setAttribute('width', this.w * p); }
  }

  // Dot: pops in
  // A full-screen sheet of paper: drawn at the very bottom of the screen-fixed layer, for frames like the cover that "cover the whiteboard"
  class PanelItem extends Item {
    constructor(board, o) {
      const g = svgEl('g', {}, board.hudSvg);
      super(board, o, g);
      svgEl('rect', { x: 0, y: 0, width: board.W, height: board.H, fill: o.fill || board.bg }, g);
      this.box = { x: 0, y: 0, w: board.W, h: board.H };
      this.dur = 0;
      this.kind = 'cover backdrop';
      board.add(this);
    }
  }

  class DotItem extends Item {
    constructor(board, x, y, o) {
      const g = svgEl('g', {}, o.hud ? board.hudSvg : o.layer === 'top' ? board.topSvg : board.inkSvg);
      super(board, o, g);
      const r = o.r ?? 10;
      this.c = svgEl('circle', { cx: x, cy: y, r, fill: col(o.color) }, g);
      this.r = r;
      this.box = { x: x - r, y: y - r, w: 2 * r, h: 2 * r };
      this.dur = o.dur ?? 0.3;
      this.ease = ease.outBack;
      board.add(this);
    }
    draw(p) { this.c.setAttribute('r', Math.max(0, this.r * p)); }
  }

  // ---------- Whiteboard ----------
  class Board {
    constructor(opts = {}) {
      this.T = opts.T;
      // lang: the video's language. Unless it is written in Chinese / Japanese / Korean characters, handwriting defaults to the
      // English handwriting font. Symbols Excalifont lacks (≈ → × …) fall back to LXGW WenKai, which fonts.css loads on every
      // machine, so the layout doesn't depend on which system fonts are installed
      const cjk = !opts.lang || /^(zh|ja|ko)/i.test(opts.lang);
      this.fonts = { ...FONTS, ...(cjk ? {} : { hand: '"Excalifont", "LXGW WenKai", cursive' }), ...(opts.fonts || {}) };
      this.W = opts.width || 1920;
      this.H = opts.height || 1080;
      this.stage = opts.stage || document.getElementById('stage');
      this.items = [];
      this.cursor = opts.start ?? 0.3;
      this.gap = opts.gap ?? 0.15;
      this.penSpeed = opts.penSpeed ?? 1000;
      this.strokeWidth = opts.strokeWidth ?? 5;
      this._seed = EV.hashStr(opts.seed || 'wb');
      this.moves = [];
      this.cam0 = { x: this.W / 2, y: this.H / 2, zoom: 1, ...(opts.camera || {}) };
      this.paperKind = opts.paper || 'plain';
      this.gridSize = opts.grid || 48;
      this.bg = opts.bg || '#FAF8F3';
      this.stage.style.setProperty('--wb-bg', this.bg);

      const mk = (cls, tag = 'div', parent = this.stage) => { const e = document.createElement(tag); e.className = cls; parent.appendChild(e); return e; };
      this.paper = mk('wb-paper');
      this.world = mk('wb-world');
      this.hlSvg = svgEl('svg', {}, this.world);
      this.inkSvg = svgEl('svg', {}, this.world);
      this.html = mk('wb-html', 'div', this.world);
      this.topSvg = svgEl('svg', {}, this.world);
      if (opts.texture !== false) this.texture = mk('wb-texture');
      this.hud = mk('wb-hud');
      this.hudSvg = svgEl('svg', {}, this.hud);
      this.hudHtml = mk('wb-html', 'div', this.hud);
      this.setupPaper();
      if (opts.captions !== false && this.T && this.T.lines.length) this.setupCaptions(opts.captionMax || 20);
      // Chapter progress bar: appears automatically when script.json defines 2 or more chapters; chapters: false turns it off, or pass { top, margin }
      if (opts.chapters !== false && this.T && this.T.chapters.length >= 2) this.setupChapters(opts.chapters || {});
      this.applyCamera(this.cam0);
    }
    nextSeed() { return (this._seed = (Math.imul(this._seed, 1664525) + 1013904223) >>> 0); }
    add(item) { this.items.push(item); this.cursor = item.end + this.gap; return item; }
    at(t) { this.cursor = t; return this; }
    wait(s) { this.cursor += s; return this; }

    setupPaper(fade = 1) {
      const s = this.paper.style;
      const lineC = `rgba(52, 100, 170, ${0.11 * fade})`;
      if (this.paperKind === 'grid') s.backgroundImage = `linear-gradient(to right, ${lineC} 1.5px, transparent 1.5px), linear-gradient(to bottom, ${lineC} 1.5px, transparent 1.5px)`;
      else if (this.paperKind === 'dots') s.backgroundImage = `radial-gradient(circle, rgba(52,100,170,${0.22 * fade}) 2px, transparent 2.5px)`;
      else if (this.paperKind === 'lined') s.backgroundImage = `linear-gradient(to bottom, ${lineC} 1.5px, transparent 1.5px)`;
      if (this.texture && !this.texture.style.backgroundImage) {
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' seed='7'/><feColorMatrix values='0 0 0 0 .45  0 0 0 0 .42  0 0 0 0 .36  0 0 0 .09 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
        this.texture.style.backgroundImage = `radial-gradient(ellipse at center, transparent 62%, rgba(120,105,80,.10) 100%), url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      }
    }

    // ---------- Camera ----------
    // At `at` seconds, move the camera to {x, y, zoom} (x,y is the world coordinate the frame center aims at)
    camera(at, target, dur = 1.2) { this.moves.push({ at, dur, target }); this.moves.sort((a, b) => a.at - b.at); return this; }
    // Point the camera at an item / area
    // Framing automatically avoids the chapter progress bar at the top and the captions at the bottom
    focus(target, o = {}) {
      const b = Array.isArray(target) ? unionBox(target.map(boxOf)) : boxOf(target);
      const pad = o.pad ?? 120;
      const top = this.chapterZone || 0, bottom = this.capEl ? 150 : 0, availH = this.H - top - bottom;
      const zoom = o.zoom ?? Math.min(1.5, this.W / (b.w + pad * 2), availH / (b.h + pad * 2));
      const cy = b.y + b.h / 2 - (top + availH / 2 - this.H / 2) / zoom;
      return this.camera(o.at ?? this.cursor, { x: b.x + b.w / 2 + (o.dx || 0), y: cy + (o.dy || 0), zoom }, o.dur ?? 1.2);
    }
    camAt(t) {
      let c = { ...this.cam0 };
      for (const m of this.moves) {
        if (t <= m.at) break;
        const p = progress(t, m.at, m.dur, ease.inOut);
        const tg = { x: m.target.x ?? c.x, y: m.target.y ?? c.y, zoom: m.target.zoom ?? c.zoom };
        c = { x: lerp(c.x, tg.x, p), y: lerp(c.y, tg.y, p), zoom: Math.exp(lerp(Math.log(c.zoom), Math.log(tg.zoom), p)) };
      }
      return c;
    }
    applyCamera(c) {
      const { W, H } = this;
      this.world.style.transform = `translate(${W / 2}px, ${H / 2}px) scale(${c.zoom}) translate(${-c.x}px, ${-c.y}px)`;
      if (this.paperKind !== 'plain') {
        const g = this.gridSize * c.zoom;
        // When the camera zooms out and the grid gets too dense, the paper texture fades gradually so it doesn't turn into noise
        const fade = Math.round(clamp((g - 8) / 22) * 20) / 20;
        if (fade !== this._paperFade) { this._paperFade = fade; this.setupPaper(fade); }
        this.paper.style.backgroundSize = `${g}px ${g}px`;
        this.paper.style.backgroundPosition = `${W / 2 - c.x * c.zoom}px ${H / 2 - c.y * c.zoom}px`;
      }
    }
    // Bounding box of all (or the given) items, for the ending "zoom out to see the whole board"
    bounds(items) { return unionBox((items || this.items.filter((i) => !i.o.hud)).map((i) => i.box)); }

    // ---------- Captions ----------
    setupCaptions(max) {
      this.capEl = document.createElement('div');
      this.capEl.className = 'wb-caption';
      this.capEl.style.fontFamily = this.fonts.caption;
      this.capEl.style.visibility = 'hidden';
      this.hud.appendChild(this.capEl);
      const PUN = /[\s，。、？！；：“”‘’（）《》「」【】—…·,.?!;:'"()]/;
      this.caps = [];
      for (const l of this.T.lines) {
        if (!l.text || l.silence) continue;
        // Measure length by "display width": a CJK character counts 1, a Latin letter / digit about 0.55, a space 0.3
        const text = l.text, words = l.words || [];
        const CJK = /[⺀-鿿豈-﫿＀-￯]/, LAT = /[A-Za-z0-9'’\-%]/;
        const wOf = (i, j) => { let w = 0; for (let k = i; k < j; k++) { const ch = text[k]; w += CJK.test(ch) ? 1 : ch === ' ' ? 0.3 : 0.55; } return w; };
        // Allowed break positions: after punctuation and spaces, and between words of the voiceover's word-level timing; never inside an English word or a number
        const wpos = [];
        const allowed = new Array(text.length + 1).fill(false);
        let from = 0;
        for (const w of words) {
          const i = text.indexOf(w.text, from);
          if (i < 0) { wpos.push(null); continue; }
          wpos.push(i);
          allowed[i] = allowed[i + w.text.length] = true;
          from = i + w.text.length;
        }
        // English punctuation (. , : ; ! ?) only ends a clause when followed by whitespace or at the end of the sentence; when sandwiched between letters/digits (SKILL.md, 3.5, 1,000, 3:30, a/b) it is part of the word
        const AN = /[A-Za-z0-9]/;
        const inWord = (k) => LAT.test(text[k] || '') || (/[.,:;_\/]/.test(text[k] || '') && AN.test(text[k - 1] || '') && AN.test(text[k + 1] || ''));
        const isBreak = (k) => /[，。！？；：]/.test(text[k]) || (/[,.!?;:]/.test(text[k]) && !inWord(k) && (k + 1 >= text.length || /[\s，。！？；：”’)）]/.test(text[k + 1])));
        for (let i = 1; i < text.length; i++) {
          if (/[\s、]/.test(text[i - 1]) || isBreak(i - 1)) allowed[i] = true;
          if (!words.length && CJK.test(text[i - 1]) && CJK.test(text[i])) allowed[i] = true;
          if (inWord(i - 1) && inWord(i)) allowed[i] = false;
        }
        // 1) split into clauses at punctuation 2) merge adjacent clauses up to max 3) split anything still too long, at allowed positions, into pieces of similar width
        const ranges = [];
        for (let i = 0, st = 0; i < text.length; i++) if (isBreak(i) && !isBreak(i + 1)) { ranges.push([st, i + 1]); st = i + 1; } else if (i === text.length - 1) ranges.push([st, text.length]);
        if (!ranges.length) ranges.push([0, text.length]);
        const merged = [];
        for (const r of ranges) {
          const last = merged[merged.length - 1];
          if (last && wOf(last[0], r[1]) <= max && !/[。！？.!?]\s*$/.test(text.slice(last[0], last[1]))) last[1] = r[1];
          else merged.push([...r]);
        }
        // Pieces that are too short (under 30% of the limit) would flash by: merge them into the previous or next piece; being over-long after merging is fine, the next step re-splits evenly between words
        const ends = (r) => { const k = text.slice(0, r[1]).replace(/\s+$/, '').length - 1; return /[。！？]/.test(text[k]) || (/[.!?]/.test(text[k]) && isBreak(k)); };
        for (let i = 0; i < merged.length; i++) {
          const r = merged[i];
          if (merged.length < 2 || wOf(r[0], r[1]) >= max * 0.3) continue;
          const prev = merged[i - 1], next = merged[i + 1];
          if (prev && !ends(prev)) { prev[1] = r[1]; merged.splice(i--, 1); }
          else if (next && !ends(r)) { next[0] = r[0]; merged.splice(i--, 1); }
        }
        const split = merged.flatMap(([s0, e0]) => {
          const n = Math.ceil(wOf(s0, e0) / (max + 3));
          if (n <= 1) return [[s0, e0]];
          const target = wOf(s0, e0) / n, out = [];
          let st = s0;
          for (let k = 1; k < n; k++) {
            // Find the allowed break position closest to the target width
            let best = -1, bestD = Infinity;
            for (let i = st + 1; i < e0; i++) {
              if (!allowed[i]) continue;
              const d = Math.abs(wOf(st, i) - target);
              if (d < bestD) { bestD = d; best = i; }
            }
            if (best < 0) break;
            out.push([st, best]);
            st = best;
          }
          out.push([st, e0]);
          return out;
        });
        // Start time of each piece: the start time of the first spoken word in it
        const starts = split.map(([s0]) => {
          const k = wpos.findIndex((p) => p !== null && p >= s0);
          return k >= 0 ? words[k].start : lerp(l.start, l.end, s0 / Math.max(1, text.length));
        });
        split.forEach(([s0, e0], i) => {
          const cap = text.slice(s0, e0).trim().replace(/[，。、；：,;:]+$/, '').replace(/[，、]/g, ' ');
          this.caps.push({ text: cap, start: i === 0 ? l.start : starts[i], end: i < split.length - 1 ? starts[i + 1] : l.end + 0.25 });
        });
      }
    }
    // ---------- Chapter progress bar: a pencil "draws" the progress line along the top of the screen ----------
    setupChapters(cfg) {
      const chs = this.T.chapters, W = this.W;
      // Titles go below the line and the pencil moves above it, so they never cover each other; extra room on the right for the pencil's tail
      const x0 = cfg.margin ?? 64, x1 = W - (cfg.margin ?? 64) - 46, ly = (cfg.top ?? 0) + 58;
      this.chapterZone = ly + 46;
      // Each chapter's width is proportional to its duration, but always fits at least 3 characters
      const avail = x1 - x0, total = chs[chs.length - 1].end - chs[0].start;
      const minW = Math.min(130, avail / chs.length);
      let ws = chs.map((c) => (avail * (c.end - c.start)) / total);
      const extra = ws.reduce((a, w) => a + Math.max(0, minW - w), 0);
      const room = ws.reduce((a, w) => a + Math.max(0, w - minW), 0) || 1;
      ws = ws.map((w) => (w < minW ? minW : w - (extra * (w - minW)) / room));
      const g = svgEl('g', {}, this.hudSvg);
      this.chG = g;
      // The part not yet drawn: a light gray dashed "guide line"
      svgEl('path', { d: `M${x0},${ly} L${x1},${ly}`, stroke: '#D3D5DA', 'stroke-width': 3, 'stroke-dasharray': '10 12', fill: 'none' }, g);
      // The ink line drawn by the pencil: the whole jittery line is generated up front and revealed by progress
      const pts = [];
      for (let x = x0; x <= x1; x += 10) pts.push([x, ly]);
      const ink = svgEl('path', { d: smoothD(wobble(pts, 2.4, this.nextSeed())), stroke: COLORS.ink, 'stroke-width': 6, 'stroke-linecap': 'round', fill: 'none' }, g);
      const L = ink.getTotalLength();
      ink.style.strokeDasharray = `${L} ${L + 10}`;
      this.chInk = { el: ink, L, x0, x1 };
      let x = x0;
      this.chs = chs.map((c, i) => {
        const w = ws[i];
        const tick = svgEl('path', { d: `M${x},${ly - 12} L${x + 1},${ly + 12}`, stroke: COLORS.ink, 'stroke-width': 4.5, 'stroke-linecap': 'round' }, g);
        const label = svgEl('text', { x: x + 10, y: ly + 36, 'font-size': 26, fill: COLORS.ink, style: `font-family:${this.fonts.hand}` }, g);
        // If the title doesn't fit, shrink the font size; if it still doesn't fit, truncate
        let text = c.title, size = 26;
        label.textContent = text;
        const maxW = w - 22;
        if (label.getComputedTextLength() > maxW) { size = Math.max(16, (size * maxW) / label.getComputedTextLength()); label.setAttribute('font-size', size); }
        while (label.getComputedTextLength() > maxW && text.length > 1) { text = text.slice(0, -1); label.textContent = text + '…'; }
        const item = { ...c, x, w, tick, label, size, text: label.textContent, state: null };
        // The "numbered" version shown during the overview shot, also scaled / truncated to width
        let t2 = `${'①②③④⑤⑥⑦⑧⑨⑩⑪⑫'[i] || i + 1} ${c.title}`;
        label.textContent = t2;
        const s2 = label.getComputedTextLength() > maxW ? Math.max(16, (size * maxW) / label.getComputedTextLength()) : size;
        label.setAttribute('font-size', s2);
        while (label.getComputedTextLength() > maxW && t2.length > 3) { t2 = t2.slice(0, -1); label.textContent = t2 + '…'; }
        item.numText = label.textContent; item.numSize = s2;
        label.textContent = item.text; label.setAttribute('font-size', size);
        x += w;
        return item;
      });
      this.chEndTick = svgEl('path', { d: `M${x1},${ly - 12} L${x1},${ly + 12}`, stroke: '#C9CCD1', 'stroke-width': 4.5, 'stroke-linecap': 'round' }, g);
      this.chLy = ly;
      // Pencil: tip at (0,0); along +x come the lead, the wood, the barrel, the metal ferrule and the eraser
      const pen = svgEl('g', {}, g);
      svgEl('path', { d: 'M0,0 L15,-6.5 L15,6.5 Z', fill: COLORS.ink }, pen);
      svgEl('path', { d: 'M15,-6.5 L36,-13 L36,13 L15,6.5 Z', fill: '#EBC9A0', stroke: COLORS.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }, pen);
      svgEl('rect', { x: 36, y: -13, width: 88, height: 26, fill: '#F6C343', stroke: COLORS.ink, 'stroke-width': 3 }, pen);
      svgEl('path', { d: 'M40,-4 L120,-4', stroke: '#D9A21F', 'stroke-width': 3 }, pen);
      svgEl('rect', { x: 124, y: -13, width: 13, height: 26, fill: '#C9CCD1', stroke: COLORS.ink, 'stroke-width': 3 }, pen);
      svgEl('rect', { x: 137, y: -13, width: 20, height: 26, rx: 6, fill: '#F4A7B9', stroke: COLORS.ink, 'stroke-width': 3 }, pen);
      this.chPen = pen;
    }
    renderChapters(t) {
      const enter = clamp((t - (this.coverEnd || 0)) / 0.8);
      this.chG.style.opacity = enter;
      const last = this.chs[this.chs.length - 1];
      const tt = clamp(t, this.chs[0].start, last.end);
      let cur = this.chs.findIndex((c) => tt >= c.start && tt < c.end);
      if (cur < 0) cur = this.chs.length - 1;
      const c = this.chs[cur];
      const hx = c.x + c.w * clamp((tt - c.start) / (c.end - c.start));
      // The ink line is drawn up to the pencil tip
      const { el, L, x0, x1 } = this.chInk;
      el.style.strokeDashoffset = L * (1 - (hx - x0) / (x1 - x0));
      for (const [i, ch] of this.chs.entries()) {
        const numbered = this.overviewNumbers && t >= this.overviewNumbers.at;
        if (numbered !== ch.numbered) {
          ch.numbered = numbered;
          ch.label.textContent = numbered ? ch.numText : ch.text;
          ch.label.setAttribute('font-size', numbered ? ch.numSize : ch.size);
        }
        const state = i < cur ? 'done' : i === cur ? 'cur' : 'todo';
        if (state !== ch.state) {
          ch.state = state;
          ch.label.setAttribute('fill', state === 'todo' ? '#9A9EA6' : COLORS.ink);
          ch.label.setAttribute('font-weight', state === 'cur' ? 700 : 400);
          ch.tick.setAttribute('stroke', state === 'todo' ? '#C9CCD1' : COLORS.ink);
        }
        // When a new chapter starts, its title gives a small bounce
        const k = clamp((t - ch.start) / 0.45);
        const s = i === cur && i > 0 && k > 0 && k < 1 ? 1 + 0.14 * Math.sin(Math.PI * k) : 1;
        const lx = ch.x + 10, lyy = this.chLy + 27;
        ch.label.setAttribute('transform', s === 1 ? '' : `translate(${lx},${lyy}) scale(${s}) translate(${-lx},${-lyy})`);
      }
      // Pencil: tip rests at the progress point and wiggles slightly while writing; after everything is narrated it lifts, and the end tick turns black to show completion
      const drawing = t < last.end;
      const wig = drawing ? Math.sin(t * 9) : 0;
      const lift = drawing ? 0 : ease.out(clamp((t - last.end) / 0.4)) * 10;
      this.chPen.setAttribute('transform', `translate(${hx},${this.chLy + wig * 1.2 - lift}) rotate(${-28 + wig * 2.5}) scale(0.72)`);
      if (drawing !== this._chDrawing) { this._chDrawing = drawing; this.chEndTick.setAttribute('stroke', drawing ? '#C9CCD1' : COLORS.ink); }
    }

    renderCaptions(t) {
      const c = this.caps.find((x) => t >= x.start && t < x.end);
      const text = c ? c.text : '';
      if (text !== this._cap) {
        this._cap = text;
        this.capEl.textContent = text;
        this.capEl.style.visibility = text ? 'visible' : 'hidden';
      }
    }

    // ---------- Drawing API ----------
    text(str, o = {}) { return new TextItem(this, str, o); }
    math(latex, o = {}) { return new MathItem(this, latex, o); }
    note(str, o = {}) { return new NoteItem(this, str, o); }
    // Speech bubble: draws the rounded box and tail first, then writes the text inside.
    //   x, y + anchor(left|center|right): box position (y is the top edge); tail: 'left' | 'right' | 'none' | [x, y] (world coordinate the tail tip points at)
    //   color: outline color (usually the speaker's color); textColor; size; pad; fill (default white)
    // Returns { shape, text, box, start, end, erase, move, pulse }; can be used as the next item's at
    bubble(str, o = {}) {
      const size = o.size ?? 48, pad = o.pad ?? 26;
      let t0 = o.at;
      if (t0 && typeof t0 === 'object') t0 = t0.end;
      if (t0 === undefined || t0 === null) t0 = this.cursor;
      t0 += o.delay || 0;
      const shapeDur = o.shapeDur ?? 0.35;
      const text = this.text(str, { size, color: o.textColor, font: o.font, align: o.align, at: t0 + shapeDur, dur: o.dur, hud: o.hud, overlap: true });
      const w = text.box.w + pad * 2, h = text.box.h + pad * 1.2;
      const x = o.x ?? 960, top = o.y ?? 540, anchor = o.anchor || 'left';
      const left = anchor === 'center' ? x - w / 2 : anchor === 'right' ? x - w : x;
      const right = left + w, bottom = top + h, r = Math.min(h / 2, 28);
      text.place(left + pad, top + pad * 0.6, 'left', 'top');
      const tail = o.tail ?? 'left';
      let d = `M${left + r},${top} L${right - r},${top} Q${right},${top} ${right},${top + r} L${right},${bottom - r} Q${right},${bottom} ${right - r},${bottom}`;
      if (tail !== 'none') {
        const tip = Array.isArray(tail) ? tail : tail === 'right' ? [right + 6, bottom + 34] : [left - 6, bottom + 34];
        const bx = clamp(tip[0], left + r + 18, right - r - 18);
        d += ` L${bx + 18},${bottom} L${tip[0]},${tip[1]} L${bx - 18},${bottom}`;
      }
      d += ` L${left + r},${bottom} Q${left},${bottom} ${left},${bottom - r} L${left},${top + r} Q${left},${top} ${left + r},${top} Z`;
      const shape = this.path([{ d, fill: o.fill ?? '#FFFFFF' }], { color: o.color, width: o.width ?? 4, at: t0, dur: shapeDur, hud: o.hud, overlap: true, rough: 0.6 });
      shape.kind = 'speech bubble';
      shape.label = text.label;
      shape.o.overlap = false;       // the bubble box takes part in the overlap check; the text inside is not checked again
      this.cursor = text.end + this.gap;
      const g = {
        shape, text, box: shape.box, start: shape.start,
        get end() { return text.end; },
        erase(at, dur) { shape.erase(at, dur); text.erase(at, dur); return g; },
        move(...a) { shape.move(...a); text.move(...a); return g; },
        pulse(...a) { shape.pulse(...a); text.pulse(...a); return g; },
      };
      return g;
    }
    dot(x, y, o = {}) { return new DotItem(this, x, y, o); }
    highlight(target, o = {}) { return new HighlightItem(this, boxOf(target), o); }

    line(x1, y1, x2, y2, o = {}) { return new Strokes(this, [{ pts: linePts(x1, y1, x2, y2), dash: o.dash }], o); }
    polyline(points, o = {}) {
      const pts = [];
      for (let i = 1; i < points.length; i++) pts.push(...linePts(...points[i - 1], ...points[i]).slice(i > 1 ? 1 : 0));
      // Closed: add the last edge (dropping its final point, which coincides with the start), otherwise the spline draws the last edge as a hook
      if (o.closed && points.length > 2) pts.push(...linePts(...points[points.length - 1], ...points[0]).slice(1, -1));
      return new Strokes(this, [{ pts, closed: !!o.closed }], o);
    }
    curve(points, o = {}) {
      const d = smoothD(points, !!o.closed);
      return new Strokes(this, samplePathD(d + (o.closed ? 'Z' : '')), o);
    }
    // Any SVG path (or an array of them). x, y, scale place the path from its own coordinates onto the whiteboard.
    // Start every subpath with an absolute M; entries can be written as {d, color, width, fill, dash}
    path(ds, o = {}) {
      const list = Array.isArray(ds) ? ds : [ds];
      const sx = o.scale ?? 1, ox = o.x ?? 0, oy = o.y ?? 0;
      const strokes = [];
      for (const it of list) {
        const spec = typeof it === 'string' ? { d: it } : it;
        for (const sub of samplePathD(spec.d)) {
          strokes.push({ ...spec, closed: sub.closed, pts: sub.pts.map(([x, y]) => [ox + x * sx, oy + y * sx]) });
        }
      }
      return new Strokes(this, strokes, o);
    }
    sketch(ds, o = {}) { return this.path(ds, o); }

    arrow(x1, y1, x2, y2, o = {}) {
      const L = Math.hypot(x2 - x1, y2 - y1);
      const bend = o.bend ?? 0;
      const mx = (x1 + x2) / 2 - ((y2 - y1) / L) * bend * L, my = (y1 + y2) / 2 + ((x2 - x1) / L) * bend * L;
      const shaft = bend ? quadPts(x1, y1, mx, my, x2, y2) : linePts(x1, y1, x2, y2);
      const hs = o.head ?? 24;
      const heads = (tip, from) => {
        const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
        return [-1, 1].map((sgn) => ({ pts: linePts(tip[0] - hs * Math.cos(a + sgn * 0.5), tip[1] - hs * Math.sin(a + sgn * 0.5), tip[0], tip[1]) }));
      };
      const n = shaft.length;
      const strokes = [{ pts: shaft, dash: o.dash }, ...heads(shaft[n - 1], shaft[Math.max(0, n - 4)])];
      if (o.double) strokes.push(...heads(shaft[0], shaft[Math.min(n - 1, 3)]));
      return new Strokes(this, strokes, o);
    }

    rect(x, y, w, h, o = {}) {
      const r = rng(o.seed ?? this.nextSeed()), ov = () => 4 + r() * 6;
      const sides = [
        [x - ov(), y, x + w + ov(), y],
        [x + w, y - ov(), x + w, y + h + ov()],
        [x + w + ov(), y + h, x - ov(), y + h],
        [x, y + h + ov(), x, y - ov()],
      ];
      return new Strokes(this, sides.map((s) => ({ pts: linePts(...s) })), o);
    }

    ellipse(cx, cy, rx, ry, o = {}) {
      const r = rng(o.seed ?? this.nextSeed());
      const turns = o.turns ?? 1.08, a0 = o.startAngle ?? -2.2 + r() * 0.8;
      const n = Math.ceil(Math.max(rx, ry) * Math.abs(turns) * 0.5 + 24);
      const drift = o.drift ?? 0.025 + r() * 0.03;
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, a = a0 + u * turns * Math.PI * 2;
        const k = 1 + drift * (u - 0.5) * 2;
        pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
      }
      return new Strokes(this, [{ pts, fill: o.fill }], { ...o, fill: undefined });
    }
    circle(cx, cy, rad, o = {}) { return this.ellipse(cx, cy, rad, rad, o); }

    // Circle an item
    circleAround(target, o = {}) {
      const b = boxOf(target), pad = o.pad ?? 18;
      return this.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + pad * 1.4, b.h / 2 + pad, { color: 'red', ...o });
    }
    boxAround(target, o = {}) {
      const b = boxOf(target), pad = o.pad ?? 16;
      return this.rect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, { color: 'red', ...o });
    }
    underline(target, o = {}) {
      const b = boxOf(target), y = b.y + b.h + (o.offset ?? 6), x1 = b.x - 4, x2 = b.x + b.w + 4;
      let pts;
      if (o.wavy) {
        pts = [];
        const n = Math.ceil((x2 - x1) / 6);
        for (let i = 0; i <= n; i++) pts.push([lerp(x1, x2, i / n), y + Math.sin((i / n) * (x2 - x1) / 14) * 6]);
      } else pts = linePts(x1, y + 3, x2, y - 3);
      const strokes = [{ pts }];
      if (o.double) strokes.push({ pts: linePts(x1 + 10, y + 15, x2 - 6, y + 10) });
      return new Strokes(this, strokes, { color: 'red', ...o });
    }
    // Strike through (o.cross=true draws an ×)
    strike(target, o = {}) {
      const b = boxOf(target);
      const strokes = o.cross
        ? [{ pts: linePts(b.x, b.y, b.x + b.w, b.y + b.h) }, { pts: linePts(b.x + b.w, b.y, b.x, b.y + b.h) }]
        : [{ pts: linePts(b.x - 6, b.y + b.h * 0.58, b.x + b.w + 6, b.y + b.h * 0.42) }];
      return new Strokes(this, strokes, { color: 'red', ...o });
    }
    check(x, y, o = {}) {
      const s = o.size ?? 60;
      return new Strokes(this, [{ pts: [...linePts(x - s / 2, y, x - s / 8, y + s / 2.6), ...linePts(x - s / 8, y + s / 2.6, x + s / 1.8, y - s / 2).slice(1)] }], { color: 'green', width: 7, ...o });
    }
    cross(x, y, o = {}) {
      const s = (o.size ?? 56) / 2;
      return new Strokes(this, [{ pts: linePts(x - s, y - s, x + s, y + s) }, { pts: linePts(x + s, y - s, x - s, y + s) }], { color: 'red', width: 7, ...o });
    }
    // Curly brace: horizontal (dir: 'down' tip pointing down / 'up'), for grouping several parts together
    brace(x1, x2, y, o = {}) {
      const dir = o.dir === 'up' ? -1 : 1, d = (o.depth ?? 22) * dir, m = (x1 + x2) / 2;
      const pts = [
        ...quadPts(x1, y, x1, y + d * 0.9, x1 + Math.min(30, (m - x1) / 3), y + d * 0.9),
        ...linePts(x1 + Math.min(30, (m - x1) / 3), y + d * 0.9, m - 14, y + d * 0.9).slice(1),
        ...quadPts(m - 14, y + d * 0.9, m, y + d * 0.9, m, y + d * 1.7).slice(1),
        ...quadPts(m, y + d * 1.7, m, y + d * 0.9, m + 14, y + d * 0.9).slice(1),
        ...linePts(m + 14, y + d * 0.9, x2 - Math.min(30, (x2 - m) / 3), y + d * 0.9).slice(1),
        ...quadPts(x2 - Math.min(30, (x2 - m) / 3), y + d * 0.9, x2, y + d * 0.9, x2, y).slice(1),
      ];
      const it = new Strokes(this, [{ pts }], { rough: 0.5, ...o });
      it.tip = [m, y + d * 1.7];
      return it;
    }
    // Vertical curly brace (dir: 'right' tip pointing right / 'left')
    vbrace(y1, y2, x, o = {}) {
      const dir = o.dir === 'left' ? -1 : 1, d = (o.depth ?? 22) * dir, m = (y1 + y2) / 2;
      const q = (a, b) => Math.min(30, Math.abs(b - a) / 3);
      const pts = [
        ...quadPts(x, y1, x + d * 0.9, y1, x + d * 0.9, y1 + q(y1, m)),
        ...linePts(x + d * 0.9, y1 + q(y1, m), x + d * 0.9, m - 14).slice(1),
        ...quadPts(x + d * 0.9, m - 14, x + d * 0.9, m, x + d * 1.7, m).slice(1),
        ...quadPts(x + d * 1.7, m, x + d * 0.9, m, x + d * 0.9, m + 14).slice(1),
        ...linePts(x + d * 0.9, m + 14, x + d * 0.9, y2 - q(m, y2)).slice(1),
        ...quadPts(x + d * 0.9, y2 - q(m, y2), x + d * 0.9, y2, x, y2).slice(1),
      ];
      const it = new Strokes(this, [{ pts }], { rough: 0.5, ...o });
      it.tip = [x + d * 1.7, m];
      return it;
    }

    // ---------- Geometry annotations ----------
    // Angle mark: vertex v, sides pointing to p1 and p2 (both [x, y]). o.n arcs (1–3, to tell different angles apart);
    // o.right = true draws a right-angle symbol; o.r radius, o.gap spacing between arcs
    angleMark(v, p1, p2, o = {}) {
      const a1 = Math.atan2(p1[1] - v[1], p1[0] - v[0]);
      let d = Math.atan2(p2[1] - v[1], p2[0] - v[0]) - a1;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d <= -Math.PI) d += 2 * Math.PI;
      const r = o.r ?? 44, strokes = [];
      if (o.right) {
        const s = o.r ?? 30, u = [Math.cos(a1), Math.sin(a1)], w = [Math.cos(a1 + d), Math.sin(a1 + d)];
        const A = [v[0] + u[0] * s, v[1] + u[1] * s], B = [A[0] + w[0] * s, A[1] + w[1] * s], C = [v[0] + w[0] * s, v[1] + w[1] * s];
        strokes.push({ pts: [...linePts(...A, ...B), ...linePts(...B, ...C).slice(1)] });
      } else {
        for (let i = 0; i < (o.n ?? 1); i++) {
          const rr = r + i * (o.gap ?? 10), m = Math.max(6, Math.ceil((Math.abs(d) * rr) / 8)), pts = [];
          for (let k = 0; k <= m; k++) { const a = a1 + (d * k) / m; pts.push([v[0] + Math.cos(a) * rr, v[1] + Math.sin(a) * rr]); }
          strokes.push({ pts });
        }
      }
      return new Strokes(this, strokes, { width: 4, rough: 0.35, ...o });
    }
    // Equal-length mark: draws o.n short ticks on segment p1–p2 (1–3, to tell different sides apart); o.pos position (0–1, default midpoint)
    tickMark(p1, p2, o = {}) {
      const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1;
      const u = [(p2[0] - p1[0]) / L, (p2[1] - p1[1]) / L], nv = [-u[1], u[0]];
      const n = o.n ?? 1, len = o.len ?? 28, gap = o.gap ?? 11, pos = o.pos ?? 0.5;
      const c = [lerp(p1[0], p2[0], pos), lerp(p1[1], p2[1], pos)];
      const strokes = [];
      for (let i = 0; i < n; i++) {
        const k = (i - (n - 1) / 2) * gap, x = c[0] + u[0] * k, y = c[1] + u[1] * k;
        strokes.push({ pts: linePts(x - nv[0] * len / 2, y - nv[1] * len / 2, x + nv[0] * len / 2, y + nv[1] * len / 2) });
      }
      return new Strokes(this, strokes, { width: 4, rough: 0.3, ...o });
    }
    // Place text pad pixels out from point (px, py) along direction dir, so the text box doesn't cover the point
    _placeOut(item, px, py, dir, pad) {
      const { w, h } = item.box, L = Math.hypot(dir[0], dir[1]) || 1, ux = dir[0] / L, uy = dir[1] / L;
      const off = Math.abs(ux) * w / 2 + Math.abs(uy) * h / 2 + pad;
      item.place(px + ux * off, py + uy * off, 'center', 'middle');
      return item;
    }
    // Polygon vertex letters: names[i] goes outside pts[i] (along the external angle bisector); null skips. Returns an array of text items
    vertexLabels(pts, names, o = {}) {
      const n = pts.length, out = [];
      names.forEach((name, i) => {
        if (name == null) return;
        const p = pts[i], a = pts[(i + n - 1) % n], c = pts[(i + 1) % n];
        const ua = [a[0] - p[0], a[1] - p[1]], uc = [c[0] - p[0], c[1] - p[1]];
        const la = Math.hypot(...ua) || 1, lc = Math.hypot(...uc) || 1;
        const dir = [-(ua[0] / la + uc[0] / lc), -(ua[1] / la + uc[1] / lc)];
        const { pad, ...rest } = o;
        const it = this.text(name, { font: 'en', size: 48, ...rest, at: out.length ? undefined : o.at, x: p[0], y: p[1], align: 'center', valign: 'middle' });
        out.push(this._placeOut(it, p[0], p[1], dir, pad ?? 10));
      });
      return out;
    }
    // Polygon side labels: labels[i] goes outside the midpoint of side pts[i]→pts[i+1]; null skips. Returns an array of text items
    sideLabels(pts, labels, o = {}) {
      const n = pts.length, out = [];
      const cx = pts.reduce((s, p) => s + p[0], 0) / n, cy = pts.reduce((s, p) => s + p[1], 0) / n;
      labels.forEach((lab, i) => {
        if (lab == null) return;
        const p = pts[i], q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        let nv = [-(q[1] - p[1]), q[0] - p[0]];
        if (nv[0] * (m[0] - cx) + nv[1] * (m[1] - cy) < 0) nv = [-nv[0], -nv[1]];
        const { pad, ...rest } = o;
        const it = this.text(String(lab), { size: 44, ...rest, at: out.length ? undefined : o.at, x: m[0], y: m[1], align: 'center', valign: 'middle' });
        out.push(this._placeOut(it, m[0], m[1], nv, pad ?? 12));
      });
      return out;
    }

    // Coordinate axes: returns {toScreen(x,y), plot(fn,o), point(x,y,o), items}
    axes(o = {}) {
      const { x = 300, y = 200, w = 800, h = 500 } = o;
      const [x0, x1] = o.xRange || [0, 10], [y0, y1] = o.yRange || [0, 10];
      const toScreen = (dx, dy) => [x + ((dx - x0) / (x1 - x0)) * w, y + h - ((dy - y0) / (y1 - y0)) * h];
      const [ox, oy] = toScreen(clamp(0, x0, x1), clamp(0, y0, y1));
      const color = o.color || 'ink', width = o.width ?? 4;
      const items = [];
      items.push(this.arrow(x - 10, oy, x + w + 40, oy, { color, width, head: 18, at: o.at, dur: o.dur ?? 0.6 }));
      items.push(this.arrow(ox, y + h + 10, ox, y - 40, { color, width, head: 18, dur: o.dur ?? 0.6 }));
      const ls = o.labelSize ?? 40;
      if (o.xLabel) items.push(this.text(o.xLabel, { x: x + w + 50, y: oy + 10, size: ls, color }));
      if (o.yLabel) items.push(this.text(o.yLabel, { x: ox - 16, y: y - 50, size: ls, color, anchor: 'right' }));
      const board = this;
      return {
        items, toScreen,
        get end() { return items[items.length - 1].end; },
        plot(fn, po = {}) {
          const a = po.from ?? x0, b = po.to ?? x1, n = po.samples ?? 160;
          const pts = [];
          for (let i = 0; i <= n; i++) {
            const dx = lerp(a, b, i / n), dy = fn(dx);
            if (Number.isFinite(dy) && dy >= y0 - (y1 - y0) * 0.2 && dy <= y1 + (y1 - y0) * 0.2) pts.push(toScreen(dx, dy));
          }
          return new Strokes(board, [{ pts, exact: true }], { color: 'blue', width: 6, ...po });
        },
        point(dx, dy, po = {}) { const [sx, sy] = toScreen(dx, dy); return board.dot(sx, sy, { color: 'red', ...po }); },
      };
    }

    // ---------- Cover: the video's first frame is a complete cover; it holds for `hold` seconds, then fades into the whiteboard ----------
    // o: title (supports {red:keyword}), subtitle, tag (small label at the top left), hold (default 1.3 s)
    // Returns { hold, end, area, add(item) }: area is the region below the title reserved for the main visual;
    // draw the main visual (illustration, character) with hud: true, at: 0, dur: 0 and pass it to add(); it fades out together with the cover.
    cover(o = {}) {
      const W = this.W, H = this.H, hold = o.hold ?? 1.3, fade = 0.4;
      const items = [];
      const keep = (it) => { items.push(it); return it; };
      keep(new PanelItem(this, { hud: true, at: 0, overlap: true }));
      keep(this.rect(64, 64, W - 128, H - 128, { hud: true, at: 0, dur: 0, color: o.color ?? 'ink', width: 5, rough: 0.8, overlap: true }));
      // Title: try font sizes from large to small until it fits on one line (minimum 88)
      let title = null;
      for (const size of [150, 136, 124, 112, 100, 88]) {
        title = this.text(o.title || '', { hud: true, x: W / 2, y: o.titleY ?? (o.tag ? 310 : 250), size, align: 'center', valign: 'middle', at: 0, dur: 0 });
        if (title.box.w <= W - 300 || size === 88) break;
        title.node.remove(); this.items.pop();
      }
      keep(title);
      let bottom = title.box.y + title.box.h;
      if (o.subtitle) {
        const sub = keep(this.text(o.subtitle, { hud: true, x: W / 2, y: bottom + 24, size: o.subtitleSize ?? 56, align: 'center', color: 'gray', at: 0, dur: 0 }));
        bottom = sub.box.y + sub.box.h;
      }
      if (o.tag) keep(this.note(o.tag, { hud: true, x: 104, y: 96, w: Math.min(420, 60 + o.tag.length * 40), size: 36, color: 'yellow', rotate: -3, at: 0, dur: 0 }));
      items.forEach((it) => it.erase(hold, fade));
      this.coverHold = hold;
      this.coverEnd = hold + fade;
      this.cursor = Math.max(this.cursor, this.coverEnd);
      const area = { x: 160, y: bottom + 40, w: W - 320, h: H - 110 - (bottom + 40) };
      return {
        hold, end: hold + fade, area, items,
        add: (it) => { (it.items || [it]).forEach((x) => { x.coverPart = true; x.erase(hold, fade); }); items.push(it); return it; },
      };
    }

    // ---------- Pile, sprinkle, timer, level ----------
    // Piles non-overlapping small things (chunks, beans, pebbles…) inside an area, drawn back to front.
    // o: count, size, shape (a name from SHAPES) or make(x, y, size, r, i) returning your own {d, color, fill}, color, fill, seed, gap
    pile(area, o = {}) {
      const seed = o.seed ?? this.nextSeed(), r = rng(seed + 7), size = o.size ?? 36;
      // Each shape's size varies between 0.85–1.15× size; a gap of 1.2× keeps them from overlapping
      const pts = scatterPoints(area, { count: o.count ?? 12, gap: o.gap ?? size * 1.2, seed }).sort((p, q) => p[1] - q[1] || p[0] - q[0]);
      const make = o.make || SHAPES[o.shape || 'chunk'];
      const list = pts.map((p, i) => ({ ...make(p[0], p[1], size * (0.85 + r() * 0.3), r, i) }));
      const it = this.path(list, { width: Math.min(3.5, Math.max(2, size / 11)), fill: o.fill ?? '#FFFFFF', ...o });
      it.kind = 'pile';
      return it;
    }
    // Sprinkle a handful of small things (chopped scallions, salt grains, bubbles, snowflakes…): roughly even, random distribution, appearing one after another
    sprinkle(area, o = {}) {
      const seed = o.seed ?? this.nextSeed(), r = rng(seed + 7), size = o.size ?? 12;
      const pts = scatterPoints(area, { count: o.count ?? 14, gap: o.gap ?? size * 1.3, seed });
      const make = o.make || SHAPES[o.shape || 'ring'];
      const color = o.color ?? 'green';
      const list = pts.map((p, i) => {
        const sh = make(p[0], p[1], size * (0.8 + r() * 0.4), r, i);
        return { ...sh, fill: sh.dot ? col(color) : sh.open ? undefined : o.fill ?? '#FFFFFF' };
      });
      const it = this.path(list, { width: 3, rough: 0.4, ...o, color, fill: undefined, dur: o.dur ?? Math.min(1.2, 0.08 * list.length + 0.2) });
      it.kind = 'sprinkle';
      return it;
    }
    // Timer: a small clock + text (e.g. "2 minutes"); after drawing, the minute hand sweeps a full turn
    timer(x, y, o = {}) {
      const R = o.r ?? 40, color = o.color ?? 'ink', at = o.at ?? this.cursor;
      const face = this.path([circleD(x, y, R), ...[0, 1, 2, 3].map((k) => { const a = (k * Math.PI) / 2; return `M${x + Math.cos(a) * R * 0.78},${y + Math.sin(a) * R * 0.78} L${x + Math.cos(a) * R * 0.92},${y + Math.sin(a) * R * 0.92}`; })], { color, width: 4, rough: 0.4, at, dur: o.dur ?? 0.45, fill: o.fill ?? '#FFFFFF' });
      const hour = this.line(x, y, x + R * 0.42, y + R * 0.12, { color, width: 4.5, rough: 0, at: face, dur: 0.12 });
      const hand = this.line(x, y, x, y - R * 0.66, { color: o.handColor ?? 'red', width: 4.5, rough: 0, dur: 0.12 });
      if (o.sweep !== false) hand.transform(hand.end + 0.05, { rotate: 360, origin: [x, y] }, 0.9, ease.inOut);
      const items = [face, hour, hand];
      if (o.label) items.push(this.text(o.label, { x: x + R + 14, y, valign: 'middle', size: o.size ?? Math.round(R * 1.05), color: o.labelColor ?? color, at: hand, delay: 0.05 }));
      return groupOf(items, 'timer');
    }
    // Level: "which setting" info such as heat / strength / difficulty. icon: 'flame' | 'bar' | 'star'; the first `level` icons light up, the rest are gray outlines
    level(x, y, o = {}) {
      const max = o.max ?? 3, lv = o.level ?? 1, s = o.size ?? 40, icon = o.icon ?? 'bar', color = o.color ?? 'red';
      const at = o.at ?? this.cursor;
      const items = [];
      for (let i = 0; i < max; i++) {
        const cx = x + i * s * 1.15, on = i < lv;
        let d;
        // Flame: round bottom, curved tip, outer flame + inner flame
        if (icon === 'flame') d = [`M${cx},${y + s * 0.45} C${cx - s * 0.42},${y + s * 0.45} ${cx - s * 0.45},${y + s * 0.05} ${cx - s * 0.2},${y - s * 0.2} C${cx - s * 0.12},${y - s * 0.28} ${cx - s * 0.12},${y - s * 0.42} ${cx - s * 0.05},${y - s * 0.58} C${cx + s * 0.22},${y - s * 0.36} ${cx + s * 0.46},${y - s * 0.14} ${cx + s * 0.42},${y + s * 0.12} C${cx + s * 0.4},${y + s * 0.38} ${cx + s * 0.2},${y + s * 0.45} ${cx},${y + s * 0.45} Z`, `M${cx},${y + s * 0.36} C${cx - s * 0.17},${y + s * 0.33} ${cx - s * 0.14},${y + s * 0.08} ${cx + s * 0.02},${y - s * 0.1} C${cx + s * 0.12},${y + s * 0.1} ${cx + s * 0.17},${y + s * 0.3} ${cx},${y + s * 0.36} Z`];
        else if (icon === 'star') d = `M${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = (k % 2 ? 0.22 : 0.5) * s; return `${cx + Math.cos(a) * rr},${y + Math.sin(a) * rr}`; }).join('L')}Z`;
        else { const h = s * (0.35 + (0.65 * (i + 1)) / max); d = `M${cx - s * 0.3},${y + s * 0.5} L${cx - s * 0.3},${y + s * 0.5 - h} L${cx + s * 0.3},${y + s * 0.5 - h} L${cx + s * 0.3},${y + s * 0.5} Z`; }
        const parts = [].concat(d).map((dd, k) => ({ d: dd, fill: on ? (k ? '#FFD166' : col(color)) : undefined }));
        items.push(this.path(parts, { color: on ? color : '#B9BCC2', fillOpacity: 0.9, width: 3.5, rough: 0.4, at: i ? items[i - 1] : at, dur: 0.18 }));
      }
      if (o.label) items.push(this.text(o.label, { x: x + (max - 1) * s * 1.15 + s * 0.6, y, valign: 'middle', size: o.labelSize ?? Math.round(s * 1.05), color: o.labelColor ?? color, at: items[items.length - 1], delay: 0.05 }));
      return groupOf(items, 'level');
    }

    // ---------- Ending overview: zoom out to the whole whiteboard and number the parts in order ①②③… ----------
    // Each segment (by chapter when there are chapters, otherwise by where the camera held) gets a number badge next to its area on the board, and dashed arrows connect them in narration order.
    // When the camera held at several different places within one chapter, they are numbered 2-1, 2-2, 2-3… in hold order, so the path within the chapter is visible.
    // Call it at the end of build: the framing includes everything on the board at the end; segmentation only counts content drawn before the overview shot starts (at).
    // o: at, dur (zoom-out duration, default 2), hold (minimum seconds to hold after all badges are drawn, default 3; the video is extended automatically),
    //    margin (blank margin around the frame for the badges, in screen pixels, default 100), pad (extra padding, in board pixels, default 0), numbers, route, color
    overview(o = {}) {
      const at = o.at ?? this.cursor, dur = o.dur ?? 2;
      const T = this.T;
      const chapters = T && T.chapters.length >= 2;
      let spans;
      if (chapters) {
        // Split each chapter further by camera moves (the start of each camera move is a boundary)
        spans = T.chapters.flatMap((c, ci) => {
          const cuts = this.moves.filter((m) => m.at > c.start && m.at < Math.min(c.end, at)).map((m) => m.at);
          return [c.start, ...cuts].map((t0, k, a) => ({ title: c.title, num: ci + 1, t0, t1: k + 1 < a.length ? a[k + 1] : c.end }));
        });
      } else {
        const stops = this.moves.filter((m) => m.at < at).map((m) => m.at);
        spans = [0, ...stops].map((t0, i, a) => ({ title: '', t0, t1: i + 1 < a.length ? a[i + 1] : at }));
      }
      // Framing: everything still on the board at the end; segmentation: only what was drawn before the overview shot starts
      const dur0 = this.duration;
      const kept = (i) => !i.o.hud && i.box && !i.o.noOverview && (i.exits.length === 0 || Math.min(...i.exits.map((x) => x.at)) > dur0);
      const shown = (i) => kept(i) && i.start < at;
      const boxAt = (i) => {
        const b = i.boxAt(at);
        if (!i.cropRect && !i.o.crop) return b;
        const c = this.camAt(i.done), r = { x: c.x - this.W / 2 / c.zoom, y: c.y - this.H / 2 / c.zoom, w: this.W / c.zoom, h: this.H / c.zoom };
        const x = Math.max(r.x, b.x), y = Math.max(r.y, b.y);
        return { x, y, w: Math.min(r.x + r.w, b.x + b.w) - x, h: Math.min(r.y + r.h, b.y + b.h) - y };
      };
      const items = this.items.filter(shown);
      const keptItems = this.items.filter(kept);
      const near = (a, c, g) => a.x - g < c.x + c.w && c.x - g < a.x + a.w && a.y - g < c.y + c.h && c.y - g < a.y + a.h;
      const regions = [];
      for (const sp of spans) {
        const its = items.filter((i) => i.start >= sp.t0 && i.start < sp.t1);
        if (!its.length) continue;
        const box = unionBox(its.map(boxAt)), prev = regions[regions.length - 1];
        // Within the same chapter the camera only zoomed in/out without moving elsewhere: merge into one region
        if (prev && sp.num && prev.num === sp.num && near(prev.box, box, 40)) prev.box = unionBox([prev.box, box]);
        else regions.push({ ...sp, box });
      }
      if (chapters) {
        const count = {};
        regions.forEach((rg) => { count[rg.num] = (count[rg.num] || 0) + 1; });
        const seen = {};
        regions.forEach((rg) => { seen[rg.num] = (seen[rg.num] || 0) + 1; rg.label = count[rg.num] > 1 ? `${rg.num}-${seen[rg.num]}` : String(rg.num); });
      } else regions.forEach((rg, i) => { rg.label = String(i + 1); });
      const all = unionBox(keptItems.map(boxAt));
      // Camera: like focus, avoid the progress bar and captions; leave a margin in screen pixels around the edges for badges (the smaller the zoom, the more board space it takes)
      const numbers = o.numbers !== false && regions.length >= 2;
      const margin = o.margin ?? (numbers ? 100 : 60), pad = o.pad ?? 0;
      const top = this.chapterZone || 0, bottom = this.capEl ? 150 : 0, availH = this.H - top - bottom;
      const zoom = Math.min(1, (this.W - margin * 2) / (all.w + pad * 2), (availH - margin * 2) / (all.h + pad * 2));
      const camX = all.x + all.w / 2, camY = all.y + all.h / 2 - (top + availH / 2 - this.H / 2) / zoom;
      this.camera(at, { x: camX, y: camY, zoom }, dur);
      this.endHold = at + dur + (o.hold ?? 3);
      if (!numbers) return this;
      // Number badges: about 30 px radius on screen, converted to board size using the overview zoom
      const R = 30 / zoom, fs = 36 / zoom, color = o.color ?? 'red';
      const view = { x: camX - this.W / 2 / zoom, y: camY - this.H / 2 / zoom + top / zoom, w: this.W / zoom, h: availH / zoom };
      // Auto-find a free spot: pick candidate positions around the region, choosing one that covers no content, stays in the safe area, and doesn't overlap other badges;
      // if none exists, choose the position with the least overlap and pull it back into the frame (better to cover a little content than to be cropped off)
      const obstacles = keptItems.map(boxAt);
      const placed = [];
      const inter = (a, c) => Math.max(0, Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x)) * Math.max(0, Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y));
      const inset = R * 1.2;
      const inView = (c) => [clamp(c[0], view.x + inset, view.x + view.w - inset), clamp(c[1], view.y + inset, view.y + view.h - inset)];
      const clash = (c) => {
        const bb = { x: c[0] - R * 1.15, y: c[1] - R * 1.15, w: R * 2.3, h: R * 2.3 };
        return [...obstacles, ...placed].reduce((a, ob) => a + inter(bb, ob), 0);
      };
      // Pacing: badges and arrows are drawn alternately (like walking the route), about 5 seconds total; faster per step when there are many regions
      const t0 = at + dur + 0.2, step = clamp(5 / regions.length, 0.3, 0.7);
      const badges = regions.map((rg) => {
        const b = rg.box, cands = [];
        for (const k of [1.3, 2.2, 3.2]) {
          cands.push([b.x - R * k, b.y - R * k], [b.x + R * 0.5, b.y - R * k], [b.x - R * k, b.y + R * 0.5], [b.x - R * k, b.y + b.h / 2], [b.x + b.w / 2, b.y - R * k], [b.x + b.w + R * k, b.y - R * k], [b.x - R * k, b.y + b.h + R * k], [b.x + b.w + R * k, b.y + b.h / 2], [b.x + b.w / 2, b.y + b.h + R * k]);
        }
        let best = null, bestScore = Infinity;
        for (const c0 of cands) {
          const c = inView(c0);
          // Candidates that had to be moved end up farther from the region, so they get a small penalty
          const sc = clash(c) + (c[0] !== c0[0] || c[1] !== c0[1] ? R * R * 0.5 : 0);
          if (sc < bestScore) { best = c; bestScore = sc; }
          if (sc === 0) break;
        }
        const [cx, cy] = best;
        placed.push({ x: cx - R * 1.15, y: cy - R * 1.15, w: R * 2.3, h: R * 2.3 });
        return { cx, cy, label: rg.label };
      });
      let t = t0;
      badges.forEach((bd, i) => {
        const ta = t0 + i * step;
        const ring = this.circle(bd.cx, bd.cy, R, { color, width: 5 / zoom, fill: '#FFFFFF', fillOpacity: 1, turns: 1.05, drift: 0, rough: 0.3, at: ta, dur: step * 0.4, overlap: true, noOverview: true });
        const num = this.text(bd.label, { x: bd.cx, y: bd.cy, size: fs * (bd.label.length > 2 ? 0.72 : 1.1), align: 'center', valign: 'middle', color, font: 'en', at: ring, dur: 0.08, overlap: true, noOverview: true });
        t = Math.max(t, num.end);
      });
      // Prefix the chapter titles in the top progress bar with their numbers; the exported board overview also gets a legend at the top
      this.overviewNumbers = { at: at + dur, titles: chapters ? T.chapters.map((c) => c.title) : regions.map((rg) => rg.title) };
      // Dashed arrows connecting the badges in order
      if (o.route !== false) {
        for (let i = 0; i + 1 < badges.length; i++) {
          const a = badges[i], b = badges[i + 1], L = Math.hypot(b.cx - a.cx, b.cy - a.cy) || 1;
          const ux = (b.cx - a.cx) / L, uy = (b.cy - a.cy) / L;
          const x1 = a.cx + ux * R * 1.3, y1 = a.cy + uy * R * 1.3, x2 = b.cx - ux * R * 1.3, y2 = b.cy - uy * R * 1.3;
          // Auto-pick the bend: among several bends, choose the one crossing the least content
          const hits = (bend) => {
            const mx = (x1 + x2) / 2 - uy * bend * L, my = (y1 + y2) / 2 + ux * bend * L;
            let n = 0;
            for (let k = 1; k < 20; k++) {
              const u = k / 20, v = 1 - u, px = v * v * x1 + 2 * v * u * mx + u * u * x2, py = v * v * y1 + 2 * v * u * my + u * u * y2;
              if (obstacles.some((ob) => px > ob.x && px < ob.x + ob.w && py > ob.y && py < ob.y + ob.h)) n++;
            }
            return n + Math.abs(bend) * 2;
          };
          const bend = [0.12, -0.12, 0.25, -0.25, 0.4, -0.4, 0].reduce((best, bd) => (hits(bd) < hits(best) ? bd : best), 0.12);
          const ar = this.arrow(x1, y1, x2, y2, { color: 'gray', width: 3 / zoom, head: 16 / zoom, dash: [14 / zoom, 12 / zoom], bend, at: t0 + i * step + step * 0.5, dur: step * 0.5, overlap: true, noOverview: true });
          t = Math.max(t, ar.end);
        }
      }
      this.endHold = Math.max(this.endHold, t + (o.hold ?? 3));
      return this;
    }

    // Erase several items at once ('all' = everything that has appeared so far)
    erase(items, at, dur = 0.5) {
      at = at ?? this.cursor;
      const list = items === 'all' ? this.items.filter((i) => i.start < at && !i.o.hud) : items;
      list.forEach((i) => i.erase(at, dur));
      this.cursor = Math.max(this.cursor, at + dur);
      return this;
    }

    // Final look of the whole board (for exporting the large image): everything fully drawn, without screen-fixed layers like captions and the progress bar
    snapshot(pad = 100) {
      const T = this.duration;
      this.render(T);
      const boxes = this.items.filter((i) => !i.o.hud && i._vis && i.box).map((i) => {
        const b = i.boxAt(T);
        if (!i.cropRect) return b;
        const r = i.cropRect, x = Math.max(r.x, b.x), y = Math.max(r.y, b.y);
        return { x, y, w: Math.min(r.x + r.w, b.x + b.w) - x, h: Math.min(r.y + r.h, b.y + b.h) - y };
      });
      let b = unionBox(boxes);
      // When there are order badges, write a one-line legend above the image: ① chapter title ② chapter title …
      const titles = this.overviewNumbers ? this.overviewNumbers.titles.filter(Boolean) : [];
      if (titles.length) {
        const lg = document.createElement('div');
        lg.className = 'wb-text';
        lg.style.cssText = `font-family:${this.fonts.hand};font-size:${Math.round(Math.max(56, b.w / 45))}px;color:${COLORS.red};left:${b.x}px;top:0px`;
        lg.textContent = titles.map((tt, i) => `${'①②③④⑤⑥⑦⑧⑨⑩⑪⑫'[i] || i + 1} ${tt}`).join('    ');
        this.html.appendChild(lg);
        const lh = lg.offsetHeight;
        lg.style.top = b.y - lh - 60 + 'px';
        b = unionBox([b, { x: b.x, y: b.y - lh - 60, w: lg.offsetWidth, h: lh }]);
      }
      const w = Math.ceil(b.w + 2 * pad), h = Math.ceil(b.h + 2 * pad);
      this.stage.style.width = w + 'px';
      this.stage.style.height = h + 'px';
      this.world.style.transform = `translate(${pad - b.x}px, ${pad - b.y}px)`;
      if (this.paperKind !== 'plain') {
        this.paper.style.backgroundSize = `${this.gridSize}px ${this.gridSize}px`;
        this.paper.style.backgroundPosition = `${pad - b.x}px ${pad - b.y}px`;
      }
      this.hud.style.display = 'none';
      return { w, h, label: 'Board overview' };
    }

    get duration() {
      const last = Math.max(0, ...this.items.map((i) => i.end + (i.hasFill ? 0.35 : 0)));
      // Hold at least 2 seconds after the last stroke; with an ending overview, hold at least `hold` seconds after the badges (the video is extended automatically so it doesn't end before viewers finish looking)
      return Math.max(this.T ? this.T.duration : 0, last + 2, this.endHold || 0);
    }

    render(t) {
      this.applyCamera(this.camAt(t));
      for (const it of this.items) it.update(t);
      if (this.capEl) this.renderCaptions(t);
      if (this.chs) this.renderChapters(t);
    }
  }

  // Tag items created by drawing methods with a kind (used in lint check reports); annotation items are expected to overlap other things
  const KINDS = { line: 'line', polyline: 'polyline', curve: 'curve', path: 'illustration', sketch: 'illustration', arrow: 'arrow', rect: 'rectangle', ellipse: 'ellipse', circle: 'circle', circleAround: 'circle annotation', boxAround: 'box annotation', underline: 'underline', strike: 'strikethrough', check: 'check mark', cross: 'cross', brace: 'brace', vbrace: 'brace', highlight: 'highlighter', dot: 'dot', angleMark: 'angle mark', tickMark: 'tick mark' };
  const ANNOT = new Set(['circleAround', 'boxAround', 'underline', 'strike', 'highlight', 'angleMark', 'tickMark']);
  for (const [m, label] of Object.entries(KINDS)) {
    const f = Board.prototype[m];
    Board.prototype[m] = function (...a) {
      const it = f.apply(this, a);
      if (it instanceof Item) {
        it.kind = label;
        it.annot = ANNOT.has(m);
        // Lines, circle annotations and arrows drawn over a photo / video (photos sit in the text layer, above the ink): automatically moved to the top layer so the photo doesn't cover them
        const hit = (a, c) => a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
        if (m !== 'highlight' && !it.o.hud && !it.o.layer && it.box && it.node && it.node.parentNode === this.inkSvg && this.items.some((i) => i.isMedia && !i.o.hud && hit(i.box, it.box))) this.topSvg.appendChild(it.node);
      }
      return it;
    };
  }

  // ---------- Lint check ----------
  // Finds problems that only show up "in motion": erased before finished, held too briefly, drawn off-frame, covering captions, moving the camera while drawing, overlapping each other…
  // Returns [{ level: 'error'|'warn', t, src, what, msg }]
  Board.prototype.project = function (box, t, hud) {
    if (hud) return { ...box };
    const c = this.camAt(t);
    return { x: (box.x - c.x) * c.zoom + this.W / 2, y: (box.y - c.y) * c.zoom + this.H / 2, w: box.w * c.zoom, h: box.h * c.zoom };
  };
  Board.prototype.lint = function () {
    const out = [];
    const add = (level, t, it, msg) => out.push({ level, t: Math.round(t * 100) / 100, src: it ? it.src : '', what: it ? it.describe() : '', msg });
    const W = this.W, H = this.H, dur = this.duration;
    const fat = (r) => ({ x: r.x - 1, y: r.y - 1, w: r.w + 2, h: r.h + 2 }); // a thin line's bounding box can have zero height
    const inter = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const gone = (it) => (it.exits.length ? Math.min(...it.exits.map((x) => x.at)) : Infinity);
    for (const it of this.items) {
      const done = it.done;
      // 1. Erase timing
      for (const x of it.exits) {
        if (x.at <= it.start) add('error', it.start, it, 'erased before it even starts drawing; viewers will never see it');
        else if (x.at < done - 0.05) add('error', x.at, it, `erase starts before drawing finishes (only ${Math.round(((x.at - it.start) / (done - it.start)) * 100)}% drawn)`);
        else if (x.at - done < 0.6) add('warn', x.at, it, `erased only ${(x.at - done).toFixed(1)} s after drawing finishes; viewers don't have time to see it`);
      }
      // 2. Beyond the video duration
      if (it.start >= dur) add('error', it.start, it, 'start time is past the total video duration');
      else if (done > dur + 0.01) add('warn', done, it, 'still not finished drawing when the video ends');
      if (!it.box || it.start >= gone(it)) continue;
      // 3. Whether it is in frame while drawn (o.crop = true means only part is shown on purpose)
      if (!it.o.crop) {
        const t = Math.min(done, dur - 0.01);
        const r = fat(this.project(it.boxAt(t), t, it.o.hud));
        const area = Math.max(1, r.w * r.h);
        const visible = inter(r, { x: 0, y: 0, w: W, h: H }) / area;
        if (visible < 0.02) add('error', t, it, 'completely out of frame when drawing finishes (the camera is not pointed at it)');
        else if (visible < 0.97) add('warn', t, it, `${Math.round((1 - visible) * 100)}% is out of frame when drawing finishes and gets cropped`);
        // 4a. Covers the chapter progress bar at the top
        if (this.chapterZone && !it.annot && gone(it) > (this.coverEnd || 0) + 0.01 && r.y < this.chapterZone && r.y + r.h > 0 && r.x < W - 60 && r.x + r.w > 60) {
          add('warn', t, it, `overlaps the chapter progress bar at the top (the top ${this.chapterZone} px of the screen)`);
        }
        // 4. Covers the caption area
        if (this.capEl && !it.annot && r.y + r.h > H - 140 && r.x < W - 260 && r.x + r.w > 260 && this.caps.some((c) => c.end > it.start && c.start < gone(it))) {
          add('warn', t, it, 'overlaps the caption area at the bottom (the bottom 140 px of the screen)');
        }
      }
      // 5. Moving the camera while drawing
      if (!it.o.hud) {
        for (const m of this.moves) {
          const ov = Math.min(it.end, m.at + m.dur) - Math.max(it.start, m.at);
          if (ov > 0.3 && ov > 0.4 * it.dur) { add('warn', Math.max(it.start, m.at), it, `starts drawing while the camera is still moving (${ov.toFixed(1)} s of overlap); move the camera first, then draw`); break; }
        }
      }
    }
    // 6. Overlap between solid items (o.overlap = true means stacked on purpose)
    const solid = this.items.filter((i) => i.box && !i.o.overlap && (['text', 'formula', 'sticky note', 'character', 'speech bubble', 'image'].includes(i.kind) || (i.kind === 'illustration' && i.hasFill)));
    for (let a = 0; a < solid.length; a++) {
      for (let b = a + 1; b < solid.length; b++) {
        const A = solid[a], B = solid[b];
        const t0 = Math.max(A.start, B.start), t1 = Math.min(gone(A), gone(B), dur);
        if (t1 <= t0) continue;
        if (!!A.o.hud !== !!B.o.hud) {
          // Screen-fixed item vs. board item: compare positions when both are visible and the camera has settled
          const [hu, wo] = A.o.hud ? [A, B] : [B, A];
          const t = Math.min(t1 - 0.01, Math.max(t0, hu.done));
          const w = this.project(wo.boxAt(t), t), o = inter(hu.boxAt(t), w) / Math.max(1, w.w * w.h);
          if (o > 0.12) add('warn', t, hu, `fixed on screen, covers ${wo.describe()} (${wo.src}) on the board by ${Math.round(o * 100)}%`);
          continue;
        }
        // Items can move: check positions at the start and end of their shared time span and at the end of every move
        const times = [t0 + 0.01, t1 - 0.01, ...[A, B].flatMap((it) => it.moves.map((m) => m.at + m.dur)).filter((t) => t > t0 && t < t1)];
        let worst = 0, when = t0;
        for (const t of times) {
          const a = A.boxAt(t), c = B.boxAt(t);
          const r = inter(a, c) / (Math.min(a.w * a.h, c.w * c.h) || 1);
          if (r > worst) { worst = r; when = t; }
        }
        if (worst > 0.12) add('warn', when, B, `overlaps ${A.describe()} (${A.src}) by ${Math.round(worst * 100)}%`);
      }
    }
    // 8. Camera "bleed": cutting to a new region brings in content from elsewhere
    const frame = { x: 0, y: 0, w: W, h: H };
    const visAt = (it, t) => {
      if (it.o.hud || !it.box || t < it.start || t >= gone(it)) return 0;
      const r = fat(this.project(it.boxAt(t), t));
      return inter(r, frame) / Math.max(1, r.w * r.h);
    };
    const world = this.items.filter((i) => !i.o.hud && !i.o.crop && i.box);
    for (const m of this.moves) {
      if (m.dur <= 0) continue;
      const t0 = m.at - 0.01, t1 = m.at + m.dur + 0.01;
      // 8a. After the camera stops, part of something drawn earlier peeks in at the frame edge
      for (const it of world) {
        if (it.start >= m.at) continue;
        const v = visAt(it, t1);
        if (v > 0.01 && v < 0.9) add('warn', t1, it, `after the camera stops, part of it (${Math.round(v * 100)}%) shows at the frame edge, as if the previous section "bled" into this shot`);
      }
      // 8b. During a camera move, it sweeps over content visible at neither the start nor the end (another region lies in between)
      const swept = world.filter((it) => visAt(it, t0) === 0 && visAt(it, t1) === 0 &&
        [0.25, 0.5, 0.75].some((k) => visAt(it, m.at + m.dur * k) > 0.05));
      if (swept.length) {
        const names = swept.slice(0, 3).map((i) => i.describe()).join(', ');
        out.push({ level: 'warn', t: Math.round(m.at * 100) / 100, src: '', what: 'camera move', msg: `sweeps over ${swept.length} item(s) from other regions on the way (${names}${swept.length > 3 ? ', etc.' : ''}). Lay out the regions in order along the camera route so each move only goes to an adjacent region, or use dur: 0 to cut straight there` });
      }
    }
    // 9. Cover: the first frame shouldn't be blank; narration and drawing shouldn't start before the cover is dismissed
    const lines = this.T ? this.T.lines.filter((l) => !l.silence && l.text) : [];
    if (!this.coverHold) {
      if (!this.items.some((i) => i.start <= 0.05)) out.push({ level: 'warn', t: 0, src: '', what: 'first frame', msg: 'the first frame is blank. Many platforms use the first frame as the cover by default; consider making one with b.cover()' });
    } else {
      if (lines.length && lines[0].start < this.coverEnd) out.push({ level: 'warn', t: lines[0].start, src: '', what: 'cover', msg: `narration starts before the cover is dismissed: increase lead_in in script.json by ${(this.coverEnd - lines[0].start + 0.2).toFixed(1)} s` });
      for (const it of this.items) {
        if (it.o.hud || it.coverPart || it.start >= this.coverEnd - 0.05) continue;
        add('warn', it.start, it, 'starts drawing before the cover is dismissed and will be hidden by it');
      }
    }
    // 7. Each item's own checks (e.g. a character pointing at a target that is off-frame)
    for (const it of this.items) if (it.lint) it.lint(add);
    return out.sort((a, b) => a.t - b.t);
  };

  window.WB = {
    Board, COLORS, HL, NOTE, FONTS, board: (o) => new Board(o), unionBox,
    // Internal helpers for extension modules (e.g. character.js)
    _: { Item, svgEl, col, smoothD, wobble, samplePathD, boxOf },
    SHAPES, scatterPoints,
  };
})();
