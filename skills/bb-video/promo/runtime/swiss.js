// swiss.js: Swiss poster kinetic typography (瑞士风动态排版, one of bb-video's visual styles; style notes in styles/swiss/STYLE.md). Load after promo.js.
// One frame: a Swiss International Typographic Style poster in motion. Huge grotesk type is the picture — words fill the frame and are cropped by its edge;
// off-white grid paper, black, and one accent colour (from the product's brand); micro meta labels (index numerals .1 .2, a date, a section name), big arrows →, hairline rules on a grid.
// Type is always *brought in*: letters rise one by one out of a line mask, lines slide inside their masks, digits roll in strips. Information is told typographically:
// numbered lists (.1 .2 .3), check-chip card grids, giant rolling numerals, flat bar charts, old / new side by side, real screenshots placed as poster elements with accent marks.
// Signature moves: the poster pulls out into a wall of its own colour variants, a repeating text-pattern wall, a giant cropped glyph, an extruded glyph turning in 3D, orbit rings, nested frames.
// All text is DOM (the automatic checks work as usual); colours come from CSS variables on each scene layer, so a cloned poster can be recoloured (the wall).
//
//   const X = PROMO.swiss(F, { accent, ground: 'paper' | 'ink' | 'accent', colors, font })
//   X.scene(a, z, { ground, grid, variant, push, z }) → layer          a scene: layer + ground (grid paper) + a very slow push, shown in [a, z)
//   X.bg(layer, { ground, grid, variant })                          the ground only (variant 0 fine grid / 1 grid + column guides / 2 baseline rows / 3 plain)
//   X.type(parent, { text, x, y, top, size, weight, align, color, at, until, by, enter, exit, maxW, bleed, drift, kind }) → { el, size, move }
//       giant grotesk type ('\n' or an array = several lines); letters rise out of each line's mask (enter: rise | drop | slide | none); exit: rise | fade | none; bleed: true = deliberately cropped by the frame edge
//   X.line(parent, { text, x, y, size, maxW, align, color, at, until, kind }) → { el, size }       a readable sentence, words rising in (wraps at maxW)
//   X.meta(parent, { text, x, y, size, align, color, at, until, fact }) → { el }                  a micro label (index, date, section name), wiped in; fact: false = layout text, not fact-checked
//   X.arrow(parent, { x, y, size, dir, color, at, until, weight }) → { el }                       a big arrow → (dir in degrees, 0 = right), drawn on
//   X.rule(parent, { x, y, w, h, vertical, color, at, until, from }) → { el }                      a hairline / bar growing along the grid (x, y = start point)
//   X.list(parent, { items: [{ text, note, value, hot, at }], x, y, w, size, gap, at, every, until }) → [{ x, y }]   numbered list .1 .2 .3 (steps, points)
//   X.chips(parent, { items: [{ text, tag, hot, at }], x, y, w, h, cols, gap, size, at, every, until, scheme }) → [{ x, y }]   check-chip cards tiling into a grid (features)
//   X.stat(parent, { value, label, x, y, size, align, color, at, until, roll, bleed, labelSize }) → { el }   a giant numeral, digits rolling in strips
//   X.bars(parent, { data: [[name, value, { hot, text }]], x, y, w, h, unit, prefix, decimals, max, at, every, until, size }) → [{ x, y }]   flat bar chart
//   X.versus(parent, { cols: [{ label, title, value, points, hot }], x, y, w, h, at, every, until, arrow }) → [{ x, y }]   old / new side by side
//   X.shot(parent, { src, x, y, w, h, fit, pos, at, until, caption, index, from, marks: [{ x, y, w, h, note, at }], notes, dim }) → { el, box, img }   a real screenshot as a poster element
//   X.wall({ source, at, until, snap, cols, rows, to, dur, grounds, gap, z })                     the poster pulls out into a wall of its colour variants
//   X.pattern(parent, { text, sep, at, until, size, rows, color, flip, flipColor, speed })        a repeating text-pattern wall (rows drifting in opposite directions)
//   X.glyph(parent, { char, x, y, size, color, at, until, drift, rot })                           a giant cropped glyph (decorative: not registered as text)
//   X.extrude(parent, { text, x, y, size, depth, color, side, at, until, spin, tilt })             an extruded glyph turning in 3D
//   X.orbits(parent, { x, y, r, rings, at, until, color })                                        dotted orbit rings turning around a point
//   X.frames(parent, { text, x, y, w, h, n, size, at, until })                                    nested rounded frames pushing in around one punchy line
//   X.wipe({ at, kind: 'whip' | 'bands' | 'dot', color, dur, x, y }) → at                          transition (full cover at `at`, the scene changes there)
//   X.end(parent, { at, title, sub, url, meta })                                                   end card
//
// Units: x, y, w, h, maxW are frame px (use W / H fractions); size is a design size (1080p, converted with F.px). Time: at = landed and readable (on the beat); until = fully gone.
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('swiss.js 要在 promo.js 之后加载', 'swiss.js must load after promo.js'));
  const { lerp } = window.EV;
  const { E, seg, set, el } = P;
  const f1 = (n) => Math.round(n * 10) / 10;
  const f3 = (n) => Math.round(n * 1000) / 1000;
  const RAD = Math.PI / 180;
  const meas = document.createElement('canvas').getContext('2d');
  const textW = (text, font) => { meas.font = font; return meas.measureText(text).width; };
  const cjk = (s) => /[⺀-鿿豈-﫿＀-￯]/.test(s);
  const rgbOf = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const hexOf = (r) => '#' + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const x = rgbOf(a), y = rgbOf(b); return x && y ? hexOf(x.map((v, i) => v + (y[i] - v) * t)) : a; };
  const rgba = (c, a) => { const x = rgbOf(c); return x ? `rgba(${x.join(',')},${a})` : c; };
  const relL = (c) => { const r = rgbOf(c) || [0, 0, 0]; const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r[0]) + 0.7152 * f(r[1]) + 0.0722 * f(r[2]); };
  const contrast = (a, b) => { const p = relL(a), q = relL(b); return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05); };
  // size after fonts load; hidden ancestors (a scene not on screen at prep time) are shown for the moment of measuring — a display:none element measures 0
  const measure = (e) => { const hid = []; for (let n = e; n && n !== document.body; n = n.parentElement) if (n.style.display === 'none') { hid.push(n); n.style.display = ''; } e._w = e.offsetWidth; e._h = e.offsetHeight; for (const n of hid) n.style.display = 'none'; };
  // a number inside a string ('$9.99', '42', '46%', '35k', '1,000') → its parts, for counting and rolling
  const numParts = (s) => { const m = /^(.*?)(-?[\d,]*\.?\d+)(.*)$/.exec(String(s)); if (!m) return null; const raw = m[2], dec = raw.includes('.') ? raw.split('.')[1].length : 0; return { pre: m[1], num: Number(raw.replace(/,/g, '')), dec, comma: raw.includes(','), post: m[3] }; };
  const fmt = (p, v) => { let s = v.toFixed(p.dec); if (p.comma) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return p.pre + s + p.post; };

  // ---------- Colours: off-white paper, black, one accent (the brand's) ----------
  const PAL = { paper: '#F1F0EB', ink: '#111111', accent: '#E5381F', grey: '#8C8B86', white: '#FFFFFF' };

  P.swiss = function (F, opt = {}) {
    if (!document.getElementById('sw-css')) { const st = document.createElement('style'); st.id = 'sw-css'; st.textContent = '.sw-cell::before{content:attr(data-d)}'; document.head.appendChild(st); }
    const X = { F }, W = F.W, H = F.H, PT = F.portrait, u = F.px(1);
    X.colors = { ...PAL, ...(opt.colors || {}) };
    if (opt.accent) X.colors.accent = opt.accent;
    const fonts = F.theme.fonts || {};
    // A grotesk first (Inter Tight: tight Helvetica-class shapes), Chinese falls to Noto Sans SC; listing the Latin font first keeps ’ “ ” narrow
    X.font = opt.font ?? fonts.display ?? '"Inter Tight", "Noto Sans SC", sans-serif';
    X.body = opt.body ?? fonts.sans ?? X.font;
    X.ground = opt.ground ?? 'paper';
    const { paper, ink, accent, grey } = X.colors;
    // on an accent ground the text is whichever of ink / paper reads better, and the "accent" role goes to the other one
    const onAcc = contrast(accent, ink) >= contrast(accent, paper) ? ink : paper;
    // the accent on a ground must still read (≥ 3.2:1): step it toward paper on the dark ground, toward ink on the light one
    const readable = (c, bg, to) => { let x = c; for (let k = 1; k <= 10 && contrast(x, bg) < 3.2; k++) x = mix(c, to, k * 0.08); return x; };
    X.grounds = {
      paper: { bg: paper, ink, acc: readable(accent, paper, ink), mute: grey, line: rgba(ink, 0.075), card: PAL.white, cardInk: ink },
      ink: { bg: ink, ink: paper, acc: readable(accent, ink, paper), mute: '#7D7C77', line: rgba(paper, 0.08), card: '#1E1E1D', cardInk: paper },
      accent: { bg: accent, ink: onAcc, acc: onAcc === ink ? paper : ink, mute: rgba(onAcc, 0.62), line: rgba(onAcc, 0.12), card: onAcc === ink ? paper : ink, cardInk: onAcc === ink ? ink : paper },
    };
    X.vars = (node, name) => { const g = X.grounds[name] ?? X.grounds.paper; for (const k of Object.keys(g)) node.style.setProperty('--sw-' + k, g[k]); node._ground = name; return g; };
    // colour roles resolve to CSS variables, so recolouring a layer (or a clone of it) recolours everything in it
    const ROLE = { ink: 'ink', acc: 'acc', accent: 'acc', mute: 'mute', grey: 'mute', bg: 'bg', paper: 'bg', line: 'line', card: 'card', cardInk: 'cardInk' };
    const C = (c, d) => { const k = c ?? d; return ROLE[k] ? `var(--sw-${ROLE[k]})` : k; };
    X.C = C;
    const LEAD_T = 0.6;

    // ---------- Ground: grid paper ----------
    X.bg = (layer, o = {}) => {
      X.vars(layer, o.ground ?? X.ground);
      const v = o.variant ?? 0, step = F.px(o.step ?? 54), lw = Math.max(1, f1(u * 1.2));
      const wrap = el('div', 'inset:0;overflow:hidden;background:var(--sw-bg)', layer);
      wrap.dataset.what = 'X.bg';
      const grid = (s, w2) => `linear-gradient(var(--sw-line) ${w2}px, transparent ${w2}px),linear-gradient(90deg, var(--sw-line) ${w2}px, transparent ${w2}px)`;
      if (o.grid !== false && v % 4 === 0) el('div', `inset:0;background-image:${grid(step, lw)};background-size:${f1(step)}px ${f1(step)}px;background-position:${f1(-step / 2)}px ${f1(-step / 2)}px`, wrap);
      if (o.grid !== false && v % 4 === 1) { el('div', `inset:0;background-image:${grid(step, lw)};background-size:${f1(step)}px ${f1(step)}px`, wrap); const cols = PT ? 6 : 12; for (let i = 1; i < cols; i++) el('div', `left:${f1((W / cols) * i)}px;top:0;width:${lw}px;height:100%;background:var(--sw-line)`, wrap); }
      if (o.grid !== false && v % 4 === 2) el('div', `inset:0;background-image:linear-gradient(var(--sw-line) ${lw}px, transparent ${lw}px);background-size:100% ${f1(step * 0.75)}px`, wrap);
      return { el: wrap };
    };
    X.scene = (a, z, o = {}) => {
      const L = F.layer('', o.z ?? 1), push = o.push ?? 0.025;
      const z2 = Math.max(a + 1, Math.min(z, F.duration ?? z));   // the last scene (z past the end) pushes over what is left of the film, not over a long-gone z
      F.add((t) => { const on = t >= a && t < z; set(L, { display: on ? '' : 'none' }); if (on && push) set(L, { transform: `scale(${f3(1 + push * seg(t, a, z2, E.sine))})` }); });
      X.bg(L, o);
      return L;
    };

    // ---------- Giant type ----------
    X.type = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, align = o.align ?? 'left';
      const lines = (Array.isArray(o.text) ? o.text : String(o.text).split('\n')).map(String);
      const all = lines.join(''), weight = o.weight ?? 500, track = o.tracking ?? (cjk(all) ? -0.01 : -0.045), lead = o.leading ?? (cjk(all) ? 1.04 : 0.9);
      let size = F.px(o.size ?? (PT ? 200 : 260));
      const wOf = (s) => Math.max(...lines.map((l) => textW(l, `${weight} ${s}px ${X.font}`) + [...l].length * track * s));
      if (o.maxW) size = Math.min(size, (size * o.maxW) / Math.max(1, wOf(size)));
      const LH = size * 1.24, by = o.by ?? (all.length > 26 ? 'word' : 'char'), enter = o.enter ?? 'rise', exit = o.exit ?? 'rise';
      const wrap = el('div', `left:0;top:0;display:none;pointer-events:none;z-index:${o.z ?? 20}`, parent);
      wrap.dataset.what = 'X.type';
      const parts = [];
      const rows = lines.map((ln, li) => {
        // the line band: letters below / above it are cut by each letter's own clip-path (an overflow mask would make the motion sheet measure only the visible sliver)
        const mask = el('div', `position:relative;height:${f1(LH)}px;white-space:pre;font:${weight} ${f1(size)}px/${f1(LH)}px ${X.font};letter-spacing:${track}em;color:${C((o.colors && o.colors[li]) ?? o.color, 'ink')};text-align:${align};${li < lines.length - 1 ? `margin-bottom:${f1(size * lead - LH)}px;` : ''}`, wrap);
        const inner = el('span', 'position:relative;display:inline-block', mask);
        const bits = by === 'line' ? [ln] : by === 'word' ? ln.split(/(\s+)/).filter((x) => x) : [...ln];
        // mark: substrings set in the accent colour ('2.0' in "Studio 2.0")
        const hot = new Set(); for (const m of [].concat(o.mark ?? [])) { let i = ln.indexOf(m); while (m && i >= 0) { for (let k = i; k < i + m.length; k++) hot.add(k); i = ln.indexOf(m, i + m.length); } }
        let pos = 0;
        for (const b of bits) { const s = el('span', `position:relative;display:inline-block;white-space:pre${hot.has(pos) ? `;color:${C(o.markColor, 'acc')}` : ''}`, inner); s.textContent = b; pos += b.length; if (b.trim()) parts.push({ s, li }); }
        return { mask, inner };
      });
      // rise time: long enough that a letter never travels more than ~5.5% of the frame height per frame (cubic ease-out peaks at 3× the mean speed)
      const n = parts.length, per = o.stagger ?? Math.min(0.045, 0.42 / Math.max(1, n)), lg = 0.08, dur = o.dur ?? Math.max(LEAD_T, Math.min(0.95, (3 * LH * 0.96) / (0.055 * H * 30)));
      const lead2 = enter === 'none' ? 0 : dur + per * Math.max(0, n - 1) + lg * (lines.length - 1), t0 = at - lead2;
      F.text(wrap, o.kind ?? 'slam', lines.join('\n'), t0, until, { bleed: !!o.bleed, noFact: !!o.noFact });
      if (enter === 'none') F.appear(at);
      if (o.sfx !== false) { if (enter !== 'none' && o.rise !== false) F.sfx(t0 + 0.02, 'rise', (o.gain ?? 0.5) * 0.6, { dur: lead2 }); F.sfx(at - 0.03, o.sfx ?? 'snap', o.gain ?? 0.5); }
      F.prep(() => measure(wrap));
      const st = { x: o.x ?? W / 2, y: o.y ?? H / 2 }, moves = [];
      const T = { el: wrap, size, rows, lines };
      T.move = (t, x, y, d = 0.6, e = E.expoInOut) => { moves.push({ a: t - d, b: t, x, y, e }); return T; };
      const exitDur = 0.42, outPer = Math.min(0.03, 0.25 / Math.max(1, n));
      F.add((t) => {
        const on = t >= t0 && t < until; set(wrap, { display: on ? '' : 'none' }); if (!on) return;
        let x = st.x, y = st.y;
        for (const m of moves) { const q = seg(t, m.a, m.b, m.e); x = lerp(x, m.x ?? x, q); y = lerp(y, m.y ?? y, q); }
        if (o.drift) { x += o.drift[0] * (t - t0); y += (o.drift[1] ?? 0) * (t - t0); }
        const ww = wrap._w ?? wrap.offsetWidth, hh = wrap._h ?? wrap.offsetHeight;
        const left = align === 'left' ? x : align === 'right' ? x - ww : x - ww / 2, top = o.top !== undefined ? o.top + (y - st.y) : y - hh / 2;
        const zq = o.zoom ? 1 + (o.zoom - 1) * (1 - seg(t, t0, at + 0.4, E.expoOut)) : 1;
        set(wrap, { transform: `translate(${f1(left)}px,${f1(top)}px)${zq !== 1 ? ` scale(${f3(zq)})` : ''}`, opacity: exit === 'fade' && until < 1e8 ? String(f3(1 - seg(t, until - 0.3, until))) : '' });
        if (enter === 'slide') rows.forEach((r, li) => { const q = seg(t, t0 + li * lg, t0 + li * lg + dur + per * n, E.expoOut), dx = (1 - q) * ww * 1.05; set(r.inner, { transform: q < 1 ? `translateX(${f1(-dx)}px)` : '', clipPath: q < 1 ? `inset(-0.3em -0.3em -0.3em ${f1(dx)}px)` : '' }); });
        parts.forEach((p, k) => {
          let dy = 0;
          if (enter === 'rise' || enter === 'drop') { const a = t0 + p.li * lg + k * per, q = seg(t, a, a + dur, E.cubicOut); dy = (enter === 'rise' ? 1 : -1) * (1 - q) * LH * 0.96; }
          if (exit === 'rise' && until < 1e8) { const a = until - exitDur - outPer * (n - 1) + k * outPer, q = seg(t, a, a + exitDur, E.quartIn); dy -= q * LH * 0.96; }
          set(p.s, { transform: Math.abs(dy) > 0.05 ? `translateY(${f1(dy)}px)` : '', clipPath: dy > 0.05 ? `inset(0 -0.2em ${f1(Math.min(LH, dy))}px -0.2em)` : dy < -0.05 ? `inset(${f1(Math.min(LH, -dy))}px -0.2em 0 -0.2em)` : '' });
        });
      });
      return T;
    };

    // ---------- A readable sentence: words rise in (wraps at maxW) ----------
    X.line = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, text = String(o.text), weight = o.weight ?? 500;
      const size = F.px(o.size ?? (PT ? 44 : 46)), LH = size * 1.3, align = o.align ?? 'left';
      const wrap = el('div', `left:0;top:0;display:none;pointer-events:none;z-index:${o.z ?? 20}`, parent);
      wrap.dataset.what = 'X.line';
      const box = el('div', `position:relative;font:${weight} ${f1(size)}px/${f1(LH)}px ${X.body};letter-spacing:${cjk(text) ? 0 : -0.012}em;color:${C(o.color, 'ink')};text-align:${align};${o.maxW ? `width:${f1(o.maxW)}px;white-space:normal;` : 'white-space:nowrap;'}`, wrap);
      // Chinese rises in groups of up to three characters (each group still wraps on its own); Latin by word
      const bits = cjk(text) ? text.match(/[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]{1,3}|[^\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]+/g) : text.split(/(\s+)/).filter((x) => x);
      const parts = [];
      for (const b of bits) {
        if (!b.trim()) { box.appendChild(document.createTextNode(b)); continue; }
        // a Latin run inside Chinese keeps its spaces as separate words
        for (const w of cjk(b) ? [b] : b.split(/(\s+)/).filter((x) => x)) {
          if (!w.trim()) { box.appendChild(document.createTextNode(w)); continue; }
          const m = el('span', `position:relative;display:inline-block;vertical-align:top;height:${f1(LH)}px`, box);
          const s = el('span', 'position:relative;display:inline-block;white-space:pre', m); s.textContent = w; parts.push(s);
        }
      }
      const n = parts.length, per = o.per ?? Math.min(0.05, 0.5 / Math.max(1, n)), dur = o.dur ?? 0.5, lead2 = dur + per * (n - 1), t0 = at - lead2;
      F.text(box, o.kind ?? 'label', text, t0, until, { noFact: !!o.noFact });
      if (o.sfx !== false) F.sfx(t0 + 0.05, o.sfx ?? 'tick', o.gain ?? 0.22);
      F.prep(() => measure(wrap));
      F.add((t) => {
        const on = t >= t0 && t < until; set(wrap, { display: on ? '' : 'none' }); if (!on) return;
        const ww = wrap._w ?? wrap.offsetWidth, hh = wrap._h ?? wrap.offsetHeight, x = o.x ?? W / 2, y = o.y ?? H * 0.7;
        set(wrap, { transform: `translate(${f1(align === 'left' ? x : align === 'right' ? x - ww : x - ww / 2)}px,${f1(o.top !== undefined ? o.top : y - hh / 2)}px)` });
        parts.forEach((s, k) => {
          const a = t0 + k * per, q = seg(t, a, a + dur, E.expoOut), qo = until < 1e8 && o.exit !== 'none' ? seg(t, until - 0.32, until, E.quartIn) : 0;   // exit: 'none' = leaves with the transition that covers it
          const dy = (1 - q) * LH - qo * LH;
          set(s, { transform: Math.abs(dy) > 0.05 ? `translateY(${f1(dy)}px)` : '', clipPath: dy > 0.05 ? `inset(0 -0.2em ${f1(Math.min(LH, dy))}px -0.2em)` : dy < -0.05 ? `inset(${f1(Math.min(LH, -dy))}px -0.2em 0 -0.2em)` : '' });
        });
      });
      return { el: wrap, size, box };
    };

    // ---------- Micro meta label: wiped in from the left ----------
    X.meta = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, size = F.px(o.size ?? 22), align = o.align ?? 'left', text = String(o.text);
      const wrap = el('div', `left:0;top:0;display:none;pointer-events:none;white-space:nowrap;z-index:${o.z ?? 21};font:${o.weight ?? 500} ${f1(size)}px/${f1(size * 1.25)}px ${X.body};letter-spacing:${o.tracking ?? 0.01}em;color:${C(o.color, 'ink')}`, parent);
      wrap.textContent = text; wrap.dataset.what = 'X.meta';
      const a0 = at - 0.3;
      F.text(wrap, o.kind ?? 'label', text, a0, until, { chrome: o.chrome ?? true, noFact: o.fact === false });
      F.prep(() => measure(wrap));
      F.add((t) => {
        const on = t >= a0 && t < until; set(wrap, { display: on ? '' : 'none' }); if (!on) return;
        const ww = wrap._w ?? wrap.offsetWidth, hh = wrap._h ?? wrap.offsetHeight, x = o.x ?? 0, y = o.y ?? 0;
        const q = seg(t, a0, at, E.expoOut), qo = until < 1e8 ? seg(t, until - 0.25, until, E.quartIn) : 0;
        set(wrap, { transform: `translate(${f1((align === 'left' ? x : align === 'right' ? x - ww : x - ww / 2) - (1 - q) * size * 0.6)}px,${f1(y - hh / 2)}px)`, clipPath: q < 1 ? `inset(0 ${f1((1 - q) * 100)}% 0 0)` : qo > 0 ? `inset(0 0 0 ${f1(qo * 100)}%)` : '' });
      });
      return { el: wrap };
    };

    // ---------- Arrow →: shaft drawn on, then the head ----------
    const NS = 'http://www.w3.org/2000/svg';
    const svg = (parent, css) => { const v = document.createElementNS(NS, 'svg'); v.setAttribute('viewBox', '0 0 100 100'); v.style.cssText = `position:absolute;overflow:visible;${css}`; parent.appendChild(v); return v; };
    const sv = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
    X.arrow = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, s = F.px(o.size ?? 160), a0 = at - 0.45;
      const box = el('div', `left:${f1((o.x ?? W / 2) - s / 2)}px;top:${f1((o.y ?? H / 2) - s / 2)}px;width:${f1(s)}px;height:${f1(s)}px;display:none;z-index:${o.z ?? 20};color:${C(o.color, 'ink')}`, parent);
      box.dataset.what = 'X.arrow';
      const v = svg(box, 'inset:0;width:100%;height:100%');
      const sw = o.weight ?? 7.5;
      const shaft = sv('path', { d: 'M6 50 L90 50', fill: 'none', stroke: 'currentColor', 'stroke-width': sw, pathLength: 1, 'stroke-dasharray': '1 1' }, v);
      const head = sv('path', { d: 'M58 18 L91 50 L58 82', fill: 'none', stroke: 'currentColor', 'stroke-width': sw, 'stroke-linejoin': 'miter', pathLength: 1, 'stroke-dasharray': '1 1' }, v);
      if (o.sfx !== false) F.sfx(at - 0.1, 'snap', 0.3);
      F.add((t) => {
        const on = t >= a0 && t < until; set(box, { display: on ? '' : 'none' }); if (!on) return;
        const q1 = seg(t, a0, at - 0.12, E.expoOut), q2 = seg(t, at - 0.25, at, E.expoOut), qo = until < 1e8 ? seg(t, until - 0.3, until, E.quartIn) : 0;
        set(shaft, { strokeDashoffset: String(f3(1 - q1)) }); set(head, { strokeDashoffset: String(f3(1 - q2)) });
        const d = (o.dir ?? 0) * RAD;
        set(box, { transform: `translate(${f1(Math.cos(d) * qo * s * 0.6)}px,${f1(Math.sin(d) * qo * s * 0.6)}px) rotate(${o.dir ?? 0}deg)`, opacity: qo ? String(f3(1 - qo)) : '' });
      });
      return { el: box };
    };

    // ---------- Rule: a hairline / bar growing along the grid ----------
    X.rule = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, vert = !!o.vertical, len = o.w ?? o.len ?? W * 0.5, th = F.px(o.h ?? o.thick ?? 2.5), a0 = at - 0.55;
      const from = o.from ?? (vert ? 'top' : 'left');
      const r = el('div', `left:${f1(o.x ?? 0)}px;top:${f1(o.y ?? 0)}px;width:${f1(vert ? th : len)}px;height:${f1(vert ? len : th)}px;background:${C(o.color, 'ink')};display:none;z-index:${o.z ?? 19};transform-origin:${from === 'right' ? '100% 50%' : from === 'bottom' ? '50% 100%' : from === 'center' ? '50% 50%' : '0 0'}`, parent);
      r.dataset.what = 'X.rule'; r.dataset.motion = 'snap';
      F.add((t) => {
        const on = t >= a0 && t < until; set(r, { display: on ? '' : 'none' }); if (!on) return;
        const q = seg(t, a0, at, E.expoOut), qo = until < 1e8 && o.exit !== 'none' ? seg(t, until - 0.3, until, E.quartIn) : 0, k = q * (1 - qo);
        set(r, { transform: vert ? `scaleY(${f3(k)})` : `scaleX(${f3(k)})` });
      });
      return { el: r };
    };

    // ---------- Numbered list .1 .2 .3 ----------
    X.list = (parent, o) => {
      const items = o.items.map((it) => (typeof it === 'string' ? { text: it } : it)), n = items.length, at = o.at ?? 0, every = o.every ?? F.B, until = o.until ?? 1e9;
      const x = o.x ?? W * 0.08, w = o.w ?? W * 0.84, size = o.size ?? (PT ? 64 : 72), rowH = F.px(o.gap ?? size * 1.55), top = o.y ?? H * 0.3;
      const idxW = F.px(size * 0.9);
      return items.map((it, j) => {
        const T = it.at ?? at + j * every, y = top + j * rowH, cy = y + rowH * 0.42;
        X.meta(parent, { text: o.num ? o.num(j) : `.${j + 1}`, x, y: cy - F.px(size) * 0.28, size: Math.max(22, size * 0.34), at: T - 0.1, until, fact: false, color: it.hot ? 'acc' : 'mute' });
        X.type(parent, { text: it.text, x: x + idxW, y: cy, size, weight: 500, align: 'left', at: T, until, kind: 'label', by: 'word', color: it.hot ? 'acc' : 'ink', maxW: w - idxW - (it.value ? F.px(size * 3.2) : 0), sfx: false, exit: 'fade', z: 21 });
        if (o.sfx !== false) F.sfx(T - 0.03, 'snap', 0.32);   // one lock per row
        if (it.value) X.type(parent, { text: String(it.value), x: x + w, y: cy, size, weight: 500, align: 'right', at: T + 0.08, until, kind: 'label', color: it.hot ? 'acc' : 'ink', sfx: false, exit: 'fade', z: 21 });
        if (it.note) X.line(parent, { text: it.note, x: x + idxW, y: cy + F.px(size) * 0.72, size: Math.max(28, size * 0.42), at: T + 0.25, until, color: 'mute', maxW: w - idxW, sfx: false });
        X.rule(parent, { x, y: y + rowH * 0.94, w, h: 2, at: T + 0.1, until, color: 'ink' });
        return { x: x + w / 2, y: cy };
      });
    };

    // ---------- Check-chip cards tiling into a grid ----------
    X.chips = (parent, o) => {
      const items = o.items.map((it) => (typeof it === 'string' ? { text: it } : it)), n = items.length, cols = o.cols ?? (PT ? 2 : 3), rowsN = Math.ceil(n / cols);
      const at = o.at ?? 0, every = o.every ?? F.B / 2, until = o.until ?? 1e9, gap = F.px(o.gap ?? 22), w = o.w ?? W * 0.84, x0 = o.x ?? (W - w) / 2;
      const cw = (w - gap * (cols - 1)) / cols, ch = o.h ?? Math.min(cw * 0.5, F.px(PT ? 250 : 220)), y0 = o.y ?? (H - (rowsN * ch + (rowsN - 1) * gap)) / 2;
      const size = F.px(o.size ?? (PT ? 38 : 36)), pad = Math.min(ch, cw) * 0.13, scheme = o.scheme ?? 'alt';
      // order of arrival: a diagonal wave (top-left first), or as listed
      const order = items.map((_, k) => k).sort((a, b) => (o.order === 'list' ? a - b : ((a % cols) + Math.floor(a / cols)) - ((b % cols) + Math.floor(b / cols)) || a - b));
      return items.map((it, k) => {
        const r = Math.floor(k / cols), c = k % cols, T = it.at ?? at + order.indexOf(k) * every, a0 = T - 0.45;
        const dark = it.hot ? 'acc' : scheme === 'ink' ? true : scheme === 'paper' ? false : (r + c) % 2 === 0;
        const bg = it.hot ? 'var(--sw-acc)' : dark ? 'var(--sw-ink)' : 'var(--sw-card)', fg = it.hot ? 'var(--sw-bg)' : dark ? 'var(--sw-bg)' : 'var(--sw-cardInk)';
        const cx = x0 + c * (cw + gap), cy = y0 + r * (ch + gap);
        const card = el('div', `left:${f1(cx)}px;top:${f1(cy)}px;width:${f1(cw)}px;height:${f1(ch)}px;border-radius:${f1(ch * 0.14)}px;background:${bg};color:${fg};${dark || it.hot ? '' : `box-shadow:inset 0 0 0 ${f1(u * 2)}px var(--sw-line);`}display:none;z-index:${o.z ?? 18};overflow:hidden`, parent);
        card.dataset.what = 'X.chips';
        const ic = F.px(o.icon ?? 44), v = svg(card, `left:${f1(pad)}px;top:${f1(pad)}px;width:${f1(ic)}px;height:${f1(ic)}px`);
        const ring = sv('circle', { cx: 50, cy: 50, r: 44, fill: 'none', stroke: 'currentColor', 'stroke-width': 7, pathLength: 1, 'stroke-dasharray': '1 1' }, v);
        const tick = sv('path', { d: 'M29 52 L44 66 L72 36', fill: 'none', stroke: 'currentColor', 'stroke-width': 8, 'stroke-linecap': 'square', pathLength: 1, 'stroke-dasharray': '1 1' }, v);
        // one line if it can: shrink up to ~28% to fit the card's width before allowing a wrap (a wrapped label grows up into the check icon)
        const tw = textW(it.text, `500 ${size}px ${X.body}`), fs = tw > cw - 2 * pad ? Math.max(size * 0.72, (size * (cw - 2 * pad)) / tw) : size;
        const tx = el('div', `left:${f1(pad)}px;right:${f1(pad)}px;bottom:${f1(pad * 0.85)}px;font:500 ${f1(fs)}px/${f1(fs * 1.12)}px ${X.body};letter-spacing:-0.015em`, card);
        tx.textContent = it.text;
        F.text(tx, 'label', it.text, a0 + 0.1, until);
        if (it.tag) { const tg = el('div', `right:${f1(pad)}px;top:${f1(pad)}px;font:500 ${f1(F.px(20))}px/1.2 ${X.body};letter-spacing:.02em;opacity:.8`, card); tg.textContent = it.tag; F.text(tg, 'label', it.tag, a0 + 0.1, until, { chrome: true }); }
        if (o.sfx !== false) F.sfx(T - 0.06, 'chip', 0.32 + (k % 3) * 0.04);
        F.add((t) => {
          const on = t >= a0 && t < until; set(card, { display: on ? '' : 'none' }); if (!on) return;
          const q = seg(t, a0, T, E.expoOut), qo = until < 1e8 ? seg(t, until - 0.35 + (k / n) * 0.1, until, E.quartIn) : 0;
          set(card, { transform: `translateY(${f1((1 - q) * ch * 0.45 - qo * ch * 0.3)}px) scale(${f3(0.86 + 0.14 * q)})`, opacity: String(f3(Math.min(1, q * 1.6) * (1 - qo))) });
          set(ring, { strokeDashoffset: String(f3(1 - seg(t, T - 0.2, T + 0.2, E.expoOut))) });
          set(tick, { strokeDashoffset: String(f3(1 - seg(t, T, T + 0.25, E.expoOut))) });
        });
        return { x: cx + cw / 2, y: cy + ch / 2 };
      });
    };

    // ---------- Giant numeral: digits roll in strips ----------
    X.stat = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, value = String(o.value), align = o.align ?? 'left', weight = o.weight ?? 500;
      let size = F.px(o.size ?? (PT ? 300 : 380));
      if (o.maxW) size = Math.min(size, (size * o.maxW) / Math.max(1, textW(value, `${weight} ${size}px ${X.font}`) * 0.96));
      const LH = size * 1.06, track = -0.05;
      const wrap = el('div', `left:0;top:0;display:none;pointer-events:none;z-index:${o.z ?? 20};white-space:nowrap;font:${weight} ${f1(size)}px/${f1(LH)}px ${X.font};letter-spacing:${track}em;font-feature-settings:'tnum' 1;color:${C(o.color, 'ink')}`, parent);
      wrap.dataset.what = 'X.stat';
      const roll = o.roll !== false, chars = [...value], strips = [];
      let di = 0; const nd = chars.filter((ch) => /\d/.test(ch)).length;
      for (const ch of chars) {
        const m = el('span', `position:relative;display:inline-block;overflow:hidden;vertical-align:top;height:${f1(LH)}px`, wrap);
        if (/\d/.test(ch) && roll) {
          // the strip: the digit, then 0–9 below it (the visible window ends on the real digit, read top-down as it rolls up)
          const d = Number(ch), seq = [...Array(10).keys()].map((k) => (d + 1 + k) % 10).concat([d]);
          const col = el('span', 'position:relative;display:inline-block', m);
          col.innerHTML = seq.map((x, k) => (k < seq.length - 1 ? `<span class="sw-cell" data-d="${x}" style="display:block;height:${f1(LH)}px"></span>` : `<span style="display:block;height:${f1(LH)}px">${x}</span>`)).join('');
          // only the last cell is real text for the checks: the rest are rolling texture
          strips.push({ col, steps: seq.length - 1, i: di++, kind: 'roll' });
        } else { const s = el('span', 'position:relative;display:inline-block;white-space:pre', m); s.textContent = ch; strips.push({ col: s, i: di, kind: 'rise' }); }
      }
      const dur = 0.8, per = 0.07, lead2 = dur + per * Math.max(0, nd - 1), t0 = at - lead2;
      F.text(wrap, o.kind ?? 'slam', value, t0, until, { bleed: !!o.bleed });
      if (o.sfx !== false) { F.sfx(t0 + 0.05, 'roll', 0.3, { dur: lead2 }); F.sfx(at - 0.02, o.sfx ?? 'stamp', o.gain ?? 0.55); }
      F.prep(() => measure(wrap));
      let lab = null;
      F.add((t) => {
        const on = t >= t0 && t < until; set(wrap, { display: on ? '' : 'none' }); if (!on) return;
        const ww = wrap._w ?? wrap.offsetWidth, hh = wrap._h ?? wrap.offsetHeight, x = o.x ?? W / 2, y = o.y ?? H / 2;
        set(wrap, { transform: `translate(${f1(align === 'left' ? x : align === 'right' ? x - ww : x - ww / 2)}px,${f1(y - hh / 2)}px)` });
        const qo = until < 1e8 && o.exit !== 'none' ? seg(t, until - 0.4, until, E.quartIn) : 0;
        for (const s of strips) {
          const a = t0 + s.i * per, q = seg(t, a, a + dur, E.expoOut);
          const dy = s.kind === 'roll' ? -(q * s.steps) * LH : (1 - seg(t, t0 + 0.2, t0 + 0.2 + dur, E.expoOut)) * LH;
          set(s.col, { transform: `translateY(${f1(dy - qo * LH * (s.kind === 'roll' ? 0 : 1))}px)` });
          if (s.kind === 'roll' && qo) set(s.col.parentElement, { clipPath: `inset(0 0 ${f1(qo * 100)}% 0)` });
        }
      });
      // the label: a readable line above or below the numeral
      if (o.label) {
        const below = o.labelPos !== 'above', ls = o.labelSize ?? (PT ? 40 : 42), gapL = F.px(ls) * 0.5;
        lab = X.line(parent, { exit: o.exit, text: o.label, x: align === 'left' ? (o.x ?? W / 2) + size * 0.04 : o.x ?? W / 2, y: (o.y ?? H / 2) + (below ? 1 : -1) * (LH / 2 + gapL + F.px(ls) * 0.6), size: ls, align, maxW: o.labelW, at: at + 0.15, until, color: o.labelColor ?? 'ink', sfx: false });
      }
      return { el: wrap, size, label: lab };
    };

    // ---------- Flat bar chart ----------
    X.bars = (parent, o) => {
      const data = o.data, n = data.length, at = o.at ?? 0, every = o.every ?? F.B / 2, until = o.until ?? 1e9;
      const x = o.x ?? W * 0.08, w = o.w ?? W * 0.84, y = o.y ?? H * 0.25, h = o.h ?? H * 0.55, rowH = h / n;
      const size = o.size ?? Math.min(PT ? 44 : 46, (rowH / u) * 0.36), nameW = o.nameW ?? w * (PT ? 0.4 : 0.3), valW = F.px(size * 3.4);
      const mx = o.max ?? Math.max(...data.map((d) => d[1])), barX = x + nameW, barMax = w - nameW - valW;
      X.rule(parent, { x: barX, y, len: h, vertical: true, h: 2, at: at - 0.2, until, color: 'ink', exit: o.exit });
      return data.map(([name, val, ex = {}], j) => {
        const T = ex.at ?? at + j * every, cy = y + rowH * (j + 0.5), bh = Math.min(rowH * 0.56, F.px(70)), hot = ex.hot ?? (o.hot || []).includes(j), bw = Math.max(F.px(6), (barMax * val) / mx);
        X.line(parent, { exit: o.exit, text: String(name), x, y: cy, size, maxW: nameW - F.px(24), at: T, until, color: hot ? 'acc' : 'ink', sfx: false, weight: hot ? 600 : 500 });
        const bar = el('div', `left:${f1(barX)}px;top:${f1(cy - bh / 2)}px;width:${f1(bw)}px;height:${f1(bh)}px;background:${hot ? 'var(--sw-acc)' : 'var(--sw-ink)'};transform-origin:0 50%;display:none;z-index:18`, parent);
        bar.dataset.what = 'X.bars'; bar.dataset.motion = 'snap';   // a bar shooting out from the axis is the move: not "too fast"
        const vt = String(ex.text ?? `${o.prefix ?? ''}${Number.isInteger(val) && o.decimals === undefined ? val : val.toFixed(o.decimals ?? 1)}${o.unit ?? ''}`), np = numParts(vt);
        const v = el('div', `left:0;top:0;display:none;font:500 ${f1(F.px(size * 1.25))}px/1.1 ${X.font};letter-spacing:-0.03em;font-feature-settings:'tnum' 1;color:${hot ? 'var(--sw-acc)' : 'var(--sw-ink)'};white-space:nowrap;z-index:19`, parent);
        v.textContent = vt; F.text(v, 'label', vt, T - 0.6, until);
        F.prep(() => measure(v));
        if (o.sfx !== false) F.sfx(T - 0.5, 'bar', 0.3);
        F.add((t) => {
          const on = t >= T - 0.6 && t < until; set(bar, { display: on ? '' : 'none' }); set(v, { display: on ? '' : 'none' }); if (!on) return;
          const q = seg(t, T - 0.6, T + 0.15, E.expoOut), qo = until < 1e8 && o.exit !== 'none' ? seg(t, until - 0.35, until, E.quartIn) : 0, k = q * (1 - qo);
          set(bar, { transform: `scaleX(${f3(Math.max(0.001, k))})` });
          const tq = P.frameT ? P.frameT(t) : t, qc = seg(tq, T - 0.6, T + 0.1, E.expoOut);
          v.textContent = np && qc < 1 ? fmt(np, np.num * qc) : vt;
          set(v, { transform: `translate(${f1(barX + bw * k + F.px(18))}px,${f1(cy - (v._h ?? 0) / 2)}px)`, opacity: String(f3(Math.min(1, q * 2) * (1 - qo))) });
        });
        return { x: barX + bw / 2, y: cy };
      });
    };

    // ---------- Old / new side by side ----------
    X.versus = (parent, o) => {
      const cols = o.cols, m = cols.length, at = o.at ?? 0, every = o.every ?? F.B * 2, until = o.until ?? 1e9;
      const x = o.x ?? W * 0.08, w = o.w ?? W * 0.84, y = o.y ?? H * 0.22, h = o.h ?? H * 0.6, stack = o.stack ?? PT;
      const cw = stack ? w : w / m, chh = stack ? h / m : h;
      // the divider: a rule between the columns (or rows); an arrow on it says "became"
      for (let j = 1; j < m; j++) {
        if (stack) X.rule(parent, { x, y: y + chh * j, w, h: 2, at: at + every * j - 0.3, until });
        else X.rule(parent, { x: x + cw * j, y, len: h, vertical: true, h: 2, at: at + every * j - 0.3, until });
        if (o.arrow !== false) X.arrow(parent, { x: stack ? x + w - F.px(80) : x + cw * j, y: stack ? y + chh * j : y + h * 0.42, size: 110, dir: stack ? 90 : 0, at: at + every * j - 0.15, until, color: 'acc', sfx: false });
      }
      return cols.map((col, j) => {
        const T = col.at ?? at + j * every, cx = stack ? x : x + cw * j + (j ? F.px(70) : 0), cy = stack ? y + chh * j : y, inner = cw - (j || stack ? F.px(stack ? 0 : 70) : F.px(60)) - F.px(40);
        const tone = col.hot ? 'acc' : j < m - 1 && o.dimOld !== false ? 'mute' : 'ink';
        if (col.label) X.meta(parent, { text: col.label, x: cx, y: cy + F.px(24), size: 26, at: T - 0.1, until, color: tone === 'acc' ? 'acc' : 'mute', chrome: false });
        let yy = cy + F.px(70);
        if (col.value !== undefined) { const sz = col.size ?? (stack ? 200 : 300); X.stat(parent, { value: col.value, x: cx - F.px(sz) * 0.04, y: yy + F.px(sz) * 0.53, size: sz, align: 'left', at: T, until, color: tone, maxW: inner, sfx: j ? 'stamp' : undefined }); yy += F.px(sz) * 1.08; }
        if (col.title) { const sz = col.titleSize ?? (stack ? 64 : 76); X.type(parent, { text: col.title, x: cx, y: yy + F.px(sz) * 0.55, size: sz, align: 'left', at: T + 0.1, until, kind: 'label', color: tone, maxW: inner, by: 'word', exit: 'fade', sfx: false }); yy += F.px(sz) * 1.25; }
        (col.points || []).forEach((pt, r) => { const ps = col.pointSize ?? (PT ? 38 : 38); X.line(parent, { text: String(pt), x: cx, y: yy + F.px(ps) * (0.7 + r * 1.45), size: ps, maxW: inner, at: (col.ats && col.ats[r]) ?? T + 0.3 + r * 0.2, until, color: tone === 'mute' ? 'mute' : 'ink', sfx: false }); });
        return { x: cx + cw / 2, y: cy + chh / 2 };
      });
    };

    // ---------- A real screenshot as a poster element ----------
    X.shot = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, w = o.w ?? W * 0.6, h = o.h ?? H * 0.6, x = (o.x ?? W / 2) - w / 2, y = (o.y ?? H / 2) - h / 2, a0 = at - 0.65, from = o.from ?? 'bottom';
      const frame = el('div', `left:${f1(x)}px;top:${f1(y)}px;width:${f1(w)}px;height:${f1(h)}px;overflow:hidden;background:#fff;box-shadow:0 0 0 ${f1(u * 2)}px var(--sw-ink);display:none;z-index:${o.z ?? 15}`, parent);
      frame.dataset.what = 'X.shot';
      // crop: { x, y, w, h } = the region of the screenshot to show (fractions of the image); marks are then given in image fractions too
      const cr = o.crop;
      const img = el('img', cr ? `left:${f1((-cr.x * w) / cr.w)}px;top:${f1((-cr.y * h) / cr.h)}px;width:${f1(w / cr.w)}px;height:${f1(h / cr.h)}px;max-width:none;transform-origin:${f1(((cr.x + cr.w / 2) * 100))}% ${f1(((cr.y + cr.h / 2) * 100))}%` : `left:0;top:0;width:100%;height:100%;object-fit:${o.fit ?? 'cover'};object-position:${o.pos ?? '50% 0%'};transform-origin:50% 50%`, frame);
      img.src = o.src;
      const clipIn = (q) => (from === 'left' ? `inset(0 ${f1((1 - q) * 100)}% 0 0)` : from === 'right' ? `inset(0 0 0 ${f1((1 - q) * 100)}%)` : from === 'top' ? `inset(0 0 ${f1((1 - q) * 100)}% 0)` : `inset(${f1((1 - q) * 100)}% 0 0 0)`);
      if (o.sfx !== false) F.sfx(a0 + 0.05, 'slide', 0.4);
      F.add((t) => {
        const on = t >= a0 && t < until; set(frame, { display: on ? '' : 'none' }); if (!on) return;
        const q = seg(t, a0, at, E.expoOut), qo = until < 1e8 ? seg(t, until - 0.35, until, E.quartIn) : 0;
        set(frame, { clipPath: q < 1 ? clipIn(q) : qo > 0 ? `inset(0 0 ${f1(qo * 100)}% 0)` : '' });
        set(img, { transform: `scale(${f3(1.08 - 0.08 * seg(t, a0, at + 0.6, E.expoOut))})` });
      });
      if (o.caption) X.meta(parent, { text: o.caption, x, y: y + h + F.px(30), size: o.captionSize ?? 24, at: at + 0.1, until, color: 'mute', chrome: true });
      const box = { x, y, w, h };
      // marks: accent outlines drawn round a few spots, a numbered tag, the rest dimmed; notes in a column beside (landscape) or below (portrait)
      const marks = o.marks || [], noteAt = o.notes ?? (PT ? 'below' : 'right');
      marks.forEach((mk, j) => {
        const T = mk.at ?? at + 0.6 + j * F.B * 2, b = j < marks.length - 1 ? (marks[j + 1].at ?? at + 0.6 + (j + 1) * F.B * 2) : until, keep = o.keep ?? false, end = keep ? until : b;
        const rx = cr ? ((mk.x - cr.x) / cr.w) * w : mk.x * w, ry = cr ? ((mk.y - cr.y) / cr.h) * h : mk.y * h, rw = cr ? (mk.w / cr.w) * w : mk.w * w, rh = cr ? (mk.h / cr.h) * h : mk.h * h, sw = F.px(5);
        if (o.dim !== false) {
          const dim = el('div', `left:${f1(rx)}px;top:${f1(ry)}px;width:${f1(rw)}px;height:${f1(rh)}px;box-shadow:0 0 0 ${f1(Math.max(w, h) * 2)}px rgba(17,17,17,.3);opacity:0;z-index:2`, frame);
          dim.dataset.motion = 'skip';
          F.add((t) => set(dim, { opacity: String(f3(Math.min(seg(t, T - 0.35, T, E.expoOut), end < 1e8 ? 1 - seg(t, end - 0.3, end) : 1))) }));
        }
        const v = document.createElementNS(NS, 'svg'); v.setAttribute('viewBox', `0 0 ${f1(rw + sw * 2)} ${f1(rh + sw * 2)}`); v.style.cssText = `position:absolute;left:${f1(x + rx - sw)}px;top:${f1(y + ry - sw)}px;width:${f1(rw + sw * 2)}px;height:${f1(rh + sw * 2)}px;overflow:visible;display:none;z-index:${(o.z ?? 15) + 2};color:var(--sw-acc)`; parent.appendChild(v);
        const rect = sv('rect', { x: sw, y: sw, width: f1(rw), height: f1(rh), fill: 'none', stroke: 'currentColor', 'stroke-width': f1(sw), pathLength: 1, 'stroke-dasharray': '1 1' }, v);
        const tag = el('div', `left:${f1(x + rx - sw)}px;top:${f1(y + ry - sw - F.px(46))}px;height:${f1(F.px(46))}px;padding:0 ${f1(F.px(12))}px;background:var(--sw-acc);color:#fff;font:600 ${f1(F.px(28))}px/${f1(F.px(46))}px ${X.font};display:none;z-index:${(o.z ?? 15) + 3}`, parent);
        tag.textContent = `.${j + 1}`; F.text(tag, 'label', `.${j + 1}`, T - 0.2, end, { noFact: true, chrome: true });
        if (o.sfx !== false) F.sfx(T - 0.2, 'mark', 0.4);
        F.add((t) => {
          const on = t >= T - 0.45 && t < end; v.style.display = on ? '' : 'none'; set(tag, { display: on && t >= T - 0.2 ? '' : 'none' }); if (!on) return;
          set(rect, { strokeDashoffset: String(f3(1 - seg(t, T - 0.45, T, E.expoOut))) });
          const qo = end < 1e8 ? seg(t, end - 0.3, end, E.quartIn) : 0, qt = seg(t, T - 0.2, T + 0.1, E.expoOut);
          v.style.opacity = qo ? String(f3(1 - qo)) : '';
          set(tag, { clipPath: qt < 1 ? `inset(${f1((1 - qt) * 100)}% 0 0 0)` : '', opacity: qo ? String(f3(1 - qo)) : '' });
        });
        if (mk.note) {
          const ns = o.noteSize ?? (PT ? 42 : 48);
          // notes that replace each other leave before the next one comes in (no two notes on top of each other during the hand-over)
          const nx = noteAt === 'right' ? x + w + F.px(56) : x, ny = noteAt === 'right' ? (mk.noteY ?? y + ry + rh / 2) : y + h + F.px(o.caption ? 44 : 0) + F.px(ns) * (2.1 + (keep ? j * 1.6 : 0));
          const nw = noteAt === 'right' ? W - nx - F.px(60) : w, nEnd = keep || end >= until ? end : end - 0.4;
          X.meta(parent, { text: `.${j + 1}`, x: nx, y: ny - F.px(ns) * 1.35, size: 26, at: T + 0.1, until: nEnd, color: 'acc', fact: false });
          X.line(parent, { text: mk.note, x: nx, top: ny - F.px(ns) * 0.65, size: ns, maxW: nw, at: T + 0.4, until: nEnd, sfx: false });   // top-anchored: a note that wraps grows downward, away from its number
        }
      });
      return { el: frame, box, img };
    };

    // ---------- The poster pulls out into a wall of its colour variants ----------
    // source = a scene layer; at `snap` (default at) a still copy is taken of it, tiled around the live poster in the other grounds, and the camera pulls out
    X.wall = (o) => {
      const at = o.at, until = o.until ?? 1e9, snap = o.snap ?? at, cols = o.cols ?? 5, rows = o.rows ?? 5, gap = F.px(o.gap ?? 30), to = o.to ?? 0.28, dur = o.dur ?? 1.4;
      const grounds = o.grounds ?? ['ink', 'accent', 'paper'];
      const L = F.layer('', o.z ?? 30);
      set(L, { background: X.colors.ink, display: 'none' });
      const grid = el('div', `left:0;top:0;width:${W}px;height:${H}px;transform-origin:50% 50%`, L);
      grid.dataset.what = 'X.wall';
      const tiles = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const dx = c - (cols >> 1), dy = r - (rows >> 1);
        const tile = el('div', `left:${f1(dx * (W + gap))}px;top:${f1(dy * (H + gap))}px;width:${W}px;height:${H}px;overflow:hidden`, grid);
        tiles.push({ tile, dx, dy, g: dx === 0 && dy === 0 ? null : grounds[(((dx + dy) % grounds.length) + grounds.length * 4 + (dy & 1)) % grounds.length] });
      }
      F.prep(() => {
        F.render(snap);
        for (const T of tiles) {
          const cl = o.source.cloneNode(true);
          cl.style.display = ''; cl.removeAttribute('id');
          for (const e of [cl, ...cl.querySelectorAll('*')]) { delete e.dataset?.what; }
          if (T.g) X.vars(cl, T.g);
          T.tile.appendChild(cl);
        }
      });
      if (o.sfx !== false) F.sfx(at + 0.05, 'pull', 0.5, { dur });
      F.blur(at, at + dur, 10);
      F.add((t) => {
        const on = t >= at && t < until; set(L, { display: on ? '' : 'none' }); if (!on) return;
        const s = lerp(1, to, seg(t, at, at + dur, E.expoInOut)), pan = o.pan ? o.pan * seg(t, at + dur * 0.5, until, E.sine) : 0;
        set(grid, { transform: `translate(${f1(pan * W)}px,0) scale(${f3(s)})` });
      });
      return { el: L };
    };

    // ---------- Repeating text-pattern wall ----------
    X.pattern = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, text = String(o.text), size = F.px(o.size ?? (PT ? 120 : 130)), LH = size * 1.08, rows = o.rows ?? Math.ceil(H / LH) + 1;
      const sep = o.sep ?? '✓', speed = F.px(o.speed ?? 90), a0 = at - 0.5;
      const unit = `${text}  ${sep}  `, unitW = textW(unit, `500 ${size}px ${X.font}`) * 0.97, reps = Math.ceil((W * 1.6) / unitW) + 2;
      const wrap = el('div', `inset:0;overflow:hidden;display:none;z-index:${o.z ?? 12}`, parent);
      wrap.dataset.what = 'X.pattern';
      const yTop = (H - rows * LH) / 2, mid = rows >> 1;
      const R = Array.from({ length: rows }, (_, r) => {
        const row = el('div', `left:0;top:${f1(yTop + r * LH)}px;white-space:pre;font:500 ${f1(size)}px/${f1(LH)}px ${X.font};letter-spacing:-0.035em;color:${C(o.color, 'mute')}`, wrap);
        row.dataset.motion = 'skip';
        for (let k = 0; k < reps; k++) { const s = el('span', 'position:relative', row); s.textContent = text; const g = el('span', 'position:relative', row); g.textContent = `  ${sep}  `; g.style.fontSize = '0.6em'; g.style.verticalAlign = '0.25em'; }
        if (r === mid) F.text(row, o.kind ?? 'slam', text, a0, until, { bleed: true, overlap: true });   // a texture: text may be set over it
        return row;
      });
      if (o.sfx !== false) { F.sfx(a0, 'rise', 0.4, { dur: 0.5 }); if (o.flip !== undefined) F.sfx(o.flip, 'snap', 0.45); }
      F.add((t) => {
        const on = t >= a0 && t < until; set(wrap, { display: on ? '' : 'none' }); if (!on) return;
        R.forEach((row, r) => {
          const dir = r % 2 ? 1 : -1, off = (r * unitW * 0.37) % unitW, q = seg(t, a0 + Math.abs(r - mid) * 0.04, a0 + Math.abs(r - mid) * 0.04 + 0.5, E.expoOut);
          let x = -unitW + off + dir * speed * (t - a0); x = ((x % unitW) + unitW) % unitW - unitW;
          const fl = o.flip !== undefined ? seg(t, o.flip + Math.abs(r - mid) * 0.035, o.flip + Math.abs(r - mid) * 0.035 + 0.02) : 0;
          set(row, { transform: `translate(${f1(x)}px,${f1((1 - q) * LH)}px)`, color: fl >= 1 ? C(o.flipColor, 'acc') : C(o.color, 'mute') });
        });
      });
      return { el: wrap };
    };

    // ---------- Giant cropped glyph (a chapter number, an initial): decorative ----------
    X.glyph = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, size = F.px(o.size ?? 1300), a0 = at - 0.5;
      const g = el('div', `left:0;top:0;display:none;white-space:pre;font:${o.weight ?? 500} ${f1(size)}px/0.8 ${X.font};letter-spacing:-0.06em;color:${C(o.color, 'acc')};z-index:${o.z ?? 5}`, parent);
      g.textContent = o.char ?? '1'; g.dataset.what = 'X.glyph';
      F.prep(() => measure(g));
      F.add((t) => {
        const on = t >= a0 && t < until; set(g, { display: on ? '' : 'none' }); if (!on) return;
        const q = seg(t, a0, at, E.expoOut), dr = o.drift ?? [-F.px(40), 0];
        const x = (o.x ?? W / 2) - (g._w ?? 0) / 2 + dr[0] * (t - at) + (1 - q) * W * (o.from === 'left' ? -0.6 : 0.6), y = (o.y ?? H / 2) - (g._h ?? 0) / 2 + (dr[1] ?? 0) * (t - at);
        set(g, { transform: `translate(${f1(x)}px,${f1(y)}px) rotate(${f1((o.rot ?? 0) * (1 - q * 0.2))}deg)` });
      });
      F.blur(a0, at, 8);
      return { el: g };
    };

    // ---------- Extruded glyph turning in 3D ----------
    X.extrude = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, size = F.px(o.size ?? (PT ? 520 : 600)), N = o.layers ?? 26, depth = F.px(o.depth ?? 120), a0 = at - 0.7;
      const face = o.color ? (o.color.startsWith('#') ? o.color : X.colors[o.color] ?? X.colors.accent) : X.colors.accent, side = o.side ?? mix(face, '#000000', 0.42);
      const stage = el('div', `left:${f1(o.x ?? W / 2)}px;top:${f1(o.y ?? H / 2)}px;width:0;height:0;perspective:${f1(F.px(2200))}px;display:none;z-index:${o.z ?? 16}`, parent);
      stage.dataset.what = 'X.extrude';
      const body = el('div', 'left:0;top:0;transform-style:preserve-3d', stage);
      body.dataset.motion = 'skip';
      const mk = (k) => { const d = el('div', `left:0;top:0;transform:translate(-50%,-50%) translateZ(${f1(-depth * (k / (N - 1)) + depth / 2)}px);white-space:pre;font:${o.weight ?? 600} ${f1(size)}px/1 ${X.font};letter-spacing:-0.04em;color:${k === 0 ? face : mix(side, face, (0.35 * (N - 1 - k)) / (N - 1))}`, body); d.textContent = o.text; return d; };
      for (let k = N - 1; k >= 1; k--) mk(k);
      const front = mk(0);
      F.text(front, o.kind ?? 'slam', String(o.text), a0, until, { noFact: !!o.noFact });
      if (o.sfx !== false) { F.sfx(a0, 'rise', 0.4, { dur: 0.7 }); F.sfx(at, o.sfx ?? 'impact', o.gain ?? 0.5); }
      F.add((t) => {
        const on = t >= a0 && t < until; set(stage, { display: on ? '' : 'none' }); if (!on) return;
        const q = seg(t, a0, at, E.backOut), qo = until < 1e8 ? seg(t, until - 0.35, until, E.quartIn) : 0;
        const ry = (o.from ?? -110) * (1 - seg(t, a0, at, E.expoOut)) + (o.spin ?? 14) * (t - at) + (o.turn ?? 0), rx = o.tilt ?? 10;
        set(body, { transform: `scale(${f3(Math.max(0.01, (0.3 + 0.7 * q) * (1 - qo)))}) rotateX(${f1(rx)}deg) rotateY(${f1(ry)}deg)` });
      });
      return { el: stage, front };
    };

    // ---------- Orbit rings: dotted circles turning round a point ----------
    X.orbits = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, r = F.px(o.r ?? 420), n = o.rings ?? 4, a0 = at - 0.6;
      const box = el('div', `left:${f1((o.x ?? W / 2) - r)}px;top:${f1((o.y ?? H / 2) - r)}px;width:${f1(2 * r)}px;height:${f1(2 * r)}px;display:none;z-index:${o.z ?? 8};color:${C(o.color, 'ink')}`, parent);
      box.dataset.what = 'X.orbits';
      const rings = Array.from({ length: n }, (_, i) => {
        const v = svg(box, 'inset:0;width:100%;height:100%');
        v.dataset.motion = 'skip';
        const rr = 48 * (0.32 + (0.68 * i) / Math.max(1, n - 1)), dots = Math.round(10 + i * 9), c = 2 * Math.PI * rr;
        sv('circle', { cx: 50, cy: 50, r: f3(rr), fill: 'none', stroke: 'currentColor', 'stroke-width': 0.9 + (i % 2) * 0.5, 'stroke-linecap': 'round', 'stroke-dasharray': `0.01 ${f3(c / dots)}`, opacity: 0.85 - i * 0.1 }, v);
        sv('circle', { cx: 50, cy: 50, r: f3(rr), fill: 'none', stroke: 'currentColor', 'stroke-width': 0.18, opacity: 0.25 }, v);
        return v;
      });
      F.add((t) => {
        const on = t >= a0 && t < until; set(box, { display: on ? '' : 'none' }); if (!on) return;
        const qo = until < 1e8 ? seg(t, until - 0.4, until, E.quartIn) : 0;
        rings.forEach((v, i) => {
          const q = seg(t, a0 + i * 0.08, a0 + i * 0.08 + 0.6, E.expoOut);
          v.style.transform = `rotate(${f1((i % 2 ? -1 : 1) * (14 + i * 6) * (t - a0))}deg) scale(${f3((0.55 + 0.45 * q) * (1 + qo * 0.4))})`;
          v.style.opacity = String(f3(q * (1 - qo)));
        });
      });
      return { el: box };
    };

    // ---------- Nested rounded frames pushing in round one punchy line ----------
    X.frames = (parent, o) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, n = o.n ?? 4, text = String(o.text), size = F.px(o.size ?? (PT ? 54 : 58));
      const tw = textW(text, `500 ${size}px ${X.body}`), pw = o.w ?? Math.min(W * 0.88, tw + size * 2.4), ph = o.h ?? size * 2.3, cx = o.x ?? W / 2, cy = o.y ?? H / 2, a0 = at - 0.4;
      const frames = Array.from({ length: n }, (_, i) => {
        const k = n - i, fw = pw + k * F.px(PT ? 110 : 150), fh = ph + k * F.px(PT ? 140 : 120);
        const f = el('div', `left:${f1(cx - fw / 2)}px;top:${f1(cy - fh / 2)}px;width:${f1(fw)}px;height:${f1(fh)}px;border-radius:${f1(Math.min(fh, F.px(90)) * 0.5 + k * F.px(14))}px;box-shadow:inset 0 0 0 ${f1(u * 2)}px var(--sw-${k % 2 ? 'mute' : 'ink'});background:${k % 2 ? 'var(--sw-bg)' : 'var(--sw-card)'};display:none;z-index:${(o.z ?? 14) + i}`, parent);
        f.dataset.what = 'X.frames';
        return { f, k };
      });
      const pill = el('div', `left:${f1(cx - pw / 2)}px;top:${f1(cy - ph / 2)}px;width:${f1(pw)}px;height:${f1(ph)}px;border-radius:${f1(ph / 2)}px;background:var(--sw-ink);display:none;z-index:${(o.z ?? 14) + n}`, parent);
      const tx = el('div', `left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font:500 ${f1(size)}px/1.1 ${X.body};letter-spacing:-0.015em;color:var(--sw-bg);white-space:nowrap`, pill);
      const inner = el('span', 'position:relative', tx); inner.textContent = text;
      F.text(inner, o.kind ?? 'headline', text, at - 0.15, until);
      if (o.sfx !== false) { F.sfx(a0, 'pull', 0.35, { dur: 0.4 }); F.sfx(at, 'snap', 0.5); }
      F.add((t) => {
        const qo = until < 1e8 ? seg(t, until - 0.3, until, E.quartIn) : 0;
        frames.forEach(({ f, k }) => {
          const a = a0 - k * 0.04, on = t >= a && t < until; set(f, { display: on ? '' : 'none' }); if (!on) return;
          const q = seg(t, a, at + 0.15, E.expoOut);
          set(f, { transform: `scale(${f3((1 + (1 - q) * (1.4 + k * 0.35)) * (1 - qo * 0.15))})`, opacity: String(f3(Math.min(1, q * 2.5) * (1 - qo))) });
        });
        const on = t >= at - 0.25 && t < until; set(pill, { display: on ? '' : 'none' }); if (!on) return;
        const q = seg(t, at - 0.25, at + 0.1, E.expoOut);
        set(pill, { transform: `scale(${f3(0.6 + 0.4 * q)})`, opacity: String(f3(q * (1 - qo))) });
      });
      return { el: pill };
    };

    // ---------- Transitions: full cover at `at`, the scene changes there ----------
    let wl = null;
    X.wipe = (o) => {
      wl ??= F.layer('pointer-events:none', 90);
      // onto = the next scene's ground: a slab the colour of the ground it lands on would look like a plain cut, so it switches (black → accent, accent → black)
      const at = o.at, dur = o.dur ?? 0.5, half = dur / 2, kind = o.kind ?? 'whip';
      let col = o.color ? (X.colors[o.color] ?? o.color) : kind === 'dot' ? X.colors.accent : X.colors.ink;
      if (!o.color && o.onto) { const gb = (X.grounds[o.onto] ?? X.grounds.paper).bg; if (gb.toLowerCase() === col.toLowerCase()) col = col === X.colors.accent ? X.colors.ink : X.colors.accent; }
      F.sfx(at - half, kind === 'dot' ? 'pull' : 'whoosh', o.gain ?? 0.34, { dur }); F.cut(at); F.transition(at - half, at + half);
      const skip = (e) => { e.dataset.motion = 'skip'; return e; };
      if (kind === 'bands') {
        const nb = PT ? 4 : 6, bw = W / nb;
        const other = col === X.colors.accent ? X.colors.ink : X.colors.accent;
        const bands = Array.from({ length: nb }, (_, i) => skip(el('div', `left:${f1(i * bw - 1)}px;top:0;width:${f1(bw + 2)}px;height:${H}px;background:${i % 2 ? other : col};display:none`, wl)));
        F.add((t) => bands.forEach((b, i) => {
          const d = i * 0.035, a = at - half, on = t >= a && t < at + half + nb * 0.035; set(b, { display: on ? '' : 'none' }); if (!on) return;
          const qin = seg(t, a + d * 0.5, at, E.expoOut), qout = seg(t, at + d * 0.6, at + half + d, E.expoIn);
          set(b, { transform: `translateY(${f1(t < at ? -(1 - qin) * H : qout * H)}px)` });
        }));
        return at;
      }
      if (kind === 'dot') {
        const cx = o.x ?? W * 0.5, cy = o.y ?? H * 0.5, R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.02;
        const d = skip(el('div', `left:${f1(cx - R)}px;top:${f1(cy - R)}px;width:${f1(2 * R)}px;height:${f1(2 * R)}px;border-radius:50%;background:${col};display:none`, wl));
        F.add((t) => { const on = t >= at - half && t < at + half; set(d, { display: on ? '' : 'none' }); if (!on) return; const s = t < at ? seg(t, at - half, at, E.expoIn) : 1 - seg(t, at, at + half, E.expoOut); set(d, { transform: `scale(${f3(Math.max(0.001, s))})` }); });
        return at;
      }
      // whip: a slab sweeps in from the right on a slight skew, covers, and carries on out to the left
      const slab = skip(el('div', `left:0;top:0;width:${f1(W * 1.5)}px;height:${H}px;background:${col};display:none`, wl));
      F.blur(at - half, at + half, 10);
      F.add((t) => {
        const on = t >= at - half && t < at + half; set(slab, { display: on ? '' : 'none' }); if (!on) return;
        const x = t < at ? lerp(W * 1.05, -W * 0.25, seg(t, at - half, at, E.expoIn)) : lerp(-W * 0.25, -W * 1.6, seg(t, at, at + half, E.expoOut));
        set(slab, { transform: `translateX(${f1(x)}px) skewX(-10deg)` });
      });
      return at;
    };

    // ---------- End card ----------
    X.end = (parent, o) => {
      // the name set as big as the measure allows, a full-width rule, the line, then → url; meta labels across the top like a poster's header
      const at = o.at, mx = W * (PT ? 0.07 : 0.06), mw = W - 2 * mx;
      (o.meta || []).forEach((m, i) => X.meta(parent, { text: m, x: i % 2 ? W - mx : mx, y: H * 0.1 + Math.floor(i / 2) * F.px(34), align: i % 2 ? 'right' : 'left', size: 24, at: at + 0.1 + i * 0.08, color: 'mute' }));
      X.type(parent, { text: o.title, x: mx, y: H * (PT ? 0.36 : 0.38), size: o.size ?? (PT ? 240 : 320), align: 'left', maxW: mw, at: at + 0.7, kind: 'logo', weight: 500, mark: o.mark, by: String(o.title).length > 14 ? 'word' : 'char' });
      X.rule(parent, { x: mx, y: H * (PT ? 0.49 : 0.6), w: mw, h: 3, at: at + 0.9 });
      if (o.sub) X.line(parent, { text: o.sub, x: mx, y: H * (PT ? 0.55 : 0.68), size: PT ? 48 : 52, maxW: mw, at: at + 1.4, kind: 'endcard' });
      if (o.url) {
        const us = PT ? 66 : 72, uy = H * (PT ? 0.67 : 0.84);
        X.arrow(parent, { x: mx + F.px(us) * 0.55, y: uy, size: us * 1.1, at: at + 1.9, color: 'acc', sfx: false });
        X.type(parent, { text: o.url, x: mx + F.px(us) * 1.4, y: uy, size: us, align: 'left', at: at + 2.1, kind: 'endcard', color: 'ink', by: 'line', enter: 'slide', sfx: false, maxW: mw - F.px(us) * 1.4 });
      }
      F.sfx(at + 2.3, 'logo', 1);
    };

    return P.infoKit ? P.infoKit(X, { list: 'flow', chips: 'features', bars: 'chart', versus: 'compare', shot: 'ui' }) : X;
  };
  P.swiss.PAL = PAL;
})();
