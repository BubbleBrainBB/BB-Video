// newsreel.js: the old newsreel (老新闻片) style, one of bb-video's visual styles (style notes in styles/newsreel/STYLE.md). Load after promo.js.
// One frame: a 1.37:1 film gate on black; inside it a black-and-white (or sepia) newsreel — archive photographs with a slow push, intertitles
// between double rules, supers printed on the film, rubber stamps, a drafting-grid "animated diagram" for what no licensed footage shows,
// all under grain, scratches, dust, gate weave, flicker and a vignette. Labels that are NOT printed on the film (source tags, "reconstruction")
// sit sharp above the damage. A fictional newsreel brand opens and closes it; real broadcasters' names and idents are never used.
//
//   const R = PROMO.newsreel(F, { brand: { name, en, issue }, gate: 1.37 | 'full', tone: 'silver' | 'sepia', damage: 0–1.5, fonts, colors })
//   Everything inside the gate is laid out in gate units: gate height = 1000 (R.g(v) → px). Width: 1370 at 1.37, 1778 at 'full' (R.GU).
//   R.shot(a, b, { bg, cut })        a layer shown in [a, b) inside the gate; the start is a hard cut (splice tick) unless cut: false
//   R.iris(a, b, dir)                iris on the whole gate: dir 1 opens, -1 closes
//   R.ident({ at, until })           the newsreel's own ident: a turning sunburst, the brand name, the issue number (fanfare hit)
//   R.card(L, { a, b, main, sub, top, size })   intertitle: black, double rules, a small masthead line, one big line, an optional sub line
//   R.super(L, text, { x, y, size, anchor: 'l' | 'c' | 'r', a, b, bg, color, weight, font, kind, noFact })   text printed on the film
//   R.stamp(L, text, { x, y, size, rot, a, b, color, border })   a rubber stamp slammed onto the film
//   R.photo(L, key, { a, b, from, to, pos, box, tag })   a photograph from assets/manifest.js filling the gate (or box) with a slow push;
//       from / to = { s: scale, x, y: focus 0–1 }. Its credit (from the manifest, footage.mjs) becomes a source tag and a CREDITS line;
//       tag: a string replaces the tag text, false hides it (the credit is still registered)
//   R.clip(L, key, { a, b, from, to, rate, push: { from, to }, pos, box, tag })   an archive film clip from the manifest (assets.mjs: video →
//       frames at the source's own rate, graded once); from / to = seconds of the clip, rate = speed. It holds its last frame if the shot outlasts it
//       (a warning says so). Its credit and tag work like R.photo; push = an optional slow push, same { s, x, y } as R.photo's from / to
//   R.tag(text, a, b, { right })     a sharp source tag in a top corner;  R.rebuilt(a, b) the "reconstruction" tag for shots drawn in code
//   R.diagram(L, { grid })           the period "animated diagram": white lines on a faint drafting grid → { svg, path, line, circle, text, draw(el, a, dur) }
//   R.calendar(L, { a, b, title, pages: [{ label, at }], stamp, note })   a tear-off calendar: each page stamped, then torn off at the next page's time
//   R.stopwatch(L, { a, b, from, to, value, label, unit, note })   a stopwatch whose hand sweeps value (0–1 of a turn = 0–1 s) between from and to
//   R.ledger(L, { a, b, title, cols: [{ label, x }], rows: [{ at, cells: [] }], stamp: { text, at } })   a printed price list / catalogue card (paper)
//   R.verdict(L, { a, b, left: { title, items: [{ text, at }] }, right: { … } })   two columns: what was seen ✓ / what was not ✗
//   R.end({ a, b, main, sub, sources, notes, roll })   the end title (完 / THE END), then from roll (default: about halfway) a credits card:
//       the sources lines, the picture credits grouped by author + licence (the full list per file goes to out/CREDITS.txt), then notes lines
// Times: a = in (readable), b = out. Captions: the runtime sets the newsreel's own caption style when the film is narrated (set chapters: false in compose).
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('newsreel.js 要在 promo.js 之后加载', 'newsreel.js must load after promo.js'));
  const { E, seg, set, el } = P;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const rnd = (s) => window.EV.rng(s);

  P.newsreel = function (F, opt = {}) {
    const W = F.W, H = F.H, PT = F.portrait;
    const C = { cream: '#efe6d2', ink: '#15120e', paper: '#e9e1cf', dim: '#d8cfbd', muted: '#b9b0a0', ...(opt.colors || {}) };
    const FONT = { serif: '"Noto Serif SC", "Songti SC", serif', caps: 'Oswald, "Noto Serif SC", sans-serif', type: '"Special Elite", "Noto Serif SC", monospace', ...(opt.fonts || {}) };
    const brand = { name: M('电光新闻', 'Lightplay Newsreel'), en: 'LIGHTPLAY NEWSREEL', issue: '', ...(opt.brand || {}) };
    const R = { F, colors: C, fonts: FONT, brand };
    F.stillMax(1.0);      // a newsreel holds on a photograph; a short still is the medium, not a freeze
    F.blurBase(1);        // slow pushes don't need motion blur; quick moves register their own F.blur spans

    // ---------- the gate ----------
    const AR = opt.gate === 'full' ? 16 / 9 : opt.gate ?? 1.37;
    const GW = PT ? W : Math.round(H * AR), GH = PT ? Math.round(W / AR) : H;
    const GX = Math.round((W - GW) / 2), GY = PT ? Math.round(H * 0.7 - GH - F.px(40)) : 0, g = GH / 1000, GU = Math.round(1000 * AR);
    Object.assign(R, { GW, GH, GX, GY, GU, g: (v) => v * g });
    const gx = R.g;
    const gate = el('div', `left:${GX}px;top:${GY}px;width:${GW}px;height:${GH}px;overflow:hidden;background:#000;border-radius:${g * 18}px;z-index:10`, F.stage);
    const tone = opt.tone === 'sepia' ? 'grayscale(1) sepia(.55) contrast(1.1) brightness(.96)' : 'grayscale(1) sepia(.22) contrast(1.12) brightness(.97)';
    const film = el('div', `inset:0;filter:${tone}`, gate);
    const weave = el('div', `left:0;top:0;width:${GW}px;height:${GH}px`, film);
    weave.dataset.motion = 'texture';   // gate weave is film texture: the motion check measures what's inside it as if it stood still
    const D = opt.damage ?? 1;
    const flick = el('div', `inset:0;background:#000;opacity:0;pointer-events:none;z-index:40`, gate); flick.dataset.motion = 'skip';
    const vig = el('div', `inset:0;z-index:43;pointer-events:none;background:radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 52%, rgba(0,0,0,.38) 80%, rgba(0,0,0,.82) 100%)`, gate); vig.dataset.motion = 'skip';
    const sharp = el('div', 'inset:0;z-index:50;pointer-events:none', gate);   // labels that are not printed on the film
    R.gate = gate; R.film = film; R.weave = weave; R.sharp = sharp;

    // grain: a few noise tiles made once, one shown per frame (per-frame noise on a big canvas was most of the render time)
    const GR = 3, NT = 8, tiles = [];
    const grainBox = el('div', `inset:0;z-index:41;pointer-events:none;mix-blend-mode:overlay;opacity:${(0.5 * D).toFixed(2)}`, gate); grainBox.dataset.motion = 'skip';
    for (let k = 0; k < NT; k++) {
      const cv = el('canvas', `inset:0;width:${GW}px;height:${GH}px;display:none`, grainBox); cv.width = Math.ceil(GW / GR); cv.height = Math.ceil(GH / GR); cv.dataset.motion = 'skip';
      const ctx = cv.getContext('2d'), img = ctx.createImageData(cv.width, cv.height), r = rnd(k * 7919 + 13);
      for (let i = 0; i < img.data.length; i += 4) { const v = (r() * 255) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      ctx.putImageData(img, 0, 0); tiles.push(cv);
    }
    const dmg = el('canvas', `inset:0;width:${GW}px;height:${GH}px;z-index:42;pointer-events:none`, gate); dmg.dataset.motion = 'skip';
    dmg.width = Math.round(GW / 2); dmg.height = Math.round(GH / 2);
    const dctx = dmg.getContext('2d');
    // smooth value noise (flicker breathes instead of spiking frame to frame: single-frame spikes read as glitches and trip the frame check)
    const vnoise = (t, rate, seed) => { const x = t * rate, i = Math.floor(x), f = x - i, a = rnd(i * 131 + seed)(), b = rnd((i + 1) * 131 + seed)(); const s = f * f * (3 - 2 * f); return a + (b - a) * s; };
    let lastTile = -1;
    F.add((t) => {
      const fi = Math.floor(t * 24 + 1e-6), r = rnd(fi * 13 + 5);   // the damage steps at 24 fps, like the film it imitates
      const k = fi % NT; if (k !== lastTile) { if (lastTile >= 0) tiles[lastTile].style.display = 'none'; tiles[k].style.display = ''; lastTile = k; }
      set(weave, { transform: `translate(${((vnoise(t, 9, 1) - 0.5) * gx(3) * D).toFixed(2)}px,${((vnoise(t, 8, 2) - 0.5) * gx(4) * D + Math.sin(t * 1.7) * gx(1.2) * D).toFixed(2)}px)` });
      set(flick, { opacity: ((0.025 + vnoise(t, 6, 3) * 0.05) * D).toFixed(3) });
      dctx.clearRect(0, 0, dmg.width, dmg.height);
      if (D <= 0) return;
      // scratches: an episode every 1/3 s keeps its lines (they wobble a little per frame); dust: new specks each frame; now and then a hair
      const ep = Math.floor(t * 3), re = rnd(ep * 977 + 11), n = re() < 0.55 * D ? 1 + Math.floor(re() * 2) : 0;
      for (let q = 0; q < n; q++) {
        const x = re() * dmg.width, light = re() < 0.6, a = 0.18 + re() * 0.3, y0 = re() < 0.5 ? 0 : re() * dmg.height * 0.5;
        dctx.strokeStyle = light ? `rgba(235,228,210,${a})` : `rgba(10,8,6,${a})`; dctx.lineWidth = 0.6 + re() * 0.9;
        dctx.beginPath(); dctx.moveTo(x + (r() - 0.5) * 2, y0); dctx.lineTo(x + (r() - 0.5) * 3, dmg.height); dctx.stroke();
      }
      const specks = Math.floor(r() * 5 * D);
      for (let q = 0; q < specks; q++) {
        const s = 0.8 + r() * 3.2; dctx.fillStyle = r() < 0.75 ? `rgba(8,6,4,${0.35 + r() * 0.4})` : `rgba(240,234,220,${0.3 + r() * 0.4})`;
        dctx.beginPath(); dctx.ellipse(r() * dmg.width, r() * dmg.height, s, s * (0.5 + r()), r() * 3, 0, 7); dctx.fill();
      }
      const he = Math.floor(t / 3.7), rh = rnd(he * 53 + 2);
      if ((t % 3.7) < 0.1 && rh() < 0.7 * D) { const hx = rh() * dmg.width, hy = rh() * dmg.height; dctx.strokeStyle = 'rgba(8,6,4,.55)'; dctx.lineWidth = 1; dctx.beginPath(); dctx.moveTo(hx, hy); dctx.bezierCurveTo(hx + 30, hy - 20, hx + 10, hy + 40, hx + 45 * rh(), hy + 60 * rh()); dctx.stroke(); }
    });

    // portrait: the masthead sits in the black above the gate
    if (PT) {
      const m = el('div', `left:0;right:0;top:${GY - F.px(250)}px;text-align:center;color:${C.cream}`, F.stage);
      const a = el('div', `position:relative;font:900 ${F.px(84)}px/1.1 ${FONT.serif};letter-spacing:.24em`, m, brand.name);
      const b = el('div', `position:relative;margin-top:${F.px(14)}px;font:700 ${F.px(30)}px/1 ${FONT.caps};letter-spacing:.32em;color:${C.muted}`, m, [brand.en, brand.issue].filter(Boolean).join(' · '));
      F.text(a, 'label', brand.name, 0, F.duration, { noFact: true }); F.text(b, 'label', b.textContent, 0, F.duration, { noFact: true });
    }
    // narrated: captions in the newsreel's type (a plain dark band, not a modern pill)
    if (F.T && F.voiced && !F.caps) P.captions(F, { font: FONT.serif, weight: 700, bg: 'rgba(10,8,6,.66)', color: C.cream, ...(opt.captions || {}) });

    // ---------- shots, cuts, iris ----------
    const shots = [];
    R.shot = (a, b, o = {}) => {
      const L = el('div', `left:0;top:0;width:${GW}px;height:${GH}px;overflow:hidden;background:${o.bg ?? '#1c1915'};display:none`, weave);
      shots.push({ a, b, L });
      if (o.cut !== false && a > 0.01) { F.cut(a); F.sfx(a, 'splice', 0.3); }
      return L;
    };
    F.add((t) => { for (const s of shots) set(s.L, { display: t >= s.a && t < s.b ? '' : 'none' }); });
    const irises = [];
    R.iris = (a, b, dir = 1) => { irises.push([a, b, dir]); irises.sort((x, y) => x[0] - y[0]); F.transition(a, b); F.sfx(a, 'iris', 0.6, { dur: b - a }); };
    F.add((t) => {
      let r = 1;
      for (const [a, b, dir] of irises) { if (t < a) break; const q = seg(t, a, b, E.cubicInOut); r = dir > 0 ? q : 1 - q; }
      set(gate, { clipPath: r >= 1 ? 'none' : `circle(${(r * 0.62 * Math.hypot(GW, GH)).toFixed(1)}px at 50% 50%)` });
    });

    // ---------- type on the film ----------
    R.super = (L, html, o) => {
      const { x = 0, y = 0, size = 54, font = FONT.serif, weight = 900, color = C.cream, anchor = 'l', a, b, kind = 'label', text, bg, pad = 0.3, ls = '.04em', noFact, overlap } = o;
      const left = anchor === 'c' ? `left:0;width:${GW}px;text-align:center` : anchor === 'r' ? `right:${GW - gx(x)}px;text-align:right` : `left:${gx(x)}px`;
      const box = el('div', `${left};top:${gx(y)}px;opacity:0`, L);
      const s = el('span', `position:relative;display:inline-block;font:${weight} ${gx(size)}px/1.18 ${font};letter-spacing:${ls};color:${color};white-space:nowrap;${bg ? `background:${bg};padding:${gx(size * pad * 0.5)}px ${gx(size * pad)}px` : ''}`, box, html);
      F.text(s, kind, text ?? s.textContent, a, b, { noFact, overlap });
      F.add((t) => set(box, { opacity: t >= a && t < b ? Math.min(1, seg(t, a, a + 0.12)).toFixed(3) : 0 }));
      return s;
    };
    R.stamp = (L, html, o) => {
      const { x = 0, y = 0, size = 64, rot = -6, a, b, text, border = true, color = C.cream, back = 'rgba(12,10,8,.55)', overlap } = o;
      const box = el('div', `left:${gx(x)}px;top:${gx(y)}px;opacity:0;transform-origin:50% 50%`, L);
      const s = el('span', `position:relative;display:inline-block;font:900 ${gx(size)}px/1.1 ${FONT.serif};letter-spacing:.08em;color:${color};white-space:nowrap;${border ? `border:${gx(6)}px double ${color};padding:${gx(8)}px ${gx(22)}px` : ''};background:${back}`, box, html);
      F.text(s, 'label', text ?? s.textContent, a, b, { overlap });
      F.sfx(a, 'stamp', 0.6);
      F.add((t) => { const q = seg(t, a, a + 0.14, E.expoOut); set(box, { opacity: t >= a && t < b ? 1 : 0, transform: `rotate(${rot}deg) scale(${(1.6 - 0.6 * q).toFixed(3)})` }); });
      return s;
    };
    R.tag = (text, a, b, o = {}) => {
      const box = el('div', `${o.right ? `right:${gx(30)}px` : `left:${gx(30)}px`};top:${gx(28)}px;display:none`, sharp);
      const s = el('span', `position:relative;display:inline-block;font:400 ${gx(24)}px/1.2 ${FONT.type};color:${C.cream};background:rgba(0,0,0,.62);padding:${gx(6)}px ${gx(12)}px;letter-spacing:.02em;white-space:nowrap`, box, text);
      F.text(s, 'label', text, a, b, { noFact: true });
      F.add((t) => set(box, { display: t >= a && t < b ? '' : 'none' }));
      return s;
    };
    R.rebuilt = (a, b) => R.tag(M('示意 · 重建（无现场授权影像）', 'Illustration · reconstruction (no licensed footage)'), a, b, { right: true });

    // ---------- title cards ----------
    R.card = (L, { a, b, main, sub, top, size = 190 }) => {
      set(L, { background: '#0b0a08' });
      const fw = GU - 140;
      el('div', `left:${gx(70)}px;top:${gx(70)}px;width:${gx(fw - 12)}px;height:${gx(848)}px;border:${gx(6)}px double ${C.cream};opacity:.85`, L);
      el('div', `left:${gx(96)}px;top:${gx(96)}px;width:${gx(fw - 56)}px;height:${gx(804)}px;border:${gx(2)}px solid ${C.cream};opacity:.5`, L);
      const tp = R.super(L, top ?? [brand.name, brand.issue].filter(Boolean).join(' · '), { y: 150, size: 40, weight: 700, anchor: 'c', a, b, ls: '.4em', color: '#c9c0ae', noFact: !top });
      const mn = R.super(L, main, { y: 500 - size * 0.62 - (sub ? 50 : 0), size, anchor: 'c', a: a + 0.15, b, kind: 'headline', ls: '.08em' });
      const sb = sub ? R.super(L, sub, { y: 500 + size * 0.62 - 10, size: 58, weight: 700, anchor: 'c', a: a + 0.45, b, ls: '.12em', color: C.dim }) : null;
      F.sfx(a + 0.15, 'stamp', 0.7);
      return { tp, mn, sb };
    };
    R.ident = ({ at = 0, until } = {}) => {
      const b = until ?? at + 3;
      const L = R.shot(at, b, { bg: '#0b0a08', cut: false });
      const rays = el('div', `left:${GW / 2 - gx(1100)}px;top:${GH / 2 - gx(1100)}px;width:${gx(2200)}px;height:${gx(2200)}px;border-radius:50%;background:repeating-conic-gradient(from 0deg, rgba(239,230,210,.16) 0deg 6deg, rgba(0,0,0,0) 6deg 15deg)`, L);
      el('div', `left:${GW / 2 - gx(360)}px;top:${GH / 2 - gx(300)}px;width:${gx(720)}px;height:${gx(600)}px;border-radius:50%;background:#0b0a08;border:${gx(8)}px double ${C.cream}`, L);
      F.add((t) => set(rays, { transform: `rotate(${(t * 14).toFixed(2)}deg)` }));
      R.super(L, brand.name, { y: 380, size: 150, anchor: 'c', a: at + 0.35, b, kind: 'logo', ls: '.18em', noFact: true });
      if (brand.en) R.super(L, brand.en, { y: 580, size: 46, font: FONT.caps, weight: 700, anchor: 'c', a: at + 0.75, b, ls: '.3em', color: C.dim, noFact: true });
      if (brand.issue) R.super(L, brand.issue, { y: 660, size: 40, weight: 700, anchor: 'c', a: at + 1.1, b, ls: '.3em', color: C.muted, noFact: true });
      R.iris(at, at + 0.6, 1);
      F.musicCue(at + 0.35, 'hit');
      return L;
    };

    // ---------- photographs ----------
    const creditLine = (c) => [c.title, c.date, c.author, c.licence].filter(Boolean).join(' · ');
    // a picture (photo or clip) filling the gate or a box, pushing slowly from `from` to `to` ({ s: scale, x, y: focus 0–1 }) over [a, b]
    const framed = (L, file, { a, b, from = { s: 1.02, x: 0.5, y: 0.5 }, to = { s: 1.1, x: 0.5, y: 0.5 }, pos = '50% 50%', box }) => {
      const bx = box || { x: 0, y: 0, w: GU, h: 1000 };
      const wrap = el('div', `left:${gx(bx.x)}px;top:${gx(bx.y)}px;width:${gx(bx.w)}px;height:${gx(bx.h)}px;overflow:hidden`, L);
      const img = el('img', `left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${pos};transform-origin:50% 50%`, wrap);
      if (file) img.src = 'assets/' + file;
      F.add((t) => {
        if (t < a - 0.05 || t > b + 0.05) return;
        const q = seg(t, a, b, E.sine), s = from.s + (to.s - from.s) * q, fx = from.x + (to.x - from.x) * q, fy = from.y + (to.y - from.y) * q;
        set(img, { transform: `translate(${((0.5 - fx) * (s - 1) * gx(bx.w)).toFixed(1)}px,${((0.5 - fy) * (s - 1) * gx(bx.h)).toFixed(1)}px) scale(${s.toFixed(4)})` });
      });
      return { wrap, img };
    };
    // the source tag and the CREDITS line come from the manifest's credit (footage.mjs writes it); without one the film still says it is archive
    const sourced = (m, key, kind, o) => {
      if (m.credit) F.credit({ ...m.credit, file: m.file || `clips/${key}` });
      else console.warn(M(`newsreel：${kind === 'clip' ? '片段' : '图片'} "${key}" 没有来源 / 许可信息（用 footage.mjs 下载，或者在 assets/src/${key}.json 里写 { title, author, licence, url }）`, `newsreel: ${kind} "${key}" has no source / licence (fetch it with footage.mjs, or write { title, author, licence, url } in assets/src/${key}.json)`));
      const label = kind === 'clip' ? M('资料影片', 'Archive film') : M('资料照片', 'Archive photo');
      if (o.tag !== false) R.tag(typeof o.tag === 'string' ? o.tag : `${label}${m.credit ? ' · ' + creditLine(m.credit) : ''}`, o.a, o.b);
    };
    R.photo = (L, key, o = {}) => {
      const m = (window.MEDIA_ASSETS && window.MEDIA_ASSETS.images[key]) || null;
      if (!m) throw new Error(M(`newsreel：assets/manifest.js 里没有图片 "${key}"（放进 assets/src/，跑 assets.mjs）`, `newsreel: no image "${key}" in assets/manifest.js (put it in assets/src/ and run assets.mjs)`));
      const { wrap } = framed(L, m.file, o);
      sourced(m, key, 'photo', o);
      F.info('photo', o.a, o.b);
      return wrap;
    };
    // a film clip: which frame shows is computed from t (frames extracted at the source's own rate keep its cadence); the frame waits for its decode
    R.clip = (L, key, o = {}) => {
      const c = (window.MEDIA_ASSETS && window.MEDIA_ASSETS.clips[key]) || null;
      if (!c) throw new Error(M(`newsreel：assets/manifest.js 里没有视频片段 "${key}"（放进 assets/src/，跑 assets.mjs）`, `newsreel: no clip "${key}" in assets/manifest.js (put it in assets/src/ and run assets.mjs)`));
      const { a, b, rate = 1 } = o, from = o.from ?? 0, last = (c.frames - 1) / c.fps, to = Math.min(o.to ?? last, last);
      const push = o.push || { from: { s: 1.0, x: 0.5, y: 0.5 }, to: { s: 1.0, x: 0.5, y: 0.5 } };
      const { wrap, img } = framed(L, null, { a, b, from: push.from, to: push.to, pos: o.pos, box: o.box });
      const runs = (to - from) / rate;
      if (b - a > runs + 0.1) console.warn(M(`newsreel：片段 "${key}" 在 ${(a + runs).toFixed(1)}s 放完，镜头到 ${b.toFixed(1)}s 才切：最后一格会定住（缩短镜头、调慢 rate，或换一段）`, `newsreel: clip "${key}" runs out at ${(a + runs).toFixed(1)}s but the shot lasts until ${b.toFixed(1)}s: its last frame will hold (shorten the shot, lower rate, or use a longer stretch)`));
      let cur = '';
      F.add((t) => {
        if (t < a - 0.05 || t > b + 0.05) return;
        const ct = Math.min(to, from + Math.max(0, t - a) * rate), i = Math.min(c.frames, Math.floor(ct * c.fps + 1e-6) + 1);
        const url = `assets/clips/${key}/${String(i).padStart(4, '0')}.jpg`;
        if (url === cur) return;
        cur = url; img.src = url;
        return img.decode().catch(() => {});   // the screenshot waits for this frame's picture
      });
      sourced(c, key, 'clip', o);
      F.info('clip', a, b);
      F.live(a, Math.min(b, a + runs));   // the film playing is the action (until it runs out)
      return wrap;
    };

    // ---------- the animated diagram (reconstruction) ----------
    R.diagram = (L, o = {}) => {
      const svg = svgEl('svg', { viewBox: `0 0 ${GU} 1000`, width: GW, height: GH, style: 'position:absolute;left:0;top:0' }, L);
      if (o.grid !== false) { const grid = svgEl('g', { stroke: 'rgba(239,230,210,.07)', 'stroke-width': 1 }, svg); for (let x = 0; x <= GU; x += 50) svgEl('line', { x1: x, y1: 0, x2: x, y2: 1000 }, grid); for (let y = 0; y <= 1000; y += 50) svgEl('line', { x1: 0, y1: y, x2: GU, y2: y }, grid); }
      const D2 = { svg };
      D2.path = (d, attrs = {}) => svgEl('path', { d, fill: 'none', stroke: C.cream, 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...attrs }, svg);
      D2.line = (x1, y1, x2, y2, attrs = {}) => svgEl('line', { x1, y1, x2, y2, stroke: C.cream, 'stroke-width': 4, ...attrs }, svg);
      D2.circle = (cx, cy, r, attrs = {}) => svgEl('circle', { cx, cy, r, fill: 'none', stroke: C.cream, 'stroke-width': 4, ...attrs }, svg);
      D2.g = (attrs = {}) => svgEl('g', attrs, svg);
      D2.el = svgEl;
      // draw a stroke on between a and a + dur (call after it is in the DOM)
      D2.draw = (e, a, dur = 0.9) => { F.prep(() => { const len = e.getTotalLength ? e.getTotalLength() : 1000; e.setAttribute('stroke-dasharray', len); e._len = len; }); F.add((t) => { const len = e._len ?? 1000; e.setAttribute('stroke-dashoffset', (len * (1 - seg(t, a, a + dur, E.cubicInOut))).toFixed(1)); }); return e; };
      if (o.a !== undefined) F.info('diagram', o.a, o.b ?? F.duration);   // pass a / b so the information check counts this shot
      return D2;
    };

    // ---------- period information pieces ----------
    R.calendar = (L, { a, b, title, pages, stamp = M('延期', 'DELAYED'), note }) => {
      if (title) R.super(L, title, { y: 70, size: 54, weight: 700, anchor: 'c', a, b, ls: '.3em', color: C.dim });
      const PW = 500, PH = 600, PX = (GU - PW) / 2, PY = 170;
      pages.forEach((pg, i) => {
        const next = pages[i + 1] ? pages[i + 1].at : b + 1, last = i === pages.length - 1;
        const p = el('div', `left:${gx(PX)}px;top:${gx(PY)}px;width:${gx(PW)}px;height:${gx(PH)}px;background:${C.paper};border:${gx(3)}px solid #2b261f;box-shadow:0 ${gx(10)}px ${gx(30)}px rgba(0,0,0,.6);transform-origin:50% 0;z-index:${40 - i};display:none`, L);
        el('div', `left:0;right:0;top:0;height:${gx(90)}px;background:#2b261f`, p);
        for (let k = 0; k < 6; k++) el('div', `left:${gx(60 + k * 76)}px;top:${gx(30)}px;width:${gx(26)}px;height:${gx(26)}px;border-radius:50%;background:${C.paper}`, p);
        const yr = el('div', `left:0;right:0;top:${gx(170)}px;text-align:center;font:700 ${gx(210)}px/1 ${FONT.caps};color:${C.ink};letter-spacing:.02em`, p, pg.label);
        const showA = i === 0 ? a : pg.at - 0.08, showB = last ? b : next + 0.3;
        F.text(yr, 'label', pg.label, showA, showB, { overlap: true });   // the pages are stacked on purpose: the one below shows as the top one flies off
        if (!last && stamp) {
          const st = el('div', `left:${gx(90)}px;top:${gx(390)}px;font:900 ${gx(110)}px/1 ${FONT.serif};color:#2b261f;border:${gx(8)}px double #2b261f;padding:${gx(4)}px ${gx(28)}px;transform:rotate(-12deg);opacity:0;letter-spacing:.1em`, p, stamp);
          F.text(st, 'label', stamp, pg.at + 0.05, next + 0.3, { overlap: true, noFact: true });
          F.sfx(pg.at + 0.05, 'stamp', 0.4); F.sfx(next - 0.05, 'page', 0.4, { dur: 0.35 });
          F.add((t) => { const q = seg(t, pg.at + 0.05, pg.at + 0.17, E.expoOut); set(st, { opacity: t >= pg.at + 0.05 ? 1 : 0, transform: `rotate(-12deg) scale(${(1.5 - 0.5 * q).toFixed(3)})` }); });
        }
        const flyA = next - 0.08, flyB = next + 0.3;
        if (!last) p.dataset.motion = 'exit';   // torn off and thrown out of frame: fast on purpose
        F.add((t) => {
          if (!(t >= showA && t < showB)) { set(p, { display: 'none' }); return; }
          const q = last ? 0 : seg(t, flyA, flyB, E.expoIn);
          set(p, { display: '', transform: q > 0 ? `translate(${(q * gx(-760)).toFixed(1)}px,${(q * gx(140)).toFixed(1)}px) rotate(${(-q * 24).toFixed(2)}deg)` : 'none', opacity: (1 - q * 0.9).toFixed(3) });
        });
      });
      if (note) R.super(L, note.text, { y: 805, size: 52, anchor: 'c', a: note.at, b, weight: 700 });
      F.info('chart', a, b);
    };
    R.stopwatch = (L, { a, b, from, to, value, label, unit = M('秒', 's'), note, x = 430, y = 540, r = 290 }) => {
      const svg = svgEl('svg', { viewBox: `0 0 ${GU} 1000`, width: GW, height: GH, style: 'position:absolute;left:0;top:0' }, L);
      svgEl('rect', { x: x - 40, y: y - r - 90, width: 80, height: 60, rx: 10, fill: '#2b261f', stroke: C.cream, 'stroke-width': 4 }, svg);
      svgEl('circle', { cx: x, cy: y, r: r + 22, fill: '#2b261f', stroke: C.cream, 'stroke-width': 6 }, svg);
      svgEl('circle', { cx: x, cy: y, r, fill: C.paper }, svg);
      for (let k = 0; k < 100; k++) { const an = (k / 100) * Math.PI * 2 - Math.PI / 2, l = k % 10 === 0 ? 36 : 14; svgEl('line', { x1: x + Math.cos(an) * (r - 8), y1: y + Math.sin(an) * (r - 8), x2: x + Math.cos(an) * (r - 8 - l), y2: y + Math.sin(an) * (r - 8 - l), stroke: C.ink, 'stroke-width': k % 10 === 0 ? 5 : 2 }, svg); }
      for (let k = 0; k < 10; k++) { const an = (k / 10) * Math.PI * 2 - Math.PI / 2, tx = svgEl('text', { x: x + Math.cos(an) * (r - 80), y: y + Math.sin(an) * (r - 80) + 14, 'text-anchor': 'middle', 'font-family': 'Oswald', 'font-weight': 700, 'font-size': 40, fill: C.ink }, svg); tx.textContent = k ? `.${k}` : '0'; }
      const hand = svgEl('line', { x1: x, y1: y + 40, x2: x, y2: y - r + 30, stroke: C.ink, 'stroke-width': 7, 'stroke-linecap': 'round' }, svg);
      svgEl('circle', { cx: x, cy: y, r: 16, fill: C.ink }, svg);
      const sweep = svgEl('path', { d: '', fill: 'rgba(21,18,14,.18)' }, svg);
      F.sfx(from, 'tick', 0.6); F.sfx(to, 'tick', 0.9);
      const tx = x + r + 110;
      if (label) R.super(L, label, { x: tx, y: 230, size: 62, a: from, b });
      R.stamp(L, `${value} ${unit}`, { x: tx, y: 360, size: 116, rot: -5, a: to, b });
      if (note) R.super(L, note.text, { x: tx, y: 640, size: 56, a: note.at ?? to + 0.3, b });
      F.info('chart', a, b);
      F.add((t) => {
        if (t < a || t >= b) return;
        const v = Math.min(1, Number(value) || 0) * seg(t, from, to, E.lin), an = v * 360;   // one turn of the dial = 1 s
        hand.setAttribute('transform', `rotate(${an.toFixed(2)} ${x} ${y})`);
        const ang = v * Math.PI * 2 - Math.PI / 2, large = v > 0.5 ? 1 : 0;
        sweep.setAttribute('d', v > 0.002 ? `M${x},${y} L${x},${y - r} A${r},${r} 0 ${large} 1 ${x + Math.cos(ang) * r},${y + Math.sin(ang) * r} Z` : '');
      });
    };
    R.ledger = (L, { a, b, title, cols, rows, stamp }) => {
      set(L, { background: C.paper });
      el('div', `left:${gx(60)}px;top:${gx(60)}px;width:${gx(GU - 132)}px;height:${gx(868)}px;border:${gx(6)}px double ${C.ink}`, L);
      if (title) R.super(L, title, { y: 95, size: 60, anchor: 'c', a: a + 0.05, b, color: C.ink });
      for (const c of cols) R.super(L, c.label, { x: c.x, y: 215, size: 42, weight: 700, a: a + 0.2, b, color: '#4a4339', ls: '.2em' });
      el('div', `left:${gx(100)}px;top:${gx(280)}px;width:${gx(GU - 200)}px;height:${gx(3)}px;background:${C.ink}`, L);
      const step = Math.min(130, 520 / Math.max(1, rows.length));
      rows.forEach((r, i) => {
        const y = 320 + i * step;
        r.cells.forEach((cell, j) => {
          const c = cols[j], latin = /^[\w$€£¥%.,+\-\s]+$/.test(String(cell));
          R.super(L, String(cell), { x: c.x, y: y + (j ? 4 : 0), size: j === 0 ? 62 : latin ? 58 : 52, font: latin ? FONT.caps : FONT.serif, weight: latin ? 700 : 900, a: (r.atCells && r.atCells[j]) ?? r.at + j * 0.1, b, color: C.ink, ls: '.02em' });
        });
      });
      if (stamp) R.stamp(L, stamp.text, { x: GU - 540, y: 720, size: 64, rot: -3, a: stamp.at, b, color: C.ink });
      F.info('chart', a, b);
    };
    R.verdict = (L, { a, b, left, right }) => {
      const mid = GU / 2;
      el('div', `left:${gx(mid)}px;top:${gx(150)}px;width:${gx(4)}px;height:${gx(700)}px;background:${C.cream};opacity:.6`, L);
      R.super(L, left.title, { x: 120, y: 120, size: 64, a: a + 0.05, b });
      R.super(L, right.title, { x: mid + 75, y: 120, size: 64, a: a + 0.05, b });
      (left.items || []).forEach((it, i) => R.super(L, '✓ ' + it.text, { x: 120, y: 290 + i * 110, size: 56, weight: 700, a: it.at, b, text: it.text, color: '#e0d7c4' }));
      (right.items || []).forEach((it, i) => R.super(L, '✗ ' + it.text, { x: mid + 75, y: 290 + i * 110, size: 56, weight: 700, a: it.at, b, text: it.text }));
      F.info('compare', a, b);
    };

    // ---------- the end: 完, then the credits (from F.credit) ----------
    R.end = ({ a, b, main = M('完', 'THE END'), sub, sources = [], notes = [], roll } = {}) => {
      const cr = F.credits || [];
      const e2 = sources.length || notes.length || cr.length ? Math.min(b, roll ?? a + Math.max(2.2, (b - a) * 0.45)) : b;
      const L = R.shot(a, e2, { bg: '#0b0a08' });
      F.scene(a, b, { end: true });   // the end card: the information check doesn't ask it for a picture
      R.card(L, { a, b: e2, main, sub, size: 260 });
      F.musicCue(a + 0.15, 'name');
      if (e2 < b) {
        const L2 = R.shot(e2, b, { bg: '#0b0a08' });
        const lines = [];
        if (sources.length) { lines.push([M('资料来源', 'Sources'), 52, C.cream, 900]); for (const s of sources) lines.push([s, 32, C.dim, 700]); }
        // one line per author + licence: titles are long and often in another language; the per-file list is in out/CREDITS.txt
        const groups = [];
        for (const c of cr) { const k = [c.author, c.licence].filter(Boolean).join(' · ') || c.title || c.file; if (!groups.includes(k)) groups.push(k); }
        if (groups.length) { lines.push([M('图片', 'Pictures'), 52, C.cream, 900]); for (const k of groups.slice(0, 6)) lines.push([k, 30, C.dim, 700]); }
        for (const n of notes) lines.push([n, 30, '#a9a090', 700]);
        let y = 120;
        lines.forEach(([s, size, color, w], i) => { R.super(L2, s, { y, size, anchor: 'c', a: e2 + 0.1 + i * 0.35, b, weight: w, color, ls: '.04em', noFact: true }); y += size * 1.8 + (size > 40 ? 12 : 0); });
      }
      R.iris(b - 0.7, b - 0.05, -1);
    };

    return R;   // the pieces register their own information kinds (F.info) with their a / b
  };
})();
