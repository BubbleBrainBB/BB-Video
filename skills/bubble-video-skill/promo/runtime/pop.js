// pop.js: pop art style (one of the visual styles of bubble-video-skill's promo/ films; style notes in styles/pop/STYLE.md). Load it after promo.js.
// The visual grammar of 1960s comics and screen printing: thick black outlines, Ben-Day dots, flat primaries, comic panels, speech bubbles, burst balloons with sound words, one image repeated in different colours (Warhol), misregistration.
//
//   const K = PROMO.pop(F, { palette, line, comic, head })
//   K.bg(parent, { color, dots, rays })                background: flat colour + dots + slowly turning rays
//   K.panel(parent, { x, y, w, h, at, until, enter })   comic panel: thick black frame, slides in from one side / pops out → { el, inner, rect }
//   K.page(parent, { x, y, w, h, layout, at })          a comic page: split into panels by layout (row3 / big+2 / top+2 / 2+1 / grid4 …), panels come in one by one
//   K.read(cam, panels, [[time, panel index, zoom], …])  the camera pushes from panel to panel in reading order
//   K.print()                                       an old-paper texture over the whole frame (printed feel)
//   K.emote(parent, { at, x, y, kind })                 comic symbols: ! ? surprise lines, sweat drop, sparkle, heart, motion lines
//   K.cover(parent, { at, title, issue, tagline, url, art }) comic cover (end card)
//   K.word(parent, { at, until, text, x, y, size })     comic big word (outline + hard shadow + misregistration), slams down on a beat
//   K.burst(parent, { at, until, text, x, y, r })       burst balloon with a sound word (POW! / NEW!)
//   K.bubble(parent, { at, until, text, x, y, w, tail })speech bubble (talking / thinking / shouting), grows out from the tail point
//   K.caption(parent, { at, until, text, x, y, w })     yellow caption box
//   K.speed(parent, { at, until, cx, cy })              speed lines (start points keep stretching and shrinking)
//   K.dotWipe({ at, dur, color })                   halftone transition: dots grow to cover the frame, then shrink to reveal the next scene
//   await K.halftone(img, { ink, paper, cell })      image → halftone print (data URL)
//   await K.posterize(img, { colors })               image → three- or four-colour screen print (Warhol)
//   await K.warhol(parent, { src, at, cols, rows, palettes })  one image repeated in different colours as a grid, one cell per beat
(function () {
  const P = window.PROMO;
  if (!P) throw new Error('pop.js 要在 promo.js 之后加载');
  const { clamp, lerp } = window.EV;
  const { E, seg, set, el } = P;
  const f1 = (n) => Math.round(n * 10) / 10;
  const NS = 'http://www.w3.org/2000/svg';
  // comic bounce: a bit more exaggerated than a "refined" ease
  const pop = (q) => { const c = 2.2; return q <= 0 ? 0 : q >= 1 ? 1 : 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2); };

  function make(F, opt = {}) {
    const K = { F, E: { pop } };
    K.c = { yellow: '#FFE14D', red: '#E8312A', blue: '#1E5BD6', pink: '#FF5FA2', cyan: '#2CC6E8', green: '#27C26C', black: '#141414', paper: '#FFF8E7', ...(opt.palette || {}) };
    K.ink = opt.ink ?? K.c.black;
    K.line = F.px(opt.line ?? 7);
    K.fonts = { comic: opt.comic ?? 'Bangers, "Arial Black", Impact, sans-serif', head: opt.head ?? '"Archivo Black", "Arial Black", sans-serif', body: opt.body ?? F.theme.fonts.sans,
      letter: opt.letter ?? '"Comic Neue", "Comic Sans MS", "Chalkboard SE", sans-serif' };   // dialogue: comic hand lettering (upper case, bold)
    K.mis = F.px(opt.misreg ?? 5);   // misregistration of colour fills against the black line (px), 0 = none
    const L = K.line;

    // Ben-Day dots (CSS background, two layers offset by half a cell = a 45° diagonal grid)
    K.dots = (color, size = 7, gap = 20) => { const r = F.px(size) / 2, g = F.px(gap); return `radial-gradient(circle, ${color} ${f1(r)}px, transparent ${f1(r + 0.8)}px) 0 0/${f1(g)}px ${f1(g)}px, radial-gradient(circle, ${color} ${f1(r)}px, transparent ${f1(r + 0.8)}px) ${f1(g / 2)}px ${f1(g / 2)}px/${f1(g)}px ${f1(g)}px`; };
    // misregistration: a little cyan and a little magenta offset behind text and shapes (screen print out of register)
    K.misreg = (k = 1) => `${f1(F.px(5) * k)}px ${f1(F.px(3) * k)}px 0 ${K.c.cyan}, ${f1(-F.px(4) * k)}px ${f1(-F.px(2) * k)}px 0 ${K.c.pink}`;
    // comic lettering: thick outline + hard bottom-right shadow (+ optional misregistration)
    K.letter = (o = {}) => `-webkit-text-stroke:${f1(o.stroke ?? F.px(o.size ? Math.max(4, o.size * 0.045) : 6))}px ${o.strokeColor ?? K.ink};paint-order:stroke fill;text-shadow:${f1(F.px(o.shadow ?? 9))}px ${f1(F.px(o.shadow ?? 9))}px 0 ${o.shadowColor ?? K.ink}${o.misreg ? ', ' + K.misreg(o.misreg) : ''}`;

    // ---------- Background ----------
    // o: { color, dots: { color, size, gap } | false, rays: { color, n, cx, cy, speed (degrees/second) } | false, z }
    K.bg = (parent, o = {}) => {
      const d = el('div', `inset:0;overflow:hidden;background:${o.color ?? K.c.yellow};${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      let rays = null;
      if (o.rays) {
        const r = o.rays, n = r.n ?? 18, R = Math.hypot(F.W, F.H), cx = r.cx ?? F.W / 2, cy = r.cy ?? F.H / 2;
        const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', 2 * R); svg.setAttribute('height', 2 * R);
        svg.style.cssText = `position:absolute;left:${f1(cx - R)}px;top:${f1(cy - R)}px;transform-origin:50% 50%`;
        let path = '';
        for (let i = 0; i < n; i++) { const a0 = (i / n) * 2 * Math.PI, a1 = ((i + 0.5) / n) * 2 * Math.PI; path += `M${R},${R} L${f1(R + R * Math.cos(a0))},${f1(R + R * Math.sin(a0))} L${f1(R + R * Math.cos(a1))},${f1(R + R * Math.sin(a1))} Z `; }
        const p = document.createElementNS(NS, 'path'); p.setAttribute('d', path); p.setAttribute('fill', r.color ?? 'rgba(255,255,255,.35)'); svg.appendChild(p);
        d.appendChild(svg); rays = svg;
        svg.dataset.motion = 'skip';   // the rays turn steadily all the time; they are the ground's texture: the motion check doesn't measure them
        F.add((t) => set(svg, { transform: `rotate(${f1(t * (r.speed ?? 4))}deg)` }));
      }
      if (o.dots !== false) { const q = o.dots || {}; el('div', `inset:0;background:${K.dots(q.color ?? 'rgba(232,49,42,.22)', q.size ?? 7, q.gap ?? 20)}`, d); }
      return d;
    };

    // ---------- Comic panel ----------
    // o: { x, y, w, h, at, until, enter: 'left' | 'right' | 'top' | 'bottom' | 'pop' | 'none', exit (same values, defaults to the reverse), bg, dots: { color, size, gap }, rot, z, dur }
    K.panel = (parent, o) => {
      const m = o.misreg === undefined ? K.mis : F.px(o.misreg), bg = o.bg ?? '#FFFFFF';
      const outer = el('div', `left:${f1(o.x)}px;top:${f1(o.y)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;box-sizing:border-box;border:${f1(L)}px solid ${K.ink};background:${m ? K.c.paper : bg};overflow:hidden;box-shadow:${f1(F.px(10))}px ${f1(F.px(10))}px 0 ${K.ink};transform-origin:50% 50%;display:none;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      // misregistration: the fill is offset a little to the bottom right of the black frame, a strip of paper colour shows on the left and top (print out of register)
      const fill = el('div', m ? `left:${f1(m)}px;top:${f1(m * 0.8)}px;right:${f1(-m)}px;bottom:${f1(-m * 0.8)}px;background:${bg};overflow:hidden` : `inset:0;background:${bg};overflow:hidden`, outer);
      const dl = o.dots ? el('div', `left:${-F.px(40)}px;top:${-F.px(40)}px;right:${-F.px(40)}px;bottom:${-F.px(40)}px;background:${K.dots(o.dots.color ?? 'rgba(0,0,0,.12)', o.dots.size ?? 6, o.dots.gap ?? 18)}`, fill) : null;
      const inner = el('div', 'inset:0', outer);
      if (dl) F.add((t) => set(dl, { transform: `translate(${f1(Math.sin(t * 0.45) * F.px(14))}px,${f1(Math.cos(t * 0.37) * F.px(10))}px)` }));   // the dots drift slowly: there is always a little movement in a panel
      const enter = o.enter ?? 'left', exit = o.exit ?? enter, d = o.dur ?? 0.32, until = o.until ?? 1e9;
      const off = (side, k) => ({ left: [-k * (o.x + o.w + F.px(40)), 0], right: [k * (F.W - o.x + F.px(40)), 0], top: [0, -k * (o.y + o.h + F.px(40))], bottom: [0, k * (F.H - o.y + F.px(40))] }[side] || [0, 0]);
      if (enter !== 'none' && o.sfx !== false) F.sfx(o.at, o.sfx ?? (enter === 'pop' ? 'pop' : 'whoosh'), 0.6, { dur: d, dir: enter === 'left' ? 1 : enter === 'right' ? -1 : 0 });
      if (enter === 'pop') F.appear(o.at);
      F.add((t) => {
        const on = t >= o.at && t < until + d;
        set(outer, { display: on ? '' : 'none' });
        if (!on) return;
        // sliding in settles on a spring (a slight overshoot) while rotating upright from a tilt; popping out uses the comic bounce
        const qi = seg(t, o.at, o.at + d * 1.4, enter === 'pop' ? pop : E.spring), qo = seg(t, until, until + d, E.quartIn);
        let tx = 0, ty = 0, s = 1, r = o.rot ?? 0;
        if (enter === 'pop') { s = lerp(0.55, 1, qi); r += (1 - qi) * 8; } else if (enter !== 'none') { const [ox, oy] = off(enter, 1 - qi); tx += ox; ty += oy; r += (1 - qi) * (enter === 'left' || enter === 'top' ? -7 : 7); }
        if (qo > 0) { if (exit === 'pop') s *= 1 - qo; else if (exit !== 'none') { const [ox, oy] = off(exit, qo); tx += ox; ty += oy; r += qo * (exit === 'left' || exit === 'top' ? -6 : 6); } }
        set(outer, { transform: `translate(${f1(tx)}px,${f1(ty)}px) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(4)})` });
      });
      return { el: outer, inner, w: o.w - 2 * L, h: o.h - 2 * L, rect: { x: o.x, y: o.y, w: o.w, h: o.h } };
    };

    // ---------- Comic page ----------
    // o: { x, y, w, h (the page's area in the parent layer), layout: 'row3' | 'stack3' | 'big+2' | 'top+2' | '2+1' | 'grid4' | [[fx, fy, fw, fh], …] (fractions 0–1),
    //      gutter (space between panels, design size), at, every (interval between panels appearing, default one beat), until, panels: [{ bg, dots, rot, enter, misreg }, …] (each panel's look) }
    //   returns each panel (.inner holds content, .rect is its position in the parent layer — for K.read)
    const LAYOUTS = { row3: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]], stack3: [[0, 0, 1, 1 / 3], [0, 1 / 3, 1, 1 / 3], [0, 2 / 3, 1, 1 / 3]], 'big+2': [[0, 0, 0.58, 1], [0.58, 0, 0.42, 0.5], [0.58, 0.5, 0.42, 0.5]], 'top+2': [[0, 0, 1, 0.52], [0, 0.52, 0.5, 0.48], [0.5, 0.52, 0.5, 0.48]], '2+1': [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 1, 0.5]], grid4: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]] };
    K.page = (parent, o) => {
      const lay = Array.isArray(o.layout) ? o.layout : LAYOUTS[o.layout ?? 'row3'];
      if (!lay) throw new Error(`没有这种分格：${o.layout}（有：${Object.keys(LAYOUTS).join(' / ')}，或者自己写 [[fx, fy, fw, fh], …]）`);
      const g = F.px(o.gutter ?? 26), every = o.every ?? F.B, enters = ['left', 'top', 'right', 'bottom'];
      return lay.map(([fx, fy, fw, fh], i) => {
        const q = (o.panels || [])[i] || {}, x = o.x + fx * o.w + (fx > 0 ? g / 2 : 0), y = o.y + fy * o.h + (fy > 0 ? g / 2 : 0);
        const w = fw * o.w - (fx > 0 ? g / 2 : 0) - (fx + fw < 0.999 ? g / 2 : 0), h = fh * o.h - (fy > 0 ? g / 2 : 0) - (fy + fh < 0.999 ? g / 2 : 0);
        // a page coming in is one action: only the first panel makes a sound (a sound for every panel is too busy)
        return K.panel(parent, { x, y, w, h, at: q.at ?? o.at + i * every, until: q.until ?? o.until, enter: q.enter ?? o.enter ?? enters[i % 4], exit: q.exit ?? o.exit ?? 'none', bg: q.bg, dots: q.dots, rot: q.rot ?? [-1.2, 0.8, -0.6, 1][i % 4], misreg: q.misreg, z: q.z, sfx: q.sfx ?? (i === 0 || o.sfxAll ? undefined : false) });
      });
    };
    // camera follows reading order: keys = [[time, panel index | 'all', zoom], …]. cam is a PROMO.camera; panels must be inside cam.rig
    K.read = (cam, panels, keys, o = {}) => {
      for (const [t, k, s] of keys) {
        if (k === 'all') { cam.reset(t, o.dur ?? 0.55); continue; }
        const r = panels[k].rect, pad = F.px(o.pad ?? 40), fit = { x: r.x - pad, y: r.y - pad, w: r.w + 2 * pad, h: r.h + 2 * pad };
        cam.focus(t, o.dur ?? 0.55, r.x + r.w / 2, r.y + r.h / 2, s ?? 1.6, { fit, ease: o.ease ?? E.cubicInOut });
      }
    };

    // ---------- Comic big word ----------
    // o: { at, until, text, x, y, w (width: the centring area), size, color, font, stroke, shadow, misreg, rot, enter: 'slam' | 'pop' | 'letters', kind, align }
    //   x / y is the line's centre; enter 'letters': the letters pop up one at a time
    K.word = (parent, o) => {
      const size = F.px(o.size ?? 200), font = o.font ?? K.fonts.comic, until = o.until ?? 1e9;
      const box = el('div', `left:${f1((o.x ?? F.W / 2) - F.W)}px;width:${f1(2 * F.W)}px;top:${f1((o.y ?? F.H / 2) - size * 0.6)}px;text-align:center;white-space:nowrap;display:none;transform-origin:50% 50%;pointer-events:none;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      const css = `font:${o.weight ?? 400} ${f1(size)}px/1.2 ${font};letter-spacing:${o.spacing ?? '.02em'};color:${o.color ?? K.c.yellow};${K.letter({ size: o.size ?? 200, stroke: o.stroke, shadow: o.shadow, misreg: o.misreg })}`;
      const t = el('span', `position:relative;display:inline-block;${css}`, box);
      const letters = o.enter === 'letters' ? [...o.text].map((ch) => { const s = el('span', 'position:relative;display:inline-block', t); s.textContent = ch === ' ' ? ' ' : ch; return s; }) : (t.textContent = o.text, null);
      F.text(t, o.kind ?? 'slam', o.text, o.at, until);
      if (o.sfx !== false) F.sfx(o.at, o.sfx ?? (o.enter === 'letters' ? 'pop' : 'pow'), o.gain ?? 0.8, { size: 0.7 });
      if (o.enter !== 'letters') F.appear(o.at);
      // shrink automatically if too wide
      let fit = null;
      F.add((tt) => {
        const on = tt >= o.at && tt < until + 0.15;
        set(box, { display: on ? '' : 'none' });
        if (!on) return;
        // measuring 0 = an outer layer is still hidden this frame: don't remember it, measure again next frame
        if (fit === null && t.scrollWidth > 1) { const w = t.scrollWidth * 1.15; fit = w > (o.w ?? F.W * 0.94) ? (o.w ?? F.W * 0.94) / w : 1; }
        const fk = fit ?? 1;
        const out = 1 - seg(tt, until, until + 0.15, E.quartIn);
        if (letters) {
          letters.forEach((s, i) => { const q = seg(tt, o.at + i * 0.045, o.at + i * 0.045 + 0.28, pop); set(s, { transform: `translateY(${f1((1 - q) * size * 0.5)}px) scale(${Math.max(0, q).toFixed(3)}) rotate(${f1((i % 2 ? 1 : -1) * 4 * (1 - q))}deg)` }); });
          const bob = Math.sin((tt - o.at) * 2.4) * F.px(6) * seg(tt, o.at + 0.6, o.at + 1.2);
          set(box, { transform: `translateY(${f1(bob)}px) rotate(${o.rot ?? 0}deg) scale(${(fk * out).toFixed(4)})` });
        } else {
          const q = seg(tt, o.at, o.at + 0.26, o.enter === 'pop' ? pop : E.expoOut);
          const s = o.enter === 'pop' ? lerp(0.3, 1, q) : lerp(1.7, 1, q), bob = Math.sin((tt - o.at) * 2.4) * F.px(6) * seg(tt, o.at + 0.3, o.at + 0.8);
          set(box, { transform: `translateY(${f1(bob)}px) rotate(${f1((o.rot ?? -4) + (1 - q) * 8)}deg) scale(${(s * fk * out).toFixed(4)})`, opacity: String(Math.min(1, q * 3)) });
        }
      });
      return { el: box, text: t };
    };

    // ---------- Burst balloon ----------
    // o: { at, until, text, x, y, r, points, jag, fill, stroke, textColor, size, rot, seed, shake }
    K.burst = (parent, o) => {
      const r = F.px(o.r ?? 230), n = o.points ?? 14, jag = o.jag ?? 0.32, rnd = EV.rng(o.seed ?? o.text ?? 'burst'), until = o.until ?? 1e9;
      const box = el('div', `left:${f1(o.x - r * 1.2)}px;top:${f1(o.y - r * 1.2)}px;width:${f1(r * 2.4)}px;height:${f1(r * 2.4)}px;display:none;transform-origin:50% 50%;pointer-events:none;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      const pts = [];
      for (let i = 0; i < 2 * n; i++) { const a = (i / (2 * n)) * 2 * Math.PI - Math.PI / 2, rr = i % 2 ? r * (1 - jag) * (0.85 + 0.3 * rnd()) : r * (0.9 + 0.22 * rnd()); pts.push(`${f1(r * 1.2 + rr * Math.cos(a))},${f1(r * 1.2 + rr * 0.82 * Math.sin(a))}`); }
      box.innerHTML = `<svg width="${f1(r * 2.4)}" height="${f1(r * 2.4)}" style="position:absolute;left:0;top:0;overflow:visible"><polygon points="${pts.join(' ')}" fill="${K.ink}" transform="translate(${f1(F.px(12))},${f1(F.px(12))})"/><polygon points="${pts.join(' ')}" fill="${o.fill ?? K.c.yellow}" stroke="${K.ink}" stroke-width="${f1(L)}" stroke-linejoin="round"/></svg>`;
      const size = F.px(o.size ?? r / F.u * 0.42);
      const tx = el('div', `left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;font:400 ${f1(size)}px/1.05 ${o.font ?? K.fonts.comic};letter-spacing:.03em;color:${o.textColor ?? K.c.red};${K.letter({ size: size / F.u, shadow: o.textShadow ?? 6 })};white-space:pre-line`, box, '');
      tx.textContent = o.text;
      F.text(tx, o.kind ?? 'slam', o.text.replace(/\n/g, ' '), o.at, until);
      if (o.sfx !== false) F.sfx(o.at, o.sfx ?? 'pow', o.gain ?? 1, { size: 0.9 });
      F.appear(o.at);
      F.add((t) => {
        const on = t >= o.at && t < until + 0.15;
        set(box, { display: on ? '' : 'none' });
        if (!on) return;
        const q = seg(t, o.at, o.at + 0.22, pop), out = 1 - seg(t, until, until + 0.15, E.quartIn);
        // after landing it shakes twice (two frames per beat: the comic feel)
        const sh = o.shake === false ? 0 : (1 - seg(t, o.at + 0.22, o.at + 0.5)) * F.px(6) * ((Math.floor(t * 12) % 2) ? 1 : -1);
        const idle = seg(t, o.at + 0.4, o.at + 0.9), wob = Math.sin((t - o.at) * 3.1) * 2.5 * idle, br = 1 + 0.025 * Math.sin((t - o.at) * 4.2) * idle;   // after settling it sways slowly and breathes gently
        set(box, { transform: `translate(${f1(sh)}px,${f1(-sh * 0.5)}px) rotate(${f1((o.rot ?? -8) + (1 - q) * 25 + wob)}deg) scale(${(lerp(0.1, 1, q) * out * br).toFixed(4)})` });
      });
      return { el: box, text: tx };
    };

    // ---------- Speech bubble ----------
    // o: { at, until, text, x, y (bubble's top-left, px), w (width, px), tail: [x, y] (the point the tail points at, parent-layer coordinates), kind: 'speech' | 'thought' | 'shout',
    //      size, font, color, bg, typing (seconds of typing; omitted = appears at once), align, pad }
    K.bubble = (parent, o) => {
      const until = o.until ?? 1e9, pad = F.px(o.pad ?? 26), size = F.px(o.size ?? 40), w = o.w ?? F.px(560), lw = L * 0.75;
      const box = el('div', `left:${f1(o.x)}px;top:${f1(o.y)}px;width:${f1(w)}px;display:none;pointer-events:none;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      const svg = document.createElementNS(NS, 'svg'); svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible'; box.appendChild(svg);
      // dialogue defaults to comic hand lettering in upper case (upper case on screen; the registered text is still the original, so fact checking is unaffected)
      const tx = el('div', `position:relative;padding:${f1(pad)}px ${f1(pad * 1.15)}px;font:${o.weight ?? 700} ${f1(size)}px/1.22 ${o.font ?? K.fonts.letter};color:${o.color ?? K.ink};text-align:${o.align ?? 'left'};${(o.upper ?? !o.font) ? 'text-transform:uppercase;letter-spacing:.02em;' : ''}`, box);
      const tail = o.tail;
      F.prep(() => {
        // measure the height from the full text: the bubble and its panel are both still hidden now, so measure an invisible copy on the stage
        const m = tx.cloneNode(false); m.style.cssText = tx.style.cssText + `;position:absolute;left:0;top:0;width:${f1(w)}px;box-sizing:border-box;visibility:hidden`; m.textContent = o.text; F.stage.appendChild(m);
        const h = m.offsetHeight; m.remove();
        tx.textContent = o.text;
        const bw = w, rad = Math.min(h / 2, F.px(o.kind === 'shout' ? 10 : 48));
        let shape = '', tl = '';
        if (o.kind === 'shout') {
          const rnd = EV.rng(o.text), sp = [], n = 22;
          for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI, k = i % 2 ? 1.0 : 1.14 + 0.06 * rnd(); sp.push(`${f1(bw / 2 + (bw / 2) * k * Math.cos(a))},${f1(h / 2 + (h / 2) * k * Math.sin(a))}`); }
          shape = `<polygon points="${sp.join(' ')}"/>`;
        } else shape = `<rect x="0" y="0" width="${f1(bw)}" height="${f1(h)}" rx="${f1(rad)}" ry="${f1(rad)}"/>`;
        if (tail && o.kind !== 'thought') {
          const ax = clamp(tail[0] - o.x, bw * 0.15, bw * 0.85), base = tail[1] > o.y + h / 2 ? h - 2 : 2;
          tl = `<polygon points="${f1(ax - F.px(26))},${f1(base)} ${f1(ax + F.px(26))},${f1(base)} ${f1(tail[0] - o.x)},${f1(tail[1] - o.y)}"/>`;
        }
        let dots = '';
        if (tail && o.kind === 'thought') { for (let i = 1; i <= 3; i++) { const q = i / 4, cx = lerp(bw / 2, tail[0] - o.x, q), cy = lerp(h, tail[1] - o.y, q), rr = F.px(18 - i * 4); dots += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rr)}"/>`; } }
        // two layers: draw the outline first (shape + tail), then the fill on top — together they make one outer contour
        svg.setAttribute('width', bw); svg.setAttribute('height', h);
        svg.innerHTML = `<g transform="translate(${f1(F.px(8))},${f1(F.px(8))})" fill="${K.ink}">${shape}${tl}${dots}</g><g fill="${K.ink}" stroke="${K.ink}" stroke-width="${f1(lw * 2)}" stroke-linejoin="round">${shape}${tl}${dots}</g><g fill="${o.bg ?? '#FFFFFF'}">${shape}${tl}${dots}</g>`;
        box.style.height = `${f1(h)}px`;
        const ox = tail ? clamp(tail[0] - o.x, 0, bw) : bw / 2, oy = tail ? clamp(tail[1] - o.y, 0, h) : h;
        box.style.transformOrigin = `${f1(ox)}px ${f1(oy)}px`;
        if (o.typing) tx.textContent = '';
      });
      if (o.typing) PROMO.typing(F, tx, o.text, { at: o.at + 0.15, dur: o.typing, caret: false, until });
      else F.text(tx, o.kind === 'shout' ? 'slam' : 'label', o.text, o.at, until);
      if (o.sfx !== false) F.sfx(o.at, o.sfx ?? 'pop', o.gain ?? 0.6, { size: 0.4 });
      F.add((t) => {
        const on = t >= o.at && t < until + 0.15;
        set(box, { display: on ? '' : 'none' });
        if (!on) return;
        const q = seg(t, o.at, o.at + 0.24, pop), out = 1 - seg(t, until, until + 0.15, E.quartIn);
        const fl = o.float === false ? 0 : Math.sin((t - o.at) * 2.1 + (o.x % 7)) * F.px(5) * seg(t, o.at + 0.3, o.at + 0.8);   // the bubble floats gently
        set(box, { transform: `translateY(${f1(fl)}px) scale(${(lerp(0.15, 1, q) * out).toFixed(4)})` });
      });
      return { el: box, text: tx };
    };

    // ---------- Caption box ----------
    // o: { at, until, text, x, y, w (px, optional), size, bg, color, font, enter: 'left' | 'top' }
    K.caption = (parent, o) => {
      const until = o.until ?? 1e9, size = F.px(o.size ?? 34);
      const box = el('div', `left:${f1(o.x)}px;top:${f1(o.y)}px;${o.w ? `width:${f1(o.w)}px;` : ''}box-sizing:border-box;padding:${f1(size * 0.45)}px ${f1(size * 0.7)}px;background:${o.bg ?? K.c.yellow};border:${f1(L * 0.75)}px solid ${K.ink};box-shadow:${f1(F.px(8))}px ${f1(F.px(8))}px 0 ${K.ink};font:400 ${f1(size)}px/1.15 ${o.font ?? K.fonts.comic};letter-spacing:.04em;color:${o.color ?? K.ink};text-transform:uppercase;display:none;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      box.textContent = o.text;
      F.text(box, o.kind ?? 'label', o.text, o.at, until);
      if (o.sfx !== false) F.sfx(o.at, o.sfx ?? 'whoosh', 0.35, { dur: 0.25, dir: 1 });
      F.add((t) => {
        const on = t >= o.at && t < until + 0.2;
        set(box, { display: on ? '' : 'none' });
        if (!on) return;
        const q = seg(t, o.at, o.at + 0.25, E.quartOut), out = seg(t, until, until + 0.2, E.quartIn);
        set(box, { transform: o.enter === 'top' ? `translateY(${f1((1 - q - out) * -F.px(80))}px)` : `translateX(${f1((1 - q) * -F.px(160) - out * F.px(160))}px)`, opacity: String(Math.min(q * 3, 1 - out)) });
      });
      return box;
    };

    // ---------- Speed lines ----------
    // o: { at, until, cx, cy, color, n, inner (radius of the empty centre), pulse (speed of stretching), z }
    K.speed = (parent, o) => {
      const until = o.until ?? 1e9, R = Math.hypot(F.W, F.H), n = o.n ?? 42, inner = F.px(o.inner ?? 260);
      const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', F.W); svg.setAttribute('height', F.H);
      svg.style.cssText = `position:absolute;left:0;top:0;pointer-events:none;display:none;${o.z !== undefined ? `z-index:${o.z};` : ''}`;
      const p = document.createElementNS(NS, 'path'); p.setAttribute('fill', o.color ?? K.ink); svg.appendChild(p); parent.appendChild(svg);
      const cx = o.cx ?? F.W / 2, cy = o.cy ?? F.H / 2;
      F.add((t) => {
        const on = t >= o.at && t < until;
        set(svg, { display: on ? '' : 'none' });
        if (!on) return;
        // each line's angle and thickness are fixed (seeded by index); the distance of its start point stretches continuously over time — punchy, but no frame-to-frame jumps (the film check doesn't report a jump)
        let d = '';
        for (let i = 0; i < n; i++) { const r = EV.rng(i * 31 + 7), a = (i / n) * 2 * Math.PI + r() * 0.12 + 0.015 * Math.sin(t * 1.3 + i), w = 0.006 + r() * 0.012, r0 = inner * (0.9 + 0.5 * (0.5 + 0.5 * Math.sin(t * (o.pulse ?? 7) + i * 1.7))); d += `M${f1(cx + r0 * Math.cos(a))},${f1(cy + r0 * Math.sin(a))} L${f1(cx + R * Math.cos(a - w))},${f1(cy + R * Math.sin(a - w))} L${f1(cx + R * Math.cos(a + w))},${f1(cy + R * Math.sin(a + w))} Z `; }
        p.setAttribute('d', d);
      });
      return svg;
    };

    // ---------- Halftone transition ----------
    // dots grow from small until they cover the frame (fully covered at at + dur/2 — the scene changes here), then shrink to reveal the next scene. o: { at, dur, color, gap, z, bands }
    // the dots don't all grow at once: they are split into diagonal bands, each a little later than the last (sweeping from corner to corner like comic dots).
    //   with same-size dots everywhere, the whole frame changes at once on the frame where they "just join up / just split open" — the film check reports a jump; staggered, only one band crosses that threshold per frame
    K.dotWipe = (o) => {
      const d = o.dur ?? 0.7, g = F.px(o.gap ?? 54), R = g * 0.75, N = o.bands ?? 8;
      // the 45°-rotated dot layer must be a square at least the frame diagonal on each side to cover all four corners (a 1.5× rectangle leaves two corners exposed in landscape)
      const D = Math.hypot(F.W, F.H) * 1.06, bw = D / N;
      const layer = el('div', `left:${f1((F.W - D) / 2)}px;top:${f1((F.H - D) / 2)}px;width:${f1(D)}px;height:${f1(D)}px;pointer-events:none;display:none;transform:rotate(45deg);z-index:${o.z ?? 850}`, F.stage);
      // every band uses the same dot grid (background position shifted back by the band's left edge), so no seams show between bands; each band is 1px wider to cover the seam
      const bands = Array.from({ length: N }, (_, i) => el('div', `left:${f1(i * bw)}px;top:0;width:${f1(bw + 1)}px;height:${f1(D)}px`, layer));
      F.sfx(o.at, o.sfx ?? 'whoosh', 0.7, { dur: d });
      F.blur(o.at, o.at + d, 10);
      const c = o.color ?? K.c.red, inD = 0.3, outS = 0.55, spread = 0.12;   // all fractions of dur: grow 0.3, stagger 0.12 → all covered before 0.42; shrinking starts one by one at 0.55
      F.add((t) => {
        const on = t >= o.at && t < o.at + d;
        set(layer, { display: on ? '' : 'none' });
        if (!on) return;
        const q = (t - o.at) / d;
        bands.forEach((b, i) => {
          const dl = (spread * i) / Math.max(1, N - 1);
          // the radius must be continuous: grow → hold covered a moment → shrink (cubicInOut is slow at both ends, so no big patch opens up at once)
          const k = q < outS ? E.cubicInOut(clamp((q - dl) / inD)) : 1 - E.cubicInOut(clamp((q - outS - dl) / inD)), r = Math.max(0.01, R * 1.2 * k), x0 = i * bw;
          set(b, { background: `radial-gradient(circle, ${c} ${f1(r)}px, transparent ${f1(r + 1)}px) ${f1(-x0)}px 0/${f1(g)}px ${f1(g)}px, radial-gradient(circle, ${c} ${f1(r)}px, transparent ${f1(r + 1)}px) ${f1(g / 2 - x0)}px ${f1(g / 2)}px/${f1(g)}px ${f1(g)}px` });
        });
      });
      return o.at + d / 2;
    };

    // ---------- Image → halftone / screen print ----------
    const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
    const lumOf = (data, i) => (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    // halftone print: o: { ink, paper, cell (dot spacing, px), angle (degrees), gamma, max (largest dot as a fraction of the cell), width (output width) }
    K.halftone = async (src, o = {}) => {
      try {
        const im = await loadImg(src), W = Math.min(o.width ?? 1400, im.naturalWidth), H = Math.round((W / im.naturalWidth) * im.naturalHeight);
        const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
        g.drawImage(im, 0, 0, W, H); const px = g.getImageData(0, 0, W, H).data;
        g.fillStyle = o.paper ?? K.c.paper; g.fillRect(0, 0, W, H); g.fillStyle = o.ink ?? K.ink;
        const cell = o.cell ?? 9, a = ((o.angle ?? 45) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a), R = Math.hypot(W, H), gamma = o.gamma ?? 0.85, mx = o.max ?? 0.72;
        for (let i = -R / cell; i < R / cell; i++) for (let j = -R / cell; j < R / cell; j++) {
          const x = W / 2 + (i * ca - j * sa) * cell, y = H / 2 + (i * sa + j * ca) * cell;
          if (x < -cell || y < -cell || x > W + cell || y > H + cell) continue;
          const xi = clamp(Math.round(x), 0, W - 1), yi = clamp(Math.round(y), 0, H - 1), v = 1 - lumOf(px, (yi * W + xi) * 4);
          const r = Math.pow(v, gamma) * cell * mx; if (r < 0.4) continue;
          g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fill();
        }
        return c.toDataURL('image/png');
      } catch (e) { console.warn('halftone 失败（读不到图片像素），用原图：' + e.message); return src; }
    };
    // screen print (Warhol): brightness split into a few levels, one colour per level. o: { colors: [darkest, …, lightest], width, dots: halftone on the middle level (colour) }
    K.posterize = async (src, o = {}) => {
      try {
        const im = await loadImg(src), W = Math.min(o.width ?? 900, im.naturalWidth), H = Math.round((W / im.naturalWidth) * im.naturalHeight);
        const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
        g.drawImage(im, 0, 0, W, H); const id = g.getImageData(0, 0, W, H), d = id.data;
        const cols = (o.colors ?? [K.ink, K.c.red, K.c.yellow]).map((h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; });
        const th = o.thresholds ?? cols.slice(1).map((_, i) => (i + 1) / cols.length);
        for (let i = 0; i < d.length; i += 4) { const v = lumOf(d, i); let k = 0; while (k < th.length && v > th[k]) k++; const cc = cols[k]; d[i] = cc[0]; d[i + 1] = cc[1]; d[i + 2] = cc[2]; }
        g.putImageData(id, 0, 0);
        return c.toDataURL('image/png');
      } catch (e) { console.warn('posterize 失败（读不到图片像素），用原图：' + e.message); return src; }
    };
    // Warhol grid: one image in several colourways, arranged cols × rows, one cell pops in per beat. o: { src, at, every, x, y, w, h, cols, rows, palettes: [[dark, mid, light], …], bgs: [ground colours …], until, gap }
    K.warhol = async (parent, o) => {
      const cols = o.cols ?? 2, rows = o.rows ?? 2, gap = F.px(o.gap ?? 14), cw = (o.w - gap * (cols - 1)) / cols, ch = (o.h - gap * (rows - 1)) / rows, every = o.every ?? F.B / 2;
      const pals = o.palettes ?? [[K.ink, K.c.pink, K.c.yellow], [K.ink, K.c.cyan, K.c.yellow], [K.ink, K.c.red, K.c.cyan], [K.ink, K.c.blue, K.c.pink]];
      const out = [];
      for (let k = 0; k < cols * rows; k++) {
        const i = k % cols, j = Math.floor(k / cols), at = o.at + k * every;
        const p = K.panel(parent, { x: o.x + i * (cw + gap), y: o.y + j * (ch + gap), w: cw, h: ch, at, until: o.until, enter: 'pop', bg: (o.bgs || [])[k % ((o.bgs || []).length || 1)] ?? pals[k % pals.length][2] });
        const url = await K.posterize(o.src, { colors: pals[k % pals.length], width: o.width ?? 700 });
        const im = el('img', `left:0;top:0;width:100%;height:100%;object-fit:${o.fit ?? 'cover'};${o.blend ? `mix-blend-mode:${o.blend};` : ''}`, p.inner); im.src = url;
        out.push(p);
      }
      return out;
    };

    // ---------- Printed feel ----------
    // an old-paper layer over the whole frame: fine fibre texture + slightly yellowed corners (multiply, static, doesn't hurt compression). o: { opacity, age (how yellowed), grain, z }
    K.print = (o = {}) => {
      const c = document.createElement('canvas'); c.width = c.height = 512;
      const g = c.getContext('2d'), img = g.createImageData(512, 512), r = EV.rng(4242), k = o.grain ?? 1;
      for (let i = 0; i < img.data.length; i += 4) { const v = 255 - r() * 34 * k; img.data[i] = v; img.data[i + 1] = v * 0.985; img.data[i + 2] = v * 0.94; img.data[i + 3] = 255; }
      g.putImageData(img, 0, 0);
      for (let j = 0; j < 260; j++) { g.strokeStyle = `rgba(120,95,60,${0.05 + r() * 0.07})`; g.lineWidth = 0.6; g.beginPath(); const x = r() * 512, y = r() * 512, a = r() * Math.PI, l = 4 + r() * 18; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      const d = el('div', `inset:0;pointer-events:none;z-index:${o.z ?? 940};background:radial-gradient(ellipse at 50% 45%, rgba(255,250,235,0) 55%, rgba(140,100,40,${o.age ?? 0.18}) 100%), url(${c.toDataURL('image/png')}) 0 0/${f1(F.px(512))}px;mix-blend-mode:multiply;opacity:${o.opacity ?? 0.6}`, F.stage);
      return d;
    };

    // ---------- Comic symbols (emotion) ----------
    // "!" "?", surprise lines, sweat drops, sparkles, hearts, motion lines next to a character. o: { at, until, x, y (symbol centre, parent-layer coordinates), kind, size (design size), color, rot, sfx }
    //   kind: '!' | '?' | 'surprise' (a ring of short lines over the head) | 'sweat' (a sweat drop sliding down) | 'sparkle' (a few twinkling stars) | 'heart' | 'motion' (motion lines behind)
    K.emote = (parent, o) => {
      const sz = F.px(o.size ?? 120), until = o.until ?? 1e9, kind = o.kind ?? '!';
      const box = el('div', `left:${f1(o.x - sz / 2)}px;top:${f1(o.y - sz / 2)}px;width:${f1(sz)}px;height:${f1(sz)}px;pointer-events:none;display:none;transform-origin:50% 100%;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      const sw = f1(F.px(5)), ink = K.ink;
      const star = (cx, cy, r, fill) => `<path d="M${cx},${cy - r} Q${cx + r * 0.18},${cy - r * 0.18} ${cx + r},${cy} Q${cx + r * 0.18},${cy + r * 0.18} ${cx},${cy + r} Q${cx - r * 0.18},${cy + r * 0.18} ${cx - r},${cy} Q${cx - r * 0.18},${cy - r * 0.18} ${cx},${cy - r}Z" fill="${fill}" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      let parts = [];
      if (kind === '!' || kind === '?') {
        const t = el('div', `inset:0;display:flex;align-items:center;justify-content:center;font:400 ${f1(sz * 0.95)}px/1 ${K.fonts.comic};color:${o.color ?? K.c.red};${K.letter({ size: (sz * 0.95) / F.u, shadow: 5 })}`, box);
        t.textContent = kind;
      } else {
        const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('width', sz); svg.setAttribute('height', sz); svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible'; box.appendChild(svg);
        const S = (html) => { const g = document.createElementNS(NS, 'g'); g.innerHTML = html; svg.appendChild(g); parts.push(g); return g; };
        if (kind === 'surprise') for (let i = 0; i < 5; i++) { const a = (-150 + i * 30) * Math.PI / 180; S(`<line x1="${f1(50 + 30 * Math.cos(a))}" y1="${f1(70 + 30 * Math.sin(a))}" x2="${f1(50 + 52 * Math.cos(a))}" y2="${f1(70 + 52 * Math.sin(a))}" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>`); }
        if (kind === 'sweat') for (let i = 0; i < 2; i++) S(`<path d="M${30 + i * 34},${20 + i * 14} Q${18 + i * 34},${44 + i * 14} ${30 + i * 34},${50 + i * 14} Q${42 + i * 34},${44 + i * 14} ${30 + i * 34},${20 + i * 14}Z" fill="${o.color ?? '#7FD3F7'}" stroke="${ink}" stroke-width="4"/>`);
        if (kind === 'sparkle') [[30, 34, 20], [72, 26, 14], [62, 70, 17]].forEach(([x, y, r]) => S(star(x, y, r, o.color ?? '#FFFFFF')));
        if (kind === 'heart') S(`<path d="M50,82 C14,58 14,26 34,24 C44,23 50,32 50,38 C50,32 56,23 66,24 C86,26 86,58 50,82Z" fill="${o.color ?? K.c.pink}" stroke="${ink}" stroke-width="5"/>`);
        if (kind === 'motion') for (let i = 0; i < 3; i++) S(`<path d="M${86 - i * 6},${28 + i * 22} Q${50},${22 + i * 22} ${10 + i * 8},${32 + i * 22}" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>`);
      }
      if (o.sfx !== false) F.sfx(o.at, o.sfx ?? (kind === 'sparkle' ? 'tick' : 'pop'), o.gain ?? 0.4, { size: 0.3 });
      F.add((t) => {
        const on = t >= o.at && t < until + 0.15;
        set(box, { display: on ? '' : 'none' });
        if (!on) return;
        const q = seg(t, o.at, o.at + 0.22, pop), out = 1 - seg(t, until, until + 0.15, E.quartIn), u = t - o.at;
        let tr = `rotate(${f1((o.rot ?? 0) + Math.sin(u * 7) * 6 * (1 - seg(t, o.at + 0.2, o.at + 0.9)))}deg) scale(${(q * out).toFixed(3)})`;
        if (kind === 'heart') tr = `translateY(${f1(-u * F.px(30))}px) ` + tr;
        set(box, { transform: tr });
        parts.forEach((g, i) => {
          if (kind === 'surprise') g.setAttribute('opacity', (0.5 + 0.5 * Math.sin(u * 14 - i)).toFixed(2));
          if (kind === 'sweat') { const k = ((u * 1.6 + i * 0.5) % 1); g.setAttribute('transform', `translate(0,${f1(k * 22)})`); g.setAttribute('opacity', (1 - k * k).toFixed(2)); }
          if (kind === 'sparkle') { const k = 0.5 + 0.5 * Math.sin(u * 6 + i * 2.1), cx = [30, 72, 62][i], cy = [34, 26, 70][i]; g.setAttribute('transform', `translate(${cx},${cy}) scale(${(0.4 + 0.6 * k).toFixed(3)}) rotate(${f1(u * 40)}) translate(${-cx},${-cy})`); }
          if (kind === 'motion') g.setAttribute('transform', `translate(${f1(-((u * 3 + i * 0.3) % 1) * 12)},0)`);
        });
      });
      return box;
    };

    // ---------- Comic cover ----------
    // for the end card: a comic book cover pops into the centre of the frame — masthead (big title), issue box, cover art (drawn in the art callback), tagline and URL at the bottom, appearing in turn.
    // o: { at, until, x, y, w, h, title, issue (e.g. '#1'), kicker (small text above the masthead), tagline, url, band (masthead colour), bg (cover art background),
    //      titleColor, titleSize, art: (area element, area width, area height, appear time) => {}, rot }
    K.cover = (parent, o) => {
      // portrait: the whole cover sits higher, keeping the URL at the bottom out of the platform caption zone (bottom 20%)
      const w = o.w ?? (F.portrait ? F.W * 0.84 : F.H * 0.78 * 0.72), h = o.h ?? (F.portrait ? F.H * 0.64 : F.H * 0.78),   /* in landscape the cover's top edge is 11% from the top of the frame: the masthead doesn't touch the top */ x = o.x ?? (F.W - w) / 2, y = o.y ?? (F.portrait ? F.H * 0.1 : (F.H - h) / 2), until = o.until ?? 1e9;
      const cv = K.panel(parent, { x, y, w, h, at: o.at, until, enter: 'pop', exit: 'none', bg: o.bg ?? K.c.yellow, rot: o.rot ?? -2, z: o.z });
      const I = cv.inner, iw = cv.w, ih = cv.h, bh = ih * 0.22, kh = o.kicker ? ih * 0.065 : 0, fh = ih * 0.2;
      const band = el('div', `left:0;top:0;width:${f1(iw)}px;height:${f1(bh)}px;background:${o.band ?? K.c.red};border-bottom:${f1(L)}px solid ${K.ink};overflow:hidden`, I);
      // masthead title: font size set automatically from the masthead's width and height (the issue box takes the top-left corner)
      const meas = document.createElement('canvas').getContext('2d'); meas.font = `400 100px ${K.fonts.comic}`;
      const tsz = Math.min(F.px(o.titleSize ?? 220), bh * 0.7, (iw * 0.86) / Math.max(0.5, meas.measureText(o.title).width / 100));
      // a small white banner under the masthead (kicker)
      const kick = o.kicker ? el('div', `left:0;top:${f1(bh)}px;width:${f1(iw)}px;height:${f1(kh)}px;background:#fff;border-bottom:${f1(L * 0.7)}px solid ${K.ink};display:flex;align-items:center;justify-content:center;font:400 ${f1(Math.min(F.px(28), kh * 0.5))}px ${K.fonts.head};letter-spacing:.08em;color:${K.ink};text-transform:uppercase;z-index:2`, I) : null;
      if (kick) { kick.textContent = o.kicker; F.text(kick, 'label', o.kicker, o.at, until); }
      const title = el('div', `left:0;right:0;bottom:${f1(bh * 0.13)}px;text-align:center;font:400 ${f1(tsz)}px/1 ${K.fonts.comic};letter-spacing:.02em;color:${o.titleColor ?? K.c.yellow};${K.letter({ size: tsz / F.u, shadow: 8, misreg: 0.8 })};white-space:nowrap;transform-origin:50% 100%`, band);
      title.textContent = o.title;
      F.text(title, 'logo', o.title, o.at + 0.1, until);
      const iss = o.issue ? el('div', `left:${f1(F.px(18))}px;top:${f1(bh + kh + F.px(16))}px;padding:${f1(F.px(6))}px ${f1(F.px(14))}px;background:#fff;border:${f1(L * 0.6)}px solid ${K.ink};box-shadow:${f1(F.px(5))}px ${f1(F.px(5))}px 0 ${K.ink};font:400 ${f1(F.px(54))}px/1 ${K.fonts.comic};color:${K.ink};transform-origin:0 0;z-index:3`, I) : null;   // issue box: top-left corner of the cover art
      if (iss) { iss.textContent = o.issue; F.text(iss, 'label', o.issue, o.at + 0.3, until); }
      const art = el('div', `left:0;top:${f1(bh + kh)}px;width:${f1(iw)}px;height:${f1(ih - bh - kh - fh)}px;overflow:hidden`, I);
      const foot = el('div', `left:0;bottom:0;width:${f1(iw)}px;height:${f1(fh)}px;background:#fff;border-top:${f1(L)}px solid ${K.ink};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${f1(F.px(18))}px;text-align:center`, I);
      const tg = o.tagline ? el('div', `position:relative;font:400 ${f1(F.px(o.taglineSize ?? 44))}px/1.15 ${K.fonts.head};color:${K.ink};padding:0 ${f1(F.px(20))}px`, foot) : null;
      if (tg) { tg.textContent = o.tagline; F.text(tg, 'endcard', o.tagline, o.at + 0.6, until); }
      const ur = o.url ? el('div', `position:relative;font:400 ${f1(F.px(o.urlSize ?? 60))}px/1 ${K.fonts.comic};letter-spacing:.04em;color:${K.c.red};${K.letter({ size: o.urlSize ?? 60, shadow: 4, stroke: 2.5 })}`, foot) : null;
      if (ur) { ur.textContent = o.url; F.text(ur, 'endcard', o.url, o.at + 0.8, until); }
      if (o.art) o.art(art, iw, ih - bh - kh - fh, o.at + 0.4);
      F.sfx(o.at + 0.1, 'pow', 0.9, { size: 0.9 });
      F.add((t) => {
        const qt = seg(t, o.at + 0.1, o.at + 0.36, E.expoOut);
        set(title, { transform: `scale(${lerp(1.6, 1, qt).toFixed(3)}) rotate(${f1((1 - qt) * -6)}deg)`, opacity: String(Math.min(1, qt * 3)) });
        if (iss) { const qi = seg(t, o.at + 0.3, o.at + 0.52, pop); set(iss, { transform: `scale(${Math.max(0, qi).toFixed(3)}) rotate(${f1(-6 + Math.sin((t - o.at) * 3) * 2)}deg)` }); }
        [[tg, o.at + 0.6], [ur, o.at + 0.8]].forEach(([e, a]) => { if (!e) return; const q = seg(t, a, a + 0.25, pop); set(e, { transform: `scale(${Math.max(0, q).toFixed(3)})`, opacity: q > 0 ? '1' : '0' }); });
      });
      return { ...cv, art, artW: iw, artH: ih - bh - kh - fh };
    };

    return P.infoKit ? P.infoKit(K, { warhol: 'image' }) : K;   // information density check: info components register themselves when called (promo.js's infoKit)
  }

  P.pop = make;
})();
