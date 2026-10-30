// tapestry.js: the Bayeux-Tapestry embroidered scroll (贝叶挂毯 · 中世纪刺绣长卷) style, one of bb-video's visual styles (style notes in styles/tapestry/STYLE.md). Load after promo.js.
// One frame: a window on one long strip of undyed linen (plain weave you can see), lit warm in the middle and darker at the edges. Everything on
// it is embroidered in a few wool colours (terracotta, ochre, olive, sage, blue-green, grey-blue, dark blue): outlines in stem stitch (a chain of
// short slanted overlapping stitches along the path), fills in laid-and-couched work (parallel threads in one direction, slightly uneven, held
// down by couching bars with small ticks), faces and hands left as bare linen inside their outline. An upper and a lower border of birds and
// beasts in panels between diagonal bars runs along the whole cloth; a stitched green ground line under the figures; coloured hem stripes.
// Flat side-on figures (big heads and noses, tunics, cloaks, cross-gartered legs) make big gestures; stylised trees with curling branches and
// leaf fans divide the scenes; an act opens under a tree-branch arch with its title; running captions are stitched letters with a smaller line
// under them; modern things are drawn in the same stitched idiom.
// Motion: the next scene is drafted ahead as a faint pencil underdrawing; things stitch themselves on (the needle runs along the outline, then
// the laid threads go in one by one and are couched); the camera scrolls along the cloth without stopping and pushes in until threads read.
// Every thread is seeded and anchored to its shape: nothing shimmers between frames.
//
//   const B = PROMO.tapestry(F, { palette: 'bayeux' | 'faded', colors, speed: 1, sketch: 1.1, light: 1, captions, chapters, maxText, seed })
//   World units: 1 unit = 1 px of a 1080-high frame at the band framing (landscape). y grows downward; the ground line is y = 0 (figures stand on it).
//     The cloth: upper border y -688…-590, the picture -590…0, lower border 30…128, hem stripes 132…156. Portrait frames the same band taller (zoom 1.37).
//   TONES   linen ink red ochre olive sage green blue navy brown salmon cream grey   (or any css hex: more than two outside the palette are flagged)
//   SHAPES  B.shape({ d }) closed (laid fill + stem outline)  B.line({ d | pts, w }) open (stem stitch, or a laid band when w > 7)  B.rect B.circle B.ellipse B.poly B.dot
//           every node: { x, y, rot, sx, sy, alpha, fill, edge, dir (thread angle, degrees), w, at, until, enter, inDur, exit, z, in: group, sketch }
//           enter: 'stitch' (outline, then fill, then couching) | 'lay' (fill first, outline last) | 'grow' (lines from their start; groups part after part) | 'fade' | 'none'
//           exit: 'unpick' (the stitches come out in reverse) | 'fade'   node.to(at, { x, y, rot, sx, sy, alpha }, dur, ease)   (any parameter can be a function of t)
//   GROUPS  B.group(o) → g.shape / g.line / g.rect / … / g.group; a stitched group stitches its parts one after another (seq: false: all at once)
//   CAST    B.cast({ Name: { tunic, cloak, hose, hair, hat, beard, robe, sex, … } })   B.figure('Name', { x, at, face, pose, h }) → c
//           c.pose(at, name, dur) · c.go(at, x, dur) · c.turn(at) · c.nod(at) · c.sit(at) · c.stand(at) · c.hand (group: put a prop in it)
//   SCENE   B.tree  B.act (arch title)  B.caption  B.hill  B.water  B.boat  B.hall  B.table  B.desk  B.book  B.roll  B.slab  B.fire  B.gear  B.wheel  B.sun  B.star  B.plant  B.bird  B.tally  B.margin
//   CAMERA  B.scroll([[t, x], …]) the cloth moves past without stopping   B.push(a, b, view, { back, backDur }) a push-in (view = { on, pad } | { x, y, z })   B.L(landscape, portrait)
// Sounds the runtime emits (styles/tapestry/sound.js): stitch, needle, lay, knot, grow, letter, unpick, push, act.
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('tapestry.js 要在 promo.js 之后加载', 'tapestry.js must load after promo.js'));
  const { E, set, el, frameT } = P;
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, q) => a + (b - a) * q;
  const sm = (q) => { q = cl(q); return q * q * (3 - 2 * q); };
  const DEG = Math.PI / 180;
  const f1 = (n) => Math.round(n * 10) / 10;
  const hex = (h) => { const s = String(h).replace('#', ''); return s.length === 3 ? s.split('').map((c) => parseInt(c + c, 16)) : [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
  const toHex = (v) => '#' + v.map((x) => Math.round(cl(x, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mixHex = (a, b, q) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => lerp(v, y[i], q))); };
  const units = (t) => { t = String(t ?? ''); return (t.match(/[^\x00-\xff]/g) || []).length + t.replace(/[^\x00-\xff]/g, '').length * 0.6; };
  const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rngOf = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  // Wool on undyed linen: the colours of the Bayeux Tapestry (terracotta, ochre, olive, sage, blue-green, grey-blue, dark blue). The frame is lit warm on top.
  const PALS = {
    bayeux: { linen: '#e2cfa3', ink: '#2c3040', red: '#b0503a', ochre: '#cf9f3e', olive: '#7d8537', sage: '#8ba083', green: '#3e7b6e', blue: '#6a87aa', navy: '#2f4574', brown: '#6b462e', salmon: '#d49076', cream: '#efe5ca', grey: '#9b978a' },
    faded: { linen: '#e2d5b6', ink: '#3a3b45', red: '#a65e4a', ochre: '#c6a356', olive: '#858a4f', sage: '#99a891', green: '#557f74', blue: '#7f93ad', navy: '#44557a', brown: '#735440', salmon: '#cc9a85', cream: '#ece3cd', grey: '#a19d92' },
  };
  const FONTS = { text: '"LXGW WenKai", "Noto Serif SC", serif', latin: '"Cinzel", "LXGW WenKai", serif' };
  const SP = 3.8, TW = 3.3, COUCH = 18, STEP = 4.6, SLEN = 8.6, SLANT = 15;   // laid-thread spacing / width, couching bar spacing, stem-stitch step / length / slant
  const LAY = { top: -688, topIn: -590, ground: 0, botIn: 30, bot: 128, hem: [132, 156], band: [-700, 162] };   // where the cloth's parts are (world units)
  const BUCKETS = [1, 1.6, 2.5, 3.6];

  // the linen: a plain weave tile (warp and weft threads of slightly different shade, slubs, a few dark fibres), world-anchored, drawn once
  const linenTile = (c0, seed, S) => {
    const N = 96, p = 2.4, n = N / p, px = Math.round(N * S), c = document.createElement('canvas'); c.width = c.height = px; const x = c.getContext('2d'), img = x.createImageData(px, px), r = rngOf(seed), base = hex(c0);
    const warp = Array.from({ length: n }, () => (r() - 0.5) * 0.07 + (r() < 0.04 ? 0.05 : 0)), weft = Array.from({ length: n }, () => (r() - 0.5) * 0.07 + (r() < 0.04 ? 0.05 : 0));
    for (let yy = 0; yy < px; yy++) for (let xx = 0; xx < px; xx++) {
      const u = xx / S, v = yy / S, i = Math.floor(u / p) % n, j = Math.floor(v / p) % n, over = (i + j) % 2 === 0, f = over ? (u / p) % 1 : (v / p) % 1, along = over ? (v / p) % 1 : (u / p) % 1;
      const prof = Math.sin(Math.PI * f) ** 0.7, dip = 0.5 + 0.5 * Math.sin(Math.PI * along), k = 0.95 + 0.055 * prof * (0.75 + 0.25 * dip) + (over ? warp[i] : weft[j]) - (over ? 0 : 0.012);
      const o = (yy * px + xx) * 4; img.data[o] = cl(base[0] * k, 0, 255); img.data[o + 1] = cl(base[1] * k, 0, 255); img.data[o + 2] = cl(base[2] * k * 0.995, 0, 255); img.data[o + 3] = 255;
    }
    x.putImageData(img, 0, 0); x.scale(S, S);
    x.globalAlpha = 0.35; for (let k = 0; k < 6; k++) { x.strokeStyle = toHex(base.map((b) => b - 70)); x.lineWidth = 0.45; const y0 = r() * N, x0 = r() * N; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(x0 + 5, y0 + (r() - 0.5) * 4, x0 + 8 + r() * 8, y0 + (r() - 0.5) * 3); x.stroke(); }
    return c;
  };
  // the satin threads for stitched DOM letters: diagonal threads, each a little lighter or darker, with a twist highlight (a seamless tile, as a data url)
  const satinTile = (c0, seed) => {
    const N = 64, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), img = x.createImageData(N, N), r = rngOf(seed), base = hex(c0), shade = Array.from({ length: 16 }, () => (r() - 0.5) * 0.22);
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      const u = (((px - py) % N) + N) % N, th = Math.floor(u / 4) % 16, f = (u % 4) / 4, edge = Math.sin(Math.PI * (f + 0.12)) ** 0.5, tw = ((px + py) % 8) / 8, hi = Math.max(0, Math.sin(2 * Math.PI * (tw - f * 0.6))) ** 3 * 0.22;
      const k = (0.66 + 0.38 * edge) * (1 + shade[th]), lift = hi * 1.6 + (edge > 0.97 ? 0.06 : 0), i = (py * N + px) * 4; for (let ch = 0; ch < 3; ch++) img.data[i + ch] = cl(lerp(base[ch] * k, 236, lift), 0, 255); img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0); return c;
  };

  // ---------- path geometry: SVG paths sampled into polylines (deterministic) ----------
  let svgP = null;
  const sampleD = (d, step = 2) => {
    if (!svgP) { const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden'; document.body.appendChild(sv); svgP = document.createElementNS('http://www.w3.org/2000/svg', 'path'); sv.appendChild(svgP); }
    svgP.setAttribute('d', d); const L = svgP.getTotalLength(), out = []; let cur = [];
    const n = Math.max(2, Math.ceil(L / step));
    for (let i = 0; i <= n; i++) { const p = svgP.getPointAtLength((L * i) / n), q = [p.x, p.y], last = cur[cur.length - 1]; if (last && Math.hypot(q[0] - last[0], q[1] - last[1]) > step * 3) { if (cur.length > 1) out.push(cur); cur = []; } cur.push(q); }
    if (cur.length > 1) out.push(cur);
    const b = svgP.getBBox();
    return { lines: out, box: [b.x, b.y, b.width, b.height] };
  };
  const polyLen = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };
  // a point and direction at arc length s along a polyline
  const along = (pts, cum, s) => { let i = 1; while (i < pts.length - 1 && cum[i] < s) i++; const a = pts[i - 1], b = pts[i], seg = Math.max(1e-6, cum[i] - cum[i - 1]), q = cl((s - cum[i - 1]) / seg); return [lerp(a[0], b[0], q), lerp(a[1], b[1], q), Math.atan2(b[1] - a[1], b[0] - a[0])]; };
  const cumOf = (pts) => { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return c; };
  // stem stitch along polylines: short slanted stitches, each starting half a stitch after the last (they overlap like a rope)
  const stemStitches = (lines, r, lw, o = {}) => {
    const out = [], step = o.step ?? STEP * (lw / 4.2) ** 0.5, len = o.len ?? SLEN * (lw / 4.2) ** 0.5;
    let total = 0; for (const pts of lines) total += polyLen(pts);
    let acc = 0;
    for (const pts of lines) {
      const cum = cumOf(pts), L = cum[cum.length - 1], n = Math.max(1, Math.round(L / step)), st = L / n, closed = Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 3;
      for (let i = 0; i < (closed ? n : Math.max(1, n - 1)); i++) {
        const s0 = i * st, s1 = Math.min(closed ? s0 + len : L, s0 + len * (1 + (r() - 0.5) * 0.14)), [x0, y0] = along(pts, cum, s0 % L), [x1, y1] = along(pts, cum, s1 > L && closed ? s1 - L : s1);
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, a = Math.atan2(y1 - y0, x1 - x0) + (SLANT + (r() - 0.5) * 6) * DEG * (o.flip ? -1 : 1), hl = Math.hypot(x1 - x0, y1 - y0) / 2, off = (r() - 0.5) * 0.5;
        out.push({ x0: mx - Math.cos(a) * hl - Math.sin(a) * off, y0: my - Math.sin(a) * hl + Math.cos(a) * off, x1: mx + Math.cos(a) * hl - Math.sin(a) * off, y1: my + Math.sin(a) * hl + Math.cos(a) * off, k: 1 + (r() - 0.5) * 0.16, u: (acc + s0) / Math.max(1, total) });
      }
      acc += L;
    }
    return out;
  };

  P.tapestry = function (F, opt = {}) {
    const W = F.W, H = F.H, PT = F.portrait, U = F.px(1), FLAT = !!opt.flat;
    const C0 = { ...(PALS[opt.palette] || PALS.bayeux), ...(opt.colors || {}) };
    const FONT = { ...FONTS, ...(opt.fonts || {}) };
    const SEED = hash(opt.seed ?? 'tapestry'), SPEED = opt.speed ?? 1, SKETCH = opt.sketch ?? 1.1;
    const B = { F, colors: C0, fonts: FONT, portrait: PT, layout: LAY, L: (land, port) => (PT && port !== undefined ? port : land) };
    const raw = new Set(), derived = new Set();
    const col = (c, d) => { if (c == null || c === false) return d == null ? null : col(d); if (C0[c]) return C0[c]; if (/^#/.test(c)) { if (!Object.values(C0).includes(c.toLowerCase()) && !derived.has(c)) raw.add(c.toLowerCase()); return c; } return c; };
    const dk = (c, q) => { const m = mixHex(col(c), C0.ink, q); derived.add(m); return m; };
    const lt = (c, q) => { const m = mixHex(col(c), '#fff6e0', q); derived.add(m); return m; };
    B.col = col;

    // ---------- layers: the world canvas (linen, borders, embroidery), world text (DOM, follows the camera), the light, the HUD ----------
    let main = null, mx = null, wl = null, hud = null;
    if (!FLAT) {
      F.stage.style.background = C0.linen;
      main = el('canvas', `left:0;top:0;width:${W}px;height:${H}px;z-index:5`, F.stage); main.width = W; main.height = H; mx = main.getContext('2d'); main.dataset.motion = 'skip';
      wl = el('div', 'left:0;top:0;width:0;height:0;z-index:10;transform-origin:0 0;pointer-events:none', F.stage); wl.dataset.motion = 'texture';
      // the light: warm in the middle, darker towards the edges (lighting on the cloth, screen-fixed)
      if ((opt.light ?? 1) > 0) { const lv = el('div', `inset:0;z-index:15;pointer-events:none;mix-blend-mode:multiply;background:radial-gradient(ellipse 72% 68% at 50% ${PT ? 44 : 46}%, rgba(255,236,200,${f1(0.2 * (opt.light ?? 1) * 100) / 100}) 30%, rgba(104,66,28,${f1(0.5 * (opt.light ?? 1) * 100) / 100}) 100%)`, F.stage); lv.dataset.motion = 'skip'; }
      hud = el('div', 'inset:0;z-index:30;pointer-events:none', F.stage);
    }
    let linenPat = null, linenS = 0;
    const linenOn = (ctx, S) => { if (!linenPat || linenS !== S) { linenPat = ctx.createPattern(linenTile(C0.linen, SEED ^ 77, S), 'repeat'); linenS = S; } return linenPat; };

    // ---------- nodes ----------
    const roots = [];
    let seq = 0, curLayer = null;
    B.into = (layer, fn) => { const prev = curLayer; curLayer = layer; if (layer && B.layerCanvas) B.layerCanvas(layer); try { return fn(); } finally { curLayer = prev; } };
    const SND = { stitch: 'stitch', lay: 'lay', grow: 'grow' };
    const node = (kind, o = {}) => {
      const n = { id: ++seq, kind, p: o, kids: [], keys: {}, parent: o.in || null, z: o.z ?? 0, ord: seq, layer: o.layer || (o.in ? null : curLayer), seed: SEED ^ hash(kind + ':' + seq + ':' + (o.seed ?? '')) };
      n.at = o.at ?? (n.parent ? -1 : 0); n.until = o.until ?? 1e9;
      n.enter = o.enter ?? (n.parent ? null : n.at <= 0 ? 'none' : kind === 'line' ? 'grow' : 'stitch');
      n.inDur = o.inDur ?? null;
      const ex = o.exit ? (typeof o.exit === 'string' ? { to: o.exit } : o.exit) : null;
      n.exit = ex ? ex.to ?? 'unpick' : 'fade'; if (ex && ex.at !== undefined) n.until = ex.at;
      n.outDur = (ex && ex.dur) ?? (n.exit === 'unpick' ? 0.8 : 0.5);
      if (n.parent) { n.parent.kids.push(n); n.layer ??= n.parent.layer; } else roots.push(n);
      for (const k of ['shape', 'line', 'rect', 'circle', 'ellipse', 'poly', 'dot', 'group']) n[k] = (o2 = {}) => B[k]({ ...o2, in: n });
      n.add = (fn) => { fn(n); return n; };
      n.to = (at, props, dur = 0.6, ease = E.cubicInOut) => { for (const k in props) (n.keys[k] ??= []).push([at, at + dur, props[k], ease]); (n.changes ??= []).push(at); return n; };
      n.show = (at, until) => { n.at = at; if (until !== undefined) n.until = until; return n; };
      return n;
    };
    const isNum = (v) => typeof v === 'number';
    const pv = (n, k, t, d) => {
      let v = n.p[k]; if (typeof v === 'function') v = v(t, n); if (v === undefined) v = d;
      const ks = n.keys[k]; if (!ks) return v;
      for (const [a, b, to, e] of ks) { if (t <= a) break; const q = e(cl((t - a) / Math.max(1e-6, b - a))), tv = typeof to === 'function' ? to(t, n) : to; v = isNum(v) && isNum(tv) ? lerp(v, tv, q) : q >= 1 ? tv : v; }
      return v;
    };
    B.pv = pv;

    // ---------- the embroidery of one shape (computed once, in local units) ----------
    const geoOf = (n) => {
      if (n.geo) return n.geo;
      const o = n.p, r = rngOf(n.seed), g = { stem: [], threads: [], couch: [], ticks: [], band: null, path: null, box: [0, 0, 0, 0], sketch: [] };
      if (n.kind === 'shape') {
        const s = sampleD(o.d, 2); g.path = new Path2D(o.d); g.box = s.box; g.sketch = s.lines;
        const lw = o.lw ?? 4.2;
        if (o.edge !== false) g.stem = stemStitches(s.lines, r, lw);
        if (o.fill) {
          const [bx, by, bw, bh] = s.box, dir = (o.dir ?? (bh > bw * 1.15 ? 90 : 0) + (r() - 0.5) * 6) * DEG, ux = Math.cos(dir), uy = Math.sin(dir), vx = -uy, vy = ux;
          const cs = [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]], ps = cs.map(([x, y]) => x * ux + y * uy), qs = cs.map(([x, y]) => x * vx + y * vy);
          const p0 = Math.min(...ps) - 2, p1 = Math.max(...ps) + 2, q0 = Math.min(...qs), q1 = Math.max(...qs), cx = document.createElement('canvas').getContext('2d');
          const sp = o.spacing ?? SP, inside = (x, y) => cx.isPointInPath(g.path, x, y);
          const runs = (qq) => { const out = []; let a = null; for (let p = p0; p <= p1; p += 1.5) { const x = p * ux + qq * vx, y = p * uy + qq * vy, ins = inside(x, y); if (ins && a === null) a = p; if (!ins && a !== null) { out.push([a, p]); a = null; } } if (a !== null) out.push([a, p1]); return out; };
          const nT = Math.max(1, Math.ceil((q1 - q0) / sp)), tsp = (q1 - q0) / nT;
          for (let i = 0; i <= nT; i++) { const qq = q0 + i * tsp + (r() - 0.5) * 0.35; for (const [a, b] of runs(qq)) g.threads.push({ x0: (a - 1) * ux + qq * vx, y0: (a - 1) * uy + qq * vy, x1: (b + 1) * ux + qq * vx, y1: (b + 1) * uy + qq * vy, k: 1 + (r() - 0.5) * 0.13 + (r() < 0.06 ? 0.08 : 0), ph: r() * 3, u: i / (nT + 1) }); }
          // couching: bars across the laid threads, every COUCH units (alternate bars shifted: a brick), each tied down with small ticks
          const csp = o.couch ?? COUCH;
          if (csp > 0) {
            const nC = Math.max(1, Math.floor((p1 - p0) / csp));
            for (let j = 1; j < nC; j++) {
              const pp = p0 + j * csp + (r() - 0.5) * 1.2;
              // a couching bar runs across the threads: along v, at position pp on u
              const out = []; let a = null; for (let q = q0 - 2; q <= q1 + 2; q += 1.5) { const x = pp * ux + q * vx, y = pp * uy + q * vy, ins = inside(x, y); if (ins && a === null) a = q; if (!ins && a !== null) { out.push([a, q]); a = null; } } if (a !== null) out.push([a, q1 + 2]);
              for (const [a2, b2] of out) {
                g.couch.push({ x0: pp * ux + a2 * vx, y0: pp * uy + a2 * vy, x1: pp * ux + b2 * vx, y1: pp * uy + b2 * vy, u: j / nC });
                for (let q = a2 + 3 + (j % 2) * 2.5; q < b2 - 2; q += 5.2) g.ticks.push({ x: pp * ux + q * vx, y: pp * uy + q * vy, ux, uy, u: j / nC });
              }
            }
          }
        }
      } else if (n.kind === 'line') {
        const d = o.d ?? (o.pts ? (o.curve ? curveD(o.pts) : 'M' + o.pts.map((q) => q.join(' ')).join(' L')) : 'M0 0 L100 0');
        const s = sampleD(d, 2); g.box = s.box; g.sketch = s.lines;
        const w = o.w ?? 4.2;
        if (w <= 7 || !o.fill) g.stem = stemStitches(s.lines, r, Math.min(w, 7));
        else {
          // a laid band along the path (branches, trunks, bars, bands of a garment): threads run along it, the edges in stem stitch, ticks across
          const pts = s.lines[0], cum = cumOf(pts), L = cum[cum.length - 1], taper = o.taper ?? [1, 1];
          const nrm = pts.map((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], ang = Math.atan2(b[1] - a[1], b[0] - a[0]); return [-Math.sin(ang), Math.cos(ang)]; });
          const wAt = (i) => w * lerp(taper[0], taper[1], cum[i] / Math.max(1, L));
          const nTh = Math.max(2, Math.round(w / SP)), threads = [];
          for (let k = 0; k < nTh; k++) { const f = (k + 0.5) / nTh - 0.5, jit = (r() - 0.5) * 0.3; threads.push({ pts: pts.map((q, i) => [q[0] + nrm[i][0] * (f * wAt(i) + jit), q[1] + nrm[i][1] * (f * wAt(i) + jit)]), k: 1 + (r() - 0.5) * 0.13, ph: r() * 3 }); }
          const edgeL = pts.map((q, i) => [q[0] + nrm[i][0] * wAt(i) / 2, q[1] + nrm[i][1] * wAt(i) / 2]), edgeR = pts.map((q, i) => [q[0] - nrm[i][0] * wAt(i) / 2, q[1] - nrm[i][1] * wAt(i) / 2]);
          g.band = { pts, cum, L, threads, nrm, wAt };
          if (o.edge !== false) { const ew = w < 12 ? 2.6 : 3.4, sL = stemStitches([edgeL], r, ew), sR = stemStitches([edgeR], r, ew, { flip: true }); g.stem = sL.concat(sR); g.edgeW = ew; }
          for (let s2 = 6 + r() * 4; s2 < L - 3; s2 += 11 + r() * 2) { const [x, y, a] = along(pts, cum, s2), half = (w * lerp(taper[0], taper[1], s2 / L)) / 2 - 0.8; g.ticks.push({ x0: x - Math.sin(a) * half, y0: y + Math.cos(a) * half, x1: x + Math.sin(a) * half, y1: y - Math.cos(a) * half, u: s2 / L, across: true }); }
          const path = new Path2D(); edgeL.forEach((q, i) => (i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1]))); for (let i = edgeR.length - 1; i >= 0; i--) path.lineTo(edgeR[i][0], edgeR[i][1]); path.closePath(); g.path = path;
          g.sketch = [edgeL, edgeR];
          const pad = w / 2; g.box = [s.box[0] - pad, s.box[1] - pad, s.box[2] + 2 * pad, s.box[3] + 2 * pad];
        }
      } else if (n.kind === 'dot') {
        const rr = o.r ?? 2.6; g.path = new Path2D(); g.path.arc(0, 0, rr, 0, Math.PI * 2); g.box = [-rr, -rr, 2 * rr, 2 * rr]; g.dot = rr;
      }
      n.geo = g;
      return g;
    };
    const curveD = (pts) => { let d = `M${pts[0][0]} ${pts[0][1]}`; for (let i = 1; i < pts.length - 1; i++) { const mxp = (pts[i][0] + pts[i + 1][0]) / 2, myp = (pts[i][1] + pts[i + 1][1]) / 2; d += ` Q${pts[i][0]} ${pts[i][1]} ${i === pts.length - 2 ? pts[i + 1][0] : mxp} ${i === pts.length - 2 ? pts[i + 1][1] : myp}`; } if (pts.length === 2) d += ` L${pts[1][0]} ${pts[1][1]}`; return d; };
    B.curveD = curveD;

    // ---------- drawing the embroidery at a progress: { o: outline 0–1, f: laid threads 0–1, c: couching 0–1 } ----------
    const drawEmb = (ctx, n, pr, colors) => {
      const g = geoOf(n), o = n.p, fill = colors.fill, edge = colors.edge;
      if (g.dot) { if (pr.o <= 0) return; ctx.fillStyle = edge; ctx.beginPath(); ctx.arc(0, 0, g.dot * Math.min(1, pr.o * 1.5), 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = lt(edge, 0.3); ctx.beginPath(); ctx.arc(-g.dot * 0.3, -g.dot * 0.3, g.dot * 0.35 * Math.min(1, pr.o * 1.5), 0, Math.PI * 2); ctx.fill(); return; }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // the laid threads (with a soft relief shadow once they are in)
      if (fill && g.threads.length && pr.f > 0) {
        const shadeC = mixHex(fill, C0.ink, 0.55), hi = mixHex(fill, '#fff7e4', 0.4);
        ctx.save(); ctx.clip(g.path);
        if (pr.f >= 1) { ctx.fillStyle = shadeC; ctx.fill(g.path); }
        const nT = g.threads.length, upto = pr.f * nT;
        for (let i = 0; i < nT && i < upto; i++) {
          const th = g.threads[i], part = cl(upto - i), x1 = lerp(th.x0, th.x1, part), y1 = lerp(th.y0, th.y1, part), c = toHex(hex(fill).map((v) => v * th.k));
          if (pr.f < 1) { ctx.strokeStyle = shadeC; ctx.lineWidth = SP + 0.4; ctx.beginPath(); ctx.moveTo(th.x0, th.y0); ctx.lineTo(x1, y1); ctx.stroke(); }
          ctx.strokeStyle = c; ctx.lineWidth = TW; ctx.beginPath(); ctx.moveTo(th.x0, th.y0); ctx.lineTo(x1, y1); ctx.stroke();
          ctx.strokeStyle = hi; ctx.lineWidth = 0.95; ctx.setLineDash([2, 1.7]); ctx.lineDashOffset = th.ph; ctx.beginPath(); ctx.moveTo(th.x0 - 0.5, th.y0 - 0.5); ctx.lineTo(x1 - 0.5, y1 - 0.5); ctx.stroke(); ctx.setLineDash([]);
        }
        if (pr.c > 0) {
          const cc = mixHex(fill, C0.ink, 0.28), nC = g.couch.length, upC = pr.c * nC;
          ctx.strokeStyle = mixHex(fill, C0.ink, 0.6); ctx.lineWidth = 2.3; for (let i = 0; i < nC && i < upC; i++) { const b = g.couch[i], q = cl(upC - i); ctx.beginPath(); ctx.moveTo(b.x0 + 0.6, b.y0 + 0.6); ctx.lineTo(lerp(b.x0, b.x1, q) + 0.6, lerp(b.y0, b.y1, q) + 0.6); ctx.stroke(); }
          ctx.strokeStyle = cc; ctx.lineWidth = 1.5; for (let i = 0; i < nC && i < upC; i++) { const b = g.couch[i], q = cl(upC - i); ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(lerp(b.x0, b.x1, q), lerp(b.y0, b.y1, q)); ctx.stroke(); }
          ctx.strokeStyle = mixHex(fill, C0.ink, 0.5); ctx.lineWidth = 0.9; for (const tk of g.ticks) { if (tk.u > pr.c) continue; ctx.beginPath(); ctx.moveTo(tk.x - tk.ux * 1.3, tk.y - tk.uy * 1.3); ctx.lineTo(tk.x + tk.ux * 1.3, tk.y + tk.uy * 1.3); ctx.stroke(); }
        }
        ctx.restore();
      }
      // a laid band along a path: threads grow along it together
      if (g.band && fill && pr.f > 0) {
        const bd = g.band, sMax = pr.f * bd.L, shadeC = mixHex(fill, C0.ink, 0.42), hi = mixHex(fill, '#fff7e4', 0.32);
        let iMax = 0; while (iMax < bd.pts.length - 1 && bd.cum[iMax + 1] <= sMax) iMax++;
        const cut = (pts) => { const out = pts.slice(0, iMax + 1); if (iMax < pts.length - 1) { const q = cl((sMax - bd.cum[iMax]) / Math.max(1e-6, bd.cum[iMax + 1] - bd.cum[iMax])); out.push([lerp(pts[iMax][0], pts[iMax + 1][0], q), lerp(pts[iMax][1], pts[iMax + 1][1], q)]); } return out; };
        const strokeP = (pts) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); };
        ctx.strokeStyle = shadeC; ctx.lineWidth = (bd.wAt(0) + bd.wAt(bd.pts.length - 1)) / 2 + 0.4; ctx.lineCap = 'butt'; strokeP(cut(bd.pts)); ctx.lineCap = 'round';
        for (const th of bd.threads) { const pts = cut(th.pts); ctx.strokeStyle = toHex(hex(fill).map((v) => v * th.k)); ctx.lineWidth = TW; strokeP(pts); ctx.strokeStyle = hi; ctx.lineWidth = 0.75; ctx.setLineDash([1.7, 1.5]); ctx.lineDashOffset = th.ph; strokeP(pts); ctx.setLineDash([]); }
        ctx.strokeStyle = mixHex(fill, C0.ink, 0.45); ctx.lineWidth = 1.1; for (const tk of g.ticks) { if (tk.u > pr.f) continue; ctx.beginPath(); ctx.moveTo(tk.x0, tk.y0); ctx.lineTo(tk.x1, tk.y1); ctx.stroke(); }
      }
      // the stem-stitch outline
      if (g.stem.length && pr.o > 0) {
        const lw = g.band ? g.edgeW : Math.min(o.w ?? o.lw ?? 4.2, 7) * (o.lw ? o.lw / 4.2 : 1), base = mixHex(edge, '#000000', 0.25), mid = edge, hi = mixHex(edge, '#fff3dc', 0.38);
        const nS = g.stem.length, upto = pr.o * nS;
        for (let pass = 0; pass < 3; pass++) {
          ctx.strokeStyle = pass === 0 ? base : pass === 1 ? mid : hi; ctx.lineWidth = pass === 0 ? lw : pass === 1 ? lw * 0.6 : lw * 0.2;
          ctx.beginPath();
          for (let i = 0; i < nS && i < upto; i++) { const s = g.stem[i], q = cl(upto - i), x1 = lerp(s.x0, s.x1, q), y1 = lerp(s.y0, s.y1, q); if (pass === 2) { ctx.moveTo(lerp(s.x0, x1, 0.25) - 0.35, lerp(s.y0, y1, 0.25) - 0.35); ctx.lineTo(lerp(s.x0, x1, 0.7) - 0.35, lerp(s.y0, y1, 0.7) - 0.35); } else { ctx.moveTo(s.x0, s.y0); ctx.lineTo(x1, y1); } }
          ctx.stroke();
        }
      }
    };
    // where the needle is at a progress (local units), or null
    const needleAt = (n, pr, order) => {
      const g = geoOf(n);
      const head = (ph) => {
        if (ph === 'o' && g.stem.length) { const i = Math.min(g.stem.length - 1, Math.floor(pr.o * g.stem.length)), s = g.stem[i], q = cl(pr.o * g.stem.length - i); return [lerp(s.x0, s.x1, q), lerp(s.y0, s.y1, q), Math.atan2(s.y1 - s.y0, s.x1 - s.x0)]; }
        if (ph === 'f' && g.threads.length) { const i = Math.min(g.threads.length - 1, Math.floor(pr.f * g.threads.length)), th = g.threads[i], q = cl(pr.f * g.threads.length - i); return [lerp(th.x0, th.x1, q), lerp(th.y0, th.y1, q), Math.atan2(th.y1 - th.y0, th.x1 - th.x0)]; }
        if (ph === 'f' && g.band) { const [x, y, a] = along(g.band.pts, g.band.cum, pr.f * g.band.L); return [x, y, a]; }
        if (ph === 'c' && g.couch.length) { const i = Math.min(g.couch.length - 1, Math.floor(pr.c * g.couch.length)), b = g.couch[i], q = cl(pr.c * g.couch.length - i); return [lerp(b.x0, b.x1, q), lerp(b.y0, b.y1, q), Math.atan2(b.y1 - b.y0, b.x1 - b.x0)]; }
        return null;
      };
      for (const ph of order) { const v = pr[ph]; if (v > 0 && v < 1) return head(ph); }
      return null;
    };

    // ---------- schedule: when each part stitches (groups stitch their parts one after another) ----------
    const sizeDur = (n) => { const g = geoOf(n), per = g.stem.length * STEP, area = g.threads.length * 18 + (g.band ? g.band.L * 3 : 0); return cl(0.35 + per / 1100 + area / 9000, 0.35, 2.2) / SPEED; };
    const leafDur = (n) => (n.kind === 'group' ? n.kids.reduce((s, k) => s + leafDur(k) * 0.72, 0) + 0.15 : n.inDur ?? sizeDur(n));
    const schedule = (n, at, dur, enter) => {
      n.sch = { at, dur, enter };
      if (n.kind !== 'group' || !n.kids.length) return;
      const ks = n.kids.slice().sort((a, b) => (a.p.order ?? a.ord) - (b.p.order ?? b.ord));
      if (n.p.seq === false || enter === 'fade' || enter === 'none') { for (const k of ks) schedule(k, k.at >= 0 ? k.at : at, k.inDur ?? dur, k.enter ?? enter); return; }
      const ds = ks.map((k) => (k.at >= 0 ? 0 : leafDur(k))), total = ds.reduce((s, d, i) => s + (i < ds.length - 1 ? d * 0.72 : d), 0), f = total > 0 ? dur / total : 1;
      let t0 = at;
      ks.forEach((k, i) => { if (k.at >= 0) { schedule(k, k.at, k.inDur ?? leafDur(k), k.enter ?? enter); return; } const d = ds[i] * f; schedule(k, t0, d, k.enter ?? enter); t0 += d * 0.72; });
    };
    let prepped = false;
    const prep = () => {
      if (prepped) return; prepped = true;
      for (const n of roots) { const d = n.enter === 'none' ? 0 : n.enter === 'fade' ? (n.inDur ?? 0.5) : (n.inDur ?? leafDur(n)); n.inDur = d; schedule(n, n.at, d, n.enter); }
      for (const n of roots) if (n.at > 0 && n.p.sfx !== false && SND[n.enter]) F.sfx(n.at, SND[n.enter], n.p.gain ?? 0.35, { dur: n.inDur });
      for (const n of roots) if (n.until < 1e8 && n.exit === 'unpick' && n.p.sfx !== false) F.sfx(n.until - n.outDur, 'unpick', 0.3, { dur: n.outDur });
      settleTexts();
    };
    F.prep(prep);
    B.prep = prep;
    // progress of a leaf at t (inherits its root's exit)
    const rootOf = (n) => { let m = n; while (m.parent) m = m.parent; return m; };
    const progress = (n, t) => {
      const s = n.sch || { at: n.at, dur: 0, enter: 'none' }, root = rootOf(n);
      let q = s.dur > 0 ? cl((t - s.at) / s.dur) : t >= s.at ? 1 : 0, alpha = 1;
      if (s.enter === 'fade') { alpha = E.sine(q); q = 1; }
      if (root.until < 1e8 && t >= root.until - root.outDur) { const qo = cl((t - (root.until - root.outDur)) / root.outDur); if (root.exit === 'unpick') q = Math.min(q, 1 - qo); else alpha *= 1 - E.sine(qo); }
      const en = s.enter === 'lay' ? 'lay' : 'stitch';
      const g = n.kind === 'group' ? null : geoOf(n), hasF = g && (g.threads.length || g.band) && n.p.fill;
      let pr;
      if (!hasF) pr = { o: q, f: 0, c: 0 };
      else if (g.band) pr = { o: q, f: q, c: 0 };
      else if (en === 'lay') pr = { f: cl(q / 0.62), c: cl((q - 0.62) / 0.14), o: cl((q - 0.76) / 0.24) };
      else pr = { o: cl(q / 0.4), f: cl((q - 0.4) / 0.48), c: cl((q - 0.88) / 0.12) };
      return { q, pr, alpha, order: en === 'lay' ? ['f', 'c', 'o'] : ['o', 'f', 'c'], live: q > 0 && q < 1 };
    };

    // ---------- sprites: a finished part is drawn once per size bucket and reused ----------
    const sprite = (n, b, colors) => {
      const key = b + '|' + colors.fill + '|' + colors.edge; n.spr ??= new Map(); if (n.spr.has(key)) return n.spr.get(key);
      const g = geoOf(n), pad = 6, [bx, by, bw, bh] = g.box, c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil((bw + 2 * pad) * b * U)); c.height = Math.max(1, Math.ceil((bh + 2 * pad) * b * U));
      const x = c.getContext('2d'); x.setTransform(b * U, 0, 0, b * U, (pad - bx) * b * U, (pad - by) * b * U);
      // relief: the wool stands a little off the linen
      if (g.path && (colors.fill || g.band)) { x.save(); x.shadowColor = 'rgba(52,36,20,0.32)'; x.shadowBlur = 2.2 * b * U; x.shadowOffsetX = 0.8 * b * U; x.shadowOffsetY = 1.1 * b * U; x.fillStyle = colors.fill ?? C0.linen; x.fill(g.path); x.restore(); }
      drawEmb(x, n, { o: 1, f: 1, c: 1 }, colors);
      const s = { c, box: [bx - pad, by - pad, bw + 2 * pad, bh + 2 * pad] }; n.spr.set(key, s); return s;
    };
    const scratchFor = (n, b) => { const g = geoOf(n), pad = 6, [bx, by, bw, bh] = g.box, w = Math.max(1, Math.ceil((bw + 2 * pad) * b * U)), h = Math.max(1, Math.ceil((bh + 2 * pad) * b * U)); if (!n.scr || n.scr.c.width !== w || n.scr.c.height !== h) { const c = document.createElement('canvas'); c.width = w; c.height = h; n.scr = { c, x: c.getContext('2d') }; } const s = n.scr; s.x.setTransform(1, 0, 0, 1, 0, 0); s.x.clearRect(0, 0, w, h); s.x.setTransform(b * U, 0, 0, b * U, (pad - bx) * b * U, (pad - by) * b * U); return { ...s, box: [bx - pad, by - pad, bw + 2 * pad, bh + 2 * pad] }; };
    const bucketOf = (k) => BUCKETS.find((b) => b * U >= k * 0.92) ?? BUCKETS[BUCKETS.length - 1];

    // ---------- the pencil underdrawing: the next thing is drafted ahead, then stitched over ----------
    const drawSketch = (ctx, n, t, k) => {
      const root = rootOf(n), lead = n.p.sketch ?? root.p.sketch ?? SKETCH; if (!lead || root.enter === 'none' || root.enter === 'fade') return;
      const a = root.at - lead, s = n.sch; if (!s || t < a || t > s.at + s.dur + 0.4 || t >= root.until) return;
      const g = geoOf(n), qd = cl((t - a) / Math.min(0.6, lead * 0.6)), fade = 1 - cl((t - (s.at + s.dur)) / 0.4);
      ctx.save(); ctx.globalAlpha *= 0.5 * fade; ctx.strokeStyle = '#7c7364'; ctx.lineWidth = Math.max(0.9, 1.3 / Math.max(0.5, k / U)); ctx.lineCap = 'round';
      const r = rngOf(n.seed ^ 99);
      for (const pts of g.sketch) { const L = polyLen(pts); ctx.setLineDash([L * qd, L + 10]); ctx.beginPath(); const j = (r() - 0.5) * 1.6, j2 = (r() - 0.5) * 1.6; pts.forEach((q, i) => (i ? ctx.lineTo(q[0] + j, q[1] + j2) : ctx.moveTo(q[0] + j, q[1] + j2))); ctx.stroke(); }
      ctx.restore();
    };

    // ---------- drawing a node (and its parts) ----------
    const needles = [];
    const colorsOf = (n, t) => { const fill = n.p.fill ? col(pv(n, 'fill', t, null)) : null, e = pv(n, 'edge', t, null); return { fill, edge: e ? col(e) : n.kind === 'line' && fill && (n.p.w ?? 0) > 7 ? dk(fill, 0.5) : C0.ink }; };
    const drawNode = (ctx, n, t, alpha = 1) => {
      if (n.kind === 'group' ? false : !n.sch) return;
      const root = rootOf(n); if (t >= root.until) return;
      const g = (k, d) => pv(n, k, t, d);
      ctx.save();
      ctx.translate(g('x', 0), g('y', 0));
      const rot = g('rot', 0), sx = g('sx', 1), sy = g('sy', 1); if (rot) ctx.rotate(rot * DEG); if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
      const a = alpha * g('alpha', 1);
      if (n.kind === 'group') { for (const k of n.kids.slice().sort((p, q) => p.z - q.z || p.ord - q.ord)) drawNode(ctx, k, t, a); ctx.restore(); return; }
      const m = ctx.getTransform(), kk = Math.hypot(m.a, m.b);
      drawSketch(ctx, n, t, kk);
      const st = progress(n, t);
      if (st.q <= 0) { ctx.restore(); return; }
      ctx.globalAlpha = a * st.alpha;
      const colors = colorsOf(n, t), b = bucketOf(kk);
      if (!st.live) { const s = sprite(n, b, colors); ctx.drawImage(s.c, s.box[0], s.box[1], s.box[2], s.box[3]); }
      else {
        const s = scratchFor(n, b); drawEmb(s.x, n, st.pr, colors); ctx.drawImage(s.c, s.box[0], s.box[1], s.box[2], s.box[3]);
        const h = needleAt(n, st.pr, st.order); if (h && n.p.needle !== false) { const p = m.transformPoint(new DOMPoint(h[0], h[1])); needles.push({ x: p.x, y: p.y, a: h[2] + Math.atan2(m.b, m.a), c: colors.fill && st.pr.f > 0 && st.pr.f < 1 ? colors.fill : colors.edge, t, id: n.id }); }
      }
      ctx.restore();
    };
    // the needle: a steel needle dipping into the cloth at the head of the thread, a glint, the working thread trailing up out of it (screen px)
    const drawNeedles = (ctx, k) => {
      const list = needles.slice(-3); needles.length = 0;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.lineCap = 'round';
      for (const nd of list) {
        const s = Math.max(0.7, Math.min(1.8, k)) * 1.0, wob = Math.sin(nd.t * 23 + nd.id) * 0.18, a = -0.95 + wob, L = 44 * s, ex = nd.x + Math.cos(a) * L, ey = nd.y + Math.sin(a) * L;
        ctx.strokeStyle = nd.c; ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.quadraticCurveTo(ex + 30 * s, ey - 40 * s, ex + 18 * s + Math.sin(nd.t * 3) * 6 * s, ey - 110 * s); ctx.stroke();
        ctx.strokeStyle = 'rgba(40,38,44,0.55)'; ctx.lineWidth = 3.4 * s; ctx.beginPath(); ctx.moveTo(nd.x + 1.2 * s, nd.y + 1.6 * s); ctx.lineTo(ex + 1.2 * s, ey + 1.6 * s); ctx.stroke();
        ctx.strokeStyle = '#8d8f96'; ctx.lineWidth = 2.6 * s; ctx.beginPath(); ctx.moveTo(nd.x, nd.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#e9ecef'; ctx.lineWidth = 0.9 * s; ctx.beginPath(); ctx.moveTo(lerp(nd.x, ex, 0.15), lerp(nd.y, ey, 0.15) - 0.6); ctx.lineTo(lerp(nd.x, ex, 0.85), lerp(nd.y, ey, 0.85) - 0.6); ctx.stroke();
        const gl = 0.6 + 0.4 * Math.sin(nd.t * 9 + nd.id), gx = lerp(nd.x, ex, 0.55), gy = lerp(nd.y, ey, 0.55), R = 7 * s * gl;
        ctx.fillStyle = `rgba(255,252,236,${(0.85 * gl).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(gx - R, gy); ctx.lineTo(gx - R * 0.15, gy - R * 0.15); ctx.lineTo(gx, gy - R); ctx.lineTo(gx + R * 0.15, gy - R * 0.15); ctx.lineTo(gx + R, gy); ctx.lineTo(gx + R * 0.15, gy + R * 0.15); ctx.lineTo(gx, gy + R); ctx.lineTo(gx - R * 0.15, gy + R * 0.15); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    };

    // ---------- boxes (camera framing; rotation ignored) ----------
    const lbox = (n, t) => {
      if (n.kind !== 'group') return geoOf(n).box;
      const bs = n.kids.filter((k) => !k.p.noBox).map((k) => { const b = lbox(k, t), x = pv(k, 'x', t, 0), y = pv(k, 'y', t, 0), s1 = pv(k, 'sx', t, 1), s2 = pv(k, 'sy', t, 1); return [x + Math.min(b[0] * s1, (b[0] + b[2]) * s1), y + Math.min(b[1] * s2, (b[1] + b[3]) * s2), b[2] * Math.abs(s1), b[3] * Math.abs(s2)]; });
      if (!bs.length) return [0, 0, 0, 0];
      const x0 = Math.min(...bs.map((b) => b[0])), y0 = Math.min(...bs.map((b) => b[1])), x1 = Math.max(...bs.map((b) => b[0] + b[2])), y1 = Math.max(...bs.map((b) => b[1] + b[3]));
      return [x0, y0, x1 - x0, y1 - y0];
    };
    const wbox = (n, t) => { let [x, y, w, h] = lbox(n, t); for (let m = n; m; m = m.parent) { const s1 = pv(m, 'sx', t, 1), s2 = pv(m, 'sy', t, 1); const nx = s1 < 0 ? -(x + w) : x, ny = s2 < 0 ? -(y + h) : y; x = nx * Math.abs(s1) + pv(m, 'x', t, 0); y = ny * Math.abs(s2) + pv(m, 'y', t, 0); w *= Math.abs(s1); h *= Math.abs(s2); } return { x, y, w, h }; };
    B.box = (n, t) => wbox(n, t ?? Math.max(0, n.at));

    // ---------- primitives ----------
    B.shape = (o = {}) => node('shape', { fill: 'red', ...o });
    B.line = (o = {}) => node('line', o);
    B.dot = (o = {}) => node('dot', o);
    B.group = (o = {}) => node('group', o);
    B.rect = (o = {}) => { const w = o.w ?? 100, h = o.h ?? 60, r = o.r ?? 0; const d = r > 0 ? `M${r} 0 L${w - r} 0 Q${w} 0 ${w} ${r} L${w} ${h - r} Q${w} ${h} ${w - r} ${h} L${r} ${h} Q0 ${h} 0 ${h - r} L0 ${r} Q0 0 ${r} 0 Z` : `M0 0 L${w} 0 L${w} ${h} L0 ${h} Z`; return B.shape({ ...o, d }); };
    B.circle = (o = {}) => { const r = o.r ?? 40; return B.shape({ ...o, d: `M${r} 0 A${r} ${r} 0 1 1 ${-r} 0 A${r} ${r} 0 1 1 ${r} 0 Z` }); };
    B.ellipse = (o = {}) => { const a = o.rx ?? 60, b = o.ry ?? 36; return B.shape({ ...o, d: `M${a} 0 A${a} ${b} 0 1 1 ${-a} 0 A${a} ${b} 0 1 1 ${a} 0 Z` }); };
    B.poly = (o = {}) => B.shape({ ...o, d: 'M' + (o.pts || []).map((q) => q.join(' ')).join(' L') + ' Z' });

    // ---------- the cloth: borders of birds and beasts, the ground, the hem (world-anchored strips, drawn in tiles that meet seamlessly) ----------
    // the border's creatures, facing right, standing on y = 0, about 100 × 62: a body, a second-colour part (wing, mane, saddle), far legs, an eye
    const BEASTS = {
      bird: { body: 'M10 -20 C14 -34 40 -38 58 -30 C62 -40 62 -52 68 -58 C72 -62 80 -60 82 -56 L93 -54 L82 -51 C76 -50 72 -46 72 -38 C74 -26 70 -14 56 -10 C40 -6 22 -8 12 -12 L0 -10 L-6 -18 L4 -18 Z', part: 'M22 -26 C30 -38 48 -40 56 -30 C46 -24 32 -20 22 -26 Z', legs: [[40, -8, 36, 0], [48, -8, 50, 0]], eye: [77, -56] },
      hound: { body: 'M14 -36 C30 -42 56 -40 70 -36 L76 -48 L80 -38 C88 -38 94 -34 97 -29 L84 -25 C80 -23 76 -21 72 -19 L70 -14 L72 0 L66 0 L62 -14 L28 -14 L26 0 L20 0 L18 -16 C12 -20 8 -26 8 -32 C2 -38 -4 -50 4 -58 C6 -50 6 -44 14 -36 Z', part: 'M50 -40 C58 -42 66 -40 70 -36 C68 -28 62 -24 54 -26 C50 -30 48 -36 50 -40 Z', legs: [[64, -14, 58, 0], [24, -14, 30, 0]], eye: [84, -33] },
      lion: { body: 'M16 -32 C30 -38 52 -38 62 -36 C64 -46 74 -52 84 -48 C92 -44 96 -36 94 -30 L86 -26 C82 -22 78 -20 72 -20 L70 -14 L72 0 L66 0 L62 -14 L28 -14 L26 0 L20 0 L18 -16 C12 -18 10 -22 8 -26 C0 -24 -8 -32 -6 -42 C-4 -48 2 -48 4 -44 C0 -40 2 -34 10 -32 Z', part: 'M60 -36 C60 -48 72 -56 82 -50 C76 -46 74 -40 76 -32 C72 -26 66 -22 62 -24 C60 -28 60 -32 60 -36 Z', legs: [[64, -14, 58, 0], [24, -14, 30, 0]], eye: [86, -40] },
      peacock: { body: 'M24 -20 C28 -30 44 -32 54 -26 C56 -36 58 -46 64 -50 C70 -53 75 -49 75 -45 L84 -43 L75 -40 C71 -38 67 -32 67 -24 C67 -14 57 -8 45 -8 L26 -8 Z', part: 'M28 -14 C6 -18 -6 -40 2 -60 C10 -58 18 -50 22 -42 C22 -52 28 -60 34 -62 C34 -50 32 -36 32 -22 Z', legs: [[46, -8, 42, 0], [52, -8, 54, 0]], eye: [69, -45] },
      griffin: { body: 'M14 -34 C30 -40 54 -40 66 -36 C68 -44 74 -50 82 -48 L92 -44 L84 -40 C82 -34 78 -28 72 -22 L70 -14 L72 0 L66 0 L62 -14 L28 -14 L26 0 L20 0 L18 -16 C12 -20 8 -26 8 -30 C2 -32 -6 -26 -8 -18 L-12 -20 C-8 -32 2 -38 14 -34 Z', part: 'M30 -38 C30 -58 48 -68 62 -64 C56 -58 50 -50 46 -38 Z', legs: [[64, -14, 58, 0], [24, -14, 30, 0]], eye: [80, -44] },
    };
    const BEAST_KEYS = ['bird', 'hound', 'lion', 'bird', 'peacock', 'griffin', 'hound'];
    const WOOL = ['red', 'ochre', 'olive', 'green', 'blue', 'sage', 'navy', 'salmon'];
    const PANEL = 150;
    const panelCache = new Map();
    // one border panel: a diagonal bar, a creature between the bars (or a custom motif), drawn as embroidery
    const margins = new Map();
    B.margin = (x, o = {}) => { const band = o.band ?? 'bottom', i = Math.floor(x / PANEL); margins.set(band + i, { ...o, i }); if (o.text && !o.noFact) (F.facts ??= []).push(String(o.text)); return B; };
    const panelNodes = (band, i) => {
      const key = band + i; if (panelCache.has(key)) return panelCache.get(key);
      const r = rngOf(SEED ^ hash(key)), top = band === 'top', h = LAY.topIn - LAY.top, list = [];
      const barC = WOOL[(i * 3 + (top ? 0 : 2)) % WOOL.length];
      list.push(B.line({ pts: [[PANEL - 26, h - 6], [PANEL - 2, 6]], w: 13, fill: barC, edge: 'ink', at: -1, sfx: false, enter: 'none', lintOk: true }));
      const mg = margins.get(key);
      if (mg && mg.text) { const t2 = B.group({ at: -1, enter: 'none', sfx: false, lintOk: true }); t2._text = mg.text; list.push(t2); }
      else if (mg && mg.draw) { const g2 = B.group({ x: 10, y: h - 12, at: -1, enter: 'none', sfx: false, lintOk: true }); mg.draw(g2); list.push(g2); }
      else {
        const kind = BEAST_KEYS[Math.floor(r() * BEAST_KEYS.length)], bt = BEASTS[kind], flip = (top ? i : i + 1) % 2 === 1;
        const g2 = B.group({ x: flip ? 112 : 12, y: h - 12, sx: flip ? -1 : 1, at: -1, enter: 'none', sfx: false, lintOk: true });
        const c1 = WOOL[Math.floor(r() * WOOL.length)], c2 = WOOL[(WOOL.indexOf(c1) + 2 + Math.floor(r() * 4)) % WOOL.length];
        for (const [x0, y0, x1, y1] of bt.legs) g2.line({ pts: [[x0, y0], [x1, y1]], w: 3.4, edge: dk(c1, 0.45), z: -1 });
        g2.shape({ d: bt.body, fill: c1, dir: 0, lw: 3.4 }); g2.shape({ d: bt.part, fill: c2, dir: 70, lw: 3 });
        g2.dot({ x: bt.eye[0], y: bt.eye[1], r: 2 });
        list.push(g2);
      }
      // these nodes are drawn by the border, not the scene
      for (const n2 of list) { roots.splice(roots.indexOf(n2), 1); n2.sch = { at: 0, dur: 0, enter: 'none' }; const sch = (m) => { m.sch = { at: 0, dur: 0, enter: 'none' }; m.kids.forEach(sch); }; sch(n2); }
      panelCache.set(key, list); return list;
    };
    // straight rules and the wavy ground: stem stitch at fixed world positions (tiles meet)
    const ruleCache = new Map();
    const stripTile = (kind, i) => {
      const key = kind + i; if (ruleCache.has(key)) return ruleCache.get(key);
      const x0 = i * PANEL * 4, x1 = x0 + PANEL * 4, r = rngOf(SEED ^ hash(key)), list = [];
      const mk = (o) => { const n2 = B.line({ ...o, at: -1, enter: 'none', sfx: false, lintOk: true }); roots.splice(roots.indexOf(n2), 1); n2.sch = { at: 0, dur: 0, enter: 'none' }; list.push(n2); };
      if (kind === 'rulesTop' || kind === 'rulesBot') for (const y of kind === 'rulesTop' ? [LAY.top, LAY.topIn] : [LAY.botIn, LAY.bot]) mk({ pts: [[x0, y], [x1, y]], w: 4 });
      else if (kind === 'ground') { const pts = []; for (let x = x0 - 2; x <= x1 + 2; x += 8) pts.push([x, 4 + Math.sin(x * 0.011) * 2.5 + Math.sin(x * 0.037 + 1) * 1.4]); mk({ pts, w: 16, fill: 'olive', edge: false }); mk({ pts: pts.map(([x, y]) => [x, y - 8]), w: 3.6, edge: 'olive' }); }
      else if (kind === 'hem') { const cs = ['red', 'ochre', 'navy', 'green']; cs.forEach((c, k) => mk({ pts: [[x0 - 1, LAY.hem[0] + 3 + k * 6], [x1 + 1, LAY.hem[0] + 3 + k * 6]], w: 8, fill: c, edge: false })); }
      ruleCache.set(key, list); return list;
    };
    const showGround = opt.ground !== false, showBorders = opt.borders !== false;
    // parts: which bands to draw and how far each is shifted (world units); the scroll draws them all in place, the kit's flat layers place them in the frame
    const ALL = { top: 0, bottom: 0, ground: 0, hem: 0 };
    const drawCloth = (ctx, t, v0, v1, parts = ALL) => {
      const tiles = (kind, dy) => { for (let i = Math.floor(v0 / (PANEL * 4)) - 1; i <= Math.floor(v1 / (PANEL * 4)) + 1; i++) { ctx.save(); ctx.translate(0, dy); for (const n2 of stripTile(kind, i)) drawNode(ctx, n2, t); ctx.restore(); } };
      if (showBorders) {
        for (const band of ['top', 'bottom']) { if (parts[band] == null) continue; const y = (band === 'top' ? LAY.top : LAY.botIn) + parts[band]; for (let i = Math.floor(v0 / PANEL) - 1; i <= Math.floor(v1 / PANEL) + 1; i++) { ctx.save(); ctx.translate(i * PANEL, y); for (const n2 of panelNodes(band, i)) { if (n2._text) { drawPanelText(ctx, n2._text); continue; } drawNode(ctx, n2, t); } ctx.restore(); } }
        if (parts.top != null) tiles('rulesTop', parts.top);
        if (parts.bottom != null) tiles('rulesBot', parts.bottom);
        if (parts.hem != null) tiles('hem', parts.hem);
      }
      if (showGround && parts.ground != null) tiles('ground', parts.ground);
    };
    // flat mode (kit.js): a layer shows parts of the cloth: B.cloth({ top: frame y of the upper border's top edge, ground: frame y of the ground line, hem: frame y of the hem }) in world units
    const cloths = new Map();
    B.cloth = (o = {}) => { if (curLayer) cloths.set(curLayer, { top: o.top != null ? o.top - LAY.top : null, bottom: o.bottom != null ? o.bottom - LAY.botIn : null, ground: o.ground ?? null, hem: o.hem != null ? o.hem - LAY.hem[0] : null }); return B; };
    // a year / a word stitched into a border panel (B.margin(x, { text }))
    const panelTextCache = new Map();
    const drawPanelText = (ctx, text) => {
      const h = LAY.topIn - LAY.top, m = ctx.getTransform(), k = Math.hypot(m.a, m.b), b = bucketOf(k), key = text + '|' + b;
      let s = panelTextCache.get(key);
      if (!s) { const c = document.createElement('canvas'), S = b * U; c.width = Math.ceil(PANEL * S); c.height = Math.ceil(h * S); const x = c.getContext('2d'); x.scale(S, S); const sz = Math.min(44, (PANEL - 56) / Math.max(1, units(text))); x.font = `700 ${sz}px ${FONT.text}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.strokeStyle = C0.ink; x.lineWidth = 2.2; x.strokeText(text, PANEL / 2 - 10, h / 2 + 2); x.fillStyle = C0.red; x.fillText(text, PANEL / 2 - 10, h / 2 + 2); s = c; panelTextCache.set(key, s); }
      ctx.drawImage(s, 0, 0, PANEL, h);
    };

    // ---------- stitched letters (DOM: the checks see them): satin-stitched wool, a stem-stitch edge, typed letter by letter with the needle ----------
    const satin = new Map();
    const satinCv = (c) => { if (!satin.has(c)) { const cv = satinTile(c, SEED ^ hash(c)); satin.set(c, { cv, url: cv.toDataURL('image/png') }); } return satin.get(c); };
    const satinOf = (c) => satinCv(c).url;
    const texts = [];
    const stitchText = (text, o) => {
      const parent = FLAT ? o.layer ?? curLayer : wl, size = o.size ?? 50, tone = col(o.tone ?? 'ink'), at = o.at ?? 0, until = o.until ?? 1e9, S = FLAT ? U : 1;
      const e = el('div', `left:0;top:0;display:none;white-space:${o.wrap ? 'normal' : 'nowrap'};${o.wrap ? `width:${f1(o.wrap * S)}px;text-align:${o.align ?? 'left'};` : ''}font:${o.weight ?? 700} ${f1(size * S)}px/1.25 ${o.font === 'latin' ? FONT.latin : FONT.text};letter-spacing:${o.track ?? (/[^\x00-\xff]/.test(text) ? 0.06 : 0.04)}em;pointer-events:none;${FLAT ? 'z-index:4;' : ''}`, parent);
      const css = (c) => `color:transparent;background:url(${satinOf(c)}) 0 0/${f1(32 * S * (size / 50) ** 0.5)}px;-webkit-background-clip:text;background-clip:text;-webkit-text-stroke:${f1(Math.max(0.7, size * 0.022) * S)}px ${mixHex(c, C0.ink, 0.55)};filter:drop-shadow(${f1(0.9 * S)}px ${f1(1.3 * S)}px ${f1(0.8 * S)}px rgba(52,36,20,.42))`;
      const chars = [...text].map((ch, i) => { const s = el('span', `position:relative;${css(i === 0 && o.initial ? col(o.initial) : tone)}`, e); s.textContent = ch; return s; });
      const per = o.per ?? Math.min(0.11, Math.max(0.035, (o.typeDur ?? 0.06 * chars.length) / Math.max(1, chars.length)));
      const T = { e, o, at, until, chars, per, size, text, enter: o.enter ?? (at > 0 ? 'type' : 'none') };
      if (o.register !== false) { F.text(e, o.kind ?? 'label', o.fact ?? text, at, until, { noFact: !!o.noFact, bleed: !FLAT }); T.reg = F.texts && F.texts[F.texts.length - 1]; }   // bleed: the cloth carries it off the frame; the window ends when it has left (settleTexts)
      T.track = T.track ?? (o.track ?? (/[^\x00-\xff]/.test(text) ? 0.06 : 0.04));
      texts.push(T);
      return T;
    };
    const textPos = (T, t) => { let x = typeof T.o.x === 'function' ? T.o.x(t) : T.o.x ?? 0, y = typeof T.o.y === 'function' ? T.o.y(t) : T.o.y ?? 0; if (T.o.on) { const b = wbox(T.o.on, t); x += b.x + b.w / 2; y += b.y; } return [x, y]; };
    const textFrame = (t, cam) => {
      for (const T of texts) {
        const on = t >= T.at && t < T.until; set(T.e, { display: on ? '' : 'none' }); if (!on) continue;
        const [x, y] = textPos(T, t), S = FLAT ? U : 1, al = T.o.align ?? 'left', ox = al === 'left' ? 0 : al === 'right' ? -100 : -50;
        const qo = T.until < 1e8 ? cl((t - (T.until - 0.4)) / 0.4) : 0;
        const n = T.enter === 'type' ? Math.min(T.chars.length, Math.floor((frameT(t) - T.at) / T.per) + 1) : T.chars.length;
        T.chars.forEach((s, i) => set(s, { visibility: i < n ? 'visible' : 'hidden' }));
        const qi = T.enter === 'none' ? 1 : E.sine(cl((t - T.at) / 0.3));
        set(T.e, { transform: `translate(${f1(x * S)}px,${f1(y * S)}px) translate(${ox}%,-50%)`, opacity: (qi * (1 - qo)).toFixed(3) });
        if (T.enter === 'type' && n < T.chars.length && !FLAT && cam) {   // the needle at the next letter
          const sp = T.chars[n], w = T.e.offsetWidth, lx = x + (sp.offsetLeft + sp.offsetWidth * cl(((frameT(t) - T.at) % T.per) / T.per)) + (ox / 100) * w, k = cam.z * U;
          needles.push({ x: (lx - cam.x) * k + W / 2, y: (y + T.size * 0.15 - cam.y) * k + H / 2, a: -0.4, c: col(T.o.tone ?? 'ink'), t, id: 900 + T.at * 10 });
        }
      }
    };
    // a stitched text on the scrolling cloth is DOM while it is in the frame (the checks read it); once the cloth has carried it off, its window ends and
    // a canvas copy is drawn on the cloth instead (a pull-back still shows it). Texts with their own until, or stay: true, keep their window
    const textW = (T) => { let n = 0; for (const ch of T.text) n += /[^\x00-\xff]/.test(ch) ? 1 : 0.6; return n * T.size * (1 + T.track) + 4; };
    const settleTexts = () => {
      // a caption waits until the cloth has brought its whole width into the frame (portrait is narrow), then is stitched
      for (const c of captions) {
        if (!FLAT && c.arrive && c.at > 0) {
          const x0 = c.x - (c.align === 'center' ? c.w / 2 : c.align === 'right' ? c.w : 0), x1 = x0 + c.w;
          for (let t = c.at; t < c.at + 6 && t < F.duration; t += 0.1) { const v = camAt(t), k = v.z * U; if ((x0 - v.x) * k + W / 2 >= W * 0.02 && (x1 - v.x) * k + W / 2 <= W * 0.98) { const d = t - c.at; if (d > 0.05) { for (const T of c.parts) { T.at += d; if (T.reg) T.reg.win[0] += d; } c.at = t; } break; } }
        }
        if (c.sfx) F.sfx(c.at, 'letter', 0.3, { dur: Math.min(1.4, units(c.text) * 0.07) });
      }
      if (FLAT) return;
      for (const T of texts) {
        if (T.o.until != null || T.o.stay || T.o.on || typeof T.o.x === 'function') continue;
        const w = textW(T), al = T.o.align ?? 'left', x0 = T.o.x - (al === 'center' ? w / 2 : al === 'right' ? w : 0), x1 = x0 + w;
        let seen = false;   // it leaves only after it has been in the frame (a push-in elsewhere first doesn't end it)
        for (let t = T.at; t < F.duration; t += 0.1) { const v = camAt(t), k = v.z * U, out = (x1 - v.x) * k + W / 2 < 0 || (x0 - v.x) * k + W / 2 > W; if (!out && t >= T.at + 0.5) seen = true; if (out && seen) { T.until = t; T.ghost = { x0, w }; if (T.reg) T.reg.win[1] = t; break; } }
      }
    };
    const drawGhosts = (ctx, t, vx0, vx1) => {
      for (const T of texts) {
        if (!T.ghost || t < T.until || T.ghost.x0 > vx1 || T.ghost.x0 + T.ghost.w < vx0) continue;
        const sz = T.size, y = T.o.y ?? 0, tone = col(T.o.tone ?? 'ink'), bs = 32 * (sz / 50) ** 0.5;
        ctx.save(); ctx.font = `${T.o.weight ?? 700} ${sz}px ${T.o.font === 'latin' ? FONT.latin : FONT.text}`; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        let x = T.ghost.x0;
        [...T.text].forEach((ch, i) => {
          const c2 = i === 0 && T.o.initial ? col(T.o.initial) : tone, cw = ctx.measureText(ch).width, p = ctx.createPattern(satinCv(c2).cv, 'repeat'); p.setTransform(new DOMMatrix().scaleSelf(bs / 64, bs / 64));
          ctx.shadowColor = 'rgba(52,36,20,0.42)'; ctx.shadowBlur = 0.8; ctx.shadowOffsetX = 0.9; ctx.shadowOffsetY = 1.3;
          ctx.fillStyle = p; ctx.fillText(ch, x, y); ctx.shadowColor = 'transparent';
          ctx.strokeStyle = mixHex(c2, C0.ink, 0.55); ctx.lineWidth = Math.max(0.7, sz * 0.022); ctx.strokeText(ch, x, y);
          x += cw + sz * T.track;
        });
        ctx.restore();
      }
    };
    // a running caption (HERE, … in the original): stitched capitals under the upper border, a smaller line under it
    B.caption = (text, o = {}) => {
      const x = o.x ?? 0, y = o.y ?? -536, at = o.at ?? 0, until = o.until ?? 1e9, size = o.size ?? B.L(54, 54), out = [];
      out.push(stitchText(text, { ...o, x, y, size, at, until, tone: o.tone ?? 'ink', kind: o.kind ?? 'label' }));
      if (o.sub) out.push(stitchText(o.sub, { x: x + (o.subDx ?? 4), y: y + size * 0.62 + (o.subSize ?? 34) * 0.78, size: o.subSize ?? 34, at: at + Math.min(1.2, units(text) * 0.06) + 0.1, until, tone: o.subTone ?? 'navy', font: o.subFont ?? (/^[A-Z .,·IVXLCDM]+$/.test(o.sub) ? 'latin' : 'text'), kind: 'label', align: o.align, fact: o.subFact }));
      const c = { x, y, at, until, w: units(text) * size * 1.06, align: o.align ?? 'left', text, parts: out, sfx: at > 0 && o.sfx !== false, arrive: o.arrive !== false };
      captions.push(c);
      return out;
    };
    const captions = [];

    // ---------- figures: flat, side-on, big gestures (a project's cast) ----------
    const castDefs = {};
    const LOOK0 = { tunic: 'red', cloak: 'blue', hose: 'navy', hair: 'brown', beard: 'none', robe: false, sex: 'male', belt: 'ochre', trim: 'ochre', shoe: 'ink' };
    B.cast = (defs) => { Object.assign(castDefs, defs); if (window.EV && window.EV.castCheck) window.EV.castCheck(defs, (c) => ({ ...LOOK0, ...c }), 'tapestry'); return B; };
    const POSES = {
      stand: [14, 10, -10, 8], point: [88, 4, 14, 12], reach: [72, 22, 54, 30], raise: [160, 8, -6, 10], cheer: [162, 6, 150, 12], hold: [52, 72, 40, 78],
      carry: [24, 96, 18, 100], present: [66, 18, 22, 22], think: [26, 150, 6, 14], open: [62, 10, -46, 12], bow: [36, 30, 30, 34], rest: [8, 6, -4, 6], lift: [118, 40, 104, 52], read: [58, 64, 50, 70],
      write: (t) => [44, 74 + Math.sin(t * 11) * 9, 34, 66], work: (t) => [118 + Math.sin(t * 6.3) * 52, 22 + Math.sin(t * 6.3 + 0.8) * 18, 40, 70], pull: (t) => [84 - Math.max(0, Math.sin(t * 3.2)) * 40, 8, 74 - Math.max(0, Math.sin(t * 3.2)) * 38, 14], knead: (t) => [52 + Math.sin(t * 5) * 10, 60 + Math.sin(t * 5) * 16, 46 - Math.sin(t * 5) * 10, 66 - Math.sin(t * 5) * 14], carve: (t) => [50 + Math.sin(t * 14) * 5, 70 + Math.sin(t * 14) * 8, 44, 76], pound: (t) => [96 + Math.sin(t * 5.5) * 44, 30 + Math.sin(t * 5.5 + 0.6) * 20, 86 + Math.sin(t * 5.5) * 40, 36 + Math.sin(t * 5.5 + 0.6) * 18],
    };
    B.poses = POSES;
    const figs = [];
    B.figure = (name, o = {}) => {
      const look = { ...LOOK0, ...(castDefs[name] || {}), ...(o.look || {}) }, h = o.h ?? 320, s = h / 300, face = o.face === 'left' ? -1 : 1;
      const root = B.group({ x: o.x ?? 0, y: o.y ?? 0, at: o.at ?? 0, until: o.until, exit: o.exit, enter: o.enter, z: o.z ?? 0, sketch: o.sketch, inDur: o.inDur });
      const fig = B.group({ in: root, sx: face * s * (o.wide ?? 1.15), sy: s }); fig.p.order = 0;   // a little broader than tall-thin: the tapestry's figures are sturdy
      const robe = look.robe || look.sex === 'female', female = look.sex === 'female';
      const hemY = robe ? -16 : -98;
      // the pose keys (front shoulder, front elbow, back shoulder, back elbow); a pose may be a function of t (work, write, pull)
      const pk = [[-1, 0, o.pose ?? 'stand']];
      const poseAt = (t) => {
        let cur = null, prev = null, a0 = 0;
        for (const k of pk) { if (k[0] <= t) { prev = cur; cur = k; } }
        const val = (k, tt) => { const p = typeof k[2] === 'string' ? POSES[k[2]] ?? POSES.stand : k[2]; return typeof p === 'function' ? p(tt) : p; };
        const now = val(cur, t);
        if (prev && t < cur[0] + cur[1]) { const q = E.cubicInOut((t - cur[0]) / cur[1]), was = val(prev, cur[0]); return now.map((v, i) => lerp(was[i], v, q)); }
        a0 = 0; return now;
      };
      const legs = [], walk = [];
      const sitK = [];   // [at, dur, on]
      const sitAt = (t) => { let v = o.sit ? 1 : 0; for (const [a, d, on] of sitK) { if (t >= a) v = lerp(v, on, E.cubicInOut(cl((t - a) / d))); } return v; };
      const stepAt = (t) => { for (const [a, b] of walk) if (t >= a && t < b) return Math.sin((t - a) * 7.5); return 0; };
      // legs (behind the tunic), each hip → knee → foot with a cross-gartered hose and a shoe
      for (const side of [-1, 1]) {
        const lg = fig.group({ x: side * 7, y: -108, z: -2 + side * 0.5, order: side < 0 ? 4 : 5 });
        lg.p.rot = (t) => { const st = stepAt(t), sv = sitAt(t); return lerp(side * 6 + st * side * 20, -86 - side * 4, sv); };
        lg.p.y = (t) => -108 + sitAt(t) * 50;
        lg.line({ pts: [[0, 0], [0, 54]], w: 14, fill: look.hose, order: 0 });
        const shin = lg.group({ x: 0, y: 54, order: 1 }); shin.p.rot = (t) => { const sv = sitAt(t), st = stepAt(t); return lerp(Math.max(0, -st * side) * 24, 90 + side * 4, sv); };
        shin.line({ pts: [[0, 0], [0, 48]], w: 13, fill: look.hose });
        for (let k = 0; k < 3; k++) shin.line({ pts: [[-6, 6 + k * 13], [6, 14 + k * 13]], w: 2.6, edge: look.trim === 'ochre' ? 'ochre' : look.trim });
        shin.shape({ d: 'M-7 44 L7 44 C15 44 22 48 22 53 L-8 53 Z', fill: look.shoe, dir: 0 });
        legs.push(lg);
      }
      // the back arm (behind the body)
      const arm = (side, zz) => {
        const sh = fig.group({ x: side > 0 ? 4 : -6, y: -222, z: zz, order: side > 0 ? 8 : 7 });
        sh.line({ pts: [[0, 0], [0, 58]], w: 16, fill: look.tunic });
        const fore = sh.group({ x: 0, y: 58 }); fore.line({ pts: [[0, 0], [0, 50]], w: 14, fill: look.tunic });
        fore.line({ pts: [[-7, 44], [7, 44]], w: 3.4, edge: look.trim });
        const hand = fore.group({ x: 0, y: 52 });
        hand.shape({ d: 'M-6 -2 L7 -2 C11 4 11 13 7 18 C3 21 -3 19 -6 13 Z', fill: null, lw: 3 }); hand.line({ pts: [[7, 2], [12, 8]], w: 3 });
        return { sh, fore, hand };
      };
      const back = arm(-1, -1);
      // the cloak behind, the tunic (or a long robe), belt and hem bands
      if (look.cloak && look.cloak !== 'none') fig.shape({ d: robe ? 'M-12 -230 C-30 -196 -44 -110 -50 -26 C-34 -18 -14 -22 -2 -28 L-2 -226 Z' : 'M-14 -230 C-30 -200 -42 -140 -48 -86 C-32 -80 -14 -84 -4 -88 L-2 -226 Z', fill: look.cloak, dir: 75, z: -3, order: 9 });
      const tunicD = robe ? 'M-17 -230 C-6 -235 8 -235 17 -230 L23 -196 L22 -160 L40 -18 C22 -10 -24 -10 -42 -18 L-22 -160 L-24 -196 Z' : 'M-17 -230 C-6 -235 8 -235 17 -230 L23 -196 L22 -164 L37 -100 C20 -92 -20 -92 -38 -100 L-22 -164 L-24 -196 Z';
      fig.shape({ d: tunicD, fill: look.tunic, dir: 90, order: 1 });
      fig.line({ pts: [[-23, -163], [23, -163]], w: 8, fill: look.belt, order: 2 });
      fig.line({ d: robe ? 'M-40 -26 C-20 -19 20 -19 38 -26' : 'M-36 -106 C-20 -99 20 -99 35 -106', w: 7, fill: look.trim, order: 3 });
      // the head: a profile (a big nose), bare linen inside the outline, an eye, the hair or a hat, a beard
      const head = fig.group({ x: 2, y: -236, order: 6 });
      head.shape({ d: 'M-10 4 L-12 -12 C-28 -20 -28 -56 -8 -62 C6 -66 18 -60 20 -50 L22 -43 L35 -29 L23 -26 L24 -20 L20 -14 L17 -9 C13 -5 9 -4 8 0 L8 4 Z', fill: null, order: 0 });
      head.dot({ x: 12, y: -43, r: 2.4, order: 3 }); head.line({ pts: [[6, -49], [18, -48]], w: 2.6, order: 3 });
      const hair = female && !look.hat ? null : look.hair;
      if (hair && hair !== 'none' && look.hat !== 'hood') head.shape({ d: look.hairLen === 'long' ? 'M-10 -12 C-30 -20 -30 -58 -8 -64 C8 -68 20 -60 20 -51 C8 -56 -2 -52 -4 -42 C-4 -30 -2 -8 -6 6 L-16 6 C-20 -2 -14 -8 -10 -12 Z' : 'M-10 -14 C-28 -18 -30 -56 -8 -63 C8 -67 20 -60 20 -51 C8 -56 -2 -52 -4 -42 C-4 -32 -6 -22 -10 -14 Z', fill: hair, dir: 100, order: 1 });
      if (look.beard && look.beard !== 'none') head.shape({ d: look.beard === 'long' ? 'M21 -14 C24 -2 16 12 4 14 C-4 12 -8 0 -8 -16 C2 -12 10 -14 21 -14 Z' : 'M21 -14 C22 -8 16 -1 6 -1 C-2 -2 -6 -9 -7 -17 C2 -13 10 -15 21 -14 Z', fill: look.beardTone ?? hair ?? 'brown', dir: 90, order: 2 });
      const hat = look.hat ?? (female ? 'veil' : 'none');
      const HATS = {
        helmet: 'M-25 -42 C-23 -62 -6 -78 0 -80 C6 -78 22 -62 24 -44 Z', cap: 'M-23 -44 C-25 -62 -4 -72 14 -64 C20 -60 22 -54 22 -48 Z', crown: 'M-20 -52 L-21 -74 L-12 -62 L-2 -78 L6 -62 L15 -74 L16 -52 Z',
        hood: 'M-12 6 C-32 -6 -32 -62 -4 -66 C14 -68 24 -58 24 -48 L18 -50 C8 -58 -2 -52 -4 -38 C-6 -24 -2 -8 8 2 Z', veil: 'M20 -52 C16 -68 -12 -72 -24 -54 C-32 -32 -30 2 -20 16 L4 10 C-4 -6 -6 -24 -2 -40 C4 -50 14 -54 20 -52 Z', tall: 'M-17 -54 L-15 -86 C-9 -94 9 -94 15 -86 L17 -54 Z', brim: 'M-26 -50 L24 -50 L22 -44 L-24 -44 Z M-15 -50 C-15 -66 13 -66 13 -50 Z',
      };
      if (hat && hat !== 'none' && HATS[hat]) head.shape({ d: HATS[hat], fill: look.hatTone ?? (hat === 'crown' ? 'ochre' : hat === 'helmet' ? 'blue' : hat === 'veil' ? (look.veil ?? 'cream') : 'navy'), dir: hat === 'veil' ? 80 : 0, order: 1 });
      if (hat === 'helmet') head.line({ pts: [[23, -46], [26, -28]], w: 4.5, order: 2 });
      if (hat === 'tall' || hat === 'brim') head.line({ pts: [[-18, -56], [18, -56]], w: 4, order: 2 });
      head.p.rot = (t) => { let v = 0; for (const a of nods) v += Math.sin(cl((t - a) / 0.7) * Math.PI) * -7; return v; };
      const nods = [];
      // the front arm, and the cloak's fold over the front shoulder with a brooch
      const front = arm(1, 3);
      if (look.cloak && look.cloak !== 'none') { fig.shape({ d: 'M-16 -233 C0 -240 13 -237 19 -229 C10 -214 -1 -207 -14 -205 Z', fill: look.cloak, dir: 20, z: 2, order: 10 }); fig.dot({ x: 10, y: -226, r: 4, edge: 'ochre', z: 4, order: 11 }); }
      const upper = [back.sh, front.sh, head];
      for (const n2 of upper) { const y0 = n2.p.y; n2.p.y = (t) => y0 + sitAt(t) * 50 + Math.abs(stepAt(t)) * -2.5; }
      for (const n2 of fig.kids) if (n2.kind !== 'group' && !legs.includes(n2)) { const y0 = n2.p.y ?? 0; n2.p.y = (t) => y0 + sitAt(t) * 50 + Math.abs(stepAt(t)) * -2.5; }
      back.sh.p.rot = (t) => -poseAt(t)[2]; back.fore.p.rot = (t) => -poseAt(t)[3];
      front.sh.p.rot = (t) => -poseAt(t)[0]; front.fore.p.rot = (t) => -poseAt(t)[1];
      // the figure's verbs
      const c = root; c.name = name; c.look = look; c.hand = front.hand; c.backHand = back.hand; c.head = head; c.events = []; c.fig = fig;
      c.pose = (at, name2, dur = 0.55) => { pk.push([at, dur, name2]); pk.sort((a, b) => a[0] - b[0]); c.events.push(at); return c; };
      c.go = (at, x, dur) => { const x0 = pv(c, 'x', at, 0), d = dur ?? Math.max(0.6, Math.abs(x - x0) / 110); c.to(at, { x }, d, E.sine); walk.push([at, at + d]); c.events.push(at, at + d); return c; };
      c.turn = (at, dur = 0.3) => { const cur = pv(fig, 'sx', at, face * s); fig.to(at, { sx: -cur }, dur, E.cubicInOut); c.events.push(at); return c; };
      c.nod = (at) => { nods.push(at); c.events.push(at); return c; };
      c.sit = (at, dur = 0.6) => { sitK.push([at, dur, 1]); c.events.push(at); return c; };
      c.stand = (at, dur = 0.6) => { sitK.push([at, dur, 0]); c.events.push(at); return c; };
      figs.push(c);
      return c;
    };

    // background life for figures on screen while the story is elsewhere: seeded pose changes and nods between a and b
    B.idle = (list, a, b, o = {}) => {
      const pool = o.poses ?? ['point', 'open', 'present', 'rest', 'stand', 'raise', 'think'];
      list.forEach((c, i) => { const r = rngOf(SEED ^ hash('idle' + i + a)); for (let t = a + r() * (o.every ?? 2.5); t < b; t += (o.every ?? 2.5) * (0.7 + r() * 0.6)) { if (r() < 0.3) c.nod(t); else c.pose(t, pool[Math.floor(r() * pool.length)], 0.6); } });
      return B;
    };
    // ---------- trees, the arch, scenery ----------
    const leafD = (r2) => { const q = (v) => f1(v * r2); return `M0 0 C${q(-0.3)} ${q(-0.15)} ${q(-1.05)} ${q(-0.4)} ${q(-0.98)} ${q(-1.0)} C${q(-0.92)} ${q(-1.3)} ${q(-0.5)} ${q(-1.22)} ${q(-0.36)} ${q(-0.98)} C${q(-0.3)} ${q(-1.38)} ${q(0.3)} ${q(-1.38)} ${q(0.36)} ${q(-0.98)} C${q(0.5)} ${q(-1.22)} ${q(0.92)} ${q(-1.3)} ${q(0.98)} ${q(-1.0)} C${q(1.05)} ${q(-0.4)} ${q(0.3)} ${q(-0.15)} 0 0 Z`; };
    B.leaf = (o = {}) => B.shape({ ...o, d: leafD(o.r ?? 26), fill: o.fill ?? 'green', dir: o.dir ?? 90 });
    // a stylised tree: a laid trunk, branches curling up in pairs, each ending in a fan of leaves (kind 'fan' | 'interlace' | 'bare')
    B.tree = (o = {}) => {
      const h = o.h ?? 420, x = o.x ?? 0, kind = o.kind ?? 'fan', r = rngOf(SEED ^ hash('tree' + x + h + (o.seed ?? ''))), trunk = o.trunk ?? 'brown', leaves = o.leaves ?? ['green', 'olive', 'sage', 'blue'];
      const g = B.group({ x, y: o.y ?? 0, at: o.at ?? 0, until: o.until, exit: o.exit, enter: o.enter ?? ((o.at ?? 0) > 0 ? 'grow' : 'none'), z: o.z ?? -1, sketch: o.sketch });
      let ord = 0;
      if (kind === 'interlace') {
        g.line({ d: `M-10 4 C-30 ${-h * 0.25} 24 ${-h * 0.45} 0 ${-h * 0.7} C-14 ${-h * 0.82} 8 ${-h * 0.88} 4 ${-h * 0.95}`, w: 14, fill: trunk, taper: [1.3, 0.6], order: ord++ });
        g.line({ d: `M10 4 C30 ${-h * 0.25} -24 ${-h * 0.45} 0 ${-h * 0.7} C14 ${-h * 0.82} -8 ${-h * 0.88} -4 ${-h * 0.95}`, w: 12, fill: o.trunk2 ?? 'red', taper: [1.2, 0.6], order: ord++ });
      } else g.line({ pts: [[0, 4], [0, -h * 0.94]], w: o.w ?? 14, fill: trunk, taper: [1.35, 0.7], order: ord++ });
      const tips = [[0, -h * 0.97, 0]];
      if (kind !== 'interlace') {
        const n = o.branches ?? Math.max(2, Math.round(h / 150));
        for (let i = 0; i < n; i++) {
          const y0 = -h * (0.4 + (0.48 * i) / Math.max(1, n - 1)) + (r() - 0.5) * 10, len = h * (0.24 - i * 0.025) * (0.9 + r() * 0.2);
          for (const side of [-1, 1]) {
            if (n > 2 && i === n - 1 && side < 0 && r() < 0.3) continue;
            const ex = side * len, ey = y0 - len * 0.75;
            g.line({ d: `M0 ${y0} C${side * len * 0.55} ${y0 + 4} ${ex} ${y0 - len * 0.2} ${ex} ${ey}`, w: o.bw ?? 9, fill: trunk, taper: [1, 0.65], order: ord++ });
            tips.push([ex, ey, side * 14]);
          }
        }
      } else for (const side of [-1, 1]) { const ex = side * h * 0.2, ey = -h * 0.8; g.line({ d: `M0 ${-h * 0.7} C${side * h * 0.16} ${-h * 0.68} ${ex} ${-h * 0.74} ${ex} ${ey}`, w: 8, fill: trunk, order: ord++ }); tips.push([ex, ey, side * 18]); }
      if (kind !== 'bare') tips.forEach(([tx, ty, rot], i) => { g.add((gg) => { const lf = B.leaf({ in: gg, x: tx, y: ty + 4, r: (o.leaf ?? 30) * (i === 0 ? 1.1 : 0.9 + r() * 0.2), rot: rot + (r() - 0.5) * 10, fill: leaves[(i + Math.floor(r() * 2)) % leaves.length], order: ord++ }); lf.p.edge = 'ink'; }); });
      g.tips = tips;
      return g;
    };
    // an act opens under an arch: a tree whose trunk bends over into a branch arch, a second tree, birds on the arch, the title and a line under it
    B.act = (o = {}) => {
      const x = o.x ?? 0, w = o.w ?? B.L(980, 700), at = o.at ?? 0, top = o.top ?? -560, until = o.until, x0 = x - w / 2, x1 = x + w / 2;
      const oy = o.y ?? 0, g = B.group({ x: 0, y: oy, at, until, exit: o.exit, enter: 'grow', z: -1, inDur: o.inDur ?? 3.2 / SPEED });
      g.line({ d: `M${x0} 4 L${x0} ${top + 160} C${x0} ${top + 40} ${x0 + w * 0.2} ${top} ${x} ${top} C${x1 - w * 0.25} ${top} ${x1 - 40} ${top + 30} ${x1 - 26} ${top + 70}`, w: 15, fill: 'brown', taper: [1.3, 0.55], order: 0 });
      const t2 = B.tree({ in: g, x: x1, h: Math.abs(top) - 30, kind: 'fan', at: -1, branches: 3, seed: 'act' + x }); t2.p.order = 1;
      g.line({ d: `M${x0} ${top + 210} C${x0 - 40} ${top + 190} ${x0 - 60} ${top + 160} ${x0 - 66} ${top + 120}`, w: 8, fill: 'brown', taper: [1, 0.6], order: 2 });
      B.leaf({ in: g, x: x0 - 66, y: top + 124, r: 28, rot: -20, fill: 'olive', order: 3 });
      [[x0 + w * 0.22, 'blue'], [x + w * 0.16, 'red']].forEach(([bx, c2], i) => { const bb = g.group({ x: bx, y: top - 2 + (i ? 0 : 6), sx: i ? -1 : 1, order: 4 + i }); bb.shape({ d: BEASTS.bird.body, fill: c2, dir: 0 }); bb.shape({ d: BEASTS.bird.part, fill: i ? 'ochre' : 'green', dir: 70 }); bb.dot({ x: BEASTS.bird.eye[0], y: BEASTS.bird.eye[1], r: 2 }); });
      B.dot({ in: g, x, y: top, r: 11, edge: 'ochre', order: 6 }); B.dot({ in: g, x, y: top, r: 5, edge: 'red', order: 7 });
      const ty0 = o.titleY ?? top + 200, ty = ty0 + oy, size = o.size ?? B.L(84, 76), tAt = at + (o.titleAt ?? 2.2);
      const parts = [];
      if (o.n) parts.push(stitchText(o.n, { x, y: ty - size * 0.95, size: size * 0.48, at: tAt - 0.6, until, tone: 'red', align: 'center', kind: 'label' }));
      parts.push(stitchText(o.title, { x, y: ty, size: Math.min(size, (w * 0.82) / Math.max(1, units(o.title))), at: tAt, until, tone: o.tone ?? 'ink', align: 'center', kind: o.kind ?? 'headline', initial: o.initial, noFact: o.noFact }));
      const rule = B.group({ in: g, order: 9 }); for (let i = -6; i <= 6; i++) rule.dot({ x: x + i * 18, y: ty0 + size * 0.72, r: 2.6, edge: i % 2 ? 'red' : 'ochre' });
      if (o.sub) parts.push(stitchText(o.sub, { x, y: ty + size * 1.2, size: o.subSize ?? 36, at: tAt + 0.9, until, tone: 'navy', align: 'center', font: o.subFont ?? (/^[A-Z .,·IVXLCDM]+$/.test(o.sub) ? 'latin' : 'text'), kind: o.subKind ?? 'label' }));
      if (o.sfx !== false) { F.sfx(at, 'act', 0.4); F.sfx(tAt, 'letter', 0.3, { dur: 1 }); }
      acts.push({ g, at, x, w, title: o.title });
      g.texts = parts;
      return g;
    };
    const acts = [];
    B.hill = (o = {}) => { const w = o.w ?? 320, h = o.h ?? 110; return B.shape({ ...o, x: (o.x ?? 0) - w / 2, y: o.y ?? 2, d: `M0 0 C${w * 0.12} ${-h * 0.9} ${w * 0.35} ${-h} ${w * 0.5} ${-h} C${w * 0.68} ${-h} ${w * 0.86} ${-h * 0.8} ${w} 0 Z`, fill: o.fill ?? 'olive', dir: o.dir ?? 0, z: o.z ?? -2 }); };
    B.water = (o = {}) => { const w = o.w ?? 500, x0 = (o.x ?? 0) - w / 2, g = B.group({ ...o, x: 0, y: 0, z: o.z ?? -1 }); for (let k = 0; k < (o.rows ?? 3); k++) { const pts = []; for (let x = 0; x <= w; x += 12) pts.push([x0 + x, (o.y ?? -6) - k * 14 + Math.sin(x * 0.06 + k * 1.7) * 3.5]); g.line({ pts, w: 7, fill: k % 2 ? 'blue' : 'navy', edge: false, curve: true, order: k }); } return g; };
    // a Norse longship: a curved hull with a beast-head prow, a mast, a striped sail (sail: false for none)
    B.boat = (o = {}) => {
      const w = o.w ?? 420, g = B.group({ ...o, x: o.x ?? 0, y: o.y ?? 0 }), hh = w * 0.16;
      g.shape({ d: `M${-w / 2} ${-hh} C${-w * 0.42} ${-hh * 0.1} ${-w * 0.3} 0 0 0 C${w * 0.3} 0 ${w * 0.42} ${-hh * 0.1} ${w / 2} ${-hh} L${w * 0.5} ${-hh * 1.6} C${w * 0.56} ${-hh * 1.9} ${w * 0.6} ${-hh * 1.7} ${w * 0.54} ${-hh * 1.4} L${w * 0.44} ${-hh * 0.5} L${-w * 0.44} ${-hh * 0.5} L${-w * 0.5} ${-hh * 1.4} C${-w * 0.56} ${-hh * 1.8} ${-w * 0.5} ${-hh * 1.9} ${-w * 0.47} ${-hh * 1.5} Z`, fill: o.hull ?? 'brown', dir: 0, order: 0 });
      g.line({ pts: [[-w * 0.43, -hh * 0.5], [w * 0.43, -hh * 0.5]], w: 7, fill: 'ochre', order: 1 });
      if (o.sail !== false) { g.line({ pts: [[0, -hh * 0.5], [0, -w * 0.78]], w: 7, fill: 'brown', order: 2 }); const sw = w * 0.26; for (let k = 0; k < 4; k++) g.rect({ x: -sw / 2 + (k * sw) / 4, y: -w * 0.72, w: sw / 4, h: w * 0.42, fill: ['red', 'ochre', 'green', 'red'][k], dir: 90, order: 3 + k }); }
      return g;
    };
    // a Romanesque hall: columns and round arches under a tiled roof (roof 'gable' | 'dome' | 'tower')
    B.hall = (o = {}) => {
      const w = o.w ?? 300, h = o.h ?? 260, g = B.group({ ...o, x: (o.x ?? 0) - w / 2, y: o.y ?? 0, z: o.z ?? -1 }), n = o.bays ?? Math.max(1, Math.round(w / 110)), bw = w / n;
      for (let i = 0; i <= n; i++) g.rect({ x: i * bw - 7, y: -h * 0.72, w: 14, h: h * 0.72, fill: o.columns ?? 'ochre', dir: 90, order: i });
      for (let i = 0; i < n; i++) g.line({ d: `M${i * bw} ${-h * 0.72} C${i * bw} ${-h * 0.9} ${(i + 1) * bw} ${-h * 0.9} ${(i + 1) * bw} ${-h * 0.72}`, w: 10, fill: o.arches ?? 'red', order: n + 1 + i });
      g.rect({ x: -10, y: -h * 0.86, w: w + 20, h: 20, fill: o.beam ?? 'green', dir: 0, order: 2 * n + 2 });
      const roof = o.roof ?? 'gable';
      if (roof === 'dome') g.shape({ d: `M0 ${-h * 0.86} C0 ${-h * 1.25} ${w} ${-h * 1.25} ${w} ${-h * 0.86} Z`, fill: o.roofTone ?? 'blue', dir: 90, order: 2 * n + 3 });
      else if (roof === 'tower') g.rect({ x: w * 0.3, y: -h * 1.3, w: w * 0.4, h: h * 0.44, fill: o.roofTone ?? 'blue', order: 2 * n + 3 });
      else g.poly({ pts: [[-18, -h * 0.86], [w / 2, -h * 1.12], [w + 18, -h * 0.86]], fill: o.roofTone ?? 'blue', dir: 30, order: 2 * n + 3 });
      return g;
    };
    B.table = (o = {}) => { const w = o.w ?? 200, h = o.h ?? 100, g = B.group({ ...o, x: (o.x ?? 0) - w / 2, y: o.y ?? 0 }); g.rect({ x: 0, y: -h, w, h: 14, fill: o.tone ?? 'brown', dir: 0, order: 0 }); g.line({ pts: [[16, -h + 12], [12, 0]], w: 9, fill: o.tone ?? 'brown', order: 1 }); g.line({ pts: [[w - 16, -h + 12], [w - 12, 0]], w: 9, fill: o.tone ?? 'brown', order: 2 }); g.top = -h; return g; };
    // a slanted writing desk on a post (a lectern)
    B.desk = (o = {}) => { const w = o.w ?? 110, h = o.h ?? 150, g = B.group({ ...o, x: o.x ?? 0, y: o.y ?? 0 }); g.line({ pts: [[0, 0], [0, -h + 10]], w: 10, fill: o.tone ?? 'brown', order: 0 }); g.line({ pts: [[-30, 0], [30, 0]], w: 9, fill: o.tone ?? 'brown', order: 1 }); g.poly({ pts: [[-w / 2, -h + 22], [w / 2, -h - 14], [w / 2, -h - 2], [-w / 2, -h + 34]], fill: o.top ?? 'red', dir: -18, order: 2 }); g.top = -h; return g; };
    // a book: closed (a block with a clasp) or open (two pages with stitched lines)
    B.book = (o = {}) => {
      const w = o.w ?? 70, h = o.h ?? 90, g = B.group({ ...o, x: o.x ?? 0, y: o.y ?? 0 });
      if (o.open) { for (const side of [-1, 1]) { g.shape({ d: side < 0 ? `M0 0 C${-w * 0.3} ${-6} ${-w * 0.7} ${-6} ${-w} 0 L${-w} ${-h} C${-w * 0.7} ${-h - 8} ${-w * 0.3} ${-h - 8} 0 ${-h} Z` : `M0 0 C${w * 0.3} -6 ${w * 0.7} -6 ${w} 0 L${w} ${-h} C${w * 0.7} ${-h - 8} ${w * 0.3} ${-h - 8} 0 ${-h} Z`, fill: o.page ?? 'cream', dir: 90, order: 0 }); for (let k = 1; k <= (o.lines ?? 4); k++) g.line({ pts: [[side * w * 0.18, -h + k * h / ((o.lines ?? 4) + 1)], [side * w * 0.82, -h + k * h / ((o.lines ?? 4) + 1)]], w: 2.6, edge: o.ink ?? 'navy', order: 1 }); } }
      else { g.rect({ x: -w / 2, y: -h, w, h, r: 4, fill: o.cover ?? 'red', dir: 90, order: 0 }); g.line({ pts: [[-w / 2 + 8, -h], [-w / 2 + 8, 0]], w: 4, edge: o.trim ?? 'ochre', order: 1 }); g.dot({ x: w / 2 - 2, y: -h / 2, r: 4, edge: o.trim ?? 'ochre', order: 2 }); }
      return g;
    };
    // a scroll (a roll): a sheet with stitched lines between two rollers; open: 0–1 how far it is unrolled (can be a function of t)
    B.roll = (o = {}) => {
      const w = o.w ?? 220, h = o.h ?? 80, g = B.group({ ...o, x: o.x ?? 0, y: o.y ?? 0 });
      g.rect({ x: -w / 2, y: -h / 2, w, h, fill: o.page ?? 'cream', dir: 0, order: 0 });
      for (let k = 1; k <= (o.lines ?? 3); k++) g.line({ pts: [[-w / 2 + 16, -h / 2 + (k * h) / ((o.lines ?? 3) + 1)], [w / 2 - 16, -h / 2 + (k * h) / ((o.lines ?? 3) + 1)]], w: 2.6, edge: o.ink ?? 'navy', order: 1 });
      for (const side of [-1, 1]) g.rect({ x: side * w / 2 - 9, y: -h / 2 - 8, w: 18, h: h + 16, r: 8, fill: o.roller ?? 'brown', dir: 90, order: 2 });
      return g;
    };
    // a slab (a clay tablet, a board, a sign): a rounded block with marks — 'wedge' (cuneiform), 'lines', 'grid', 'dots' — or text
    B.slab = (o = {}) => {
      const w = o.w ?? 90, h = o.h ?? 120, g = B.group({ ...o, x: o.x ?? 0, y: o.y ?? 0 }), r = rngOf(SEED ^ hash('slab' + (o.x ?? 0) + w)), mk = o.marks ?? 'lines';
      g.rect({ x: -w / 2, y: -h, w, h, r: o.r ?? 10, fill: o.tone ?? 'salmon', dir: 0, order: 0 });
      const rows = o.rows ?? Math.max(2, Math.floor(h / 20));
      for (let k = 0; k < rows; k++) {
        const y = -h + (h * (k + 0.7)) / (rows + 0.4);
        if (mk === 'wedge') for (let x = -w / 2 + 12; x < w / 2 - 10; x += 9 + r() * 6) { const vert = r() < 0.4; g.shape({ d: vert ? `M${x} ${y - 6} L${x + 5} ${y - 6} L${x + 2.5} ${y + 5} Z` : `M${x - 2} ${y - 2.5} L${x - 2} ${y + 2.5} L${x + 7} ${y} Z`, fill: o.markTone ?? 'brown', edge: o.markTone ?? 'brown', lw: 1.6, dir: 0, couch: 0, order: 1 }); }
        else if (mk === 'lines') g.line({ pts: [[-w / 2 + 12, y], [w / 2 - 12 - r() * 16, y]], w: 3, edge: o.markTone ?? 'ink', order: 1 });
        else if (mk === 'grid') for (let x = -w / 2 + 14; x < w / 2 - 10; x += 16) g.rect({ x, y: y - 6, w: 11, h: 11, fill: o.markTone ?? 'ink', lw: 1.6, couch: 0, order: 1 });
        else if (mk === 'dots') for (let x = -w / 2 + 14; x < w / 2 - 10; x += 14) g.dot({ x, y, r: 2.4, edge: o.markTone ?? 'ink', order: 1 });
      }
      return g;
    };
    B.fire = (o = {}) => { const s = o.size ?? 60, g = B.group({ ...o, x: o.x ?? 0, y: o.y ?? 0 }); [[0, 1, 'red'], [-s * 0.3, 0.7, 'ochre'], [s * 0.32, 0.65, 'ochre']].forEach(([dx, k, c2], i) => { const fl = g.shape({ x: dx, d: `M${-s * 0.28 * k} 0 C${-s * 0.4 * k} ${-s * 0.5 * k} ${-s * 0.1 * k} ${-s * 0.7 * k} 0 ${-s * 1.2 * k} C${s * 0.1 * k} ${-s * 0.7 * k} ${s * 0.4 * k} ${-s * 0.5 * k} ${s * 0.28 * k} 0 Z`, fill: c2, dir: 90, order: i }); fl.p.sy = (t) => 1 + Math.sin(t * (7 + i) + i) * 0.06; }); return g; };
    // a gear (spin: degrees a second; teeth; spokes) — stitched; turning is a rotation of the finished embroidery
    B.gear = (o = {}) => {
      const R = o.r ?? 80, n = o.teeth ?? Math.max(8, Math.round(R / 7)), g = B.group({ ...o, x: o.x ?? 0, y: o.y ?? 0 }), r0 = R * 0.84, pts = [];
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, da = Math.PI / n; for (const [ang, rr] of [[a - da * 0.5, r0], [a - da * 0.32, R], [a + da * 0.32, R], [a + da * 0.5, r0]]) pts.push([Math.cos(ang) * rr, Math.sin(ang) * rr]); }
      const inner = R * 0.62, d = 'M' + pts.map((q) => q.map(f1).join(' ')).join(' L') + ` Z M${f1(inner)} 0 A${f1(inner)} ${f1(inner)} 0 1 0 ${f1(-inner)} 0 A${f1(inner)} ${f1(inner)} 0 1 0 ${f1(inner)} 0 Z`;
      const body = g.group({ order: 0 }); body.shape({ d, fill: o.tone ?? 'ochre', dir: 0 });
      for (let k = 0; k < (o.spokes ?? 4); k++) { const a = (k / (o.spokes ?? 4)) * Math.PI * 2; body.line({ pts: [[Math.cos(a) * R * 0.14, Math.sin(a) * R * 0.14], [Math.cos(a) * inner * 1.02, Math.sin(a) * inner * 1.02]], w: Math.max(8, R * 0.13), fill: o.tone ?? 'ochre' }); }
      body.dot({ r: R * 0.13, edge: o.hub ?? 'red' });
      if (o.spin) body.p.rot = (t) => (o.phase ?? 0) + t * o.spin;
      g.body = body; return g;
    };
    B.wheel = (o = {}) => { const R = o.r ?? 70, g = B.group({ ...o, x: o.x ?? 0, y: o.y ?? 0 }), body = g.group({}); body.line({ d: `M${R} 0 A${R} ${R} 0 1 1 ${-R} 0 A${R} ${R} 0 1 1 ${R} 0`, w: 12, fill: o.tone ?? 'brown' }); for (let k = 0; k < (o.spokes ?? 6); k++) { const a = (k / (o.spokes ?? 6)) * Math.PI; body.line({ pts: [[Math.cos(a) * R, Math.sin(a) * R], [-Math.cos(a) * R, -Math.sin(a) * R]], w: 6, fill: o.tone ?? 'brown' }); } body.dot({ r: 8, edge: o.hub ?? 'ochre' }); if (o.spin) body.p.rot = (t) => t * o.spin; g.body = body; return g; };
    B.sun = (o = {}) => { const R = o.r ?? 34, g = B.group({ ...o, x: o.x ?? 0, y: o.y ?? -480 }); g.circle({ r: R, fill: o.tone ?? 'ochre', dir: 0, order: 0 }); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; g.line({ pts: [[Math.cos(a) * R * 1.25, Math.sin(a) * R * 1.25], [Math.cos(a) * R * 1.65, Math.sin(a) * R * 1.65]], w: 4, edge: o.ray ?? 'red', order: 1 }); } return g; };
    B.star = (o = {}) => { const R = o.r ?? 14, pts = []; for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? R * 0.42 : R; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); } return B.poly({ ...o, pts, fill: o.tone ?? 'ochre', dir: 0, couch: 0 }); };
    // a plant: reeds (papyrus-like: stems with a burst head), or a flower
    B.plant = (o = {}) => { const h = o.h ?? 160, g = B.group({ ...o, x: o.x ?? 0, y: o.y ?? 0, z: o.z ?? -1 }), n = o.n ?? 3; for (let i = 0; i < n; i++) { const dx = (i - (n - 1) / 2) * 16, hh = h * (0.8 + 0.2 * ((i * 7) % 3) / 2), tx = dx * 1.8; g.line({ d: `M${dx} 2 C${dx} ${-hh * 0.5} ${tx} ${-hh * 0.7} ${tx} ${-hh}`, w: 5, edge: o.stem ?? 'olive', order: i }); if ((o.kind ?? 'reed') === 'reed') { for (let k = -3; k <= 3; k++) g.line({ pts: [[tx, -hh], [tx + k * 7, -hh - 26 + Math.abs(k) * 4]], w: 3, edge: o.head ?? 'green', order: n + i }); } else g.circle({ x: tx, y: -hh, r: 12, fill: o.head ?? 'red', order: n + i }); } return g; };
    B.bird = (o = {}) => { const g = B.group({ ...o, x: o.x ?? 0, y: o.y ?? -460, sx: (o.face === 'left' ? -1 : 1) * (o.scale ?? 1), sy: o.scale ?? 1 }), k = BEASTS[o.kind ?? 'bird'] ?? BEASTS.bird; for (const [x0, y0, x1, y1] of k.legs) g.line({ pts: [[x0, y0], [x1, y1]], w: 3.4, z: -1 }); g.shape({ d: k.body, fill: o.tone ?? 'blue', dir: 0 }); g.shape({ d: k.part, fill: o.wing ?? 'ochre', dir: 70 }); g.dot({ x: k.eye[0], y: k.eye[1], r: 2 }); return g; };
    // many of one thing, in rows (quantity told by repetition): make(group, i) draws one; they stitch one after another
    B.tally = (o = {}) => {
      const n = o.n ?? 10, cols = o.cols ?? n, gap = o.gap ?? 40, rg = o.rowGap ?? gap, g = B.group({ in: o.in, x: o.x ?? 0, y: o.y ?? 0, at: o.at ?? (o.in ? -1 : 0), until: o.until, exit: o.exit, enter: o.in ? o.enter : o.enter ?? 'stitch', z: o.z ?? 0, inDur: o.inDur });
      for (let i = 0; i < n; i++) { const it = g.group({ x: (i % cols) * gap, y: -Math.floor(i / cols) * rg, order: i }); if (o.make) o.make(it, i); else it.line({ pts: [[0, 0], [0, -24]], w: 4, edge: o.tone ?? 'ink' }); }
      return g;
    };

    // ---------- camera: the cloth scrolls past without stopping; push-ins on a detail ----------
    const bandZ = PT ? (0.6 * H) / (LAY.band[1] - LAY.band[0]) / U : (0.835 * H) / (LAY.band[1] - LAY.band[0]) / U;
    const bandY = PT ? LAY.band[0] - (0.13 * H - H / 2) / (bandZ * U) : LAY.band[0] - (0.025 * H - H / 2) / (bandZ * U);
    B.band = { z: bandZ, y: bandY };
    let track = [[0, 0]];
    // B.scroll([[t, x], …]): where the middle of the frame is on the cloth at each time; between the points the cloth moves smoothly and never stops
    B.scroll = (pts) => { track = pts.slice().sort((a, b) => a[0] - b[0]); return B; };
    const scrollX = (t) => {
      const p = track; if (t <= p[0][0]) return p[0][1] + (p.length > 1 ? (t - p[0][0]) * slope(0) * 0.0 : 0); if (t >= p[p.length - 1][0]) return p[p.length - 1][1];
      let i = 0; while (i < p.length - 2 && p[i + 1][0] < t) i++;
      const [t0, x0] = p[i], [t1, x1] = p[i + 1], h = t1 - t0, q = (t - t0) / h, m0 = slope(i) * h, m1 = slope(i + 1) * h;
      return (2 * q ** 3 - 3 * q * q + 1) * x0 + (q ** 3 - 2 * q * q + q) * m0 + (-2 * q ** 3 + 3 * q * q) * x1 + (q ** 3 - q * q) * m1;
    };
    // monotone slopes (Fritsch–Carlson): no overshoot, so the cloth never runs backwards; zero at the ends (it starts and stops gently)
    const slope = (i) => { const p = track; if (i <= 0 || i >= p.length - 1) return 0; const d0 = (p[i][1] - p[i - 1][1]) / (p[i][0] - p[i - 1][0]), d1 = (p[i + 1][1] - p[i][1]) / (p[i + 1][0] - p[i][0]); if (d0 * d1 <= 0) return 0; return (2 * d0 * d1) / (d0 + d1) * 1.0; };
    const pushes = [];
    // B.push(a, b, view, { back, backDur }): from a to b the camera pushes in on view ({ on, pad } | { x, y, z }), holds, and from back returns to the scroll
    B.push = (a, b, view, o = {}) => { const back = o.back ?? b + 2, bd = o.backDur ?? Math.max(0.8, b - a); pushes.push({ a, b, c: back, d: back + bd, view }); if (o.sfx !== false) F.sfx(a, 'push', 0.3, { dur: b - a }); F.info && F.info('annotate', a, back + bd); return B; };
    const resolve = (v, t) => {
      if (v.on) {
        const list = [].concat(v.on), bs = list.map((x) => (x && x.kind ? wbox(x, Math.max(t, x.at)) : x)).filter(Boolean);
        const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y)), x1 = Math.max(...bs.map((b) => b.x + b.w)), y1 = Math.max(...bs.map((b) => b.y + b.h));
        const pad = v.pad ?? 1.3, top = H * (PT ? 0.14 : 0.06), bot = H * (PT ? 0.72 : 0.84), z = v.z ?? cl(Math.min((W * 0.9) / ((x1 - x0) * pad * U), (bot - top) / ((y1 - y0) * pad * U)), bandZ, v.zmax ?? (PT ? 2.6 : 3.4));
        return { x: (x0 + x1) / 2 + (v.dx ?? 0), y: (y0 + y1) / 2 - ((top + bot) / 2 - H / 2) / (z * U) + (v.dy ?? 0), z };
      }
      return { x: v.x ?? 0, y: v.y ?? bandY, z: v.z ?? bandZ };
    };
    const pmemo = new Map();
    const camAt = (t) => {
      let v = { x: scrollX(t), y: bandY, z: bandZ };
      for (const p of pushes) {
        if (t < p.a || t >= p.d) continue;
        const w = t < p.b ? E.cubicInOut((t - p.a) / (p.b - p.a)) : t < p.c ? 1 : 1 - E.cubicInOut((t - p.c) / (p.d - p.c));
        const to0 = pmemo.get(p) ?? pmemo.set(p, resolve(p.view, p.b)).get(p), dz = 1 + Math.min(0.04, 0.012 * Math.max(0, t - p.b)), to = { ...to0, z: to0.z * dz };
        v = { x: lerp(v.x, to.x, w), y: lerp(v.y, to.y, w), z: Math.exp(lerp(Math.log(v.z), Math.log(to.z), w)) };
      }
      return v;
    };
    B.camAt = camAt;
    const camCss = (v) => { const k = v.z * U; return `matrix(${k.toFixed(5)},0,0,${k.toFixed(5)},${(W / 2 - v.x * k).toFixed(2)},${(H / 2 - v.y * k).toFixed(2)})`; };
    const inView = (v, x, y, m = 0) => { const k = v.z * U, sx2 = (x - v.x) * k + W / 2, sy2 = (y - v.y) * k + H / 2; return sx2 > -m && sx2 < W + m && sy2 > -m && sy2 < H + m; };

    // ---------- render ----------
    const sorted = () => roots.slice().sort((p, q) => p.z - q.z || p.ord - q.ord);
    if (!FLAT) {
      F.add((t) => {
        prep();
        const cam = camAt(t), ctx = mx, k = cam.z * U;
        ctx.setTransform(k, 0, 0, k, W / 2 - cam.x * k, H / 2 - cam.y * k);
        const vx0 = cam.x - W / 2 / k, vx1 = cam.x + W / 2 / k, vy0 = cam.y - H / 2 / k, vy1 = cam.y + H / 2 / k;
        ctx.fillStyle = linenOn(ctx, bucketOf(k) * U); ctx.fillRect(vx0 - 4, vy0 - 4, vx1 - vx0 + 8, vy1 - vy0 + 8);
        drawCloth(ctx, t, vx0, vx1);
        for (const n of sorted()) { if (n.layer) continue; const lead = n.p.sketch ?? SKETCH; if (t < n.at - lead || t >= n.until) continue; const b = wbox(n, t); if (b.x > vx1 + 200 || b.x + b.w < vx0 - 200 || b.y > vy1 + 200 || b.y + b.h < vy0 - 200) continue; drawNode(ctx, n, t); }
        drawGhosts(ctx, t, vx0, vx1);
        set(wl, { transform: camCss(cam) });
        textFrame(t, cam);
        drawNeedles(ctx, cam.z);
      });
    } else {
      // flat (kit.js): each scene layer gets its own canvas in frame px (world units × U), the linen on the layer's background
      const lc = new Map();
      B.layerCanvas = (layer) => { if (!lc.has(layer)) { const c = el('canvas', `left:0;top:0;width:${W}px;height:${H}px;z-index:1;pointer-events:none`, layer); c.width = W; c.height = H; c.dataset.motion = 'skip'; lc.set(layer, c.getContext('2d')); } return lc.get(layer); };
      B.linenCss = () => { const c = linenTile(C0.linen, SEED ^ 77, Math.max(1, U)); return `${C0.linen} url(${c.toDataURL('image/png')}) 0 0 / ${f1(96 * U)}px`; };
      F.late((t) => {
        prep();
        for (const [layer, ctx] of lc) {
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
          if (layer.style.display === 'none') continue;
          if (cloths.has(layer)) { ctx.setTransform(U, 0, 0, U, 0, 0); drawCloth(ctx, t, 0, W / U, cloths.get(layer)); }
          for (const n of sorted()) { if (n.layer !== layer || t < n.at - (n.p.sketch ?? SKETCH) || t >= n.until) continue; ctx.setTransform(U, 0, 0, U, 0, 0); drawNode(ctx, n, t); }
          drawNeedles(ctx, 1);
        }
        textFrame(t, null);
      });
    }

    // captions: dark wool letters with a linen halo, on the plain linen under the hem
    if (!FLAT && F.T && F.voiced && !F.caps && opt.captions !== false) {
      const co = opt.captions || {}, segs = window.EV.captionSegments(F.T, co.max ?? (PT ? 13 : 24)), size = F.px(co.size ?? (PT ? 44 : 40));
      const box = el('div', `left:0;right:0;top:${co.top ?? (PT ? H * 0.765 : H * 0.905)}px;text-align:center;z-index:880;pointer-events:none;display:none`, F.stage);
      const sp = el('span', `position:relative;display:inline-block;max-width:${W * 0.88}px;color:${mixHex(C0.ink, C0.navy, 0.3)};font:700 ${f1(size)}px/1.35 ${FONT.text};letter-spacing:.04em;text-shadow:0 0 ${F.px(7)}px ${C0.linen},0 0 ${F.px(3)}px ${C0.linen},0 ${F.px(1)}px ${F.px(1)}px rgba(255,248,230,.6)`, box);
      F.add((t) => { const c = segs.find((x) => t >= x.start && t < x.end); set(box, { display: c ? '' : 'none' }); if (c && sp.textContent !== c.text) sp.textContent = c.text; });
      for (const c of segs) { F.appear(c.start); F.appear(c.end); }
      F.caps = segs;
    }
    // the chapter (portrait): stitched on the linen above the upper border
    if (!FLAT && PT && opt.chapters !== false) F.prep(() => {
      const CH = (F.T && F.T.chapters) || []; if (!CH.length) return;
      const size = F.px(50), e = el('div', `left:0;right:0;top:${f1(H * 0.055)}px;text-align:center;white-space:nowrap`, hud); e.dataset.motion = 'skip';
      const spans = CH.map((c, i) => { const s = el('span', `position:relative;display:none;font:700 ${f1(size)}px/1.2 ${FONT.text};letter-spacing:.08em;color:transparent;background:url(${satinOf(C0.ink)}) 0 0/${f1(F.px(36))}px;-webkit-background-clip:text;background-clip:text;-webkit-text-stroke:${f1(F.px(1.1))}px ${C0.ink};filter:drop-shadow(${f1(F.px(1))}px ${f1(F.px(1.4))}px ${f1(F.px(1))}px rgba(52,36,20,.4))`, e); s.textContent = c.title; F.text(s, 'label', c.title, i ? c.start : 0, i === CH.length - 1 ? F.duration : CH[i + 1].start, { noFact: true, chrome: true, overlap: true }); return s; });
      F.add((t) => { let k = -1; CH.forEach((c, i) => { if (t >= c.start) k = i; }); if (k < 0) k = 0; spans.forEach((s, i) => set(s, { display: i === k ? '' : 'none' })); });
    });

    // ---------- checks ----------
    F.addLint(() => {
      prep();
      const out = [], add = (t, what, msg) => out.push({ level: 'warn', t: Math.round(t * 10) / 10, src: '', what, msg });
      if (raw.size > 2) add(0, M('颜色越界', 'off-palette colours'), M(`用了 ${raw.size} 个调色板以外的颜色（${[...raw].slice(0, 5).join(' ')}）：贝叶挂毯只有几种羊毛色，用色名 red / ochre / olive / sage / green / blue / navy / brown / salmon`, `${raw.size} colours outside the palette (${[...raw].slice(0, 5).join(' ')}): the tapestry has only a few wool colours; use the tone names red / ochre / olive / sage / green / blue / navy / brown / salmon`));
      if (FLAT) return out;
      // things switched on mid-film with no stitching
      const pops = roots.filter((n) => n.at > 0.3 && n.enter === 'none' && !n.p.lintOk);
      if (pops.length) add(pops[0].at, M('东西硬出现', 'switched on'), M(`${pops.length} 个东西在片中直接出现，没有绣上去（第一个在 ${pops[0].at.toFixed(1)} 秒）：给它 enter: 'stitch'（先勾边再铺线）/ 'lay'（先铺线）/ 'grow'（从根长出来）`, `${pops.length} things appear mid-film without being stitched (the first at ${pops[0].at.toFixed(1)} s): give them enter: 'stitch' (outline, then fill) / 'lay' (fill first) / 'grow' (from the base)`));
      // one way of stitching over and over
      const ent = roots.filter((n) => n.at > 0.3 && n.enter !== 'none' && !n.layer).sort((a, b) => a.at - b.at);
      for (let i = 0; i < ent.length;) { let j = i; while (j + 1 < ent.length && ent[j + 1].enter === ent[i].enter && ent[j + 1].kind === ent[i].kind && ent[j + 1].at - ent[j].at < 4) j++; if (j - i + 1 >= 7 && ent[j].at - ent[i].at > 3) add(ent[i].at, M('入场单一', 'same entrance'), M(`${ent[i].at.toFixed(1)}–${ent[j].at.toFixed(1)} 秒连续 ${j - i + 1} 个东西都用 '${ent[i].enter}' 绣上来：换着用先勾边（stitch）、先铺线（lay）、从根长（grow），或者让人物动起来（pose / go）`, `${ent[i].at.toFixed(1)}–${ent[j].at.toFixed(1)} s: ${j - i + 1} things in a row stitch on with '${ent[i].enter}': vary outline-first (stitch), fill-first (lay), from the base (grow), or let the figures act (pose / go)`)); i = j + 1; }
      // the cloth rushing past; pushed in too far
      let fast = null, peak = 0;
      for (let t = 0; t < F.duration; t += 1 / 10) { const a = camAt(t), b = camAt(t + 0.1); if (pushes.some((p) => t >= p.a - 0.05 && t <= p.d + 0.05)) { fast = null; continue; } const sp = ((Math.abs(b.x - a.x) * a.z * U) / Math.max(W, H)) * 10; if (sp > 0.42) { fast ??= t; peak = Math.max(peak, sp); } else if (fast != null) { add(fast, M('卷轴太快', 'cloth too fast'), M(`${fast.toFixed(1)}–${t.toFixed(1)} 秒布每秒移过约 ${peak.toFixed(2)} 个画面：挂毯是慢慢展开的，把场景排得近一点，或者给 B.scroll 更多时间`, `${fast.toFixed(1)}–${t.toFixed(1)} s the cloth moves about ${peak.toFixed(2)} frames a second: a tapestry unrolls slowly; set the scenes closer together or give B.scroll more time`)); fast = null; peak = 0; } }
      for (const p of pushes) { const v = pmemo.get(p) ?? resolve(p.view, p.b); if (v.z > 3.5) { add(p.b, M('推得太近', 'pushed in too far'), M(`${p.b.toFixed(1)} 秒镜头推到 ${v.z.toFixed(1)} 倍：线会变糊。把要看的东西绣大一点`, `At ${p.b.toFixed(1)} s the camera is at ${v.z.toFixed(1)}×: the threads blur. Stitch the subject bigger instead`)); break; } if (p.b - p.a < 0.6) add(p.a, M('推得太急', 'push too sudden'), M(`${p.a.toFixed(1)} 秒的推近只用了 ${(p.b - p.a).toFixed(1)} 秒：至少 0.8 秒`, `The push-in at ${p.a.toFixed(1)} s takes ${(p.b - p.a).toFixed(1)} s: give it at least 0.8 s`)); }
      // the cloth standing still (no scroll, no stitching, no figure acting)
      const evts = [...pushes.flatMap((p) => [p.a, p.b, p.c, p.d]), ...roots.flatMap((n) => [n.at, n.at + (n.inDur ?? 0), n.until, ...(n.changes || [])]), ...figs.flatMap((c) => c.events), ...texts.map((T) => T.at)].filter((x) => x > 0 && x < F.duration).sort((a, b) => a - b), vEnd = F.T && F.T.lines ? Math.max(...F.T.lines.map((l) => l.end || 0)) : F.duration;
      for (let i = 1; i < evts.length; i++) if (evts[i] - evts[i - 1] > 5 && evts[i - 1] < vEnd) { const mid = (evts[i] + evts[i - 1]) / 2, moving = Math.abs(scrollX(mid + 0.5) - scrollX(mid - 0.5)) > 20; if (!moving) { add(evts[i - 1], M('画面停太久', 'nothing happens'), M(`${evts[i - 1].toFixed(1)}–${evts[i].toFixed(1)} 秒布不动、也没有新东西绣上来：让下一件东西开始绣，让人物做动作，或者让布继续往前走`, `${evts[i - 1].toFixed(1)}–${evts[i].toFixed(1)} s the cloth stands still and nothing new is stitched: start the next thing, let a figure act, or keep the cloth moving`)); break; } }
      // a figure standing stiff in view
      for (const c of figs) {
        const ev = [c.at + (c.inDur ?? 0), ...c.events].filter((x) => x >= 0).sort((a, b) => a - b);
        for (let t = Math.max(0.5, c.at + (c.inDur ?? 0)); t < Math.min(c.until, vEnd); t += 0.5) { const v = camAt(t), b = wbox(c, t); if (!inView(v, b.x + b.w / 2, b.y + b.h / 2)) continue; const last = ev.filter((x) => x <= t).pop() ?? c.at; if (t - last > 9) { add(last, M('人物站桩', 'stiff figure'), M(`「${c.name}」在镜头里 ${last.toFixed(1)}–${t.toFixed(1)} 秒一动不动：挂毯人物靠大动作说话，让他指、举手、干活（c.pose）、点头（c.nod）或转身（c.turn）`, `"${c.name}" stands in view ${last.toFixed(1)}–${t.toFixed(1)} s doing nothing: tapestry figures speak with big gestures; let them point, raise a hand, work (c.pose), nod (c.nod) or turn (c.turn)`)); break; } }
      }
      // too much text; a caption that doesn't fit the portrait window or runs into the border
      let worst = null;
      for (let t = 0.25; t < F.duration; t += 0.5) { const v = camAt(t); if (v.z < bandZ * 0.8) continue; const n = texts.filter((T) => { if (t < T.at || t >= T.until || T.o.noFact) return false; const [x, y] = textPos(T, t); return inView(v, x, y); }).length; if (n > (opt.maxText ?? 6) && (!worst || n > worst.n)) worst = { t, n }; } // a wide pull-back shows the whole cloth: its captions are part of it
      if (worst) add(worst.t, M('字太多', 'too much text'), M(`${worst.t.toFixed(1)} 秒画面上同时有 ${worst.n} 段绣字：挂毯靠画面讲，一幕一条说明（主句 + 小字）就够`, `At ${worst.t.toFixed(1)} s there are ${worst.n} pieces of stitched text on screen: the tapestry tells with pictures; one caption (a line and a small line) per scene is enough`));
      const vw = W / (bandZ * U);
      for (const c of captions) { if (c.w > vw * 0.9) { add(c.at, M('说明太长', 'caption too long'), M(`${c.at.toFixed(1)} 秒的说明「${c.text}」约 ${Math.round(c.w)} 单位宽，${PT ? '竖屏' : '画面'}只看得到 ${Math.round(vw)}：缩短到 ${Math.max(4, Math.floor((vw * 0.85) / 54))} 个字以内，或者把字号调小`, `The caption "${c.text}" at ${c.at.toFixed(1)} s is about ${Math.round(c.w)} units wide; the ${PT ? 'portrait ' : ''}frame shows ${Math.round(vw)}: cut it to ${Math.max(4, Math.floor((vw * 0.85) / 30))} characters or make it smaller`)); break; } if (c.y < LAY.topIn + 30) add(c.at, M('说明压边', 'caption on the border'), M(`${c.at.toFixed(1)} 秒的说明太靠上，压到了上面的花边：y 不要小于 ${LAY.topIn + 40}`, `The caption at ${c.at.toFixed(1)} s sits on the upper border: keep y below ${LAY.topIn + 40}`)); }
      for (const c of captions) { const t = Math.min(F.duration - 0.05, c.at + 0.3), v = camAt(t), k = v.z * U, x0 = (c.x - (c.align === 'center' ? c.w / 2 : c.align === 'right' ? c.w : 0) - v.x) * k + W / 2, x1 = x0 + c.w * k; if (x0 < -W * 0.02 || x1 > W * 1.02) { add(c.at, M('说明出画', 'caption off frame'), M(`${c.at.toFixed(1)} 秒「${c.text}」绣的时候有一部分在画面外：把它放在镜头到达的地方（B.scroll 的位置附近），或者晚一点开始绣`, `At ${c.at.toFixed(1)} s "${c.text}" is stitched partly off frame: place it where the camera is then (near the B.scroll position) or start it later`)); break; } }
      return out;
    });

    B.roots = roots; B.figs = figs; B.texts = texts;
    B.text = (text, o = {}) => stitchText(text, { ...o, enter: o.enter });
    return P.infoKit ? P.infoKit(B, { caption: 'mark', act: 'mark', tally: 'chart', margin: 'mark', figure: 'figure', tree: 'illustration', gear: 'mechanism', boat: 'illustration', hall: 'illustration', book: 'illustration', roll: 'illustration', slab: 'illustration' }) : B;
  };
})();
