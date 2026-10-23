// ink.js: runtime for ink-wash (水墨) explainer videos. No animation libraries: everything is painted on a canvas.
// The whole video is one long handscroll (手卷): the cover is the opening of the scroll, each chapter is a further section of it,
// and changing section pans the camera along the scroll. Every element is painted once into a cached bitmap; each frame only
// composites the bitmaps and reveals them by progress (brush writing, wash, stamp...), so render(t) stays a pure function of time.
(function () {
  const { clamp, lerp, ease, rng, progress, hashStr } = window.EV;
  const INK = '24,21,18', CINNABAR = '178,38,30', PAPER = 'rgb(237,227,205)', SKIN = 'rgb(238,226,204)', CLOTH = 'rgb(240,232,214)';
  const COLORS = { ink: INK, red: CINNABAR, gray: '110,102,92', light: '150,140,126', paper: '237,227,205' };
  const col = (c) => COLORS[c || 'ink'] || c;   // 'ink' | 'red' | 'gray' | 'r,g,b'
  // Fonts: local → CDN on demand (fonts.css) → fallbacks; a missing font never stops the render
  const FONTS = {
    kai: '"LXGW WenKai", "Kaiti SC", "STKaiti", "KaiTi", serif',                         // body text, captions, labels
    brush: '"Ma Shan Zheng", "LXGW WenKai", "Kaiti SC", "STKaiti", serif',               // 楷书 brush: titles, big words
    xing: '"Zhi Mang Xing", "Ma Shan Zheng", "LXGW WenKai", "Kaiti SC", serif',          // 行书: inscriptions, quotes
    cao: '"Liu Jian Mao Cao", "Zhi Mang Xing", "Ma Shan Zheng", "LXGW WenKai", serif',   // 草书: bold, dramatic moments
  };
  const NO_LINE_START = /[，。、：；！？）」』》】〉…—,.:;!?)\]}%]/;
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const noise1 = (seed) => {
    const r = rng(seed), v = Array.from({ length: 1024 }, r);
    return (x) => { const i = Math.floor(x), f = x - i, a = v[((i % 1024) + 1024) % 1024], b = v[(((i + 1) % 1024) + 1024) % 1024], u = f * f * (3 - 2 * f); return a + (b - a) * u; };
  };
  const unionBox = (bs) => { bs = bs.filter(Boolean); if (!bs.length) return null; const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y)); return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y }; };
  const boxOf = (t) => (t && t.box ? t.box : t);
  const inter = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

  // Catmull-Rom through the control points, resampled about every `step` px
  function spline(pts, step = 1.5) {
    if (pts.length < 2) return pts.slice();
    const P = [pts[0], ...pts, pts[pts.length - 1]], out = [];
    for (let i = 1; i < P.length - 2; i++) {
      const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
      const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const f = (j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  // ================= Painting primitives =================

  // Rice paper tile (seamless: blotches and fibres wrap around the edges); the vignette is added in screen space
  function paperTile(W, H, seed) {
    const cv = canvas(W, H), ctx = cv.getContext('2d'), r = rng(seed);
    ctx.fillStyle = '#EDE3CD'; ctx.fillRect(0, 0, W, H);
    const wrap = (x, y, rad, fn) => { for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) if (x + dx + rad > 0 && x + dx - rad < W && y + dy + rad > 0 && y + dy - rad < H) fn(x + dx, y + dy); };
    for (let i = 0; i < (W * H) / 8000; i++) {
      const x = r() * W, y = r() * H, rad = 80 + r() * 280, dark = r() < 0.5, a = dark ? 0.018 : 0.04;
      wrap(x, y, rad, (px, py) => { const g = ctx.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, dark ? `rgba(140,110,70,${a})` : `rgba(255,250,236,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2); });
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < (W * H) / 650; i++) {
      const x = r() * W, y = r() * H, len = 6 + r() * 46, a = r() * Math.PI * 2, c = (r() - 0.5) * 1.2;
      ctx.strokeStyle = r() < 0.72 ? `rgba(115,90,55,${0.04 + r() * 0.08})` : `rgba(255,252,242,${0.25 + r() * 0.3})`;
      ctx.lineWidth = 0.5 + r() * 0.9;
      wrap(x, y, len, (px, py) => { ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + Math.cos(a + c) * len / 2, py + Math.sin(a + c) * len / 2, px + Math.cos(a) * len, py + Math.sin(a) * len); ctx.stroke(); });
    }
    const img = ctx.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 9; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  // Brush stroke: every bristle carries its own ink and follows its own continuous path; where it runs dry the paper shows (飞白)
  // o: width, ink 0–1, dry 0–1, press (pressed-down start), taper, tail (end width), nail (钉头鼠尾 profile), color, seed, bleed, bleedPx
  function brush(ctx, pts, o = {}) {
    const W0 = o.width ?? 20, dry = o.dry ?? 0.3, ink = o.ink ?? 0.9, seed = o.seed ?? 1;
    const r = rng(seed), n = noise1(seed * 13 + 5);
    const path = spline(pts, Math.max(0.8, Math.min(1.5, W0 / 6))), N = path.length;
    if (N < 3) return;
    const end = N - 1;
    const xs = path.map((p) => p[0]), ys = path.map((p) => p[1]), pad = W0 + 8;
    const bx = Math.min(...xs) - pad, by = Math.min(...ys) - pad;
    const off = canvas(Math.max(...xs) - bx + pad, Math.max(...ys) - by + pad), c = off.getContext('2d');
    c.translate(-bx, -by); c.lineCap = 'butt'; c.lineJoin = 'round';
    const nx = [], ny = [];
    for (let i = 0; i < N; i++) {
      const a = path[Math.max(0, i - 3)], b = path[Math.min(N - 1, i + 3)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      nx.push(-dy / l); ny.push(dx / l);
    }
    const press = o.press ?? 0.1, taper = o.taper ?? 0.3, tail = o.tail ?? 0.15;
    const wAt = (s, i) => {
      let w = 1;
      if (o.nail) w = s < 0.04 ? 1.0 + 0.3 * Math.sin((s / 0.04) * Math.PI) : Math.max(tail, 1 - Math.pow((s - 0.04) / 0.96, 0.8) * (1 - tail));
      else {
        if (s < press) w = 0.6 + 0.4 * Math.sin((s / press) * Math.PI / 2);
        if (s > 1 - taper) w *= 1 - ((s - (1 - taper)) / taper) * (1 - tail);
      }
      return W0 * w * (1 + (n(i * 0.012) - 0.5) * (o.nail ? 0.25 : 0.3));
    };
    const color = col(o.color), nb = Math.max(5, Math.round(W0 / 1.2));
    for (let b = 0; b < nb; b++) {
      const u = (b / (nb - 1)) * 2 - 1 + (r() - 0.5) * (2 / nb);
      const load = 0.85 + r() * 0.4 - Math.abs(u) * 0.3, jit = r() * 400;
      c.lineWidth = Math.max(0.8, (W0 / nb) * 2.1 * (0.7 + r() * 0.6));
      c.strokeStyle = `rgba(${color},${Math.min(1, ink * (0.5 + r() * 0.4))})`;
      let on = false;
      c.beginPath();
      for (let k = 0; k <= end; k++) {
        const sk = k / (N - 1), lvl = load - sk * dry * 1.25 - Math.abs(u) * dry * 0.55 + (n(jit + k * 0.03) - 0.5) * dry * 1.3;
        if (lvl < 0.16) { on = false; continue; }
        const w = wAt(sk, k), px = path[k][0] + nx[k] * u * w / 2, py = path[k][1] + ny[k] * u * w / 2;
        if (on) c.lineTo(px, py); else { c.moveTo(px, py); on = true; }
      }
      c.stroke();
    }
    ctx.save(); ctx.globalAlpha = o.bleed ?? 0.35; ctx.filter = `blur(${o.bleedPx ?? 2}px)`; ctx.drawImage(off, bx, by); ctx.restore();
    ctx.drawImage(off, bx, by);
    return path;
  }

  // Soft wash inside a closed shape: pale base, wet blotches where shadow gathers, darker wet edge.
  // o.tone 0–1; o.shade: [[x, y, radius, strength]] extra blotches; o.paper: underpainting colour (hides what is behind), false = none
  function washPoly(ctx, poly, o = {}) {
    const tone = o.tone ?? 0.5, color = col(o.color), r = rng(o.seed ?? 1);
    const sm = o.smooth === false ? poly : spline([...poly, poly[0], poly[1]], 3).slice(0, -1);
    const xs = sm.map((p) => p[0]), ys = sm.map((p) => p[1]), pad = 30;
    const bx = Math.min(...xs) - pad, by = Math.min(...ys) - pad, bw = Math.max(...xs) - bx + pad, bh = Math.max(...ys) - by + pad;
    const off = canvas(bw, bh), c = off.getContext('2d');
    c.translate(-bx, -by);
    const path = () => { c.beginPath(); sm.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); };
    if (o.paper !== false) { path(); c.fillStyle = o.paper ?? CLOTH; c.fill(); }
    c.save(); path(); c.clip();
    c.fillStyle = `rgba(${color},${tone * 0.3})`; c.fill();
    const blots = [...(o.shade || [])];
    for (let i = 0; i < (o.blots ?? 5); i++) blots.push([bx + pad + r() * (bw - 2 * pad), by + pad + r() * (bh - 2 * pad), Math.min(bw, bh) * (0.25 + r() * 0.35), 0.5 + r() * 0.5]);
    c.filter = `blur(${Math.max(2, Math.min(bw, bh) * 0.04)}px)`;
    for (const [x, y, rad, k] of blots) { const g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, `rgba(${color},${tone * 0.45 * k})`); g.addColorStop(1, `rgba(${color},0)`); c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    c.restore();
    c.save(); path(); c.clip(); c.strokeStyle = `rgba(${color},${tone * 0.5})`; c.lineWidth = 6; c.filter = 'blur(2px)'; path(); c.stroke(); c.restore();
    ctx.drawImage(off, bx, by);
  }

  // Mountains: dark ridge-following band, misty feet, broken contours, dry slope rubs (皴擦), clustered moss dots (苔点)
  // o: x0, x1, base, peaks [{x, w, h}], tone, blur, rough, band, ridge (contour width, 0 = none), contour (share outlined), texture, moss, fade, seed
  function paintMountains(ctx, o, layer = 'all') {
    const seed = o.seed ?? 5, n = noise1(seed), r = rng(seed + 1), tone = o.tone ?? 0.5, pts = [];
    const peaks = [];
    for (const p of o.peaks) {
      const skew = 0.65 + r() * 0.7;
      peaks.push({ x: p.x, h: p.h, wl: p.w * skew, wr: p.w / skew });
      for (let k = 0; k < 2; k++) { const side = r() < 0.5 ? -1 : 1; peaks.push({ x: p.x + side * p.w * (0.35 + r() * 0.5), h: p.h * (0.45 + r() * 0.3), wl: p.w * (0.3 + r() * 0.3), wr: p.w * (0.3 + r() * 0.3) }); }
    }
    const fade = o.fade ?? 160, rough = o.rough ?? 30;
    for (let x = o.x0; x <= o.x1; x += 5) {
      let y = 0;
      for (const p of peaks) { const d = (x - p.x) / (x < p.x ? p.wl : p.wr); y = Math.max(y, p.h * Math.exp(-d * d * 2.4)); }
      y += (n(x * 0.011) - 0.5) * rough + (n(x * 0.045 + 99) - 0.5) * rough * 0.4;
      const e = Math.min(1, (x - o.x0) / fade, (o.x1 - x) / fade);
      pts.push([x, o.base - Math.max(0, y) * (e * e * (3 - 2 * e))]);
    }
    const top = Math.min(...pts.map((p) => p[1]));
    const bx = o.x0 - 60, by = top - 60, off = canvas(o.x1 - o.x0 + 120, o.base - top + 120), c = off.getContext('2d');
    c.translate(-bx, -by);
    const body = () => { c.beginPath(); c.moveTo(o.x0, o.base + 2); pts.forEach((p) => c.lineTo(p[0], p[1])); c.lineTo(o.x1, o.base + 2); c.closePath(); };
    body();
    const g = c.createLinearGradient(0, top, 0, o.base);
    g.addColorStop(0, `rgba(${INK},${tone * 0.55})`); g.addColorStop(0.6, `rgba(${INK},${tone * 0.2})`); g.addColorStop(1, `rgba(${INK},0)`);
    c.fillStyle = g; c.fill();
    const band = o.band ?? 70;
    c.save(); body(); c.clip(); c.filter = `blur(${band * 0.45}px)`; c.lineJoin = 'round';
    c.strokeStyle = `rgba(${INK},${tone * 0.75})`; c.lineWidth = band;
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1] + band * 0.35) : c.moveTo(p[0], p[1] + band * 0.35))); c.stroke();
    c.restore();
    for (let k = 0; k < (o.texture ?? 30); k++) {
      const i = 2 + Math.floor(r() * (pts.length - 4)), p = pts[i], q = pts[i + 2], slope = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const len = 30 + r() * Math.min(160, (o.base - p[1]) * 0.5), ang = Math.PI / 2 + (slope > 0 ? -0.55 : 0.55) * Math.min(1, Math.abs(slope) * 2);
      brush(c, [[p[0], p[1] + 4], [p[0] + Math.cos(ang) * len * 0.5, p[1] + 4 + Math.sin(ang) * len * 0.5], [p[0] + Math.cos(ang) * len, p[1] + 4 + Math.sin(ang) * len]], { width: 6 + r() * 10, ink: tone * 0.55, dry: 0.85, seed: k + 300 + seed * 7, bleed: 0.15, taper: 0.6 });
    }
    if (layer !== 'lines') { ctx.save(); if (o.blur) ctx.filter = `blur(${o.blur}px)`; ctx.drawImage(off, bx, by); ctx.restore(); }
    if (layer === 'wash') return { pts, box: { x: o.x0, y: top - 20, w: o.x1 - o.x0, h: o.base - top + 20 } };
    if (o.ridge) {
      const ridge = pts.filter((_, i) => i % 6 === 0), rr = rng(seed + 21);
      for (let i = 0; i < ridge.length - 3;) {
        const len = 6 + Math.floor(rr() * 18), seg = ridge.slice(i, i + len);
        if (seg.length > 2 && rr() < (o.contour ?? 0.7)) brush(ctx, seg, { width: o.ridge * (0.6 + rr() * 0.6), ink: Math.min(1, tone * 1.15), dry: 0.55, press: 0.15, taper: 0.4, tail: 0.2, seed: seed * 31 + i, bleed: 0.3 });
        i += len + Math.floor(rr() * 3);
      }
    }
    if (o.moss) {
      const tops = pts.filter((p) => p[1] < o.base - (o.base - top) * 0.45);
      for (let k = 0; k < o.moss; k++) {
        const p = tops[Math.floor(r() * tops.length)] || pts[0], cnt = 2 + Math.floor(r() * 3);
        for (let j = 0; j < cnt; j++) {
          const rr = 1.4 + r() * 2.6;
          ctx.fillStyle = `rgba(${INK},${Math.min(1, tone * (0.6 + r() * 0.6))})`;
          ctx.beginPath(); ctx.ellipse(p[0] + (r() - 0.5) * 16, p[1] + 3 + r() * 12, rr * 1.4, rr, r() * 3, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    return { pts, box: { x: o.x0, y: top - 20, w: o.x1 - o.x0, h: o.base - top + 20 } };
  }

  // 烘云托月: wash the sky round the moon and leave the moon itself as bare paper
  function paintMoon(ctx, o) {
    const r = rng(o.seed ?? 'sky'), R = o.r * (o.spread ?? 6), tone = o.tone ?? 0.24;
    const off = canvas(R * 2.8, R * 1.6), c = off.getContext('2d'), ox = o.x - R * 1.4, oy = o.y - R * 0.8;
    c.translate(-ox, -oy);
    const g = c.createRadialGradient(o.x, o.y, o.r, o.x, o.y, R);
    g.addColorStop(0, `rgba(${INK},${tone})`); g.addColorStop(0.45, `rgba(${INK},${tone * 0.45})`); g.addColorStop(1, `rgba(${INK},0)`);
    c.save(); c.scale(1.3, 0.7); c.translate(o.x / 1.3 - o.x, o.y / 0.7 - o.y); c.fillStyle = g; c.fillRect(o.x - R, o.y - R, R * 2, R * 2); c.restore();
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, d = o.r * 1.4 + Math.pow(r(), 1.6) * (R - o.r * 1.4) * 0.8;
      const x = o.x + Math.cos(a) * d * 1.3, y = o.y + Math.sin(a) * d * 0.7, rad = 60 + r() * 200 * (1 - d / R + 0.3);
      const gg = c.createRadialGradient(x, y, 0, x, y, rad);
      gg.addColorStop(0, `rgba(${INK},${(0.03 + r() * 0.05) * (1 - d / R)})`); gg.addColorStop(1, `rgba(${INK},0)`);
      c.fillStyle = gg; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    c.globalCompositeOperation = 'destination-out';
    const m = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 1.9);
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.5, 'rgba(0,0,0,1)'); m.addColorStop(0.56, 'rgba(0,0,0,0.55)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = m; c.fillRect(o.x - o.r * 2, o.y - o.r * 2, o.r * 4, o.r * 4);
    ctx.save(); ctx.filter = 'blur(3px)'; ctx.drawImage(off, ox, oy); ctx.restore();
    return { x: ox, y: oy, w: R * 2.8, h: R * 1.6 };
  }

  // 墨晕: a drop of ink spreading on paper (p 0–1); pigment collects at the edge
  function paintBlot(ctx, cx, cy, R, p, o = {}) {
    if (p <= 0) return;
    const n = noise1(o.seed ?? 9), rad = R * Math.pow(p, 0.55), dens = (1 - p * 0.3) * (o.ink ?? 1), color = col(o.color);
    const shape = (s) => { const pts = []; for (let a = 0; a < 360; a += 2) { const t = (a * Math.PI) / 180, k = 1 + (n(a * 0.045) - 0.5) * 0.38 + (n(a * 0.21 + 40) - 0.5) * 0.12; pts.push([cx + Math.cos(t) * rad * k * s, cy + Math.sin(t) * rad * k * s]); } return pts; };
    const poly = (pts) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); };
    for (const [s, a, bl] of [[1.0, 0.2, 0.02], [0.85, 0.28, 0.07], [0.6, 0.32, 0.12], [0.35, 0.3, 0.15]]) { ctx.save(); ctx.filter = `blur(${rad * bl + 0.8}px)`; ctx.fillStyle = `rgba(${color},${a * dens})`; poly(shape(s)); ctx.fill(); ctx.restore(); }
    ctx.save(); ctx.filter = 'blur(1.4px)'; ctx.strokeStyle = `rgba(${color},${0.28 * dens})`; ctx.lineWidth = 3; poly(shape(1)); ctx.stroke(); ctx.restore();
    const r = rng((o.seed ?? 9) + 5), edge = shape(1);
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 260; i++) {
      const q = edge[Math.floor(r() * edge.length)], dx = q[0] - cx, dy = q[1] - cy, l = Math.hypot(dx, dy) || 1, len = 3 + r() * 14 * p;
      ctx.strokeStyle = `rgba(${color},${(0.06 + r() * 0.1) * Math.min(1, dens * 1.4)})`;
      ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + (dx / l) * len + (r() - 0.5) * 4, q[1] + (dy / l) * len + (r() - 0.5) * 4); ctx.stroke();
    }
  }

  // Seal (印章): white characters cut out of cinnabar (阴文), or red characters on paper (阳文, o.yang), worn edges
  function paintSeal(ctx, text, x, y, size, o = {}) {
    const off = canvas(size, size), c = off.getContext('2d'), r = rng(o.seed ?? hashStr(text)), chars = [...text];
    const red = `rgb(${CINNABAR})`;
    c.font = `${size * (chars.length > 1 ? 0.42 : 0.7)}px ${FONTS.brush}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const pos = chars.length === 4 ? [[0.72, 0.29], [0.72, 0.71], [0.28, 0.29], [0.28, 0.71]] : chars.length === 3 ? [[0.72, 0.5], [0.28, 0.29], [0.28, 0.71]] : chars.length === 2 ? [[0.5, 0.29], [0.5, 0.71]] : [[0.5, 0.52]];
    if (o.yang) {
      c.strokeStyle = red; c.lineWidth = size * 0.06; c.strokeRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88);
      c.fillStyle = red; chars.forEach((ch, i) => c.fillText(ch, pos[i][0] * size, pos[i][1] * size + size * 0.02));
    } else {
      c.fillStyle = red; c.fillRect(size * 0.03, size * 0.03, size * 0.94, size * 0.94);
      c.globalCompositeOperation = 'destination-out';
      chars.forEach((ch, i) => c.fillText(ch, pos[i][0] * size, pos[i][1] * size + size * 0.02));
    }
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < size * 1.6; i++) { c.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.7})`; c.beginPath(); c.arc(r() * size, r() * size, r() * size * 0.012 + 0.4, 0, 7); c.fill(); }
    for (let i = 0; i < 40; i++) { const e = r() < 0.5, s = r() * size; c.beginPath(); c.arc(e ? (r() < 0.5 ? size * 0.03 : size * 0.97) : s, e ? s : (r() < 0.5 ? size * 0.03 : size * 0.97), r() * size * 0.03, 0, 7); c.fill(); }
    ctx.save(); ctx.globalAlpha = o.alpha ?? 0.92; ctx.filter = 'url(#ink-rough)'; ctx.drawImage(off, x, y); ctx.restore();
  }

  // Ink texture for drawn glyphs (already on ctx inside box): uneven absorption, a few dry streaks
  function glyphTexture(c, box, size, dry, seed) {
    const r = rng(seed);
    c.save(); c.globalCompositeOperation = 'destination-out';
    const area = box.w * box.h;
    for (let i = 0; i < area / 90; i++) {
      const sx = box.x + r() * box.w, sy = box.y + r() * box.h, len = 3 + r() * size * 0.05, a = r() * Math.PI;
      c.strokeStyle = `rgba(0,0,0,${0.04 + r() * 0.12})`; c.lineWidth = 0.6 + r() * 1.2;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len); c.stroke();
    }
    for (let i = 0; i < (area / 1400) * dry; i++) {
      const sx = box.x + r() * box.w, sy = box.y + r() * box.h, len = size * (0.04 + r() * 0.12), a = (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.6;
      c.strokeStyle = `rgba(0,0,0,${0.12 + r() * 0.3})`; c.lineWidth = 0.6 + r() * size * 0.008;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len); c.stroke();
    }
    c.restore();
  }

  // ================= Ink figures (写意人物) =================
  // One parametric drawing for every person: line + light wash, 钉头鼠尾 outlines, hanging sleeves, a classical-painting face.
  // Painted in three layers so expressions / talking only repaint the head: 'back' (far sleeve, robe, shoes), 'head', 'front' (near sleeve, hands, prop).
  const POSES = {   // joints in head-heights for a figure facing right; origin between the feet, up = negative y
    stand:    { lean: 0, near: [[1.12, -4.7], [1.0, -3.75]], far: [[-1.05, -4.7], [-0.92, -3.75]], feet: [0.3, -0.3] },
    gongshou: { lean: 0.02, near: [[1.28, -4.6], [0.35, -4.75]], far: [[-1.12, -4.55], [0.12, -4.8]], feet: [0.3, -0.3], hands: 'joined' },
    point:    { lean: 0.03, near: [[1.85, -5.45], [2.75, -5.85]], far: [[-1.05, -4.7], [-0.92, -3.75]], feet: [0.35, -0.3], hands: 'point' },
    present:  { lean: 0.02, near: [[1.55, -4.85], [2.35, -4.95]], far: [[-1.05, -4.7], [-0.92, -3.75]], feet: [0.3, -0.3], hands: 'open' },
    walk:     { lean: 0.07, near: [[1.2, -4.75], [1.5, -3.9]], far: [[-1.15, -4.75], [-1.5, -3.95]], feet: [0.8, -0.7] },
    run:      { lean: 0.22, near: [[1.75, -5.3], [2.65, -5.6]], far: [[-1.4, -5.0], [-2.05, -4.5]], feet: [1.2, -1.15], back: -0.35, hands: 'reach', wind: 0.8 },
    think:    { lean: 0, near: [[1.3, -4.65], [0.45, -6.1]], far: [[-1.0, -4.5], [0.3, -4.45]], feet: [0.3, -0.3] },
    bow:      { lean: 0.32, near: [[1.3, -4.5], [0.4, -4.6]], far: [[-1.1, -4.45], [0.15, -4.65]], feet: [0.3, -0.3], hands: 'joined' },
  };
  // Gait cycles: a pose for each phase of the step (0–1). The phase comes from the distance travelled, so feet don't slide.
  const GAITS = {
    walk: { stride: 2.5, pose: (ph) => { const a = 2 * Math.PI * ph, s = Math.sin(a), c = Math.cos(a); return { lean: 0.07, near: [[1.15 - 0.12 * s, -4.72], [1.25 - 0.4 * s, -3.88]], far: [[-1.1 + 0.12 * s, -4.72], [-1.2 + 0.4 * s, -3.92]], feet: [0.62 * s, -0.62 * s], feetY: [-Math.max(0, c) * 0.14, -Math.max(0, -c) * 0.14], wind: 0.22 + 0.12 * c, bob: Math.abs(c) * 0.06 }; } },
    run: { stride: 4.6, pose: (ph) => { const a = 2 * Math.PI * ph, s = Math.sin(a), c = Math.cos(a); return { lean: 0.2, near: [[1.6 + 0.2 * s, -5.2 + 0.1 * s], [2.4 + 0.35 * s, -5.4 + 0.15 * s]], far: [[-1.35 - 0.2 * s, -5.0], [-2.0 - 0.3 * s, -4.55]], feet: [1.15 * s, -1.15 * s], feetY: [-Math.max(0, c) * 0.45, -Math.max(0, -c) * 0.45], hands: 'reach', wind: 0.8 + 0.15 * c, bob: Math.abs(c) * 0.15 }; } },
    ride: { stride: 0, pose: (ph) => { const a = 2 * Math.PI * ph, s = Math.sin(a), c = Math.cos(a); return { lean: 0.16 + 0.03 * s, near: [[1.45, -4.75 + 0.05 * s], [2.1, -4.55 + 0.08 * s]], far: [[-0.55, -4.7], [1.8, -4.6 + 0.08 * s]], feet: [0.3, -0.3], ride: true, wind: 0.85 + 0.1 * c }; } },
  };
  const FACES = {
    neutral:  { brow: 0, eye: 'line', mouth: 0 },
    smile:    { brow: 0.1, eye: 'arc', mouth: 0.8 },
    happy:    { brow: 0.2, eye: 'arc', mouth: 1, open: 0.5 },
    worried:  { brow: -0.7, eye: 'line', mouth: -0.5 },
    sad:      { brow: -0.9, eye: 'line', mouth: -0.8, lid: 0.4 },
    angry:    { brow: 1.6, eye: 'line', mouth: -0.8 },
    surprise: { brow: 0.5, eye: 'round', mouth: 0, open: 0.8, lift: 0.05 },
    think:    { brow: 0.3, eye: 'side', mouth: -0.2 },
    serious:  { brow: 0.6, eye: 'line', mouth: -0.25 },
    closed:   { brow: 0, eye: 'shut', mouth: 0 },
  };
  const FIG_DEFAULT = { sex: 'male', age: 'adult', hat: 'none', beard: 'none', outfit: 'robe', tone: 0.4, accent: 'sash', prop: 'none' };
  const figSpec = (spec) => {
    const S = { ...FIG_DEFAULT, ...(spec.sex === 'female' ? { hat: 'bun', outfit: 'dress' } : {}), ...spec };
    if (S.sex === 'female') S.beard = 'none';
    return S;
  };
  // A child: the body below the neck is shorter (KID_BODY), the head bigger (KID_HEAD) — about 3.5 heads tall instead of 7.4
  const KID_BODY = 0.7, KID_HEAD = 1.3, NECK = -6.05;
  const kidMap = (p) => {
    if (p[1] >= NECK) return [p[0], p[1] * KID_BODY];
    const u = Math.min(1, (NECK - p[1]) / 0.3), s = 1 + (KID_HEAD - 1) * u * u * (3 - 2 * u);
    return [0.05 + (p[0] - 0.05) * s, NECK * KID_BODY + (p[1] - NECK) * KID_HEAD];
  };
  // Geometry of a figure: body space → canvas, plus the parameters every layer needs
  function figureFrame(spec, o) {
    const S = figSpec(spec);
    const P = typeof o.pose === 'object' ? o.pose : POSES[o.pose || 'stand'];
    if (!P) throw new Error(`Unknown pose: "${o.pose}". Available: ${Object.keys(POSES).join(', ')}`);
    const kid = S.age === 'kid', kb = kid ? KID_BODY : 1;
    const f = o.facing ?? 1, h = (o.size ?? 600) / 7.4, X0 = o.x ?? EV.W / 2, Y0 = o.y ?? EV.H * 0.926, lean = P.lean, hip = [0, -3.6 * kb];
    const L = (p) => {
      const a = lean * (p[1] < hip[1] ? 1 : Math.max(0, 1 - (p[1] - hip[1]) / (3.3 * kb)) * 0.35), dx = p[0] - hip[0], dy = p[1] - hip[1];
      return [hip[0] + dx * Math.cos(a) - dy * Math.sin(a), hip[1] + dx * Math.sin(a) + dy * Math.cos(a)];
    };
    // mirror = false: p is in viewer space (the 右衽 collar must not flip with the figure)
    const T = (p, mirror = true) => { let q = mirror ? p : [p[0] * f, p[1]]; if (kid) q = kidMap(q); q = L(q); return [X0 + q[0] * f * h, Y0 + q[1] * h]; };
    return { S, P, f, h, X0, Y0, T, kid, wind: o.wind ?? P.wind ?? 0 };
  }
  // Bounding boxes (canvas coords) of the whole figure and of its head
  function figureBoxes(spec, o) {
    const G = figureFrame(spec, o), { T, h } = G;
    const body = [[-2.4, -8.1], [3.2, -8.1], [3.2, 0.3], [-2.4, 0.3], [-1.3, -6.0], [2.9, -6.0]].map((p) => T(p));
    const head = [[-1.35, -8.0], [0.75, -8.0], [0.75, -5.05], [-1.35, -5.05]].map((p) => T(p));
    const bb = (ps, pad) => { const xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]); return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 }; };
    return { body: bb(body, h * 0.2), head: bb(head, h * 0.15), feet: T([0, 0]) };
  }
  function paintFigure(ctx, spec, o, layer = 'all') {
    const G = figureFrame(spec, o), { S, P, f, h, T, wind } = G;
    const F = FACES[o.expr || 'neutral'] || FACES.neutral, seed = o.seed ?? 7, old = S.age === 'elder', modern = S.outfit === 'modern';
    const want = (l) => layer === 'all' || layer === l;
    const rFold = rng(seed + 1), rBeard = rng(seed + 2);
    const TL = (pts, mirror) => pts.map((p) => T(p, mirror));
    // stroke seeds follow the drawing order within a layer, so a figure keeps its brush texture from pose to pose (no boiling in a walk cycle)
    let sn = 0;
    const sOf = () => (seed * 2654435761 + (++sn) * 7919) >>> 0;
    // o.rec: collect every line (path + width) for the "drawn line by line" entrance; o.noWash: lines only, no washes or fills
    const rec = o.rec, keep = (path, w) => { if (rec && path) rec.push({ path, w }); };
    const wash = (poly, o2) => { if (!o.noWash) washPoly(ctx, poly, o2); };
    // a painter doesn't thicken the line for a close-up: widths stop growing past about 6 px per 0.05 head
    const line = (pts, w, o2 = {}) => { const wd = Math.min(h * w * 1.15, w * 150); keep(brush(ctx, TL(pts, o2.mirror), { width: wd, ink: 0.88, dry: 0.4, press: 0.12, taper: 0.55, tail: 0.18, nail: true, ...o2, seed: o2.seed ?? sOf() }), wd); };
    const fw = (k = 1) => Math.max(1.3, Math.min(h * 0.018, 4.2)) * k;
    const fine = (pts, k = 1, o2 = {}) => keep(brush(ctx, TL(pts, o2.mirror), { width: fw(k), ink: 0.8, dry: 0.12, press: 0.15, taper: 0.35, tail: 0.35, bleed: 0.25, bleedPx: 1.2, ...o2, seed: o2.seed ?? sOf() }), fw(k));
    const fill = (fn) => { if (!o.noWash) fn(); };
    const back = P.back ?? 0, fy = P.feetY || [0, 0], feet = [[P.feet[0], fy[0]], [P.feet[1], fy[1] + back * 0.6]];
    const sway = (feet[0][0] - feet[1][0]) * 0.22;   // the hem follows the leg that steps forward
    const dress = S.outfit === 'dress', dw = dress ? -0.42 : 0;   // a dress: high waist, a wide hem that hides the feet and trails behind
    const hemL = Math.min(feet[0][0], feet[1][0]) - 0.75 - wind * 0.6 + sway - (dress ? 0.45 : 0), hemR = Math.max(feet[0][0], feet[1][0]) + 0.7 + sway + (dress ? 0.2 : 0), hemY = dress ? 0.07 : 0;
    const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
    const grav = [-wind * 0.8, 1 - wind * 0.4];
    const big = h > 110;

    // sleeve: a hanging bag — narrow at the shoulder, sagging under the forearm, opening at the wrist
    const sleeve = (arm, tone) => {
      const Sh = arm === 'near' ? [0.92, -5.7] : [-0.88, -5.7], [E, W] = P[arm];
      const d = [W[0] - Sh[0], W[1] - Sh[1]], len = Math.hypot(d[0], d[1]) || 1;
      let n = [d[1] / len, -d[0] / len];
      if (n[1] > 0.25 || (Math.abs(n[1]) <= 0.25 && n[0] * Math.sign(Sh[0]) < 0)) n = [-n[0], -n[1]];
      if (modern) {
        const up = [add(Sh, n, 0.2), add(E, n, 0.19), add(W, n, 0.13)], low = [add(W, n, -0.13), add(E, n, -0.19), add(add(Sh, n, -0.2), [0, 0.3])];
        wash(TL([...up, ...low]), { tone: tone * 0.8, blots: 1, seed: sOf() });
        line(up, 0.05, { ink: 0.8 }); line(low.slice(0, 2), 0.05, { ink: 0.8 });
        return W;
      }
      const hang = Math.abs(n[0]);
      const drop = 0.95 * (1 - hang * 0.55), mid = [E[0] * 0.45 + W[0] * 0.55, E[1] * 0.45 + W[1] * 0.55];
      const outer = [add(Sh, n, 0.16), add(E, n, 0.2), add(add(W, n, 0.24 - hang * 0.04), [0, hang * 0.28])];
      const cuffLow = add(add(add(W, n, -0.32 - hang * 0.3), grav, drop * 0.5), [0, hang * 0.38]), sag = add(add(mid, n, -0.3), grav, drop), elbowLow = add(add(E, n, -0.28), grav, drop * 0.45), pit = add(add(Sh, n, -0.22), [0, 0.35]);
      wash(TL([...outer, cuffLow, sag, elbowLow, pit]), { tone, blots: 2, shade: [[...T(sag), h * 0.6, 1]], seed: sOf() });
      line([pit, elbowLow, sag, cuffLow], 0.075, { press: 0.06, taper: 0.5 });
      line(outer, 0.05, { ink: 0.75, dry: 0.55, taper: 0.6 });
      line([cuffLow, add(W, n, -0.05), outer[2]], 0.045, { ink: 0.8, press: 0.2 });
      if (big) for (let k = 0; k < 3; k++) {
        const t = 0.25 + k * 0.22, a1 = [Sh[0] + (W[0] - Sh[0]) * t, Sh[1] + (W[1] - Sh[1]) * t];
        line([add(a1, n, 0.16), add(add(a1, n, -0.05), grav, 0.15), add(add(a1, n, -0.18), grav, drop * (0.25 + t * 0.5))], 0.035, { ink: 0.5, dry: 0.5 });
      }
      return W;
    };
    const hand = (W, kind) => {
      const c = T(W), rr = h * 0.085;
      fill(() => { ctx.save(); ctx.fillStyle = SKIN; ctx.beginPath(); ctx.ellipse(c[0], c[1], rr, rr * 0.75, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
      line([[W[0] - 0.1, W[1] - 0.02], [W[0] + 0.02, W[1] + 0.08], [W[0] + 0.11, W[1]]], 0.03, { ink: 0.6, press: 0.3 });
      if (kind === 'point') line([[W[0] + 0.06, W[1] - 0.02], [W[0] + 0.32, W[1] - 0.14]], 0.04, { ink: 0.7, taper: 0.7 });
      if (kind === 'open') line([[W[0] + 0.05, W[1] - 0.06], [W[0] + 0.25, W[1] - 0.1], [W[0] + 0.32, W[1] - 0.04]], 0.035, { ink: 0.6, taper: 0.6 });
    };

    // ---------- back layer ----------
    if (want('back')) {
      const farW = sleeve('far', S.tone * 0.75);
      if (P.hands !== 'joined') hand(farW, 'plain');
      if (modern) {
        feet.forEach((ft, i) => {
          const s = i ? -1 : 1, top = [s * 0.42, -3.45];
          wash(TL([add(top, [-0.3, 0]), add(top, [0.33, 0]), [ft[0] + 0.2, ft[1] - 0.25], [ft[0] - 0.2, ft[1] - 0.25]]), { tone: Math.min(1, S.tone + 0.35), blots: 2, seed: seed + 20 + i });
          line([add(top, [s * 0.33, 0]), [ft[0] + s * 0.2, ft[1] - 0.25]], 0.05, { ink: 0.8 });
        });
        const shirt = [[-0.28, -6.02], [-0.85, -5.85], [-1.0, -5.55], [-0.92, -4.6], [-0.86, -3.4], [0.86, -3.4], [0.92, -4.6], [1.0, -5.55], [0.85, -5.85], [0.28, -6.02]];
        wash(TL(shirt), { tone: S.tone * 0.6, blots: 3, shade: [[...T([-0.6, -4.2]), h * 0.8, 1]], seed: seed + 22 });
        line([[-0.3, -6.0], [-0.62, -5.92], [-0.88, -5.78], [-1.0, -5.5]], 0.06, { taper: 0.4 });
        line([[0.3, -6.0], [0.62, -5.92], [0.88, -5.78], [1.0, -5.5]], 0.06, { taper: 0.4 });
        line([[-1.0, -5.5], [-0.92, -4.6], [-0.86, -3.45]], 0.06);
        line([[1.0, -5.5], [0.92, -4.6], [0.86, -3.45]], 0.06);
        line([[-0.86, -3.42], [0.86, -3.42]], 0.05, { ink: 0.7, dry: 0.6 });
        line([[-0.28, -6.0], [0, -5.6], [0.28, -6.0]], 0.045, { mirror: false });
      } else {
        const midL = [(-0.8 + hemL) / 2 - 0.12, -2.1], midR = [(0.8 + hemR) / 2 + 0.1, -2.1];
        let robe;
        if (P.ride) {
          wash(TL([[0.2, -3.35], [0.75, -3.05], [1.08, -2.35], [0.88, -1.55], [0.55, -1.6], [0.6, -2.3], [0.15, -2.85]]), { tone: S.tone * 0.9, blots: 1, seed: seed + 31 });
          line([[0.62, -3.0], [1.08, -2.35], [0.88, -1.62]], 0.06);
          line([[0.66, -1.56], [1.18, -1.5]], 0.14, { ink: 0.95, nail: false, dry: 0.15 });
          robe = [[-0.28, -6.02], [-0.82, -5.85], [-1.0, -5.55], [-0.9, -4.95], [-0.8, -4.05], [-1.3 - wind * 0.5, -3.0], [-0.95 - wind * 0.3, -2.62], [-0.2, -2.7], [0.6, -2.9], [0.95, -3.25], [0.8, -4.05], [0.9, -4.95], [1.0, -5.55], [0.82, -5.85], [0.28, -6.02]];
        } else robe = [[-0.28, -6.02], [-0.82, -5.85], [-1.0, -5.55], [-0.9, -4.95], [-0.8 + (dress ? 0.08 : 0), -4.05 + dw], midL, [hemL, -0.2 + back * 0.4 + hemY], [(hemL + hemR) / 2, -0.04 + hemY], [hemR, -0.2 + hemY * 0.8], midR, [0.8 - (dress ? 0.08 : 0), -4.05 + dw], [0.9, -4.95], [1.0, -5.55], [0.82, -5.85], [0.28, -6.02]];
        wash(TL(robe), { tone: S.tone, blots: 4, shade: [[...T([-0.5, -2.2]), h * 1.1, 1], [...T([0.3, -4.6]), h * 0.6, 0.7]], seed: seed + 30 });
        line([[-0.3, -6.0], [-0.62, -5.92], [-0.88, -5.78], [-1.0, -5.5]], 0.07, { taper: 0.4 });
        line([[0.3, -6.0], [0.62, -5.92], [0.88, -5.78], [1.0, -5.5]], 0.07, { taper: 0.4 });
        line([[-1.0, -5.5], [-0.9, -4.9], [-0.8 + (dress ? 0.08 : 0), -4.08 + dw]], 0.075);
        line([[1.0, -5.5], [0.9, -4.9], [0.8 - (dress ? 0.08 : 0), -4.08 + dw]], 0.075);
        if (P.ride) {
          line([[-0.8, -3.95], [-1.3 - wind * 0.5, -3.0], [-0.95 - wind * 0.3, -2.62]], 0.07, { taper: 0.45 });
          line([[0.8, -3.95], [0.95, -3.25], [0.6, -2.9]], 0.07, { taper: 0.45 });
          line([[-0.95 - wind * 0.3, -2.64], [-0.2, -2.72], [0.6, -2.9]], 0.05, { ink: 0.7, dry: 0.6 });
          for (let i = 0; i < 2; i++) line([[-0.3 + i * 0.45, -3.85], [-0.55 + i * 0.4 - wind * 0.3, -3.2], [-0.7 + i * 0.4 - wind * 0.4, -2.75]], 0.04, { ink: 0.6, dry: 0.55 });
        } else {
          line([[-0.8 + (dress ? 0.08 : 0), -3.95 + dw], midL, [hemL + 0.05, -0.25 + back * 0.4 + hemY]], 0.075, { taper: 0.45 });
          line([[0.8 - (dress ? 0.08 : 0), -3.95 + dw], midR, [hemR - 0.05, -0.25 + hemY * 0.8]], 0.075, { taper: 0.45 });
          line([[hemL + 0.1, -0.22 + back * 0.4 + hemY], [(hemL + hemR) / 2, -0.06 + hemY], [hemR - 0.1, -0.2 + hemY * 0.8]], 0.05, { ink: 0.7, dry: 0.65 });
          for (let i = 0; i < 4; i++) {   // fold lines: S-curves fanning out from the sash
            const u = -0.75 + i * 0.5 + (rFold() - 0.5) * 0.18, xEnd = u < 0 ? u * (-hemL) * 0.85 : u * hemR * 0.85, sway = (rFold() - 0.5) * 0.35, y1 = -0.5 - rFold() * 1.2;
            line([[u * 0.6, -3.85 + dw], [u * 0.75 + sway - wind * 0.15, -3.0 + dw * 0.5], [(u * 0.6 + xEnd) / 2 - sway * 0.6 - wind * 0.3, -1.9], [xEnd - wind * 0.4, y1 + hemY]], 0.045, { ink: 0.62, dry: 0.55 });
          }
        }
        line([[-0.75, -5.3], [-0.55, -4.85], [-0.62, -4.4]], 0.035, { ink: 0.55, dry: 0.6 });
        line([[0.55, -3.8], [0.7, -3.45], [0.66, -3.1]], 0.035, { ink: 0.55, dry: 0.6 });
        const cc = S.accent === 'collar' ? 'red' : 'ink';
        if (big) {
          line([[0.17, -6.02], [0.02, -5.6], [-0.12, -5.15], [-0.32, -4.7]], 0.035, { mirror: false, ink: 0.6, dry: 0.3, nail: false, taper: 0.3 });
          line([[0.42, -5.97], [0.3, -5.55], [0.1, -5.0], [-0.22, -4.4]], 0.035, { mirror: false, ink: 0.55, dry: 0.35, nail: false, taper: 0.3 });
          line([[-0.7, -5.78], [-0.5, -5.45], [-0.56, -5.05], [-0.42, -4.7]], 0.035, { ink: 0.5, dry: 0.5 });
          line([[0.7, -5.7], [0.52, -5.35], [0.6, -4.95], [0.5, -4.6]], 0.035, { ink: 0.5, dry: 0.5 });
          line([[-0.25, -5.2], [-0.05, -4.95], [-0.18, -4.62], [-0.08, -4.35]], 0.03, { ink: 0.45, dry: 0.55 });
        }
        // crossed collar, right over left (右衽) whichever way the figure faces
        line([[0.28, -6.0], [0.05, -5.25], [-0.45, -4.2]], 0.1, { mirror: false, color: cc, ink: 0.9, dry: 0.25, taper: 0.25, tail: 0.5 });
        line([[-0.28, -6.0], [-0.08, -5.55]], 0.08, { mirror: false, color: cc, ink: 0.85, dry: 0.25 });
        const sc = S.accent === 'sash' ? 'red' : 'ink';
        const sy = P.ride ? 0 : dw, sx = dress ? 0.08 : 0;
        line([[-0.82 + sx, -4.05 + sy], [0, -3.97 + sy], [0.82 - sx, -4.03 + sy]], 0.17, { color: sc, ink: 0.92, dry: 0.25, press: 0.03, taper: 0.08, tail: 0.9, nail: false });
        if (dress) for (let i = 0; i < 2; i++) {   // two long ribbons (飘带) from the sash, streaming with the wind
          const x0 = 0.18 + i * 0.12, y0 = -3.98 + sy, L2 = 2.6 - i * 0.5;
          line([[x0, y0], [x0 + 0.14 - wind * 0.4, y0 + L2 * 0.35], [x0 - 0.06 - wind * 0.9, y0 + L2 * 0.7], [x0 + 0.08 - wind * 1.4, y0 + L2]], 0.045, { color: sc, ink: 0.85, dry: 0.35, taper: 0.7 });
        }
        else line([[0.25, -3.98 + sy], [0.3 - wind * 0.5, -3.35 + sy], [0.2 - wind * 1.0, -2.7 + sy]], 0.07, { color: sc, ink: 0.85, dry: 0.3 });
        if (S.outfit === 'armor') for (let i = 0; i < 3; i++) line([[-0.8, -5.3 + i * 0.38], [0, -5.2 + i * 0.38], [0.8, -5.3 + i * 0.38]], 0.06, { ink: 0.8 });
      }
      if (S.prop === 'sword') {
        line([[-0.55, -4.0], [-1.25, -3.05], [-1.95, -2.15]], 0.075, { ink: 0.95, dry: 0.15, press: 0.02, taper: 0.1, tail: 0.6, nail: false });
        line([[-0.42, -4.32], [-0.75, -3.88]], 0.11, { ink: 0.95, dry: 0.1, nail: false });
        line([[-0.42, -4.3], [-0.38 - wind * 0.4, -3.9], [-0.45 - wind * 0.6, -3.55]], 0.05, { ink: 0.9, color: 'red' });
      }
      if (!P.ride && dress) feet.forEach((ft) => { if (ft[0] > hemR - 1.0) line([[ft[0] + 0.22, ft[1] + 0.05], [ft[0] + 0.42, ft[1] + 0.02], [ft[0] + 0.5, ft[1] - 0.07]], 0.1, { ink: 0.95, dry: 0.15, taper: 0.5, nail: false }); });   // only the upturned shoe tips (翘头履) show
      else if (!P.ride) feet.forEach((ft) => line([[ft[0] - 0.12, ft[1] - 0.06], [ft[0] + 0.3, ft[1] - 0.04]], 0.15, { ink: 0.95, dry: 0.15, press: 0.1, taper: 0.4, nail: false }));
      fine([[-0.1, -6.15], [-0.08, -5.95]], 1, { ink: 0.55 }); fine([[0.2, -6.12], [0.19, -5.95]], 1, { ink: 0.55 });
    }

    // ---------- head: long face, fine even lines (游丝描), phoenix eyes, tinted lips ----------
    if (want('head')) {
      const female = S.sex === 'female', young = G.kid;
      const C = [0.06, -6.6], rx = young ? 0.35 : 0.33, ry = 0.5, chin = young ? 0.14 : female ? 0.24 : 0.32, hairTone = old ? 0.42 : 0.95;
      const face = (t) => { const a = (t * Math.PI) / 180, lower = Math.max(0, Math.sin(a)), front = Math.cos(a) > 0 ? 1 : 0; return [C[0] + Math.cos(a) * rx * (1 - chin * lower * lower) + front * 0.025 * lower, C[1] + Math.sin(a) * ry * (1 + 0.06 * lower)]; };
      const arc = (a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => face(a0 + ((a1 - a0) * i) / n));
      fill(() => {
        ctx.save(); ctx.beginPath(); TL(arc(0, 360, 40)).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
        ctx.fillStyle = SKIN; ctx.fill(); ctx.clip();
        const ck = T([C[0] - 0.08, -6.45]), g = ctx.createRadialGradient(ck[0], ck[1], 0, ck[0], ck[1], h * 0.22);
        g.addColorStop(0, `rgba(${CINNABAR},0.10)`); g.addColorStop(1, `rgba(${CINNABAR},0)`); ctx.fillStyle = g; ctx.fillRect(ck[0] - h * 0.3, ck[1] - h * 0.3, h * 0.6, h * 0.6);
        ctx.restore();
      });
      const hairShape = S.hat === 'bun'   // a woman's hair is fuller, swept back over the ear to a knot at the nape
        ? [[C[0] - 0.28, -6.22], [C[0] - 0.45, -6.42], [C[0] - 0.5, -6.8], [C[0] - 0.32, -7.07], [C[0] + 0.02, -7.15], [C[0] + 0.3, -7.0], [C[0] + 0.34, -6.86], [C[0] + 0.12, -6.97], [C[0] - 0.1, -6.92], [C[0] - 0.2, -6.72], [C[0] - 0.18, -6.42]]
        : [[C[0] - 0.31, -6.3], [C[0] - 0.42, -6.72], [C[0] - 0.3, -7.03], [C[0] + 0.02, -7.13], [C[0] + 0.3, -6.99], [C[0] + 0.33, -6.88], [C[0] + 0.1, -6.95], [C[0] - 0.12, -6.9], [C[0] - 0.24, -6.68], [C[0] - 0.22, -6.34]];
      if (!['helmet', 'short-hair', 'kerchief'].includes(S.hat)) {
        wash(TL(hairShape), { tone: hairTone, blots: 2, paper: `rgba(${INK},${hairTone * 0.72})`, seed: seed + 40 });
        for (let i = 0; i < 5; i++) fine([[C[0] - 0.2 + i * 0.012, -6.85 + i * 0.03], [C[0] - 0.24 + i * 0.01, -6.6], [C[0] - 0.21 + i * 0.015, -6.36 + i * 0.01]], 0.6, { ink: hairTone * 0.9, taper: 0.6 });
      }
      if (S.hat === 'long-hair') wash(TL([[C[0] - 0.3, -6.9], [C[0] - 0.48, -6.4], [C[0] - 0.55 - wind * 0.3, -5.5], [C[0] - 0.2 - wind * 0.3, -5.6], [C[0] - 0.22, -6.3]]), { tone: hairTone, blots: 1, paper: `rgba(${INK},${hairTone * 0.72})`, seed: seed + 41 });
      fine(arc(-28, 140, 26), 1.05, { ink: 0.82 });
      const ex0 = C[0] - 0.3;
      if (S.hat !== 'bun') {   // the ear (a woman's is under her hair)
        fine([[ex0 + 0.02, -6.7], [ex0 - 0.07, -6.72], [ex0 - 0.09, -6.58], [ex0 - 0.06, -6.42], [ex0 - 0.01, -6.36]], 0.9, { ink: 0.7 });
        fine([[ex0 - 0.03, -6.62], [ex0 - 0.04, -6.52]], 0.6, { ink: 0.5 });
      }
      // eyes: the near eye sits inside the nose bridge (bigger), the far eye just beyond it (foreshortened)
      const lift = F.lift ?? 0, ey = -6.64 - lift * 0.2;
      [[C[0] - 0.05, 1], [C[0] + 0.245, 0.68]].forEach(([x, s2], i) => {
        const w2 = 0.085 * s2;
        if (F.eye === 'arc') fine([[x - w2, ey + 0.01], [x, ey - 0.028], [x + w2, ey + 0.004], [x + w2 + 0.025, ey - 0.012]], 1.1, { ink: 0.9 });
        else if (F.eye === 'shut') fine([[x - w2, ey], [x, ey + 0.012], [x + w2 + 0.02, ey - 0.004]], 1.1, { ink: 0.85 });
        else {
          const open = F.eye === 'round' ? 0.045 : 0.022 * (1 - (F.lid ?? 0) * 0.5);
          fine([[x - w2, ey + 0.012], [x - w2 * 0.2, ey - open], [x + w2 * 0.7, ey - open * 0.6], [x + w2 + 0.03, ey - 0.02]], 1.25, { ink: 0.92, press: 0.05 });
          fine([[x - w2 * 0.6, ey + 0.022], [x + w2 * 0.6, ey + 0.018]], 0.6, { ink: 0.45 });
          const px = x + (F.eye === 'side' ? w2 * 0.45 : w2 * 0.05), d = T([px, ey - open * 0.15]);
          ctx.fillStyle = `rgba(${INK},0.92)`; ctx.beginPath(); ctx.ellipse(d[0], d[1], h * 0.022 * s2, h * (F.eye === 'round' ? 0.026 : 0.019), 0, 0, Math.PI * 2); ctx.fill();
        }
        const inner = i ? -1 : 1, b = F.brow * 0.045, by = -6.78 - lift;
        if (female || young) fine([[x + inner * 0.08 * s2, by - b * 0.8 + 0.01], [x, by - 0.035], [x - inner * 0.13 * s2, by + b * 0.15 + 0.005]], 0.75, { ink: 0.7, taper: 0.7 });   // a single fine arched brow (蛾眉)
        else for (let k = 0; k < 3; k++) fine([[x + inner * 0.08 * s2, by - b + k * 0.006], [x, by - 0.03 + k * 0.006], [x - inner * 0.12 * s2, by + b * 0.2 + (old ? 0.03 : -0.005) + k * 0.006]], 0.8, { ink: old ? 0.45 : 0.78, taper: 0.6 });
      });
      fine([[C[0] + 0.1, -6.76], [C[0] + 0.15, -6.62], [C[0] + 0.24, -6.48], [C[0] + 0.19, -6.44]], 0.95, { ink: 0.7 });
      fine([[C[0] + 0.07, -6.45], [C[0] + 0.12, -6.43]], 0.7, { ink: 0.6 });
      const mx = C[0] + 0.1, my = -6.3, open = Math.max(o.talk ?? 0, F.open ?? 0);
      const lips = T([mx, my + 0.012]);
      ctx.fillStyle = `rgba(${CINNABAR},0.55)`; ctx.beginPath(); ctx.ellipse(lips[0], lips[1], h * 0.05, h * (0.018 + open * 0.025), 0, 0, Math.PI * 2); ctx.fill();
      if (open > 0.05) { ctx.fillStyle = `rgba(${INK},0.8)`; ctx.beginPath(); ctx.ellipse(lips[0], lips[1], h * 0.032, h * open * 0.018, 0, 0, Math.PI * 2); ctx.fill(); }
      fine([[mx - 0.06, my - F.mouth * 0.022], [mx, my + F.mouth * 0.012], [mx + 0.05, my - F.mouth * 0.022]], 0.9, { ink: 0.85 });
      const bt = old ? 0.5 : 0.85;
      if (S.beard === 'wisp' || S.beard === 'long' || S.beard === 'short') {
        for (let k = 0; k < 6; k++) { const sd = k < 3 ? -1 : 1, j = k % 3; fine([[mx + sd * 0.01, my - 0.045 - j * 0.006], [mx + sd * (0.07 + j * 0.012), my - 0.03], [mx + sd * (0.1 + j * 0.02), my + 0.06 + j * 0.03]], 0.7, { ink: bt, taper: 0.7 }); }
        const n = S.beard === 'long' ? 18 : S.beard === 'wisp' ? 7 : 10, len = S.beard === 'long' ? 1.0 : S.beard === 'wisp' ? 0.55 : 0.18;
        for (let k = 0; k < n; k++) {
          const u = (k / (n - 1) - 0.5) * (S.beard === 'wisp' ? 0.1 : 0.3), x = mx - 0.02 + u, l = len * (0.75 + rBeard() * 0.3), j1 = (rBeard() - 0.5) * 0.03, j2 = (rBeard() - 0.5) * 0.05, a = 0.7 + rBeard() * 0.3;
          fine([[x, -6.2], [x + u * 0.4 - wind * 0.15 + j1, -6.2 + l * 0.5], [x + u * 0.7 - wind * 0.4 + j2, -6.2 + l]], 0.65, { ink: bt * a, taper: 0.75 });
        }
      }
      const hc = S.accent === 'hat' ? 'red' : 'ink';
      const knot = () => wash(TL([[C[0] - 0.26, -7.08], [C[0] - 0.24, -7.32], [C[0] - 0.08, -7.4], [C[0] + 0.08, -7.32], [C[0] + 0.08, -7.08]]), { tone: hairTone, blots: 1, paper: `rgba(${INK},${hairTone * 0.8})`, seed: seed + 42 });
      if (S.hat === 'none' || S.hat === 'guan') knot();
      if (S.hat === 'guan') {
        const cap = [[C[0] - 0.22, -7.16], [C[0] - 0.2, -7.46], [C[0] + 0.07, -7.48], [C[0] + 0.09, -7.16]];
        wash(TL(cap), { tone: 0.75, blots: 1, paper: S.accent === 'hat' ? `rgba(${CINNABAR},0.85)` : `rgba(${INK},0.55)`, seed: seed + 43 });
        fine([...cap, cap[0]], 1.2, { ink: 0.9 });
        fine([[C[0] - 0.45, -7.3], [C[0] + 0.32, -7.33]], 1.3, { ink: 0.9 });
      } else if (S.hat === 'jinxian') {   // 进贤冠: black kerchief cap with a slanting frame (展筩) rising at the front, ridges (梁) on it
        const base = [[C[0] - 0.36, -6.78], [C[0] - 0.4, -7.05], [C[0] - 0.22, -7.18], [C[0] + 0.12, -7.17], [C[0] + 0.32, -7.02], [C[0] + 0.33, -6.9], [C[0] + 0.05, -6.94], [C[0] - 0.2, -6.88]];
        wash(TL(base), { tone: 1, blots: 1, paper: `rgba(${INK},0.85)`, seed: seed + 44 });
        const frame = [[C[0] + 0.3, -7.0], [C[0] + 0.34, -7.42], [C[0] + 0.22, -7.46], [C[0] - 0.28, -7.18], [C[0] - 0.26, -7.1]];
        wash(TL(frame), { tone: 0.8, blots: 1, paper: `rgba(${col(hc)},0.45)`, seed: seed + 45 });
        fine([...frame, frame[0]], 1.3, { ink: 0.92 });
        for (let k = 1; k <= 2; k++) fine([[C[0] + 0.3 - k * 0.012, -7.42 + k * 0.1], [C[0] - 0.22, -7.15 + k * 0.012]], 0.8, { ink: 0.75 });
        fine([[C[0] - 0.42, -6.95], [C[0] + 0.36, -6.96]], 1.6, { ink: 0.95 });
      } else if (S.hat === 'kerchief') {
        const kf = [[C[0] - 0.4, -6.55], [C[0] - 0.42, -6.95], [C[0] - 0.2, -7.2], [C[0] + 0.14, -7.18], [C[0] + 0.33, -6.95], [C[0] + 0.1, -6.92], [C[0] - 0.24, -6.8]];
        wash(TL(kf), { tone: 1, blots: 1, paper: `rgba(${INK},0.8)`, seed: seed + 46 });
        fine(kf.slice(0, 5), 1.2, { ink: 0.9 });
        for (let i = 0; i < 2; i++) line([[C[0] - 0.38, -6.95 + i * 0.1], [C[0] - 0.8 - wind * 0.5, -6.78 + i * 0.18 + wind * 0.1], [C[0] - 1.05 - wind * 0.9, -6.42 + i * 0.22 + wind * 0.25]], 0.07, { ink: 0.9, dry: 0.35, taper: 0.6, tail: 0.3, color: hc });
      } else if (S.hat === 'helmet') {
        wash(TL([[C[0] - 0.44, -6.35], [C[0] - 0.46, -6.88], [C[0] - 0.22, -7.24], [C[0] + 0.14, -7.26], [C[0] + 0.38, -6.98], [C[0] + 0.38, -6.86], [C[0] - 0.18, -6.84], [C[0] - 0.28, -6.35]]), { tone: 1, blots: 1, paper: `rgba(${INK},0.85)`, seed: seed + 47 });
        line([[C[0] - 0.05, -7.24], [C[0] - 0.15 - wind * 0.3, -7.6], [C[0] - 0.42 - wind * 0.6, -7.76]], 0.12, { ink: 0.95, taper: 0.6, tail: 0.3, color: 'red' });
      } else if (S.hat === 'bun') {   // 高髻: a tall looped bun at the crown, a hairpin (簪) through it — cinnabar with accent 'hat'
        const bun = [[C[0] - 0.36, -6.98], [C[0] - 0.42, -7.3], [C[0] - 0.3, -7.6], [C[0] - 0.06, -7.66], [C[0] + 0.1, -7.5], [C[0] + 0.06, -7.22], [C[0] - 0.08, -7.08]];
        wash(TL(bun), { tone: hairTone, blots: 1, paper: `rgba(${INK},${hairTone * 0.85})`, seed: seed + 49 });
        fine([[C[0] - 0.3, -7.08], [C[0] - 0.36, -7.36], [C[0] - 0.2, -7.52], [C[0] - 0.04, -7.42], [C[0] - 0.1, -7.2]], 0.7, { ink: 0.35, color: COLORS.paper, taper: 0.6 });
        line([[C[0] - 0.62, -7.28], [C[0] - 0.2, -7.33], [C[0] + 0.24, -7.4]], 0.04, { color: hc, ink: 0.9, dry: 0.1, nail: false, taper: 0.3 });
        const pin = T([C[0] - 0.62, -7.28]);
        fill(() => { ctx.save(); ctx.fillStyle = `rgba(${col(hc)},0.85)`; ctx.beginPath(); ctx.arc(pin[0], pin[1], h * 0.04, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
      } else if (S.hat === 'tufts') {   // 总角: a child's hair tied in two little knots
        [[C[0] - 0.3, -7.02], [C[0] + 0.14, -7.1]].forEach(([x, y], i) => {
          wash(TL([[x - 0.12, y + 0.04], [x - 0.13, y - 0.13], [x, y - 0.21], [x + 0.13, y - 0.12], [x + 0.11, y + 0.04]]), { tone: hairTone, blots: 1, paper: `rgba(${INK},${hairTone * 0.8})`, seed: seed + 51 + i });
          line([[x - 0.1, y + 0.03], [x + 0.1, y + 0.02]], 0.035, { color: hc, ink: 0.9, nail: false });
        });
      } else if (S.hat === 'short-hair') {
        wash(TL([[C[0] - 0.38, -6.4], [C[0] - 0.42, -6.88], [C[0] - 0.2, -7.13], [C[0] + 0.17, -7.11], [C[0] + 0.36, -6.92], [C[0] + 0.34, -6.8], [C[0] + 0.05, -6.86], [C[0] - 0.24, -6.72], [C[0] - 0.25, -6.42]]), { tone: hairTone, blots: 1, paper: `rgba(${INK},${hairTone * 0.82})`, seed: seed + 48 });
        for (let i = 0; i < 4; i++) fine([[C[0] - 0.1 + i * 0.1, -7.1], [C[0] - 0.05 + i * 0.11, -6.95], [C[0] + i * 0.1, -6.88]], 0.6, { ink: 0.4, color: COLORS.paper });
      }
    }

    // ---------- front layer ----------
    if (want('front')) {
      const nearW = sleeve('near', S.tone);
      if (P.hands === 'joined') {
        const c = T([0.24, -4.78]), rr = h * 0.15;
        fill(() => { ctx.save(); ctx.fillStyle = SKIN; ctx.beginPath(); ctx.ellipse(c[0], c[1], rr, rr * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
        line([[0.1, -4.82], [0.2, -4.7], [0.38, -4.76]], 0.03, { ink: 0.6, press: 0.3 });
        line([[0.14, -4.88], [0.32, -4.9]], 0.026, { ink: 0.55 });
      } else hand(nearW, P.hands === 'point' ? 'point' : P.hands === 'open' ? 'open' : 'plain');
      if (S.prop === 'scroll') line([[nearW[0] - 0.05, nearW[1] - 0.25], [nearW[0] + 0.05, nearW[1] + 0.7]], 0.16, { ink: 0.85, dry: 0.3, nail: false });
      if (S.prop === 'fan') wash(TL([[nearW[0], nearW[1]], [nearW[0] + 0.55, nearW[1] - 0.75], [nearW[0] + 0.85, nearW[1] - 0.35]]), { tone: 0.25, blots: 1, seed: seed + 50 });
    }
  }

  // ================= Horse (写意马) =================
  // A parametric ink horse: a wash body with bold contours, legs as tapered brush strokes, mane and tail in dry streaming strokes.
  // o: x, y (ground under the body), size (hoof to ears, px), facing, tone, gait ('gallop' | 'walk' | 'stand'), phase 0–1, seed, saddle ('red' | 'ink' | 'none')
  // Returns the saddle point and the bit (for a rider and the reins), in canvas coordinates.
  const HORSE_GAITS = {
    gallop: { stride: 7.2, legs: { hf: 0.0, hn: 0.12, ff: 0.45, fn: 0.57 }, swing: [0.66, 0.58], flex: [1.5, 1.2], pitch: 0.09, bob: 0.5, nod: 0.16 },
    walk: { stride: 3.6, legs: { hf: 0.0, hn: 0.5, ff: 0.25, fn: 0.75 }, swing: [0.3, 0.28], flex: [0.9, 0.7], pitch: 0.015, bob: 0.06, nod: 0.05 },
    stand: { stride: 0, legs: { hf: 0, hn: 0, ff: 0, fn: 0 }, swing: [0, 0], flex: [0, 0], pitch: 0, bob: 0, nod: 0 },
  };
  function paintHorse(ctx, o = {}, layer = 'all') {
    const G = HORSE_GAITS[o.gait || 'gallop'], ph = o.phase ?? 0, a = 2 * Math.PI * ph, f = o.facing ?? 1, u = (o.size ?? 400) / 10, X0 = o.x ?? EV.W / 2, Y0 = o.y ?? EV.H * 0.926;
    const seed = o.seed ?? 11, tone = o.tone ?? 0.55, want = (l) => layer === 'all' || layer === l;
    let sn = 0; const sOf = () => (seed * 2654435761 + (++sn) * 7919) >>> 0;
    const pitch = G.pitch * Math.sin(a), bob = -G.bob * Math.abs(Math.sin(a)), cx = 0, cy = -6.0;
    // body space (u units, facing right, y up negative) → canvas; the body pitches round its centre while galloping
    const B = (p) => { const dx = p[0] - cx, dy = p[1] - cy, q = [cx + dx * Math.cos(pitch) - dy * Math.sin(pitch), cy + dx * Math.sin(pitch) + dy * Math.cos(pitch) + bob]; return [X0 + q[0] * f * u, Y0 + q[1] * u]; };
    const BL = (pts) => pts.map(B);
    const stroke = (pts, w, o2 = {}) => brush(ctx, pts, { width: w * u, ink: 0.9, dry: 0.4, press: 0.1, taper: 0.5, tail: 0.2, ...o2, seed: o2.seed ?? sOf() });
    // neck and head nod with the stride
    const nod = G.nod * Math.sin(a + Math.PI * 0.6) - (G.pitch > 0.03 ? 0.12 : 0), pivot = [1.6, -7.2];   // galloping, the head reaches forward and pumps with the stride
    const N = (p) => { const dx = p[0] - pivot[0], dy = p[1] - pivot[1]; return B([pivot[0] + dx * Math.cos(nod) - dy * Math.sin(nod), pivot[1] + dx * Math.sin(nod) + dy * Math.cos(nod)]); };
    const NL = (pts) => pts.map(N);
    // legs: each joint chain from the body; swing forward/back, the lower leg folds while the leg recovers
    const leg = (key, front) => {
      const off = G.legs[key], ps = a + 2 * Math.PI * off, i = front ? 0 : 1, sw = G.swing[i] * Math.sin(ps), fl = G.flex[i] * Math.max(0, Math.cos(ps));
      const top = front ? [2.05 + (key === 'ff' ? -0.25 : 0), -4.95] : [-2.35 + (key === 'hf' ? -0.25 : 0), -5.3];
      const L = front ? [2.25, 2.0, 0.5] : [2.3, 2.25, 0.5];
      const a1 = sw + (front ? 0.04 : -0.35), a2 = front ? a1 - fl : a1 + 0.42 + fl * 0.8, a3 = a2 + (front ? 0.35 : 0.3) - fl * 0.2;
      const p0 = B(top), dir = (ang) => [Math.sin(ang) * f * u, Math.cos(ang) * u];
      const d1 = dir(a1), p1 = [p0[0] + d1[0] * L[0], p0[1] + d1[1] * L[0]], d2 = dir(a2), p2 = [p1[0] + d2[0] * L[1], p1[1] + d2[1] * L[1]], d3 = dir(a3), p3 = [p2[0] + d3[0] * L[2], p2[1] + d3[1] * L[2]];
      return [p0, p1, p2, p3];
    };
    const drawLeg = (pts, far) => {
      const lk = far ? tone * 0.6 : Math.min(0.85, tone * 0.95);   // legs carry the body's tone, far legs paler
      stroke(pts.slice(0, 3), 0.8, { ink: lk, dry: 0.45, press: 0.02, taper: 0.9, tail: 0.3, nail: false, bleed: 0.45 });
      stroke([pts[2], pts[3]], 0.24, { ink: Math.min(0.95, lk + 0.15), dry: 0.2, nail: false, taper: 0.3, tail: 0.6 });
      const hd = [pts[3][0] - pts[2][0], pts[3][1] - pts[2][1]], hl = Math.hypot(hd[0], hd[1]) || 1;
      stroke([pts[3], [pts[3][0] + (hd[0] / hl) * 0.35 * u + f * 0.12 * u, pts[3][1] + (hd[1] / hl) * 0.35 * u]], 0.42, { ink: far ? 0.6 : 0.95, dry: 0.1, nail: false, press: 0.02, taper: 0.2, tail: 0.7 });
    };
    if (want('far')) {
      if (G.pitch > 0.03) for (let k = 0; k < 4; k++) {   // dust kicked up behind the hooves: dry horizontal streaks
        const y = -0.15 - k * 0.22, x0 = -3.0 - k * 0.5 - ((ph * 3 + k * 0.37) % 1) * 1.2;
        stroke([B([x0, y]), B([x0 - 1.6 - k * 0.4, y - 0.05])], 0.22 - k * 0.03, { ink: 0.35 - k * 0.06, dry: 0.85, taper: 0.7, nail: false, bleed: 0.4 });
      }
      drawLeg(leg('ff', true), true); drawLeg(leg('hf', false), true);
    }
    if (want('body')) {
      // tail and mane stream behind; they wave with the stride
      for (let k = 0; k < 6; k++) {
        const w = Math.sin(a * 1 + k * 0.7) * 0.35;
        stroke([B([-3.0, -6.95]), B([-4.0 - k * 0.12, -6.6 + w * 0.6 + k * 0.08]), B([-4.9 - k * 0.18, -5.8 + w + k * 0.12])], 0.28 - k * 0.025, { ink: 0.85 * tone + 0.15, dry: 0.75, taper: 0.8, tail: 0.1 });
      }
      const body = [[1.65, -7.3], [0.9, -7.05], [0.2, -6.95], [-1.1, -7.05], [-2.3, -7.25], [-3.0, -6.95], [-3.25, -6.1], [-3.05, -5.4], [-2.55, -4.95], [-1.4, -4.7], [-0.2, -4.65], [1.1, -4.8], [1.9, -5.0], [2.6, -5.45], [2.95, -6.2], [3.0, -6.7]];
      washPoly(ctx, BL(body), { tone: Math.min(1, tone * 1.45), blots: 4, shade: [[...B([-2.2, -6.0]), u * 1.6, 1], [...B([2.2, -5.9]), u * 1.2, 0.8]], seed: seed + 3 });
      const neck = [[1.65, -7.3], [2.5, -8.5], [3.5, -9.3], [3.95, -8.45], [3.4, -7.4], [3.0, -6.6], [2.4, -6.2]];
      washPoly(ctx, NL(neck), { tone: Math.min(1, tone * 1.35), blots: 2, seed: seed + 4 });
      const head = [[3.45, -9.35], [3.95, -9.4], [4.6, -8.95], [5.2, -8.25], [5.12, -7.85], [4.6, -7.75], [4.05, -8.2], [3.8, -8.55]];
      washPoly(ctx, NL(head), { tone: Math.min(1, tone * 1.45), blots: 2, seed: seed + 5 });
      // bold contours: back, belly, chest, crest; fine lines on the head
      stroke([B([1.7, -7.25]), B([0.6, -7.0]), B([-1.0, -7.08]), B([-2.3, -7.27]), B([-3.0, -6.95])], 0.24, { nail: true, taper: 0.4 });
      stroke([B([-3.15, -6.3]), B([-3.05, -5.4]), B([-2.55, -4.95])], 0.2, { nail: true, ink: 0.85 });
      stroke([B([-2.2, -4.8]), B([-1.0, -4.66]), B([0.6, -4.7]), B([1.6, -4.92])], 0.2, { nail: true, ink: 0.8, dry: 0.5 });
      stroke([B([2.4, -5.25]), B([2.85, -5.8]), B([3.0, -6.55])], 0.2, { nail: true });
      stroke(NL([[1.7, -7.3], [2.5, -8.45], [3.45, -9.3]]), 0.2, { nail: true });
      stroke(NL([[3.05, -6.65], [3.45, -7.45], [3.95, -8.4]]), 0.14, { nail: true, ink: 0.8 });
      stroke(NL([[3.5, -9.35], [4.6, -8.95], [5.2, -8.25], [5.1, -7.85], [4.55, -7.75]]), 0.1, { nail: false, taper: 0.3, ink: 0.9 });
      stroke(NL([[3.55, -9.3], [3.4, -9.95]]), 0.16, { nail: false, taper: 0.7 }); stroke(NL([[3.75, -9.35], [3.75, -9.9]]), 0.14, { nail: false, taper: 0.7, ink: 0.7 });
      const eye = N([4.12, -8.95]); ctx.fillStyle = `rgba(${INK},0.95)`; ctx.beginPath(); ctx.ellipse(eye[0], eye[1], u * 0.1, u * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      const nos = N([4.95, -8.1]); ctx.beginPath(); ctx.ellipse(nos[0], nos[1], u * 0.07, u * 0.05, 0, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 7; k++) {
        const t = k / 6, base = [1.75 + t * 1.65, -7.35 - t * 1.95], w = Math.sin(a + k * 0.9) * 0.25;
        stroke(NL([base, [base[0] - 0.55 - t * 0.2, base[1] + 0.1 + w * 0.5], [base[0] - 1.05 - t * 0.2, base[1] + 0.35 + w]]), 0.22, { ink: 0.95, dry: 0.7, taper: 0.8, tail: 0.1 });
      }
      if ((o.saddle ?? 'red') !== 'none') {
        const sc = o.saddle === 'ink' ? INK : CINNABAR;
        washPoly(ctx, BL([[-0.95, -7.12], [0.95, -7.0], [1.05, -5.95], [-0.85, -5.9]]), { tone: 0.9, blots: 1, paper: `rgba(${sc},0.55)`, color: sc, seed: seed + 6 });
        stroke(BL([[-0.95, -7.1], [-0.9, -5.92]]), 0.08, { ink: 0.8, nail: false }); stroke(BL([[0.98, -7.0], [1.03, -5.96]]), 0.08, { ink: 0.8, nail: false });
      }
    }
    if (want('near')) { drawLeg(leg('fn', true), false); drawLeg(leg('hn', false), false); }
    return { saddle: B([0.1, -7.05]), bit: N([4.75, -7.95]) };
  }

  // ================= Items =================
  const callsite = () => {
    const frames = (new Error().stack || '').split('\n').filter((l) => /\.html:\d+/.test(l) && !/\/lib\//.test(l))
      .map((l) => /\/([^\/\s)]+\.html):(\d+)/.exec(l)).filter(Boolean).map((m) => `${m[1]}:${m[2]}`);
    return [...new Set(frames)].slice(0, 2).join(' ← ');
  };
  const timeOf = (at) => (at && typeof at === 'object' ? at.end : at);
  const pad = (b, p) => ({ x: b.x - p, y: b.y - p, w: b.w + 2 * p, h: b.h + 2 * p });

  class Item {
    constructor(b, o = {}) {
      this.b = b; this.o = o; this.kind = o.kind || 'element';
      let s = timeOf(o.at);
      if (s === undefined || s === null) s = b.cursor;
      this.start = s + (o.delay || 0);
      this.hud = !!o.hud;
      this.sec = this.hud ? null : b.sec;
      this.hudSec = this.hud && !o.persist ? b.sec : null;   // screen-fixed items leave with their section
      if (!this.hud && !this.sec) throw new Error('No section yet: call b.cover() or b.section() first, then draw on it');
      this.src = callsite();
      this.exits = []; this.moves = []; this.pulses = [];
      this.res = o.res ?? b.res;
      this.enter = o.enter;
      this.depth = o.depth ?? 1;   // parallax: < 1 far (moves slower than the camera), > 1 near (faster)
      this.dur = 0;
      this.noInfo = !!(EV.muted && EV.muted());   // drawn inside a promo kit verb: that verb registers itself for the information-density check
    }
    get end() { return this.start + this.dur; }
    get done() { return this.end; }
    get ox() { return this.sec ? this.sec.x : 0; }       // section (local) → world x offset
    describe() {
      const b = this.box, lab = this.label ? `"${this.label.slice(0, 14)}${this.label.length > 14 ? '…' : ''}"` : '';
      return `${this.kind}${lab}` + (b ? ` (${Math.round(b.x - this.ox + b.w / 2)}, ${Math.round(b.y + b.h / 2)})` : '');
    }
    finish() { this.b.add(this); return this; }
    erase(at, dur = 0.45) { at = timeOf(at); this.exits.push({ at: at ?? this.b.cursor, dur }); return this; }
    move(at, dx, dy, dur = 0.8, e = ease.inOut) { this.moves.push({ at: timeOf(at), dx, dy, s: 1, dur, e }); this.moves.sort((a, c) => a.at - c.at); return this; }
    to(at, o = {}, dur = 0.8, e = ease.inOut) {
      at = timeOf(at);
      const bb = this.boxAt(at), cur = this.offsetAt(at)[2], cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2;
      const ox = this.hud ? 0 : this.ox;
      this.moves.push({ at, dx: (o.x !== undefined ? o.x + ox : cx) - cx, dy: (o.y ?? cy) - cy, s: (o.scale ?? cur) / cur, dur, e });
      this.moves.sort((a, c) => a.at - c.at);
      return this;
    }
    pulse(at, amt = 1.08, dur = 0.5) { this.pulses.push({ at: timeOf(at), amt, dur }); return this; }
    offsetAt(t) {
      let dx = 0, dy = 0, s = 1;
      for (const m of this.moves) { const q = progress(t, m.at, m.dur, m.e); dx += m.dx * q; dy += m.dy * q; s *= lerp(1, m.s, q); }
      for (const p of this.pulses) { const k = clamp((t - p.at) / p.dur); if (k > 0 && k < 1) s *= 1 + (p.amt - 1) * Math.sin(Math.PI * k); }
      return [dx, dy, s];
    }
    boxAt(t) {
      const b = this.box;
      if (!b) return b;
      const [dx, dy, s] = this.offsetAt(t);
      return { x: b.x + b.w / 2 + dx - (b.w * s) / 2, y: b.y + b.h / 2 + dy - (b.h * s) / 2, w: b.w * s, h: b.h * s };
    }
    fadeAt(t) { let f = 1; for (const x of this.exits) f = Math.min(f, 1 - progress(t, x.at, x.dur, ease.inOut)); return f; }
    gone() { return this.exits.length ? Math.min(...this.exits.map((x) => x.at)) : Infinity; }
    q(t) { return this.dur > 0 ? clamp((t - this.start) / this.dur) : t >= this.start ? 1 : 0; }

    // ---- cached bitmap of the finished element ----
    cacheBox() { return pad(this.box, 14); }
    cache() {
      if (!this._c) {
        const bx = this.cacheBox(), k = this.res, cv = canvas(bx.w * k, bx.h * k), c = cv.getContext('2d');
        c.scale(k, k); c.translate(-bx.x, -bx.y);
        this.paint(c);
        this._c = { cv, bx, k };
      }
      return this._c;
    }
    temp(c) {
      if (!this._t || this._t.width !== c.cv.width || this._t.height !== c.cv.height) this._t = canvas(c.cv.width, c.cv.height);
      const tc = this._t.getContext('2d');
      tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'source-over'; tc.globalAlpha = 1; tc.filter = 'none';
      tc.clearRect(0, 0, this._t.width, this._t.height);
      tc.setTransform(c.k, 0, 0, c.k, -c.bx.x * c.k, -c.bx.y * c.k);
      return tc;
    }
    masked(c, tc) { tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'source-in'; tc.drawImage(c.cv, 0, 0); return this._t; }
    // Entrance progress q → the image to draw (the cache itself, or a masked copy of it)
    revealed(c, q) {
      if (q >= 1) return c.cv;
      if (q <= 0) return null;
      const e = this.enter;
      if (e === 'brush' && this.path) {
        const tc = this.temp(c), n = Math.max(2, Math.ceil(this.path.length * q));
        tc.lineCap = 'round'; tc.lineJoin = 'round'; tc.lineWidth = this.maskW; tc.strokeStyle = '#000';
        tc.beginPath(); for (let i = 0; i < n; i++) { const p = this.path[i]; if (p === null) { i++; if (i < n) tc.moveTo(this.path[i][0], this.path[i][1]); continue; } i ? tc.lineTo(p[0], p[1]) : tc.moveTo(p[0], p[1]); } tc.stroke();
        return this.masked(c, tc);
      }
      if (e === 'write' && this.cells) {
        const tc = this.temp(c), nz = noise1(7);
        tc.fillStyle = '#000';
        for (const cl of this.cells) {
          const qi = clamp((q - cl.t0) / (cl.t1 - cl.t0));
          if (qi <= 0) continue;
          const pd = cl.w * 0.12, X = cl.x - pd, Y = cl.y - pd, Wd = cl.w + 2 * pd, Ht = cl.h + 2 * pd;
          if (qi >= 1) { tc.fillRect(X, Y, Wd, Ht); continue; }
          // diagonal front: roughly the order a character is written in (left→right, top→bottom), with a ragged edge
          const qq = qi * 1.08 - 0.04, g = cl.w * 0.08;
          tc.beginPath(); tc.moveTo(X, Y); tc.lineTo(X + Wd, Y);
          for (let x = Wd; x >= 0; x -= Math.max(2, Wd / 30)) tc.lineTo(X + x, Y + ((qq - 0.35 * x / Wd) / 0.65) * Ht + (nz(x * 0.08 + cl.x) - 0.5) * g);
          tc.closePath(); tc.fill();
        }
        return this.masked(c, tc);
      }
      if (e === 'wipe') {
        const tc = this.temp(c), b = c.bx, nz = noise1(3), front = b.y + b.h * (q * 1.1 - 0.05);
        tc.fillStyle = '#000'; tc.beginPath(); tc.moveTo(b.x, b.y);
        for (let x = 0; x <= b.w; x += Math.max(4, b.w / 40)) tc.lineTo(b.x + x, front + (nz(x * 0.02) - 0.5) * 50);
        tc.lineTo(b.x + b.w, b.y); tc.closePath(); tc.fill();
        return this.masked(c, tc);
      }
      return c.cv;
    }
    visibleIn(v, t) { const b = this.boxAt(t) || this.box; return !b || inter(pad(b, 80), v) > 0; }
    draw(ctx, t) {
      if (t < this.start) return;
      const fade = this.fadeAt(t);
      if (fade <= 0.001) return;
      const q = this.q(t), c = this.cache(), img = this.revealed(c, q);
      if (!img) return;
      let alpha = fade, blur = 0, sc = 1;
      if (q < 1) {
        if (this.enter === 'fade') alpha *= ease.inOut(q);
        else if (this.enter === 'wash') { alpha *= ease.out(q); blur = (1 - q) * 6; }
        else if (this.enter === 'stamp') { sc = lerp(1.4, 1, ease.outBack(q)); alpha *= clamp(q * 4); }
        else if (this.enter === 'bloom') { sc = lerp(this.o.bloomFrom ?? 0.82, 1, ease.out(q)); alpha *= ease.out(q); blur = (1 - q) * 8; }
      }
      this.blit(ctx, t, img, c.bx, alpha, blur, sc);
    }
    blit(ctx, t, img, bx, alpha, blur = 0, extraScale = 1) {
      const [dx, dy, s0] = this.offsetAt(t), s = s0 * extraScale, b = this.box || bx, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      if (dx || dy || s !== 1) { ctx.translate(cx + dx, cy + dy); ctx.scale(s, s); ctx.translate(-cx, -cy); }
      ctx.drawImage(img, bx.x, bx.y, bx.w, bx.h);
      ctx.restore();
    }
  }

  // ---- brush strokes, arrows, circles, underlines ----
  class Stroke extends Item {
    constructor(b, pts, o = {}) {
      super(b, { kind: 'brush stroke', ...o });
      const ox = this.hud ? 0 : this.ox;
      this.pts = pts.map((p) => [p[0] + ox, p[1]]);
      this.width = o.width ?? 10;
      this.enter = o.enter ?? 'brush';
      this.heads = (o.heads || []).map((h) => h.map((p) => [p[0] + ox, p[1]]));
      this.path = [...spline(this.pts, 4)];
      for (const h of this.heads) { this.path.push(null); this.path.push(...spline(h, 4)); }
      let len = 0; for (let i = 1; i < this.path.length; i++) if (this.path[i] && this.path[i - 1]) len += Math.hypot(this.path[i][0] - this.path[i - 1][0], this.path[i][1] - this.path[i - 1][1]);
      this.len = len;
      this.dur = o.dur ?? clamp(len / (o.speed ?? 1500), 0.25, 1.6);
      this.maskW = this.width * 2.8 + 12;
      this.seed = o.seed ?? b.nextSeed();   // fixed now: bitmaps are painted lazily, in whatever order frames ask for them
      const all = this.path.filter(Boolean), xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
      this.box = { x: Math.min(...xs) - this.width, y: Math.min(...ys) - this.width, w: Math.max(...xs) - Math.min(...xs) + this.width * 2, h: Math.max(...ys) - Math.min(...ys) + this.width * 2 };
      this.finish();
    }
    cacheBox() { return pad(this.box, this.width + 16); }
    paint(c) {
      const o = this.o, base = { width: this.width, ink: o.ink ?? 0.9, dry: o.dry ?? 0.4, color: o.color ?? 'ink', press: o.press ?? 0.1, taper: o.taper ?? 0.35, tail: o.tail ?? 0.15, nail: o.nail, seed: this.seed };
      brush(c, this.pts, base);
      this.heads.forEach((h, i) => brush(c, h, { ...base, width: this.width * 0.85, press: 0.05, taper: 0.6, seed: base.seed + 11 + i }));
    }
  }

  // ---- calligraphy and body text ----
  function parseMarkup(str) {
    const out = [], re = /\{(\w+):([^}]*)\}/g;
    let last = 0, m;
    while ((m = re.exec(str))) { for (const ch of str.slice(last, m.index)) out.push({ ch, color: null }); for (const ch of m[2]) out.push({ ch, color: m[1] }); last = m.index + m[0].length; }
    for (const ch of str.slice(last)) out.push({ ch, color: null });
    return out;
  }
  const PUNCT_V = /[，。、：；！？,.]/;
  class Text extends Item {
    constructor(b, str, o = {}) {
      super(b, { kind: o.calli ? 'calligraphy' : 'text', ...o });
      if (EV.fact && !o.noFact) EV.fact(str);   // fact check: on-screen text must be findable in brief.md
      this.calli = !!o.calli;
      this.font = o.font ?? (this.calli ? 'brush' : 'kai');
      this.size = o.size ?? (this.calli ? 150 : 44);
      this.color = o.color ?? 'ink';
      this.vertical = !!o.vertical;
      this.enter = o.enter ?? 'write';
      const runs = parseMarkup(String(str));
      this.label = runs.map((r) => r.ch).join('');
      b.useText(this.label);
      const ox = this.hud ? 0 : this.ox, size = this.size, m = b.mctx;
      m.font = `${size}px ${FONTS[this.font] || this.font}`;
      const cells = [];
      if (this.vertical) {
        const step = size * (o.spacing ?? 1.06), gapC = size * (o.colGap ?? 0.55), maxH = o.h ?? Infinity, cols = [[]];
        for (const r of runs) {
          const colA = cols[cols.length - 1];
          if (r.ch === '\n') { cols.push([]); continue; }
          if ((colA.length + 1) * step > maxH && colA.length && !NO_LINE_START.test(r.ch)) cols.push([r]); else colA.push(r);
        }
        const bw = cols.length * size + (cols.length - 1) * gapC, bh = Math.max(...cols.map((c) => c.length)) * step;
        const al = o.align ?? 'left', x0 = (o.x ?? b.W / 2) - (al === 'center' ? bw / 2 : al === 'right' ? bw : 0) + ox;
        const va = o.valign ?? 'top', y0 = (o.y ?? 200) - (va === 'middle' ? bh / 2 : va === 'bottom' ? bh : 0);
        cols.forEach((cl, ci) => { const cx = x0 + bw - size / 2 - ci * (size + gapC); cl.forEach((r, j) => cells.push({ ch: r.ch, color: r.color, x: cx - size / 2, y: y0 + j * step, w: size, h: step, punct: PUNCT_V.test(r.ch) })); });
        this.box = { x: x0, y: y0, w: bw, h: bh };
      } else {
        const lh = size * (o.lh ?? (this.calli ? 1.2 : 1.4)), maxW = o.w ?? Infinity, lines = [[]];
        let w = 0;
        const LATIN = /[A-Za-z0-9'’]/;
        for (let i = 0; i < runs.length; i++) {
          const r = runs[i];
          if (r.ch === '\n') { lines.push([]); w = 0; continue; }
          const cw = m.measureText(r.ch).width;
          const cur = lines[lines.length - 1];
          if (w + cw > maxW && cur.length && !NO_LINE_START.test(r.ch)) {
            // keep Latin words whole: move the unfinished word to the next line
            let k = cur.length;
            if (LATIN.test(r.ch)) while (k > 0 && LATIN.test(cur[k - 1].ch)) k--;
            const carry = k > 0 && k < cur.length ? cur.splice(k) : [];
            lines.push([...carry, { ...r, cw }]);
            w = carry.reduce((a, c) => a + c.cw, 0) + cw;
            if (lines[lines.length - 1][0] && lines[lines.length - 1][0].ch === ' ') { const sp = lines[lines.length - 1].shift(); w -= sp.cw; }
          } else { cur.push({ ...r, cw }); w += cw; }
        }
        const widths = lines.map((l) => l.reduce((a, c) => a + c.cw, 0)), bw = Math.max(1, ...widths), bh = lines.length * lh;
        const al = o.align ?? 'left', x0 = (o.x ?? b.W / 2) - (al === 'center' ? bw / 2 : al === 'right' ? bw : 0) + ox;
        const va = o.valign ?? 'top', y0 = (o.y ?? 200) - (va === 'middle' ? bh / 2 : va === 'bottom' ? bh : 0);
        lines.forEach((l, li) => {
          let x = x0 + (al === 'center' ? (bw - widths[li]) / 2 : al === 'right' ? bw - widths[li] : 0);
          for (const r of l) { cells.push({ ch: r.ch, color: r.color, x, y: y0 + li * lh + (lh - size * 1.1) / 2, w: r.cw, h: size * 1.1 }); x += r.cw; }
        });
        this.box = { x: x0, y: y0, w: bw, h: bh };
        this.nLines = lines.length;
      }
      this.textBox = this.box;
      // writing schedule: each character gets a window; punctuation and spaces are quick
      const wts = cells.map((c) => (/\s/.test(c.ch) ? 0.15 : NO_LINE_START.test(c.ch) || PUNCT_V.test(c.ch) ? 0.3 : 1)), total = wts.reduce((a, x) => a + x, 0) || 1;
      let acc = 0;
      cells.forEach((c, i) => { c.t0 = acc / total; acc += wts[i]; c.t1 = Math.min(1, (acc + (this.calli ? 0.25 : 0.6)) / total); });
      this.cells = cells;
      this.dur = o.dur ?? Math.max(0.3, total / (o.speed ?? (this.calli ? 2.6 : 10)));
      this.finish();
    }
    cacheBox() { return pad(this.box, this.size * 0.25 + 10); }
    paint(c) {
      const bx = this.cacheBox(), k = this.res, off = canvas(bx.w * k, bx.h * k), g = off.getContext('2d');
      g.scale(k, k); g.translate(-bx.x, -bx.y);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const ink = this.o.ink ?? (this.calli ? 0.95 : 0.92);
      for (const cl of this.cells) {
        if (/\s/.test(cl.ch)) continue;
        const fs = cl.punct && this.vertical ? this.size * 0.8 : this.size;
        g.font = `${fs}px ${FONTS[this.font] || this.font}`;
        g.fillStyle = `rgba(${col(cl.color || this.color)},${ink})`;
        if (cl.punct && this.vertical) g.fillText(cl.ch, cl.x + cl.w * 0.78, cl.y + cl.h * 0.22);
        else g.fillText(cl.ch, cl.x + cl.w / 2, cl.y + cl.h / 2 + this.size * 0.02);
      }
      const dry = this.o.dry ?? (this.calli ? 0.35 : 0);
      if (this.calli || this.size >= 56) glyphTexture(g, this.box, this.size, dry, hashStr(this.label) + 3);
      c.save(); c.globalAlpha = this.calli ? 0.32 : 0.15; c.filter = `blur(${this.calli ? 2.2 : 0.8}px)`; c.drawImage(off, bx.x, bx.y, bx.w, bx.h); c.restore();
      c.save(); if (this.calli && this.o.rough !== false) c.filter = 'url(#ink-rough)'; c.drawImage(off, bx.x, bx.y, bx.w, bx.h); c.restore();
    }
    // Box of the characters from..to (string indices of the plain text), for circling or marking part of a line
    part(from, to) {
      if (typeof from === 'string') { const i = this.label.indexOf(from); if (i < 0) throw new Error(`"${from}" is not in "${this.label}"`); to = i + from.length; from = i; }
      return unionBox(this.cells.slice(from, to ?? from + 1).map((c) => ({ x: c.x, y: c.y, w: c.w, h: c.h })));
    }
  }

  // ---- seal ----
  class Seal extends Item {
    constructor(b, str, o = {}) {
      super(b, { kind: 'seal', ...o });
      this.label = str; b.useText(str);
      if (EV.fact && !o.noFact) EV.fact(str);
      const ox = this.hud ? 0 : this.ox;
      this.size = o.size ?? 110;
      this.box = { x: (o.x ?? b.W / 2) + ox, y: o.y ?? b.H / 2, w: this.size, h: this.size };
      this.enter = o.enter ?? 'stamp';
      this.dur = o.dur ?? 0.35;
      this.finish();
    }
    paint(c) { paintSeal(c, this.label, this.box.x, this.box.y, this.size, { yang: this.o.yang, seed: this.o.seed }); }
  }

  // ---- 墨晕: ink drop spreading, with optional name reversed out of the ink ----
  class Blot extends Item {
    constructor(b, x, y, r, o = {}) {
      super(b, { kind: 'ink blot', ...o });
      const ox = this.hud ? 0 : this.ox;
      this.cx = x + ox; this.cy = y; this.r = r; this.seed = o.seed ?? this.b.nextSeed() % 9973;
      this.box = { x: this.cx - r * 1.3, y: this.cy - r * 1.3, w: r * 2.6, h: r * 2.6 };
      this.label = o.text || '';
      if (o.text) b.useText(o.text);
      this.dur = o.dur ?? 1.4;
      this.finish();
    }
    paintAt(c, p, textA) {
      paintBlot(c, this.cx, this.cy, this.r, p, { seed: this.seed, ink: this.o.ink ?? 1, color: this.o.color });
      if (this.o.text && textA > 0) {
        const size = this.o.textSize ?? this.r * 0.55;
        c.save(); c.globalAlpha = textA; c.font = `${size}px ${FONTS[this.o.font ?? 'brush']}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = PAPER; c.fillText(this.o.text, this.cx, this.cy + size * 0.03); c.restore();
      }
    }
    paint(c) { this.paintAt(c, 1, 1); }
    draw(ctx, t) {
      if (t < this.start) return;
      const fade = this.fadeAt(t), q = this.q(t);
      if (fade <= 0.001) return;
      if (q >= 1) return super.draw(ctx, t);
      const [dx, dy] = this.offsetAt(t);
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(dx, dy);
      this.paintAt(ctx, ease.out(q), clamp((q - 0.55) / 0.4));
      ctx.restore();
    }
  }

  // ---- landscape pieces: painted once, appear as a wash ----
  class Painted extends Item {
    constructor(b, kind, fn, box, o = {}) {
      super(b, { kind, ...o });
      this.fn = fn; this.box = box;
      this.enter = o.enter ?? 'wash';
      this.dur = o.dur ?? 1.2;
      this.res = o.res ?? 1;
      this.finish();
    }
    paint(c) { this.fn(c); }
  }

  // ---- mountains, painted in: contours brushed along the ridge, then the wash bleeds down from it ----
  class Mountains extends Item {
    constructor(b, oo, o = {}) {
      super(b, { kind: 'mountains', annot: true, ...o });
      this.oo = oo;
      this.enter = o.enter ?? 'paint';
      this.dur = o.dur ?? (oo.ridge ? 2.2 : 1.6);
      this.res = o.res ?? 1;
      const top = Math.min(...oo.peaks.map((p) => oo.base - p.h * 1.25 - 40));
      this.box = { x: oo.x0 - 40, y: top, w: oo.x1 - oo.x0 + 80, h: oo.base - top + 30 };
      this.finish();
    }
    layerCache(layer) {
      this._lc = this._lc || {};
      if (!this._lc[layer]) {
        const bx = this.cacheBox(), k = this.res, cv = canvas(bx.w * k, bx.h * k), c = cv.getContext('2d');
        c.scale(k, k); c.translate(-bx.x, -bx.y);
        const r = paintMountains(c, this.oo, layer);
        this.ridge = r.pts;
        this._lc[layer] = { cv, bx, k };
      }
      return this._lc[layer];
    }
    draw(ctx, t) {
      if (t < this.start) return;
      const fade = this.fadeAt(t);
      if (fade <= 0.001) return;
      const q = this.q(t), W = this.layerCache('wash'), L = this.oo.ridge ? this.layerCache('lines') : null;
      if (q >= 1 || this.enter !== 'paint') {
        const a = q >= 1 ? 1 : ease.out(q);
        this.blit(ctx, t, W.cv, W.bx, fade * a, q < 1 ? (1 - q) * 6 : 0);
        if (L) this.blit(ctx, t, L.cv, L.bx, fade * a);
        return;
      }
      const ql = L ? clamp(q / 0.55) : 1, qw = clamp((q - (L ? 0.25 : 0)) / (L ? 0.75 : 1));
      if (qw > 0) {   // the wash front moves down from the ridge, soft-edged
        const tc = this.temp(W), base = this.oo.base, R = this.ridge, e = ease.out(qw);
        tc.filter = `blur(${Math.max(6, (base - Math.min(...R.map((p) => p[1]))) * 0.08)}px)`;
        tc.fillStyle = '#000'; tc.beginPath(); tc.moveTo(R[0][0], W.bx.y);
        R.forEach((p) => tc.lineTo(p[0], p[1] - 40 + (base - p[1] + 160) * e));
        tc.lineTo(R[R.length - 1][0], W.bx.y); tc.closePath(); tc.fill(); tc.filter = 'none';
        this.blit(ctx, t, this.masked(W, tc), W.bx, fade * Math.min(1, qw * 2.5));
      }
      if (L && ql > 0) {   // contours brushed from left to right
        const tc = this.temp(L), x = L.bx.x + L.bx.w * ql, g = tc.createLinearGradient(x - 50, 0, x + 50, 0);
        g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
        tc.fillStyle = g; tc.fillRect(L.bx.x, L.bx.y, x + 50 - L.bx.x, L.bx.h);
        this.blit(ctx, t, this.masked(L, tc), L.bx, fade);
      }
    }
  }

  // ---- any shape painted in ink: the outline is brushed (open: true = no closing stroke), then the wash soaks in ----
  class Shape extends Item {
    constructor(b, pts, o = {}) {
      super(b, { kind: o.kind || 'shape', ...o });
      const ox = this.hud ? 0 : this.ox;
      let P = pts.map((p) => [p[0] + ox, p[1]]);
      if (!o.smooth) {   // straight edges and crisp corners: put points every ~16 px along each edge so the brush spline can't round them off
        const out = [], ring = o.open ? P : [...P, P[0]];
        for (let i = 0; i < ring.length - 1; i++) { const a = ring[i], c = ring[i + 1], n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 16)); for (let k = 0; k < n; k++) out.push([a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]); }
        if (o.open) out.push(ring[ring.length - 1]);
        P = out;
      }
      this.pts = P;
      this.enter = o.enter ?? 'draw';
      this.seed = o.seed ?? b.nextSeed();
      const ring = o.open ? this.pts : [...this.pts, this.pts[0]];
      this.path = spline(ring, 4);
      this.width = o.width ?? 7;
      this.maskW = this.width * 2.8 + 12;
      const xs = this.pts.map((p) => p[0]), ys = this.pts.map((p) => p[1]);
      const hw = this.width / 2 + 2;   // the box includes the brush width (a straight line still has a size)
      this.box = { x: Math.min(...xs) - hw, y: Math.min(...ys) - hw, w: Math.max(...xs) - Math.min(...xs) + 2 * hw, h: Math.max(...ys) - Math.min(...ys) + 2 * hw };
      let len = 0; for (let i = 1; i < this.path.length; i++) len += Math.hypot(this.path[i][0] - this.path[i - 1][0], this.path[i][1] - this.path[i - 1][1]);
      this.dur = o.dur ?? clamp(len / 1400, 0.5, 1.8) + (o.tone ? 0.5 : 0);
      this.finish();
    }
    cacheBox() { return pad(this.box, this.width + 40); }
    layerCache(which) {
      this._lc = this._lc || {};
      if (!this._lc[which]) {
        const bx = this.cacheBox(), k = this.res, cv = canvas(bx.w * k, bx.h * k), c = cv.getContext('2d');
        c.scale(k, k); c.translate(-bx.x, -bx.y);
        if (which === 'wash') { if (this.o.tone) washPoly(c, this.pts, { smooth: !!this.o.smooth, tone: this.o.tone, color: this.o.color, blots: this.o.blots ?? 3, paper: this.o.paper ?? false, seed: this.seed }); }
        else if (this.width > 0) brush(c, this.o.open ? this.pts : [...this.pts, this.pts[0]], { width: this.width, ink: this.o.ink ?? 0.88, dry: this.o.dry ?? 0.45, color: this.o.lineColor ?? this.o.color, press: 0.06, taper: 0.25, tail: 0.4, nail: this.o.nail, seed: this.seed + 1 });
        this._lc[which] = { cv, bx, k };
      }
      return this._lc[which];
    }
    draw(ctx, t) {
      if (t < this.start) return;
      const fade = this.fadeAt(t);
      if (fade <= 0.001) return;
      const q = this.q(t), Lw = this.layerCache('wash'), Ll = this.layerCache('line');
      if (q >= 1 || this.enter !== 'draw') { const a = q >= 1 ? 1 : ease.out(q); this.blit(ctx, t, Lw.cv, Lw.bx, fade * a); this.blit(ctx, t, Ll.cv, Ll.bx, fade * a); return; }
      const ql = clamp(q / (this.o.tone ? 0.65 : 1)), qw = clamp((q - 0.45) / 0.55);
      if (qw > 0 && this.o.tone) this.blit(ctx, t, Lw.cv, Lw.bx, fade * ease.inOut(qw), (1 - qw) * 5);
      const tc = this.temp(Ll), n = Math.max(2, Math.ceil(this.path.length * ql));
      tc.lineCap = 'round'; tc.lineJoin = 'round'; tc.lineWidth = this.maskW; tc.strokeStyle = '#000';
      tc.beginPath(); for (let i = 0; i < n; i++) i ? tc.lineTo(this.path[i][0], this.path[i][1]) : tc.moveTo(this.path[i][0], this.path[i][1]); tc.stroke();
      this.blit(ctx, t, this.masked(Ll, tc), Ll.bx, fade);
    }
  }

  // ---- calligraphy written stroke by stroke, in real stroke order (Make Me a Hanzi data via hanzi-writer-data, Arphic Public License) ----
  const STROKES = new Map();
  function loadStrokes(ch) {
    if (STROKES.has(ch)) return STROKES.get(ch).p;
    const ent = { data: null };
    const urls = ['https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/', 'https://unpkg.com/hanzi-writer-data@2.0.1/'].map((u) => u + encodeURIComponent(ch) + '.json');
    ent.p = (async () => {
      for (const u of urls) {
        try {
          const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000);
          const r = await fetch(u, { signal: ctl.signal });
          clearTimeout(tm);
          if (!r.ok) continue;
          const j = await r.json();
          ent.data = { paths: j.strokes.map((d) => new Path2D(d)), medians: j.medians, lens: j.medians.map((m) => { let l = 0; for (let i = 1; i < m.length; i++) l += Math.hypot(m[i][0] - m[i - 1][0], m[i][1] - m[i - 1][1]); return l + 120; }) };
          return;
        } catch (e) { /* try the next mirror; without data the character is written with the font */ }
      }
    })();
    STROKES.set(ch, ent);
    return ent.p;
  }
  class Write extends Text {
    constructor(b, str, o = {}) {
      super(b, str, { calli: true, font: 'brush', speed: 1 / (o.charDur ?? 1.1), ...o });
      this.kind = 'calligraphy';
      for (const c of this.cells) if (/[一-鿿]/.test(c.ch)) b.pending.push(loadStrokes(c.ch));
    }
    glyph(c, cl, fn) {   // run fn(data) in the 1024-unit glyph space of a cell (y up), or return false without data
      const ent = STROKES.get(cl.ch), d = ent && ent.data;
      if (!d) return false;
      const k = this.size / 1024, left = cl.x + (cl.w - this.size) / 2, top = cl.y + (cl.h - this.size) / 2;
      c.save(); c.translate(left, top); c.scale(k, -k); c.translate(0, -900); fn(d); c.restore();
      return true;
    }
    paint(c) {
      const bx = this.cacheBox(), k = this.res, off = canvas(bx.w * k, bx.h * k), g = off.getContext('2d');
      g.scale(k, k); g.translate(-bx.x, -bx.y);
      const ink = this.o.ink ?? 0.95;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const cl of this.cells) {
        if (/\s/.test(cl.ch)) continue;
        g.fillStyle = `rgba(${col(cl.color || this.color)},${ink})`;
        g.strokeStyle = g.fillStyle; g.lineJoin = 'round'; g.lineWidth = this.o.weight ?? 26;
        if (!this.glyph(g, cl, (d) => d.paths.forEach((pth) => { g.fill(pth); g.stroke(pth); }))) { g.font = `${this.size}px ${FONTS[this.font] || this.font}`; g.fillText(cl.ch, cl.x + cl.w / 2, cl.y + cl.h / 2); }
      }
      glyphTexture(g, this.box, this.size, this.o.dry ?? 0.35, hashStr(this.label) + 5);
      c.save(); c.globalAlpha = 0.32; c.filter = 'blur(2.2px)'; c.drawImage(off, bx.x, bx.y, bx.w, bx.h); c.restore();
      c.save(); if (this.o.rough !== false) c.filter = 'url(#ink-rough)'; c.drawImage(off, bx.x, bx.y, bx.w, bx.h); c.restore();
    }
    revealed(c, q) {
      if (q >= 1) return c.cv;
      if (q <= 0) return null;
      const tc = this.temp(c), nz = noise1(7);
      tc.fillStyle = '#000'; tc.strokeStyle = '#000'; tc.lineCap = 'round'; tc.lineJoin = 'round';
      for (const cl of this.cells) {
        const qi = clamp((q - cl.t0) / (cl.t1 - cl.t0));
        if (qi <= 0) continue;
        const ok = this.glyph(tc, cl, (d) => {
          // each stroke in turn: finished strokes whole, the current one revealed along its centre line, clipped to its own shape
          const total = d.lens.reduce((a, l) => a + l, 0);
          let budget = total * qi;
          d.paths.forEach((pth, i) => {
            if (budget <= 0) return;
            const len = d.lens[i];
            const wt = this.o.weight ?? 26;
            if (budget >= len) { tc.fill(pth); tc.lineWidth = wt + 2; tc.stroke(pth); budget -= len; return; }
            const m = d.medians[i], want = budget;
            // the current stroke: its own (thickened) shape, revealed along its centre line — drawn on a scratch layer, then added to the mask
            const sc = this._sc || (this._sc = canvas(tc.canvas.width, tc.canvas.height)), sx = sc.getContext('2d');
            if (sc.width !== tc.canvas.width || sc.height !== tc.canvas.height) { sc.width = tc.canvas.width; sc.height = tc.canvas.height; }
            sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, sc.width, sc.height);
            sx.setTransform(tc.getTransform()); sx.fillStyle = '#000'; sx.strokeStyle = '#000'; sx.lineJoin = 'round'; sx.lineCap = 'round';
            sx.fill(pth); sx.lineWidth = wt + 2; sx.stroke(pth);
            sx.globalCompositeOperation = 'destination-in'; sx.lineWidth = 200; sx.beginPath(); sx.moveTo(m[0][0], m[0][1]);
            let acc = 0;
            for (let j = 1; j < m.length; j++) {
              const dd = Math.hypot(m[j][0] - m[j - 1][0], m[j][1] - m[j - 1][1]);
              if (acc + dd > want) { const f = (want - acc) / dd; sx.lineTo(m[j - 1][0] + (m[j][0] - m[j - 1][0]) * f, m[j - 1][1] + (m[j][1] - m[j - 1][1]) * f); break; }
              sx.lineTo(m[j][0], m[j][1]); acc += dd;
            }
            sx.stroke();
            tc.save(); tc.setTransform(1, 0, 0, 1, 0, 0); tc.drawImage(sc, 0, 0); tc.restore();
            budget = 0;
            return;
          });
        });
        if (ok) continue;
        const pd = cl.w * 0.12, X = cl.x - pd, Y = cl.y - pd, Wd = cl.w + 2 * pd, Ht = cl.h + 2 * pd;   // no stroke data: diagonal front
        if (qi >= 1) { tc.fillRect(X, Y, Wd, Ht); continue; }
        const qq = qi * 1.08 - 0.04, g = cl.w * 0.08;
        tc.beginPath(); tc.moveTo(X, Y); tc.lineTo(X + Wd, Y);
        for (let x = Wd; x >= 0; x -= Math.max(2, Wd / 30)) tc.lineTo(X + x, Y + ((qq - 0.35 * x / Wd) / 0.65) * Ht + (nz(x * 0.08 + cl.x) - 0.5) * g);
        tc.closePath(); tc.fill();
      }
      return this.masked(c, tc);
    }
  }

  // ---- image / video clip, mounted on the scroll (needs media.js and scripts/assets.mjs) ----
  class Picture extends Item {
    constructor(b, src, o = {}) {
      super(b, { kind: 'image', ...o });
      if (!window.MEDIA) throw new Error('Images need lib/media.js: add <script src="lib/media.js"></script> and <script src="assets/manifest.js"></script> to index.html');
      this.m = MEDIA.source(src);
      this.label = this.m.label;
      const ox = this.hud ? 0 : this.ox, w = o.w ?? (o.h ? (o.h * this.m.w) / this.m.h : 760), h = o.h ?? (w * this.m.h) / this.m.w;
      this.box = { x: (o.x ?? b.W / 2) - (o.align === 'center' ? w / 2 : 0) + ox, y: o.y ?? 200, w, h };
      this.tone = o.tone ?? 'ink';
      this.enter = o.enter ?? 'wash';
      this.dur = o.dur ?? 0.9;
      this.play = timeOf(o.play) ?? this.start;
      if (this.m.clip) this.clipEnd = this.m.endAt(this.play);
      this.el = new Image();
      this.finish();
    }
    draw(ctx, t) {
      if (t < this.start) return;
      const fade = this.fadeAt(t);
      if (fade <= 0.001) return;
      MEDIA.setImg(this.el, this.m.url(t, this.play));
      if (!this.el.complete || !this.el.naturalWidth) return;
      const q = this.q(t), b = this.box, [dx, dy] = this.offsetAt(t);
      ctx.save(); ctx.globalAlpha = fade * (q < 1 ? ease.out(q) : 1); ctx.translate(dx, dy);
      if (this.o.frame !== 'none') {   // mounting: silk border and a thin dark edge
        const m = Math.max(10, b.w * 0.03);
        ctx.fillStyle = 'rgba(214,198,166,0.55)'; ctx.fillRect(b.x - m, b.y - m, b.w + 2 * m, b.h + 2 * m);
        ctx.strokeStyle = `rgba(${INK},0.55)`; ctx.lineWidth = 1.6; ctx.strokeRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
      }
      if (this.tone === 'ink') { ctx.filter = 'grayscale(1) contrast(1.12) sepia(0.18)'; ctx.globalCompositeOperation = 'multiply'; }
      else if (this.tone === 'sepia') { ctx.filter = 'sepia(0.55) contrast(1.05)'; ctx.globalCompositeOperation = 'multiply'; }
      ctx.drawImage(this.el, b.x, b.y, b.w, b.h);
      ctx.restore();
    }
    lint(add) { if (this.clipEnd && this.gone() < this.clipEnd - 0.3) add('warn', this.gone(), this, `video clip disappears before it finishes playing (it plays until ${this.clipEnd.toFixed(1)}s)`); }
  }

  // ---- rolling number ----
  class Num extends Item {
    constructor(b, x, y, o = {}) {
      super(b, { kind: 'number', ...o });
      const ox = this.hud ? 0 : this.ox;
      this.from = o.from ?? 0; this.to = o.to ?? 100; this.size = o.size ?? 120; this.font = o.font ?? 'brush';
      this.fmt = (v) => `${o.prefix ?? ''}${v.toLocaleString('en-US', { minimumFractionDigits: o.decimals ?? 0, maximumFractionDigits: o.decimals ?? 0 })}${o.suffix ?? ''}`;
      const m = b.mctx; m.font = `${this.size}px ${FONTS[this.font]}`;
      const w = m.measureText(this.fmt(this.to)).width;
      this.align = o.align ?? 'left';
      this.box = { x: x + ox - (this.align === 'center' ? w / 2 : this.align === 'right' ? w : 0), y, w, h: this.size * 1.15 };
      this.textBox = this.box; this.label = this.fmt(this.to);
      b.useText(this.label + '0123456789');
      this.dur = o.dur ?? 1.2;
      this.enter = 'none';
      this.finish();
    }
    draw(ctx, t) {
      if (t < this.start) return;
      const fade = this.fadeAt(t);
      if (fade <= 0.001) return;
      const v = lerp(this.from, this.to, ease.outQuart(this.q(t))), [dx, dy] = this.offsetAt(t), b = this.box;
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(dx, dy);
      ctx.font = `${this.size}px ${FONTS[this.font]}`; ctx.textAlign = this.align; ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(${col(this.o.color)},0.95)`;
      ctx.fillText(this.fmt(Math.round(v * 10 ** (this.o.decimals ?? 0)) / 10 ** (this.o.decimals ?? 0)), this.align === 'center' ? b.x + b.w / 2 : this.align === 'right' ? b.x + b.w : b.x, b.y + b.h / 2);
      ctx.restore();
    }
  }

  // ---- figures: three cached layers per pose; the head is repainted per expression / mouth / blink ----
  // Pose keys: a named pose ('stand') or a gait step ('walk#3' = step 3 of STEPS)
  const STEPS = 12;
  const resolvePose = (key) => { const m = /^(\w+)#(\d+)$/.exec(key); return m ? GAITS[m[1]].pose(+m[2] / STEPS) : key; };
  // Reveal recorded brush paths in order (the "drawn line by line" entrance); tc carries the world transform
  function strokeMask(tc, strokes, q) {
    let budget = strokes.total * q;
    tc.lineCap = 'round'; tc.lineJoin = 'round'; tc.strokeStyle = '#000';
    for (const st of strokes) {
      if (budget <= 0) break;
      tc.lineWidth = st.w * 2.6 + 6;
      tc.beginPath(); tc.moveTo(st.path[0][0], st.path[0][1]);
      let acc = 0;
      for (let i = 1; i < st.path.length; i++) {
        const p0 = st.path[i - 1], p1 = st.path[i], d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        if (acc + d > budget) { const f = (budget - acc) / Math.max(d, 1e-6); tc.lineTo(p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f); acc = budget; break; }
        tc.lineTo(p1[0], p1[1]); acc += d;
      }
      tc.stroke();
      budget -= st.len + strokes.gap;
    }
  }
  function prepStrokes(list) {
    const out = list.filter((s) => s.path && s.path.length > 1).map((s) => { let len = 0; for (let i = 1; i < s.path.length; i++) len += Math.hypot(s.path[i][0] - s.path[i - 1][0], s.path[i][1] - s.path[i - 1][1]); return { ...s, len, y: Math.min(...s.path.map((p) => p[1])) }; });
    out.sort((a, c) => a.y - c.y);   // top to bottom, the way a figure is usually sketched
    const avg = out.reduce((a, s) => a + s.len, 0) / Math.max(1, out.length);
    out.gap = avg * 0.15;
    out.total = out.reduce((a, s) => a + s.len + out.gap, 0);
    return out;
  }

  // ---- figures: three cached layers per pose; the head is repainted per expression / mouth / blink; gaits cycle with movement ----
  class Figure extends Item {
    constructor(b, spec, o = {}) {
      super(b, { kind: 'figure', ...o });
      this.spec = figSpec(spec);
      this.label = o.name || '';
      const ox = this.hud ? 0 : this.ox;
      this.base = { x: (o.x ?? b.W / 2) + ox, y: o.y ?? b.H * 0.926, size: o.size ?? 600, facing: o.facing ?? 1, seed: o.seed ?? (b.nextSeed() % 100000), wind: o.wind };
      this.poses = [{ at: -1e9, name: o.pose || 'stand', dur: 0 }];
      this.exprs = [{ at: -1e9, name: o.expr || 'neutral' }];
      this.talks = [];
      this.turns = [];
      this.blink = o.blink !== false;
      this.enter = o.enter ?? 'draw';
      this.dur = o.dur ?? (this.enter === 'draw' ? 1.4 : 0.9);
      this.layers = new Map();
      this.box = figureBoxes(this.spec, this.opts(this.poses[0].name)).body;
      const sx = this.hud ? 0 : this.ox;
      this.clipRect = { x: sx - 500, y: -500, w: b.W + 1000, h: b.H + 1000 };
      this.finish();
    }
    get h() { return this.base.size / 7.4; }
    opts(poseKey, expr, talk = 0, facing = this.base.facing) { return { ...this.base, facing, pose: resolvePose(poseKey), expr, talk }; }
    // turn round in place (facing flips), cross-fading over dur
    turn(at, dur = 0.3) { this.turns.push({ at: timeOf(at), dur }); this.turns.sort((a, c) => a.at - c.at); return this; }
    // turn toward another figure at time at (positions at that moment, including moves already set up); no turn if already facing it
    faceTo(at, other) { at = timeOf(at); const me = this.base.x + this.offsetAt(at)[0], it = other.base.x + other.offsetAt(at)[0]; if (this.facingAt(at).facing !== (it >= me ? 1 : -1)) this.turn(at); return this; }
    facingAt(t) {
      let f = this.base.facing, prev = null, k = 1;
      for (const x of this.turns) if (x.at <= t) { prev = f; f = -f; k = x.dur > 0 ? clamp((t - x.at) / x.dur) : 1; }
      return { facing: f, prevFacing: k < 1 ? prev : null, kf: k };
    }
    pose(at, name, dur = 0.35) { at = timeOf(at); if (!POSES[name] && !GAITS[name]) throw new Error(`Unknown pose: "${name}". Available: ${Object.keys(POSES).join(', ')}`); this.poses.push({ at, name, dur }); this.poses.sort((a, c) => a.at - c.at); return this; }
    expr(at, name) { at = timeOf(at); if (!FACES[name]) throw new Error(`Unknown expression: "${name}". Available: ${Object.keys(FACES).join(', ')}`); this.exprs.push({ at, name }); this.exprs.sort((a, c) => a.at - c.at); return this; }
    // The mouth opens and closes with the words of these narration lines (o.from / o.to: only part of a line)
    say(ids, o = {}) {
      const T = this.b.T;
      for (const id of [].concat(ids)) {
        const l = T(id), t0 = o.from ? T.word(id, o.from) : -Infinity, t1 = o.to ? T.wordEnd(id, o.to) : Infinity;
        const ws = (l.words && l.words.length ? l.words : [{ text: l.text, start: l.start, end: l.end }]).filter((w) => w.start >= t0 - 0.01 && w.end <= t1 + 0.01);
        if (!ws.length) (this.sayWarn = this.sayWarn || []).push(`say('${id}') matched no words; the mouth will not move`);
        ws.forEach((w) => {
          const latin = /^[A-Za-z'’\-]+$/.test(w.text);
          const n = latin ? Math.max(1, Math.round(w.text.length / 3)) : Math.max(1, w.text.replace(/[^一-鿿\w]/g, '').length);
          this.talks.push({ start: w.start, end: w.end, n });
        });
      }
      this.talks.sort((a, c) => a.start - c.start);
      return this;
    }
    clip(bb) {
      const x0 = Math.max(bb.x, this.clipRect.x), y0 = Math.max(bb.y, this.clipRect.y), x1 = Math.min(bb.x + bb.w, this.clipRect.x + this.clipRect.w), y1 = Math.min(bb.y + bb.h, this.clipRect.y + this.clipRect.h);
      return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
    }
    layer(kind, pose, expr, mouth, shut, facing = this.base.facing) {
      const key = (kind === 'head' ? `head|${pose}|${expr}|${mouth}|${shut}` : `${kind}|${pose}`) + `|${facing}`;
      if (this.layers.has(key)) return this.layers.get(key);
      const o = this.opts(pose, shut ? { ...FACES[expr], eye: 'shut' } : expr, [0, 0.3, 0.6, 0.9][mouth], facing);
      const boxes = figureBoxes(this.spec, o), bx = this.clip(kind === 'head' ? boxes.head : boxes.body);
      let L = null;
      if (bx) {
        const k = this.res, cv = canvas(bx.w * k, bx.h * k), c = cv.getContext('2d');
        c.scale(k, k); c.translate(-bx.x, -bx.y);
        paintFigure(c, this.spec, o, kind);
        L = { cv, bx, k };
      }
      this.layers.set(key, L);
      return L;
    }
    // line drawing of the whole figure (no washes) plus every stroke, for the "drawn line by line" entrance
    lineArt(pose, expr, facing = this.base.facing) {
      const key = `lines|${pose}|${expr}|${facing}`;
      if (this.layers.has(key)) return this.layers.get(key);
      const o = { ...this.opts(pose, expr, 0, facing), noWash: true, rec: [] }, bx = this.clip(figureBoxes(this.spec, o).body);
      let L = null;
      if (bx) {
        const k = this.res, cv = canvas(bx.w * k, bx.h * k), c = cv.getContext('2d');
        c.scale(k, k); c.translate(-bx.x, -bx.y);
        paintFigure(c, this.spec, o, 'all');
        L = { cv, bx, k, strokes: prepStrokes(o.rec) };
      }
      this.layers.set(key, L);
      return L;
    }
    // distance walked so far → step of the gait cycle (so the feet don't slide)
    gaitAt(t, name) {
      const G = GAITS[name];
      if (!G || !G.stride) return null;
      let dist = 0;
      for (const m of this.moves) dist += Math.hypot(m.dx, m.dy) * progress(t, m.at, m.dur, m.e);
      if (dist < 1 && !this.o.cycle) return null;
      const ph = this.o.cycle && dist < 1 ? t / (this.o.cycleDur ?? 1.0) : dist / (G.stride * this.h * (this.spec.age === 'kid' ? KID_BODY : 1));
      const step = ((Math.floor(ph * STEPS) % STEPS) + STEPS) % STEPS;
      return { key: `${name}#${step}`, bob: (G.pose(step / STEPS).bob || 0) * this.h };
    }
    stateAt(t) {
      let pi = 0; for (let i = 0; i < this.poses.length; i++) if (this.poses[i].at <= t) pi = i;
      const p = this.poses[pi], prev = pi > 0 ? this.poses[pi - 1] : null, k = prev && p.dur > 0 ? clamp((t - p.at) / p.dur) : 1;
      let expr = this.exprs[0].name; for (const e of this.exprs) if (e.at <= t) expr = e.name;
      let mouth = 0;
      const w = this.talks.find((x) => t >= x.start && t < x.end);
      if (w) mouth = Math.round(Math.abs(Math.sin((Math.PI * w.n * (t - w.start)) / Math.max(0.05, w.end - w.start))) * 3);
      const per = 3.4 + (this.base.seed % 13) / 10, ph = (this.base.seed % 7) / 7 * per;
      const eye = FACES[expr].eye, shut = this.blink && eye !== 'arc' && eye !== 'shut' && ((t + ph) % per) < 0.13 ? 1 : 0;
      const g = this.gaitAt(t, p.name), static_ = (n) => (POSES[n] ? n : n === 'run' || n === 'walk' ? n : 'stand');
      return { pose: g ? g.key : static_(p.name), prevPose: k < 1 && prev ? static_(prev.name) : null, k, expr, mouth, shut, bob: g ? g.bob : 0, ...this.facingAt(t) };
    }
    composite(ctx, st, pose, alpha, facing = st.facing) {
      ctx.save(); ctx.globalAlpha *= alpha;
      for (const kind of ['back', 'head', 'front']) {
        const L = this.layer(kind, pose, st.expr, st.mouth, st.shut, facing);
        if (L) ctx.drawImage(L.cv, L.bx.x, L.bx.y, L.bx.w, L.bx.h);
      }
      ctx.restore();
    }
    draw(ctx, t) {
      if (t < this.start) return;
      const fade = this.fadeAt(t);
      if (fade <= 0.001) return;
      const q = this.q(t), st = this.stateAt(q < 1 ? this.start : t), [dx, dy0, s] = this.offsetAt(t);
      const dy = dy0 - st.bob;
      const bb = this.box, cx = bb.x + bb.w / 2, cy = bb.y + bb.h;
      const paintAll = (g) => {
        if (st.prevFacing) { this.composite(g, st, st.prevPose || st.pose, 1 - st.kf, st.prevFacing); this.composite(g, st, st.pose, st.kf); }
        else if (st.prevPose) { this.composite(g, st, st.prevPose, 1 - st.k); this.composite(g, st, st.pose, st.k); }
        else this.composite(g, st, st.pose, 1);
      };
      ctx.save();
      ctx.translate(cx + dx, cy + dy); ctx.scale(s, s); ctx.translate(-cx, -cy);
      if (q >= 1) { ctx.globalAlpha = fade; paintAll(ctx); }
      else if (this.enter === 'draw') {
        // outlines first, stroke by stroke from the top down, then the ink washes soak in
        const A = this.lineArt(st.pose, st.expr, st.facing);
        if (A) {
          const tc = this.temp({ cv: A.cv, bx: A.bx, k: A.k });
          strokeMask(tc, A.strokes, clamp(q / 0.62));
          tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'source-in'; tc.drawImage(A.cv, 0, 0);
          ctx.globalAlpha = fade; ctx.drawImage(this._t, A.bx.x, A.bx.y, A.bx.w, A.bx.h);
        }
        const qw = clamp((q - 0.5) / 0.5);
        if (qw > 0) { ctx.globalAlpha = fade * ease.inOut(qw); paintAll(ctx); }
      } else {
        // wash in (soft focus to sharp) or wipe down like painting from top to bottom
        const L = this.layer('back', st.pose, st.expr, 0, 0, st.facing), bx = L ? L.bx : bb;
        const c = { cv: { width: Math.ceil(bx.w * this.res), height: Math.ceil(bx.h * this.res) }, bx, k: this.res };
        const tc = this.temp(c);
        paintAll(tc);
        if (this.enter === 'wipe') {
          const m = canvas(this._t.width, this._t.height), mc = m.getContext('2d'), nz = noise1(5), front = (q * 1.1 - 0.05) * m.height;
          mc.fillStyle = '#000'; mc.beginPath(); mc.moveTo(0, 0);
          for (let x = 0; x <= m.width; x += 8) mc.lineTo(x, front + (nz(x * 0.02) - 0.5) * 60);
          mc.lineTo(m.width, 0); mc.closePath(); mc.fill();
          tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'destination-in'; tc.drawImage(m, 0, 0);
        } else ctx.filter = `blur(${((1 - q) * 6).toFixed(1)}px)`;
        ctx.globalAlpha = fade * (this.enter === 'wipe' ? 1 : ease.out(q));
        ctx.drawImage(this._t, bx.x, bx.y, bx.w, bx.h);
      }
      ctx.restore();
    }
    lint(add) { for (const w of this.sayWarn || []) add('warn', this.start, this, w); }
  }

  // ---- horse, optionally with a rider; the gallop cycles with the distance travelled ----
  class Horse extends Item {
    constructor(b, o = {}) {
      super(b, { kind: 'horse', ...o });
      const ox = this.hud ? 0 : this.ox;
      this.base = { x: (o.x ?? b.W / 2) + ox, y: o.y ?? b.H * 0.926, size: o.size ?? 420, facing: o.facing ?? 1, tone: o.tone ?? 0.55, seed: o.seed ?? (b.nextSeed() % 100000), saddle: o.saddle };
      this.gait = o.gait ?? 'gallop';
      this.rider = o.rider ? { spec: figSpec(o.rider), expr: o.riderExpr ?? 'neutral', seed: o.riderSeed ?? (b.nextSeed() % 100000) } : null;
      this.label = o.name || '';
      this.enter = o.enter ?? 'none';
      this.dur = o.dur ?? (this.enter === 'none' ? 0 : 0.9);
      const u = this.base.size / 10;
      this.box = { x: this.base.x - 6 * u, y: this.base.y - (this.rider ? 12.8 : 10.4) * u, w: 12 * u, h: (this.rider ? 13.1 : 10.7) * u };
      this.frames = new Map();
      this.finish();
    }
    stepAt(t) {
      const G = HORSE_GAITS[this.gait];
      if (!G.stride) return 0;
      let dist = 0;
      for (const m of this.moves) dist += Math.hypot(m.dx, m.dy) * progress(t, m.at, m.dur, m.e);
      const ph = dist < 1 ? (this.o.cycle ? t / (this.o.cycleDur ?? 0.5) : 0) : dist / (G.stride * this.base.size / 10);
      return ((Math.floor(ph * STEPS) % STEPS) + STEPS) % STEPS;
    }
    frame(step) {
      if (this.frames.has(step)) return this.frames.get(step);
      const bx = pad(this.box, 20), k = this.res, cv = canvas(bx.w * k, bx.h * k), c = cv.getContext('2d');
      c.scale(k, k); c.translate(-bx.x, -bx.y);
      const ho = { ...this.base, gait: this.gait, phase: step / STEPS };
      paintHorse(c, ho, 'far'); const r = paintHorse(c, ho, 'body'); paintHorse(c, ho, 'near');
      if (this.rider) {
        const rs = this.base.size * 0.8, hr = rs / 7.4, ro = { x: r.saddle[0], y: r.saddle[1] + 3.6 * hr, size: rs, facing: this.base.facing, pose: GAITS.ride.pose(step / STEPS), expr: this.rider.expr, seed: this.rider.seed };
        paintFigure(c, this.rider.spec, ro, 'all');
        const G = figureFrame(this.rider.spec, ro), wr = G.T(G.P.near[1]);
        brush(c, [r.bit, [(r.bit[0] + wr[0]) / 2, Math.max(r.bit[1], wr[1]) + hr * 0.25], wr], { width: Math.max(1.5, hr * 0.03), ink: 0.8, dry: 0.2, seed: 77, nail: false });
      }
      const F = { cv, bx, k };
      this.frames.set(step, F);
      return F;
    }
    draw(ctx, t) {
      if (t < this.start) return;
      const fade = this.fadeAt(t);
      if (fade <= 0.001) return;
      const F = this.frame(this.stepAt(t)), q = this.q(t);
      this.blit(ctx, t, F.cv, F.bx, fade * (q < 1 && this.enter !== 'none' ? ease.out(q) : 1), q < 1 && this.enter === 'wash' ? (1 - q) * 6 : 0);
    }
  }

  function groupOf(items, kind = 'group') {
    items = items.filter(Boolean);
    return {
      kind, items,
      get start() { return Math.min(...items.map((i) => i.start)); },
      get end() { return Math.max(...items.map((i) => i.end)); },
      get box() { return unionBox(items.map((i) => i.box)); },
      erase(at, dur) { items.forEach((i) => i.erase(at, dur)); return this; },
      move(at, dx, dy, dur, e) { items.forEach((i) => i.move(at, dx, dy, dur, e)); return this; },
      pulse(at, amt, dur) { items.forEach((i) => i.pulse(at, amt, dur)); return this; },
    };
  }

  // ================= Board: one long handscroll =================
  const INK_NO_INFO = new Set(['underline', 'water', 'paper band', 'moon', 'ink blot', 'mountains', 'seal']);
  class Board {
    constructor(o = {}) {
      this.T = o.T;
      this.W = o.width || EV.W || 1920; this.H = o.height || EV.H || 1080;   // frame size follows EV.composition (?aspect=9:16 → 1080×1920)
      this.res = o.res ?? 1.25;                 // cache resolution (keeps text crisp when the camera pushes in a little)
      this.items = []; this.secs = []; this.sec = null; this.cams = []; this.pending = [];
      if (EV.infoSource) EV.infoSource((t) => this.infoAt(t));   // information-density check (render --check)
      this.cursor = 0.3; this.gap = o.gap ?? 0.15;
      this.secGap = o.sectionGap ?? 420;         // bare paper between two sections of the scroll
      this._seed = hashStr(o.seed || 'ink'); this.seedStr = String(o.seed || 'ink');
      this.stage = o.stage || document.getElementById('stage');
      this.stage.style.background = PAPER; document.body.style.background = PAPER;
      this.cv = canvas(this.W, this.H); this.cv.style.display = 'block'; this.stage.appendChild(this.cv);
      this.ctx = this.cv.getContext('2d');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
      svg.innerHTML = '<filter id="ink-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>';
      this.stage.appendChild(svg);
      // every string drawn on the canvas also goes into this hidden node, so core.js loads the font slices it needs
      this.sink = document.createElement('div'); this.sink.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre';
      this.stage.appendChild(this.sink);
      this.mctx = canvas(8, 8).getContext('2d');
      this.fonts = FONTS;
      if (o.captions !== false && this.T && this.T.lines.length) this.setupCaptions(o.captionMax || (this.H > this.W ? 14 : 20));
      if (o.chapters !== false && this.T && this.T.chapters.length >= 2) this.setupChapters();
    }
    // core.js awaits this after build: stroke-order data and other downloads started while building
    ready() { return Promise.all(this.pending); }
    nextSeed() { return (this._seed = (Math.imul(this._seed, 1664525) + 1013904223) >>> 0); }
    add(item) { this.items.push(item); this.cursor = item.end + this.gap; return item; }
    at(t) { this.cursor = timeOf(t); return this; }
    wait(s) { this.cursor += s; return this; }
    useText(s) { this.sink.textContent += s; }

    // ---------- sections of the scroll ----------
    // transition: scroll (the camera pans along the scroll, default) / ink (ink floods the frame and clears on the new section) / cut
    section(at, o = {}) {
      if (at && typeof at === 'object' && !('end' in at)) { o = at; at = o.at; }
      at = timeOf(at) ?? this.cursor;
      const prev = this.secs[this.secs.length - 1];
      const DUR = { scroll: 1.3, ink: 1.0, cut: 0 };
      const type = prev ? (o.transition ?? 'scroll') : 'none';
      if (prev && !(type in DUR)) throw new Error(`Unknown transition: "${type}". Available: ${Object.keys(DUR).join(', ')}`);
      const dur = prev ? (o.dur ?? DUR[type]) : 0;
      const x = prev ? prev.x + this.W + (o.gap ?? this.secGap) : 0;   // gap: bare scroll before this section (room for a long tracking shot)
      const s = { idx: this.secs.length, x, start: prev ? at : Math.min(at, 0), dur, type, title: o.title || '', cover: !!o.cover };
      s.ready = type === 'ink' ? s.start + dur * 0.55 : s.start + dur;
      if (prev) this.cams.push({ at: type === 'ink' ? at + dur * 0.5 : at, dur: type === 'scroll' ? dur : 0, x: x + this.W / 2, y: this.H / 2, zoom: 1, e: ease.inOutSine });
      this.secs.push(s);
      this.sec = s;
      this.cursor = Math.max(this.cursor, s.ready + 0.1);
      return s;
    }
    // Camera within the current section: push in on an item / region (keeps clear of the chapter bar and captions); null = back to the whole section
    focus(target, o = {}) {
      const at = timeOf(o.at) ?? this.cursor, dur = o.dur ?? 0.9, W = this.W, H = this.H, s = o.section || this.sec;
      if (!target) this.cams.push({ at, dur, x: s.x + W / 2, y: H / 2, zoom: 1, e: ease.inOut });
      else {
        const b = Array.isArray(target) ? unionBox(target.map(boxOf)) : boxOf(target);
        const top = this.chapterZone || 0, bottom = this.caps ? this.capZone + 10 : 0, availH = H - top - bottom, pd = o.pad ?? 80;
        const zoom = o.zoom ?? Math.min(1.6, W / (b.w + pd * 2), availH / (b.h + pd * 2));
        this.cams.push({ at, dur, x: b.x + b.w / 2, y: b.y + b.h / 2 - (top + availH / 2 - H / 2) / zoom, zoom, e: ease.inOut });
      }
      this.cams.sort((a, c) => a.at - c.at);
      this.cursor = Math.max(this.cursor, at + dur);
      return this;
    }
    // Camera to a point of the current section (local coordinates): { x, y, zoom, at, dur }
    view(o = {}) {
      const at = timeOf(o.at) ?? this.cursor, dur = o.dur ?? 1.2, s = this.sec;
      this.cams.push({ at, dur, x: (o.x ?? this.W / 2) + s.x, y: o.y ?? this.H / 2, zoom: o.zoom ?? 1, e: o.ease || ease.inOut });
      this.cams.sort((a, c) => a.at - c.at);
      this.cursor = Math.max(this.cursor, at + dur);
      return this;
    }
    camAt(t) {
      let c = { x: this.W / 2, y: this.H / 2, zoom: 1 };
      for (const m of this.cams) {
        if (t <= m.at) break;
        if (m.follow) {
          const te = Math.min(t, m.at + m.dur), b = m.follow.box, [fx, fy] = m.follow.offsetAt(te), q = progress(t, m.at, m.blend, ease.inOut);
          c = { x: lerp(c.x, b.x + b.w / 2 + fx + m.dx, q), y: m.dy === undefined ? c.y : lerp(c.y, b.y + b.h / 2 + fy + m.dy, q), zoom: c.zoom };
          continue;
        }
        const q = progress(t, m.at, m.dur, m.e || ease.inOut);
        c = { x: lerp(c.x, m.x, q), y: lerp(c.y, m.y, q), zoom: Math.exp(lerp(Math.log(c.zoom), Math.log(m.zoom), q)) };
      }
      return c;
    }

    // ---------- drawing API (coordinates are local to the current section: 0–1920 × 0–1080) ----------
    text(str, o = {}) { return new Text(this, str, o); }
    calli(str, o = {}) { return new Text(this, str, { calli: true, ...o }); }
    title(str, o = {}) { return new Text(this, str, { calli: true, size: 150, ...o }); }
    stroke(pts, o = {}) { return new Stroke(this, pts, o); }
    line(x1, y1, x2, y2, o = {}) { const mx = (x1 + x2) / 2 - (y2 - y1) * (o.bend ?? 0.04), my = (y1 + y2) / 2 + (x2 - x1) * (o.bend ?? 0.04); return new Stroke(this, [[x1, y1], [mx, my], [x2, y2]], { kind: 'line', width: 7, dry: 0.45, ...o }); }
    arrow(x1, y1, x2, y2, o = {}) {
      const bend = o.bend ?? 0.12, mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
      const a = Math.atan2(y2 - my, x2 - mx), hl = o.head ?? 34, w = o.width ?? 8;
      const wing = (s) => [[x2, y2], [x2 - Math.cos(a + s * 0.5) * hl, y2 - Math.sin(a + s * 0.5) * hl]];
      return new Stroke(this, [[x1, y1], [mx, my], [x2, y2]], { kind: 'arrow', width: w, dry: 0.4, heads: [wing(1), wing(-1)], annot: true, ...o });
    }
    // 朱批: a cinnabar brush circle round an item / box (local box or item)
    circleAround(target, o = {}) {
      const b = this.localBox(target, o.part), pd = o.pad ?? 18, cx = b.x + b.w / 2, cy = b.y + b.h / 2, rx = b.w / 2 + pd, ry = b.h / 2 + pd;
      const a0 = ((o.start ?? -100) * Math.PI) / 180, sweep = ((o.sweep ?? 335) * Math.PI) / 180, nz = noise1(this.nextSeed() % 997), pts = [];
      for (let i = 0; i <= 48; i++) { const t = a0 + (sweep * i) / 48, k = 1 + (nz(i * 0.3) - 0.5) * 0.06; pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]); }
      return new Stroke(this, pts, { kind: 'circle', color: 'red', width: Math.min(16, Math.max(7, Math.min(rx, ry) * 0.09)), dry: 0.4, press: 0.06, taper: 0.45, tail: 0.25, at: o.at ?? target, annot: true, ...o });
    }
    underline(target, o = {}) {
      const b = this.localBox(target, o.part), v = target && target.vertical && !o.part;
      const pts = v ? [[b.x + b.w + 14, b.y], [b.x + b.w + 20, b.y + b.h / 2], [b.x + b.w + 14, b.y + b.h]] : [[b.x, b.y + b.h + 10], [b.x + b.w / 2, b.y + b.h + 16], [b.x + b.w, b.y + b.h + 8]];
      return new Stroke(this, pts, { kind: 'underline', color: 'red', width: 9, dry: 0.45, at: o.at ?? target, annot: true, ...o });
    }
    // 圈点: small cinnabar circles beside each character of a text (classical emphasis marks); o.part = 'some words' or [from, to]
    mark(target, o = {}) {
      const cells = target.cells.slice(...(Array.isArray(o.part) ? o.part : typeof o.part === 'string' ? [target.label.indexOf(o.part), target.label.indexOf(o.part) + o.part.length] : [0]));
      const r = Math.max(5, target.size * 0.07), ox = target.hud ? 0 : target.ox;
      const pts = cells.filter((c) => !/\s/.test(c.ch)).map((c) => target.vertical ? [c.x + c.w + r * 1.6 - ox, c.y + c.h / 2] : [c.x + c.w / 2 - ox, c.y + c.h + r * 1.4]);
      const items = pts.map(([x, y], i) => this.circleAround({ x: x - r, y: y - r, w: r * 2, h: r * 2 }, { pad: 0, width: Math.max(2.5, r * 0.35), start: -90, sweep: 350, at: (timeOf(o.at ?? target)) + i * 0.08, dur: 0.18, kind: 'mark', ...o, part: undefined }));
      return groupOf(items, 'marks');
    }
    seal(str, o = {}) { return new Seal(this, str, o); }
    // A band of bare paper laid over what is below it (local box), e.g. to frame a row of figures
    paperBand(x, y, w, h, o = {}) {
      const ox = this.sec.x, P = () => this.paperAvg || PAPER;
      return new Painted(this, 'paper band', (c) => { c.fillStyle = P(); c.fillRect(x + ox, y, w, h); c.save(); c.globalAlpha = 0.9; c.drawImage(this.paper || (this.drawPaper(this.mctx, 1, 0, 0), this.paper), 0, 0, w, h, x + ox, y, w, h); c.restore(); }, { x: x + ox, y, w, h }, { annot: true, enter: 'none', ...o });
    }
    erase(items, at, dur = 0.45) { [].concat(items).forEach((i) => i.erase(at, dur)); return this; }
    blot(x, y, r, o = {}) { return new Blot(this, x, y, r, o); }
    // landscape pieces (local coordinates)
    mountains(o = {}) {
      const ox = this.sec.x, oo = { ...o, x0: (o.x0 ?? 0) + ox, x1: (o.x1 ?? this.W) + ox, base: o.base ?? this.H * 0.833, peaks: (o.peaks || [{ x: this.W / 2, w: 300, h: 280 }]).map((p) => ({ ...p, x: p.x + ox })), seed: o.seed ?? this.nextSeed() % 9973 };
      return new Mountains(this, oo, o);
    }
    moon(x, y, r = 100, o = {}) {
      const ox = this.sec.x, oo = { x: x + ox, y, r, tone: o.tone, spread: o.spread, seed: o.seed ?? this.nextSeed() % 9973 }, R = r * (o.spread ?? 6);
      return new Painted(this, 'moon', (c) => paintMoon(c, oo), { x: x + ox - R * 1.4, y: y - R * 0.8, w: R * 2.8, h: R * 1.6 }, { annot: true, enter: 'bloom', dur: 1.6, ...o });
    }
    // water: short dry ripple strokes, brushed one after another
    water(x, y, w, o = {}) {
      const r = rng(o.seed ?? this.nextSeed()), n = o.lines ?? Math.max(4, Math.round(w / 110)), at = timeOf(o.at) ?? this.cursor, dur = o.dur ?? 1.0, items = [];
      for (let i = 0; i < n; i++) {
        const sx = x + r() * w * 0.9, sy = y + r() * (o.h ?? 80), len = 50 + r() * 100;
        items.push(this.stroke([[sx, sy], [sx + len, sy + (r() - 0.5) * 6]], { kind: 'water', width: 3 + (i % 3), ink: o.ink ?? 0.38, dry: 0.7, bleed: 0.2, at: at + (dur * i) / n, dur: dur > 0 ? 0.35 : 0, annot: true, depth: o.depth }));
      }
      this.cursor = at + dur;
      return groupOf(items, 'water');
    }
    // A ready-made landscape for a section: moon washed out of the sky, far and near mountains, water. side: where the mountains gather
    scenery(o = {}) {
      const at = timeOf(o.at) ?? this.cursor, W = this.W, right = (o.side ?? 'right') === 'right', r = rng(o.seed ?? this.nextSeed());
      // coordinates are written for 1920×1080 and scaled to the frame (landscape unchanged; portrait: x follows width, y follows height, so the mountain feet sit at 72% of the frame instead of floating mid-frame)
      const sx = W / 1920, sy = this.H / 1080, hs = Math.min(1.5, sy), X = (x) => (right ? x * sx : W - x * sx), Yb = (y) => y * sy, items = [];
      const dur = o.dur ?? 1.4, st = dur > 0 ? 1 : 0;   // pieces wash in one after another (all at once when dur is 0, e.g. on the cover)
      if (o.moon !== false) { const [mx, my, mr] = Array.isArray(o.moon) ? o.moon : [X(1470), Yb(290), 108 * Math.max(0.75, Math.min(sx, sy))]; items.push(this.moon(mx, my, mr, { at, dur, tone: o.skyTone })); }
      items.push(this.mountains({ x0: right ? 560 * sx : -40, x1: right ? W + 40 : W - 560 * sx, base: o.base ?? Yb(780), peaks: [1060, 1390, 1780].map((x, i) => ({ x: X(x), w: (240 + r() * 80) * sx, h: [240, 320, 270][i] * hs * (o.scale ?? 1) })), tone: 0.26, blur: 4, rough: 46, band: 90, texture: 0, at: at + st * 0.2, dur }));
      items.push(this.mountains({ x0: right ? 760 * sx : -40, x1: right ? W + 40 : W - 760 * sx, base: (o.base ?? Yb(780)) + 110 * sy, peaks: [980, 1560].map((x, i) => ({ x: X(x), w: (200 + r() * 80) * sx, h: [150, 230][i] * hs * (o.scale ?? 1) })), tone: 0.42, blur: 1.2, rough: 40, ridge: 4, contour: 0.45, band: 60, texture: 18, at: at + st * 0.45, dur }));
      if (o.near !== false) items.push(this.mountains({ x0: right ? 1420 * sx : -60, x1: right ? W + 60 : W - 1420 * sx, base: this.H * (H_BOTTOM / 1080), peaks: [{ x: X(1760), w: 210 * sx, h: 390 * hs * (o.scale ?? 1) }, { x: X(1990), w: 200 * sx, h: 320 * hs * (o.scale ?? 1) }], tone: 0.8, rough: 34, ridge: 11, contour: 0.85, band: 80, moss: 26, texture: 30, at: at + st * 0.7, dur }));
      if (o.water !== false) items.push(this.water((right ? 700 : 460) * sx, (o.base ?? Yb(780)) + 125 * sy, 760 * sx, { at: at + st * 0.9, dur: st * 0.8 }));
      this.cursor = at + st * 0.6;
      return groupOf(items, 'scenery');
    }
    // spec: the figure's spec object, or its name in window.CAST (characters.js); o.faceTo: another figure → start facing it
    figure(spec, o = {}) {
      if (window.EV && window.EV.castCheck) window.EV.castCheck(window.CAST, null, 'ink');
      if (typeof spec === 'string') { const s = (window.CAST || {})[spec]; if (!s) throw new Error(`No figure "${spec}" in window.CAST (characters.js)`); spec = s; }
      if (o.faceTo) o = { ...o, facing: o.faceTo.base.x >= (o.x ?? this.W / 2) ? 1 : -1 };
      return new Figure(this, spec, o);
    }
    horse(o = {}) { return new Horse(this, o); }
    // any prop or building: outline points (local), tone = wash inside (0 = outline only), open: no closing stroke
    shape(pts, o = {}) { return new Shape(this, pts, o); }
    // calligraphy written stroke by stroke in real stroke order (falls back to a writing wipe for characters without data)
    write(str, o = {}) { return new Write(this, str, o); }
    // 溅墨: a splash of ink droplets (o.color 'red' for cinnabar)
    splash(x, y, r = 120, o = {}) {
      const ox = this.hud && !o.hud ? 0 : (o.hud ? 0 : this.sec.x), cx = x + ox, rr = rng(o.seed ?? this.nextSeed()), drops = [];
      for (let i = 0; i < (o.count ?? 46); i++) {
        const a = rr() * Math.PI * 2, d = Math.pow(rr(), 0.7) * r, s0 = Math.max(1.5, (1 - d / r) * r * 0.12 * (0.4 + rr())), streak = rr() < 0.3;
        drops.push({ x: cx + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8, s: s0, a, streak });
      }
      const color = col(o.color ?? 'ink');
      return new Painted(this, 'ink splash', (c) => {
        for (const d of drops) {
          c.fillStyle = `rgba(${color},${0.75 + (d.s % 0.2)})`; c.beginPath();
          if (d.streak) c.ellipse(d.x, d.y, d.s * 2.6, d.s * 0.6, d.a, 0, Math.PI * 2); else c.arc(d.x, d.y, d.s, 0, Math.PI * 2);
          c.fill();
        }
      }, { x: cx - r * 1.2, y: y - r, w: r * 2.4, h: r * 2 }, { annot: true, enter: 'bloom', dur: 0.3, bloomFrom: 0.4, ...o });
    }
    // camera follows a moving item (its centre + dx) from at for dur seconds, easing in over `blend` seconds; then holds
    follow(item, o = {}) {
      const at = timeOf(o.at) ?? this.cursor, dur = o.dur ?? 3;
      this.cams.push({ at, dur, follow: item, dx: o.dx ?? 0, dy: o.dy, blend: o.blend ?? 0.6 });
      this.cams.sort((a, c) => a.at - c.at);
      return this;
    }
    image(src, o = {}) { return new Picture(this, src, o); }
    number(x, y, o = {}) { return new Num(this, x, y, o); }
    // Bar chart in brush strokes: data = [[label, value], ...]; x, y = left end of the baseline; hot: indices to paint in cinnabar
    bars(data, o = {}) {
      const x0 = o.x ?? this.W * 0.52, base = o.y ?? this.H * 0.8, W = o.w ?? Math.min(760, this.W - (o.x ?? this.W * 0.52) - 80), H = o.h ?? 420, max = o.max ?? Math.max(...data.map((d) => d[1])) * 1.1;
      const n = data.length, bw = o.barW ?? Math.min(90, (W / n) * 0.55), gap = (W - n * bw) / n, hot = typeof o.hot === 'function' ? o.hot : (i) => (o.hot || []).includes(i);
      const at = timeOf(o.at) ?? this.cursor, items = [this.line(x0 - 20, base, x0 + W + 20, base, { at, width: 6, bend: 0.005, dur: 0.4, annot: true })];
      data.forEach(([lab, v], i) => {
        const x = x0 + gap / 2 + i * (bw + gap) + bw / 2, h = (v / max) * H, t = at + 0.3 + i * (o.stagger ?? 0.15), isHot = hot(i);
        items.push(this.stroke([[x, base - 4], [x + 2, base - h / 2], [x, base - h]], { kind: 'bar', width: bw, dry: 0.3, ink: isHot ? 0.95 : 0.6, color: isHot ? 'red' : 'ink', press: 0.03, taper: 0.06, tail: 0.85, at: t, dur: 0.6, annot: true }));
        items.push(this.text(`${o.prefix ?? ''}${v}${o.unit ?? ''}`, { x, y: base - h - (o.valueSize ?? 40) * 1.5, size: o.valueSize ?? 40, align: 'center', color: isHot ? 'red' : 'ink', at: t + 0.45, overlap: true }));
        items.push(this.text(lab, { x, y: base + 16, size: o.labelSize ?? 32, align: 'center', at: t, overlap: true }));
      });
      return groupOf(items, 'bar chart');
    }
    localBox(target, part) {
      if (part !== undefined && target && target.part) { const b = target.part(...[].concat(part)); return { ...b, x: b.x - (target.hud ? 0 : target.ox) }; }
      const b = boxOf(target);
      if (target && target.b === this && !target.hud) return { ...b, x: b.x - target.ox };
      if (target && target.items) return { ...b, x: b.x - this.sec.x };
      return b;
    }

    // ---------- cover: the opening of the scroll, complete on the first frame ----------
    // o: title (supports {red:keyword}), subtitle, seal (a short inscription for the seal), scenery (false / options), hold, font
    // top/bottom bounds for content: top = below the chapter bar, bottom = above the caption bar (in portrait the caption bar is at 78% height; below it is the platform's button area)
    get safe() {
      const portrait = this.H > this.W, cap = this.capZone ?? (portrait ? Math.round(this.H * 0.22) + 140 : 0);
      return { top: this.chapterZone || 0, bottom: this.H - (this.caps || portrait ? cap : 0) };
    }
    cover(o = {}) {
      const hold = o.hold ?? 1.4, W = this.W;
      this.section(0, { cover: true, title: '' });
      const now = { at: 0, dur: 0 }, items = [];
      if (o.scenery !== false) items.push(...this.scenery({ ...(typeof o.scenery === 'object' ? o.scenery : {}), at: 0, dur: 0 }).items);
      let title = null;
      for (const size of [156, 138, 122, 108]) {
        title = this.calli(o.title || '', { x: 130, y: o.titleY ?? (this.H > W ? this.H * 0.2 : 250), size, w: o.titleW ?? Math.min(1180, W - 260), font: o.font ?? 'brush', ...now });
        if (title.nLines <= (o.titleLines ?? 2) || size === 108) break;
        this.items.pop();
      }
      items.push(title);
      const tb = title.box, ly = tb.y + tb.h + 18;
      items.push(this.stroke([[150, ly + 6], [150 + tb.w * 0.35, ly - 2], [150 + tb.w * 0.75, ly + 4], [140 + tb.w * 0.95, ly - 4]], { width: 22, dry: 0.6, press: 0.05, taper: 0.35, ...now, annot: true }));
      let bottom = ly + 30;
      if (o.subtitle) { const s = this.text(o.subtitle, { x: 136, y: bottom + 14, size: 50, w: Math.min(1100, W - 260), ...now }); items.push(s); bottom = s.box.y + s.box.h; }
      if (o.seal) items.push(this.seal(o.seal, { x: Math.min(W > this.H ? W - 520 : W - 112 - 70, 150 + tb.w * 0.95 + 30), y: ly - 50, size: 112, ...now }));
      this.coverHold = hold;
      this.coverEnd = hold + 1.3;
      this.cursor = hold;
      return { hold, end: this.coverEnd, area: { x: 130, y: bottom + 40, w: Math.min(1000, W - 260), h: (this.H > W ? this.safe.bottom : this.H - (this.capZone ?? 60)) - bottom - 40 }, items, section: this.sec };
    }

    // ---------- ending: the camera pulls back until the whole scroll lies in the frame, section titles underneath ----------
    // o.fit (default true): with a voiceover, end with the narration (EV.fitEnding: start during the last line rather than after it); hold default 1.5 s
    overview(o = {}) {
      const dur = o.dur ?? 2.4;
      let at = timeOf(o.at) ?? this.cursor;
      if (o.fit !== false) at = EV.fitEnding(this.T, at, dur, Math.max(0, ...this.items.filter((i) => i.start < 5e4).map((i) => i.done))).at;
      const x1 = this.secs[this.secs.length - 1].x + this.W, zoom = Math.min(1, (this.W - 160) / x1);
      this.cams.push({ at, dur, x: x1 / 2, y: this.H / 2, zoom, e: ease.inOutSine });
      this.ov = { at, dur, zoom };
      this.endHold = at + dur + (o.hold ?? 1.5);
      this.cursor = this.endHold;
      return this;
    }

    // ---------- captions and chapter bar (drawn in screen space) ----------
    setupCaptions(max) {
      this.caps = EV.captionSegments(this.T, max);
      // portrait: captions move up to 78% of the frame (the bottom 22% holds the platform's buttons and copy); nothing goes below the caption zone
      this.capZone = this.H > this.W ? Math.round(this.H * 0.22) + 140 : 140;
      this.capFont = `44px ${FONTS.kai}`;
    }
    renderCaptions(ctx, t) {
      const c = this.caps.find((x) => t >= x.start && t < x.end);
      if (!c) return;
      ctx.save();
      ctx.font = this.capFont; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = Math.min(ctx.measureText(c.text).width + 180, this.W + 120), x = this.W / 2, y = this.H - this.capZone + 68;
      const g = ctx.createRadialGradient(x, y, 0, x, y, w / 2);
      g.addColorStop(0, 'rgba(239,230,210,0.94)'); g.addColorStop(0.72, 'rgba(239,230,210,0.9)'); g.addColorStop(1, 'rgba(239,230,210,0)');
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 70 / w); ctx.translate(-x, -y); ctx.fillStyle = g; ctx.fillRect(x - w / 2, y - w / 2, w, w); ctx.restore();
      ctx.fillStyle = 'rgba(28,25,22,0.96)'; ctx.fillText(c.text, x, y);
      ctx.restore();
    }
    setupChapters() {
      const chs = this.T.chapters, x0 = Math.min(220, this.W * 0.1), x1 = this.W - x0, y = 58, seg = (x1 - x0) / chs.length;
      this.chCompact = this.H > this.W && chs.length >= 4;   // portrait with 4+ chapters: show only the current chapter's name (they don't fit in one row)
      this.chs = chs.map((c, i) => ({ ...c, cx: x0 + seg * (i + 0.5) }));
      chs.forEach((c) => this.useText(c.title));
      this.chLine = canvas(this.W, 40); this.chDone = canvas(this.W, 40);
      brush(this.chLine.getContext('2d'), [[x0, 20], [x1, 22]], { width: 4, ink: 0.28, dry: 0.4, press: 0.02, taper: 0.05, seed: 70 });
      brush(this.chDone.getContext('2d'), [[x0, 20], [x1, 21]], { width: 6, ink: 0.85, dry: 0.35, press: 0.02, taper: 0.05, tail: 0.8, seed: 71 });
      this.chY = y; this.chX = [x0, x1];
      this.chapterZone = 110;
    }
    renderChapters(ctx, t) {
      const a = clamp((t - (this.coverEnd ?? 0)) / 0.6) * (this.ov ? 1 - clamp((t - this.ov.at) / 0.6) : 1);
      if (a <= 0) return;
      const chs = this.chs, last = chs[chs.length - 1];
      let cur = chs.findIndex((c) => t >= c.start && t < c.end);
      if (cur < 0) cur = t >= last.end ? chs.length - 1 : 0;
      const [x0, x1] = this.chX, y = this.chY;
      ctx.save(); ctx.globalAlpha = a;
      ctx.drawImage(this.chLine, 0, y - 20);
      const p = clamp((t - chs[0].start) / (last.end - chs[0].start)), px = x0 + (x1 - x0) * p;
      ctx.save(); ctx.beginPath(); ctx.rect(0, y - 20, px, 40); ctx.clip(); ctx.drawImage(this.chDone, 0, y - 20); ctx.restore();
      ctx.fillStyle = `rgb(${CINNABAR})`; ctx.fillRect(chs[cur].cx - 7, y - 7, 14, 14);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      chs.forEach((c, i) => {
        if (this.chCompact && i !== cur) return;
        ctx.font = `${i === cur ? 34 : 30}px ${FONTS.kai}`;
        ctx.fillStyle = `rgba(${INK},${i === cur ? 0.95 : i < cur ? 0.75 : 0.35})`;
        const tw = ctx.measureText(c.title).width, lx = this.chCompact ? clamp(c.cx, x0 + tw / 2, x1 - tw / 2) : c.cx;   // compact: keep the name inside the frame
        ctx.fillText(c.title, lx, y + 14);
      });
      ctx.restore();
    }

    get duration() {
      const last = Math.max(0, ...this.items.filter((i) => i.start < 5e4).map((i) => i.done));
      return Math.max(this.T ? this.T.duration : 0, last + 2, this.endHold || 0);
    }

    // Paper in world space (it moves with the camera). When the camera pulls back past the scroll's edges, the scroll is shown
    // as a mounted object: a darker ground round it, silk borders top and bottom, and the paper's grain fading out with distance.
    drawPaper(ctx, z, tx, ty, vw = this.W, vh = this.H) {
      const W = this.W, H = this.H;
      if (!this.paper) {
        this.paper = paperTile(W, H, this.seedStr + ':paper');
        const one = canvas(1, 1).getContext('2d'); one.drawImage(this.paper, 0, 0, 1, 1);
        this.paperAvg = `rgb(${[...one.getImageData(0, 0, 1, 1).data].slice(0, 3).join(',')})`;   // flat colour matching the grain's average, for when the grain fades out
      }
      const wx0 = -tx / z, wx1 = (vw - tx) / z, wy0 = -ty / z, wy1 = (vh - ty) / z;
      const last = this.secs[this.secs.length - 1], sx0 = -this.secGap * 0.6, sx1 = (last ? last.x + W : W) + this.secGap * 0.6;
      const mounted = z < 0.999 && (wy0 < -1 || wy1 > H + 1);
      if (mounted) {
        ctx.fillStyle = '#B9A784'; ctx.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
        const m = 70;
        ctx.fillStyle = '#D9C9A6'; ctx.fillRect(sx0 - m, -m, sx1 - sx0 + 2 * m, H + 2 * m);
        ctx.strokeStyle = 'rgba(90,70,40,0.55)'; ctx.lineWidth = 3 / z; ctx.strokeRect(sx0 - m, -m, sx1 - sx0 + 2 * m, H + 2 * m);
        ctx.save(); ctx.beginPath(); ctx.rect(sx0, 0, sx1 - sx0, H); ctx.clip();
      }
      ctx.fillStyle = this.paperAvg; ctx.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
      ctx.save(); ctx.globalAlpha = clamp((z - 0.3) / 0.4);
      if (ctx.globalAlpha > 0) for (let i = Math.floor(wx0 / W); i <= Math.floor(wx1 / W); i++) for (let j = Math.floor(wy0 / H); j <= Math.floor(wy1 / H); j++) ctx.drawImage(this.paper, i * W, j * H, W + 0.5, H + 0.5);
      ctx.restore();
      if (mounted) { ctx.restore(); ctx.strokeStyle = 'rgba(90,70,40,0.5)'; ctx.lineWidth = 2 / z; ctx.strokeRect(sx0, 0, sx1 - sx0, H); }
    }
    vignette(ctx) {
      if (!this.vig) {
        this.vig = canvas(this.W, this.H);
        const c = this.vig.getContext('2d'), g = c.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.45, this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.62);   // in portrait an inner radius larger than the outer one would invert it (dark centre, bright edges)
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(105,75,35,0.17)');
        c.fillStyle = g; c.fillRect(0, 0, this.W, this.H);
      }
      ctx.drawImage(this.vig, 0, 0);
    }

    render(t) {
      const ctx = this.ctx, W = this.W, H = this.H, cam = this.camAt(t), z = cam.zoom, tx = W / 2 - cam.x * z, ty = H / 2 - cam.y * z;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(z, 0, 0, z, tx, ty);
      this.drawPaper(ctx, z, tx, ty);
      const view = { x: -tx / z, y: -ty / z, w: W / z, h: H / z };
      const last = this.secs[this.secs.length - 1];
      ctx.save(); ctx.beginPath(); ctx.rect(-this.secGap * 0.6, 0, (last ? last.x + W : W) + this.secGap * 1.2, H); ctx.clip();   // nothing paints outside the scroll
      const ov = this.ov && t >= this.ov.at;
      for (const it of this.items) {
        if (it.hud || t < it.start) continue;
        if (!ov && it.sec && !this.secActive(it.sec, t)) continue;
        const px = this.parallax(it, cam);
        if (!it.visibleIn(px ? { ...view, x: view.x - px } : view, t)) continue;
        if (px) { ctx.save(); ctx.translate(px, 0); it.draw(ctx, t); ctx.restore(); } else it.draw(ctx, t);
      }
      ctx.restore();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.vignette(ctx);
      for (const it of this.items) if (it.hud && t >= it.start && (!it.hudSec || this.secActive(it.hudSec, t))) it.draw(ctx, t);
      // 墨染 transition: ink floods from the centre, the camera jumps while the frame is dark, the ink clears on the new section
      for (const s of this.secs) {
        if (s.type !== 'ink' || t < s.start || t >= s.start + s.dur) continue;
        const k = (t - s.start) / s.dur, R = Math.hypot(W, H) * 0.62;
        if (k < 0.5) {   // ink spreads from the centre until the frame is fully covered at the midpoint (when the camera switches)
          const q = k / 0.5;
          paintBlot(ctx, W / 2, H / 2, R, ease.inOut(q), { seed: 31 + s.idx, ink: 2.2 });
          ctx.fillStyle = `rgba(${INK},${Math.min(1, ease.in(q) * 1.05)})`; ctx.fillRect(0, 0, W, H);
        } else {         // then the ink parts from the centre, the new scene appearing through a spreading clearing
          const q = (k - 0.5) / 0.5, ov = this._inkOv || (this._inkOv = canvas(W, H)), oc = ov.getContext('2d');
          oc.globalCompositeOperation = 'source-over'; oc.globalAlpha = 1; oc.filter = 'none'; oc.clearRect(0, 0, W, H);
          oc.fillStyle = `rgb(${INK})`; oc.fillRect(0, 0, W, H);
          oc.globalCompositeOperation = 'destination-out';
          paintBlot(oc, W / 2, H / 2, R * 1.25, ease.inOut(q), { seed: 47 + s.idx, ink: 3 });
          ctx.save(); ctx.globalAlpha = 1 - ease.in(q) * 0.85; ctx.drawImage(ov, 0, 0); ctx.restore();
        }
      }
      if (this.ov && t >= this.ov.at) this.renderOverviewLabels(ctx, t, cam);
      if (this.chs) this.renderChapters(ctx, t);
      if (this.caps) this.renderCaptions(ctx, t);
      // images still decoding: wait for them, then paint this frame again
      const w = EV.waitMedia && EV.waitMedia();
      if (w) return w.then(() => this.render(t));
    }
    // a section is on screen from its start until the next section has fully taken over
    // (scroll: both sections show while the camera pans; ink / cut: the old section is gone the moment the camera switches)
    secActive(s, t) {
      const n = this.secs[s.idx + 1];
      const until = !n ? Infinity : n.type === 'scroll' ? n.start + n.dur : n.type === 'ink' ? n.start + n.dur * 0.5 : n.start;
      const from = s.type === 'ink' ? s.start + s.dur * 0.5 : s.start;
      return t >= from - 0.001 && t < until - 0.001;
    }
    // parallax shift of an item: when the camera moves Δ from the section's centre, a depth-d item moves d·Δ on screen
    parallax(it, cam) { return it.depth === 1 || !it.sec ? 0 : (cam.x - (it.sec.x + this.W / 2)) * (1 - it.depth); }
    renderOverviewLabels(ctx, t, cam) {
      const a = clamp((t - this.ov.at - this.ov.dur * 0.6) / 0.6), z = cam.zoom;
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a; ctx.font = `30px ${FONTS.kai}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = `rgba(${INK},0.85)`;
      const chs = this.T ? this.T.chapters : [];
      for (const s of this.secs) {
        if (s.cover) continue;
        const mid = s.start + s.dur + 0.3, ch = chs.find((c) => mid >= c.start && mid < c.end), label = s.title || (ch ? ch.title : '');
        if (!label) continue;
        const sx = (s.x + this.W / 2 - cam.x) * z + this.W / 2, sy = (this.H - cam.y) * z + this.H / 2 + 22;
        ctx.fillText(label, sx, sy);
      }
      ctx.restore();
    }

    // The whole scroll as one long image (board.png): every section at its final state, side by side
    snapshot() { return null; }   // no board overview image for ink-wash

    // ---------- lint check ----------
    // Information-density check: information-carrying items on screen at second t (brushwork, arrows, circles, marks, shapes, bars, figures, horses, pictures).
    // Text, calligraphy, numbers, seals, blots and the landscape (mountains, moon, water, paper bands) only set the scene or repeat words
    infoAt(t) {
      const out = new Set(), W = this.W, H = this.H, c = this.camAt(t);
      const inter = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      for (const it of this.items) {
        if (it.noInfo || it.hud || INK_NO_INFO.has(it.kind) || it instanceof Text || it instanceof Num || it instanceof Seal || it instanceof Blot || it instanceof Mountains || it instanceof Painted) continue;
        if (t < it.start || t >= it.gone() || (it.sec && !this.secActive(it.sec, t))) continue;
        if (it.box) { const b = it.boxAt(t), px = this.parallax(it, c), r = { x: (b.x + px - c.x) * c.zoom + W / 2, y: (b.y - c.y) * c.zoom + H / 2, w: b.w * c.zoom, h: b.h * c.zoom }; if (inter(r, { x: 0, y: 0, w: W, h: H }) / Math.max(1, r.w * r.h) < 0.3 || Math.max(r.w, r.h) < 40) continue; }
        out.add(it.kind || 'drawing');
      }
      return [...out];
    }
    lint() {
      const out = [], W = this.W, H = this.H, dur = this.duration, screen = { x: 0, y: 0, w: W, h: H };
      const add = (level, t, it, msg) => out.push({ level, t: Math.round(t * 100) / 100, src: it ? it.src : '', what: it ? it.describe() : '', msg });
      const toScreen = (b, t, it) => { const c = this.camAt(t), z = c.zoom, px = it ? this.parallax(it, c) : 0; return { x: (b.x + px - c.x) * z + W / 2, y: (b.y - c.y) * z + H / 2, w: b.w * z, h: b.h * z }; };
      const items = this.items.filter((i) => i.start < 5e4);
      const texty = (it) => it instanceof Text || it instanceof Num || it instanceof Seal || it instanceof Picture;
      for (const it of items) {
        const done = it.done, gone = it.gone();
        for (const x of it.exits) {
          if (x.at <= it.start) add('error', it.start, it, 'erased before it is drawn; viewers will never see it');
          else if (x.at < done - 0.05) add('error', x.at, it, `erased before it finishes drawing (only ${Math.round(((x.at - it.start) / Math.max(0.01, done - it.start)) * 100)}% drawn)`);
          else if (x.at - done < 0.6 && !(it.o && it.o.flash)) add('warn', x.at, it, `held for only ${(x.at - done).toFixed(1)}s before being erased; too short for viewers to read`);
        }
        if (it.start >= dur) add('error', it.start, it, 'start time is beyond the total video duration');
        if (it.hud) continue;
        const s = it.sec, nxt = this.secs[s.idx + 1];
        if (!s.cover && !(it instanceof Painted) && !(it instanceof Mountains) && it.start < s.ready - 0.05) add('warn', it.start, it, `drawn before the camera has arrived at this section (${s.ready.toFixed(2)}s)`);
        if (nxt && done > nxt.start - 0.05) add('error', it.start, it, `the scroll moves on before it finishes drawing (next section starts at ${nxt.start.toFixed(2)}s)`);
        else if (nxt && nxt.start - done < 0.8 && !it.exits.length && texty(it)) add('warn', done, it, 'the scroll moves on less than 0.8s after it finishes drawing; too short for viewers to read');
        if (!it.box || it.start >= gone) continue;
        // visibility over the element's life on screen (it may only come into view as the camera moves)
        const life0 = Math.max(done, s.ready) + 0.02, life1 = Math.max(life0, Math.min(gone - 0.01, dur - 0.01, nxt ? nxt.start - 0.01 : Infinity));
        let vis = 0, tt = life0, r = null;
        for (let k = 0; k <= 12; k++) {
          const tk = lerp(life0, life1, k / 12), rk = toScreen(it.boxAt(tk), tk, it), vk = inter(rk, screen) / Math.max(1, rk.w * rk.h);
          if (vk > vis + 1e-6 || !r) { vis = Math.max(vis, vk); tt = tk; r = rk; }
        }
        if (vis < 0.02) add('error', it.start, it, 'never on screen while it is there (check its coordinates, depth and the camera)');
        else if (vis < 0.97 && !it.o.bleed && !(it instanceof Figure) && !(it instanceof Painted) && !(it instanceof Mountains) && !(it instanceof Horse)) add('warn', it.start, it, `${Math.round((1 - vis) * 100)}% is outside the frame (for intentional bleed, add bleed: true)`);
        if (H > W && s.cover && texty(it) && !it.o.annot && r.y + r.h > this.safe.bottom + 4) add('warn', it.start, it, `cover: reaches below y = ${Math.round(this.safe.bottom)}; in 9:16 that part of the cover (and the cover thumbnail) is behind the platform's buttons. Keep it inside the cover's area`);
        if (texty(it) && !it.o.annot && !s.cover) {
          if (this.chapterZone && r.y < this.chapterZone && r.x < W - 60 && r.x + r.w > 60) add('warn', it.start, it, `overlaps the top chapter bar (top ${this.chapterZone} px of the screen)`);
          if (this.caps && r.y + r.h > H - this.capZone && r.x < W - 300 && r.x + r.w > 300 && this.caps.some((c) => c.end > it.start && c.start < gone)) add('warn', it.start, it, `overlaps the bottom caption area (bottom ${this.capZone} px of the screen)`);
        }
        if (it instanceof Text && it.size * this.camAt(tt).zoom < 28) add('warn', it.start, it, `text too small (${Math.round(it.size * this.camAt(tt).zoom)}px on screen) to read in the video; body text should be at least 36`);
      }
      const texts = items.filter((i) => (i instanceof Text || i instanceof Num) && !i.o.overlap && !i.hud);
      for (let a = 0; a < texts.length; a++) for (let c = a + 1; c < texts.length; c++) {
        const A = texts[a], B = texts[c];
        if (A.sec !== B.sec) continue;
        const t0 = Math.max(A.start, B.start), t1 = Math.min(A.gone(), B.gone());
        if (t1 <= t0) continue;
        const ov = inter(A.box, B.box) / Math.max(1, Math.min(A.box.w * A.box.h, B.box.w * B.box.h));
        if (ov > 0.08) add('warn', t0, B, `overlaps ${A.describe()} (${A.src}) by ${Math.round(ov * 100)}%`);
      }
      for (const it of items) if (it.lint) it.lint(add);
      const lines = this.T ? this.T.lines.filter((l) => !l.silence && l.text) : [];
      if (!this.secs.length) out.push({ level: 'error', t: 0, src: '', what: 'section', msg: 'build has not called b.cover() or b.section() yet' });
      else if (!this.coverHold) out.push({ level: 'warn', t: 0, src: '', what: 'first frame', msg: 'no cover. Many platforms use the first frame as the cover by default; consider making one with b.cover()' });
      else {
        if (lines.length && lines[0].start < this.coverEnd - 0.4) out.push({ level: 'warn', t: lines[0].start, src: '', what: 'cover', msg: `narration starts before the scroll has moved on from the cover: increase lead_in in script.json by ${(this.coverEnd - 0.4 - lines[0].start + 0.2).toFixed(1)}s` });
        if (this.secs.length < 2) out.push({ level: 'error', t: this.coverHold, src: '', what: 'cover', msg: 'b.section() is not called after the cover to move on to the content' });
      }
      return out.sort((a, c) => a.t - c.t);
    }
  }
  const H_BOTTOM = 1100;

  window.INK = { Board, board: (o) => new Board(o), FONTS, POSES, FACES, COLORS, groupOf, unionBox, _: { brush, washPoly, paintFigure, paintHorse, GAITS, HORSE_GAITS, figureBoxes, paintMountains, paintMoon, paintBlot, paintSeal, spline, paperTile, Item, Text, Figure } };
})();
