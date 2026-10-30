// kit.js: the styles' common interface (references/kit.md). Load it after promo.js and the style runtimes (origami.js / pop.js / op.js / cutout.js).
// Every style implements the same set of common verbs with its own material (op = stripes and lenses, pop = comics, cutout = coloured paper, origami = sheets of paper); the signature move lives in S.accent;
// the quick version (formats.js) and anything that "must play in every style" calls only these verbs.
// A style's own components can still be used directly (hand-written films are unaffected); this only wraps one uniform way of writing around them.
//
//   const S = PROMO.kit(F, 'op' | 'pop' | 'cutout' | 'origami', { the style's own options })
//   S.bg(layer, { variant })                              this scene's background (variant 0–3: change pattern / colour)
//   S.word(layer, { at, until, text, x, y, size, variant, kind })   impact word (one or two words)
//   S.line(layer, { at, until, text, x, y, size, maxW, align, kind }) one readable sentence (explanation, label; readable on a phone too)
//   S.card(layer, { at, until, x, y, w, h })              a base to put content on (card / comic panel / paper scrap / a sheet) → { el (put things inside; coordinates from the top-left), w, h }
//   S.shot(layer, { at, until, src, x, y, w, h, fit })    real screenshot: the image is untouched, only "placed" the way this style places things; fit: 'contain' = whole image inside with margin around it (logos, icons)
//   S.accent(layer, { at, until, x, y, size })            signature move: lens bulges / speed lines + flash / a cut-paper piece sticks on / a paper plane flies past
//   S.wipe({ cover, out, index })                        transition → { show (the next scene must be visible from here), hide (this scene is hidden by here) }
//   S.end(layer, { at, title, tagline, url })             end card
//   S.lead                                               how long before at an element starts to appear (dropping in, growing)
//   S.push                                               the steady slow push-in the quick version adds to every scene (zoom per second): styles whose background never moves (origami's tabletop) push more
//
// Timing convention (same for every style): at = the moment a thing has settled and is readable, put on the beat (the sound effect is here too); until = the moment it has fully gone (the exit finishes before it).
// Units: x, y (centre), w, h (card / screenshot size) and maxW are frame px; only size (font size) is a design size (1080p, converted with F.px inside).
//   Note: w / h / r of a style's own components (B.shape, C.piece …) are design sizes — don't mix them up in one film (at 1080p they are equal; at another resolution things shift).
(function () {
  const P = window.PROMO;
  const M = P && P.M ? P.M : (zh, en) => ((window.__BV_LANG || (/^zh/i.test(document.documentElement.lang || '') ? 'zh' : 'en')) === 'zh' ? zh : en);   // P.M is missing only when promo.js did not load
  if (!P) throw new Error(M('kit.js 要在 promo.js 之后加载', 'kit.js must load after promo.js'));
  const { E, seg, set, el, clamp } = P;
  const f1 = (n) => Math.round(n * 10) / 10;
  const KITS = {};
  const meas = document.createElement('canvas').getContext('2d');
  const textW = (text, font) => { meas.font = font; return meas.measureText(text).width; };
  const estUnits = (t) => { t = String(t ?? ''); return (t.match(/[^\x00-\xff]/g) || []).length + t.replace(/[^\x00-\xff]/g, '').length * 0.58; };   // text width in units of font size: CJK 1, Latin about 0.58
  const rgbOf = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const hexOf = (r) => '#' + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const x = rgbOf(a), y = rgbOf(b); return x && y ? hexOf(x.map((v, i) => v + (y[i] - v) * t)) : a; };   // move a towards b by t
  const alpha = (c, a) => { const x = rgbOf(c); return x ? `rgba(${x.join(',')},${a})` : c; };
  // WCAG contrast ratio (two #RRGGBB colours)
  const wcag = (a, b) => { const L = (c) => { const r = rgbOf(c) || [0, 0, 0]; const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r[0]) + 0.7152 * f(r[1]) + 0.0722 * f(r[2]); }; const p = L(a), q = L(b); return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05); };
  const lum = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) return 1; const n = parseInt(m[1], 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
  // element shown within [a, b)
  // image in a card: cover fills it; contain puts the whole image in with a little margin
  // pad needs a unit: calc(100% - 2 * 0) is invalid, the image then shows at natural size and gets cropped
  const img = (parent, o) => { const pad = o.fit === 'contain' ? '8%' : '0px'; const im = el('img', `left:${pad};top:${pad};width:calc(100% - 2 * ${pad});height:calc(100% - 2 * ${pad});object-fit:${o.fit ?? 'cover'}`, parent); im.src = o.src; return im; };
  const win = (F, e, a, b) => F.add((t) => set(e, { display: t >= a && t < b ? '' : 'none' }));

  P.kit = (F, name, opt = {}) => {
    const k = KITS[name];
    if (!k) throw new Error(M(`没有这种风格的通用接口：${name}（有：${Object.keys(KITS).join(' / ')}）`, `No common API for style ${name} (available: ${Object.keys(KITS).join(' / ')})`));
    if (k.check ? !k.check() : !P[k.runtime]) throw new Error(M(`风格 ${name} 要先加载 lib/${k.file ?? k.runtime}.js`, `Style ${name} needs lib/${k.file ?? k.runtime}.js loaded first`));
    const S = k.make(F, opt);
    S.name = name;
    // Information density check: the info verbs register themselves when called (F.info); other verbs called inside a verb, and things drawn on a board, are not counted twice.
    //   Lines and circles that other verbs (big word, line, signature move, background …) draw in board styles don't count as information either (what S.board() draws directly still counts)
    for (const verb of Object.keys(S)) {
      const f = S[verb], kind = INFO_VERBS[verb];
      if (typeof f !== 'function') continue;
      S[verb] = (layer, o, ...rest) => {
        const a = o && (o.at ?? (o.T || o.ats || [])[0]);
        if (kind && a !== undefined && !EV.muted() && !(verb === 'shot' && o.fit === 'contain')) F.info(kind, a, o.until);   /* a fit: contain screenshot is a logo / icon, not counted */
        return EV.mute(() => f(layer, o, ...rest));
      };
    }
    return S;
  };
  const INFO_VERBS = { box: 'box', arrow: 'arrow', mark: 'mark', bars: 'chart', shape: 'shape', steps: 'flow', versus: 'compare', figures: 'chart', spotlight: 'annotate', screen: 'ui', shot: 'ui' };
  P.kit.register = (name, def) => { KITS[name] = def; };
  P.kit.theme = (name) => { if (!KITS[name]) throw new Error(M(`没有这种风格：${name}`, `No such style: ${name}`)); return KITS[name].theme; };
  // Ground: some styles aren't tied to one ground colour (launch can be dark, light or brand colour); whoever makes the film picks it for the product.
  //   P.kit.ground('launch', 'light' | 'dark' | 'brand', { brand: '#RRGGBB', accent }) → full theme (hand-written films pass it to compose; the quick version writes the film's ground / brand)
  P.kit.ground = (name, ground, o = {}) => { const k = KITS[name]; if (!k) throw new Error(M(`没有这种风格：${name}`, `No such style: ${name}`)); if (!k.grounds) return k.theme; const g = k.grounds(ground, o); if (!g) throw new Error(M(`${name} 的底色只能是 ${k.groundNames.join(' / ')}：${ground}`, `${name}'s ground must be ${k.groundNames.join(' / ')}: ${ground}`)); return { ...k.theme, ...g, fonts: { ...k.theme.fonts, ...(g.fonts || {}) } }; };
  P.kit.list = () => Object.keys(KITS);

  // ---------- Colours taken from the product: brand colour → this style's own material ----------
  // HSL and Lab (Lab is used to find the "closest" colour)
  const hslOf = (c) => { const r = rgbOf(c); if (!r) return null; const [R, G, B] = r.map((v) => v / 255), mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2, d = mx - mn; if (!d) return [0, 0, l]; const s = d / (1 - Math.abs(2 * l - 1)); const h = mx === R ? ((G - B) / d + 6) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; return [h * 60, s, l]; };
  const fromHsl = (h, s, l) => { const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2, k = Math.floor(((h % 360) + 360) % 360 / 60); const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][k]; return hexOf([r + m, g + m, b + m].map((v) => v * 255)); };
  const labOf = (c) => { const r = (rgbOf(c) || [0, 0, 0]).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); const X = (r[0] * 0.4124 + r[1] * 0.3576 + r[2] * 0.1805) / 0.95047, Y = r[0] * 0.2126 + r[1] * 0.7152 + r[2] * 0.0722, Z = (r[0] * 0.0193 + r[1] * 0.1192 + r[2] * 0.9505) / 1.08883; const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]; };
  const dE = (a, b) => { const x = labOf(a), y = labOf(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  // the one with colour (black / white / grey brands — many tech companies — don't change the style's colours)
  const colorful = (...cs) => cs.find((c) => { const h = c && hslOf(c); return h && h[1] > 0.22 && h[2] > 0.12 && h[2] < 0.9; });
  // pull a colour into a saturation / lightness range (the colours this medium can make)
  const tame = (c, { s = [0, 1], l = [0, 1] } = {}) => { const [h, S, L] = hslOf(c); return fromHsl(h, Math.min(s[1], Math.max(s[0], S)), Math.min(l[1], Math.max(l[0], L))); };
  // name of the colour in a named set that is closest to c
  const nearestKey = (map, c, keys = Object.keys(map)) => keys.reduce((best, k) => (dE(map[k], c) < dE(map[best], c) ? k : best), keys[0]);
  // real Riso inks (approximate colours, from Riso's official colour chart)
  const RISO_INKS = { yellow: '#FFE800', sunflower: '#FFB511', orange: '#FF6C2F', fluoOrange: '#FF7477', red: '#FF665E', brightRed: '#F15060', scarlet: '#F65058', crimson: '#E45D50', marineRed: '#D2515E', cranberry: '#D1517A', pink: '#FF48B0', burgundy: '#914E72', brick: '#A75154', brown: '#925F52', flatGold: '#BB8B41', purple: '#765BA7', violet: '#9D7AD2', orchid: '#AA60BF', plum: '#845991', grape: '#6C5D80', mediumBlue: '#3255A4', blue: '#0078BF', federalBlue: '#3D5588', cornflower: '#62A8E5', aqua: '#5EC8E5', seaBlue: '#0074A2', lake: '#235BA8', indigo: '#484D7A', teal: '#00838A', lightTeal: '#00A6B4', turquoise: '#00AA93', mint: '#82D8D5', green: '#00A95C', emerald: '#19975D', kellyGreen: '#67B346', hunterGreen: '#407060', moss: '#68724D', black: '#000000' };
  // P.kit.brand(style, { brand, accent, ground }) → { theme, kit, color }: theme goes to compose, kit to the style (the quick version's film kit; hand-written films pass it to PROMO.<style>(F, kit))
  //   color = the colour actually used (brand colour adjusted for this medium); null = the brand is black/white/grey, or this style's colours are fixed (ink), unchanged
  P.kit.brand = (name, o = {}) => {
    const k = KITS[name]; if (!k) throw new Error(M(`没有这种风格：${name}`, `No such style: ${name}`));
    const c = colorful(o.brand, o.accent);
    if (k.grounds) { const g = o.ground ?? k.theme.ground, theme = P.kit.ground(name, g, { brand: g === 'brand' ? o.brand : undefined, accent: c, bg: o.bg }); return { theme, kit: {}, color: c ? theme.accent : null }; }
    if (!c || !k.tint) return { theme: k.theme, kit: {}, color: null };
    const t = k.tint(c, o);
    return { theme: { ...k.theme, ...(t.theme || {}), fonts: k.theme.fonts }, kit: t.kit || {}, color: t.color ?? c };
  };
  P.kit.colors = { hslOf, fromHsl, dE, tame, nearestKey, colorful, RISO_INKS };
  // Pacing: lead = how long before at an element starts to appear; hold = minimum time on screen to be readable; wipe = how long before the cut point the transition starts (board styles need time to write, print, move the scroll, and their checks are stricter). Formats lay out beats by these
  P.kit.pace = (name) => ({ lead: 0.2, hold: 0.25, wipe: 0.35, ...((KITS[name] || {}).pace || {}) });


  // ======================= Telling information: each style in its own language =======================
  // There is no generic "box + arrow": steps, contrast, numbers and real UI are each told with the style's own components (see S.steps / S.versus / S.figures / S.spotlight in each style's make):
  //   S.steps(layer, { items: [{ text, note, hot }], T: [time each step settles], until, C: content area {x, y, w, h} }) → [{ x, y }]   one step after another
  //   S.versus(layer, { cols: [{ title, points, hot }], T: [time of each column title], at2: (col, row) => time, until, C })      two or three sides compared
  //   S.figures(layer, { data: [[name, value]], ats, unit, decimals, hot, until, C }) → [{ x, y }]                    a few numbers
  //   S.spotlight(layer, { src, box: where the screenshot is on screen, regions: [{x, y, w, h}], T, until })                          a few spots on a real UI
  // Board styles' (whiteboard / riso / ink) hand-drawn boxes, arrows and bar charts are their native language and stay on the board (S.box / S.arrow / S.mark / S.bars / S.shape).
  // magnify: enlarge one region of a screenshot into a "lens" (each style draws its own lens frame: op's thick black circle, pop's comic panel, cutout's coloured paper, origami's paper scrap)
  function magnify(F, layer, o) {
    const { box, region, at, until } = o, zoom = o.zoom ?? 2;
    const r = Math.max(F.px(90), Math.min(F.px(240), (Math.max(region.w, region.h) * zoom) / 2 + F.px(24)));
    // the region seen in the lens stays inside the screenshot (outside it is just white); the lens itself stays inside the frame (3% margin on every side)
    const vr = r / zoom, cx = Math.min(box.x + box.w - vr, Math.max(box.x + vr, region.x + region.w / 2)), cy = Math.min(box.y + box.h - vr, Math.max(box.y + vr, region.y + region.h / 2));
    const mx = F.W * 0.03 + r, my = F.H * 0.03 + r;
    const px = Math.min(F.W - mx, Math.max(mx, o.place ? o.place[0] : cx)), py = Math.min(F.H - my, Math.max(my, o.place ? o.place[1] : cy));
    const wrap = el('div', `left:${f1(px - r)}px;top:${f1(py - r)}px;width:${f1(2 * r)}px;height:${f1(2 * r)}px;display:none;z-index:${o.z ?? 9};transform-origin:50% 50%`, layer);
    if (o.under) o.under(wrap, r);
    const lens = el('div', `inset:0;overflow:hidden;border-radius:${o.shape === 'square' ? f1(F.px(6)) + 'px' : '50%'};background:#fff;${o.ring ?? ''}`, wrap);
    const im = el('img', `left:${f1(r - (cx - box.x) * zoom)}px;top:${f1(r - (cy - box.y) * zoom)}px;width:${f1(box.w * zoom)}px;height:${f1(box.h * zoom)}px;max-width:none`, lens);
    im.src = o.src;
    F.add((t) => { const on = t >= at - 0.35 && t < until; set(wrap, { display: on ? '' : 'none' }); if (on) { const q = seg(t, at - 0.35, at, E.backOut), out = until < 1e8 ? 1 - seg(t, until - 0.25, until) : 1; set(wrap, { transform: `rotate(${f1(o.rot ?? 0)}deg) scale(${(Math.max(0.01, q) * out).toFixed(4)})` }); } });
    if (o.sfx !== false) F.sfx(at - 0.3, o.sfxType ?? 'pop', 0.45);
    return { el: wrap, x: px, y: py, r };
  }
  const NS = 'http://www.w3.org/2000/svg';
  const svgOf = (parent, z) => { const v = document.createElementNS(NS, 'svg'); v.setAttribute('width', '100%'); v.setAttribute('height', '100%'); v.style.cssText = `position:absolute;left:0;top:0;overflow:visible;pointer-events:none;${z !== undefined ? `z-index:${z};` : ''}`; parent.appendChild(v); return v; };
  const sv = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
  // opacity for appear / exit (0.25 s fade-out, fully gone at until)
  const life = (F, e, a, until, fade = 0.25) => F.add((t) => { const on = t >= a && t < until; set(e, { display: on ? '' : 'none' }); if (on) set(e, { opacity: String(Math.min(1, 1 - seg(t, until - fade, until))) }); });
  function infoKit(F, S, skin) {
    const tone = (k) => (k === 'mark' ? skin.mark ?? skin.accent : k === 1 || k === 'accent' ? skin.accent : k === 2 ? (skin.colors[1] ?? skin.accent) : skin.ink);
    // S.flash(layer, { at, until, text, sub, color, index, rect }): one cell of a fast-cut montage — this style's material fills the frame (or the rect area), one big word;
    //   portrait avoids the bottom 22% (platform captions); low: true = the word sits in the lower half (the centre is left for the anchor)
    //   at = a hard cut in (registered as an on-beat hard cut), already moving as it comes in (1.12× scaling steadily to 1 until the next cell cuts it); sub = small text in the corner (a number, not registered)
    S.flash = S.flash ?? ((layer, o) => {
      const R = o.rect ?? { x: 0, y: 0, w: F.W, h: F.H }, a = o.at, until = o.until ?? 1e9, i = o.index ?? 0, col = o.color ?? skin.colors[i % skin.colors.length];
      const small = R.w < F.W * 0.6, size = Math.min(F.px(small ? 46 : 150), (R.w * 0.84) / Math.max(1, estUnits(o.text)));
      const box = el('div', `left:${f1(R.x)}px;top:${f1(R.y)}px;width:${f1(R.w)}px;height:${f1(R.h)}px;overflow:hidden;display:none;z-index:${o.z ?? 8}`, layer);
      // only the base (material) moves: 1.12× to 1 on entry; the word and the corner number don't scale with it (scaling would push the bottom-left word and top number out of frame)
      const bg = el('div', `inset:0;transform-origin:50% 50%;${skin.flashBg(col, i, R)}`, box);
      if (skin.flashDecor) skin.flashDecor(bg, col, i, R);
      const inner = el('div', 'inset:0', box);
      const ink = wcag(col, '#FFFFFF') >= wcag(col, skin.ink) ? '#FFFFFF' : skin.ink, at = skin.flashAt ?? 'center';   // white or ink-coloured text: whichever contrasts more with this cell's colour
      const lab = el('div', `${at === 'corner' ? `left:${f1(R.w * 0.05)}px;${o.rect && R.y + R.h / 2 > F.H / 2 ? `top:${f1(R.h * 0.12)}px` : `bottom:${f1(R.h * (F.portrait && !o.rect ? 0.24 : 0.07))}px`};text-align:left;` : `left:${f1(R.w * 0.06)}px;right:${f1(R.w * 0.06)}px;top:${o.low ? (F.portrait && !o.rect ? 64 : 74) : 50}%;transform:translateY(-50%);text-align:center;`}font:${skin.flashWeight ?? skin.weight ?? 700} ${f1(size)}px/1.05 ${skin.display ?? skin.font};color:${skin.flashInk ?? ink}`, inner);
      const span = el('span', `position:relative;display:inline-block;${skin.flashText ? skin.flashText(size) : ''}`, lab);   // the text style sits on this inner layer (op's white box with thick border, pop's black outline)
      span.textContent = o.text ?? '';
      if (o.sub) { const sb = el('div', `left:${f1(R.w * 0.04)}px;top:${f1(R.h * 0.05)}px;font:600 ${f1(F.px(small ? 18 : 24))}px/1 ui-monospace, Menlo, monospace;letter-spacing:.12em;color:${skin.flashInk ?? ink};opacity:.75`, inner); sb.textContent = o.sub; }
      if (o.text) F.text(lab, small ? 'label' : 'slam', o.text, a, until);
      F.add((t) => { const on = t >= a && t < until; set(box, { display: on ? '' : 'none' }); if (on && !o.rect) { set(bg, { transform: `scale(${(1.12 - 0.12 * Math.min(1, (t - a) / Math.max(0.25, Math.min(until, a + 3) - a))).toFixed(4)})` }); const k2 = 1 - seg(t, a, a + 0.18, E.expoOut); set(span, { transform: `scale(${(1 + 0.06 * k2).toFixed(4)})`, transformOrigin: at === 'corner' ? '0% 100%' : '50% 50%' }); } });   // no scaling when tiled into a grid
      F.cut(a);
      if (o.sfx !== false) F.sfx(a, skin.cutSfx ?? 'tick', o.gain ?? 0.5, { size: 0.5, cut: true });
      return { el: box };
    });
    return S;
  }


  // layout helper for info verbs: positions of n things along a row (or a column in portrait); font size estimated from width
  const lanePos = (C, n, j, row, wave = 0) => { const q = n === 1 ? 0.5 : j / (n - 1); return row ? { x: C.x + C.w * (0.5 / n + q * (1 - 1 / n)), y: C.y + C.h * (0.45 + wave * Math.sin(q * Math.PI * 2)) } : { x: C.x + C.w / 2, y: C.y + C.h * (0.5 / n + q * (1 - 1 / n)) }; };
  const ptText = (pt) => (pt && typeof pt === 'object' ? pt.text ?? '' : String(pt));

  // ======================= Op art =======================
  P.kit.register('op', {
    runtime: 'op',
    theme: { bg: '#F7F5F0', fg: '#111111', ink: '#111111', paper: '#F7F5F0', accent: '#E8312A', muted: '#555555', fonts: { display: '"Unbounded", sans-serif', serif: '"Unbounded", sans-serif', sans: 'Inter, sans-serif', script: '"Unbounded", sans-serif' } },
    make(F, opt) {
      const Q = P.op(F, opt), colors = opt.colors ?? [Q.accent, '#F19D38', '#3C82F6', '#54B9A6'];
      const S = { lead: 0.2, ink: Q.ink, paper: Q.paper, colors, raw: Q };
      const fields = new Map();
      // a different pattern each scene: stripes (waves) → concentric circles → coloured stripe bands → checkerboard
      const LOOKS = [
        { pattern: 'stripes', period: 40, amp: 30, angle: -8, speed: 1.3 },
        { pattern: 'rings', period: 44, speed: 1.6 },
        { pattern: 'stripes', period: 42, amp: 26, angle: 90, speed: 1.2, bands: true },
        { pattern: 'checker', period: 60, angle: 20, speed: 1 },
      ];
      S.bg = (layer, o = {}) => {
        const L = { ...LOOKS[(o.variant ?? 0) % LOOKS.length], ...(o.look || {}) };
        const f = Q.field(layer, { ...L, period: F.px(L.period), amp: F.px(L.amp ?? 0), bands: L.bands ? colors : undefined, bandW: F.portrait ? F.H / 4 : F.W / 4, show: o.show });
        fields.set(layer, { f, n: 0 });
        return { el: f.el, field: f };
      };
      S.word = (layer, o) => {
        const r = Q.word(layer, { at: o.at - S.lead, until: o.until, text: o.text, size: o.size ?? 170, x: o.x, y: o.y, w: o.maxW, colors: [o.color ?? colors[(o.variant ?? 0) % colors.length], Q.ink], kind: o.kind ?? 'slam', sfx: false, z: o.z ?? 4 });
        if (o.sfx !== false) F.sfx(o.at, o.sfx ?? 'pulse', o.gain ?? 0.7, { size: 0.6 });
        return r;
      };
      S.line = (layer, o) => {
        const size = F.px(o.size ?? 50), maxW = o.maxW ?? F.W * (F.portrait ? 0.86 : 0.72), until = o.until ?? 1e9, a = o.at - S.lead, align = o.align ?? 'center';
        const x = o.x ?? F.W / 2, left = align === 'left' ? x : x - F.W;
        const box = el('div', `left:${f1(left)}px;width:${f1(align === 'left' ? F.W : 2 * F.W)}px;top:${f1(o.y ?? F.H / 2)}px;transform:translateY(-50%);text-align:${align};display:none;pointer-events:none;z-index:${o.z ?? 4}`, layer);
        const plate = el('div', `position:relative;display:inline-block;max-width:${f1(maxW)}px;padding:${f1(size * 0.32)}px ${f1(size * 0.55)}px;background:#fff;border:${f1(Q.line * 0.85)}px solid ${Q.ink};box-shadow:${f1(F.px(10))}px ${f1(F.px(10))}px 0 ${Q.ink};font:${o.weight ?? 700} ${f1(size)}px/1.25 ${o.font ?? Q.fonts.body};color:${Q.ink};text-align:${o.textAlign ?? 'center'}`, box);
        plate.textContent = o.text;
        F.text(plate, o.kind ?? 'label', o.text, a, until);
        Q.blinds(plate, { at: a, dur: 0.3, angle: 0, period: F.px(14), until });
        if (o.sfx !== false) F.sfx(o.at, o.sfx ?? 'pop', o.gain ?? 0.45);
        win(F, box, a, until);
        return { el: box, text: plate };
      };
      S.card = (layer, o) => {
        const c = Q.card(layer, { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h, at: o.at - S.lead, until: o.until, z: o.z ?? 3, sfx: o.sfx });
        return { el: c, w: o.w, h: o.h };
      };
      S.shot = (layer, o) => {
        const c = S.card(layer, o);
        return { ...c, img: img(c.el, o), box: { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h } };
      };
      // signature move: the background pattern bulges into a lens at this point (the thing "pushes the pattern apart"), and settles back at until
      S.accent = (layer, o) => {
        const rec = fields.get(layer);
        if (!rec) return null;
        const i = rec.n++ % 8, r = F.px(o.size ?? 340), until = o.until ?? o.at + 1.6;
        if (rec.n <= 8) rec.f.lens(i, { x: o.x, y: o.y, r: 0, s: o.strength ?? 0.55 });
        else rec.f.lensTo(i, o.at - 0.3, 0.02, { x: o.x, y: o.y });
        rec.f.lensTo(i, o.at - 0.2, 0.5, { r }, E.spring).lensTo(i, until - 0.5, 0.5, { r: 0 });
        return { lens: i };
      };
      S.wipe = (o) => { const d = o.dur ?? 0.7; Q.wipe({ at: o.cover - d / 2, dur: d, angle: (o.index ?? 0) % 2 ? -30 : 30 }); return { show: o.cover, hide: o.cover }; };
      S.end = (layer, o) => {
        const PT = F.portrait, y0 = o.y ?? (PT ? F.H * 0.4 : F.H * 0.4);
        S.bg && fields.get(layer) && S.accent(layer, { at: o.at, x: F.W / 2, y: y0, size: PT ? 520 : 560, until: 1e9 });
        S.word(layer, { at: o.at, text: o.title, size: PT ? 150 : 170, y: y0, kind: 'logo', sfx: 'pulse' });
        let y = y0 + F.px(PT ? 200 : 190);
        if (o.tagline) { S.line(layer, { at: o.at + 2 * F.B, text: o.tagline, y, kind: 'endcard', size: PT ? 52 : 46 }); y += F.px(PT ? 130 : 115); }
        if (o.url) S.line(layer, { at: o.at + 3 * F.B, text: o.url, y, kind: 'endcard', size: PT ? 62 : 56, font: Q.fonts.head, weight: 800 });
        F.sfx(o.at + 3 * F.B, 'logo', 1);
      };
      // ---- Telling information (op): lenses bulge one by one along the stripes, the stripes bend between steps (no boxes or arrows); numbers by size; the magnifier is a thick black circle ----
      const lensAt = (layer, x, y, r, a, until, s2 = 0.55) => {
        const rec = fields.get(layer); if (!rec) return;
        const i = rec.n++ % 8;
        if (rec.n <= 8) rec.f.lens(i, { x, y, r: 0, s: s2 }); else rec.f.lensTo(i, a - 0.36, 0.02, { x, y, s: s2 });
        rec.f.lensTo(i, a - 0.32, 0.5, { r }, E.spring);
        if (until < 1e8) rec.f.lensTo(i, until - 0.5, 0.45, { r: 0 });
      };
      const wordSize = (text, w, cap) => Math.max(40, Math.min(cap, w / F.px(1) / Math.max(2.2, estUnits(text) * 0.78)));
      S.steps = (layer, o) => {
        const { items, T, until, C } = o, n = items.length, row = C.w >= C.h * 1.2, r = row ? Math.min((C.w / n) * 0.5, C.h * 0.4) : Math.min((C.h / n) * 0.5, C.w * 0.42);
        return items.map((it, j) => {
          const { x, y } = lanePos(C, n, j, row, 0.08);
          lensAt(layer, x, y, r * 1.2, T[j], until);
          // short words use the striped big type; a sentence (wider than about 9 characters) goes on op's white box with thick border — long striped text is unreadable
          const slot = (row ? C.w / n : C.w * 0.8) * 0.92;
          if (estUnits(it.text) > 9) S.line(layer, { at: T[j], until, text: it.text, x, y, size: 44, maxW: slot, sfx: 'pulse' });
          else S.word(layer, { at: T[j], until, text: it.text, x, y, size: wordSize(it.text, Math.min(r * 2, slot), 110), variant: it.hot ? 1 : 0, maxW: Math.min(r * 2.1, slot), kind: 'label', sfx: 'pulse' });
          if (it.note) S.line(layer, { at: T[j] + 0.3, until, text: it.note, x, y: y + r * 0.85, size: 32, maxW: Math.min(r * 2.4, (row ? C.w / n : C.w) * 0.94), sfx: false });
          return { x, y };
        });
      };
      S.versus = (layer, o) => {
        const { cols, T, at2, until, C } = o, m = cols.length, stack = F.portrait && m > 2;
        return cols.map((col, j) => {
          const cw = stack ? C.w : C.w / m, ch = stack ? C.h / m : C.h, x = stack ? C.x + C.w / 2 : C.x + cw * (j + 0.5), y0 = stack ? C.y + ch * j : C.y, yT = y0 + Math.min(ch * 0.16, F.px(90)), n2 = (col.points || []).length;
          if (col.hot) lensAt(layer, x, y0 + ch * 0.55, Math.min(cw * 0.5, ch * 0.5), T[j], until, 0.75);
          S.word(layer, { at: T[j], until, text: col.title, x, y: yT, size: wordSize(col.title, cw * 0.9, 90), variant: col.hot ? 1 : 0, maxW: cw * 0.92, kind: 'label' });
          (col.points || []).forEach((pt, r2) => S.line(layer, { at: at2(j, r2), until, text: ptText(pt), x, y: yT + F.px(stack ? 100 : 150) + r2 * Math.min(F.px(110), (ch - F.px(180)) / Math.max(1, n2)), size: 46, maxW: cw * 0.86, sfx: r2 ? false : undefined }));
          return { x, y: y0 + ch / 2 };
        });
      };
      S.figures = (layer, o) => {
        const { data, ats, until, C } = o, n = data.length, mx = Math.max(...data.map((d) => d[1])), cols = F.portrait ? Math.min(2, n) : n, rows = Math.ceil(n / cols);
        return data.map(([name, val], j) => {
          const k = Math.sqrt(val / mx), hot = (o.hot || []).includes(j), cw = C.w / cols, rh = C.h / rows, x = C.x + cw * ((j % cols) + 0.5), y = C.y + rh * (Math.floor(j / cols) + 0.42), size = Math.min(50 + 170 * k, wordSize(fmtNum(val, o), cw * 0.85, 240));
          if (hot) lensAt(layer, x, y, Math.min(cw * 0.5, rh * 0.48), ats[j], until, 0.7);
          S.word(layer, { at: ats[j], until, text: fmtNum(val, o), x, y, size, variant: hot ? 1 : 0, maxW: cw * 0.9, kind: 'label' });   // the bigger the number, the bigger the type (by area)
          S.line(layer, { at: ats[j] + 0.25, until, text: String(name), x, y: y + F.px(size) * 0.62 + F.px(55), size: 36, maxW: cw * 0.92, sfx: false });
          return { x, y };
        });
      };
      S.spotlight = (layer, o) => o.regions.map((rg, j) => { const m = magnify(F, layer, { src: o.src, box: o.box, region: rg, at: o.T[j], until: o.until, ring: `border:${f1(F.px(9))}px solid ${Q.ink};box-shadow:${f1(F.px(12))}px ${f1(F.px(12))}px 0 ${Q.ink}` }); return { x: m.x, y: m.y }; });
      infoKit(F, S, { ink: Q.ink, accent: colors[1] ?? Q.accent, colors, font: Q.fonts.body, display: Q.fonts.head, line: F.px(8), outline: null, halo: Q.paper, radius: 0, mark: Q.accent, cutSfx: 'pulse',
        flashBg: (col, i) => `background:repeating-linear-gradient(${i % 2 ? -32 : 32}deg, ${col} 0 ${f1(F.px(22))}px, ${Q.paper} ${f1(F.px(22))}px ${f1(F.px(44))}px)`,   // op: this cell is diagonal stripes in this colour
        flashInk: Q.ink, flashText: (sz) => `padding:${f1(sz * 0.12)}px ${f1(sz * 0.3)}px;background:${Q.paper};border:${f1(F.px(7))}px solid ${Q.ink};box-shadow:${f1(F.px(12))}px ${f1(F.px(12))}px 0 ${Q.ink}` });
      return S;
    },
  });

  // ======================= Pop art =======================
  P.kit.register('pop', {
    runtime: 'pop',
    theme: { bg: '#FFE14D', fg: '#141414', ink: '#141414', paper: '#FFF8E7', accent: '#E8312A', muted: '#3A3A3A', fonts: { display: 'Bangers, sans-serif', serif: '"Archivo Black", sans-serif', sans: 'Inter, sans-serif', script: 'Bangers, sans-serif' } },
    make(F, opt) {
      const K = P.pop(F, opt), c = K.c;
      // one ground colour per scene; the big word's colour clashes with it (red on yellow, yellow on colour)
      const LOOKS = [
        { color: c.yellow, word: c.red, dots: 'rgba(232,49,42,.22)', rays: 'rgba(255,255,255,.4)' },
        { color: c.cyan, word: c.yellow, dots: 'rgba(20,20,20,.14)', rays: false },
        { color: c.pink, word: c.yellow, dots: 'rgba(255,255,255,.3)', rays: 'rgba(255,255,255,.28)' },
        { color: c.blue, word: c.yellow, dots: 'rgba(255,255,255,.18)', rays: false },
      ];
      // brand colour (from P.kit.brand): the second scene's ground becomes the brand colour, and the big words on yellow use it too — otherwise the replaced primary might never appear in the whole film
      if (opt.brand) { const bw = wcag(opt.brand, c.yellow) >= 2.2 ? c.yellow : '#FFFFFF'; LOOKS[1] = { color: opt.brand, word: bw, dots: lum(opt.brand) < 0.5 ? 'rgba(255,255,255,.2)' : 'rgba(20,20,20,.14)', rays: lum(opt.brand) < 0.5 ? 'rgba(255,255,255,.22)' : false }; if (wcag(opt.brand, c.yellow) >= 2.2) LOOKS[0].word = opt.brand; }
      const looks = new Map();
      const S = { lead: 0.1, ink: K.ink, paper: c.paper, colors: [c.red, c.yellow, c.blue, c.pink], raw: K };
      const lookOf = (layer, o) => (o.variant !== undefined ? LOOKS[o.variant % 4] : looks.get(layer) ?? LOOKS[0]);
      S.bg = (layer, o = {}) => {
        const L = LOOKS[(o.variant ?? 0) % 4];
        looks.set(layer, L);
        const d = K.bg(layer, { color: L.color, dots: { color: L.dots, size: 7, gap: 20 }, rays: L.rays ? { color: L.rays, n: 18, speed: 5 } : false });
        return { el: d };
      };
      // K.word: slams down from 1.7× at at (lands in about 0.1 s); it needs 0.15 s after until to shrink away → shift earlier
      S.word = (layer, o) => {
        const until = o.until ?? 1e9;
        const r = K.word(layer, { at: o.at - S.lead, until: until - 0.15, text: o.text, x: o.x, y: o.y, w: o.maxW, size: o.size ?? 190, color: o.color ?? lookOf(layer, o).word, kind: o.kind ?? 'slam', sfx: false, z: o.z ?? 4, enter: o.enter });
        if (o.sfx !== false) F.sfx(o.at, o.sfx ?? 'pow', o.gain ?? 0.8, { size: 0.7 });
        return r;
      };
      // caption box (yellow / white, comic font, upper case): K.caption is positioned by its top-left, so measure the width from the text and centre it; it needs 0.2 s after until to slide away → shift earlier
      S.line = (layer, o) => {
        // Bangers is a narrow upper-case comic font: at the same size it looks a size smaller, so scale by 1.3
        const size = (o.size ?? 50) * (o.optical ?? 1.3), px = F.px(size), maxW = o.maxW ?? F.W * (F.portrait ? 0.86 : 0.72), pad = px * 0.7 * 2 + K.line * 1.5;
        const tw = textW(String(o.text).toUpperCase(), `400 ${px}px ${K.fonts.comic}`) * 1.06 + px * 0.04 * o.text.length;
        const w = Math.min(maxW, tw + pad), lines = Math.ceil((tw + pad) / maxW), h = lines * px * 1.15 + px * 0.9;
        const x = (o.align ?? 'center') === 'left' ? o.x : (o.x ?? F.W / 2) - w / 2, y = (o.y ?? F.H / 2) - h / 2;
        const bg = o.bg ?? (lookOf(layer, {}).color === c.yellow ? '#FFFFFF' : c.yellow);
        const box = K.caption(layer, { at: o.at - S.lead, until: (o.until ?? 1e9) - 0.2, text: o.text, x, y, w, size, bg, kind: o.kind ?? 'label', sfx: o.sfx, z: o.z ?? 4 });
        set(box, { textAlign: o.textAlign ?? 'center' });
        return { el: box, text: box };
      };
      S.card = (layer, o) => {
        const p = K.panel(layer, { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h, at: o.at - S.lead, until: (o.until ?? 1e9) - 0.32, enter: o.enter ?? 'pop', exit: o.exit ?? 'pop', rot: o.rot ?? -1.2, z: o.z ?? 3, sfx: o.sfx });
        return { el: p.inner, w: p.w, h: p.h };
      };
      S.shot = (layer, o) => {
        const c2 = S.card(layer, { ...o, bg: '#FFFFFF' });
        return { ...c2, img: img(c2.el, o), box: { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h } };
      };
      // signature move: a ring of speed lines bursts out, with two star flashes beside it
      S.accent = (layer, o) => {
        const until = o.until ?? o.at + 1.4, r = F.px(o.size ?? 340);
        const a = o.at - 0.12, b = Math.min(until, o.at + 0.9);
        const sp = K.speed(layer, { at: a, until: b, cx: o.x, cy: o.y, inner: (r * 0.75) / F.u, z: 2 });
        F.add((t) => set(sp, { opacity: String(Math.min(seg(t, a, a + 0.12), 1 - seg(t, b - 0.25, b))) }));   // speed lines fade in and out (popping in / out reads as a dropped frame)
        K.emote(layer, { at: o.at + 0.1, until, x: o.x + r * 0.95, y: o.y - r * 0.55, kind: 'sparkle', size: 150, z: 5 });
        return {};
      };
      S.wipe = (o) => { const d = o.dur ?? 0.9; K.dotWipe({ at: o.cover - d / 2, dur: d, color: [c.red, c.blue, c.pink][(o.index ?? 0) % 3] }); return { show: o.cover, hide: o.cover }; };   // 0.9 s: the diagonal halftone reveal isn't too fast (no stutter even in a 24fps draft)
      S.end = (layer, o) => {
        K.cover(layer, { at: o.at, title: o.title, tagline: o.tagline, url: o.url, issue: o.issue, art: o.art ?? ((area) => K.bg(area, { color: c.cyan, dots: { color: 'rgba(20,20,20,.14)' }, rays: { color: 'rgba(255,255,255,.4)', n: 16, speed: 6 } })) });
        F.sfx(o.at + 0.8, 'logo', 1);
      };
      // ---- Telling information (pop): one comic panel per step (said in a speech bubble), two panels facing off, numbers in burst balloons, the magnified UI is a close-up panel ----
      const panelBg = [c.yellow, c.cyan, c.pink, '#FFFFFF'];
      const fitPx = (text, w, cap) => Math.max(26, Math.min(cap, (w * 2.1) / F.px(1) / Math.max(4, estUnits(text))));
      S.steps = (layer, o) => {
        const { items, T, until, C } = o, n = items.length, row = C.w >= C.h * 1.2, gap = F.px(30);
        const pw = row ? (C.w - gap * (n - 1)) / n : Math.min(C.w * 0.92, F.px(940)), ph = row ? Math.min(C.h * 0.86, pw * 1.3) : (C.h - gap * (n - 1)) / n;
        return items.map((it, j) => {
          const x0 = row ? C.x + j * (pw + gap) : C.x + (C.w - pw) / 2, y0 = row ? C.y + (C.h - ph) / 2 : C.y + j * (ph + gap), bw = pw * 0.84;
          const p = K.panel(layer, { x: x0, y: y0, w: pw, h: ph, at: T[j] - 0.45, until: until - 0.32, enter: ['left', 'top', 'right', 'bottom'][j % 4], exit: 'pop', bg: it.hot ? c.yellow : panelBg[(j + 1) % 4], dots: { color: 'rgba(20,20,20,.12)' }, rot: [-1.2, 0.8, -0.6, 1][j % 4], z: 3, sfx: j ? false : undefined });
          K.bubble(p.inner, { at: T[j], until: until - 0.15, text: it.text, x: (pw - bw) / 2, y: ph * (row ? 0.12 : 0.08), w: bw, size: fitPx(it.text, bw, 46), tail: [pw * 0.5, ph * (row ? 0.6 : 0.78)], kind: it.hot ? 'shout' : 'speech', sfx: 'pop' });
          if (it.note) K.caption(p.inner, { at: T[j] + 0.3, until: until - 0.2, text: it.note, x: pw * 0.06, y: ph * (row ? 0.74 : 0.6), w: pw * 0.88, size: fitPx(it.note, pw * 0.85, 30), sfx: false });
          if (it.hot) K.emote(p.inner, { at: T[j] + 0.15, until, x: pw * 0.86, y: ph * 0.14, kind: 'sparkle', size: 110 });
          return { x: x0 + pw / 2, y: y0 + ph / 2 };
        });
      };
      S.versus = (layer, o) => {
        const { cols, T, at2, until, C } = o, m = cols.length, stack = F.portrait && m > 2, gap = F.px(36);
        return cols.map((col, j) => {
          const pw = stack ? C.w : (C.w - gap * (m - 1)) / m, ph = stack ? (C.h - gap * (m - 1)) / m : C.h, x0 = stack ? C.x : C.x + j * (pw + gap), y0 = stack ? C.y + j * (ph + gap) : C.y, n2 = (col.points || []).length;
          const p = K.panel(layer, { x: x0, y: y0, w: pw, h: ph, at: T[j] - 0.45, until: until - 0.32, enter: j % 2 ? 'right' : 'left', exit: 'pop', bg: col.hot ? c.yellow : '#FFFFFF', dots: col.hot ? { color: 'rgba(232,49,42,.2)' } : undefined, rot: j % 2 ? 1.2 : -1.2, z: 3 });
          K.caption(p.inner, { at: T[j], until: until - 0.2, text: col.title, x: pw * 0.06, y: ph * 0.05, w: pw * 0.88, size: fitPx(col.title, pw * 0.8, 54), bg: col.hot ? c.red : c.cyan, color: col.hot ? '#FFFFFF' : undefined, sfx: false });
          (col.points || []).forEach((pt, r2) => { const bw = pw * 0.8, y = ph * (stack ? 0.32 : 0.24) + r2 * ((ph * (stack ? 0.6 : 0.7)) / Math.max(1, n2)); K.bubble(p.inner, { at: at2(j, r2), until: until - 0.15, text: ptText(pt), x: r2 % 2 ? pw * 0.14 : pw * 0.06, y, w: bw, size: fitPx(ptText(pt), bw, 44), tail: [r2 % 2 ? pw * 0.86 : pw * 0.14, y + F.px(110)], sfx: r2 ? false : 'pop' }); });
          if (col.hot) K.emote(p.inner, { at: T[j] + 0.2, until, x: pw * 0.9, y: ph * 0.08, kind: 'sparkle', size: 120 });
          return { x: x0 + pw / 2, y: y0 + ph / 2 };
        });
      };
      S.figures = (layer, o) => {
        const { data, ats, until, C } = o, n = data.length, mx = Math.max(...data.map((d) => d[1])), cols = F.portrait ? Math.min(2, n) : n, rows = Math.ceil(n / cols);
        return data.map(([name, val], j) => {
          const k = Math.sqrt(val / mx), hot = (o.hot || []).includes(j), cw = C.w / cols, rh = C.h / rows, x = C.x + cw * ((j % cols) + 0.5), y = C.y + rh * (Math.floor(j / cols) + 0.4), r = Math.min(cw * 0.46, rh * 0.34) * (0.7 + 0.3 * k);
          K.burst(layer, { at: ats[j], until, text: fmtNum(val, o), x, y, r: r / F.px(1), size: Math.min((r * 0.55) / F.px(1), (r * 1.5) / F.px(1) / Math.max(2, estUnits(fmtNum(val, o)))), fill: hot ? c.red : [c.yellow, c.cyan, c.pink][j % 3], textColor: hot ? c.yellow : K.ink, rot: [-8, 6, -4, 9][j % 4], z: 4, kind: 'label' });   // the bigger the number, the bigger the burst
          K.caption(layer, { at: ats[j] + 0.25, until, text: String(name), x: x - cw * 0.4, y: y + r * 0.82, w: cw * 0.8, size: 32, sfx: false, z: 5 });
          return { x, y };
        });
      };
      S.spotlight = (layer, o) => o.regions.map((rg, j) => { const m = magnify(F, layer, { src: o.src, box: o.box, region: rg, at: o.T[j], until: o.until, shape: 'square', rot: j % 2 ? 2 : -2, ring: `border:${f1(F.px(8))}px solid ${K.ink};box-shadow:${f1(F.px(12))}px ${f1(F.px(12))}px 0 ${K.ink}`, sfxType: 'pow' }); return { x: m.x, y: m.y }; });
      infoKit(F, S, { ink: K.ink, accent: c.red, colors: [c.blue, c.yellow, c.pink, c.cyan], font: K.fonts.head, display: K.fonts.comic, weight: 400, line: F.px(7), outline: K.ink, radius: 0, mark: c.red, labelScale: 0.72, cutSfx: 'pow',
        flashBg: (col) => `background-color:${col};background-image:radial-gradient(rgba(255,255,255,.32) 24%, transparent 26%);background-size:${f1(F.px(24))}px ${f1(F.px(24))}px;box-shadow:inset 0 0 0 ${f1(F.px(10))}px ${K.ink}`,   // pop: halftone dots + thick black border
        flashInk: '#FFE14D', flashText: () => `-webkit-text-stroke:${f1(F.px(5))}px ${K.ink};paint-order:stroke fill;text-transform:uppercase;letter-spacing:.02em` });
      return S;
    },
  });

  // ======================= Matisse cutout =======================
  P.kit.register('cutout', {
    runtime: 'cutout',
    theme: { bg: '#F3ECDD', fg: '#1C1B1A', ink: '#1C1B1A', paper: '#F3ECDD', accent: '#E4533B', muted: '#6B645A', fonts: { display: '"ZCOOL QingKe HuangYou", "PingFang SC", sans-serif', serif: '"ZCOOL QingKe HuangYou", "PingFang SC", sans-serif', sans: '"PingFang SC", "Noto Sans SC", sans-serif', script: '"ZCOOL QingKe HuangYou", "PingFang SC", sans-serif' } },
    make(F, opt) {
      const C = P.cutout(F, opt), cc = C.colors;
      const colors = opt.palette ?? [cc.blue, cc.red, cc.yellow, cc.green];
      const S = { lead: C.lead, ink: C.ink, paper: C.paper, colors, raw: C };
      const counts = new Map();
      // background: off-white base paper + a few big cut-outs in the corners (shape and colour change each scene), always swaying gently
      const DECOR = [['leaf', 'coral'], ['blob', 'star'], ['coral', 'spiral'], ['wave', 'leaf']];
      S.bg = (layer, o = {}) => {
        const v = o.variant ?? 0, d = C.desk(layer), PT = F.portrait, [s1, s2] = DECOR[v % 4];
        const big = F.px(PT ? 420 : 460);
        const spots = PT ? [[0.06, 0.1], [0.94, 0.9]] : [[0.05, 0.16], [0.95, 0.84]];
        [s1, s2].forEach((sh, i) => {
          const tall = sh === 'leaf' || sh === 'coral', w = sh === 'wave' ? big * 1.3 : tall ? big * 0.6 : big, h = sh === 'wave' ? big * 0.45 : big;
          C.piece(layer, { shape: sh, color: colors[(v + i * 2) % colors.length], x: F.W * spots[i][0], y: F.H * spots[i][1], w, h, rot: i ? 160 + v * 20 : 20 - v * 15, at: o.at ?? 0, enter: 'none', exit: 'none', sfx: false, sway: { amp: 2.5, period: 3.4 + i, bob: 5 }, z: 1, seed: 100 + v * 7 + i });
        });
        return { el: d };
      };
      S.word = (layer, o) => C.title(layer, { at: o.at, until: o.until, text: o.text, size: o.size ?? 170, x: o.x, y: o.y, maxW: o.maxW, kind: o.kind ?? 'slam', colors: o.colors, sfx: o.sfx, z: o.z ?? 4 });
      S.line = (layer, o) => { const p = C.strip(layer, { at: o.at, until: o.until, text: o.text, size: o.size ?? 50, x: o.x ?? F.W / 2, y: o.y ?? F.H / 2, align: o.align, maxW: o.maxW ?? F.W * (F.portrait ? 0.8 : 0.66), kind: o.kind ?? 'label', paper: o.paper, font: o.font, textAlign: o.textAlign ?? 'center', sfx: o.sfx, z: o.z ?? 4 }); return { el: p.el, text: p.text }; };
      S.card = (layer, o) => { const p = C.piece(layer, { shape: 'rect', color: o.color ?? cc.white, x: o.x, y: o.y, w: o.w, h: o.h, at: o.at, until: o.until, rough: 0.5, tilt: 10, z: o.z ?? 3, sfx: o.sfx }); return { el: p.inner, w: o.w, h: o.h }; };
      S.shot = (layer, o) => { const p = C.photo(layer, { src: o.src, x: o.x, y: o.y, w: o.w, h: o.h, at: o.at, until: o.until, tape: o.tape ?? true, tilt: o.tilt, z: o.z ?? 3, sfx: o.sfx }); return { el: p.inner, w: p.w, h: p.h, img: p.img, box: { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h } }; };
      // signature move: a star / spiral / seaweed cut-out sticks to the word's top-right corner, swaying gently
      S.accent = (layer, o) => {
        const n = counts.get(layer) ?? 0; counts.set(layer, n + 1);
        const r = F.px(o.size ?? 340), sh = ['star', 'spiral', 'leaf'][n % 3], sz = F.px(sh === 'leaf' ? 170 : 150);
        return C.piece(layer, { shape: sh, color: colors[(n + 1) % colors.length], x: Math.min(F.W - sz * 0.6, o.x + r * 0.95), y: Math.max(sz * 0.6, o.y - r * 0.6), w: sh === 'leaf' ? sz * 0.6 : sz, h: sz, rot: 15 - n * 25, at: o.at + 0.15, until: o.until, exit: 'lift', sway: { amp: 6, period: 2.6, bob: 6 }, sfx: false, z: 5, seed: 300 + n });
      };
      S.wipe = (o) => { const d = o.dur ?? 1.0, i = o.index ?? 0; C.wipe({ at: o.cover - d / 2, dur: d, color: colors[i % colors.length], from: ['left', 'right', 'top'][i % 3], out: ['tear', 'slide', 'peel'][i % 3] }); return { show: o.cover, hide: o.cover }; };
      S.end = (layer, o) => { C.endcard(layer, { at: o.at, title: { text: o.title }, tagline: o.tagline, url: o.url, colors }); F.sfx(o.at + 3 * F.B, 'logo', 1); };
      // ---- Telling information (cutout): one cut-out pasted on per step, two big sheets of coloured paper compared, numbers are a stack of paper pieces, the magnifier is set in a piece of coloured paper ----
      S.steps = (layer, o) => {
        const { items, T, until, C: A } = o, n = items.length, row = A.w >= A.h * 1.2, sz = row ? Math.min((A.w / n) * 0.82, A.h * 0.62) : Math.min((A.h / n) * 0.86, A.w * 0.55);
        return items.map((it, j) => {
          const p0 = lanePos(A, n, j, row, 0.07), x = row ? p0.x : A.x + A.w * (j % 2 ? 0.6 : 0.4), y = p0.y, sh = it.hot ? 'star' : ['blob', 'circle', 'petal', 'blob'][j % 4];
          C.piece(layer, { shape: sh, color: it.hot ? cc.red : colors[j % colors.length], x, y, w: sz, h: sz * (sh === 'petal' ? 0.72 : 0.92), rot: [-6, 8, -3, 5][j % 4], at: T[j] - 0.15, until, sway: { amp: 1.5, period: 3 + j * 0.4, bob: 3 }, z: 2, seed: 500 + j, sfx: j ? false : undefined });
          S.line(layer, { at: T[j], until, text: it.text, x, y, size: Math.max(30, Math.min(48, (sz * 1.6) / F.px(1) / Math.max(3, estUnits(it.text)))), maxW: sz * 0.92, z: 4 });
          if (it.note) S.line(layer, { at: T[j] + 0.3, until, text: it.note, x, y: y + sz * 0.5 + F.px(36), size: 30, maxW: sz * 1.15, sfx: false, z: 4 });
          return { x, y };
        });
      };
      S.versus = (layer, o) => {
        const { cols, T, at2, until, C: A } = o, m = cols.length, stack = F.portrait && m > 2, gap = F.px(40);
        return cols.map((col, j) => {
          const pw = stack ? A.w : (A.w - gap * (m - 1)) / m, ph = stack ? (A.h - gap * (m - 1)) / m : A.h, x = stack ? A.x + A.w / 2 : A.x + j * (pw + gap) + pw / 2, y = stack ? A.y + j * (ph + gap) + ph / 2 : A.y + A.h / 2, n2 = (col.points || []).length;
          C.piece(layer, { shape: 'rect', color: col.hot ? cc.red : colors[(j * 2) % colors.length], x, y, w: pw, h: ph, rough: 0.6, tilt: 8, rot: j % 2 ? 1.5 : -1.5, at: T[j] - 0.15, until, z: 2, seed: 700 + j });
          S.word(layer, { at: T[j], until, text: col.title, x, y: y - ph / 2 + Math.min(F.px(95), ph * 0.18), size: 66, maxW: pw * 0.88, kind: 'label', colors: ['#F7F1E3'] });
          (col.points || []).forEach((pt, r2) => S.line(layer, { at: at2(j, r2), until, text: ptText(pt), x, y: y - ph / 2 + Math.min(F.px(205), ph * 0.38) + r2 * Math.min(F.px(110), (ph * 0.55) / Math.max(1, n2)), size: 38, maxW: pw * 0.84, sfx: r2 ? false : undefined, z: 4 }));
          return { x, y };
        });
      };
      S.figures = (layer, o) => {
        const { data, ats, until, C: A } = o, n = data.length, mx = Math.max(...data.map((d) => d[1])), cw = A.w / n, sq = Math.min(cw * 0.42, (A.h * 0.6) / 5.4), base = A.y + A.h * 0.82;
        return data.map(([name, val], j) => {
          const k = Math.max(1, Math.round((val / mx) * 5)), hot = (o.hot || []).includes(j), x = A.x + cw * (j + 0.5);
          for (let q = 0; q < k; q++) C.piece(layer, { shape: q % 3 === 2 ? 'circle' : 'rect', color: hot ? cc.red : colors[(j + q) % colors.length], x: x + (q % 2 ? 5 : -5), y: base - sq * (q + 0.5) * 1.04, w: sq * 1.5, h: sq * 0.96, rough: 0.8, rot: ((q * 37) % 9) - 4, at: ats[j] - 0.3 + (q / k) * 0.4, until, z: 2, seed: 900 + j * 10 + q, sfx: q === 0 ? undefined : false });   // a stack of paper: the bigger the number, the taller the stack
          S.line(layer, { at: ats[j] + 0.15, until, text: fmtNum(val, o), x, y: base - sq * k * 1.04 - F.px(52), size: 46, maxW: cw * 0.9, z: 4, sfx: false });
          S.line(layer, { at: ats[j] + 0.3, until, text: String(name), x, y: base + F.px(58), size: 34, maxW: cw * 0.92, sfx: false, z: 4 });
          return { x, y: base - (sq * k) / 2 };
        });
      };
      S.spotlight = (layer, o) => o.regions.map((rg, j) => { const col = colors[(j + 1) % colors.length]; const m = magnify(F, layer, { src: o.src, box: o.box, region: rg, at: o.T[j], until: o.until, rot: j % 2 ? 3 : -3, sfxType: 'paste',
        under: (wrap, r) => el('div', `left:${f1(-r * 0.16)}px;top:${f1(-r * 0.14)}px;width:${f1(r * 2.32)}px;height:${f1(r * 2.28)}px;background:${col};border-radius:${['46% 54% 38% 62% / 52% 40% 60% 48%', '62% 38% 55% 45% / 40% 58% 42% 60%'][j % 2]}`, wrap) }); return { x: m.x, y: m.y }; });   // the lens is set in a piece of hand-cut coloured paper
      infoKit(F, S, { ink: C.ink, accent: cc.red, colors, font: C.fonts.body, display: C.fonts.head, line: F.px(9), outline: null, radius: F.px(6), mark: cc.red, cutSfx: 'snip',
        flashBg: () => `background:${C.paper}`,   // cutout: one big cut piece of coloured paper on off-white base paper (a different shape per cell), the word on top
        flashDecor: (inner, col, i, R) => el('div', `left:${f1(R.w * [0.08, 0.14, 0.04, 0.1][i % 4])}px;top:${f1(R.h * [0.1, 0.06, 0.14, 0.08][i % 4])}px;width:${f1(R.w * 0.84)}px;height:${f1(R.h * 0.8)}px;background:${col};border-radius:${['46% 54% 38% 62% / 52% 40% 60% 48%', '62% 38% 55% 45% / 40% 58% 42% 60%', '38% 62% 48% 52% / 60% 44% 56% 40%', '55% 45% 60% 40% / 45% 55% 45% 55%'][i % 4]};transform:rotate(${[-3, 2.5, -1.5, 3][i % 4]}deg)`, inner) });
      return S;
    },
  });

  // ======================= ASCII art =======================
  P.kit.register('ascii', {
    runtime: 'ascii',
    // ground picked for the product: light (printer paper + black text) / dark (old monitor: near black + off-white text + phosphor green) / brand colour
    theme: { bg: '#F4F3EE', fg: '#161616', ink: '#161616', paper: '#F4F3EE', accent: '#2F5BEA', muted: '#6B6A64', ground: 'light', fonts: { display: 'Inter, sans-serif', serif: 'Inter, sans-serif', sans: '"IBM Plex Mono", ui-monospace, monospace', script: 'Inter, sans-serif', mono: '"IBM Plex Mono", ui-monospace, Menlo, monospace' } },
    groundNames: ['light', 'dark', 'brand'],
    grounds: (g, o = {}) => {
      if (g === 'light') return { bg: o.bg ?? '#F4F3EE', paper: o.bg ?? '#F4F3EE', fg: '#161616', ink: '#161616', accent: o.accent ?? o.brand ?? '#2F5BEA', muted: '#6B6A64', ground: 'light' };
      if (g === 'dark') return { bg: o.bg ?? '#0C0D0C', paper: o.bg ?? '#0C0D0C', fg: '#E9E7DF', ink: '#E9E7DF', accent: o.accent ?? o.brand ?? '#57E389', muted: '#8C8A82', ground: 'dark' };
      if (g === 'brand') {
        const b = o.brand; if (!rgbOf(b)) throw new Error(M("ground: 'brand' 要给品牌色：{ brand: '#RRGGBB' }", "ground: 'brand' needs a brand colour: { brand: '#RRGGBB' }"));
        const fg = lum(b) < 0.55 ? '#FFFFFF' : '#141414';
        return { bg: b, paper: b, fg, ink: fg, accent: o.accent ?? (fg === '#FFFFFF' ? mix(b, '#FFFFFF', 0.75) : mix(b, '#000000', 0.6)), muted: mix(fg, b, 0.35), ground: 'brand' };
      }
      return null;
    },
    make(F, opt) {
      const A = P.ascii(F, opt), PT = F.portrait, m0 = A.metric();
      const S = { lead: A.lead, push: 0.008, ink: A.ink, paper: A.paper, colors: [A.accent, A.ink, A.muted], raw: A };
      S.bg = (layer, o = {}) => A.bg(layer, { variant: o.variant ?? 0, invert: o.invert });
      S.word = (layer, o) => A.big(layer, { at: o.at, until: o.until, text: o.text, size: o.size ?? 200, x: o.x, y: o.y, maxW: o.maxW, kind: o.kind ?? 'slam', color: o.colors?.[0] ?? o.color ?? ((o.variant ?? 0) % 2 ? A.accent : undefined), sfx: o.sfx, z: o.z ?? 4 });
      S.line = (layer, o) => A.type(layer, { at: o.at, until: o.until, text: o.text, size: o.size ?? 46, x: o.x, y: o.y, align: o.align === 'left' ? 'left' : 'center', maxW: o.maxW ?? F.W * (PT ? 0.86 : 0.7), kind: o.kind ?? 'label', color: o.color, cursor: o.cursor ?? 'hide', sfx: o.sfx, z: o.z ?? 5 });
      S.card = (layer, o) => { const b = A.box(layer, { x: o.x, y: o.y, w: o.w, h: o.h, at: o.at, until: o.until, z: o.z ?? 3, sfx: o.sfx }); return { el: b.inner, w: o.w, h: o.h }; };
      // real screenshot: ASCII art first, then at at it "resolves" from top to bottom into the original image (untouched)
      S.shot = (layer, o) => { const w = o.w, h = o.h, pl = A.plate(layer, { src: o.src, fit: o.fit === 'cover' ? 'cover' : 'contain', x: o.x, y: o.y, w, h, at: o.at - 0.45, until: o.until, dur: 0.5, resolve: { at: o.at, dur: 0.45 }, z: o.z ?? 3, sfx: o.sfx }); return { el: pl.el, w, h, img: pl.img, box: pl.box }; };
      S.accent = (layer, o) => A.ping(layer, { at: o.at, x: o.x, y: o.y, r: Math.min(420, (o.size ?? 340) * 1.1) });
      S.wipe = (o) => { const d = o.dur ?? 0.9, i = o.index ?? 0; A.wipe({ at: o.cover - d / 2, dur: d, from: ['left', 'top', 'right'][i % 3] }); return { show: o.cover, hide: o.cover }; };
      S.end = (layer, o) => { A.endcard(layer, { at: o.at, title: o.title, tagline: o.tagline, url: o.url }); F.sfx(o.at + 3 * F.B, 'logo', 1); };
      // ---- Telling information (ASCII): steps are commands typed line by line, contrast is + / - in two boxes, numbers are █ character bars, focus is a magnifier framed in box-drawing characters ----
      S.steps = (layer, o) => {
        const { items, T, until, C: R } = o, n = items.length, notes = items.some((it) => it.note), rowH = Math.min(F.px(notes ? 160 : 120), R.h / n), size = Math.max(30, Math.min(notes ? 44 : 52, (R.w * 0.8) / F.px(1) / Math.max(8, ...items.map((it) => estUnits(it.text) + 3)) / 0.6));
        return items.map((it, j) => {
          const y = R.y + R.h / 2 + (j - (n - 1) / 2) * rowH, x = R.x + R.w * 0.06;
          A.type(layer, { at: T[j], until, text: it.text, prompt: String(j + 1).padStart(2, '0') + ' > ', size, x, y, align: 'left', maxW: R.w * 0.92, color: it.hot ? A.accent : undefined, cursor: j === n - 1 ? 'blink' : 'hide', sfx: j ? false : undefined, z: 4 });
          if (it.note) A.type(layer, { at: T[j] + 0.3, until, text: it.note, prompt: '     # ', size: size * 0.62, x, y: y + F.px(size) * 1.25, align: 'left', maxW: R.w * 0.92, color: A.muted, cursor: false, sfx: false, z: 4 });
          return { x: R.x + R.w / 2, y };
        });
      };
      S.versus = (layer, o) => {
        const { cols, T, at2, until, C: R } = o, k = cols.length, stack = PT && k > 1, gap = F.px(40);
        return cols.map((col, j) => {
          const pw = stack ? R.w : (R.w - gap * (k - 1)) / k, ph = stack ? (R.h - gap * (k - 1)) / k : R.h, x = stack ? R.x + R.w / 2 : R.x + j * (pw + gap) + pw / 2, y = stack ? R.y + j * (ph + gap) + ph / 2 : R.y + R.h / 2;
          const b = A.box(layer, { x, y, w: pw, h: ph, at: T[j], until, color: col.hot ? A.accent : undefined, z: 2, sfx: j ? false : undefined });
          const top = y - b.h / 2, n2 = (col.points || []).length, step = Math.min(F.px(84), (b.h * 0.6) / Math.max(1, n2));
          A.type(layer, { at: T[j] + 0.1, until, text: col.title, size: 46, x: x - b.w / 2 + m0.cw * 3, y: top + Math.min(F.px(90), b.h * 0.18), align: 'left', maxW: b.w - m0.cw * 6, weight: 700, color: col.hot ? A.accent : undefined, cursor: false, z: 4, sfx: false });
          (col.points || []).forEach((pt, r2) => A.type(layer, { at: at2(j, r2), until, text: ptText(pt), prompt: col.hot || k === 1 ? '+ ' : '- ', size: 36, x: x - b.w / 2 + m0.cw * 3, y: top + Math.min(F.px(190), b.h * 0.36) + r2 * step, align: 'left', maxW: b.w - m0.cw * 6, cursor: false, z: 4, sfx: r2 ? false : undefined }));
          return { x, y };
        });
      };
      // numbers: each row is name ······ █████▌ number; the bar grows cell by cell, the number counts up with it
      S.figures = (layer, o) => {
        const { data, ats, until, C: R } = o, n = data.length, mx = Math.max(...data.map((d) => d[1])), rowH = Math.min(F.px(130), R.h / n), size = PT ? 34 : 40, m = A.metric(F.px(size) * 1.2);
        const nameCols = Math.max(...data.map((d) => String(d[0]).length)) + 2, barCols = Math.max(6, Math.floor(R.w / m.cw) - nameCols - 10);
        return data.map(([name, val], j) => {
          const y = R.y + R.h / 2 + (j - (n - 1) / 2) * rowH, hot = (o.hot || []).includes(j), full = Math.max(1, (val / mx) * barCols);
          const row = el('div', `left:${f1(R.x + R.w / 2 - ((nameCols + barCols + 10) * m.cw) / 2)}px;top:${f1(y - m.ch / 2)}px;font:500 ${f1(m.fs)}px/${f1(m.ch)}px ${A.font};white-space:pre;color:${A.schemeOf(layer).ink};display:none;z-index:4`, layer);
          const nm = el('span', 'position:relative', row); nm.textContent = String(name).padEnd(nameCols, ' ');
          const bar = el('span', `position:relative;color:${hot ? A.accent : A.schemeOf(layer).ink}`, row), num = el('span', `position:relative;margin-left:${f1(m.cw)}px;font-weight:700;color:${hot ? A.accent : 'inherit'}`, row);
          const at = ats[j], txt = fmtNum(val, o);
          F.text(nm, 'label', String(name), at - 0.5, until); F.text(num, 'label', txt, at - 0.5, until);
          F.add((t) => {
            const on = t >= at - 0.55 && t < until; set(row, { display: on ? '' : 'none' }); if (!on) return;
            const q = seg(t, at - 0.5, at, E.quartOut) * (until < 1e8 ? 1 - seg(t, until - 0.3, until) : 1), cells = full * q, whole = Math.floor(cells);
            bar.textContent = '█'.repeat(whole) + (cells - whole > 0.5 ? '▌' : '') + ' '.repeat(Math.max(0, barCols - whole));
            num.textContent = q >= 1 ? txt : fmtNum(Number.isInteger(val) ? Math.round(val * q) : val * q, o);
          });
          A.keys(at - 0.5, 0.5, 6, 0.25);
          return { x: R.x + R.w / 2, y };
        });
      };
      // focus: the magnifier is a box drawn with box-drawing characters
      S.spotlight = (layer, o) => o.regions.map((rg, j) => { const mg = magnify(F, layer, { src: o.src, box: o.box, region: rg, at: o.T[j], until: o.until, shape: 'square', sfxType: 'type',
        under: (wrap, r) => { const mm = A.metric(), cols = Math.ceil((2 * r) / mm.cw) + 2, rows = Math.ceil((2 * r) / mm.ch) + 2, fr = el('div', `left:${f1(r - (cols * mm.cw) / 2)}px;top:${f1(r - (rows * mm.ch) / 2)}px;font:500 ${f1(mm.fs)}px/${f1(mm.ch)}px ${A.font};white-space:pre;color:${A.accent}`, wrap); fr.textContent = Array.from({ length: rows }, (_, y) => (y === 0 ? '┌' + '─'.repeat(cols - 2) + '┐' : y === rows - 1 ? '└' + '─'.repeat(cols - 2) + '┘' : '│' + ' '.repeat(cols - 2) + '│')).join('\n'); } }); return { x: mg.x, y: mg.y }; });
      // one fast-cut cell: a character texture over a solid colour, big word on top
      const NOI = '01<>/\\|[]{}#*+=-_:;~^%$&?!';
      infoKit(F, S, { ink: A.ink, accent: A.accent, colors: [A.accent, A.ink, A.muted], font: A.font, display: A.display, line: F.px(4), outline: null, radius: 0, mark: A.accent, cutSfx: 'tick',
        flashBg: (col) => `background:${col}`,
        flashDecor: (bg, col, i, R2) => { const mm = A.metric(), cols = Math.ceil(R2.w / mm.cw), rows = Math.ceil(R2.h / mm.ch); let str = ''; for (let y = 0; y < rows; y++) { let line = ''; for (let x = 0; x < cols; x++) { const r = ((Math.imul(x * 73856093 ^ y * 19349663 ^ (i + 1) * 83492791, 2654435761) >>> 0) % 1000) / 1000; line += r < 0.22 ? NOI[Math.floor(r * 120) % NOI.length] : ' '; } str += line + '\n'; } const d = el('div', `left:0;top:0;font:500 ${f1(mm.fs)}px/${f1(mm.ch)}px ${A.font};white-space:pre;color:${lum(col) < 0.5 ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.16)'}`, bg); d.textContent = str; },
        flashText: (size) => `font-family:${A.font};font-weight:700;letter-spacing:-.02em` });
      return S;
    },
  });

  // ======================= Constructivism / Bauhaus =======================
  P.kit.register('bauhaus', {
    runtime: 'bauhaus',
    theme: { bg: '#EFE7D6', fg: '#161413', ink: '#161413', paper: '#EFE7D6', accent: '#D3281C', muted: '#8D8579', fonts: { display: '"Noto Sans", "Noto Sans SC", sans-serif', serif: '"Noto Sans", "Noto Sans SC", sans-serif', sans: '"Noto Sans", "Noto Sans SC", sans-serif', script: '"Noto Sans", "Noto Sans SC", sans-serif', mono: '"Oswald", "Noto Sans SC", sans-serif' } },
    make(F, opt) {
      const B = P.bauhaus(F, opt), W = F.W, H = F.H, PT = F.portrait, PAL = P.bauhaus.PAL, u = F.px(1);
      const RED = B.colors.red, S = { lead: 0.35, push: 0.006, ink: PAL.ink, paper: PAL.paper, colors: [RED, PAL.ink, B.colors.yellow, B.colors.blue], raw: B };
      let nWord = 0;
      S.bg = (layer, o = {}) => B.bg(layer, { variant: o.variant ?? 0, ground: o.ground });
      // big word: heavy sans set on a slant (one angle per line, alternating); variant 1 = red text
      S.word = (layer, o) => B.slogan(layer, { text: o.text, at: o.at, until: o.until, x: o.x ?? W / 2, y: o.y ?? H * 0.45, size: o.size ?? (PT ? 120 : 150), rot: o.rot ?? (nWord++ % 2 ? 6 : -6), color: o.variant ? 'red' : 'ink', maxW: (o.maxW ?? W * 0.86) / u, kind: o.kind ?? 'slam', sfx: o.sfx });
      S.line = (layer, o) => B.label(layer, { text: o.text, at: o.at, until: o.until, x: o.x ?? W / 2, y: o.y ?? H * 0.68, size: Math.min(56, o.size ?? 46), maxW: (o.maxW ?? W * 0.9) / u, align: o.align, bar: 'red', kind: o.kind ?? 'label', sfx: o.sfx === 'pulse' ? undefined : o.sfx });
      // card / screenshot: off-white paper card, thick black edge, an offset red block behind it (a printed hard shadow); slides in along a diagonal
      const card = (layer, o, inner) => {
        const off = u * 18, wrap = el('div', `left:${f1(o.x - o.w / 2)}px;top:${f1(o.y - o.h / 2)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;display:none;z-index:${o.z ?? 10}`, layer);
        el('div', `left:${f1(off)}px;top:${f1(off)}px;width:100%;height:100%;background:${layer._ground === 'red' ? PAL.ink : RED}`, wrap);   // a red hard shadow is invisible on a red ground: use black
        const b = el('div', `inset:0;background:${inner ?? PAL.white};border:${f1(u * 6)}px solid ${PAL.ink};box-sizing:border-box;overflow:hidden`, wrap);
        const a0 = o.at - 0.5, until = o.until ?? 1e9;
        F.add((t) => { const on = t >= a0 && t < until; set(wrap, { display: on ? '' : 'none' }); if (!on) return; const q = seg(t, a0, o.at, E.expoOut), out = until < 1e8 ? seg(t, until - 0.3, until, E.quartIn) : 0; set(wrap, { transform: `translate(${f1(-(1 - q) * W * 0.5 - out * W * 0.5)}px,${f1((1 - q) * H * 0.12)}px)` }); });
        if (o.sfx !== false) F.sfx(o.at - 0.1, 'clank', 0.35);
        return { wrap, b };
      };
      S.card = (layer, o) => { const c = card(layer, o); return { el: c.b, w: o.w, h: o.h }; };
      S.shot = (layer, o) => { const c = card(layer, o, '#fff'), im = el('img', `left:0;top:0;width:100%;height:100%;object-fit:${o.fit === 'contain' ? 'contain' : 'cover'}`, c.b); im.src = o.src; const bw = u * 6; return { el: c.b, w: o.w, h: o.h, img: im, box: { x: o.x - o.w / 2 + bw, y: o.y - o.h / 2 + bw, w: o.w - 2 * bw, h: o.h - 2 * bw } }; };
      // signature move: a burst of rays shoots out from one corner of the word (loudhailer, manifesto)
      S.accent = (layer, o) => { B.rays(layer, { x: o.x + u * (o.size ?? 300) * 0.6, y: o.y - u * (o.size ?? 300) * 0.3, angle: -30, spread: 46, n: 4, len: 420, color: 'red', at: o.at + 0.1, until: o.until }); return {}; };
      S.wipe = (o) => { B.wipe({ at: o.cover, kind: ['wedge', 'circle', 'bars'][(o.index ?? 0) % 3] }); return { show: o.cover, hide: o.cover }; };
      S.end = (layer, o) => B.endcard(layer, { at: o.at, title: o.title, sub: o.tagline, url: o.url });
      // ---- Telling information (constructivism): one diagonal stair per step; contrast is red / black halves split by a diagonal; numbers are thick bars; a spot on the UI is a red ring + everything else dimmed ----
      S.steps = (layer, o) => {
        const { items, T, until, C: R } = o, n = items.length, row = R.w >= R.h * 1.2;
        return items.map((it, j) => {
          const q = n === 1 ? 0.5 : j / (n - 1), x = row ? R.x + R.w * (0.5 / n + q * (1 - 1 / n)) : R.x + R.w * 0.12, y = row ? R.y + R.h * (0.78 - 0.4 * q) : R.y + R.h * (0.5 / n + q * (1 - 1 / n)), bw = row ? (R.w / n) * 0.9 : R.w * 0.16, bh = row ? R.h * (0.18 + 0.4 * q) : F.px(70);
          // stairs: solid blocks climbing up (landscape) / to the right (portrait), a number printed on each; text above / to the right of the block
          B.shape(layer, { kind: 'rect', x: row ? x : R.x + bw / 2, y: row ? R.y + R.h - bh / 2 : y, w: bw / u, h: bh / u, color: it.hot ? 'red' : 'ink', at: T[j], until, enter: 'grow', origin: row ? 'bottom' : 'left' });
          const num = el('div', `left:0;top:0;font:700 ${f1(u * (row ? 64 : 52))}px/1 ${B.num};color:${PAL.paper};z-index:21;display:none`, layer); num.textContent = String(j + 1).padStart(2, '0');
          F.prep(() => { const d = num.style.display; num.style.display = ''; num._w = num.offsetWidth; num._h = num.offsetHeight; num.style.display = d; });   // measuring while hidden gives 0: show it briefly in prep and measure
          F.add((t) => { const on = t >= T[j] && t < until; set(num, { display: on ? '' : 'none' }); if (on) set(num, { transform: `translate(${f1((row ? x : R.x + bw / 2) - num._w / 2)}px,${f1((row ? R.y + R.h - F.px(64) : y) - num._h / 2)}px)` }); });
          const lx = row ? x : R.x + bw + F.px(30), ly = row ? R.y + R.h - bh - F.px(it.note ? 100 : 46) : y;
          B.label(layer, { text: it.text, at: T[j] + 0.1, until, x: lx, y: ly, align: row ? undefined : 'left', size: 44, maxW: (row ? (R.w / n) * 0.96 : R.w - bw - F.px(40)) / u, sfx: false });
          if (it.note) B.label(layer, { text: it.note, at: T[j] + 0.35, until, x: lx, y: ly + F.px(row ? 52 : 56), align: row ? undefined : 'left', size: 30, color: 'grey', maxW: (row ? (R.w / n) * 0.96 : R.w - bw - F.px(40)) / u, sfx: false });
          return { x: lx, y: ly };
        });
      };
      S.versus = (layer, o) => {
        const { cols, T, at2, until, C: R } = o, m = cols.length;
        return cols.map((col, j) => {
          const cw = R.w / m, x = R.x + cw * (j + 0.5), hot = !!col.hot;
          // each side is a diagonally cut colour block (red for the hot side, black for the other), title on the block, points below
          B.shape(layer, { kind: j === 0 ? [[0, 0], [1, 0], [0.86, 1], [0, 1]] : [[0.14, 0], [1, 0], [1, 1], [0, 1]], x, y: R.y + F.px(70), w: cw / u, h: 140, color: hot ? 'red' : 'ink', at: T[j], until, enter: 'slide', from: j === 0 ? 180 : 0, to: j === 0 ? 180 : 0, sfx: undefined });
          B.slogan(layer, { text: col.title, at: T[j] + 0.1, until, x, y: R.y + F.px(70), size: 64, maxW: (cw * 0.84) / u, color: 'paper', sfx: false });
          (col.points || []).forEach((pt, r2) => B.label(layer, { text: ptText(pt), at: at2(j, r2), until, x: R.x + cw * j + F.px(40), y: R.y + F.px(200) + r2 * F.px(80), align: 'left', size: 40, bar: hot ? 'red' : 'ink', maxW: (cw - F.px(80)) / u, sfx: r2 ? false : undefined }));
          return { x, y: R.y + R.h / 2 };
        });
      };
      S.figures = (layer, o) => {
        const { data, ats, until, C: R } = o, n = data.length, mx = Math.max(...data.map((d) => d[1])), cw = R.w / n, base = R.y + R.h * 0.84;
        B.shape(layer, { kind: 'rect', x: R.x + R.w / 2, y: base + F.px(6), w: R.w / u, h: 12, color: 'ink', at: ats[0] - 0.2, until, enter: 'grow', sfx: false });
        return data.map(([name, val], j) => {
          const x = R.x + cw * (j + 0.5), hot = (o.hot || []).includes(j), hh = (R.h * 0.6 * val) / mx, bw = Math.min(cw * 0.5, F.px(150));
          B.shape(layer, { kind: 'rect', x, y: base - hh / 2, w: bw / u, h: hh / u, color: hot ? 'red' : 'ink', at: ats[j], until, enter: 'grow', origin: 'bottom', sfx: 'clank' });
          B.label(layer, { text: fmtNum(val, o), at: ats[j] + 0.1, until, x, y: base - hh - F.px(40), size: 46, color: hot ? 'red' : 'ink', sfx: false, kind: 'label' });
          B.label(layer, { text: String(name), at: ats[j] + 0.2, until, x, y: base + F.px(50), size: 34, maxW: (cw * 0.92) / u, sfx: false });
          return { x, y: base - hh / 2 };
        });
      };
      S.spotlight = (layer, o) => o.regions.map((rg, j) => {
        const a = o.T[j], b = j < o.regions.length - 1 ? o.T[j + 1] : o.until, cx = rg.x + rg.w / 2, cy = rg.y + rg.h / 2, r = Math.hypot(rg.w, rg.h) / 2 + F.px(72);   /* the ring sits outside the region's corners: the corner numbers (①②③) aren't crossed by the line */
        const dim = el('div', `left:${f1(o.box.x)}px;top:${f1(o.box.y)}px;width:${f1(o.box.w)}px;height:${f1(o.box.h)}px;z-index:25;pointer-events:none;background:radial-gradient(circle ${f1(r)}px at ${f1(cx - o.box.x)}px ${f1(cy - o.box.y)}px, transparent 98%, rgba(22,20,19,.55) 100%);opacity:0`, layer);
        F.add((t) => set(dim, { opacity: String(Math.min(seg(t, a - 0.3, a), b < 1e8 ? 1 - seg(t, b - 0.25, b) : 1)) }));
        B.shape(layer, { kind: 'ring', x: cx, y: cy, r: r / u, stroke: 14, color: 'red', at: a, until: b, enter: 'pop', exit: 'pop', z: 26, sfx: 'snap' });
        return { x: cx, y: cy };
      });
      infoKit(F, S, { ink: PAL.ink, accent: RED, colors: [RED, PAL.ink, PAL.yellow, PAL.blue], font: '"Noto Sans", "Noto Sans SC", sans-serif', display: '"Noto Sans", "Noto Sans SC", sans-serif', line: F.px(8), outline: null, radius: 0, mark: RED, cutSfx: 'clank',
        flashBg: (col) => `background:${col}`,
        flashDecor: (bg, col, i, R) => el('div', `left:${f1(-R.w * 0.1)}px;top:${f1(R.h * (i % 2 ? 0.2 : 0.7))}px;width:${f1(R.w * 1.2)}px;height:${f1(Math.max(F.px(30), R.h * 0.07))}px;background:${col === PAL.ink ? RED : PAL.ink};transform:rotate(${i % 2 ? 8 : -8}deg)`, bg) });
      return S;
    },
  });

  // ======================= Swiss poster kinetic typography =======================
  P.kit.register('swiss', {
    runtime: 'swiss',
    theme: { bg: '#F1F0EB', fg: '#111111', ink: '#111111', paper: '#F1F0EB', accent: '#E5381F', muted: '#8C8B86', fonts: { display: '"Inter Tight", "Noto Sans SC", sans-serif', serif: '"Inter Tight", "Noto Sans SC", sans-serif', sans: '"Inter Tight", "Noto Sans SC", sans-serif', script: '"Inter Tight", "Noto Sans SC", sans-serif', mono: '"Inter Tight", "Noto Sans SC", sans-serif' } },
    make(F, opt) {
      const X = P.swiss(F, opt), W = F.W, H = F.H, PT = F.portrait, u = F.px(1), A = X.colors.accent;
      const S = { lead: 0.62, push: 0.006, ink: X.colors.ink, paper: X.colors.paper, colors: [A, X.colors.ink, '#5A5955'], raw: X };
      const GR = ['paper', 'ink', 'paper', 'accent'];
      // the ground follows the variant (paper / black / paper with column guides / accent), so scenes alternate the way Swiss posters do
      S.bg = (layer, o = {}) => { const v = o.variant ?? 0; return X.bg(layer, { variant: v === 2 ? 1 : 0, ground: o.ground ?? GR[v % 4] }); };
      const quick = (n) => ({ dur: 0.45, stagger: Math.min(0.03, 0.17 / Math.max(1, n - 1)) });
      // big word: grotesk letters rising out of the line mask (variant 1 = accent colour)
      S.word = (layer, o) => X.type(layer, { text: o.text, at: o.at, until: o.until, x: o.x ?? W / 2, y: o.y ?? H * 0.45, size: o.size ?? (PT ? 190 : 240), align: 'center', maxW: o.maxW ?? W * 0.9, color: o.variant ? 'acc' : 'ink', kind: o.kind ?? 'slam', sfx: o.sfx, rise: false, ...quick([...String(o.text)].length) });
      S.line = (layer, o) => X.line(layer, { text: o.text, at: o.at, until: o.until, x: o.x ?? W / 2, y: o.y ?? H * 0.68, size: Math.min(56, o.size ?? 46), maxW: o.maxW ?? W * 0.84, align: o.align ?? 'center', kind: o.kind ?? 'label', sfx: o.sfx === 'pulse' ? undefined : o.sfx, per: 0.025 });
      // card: a flat card with a hairline edge, revealed upward from its bottom edge
      S.card = (layer, o) => {
        const a0 = o.at - 0.55, until = o.until ?? 1e9, c = el('div', `left:${f1(o.x - o.w / 2)}px;top:${f1(o.y - o.h / 2)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;background:var(--sw-card);box-shadow:inset 0 0 0 ${f1(u * 2)}px var(--sw-line);overflow:hidden;display:none;z-index:${o.z ?? 10}`, layer);
        F.add((t) => { const on = t >= a0 && t < until; set(c, { display: on ? '' : 'none' }); if (!on) return; const q = seg(t, a0, o.at, E.expoOut), qo = until < 1e8 ? seg(t, until - 0.3, until, E.quartIn) : 0; set(c, { clipPath: q < 1 ? `inset(${f1((1 - q) * 100)}% 0 0 0)` : qo ? `inset(0 0 ${f1(qo * 100)}% 0)` : '' }); });
        if (o.sfx !== false) F.sfx(a0 + 0.05, 'slide', 0.3);
        return { el: c, w: o.w, h: o.h };
      };
      S.shot = (layer, o) => { const r = X.shot(layer, { src: o.src, x: o.x, y: o.y, w: o.w, h: o.h, fit: o.fit === 'contain' ? 'contain' : 'cover', at: o.at, until: o.until, sfx: o.sfx }); return { el: r.el, w: o.w, h: o.h, img: r.img, box: r.box }; };
      // signature move: a thick accent bar slides under the word and an arrow lands at its end
      S.accent = (layer, o) => {
        const s = F.px(o.size ?? 240), y = Math.min(H * (PT ? 0.76 : 0.88), o.y + s * 0.62), x0 = W * 0.08, w = W * 0.84;
        X.rule(layer, { x: x0, y, w: w - F.px(150), h: 16, at: o.at, until: o.until, color: 'acc' });
        X.arrow(layer, { x: x0 + w - F.px(60), y: y + F.px(8), size: 120, at: o.at + 0.15, until: o.until, color: 'acc' });
        return {};
      };
      S.wipe = (o) => { X.wipe({ at: o.cover, kind: ['whip', 'bands', 'dot'][(o.index ?? 0) % 3] }); return { show: o.cover, hide: o.cover }; };
      S.end = (layer, o) => X.end(layer, { at: o.at, title: o.title, sub: o.tagline, url: o.url });
      // ---- Telling information (Swiss): steps are a numbered list .1 .2 .3; contrast is two columns split by a rule with an arrow; numbers are flat bars; a spot on the UI is an accent outline with the rest dimmed ----
      S.steps = (layer, o) => {
        const { items, T, until, C: R } = o, n = items.length, size = Math.max(40, Math.min(PT ? 64 : 72, R.h / u / n / 1.6));
        return X.list(layer, { items: items.map((it, j) => ({ text: it.text, note: it.note, hot: it.hot, at: T[j] })), x: R.x, y: R.y + Math.max(0, (R.h - n * F.px(size * 1.6)) / 2), w: R.w, size, gap: size * 1.6, until });
      };
      S.versus = (layer, o) => {
        const { cols, T, at2, until, C: R } = o;
        return X.versus(layer, { cols: cols.map((c, j) => ({ title: c.title, titleSize: PT ? 96 : 120, pointSize: PT ? 42 : 46, points: (c.points || []).map(ptText), ats: (c.points || []).map((_, r) => at2(j, r)), hot: c.hot, at: T[j] })), x: R.x, y: R.y, w: R.w, h: R.h, until, stack: R.w < R.h * 1.2, dimOld: false, arrow: cols.length === 2 });
      };
      S.figures = (layer, o) => { const { data, ats, until, C: R } = o; return X.bars(layer, { data: data.map((d, j) => [d[0], d[1], { at: ats[j], hot: (o.hot || []).includes(j) }]), unit: o.unit, decimals: o.decimals, x: R.x, y: R.y, w: R.w, h: R.h, until }); };
      S.spotlight = (layer, o) => o.regions.map((rg, j) => {
        const a = o.T[j], b = j < o.regions.length - 1 ? o.T[j + 1] : o.until, sw = F.px(5), clip = el('div', `left:${f1(o.box.x)}px;top:${f1(o.box.y)}px;width:${f1(o.box.w)}px;height:${f1(o.box.h)}px;overflow:hidden;pointer-events:none;z-index:25`, layer);
        const dim = el('div', `left:${f1(rg.x - o.box.x)}px;top:${f1(rg.y - o.box.y)}px;width:${f1(rg.w)}px;height:${f1(rg.h)}px;box-shadow:0 0 0 ${f1(W * 2)}px rgba(17,17,17,.42);opacity:0`, clip); dim.dataset.motion = 'skip';
        const ring = el('div', `left:${f1(rg.x - sw)}px;top:${f1(rg.y - sw)}px;width:${f1(rg.w + 2 * sw)}px;height:${f1(rg.h + 2 * sw)}px;box-shadow:inset 0 0 0 ${f1(sw)}px var(--sw-acc);display:none;z-index:26`, layer);
        F.add((t) => { set(dim, { opacity: String(Math.min(seg(t, a - 0.3, a), b < 1e8 ? 1 - seg(t, b - 0.25, b) : 1)) }); const on = t >= a - 0.35 && t < b; set(ring, { display: on ? '' : 'none' }); if (on) { const q = seg(t, a - 0.35, a, E.expoOut); set(ring, { clipPath: q < 1 ? `inset(0 ${f1((1 - q) * 100)}% 0 0)` : '' }); } });
        F.sfx(a - 0.2, 'mark', 0.35);
        return { x: rg.x + rg.w / 2, y: rg.y + rg.h / 2 };
      });
      infoKit(F, S, { ink: X.colors.ink, accent: A, colors: [A, X.colors.ink, '#5A5955'], font: X.body, display: X.font, weight: 500, line: F.px(3), outline: null, radius: 0, mark: A, cutSfx: 'snap', flashAt: 'corner',
        flashBg: (col) => `background:${col}`,
        // a giant cropped index numeral behind each cut, and the grid
        flashDecor: (bg, col, i, R) => { el('div', `inset:0;background-image:linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px);background-size:${f1(F.px(54))}px ${f1(F.px(54))}px`, bg); const g = el('div', `right:${f1(-R.w * 0.04)}px;top:${f1(-R.h * 0.22)}px;font:500 ${f1(R.h * 1.05)}px/1 ${X.font};letter-spacing:-0.06em;color:rgba(255,255,255,.16)`, bg); g.textContent = String(i + 1); } });
      return S;
    },
  });

  // ======================= Blueprint engineering drawing =======================
  P.kit.register('blueprint', {
    runtime: 'blueprint',
    theme: { bg: '#123F77', fg: '#F2F8FF', ink: '#F2F8FF', paper: '#123F77', accent: '#FF5D4D', muted: '#9CC3E8', fonts: { display: '"Saira Stencil One", "Noto Sans SC", sans-serif', serif: '"Saira Condensed", "Noto Sans SC", sans-serif', sans: '"Saira Condensed", "Noto Sans SC", sans-serif', script: '"Saira Condensed", "Noto Sans SC", sans-serif', mono: '"Saira Condensed", "Noto Sans SC", sans-serif' } },
    make(F, opt) {
      const B = P.blueprint(F, opt), W = F.W, H = F.H, PT = F.portrait, u = F.px(1), C2 = B.colors;
      const S = { lead: 0.5, push: 0.004, ink: C2.text, paper: C2.bg, colors: [C2.acc, '#9CC3E8', '#5E8FC7'], raw: B };
      // every scene is a sheet of its own (grid variant per scene); kit coordinates are frame px, the sheet's are design px
      const sheetOf = (layer) => layer._bp ?? (layer._bp = B.paper(layer, { variant: 0 }));
      const V = (layer) => sheetOf(layer).view, d = (x) => x / u;
      let n = 0;
      S.bg = (layer, o = {}) => { const P2 = B.paper(layer, { variant: o.variant ?? 0 }); layer._bp = P2; return { el: P2.box }; };
      // big word: stencil lettering plotted in, a heavy rule and a thin one drawn under it
      S.word = (layer, o) => { const sz = Math.min(o.size ?? (PT ? 150 : 180), d(o.maxW ?? W * 0.88) / Math.max(1, estUnits(o.text)) / 1.1);
        return B.title(V(layer), { x: d(o.x ?? W / 2), y: d(o.y ?? H * 0.45), text: o.text, size: sz, at: o.at, until: o.until, kind: o.kind ?? 'slam', w: Math.min(d(W * 0.9), estUnits(o.text) * sz * 1.08) }); };
      S.line = (layer, o) => B.label(V(layer), { x: d(o.x ?? W / 2), y: d(o.y ?? H * 0.68), text: o.text, size: Math.min(56, o.size ?? 46), maxW: d(o.maxW ?? W * 0.84), align: o.align ?? 'center', at: o.at, until: o.until, kind: o.kind ?? 'label', lh: 1.3 });
      // card: a drafted frame (construction first) with corner ticks; content goes in the returned element
      S.card = (layer, o) => {
        const x = d(o.x - o.w / 2), y = d(o.y - o.h / 2), w = d(o.w), h = d(o.h), Vl = V(layer);
        B.rect(Vl, { x, y, w, h, at: o.at - 0.1, dur: 0.5, until: o.until, cons: true });
        for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) B.centre(Vl, { x: cx, y: cy, r: 10, at: o.at - 0.2, dur: 0.2, until: o.until });
        const c = el('div', `left:${f1(o.x - o.w / 2)}px;top:${f1(o.y - o.h / 2)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;display:none;z-index:${o.z ?? 10}`, layer);
        F.add((t) => set(c, { display: t >= o.at - 0.1 && t < (o.until ?? 1e9) ? '' : 'none' }));
        return { el: c, w: o.w, h: o.h };
      };
      // screenshot: unaltered, revealed inside a drafted frame, with its overall width dimensioned along the top
      S.shot = (layer, o) => {
        const Vl = V(layer), x = d(o.x - o.w / 2), y = d(o.y - o.h / 2), w = d(o.w), h = d(o.h), a0 = o.at - 0.45, until = o.until ?? 1e9;
        const box = el('div', `left:${f1(o.x - o.w / 2)}px;top:${f1(o.y - o.h / 2)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;overflow:hidden;display:none;z-index:${o.z ?? 9};background:${o.fit === 'contain' ? 'transparent' : C2.bg}`, layer);
        const im = el('img', `left:0;top:0;width:100%;height:100%;object-fit:${o.fit === 'contain' ? 'contain' : 'cover'}`, box); im.src = o.src;
        F.add((t) => { const on = t >= a0 && t < until; set(box, { display: on ? '' : 'none' }); if (on) { const q = seg(t, a0, o.at, E.cubicInOut), qo = until < 1e8 ? seg(t, until - 0.3, until) : 0; set(box, { clipPath: q < 1 ? `inset(0 ${f1((1 - q) * 100)}% 0 0)` : '', opacity: qo ? String(1 - qo) : '' }); } });
        B.rect(Vl, { x, y, w, h, at: o.at - 0.2, dur: 0.5, until: o.until, pen: false });
        if (o.sfx !== false) F.sfx(a0, 'slide', 0.3);
        return { el: box, w: o.w, h: o.h, img: im, box: { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h } };
      };
      // signature move: the red pencil rings the word (the one correction on the sheet)
      S.accent = (layer, o) => { const r = d(F.px(o.size ?? 200)) * 0.9; B.pencil(V(layer), { kind: 'ring', x: d(o.x), y: d(o.y), r: Math.min(d(W * 0.42), r * 1.8), ry: r * 0.55, at: o.at + 0.1, until: o.until }); return {}; };
      // transition: a UV exposure bar sweeps the frame; the next sheet develops behind it (full cover at `cover`)
      let wl = null;
      S.wipe = (o) => {
        wl ??= F.layer('pointer-events:none', 90);
        const at = o.cover, dur = 0.7, bar = el('div', `top:0;left:0;width:${f1(W * 1.3)}px;height:100%;background:linear-gradient(90deg, transparent, rgba(225,240,255,.6) 18%, ${C2.bg} 32%, ${C2.bg} 68%, rgba(225,240,255,.6) 82%, transparent);display:none`, wl);
        bar.dataset.motion = 'skip';
        F.add((t) => { const on = t >= at - dur / 2 && t < at + dur / 2; set(bar, { display: on ? '' : 'none' }); if (on) set(bar, { transform: `translateX(${f1(-W * 1.3 + seg(t, at - dur / 2, at + dur / 2, E.sine) * W * 2.6)}px)` }); });
        F.sfx(at - dur / 2, 'expose', 0.4, { dur }); F.transition(at - dur / 2, at + dur / 2); F.cut(at);
        return { show: at, hide: at };
      };
      // end card: the name in stencil with its rules, the line, the url in a drafted box with a drawing number
      S.end = (layer, o) => {
        const Vl = V(layer), cx = d(W / 2), cy = d(H * (PT ? 0.36 : 0.4)), sz = Math.min(PT ? 130 : 160, d(W * 0.86) / Math.max(1, estUnits(o.title)) / 1.1);
        B.title(Vl, { x: cx, y: cy, text: o.title, size: sz, at: o.at + 0.6, kind: 'logo', w: Math.min(d(W * 0.9), estUnits(o.title) * sz * 1.08) });
        if (o.tagline) B.label(Vl, { x: cx, y: cy + sz * 1.3, text: o.tagline, size: PT ? 46 : 50, align: 'center', maxW: d(W * 0.84), at: o.at + 1.3, kind: 'endcard' });
        if (o.url) { const uy = cy + sz * 1.3 + (PT ? 130 : 110), uw = estUnits(o.url) * 44 + 60; B.rect(Vl, { x: cx - uw / 2, y: uy - 34, w: uw, h: 68, at: o.at + 1.7, dur: 0.5 }); B.label(Vl, { x: cx, y: uy, text: o.url, size: 44, align: 'center', at: o.at + 2.0, kind: 'endcard' }); }
        F.sfx(o.at + 2.1, 'stamp', 0.4);
      };
      // ---- Telling information (blueprint): steps are numbered balloons on a leader chain; contrast is two views split by a centre line; numbers are dimensioned bars; a spot on the UI is a detail circle ----
      S.steps = (layer, o) => {
        const { items, T, until, C: R } = o, k = items.length, Vl = V(layer), row = !PT && R.w > R.h, br = 30, sz = Math.max(30, Math.min(PT ? 40 : 44, d(row ? R.w / k : R.w) / 7));
        const pos = items.map((_, j) => lanePos(R, k, j, row)).map((p2) => [d(p2.x), d(p2.y)]);
        return items.map((it, j) => {
          const [x, y] = pos[j];
          if (j) { const [px, py] = pos[j - 1], dx = x - px, dy = y - py, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l; B.line(Vl, { a: [px + ux * (br + 6), py + uy * (br + 6)], b: [x - ux * (br + 6), y - uy * (br + 6)], kind: 'centre', at: T[j] - 0.15, dur: 0.35, until, pen: false }); }
          B.circle(Vl, { x, y, r: br, at: T[j] - 0.1, dur: 0.3, until, pen: false, color: it.hot ? 'acc' : undefined });
          B.label(Vl, { x, y, text: String(j + 1), size: 34, align: 'center', at: T[j], dur: 0.15, until, fact: false, font: 'stencil', color: it.hot ? 'acc' : 'text' });
          B.label(Vl, { x: row ? x : x + br + 20, y: row ? y + br + 20 + sz * 0.6 : y, text: it.text, size: sz, align: row ? 'center' : 'left', valign: 'middle', maxW: row ? d(R.w / k) * 0.92 : d(R.w) - br * 2 - 30, at: T[j] + 0.2, until, kind: 'label' });
          if (it.note) B.label(Vl, { x: row ? x : x + br + 20, y: row ? y + br + 20 + sz * 1.9 : y + sz * 1.1, text: it.note, size: sz * 0.62, color: 'mute', align: row ? 'center' : 'left', at: T[j] + 0.4, until, kind: 'label' });
          return { x: x * u, y: y * u };
        });
      };
      S.versus = (layer, o) => {
        const { cols, T, at2, until, C: R } = o, k = cols.length, Vl = V(layer), stack = R.w < R.h * 1.1;
        const cw = d(stack ? R.w : R.w / k), ch = d(stack ? R.h / k : R.h), x0 = d(R.x), y0 = d(R.y);
        return cols.map((c, j) => {
          const cx = stack ? x0 + cw / 2 : x0 + cw * (j + 0.5), top = stack ? y0 + ch * j : y0;
          if (j) B.line(Vl, stack ? { a: [x0, top], b: [x0 + cw, top], kind: 'centre', at: T[j] - 0.3, dur: 0.5, until, pen: false } : { a: [x0 + cw * j, y0], b: [x0 + cw * j, y0 + ch], kind: 'centre', at: T[j] - 0.3, dur: 0.5, until, pen: false });
          B.title(Vl, { x: cx, y: top + 54, text: c.title, size: PT ? 50 : 58, at: T[j], until, kind: 'label', w: Math.min(cw * 0.86, estUnits(c.title) * (PT ? 50 : 58) * 1.1) });
          (c.points || []).forEach((pt, r) => B.label(Vl, { x: cx - cw * 0.4, y: top + 150 + r * 62, text: '— ' + ptText(pt), size: PT ? 36 : 40, maxW: cw * 0.82, at: at2(j, r), until, kind: 'label' }));
          if (c.hot) B.pencil(Vl, { kind: 'tick', x: cx + Math.min(cw * 0.86, estUnits(c.title) * 58 * 1.1) / 2 + 30, y: top + 54, size: 30, at: T[j] + 0.5, until });
          return { x: cx * u, y: (top + ch / 2) * u };
        });
      };
      // figures: each value a drafted bar (hot ones hatched) with a dimension line above giving the value
      S.figures = (layer, o) => {
        const { data, ats, until, C: R } = o, k = data.length, Vl = V(layer), mx = Math.max(...data.map((x) => +x[1])), x0 = d(R.x) + d(R.w) * 0.22, wMax = d(R.w) * 0.7, gap = d(R.h) / k, bh = Math.min(46, gap * 0.38);
        return data.map((row, j) => {
          const y = d(R.y) + gap * (j + 0.55), w2 = Math.max(6, (wMax * +row[1]) / mx), hot = (o.hot || []).includes(j), t = ats[j];
          B.label(Vl, { x: x0 - 22, y: y + bh / 2, text: String(row[0]), size: 36, align: 'right', at: t, until, kind: 'label' });
          B.rect(Vl, { x: x0, y, w: w2, h: bh, at: t, dur: 0.45, until, pen: false });
          if (hot) B.hatch(Vl, { rect: { x: x0, y, w: w2, h: bh }, at: t + 0.4, dur: 0.4, until });
          const val = `${o.prefix ?? ''}${(+row[1]).toFixed(o.decimals ?? 0)}${o.unit ?? ''}`;
          B.dim(Vl, { a: [x0, y], b: [x0 + w2, y], off: -26, text: val, size: 32, at: t + 0.35, until });
          return { x: (x0 + w2 / 2) * u, y: y * u };
        });
      };
      S.spotlight = (layer, o) => o.regions.map((rg, j) => {
        const a = o.T[j], b = j < o.regions.length - 1 ? o.T[j + 1] : o.until, letter = String.fromCharCode(65 + j);
        const ring = `box-shadow:0 0 0 ${f1(F.px(3))}px ${C2.line}, 0 0 0 ${f1(F.px(9))}px ${alpha(C2.bg, 0.9)}`;
        const r = magnify(F, layer, { box: o.box, region: rg, at: a, until: b, zoom: 2.2, ring });
        B.circle(V(layer), { x: d(rg.x + rg.w / 2), y: d(rg.y + rg.h / 2), r: d(Math.max(rg.w, rg.h)) * 0.62, kind: 'thin', at: a - 0.15, dur: 0.35, until: b });
        B.label(V(layer), { x: d(rg.x + rg.w / 2 + Math.max(rg.w, rg.h) * 0.55), y: d(rg.y - 10), text: letter, size: 34, font: 'stencil', at: a, until: b, fact: false });
        return r ?? { x: rg.x + rg.w / 2, y: rg.y + rg.h / 2 };
      });
      infoKit(F, S, { ink: C2.text, accent: C2.acc, colors: [C2.acc, '#1C4F8C', '#0B2B55'], font: B.font.tech, display: B.font.stencil, weight: 400, line: F.px(2), outline: null, radius: 0, mark: C2.acc, cutSfx: 'stamp', flashAt: 'corner',
        flashBg: (col) => `background:${col}`,
        // the cell is a sheet of its own: a fine grid and a drawing number in the corner
        flashDecor: (bg, col, i, R) => { el('div', `inset:0;background-image:linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px);background-size:${f1(F.px(40))}px ${f1(F.px(40))}px`, bg); const g = el('div', `right:${f1(R.w * 0.04)}px;top:${f1(R.h * 0.05)}px;font:400 ${f1(F.px(28))}px/1 ${B.font.stencil};letter-spacing:.1em;color:rgba(255,255,255,.5)`, bg); g.textContent = `SHEET ${i + 1}`; } });
      return S;
    },
  });

  // ======================= Paper-collage explainer =======================
  P.kit.register('collage', {
    runtime: 'collage',
    theme: { bg: '#e7dfc9', fg: '#1d1b18', ink: '#1d1b18', paper: '#f2ede1', accent: '#b3282d', muted: '#6b665c', fonts: { display: '"Noto Serif SC", serif', serif: '"Noto Serif SC", serif', sans: '"Noto Sans SC", sans-serif', script: '"Noto Serif SC", serif', mono: '"Courier Prime", monospace' } },
    make(F, opt) {
      const C = P.collage(F, { ...opt, flat: true }), W = F.W, H = F.H, PT = F.portrait, g = C.g(1), C2 = C.colors, d = (v) => v / g, fz = (sz) => F.px(sz) / g;   // d: frame px → table units; fz: a kit font size (1080p design px) → table units
      const S = { lead: 0.35, push: 0.006, ink: C2.ink, paper: C2.paper, colors: [C2.red, C2.blue, C2.green, C2.ink], raw: C };
      const BEDS = ['news', 'ledger', 'graph', 'news'];
      // background: the paper table with a few faded torn blocks and dot panels round the edges (no words: words on paper must be real copy); variant changes the ground
      S.bg = (layer, o = {}) => {
        const v = (o.variant ?? 0) % 4, ground = v === 1 ? '#e8d5cb' : C2.table;
        layer.style.backgroundColor = ground; layer.style.backgroundImage = v === 2 ? `linear-gradient(rgba(90,130,120,.16) 1px, transparent 1px),linear-gradient(90deg, rgba(90,130,120,.16) 1px, transparent 1px),url(${C.tex('table')})` : `url(${C.tex('table')})`; layer.style.backgroundSize = v === 2 ? `${g * 60}px ${g * 60}px,${g * 60}px ${g * 60}px,${g * 240}px` : `${g * 240}px`;
        const r = window.EV.rng(31 + v * 17), n = PT ? 6 : 8;
        for (let i = 0; i < n; i++) { const edge = i % 4, pw = 220 + r() * 300, ph = 260 + r() * 300, fx = d(W), fy = 1000; const x = edge === 0 ? -pw * 0.55 : edge === 1 ? fx - pw * 0.45 : r() * fx - pw / 2, y = edge === 2 ? -ph * 0.6 : edge === 3 ? fy - ph * 0.4 : r() * fy - ph / 2; C.poster({ layer, x, y, w: pw, h: ph, rot: (r() - 0.5) * 12, dots: r() < 0.5 ? { x: r() * 0.4, y: r() * 0.4 } : null, seed: 400 + v * 31 + i, at: 0, enter: 'none', wash: 0.5 }); }
        return { el: layer };
      };
      // big word: a heavy serif printed onto the table (pressed in with a little ink spread)
      S.word = (layer, o) => { const size = Math.min(fz(o.size ?? (PT ? 150 : 200)), d(o.maxW ?? W * 0.86) / Math.max(1, estUnits(o.text)) / 1.02), w = estUnits(o.text) * size * 1.02;
        return C.big(o.text, { layer, x: d(o.x ?? W / 2) - w / 2, y: d(o.y ?? H * 0.42) - size * 0.56, size, at: o.at - 0.1, until: o.until, color: (o.variant ?? 0) % 2 ? C2.ink : C2.red, rot: 0 }); };
      // a sentence: typed on a torn strip of white paper (wraps; the strip grows to fit)
      const strip = (layer, o, size) => {
        const maxW = d(o.maxW ?? W * (PT ? 0.86 : 0.72)), wu = estUnits(o.text) * size * 1.06, rows = Math.max(1, Math.ceil(wu / (maxW - 90))), w = Math.min(maxW, wu + 90), h = rows * size * 1.5 + 50;
        const cx = d(o.x ?? W / 2), x = o.align === 'left' ? cx : cx - w / 2, y = d(o.y ?? H * 0.68) - h / 2;
        const pc = C.piece({ layer, x, y, w, h, paper: 'white', torn: 'lr', at: o.at - S.lead, until: o.until, enter: 'slap', rot: (o.rot ?? -1), depth: 'top' });
        const box = el('div', `inset:0;padding:0 ${f1(g * 40)}px;display:flex;align-items:center;justify-content:${o.align === 'left' ? 'flex-start' : 'center'}`, pc.face), e = document.createElement('div'); box.appendChild(e);
        e.style.cssText = `font:700 ${f1(g * size)}px/1.5 ${C.fonts.serif};color:${C2.ink};text-align:${o.align === 'left' ? 'left' : 'center'}`; e.textContent = o.text; C.textOf(pc, e, o.kind ?? 'label', o.text);
        return pc;
      };
      S.line = (layer, o) => strip(layer, o, fz(Math.min(56, o.size ?? 46)));
      // card: a torn white sheet taped down; content goes in the returned element (frame px from its top-left)
      S.card = (layer, o) => {
        const pc = C.piece({ layer, x: d(o.x - o.w / 2), y: d(o.y - o.h / 2), w: d(o.w), h: d(o.h), paper: 'white', torn: 'tb', tape: ['tl', 'tr'], at: o.at - S.lead, until: o.until, enter: 'drop', rot: 0, z: o.z });
        const c = el('div', 'inset:0', pc.face);
        return { el: c, w: o.w, h: o.h };
      };
      // screenshot: printed as it is (never halftoned) on photo paper with a white border, taped at the top
      S.shot = (layer, o) => {
        const fit = o.fit === 'contain', bw = fit ? 0 : 14;
        const pc = C.piece({ layer, x: d(o.x - o.w / 2) - bw, y: d(o.y - o.h / 2) - bw, w: d(o.w) + bw * 2, h: d(o.h) + bw * 2, paper: fit ? null : 'white', torn: '', tape: fit ? [] : ['t'], at: o.at - S.lead, until: o.until, enter: 'drop', rot: 0, z: o.z ?? 9, shadow: !fit });
        const box = el('div', `left:${f1(g * bw)}px;top:${f1(g * bw)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;overflow:hidden`, pc.face);
        const im = el('img', `left:0;top:0;width:100%;height:100%;object-fit:${fit ? 'contain' : 'cover'}`, box); im.src = o.src;
        return { el: box, w: o.w, h: o.h, img: im, box: { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h } };
      };
      // signature move: a red rubber-stamp ring pressed round the spot (worn ink, at an angle)
      S.accent = (layer, o) => {
        const r = d(F.px(o.size ?? 200)) * 0.95, at = o.at + 0.05;
        const pc = C.piece({ layer, x: d(o.x) - r * 1.25, y: d(o.y) - r * 0.75, w: r * 2.5, h: r * 1.5, paper: null, torn: '', at, until: o.until, enter: 'none', rot: -6, depth: 'top' });
        const ring = el('div', `inset:0;border:${f1(g * 9)}px solid ${C2.red};border-radius:50%;opacity:.85;mix-blend-mode:multiply`, pc.face);
        F.add((t) => { const q = E.quartOut(seg(t, at, at + 0.14)); set(ring, { transform: `scale(${(1.35 - 0.35 * q).toFixed(3)})`, opacity: (0.85 * Math.min(1, q * 2.5)).toFixed(3) }); });
        F.sfx(at + 0.1, 'stamp', 0.6);
        return {};
      };
      // transition: a big torn sheet of paper slides across the frame and covers it; the next scene is under it when it slides off
      let wl = null;
      S.wipe = (o) => {
        wl ??= F.layer('pointer-events:none', 90);
        const at = o.cover, dur = 0.8, sheet = el('div', `top:${f1(-H * 0.1)}px;left:0;width:${f1(W * 1.25)}px;height:${f1(H * 1.2)}px;background-color:${C2.paper};background-image:url(${C.tex('white')});background-size:${f1(g * 240)}px;filter:drop-shadow(${f1(g * -12)}px 0 ${f1(g * 14)}px rgba(50,32,14,.35));display:none`, wl);
        sheet.style.clipPath = `polygon(${Array.from({ length: 41 }, (_, i) => `${(3 + 3 * Math.sin(i * 1.7) + 2 * Math.sin(i * 4.1)).toFixed(2)}% ${(i * 2.5).toFixed(1)}%`).join(',')},100% 100%,100% 0%)`;
        sheet.dataset.motion = 'skip';
        F.add((t) => { const on = t >= at - dur / 2 && t < at + dur / 2; set(sheet, { display: on ? '' : 'none' }); if (on) set(sheet, { transform: `translateX(${f1(W * 1.05 - seg(t, at - dur / 2, at + dur / 2, E.cubicInOut) * W * 2.4)}px) rotate(-2deg)` }); });
        F.sfx(at - dur / 2, 'slide', 0.5, { dur }); F.transition(at - dur / 2, at + dur / 2); F.cut(at);
        return { show: at, hide: at };
      };
      // end card: the name printed big, the line on a torn strip, the url typed on a ticket, a stamp
      S.end = (layer, o) => {
        const cy = H * (PT ? 0.36 : 0.38), size = Math.min(fz(PT ? 130 : 170), d(W * 0.84) / Math.max(1, estUnits(o.title)) / 1.02), w = estUnits(o.title) * size * 1.02;
        C.big(o.title, { layer, x: d(W / 2) - w / 2, y: d(cy) - size * 0.56, size, at: o.at + 0.5, color: C2.ink, rot: 0, kind: 'logo', fact: false });
        if (o.tagline) strip(layer, { text: o.tagline, at: o.at + 1.2, x: W / 2, y: cy + size * g * 0.95, kind: 'endcard' }, fz(PT ? 40 : 46));
        if (o.url) { const us = fz(48), uw = estUnits(o.url) * us + 60, pc = C.piece({ layer, x: d(W / 2) - uw / 2, y: d(cy) + size * 1.7, w: uw, h: us * 1.9, paper: 'white', torn: 'lr', at: o.at + 1.7, enter: 'slap', rot: 1.5, depth: 'top' }); const e = el('div', `left:0;right:0;top:${f1(g * us * 0.35)}px;text-align:center;font:700 ${f1(g * us)}px/1.2 ${C.fonts.type};color:${C2.ink}`, pc.face); e.textContent = o.url; C.textOf(pc, e, 'endcard', o.url, { fact: false }); }
        F.sfx(o.at + 2.1, 'stamp', 0.45);
      };
      // ---- Telling information (collage): steps are tickets pinned along a red thread; contrast is two torn sheets, the winner ringed; numbers are paper strips on notebook paper; a spot on the UI is a lens with a red ring ----
      S.steps = (layer, o) => {
        const { items, T, until, C: R } = o, k = items.length, row = !PT && R.w > R.h, sz = Math.max(fz(30), Math.min(fz(PT ? 40 : 44), d(row ? R.w / k : R.w) / 7));
        const pos = items.map((_, j) => lanePos(R, k, j, row)).map((p2) => [d(p2.x), d(p2.y)]);
        const thr = document.createElementNS(NS, 'svg'); thr.setAttribute('viewBox', `0 0 ${d(W)} 1000`); thr.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:visible;z-index:2;pointer-events:none`; layer.appendChild(thr);
        return items.map((it, j) => {
          const [x, y] = pos[j], t0 = T[j];
          if (j) { const [px, py] = pos[j - 1], ln = document.createElementNS(NS, 'path'); ln.setAttribute('d', `M${px},${py} Q${(px + x) / 2},${(py + y) / 2 + 30} ${x},${y}`); ln.setAttribute('stroke', C2.red); ln.setAttribute('stroke-width', 3.5); ln.setAttribute('fill', 'none'); thr.appendChild(ln); const L2 = Math.hypot(x - px, y - py) * 1.1; ln.setAttribute('stroke-dasharray', L2); F.add((t) => { ln.setAttribute('stroke-dashoffset', (L2 * (1 - seg(t, t0 - 0.4, t0, E.sine))).toFixed(1)); set(thr, { display: t < (until ?? 1e9) ? '' : 'none' }); }); F.sfx(t0 - 0.4, 'string', 0.3, { dur: 0.4 }); }
          const tk = C.piece({ layer, x: x - 46, y: y - 46, w: 92, h: 92, paper: it.hot ? 'red' : 'white', torn: 'tb', at: t0 - 0.15, until, enter: 'slap', rot: j % 2 ? 4 : -4, depth: 'top' });
          const num = el('div', `left:0;right:0;top:${f1(g * 14)}px;text-align:center;font:400 ${f1(g * 54)}px/1.1 ${C.fonts.old};color:${it.hot ? '#f4efe2' : C2.ink}`, tk.face); num.textContent = String(j + 1); C.textOf(tk, num, 'label', String(j + 1), { fact: false });
          const lw = row ? d(R.w / k) * 0.92 : d(R.w) - 140, lx = row ? x - lw / 2 : x + 70, ly = row ? y + 70 : y - sz * 0.75;
          const lb = C.piece({ layer, x: lx, y: ly, w: lw, h: sz * 1.5 + (it.note ? sz * 1.1 : 0) + 20, paper: null, torn: '', at: t0 + 0.15, until, enter: 'fade', rot: 0 });
          const e = el('div', `left:0;right:0;top:${f1(g * 8)}px;font:700 ${f1(g * sz)}px/1.3 ${C.fonts.serif};color:${C2.ink};text-align:${row ? 'center' : 'left'}`, lb.face); e.textContent = it.text; C.textOf(lb, e, 'label', it.text);
          if (it.note) { const nn = el('div', `left:0;right:0;top:${f1(g * (sz * 1.45 + 8))}px;font:500 ${f1(g * sz * 0.62)}px/1.3 ${C.fonts.sans};color:#5a554c;text-align:${row ? 'center' : 'left'}`, lb.face); nn.textContent = it.note; C.textOf(lb, nn, 'label', it.note); }
          return { x: x * g, y: y * g };
        });
      };
      S.versus = (layer, o) => {
        const { cols, T, at2, until, C: R } = o, k = cols.length, stack = R.w < R.h * 1.1, gap = 30;
        const cw = d(stack ? R.w : (R.w - gap * (k - 1)) / k), ch = d(stack ? (R.h - gap * (k - 1)) / k : R.h), x0 = d(R.x), y0 = d(R.y);
        return cols.map((c, j) => {
          const x = stack ? x0 : x0 + j * (cw + d(gap)), y = stack ? y0 + j * (ch + d(gap)) : y0;
          const pc = C.piece({ layer, x, y, w: cw, h: ch, paper: j % 2 ? 'news' : 'white', torn: 'all', tape: ['t'], at: T[j] - 0.3, until, enter: 'drop', rot: j % 2 ? 1.5 : -1.5 });
          const ts = fz(PT ? 50 : 58), tt = el('div', `left:${f1(g * 30)}px;right:${f1(g * 30)}px;top:${f1(g * 28)}px;font:900 ${f1(g * ts)}px/1.2 ${C.fonts.serif};color:${C2.ink}`, pc.face), tsp = document.createElement('span'); tsp.textContent = c.title; tt.appendChild(tsp); C.textOf(pc, tt, 'label', c.title);
          (c.points || []).forEach((pt, r) => { const pa = at2(j, r), e = el('div', `left:${f1(g * 34)}px;right:${f1(g * 30)}px;top:${f1(g * (ts * 1.6 + 40 + r * fz(PT ? 54 : 60)))}px;font:500 ${f1(g * fz(PT ? 34 : 38))}px/1.35 ${C.fonts.sans};color:#2f2b26`, pc.face); e.textContent = '— ' + ptText(pt); C.textOf(pc, e, 'label', ptText(pt), { at: pa }); F.add((t) => set(e, { opacity: seg(t, pa, pa + 0.3).toFixed(3) })); F.sfx(pa, 'key', 0.25); });
          if (c.hot) C.ring(C.target(pc, tsp), { at: T[j] + 0.6, until, pad: 0.12 });
          return { x: (x + cw / 2) * g, y: (y + ch / 2) * g };
        });
      };
      S.figures = (layer, o) => {
        const { data, ats, until, C: R } = o, k = data.length, bw = d(R.w) - 230 - 260, rh = Math.min(110, d(R.h) / (k + 0.6));
        const pc = C.bars({ layer, x: d(R.x), y: d(R.y), w: d(R.w), h: rh * k + 80, barW: Math.max(120, bw), rowH: rh, rot: -1, at: ats[0] - 0.4, until, enter: 'drop', torn: 'tb', unit: o.unit ?? '', labelSize: Math.min(44, rh * 0.42), valueSize: Math.min(40, rh * 0.38),
          rows: data.map((row, j) => ({ label: String(row[0]), value: +row[1], text: `${o.prefix ?? ''}${(+row[1]).toFixed(o.decimals ?? 0)}${o.unit ?? ''}`, color: (o.hot || []).includes(j) ? 'red' : 'green', at: ats[j] })) });
        return data.map((_, j) => ({ x: R.x + R.w * 0.5, y: (pc.y + 70 + j * rh) * g }));
      };
      S.spotlight = (layer, o) => o.regions.map((rg, j) => {
        const a = o.T[j], b = j < o.regions.length - 1 ? o.T[j + 1] : o.until;
        const ring = `box-shadow:0 0 0 ${f1(F.px(10))}px ${C2.paper}, 0 0 0 ${f1(F.px(16))}px ${C2.red}, ${f1(F.px(6))}px ${f1(F.px(10))}px ${f1(F.px(18))}px rgba(50,32,14,.45)`;
        return magnify(F, layer, { src: o.src, box: o.box, region: rg, at: a, until: b, zoom: 2.2, ring, z: 30 }) ?? { x: rg.x + rg.w / 2, y: rg.y + rg.h / 2 };
      });
      infoKit(F, S, { ink: C2.ink, accent: C2.red, colors: [C2.red, C2.blue, C2.green, '#d9c58e'], font: C.fonts.serif, display: C.fonts.serif, weight: 900, line: F.px(3), outline: null, radius: 0, mark: C2.mark, cutSfx: 'slap', flashAt: 'corner',
        flashBg: (col) => `background-color:${col};background-image:url(${C.tex('table')});background-blend-mode:multiply;background-size:${f1(g * 240)}px` });
      return S;
    },
  });

  // ======================= Flat grain illustration =======================
  P.kit.register('grain', {
    runtime: 'grain',
    theme: { bg: '#f7f3e9', fg: '#1b2b55', ink: '#1b2b55', paper: '#f7f3e9', accent: '#ef6a5e', muted: '#5470b4', fonts: { display: '"Inter", "Noto Sans SC", sans-serif', serif: '"Inter", "Noto Sans SC", sans-serif', sans: '"Inter", "Noto Sans SC", sans-serif', script: '"Inter", "Noto Sans SC", sans-serif', mono: '"Inter", monospace' } },
    make(F, opt) {
      const G = P.grain(F, { ...opt, flat: true }), W = F.W, H = F.H, PT = F.portrait, u = F.px(1), C2 = G.colors, gy = H * (PT ? 0.74 : 0.8);
      const S = { lead: 0.45, push: 0.006, ink: C2.b0, paper: C2.paper, colors: [C2.a, C2.b, C2.a2, C2.b2], raw: G };
      const night = new Set();
      const inkOn = (layer) => (night.has(layer) ? 'paper' : 'b0');
      // background: paper (variant: paper / blush / night / pale sky) with a ground line low in the frame, a hill and a sun or moon at the edges (no words)
      S.bg = (layer, o = {}) => G.into(layer, () => {
        const v = (o.variant ?? 0) % 4, ground = v === 1 ? C2.a3 : v === 2 ? C2.b0 : v === 3 ? C2.b3 : C2.paper; layer.style.background = ground; if (v === 2) night.add(layer);
        G.line({ pts: [[0, gy], [W, gy]], stroke: v === 2 ? 'a2' : 'a', w: 3 * u, cap: 'butt' });
        G.hill({ x: W * (v % 2 ? 0.86 : 0.14), y: gy, w: 460 * u, h: 120 * u, tone: v === 2 ? 'b' : 'a2' });
        G.circle({ x: W * (v % 2 ? 0.07 : 0.93), y: H * (PT ? 0.05 : 0.09), r: 52 * u, fill: v === 2 ? 'paper' : 'a2', shade: 'fade', z: -4 });
        return { el: layer };
      });
      // big word: heavy grotesk standing on a coral bar that stipples in under it
      S.word = (layer, o) => G.into(layer, () => {
        const sz = Math.min(F.px(o.size ?? (PT ? 150 : 190)), (o.maxW ?? W * 0.86) / Math.max(1, estUnits(o.text)) / 1.02), x = o.x ?? W / 2, y = o.y ?? H * 0.42, tw = estUnits(o.text) * sz;
        G.rect({ x: x - tw * 0.52, y: y + sz * 0.58, w: tw * 1.04, h: Math.max(6 * u, sz * 0.09), fill: (o.variant ?? 0) % 2 ? 'b' : 'a', at: o.at, until: o.until, enter: 'wipe', dir: 'right', inDur: 0.5, sfx: false });
        return G.text(o.text, { x, y, size: sz, tone: inkOn(layer), weight: 900, at: o.at, until: o.until, enter: 'rise', kind: o.kind ?? 'slam', sfx: o.sfx === false ? undefined : 'rise' });
      });
      // a sentence: medium weight, wraps inside maxW
      S.line = (layer, o) => G.into(layer, () => { const sz = F.px(Math.min(56, o.size ?? 46)), mw = o.maxW ?? W * (PT ? 0.86 : 0.72), x = o.x ?? W / 2, al = o.align ?? 'center'; return G.text(o.text, { x: al === 'left' ? x : x, y: o.y ?? H * 0.66, size: sz, tone: inkOn(layer), weight: 700, at: o.at, until: o.until, enter: 'rise', align: al, wrap: estUnits(o.text) * sz > mw ? mw : null, kind: o.kind ?? 'label' }); });
      // card: a pale panel lit from the top with grain (no outline); content goes in the returned element
      S.card = (layer, o) => G.into(layer, () => {
        G.rect({ x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h, r: 10 * u, fill: night.has(layer) ? 'b' : 'white', shade: [{ c: night.has(layer) ? 'b2' : 'a3', d: [0.7, 0], dir: 90, s: [0, 0.55] }], at: o.at - S.lead, until: o.until, enter: 'rise', z: o.z ?? 2 });
        const c = el('div', `left:${f1(o.x - o.w / 2)}px;top:${f1(o.y - o.h / 2)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;z-index:3`, layer); win(F, c, o.at - 0.1, o.until ?? 1e9);
        return { el: c, w: o.w, h: o.h };
      });
      // screenshot: unaltered, in a navy frame that rises from the ground line; the picture wipes up inside it
      S.shot = (layer, o) => G.into(layer, () => {
        const fit = o.fit === 'contain', bw = fit ? 0 : 12 * u;
        if (!fit) G.rect({ x: o.x - o.w / 2 - bw, y: o.y - o.h / 2 - bw, w: o.w + bw * 2, h: o.h + bw * 2, r: 8 * u, fill: 'b', shade: 'top', amount: 0.4, at: o.at - S.lead, until: o.until, enter: 'rise', z: o.z ?? 2 });
        const box = el('div', `left:${f1(o.x - o.w / 2)}px;top:${f1(o.y - o.h / 2)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;overflow:hidden;z-index:3;border-radius:${f1(4 * u)}px`, layer);
        const im = el('img', `left:0;top:0;width:100%;height:100%;object-fit:${fit ? 'contain' : 'cover'}`, box); im.src = o.src;
        const a = o.at - S.lead + 0.1, until = o.until ?? 1e9;
        F.add((t) => { const on = t >= a && t < until; set(box, { display: on ? '' : 'none' }); if (on) set(box, { clipPath: `inset(${f1((1 - E.cubicInOut(seg(t, a, a + 0.5))) * 100)}% 0 0 0)`, opacity: String(Math.min(1, 1 - seg(t, until - 0.25, until))) }); });
        return { el: box, w: o.w, h: o.h, img: im, box: { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h } };
      });
      // signature move: a circular close-up ring pops round the spot, a stipple halo behind it
      S.accent = (layer, o) => G.into(layer, () => {
        const r = F.px(o.size ?? 200) * 0.6, until = o.until ?? o.at + 1.8;
        G.glow({ x: o.x, y: o.y, r: r * 1.5, tone: night.has(layer) ? 'b2' : 'a3', d: 0.8, core: 0.3, at: o.at, until, z: -1, sfx: false });
        G.circle({ x: o.x, y: o.y, r, fill: null, stroke: 'a', w: 8 * u, at: o.at, until, enter: 'pop', z: 6, sfx: false });
        F.sfx(o.at - 0.2, 'pop', 0.5);
        return {};
      });
      // transition: an iris — a coral disc opens from low in the frame (a sun rising) and covers it, then stipples away onto the next scene
      let wl = null;
      S.wipe = (o) => {
        wl ??= F.layer('pointer-events:none', 90);
        const at = o.cover, d = 0.75, R = Math.hypot(W, H) * 0.62, cx = W * ((o.index ?? 0) % 2 ? 0.7 : 0.3), cy = H * 0.85;
        G.into(wl, () => { const c = G.circle({ x: cx, y: cy, r: 1, fill: (o.index ?? 0) % 2 ? 'b' : 'a', shade: 'glow', at: at - d, until: at + d * 0.8, enter: 'none', exit: 'grain', sfx: false, lintOk: true }); c.outDur = d * 0.8; c.to(at - d, { r: R }, d, E.cubicInOut); });
        F.sfx(at - d, 'iris', 0.5, { dur: d }); F.transition(at - d, at + d * 0.8); F.cut(at);
        return { show: at, hide: at };
      };
      // end card: the name big over the ground line, the line under it, the url on a navy sign with a coral strip
      S.end = (layer, o) => G.into(layer, () => {
        const cy = H * (PT ? 0.36 : 0.36), sz = Math.min(F.px(PT ? 120 : 160), (W * 0.84) / Math.max(1, estUnits(o.title)) / 1.02);
        G.line({ pts: [[0, gy], [W, gy]], stroke: 'a', w: 3 * u, cap: 'butt' });
        G.text(o.title, { x: W / 2, y: cy, size: sz, tone: inkOn(layer), weight: 900, at: o.at + 0.5, enter: 'rise', kind: 'logo', noFact: true });
        if (o.tagline) G.text(o.tagline, { x: W / 2, y: cy + sz * 0.95, size: F.px(PT ? 40 : 44), tone: night.has(layer) ? 'b3' : 'b', weight: 700, at: o.at + 1.2, enter: 'rise', kind: 'endcard', wrap: estUnits(o.tagline) * F.px(44) > W * 0.84 ? W * 0.84 : null });
        if (o.url) { const us = F.px(PT ? 44 : 46), uw = estUnits(o.url) * us + 60 * u, sy = cy + sz * 0.95 + F.px(150); G.group({ x: W / 2 - uw / 2, y: sy - us, at: o.at + 1.7, enter: 'rise' }).add((g) => { g.rect({ x: 0, y: 0, w: uw, h: us * 2, fill: 'b', shade: 'top', amount: 0.4 }); g.rect({ x: 0, y: 0, w: uw, h: us * 0.3, fill: 'a' }); g.rect({ x: uw / 2 - 4 * u, y: us * 2, w: 8 * u, h: Math.max(0, gy - sy - us), fill: 'b' }); }); G.text(o.url, { x: W / 2, y: sy + us * 0.08, size: us, tone: 'paper', weight: 800, at: o.at + 1.9, enter: 'grain', kind: 'endcard' }); }
        F.sfx(o.at + 2.1, 'chime', 0.45);
      });
      // ---- Telling information (grain): steps are little buildings rising along a road, each with its number on a sign; contrast is a day scene and a night scene side by side; numbers are columns rising from the ground line; a spot on the UI is a circular close-up ----
      S.steps = (layer, o) => G.into(layer, () => {
        const { items, T, until, C: R } = o, k = items.length, row = !PT && R.w > R.h;
        const pos = items.map((_, j) => lanePos(R, k, j, row));
        return items.map((it, j) => {
          const p2 = pos[j], t0 = T[j], bw = Math.min(row ? R.w / k * 0.4 : 120 * u, 150 * u), bh = bw * 1.1, base = row ? p2.y + bh * 0.4 : p2.y + bh * 0.5, bx = row ? p2.x - bw / 2 : R.x + 10 * u;
          if (j) { const q = pos[j - 1]; G.line({ pts: row ? [[q.x + bw * 0.6, base], [p2.x - bw * 0.6, base]] : [[bx + bw / 2, q.y + bh * 0.5 + 6 * u], [bx + bw / 2, base - bh - 6 * u]], stroke: 'a2', w: 5 * u, dash: [10 * u, 10 * u], at: t0 - 0.2, until, enter: 'draw', sfx: false }); }
          G.building({ x: bx, y: base, w: bw, h: bh, tone: it.hot ? 'a' : j % 2 ? 'a2' : 'b2', roofTone: 'b', roof: j % 2 ? 'gable' : 'flat', windows: { cols: 2, rows: 1 }, door: false, at: t0 - 0.1, until, enter: 'rise', sfx: j === 0 });
          G.text(String(j + 1), { x: bx + bw / 2, y: base - bh * 0.45, size: bw * 0.42, tone: 'paper', weight: 900, at: t0, until, enter: 'grain', noFact: true });
          const ts = F.px(Math.min(PT ? 40 : 42, row ? 40 : 44)), tx = row ? p2.x : bx + bw + 30 * u, ty = row ? base + ts * 1.1 : base - bh * 0.55;
          G.text(it.text, { x: tx, y: ty, size: ts, tone: inkOn(layer), weight: 800, at: t0 + 0.15, until, enter: 'rise', align: row ? 'center' : 'left', wrap: row ? R.w / k * 0.92 : null });
          if (it.note) G.text(it.note, { x: tx, y: ty + ts * 1.25, size: ts * 0.62, tone: 'b2', weight: 600, at: t0 + 0.3, until, enter: 'grain', align: row ? 'center' : 'left', wrap: row ? R.w / k * 0.92 : null });
          return { x: row ? p2.x : bx + bw / 2, y: base - bh / 2 };
        });
      });
      S.versus = (layer, o) => G.into(layer, () => {
        const { cols, T, at2, until, C: R } = o, k = cols.length, stack = R.w < R.h * 1.1, gap = 24 * u;
        const cw = stack ? R.w : (R.w - gap * (k - 1)) / k, ch = stack ? (R.h - gap * (k - 1)) / k : R.h;
        return cols.map((c, j) => {
          const x = stack ? R.x : R.x + j * (cw + gap), y = stack ? R.y + j * (ch + gap) : R.y, dark = j % 2 === 1;
          G.rect({ x, y, w: cw, h: ch, r: 10 * u, fill: dark ? 'b' : 'a3', shade: [{ c: dark ? 'b2' : 'white', d: [0, 0.8], dir: 90, s: [0.5, 1] }], at: T[j] - 0.35, until, enter: 'rise', z: 1 });
          if (c.hot) G.glow({ x: x + cw * 0.82, y: y + ch * 0.2, r: Math.min(cw, ch) * 0.3, tone: dark ? 'a2' : 'a', d: 0.9, core: 0.3, at: T[j] + 0.4, until, z: 2, sfx: false });
          const ts = F.px(PT ? 50 : 56);
          G.text(c.title, { x: x + 34 * u, y: y + 30 * u + ts * 0.6, size: ts, tone: dark ? 'paper' : 'b0', weight: 900, at: T[j], until, enter: 'rise', align: 'left' });
          (c.points || []).forEach((pt, r) => G.text('— ' + ptText(pt), { x: x + 36 * u, y: y + ts * 1.6 + 60 * u + r * F.px(PT ? 54 : 60), size: F.px(PT ? 34 : 38), tone: dark ? 'b3' : 'b', weight: 600, at: at2(j, r), until, enter: 'grain', align: 'left', fact: ptText(pt), wrap: cw - 70 * u }));
          return { x: x + cw / 2, y: y + ch / 2 };
        });
      });
      S.figures = (layer, o) => G.into(layer, () => {
        const { data, ats, until, C: R } = o, k = data.length, onGround = gy > R.y + R.h * 0.5 && gy < R.y + R.h + F.px(60), base = onGround ? gy : R.y + R.h * 0.86, hot = o.hot || [];   // columns stand on the scene's ground line when it runs through the area
        const b = G.bars({ x: R.x + R.w * 0.08, y: base, w: R.w * 0.84, h: (base - R.y) * 0.78, gap: 0.5, valueSize: F.px(PT ? 40 : 44), labelSize: F.px(PT ? 30 : 32), unit: o.unit ?? '', prefix: o.prefix ?? '', decimals: o.decimals, until, items: data.map((d, j) => ({ label: String(d[0]), value: +d[1], hot: hot.includes(j), tone: hot.includes(j) ? 'a' : j % 2 ? 'b2' : 'b', at: ats[j] })) });
        if (!onGround) G.line({ pts: [[R.x, base], [R.x + R.w, base]], stroke: 'a', w: 3 * u, cap: 'butt', at: ats[0] - 0.6, until, enter: 'draw', sfx: false });
        return b.items.map((it) => { const bx = G.box(it.col, 1e9); return { x: bx.x + bx.w / 2, y: bx.y }; });
      });
      S.spotlight = (layer, o) => o.regions.map((rg, j) => {
        const a = o.T[j], b = j < o.regions.length - 1 ? o.T[j + 1] : o.until;
        const ring = `box-shadow:0 0 0 ${f1(F.px(9))}px ${C2.b2}, 0 0 0 ${f1(F.px(15))}px ${C2.a3}`;
        return magnify(F, layer, { src: o.src, box: o.box, region: rg, at: a, until: b, zoom: 2.2, ring, z: 30 }) ?? { x: rg.x + rg.w / 2, y: rg.y + rg.h / 2 };
      });
      infoKit(F, S, { ink: C2.b0, accent: C2.a, colors: [C2.a, C2.b, C2.a2, C2.b2], font: G.fonts.sans, display: G.fonts.sans, weight: 900, line: F.px(3), outline: null, radius: 0, mark: C2.a, cutSfx: 'pop', flashAt: 'corner',
        flashBg: (col) => `background-color:${col}`,
        flashDecor: (bg, col, i, R) => { const c = document.createElement('canvas'); c.width = Math.round(R.w); c.height = Math.round(R.h); c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'; bg.appendChild(c); const x = c.getContext('2d'), r = Math.max(R.w, R.h) * 0.6; G.stipple(x, [0, 0, R.w, R.h], { c: mix(col, '#ffffff', 0.35), d: [0.85, 0], dir: 'radial', s: [0, 1], at: [i % 2 ? 0.8 : 0.2, 0.25], r }); } });
      return S;
    },
  });

  // ======================= Hand-drawn storybook mascot =======================
  P.kit.register('storybook', {
    runtime: 'storybook',
    theme: { bg: '#e9e6df', fg: '#2b2521', ink: '#2b2521', paper: '#e9e6df', accent: '#2f8d89', muted: '#a19a8e', fonts: { display: '"LXGW WenKai", serif', serif: '"LXGW WenKai", serif', sans: '"LXGW WenKai", "Noto Sans SC", sans-serif', script: '"LXGW WenKai", serif', mono: '"LXGW WenKai Mono", monospace' } },
    make(F, opt) {
      // flat mode: every scene layer gets its own canvas; positions below are in frame px, the runtime takes world units (px / u)
      const B = P.storybook(F, { ...opt, flat: true }), W = F.W, H = F.H, PT = F.portrait, u = F.px(1), C2 = B.colors, q = (v) => v / u, gy = H * (PT ? 0.72 : 0.8);
      const S = { lead: 0.45, push: 0.005, ink: C2.ink, paper: C2.paper, colors: [C2.a, C2.b, C2.a2, C2.wood], raw: B };
      B.cast({ Kit: { kind: 'bean', tone: 'a', top: 'sprout' } });
      // background: the paper, a ground line low in the frame and a little stage on it (variant: the stage's tone and its dashed line)
      S.bg = (layer, o = {}) => B.into(layer, () => {
        const v = (o.variant ?? 0) % 3; layer.style.background = B.paperCss();
        B.ground({ from: -200, to: q(W) + 200, y: q(gy) }).p.y = q(gy);
        B.stage({ x: q(W / 2), y: q(gy), w: q(W * (PT ? 0.8 : 0.72)), tone: v === 1 ? 'cream' : 'beige', dash: v === 2 ? 'b' : 'a', at: o.at });
        return { el: layer };
      });
      // big word: hand-lettered, written on left to right, an ink underline drawn under it
      S.word = (layer, o) => B.into(layer, () => {
        const sz = Math.min(F.px(o.size ?? (PT ? 140 : 170)), (o.maxW ?? W * 0.86) / Math.max(1, estUnits(o.text)) / 1.02), x = o.x ?? W / 2, y = o.y ?? H * 0.42, tw = estUnits(o.text) * sz;
        B.line({ pts: [[q(x - tw * 0.48), q(y + sz * 0.62)], [q(x + tw * 0.48), q(y + sz * 0.6)]], stroke: (o.variant ?? 0) % 2 ? 'b' : 'a', lw: Math.max(5, q(sz) * 0.07), at: o.at + 0.2, until: o.until, enter: 'draw', inDur: 0.5, sfx: false });
        return B.title(o.text, { x: q(x), y: q(y), size: q(sz), weight: 700, at: o.at, until: o.until, enter: 'write', kind: o.kind ?? 'slam', sfx: o.sfx !== false });
      });
      // a sentence: hand-lettered, wraps inside maxW
      S.line = (layer, o) => B.into(layer, () => { const sz = F.px(Math.min(58, o.size ?? 48)), mw = o.maxW ?? W * (PT ? 0.86 : 0.72), x = o.x ?? W / 2; return B.title(o.text, { x: q(x), y: q((o.y ?? H * 0.66)), size: q(sz), weight: 700, at: o.at, until: o.until, enter: 'write', align: o.align ?? 'center', wrap: estUnits(o.text) * sz > mw ? q(mw) : null, kind: o.kind ?? 'label' }); });
      // card: a cream sheet with an ink outline and pencil hatching; content goes in the returned element
      S.card = (layer, o) => B.into(layer, () => {
        B.rect({ x: q(o.x - o.w / 2), y: q(o.y - o.h / 2), w: q(o.w), h: q(o.h), r: 8, fill: 'cream', hatch: 0.45, at: o.at - S.lead, until: o.until, enter: 'pop', pivot: 'center', z: o.z ?? 2 });
        const c = el('div', `left:${f1(o.x - o.w / 2)}px;top:${f1(o.y - o.h / 2)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;z-index:3`, layer); win(F, c, o.at - 0.1, o.until ?? 1e9);
        return { el: c, w: o.w, h: o.h };
      });
      // screenshot: unaltered, inside a hand-drawn monitor frame on a stand; the picture wipes down inside it
      S.shot = (layer, o) => B.into(layer, () => {
        const fit = o.fit === 'contain', bw = fit ? 0 : 16 * u;
        if (!fit) { B.rect({ x: q(o.x - o.w / 2 - bw), y: q(o.y - o.h / 2 - bw), w: q(o.w + bw * 2), h: q(o.h + bw * 2), r: 10, fill: 'cream', hatch: 0.5, at: o.at - S.lead, until: o.until, enter: 'pop', pivot: 'center', z: o.z ?? 2 }); }
        const box = el('div', `left:${f1(o.x - o.w / 2)}px;top:${f1(o.y - o.h / 2)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;overflow:hidden;z-index:3;border-radius:${f1(5 * u)}px`, layer);
        const im = el('img', `left:0;top:0;width:100%;height:100%;object-fit:${fit ? 'contain' : 'cover'}`, box); im.src = o.src;
        const a = o.at - S.lead + 0.15, until = o.until ?? 1e9;
        F.add((t) => { const on = t >= a && t < until; set(box, { display: on ? '' : 'none' }); if (on) set(box, { clipPath: `inset(0 0 ${f1((1 - E.cubicInOut(seg(t, a, a + 0.5))) * 100)}% 0)`, opacity: String(Math.min(1, 1 - seg(t, until - 0.25, until))) }); });
        return { el: box, w: o.w, h: o.h, img: im, box: { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h } };
      });
      // signature move: an ink ring drawn round the spot, excitement ticks beside it
      S.accent = (layer, o) => B.into(layer, () => {
        const r = q(F.px(o.size ?? 200) * 0.6), until = o.until ?? o.at + 1.8;
        B.ellipse({ x: q(o.x), y: q(o.y), rx: r * 1.15, ry: r, fill: null, stroke: 'red', lw: 7, at: o.at, until, enter: 'draw', inDur: 0.45, z: 6, sfx: false });
        B.ticks(o.at + 0.35, q(o.x), q(o.y), { r: r * 1.3 });
        F.sfx(o.at, 'draw', 0.4);
        return {};
      });
      // transition: a sheet of paper slides across and covers the frame, then slides on out (a page of the storybook turning)
      let wl = null;
      S.wipe = (o) => {
        wl ??= F.layer('pointer-events:none', 90);
        const at = o.cover, d = 0.6, dir = (o.index ?? 0) % 2 ? -1 : 1, pw = q(W) * 1.3;
        B.into(wl, () => { const sh = B.rect({ x: (t) => q(W / 2) - pw / 2 + dir * (t < at ? (1 - E.cubicInOut(seg(t, at - d, at))) * -q(W) * 1.4 : E.cubicInOut(seg(t, at, at + d)) * q(W) * 1.4), y: -40, w: pw, h: q(H) + 80, r: 10, fill: 'cream', hatch: 0.4, at: at - d, until: at + d, enter: 'none', exit: 'none', sfx: false, lintOk: true }); return sh; });
        F.sfx(at - d, 'paper', 0.5, { dur: d * 2 }); F.transition(at - d, at + d); F.cut(at);
        return { show: at, hide: at };
      };
      // end card: the mascot drops onto its stage and cheers, the name above it, the line under it, the url on a signpost
      S.end = (layer, o) => B.into(layer, () => {
        const cy = H * (PT ? 0.3 : 0.3), sz = Math.min(F.px(PT ? 120 : 150), (W * 0.84) / Math.max(1, estUnits(o.title)) / 1.02);
        layer.style.background = B.paperCss();
        B.ground({ from: -200, to: q(W) + 200 }).p.y = q(gy); B.stage({ x: q(W / 2), y: q(gy), w: q(W * 0.6) });
        const m = B.char('Kit', { x: q(W / 2) - (o.url ? 120 : 0), y: q(gy), at: o.at + 0.3, enter: 'drop', scale: 1.2 }); m.act(o.at + 2.2, 'cheer'); m.face(o.at + 1.2, 'happy');
        B.title(o.title, { x: q(W / 2), y: q(cy), size: q(sz), weight: 700, at: o.at + 0.5, enter: 'write', kind: 'logo', noFact: true });
        if (o.tagline) B.title(o.tagline, { x: q(W / 2), y: q(cy + sz * 0.95), size: q(F.px(PT ? 40 : 44)), weight: 700, at: o.at + 1.2, enter: 'write', kind: 'endcard', wrap: estUnits(o.tagline) * F.px(44) > W * 0.84 ? q(W * 0.84) : null });
        if (o.url) B.sign({ x: q(W / 2) + 160, y: q(gy), title: false, text: o.url, size: 32, h: 150, at: o.at + 1.7, enter: 'rise' });
        F.sfx(o.at + 2.1, 'ding', 0.45);
      });
      // ---- Telling information (storybook): steps are clones of the mascot on little stages, each holding its numbered card; contrast is cream boards side by side, a ✓ sticker on the winner; numbers are columns of stacked blocks; a spot on the UI is a magnifier with an ink ring ----
      S.steps = (layer, o) => B.into(layer, () => {
        const { items, T, until, C: R } = o, k = items.length, row = !PT && R.w > R.h;
        const pos = items.map((_, j) => lanePos(R, k, j, row));
        return items.map((it, j) => {
          const p2 = pos[j], t0 = T[j], cs = Math.min(row ? R.w / k * 0.42 : R.h / k * 0.6, 170 * u) / u / 150, base = row ? p2.y + 80 * u : p2.y + 60 * u, cx = row ? p2.x : R.x + 90 * u;
          B.stage({ x: q(cx), y: q(base), w: 150 * cs * 1.8, d: 26, at: t0 - 0.3, until, enter: 'fade' });
          const c = B.char('Kit', { x: q(cx), y: q(base), at: t0 - 0.15, until, enter: 'drop', scale: cs, sfx: j === 0 }); c.carry(t0 + 0.35, String(j + 1)); c.face(t0 + 0.9, 'happy', t0 + 2);
          const ts = F.px(Math.min(PT ? 42 : 44, row ? 42 : 46)), tx = row ? cx : cx + 120 * u, ty = row ? base + 64 * u + ts * 0.6 : base - 70 * u;
          B.title(it.text, { x: q(tx), y: q(ty), size: q(ts), weight: 700, at: t0 + 0.15, until, enter: 'write', align: row ? 'center' : 'left', wrap: row ? q(R.w / k * 0.92) : null, kind: 'label' });
          if (it.note) B.title(it.note, { x: q(tx), y: q(ty + ts * 1.2), size: q(ts * 0.66), weight: 400, tone: 'grey', at: t0 + 0.3, until, enter: 'write', align: row ? 'center' : 'left', wrap: row ? q(R.w / k * 0.92) : null, kind: 'label' });
          return { x: cx, y: base - 80 * u };
        });
      });
      S.versus = (layer, o) => B.into(layer, () => {
        const { cols, T, at2, until, C: R } = o, k = cols.length, stack = R.w < R.h * 1.1, gap = 30 * u;
        const cw = stack ? R.w : (R.w - gap * (k - 1)) / k, ch = stack ? (R.h - gap * (k - 1)) / k : R.h;
        return cols.map((c, j) => {
          const x = stack ? R.x : R.x + j * (cw + gap), y = stack ? R.y + j * (ch + gap) : R.y;
          B.rect({ x: q(x), y: q(y), w: q(cw), h: q(ch), r: 8, fill: c.hot ? 'white' : 'cream', hatch: 0.45, rot: j % 2 ? 1 : -1, pivot: 'center', at: T[j] - 0.35, until, enter: 'pop', z: 1 });
          if (c.hot) { const g = B.group({ x: q(x + cw - 40 * u), y: q(y + 36 * u), at: T[j] + 0.5, until, enter: 'pop', pivot: 'center', z: 3 }); g.circle({ r: 30, fill: 'green', hatch: 0.5, lw: 3.4 }); g.path({ d: 'M-12 0 L-3 10 L13 -10', fill: null, stroke: 'white', lw: 6 }); F.sfx(T[j] + 0.5, 'ding', 0.35); }
          const ts = F.px(PT ? 48 : 54);
          B.title(c.title, { x: q(x + 34 * u), y: q(y + 30 * u + ts * 0.6), size: q(ts), weight: 700, at: T[j], until, enter: 'write', align: 'left', kind: 'label' });
          (c.points || []).forEach((pt, r) => B.title('› ' + ptText(pt), { x: q(x + 36 * u), y: q(y + ts * 1.6 + 60 * u + r * F.px(PT ? 56 : 62)), size: q(F.px(PT ? 34 : 38)), weight: 400, at: at2(j, r), until, enter: 'write', align: 'left', fact: ptText(pt), wrap: q(cw - 80 * u), kind: 'label' }));
          return { x: x + cw / 2, y: y + ch / 2 };
        });
      });
      S.figures = (layer, o) => B.into(layer, () => {
        const { data, ats, until, C: R } = o, k = data.length, hot = o.hot || [], base = R.y + R.h * 0.84, max = Math.max(...data.map((d) => +d[1])) || 1, slot = R.w / k, bw = Math.min(slot * 0.56, 150 * u), bh = 46 * u;
        B.line({ pts: [[q(R.x), q(base)], [q(R.x + R.w), q(base)]], stroke: 'grey', lw: 2.4, at: ats[0] - 0.6, until, enter: 'draw', sfx: false });
        return data.map((d, j) => {
          const cx = R.x + slot * (j + 0.5), hgt = Math.max(bh, ((+d[1]) / max) * (base - R.y) * 0.7), n = Math.max(1, Math.round(hgt / bh)), isHot = hot.includes(j);
          for (let b = 0; b < n; b++) B.rect({ x: q(cx - bw / 2), y: q(base - (b + 1) * (hgt / n)), w: q(bw), h: q(hgt / n) - 3, r: 4, fill: isHot ? 'a' : b % 2 ? 'beige' : 'cream', hatch: 0.6, at: ats[j] + b * 0.05, until, enter: 'drop', dropH: 140, inDur: 0.45, sfx: b === 0 });
          B.title(`${o.prefix ?? ''}${d[1]}${o.unit ?? ''}`, { x: q(cx), y: q(base - hgt - 40 * u), size: q(F.px(PT ? 42 : 46)), weight: 700, tone: isHot ? 'a0' : 'ink', at: ats[j] + n * 0.05 + 0.5, until, enter: 'pop', kind: 'label' });
          B.title(String(d[0]), { x: q(cx), y: q(base + 40 * u), size: q(F.px(PT ? 30 : 32)), weight: 400, at: ats[j], until, enter: 'write', font: 'mono', kind: 'label' });
          return { x: cx, y: base - hgt };
        });
      });
      S.spotlight = (layer, o) => o.regions.map((rg, j) => {
        const a = o.T[j], b = j < o.regions.length - 1 ? o.T[j + 1] : o.until;
        const ring = `box-shadow:0 0 0 ${f1(F.px(7))}px ${C2.ink}, 0 0 0 ${f1(F.px(13))}px ${C2.cream}`;
        return magnify(F, layer, { src: o.src, box: o.box, region: rg, at: a, until: b, zoom: 2.2, ring, z: 30 }) ?? { x: rg.x + rg.w / 2, y: rg.y + rg.h / 2 };
      });
      infoKit(F, S, { ink: C2.ink, accent: C2.a, colors: [C2.a, C2.b, C2.a2, C2.wood], font: B.fonts.hand, display: B.fonts.hand, weight: 700, line: F.px(4), outline: C2.ink, radius: F.px(8), mark: C2.red, cutSfx: 'pop', flashAt: 'corner',
        flashBg: (col) => `background-color:${col}`,
        flashDecor: (bg, col, i, R) => { const c = document.createElement('canvas'); c.width = Math.round(R.w); c.height = Math.round(R.h); c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:.5'; bg.appendChild(c); const x = c.getContext('2d'); x.strokeStyle = mix(col, '#000000', 0.35); x.lineCap = 'round'; let sd = 7 + i * 13; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647); for (let k = 0; k < R.w * R.h / 900; k++) { const px = r() * R.w, py = r() * R.h, l = 6 + r() * 14; x.globalAlpha = 0.2 + r() * 0.4; x.lineWidth = 1 + r(); x.beginPath(); x.moveTo(px, py); x.lineTo(px + l * 0.5, py - l * 0.86); x.stroke(); } } });
      return S;
    },
  });

  // ======================= Bayeux-Tapestry embroidered scroll =======================
  P.kit.register('tapestry', {
    runtime: 'tapestry',
    theme: { bg: '#e2cfa3', fg: '#2c3040', ink: '#2c3040', paper: '#e2cfa3', accent: '#b0503a', muted: '#6a87aa', fonts: { display: '"LXGW WenKai", serif', serif: '"LXGW WenKai", serif', sans: '"LXGW WenKai", serif', script: '"LXGW WenKai", serif', mono: '"LXGW WenKai", monospace' } },
    pace: { lead: 0.5, hold: 0.4 },
    make(F, opt) {
      // flat mode: every scene layer gets its own canvas; positions below are in frame px, the runtime takes world units (px / u)
      const B = P.tapestry(F, { sketch: 0.6, speed: 1.6, ...opt, flat: true }), W = F.W, H = F.H, PT = F.portrait, u = F.px(1), C2 = B.colors, q = (v) => v / u, gy = H * (PT ? 0.74 : 0.8);
      const S = { lead: 0.5, push: 0.004, ink: C2.ink, paper: C2.linen, colors: [C2.red, C2.navy, C2.ochre, C2.green], raw: B };
      B.cast({ Kit: { tunic: 'red', cloak: 'blue', hair: 'brown', beard: 'short' } });
      const wools = ['red', 'green', 'ochre', 'blue', 'olive', 'navy'];
      // background: the linen with the upper border along the top, the green ground line low in the frame (variant 1: the hem stripes at the bottom too; 2: the ground only)
      S.bg = (layer, o = {}) => B.into(layer, () => {
        const v = (o.variant ?? 0) % 3; layer.style.background = B.linenCss();
        B.cloth({ top: v === 2 ? null : q(H * 0.02), ground: q(gy), hem: v === 1 ? q(H) - 30 : null });
        return { el: layer };
      });
      // big word: stitched letters with a red initial, a dotted rule stitched under them
      S.word = (layer, o) => B.into(layer, () => {
        const sz = Math.min(F.px(o.size ?? (PT ? 130 : 160)), (o.maxW ?? W * 0.86) / Math.max(1, estUnits(o.text)) / 1.08), x = o.x ?? W / 2, y = o.y ?? H * 0.42, tw = estUnits(o.text) * sz, n = Math.max(3, Math.round(tw / u / 40));
        const g = B.group({ at: o.at + 0.3, until: o.until, enter: 'stitch', sfx: false }); for (let i = 0; i < n; i++) g.dot({ x: q(x - tw * 0.45) + (i * q(tw * 0.9)) / Math.max(1, n - 1), y: q(y + sz * 0.68), r: 3, edge: i % 2 ? 'red' : 'ochre' });
        return B.text(o.text, { x: q(x), y: q(y), size: q(sz), align: 'center', at: o.at, until: o.until, kind: o.kind ?? 'slam', initial: (o.variant ?? 0) % 2 ? null : 'red' });
      });
      // a sentence: stitched, wraps inside maxW
      S.line = (layer, o) => B.into(layer, () => { const sz = F.px(Math.min(58, o.size ?? 48)), mw = o.maxW ?? W * (PT ? 0.86 : 0.72), x = o.x ?? W / 2, al = o.align ?? 'center', wr = estUnits(o.text) * sz * 1.06 > mw ? q(mw) : null; return B.text(o.text, { x: q(al === 'center' && wr ? x : x), y: q(o.y ?? H * 0.66), size: q(sz), align: al, wrap: wr, at: o.at, until: o.until, kind: o.kind ?? 'label', per: 0.03 }); });
      // card: a cream panel laid in wool, edged in stem stitch; content goes in the returned element
      S.card = (layer, o) => B.into(layer, () => {
        B.rect({ x: q(o.x - o.w / 2), y: q(o.y - o.h / 2), w: q(o.w), h: q(o.h), r: 10, fill: 'cream', dir: 0, at: o.at - S.lead, until: o.until, enter: 'lay', inDur: 0.5, z: o.z ?? 2, sketch: 0.3 });
        const c = el('div', `left:${f1(o.x - o.w / 2)}px;top:${f1(o.y - o.h / 2)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;z-index:3`, layer); win(F, c, o.at - 0.1, o.until ?? 1e9);
        return { el: c, w: o.w, h: o.h };
      });
      // screenshot: unaltered, inside a frame laid in brown wool; the picture is revealed downward inside it
      S.shot = (layer, o) => B.into(layer, () => {
        const fit = o.fit === 'contain', bw = fit ? 0 : 18 * u;
        if (!fit) B.rect({ x: q(o.x - o.w / 2 - bw), y: q(o.y - o.h / 2 - bw), w: q(o.w + bw * 2), h: q(o.h + bw * 2), r: 6, fill: 'brown', dir: 90, at: o.at - S.lead, until: o.until, enter: 'stitch', inDur: 0.55, z: o.z ?? 2, sketch: 0.3 });
        const box = el('div', `left:${f1(o.x - o.w / 2)}px;top:${f1(o.y - o.h / 2)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;overflow:hidden;z-index:3;border-radius:${f1(3 * u)}px`, layer);
        const im = el('img', `left:0;top:0;width:100%;height:100%;object-fit:${fit ? 'contain' : 'cover'}`, box); im.src = o.src;
        const a = o.at - S.lead + 0.2, until = o.until ?? 1e9;
        F.add((t) => { const on = t >= a && t < until; set(box, { display: on ? '' : 'none' }); if (on) set(box, { clipPath: `inset(0 0 ${f1((1 - E.cubicInOut(seg(t, a, a + 0.5))) * 100)}% 0)`, opacity: String(Math.min(1, 1 - seg(t, until - 0.25, until))) }); });
        return { el: box, w: o.w, h: o.h, img: im, box: { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h } };
      });
      // signature move: a ring stitched round the spot in red wool, the needle running it
      S.accent = (layer, o) => B.into(layer, () => {
        const r = q(F.px(o.size ?? 200) * 0.6), until = o.until ?? o.at + 1.8;
        B.line({ x: q(o.x), y: q(o.y), d: `M${f1(r * 1.15)} 0 A${f1(r * 1.15)} ${f1(r)} 0 1 1 ${f1(-r * 1.15)} 0 A${f1(r * 1.15)} ${f1(r)} 0 1 1 ${f1(r * 1.15)} 0`, w: 10, fill: 'red', at: o.at, until, enter: 'grow', inDur: 0.5, z: 6, sfx: false, sketch: 0.2 });
        F.sfx(o.at, 'stitch', 0.4);
        return {};
      });
      // transition: the cloth is wound on: a fresh stretch of linen slides in from the right with a stitched border on its leading edge, then on out
      let wl = null;
      S.wipe = (o) => {
        wl ??= F.layer('pointer-events:none', 90);
        const at = o.cover, d = 0.6, sheet = el('div', `left:0;top:0;width:${W}px;height:${H}px;display:none;background:${B.linenCss()};box-shadow:${f1(-24 * u)}px 0 ${f1(30 * u)}px rgba(60,40,20,.35)`, wl);
        const edge = el('div', `left:0;top:0;width:${f1(22 * u)}px;height:100%;background:repeating-linear-gradient(180deg, ${C2.red} 0 ${f1(26 * u)}px, ${C2.ochre} ${f1(26 * u)}px ${f1(52 * u)}px, ${C2.green} ${f1(52 * u)}px ${f1(78 * u)}px, ${C2.navy} ${f1(78 * u)}px ${f1(104 * u)}px);border-right:${f1(4 * u)}px solid ${C2.ink}`, sheet);
        sheet.dataset.motion = 'skip'; edge.dataset.motion = 'skip';
        F.add((t) => { const on = t >= at - d && t < at + d; set(sheet, { display: on ? '' : 'none' }); if (on) { const x = t < at ? (1 - E.cubicInOut(seg(t, at - d, at))) * W : -E.cubicInOut(seg(t, at, at + d)) * W * 1.1; set(sheet, { transform: `translateX(${f1(x)}px)` }); } });
        F.sfx(at - d, 'stitch', 0.4, { dur: d * 2 }); F.transition(at - d, at + d); F.cut(at);
        return { show: at, hide: at };
      };
      // end card: the name under the branch arch, the tagline and the url stitched under it
      S.end = (layer, o) => B.into(layer, () => {
        layer.style.background = B.linenCss(); B.cloth({ top: q(H * 0.02), ground: q(gy) });
        const w = q(W * (PT ? 0.86 : 0.62)), top = -q(gy - H * (PT ? 0.24 : 0.2));
        B.act({ x: q(W / 2), y: q(gy), w, top, title: o.title, sub: o.tagline, at: o.at + 0.1, titleAt: 1.0, inDur: 1.8, size: q(Math.min(F.px(PT ? 110 : 130), (w * u * 0.8) / Math.max(1, estUnits(o.title)))), kind: 'logo', noFact: true, subKind: 'endcard', subSize: q(F.px(PT ? 46 : 48)), titleY: -q(gy - H * (PT ? 0.42 : 0.44)) });
        if (o.url) B.text(o.url, { x: q(W / 2), y: q(gy - F.px(70)), size: q(F.px(PT ? 42 : 46)), align: 'center', tone: 'red', at: o.at + 2.2, kind: 'endcard', per: 0.035 });
      });
      // ---- Telling information (tapestry): steps are scenes along the cloth, each a stitched roundel with its number and a caption, trees between them; contrast is two panels of the cloth divided by a tree, a red stitched mark on the winner; numbers are columns of laid wool rising from the ground line; a spot on the UI is a stitched ring ----
      S.steps = (layer, o) => B.into(layer, () => {
        const { items, T, until, C: R } = o, k = items.length, row = !PT && R.w > R.h;
        const pos = items.map((_, j) => lanePos(R, k, j, row));
        return items.map((it, j) => {
          const p2 = pos[j], t0 = T[j], rr = Math.min(row ? R.w / k * 0.2 : R.h / k * 0.3, 70 * u), cx = row ? p2.x : R.x + rr + 10 * u, cy = row ? p2.y - rr * 0.6 : p2.y;
          B.circle({ x: q(cx), y: q(cy), r: q(rr), fill: wools[j % wools.length], dir: 90, at: t0 - 0.35, until, enter: j % 2 ? 'lay' : 'stitch', inDur: 0.55, sketch: 0.3, sfx: j === 0 });
          B.text(String(j + 1), { x: q(cx), y: q(cy), size: q(rr * 1.05), align: 'center', tone: 'cream', at: t0, until, noFact: true, kind: 'label' });
          if (row && j < k - 1) B.tree({ x: q((p2.x + pos[j + 1].x) / 2), y: q(cy + rr + 10 * u), h: q(Math.min(rr * 3.2, R.h * 0.9)), at: t0 + 0.2, until, branches: 2, leaf: q(rr * 0.42), sketch: 0.3 });
          const ts = F.px(Math.min(PT ? 42 : 44, row ? 42 : 46)), tx = row ? cx : cx + rr + 30 * u, ty = row ? cy + rr + ts * 1.2 : cy - (it.note ? ts * 0.4 : 0);
          B.text(it.text, { x: q(tx), y: q(ty), size: q(ts), align: row ? 'center' : 'left', wrap: row ? q(R.w / k * 0.92) : null, at: t0 + 0.15, until, kind: 'label', per: 0.03 });
          if (it.note) B.text(it.note, { x: q(tx), y: q(ty + ts * 1.2), size: q(ts * 0.68), tone: 'navy', align: row ? 'center' : 'left', wrap: row ? q(R.w / k * 0.92) : null, at: t0 + 0.4, until, kind: 'label', per: 0.03 });
          return { x: cx, y: cy };
        });
      });
      S.versus = (layer, o) => B.into(layer, () => {
        const { cols, T, at2, until, C: R } = o, k = cols.length, stack = R.w < R.h * 1.1, gap = (stack ? 60 : 170) * u;
        const cw = stack ? R.w : (R.w - gap * (k - 1)) / k, ch = stack ? (R.h - gap * (k - 1)) / k : R.h;
        return cols.map((c, j) => {
          const x = stack ? R.x : R.x + j * (cw + gap), y = stack ? R.y + j * (ch + gap) : R.y;
          if (j && !stack) B.tree({ x: q(x - gap / 2), y: q(Math.min(gy, y + ch)), h: q(Math.min(gy, y + ch) - y) * 0.95, at: T[j] - 0.6, until, branches: 3, leaf: 24, sketch: 0.3 });
          if (j && stack) B.line({ pts: [[q(R.x + 30 * u), q(y - gap / 2)], [q(R.x + R.w - 30 * u), q(y - gap / 2)]], w: 9, fill: 'olive', at: T[j] - 0.5, until, enter: 'grow', inDur: 0.5, sketch: 0.3 });
          const ts = F.px(PT ? 48 : 54);
          B.text(c.title, { x: q(x + 20 * u), y: q(y + 20 * u + ts * 0.6), size: q(ts), align: 'left', at: T[j], until, kind: 'label', initial: c.hot ? 'red' : null });
          if (c.hot) { B.line({ x: q(x + cw - 70 * u), y: q(y + 40 * u), pts: [[-22, 0], [-6, 18], [26, -22]], w: 10, fill: 'red', at: T[j] + 0.5, until, enter: 'grow', inDur: 0.4, sketch: 0.2 }); F.sfx(T[j] + 0.5, 'knot', 0.35); }
          (c.points || []).forEach((pt, r) => B.text('· ' + ptText(pt), { x: q(x + 24 * u), y: q(y + ts * 1.6 + 60 * u + r * F.px(PT ? 56 : 62)), size: q(F.px(PT ? 34 : 38)), tone: 'navy', align: 'left', at: at2(j, r), until, fact: ptText(pt), wrap: q(cw - 50 * u), kind: 'label', per: 0.03 }));
          return { x: x + cw / 2, y: y + ch / 2 };
        });
      });
      S.figures = (layer, o) => B.into(layer, () => {
        const { data, ats, until, C: R } = o, k = data.length, hot = o.hot || [], onGround = gy > R.y + R.h * 0.5 && gy < R.y + R.h + F.px(80), base = onGround ? gy - 4 * u : R.y + R.h * 0.8, max = Math.max(...data.map((d) => +d[1])) || 1, slot = R.w / k, bw = Math.min(slot * 0.42, 130 * u);   // columns stand on the background's ground line when it runs through the area
        if (!onGround) B.line({ pts: [[q(R.x), q(base) + 6], [q(R.x + R.w), q(base) + 6]], w: 12, fill: 'olive', at: ats[0] - 0.6, until, enter: 'grow', inDur: 0.5, sfx: false, sketch: 0.3 });
        return data.map((d, j) => {
          const cx = R.x + slot * (j + 0.5), hgt = Math.max(30 * u, ((+d[1]) / max) * (base - R.y) * 0.66), isHot = hot.includes(j);
          B.rect({ x: q(cx - bw / 2), y: q(base - hgt), w: q(bw), h: q(hgt), fill: isHot ? 'red' : wools[(j + 1) % wools.length], dir: 90, at: ats[j], until, enter: 'lay', inDur: 0.6, sketch: 0.3, sfx: j === 0 });
          B.text(`${o.prefix ?? ''}${d[1]}${o.unit ?? ''}`, { x: q(cx), y: q(base - hgt - 40 * u), size: q(F.px(PT ? 42 : 46)), align: 'center', tone: isHot ? 'red' : 'ink', at: ats[j] + 0.5, until, kind: 'label' });
          B.text(String(d[0]), { x: q(cx), y: q(base + 54 * u), size: q(F.px(PT ? 30 : 32)), align: 'center', tone: 'navy', at: ats[j], until, kind: 'label', per: 0.03 });
          return { x: cx, y: base - hgt };
        });
      });
      S.spotlight = (layer, o) => o.regions.map((rg, j) => {
        const a = o.T[j], b = j < o.regions.length - 1 ? o.T[j + 1] : o.until;
        const ring = `box-shadow:0 0 0 ${f1(F.px(7))}px ${C2.ink}, 0 0 0 ${f1(F.px(14))}px ${C2.ochre}, 0 0 0 ${f1(F.px(18))}px ${C2.ink}`;
        return magnify(F, layer, { src: o.src, box: o.box, region: rg, at: a, until: b, zoom: 2.2, ring, z: 30 }) ?? { x: rg.x + rg.w / 2, y: rg.y + rg.h / 2 };
      });
      infoKit(F, S, { ink: C2.ink, accent: C2.red, colors: [C2.red, C2.navy, C2.ochre, C2.green], font: B.fonts.text, display: B.fonts.text, weight: 700, line: F.px(4), outline: C2.ink, radius: F.px(6), mark: C2.red, cutSfx: 'stitch', flashAt: 'corner',
        flashBg: (col) => `background-color:${col}`,
        flashDecor: (bg, col, i, R) => { const c = document.createElement('canvas'); c.width = Math.round(R.w); c.height = Math.round(R.h); c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:.45'; bg.appendChild(c); const x = c.getContext('2d'); x.strokeStyle = mix(col, '#000000', 0.3); x.lineWidth = Math.max(1, F.px(2)); for (let k = 0; k < R.h; k += F.px(4)) { x.globalAlpha = 0.35 + ((k * 7 + i * 13) % 10) / 30; x.beginPath(); x.moveTo(0, k); x.lineTo(R.w, k); x.stroke(); } } });
      return S;
    },
  });

  // ======================= Shadow puppetry =======================
  P.kit.register('shadow', {
    runtime: 'shadow',
    theme: { bg: '#140C07', fg: '#22140B', ink: '#22140B', paper: '#F6EFE0', accent: '#B5321F', muted: '#6B4A2A', fonts: { display: '"LXGW WenKai", serif', serif: '"LXGW WenKai", serif', sans: '"LXGW WenKai", serif', script: '"LXGW WenKai", serif' } },
    make(F, opt) {
      const Y = P.shadow(F, opt), W = F.W, H = F.H, PT = F.portrait, S = { lead: 0.4, push: 0, ink: '#22140B', paper: '#F6EFE0', colors: ['#B5321F', '#2F6B44', '#C08A2C', '#22140B'], raw: Y };
      const host = (layer) => layer._screen ?? layer;
      // background: a screen (off-white with light coming through; PROMO.shadow's screen: 'oil' is an oil lamp's warm yellow); everything in this scene goes inside the screen, text sits above the dimming layer
      S.bg = (layer, o = {}) => { const st = Y.stage(layer, { variant: o.variant ?? 0 }); layer._screen = st.screen; return { el: st.el }; };
      S.word = (layer, o) => Y.title(host(layer), { text: o.text, at: o.at, until: o.until, y: o.y ?? H * 0.42, size: o.size ?? (PT ? 130 : 150), kind: o.kind ?? 'slam', sfx: o.sfx });
      // strip width ≈ characters × font size × 1.06 + margins on both sides (0.9 font size): with maxW, shrink the font size until it fits
      const fit = (text, size, maxW) => (maxW ? Math.min(size, maxW / F.px(1) / (estUnits(text) * 1.06 + 0.9)) : size);
      S.line = (layer, o) => Y.placard(host(layer), { text: o.text, at: o.at, until: o.until, x: o.x ?? W / 2, y: o.y ?? H * 0.66, size: Math.max(26, fit(o.text, Math.min(64, o.size ?? 52), o.maxW ?? W * 0.9)), align: o.align, swing: false, kind: o.kind ?? 'label', sfx: o.sfx === 'pulse' ? undefined : o.sfx });
      // card / screenshot: a carved wooden frame (dark edge + small holes letting light through)
      const frame = (layer, o, inner) => { const b = el('div', `left:${f1(o.x - o.w / 2)}px;top:${f1(o.y - o.h / 2)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;border:${f1(F.px(14))}px solid #3A1F10;outline:${f1(F.px(3))}px solid #B5321F;outline-offset:${f1(-F.px(8))}px;box-sizing:border-box;background:${inner ?? 'rgba(246,239,224,.85)'};box-shadow:0 ${f1(F.px(16))}px ${f1(F.px(40))}px rgba(30,10,4,.4);display:none;z-index:${o.z ?? 20}`, host(layer)); F.add((t) => { const on = t >= o.at - 0.5 && t < (o.until ?? 1e9); set(b, { display: on ? '' : 'none' }); if (on) { const q = seg(t, o.at - 0.5, o.at, E.quartOut); set(b, { opacity: String(q.toFixed(3)), transform: `translateY(${f1((1 - q) * F.px(60))}px)` }); } }); if (o.sfx !== false) F.sfx(o.at - 0.3, 'wood', 0.35); return b; };
      S.card = (layer, o) => { const b = frame(layer, o); return { el: b, w: o.w, h: o.h }; };
      S.shot = (layer, o) => { const b = frame(layer, o, '#F3E6CC'), im = el('img', `left:0;top:0;width:100%;height:100%;object-fit:${o.fit === 'contain' ? 'contain' : 'cover'}`, b); im.src = o.src; const bw = F.px(14); return { el: b, w: o.w, h: o.h, img: im, box: { x: o.x - o.w / 2 + bw, y: o.y - o.h / 2 + bw, w: o.w - 2 * bw, h: o.h - 2 * bw } }; };
      // signature move: an auspicious cloud floats up from the word's top-right corner, with a gong
      S.accent = (layer, o) => { const r = F.px(o.size ?? 300); Y.prop(host(layer), { kind: 'cloud', x: Math.min(W * 0.9, o.x + r * 0.9), y: Math.max(H * 0.2, o.y - r * 0.4), size: 200, at: o.at + 0.1, until: o.until, depth: 0.2, sfx: false }); F.sfx(o.at, 'gong', 0.5); return {}; };
      S.wipe = (o) => { Y.change(o.cover, o.dur ?? 0.9); F.cut(o.cover); return { show: o.cover, hide: o.cover }; };
      // a seal carved with the product name: first two characters for Chinese, initials for Latin
      S.end = (layer, o) => { const ch = [...String(o.title ?? '')], seal = /[^\x00-\xff]/.test(ch[0] ?? '') ? ch.slice(0, 2).join('') : (ch[0] ?? '').toUpperCase(); Y.endcard(host(layer), { at: o.at, title: o.title, sub: o.tagline, seal }); if (o.url) Y.placard(host(layer), { text: o.url, at: o.at + 2.0, y: H * (PT ? 0.62 : 0.74), size: 44, swing: false, kind: 'endcard', color: 'black' }); F.sfx(o.at + 3 * F.B, 'logo', 1); };
      // ---- Telling information (shadow): one red paper strip hung up per step; contrast is two puppets facing off; numbers are carved wooden bars; the spotlight is lamplight on that one spot ----
      S.steps = (layer, o) => {
        // landscape: a row of vertically hung strips, top edges aligned (as if on one pole); notes hang below the strips
        const { items, T, until, C: R } = o, n = items.length, row = R.w >= R.h * 1.2, top = R.y + R.h * 0.16;
        return items.map((it, j) => {
          const p0 = lanePos(R, n, j, row, 0), u = estUnits(it.text), vert = row && u <= 6, slot = (row ? R.w / n : R.w) * 0.94;
          const size = Math.max(36, Math.min(58, slot / F.px(1) / Math.max(3, u) * 0.75));
          const pl = Y.placard(host(layer), { text: it.text, at: T[j], until, x: p0.x, y: vert ? top : p0.y, top: vert, size, color: it.hot ? 'red' : 'black', vertical: vert });
          if (it.note) Y.placard(host(layer), { text: it.note, at: T[j] + 0.3, until, x: p0.x, after: pl.el, size: Math.max(26, fit(it.note, 32, slot)), swing: false, color: '#6B4A2A', sfx: false });
          return { x: p0.x, y: vert ? top + F.px(size) * (u * 0.6 + 0.4) : p0.y };
        });
      };
      S.versus = (layer, o) => {
        const { cols, T, at2, until, C: R } = o, m = cols.length;
        return cols.map((col, j) => {
          // each side: title hung at the top, points one by one below; a puppet stands on this side's stage, facing the other side
          const cw = R.w / m, x = R.x + cw * (j + 0.5), face = j < m / 2 ? 'right' : 'left';
          Y.puppet(host(layer), { kind: col.hot ? 'general' : ['official', 'elder', 'soldier'][j % 3], x, at: T[j], enter: 'fade', face, size: PT ? 300 : 340 });
          Y.placard(host(layer), { text: col.title, at: T[j] + 0.1, until, x, y: R.y + F.px(40), size: fit(col.title, 48, cw * 0.9), color: col.hot ? 'red' : 'black' });
          (col.points || []).forEach((pt, r2) => Y.placard(host(layer), { text: ptText(pt), at: at2(j, r2), until, x, y: R.y + F.px(140) + r2 * F.px(78), size: Math.max(26, fit(ptText(pt), 36, cw * 0.86)), swing: false, color: col.hot ? 'red' : '#6B4A2A', sfx: r2 ? false : undefined }));
          return { x, y: R.y + R.h / 2 };
        });
      };
      S.figures = (layer, o) => {
        const { data, ats, until, C: R } = o, n = data.length, mx = Math.max(...data.map((d) => d[1])), cw = R.w / n, base = R.y + R.h * 0.86;
        return data.map(([name, val], j) => {
          const x = R.x + cw * (j + 0.5), hot = (o.hot || []).includes(j), hh = (R.h * 0.62 * val) / mx, bw = Math.min(cw * 0.42, F.px(120));
          const bar = el('div', `left:${f1(x - bw / 2)}px;top:${f1(base - hh)}px;width:${f1(bw)}px;height:${f1(hh)}px;background:${hot ? '#B5321F' : '#2F6B44'};opacity:.88;border:${f1(F.px(4))}px solid #1C130C;box-sizing:border-box;transform-origin:50% 100%;display:none;background-image:radial-gradient(circle, rgba(243,217,164,.9) 0 ${f1(F.px(5))}px, transparent ${f1(F.px(6))}px);background-size:${f1(F.px(26))}px ${f1(F.px(26))}px;z-index:15`, host(layer));
          F.add((t) => { const on = t >= ats[j] - 0.5 && t < until; set(bar, { display: on ? '' : 'none' }); if (on) set(bar, { transform: `scaleY(${seg(t, ats[j] - 0.5, ats[j], E.quartOut).toFixed(3)})` }); });
          Y.placard(host(layer), { text: fmtNum(val, o), at: ats[j], until, x, y: base - hh - F.px(50), size: 46, swing: false, color: hot ? 'red' : 'black', sfx: false });
          Y.placard(host(layer), { text: String(name), at: ats[j] + 0.2, until, x, y: base + F.px(50), size: 34, swing: false, color: '#6B4A2A', sfx: false });
          F.sfx(ats[j] - 0.3, 'wood', 0.3);
          return { x, y: base - hh / 2 };
        });
      };
      S.spotlight = (layer, o) => o.regions.map((rg, j) => {
        const a = o.T[j], b = j < o.regions.length - 1 ? o.T[j + 1] : o.until, cx = rg.x + rg.w / 2 - o.box.x, cy = rg.y + rg.h / 2 - o.box.y, rx = rg.w * 0.75 + F.px(50), ry = rg.h * 0.75 + F.px(50);
        const dim = el('div', `left:${f1(o.box.x)}px;top:${f1(o.box.y)}px;width:${f1(o.box.w)}px;height:${f1(o.box.h)}px;z-index:25;pointer-events:none;background:radial-gradient(ellipse ${f1(rx)}px ${f1(ry)}px at ${f1(cx)}px ${f1(cy)}px, rgba(255,214,140,.18) 40%, rgba(20,8,2,.66) 100%);opacity:0`, host(layer));
        F.add((t) => set(dim, { opacity: String(Math.min(seg(t, a - 0.35, a), b < 1e8 ? 1 - seg(t, b - 0.3, b) : 1)) }));
        F.sfx(a - 0.3, 'wood', 0.3);
        return { x: rg.x + rg.w / 2, y: rg.y + rg.h / 2 };
      });
      infoKit(F, S, { ink: '#22140B', accent: '#B5321F', colors: ['#B5321F', '#2F6B44', '#C08A2C', '#2B4F7A'], font: '"LXGW WenKai", serif', display: '"LXGW WenKai", serif', line: F.px(5), outline: null, radius: 0, mark: '#B5321F', cutSfx: 'wood',
        flashBg: (col) => `background:radial-gradient(ellipse 70% 75% at 50% 45%, #FCF9F1 0%, ${col} 70%, #2A1208 100%)` });
      return S;
    },
  });

  // ======================= Origami =======================
  P.kit.register('origami', {
    runtime: 'origami',
    theme: { bg: '#E7E1D6', fg: '#2A2520', ink: '#2A2520', paper: '#F5F2ED', accent: '#C9563A', muted: '#6F685F', fonts: { display: '"Instrument Serif", serif', serif: '"Instrument Serif", serif', sans: 'Inter, sans-serif', script: '"Instrument Serif", serif' } },
    make(F, opt) {
      const O = P.origami(F, opt), th = F.theme, R = EV.rng(opt.seed ?? 'kit-origami');
      const papers = opt.papers ?? [O.paper, '#C9563A', '#2F4A5C', '#E3B74F'], ink = th.ink;
      const S = { lead: 0.42, push: 0.014, ink, paper: O.paper, colors: papers, raw: O };
      const DESKS = ['#E7E1D6', '#DCE2E3', '#E8DCCD', '#E1E4D5'];
      const planes = new Map();
      S.bg = (layer, o = {}) => ({ el: O.desk(layer, { color: DESKS[(o.variant ?? 0) % DESKS.length] }) });
      const inkOn = (paper) => (lum(paper) < 0.5 ? '#FFFFFF' : ink);
      // text printed on a folded sheet: the sheet drops from above, opens before landing and settles at at; on exit it is lifted and slides away
      S.word = (layer, o) => {
        const until = o.until ?? 1e9, d = S.lead, font = o.font ?? th.fonts.display, maxW = o.maxW ?? F.W * 0.9;
        let size = F.px(o.size ?? 180);
        const tw = textW(o.text, `400 ${size}px ${font}`);
        if (tw + size * 0.9 > maxW) size *= (maxW - size * 0.9) / tw;
        const w = textW(o.text, `400 ${size}px ${font}`) + size * 0.9, h = size * 1.55, x0 = (o.x ?? F.W / 2) - w / 2, y0 = (o.y ?? F.H / 2) - h / 2;
        const paper = o.paper ?? papers[(o.variant ?? 0) % papers.length], rz = (R() - 0.5) * 5;
        const Sh = O.sheet(layer, { x: x0, y: y0, w, h, z: F.px(F.portrait ? 480 : 760), rz: rz + (R() - 0.5) * 20, fold: { type: 'half', axis: 'h' }, folded: true, paper, show: [o.at - d, until] });
        Sh.move(o.at - d, d, { z: 0, rz }, { ease: E.quartOut, blur: true });
        Sh.unfold(o.at - d * 0.55, d * 0.55, { sfx: false, ease: E.quartOut });
        const big = el('div', `inset:0;display:flex;align-items:center;justify-content:center;font:400 ${f1(size)}px/1 ${font};letter-spacing:-.01em;color:${o.color ?? inkOn(paper)};white-space:nowrap`, Sh.front);
        big.textContent = o.text;
        F.text(big, o.kind ?? 'slam', o.text, o.at - d, until);
        if (o.sfx !== false) F.sfx(o.at, o.sfx ?? 'land', o.gain ?? 1, { size: 0.7 });
        if (until < 1e8) Sh.move(until - 0.3, 0.3, { x: x0 + F.W * 0.9, rz: rz + 14 }, { ease: E.quartIn, lift: F.px(140), sfx: 'whoosh', gain: 0.4 });
        return { el: Sh.wrap, sheet: Sh, text: big };
      };
      // a sheet folded in three unfolds from the middle outwards (accordion fold); on exit it folds back and fades
      const unfoldIn = (layer, o, w, h, fold) => {
        const until = o.until ?? 1e9, a = o.at - 0.55, x0 = (o.x ?? F.W / 2) - w / 2, y0 = (o.y ?? F.H / 2) - h / 2;
        const Sh = O.sheet(layer, { x: x0, y: y0, w, h, z: F.px(260), fold, folded: true, paper: o.paper ?? O.back, show: [a, until], zIndex: o.z });
        Sh.move(a, 0.55, { z: 0 }, { ease: E.quartOut, blur: false });
        Sh.unfold(a, 0.55, { ease: E.quartOut, sfx: o.sfx });
        if (until < 1e8) { Sh.fold(until - 0.5, 0.35, { sfx: false }); F.add((t) => set(Sh.wrap, { opacity: String(1 - seg(t, until - 0.18, until)) })); }
        return Sh;
      };
      S.line = (layer, o) => {
        const size = F.px(o.size ?? 50), font = o.font ?? th.fonts.sans, maxW = o.maxW ?? F.W * (F.portrait ? 0.86 : 0.72), pad = size * 1.1;
        const tw = textW(o.text, `500 ${size}px ${font}`) * 1.08, lines = Math.ceil((tw + pad) / maxW)   /* canvas measures CJK width a bit narrow (different fallback font): leave 8% */, w = Math.min(maxW, tw + pad), h = lines * size * 1.3 + size * 0.9;
        const Sh = unfoldIn(layer, o, w, h, { type: 'accordion', n: 3, axis: 'v', from: 'center' });
        const tx = el('div', `inset:0;display:flex;align-items:center;justify-content:center;padding:0 ${f1(pad / 2)}px;text-align:${o.textAlign ?? 'center'};font:${o.weight ?? 500} ${f1(size)}px/1.3 ${font};color:${o.color ?? ink}`, Sh.front);
        tx.textContent = o.text;
        F.text(tx, o.kind ?? 'label', o.text, o.at - 0.55, o.until ?? 1e9);
        return { el: Sh.wrap, sheet: Sh, text: tx };
      };
      S.card = (layer, o) => { const Sh = unfoldIn(layer, o, o.w, o.h, { type: 'gate', axis: 'v' }); return { el: Sh.front, w: o.w, h: o.h, sheet: Sh }; };
      S.shot = (layer, o) => { const c = S.card(layer, { ...o, paper: '#FFFFFF' }); return { ...c, img: img(c.el, o), box: { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h } }; };
      // signature move: a paper plane flies in from the bottom left, skims over the word and leaves on the right
      S.accent = (layer, o) => {
        const n = planes.get(layer) ?? 0; planes.set(layer, n + 1);
        const y = o.y ?? F.H / 2, x = o.x ?? F.W / 2, r = F.px(o.size ?? 340), dur = 1.9, a = o.at - 0.5;
        const pts = [[x - F.W * 0.8, y + r * 0.6, F.px(160)], [x - r * 0.4, y - r * 0.75, F.px(320)], [x + F.W * 0.8, y - r * 1.2, F.px(200)]];
        const m = O.model(layer, { def: 'plane', size: 70, x: pts[0][0], y: pts[0][1], z: pts[0][2], paper: papers[(n + 1) % papers.length], show: [a, a + dur], zIndex: 6 });
        m.fly(a, dur, pts, { bank: 0.5 });
        return m;
      };
      // page turn: this scene turns over like a page from the left (the spine), revealing the next scene already underneath
      S.wipe = (o) => {
        const d = o.dur ?? 0.9;
        if (!o.out) throw new Error(M('折纸的转场是翻页：S.wipe 要给 out（这一场的图层）', "Origami's transition is a page turn: S.wipe needs out (this scene's layer)"));
        O.turn(o.out, { at: o.cover - d / 2, dur: d, edge: (o.index ?? 0) % 2 ? 'right' : 'left' });
        return { show: o.cover - d / 2, hide: o.cover + d / 2 };
      };
      S.end = (layer, o) => O.endcard(layer, { at: o.at, logo: { text: o.title }, tagline: o.tagline, url: o.url });
      // ---- Telling information (origami): one sheet drops and opens per step, a paper plane carries the work from stop to stop; a gatefold opening = two sides compared; numbers are sheets standing up ----
      S.steps = (layer, o) => {
        const { items, T, until, C } = o, n = items.length, row = C.w >= C.h * 1.2, maxW = row ? (C.w / n) * 0.9 : C.w * 0.8;
        const pts = items.map((it, j) => {
          const p0 = lanePos(C, n, j, row), y = row ? p0.y + (j % 2 ? 1 : -0.5) * C.h * 0.06 : p0.y;
          S.word(layer, { at: T[j], until, text: it.text, x: p0.x, y, size: 88, maxW, variant: it.hot ? 1 : j % 2 ? 3 : 0, kind: 'label' });
          if (it.note) S.line(layer, { at: T[j] + 0.35, until, text: it.note, x: p0.x, y: y + F.px(115), size: 30, maxW, sfx: false });
          return { x: p0.x, y };
        });
        if (n > 1) {   // paper plane: flies from the first sheet to the last, then out of frame
          const a = T[0] + 0.15, dur = Math.max(1.2, T[n - 1] - T[0]) + 1.0;
          const m2 = O.model(layer, { def: 'plane', size: 56, x: pts[0].x, y: pts[0].y - F.px(120), z: F.px(220), paper: papers[2 % papers.length], show: [a, Math.min(until, a + dur)], zIndex: 7 });
          m2.fly(a, dur, [...pts.map((p) => [p.x, p.y - F.px(125), F.px(220)]), [pts[n - 1].x + F.W * 0.5, pts[n - 1].y - F.px(280), F.px(320)]], { bank: 0.4 });
        }
        return pts;
      };
      S.versus = (layer, o) => {
        const { cols, T, at2, until, C } = o, m = cols.length, stack = F.portrait && m > 2, w = Math.min(C.w, F.px(1560)), h = C.h * 0.94, x0 = C.x + (C.w - w) / 2, y0 = C.y + (C.h - h) / 2;
        const card = S.card(layer, { at: T[0], until, x: x0 + w / 2, y: y0 + h / 2, w, h, paper: '#FFFFFF' });   // a gatefold sheet: when it opens, its left and right halves are the two columns
        return cols.map((col, j) => {
          const cw = stack ? w : w / m, ch = stack ? h / m : h, bx = stack ? 0 : cw * j, by = stack ? ch * j : 0;
          const put = (text, a, ty, size, color, font) => { const e = el('div', `left:${f1(bx + cw * 0.07)}px;width:${f1(cw * 0.86)}px;top:${f1(by + ty)}px;text-align:center;font:${font === 'display' ? 400 : 500} ${f1(F.px(size))}px/1.25 ${font === 'display' ? th.fonts.display : th.fonts.sans};color:${color};opacity:0`, card.el); e.textContent = text; F.text(e, 'label', text, a - 0.3, until); F.add((t) => { const q = seg(t, a - 0.3, a, E.quartOut); set(e, { opacity: String(q), transform: `translateY(${f1((1 - q) * F.px(14))}px)` }); }); F.sfx(a - 0.2, font === 'display' ? 'crease' : 'tick', font === 'display' ? 0.5 : 0.3); };
          put(col.title, T[j], ch * 0.08, stack ? 64 : 80, col.hot ? th.accent : ink, 'display');
          (col.points || []).forEach((pt, r2) => put(ptText(pt), at2(j, r2), ch * (stack ? 0.36 : 0.34) + r2 * Math.min(F.px(100), (ch * 0.58) / Math.max(1, col.points.length)), 40, ink, 'sans'));
          return { x: x0 + bx + cw / 2, y: y0 + by + ch / 2 };
        });
      };
      S.figures = (layer, o) => {
        const { data, ats, until, C } = o, n = data.length, mx = Math.max(...data.map((d) => d[1])), cw = C.w / n, base = C.y + C.h * 0.8;
        return data.map(([name, val], j) => {
          const hot = (o.hot || []).includes(j), w = Math.min(cw * 0.6, F.px(240)), h = Math.max(F.px(80), C.h * 0.56 * (val / mx)), x = C.x + cw * (j + 0.5), paper = hot ? th.accent : papers[(j % (papers.length - 1)) + 1];
          S.card(layer, { at: ats[j], until, x, y: base - h / 2, w, h, paper, sfx: j ? false : undefined });   // a sheet stands up and opens: bigger means taller
          const num = el('div', `left:${f1(x - cw / 2)}px;width:${f1(cw)}px;top:${f1(base - h - F.px(78))}px;text-align:center;font:400 ${f1(Math.min(F.px(72), cw * 0.32))}px/1 ${th.fonts.display};color:${hot ? th.accent : ink};opacity:0`, layer);
          num.textContent = fmtNum(val, o); F.text(num, 'label', num.textContent, ats[j], until); F.add((t) => set(num, { opacity: String(seg(t, ats[j] - 0.15, ats[j] + 0.15)) }));
          S.line(layer, { at: ats[j] + 0.25, until, text: String(name), x, y: base + F.px(62), size: 32, maxW: cw * 0.92, sfx: false });
          return { x, y: base - h / 2 };
        });
      };
      S.spotlight = (layer, o) => o.regions.map((rg, j) => { const m = magnify(F, layer, { src: o.src, box: o.box, region: rg, at: o.T[j], until: o.until, rot: j % 2 ? 2.5 : -2.5, sfxType: 'land', ring: `border:${f1(F.px(13))}px solid #F7F4EE;box-shadow:0 ${f1(F.px(18))}px ${f1(F.px(40))}px rgba(40,30,20,.3)` }); return { x: m.x, y: m.y }; });   // a round paper disc as the magnifier
      infoKit(F, S, { ink, accent: th.accent, colors: papers.slice(1), font: th.fonts.sans, display: th.fonts.display, weight: 400, line: F.px(5), outline: null, radius: 0, mark: th.accent, cutSfx: 'land', flashAt: 'corner',
        flashBg: (col, i) => `background:linear-gradient(${i % 2 ? 125 : 55}deg, rgba(255,255,255,.16) 0 50%, rgba(0,0,0,.10) 50% 100%), ${col}` });   // origami: one whole sheet with a crease down the middle (half light, half dark)
      return S;
    },
  });

  // ======================= Launch motion (default style) =======================
  // uses promo.js's own components directly: impact words, word-by-word headline, browser window, light leak, flash, end card
  P.kit.register('launch', {
    runtime: 'slam',
    // light stage by default; dark or brand colour is picked for the product by whoever makes the film (P.kit.ground / the film's ground, brand), not hard-coded
    theme: { bg: '#F6F5F1', fg: '#141414', ink: '#141414', paper: '#FFFFFF', accent: '#2F5BEA', muted: '#6B665E', ground: 'light', fonts: { display: 'Inter, sans-serif', serif: 'Georgia, serif', sans: 'Inter, sans-serif', script: 'cursive' } },
    groundNames: ['light', 'dark', 'brand'],
    grounds: (g, o = {}) => {
      if (g === 'light') return { bg: o.bg ?? '#F6F5F1', fg: '#141414', ink: '#141414', paper: '#FFFFFF', accent: o.accent ?? o.brand ?? '#2F5BEA', muted: '#6B665E', ground: 'light' };
      if (g === 'dark') return { bg: o.bg ?? '#0F0E0C', fg: '#F2EEE6', ink: '#17150F', paper: '#F4F1EA', accent: o.accent ?? o.brand ?? '#D9B37A', muted: '#8a8375', ground: 'dark' };
      if (g === 'brand') {   // brand colour as the ground: text automatically picks black or white, whichever contrasts more; accent see below
        const b = o.brand; if (!rgbOf(b)) throw new Error(M("ground: 'brand' 要给品牌色：{ brand: '#RRGGBB' }（从网站 CSS / App / Logo 里取）", "ground: 'brand' needs a brand colour: { brand: '#RRGGBB' } (take it from the website CSS / app / logo)"));
        const rl = (c) => { const r = rgbOf(c); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r[0]) + 0.7152 * f(r[1]) + 0.0722 * f(r[2]); };
        const darkBg = 1.05 / (rl(b) + 0.05) >= (rl(b) + 0.05) / (rl('#141414') + 0.05), fg = darkBg ? '#FFFFFF' : '#141414';   // white or black text, whichever contrasts more (WCAG)
        // accent: if the other one (black / white) is still readable on the big text (≥ 2.5:1), use it — on orange, black text with white accent is cleaner than a darker shade of the same hue; only if unreadable use a darker / lighter shade of the brand colour
        const other = darkBg ? '#141414' : '#FFFFFF', ro = rl(other), rb = rl(b), alt = (Math.max(ro, rb) + 0.05) / (Math.min(ro, rb) + 0.05);
        return { bg: b, fg, ink: '#141414', paper: '#FFFFFF', accent: o.accent ?? (alt >= 2.5 ? other : darkBg ? mix(b, '#FFFFFF', 0.72) : mix(b, '#000000', 0.7)), muted: mix(fg, b, 0.35), ground: 'brand' };
      }
      return null;
    },
    make(F, opt) {
      const th = F.theme, S = { lead: 0.15, push: 0.012, ink: th.fg, paper: th.bg, colors: [th.accent, th.fg], raw: P };
      // whether this version's ground is dark or light: cards, lights, dimming and flashes all follow (dark = glass cards + white light; light = white cards + soft shadows + brand-coloured light)
      const dark = lum(th.fg) > lum(th.bg), LP = dark
        ? { card: 'rgba(255,255,255,.06)', cardLine: 'rgba(255,255,255,.14)', shadow: 'rgba(0,0,0,.35)', spot: 'rgba(255,255,255,.15)', spot2: 'rgba(255,255,255,.04)', floor: 'rgba(255,255,255,.2)', beat: 'rgba(255,250,240,.5)', dim: 'rgba(8,7,6,.66)', flash: th.paper, dip: th.bg, shotShadow: 'rgba(0,0,0,.55)' }
        : { card: '#FFFFFF', cardLine: alpha(th.fg, 0.08), shadow: alpha(th.fg, 0.14), spot: alpha(th.accent, 0.14), spot2: alpha(th.accent, 0.05), floor: alpha(th.fg, 0.1), beat: alpha(th.accent, 0.22), dim: alpha(mix(th.fg, '#000000', 0.3), 0.45), flash: th.accent, dip: th.bg, shotShadow: alpha(th.fg, 0.22) };   // dimming on a light ground = fade to paper colour (not black)
      const leakO = dark ? {} : { color: th.accent, light: true };
      // accent text: if unreadable on this ground (< 3:1), push it darker (light ground) / lighter (dark ground) a little, same hue — orange on a light ground becomes a deeper orange; glows and lights keep the original colour
      const wl = (c) => { const r = rgbOf(c); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r[0]) + 0.7152 * f(r[1]) + 0.0722 * f(r[2]); };
      const cr = (x, y) => { const p = wl(x), q = wl(y); return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05); };
      let accT = th.accent; if (rgbOf(th.accent) && rgbOf(th.bg)) for (let k = 1; k <= 12 && cr(accT, th.bg) < 3; k++) accT = mix(th.accent, dark ? '#FFFFFF' : '#000000', k * 0.05);
      // background: dark ground + a slowly drifting glow (a new position each scene)
      S.bg = (layer, o = {}) => {
        const v = o.variant ?? 0, d = el('div', `inset:0;overflow:hidden;background:${th.bg}`, layer);
        const glow = el('div', `left:-30%;top:-30%;width:160%;height:160%;background:radial-gradient(ellipse 45% 40% at ${[30, 70, 50, 40][v % 4]}% ${[35, 40, 60, 30][v % 4]}%, ${th.accent}${dark ? '33' : '1A'}, transparent 70%)`, d);   // an equally strong glow on a light ground looks like a stain: halve it
        F.add((t) => set(glow, { transform: `translate(${f1(Math.sin(t / 2.6 + v) * F.px(110))}px,${f1(Math.cos(t / 3.4 + v) * F.px(70))}px)` }));
        return { el: d };
      };
      // impact word: slams down as a whole at at (1.3× to 1, red/blue offset), swapped for the next one at until — both are deliberate hard cuts
      S.word = (layer, o) => {
        const until = o.until ?? 1e9, size = o.size ?? 200;
        const items = P.slam(F, layer, { at: o.at, every: until - o.at, items: [{ text: o.text }], size, maxW: o.maxW, y: (o.y ?? F.H / 2) - F.px(size) * 0.5, color: o.color ?? ((o.variant ?? 0) % 2 ? accT : th.fg) });
        F.appear(o.at); if (until < 1e8) F.appear(until);
        // after landing, the word slowly pushes in by itself (launch-film impact words never sit completely still)
        const box = items[0].box; set(box, { transformOrigin: '50% 50%' });
        F.add((t) => { if (t >= o.at && t < until) set(box, { transform: `scale(${(1 + 0.03 * (t - o.at)).toFixed(4)})` }); });
        if (o.kind && o.kind !== 'slam') F.texts[F.texts.length - 1].kind = o.kind;
        return { el: items[0].box, text: items[0].big };
      };
      // line: words float up one by one; P.headline only exits upwards after until (0.5 s + per-word stagger), so start it earlier here
      S.line = (layer, o) => {
        const size = o.size ?? 50, maxW = o.maxW ?? F.W * (F.portrait ? 0.86 : 0.72), n = String(o.text).split(/\s+/).length;
        const until = o.until ?? 1e9, u2 = until < 1e8 ? until - 0.5 - Math.min(0.3, n * 0.03) : undefined;   /* exit = 0.5 s + per-chunk stagger (up to 0.3 s): finishes before until */
        const cx = o.x ?? F.W / 2;   // x = the line's centre (when a list is laid out in a row, each item has its own x)
        const d = P.headline(F, layer, { at: o.at - 0.15, until: u2, html: P.esc(o.text), size, x: cx - maxW / 2, right: F.W - cx - maxW / 2, y: (o.y ?? F.H / 2) - F.px(size) * 0.6, color: th.fg, font: o.font ?? th.fonts.sans, weight: o.weight ?? 500, align: o.align ?? 'center' });
        F.texts[F.texts.length - 1].kind = o.kind ?? 'label';   // headline() always registers as headline; several list lines are on screen together, so register as explanation lines
        if (until < 1e8) F.texts[F.texts.length - 1].win[1] = until;   // the text's exit finishes before until: register with until (so the hold check doesn't misfire because of the early exit)
        if (o.sfx !== false) F.sfx(o.at, 'tick', 0.35);
        return { el: d, text: d };
      };
      // card: a translucent glass panel floating up from below
      const rise = (e, a, until) => F.add((t) => {
        const on = t >= a && t < until; set(e, { display: on ? '' : 'none' }); if (!on) return;
        const q = seg(t, a, a + 0.5, E.expoOut), x = until < 1e8 ? seg(t, until - 0.3, until, E.quartIn) : 0;
        set(e, { opacity: String(Math.min(q * 1.5, 1 - x)), transform: `perspective(${f1(F.px(1600))}px) translateY(${f1((1 - q) * F.px(60) - x * F.px(30))}px) rotateX(${f1((1 - q) * 14)}deg) scale(${(0.96 + 0.04 * q).toFixed(4)})` });
      });
      S.card = (layer, o) => {
        const c = el('div', `left:${f1(o.x - o.w / 2)}px;top:${f1(o.y - o.h / 2)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;box-sizing:border-box;border-radius:${f1(F.px(22))}px;background:${LP.card};border:1px solid ${LP.cardLine};box-shadow:0 ${f1(F.px(40))}px ${f1(F.px(90))}px ${LP.shadow};overflow:hidden;display:none;transform-origin:50% 60%;${o.z !== undefined ? `z-index:${o.z};` : ''}`, layer);
        rise(c, o.at - 0.35, o.until ?? 1e9);
        if (o.sfx !== false) F.sfx(o.at - 0.35, 'whoosh', 0.5, { dur: 0.4, size: 0.4 });
        return { el: c, w: o.w, h: o.h };
      };
      // screenshot: in a browser window (untouched); the window floats up from below, tilted back
      S.shot = (layer, o) => {
        const bar = F.px(44), b = P.browser(F, layer, { x: o.x - o.w / 2, y: o.y - o.h / 2 - bar / 2, w: o.w, h: o.h, url: o.url ?? '' });
        set(b.win, { display: 'none' });
        rise(b.win, o.at - 0.35, o.until ?? 1e9);
        if (o.sfx !== false) F.sfx(o.at - 0.35, 'whoosh', 0.6, { dur: 0.4, size: 0.5 });
        return { el: b.view, w: o.w, h: o.h, img: img(b.view, o), box: { x: o.x - o.w / 2, y: o.y - o.h / 2 + bar / 2, w: o.w, h: o.h } };
      };
      // UI demo: the window stays still and the page inside it pushes in (PROMO.screen); used when the quick version's annotate has zoom: true
      S.screen = (layer, o) => P.screen(F, layer, o);
      // signature move: a light leak sweeps across the frame
      S.accent = (layer, o) => { P.leak(F, o.at - 0.1, { dur: 1.1, ...leakO }); return {}; };
      // transition: alternates flash and dip (at the moment of full cover the frame is all white / all black, and the scene changes there)
      S.wipe = (o) => {
        const i = o.index ?? 0;
        F.cut(o.cover);   // change scene at full cover: registered as an on-beat hard cut
        // cover before the beat, reveal on the beat: covering starts 0.32 s before cover, the last two frames are full (the film check doesn't report "a one-frame flash"), and the cover frame itself is the new scene —
        //   the downbeat lands on the new scene, not on a frame of solid colour. A flash (the heaviest hit, heavy / flash: true) leaves a layer of white on the beat that clears in 0.15 s
        // dip colour: a dark ground dips to its ground (black), a light ground also dips to its ground (off-white) — a full black frame in a light film is jarring
        const flash = o.flash ?? !!o.heavy, color = flash ? LP.flash : LP.dip, e = el('div', `inset:0;background:${color};opacity:0;z-index:800;pointer-events:none`, F.stage);
        e.dataset.motion = 'skip';
        F.add((t) => { const c = o.cover, v = t < c ? E.cubicInOut(seg(t, c - 0.32, c - 0.06)) : flash ? 0.85 * (1 - seg(t, c, c + 0.15, E.expoOut)) : 0; set(e, { opacity: String(v.toFixed(3)) }); });
        if (flash) F.sfx(o.cover - 0.05, 'boom', 0.8); else F.sfx(o.cover - 0.15, 'whoosh', 0.5, { dur: 0.3 });
        return { show: o.cover, hide: o.cover };
      };
      // end card: transparent, so this scene's dark ground and drifting glow stay underneath (switching to a light paper ground would jump the whole frame, and covering the glow would freeze it)
      S.end = (layer, o) => (P.leak(F, o.at - 0.3, { dur: 1.3, ...leakO }), P.endcard(F, layer, { at: o.at, logo: { text: o.title, font: th.fonts.display, weight: 800, size: F.portrait ? 170 : 220 }, tagline: o.tagline, url: o.url, bg: 'transparent', color: th.fg }));   // the end card opens with a light leak sweeping across (so the half second before the logo is written doesn't freeze)
      // ---- Telling information (launch): the camera trucks along the stage step by step; the dark side against the lit side; numbers roll; a spotlight lights one spot on the UI ----
      const muted = th.muted ?? (dark ? '#8a8375' : '#6B665E');
      const fadeText = (layer, text, css, a, b) => { const e = el('div', css + ';opacity:0', layer); e.textContent = text; F.text(e, 'label', text, a - 0.25, b); F.add((t) => { const q = seg(t, a - 0.3, a, E.expoOut); set(e, { opacity: String(Math.min(q, b < 1e8 ? 1 - seg(t, b - 0.2, b) : 1)), transform: `translateY(${f1((1 - q) * F.px(22))}px)` }); }); return e; };
      S.steps = (layer, o) => {
        const { items, T, until, C } = o, n = items.length, gapX = F.W * 0.7, y = C.y + C.h * 0.45, track = el('div', 'left:0;top:0;width:100%;height:100%', layer);
        items.forEach((it, j) => {
          const size = Math.min(F.px(F.portrait ? 120 : 150), (F.W * 0.82) / Math.max(1, estUnits(it.text) * 0.6)), b = j < n - 1 ? T[j + 1] - 0.3 : until;
          fadeText(track, it.text, `left:${f1(F.W / 2 + j * gapX - F.W * 0.45)}px;width:${f1(F.W * 0.9)}px;top:${f1(y - size * 0.6)}px;text-align:center;font:700 ${f1(size)}px/1.05 ${th.fonts.display};letter-spacing:-.02em;color:${it.hot ? accT : th.fg}`, T[j], b);
          if (it.note) fadeText(track, it.note, `left:${f1(F.W / 2 + j * gapX - F.W * 0.4)}px;width:${f1(F.W * 0.8)}px;top:${f1(y + size * 0.7)}px;text-align:center;font:500 ${f1(F.px(40))}px/1.3 ${th.fonts.sans};color:${muted}`, T[j] + 0.15, b);
          if (j) { F.sfx(T[j] - 0.4, j % 2 ? 'whoosh' : 'tick', j % 2 ? 0.45 : 0.4, { dur: 0.35, dir: 1 }); F.blur(T[j] - 0.42, T[j] - 0.05, 10); }
        });
        // camera trucks along the stage: each step stops dead centre as it settles (fast in, fast out)
        F.add((t) => { let x = 0; for (let j = 1; j < n; j++) x += gapX * seg(t, T[j] - 0.42, T[j] - 0.05, E.expoInOut); set(track, { transform: `translateX(${f1(-x)}px)` }); });
        return items.map(() => ({ x: F.W / 2, y }));
      };
      S.versus = (layer, o) => {
        const { cols, T, at2, until, C } = o, m = cols.length, stack = F.portrait;
        return cols.map((col, j) => {
          const cw = stack ? C.w : C.w / m, ch = stack ? C.h / m : C.h, x0 = stack ? C.x : C.x + cw * j, y0 = stack ? C.y + ch * j : C.y, lit = !!col.hot, n2 = (col.points || []).length;
          if (lit) { const g = el('div', `left:${f1(x0)}px;top:${f1(y0)}px;width:${f1(cw)}px;height:${f1(ch)}px;background:radial-gradient(ellipse 62% 56% at 50% 45%, ${th.accent}38, transparent 72%);opacity:0`, layer); F.add((t) => set(g, { opacity: String(seg(t, T[j] - 0.4, T[j] + 0.4)) })); P.leak(F, T[j] - 0.25, { ...leakO, dur: 0.9 }); }
          fadeText(layer, col.title, `left:${f1(x0 + cw * 0.06)}px;width:${f1(cw * 0.88)}px;top:${f1(y0 + ch * 0.1)}px;text-align:center;font:700 ${f1(F.px(stack ? 68 : 84))}px/1.1 ${th.fonts.display};letter-spacing:-.02em;color:${lit ? accT : muted}`, T[j], until);   // dark side vs lit side
          (col.points || []).forEach((pt, r2) => fadeText(layer, ptText(pt), `left:${f1(x0 + cw * 0.06)}px;width:${f1(cw * 0.88)}px;top:${f1(y0 + ch * (stack ? 0.36 : 0.32) + r2 * Math.min(F.px(100), (ch * 0.55) / Math.max(1, n2)))}px;text-align:center;font:500 ${f1(F.px(42))}px/1.25 ${th.fonts.sans};color:${lit ? th.fg : muted}`, at2(j, r2), until));
          if (j) F.sfx(T[j] - 0.1, 'click', 0.4);
          return { x: x0 + cw / 2, y: y0 + ch / 2 };
        });
      };
      S.figures = (layer, o) => {
        const { data, ats, until, C } = o, n = data.length, mx = Math.max(...data.map((d) => d[1])), cols = F.portrait ? Math.min(2, n) : n, rows = Math.ceil(n / cols);
        return data.map(([name, val], j) => {
          const hot = (o.hot || []).includes(j), cw = C.w / cols, rh = C.h / rows, x = C.x + cw * ((j % cols) + 0.5), y = C.y + rh * (Math.floor(j / cols) + 0.4), size = Math.min(F.px(60 + 140 * Math.sqrt(val / mx)), cw * 0.5), dec = o.decimals ?? (Number.isInteger(val) ? 0 : 1);
          const e = el('div', `left:${f1(x - cw / 2)}px;width:${f1(cw)}px;top:${f1(y - size * 0.6)}px;text-align:center;font:700 ${f1(size)}px/1 ${th.fonts.display};letter-spacing:-.02em;color:${hot ? accT : th.fg};opacity:0`, layer);
          P.counter(F, e, { at: ats[j] - 0.55, dur: 0.75, from: 0, to: val, format: (v) => v.toFixed(dec) + (o.unit ?? ''), until });   // number rolls into place
          F.add((t) => set(e, { opacity: String(seg(t, ats[j] - 0.6, ats[j] - 0.4)) }));
          fadeText(layer, String(name), `left:${f1(x - cw / 2)}px;width:${f1(cw)}px;top:${f1(y + size * 0.55)}px;text-align:center;font:500 ${f1(F.px(36))}px/1.25 ${th.fonts.sans};color:${muted}`, ats[j], until);
          return { x, y };
        });
      };
      // spotlight: the rest of the screenshot darkens, only this area is lit (soft edge, no frame); the camera's focus follows
      S.spotlight = (layer, o) => o.regions.map((rg, j) => {
        const a = o.T[j], b = j < o.regions.length - 1 ? o.T[j + 1] : o.until, cx = rg.x + rg.w / 2 - o.box.x, cy = rg.y + rg.h / 2 - o.box.y, rx = rg.w * 0.75 + F.px(50), ry = rg.h * 0.75 + F.px(50);
        const dim = el('div', `left:${f1(o.box.x)}px;top:${f1(o.box.y)}px;width:${f1(o.box.w)}px;height:${f1(o.box.h)}px;z-index:8;pointer-events:none;background:radial-gradient(ellipse ${f1(rx)}px ${f1(ry)}px at ${f1(cx)}px ${f1(cy)}px, transparent 55%, ${LP.dim} 100%);opacity:0`, layer);
        F.add((t) => set(dim, { opacity: String(Math.min(seg(t, a - 0.35, a), b < 1e8 ? 1 - seg(t, b - 0.3, b) : 1)) }));
        F.sfx(a - 0.3, 'whoosh', 0.3, { dur: 0.3 });
        return { x: rg.x + rg.w / 2, y: rg.y + rg.h / 2 };
      });
      // ---- Fast-cut montage (launch): things on a stage, not colour blocks ----
      //   a spotlight in the middle of the stage; each beat one thing drops into the light (src = a real screenshot, otherwise the word itself), its name slams in below;
      //   the camera trucks along the row, earlier ones recede into the dark; grid = pull back at the end, everything in one row (two columns in portrait), names under each — a group photo.
      //   for the old full-screen colour blocks: write look: 'flash' in the cue
      S.anchorY = F.portrait ? 0.11 : 0.12;   // the anchor pill sits at the top, the middle of the stage is left for the things
      S.montage = (layer, o) => {
        const { items, T, until } = o, n = items.length, PT = F.portrait, gridT = o.gridT ?? null;
        const gap = PT ? F.W * 0.7 : F.px(560), cur = F.px(PT ? 440 : 440), y = F.H * (PT ? 0.4 : 0.42), nameY = F.H * (PT ? 0.6 : 0.66), fs = F.px(PT ? 84 : 104);
        const cone = el('div', `inset:0;background:radial-gradient(ellipse ${f1(F.W * (PT ? 0.44 : 0.22))}px ${f1(F.H * (PT ? 0.3 : 0.5))}px at 50% ${PT ? 36 : 36}%, ${LP.spot}, ${LP.spot2} 55%, transparent 75%);opacity:0`, layer);
        const floor = el('div', `left:${f1(F.W / 2 - F.px(300))}px;top:${f1(y + cur * 0.42)}px;width:${f1(F.px(600))}px;height:${f1(F.px(70))}px;border-radius:50%;background:radial-gradient(ellipse at 50% 50%, ${LP.floor}, transparent 70%);opacity:0`, layer);   // on a dark ground a pool of light on the floor, on a light ground a shadow
        const flashL = el('div', `inset:0;background:radial-gradient(ellipse ${f1(F.W * (PT ? 0.5 : 0.28))}px ${f1(F.H * (PT ? 0.34 : 0.6))}px at 50% 40%, ${LP.beat}, transparent 70%);opacity:0;z-index:9`, layer);
        const jc = (t) => { let j = 0; for (let k = 1; k < n; k++) j += seg(t, T[k] - 0.06, T[k] + 0.22, E.expoOut); return j; };
        const gq = (t) => (gridT === null ? 0 : seg(t, gridT, gridT + 0.7, E.expoInOut));
        const cols = PT ? 2 : Math.min(n, n > 6 ? Math.ceil(n / 2) : n), rows = Math.ceil(n / cols), cell = Math.min((F.W * 0.86) / cols, (F.H * (PT ? 0.6 : 0.56)) / rows);
        const team = (k) => ({ x: F.W / 2 + ((k % cols) - (cols - 1) / 2) * cell, y: F.H * (PT ? 0.42 : 0.48) + (Math.floor(k / cols) - (rows - 1) / 2) * cell * 0.95, s: (cell * 0.62) / cur });
        const on0 = T[0] - 0.4;
        // outside the fast-cut window: lights, floor light and flashes all go away (a bare return would freeze the last frame on top of the next shot)
        F.add((t) => { if (t < on0 || t >= until) { set(cone, { opacity: '0' }); set(floor, { opacity: '0' }); set(flashL, { opacity: '0' }); return; } const g = gq(t), q = seg(t, on0, T[0]); set(cone, { opacity: String((q * (1 - 0.7 * g)).toFixed(3)) }); set(floor, { opacity: String((q * (1 - g)).toFixed(3)) }); let pz = 0; for (const tk of T) if (t >= tk) pz = Math.exp(-14 * (t - tk)); set(flashL, { opacity: String((gridT === null || t < gridT ? pz : 0).toFixed(3)) }); });
        items.forEach((it, k) => {
          const w = el('div', `left:0;top:0;width:${f1(cur)}px;height:${f1(cur)}px;display:none;transform-origin:50% 50%;z-index:${10 + k}`, layer);
          let word = null, wfs = 0;
          if (it.src) {   // real screenshot: a glowing screen
            const cw = cur * 1.25, ch = cur * 0.8, card = el('div', `left:${f1((cur - cw) / 2)}px;top:${f1((cur - ch) / 2)}px;width:${f1(cw)}px;height:${f1(ch)}px;border-radius:${f1(F.px(16))}px;overflow:hidden;background:#fff;box-shadow:0 ${f1(F.px(30))}px ${f1(F.px(80))}px ${LP.shotShadow},0 0 0 1px ${LP.cardLine}`, w);
            img(card, { src: it.src, fit: it.fit ?? 'cover' });
          } else {   // no screenshot: the word itself is the thing on stage
            wfs = Math.min(F.px(PT ? 96 : 120), (Math.min(gap, F.W * 0.86) * 0.92) / Math.max(1, estUnits(it.text)));   // estUnits is already a width in units of font size (CJK 1, Latin about 0.58)
            word = el('div', `left:${f1(-cur)}px;width:${f1(cur * 3)}px;top:50%;transform:translateY(-50%);text-align:center;white-space:nowrap;font:700 ${f1(wfs)}px/1.05 ${th.fonts.display};letter-spacing:-.02em;color:${it.hot ? accT : th.fg}`, w);
            word.textContent = it.text ?? '';
            F.text(word, 'slam', it.text ?? '', T[k] - 0.1, until);
          }
          F.add((t) => {
            if (t < on0 || t >= until) { set(w, { display: 'none' }); return; }
            const on = t >= T[k] - 0.2; set(w, { display: on ? '' : 'none' }); if (!on) return;
            const j = jc(t), g = gq(t), lit = Math.max(0, 1 - Math.abs(k - j)), dim = word ? 0.55 : 0.6;
            // the screenshot drops into the light from above; the word slams down in place (1.3× to 1, not dropping from above, so it doesn't pass through the anchor)
            const fall = 1 - seg(t, T[k] - 0.2, T[k], E.expoIn), slam = word ? 0.3 * (1 - seg(t, T[k] - 0.12, T[k] + 0.1, E.expoOut)) : 0, sq = Math.sin(Math.PI * seg(t, T[k], T[k] + 0.28)) * (1 - seg(t, T[k], T[k] + 0.28));
            let x = F.W / 2 + (k - j) * gap, yy = y - (word ? 0 : fall * F.px(PT ? 480 : 420)), sc = (dim + (1 - dim) * lit) * (1 + slam), op = word ? (t < T[k] - 0.12 ? 0 : 0.08 + 0.92 * lit * lit) : 0.25 + 0.75 * lit;
            // group photo: words shrink to fit the cell width (not all shrunk to small type)
            const P2 = team(k), gs = word ? Math.min(0.62, (cell * 0.88) / Math.max(1, wfs * estUnits(it.text))) : P2.s; const gS = 1 - Math.pow(1 - g, 4); x += (P2.x - x) * g; yy += (P2.y - yy) * g; sc += (gs - sc) * gS; op += (1 - op) * g;   // shrink first, then move into place: they don't collide on the way to their cells
            set(w, { transform: `translate(${f1(x - cur / 2)}px,${f1(yy - cur / 2)}px) scale(${(sc * (1 + 0.1 * sq)).toFixed(4)},${(sc * (1 - 0.12 * sq)).toFixed(4)})`, opacity: String(op.toFixed(3)) });
          });
          F.blur(T[k] - 0.2, T[k] + 0.2, 10);
          if (it.src) {   // with a screenshot the name slams in below the light; in the group photo names sit under each piece
            const until1 = k < n - 1 ? T[k + 1] : gridT ?? until;
            const L = el('div', `left:0;right:0;top:${f1(nameY)}px;text-align:center;white-space:nowrap;z-index:30;display:none`, layer);
            const nm = el('div', `position:relative;display:inline-block;font:700 ${f1(fs)}px/1.05 ${th.fonts.display};letter-spacing:-.03em;color:${it.hot ? accT : th.fg}`, L); nm.textContent = it.text ?? '';
            F.text(nm, 'slam', it.text ?? '', T[k], until1);
            F.add((t) => { const on = t >= T[k] && t < until1; set(L, { display: on ? '' : 'none' }); if (on) { const kk = 1 - seg(t, T[k], T[k] + 0.25, E.expoOut); set(nm, { transform: `scale(${(1 + 0.22 * kk).toFixed(4)})`, textShadow: P.rgbSplit(kk, F.px(10)) }); } });
            if (gridT !== null) { const P2 = team(k), at = gridT + 0.75 + k * 0.05;   /* group photo: cards fly into place between gridT … gridT + 0.7, the names come after they settle */ fadeText(layer, it.text ?? '', `left:${f1(P2.x - cell / 2)}px;width:${f1(cell)}px;top:${f1(P2.y + cur * P2.s * 0.45)}px;text-align:center;font:600 ${f1(F.px(28))}px/1.2 ${th.fonts.sans};color:${it.hot ? accT : th.fg};z-index:31`, at, until); }
          }
          F.appear(T[k] - 0.2);   // each cell starts dropping at T[k] - 0.2 (registered as the appear time, so the film check doesn't report a "sudden jump")
          F.sfx(T[k], 'click', 0.4 + 0.3 * (k / Math.max(1, n - 1)), { size: 0.6, cut: true });
        });
        if (gridT !== null) { F.sfx(gridT, 'impact', 0.6); F.blur(gridT, gridT + 0.7, 14); }
      };
      infoKit(F, S, { ink: th.fg, accent: accT, colors: [th.accent, '#7FB7E8', '#E8A07F', '#9BD39B'], font: th.fonts.sans, display: th.fonts.display, weight: 600, line: F.px(5), outline: null, radius: F.px(10), boxInk: th.fg, mark: th.accent, cutSfx: 'click', flashAt: 'corner', flashWeight: 700,
        flashBg: (col) => `background:radial-gradient(ellipse 70% 60% at 70% 30%, rgba(255,255,255,.14), transparent 70%), ${col}` });   // launch: the whole frame filled with one colour, big word in the bottom-left corner
      return S;
    },
  });

  // ======================= Explainer boards in promos: whiteboard / riso / ink =======================
  // The whole film is one board (the explainer engines: WB / RISO / INK), in its own container layer, drawn every frame;
  // the board's own checks join the film's automatic checks, and what the board waits for (ink's stroke-order data) is awaited before rendering starts;
  // with narration the board's own subtitles are used (matching the style) instead of a generic subtitle layer on top. Text written on the board is registered for fact checking (F.fact).
  const hostBoard = (F, make) => {
    if (F._board) return F._board;
    const box = el('div', 'inset:0;z-index:1;overflow:hidden', F.stage);
    const b = make({ T: F.T || EV.timeline(), stage: box, width: F.W, height: F.H, captions: !!F.voiced, chapters: false });
    F.add((t) => b.render(t));
    // slow push: the whole board container scales up steadily (the board's own camera isn't touched — the board check treats writing while the camera moves as a problem);
    //   during a region / section transition it eases back to 1× (the transition itself is moving, so it isn't noticeable). b._pushes = [[start, transition start, transition end], …]
    b._pushes = [];
    box.style.transformOrigin = '50% 45%';
    F.add((t) => {
      if (!b._rate) return;
      let k = 0;
      for (const [s0, a, z] of b._pushes) { if (t < s0) break; k = t < a ? b._rate * (t - s0) : t < z ? b._rate * (a - s0) * (1 - E.cubicInOut((t - a) / (z - a))) : 0; }
      set(box, { transform: k ? `scale(${(1 + k).toFixed(4)})` : '' });
    });
    // the board's "first frame is not a cover" doesn't apply: a promo has its own cover frame (compose's cover)
    F.addLint(() => (b.lint ? b.lint() : []).filter((x) => !/first frame|第一帧/.test(String(x.what))));
    F.prep(() => (b.ready ? b.ready() : null));
    if (F.voiced) F.caps = b.caps || [];
    return (F._board = b);
  };
  // screenshot: board images come from the asset list, so register the file in the list here (path relative to assets/)
  const mediaKey = (src, w, h) => {
    const key = 'kit-' + EV.hashStr(src).toString(36);
    window.MEDIA_ASSETS ??= { images: {}, clips: {} };
    window.MEDIA_ASSETS.images[key] ??= { w: Math.round(w), h: Math.round(h), file: '../' + src };
    return key;
  };
  const gone = (it, until, d = 0.3) => { if (until < 1e8 && it && it.erase) it.erase(until - d, d); return it; };


  // bar chart layout (shared by the three boards, same as the DOM version: x, y is the chart's top-left corner, w, h include values and names)
  const barGeom = (F, o) => { const size = F.px(o.size ?? 40), labH = size * 1.5, base = o.y + o.h - labH, plotH = o.h - labH - size * 1.4, max = o.max ?? Math.max(...o.data.map((d) => d[1])); return { size, labH, base, plotH, max }; };
  const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const hexRGB = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c)); if (!m) return c; const n = parseInt(m[1], 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };
  const fmtNum = (v, o) => (Number.isInteger(v) ? String(v) : v.toFixed(o.decimals ?? 1)) + (o.unit ?? '');

  // ---------- Hand-drawn whiteboard ----------
  // each scene is a new region of the whiteboard, transition = the camera pans over; text is handwritten; signature move = circled with the red pen
  P.kit.register('whiteboard', {
    check: () => window.WB, file: 'whiteboard', pace: { lead: 0.45, hold: 0.7, wipe: 0.95 },
    theme: { bg: '#FAF8F3', fg: '#1F2328', ink: '#1F2328', paper: '#FAF8F3', accent: '#D6342C', muted: '#8A8F98', fonts: { display: '"LXGW WenKai", "Excalifont", cursive', serif: '"LXGW WenKai", serif', sans: '"LXGW WenKai", sans-serif', script: '"Excalifont", "LXGW WenKai", cursive' } },
    make(F, opt) {
      const W = F.W, H = F.H, GAP = W + F.px(700), PEN = opt.pen ?? 'blue', MARK = opt.mark ?? 'red', COLS = ['ink', PEN, MARK, 'green'];   // pen = the second pen (brand-colour marker), mark = the red pen for circling key points
      let region = -1, regionFrom = 0;
      const b = () => hostBoard(F, (o) => WB.board({ ...o, paper: opt.paper ?? 'grid',   // promos default to grid paper: a nearly empty board still visibly moves under the slow push
        seed: opt.seed ?? 'promo', lang: opt.lang ?? (document.documentElement.lang || 'en') }));
      const ox = () => Math.max(0, region) * GAP;
      const S = { lead: 0.45, push: 0, ink: '#1F2328', paper: '#FAF8F3', colors: [opt.pen ?? '#1E5BC6', opt.mark ?? '#D6342C', '#1E8A4C', '#E07B00'] };
      S.board = () => b();   // the board itself (API in styles/<style>/STYLE.md): use it directly for finer control
      // slow push-in within each region (the whiteboard itself doesn't move; without a push the frame would freeze): it pushes the board's container and eases back at transitions
      const drift = (a, z) => { if (z > a + 0.2) b()._pushes.push([a, z, z + 0.9]); };
      S.bg = () => { b()._rate = opt.push ?? 0.018; region++; return { el: null }; };
      const write = (text, o, d, size, extra = {}) => {
        const it = b().text(text, { x: ox() + (o.x ?? W / 2), y: o.y ?? H / 2, size, align: 'center', valign: 'middle', maxWidth: o.maxW, at: o.at - d, dur: d, ...extra });
        F.fact(text, o.at - d, o.until);
        if (o.sfx !== false) F.sfx(o.at - d, 'write', o.gain ?? 0.6, { dur: d });
        return gone(it, o.until ?? 1e9);
      };
      S.word = (layer, o) => ({ el: write(o.text, o, 0.45, F.px(o.size ?? 170), { color: o.color ?? COLS[(o.variant ?? 0) % COLS.length] }) });
      S.line = (layer, o) => ({ el: write(o.text, { ...o, maxW: o.maxW ?? W * (F.portrait ? 0.86 : 0.72) }, 0.45, F.px((o.size ?? 50) * 1.15), { color: 'ink' }) });   // handwriting has thin strokes: it looks a size smaller at the same size, so enlarge 15%
      S.card = (layer, o) => { gone(b().rect(ox() + o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, { at: o.at - 0.4, dur: 0.4 }), o.until ?? 1e9); return { el: el('div', `left:${f1(o.x - o.w / 2)}px;top:${f1(o.y - o.h / 2)}px;width:${f1(o.w)}px;height:${f1(o.h)}px`, layer), w: o.w, h: o.h }; };
      S.shot = (layer, o) => { const ph = b().photo(mediaKey(o.src, o.w, o.h), { x: ox() + o.x, y: o.y, w: o.w, anchor: 'center', valign: 'middle', rotate: o.rot, at: o.at - 0.4 }); if (o.sfx !== false) F.sfx(o.at - 0.4, 'tape', 0.5); const ib = ph.imgBox; return { el: gone(ph, o.until ?? 1e9), box: ib ? { x: ib.x - ox(), y: ib.y, w: ib.w, h: ib.h } : { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h } }; };
      S.accent = (layer, o) => { const r = F.px(o.size ?? 340), until = o.until ?? 1e9; const c = b().circleAround({ x: ox() + o.x - r * 0.95, y: o.y - r * 0.38, w: r * 1.9, h: r * 0.76 }, { at: o.at - 0.1, dur: 0.45, color: MARK }); F.sfx(o.at - 0.1, 'circle', 0.5, { dur: 0.45 }); return until > o.at + 1.2 ? gone(c, until) : c; };
      S.wipe = (o) => {
        // camera first, then writing: the pan ends 0.15 s before the cut point (the next scene's first word starts after the cut point)
        const d = o.dur ?? 0.8, a = o.cover - 0.15 - d;
        drift(regionFrom, a);
        b()._pushes.at(-1) && (b()._pushes.at(-1)[2] = a + d);
        b().camera(a, { x: (region + 1) * GAP + W / 2, y: H / 2, zoom: 1 }, d);
        regionFrom = a + d;
        F.sfx(a, 'pan', 0.6, { dur: d }); F.blur(a, a + d, 10);
        return { show: a, hide: a + d };
      };
      S.end = (layer, o) => {
        const PT = F.portrait, y0 = H * 0.4;
        const t = write(o.title, { at: o.at, y: y0 }, 0.6, F.px(PT ? 150 : 180), { color: 'ink' });
        b().underline(t, { at: o.at + 0.15, color: MARK });
        let y = y0 + F.px(PT ? 190 : 170);
        if (o.tagline) { write(o.tagline, { at: o.at + 2 * F.B, y, maxW: W * 0.86 }, 0.5, F.px(PT ? 54 : 50), { color: 'ink' }); y += F.px(PT ? 120 : 105); }
        if (o.url) { const u = write(o.url, { at: o.at + 3 * F.B, y }, 0.4, F.px(PT ? 64 : 58), { color: PEN }); b().boxAround(u, { at: o.at + 3 * F.B + 0.2, color: MARK }); }
        drift(regionFrom, F.duration + 1);
        F.sfx(o.at + 3 * F.B + 0.3, 'logo', 1);
      };
      // ---- Info verbs (drawing: marker lines and text; fills are light colour blocks) ----
      const X = (x) => ox() + x, TONE = (k) => (k === 1 || k === 'accent' || k === 'mark' ? MARK : k === 2 ? PEN : 'ink');
      const LIGHT = { ink: '#E9E6DF', red: '#F8D4D0', blue: '#D3E1F7', green: '#D2EEDC', orange: '#FBE1C2' };
      const fillPoly = (pts, fill, a, d) => b().polyline(pts.map(([x, y]) => [X(x), y]), { closed: true, fill, color: fill, width: 0.01, at: a, dur: d });
      S.box = (layer, o) => {
        const until = o.until ?? 1e9, a = o.at - 0.8, x = o.x - o.w / 2, y = o.y - o.h / 2;
        if (o.fill !== false) gone(fillPoly(rectPts(x, y, o.w, o.h), o.fill ?? LIGHT[TONE(o.tone)] ?? LIGHT.ink, a, 0.3), until);
        gone(b().rect(X(x), y, o.w, o.h, { color: TONE(o.tone), at: a, dur: 0.35 }), until);
        const tx = o.text ? write(o.text, { ...o, maxW: o.w * 0.86, sfx: false }, 0.4, F.px((o.size ?? 44) * 1.15), { color: 'ink' }) : null;
        if (o.sfx !== false) F.sfx(a, 'write', 0.5, { dur: 0.75 });
        return { el: tx };
      };
      S.label = (layer, o) => ({ el: write(o.text, { ...o, maxW: o.maxW ?? W * 0.3 }, 0.35, F.px((o.size ?? 40) * 1.15), { color: TONE(o.tone), overlap: o.overlap }) });
      S.arrow = (layer, o) => { const a = o.at - 0.4; const it = b().arrow(X(o.from[0]), o.from[1], X(o.to[0]), o.to[1], { color: TONE(o.tone), bend: o.bend ?? 0, head: F.px(28), at: a, dur: 0.4 }); if (o.sfx !== false) F.sfx(a, 'write', 0.4, { dur: 0.4 }); return { el: gone(it, o.until ?? 1e9) }; };
      S.mark = (layer, o) => { const a = o.at - 0.45, box = { x: X(o.x), y: o.y, w: o.w, h: o.h }; const it = o.kind === 'circle' ? b().circleAround(box, { at: a, dur: 0.45, color: MARK }) : b().boxAround(box, { at: a, dur: 0.45, color: MARK }); if (o.sfx !== false) F.sfx(a, 'circle', 0.5, { dur: 0.45 }); return { el: gone(it, o.until ?? 1e9) }; };
      S.bars = (layer, o) => {
        const g = barGeom(F, o), n = o.data.length, gap = o.w / n, bw = gap * 0.56, until = o.until ?? 1e9;
        gone(b().line(X(o.x), g.base, X(o.x + o.w), g.base, { at: o.at - 0.7, dur: 0.3 }), until);
        o.data.forEach(([name, val], i) => {
          const a = o.at + i * (o.every ?? 0.18), hot = (o.hot || []).includes(i), x = o.x + i * gap + (gap - bw) / 2, h = g.plotH * (val / g.max), c = hot ? MARK : PEN;
          gone(fillPoly(rectPts(x, g.base - h, bw, h), LIGHT[c], a - 0.4, 0.3), until);
          gone(b().polyline(rectPts(X(x), g.base - h, bw, h), { closed: true, color: c, at: a - 0.4, dur: 0.35 }), until);
          write(fmtNum(val, o), { at: a, until, x: x + bw / 2, y: g.base - h - g.size * 0.7, sfx: false }, 0.3, g.size * 1.15, { color: hot ? MARK : 'ink' });
          write(String(name), { at: a, until, x: x + bw / 2, y: g.base + g.labH * 0.5, sfx: false }, 0.3, g.size, { color: 'ink' });
          if (o.sfx !== false) F.sfx(a - 0.4, 'write', 0.35, { dur: 0.4 });
        });
        return {};
      };
      S.shape = (layer, o) => {
        const a = o.at - 0.4, until = o.until ?? 1e9, c = TONE(o.tone), fill = o.fill === 'none' ? undefined : o.fill ?? LIGHT[c];
        let it;
        if (o.kind === 'band') {   // band: cell-by-cell coloured marker blocks
          const cs = o.colors ?? S.colors, k = cs.length, sw = o.w / k;
          cs.forEach((col, i) => gone(fillPoly(rectPts(o.x + i * sw, o.y, sw + 1, o.h), col, a + (i * 0.3) / k, 0.2), until));
          it = b().rect(X(o.x), o.y, o.w, o.h, { at: a, dur: 0.35 });
        } else if (o.kind === 'circle') it = b().circle(X(o.x), o.y, o.r ?? o.w / 2, { color: c, fill, at: a, dur: 0.4, turns: 1, drift: 0 });
        else if (o.kind === 'line') it = b().line(X(o.x), o.y, X(o.x2), o.y2, { color: c, at: a, dur: 0.35, dash: o.dash });
        else { if (fill) gone(fillPoly(rectPts(o.x, o.y, o.w, o.h), fill, a, 0.3), until); it = b().rect(X(o.x), o.y, o.w, o.h, { color: c, at: a, dur: 0.35 }); }
        if (o.sfx !== false) F.sfx(a, 'write', 0.4, { dur: 0.4 });
        return { el: gone(it, until) };
      };
      // one fast-cut cell = a sticky note slapped onto the whiteboard (each on top of the last, faster and faster); rect = each note's position when tiled
      S.flash = (layer, o) => {
        const R = o.rect ?? { x: W * 0.18, y: H * 0.16, w: W * 0.64, h: H * 0.6 }, i = o.index ?? 0, jit = o.rect ? 0 : 1;
        const size = Math.min(F.px(o.rect ? 44 : 110), (R.w * 0.8) / Math.max(1, estUnits(o.text)));
        const it = b().note(o.text ?? '', { x: X(R.x + R.w / 2 + jit * [0, -40, 50, -20, 30][i % 5]), y: R.y + R.h * (o.low && !o.rect ? 0.7 : 0.5) + jit * [0, 30, -25, 15, -35][i % 5], anchor: 'center', valign: 'middle', w: R.w, h: R.h * (o.low && !o.rect ? 0.42 : 0.7), size, align: 'center', color: ['yellow', PEN, 'green', 'pink', 'orange'][i % 5], rotate: [-2.5, 2, -1, 3, -3][i % 5], at: o.at - 0.55, dur: 0.55, overlap: true, flash: true });   // 0.4 s to slap on + 0.15 s to write (if dur were only the drop time, the text would never get written)
        F.fact(o.text ?? '', o.at - 0.2, o.end ?? o.until);
        if (o.sfx !== false) F.sfx(o.at - 0.05, 'tape', 0.55, { cut: true });
        return { el: gone(it, o.end ?? 1e9, 0.2) };
      };
      return S;
    },
  });

  // ---------- Riso print ----------
  // each scene is a page, transition = a riso page change (push / ink flood / push-in / roller in turn); text is printed; signature move = a blob of halftone printed behind the word
  P.kit.register('riso', {
    check: () => window.RISO, file: 'riso', pace: { lead: 0.35, hold: 0.8, wipe: 0.8 },
    theme: { bg: '#F3EEE3', fg: '#1F2328', ink: '#1F2328', paper: '#F3EEE3', accent: '#FF48B0', muted: '#6B645A', fonts: { display: '"Archivo Black", "Noto Sans SC", sans-serif', serif: '"Noto Serif SC", serif', sans: '"Noto Sans SC", sans-serif', script: '"Archivo Black", sans-serif' } },
    make(F, opt) {
      const W = F.W, H = F.H, TR = ['roll', 'push', 'flood', 'zoom'];   // the roller is kept for the first page change (start of a big section)
      let pages = 0;
      const b = () => hostBoard(F, (o) => RISO.board({ ...o, palette: opt.palette ?? 'lively', seed: opt.seed ?? 'promo' }));
      const PAL = typeof opt.palette === 'object' ? opt.palette : null, S = { lead: 0.35, push: 0, ink: '#1F2328', paper: PAL?.paper ?? '#F3EEE3', colors: PAL ? [PAL.inks[PAL.roles.main], PAL.inks[PAL.roles.accent], PAL.inks[PAL.roles.base]] : ['#0078BF', '#FF48B0', '#FFE800'] };
      S.board = () => b();   // the board itself (API in styles/<style>/STYLE.md): use it directly for finer control
      S.bg = () => { const bd = b(); if (pages === 0) bd.page(0, { transition: 'cut' }); pages++; return { el: null }; };
      const print = (fn, text, o, d, size, extra = {}) => {
        const it = b()[fn](text, { x: o.x ?? W / 2, y: o.y ?? H / 2, align: 'center', valign: 'middle', size, w: o.maxW, at: o.at - d, dur: d, ...extra });
        F.fact(text, o.at - d, o.until);
        if (o.sfx !== false) F.sfx(o.at - d * 0.5, 'print', o.gain ?? 0.6);
        return gone(it, o.until ?? 1e9);
      };
      S.word = (layer, o) => ({ el: print('title', o.text, o, 0.35, F.px(o.size ?? 150), { ink: (o.variant ?? 0) % 2 ? 'accent' : 'main' }) });
      S.line = (layer, o) => ({ el: print('head', o.text, { ...o, maxW: o.maxW ?? W * (F.portrait ? 0.86 : 0.72) }, 0.3, F.px(o.size ?? 50)) });
      S.card = (layer, o) => { gone(b().rect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, { ink: 'base', at: o.at - 0.35, dur: 0.35 }), o.until ?? 1e9); return { el: el('div', `left:${f1(o.x - o.w / 2)}px;top:${f1(o.y - o.h / 2)}px;width:${f1(o.w)}px;height:${f1(o.h)}px`, layer), w: o.w, h: o.h }; };
      // in riso a screenshot is always separated and printed in ink (the nature of this style): UI screenshots use the screen print method, keeping text and structure clear
      S.shot = (layer, o) => { const im = b().image(mediaKey(o.src, o.w, o.h), { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h, fit: o.fit ?? 'cover', inks: 'screen', at: o.at - 0.4 }); if (o.sfx !== false) F.sfx(o.at - 0.4, 'print', 0.6); return { el: gone(im, o.until ?? 1e9), box: { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h } }; };
      S.accent = (layer, o) => { const r = F.px(o.size ?? 340) * 0.62; const c = b().circle(o.x, o.y, r, { ink: 'accent', fill: 'halftone', light: [o.x - r * 0.5, o.y - r * 0.5], density: [0.05, 0.6], at: o.at - 0.05, dur: 0.4 }); F.sfx(o.at, 'stamp', 0.5); return gone(c, o.until ?? o.at + 1.6); };
      // page change: the roller must finish sweeping the new page's text before it can print (page.end), so it finishes before the cover point; push / flood / push-in can print right after page.start
      S.wipe = (o) => { const i = o.index ?? 0, tr = TR[i % TR.length], a = tr === 'roll' ? o.cover - 0.8 : o.cover - 0.4; b().page(a, { transition: tr, dur: 0.8 }); if (tr === 'flood') F.cut(o.cover);   /* when the ink flood fully covers, the old page's text (visible through the overprint) is swapped in one frame: registered as an on-beat hard cut */ F.sfx(a, tr === 'flood' ? 'flood' : 'roll', 0.7, { dur: 0.8 }); F.blur(a, a + 0.8, 10); return { show: o.cover, hide: o.cover }; };
      S.end = (layer, o) => {
        const PT = F.portrait, y0 = H * 0.4;
        const t = print('title', o.title, { at: o.at, y: y0 }, 0.4, F.px(PT ? 150 : 180), { ink: 'main' });
        b().underline(t, { at: o.at + 0.2 });
        let y = y0 + F.px(PT ? 190 : 170);
        if (o.tagline) { print('head', o.tagline, { at: o.at + 2 * F.B, y, maxW: W * 0.86 }, 0.3, F.px(PT ? 54 : 50)); y += F.px(PT ? 120 : 105); }
        if (o.url) print('title', o.url, { at: o.at + 3 * F.B, y }, 0.3, F.px(PT ? 72 : 64), { ink: 'accent' });
        F.sfx(o.at + 3 * F.B + 0.3, 'logo', 1);
      };
      // ---- Info verbs (printing: base colour block + main-colour text; arrows and circles are solid ink; bar charts use the board's own) ----
      const INKOF = (k) => (k === 1 || k === 'accent' || k === 'mark' ? 'accent' : k === 2 ? 'base' : 'main');
      S.box = (layer, o) => {
        const until = o.until ?? 1e9, a = o.at - 0.45;   // colour block and text take 0.45 s together (printing waits for the page-change roller to finish)
        gone(b().rect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, { ink: o.tone === 1 ? 'accent' : 'base', at: a, dur: 0.2 }), until);
        const tx = o.text ? print('head', o.text, { ...o, maxW: o.w * 0.86, sfx: false }, 0.25, F.px(o.size ?? 44)) : null;
        if (o.sfx !== false) F.sfx(a, 'print', 0.5);
        return { el: tx };
      };
      S.label = (layer, o) => ({ el: print('label', o.text, { ...o, maxW: o.maxW ?? W * 0.3 }, 0.3, F.px(o.size ?? 40), { ink: INKOF(o.tone), overlap: o.overlap }) });
      S.arrow = (layer, o) => { const a = o.at - 0.45; const it = b().arrow(o.from[0], o.from[1], o.to[0], o.to[1], { width: F.px(14), ink: o.tone === undefined ? 'main' : INKOF(o.tone), at: a, dur: 0.45 }); if (o.sfx !== false) F.sfx(a, 'print', 0.4); return { el: gone(it, o.until ?? 1e9) }; };
      S.mark = (layer, o) => {
        const a = o.at - 0.4, pad = F.px(12), sw = F.px(8), x = o.x - pad, y = o.y - pad, w = o.w + 2 * pad, h = o.h + 2 * pad;
        const it = o.kind === 'circle' ? b().ellipse(x + w / 2, y + h / 2, w / 2 + pad, h / 2 + pad, { ink: 'accent', stroke: sw, fill: 'none', at: a, dur: 0.4, enter: 'stamp', annot: true, overlap: true }) : b().rect(x, y, w, h, { ink: 'accent', stroke: sw, fill: 'none', at: a, dur: 0.4, enter: 'stamp', annot: true, overlap: true });
        if (o.sfx !== false) F.sfx(a, 'stamp', 0.45);
        return { el: gone(it, o.until ?? 1e9) };
      };
      S.bars = (layer, o) => {
        const g = barGeom(F, o), every = o.every ?? 0.18;
        const it = b().bars(o.data, { x: o.x, y: g.base, w: o.w, h: g.plotH, max: g.max, unit: o.unit, decimals: o.decimals ?? (o.data.some((d) => !Number.isInteger(d[1])) ? 1 : 0), hot: o.hot, valueSize: g.size, labelSize: g.size * 0.85, stagger: every, at: o.at - 0.6 });
        o.data.forEach(([name, val], i) => { F.fact(String(name), o.at + i * every - 0.3, o.until); F.fact(fmtNum(val, o), o.at + i * every - 0.3, o.until); });
        if (o.sfx !== false) o.data.forEach((d, i) => F.sfx(o.at - 0.35 + i * every, 'print', 0.35));
        return { el: gone(it, o.until ?? 1e9) };
      };
      S.shape = (layer, o) => {
        const a = o.at - 0.4, until = o.until ?? 1e9, ink = INKOF(o.tone ?? 2), fill = o.fill === 'none' ? 'none' : o.halftone ? 'halftone' : 'solid';
        let it;
        if (o.kind === 'band') {   // band: bars of the three inks and the mixes their overprints make (riso only has these inks; any other colour is mapped to the nearest ink)
          const seq = ['main', 'base', 'accent'], k = o.steps ?? 6, sw = o.w / k, parts = [];
          for (let i = 0; i < k; i++) { const u = i / (k - 1); parts.push({ rect: [o.x + i * sw, o.y, sw + 1, o.h], ink: seq[Math.min(2, Math.floor(u * 2.999))] }); if (i % 2 === 1) parts.push({ rect: [o.x + i * sw, o.y, sw + 1, o.h], ink: seq[Math.min(2, Math.floor(u * 2.999) + 1)] ?? 'accent', fill: 'halftone', density: 0.6 }); }
          it = b().sketch(parts, { at: a, dur: 0.5, enter: 'wipe', from: [o.x, o.y + o.h / 2, 0], overlap: true });
        } else if (o.kind === 'circle') it = b().circle(o.x, o.y, o.r ?? o.w / 2, { ink, fill, stroke: fill === 'none' ? F.px(7) : undefined, at: a, dur: 0.4, overlap: true });
        else if (o.kind === 'line') it = b().line(o.x, o.y, o.x2, o.y2, { ink: INKOF(o.tone), width: F.px(6), dash: o.dash, at: a, dur: 0.35, overlap: true });
        else it = b().rect(o.x, o.y, o.w, o.h, { ink, fill, stroke: fill === 'none' ? F.px(7) : undefined, at: a, dur: 0.4, overlap: true });
        if (o.sfx !== false) F.sfx(a, 'print', 0.4);
        return { el: gone(it, until) };
      };
      // one fast-cut cell = a full page of colour + big word (the three inks in turn); this page is removed when the next one is printed
      //   the word is whichever reads best on this ink: knocked out to bare paper, or another ink overprinted (inks multiply, so a light ink on a colour all but vanishes)
      S.flash = (layer, o) => {
        const R = o.rect ?? { x: 0, y: 0, w: W, h: H }, i = o.index ?? 0, ink = ['accent', 'main', 'base'][i % 3], small = !!o.rect, bd = b();
        const size = Math.min(F.px(small ? 44 : 140), (R.w * 0.84) / Math.max(1, estUnits(o.text)));
        const under = bd.col(ink), mul = (c) => { const a = rgbOf(under), q = rgbOf(c); return '#' + a.map((v, k) => Math.round((v * q[k]) / 255).toString(16).padStart(2, '0')).join(''); };
        const best = [{ knock: true, c: bd.P.paper ?? S.paper }, ...['main', 'accent', 'base'].filter((k) => bd.ink(k) !== bd.ink(ink)).map((k) => ({ ink: k, c: mul(bd.col(k)) }))]
          .map((x) => ({ ...x, cr: wcag(x.c, under) })).sort((x, y) => y.cr - x.cr)[0];
        const tx = bd.title(o.text ?? '', { x: R.x + R.w / 2, y: R.y + R.h * (o.low && !small ? 0.72 : 0.5), w: R.w * 0.9, align: 'center', valign: 'middle', size, ink: best.ink ?? 'main', knock: !!best.knock, at: o.at - 0.1, dur: 0.1, enter: 'stamp', overlap: true, flash: true });
        const blk = bd.rect(R.x, R.y, R.w, R.h, { ink, knock: best.knock ? tx : undefined, at: o.at - 0.1, dur: 0.1, enter: 'stamp', overlap: true, annot: true, flash: true });
        F.fact(o.text ?? '', o.at - 0.1, small ? o.end : o.until);
        F.cut(o.at);
        if (o.sfx !== false) F.sfx(o.at - 0.05, 'stamp', 0.5, { cut: true });
        const u = small ? o.end ?? 1e9 : o.until ?? 1e9;
        // the next cell is stamped 0.1 s before its cut and is opaque 0.02 s later: this one goes at that moment, without a fade (inks multiply, so two cards overlapping mix into a third colour with both words)
        if (u < 1e8) [blk, tx].forEach((it) => it.erase(small ? u - 0.06 : u - 0.085, small ? 0.06 : 0.001));
        return { el: tx };
      };
      return S;
    },
  });

  // ---------- Ink wash ----------
  // each scene is a section of the handscroll, transition = move along the scroll / ink wash; big words are brush-written, explanations in kaishu (楷书, regular script); signature move = ink splash
  P.kit.register('ink', {
    check: () => window.INK, file: 'ink', pace: { lead: 0.55, hold: 0.8, wipe: 1.75 },
    theme: { bg: '#EDE3CD', fg: '#1E1B16', ink: '#1E1B16', paper: '#EDE3CD', accent: '#B8322A', muted: '#6B645A', fonts: { display: '"LXGW WenKai", serif', serif: '"LXGW WenKai", serif', sans: '"LXGW WenKai", serif', script: '"LXGW WenKai", serif' } },
    make(F, opt) {
      const W = F.W, H = F.H;
      let n = 0, secFrom = 0;
      const b = () => hostBoard(F, (o) => INK.board({ ...o, seed: opt.seed ?? 'promo' }));
      const S = { lead: 0.5, push: 0, ink: '#1E1B16', paper: '#EDE3CD', colors: ['#1E1B16', '#B8322A'] };
      S.board = () => b();   // the board itself (API in styles/<style>/STYLE.md): use it directly for finer control
      const drift = (a, z, d = 1.2) => { if (z > a + 0.3) b()._pushes.push([a, z, z + d]); };
      S.bg = () => { const bd = b(); bd._rate = opt.push ?? 0.01; if (n === 0) bd.section({ at: 0, transition: 'cut' }); n++; return { el: null }; };
      const brush = (fn, text, o, d, size, extra = {}) => {
        const it = b()[fn](text, { x: o.x ?? W / 2, y: o.y ?? H / 2, size, align: 'center', valign: 'middle', w: o.maxW, at: o.at - d, dur: d, ...extra });
        F.fact(text, o.at - d, o.until);
        if (o.sfx !== false) F.sfx(o.at - d, 'brush', o.gain ?? 0.6, { dur: d });
        return gone(it, o.until ?? 1e9);
      };
      S.word = (layer, o) => ({ el: brush('calli', o.text, o, 0.55, F.px((o.size ?? 160) * 1.15), { font: (o.variant ?? 0) % 2 ? 'xing' : 'brush' }) });   // calligraphy glyphs look a size smaller than a sans
      S.line = (layer, o) => ({ el: brush('text', o.text, { ...o, maxW: o.maxW ?? W * (F.portrait ? 0.86 : 0.72) }, 0.3, F.px((o.size ?? 48) * 1.12)) });
      S.card = (layer, o) => ({ el: el('div', `left:${f1(o.x - o.w / 2)}px;top:${f1(o.y - o.h / 2)}px;width:${f1(o.w)}px;height:${f1(o.h)}px`, layer), w: o.w, h: o.h });
      // screenshot: in colour, with a mounted silk border (not turned into ink greyscale: it must be readable and true to life)
      S.shot = (layer, o) => { const im = b().image(mediaKey(o.src, o.w, o.h), { x: o.x, y: o.y - o.h / 2, w: o.w, h: o.h, align: 'center', tone: 'color', frame: 'mount', at: o.at - 0.4 }); if (o.sfx !== false) F.sfx(o.at - 0.4, 'scroll', 0.5); return { el: gone(im, o.until ?? 1e9), box: { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h } }; };
      S.accent = (layer, o) => { const r = F.px(o.size ?? 340); const sp = b().splash(o.x + r * 0.85, o.y - r * 0.35, F.px(120), { color: 'red', at: o.at + 0.1 }); F.sfx(o.at + 0.1, 'splash', 0.5); return gone(sp, o.until ?? 1e9); };
      // next section: move along the scroll (1.6 s) or ink wash (1.2 s); the cover / arrival moment lines up with the cut point
      S.wipe = (o) => {
        const ink = (o.index ?? 0) % 2 === 1, d = ink ? 1.2 : 1.6, a = o.cover - 0.15 - d;   // camera first, then writing
        drift(secFrom, a, d);
        b().section({ at: a, transition: ink ? 'ink' : 'scroll' });
        secFrom = a + d;
        F.sfx(a, ink ? 'wash' : 'scroll', 0.6, { dur: d });
        return { show: a, hide: a + d };
      };
      S.end = (layer, o) => {
        const PT = F.portrait, y0 = H * 0.4;
        brush('calli', o.title, { at: o.at, y: y0 }, 0.8, F.px(PT ? 150 : 180), { font: 'brush' });
        let y = y0 + F.px(PT ? 200 : 180);
        if (o.tagline) { brush('text', o.tagline, { at: o.at + 2 * F.B, y, maxW: W * 0.86 }, 0.4, F.px(PT ? 54 : 50)); y += F.px(PT ? 115 : 100); }
        if (o.url) brush('text', o.url, { at: o.at + 3 * F.B, y }, 0.3, F.px(PT ? 62 : 56), { color: 'red' });
        if (o.seal) { b().seal(o.seal, { x: W / 2 + F.px(PT ? 300 : 420), y: y0 - F.px(40), size: F.px(110), at: o.at + 4 * F.B }); F.fact(o.seal); F.sfx(o.at + 4 * F.B, 'stamp', 0.7); }
        drift(secFrom, F.duration + 1);
        F.sfx(o.at + 3 * F.B + 0.3, 'logo', 1);
      };
      // ---- Info verbs (brushwork: pale-ink boxes + kaishu; vermilion circles; bars in dry brush; colour as pale washes) ----
      const COLOR = (k) => (k === 1 || k === 'accent' || k === 'mark' ? 'red' : 'ink');
      S.box = (layer, o) => {
        const until = o.until ?? 1e9, a = o.at - 0.95;
        gone(b().shape(rectPts(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h), { tone: o.tone === 1 ? 0.14 : 0.08, width: 5, color: COLOR(o.tone), at: a, dur: 0.6 }), until);
        const tx = o.text ? brush('text', o.text, { ...o, maxW: o.w * 0.86, sfx: false }, 0.35, F.px((o.size ?? 44) * 1.12)) : null;
        if (o.sfx !== false) F.sfx(a, 'brush', 0.5, { dur: 0.95 });
        return { el: tx };
      };
      S.label = (layer, o) => ({ el: brush('text', o.text, { ...o, maxW: o.maxW ?? W * 0.3 }, 0.3, F.px((o.size ?? 40) * 1.12), { color: COLOR(o.tone), overlap: o.overlap }) });
      S.arrow = (layer, o) => { const a = o.at - 0.45; const it = b().arrow(o.from[0], o.from[1], o.to[0], o.to[1], { width: F.px(7), color: COLOR(o.tone), bend: o.bend ?? 0.06, at: a, dur: 0.45 }); if (o.sfx !== false) F.sfx(a, 'brush', 0.4, { dur: 0.45 }); return { el: gone(it, o.until ?? 1e9) }; };
      S.mark = (layer, o) => {
        const a = o.at - 0.45, box = { x: o.x, y: o.y, w: o.w, h: o.h }, pad = F.px(14);
        const it = o.kind === 'circle' ? b().circleAround(box, { at: a, dur: 0.45 }) : b().shape(rectPts(o.x - pad, o.y - pad, o.w + 2 * pad, o.h + 2 * pad), { tone: 0, width: 7, color: 'red', at: a, dur: 0.45, annot: true });
        if (o.sfx !== false) F.sfx(a, 'brush', 0.5, { dur: 0.45 });
        return { el: gone(it, o.until ?? 1e9) };
      };
      S.bars = (layer, o) => {
        const g = barGeom(F, o), every = o.every ?? 0.18;
        const it = b().bars(o.data, { x: o.x, y: g.base, w: o.w, h: g.plotH, max: g.max, unit: o.unit, hot: o.hot, valueSize: g.size, labelSize: g.size * 0.85, stagger: every, at: o.at - 0.75 });
        o.data.forEach(([name, val], i) => { F.fact(String(name), o.at + i * every - 0.3, o.until); F.fact(fmtNum(val, o), o.at + i * every - 0.3, o.until); });
        if (o.sfx !== false) o.data.forEach((d, i) => F.sfx(o.at - 0.45 + i * every, 'brush', 0.35, { dur: 0.5 }));
        return { el: gone(it, o.until ?? 1e9) };
      };
      S.shape = (layer, o) => {
        const a = o.at - 0.6, until = o.until ?? 1e9, color = o.fill && o.fill !== 'none' ? hexRGB(o.fill) : COLOR(o.tone), tone = o.fill === 'none' ? 0 : o.wash ?? 0.35;
        let it;
        if (o.kind === 'band') {   // band: cell-by-cell pale colour washes (colour in ink painting is pale)
          const cs = o.colors ?? ['#B8322A', '#D99A3A', '#C9B84A', '#5E8F5A', '#4A6F9A', '#6A4F8A'], k = cs.length, sw = o.w / k, items = [];
          cs.forEach((c2, i) => items.push(b().shape(rectPts(o.x + i * sw, o.y, sw, o.h), { tone: 0.55, width: 0, color: hexRGB(c2), at: a + (i * 0.4) / k, dur: 0.5 })));
          it = INK.groupOf ? INK.groupOf(items) : { erase: (t, d) => items.forEach((x) => x.erase(t, d)) };
        } else if (o.kind === 'circle') { const r = o.r ?? o.w / 2, pts = []; for (let i = 0; i < 36; i++) pts.push([o.x + r * Math.cos((i / 36) * Math.PI * 2), o.y + r * Math.sin((i / 36) * Math.PI * 2)]); it = b().shape(pts, { smooth: true, tone, width: 6, color, at: a, dur: 0.6 }); }
        else if (o.kind === 'line') it = b().line(o.x, o.y, o.x2, o.y2, { width: 7, color: COLOR(o.tone), bend: 0.01, at: a, dur: 0.4 });
        else it = b().shape(rectPts(o.x, o.y, o.w, o.h), { tone, width: 6, color, at: a, dur: 0.6 });
        if (o.sfx !== false) F.sfx(a, 'brush', 0.4, { dur: 0.6 });
        return { el: gone(it, until) };
      };
      // one fast-cut cell = a drop of ink spreads, the word knocked out white from the ink; this drop goes when the next one falls
      S.flash = (layer, o) => {
        const R = o.rect ?? { x: 0, y: 0, w: W, h: H }, small = !!o.rect, r = Math.min(R.w, R.h) * (small ? 0.3 : o.low ? 0.24 : 0.3);   // the ink bloom ends up 30% larger than the radius: shrink it in a grid cell so edge cells don't leave the frame
        const it = b().blot(R.x + R.w / 2, R.y + R.h * (o.low && !small ? 0.66 : 0.5), r, { text: o.text ?? '', at: o.at - 0.3, dur: 0.3, overlap: true, flash: true });
        F.fact(o.text ?? '', o.at - 0.15, small ? o.end : o.until);
        if (o.sfx !== false) F.sfx(o.at - 0.3, 'splash', 0.5, { cut: true });
        return { el: gone(it, small ? o.end ?? 1e9 : o.until ?? 1e9, 0.12) };
      };
      return S;
    },
  });

  // ======================= Pixel =======================
  P.kit.register('pixel', {
    runtime: 'pixel',
    theme: { bg: '#14142B', fg: '#F4F1E8', ink: '#F4F1E8', paper: '#1A1A36', accent: '#FF4D6D', muted: '#8A8FB0', fonts: { display: '"Fusion Pixel 12px Proportional SC", monospace', serif: '"Fusion Pixel 12px Proportional SC", monospace', sans: '"Fusion Pixel 12px Proportional SC", monospace', script: '"Fusion Pixel 12px Proportional SC", monospace', mono: '"Fusion Pixel 12px Monospaced SC", monospace' } },
    make(F, opt) {
      const X = P.pixel(F, opt), W = F.W, H = F.H, PT = F.portrait, pal = X.colors, U = X.U, snap = (v) => Math.round(v / U) * U;
      const S = { lead: 0.3, push: 0, zoom: false, grid: U, ink: pal.k, paper: pal.box, colors: [pal.a, pal.y, pal.c, pal.g], raw: X };   // zoom: false = the quick version's camera doesn't zoom (only a whole-frame screen shake on punch)
      // background: night mountains / night city / room / space (day palette: day mountains / clouds / room / grid)
      const KINDS = X.palette === 'day' ? [['day', 0], ['day', 1], ['room', 0], ['plain', 0]] : [['night', 0], ['night', 1], ['room', 0], ['space', 0]];
      S.bg = (layer, o = {}) => { const [kind, variant] = KINDS[(o.variant ?? 0) % KINDS.length]; return X.bg(layer, { kind, variant }); };
      S.word = (layer, o) => X.title(layer, { text: o.text, at: o.at, until: o.until, x: o.x ?? W / 2, y: o.y ?? H * 0.42, size: o.size ?? (PT ? 96 : 120), color: o.variant ? 'a' : 'y', maxW: (o.maxW ?? W * 0.88) / F.px(1), kind: o.kind ?? 'slam', sfx: o.sfx });
      S.line = (layer, o) => X.text(layer, { text: o.text, at: o.at, until: o.until, x: o.x ?? W / 2, y: o.y ?? H * 0.68, size: Math.min(60, o.size ?? 48), maxW: (o.maxW ?? W * 0.9) / F.px(1), align: o.align, type: true, kind: o.kind ?? 'label', sfx: o.sfx === 'pulse' ? undefined : o.sfx });
      S.label = (layer, o) => X.text(layer, { text: o.text, at: o.at, until: o.until, x: o.x, y: o.y, size: Math.min(48, o.size ?? 40), maxW: (o.maxW ?? W * 0.3) / F.px(1), align: o.align, color: o.tone === 1 || o.tone === 'accent' ? 'y' : undefined, sfx: false });
      // card: a pixel-bordered panel; screenshot: a pixel window (mosaic first, then sharp; the image itself is untouched)
      S.card = (layer, o) => { const p = X.panel(layer, { x: o.x, y: o.y, w: o.w, h: o.h, at: o.at, until: o.until, sfx: o.sfx }); return { el: p.el, w: p.w, h: p.h }; };
      S.shot = (layer, o) => X.shot(layer, { src: o.src, x: o.x, y: o.y, w: o.w, h: o.h, at: o.at, until: o.until, fit: o.fit, sfx: o.sfx, title: o.title });
      // signature move: blocks burst + a star pops out
      S.accent = (layer, o) => { const x = o.x + F.px((o.size ?? 300) * 0.5), y = o.y - F.px((o.size ?? 300) * 0.3); X.burst(layer, { x, y, at: o.at + 0.05 }); X.item(layer, { art: 'star', x, y, at: o.at + 0.1, until: o.until, enter: 'pop', bob: true, scale: 4, sfx: false }); return {}; };
      S.wipe = (o) => { X.wipe({ at: o.cover, kind: ['blocks', 'iris', 'stairs', 'bars'][(o.index ?? 0) % 4] }); return { show: o.cover, hide: o.cover }; };
      S.end = (layer, o) => X.endcard(layer, { at: o.at, title: o.title, sub: o.tagline, url: o.url });
      // ---- Telling information (pixel): one step after another = a level map (levels, with a marker jumping level to level); contrast = a VS screen; numbers = bars stacked from falling blocks; a spot on the UI = selection corners + everything else dimmed ----
      S.steps = (layer, o) => {
        const { items, T, until, C: R } = o, n = items.length, row = R.w >= R.h * 1.2, node = snap(F.px(row ? 96 : 84));
        const pos = items.map((_, j) => { const q = n === 1 ? 0.5 : j / (n - 1); return row ? { x: R.x + R.w * (0.5 / n + q * (1 - 1 / n)), y: R.y + R.h * (j % 2 ? 0.34 : 0.5) } : { x: R.x + node * 0.8, y: R.y + R.h * (0.5 / n + q * (1 - 1 / n)) }; });
        // the path between levels: dots laid out one by one before the marker reaches the next level
        pos.forEach((p, j) => { if (!j) return; const a = pos[j - 1], steps = Math.max(2, Math.floor(Math.hypot(p.x - a.x, p.y - a.y) / (U * 6))); for (let k = 1; k < steps; k++) { const d = el('div', `left:0;top:0;width:${f1(U * 2)}px;height:${f1(U * 2)}px;background:${pal.e};display:none;z-index:15`, layer); d.dataset.motion = 'skip'; const tk = T[j] - 0.35 + (k / steps) * 0.3, x = a.x + ((p.x - a.x) * k) / steps, y = a.y + ((p.y - a.y) * k) / steps; F.add((t) => { const on = t >= tk && t < until; set(d, { display: on ? '' : 'none' }); if (on) set(d, { transform: `translate(${f1(snap(x - U))}px,${f1(snap(y - U))}px)` }); }); } });
        const out = items.map((it, j) => {
          const p = pos[j], hot = !!it.hot;
          const box = X.panel(layer, { x: p.x, y: p.y, w: node, h: node, at: T[j], until, fill: hot ? 'a' : 'box', sfx: false });
          const num = el('div', `inset:0;display:flex;align-items:center;justify-content:center;font:400 ${f1(F.px(48))}px/1 ${X.mono};color:${pal.w}`, box.el); num.textContent = String(j + 1);
          const lx = row ? p.x : p.x + node / 2 + F.px(36), ly = row ? p.y + node / 2 + F.px(44) : p.y - (it.note ? F.px(30) : 0), mw = row ? (R.w / n) * 0.96 : R.w - node * 1.6 - F.px(40);
          X.text(layer, { text: it.text, at: T[j] + 0.1, until, x: lx, y: ly, align: row ? undefined : 'left', size: 44, maxW: mw / F.px(1), color: hot ? 'y' : undefined, sfx: false });
          if (it.note) X.text(layer, { text: it.note, at: T[j] + 0.35, until, x: lx, y: ly + F.px(64), align: row ? undefined : 'left', size: 36, maxW: mw / F.px(1), color: 'l', sfx: false });
          F.sfx(T[j], hot ? 'coin' : 'select', 0.35);
          return { x: lx, y: ly };
        });
        // marker: a ▼ sits above the current level and jumps from level to level
        const mk = X.item(layer, { art: ['.yyyyy.', '..yyy..', '...y...'], x: pos[0].x, y: pos[0].y - node / 2 - F.px(40), at: T[0], until, enter: 'drop', bob: true, scale: 4, sfx: false });
        pos.forEach((p, j) => { if (j) mk.move(T[j], p.x, p.y - node / 2 - F.px(40), 0.3); });
        return out;
      };
      S.versus = (layer, o) => {
        const { cols, T, at2, until, C: R } = o, m = cols.length, gap = F.px(m === 2 ? 180 : 40), cw = (R.w - gap * (m - 1)) / m;
        if (m === 2) { X.title(layer, { text: 'VS', noFact: true, at: T[1] + 0.05, until, x: R.x + R.w / 2, y: R.y + R.h * 0.42, size: PT ? 84 : 96, color: 'a', sfx: 'hit' }); X.burst(layer, { x: R.x + R.w / 2, y: R.y + R.h * 0.42, at: T[1] + 0.05, sfx: false }); }
        return cols.map((col, j) => {
          const x = R.x + j * (cw + gap) + cw / 2, hot = !!col.hot, ph = R.h * 0.92;
          X.panel(layer, { x, y: R.y + R.h / 2, w: cw, h: ph, at: T[j], until, fill: hot ? shadeOf(pal.a, 0.45) : 'box', border: hot ? 'a' : 'w', sfx: false });
          X.text(layer, { text: col.title, at: T[j] + 0.1, until, x, y: R.y + R.h / 2 - ph / 2 + F.px(64), size: 52, maxW: (cw * 0.86) / F.px(1), color: hot ? 'y' : 'w', sfx: 'select' });
          (col.points || []).forEach((pt, r2) => X.text(layer, { text: '▸ ' + ptText(pt), at: at2(j, r2), until, x: x - cw / 2 + F.px(40), y: R.y + R.h / 2 - ph / 2 + F.px(150) + r2 * F.px(70), align: 'left', size: 40, maxW: (cw - F.px(80)) / F.px(1), type: true, sfx: r2 ? false : undefined }));
          return { x, y: R.y + R.h / 2 };
        });
      };
      S.figures = (layer, o) => {
        const { data, ats, until, C: R } = o, n = data.length, mx = Math.max(...data.map((d) => d[1])), cw = R.w / n, base = snap(R.y + R.h * 0.84), blk = snap(Math.min(cw * 0.42, F.px(84))), maxB = Math.max(3, Math.min(10, Math.floor((R.h * 0.58) / (blk * 0.62))));
        // a strip of ground
        const g = el('div', `left:${f1(R.x)}px;top:${f1(base)}px;width:${f1(R.w)}px;height:${f1(U * 3)}px;background:${pal.e};display:none;z-index:15`, layer); F.add((t) => set(g, { display: t >= ats[0] - 0.3 && t < until ? '' : 'none' }));
        return data.map(([name, val], j) => {
          const x = R.x + cw * (j + 0.5), hot = (o.hot || []).includes(j), nb = Math.max(1, Math.round((maxB * val) / mx)), bh = snap(blk * 0.62), col = hot ? pal.a : [pal.c, pal.g, pal.b, pal.p][j % 4];
          // blocks fall from above one by one and stack into a bar (0.06 s per block)
          for (let k = 0; k < nb; k++) {
            const d = el('div', `left:0;top:0;width:${f1(blk)}px;height:${f1(bh - U)}px;background:${col};box-shadow:inset 0 ${f1(U)}px 0 rgba(255,255,255,.35), inset 0 -${f1(U)}px 0 rgba(0,0,0,.3);display:none;z-index:16`, layer);
            d.dataset.what = 'X.block'; d.dataset.motion = 'snap';
            const ta = ats[j] - 0.6 + (k / nb) * 0.55, y1 = base - (k + 1) * bh;
            F.add((t) => { const on = t >= ta - 0.12 && t < until; set(d, { display: on ? '' : 'none' }); if (on) { const q = Math.min(1, (t - ta + 0.12) / 0.12); set(d, { transform: `translate(${f1(snap(x - blk / 2))}px,${f1(snap(y1 - (1 - q) * F.px(160)))}px)` }); } });
          }
          if (o.sfx !== false) F.sfx(ats[j] - 0.3, 'fill', 0.2, { dur: 0.3 });
          const top = base - nb * bh;
          X.text(layer, { text: fmtNum(val, o), at: ats[j] + 0.05, until, x, y: top - F.px(40), size: 44, color: hot ? 'y' : 'w', sfx: hot ? 'coin' : false, kind: 'label' });
          X.text(layer, { text: String(name), at: ats[j] + 0.15, until, x, y: base + F.px(48), size: 36, maxW: (cw * 0.92) / F.px(1), sfx: false });
          return { x, y: base - (nb * bh) / 2 };
        });
      };
      S.spotlight = (layer, o) => o.regions.map((rg, j) => {
        const a = o.T[j], b = j < o.regions.length - 1 ? o.T[j + 1] : o.until, B = o.box, pad = F.px(16), r = { x: rg.x - pad, y: rg.y - pad, w: rg.w + 2 * pad, h: rg.h + 2 * pad };
        // everything on the screenshot except this area is dimmed (four rectangles); the selection's four corners blink (2 per second); a cursor slides in from the side
        const dims = [[B.x, B.y, B.w, r.y - B.y], [B.x, r.y + r.h, B.w, B.y + B.h - r.y - r.h], [B.x, r.y, r.x - B.x, r.h], [r.x + r.w, r.y, B.x + B.w - r.x - r.w, r.h]].map(([x, y, w, h]) => el('div', `left:${f1(x)}px;top:${f1(y)}px;width:${f1(Math.max(0, w))}px;height:${f1(Math.max(0, h))}px;background:rgba(11,11,22,.6);display:none;z-index:25`, layer));
        const L = snap(Math.min(r.w, r.h) * 0.3), T2 = U * 2, corners = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([cx, cy]) => { const c = el('div', `left:${f1(snap(r.x + cx * (r.w - L)))}px;top:${f1(snap(r.y + cy * (r.h - L)))}px;width:${f1(L)}px;height:${f1(L)}px;display:none;z-index:26;border-${cy ? 'bottom' : 'top'}:${f1(T2)}px solid ${pal.y};border-${cx ? 'right' : 'left'}:${f1(T2)}px solid ${pal.y};box-sizing:border-box`, layer); c.dataset.motion = 'skip'; return c; });
        F.add((t) => { const on = t >= a && t < b; dims.forEach((d) => set(d, { display: on ? '' : 'none' })); corners.forEach((c) => set(c, { display: on && (t < a + 0.6 || Math.floor((t - a) * 4) % 2 === 0) ? '' : 'none' })); });
        F.sfx(a, 'select', 0.35);
        const cur = X.item(layer, { art: ['w.....', 'ww....', 'wWw...', 'wWWw..', 'wWWWw.', 'wWWWWw', 'wwWw..', '...ww.'], x: r.x + r.w + F.px(60), y: r.y + r.h + F.px(60), at: a, until: b, enter: 'none', scale: 3, z: 27, sfx: false });
        cur.move(a + 0.3, r.x + r.w - F.px(10), r.y + r.h - F.px(6), 0.3);
        return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
      });
      infoKit(F, S, { ink: pal.k, accent: pal.a, colors: [pal.a, pal.c, pal.g, pal.p], font: X.font, display: X.font, line: U * 2, outline: null, radius: 0, mark: pal.y, cutSfx: 'select',
        flashBg: (col) => `background:${col}`,
        flashText: (size) => `font-family:${X.font};font-weight:400;text-shadow:${[[-1, 0], [1, 0], [0, -1], [0, 1], [2, 2]].map(([x, y]) => `${f1(x * size / 12)}px ${f1(y * size / 12)}px 0 ${pal.k}`).join(',')}`,
        flashDecor: (bg, col, i, R) => { const k = U * 4; el('div', `left:0;right:0;bottom:0;height:${f1(k * 6)}px;background-image:linear-gradient(45deg, ${pal.k}55 25%, transparent 25%, transparent 75%, ${pal.k}55 75%), linear-gradient(45deg, ${pal.k}55 25%, transparent 25%, transparent 75%, ${pal.k}55 75%);background-size:${f1(k * 2)}px ${f1(k * 2)}px;background-position:0 0, ${f1(k)}px ${f1(k)}px`, bg); } });
      return S;
    },
  });
  const shadeOf = (c, k) => { const r = rgbOf(c); return r ? hexOf(r.map((v) => v * k)) : c; };

  // ======================= Chat log =======================
  // each scene is a chat: big word = a big-text message, line = a message (with "typing…" first), steps = a relay of messages, contrast = two people taking turns, numbers = a poll,
  //   annotated screenshot = highlight boxes on an image message; transition = the whole screen pushes over. Message positions are laid out by the chat itself (x, y unused)
  P.kit.register('chat', {
    runtime: 'chat',
    theme: { bg: '#E9ECF2', fg: '#151821', ink: '#151821', paper: '#FFFFFF', accent: '#4F7CFF', muted: '#7A8191', fonts: { display: '"Noto Sans SC", sans-serif', serif: '"LXGW WenKai", serif', sans: '"Noto Sans SC", sans-serif', script: '"LXGW WenKai", serif', mono: '"Noto Sans SC", sans-serif' } },
    make(F, opt) {
      const C = P.chat(F, opt), th = C.theme, acc = C.accent, ME = opt.me ?? M('我', 'Me'), BRAND = opt.contact ?? M('官方', 'Official');   // default names follow the page's language
      C.cast({ [BRAND]: { color: acc, mark: opt.mark ?? [...BRAND][0] }, [ME]: { me: true } });
      const S = { lead: 0.4, push: 0, ink: th.ink, paper: th.card, colors: [acc, '#F2994A', '#27AE60', '#9B51E0'], raw: C };
      const chatOf = (layer) => layer._chat ?? S.bg(layer)._chat;
      const apps = [];
      S.bg = (layer) => { C.stage(layer); const A = C.app(layer, { at: 0, center: true }), T = A.thread({ title: opt.title ?? BRAND, noFact: !opt.title }); apps.push({ A, T }); layer._chat = { A, T }; return { el: layer, _chat: layer._chat }; };
      const last = (T) => T.items[T.items.length - 1];
      S.word = (layer, o) => { const { T } = chatOf(layer); const it = T.msg(o.at, BRAND, o.text, { big: [...String(o.text)].length <= 8, typing: 0.5, kind: o.kind ?? 'slam' }); return { el: it.bubble }; };
      S.line = (layer, o) => { const { T } = chatOf(layer); const it = T.msg(o.at, BRAND, o.text, { typing: 0.4, kind: o.kind ?? 'label' }); return { el: it.bubble }; };
      S.label = (layer, o) => S.line(layer, o);
      S.card = (layer, o) => { const { T } = chatOf(layer); const it = T.image(o.at, BRAND, { w: o.w / F.px(1), h: o.h / F.px(1) }); return { el: it.bubble, w: it.bubble.offsetWidth || o.w, h: it.bubble.offsetHeight || o.h }; };
      // screenshot: an image message (untouched); the returned box is in the image's own coordinates (top-left 0, 0) — annotations are drawn inside the image message and scroll with the chat
      S.shot = (layer, o) => { const { T } = chatOf(layer); const it = T.image(o.at, BRAND, { src: o.src, w: o.w / F.px(1), h: o.h / F.px(1), fit: o.fit }); layer._shot = it; const w = parseFloat(it.bubble.style.width), h = parseFloat(it.bubble.style.height); return { el: it.bubble, w, h, img: it.bubble.querySelector('img'), box: { x: 0, y: 0, w, h } }; };
      S.accent = (layer, o) => { const { T } = chatOf(layer), it = last(T); if (it && it.react) it.react(o.at + 0.1, '🔥'); return {}; };
      // when the transition fully covers, the previous scene's chat is cleared (otherwise its title stays "present" and the check thinks it overlaps the next scene's text)
      S.wipe = (o) => { C.wipe({ at: o.cover }); for (const x of apps) if (x.A.until > o.cover && x.A.at < o.cover) { x.A.until = o.cover; if (x.T.titleReg) x.T.titleReg.win[1] = Math.min(x.T.titleReg.win[1], o.cover); } return { show: o.cover, hide: o.cover }; };
      // the end card is in the chat too: the group is renamed to the product name (film title), then a slogan and a contact card with the URL are sent — no card floating on a blank
      S.end = (layer, o) => {
        const { T } = chatOf(layer);   // the quick version has already called S.bg on the end-card layer: use that chat
        T.rename(o.at + 0.4, o.title, { by: BRAND });
        if (o.tagline) T.msg(o.at + 1.3, BRAND, o.tagline, { kind: 'endcard' });
        if (o.url) T.msg(o.at + 2.0, BRAND, o.url, { kind: 'endcard', link: true });   // the URL is a normal-size message (small print under the contact card is unreadable on a phone)
        return {};
      };
      // ---- Telling information (chat): relay, taking turns, a poll, highlight boxes on an image ----
      S.steps = (layer, o) => { const { T } = chatOf(layer); T.card(o.T[0] - 0.05, BRAND, { kind: 'list', title: opt.stepsTitle ?? '', items: o.items.map((it2, j) => ({ text: it2.text, note: it2.note, at: o.T[j], hot: it2.hot })), typing: 0.5 }); return o.items.map(() => ({ x: F.W / 2, y: F.H / 2 })); };
      S.versus = (layer, o) => { const { T } = chatOf(layer); return o.cols.map((col, j) => { const who = j % 2 ? ME : BRAND; T.card(o.T[j], who, { kind: 'list', title: col.title, items: (col.points || []).map((pt, r) => ({ text: ptText(pt), at: o.at2(j, r) })) }); return { x: F.W / 2, y: F.H / 2 }; }); };
      S.figures = (layer, o) => { const { T } = chatOf(layer); T.card(o.ats[0] - 0.3, BRAND, { kind: 'poll', title: opt.chartTitle ?? '', options: o.data.map(([n, v]) => [n, v]), unit: o.unit, hot: o.hot || [], ats: o.ats, typing: 0.5 }); return o.data.map(() => ({ x: F.W / 2, y: F.H / 2 })); };
      S.spotlight = (layer, o) => {
        const it = layer._shot; if (!it) return o.regions.map(() => ({ x: F.W / 2, y: F.H / 2 }));
        return o.regions.map((rg, j) => {
          const a = o.T[j], b = j < o.regions.length - 1 ? o.T[j + 1] : o.until, pad = F.px(8);
          const ring = el('div', `left:${f1(rg.x - pad)}px;top:${f1(rg.y - pad)}px;width:${f1(rg.w + 2 * pad)}px;height:${f1(rg.h + 2 * pad)}px;border-radius:${f1(F.px(12))}px;box-shadow:0 0 0 ${f1(F.px(5))}px ${acc}, 0 0 0 ${f1(F.W)}px rgba(0,0,0,.35);display:none;z-index:3`, it.bubble);
          F.add((t) => { const on = t >= a && t < b; set(ring, { display: on ? '' : 'none' }); if (on) set(ring, { opacity: String(Math.min(1, (t - a) / 0.2).toFixed(3)) }); });
          F.sfx(a, 'react', 0.3);
          return { x: F.W / 2, y: F.H / 2 };
        });
      };
      infoKit(F, S, { ink: th.ink, accent: acc, colors: [acc, '#F2994A', '#27AE60', '#9B51E0'], font: C.font, display: C.font, line: F.px(4), outline: null, radius: F.px(28), mark: acc, cutSfx: 'receive',
        flashBg: (col) => `background:${col}`,
        flashDecor: (bg, col, i, R) => el('div', `left:${f1(R.w * 0.08)}px;top:${f1(R.h * 0.12)}px;width:${f1(R.w * 0.5)}px;height:${f1(R.h * 0.18)}px;border-radius:${f1(F.px(40))}px;border-top-left-radius:${f1(F.px(8))}px;background:rgba(255,255,255,.18)`, bg) });
      return S;
    },
  });

  // ======================= Brand colour applied to each style's material (used by P.kit.brand) =======================
  // launch and ASCII have grounds, so the brand colour becomes the accent; ink only has ink and vermilion, unchanged.
  KITS.bauhaus.tint = (c) => {   // constructivism: a dark enough brand colour replaces red (the main colour); a too-light one (yellow, light green) becomes the accent, red and black stay
    const r = rgbOf(c), L = r ? (0.299 * r[0] + 0.587 * r[1] + 0.114 * r[2]) / 255 : 0.5;
    return L < 0.55 ? { kit: { colors: { red: c } }, theme: { accent: c }, color: c } : { kit: { colors: { yellow: c } }, color: c };
  };
  KITS.swiss.tint = (c, o = {}) => {   // swiss: the most vivid mid-tone of brand / accent becomes the one accent (tamed to a poster-ink brightness); a very dark brand colour replaces black (text and the dark ground)
    const cand = [o.brand, o.accent].filter((x) => x && colorful(x)), score = (x) => { const [, sat, l] = hslOf(x); return sat * (1 - Math.abs(l - 0.5) * 2); };
    const best = cand.sort((a, b) => score(b) - score(a))[0] ?? c, acc = tame(best, { s: [0.45, 1], l: [0.38, 0.56] });
    const deep = cand.find((x) => hslOf(x)[2] < 0.22 && hslOf(x)[1] > 0.3);
    return { theme: { accent: acc, ...(deep ? { ink: deep, fg: deep } : {}) }, kit: { accent: acc, ...(deep ? { colors: { ink: deep } } : {}) }, color: acc };
  };
  KITS.blueprint.tint = (c) => { const h = hslOf(c); if (!h || (h[0] > 185 && h[0] < 250) || h[1] < 0.35) return { kit: {}, theme: {}, color: null }; const acc = tame(c, { l: [0.55, 0.68] }); return { kit: { accent: acc }, theme: { accent: acc }, color: acc }; };   // blueprint: a vivid brand colour becomes the pencil (the one accent); blue or grey brands keep the red pencil (a blue pencil vanishes on cyanotype)
  KITS.collage.tint = (c) => { const h = hslOf(c); if (!h || h[1] < 0.3) return { kit: {}, theme: {}, color: null }; const acc = tame(c, { s: [0.45, 0.7], l: [0.36, 0.48] }); return { kit: { colors: { red: acc } }, theme: { accent: acc }, color: acc }; };   // collage: a vivid brand colour becomes the protest-red ink (stamps, hot bars, the big printed word), pulled to a printed-ink saturation; grey / black brands keep the red
  KITS.storybook.tint = (c) => { const h = hslOf(c); if (!h || h[1] < 0.3) return { kit: {}, theme: {}, color: null }; const acc = tame(c, { s: [0.45, 0.75], l: [0.38, 0.55] }); return { kit: { colors: { a: acc } }, theme: { accent: acc }, color: acc }; };   // storybook: a vivid brand colour becomes the cast's accent (its light and deep tones follow), kept dark enough for ink outlines to read; grey / black brands keep teal
  KITS.tapestry.tint = (c) => { const h = hslOf(c); if (!h || h[1] < 0.3) return { kit: {}, theme: {}, color: null }; const acc = tame(c, { s: [0.3, 0.55], l: [0.36, 0.52] }); return { kit: { colors: { red: acc } }, theme: { accent: acc }, color: acc }; };   // tapestry: a vivid brand colour becomes the accent wool (the red: initials, the hero's tunic, marks), pulled to a dyed-wool saturation; grey / black brands keep terracotta
  KITS.grain.tint = (c) => { const h = hslOf(c); if (!h || h[1] < 0.3) return { kit: {}, theme: {}, color: null }; const acc = tame(c, { s: [0.5, 0.8], l: [0.5, 0.64] }); return { kit: { colors: { a: acc } }, theme: { accent: acc }, color: acc }; };   // grain: a vivid brand colour becomes the warm spot colour (its tints and shade follow), pulled to a printable lightness; grey / black brands keep coral and navy
  KITS.chat.tint = (c) => ({ kit: { accent: c }, theme: { accent: c }, color: c });   // chat: the brand colour is "me"'s bubbles, the send button, highlights and the contact card
  KITS.pixel.tint = (c) => ({ kit: { colors: { a: c } }, theme: { accent: c }, color: c });   // pixel: the brand colour is accent a (flag, the hot level, the hot VS side, the dialog name tag); the rest of the palette is unchanged
  KITS.op.tint = (c) => {   // op: the brand colour is the stripe colour, the black/white ground stays; it must be saturated enough to "dazzle"
    const b = tame(c, { s: [0.6, 1], l: [0.4, 0.55] }), rest = ['#F19D38', '#3C82F6', '#54B9A6', '#E8312A'].filter((x) => dE(x, b) > 25).slice(0, 3);
    return { theme: { accent: b }, kit: { accent: b, colors: [b, ...rest] }, color: b };
  };
  KITS.pop.tint = (c) => {   // pop: the brand colour replaces the closest primary, pushed to printing-primary saturation
    const b = tame(c, { s: [0.75, 1], l: [0.45, 0.6] }), base = { red: '#E8312A', blue: '#1E5BD6', pink: '#FF5FA2', cyan: '#2CC6E8', green: '#27C26C', yellow: '#FFE14D' };
    const slot = nearestKey(base, b); return { theme: { accent: slot === 'yellow' ? '#E8312A' : b }, kit: { palette: { [slot]: b }, brand: b }, color: b };
  };
  KITS.cutout.tint = (c) => {   // cutout: the brand colour replaces the closest gouache paper (gouache isn't too vivid: lower the saturation a bit)
    const b = tame(c, { s: [0.35, 0.75], l: [0.35, 0.62] }), base = { blue: '#1F3C9A', red: '#E4533B', yellow: '#F2BF2C', green: '#2E8B4F', rose: '#D9497D' };
    const slot = nearestKey(base, b), others = ['blue', 'red', 'yellow', 'green'].filter((k) => k !== slot).map((k) => base[k]).slice(0, 3);
    return { theme: { accent: b }, kit: { colors: { [slot]: b }, palette: [b, ...others] }, color: b };
  };
  KITS.origami.tint = (c) => {   // origami: the brand colour is one of the coloured papers (paper colours are soft: mix in a little paper white)
    const b = mix(tame(c, { s: [0.25, 0.65], l: [0.3, 0.62] }), '#F5F2ED', 0.1), base = ['#C9563A', '#2F4A5C', '#E3B74F'], j = base.reduce((bi, x, i) => (dE(x, b) < dE(base[bi], b) ? i : bi), 0);
    const papers = ['#F3EEE4', ...base]; papers[j + 1] = b; return { theme: { accent: b }, kit: { papers: [papers[0], b, ...papers.slice(1).filter((x) => x !== b)] }, color: b };
  };
  KITS.whiteboard.tint = (c) => {   // whiteboard: a brand-colour marker (a marker must be dark enough to read); if the brand colour is reddish already, the circling pen becomes blue
    const b = tame(c, { s: [0.45, 0.9], l: [0.25, 0.42] }), reddish = dE(b, '#D6342C') < 30;
    return { theme: { accent: reddish ? '#1E5BC6' : '#D6342C' }, kit: { pen: b, mark: reddish ? '#1E5BC6' : 'red' }, color: b };
  };
  KITS.riso.tint = (c) => {   // riso: only real inks — the brand colour becomes the closest Riso ink, swapped into a ready-made palette in place of its closest ink
    const inkKey = nearestKey(RISO_INKS, c), ink = RISO_INKS[inkKey], PAL = (window.RISO && RISO.PALETTES) || {};
    let best = null; for (const [pn, pal] of Object.entries(PAL)) for (const [ik, hx] of Object.entries(pal.inks)) { const d = dE(hx, ink); if (!best || d < best.d) best = { d, pn, ik }; }
    if (!best) return { kit: {}, color: ink };
    const pal = PAL[best.pn], inks = { ...pal.inks, [best.ik]: ink };
    return { theme: { accent: ink }, kit: { palette: { ...pal, name: `${pal.name} + ${inkKey}`, inks } }, color: ink };
  };
})();
