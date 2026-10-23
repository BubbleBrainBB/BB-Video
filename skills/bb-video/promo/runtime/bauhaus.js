// bauhaus.js: constructivism / Bauhaus style (one of bb-video's visual styles; style notes in styles/bauhaus/STYLE.md). Load after promo.js.
// One frame: off-white printing paper, mostly red and black (Bauhaus yellow and blue as accents); big circles, thick bars, wedges and triangles driven diagonally into the frame, asymmetric composition;
// bold sans slogans set on a slant, slammed in one character at a time; things are "assembled" from circles, squares and triangles (construction); transitions are a big red wedge / big circle sweeping across.
// Motion is machine-like: crisp and exact, sliding in along straight and diagonal lines and locking into place, no bounce, no float. All text is DOM (automatic checks work as usual).
//
//   const B = PROMO.bauhaus(F, { ground, colors })
//   B.bg(layer, { ground: 'paper' | 'red' | 'black', variant })     a scene's ground: printing paper (or solid red / black), faint structure lines (big circle, diagonal band, grid)
//   B.shape(parent, { kind, x, y, w, h, r, rot, color, at, until, enter, exit, from, origin, spin, texture, z }) → s
//     kind: circle | ring | half (semicircle) | rect (block / thick bar) | tri (triangle) | wedge (long thin triangle) | cross | your own point list (unit box 0–1)
//     enter: slide in from the `from` direction (default) | grow from one end (thick bars, wedges) | pop scale into place | spin in | wipe left to right | none
//     s.move(at, x, y, dur) | s.turn(at, rot, dur) | s.el
//   B.slogan(parent, { text, x, y, size, rot, color, block, align, at, until, by: 'char' | 'word', maxW }) bold sans slogan, slammed in one character at a time; block = a colour block extends behind the text first
//   B.label(parent, { text, x, y, size, color, bar, align, at, until, maxW, kind }) caption text, "printed" left to right (bar = a small colour bar on the left)
//   B.number(parent, { value, x, y, size, color, unit, at, until, from, digits }) big number: counts up, a hit when it lands
//   B.assemble(parent, { parts: [shape…], x, y, scale, at, until, every, scatter }) assembly: a few basic shapes fly in from all sides and lock into place, forming one thing (chair, house, letter…)
//   B.rays(parent, { x, y, angle, spread, n, len, color, at, until }) rays (megaphone, manifesto): a bundle of wedges shooting out from one point
//   B.arrow(parent, { x1, y1, x2, y2, w, color, at, until }) thick arrow: grows along its direction
//   B.photo(parent, { src, x, y, w, h, shape, tint, at, until, fit }) photo collage: black-and-white photo cut into circle / square / triangle with a colour overprint (mood only; put screenshots in as-is with S.shot)
//   B.wipe({ at, kind: 'wedge' | 'circle' | 'bars', color, dur }) → time of full cover   transition: a big shape sweeps across and covers the frame, the scene changes at that moment, then it sweeps off
//   B.endcard(parent, { at, title, sub, url })        end card: red circle + black bar + big slanted text
//
// Timing: at = landed (readable, on the beat); motion starts `lead` earlier; until = fully gone. Coordinates: x, y are the centre (frame px); sizes are design sizes (1080p, converted internally by F.px).
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('bauhaus.js 要在 promo.js 之后加载', 'bauhaus.js must load after promo.js'));
  const { clamp, lerp } = window.EV;
  const { E, seg, set, el } = P;
  const f1 = (n) => Math.round(n * 10) / 10;
  const f3 = (n) => Math.round(n * 1000) / 1000;
  const RAD = Math.PI / 180;
  const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const estUnits = (t) => { t = String(t ?? ''); return (t.match(/[^\x00-\xff]/g) || []).length + t.replace(/[^\x00-\xff]/g, '').length * 0.55; };

  // ---------- Colours: print red and black + the Bauhaus primaries ----------
  const PAL = { paper: '#EFE7D6', ink: '#161413', red: '#D3281C', yellow: '#F1B60A', blue: '#1E4E9C', grey: '#8D8579', white: '#FAF6EC' };
  const GROUNDS = { paper: { bg: PAL.paper, ink: PAL.ink, accent: PAL.red, faint: 'rgba(22,20,19,.07)' }, red: { bg: PAL.red, ink: PAL.ink, accent: PAL.paper, faint: 'rgba(22,20,19,.12)' }, black: { bg: PAL.ink, ink: PAL.paper, accent: PAL.red, faint: 'rgba(239,231,214,.08)' } };
  // Shapes: point lists in a unit box (0–1) → clip-path
  const SHAPES = {
    tri: [[0.5, 0], [1, 1], [0, 1]],
    wedge: [[0, 0.5], [1, 0], [1, 1]],   // point on the left, wide end on the right (the wedge drives in toward the left; rot turns it)
    cross: [[0.35, 0], [0.65, 0], [0.65, 0.35], [1, 0.35], [1, 0.65], [0.65, 0.65], [0.65, 1], [0.35, 1], [0.35, 0.65], [0, 0.65], [0, 0.35], [0.35, 0.35]],
  };
  const clipOf = (pts) => `polygon(${pts.map(([x, y]) => `${f1(x * 100)}% ${f1(y * 100)}%`).join(',')})`;
  const lum = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) return 1; const n = parseInt(m[1], 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

  // Sizes are measured in prep (after fonts load); temporarily shown while measuring — a display:none element measures 0
  const measure = (e) => { const d = e.style.display; e.style.display = ''; e._w = e.offsetWidth; e._h = e.offsetHeight; e.style.display = d; };

  P.bauhaus = function (F, opt = {}) {
    const B = { F }, PT = F.portrait, W = F.W, H = F.H;
    B.colors = { ...PAL, ...(opt.colors || {}) };
    const C = (c, d) => (c ? B.colors[c] ?? c : d);
    B.ground = opt.ground ?? 'paper';
    const fonts = F.theme.fonts || {};
    // Latin text uses Noto Sans first (a Latin font), Chinese falls to Noto Sans SC: in CJK fonts ’ “ ” are full-width glyphs, so can’t becomes "can’ t"
    B.head = opt.head ?? fonts.display ?? '"Noto Sans", "Noto Sans SC", sans-serif';
    B.body = opt.body ?? fonts.sans ?? '"Noto Sans", "Noto Sans SC", sans-serif';
    B.num = opt.num ?? fonts.mono ?? '"Oswald", "Noto Sans SC", sans-serif';
    const LEAD = { slide: 0.5, grow: 0.45, pop: 0.35, spin: 0.55, wipe: 0.4, none: 0 };

    // ---------- Ground ----------
    B.bg = (layer, o = {}) => {
      const g = GROUNDS[o.ground ?? B.ground] ?? GROUNDS.paper, v = o.variant ?? 0;
      const wrap = el('div', `inset:0;overflow:hidden;background:${g.bg}`, layer);
      // printing-paper grain (very faint)
      const tex = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 .2  0 0 0 0 .18  0 0 0 0 .15  0 0 0 .55 0'/></filter><rect width='240' height='240' filter='url(%23f)'/></svg>`;
      el('div', `inset:0;opacity:.28;mix-blend-mode:multiply;background-image:url("data:image/svg+xml,${encodeURIComponent(tex).replace(/%2523/g, '%23')}")`, wrap);
      // structure lines: a faint big circle / a diagonal band / a grid (the composition's skeleton, never upstaging)
      const u = F.px(1);
      if (v % 4 === 0) el('div', `left:${f1(W * (PT ? 0.35 : 0.62))}px;top:${f1(-H * 0.18)}px;width:${f1(H * 0.95)}px;height:${f1(H * 0.95)}px;border-radius:50%;border:${f1(u * 3)}px solid ${g.faint}`, wrap);
      if (v % 4 === 1) el('div', `left:${f1(-W * 0.2)}px;top:${f1(H * 0.55)}px;width:${f1(W * 1.4)}px;height:${f1(H * 0.16)}px;background:${g.faint};transform:rotate(-14deg)`, wrap);
      if (v % 4 === 2) { const step = F.px(120); for (let x = step; x < W; x += step) el('div', `left:${f1(x)}px;top:0;width:${f1(u * 1.5)}px;height:100%;background:${g.faint}`, wrap); }
      if (v % 4 === 3) el('div', `left:${f1(W * 0.08)}px;top:${f1(H * 0.1)}px;width:${f1(u * 6)}px;height:${f1(H * 0.8)}px;background:${g.faint};transform:rotate(18deg)`, wrap);
      wrap._ground = g; layer._ground = o.ground ?? B.ground;
      return { el: wrap, ground: g };
    };

    // A scene: one layer + one ground, shown only in [a, z); the whole scene pushes in very slowly (push: how much to scale, default 0.02 — the frame never "freezes", yet the camera stays essentially still)
    B.scene = (a, z, o = {}) => {
      const L = F.layer('', o.z ?? 1), push = o.push ?? 0.02;
      F.add((t) => { const on = t >= a && t < z; set(L, { display: on ? '' : 'none' }); if (on && push) set(L, { transform: `scale(${f3(1 + push * seg(t, a, z, E.sine))})` }); });
      B.bg(L, o);
      return L;
    };

    // ---------- Shapes ----------
    // Position: centre (x, y), rotation rot (degrees); the enter motion starts `lead` earlier and locks at `at`; exit finishes before `until`
    B.shape = (parent, o) => {
      const kind = o.kind ?? 'rect', u = F.px(1), at = o.at ?? 0, until = o.until ?? 1e9, enter = o.enter ?? 'slide', exit = o.exit ?? (enter === 'none' ? 'none' : 'slide');
      const r = o.r !== undefined ? F.px(o.r) : null, w = r !== null ? r * 2 : F.px(o.w ?? 200), h = r !== null ? r * 2 : F.px(o.h ?? o.w ?? 200), col = C(o.color, PAL.ink);
      const lead = o.lead ?? LEAD[enter] ?? 0.45, origin = o.origin ?? (enter === 'grow' ? 'left' : 'center');
      const box = el('div', `left:0;top:0;width:${f1(w)}px;height:${f1(h)}px;display:none;pointer-events:none;${o.z !== undefined ? `z-index:${o.z};` : ''}transform-origin:${origin === 'left' ? '0% 50%' : origin === 'right' ? '100% 50%' : origin === 'top' ? '50% 0%' : origin === 'bottom' ? '50% 100%' : '50% 50%'}`, parent);
      const inner = el('div', `inset:0`, box);
      box.dataset.what = `B.shape ${Array.isArray(kind) ? 'poly' : kind}${o.what ? ' ' + o.what : ''}`;
      if (enter === 'grow') box.dataset.motion = 'snap';   // growing in is the signature "snap" move
      if (kind === 'circle' || kind === 'ring' || kind === 'half') {
        set(inner, { borderRadius: '50%' });
        if (kind === 'ring') set(inner, { border: `${f1(F.px(o.stroke ?? 28))}px solid ${col}`, boxSizing: 'border-box' }); else set(inner, { background: col });
        if (kind === 'half') set(inner, { clipPath: 'inset(0 0 50% 0)' });
      } else {
        set(inner, { background: col });
        const pts = Array.isArray(kind) ? kind : SHAPES[kind];
        if (pts) set(inner, { clipPath: clipOf(pts) });
      }
      // optional halftone / hatch print texture
      if (o.texture === 'dots') el('div', `inset:0;${inner.style.clipPath ? `clip-path:${inner.style.clipPath};` : ''}${inner.style.borderRadius ? 'border-radius:50%;' : ''}background-image:radial-gradient(circle, rgba(0,0,0,.28) 0 ${f1(u * 3)}px, transparent ${f1(u * 3.6)}px);background-size:${f1(u * 14)}px ${f1(u * 14)}px`, box);
      if (o.texture === 'lines') el('div', `inset:0;${inner.style.clipPath ? `clip-path:${inner.style.clipPath};` : ''}${inner.style.borderRadius ? 'border-radius:50%;' : ''}background-image:repeating-linear-gradient(-45deg, rgba(0,0,0,.25) 0 ${f1(u * 3)}px, transparent ${f1(u * 3)}px ${f1(u * 14)}px)`, box);
      const st = { x: o.x ?? W / 2, y: o.y ?? H / 2, rot: o.rot ?? 0 }, moves = [], turns = [];
      const S = { el: box, inner, w, h, st };
      S.move = (t, x, y, dur = 0.6) => { moves.push({ a: t - dur, b: t, x, y }); return S; };
      S.turn = (t, rot, dur = 0.5) => { turns.push({ a: t - dur, b: t, rot }); return S; };
      // continuous motion over time: fn(t) → { dx, dy, rot } (design size, added on top of move; pure function)
      const anims = []; S.animate = (fn) => { anims.push(fn); return S; };
      // slide-in direction: by default along the shape's own direction (rot), from outside the frame
      // slide in / out distance: along the direction just far enough to leave the frame (plus a little); never fly in from far away (too fast, the motion sheet would flag it)
      const outDist = (ang) => { const dx = Math.cos(ang), dy = Math.sin(ang), hw = Math.max(w, h) * 0.75, x0 = st.x, y0 = st.y; const tx = dx > 1e-6 ? (W + hw - x0) / dx : dx < -1e-6 ? (-hw - x0) / dx : Infinity, ty = dy > 1e-6 ? (H + hw - y0) / dy : dy < -1e-6 ? (-hw - y0) / dy : Infinity; return Math.max(F.px(160), Math.min(tx, ty)); };
      const fromA = (o.from ?? st.rot + 180) * RAD, D = outDist(fromA), DO = outDist((o.to ?? st.rot) * RAD);
      if (o.sfx !== false && enter !== 'none') F.sfx(at - (enter === 'slide' ? 0.12 : 0.05), o.sfx ?? (kind === 'circle' || kind === 'ring' ? 'thud' : 'clank'), o.gain ?? 0.35);
      F.add((t) => {
        const on = t >= at - lead && t < until; set(box, { display: on ? '' : 'none' }); if (!on) return;
        let x = st.x, y = st.y, rot = st.rot;
        for (const m of moves) { const q = seg(t, m.a, m.b, E.cubicInOut); x = lerp(x, m.x, q); y = lerp(y, m.y, q); }
        for (const m of turns) rot = lerp(rot, m.rot, seg(t, m.a, m.b, E.cubicInOut));
        if (o.spin) rot += o.spin * (t - at);
        for (const fn of anims) { const r = fn(t) || {}; x += F.px(r.dx || 0); y += F.px(r.dy || 0); rot += r.rot || 0; }
        let dx = 0, dy = 0, sx = 1, sy = 1, op = 1, clip = null;
        const qi = lead > 0 ? seg(t, at - lead, at, enter === 'pop' ? E.backOut : E.expoOut) : 1;
        if (enter === 'slide') { dx = Math.cos(fromA) * D * (1 - qi); dy = Math.sin(fromA) * D * (1 - qi); }
        if (enter === 'grow') { if (origin === 'top' || origin === 'bottom') sy = qi; else sx = qi; }
        if (enter === 'pop') { sx = sy = Math.max(0, qi); }
        if (enter === 'spin') { sx = sy = 0.2 + 0.8 * qi; rot -= 180 * (1 - qi); op = Math.min(1, qi * 3); }
        if (enter === 'wipe') clip = `inset(0 ${f1((1 - qi) * 100)}% 0 0)`;
        if (until < 1e8 && exit !== 'none') {
          const qo = seg(t, until - 0.35, until, E.quartIn);
          if (exit === 'slide') { const ea = (o.to ?? st.rot) * RAD; dx += Math.cos(ea) * DO * qo; dy += Math.sin(ea) * DO * qo; }
          if (exit === 'grow') { if (origin === 'top' || origin === 'bottom') sy *= 1 - qo; else sx *= 1 - qo; }
          if (exit === 'pop') { sx *= 1 - qo; sy *= 1 - qo; }
          if (exit === 'fade') op *= 1 - qo;
        }
        // placing: when origin is left / right / top / bottom, (x, y) is still the shape's centre — first work out where that end sits in the frame
        const c = Math.cos(rot * RAD), s = Math.sin(rot * RAD);
        let px = x - w / 2, py = y - h / 2;
        if (origin === 'left') { px = x - c * w / 2; py = y - s * w / 2 - h / 2; }
        if (origin === 'right') { px = x + c * w / 2 - w; py = y + s * w / 2 - h / 2; }
        if (origin === 'top') { px = x + s * h / 2 - w / 2; py = y - c * h / 2; }
        if (origin === 'bottom') { px = x - s * h / 2 - w / 2; py = y + c * h / 2 - h; }
        set(box, { transform: `translate(${f1(px + dx)}px,${f1(py + dy)}px) rotate(${f1(rot)}deg) scale(${f3(sx)},${f3(sy)})`, opacity: op < 1 ? String(f3(op)) : '', clipPath: clip ?? '' });
        S._now = { x: x + dx, y: y + dy, rot, sx, sy };   // current centre (scaled proportionally while growing)
      });
      // register thin things as "lines" (checked for crossing text): ring edges, long thin bars
      const thin = Math.min(w, h), long = Math.max(w, h);
      const inWin = parent && parent.closest && parent.closest('[data-what="B.window"]');   // shapes inside a window use box coordinates, so they are not registered (the check works in frame coordinates)
      if (F.stroke && !inWin && (kind === 'ring' || (kind === 'rect' && thin <= F.px(40) && long >= thin * 4))) F.stroke(box, () => {
        const n = S._now; if (!n) return null;
        if (kind === 'ring') { const sw = F.px(o.stroke ?? 28), rr = (w / 2 - sw / 2) * n.sx; return { pts: Array.from({ length: 36 }, (_, i) => [n.x + Math.cos((i / 36) * Math.PI * 2) * rr, n.y + Math.sin((i / 36) * Math.PI * 2) * rr]), w: sw * n.sx }; }
        const L2 = (w >= h ? w * n.sx : h * n.sy), c = Math.cos(n.rot * RAD + (w >= h ? 0 : Math.PI / 2)), sn = Math.sin(n.rot * RAD + (w >= h ? 0 : Math.PI / 2));
        // while growing, measure from the origin end: for simplicity take half on each side of the centre (the error at half-grown is acceptable)
        return { pts: Array.from({ length: 24 }, (_, i) => { const u = (i / 23 - 0.5) * L2; return [n.x + c * u, n.y + sn * u]; }), w: thin };
      }, at + 0.05, until - (exit === 'none' ? 0 : 0.35));   // only check after landing (crossing text while flying in or leaving doesn't count)
      return S;
    };

    // ---------- Window: a box with several layers inside, each moving at its own speed (parallax, scrolling, a car window, a phone screen) ----------
    //   const win = B.window(parent, { x, y, w, h, at, until, color, border }); const L1 = win.layer(0.4); B.shape(L1, { x, y, … }) (coordinates are inside the box, from its top-left corner)
    //   win.scroll(at, dur, { dx, dy, flat }, ease): each layer moves distance × speed (design size; flat: true = all layers at the same speed); anything outside the box is hidden
    //   win.drift(at, until, { vx, vy }): each layer moves at a constant speed (px per second × speed); a layer from win.layer(speed, { loop: { x, y } }) is a seamless strip whose offset wraps by period
    //   win.animate((t, speed) => ({ dx, dy })): your own offset (stop-start judder), called once per layer
    B.window = (parent, o) => {
      const u = F.px(1), w = F.px(o.w ?? 800), h = F.px(o.h ?? 500), at = o.at ?? 0, until = o.until ?? 1e9;
      const box = el('div', `left:${f1((o.x ?? W / 2) - w / 2)}px;top:${f1((o.y ?? H / 2) - h / 2)}px;width:${f1(w)}px;height:${f1(h)}px;overflow:hidden;display:none;background:${C(o.color, PAL.white)};${o.border === false ? '' : `outline:${f1(u * (o.border ?? 6))}px solid ${PAL.ink};`}${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      box.dataset.what = 'B.window';
      const layers = [], scrolls = [], drifts = [], fns = [];
      const win = { el: box, w, h, layers };
      const wrap = (v, p) => (p ? -((((-v) % p) + p) % p) : v);   // wrap into (-p, 0]: the drawn strip must be one period longer than the box
      win.layer = (speed = 1, lo = {}) => { const L = el('div', 'left:0;top:0;width:100%;height:100%', box); L._speed = speed; L._loop = typeof lo.loop === 'number' ? { x: lo.loop } : lo.loop || {}; layers.push(L); return L; };
      win.scroll = (t, dur, d = {}, e = E.cubicInOut) => { scrolls.push({ a: t, b: t + dur, dx: d.dx ?? 0, dy: d.dy ?? 0, flat: !!d.flat, e }); return win; };
      win.drift = (a, b, d = {}) => { drifts.push({ a, b: b ?? 1e9, vx: d.vx ?? 0, vy: d.vy ?? 0 }); return win; };
      win.animate = (fn) => { fns.push(fn); return win; };
      F.add((t) => {
        const on = t >= at - 0.4 && t < until; set(box, { display: on ? '' : 'none' }); if (!on) return;
        const q = seg(t, at - 0.4, at, E.expoOut), out = until < 1e8 ? seg(t, until - 0.3, until, E.quartIn) : 0;
        set(box, { clipPath: q < 1 ? `inset(0 ${f1((1 - q) * 100)}% 0 0)` : out > 0 ? `inset(0 0 0 ${f1(out * 100)}%)` : '' });
        for (const L of layers) {
          let dx = 0, dy = 0;
          for (const m of scrolls) { const k = seg(t, m.a, m.b, m.e) * (m.flat ? 1 : L._speed); dx += m.dx * k; dy += m.dy * k; }
          for (const d of drifts) { const e = Math.min(Math.max(t, d.a), d.b) - d.a; dx += d.vx * L._speed * e; dy += d.vy * L._speed * e; }
          for (const f of fns) { const r = f(t, L._speed) || {}; dx += r.dx || 0; dy += r.dy || 0; }
          dx = wrap(dx, L._loop.x); dy = wrap(dy, L._loop.y);
          set(L, { transform: dx || dy ? `translate(${f1(F.px(dx))}px,${f1(F.px(dy))}px)` : '' });
        }
      });
      if (o.sfx !== false) F.sfx(at - 0.3, 'clank', 0.3);
      return win;
    };

    // ---------- Text ----------
    // Slogan: bold sans, slammed in one character (one word for Latin) at a time; the whole line may slant (rot); block = a colour block first extends from the left under the text
    B.slogan = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, rot = o.rot ?? 0, col = C(o.color, PAL.ink), text = String(o.text);
      let size = F.px(o.size ?? (PT ? 120 : 150));
      if (o.maxW) size = Math.min(size, (F.px(o.maxW) * 0.94) / Math.max(1, estUnits(text)));
      const wrap = el('div', `left:0;top:0;display:none;pointer-events:none;transform-origin:0 0;${o.z !== undefined ? `z-index:${o.z};` : 'z-index:20;'}`, parent);
      const line = el('div', `position:relative;font:900 ${f1(size)}px/1.05 ${B.head};color:${col};white-space:nowrap;letter-spacing:${o.tracking ?? '0.02em'};padding:${f1(size * 0.08)}px ${f1(size * 0.18)}px`, wrap);
      const blk = o.block ? el('div', `inset:0;background:${C(o.block)};transform-origin:0% 50%`, line) : null;
      wrap.dataset.what = 'B.slogan'; if (blk) { blk.dataset.what = M('B.slogan 色块', 'B.slogan colour block'); blk.dataset.motion = 'snap'; }
      const parts = o.by === 'word' || (!/[^\x00-\xff]/.test(text) && o.by !== 'char') ? text.split(/(\s+)/) : [...text];
      const spans = parts.map((p) => { const s = el('span', `position:relative;display:inline-block;white-space:pre`, line); s.textContent = p; return s; });
      const per = Math.min(0.06, 0.45 / Math.max(1, spans.length)), lead = 0.25 + per * spans.length + (blk ? 0.3 : 0);
      F.text(line, o.kind ?? 'slam', text, at - lead, until);
      if (o.sfx !== false) F.sfx(at - 0.04, o.sfx ?? 'stamp', o.gain ?? 0.55);
      F.prep(() => measure(wrap));
      F.add((t) => {
        const on = t >= at - lead && t < until; set(wrap, { display: on ? '' : 'none' }); if (!on) return;
        const ww = wrap._w ?? wrap.offsetWidth, hh = wrap._h ?? wrap.offsetHeight, ax = o.align === 'left' ? 0 : o.align === 'right' ? ww : ww / 2;
        const c = Math.cos(rot * RAD), s = Math.sin(rot * RAD), x0 = (o.x ?? W / 2) - (c * ax - s * hh / 2), y0 = (o.y ?? H / 2) - (s * ax + c * hh / 2);
        const out = until < 1e8 ? seg(t, until - 0.3, until, E.quartIn) : 0;
        set(wrap, { transform: `translate(${f1(x0 - out * F.px(80))}px,${f1(y0)}px) rotate(${f1(rot)}deg)`, opacity: out ? String(f3(1 - out)) : '' });
        const t0 = at - lead;
        if (blk) set(blk, { transform: `scaleX(${f3(seg(t, t0, t0 + 0.4, E.quartOut))})` });
        spans.forEach((sp, i) => { const a = t0 + (blk ? 0.3 : 0) + i * per, q = seg(t, a, a + 0.22, E.expoOut); set(sp, { transform: q < 1 ? `translateX(${f1(-(1 - q) * size * 0.5)}px)` : '', opacity: q < 1 ? String(f3(q)) : '' }); });
      });
      return { el: wrap, size };
    };
    // Caption text: bold, "printed" left to right; a small colour bar on the left (bar)
    B.label = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, col = C(o.color, PAL.ink), text = String(o.text);
      let size = F.px(o.size ?? 44);
      // wrap: true = wrap at maxW (size unchanged); otherwise shrink the text when one line doesn't fit
      if (o.maxW && !o.wrap) size = Math.min(size, (F.px(o.maxW) * 0.95) / Math.max(1, estUnits(text) + (o.bar ? 0.8 : 0)));
      const wrap = el('div', `left:0;top:0;display:none;pointer-events:none;${o.z !== undefined ? `z-index:${o.z};` : 'z-index:20;'}`, parent);
      wrap.dataset.what = 'B.label';
      const line = el('div', `position:relative;font:700 ${f1(size)}px/1.35 ${B.body};color:${col};${o.wrap && o.maxW ? `white-space:normal;width:${f1(F.px(o.maxW))}px;box-sizing:border-box;text-align:${o.align === 'center' || !o.align ? 'center' : o.align};` : 'white-space:nowrap;'}${o.bg ? `background:${C(o.bg)};padding:${f1(size * 0.2)}px ${f1(size * 0.4)}px;` : ''}${o.bar ? `padding-left:${f1(size * 0.75)}px;` : ''}`, wrap);
      if (o.bar) el('div', `left:${o.bg ? f1(size * 0.2) : 0}px;top:22%;width:${f1(size * 0.36)}px;height:56%;background:${C(o.bar === true ? 'red' : o.bar)}`, line);
      line.appendChild(document.createTextNode(text));
      F.text(line, o.kind ?? 'label', text, at - 0.35, until);
      if (o.sfx !== false) F.sfx(at - 0.3, o.sfx ?? 'tick', o.gain ?? 0.25);
      F.prep(() => measure(wrap));
      F.add((t) => {
        const on = t >= at - 0.35 && t < until; set(wrap, { display: on ? '' : 'none' }); if (!on) return;
        const ww = wrap._w ?? wrap.offsetWidth, hh = wrap._h ?? wrap.offsetHeight, x = (o.x ?? W / 2) - (o.align === 'left' ? 0 : o.align === 'right' ? ww : ww / 2), y = (o.y ?? H * 0.7) - hh / 2;
        const q = seg(t, at - 0.35, at, E.expoOut), out = until < 1e8 ? seg(t, until - 0.25, until, E.quartIn) : 0;
        set(wrap, { transform: `translate(${f1(x)}px,${f1(y)}px)`, clipPath: q < 1 ? `inset(0 ${f1((1 - q) * 100)}% 0 0)` : out > 0 ? `inset(0 0 0 ${f1(out * 100)}%)` : '' });
      });
      return { el: wrap, size };
    };
    // Big number: counts up (digits in condensed Oswald)
    B.number = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, col = C(o.color, PAL.red), digits = o.digits ?? (String(o.value).includes('.') ? String(o.value).split('.')[1].length : 0);
      const size = F.px(o.size ?? 220), val = Number(o.value), from = o.from ?? 0;
      const wrap = el('div', `left:0;top:0;display:none;pointer-events:none;font:700 ${f1(size)}px/1 ${B.num};color:${col};white-space:nowrap;${o.z !== undefined ? `z-index:${o.z};` : 'z-index:20;'}`, parent);
      const txt = (v) => (o.prefix ?? '') + v.toFixed(digits) + (o.unit ?? '');
      wrap.textContent = txt(val);
      F.text(wrap, o.kind ?? 'slam', txt(val), at - 0.8, until);
      F.prep(() => measure(wrap));
      if (o.sfx !== false) F.sfx(at, 'stamp', 0.5);
      F.add((t) => {
        const on = t >= at - 0.8 && t < until; set(wrap, { display: on ? '' : 'none' }); if (!on) return;
        const q = seg(t, at - 0.8, at, E.expoOut), v = lerp(from, val, q), out = until < 1e8 ? seg(t, until - 0.3, until, E.quartIn) : 0;
        // count: false = don't count (years, an aperture like ƒ/1.48 — counting up means nothing): just stamp it in
        if (o.count === false) { const k = seg(t, at - 0.25, at, E.backOut); set(wrap, { opacity: String(f3(Math.min(1, k * 3))) }); wrap.style.scale = String(f3(0.6 + 0.4 * k)); }
        else wrap.textContent = txt(q >= 1 ? val : Math.round(v * 10 ** digits) / 10 ** digits);
        const ww = wrap._w ?? wrap.offsetWidth, hh = wrap._h ?? wrap.offsetHeight, x = (o.x ?? W / 2) - (o.align === 'left' ? 0 : ww / 2), y = (o.y ?? H / 2) - hh / 2;
        set(wrap, { transform: `translate(${f1(x - out * F.px(80))}px,${f1(y)}px)`, opacity: out ? String(f3(1 - out)) : '' });
      });
      return { el: wrap };
    };

    // ---------- Assembly: a few basic shapes fly in from all sides and lock into place ----------
    // parts: [{ kind, x, y, w, h, r, rot, color, … }], coordinates relative to (o.x, o.y) in design size, then times scale
    B.assemble = (parent, o) => {
      const at = o.at ?? 0, every = o.every ?? 0.12, sc = o.scale ?? 1, n = o.parts.length, seed = hashStr(o.seed ?? JSON.stringify(o.parts).length);
      const cx = o.x ?? W / 2, cy = o.y ?? H / 2;
      const items = o.parts.map((p, i) => {
        const ang = ((seed >> (i % 16)) % 360) * 1 + i * 137.5, t = at - (n - 1 - i) * every;
        return B.shape(parent, { ...p, x: cx + F.px((p.x ?? 0) * sc), y: cy + F.px((p.y ?? 0) * sc), w: p.w !== undefined ? p.w * sc : undefined, h: p.h !== undefined ? p.h * sc : undefined, r: p.r !== undefined ? p.r * sc : undefined, at: t, until: o.until, enter: p.enter ?? 'slide', from: p.from ?? ang % 360, to: p.to ?? (ang + 180) % 360, sfx: i === n - 1 ? 'clank' : false, gain: 0.4, z: p.z ?? o.z });
      });
      return { items };
    };
    // Rays: a bundle of wedges shooting from (x, y) toward angle (megaphone, manifesto, "making a sound")
    B.rays = (parent, o) => {
      const n = o.n ?? 5, spread = o.spread ?? 50, len = o.len ?? 700, at = o.at ?? 0;
      for (let i = 0; i < n; i++) {
        const a = (o.angle ?? 0) - spread / 2 + (spread * i) / Math.max(1, n - 1), L = len * (i % 2 ? 0.82 : 1), c = Math.cos(a * RAD), s = Math.sin(a * RAD);
        B.shape(parent, { kind: [[0, 0.5], [1, 0.38], [1, 0.62]], x: (o.x ?? W / 2) + F.px(c * L / 2), y: (o.y ?? H / 2) + F.px(s * L / 2), w: L, h: o.thick ?? 46, rot: a, color: o.color ?? 'ink', at: at + i * 0.04, until: o.until, enter: 'grow', exit: 'grow', sfx: i === 0 ? 'whoosh' : false, gain: 0.3, z: o.z });
      }
    };
    // Thick arrow: grows from (x1, y1) to (x2, y2)
    B.arrow = (parent, o) => {
      const dx = o.x2 - o.x1, dy = o.y2 - o.y1, L = Math.hypot(dx, dy) / F.px(1), a = Math.atan2(dy, dx) / RAD, w = o.w ?? 34, head = w * 2.2;
      const body = B.shape(parent, { kind: 'rect', x: o.x1 + (dx * (L - head * 0.6)) / L / 2, y: o.y1 + (dy * (L - head * 0.6)) / L / 2, w: L - head * 0.6, h: w, rot: a, color: o.color ?? 'ink', at: (o.at ?? 0) - 0.12, until: o.until, enter: 'grow', exit: 'grow', sfx: false, z: o.z });
      const tip = B.shape(parent, { kind: [[1, 0.5], [0, 0], [0, 1]], x: o.x2 - (dx / L) * head * 0.5, y: o.y2 - (dy / L) * head * 0.5, w: head, h: head * 1.1, rot: a, color: o.color ?? 'ink', at: o.at ?? 0, until: o.until, enter: 'pop', exit: 'pop', sfx: o.sfx ?? 'snap', gain: 0.3, z: o.z });
      return { body, tip };
    };
    // Photo collage: black-and-white photo (contrast boosted) cut into circle / square / triangle with a colour overprint — for mood; put product screenshots in as-is (S.shot)
    B.photo = (parent, o) => {
      const s = B.shape(parent, { kind: o.shape ?? 'rect', x: o.x, y: o.y, w: o.w ?? 600, h: o.h ?? 400, r: o.r, rot: o.rot ?? 0, color: 'transparent', at: o.at, until: o.until, enter: o.enter ?? 'wipe', exit: o.exit ?? 'fade', sfx: o.sfx, z: o.z });
      const img = el('img', `inset:0;width:100%;height:100%;object-fit:${o.fit ?? 'cover'};filter:grayscale(1) contrast(1.35)${o.tint ? '' : ' sepia(.15)'}`, s.inner);
      img.src = o.src;
      if (o.tint) el('div', `inset:0;background:${C(o.tint)};mix-blend-mode:multiply`, s.inner);
      return s;
    };

    // ---------- Transition: a big shape sweeps across to cover the frame, the scene changes at that moment, then it sweeps off ----------
    let wipeLayer = null;
    // onto: the next scene's ground ('paper' | 'red' | 'black') — when the transition colour matches the next ground (a red wedge sweeping onto red) it looks like nothing happened, so it switches to black / red automatically
    // Full cover holds only 2–3 frames: the entry decelerates to exactly full cover, and right after `at` the next scene starts to show (no more waiting on a full-screen flat colour)
    B.wipe = (o) => {
      wipeLayer ??= F.layer('pointer-events:none', 90);
      const at = o.at, dur = o.dur ?? 0.5, kind = o.kind ?? 'wedge', half = dur / 2;
      const nextBg = o.onto ? (GROUNDS[o.onto] ?? GROUNDS.paper).bg : null, want = C(o.color, B.colors.red), col = nextBg && want.toLowerCase() === nextBg.toLowerCase() ? (o.onto === 'red' ? PAL.ink : B.colors.red) : want;
      F.sfx(at - half, 'whoosh', 0.45, { dur }); F.cut(at); F.transition(at - half, at + half);
      const qOf = (t) => (t < at ? seg(t, at - half, at, E.cubicInOut) : 1 + seg(t, at, at + half, E.cubicInOut));
      const skip = (e) => { e.dataset.motion = 'skip'; return e; };   // transitions are registered hard cuts: not counted as "sudden camera change" by the motion check
      if (kind === 'bars') {
        const bars = [0, 1, 2, 3].map((i) => skip(el('div', `left:0;top:${f1((H / 4) * i)}px;width:${f1(W)}px;height:${f1(H / 4 + 2)}px;background:${i % 2 ? (col === PAL.ink ? B.colors.red : PAL.ink) : col};display:none`, wipeLayer)));
        F.add((t) => { const on = t >= at - half && t < at + half; bars.forEach((b, i) => { set(b, { display: on ? '' : 'none' }); if (!on) return; const q = qOf(t), side = i % 2 ? 1 : -1; set(b, { transform: `translateX(${f1(q <= 1 ? side * W * (1 - q) : -side * W * (q - 1))}px)` }); }); });
        return at;
      }
      if (kind === 'circle') {
        // the circle grows from a point on the right to exactly cover the frame (radius = distance to the farthest corner), then shrinks while moving left — the next scene shows as soon as it shrinks
        const c0 = [W * 0.78, H / 2], c1 = [W * 0.22, H / 2], R = Math.hypot(Math.max(c0[0], W - c0[0]), H / 2) * 1.03;
        const box = skip(el('div', `left:0;top:0;width:${f1(2 * R)}px;height:${f1(2 * R)}px;border-radius:50%;background:${col};display:none`, wipeLayer));
        F.add((t) => { const on = t >= at - half && t < at + half; set(box, { display: on ? '' : 'none' }); if (!on) return; const q = qOf(t), k = q <= 1 ? 0 : q - 1, sc = q <= 1 ? Math.max(0.001, q) : Math.max(0.001, 1 - k), cx = lerp(c0[0], c1[0], k); set(box, { transform: `translate(${f1(cx - R)}px,${f1(c0[1] - R)}px) scale(${f3(sc)})` }); });
        return at;
      }
      // Wedge: point facing left, driven in from the right; at full cover the solid part spans from the left edge to just past the right edge; after `at` it keeps moving left and the next scene shows on the right at once
      const BW = 1.9 * W, BH = 3 * H, box = skip(el('div', `left:0;top:0;width:${f1(BW)}px;height:${f1(BH)}px;background:${col};display:none;clip-path:${clipOf([[0, 0.5], [0.42, 0], [1, 0], [1, 1], [0.42, 1]])}`, wipeLayer));
      const L0 = W, Lc = -0.42 * BW - W * 0.02, L1 = -BW - W * 0.05;
      F.add((t) => {
        const on = t >= at - half && t < at + half; set(box, { display: on ? '' : 'none' }); if (!on) return;
        const q = qOf(t), left = q <= 1 ? lerp(L0, Lc, q) : lerp(Lc, L1, q - 1);
        set(box, { transform: `translate(${f1(left)}px,${f1(H / 2 - BH / 2)}px)` });
      });
      return at;
    };

    // ---------- End card ----------
    B.endcard = (parent, o) => {
      // Landscape: red circle on the right, big slanted text over the left with the black bar under its baseline; small text under the red circle. Portrait: the whole group stacks lower, between 0.3 and 0.78 (the bottom 22% is left for the platform's text)
      const at = o.at, ts = PT ? 130 : 170;
      B.shape(parent, { kind: 'circle', r: PT ? 290 : 330, x: W * (PT ? 0.66 : 0.7), y: H * (PT ? 0.38 : 0.42), color: 'red', at: at + 0.2, enter: 'pop', sfx: 'thud', gain: 0.5 });
      B.shape(parent, { kind: 'rect', w: PT ? 1300 : 2300, h: PT ? 60 : 70, x: W * 0.45, y: H * (PT ? 0.56 : 0.64), rot: -14, color: 'ink', at: at + 0.35, enter: 'grow', sfx: false });
      B.slogan(parent, { text: o.title, x: W * (PT ? 0.46 : 0.42), y: H * (PT ? 0.46 : 0.44), rot: -14, size: ts, maxW: PT ? 900 : 1300, at: at + 0.9, kind: 'logo' });
      if (o.sub) B.label(parent, { text: o.sub, x: W * (PT ? 0.5 : 0.56), y: H * (PT ? 0.66 : 0.84), align: PT ? 'center' : 'left', size: PT ? 42 : 44, bar: 'red', maxW: PT ? 960 : 780, at: at + 1.6, kind: 'endcard' });
      // URL: must be readable on a phone too (size follows the big text, at least 64)
      if (o.url) B.label(parent, { text: o.url, x: W * (PT ? 0.5 : 0.56), y: H * (PT ? 0.74 : 0.92), align: PT ? 'center' : 'left', size: o.urlSize ?? Math.max(64, ts * 0.42), color: 'ink', bg: 'yellow', at: at + 2.1, kind: 'endcard' });
      F.sfx(at + 2.4, 'logo', 1);
    };
    return P.infoKit ? P.infoKit(B, { shape: 'shape', arrow: 'arrow', assemble: 'illustration', photo: 'image' }) : B;   // info-density check: info components register themselves when called (promo.js infoKit)
  };
  P.bauhaus.PAL = PAL;
})();
