// collage.js: the editorial paper-collage explainer (纸艺拼贴新闻解说) style, one of bb-video's visual styles (style notes in styles/collage/STYLE.md). Load after promo.js.
// One frame: one continuous take over a paper-covered table seen in 2.5D. Torn-edge pieces of paper lie on it: halftone black-and-white photos with
// a white torn fringe and a credit, faded protest-poster layers underneath, red rubber stamps, a typewriter quote that types on and gets a highlighter
// sweep, masking tape and push pins. Information is told with paper props: a paper-doll grid that turns red, a seating plan stamped 缺, a red thread
// pinned along a timeline, index cards with redaction bars, cut-paper bars on notebook paper, a ladder and a podium with country cut-outs, a line chart
// on graph paper with flag pins riding the lines, a big serif character printed on a bond certificate, map cut-outs. The camera never cuts: it floats,
// pans, pushes and tilts across the table with depth of field; a full red sheet makes a title card; a spotlight darkens the rest. Fixed chrome: channel
// / chapter top left, date and place top right, a source line at the bottom (photo credits join it while the photo is on screen).
//
//   const C = PROMO.collage(F, { channel, palette, tilt, dof, float, grain, vignette, captions, portrait: 'fill' | 'band', fonts, colors })
//   World units: the table; the frame shows 1000 units of height at h = 1000 (C.FW wide). x / y of a piece = its top-left, w / h its size, rot degrees.
//   CAMERA    C.cam(t, view, ease)   view = { x, y, h, tilt, roll } or { on: piece | target, pad, dx, dy, h, tilt, roll, level }
//             C.move(a, b, view, ease)   hold the last view at a, arrive at b (long travels lift the camera and blur in between: still one take)
//             C.defocus(a, b, px) a focus pulse;  C.spot(a, b, { on | x, y, r, dark }) a spotlight (everything else darkens)
//   PAPER     every piece takes { x, y, w, h, rot, at, until, enter: 'drop' | 'slide' | 'slap' | 'none' | 'wipe', from, exit: { at, to }, depth: 'back' | 'table' | 'top',
//             paper: 'white' | 'news' | 'cream' | 'graph' | 'note' | 'kraft' | 'red' | 'blue' | 'green' | 'black' | 'cert' | null, torn: 'tlbr' subset | 'all' | '', tape: ['tl', 't', …], pin }
//             C.piece(o) a sheet → { face (put content in, px), find(text), box(), view(pad) }
//             C.photo(src, { caption: { zh, en }, halftone, tone, cell, illus })   C.poster({ text, sub, color, font })   C.bed({ x, y, w, h, words, seed })  background layers
//             C.label(text, { sub, size, paper, font })  a torn strip;  C.big(text, { size, color })  a huge printed character;  C.stamp(text, { sub, color, size })
//             C.type({ head, text, by, tr, mark: [{ text, at }] })  a typewriter quote;  C.note(text, { color, size })  a red hand note
//             C.mark / C.redact / C.ring / C.strike (target, { at, until })  on any piece's exact words
//   INFO      C.dolls  C.plan  C.timeline  C.card  C.bars  C.ladder  C.podium  C.chart  C.glyph  C.country  C.number   (paper props, styles/collage/STYLE.md §9)
//   WHOLE     C.title(a, b, { text, sub, photo })  a red title sheet the camera flies to;  C.end(a, b, { title, sources, notes })  the source card
//   CHROME    C.dateline(at, '2026.01 · 伦敦');  C.source(at, '数据：…', until)   (chapter from script.json "chapter"; channel from opt.channel)
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('collage.js 要在 promo.js 之后加载', 'collage.js must load after promo.js'));
  const { E, seg, set, el, esc, frameT } = P;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const rnd = (s) => window.EV.rng(s);
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mix = (a, b, q) => a + (b - a) * q;
  const node = (tag, css, parent, html) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (html !== undefined) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const DEG = Math.PI / 180;
  const obj = (x) => (x && typeof x === 'object' ? x : { text: x });   // an option given as 'text' or { text, at }: never read .at off a string (String.prototype.at is a function)
  const units = (t) => { t = String(t ?? ''); return (t.match(/[^\x00-\xff]/g) || []).length + t.replace(/[^\x00-\xff]/g, '').length * 0.58; };

  P.collage = function (F, opt = {}) {
    // Portrait: 'fill' (default) = the table seen through a tall frame (camera framings with `on` fit themselves; give pieces a portrait layout with C.L(landscape, portrait));
    //   'band' = the 16:9 film plays in a band across the tall frame, chrome above, captions below (every landscape framing reused unchanged)
    const BAND = F.portrait && opt.portrait === 'band', RW = F.W, RH = F.H;
    const W = BAND ? 1920 : F.W, H = BAND ? 1080 : F.H, PT = F.portrait && !BAND, g = H / 1000, FW = W / g, AR = W / H;
    const BK = BAND ? RW / W : 1, BY = BAND ? Math.round(RH * 0.3) : 0, BASE = BAND ? `translate(0px,${BY}px) scale(${BK}) ` : '';
    const gx = (v) => v * g;
    const PAL = {
      news: { table: '#e7dfc9', ink: '#1d1b18', red: '#b3282d', blue: '#3f5e93', green: '#3f7a55', paper: '#f2ede1', grey: '#8a857a', mark: 'rgba(246,214,58,.78)', poster: ['#c96f6c', '#8fa1bf', '#b9b9a6', '#d9c58e', '#9db29b', '#6f6b66'] },
      ledger: { table: '#e8d5cb', ink: '#1d1b18', red: '#a82a2a', blue: '#2f4f8f', green: '#2f7a4b', paper: '#f1ebdf', grey: '#8a7f78', mark: 'rgba(246,214,58,.78)', poster: ['#c98d84', '#a3a9bd', '#c5b9a6', '#d7c08f', '#a7b59e', '#77706a'] },
      archive: { table: '#d9d3c4', ink: '#1a1a1a', red: '#a3262a', blue: '#46597a', green: '#4b6f58', paper: '#ece8dc', grey: '#7d7a72', mark: 'rgba(240,205,60,.75)', poster: ['#b9837c', '#8e9aae', '#a9a796', '#c9b98e', '#93a191', '#5f5c58'] },
    };
    const C0 = { ...(PAL[opt.palette] || PAL.news), ...(opt.colors || {}) };
    const FONT = { serif: '"Noto Serif SC", "Songti SC", serif', sans: '"Noto Sans SC", "PingFang SC", sans-serif', type: '"Courier Prime", "Noto Serif SC", monospace', old: '"Special Elite", "Courier Prime", "Noto Serif SC", monospace', mono: '"IBM Plex Mono", "Noto Sans SC", monospace', caps: '"Playfair Display", "Noto Serif SC", Georgia, serif', grot: 'Oswald, "Noto Sans SC", sans-serif', ...(opt.fonts || {}) };
    const R = { F, g: gx, FW, colors: C0, fonts: FONT, portrait: PT };
    const colOf = (c, d) => (c == null ? d : c === 'red' || c === 'blue' || c === 'green' || c === 'ink' || c === 'grey' ? C0[c] : c);   // palette names or any css colour
    R.col = colOf;
    R.L = (land, port) => (PT && port !== undefined ? port : land);   // a portrait layout value: C.L(landscape, portrait)
    // flat: the common interface (kit.js) draws each scene on its own layer in frame px — no table camera, chrome or captions of our own
    const FLAT = !!opt.flat;
    const TILT = opt.tilt ?? 9, DOF = opt.dof ?? 1, FLOAT = opt.float ?? 1;
    const SAFE = opt.safe ?? (F.voiced && opt.captions !== false ? (PT ? [0.12, 0.77] : [0.08, 0.82]) : [0.06, 0.92]);
    F.blurBase(1);   // the camera mostly floats; travels, slides and slaps register their own F.blur spans

    // ---------- layers: screen (table in perspective, depth of field, spotlight, vignette, grain), hud (chrome, captions) ----------
    const screen = el('div', `left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;z-index:10;transform-origin:0 0;${BASE ? `transform:${BASE};` : ''}background:${C0.table}`, F.stage);
    const lens = el('div', `inset:0;perspective:${(H * 2.4).toFixed(0)}px;perspective-origin:50% 50%`, screen);
    const table = el('div', 'left:0;top:0;width:0;height:0;transform-origin:0 0;transform-style:flat', lens);
    table.dataset.tiltOk = '1';
    table.dataset.motion = 'texture';   // the motion sheet measures pieces on the table as if the camera stood still (the camera has its own checks below: too fast, parked)
    const dofTop = el('div', `left:0;top:0;width:${W}px;height:${(H * 0.42).toFixed(0)}px;z-index:600;pointer-events:none;-webkit-mask-image:linear-gradient(#000 0%, rgba(0,0,0,.55) 45%, transparent 100%);mask-image:linear-gradient(#000 0%, rgba(0,0,0,.55) 45%, transparent 100%)`, screen);
    const dofBot = el('div', `left:0;bottom:0;width:${W}px;height:${(H * 0.26).toFixed(0)}px;z-index:600;pointer-events:none;-webkit-mask-image:linear-gradient(0deg,#000 0%, transparent 100%);mask-image:linear-gradient(0deg,#000 0%, transparent 100%)`, screen);
    const spotEl = el('div', 'inset:0;z-index:650;pointer-events:none;display:none', screen);
    const G = { grain: 0.45, vignette: 0.5, ...(opt.grade || {}) };
    const vig = el('div', `inset:0;z-index:700;pointer-events:none;background:radial-gradient(ellipse at 50% 48%, rgba(40,25,10,0) 55%, rgba(40,25,10,${(0.3 * G.vignette).toFixed(3)}) 85%, rgba(30,18,8,${(0.62 * G.vignette).toFixed(3)}) 100%)`, screen);
    for (const e of [dofTop, dofBot, spotEl, vig]) e.dataset.motion = 'skip';
    const hud = el('div', 'inset:0;z-index:860;pointer-events:none', F.stage);
    if (FLAT) screen.style.display = 'none';
    Object.assign(R, { screen, table, hud });
    if (G.grain > 0 && !FLAT) {   // paper-film grain: a few noise tiles, one shown per frame (12 changes a second)
      const GR = 2, NT = 5, tiles = [];
      const box = el('div', `inset:0;z-index:710;pointer-events:none;mix-blend-mode:multiply;opacity:${(0.5 * G.grain).toFixed(2)}`, screen); box.dataset.motion = 'skip';
      for (let k = 0; k < NT; k++) {
        const cv = el('canvas', `inset:0;width:${W}px;height:${H}px;display:none`, box); cv.width = Math.ceil(W / GR); cv.height = Math.ceil(H / GR); cv.dataset.motion = 'skip';
        const c = cv.getContext('2d'), img = c.createImageData(cv.width, cv.height), r = rnd(k * 7919 + 13);
        for (let i = 0; i < img.data.length; i += 4) { const v = 255 - Math.abs((r() + r() + r() - 1.5) * 120); img.data[i] = img.data[i + 1] = v; img.data[i + 2] = v * 0.97; img.data[i + 3] = 255; }
        c.putImageData(img, 0, 0); tiles.push(cv);
      }
      let last = -1;
      F.add((t) => { const k = ((Math.floor(t * 12 + 1e-6) % NT) + NT) % NT || 0; if (k !== last) { if (last >= 0) tiles[last].style.display = 'none'; tiles[k].style.display = ''; last = k; } });
    }

    // ---------- paper textures (made once per kind, tiled) ----------
    const hexRgb = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const PAPER = { table: C0.table, white: C0.paper, news: '#e2dcc9', cream: '#efe4c8', graph: '#f1ede0', note: '#f3efe4', kraft: '#c49f6c', red: C0.red, blue: C0.blue, green: C0.green, black: '#22201d', cert: '#e3e6dc', pink: '#e9d6cc' };
    const texCache = {};
    const tex = (kind) => {
      if (texCache[kind]) return texCache[kind];
      const S2 = 512, cv = document.createElement('canvas'); cv.width = cv.height = S2;
      const c = cv.getContext('2d'), r = rnd(kind.length * 977 + kind.charCodeAt(0) * 31);
      const base = hexRgb(PAPER[kind] ?? kind), dark = (base[0] + base[1] + base[2]) / 3 < 110;
      const lo = document.createElement('canvas'); lo.width = lo.height = 16; const lc = lo.getContext('2d'), li = lc.createImageData(16, 16);
      for (let i = 0; i < li.data.length; i += 4) { const v = 128 + (r() - 0.5) * 70; li.data[i] = li.data[i + 1] = li.data[i + 2] = v; li.data[i + 3] = 255; }
      lc.putImageData(li, 0, 0);
      c.fillStyle = `rgb(${base})`; c.fillRect(0, 0, S2, S2);
      c.globalAlpha = kind === 'table' ? 0.16 : 0.1; c.globalCompositeOperation = 'overlay'; c.imageSmoothingEnabled = true;
      for (const dx of [-S2, 0, S2]) for (const dy of [-S2, 0, S2]) c.drawImage(lo, dx, dy, S2, S2);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      const img = c.getImageData(0, 0, S2, S2), d = img.data, amp = dark ? 10 : 8;
      for (let i = 0; i < d.length; i += 4) { const n = (r() + r() - 1) * amp; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.95; }
      c.putImageData(img, 0, 0);
      for (let k = 0; k < 160; k++) {   // fibres, wrapped so the tile repeats without a seam
        const x = r() * S2, y = r() * S2, a = r() * Math.PI, l = 4 + r() * 16, dk = r() < 0.5;
        c.strokeStyle = dk ? `rgba(70,55,35,${0.04 + r() * 0.09})` : `rgba(255,252,240,${0.08 + r() * 0.14})`; c.lineWidth = 0.6 + r() * 0.7;
        for (const ox of [-S2, 0, S2]) for (const oy of [-S2, 0, S2]) { c.beginPath(); c.moveTo(x + ox, y + oy); c.quadraticCurveTo(x + ox + Math.cos(a) * l * 0.5 + (r() - 0.5) * 4, y + oy + Math.sin(a) * l * 0.5, x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); c.stroke(); }
      }
      if (kind === 'news') { c.fillStyle = 'rgba(40,36,30,.05)'; for (let y = 0; y < S2; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < S2; x += 4) { c.beginPath(); c.arc(x, y, 0.9, 0, 7); c.fill(); } }
      return (texCache[kind] = cv.toDataURL('image/png'));
    };
    R.tex = tex;
    // the background a kind of paper gets: texture + its printed rules (graph squares, notebook lines, certificate tint)
    const paperCss = (kind) => {
      if (!kind) return 'background:transparent';
      const base = `background-color:${PAPER[kind] ?? kind};background-image:url(${tex(kind)})`, sz = `${gx(240)}px`;
      if (kind === 'graph') return `${base.replace('background-image:', 'background-image:linear-gradient(rgba(90,130,120,.22) 1px, transparent 1px),linear-gradient(90deg, rgba(90,130,120,.22) 1px, transparent 1px),linear-gradient(rgba(90,130,120,.12) 1px, transparent 1px),linear-gradient(90deg, rgba(90,130,120,.12) 1px, transparent 1px),')};background-size:${gx(60)}px ${gx(60)}px,${gx(60)}px ${gx(60)}px,${gx(12)}px ${gx(12)}px,${gx(12)}px ${gx(12)}px,${sz}`;
      if (kind === 'note') return `${base.replace('background-image:', `background-image:linear-gradient(90deg, transparent ${gx(96)}px, rgba(200,60,60,.55) ${gx(96)}px, rgba(200,60,60,.55) ${gx(98.5)}px, transparent ${gx(98.5)}px),linear-gradient(transparent ${gx(44)}px, rgba(70,110,170,.28) ${gx(44)}px, rgba(70,110,170,.28) ${gx(46)}px, transparent ${gx(46)}px),`)};background-size:100% 100%,100% ${gx(46)}px,${sz}`;
      return `${base};background-size:${sz}`;
    };
    R.paperCss = paperCss;

    // ---------- torn edges: an outer polygon (the white core of the paper shows at a tear) and an inner one (the printed surface) ----------
    const tornPoly = (w, h, sides, seed, amp) => {
      const r = rnd(seed), step = Math.max(3, gx(5)), A = amp ?? gx(7);
      const noise = (n) => { const k = Math.ceil(n / 7) + 2, v = Array.from({ length: k + 1 }, () => r()); return (i) => { const q = i / 7, a = Math.floor(q), f = q - a, s = f * f * (3 - 2 * f); return mix(v[a % k], v[(a + 1) % k], s); }; };
      const out = [], inn = [];
      const side = (key, x0, y0, x1, y1, nx, ny) => {
        const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(L / step)), torn = sides.includes(key), nz = noise(n), nz2 = noise(n);
        for (let i = 0; i < n; i++) {
          const q = i / n, x = mix(x0, x1, q), y = mix(y0, y1, q);
          if (!torn) { out.push([x, y]); inn.push([x, y]); continue; }
          const o = A * (0.15 + 0.7 * nz(i) + (r() - 0.5) * 0.25) * Math.min(1, i / 3, (n - i) / 3), f = A * (0.25 + 0.6 * nz2(i)) * Math.min(1, i / 3, (n - i) / 3);
          out.push([x + nx * o, y + ny * o]); inn.push([x + nx * (o + f), y + ny * (o + f)]);
        }
      };
      side('t', 0, 0, w, 0, 0, 1); side('r', w, 0, w, h, -1, 0); side('b', w, h, 0, h, 0, -1); side('l', 0, h, 0, 0, 1, 0);
      const css = (pts) => `polygon(${pts.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(',')})`;
      return { outer: css(out), inner: css(inn) };
    };

    // ---------- halftone: dot size by darkness on a 45° grid, ink on paper ----------
    R.halftone = (src, o = {}) => {
      const w = src.width, h = src.height, out = document.createElement('canvas'); out.width = w; out.height = h;
      const c = out.getContext('2d'), sc = 3, sw = Math.ceil(w / sc), sh = Math.ceil(h / sc), small = document.createElement('canvas'); small.width = sw; small.height = sh;
      const s2 = small.getContext('2d'); s2.drawImage(src, 0, 0, sw, sh);
      const dd = s2.getImageData(0, 0, sw, sh).data, L = new Float32Array(sw * sh);
      for (let i = 0, j = 0; i < dd.length; i += 4, j++) L[j] = (0.299 * dd[i] + 0.587 * dd[i + 1] + 0.114 * dd[i + 2]) / 255;
      const con = o.contrast ?? 1.3, br = o.bright ?? 0.02, gm = o.gamma ?? 1;
      const at = (x, y) => { const xi = cl(Math.floor(x / sc), 0, sw - 1), yi = cl(Math.floor(y / sc), 0, sh - 1); return cl(Math.pow(cl((L[yi * sw + xi] - 0.5) * con + 0.5 + br), gm)); };
      c.fillStyle = o.paper ?? '#ece6d6'; c.fillRect(0, 0, w, h);
      c.fillStyle = o.ink ?? '#161412';
      const cell = o.cell ?? Math.max(3, Math.round(Math.min(w, h) / 120)), an = ((o.angle ?? 45) * Math.PI) / 180, ca = Math.cos(an), sa = Math.sin(an), R2 = Math.hypot(w, h);
      for (let v = -R2; v < R2; v += cell) for (let u = -R2; u < R2; u += cell) {
        const x = w / 2 + u * ca - v * sa, y = h / 2 + u * sa + v * ca;
        if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue;
        const dk = 1 - at(x, y); if (dk < 0.05) continue;
        c.beginPath(); c.arc(x, y, cell * 0.5 * Math.sqrt(dk) * 1.45, 0, 6.2832); c.fill();
      }
      const r = rnd(w * 7 + h), img = c.getImageData(0, 0, w, h), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
      c.putImageData(img, 0, 0);
      return out;
    };
    const toneIt = (cv, tone) => {
      if (!tone || tone === 'color') return cv;
      const out = document.createElement('canvas'); out.width = cv.width; out.height = cv.height; const c = out.getContext('2d');
      c.filter = tone === 'bw' ? 'grayscale(1) contrast(1.15)' : tone === 'sepia' ? 'grayscale(1) sepia(.55) contrast(1.1)' : 'saturate(.5) contrast(1.06)'; c.drawImage(cv, 0, 0); return out;
    };
    const mediaImage = (key) => (window.MEDIA_ASSETS && window.MEDIA_ASSETS.images && window.MEDIA_ASSETS.images[key]) || null;
    const ART = (R.art = {});
    const credits = [];   // { piece, text } — joins the source line while the piece is on screen
    // a picture canvas of pw × ph px: painted now (a painter: an illustration, never a "photo" of a real event) or once the photo has loaded (a manifest key)
    const picture = (src, pw, ph, o = {}) => {
      const cv = document.createElement('canvas'); cv.width = Math.round(Math.min(2400, pw)); cv.height = Math.round(Math.min(2400 * ph / pw, ph));
      const finish = (raw) => { const c = cv.getContext('2d'); const done = o.halftone === false ? toneIt(raw, o.tone ?? 'bw') : R.halftone(toneIt(raw, 'bw'), { cell: o.cell ? o.cell * cv.width / gx(100) : undefined, ...(o.ht || {}) }); c.drawImage(done, 0, 0); };
      const paint = typeof src === 'function' ? src : typeof src === 'string' && ART[src] ? ART[src] : null;
      if (paint) { const raw = document.createElement('canvas'); raw.width = cv.width; raw.height = cv.height; paint(raw.getContext('2d'), raw.width, raw.height, { seed: o.seed ?? 1, ...(o.art || {}) }); finish(raw); return { cv, credit: null, drawn: true }; }
      const m = typeof src === 'string' ? mediaImage(src) : null;
      if (!m) throw new Error(M(`collage：没有这张图 "${src}"：R.art 里的画法（${Object.keys(ART).join(' / ')}）、一个函数，或者 assets/manifest.js 里的图片（footage.mjs 下载，带来源和许可）`, `collage: no picture "${src}": a painter in R.art (${Object.keys(ART).join(', ')}), a function, or an image in assets/manifest.js (fetched with footage.mjs, with source and licence)`));
      if (m.credit) F.credit({ ...m.credit, file: m.file });
      else console.warn(M(`collage：图片 "${src}" 没有来源 / 许可信息（用 footage.mjs 下载，或者在 assets/src/${src}.json 里写 { title, author, licence, url }）`, `collage: image "${src}" has no source / licence (fetch it with footage.mjs, or write { title, author, licence, url } in assets/src/${src}.json)`));
      F.prep(() => new Promise((res) => {
        const im = new Image(); im.onload = () => { const raw = document.createElement('canvas'); raw.width = cv.width; raw.height = cv.height; const c = raw.getContext('2d');
          const s = Math.max(raw.width / im.width, raw.height / im.height), [fx0, fy0] = (o.pos || '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
          c.drawImage(im, (raw.width - im.width * s) * fx0, (raw.height - im.height * s) * fy0, im.width * s, im.height * s); finish(raw); res(); };
        im.onerror = res; im.src = 'assets/' + m.file;
      }));
      return { cv, credit: m.credit || null, drawn: false };
    };
    // painters: objects and places, never people or events (they are labelled 示意 / ILLUSTRATION on the print)
    ART.bars = (c, w, h, o = {}) => {   // a stack of gold / metal bars
      const r = rnd(o.seed ?? 4); c.fillStyle = '#2b2925'; c.fillRect(0, 0, w, h);
      const bw = w * 0.2, bh = h * 0.12;
      for (let row = 0; row < 6; row++) for (let k = 0; k < 7; k++) {
        const x = (k - 0.5 + (row % 2) * 0.5) * bw * 1.04, y = h - (row + 1) * bh * 0.98 - h * 0.04;
        if (row > 3 && (k < 2 || k > 4)) continue;
        const gr = c.createLinearGradient(x, y, x, y + bh); gr.addColorStop(0, '#f2f0ea'); gr.addColorStop(0.35, '#b8b4aa'); gr.addColorStop(1, '#55524b');
        c.fillStyle = gr; c.beginPath(); c.moveTo(x + bw * 0.1, y); c.lineTo(x + bw * 0.9, y); c.lineTo(x + bw, y + bh); c.lineTo(x, y + bh); c.closePath(); c.fill();
        c.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.2})`; c.fillRect(x + bw * 0.18, y + bh * 0.18, bw * 0.64, bh * 0.18);
      }
      const gl = c.createRadialGradient(w * 0.35, h * 0.2, 0, w * 0.35, h * 0.2, w * 0.7); gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gl; c.fillRect(0, 0, w, h);
    };
    ART.coins = (c, w, h, o = {}) => {   // coins scattered on a cloth
      const r = rnd(o.seed ?? 6); c.fillStyle = '#3a3733'; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 26; k++) {
        const x = r() * w, y = r() * h, s = Math.min(w, h) * (0.08 + r() * 0.07), ry = s * (0.55 + r() * 0.45);
        const gr = c.createRadialGradient(x - s * 0.3, y - ry * 0.3, s * 0.1, x, y, s); gr.addColorStop(0, '#f4f2ec'); gr.addColorStop(0.6, '#a7a39a'); gr.addColorStop(1, '#4e4b45');
        c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, s, ry, r() * 3, 0, 7); c.fill();
        c.strokeStyle = 'rgba(40,38,34,.6)'; c.lineWidth = s * 0.06; c.beginPath(); c.ellipse(x, y, s * 0.8, ry * 0.8, 0, 0, 7); c.stroke();
      }
    };
    ART.vault = (c, w, h) => {   // a vault door, front on
      c.fillStyle = '#4a4741'; c.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, R0 = Math.min(w, h) * 0.42;
      const gr = c.createRadialGradient(cx - R0 * 0.3, cy - R0 * 0.3, R0 * 0.1, cx, cy, R0); gr.addColorStop(0, '#e9e6de'); gr.addColorStop(0.7, '#8d8981'); gr.addColorStop(1, '#3a3833');
      c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, R0, 0, 7); c.fill();
      c.strokeStyle = '#2c2a26'; c.lineWidth = R0 * 0.04; for (const k of [0.92, 0.7]) { c.beginPath(); c.arc(cx, cy, R0 * k, 0, 7); c.stroke(); }
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.fillStyle = '#d9d5cc'; c.beginPath(); c.arc(cx + Math.cos(a) * R0 * 0.82, cy + Math.sin(a) * R0 * 0.82, R0 * 0.045, 0, 7); c.fill(); }
      c.lineWidth = R0 * 0.07; c.strokeStyle = '#d7d3ca'; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.3; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * R0 * 0.45, cy + Math.sin(a) * R0 * 0.45); c.stroke(); }
      c.fillStyle = '#2c2a26'; c.beginPath(); c.arc(cx, cy, R0 * 0.12, 0, 7); c.fill();
    };
    ART.screens = (c, w, h, o = {}) => {   // a wall of price screens (no numbers)
      const r = rnd(o.seed ?? 8); c.fillStyle = '#121212'; c.fillRect(0, 0, w, h);
      const cols = 4, rows = 3, pw = w / cols, ph = h / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const x = i * pw + pw * 0.05, y = j * ph + ph * 0.06; c.fillStyle = '#262626'; c.fillRect(x, y, pw * 0.9, ph * 0.88);
        c.strokeStyle = '#e8e8e8'; c.lineWidth = Math.max(1.5, w / 500); c.beginPath(); let v = 0.5;
        for (let k = 0; k <= 40; k++) { v = cl(v + (r() - 0.5) * 0.18 + (j - 1) * -0.01, 0.1, 0.9); const px = x + pw * 0.9 * (k / 40), py = y + ph * 0.88 * (1 - v); k ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
      }
    };

    // ---------- pieces on the table ----------
    const pieces = [], flats = [], seeds = { n: 0 };
    let maxX = 0;
    const TAPE = { tl: [0, 0, -38], tr: [1, 0, 38], bl: [0, 1, 38], br: [1, 1, -38], t: [0.5, 0, -3], b: [0.5, 1, 3], l: [0, 0.5, 86], r: [1, 0.5, 92] };
    R.piece = (o = {}) => {
      const w = o.w ?? 400, h = o.h ?? 300, seed = o.seed ?? ++seeds.n * 131 + 17, r = rnd(seed);
      const sides = o.torn === 'all' || o.torn === undefined ? (o.paper === null ? '' : 'tlbr') : o.torn || '';
      const wrap = el('div', `left:0;top:0;width:${gx(w)}px;height:${gx(h)}px;transform-origin:50% 50%;opacity:0`, o.layer ?? table);
      const depth = o.depth ?? 'table';
      const sheet = el('div', `inset:0;${o.paper === null ? '' : `background:${o.fringe === false ? PAPER[o.paper ?? 'white'] ?? o.paper : '#f6f2e8'};`}`, wrap);
      const face = el('div', `inset:0;${paperCss(o.paper === undefined ? 'white' : o.paper)};overflow:hidden`, sheet);
      if (sides) { const tp = tornPoly(gx(w), gx(h), sides, seed, o.amp ? gx(o.amp) : undefined); sheet.style.clipPath = tp.outer; face.style.clipPath = tp.inner; }
      const shadowCss = o.paper === null || o.shadow === false ? 'none' : depth === 'back' ? `drop-shadow(0 ${gx(1)}px ${gx(2)}px rgba(60,40,20,.25))` : `drop-shadow(0 ${gx(2.5)}px ${gx(3.5)}px rgba(50,32,14,.38))`;
      const pc = {
        R, el: wrap, sheet, face, w, h, x: o.x ?? 0, y: o.y ?? 0, rot: o.rot ?? (r() - 0.5) * 3, at: o.at ?? 0, until: o.until ?? 1e9, enter: o.enter ?? (o.at ? 'drop' : 'none'),
        from: o.from ?? 'right', exit: o.exit || null, depth, z: o.z ?? pieces.length + (depth === 'back' ? 0 : depth === 'top' ? 2000 : 1000), shadow: shadowCss, kind: o.kind || 'piece', credit: null, keep: o.keep,
      };
      wrap.style.zIndex = pc.z;
      if (depth === 'back') { const wash = el('div', `inset:0;background:${C0.table};opacity:${o.wash ?? 0.56};pointer-events:none`, face); wash.dataset.motion = 'skip'; face.style.filter = `blur(${gx(o.soft ?? 1.1).toFixed(2)}px) saturate(.8)`; }
      for (const k of o.tape || []) {
        const [fx, fy, rot] = TAPE[k] || TAPE.t, tw = Math.min(150, w * 0.32), th = 40;
        const tp = el('div', `left:${gx(fx * w - tw / 2)}px;top:${gx(fy * h - th / 2)}px;width:${gx(tw)}px;height:${gx(th)}px;transform:rotate(${rot + (r() - 0.5) * 8}deg);background:rgba(232,226,200,.78);box-shadow:0 ${gx(1)}px ${gx(2)}px rgba(60,45,20,.18);z-index:30`, wrap);
        tp.style.clipPath = tornPoly(gx(tw), gx(th), 'lr', seed + k.length * 7, gx(3)).inner;
      }
      if (o.pin) { const pn = el('div', `left:${gx(w / 2 - 13)}px;top:${gx(12)}px;width:${gx(26)}px;height:${gx(26)}px;border-radius:50%;background:radial-gradient(circle at 35% 30%, #ff8f86 0%, ${C0.red} 45%, #6d1316 100%);box-shadow:${gx(4)}px ${gx(6)}px ${gx(5)}px rgba(40,20,10,.45);z-index:40`, wrap); pc.pinEl = pn; }
      maxX = Math.max(maxX, pc.x + w);
      pc.box = () => ({ x: 0, y: 0, w, h });
      // the world box of the rotated sheet
      pc.wbox = () => { const cx = pc.x + w / 2, cy = pc.y + h / 2, c2 = Math.abs(Math.cos(pc.rot * DEG)), s2 = Math.abs(Math.sin(pc.rot * DEG)), bw = w * c2 + h * s2, bh = w * s2 + h * c2; return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh }; };
      pc.view = (pad = 1.15, more = {}) => ({ on: pc, pad, ...more });
      pc.piece = pc;
      pc.find = (text, nth = 0) => { const sp = wrapText(face, text, nth); if (!sp) throw new Error(M(`collage：这张纸上找不到 "${text}"（要和纸上的字一模一样）`, `collage: "${text}" is not on this piece (it must match the printed words exactly)`)); return target(pc, sp); };
      const ent = pc.enter;
      if (pc.at > 0.01) {
        if (ent === 'drop') F.sfx(pc.at + 0.3, 'paper', 0.45);
        else if (ent === 'slide') { F.sfx(pc.at, 'slide', 0.5, { dur: 0.6, dir: pc.from === 'left' ? 1 : -1 }); F.blur(pc.at, pc.at + 0.55, 6); }
        else if (ent === 'slap') { F.sfx(pc.at + 0.12, 'slap', 0.5); F.blur(pc.at, pc.at + 0.16, 6); }
        else if (ent === 'wipe') F.sfx(pc.at, 'tear', 0.42, { dur: 0.5 });
      }
      if (pc.exit) { F.sfx(pc.exit.at, 'slide', 0.42, { dur: 0.5 }); F.blur(pc.exit.at, pc.exit.at + 0.5, 6); }
      pc.place = (t, v) => {
        let dx = 0, dy = 0, dr = 0, ds = 1, op = 1, lift = 0, clip = null;
        if (t < pc.at - 1e-6 || t >= pc.until) op = 0;
        else if (ent === 'drop') { const q = E.quartOut(seg(t, pc.at, pc.at + 0.45)); ds = 1 + (1 - q) * 0.09; dx = (1 - q) * -10; dy = (1 - q) * -18; dr = (1 - q) * -2.5; op = cl(q * 3); lift = 1 - q; }
        else if (ent === 'slap') { const q = E.quartOut(seg(t, pc.at, pc.at + 0.18)); ds = 1 + (1 - q) * 0.22; op = cl(q * 4); lift = 1 - q; }
        else if (ent === 'slide') { const q = E.quartOut(seg(t, pc.at, pc.at + 0.6)), vw = v.h * AR, d = pc.from; dx = (d === 'left' ? -1 : d === 'right' ? 1 : 0) * (1 - q) * vw * 1.1; dy = (d === 'top' ? -1 : d === 'bottom' ? 1 : 0) * (1 - q) * v.h * 1.1; dr = (1 - q) * (d === 'left' ? -9 : 9); lift = (1 - q) * 0.6; }
        else if (ent === 'wipe') { const q = E.cubicInOut(seg(t, pc.at, pc.at + 0.5)); clip = `inset(-20% ${((1 - q) * 120 - 10).toFixed(1)}% -20% -20%)`; op = t >= pc.at ? 1 : 0; }
        else if (ent === 'fade') op = E.sine(seg(t, pc.at, pc.at + 0.5));
        if (pc.exit && t >= pc.exit.at) { const q = E.quartIn(seg(t, pc.exit.at, pc.exit.at + 0.5)), to = pc.exit.to || 'right', vw = v.h * AR; if (to === 'lift') { op *= 1 - q; ds *= 1 + q * 0.08; lift = Math.max(lift, q); } else { dx += (to === 'left' ? -1 : to === 'right' ? 1 : 0) * q * vw * 1.2; dy += (to === 'up' ? -1 : to === 'down' ? 1 : 0) * q * v.h * 1.2; dr += q * 8; } }
        set(wrap, { opacity: op.toFixed(3), transform: `translate(${gx(pc.x + dx).toFixed(2)}px,${gx(pc.y + dy).toFixed(2)}px) rotate(${(pc.rot + dr).toFixed(3)}deg) scale(${ds.toFixed(4)})`, clipPath: clip || 'none',
          filter: lift > 0.01 && pc.shadow !== 'none' ? `drop-shadow(${gx(4 + 18 * lift).toFixed(1)}px ${gx(6 + 26 * lift).toFixed(1)}px ${gx(5 + 14 * lift).toFixed(1)}px rgba(50,32,14,${(0.38 - 0.12 * lift).toFixed(2)}))` : pc.shadow });
        return op > 0;
      };
      if (o.layer) { flats.push(pc); pc.layer = o.layer; } else pieces.push(pc);
      return pc;
    };
    // register a piece's text for the checks (fact check, overlap, reading); fact: false = layout text (numbering, axis ticks)
    const textOf = (pc, e, kind, text, o = {}) => F.text(e, kind, text, Math.max(pc.at, o.at ?? 0), Math.min(pc.until, pc.exit ? pc.exit.at : 1e9, o.until ?? 1e9), { overlap: o.overlap ?? false, noFact: o.fact === false });
    R.textOf = textOf;
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
    // a target: an element inside a piece; box() = its rectangle in the piece's own units, wbox() = in world units (the sheet's rotation applied)
    const localBox = (pc, e) => { let x = 0, y = 0; for (let n = e; n && n !== pc.el; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; if (!n.offsetParent) break; } return { x: x / g, y: y / g, w: e.offsetWidth / g, h: e.offsetHeight / g }; };
    const target = (pc, e) => {
      const tg = { piece: pc, el: e, box: () => localBox(pc, e) };
      tg.wbox = () => { const b = tg.box(), cx = pc.w / 2, cy = pc.h / 2, a = pc.rot * DEG, ca = Math.cos(a), sa = Math.sin(a); const pts = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].map(([px, py]) => [pc.x + cx + (px - cx) * ca - (py - cy) * sa, pc.y + cy + (px - cx) * sa + (py - cy) * ca]); const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; };
      tg.view = (pad = 1.4, more = {}) => ({ on: tg, pad, ...more });
      return tg;
    };
    R.target = target;
    // several pieces / targets framed as one (the camera's `on`): C.move(a, b, C.group(p1, p2).view(1.1))
    R.group = (...items) => { const gr = { piece: items[0].piece || items[0], wbox: () => { const bs = items.map((it) => it.wbox()), x1 = Math.min(...bs.map((b) => b.x)), y1 = Math.min(...bs.map((b) => b.y)); return { x: x1, y: y1, w: Math.max(...bs.map((b) => b.x + b.w)) - x1, h: Math.max(...bs.map((b) => b.y + b.h)) - y1 }; } }; gr.view = (pad = 1.15, more = {}) => ({ on: gr, pad, ...more }); return gr; };
    // a text element inside a piece's face (px css), registered for the checks
    const tx = (pc, parent, text, css, kind = 'label', o = {}) => { const e = node('div', `position:absolute;${css}`, parent ?? pc.face); e.textContent = text; textOf(pc, e, kind, text, o); return e; };

    // ---------- camera ----------
    const keys = [], pulses = [], spots = [];
    R.cam = (t, view, ease) => { keys.push({ t, view, ease: ease || E.cubicInOut }); return R; };
    R.move = (a, b, view, ease) => { keys.push({ t: a, hold: true }); keys.push({ t: b, view, ease: ease || E.cubicInOut }); return R; };
    R.defocus = (a, b, px = 6) => { pulses.push([a, b, px]); return R; };
    const resolveView = (v, prev) => {
      const base = prev || { x: FW / 2, y: 500, h: 1000, tilt: TILT, roll: 0 };
      if (!v) return { ...base };
      if (v.piece && !v.on) v = { on: v };
      let out;
      if (v.on) {
        // the subject is framed inside the safe band: under the chrome, above the captions (opt.safe = [top, bottom] as fractions of the frame height)
        const [sa, sb] = SAFE, bx = v.on.wbox(), pad = v.pad ?? 1.2, h = v.h ?? Math.max((bx.h * pad) / (sb - sa), (bx.w * pad) / AR);
        out = { x: bx.x + bx.w / 2 + (v.dx ?? 0), y: bx.y + bx.h / 2 + (0.5 - (sa + sb) / 2) * h + (v.dy ?? 0), h, tilt: v.tilt ?? base.tilt, roll: v.roll ?? (v.level ? -(v.on.piece || v.on).rot : base.roll) };
      } else out = { x: v.x ?? base.x, y: v.y ?? base.y, h: v.h ?? (v.w ? v.w / AR : base.h), tilt: v.tilt ?? base.tilt, roll: v.roll ?? base.roll };
      return out;
    };
    let RK = null;
    const resolveKeys = () => {
      const ks = [...keys].sort((p, q) => p.t - q.t || (p.hold ? -1 : 1)); RK = [];
      for (const k of ks) { const prev = RK.length ? RK[RK.length - 1].v : null; RK.push({ t: k.t, v: k.hold ? { ...(prev || resolveView(null)) } : resolveView(k.view, prev), ease: k.ease || E.cubicInOut, hold: !!k.hold }); }
      // long travels: the camera lifts (zooms out) between far-apart views and the picture blurs on the way (one take, no cut)
      for (let i = 1; i < RK.length; i++) {
        const p = RK[i - 1], q = RK[i], fw = (Math.min(p.v.h, q.v.h) * AR), dist = Math.hypot(q.v.x - p.v.x, q.v.y - p.v.y) / fw, dt = Math.max(0.05, q.t - p.t);
        q.lift = dist > 0.8 ? Math.min(0.55, 0.16 * dist) : 0;
        if (dist / dt > 0.55) { F.blur(p.t, q.t, 6); q.fast = true; }
        if (dist > 0.6) F.sfx(p.t + dt * 0.1, 'travel', Math.min(0.5, 0.2 + dist * 0.08), { dur: dt });
        if (dist > 1.2) F.transition(p.t + dt * 0.15, q.t - dt * 0.15);   // the picture changes a lot on the way: not a jump
      }
    };
    const camAt = (t) => {
      const K = RK; let v;
      if (!K.length) v = resolveView(null);
      else if (t <= K[0].t) v = { ...K[0].v };
      else if (t >= K[K.length - 1].t) v = { ...K[K.length - 1].v };
      else {
        let i = 0; while (K[i + 1].t < t) i++;
        const p = K[i], q = K[i + 1], e = q.ease(cl((t - p.t) / Math.max(1e-6, q.t - p.t)));
        v = { x: mix(p.v.x, q.v.x, e), y: mix(p.v.y, q.v.y, e), h: Math.exp(mix(Math.log(p.v.h), Math.log(q.v.h), e)), tilt: mix(p.v.tilt, q.v.tilt, e), roll: mix(p.v.roll, q.v.roll, e) };
        if (q.lift) { const s = Math.sin(Math.PI * e); v.h *= 1 + q.lift * s; v.travel = s * Math.min(1, q.lift * 3); }
      }
      // the hand holding the camera: a slow float, never quite still
      const k = FLOAT * v.h / 1000;
      v.x += k * (3.2 * Math.sin(t * 0.41 + 1.3) + 1.4 * Math.sin(t * 0.93 + 0.2)); v.y += k * (2.6 * Math.sin(t * 0.33 + 0.7) + 1.1 * Math.sin(t * 0.81 + 2.1));
      v.roll += FLOAT * 0.22 * Math.sin(t * 0.23 + 0.4); v.tilt += FLOAT * 0.35 * Math.sin(t * 0.19 + 1.1);
      return v;
    };
    R.camAt = (t) => { if (!RK) resolveKeys(); return camAt(t); };
    // world point → screen px (the same maths as the table's CSS transform: translate · rotateX · rotateZ · scale · translate, then the lens' perspective)
    const PERS = H * 2.4, V0 = { x: FW / 2, y: 500, h: 1000, tilt: 0, roll: 0 };
    const project = (v, wx, wy) => {
      const k = (1000 / v.h) * g, dx = (wx - v.x) * k, dy = (wy - v.y) * k, ra = v.roll * DEG, x1 = dx * Math.cos(ra) - dy * Math.sin(ra), y1 = dx * Math.sin(ra) + dy * Math.cos(ra);
      const ta = v.tilt * DEG, y2 = y1 * Math.cos(ta), z2 = y1 * Math.sin(ta), s = PERS / (PERS - z2);
      return [W / 2 + x1 * s, H / 2 + y2 * s];
    };
    R.project = (t, wx, wy) => project(R.camAt(t), wx, wy);
    R.spot = (a, b, o = {}) => { spots.push({ a, b, o }); F.sfx(a, 'lamp', 0.35); return R; };

    // ---------- per frame ----------
    // the table gets the size of everything on it, so the motion sheet measures pieces against a real parent (a zero-size parent makes every piece look like it moves with the camera)
    F.prep(() => { resolveKeys(); let x0 = 0, y0 = 0, x1 = FW, y1 = 1000; for (const pc of pieces) { const b = (pc._wb = pc.wbox()); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); } table.style.left = '0px'; table.style.width = `${gx(x1)}px`; table.style.height = `${gx(y1)}px`; });
    F.add((t) => {
      if (!RK) resolveKeys();
      for (const pc of flats) pc.on = pc.place(t, V0);
      if (FLAT) return;
      const v = camAt(t), k = 1000 / v.h;
      set(table, { transform: `translate(${W / 2}px,${H / 2}px) rotateX(${v.tilt.toFixed(3)}deg) rotateZ(${v.roll.toFixed(3)}deg) scale(${k.toFixed(5)}) translate(${(-v.x * g).toFixed(2)}px,${(-v.y * g).toFixed(2)}px)` });
      // cull: pieces far outside the view are not drawn (the tilt makes the far edge wider: a generous margin)
      const hw = (v.h * AR) / 2 * 1.45 + 60, hh = v.h / 2 * 1.5 + 60;
      for (const pc of pieces) {
        const b = pc._wb || pc.wbox(), near = b.x < v.x + hw && b.x + b.w > v.x - hw && b.y < v.y + hh && b.y + b.h > v.y - hh;
        if (!near) { set(pc.el, { display: 'none' }); pc.on = false; continue; }
        set(pc.el, { display: '' }); pc.on = pc.place(t, v);
      }
      // depth of field: the far edge of the tilted table and the near edge go soft; travel and pulses defocus the whole picture
      let bl = (v.travel ?? 0) * 3.2;
      for (const [pa, pb, px] of pulses) if (t > pa && t < pb) bl += px * Math.sin(Math.PI * seg(t, pa, pb));
      const dt = DOF * Math.max(0, v.tilt) / 10;
      set(dofTop, { backdropFilter: dt > 0.05 ? `blur(${(gx(2.6) * dt).toFixed(2)}px)` : 'none' });
      set(dofBot, { backdropFilter: dt > 0.05 ? `blur(${(gx(1.4) * dt).toFixed(2)}px)` : 'none' });
      set(lens, { filter: bl > 0.05 ? `blur(${(bl * g).toFixed(2)}px)` : 'none' });
      // spotlight: everything outside a soft circle around the subject darkens
      let sp = null;
      for (const s of spots) if (t >= s.a && t < s.b) sp = s;
      set(spotEl, { display: sp ? '' : 'none' });
      if (sp) {
        const q = Math.min(E.sine(seg(t, sp.a, sp.a + 0.5)), 1 - E.sine(seg(t, sp.b - 0.5, sp.b))), o = sp.o;
        const bx = o.on ? o.on.wbox() : { x: o.x ?? v.x, y: o.y ?? v.y, w: 0, h: 0 }, [sx, sy] = project(v, bx.x + bx.w / 2, bx.y + bx.h / 2);
        const rr = (o.r ? o.r * k * g : Math.max(bx.w, bx.h) * 0.62 * k * g) || H * 0.3, dk = (o.dark ?? 0.7) * q;
        spotEl.style.background = `radial-gradient(circle at ${sx.toFixed(0)}px ${sy.toFixed(0)}px, rgba(12,8,4,0) ${(rr * 0.75).toFixed(0)}px, rgba(12,8,4,${(dk * 0.85).toFixed(3)}) ${(rr * 1.35).toFixed(0)}px, rgba(8,5,2,${dk.toFixed(3)}) ${(rr * 2.4).toFixed(0)}px)`;
      }
    });

    // ---------- photos, posters, labels, stamps, typewriter, notes ----------
    R.photo = (src, o = {}) => {
      const w = o.w ?? 600, h = o.h ?? 420, cap = o.caption, cs = o.capSize ?? 46, capRows = cap && cap.zh ? Math.max(1, Math.ceil((units(cap.zh) * cs * 1.03) / (w - 60))) : 0, capH = cap ? capRows * cs * 1.2 + (cs * 0.3) + (cap.en ? 50 : 20) + 14 : 0, m = o.margin ?? 0;
      const pc = R.piece({ paper: o.halftone === false && !o.border ? null : 'white', torn: o.torn ?? 'all', ...o, w, h: h + capH, kind: 'photo' });
      if (pc.sheet.style.background === 'transparent' || o.paper === null) pc.sheet.style.background = '#f6f2e8';
      const pic = picture(src, gx(w - m * 2) * 1.6, gx(h - m * 2) * 1.6, { halftone: o.halftone ?? true, tone: o.tone, cell: o.cell, seed: o.seed, art: o.art, pos: o.pos, ht: o.ht });
      const holder = node('div', `position:absolute;left:${gx(m)}px;top:${gx(m)}px;width:${gx(w - m * 2)}px;height:${gx(h - m * 2)}px;overflow:hidden;background:#2a2826`, pc.face);
      holder.appendChild(pic.cv); pic.cv.style.cssText = 'width:100%;height:100%;display:block';
      if (pic.drawn && o.illus !== false) tx(pc, holder, M('示意', 'ILLUSTRATION'), `right:${gx(14)}px;bottom:${gx(10)}px;font:600 ${gx(18)}px/1 ${FONT.mono};letter-spacing:.15em;color:#f4efe2;background:rgba(20,18,16,.55);padding:${gx(4)}px ${gx(8)}px`, 'label', { fact: false, overlap: true });
      if (cap) {
        const cb = node('div', `position:absolute;left:${gx(30)}px;top:${gx(h + 14)}px;right:${gx(30)}px`, pc.face);
        if (cap.zh) tx(pc, cb, cap.zh, `position:relative;font:900 ${gx(o.capSize ?? 46)}px/1.15 ${FONT.serif};color:${C0.ink}`, 'label');
        if (cap.en) tx(pc, cb, cap.en, `position:relative;margin-top:${gx(6)}px;font:400 ${gx(22)}px/1.2 ${FONT.type};letter-spacing:.08em;color:#4a463f;text-transform:uppercase`, 'label');
      }
      if (pic.credit) { const c = pic.credit; credits.push({ piece: pc, text: o.credit ?? `${c.author || c.title}${c.licence ? ' / ' + c.licence : ''}` }); }
      else if (o.credit) credits.push({ piece: pc, text: o.credit });
      F.info('photo', pc.at, pc.until < 1e8 ? pc.until : undefined);
      pc.pic = holder;
      return pc;
    };
    // a protest-poster layer: one big word (real, from the brief) in faded ink on coloured paper, optional small line; usually depth 'back'
    R.poster = (o = {}) => {
      const r = rnd(o.seed ?? ++seeds.n * 53), col = o.color ?? C0.poster[Math.floor(r() * C0.poster.length)];
      const pc = R.piece({ depth: 'back', paper: col, w: 520, h: 680, ...o, kind: 'poster' });
      const ink = o.ink ?? (units(col) && hexRgb(col).reduce((a, b) => a + b) / 3 > 150 ? 'rgba(40,34,28,.72)' : 'rgba(246,240,226,.9)');
      if (o.text) { const size = o.size ?? Math.min(pc.h * 0.36, (pc.w * 0.9) / Math.max(1, units(o.text))); const e = node('div', `position:absolute;left:${gx(pc.w * 0.06)}px;top:${gx(o.ty ?? pc.h * 0.1)}px;font:${o.font === 'grot' ? 700 : 900} ${gx(size)}px/0.95 ${o.font === 'grot' ? FONT.grot : FONT.caps};color:${ink};white-space:nowrap;letter-spacing:-.01em`, pc.face, esc(o.text)); F.fact(o.text, pc.at); pc.word = e; }
      if (o.sub) { node('div', `position:absolute;left:${gx(pc.w * 0.07)}px;bottom:${gx(pc.h * 0.08)}px;font:400 ${gx(o.subSize ?? 30)}px/1.2 ${FONT.type};letter-spacing:.12em;color:${ink};text-transform:uppercase`, pc.face, esc(o.sub)); F.fact(o.sub, pc.at); }
      if (o.dots) { const d = node('div', `position:absolute;left:${gx(pc.w * (o.dots.x ?? 0.5))}px;top:${gx(pc.h * (o.dots.y ?? 0.45))}px;width:${gx(pc.w * 0.8)}px;height:${gx(pc.w * 0.8)}px;border-radius:50%;background-image:radial-gradient(${ink} 30%, transparent 32%);background-size:${gx(18)}px ${gx(18)}px;opacity:.45`, pc.face); d.dataset.motion = 'skip'; }
      return pc;
    };
    // a bed of background paper over an area: coloured torn blocks, halftone dot panels and a few big words (only real words from the brief)
    R.bed = (o = {}) => {
      const r = rnd(o.seed ?? 97), x0 = o.x ?? 0, y0 = o.y ?? 0, w = o.w ?? FW, h = o.h ?? 1000, n = o.n ?? Math.round((w * h) / 140000), words = [...(o.words || [])], out = [];
      for (let i = 0; i < n; i++) {
        const pw = 260 + r() * 520, ph = 300 + r() * 520, x = x0 - pw * 0.25 + r() * (w + pw * 0.2), y = y0 - ph * 0.25 + r() * (h + ph * 0.2);
        const word = words.length && r() < (o.wordRate ?? 0.45) ? words[i % words.length] : null;
        out.push(R.poster({ x, y, w: pw, h: ph, rot: (r() - 0.5) * 14, text: word, font: r() < 0.5 ? 'grot' : 'caps', dots: !word && r() < 0.35 ? { x: r() * 0.4, y: r() * 0.4 } : null, seed: (o.seed ?? 97) * 31 + i, at: 0, enter: 'none', wash: o.wash, z: i }));
      }
      return out;
    };
    // a torn strip with a heavy serif label (and a typewriter line under it)
    R.label = (text, o = {}) => {
      const size = o.size ?? 52, sub = o.sub, w = o.w ?? Math.max(units(text) * size + 70, sub ? [...String(sub)].reduce((a, ch) => a + (/[^\x00-\xff]/.test(ch) ? 1.1 : 0.72), 0) * 22 + 80 : 0), h = o.h ?? size * 1.62 + (sub ? 40 : 0) + 6;
      const dark = o.paper === 'black' || o.paper === 'red';
      const pc = R.piece({ paper: 'white', torn: 'lr', enter: o.at ? 'slap' : 'none', ...o, w, h, kind: 'label', depth: o.depth ?? 'top' });
      tx(pc, null, text, `left:${gx(35)}px;top:${gx(size * 0.12)}px;font:${o.weight ?? 900} ${gx(size)}px/1.1 ${o.font === 'type' ? FONT.type : o.font === 'old' ? FONT.old : FONT.serif};color:${dark ? '#f4efe2' : C0.ink};white-space:nowrap`, 'label');
      if (sub) tx(pc, null, sub, `left:${gx(37)}px;top:${gx(size * 1.6)}px;font:400 ${gx(22)}px/1 ${FONT.type};letter-spacing:.1em;color:${dark ? 'rgba(244,239,226,.75)' : '#5a554c'};white-space:nowrap;text-transform:uppercase`, 'label');
      return pc;
    };
    // a huge character printed straight on the table (or on a poster): it presses in with a little ink spread
    R.big = (text, o = {}) => {
      const size = o.size ?? 300, w = units(text) * size * 1.02, h = size * 1.12;
      const pc = R.piece({ paper: null, torn: '', enter: 'none', ...o, w, h, kind: 'big', depth: o.depth ?? 'top' });
      const e = tx(pc, null, text, `left:0;top:0;font:900 ${gx(size)}px/1.1 ${o.font === 'grot' ? FONT.grot : FONT.serif};color:${colOf(o.color, C0.red)};white-space:nowrap;mix-blend-mode:multiply`, o.kind ?? 'slam', { fact: o.fact });
      const at = pc.at;
      if (at > 0.01) { F.sfx(at + 0.1, 'press', 0.6); F.blur(at, at + 0.2, 6); F.add((t) => { const q = E.quartOut(seg(t, at, at + 0.22)); set(e, { transform: `scale(${(1.14 - 0.14 * q).toFixed(4)})`, filter: q < 1 ? `blur(${((1 - q) * gx(6)).toFixed(2)}px)` : 'none', opacity: cl(q * 3).toFixed(3) }); }); }
      return pc;
    };
    // a rubber stamp: double ruled box, worn ink, slammed down at an angle
    const inkMask = (seed) => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'), r = rnd(seed); c.fillStyle = '#000'; c.fillRect(0, 0, 256, 256); c.globalCompositeOperation = 'destination-out'; for (let k = 0; k < 900; k++) { c.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.7})`; c.beginPath(); c.arc(r() * 256, r() * 256, 0.4 + r() * (r() < 0.06 ? 5 : 1.6), 0, 7); c.fill(); } return cv.toDataURL(); };
    const stamps = [];
    R.stamp = (text, o = {}) => {
      const size = o.size ?? 110, col = o.color ?? C0.red, w = units(text) * size + size * 0.7, h = size * 1.45 + (o.sub ? size * 0.32 : 0);
      const pc = R.piece({ paper: null, torn: '', enter: 'none', rot: o.rot ?? -6, ...o, w, h, kind: 'stamp', depth: 'top' });
      const box = node('div', `position:absolute;inset:0;border:${gx(size * 0.07)}px solid ${col};outline:${gx(size * 0.025)}px solid ${col};outline-offset:-${gx(size * 0.15)}px;box-sizing:border-box;-webkit-mask-image:url(${inkMask(text.length * 37 + size)});-webkit-mask-size:${gx(260)}px;mix-blend-mode:multiply;display:flex;flex-direction:column;align-items:center;justify-content:center`, pc.face);
      tx(pc, box, text, `position:relative;font:900 ${gx(size)}px/1 ${FONT.serif};color:${col};letter-spacing:.06em;white-space:nowrap`, size >= 80 ? 'slam' : 'label', { overlap: true });
      if (o.sub) tx(pc, box, o.sub, `position:relative;margin-top:${gx(size * 0.08)}px;font:700 ${gx(size * 0.2)}px/1 ${FONT.type};color:${col};letter-spacing:.2em;white-space:nowrap`, 'label', { overlap: true });
      const at = pc.at;
      if (at > 0.01) { F.sfx(at + 0.1, 'stamp', 0.7); F.blur(at, at + 0.14, 6); F.add((t) => { const q = E.quartOut(seg(t, at, at + 0.14)); set(box, { transform: `scale(${(1.5 - 0.5 * q).toFixed(4)})`, opacity: cl(q * 2.5).toFixed(3) }); }); }
      stamps.push(pc); F.info('mark', at, pc.until < 1e8 ? pc.until : undefined);
      return pc;
    };
    // a typewriter quote on a torn sheet: dateline, the quote typed on with a block cursor, an attribution, a translation; mark = highlighter sweeps on exact words
    R.type = (o = {}) => {
      const w = o.w ?? 1100, size = o.size ?? 46, cps = o.cps ?? 16, lines = String(o.text ?? '').split('\n'), cpl = Math.max(4, Math.floor((w - 140) / (size * 0.62))), nl = lines.reduce((a, l) => a + Math.max(1, Math.ceil(units(l) / 0.58 / cpl)), 0), trS = o.tr ? (obj(o.tr).size ?? 34) : 0, trL = o.tr ? Math.max(1, Math.ceil((units(obj(o.tr).text) * trS) / (w - 140))) : 0, h = o.h ?? 130 + nl * size * 1.45 + trL * trS * 1.4 + 20 + (o.by ? 50 : 0) + 60;
      const pc = R.piece({ paper: 'white', ...o, w, h, kind: 'type' });
      const at = pc.at, head = o.head;
      if (head) tx(pc, null, head, `left:${gx(70)}px;top:${gx(50)}px;font:400 ${gx(22)}px/1 ${FONT.type};letter-spacing:.12em;color:#6a645a;text-transform:uppercase`, 'label');
      const body = node('div', `position:absolute;left:${gx(70)}px;top:${gx(head ? 110 : 60)}px;width:${gx(w - 140)}px;font:700 ${gx(size)}px/1.45 ${FONT.type};color:${C0.ink};white-space:pre-wrap`, pc.face);
      const full = lines.join('\n'), dur = full.length / cps, tEnd = at + 0.3 + dur;
      // the whole quote is laid out (so the highlight can find its words); characters are shown as they are typed
      const spans = [...full].map((ch) => { const s = node('span', 'opacity:0', body); s.textContent = ch; return s; });
      const cur = node('span', `display:inline-block;width:.6em;height:1.05em;vertical-align:-.15em;background:${C0.ink};margin-left:.04em`, body);
      textOf(pc, body, 'label', full.replace(/\n/g, ' '), { at: at + 0.3 });
      let shown = -1;
      F.add((t) => { const tq = frameT(t), n = Math.floor(cl((tq - at - 0.3) / dur) * spans.length + 1e-6); if (n !== shown) { for (let i = 0; i < spans.length; i++) spans[i].style.opacity = i < n ? '1' : '0'; if (n < spans.length) body.insertBefore(cur, spans[n]); else body.appendChild(cur); shown = n; } set(cur, { opacity: tq < at + 0.2 ? '0' : tq < tEnd + 0.8 || Math.floor(tq * 2.2) % 2 === 0 ? '1' : '0' }); });
      for (let k = 0; k < full.length; k++) if (full[k].trim()) F.sfx(at + 0.3 + k / cps, 'key', 0.22 + 0.06 * ((k * 7) % 3));
      F.sfx(tEnd + 0.05, 'ding', 0.35);
      let y = (head ? 110 : 60) + nl * size * 1.45 + 26;
      const by = o.by ? obj(o.by) : null, tr = o.tr ? obj(o.tr) : null;
      if (by) { tx(pc, null, by.text, `left:${gx(72)}px;top:${gx(y)}px;font:500 ${gx(24)}px/1.3 ${FONT.sans};color:#5f594f`, 'label', { at: by.at ?? tEnd + 0.2 }); const e = pc.face.lastChild; const ba = by.at ?? tEnd + 0.2; F.add((t) => set(e, { opacity: seg(t, ba, ba + 0.4).toFixed(3) })); y += 50; }
      if (tr) { const ta = tr.at ?? tEnd + 0.5, e = tx(pc, null, tr.text, `left:${gx(72)}px;top:${gx(y)}px;width:${gx(w - 140)}px;font:700 ${gx(tr.size ?? 34)}px/1.35 ${FONT.serif};color:${C0.ink}`, 'label', { at: ta }); F.add((t) => set(e, { clipPath: `inset(-10% ${((1 - seg(t, ta, ta + 0.6, E.cubicInOut)) * 100).toFixed(1)}% -10% 0)` })); F.sfx(ta, 'marker', 0.3, { dur: 0.6 }); }
      pc.typedAt = (k) => at + 0.3 + k / cps; pc.typeEnd = tEnd;
      // a highlight on typed words: the characters are separate spans, so the target is the union of their boxes, one per printed line
      pc.find = (text, nth = 0) => {
        let i = -1; for (let k = 0; k <= nth; k++) { i = full.indexOf(text, i + 1); if (i < 0) throw new Error(M(`collage：打字稿里找不到 "${text}"`, `collage: "${text}" is not in the typed text`)); }
        const sp = spans.slice(i, i + text.length).filter((x) => x.textContent.trim());
        const lines2 = () => { const by = new Map(); for (const x of sp) { const b = localBox(pc, x); const k = Math.round(b.y); (by.get(k) || by.set(k, []).get(k)).push(b); } return [...by.values()].map((bs) => { const x1 = Math.min(...bs.map((b) => b.x)), y1 = Math.min(...bs.map((b) => b.y)); return { x: x1, y: y1, w: Math.max(...bs.map((b) => b.x + b.w)) - x1, h: Math.max(...bs.map((b) => b.y + b.h)) - y1 }; }); };
        const tg = target(pc, body); tg.box = () => { const L2 = lines2(); const x1 = Math.min(...L2.map((b) => b.x)), y1 = Math.min(...L2.map((b) => b.y)); return { x: x1, y: y1, w: Math.max(...L2.map((b) => b.x + b.w)) - x1, h: Math.max(...L2.map((b) => b.y + b.h)) - y1 }; };
        tg.lines = () => lines2().map((b) => { const t2 = target(pc, body); t2.box = () => b; return t2; });
        tg.typedAt = pc.typedAt(i + text.length);
        return tg;
      };
      for (const mk of o.mark || []) { const tg = pc.find(mk.text, mk.nth ?? 0); F.prep(() => { tg.lines().forEach((ln, j) => R.mark(ln, { at: (mk.at ?? tEnd + 0.3) + j * 0.35, color: mk.color })); }); }
      F.info('quote', at, pc.until < 1e8 ? pc.until : undefined);
      return pc;
    };
    // a handwritten red note on the table, written left to right
    R.note = (text, o = {}) => {
      const size = o.size ?? 40, w = units(text) * size * 1.05 + 10, h = size * 1.4;
      const pc = R.piece({ paper: null, torn: '', enter: 'none', rot: o.rot ?? -3, ...o, w, h, kind: 'note', depth: 'top' });
      const e = tx(pc, null, text, `left:0;top:0;font:700 ${gx(size)}px/1.3 ${FONT.serif};color:${colOf(o.color, C0.red)};white-space:nowrap`, 'label');
      const at = pc.at, dur = Math.min(1, 0.25 + units(text) * 0.06);
      if (at > 0.01) { F.sfx(at, 'marker', 0.35, { dur }); F.add((t) => set(e, { clipPath: `inset(-20% ${((1 - seg(t, at, at + dur, E.sine)) * 100).toFixed(1)}% -20% -2%)` })); }
      return pc;
    };

    // ---------- marks on exact words (any piece) ----------
    const overlayFor = (tg, css, z = 0) => { const b = tg.box(), e = el('div', `left:${gx(b.x)}px;top:${gx(b.y)}px;width:${gx(b.w)}px;height:${gx(b.h)}px;pointer-events:none;${css}`, tg.piece.el); e.style.zIndex = z; return e; };
    R.mark = (tg, o = {}) => {
      const at = o.at ?? 0, dur = o.dur ?? 0.45;
      F.prep(() => { const e = overlayFor(tg, `background:${o.color ?? C0.mark};mix-blend-mode:multiply;transform:skewX(-8deg) scaleY(.82);border-radius:${gx(4)}px`, 20); F.add((t) => set(e, { clipPath: `inset(0 ${((1 - seg(t, at, at + dur, E.cubicInOut)) * 100).toFixed(1)}% 0 0)`, opacity: o.until != null && t >= o.until ? '0' : '1' })); });
      F.sfx(at, 'marker', 0.42, { dur }); F.info('annotate', at, o.until);
      return tg;
    };
    R.redact = (tg, o = {}) => {
      const at = o.at ?? 0, dur = o.dur ?? 0.35;
      F.prep(() => { const e = overlayFor(tg, `background:#141210;transform:scaleY(1.05) rotate(${(o.rot ?? -0.6)}deg);border-radius:${gx(3)}px`, 25); F.add((t) => set(e, { clipPath: `inset(-5% ${((1 - seg(t, at, at + dur, E.quartOut)) * 100).toFixed(1)}% -5% 0)` })); });
      F.sfx(at, 'marker', 0.45, { dur }); F.info('annotate', at, o.until);
      return tg;
    };
    const markerPath = (tg, o, mk) => {
      const at = o.at ?? 0, dur = o.dur ?? 0.5;
      F.prep(() => {
        const b = tg.box(), pad = o.pad ?? 0.35, s = svgEl('svg', { width: gx(b.w * (1 + pad * 2)), height: gx(b.h * (1 + pad * 2)), style: `position:absolute;left:${gx(b.x - b.w * pad)}px;top:${gx(b.y - b.h * pad)}px;overflow:visible;pointer-events:none;z-index:26` }, tg.piece.el);
        const pth = svgEl('path', { d: mk(gx(b.w * (1 + pad * 2)), gx(b.h * (1 + pad * 2)), gx(b.w), gx(b.h), gx(b.w * pad), gx(b.h * pad)), fill: 'none', stroke: o.color ?? C0.red, 'stroke-width': gx(o.width ?? 5), 'stroke-linecap': 'round', opacity: 0.88 }, s);
        const L = pth.getTotalLength(); pth.setAttribute('stroke-dasharray', L);
        F.add((t) => pth.setAttribute('stroke-dashoffset', (L * (1 - seg(t, at, at + dur, E.cubicInOut))).toFixed(1)));
      });
      F.sfx(at, 'marker', 0.4, { dur }); F.info('annotate', at, o.until);
      return tg;
    };
    R.ring = (tg, o = {}) => markerPath(tg, o, (W2, H2) => { const cx = W2 / 2, cy = H2 / 2, rx = W2 / 2 * 0.95, ry = H2 / 2 * 0.9; let d = ''; for (let i = 0; i <= 40; i++) { const a = -0.6 + (i / 40) * Math.PI * 2.15, k = 1 + 0.04 * Math.sin(i * 0.7); d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rx * k).toFixed(1)},${(cy + Math.sin(a) * ry * k).toFixed(1)}`; } return d; });
    R.strike = (tg, o = {}) => markerPath(tg, { pad: 0.08, ...o }, (W2, H2) => `M${W2 * 0.02},${H2 * 0.55} L${W2 * 0.98},${H2 * 0.48}`);
    R.underline = (tg, o = {}) => markerPath(tg, { pad: 0.1, ...o }, (W2, H2) => `M${W2 * 0.02},${H2 * 0.96} Q${W2 * 0.5},${H2 * 1.02} ${W2 * 0.98},${H2 * 0.93}`);

    // ---------- information told with paper props ----------
    // paper dolls: a chain-cut grid of figures; rows unfold one by one, then `hot` of them turn red (a share told in people)
    const DOLL = 'M50 4a11 11 0 1 1 0 22a11 11 0 1 1 0-22zM34 30h32l18 22-7 6-13-13v18l11 36h-12l-9-28-9 28H33l11-36V45L31 58l-7-6z';
    R.dolls = (o = {}) => {
      const cols = o.cols ?? 20, n = o.n ?? 100, rows = Math.ceil(n / cols), s = o.size ?? 44, gap = o.gap ?? 4, w = cols * (s + gap), h = rows * (s * 1.25 + gap);
      const pc = R.piece({ paper: null, torn: '', enter: 'none', rot: o.rot ?? 0, ...o, w, h, kind: 'dolls' });
      const at = pc.at, rowDur = o.rowDur ?? 0.16, hot = o.hot ?? 0, hotN = hot < 1 ? Math.round(hot * n) : hot, hotAt = o.hotAt ?? at + rows * rowDur + 0.6, hotDur = o.hotDur ?? 1.2;
      const svg = svgEl('svg', { width: gx(w), height: gx(h), viewBox: `0 0 ${w} ${h}`, style: `position:absolute;left:0;top:0;overflow:visible;filter:drop-shadow(0 ${gx(1.5)}px ${gx(1.5)}px rgba(50,30,10,.35))` }, pc.face);
      const defs = svgEl('defs', {}, svg); svgEl('path', { id: `doll${seeds.n}`, d: DOLL }, defs);
      const order = Array.from({ length: n }, (_, i) => i); const rr = rnd(o.seed ?? 5); if (o.shuffle) for (let i = n - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      const hotSet = new Map(order.slice(0, hotN).map((idx, k) => [idx, hotAt + (k / Math.max(1, hotN)) * hotDur]));
      const rowsG = [];
      for (let rI = 0; rI < rows; rI++) {
        const gr = svgEl('g', {}, svg); rowsG.push(gr);
        for (let c = 0; c < cols && rI * cols + c < n; c++) { const i = rI * cols + c; const u = svgEl('use', { href: `#doll${seeds.n}`, transform: `translate(${c * (s + gap)},${rI * (s * 1.25 + gap)}) scale(${s / 100},${(s * 1.2) / 100})`, fill: o.color ?? '#f3ede0', stroke: 'rgba(90,70,40,.35)', 'stroke-width': 1.2 }, gr); u._hot = hotSet.get(i); u._i = i; }
      }
      const uses = [...svg.querySelectorAll('use')];
      F.add((t) => {
        rowsG.forEach((gr, rI) => { const q = seg(t, at + rI * rowDur, at + rI * rowDur + 0.35, E.cubicInOut); gr.setAttribute('clip-path', ''); gr.style.clipPath = `inset(-10% ${((1 - q) * 105).toFixed(1)}% -10% -2%)`; });
        for (const u of uses) if (u._hot != null) { const q = seg(t, u._hot, u._hot + 0.25); u.setAttribute('fill', q > 0 ? mixHex(o.color ?? '#f3ede0', o.hotColor ?? C0.red, q) : o.color ?? '#f3ede0'); }
      });
      for (let rI = 0; rI < rows; rI++) F.sfx(at + rI * rowDur, 'snip', 0.25);
      if (hotN) F.sfx(hotAt, 'ink', 0.45, { dur: hotDur });
      F.info('chart', at, pc.until < 1e8 ? pc.until : undefined);
      pc.hotAt = hotAt; pc.hotEnd = hotAt + hotDur;
      return pc;
    };
    const mixHex = (a, b, q) => { const x = hexRgb(a), y = hexRgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * q)).join(',')})`; };
    // a plan / form: a grid of cells inked in (seats, days, slots) with a title; marks fill, cross or stamp single cells
    R.plan = (o = {}) => {
      const cols = o.cols ?? 6, rows = o.rows ?? 6, cw = o.cell?.w ?? 90, ch = o.cell?.h ?? 46, gp = o.cell?.gap ?? 26, top = o.title ? 170 : 60, left = 90;
      const w = o.w ?? left * 2 + cols * cw + (cols - 1) * gp, h = o.h ?? top + rows * (ch + gp + (o.chair === false ? 0 : 22)) + 60;
      const pc = R.piece({ paper: 'graph', tape: ['tl', 'tr'], ...o, w, h, kind: 'plan' });
      if (o.title) tx(pc, null, o.title, `left:${gx(left)}px;top:${gx(50)}px;font:700 ${gx(40)}px/1 ${FONT.type};letter-spacing:.06em;color:${C0.ink}`, 'label');
      if (o.sub) tx(pc, null, o.sub, `left:${gx(left)}px;top:${gx(102)}px;font:500 ${gx(24)}px/1 ${FONT.sans};color:#5a554c`, 'label');
      const svg = svgEl('svg', { width: gx(w), height: gx(h), viewBox: `0 0 ${w} ${h}`, style: 'position:absolute;left:0;top:0;overflow:visible' }, pc.face);
      const at = pc.at + 0.3, cells = [];
      for (let rI = 0; rI < rows; rI++) for (let c = 0; c < cols; c++) {
        const i = rI * cols + c, x = left + c * (cw + gp), y = top + rI * (ch + gp + (o.chair === false ? 0 : 22)), d0 = at + (i / (rows * cols)) * (o.drawDur ?? 1.4);
        const rc = svgEl('rect', { x, y, width: cw, height: ch, fill: '#fbf8f0', stroke: C0.ink, 'stroke-width': 2.4, 'stroke-dasharray': 2 * (cw + ch), 'stroke-dashoffset': 2 * (cw + ch) }, svg);
        const ci = o.chair === false ? null : svgEl('circle', { cx: x + cw / 2, cy: y + ch + 14, r: 8, fill: 'none', stroke: C0.ink, 'stroke-width': 2, opacity: 0 }, svg);
        cells.push({ rc, ci, x, y, d0 });
      }
      F.add((t) => { for (const c of cells) { const q = seg(t, c.d0, c.d0 + 0.3); c.rc.setAttribute('stroke-dashoffset', ((1 - q) * 2 * (cw + ch)).toFixed(1)); if (c.ci) c.ci.setAttribute('opacity', q.toFixed(2)); } });
      F.sfx(at, 'pencil', 0.35, { dur: o.drawDur ?? 1.4 });
      for (const mk of o.marks || []) for (const i of [].concat(mk.cells ?? mk.i)) {
        const c = cells[i]; if (!c) continue; const ma = mk.at ?? at + 2;
        if (mk.mark === 'cross') { const p = svgEl('path', { d: `M${c.x + 8},${c.y + 6}L${c.x + cw - 8},${c.y + ch - 6}M${c.x + cw - 8},${c.y + 6}L${c.x + 8},${c.y + ch - 6}`, stroke: mk.color ?? C0.red, 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none', opacity: 0 }, svg); F.add((t) => p.setAttribute('opacity', seg(t, ma, ma + 0.15).toFixed(2))); }
        else { const f = svgEl('rect', { x: c.x + 3, y: c.y + 3, width: cw - 6, height: ch - 6, fill: mk.color ?? C0.red, opacity: 0 }, svg); F.add((t) => f.setAttribute('opacity', (0.85 * seg(t, ma, ma + 0.2)).toFixed(2))); }
        F.sfx(ma, 'marker', 0.25);
      }
      pc.cell = (i) => { const c = cells[i]; return { piece: pc, box: () => ({ x: c.x, y: c.y, w: cw, h: ch }), wbox() { return target(pc, pc.face).wbox.call({ box: () => ({ x: c.x, y: c.y, w: cw, h: ch }) }); } }; };
      F.info('diagram', pc.at, pc.until < 1e8 ? pc.until : undefined);
      return pc;
    };
    // a timeline: a red thread pinned across the table, a typed year ticket at each pin, a label strip and optionally a photo above / below
    R.timeline = (o = {}) => {
      const x0 = o.x ?? 0, y0 = o.y ?? 500, w = o.w ?? 3000, ev = o.events || [], at = o.at ?? 0, color = o.color ?? C0.red;
      const span = (o.to ?? Math.max(...ev.map((e) => e.year))) - (o.from ?? Math.min(...ev.map((e) => e.year)));
      const xOf = (yr, i) => (o.scale !== 'time' ? x0 + 120 + (i / Math.max(1, ev.length - 1)) * (w - 240) : x0 + 120 + ((yr - (o.from ?? ev[0].year)) / Math.max(1, span)) * (w - 240));
      const pts = ev.map((e, i) => [xOf(e.year, i), y0 + (e.dy ?? 0)]);
      const thread = R.piece({ x: x0, y: y0 - 60, w, h: 160, paper: null, torn: '', at: 0, enter: 'none', rot: 0, kind: 'thread', z: o.z ?? 1500 });
      const svg = svgEl('svg', { width: gx(w), height: gx(160), viewBox: `${x0} ${y0 - 60} ${w} 160`, style: 'position:absolute;left:0;top:0;overflow:visible' }, thread.face);
      let d = `M${x0},${y0 + 8}`; const all = [[x0, y0 + 8], ...pts, [x0 + w, y0 + 8]];
      for (let i = 1; i < all.length; i++) { const [ax, ay] = all[i - 1], [bx, by] = all[i]; d += ` Q${(ax + bx) / 2},${(ay + by) / 2 + Math.min(40, (bx - ax) * 0.03)} ${bx},${by}`; }
      const sh = svgEl('path', { d, fill: 'none', stroke: 'rgba(40,20,10,.25)', 'stroke-width': 5, transform: 'translate(3,7)' }, svg);
      const th = svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, svg);
      const ends = ev.map((e) => e.at ?? at);
      F.prep(() => {
        const L = th.getTotalLength(); for (const p of [th, sh]) p.setAttribute('stroke-dasharray', L);
        // the thread reaches each pin at that event's time: length along the path to each pin
        const lens = pts.map(([px]) => { let lo = 0, hi = L; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (th.getPointAtLength(m).x < px) lo = m; else hi = m; } return lo; });
        const segs = [[at - 0.6, 0], ...ends.map((t2, i) => [t2, lens[i]]), [Math.max(...ends) + 1.2, L]];
        F.add((t) => { let len = 0; for (let i = 1; i < segs.length; i++) { const [ta, la] = segs[i - 1], [tb, lb] = segs[i]; if (t >= ta) len = mix(la, lb, seg(t, ta, Math.max(ta + 0.01, tb), E.sine)); } for (const p of [th, sh]) p.setAttribute('stroke-dashoffset', (L - len).toFixed(1)); });
      });
      F.sfx(at - 0.6, 'string', 0.3, { dur: 0.8 });
      const out = ev.map((e, i) => {
        const [px, py] = pts[i], ta = ends[i], up = e.side ? e.side === 'up' : i % 2 === 0;
        const pin = R.piece({ x: px - 14, y: py - 14, w: 28, h: 28, paper: null, torn: '', at: ta, enter: 'slap', rot: 0, kind: 'pin', z: 1600 });
        node('div', `position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 35% 30%, #ff9c92 0%, ${C0.red} 45%, #64110f 100%);box-shadow:${gx(4)}px ${gx(6)}px ${gx(5)}px rgba(40,20,10,.45)`, pin.face);
        const ty = R.piece({ x: px - 110, y: up ? py + 40 : py - 170, w: 220, h: 110, paper: 'white', at: ta + 0.1, enter: 'drop', rot: (i % 2 ? 4 : -5), kind: 'ticket', torn: 'tb' });
        tx(ty, null, String(e.label ?? e.year), `left:0;right:0;top:${gx(18)}px;text-align:center;font:400 ${gx(64)}px/1 ${FONT.old};color:${C0.ink}`, 'label', { fact: e.fact ?? true });
        let ph = null, lb = null;
        if (e.photo) ph = R.photo(e.photo, { capSize: e.capSize, x: px - (e.pw ?? 460) / 2 + (e.px ?? 0), y: up ? py - 70 - (e.ph ?? 340) - (e.caption ? 120 : 0) : py + 170, w: e.pw ?? 460, h: e.ph ?? 340, caption: e.caption, at: ta + 0.25, enter: 'drop', rot: e.rot ?? (i % 2 ? 3 : -3), tape: e.tape ?? ['t'], credit: e.credit, cell: e.cell });
        else if (e.text) lb = R.label(e.text, { x: px - 30, y: up ? py - 150 : py + 170, size: e.size ?? 48, sub: e.en, at: ta + 0.25, rot: (i % 2 ? 2 : -2) });
        F.info('timeline', ta, o.until);
        return { x: px, y: py, at: ta, pin, ticket: ty, photo: ph, label: lb, piece: ty, wbox: () => { const bs = [ty, ph, lb].filter(Boolean).map((p) => p.wbox()); const x1 = Math.min(...bs.map((b) => b.x)), y1 = Math.min(...bs.map((b) => b.y)); return { x: x1, y: y1, w: Math.max(...bs.map((b) => b.x + b.w)) - x1, h: Math.max(...bs.map((b) => b.y + b.h)) - y1 }; } };
      });
      return { events: out, thread, ev: (i) => out[i], view: (i, pad = 1.25) => ({ on: out[i], pad }) };
    };
    // an index card: optional photo, a name in heavy serif, a typed line, real lines of copy; redact: black marker bars over exact words
    R.card = (o = {}) => {
      const w = o.w ?? 420, ph = o.photo ? o.ph ?? w * 0.8 : 0, lines = o.lines || [], h = o.h ?? 70 + ph + (o.title ? (o.titleSize ?? 46) * 1.5 : 0) + (o.sub ? 40 : 0) + lines.reduce((a, l) => a + ((l && l.size) || 26) * 1.5, 0) + 40;
      const pc = R.piece({ paper: 'white', torn: o.torn ?? '', tape: o.tape ?? ['t'], ...o, w, h, kind: 'card' });
      if (o.photo) { const pic = picture(o.photo, gx(w - 60) * 1.5, gx(ph) * 1.5, { halftone: o.halftone ?? true, cell: o.cell, pos: o.pos }); const hd = node('div', `position:absolute;left:${gx(30)}px;top:${gx(30)}px;width:${gx(w - 60)}px;height:${gx(ph)}px;overflow:hidden`, pc.face); hd.appendChild(pic.cv); pic.cv.style.cssText = 'width:100%;height:100%;display:block'; if (pic.credit) credits.push({ piece: pc, text: o.credit ?? `${pic.credit.author || pic.credit.title}${pic.credit.licence ? ' / ' + pic.credit.licence : ''}` }); }
      let y = 40 + ph + (o.photo ? 20 : 10);
      if (o.title) { tx(pc, null, o.title, `left:${gx(30)}px;top:${gx(y)}px;width:${gx(w - 60)}px;font:900 ${gx(o.titleSize ?? 46)}px/1.15 ${FONT.serif};color:${C0.ink}`, 'label'); y += (o.titleSize ?? 46) * 1.5; }
      if (o.sub) { tx(pc, null, o.sub, `left:${gx(32)}px;top:${gx(y)}px;font:400 ${gx(20)}px/1 ${FONT.type};letter-spacing:.1em;color:#6a645a;text-transform:uppercase`, 'label'); y += 40; }
      for (const ln of lines) { const s = typeof ln === 'string' ? { text: ln } : ln; tx(pc, null, s.text, `left:${gx(32)}px;top:${gx(y)}px;width:${gx(w - 64)}px;font:${s.bold ? 700 : 500} ${gx(s.size ?? 26)}px/1.3 ${FONT.sans};color:${s.color === 'red' ? C0.red : '#3b3731'}`, 'label'); y += (s.size ?? 26) * 1.5; }
      for (const r2 of o.redact || []) R.redact(pc.find(r2.text, r2.nth ?? 0), { at: r2.at });
      F.info('card', pc.at, pc.until < 1e8 ? pc.until : undefined);
      return pc;
    };
    // bars on notebook paper: each value a strip of coloured paper laid from the margin, the value typed at its end; brace = a red bracket between two bars with a note
    R.bars = (o = {}) => {
      const rows = o.rows || [], bw = o.barW ?? 900, rh = o.rowH ?? 92, top = o.title ? 170 : 70, w = o.w ?? 230 + bw + 260, h = o.h ?? top + rows.length * rh + 90;
      const pc = R.piece({ paper: 'note', ...o, w, h, kind: 'bars' });
      if (o.title) tx(pc, null, o.title, `left:${gx(130)}px;top:${gx(50)}px;font:700 ${gx(36)}px/1 ${FONT.type};letter-spacing:.05em;color:${C0.ink}`, 'label');
      if (o.sub) tx(pc, null, o.sub, `left:${gx(130)}px;top:${gx(100)}px;font:500 ${gx(24)}px/1 ${FONT.sans};color:#5a554c`, 'label');
      const max = o.max ?? Math.max(...rows.map((r2) => Math.abs(r2.value))), x0 = 230, out = [];
      rows.forEach((r2, i) => {
        const y = top + i * rh, len = (Math.abs(r2.value) / max) * bw, ra = r2.at ?? pc.at + 0.4 + i * 0.5;
        tx(pc, null, r2.label, `right:${gx(w - x0 + 20)}px;top:${gx(y + rh * 0.5 * 0.5 + 8 - (o.labelSize ?? 34) * 0.5)}px;font:900 ${gx(o.labelSize ?? 34)}px/1 ${FONT.serif};color:${C0.ink};text-align:right;white-space:nowrap`, 'label');
        const bar = node('div', `position:absolute;left:${gx(x0)}px;top:${gx(y + 8)}px;width:${gx(len)}px;height:${gx(rh * 0.5)}px;${paperCss(r2.color === 'black' ? 'black' : r2.color ?? 'green')};box-shadow:0 ${gx(2)}px ${gx(3)}px rgba(40,25,10,.3)`, pc.face);
        bar.style.clipPath = 'inset(0 100% 0 0)';
        const val = r2.text ?? `${o.prefix ?? ''}${r2.value}${o.unit ?? ''}`, ve = tx(pc, null, val, `left:${gx(x0 + len + 18)}px;top:${gx(y + rh * 0.25 + 8 - (o.valueSize ?? 36) * 0.6)}px;font:700 ${gx(o.valueSize ?? 36)}px/1.2 ${FONT.type};color:${C0.ink};white-space:nowrap`, 'label', { at: ra + 0.4 });
        if (r2.en) tx(pc, null, r2.en, `left:${gx(x0 + 4)}px;top:${gx(y - 18)}px;font:400 ${gx(15)}px/1 ${FONT.type};letter-spacing:.14em;color:#6f695e;text-transform:uppercase`, 'label', { fact: false });
        F.add((t) => { set(bar, { clipPath: `inset(0 ${((1 - seg(t, ra, ra + 0.5, E.cubicInOut)) * 100).toFixed(1)}% 0 0)` }); set(ve, { opacity: seg(t, ra + 0.4, ra + 0.6).toFixed(3) }); });
        F.sfx(ra, 'slide', 0.3, { dur: 0.5 });
        out.push({ y, len, at: ra });
      });
      if (o.brace) {
        const [i, j] = o.brace.rows, a = out[i], b = out[j], bx = x0 + Math.max(a.len, b.len) + 12, ya = a.y + rh * 0.33, yb = b.y + rh * 0.33, ba = o.brace.at ?? Math.max(a.at, b.at) + 0.9;
        const s = svgEl('svg', { width: gx(w), height: gx(h), viewBox: `0 0 ${w} ${h}`, style: 'position:absolute;left:0;top:0;overflow:visible;z-index:5' }, pc.face);
        const p = svgEl('path', { d: `M${x0 + Math.min(a.len, b.len)},${yb + rh * 0.3} L${x0 + Math.min(a.len, b.len)},${yb + rh * 0.62} M${x0 + Math.min(a.len, b.len)},${yb + rh * 0.5} L${x0 + Math.max(a.len, b.len)},${yb + rh * 0.5} M${x0 + Math.max(a.len, b.len)},${yb + rh * 0.3} L${x0 + Math.max(a.len, b.len)},${yb + rh * 0.62}`, stroke: C0.red, 'stroke-width': 3, fill: 'none', 'stroke-dasharray': '6 5', opacity: 0 }, s);
        F.add((t) => p.setAttribute('opacity', seg(t, ba, ba + 0.3).toFixed(2)));
        R.note(o.brace.text, { x: pc.x + x0 + (a.len + b.len) / 2 - 20, y: pc.y + yb + rh * 0.66, at: ba + 0.2, size: o.brace.size ?? 36, z: pc.z + 1 });
        void bx; void ya;
      }
      F.info('chart', pc.at, pc.until < 1e8 ? pc.until : undefined);
      return pc;
    };
    // a wooden ladder of ranks (ratings, levels): items (stickers: a country cut-out or a tag) slide to their rung; item.to(at, rung) moves one later
    R.ladder = (o = {}) => {
      const rungs = o.rungs || [], rg = o.rungH ?? 78, w = o.w ?? 760, h = o.h ?? (o.title ? 180 : 60) + rungs.length * rg + 60, top = o.title ? 180 : 60;
      const pc = R.piece({ paper: null, torn: '', ...o, w, h, kind: 'ladder', enter: o.enter ?? 'none' });
      if (o.title) tx(pc, null, o.title, `left:0;top:0;font:900 ${gx(64)}px/1.1 ${FONT.serif};color:${C0.ink}`, 'label');
      if (o.sub) tx(pc, null, o.sub, `left:${gx(4)}px;top:${gx(100)}px;font:400 ${gx(22)}px/1 ${FONT.type};letter-spacing:.12em;color:#5a554c;text-transform:uppercase`, 'label');
      const lx = 230, rx = 520, svg = svgEl('svg', { width: gx(w), height: gx(h), viewBox: `0 0 ${w} ${h}`, style: 'position:absolute;left:0;top:0;overflow:visible;filter:drop-shadow(3px 6px 4px rgba(40,25,10,.35))' }, pc.face);
      const wood = '#6b4a2e', at = pc.at;
      const rails = [svgEl('line', { x1: lx + 12, y1: top - 30, x2: lx - 12, y2: top + rungs.length * rg + 20, stroke: wood, 'stroke-width': 9, 'stroke-linecap': 'round' }, svg), svgEl('line', { x1: rx + 18, y1: top - 20, x2: rx - 6, y2: top + rungs.length * rg + 30, stroke: wood, 'stroke-width': 9, 'stroke-linecap': 'round' }, svg)];
      const ry = (i) => top + i * rg + 20;
      const rungEls = rungs.map((r2, i) => { const y = ry(i); const ln = svgEl('line', { x1: lx + 12 - (24 * (y - top + 30)) / (rungs.length * rg + 50), y1: y, x2: rx + 18 - (24 * (y - top + 20)) / (rungs.length * rg + 50), y2: y + 8, stroke: wood, 'stroke-width': 6, 'stroke-linecap': 'round' }, svg); const lb = tx(pc, null, r2, `right:${gx(w - lx + 30)}px;top:${gx(y - 18)}px;font:700 ${gx(30)}px/1 ${FONT.type};color:${C0.ink};text-align:right`, 'label', { fact: false }); return { ln, lb }; });
      F.add((t) => { rails.forEach((r2) => r2.setAttribute('opacity', seg(t, at, at + 0.3).toFixed(2))); rungEls.forEach((r2, i) => { const q = seg(t, at + 0.1 + i * 0.05, at + 0.3 + i * 0.05).toFixed(2); r2.ln.setAttribute('opacity', q); set(r2.lb, { opacity: q }); }); });
      F.sfx(at, 'wood', 0.4);
      const items = (o.items || []).map((it, k) => {
        const ia = it.at ?? at + 0.8 + k * 0.6, hgt = it.size ?? 120, ix = it.x ?? (lx + rx) / 2 - hgt / 2 + (k % 2 ? 40 : -40);
        const st = it.country ? R.country(it.country, { x: pc.x + ix, y: pc.y + ry(it.rung) - hgt * 0.75, w: hgt, h: hgt, color: it.color, at: ia, enter: 'slap', z: pc.z + 10 }) : R.label(it.text ?? '', { x: pc.x + ix, y: pc.y + ry(it.rung) - 50, size: 36, at: ia, z: pc.z + 10 });
        const lab = it.label ? R.note(it.label, { x: pc.x + rx + 70, y: pc.y + ry(it.rung) - 28, color: it.color ?? C0.ink, size: it.labelSize ?? 40, at: ia + 0.3, rot: -2 }) : null;
        const moves = [];
        const item = { sticker: st, label: lab, to: (t2, rung, o2 = {}) => { moves.push({ t: t2, dy: ry(rung) - ry(it.rung), dur: o2.dur ?? 0.8 }); F.sfx(t2, 'slide', 0.4, { dur: o2.dur ?? 0.8 }); F.info('rank', t2, o.until); return item; } };
        F.add((t) => { let dy = 0; for (const m of moves) dy = mix(dy, m.dy, seg(t, m.t, m.t + m.dur, E.cubicInOut)); st.y = pc.y + ry(it.rung) - hgt * 0.75 + dy; if (st._wb) st._wb = st.wbox(); if (lab) { lab.y = pc.y + ry(it.rung) - 28 + dy; lab._wb = lab.wbox(); } });
        return item;
      });
      F.info('rank', at, pc.until < 1e8 ? pc.until : undefined);
      pc.items = items; pc.rungY = (i) => pc.y + ry(i);
      return pc;
    };
    // a cardboard podium 1 / 2 / 3 with stickers dropped on top
    R.podium = (o = {}) => {
      const places = o.places || [], bw = o.blockW ?? 260, hs = [220, 160, 120], order = [1, 0, 2], w = bw * 3 + 60, h = 420;
      const pc = R.piece({ paper: null, torn: '', ...o, w, h, kind: 'podium', enter: o.enter ?? 'none' });
      const at = pc.at;
      order.forEach((rank, k) => {
        const bh = hs[rank], x = k * (bw + 30), y = h - bh;
        const b = node('div', `position:absolute;left:${gx(x)}px;top:${gx(y)}px;width:${gx(bw)}px;height:${gx(bh)}px;${paperCss('kraft')};box-shadow:${gx(4)}px ${gx(6)}px ${gx(6)}px rgba(40,25,10,.35);opacity:0`, pc.face);
        tx(pc, b, ['1', '2', '3'][rank], `left:0;right:0;top:${gx(bh * 0.22)}px;text-align:center;font:400 ${gx(70)}px/1 ${FONT.old};color:#3a2a18`, 'label', { fact: false });
        const ba = at + 0.15 * k; F.add((t) => set(b, { opacity: seg(t, ba, ba + 0.25).toFixed(3), transform: `translateY(${((1 - seg(t, ba, ba + 0.3, E.quartOut)) * gx(30)).toFixed(1)}px)` }));
        const p = places.find((p2) => p2.rank === rank + 1);
        if (p) {
          const pa = p.at ?? at + 0.8 + rank * 0.5, sz = p.size ?? 150;
          if (p.country) R.country(p.country, { x: pc.x + x + bw / 2 - sz / 2, y: pc.y + y - sz * 0.92, w: sz, h: sz, color: p.color, at: pa, enter: 'slap', z: pc.z + 5 });
          if (p.label) tx(pc, null, p.label, `left:${gx(x)}px;width:${gx(bw)}px;top:${gx(h + 16)}px;text-align:center;font:900 ${gx(36)}px/1 ${FONT.serif};color:${C0.ink}`, 'label', { at: pa });
        }
      });
      F.sfx(at, 'paper', 0.4);
      F.info('rank', at, pc.until < 1e8 ? pc.until : undefined);
      return pc;
    };
    // a line chart on graph paper: axes, ticks, series drawn on with a flag / pin riding each tip; notes, a highlighter band, a shaded gap between two series
    R.chart = (o = {}) => {
      const w = o.w ?? 1500, h = o.h ?? 900, pad = { l: 120, r: o.padR ?? 200, t: o.title ? 110 + (o.titleSize ?? 48) * 1.5 : 60, b: 90 };
      const pc = R.piece({ paper: 'graph', torn: o.torn ?? 'tb', ...o, w, h, kind: 'chart' });
      const ts = o.titleSize ?? 48;
      if (o.title) tx(pc, null, o.title, `left:${gx(pad.l - 20)}px;top:${gx(40)}px;font:900 ${gx(ts)}px/1 ${FONT.serif};color:${C0.ink}`, 'label');
      if (o.sub) tx(pc, null, o.sub, `left:${gx(pad.l - 18)}px;top:${gx(40 + ts * 1.5)}px;font:400 ${gx(20)}px/1 ${FONT.type};letter-spacing:.1em;color:#5a554c;text-transform:uppercase`, 'label');
      const X = o.xAxis ?? {}, Y = o.yAxis ?? {}, xs = (o.series || []).flatMap((s) => s.values.map((v, i) => (Array.isArray(v) ? v[0] : (X.from ?? 0) + i * (X.step ?? 1))));
      const x0v = X.from ?? Math.min(...xs), x1v = X.to ?? Math.max(...xs), ys = (o.series || []).flatMap((s) => s.values.map((v) => (Array.isArray(v) ? v[1] : v)));
      const y0v = Y.min ?? Math.min(0, ...ys), y1v = Y.max ?? Math.max(...ys) * 1.08;
      const px = (xv) => pad.l + ((xv - x0v) / (x1v - x0v)) * (w - pad.l - pad.r), py = (yv) => h - pad.b - ((yv - y0v) / (y1v - y0v)) * (h - pad.t - pad.b);
      const svg = svgEl('svg', { width: gx(w), height: gx(h), viewBox: `0 0 ${w} ${h}`, style: 'position:absolute;left:0;top:0;overflow:visible' }, pc.face);
      const at = pc.at + 0.3, dur = o.dur ?? 2.2;
      const axes = svgEl('path', { d: `M${pad.l},${pad.t - 20} L${pad.l},${h - pad.b} L${w - pad.r + 40},${h - pad.b}`, stroke: C0.ink, 'stroke-width': 2.5, fill: 'none' }, svg);
      void axes;
      for (const tk of X.ticks || []) { const tv = typeof tk === 'object' ? tk.v : tk, lb = typeof tk === 'object' ? tk.label : String(tk); svgEl('line', { x1: px(tv), y1: h - pad.b, x2: px(tv), y2: h - pad.b + 10, stroke: C0.ink, 'stroke-width': 2 }, svg); tx(pc, null, lb, `left:${gx(px(tv) - 60)}px;width:${gx(120)}px;text-align:center;top:${gx(h - pad.b + 18)}px;font:500 ${gx(22)}px/1 ${FONT.mono};color:#3d3a34`, 'label', { fact: false }); }
      for (const tk of Y.ticks || []) { const tv = typeof tk === 'object' ? tk.v : tk, lb = typeof tk === 'object' ? tk.label : `${tk}${Y.unit ?? ''}`; svgEl('line', { x1: pad.l - 10, y1: py(tv), x2: pad.l, y2: py(tv), stroke: C0.ink, 'stroke-width': 2 }, svg); tx(pc, null, lb, `right:${gx(w - pad.l + 18)}px;top:${gx(py(tv) - 12)}px;font:500 ${gx(22)}px/1 ${FONT.mono};color:#3d3a34;white-space:nowrap`, 'label', { fact: false }); }
      const under = svgEl('g', {}, svg), lines = svgEl('g', {}, svg), over = svgEl('g', {}, svg);
      const series = (o.series || []).map((s, si) => {
        const pts = s.values.map((v, i) => (Array.isArray(v) ? [px(v[0]), py(v[1])] : [px((X.from ?? 0) + i * (X.step ?? 1)), py(v)]));
        const col = colOf(s.color, C0.ink);
        const p = svgEl('path', { d: 'M' + pts.map((q) => q.map((v) => v.toFixed(1)).join(',')).join('L'), stroke: col, 'stroke-width': s.width ?? 4, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, lines);
        const sa = s.at ?? at + si * 0.3, sd = s.dur ?? dur;
        const tag = s.tag ? (() => { const e = node('div', `position:absolute;left:0;top:0;font:700 ${gx(28)}px/1 ${FONT.sans};color:${col};white-space:nowrap;opacity:0`, pc.face); e.textContent = s.tag; textOf(pc, e, 'label', s.tag, { at: sa + sd }); return e; })() : null;
        const flag = s.flag ? R.country(s.flag, { x: 0, y: 0, w: 70, h: 70, color: col, at: sa, enter: 'none', z: pc.z + 20, ride: true }) : null;
        F.sfx(sa, 'pencil', 0.35, { dur: sd });
        return { s, pts, col, p, sa, sd, tag, flag };
      });
      F.prep(() => {
        for (const S2 of series) {
          const L = S2.p.getTotalLength(); S2.L = L; S2.p.setAttribute('stroke-dasharray', L);
          // keys: the tip reaches each note on this series (x) as that note lands, so the line and its labels arrive together
          const lenAt = (xv) => { let lo = 0, hi = L; for (let k = 0; k < 28; k++) { const m = (lo + hi) / 2; if (S2.p.getPointAtLength(m).x < px(xv)) lo = m; else hi = m; } return lo; };
          const si = series.indexOf(S2), ks = (o.notes || []).filter((nt) => (nt.series ?? 0) === si && nt.at != null && nt.at > S2.sa && nt.at < S2.sa + S2.sd).map((nt) => [nt.at - 0.1, lenAt(nt.x)]).sort((a, b) => a[0] - b[0]);
          const KS = [[S2.sa, 0], ...ks, [S2.sa + S2.sd, L]];
          F.add((t) => {
            let len = 0; for (let i = 1; i < KS.length; i++) if (t >= KS[i - 1][0]) len = mix(KS[i - 1][1], KS[i][1], seg(t, KS[i - 1][0], Math.max(KS[i - 1][0] + 0.01, KS[i][0]), ks.length ? E.lin : E.sine));
            S2.p.setAttribute('stroke-dashoffset', (L - len).toFixed(1));
            const tip = S2.p.getPointAtLength(Math.max(0.1, len));
            if (S2.tag) set(S2.tag, { transform: `translate(${gx(tip.x + 26).toFixed(1)}px,${gx(tip.y - 14).toFixed(1)}px)`, opacity: seg(t, S2.sa + S2.sd - 0.1, S2.sa + S2.sd + 0.3).toFixed(3) });
            if (S2.flag) { const a = pc.rot * DEG, cx = pc.w / 2, cy = pc.h / 2, lx = tip.x - cx, ly = tip.y - cy; S2.flag.x = pc.x + cx + lx * Math.cos(a) - ly * Math.sin(a) - 22; S2.flag.y = pc.y + cy + lx * Math.sin(a) + ly * Math.cos(a) - 66; S2.flag.rot = pc.rot; S2.flag._wb = S2.flag.wbox(); set(S2.flag.el, { visibility: t >= S2.sa ? 'visible' : 'hidden' }); }
          });
        }
      });
      for (const nt of o.notes || []) {   // a note at an x value: a dashed leader down to the line and a small red typed label
        const na = nt.at ?? at + dur + 0.4, xv = px(nt.x), S2 = series[nt.series ?? 0], yv = nt.y != null ? py(nt.y) : S2 ? S2.pts.reduce((b, q) => (Math.abs(q[0] - xv) < Math.abs(b[0] - xv) ? q : b))[1] : pad.t, ly = nt.ly ?? Math.max(pad.t + 10, yv - 120);
        const ld = svgEl('path', { d: `M${xv},${yv - 8} L${xv},${ly + 34}`, stroke: C0.red, 'stroke-width': 2, 'stroke-dasharray': '5 5', fill: 'none', opacity: 0 }, over);
        const e = tx(pc, null, nt.text, `left:${gx(xv - (nt.align === 'right' ? 360 : 10))}px;width:${gx(360)}px;top:${gx(ly)}px;text-align:${nt.align === 'right' ? 'right' : 'left'};font:700 ${gx(nt.size ?? 30)}px/1.25 ${FONT.sans};color:${C0.red}`, 'label', { at: na });
        F.add((t) => { ld.setAttribute('opacity', seg(t, na, na + 0.25).toFixed(2)); set(e, { opacity: seg(t, na, na + 0.3).toFixed(3) }); });
        F.sfx(na, 'pin', 0.35);
      }
      if (o.band) { const b = o.band, ba = b.at ?? at + dur + 0.6, r2 = svgEl('rect', { x: px(b.from), y: pad.t - 20, width: px(b.to) - px(b.from), height: h - pad.b - pad.t + 20, fill: b.color ?? 'rgba(246,214,58,.32)', opacity: 0 }, under); F.add((t) => r2.setAttribute('opacity', seg(t, ba, ba + 0.4).toFixed(2))); if (b.text) { const e = tx(pc, null, b.text, `left:${gx(px(b.from) + 8)}px;top:${gx(pad.t - 14)}px;font:700 ${gx(24)}px/1.2 ${FONT.sans};color:#5c4a0c`, 'label', { at: ba }); F.add((t) => set(e, { opacity: seg(t, ba, ba + 0.3).toFixed(3) })); } F.sfx(ba, 'marker', 0.35, { dur: 0.4 }); }
      if (o.gap) {   // the area between two series over a range, shaded, with a big number
        const gp = o.gap, A = series[gp.series?.[0] ?? 0], B = series[gp.series?.[1] ?? 1], ga = gp.at ?? at + dur + 0.8, xa = px(gp.from), xb = px(gp.to);
        const inR = (S2) => S2.pts.filter((q) => q[0] >= xa && q[0] <= xb);
        const a2 = inR(A), b2 = inR(B).reverse();
        if (a2.length && b2.length) {
          const poly = svgEl('path', { d: 'M' + [...a2, ...b2].map((q) => q.map((v) => v.toFixed(1)).join(',')).join('L') + 'Z', fill: gp.color ?? 'rgba(63,122,85,.32)', opacity: 0 }, under);
          F.add((t) => { const q = seg(t, ga, ga + 0.6, E.cubicInOut); poly.setAttribute('opacity', q.toFixed(2)); poly.style.clipPath = `inset(0 ${((1 - q) * 100).toFixed(1)}% 0 0)`; });
          if (gp.text) { const mx = gp.tx ?? (xa + xb) / 2 + 40, my = gp.ty ?? Math.min(...a2.map((q) => q[1]), ...b2.map((q) => q[1])) - 20; const e = tx(pc, null, gp.text, `left:${gx(mx)}px;top:${gx(my)}px;font:900 ${gx(gp.size ?? 72)}px/1 ${FONT.serif};color:${gp.ink ?? C0.green};white-space:nowrap`, 'headline', { at: ga + 0.3 }); F.add((t) => set(e, { opacity: seg(t, ga + 0.3, ga + 0.6).toFixed(3), transform: `scale(${(1.1 - 0.1 * seg(t, ga + 0.3, ga + 0.6, E.quartOut)).toFixed(3)})` })); }
          F.sfx(ga, 'marker', 0.4, { dur: 0.6 });
        }
      }
      pc.point = (si, xv, yv) => { const S2 = series[si]; const q = yv != null ? [px(xv), py(yv)] : S2.pts.reduce((b, p2) => (Math.abs(p2[0] - px(xv)) < Math.abs(b[0] - px(xv)) ? p2 : b)); return { piece: pc, box: () => ({ x: q[0] - 60, y: q[1] - 60, w: 120, h: 120 }), wbox() { return target(pc, pc.face).wbox.call(this); } }; };
      pc.region = (xa, xb, ya, yb) => { const bx = { x: px(xa), y: ya != null ? py(ya) : pad.t, w: px(xb) - px(xa), h: (yb != null ? py(yb) : h - pad.b) - (ya != null ? py(ya) : pad.t) }; return { piece: pc, box: () => bx, wbox() { return target(pc, pc.face).wbox.call(this); } }; };
      F.info('chart', pc.at, pc.until < 1e8 ? pc.until : undefined);
      return pc;
    };
    // a bond / certificate: guilloche border, a rosette, a head line; a huge serif character prints in (ink rolls down), with typed lines beside it
    R.glyph = (o = {}) => {
      const w = o.w ?? 1500, h = o.h ?? 860, size = o.size ?? 520;
      const pc = R.piece({ paper: 'cert', torn: o.torn ?? '', ...o, w, h, kind: 'glyph' });
      const svg = svgEl('svg', { width: gx(w), height: gx(h), viewBox: `0 0 ${w} ${h}`, style: 'position:absolute;left:0;top:0' }, pc.face);
      const gcol = o.lineColor ?? 'rgba(60,110,90,.55)';
      for (const ins of [28, 44]) svgEl('rect', { x: ins, y: ins, width: w - ins * 2, height: h - ins * 2, fill: 'none', stroke: gcol, 'stroke-width': ins === 28 ? 3 : 1.5 }, svg);
      let gd = ''; for (let k = 0; k < 2; k++) { for (let x = 50; x <= w - 50; x += 6) { const y = 36 + 6 * Math.sin(x / 18 + k * Math.PI); gd += `${x === 50 ? 'M' : 'L'}${x},${y.toFixed(1)}`; } for (let x = 50; x <= w - 50; x += 6) { const y = h - 36 + 6 * Math.sin(x / 18 + k * Math.PI); gd += `${x === 50 ? 'M' : 'L'}${x},${y.toFixed(1)}`; } }
      svgEl('path', { d: gd, fill: 'none', stroke: gcol, 'stroke-width': 1 }, svg);
      const rcx = w - 210, rcy = h - 190, ro = svgEl('g', { transform: `translate(${rcx},${rcy})` }, svg);
      for (let k = 0; k < 36; k++) svgEl('ellipse', { rx: 90, ry: 34, transform: `rotate(${k * 5})`, fill: 'none', stroke: gcol, 'stroke-width': 0.9 }, ro);
      if (o.head) tx(pc, null, o.head, `left:${gx(80)}px;top:${gx(72)}px;font:italic 700 ${gx(26)}px/1 ${FONT.type};letter-spacing:.12em;color:#3d5a4c`, 'label');
      if (o.serial) tx(pc, null, o.serial, `right:${gx(90)}px;top:${gx(120)}px;font:400 ${gx(20)}px/1 ${FONT.type};letter-spacing:.1em;color:#3d5a4c`, 'label');
      const at = o.charAt ?? pc.at + 0.6, ch = tx(pc, null, o.char ?? '', `left:${gx(o.cx ?? 130)}px;top:${gx(o.cy ?? (h - size * 1.08) / 2)}px;font:900 ${gx(size)}px/1.05 ${FONT.serif};color:${o.color ?? '#151412'};mix-blend-mode:multiply`, 'slam', { at });
      F.add((t) => { const q = seg(t, at, at + 0.55, E.cubicInOut); set(ch, { clipPath: `inset(0 0 ${((1 - q) * 100).toFixed(1)}% 0)`, filter: q < 1 ? `blur(${((1 - q) * gx(3)).toFixed(2)}px)` : 'none' }); });
      F.sfx(at, 'press', 0.6, { dur: 0.55 });
      let ly = o.ly ?? h * 0.44;
      for (const [k, ln0] of (o.lines || []).entries()) { const ln = obj(ln0), la = ln.at ?? at + 0.8 + k * 0.5, e = tx(pc, null, ln.text, `left:${gx(o.lx ?? size * 1.15 + 160)}px;top:${gx(ly)}px;font:${k === 0 ? 700 : 400} ${gx(k === 0 ? 58 : o.lineSize ?? 32)}px/1.2 ${FONT.type};letter-spacing:.06em;color:#1f2a24;white-space:nowrap`, 'label', { at: la }); F.add((t) => set(e, { clipPath: `inset(-10% ${((1 - seg(t, la, la + 0.5)) * 100).toFixed(1)}% -10% 0)` })); F.sfx(la, 'key', 0.3); ly += k === 0 ? 88 : (o.lineSize ?? 32) * 1.7; }
      F.info('glyph', pc.at, pc.until < 1e8 ? pc.until : undefined);
      return pc;
    };
    // a country cut-out (a sticker of the country's shape with a white paper border), from Natural Earth via world-atlas (needs topojson-client on the page)
    let worldP = null;
    const loadWorld = () => (worldP ??= (async () => {
      if (!window.topojson) throw new Error(M('C.country 要 topojson-client：页面里加 <script src="https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js">（起始页已有）', 'C.country needs topojson-client: add <script src="https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js"> (the starter pages have it)'));
      const r = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json'); const wt = await r.json();
      F.credit({ title: 'Natural Earth 1:50m (world-atlas@2.0.2)', author: 'Natural Earth', licence: 'Public domain', url: 'https://www.naturalearthdata.com/' });
      return topojson.feature(wt, wt.objects.countries);
    })());
    R.country = (name, o = {}) => {
      const w = o.w ?? 300, h = o.h ?? 300;
      const pc = R.piece({ paper: null, torn: '', ...o, w, h, kind: 'country' });
      const svg = svgEl('svg', { width: gx(w), height: gx(h), viewBox: `0 0 ${w} ${h}`, style: `position:absolute;left:0;top:0;overflow:visible;filter:drop-shadow(${gx(3)}px ${gx(5)}px ${gx(3)}px rgba(40,25,10,.4))` }, pc.face);
      F.prep(async () => {
        const world = await loadWorld(), f = world.features.find((c) => c.properties.name === name);
        if (!f) throw new Error(M(`collage：找不到国家 ${name}（Natural Earth 的英文名，如 United States of America）`, `collage: no country ${name} (Natural Earth English name, e.g. United States of America)`));
        // the main landmass (+ islands bigger than a share of it), projected equirectangular around its own latitude, fitted into w × h
        let polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
        const area = (ring) => { let a = 0; for (let i = 0; i < ring.length; i++) { const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % ring.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a / 2); };
        polys = polys.map((p) => ({ p, a: area(p[0]) })).sort((a, b) => b.a - a.a);
        const bb = (ring) => [Math.min(...ring.map((q) => q[0])), Math.min(...ring.map((q) => q[1])), Math.max(...ring.map((q) => q[0])), Math.max(...ring.map((q) => q[1]))], m0 = bb(polys[0].p[0]), mw = m0[2] - m0[0], mh = m0[3] - m0[1], near = o.near ?? 0.6;
        const keep = polys.filter((p) => p.a > polys[0].a * (o.islands ?? 0.01)).map((p) => p.p).filter((p) => { const b = bb(p[0]); return o.bbox ? b[2] >= o.bbox[0] && b[0] <= o.bbox[2] && b[3] >= o.bbox[1] && b[1] <= o.bbox[3] : b[2] >= m0[0] - mw * near && b[0] <= m0[2] + mw * near && b[3] >= m0[1] - mh * near && b[1] <= m0[3] + mh * near; });
        const all = keep.flatMap((p) => p[0]), lat0 = all.reduce((s, q) => s + q[1], 0) / all.length, kx = Math.cos(lat0 * DEG);
        const xs = all.map((q) => q[0] * kx), ys = all.map((q) => -q[1]), bx = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], sc = Math.min((w * 0.9) / (bx[2] - bx[0]), (h * 0.9) / (bx[3] - bx[1]));
        const ox = (w - (bx[2] - bx[0]) * sc) / 2, oy = (h - (bx[3] - bx[1]) * sc) / 2;
        const d = keep.map((p) => p.map((ring) => 'M' + ring.map(([lo, la]) => `${(ox + (lo * kx - bx[0]) * sc).toFixed(1)},${(oy + (-la - bx[1]) * sc).toFixed(1)}`).join('L') + 'Z').join('')).join('');
        svgEl('path', { d, fill: '#f6f2e8', stroke: '#f6f2e8', 'stroke-width': o.border ?? 9, 'stroke-linejoin': 'round' }, svg);
        svgEl('path', { d, fill: colOf(o.color, C0.blue), stroke: 'none' }, svg);
      });
      if (o.label) R.note(o.label, { x: pc.x + w + 10, y: pc.y + h * 0.4, at: pc.at + 0.3, color: o.color, size: o.labelSize ?? 36 });
      return pc;
    };
    // a big number printed on the table: it rolls up from `from` to `to`, with a unit and a line under it
    R.number = (o = {}) => {
      const size = o.size ?? 200, dec = o.decimals ?? 0, fmt = (v) => `${o.prefix ?? ''}${Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`, txt = fmt(o.to ?? o.value ?? 0) + (o.unit ?? '');
      const w = Math.max(units(txt) * size * 0.95 + 40, o.sub ? units(o.sub) * (o.subSize ?? 30) * 1.04 + 20 : 0), h = size * 1.46 + (o.sub ? (o.subSize ?? 30) * 1.6 + 10 : 0);
      const pc = R.piece({ paper: null, torn: '', enter: 'none', ...o, w, h, kind: 'number', depth: 'top' });
      const e = node('div', `position:absolute;left:0;top:0;font:900 ${gx(size)}px/1.1 ${FONT.serif};color:${colOf(o.color, C0.red)};white-space:nowrap;mix-blend-mode:multiply`, pc.face);
      // the digits sit in a box as wide as the final number (tabular figures): the roll changes digits, not the layout
      const num = node('span', 'display:inline-block;text-align:right;font-variant-numeric:tabular-nums', e), unit = node('span', `font-size:.42em;line-height:1;margin-left:.08em`, e);
      F.prep(() => { const c = document.createElement('canvas').getContext('2d'); c.font = `900 ${gx(size)}px ${FONT.serif}`; const ws = [fmt(Number(o.to ?? o.value).toFixed(dec)), fmt(Number(from).toFixed(dec))].map((x) => c.measureText(x).width); num.style.minWidth = `${(Math.max(...ws) * 1.04).toFixed(1)}px`; }); unit.textContent = o.unit ?? '';
      textOf(pc, e, 'slam', txt);
      const sub = o.sub ? tx(pc, null, o.sub, `left:${gx(6)}px;top:${gx(size * 1.46)}px;font:700 ${gx(o.subSize ?? 30)}px/1.2 ${FONT.sans};color:${C0.ink};white-space:nowrap`, 'label', { at: pc.at + 0.3 }) : null;
      if (sub) F.add((t) => set(sub, { opacity: seg(t, pc.at + 0.3, pc.at + 0.6).toFixed(3) }));
      const at = pc.at, dur = o.dur ?? (o.from != null ? 1 : 0.2), from = o.from ?? o.to ?? o.value;
      F.add((t) => { const q = seg(frameT(t), at, at + dur, E.quartOut), v = from + ((o.to ?? o.value) - from) * q, s = fmt(v.toFixed(dec)); if (num.textContent !== s) num.textContent = s; set(e, { opacity: seg(t, at, at + 0.15).toFixed(3), transform: `scale(${(1.08 - 0.08 * seg(t, at, at + 0.3, E.quartOut)).toFixed(4)})` }); });
      if (at > 0.01) { F.sfx(at, 'press', 0.45); if (o.from != null) F.sfx(at + 0.05, 'roll', 0.35, { dur }); }
      F.info('mark', at, pc.until < 1e8 ? pc.until : undefined);
      return pc;
    };

    // ---------- whole-frame moments: the red title sheet, the source card at the end ----------
    let farX = null;
    const farSpot = (w) => { farX ??= maxX + 1400; const x = farX; farX += w + 1400; return x; };
    const titles = [];
    R.title = (a, b, o = {}) => {
      const w = FW * 1.6, h = 1600, x = o.x ?? farSpot(w), y = o.y ?? -300;
      const pc = R.piece({ x, y, w, h, rot: o.rot ?? 0, paper: o.ground ?? 'red', torn: '', at: 0, enter: 'none', kind: 'title', z: 50 });
      const lines = [].concat(o.text ?? []), size = o.size ?? (PT ? 150 : 220), at = o.at ?? a + 0.15, cx = w / 2 - FW / 2;
      lines.forEach((ln, i) => { const la = at + i * 0.3, e = tx(pc, null, ln, `left:${gx(cx + (PT ? 50 : 110))}px;top:${gx(300 + (PT ? 140 : 240) + i * size * 1.15)}px;font:900 ${gx(size)}px/1.05 ${FONT.serif};color:#f4ecdc;white-space:nowrap;letter-spacing:.02em`, i ? 'headline' : 'slam', { at: la }); F.add((t) => { const q = E.quartOut(seg(t, la, la + 0.2)); set(e, { opacity: cl(q * 3).toFixed(3), transform: `scale(${(1.18 - 0.18 * q).toFixed(4)})` }); }); F.sfx(la, 'impact', 0.6); });
      if (o.sub) { const sa = at + lines.length * 0.3 + 0.2, e = tx(pc, null, o.sub, `left:${gx(cx + (PT ? 56 : 118))}px;top:${gx(300 + (PT ? 140 : 240) + lines.length * size * 1.15 + 20)}px;font:400 ${gx(30)}px/1.3 ${FONT.type};letter-spacing:.14em;color:rgba(244,236,220,.82);text-transform:uppercase;white-space:nowrap`, 'label', { at: sa }); F.add((t) => set(e, { opacity: seg(t, sa, sa + 0.4).toFixed(3) })); }
      let ph = null;
      if (o.photo) ph = R.photo(o.photo, { x: x + cx + (PT ? 40 : FW * 0.5), y: y + 300 + (PT ? 560 : 170), w: PT ? 480 : 760, h: PT ? 380 : 560, rot: 3, at: at + 0.35, enter: 'drop', tape: ['tl', 'br'], credit: o.credit, cell: o.cell, z: 60 });
      R.move(a - (o.travel ?? 1.2), a, { x: x + w / 2, y: y + 300 + 500, h: 1000, tilt: o.tilt ?? 3, roll: 0 });
      F.musicCue(at, 'hit'); F.scene(a, b, { role: 'drop' });
      titles.push({ a, b, lines });
      pc.photo = ph;
      return pc;
    };
    R.end = (a, b, o = {}) => {
      const w = PT ? 520 : 1100, x = o.x ?? farSpot(w), lines = [];
      if (o.title) lines.push(['t', o.title]);
      if (o.sub) lines.push(['s', o.sub]);
      if ((o.sources || []).length) { lines.push(['h', M('资料来源', 'Sources')]); for (const s of o.sources) lines.push(['n', s]); }
      const groups = []; for (const c of F.credits || []) { const k = [c.author, c.licence].filter(Boolean).join(' / ') || c.title; if (k && !groups.includes(k)) groups.push(k); }
      F.prep(() => {});
      const lh = ([k, s2]) => { const sz = k === 't' ? (PT ? 46 : 56) : k === 's' ? 30 : k === 'h' ? 24 : 22, rows = Math.max(1, Math.ceil((units(s2) * sz * (k === 'n' ? 1.1 : 1)) / (w - 120))); return k === 't' ? rows * sz * 1.2 + 24 : k === 'h' ? 56 : rows * sz * 1.4 + 12; };
      const h = 150 + lines.reduce((a, l) => a + lh(l), 0) + 130;
      const pc = R.piece({ x, y: 0, w, h, paper: 'white', torn: 'b', at: 0, enter: 'none', tape: ['tl', 'tr'], kind: 'end', rot: o.rot ?? -1.5 });
      let y = 70;
      lines.forEach(([k, s], i) => { const la = a + 0.5 + i * Math.min(0.5, (b - a - 1.5) / Math.max(1, lines.length)); const e = tx(pc, null, s, k === 't' ? `left:${gx(60)}px;top:${gx(y)}px;width:${gx(w - 120)}px;font:900 ${gx(PT ? 46 : 56)}px/1.15 ${FONT.serif};color:${C0.ink}` : k === 's' ? `left:${gx(60)}px;top:${gx(y)}px;width:${gx(w - 120)}px;font:500 ${gx(30)}px/1.3 ${FONT.sans};color:#3b3731` : k === 'h' ? `left:${gx(60)}px;top:${gx(y + 10)}px;font:700 ${gx(24)}px/1 ${FONT.type};letter-spacing:.14em;color:${C0.red}` : `left:${gx(60)}px;top:${gx(y)}px;width:${gx(w - 120)}px;font:400 ${gx(22)}px/1.35 ${FONT.type};color:#3b3731`, 'label', { at: la, fact: k === 'h' ? false : undefined }); F.add((t) => set(e, { opacity: seg(t, la, la + 0.3).toFixed(3) })); if (k === 'n' || k === 'h') F.sfx(la, 'key', 0.25); y += lh([k, s]); });
      pc.creditBox = node('div', `position:absolute;left:${gx(60)}px;top:${gx(y + 20)}px;width:${gx(w - 120)}px;font:400 ${gx(19)}px/1.4 ${FONT.type};color:#6a645a`, pc.face);
      F.prep(() => { const cr = (F.credits || []).map((c) => [c.author, c.licence].filter(Boolean).join(' / ') || c.title).filter((v, i, arr) => v && arr.indexOf(v) === i); if (cr.length) { pc.creditBox.textContent = M('图片 / 地图：', 'Pictures / maps: ') + cr.join(' · '); F.text(pc.creditBox, 'label', pc.creditBox.textContent, Math.max(0, a - 0.6), b, { noFact: true, chrome: true }); } });
      R.move(a - 0.3, a + 1.1, { on: pc, pad: 1.15, tilt: 4, roll: 0 });
      F.scene(a, b, { end: true }); F.musicCue(a + 0.3, 'name');
      return pc;
    };

    // ---------- chrome: channel / chapter, date / place, source line; captions ----------
    const chrome = opt.chrome !== false && !FLAT;
    const datelines = [], sources = [];
    R.dateline = (at, text) => { datelines.push({ at, text }); datelines.sort((p, q) => p.at - q.at); return R; };
    R.source = (at, text, until) => { sources.push({ at, until: until ?? 1e9, text }); return R; };
    const top = BAND ? RH * 0.06 : PT ? H * 0.045 : gx(52), side = BAND ? gx(40) : PT ? gx(44) : gx(110), chromeInk = '#2a2722';
    if (chrome) {
      const chans = opt.channel ?? M('拼贴社', 'Collage Desk');
      const tl = el('div', `left:${side}px;top:${top}px;font:700 ${gx(PT ? 22 : 26)}px/1.3 ${FONT.sans};color:${chromeInk};white-space:nowrap;letter-spacing:.06em`, hud);
      const chan = node('span', '', tl); chan.textContent = chans;
      const chapBox = node('span', `font-weight:400;color:#4a463e;margin-left:.6em`, tl);
      const tr = el('div', `${PT ? `left:${side}px;top:${top + gx(34)}px` : `right:${side}px;top:${top}px`};font:500 ${gx(PT ? 18 : 24)}px/1.3 ${FONT.mono};color:${chromeInk};white-space:nowrap;letter-spacing:.06em`, hud);
      const srcEl = el('div', `left:${side}px;right:${side}px;${BAND ? `top:${BY + RH * 0.012 + H * BK}px` : `bottom:${gx(PT ? 22 : 30)}px`};font:400 ${gx(PT ? 11 : 17)}px/1.4 ${FONT.mono};color:#4a463f;letter-spacing:.02em`, hud);
      for (const e of [tl, tr, srcEl]) { e.dataset.motion = 'skip'; e.style.textShadow = `0 0 ${gx(6)}px ${C0.table}, 0 0 ${gx(3)}px ${C0.table}`; }
      F.text(chan, 'label', chans, 0, F.duration, { noFact: true, chrome: true, overlap: true });
      F.prep(() => {
        const CH = (Array.isArray(opt.chapters) ? opt.chapters : null) || (F.T && F.T.chapters) || [];
        const spans = CH.map((c, i) => { const sp = node('span', 'display:none', chapBox); sp.textContent = `／ ${c.title}`; F.text(sp, 'label', sp.textContent, i ? c.start : 0, i === CH.length - 1 ? F.duration : CH[i + 1].start, { noFact: true, chrome: true, overlap: true }); return sp; });
        F.add((t) => { let k = 0; CH.forEach((c, i) => { if (t >= c.start) k = i; }); spans.forEach((sp, i) => set(sp, { display: i === k ? '' : 'none' })); });
        const dls = datelines.map((d, i) => { const sp = node('span', 'display:none', tr); sp.textContent = d.text; F.text(sp, 'label', d.text, d.at, datelines[i + 1]?.at ?? F.duration, { chrome: true, overlap: true }); return sp; });
        F.add((t) => { let k = -1; datelines.forEach((d, i) => { if (t >= d.at) k = i; }); dls.forEach((sp, i) => set(sp, { display: i === k ? '' : 'none' })); });
        // the source line: the current source, then the credit of each photo on screen (while it is on screen)
        const sps = sources.map((s) => { const sp = node('span', 'display:none;margin-right:1.4em', srcEl); sp.textContent = s.text; F.text(sp, 'label', s.text, s.at, Math.min(s.until, F.duration), { chrome: true, overlap: true }); return sp; });
        const crSp = node('span', '', srcEl); let last = '';
        F.add((t) => {
          sources.forEach((s, i) => set(sps[i], { display: t >= s.at && t < s.until ? '' : 'none' }));
          const parts = []; for (const c of credits) if (c.piece.on && t >= c.piece.at && t < c.piece.until && onScreen(c.piece)) parts.push(M('图：', 'Photo: ') + c.text);
          const s = [...new Set(parts)].join('  ·  '); if (s !== last) { crSp.textContent = s; last = s; }
        });
      });
    }
    const onScreen = (pc) => { const v = curV; if (!v) return true; const b = pc._wb || pc.wbox(), [x1, y1] = project(v, b.x, b.y), [x2, y2] = project(v, b.x + b.w, b.y + b.h); return x2 > W * 0.08 && x1 < W * 0.92 && y2 > H * 0.08 && y1 < H * 0.92; };
    let curV = null; F.add((t) => { curV = RK ? camAt(t) : null; });
    if (F.T && F.voiced && !F.caps && opt.captions !== false && !FLAT) {
      const co = opt.captions || {}, segs = window.EV.captionSegments(F.T, co.max ?? (PT ? 13 : BAND ? 14 : 22)), size = gx(co.size ?? (PT ? 32 : BAND ? 50 : 40));
      const box = el('div', `left:0;right:0;top:${co.top ?? (BAND ? BY + H * BK + gx(90) : PT ? H * 0.805 : H * 0.855)}px;text-align:center;z-index:880;pointer-events:none;display:none`, F.stage);
      const sp = node('span', `position:relative;display:inline-block;max-width:${RW * 0.84}px;color:${C0.ink};font:700 ${size}px/1.3 ${FONT.sans};letter-spacing:.02em;background:rgba(246,241,229,.86);padding:${gx(4)}px ${gx(16)}px;box-shadow:0 ${gx(2)}px ${gx(4)}px rgba(60,40,20,.25)`, box);
      F.add((t) => { const c = segs.find((x) => t >= x.start && t < x.end); set(box, { display: c ? '' : 'none' }); if (c && sp.textContent !== c.text) sp.textContent = c.text; });
      for (const c of segs) { F.appear(c.start); F.appear(c.end); }
      F.caps = segs;
    }
    if (BAND) {   // portrait band: the title above the picture
      const tt = opt.title ?? (document.title.split('·')[0] || '').trim();
      if (tt) { const e = el('div', `left:${gx(40)}px;right:${gx(40)}px;top:${RH * 0.13}px;text-align:center;font:900 ${gx(90)}px/1.2 ${FONT.serif};color:${C0.ink}`, hud, esc(tt)); e.dataset.motion = 'skip'; F.text(e, 'label', tt, 0, F.duration, { overlap: true }); }
      F.stage.style.background = C0.table;
    }

    // ---------- checks ----------
    F.addLint(() => {
      const out = [], add = (t, what, msg) => out.push({ level: 'warn', t: Math.round(t * 10) / 10, src: '', what, msg });
      if (FLAT) return out;   // the common interface cuts between its own layers (wipes); the table checks below are for hand-written films
      // one take: no hard cuts (the camera travels instead)
      for (const c of F.cuts || []) add(c, M('硬切', 'hard cut'), M(`${c.toFixed(1)} 秒有一处硬切：拼贴风格是一镜到底，换场让镜头在桌面上移过去（C.move），远处的内容镜头会抬起来再落下`, `Hard cut at ${c.toFixed(1)} s: the collage style is one take; move the camera across the table instead (C.move) — far moves lift and land on their own`));
      // the camera: too fast (a whip reads as a cut), parked too long, never moving
      if (RK) {
        let fast = null, peak = 0;
        for (let t = 0; t < F.duration; t += 1 / 15) {
          const a = camAt(t), b = camAt(t + 1 / 15), sp = Math.hypot(b.x - a.x, b.y - a.y) / (Math.min(a.h, b.h) * Math.max(AR, 1)) * 15, zs = Math.abs(Math.log(b.h / a.h)) * 15;
          if (sp > 3.2 || zs > 3) { fast ??= t; peak = Math.max(peak, sp); } else if (fast != null) { const sp2 = peak; peak = 0; add(fast, M('甩镜太快', 'camera too fast'), M(`${fast.toFixed(1)}–${t.toFixed(1)} 秒镜头每秒移过 ${sp2.toFixed(1)} 个画面（长边）/ 缩放太猛：看着像跳切，给这段移动多留时间（≥ 0.8 秒）`, `${fast.toFixed(1)}–${t.toFixed(1)} s the camera moves too fast (≈${sp2.toFixed(1)} frames (long side) a second or a violent zoom): it reads as a jump cut; give the move more time (≥ 0.8 s)`)); fast = null; }
        }
        const ks = RK.map((k) => k.t), voiceEnd = F.T && F.T.lines ? Math.max(...F.T.lines.map((l) => l.end || 0)) : F.duration;
        for (let i = 1; i < ks.length; i++) if (ks[i] - ks[i - 1] > 9 && ks[i - 1] < voiceEnd) add(ks[i - 1], M('镜头停太久', 'camera parked'), M(`${ks[i - 1].toFixed(1)}–${ks[i].toFixed(1)} 秒镜头只漂着不动（${(ks[i] - ks[i - 1]).toFixed(1)} 秒）：推近一处细节、拉开看全貌，或者移到下一张纸`, `${ks[i - 1].toFixed(1)}–${ks[i].toFixed(1)} s the camera only floats (${(ks[i] - ks[i - 1]).toFixed(1)} s): push into a detail, pull out to the whole, or move on to the next piece`));
        if (RK.length < 2 && F.duration > 8) add(0, M('镜头', 'camera'), M('整片只有一个机位：拼贴风格靠镜头在桌面上移动讲故事（C.move）', 'The whole film has one camera position: the collage style tells the story by moving across the table (C.move)'));
      }
      // stamps are punctuation: about one every 8 s at most
      if (stamps.length > Math.max(3, F.duration / 8)) add(stamps[0].at, M('印章', 'stamps'), M(`盖了 ${stamps.length} 个章：章是一句话的句号，大约每 8 秒最多一个，多了就不响了`, `${stamps.length} stamps: a stamp is a full stop, about one every 8 s at most — more and they stop landing`));
      // small print printed twice: the same line of copy on two pieces reads as filler
      const seen = new Map();
      for (const x of F.texts) if (!x.chrome && !x.noFact && x.text && x.text.length >= 12) { const k = x.text.trim(); if (seen.has(k) && seen.get(k) !== x.el) { add(x.win[0], M('重复的小字', 'repeated copy'), M(`"${k.slice(0, 18)}…" 印在了两张纸上：纸上的小字是真实内容，每段只印一次`, `"${k.slice(0, 18)}…" is printed on two pieces: small print is real copy, printed once`)); } else seen.set(k, x.el); }
      // titles: short like a headline
      for (const tl of titles) if (tl.lines.some((l) => [...l].length > 6)) add(tl.a, M('标题纸', 'title sheet'), M(`红色标题纸"${tl.lines.join(' / ')}"一行太长：每行 ≤ 6 个字`, `Title sheet "${tl.lines.join(' / ')}" has a long line: ≤ 6 characters a line`));
      // at each camera arrival: the subject is in the frame, and no piece text sits under the chrome
      const stage = F.stage, sr = stage.getBoundingClientRect(), bands = chrome ? [[0, (top + gx(PT ? 64 : 46) * BK) / (BAND ? RH : H)], [1 - gx(PT ? 40 : 56) / H, 1]] : [];
      let n = 0;
      for (const k of keys) {
        if (!k.view || !k.view.on || n > 24) continue;
        const tg = k.view.on, t = Math.min(F.duration - 0.05, k.t + 0.3); F.render(t); n++;
        const el2 = tg.el || (tg.piece && tg.piece.el); if (!el2) continue;
        const r = el2.getBoundingClientRect(), fw = sr.width, fh = sr.height, ix = Math.max(0, Math.min(r.right, sr.right) - Math.max(r.left, sr.left)), iy = Math.max(0, Math.min(r.bottom, sr.bottom) - Math.max(r.top, sr.top));
        if (r.width * r.height > 0 && (ix * iy) / (r.width * r.height) < 0.86 && r.width < fw * 1.05 && r.height < fh * 1.05) add(t, M('出画', 'cut off'), M(`${t.toFixed(1)} 秒镜头落在 ${tg.piece ? tg.piece.kind : 'piece'} 上，但它有 ${Math.round((1 - (ix * iy) / (r.width * r.height)) * 100)}% 在画外：调 pad / dx / dy`, `At ${t.toFixed(1)} s the camera lands on a ${tg.piece ? tg.piece.kind : 'piece'} but ${Math.round((1 - (ix * iy) / (r.width * r.height)) * 100)}% of it is out of frame: adjust pad / dx / dy`));
        for (const x of F.texts) {
          if (x.chrome || x.kind === 'caption' || t < x.win[0] || t >= x.win[1] || !x.el.isConnected) continue;
          const b = x.el.getBoundingClientRect(); if (!b.width) continue;
          const yc = (b.top + b.bottom) / 2 - sr.top;
          if (bands.some(([a2, b2]) => yc > a2 * fh && yc < b2 * fh) && b.right > sr.left && b.left < sr.right) { add(t, M('压住页眉页脚', 'under the chrome'), M(`${t.toFixed(1)} 秒「${x.text.slice(0, 12)}」压在页眉 / 来源行上：镜头再拉开一点或者往中间移`, `At ${t.toFixed(1)} s "${x.text.slice(0, 12)}" sits under the header / source line: pull the camera out a little or recentre`)); break; }
        }
      }
      return out;
    });

    R.pieces = pieces;
    // the information components register themselves when called (F.info: --check's density check); pieces built inside one don't count twice
    return P.infoKit ? P.infoKit(R, { photo: 'photo', type: 'quote', stamp: 'mark', number: 'mark', mark: 'annotate', redact: 'annotate', ring: 'annotate', strike: 'annotate', underline: 'annotate', dolls: 'chart', plan: 'diagram', card: 'card', bars: 'chart', ladder: 'rank', podium: 'rank', chart: 'chart', glyph: 'glyph', timeline: 'timeline', country: 'map' }) : R;
  };
})();
