// ascii.js: the ASCII-art style (one of the visual styles of bubble-video-skill's promo/; style notes in styles/ascii/STYLE.md). Load after promo.js.
// Everything on screen is built from monospaced characters: character density is brightness (` .:-=+*#%@`). Shapes, screenshots and big text are first drawn on an invisible "source frame",
// sampled on a character grid (one character per cell) and redrawn as characters of matching density — zooming in makes the cells finer, so the picture gets clearer and clearer.
// Text meant to be read (titles, captions, numbers) is real DOM text (monospaced, aligned to the grid), so the automatic checks work as usual; the ASCII art itself is on a canvas.
//
//   const A = PROMO.ascii(F, { cell, ramp, font, night })
//   A.bg(layer, { variant, invert })                  this scene's ground (paper colour + a very faint dot grid / line numbers / corner marks); invert = this scene reversed (a dark scene in a light film)
//   A.plate(parent, { x, y, w, h, src | text | draw, at, until, enter, exit, tint, cell, zoom, resolve, live }) a block of ASCII art → { el, box }
//     source: src image (fit: contain / cover) | text big text (font, weight) | draw(g, t, w, h) your own drawing (can change over time)
//     enter: decode — garbage characters settle cell by cell (default) | scan — scanned out top to bottom | center — spreads from the middle | fade — density fades in | none
//     tint: ink (default) | accent | source (characters take the source frame's colours) | '#colour'; zoom: { at, dur, cell } cells get finer (zoom in = clearer)
//     resolve: { at, dur } the ASCII art "resolves" top to bottom into the real image (the screenshot / product image as-is); levels (on by default for images) = auto levels, using the full density ramp
//   A.big(parent, { at, until, text, size, x, y })    impact title: the letters themselves are made of characters
//   A.type(parent, { at, until, text, size, x, y, align, color, cursor, prompt, kind }) typewriter, letter by letter (at = done typing; on exit it backspaces away)
//   A.box(parent, { x, y, w, h, at, until, title, color, fill }) a box drawn in box-drawing characters ┌─┐, traced along its edges → { el, inner }
//   A.ping(parent, { at, x, y, r })                   signature move: a ring of characters ripples out from a point (like sonar)
//   A.wipe({ at, dur, from })                         transition: a big field of inverted characters sweeps in from one side, covers, then sweeps away; returns the moment of full cover
//   A.endcard(parent, { at, title, tagline, url })    end card: big title decodes in, tagline and URL type out, cursor blinking
//
// Timing: at = the moment it settles and reads (on the beat); motion starts lead earlier (default 0.35 s); until = the moment it is fully gone (the exit plays out before it).
// Safety: garbage characters flip at most 12 times a second, only in small areas; the whole screen never flashes (transitions sweep across, they don't flip the whole screen).
(function () {
  const P = window.PROMO;
  if (!P) throw new Error('ascii.js 要在 promo.js 之后加载');
  const { clamp, lerp } = window.EV;
  const { E, seg, set, el } = P;
  const f1 = (n) => Math.round(n * 10) / 10;
  // deterministic random number per cell (identical on every render of the same frame)
  const hash = (x, y, s = 0) => { let n = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16; return (n >>> 0) / 4294967296; };
  const rgbOf = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) return [0, 0, 0]; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lumOf = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const lum = (c) => lumOf(...rgbOf(c));
  const NOISE = '01<>/\\|[]{}#*+=-_:;~^%$&?!';

  P.ascii = function (F, o = {}) {
    const th = F.theme, PT = F.portrait;
    const A = { lead: o.lead ?? 0.35 };
    A.paper = o.paper ?? th.bg; A.ink = o.ink ?? th.fg; A.accent = o.accent ?? th.accent; A.muted = o.muted ?? th.muted ?? A.ink;
    A.font = o.font ?? th.fonts.mono ?? '"IBM Plex Mono", ui-monospace, Menlo, monospace';
    A.display = o.display ?? th.fonts.display ?? A.font;
    A.cell = o.cell ?? F.px(16);            // cell height (px); width ≈ 0.5 × height
    A.ramp = o.ramp ?? ' .:-=+*#%@';
    const dark = lum(A.ink) > lum(A.paper);
    // a reversed scene (a dark scene in a light film / a paper-coloured scene in a dark film)
    A.night = o.night ?? (dark ? { paper: '#F2F1EC', ink: '#161616' } : { paper: '#0B0B0C', ink: '#F2F2F0' });
    const DAY = { paper: A.paper, ink: A.ink };
    const schemeOf = (n) => { for (let m = n; m; m = m.parentElement) if (m._ascii) return m._ascii; return DAY; };
    const dpr = window.devicePixelRatio || 1;
    // a run of key clicks: n of them, spread evenly over dur (typing sounds don't count towards the sfx density check)
    const keys = (t0, dur, n, gain = 0.3) => { n = Math.max(1, Math.round(n)); for (let i = 0; i < n; i++) F.sfx(t0 + (i * dur) / n, 'type', gain * (0.85 + 0.3 * hash(i, n, 5))); };
    A.keys = keys;

    // ---------- glyph atlas: one per font size (white glyphs), tinted when drawn ----------
    const atlases = new Map();
    // font size ≈ cell height: tight line spacing, so the ASCII art reads as a solid area, not horizontal stripes
    const metric = (cell) => { const fs = cell * 0.98, c = document.createElement('canvas').getContext('2d'); c.font = `600 ${fs}px ${A.font}`; return { fs, cw: Math.max(1, c.measureText('M').width), ch: cell }; };
    const atlasOf = (cell, glyphs) => {
      const key = `${Math.round(cell * 4) / 4}|${glyphs}`; let a = atlases.get(key); if (a) return a;
      const m = metric(cell), cv = document.createElement('canvas'), gw = Math.ceil(m.cw * dpr), gh = Math.ceil(m.ch * dpr);
      cv.width = gw * glyphs.length; cv.height = gh;
      const g = cv.getContext('2d'); g.scale(dpr, dpr); g.font = `600 ${m.fs}px ${A.font}`; g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'center';
      [...glyphs].forEach((ch, i) => g.fillText(ch, (i * gw) / dpr + m.cw / 2, m.ch / 2 + m.ch * 0.06));
      a = { cv, gw, gh, ...m, index: new Map([...glyphs].map((c, i) => [c, i])) }; atlases.set(key, a); return a;
    };
    const GLYPHS = [...new Set(A.ramp + NOISE + '█▓▒░·•○◦')].join('');
    A.metric = (cell = A.cell) => metric(cell);

    // ---------- a block of ASCII art ----------
    A.plate = (parent, p) => {
      const w = p.w, h = p.h, x0 = (p.x ?? F.W / 2) - w / 2, y0 = (p.y ?? F.H / 2) - h / 2;
      const at = p.at ?? 0, until = p.until ?? 1e9, dur = p.dur ?? 0.6, enter = p.enter ?? 'decode', exit = p.exit ?? 'decode', seed = p.seed ?? Math.round(x0 * 7 + y0 * 13 + w);
      const wrap = el('div', `left:${f1(x0)}px;top:${f1(y0)}px;width:${f1(w)}px;height:${f1(h)}px;display:none;${p.z !== undefined ? `z-index:${p.z};` : ''}`, parent);
      let img = null;
      if (p.src && p.resolve) { img = el('img', `left:0;top:0;width:100%;height:100%;object-fit:${p.fit ?? 'contain'};clip-path:inset(0 0 100% 0)`, wrap); img.src = p.src; }
      const cv = el('canvas', `left:0;top:0;width:${f1(w)}px;height:${f1(h)}px`, wrap); cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
      const fx = el('canvas', `left:0;top:0;width:${f1(w)}px;height:${f1(h)}px`, wrap); fx.width = cv.width; fx.height = cv.height;   // garbage characters currently flipping (accent colour)
      const g = cv.getContext('2d'), gx = fx.getContext('2d');
      // source frame: a static source is drawn only once (half resolution is enough for sampling)
      const src = document.createElement('canvas'); src.width = Math.max(2, Math.round(w / 2)); src.height = Math.max(2, Math.round(h / 2));
      const sg = src.getContext('2d', { willReadFrequently: true });
      const samp = document.createElement('canvas'), smp = samp.getContext('2d', { willReadFrequently: true });
      let imEl = null, ready = !p.src;
      if (p.src) { imEl = new Image(); imEl.src = p.src; F.prep(() => imEl.decode().then(() => { ready = true; drawSrc(0); }).catch(() => { ready = true; })); }
      const drawSrc = (t) => {
        sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, src.width, src.height); sg.scale(src.width / w, src.height / h);
        if (imEl && imEl.naturalWidth) {
          const ir = imEl.naturalWidth / imEl.naturalHeight, rr = w / h, cover = p.fit === 'cover';
          const dw = (cover ? ir < rr : ir > rr) ? w : h * ir, dh = (cover ? ir < rr : ir > rr) ? w / ir : h;
          sg.drawImage(imEl, (w - dw) / 2, (h - dh) / 2, dw, dh);
        }
        if (p.text) {
          const lines = String(p.text).split('\n'), fs = p.size ? F.px(p.size) : Math.min(h / lines.length * 0.86, (w * 1.6) / Math.max(...lines.map((l) => l.length)));
          sg.font = `${p.weight ?? 800} ${fs}px ${p.font ?? A.display}`; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillStyle = p.textColor ?? schemeOf(wrap).ink;
          let k = fs; for (const l of lines) k = Math.min(k, (fs * w * 0.96) / Math.max(1, sg.measureText(l).width)); sg.font = `${p.weight ?? 800} ${k}px ${p.font ?? A.display}`;
          lines.forEach((l, i) => sg.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * k * 1.02));
        }
        if (p.draw) p.draw(sg, t, w, h);
      };
      if (!p.src) F.prep(() => drawSrc(0));
      const cellAt = (t) => (p.zoom ? lerp(p.cell ?? A.cell, p.zoom.cell, seg(t, p.zoom.at - (p.zoom.dur ?? 1), p.zoom.at, E.cubicInOut)) : p.cell ?? A.cell);
      const order = (cx, cy, cols, rows, mode) => {
        const r = hash(cx, cy, seed);
        if (mode === 'scan') return (cy / rows) * 0.82 + r * 0.18;
        if (mode === 'center') return Math.min(1, Math.hypot(cx / cols - 0.5, (cy / rows - 0.5) * (rows / cols) * 2) * 1.3) * 0.8 + r * 0.2;
        return r;
      };
      const tint = () => { const s = schemeOf(wrap); return p.tint === 'accent' ? A.accent : p.tint && p.tint !== 'ink' && p.tint !== 'source' ? p.tint : s.ink; };
      F.add((t) => {
        const on = t >= at - dur - A.lead * 0.5 && t < until;
        set(wrap, { display: on ? '' : 'none' }); if (!on || !ready) return;
        if (p.draw) drawSrc(t);
        const cell = cellAt(t), m = metric(cell), cols = Math.max(1, Math.floor(w / m.cw)), rows = Math.max(1, Math.floor(h / m.ch));
        const ox = (w - cols * m.cw) / 2, oy = (h - rows * m.ch) / 2;
        samp.width = cols; samp.height = rows; smp.imageSmoothingEnabled = true; smp.imageSmoothingQuality = 'high'; smp.clearRect(0, 0, cols, rows);
        smp.drawImage(src, 0, 0, cols, rows);
        const px = smp.getImageData(0, 0, cols, rows).data, sc = schemeOf(wrap);
        // reference colour = the "empty" colour: for big text and your own drawings it's the paper colour; for an image it's the image's own background (average of the four corners) — a dark product shot on a light ground: the dark is empty, the product is the characters
        let [pr, pg, pb] = rgbOf(sc.paper);
        if (p.src && (p.ref ?? 'corners') === 'corners') { let n = 0, r = 0, gg = 0, bb = 0; for (const [cx, cy] of [[0, 0], [cols - 1, 0], [0, rows - 1], [cols - 1, rows - 1], [1, 0], [cols - 2, 0], [0, 1], [cols - 1, 1]]) { const k = (cy * cols + cx) * 4; if (px[k + 3] > 200) { r += px[k]; gg += px[k + 1]; bb += px[k + 2]; n++; } } if (n >= 4) { pr = r / n; pg = gg / n; pb = bb / n; } }
        const Lp = lumOf(pr, pg, pb), span = Math.max(Lp, 1 - Lp), Lpaper = lum(sc.paper);
        const at2 = atlasOf(cell, GLYPHS), R = A.ramp.length;
        // enter / exit progress: q = 1 all shown; cells in the narrow "flipping" band show garbage
        const qIn = enter === 'none' ? 1 : seg(t, at - dur, at), qOut = exit === 'none' || until > 1e8 ? 1 : 1 - seg(t, until - Math.min(dur, 0.45), until);
        const band = 0.14, tick = Math.floor(t * 12);
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); gx.setTransform(1, 0, 0, 1, 0, 0); gx.clearRect(0, 0, fx.width, fx.height);
        let res = 1; if (p.resolve) res = 1 - seg(t, p.resolve.at - (p.resolve.dur ?? 0.6), p.resolve.at, E.cubicInOut);   // resolving into the real image: top to bottom
        let anyFx = false;
        // auto levels: the densest 2% of this block counts as the densest character (pale or greyish images still use the full ramp); big text and your own drawings aren't stretched
        // density = how far from the paper colour (lightness difference, or colour difference: a red heart on black isn't bright, but the colour pops)
        const D = new Float32Array(cols * rows), hist = new Uint32Array(64); let cnt = 0;
        for (let i = 0; i < cols * rows; i++) { const k = i * 4, a = px[k + 3] / 255; if (a < 0.02) continue; const dl = Math.abs(lumOf(px[k], px[k + 1], px[k + 2]) - Lp) / span, dc = Math.sqrt(((px[k] - pr) ** 2 + (px[k + 1] - pg) ** 2 + (px[k + 2] - pb) ** 2) / 3) / 255 / span, d0 = Math.max(dl, dc * 0.9) * a; D[i] = d0; if (d0 > 0.02) { hist[Math.min(63, Math.floor(d0 * 64))]++; cnt++; } }
        // treat the image's own background (the slightly greyer / darker area that fills most of it) as "empty": subtract the 40th percentile, or the whole ground becomes a layer of dots
        let top = 1, low = 0; if (p.levels ?? !!p.src) {
          let acc = 0; for (let b = 63; b >= 0; b--) { acc += hist[b]; if (acc >= cnt * 0.02) { top = Math.max(0.25, (b + 1) / 64); break; } }
          const all = cols * rows, zeros = all - cnt; acc = zeros; if (acc < all * 0.4) for (let b = 0; b < 64; b++) { acc += hist[b]; if (acc >= all * 0.4) { low = Math.min(top * 0.6, (b + 1) / 64); break; } }
        }
        for (let cy = 0; cy < rows; cy++) {
          if (p.resolve && cy / rows < 1 - res - 0.02) continue;
          for (let cx = 0; cx < cols; cx++) {
            let d = D[cy * cols + cx]; if (d <= 0) continue;
            d = clamp((d - low) / Math.max(0.05, top - low)); d = clamp((d - (p.floor ?? 0.07)) / (1 - (p.floor ?? 0.07))); d = Math.pow(d, p.gamma ?? 0.75);
            if (enter === 'fade') d *= qIn; if (exit === 'fade') d *= qOut;
            if (p.live) { const j = hash(cx, cy, Math.floor(t * 8) + seed); if (j < p.live * 0.05) d = clamp(d + (j < p.live * 0.025 ? 0.12 : -0.12)); }
            let gi = Math.round(d * (R - 1)); if (gi <= 0) continue;
            const r0 = order(cx, cy, cols, rows, enter === 'fade' || enter === 'none' ? 'random' : enter), r1 = order(cx, cy, cols, rows, 'random');
            const vin = enter === 'fade' || enter === 'none' ? 1 : (qIn * (1 + band) - r0) / band, vout = exit === 'fade' || exit === 'none' ? 1 : (qOut * (1 + band) - r1) / band;
            const v = Math.min(vin, vout); if (v <= 0) continue;
            const dx = (ox + cx * m.cw) * dpr, dy = (oy + cy * m.ch) * dpr;
            // the edge where it resolves into the real image: a row of garbage
            const edge = p.resolve && res < 1 && res > 0 && Math.abs(cy / rows - (1 - res)) < 1.5 / rows;
            if (v < 1 || edge) { const ch = NOISE[Math.floor(hash(cx, cy, tick + seed) * NOISE.length)]; gx.drawImage(at2.cv, at2.index.get(ch) * at2.gw, 0, at2.gw, at2.gh, dx, dy, m.cw * dpr, m.ch * dpr); anyFx = true; continue; }
            gi = at2.index.get(A.ramp[gi]); g.drawImage(at2.cv, gi * at2.gw, 0, at2.gw, at2.gh, dx, dy, m.cw * dpr, m.ch * dpr);
          }
        }
        // tinting: white glyphs → ink / accent / source colours
        g.globalCompositeOperation = 'source-in';
        if (p.tint === 'source') {
          // source colours: lightened on dark grounds, darkened on light grounds (the glyphs are thin, raw colours look greyish), then mixed with a little ink
          const night = Lpaper < 0.5;
          g.imageSmoothingEnabled = false; g.filter = night ? 'brightness(2.6) saturate(1.5)' : 'brightness(0.72) saturate(1.4)';
          g.drawImage(samp, ox * dpr, oy * dpr, cols * m.cw * dpr, rows * m.ch * dpr); g.filter = 'none';
          g.globalCompositeOperation = 'source-atop'; g.globalAlpha = p.inkMix ?? 0.15; g.fillStyle = sc.ink; g.fillRect(0, 0, cv.width, cv.height); g.globalAlpha = 1;
        } else { g.fillStyle = tint(); g.fillRect(0, 0, cv.width, cv.height); }
        g.globalCompositeOperation = 'source-over';
        if (anyFx) { gx.globalCompositeOperation = 'source-in'; gx.fillStyle = A.accent; gx.fillRect(0, 0, fx.width, fx.height); gx.globalCompositeOperation = 'source-over'; }
        if (img) set(img, { clipPath: `inset(0 0 ${f1(res * 100)}% 0)` });
      });
      if (p.sfx !== false && enter !== 'none') F.sfx(at - dur, 'decode', p.gain ?? 0.4, { dur });
      // zooming in (cells getting finer) and resolving into the real image each get a sound too: a gust of air for the first, a burst of digital grain for the second
      if (p.sfx !== false && p.zoom) F.sfx(p.zoom.at - (p.zoom.dur ?? 1), 'whoosh', 0.35, { dur: p.zoom.dur ?? 1 });
      if (p.resolveSfx !== false && p.resolve) F.sfx(p.resolve.at - (p.resolve.dur ?? 0.6), 'decode', 0.35, { dur: p.resolve.dur ?? 0.6 });
      return { el: wrap, canvas: cv, img, box: { x: x0, y: y0, w, h } };
    };

    // ---------- impact title: letters made of characters (an invisible copy of the same text stays in the DOM for the automatic checks) ----------
    A.big = (parent, o) => {
      const size = F.px(o.size ?? (PT ? 200 : 240)), lines = String(o.text).split('\n'), maxW = o.maxW ?? F.W * (PT ? 0.9 : 0.86);
      const w = Math.min(maxW, Math.max(...lines.map((l) => l.length)) * size * 0.68), h = size * lines.length * 1.08;
      const x = o.x ?? F.W / 2, y = o.y ?? F.H / 2;
      const pl = A.plate(parent, { x, y, w, h, text: o.text, weight: o.weight ?? 800, font: o.font, at: o.at, until: o.until, enter: o.enter ?? 'scan', exit: o.exit ?? 'decode', dur: o.dur ?? 0.45, cell: o.cell ?? Math.max(F.px(7), Math.min(F.px(14), size / 15)), tint: o.color ?? o.tint, floor: 0.2, gamma: 0.6, z: o.z, sfx: false });
      const ghost = el('div', `left:${f1(x - w / 2)}px;top:${f1(y - h / 2)}px;width:${f1(w)}px;height:${f1(h)}px;display:flex;align-items:center;justify-content:center;text-align:center;font:${o.weight ?? 800} ${f1(size * 0.8)}px/1.05 ${A.display};opacity:0;white-space:pre-line`, pl.el.parentElement);
      ghost.textContent = o.text; F.text(ghost, o.kind ?? 'slam', String(o.text), o.at - (o.dur ?? 0.45), o.until ?? 1e9);
      if (o.sfx !== false) F.sfx(o.at, 'impact', o.gain ?? 0.6, { size: 0.6 });
      F.sfx(o.at - (o.dur ?? 0.45), 'decode', 0.35, { dur: o.dur ?? 0.45 });
      return pl;
    };

    // ---------- typewriter: letters typed one by one, cursor following; on exit it backspaces away ----------
    A.type = (parent, o) => {
      const text = String(o.text), sz = F.px(o.size ?? 44), per = o.per ?? Math.min(0.045, 0.7 / Math.max(1, text.length)), d = per * text.length;
      const at = o.at, until = o.until ?? 1e9, t0 = at - d, prompt = o.prompt ?? '';
      const align = o.align ?? 'center', maxW = o.maxW ?? F.W * (PT ? 0.86 : 0.7);
      const box = el('div', `${align === 'left' ? `left:${f1(o.x ?? F.W * 0.1)}px;` : align === 'right' ? `right:${f1(F.W - (o.x ?? F.W * 0.9))}px;` : `left:${f1((o.x ?? F.W / 2) - maxW / 2)}px;`}width:${f1(maxW)}px;top:${f1((o.y ?? F.H / 2) - sz * 0.62)}px;text-align:${align};font:${o.weight ?? 500} ${f1(sz)}px/1.25 ${A.font};color:${o.color ?? 'inherit'};white-space:pre-wrap;display:none;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      if (!o.color) set(box, { color: schemeOf(parent).ink });
      const pre = el('span', `position:relative;color:${A.muted}`, box); pre.textContent = prompt;
      const body = el('span', 'position:relative', box);
      const cur = el('span', `position:relative;display:inline-block;width:.55em;height:1.05em;margin-left:.06em;vertical-align:-.16em;background:${o.cursorColor ?? A.accent}`, box);
      cur.dataset.motion = 'skip';   // the cursor moving right with the text is the typing itself; the motion check doesn't measure it
      const ghost = el('span', 'position:relative;visibility:hidden', box);   // placeholder: laid out as the full line even before typing finishes, so typed letters don't jump
      F.text(box, o.kind ?? 'label', text, t0, until);
      const keep = o.cursor ?? 'blink';   // blink keeps blinking after typing | hide removes it when done | false no cursor
      F.add((t) => {
        const on = t >= t0 - 0.05 && t < until; set(box, { display: on ? '' : 'none' }); if (!on) return;
        const back = until < 1e8 ? seg(t, until - Math.min(0.35, d * 0.5), until - 0.04) : 0;
        const n = Math.round(clamp((t - t0) / Math.max(0.001, d)) * text.length * (1 - back));
        body.textContent = text.slice(0, n); ghost.textContent = text.slice(n);
        const typing = t < at || back > 0, blink = Math.floor((t - at) / 0.4) % 2 === 0;
        set(cur, { opacity: keep === false ? '0' : typing ? '1' : keep === 'hide' ? '0' : blink ? '1' : '0' });
      });
      if (o.sfx !== false) { keys(t0, d, Math.min(18, Math.ceil(text.length / 2)), o.gain ?? 0.3); F.sfx(at, 'click', (o.gain ?? 0.3) * 1.2); }   // done typing: Return
      return { el: box };
    };

    // ---------- a box in box-drawing characters (traced along its edges), filled with paper colour ----------
    A.box = (parent, o) => {
      const m = metric(o.cell ?? A.cell), cols = Math.max(4, Math.floor(o.w / m.cw)), rows = Math.max(3, Math.floor(o.h / m.ch)), W2 = cols * m.cw, H2 = rows * m.ch;
      const x0 = (o.x ?? F.W / 2) - W2 / 2, y0 = (o.y ?? F.H / 2) - H2 / 2, at = o.at ?? 0, until = o.until ?? 1e9, d = o.dur ?? 0.4;
      const sc = schemeOf(parent);
      const wrap = el('div', `left:${f1(x0)}px;top:${f1(y0)}px;width:${f1(W2)}px;height:${f1(H2)}px;display:none;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      const fill = el('div', `left:${f1(m.cw / 2)}px;top:${f1(m.ch / 2)}px;right:${f1(m.cw / 2)}px;bottom:${f1(m.ch / 2)}px;background:${o.fill ?? sc.paper}`, wrap);
      const pre = el('div', `left:0;top:0;font:500 ${f1(m.fs)}px/${f1(m.ch)}px ${A.font};color:${o.color ?? sc.ink};white-space:pre`, wrap);
      const inner = el('div', `left:${f1(m.cw * 2)}px;top:${f1(m.ch * 1.5)}px;right:${f1(m.cw * 2)}px;bottom:${f1(m.ch)}px`, wrap);
      // cells along the perimeter (clockwise); those before q are drawn
      const per = []; for (let i = 0; i < cols; i++) per.push([i, 0]); for (let j = 1; j < rows; j++) per.push([cols - 1, j]); for (let i = cols - 2; i >= 0; i--) per.push([i, rows - 1]); for (let j = rows - 2; j > 0; j--) per.push([0, j]);
      const glyph = (i, j) => (j === 0 ? (i === 0 ? '┌' : i === cols - 1 ? '┐' : '─') : j === rows - 1 ? (i === 0 ? '└' : i === cols - 1 ? '┘' : '─') : '│');
      const title = o.title ? `┤ ${o.title} ├` : '';
      if (o.title) F.text(pre, 'label', o.title, at - d, until, { overlap: true });
      let last = -1;
      F.add((t) => {
        const on = t >= at - d && t < until; set(wrap, { display: on ? '' : 'none' }); if (!on) return;
        const q = seg(t, at - d, at, E.quartOut), qo = until < 1e8 ? seg(t, until - 0.3, until) : 0, n = Math.round(per.length * q * (1 - qo));
        set(fill, { opacity: String((seg(t, at - d * 0.6, at) * (1 - qo)).toFixed(3)) });
        if (n === last) return; last = n;
        const grid = Array.from({ length: rows }, () => Array(cols).fill(' '));
        for (let k = 0; k < n; k++) { const [i, j] = per[k]; grid[j][i] = glyph(i, j); }
        if (title && n === per.length) for (let k = 0; k < title.length && k + 2 < cols - 1; k++) grid[0][k + 2] = title[k];
        pre.textContent = grid.map((r) => r.join('')).join('\n');
      });
      if (o.sfx !== false) keys(at - d, d, 5, 0.22);
      return { el: wrap, inner, w: W2, h: H2, cols, rows, m };
    };

    // ---------- signature move: a ring of characters ripples out from a point (two rings, like sonar) ----------
    A.ping = (parent, o) => {
      const at = o.at, d = o.dur ?? 1.1, r = F.px(o.r ?? 360), x = o.x ?? F.W / 2, y = o.y ?? F.H / 2;
      A.plate(parent, { x, y, w: r * 2, h: r * 2, at, until: at + d, enter: 'none', exit: 'none', tint: 'accent', z: o.z ?? 6, cell: o.cell ?? A.cell * 0.9, sfx: false, floor: 0.05, gamma: 1, dur: 0,
        draw: (g, t, w, h) => {
          const q = seg(t, at, at + d, E.quartOut); if (q <= 0 || q >= 1) return;
          g.strokeStyle = A.accent;
          [0, 0.2].forEach((lag) => { const qq = clamp((q - lag) / (1 - lag)); if (qq <= 0) return; g.globalAlpha = (1 - qq) * 0.95; g.lineWidth = r * 0.07 * (1 - qq * 0.5); g.beginPath(); g.arc(w / 2, h / 2, r * (0.12 + 0.82 * qq), 0, Math.PI * 2); g.stroke(); });
          g.globalAlpha = 1;
        } });
      F.sfx(at, 'ping', o.gain ?? 0.4);
    };

    // ---------- transition: a block of inverted characters sweeps in from one side, covers, then sweeps away ----------
    A.wipe = (o) => {
      const d = o.dur ?? 0.9, a = o.at, from = o.from ?? 'left', ink = o.ink ?? A.ink, paperC = o.paper ?? A.paper, cell = o.cell ?? A.cell * 1.2;
      const cv = el('canvas', `left:0;top:0;width:${F.W}px;height:${F.H}px;z-index:${o.z ?? 900};pointer-events:none;display:none`, F.stage); cv.width = Math.ceil(F.W * dpr); cv.height = Math.ceil(F.H * dpr);
      const tx = el('canvas', `left:0;top:0;width:${F.W}px;height:${F.H}px;z-index:${(o.z ?? 900) + 1};pointer-events:none;display:none;opacity:.5`, F.stage); tx.width = cv.width; tx.height = cv.height;
      const g = cv.getContext('2d'), gt = tx.getContext('2d');
      F.add((t) => {
        const on = t >= a && t < a + d; set(cv, { display: on ? '' : 'none' }); set(tx, { display: on ? '' : 'none' }); if (!on) return;
        const m = metric(cell), cols = Math.ceil(F.W / m.cw), rows = Math.ceil(F.H / m.ch), at2 = atlasOf(cell, GLYPHS), q = (t - a) / d;
        // first half: the edge pushes from -0.15 to 1.15 (full cover); second half: retreats out the same side
        const front = q < 0.5 ? lerp(-0.15, 1.15, E.cubicInOut(q * 2)) : lerp(-0.15, 1.15, E.cubicInOut((q - 0.5) * 2)), covering = q < 0.5;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); gt.setTransform(1, 0, 0, 1, 0, 0); gt.clearRect(0, 0, tx.width, tx.height);
        const pos = (cx, cy) => (from === 'left' ? cx / cols : from === 'right' ? 1 - cx / cols : from === 'top' ? cy / rows : 1 - cy / rows);
        g.fillStyle = ink;
        for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
          const p0 = pos(cx, cy) + (hash(cx, cy, 31) - 0.5) * 0.12, inn = covering ? p0 < front : p0 > front;
          if (!inn) continue;
          g.fillRect(Math.floor(cx * m.cw * dpr), Math.floor(cy * m.ch * dpr), Math.ceil(m.cw * dpr) + 1, Math.ceil(m.ch * dpr) + 1);
          // the texture inside is fixed per cell (flipping the whole screen at once would flash, section 0); only the narrow leading band flips
          const edge = Math.abs(p0 - front) < 0.08, r = edge ? hash(cx, cy, Math.floor(t * 12)) : hash(cx, cy, 77);
          if (!edge && r >= 0.18) continue;
          const ch = edge ? NOISE[Math.floor(r * NOISE.length)] : A.ramp[1 + Math.floor((r / 0.18) * 4)], i = at2.index.get(ch);
          if (i !== undefined) gt.drawImage(at2.cv, i * at2.gw, 0, at2.gw, at2.gh, cx * m.cw * dpr, cy * m.ch * dpr, m.cw * dpr, m.ch * dpr);
        }
        // covered cells keep a layer of inverted character texture (paper-coloured characters)
        gt.globalCompositeOperation = 'source-in'; gt.fillStyle = paperC; gt.fillRect(0, 0, tx.width, tx.height); gt.globalCompositeOperation = 'source-over';
      });
      F.sfx(a, 'wipe', o.gain ?? 0.45, { dur: d });
      return a + d / 2;
    };

    // ---------- this scene's ground ----------
    A.bg = (layer, o = {}) => {
      if (o.invert) layer._ascii = { ...A.night };
      const sc = schemeOf(layer), v = o.variant ?? 0;
      const d = el('div', `inset:0;background:${sc.paper}`, layer);
      const m = metric(A.cell), cols = Math.ceil(F.W / m.cw), rows = Math.ceil(F.H / m.ch);
      const tx = el('div', `left:0;top:0;font:500 ${f1(m.fs)}px/${f1(m.ch)}px ${A.font};color:${sc.ink};opacity:${dark || o.invert ? 0.12 : 0.1};white-space:pre;pointer-events:none`, d);
      let s = '';
      if (v % 3 === 0) for (let j = 0; j < rows; j++) { let r = ''; for (let i = 0; i < cols; i++) r += i % 4 === 0 && j % 2 === 0 ? '·' : ' '; s += r + '\n'; }   // dot grid
      else if (v % 3 === 1) for (let j = 0; j < rows; j++) s += String(j + 1).padStart(3, '0') + '\n';                                                      // line numbers (like an editor)
      else { const c = Math.max(4, Math.floor(cols * 0.03)), r0 = Math.max(2, Math.floor(rows * 0.06)), r1 = rows - r0 - 1; for (let j = 0; j < rows; j++) { const L = Array(cols).fill(' '); if (j === r0 || j === r1) { L[c] = j === r0 ? '┌' : '└'; L[c + 1] = '─'; L[cols - c - 1] = j === r0 ? '┐' : '┘'; L[cols - c - 2] = '─'; } else if (j === r0 + 1 || j === r1 - 1) { L[c] = '│'; L[cols - c - 1] = '│'; } s += L.join('') + '\n'; } }   // viewfinder marks in the four corners
      tx.textContent = s;
      return { el: d };
    };

    // ---------- end card ----------
    A.endcard = (parent, o) => {
      const at = o.at;
      A.big(parent, { at: at + 0.45, text: o.title, size: o.size ?? (PT ? 170 : 200), y: F.H * (PT ? 0.42 : 0.4), kind: 'logo', dur: 0.6 });
      if (o.tagline) A.type(parent, { at: at + 1.2, text: o.tagline, size: PT ? 40 : 42, y: F.H * (PT ? 0.53 : 0.58), kind: 'endcard', cursor: false });
      if (o.url) A.type(parent, { at: at + 1.8, text: o.url, size: PT ? 44 : 46, y: F.H * (PT ? 0.6 : 0.68), kind: 'endcard', color: A.accent, prompt: '> ' });
    };

    A.schemeOf = schemeOf;
    return P.infoKit ? P.infoKit(A, { plate: 'image' }) : A;   // info-density check: info-carrying components register themselves when called (promo.js's infoKit)
  };
})();
