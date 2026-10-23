// shadow.js: shadow puppetry (皮影戏) style (one of bb-video's visual styles; style notes in styles/shadow/STYLE.md). Load after promo.js.
// One frame: a screen inside the stage's wooden frame, lit warm yellow by an oil lamp behind it; the puppets are carved translucent ox-hide — red, green, ochre, black — with openwork patterns letting the lamplight through;
// figures are in profile, with joints at neck, shoulder, elbow and hip, and control rods (sticks) reaching down. Good characters have an "open face" (only the outline carved), villains a "solid face" (all black).
//
//   const Y = PROMO.shadow(F, { lamp, screen, colors, font })   lamp = lamp brightness at the opening (default 1; 0.05 = lights up out of darkness); screen = 'white' (default, off-white screen) | 'oil' (warm oil-lamp yellow)
//   Y.stage(layer, { variant, glow, screen })     one scene's screen (warm lamplight, cloth texture, wooden frame); variant changes the light's position and colour; screen sets 'white' | 'oil' for this scene only (use warm oil-lamp yellow for flashbacks)
//   Y.puppet(parent, { kind, x, size, face, depth, colors, at, until, enter, name })  one figure → P
//     kind: emperor | lady (noblewoman) | official (civil official) | general (open face) | rebel (rebel general: solid face, fat) | soldier | elder (old man) | crone (old woman: white hair, stooped)
//     look: hat 'crown' | 'wusha' | 'bun' | 'helmet' | 'helmet2' | 'cap' | 'guan' (Qin–Han long cap / bamboo-skin cap) | 'hair' (just a topknot) | 'none' | a function (g, kit, colors) => {} (carve your own in head coordinates; hatTop gives the height of the crown of the head);
//       hairColor ('white' = white hair), beardColor, stoop (0–1 hunched back), faceColor, brow…
//     P.walk(at, x, dur) walk to x | P.talk(at, dur) talk (hand lifting again and again) | P.point(at, dur) point ahead | P.bow(at) bow with hands clasped | P.fight(at, dur) swing a weapon
//     P.fall(at, { stay }) fall down (stay: true stays on the ground, no fade-out) | P.lie(at, { back }) lie down (= fall + stay; back falls backwards) | P.rise(at, dur) get up off the ground
//     P.turn(at) turn round | P.exit(at, side, dur) walk off stage | P.ride(horse) mount the horse (moves with it) | P.sink(at, dur) sink slowly (out of the light) | P.dance(at, dur) sleeve dance
//     P.sway(at, dur, deg) sway drunkenly | P.weep(at, dur) weep behind a sleeve (sleeve raised to the face, sobbing) | P.walk(at, x, dur, { backward: true }) back away facing forward (no turn)
//     P.head: the svg group of the head (anything added inside turns with the head and flips / falls with the figure)
//   Y.prop(parent, { kind, x, y, size, at, until, text, depth, rot })  palace | gate (city gate) | mountain | tree | flag (text = its character) | fire (war fire) | moon | cloud (auspicious cloud) | horse
//     | jar (wine jar) | reeds (sway in the wind) | sword (rot = rotation angle: 90 = lying flat)
//   Y.snake(parent, { x, y, len, w, face, at, until, depth, amp, waves, speed, rear: [up, down], rearH, cut, sep, dead, crawl })  a snake with carved scales: always slithering; rear raises its head and flicks its tongue; cut = cut in two by a sword (twitches a few times, then still); dead = already cut, lying there
//   Y.leather(parent, { at, until, depth, z, draw(g, kit), frame(t, g, kit) })  carve your own piece of hide (something the runtime doesn't have): it handles the faint-to-solid entrance and the light showing through (multiply);
//     kit = { piece, CARVE, curve, blob, strip, poly, ring, arc, oval, rose, line, plain, sv, colors, INK, HIDE, mixHex, px } — the same carving tools as the runtime's figures and props
//     prop.move(at, x, dur) | prop.fall(at) (collapse) | prop.gallop(at, dur) (horse breaks into a gallop)
//   Y.map(parent, { at, until, cities: [{ name, x, y }], mountains, river, box })  a map drawn in shadow-puppet style (mountains, river, cities), city names on red paper slips → { at(name) → [x, y] }
//   Y.route(map, { via: [city names…], at, dur, color })  a marching route drawn on the map (with drums)
//   Y.placard(parent, { text, at, until, x, y, top, after, vertical, size, color, swing, align })  a red paper slip (title, name, year), hanging on a string, swings once and settles
//     y is the centre; top: true → y is the top edge; after: another slip's el → hang under it
//   Y.title(parent, { text, at, until, x, y, size, align })     large characters (ink brush writing, as if carved on the screen); given x, the line isn't centred: align 'center' (default, x is the centre) | 'left' | 'right'
//   Y.lamp(at, { to, dur, color })                lamplight: to brightness (1 normal, 0.25 very dark), color 'warm' | 'red' (war fire) | 'cold' (night, grief)
//   Y.change(at, dur, { to, color })              scene change: the lamp dims and comes back; returns the darkest moment (change scenes then); comes back to to (default 1), color (at night 'cold', 0.65)
//   Y.endcard(parent, { at, title, sub, seal })   end card: large characters (+ a vermilion seal carved with seal's characters, only when seal is given)
// Time: at = settled (readable); motion starts earlier; until = fully gone. A figure's x is the centre of its feet (frame px), standing just above the screen's bottom edge.
(function () {
  const P = window.PROMO;
  if (!P) throw new Error('shadow.js 要在 promo.js 之后加载');
  const { clamp, lerp } = window.EV;
  const { E, seg, set, el } = P;
  const f1 = (n) => Math.round(n * 10) / 10;
  const NS = 'http://www.w3.org/2000/svg';
  const sv = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const hash = (x, y = 0, s = 0) => { let n = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16; return (n >>> 0) / 4294967296; };

  // ---------- Shape-drawing helpers (units: figure height 600, origin at the centre of the feet, facing right) ----------
  const poly = (pts) => 'M' + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join(' L') + ' Z';
  const ell = (cx, cy, rx, ry) => `M${f1(cx - rx)} ${f1(cy)} a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0 a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0 Z`;
  // Smooth closed curve (Catmull-Rom → cubic Bézier)
  const blob = (pts, closed = true) => {
    const n = pts.length, P2 = (i) => pts[(i + n) % n];
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = closed ? P2(i - 1) : pts[Math.max(0, i - 1)], p1 = P2(i), p2 = P2(i + 1), p3 = closed ? P2(i + 2) : pts[Math.min(n - 1, i + 2)];
      d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d + (closed ? ' Z' : '');
  };
  // Openwork pattern: rows of small holes in an area (diamond, circle, plum blossom, cloud head), in the same path as the outline (evenodd = holes let light through)
  const diamond = (cx, cy, r) => poly([[cx, cy - r], [cx + r * 0.7, cy], [cx, cy + r], [cx - r * 0.7, cy]]);
  const flower = (cx, cy, r) => [0, 1, 2, 3].map((k) => ell(cx + Math.cos(k * Math.PI / 2) * r * 0.55, cy + Math.sin(k * Math.PI / 2) * r * 0.55, r * 0.38, r * 0.38)).join(' ');
  const holesIn = (inside, box, step, r, kind = 'diamond', seed = 1) => {
    let d = '';
    for (let y = box[1] + step / 2, row = 0; y < box[1] + box[3]; y += step * 0.86, row++) for (let x = box[0] + step / 2 + (row % 2) * step / 2; x < box[0] + box[2]; x += step) {
      if (!inside(x, y)) continue;
      const k = kind === 'mix' ? ['diamond', 'circle', 'flower'][Math.floor(hash(Math.round(x), Math.round(y), seed) * 3)] : kind;
      d += ' ' + (k === 'circle' ? ell(x, y, r * 0.55, r * 0.55) : k === 'flower' ? flower(x, y, r) : diamond(x, y, r));
    }
    return d;
  };
  // Simple "inside or not": a union of convex polygons / ellipses
  const inPoly = (pts) => (x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };


  // ---------- Carving (openwork): lay holes in a piece of hide; a hole is carved only if it lies entirely inside and at least m from the edge (a band of solid hide stays round the edge, like real puppets) ----------
  // Curve → dense polyline (the same Catmull-Rom curve as blob): used to test "inside or not" and measure distance from the edge
  const curve = (pts, closed = true, k = 6) => {
    const n = pts.length, P2 = (i) => pts[(i + n) % n], out = [];
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = closed ? P2(i - 1) : pts[Math.max(0, i - 1)], p1 = P2(i), p2 = P2(i + 1), p3 = closed ? P2(i + 2) : pts[Math.min(n - 1, i + 2)];
      for (let j = 0; j < k; j++) { const t = j / k, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3))); }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  };
  const segDist = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); };
  const edgeDist = (pts, x, y) => { let m = 1e9; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) m = Math.min(m, segDist(x, y, pts[j], pts[i])); return m; };
  const region = (pts, m = 0) => { const ins = inPoly(pts); return (x, y) => ins(x, y) && (m <= 0 || edgeDist(pts, x, y) >= m); };
  const near = (pts, m = 0) => { const ins = inPoly(pts); return (x, y) => ins(x, y) || edgeDist(pts, x, y) < m; };
  const bbox = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x = Math.min(...xs), y = Math.min(...ys); return [x, y, Math.max(...xs) - x, Math.max(...ys) - y]; };
  const fits = (R, pts) => pts.every(([x, y]) => R(x, y));
  const ring = (cx, cy, r, n = 6, rot = 0, ry = r) => Array.from({ length: n }, (_, i) => [cx + Math.cos(rot + (i / n) * Math.PI * 2) * r, cy + Math.sin(rot + (i / n) * Math.PI * 2) * ry]);
  const rose = (cx, cy, r, lobes = 4) => Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * Math.PI * 2, rr = r * (0.42 + 0.58 * Math.abs(Math.cos((lobes / 2) * a))); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
  // A polyline → a thin slit of width w (closed polygon)
  const strip = (pts, w) => {
    const L = [], Rr = [];
    pts.forEach((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * w / 2, ny = (dx / l) * w / 2; L.push([p[0] + nx, p[1] + ny]); Rr.push([p[0] - nx, p[1] - ny]); });
    return L.concat(Rr.reverse());
  };
  const oval = (cx, cy, rx, ry, ang = 0, n = 12) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * Math.cos(ang) - y * Math.sin(ang), cy + x * Math.sin(ang) + y * Math.cos(ang)]; });
  const arc = (cx, cy, r, a0, a1, n = 12) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  // Carving patterns (R = carvable area, B = bounding box [x, y, w, h]): all return sub-paths of the path (evenodd: drawing a ring inside a hole = putting back a piece of hide, like a flower's heart)
  const CARVE = {
    // Tortoise-shell pattern: a hexagonal grid with a four-petal flower in each cell (the flower is hide), its heart another small hole
    hex: (R, B, o = {}) => {
      const s = o.s ?? 16, rc = s / Math.sqrt(3), rh = rc - (o.band ?? s * 0.1); let d = '';
      for (let row = 0, y = B[1]; y <= B[1] + B[3] + s; y += rc * 1.5, row++) for (let x = B[0] + (row % 2) * s / 2; x <= B[0] + B[2] + s; x += s) {
        const hx = ring(x, y, rh, 6, -Math.PI / 2); if (!fits(R, hx)) continue;
        d += ' ' + poly(hx);
        if (o.flower !== false) { d += ' ' + poly(rose(x, y, rh * 0.62)); d += ' ' + poly(ring(x, y, rh * 0.14, 8)); }
      }
      return d;
    },
    // Rows of thin slits (sleeves, trouser legs, hair, hats): angle = degrees off vertical
    slits: (R, B, o = {}) => {
      const a = ((o.angle ?? 0) * Math.PI) / 180, u = [Math.sin(a), Math.cos(a)], n = [Math.cos(a), -Math.sin(a)], gap = o.gap ?? 9, w = o.w ?? 2.2, seg = o.seg ?? 1e9;
      const cs = [[B[0], B[1]], [B[0] + B[2], B[1]], [B[0], B[1] + B[3]], [B[0] + B[2], B[1] + B[3]]], pn = cs.map((c) => c[0] * n[0] + c[1] * n[1]), pu = cs.map((c) => c[0] * u[0] + c[1] * u[1]);
      let d = '';
      for (let c = Math.min(...pn) + gap / 2; c < Math.max(...pn); c += gap) {
        const at = (t) => [c * n[0] + t * u[0], c * n[1] + t * u[1]], runs = []; let t0 = null;
        for (let t = Math.min(...pu); t <= Math.max(...pu) + 2; t += 2) { const p = at(t), inn = R(p[0] + n[0] * w / 2, p[1] + n[1] * w / 2) && R(p[0] - n[0] * w / 2, p[1] - n[1] * w / 2); if (inn && t0 === null) t0 = t; if (!inn && t0 !== null) { runs.push([t0 + 1.5, t - 3.5]); t0 = null; } }
        for (const [r0, r1] of runs) for (let s0 = r0; s0 < r1 - 5; s0 += seg + 4) { const s1 = Math.min(r1, s0 + seg); if (s1 - s0 < 5) continue; d += ' ' + poly(strip([at(s0), at(s1)], w)); }
      }
      return d;
    },
    // A string of small holes along a line (lace at collar, cuffs, hem): kind 'dot' | 'rice' (rice grain)
    dots: (R, line, o = {}) => {
      const step = o.step ?? 9, r = o.r ?? 2.4, pts = curve(line, false, 8); let d = '', acc = step / 2;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        while (acc <= l) { const q = acc / l, x = a[0] + (b[0] - a[0]) * q, y = a[1] + (b[1] - a[1]) * q, ang = Math.atan2(b[1] - a[1], b[0] - a[0]); const h = o.kind === 'rice' ? ring(x, y, r * 1.7, 10, ang, r * 0.8) : ring(x, y, r, 8); if (fits(R, h)) d += ' ' + poly(h); acc += step; }
        acc -= l;
      }
      return d;
    },
    // Fish scales (armour): rows of half-circle holes
    scales: (R, B, o = {}) => {
      const s = o.s ?? 16, r = s * 0.4; let d = '';
      for (let row = 0, y = B[1]; y <= B[1] + B[3]; y += s * 0.56, row++) for (let x = B[0] + (row % 2) * s / 2; x <= B[0] + B[2] + s; x += s) { const h = arc(x, y, r, 0, Math.PI, 10); if (fits(R, h)) d += ' ' + poly(h); }
      return d;
    },
    // Sea-wave pattern (robe hem): rows of concentric half-circle slits
    waves: (R, B, o = {}) => {
      const s = o.s ?? 26, w = o.w ?? 2; let d = '';
      for (let row = 0, y = B[1] + s * 0.5; y <= B[1] + B[3] + s; y += s * 0.56, row++) for (let x = B[0] + (row % 2) * s / 2; x <= B[0] + B[2] + s; x += s) for (const k of [0.46, 0.3, 0.14]) { const h = strip(arc(x, y, s * k, Math.PI, Math.PI * 2, 12), w); if (fits(R, h)) d += ' ' + poly(h); }
      return d;
    },
  };

  // ---------- Colours (translucent ox-hide: lamplight shines through) ----------
  const LEATHER = { red: '#C0381F', deep: '#7A1E14', green: '#2E7A44', blue: '#2C5E98', ochre: '#C99434', yellow: '#E2AE36', black: '#1C130C', skin: '#E9C79A', white: '#EFE2C4', purple: '#5C3566' };
  const INK = '#1C130C';
  const mixHex = (a, b, t) => { const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a; const x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };   // a moves towards b by t

  P.shadow = function (F, opt = {}) {
    const Y = { F }, PT = F.portrait, W = F.W, H = F.H;
    Y.colors = { ...LEATHER, ...(opt.colors || {}) };
    Y.floor = H * (PT ? 0.78 : 0.86);   // height where figures' feet stand (a little above the screen's bottom edge)
    Y.font = opt.font ?? F.theme.fonts.display ?? '"LXGW WenKai", serif';
    Y.lamps = [];   // lamp keyframes [{ at, to, dur, color }]
    // Lamp brightness v at time t and weights mix of the three colours (colour, like brightness, changes gradually over dur, not all at once); opt.lamp = opening brightness (0.05 = lights up out of darkness)
    const lampAt = (t) => {
      let v = opt.lamp ?? 1, col = 'warm', mix = { warm: 1, red: 0, cold: 0 };
      for (const L of Y.lamps) {
        if (t < L.at - L.dur) break;
        const q = seg(t, L.at - L.dur, L.at, E.cubicInOut); v = lerp(v, L.to, q);
        if (L.color) { for (const k in mix) mix[k] = lerp(mix[k], k === L.color ? 1 : 0, q); if (q > 0.5) col = L.color; }
      }
      return { v, col, mix };
    };
    Y.lampAt = lampAt;

    // ---------- Screen ----------
    // Base of the screen: off-white by default (lamplight through white cloth makes the hide colours brightest); screen: 'oil' = warm oil-lamp yellow (nostalgic, night scenes). Red (war fire) and cold (night, grief) layer on top
    const BASE = { white: ['#FCF9F1', '#ECE2CE', '#8F7D64'], oil: ['#FFF0CF', '#EFC583', '#9E5E28'] };
    const GLOW = { warm: BASE[opt.screen ?? 'white'] ?? BASE.white, red: ['#F9C8AE', '#D0634A', '#5E1E14'], cold: ['#E6E4DC', '#AEB0AA', '#4A4C4A'] };
    Y.stage = (layer, o = {}) => {
      const v = o.variant ?? 0, cx = [50, 42, 58, 50][v % 4], cy = [44, 40, 46, 38][v % 4];
      const wrap = el('div', 'inset:0;overflow:hidden;background:#140C07', layer);
      // The screen base can be chosen per scene (warm oil-lamp yellow for flashbacks, off-white for the present)
      const G = { ...GLOW, warm: BASE[o.screen ?? opt.screen ?? 'white'] ?? BASE.white };
      const glows = Object.fromEntries(Object.entries(G).map(([k, [a, b, c]]) => [k, el('div', `inset:0;background:radial-gradient(ellipse 72% 78% at ${cx}% ${cy}%, ${a} 0%, ${b} 52%, ${c} 100%);opacity:${k === 'warm' ? 1 : 0}`, wrap)]));
      // Cloth texture: very faint fibre noise
      const tex = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='.9 .05' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 .35  0 0 0 0 .22  0 0 0 0 .1  0 0 0 .5 0'/></filter><rect width='300' height='300' filter='url(%23f)'/></svg>`;
      el('div', `inset:0;opacity:.35;mix-blend-mode:multiply;background-image:url("data:image/svg+xml,${encodeURIComponent(tex).replace(/%2523/g, '%23')}")`, wrap);
      // Lamplight (oil lamp: very slow, very slight flicker; overall brightness follows Y.lamp)
      const dark = el('div', 'inset:0;background:#0E0805;opacity:0;pointer-events:none;z-index:40', wrap);
      F.add((t) => {
        const L = lampAt(t), flick = 0.025 * Math.sin(t * 2.1) + 0.015 * Math.sin(t * 5.3 + 1.7);
        for (const k in glows) set(glows[k], { opacity: k === 'warm' ? '1' : L.mix[k].toFixed(3) });   // warm light underneath; red / cold layered on top, shown by weight
        set(dark, { opacity: String(clamp(1 - L.v + flick, 0, 0.92).toFixed(3)) });
      });
      // The stage's wooden frame
      const fw = F.px(PT ? 26 : 30);
      el('div', `inset:0;pointer-events:none;z-index:45;box-shadow:inset 0 0 0 ${f1(fw)}px #2A170C, inset 0 0 0 ${f1(fw + F.px(4))}px #6B3B1A, inset 0 0 ${f1(F.px(120))}px ${f1(F.px(40))}px rgba(20,8,2,.55)`, wrap);
      // The screen itself (figures and props all go into screen; the darkening layer is on top)
      // No z-index: the screen must not form its own layer, so the figures' multiply (light through hide) can blend with the light behind
      const screen = el('div', 'inset:0', wrap);
      // Text (paper slips, large characters) sits above the darkening layer: still readable when the lamp dims
      screen._top = el('div', 'inset:0;z-index:50;pointer-events:none', wrap);
      wrap._dark = dark;
      return { el: wrap, screen };
    };
    Y.lamp = (at, o = {}) => { Y.lamps.push({ at, to: o.to ?? 1, dur: o.dur ?? 0.8, color: o.color }); Y.lamps.sort((a, b) => a.at - b.at); };
    Y.change = (at, dur = 0.9, o = {}) => { Y.lamp(at, { to: 0.08, dur: dur / 2 }); Y.lamp(at + dur / 2, { to: o.to ?? 1, dur: dur / 2, color: o.color }); F.sfx(at - dur / 2, 'whoosh', 0.35, { dur }); return at; };   // coming back it stops at this scene's brightness and colour (doesn't go to 1 first and then dim)

    // ---------- Figures ----------
    // Modelled on traditional shadow puppets: in profile, small head, long body; an open face keeps only a ring of knife line (the face is carved out), long narrow eyes, forehead running straight into the nose;
    // each piece of hide keeps a band of solid hide round the edge with carving inside: tortoise-shell + flowers on the upper body, rows of slits on sleeves and trouser legs, sea waves + a string of holes on the hem, fish scales on armour
    const KINDS = {
      emperor: { robe: 'yellow', trim: 'red', hat: 'crown', face: 'hollow', beard: 'long', sleeve: 'wide', belly: 0.1 },
      official: { robe: 'green', trim: 'black', hat: 'wusha', face: 'hollow', beard: 'short', sleeve: 'wide', belly: 0.15 },
      lady: { robe: 'red', trim: 'green', hat: 'bun', face: 'hollow', beard: null, sleeve: 'water', belly: 0, dress: true },
      general: { robe: 'red', trim: 'green', hat: 'helmet', face: 'hollow', beard: 'full', sleeve: 'armor', belly: 0, armor: true, weapon: 'sword', flags: true, brow: 'up' },
      rebel: { robe: 'black', trim: 'green', hat: 'helmet2', face: 'solid', beard: 'full', sleeve: 'armor', belly: 0.6, armor: true, weapon: 'sword' },
      soldier: { robe: 'blue', trim: 'black', hat: 'cap', face: 'hollow', beard: null, sleeve: 'armor', belly: 0, armor: true, weapon: 'spear', small: 0.86 },
      elder: { robe: 'ochre', trim: 'black', hat: 'wusha', face: 'hollow', beard: 'long', sleeve: 'wide', belly: 0.1 },
      crone: { robe: 'deep', trim: 'black', hat: 'bun', hairColor: 'white', ornate: false, face: 'hollow', beard: null, sleeve: 'wide', belly: 0.05, dress: true, stoop: 1, small: 0.92 },   // old woman: white hair in a plain bun (no flowers), dark robe, stooped
    };
    const C = (name, kd, o) => { const v = (o.colors && o.colors[name]) || kd; return Y.colors[v] ?? v; };   // colours can be ox-hide dye names (red / green / deep…) or #hex
    const HIDE = '#E2BF86';   // undyed ox-hide (neck, hands)
    // A piece of hide: outline pts (point list), dyed fill; carve(R, B) carves holes (R = the area more than m from the edge); cut = where another piece of hide covers it (cut away here so that piece's holes don't show the colour beneath)
    const piece = (g, pts, fill, carve, o = {}) => {
      const cuts = o.cut || [], R0 = region(pts, o.m ?? 5), nears = cuts.map((c) => near(c, 4)), R = (x, y) => R0(x, y) && !nears.some((f) => f(x, y)) && !(o.excl && o.excl(x, y));
      const holes = carve ? carve(R, bbox(pts)) : '';
      sv('path', { d: poly(pts) + cuts.map((c) => ' ' + poly(c)).join('') + holes, fill, 'fill-opacity': o.alpha ?? 0.95, 'fill-rule': 'evenodd' }, g);
      sv('path', { d: poly(pts), fill: 'none', stroke: o.edge ?? INK, 'stroke-width': o.sw ?? 2.4, 'stroke-linejoin': 'round' }, g);
    };
    const line = (g, d, w = 2.4, col = INK) => sv('path', { d, fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    const plain = (g, d, fill) => sv('path', { d, fill, 'fill-rule': 'evenodd' }, g);
    // Hide-carving toolbox: used for carving your own headwear (look.hat is a function) and props with Y.leather — the same carving tools as the runtime
    const KIT = { piece, CARVE, curve, blob, strip, poly, ring, arc, oval, rose, ell, line, plain, sv, colors: Y.colors, INK, HIDE, mixHex, px: F.px };
    Y.kit = KIT;

    // Head (facing right): the neck joint is at (6, -472); the face runs from the hat brim -546 to the chin -474
    const headParts = (g0, k, col, trim) => {
      const solid = k.face === 'solid', red = Y.colors.red, green = Y.colors.green;
      // Telling who's who: face colour (a solid face can be black / red / white / blue), beard colour (white for the old), helmet colour, pheasant plumes or not
      const CC = (v, d) => (v ? Y.colors[v] ?? v : d), faceCol = CC(k.faceColor, INK), hairCol = CC(k.hairColor, INK);   // hairColor: 'white' = white hair (the old)
      const g = sv('g', { transform: 'translate(6 -472) scale(1.22) translate(-6 472)' }, g0);   // the head is drawn on a 1.0 ruler, then scaled up a little overall (too small a head looks like a stick figure)
      // Neck: a small piece of natural ox-hide
      piece(g, [[0, -482], [16, -478], [15, -464], [1, -464]], HIDE, null, { sw: 1.8 });
      // Hair: a piece of black hide under the hat, behind the face, carved into strands
      piece(g, curve([[-4, -546], [-20, -546], [-24, -528], [-18, -508], [-8, -512]]), hairCol, (R, B) => CARVE.slits(R, B, { angle: 24, gap: 4.5, w: 1.3, seg: 14 }), { m: 2 });   // sideburn
      // Face in profile: forehead straight into the nose bridge, pointed nose, small mouth, small chin, jawline tucked back under the ear
      const prof = [[20, -548], [25, -537], [43, -506], [41, -502], [35, -501], [37, -497], [35, -494], [37, -491], [34, -488], [32, -481], [24, -475], [10, -475], [-2, -483], [-8, -500], [-8, -530], [-4, -548]];
      if (solid && faceCol !== INK) {
        // Red / white / blue face: a whole dyed piece of hide, eyes and brows drawn on in ink lines
        plain(g, poly(prof), faceCol);
        line(g, 'M' + prof.slice(0, 13).map((p) => p.join(' ')).join(' L'), 2.4);
        line(g, 'M8 -524 Q21 -533 34 -522 Q21 -517 8 -524 M8 -524 L0 -527', 2.2); plain(g, poly(ring(27, -524, 2.6, 8)), INK);
        line(g, k.brow === 'up' ? 'M0 -530 Q16 -543 37 -536' : 'M2 -533 Q18 -541 35 -533', 3.4);
      } else if (solid) {
        // Solid face (villain): a whole black piece of hide, eyes and brows carved out
        plain(g, poly(prof) + ' M8 -524 Q21 -533 34 -522 Q21 -517 8 -524 Z' + ' ' + poly(ring(26, -523.5, 2.6, 8)) + ' ' + poly(strip([[2, -531], [16, -541], [36, -534]], 2.6)) + ' ' + poly(strip([[8, -510], [20, -506], [30, -508]], 1.6)), INK);
      } else {
        line(g, 'M' + prof.slice(0, 13).map((p) => p.join(' ')).join(' L'), 2.8);
        line(g, 'M8 -524 Q21 -533 34 -522 Q21 -517 8 -524 M8 -524 L0 -527', 1.8);   // long narrow eye, its tail drawn out
        plain(g, poly(ring(27, -524, 2.4, 8)), INK);
        line(g, k.brow === 'up' ? 'M0 -530 Q16 -543 37 -536' : 'M2 -533 Q18 -541 35 -533', 2.6);   // brow (generals have sword brows, tails turned up)
        plain(g, poly(ring(36.5, -491, 2.8, 8, 0, 1.8)), red);   // small red lips
        line(g, 'M-4 -516 Q-11 -511 -4 -504', 1.8);   // ear
      }
      // Beard: a bunch of black hide carved into individual strands
      const beard = k.beard === 'long' ? [[34, -494], [42, -480], [44, -430], [36, -392], [28, -430], [26, -480]] : k.beard === 'short' ? [[34, -494], [40, -478], [34, -456], [24, -456], [26, -480]] : k.beard === 'full' ? [[38, -494], [46, -470], [40, -430], [16, -410], [-10, -440], [-6, -476], [16, -482]] : null;
      if (beard) piece(g, curve(beard), CC(k.beardColor, INK), (R, B) => CARVE.slits(R, B, { angle: 4, gap: 5, w: 1.5 }), { m: 2.5 });
      // Hats / headwear
      if (k.hat === 'wusha') {
        // Wusha cap: cap body + a raised crown at the back + wings reaching back (carved)
        piece(g, curve([[-40, -574], [-84, -580], [-124, -592], [-146, -580], [-140, -560], [-118, -556], [-84, -562], [-40, -558]]), INK, (R, B) => CARVE.slits(R, B, { angle: 90, gap: 6, w: 1.6, seg: 16 }), { m: 3.5 });   // cap wing: a flat wing reaching back
        piece(g, curve([[-40, -560], [-42, -604], [-16, -612], [-8, -580]]), INK, (R, B) => CARVE.dots(R, [[-34, -576], [-32, -596], [-18, -602]], { step: 7, r: 2 }), { m: 3 });
        piece(g, curve([[-40, -544], [-36, -572], [-12, -584], [14, -580], [28, -564], [30, -546]]), INK, (R) => CARVE.dots(R, [[-34, -556], [0, -562], [26, -556]], { step: 8, r: 2.2, kind: 'rice' }), { m: 3 });
      } else if (k.hat === 'crown') {
        // Royal crown: yellow hide body carved with tortoise-shell, wings curled up at the back, a ring of red and green pompoms on top, a string of beads hanging down
        piece(g, curve([[-32, -560], [-50, -566], [-60, -552], [-56, -536], [-46, -534], [-48, -546], [-38, -548]]), col, null, { m: 3 });   // wing curled up at the back of the crown
        piece(g, curve([[-36, -552], [-32, -594], [-6, -612], [18, -604], [30, -584], [30, -554]]), col, (R, B) => CARVE.hex(R, B, { s: 11 }), { m: 4 });
        piece(g, [[-38, -536], [32, -540], [32, -554], [-38, -552]], red, (R) => CARVE.dots(R, [[-34, -545], [30, -548]], { step: 7, r: 1.8 }), { m: 2 });
        [[-32, -598, red], [-16, -614, green], [4, -616, red], [22, -604, green], [33, -584, red]].forEach(([x, y, c]) => plain(g, poly(ring(x, y, 8, 14)) + ' ' + poly(ring(x, y, 2.6, 8)), c));
        for (let i = 0; i < 6; i++) plain(g, poly(ring(36 + i * 1.2, -546 + i * 8, 2.6, 8)), i % 2 ? green : red);
      } else if (k.hat === 'bun') {
        // Noblewoman: a big bun (strands), a small knot on top, red and green flowers, a fan-shaped hairpin ornament, a string of beads hanging to the ear
        piece(g, curve([[-4, -546], [-32, -556], [-56, -542], [-62, -512], [-46, -492], [-24, -498], [-10, -520]]), hairCol, (R, B) => CARVE.slits(R, B, { angle: 40, gap: 5.5, w: 1.6, seg: 18 }), { m: 3 });
        piece(g, curve([[-30, -554], [-36, -590], [-14, -608], [8, -598], [12, -570], [-4, -552]]), hairCol, (R, B) => CARVE.slits(R, B, { angle: -30, gap: 5.5, w: 1.6, seg: 16 }), { m: 3 });
        if (k.ornate === false) { line(g, 'M-30 -584 L10 -592', 2.6); return g; }   // plain bun (old woman): just one wooden hairpin
        line(g, 'M-24 -588 L22 -620', 2.2);   // hairpin, a small flower at its head
        plain(g, poly(rose(24, -622, 7)) + ' ' + poly(ring(24, -622, 1.8, 8)), Y.colors.yellow);
        [[-4, -598, 13, col], [-30, -590, 10, trim], [14, -572, 9, col], [-50, -540, 9, trim]].forEach(([x, y, r, c]) => plain(g, poly(rose(x, y, r)) + ' ' + poly(ring(x, y, r * 0.22, 8)), c));
        for (let i = 0; i < 6; i++) plain(g, poly(ring(18 + i * 1.5, -562 + i * 8, 2.6, 8)), i % 2 ? green : red);
      } else if (k.hat === 'helmet' || k.hat === 'helmet2') {
        const rebel = k.hat === 'helmet2', feathers = k.feathers ?? rebel;
        // Helmet: fish scales on the top, a string of holes on the brim, ear flaps hanging down; generals wear a red tassel, foreign generals (villains) two long pheasant plumes
        if (feathers) [[0, 0], [16, 10]].forEach(([dx, dy]) => { const f = curve([[-4 + dx, -590], [-22 + dx, -652 + dy], [-76 + dx, -690 + dy], [-136 + dx, -678 + dy], [-166 + dx, -646 + dy]], false, 10); plain(g, poly(strip(f, 9)) + f.filter((_, i) => i % 3 === 1 && i > 2).map((p) => ' ' + poly(ring(p[0], p[1], 2.4, 6))).join(''), INK); });
        else piece(g, curve([[-4, -594], [-18, -628], [-10, -656], [8, -664], [14, -640], [6, -596]]), CC(k.tassel, Y.colors.red), (R, B) => CARVE.slits(R, B, { angle: -10, gap: 5, w: 1.6 }), { m: 2.5 });
        piece(g, curve([[-36, -540], [-56, -500], [-44, -476], [-28, -506]]), INK, (R) => CARVE.dots(R, [[-40, -528], [-46, -500]], { step: 7, r: 2 }), { m: 3 });
        piece(g, curve([[-38, -540], [-34, -578], [-8, -598], [18, -592], [32, -570], [32, -548]]), CC(k.helmetColor, rebel ? INK : Y.colors.yellow), (R, B) => CARVE.scales(R, B, { s: 12 }), { m: 4 });
        piece(g, [[-40, -536], [34, -542], [34, -554], [-40, -550]], rebel ? trim : Y.colors.red, (R) => CARVE.dots(R, [[-36, -544], [32, -548]], { step: 7, r: 1.8 }), { m: 2 });
      } else if (k.hat === 'cap') {
        // Soft cap: a soft hat with a red pompom
        piece(g, curve([[-36, -540], [-34, -572], [-8, -586], [18, -580], [30, -562], [30, -544]]), col, (R) => CARVE.dots(R, [[-32, -552], [0, -560], [28, -554]], { step: 8, r: 2.2, kind: 'rice' }), { m: 3 });
        plain(g, poly(ring(-4, -590, 9, 14)) + ' ' + poly(ring(-4, -590, 3, 8)), Y.colors.red);
      } else if (k.hat === 'hair' || k.hat === 'guan') {
        // Just a topknot: a patch of hair on top (carved strands), a small knot
        piece(g, curve([[-6, -546], [-30, -550], [-34, -570], [-16, -584], [8, -580], [24, -562], [22, -548]]), hairCol, (R, B) => CARVE.slits(R, B, { angle: 30, gap: 5, w: 1.4, seg: 14 }), { m: 2.5 });
        if (k.hat === 'guan') {
          // Qin–Han long cap (bamboo-skin cap, Liu clan cap): a long narrow bamboo-skin board slanting back and up from the topknot (low front, high back, "shaped like a board"), carved with bamboo fibres; a cap ring + a strap to the chin
          line(g, 'M-4 -548 Q-2 -516 10 -478', 2);
          const ca = Math.atan2(-80, -94); let fib = '';
          for (let i = 1; i < 9; i++) { const q = i / 9; for (const o2 of [-7, 7]) fib += ' ' + poly(oval(12 - 94 * q + Math.sin(ca) * o2, -552 - 80 * q - Math.cos(ca) * o2, 7, 2, ca, 8)); }
          sv('path', { d: poly([[28, -556], [-70, -644], [-96, -620], [-4, -544]]) + fib, fill: CC(k.hatColor, Y.colors.ochre), 'fill-rule': 'evenodd', 'fill-opacity': 0.95, stroke: INK, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, g);
          piece(g, [[24, -548], [-8, -546], [-6, -560], [20, -562]], CC(k.hatColor, Y.colors.ochre), null, { sw: 2.2 });
        }
      } else if (typeof k.hat === 'function') k.hat(g, KIT, Y.colors);   // carved headwear of your own: drawn in head coordinates (face from -546 to -474, facing right)
      return g;
    };

    // Body: robe (civil) / armour (military); returns the hip height
    const bodyParts = (g, k, col, trim, seed) => {
      const b = k.belly ?? 0, dress = k.dress, armor = k.armor, fx = 52 + b * 40;
      const torso = curve([[-12, -472], [18, -472], [40, -458], [50, -428], [fx, -372], [fx - 2, -326], [-48, -326], [-48, -380], [-44, -432], [-32, -460]]);
      const collar = [[-12, -472], [20, -472], [34, -450], [26, -404], [14, -404], [20, -448], [-4, -462]];
      if (armor) {
        // Armour skirt (two flaps, fish scales), fish-scale armour on the upper body + chest mirror, belt
        const skB = [[-48, -322], [4, -322], [8, -150], [-72, -150], [-58, -236]], skF = [[4, -322], [fx, -322], [72, -236], [86, -150], [10, -150]];
        for (const sk of [skB, skF]) piece(g, sk, col, (R, B) => CARVE.scales(R, B, { s: 15 }) + CARVE.dots(R, [[sk[3][0] + 6, -160], [sk[2][0] - 6, -160]], { step: 8, r: 2 }), { m: 5 });
        const mirror = ring(30, -398, 22, 28);
        piece(g, torso, col, (R, B) => CARVE.scales(R, B, { s: 14 }), { cut: [collar, mirror], m: 5 });
        piece(g, mirror, Y.colors.yellow, (R) => CARVE.dots(R, curve(ring(30, -398, 14, 8)).concat([[44, -398]]), { step: 6.5, r: 1.8 }) + ' ' + poly(ring(30, -398, 5, 12)), { m: 2 });
        piece(g, collar, trim, (R) => CARVE.dots(R, [[-4, -466], [22, -464], [24, -420]], { step: 7, r: 1.8 }), { m: 2 });
        piece(g, [[-54, -336], [fx + 6, -336], [fx + 8, -312], [-56, -312]], Y.colors.yellow, (R) => CARVE.dots(R, [[-60, -324], [fx + 2, -324]], { step: 9, r: 2.4, kind: 'rice' }), { m: 2 });
        return -150;
      }
      // Robe: front and back panels on the lower body (slits above, sea waves below), a lace band on the hem; tortoise-shell on the upper body, collar, jade belt
      const hw = dress ? 120 : 100, lb = [[-48, -322], [4, -322], [0, -160], [-6, -44], [-hw, -44], [-76, -160], [-54, -240]], lf = [[4, -322], [fx, -322], [70, -240], [86, -160], [hw + 4, -44], [10, -44], [6, -160]];
      for (const L of [lb, lf]) piece(g, L, col, (R, B) => CARVE.slits((x, y) => R(x, y) && y < -156, B, { angle: 0, gap: 11, w: 2.2, seg: 70 }) + CARVE.waves((x, y) => R(x, y) && y > -146 && y < -52, B, { s: 26 }), { m: 6 });
      piece(g, [[-hw, -44], [-6, -44], [-6, -26], [-hw - 4, -26]], trim, (R) => CARVE.dots(R, [[-hw + 4, -35], [-10, -35]], { step: 8, r: 2.2 }), { m: 2 });
      piece(g, [[10, -44], [hw + 4, -44], [hw + 8, -26], [10, -26]], trim, (R) => CARVE.dots(R, [[14, -35], [hw + 2, -35]], { step: 8, r: 2.2 }), { m: 2 });
      piece(g, torso, col, (R, B) => CARVE.hex(R, B, { s: dress ? 14 : 16 }), { cut: [collar], m: 6 });
      piece(g, collar, trim, (R) => CARVE.dots(R, [[-4, -466], [22, -464], [24, -420]], { step: 7, r: 1.8 }), { m: 2 });
      // Jade belt: a ring of belt, sticking out of the robe front and back
      piece(g, [[-60, -340], [fx + 16, -342], [fx + 18, -320], [-62, -318]], trim === INK ? Y.colors.red : trim, (R) => CARVE.dots(R, [[-70, -329], [fx + 24, -330]], { step: 9, r: 2.4, kind: 'rice' }), { m: 2 });
      return -26;
    };
    // Four back flags (generals)
    const flagParts = (g, col, trim) => {
      [-14, -30, -46, -62].forEach((deg, i) => {
        const a = (deg * Math.PI) / 180, bx = -26 - i * 3, by = -452, L = 210 - i * 6, tx = bx + Math.sin(a) * L, ty = by - Math.cos(a) * L, nx = Math.cos(a), ny = Math.sin(a);
        line(g, `M${f1(bx)} ${f1(by)} L${f1(tx)} ${f1(ty)}`, 4);
        const tri = [[bx + Math.sin(a) * 40 + nx * 2, by - Math.cos(a) * 40 + ny * 2], [tx + nx * 2, ty + ny * 2], [bx + Math.sin(a) * 60 - nx * 48, by - Math.cos(a) * 60 - ny * 48]];
        piece(g, tri, i % 2 ? trim : col, (R, B) => CARVE.hex(R, B, { s: 13, flower: false }), { m: 5 });
      });
    };
    // Arm: upper arm + forearm (wide sleeve / water sleeve / armour) + hand; shoulder at the origin, arm pointing down (+y), upper arm 104, forearm 96
    const armParts = (g, k, col, trim, back) => {
      const sh = sv('g', {}, g), up = sv('g', {}, sh), fo = sv('g', { transform: 'translate(0 104)' }, up), hand = sv('g', { transform: 'translate(0 96)' }, fo);
      const dye = back ? mixHex(col, INK, 0.25) : col;
      if (k.sleeve === 'wide' || k.sleeve === 'water') {
        piece(up, [[-18, -8], [20, -10], [26, 40], [24, 106], [-20, 106], [-24, 40]], dye, (R, B) => CARVE.hex(R, B, { s: 13 }), { m: 5 });
        // Wide sleeve: a big piece flaring out below the elbow, carved with rows of slits; a lace band at the cuff; a water sleeve adds an extra white length
        piece(fo, curve([[-20, -4], [20, -4], [34, 30], [44, 66], [40, 88], [-26, 92], [-34, 58], [-30, 20]]), dye, (R, B) => CARVE.slits(R, B, { angle: -8, gap: 9, w: 2 }), { m: 5 });
        piece(fo, [[-28, 86], [41, 82], [42, 98], [-28, 104]], trim === INK ? Y.colors.red : trim, (R) => CARVE.dots(R, [[-26, 92], [38, 89]], { step: 7, r: 2 }), { m: 2 });
        if (k.sleeve === 'water') piece(fo, curve([[-26, 104], [40, 100], [48, 150], [36, 204], [12, 232], [-8, 214], [-18, 160]]), Y.colors.white, (R, B) => CARVE.slits(R, B, { angle: -6, gap: 10, w: 1.8 }), { m: 5, alpha: 0.7 });
      } else {
        // Armoured sleeve: shoulder guard (a big piece, fish scales), upper arm, wrist guard
        piece(up, [[-16, -6], [18, -8], [20, 60], [14, 106], [-14, 106], [-20, 50]], dye, (R, B) => CARVE.scales(R, B, { s: 12 }), { m: 4 });
        piece(fo, [[-14, 0], [14, 0], [16, 84], [-12, 86]], Y.colors.yellow, (R, B) => CARVE.slits(R, B, { angle: 90, gap: 9, w: 2 }), { m: 4 });
        piece(sh, curve([[-34, -12], [0, -30], [34, -14], [30, 18], [0, 26], [-30, 16]]), back ? mixHex(Y.colors.yellow, INK, 0.25) : Y.colors.yellow, (R, B) => CARVE.scales(R, B, { s: 11 }), { m: 4 });
      }
      // Hand: a small piece of natural ox-hide, carved with gaps between fingers
      piece(hand, curve([[-8, -6], [10, -6], [15, 8], [13, 20], [3, 24], [-7, 16]]), k.face === 'solid' ? INK : HIDE, (R, B) => CARVE.slits(R, B, { angle: 90, gap: 6, w: 1.4 }), { m: 2, sw: 2 });
      if (!back && k.weapon === 'sword') piece(hand, [[4, 8], [6, -170], [11, -192], [16, -170], [14, 8]], '#D9D2C0', (R, B) => CARVE.slits(R, B, { angle: 0, gap: 30, w: 1.8 }), { m: 2 }), piece(hand, [[-14, 2], [32, 2], [32, 10], [-14, 10]], Y.colors.yellow, null, { sw: 2 });
      if (!back && k.weapon === 'spear') { line(hand, 'M4 -260 L6 220', 6); piece(hand, curve([[5, -300], [16, -262], [5, -250], [-6, -262]]), '#D9D2C0', null); piece(hand, curve([[5, -250], [22, -232], [12, -214], [5, -236], [-2, -214], [-12, -232]]), Y.colors.red, (R, B) => CARVE.slits(R, B, { angle: 0, gap: 4, w: 1.4 }), { m: 2 }); }
      return { sh, up, fo, hand };
    };
    // Legs (shown on generals): trouser legs carved with slits + thick-soled boots; hip at the origin, legs pointing down 252
    const legParts = (g, k, col) => {
      const mk = (back) => { const L = sv('g', {}, g), c = back ? mixHex(col, INK, 0.3) : mixHex(col, INK, 0.12); piece(L, [[-16, 0], [18, 0], [20, 140], [16, 210], [-14, 210], [-18, 140]], c, (R, B) => CARVE.slits(R, B, { angle: 0, gap: 8, w: 1.8, seg: 50 }), { m: 4 }); boot(L, -14, 206, back); return L; };
      return { back: mk(true), front: mk(false) };
    };
    // Thick-soled boot: black hide, a slit along the sole
    const boot = (g, x0, y0, back) => { const pts = [[x0, y0], [x0 + 32, y0], [x0 + 34, y0 + 28], [x0 + 56, y0 + 36], [x0 + 58, y0 + 46], [x0, y0 + 46]]; piece(g, pts, back ? '#3A2A1C' : INK, (R) => ' ' + poly(strip([[x0 + 4, y0 + 40], [x0 + 52, y0 + 40]], 2)), { m: 1 }); };

    // Cast list: set up each person once at the start of a film (kind + look + colors + scale), then call them up by who — the same person looks the same in every scene;
    //   two different people looking identical in one scene triggers a reminder (at least two of face colour, beard, headwear, robe colour, build must differ)
    Y.castList = {};
    Y.cast = (list) => {
      Object.assign(Y.castList, list);
      // Cast check (the same one as whiteboard and ink): expand into the actual look (kind defaults + look + colors + height) and then compare
      if (window.EV && window.EV.castCheck) window.EV.castCheck(list, (c) => { const o = { ...(KINDS[c.kind ?? 'official'] || {}), ...(c.look || {}) }; for (const [k, v] of Object.entries(c.colors || {})) o['colors.' + k] = v; o.scale = c.scale ?? 1; return o; }, 'shadow');
      return Y;
    };
    const seen = new Map();
    Y.puppet = (parent, o) => {
      if (o.who) {
        const c = Y.castList[o.who]; if (!c) throw new Error(`角色表里没有"${o.who}"：先 Y.cast({ ${o.who}: { kind, look, colors } })`);
        o = { ...c, ...o, look: { ...(c.look || {}), ...(o.look || {}) }, colors: { ...(c.colors || {}), ...(o.colors || {}) }, size: (o.size ?? (PT ? 420 : 460)) * (c.scale ?? 1) };
      }
      if (o.faceTo && o.faceTo.st) o = { ...o, face: (o.faceTo.now ? o.faceTo.now.x : o.faceTo.st.x) >= (o.x ?? W / 2) ? 'right' : 'left' };   // faces the other figure as soon as it appears
      { const sig = JSON.stringify([o.kind ?? 'official', o.look || {}, o.colors || {}]), list = seen.get(parent) || []; const twin = list.find((q) => q.sig === sig && q.who !== (o.who ?? null)); if (twin && (o.who || twin.who)) console.warn(`皮影：同一场里"${twin.who ?? twin.kind}"和"${o.who ?? o.kind}"长得一模一样——在角色表里给他们不同的脸色 / 胡子 / 头饰 / 袍色 / 身形`); list.push({ sig, who: o.who ?? null, kind: o.kind }); seen.set(parent, list); }
      const k = { ...KINDS[o.kind ?? 'official'], ...(o.look || {}) }, seed = Math.round(hash(o.x ?? 0, o.size ?? 0, (o.kind ?? '').length) * 1000);
      const col = C('robe', k.robe, o), trim = C('trim', k.trim, o), size = F.px(o.size ?? (PT ? 420 : 460)) * (k.small ?? 1), sc = size / 600;
      // Hide is translucent: multiplied with the screen's lamplight (multiply), two overlapping pieces are darker, and the light's shading and cloth texture show through the hide
      const wrap = el('div', `left:0;top:0;width:${f1(W)}px;height:${f1(H)}px;pointer-events:none;display:none;mix-blend-mode:multiply;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: 'position:absolute;left:0;top:0;overflow:visible' }, wrap);
      // Who the motion check reports: the figure's name + which line of the page built it (otherwise only a <g>)
      const made = ((new Error().stack || '').split('\n').find((l) => /\.html:\d+/.test(l)) || '').match(/([\w.-]+\.html:\d+)/);
      wrap.dataset.what = svg.dataset.what = `皮影「${o.who ?? o.name ?? o.kind ?? 'official'}」${made ? `（${made[1]}）` : ''}`;
      const rods = sv('g', { stroke: '#2A1A10', 'stroke-width': f1(4 / Math.max(0.4, sc) * sc * 1.6), 'stroke-linecap': 'round', opacity: 0.85 }, svg);
      rods.dataset.motion = 'skip';   // the rods move with the figure; measuring the figure is enough
      const rodN = sv('line', {}, rods), rodF = sv('line', {}, rods), rodB = sv('line', {}, rods);
      const root = sv('g', {}, svg), flip = sv('g', {}, root);
      if (k.flags) flagParts(sv('g', {}, flip), col, trim);
      const backArm = armParts(sv('g', {}, flip), k, col, trim, true);
      const legs = k.armor ? legParts(sv('g', { transform: 'translate(0 -250)' }, flip), k, k.robe === 'black' ? Y.colors.green : col) : null;
      if (!k.armor) { boot(flip, -56, -46, true); boot(flip, 16, -46, false); }   // thick-soled boots showing under the robe
      const body = sv('g', {}, flip);
      bodyParts(body, k, col, trim, seed);
      const head = sv('g', {}, flip);
      const headG = headParts(head, k, col, trim);
      const frontArm = armParts(sv('g', {}, flip), k, col, trim, false);
      const st = { x: o.x ?? W / 2, face: o.face === 'left' ? -1 : 1, depth: o.depth ?? 0 };
      const tl = [];   // motion timeline: { a, b, kind, … }
      const Pp = { el: wrap, k, size, tl, st, name: o.name, head: headG };
      // ---- Moves ----
      const add = (x) => { tl.push(x); return Pp; };
      Pp.walk = (at, x, dur = 1.6, w = {}) => add({ kind: 'walk', a: at - dur, b: at, x, backward: w.backward });   // backward: back away facing forward (no turn)
      Pp.talk = (at, dur = 1.6) => add({ kind: 'talk', a: at, b: at + dur });
      Pp.point = (at, dur = 1.4) => add({ kind: 'point', a: at - 0.35, b: at + dur });
      Pp.bow = (at, dur = 1.2) => add({ kind: 'bow', a: at - 0.4, b: at + dur });
      Pp.fight = (at, dur = 1.6) => add({ kind: 'fight', a: at - 0.2, b: at + dur });
      Pp.fall = (at, f = {}) => { if (f.sfx !== false) F.sfx(at - 0.1, 'thud', f.stay ? 0.3 : 0.5); return add({ kind: 'fall', a: at - (f.dur ?? 0.5), b: at, stay: !!f.stay, back: !!f.back }); };   // stay: stays on the ground after falling
      Pp.lie = (at, f = {}) => Pp.fall(at, { dur: 0.9, ...f, stay: true });   // lie down (drunk, asleep): falls more slowly, stays on the ground
      Pp.rise = (at, dur = 0.8) => add({ kind: 'rise', a: at - dur, b: at });
      Pp.sway = (at, dur = 2, deg = 4) => add({ kind: 'sway', a: at, b: at + dur, deg });   // sway drunkenly (about the feet)
      Pp.weep = (at, dur = 2) => add({ kind: 'weep', a: at - 0.3, b: at + dur });
      Pp.sink = (at, dur = 1.6) => add({ kind: 'sink', a: at - dur, b: at });
      // A shadow puppet turns round by flipping over at once (how the medium really works): the motion check doesn't report "too fast" for this span
      const flipOk = (at) => (svg._motionOk ??= []).push([at - 0.25, at + 0.06]);
      Pp.turn = (at) => { flipOk(at); return add({ kind: 'turn', a: at - 0.18, b: at }); };
      Pp.faceTo = (at, other) => { flipOk(at); return add({ kind: 'faceTo', a: at - 0.18, b: at, other }); };   // at at, turn to face another figure
      Pp.exit = (at, side = 'left', dur = 1.6) => add({ kind: 'walk', a: at - dur, b: at, x: side === 'left' ? -size * 0.6 : W + size * 0.6 });
      Pp.dance = (at, dur = 2.4) => add({ kind: 'dance', a: at, b: at + dur });
      Pp.ride = (horse) => { Pp.horse = horse; return Pp; };
      const at0 = o.at ?? 0, until = o.until ?? 1e9;
      if (o.enter === 'left' || o.enter === 'right') { const x0 = st.x; st.x = o.enter === 'left' ? -size * 0.6 : W + size * 0.6; Pp.walk(at0, x0, o.enterDur ?? 1.6); }
      F.add((t) => {
        const on = t >= at0 - (o.enter && o.enter !== 'fade' ? o.enterDur ?? 1.6 : 0.7) && t < until; set(wrap, { display: on ? '' : 'none' }); if (!on) return;
        // Position: accumulated over every walk in order
        let x = st.x, face = st.face, walking = 0, talk = 0, point = 0, bow = 0, fight = 0, fall = 0, sink = 0, dance = 0, weep = 0, swayDeg = 0, fallA = null;
        for (const a of tl) {
          // Walking: the steps (bobbing, arm swing) ease in and out over the first and last 0.3 s instead of full speed at once
          if (a.kind === 'walk') { if (t >= a.a) { const q = seg(t, a.a, a.b, E.sine); const from = x; x = lerp(from, a.x, q); if (t < a.b) { const bk = (a.backward ?? o.backward) ? -1 : 1; walking = Math.max(walking, Math.min(1, (t - a.a) / 0.3, (a.b - t) / 0.3)); if (a.x < from) face = -1 * bk; else if (a.x > from) face = 1 * bk; } } }
          else if (a.kind === 'turn') { if (t >= a.b) face = -face; }
          else if (a.kind === 'faceTo') { if (t >= a.b && a.other.now) face = a.other.now.x >= x ? 1 : -1; }
          else if (t >= a.a && t < a.b + 0.4) {
            const q = Math.min(seg(t, a.a, a.a + 0.3), 1 - seg(t, a.b, a.b + 0.4));
            if (a.kind === 'talk') talk = Math.max(talk, q); if (a.kind === 'point') point = Math.max(point, q); if (a.kind === 'bow') bow = Math.max(bow, q); if (a.kind === 'fight') fight = Math.max(fight, q); if (a.kind === 'dance') dance = Math.max(dance, q); if (a.kind === 'weep') weep = Math.max(weep, q);
            if (a.kind === 'sway') swayDeg += a.deg * Math.sin((t - a.a) * 2.2) * Math.max(0, Math.min(1, (t - a.a) * 2, (a.b - t) * 2));
          }
          if (a.kind === 'fall' && t >= a.a && (!fallA || a.a >= fallA.a)) fallA = a;
          if (a.kind === 'sink' && t >= a.a) sink = seg(t, a.a, a.b, E.cubicInOut);
        }
        // Fall / lie down, then a later rise gets up again
        if (fallA) { fall = seg(t, fallA.a, fallA.b, fallA.stay ? E.cubicInOut : E.quartIn ?? E.expoIn); for (const a of tl) if (a.kind === 'rise' && a.a >= fallA.b - 0.01 && t >= a.a) fall *= 1 - seg(t, a.a, a.b, E.cubicInOut); }
        const gone = fallA && !fallA.stay && fall >= 1 && !tl.some((a) => a.kind === 'rise' && a.a >= fallA.b - 0.01);
        if (Pp.horse && Pp.horse.pos) { const hp = Pp.horse.pos(t); x = hp[0]; face = hp[2]; walking = 0; }
        x += face * fight * size * (0.035 + 0.035 * Math.sin(t * 9 + seed));   // lunge forward and pull back while fighting (when two fight, one advances as the other retreats)
        const ph = t * 6.2 + seed, bob = walking * Math.abs(Math.sin(ph)) * 10 + weep * Math.abs(Math.sin(t * 7)) * 4, sway = walking * Math.sin(ph);
        // Joint angles (degrees): positive = raised forwards
        // Standing, the hands don't hang straight down either: the front hand slightly raised in front of the body, the back hand a little behind (the shadow-puppet stance)
        const rest = 1 - fall;
        // Weeping behind a sleeve: the front sleeve raised before the face (upper arm forwards and up, forearm folded back), sobbing
        const aF = rest * 14 + walking * sway * 18 + talk * (32 + 14 * Math.sin(t * 7)) + point * 82 + bow * 58 + fight * (60 + 50 * Math.sin(t * 9)) + dance * (70 + 50 * Math.sin(t * 3.1)) + weep * (106 + 4 * Math.sin(t * 7));
        const eF = rest * 30 + talk * (40 + 10 * Math.sin(t * 7)) + point * 6 + bow * 70 + fight * 20 + dance * (40 + 30 * Math.sin(t * 3.1 + 1)) + weep * 117;
        const aB = -rest * 8 - walking * sway * 14 + bow * 50 + dance * (40 + 40 * Math.sin(t * 3.1 + 2)) + fight * 20;
        const eB = rest * 14 + bow * 76 + dance * 50;
        const stoop = (k.stoop ?? 0) * rest, tilt = bow * 14 + (fallA && fallA.back ? -1 : 1) * fall * 86 + stoop * 12 + weep * 6, headR = talk * 4 * Math.sin(t * 7.3) + bow * 10 + stoop * 8 + weep * (14 + 3 * Math.sin(t * 7));
        const footY = Y.floor + (Pp.horse ? -(Pp.horse.saddle ?? F.px(150)) + size * 0.32 : 0) + sink * size * 0.9, d = st.depth + (o.enter === 'fade' ? (1 - seg(t, at0 - 0.7, at0, E.quartOut)) * 0.9 : 0);   /* Pressing onto the screen: comes up from behind the screen — blurred and large at first, sharp only once against the screen; riding: feet go under the saddle, the lower robe hidden behind the horse */
        root.setAttribute('transform', `translate(${f1(x)} ${f1(footY - bob * sc + fall * size * 0.05)}) rotate(${f1(swayDeg)}) scale(${(sc * (1 + d * 0.25)).toFixed(4)})`);   /* sway: the whole figure sways about its feet */   /* the SVG transform attribute (CSS transform does not accept the space-separated form) */
        flip.setAttribute('transform', `scale(${face} 1) rotate(${f1(tilt)} 0 -20)`);
        head.setAttribute('transform', `rotate(${f1(-headR)} 6 -472)`);
        const arm = (A, sx, a, e) => { A.sh.setAttribute('transform', `translate(${sx} -444)`); A.up.setAttribute('transform', `rotate(${f1(-a)})`); A.fo.setAttribute('transform', `translate(0 104) rotate(${f1(-e)})`); };
        arm(frontArm, 18, aF, eF); arm(backArm, -10, aB, eB);
        if (legs) { const lg = walking ? sway * 22 : 0; legs.front.setAttribute('transform', `rotate(${f1(-lg)})`); legs.back.setAttribute('transform', `rotate(${f1(lg)})`); }
        // Control rods: from the neck and both hands down past the bottom of the screen (hand positions computed from the joints)
        const S = sc * (1 + d * 0.25), fx = (u) => x + u * S * face, fy = (v) => footY - bob * sc + v * S;
        const handPos = (sx, a, e) => { const r1 = (a * Math.PI) / 180, r2 = ((a + e) * Math.PI) / 180; return [sx + Math.sin(r1) * 104 + Math.sin(r2) * 96, -444 + Math.cos(r1) * 104 + Math.cos(r2) * 96]; };
        const hf = handPos(18, aF, eF), hb = handPos(-10, aB, eB), bottom = H + F.px(40);
        const rod = (L, p, dx) => { L.setAttribute('x1', f1(fx(p[0]))); L.setAttribute('y1', f1(fy(p[1]))); L.setAttribute('x2', f1(fx(p[0]) + dx)); L.setAttribute('y2', f1(bottom)); };
        rod(rodN, [6, -470], -F.px(30) * face); rod(rodF, hf, F.px(60) * face); rod(rodB, hb, -F.px(20) * face);
        set(rods, { opacity: fall > 0.5 || sink > 0.6 ? '0' : '0.85' });   // rods hidden once more than half fallen (a lying figure has no rods sticking out)
        // Further from the screen: blurred, larger, fainter
        const fade = o.until < 1e8 ? 1 - seg(t, until - 0.35, until) : 1, fin = o.enter === 'fade' ? seg(t, at0 - 0.7, at0 - 0.25) : 1;
        set(svg, { filter: d > 0 ? `blur(${f1(d * F.px(8))}px)` : 'none', opacity: String((Math.min(fade, fin) * (1 - d * 0.35) * (gone ? 1 - seg(t, fallA.b + 0.6, fallA.b + 1.2) : 1)).toFixed(3)) });   // a figure that falls (not stay) fades out slowly
        // Top of the head (highest point of hat / headwear, frame px): a paper slip hung over a figure with over is placed by this
        const hatTop = k.hatTop ?? { crown: -618, bun: -628, helmet: -664, helmet2: -690, wusha: -614, cap: -600, guan: -646, hair: -586 }[k.hat] ?? -610;
        Pp.now = { x, face, footY, top: fy(-472 + (hatTop + 472) * 1.22) };
      });
      if (o.enter && o.enter !== 'fade' && o.sfx !== false) F.sfx(at0 - (o.enterDur ?? 1.6), 'step', 0.25, { dur: o.enterDur ?? 1.6 });
      return Pp;
    };

    // ---------- Props ----------
    const PROPS = {
      palace: (g, c) => {
        // Palace: black-hide roof carved with rows of tile gaps, red pillars, lattice doors between them carved with tortoise-shell, a string of holes on the platform
        piece(g, [[-280, -30], [280, -30], [300, 0], [-300, 0]], INK, (R) => CARVE.dots(R, [[-270, -15], [270, -15]], { step: 16, r: 3.6, kind: 'rice' }), { m: 3 });
        for (let i = -3; i < 3; i++) piece(g, [[i * 64 + 14, -276], [i * 64 + 50, -276], [i * 64 + 50, -36], [i * 64 + 14, -36]], c.ochre, (R, B) => CARVE.hex(R, B, { s: 14 }), { m: 4, alpha: 0.8 });
        for (let i = -3; i <= 3; i++) piece(g, [[i * 64 - 10, -290], [i * 64 + 10, -290], [i * 64 + 10, -30], [i * 64 - 10, -30]], c.red, (R, B) => CARVE.slits(R, B, { angle: 0, gap: 7, w: 2, seg: 60 }), { m: 3 });
        piece(g, [[-232, -312], [232, -312], [232, -288], [-232, -288]], c.red, (R) => CARVE.dots(R, [[-226, -300], [226, -300]], { step: 12, r: 3 }), { m: 2 });
        piece(g, curve([[-120, -390], [0, -470], [120, -390], [60, -382], [-60, -382]]), INK, (R, B) => CARVE.slits(R, B, { angle: 0, gap: 14, w: 2.6 }), { m: 5 });
        piece(g, curve([[-300, -330], [-200, -364], [0, -384], [200, -364], [300, -330], [334, -352], [312, -310], [-312, -310], [-334, -352]]), INK, (R, B) => CARVE.slits(R, B, { angle: 0, gap: 16, w: 2.6 }), { m: 6 });
      },
      gate: (g, c) => {
        const wall = [[-320, -300], [320, -300], [320, 0], [-320, 0]];
        let bricks = ''; for (let y = -280; y < -10; y += 34) for (let x = -310 + ((y / 34) % 2 ? 0 : 30); x < 300; x += 60) if (Math.abs(x) > 90 || y < -230) bricks += ' ' + poly([[x + 4, y + 4], [x + 46, y + 4], [x + 46, y + 22], [x + 4, y + 22]]);
        piece(g, wall, '#6B4426', () => ' M-70 0 L-70 -150 Q0 -230 70 -150 L70 0 Z' + bricks, { m: 4 });
        for (let x = -320; x < 320; x += 64) piece(g, [[x, -300], [x + 40, -300], [x + 40, -336], [x, -336]], INK, null, { sw: 2 });
        piece(g, curve([[-180, -336], [0, -424], [180, -336]]), INK, (R, B) => CARVE.slits(R, B, { angle: 0, gap: 14, w: 2.6 }), { m: 5 });
      },
      mountain: (g, c) => {
        // Mountain: green hide carved with layered mountain lines (concentric half-circle slits)
        piece(g, curve([[-420, 0], [-300, -260], [-220, -180], [-80, -420], [40, -240], [140, -330], [300, -120], [420, 0]]), c.green, (R, B) => CARVE.waves(R, B, { s: 46, w: 3 }), { m: 12, alpha: 0.85, sw: 4 });
      },
      tree: (g, c) => {
        // Tree: black-hide trunk carved with bark lines, the crown a big piece of green hide carved with tortoise-shell and flowers
        piece(g, curve([[-16, 0], [-10, -200], [-40, -262], [-6, -232], [4, -300], [16, -222], [50, -272], [18, -190], [16, 0]]), INK, (R, B) => CARVE.slits(R, B, { angle: 0, gap: 8, w: 2, seg: 30 }), { m: 3 });
        piece(g, curve([[-160, -260], [-110, -400], [0, -460], [110, -400], [160, -260], [60, -220], [-60, -220]]), c.green, (R, B) => CARVE.hex(R, B, { s: 30 }), { m: 8, alpha: 0.88, sw: 4 });
      },
      flag: (g, c, o) => {
        sv('path', { d: 'M0 0 L0 -520', stroke: INK, 'stroke-width': 9 }, g);
        const cloth = sv('path', { d: blob([[4, -510], [170, -500], [176, -360], [4, -370]]), fill: o.color ? c[o.color] ?? o.color : c.red, 'fill-opacity': 0.9, stroke: INK, 'stroke-width': 5 }, g);
        sv('path', { d: 'M4 -370 L20 -340 L40 -366 L60 -338 L80 -364 L100 -336 L120 -362 L140 -334 L160 -360 L176 -340', fill: 'none', stroke: INK, 'stroke-width': 4 }, g);
        g._cloth = cloth;
      },
      fire: (g, c) => {
        // Fire: three carved tongues of flame (red outside, yellow inside, curling tips, thin slits), each stretching and swaying on its own
        g._fire = [[-52, 0.8], [0, 1.1], [50, 0.9]].map(([x0, k]) => {
          const f = sv('g', {}, g), outer = curve([[-40, 0], [-46, -56], [-26, -104], [-34, -146], [-8, -196], [0, -150], [18, -176], [20, -120], [42, -84], [40, -30], [40, 0]].map(([x, y]) => [x * k, y * k]));
          const inner = curve([[-18, 0], [-22, -40], [-8, -84], [-2, -120], [8, -86], [20, -54], [18, 0]].map(([x, y]) => [x * k, y * k]));
          piece(f, outer, c.red, (R, B) => CARVE.slits(R, B, { angle: 0, gap: 8, w: 1.8, seg: 30 }), { m: 4, cut: [inner] });
          piece(f, inner, c.yellow, (R, B) => CARVE.dots(R, [[0, -10 * k], [0, -90 * k]], { step: 12, r: 2.4 }), { m: 3 });
          return { f, x0, k };
        });
      },
      moon: (g, c) => { piece(g, ring(0, -60, 60, 48), c.white, (R) => CARVE.dots(R, curve(ring(0, -60, 46, 12)).concat([[46, -60]]), { step: 12, r: 3 }), { m: 4, alpha: 0.85, sw: 3 }); },
      cloud: (g, c) => { piece(g, curve([[-120, 0], [-128, -50], [-80, -64], [-56, -104], [0, -104], [52, -116], [84, -70], [132, -58], [132, 0]]), c.white, (R, B) => CARVE.waves(R, B, { s: 40, w: 2.6 }), { m: 6, alpha: 0.75, sw: 3 }); },
      jar: (g, c) => {
        // Wine jar: ochre hide carved with two rings of diamond holes, a piece of red cloth over the mouth
        const S = (pts) => pts.map(([x, y]) => [x * 2.6, y * 2.6]);
        piece(g, curve(S([[-28, 0], [-50, -40], [-56, -80], [-40, -112], [-22, -118], [-24, -130], [24, -130], [22, -118], [40, -112], [56, -80], [50, -40], [28, 0]])), c.ochre, (R) => CARVE.dots(R, [[-120, -198], [120, -198]], { step: 30, r: 9 }) + CARVE.dots(R, [[-110, -156], [110, -156]], { step: 30, r: 7 }), { m: 8, sw: 4 });
        piece(g, S([[-30, -128], [30, -128], [36, -146], [0, -160], [-36, -146]]), c.red, (R, B) => CARVE.slits(R, B, { angle: 0, gap: 16, w: 3 }), { m: 6, sw: 4 });
      },
      reeds: (g, c, o) => {
        // Reeds: a clump of long green-hide leaves carved with slits (each swaying slowly in the wind), a few topped with ochre cattail heads
        const n = o.n ?? 6, seed = o.seed ?? 1;
        g._reeds = { n, seed, leaf: sv('path', { fill: c[o.color ?? 'green'], 'fill-opacity': 0.92, 'fill-rule': 'evenodd', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g), head: sv('path', { fill: c.ochre, 'fill-rule': 'evenodd', stroke: INK, 'stroke-width': 2.6 }, g),
          B: Array.from({ length: n }, (_, i) => ({ h: (0.62 + 0.38 * hash(seed * 31 + i)) * 400, lean: (hash(seed * 7 + i) - 0.5) * 92, bx: (i - (n - 1) / 2) * 21, cat: hash(seed * 3 + i) > 0.55 })) };
      },
      sword: (g, c) => {
        // A sword (upright, point up; rot: 90 lies flat): a fuller carved down the blade, cord-wrapped guard and hilt, a red tassel behind the hilt
        piece(g, [[-9, -110], [-9, -380], [0, -410], [9, -380], [9, -110]], '#D9D2C0', (R) => ' ' + poly(strip([[0, -130], [0, -370]], 3)), { m: 2, sw: 3 });
        piece(g, curve([[-46, -112], [0, -98], [46, -112], [40, -92], [0, -84], [-40, -92]]), c.yellow, (R) => CARVE.dots(R, [[-34, -100], [34, -100]], { step: 12, r: 3 }), { m: 3, sw: 3 });
        piece(g, [[-8, -88], [8, -88], [8, -14], [-8, -14]], INK, (R, B) => CARVE.slits(R, B, { angle: 90, gap: 9, w: 2.2 }), { m: 1.5, sw: 2.4 });
        piece(g, curve([[0, -14], [16, 6], [12, 60], [0, 70], [-12, 60], [-16, 6]]), c.red, (R, B) => CARVE.slits(R, B, { angle: 0, gap: 6, w: 1.8 }), { m: 2.5, sw: 2.4 });
      },
      horse: (g, c) => {
        // Horse: one piece of carved hide (tortoise-shell), mane and tail in black hide with thin slits, the saddle cloth a separate piece (sea waves); each of the four legs a piece, swinging alternately at a gallop
        const body = sv('g', {}, g);
        g._legs = [[-112, -184], [-74, -184], [72, -184], [108, -184]].map(([lx, ly], i) => { const L = sv('g', { transform: `translate(${lx} ${ly})` }, body); piece(L, curve([[-13, 0], [13, 0], [11, 86], [13, 160], [-6, 164], [-10, 86]]), i % 2 ? mixHex(c.ochre, INK, 0.3) : c.ochre, (R, B) => CARVE.slits(R, B, { angle: 0, gap: 7, w: 1.6, seg: 40 }), { m: 3 }); piece(L, [[-8, 160], [14, 158], [16, 180], [-10, 180]], INK, null); return L; });
        piece(body, curve([[-158, -214], [-196, -196], [-226, -150], [-236, -96], [-214, -118], [-196, -160], [-166, -186]]), INK, (R, B) => CARVE.slits(R, B, { angle: -30, gap: 5, w: 1.5, seg: 26 }), { m: 2.5 });   // tail
        const cloth = [[-74, -258], [50, -258], [56, -196], [-80, -196]], saddle = [[-52, -268], [42, -268], [32, -246], [-42, -246]];
        piece(body, curve([[-150, -230], [-60, -258], [60, -256], [110, -290], [140, -350], [176, -380], [204, -374], [216, -346], [190, -326], [166, -300], [152, -246], [130, -196], [60, -176], [-120, -176], [-168, -200]]), c.ochre, (R, B) => CARVE.hex(R, B, { s: 18 }), { m: 7, cut: [cloth] });
        piece(body, curve([[136, -356], [164, -386], [150, -340], [126, -300], [104, -278], [118, -318]]), INK, (R, B) => CARVE.slits(R, B, { angle: 40, gap: 5, w: 1.5 }), { m: 2.5 });   // mane
        line(body, 'M184 -360 Q192 -366 198 -360', 2); plain(body, poly(ring(192, -362, 2.4, 8)), INK); line(body, 'M206 -346 q4 4 0 8', 1.8);   // eye, nostril
        piece(body, cloth, c.green, (R, B) => CARVE.waves(R, B, { s: 22 }) + CARVE.dots(R, [[-76, -204], [54, -204]], { step: 8, r: 2 }), { m: 4 });
        piece(body, saddle, c.red, (R) => CARVE.dots(R, [[-44, -258], [36, -258]], { step: 8, r: 2.2, kind: 'rice' }), { m: 2 });
        g._body = body;
      },
    };
    Y.prop = (parent, o) => {
      const size = F.px(o.size ?? 300), sc = size / 400, at0 = o.at ?? 0, until = o.until ?? 1e9;
      const wrap = el('div', `left:0;top:0;width:${f1(W)}px;height:${f1(H)}px;pointer-events:none;display:none;mix-blend-mode:multiply;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: 'position:absolute;left:0;top:0;overflow:visible' }, wrap);
      const root = sv('g', {}, svg), g = sv('g', {}, root);
      PROPS[o.kind](g, Y.colors, o);
      let label = null;
      if (o.text && o.kind === 'flag') { label = el('div', `left:0;top:0;font:700 ${f1(F.px(o.textSize ?? 74) * sc / 0.75)}px/1 ${Y.font};color:${o.textColor ?? '#F6E7C8'};white-space:nowrap;display:none;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent); label.textContent = o.text;   /* the text is kept out of the multiply layer (multiplying would make it unreadable) */ F.text(label, 'label', o.text, at0 - 0.6, until, { overlap: true }); }
      const st = { x: o.x ?? W / 2, y: o.y ?? Y.floor, depth: o.depth ?? 0 }, moves = [], extra = [];
      const Pr = { el: wrap, st, moves, saddle: o.kind === 'horse' ? 262 * sc : 0 };
      Pr.move = (at, x, dur = 2) => { moves.push({ a: at - dur, b: at, x }); return Pr; };
      Pr.fall = (at) => { extra.push({ kind: 'fall', at }); F.sfx(at - 0.2, 'thud', 0.7); return Pr; };
      Pr.gallop = (at, dur) => { extra.push({ kind: 'gallop', a: at, b: at + dur }); return Pr; };
      Pr.pos = (t) => { let x = st.x, face = o.face === 'left' ? -1 : 1; for (const m of moves) if (t >= m.a) { const from = x; x = lerp(from, m.x, seg(t, m.a, m.b, E.sine)); if (t < m.b) face = m.x < from ? -1 : 1; } return [x, st.y, face]; };
      F.add((t) => {
        const on = t >= at0 - 0.6 && t < until; set(wrap, { display: on ? '' : 'none' }); if (label) set(label, { display: on ? '' : 'none' }); if (!on) return;
        const [x, y, face] = Pr.pos(t), rise = 1 - seg(t, at0 - 0.6, at0, E.quartOut), fade = until < 1e8 ? 1 - seg(t, until - 0.4, until) : 1;
        let rot = 0, dy = rise * size * 0.5, moving = moves.some((m) => t >= m.a && t < m.b) || extra.some((x2) => x2.kind === 'gallop' && t >= x2.a && t < x2.b);
        for (const x2 of extra) if (x2.kind === 'fall' && t >= x2.at - 0.6) { const q = seg(t, x2.at - 0.6, x2.at, E.expoIn); rot = q * 18; dy += q * size * 0.6; }
        root.setAttribute('transform', `translate(${f1(x)} ${f1(y + dy)}) scale(${(sc * face * (1 + st.depth * 0.25)).toFixed(4)} ${(sc * (1 + st.depth * 0.25)).toFixed(4)}) rotate(${f1(rot + (o.rot ?? 0))})`);
        if (g._reeds) { const { B, seed, leaf, head } = g._reeds; let dL = '', dH = ''; B.forEach((b, i) => { const sw2 = Math.sin(t * 1.1 + i * 1.7 + seed) * 9, tip = [b.bx + b.lean + sw2, -b.h], mid = [b.bx + (b.lean + sw2) * 0.45, -b.h * 0.5], wd = 12; dL += ' ' + poly([[b.bx - wd, 0], [mid[0] - wd * 0.7, mid[1]], tip, [mid[0] + wd * 0.7, mid[1]], [b.bx + wd, 0]]); for (let q = 0.15; q < 0.8; q += 0.13) dL += ' ' + poly(oval(b.bx + (b.lean + sw2) * q * (q < 0.5 ? 0.9 : 1), -b.h * q, 3, 12, Math.atan2(-b.h, b.lean) + Math.PI / 2, 8)); if (b.cat) { const cx = b.bx + (b.lean + sw2) * 0.9, cy = -b.h * 0.86, an = Math.atan2(b.lean, b.h); dH += ' ' + poly(oval(cx, cy, 12, 35, an, 12)) + ' ' + poly(oval(cx, cy, 3.4, 16, an, 8)); } }); leaf.setAttribute('d', dL); head.setAttribute('d', dH); }
        set(svg, { opacity: String(((1 - rise) * fade * (1 - st.depth * 0.3)).toFixed(3)), filter: st.depth > 0 || rise > 0.05 ? `blur(${f1((st.depth + rise) * F.px(8))}px)` : 'none' });
        if (g._legs) { const ph = t * 9; g._legs.forEach((L, i) => L.setAttribute('transform', `translate(${[-112, -74, 72, 108][i]} -184) rotate(${f1(moving ? Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? 1 : 0)) * 26 : 0)})`)); g._body.setAttribute('transform', `translate(0 ${f1(moving ? -Math.abs(Math.sin(ph)) * 14 : 0)})`); }
        if (g._cloth) g._cloth.setAttribute('d', blob([[4, -510], [90, -500 + Math.sin(t * 3) * 8], [170 + Math.sin(t * 2.4) * 6, -500], [176, -430 + Math.sin(t * 3.3) * 10], [176, -360], [90, -366 + Math.sin(t * 2.8) * 8], [4, -370]]));
        if (g._fire) g._fire.forEach(({ f, x0 }, i) => f.setAttribute('transform', `translate(${x0} 0) scale(1 ${(0.86 + 0.14 * Math.sin(t * (5 + i) + i * 1.7)).toFixed(3)}) skewX(${f1(7 * Math.sin(t * (3.1 + i * 0.7) + i))})`));
        if (label) { const s2 = sc * (1 + st.depth * 0.25); set(label, { transform: `translate(${f1(x + 90 * s2 * face - label.offsetWidth / 2)}px,${f1(y + dy - 470 * s2)}px)`, opacity: String(((1 - rise) * fade).toFixed(3)) }); }
      });
      if (o.sfx !== false) F.sfx(at0 - 0.5, 'wood', 0.3);
      return Pr;
    };

    // ---------- Carving your own hide: things the runtime doesn't have (animals, objects) ----------
    // A full-screen svg (frame px), multiply for light through; enters by pressing onto the screen from behind (blurred, then sharp); draw(g, kit) draws once, frame(t, g, kit) changes it every frame
    const leather = (parent, o = {}) => {
      const at0 = o.at ?? 0, until = o.until ?? 1e9;
      const wrap = el('div', `left:0;top:0;width:${f1(W)}px;height:${f1(H)}px;pointer-events:none;display:none;mix-blend-mode:multiply;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: 'position:absolute;left:0;top:0;overflow:visible' }, wrap), g = sv('g', {}, svg);
      if (o.what) svg.dataset.what = o.what;
      if (o.draw) o.draw(g, KIT);
      F.add((t) => {
        const on = t >= at0 - 0.7 && t < until; set(wrap, { display: on ? '' : 'none' }); if (!on) return;
        const fin = seg(t, at0 - 0.7, at0, E.quartOut), out = until < 1e8 ? 1 - seg(t, until - 0.4, until) : 1, d = (o.depth ?? 0) + (1 - fin) * 0.9;
        set(svg, { opacity: (Math.min(fin, out) * (1 - (o.depth ?? 0) * 0.35)).toFixed(3), filter: d > 0.01 ? `blur(${f1(d * F.px(8))}px)` : 'none' });
        if (o.frame) o.frame(t, g, KIT);
      });
      if (o.sfx) F.sfx(at0 - 0.5, 'wood', 0.3);
      return { el: wrap, svg, g };
    };
    Y.leather = leather;
    // Snake: a white-hide snake carved with scales (three rows of diamond holes, a dark ink line down the back), body always slithering (the wave travels from tail to head);
    //   rear: [up, down] raises its head and flicks its tongue; cut: at that moment a flash of sword light cuts it in two at the middle (the halves separate, droop towards the cut, twitch a few times, then still); dead: already in two halves, lying there; crawl: px per second it moves forward
    Y.snake = (parent, o) => {
      const dir = o.face === 'left' ? -1 : 1, len = o.len ?? F.px(600), w0 = F.px(o.w ?? 46), N = 64, uc = 0.52;
      const dia = (x, y, r, ang) => poly([[x + Math.cos(ang) * r * 1.4, y + Math.sin(ang) * r * 1.4], [x - Math.sin(ang) * r, y + Math.cos(ang) * r], [x - Math.cos(ang) * r * 1.4, y - Math.sin(ang) * r * 1.4], [x + Math.sin(ang) * r, y - Math.cos(ang) * r]]);
      let body, edge, spine, eye, tongue, slash;
      const L = leather(parent, {   // called internally (not through infoKit, so it isn't registered twice)
        ...o, what: o.what ?? '皮影 蛇', draw: (g) => {
        body = sv('path', { fill: o.color ? Y.colors[o.color] ?? o.color : Y.colors.white, 'fill-opacity': 0.96, 'fill-rule': 'evenodd' }, g);
        edge = sv('path', { fill: 'none', stroke: INK, 'stroke-width': F.px(2.8), 'stroke-linejoin': 'round' }, g);
        spine = sv('path', { fill: INK, 'fill-opacity': 0.85 }, g);
        eye = sv('path', { fill: Y.colors.red }, g);
        tongue = sv('path', { fill: 'none', stroke: Y.colors.red, 'stroke-width': F.px(3.2), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
        slash = sv('path', { fill: 'none', stroke: Y.colors.red, 'stroke-linecap': 'round' }, g);
      }, frame: (t) => {
        const cutAt = o.cut ?? 1e9, after = Math.max(0, t - cutAt), isCut = t >= cutAt;
        const rear = (o.rear ? seg(t, o.rear[0], o.rear[1], E.backOut) : 0) * (isCut ? 1 - seg(after, 0, 0.45, E.quartIn) : 1);
        const still = o.dead ? 0 : isCut ? Math.exp(-after * 1.3) * (1 + 1.6 * Math.exp(-after * 4)) : 1;   // after being cut it twitches a few times, then stops
        const amp = F.px(o.amp ?? 16) * still, ph = t * (o.speed ?? 2.4) * (isCut ? 2.2 : 1);
        const crawl = o.crawl ? F.px(o.crawl) * Math.min(Math.max(0, t - (o.at ?? 0) + 0.7), o.crawlFor ?? 99) : 0;
        const raw = (u) => {
          let x = o.x + dir * ((u - 0.5) * len + crawl), y = o.y + amp * Math.sin(u * Math.PI * 2 * (o.waves ?? 2.2) - ph) * (0.35 + 0.65 * u);
          if (u > 0.76) { const q = (u - 0.76) / 0.24, e = q * q * (3 - 2 * q); y -= rear * F.px(o.rearH ?? 160) * e; x -= dir * rear * len * 0.07 * e; }
          return [x, y];
        };
        const width = (u) => w0 * (u < 0.5 ? 0.16 + 0.84 * Math.sin((u / 0.5) * Math.PI / 2) : u > 0.9 ? 0.82 : 1);
        const sep = isCut ? F.px(o.sep ?? 70) * seg(after, 0, 0.5, E.quartOut) : 0;
        let half = 1;   // which half is being drawn: -1 the tail half, 1 the head half
        const tf = (p) => {
          if (!isCut && !o.dead) return p;
          const s2 = o.dead ? F.px(o.sep ?? 70) : sep, c = raw(uc), a = half * dir * (o.dead ? 0.1 : 0.1 * seg(after, 0, 0.5)), dx = p[0] - c[0], dy = p[1] - c[1];
          return [c[0] + dx * Math.cos(a) - dy * Math.sin(a) + half * dir * s2 * (half > 0 ? 0.25 : 1), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
        };
        const P2 = (u, off) => { const a = raw(Math.max(0, u - 0.004)), b = raw(Math.min(1, u + 0.004)), c = raw(u), tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; return tf([c[0] - (ty / l) * off, c[1] + (tx / l) * off]); };
        let dB = '', dS = '';
        for (const [u0, u1] of isCut || o.dead ? [[0, uc], [uc, 1]] : [[0, 1]]) {
          half = u1 <= uc ? -1 : 1;
          const nu = Math.round(N * (u1 - u0)) + 1, us = Array.from({ length: nu }, (_, i) => u0 + ((u1 - u0) * i) / (nu - 1));
          dB += ' ' + poly(us.map((u) => P2(u, width(u) / 2)).concat(us.map((u) => P2(u, -width(u) / 2)).reverse()));
          for (let u = u0 + 0.03; u < u1 - 0.02; u += 0.028) { const a = raw(u - 0.004), b = raw(u + 0.004), ang = Math.atan2(b[1] - a[1], b[0] - a[0]), r = width(u) * 0.09; for (const kk of [-0.24, 0, 0.24]) { const p = P2(u + (kk ? 0.014 : 0), width(u) * kk); dB += ' ' + dia(p[0], p[1], r, ang); } }
          const sp = us.filter((u) => u > 0.06);
          if (sp.length > 2) dS += ' ' + poly(sp.map((u) => P2(u, -width(u) * 0.36)).concat(sp.map((u) => P2(u, -width(u) * 0.46)).reverse()));
        }
        const hb = raw(0.985), hc = raw(1), ang = Math.atan2(hc[1] - hb[1], hc[0] - hb[0]); half = 1;
        const hp = tf([hc[0] + Math.cos(ang) * w0 * 0.55, hc[1] + Math.sin(ang) * w0 * 0.55]);
        dB += ' ' + poly(oval(hp[0], hp[1], w0 * 0.95, w0 * 0.6, ang, 14));
        body.setAttribute('d', dB); edge.setAttribute('d', dB); spine.setAttribute('d', dS);
        const ep = [hp[0] + Math.cos(ang) * w0 * 0.25 + Math.sin(ang) * w0 * 0.2, hp[1] + Math.sin(ang) * w0 * 0.25 - Math.cos(ang) * w0 * 0.2];
        eye.setAttribute('d', poly(oval(ep[0], ep[1], w0 * 0.14, w0 * 0.11, ang, 10)));
        // Tongue: flicks in and out while the head is raised
        const tq = rear > 0.3 && !isCut ? Math.max(0, Math.sin(t * 9)) : 0, t0 = [hp[0] + Math.cos(ang) * w0 * 0.95, hp[1] + Math.sin(ang) * w0 * 0.95], t1 = [t0[0] + Math.cos(ang) * w0 * 0.9 * tq, t0[1] + Math.sin(ang) * w0 * 0.9 * tq];
        tongue.setAttribute('d', tq > 0.05 ? `M${f1(t0[0])} ${f1(t0[1])} L${f1(t1[0])} ${f1(t1[1])} M${f1(t1[0])} ${f1(t1[1])} l${f1(Math.cos(ang + 0.5) * w0 * 0.3)} ${f1(Math.sin(ang + 0.5) * w0 * 0.3)} M${f1(t1[0])} ${f1(t1[1])} l${f1(Math.cos(ang - 0.5) * w0 * 0.3)} ${f1(Math.sin(ang - 0.5) * w0 * 0.3)}` : '');
        // Sword light: a red arc sweeping down across the cut
        const sq = o.cut !== undefined ? seg(t, o.cut - 0.12, o.cut + 0.08) : 0, sf = o.cut !== undefined ? 1 - seg(t, o.cut + 0.1, o.cut + 0.45) : 0;
        if (sq > 0 && sf > 0) { const c = raw(uc), r = F.px(170), a0 = -Math.PI * 0.85, a1 = a0 + Math.PI * 0.75 * sq, pts = Array.from({ length: 13 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / 12; return [c[0] - dir * F.px(40) + Math.cos(a) * r * dir, c[1] - F.px(10) + Math.sin(a) * r + r * 0.5]; }); slash.setAttribute('d', 'M' + pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join(' L')); slash.setAttribute('stroke-width', f1(F.px(12) * sf)); slash.setAttribute('opacity', sf.toFixed(3)); }
        else slash.setAttribute('d', '');
      } });
      if (o.cut !== undefined) { F.sfx(o.cut - 0.06, 'whoosh', 0.6, { dur: 0.25 }); F.sfx(o.cut, 'impact', 0.8); }
      return { el: L.el, head: () => [o.x + dir * len * 0.5, o.y] };
    };

    // ---------- Map (in shadow-puppet style: mountains, river, cities) ----------
    Y.map = (parent, o) => {
      const at0 = o.at ?? 0, until = o.until ?? 1e9, box = o.box ?? (PT ? { x: W * 0.06, y: H * 0.2, w: W * 0.88, h: H * 0.5 } : { x: W * 0.12, y: H * 0.14, w: W * 0.76, h: H * 0.7 });
      // The map is one big piece of carved hide too: natural hide as the base (a lace border), mountains green hide with mountain lines, the river blue hide with water lines, cities small city gates; light shows through like the figures (multiply)
      const wrap = el('div', `left:0;top:0;width:${f1(W)}px;height:${f1(H)}px;pointer-events:none;display:none;mix-blend-mode:multiply`, parent);
      const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: 'position:absolute;left:0;top:0' }, wrap);
      const X = (fx) => box.x + fx * box.w, Yy = (fy) => box.y + fy * box.h, u = F.px(1), pad = F.px(30);
      const hide = curve([[box.x - pad, box.y - pad], [box.x + box.w / 2, box.y - pad * 1.3], [box.x + box.w + pad, box.y - pad], [box.x + box.w + pad * 1.3, box.y + box.h / 2], [box.x + box.w + pad, box.y + box.h + pad], [box.x + box.w / 2, box.y + box.h + pad * 1.3], [box.x - pad, box.y + box.h + pad], [box.x - pad * 1.3, box.y + box.h / 2]], true, 10);
      piece(svg, hide, HIDE, (R) => CARVE.dots(R, curve(hide.map(([x, y]) => [x + (box.x + box.w / 2 - x) * 0.025, y + (box.y + box.h / 2 - y) * 0.04]), true, 2).concat([hide[0]]), { step: 16 * u, r: 3.4 * u, kind: 'rice' }), { m: 6 * u, alpha: 0.42, sw: 3 * u });
      (o.mountains ?? [[0.08, 0.62, 0.16], [0.22, 0.74, 0.12], [0.12, 0.3, 0.12]]).forEach(([mx, my, ms]) => piece(svg, curve([[X(mx - ms), Yy(my)], [X(mx - ms * 0.4), Yy(my - ms * 1.2)], [X(mx), Yy(my - ms * 0.6)], [X(mx + ms * 0.5), Yy(my - ms * 1.5)], [X(mx + ms), Yy(my)]]), Y.colors.green, (R, B) => CARVE.waves(R, B, { s: 30 * u, w: 2.4 * u }), { m: 7 * u, sw: 2.6 * u }));
      const rv = curve((o.river ?? [[0.02, 0.36], [0.2, 0.42], [0.38, 0.4], [0.56, 0.5], [0.74, 0.44], [0.98, 0.52]]).map(([rx, ry]) => [X(rx), Yy(ry)]), false, 10);
      piece(svg, strip(rv, 26 * u), Y.colors.blue, (R) => CARVE.dots(R, rv, { step: 14 * u, r: 3 * u, kind: 'rice' }), { m: 4 * u, alpha: 0.8, sw: 2.4 * u });
      const pins = {};
      for (const c of o.cities || []) {
        const cx = X(c.x), cy = Yy(c.y), g = sv('g', { transform: `translate(${f1(cx)} ${f1(cy)}) scale(${(u * 0.9).toFixed(3)})` }, svg);
        // Small city gate: wall + battlements, a gateway in the middle
        piece(g, [[-24, 0], [24, 0], [24, -26], [16, -26], [16, -34], [6, -34], [6, -26], [-6, -26], [-6, -34], [-16, -34], [-16, -26], [-24, -26]], Y.colors.ochre, () => ' M-7 0 L-7 -10 Q0 -20 7 -10 L7 0 Z', { m: 2, sw: 2.2 });
        pins[c.name] = [cx, cy];
        Y.placard(parent, { text: c.name, at: (c.at ?? at0) + 0.2, until, x: cx + (c.dx ?? 0) * F.px(1), y: cy + F.px(c.dy ?? 46), size: o.cityFont ?? (PT ? 34 : 36), swing: false, sfx: false });
      }
      F.add((t) => { const on = t >= at0 - 0.6 && t < until; set(wrap, { display: on ? '' : 'none' }); if (on) set(svg, { opacity: String((seg(t, at0 - 0.6, at0) * (until < 1e8 ? 1 - seg(t, until - 0.4, until) : 1)).toFixed(3)) }); });
      return { el: wrap, at: (name) => pins[name], X, Y: Yy, box };
    };
    // A marching route on the map: drawn bit by bit (ink line), a red dot at the end
    Y.route = (map, o) => {
      const pts = o.via.map((n) => (typeof n === 'string' ? map.at(n) : [map.X(n[0]), map.Y(n[1])])), until = o.until ?? 1e9;
      const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: 'position:absolute;left:0;top:0;pointer-events:none' }, map.el);
      const p = sv('path', { d: 'M' + pts.map((q) => `${f1(q[0])} ${f1(q[1] - F.px(12))}`).join(' L'), fill: 'none', stroke: o.color ? Y.colors[o.color] ?? o.color : Y.colors.red, 'stroke-width': F.px(9), 'stroke-dasharray': `${F.px(26)} ${F.px(14)}`, 'stroke-linecap': 'round' }, svg);
      F.prep(() => { const L = p.getTotalLength(); p._L = L; });
      F.add((t) => { const L = p._L ?? 1e4, q = seg(t, o.at - (o.dur ?? 1.6), o.at, E.cubicInOut); set(p, { strokeDashoffset: '0' }); p.style.clipPath = 'none'; p.setAttribute('stroke-dasharray', q >= 1 ? `${F.px(26)} ${F.px(14)}` : `${f1(L * q)} ${f1(L)}`); set(svg, { opacity: String(t < until ? 1 - (until < 1e8 ? seg(t, until - 0.4, until) : 0) : 0) }); });
      F.sfx(o.at - (o.dur ?? 1.6), 'drum', 0.5, { dur: o.dur ?? 1.6 });
      return { end: pts[pts.length - 1] };
    };

    // ---------- Text: red paper slips, large characters ----------
    // y = centre; with top: true y is the top edge (a row of slips hanging from one pole); after: another slip's el → hang gap below it (by its measured height);
    // over: a figure returned by Y.puppet → hang above their head (use this for names, so it doesn't cover the head)
    Y.placard = (parent, o) => {
      const size = F.px(o.size ?? (PT ? 50 : 58)), at0 = o.at, until = o.until ?? 1e9, vert = !!o.vertical;
      parent = parent._top ?? parent;
      const box = el('div', `left:0;top:0;padding:${vert ? `${f1(size * 0.4)}px ${f1(size * 0.22)}px` : `${f1(size * 0.18)}px ${f1(size * 0.45)}px`};background:${o.color ? Y.colors[o.color] ?? o.color : '#B5321F'};color:#F8E9C8;font:700 ${f1(size)}px/1.15 ${Y.font};white-space:${vert ? 'normal' : 'nowrap'};${vert ? `writing-mode:vertical-rl;letter-spacing:.12em;` : 'letter-spacing:.06em;'}box-shadow:0 ${f1(F.px(8))}px ${f1(F.px(18))}px rgba(30,10,4,.35);border:${f1(F.px(3))}px solid #3A140C;transform-origin:50% ${o.swing === false ? 50 : -60}%;display:none;z-index:${o.z ?? 30}`, parent);
      box.textContent = o.text;
      if (o.swing !== false) el('div', `left:50%;top:${f1(-F.px(70))}px;width:${f1(F.px(2))}px;height:${f1(F.px(70))}px;background:#2A170C`, box);   // hanging string
      F.text(box, o.kind ?? 'label', o.text, at0 - 0.35, until);
      // Size is measured once in prep (after fonts load): measured per frame, the first frame shown would measure 0
      F.prep(() => { const d = box.style.display; box.style.display = ''; box._w = box.offsetWidth; box._h = box.offsetHeight; box.style.display = d; box._y0 = o.after ? (o.after._y1 ?? 0) + (o.gap ?? F.px(24)) : o.top ? o.y : (o.y ?? H * 0.16) - box._h / 2; box._y1 = box._y0 + box._h; });
      F.add((t) => {
        const on = t >= at0 - 0.4 && t < until; set(box, { display: on ? '' : 'none' }); if (!on) return;
        const q = seg(t, at0 - 0.4, at0, E.backOut), sw = o.swing === false ? 0 : Math.sin((t - at0) * 6) * 5 * Math.exp(-Math.max(0, t - at0) * 2.2), out = until < 1e8 ? 1 - seg(t, until - 0.3, until) : 1;
        const w = box._w ?? box.offsetWidth, nw = o.over && o.over.now, x = (nw ? nw.x : o.x ?? W / 2) - (o.align === 'left' && !nw ? 0 : w / 2), y = nw ? Math.max(F.px(36), nw.top - F.px(26) - box._h) : box._y0;   /* over: a figure → hang above their head, following them */
        set(box, { transform: `translate(${f1(x)}px,${f1(y - (1 - q) * F.px(60))}px) rotate(${f1(sw)}deg)`, opacity: String((Math.min(1, q * 1.4) * out).toFixed(3)) });
      });
      if (o.sfx !== false) F.sfx(at0 - 0.1, 'wood', 0.35);
      return { el: box };
    };
    Y.title = (parent, o) => {
      const size = F.px(o.size ?? (PT ? 120 : 150)), at0 = o.at, until = o.until ?? 1e9;
      parent = parent._top ?? parent;
      // Given x: the line isn't centred; x is the centre of the text (align 'left' / 'right' = left / right edge); the figure stands on the other side
      const at = o.x !== undefined, dx = o.align === 'left' ? '0%' : o.align === 'right' ? '-100%' : '-50%';
      const box = el('div', `${at ? `left:${f1(o.x)}px;white-space:nowrap;transform-origin:${o.align === 'left' ? 'left' : o.align === 'right' ? 'right' : 'center'} center;` : `left:${f1(F.px(60))}px;right:${f1(F.px(60))}px;text-align:center;`}top:0;font:700 ${f1(size)}px/1.15 ${Y.font};color:#22140B;letter-spacing:.08em;display:none;z-index:30;text-shadow:0 0 ${f1(F.px(18))}px rgba(255,230,180,.35)`, parent);
      box.textContent = o.text; F.text(box, o.kind ?? 'slam', o.text, at0 - 0.5, until);
      F.add((t) => { const on = t >= at0 - 0.5 && t < until; set(box, { display: on ? '' : 'none' }); if (!on) return; const q = seg(t, at0 - 0.5, at0, E.cubicInOut), out = until < 1e8 ? 1 - seg(t, until - 0.4, until) : 1; set(box, { top: `${f1((o.y ?? H * 0.4) - size * 0.6)}px`, opacity: String((q * out).toFixed(3)), filter: q < 1 ? `blur(${f1((1 - q) * F.px(10))}px)` : 'none', transform: `${at ? `translateX(${dx}) ` : ''}scale(${(1.06 - 0.06 * q).toFixed(4)})` }); });
      if (o.sfx !== false) F.sfx(at0 - 0.05, 'gong', 0.6);
      return { el: box };
    };
    Y.endcard = (parent, o) => {
      Y.title(parent, { text: o.title, at: o.at + 0.5, y: H * (PT ? 0.4 : 0.42), size: PT ? 130 : 160, kind: 'logo' });
      if (o.sub) Y.placard(parent, { text: o.sub, at: o.at + 1.4, y: H * (PT ? 0.53 : 0.62), size: PT ? 44 : 46, kind: 'endcard', swing: false });
      // The seal is stamped only when seal (the characters to carve) is given; never carve the style name (皮影) onto it
      if (o.seal) {
        const seal = el('div', `left:0;top:0;width:${f1(F.px(110))}px;height:${f1(F.px(110))}px;background:#B5321F;border-radius:${f1(F.px(10))}px;color:#F8E9C8;font:700 ${f1(F.px(40))}px/1.1 ${Y.font};display:flex;align-items:center;justify-content:center;text-align:center;display:none;z-index:31`, parent);
        seal.textContent = o.seal; F.text(seal, 'endcard', seal.textContent, o.at + 2.2, 1e9, { overlap: true });
        F.add((t) => { const on = t >= o.at + 2.0; set(seal, { display: on ? 'flex' : 'none' }); if (!on) return; const q = seg(t, o.at + 2.0, o.at + 2.25, E.quartOut); set(seal, { transform: `translate(${f1(W * (PT ? 0.74 : 0.7))}px,${f1(H * (PT ? 0.3 : 0.26))}px) scale(${(1.6 - 0.6 * q).toFixed(3)}) rotate(-6deg)`, opacity: String(q.toFixed(3)) }); });
        F.sfx(o.at + 2.25, 'stamp', 0.6);
      }
    };
    return P.infoKit ? P.infoKit(Y, { puppet: 'character', prop: 'illustration', snake: 'character', leather: 'illustration', map: 'diagram', route: 'diagram' }) : Y;   // information-density check: info-telling components register automatically when called (promo.js's infoKit)
  };
})();
