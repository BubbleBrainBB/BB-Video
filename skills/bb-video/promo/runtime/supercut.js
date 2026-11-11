// supercut.js: the supercut (踩点混剪) style, one of bb-video's visual styles (style notes in styles/supercut/STYLE.md). Load after promo.js.
// One frame: real-world footage filling the frame, hard-cut on the beat, with ONE small caption pill pinned at the centre that persists across
// the cuts — typed on, scrambled, hidden under a colour bar, tinted from the picture under it, with hairline guides running from its edges to
// the frame edges like a design tool's selection box. The eye stays on the pill; the footage carries mood and speed. Around that: a key word
// flashing as giant eroded type, a grid filling cell by cell and multiplying, a held shot with message bubbles, glyph rain, a globe with a ring
// of text, single-word end cards. Footage = licence-clean stills with a move (they read as footage in a 0.2–0.4 s shot) and clips for the holds.
//
//   const S = PROMO.supercut(F, { look: 'film' | 'mono' | 'warm' | 'cool' | 'raw', tone: '#hex' | null, grain: 0–1, soft: px, smear: seconds,
//                                 shake: 0–1, accent: '#hex', seed, fonts: { text, punch, card }, sections: true | false })
//   Times are seconds: put them on the beat grid — S.e(n) = the n-th eighth note (F.beat(n / 2)); a burst subdivides further.
//   A PLATE is what a shot shows: 'key' (an image or clip in assets/manifest.js) | 'shots/x.jpg' (a file path) | '#hex' (a plain ground) |
//     { img | clip | src | color | paint: (ctx, w, h, t) => {}, move: 'auto' | 'push' | 'pull' | 'left' | 'right' | 'up' | 'down' | 'rush' | 'still',
//       amt, speed, focus: [x, y] (0–1), look, flip, from, rate, loop (clips), ui: true (a product screenshot), lum (paint plates: 0–1) }
//
//   SHOTS   S.shot(a, b, plate, { cut, move, smear })          one plate in [a, b); the start is a hard cut
//           S.run(a, b, plates, { unit, pattern })             the sequencer: plates laid on the grid — unit (default an eighth note) × pattern
//                                                              (shot lengths in units, cycled: [1] = every eighth, [1, 1, 2] = short short long) → shots
//           S.burst(a, b, plates, { div, order })              a flash burst: div cuts per beat (default 8 = thirty-second notes); plates are ordered
//                                                              dark → light (or light → dark) so a burst is one ramp of brightness, never a strobe
//           S.hold(a, b, plate, { move })                      a held shot (≥ 1 s, a slow push): where the film says something — add S.bubbles
//           S.standIn(i)                                       a grey stand-in plate, for timing a film before its footage is in
//   TEXT    S.caption({ at, until, text, on | every, reveal, state, states, x, y, size, guides, redact }) → C
//                                                              the pinned pill. text: words split on spaces ('|' splits where there are no spaces, as in
//                                                              Chinese; '\n' = a second line). Word i starts at on[i] (or at + i × every).
//                                                              reveal (one for all, or one per word): 'type' | 'scramble' | 'bar' | 'cut'.
//                                                              state: 'pill' | 'ghost' | 'invert' | 'tag'; C.state(t, name) changes it at t
//           S.punch(at, text, { until, plate, size, color, stop })   the punch word: giant heavy type with noise-eroded edges for a few frames
//           S.bubbles({ at, until, items: [{ text, at }], from, color, ink, x, y, size, grow })   message bubbles over a held plate
//   GRIDS   S.grid({ at, until, n | cols, rows, cells: [plates], every, order, ground, gap, takeover: { cell, at, dur } })
//                                                              cells fill one at a time; one cell can then take over the whole frame
//           S.multiply({ at, until, steps: [1, 2, 4], ats, cells: [plates], ground, gap })   1 → 4 → 16: the frame splits again at every step
//   DRAWN   S.rain({ at, until, glyphs, ground, color, n, size, speed })   glyphs / emoji raining on a plain ground
//           S.globe({ at, until, map: 'image key' (equirectangular) | none, ring, ground, r, grow, spin, tilt, color })   a turning globe, text orbiting it
//           S.cards({ at, words, every, grounds, size, logo: { text | src, font, weight, size, h, ground, invert, blend }, url, until, credits })
//                                                              single-word cards on alternating grounds, then the logo card (an image logo is dark art
//                                                              on white: multiplied onto a light ground, inverted and screened onto a dark one)
//   S.e(n) eighth-note time · S.lumaAt(t) estimated frame brightness · S.shots the shot list (for your own checks)
// Sound events emitted: type (a typed character), scramble, bar (the colour bar lifts), punch (the punch word: impact + sub drop), cell (a grid cell
//   fills), split (the grid multiplies), pop (a bubble), globe (a low swell), card (an end card), logo. Ordinary cuts make no sound: the drums carry them.
// Checks (printed in --check): shot-length spread and holds, caption dwell, large-area flashing, code-drawn share, screenshots, repeats.
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('supercut.js 要在 promo.js 之后加载', 'supercut.js must load after promo.js'));
  const { E, seg, set, el, esc } = P, { clamp, lerp } = window.EV, frameT = P.frameT;
  const NS = 'http://www.w3.org/2000/svg';
  const rnd = (s) => window.EV.rng(s);
  const f1 = (n) => Math.round(n * 10) / 10;
  // ---------- colour ----------
  const parse = (c) => {
    c = String(c || '').trim(); let m = /^#([0-9a-f]{6})$/i.exec(c); if (m) { const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    m = /^#([0-9a-f]{3})$/i.exec(c); if (m) return [...m[1]].map((h) => parseInt(h + h, 16));
    m = /rgba?\(([^)]+)\)/.exec(c); if (m) return m[1].split(',').slice(0, 3).map((v) => parseFloat(v));
    return [128, 128, 128];
  };
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const relLum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const toHsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (d < 1e-4) return [0, 0, l]; const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; };
  const hsl = (h, s, l) => `hsl(${h.toFixed(0)},${(s * 100).toFixed(0)}%,${(l * 100).toFixed(0)}%)`;
  // grades: one of these over every plate is what makes mixed sources read as one film
  const LOOKS = { film: 'contrast(1.1) saturate(.8) brightness(.97) sepia(.14)', mono: 'grayscale(1) contrast(1.18) brightness(.98)', warm: 'contrast(1.06) saturate(.95) sepia(.3) brightness(.98)', cool: 'contrast(1.1) saturate(.75) hue-rotate(-10deg) brightness(.97)', raw: '' };
  const AUTO = ['push', 'left', 'pull', 'right', 'push', 'up', 'pull', 'down'];
  const chars = (s) => Array.from(String(s));

  P.supercut = function (F, opt = {}) {
    const W = F.W, H = F.H, PT = F.portrait, u = F.u, px = (n) => n * u;
    const SEED = window.EV.hashStr(String(opt.seed ?? document.title ?? 'supercut')) % 100000;
    const LOOK = opt.look ?? 'film', SOFT = opt.soft ?? 0.6, SMEAR = opt.smear ?? 0.075, SHAKE = opt.shake ?? 0.5, ACCENT = opt.accent ?? '#3d7bf2';
    const FONT = { text: '"Inter Tight", "Noto Sans SC", sans-serif', weight: 600, punch: '"Inter Tight", "Noto Sans SC", sans-serif', card: '"Inter Tight", "Noto Sans SC", sans-serif', ...(opt.fonts || {}) };
    const media = window.MEDIA_ASSETS || { images: {}, clips: {} }, images = media.images || {}, clips = media.clips || {};
    const S = { F, fonts: FONT, looks: LOOKS, e: (n) => F.beat(n / 2) };
    F.blurBase(opt.blur ?? 4);    // stills move at a constant speed inside a shot: a few sub-frames are enough to smear them like footage
    F.stillMax(1.6);      // a word card and the logo card hold still: that is the medium (the pictures before them never do)

    // ---------- layers ----------
    F.stage.style.background = '#000';
    const platesL = F.layer('overflow:hidden;background:#000', 2), fxL = F.layer('pointer-events:none', 20), overL = F.layer('', 30), uiL = F.layer('', 40), topL = F.layer('', 50);
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.cssText = 'position:absolute'; F.stage.appendChild(svg);
    const defs = document.createElementNS(NS, 'defs'); svg.appendChild(defs);
    // treatment over every plate: an optional colour wash, a soft vignette, grain (a few noise tiles made once, one shown per frame).
    //   The blended layers live inside the plates' own layer: a blend mode only sees what is in its stacking context
    if (opt.tone) { const w = el('div', `inset:0;z-index:900;pointer-events:none;background:${opt.tone};mix-blend-mode:soft-light;opacity:${opt.toneAmt ?? 0.22}`, platesL); w.dataset.motion = 'skip'; }
    const vig = el('div', 'inset:0;background:radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 58%, rgba(0,0,0,.2) 86%, rgba(0,0,0,.42) 100%)', fxL); vig.dataset.motion = 'skip';
    const GRAIN = opt.grain ?? 0.5;
    if (GRAIN > 0) {
      const GR = 1.5, NT = 6, tiles = [], box = el('div', `inset:0;z-index:901;pointer-events:none;mix-blend-mode:overlay;opacity:${(0.6 * GRAIN).toFixed(2)}`, platesL); box.dataset.motion = 'skip';
      for (let k = 0; k < NT; k++) {
        const cv = el('canvas', `left:0;top:0;width:${W}px;height:${H}px;display:none`, box); cv.width = Math.ceil(W / GR); cv.height = Math.ceil(H / GR); cv.dataset.motion = 'skip';
        const g = cv.getContext('2d'), img = g.createImageData(cv.width, cv.height), r = rnd(SEED + k * 7919 + 13);
        for (let i = 0; i < img.data.length; i += 4) { const v = (64 + (r() + r()) * 64) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        g.putImageData(img, 0, 0); tiles.push(cv);
      }
      let last = -1;
      F.add((t) => { const k = Math.floor(t * 24 + 1e-6) % NT; if (k !== last) { if (last >= 0) tiles[last].style.display = 'none'; tiles[k].style.display = ''; last = k; } });
    }
    F.late((t) => { const sh = shotAt(t); set(vig, { opacity: sh && (sh.drawn || sh.kind === 'grid') ? '0' : '1' }); });   // the vignette belongs to a full-frame picture, not to plain grounds or a grid of pictures
    const vnoise = (t, rate, seed) => { const x = t * rate, i = Math.floor(x), f = x - i, a = rnd(i * 131 + seed)(), b = rnd((i + 1) * 131 + seed)(), s = f * f * (3 - 2 * f); return a + (b - a) * s; };

    // ---------- plates ----------
    const norm = (p) => {
      if (p && typeof p === 'object') return p;
      const s = String(p);
      if (clips[s]) return { clip: s }; if (images[s]) return { img: s };
      if (/^(#|rgb|hsl)/i.test(s)) return { color: s };
      if (/\.(jpe?g|png|webp|gif|avif)$/i.test(s)) return { src: s };
      throw new Error(M(`supercut：assets/manifest.js 里没有素材 "${s}"（放进 assets/src/，跑 node explainer/scripts/assets.mjs <项目>；页面要加载 <script src="assets/manifest.js">）`, `supercut: no media "${s}" in assets/manifest.js (put it in assets/src/, run node explainer/scripts/assets.mjs <project>; the page must load <script src="assets/manifest.js">)`));
    };
    // brightness and the colour under the pill, measured once per picture (the caption's ink and the flashing check use them)
    const samples = new Map();
    const sampleOf = (url) => {
      let s = samples.get(url); if (s) return s;
      s = { lum: 0.2, tint: [84, 84, 90], ok: false }; samples.set(url, s);
      F.prep(async () => {
        try {
          const im = new Image(); im.src = url; await im.decode();
          const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, 32, 32);
          const d = g.getImageData(0, 0, 32, 32).data; let L = 0, r = 0, gg = 0, b = 0, n = 0;
          for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const i = (y * 32 + x) * 4; L += relLum([d[i], d[i + 1], d[i + 2]]); if (x >= 8 && x < 24 && y >= 10 && y < 22) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; } }
          s.lum = L / 1024; s.tint = [r / n, gg / n, b / n]; s.ok = true;
        } catch (e) { /* a preview opened from file:// can't read pixels: the neutral default stays */ }
      });
      return s;
    };
    const noCredit = new Set();
    let pid = 0;
    // one plate inside `parent` during win = { a, b } (mutable: a burst sets it once brightness is known); box: null (fills parent) | (t) => { x, y, w, h }
    function mount(parent, p, win, box, o = {}) {
      const id = pid++, r = rnd(SEED + id * 7919 + 3);
      const fx = (p.focus || [0.5, 0.5])[0], fy = (p.focus || [0.5, 0.5])[1];
      const wrap = el('div', `left:0;top:0;width:100%;height:100%;overflow:hidden;display:none;background:${p.color ?? '#0b0b0c'}`, parent);
      const mover = el('div', `inset:0;transform-origin:${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%;will-change:transform`, wrap);
      const look = LOOKS[p.look ?? o.look ?? LOOK] ?? '', base = `${look} ${SOFT > 0 ? `blur(${(SOFT * u).toFixed(2)}px)` : ''}`.trim();
      let info = { lum: 0.2, tint: [84, 84, 90] }, drawn = false, paint = null;
      const pos = `object-position:${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%`;
      if (p.clip) {
        if (!clips[p.clip]) throw new Error(M(`supercut：manifest 里没有视频片段 "${p.clip}"`, `supercut: no clip "${p.clip}" in the manifest`));
        const im = P.clip(F, mover, p.clip, { a: win.a, b: win.b, from: p.from ?? 0, rate: p.rate ?? 1, loop: p.loop }); im.style.objectPosition = `${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%`;
        info = sampleOf(`assets/clips/${p.clip}/${String(Math.min(clips[p.clip].frames, Math.floor((p.from ?? 0) * clips[p.clip].fps) + 1)).padStart(4, '0')}.jpg`);
        if (!clips[p.clip].credit && !noCredit.has(p.clip)) { noCredit.add(p.clip); console.warn(M(`supercut：片段 "${p.clip}" 没有来源 / 许可信息（用 footage.mjs 下载，或在 assets/src/${p.clip}.json 里写 { title, author, licence, url }）`, `supercut: clip "${p.clip}" has no source / licence (fetch it with footage.mjs, or write { title, author, licence, url } in assets/src/${p.clip}.json)`)); }
      } else if (p.img || p.src) {
        const m = p.img ? images[p.img] : null;
        if (p.img && !m) throw new Error(M(`supercut：manifest 里没有图片 "${p.img}"`, `supercut: no image "${p.img}" in the manifest`));
        const url = p.src ?? 'assets/' + m.file;
        const im = el('img', `left:0;top:0;width:100%;height:100%;object-fit:cover;${pos};${p.flip ? 'transform:scaleX(-1)' : ''}`, mover); im.src = url;
        if (m && m.credit) F.credit({ ...m.credit, file: m.file });
        else if (p.img && !noCredit.has(p.img)) { noCredit.add(p.img); console.warn(M(`supercut：图片 "${p.img}" 没有来源 / 许可信息（用 footage.mjs 下载，或在 assets/src/${p.img}.json 里写 { title, author, licence, url }；自己拍的写 { "author": "…", "licence": "own work" }）`, `supercut: image "${p.img}" has no source / licence (fetch it with footage.mjs, or write { title, author, licence, url } in assets/src/${p.img}.json; for your own picture { "author": "…", "licence": "own work" })`)); }
        info = sampleOf(url);
      } else if (p.paint) {
        drawn = true; info = { lum: p.lum ?? 0.3, tint: parse(p.tint ?? '#555555') };
        const cv = el('canvas', 'left:0;top:0;width:100%;height:100%', mover); cv.width = Math.round(W / 2); cv.height = Math.round(H / 2); const g = cv.getContext('2d'); paint = (t) => p.paint(g, cv.width, cv.height, t);
      } else { drawn = true; const c = parse(p.color ?? '#0b0b0c'); info = { lum: relLum(c), tint: c }; }
      const kind0 = p.move ?? o.move ?? 'auto', kind = kind0 === 'auto' ? (drawn ? 'still' : AUTO[(id + Math.floor(r() * 3)) % AUTO.length]) : kind0;
      const pan = kind === 'left' || kind === 'right' || kind === 'up' || kind === 'down', horiz = kind === 'left' || kind === 'right', sgn = kind === 'left' || kind === 'up' ? -1 : 1;
      let fe = null;
      const smearOn = (p.smear ?? o.smear) !== false && SMEAR > 0 && !drawn;
      const rec = { id, wrap, mover, win, get info() { return info; }, drawn, kind, plate: p };
      F.add((t) => {
        const a = win.a, b = win.b, on = t >= a && t < b;
        set(wrap, { display: on ? '' : 'none' }); if (!on) return;
        if (box) { const q = box(t); set(wrap, { left: f1(q.x) + 'px', top: f1(q.y) + 'px', width: f1(q.w) + 'px', height: f1(q.h) + 'px' }); }
        if (paint) paint(t);
        const d = b - a, q = t - a, sp = (p.speed ?? o.speed ?? (d <= 0.7 ? 1 : d <= 1.3 ? 0.5 : 0.16)) * (p.amt ?? 1);   // short shots rush, holds creep
        let s = 1.05, tx = 0, ty = 0;
        if (kind === 'push') s = 1.05 + 0.5 * sp * q;
        else if (kind === 'pull') s = 1.05 + 0.5 * sp * (d - q);
        else if (kind === 'rush') s = 1.05 * Math.pow(1.55, (q / Math.max(d, 0.2)) * (p.amt ?? 1));
        else if (pan) { const v = 0.4 * sp, half = (v * d) / 2, off = sgn * (-half + v * q); s = 1.07 + 2 * half; if (horiz) tx = off; else ty = off; }
        else s = 1.03 + 0.012 * sp * q;
        const sh = (p.shake ?? o.shake ?? SHAKE) * (drawn ? 0 : 1);
        if (sh > 0) { tx += (vnoise(t, 7, id * 17 + 1) - 0.5) * 0.007 * sh; ty += (vnoise(t, 6, id * 17 + 2) - 0.5) * 0.007 * sh; }
        // the shutter smear of a cut: the first frames of a shot land with a streak along its move
        let fstr = base;
        if (smearOn && q < SMEAR && d >= 0.12 && a > 1e-3) {
          const k = Math.pow(1 - q / SMEAR, 2);
          if (pan) {
            if (!fe) { const f = document.createElementNS(NS, 'filter'); f.setAttribute('id', `sc-smear-${id}`); f.setAttribute('x', '-12%'); f.setAttribute('y', '-12%'); f.setAttribute('width', '124%'); f.setAttribute('height', '124%'); f.setAttribute('color-interpolation-filters', 'sRGB'); fe = document.createElementNS(NS, 'feGaussianBlur'); f.appendChild(fe); defs.appendChild(f); }
            const sd = (k * 30 * u).toFixed(1); fe.setAttribute('stdDeviation', horiz ? `${sd} 0` : `0 ${sd}`);
            if (horiz) tx -= sgn * k * 0.02; else ty -= sgn * k * 0.02;
            fstr = `url(#sc-smear-${id}) ${base}`;
          } else { s *= 1 + (kind === 'pull' ? -0.045 : 0.045) * k; fstr = `${look} blur(${(SOFT * u + k * 7 * u).toFixed(2)}px)`; }
        }
        set(mover, { transform: `translate(${(tx * 100).toFixed(3)}%,${(ty * 100).toFixed(3)}%) scale(${s.toFixed(4)})`, filter: fstr || 'none' });
      });
      return rec;
    }

    // ---------- shots ----------
    const shots = []; S.shots = shots;
    const keyOf = (p) => p.key || p.img || p.clip || p.src || (p.paint ? 'paint' : p.color || '#000');
    const addShot = (sh) => { shots.push(sh); return sh; };
    const shotAt = (t) => { let best = null; for (const s of shots) if (t >= s.a && t < s.b && (!best || s.a >= best.a)) best = s; return best; };
    // music sections follow the picture's parts (run / hold / grid / graphic / cards): registered when a part starts on a beat
    const autoSec = opt.sections !== false, offBeatParts = [];
    const section = (at, name, energy, o = {}) => {
      if (!autoSec) return;
      if (Math.abs(at - F.snap(at)) > 0.02) { offBeatParts.push({ at, name }); return; }
      const prev = F.sections.filter((x) => x.at <= at + 1e-3).pop();
      if ((prev && prev.name === name) || F.sections.some((x) => Math.abs(x.at - at) < 1e-3)) return;
      F.section(at, energy, { name, ...o });
    };
    S.shot = (a, b, plate, o = {}) => {
      const p = norm(plate), win = { a, b }, rec = mount(platesL, p, win, null, o);
      if (o.cut !== false && a > 1e-3) F.cut(a);
      return addShot({ get a() { return win.a; }, get b() { return win.b; }, win, lum: () => rec.info.lum, tint: () => rec.info.tint, drawn: rec.drawn, ui: !!(p.ui ?? /(^|\/)shots\//.test(p.src || '')), hold: !!o.hold, key: keyOf(p), kind: o.kind ?? 'plate', rec });
    };
    S.run = (a, b, list, o = {}) => {
      const unit = o.unit ?? F.B / 2, pat = o.pattern ?? [1], out = [];
      if (!list || !list.length) throw new Error(M('supercut：S.run 需要一组素材', 'supercut: S.run needs a list of plates'));
      let t = a, i = 0;
      while (t < b - 1e-6) { let len = pat[i % pat.length] * unit; if (b - t - len < unit * 0.5) len = b - t; out.push(S.shot(t, t + len, list[i % list.length], { move: o.move, cut: i === 0 ? o.cut : undefined, kind: 'run' })); t += len; i++; }
      if (i > list.length) console.warn(M(`supercut：S.run ${a.toFixed(1)}–${b.toFixed(1)}s 有 ${i} 个镜头，只给了 ${list.length} 个素材：素材会重复（再找 ${i - list.length} 个，或者把 pattern 放长）`, `supercut: S.run ${a.toFixed(1)}–${b.toFixed(1)} s has ${i} shots but ${list.length} plates: plates repeat (find ${i - list.length} more, or lengthen the pattern)`));
      section(a, 'run', 3);
      return out;
    };
    S.burst = (a, b, list, o = {}) => {
      const div = o.div ?? 8, unit = F.B / div, n = Math.max(1, Math.round((b - a) / unit)), out = [];
      F.burst(a, b, div);
      for (let i = 0; i < n; i++) out.push(S.shot(a + i * unit, i === n - 1 ? b : a + (i + 1) * unit, list[i % list.length], { smear: false, speed: 1.6, kind: 'burst', cut: i === 0 ? o.cut : undefined }));
      // one ramp of brightness, never a strobe: once the pictures are measured, the slots are handed out in order of brightness
      if (o.order !== 'given' && !out.some((s) => s.rec.plate.clip)) F.prep(() => {
        const slots = out.map((s) => ({ a: s.win.a, b: s.win.b })), up = o.order === 'up' ? true : o.order === 'down' ? false : out[0].lum() <= out[out.length - 1].lum();
        [...out].sort((x, y) => (up ? x.lum() - y.lum() : y.lum() - x.lum())).forEach((s, i) => { s.win.a = slots[i].a; s.win.b = slots[i].b; });
      });
      section(a, 'run', 3);
      return out;
    };
    S.hold = (a, b, plate, o = {}) => {
      const p = norm(plate), sh = S.shot(a, b, { move: 'push', ...p }, { ...o, hold: true, kind: 'hold' });
      F.info(p.clip ? 'clip' : 'photo', a, b);
      section(a, 'hold', 1);
      return sh;
    };

    // a stand-in plate for timing a film before its footage is in: a grey field with a soft light and its number. It counts as code-drawn,
    //   so the footage check keeps complaining until real pictures replace it
    S.standIn = (i = 0) => {
      const r = rnd(SEED + i * 613 + 9), v = 40 + Math.floor(r() * 150), ax = r(), ay = r(), dir = r() * 6.28;
      return { key: `stand-in ${i}`, lum: relLum([v, v, v]), tint: `rgb(${v},${v},${v + 6})`, move: 'still', paint: (g, w, h, t) => {
        const gr = g.createLinearGradient(w / 2 - Math.cos(dir) * w, h / 2 - Math.sin(dir) * h, w / 2 + Math.cos(dir) * w, h / 2 + Math.sin(dir) * h); gr.addColorStop(0, `rgb(${v * 0.55},${v * 0.55},${v * 0.6})`); gr.addColorStop(1, `rgb(${Math.min(255, v * 1.35)},${Math.min(255, v * 1.35)},${Math.min(255, v * 1.4)})`);
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        const bx = (ax + 0.25 * Math.sin(t * 2.1 + i)) * w, by = (ay + 0.2 * Math.cos(t * 1.7 + i)) * h, rg = g.createRadialGradient(bx, by, 0, bx, by, h * 0.6); rg.addColorStop(0, 'rgba(255,255,255,.28)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(255,255,255,.22)'; g.font = `700 ${h * 0.14}px sans-serif`; g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText(String(i), w - h * 0.05, h - h * 0.04);
      } };
    };

    // ---------- the pinned caption pill ----------
    const caps = [], capFits = []; const mctx = document.createElement('canvas').getContext('2d');
    const DIGITS = '0123456789';
    S.caption = (o) => {
      const at = o.at, until = o.until, cx = W * (o.x ?? 0.5), cy = H * (o.y ?? 0.5);
      const lines = String(o.text).split('\n').map((ln) => (ln.includes('|') ? { parts: ln.split('|'), join: '' } : { parts: ln.trim().split(/\s+/), join: ' ' }));
      // the pill is about a tenth of the frame's short side tall; a line too long for the frame (portrait) is set smaller rather than cut off
      let size = px(o.size ?? (PT ? 60 : 70));
      const setFont = () => { mctx.font = `${o.weight ?? FONT.weight} ${size}px ${FONT.text}`; try { mctx.letterSpacing = `${(-0.02 * size).toFixed(2)}px`; } catch (e) { /* older canvas: widths a touch wide */ } };
      setFont(); { const widest = Math.max(...lines.map((ln) => mctx.measureText(ln.parts.join(ln.join)).width)) + size * 0.8, room = W * 0.9; if (widest > room) { size = Math.max(px(34), (size * room) / widest); capFits.push({ at, text: String(o.text), k: room / widest }); } setFont(); }
      const lh = Math.round(size * 1.24), padX = Math.round(size * 0.4), padY = Math.round(size * 0.17), font = `${o.weight ?? FONT.weight} ${size}px ${FONT.text}`;
      const sp = mctx.measureText(' ').width, words = [];
      lines.forEach((ln, li) => { let x = 0; for (const w of ln.parts) { const ww = mctx.measureText(w).width; words.push({ text: w, ch: chars(w), line: li, x, w: ww, prev: Math.max(0, x - (ln.join ? sp : 0)) }); x += ww + (ln.join ? sp : 0); } ln.w = x - (ln.join ? sp : 0); });
      const every = o.every ?? F.B;
      words.forEach((w, i) => { w.at = o.on && o.on[i] !== undefined ? o.on[i] : at + i * every; w.reveal = (Array.isArray(o.reveal) ? o.reveal[i] : o.reveal) ?? 'type'; w.seed = SEED + caps.length * 977 + i * 31; });
      words.forEach((w, i) => {
        const slot = Math.max(0.12, (words[i + 1] ? words[i + 1].at : Math.min(until, w.at + every)) - w.at), n = w.ch.length;
        if (w.reveal === 'type') { w.per = clamp((slot * 0.72) / n, 0.018, 0.06); w.done = w.at + w.per * (n - 1); const k = Math.min(n, Math.max(1, Math.ceil(w.per * n * 14))); for (let j = 0; j < k; j++) F.sfx(w.at + (j * w.per * n) / k, 'type', 0.3); }
        else if (w.reveal === 'scramble') { w.dur = Math.min(0.36, slot * 0.8); w.done = w.at + w.dur; F.sfx(w.at, 'scramble', 0.4, { dur: w.dur }); }
        else if (w.reveal === 'bar') { w.lift = w.at + Math.min(slot * 0.55, F.B / 2); w.done = w.lift + 0.06; F.sfx(w.lift, 'bar', 0.5); }
        else w.done = w.at;
      });
      const box = el('div', `left:0;top:0;display:none;border-radius:${f1(size * 0.3)}px;transform-origin:50% 50%;will-change:transform`, uiL);
      const txt = el('div', `left:${padX}px;top:${padY}px;font:${font};letter-spacing:-.02em;white-space:pre`, box);
      const lineEls = lines.map((ln, li) => el('div', `left:0;top:${li * lh}px;height:${lh}px;line-height:${lh}px`, txt));
      for (const w of words) { w.el = el('span', `left:${f1(w.x)}px;top:0;white-space:pre`, lineEls[w.line]); w.bar = el('div', `left:${f1(w.x - size * 0.03)}px;top:${f1(lh * 0.17)}px;width:${f1(w.w + size * 0.06)}px;height:${f1(lh * 0.68)}px;display:none;transform-origin:100% 50%`, lineEls[w.line]); }
      const plain = lines.map((ln) => ln.parts.join(ln.join)).join(lines.every((ln) => !ln.join) ? '' : ' ');
      F.text(txt, 'label', plain, at, until);
      const states = [[at, o.state ?? 'pill'], ...(o.states || [])].sort((p, q) => p[0] - q[0]);
      const SC = { pill: 1, ghost: 1, invert: 1, tag: o.tagScale ?? 0.46 };
      const cap = { at, until, text: plain, complete: Math.max(...words.map((w) => w.done)), rect: null, guides: o.guides, st: 'pill', words };
      caps.push(cap);
      const minW = size * 0.9;
      F.add((t0) => {
        const on = t0 >= at && t0 < until; set(box, { display: on ? '' : 'none' }); if (!on) { cap.rect = null; return; }
        const t = frameT(t0);
        // the pill makes room for a word as it starts; each line stays centred
        const lw = lines.map(() => 0); let nl = 1;
        for (const w of words) { if (t < w.at) continue; const k = seg(t, w.at, w.at + 0.1, E.expoOut); lw[w.line] = Math.max(lw[w.line], lerp(w.prev, w.x + w.w, k)); nl = Math.max(nl, w.line + k); }
        const curW = Math.max(minW, ...lw), bw = curW + 2 * padX, bh = nl * lh + 2 * padY;
        lineEls.forEach((e, li) => set(e, { left: f1((curW - Math.max(lw[li], li === 0 ? Math.min(minW, curW) : 0)) / 2) + 'px', opacity: li === 0 || lw[li] > 0 ? '1' : '0' }));
        // state and tint
        let si = 0; for (let i = 0; i < states.length; i++) if (states[i][0] <= t + 1e-6) si = i;
        const st = states[si][1], ts = states[si][0], from = si > 0 ? SC[states[si - 1][1]] ?? 1 : 1, sc = si > 0 ? lerp(from, SC[st] ?? 1, seg(t, ts, ts + 0.1, E.expoOut)) : SC[st] ?? 1;
        const sh = shotAt(t), under = sh ? sh.tint(t) : null, uL = sh ? sh.lum(t) : 0.1;
        const [hh, ss] = under ? toHsl(under) : [0, 0], sat = ss < 0.08 ? 0 : Math.min(0.62, ss * 1.25);
        let bg = 'rgba(255,255,255,.97)', ink = hsl(hh, Math.min(0.7, sat * 1.2), 0.19), barC = hsl(hh, Math.min(0.5, sat), 0.4);
        if (st === 'ghost') { bg = 'transparent'; ink = uL > 0.42 ? hsl(hh, sat, 0.13) : '#ffffff'; barC = ink; }
        else if (st === 'invert' || st === 'tag') { bg = '#0b0b0c'; ink = '#ffffff'; barC = '#ffffff'; }
        const inK = seg(t, at, at + 0.08, E.expoOut);
        set(box, { left: f1(cx - bw / 2) + 'px', top: f1(cy - bh / 2) + 'px', width: f1(bw) + 'px', height: f1(bh) + 'px', background: bg, color: ink, transform: `scale(${(sc * lerp(0.86, 1, inK)).toFixed(4)})`, opacity: lerp(0.3, 1, inK).toFixed(3) });
        cap.rect = { x: cx - (bw * sc) / 2, y: cy - (bh * sc) / 2, w: bw * sc, h: bh * sc }; cap.st = st; cap.under = uL;
        for (let wi = 0; wi < words.length; wi++) {
          const w = words[wi]; let s = '', bar = 0;
          if (t >= w.at - 1e-6) {
            if (w.reveal === 'type') { const n = Math.min(w.ch.length, Math.floor((t - w.at) / w.per + 1e-6) + 1), fresh = t - (w.at + (n - 1) * w.per) < 0.03; s = fresh ? esc(w.ch.slice(0, n - 1).join('')) + `<span style="display:inline-block;transform:translateY(.1em);opacity:.6">${esc(w.ch[n - 1])}</span>` : esc(w.ch.slice(0, n).join('')); }
            else if (w.reveal === 'scramble') { const own = w.text.replace(/[\s.,!?，。！？]/g, ''), pool = /[\u3040-\u30ff\u3400-\u9fff]/.test(own) ? own + own + DIGITS : own.toLowerCase() + own.toLowerCase() + DIGITS, fr = Math.floor(t * 15 + 1e-6); s = esc(w.ch.map((c, i) => { const q = rnd(fr * 131 + i * 17 + w.seed); return t >= w.at + w.dur * (0.3 + (0.7 * i) / w.ch.length) || /[\s.,!?，。！？]/.test(c) || q() < 0.35 ? c : pool[Math.floor(q() * pool.length)]; }).join('')); }
            else if (w.reveal === 'bar') { s = t >= w.lift ? esc(w.text) : ''; bar = t < w.lift ? 1 : 1 - seg(t, w.lift, w.lift + 0.06, E.quartOut); }
            else s = esc(w.text);
          }
          for (const rd of o.redact || []) if (rd[2] === wi && t >= rd[0] && t < rd[1] && t >= w.done) bar = 1;
          if (w._s !== s) { w._s = s; w.el.innerHTML = s; }
          set(w.bar, { display: bar > 0 ? '' : 'none', background: barC, transform: `scaleX(${bar.toFixed(3)})` });
        }
      });
      const C = { state: (t, name) => { states.push([t, name]); states.sort((p, q) => p[0] - q[0]); return C; }, cap, box };
      return C;
    };
    // the guides: hairlines from the pill's edges to the frame edges (one solid, one dashed each way), like a selection box in a design tool
    {
      const lw = Math.max(1, Math.round(px(1.5))), mk = (css) => { const e = el('div', `display:none;${css}`, uiL); e.dataset.motion = 'skip'; uiL.insertBefore(e, uiL.firstChild); return e; };
      const dash = (dir, c) => `repeating-linear-gradient(${dir}, ${c} 0 ${f1(px(9))}px, transparent ${f1(px(9))}px ${f1(px(16))}px)`;
      const gl = mk(`top:0;width:${lw}px;height:${H}px`), gr = mk(`top:0;width:${lw}px;height:${H}px`), gt = mk(`left:0;height:${lw}px;width:${W}px`), gb = mk(`left:0;height:${lw}px;width:${W}px`);
      F.late((t) => {
        const cap = caps.find((c) => c.rect && t >= c.at && t < c.until), show = cap && (cap.guides ?? (cap.st === 'pill' || cap.st === 'ghost')) && !cards.some((c) => t >= c.a && t < c.b);
        for (const e of [gl, gr, gt, gb]) set(e, { display: show ? '' : 'none' });
        if (!show) return;
        const c = cap.under > 0.55 ? 'rgba(0,0,0,.34)' : 'rgba(255,255,255,.6)', r = cap.rect;
        set(gl, { left: f1(r.x) + 'px', background: c }); set(gr, { left: f1(r.x + r.w - lw) + 'px', background: dash('180deg', c) });
        set(gt, { top: f1(r.y) + 'px', background: c }); set(gb, { top: f1(r.y + r.h - lw) + 'px', background: dash('90deg', c) });
      });
    }

    // ---------- the punch word ----------
    const punches = [];
    S.punch = (at, text, o = {}) => {
      const b = o.until ?? at + (o.dur ?? F.B / 2);
      if (o.plate) S.shot(at, b, { move: 'rush', ...norm(o.plate) }, { smear: false, kind: 'punch' });
      const cw = Math.round(W / 2), ch = Math.round(H / 2), fam = o.font ?? FONT.punch;
      const src = document.createElement('canvas'); src.width = cw; src.height = ch; const g = src.getContext('2d');
      let fs = ch * (o.size ?? 0.62); g.font = `900 ${fs}px ${fam}`; const tw = g.measureText(text).width, maxW = cw * (PT ? 0.92 : 0.86); if (tw > maxW) fs *= maxW / tw;
      const draw = (c, blur) => { c.clearRect(0, 0, cw, ch); c.filter = blur ? `blur(${blur}px)` : 'none'; c.font = `900 ${fs}px ${fam}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; try { c.letterSpacing = `${(-0.03 * fs).toFixed(1)}px`; } catch (e) { /* older canvas */ } c.fillText(text, cw / 2, ch / 2 + fs * 0.04); c.filter = 'none'; };
      // eroded states, made once: the word's alpha map (blurred) thresholded against seeded noise — heavy erosion first, then legible with rough edges
      const LV = o.levels ?? [[9, 1.5, 0.5], [4.5, 0.95, 0.47], [2.4, 0.72, 0.45], [2.4, 0.72, 0.45]], r = rnd(SEED + punches.length * 4099 + 7), frames = [];
      const coarse = new Float32Array(Math.ceil(cw / 5 + 2) * Math.ceil(ch / 5 + 2)), cwN = Math.ceil(cw / 5 + 2); for (let i = 0; i < coarse.length; i++) coarse[i] = r();
      let cover = 0;
      for (const [blur, amp, th] of LV) {
        draw(g, blur * (cw / 960)); const d = g.getImageData(0, 0, cw, ch), a = d.data; let n = 0;
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
          const i = (y * cw + x) * 4, gx = x / 5, gy = y / 5, x0 = gx | 0, y0 = gy | 0, fxx = gx - x0, fyy = gy - y0;
          const nz = lerp(lerp(coarse[y0 * cwN + x0], coarse[y0 * cwN + x0 + 1], fxx), lerp(coarse[(y0 + 1) * cwN + x0], coarse[(y0 + 1) * cwN + x0 + 1], fxx), fyy) * 0.6 + r() * 0.4;
          const v = a[i + 3] / 255 + (nz - 0.5) * amp > th ? 255 : 0; a[i] = a[i + 1] = a[i + 2] = 255; a[i + 3] = v; if (v) n++;
        }
        const c2 = el('canvas', `left:0;top:0;width:${W}px;height:${H}px;display:none`, overL); c2.width = cw; c2.height = ch; c2.getContext('2d').putImageData(d, 0, 0); frames.push(c2); cover = n / (cw * ch);
      }
      const pc = { a: at, b, cover, text };
      punches.push(pc);
      F.fact(text, at, b);
      F.sfx(at, 'punch', 0.8, { size: 1, dur: Math.max(0.6, (b - at) * 2) });
      if (o.stop !== false) F.musicCue(at, 'stop');
      const fps = (window.__composition && window.__composition.fps) || 30;
      F.add((t) => {
        const fi = Math.floor(((t - at) * fps + 1e-6) / 2), nF = frames.length, k = !(t >= at && t < b) ? -1 : fi < nF ? fi : nF - 2 + ((fi - nF) % 2), on = k >= 0;   // heavy → legible, then the last two states alternate: the edge boils
        const sh = on ? shotAt(t) : null, dark = o.color ? o.color === 'dark' : sh ? sh.lum(t) > 0.62 : false; pc.dark = dark;
        frames.forEach((c, i) => set(c, { display: i === k ? '' : 'none', filter: dark ? 'invert(1)' : 'none', transform: on ? `scale(${(1 + 0.04 * ((t - at) / (b - at))).toFixed(4)})` : 'none' }));
      });
      return pc;
    };

    // ---------- message bubbles over a held plate ----------
    S.bubbles = (o) => {
      const { at, until, items } = o, col = o.color ?? ACCENT; let size = px(o.size ?? (PT ? 56 : 62));
      { mctx.font = `500 ${size}px ${FONT.text}`; try { mctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ } const widest = Math.max(...items.map((it) => mctx.measureText(it.text).width)) + size * 1.24, room = W * 0.86 / (o.grow ?? 1.14); if (widest > room) size = Math.max(px(32), (size * room) / widest); }
      const ink = o.ink ?? (relLum(parse(col)) > 0.5 ? '#111' : '#fff');
      const font = `500 ${size}px ${FONT.text}`, gap = size * 0.32, bh = size * 1.72, padX = size * 0.62;
      mctx.font = font; try { mctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
      const ws = items.map((it) => mctx.measureText(it.text).width + padX * 2), gw = Math.max(...ws), gh = items.length * bh + (items.length - 1) * gap + (o.from ? size * 0.9 : 0);
      const grp = el('div', `left:${f1(W * (o.x ?? 0.5) - gw / 2)}px;top:${f1(H * (o.y ?? 0.46) - gh / 2)}px;width:${f1(gw)}px;height:${f1(gh)}px;transform-origin:50% 50%;display:none`, overL);
      let y = 0;
      if (o.from) { const lb = el('div', `left:${f1(padX * 0.6)}px;top:0;font:500 ${f1(size * 0.56)}px/1.2 ${FONT.text};color:rgba(255,255,255,.72);white-space:nowrap;text-shadow:0 0 ${f1(px(8))}px rgba(0,0,0,.35)`, grp, esc(o.from)); F.text(lb, 'label', o.from, at, until, { chrome: true }); y = size * 0.9; }
      const right = o.side === 'right';
      const bs = items.map((it, i) => {
        const t0 = it.at ?? at + i * F.B, e = el('div', `${right ? `right:0` : 'left:0'};top:${f1(y + i * (bh + gap))}px;height:${f1(bh)}px;width:${f1(ws[i])}px;border-radius:${f1(bh * 0.5)}px;${right ? 'border-bottom-right-radius' : 'border-bottom-left-radius'}:${f1(bh * 0.14)}px;background:${col};transform-origin:${right ? '100%' : '0%'} 100%;opacity:0;box-shadow:0 ${f1(px(6))}px ${f1(px(22))}px rgba(0,0,0,.18)`, grp);
        const s = el('div', `left:0;right:0;top:0;text-align:center;font:${font};line-height:${f1(bh)}px;color:${ink};white-space:nowrap`, e, esc(it.text));
        F.text(s, 'label', it.text, t0, until); F.sfx(t0, 'pop', 0.6); F.info('annotate', t0, until);
        return { e, t0 };
      });
      F.add((t) => {
        const on = t >= at && t < until; set(grp, { display: on ? '' : 'none' }); if (!on) return;
        set(grp, { transform: `scale(${lerp(1, o.grow ?? 1.14, seg(t, at, until)).toFixed(4)})` });
        for (const b of bs) { const q = seg(t, b.t0, b.t0 + 0.28, E.spring); set(b.e, { opacity: seg(t, b.t0, b.t0 + 0.08).toFixed(3), transform: `scale(${lerp(0.84, 1, q).toFixed(4)})` }); }
      });
      return grp;
    };

    // ---------- grids ----------
    const cellBox = (cols, rows, i, gap) => { const cw = (W - gap * (cols - 1)) / cols, chh = (H - gap * (rows - 1)) / rows, c = i % cols, r = Math.floor(i / cols); return { x: c * (cw + gap), y: r * (chh + gap), w: cw, h: chh }; };
    S.grid = (o) => {
      const { at, until, cells } = o, cols = o.cols ?? o.n ?? 2, rows = o.rows ?? o.n ?? 2, N = cols * rows, gap = px(o.gap ?? 0), every = o.every ?? F.B / 2, ground = o.ground ?? '#ffffff';
      const box = el('div', `inset:0;display:none;background:${ground}`, platesL), gL = relLum(parse(ground));
      let order = o.order;
      if (!Array.isArray(order)) { order = Array.from({ length: N }, (_, i) => i); if (o.order !== 'seq') { const r = rnd(SEED + shots.length * 53 + 11); for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } } }
      const tk = o.takeover, recs = [];
      order.slice(0, Math.min(N, cells.length)).forEach((ci, k) => {
        const t0 = (o.ats && o.ats[k]) ?? at + k * every, b0 = cellBox(cols, rows, ci, gap), isT = tk && tk.cell === k, win = { a: t0, b: isT ? until : tk ? tk.at + (tk.dur ?? 0.1) : until };
        const fn = isT ? (t) => { const q = seg(t, tk.at, tk.at + (tk.dur ?? 0.1), E.expoOut); return { x: lerp(b0.x, 0, q), y: lerp(b0.y, 0, q), w: lerp(b0.w, W, q), h: lerp(b0.h, H, q) }; } : () => b0;
        const rec = mount(box, norm(cells[k]), win, fn, { speed: 0.5, smear: false }); if (isT) rec.wrap.style.zIndex = 5;
        recs.push({ rec, t0, area: (b0.w * b0.h) / (W * H), isT }); F.appear(t0); if (k > 0 || o.cut === false) F.sfx(t0, 'cell', 0.5);
      });
      if (o.cut !== false && at > 1e-3) F.cut(at);
      if (tk) { F.transition(tk.at, tk.at + (tk.dur ?? 0.1) + 0.02); F.sfx(tk.at, 'split', 0.6); }
      F.info('photo', at, until);
      F.add((t) => set(box, { display: t >= at && t < until ? '' : 'none' }));
      const tRec = recs.find((x) => x.isT);
      section(at, 'grid', 3);
      return addShot({ a: at, b: until, lum: (t) => { if (tRec && t >= tk.at) return tRec.rec.info.lum; let L = gL, A = 0; for (const x of recs) if (t >= x.t0) { L += x.area * (x.rec.info.lum - gL); A += x.area; } return L; }, tint: (t) => (tRec && t >= tk.at ? tRec.rec.info.tint : null), drawn: false, ui: false, hold: until - at >= 1.2, key: 'grid', kind: 'grid', cells: recs, fills: recs.length });
    };
    S.multiply = (o) => {
      const { at, until, cells } = o, steps = o.steps ?? [1, 2, 4], gap = px(o.gap ?? 0), ground = o.ground ?? '#000000';
      const ats = o.ats ?? steps.map((_, i) => at + ((until - at) * i) / steps.length), box = el('div', `inset:0;display:none;background:${ground}`, platesL);
      F.add((t) => set(box, { display: t >= at && t < until ? '' : 'none' }));
      let k = 0; const out = [];
      steps.forEach((n, si) => {
        const a = ats[si], b = ats[si + 1] ?? until, recs = [];
        for (let i = 0; i < n * n; i++, k++) { const b0 = cellBox(n, n, i, gap); recs.push(mount(box, norm(cells[k % cells.length]), { a, b }, () => b0, { speed: n === 1 ? 1 : 0.6, smear: n === 1 })); }
        if (a > 1e-3) F.cut(a); if (si > 0) F.sfx(a, 'split', 0.7);
        out.push(addShot({ a, b, lum: () => recs.reduce((s, r) => s + r.info.lum, 0) / recs.length, tint: () => (n === 1 ? recs[0].info.tint : null), drawn: false, ui: false, hold: false, key: 'multiply' + n, kind: 'grid', cells: recs }));
      });
      if (k > cells.length) console.warn(M(`supercut：S.multiply 要 ${k} 格，只给了 ${cells.length} 个素材：会重复`, `supercut: S.multiply needs ${k} cells but got ${cells.length} plates: they repeat`));
      F.info('photo', at, until);
      section(at, 'grid', 3);
      return out;
    };

    // ---------- code-drawn shots: glyph rain, the globe ----------
    S.rain = (o) => {
      const { at, until } = o, ground = o.ground ?? '#fbfaf6', glyphs = o.glyphs ?? ['$'], n = o.n ?? (PT ? 40 : 52), size = px(o.size ?? 64), speed = o.speed ?? 1.0;
      const L = el('div', `inset:0;display:none;background:${ground}`, platesL), cv = el('canvas', `left:0;top:0;width:${W}px;height:${H}px`, L); cv.width = W; cv.height = H; const g = cv.getContext('2d');
      const r = rnd(SEED + shots.length * 71 + 5), col = o.color ?? (relLum(parse(ground)) > 0.5 ? '#141414' : '#ffffff');
      const drops = Array.from({ length: n }, () => ({ x: r(), sz: 0.55 + r() * 0.75, sp: 0.75 + r() * 0.6, g: glyphs[Math.floor(r() * glyphs.length)], rot: (r() - 0.5) * 0.5, delay: r() * Math.min(0.45, (until - at) * 0.3) }));
      F.add((t) => {
        const on = t >= at && t < until; set(L, { display: on ? '' : 'none' }); if (!on) return;
        g.clearRect(0, 0, W, H); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col;
        for (const d of drops) {
          const q = t - at - d.delay; if (q < 0) continue;
          const y = (-0.1 + ((q * speed * d.sp) % 1.25)) * H, s = size * d.sz;
          g.save(); g.translate(d.x * W, y); g.rotate(d.rot); g.font = `${o.weight ?? 600} ${s.toFixed(1)}px ${o.font ?? FONT.text}`; g.fillText(d.g, 0, 0); g.restore();
        }
      });
      if (at > 1e-3) F.cut(at);
      section(at, 'graphic', 2);
      const c = parse(ground);
      return addShot({ a: at, b: until, lum: () => relLum(c), tint: () => c, drawn: true, ui: false, hold: until - at >= 1.2, key: 'rain', kind: 'rain' });
    };
    S.globe = (o) => {
      const { at, until } = o, ground = o.ground ?? '#000000', D = 400;
      const L = el('div', `inset:0;display:none;background:${ground}`, platesL), cv = el('canvas', `left:0;top:0;width:${W}px;height:${H}px`, L); cv.width = W; cv.height = H; const g = cv.getContext('2d');
      const sph = document.createElement('canvas'); sph.width = sph.height = D; const sg = sph.getContext('2d'), out = sg.createImageData(D, D);
      const Nn = new Float32Array(D * D * 3), Al = new Uint8Array(D * D);
      for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) { const nx = ((x + 0.5) / D) * 2 - 1, ny = ((y + 0.5) / D) * 2 - 1, r2 = nx * nx + ny * ny, i = y * D + x; if (r2 > 1) continue; Nn[i * 3] = nx; Nn[i * 3 + 1] = ny; Nn[i * 3 + 2] = Math.sqrt(1 - r2); Al[i] = Math.round(255 * clamp((1 - Math.sqrt(r2)) * D * 0.5)); }
      let tex = null; const TW = 720, TH = 360;
      if (o.map) {
        const m = images[o.map]; if (!m) throw new Error(M(`supercut：manifest 里没有地球贴图 "${o.map}"`, `supercut: no globe map "${o.map}" in the manifest`));
        if (m.credit) F.credit({ ...m.credit, file: m.file });
        F.prep(async () => { try { const im = new Image(); im.src = 'assets/' + m.file; await im.decode(); const c = document.createElement('canvas'); c.width = TW; c.height = TH; const cg = c.getContext('2d', { willReadFrequently: true }); cg.drawImage(im, 0, 0, TW, TH); tex = cg.getImageData(0, 0, TW, TH).data; } catch (e) { /* no pixels (file:// preview): the drawn graticule shows instead */ } });
      }
      const GM = Float32Array.from({ length: 256 }, (_, v) => 255 * Math.pow(v / 255, o.gamma ?? 0.7));   // satellite mosaics are dark: lift them
      const tilt = o.tilt ?? 0.32, ct = Math.cos(tilt), st = Math.sin(tilt), acc = parse(o.color ?? ACCENT), spin = o.spin ?? 0.45;
      const sphere = (t) => {
        const rot = (o.start ?? 0) + (t - at) * spin, cr = Math.cos(rot), sr = Math.sin(rot), d = out.data;
        for (let i = 0, k = 0; i < D * D; i++, k += 4) {
          if (!Al[i]) { d[k + 3] = 0; continue; }
          const nx = Nn[i * 3], ny = Nn[i * 3 + 1], nz = Nn[i * 3 + 2], y1 = ny * ct - nz * st, z1 = ny * st + nz * ct, x2 = nx * cr + z1 * sr, z2 = -nx * sr + z1 * cr;
          const lon = Math.atan2(x2, z2), lat = Math.asin(clamp(-y1, -1, 1));
          let R, G, B;
          if (tex) { const uu = (((lon / (2 * Math.PI) + 0.5) % 1) + 1) % 1, vv = 0.5 - lat / Math.PI, j = (Math.min(TH - 1, (vv * TH) | 0) * TW + Math.min(TW - 1, (uu * TW) | 0)) * 4; R = tex[j]; G = tex[j + 1]; B = tex[j + 2]; }
          else { const gl = Math.abs((((lon * 12) / Math.PI) % 1 + 1) % 1 - 0.5) > 0.44 || Math.abs((((lat * 12) / Math.PI) % 1 + 1) % 1 - 0.5) > 0.44; R = gl ? acc[0] : 16; G = gl ? acc[1] : 18; B = gl ? acc[2] : 24; }
          const sh = clamp(0.5 + 0.62 * (nx * -0.42 + ny * -0.38 + nz * 0.82)) * (0.62 + 0.38 * nz);
          d[k] = GM[R | 0] * sh; d[k + 1] = GM[G | 0] * sh; d[k + 2] = GM[B | 0] * sh; d[k + 3] = Al[i];
        }
        sg.putImageData(out, 0, 0);
      };
      // the ring: characters spaced by their own width around a tilted circle; the far side hides behind the globe
      const ringTxt = o.ring ? String(o.ring) : '', sep = o.sep ?? '  ·  ', unit = chars(ringTxt + sep), ring = [];
      if (ringTxt) {
        mctx.font = `700 100px ${FONT.text}`; try { mctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
        const wsU = unit.map((c) => mctx.measureText(c).width / 100), uw = wsU.reduce((s, v) => s + v, 0), fsR = o.ringSize ?? 0.3, circ = (2 * Math.PI * (o.ringR ?? 1.3)) / fsR, reps = Math.max(1, Math.round(circ / uw)), k2 = circ / (reps * uw);
        let acc2 = 0; for (let rI = 0; rI < reps; rI++) for (let i = 0; i < unit.length; i++) { ring.push({ c: unit[i], th: ((acc2 + (wsU[i] * k2) / 2) / circ) * 2 * Math.PI }); acc2 += wsU[i] * k2; }
        F.fact(ringTxt, at, until);
      }
      const grow = o.grow ?? [0.62, 1.05], roll = o.roll ?? -0.14, rcol = o.ringColor ?? '#ffffff';
      F.add((t) => {
        const on = t >= at && t < until; set(L, { display: on ? '' : 'none' }); if (!on) return;
        sphere(t);
        const R = Math.min(W, H) * (o.r ?? 0.3) * lerp(grow[0], grow[1], seg(t, at, until, E.quartOut)), cx = W * (o.x ?? 0.5), cy = H * (o.y ?? 0.5), Rr = R * (o.ringR ?? 1.3), fs = R * (o.ringSize ?? 0.3), w0 = (t - at) * (o.ringSpin ?? 0.9);
        g.clearRect(0, 0, W, H);
        const put = (front) => {
          g.save(); g.translate(cx, cy); g.rotate(roll); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = rcol;
          for (const c of ring) {
            const th = c.th - w0, z = Math.cos(th), x = Rr * Math.sin(th), y = Rr * z * 0.2;
            if ((z >= 0) !== front || c.c === ' ') continue;
            if (!front && Math.hypot(x, y) < R * 1.01) continue;
            const sc = 0.72 + 0.48 * ((z + 1) / 2), sx = Math.max(0.1, Math.abs(z)) * (z < 0 ? -1 : 1);
            g.globalAlpha = front ? 1 : 0.5; g.save(); g.translate(x, y); g.scale(sc * sx, sc); g.font = `700 ${fs.toFixed(1)}px ${FONT.text}`; g.fillText(c.c, 0, 0); g.restore();
          }
          g.restore(); g.globalAlpha = 1;
        };
        put(false);
        const halo = g.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.16); halo.addColorStop(0, 'rgba(140,190,255,.28)'); halo.addColorStop(1, 'rgba(140,190,255,0)'); g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, R * 1.16, 0, 7); g.fill();
        g.drawImage(sph, cx - R, cy - R, R * 2, R * 2);
        put(true);
      });
      if (at > 1e-3) F.cut(at);
      F.sfx(at, 'globe', 0.7, { dur: Math.min(2.4, until - at) });
      F.live(at, until); F.info('globe', at, until);
      section(at, 'graphic', 2);
      const c = parse(ground);
      return addShot({ a: at, b: until, lum: () => relLum(c) + 0.02, tint: () => c, drawn: true, ui: false, hold: until - at >= 1.2, key: 'globe', kind: 'globe' });
    };

    // ---------- end cards ----------
    const cards = [];
    S.cards = (o) => {
      const { at, words = [] } = o, every = o.every ?? F.B * 2, grounds = o.grounds ?? ['#000000', '#f6f4ee'], until = o.until ?? F.duration, size = px(o.size ?? (PT ? 240 : 300));
      const tl = at + words.length * every;
      const mk = (a, b, i, g0) => { const bg = g0 ?? grounds[i % grounds.length], dark = relLum(parse(bg)) < 0.4, L = el('div', `inset:0;display:none;background:${bg}`, topL); F.add((t) => set(L, { display: t >= a && t < b ? '' : 'none' })); if (a > 1e-3) F.cut(a); cards.push({ a, b, lum: relLum(parse(bg)) }); addShot({ a, b, lum: () => relLum(parse(bg)), tint: () => parse(bg), drawn: true, ui: false, hold: b - a >= 1.2, key: 'card', kind: 'card' }); return { L, ink: dark ? '#ffffff' : '#0b0b0c', dark }; };
      words.forEach((w, i) => {
        const a = at + i * every, b = a + every, { L, ink } = mk(a, b, i);
        const e = el('div', `left:${-W}px;width:${3 * W}px;top:${f1(H / 2 - size * 0.6)}px;text-align:center;font:${o.weight ?? 500} ${f1(size)}px/1.2 ${o.font ?? FONT.card};letter-spacing:-.045em;color:${ink};white-space:nowrap`, L, esc(w));
        F.text(e, 'slam', w, a, b); F.sfx(a, 'card', 0.9); F.musicCue(a, 'hit');
        let fit = 0;
        F.add((t) => { if (t < a || t >= b) return; if (!fit && e.scrollWidth > 1) { mctx.font = `${o.weight ?? 500} ${size}px ${o.font ?? FONT.card}`; const tw = mctx.measureText(w).width; fit = tw > W * 0.86 ? (W * 0.86) / tw : 1; } set(e, { transform: `scale(${((fit || 1) * (1 + 0.05 * seg(t, a, b))).toFixed(4)})` }); });
      });
      if (o.logo) {
        const lg = o.logo, { L, ink, dark } = mk(tl, until, words.length, lg.ground), lh2 = px(lg.h ?? lg.size ?? 130);
        let e;
        if (lg.src) { e = el('img', `left:50%;top:${f1(H / 2 - lh2 / 2)}px;height:${f1(lh2)}px;transform-origin:50% 50%`, L); e.src = lg.src; const inv = lg.invert ?? dark; if (inv) e.style.filter = 'invert(1)'; e.style.mixBlendMode = lg.blend ?? (inv ? 'screen' : 'multiply'); }
        else { e = el('div', `left:${-W}px;width:${3 * W}px;top:${f1(H / 2 - lh2 * 0.6)}px;text-align:center;font:${lg.weight ?? 700} ${f1(lh2)}px/1.2 ${lg.font ?? FONT.card};letter-spacing:${lg.spacing ?? '-.03em'};color:${ink};white-space:nowrap`, L, esc(lg.text)); F.text(e, 'logo', lg.text, tl, 1e9); }
        F.add((t) => { if (t < tl) return; set(e, { transform: `${lg.src ? 'translateX(-50%) ' : ''}scale(${(1 + 0.07 * seg(t, tl, until)).toFixed(4)})` }); });
        if (o.url) {
          const us = px(PT ? 46 : 44), u0 = tl + F.B, uc = chars(o.url), per = Math.min(0.05, (F.B * 0.9) / uc.length), ue = el('div', `left:0;right:0;top:${f1(H / 2 + lh2 * 0.72)}px;text-align:center;font:500 ${f1(us)}px/1.3 ${FONT.text};color:${ink};opacity:.72;letter-spacing:-.01em;white-space:pre`, L);
          F.text(ue, 'endcard', o.url, u0, 1e9); for (let j = 0; j < uc.length; j += 2) F.sfx(u0 + j * per, 'type', 0.3);
          F.add((t0) => { const t = frameT(t0), n = t < u0 ? 0 : Math.min(uc.length, Math.floor((t - u0) / per + 1e-6) + 1), str = uc.slice(0, n).join(''); if (ue.textContent !== str) ue.textContent = str; set(ue, { opacity: n ? '.72' : '0' }); });
        }
        // picture credits, when the film itself must carry them (CC BY material shown somewhere without a description field): one compact block
        if (o.credits) F.prep(() => {
          const groups = []; for (const c of F.credits || []) { const k = [c.author, c.licence].filter(Boolean).join(' · ') || c.title || c.file; if (!groups.includes(k)) groups.push(k); }
          if (!groups.length) return; const cs = px(PT ? 22 : 20), txt = M('图片：', 'Pictures: ') + groups.slice(0, 10).join(' / ') + (groups.length > 10 ? M(' 等（完整清单见 CREDITS.txt）', ' and more (full list: CREDITS.txt)') : '');
          const ce = el('div', `left:${f1(W * 0.08)}px;right:${f1(W * 0.08)}px;bottom:${f1(H * (PT ? 0.22 : 0.06))}px;text-align:center;font:400 ${f1(cs)}px/1.45 ${FONT.text};color:${ink};opacity:.55`, L, esc(txt)); F.text(ce, 'label', txt, tl + F.B, 1e9, { noFact: true, chrome: true }); F.add((t) => set(ce, { opacity: (0.55 * seg(t, tl + F.B, tl + F.B + 0.3)).toFixed(3) }));
        });
        F.sfx(tl, 'logo', 1);
      }
      F.scene(at, until, { end: true });   // the tagline cards and the logo are the film's ending
      section(at, 'cards', 2);
      return { at, logoAt: tl };
    };

    // ---------- brightness over time, and the checks ----------
    const lumaAt = (t) => {
      const sh = shotAt(t); let L = sh ? sh.lum(t) : 0.01;
      if (!sh || sh.kind !== 'card') for (const p of punches) if (t >= p.a && t < p.b) L += p.cover * ((p.dark ? 0 : 1) - L);
      return L;
    };
    S.lumaAt = lumaAt;
    F.addLint(() => {
      const out = [], add = (level, t, what, msg) => out.push({ level, t: Math.round(t * 100) / 100, src: '', what, msg });
      const seq = [...shots].sort((p, q) => p.a - q.a), D = F.duration, body = seq.filter((s) => s.kind !== 'card');
      // 1. is it a supercut: how many shots, how long each
      const lens = body.filter((s) => s.kind !== 'grid').map((s) => s.b - s.a).sort((p, q) => p - q), bodyEnd = cards.length ? Math.min(...cards.map((c) => c.a)) : D;
      if (lens.length) {
        const med = lens[Math.floor(lens.length / 2)], quick = lens.filter((v) => v <= 0.5).length / lens.length, nCuts = lens.length + body.filter((s) => s.kind === 'grid').reduce((n, s) => n + (s.fills ?? 1), 0), rate = nCuts / Math.max(1, bodyEnd);
        const hist = [['≤0.12', 0, 0.12], ['–0.25', 0.12, 0.25], ['–0.5', 0.25, 0.5], ['–1', 0.5, 1], ['>1', 1, 1e9]].map(([n, lo, hi]) => `${n}s ×${lens.filter((v) => v > lo + 1e-6 && v <= hi + 1e-6).length}`).join('  ');
        add('note', 0, M('镜头', 'Shots'), M(`${nCuts} 次换画面 / ${bodyEnd.toFixed(1)} 秒（每秒 ${rate.toFixed(1)} 次，其中整幅镜头 ${lens.length} 个），长度中位 ${med.toFixed(2)} 秒 · ${hist} · 停留镜头 ${body.filter((s) => s.b - s.a >= 1 && s.kind !== 'grid').length} 个`, `${nCuts} picture changes in ${bodyEnd.toFixed(1)} s (${rate.toFixed(1)} a second; ${lens.length} full-frame shots), median ${med.toFixed(2)} s · ${hist} · ${body.filter((s) => s.b - s.a >= 1 && s.kind !== 'grid').length} hold(s)`));
        if (rate < 1) add('warn', 0, M('镜头太少', 'too few shots'), M(`片尾字卡前 ${bodyEnd.toFixed(1)} 秒只换了 ${nCuts} 次画面（每秒 ${rate.toFixed(1)} 次）：踩点混剪每秒 1.5–2 个；素材不够就缩短片子，别把镜头拉长`, `Only ${nCuts} picture changes in the ${bodyEnd.toFixed(1)} s before the end cards (${rate.toFixed(1)} a second): a supercut runs at 1.5–2 a second; with too little footage shorten the film rather than stretch the shots`));
        if (quick < 0.55) add('warn', 0, M('镜头太长', 'shots too long'), M(`只有 ${Math.round(quick * 100)}% 的镜头不超过 0.5 秒（中位 ${med.toFixed(2)} 秒）：照片要在 0.2–0.4 秒里才像一段影像，停久了就是幻灯片——用 S.run 的 pattern 把它们排到八分音符上`, `Only ${Math.round(quick * 100)}% of the shots last 0.5 s or less (median ${med.toFixed(2)} s): a still reads as footage only for 0.2–0.4 s, held longer it is a slideshow — lay them on eighth notes with S.run's pattern`));
        for (const s of body) if (s.b - s.a < 0.06) add('warn', s.a, M('镜头不足两帧', 'shot under two frames'), M(`${s.a.toFixed(2)} 秒的镜头只有 ${(s.b - s.a).toFixed(3)} 秒：不到两帧会被看成坏帧——爆闪的 div 调小（这个速度下 div ≤ ${Math.floor(F.B / 0.067)}）`, `The shot at ${s.a.toFixed(2)} s lasts ${(s.b - s.a).toFixed(3)} s: under two frames reads as a glitch — lower the burst's div (≤ ${Math.floor(F.B / 0.067)} at this tempo)`));
      }
      // 2. a hold every 6–8 s: somewhere the eye rests and the film says something
      const rests = seq.filter((s) => s.b - s.a >= 1.0 && s.kind !== 'card' && s.kind !== 'grid').map((s) => [s.a, s.b]);
      let last = 0; const gaps = [];
      for (const [a, b] of [...rests, [bodyEnd, bodyEnd]]) { if (a - last > 8.05) gaps.push([last, a]); last = Math.max(last, b); }
      for (const [a, b] of gaps) add('warn', a, M('没有停顿', 'no hold'), M(`${a.toFixed(1)}–${b.toFixed(1)} 秒连切了 ${(b - a).toFixed(1)} 秒没有一个停留镜头：每 6–8 秒放一个 1.5–3 秒的 S.hold（配 S.bubbles 讲一条真信息），否则观众只记得快`, `${a.toFixed(1)}–${b.toFixed(1)} s: ${(b - a).toFixed(1)} s of cutting without one held shot: put a 1.5–3 s S.hold (with S.bubbles carrying one real fact) every 6–8 s, or all the viewer keeps is "fast"`));
      for (const p of offBeatParts) add('warn', p.at, M('不在拍上', 'off the beat'), M(`${p.name} 段从 ${p.at.toFixed(2)} 秒开始，不在整拍上：音乐没法跟着换段（停留镜头时鼓要退出）——挪到 F.beat(整数)`, `The ${p.name} part starts at ${p.at.toFixed(2)} s, off the beat: the music cannot change section with it (the drums drop out for a hold) — move it to a whole beat`));
      // 3. each caption line, once complete, stays long enough to be read; one pill at a time
      const cs = [...caps].sort((p, q) => p.at - q.at);
      for (const c of cs) { const dw = c.until - c.complete; if (dw < 0.6 - 1e-6) add('warn', c.at, M('字幕停留太短', 'caption too brief'), M(`"${c.text.slice(0, 28)}" 打完后只停 ${Math.max(0, dw).toFixed(2)} 秒就换了：整句至少完整停 0.6 秒（把 until 往后挪，或让最后一个词早点出）`, `"${c.text.slice(0, 28)}" stays only ${Math.max(0, dw).toFixed(2)} s once complete: a finished line holds at least 0.6 s (move until later, or bring the last word in earlier)`)); }
      for (const c of capFits) if (c.k < 0.8) add('warn', c.at, M('字幕太长', 'caption too long'), M(`"${c.text.replace(/\n/g, ' / ').slice(0, 28)}" 在这个画幅里放不下，字被缩到 ${Math.round(c.k * 100)}%：用 \\n 拆成两行（竖屏常要：F.portrait ? '两行' : '一行'），或者把句子改短`, `"${c.text.replace(/\n/g, ' / ').slice(0, 28)}" does not fit this frame and was set at ${Math.round(c.k * 100)}%: break it in two with \\n (often needed in portrait: F.portrait ? 'two lines' : 'one'), or shorten the line`));
      for (let i = 1; i < cs.length; i++) if (cs[i].at < cs[i - 1].until - 1e-3) add('warn', cs[i].at, M('两个字幕', 'two captions'), M(`"${cs[i].text.slice(0, 20)}" 出现时 "${cs[i - 1].text.slice(0, 20)}" 还在：画面中心只有一个胶囊`, `"${cs[i].text.slice(0, 20)}" starts while "${cs[i - 1].text.slice(0, 20)}" is still up: one pill at the centre at a time`));
      for (const c of cs) for (const w of c.words) if (w.reveal === 'type' && w.per * w.ch.length > 0 && w.ch.length / Math.max(0.05, w.done - w.at + w.per) > 34) { add('warn', w.at, M('打字太快', 'typed too fast'), M(`"${w.text}" 每秒要打 ${Math.round(w.ch.length / (w.done - w.at + w.per))} 个字符：看不出是打出来的——给这个词多留一点时间，或者改成 reveal: 'cut'`, `"${w.text}" types at ${Math.round(w.ch.length / (w.done - w.at + w.per))} characters a second: it no longer reads as typing — give the word more time, or use reveal: 'cut'`)); break; }
      // 4. photosensitivity: large-area light / dark alternation at most 3 times a second (a flash = a pair of opposing brightness changes of 10% or more)
      {
        const dt = 1 / 60, tr = []; let ext = lumaAt(0), dir = 0;
        for (let t = dt; t < D; t += dt) {
          const v = lumaAt(t);
          if (dir === 0) { if (Math.abs(v - ext) >= 0.1 && Math.min(v, ext) < 0.8) { dir = Math.sign(v - ext); tr.push(t); ext = v; } }
          else if ((v - ext) * dir > 0) ext = v;
          else if (Math.abs(v - ext) >= 0.1 && Math.min(v, ext) < 0.8) { dir = -dir; tr.push(t); ext = v; }
        }
        let worst = 0, wt = 0; for (let i = 0; i < tr.length; i++) { let j = i; while (j < tr.length && tr[j] - tr[i] < 1) j++; if (j - i > worst) { worst = j - i; wt = tr[i]; } }
        add('note', 0, M('闪烁', 'Flashing'), M(`一秒内最多 ${worst} 次大面积明暗变化（上限 6 次 = 每秒 3 次闪烁）`, `at most ${worst} large light / dark changes within one second (limit 6 = 3 flashes a second)`));
        if (worst > 6) add('error', wt, M('闪烁超限', 'flashing'), M(`${wt.toFixed(2)} 秒起一秒内有 ${worst} 次大面积明暗变化（${Math.floor(worst / 2)} 次闪烁），超过每秒 3 次的上限，可能诱发光敏性癫痫：把这一段的素材按亮度排（S.burst 默认会排，别用 order: 'given'）、换掉最亮或最暗的几张、或者把爆闪缩短`, `From ${wt.toFixed(2)} s there are ${worst} large light / dark changes within one second (${Math.floor(worst / 2)} flashes), over the limit of 3 a second — a photosensitive-seizure risk: order the plates by brightness (S.burst does unless order: 'given'), swap out the brightest or darkest ones, or shorten the burst`));
      }
      // 5. the style runs on real footage: code-drawn shots at most about a quarter; product screenshots are a few shots, not the film
      const drawnT = body.filter((s) => s.drawn).reduce((s, x) => s + (x.b - x.a), 0), share = drawnT / Math.max(1, bodyEnd);   // the end cards are every film's ending: not counted
      if (share > 0.3) add('warn', 0, M('实拍太少', 'too little footage'), M(`代码画的镜头（纯色、字符雨、地球、字卡）占了片尾前的 ${Math.round(share * 100)}%：踩点混剪靠真实影像，代码画的最多四分之一——补素材（footage.mjs），或者换一种风格`, `Code-drawn shots (plain grounds, glyph rain, the globe, cards) fill ${Math.round(share * 100)}% of the film before the end cards: a supercut lives on real footage, code-drawn shots are a quarter at most — find more footage (footage.mjs) or pick another style`));
      const uis = seq.filter((s) => s.ui);
      if (uis.length > 3) add('warn', uis[3].a, M('截图太多', 'too many screenshots'), M(`用了 ${uis.length} 个产品截图镜头：这种风格里截图和别的素材一样一闪而过，最多 2–3 个；要认真演示界面请用 launch 风格`, `${uis.length} product-screenshot shots: here a screenshot cuts past like any other footage, 2–3 at most; to demonstrate the UI properly use the launch style`));
      for (const s of uis) if (s.b - s.a > 1.0) add('warn', s.a, M('截图停太久', 'screenshot held'), M(`${s.a.toFixed(1)} 秒的产品截图停了 ${(s.b - s.a).toFixed(1)} 秒：停下来看界面是 launch 风格的事，这里截图只切过`, `The product screenshot at ${s.a.toFixed(1)} s is held for ${(s.b - s.a).toFixed(1)} s: stopping to look at the UI is the launch style's job; here a screenshot only cuts past`));
      // 6. the same picture twice within four shots reads as a loop
      const pl = seq.filter((s) => s.kind === 'run' || s.kind === 'burst' || s.kind === 'plate');
      for (let i = 0; i < pl.length; i++) { const j = pl.slice(Math.max(0, i - 3), i).find((s) => s.key === pl[i].key); if (j) { add('warn', pl[i].a, M('素材重复', 'repeated plate'), M(`"${pl[i].key}" 在 ${j.a.toFixed(1)} 秒刚用过，${pl[i].a.toFixed(1)} 秒又出现：隔开至少四个镜头，或者换一张`, `"${pl[i].key}" was just used at ${j.a.toFixed(1)} s and returns at ${pl[i].a.toFixed(1)} s: keep at least four shots between repeats, or use another picture`)); break; } }
      // 7. the pill is the film's voice: a stretch with no caption, bubble, punch word or card is footage with nothing said
      {
        const said = [...caps.map((c) => [c.at, c.until]), ...punches.map((p) => [p.a, p.b + 0.4]), ...cards.map((c) => [c.a, c.b]), ...F.texts.filter((x) => x.kind === 'label' && !x.chrome).map((x) => [x.win[0], Math.min(x.win[1], D)])].sort((p, q) => p[0] - q[0]);
        let e2 = 0; for (const [a, b] of [...said, [D, D]]) { if (a - e2 > 2.0) add('warn', e2, M('没有字', 'nothing said'), M(`${e2.toFixed(1)}–${a.toFixed(1)} 秒画面上没有字幕、气泡、冲击词：只剩素材在切——让下一句早点开始`, `${e2.toFixed(1)}–${a.toFixed(1)} s: no caption, bubble or punch word on screen, only footage cutting — start the next line earlier`)); e2 = Math.max(e2, b); }
      }
      return out;
    });

    return S;
  };
})();
