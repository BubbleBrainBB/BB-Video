// trailer.js: the movie trailer (电影预告片) style, one of bb-video's visual styles (style notes in styles/trailer/STYLE.md). Load after promo.js.
// One frame: a 2.39:1 letterbox on black; inside it code-painted cinematic shots (skies, space, planets, ridges, cities, silhouettes, light and weather)
// in depth layers with a slow push, parallax and rack focus, under a film grade (teal-orange and others), grain and a vignette. Between the shots, black
// title cards with one phrase each in metallic or glowing type; flashes, smash cuts, a cut rate that speeds up, a hard silence, the title slam, a release
// card and the dense billing block. An invented studio ident opens it; real studios' logos, idents and trade dress are never used.
//
//   const R = PROMO.trailer(F, { gate: 2.39 | 1.85 | 'full' | number, grade, grain: 0–1, vignette: 0–1, fonts, colors, captions })
//   Everything inside the gate is laid out in gate units: gate height = 1000, width R.GU (2390 at 2.39; portrait default 4:5 → 800). R.g(v) → px.
//   grade: 'teal-orange' (default) | 'cold' | 'warm' | 'bleach' | 'night' | 'none' | { shadows: [r, g, b], highlights: [r, g, b], contrast, saturate, lift }
//
//   SHOTS   const S = R.shot(a, b, { cut, fadeIn, fadeOut, grade, bg })   a painted shot in [a, b) (hard cut unless cut: false / fadeIn)
//           S.cam({ s, x, y, r } from, { … } to, ease)   camera over the shot: s = push (1.06 = 6 %), x / y = drift (fraction of the gate), r = roll (deg)
//           S.focus(f0, f1, ta, tb, aperture)            rack focus: the depth in focus moves from f0 to f1 between ta and tb
//           S.layer({ z, paint(c, U), draw(c, U, t, q), blend, opacity, res })   a canvas layer at depth z (1 = subject, 3–8 = far, 0.5 = near);
//                paint once (cached), draw every frame. c is in gate units; U = { W, H, x0, y0, x1, y1 } (the visible gate is 0..W × 0..1000)
//           S.group(z) → a div at depth z for DOM pieces;  S.text(text, { x, y, size, a, b, anchor, font, weight, color, glow, type, kind, z })
//           S.flare({ x, y, z, a, b, color, size, streak, power(t) })   an anamorphic flare: a horizontal streak, a glow and ghosts
//           S.image(key, { z, a, b, pos, fit })   a licence-clean picture from assets/manifest.js (its credit goes to out/CREDITS.txt)
//   CARDS   R.card(a, b, text, { kind: 'story' | 'date' | 'cast' | 'tagline', sub, role, look, enter, exit, size, sfx })
//           look: 'metal' | 'glow' | 'gold' | 'red' | 'plain';  enter: 'fade' | 'cut' | 'rise' | 'flicker' | 'slam';  exit: 'fade' | 'cut'
//   CUTS    R.flash(t, { dur, peak, color, sfx })   R.smash(t, { flash, sfx })   R.black(a, b)   R.dip(a, b)   R.leak(a, b, { color, from, to })
//           R.ramp(a, b, { first, last, snap }) → [[a0, b0], …] shot spans whose length shrinks from first to last (the act-three acceleration)
//           R.silence(a, b, { energy, name })   full silence in [a, b], the music comes back at b (keep it ≤ 1 s)
//           R.pulse(a, b, { every, type, gain, accent })   a ticking clock / heartbeat / sonar: one sound every `every` s (default a beat)
//   END     R.title({ a, b, main, en, sub, look, enter: 'slam' | 'emerge', silence, size })   the title slam (or emerge), with its silence beat before it
//           R.release({ a, b, line, date, note })   R.billing({ a, b, top, cast, title, credits: [{ role, name }], logos, foot, stagger })
//           R.ident({ a, b, name, en })   an invented studio ident: a point of light, an anamorphic streak, the wordmark
//   PAINT   R.paint.sky / stars / nebula / glow / sun / planet / ridge / skyline / sea / clouds / fog / rays / figure / station / dish / window /
//           corridor / screen / wave / particles — each (c, U, o) draws in gate units; dynamic ones take o.t
// Times: a = in, b = out. Sounds the runtime emits (styles/trailer/sound.js): whoosh, impact, boom, braam, subdrop, swell, flash, ident, shine, type.
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('trailer.js 要在 promo.js 之后加载', 'trailer.js must load after promo.js'));
  const { E, seg, set, el } = P;
  const rnd = (s) => window.EV.rng(s);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, q) => a + (b - a) * q;
  const cjk = (s) => (String(s).match(/[㐀-鿿豈-﫿]/g) || []).length;

  // ---------- grades: per-channel curves (an SVG filter), so shadows and highlights can be tinted apart ----------
  const GRADES = {
    'teal-orange': { shadows: [-0.07, 0.015, 0.08], highlights: [0.08, 0.025, -0.07], contrast: 0.32, saturate: 1.05, lift: 0.025 },
    cold: { shadows: [-0.05, 0.01, 0.08], highlights: [-0.02, 0.02, 0.05], contrast: 0.3, saturate: 0.78, lift: 0.035 },
    warm: { shadows: [0.03, 0.0, -0.04], highlights: [0.08, 0.035, -0.06], contrast: 0.25, saturate: 1.08, lift: 0.03 },
    bleach: { shadows: [0, 0, 0.01], highlights: [0.02, 0.01, 0], contrast: 0.55, saturate: 0.45, lift: 0.02 },
    night: { shadows: [-0.05, 0.0, 0.09], highlights: [-0.03, 0.0, 0.06], contrast: 0.38, saturate: 0.7, lift: 0.02 },
    none: null,
  };
  let gradeN = 0;
  const gradeFilter = (spec) => {
    const g = typeof spec === 'string' ? GRADES[spec] : spec;
    if (!g) return 'none';
    const id = `tr-grade-${++gradeN}`, N = 17, tab = (ch) => Array.from({ length: N }, (_, i) => {
      const x = i / (N - 1), sm = x * x * (3 - 2 * x);
      let y = lerp(x, sm, g.contrast ?? 0.3);
      y += (g.shadows || [0, 0, 0])[ch] * 4 * x * (1 - x) * (1 - x) * 1.7 + (g.highlights || [0, 0, 0])[ch] * 4 * x * x * (1 - x) * 1.7;
      y = (g.lift ?? 0) + y * (1 - (g.lift ?? 0));
      return clamp(y).toFixed(4);
    }).join(' ');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.style.position = 'absolute';
    svg.innerHTML = `<filter id="${id}" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="table" tableValues="${tab(0)}"/><feFuncG type="table" tableValues="${tab(1)}"/><feFuncB type="table" tableValues="${tab(2)}"/></feComponentTransfer><feColorMatrix type="saturate" values="${g.saturate ?? 1}"/></filter>`;
    document.body.appendChild(svg);
    return `url(#${id})`;
  };

  P.trailer = function (F, opt = {}) {
    const W = F.W, H = F.H, PT = F.portrait;
    const C = { black: '#060606', silver: '#e9e6e0', dim: '#a8a39b', gold: '#f2d9a6', red: '#c8321e', glow: '#fff4e6', ...(opt.colors || {}) };
    const FONT = { serif: '"Noto Serif SC", "Songti SC", serif', sans: '"Noto Sans SC", "PingFang SC", sans-serif', latin: 'Cinzel, "Noto Serif SC", serif', cond: 'Oswald, "Noto Sans SC", sans-serif', ...(opt.fonts || {}) };
    const R = { F, colors: C, fonts: FONT };
    F.stillMax(1.0);      // a trailer holds a black card or a beat of black on purpose
    F.blurBase(1);        // the camera only pushes slowly; quick moves register their own F.blur spans

    // ---------- the gate (letterbox) ----------
    const AR = opt.gate === 'full' ? W / H : opt.gate ?? (PT ? 0.8 : 2.39);
    const GW = W, GH = Math.min(H, Math.round(W / AR)), GX = 0, GY = Math.round((H - GH) / 2), g = GH / 1000, GU = Math.round(1000 * GW / GH);
    Object.assign(R, { GW, GH, GX, GY, GU, g: (v) => v * g });
    const gx = R.g;
    F.stage.style.background = '#000';
    const gate = el('div', `left:${GX}px;top:${GY}px;width:${GW}px;height:${GH}px;overflow:hidden;background:#000;z-index:10`, F.stage);
    const pics = el('div', 'inset:0', gate);                                             // shots and cards, in time order
    const vig = el('div', `inset:0;z-index:40;pointer-events:none;background:radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,${(0.62 * (opt.vignette ?? 0.6)).toFixed(2)}) 100%)`, gate); vig.dataset.motion = 'skip';
    const fx = el('div', 'inset:0;z-index:45;pointer-events:none', gate);                // leaks
    const flashL = el('div', 'inset:0;z-index:48;pointer-events:none;opacity:0;background:#fff', gate); flashL.dataset.motion = 'skip';
    R.gate = gate; R.pics = pics;
    const defGrade = gradeFilter(opt.grade ?? 'teal-orange'), gradeCache = new Map();
    const gradeOf = (gr) => (gr === undefined ? defGrade : gr === false ? 'none' : (gradeCache.has(JSON.stringify(gr)) ? gradeCache.get(JSON.stringify(gr)) : (gradeCache.set(JSON.stringify(gr), gradeFilter(gr)), gradeCache.get(JSON.stringify(gr)))));

    // grain: a few noise tiles made once, one shown per frame, stepping at 24 fps like film
    const GA = opt.grain ?? 0.35, GR = 3, NT = 8, tiles = [];
    if (GA > 0) {
      const box = el('div', `inset:0;z-index:42;pointer-events:none;mix-blend-mode:overlay;opacity:${GA.toFixed(2)}`, gate); box.dataset.motion = 'skip';
      for (let k = 0; k < NT; k++) {
        const cv = el('canvas', `inset:0;width:${GW}px;height:${GH}px;display:none`, box); cv.width = Math.ceil(GW / GR); cv.height = Math.ceil(GH / GR); cv.dataset.motion = 'skip';
        const ctx = cv.getContext('2d'), img = ctx.createImageData(cv.width, cv.height), r = rnd(k * 7919 + 31);
        for (let i = 0; i < img.data.length; i += 4) { const v = 128 + ((r() + r() + r() - 1.5) * 150) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = clamp(v, 0, 255); img.data[i + 3] = 255; }
        ctx.putImageData(img, 0, 0); tiles.push(cv);
      }
      let last = -1;
      F.add((t) => { const k = Math.floor(t * 24 + 1e-6) % NT; if (k !== last) { if (last >= 0) tiles[last].style.display = 'none'; tiles[k].style.display = ''; last = k; } });
    }
    // narrated: dialogue subtitles sit in the lower letterbox bar, plain white, the way trailers subtitle their lines
    if (F.T && F.voiced && !F.caps) {
      const bar = H - GY - GH, size = PT ? 44 : 38;
      P.captions(F, { font: FONT.sans, weight: 500, size, bg: 'rgba(0,0,0,0)', color: '#f2f0ec', top: bar > F.px(size * 1.6) ? GY + GH + (bar - F.px(size * 1.75)) / 2 : H * 0.84, ...(opt.captions || {}) });
    }

    // ---------- shots ----------
    const shots = [];
    R.shot = (a, b, o = {}) => {
      const L = el('div', `left:0;top:0;width:${GW}px;height:${GH}px;overflow:hidden;background:${o.bg ?? '#000'};display:none;filter:${o.card ? 'none' : gradeOf(o.grade)}`, pics);
      const S = { L, a, b, layers: [], _cam: { from: { s: 1, x: 0, y: 0, r: 0 }, to: { s: 1.05, x: 0, y: 0, r: 0 }, ease: E.sine }, _focus: null };
      const fi = o.fadeIn ?? 0, fo = o.fadeOut ?? 0;
      if (fi > 0) F.transition(a, a + fi); else if (o.cut !== false && a > 0.01) F.cut(a);
      if (fo > 0) F.transition(b - fo, b);
      shots.push(S);
      F.add((t) => { const on = t >= a - 1e-6 && t < b; set(L, { display: on ? '' : 'none', opacity: on ? Math.min(fi > 0 ? seg(t, a, a + fi) : 1, fo > 0 ? 1 - seg(t, b - fo, b) : 1).toFixed(3) : '0' }); });
      S.cam = (from = {}, to = {}, ease = E.sine) => { S._cam = { from: { s: 1, x: 0, y: 0, r: 0, ...from }, to: { s: 1, x: 0, y: 0, r: 0, ...to }, ease }; return S; };
      S.camAt = (t) => { const { from: f, to: e, ease } = S._cam, q = seg(t, a, b, ease); return { s: lerp(f.s, e.s, q), x: lerp(f.x, e.x, q), y: lerp(f.y, e.y, q), r: lerp(f.r, e.r, q) }; };
      S.focus = (f0, f1 = f0, ta = a, tb = b, ap = 14) => { S._focus = { f0, f1, ta, tb, ap }; return S; };
      const focusAt = (t) => (S._focus ? { f: lerp(S._focus.f0, S._focus.f1, seg(t, S._focus.ta, S._focus.tb, E.cubicInOut)), ap: S._focus.ap } : null);
      // depth transform: a far layer (z > 1) moves and grows less than the subject, a near one (z < 1) more
      const depthCss = (t, z, extraBlur = 0) => {
        const c = S.camAt(t), s = 1 + (c.s - 1) / z, fc = focusAt(t), bl = (fc ? fc.ap * Math.abs(1 / z - 1 / fc.f) : 0) + extraBlur;
        return { transform: `translate(${(-c.x * GW / z).toFixed(2)}px,${(-c.y * GH / z).toFixed(2)}px) scale(${s.toFixed(5)}) rotate(${c.r.toFixed(3)}deg)`, filter: bl > 0.15 ? `blur(${gx(bl).toFixed(2)}px)` : 'none' };
      };
      S.layer = (lo = {}) => {
        const z = lo.z ?? 1, over = lo.over ?? (z < 1 ? 1.35 : 1.14), res = lo.res ?? 1;
        const cw = Math.round(GW * over), ch = Math.round(GH * over);
        const cv = el('canvas', `left:${(GW - cw) / 2}px;top:${(GH - ch) / 2}px;width:${cw}px;height:${ch}px;transform-origin:${cw / 2}px ${ch / 2}px;${lo.blend ? `mix-blend-mode:${lo.blend};` : ''}${lo.opacity !== undefined ? `opacity:${lo.opacity};` : ''}`, L);
        const k = g * res, ox = ((cw - GW) / 2) * res, oy = ((ch - GH) / 2) * res;
        const U = { W: GU, H: 1000, x0: -ox / k, y0: -oy / k, x1: GU + ox / k, y1: 1000 + oy / k, seed: lo.seed ?? shots.length * 101 + S.layers.length * 7 };
        let ready = false, base = null;   // base: the painted part kept aside when the layer also draws every frame
        const ctx = cv.getContext('2d');
        const prime = () => {
          cv.width = Math.round(cw * res); cv.height = Math.round(ch * res); ctx.setTransform(k, 0, 0, k, ox, oy);
          if (lo.paint && lo.draw) { base = document.createElement('canvas'); base.width = cv.width; base.height = cv.height; const bc = base.getContext('2d'); bc.setTransform(k, 0, 0, k, ox, oy); lo.paint(bc, U); }
          else if (lo.paint) lo.paint(ctx, U);
          ready = true;
        };
        const layer = { cv, z, U };
        S.layers.push(layer);
        F.add((t) => {
          if (t < a - 0.05 || t >= b + 0.05) { if (ready && (t < a - 3 || t > b + 3)) { cv.width = 1; cv.height = 1; base = null; ready = false; } return; }   // free the pixels of shots far from now
          if (!ready) prime();
          if (lo.draw) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); if (base) ctx.drawImage(base, 0, 0); ctx.setTransform(k, 0, 0, k, ox, oy); lo.draw(ctx, U, t, seg(t, a, b)); }
          set(cv, depthCss(t, z, lo.blur ?? 0));
        });
        return layer;
      };
      S.group = (z = 1) => {
        const d = el('div', `left:0;top:0;width:${GW}px;height:${GH}px;transform-origin:${GW / 2}px ${GH / 2}px`, L);
        F.add((t) => { if (t >= a - 0.05 && t < b + 0.05) set(d, depthCss(t, z)); });
        return d;
      };
      // text inside the picture (an in-world screen, a letter, a location super): kind 'label' by default; type: true types it on
      S.text = (text, to = {}) => {
        const { x = GU / 2, y = 500, size = 40, anchor = 'c', font = FONT.sans, weight = 500, color = C.silver, glow = 0, z = 1, kind = 'label', ls = '.12em', noFact, chrome } = to;
        const ta = to.a ?? a, tb = to.b ?? b, grp = S.group(z);
        const box = el('div', `${anchor === 'c' ? `left:${gx(x) - GW}px;width:${GW * 2}px;text-align:center` : anchor === 'r' ? `right:${GW - gx(x)}px;text-align:right` : `left:${gx(x)}px`};top:${gx(y)}px;opacity:0`, grp);
        const sp = el('span', `position:relative;display:inline-block;white-space:pre;font:${weight} ${gx(size)}px/1.25 ${font};letter-spacing:${ls};color:${color};${glow ? `text-shadow:0 0 ${gx(glow)}px ${color},0 0 ${gx(glow * 2.5)}px ${color}` : ''}`, box);
        sp.textContent = text;
        F.text(sp, kind, text, ta, tb, { noFact, chrome, overlap: to.overlap });
        const chars = [...text], typed = !!to.type, cps = to.cps ?? 16;
        if (typed) for (let i = 0; i < chars.length; i += 3) F.sfx(ta + i / cps, 'type', 0.25);
        F.add((t) => {
          const on = t >= ta && t < tb;
          set(box, { opacity: on ? (typed ? 1 : Math.min(1, seg(t, ta, ta + 0.2))).toFixed(3) : '0' });
          if (typed && on) { const n = Math.min(chars.length, Math.floor((P.frameT(t) - ta) * cps) + 1), s2 = chars.slice(0, n).join(''); if (sp.textContent !== s2) sp.textContent = s2; }
        });
        return sp;
      };
      S.flare = (fo2 = {}) => {
        const { x = GU / 2, y = 500, z = 1, color = '#9fd2ff', size = 1, streak = 1 } = fo2, fa = fo2.a ?? a, fb = fo2.b ?? b, grp = S.group(z);
        const box = el('div', `left:${gx(x)}px;top:${gx(y)}px;width:0;height:0;mix-blend-mode:screen`, grp);
        const line = el('div', `left:${-gx(1500 * streak)}px;top:${-gx(3 * size)}px;width:${gx(3000 * streak)}px;height:${gx(6 * size)}px;background:linear-gradient(90deg, rgba(0,0,0,0), ${color} 42%, #fff 50%, ${color} 58%, rgba(0,0,0,0));filter:blur(${gx(1.5)}px)`, box);
        const halo = el('div', `left:${-gx(160 * size)}px;top:${-gx(160 * size)}px;width:${gx(320 * size)}px;height:${gx(320 * size)}px;border-radius:50%;background:radial-gradient(circle, rgba(255,255,255,.95) 0%, ${color} 12%, rgba(0,0,0,0) 62%)`, box);
        const ghosts = [0.55, 0.85, 1.3].map((k2, i) => el('div', `left:0;top:0;width:${gx(60 + 50 * i)}px;height:${gx(60 + 50 * i)}px;border-radius:50%;border:${gx(2)}px solid ${color};opacity:.18`, grp));
        F.add((t) => {
          if (t < fa - 0.05 || t >= fb + 0.05) { set(box, { opacity: '0' }); for (const gh of ghosts) set(gh, { opacity: '0' }); return; }
          const p = clamp(fo2.power ? fo2.power(t) : Math.min(seg(t, fa, fa + 0.4), 1 - seg(t, fb - 0.3, fb)), 0, 1.5);
          set(box, { opacity: Math.min(1, p).toFixed(3) }); set(line, { transform: `scaleX(${(0.6 + 0.4 * p).toFixed(3)})` }); set(halo, { transform: `scale(${(0.7 + 0.3 * p).toFixed(3)})` });
          ghosts.forEach((gh, i) => { const k2 = [0.55, 0.85, 1.3][i], gxp = gx(GU / 2) + (gx(GU / 2) - gx(x)) * k2, gyp = gx(500) + (gx(500) - gx(y)) * k2, d = gx(60 + 50 * i); set(gh, { transform: `translate(${(gxp - d / 2).toFixed(1)}px,${(gyp - d / 2).toFixed(1)}px)`, opacity: (0.16 * p).toFixed(3) }); });
        });
        return box;
      };
      S.image = (key, io = {}) => {
        const m = (window.MEDIA_ASSETS && window.MEDIA_ASSETS.images[key]) || null;
        if (!m) throw new Error(M(`trailer：assets/manifest.js 里没有图片 "${key}"（放进 assets/src/，跑 assets.mjs）`, `trailer: no image "${key}" in assets/manifest.js (put it in assets/src/ and run assets.mjs)`));
        if (m.credit) F.credit({ ...m.credit, file: m.file }); else console.warn(M(`trailer：图片 "${key}" 没有来源 / 许可信息（assets/src/${key}.json）`, `trailer: image "${key}" has no source / licence (assets/src/${key}.json)`));
        const grp = S.group(io.z ?? 1), img = el('img', `left:${-GW * 0.07}px;top:${-GH * 0.07}px;width:${GW * 1.14}px;height:${GH * 1.14}px;object-fit:${io.fit ?? 'cover'};object-position:${io.pos ?? '50% 50%'}`, grp);
        img.src = 'assets/' + m.file;
        return img;
      };
      F.info('shot', a, b);   // a painted shot tells the story in pictures (the information check counts it like a photo)
      return S;
    };
    R.shots = shots;

    // ---------- type ----------
    // metallic / glowing type: a gradient clipped to the letters, a soft halo; a light sweep can pass over it
    const LOOKS = {
      metal: `background:linear-gradient(180deg,#fbfaf7 0%,#d9d5ce 38%,#8d8880 50%,#c9c5be 64%,#f1eee8 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 ${'$G'}px rgba(255,244,230,.22))`,
      glow: `color:#f6f3ee;text-shadow:0 0 ${'$G'}px rgba(255,246,232,.55),0 0 ${'$G2'}px rgba(255,236,210,.25)`,
      gold: `background:linear-gradient(180deg,#fff3d6 0%,#e9c789 40%,#9a7442 52%,#d8b273 66%,#fbe6bd 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 ${'$G'}px rgba(255,214,150,.25))`,
      red: `background:linear-gradient(180deg,#ff9a7a 0%,#d2462b 45%,#7d1a0e 55%,#b8321e 70%,#f06a48 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 ${'$G'}px rgba(220,60,30,.35))`,
      plain: 'color:#ece9e3',
    };
    const lookCss = (look, size) => (LOOKS[look] || LOOKS.metal).replace('$G2', gx(size * 0.9).toFixed(1)).replace('$G', gx(size * 0.18).toFixed(1));
    const typeSpan = (parent, text, { size, font, weight, look = 'metal', ls = '.3em', sweep }) => {
      const sp = el('span', `position:relative;display:inline-block;white-space:nowrap;font:${weight} ${gx(size)}px/1.2 ${font};letter-spacing:${ls};margin-right:-${ls};${lookCss(look, size)}`, parent);
      sp.textContent = text;
      if (sweep) {   // the light sweep: a bright band clipped to the same letters, moving across once
        const sw = el('span', `left:0;top:0;white-space:nowrap;font:${weight} ${gx(size)}px/1.2 ${font};letter-spacing:${ls};background:linear-gradient(100deg,rgba(255,255,255,0) 40%,rgba(255,255,255,.95) 50%,rgba(255,255,255,0) 60%);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;mix-blend-mode:screen;pointer-events:none`, sp);
        sw.textContent = text; sw.dataset.motion = 'skip';
        F.add((t) => set(sw, { backgroundPosition: `${(100 - 100 * seg(t, sweep[0], sweep[1], E.cubicInOut)).toFixed(2)}% 0`, opacity: t >= sweep[0] && t < sweep[1] ? '1' : '0' }));
      }
      return sp;
    };

    // ---------- cards ----------
    const KIND = {
      story: { size: 92, font: () => FONT.serif, weight: 600, ls: '.32em' },
      tagline: { size: 110, font: () => FONT.serif, weight: 700, ls: '.28em' },
      date: { size: 170, font: () => FONT.serif, weight: 700, ls: '.18em' },
      cast: { size: 120, font: () => FONT.serif, weight: 600, ls: '.24em' },
    };
    const cards = [];
    R.card = (a, b, text, o = {}) => {
      const kind = o.kind ?? 'story', K = KIND[kind] || KIND.story, size = o.size ?? K.size, enter = o.enter ?? 'fade', exit = o.exit ?? (b - a > 1.2 ? 'fade' : 'cut');
      const fi = enter === 'fade' || enter === 'rise' ? 0.32 : 0, fo = exit === 'fade' ? 0.28 : 0;
      const S = R.shot(a, b, { bg: C.black, card: true, fadeIn: fi, fadeOut: fo, cut: fi === 0 });
      const grp = S.group(1);
      S.cam({ s: 1 }, { s: 1 + (o.drift ?? 0.04) }, E.lin);   // cards creep toward the viewer
      const col = el('div', `left:0;top:0;width:${GW}px;height:${GH}px;display:flex;flex-direction:column;align-items:center;justify-content:center`, grp);
      const font = o.font ?? K.font(), look = o.look ?? 'metal';
      let role = null;
      if (o.role) { role = typeSpan(el('div', `position:relative;margin-bottom:${gx(size * 0.22)}px`, col), o.role, { size: size * 0.32, font: FONT.sans, weight: 400, look: 'plain', ls: '.5em' }); F.text(role, 'label', o.role, a + fi * 0.5, b); }
      const main = typeSpan(el('div', 'position:relative', col), text, { size, font, weight: o.weight ?? K.weight, look, ls: o.ls ?? K.ls, sweep: o.sweep === false ? null : [a + (o.sweepAt ?? Math.min(0.5, (b - a) * 0.25)), a + (o.sweepAt ?? Math.min(0.5, (b - a) * 0.25)) + Math.min(1.4, (b - a) * 0.6)] });
      F.text(main, kind === 'date' ? 'endcard' : 'headline', text, a + fi * 0.5, b);
      let sub = null;
      if (o.sub) { sub = typeSpan(el('div', `position:relative;margin-top:${gx(size * 0.3)}px`, col), o.sub, { size: o.subSize ?? size * 0.42, font: o.subFont ?? FONT.sans, weight: 400, look: 'plain', ls: '.45em' }); F.text(sub, 'label', o.sub, a + fi * 0.5 + 0.15, b); }
      // entrances
      if (enter === 'rise') F.add((t) => set(col, { transform: `translateY(${(gx(26) * (1 - seg(t, a, a + 0.6, E.expoOut))).toFixed(2)}px)` }));
      if (enter === 'slam') { F.add((t) => set(col, { transform: `scale(${(1 + 0.16 * (1 - seg(t, a, a + 0.14, E.expoOut))).toFixed(4)})` })); F.blur(a, a + 0.15, 10); }
      if (enter === 'flicker') { F.transition(a, a + 0.32); F.add((t) => { const k2 = t - a, on = k2 < 0 ? 0 : k2 < 0.05 ? 1 : k2 < 0.1 ? 0.15 : k2 < 0.16 ? 1 : k2 < 0.21 ? 0.4 : 1; set(col, { opacity: on.toFixed(2) }); }); }
      const sfx = o.sfx ?? (enter === 'slam' ? 'impact' : 'whoosh');
      if (sfx) F.sfx(enter === 'slam' || enter === 'cut' ? a : a - 0.12, sfx, o.gain ?? (sfx === 'whoosh' ? 0.45 : 0.9), sfx === 'whoosh' ? { dur: 0.6 } : {});
      cards.push({ a, b, text, kind });
      return { S, main, sub, role };
    };

    // ---------- cuts, flashes, black, dips, leaks ----------
    const flashes = [];
    R.flash = (t, o = {}) => {
      const dur = o.dur ?? 0.16, peak = o.peak ?? 1;
      flashes.push({ t, dur, peak, color: o.color ?? '#fff' });
      F.transition(t - 0.04, t + dur + 0.04);
      if (o.sfx !== false) F.sfx(t, o.sfx ?? 'flash', o.gain ?? 0.6);
    };
    F.add((t) => {
      let v = 0, col = '#fff';
      for (const f of flashes) if (t >= f.t - 0.034 && t < f.t + f.dur) { const q = (t - f.t) / f.dur, k2 = q < 0 ? 0.55 : Math.pow(1 - q, 2.2); if (k2 * f.peak > v) { v = k2 * f.peak; col = f.color; } }
      set(flashL, { opacity: v.toFixed(3), background: col });
    });
    R.smash = (t, o = {}) => { F.cut(t); F.sfx(t, o.sfx ?? 'impact', o.gain ?? 1); if (o.flash) R.flash(t, { dur: 0.1, sfx: false, ...(typeof o.flash === 'object' ? o.flash : {}) }); F.musicCue(t, 'hit'); };
    R.black = (a, b, o = {}) => R.shot(a, b, { bg: '#000', card: true, cut: o.cut });
    const dips = [];
    R.dip = (a, b) => { dips.push([a, b]); F.transition(a, b); };
    const dipL = el('div', 'inset:0;z-index:47;background:#000;opacity:0;pointer-events:none', gate); dipL.dataset.motion = 'skip';
    F.add((t) => { let v = 0; for (const [a, b] of dips) if (t >= a && t < b) { const q = (t - a) / (b - a); v = Math.max(v, q < 0.5 ? E.sine(q * 2) : E.sine((1 - q) * 2)); } set(dipL, { opacity: v.toFixed(3) }); });
    R.leak = (a, b, o = {}) => {
      const col = o.color ?? '#ff8a3d', from = o.from ?? -0.3, to = o.to ?? 1.1;
      const d = el('div', `left:0;top:${-GH * 0.2}px;width:${GW * 0.9}px;height:${GH * 1.4}px;mix-blend-mode:screen;opacity:0;background:radial-gradient(ellipse at 50% 50%, ${col} 0%, rgba(255,120,40,.35) 30%, rgba(0,0,0,0) 65%)`, fx);
      d.dataset.motion = 'skip';
      F.add((t) => { if (t < a || t >= b) { set(d, { opacity: '0' }); return; } const q = seg(t, a, b); set(d, { opacity: (Math.sin(Math.PI * q) * (o.strength ?? 0.55)).toFixed(3), transform: `translateX(${(GW * lerp(from, to, q) - GW * 0.45).toFixed(1)}px)` }); });
      if (o.transition) F.transition(a, b);
    };
    // the act-three acceleration: shot lengths shrink geometrically from `first` to `last` and fill [a, b] exactly; snap = a grid (e.g. half a beat)
    R.ramp = (a, b, o = {}) => {
      const D = b - a, f0 = o.first ?? 1.6, f1 = Math.min(o.last ?? 0.35, f0);
      let best = null;
      for (let n = 2; n <= 60; n++) { const k2 = Math.pow(f1 / f0, 1 / (n - 1)), sum = Math.abs(k2 - 1) < 1e-9 ? f0 * n : (f0 * (1 - Math.pow(k2, n))) / (1 - k2), err = Math.abs(sum - D); if (!best || err < best.err) best = { n, k: k2, sum, err }; }
      const lens = Array.from({ length: best.n }, (_, i) => f0 * Math.pow(best.k, i) * (D / best.sum));
      let t = a; const cuts = [a];
      for (let i = 0; i < lens.length - 1; i++) { t += lens[i]; let c = o.snap ? a + Math.round((t - a) / o.snap) * o.snap : t; if (c <= cuts[cuts.length - 1] + (o.snap || 0.08) * 0.99) c = cuts[cuts.length - 1] + (o.snap || 0.08); if (c >= b - 0.08) break; cuts.push(c); }
      cuts.push(b);
      return cuts.slice(0, -1).map((c, i) => [Math.round(c * 1000) / 1000, Math.round(cuts[i + 1] * 1000) / 1000]);
    };
    // the ticking clock (or a heartbeat, a sonar ping): one sound every `every` seconds over [a, b] — sound design, so it carries the quiet stretches
    R.pulse = (a, b, o = {}) => { const ev = o.every ?? F.B; for (let t = a, i = 0; t < b - 1e-3; t += ev, i++) F.sfx(t, o.type ?? 'tick', (o.gain ?? 0.35) * (o.accent && i % o.accent === 0 ? 1.4 : 1)); };
    const silences = [];
    R.silence = (a, b, o = {}) => { silences.push([a, b]); F.section(b, o.energy ?? 3, { gap: b - a, hush: true, name: o.name ?? 'after-silence', hit: !!o.hit }); };

    // ---------- the studio ident (invented: never a real studio's mark) ----------
    R.ident = ({ a, b, name, en } = {}) => {
      const S = R.shot(a, b, { bg: '#000', card: true, fadeOut: 0.4 });   // after a cold open the ident is a hard cut
      S.cam({ s: 1 }, { s: 1.06 }, E.lin);
      const grp = S.group(1), cx = GW / 2, cy = GH / 2;
      const dot = el('div', `left:${cx - gx(90)}px;top:${cy - gx(90)}px;width:${gx(180)}px;height:${gx(180)}px;border-radius:50%;background:radial-gradient(circle, #fff 0%, rgba(255,226,180,.9) 10%, rgba(255,170,90,.25) 35%, rgba(0,0,0,0) 70%);mix-blend-mode:screen`, grp);
      const streak = el('div', `left:${cx - gx(1300)}px;top:${cy - gx(3)}px;width:${gx(2600)}px;height:${gx(6)}px;background:linear-gradient(90deg, rgba(0,0,0,0), rgba(120,190,255,.9) 40%, #fff 50%, rgba(120,190,255,.9) 60%, rgba(0,0,0,0));filter:blur(${gx(1.2)}px);mix-blend-mode:screen`, grp);
      const col = el('div', `left:0;top:${cy + gx(60)}px;width:${GW}px;display:flex;flex-direction:column;align-items:center`, grp);
      const nm = typeSpan(el('div', 'position:relative', col), name ?? M('远灯影业', 'Farlamp Pictures'), { size: 74, font: FONT.serif, weight: 600, look: 'metal', ls: '.5em', sweep: [a + 1.9, a + 3.0] });
      F.text(nm, 'label', nm.textContent, a + 0.7, b, { noFact: true });
      let enS = null;
      if (en !== false) { enS = typeSpan(el('div', `position:relative;margin-top:${gx(22)}px`, col), en ?? 'FARLAMP PICTURES', { size: 30, font: FONT.latin, weight: 400, look: 'plain', ls: '.7em' }); F.text(enS, 'label', enS.textContent, a + 1.0, b, { noFact: true }); }
      F.add((t) => {
        const p = seg(t, a + 0.1, a + 0.9, E.expoOut), q = seg(t, a + 0.5, a + 1.6, E.cubicInOut);
        set(dot, { opacity: (p * (1 - 0.6 * q)).toFixed(3), transform: `translateY(${(-gx(90) * q).toFixed(1)}px) scale(${(0.3 + 0.7 * p).toFixed(3)})` });
        set(streak, { opacity: (p * (1 - 0.5 * q)).toFixed(3), transform: `translateY(${(-gx(90) * q).toFixed(1)}px) scaleX(${(0.05 + 0.95 * p).toFixed(3)})` });
        set(nm.parentElement, { opacity: seg(t, a + 0.7, a + 1.3).toFixed(3) });
        if (enS) set(enS.parentElement, { opacity: seg(t, a + 1.0, a + 1.6).toFixed(3) });
      });
      F.sfx(a + 0.05, 'swell', 0.55, { dur: 0.9 }); F.sfx(a + 0.9, 'ident', 0.8); F.sfx(a + 1.9, 'shine', 0.35); if (b - a > 3) F.sfx(b - 1.0, 'whoosh', 0.3, { dur: 1.0 });
      return S;
    };

    // ---------- the title, the release card, the billing block ----------
    R.title = ({ a, b, main, en, sub, look = 'metal', enter = 'slam', silence = 0.8, size = 230, font, energy = 3 } = {}) => {
      if (silence > 0) { R.black(a - silence, a); R.silence(a - silence, a, { energy, name: 'title' }); }
      const S = R.shot(a, b, { bg: C.black, card: true, cut: true, fadeOut: 0.35 });
      S.cam({ s: 1 }, { s: 1.05 }, E.lin);
      const grp = S.group(1);
      const halo = el('div', `left:${GW / 2 - gx(900)}px;top:${GH / 2 - gx(260)}px;width:${gx(1800)}px;height:${gx(520)}px;border-radius:50%;background:radial-gradient(ellipse, rgba(255,240,215,.55) 0%, rgba(255,210,160,.12) 40%, rgba(0,0,0,0) 70%);mix-blend-mode:screen;opacity:0`, grp);
      const col = el('div', `left:0;top:0;width:${GW}px;height:${GH}px;display:flex;flex-direction:column;align-items:center;justify-content:center`, grp);
      const mn = typeSpan(el('div', 'position:relative', col), main, { size, font: font ?? FONT.serif, weight: 900, look, ls: '.22em', sweep: [a + 1.4, a + 2.9] });
      F.text(mn, 'headline', main, a, b);
      let enS = null, sb = null;
      if (en) { enS = typeSpan(el('div', `position:relative;margin-top:${gx(size * 0.2)}px`, col), en, { size: size * 0.2, font: FONT.latin, weight: 700, look, ls: '.62em' }); F.text(enS, 'label', en, a + 0.6, b); }
      if (sub) { sb = typeSpan(el('div', `position:relative;margin-top:${gx(size * 0.22)}px`, col), sub, { size: size * 0.17, font: FONT.sans, weight: 400, look: 'plain', ls: '.5em' }); F.text(sb, 'label', sub, a + 0.9, b); }
      if (enter === 'emerge') {   // letters come out of the dark as a band of light passes over them
        mn.style.webkitMaskImage = mn.style.maskImage = 'linear-gradient(90deg, #000 40%, rgba(0,0,0,0) 60%)';
        mn.style.webkitMaskSize = mn.style.maskSize = '300% 100%';
        F.add((t) => { const q = seg(t, a, a + 1.6, E.cubicInOut); mn.style.webkitMaskPosition = mn.style.maskPosition = `${(100 - 100 * q).toFixed(2)}% 0`; });
        F.sfx(a, 'swell', 0.7, { dur: 1.2 }); F.sfx(a + 1.5, 'boom', 1);
      } else {
        R.flash(a, { dur: 0.22, peak: 0.85, sfx: false });
        F.sfx(a, 'braam', 1.1); F.sfx(a, 'boom', 0.9); F.sfx(a + 0.05, 'subdrop', 0.9);
      }
      F.sfx(a + 1.4, 'shine', 0.4);
      F.add((t) => { const h = enter === 'emerge' ? seg(t, a + 1.2, a + 2) * 0.55 : 0.25 + 0.75 * Math.pow(1 - seg(t, a, a + 1.4), 2); set(halo, { opacity: (t >= a && t < b ? h : 0).toFixed(3) }); if (enS) set(enS.parentElement, { opacity: seg(t, a + 0.6, a + 1.1).toFixed(3) }); if (sb) set(sb.parentElement, { opacity: seg(t, a + 0.9, a + 1.4).toFixed(3) }); });
      F.musicCue(a, 'hit');
      R._title = { a, b, silence };
      return S;
    };
    R.release = ({ a, b, line, date, note, look = 'metal' } = {}) => {
      const S = R.shot(a, b, { bg: C.black, card: true, fadeIn: 0.25, fadeOut: 0.3 });
      S.cam({ s: 1 }, { s: 1.035 }, E.lin);
      const col = el('div', `left:0;top:0;width:${GW}px;height:${GH}px;display:flex;flex-direction:column;align-items:center;justify-content:center`, S.group(1));
      let ln = null, nt = null;
      if (line) { ln = typeSpan(el('div', `position:relative;margin-bottom:${gx(34)}px`, col), line, { size: 78, font: FONT.serif, weight: 600, look, ls: '.4em' }); F.text(ln, 'label', line, a + 0.1, b); }
      const dt = typeSpan(el('div', 'position:relative', col), date, { size: 190, font: FONT.serif, weight: 700, look, ls: '.12em', sweep: [a + 1.1, a + 2.4] });
      F.text(dt, 'endcard', date, a + 0.3, b);
      if (note) { nt = typeSpan(el('div', `position:relative;margin-top:${gx(40)}px`, col), note, { size: 44, font: FONT.sans, weight: 400, look: 'plain', ls: '.6em' }); F.text(nt, 'label', note, a + 0.6, b); }
      F.add((t) => { set(dt.parentElement, { opacity: seg(t, a + 0.3, a + 0.6).toFixed(3) }); if (nt) set(nt.parentElement, { opacity: seg(t, a + 0.6, a + 1.0).toFixed(3) }); });
      F.sfx(a + 0.3, 'impact', 0.5); F.sfx(a + 1.1, 'shine', 0.3);
      F.scene(a, b, { end: true });
      return S;
    };
    // the billing block: tall condensed names, tiny roles stacked in two lines beside them (the poster / trailer credit block), invented logos below
    R.billing = (o2 = {}) => {
      const { a, b, top, cast = [], title, credits = [], logos = [], foot } = o2;
      const S = R.shot(a, b, { bg: C.black, card: true, fadeIn: 0.3, fadeOut: 0.3 });
      const box = el('div', `left:${GW * 0.1}px;top:0;width:${GW * 0.8}px;height:${GH}px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#d9d6d0`, S.group(1));
      const SQ = 0.62, mctx = document.createElement('canvas').getContext('2d');   // horizontal squash of the names
      const squash = (parent, text, size, font, weight, color = '#dcd9d3') => {
        const w = el('span', `position:relative;display:inline-block;height:${gx(size * 1.08)}px;vertical-align:bottom`, parent);
        const s2 = el('span', `left:0;top:0;white-space:nowrap;font:${weight} ${gx(size)}px/1.08 ${font};letter-spacing:.02em;color:${color};transform:scaleX(${SQ});transform-origin:0 0`, w);
        s2.textContent = text;
        mctx.font = `${weight} ${gx(size)}px ${font}`; w.style.width = (mctx.measureText(text).width + [...text].length * gx(size) * 0.02) * SQ + 'px';   // measured with canvas: the shot is hidden while it is built
        return { w, s: s2 };
      };
      const rows = [], row = (gap = 16) => { const r6 = el('div', `position:relative;display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-end;column-gap:${gx(gap)}px;row-gap:${gx(20)}px;margin-top:${gx(18)}px`, box); rows.push(r6); return r6; };
      const texts = [];
      if (top) { const r0 = row(); const t0 = squash(r0, top, 54, FONT.sans, 500, '#bdb9b2'); texts.push([t0.s, top, 1]); }
      if (cast.length) { const r1 = row(36); for (const n of cast) { const t1 = squash(r1, n, 104, FONT.sans, 500); texts.push([t1.s, n]); } }
      if (title) { const r2 = el('div', `position:relative;margin:${gx(40)}px 0 ${gx(16)}px`, box); rows.push(r2); const t2 = typeSpan(r2, title, { size: 150, font: FONT.serif, weight: 900, look: 'metal', ls: '.22em' }); texts.push([t2, title]); }
      if (credits.length) {
        const r3 = row(22);
        for (const c of credits) {
          const item = el('span', 'position:relative;display:inline-flex;align-items:flex-end', r3);
          const role = String(c.role), half = Math.ceil([...role].length / 2), lines = [...role].length > 2 ? [[...role].slice(0, half).join(''), [...role].slice(half).join('')] : [role];
          const rb = el('span', `position:relative;display:inline-flex;flex-direction:column;justify-content:flex-end;margin-right:${gx(6)}px;font:400 ${gx(25)}px/1.05 ${FONT.sans};color:#a8a49d;letter-spacing:.05em;height:${gx(70)}px`, item);
          for (const ln of lines) el('span', 'position:relative;display:block;text-align:right', rb, ln);
          const nm = squash(item, c.name, 74, FONT.sans, 500);
          texts.push([rb, role, 1], [nm.s, c.name, 1]);
        }
      }
      if (logos.length) { const r4 = row(40); r4.style.marginTop = gx(30) + 'px'; for (const lg of logos) { const s4 = el('span', `position:relative;display:inline-block;padding:${gx(7)}px ${gx(18)}px;border:${gx(2)}px solid #8a867f;font:600 ${gx(28)}px/1.1 ${FONT.sans};letter-spacing:.3em;color:#a8a49d`, r4); s4.textContent = lg; texts.push([s4, lg, 1]); } }
      if (foot) { const r5 = row(); r5.style.marginTop = gx(22) + 'px'; const t5 = squash(r5, foot, 44, FONT.sans, 400, '#a8a49d'); texts.push([t5.s, foot, 1]); }
      // the block settles in row by row, top to bottom; the small credits are block furniture: meant to be small
      const rowAt = (e) => a + 0.3 + Math.max(0, rows.findIndex((r6) => r6.contains(e))) * (o2.stagger ?? 0.4);
      texts.forEach(([e, s3, small]) => F.text(e, 'label', s3, rowAt(e), b, { chrome: !!small }));
      F.add((t) => rows.forEach((r6, i) => set(r6, { opacity: seg(t, a + 0.15 + i * (o2.stagger ?? 0.4), a + 0.5 + i * (o2.stagger ?? 0.4)).toFixed(3) })));
      F.scene(a, b, { end: true });
      return S;
    };

    // ---------- painters: cinematic shots drawn in gate units ----------
    const PNT = (R.paint = {});
    const fill = (c, U, col) => { c.fillStyle = col; c.fillRect(U.x0 - 5, U.y0 - 5, U.x1 - U.x0 + 10, U.y1 - U.y0 + 10); };
    PNT.sky = (c, U, o = {}) => {
      const st = o.stops ?? [[0, '#05070d'], [1, '#0b1422']], y0 = o.y0 ?? U.y0, y1 = o.y1 ?? U.y1, gr = c.createLinearGradient(0, y0, 0, y1);
      for (const [p, col] of st) gr.addColorStop(p, col);
      fill(c, U, gr);
    };
    PNT.glow = (c, U, { x, y, r, color = '#ffd9a0', a = 1, blend = 'lighter' } = {}) => {
      const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.save(); c.globalCompositeOperation = blend; c.globalAlpha = a; c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
    };
    PNT.stars = (c, U, o = {}) => {
      const r = rnd(o.seed ?? U.seed ?? 1), n = o.n ?? 900, sz = o.size ?? 1, A = U.x1 - U.x0, B = U.y1 - U.y0;
      c.save();
      if (o.milky !== undefined && o.milky !== null) {   // a faint band of the galaxy at an angle
        c.translate((U.x0 + U.x1) / 2, (U.y0 + U.y1) / 2); c.rotate((o.milky * Math.PI) / 180);
        for (let i = 0; i < 70; i++) { const x = (r() - 0.5) * A * 1.3, y = (r() - 0.5) * 160 * (1 + r()); PNT.glow(c, U, { x, y, r: 90 + r() * 200, color: r() < 0.5 ? 'rgba(150,170,210,.06)' : 'rgba(210,180,160,.05)' }); }
        for (let i = 0; i < n * 0.8; i++) { const x = (r() - 0.5) * A * 1.3, y = (r() + r() + r() - 1.5) * 120; c.fillStyle = `rgba(220,228,245,${(0.15 + r() * 0.45).toFixed(2)})`; c.fillRect(x, y, 1.1 * sz, 1.1 * sz); }
        c.restore(); c.save();
      }
      for (let i = 0; i < n; i++) {
        const x = U.x0 + r() * A, y = U.y0 + r() * B, m = Math.pow(r(), 7), s = (0.45 + m * 2.8) * sz, tint = r();
        const col = tint < 0.15 ? '255,214,180' : tint < 0.3 ? '190,210,255' : '235,238,248';
        c.fillStyle = `rgba(${col},${(0.22 + Math.pow(r(), 2) * 0.35 + m * 0.5).toFixed(2)})`;
        c.beginPath(); c.arc(x, y, s, 0, 7); c.fill();
        if (m > 0.45) { PNT.glow(c, U, { x, y, r: s * 8, color: `rgba(${col},.35)` }); c.fillStyle = `rgba(${col},.25)`; c.fillRect(x - s * 10, y - 0.4, s * 20, 0.8); }
      }
      c.restore();
    };
    PNT.nebula = (c, U, o = {}) => {
      const r = rnd(o.seed ?? 7), cols = o.colors ?? ['rgba(70,120,190,.10)', 'rgba(190,90,120,.08)', 'rgba(230,150,90,.07)'], x = o.x ?? U.W * 0.6, y = o.y ?? 480, sp = o.spread ?? 700, n = o.n ?? 90;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) { const ang = r() * 7, d = Math.pow(r(), 0.7) * sp, px = x + Math.cos(ang) * d * 1.6, py = y + Math.sin(ang) * d * 0.7; PNT.glow(c, U, { x: px, y: py, r: 60 + r() * 260, color: cols[i % cols.length], blend: 'lighter' }); }
      c.restore();
      if (o.dust !== false) { c.save(); c.filter = `blur(${(18 * g).toFixed(1)}px)`; c.fillStyle = o.dustColor ?? 'rgba(4,5,10,.55)'; for (let i = 0; i < (o.dustN ?? 26); i++) { const ang = r() * 7, d = Math.pow(r(), 0.6) * sp * 0.9; c.beginPath(); c.ellipse(x + Math.cos(ang) * d * 1.5, y + Math.sin(ang) * d * 0.6, 40 + r() * 140, 12 + r() * 40, ang * 0.3, 0, 7); c.fill(); } c.restore(); }
    };
    PNT.sun = (c, U, { x, y, r = 40, color = '#ffe7c0', glow = 8 } = {}) => {
      PNT.glow(c, U, { x, y, r: r * glow, color: 'rgba(255,190,120,.22)' }); PNT.glow(c, U, { x, y, r: r * 2.5, color: 'rgba(255,230,190,.6)' });
      c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    };
    // a planet lit from `light` (deg, 0 = from the right, 90 = from above), rendered per pixel once: fractal terrain (ocean / land / ice) or a gas
    //   giant's bands, clouds, a sun glint on the water, the soft terminator, city lights on the night side, an atmosphere that scatters at the rim.
    //   kind: 'earth' (default) | 'rock' (moon / Mars: set land colours) | 'gas';  spin: deg (which side faces us);  seed varies the map
    const vhash = (x, y, z, s) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
    const vnoise3 = (x, y, z, s) => {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
      const L = (a, b2, q) => a + (b2 - a) * q, H = (i, j, k) => vhash(xi + i, yi + j, zi + k, s);
      return L(L(L(H(0, 0, 0), H(1, 0, 0), u), L(H(0, 1, 0), H(1, 1, 0), u), v), L(L(H(0, 0, 1), H(1, 0, 1), u), L(H(0, 1, 1), H(1, 1, 1), u), v), w);
    };
    const fbm3 = (x, y, z, s, oct = 5) => { let a = 0, amp = 0.5, f = 1; for (let i = 0; i < oct; i++) { a += amp * vnoise3(x * f, y * f, z * f, s + i * 17); f *= 2.03; amp *= 0.5; } return a / (1 - Math.pow(0.5, oct)); };
    const hexRgb = (hx) => { const n = parseInt(hx.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const mixRgb = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
    PNT.planet = (c, U, o = {}) => {
      const { x = U.W / 2, y = 500, r = 300, seed = 3, light = 20, kind = 'earth' } = o;
      const la = (light * Math.PI) / 180, Lx0 = Math.cos(la), Ly0 = -Math.sin(la), Lz0 = o.lightZ ?? 0.25, Ln = Math.hypot(Lx0, Ly0, Lz0), Lx = Lx0 / Ln, Ly = Ly0 / Ln, Lz = Lz0 / Ln;
      const pxR = Math.min(700, Math.max(40, Math.round(r * g * (o.res ?? 1)))), halo = 1.12, N = Math.ceil(pxR * 2 * halo);
      const cv = document.createElement('canvas'); cv.width = cv.height = N;
      const cx2 = cv.getContext('2d'), img = cx2.createImageData(N, N), D = img.data;
      const spin = ((o.spin ?? 0) * Math.PI) / 180, cs = Math.cos(spin), sn = Math.sin(spin), tiltA = ((o.tilt ?? 18) * Math.PI) / 180, ct = Math.cos(tiltA), st = Math.sin(tiltA);
      const OC = [hexRgb(o.deep ?? '#06203f'), hexRgb(o.ocean ?? '#16508a')], LAND = (o.land ?? ['#3f5a2a', '#6f6340', '#a99572', '#d9d4c8']).map(hexRgb), ICE = hexRgb('#e8eef4');
      const ATM = hexRgb(o.atmoColor ?? '#6fa8ff'), sea = o.sea ?? 0.53, clouds = o.clouds !== false, city = !!o.city;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const u = ((i + 0.5) / N * 2 - 1) * halo, v = ((j + 0.5) / N * 2 - 1) * halo, rr = u * u + v * v, k = (j * N + i) * 4;
        if (rr > 1) {   // the atmosphere's glow beyond the limb, brightest on the lit side
          const d = Math.sqrt(rr) - 1, side = Math.max(0, (u * Lx + v * Ly) / Math.sqrt(rr) + 0.35), a = Math.max(0, 1 - d / (halo - 1)) ** 2.4 * side * (o.atmo ?? 0.9);
          D[k] = ATM[0]; D[k + 1] = ATM[1]; D[k + 2] = ATM[2]; D[k + 3] = Math.min(255, a * 200); continue;
        }
        const z = Math.sqrt(1 - rr);
        // the surface point, turned by spin (around the axis) and tilt
        let px = u * cs + z * sn, pz = -u * sn + z * cs, py = v;
        const py2 = py * ct - pz * st, pz2 = py * st + pz * ct; py = py2; pz = pz2;
        const ndl = u * Lx + v * Ly + z * Lz, day = Math.max(0, Math.min(1, ndl * 1.6 + 0.12));
        let col, water = false;
        if (kind === 'gas') { const band = Math.sin(py * 14 + fbm3(px * 3, py * 3, pz * 3, seed, 4) * 5); col = mixRgb(LAND[0], LAND[Math.min(LAND.length - 1, 2)], 0.5 + 0.5 * band); }
        else {
          const e = fbm3(px * 1.8 + 7, py * 1.8, pz * 1.8, seed, 6);
          if (kind === 'earth' && e < sea) { water = true; col = mixRgb(OC[0], OC[1], Math.min(1, Math.max(0, (e - sea + 0.18) / 0.18))); }
          else { const q = Math.min(0.999, Math.max(0, (e - (kind === 'earth' ? sea : 0.3)) / (kind === 'earth' ? 0.22 : 0.45))) * (LAND.length - 1), i0 = Math.floor(q); col = mixRgb(LAND[i0], LAND[Math.min(LAND.length - 1, i0 + 1)], q - i0); }
          if (kind === 'earth') { const ice = Math.min(1, Math.max(0, (Math.abs(py) - 0.9 + (e - 0.5) * 0.5) / 0.05)); if (ice > 0) col = mixRgb(col, ICE, 0.8 * ice); }
        }
        let R2 = col[0] * day, G2 = col[1] * day, B2 = col[2] * day;
        if (water) { const hz2 = Lz + 1, hn = Math.hypot(Lx, Ly, hz2), spec = Math.pow(Math.max(0, (u * Lx + v * Ly + z * hz2) / hn), 160) * 150; R2 += spec; G2 += spec * 0.92; B2 += spec * 0.8; }
        if (clouds && kind !== 'rock') { const cl = Math.max(0, Math.min(1, (fbm3(px * 3.2 + 31, py * 5.5, pz * 3.2, seed + 5, 5) - 0.56) / 0.16)) * (o.cloudAmount ?? 0.9); const cv2 = 235 * day; R2 = R2 * (1 - cl) + cv2 * cl; G2 = G2 * (1 - cl) + cv2 * cl; B2 = B2 * (1 - cl) + (cv2 + 8 * day) * cl; }
        if (city && !water && ndl < 0.02) { const n2 = fbm3(px * 9, py * 9, pz * 9, seed + 9, 3), lit = vhash(i * 7, j * 13, 1, seed) < (n2 - 0.45) * 0.9 ? 1 : 0; const f = lit * Math.min(1, (0.02 - ndl) * 12); R2 += 255 * f; G2 += 190 * f; B2 += 110 * f; }
        const rim = Math.pow(1 - z, 2.2) * Math.max(0, ndl + 0.3) * (o.atmo ?? 0.9);   // scattering toward the limb
        R2 = R2 * (1 - rim * 0.5) + ATM[0] * rim; G2 = G2 * (1 - rim * 0.5) + ATM[1] * rim; B2 = B2 * (1 - rim * 0.5) + ATM[2] * rim;
        const edge = Math.min(1, (1 - Math.sqrt(rr)) * pxR * 1.2);   // anti-aliased limb
        D[k] = Math.min(255, R2); D[k + 1] = Math.min(255, G2); D[k + 2] = Math.min(255, B2); D[k + 3] = 255 * edge;
      }
      cx2.putImageData(img, 0, 0);
      c.save(); c.imageSmoothingQuality = 'high'; c.drawImage(cv, x - r * halo, y - r * halo, r * 2 * halo, r * 2 * halo); c.restore();
    };
    // a ridge line (mountains, dunes, a cliff) filled down to the bottom; haze lightens it toward the sky colour
    PNT.ridge = (c, U, o = {}) => {
      const r = rnd(o.seed ?? 11), y = o.y ?? 700, amp = o.amp ?? 120, rough = o.rough ?? 0.55, N = 128, pts = new Float32Array(N + 1);
      // midpoint displacement: big shapes first, finer detail after
      pts[0] = r() - 0.5; pts[N] = r() - 0.5;
      for (let step = N; step > 1; step /= 2) { const h = step / 2, k2 = Math.pow(rough, Math.log2(N / step)); for (let i = h; i < N; i += step) pts[i] = (pts[i - h] + pts[i + h]) / 2 + (r() - 0.5) * k2 * 1.6; }
      const x0 = U.x0 - 20, x1 = U.x1 + 20;
      c.beginPath(); c.moveTo(x0, U.y1 + 10);
      for (let i = 0; i <= N; i++) c.lineTo(x0 + ((x1 - x0) * i) / N, y - pts[i] * amp * 2);
      c.lineTo(x1, U.y1 + 10); c.closePath();
      c.fillStyle = o.color ?? '#0b0e14'; c.fill();
      if (o.rim) { c.save(); c.clip(); c.strokeStyle = o.rim; c.lineWidth = o.rimW ?? 3; c.beginPath(); for (let i = 0; i <= N; i++) { const px = x0 + ((x1 - x0) * i) / N, py = y - pts[i] * amp * 2; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); c.restore(); }
    };
    PNT.skyline = (c, U, o = {}) => {
      const r = rnd(o.seed ?? 21), y = o.y ?? 760, col = o.color ?? '#07090d';
      c.fillStyle = col;
      for (let x = U.x0 - 20; x < U.x1 + 20;) { const w = 30 + r() * 90, h = (o.min ?? 40) + Math.pow(r(), 1.6) * (o.max ?? 300); c.fillRect(x, y - h, w, h + U.y1); if (r() < 0.18) c.fillRect(x + w * 0.45, y - h - 40 - r() * 60, 4, 60 + r() * 60); if (o.lights !== false) { c.save(); for (let wy = y - h + 10; wy < y - 6; wy += 14) for (let wx = x + 6; wx < x + w - 6; wx += 11) if (r() < (o.lit ?? 0.18)) { c.fillStyle = `rgba(255,${200 + r() * 40 | 0},140,${(0.4 + r() * 0.5).toFixed(2)})`; c.fillRect(wx, wy, 4, 6); } c.restore(); c.fillStyle = col; } x += w + r() * 6; }
      c.fillRect(U.x0 - 20, y, U.x1 - U.x0 + 40, U.y1 - y + 20);
    };
    PNT.sea = (c, U, o = {}) => {
      const y = o.y ?? 640, gr = c.createLinearGradient(0, y, 0, U.y1); gr.addColorStop(0, o.top ?? '#1b2a3a'); gr.addColorStop(1, o.bottom ?? '#05080c');
      c.fillStyle = gr; c.fillRect(U.x0 - 10, y, U.x1 - U.x0 + 20, U.y1 - y + 10);
      if (o.glint) { const r = rnd(o.seed ?? 5); c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 220; i++) { const d = Math.pow(r(), 1.5), px = o.glint.x + (r() - 0.5) * (40 + d * 700), py = y + 4 + d * (U.y1 - y); c.fillStyle = `rgba(255,220,170,${(0.5 * (1 - d)).toFixed(2)})`; c.fillRect(px, py, 6 + r() * 30 * (1 - d), 1.5); } c.restore(); }
    };
    PNT.clouds = (c, U, o = {}) => {
      const r = rnd(o.seed ?? 31), y = o.y ?? 300, sp = o.spread ?? 120;
      c.save(); c.filter = `blur(${((o.soft ?? 14) * g).toFixed(1)}px)`; c.fillStyle = o.color ?? 'rgba(200,190,185,.35)';
      for (let i = 0; i < (o.n ?? 30); i++) { c.beginPath(); c.ellipse(U.x0 + r() * (U.x1 - U.x0), y + (r() - 0.5) * sp, 80 + r() * 220, 18 + r() * 40, 0, 0, 7); c.fill(); }
      c.restore();
    };
    PNT.fog = (c, U, o = {}) => { const y = o.y ?? 700, h = o.h ?? 300, gr = c.createLinearGradient(0, y - h / 2, 0, y + h / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, o.color ?? 'rgba(160,170,185,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(U.x0, y - h / 2, U.x1 - U.x0, h); };
    PNT.rays = (c, U, o = {}) => {
      const r = rnd(o.seed ?? 41), { x = U.W / 2, y = 0 } = o, len = o.len ?? 1400;
      c.save(); c.globalCompositeOperation = 'lighter'; c.filter = `blur(${(10 * g).toFixed(1)}px)`;
      for (let i = 0; i < (o.n ?? 9); i++) { const ang = ((o.angle ?? 90) + (r() - 0.5) * (o.spread ?? 50)) * Math.PI / 180, w = 0.02 + r() * 0.05, gr = c.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len); gr.addColorStop(0, o.color ?? 'rgba(255,230,190,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang - w) * len, y + Math.sin(ang - w) * len); c.lineTo(x + Math.cos(ang + w) * len, y + Math.sin(ang + w) * len); c.closePath(); c.fill(); }
      c.restore();
    };
    // a person as a silhouette (seen from behind, or in profile walking / running), with an optional rim of light on one side.
    //   pose: 'stand' | 'walk' | 'run' | 'reach' | 'look' (head up) | 'sit';  facing: 'back' | 'left' | 'right';  suit: 'plain' | 'coat' | 'space';
    //   hair: 'long' | 'short' | 'bun';  phase: the stride (0–1, from t); rim / rimSide: a light edge on one side
    PNT.figure = (c, U, o = {}) => {
      const { x = U.W / 2, y = 900, h = 520, pose = 'stand', facing = 'back', suit = 'plain', color = '#050607', phase = 0, hair = 'long' } = o;
      const prof = facing !== 'back', dir = facing === 'left' ? -1 : 1, bulk = suit === 'space' ? 1.3 : 1;
      // a tapered segment p0 → p1 (widths w0 → w1) with round joints: limbs are built from these, filled, so the outline stays smooth
      const seg2 = (p0, p1, w0, w1) => {
        const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
        c.beginPath(); c.moveTo(p0[0] + nx * w0 / 2, p0[1] + ny * w0 / 2); c.lineTo(p1[0] + nx * w1 / 2, p1[1] + ny * w1 / 2); c.lineTo(p1[0] - nx * w1 / 2, p1[1] - ny * w1 / 2); c.lineTo(p0[0] - nx * w0 / 2, p0[1] - ny * w0 / 2); c.closePath(); c.fill();
        c.beginPath(); c.arc(p0[0], p0[1], w0 / 2, 0, 7); c.arc(p1[0], p1[1], w1 / 2, 0, 7); c.fill();
      };
      const at = (p, ang, len) => [p[0] + Math.sin(ang) * len, p[1] + Math.cos(ang) * len];   // angle 0 = straight down
      const smooth = (pts) => { c.beginPath(); const n = pts.length; c.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2); for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } c.closePath(); c.fill(); };
      const draw = (col, ox, oy) => {
        c.save(); c.translate(x + ox, y + oy); c.scale(h, h); c.fillStyle = col;
        const sw = pose === 'run' ? 0.95 : pose === 'walk' ? 0.42 : 0, ph = phase * Math.PI * 2, lean = pose === 'run' ? 0.22 * dir : pose === 'walk' ? 0.04 * dir : 0;
        const hipY = -0.47, B = bulk;
        // legs (behind the torso)
        for (const s of [1, -1]) {
          const q = Math.sin(ph + (s > 0 ? 0 : Math.PI));
          let hip, a1, a2;
          if (prof) { hip = [0.0, hipY]; a1 = dir * sw * q * 0.62; a2 = a1 - dir * (pose === 'run' ? Math.max(0, -q) * 1.3 + 0.15 : pose === 'walk' ? Math.max(0, -q) * 0.45 : 0); }
          else if (pose === 'sit') { hip = [s * 0.05, hipY]; a1 = 0.1 * s; a2 = 0; }
          else { hip = [s * 0.05, hipY]; a1 = 0.035 * s; a2 = 0.01 * s; }
          const knee = at(hip, a1, 0.245), ank = at(knee, a2, 0.225);
          seg2(hip, knee, 0.105 * B, 0.062 * B); seg2(knee, ank, 0.062 * B, 0.038 * B);
          c.beginPath(); c.ellipse(ank[0] + (prof ? dir * 0.03 : 0), ank[1] + 0.012, prof ? 0.052 : 0.03, 0.02, 0, 0, 7); c.fill();
        }
        // torso (leans from the hips when running)
        c.save(); c.translate(0, hipY); c.rotate(lean); c.translate(0, -hipY);
        const tw = B;
        if (!prof) smooth([[0.03, -0.845], [0.09 * tw, -0.828], [0.135 * tw, -0.8], [0.142 * tw, -0.765], [0.122 * tw, -0.705], [0.088 * tw, -0.615], [0.1 * tw, -0.53], [0.108 * tw, -0.47], [0, -0.43], [-0.108 * tw, -0.47], [-0.1 * tw, -0.53], [-0.088 * tw, -0.615], [-0.122 * tw, -0.705], [-0.142 * tw, -0.765], [-0.135 * tw, -0.8], [-0.09 * tw, -0.828], [-0.03, -0.845]]);
        else smooth([[dir * 0.03, -0.845], [dir * 0.07 * tw, -0.8], [dir * 0.082 * tw, -0.73], [dir * 0.064 * tw, -0.665], [dir * 0.058 * tw, -0.585], [dir * 0.066 * tw, -0.49], [dir * 0.02, -0.45], [-dir * 0.075 * tw, -0.47], [-dir * 0.058 * tw, -0.58], [-dir * 0.072 * tw, -0.7], [-dir * 0.06 * tw, -0.8], [-dir * 0.025, -0.85]]);
        if (suit === 'space') { c.beginPath(); c.roundRect(prof ? -dir * 0.16 - (dir > 0 ? 0 : -0.07) : -0.11, -0.82, prof ? 0.07 : 0.22, 0.26, 0.03); c.fill(); }
        if (suit === 'coat') smooth([[0.11 * tw, -0.52], [0.14 * tw, -0.3], [0.13 * tw, -0.2], [-0.13 * tw, -0.2], [-0.14 * tw, -0.3], [-0.11 * tw, -0.52]]);
        // arms
        const shY = -0.79;
        for (const s of [1, -1]) {
          const sh = prof ? [-dir * 0.01, shY + 0.01] : [s * 0.122 * tw, shY + 0.02];
          let a1, a2;
          if (pose === 'reach' && s === (o.hand ?? 1)) { a1 = o.reachAngle ?? (prof ? dir * 2.1 : s * 2.5); a2 = a1 - 0.2 * s; }
          else if (prof) { const q = Math.sin(ph + (s > 0 ? Math.PI : 0)); a1 = dir * sw * q * 0.75; a2 = a1 + dir * (pose === 'run' ? 1.4 : pose === 'walk' ? 0.25 : 0.08); }
          else { a1 = 0.09 * s; a2 = 0.04 * s; }
          const el2 = at(sh, a1, 0.2), wr = at(el2, a2, 0.18);
          seg2(sh, el2, 0.062 * B, 0.044 * B); seg2(el2, wr, 0.044 * B, 0.032 * B);
          c.beginPath(); c.ellipse(wr[0], wr[1] + 0.03, 0.022, 0.04, a2, 0, 7); c.fill();
        }
        // neck, head, hair
        const look = pose === 'look' ? -0.012 : 0, hx = prof ? dir * 0.012 : 0, hy = -0.925 + look, hr = suit === 'space' ? 0.085 : 0.058;
        seg2([0, -0.83], [hx * 0.7, -0.88], 0.05, 0.044);
        c.beginPath(); c.ellipse(hx, hy, hr * (prof ? 1.05 : 0.95), hr * 1.12, 0, 0, 7); c.fill();
        if (prof && suit !== 'space') { c.beginPath(); c.moveTo(hx + dir * hr * 0.85, hy - hr * 0.2); c.lineTo(hx + dir * hr * 1.18, hy + hr * 0.15); c.lineTo(hx + dir * hr * 0.8, hy + hr * 0.4); c.closePath(); c.fill(); }
        if (suit !== 'space' && hair === 'long') smooth(prof ? [[hx - dir * 0.02, hy - hr], [hx - dir * hr * 1.1, hy - hr * 0.2], [hx - dir * hr * 1.0, hy + hr * 2.2], [hx - dir * hr * 0.2, hy + hr * 1.6], [hx + dir * hr * 0.2, hy - hr * 0.6]] : [[hx, hy - hr * 1.15], [hx + hr * 1.05, hy - hr * 0.3], [hx + hr * 1.12, hy + hr * 1.6], [hx + hr * 0.6, hy + hr * 2.3], [hx - hr * 0.6, hy + hr * 2.3], [hx - hr * 1.12, hy + hr * 1.6], [hx - hr * 1.05, hy - hr * 0.3]]);
        if (suit !== 'space' && hair === 'bun') { c.beginPath(); c.arc(hx - (prof ? dir * hr * 0.8 : 0), hy - hr * (prof ? 0.5 : 0.9), hr * 0.5, 0, 7); c.fill(); }
        c.restore(); c.restore();
      };
      if (o.rim) draw(o.rim, (o.rimSide ?? 1) * 0.007 * h, -0.003 * h);
      draw(color, 0, 0);
    };
    // a space station as a silhouette: a truss, pressurised modules, two solar wings, a listening dish; rim light on the lit side
    PNT.station = (c, U, o = {}) => {
      const { x = U.W / 2, y = 500, s = 1, color = '#0a0c10', rim = 'rgba(190,210,235,.55)', seed = 5 } = o, r = rnd(seed);
      c.save(); c.translate(x, y); c.scale(s * (o.yaw ?? 0.92), s); c.rotate(((o.rot ?? -4) * Math.PI) / 180);
      // a cylinder lit from above: dark body, a bright edge on top, a soft sheen
      const cyl = (x0, y0, w, h) => { const gr = c.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, 'rgba(170,190,215,.9)'); gr.addColorStop(0.12, '#3a4350'); gr.addColorStop(0.45, '#161a21'); gr.addColorStop(1, color); c.fillStyle = gr; c.beginPath(); c.roundRect(x0, y0, w, h, h / 2.2); c.fill(); };
      c.fillStyle = color; c.fillRect(-430, -7, 860, 14); c.fillStyle = rim; c.fillRect(-430, -7, 860, 2.5);
      c.strokeStyle = 'rgba(150,170,200,.28)'; c.lineWidth = 1.5; for (let k = -430; k < 430; k += 22) { c.beginPath(); c.moveTo(k, -7); c.lineTo(k + 22, 7); c.stroke(); }
      const mods = 3 + Math.floor(r() * 2);
      for (let i = 0; i < mods; i++) { const mx = -230 + i * (460 / (mods - 1)) + (r() - 0.5) * 30, mw = 80 + r() * 70, mh = 38 + r() * 24; cyl(mx - mw / 2, -mh / 2, mw, mh); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 2; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(mx - mw / 2 + (mw * k) / 4, -mh / 2 + 3); c.lineTo(mx - mw / 2 + (mw * k) / 4, mh / 2 - 3); c.stroke(); } if (r() < 0.6) { c.fillStyle = 'rgba(255,214,160,.85)'; c.fillRect(mx - 6, -2, 4, 4); } }
      for (const sd of [-1, 1]) for (const up of [-1, 1]) {   // solar wings: skewed panels catching the light
        const px = sd * 480, py = up * 72;
        c.fillStyle = color; c.fillRect(px - 2.5, Math.min(0, py), 5, Math.abs(py));
        c.save(); c.translate(px, py + up * 62); c.transform(1, 0, -0.35 * up, 1, 0, 0);
        const gr = c.createLinearGradient(-130, -55, 130, 55); gr.addColorStop(0, o.panel ?? '#1b2638'); gr.addColorStop(0.55, '#0d131d'); gr.addColorStop(0.75, 'rgba(120,150,190,.55)'); gr.addColorStop(1, '#101722');
        c.fillStyle = gr; c.fillRect(-125, -52, 250, 104);
        c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.6; for (let k = -125; k <= 125; k += 25) { c.beginPath(); c.moveTo(k, -52); c.lineTo(k, 52); c.stroke(); } for (let k = -52; k <= 52; k += 26) { c.beginPath(); c.moveTo(-125, k); c.lineTo(125, k); c.stroke(); }
        c.strokeStyle = rim; c.lineWidth = 2; c.strokeRect(-125, -52, 250, 104); c.restore();
      }
      if (o.dish !== false) { c.save(); c.translate(-440, -10); PNT.dish(c, U, { x: 0, y: 0, s: 0.9, angle: o.dishAngle ?? 30, color, rim }); c.restore(); }
      c.restore();
    };
    PNT.dish = (c, U, o = {}) => {
      const { x = 0, y = 0, s = 1, angle = 30, color = '#0a0c10', rim = 'rgba(190,210,235,.6)' } = o, tilt = Math.abs(Math.sin((angle * Math.PI) / 180)) * 0.85 + 0.15;
      c.save(); c.translate(x, y); c.scale(s, s);
      c.fillStyle = color; c.fillRect(-10, 0, 20, 140); c.fillRect(-60, 130, 120, 16);
      c.rotate(((o.tilt ?? -25) * Math.PI) / 180);
      c.fillStyle = rim; c.beginPath(); c.ellipse(0, -2, 150, 150 * tilt, 0, 0, 7); c.fill();
      c.fillStyle = color; c.beginPath(); c.ellipse(0, 0, 148, 148 * tilt, 0, 0, 7); c.fill();
      c.strokeStyle = 'rgba(160,185,220,.28)'; c.lineWidth = 2; for (const k of [0.33, 0.66]) { c.beginPath(); c.ellipse(0, 0, 148 * k, 148 * tilt * k, 0, 0, 7); c.stroke(); }
      c.strokeStyle = color; c.lineWidth = 6; for (const sx of [-1, 0, 1]) { c.beginPath(); c.moveTo(sx * 120, 0); c.lineTo(0, -150 * (1 - tilt * 0.4)); c.stroke(); }
      c.fillStyle = color; c.beginPath(); c.arc(0, -150 * (1 - tilt * 0.4), 12, 0, 7); c.fill();
      c.restore();
    };
    // a foreground frame with a hole: a round porthole or a rectangular window; rim light on its inner edge
    PNT.window = (c, U, o = {}) => {
      const { shape = 'round', x = U.W / 2, y = 500, r = 380, w = 1200, h = 700, color = '#07080a', rim = 'rgba(170,200,230,.35)' } = o;
      c.save(); c.beginPath(); c.rect(U.x0 - 10, U.y0 - 10, U.x1 - U.x0 + 20, U.y1 - U.y0 + 20);
      if (shape === 'round') { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2, true); } else c.roundRect(x - w / 2, y - h / 2, w, h, o.radius ?? 30);   // its own subpath: no line joining the frame to the hole
      c.fillStyle = color; c.fill('evenodd');
      c.strokeStyle = rim; c.lineWidth = o.rimW ?? 5; c.beginPath(); if (shape === 'round') c.arc(x, y, r + 2, Math.PI * 0.9, Math.PI * 1.75); else c.roundRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, o.radius ?? 30); c.stroke();
      if (shape === 'round') { c.strokeStyle = 'rgba(120,140,170,.18)'; c.lineWidth = 3; for (let k = 0; k < 12; k++) { const an = (k / 12) * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(an) * (r + 40), y + Math.sin(an) * (r + 40), 8, 0, 7); c.stroke(); } }
      c.restore();
    };
    // a corridor in one-point perspective toward (vx, vy): shaded walls, ribbed frames, a light strip in each bay and its pool on the floor;
    //   lit = how many bays from the front are still on (count it down over time and the lights go out from the far end)
    PNT.corridor = (c, U, o = {}) => {
      const { vx = U.W / 2, vy = 470, n = 12, lit = n, light = [190, 225, 255] } = o, wall = hexRgb(o.wall ?? '#2a3442'), fog = hexRgb(o.fog ?? '#05070a');
      fill(c, U, o.fog ?? '#05070a');
      const fr = (i) => { const d = Math.pow(0.8, i), w = Math.max(U.W * 1.2, 1500) * d, h = 1300 * d; return { d, x0: vx - w / 2, x1: vx + w / 2, y0: vy - h * 0.5, y1: vy + h * 0.5 }; };
      const rgb = (p, a = 1) => `rgba(${p[0] | 0},${p[1] | 0},${p[2] | 0},${a})`;
      for (let i = n; i >= 1; i--) {
        const A = fr(i), B2 = fr(i - 1), lv = clamp(lit - (i - 1)), on = lv > 0.02, haze = Math.min(1, i / n) ** 0.8, k = 0.12 + 0.43 * lv;   // lv: this bay's light, 0–1 (a fractional lit fades it)
        const tone = (m) => mixRgb(wall.map((v) => v * m * k * 2.2), fog, haze * 0.85);
        const quad = (p, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (const q of p.slice(1)) c.lineTo(q[0], q[1]); c.closePath(); c.fill(); };
        quad([[B2.x0, B2.y0], [A.x0, A.y0], [A.x0, A.y1], [B2.x0, B2.y1]], rgb(tone(0.8)));      // left wall
        quad([[B2.x1, B2.y0], [A.x1, A.y0], [A.x1, A.y1], [B2.x1, B2.y1]], rgb(tone(0.65)));     // right wall
        quad([[B2.x0, B2.y0], [A.x0, A.y0], [A.x1, A.y0], [B2.x1, B2.y0]], rgb(tone(0.5)));      // ceiling
        quad([[B2.x0, B2.y1], [A.x0, A.y1], [A.x1, A.y1], [B2.x1, B2.y1]], rgb(tone(0.35)));     // floor
        if (on) {
          const mx = (A.x0 + A.x1) / 2, my0 = (A.y0 + B2.y0) / 2, wd = (B2.x1 - B2.x0) * 0.16;
          c.fillStyle = rgb(light, 0.95 * (1 - haze * 0.6) * lv); c.beginPath(); c.moveTo(mx - wd * 0.6, B2.y0 + (A.y0 - B2.y0) * 0.15); c.lineTo(mx + wd * 0.6, B2.y0 + (A.y0 - B2.y0) * 0.15); c.lineTo(mx + wd * 0.45, A.y0 - (A.y0 - B2.y0) * 0.2); c.lineTo(mx - wd * 0.45, A.y0 - (A.y0 - B2.y0) * 0.2); c.closePath(); c.fill();
          PNT.glow(c, U, { x: mx, y: my0, r: (B2.x1 - B2.x0) * 0.35, color: rgb(light, 0.18 * (1 - haze * 0.5) * lv) });
          c.save(); c.translate(mx, (A.y1 + B2.y1) / 2); c.scale(1, 0.18); PNT.glow(c, U, { x: 0, y: 0, r: (B2.x1 - B2.x0) * 0.4, color: rgb(light, 0.22 * (1 - haze * 0.5) * lv) }); c.restore();
        }
        // the rib between bays
        c.strokeStyle = rgb(mixRgb([10, 12, 16], fog, haze), 1); c.lineWidth = 26 * B2.d; c.strokeRect(B2.x0, B2.y0, B2.x1 - B2.x0, B2.y1 - B2.y0);
        if (on) { c.strokeStyle = rgb(light, 0.22 * (1 - haze) * lv); c.lineWidth = 2.5 * B2.d; c.strokeRect(B2.x0 + 14 * B2.d, B2.y0 + 14 * B2.d, B2.x1 - B2.x0 - 28 * B2.d, B2.y1 - B2.y0 - 28 * B2.d); }
      }
    };
    // a glowing screen / panel (a console, a monitor): lines of light standing in for text unless real text is put on it with S.text
    PNT.screen = (c, U, o = {}) => {
      const { x = U.W / 2 - 300, y = 300, w = 600, h = 340, color = 'rgba(120,200,255,.9)', bg = '#06121c' } = o;
      PNT.glow(c, U, { x: x + w / 2, y: y + h / 2, r: Math.max(w, h) * 0.9, color: 'rgba(80,170,240,.18)' });
      c.fillStyle = bg; c.beginPath(); c.roundRect(x, y, w, h, 10); c.fill();
      c.strokeStyle = color; c.globalAlpha = 0.5; c.lineWidth = 2; c.stroke(); c.globalAlpha = 1;
      if (o.lines !== false) { const r = rnd(o.seed ?? 9); c.fillStyle = color; for (let ly = y + 30; ly < y + h - 20; ly += 26) { c.globalAlpha = 0.15 + r() * 0.3; c.fillRect(x + 26, ly, (w - 52) * (0.3 + r() * 0.6), 6); } c.globalAlpha = 1; }
    };
    // a signal: a waveform (kind 'wave') or spectrum bars ('bars'); t makes it live, amp 0–1, burst = a spike centred in time
    PNT.wave = (c, U, o = {}) => {
      const { x = 100, y = 500, w = 800, h = 200, t = 0, seed = 1, amp = 0.5, color = 'rgba(140,215,255,.95)', kind = 'wave' } = o, r = rnd(seed), ph = [r() * 7, r() * 7, r() * 7];
      c.save(); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = o.lw ?? 3; c.shadowColor = color; c.shadowBlur = 12 * g;
      if (kind === 'bars') { const n = o.n ?? 48; for (let i = 0; i < n; i++) { const u = i / n, v = Math.abs(Math.sin(u * 9 + t * 3 + ph[0]) * 0.5 + Math.sin(u * 23 - t * 5 + ph[1]) * 0.3 + Math.sin(u * 51 + t * 9 + ph[2]) * 0.2) * amp * (o.shape ? o.shape(u) : 1); c.fillRect(x + u * w, y - v * h, (w / n) * 0.6, v * h * 2); } }
      else { c.beginPath(); for (let i = 0; i <= 240; i++) { const u = i / 240, env = o.shape ? o.shape(u) : 1, v = (Math.sin(u * 40 + t * 6 + ph[0]) * 0.5 + Math.sin(u * 97 - t * 9 + ph[1]) * 0.3 + Math.sin(u * 211 + t * 17 + ph[2]) * 0.2) * amp * env; const px = x + u * w, py = y + v * h; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); }
      c.restore();
    };
    // moving particles at time t: 'snow' | 'rain' | 'dust' (floating motes) | 'embers' | 'stream' (stars streaking past)
    PNT.particles = (c, U, o = {}) => {
      const { t = 0, kind = 'dust', n = 160, seed = 3, speed = 1, color } = o, r = rnd(seed), A = U.x1 - U.x0, B = U.y1 - U.y0;
      c.save();
      for (let i = 0; i < n; i++) {
        const px0 = r(), py0 = r(), sz = 0.5 + r() * 1.5, sp = (0.5 + r()) * speed;
        if (kind === 'rain') { const yy = U.y0 + ((py0 * B + t * 1600 * sp) % B), xx = U.x0 + ((px0 * A - t * 260 * sp) % A + A) % A; c.strokeStyle = color ?? 'rgba(190,205,225,.35)'; c.lineWidth = 1.2 * sz; c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx - 10, yy + 46 * sz); c.stroke(); }
        else if (kind === 'snow') { const yy = U.y0 + ((py0 * B + t * 70 * sp) % B), xx = U.x0 + ((px0 * A + Math.sin(t * 0.8 + i) * 30) % A + A) % A; c.fillStyle = color ?? 'rgba(235,240,248,.75)'; c.beginPath(); c.arc(xx, yy, 2.2 * sz, 0, 7); c.fill(); }
        else if (kind === 'embers') { const yy = U.y1 - ((py0 * B + t * 90 * sp) % B), xx = U.x0 + ((px0 * A + Math.sin(t * 1.3 + i) * 40) % A + A) % A; c.fillStyle = color ?? `rgba(255,${140 + r() * 80 | 0},60,${(0.5 + r() * 0.5).toFixed(2)})`; c.beginPath(); c.arc(xx, yy, 1.8 * sz, 0, 7); c.fill(); }
        else if (kind === 'stream') { const cx = (U.x0 + U.x1) / 2, cy = (U.y0 + U.y1) / 2, ang = px0 * 7, d0 = (py0 + t * 0.35 * sp) % 1, d = Math.pow(d0, 2.2) * A * 0.7, L2 = 6 + d * 0.08 * speed; c.strokeStyle = color ?? `rgba(220,230,255,${(0.2 + d0 * 0.7).toFixed(2)})`; c.lineWidth = 1 + d0 * 2; c.beginPath(); c.moveTo(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d); c.lineTo(cx + Math.cos(ang) * (d + L2), cy + Math.sin(ang) * (d + L2)); c.stroke(); }
        else { const xx = U.x0 + ((px0 * A + t * 14 * sp + Math.sin(t * 0.5 + i) * 20) % A + A) % A, yy = U.y0 + ((py0 * B + Math.cos(t * 0.4 + i * 1.3) * 25 + t * 6 * sp) % B + B) % B; c.fillStyle = color ?? `rgba(255,236,210,${(0.15 + r() * 0.35).toFixed(2)})`; c.beginPath(); c.arc(xx, yy, 1.6 * sz, 0, 7); c.fill(); }
      }
      c.restore();
    };

    // ---------- checks (printed in --check) ----------
    F.addLint(() => {
      const out = [], add = (t, what, msg) => out.push({ level: 'warn', t, src: '', what, msg });
      // one phrase per card
      for (const cd of cards) { const n = cjk(cd.text), wd = String(cd.text).replace(/[㐀-鿿]/g, ' ').trim().split(/\s+/).filter(Boolean).length; if (n > 12 || (!n && wd > 6)) add(cd.a, M('字卡', 'card'), M(`字卡"${cd.text}"太长（${n || wd} 个${n ? '字' : '词'}）：预告片一张卡只放一个短语（中文 ≤ 12 字），拆成两张`, `Card "${cd.text}" is too long (${n || wd} ${n ? 'characters' : 'words'}): a trailer card holds one short phrase (≤ 6 words); split it in two`)); if (cd.b - cd.a < 0.6 + n / 6) add(cd.a, M('字卡', 'card'), M(`字卡"${cd.text}"只停 ${(cd.b - cd.a).toFixed(2)} 秒，读不完（至少 ${(0.6 + n / 6).toFixed(1)} 秒）`, `Card "${cd.text}" holds only ${(cd.b - cd.a).toFixed(2)} s, too short to read (at least ${(0.6 + n / 6).toFixed(1)} s)`)); }
      // three cards in a row with no picture between them read as a slideshow
      const seq = [...shots].sort((p, q) => p.a - q.a); let run = 0;
      for (const s of seq) { const isCard = cards.some((cd) => Math.abs(cd.a - s.a) < 1e-3); run = isCard ? run + 1 : 0; if (run === 3) add(s.a, M('字卡', 'card'), M(`${s.a.toFixed(1)} 秒起连着三张字卡，中间没有画面：字卡之间要夹镜头`, `Three cards in a row from ${s.a.toFixed(1)} s with no shot between them: cut pictures between the cards`)); }
      // the silence beat: short, and right before the title
      for (const [a, b] of silences) if (b - a > 1.2) add(a, M('静音', 'silence'), M(`静音拍 ${(b - a).toFixed(1)} 秒太长（会被当成断了）：0.5–1 秒`, `The silence beat lasts ${(b - a).toFixed(1)} s, too long (it reads as a dropout): 0.5–1 s`));
      if (R._title && !(R._title.silence > 0)) add(R._title.a, M('片名', 'title'), M('片名前没有静音拍：预告片在片名砸出前会突然全静 0.5–1 秒（R.title 的 silence）', 'No silence before the title: a trailer cuts to full silence for 0.5–1 s before the title slams (R.title silence)'));
      // the cut rate should rise toward the end of the body: compare the median shot length of the first and last third before the title
      const end = R._title ? R._title.a - (R._title.silence || 0) : F.duration, body = seq.filter((s) => s.b <= end + 1e-3 && !cards.some((cd) => Math.abs(cd.a - s.a) < 1e-3));
      if (body.length >= 6) { const med = (L) => { const v = L.map((s) => s.b - s.a).sort((p, q) => p - q); return v[Math.floor(v.length / 2)]; }, k3 = Math.floor(body.length / 3), m1 = med(body.slice(0, k3)), m3 = med(body.slice(-k3)); if (m3 > m1 * 0.75) add(body[body.length - k3].a, M('剪辑节奏', 'cut rate'), M(`镜头没有越切越快：前段镜头中位 ${m1.toFixed(1)} 秒，后段 ${m3.toFixed(1)} 秒——第三幕用 R.ramp 让镜头逐渐变短`, `The cuts don't speed up: median shot ${m1.toFixed(1)} s early, ${m3.toFixed(1)} s late — use R.ramp in act three so shots get shorter`)); }
      return out;
    });

    return R;
  };
})();
