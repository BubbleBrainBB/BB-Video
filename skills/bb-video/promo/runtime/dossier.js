// dossier.js: the clipping-file commentary (剪报解说) style, one of bb-video's visual styles (style notes in styles/dossier/STYLE.md). Load after promo.js.
// One frame: a modern finance-commentary film built from paper. Newspaper clippings on grey newsprint (dense columns, a heavy Song headline with a
// yellow-green highlighter stroke, an English sub-head, black-and-white halftone photos); real source documents (press releases, filings, central-bank
// statements) re-typeset under an invented masthead, the camera pushing from the whole page into one line, where a translation bar, a pinned tag or a
// marker lands on the exact words; sheets flying in over a picture; an ink-brush smear between shots; big thumbnail-style title cards; data callouts.
// A chapter bar runs across the top, bold outlined captions sit at the bottom, a channel mark in the corner; grain and a vignette over everything.
// The masthead and the channel are fictional; documents use our own layout (never a company's logo or trade dress).
//
//   const R = PROMO.dossier(F, { brand: { name, en }, masthead, grade: { saturate, contrast, grain, vignette }, chapters, logo, captions, fonts, colors })
//   World units: frame height = 1000 (R.g(v) → px); frame width R.FW (1778 landscape, 562.5 portrait). Shots hold a world of paper that a camera frames.
//   SHOTS     const S = R.shot(a, b, { bg: 'desk' | 'news' | 'dark' | css colour, in: 'cut' | 'dissolve' | 'blur' | 'brush', dur, drift })
//             S.cam(t, view, ease) a camera key; S.push(from, to, a?, b?, ease) two keys; view = { x, y, h } (world centre + visible height) or
//             { on: target | sheet, pad, dx, dy, h, r }; drift = slow creep (default 0.04: 4 % closer over the shot); S.defocus(a, b, px) a focus pulse
//   SHEETS    (paper in the world; x / y = top-left, w / h in world units, rot in degrees; at = when it shows; enter: 'none' | 'fly' | 'drop' | 'rise' | 'fade')
//             S.page({ headline, mark, en, sub, kicker, date, photo, photo2, lead, heads, body, … })  a newspaper clipping page
//             S.doc({ kind: 'release' | 'filing' | 'statement' | 'notice', issuer, title, sub, date, blocks: [{ h } | { p } | { li } | { table }], source, masthead })
//             S.photo(src, { caption, halftone, tone, border }) a printed photo;  S.backdrop(src, { tone, halftone }) a picture filling the frame (B-roll)
//             S.chart({ title, unit, kind: 'line' | 'bars', labels, series: [{ values, label }], note, source, dur })  a printed chart clipping
//             S.table({ title, cols, rows: [{ cells, at, mark }], source })  a printed table, rows inked in one by one
//             sheet.find('exact words', nth) → a target (a span around those words);  sheet.block(i) → a target (the i-th block of a doc)
//   ON PAPER  S.mark(target, { at, dur, color })  highlighter;  S.translate(target, zh, { at, color: 'blue' | 'red', mode: 'over' | 'above' | 'below' | 'right', size, w })
//             S.tag(target, text, { at, side: 'left' | 'right' | 'above' | 'below' })  a small black tag;  S.circle / S.underline / S.strike(target, { at })
//   OVERLAYS  (frame units) S.callout({ at, x, y, icon, from, to, label, size, dur });  S.bullets(items, { at, x, y, size, gap });  S.box(text, { at, x, y, size })
//             S.source(text, { at })  a small source tag under the chapter bar
//   WHOLE     R.title(a, b, { lines, art, tone, in, align })  a thumbnail-style title card;  R.inset(a, b)  the picture inset in a dark frame (B-roll stretches)
//             R.end(a, b, { title, sub, sources, notes })  the closing sheet with the sources and picture credits
//   PICTURES  src = a painter name in R.art (skyline / servers / wafer / chip / facade / screens), a function (c, w, h, o), or an assets/manifest.js key
//             (photos from footage.mjs carry their credit). R.halftone(canvas, o) turns any canvas into a black-and-white dot screen.
// Times: a = in, b = out. The runtime makes its own chapter bar and captions when the film is narrated: set chapters: false in compose.
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('dossier.js 要在 promo.js 之后加载', 'dossier.js must load after promo.js'));
  const { E, seg, set, el, esc, frameT } = P;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const rnd = (s) => window.EV.rng(s);
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mix = (a, b, q) => a + (b - a) * q;
  const node = (tag, css, parent, html) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (html !== undefined) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };

  P.dossier = function (F, opt = {}) {
    // Portrait (9:16) default = 'band': the 16:9 film plays in a band across the middle of the tall frame, the way these programmes are watched on
    //   phones — the chapter bar and the title above it, the captions below it — so every landscape shot, camera move and layout works unchanged.
    //   opt.portrait: 'fill' lays the paper out on the tall frame itself instead (write portrait framings yourself).
    const BAND = F.portrait && opt.portrait !== 'fill', RW = F.W, RH = F.H;
    const W = BAND ? 1920 : F.W, H = BAND ? 1080 : F.H, PT = F.portrait && !BAND, g = H / 1000, FW = W / g, AR = W / H;
    const BK = BAND ? RW / W : 1, BY = BAND ? Math.round(RH * 0.3) : 0, BASE = BAND ? `translate(0px,${BY}px) scale(${BK}) ` : '';
    const gx = (v) => v * g;
    const C = { news: '#d9d7cf', white: '#f3f2ee', ink: '#151515', grey: '#8c8b86', mark: 'rgba(206,232,38,.82)', red: '#c81e28', blue: '#22309a', tag: '#121212', desk: '#1c1c1c', ...(opt.colors || {}) };
    const FONT = { zh: '"Noto Serif SC", "Songti SC", serif', sans: '"Noto Sans SC", "PingFang SC", sans-serif', en: '"Source Serif 4", "Noto Serif SC", Georgia, serif', ensans: 'Inter, "Noto Sans SC", Arial, sans-serif', caps: '"Playfair Display", "Source Serif 4", Georgia, serif', ...(opt.fonts || {}) };
    const brand = { name: M('铅字局', 'Leadtype'), en: 'LEADTYPE', ...(opt.brand || {}) };
    const masthead = opt.masthead ?? 'THE LEADTYPE POST';
    const G = { saturate: 0.88, contrast: 1.06, brightness: 1, grain: 0.5, vignette: 0.55, ...(opt.grade || {}) };
    const R = { F, g: gx, FW, colors: C, fonts: FONT, brand, masthead };
    F.stillMax(1.0);   // paper holds still between moves; the drift keeps it alive
    F.blurBase(1);     // slow pushes need no motion blur; fly-ins, brush and blur transitions register their own F.blur spans

    // ---------- layers: the dark surround (inset), the screen (graded shots, grain, vignette), the HUD (chapter bar, captions, mark) ----------
    const back = el('div', `left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0;${BASE ? `transform:${BASE};` : ''}z-index:2;display:none;background:#121212`, F.stage);
    const screen = el('div', `left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;z-index:10;transform-origin:0 0;${BASE ? `transform:${BASE};` : ''}background:#000`, F.stage);
    const graded = el('div', `inset:0;filter:saturate(${G.saturate}) contrast(${G.contrast}) brightness(${G.brightness})`, screen);
    const fx = el('canvas', `inset:0;width:${W}px;height:${H}px;z-index:700;pointer-events:none;display:none`, screen); fx.dataset.motion = 'skip';
    fx.width = Math.round(W / 2); fx.height = Math.round(H / 2);
    const fxc = fx.getContext('2d');
    const vig = el('div', `inset:0;z-index:720;pointer-events:none;background:radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 50%, rgba(0,0,0,${(0.42 * G.vignette).toFixed(3)}) 82%, rgba(0,0,0,${(0.85 * G.vignette).toFixed(3)}) 100%)`, screen); vig.dataset.motion = 'skip';
    const hud = el('div', 'inset:0;z-index:860;pointer-events:none', F.stage);
    Object.assign(R, { screen, graded, hud, back });

    // grain: a few noise tiles made once, one shown per frame (12 changes a second: texture, not motion)
    if (G.grain > 0) {
      const GR = 2, NT = 6, tiles = [];
      const box = el('div', `inset:0;z-index:710;pointer-events:none;mix-blend-mode:overlay;opacity:${(0.36 * G.grain).toFixed(2)}`, screen); box.dataset.motion = 'skip';
      for (let k = 0; k < NT; k++) {
        const cv = el('canvas', `inset:0;width:${W}px;height:${H}px;display:none`, box); cv.width = Math.ceil(W / GR); cv.height = Math.ceil(H / GR); cv.dataset.motion = 'skip';
        const c = cv.getContext('2d'), img = c.createImageData(cv.width, cv.height), r = rnd(k * 6151 + 29);
        for (let i = 0; i < img.data.length; i += 4) { const v = (128 + (r() + r() + r() - 1.5) * 150) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        c.putImageData(img, 0, 0); tiles.push(cv);
      }
      let last = -1;
      F.add((t) => { const k = Math.floor(t * 12 + 1e-6) % NT; if (k !== last) { if (last >= 0) tiles[last].style.display = 'none'; tiles[k].style.display = ''; last = k; } });
    }

    // ---------- paper textures (made once per kind, tiled) ----------
    const texCache = {}, texWait = [];
    const tex = (kind) => {
      if (texCache[kind]) return texCache[kind];
      const S2 = 512, cv = document.createElement('canvas'); cv.width = cv.height = S2;
      const c = cv.getContext('2d'), r = rnd(kind.length * 977 + 3);
      const base = kind === 'news' ? [217, 215, 207] : kind === 'dark' ? [30, 30, 30] : kind === 'photo' ? [238, 237, 232] : [243, 242, 238];
      const amp = kind === 'news' ? 20 : kind === 'dark' ? 14 : 9;
      // low-frequency blotches (tileable: a 16×16 random grid, wrapped, smoothed by drawing it up-scaled)
      const lo = document.createElement('canvas'); lo.width = lo.height = 16; const lc = lo.getContext('2d'), li = lc.createImageData(16, 16);
      for (let i = 0; i < li.data.length; i += 4) { const v = 128 + (r() - 0.5) * 60; li.data[i] = li.data[i + 1] = li.data[i + 2] = v; li.data[i + 3] = 255; }
      lc.putImageData(li, 0, 0);
      c.fillStyle = `rgb(${base})`; c.fillRect(0, 0, S2, S2);
      c.globalAlpha = kind === 'news' ? 0.14 : 0.07; c.globalCompositeOperation = 'overlay'; c.imageSmoothingEnabled = true;
      for (const dx of [-S2, 0, S2]) for (const dy of [-S2, 0, S2]) c.drawImage(lo, dx, dy, S2, S2);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      const img = c.getImageData(0, 0, S2, S2), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const n = (r() + r() - 1) * amp; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.96; }
      c.putImageData(img, 0, 0);
      // fibres (wrapped at the edges so the tile repeats without a seam)
      const nf = kind === 'news' ? 260 : 110;
      for (let k = 0; k < nf; k++) {
        const x = r() * S2, y = r() * S2, a = r() * Math.PI, l = 4 + r() * 18, dark = r() < 0.55;
        c.strokeStyle = dark ? `rgba(60,58,52,${0.05 + r() * 0.12})` : `rgba(255,255,255,${0.08 + r() * 0.15})`; c.lineWidth = 0.6 + r() * 0.8;
        for (const ox of [-S2, 0, S2]) for (const oy of [-S2, 0, S2]) { c.beginPath(); c.moveTo(x + ox, y + oy); c.quadraticCurveTo(x + ox + Math.cos(a) * l * 0.5 + (r() - 0.5) * 4, y + oy + Math.sin(a) * l * 0.5, x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); c.stroke(); }
      }
      if (kind === 'news') {   // a faint print screen: newsprint always shows its dots in the greys
        c.fillStyle = 'rgba(40,40,36,.06)';
        for (let y = 0; y < S2; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < S2; x += 4) { c.beginPath(); c.arc(x, y, 0.9, 0, 7); c.fill(); }
      }
      const url = cv.toDataURL('image/png'); texCache[kind] = url;
      texWait.push(new Promise((res) => { const im = new Image(); im.onload = im.onerror = res; im.src = url; }));
      return url;
    };
    R.tex = tex;

    // ---------- pictures: painters, photos, halftone ----------
    const ART = (R.art = {});
    const lum = (c, w, h) => { const d = c.getImageData(0, 0, w, h).data, L = new Float32Array(w * h); for (let i = 0, j = 0; i < d.length; i += 4, j++) L[j] = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; return L; };
    // a black-and-white dot screen: dot size by darkness on a grid turned 45°, paper ground, a little ink spread
    R.halftone = (src, o = {}) => {
      const w = src.width, h = src.height, out = document.createElement('canvas'); out.width = w; out.height = h;
      const c = out.getContext('2d'), sc = 4, sw = Math.ceil(w / sc), shh = Math.ceil(h / sc), small = document.createElement('canvas'); small.width = sw; small.height = shh;
      const s2 = small.getContext('2d'); s2.drawImage(src, 0, 0, sw, shh);
      const L = lum(s2, sw, shh), con = o.contrast ?? 1.25, br = o.bright ?? 0, gm = o.gamma ?? 1;
      const at = (x, y) => { const xi = cl(Math.floor(x / sc), 0, sw - 1), yi = cl(Math.floor(y / sc), 0, shh - 1); return cl(Math.pow(cl((L[yi * sw + xi] - 0.5) * con + 0.5 + br), gm)); };
      c.fillStyle = o.paper ?? '#e4e2da'; c.fillRect(0, 0, w, h);
      c.fillStyle = o.ink ?? '#141414';
      const cell = o.cell ?? Math.max(3, Math.round(Math.min(w, h) / 170)), an = ((o.angle ?? 45) * Math.PI) / 180, ca = Math.cos(an), sa = Math.sin(an), R2 = Math.hypot(w, h);
      for (let v = -R2; v < R2; v += cell) for (let u = -R2; u < R2; u += cell) {
        const x = w / 2 + u * ca - v * sa, y = h / 2 + u * sa + v * ca;
        if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue;
        const dk = 1 - at(x, y); if (dk < 0.04) continue;
        const r = cell * 0.5 * Math.sqrt(dk) * 1.42;
        c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
      }
      // ink spread and press noise
      const r = rnd(w * 7 + h), img = c.getImageData(0, 0, w, h), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
      c.putImageData(img, 0, 0);
      return out;
    };
    // tone a canvas in place: 'bw' (grey, contrast), 'muted', 'color'
    const toneIt = (cv, tone) => {
      if (!tone || tone === 'color') return cv;
      const out = document.createElement('canvas'); out.width = cv.width; out.height = cv.height; const c = out.getContext('2d');
      c.filter = tone === 'bw' ? 'grayscale(1) contrast(1.18) brightness(.95)' : 'saturate(.45) contrast(1.08)'; c.drawImage(cv, 0, 0); return out;
    };
    const mediaImage = (key) => (window.MEDIA_ASSETS && window.MEDIA_ASSETS.images && window.MEDIA_ASSETS.images[key]) || null;
    const creditLine = (c) => [c.title, c.author, c.licence].filter(Boolean).join(' · ');
    // a picture canvas of w × h px: painted now (painter) or once the photo has loaded (manifest key, in a prep)
    const picture = (src, pw, ph, o = {}) => {
      const cv = document.createElement('canvas'); cv.width = Math.round(pw); cv.height = Math.round(ph);
      const finish = (raw) => { const c = cv.getContext('2d'); const done = o.halftone ? R.halftone(raw, o.ht || {}) : toneIt(raw, o.tone); c.drawImage(done, 0, 0); };
      const paint = typeof src === 'function' ? src : typeof src === 'string' && ART[src] ? ART[src] : null;
      if (paint) { const raw = document.createElement('canvas'); raw.width = cv.width; raw.height = cv.height; paint(raw.getContext('2d'), raw.width, raw.height, { seed: o.seed ?? 1, ...(o.art || {}) }); finish(raw); return { cv, credit: null }; }
      const m = typeof src === 'string' ? mediaImage(src) : null;
      if (!m) throw new Error(M(`dossier：没有这张图 "${src}"：R.art 里的画法（${Object.keys(ART).join(' / ')}）、一个函数，或者 assets/manifest.js 里的图片（放进 assets/src/，跑 assets.mjs）`, `dossier: no picture "${src}": a painter in R.art (${Object.keys(ART).join(', ')}), a function, or an image in assets/manifest.js (put it in assets/src/ and run assets.mjs)`));
      if (m.credit) F.credit({ ...m.credit, file: m.file });
      else console.warn(M(`dossier：图片 "${src}" 没有来源 / 许可信息（用 footage.mjs 下载，或者在 assets/src/${src}.json 里写 { title, author, licence, url }）`, `dossier: image "${src}" has no source / licence (fetch it with footage.mjs, or write { title, author, licence, url } in assets/src/${src}.json)`));
      F.prep(() => new Promise((res) => {
        const im = new Image(); im.onload = () => { const raw = document.createElement('canvas'); raw.width = cv.width; raw.height = cv.height; const c = raw.getContext('2d');
          const s = Math.max(raw.width / im.width, raw.height / im.height), [fx0, fy0] = (o.pos || '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
          c.drawImage(im, (raw.width - im.width * s) * fx0, (raw.height - im.height * s) * fy0, im.width * s, im.height * s); finish(raw); res(); };
        im.onerror = res; im.src = 'assets/' + m.file;
      }));
      return { cv, credit: m.credit || null };
    };

    // painters: (c, w, h, o) — dramatic, grey-friendly pictures drawn in code (they read as news photos once halftoned or graded)
    ART.skyline = (c, w, h, o = {}) => {
      const r = rnd(o.seed ?? 3), hz = h * (o.horizon ?? 0.78);
      const sky = c.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, '#59606b'); sky.addColorStop(0.55, '#a9abae'); sky.addColorStop(1, '#ece6da');
      c.fillStyle = sky; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 6; k++) { c.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.05})`; c.beginPath(); c.ellipse(r() * w, h * (0.15 + r() * 0.35), w * (0.2 + r() * 0.3), h * (0.03 + r() * 0.05), 0, 0, 7); c.fill(); }
      const rows = [{ n: 26, tall: 0.32, col: '#8a8d93', win: 0.2 }, { n: 16, tall: 0.55, col: '#4d5057', win: 0.35 }, { n: 9, tall: 0.75, col: '#202226', win: 0.5 }];
      for (const [ri, row] of rows.entries()) {
        let x = -w * 0.05;
        while (x < w * 1.05) {
          const bw = w / row.n * (0.6 + r() * 0.9), bh = h * row.tall * (0.35 + r() * 0.65), top = hz - bh + ri * h * 0.06;
          c.fillStyle = row.col; c.fillRect(x, top, bw, h - top);
          if (r() < 0.35) { c.fillRect(x + bw * 0.2, top - bh * 0.12, bw * 0.6, bh * 0.12 + 1); if (r() < 0.5) c.fillRect(x + bw * 0.48, top - bh * 0.28, bw * 0.04, bh * 0.16); }
          const cw = Math.max(2, bw / 9), chh = Math.max(2, h / 140);
          for (let yy = top + chh * 2; yy < h; yy += chh * 2.2) for (let xx = x + cw; xx < x + bw - cw; xx += cw * 1.8) if (r() < row.win) { c.fillStyle = `rgba(255,236,190,${0.25 + r() * 0.6})`; c.fillRect(xx, yy, cw, chh); }
          x += bw + w * 0.004;
        }
      }
      const haze = c.createLinearGradient(0, hz - h * 0.2, 0, h); haze.addColorStop(0, 'rgba(200,195,185,0)'); haze.addColorStop(1, 'rgba(10,10,12,.55)'); c.fillStyle = haze; c.fillRect(0, 0, w, h);
    };
    ART.servers = (c, w, h, o = {}) => {
      const r = rnd(o.seed ?? 5), vx = w * (o.vx ?? 0.5), vy = h * 0.46;
      c.fillStyle = '#0d0f12'; c.fillRect(0, 0, w, h);
      const glow = c.createRadialGradient(vx, vy, 0, vx, vy, w * 0.35); glow.addColorStop(0, 'rgba(190,210,230,.55)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = glow; c.fillRect(0, 0, w, h);
      // floor tiles
      c.strokeStyle = 'rgba(160,170,180,.18)'; c.lineWidth = Math.max(1, w / 900);
      for (let k = -12; k <= 12; k++) { c.beginPath(); c.moveTo(vx, vy); c.lineTo(vx + k * w * 0.12, h); c.stroke(); }
      for (let k = 1; k < 12; k++) { const y = vy + (h - vy) * Math.pow(k / 12, 2.2); c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      // racks both sides, from near to far
      for (const side of [-1, 1]) for (let k = 0; k < 14; k++) {
        const z0 = Math.pow(0.8, k), z1 = Math.pow(0.8, k + 1);
        const x0 = vx + side * w * 0.9 * z0, x1 = vx + side * w * 0.9 * z1, t0 = vy - h * 0.62 * z0, t1 = vy - h * 0.62 * z1, b0 = vy + h * 0.62 * z0, b1 = vy + h * 0.62 * z1;
        c.fillStyle = k % 2 ? '#1a1d22' : '#202429'; c.beginPath(); c.moveTo(x0, t0); c.lineTo(x1, t1); c.lineTo(x1, b1); c.lineTo(x0, b0); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,.6)'; c.stroke();
        for (let j = 0; j < 22; j++) { const q = (j + 0.5) / 22; for (let i = 0; i < 3; i++) { if (r() < 0.45) continue; const qq = (i + 0.5 + r() * 0.3) / 3.4, x = mix(x0, x1, qq), y = mix(mix(t0, t1, qq), mix(b0, b1, qq), q), s = Math.max(1, 3 * mix(z0, z1, qq) * w / 1000); c.fillStyle = r() < 0.8 ? `rgba(200,235,255,${0.5 + r() * 0.5})` : 'rgba(255,190,120,.8)'; c.fillRect(x, y, s * 1.6, s); } }
      }
      // ceiling trays
      c.strokeStyle = 'rgba(140,150,160,.35)'; c.lineWidth = Math.max(2, w / 400);
      for (const side of [-0.25, 0.25]) { c.beginPath(); c.moveTo(vx + side * w * 1.6, 0); c.lineTo(vx + side * w * 0.05, vy - h * 0.06); c.stroke(); }
    };
    ART.wafer = (c, w, h, o = {}) => {
      const r = rnd(o.seed ?? 7);
      const bg = c.createRadialGradient(w * 0.62, h * 0.4, 0, w * 0.6, h * 0.5, w * 0.8); bg.addColorStop(0, '#3a3f48'); bg.addColorStop(0.5, '#15171b'); bg.addColorStop(1, '#040405'); c.fillStyle = bg; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 22; k++) { const x = r() * w, y = r() * h * 0.6, s = w * (0.008 + r() * 0.035); const gg = c.createRadialGradient(x, y, 0, x, y, s); gg.addColorStop(0, `rgba(220,230,255,${0.12 + r() * 0.25})`); gg.addColorStop(0.7, 'rgba(220,230,255,.05)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gg; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); }
      const cx = w * (o.cx ?? 0.6), cy = h * (o.cy ?? 0.6), rx = w * (o.r ?? 0.34), ry = rx * 0.5, rot = -0.22;
      c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.ellipse(cx + rx * 0.03, cy + ry * 0.16, rx, ry, rot, 0, 7); c.fill();
      c.fillStyle = '#9aa0a8'; c.beginPath(); c.ellipse(cx, cy + ry * 0.05, rx, ry, rot, 0, 7); c.fill();   // the edge
      c.save(); c.beginPath(); c.ellipse(cx, cy, rx, ry, rot, 0, 7); c.clip();
      c.translate(cx, cy); c.rotate(rot);
      const face = c.createLinearGradient(-rx, -ry, rx, ry); face.addColorStop(0, '#2e3238'); face.addColorStop(0.42, '#6d747e'); face.addColorStop(0.5, '#e8ecf2'); face.addColorStop(0.58, '#7c838e'); face.addColorStop(1, '#23262b');
      c.fillStyle = face; c.fillRect(-rx, -ry, rx * 2, ry * 2);
      const n = 30, dw = (rx * 2) / n, dh = (ry * 2) / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (r() < 0.5) { c.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${(0.03 + r() * 0.07).toFixed(3)})`; c.fillRect(-rx + i * dw, -ry + j * dh, dw, dh); } }
      c.strokeStyle = 'rgba(15,17,20,.6)'; c.lineWidth = Math.max(1, w / 1100);
      for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(-rx + i * dw, -ry); c.lineTo(-rx + i * dw, ry); c.stroke(); c.beginPath(); c.moveTo(-rx, -ry + i * dh); c.lineTo(rx, -ry + i * dh); c.stroke(); }
      const sh = c.createLinearGradient(-rx, 0, rx, 0); sh.addColorStop(0.3, 'rgba(255,255,255,0)'); sh.addColorStop(0.46, 'rgba(255,255,255,.55)'); sh.addColorStop(0.62, 'rgba(255,255,255,0)'); c.fillStyle = sh; c.fillRect(-rx, -ry, rx * 2, ry * 2);
      c.restore();
      c.strokeStyle = 'rgba(240,244,250,.85)'; c.lineWidth = Math.max(2, w / 600); c.beginPath(); c.ellipse(cx, cy, rx, ry, rot, Math.PI * 1.1, Math.PI * 1.75); c.stroke();
    };
    ART.chip = (c, w, h, o = {}) => {
      const r = rnd(o.seed ?? 9);
      const bg = c.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, w * 0.7); bg.addColorStop(0, '#2c4030'); bg.addColorStop(1, '#0b120d'); c.fillStyle = bg; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(190,200,150,.22)'; c.lineWidth = Math.max(1, w / 700);
      for (let k = 0; k < 60; k++) { let x = r() * w, y = r() * h; c.beginPath(); c.moveTo(x, y); for (let s = 0; s < 4; s++) { if (r() < 0.5) x += (r() - 0.5) * w * 0.3; else y += (r() - 0.5) * h * 0.3; c.lineTo(x, y); } c.stroke(); }
      const s = Math.min(w, h) * 0.62, x0 = w / 2 - s / 2, y0 = h / 2 - s / 2;
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x0 + s * 0.04, y0 + s * 0.05, s, s);
      c.fillStyle = '#3a3f37'; c.fillRect(x0, y0, s, s);
      c.fillStyle = '#b9a76a';
      for (let i = 0; i < 18; i++) { const p = x0 + s * (0.06 + i * 0.05); c.fillRect(p, y0 - s * 0.035, s * 0.022, s * 0.03); c.fillRect(p, y0 + s * 1.005, s * 0.022, s * 0.03); c.fillRect(x0 - s * 0.035, y0 + s * (0.06 + i * 0.05), s * 0.03, s * 0.022); c.fillRect(x0 + s * 1.005, y0 + s * (0.06 + i * 0.05), s * 0.03, s * 0.022); }
      const d = s * 0.56, dx = w / 2 - d / 2, dy = h / 2 - d / 2;
      const die = c.createLinearGradient(dx, dy, dx + d, dy + d); die.addColorStop(0, '#8d949c'); die.addColorStop(0.45, '#dfe3e8'); die.addColorStop(0.55, '#a4abb3'); die.addColorStop(1, '#5c6168');
      c.fillStyle = die; c.fillRect(dx, dy, d, d);
      c.strokeStyle = 'rgba(40,44,50,.35)';
      for (let i = 1; i < 12; i++) { c.beginPath(); c.moveTo(dx + (d * i) / 12, dy); c.lineTo(dx + (d * i) / 12, dy + d); c.stroke(); c.beginPath(); c.moveTo(dx, dy + (d * i) / 12); c.lineTo(dx + d, dy + (d * i) / 12); c.stroke(); }
      for (let k = 0; k < 10; k++) { c.fillStyle = `rgba(40,44,50,${0.15 + r() * 0.2})`; c.fillRect(dx + r() * d * 0.8, dy + r() * d * 0.8, d * (0.08 + r() * 0.15), d * (0.05 + r() * 0.12)); }
    };
    ART.facade = (c, w, h, o = {}) => {
      const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#6f7680'); sky.addColorStop(1, '#d7d3cb'); c.fillStyle = sky; c.fillRect(0, 0, w, h);
      const n = o.columns ?? 8, L = w * 0.08, Rr = w * 0.92, top = h * 0.3, base = h * 0.82, cw = (Rr - L) / (n * 1.6);
      c.fillStyle = '#e7e3da'; c.beginPath(); c.moveTo(L - w * 0.03, top); c.lineTo(w / 2, h * 0.1); c.lineTo(Rr + w * 0.03, top); c.closePath(); c.fill();
      c.fillStyle = '#c9c4b9'; c.beginPath(); c.moveTo(L + w * 0.03, top - h * 0.015); c.lineTo(w / 2, h * 0.14); c.lineTo(Rr - w * 0.03, top - h * 0.015); c.closePath(); c.fill();
      c.fillStyle = '#ebe7de'; c.fillRect(L - w * 0.03, top, Rr - L + w * 0.06, h * 0.05);
      c.fillStyle = '#4c4a46'; c.fillRect(L, top + h * 0.05, Rr - L, base - top - h * 0.05);
      for (let i = 0; i < n; i++) {
        const x = L + cw * 0.3 + i * cw * 1.6 + cw * 0.3, gr = c.createLinearGradient(x, 0, x + cw, 0);
        gr.addColorStop(0, '#9b968c'); gr.addColorStop(0.35, '#f2eee6'); gr.addColorStop(0.7, '#cfc9be'); gr.addColorStop(1, '#8a857b');
        c.fillStyle = gr; c.fillRect(x, top + h * 0.05, cw, base - top - h * 0.05);
        c.strokeStyle = 'rgba(80,76,70,.25)'; c.lineWidth = Math.max(1, cw / 14);
        for (let k = 1; k < 6; k++) { c.beginPath(); c.moveTo(x + (cw * k) / 6, top + h * 0.06); c.lineTo(x + (cw * k) / 6, base); c.stroke(); }
        c.fillStyle = '#e7e3da'; c.fillRect(x - cw * 0.12, top + h * 0.05, cw * 1.24, h * 0.02); c.fillRect(x - cw * 0.12, base - h * 0.02, cw * 1.24, h * 0.02);
      }
      for (let k = 0; k < 5; k++) { c.fillStyle = k % 2 ? '#d8d3c9' : '#c6c1b6'; c.fillRect(L - w * 0.06 - k * w * 0.02, base + k * h * 0.035, Rr - L + w * 0.12 + k * w * 0.04, h * 0.035); }
    };
    ART.screens = (c, w, h, o = {}) => {
      const r = rnd(o.seed ?? 11);
      c.fillStyle = '#08090b'; c.fillRect(0, 0, w, h);
      const cols = o.cols ?? 3, rows = o.rows ?? 2, gap = w * 0.012, sw = (w - gap * (cols + 1)) / cols, sh = (h * 0.86 - gap * (rows + 1)) / rows;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = gap + i * (sw + gap), y = h * 0.04 + gap + j * (sh + gap);
        c.fillStyle = '#121820'; c.fillRect(x, y, sw, sh);
        c.strokeStyle = 'rgba(120,140,160,.15)'; c.lineWidth = 1;
        for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(x, y + (sh * k) / 5); c.lineTo(x + sw, y + (sh * k) / 5); c.stroke(); }
        const n = 26, cw = sw / (n + 2); let v = sh * (0.35 + r() * 0.3); const trend = (r() - 0.62) * sh * 0.03;
        for (let k = 0; k < n; k++) {
          const o2 = v, cdl = o2 + trend + (r() - 0.5) * sh * 0.09; v = cl(cdl, sh * 0.12, sh * 0.88);
          const hi = Math.min(o2, v) - r() * sh * 0.04, lo = Math.max(o2, v) + r() * sh * 0.04, up = v < o2, xx = x + cw * (k + 1);
          c.strokeStyle = c.fillStyle = up ? '#7fd39a' : '#e0646a'; c.beginPath(); c.moveTo(xx + cw * 0.35, y + hi); c.lineTo(xx + cw * 0.35, y + lo); c.stroke();
          c.fillRect(xx, y + Math.min(o2, v), cw * 0.7, Math.max(2, Math.abs(v - o2)));
        }
        c.fillStyle = 'rgba(160,180,200,.35)'; for (let k = 0; k < 4; k++) c.fillRect(x + sw * 0.05, y + sh * 0.06 + k * sh * 0.045, sw * (0.08 + r() * 0.12), sh * 0.02);
        const gl = c.createLinearGradient(x, y, x + sw, y + sh); gl.addColorStop(0, 'rgba(255,255,255,.07)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); c.fillStyle = gl; c.fillRect(x, y, sw, sh);
      }
      const fl = c.createLinearGradient(0, h * 0.85, 0, h); fl.addColorStop(0, '#16181b'); fl.addColorStop(1, '#050506'); c.fillStyle = fl; c.fillRect(0, h * 0.88, w, h * 0.12);
    };

    // ---------- shots and the camera ----------
    const shots = [];
    const BG = { desk: '#1d1d1d', dark: '#0e0e0e', news: C.news, paper: C.white };
    R.shot = (a, b, o = {}) => {
      const root = el('div', `inset:0;overflow:hidden;background:${BG[o.bg] ?? o.bg ?? BG.desk}`, graded);
      if (o.bg === 'desk' || o.bg === undefined) { const d = el('div', `inset:0;background-image:url(${tex('dark')});background-size:${gx(300)}px;opacity:.9`, root); d.dataset.motion = 'skip'; }
      const lens = el('div', 'inset:0', root);
      const world = el('div', `left:0;top:0;width:0;height:0;transform-origin:0 0`, lens);
      const over = el('div', 'inset:0;pointer-events:none;z-index:5', root);
      const S = { R, a, b, root, lens, world, over, keys: [], pulses: [], in: o.in || 'cut', dur: o.dur ?? (o.in === 'brush' ? 0.75 : o.in === 'blur' ? 0.6 : 0.5), drift: o.drift ?? 0.04, seed: shots.length * 31 + 7, sheets: [], end: b };
      shots.push(S);
      if (S.in === 'cut') { if (a > 0.01) F.cut(a); }
      else { F.transition(a, a + S.dur); F.sfx(a, S.in === 'brush' ? 'brush' : 'whoosh', S.in === 'brush' ? 0.6 : 0.35, { dur: S.dur }); if (S.in === 'blur' || S.in === 'brush') F.blur(a, a + S.dur, 4); }
      S.cam = (t, view, ease) => { S.keys.push({ t, view, ease: ease || E.cubicInOut }); S.keys.sort((p, q) => p.t - q.t); return S; };
      S.push = (from, to, ta = a, tb = b, ease = E.sine) => { S.cam(ta, from); S.cam(tb, to, ease); return S; };
      S.defocus = (ta, tb, px = 8) => { S.pulses.push([ta, tb, px]); return S; };
      Object.assign(S, makeSheets(S), makeMarks(S), makeOverlays(S));
      return S;
    };
    const resolveView = (v) => {
      if (!v) return { x: FW / 2, y: 500, h: 1000, r: 0 };
      if (v.sheet && !v.on) v = { on: v };   // a target passed directly
      if (v.on) {
        const bx = v.on.wbox ? v.on.wbox() : v.on.box();
        const pad = v.pad ?? 1.3, h = v.h ?? Math.max(bx.h * pad, (bx.w * pad) / AR);
        return { x: bx.x + bx.w / 2 + (v.dx ?? 0), y: bx.y + bx.h / 2 + (v.dy ?? 0), h, r: v.r ?? (v.level ? -(v.on.sheet || v.on).rot : 0) };
      }
      return { x: v.x ?? FW / 2, y: v.y ?? 500, h: v.h ?? (v.w ? v.w / AR : 1000), r: v.r ?? 0 };
    };
    const camAt = (S, t) => {
      const K = S.rk; let v;
      if (!K.length) v = { x: FW / 2, y: 500, h: 1000, r: 0 };
      else if (t <= K[0].t) v = { ...K[0].v };
      else if (t >= K[K.length - 1].t) v = { ...K[K.length - 1].v };
      else { let i = 0; while (K[i + 1].t < t) i++; const p = K[i], q = K[i + 1], e = (q.ease || E.cubicInOut)(cl((t - p.t) / Math.max(1e-6, q.t - p.t))); v = { x: mix(p.v.x, q.v.x, e), y: mix(p.v.y, q.v.y, e), h: Math.exp(mix(Math.log(p.v.h), Math.log(q.v.h), e)), r: mix(p.v.r, q.v.r, e) }; }
      v.h *= 1 - S.drift * cl((t - S.a) / Math.max(0.1, S.b - S.a));
      return v;
    };
    R.camAt = camAt;

    // ---------- the brush smear (a ragged clip path for the incoming shot + dark bristle streaks on top) ----------
    const brushBands = (seed) => {
      const r = rnd(seed), bands = [];
      for (let i = 0; i < 4; i++) {
        const yc = H * (0.06 + i * 0.29), hh = H * 0.23, K = 64, tips = [], top = [], bot = [];
        const ph = r() * 6, ph2 = r() * 6;
        for (let k = 0; k < K; k++) {
          const q = (k + 0.5) / K, env = Math.pow(Math.sin(Math.PI * q), 0.7);
          tips.push({ y: yc - hh + 2 * hh * q, lag: W * (0.015 + 0.13 * (1 - env) + 0.035 * (0.5 + 0.5 * Math.sin(q * 9 + ph)) + 0.025 * (0.5 + 0.5 * Math.sin(q * 23 + ph2)) + (r() < 0.25 ? r() * 0.05 : r() * 0.012)) });
        }
        for (let s = 0; s <= 24; s++) { top.push((r() - 0.5) * H * 0.04); bot.push((r() - 0.5) * H * 0.04); }
        bands.push({ yc, hh, tips, top, bot, delay: [0, 0.12, 0.05, 0.17][i], slope: -0.1 + r() * 0.06 });
      }
      return bands;
    };
    const brushHead = (bd, q) => -W * 0.25 + (W * 1.6) * E.cubicInOut(cl((q - bd.delay) / (1 - 0.2)));
    const brushPath = (bands, q) => {
      let d = '';
      for (const bd of bands) {
        const X = brushHead(bd, q); if (X <= -W * 0.2) continue;
        const x0 = -W * 0.3, ys = (x) => (x - W / 2) * bd.slope, steps = 24;
        const pts = [];
        for (let s = 0; s <= steps; s++) { const x = mix(x0, X - W * 0.18, s / steps); pts.push([x, bd.yc - bd.hh + bd.top[s] + ys(x)]); }
        for (const tp of bd.tips) pts.push([X - tp.lag, tp.y + ys(X)]);
        for (let s = steps; s >= 0; s--) { const x = mix(x0, X - W * 0.18, s / steps); pts.push([x, bd.yc + bd.hh + bd.bot[s] + ys(x)]); }
        d += 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z';
      }
      return d || 'M0,0Z';
    };
    const brushStreaks = (bands, q, seed) => {
      const r = rnd(seed + 5), sx = fx.width / W, fade = 1 - seg(q, 0.72, 1);
      fxc.lineCap = 'round';
      for (const bd of bands) {
        const X = brushHead(bd, q), ys = (x) => (x - W / 2) * bd.slope, bw = (bd.hh * 2) / bd.tips.length;
        for (const tp of bd.tips) for (let j = 0; j < 2; j++) {
          const y = (tp.y + ys(X) + (r() - 0.5) * bw) * sx, xe = (X - tp.lag + r() * W * 0.004) * sx, len = W * (0.06 + r() * 0.34) * sx, dark = r() < 0.7;
          const a = (dark ? 0.35 + r() * 0.45 : 0.12 + r() * 0.22) * fade;
          const gr = fxc.createLinearGradient(xe - len, 0, xe, 0);
          gr.addColorStop(0, dark ? 'rgba(10,10,10,0)' : 'rgba(240,240,236,0)'); gr.addColorStop(0.7, dark ? `rgba(12,12,12,${(a * 0.6).toFixed(3)})` : `rgba(240,240,236,${(a * 0.6).toFixed(3)})`); gr.addColorStop(1, dark ? `rgba(6,6,6,${a.toFixed(3)})` : `rgba(250,250,248,${a.toFixed(3)})`);
          fxc.strokeStyle = gr; fxc.lineWidth = Math.max(0.6, bw * sx * (0.25 + r() * 0.9)); fxc.beginPath(); fxc.moveTo(xe - len, y + (r() - 0.5) * 2); fxc.lineTo(xe, y); fxc.stroke();
        }
      }
    };

    // ---------- per frame: which shots show, their transitions, cameras, sheets ----------
    F.add((t) => {
      let anyFx = false;
      for (const S of shots) {
        const vis = t >= S.a - 1e-6 && t < S.end;
        set(S.root, { display: vis ? '' : 'none' });
        if (!vis) continue;
        const qi = S.in === 'cut' ? 1 : seg(t, S.a, S.a + S.dur);
        let op = 1, bl = 0;
        if (S.in === 'dissolve') op = E.sine(qi);
        if (S.in === 'blur') { op = E.sine(cl(qi * 1.4)); bl += (1 - E.sine(qi)) * 14; }
        if (S.next && S.next.in === 'blur') bl += seg(t, S.next.a, S.next.a + S.next.dur * 0.7, E.sine) * 14;
        for (const [pa, pb, px] of S.pulses) if (t > pa && t < pb) bl += px * Math.sin(Math.PI * seg(t, pa, pb));
        if (S.in === 'brush' && qi < 1) { set(S.root, { clipPath: `path('${brushPath(S.bands, qi)}')` }); anyFx = true; } else set(S.root, { clipPath: 'none' });
        set(S.root, { opacity: op.toFixed(3) });
        S.root.dataset.lintSkip = t >= S.b ? '1' : '0';   // covered by the next shot's transition: the text checks look at the incoming shot
        set(S.lens, { filter: bl > 0.05 ? `blur(${(bl * g).toFixed(2)}px)` : 'none' });
        const v = camAt(S, t), k = 1000 / v.h;
        set(S.world, { transform: `translate(${W / 2}px,${H / 2}px) rotate(${v.r.toFixed(3)}deg) scale(${k.toFixed(5)}) translate(${(-v.x * g).toFixed(2)}px,${(-v.y * g).toFixed(2)}px)` });
        for (const sh of S.sheets) sh.place(t, v);
      }
      set(fx, { display: anyFx ? '' : 'none' });
      if (anyFx) { fxc.clearRect(0, 0, fx.width, fx.height); for (const S of shots) if (S.in === 'brush' && t >= S.a && t < S.a + S.dur) brushStreaks(S.bands, seg(t, S.a, S.a + S.dur), S.seed); }
    });

    // ---------- sheets ----------
    const wrapText = (root, text, nth = 0) => {
      const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n, seen = 0;
      while ((n = tw.nextNode())) {
        let from = 0, i;
        while ((i = n.data.indexOf(text, from)) >= 0) {
          if (seen++ === nth) { const r2 = document.createRange(); r2.setStart(n, i); r2.setEnd(n, i + text.length); const sp = document.createElement('span'); r2.surroundContents(sp); return sp; }
          from = i + text.length;
        }
      }
      return null;
    };
    function makeSheets(S) {
      const out = {};
      const mk = (o, kind, defW) => {
        const w = o.w ?? defW, h = o.h ?? null;
        const elS = el('div', `left:0;top:0;width:${gx(w)}px;${h ? `height:${gx(h)}px;` : ''}transform-origin:50% 50%;opacity:0;background-color:${kind === 'news' ? C.news : C.white};background-image:url(${tex(kind)});background-size:${gx(260)}px;${o.shadow === false ? '' : `box-shadow:0 ${gx(10)}px ${gx(34)}px rgba(0,0,0,.5), 0 ${gx(1)}px ${gx(4)}px rgba(0,0,0,.35)`}`, S.world);
        const body = node('div', `position:relative;${h ? `height:${gx(h)}px;` : ''}overflow:hidden`, elS);
        const under = el('div', 'inset:0;pointer-events:none;z-index:-1', elS);   // under the print: highlighter bands (the ink stays on top)
        const ann = el('div', 'inset:0;pointer-events:none;z-index:5', elS);
        const sh = { S, el: elS, body, ann, under, w, h, x: o.x ?? (FW - w) / 2, y: o.y ?? 0, rot: o.rot ?? 0, at: o.at ?? S.a, enter: o.enter ?? 'none', z: o.z ?? S.sheets.length + 1, exit: o.exit || null, stack: !!o.stack };
        elS.style.zIndex = sh.z;
        sh.find = (text, nth = 0) => { const sp = wrapText(body, text, nth); if (!sp) throw new Error(M(`dossier：在这张纸上找不到 "${text}"（要和纸上的字一模一样）`, `dossier: "${text}" is not on this sheet (it must match the printed words exactly)`)); return target(sh, sp); };
        sh.box = () => ({ x: 0, y: 0, w: sh.w, h: sh.h });
        sh.wbox = () => ({ x: sh.x, y: sh.y, w: sh.w, h: sh.h });
        sh.sheet = sh;
        if (sh.enter === 'fly') { F.sfx(sh.at, 'whoosh', 0.55, { dur: 0.6, dir: -1 }); F.sfx(sh.at + 0.55, 'paper', 0.5); elS.dataset.motion = 'snap'; F.blur(sh.at, sh.at + 0.45, 8); }
        else if (sh.enter === 'drop' || sh.enter === 'rise') F.sfx(sh.at + 0.25, 'paper', 0.5);
        if (sh.exit) { F.sfx(sh.exit.at, 'whoosh', 0.45, { dur: 0.5 }); elS.dataset.motion = 'snap'; }
        sh.place = (t, v) => {
          const vw = v.h * AR; let dx = 0, dy = 0, dr = 0, ds = 1, op = 1;
          if (t < sh.at - 1e-6) op = 0;
          else if (sh.enter === 'fly') { const q = E.quartOut(seg(t, sh.at, sh.at + 0.7)); dx = (1 - q) * vw * 1.05; dy = (1 - q) * -v.h * 0.12; dr = (1 - q) * 18; }
          else if (sh.enter === 'drop') { const q = E.quartOut(seg(t, sh.at, sh.at + 0.4)); ds = 1 + (1 - q) * 0.1; op = cl(q * 2); }
          else if (sh.enter === 'rise') { const q = E.quartOut(seg(t, sh.at, sh.at + 0.6)); dy = (1 - q) * v.h * 1.1; dr = (1 - q) * -6; }
          else if (sh.enter === 'fade') op = E.sine(seg(t, sh.at, sh.at + 0.5));
          if (sh.exit && t >= sh.exit.at) { const q = E.quartIn(seg(t, sh.exit.at, sh.exit.at + 0.5)), dir = sh.exit.to === 'left' ? -1 : sh.exit.to === 'up' ? 0 : 1; dx += dir * q * vw * 1.1; if (!dir) dy -= q * v.h * 1.1; dr += dir * q * 10; }
          set(elS, { opacity: op.toFixed(3), transform: `translate(${gx(sh.x + dx).toFixed(2)}px,${gx(sh.y + dy).toFixed(2)}px) rotate(${(sh.rot + dr).toFixed(3)}deg) scale(${ds.toFixed(4)})` });
        };
        S.sheets.push(sh); sheets.push(sh);
        return sh;
      };
      const textAt = (e, kind, text, sh, b, o2) => F.text(e, kind, text, Math.max(sh.at, S.a), b ?? S.b, sh.stack ? { ...(o2 || {}), overlap: true } : o2);   // stack: sheets laid on top of each other on purpose
      // articles on newsprint: [{ head, text: '…' | ['para', …] }] flowing down the columns, each printed once and ended with ■ — never repeated
      //   to fill: a column that runs out of copy just ends, like a real page. Every sentence is real copy from brief.md (registered for the fact check).
      const stories = (box, list, sh, size) => {
        for (const st of list || []) {
          if (st.head) textAt(node('div', `font:900 ${gx(size * 1.3)}px/1.3 ${FONT.zh};color:#141414;margin:${gx(size * 0.2)}px 0 ${gx(size * 0.45)}px;break-after:avoid`, box, esc(st.head)), 'label', st.head, sh);
          const paras = Array.isArray(st.text) ? st.text : [st.text];
          paras.forEach((tx, i) => { node('p', `margin:0 0 ${gx(size * 0.55)}px;font:400 ${gx(size)}px/1.62 ${FONT.zh};color:#2a2926;text-align:justify;text-indent:2em`, box, esc(tx) + (i === paras.length - 1 ? '<span style="font-size:.7em"> ■</span>' : '')); F.fact(tx, Math.max(sh.at, S.a), S.b); });
        }
      };

      // the newspaper clipping page
      out.page = (o = {}) => {
        const w = o.w ?? 1900, h = o.h ?? 1180, size = o.bodySize ?? 23;
        const sh = mk({ ...o, w, h, x: o.x ?? (FW - w) / 2, y: o.y ?? -24 }, 'news', w), B = sh.body;
        const strip = el('div', `left:${gx(40)}px;right:${gx(40)}px;top:${gx(16)}px;height:${gx(34)}px;border-bottom:${gx(2)}px solid #3a3936;display:flex;justify-content:space-between;font:600 ${gx(17)}px/${gx(30)}px ${FONT.caps};letter-spacing:.22em;color:#3a3936;white-space:nowrap;overflow:hidden`, B);
        node('span', '', strip, esc([o.masthead ?? masthead, o.section, o.date].filter(Boolean).join('   ·   ')));
        const nt = o.note ?? M('本台整理', 'Compiled by our desk');   // says plainly that this page is our own layout, not a real newspaper
        if (nt) textAt(node('span', `font:700 ${gx(17)}px/${gx(30)}px ${FONT.sans};letter-spacing:.12em`, strip, esc(nt)), 'label', nt, sh, S.b, { noFact: true, chrome: true });
        const hl = el('div', `left:${gx(o.hx ?? 300)}px;width:${gx(w - (o.hx ?? 300) - 60)}px;top:${gx(78)}px;text-align:center;font:900 ${gx(o.size ?? 116)}px/1.2 ${FONT.zh};color:#121212;letter-spacing:.03em;white-space:nowrap`, B);
        const hs = node('span', '', hl, esc(o.headline || ''));
        textAt(hs, 'headline', o.headline, sh, o.headUntil);
        sh.head = target(sh, hs);
        if (o.mark) sh.headMark = S.mark(o.mark === true ? sh.head : target(sh, wrapText(hs, o.mark) || hs), { at: o.markAt ?? sh.at + 0.5, dur: o.markDur ?? 0.6, height: 0.5 });
        // left: English headline, sub, small photo, articles
        const col = (x, y, ww, hh2) => el('div', `left:${gx(x)}px;top:${gx(y)}px;width:${gx(ww)}px;height:${gx(hh2)}px;overflow:hidden`, B);
        const L = col(40, 236, 520, h - 260);
        if (o.en) { const e = node('div', `font:700 ${gx(o.enSize ?? 62)}px/1.02 ${FONT.caps};text-transform:uppercase;color:#8e8d88;letter-spacing:.01em;margin-left:${gx(-30)}px`, L, esc(o.en)); textAt(e, 'label', o.en, sh); }
        if (o.sub) { const e = node('div', `margin-top:${gx(14)}px;font:400 ${gx(25)}px/1.3 ${FONT.en};color:#2f2e2b`, L, esc(o.sub)); textAt(e, 'label', o.sub, sh); }
        if (o.photo2) { const p = node('div', `position:relative;margin-top:${gx(26)}px;width:${gx(500)}px;height:${gx(280)}px;overflow:hidden;background:#333`, L); const pc = picture(o.photo2, gx(500) * 1.5, gx(280) * 1.5, { halftone: true, seed: 2, ht: { paper: '#d4d2ca', bright: 0.12, ...(o.ht || {}) } }); p.appendChild(pc.cv); pc.cv.style.cssText = 'width:100%;height:100%;display:block'; }
        stories(node('div', `margin-top:${gx(24)}px`, L), o.left, sh, size);
        // centre: the main photo
        if (o.photo) { const p = col(590, 232, 520, h - 250); p.style.background = '#2a2a2a'; const pc = picture(o.photo, gx(520) * 1.4, gx(h - 250) * 1.4, { halftone: true, seed: 1, ht: { paper: '#d4d2ca', bright: 0.12, ...(o.ht || {}) }, art: o.art }); p.appendChild(pc.cv); pc.cv.style.cssText = 'width:100%;height:100%;display:block'; sh.photoEl = p; F.info('photo', sh.at, S.b); }
        // right: the lead, a dotted leader, the articles in two columns (with no articles given: the narration, once)
        const RX = o.photo ? 1140 : 590, RW = w - RX - 40, R2 = col(RX, 232, RW, h - 250);
        if (o.lead) { const ld = node('div', `font:600 ${gx(size * 1.2)}px/1.6 ${FONT.zh};color:#1f1e1c;text-align:justify`, R2, esc(o.lead)); textAt(ld, 'label', o.lead, sh); sh.lead = target(sh, ld); node('div', `margin:${gx(14)}px 0 ${gx(16)}px;border-top:${gx(4)}px dotted #2b2a27;width:100%`, R2); }
        const flow = node('div', `column-count:${o.columns ?? 2};column-gap:${gx(28)}px;column-fill:auto;overflow:hidden`, R2);
        { const k = sh.el.getBoundingClientRect().width / gx(w) || 1; flow.style.height = `${Math.max(0, R2.getBoundingClientRect().bottom - flow.getBoundingClientRect().top) / k}px`; }   // fonts are loaded at build: measure now, before the targets are
        stories(flow, o.stories || (F.T ? [{ text: F.T.lines.map((l) => l.text).filter(Boolean).join('') }] : []), sh, size);
        F.info('document', sh.at, S.b);
        return sh;
      };

      // a source document under our masthead
      out.doc = (o = {}) => {
        const w = o.w ?? 1200, kind = o.kind ?? 'release';
        const sh = mk({ ...o, w }, 'white', w), B = sh.body;
        const serif = kind === 'filing' || kind === 'statement', bodyF = serif ? FONT.en : FONT.ensans, pad = o.pad ?? 76;
        if (o.masthead !== false) {
          const bar = node('div', `position:relative;height:${gx(128)}px;background:#0f0f0f;display:flex;align-items:center;justify-content:center;gap:${gx(22)}px;color:#f3f1ea;font:700 ${gx(66)}px/1 ${FONT.caps};letter-spacing:.14em;white-space:nowrap`, B);
          const words = String(o.masthead || masthead).split(' '), cut = Math.max(1, Math.ceil(words.length / 2));
          node('span', '', bar, esc(words.slice(0, cut).join(' ')));
          bar.appendChild(emblem(gx(64), '#f3f1ea'));
          node('span', '', bar, esc(words.slice(cut).join(' ')));
        }
        const inner = node('div', `position:relative;padding:${gx(pad * 0.8)}px ${gx(pad)}px ${gx(pad * 0.9)}px;color:#141414`, B);
        const reg = (e, text, k = 'label') => { textAt(e, k, text, sh); return e; };
        if (kind === 'filing') {
          for (const [s, sz, wt] of [['UNITED STATES', 30, 700], ['SECURITIES AND EXCHANGE COMMISSION', 30, 700], ['Washington, D.C. 20549', 22, 400]]) node('div', `text-align:center;font:${wt} ${gx(sz)}px/1.35 ${FONT.en}`, inner, esc(s));
          node('div', `margin:${gx(18)}px auto;width:30%;border-top:${gx(3)}px solid #141414`, inner);
          if (o.form) reg(node('div', `text-align:center;font:700 ${gx(44)}px/1.3 ${FONT.en}`, inner, esc(o.form)), o.form);
        }
        if (o.issuer) reg(node('div', `font:600 ${gx(21)}px/1.3 ${FONT.ensans};letter-spacing:.16em;text-transform:uppercase;color:#6b6a66;margin-bottom:${gx(16)}px`, inner, esc(o.issuer)), o.issuer);
        if (o.title) sh.titleT = target(sh, reg(node('div', kind === 'statement' ? `text-align:center;font:600 ${gx(o.titleSize ?? 58)}px/1.12 ${FONT.en};font-variant:small-caps;margin:${gx(6)}px 0 ${gx(22)}px` : `font:700 ${gx(o.titleSize ?? 44)}px/1.2 ${bodyF};margin:0 0 ${gx(14)}px`, inner, esc(o.title)), o.title));
        if (o.sub) reg(node('div', `font:400 ${gx(30)}px/1.3 ${bodyF};color:#333;margin-bottom:${gx(16)}px`, inner, esc(o.sub)), o.sub);
        if (o.date) reg(node('div', `font:400 ${gx(22)}px/1.3 ${FONT.ensans};color:#5d5c58;margin-bottom:${gx(26)}px`, inner, esc(o.date)), o.date);
        const blocks = [];
        for (const b of o.blocks || []) {
          let e;
          if (b.h) e = node('div', `font:700 ${gx(30)}px/1.35 ${bodyF};margin:${gx(22)}px 0 ${gx(10)}px`, inner, esc(b.h));
          else if (b.li) e = node('div', `position:relative;padding-left:${gx(34)}px;font:400 ${gx(b.size ?? 29)}px/1.5 ${bodyF};margin-bottom:${gx(8)}px`, inner, `<span style="position:absolute;left:${gx(4)}px">•</span>${esc(b.li)}`);
          else if (b.p) e = node('div', `font:400 ${gx(b.size ?? 29)}px/1.55 ${bodyF};margin-bottom:${gx(18)}px;text-align:${serif ? 'justify' : 'left'}`, inner, esc(b.p));
          else if (b.table) {
            e = node('table', `border-collapse:collapse;width:100%;font:400 ${gx(24)}px/1.35 ${FONT.ensans};margin:${gx(10)}px 0 ${gx(18)}px`, inner);
            const tr0 = node('tr', '', e); for (const hd of b.table.head || []) node('th', `text-align:left;border-bottom:${gx(2)}px solid #141414;padding:${gx(6)}px;font-weight:700`, tr0, esc(hd));
            for (const row of b.table.rows || []) { const tr = node('tr', '', e); for (const cell of row) node('td', `border-bottom:${gx(1)}px solid #bbb;padding:${gx(6)}px`, tr, esc(cell)); }
          } else if (b.gap) e = node('div', `height:${gx(b.gap)}px`, inner);
          if (e) { blocks.push(e); const txt = b.h || b.li || b.p; if (txt) F.fact(txt, Math.max(sh.at, S.a), S.b); }
        }
        if (o.source) { const s = node('div', `margin-top:${gx(20)}px;padding-top:${gx(12)}px;border-top:${gx(1.5)}px solid #b5b4ae;font:400 ${gx(19)}px/1.4 ${FONT.ensans};color:#77766f`, inner, esc(o.source)); textAt(s, 'label', o.source, sh, S.b, { chrome: true }); }
        sh.block = (i) => { if (!blocks[i]) throw new Error(M(`dossier：这份文件没有第 ${i} 段`, `dossier: this document has no block ${i}`)); return target(sh, blocks[i]); };
        F.info('document', sh.at, S.b);
        return sh;
      };

      // a printed photo (white border) or a picture filling the frame
      out.photo = (src, o = {}) => {
        const w = o.w ?? 900, h = o.h ?? 600, bd = o.border ?? 16;
        const sh = mk({ ...o, w, h: h + (o.caption ? 58 : 0) }, 'photo', w);
        const p = el('div', `left:${gx(bd)}px;top:${gx(bd)}px;width:${gx(w - bd * 2)}px;height:${gx(h - bd * 2)}px;overflow:hidden;background:#222`, sh.body);
        const pc = picture(src, gx(w - bd * 2) * (o.res ?? 1.5), gx(h - bd * 2) * (o.res ?? 1.5), { halftone: o.halftone ?? true, tone: o.tone ?? 'bw', seed: o.seed, art: o.art, pos: o.pos });
        p.appendChild(pc.cv); pc.cv.style.cssText = 'width:100%;height:100%;display:block';
        if (o.caption) { const cp = el('div', `left:${gx(bd)}px;right:${gx(bd)}px;top:${gx(h - 4)}px;font:500 ${gx(22)}px/1.3 ${FONT.sans};color:#3a3936`, sh.body, esc(o.caption)); textAt(cp, 'label', o.caption, sh); }
        if (pc.credit && o.tag !== false) S.source(M('图片：', 'Photo: ') + creditLine(pc.credit), { at: sh.at });
        F.info('photo', sh.at, S.b);
        return sh;
      };
      out.backdrop = (src, o = {}) => {
        const w = o.w ?? Math.max(FW, 1000 * AR) * 1.04, h = o.h ?? 1040;
        const sh = mk({ ...o, w, h, x: o.x ?? (FW - w) / 2, y: o.y ?? -20, shadow: false, z: o.z ?? 0 }, 'photo', w);
        const pc = picture(src, gx(w) * (o.res ?? 1.25), gx(h) * (o.res ?? 1.25), { halftone: o.halftone ?? false, tone: o.tone ?? 'muted', seed: o.seed, art: o.art, pos: o.pos, ht: o.ht });
        sh.body.appendChild(pc.cv); pc.cv.style.cssText = `width:${gx(w)}px;height:${gx(h)}px;display:block`;
        if (pc.credit && o.tag !== false) S.source(M('图片：', 'Photo: ') + creditLine(pc.credit), { at: sh.at });
        F.info('photo', sh.at, S.b);
        return sh;
      };

      // a printed chart clipping: the line draws on (or bars grow), the last value is called out
      out.chart = (o = {}) => {
        const w = o.w ?? 1100, h = o.h ?? 700, at = o.at ?? S.a, dur = o.dur ?? 1.4;
        const sh = mk({ ...o, w, h }, o.paper === 'white' ? 'white' : 'news', w), B = sh.body;
        if (o.title) { const e = el('div', `left:${gx(50)}px;top:${gx(34)}px;right:${gx(50)}px;font:900 ${gx(44)}px/1.2 ${FONT.zh};color:#141414`, B, esc(o.title)); textAt(e, 'headline', o.title, sh); }
        if (o.unit) { const e = el('div', `left:${gx(50)}px;top:${gx(96)}px;font:500 ${gx(22)}px/1.2 ${FONT.sans};color:#5a5955`, B, esc(o.unit)); textAt(e, 'label', o.unit, sh); }
        const X0 = 90, X1 = w - 110, Y0 = 150, Y1 = h - (o.source ? 120 : 90);
        const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, width: gx(w), height: gx(h), style: 'position:absolute;left:0;top:0;overflow:visible' }, B);
        const all = (o.series || []).flatMap((s) => s.values), lo = o.min ?? Math.min(...all), hi = o.max ?? Math.max(...all), span = hi - lo || 1;
        const n = Math.max(...(o.series || [{ values: [0] }]).map((s) => s.values.length));
        const X = (i) => X0 + ((X1 - X0) * i) / Math.max(1, n - 1), Y = (v) => Y1 - ((Y1 - Y0) * (v - lo)) / span;
        for (let k = 0; k <= 4; k++) svgEl('line', { x1: X0, x2: X1, y1: Y0 + ((Y1 - Y0) * k) / 4, y2: Y0 + ((Y1 - Y0) * k) / 4, stroke: '#9a9891', 'stroke-width': 1.5, 'stroke-dasharray': '4 6' }, svg);
        svgEl('line', { x1: X0, x2: X1, y1: Y1, y2: Y1, stroke: '#2b2a27', 'stroke-width': 3 }, svg);
        (o.labels || []).forEach((lb, i) => { if (lb === '' || lb == null) return; const tx = svgEl('text', { x: X(i), y: Y1 + 40, 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif', 'font-size': 24, fill: '#3a3936' }, svg); tx.textContent = lb; });
        const marks = [];
        (o.series || []).forEach((s, si) => {
          const col = s.color ?? (si ? '#6d6c66' : '#141414');
          if ((o.kind ?? 'line') === 'bars') {
            const bw = ((X1 - X0) / n) * 0.55;
            s.values.forEach((v, i) => { const r2 = svgEl('rect', { x: X(i) - bw / 2, width: bw, y: Y1, height: 0, fill: s.colors ? s.colors[i] : col }, svg); marks.push({ e: r2, kind: 'bar', v, i, y: Y(v), at: at + (i / n) * dur * 0.8 }); });
          } else {
            const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
            const p = svgEl('path', { d, fill: 'none', stroke: col, 'stroke-width': s.width ?? 6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
            marks.push({ e: p, kind: 'line', at });
            const li = s.values.length - 1, dot = svgEl('circle', { cx: X(li), cy: Y(s.values[li]), r: 0, fill: col }, svg); marks.push({ e: dot, kind: 'dot', at: at + dur });
          }
        });
        for (const ann of o.points || []) {   // { i, text, series }: a value printed beside a point
          const s = o.series[ann.series ?? 0], v = s.values[ann.i], tx = svgEl('text', { x: X(ann.i) + (ann.dx ?? 0), y: Y(v) + (ann.dy ?? -22), 'text-anchor': ann.anchor ?? 'middle', 'font-family': '"Noto Sans SC", sans-serif', 'font-weight': 900, 'font-size': ann.size ?? 30, fill: ann.color ?? '#141414', opacity: 0 }, svg);
          tx.textContent = ann.text; marks.push({ e: tx, kind: 'text', at: ann.at ?? at + dur }); F.text(tx, 'label', ann.text, ann.at ?? at + dur, S.b);
        }
        if (o.note) { const e = el('div', `right:${gx(60)}px;top:${gx(40)}px;font:900 ${gx(40)}px/1.2 ${FONT.sans};color:#fff;background:${o.note.color ?? C.red};padding:${gx(6)}px ${gx(16)}px;opacity:0`, B, esc(o.note.text)); F.text(e, 'label', o.note.text, o.note.at ?? at + dur, S.b); marks.push({ e, kind: 'html', at: o.note.at ?? at + dur }); }
        if (o.source) { const e = el('div', `left:${gx(50)}px;bottom:${gx(26)}px;right:${gx(50)}px;font:400 ${gx(19)}px/1.3 ${FONT.ensans};color:#6a6964`, B, esc(o.source)); textAt(e, 'label', o.source, sh, S.b, { chrome: true }); }
        F.prep(() => { for (const m of marks) if (m.kind === 'line') { const L2 = m.e.getTotalLength(); m.len = L2; m.e.setAttribute('stroke-dasharray', L2); m.e.setAttribute('stroke-dashoffset', L2); } });
        F.sfx(at, 'marker', 0.5, { dur });
        F.add((t) => {
          for (const m of marks) {
            if (m.kind === 'line') m.e.setAttribute('stroke-dashoffset', ((m.len ?? 0) * (1 - seg(t, m.at, m.at + dur, E.cubicInOut))).toFixed(1));
            else if (m.kind === 'bar') { const q = E.quartOut(seg(t, m.at, m.at + 0.5)); m.e.setAttribute('y', mix(Y1, m.y, q).toFixed(1)); m.e.setAttribute('height', ((Y1 - m.y) * q).toFixed(1)); }
            else if (m.kind === 'dot') m.e.setAttribute('r', (12 * E.backOut(seg(t, m.at, m.at + 0.3))).toFixed(2));
            else if (m.kind === 'text') m.e.setAttribute('opacity', seg(t, m.at, m.at + 0.25).toFixed(3));
            else set(m.e, { opacity: seg(t, m.at, m.at + 0.2).toFixed(3) });
          }
        });
        F.info('chart', at, S.b);
        return sh;
      };

      // a printed table: rows inked in one by one; mark: 'up' | 'down' | true paints a highlighter behind the row
      out.table = (o = {}) => {
        const w = o.w ?? 1200, at = o.at ?? S.a;
        const sh = mk({ ...o, w }, o.paper === 'news' ? 'news' : 'white', w), B = sh.body;
        const inner = node('div', `position:relative;padding:${gx(44)}px ${gx(56)}px ${gx(40)}px;color:#141414`, B);
        if (o.title) textAt(node('div', `font:900 ${gx(44)}px/1.25 ${FONT.zh};margin-bottom:${gx(18)}px`, inner, esc(o.title)), 'headline', o.title, sh);
        const tb = node('table', `border-collapse:collapse;width:100%;font:500 ${gx(o.size ?? 30)}px/1.4 ${FONT.sans}`, inner);
        const tr0 = node('tr', '', tb); (o.cols || []).forEach((c2, j) => textAt(node('th', `text-align:${j ? 'right' : 'left'};border-bottom:${gx(3)}px solid #141414;padding:${gx(8)}px ${gx(10)}px;font:700 ${gx(22)}px/1.3 ${FONT.ensans};letter-spacing:.06em;color:#4a4945;text-transform:uppercase`, tr0, esc(c2)), 'label', c2, sh));
        const rows = (o.rows || []).map((row, i) => {
          const tr = node('tr', 'opacity:0', tb), ra = row.at ?? at + 0.3 + i * 0.4;
          row.cells.forEach((cell, j) => { const td = node('td', `text-align:${j ? 'right' : 'left'};border-bottom:${gx(1.5)}px solid #bdbbb4;padding:${gx(10)}px;font-weight:${j ? 700 : 500};${j && row.mark === 'down' ? `color:${C.red}` : j && row.mark === 'up' ? 'color:#1d7a3a' : ''}`, tr, esc(cell)); F.text(td, 'label', String(cell), ra, S.b); });
          F.sfx(ra, 'tick', 0.4);
          return { tr, ra, row, i };
        });
        if (o.source) textAt(node('div', `margin-top:${gx(16)}px;font:400 ${gx(19)}px/1.3 ${FONT.ensans};color:#6a6964`, inner, esc(o.source)), 'label', o.source, sh, S.b, { chrome: true });
        F.add((t) => { for (const r2 of rows) set(r2.tr, { opacity: seg(t, r2.ra, r2.ra + 0.25).toFixed(3) }); });
        sh.row = (i) => target(sh, rows[i].tr);
        F.info('chart', at, S.b);
        return sh;
      };
      return out;
    }

    // ---------- targets on paper: measured once (after build), in sheet units ----------
    const targets = [], sheets = [];
    const target = (sh, e) => { const tg = { sheet: sh, el: e, rects: null }; tg.box = () => tg.bb; tg.wbox = () => toWorld(sh, tg.bb); targets.push(tg); return tg; };
    const toWorld = (sh, b) => {
      const cx = b.x + b.w / 2 - sh.w / 2, cy = b.y + b.h / 2 - sh.h / 2, a = (sh.rot * Math.PI) / 180;
      const wx = sh.x + sh.w / 2 + cx * Math.cos(a) - cy * Math.sin(a), wy = sh.y + sh.h / 2 + cx * Math.sin(a) + cy * Math.cos(a);
      return { x: wx - b.w / 2, y: wy - b.h / 2, w: b.w, h: b.h };
    };
    const placers = [];   // annotations position themselves once targets are measured
    F.prep(async () => {
      await Promise.all(texWait);
      for (const sh of sheets) { const r0 = sh.el.getBoundingClientRect(), k = r0.width / (gx(sh.w) || 1); sh.k = k; if (!sh.h) sh.h = r0.height / k / g; sh.r0 = r0; }
      for (const tg of targets) {
        const sh = tg.sheet, r0 = sh.r0, k = sh.k, rects = [];
        const rg = document.createRange(); rg.selectNodeContents(tg.el); const list = [...rg.getClientRects()].length ? rg.getClientRects() : tg.el.getClientRects();
        for (const r of list) { if (r.width < 1) continue; const q = { x: (r.left - r0.left) / k / g, y: (r.top - r0.top) / k / g, w: r.width / k / g, h: r.height / k / g }; const last = rects[rects.length - 1]; if (last && Math.abs(last.y - q.y) < 2) { const x1 = Math.max(last.x + last.w, q.x + q.w); last.x = Math.min(last.x, q.x); last.w = x1 - last.x; last.h = Math.max(last.h, q.h); } else rects.push(q); }
        if (!rects.length) rects.push({ x: 0, y: 0, w: sh.w, h: 10 });
        tg.rects = rects;
        const x0 = Math.min(...rects.map((r) => r.x)), y0 = Math.min(...rects.map((r) => r.y)), x1 = Math.max(...rects.map((r) => r.x + r.w)), y1 = Math.max(...rects.map((r) => r.y + r.h));
        tg.bb = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      }
      for (const f of placers) f();
      for (const S of shots) S.rk = S.keys.map((k2) => ({ t: k2.t, v: resolveView(k2.view), ease: k2.ease }));
      const seq = [...shots].sort((p, q) => p.a - q.a);
      seq.forEach((S, i) => { S.root.style.zIndex = i + 1; const nx = seq[i + 1]; S.next = nx && nx.in !== 'cut' && nx.a <= S.b + 0.05 ? nx : null; S.end = S.next ? Math.max(S.b, S.next.a + S.next.dur) : S.b; if (S.in === 'brush') S.bands = brushBands(S.seed); });
    });

    // ---------- marks on paper ----------
    function makeMarks(S) {
      const out = {};
      const reveal = (e, a, dur) => F.add((t) => { const q = seg(t, a, a + dur, E.cubicInOut); set(e, { clipPath: `inset(-10% ${((1 - q) * 100).toFixed(2)}% -10% -10%)`, opacity: t >= a ? 1 : 0 }); });
      // until: the annotation lifts off again (so the next one has room); it fades over 0.25 s
      const fadeOut = (e, u) => { if (u != null) F.add((t) => set(e, { filter: t >= u ? `opacity(${Math.max(0, 1 - (t - u) / 0.25).toFixed(3)})` : 'none', visibility: t >= u + 0.25 ? 'hidden' : 'visible' })); };   // filter, not opacity: the entrance owns opacity
      out.mark = (tg, o = {}) => {
        const at = o.at ?? S.a, dur = o.dur ?? 0.55, bands = [];
        placers.push(() => {
          const tot = tg.rects.reduce((s, r) => s + r.w, 0); let acc = 0;
          for (const r of tg.rects) {
            const hh = r.h * (o.height ?? 0.62), e = el('div', `left:${gx(r.x - 6)}px;top:${gx(r.y + r.h - hh - r.h * 0.06)}px;width:${gx(r.w + 12)}px;height:${gx(hh)}px;background:${o.color ?? C.mark};mix-blend-mode:multiply;border-radius:${gx(4)}px ${gx(10)}px ${gx(6)}px ${gx(12)}px;transform:rotate(-.4deg);opacity:0`, tg.sheet.under);
            const a2 = at + (acc / tot) * dur; acc += r.w; reveal(e, a2, (r.w / tot) * dur); fadeOut(e, o.until); bands.push(e);
          }
        });
        F.sfx(at, 'marker', 0.4, { dur }); F.info('annotate', at, S.b);
        return tg;
      };
      out.translate = (tg, zh, o = {}) => {
        const at = o.at ?? S.a, mode = o.mode ?? 'over', bg = o.color === 'red' ? C.red : o.color === 'blue' || !o.color ? C.blue : o.color;
        const e = el('div', `opacity:0;background:${bg};color:#fff;font:700 ${gx(o.size ?? 30)}px/1.42 ${FONT.zh};padding:${gx(6)}px ${gx(14)}px;box-shadow:0 ${gx(8)}px ${gx(22)}px rgba(0,0,0,.38);z-index:3;text-align:justify`, tg.sheet.ann, esc(zh));
        placers.push(() => {
          const b = tg.bb, s = o.size ?? 30;
          if (mode === 'over') set(e, { left: `${gx(b.x - 10)}px`, top: `${gx(b.y - 6)}px`, width: `${gx(o.w ?? b.w + 20)}px`, minHeight: `${gx(b.h + 12)}px`, display: 'flex', alignItems: 'center' });
          else if (mode === 'above') { set(e, { left: `${gx(b.x - 4)}px`, maxWidth: `${gx(o.w ?? b.w + 8)}px` }); set(e, { top: `${gx(b.y - 8) - e.getBoundingClientRect().height / tg.sheet.k}px` }); }
          else if (mode === 'below') set(e, { left: `${gx(b.x - 4)}px`, top: `${gx(b.y + b.h + 6)}px`, maxWidth: `${gx(o.w ?? b.w + 8)}px` });
          else set(e, { left: `${gx(b.x + b.w + 16)}px`, top: `${gx(b.y + b.h / 2 - s * 0.75)}px`, whiteSpace: 'nowrap' });
        });
        reveal(e, at, 0.4); fadeOut(e, o.until);
        F.text(e, 'label', zh, at, o.until ?? S.b, { overlap: true });
        F.sfx(at, 'swipe', 0.5, { dur: 0.4 }); F.info('annotate', at, S.b);
        return e;
      };
      out.tag = (tg, text, o = {}) => {
        const at = o.at ?? S.a, side = o.side ?? 'left';
        const e = el('div', `opacity:0;background:${o.color ?? C.tag};color:#fff;font:700 ${gx(o.size ?? 24)}px/1.3 ${FONT.sans};padding:${gx(4)}px ${gx(12)}px;white-space:nowrap;z-index:4;box-shadow:0 ${gx(3)}px ${gx(8)}px rgba(0,0,0,.35)`, tg.sheet.ann, esc(text));
        placers.push(() => {
          const r = tg.rects[0], b = tg.bb, ew = e.getBoundingClientRect().width / tg.sheet.k / g, eh = e.getBoundingClientRect().height / tg.sheet.k / g;
          const pos = side === 'left' ? [r.x - ew - 10, r.y + r.h / 2 - eh / 2] : side === 'right' ? [b.x + b.w + 10, r.y + r.h / 2 - eh / 2] : side === 'above' ? [b.x, b.y - eh - 6] : [b.x, b.y + b.h + 6];
          set(e, { left: `${gx(pos[0])}px`, top: `${gx(pos[1])}px` });
        });
        F.add((t) => { const q = seg(t, at, at + 0.22, E.backOut); set(e, { opacity: t >= at ? 1 : 0, transform: `scale(${(0.6 + 0.4 * q).toFixed(3)})` }); });
        fadeOut(e, o.until);
        F.text(e, 'label', text, at, o.until ?? S.b, { overlap: true });
        F.sfx(at, 'pin', 0.42); F.info('annotate', at, S.b);
        return e;
      };
      const drawn = (tg, o, make) => {
        const at = o.at ?? S.a, dur = o.dur ?? 0.45;
        const svg = svgEl('svg', { style: 'position:absolute;left:0;top:0;overflow:visible;z-index:4' }, tg.sheet.ann), p = svgEl('path', { fill: 'none', stroke: o.color ?? C.red, 'stroke-width': o.width ?? 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
        placers.push(() => { const b = tg.bb; svg.setAttribute('width', gx(tg.sheet.w)); svg.setAttribute('height', gx(tg.sheet.h)); svg.setAttribute('viewBox', `0 0 ${tg.sheet.w} ${tg.sheet.h}`); p.setAttribute('d', make(b, tg.rects)); const L2 = p.getTotalLength(); p.setAttribute('stroke-dasharray', L2); p._L = L2; });
        F.add((t) => p.setAttribute('stroke-dashoffset', ((p._L ?? 0) * (1 - seg(t, at, at + dur, E.cubicInOut))).toFixed(1)));
        F.sfx(at, 'marker', 0.4, { dur }); F.info('annotate', at, S.b);
        return p;
      };
      out.circle = (tg, o = {}) => drawn(tg, o, (b) => { const cx = b.x + b.w / 2, cy = b.y + b.h / 2, rx = b.w / 2 + 22, ry = b.h / 2 + 16; let d = ''; for (let k = 0; k <= 40; k++) { const a = -2.2 + (k / 40) * Math.PI * 2.15, wob = 1 + 0.04 * Math.sin(k * 1.7); d += `${k ? 'L' : 'M'}${(cx + Math.cos(a) * rx * wob).toFixed(1)},${(cy + Math.sin(a) * ry * wob).toFixed(1)}`; } return d; });
      out.underline = (tg, o = {}) => drawn(tg, o, (b, rs) => rs.map((r) => `M${r.x},${r.y + r.h + 4} Q${r.x + r.w / 2},${r.y + r.h + 9} ${r.x + r.w},${r.y + r.h + 3}`).join(' '));
      out.strike = (tg, o = {}) => drawn(tg, o, (b, rs) => rs.map((r) => `M${r.x - 4},${r.y + r.h * 0.55} L${r.x + r.w + 4},${r.y + r.h * 0.5}`).join(' '));
      return out;
    }

    // ---------- overlays in frame units (they ride with the shot, not the camera) ----------
    const outline = (px, col = '#111') => { const s = []; for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; s.push(`${(Math.cos(a) * px).toFixed(1)}px ${(Math.sin(a) * px).toFixed(1)}px 0 ${col}`); } s.push(`0 ${px * 1.4}px ${px * 3}px rgba(0,0,0,.55)`); return s.join(','); };
    R.outline = outline;
    const ICONS = {
      chip: '<rect x="22" y="22" width="56" height="56" rx="6"/><rect x="36" y="36" width="28" height="28"/><path d="M34 22v-12M50 22v-12M66 22v-12M34 78v12M50 78v12M66 78v12M22 34h-12M22 50h-12M22 66h-12M78 34h12M78 50h12M78 66h12"/>',
      up: '<path d="M10 78l28-28 16 16 34-40"/><path d="M66 26h22v22"/>',
      down: '<path d="M10 22l28 28 16-16 34 40"/><path d="M66 74h22v-22"/>',
      bank: '<path d="M10 36l40-22 40 22z"/><path d="M18 40v36M34 40v36M50 40v36M66 40v36M82 40v36M10 84h80"/>',
      dollar: '<circle cx="50" cy="50" r="40"/><path d="M62 34c-4-5-24-7-24 6s24 8 24 20-20 12-26 5M50 22v56"/>',
      oil: '<path d="M50 10c14 22 28 36 28 52a28 28 0 0 1-56 0c0-16 14-30 28-52z"/>',
      server: '<rect x="16" y="12" width="68" height="22" rx="3"/><rect x="16" y="40" width="68" height="22" rx="3"/><rect x="16" y="68" width="68" height="22" rx="3"/><path d="M26 23h6M26 51h6M26 79h6"/>',
      calendar: '<rect x="12" y="20" width="76" height="68" rx="6"/><path d="M12 40h76M30 10v18M70 10v18"/>',
      cloud: '<path d="M28 76h46a18 18 0 0 0 0-36 26 26 0 0 0-50 6 15 15 0 0 0 4 30z"/>',
      chart: '<path d="M12 88h78M20 88V60M40 88V40M60 88V52M80 88V22"/>',
    };
    R.icons = ICONS;
    const icon = (name, size, parent, css = '') => { const s = svgEl('svg', { viewBox: '0 0 100 100', width: size, height: size, style: `position:absolute;overflow:visible;${css}` }, parent); s.innerHTML = `<g fill="none" stroke="#111" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</g><g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</g>`; return s; };
    const parseNum = (s) => { const m = String(s).match(/^(.*?)(-?[\d,]*\.?\d+)(.*)$/); if (!m) return null; const raw = m[2].replace(/,/g, ''); return { pre: m[1], num: parseFloat(raw), dec: (raw.split('.')[1] || '').length, comma: m[2].includes(','), suf: m[3] }; };
    const fmt = (p, v) => { let s = v.toFixed(p.dec); if (p.comma) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return p.pre + s + p.suf; };
    function makeOverlays(S) {
      const out = {};
      const big = (size) => `font:900 ${gx(size)}px/1.1 ${FONT.sans};color:#fff;text-shadow:${outline(gx(size * 0.055))};white-space:nowrap`;
      out.callout = (o = {}) => {
        const at = o.at ?? S.a, size = o.size ?? 120, dur = o.dur ?? 1.0, x = o.x ?? FW / 2, y = o.y ?? 420, anchor = o.anchor ?? 'c';
        const box = el('div', `left:0;top:${gx(y)}px;width:${W}px;opacity:0;text-align:${anchor === 'l' ? 'left' : anchor === 'r' ? 'right' : 'center'}`, S.over);
        const row = node('div', `position:relative;display:inline-flex;align-items:center;gap:${gx(size * 0.25)}px;${anchor === 'l' ? `margin-left:${gx(x)}px` : anchor === 'r' ? `margin-right:${gx(FW - x)}px` : `margin-left:${gx((x - FW / 2) * 2)}px`}`, box);
        if (o.icon) { const ic = node('div', `position:relative;width:${gx(size * 0.95)}px;height:${gx(size * 0.95)}px`, row); icon(o.icon, gx(size * 0.95), ic, 'left:0;top:0'); }
        const pf = o.from != null ? parseNum(o.from) : null, pt = parseNum(o.to ?? o.value ?? ''), roll = pf && pt && pf.pre === pt.pre && pf.suf === pt.suf;
        let fromEl = null, arrow = null;
        if (pf && !roll) { fromEl = node('span', `position:relative;${big(size * 0.72)};opacity:.85`, row, esc(o.from)); arrow = node('span', `position:relative;${big(size * 0.6)}`, row, '→'); }
        const num = node('span', `position:relative;${big(size)}`, row, esc(roll ? o.from : o.to ?? o.value));
        if (o.label) { const lb = el('div', `left:0;width:${W}px;top:${gx(y + size * 1.32)}px;opacity:0;text-align:${anchor === 'l' ? 'left' : anchor === 'r' ? 'right' : 'center'}`, S.over); const sp = node('span', `position:relative;display:inline-block;${big(size * 0.36)};${anchor === 'l' ? `margin-left:${gx(x)}px` : anchor === 'r' ? `margin-right:${gx(FW - x)}px` : `margin-left:${gx((x - FW / 2) * 2)}px`}`, lb, esc(o.label)); F.text(sp, 'label', o.label, at + 0.2, o.b ?? S.b); F.add((t) => set(lb, { opacity: (seg(t, at + 0.2, at + 0.45) * (o.b != null ? 1 - seg(t, o.b - 0.25, o.b) : 1)).toFixed(3) })); }
        const tTo = roll ? at + 0.25 + dur : at;
        F.add((t) => {
          const q = E.backOut(seg(t, at, at + 0.3)); set(box, { opacity: (seg(t, at, at + 0.12) * (o.b != null ? 1 - seg(t, o.b - 0.25, o.b) : 1)).toFixed(3), transform: `scale(${(0.8 + 0.2 * q).toFixed(4)})`, transformOrigin: `${gx(x)}px ${gx(size / 2)}px` });
          if (roll) { const tq = frameT(t), v = mix(pf.num, pt.num, E.cubicInOut(seg(tq, at + 0.25, at + 0.25 + dur))); const s = fmt(pt, v); if (num.textContent !== s) num.textContent = s; }
          if (arrow) { const a2 = at + 0.35; set(arrow, { opacity: seg(t, a2, a2 + 0.15).toFixed(3) }); set(num, { opacity: seg(t, a2 + 0.25, a2 + 0.45).toFixed(3) }); }
        });
        if (fromEl) F.text(fromEl, 'label', o.from, at, o.b ?? S.b);
        F.text(num, 'label', String(o.to ?? o.value), at, o.b ?? S.b);
        if (roll) F.sfx(at + 0.25, 'roll', 0.42, { dur }); F.sfx(at, 'pin', 0.5);
        F.info(pf ? 'compare' : 'mark', at, o.b ?? S.b);
        return box;
      };
      out.bullets = (items, o = {}) => {
        const ats = Array.isArray(o.at) ? o.at : items.map((_, i) => (o.at ?? S.a) + i * (o.gap ?? 0.6)), size = o.size ?? 64, x = o.x ?? 120, y = o.y ?? 300;
        items.forEach((it, i) => {
          const e = el('div', `left:${gx(x)}px;top:${gx(y + i * size * 1.45)}px;${big(size)};opacity:0`, S.over, `<span style="display:inline-block;width:${gx(size * 0.42)}px;height:${gx(size * 0.42)}px;background:#fff;box-shadow:${outline(gx(size * 0.05))};margin-right:${gx(size * 0.35)}px;vertical-align:${gx(size * 0.1)}px"></span>${esc(it)}`);
          F.text(e, 'label', it, ats[i], S.b);
          F.add((t) => { const q = E.quartOut(seg(t, ats[i], ats[i] + 0.3)); set(e, { opacity: q.toFixed(3), transform: `translateX(${((1 - q) * gx(-40)).toFixed(1)}px)` }); });
          F.sfx(ats[i], 'pin', 0.42);
        });
        F.info('annotate', ats[0], S.b);
      };
      out.box = (text, o = {}) => {
        const at = o.at ?? S.a, size = o.size ?? 72, x = o.x ?? FW / 2, y = o.y ?? 420;
        const e = el('div', `left:${gx(x)}px;top:${gx(y)}px;transform:translateX(-50%);${big(size)};padding:${gx(size * 0.22)}px ${gx(size * 0.45)}px;opacity:0`, S.over, esc(text));
        const fr = el('div', `inset:0;border:${gx(size * 0.07)}px solid #fff;box-shadow:${`0 0 0 ${gx(2)}px #111, inset 0 0 0 ${gx(2)}px #111`}`, e);
        F.text(e, 'label', text, at, o.until ?? S.b);
        F.add((t) => { const q = seg(t, at, at + 0.4, E.cubicInOut); set(e, { opacity: (seg(t, at, at + 0.15) * (o.until != null ? 1 - seg(t, o.until, o.until + 0.25) : 1)).toFixed(3) }); set(fr, { clipPath: `inset(0 ${((1 - q) * 100).toFixed(1)}% 0 0)` }); });
        F.sfx(at, 'pin', 0.5); F.info('mark', at, S.b);
        return e;
      };
      out.source = (text, o = {}) => {
        const at = o.at ?? S.a;
        const e = el('div', `left:${gx(24)}px;top:${gx(PT ? 150 : 70)}px;font:500 ${gx(19)}px/1.3 ${FONT.sans};color:#f2f2f2;background:rgba(0,0,0,.55);padding:${gx(4)}px ${gx(10)}px;white-space:nowrap;opacity:0`, S.over, esc(text));
        F.text(e, 'label', text, at, S.b, { noFact: true, chrome: true, overlap: true });
        F.add((t) => set(e, { opacity: t >= at ? 1 : 0 }));
        return e;
      };
      return out;
    }

    // ---------- the channel mark (an inked emblem: a lead type sort with a nib cut) ----------
    function emblem(size, color) {
      const s = svgEl('svg', { viewBox: '0 0 100 100', width: size, height: size, style: 'display:inline-block;vertical-align:middle' });
      s.innerHTML = `<g fill="${color}"><path d="M50 4 L84 30 L66 92 L34 92 L16 30 Z" opacity=".92"/></g><g fill="#0f0f0f"><path d="M50 22 L50 62" stroke="#0f0f0f" stroke-width="5"/><circle cx="50" cy="66" r="7"/><path d="M34 92 L50 70 L66 92 Z"/></g>`;
      return s;
    }
    R.emblem = emblem;
    if (opt.logo !== false) {
      const lg = el('div', `right:${gx(PT ? 34 : BAND ? 18 : 40)}px;${PT ? `top:${H * 0.74}px` : BAND ? `top:${BY + H * BK - gx(78)}px;transform:scale(.62);transform-origin:100% 0` : `bottom:${gx(30)}px`};display:flex;flex-direction:column;align-items:center;opacity:.92;filter:drop-shadow(0 ${gx(3)}px ${gx(6)}px rgba(0,0,0,.6))`, hud);
      lg.appendChild(emblem(gx(78), '#ecebe6'));
      const wm = node('div', `margin-top:${gx(4)}px;font:900 ${gx(20)}px/1 ${FONT.sans};letter-spacing:.3em;color:#ecebe6;padding-left:.3em`, lg, esc(brand.name));
      F.text(wm, 'label', brand.name, 0, F.duration, { noFact: true, chrome: true, overlap: true });
      lg.dataset.motion = 'skip';
      R.logoEl = lg;
    }

    // ---------- the chapter bar (all chapters in a row, the current one in a white pill) ----------
    R.chapterBar = (list) => {
      const C2 = list || (F.T && F.T.chapters) || []; if (C2.length < 2) return;
      const top = BAND ? RH * 0.085 : PT ? H * 0.075 : 0, bh = gx(PT || BAND ? 56 : 50), n = C2.length, logoW = gx(PT ? 0 : 44), cw = (RW - logoW) / n;
      const bar = el('div', `left:0;top:${top}px;width:${RW}px;height:${bh}px;background:linear-gradient(#5d5d5d,#3a3a3a);opacity:.94;border-bottom:${gx(1.5)}px solid rgba(255,255,255,.18);box-shadow:0 ${gx(3)}px ${gx(10)}px rgba(0,0,0,.45)`, hud);
      bar.dataset.motion = 'skip';
      if (!PT) { const lg = el('div', `left:${gx(8)}px;top:${(bh - gx(32)) / 2}px;width:${gx(32)}px;height:${gx(32)}px;border-radius:50%;background:#ecebe6;display:flex;align-items:center;justify-content:center`, bar); lg.appendChild(emblem(gx(24), '#1a1a1a')); }
      const pill = el('div', `top:${gx(6)}px;height:${bh - gx(12)}px;width:${cw - gx(10)}px;border-radius:${gx(10)}px;background:#f4f4f2;box-shadow:0 ${gx(1)}px ${gx(4)}px rgba(0,0,0,.4)`, bar);
      const cells = C2.map((c, i) => {
        if (i) el('div', `left:${logoW + i * cw}px;top:${gx(10)}px;width:1px;height:${bh - gx(20)}px;background:rgba(255,255,255,.2)`, bar);
        const lines = String(c.title).split(/\n|\|/);
        const e = el('div', `left:${logoW + i * cw}px;top:0;width:${cw}px;height:${bh}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#f2f2f2;font:600 ${gx(lines.length > 1 ? 15 : 18)}px/1.22 ${FONT.sans};z-index:2`, bar, lines.map(esc).join('<br>'));
        return { e, c };
      });
      let lastI = -1;
      F.add((t) => {
        let i = C2.findIndex((c) => t >= c.start && t < c.end); if (i < 0) i = t < C2[0].start ? 0 : n - 1;
        const cur = C2[i], q = E.cubicInOut(seg(t, cur.start, cur.start + 0.35)), from = i > 0 ? i - 1 : 0, pos = mix(from, i, i > 0 ? q : 1);
        set(pill, { left: `${(logoW + pos * cw + gx(5)).toFixed(1)}px` });
        if (i !== lastI) { cells.forEach((x, j) => set(x.e, { color: j === i ? '#111' : '#f2f2f2', fontWeight: j === i ? '800' : '600' })); lastI = i; }
      });
      R.barH = bh + top;
    };
    if (opt.chapters !== false) R.chapterBar(Array.isArray(opt.chapters) ? opt.chapters : null);
    // portrait band: the programme's title sits above the picture for the whole film (opt.title, else the page <title> before " · "; false = none)
    if (BAND && opt.title !== false) {
      const tt = opt.title ?? (document.title.split('·')[0] || '').trim(), t0 = (R.barH ?? RH * 0.085) + gx(40);
      if (tt) {
        const head = el('div', `left:0;width:${RW}px;top:${t0}px;height:${BY - t0 - gx(30)}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none`, hud);
        node('div', `font:700 ${gx(26)}px/1.3 ${FONT.sans};letter-spacing:.3em;color:#b9b8b2;margin-bottom:${gx(14)}px`, head, esc(`${brand.name} · ${brand.en}`));
        const te = node('div', `max-width:${RW * 0.9}px;font:900 ${gx(104)}px/1.15 ${FONT.sans};color:#fff;text-shadow:${outline(gx(6))}`, head, esc(tt));
        F.text(te, 'label', tt, 0, F.duration, { overlap: true });
        head.dataset.motion = 'skip';
      }
    }

    // ---------- captions: bold white, dark outline, no box ----------
    if (F.T && F.voiced && !F.caps && opt.captions !== false) {
      const co = opt.captions || {}, segs = window.EV.captionSegments(F.T, co.max ?? (PT || BAND ? 14 : 20)), size = gx(co.size ?? (PT ? 50 : BAND ? 52 : 46));
      const box = el('div', `left:0;right:0;top:${co.top ?? (BAND ? BY + H * BK + gx(40) : PT ? H * 0.66 : H * 0.872)}px;text-align:center;z-index:880;pointer-events:none;display:none`, F.stage);
      const sp = node('span', `position:relative;display:inline-block;max-width:${RW * (BAND ? 0.9 : 0.84)}px;color:#fff;font:900 ${size}px/1.25 ${FONT.sans};letter-spacing:.02em;text-shadow:${outline(size * 0.07)}`, box);
      F.add((t) => { const c = segs.find((x) => t >= x.start && t < x.end); set(box, { display: c ? '' : 'none' }); if (c && sp.textContent !== c.text) sp.textContent = c.text; });
      for (const c of segs) { F.appear(c.start); F.appear(c.end); }
      F.caps = segs;
    }

    // ---------- the inset: the picture held in a dark crumpled frame ----------
    const insets = [];
    let backPainted = false;
    R.inset = (a, b, o = {}) => {
      insets.push([a, b, o.scale ?? 0.92]); F.transition(a, a + 0.5); F.transition(b - 0.5, b);
      if (!backPainted) {
        backPainted = true;
        const cv = el('canvas', `inset:0;width:${W}px;height:${H}px`, back); cv.width = Math.round(W / 2); cv.height = Math.round(H / 2); cv.dataset.motion = 'skip';
        const c = cv.getContext('2d'), r = rnd(77); c.fillStyle = '#181818'; c.fillRect(0, 0, cv.width, cv.height);
        c.filter = 'blur(10px)';
        for (let k = 0; k < 160; k++) { c.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.04 + r() * 0.08})` : `rgba(0,0,0,${0.2 + r() * 0.3})`; c.beginPath(); const x = r() * cv.width, y = r() * cv.height, s = 40 + r() * 160; c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * s, y + (r() - 0.5) * s); c.lineTo(x + (r() - 0.5) * s, y + (r() - 0.5) * s); c.fill(); }
        c.filter = 'none';
      }
    };
    F.add((t) => {
      let q = 0, sc = 0.92;
      for (const [a, b, s] of insets) if (t >= a && t < b) { q = Math.min(E.cubicInOut(seg(t, a, a + 0.5)), 1 - E.cubicInOut(seg(t, b - 0.5, b))); sc = s; }
      set(back, { display: q > 0.001 ? '' : 'none' });
      const s2 = 1 - (1 - sc) * q;
      set(screen, { transform: q > 0.001 ? `${BASE}translate(${(W / 2).toFixed(1)}px,${(H / 2 + (BAND ? 0 : q * (R.barH ?? 0) * 0.5)).toFixed(1)}px) scale(${s2.toFixed(4)}) translate(${(-W / 2).toFixed(1)}px,${(-H / 2).toFixed(1)}px)` : BASE || 'none', borderRadius: q > 0.001 ? `${gx(10)}px` : '0', boxShadow: q > 0.001 ? `0 0 0 ${gx(3)}px rgba(230,230,225,${(0.5 * q).toFixed(2)}), 0 ${gx(10)}px ${gx(40)}px rgba(0,0,0,.8)` : 'none' });
    });

    // ---------- the thumbnail-style title card ----------
    const titles = [];
    R.title = (a, b, o = {}) => {
      const S = R.shot(a, b, { bg: o.bg ?? 'dark', in: o.in ?? 'cut', dur: o.dur, drift: o.drift ?? 0.06 });
      if (o.art) S.backdrop(o.art, { tone: o.tone ?? 'bw', halftone: o.halftone ?? false, seed: o.seed, art: o.artOpt, pos: o.pos });
      const shade = el('div', `inset:0;background:linear-gradient(${o.align === 'bottom' ? '0deg' : '170deg'}, rgba(0,0,0,.72) 0%, rgba(0,0,0,.25) 45%, rgba(0,0,0,0) 70%)`, S.over); shade.dataset.motion = 'skip';
      const lines = o.lines || [], size = o.size ?? (PT ? 120 : 190), at = o.at ?? a + 0.1, x0 = o.x ?? (PT ? 40 : 70), y0 = o.y ?? (PT ? 260 : 150);
      lines.forEach((ln, i) => {
        const la = at + i * (o.stagger ?? 0.32);
        const e = el('div', `left:${gx(x0 + i * (o.step ?? 0))}px;top:${gx(y0 + i * size * 1.3)}px;opacity:0;transform-origin:0 50%`, S.over);
        const s = node('span', `position:relative;display:inline-block;font:900 ${gx(size)}px/1.05 ${FONT.sans};letter-spacing:-.01em;color:#fff;background:linear-gradient(180deg,#ffffff 0%,#e9e9e6 45%,#9d9d99 58%,#d8d8d4 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap;filter:drop-shadow(0 ${gx(3)}px 0 #2a2a2a) drop-shadow(0 ${gx(6)}px 0 #151515) drop-shadow(0 ${gx(12)}px ${gx(14)}px rgba(0,0,0,.7))`, e, esc(ln));
        F.text(s, i === 0 ? 'slam' : 'headline', ln, la, b, { overlap: i > 0 });   // the next line slams in over the last one's edge for a moment
        F.add((t) => { const q = E.quartOut(seg(t, la, la + 0.22)); set(e, { opacity: seg(t, la, la + 0.08).toFixed(3), transform: `scale(${(1.25 - 0.25 * q).toFixed(4)})` }); });
        F.sfx(la, 'impact', 0.7);
      });
      F.musicCue(at, 'hit');
      titles.push({ a, b, lines });
      return S;
    };

    // ---------- the end sheet: masthead, the sign-off, sources, picture credits ----------
    R.end = (a, b, o = {}) => {
      const S = R.shot(a, b, { bg: 'desk', in: o.in ?? 'dissolve', drift: 0.03 });
      F.scene(a, b, { end: true });
      const w = PT ? 520 : 1300;
      const d = S.doc({ x: (FW - w) / 2, y: PT ? 230 : 130, w, at: a, enter: 'drop', masthead: o.masthead, kind: 'notice', title: o.title ?? M('本期完', 'That’s all for this edition'), sub: o.sub, blocks: [] });
      const inner = d.body.lastChild, cr = F.credits || [];
      const lines = [];
      if ((o.sources || []).length) { lines.push(['h', M('资料来源', 'Sources')]); for (const s of o.sources) lines.push(['s', s]); }
      const groups = []; for (const c of cr) { const k = [c.author, c.licence].filter(Boolean).join(' · ') || c.title; if (k && !groups.includes(k)) groups.push(k); }
      if (groups.length) { lines.push(['h', M('图片', 'Pictures')]); for (const k of groups.slice(0, 5)) lines.push(['s', k]); }
      for (const n of o.notes || []) lines.push(['n', n]);
      lines.forEach(([k, s], i) => { const la = a + 0.6 + i * Math.min(0.7, (b - a - 1.7) / Math.max(1, lines.length - 1)); const e = node('div', k === 'h' ? `font:700 ${gx(28)}px/1.5 ${FONT.sans};margin-top:${gx(14)}px` : `font:400 ${gx(k === 'n' ? 22 : 23)}px/1.5 ${FONT.ensans};color:${k === 'n' ? '#555' : '#333'}`, inner, esc(s)); e.style.opacity = 0; F.add((t) => set(e, { opacity: seg(t, la, la + 0.3).toFixed(3) })); F.text(e, 'label', s, la, b, { noFact: true, chrome: true }); if (k === 'h') F.sfx(la, 'pin', 0.5); });
      S.cam(a, { x: FW / 2, y: PT ? 560 : 500, h: PT ? 1060 : 1000 });
      F.musicCue(a + 0.2, 'name');
      return S;
    };

    // ---------- checks ----------
    F.addLint(() => {
      const out = [], add = (t, what, msg) => out.push({ level: 'warn', t, src: '', what, msg });
      for (const S of shots) if (S.b - S.a > 9 && S.keys.length < 2) add(S.a, M('镜头', 'shot'), M(`${S.a.toFixed(1)}–${S.b.toFixed(1)} 秒这个镜头 ${(S.b - S.a).toFixed(1)} 秒只靠慢推：长镜头要有推进 / 平移到下一处（S.cam），或者拆成两个镜头`, `The shot at ${S.a.toFixed(1)}–${S.b.toFixed(1)} s runs ${(S.b - S.a).toFixed(1)} s on the drift alone: move the camera to the next thing (S.cam) or split it`));
      for (const tl of titles) if (tl.lines.some((l) => [...l].length > 9)) add(tl.a, M('标题卡', 'title card'), M(`标题卡"${tl.lines.join(' / ')}"一行太长：每行 ≤ 8 个字，像视频封面那样短`, `Title card "${tl.lines.join(' / ')}" has a long line: ≤ 8 characters a line, short like a thumbnail`));
      return out;
    });

    return R;
  };
})();
