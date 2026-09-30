// riso.js：孔版印刷（Risograph）风格的讲解视频运行时。
// 画面由几种"专色油墨"叠印而成：每种油墨一个图层，正片叠底（multiply）混色，带套色错位、网点和油墨颗粒。
// 视频按"页"组织（像一本杂志）：b.page() 翻到新的一页，旧页被印刷滚筒扫过换成新页。
// 所有动画都是 render(t) 的纯函数。
(function () {
  const { clamp, lerp, ease, rng, progress } = window.EV;
  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const f1 = (n) => Math.round(n * 10) / 10;

  // ---------- 配色：每套 3 种油墨，按印刷顺序（浅色先印）；角色 base / main / accent ----------
  // base：大色块、字幕底、网点底色；main：文字和轮廓；accent：强调（关键词、关键数字、箭头）
  const PALETTES = {
    lively: { name: '活泼', paper: '#F3EEE3', inks: { yellow: '#FFE800', blue: '#0078BF', pink: '#FF48B0' }, roles: { base: 'yellow', main: 'blue', accent: 'pink' }, grain: 1, misreg: 1, boil: 8 },
    news: { name: '报刊', paper: '#EEEAE0', inks: { ochre: '#E3A72F', red: '#D93A2F', black: '#262320' }, roles: { base: 'ochre', main: 'black', accent: 'red' }, grain: 0.45, misreg: 0.5, boil: 0 },
    food: { name: '美食', paper: '#F4EEE2', inks: { yellow: '#FFE800', teal: '#00838A', red: '#FF665E' }, roles: { base: 'yellow', main: 'teal', accent: 'red' }, grain: 0.9, misreg: 1, boil: 8 },
    tech: { name: '科技', paper: '#F1EFEA', inks: { yellow: '#FFE800', orange: '#FF6C2F', blue: '#0078BF' }, roles: { base: 'yellow', main: 'blue', accent: 'orange' }, grain: 0.8, misreg: 0.8, boil: 6 },
    mind: { name: '心理', paper: '#F3EEE6', inks: { yellow: '#FFE800', pink: '#FF48B0', purple: '#765BA7' }, roles: { base: 'yellow', main: 'purple', accent: 'pink' }, grain: 0.9, misreg: 1, boil: 8 },
    nature: { name: '自然', paper: '#F2EEE2', inks: { yellow: '#FFE800', green: '#00A95C', blue: '#0078BF' }, roles: { base: 'yellow', main: 'blue', accent: 'green' }, grain: 0.9, misreg: 1, boil: 8 },
  };
  // 字体：先用 fonts.css 里的网络 / 本机字体，都没有时回退到系统字体（不会报错）
  const FONTS = {
    serif: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", serif',
    sans: '"Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    num: '"Oswald", "DIN Condensed", "Bahnschrift", "Arial Narrow", "Noto Sans SC", sans-serif',
  };
  // 文字样式
  const TEXT = {
    title: { font: 'serif', weight: 900, size: 120, lh: 1.16, clean: false, enter: 'print' },
    head: { font: 'sans', weight: 900, size: 60, lh: 1.25, clean: false, enter: 'print' },
    body: { font: 'sans', weight: 500, size: 40, lh: 1.55, clean: true, enter: 'type' },
    label: { font: 'sans', weight: 700, size: 32, lh: 1.3, clean: true, enter: 'print' },
    num: { font: 'num', weight: 600, size: 150, lh: 1.0, clean: false, enter: 'print' },
    quote: { font: 'serif', weight: 900, size: 56, lh: 1.35, clean: false, enter: 'type' },
  };
  const NO_LINE_START = /[，。、：；！？）」』》】〉…—,.:;!?)\]}%]/;
  const backOut = (q) => { const c = 1.9; return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2); };
  const unionBox = (boxes) => {
    const bs = boxes.filter(Boolean);
    if (!bs.length) return null;
    const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y));
    return { x: x0, y: y0, w: Math.max(...bs.map((b) => b.x + b.w)) - x0, h: Math.max(...bs.map((b) => b.y + b.h)) - y0 };
  };
  const boxOf = (t) => (t && t.box ? t.box : t);
  const circleD = (x, y, r) => `M${x + r},${y} A${r},${r} 0 1 0 ${x - r},${y} A${r},${r} 0 1 0 ${x + r},${y} Z`;
  function shapeD(q) {
    if (q.circle) { const [x, y, r] = q.circle; return circleD(x, y, r); }
    if (q.ellipse) { const [x, y, rx, ry] = q.ellipse; return `M${x + rx},${y} A${rx},${ry} 0 1 0 ${x - rx},${y} A${rx},${ry} 0 1 0 ${x + rx},${y} Z`; }
    if (q.rect) { const [x, y, w, h, r = 0] = q.rect; return r ? `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z` : `M${x},${y} H${x + w} V${y + h} H${x} Z`; }
    if (q.poly) return 'M' + q.poly.map((p) => p.join(',')).join(' L') + ' Z';
    throw new Error('图形需要 d / circle / ellipse / rect / poly 之一');
  }

  // ---------- 元素 ----------
  class Item {
    constructor(b, o = {}) {
      this.b = b;
      this.o = o;
      let s = o.at;
      if (s && typeof s === 'object') s = s.end;
      if (s === undefined || s === null) s = b.cursor;
      this.start = s + (o.delay || 0);
      this.page = o.hud ? b.hudPage : b.cur;
      if (!this.page) throw new Error('还没有页面：先调用 b.cover() 或 b.page()，再往上面画东西');
      const frames = (new Error().stack || '').split('\n').filter((l) => /\.html:\d+/.test(l) && !/\/lib\//.test(l))
        .map((l) => /\/([^\/\s)]+\.html):(\d+)/.exec(l)).filter(Boolean).map((m) => `${m[1]}:${m[2]}`);
      this.src = [...new Set(frames)].slice(0, 2).join(' ← ');
      this.parts = [];
      this.exits = [];
      this.moves = [];
      this.pulses = [];
      this._vis = null;
    }
    get end() { return this.start + this.dur; }
    get done() { return this.end; }
    describe() {
      const b = this.box;
      const txt = this.label ? `"${this.label.slice(0, 14)}${this.label.length > 14 ? '…' : ''}"` : '';
      return `${this.kind || '元素'}${txt}` + (b ? `（${Math.round(b.x + b.w / 2)}, ${Math.round(b.y + b.h / 2)}）` : '');
    }
    // 某种油墨上的一个图层片段；clean = 不加油墨颗粒（正文小字用，保证清晰）；tag 区分同一油墨的不同用途（如网点）
    part(ink, clean = false, tag = '') {
      ink = this.b.ink(ink);
      let p = this.parts.find((x) => x.ink === ink && x.clean === clean && x.tag === tag);
      if (!p) {
        p = { ink, clean, tag, g: svgEl('g', {}, this.page.g[ink][clean ? 'clean' : 'tex']) };
        this.parts.push(p);
      }
      return p.g;
    }
    // 创建完成：按印刷顺序给每种油墨一个"套印滑入"方向
    finish() {
      const order = this.b.inkNames;
      const inks = order.filter((k) => this.parts.some((p) => p.ink === k));
      const r = rng(this.b.nextSeed());
      const amp = 18 * this.b.P.misreg + 6;
      const dir = {};
      inks.forEach((k) => { const a = r() * Math.PI * 2; dir[k] = [Math.cos(a) * amp, Math.sin(a) * amp]; });
      for (const p of this.parts) { p.i = inks.indexOf(p.ink); p.n = inks.length; [p.sx, p.sy] = dir[p.ink]; p.g.style.display = 'none'; }
      this.b.add(this);
      return this;
    }
    erase(at, dur = 0.35) { this.exits.push({ at: at ?? this.b.cursor, dur }); return this; }
    pulse(at, amt = 1.08, dur = 0.5) { this.pulses.push({ at, amt, dur }); return this; }
    move(at, dx, dy, dur = 0.6, e = ease.inOut) { this.moves.push({ at, dx, dy, s: 1, dur, e }); this.moves.sort((a, c) => a.at - c.at); return this; }
    // 移动 / 缩放到新位置：x, y 是元素中心要到达的位置，scale 是最终大小（相对原始大小）。跨页元素（hud: true）翻页时用它挪到新位置
    to(at, o = {}, dur = 0.7, e = ease.inOut) {
      if (at && typeof at === 'object') at = at.end;
      const b = this.boxAt(at), cur = this.offsetAt(at)[2];
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      this.moves.push({ at, dx: (o.x ?? cx) - cx, dy: (o.y ?? cy) - cy, s: (o.scale ?? cur) / cur, dur, e });
      this.moves.sort((a, c) => a.at - c.at);
      return this;
    }
    offsetAt(t) {
      let dx = 0, dy = 0, s = 1;
      for (const m of this.moves) { const q = progress(t, m.at, m.dur, m.e); dx += m.dx * q; dy += m.dy * q; s *= lerp(1, m.s ?? 1, q); }
      return [dx, dy, s];
    }
    boxAt(t) {
      const b = this.box;
      if (!b || !this.moves.length) return b;
      const [dx, dy, s] = this.offsetAt(t);
      return { x: b.x + b.w / 2 + dx - (b.w * s) / 2, y: b.y + b.h / 2 + dy - (b.h * s) / 2, w: b.w * s, h: b.h * s };
    }
    update(t) {
      let fade = 1;
      for (const x of this.exits) fade = Math.min(fade, 1 - progress(t, x.at, x.dur, ease.inOut));
      const vis = t >= this.start && fade > 0.001;
      if (vis !== this._vis) { this._vis = vis; for (const p of this.parts) p.g.style.display = vis ? '' : 'none'; }
      if (!vis) return;
      const q = this.dur > 0 ? clamp((t - this.start) / this.dur) : 1;
      const [mx, my, ms] = this.offsetAt(t);
      let s = ms;
      for (const pl of this.pulses) { const k = clamp((t - pl.at) / pl.dur); if (k > 0 && k < 1) s *= 1 + (pl.amt - 1) * Math.sin(Math.PI * k); }
      const b = this.box || { x: 0, y: 0, w: 0, h: 0 }, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      if (this.pre) this.pre(t, q);
      for (const p of this.parts) {
        let tx = mx, ty = my, op = fade, sc = s, rot = 0;
        if (this.enter === 'print') {
          // 图形按油墨先后印；文字的几种颜色同时印（否则关键词会比整句先出现）
          const n = this.together ? 1 : p.n, i = this.together ? 0 : p.i;
          const d1 = n > 1 ? 0.62 : 1, st = n > 1 ? (1 - d1) / (n - 1) : 0;
          const qi = clamp((q - i * st) / d1);
          p.qi = qi;
          if (!p.tag) { const k = ease.out(qi); tx += p.sx * (1 - k); ty += p.sy * (1 - k); op *= clamp(qi * 2.5); }
        } else if (this.enter === 'stamp') {
          sc *= lerp(1.45, 1, backOut(q));
          rot = 7 * (1 - ease.out(q));
          op *= clamp(q * 5);
          p.qi = q;
        } else if (this.enter === 'fade') { op *= ease.inOut(q); p.qi = q; } else p.qi = q;
        let tf = tx || ty ? `translate(${f1(tx)},${f1(ty)})` : '';
        if (sc !== 1 || rot) tf += ` translate(${f1(cx)},${f1(cy)}) rotate(${f1(rot)}) scale(${sc.toFixed(4)}) translate(${f1(-cx)},${f1(-cy)})`;
        if (p.extra) tf += ' ' + p.extra;
        if (tf !== p._tf) { p._tf = tf; if (tf) p.g.setAttribute('transform', tf); else p.g.removeAttribute('transform'); }
        const o2 = op >= 0.999 ? '' : String(Math.round(op * 1000) / 1000);
        if (o2 !== p._op) { p._op = o2; p.g.style.opacity = o2; }
      }
      if (this.draw) this.draw(t, q);
    }
  }

  // 网点：在 d 形状里按 density(x, y)（0..1）画大小不一的圆点；返回圆点列表（用于"网点生长"动画）
  function halftone(b, g, d, bb, q, ink) {
    const id = 'ht' + b.nextSeed();
    svgEl('path', { d, transform: q.transform }, svgEl('clipPath', { id }, b.defs));
    const cell = (q.cell ?? 11) * (q.scale ?? 1);
    const idx = b.inkNames.indexOf(ink);
    const ang = (((q.angle ?? [15, 75, 45, 0][idx % 4]) * Math.PI) / 180);
    let dens = q.density ?? 0.6;
    if (typeof dens === 'number' && !q.light) { const v = dens; dens = () => v; }
    else if (typeof dens === 'number') dens = [0.1, dens];
    else if (typeof dens !== 'function') {
      const [lo, hi] = Array.isArray(dens) ? dens : [0.1, 0.9];
      const [lx, ly] = q.light || [bb.x, bb.y];
      const R = Math.hypot(bb.w, bb.h) * 0.95;
      dens = (x, y) => lo + (hi - lo) * clamp(Math.hypot(x - lx, y - ly) / R);
    }
    const [ox, oy] = q.light || [bb.x, bb.y];
    const R = Math.hypot(bb.w, bb.h) || 1;
    const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2, half = Math.hypot(bb.w, bb.h) / 2 + cell;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const gg = svgEl('g', { 'clip-path': `url(#${id})` }, g);
    const dots = [];
    for (let u = -half; u <= half; u += cell) for (let v = -half; v <= half; v += cell) {
      const x = cx + u * ca - v * sa, y = cy + u * sa + v * ca;
      if (x < bb.x - cell || x > bb.x + bb.w + cell || y < bb.y - cell || y > bb.y + bb.h + cell) continue;
      const r = cell * 0.62 * Math.sqrt(clamp(dens(x, y)));
      if (r < 0.45) continue;
      const el = svgEl('circle', { cx: f1(x), cy: f1(y), r: r.toFixed(2) }, gg);
      dots.push({ el, r, o: clamp(Math.hypot(x - ox, y - oy) / R) });
    }
    return dots;
  }

  // 图形：部件列表，每个部件 { d | circle | rect | ellipse | poly, ink, fill: 'solid' | 'halftone' | 'none', stroke, ... }
  class Shape extends Item {
    constructor(b, parts, o = {}) {
      super(b, o);
      this.kind = o.kind || '图形';
      this.dur = o.dur ?? 0.55;
      this.enter = o.enter ?? 'print';
      const boxes = [];
      this.dots = [];
      for (const sp of [].concat(parts)) {
        const q = typeof sp === 'string' ? { d: sp } : sp;
        const d = q.d ?? shapeD(q);
        const ink = b.ink(q.ink ?? o.ink ?? 'main');
        const sw = q.stroke ?? o.stroke;
        const fill = q.fill ?? o.fill ?? (sw ? 'none' : 'solid');
        const bb = b.bboxOf(d, sw && fill === 'none' ? sw : 0, q.transform);
        boxes.push(bb);
        const clean = q.clean ?? o.clean ?? false;
        if (fill === 'solid') svgEl('path', { d, transform: q.transform, 'fill-rule': q.rule, opacity: q.opacity }, this.part(ink, clean));
        else if (fill === 'halftone') this.dots.push(...halftone(b, this.part(ink, false, 'dots'), d, bb, { ...o.halftone, ...q }, ink).map((x) => ({ ...x, ink })));
        if (sw) {
          const sInk = b.ink(q.strokeInk ?? o.strokeInk ?? ink);
          svgEl('path', { d, transform: q.transform, fill: 'none', stroke: b.col(sInk), 'stroke-width': sw, 'stroke-linecap': q.cap ?? 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': q.dash ?? o.dash }, this.part(sInk, clean));
        }
      }
      this.box = unionBox(boxes);
      if (this.enter === 'wipe') this.setupWipe(o.from);
      if (this.enter === 'rise') this.setupRise(o.baseline ?? this.box.y + this.box.h);
      this.finish();
    }
    // 从一端"刷"出来：from = [x, y, 角度(度)]，默认从左往右
    setupWipe(from) {
      const bx = this.box, [x, y, deg] = from || [bx.x, bx.y + bx.h / 2, 0];
      const a = (deg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
      // 沿方向的长度：外框四个角在方向上的最大投影
      const L = Math.max(...[[bx.x, bx.y], [bx.x + bx.w, bx.y], [bx.x, bx.y + bx.h], [bx.x + bx.w, bx.y + bx.h]].map(([px, py]) => (px - x) * ca + (py - y) * sa)) + 20;
      const id = 'wp' + this.b.nextSeed();
      const cp = svgEl('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, this.b.defs);
      this.wipeRect = svgEl('rect', { x: -40, y: -4000, width: 0, height: 8000, transform: `translate(${f1(x)},${f1(y)}) rotate(${deg})` }, cp);
      this.wipeL = L + 40;
      for (const p of this.parts) p.g.setAttribute('clip-path', `url(#${id})`);
      this.enter = 'none';
      this.wipe = true;
    }
    setupRise(by) { this.riseY = by; this.enter = 'none'; }
    // 从基线往上长（柱状图）
    pre(t, q) {
      if (this.riseY === undefined) return;
      const k = ease.out(q);
      const ex = k >= 1 ? '' : `translate(0,${f1(this.riseY)}) scale(1,${Math.max(0.001, k).toFixed(4)}) translate(0,${f1(-this.riseY)})`;
      for (const p of this.parts) p.extra = ex;
    }
    draw(t, q) {
      if (this.wipe) { const w = (this.wipeL * ease.inOut(q)).toFixed(1); if (w !== this._w) { this._w = w; this.wipeRect.setAttribute('width', w); } }
      // 网点生长：印刷式出场时跟着这种油墨的进度，否则跟整体进度；离光源近的点先长出来
      if (this.dots.length) {
        const key = this.parts.filter((p) => p.tag === 'dots').map((p) => (p.qi ?? q).toFixed(3)).join(',');
        if (key === this._dk) return;
        this._dk = key;
        for (const d of this.dots) {
          const p = this.parts.find((x) => x.tag === 'dots' && x.ink === d.ink);
          const k = this.riseY !== undefined ? 1 : clamp((p.qi ?? q) * 1.7 - d.o * 0.7);
          const r = d.r * ease.out(k);
          d.el.setAttribute('r', r.toFixed(2));
        }
      }
    }
  }

  // 文字：str 里可以用 {accent:关键词} / {main:…} / {油墨名:…} 给局部换色；w 为自动换行宽度
  class Text extends Item {
    constructor(b, str, o = {}) {
      super(b, o);
      this.kind = o.kind || '文字';
      const st = TEXT[o.style || 'body'];
      if (!st) throw new Error(`没有这种文字样式："${o.style}"，可用：${Object.keys(TEXT).join('、')}`);
      const size = o.size ?? st.size, font = FONTS[o.font ?? st.font] || o.font, weight = o.weight ?? st.weight;
      const lh = o.lh ?? st.lh, spacing = o.spacing ?? 0, clean = o.clean ?? st.clean;
      this.size = size;
      this.fontCss = `font-family:${font};font-weight:${weight};font-size:${size}px;letter-spacing:${spacing}px`;
      const base = b.ink(o.ink ?? 'main');
      const runs = [];
      String(str).replace(/\{(\w+):([^}]*)\}|([^{]+)/g, (m, k, inner, plain) => { runs.push(k ? { text: inner, ink: b.ink(k) } : { text: plain, ink: base }); return m; });
      this.label = runs.map((r) => r.text).join('');
      // 切成不可分割的单元：英文单词 / 数字整体，汉字单个；行首禁用的标点粘在前一个单元上
      const units = [];
      for (const r of runs) {
        for (const line of r.text.split('\n').map((s, i) => [s, i])) {
          if (line[1] > 0) units.push({ br: true });
          const re = /[A-Za-z0-9.,%'’+\-−×÷=/:]+|\s+|./gu;
          let m;
          while ((m = re.exec(line[0]))) {
            const s = m[0];
            if (units.length && !units[units.length - 1].br && NO_LINE_START.test(s[0]) && units[units.length - 1].ink === r.ink) units[units.length - 1].text += s;
            else units.push({ text: s, ink: r.ink, space: /^\s+$/.test(s) });
          }
        }
      }
      for (const u of units) if (!u.br) u.w = b.measure(u.text, this.fontCss);
      const maxW = o.w ?? Infinity;
      const lines = [[]];
      let lw = 0;
      for (const u of units) {
        if (u.br) { lines.push([]); lw = 0; continue; }
        if (lw + u.w > maxW && lines[lines.length - 1].length && !u.space) { lines.push([]); lw = 0; }
        if (u.space && !lines[lines.length - 1].length) continue;
        lines[lines.length - 1].push(u);
        lw += u.w;
      }
      const L = lh * size;
      const widths = lines.map((ln) => { while (ln.length && ln[ln.length - 1].space) ln.pop(); return ln.reduce((a, u) => a + u.w, 0); });
      const W = Math.max(0, ...widths), H = lines.length * L;
      const align = o.align ?? 'left';
      let top = o.y ?? 0;
      if (o.valign === 'middle') top -= H / 2; else if (o.valign === 'bottom') top -= H;
      const x0 = o.x ?? 0;
      this.els = [];
      lines.forEach((ln, li) => {
        let x = align === 'center' ? x0 - widths[li] / 2 : align === 'right' ? x0 - widths[li] : x0;
        const y = top + li * L + (L - size) / 2 + size * 0.86;
        // 同一行里相邻、同色的单元合并成一个 <text>
        let cur = null;
        for (const u of ln) {
          if (cur && cur.ink === u.ink) { cur.text += u.text; cur.w += u.w; } else { cur && this.emit(cur, clean, li); cur = { ink: u.ink, text: u.text, x, y, w: u.w }; }
          x += u.w;
        }
        cur && this.emit(cur, clean, li);
      });
      this.nLines = lines.length;
      const bx = align === 'center' ? x0 - W / 2 : align === 'right' ? x0 - W : x0;
      this.box = { x: bx, y: top, w: W, h: H };
      this.textBox = { x: bx, y: top + (L - size) / 2, w: W, h: H - (L - size) };
      // 底色块（名牌、标签）
      if (o.bg) {
        const pad = o.pad ?? size * 0.38, bb = this.textBox;
        svgEl('rect', { x: f1(bb.x - pad), y: f1(bb.y - pad * 0.62), width: f1(bb.w + pad * 2), height: f1(bb.h + pad * 1.24) }, this.part(o.bg));
        this.box = { x: bb.x - pad, y: bb.y - pad * 0.62, w: bb.w + pad * 2, h: bb.h + pad * 1.24 };
      }
      this.enter = o.enter ?? st.enter;
      this.together = true;
      this.dur = o.dur ?? (this.enter === 'type' ? Math.min(2.4, 0.3 + 0.35 * this.nLines) : this.enter === 'stamp' ? 0.4 : 0.6);
      this.finish();
    }
    emit(run, clean, li) {
      const el = svgEl('text', { x: f1(run.x), y: f1(run.y), style: this.fontCss }, this.part(run.ink, clean));
      el.textContent = run.text;
      this.els.push({ el, line: li });
    }
    draw(t, q) {
      if (this.enter !== 'type') return;
      const n = this.nLines;
      for (const e of this.els) {
        const k = clamp(q * (n + 0.6) - e.line * 1.0);
        const s = k >= 1 ? '1' : ease.out(k).toFixed(3);
        if (s !== e._s) { e._s = s; e.el.style.opacity = s === '1' ? '' : s; e.el.setAttribute('transform', s === '1' ? '' : `translate(0,${f1(12 * (1 - Number(s)))})`); }
      }
    }
  }

  // 滚动的数字：from → to，按 decimals 位小数显示，可加 prefix / suffix
  class Num extends Item {
    constructor(b, x, y, o = {}) {
      super(b, o);
      this.kind = '数字';
      const st = TEXT.num, size = o.size ?? st.size;
      this.fmt = (v) => `${o.prefix ?? ''}${v.toLocaleString('en-US', { minimumFractionDigits: o.decimals ?? 0, maximumFractionDigits: o.decimals ?? 0 })}${o.suffix ?? ''}`;
      this.v0 = o.from ?? 0; this.v1 = o.to ?? 0;
      const css = `font-family:${FONTS[o.font ?? 'num'] || o.font};font-weight:${o.weight ?? st.weight};font-size:${size}px`;
      const anchor = { left: 'start', center: 'middle', right: 'end' }[o.align ?? 'left'];
      this.el = svgEl('text', { x: x, y: y + size * 0.86, 'text-anchor': anchor, style: css }, this.part(o.ink ?? 'accent', o.clean ?? false));
      const w = b.measure(this.fmt(this.v1), css);
      this.label = this.fmt(this.v1);
      const bx = anchor === 'start' ? x : anchor === 'middle' ? x - w / 2 : x - w;
      this.box = { x: bx, y, w, h: size };
      this.enter = o.enter ?? 'print';
      this.dur = o.dur ?? 1.2;
      this.finish();
    }
    draw(t, q) {
      const s = this.fmt(lerp(this.v0, this.v1, ease.out(q)));
      if (s !== this._s) { this._s = s; this.el.textContent = s; }
    }
  }

  const groupOf = (items, kind) => ({
    items, kind,
    get start() { return Math.min(...items.map((i) => i.start)); },
    get end() { return Math.max(...items.map((i) => i.end)); },
    get box() { return unionBox(items.map((i) => i.box)); },
    erase(at, dur) { items.forEach((i) => i.erase(at, dur)); return this; },
    move(at, dx, dy, dur, e) { items.forEach((i) => i.move(at, dx, dy, dur, e)); return this; },
    pulse(at, amt, dur) { items.forEach((i) => i.pulse(at, amt, dur)); return this; },
  });

  // ---------- 页面 ----------
  class Page {
    constructor(b, idx, start, o) {
      this.b = b; this.idx = idx; this.start = start; this.o = o;
      this.roll = o.roll ?? 0;        // 换场时长
      this.type = o.type || 'none';   // 换场方式
      this.cams = [];                 // 页内镜头
      this.drift = o.drift ?? 0.03;   // 慢推近的幅度
      this.title = o.title || '';
      this.hideAt = Infinity;
      this.hud = !!o.hud;
      this.cover = !!o.cover;
      this.g = {};
      if (!this.hud) {
        this.clipId = 'pg' + idx;
        this.clipRect = svgEl('rect', { x: -20, y: -20, width: b.W + 40, height: b.H + 40 }, svgEl('clipPath', { id: this.clipId, clipPathUnits: 'userSpaceOnUse' }, b.defs));
      }
      for (const k of b.inkNames) {
        this.g[k] = {};
        for (const kind of ['tex', 'clean']) {
          const g = svgEl('g', this.hud ? {} : { 'clip-path': `url(#${this.clipId})` }, b.layers[k][kind]);
          this.g[k][kind] = g;
        }
      }
    }
    get end() { return this.start + this.roll; }
    groups() { return this.b.inkNames.flatMap((k) => [this.g[k].tex, this.g[k].clean]); }
    // 页内镜头：{ x, y, zoom }（x, y 是画面中心对准的页面坐标）
    camAt(t) {
      let c = { x: this.b.W / 2, y: this.b.H / 2, zoom: 1 };
      for (const m of this.cams) {
        if (t <= m.at) break;
        const q = progress(t, m.at, m.dur, ease.inOut);
        c = { x: lerp(c.x, m.x, q), y: lerp(c.y, m.y, q), zoom: Math.exp(lerp(Math.log(c.zoom), Math.log(m.zoom), q)) };
      }
      return c;
    }
  }

  // ---------- 画板 ----------
  class Board {
    constructor(o = {}) {
      this.T = o.T;
      this.W = o.width || 1920;
      this.H = o.height || 1080;
      let P = o.palette || 'lively';
      if (typeof P === 'string') { if (!PALETTES[P]) throw new Error(`没有这套配色："${P}"，可用：${Object.keys(PALETTES).join('、')}`); P = PALETTES[P]; }
      this.P = { ...PALETTES.lively, ...P, ...(o.grain !== undefined ? { grain: o.grain } : {}), ...(o.misreg !== undefined ? { misreg: o.misreg } : {}), ...(o.boil !== undefined ? { boil: o.boil } : {}) };
      this.inkNames = Object.keys(this.P.inks);
      this.items = [];
      this.pages = [];
      this.cursor = 0.3;
      this.gap = o.gap ?? 0.15;
      this.drift = o.drift ?? 0.03;
      this._seed = EV.hashStr(o.seed || 'riso');
      this.stage = o.stage || document.getElementById('stage');
      this.stage.style.background = this.P.paper;
      document.body.style.background = this.P.paper;
      const svg = svgEl('svg', { width: this.W, height: this.H, viewBox: `0 0 ${this.W} ${this.H}`, style: 'display:block' }, this.stage);
      this.svg = svg;
      this.defs = svgEl('defs', {}, svg);
      // 测量文字宽度用的隐藏层
      this.msvg = svgEl('svg', { width: 10, height: 10, style: 'position:absolute;left:-9999px;top:0;visibility:hidden' }, this.stage);
      this.mtext = svgEl('text', {}, this.msvg);
      this.mg = svgEl('g', {}, this.msvg);
      this._mcache = new Map();
      svgEl('rect', { width: this.W, height: this.H, fill: this.P.paper }, svg);
      this.buildLayers();
      this.hudPage = new Page(this, -1, 0, { hud: true });
      if (o.captions !== false && this.T && this.T.lines.length) this.setupCaptions(o.captionMax || 20);
      if (o.chapters !== false && this.T && this.T.chapters.length >= 2) this.setupChapters();
      this.setupRoller();
    }
    nextSeed() { return (this._seed = (Math.imul(this._seed, 1664525) + 1013904223) >>> 0); }
    add(item) { this.items.push(item); this.cursor = item.end + this.gap; return item; }
    at(t) { this.cursor = t; return this; }
    wait(s) { this.cursor += s; return this; }
    // 角色名（base / main / accent）或油墨名 → 油墨名
    ink(k) {
      if (this.P.roles[k]) return this.P.roles[k];
      if (this.P.inks[k]) return k;
      throw new Error(`没有这种油墨："${k}"。可用：base / main / accent，或 ${this.inkNames.join(' / ')}`);
    }
    col(k) { return this.P.inks[this.ink(k)]; }
    measure(text, css) {
      const key = css + '|' + text;
      if (this._mcache.has(key)) return this._mcache.get(key);
      this.mtext.setAttribute('style', css + ';white-space:pre');
      this.mtext.textContent = text;
      const w = this.mtext.getComputedTextLength();
      this._mcache.set(key, w);
      return w;
    }
    bboxOf(d, sw = 0, transform) {
      this.mg.innerHTML = '';
      const inner = svgEl('g', { transform }, this.mg);
      svgEl('path', { d }, inner);
      const b = this.mg.getBBox();
      return { x: b.x - sw / 2, y: b.y - sw / 2, w: b.width + sw, h: b.height + sw };
    }

    // 每种油墨一个图层：正片叠底 + 套色错位；tex 子层加油墨颗粒，clean 子层不加（正文小字）
    buildLayers() {
      const { W, H, P } = this, g = P.grain;
      this.layers = {};
      this.turbs = [];
      const offs = { [P.roles.base]: [0, 0], [P.roles.main]: [2.5, -1.5], [P.roles.accent]: [-3, 2.5] };
      this.inkNames.forEach((k, i) => {
        const id = 'tex-' + k, seed = 2 + i * 11;
        const f = svgEl('filter', { id, x: 0, y: 0, width: W, height: H, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' }, this.defs);
        const t1 = svgEl('feTurbulence', { type: 'fractalNoise', baseFrequency: 1.1, numOctaves: 2, seed, result: 'n' }, f);
        svgEl('feColorMatrix', { in: 'n', type: 'matrix', values: `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -12 0 0 0 ${f1(12 * (0.658 + (1 - g) * 0.15) * 100) / 100}`, result: 'speck' }, f);
        const t2 = svgEl('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.012, numOctaves: 3, seed: seed + 5, result: 'low' }, f);
        svgEl('feColorMatrix', { in: 'low', type: 'matrix', values: `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${0.7 * g} 0 0 0 ${1 - 0.32 * g}`, result: 'dens' }, f);
        svgEl('feComposite', { in: 'SourceGraphic', in2: 'speck', operator: 'in', result: 'a' }, f);
        svgEl('feComposite', { in: 'a', in2: 'dens', operator: 'in', result: 'b' }, f);
        const t3 = svgEl('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.06, numOctaves: 2, seed: seed + 9, result: 'warp' }, f);
        svgEl('feDisplacementMap', { in: 'b', in2: 'warp', scale: f1(2.6 * g), xChannelSelector: 'R', yChannelSelector: 'G' }, f);
        this.turbs.push({ els: [t1, t3], seed });
        const off = (offs[k] || [i * 1.5 - 1.5, 1 - i]).map((v) => v * P.misreg);
        const layer = svgEl('g', { style: 'mix-blend-mode:multiply', fill: P.inks[k], transform: `translate(${off})` }, this.svg);
        this.layers[k] = { g: layer, off, tex: svgEl('g', { filter: `url(#${id})` }, layer), clean: svgEl('g', {}, layer) };
      });
      // 纸张：细颗粒 + 纤维
      const pf = svgEl('filter', { id: 'paper', x: 0, y: 0, width: '100%', height: '100%' }, this.defs);
      svgEl('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.75, numOctaves: 3, seed: 4 }, pf);
      svgEl('feColorMatrix', { type: 'matrix', values: '0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 -1.4 0.95' }, pf);
      const ff = svgEl('filter', { id: 'fiber', x: 0, y: 0, width: '100%', height: '100%' }, this.defs);
      svgEl('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.004 0.09', numOctaves: 2, seed: 8 }, ff);
      svgEl('feColorMatrix', { type: 'matrix', values: '0 0 0 0 0.4  0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 -2.5 1.5' }, ff);
      svgEl('rect', { width: W, height: H, filter: 'url(#paper)', opacity: f1(0.07 * Math.max(0.5, g) * 100) / 100, style: 'mix-blend-mode:multiply;pointer-events:none' }, this.svg);
      svgEl('rect', { width: W, height: H, filter: 'url(#fiber)', opacity: 0.035, style: 'mix-blend-mode:multiply;pointer-events:none' }, this.svg);
      // 网点图案（滚筒、阴影用）
      const pat = svgEl('pattern', { id: 'dots', width: 12, height: 12, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(15)' }, this.defs);
      svgEl('circle', { cx: 6, cy: 6, r: 3.6 }, pat);
    }

    // ---------- 页面 ----------
    // 翻到新的一页：at 秒开始，印刷滚筒从上往下扫过（roll 秒），旧页换成新页。第一页（或封面后的第一页）会自动带滚筒转场
    // transition：roll 滚筒 / push 推页 / flood 油墨漫开（from: 元素或 [x, y]，ink）/ zoom 推近 / cut 硬切
    // 默认：封面之后用 roll，其余用 push。drift：这一页的慢推近幅度（0 关闭）
    page(at, o = {}) {
      if (at && typeof at === 'object' && !Array.isArray(at) && !('end' in at)) { o = at; at = undefined; }
      if (at && typeof at === 'object') at = at.end;
      at = at ?? this.cursor;
      const prev = this.pages[this.pages.length - 1];
      const DUR = { roll: 0.6, push: 0.7, flood: 0.9, zoom: 0.75, cut: 0 };
      const type = prev ? (o.transition ?? (prev.cover ? 'roll' : 'push')) : 'none';
      if (prev && !(type in DUR)) throw new Error(`没有这种换场："${type}"，可用：${Object.keys(DUR).join('、')}`);
      const roll = prev ? (o.dur ?? DUR[type]) : 0;
      const p = new Page(this, this.pages.length, prev ? at : Math.min(at, 0), { ...o, roll, type, drift: o.drift ?? this.drift });
      if (type === 'flood') {
        const f = o.from ? (Array.isArray(o.from) ? o.from : (() => { const b = o.from.boxAt ? o.from.boxAt(at) : boxOf(o.from); return [b.x + b.w / 2, b.y + b.h / 2]; })()) : [this.W / 2, this.H / 2];
        p.flood = { from: f, ink: this.ink(o.ink ?? 'accent') };
      }
      if (prev) prev.hideAt = at + roll;
      this.pages.push(p);
      this.cur = p;
      this.cursor = Math.max(this.cursor, p.end + 0.1);
      return p;
    }
    get content() { return this.pages.filter((p) => !p.cover); }
    // 页内推镜头：把镜头推到某个元素 / 区域（自动避开章节条和字幕），target 为 null 时拉回整页
    focus(target, o = {}) {
      let at = o.at ?? this.cursor;
      if (at && typeof at === 'object') at = at.end;
      const dur = o.dur ?? 0.9, W = this.W, H = this.H;
      const p = o.page || (target && target.page && !target.page.hud ? target.page : this.cur);
      if (!target) p.cams.push({ at, dur, x: W / 2, y: H / 2, zoom: 1 });
      else {
        const b = Array.isArray(target) ? unionBox(target.map(boxOf)) : boxOf(target);
        const top = this.chapterZone || 0, bottom = this.caps ? 150 : 0, availH = H - top - bottom, pad = o.pad ?? 80;
        const zoom = o.zoom ?? Math.min(1.5, W / (b.w + pad * 2), availH / (b.h + pad * 2));
        p.cams.push({ at, dur, x: b.x + b.w / 2, y: b.y + b.h / 2 - (top + availH / 2 - H / 2) / zoom, zoom });
      }
      p.cams.sort((a, c) => a.at - c.at);
      this.cursor = Math.max(this.cursor, at + dur);
      return this;
    }

    // ---------- 绘图 API ----------
    sketch(parts, o = {}) { return new Shape(this, parts, o); }
    path(d, o = {}) { return new Shape(this, [{ d }], o); }
    circle(x, y, r, o = {}) { return new Shape(this, [{ circle: [x, y, r] }], { kind: '圆', ...o }); }
    ellipse(x, y, rx, ry, o = {}) { return new Shape(this, [{ ellipse: [x, y, rx, ry] }], { kind: '椭圆', ...o }); }
    rect(x, y, w, h, o = {}) { return new Shape(this, [{ rect: [x, y, w, h, o.radius || 0] }], { kind: '色块', ...o }); }
    poly(pts, o = {}) { return new Shape(this, [{ poly: pts }], { kind: '多边形', ...o }); }
    // 线：默认主色，从起点刷出来；dash 如 '4 10'
    line(x1, y1, x2, y2, o = {}) {
      return new Shape(this, [{ d: `M${x1},${y1} L${x2},${y2}` }], { kind: '线', stroke: o.width ?? 5, enter: 'wipe', from: [x1, y1, (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI], dur: 0.4, ...o, fill: 'none' });
    }
    // 横向分隔线（印刷品的"线"）
    rule(x, y, w, o = {}) { return this.rect(x, y, w, o.weight ?? 3, { kind: '分隔线', enter: 'wipe', dur: 0.4, annot: true, ...o }); }
    // 粗箭头：实心的油墨块，从尾部刷到头部
    arrow(x1, y1, x2, y2, o = {}) {
      const w = o.width ?? 20, hw = o.head ?? w * 2.4, hl = o.headLen ?? w * 2.2;
      const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
      const P = (s, n) => [f1(x1 + ux * s + nx * n), f1(y1 + uy * s + ny * n)];
      const pts = [P(0, -w / 2), P(L - hl, -w / 2), P(L - hl, -hw / 2), P(L, 0), P(L - hl, hw / 2), P(L - hl, w / 2), P(0, w / 2)];
      return new Shape(this, [{ poly: pts }], { kind: '箭头', ink: 'accent', enter: 'wipe', from: [x1, y1, (Math.atan2(uy, ux) * 180) / Math.PI], dur: 0.45, annot: true, ...o });
    }
    text(str, o = {}) { return new Text(this, str, o); }
    title(str, o = {}) { return new Text(this, str, { style: 'title', ...o }); }
    head(str, o = {}) { return new Text(this, str, { style: 'head', ...o }); }
    body(str, o = {}) { return new Text(this, str, { style: 'body', ...o }); }
    label(str, o = {}) { return new Text(this, str, { style: 'label', ...o }); }
    // 名牌 / 标签：底色块 + 文字，像盖章一样印上去
    tag(str, x, y, o = {}) { return new Text(this, str, { style: 'label', x, y, bg: o.bg ?? 'base', enter: 'stamp', kind: '标签', ...o }); }
    number(x, y, o = {}) { return new Num(this, x, y, o); }
    // 荧光底：在目标下面印一条底色（默认 base），从左往右刷出来。fromY / toY：色条从文字高度的几成画到几成（默认整行）
    highlight(target, o = {}) {
      const { pad = 10, fromY = 0.08, toY = 1.02, ...rest } = o;
      const b = target.textBox || boxOf(target);
      return this.rect(b.x - pad, b.y + b.h * fromY, b.w + pad * 2, b.h * (toY - fromY), { kind: '荧光底', ink: 'base', enter: 'wipe', dur: 0.4, annot: true, at: target, ...rest });
    }
    underline(target, o = {}) {
      const { weight = 10, gap = 8, ...rest } = o;
      const b = target.textBox || boxOf(target);
      return this.rect(b.x, b.y + b.h + gap, b.w, weight, { kind: '下划线', ink: 'accent', enter: 'wipe', dur: 0.35, annot: true, at: target, ...rest });
    }
    // 引语：大号引号 + 粗宋
    quote(str, o = {}) {
      const size = o.size ?? 56, x = o.x ?? 110, y = o.y ?? 700;
      const mark = this.text('“', { style: 'title', size: size * 2.6, x: x - size * 0.2, y: y - size * 1.0, ink: 'accent', at: o.at, dur: 0.35, overlap: true, kind: '引号' });
      const txt = this.text(str, { style: 'quote', size, x: x + size * 1.35, y, w: o.w, at: mark, delay: -0.1, ...o.textOpts });
      return groupOf([mark, txt], '引语');
    }
    // 柱状图：data = [[标签, 数值], ...]；x, y 为基线左端，w 宽，h 为 max 对应的高度；
    // hot：要突出的柱子（下标数组或函数），用 accent 实色；其余用 base 网点
    bars(data, o = {}) {
      const x0 = o.x ?? 1000, base = o.y ?? 860, W = o.w ?? 800, H = o.h ?? 400;
      const max = o.max ?? Math.max(...data.map((d) => d[1])) * 1.1;
      const n = data.length, bw = o.barW ?? Math.min(110, (W / n) * 0.62), gap = (W - n * bw) / n;
      const hot = typeof o.hot === 'function' ? o.hot : (i) => (o.hot || []).includes(i);
      let at = o.at ?? this.cursor;
      if (at && typeof at === 'object') at = at.end;
      const items = [];
      const axis = this.rule(x0, base, W, { ink: 'main', at, dur: 0.35 });
      items.push(axis);
      for (const g of o.grid || []) {
        items.push(this.line(x0, base - (g / max) * H, x0 + W, base - (g / max) * H, { width: 1.6, dash: '3 8', clean: true, opacity: 0.6, at, dur: 0.3, overlap: true, kind: '网格线' }));
        items.push(this.text(String(g), { style: 'label', font: 'num', size: 28, x: x0 - 14, y: base - (g / max) * H, valign: 'middle', align: 'right', at, dur: 0.3, enter: 'fade' }));
      }
      data.forEach(([lab, v], i) => {
        const x = x0 + gap / 2 + i * (bw + gap), h = (v / max) * H, t = at + 0.25 + i * (o.stagger ?? 0.12), isHot = hot(i);
        const parts = isHot ? [{ rect: [x, base - h, bw, h], ink: 'accent' }, { rect: [x, base - h, bw, h], ink: 'main', fill: 'halftone', density: (xx, yy) => ((yy - (base - h)) / h) * 0.3, cell: 9, angle: 45 }]
          : [{ rect: [x, base - h, bw, h], ink: 'base', fill: 'halftone', density: 0.7, cell: 9, angle: 45 }, { rect: [x, base - h, bw, h], ink: 'base', stroke: 3, fill: 'none' }];
        items.push(this.sketch(parts, { kind: '柱子', enter: 'rise', baseline: base, at: t, dur: 0.7, overlap: true }));
        items.push(this.number(x + bw / 2, base - h - (o.valueSize ?? 40) - 12, { to: v, decimals: o.decimals ?? 0, suffix: o.unit ?? '', size: o.valueSize ?? 40, align: 'center', ink: isHot ? 'accent' : 'main', at: t, dur: 0.7, enter: 'fade' }));
        items.push(this.text(lab, { style: 'label', size: o.labelSize ?? 28, x: x + bw / 2, y: base + 14, align: 'center', at: t, dur: 0.3, enter: 'fade' }));
      });
      return groupOf(items, '柱状图');
    }

    // ---------- 封面：第一帧就是一张完整的"杂志封面"，停留 hold 秒后被滚筒翻到正文第一页 ----------
    // o: title（支持 {accent:关键词}，可用 \n 手动换行）、subtitle、kicker（左上角栏目名）、issue（右上角期号）、motif（false 关掉装饰网点圆）
    cover(o = {}) {
      const hold = o.hold ?? 1.3, W = this.W, H = this.H;
      const pg = this.page(0, { cover: true, title: '封面' });
      const items = [];
      const now = { at: 0, dur: 0 };
      if (o.motif !== false) items.push(this.sketch([{ circle: [W - 330, H - 250, 380], ink: 'base', fill: 'halftone', light: [W - 520, H - 520], density: [0.95, 0.35], cell: 13 }, { circle: [W - 330, H - 250, 260], ink: 'base' }], { ...now, kind: '装饰', overlap: true, bleed: true }));
      if (o.kicker) { items.push(this.rect(112, 100, 46, 9, { ink: 'accent', ...now })); items.push(this.label(o.kicker, { x: 172, y: 84, size: 30, ink: 'accent', spacing: 4, ...now })); }
      if (o.issue) items.push(this.label(o.issue, { x: W - 110, y: 84, size: 30, align: 'right', font: 'num', spacing: 3, ...now }));
      items.push(this.rect(110, 150, W - 220, 3, { ink: 'main', ...now, annot: true }));
      let title = null;
      for (const size of [190, 170, 150, 132, 116]) {
        title = this.title(o.title || '', { x: 106, y: o.titleY ?? 210, size, w: W - 260, ...now });
        if (title.nLines <= (o.titleLines ?? 2) || size === 116) break;
        title.parts.forEach((p) => p.g.remove()); this.items.pop();
      }
      items.push(title);
      let bottom = title.box.y + title.box.h;
      if (o.subtitle) { const s = this.body(o.subtitle, { x: 112, y: bottom + 24, size: 44, w: 1100, ...now }); items.push(s); bottom = s.box.y + s.box.h; }
      this.coverHold = hold;
      this.coverEnd = hold + 0.6;
      this.cursor = hold;
      const area = { x: 112, y: bottom + 40, w: W - 224, h: H - 60 - (bottom + 40) };
      return { hold, end: this.coverEnd, area, items, page: pg };
    }

    // ---------- 结尾：所有页面缩小排成一版"目录"，按顺序编号 ----------
    overview(o = {}) {
      const at = o.at ?? this.cursor, dur = o.dur ?? 1.4;
      const pages = this.content;
      if (!pages.length) return this;
      const top = (this.chapterZone || 60) + 30, bottom = this.H - (o.bottom ?? 90), left = 110, right = this.W - 110;
      const n = pages.length, labH = 56, gx = 44, gy = 30;
      let best = null;
      for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        const s = Math.min((right - left - (cols - 1) * gx) / cols / this.W, (bottom - top - (rows - 1) * gy - rows * labH) / rows / this.H);
        if (!best || s > best.s) best = { cols, rows, s };
      }
      const { cols, rows, s } = best, cw = this.W * s, ch = this.H * s;
      const gridW = cols * cw + (cols - 1) * gx, gridH = rows * (ch + labH) + (rows - 1) * gy;
      const ox = (this.W - gridW) / 2, oy = top + (bottom - top - gridH) / 2;
      const chs = this.T ? this.T.chapters : [];
      this.ov = { at, dur, cells: [], s };
      const t0 = at + dur;
      pages.forEach((p, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        // 最后一行不满时居中
        const inRow = r === rows - 1 ? n - r * cols : cols;
        const x = ox + (cols - inRow) * (cw + gx) / 2 + c * (cw + gx), y = oy + r * (ch + labH + gy);
        const last = i === n - 1;
        const show = last ? at : t0 - 0.2 + i * (o.stagger ?? 0.14);
        this.ov.cells[p.idx] = { x, y, show, last };
        const ch2 = chs.find((c2) => p.start + p.roll + 0.3 >= c2.start && p.start + p.roll + 0.3 < c2.end);
        const title = p.title || (ch2 ? ch2.title : '');
        // 卡片：网点投影（只画卡片外面的 L 形）+ 主色描边 + 序号标签
        const sh = 12;
        this.path(`M${x + sh},${y + ch} H${x + cw} V${y + sh} H${x + cw + sh} V${y + ch + sh} H${x + sh} Z`, { hud: true, ink: 'base', fill: 'halftone', density: 0.8, cell: 7, at: last ? t0 : show, dur: 0.3, overlap: true, kind: '卡片' });
        this.rect(x, y, cw, ch, { hud: true, stroke: 3, fill: 'none', ink: 'main', at: last ? t0 : show, dur: 0.3, overlap: true, kind: '卡片' });
        const num = String(i + 1).padStart(2, '0');
        this.tag(num + (title ? '  ' + title : ''), x, y + ch + 18, { hud: true, bg: 'accent', ink: 'main', size: 28, pad: 9, at: (last ? t0 : show) + 0.15, dur: 0.3, overlap: true });
      });
      this.endHold = t0 + n * (o.stagger ?? 0.14) + (o.hold ?? 3);
      return this;
    }

    // 整期的"目录"大图（导出 board.png 用）：所有页面排成网格的最终样子，2 倍清晰度
    snapshot() {
      const auto = !this.ov;
      if (auto) this.overview({ at: 1e5 });
      this.render(auto ? 1e5 + 30 : this.duration);
      const k = 2;
      this.svg.setAttribute('width', this.W * k);
      this.svg.setAttribute('height', this.H * k);
      this.stage.style.width = this.W * k + 'px';
      this.stage.style.height = this.H * k + 'px';
      this.stage.style.transform = '';
      return { w: this.W * k, h: this.H * k, label: '目录' };
    }

    // ---------- 字幕：底色块 + 主色文字 ----------
    setupCaptions(max) {
      this.caps = [];
      for (const l of this.T.lines) {
        if (!l.text || l.silence) continue;
        const text = l.text, words = l.words || [];
        const CJK = /[⺀-鿿豈-﫿＀-￯]/, LAT = /[A-Za-z0-9'’\-%]/;
        const wOf = (i, j) => { let w = 0; for (let k = i; k < j; k++) { const c = text[k]; w += CJK.test(c) ? 1 : c === ' ' ? 0.3 : 0.55; } return w; };
        const wpos = [], allowed = new Array(text.length + 1).fill(false);
        let from = 0;
        for (const w of words) {
          const i = text.indexOf(w.text, from);
          if (i < 0) { wpos.push(null); continue; }
          wpos.push(i); allowed[i] = allowed[i + w.text.length] = true; from = i + w.text.length;
        }
        // 英文标点（. , : ; ! ?）只有后面是空白或在句尾时才算断句；夹在字母数字中间的（SKILL.md、3.5、1,000、3:30、a/b）是词的一部分
        const AN = /[A-Za-z0-9]/;
        const inWord = (k) => LAT.test(text[k] || '') || (/[.,:;_\/]/.test(text[k] || '') && AN.test(text[k - 1] || '') && AN.test(text[k + 1] || ''));
        const isBreak = (k) => /[，。！？；：]/.test(text[k]) || (/[,.!?;:]/.test(text[k]) && !inWord(k) && (k + 1 >= text.length || /[\s，。！？；：”’)）]/.test(text[k + 1])));
        for (let i = 1; i < text.length; i++) {
          if (/[\s、]/.test(text[i - 1]) || isBreak(i - 1)) allowed[i] = true;
          if (!words.length && CJK.test(text[i - 1]) && CJK.test(text[i])) allowed[i] = true;
          if (inWord(i - 1) && inWord(i)) allowed[i] = false;
        }
        const ranges = [];
        for (let i = 0, st = 0; i < text.length; i++) if (isBreak(i) && !isBreak(i + 1)) { ranges.push([st, i + 1]); st = i + 1; } else if (i === text.length - 1) ranges.push([st, text.length]);
        if (!ranges.length) ranges.push([0, text.length]);
        const ends = (r) => { const k = text.slice(0, r[1]).replace(/\s+$/, '').length - 1; return /[。！？]/.test(text[k]) || (/[.!?]/.test(text[k]) && isBreak(k)); };
        const merged = [];
        for (const r of ranges) { const last = merged[merged.length - 1]; if (last && wOf(last[0], r[1]) <= max && !ends(last)) last[1] = r[1]; else merged.push([...r]); }
        for (let i = 0; i < merged.length; i++) {
          const r = merged[i];
          if (merged.length < 2 || wOf(r[0], r[1]) >= max * 0.3) continue;
          const prev = merged[i - 1], next = merged[i + 1];
          if (prev && !ends(prev)) { prev[1] = r[1]; merged.splice(i--, 1); } else if (next && !ends(r)) { next[0] = r[0]; merged.splice(i--, 1); }
        }
        const split = merged.flatMap(([s0, e0]) => {
          const n = Math.ceil(wOf(s0, e0) / (max + 3));
          if (n <= 1) return [[s0, e0]];
          const target = wOf(s0, e0) / n, out = [];
          let st = s0;
          for (let k = 1; k < n; k++) {
            let bst = -1, bd = Infinity;
            for (let i = st + 1; i < e0; i++) { if (!allowed[i]) continue; const d = Math.abs(wOf(st, i) - target); if (d < bd) { bd = d; bst = i; } }
            if (bst < 0) break;
            out.push([st, bst]); st = bst;
          }
          out.push([st, e0]);
          return out;
        });
        const starts = split.map(([s0]) => { const k = wpos.findIndex((p) => p !== null && p >= s0); return k >= 0 ? words[k].start : lerp(l.start, l.end, s0 / Math.max(1, text.length)); });
        split.forEach(([s0, e0], i) => {
          const cap = text.slice(s0, e0).trim().replace(/[，。、；：,;:]+$/, '').replace(/[，、]/g, ' ');
          this.caps.push({ text: cap, start: i === 0 ? l.start : starts[i], end: i < split.length - 1 ? starts[i + 1] : l.end + 0.25 });
        });
      }
      const k = this.ink('base'), mk = this.ink('main');
      this.capCss = `font-family:${FONTS.sans};font-weight:700;font-size:42px`;
      this.capRect = svgEl('rect', { y: this.H - 116, height: 72, style: 'display:none' }, this.hudPage.g[k].tex);
      this.capText = svgEl('text', { x: this.W / 2, y: this.H - 67, 'text-anchor': 'middle', style: this.capCss + ';display:none' }, this.hudPage.g[mk].clean);
      this.capZone = 140;
    }
    renderCaptions(t) {
      const c = this.caps.find((x) => t >= x.start && t < x.end);
      const text = c ? c.text : '';
      if (text === this._cap) return;
      this._cap = text;
      if (!text) { this.capRect.style.display = 'none'; this.capText.style.display = 'none'; return; }
      const w = this.measure(text, this.capCss) + 64;
      this.capRect.setAttribute('x', f1(this.W / 2 - w / 2));
      this.capRect.setAttribute('width', f1(w));
      this.capRect.style.display = '';
      this.capText.textContent = text;
      this.capText.style.display = '';
    }

    // ---------- 章节条：编号 + 标题，当前章用 accent 色块，下面一条进度线 ----------
    setupChapters() {
      const chs = this.T.chapters, mk = this.ink('main'), ak = this.ink('accent');
      const y = 70, x0 = 84;
      let size = 28, gapX = 56;
      const css = (s, w) => `font-family:${FONTS.sans};font-weight:${w};font-size:${s}px`;
      const numCss = (s) => `font-family:${FONTS.num};font-weight:600;font-size:${s * 1.2}px`;
      let widths;
      for (;;) {
        widths = chs.map((c, i) => this.measure(String(i + 1).padStart(2, '0'), numCss(size)) + 12 + this.measure(c.title, css(size, 900)));
        const total = widths.reduce((a, w) => a + w, 0) + gapX * (chs.length - 1);
        if (total <= this.W - 2 * x0 - 40 || size <= 18) break;
        size -= 2; gapX = Math.max(30, gapX - 4);
      }
      this.chBlock = svgEl('rect', { y: y - size * 1.25, height: size * 1.75 }, this.hudPage.g[ak].tex);
      let x = x0;
      this.chs = chs.map((c, i) => {
        const g = svgEl('g', {}, this.hudPage.g[mk].clean);
        const num = svgEl('text', { x, y, style: numCss(size) }, g);
        num.textContent = String(i + 1).padStart(2, '0');
        const nw = this.measure(num.textContent, numCss(size));
        const lab = svgEl('text', { x: x + nw + 12, y, style: css(size, 900) }, g);
        lab.textContent = c.title;
        const item = { ...c, x, w: widths[i], g };
        x += widths[i] + gapX;
        return item;
      });
      svgEl('rect', { x: 70, y: y + 30, width: this.W - 140, height: 3 }, this.hudPage.g[mk].tex);
      this.chProg = svgEl('rect', { x: 70, y: y + 25, width: 0, height: 8 }, this.hudPage.g[ak].tex);
      this.chapterZone = y + 44;
    }
    renderChapters(t) {
      const chs = this.chs, enter = clamp((t - (this.coverEnd || 0)) / 0.5);
      const vis = enter > 0;
      for (const k of [this.chBlock, this.chProg, ...chs.map((c) => c.g)]) k.style.display = vis ? '' : 'none';
      if (!vis) return;
      const last = chs[chs.length - 1];
      let cur = chs.findIndex((c) => t >= c.start && t < c.end);
      if (cur < 0) cur = t >= last.end ? chs.length - 1 : 0;
      // 色块滑到当前章节
      const c = chs[cur], prev = chs[Math.max(0, cur - 1)];
      const k = cur > 0 ? ease.inOut(clamp((t - c.start) / 0.45)) : 1;
      const bx = lerp(prev.x, c.x, k) - 14, bw = lerp(prev.w, c.w, k) + 28;
      this.chBlock.setAttribute('x', f1(bx)); this.chBlock.setAttribute('width', f1(bw));
      chs.forEach((ch, i) => { const o = i === cur ? '' : i < cur ? '0.75' : '0.45'; if (ch._o !== o) { ch._o = o; ch.g.style.opacity = o; } });
      const p = clamp((t - chs[0].start) / (last.end - chs[0].start));
      this.chProg.setAttribute('width', f1((this.W - 140) * p));
    }

    // ---------- 印刷滚筒（翻页转场）----------
    setupRoller() {
      const bk = this.ink('base'), mk = this.ink('main');
      this.roller = [svgEl('rect', { x: 0, width: this.W, height: 34, fill: 'url(#dots)', style: 'display:none' }, this.hudPage.g[bk].tex), svgEl('rect', { x: 0, width: this.W, height: 5, style: 'display:none' }, this.hudPage.g[mk].tex)];
    }
    rollerY(p, t) { return lerp(-40, this.H + 40, ease.inOut(clamp((t - p.start) / p.roll))); }

    get duration() {
      const last = Math.max(0, ...this.items.filter((i) => i.start < 5e4).map((i) => i.done));
      return Math.max(this.T ? this.T.duration : 0, last + 2, this.endHold || 0);
    }

    render(t) {
      // 质感微跳：油墨颗粒每隔几帧变一次
      if (this.P.boil) {
        const step = Math.floor(t * this.P.boil);
        if (step !== this._boil) {
          this._boil = step;
          this.turbs.forEach((tb, i) => tb.els.forEach((e, j) => e.setAttribute('seed', tb.seed + j * 5 + (step % 7) * 13)));
          this.inkNames.forEach((k, i) => {
            const r = rng(step * 31 + i)(), r2 = rng(step * 17 + i * 7)();
            const [ox, oy] = this.layers[k].off;
            this.layers[k].g.setAttribute('transform', `translate(${f1(ox + (r - 0.5) * 1.2 * this.P.misreg)},${f1(oy + (r2 - 0.5) * 1.2 * this.P.misreg)})`);
          });
        }
      }
      // 页面：换场（滚筒 / 推页 / 油墨漫开 / 推近）+ 页内镜头 + 慢推近；导出目录图时缩小排成网格
      const W = this.W, H = this.H, n = this.inkNames.length;
      const dur = this._dur ?? (this._dur = this.duration);
      let rolling = null, flood = null;
      const ov = this.ov && t >= this.ov.at ? this.ov : null;
      for (const p of this.pages) {
        const nxt = this.pages[p.idx + 1];
        let vis = t >= p.start && t < p.hideAt, clipY = -20, clipH = H + 40, pre = '', op = 1;
        const ink = new Array(n).fill(null).map(() => [0, 0]);
        // 页内镜头 + 慢推近（从这一页印好开始，到下一页开始换场，缓慢放大 drift）
        const c = p.camAt(t), life = Math.max(1, (nxt ? nxt.start : dur) - p.end);
        const z = c.zoom * (1 + p.drift * ease.inOut(clamp((t - p.end) / life)));
        let cam = Math.abs(z - 1) < 1e-4 && Math.abs(c.x - W / 2) < 0.05 && Math.abs(c.y - H / 2) < 0.05 ? '' : `translate(${W / 2},${H / 2}) scale(${z.toFixed(5)}) translate(${f1(-c.x)},${f1(-c.y)})`;
        const localY = (sy) => c.y + (sy - H / 2) / z;
        const spread = (amt, both) => ink.forEach((v, i) => { const d = (i - (n - 1) / 2) * amt; v[0] += d; if (both) v[1] -= d * 0.6; });
        const scaleAbout = (sc) => `translate(${W / 2},${H / 2}) scale(${sc.toFixed(4)}) translate(${-W / 2},${-H / 2})`;
        // 进场
        if (p.roll && t >= p.start && t < p.end) {
          const k = clamp((t - p.start) / p.roll), e = ease.inOut(k);
          if (p.type === 'roll') { const ry = this.rollerY(p, t); rolling = ry; clipH = localY(ry) + 20; }
          else if (p.type === 'push') { pre = `translate(${f1(W * (1 - e))},0)`; spread(Math.sin(Math.PI * k) * 26); }
          else if (p.type === 'flood') { vis = vis && k >= 0.5; flood = { p, k }; }
          else if (p.type === 'zoom') { const k2 = clamp((k - 0.4) / 0.6); vis = vis && k2 > 0; pre = scaleAbout(0.9 + 0.1 * ease.out(k2)); op = k2; spread((1 - k2) * 36, true); }
        }
        // 出场（由下一页的换场方式决定）
        if (nxt && nxt.roll && t >= nxt.start && t < nxt.end) {
          const k = clamp((t - nxt.start) / nxt.roll), e = ease.inOut(k);
          if (nxt.type === 'roll') { const ry = this.rollerY(nxt, t); clipY = localY(ry); clipH = H + 40 - clipY; }
          else if (nxt.type === 'push') { pre = `translate(${f1(-W * e)},0)`; spread(Math.sin(Math.PI * k) * 26); }
          else if (nxt.type === 'flood') vis = vis && k < 0.5;
          else if (nxt.type === 'zoom') { const k1 = clamp(k / 0.6); vis = vis && k1 < 1; pre = scaleAbout(1 + 0.3 * ease.in(k1)); op = Math.min(op, 1 - k1); spread(k1 * 36, true); }
        }
        // 镜头推近时，页面内容不能跑进顶部章节条和底部字幕区
        if (c.zoom > 1.01 && !p.cover) {
          if (this.chapterZone) { const y0 = localY(this.chapterZone); clipH -= Math.max(0, y0 - clipY); clipY = Math.max(clipY, y0); }
          if (this.caps) clipH = Math.min(clipH, localY(H - this.capZone) - clipY);
        }
        const cell = ov && ov.cells[p.idx];
        if (cell) {
          clipY = 0; clipH = H; cam = ''; ink.forEach((v) => { v[0] = 0; v[1] = 0; }); op = 1;
          const k = cell.last ? ease.inOut(clamp((t - ov.at) / ov.dur)) : 1;
          const s2 = lerp(1, ov.s, k);
          pre = `translate(${f1(lerp(0, cell.x, k))},${f1(lerp(0, cell.y, k))}) scale(${s2.toFixed(4)})`;
          vis = t >= cell.show;
          if (!cell.last) op = clamp((t - cell.show) / 0.3);
        } else if (ov) vis = false;
        if (p._vis !== vis) { p._vis = vis; p.groups().forEach((g) => (g.style.display = vis ? '' : 'none')); }
        if (!vis) continue;
        const ck = `${f1(clipY)}|${f1(clipH)}`;
        if (p._clip !== ck) { p._clip = ck; p.clipRect.setAttribute('y', f1(clipY)); p.clipRect.setAttribute('height', f1(Math.max(0, clipH))); }
        const base = `${pre} ${cam}`.trim();
        this.inkNames.forEach((k, i) => {
          const [dx, dy] = ink[i];
          const tf = (dx || dy ? `translate(${f1(dx)},${f1(dy)}) ` : '') + base;
          const g = this.pages[p.idx].g[k];
          if (g._tf !== tf) { g._tf = tf; for (const el of [g.tex, g.clean]) tf ? el.setAttribute('transform', tf) : el.removeAttribute('transform'); }
        });
        const o2 = op >= 0.999 ? '' : String(Math.round(op * 1000) / 1000);
        if (p._op !== o2) { p._op = o2; p.groups().forEach((g) => (g.style.opacity = o2)); }
      }
      // 油墨漫开：一团油墨从 from 点扩散盖满画面，再从中间退开露出新页
      if (!this.floodEls) this.floodEls = {};
      for (const [k, el] of Object.entries(this.floodEls)) if (!flood || flood.p.flood.ink !== k) el.style.display = 'none';
      if (flood) {
        const { from: [fx, fy], ink: fk } = flood.p.flood, k = flood.k;
        const el = this.floodEls[fk] || (this.floodEls[fk] = svgEl('path', { 'fill-rule': 'evenodd' }, this.hudPage.g[fk].tex));
        const R = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - fx, y - fy))) + 30;
        const rOut = k < 0.5 ? R * ease.inOut(k / 0.5) : R, rIn = k < 0.5 ? 0 : R * ease.inOut((k - 0.5) / 0.5);
        el.setAttribute('d', circleD(fx, fy, Math.max(0.1, rOut)) + (rIn > 0.5 ? ' ' + circleD(fx, fy, rIn) : ''));
        el.style.display = '';
      }
      this.roller.forEach((r, i) => {
        r.style.display = rolling === null ? 'none' : '';
        if (rolling !== null) r.setAttribute('y', f1(rolling - (i ? 2.5 : 17)));
      });
      for (const it of this.items) it.update(t);
      if (this.caps) this.renderCaptions(t);
      if (this.chs) this.renderChapters(t);
    }

    // ---------- 自动检查 ----------
    lint() {
      const out = [], W = this.W, H = this.H, dur = this.duration;
      const add = (level, t, it, msg) => out.push({ level, t: Math.round(t * 100) / 100, src: it ? it.src : '', what: it ? it.describe() : '', msg });
      const inter = (a, c) => Math.max(0, Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x)) * Math.max(0, Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y));
      const gone = (it) => Math.min(it.exits.length ? Math.min(...it.exits.map((x) => x.at)) : Infinity, it.page.hideAt);
      const items = this.items.filter((i) => i.start < 5e4);
      for (const it of items) {
        const done = it.done;
        for (const x of it.exits) {
          if (x.at <= it.start) add('error', it.start, it, '还没开始印就已经被擦掉，观众永远看不到');
          else if (x.at < done - 0.05) add('error', x.at, it, `还没印完就开始擦除（只印到 ${Math.round(((x.at - it.start) / (done - it.start)) * 100)}%）`);
          else if (x.at - done < 0.6) add('warn', x.at, it, `印完只停留 ${(x.at - done).toFixed(1)} 秒就被擦掉，观众来不及看`);
        }
        if (it.start >= dur) add('error', it.start, it, '开始时间超出了视频总时长');
        if (it.page.hud) continue;
        // 页面时间
        const pg = it.page, ready = pg.type === 'roll' ? pg.end : pg.type === 'flood' ? pg.start + pg.roll * 0.5 : pg.start;
        if (it.start < ready - 0.05) add('warn', it.start, it, pg.type === 'roll' ? `这一页的滚筒还没扫完（${pg.end.toFixed(2)} 秒）就开始印，会被滚筒盖住` : `这一页还没开始换进来（${ready.toFixed(2)} 秒）就开始印了`);
        const nxt = this.pages[it.page.idx + 1];
        if (nxt && done > nxt.start - 0.05) add('error', it.start, it, `还没印完，这一页就翻走了（下一页 ${nxt.start.toFixed(2)} 秒开始）`);
        else if (nxt && nxt.start - done < 0.8 && !it.exits.length) add('warn', done, it, '印完不到 0.8 秒这一页就翻走了，观众来不及看');
        if (!it.box || it.start >= gone(it)) continue;
        const r = it.boxAt(Math.min(done, dur - 0.01));
        const vis = inter(r, { x: 0, y: 0, w: W, h: H }) / Math.max(1, r.w * r.h);
        if (vis < 0.02) add('error', it.start, it, '完全在画面外');
        else if (vis < 0.97 && !it.o.bleed) add('warn', it.start, it, `有 ${Math.round((1 - vis) * 100)}% 在画面外（有意出血请加 bleed: true）`);
        if (this.chapterZone && !it.o.annot && !it.page.cover && r.y < this.chapterZone && r.x < W - 60 && r.x + r.w > 60 && !it.o.bleed) add('warn', it.start, it, `压到了顶部章节条（屏幕最上面 ${this.chapterZone} 像素）`);
        if (this.caps && !it.o.annot && r.y + r.h > H - this.capZone && r.x < W - 300 && r.x + r.w > 300 && this.caps.some((c) => c.end > it.start && c.start < gone(it))) add('warn', it.start, it, '压到了底部字幕区（屏幕最下面 140 像素）');
        if (it instanceof Text && it.size < 26 && !it.page.hud) add('warn', it.start, it, `字太小（${it.size}px），视频里看不清，正文至少 32`);
      }
      // 文字之间互相压住（色块、网点叠印是这个风格的常态，不检查）
      const texts = items.filter((i) => (i instanceof Text || i instanceof Num) && !i.o.overlap && !i.page.hud);
      for (let a = 0; a < texts.length; a++) for (let c = a + 1; c < texts.length; c++) {
        const A = texts[a], B = texts[c];
        if (A.page !== B.page) continue;
        const t0 = Math.max(A.start, B.start), t1 = Math.min(gone(A), gone(B));
        if (t1 <= t0) continue;
        const ra = A.textBox || A.box, rb = B.textBox || B.box, ov = inter(ra, rb) / Math.max(1, Math.min(ra.w * ra.h, rb.w * rb.h));
        if (ov > 0.08) add('warn', t0, B, `和 ${A.describe()}（${A.src}）重叠了 ${Math.round(ov * 100)}%`);
      }
      // 各元素自己的检查（例如视频片段还没播完就翻页）
      for (const it of items) if (it.lint) it.lint(add);
      // 封面
      const lines = this.T ? this.T.lines.filter((l) => !l.silence && l.text) : [];
      if (!this.pages.length || this.pages[0].start > 0.05) out.push({ level: 'error', t: 0, src: '', what: '页面', msg: 'build 里还没有调用 b.cover() 或 b.page()' });
      else if (!this.coverHold) out.push({ level: 'warn', t: 0, src: '', what: '第一帧', msg: '没有封面。很多平台默认拿第一帧当封面，建议用 b.cover() 做一张' });
      else {
        if (lines.length && lines[0].start < this.coverEnd) out.push({ level: 'warn', t: lines[0].start, src: '', what: '封面', msg: `封面还没翻走，旁白就开始了：把 script.json 的 lead_in 调大 ${(this.coverEnd - lines[0].start + 0.2).toFixed(1)} 秒` });
        if (this.pages.length < 2) out.push({ level: 'error', t: this.coverHold, src: '', what: '封面', msg: '封面之后没有调用 b.page() 翻到正文' });
      }
      return out.sort((a, c) => a.t - c.t);
    }
  }

  window.RISO = { Board, board: (o) => new Board(o), PALETTES, FONTS, TEXT, groupOf, unionBox, _: { svgEl, Item, Shape, Text } };
})();
