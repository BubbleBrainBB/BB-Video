// whiteboard.js：手绘白板风格的绘图工具包（自写，零第三方动画库）
// 所有元素在 build 阶段一次性创建，每帧由 board.render(t) 按时间更新状态。
// 坐标系：世界坐标，单位像素；镜头 zoom=1、中心(960,540) 时世界坐标就等于屏幕坐标。
(function () {
  const { clamp, lerp, ease, rng, progress } = window.EV;
  const NS = 'http://www.w3.org/2000/svg';

  const COLORS = { ink: '#1F2328', blue: '#1E5BC6', red: '#D6342C', green: '#1E8A4C', orange: '#E07B00', purple: '#6B45C2', gray: '#8A8F98', white: '#FFFFFF' };
  const HL = { yellow: '#FFE45C', pink: '#FFB8D2', green: '#B8F0A6', blue: '#B9DDFF', orange: '#FFD29E' };
  const NOTE = { yellow: '#FFF1A8', pink: '#FFD9E6', green: '#D8F5CB', blue: '#D9ECFF', orange: '#FFE4C4' };
  // 字体：列表里从前往后找，第一个可用的生效。前两个（霞鹜文楷、Excalifont）由 fonts.css 负责
  // "本机 → 网络按需下载"；都拿不到时自动落到后面的备用字体，不影响渲染。
  // 每个视频可以用 WB.board({ fonts: { hand: '...', en: '...' } }) 换成自己喜欢的字体。
  const FONTS = {
    hand: '"LXGW WenKai", "Hannotate SC", "Kaiti SC", "STKaiti", "KaiTi", cursive',
    en: '"Excalifont", "Noteworthy", "Segoe Print", "LXGW WenKai", cursive',
    ui: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
    caption: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
    mono: '"SF Mono", Menlo, Consolas, monospace',
  };
  const col = (c) => COLORS[c] || c || COLORS.ink;
  const NO_LINE_START = /[，。、：；！？）」』》】〉…—,.:;!?)\]}%]/;

  function svgEl(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // ---------- 几何工具 ----------
  const fmt = (n) => Math.round(n * 10) / 10;
  // 2D 仿射矩阵 [a, b, c, d, e, f]：x' = a·x + c·y + e，y' = b·x + d·y + f
  const M_ID = [1, 0, 0, 1, 0, 0];
  const mMul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  const mApply = (M, x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];

  // Catmull-Rom 样条：把点列连成平滑路径
  function smoothD(pts, closed) {
    if (pts.length < 2) return '';
    if (pts.length === 2) return `M${fmt(pts[0][0])},${fmt(pts[0][1])}L${fmt(pts[1][0])},${fmt(pts[1][1])}`;
    const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
    let d = `M${fmt(P[1][0])},${fmt(P[1][1])}`;
    for (let i = 1; i < P.length - 2; i++) {
      const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${fmt(c1[0])},${fmt(c1[1])} ${fmt(c2[0])},${fmt(c2[1])} ${fmt(p2[0])},${fmt(p2[1])}`;
    }
    return d;
  }

  // 平滑噪声：用于手抖
  function noise1(seed) {
    const r = rng(seed);
    const comps = [1, 2, 3].map((i) => ({ f: (0.006 + r() * 0.01) * i, ph: r() * Math.PI * 2, a: 1 / i }));
    return (s) => comps.reduce((v, c) => v + c.a * Math.sin(s * c.f + c.ph), 0) / 1.83;
  }

  // 沿路径法线方向加入手抖 + 整体微弯
  function wobble(pts, amp, seed, bow = 0) {
    if (amp <= 0 && !bow) return pts;
    const n = noise1(seed);
    let s = 0;
    const cum = pts.map((p, i) => (i ? (s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])) : 0));
    const L = s || 1;
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const off = amp * n(cum[i]) + bow * Math.sin((Math.PI * cum[i]) / L);
      return [p[0] + nx * off, p[1] + ny * off];
    });
  }

  let measurer = null;
  // 把任意 SVG path（绝对坐标命令）拆成子路径并采样成点列
  function samplePathD(d) {
    if (!measurer) {
      const s = svgEl('svg', { width: 1, height: 1, style: 'position:absolute;left:-9999px;top:-9999px' }, document.body);
      measurer = svgEl('path', {}, s);
    }
    const subs = d.trim().split(/(?=M)/).filter((x) => x.trim());
    return subs.map((sd) => {
      measurer.setAttribute('d', sd);
      const L = measurer.getTotalLength();
      const n = Math.max(6, Math.ceil(L / 7));
      const pts = [];
      for (let i = 0; i <= n; i++) { const p = measurer.getPointAtLength((L * i) / n); pts.push([p.x, p.y]); }
      return { pts, closed: /z\s*$/i.test(sd.trim()) };
    });
  }

  function linePts(x1, y1, x2, y2) {
    const L = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(2, Math.ceil(L / 12));
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push([lerp(x1, x2, i / n), lerp(y1, y2, i / n)]);
    return pts;
  }

  function quadPts(x1, y1, cx, cy, x2, y2) {
    const L = Math.hypot(cx - x1, cy - y1) + Math.hypot(x2 - cx, y2 - cy);
    const n = Math.max(4, Math.ceil(L / 10));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u;
      pts.push([v * v * x1 + 2 * v * u * cx + u * u * x2, v * v * y1 + 2 * v * u * cy + u * u * y2]);
    }
    return pts;
  }

  const boxOf = (t) => (t && t.box ? t.box : t);
  const unionBox = (boxes) => {
    boxes = boxes.filter(Boolean);
    const x = Math.min(...boxes.map((b) => b.x)), y = Math.min(...boxes.map((b) => b.y));
    const r = Math.max(...boxes.map((b) => b.x + b.w)), btm = Math.max(...boxes.map((b) => b.y + b.h));
    return { x, y, w: r - x, h: btm - y };
  };

  // ---------- 元素基类 ----------
  class Item {
    constructor(board, o, node) {
      this.b = board;
      this.o = o;
      this.node = node;
      let start = o.at;
      if (start && typeof start === 'object') start = start.end;
      if (start === undefined || start === null) start = board.cursor;
      this.start = start + (o.delay || 0);
      // 记录是 index.html 的哪一行创建了这个元素，自动检查报错时用
      // 经过辅助函数创建时，同时给出辅助函数里的行和调用它的行
      const frames = (new Error().stack || '').split('\n').filter((l) => /\.html:\d+/.test(l) && !/\/lib\//.test(l))
        .map((l) => /\/([^\/\s)]+\.html):(\d+)/.exec(l)).filter(Boolean).map((m) => `${m[1]}:${m[2]}`);
      this.src = [...new Set(frames)].slice(0, 2).join(' ← ');
      this.exits = [];
      this.pulses = [];
      this.moves = [];
      this._p = -1;
      this._vis = null;
    }
    get end() { return this.start + this.dur; }
    // 画完（含填色）的时间
    get done() { return this.end + (this.hasFill ? 0.35 : 0); }
    describe() {
      const b = this.box;
      const txt = this.label ? `"${this.label.slice(0, 14)}${this.label.length > 14 ? '…' : ''}"` : '';
      return `${this.kind || '元素'}${txt}` + (b ? `（${Math.round(b.x + b.w / 2)}, ${Math.round(b.y + b.h / 2)}）` : '');
    }
    // 擦除（淡出）：at 秒开始，持续 dur 秒
    erase(at, dur = 0.4) { this.exits.push({ at: at ?? this.b.cursor, dur }); return this; }
    // 强调：放大一下再回来
    pulse(at, amt = 1.08, dur = 0.6) { this.pulses.push({ at, amt, dur }); return this; }
    // 平移：at 秒开始，dur 秒内移动 (dx, dy)。e 为缓动（下落用 EV.ease.in）
    move(at, dx, dy, dur = 0.8, e = ease.inOut) { return this.transform(at, { dx, dy }, dur, e); }
    // 通用变换动画：at 秒开始，dur 秒内完成
    //   dx, dy   平移
    //   rotate   绕 origin 旋转的角度（度，正数顺时针）
    //   scale    绕 origin 缩放：数字，或 [sx, sy]（[-1, 1] = 左右翻转）
    //   origin   [x, y] 世界坐标；默认是元素在这次变换开始时的中心
    // 多次调用按开始时间依次叠加。先旋转/缩放、再平移。
    transform(at, o = {}, dur = 0.8, e = ease.inOut) {
      this.moves.push({ at, dur, e, ...o });
      this.moves.sort((a, b) => a.at - b.at);
      return this;
    }
    // t 时刻元素的变换矩阵 [a, b, c, d, e, f]（和 SVG matrix 相同）
    matrixAt(t) {
      let M = M_ID;
      const b = this.box;
      for (const m of this.moves) {
        const q = progress(t, m.at, m.dur, m.e);
        if (q <= 0) continue;
        const [ox, oy] = m.origin || (b ? mApply(M, b.x + b.w / 2, b.y + b.h / 2) : [0, 0]);
        const [sx, sy] = Array.isArray(m.scale) ? m.scale : [m.scale ?? 1, m.scale ?? 1];
        const r = ((m.rotate || 0) * q * Math.PI) / 180;
        let T = mMul([1, 0, 0, 1, -ox, -oy], M_ID);
        T = mMul([lerp(1, sx, q), 0, 0, lerp(1, sy, q), 0, 0], T);
        T = mMul([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0], T);
        T = mMul([1, 0, 0, 1, ox + (m.dx || 0) * q, oy + (m.dy || 0) * q], T);
        M = mMul(T, M);
      }
      return M;
    }
    // t 时刻（含移动、旋转、缩放后）的外框；.box 永远是原始位置
    boxAt(t) {
      const b = this.box;
      if (!b || !this.moves.length) return b;
      const M = this.matrixAt(t);
      const ps = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].map(([x, y]) => mApply(M, x, y));
      const xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    update(t) {
      let fade = 1;
      for (const x of this.exits) fade = Math.min(fade, 1 - progress(t, x.at, x.dur, ease.inOut));
      const visible = t >= this.start && fade > 0.001;
      // 用 display 而不是 visibility：子元素自己设了 visibility:visible 时，父级的 hidden 会失效
      if (visible !== this._vis) { this.node.style.display = visible ? '' : 'none'; this._vis = visible; }
      if (!visible) { this._p = -1; return; }
      this.node.style.opacity = fade < 1 ? fade : '';
      if (this.o.crop && !this.o.hud && !this._cropped) this.applyCrop();
      let s = 1;
      for (const pl of this.pulses) {
        const q = clamp((t - pl.at) / pl.dur);
        if (q > 0 && q < 1) s *= 1 + (pl.amt - 1) * Math.sin(Math.PI * q);
      }
      let M = this.moves.length ? this.matrixAt(t) : M_ID;
      if (s !== 1 && this.box) {
        const b = this.box, [cx, cy] = mApply(M, b.x + b.w / 2, b.y + b.h / 2);
        M = mMul([s, 0, 0, s, cx * (1 - s), cy * (1 - s)], M);
      }
      const p = progress(t, this.start, this.dur, this.ease || ease.pen);
      if (p !== this._p) { this.draw(p, t); this._p = p; }
      this.applyMatrix(M);
    }
    // crop: true 的元素只保留"画它时那个镜头"里看得到的部分，镜头拉远时也不会突然变完整
    applyCrop() {
      this._cropped = true;
      const b = this.b, c = b.camAt(this.done);
      const r = { x: c.x - b.W / 2 / c.zoom, y: c.y - b.H / 2 / c.zoom, w: b.W / c.zoom, h: b.H / c.zoom };
      this.cropRect = r;
      if (this.node instanceof SVGElement) {
        const id = 'crop' + b.nextSeed();
        svgEl('rect', { x: r.x, y: r.y, width: r.w, height: r.h }, svgEl('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, this.node.ownerSVGElement));
        this.node.setAttribute('clip-path', `url(#${id})`);
      } else if (this.box) {
        const bx = this.box;
        this.node.style.clipPath = `inset(${Math.max(0, r.y - bx.y)}px ${Math.max(0, bx.x + bx.w - r.x - r.w)}px ${Math.max(0, bx.y + bx.h - r.y - r.h)}px ${Math.max(0, r.x - bx.x)}px)`;
      }
    }
    applyMatrix(M) {
      const key = M.join(',');
      if (key === this._tf) return;
      this._tf = key;
      const ident = key === M_ID.join(',');
      if (this.node instanceof SVGElement) {
        if (ident) this.node.removeAttribute('transform');
        else this.node.setAttribute('transform', `matrix(${M.join(' ')})`);
      } else {
        // HTML 元素的 transform 以自身中心为原点：把世界坐标里的矩阵换算过去
        const b = this.box;
        let css = '';
        if (!ident && b) {
          const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
          const L = mMul([1, 0, 0, 1, -cx, -cy], mMul(M, [1, 0, 0, 1, cx, cy]));
          css = `matrix(${L.join(',')}) `;
        }
        this.node.style.transform = css + (this.baseTransform || '');
      }
      this.onMatrix(M);
    }
    onMatrix() {}
    draw() {}
  }

  // 描线类元素：若干笔画按顺序画出，可选填色
  class Strokes extends Item {
    // strokes: [{pts, closed, color, width, fill, dash}]
    constructor(board, strokes, o) {
      const layer = o.hud ? board.hudSvg : o.layer === 'top' ? board.topSvg : o.layer === 'hl' ? board.hlSvg : board.inkSvg;
      const g = svgEl('g', {}, layer);
      super(board, o, g);
      const seed = o.seed ?? board.nextSeed();
      const rough = o.rough ?? 1;
      this.parts = strokes.map((s, i) => {
        const w = s.width ?? o.width ?? board.strokeWidth;
        const color = col(s.color ?? o.color);
        let pts = s.pts;
        if (!s.exact) {
          const L = pts.reduce((a, p, k) => (k ? a + Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]) : 0), 0);
          const r = rng(seed + i * 7919);
          const bow = s.closed ? 0 : (r() - 0.5) * Math.min(10, L * 0.012) * rough;
          pts = wobble(pts, 1.6 * rough, seed + i * 104729, bow);
        }
        const d = smoothD(pts, s.closed);
        const fillColor = s.fill ?? o.fill;
        let fillPath = null;
        if (fillColor) {
          fillPath = svgEl('path', { d, fill: col(fillColor), 'fill-opacity': s.fillOpacity ?? o.fillOpacity ?? 0.9, stroke: 'none', opacity: 0 }, g);
        }
        const path = svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
        const len = path.getTotalLength() || 1;
        let dashPath = null, maskPath = null;
        const dash = s.dash ?? o.dash;
        if (dash) {
          // 虚线：用遮罩实现描线生长
          const id = 'm' + board.nextSeed();
          const mask = svgEl('mask', { id, maskUnits: 'userSpaceOnUse', x: -1e5, y: -1e5, width: 2e5, height: 2e5 }, g);
          maskPath = svgEl('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': w + 6, 'stroke-linecap': 'round' }, mask);
          path.setAttribute('stroke-dasharray', dash.join(' '));
          path.setAttribute('mask', `url(#${id})`);
          dashPath = path;
        }
        const target = maskPath || path;
        target.style.strokeDasharray = `${len} ${len + 10}`;
        target.style.strokeDashoffset = len;
        if (!dash) path.style.visibility = 'hidden';
        return { path: target, visPath: path, fillPath, len, dash, w, maskPath };
      });
      const total = this.parts.reduce((a, p) => a + p.len, 0) + 60 * (this.parts.length - 1);
      this.dur = o.dur ?? clamp(total / (o.speed || board.penSpeed), 0.25, 3);
      this.hasFill = this.parts.some((p) => p.fillPath);
      const allPts = strokes.flatMap((s) => s.pts);
      const xs = allPts.map((p) => p[0]), ys = allPts.map((p) => p[1]);
      this.box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      this._total = total;
      board.add(this);
    }
    update(t) {
      super.update(t);
      if (this.hasFill && this._vis) {
        const f = progress(t, this.end, 0.35, ease.out);
        for (const p of this.parts) if (p.fillPath) p.fillPath.setAttribute('opacity', f);
      }
    }
    // 缩放动画时线宽保持不变（像用同一支笔画的）；o.scaleStroke = true 则线宽跟着缩放
    onMatrix(M) {
      const k = this.o.scaleStroke ? 1 : Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) || 1;
      if (k === this._k) return;
      this._k = k;
      for (const part of this.parts) {
        part.visPath.setAttribute('stroke-width', part.w / k);
        if (part.maskPath) part.maskPath.setAttribute('stroke-width', (part.w + 6) / k);
        if (part.dash) part.visPath.setAttribute('stroke-dasharray', part.dash.map((v) => v / k).join(' '));
      }
    }
    draw(p) {
      let budget = p * this._total;
      for (const part of this.parts) {
        const q = clamp(budget / part.len);
        budget -= part.len + 60;
        if (!part.dash) part.path.style.visibility = q > 0 ? 'visible' : 'hidden';
        part.path.style.strokeDashoffset = part.len * (1 - q);
      }
    }
  }

  // 手写文字：逐字"写"出来
  class TextItem extends Item {
    constructor(board, str, o, parentEl) {
      const div = document.createElement('div');
      div.className = 'wb-text';
      (parentEl || (o.hud ? board.hudHtml : board.html)).appendChild(div);
      super(board, o, div);
      this.kind = '文字';
      this.label = str.replace(/\{(\w+|#[0-9a-fA-F]{3,8}):([^}]*)\}/g, '$2').replace(/\n/g, ' ');
      const size = o.size ?? 56;
      const s = div.style;
      s.fontFamily = board.fonts[o.font] || o.font || board.fonts.hand;
      s.fontSize = size + 'px';
      s.color = col(o.color);
      if (o.weight) s.fontWeight = o.weight;
      if (o.lineHeight) s.lineHeight = o.lineHeight;
      if (o.maxWidth) { s.width = o.maxWidth + 'px'; s.whiteSpace = 'normal'; }
      if (o.align) s.textAlign = o.align;
      if (o.letterSpacing) s.letterSpacing = o.letterSpacing;
      this.chars = [];
      // 支持 {red:文字} 局部上色
      const segs = [];
      str.replace(/\{(\w+|#[0-9a-fA-F]{3,8}):([^}]*)\}|([^{]+|\{)/g, (m, c, inner, plain) => {
        segs.push(c ? { color: col(c), text: inner } : { text: plain });
        return m;
      });
      for (const seg of segs) {
        const re = /([A-Za-z0-9'’\-.%]+)|(\n)|( )|([\s\S])/g;
        let m;
        while ((m = re.exec(seg.text))) {
          if (m[2]) { div.appendChild(document.createElement('br')); continue; }
          if (m[3]) { div.appendChild(document.createTextNode(' ')); continue; }
          const holder = m[1] ? document.createElement('span') : div;
          if (m[1]) { holder.className = 'w'; div.appendChild(holder); }
          for (const ch of m[1] || m[4]) {
            const c = document.createElement('span');
            c.className = 'c';
            c.textContent = ch;
            if (seg.color) c.style.color = seg.color;
            c.style.visibility = 'hidden';
            const prev = this.chars.length ? this.chars[this.chars.length - 1].el : null;
            if (holder === div && prev && NO_LINE_START.test(ch)) {
              // 中文排版规则：逗号、冒号、右括号等标点不能出现在行首，和前一个字绑在一起不拆开
              let glue = prev.parentElement;
              if (!glue.classList.contains('w')) {
                glue = document.createElement('span');
                glue.className = 'w';
                prev.replaceWith(glue);
                glue.appendChild(prev);
              }
              glue.appendChild(c);
            } else holder.appendChild(c);
            this.chars.push({ el: c, q: -1 });
          }
        }
      }
      this.parentEl = parentEl;
      if (!parentEl) this.place(o.x ?? 960, o.y ?? 540, o.anchor || o.align || 'left', o.valign || 'top');
      const latin = (str.match(/[A-Za-z]/g) || []).length / Math.max(1, this.chars.length);
      const speed = o.speed || (latin > 0.5 ? 18 : 8);
      this.dur = o.dur ?? clamp(this.chars.length / speed, 0.3, 5);
      this.ease = ease.linear;
      if (!parentEl) board.add(this);
    }
    place(x, y, anchor, valign) {
      const w = this.node.offsetWidth, h = this.node.offsetHeight;
      const left = anchor === 'center' ? x - w / 2 : anchor === 'right' ? x - w : x;
      const top = valign === 'middle' ? y - h / 2 : valign === 'bottom' ? y - h : y;
      this.node.style.left = left + 'px';
      this.node.style.top = top + 'px';
      this.box = { x: left, y: top, w, h };
    }
    draw(p) {
      const n = this.chars.length, k = p * (n + 0.6);
      for (let i = 0; i < n; i++) {
        const c = this.chars[i];
        const q = clamp((k - i) / 1.6);
        if (q === c.q) continue;
        c.q = q;
        c.el.style.visibility = q > 0 ? 'visible' : 'hidden';
        c.el.style.clipPath = q > 0 && q < 1 ? `inset(-20% ${(1 - q) * 100}% -20% -10%)` : '';
      }
    }
  }

  // KaTeX 公式：从左到右"写"出来
  class MathItem extends Item {
    constructor(board, latex, o) {
      const div = document.createElement('div');
      div.className = 'wb-math';
      (o.hud ? board.hudHtml : board.html).appendChild(div);
      super(board, o, div);
      this.kind = '公式';
      this.label = latex;
      div.style.fontSize = (o.size ?? 56) + 'px';
      div.style.color = col(o.color);
      window.katex.render(o.inline ? latex : '\\displaystyle ' + latex, div, { displayMode: !!o.display, throwOnError: false, trust: true, strict: false, output: 'html' });
      const w = div.offsetWidth, h = div.offsetHeight;
      const x = o.x ?? 960, y = o.y ?? 540, anchor = o.anchor || o.align || 'left', valign = o.valign || 'top';
      const left = anchor === 'center' ? x - w / 2 : anchor === 'right' ? x - w : x;
      const top = valign === 'middle' ? y - h / 2 : valign === 'bottom' ? y - h : y;
      div.style.left = left + 'px';
      div.style.top = top + 'px';
      this.box = { x: left, y: top, w, h };
      this.dur = o.dur ?? clamp(0.5 + latex.replace(/\\[a-zA-Z]+|[{}\s^_]/g, '').length * 0.07, 0.6, 4);
      this.ease = ease.inOutSine;
      board.add(this);
    }
    // 公式中 \htmlClass{名字}{...} 部分的世界坐标框，可用来圈、划、高亮某一项
    part(name) {
      const el = this.node.querySelector('.' + name);
      if (!el) throw new Error(`公式里找不到 \\htmlClass{${name}}`);
      const r = el.getBoundingClientRect(), R = this.node.getBoundingClientRect();
      const k = this.node.offsetWidth / R.width || 1;
      return { x: this.box.x + (r.left - R.left) * k, y: this.box.y + (r.top - R.top) * k, w: r.width * k, h: r.height * k };
    }
    draw(p) {
      this.node.style.clipPath = p >= 1 ? '' : `inset(-30% ${(1 - p) * 100}% -30% -5%)`;
    }
  }

  // 便签：贴上去，再在上面写字
  class NoteItem extends Item {
    constructor(board, str, o) {
      const div = document.createElement('div');
      div.className = 'wb-note';
      (o.hud ? board.hudHtml : board.html).appendChild(div);
      super(board, o, div);
      this.kind = '便签';
      this.label = str.replace(/\{(\w+|#[0-9a-fA-F]{3,8}):([^}]*)\}/g, '$2').replace(/\n/g, ' ');
      div.style.background = NOTE[o.color || 'yellow'] || o.color;
      div.style.width = (o.w ?? 460) + 'px';
      if (o.h) div.style.minHeight = o.h + 'px';
      this.text = new TextItem(board, str, { size: o.size ?? 44, color: o.textColor, align: o.align, font: o.font, at: 0, lineHeight: o.lineHeight }, div);
      const w = div.offsetWidth, h = div.offsetHeight;
      const x = o.x ?? 960, y = o.y ?? 540;
      const anchor = o.anchor || 'left';
      const left = anchor === 'center' ? x - w / 2 : anchor === 'right' ? x - w : x;
      const top = o.valign === 'middle' ? y - h / 2 : y;
      div.style.left = left + 'px';
      div.style.top = top + 'px';
      this.box = { x: left, y: top, w, h };
      this.rot = o.rotate ?? -1.5;
      this.landDur = 0.4;
      this.dur = o.dur ?? this.landDur + this.text.dur;
      this.ease = ease.linear;
      board.add(this);
    }
    draw(p) {
      const t = p * this.dur;
      const land = ease.out(clamp(t / this.landDur));
      this.baseTransform = `rotate(${this.rot}deg) translateY(${(1 - land) * -40}px) scale(${1 + (1 - land) * 0.06})`;
      this.node.style.transform = this.baseTransform;
      this._tf = null;
      this.node.style.opacity = land;
      this.text.draw(clamp((t - this.landDur) / Math.max(0.01, this.dur - this.landDur)));
    }
  }

  // 荧光笔：从左到右刷过去
  class HighlightItem extends Item {
    constructor(board, box, o) {
      const g = svgEl('g', {}, o.hud ? board.hudSvg : board.hlSvg);
      super(board, o, g);
      const pad = o.pad ?? 6, r = rng(o.seed ?? board.nextSeed());
      const x = box.x - pad, y = box.y + box.h * (o.from ?? 0.12), w = box.w + pad * 2, h = box.h * ((o.to ?? 0.95) - (o.from ?? 0.12));
      const sk = () => (r() - 0.5) * 8;
      const d = `M${x + sk()},${y + sk() * 0.5} L${x + w + sk()},${y + sk() * 0.5} L${x + w + sk()},${y + h + sk() * 0.5} L${x + sk()},${y + h + sk() * 0.5} Z`;
      const id = 'c' + board.nextSeed();
      const cp = svgEl('clipPath', { id }, g);
      this.clipRect = svgEl('rect', { x: x - 10, y: y - 20, width: 0, height: h + 40 }, cp);
      svgEl('path', { d, fill: HL[o.color || 'yellow'] || o.color, opacity: 0.85, 'clip-path': `url(#${id})`, style: 'mix-blend-mode:multiply' }, g);
      this.box = { x, y, w, h };
      this.w = w + 20;
      this.dur = o.dur ?? clamp(w / 1100, 0.25, 1.2);
      this.ease = ease.inOutSine;
      board.add(this);
    }
    draw(p) { this.clipRect.setAttribute('width', this.w * p); }
  }

  // 圆点：弹出
  class DotItem extends Item {
    constructor(board, x, y, o) {
      const g = svgEl('g', {}, o.hud ? board.hudSvg : o.layer === 'top' ? board.topSvg : board.inkSvg);
      super(board, o, g);
      const r = o.r ?? 10;
      this.c = svgEl('circle', { cx: x, cy: y, r, fill: col(o.color) }, g);
      this.r = r;
      this.box = { x: x - r, y: y - r, w: 2 * r, h: 2 * r };
      this.dur = o.dur ?? 0.3;
      this.ease = ease.outBack;
      board.add(this);
    }
    draw(p) { this.c.setAttribute('r', Math.max(0, this.r * p)); }
  }

  // ---------- 白板 ----------
  class Board {
    constructor(opts = {}) {
      this.T = opts.T;
      this.fonts = { ...FONTS, ...(opts.fonts || {}) };
      this.W = opts.width || 1920;
      this.H = opts.height || 1080;
      this.stage = opts.stage || document.getElementById('stage');
      this.items = [];
      this.cursor = opts.start ?? 0.3;
      this.gap = opts.gap ?? 0.15;
      this.penSpeed = opts.penSpeed ?? 1000;
      this.strokeWidth = opts.strokeWidth ?? 5;
      this._seed = EV.hashStr(opts.seed || 'wb');
      this.moves = [];
      this.cam0 = { x: this.W / 2, y: this.H / 2, zoom: 1, ...(opts.camera || {}) };
      this.paperKind = opts.paper || 'plain';
      this.gridSize = opts.grid || 48;
      this.stage.style.setProperty('--wb-bg', opts.bg || '#FAF8F3');

      const mk = (cls, tag = 'div', parent = this.stage) => { const e = document.createElement(tag); e.className = cls; parent.appendChild(e); return e; };
      this.paper = mk('wb-paper');
      this.world = mk('wb-world');
      this.hlSvg = svgEl('svg', {}, this.world);
      this.inkSvg = svgEl('svg', {}, this.world);
      this.html = mk('wb-html', 'div', this.world);
      this.topSvg = svgEl('svg', {}, this.world);
      if (opts.texture !== false) this.texture = mk('wb-texture');
      this.hud = mk('wb-hud');
      this.hudSvg = svgEl('svg', {}, this.hud);
      this.hudHtml = mk('wb-html', 'div', this.hud);
      this.setupPaper();
      if (opts.captions !== false && this.T && this.T.lines.length) this.setupCaptions(opts.captionMax || 20);
      // 章节进度条：script.json 里定义了 2 个以上章节时自动出现；chapters: false 关闭，也可传 { top, margin }
      if (opts.chapters !== false && this.T && this.T.chapters.length >= 2) this.setupChapters(opts.chapters || {});
      this.applyCamera(this.cam0);
    }
    nextSeed() { return (this._seed = (Math.imul(this._seed, 1664525) + 1013904223) >>> 0); }
    add(item) { this.items.push(item); this.cursor = item.end + this.gap; return item; }
    at(t) { this.cursor = t; return this; }
    wait(s) { this.cursor += s; return this; }

    setupPaper(fade = 1) {
      const s = this.paper.style;
      const lineC = `rgba(52, 100, 170, ${0.11 * fade})`;
      if (this.paperKind === 'grid') s.backgroundImage = `linear-gradient(to right, ${lineC} 1.5px, transparent 1.5px), linear-gradient(to bottom, ${lineC} 1.5px, transparent 1.5px)`;
      else if (this.paperKind === 'dots') s.backgroundImage = `radial-gradient(circle, rgba(52,100,170,${0.22 * fade}) 2px, transparent 2.5px)`;
      else if (this.paperKind === 'lined') s.backgroundImage = `linear-gradient(to bottom, ${lineC} 1.5px, transparent 1.5px)`;
      if (this.texture && !this.texture.style.backgroundImage) {
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' seed='7'/><feColorMatrix values='0 0 0 0 .45  0 0 0 0 .42  0 0 0 0 .36  0 0 0 .09 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
        this.texture.style.backgroundImage = `radial-gradient(ellipse at center, transparent 62%, rgba(120,105,80,.10) 100%), url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      }
    }

    // ---------- 镜头 ----------
    // 在 at 秒把镜头移到 {x, y, zoom}（x,y 是画面中心对准的世界坐标）
    camera(at, target, dur = 1.2) { this.moves.push({ at, dur, target }); this.moves.sort((a, b) => a.at - b.at); return this; }
    // 让镜头对准某个元素 / 区域
    // 取景时自动避开顶部章节进度条和底部字幕
    focus(target, o = {}) {
      const b = Array.isArray(target) ? unionBox(target.map(boxOf)) : boxOf(target);
      const pad = o.pad ?? 120;
      const top = this.chapterZone || 0, bottom = this.capEl ? 150 : 0, availH = this.H - top - bottom;
      const zoom = o.zoom ?? Math.min(1.5, this.W / (b.w + pad * 2), availH / (b.h + pad * 2));
      const cy = b.y + b.h / 2 - (top + availH / 2 - this.H / 2) / zoom;
      return this.camera(o.at ?? this.cursor, { x: b.x + b.w / 2 + (o.dx || 0), y: cy + (o.dy || 0), zoom }, o.dur ?? 1.2);
    }
    camAt(t) {
      let c = { ...this.cam0 };
      for (const m of this.moves) {
        if (t <= m.at) break;
        const p = progress(t, m.at, m.dur, ease.inOut);
        const tg = { x: m.target.x ?? c.x, y: m.target.y ?? c.y, zoom: m.target.zoom ?? c.zoom };
        c = { x: lerp(c.x, tg.x, p), y: lerp(c.y, tg.y, p), zoom: Math.exp(lerp(Math.log(c.zoom), Math.log(tg.zoom), p)) };
      }
      return c;
    }
    applyCamera(c) {
      const { W, H } = this;
      this.world.style.transform = `translate(${W / 2}px, ${H / 2}px) scale(${c.zoom}) translate(${-c.x}px, ${-c.y}px)`;
      if (this.paperKind !== 'plain') {
        const g = this.gridSize * c.zoom;
        // 镜头拉远、格子太密时，纸面纹理逐渐变淡，避免变成一片噪点
        const fade = Math.round(clamp((g - 8) / 22) * 20) / 20;
        if (fade !== this._paperFade) { this._paperFade = fade; this.setupPaper(fade); }
        this.paper.style.backgroundSize = `${g}px ${g}px`;
        this.paper.style.backgroundPosition = `${W / 2 - c.x * c.zoom}px ${H / 2 - c.y * c.zoom}px`;
      }
    }
    // 所有（或指定）元素的外框，用于结尾"拉远看全貌"
    bounds(items) { return unionBox((items || this.items.filter((i) => !i.o.hud)).map((i) => i.box)); }

    // ---------- 字幕 ----------
    setupCaptions(max) {
      this.capEl = document.createElement('div');
      this.capEl.className = 'wb-caption';
      this.capEl.style.fontFamily = this.fonts.caption;
      this.capEl.style.visibility = 'hidden';
      this.hud.appendChild(this.capEl);
      const PUN = /[\s，。、？！；：“”‘’（）《》「」【】—…·,.?!;:'"()]/;
      this.caps = [];
      for (const l of this.T.lines) {
        if (!l.text || l.silence) continue;
        // 按标点切句，再合并成不超过 max 个字的小段
        const pieces = l.text.match(/[^，。！？；：,.!?;:]+[，。！？；：,.!?;:]*/g) || [l.text];
        const chunks = [];
        for (const pc of pieces) {
          const last = chunks[chunks.length - 1];
          if (last && (last + pc).replace(PUN, '').length <= max && !/[。！？.!?]$/.test(last)) chunks[chunks.length - 1] = last + pc;
          else chunks.push(pc);
        }
        const split = chunks.flatMap((c) => {
          const n = Math.ceil(c.replace(/\s/g, '').length / (max + 4));
          if (n <= 1) return [c];
          const size = Math.ceil(c.length / n);
          return Array.from({ length: n }, (_, i) => c.slice(i * size, (i + 1) * size));
        });
        // 每段的开始时间：取这段第一个字被念出的时间
        const words = l.words || [];
        const norm = (s) => s.replace(new RegExp(PUN.source, 'g'), '').toLowerCase();
        let concat = '';
        const owner = [];
        words.forEach((w, i) => { const n = norm(w.text); concat += n; for (let k = 0; k < n.length; k++) owner.push(i); });
        let idx = 0;
        const starts = split.map((c) => {
          const n = norm(c).length;
          const wi = owner[Math.min(idx, owner.length - 1)];
          const st = words.length && wi !== undefined ? words[wi].start : lerp(l.start, l.end, idx / Math.max(1, norm(l.text).length));
          idx += n;
          return st;
        });
        split.forEach((c, i) => {
          const text = c.trim().replace(/[，。、；：,;:]+$/, '').replace(/[，、,]/g, ' ');
          this.caps.push({ text, start: i === 0 ? l.start : starts[i], end: i < split.length - 1 ? starts[i + 1] : l.end + 0.25 });
        });
      }
    }
    // ---------- 章节进度条：一支铅笔沿着屏幕顶部把进度线"画"出来 ----------
    setupChapters(cfg) {
      const chs = this.T.chapters, W = this.W;
      // 标题写在线下方，铅笔在线上方移动，两者不会互相遮挡；右边多留一些位置给铅笔尾巴
      const x0 = cfg.margin ?? 64, x1 = W - (cfg.margin ?? 64) - 46, ly = (cfg.top ?? 0) + 58;
      this.chapterZone = ly + 46;
      // 每章的宽度按时长分配，但至少能放下 3 个字
      const avail = x1 - x0, total = chs[chs.length - 1].end - chs[0].start;
      const minW = Math.min(130, avail / chs.length);
      let ws = chs.map((c) => (avail * (c.end - c.start)) / total);
      const extra = ws.reduce((a, w) => a + Math.max(0, minW - w), 0);
      const room = ws.reduce((a, w) => a + Math.max(0, w - minW), 0) || 1;
      ws = ws.map((w) => (w < minW ? minW : w - (extra * (w - minW)) / room));
      const g = svgEl('g', {}, this.hudSvg);
      this.chG = g;
      // 还没画到的部分：浅灰虚线当"引导线"
      svgEl('path', { d: `M${x0},${ly} L${x1},${ly}`, stroke: '#D3D5DA', 'stroke-width': 3, 'stroke-dasharray': '10 12', fill: 'none' }, g);
      // 铅笔画出来的墨线：预先生成整条手抖线，按进度露出
      const pts = [];
      for (let x = x0; x <= x1; x += 10) pts.push([x, ly]);
      const ink = svgEl('path', { d: smoothD(wobble(pts, 2.4, this.nextSeed())), stroke: COLORS.ink, 'stroke-width': 6, 'stroke-linecap': 'round', fill: 'none' }, g);
      const L = ink.getTotalLength();
      ink.style.strokeDasharray = `${L} ${L + 10}`;
      this.chInk = { el: ink, L, x0, x1 };
      let x = x0;
      this.chs = chs.map((c, i) => {
        const w = ws[i];
        const tick = svgEl('path', { d: `M${x},${ly - 12} L${x + 1},${ly + 12}`, stroke: COLORS.ink, 'stroke-width': 4.5, 'stroke-linecap': 'round' }, g);
        const label = svgEl('text', { x: x + 10, y: ly + 36, 'font-size': 26, fill: COLORS.ink, style: `font-family:${this.fonts.hand}` }, g);
        // 标题放不下就缩小字号，再放不下就截断
        let text = c.title, size = 26;
        label.textContent = text;
        const maxW = w - 22;
        if (label.getComputedTextLength() > maxW) { size = Math.max(16, (size * maxW) / label.getComputedTextLength()); label.setAttribute('font-size', size); }
        while (label.getComputedTextLength() > maxW && text.length > 1) { text = text.slice(0, -1); label.textContent = text + '…'; }
        const item = { ...c, x, w, tick, label, size, state: null };
        x += w;
        return item;
      });
      this.chEndTick = svgEl('path', { d: `M${x1},${ly - 12} L${x1},${ly + 12}`, stroke: '#C9CCD1', 'stroke-width': 4.5, 'stroke-linecap': 'round' }, g);
      this.chLy = ly;
      // 铅笔：笔尖在 (0,0)，沿 +x 方向依次是笔芯、木头、笔杆、金属箍、橡皮
      const pen = svgEl('g', {}, g);
      svgEl('path', { d: 'M0,0 L15,-6.5 L15,6.5 Z', fill: COLORS.ink }, pen);
      svgEl('path', { d: 'M15,-6.5 L36,-13 L36,13 L15,6.5 Z', fill: '#EBC9A0', stroke: COLORS.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }, pen);
      svgEl('rect', { x: 36, y: -13, width: 88, height: 26, fill: '#F6C343', stroke: COLORS.ink, 'stroke-width': 3 }, pen);
      svgEl('path', { d: 'M40,-4 L120,-4', stroke: '#D9A21F', 'stroke-width': 3 }, pen);
      svgEl('rect', { x: 124, y: -13, width: 13, height: 26, fill: '#C9CCD1', stroke: COLORS.ink, 'stroke-width': 3 }, pen);
      svgEl('rect', { x: 137, y: -13, width: 20, height: 26, rx: 6, fill: '#F4A7B9', stroke: COLORS.ink, 'stroke-width': 3 }, pen);
      this.chPen = pen;
    }
    renderChapters(t) {
      const enter = clamp(t / 0.8);
      this.chG.style.opacity = enter;
      const last = this.chs[this.chs.length - 1];
      const tt = clamp(t, this.chs[0].start, last.end);
      let cur = this.chs.findIndex((c) => tt >= c.start && tt < c.end);
      if (cur < 0) cur = this.chs.length - 1;
      const c = this.chs[cur];
      const hx = c.x + c.w * clamp((tt - c.start) / (c.end - c.start));
      // 墨线画到铅笔尖的位置
      const { el, L, x0, x1 } = this.chInk;
      el.style.strokeDashoffset = L * (1 - (hx - x0) / (x1 - x0));
      for (const [i, ch] of this.chs.entries()) {
        const state = i < cur ? 'done' : i === cur ? 'cur' : 'todo';
        if (state !== ch.state) {
          ch.state = state;
          ch.label.setAttribute('fill', state === 'todo' ? '#9A9EA6' : COLORS.ink);
          ch.label.setAttribute('font-weight', state === 'cur' ? 700 : 400);
          ch.tick.setAttribute('stroke', state === 'todo' ? '#C9CCD1' : COLORS.ink);
        }
        // 进入新章节时，标题轻轻跳一下
        const k = clamp((t - ch.start) / 0.45);
        const s = i === cur && i > 0 && k > 0 && k < 1 ? 1 + 0.14 * Math.sin(Math.PI * k) : 1;
        const lx = ch.x + 10, lyy = this.chLy + 27;
        ch.label.setAttribute('transform', s === 1 ? '' : `translate(${lx},${lyy}) scale(${s}) translate(${-lx},${-lyy})`);
      }
      // 铅笔：笔尖停在进度处，写字时轻微晃动；全部讲完后抬笔，终点刻度变黑表示完成
      const drawing = t < last.end;
      const wig = drawing ? Math.sin(t * 9) : 0;
      const lift = drawing ? 0 : ease.out(clamp((t - last.end) / 0.4)) * 10;
      this.chPen.setAttribute('transform', `translate(${hx},${this.chLy + wig * 1.2 - lift}) rotate(${-28 + wig * 2.5}) scale(0.72)`);
      if (drawing !== this._chDrawing) { this._chDrawing = drawing; this.chEndTick.setAttribute('stroke', drawing ? '#C9CCD1' : COLORS.ink); }
    }

    renderCaptions(t) {
      const c = this.caps.find((x) => t >= x.start && t < x.end);
      const text = c ? c.text : '';
      if (text !== this._cap) {
        this._cap = text;
        this.capEl.textContent = text;
        this.capEl.style.visibility = text ? 'visible' : 'hidden';
      }
    }

    // ---------- 绘图 API ----------
    text(str, o = {}) { return new TextItem(this, str, o); }
    math(latex, o = {}) { return new MathItem(this, latex, o); }
    note(str, o = {}) { return new NoteItem(this, str, o); }
    // 对话气泡：先画圆角框和尾巴，再在里面写字。
    //   x, y + anchor(left|center|right)：框的位置（y 为上边）；tail: 'left' | 'right' | 'none' | [x, y]（尾巴尖指向的世界坐标）
    //   color：框线颜色（一般用说话人的颜色）；textColor；size；pad；fill（默认白色）
    // 返回 { shape, text, box, start, end, erase, move, pulse }，可以作为下一个元素的 at
    bubble(str, o = {}) {
      const size = o.size ?? 48, pad = o.pad ?? 26;
      let t0 = o.at;
      if (t0 && typeof t0 === 'object') t0 = t0.end;
      if (t0 === undefined || t0 === null) t0 = this.cursor;
      t0 += o.delay || 0;
      const shapeDur = o.shapeDur ?? 0.35;
      const text = this.text(str, { size, color: o.textColor, font: o.font, align: o.align, at: t0 + shapeDur, dur: o.dur, hud: o.hud, overlap: true });
      const w = text.box.w + pad * 2, h = text.box.h + pad * 1.2;
      const x = o.x ?? 960, top = o.y ?? 540, anchor = o.anchor || 'left';
      const left = anchor === 'center' ? x - w / 2 : anchor === 'right' ? x - w : x;
      const right = left + w, bottom = top + h, r = Math.min(h / 2, 28);
      text.place(left + pad, top + pad * 0.6, 'left', 'top');
      const tail = o.tail ?? 'left';
      let d = `M${left + r},${top} L${right - r},${top} Q${right},${top} ${right},${top + r} L${right},${bottom - r} Q${right},${bottom} ${right - r},${bottom}`;
      if (tail !== 'none') {
        const tip = Array.isArray(tail) ? tail : tail === 'right' ? [right + 6, bottom + 34] : [left - 6, bottom + 34];
        const bx = clamp(tip[0], left + r + 18, right - r - 18);
        d += ` L${bx + 18},${bottom} L${tip[0]},${tip[1]} L${bx - 18},${bottom}`;
      }
      d += ` L${left + r},${bottom} Q${left},${bottom} ${left},${bottom - r} L${left},${top + r} Q${left},${top} ${left + r},${top} Z`;
      const shape = this.path([{ d, fill: o.fill ?? '#FFFFFF' }], { color: o.color, width: o.width ?? 4, at: t0, dur: shapeDur, hud: o.hud, overlap: true, rough: 0.6 });
      shape.kind = '气泡';
      shape.label = text.label;
      shape.o.overlap = false;       // 气泡框参与重叠检查，里面的字不重复检查
      this.cursor = text.end + this.gap;
      const g = {
        shape, text, box: shape.box, start: shape.start,
        get end() { return text.end; },
        erase(at, dur) { shape.erase(at, dur); text.erase(at, dur); return g; },
        move(...a) { shape.move(...a); text.move(...a); return g; },
        pulse(...a) { shape.pulse(...a); text.pulse(...a); return g; },
      };
      return g;
    }
    dot(x, y, o = {}) { return new DotItem(this, x, y, o); }
    highlight(target, o = {}) { return new HighlightItem(this, boxOf(target), o); }

    line(x1, y1, x2, y2, o = {}) { return new Strokes(this, [{ pts: linePts(x1, y1, x2, y2), dash: o.dash }], o); }
    polyline(points, o = {}) {
      const pts = [];
      for (let i = 1; i < points.length; i++) pts.push(...linePts(...points[i - 1], ...points[i]).slice(i > 1 ? 1 : 0));
      // 闭合：补上最后一条边（去掉和起点重合的最后一个点），否则样条会把最后一条边画成弯钩
      if (o.closed && points.length > 2) pts.push(...linePts(...points[points.length - 1], ...points[0]).slice(1, -1));
      return new Strokes(this, [{ pts, closed: !!o.closed }], o);
    }
    curve(points, o = {}) {
      const d = smoothD(points, !!o.closed);
      return new Strokes(this, samplePathD(d + (o.closed ? 'Z' : '')), o);
    }
    // 任意 SVG 路径（可传数组）。x,y,scale 把路径从自身坐标放到白板上。
    // 路径里的每个子路径请用绝对坐标 M 开头；元素可写成 {d, color, width, fill, dash}
    path(ds, o = {}) {
      const list = Array.isArray(ds) ? ds : [ds];
      const sx = o.scale ?? 1, ox = o.x ?? 0, oy = o.y ?? 0;
      const strokes = [];
      for (const it of list) {
        const spec = typeof it === 'string' ? { d: it } : it;
        for (const sub of samplePathD(spec.d)) {
          strokes.push({ ...spec, closed: sub.closed, pts: sub.pts.map(([x, y]) => [ox + x * sx, oy + y * sx]) });
        }
      }
      return new Strokes(this, strokes, o);
    }
    sketch(ds, o = {}) { return this.path(ds, o); }

    arrow(x1, y1, x2, y2, o = {}) {
      const L = Math.hypot(x2 - x1, y2 - y1);
      const bend = o.bend ?? 0;
      const mx = (x1 + x2) / 2 - ((y2 - y1) / L) * bend * L, my = (y1 + y2) / 2 + ((x2 - x1) / L) * bend * L;
      const shaft = bend ? quadPts(x1, y1, mx, my, x2, y2) : linePts(x1, y1, x2, y2);
      const hs = o.head ?? 24;
      const heads = (tip, from) => {
        const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
        return [-1, 1].map((sgn) => ({ pts: linePts(tip[0] - hs * Math.cos(a + sgn * 0.5), tip[1] - hs * Math.sin(a + sgn * 0.5), tip[0], tip[1]) }));
      };
      const n = shaft.length;
      const strokes = [{ pts: shaft, dash: o.dash }, ...heads(shaft[n - 1], shaft[Math.max(0, n - 4)])];
      if (o.double) strokes.push(...heads(shaft[0], shaft[Math.min(n - 1, 3)]));
      return new Strokes(this, strokes, o);
    }

    rect(x, y, w, h, o = {}) {
      const r = rng(o.seed ?? this.nextSeed()), ov = () => 4 + r() * 6;
      const sides = [
        [x - ov(), y, x + w + ov(), y],
        [x + w, y - ov(), x + w, y + h + ov()],
        [x + w + ov(), y + h, x - ov(), y + h],
        [x, y + h + ov(), x, y - ov()],
      ];
      return new Strokes(this, sides.map((s) => ({ pts: linePts(...s) })), o);
    }

    ellipse(cx, cy, rx, ry, o = {}) {
      const r = rng(o.seed ?? this.nextSeed());
      const turns = o.turns ?? 1.08, a0 = o.startAngle ?? -2.2 + r() * 0.8;
      const n = Math.ceil(Math.max(rx, ry) * Math.abs(turns) * 0.5 + 24);
      const drift = o.drift ?? 0.025 + r() * 0.03;
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, a = a0 + u * turns * Math.PI * 2;
        const k = 1 + drift * (u - 0.5) * 2;
        pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
      }
      return new Strokes(this, [{ pts, fill: o.fill }], { ...o, fill: undefined });
    }
    circle(cx, cy, rad, o = {}) { return this.ellipse(cx, cy, rad, rad, o); }

    // 圈出某个元素
    circleAround(target, o = {}) {
      const b = boxOf(target), pad = o.pad ?? 18;
      return this.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + pad * 1.4, b.h / 2 + pad, { color: 'red', ...o });
    }
    boxAround(target, o = {}) {
      const b = boxOf(target), pad = o.pad ?? 16;
      return this.rect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, { color: 'red', ...o });
    }
    underline(target, o = {}) {
      const b = boxOf(target), y = b.y + b.h + (o.offset ?? 6), x1 = b.x - 4, x2 = b.x + b.w + 4;
      let pts;
      if (o.wavy) {
        pts = [];
        const n = Math.ceil((x2 - x1) / 6);
        for (let i = 0; i <= n; i++) pts.push([lerp(x1, x2, i / n), y + Math.sin((i / n) * (x2 - x1) / 14) * 6]);
      } else pts = linePts(x1, y + 3, x2, y - 3);
      const strokes = [{ pts }];
      if (o.double) strokes.push({ pts: linePts(x1 + 10, y + 15, x2 - 6, y + 10) });
      return new Strokes(this, strokes, { color: 'red', ...o });
    }
    // 划掉（o.cross=true 画 ×）
    strike(target, o = {}) {
      const b = boxOf(target);
      const strokes = o.cross
        ? [{ pts: linePts(b.x, b.y, b.x + b.w, b.y + b.h) }, { pts: linePts(b.x + b.w, b.y, b.x, b.y + b.h) }]
        : [{ pts: linePts(b.x - 6, b.y + b.h * 0.58, b.x + b.w + 6, b.y + b.h * 0.42) }];
      return new Strokes(this, strokes, { color: 'red', ...o });
    }
    check(x, y, o = {}) {
      const s = o.size ?? 60;
      return new Strokes(this, [{ pts: [...linePts(x - s / 2, y, x - s / 8, y + s / 2.6), ...linePts(x - s / 8, y + s / 2.6, x + s / 1.8, y - s / 2).slice(1)] }], { color: 'green', width: 7, ...o });
    }
    cross(x, y, o = {}) {
      const s = (o.size ?? 56) / 2;
      return new Strokes(this, [{ pts: linePts(x - s, y - s, x + s, y + s) }, { pts: linePts(x + s, y - s, x - s, y + s) }], { color: 'red', width: 7, ...o });
    }
    // 花括号：水平（dir: 'down' 尖朝下 / 'up'），用于把几部分归到一起
    brace(x1, x2, y, o = {}) {
      const dir = o.dir === 'up' ? -1 : 1, d = (o.depth ?? 22) * dir, m = (x1 + x2) / 2;
      const pts = [
        ...quadPts(x1, y, x1, y + d * 0.9, x1 + Math.min(30, (m - x1) / 3), y + d * 0.9),
        ...linePts(x1 + Math.min(30, (m - x1) / 3), y + d * 0.9, m - 14, y + d * 0.9).slice(1),
        ...quadPts(m - 14, y + d * 0.9, m, y + d * 0.9, m, y + d * 1.7).slice(1),
        ...quadPts(m, y + d * 1.7, m, y + d * 0.9, m + 14, y + d * 0.9).slice(1),
        ...linePts(m + 14, y + d * 0.9, x2 - Math.min(30, (x2 - m) / 3), y + d * 0.9).slice(1),
        ...quadPts(x2 - Math.min(30, (x2 - m) / 3), y + d * 0.9, x2, y + d * 0.9, x2, y).slice(1),
      ];
      const it = new Strokes(this, [{ pts }], { rough: 0.5, ...o });
      it.tip = [m, y + d * 1.7];
      return it;
    }
    // 竖向花括号（dir: 'right' 尖朝右 / 'left'）
    vbrace(y1, y2, x, o = {}) {
      const dir = o.dir === 'left' ? -1 : 1, d = (o.depth ?? 22) * dir, m = (y1 + y2) / 2;
      const q = (a, b) => Math.min(30, Math.abs(b - a) / 3);
      const pts = [
        ...quadPts(x, y1, x + d * 0.9, y1, x + d * 0.9, y1 + q(y1, m)),
        ...linePts(x + d * 0.9, y1 + q(y1, m), x + d * 0.9, m - 14).slice(1),
        ...quadPts(x + d * 0.9, m - 14, x + d * 0.9, m, x + d * 1.7, m).slice(1),
        ...quadPts(x + d * 1.7, m, x + d * 0.9, m, x + d * 0.9, m + 14).slice(1),
        ...linePts(x + d * 0.9, m + 14, x + d * 0.9, y2 - q(m, y2)).slice(1),
        ...quadPts(x + d * 0.9, y2 - q(m, y2), x + d * 0.9, y2, x, y2).slice(1),
      ];
      const it = new Strokes(this, [{ pts }], { rough: 0.5, ...o });
      it.tip = [x + d * 1.7, m];
      return it;
    }

    // ---------- 几何标注 ----------
    // 角标记：顶点 v，两边指向 p1、p2（都是 [x, y]）。o.n 道弧（1–3，用来区分不同的角）；
    // o.right = true 画直角符号；o.r 半径，o.gap 弧间距
    angleMark(v, p1, p2, o = {}) {
      const a1 = Math.atan2(p1[1] - v[1], p1[0] - v[0]);
      let d = Math.atan2(p2[1] - v[1], p2[0] - v[0]) - a1;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d <= -Math.PI) d += 2 * Math.PI;
      const r = o.r ?? 44, strokes = [];
      if (o.right) {
        const s = o.r ?? 30, u = [Math.cos(a1), Math.sin(a1)], w = [Math.cos(a1 + d), Math.sin(a1 + d)];
        const A = [v[0] + u[0] * s, v[1] + u[1] * s], B = [A[0] + w[0] * s, A[1] + w[1] * s], C = [v[0] + w[0] * s, v[1] + w[1] * s];
        strokes.push({ pts: [...linePts(...A, ...B), ...linePts(...B, ...C).slice(1)] });
      } else {
        for (let i = 0; i < (o.n ?? 1); i++) {
          const rr = r + i * (o.gap ?? 10), m = Math.max(6, Math.ceil((Math.abs(d) * rr) / 8)), pts = [];
          for (let k = 0; k <= m; k++) { const a = a1 + (d * k) / m; pts.push([v[0] + Math.cos(a) * rr, v[1] + Math.sin(a) * rr]); }
          strokes.push({ pts });
        }
      }
      return new Strokes(this, strokes, { width: 4, rough: 0.35, ...o });
    }
    // 等长标记：在线段 p1–p2 上画 o.n 道短杠（1–3，用来区分不同的边）；o.pos 位置（0–1，默认中点）
    tickMark(p1, p2, o = {}) {
      const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1;
      const u = [(p2[0] - p1[0]) / L, (p2[1] - p1[1]) / L], nv = [-u[1], u[0]];
      const n = o.n ?? 1, len = o.len ?? 28, gap = o.gap ?? 11, pos = o.pos ?? 0.5;
      const c = [lerp(p1[0], p2[0], pos), lerp(p1[1], p2[1], pos)];
      const strokes = [];
      for (let i = 0; i < n; i++) {
        const k = (i - (n - 1) / 2) * gap, x = c[0] + u[0] * k, y = c[1] + u[1] * k;
        strokes.push({ pts: linePts(x - nv[0] * len / 2, y - nv[1] * len / 2, x + nv[0] * len / 2, y + nv[1] * len / 2) });
      }
      return new Strokes(this, strokes, { width: 4, rough: 0.3, ...o });
    }
    // 把文字放在点 (px, py) 沿方向 dir 往外 pad 像素处，文字框不压住这个点
    _placeOut(item, px, py, dir, pad) {
      const { w, h } = item.box, L = Math.hypot(dir[0], dir[1]) || 1, ux = dir[0] / L, uy = dir[1] / L;
      const off = Math.abs(ux) * w / 2 + Math.abs(uy) * h / 2 + pad;
      item.place(px + ux * off, py + uy * off, 'center', 'middle');
      return item;
    }
    // 多边形顶点字母：names[i] 放在 pts[i] 外侧（沿外角平分线）；null 跳过。返回文字数组
    vertexLabels(pts, names, o = {}) {
      const n = pts.length, out = [];
      names.forEach((name, i) => {
        if (name == null) return;
        const p = pts[i], a = pts[(i + n - 1) % n], c = pts[(i + 1) % n];
        const ua = [a[0] - p[0], a[1] - p[1]], uc = [c[0] - p[0], c[1] - p[1]];
        const la = Math.hypot(...ua) || 1, lc = Math.hypot(...uc) || 1;
        const dir = [-(ua[0] / la + uc[0] / lc), -(ua[1] / la + uc[1] / lc)];
        const { pad, ...rest } = o;
        const it = this.text(name, { font: 'en', size: 48, ...rest, at: out.length ? undefined : o.at, x: p[0], y: p[1], align: 'center', valign: 'middle' });
        out.push(this._placeOut(it, p[0], p[1], dir, pad ?? 10));
      });
      return out;
    }
    // 多边形边上的标注：labels[i] 标在边 pts[i]→pts[i+1] 的中点外侧；null 跳过。返回文字数组
    sideLabels(pts, labels, o = {}) {
      const n = pts.length, out = [];
      const cx = pts.reduce((s, p) => s + p[0], 0) / n, cy = pts.reduce((s, p) => s + p[1], 0) / n;
      labels.forEach((lab, i) => {
        if (lab == null) return;
        const p = pts[i], q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        let nv = [-(q[1] - p[1]), q[0] - p[0]];
        if (nv[0] * (m[0] - cx) + nv[1] * (m[1] - cy) < 0) nv = [-nv[0], -nv[1]];
        const { pad, ...rest } = o;
        const it = this.text(String(lab), { size: 44, ...rest, at: out.length ? undefined : o.at, x: m[0], y: m[1], align: 'center', valign: 'middle' });
        out.push(this._placeOut(it, m[0], m[1], nv, pad ?? 12));
      });
      return out;
    }

    // 坐标系：返回 {toScreen(x,y), plot(fn,o), point(x,y,o), items}
    axes(o = {}) {
      const { x = 300, y = 200, w = 800, h = 500 } = o;
      const [x0, x1] = o.xRange || [0, 10], [y0, y1] = o.yRange || [0, 10];
      const toScreen = (dx, dy) => [x + ((dx - x0) / (x1 - x0)) * w, y + h - ((dy - y0) / (y1 - y0)) * h];
      const [ox, oy] = toScreen(clamp(0, x0, x1), clamp(0, y0, y1));
      const color = o.color || 'ink', width = o.width ?? 4;
      const items = [];
      items.push(this.arrow(x - 10, oy, x + w + 40, oy, { color, width, head: 18, at: o.at, dur: o.dur ?? 0.6 }));
      items.push(this.arrow(ox, y + h + 10, ox, y - 40, { color, width, head: 18, dur: o.dur ?? 0.6 }));
      const ls = o.labelSize ?? 40;
      if (o.xLabel) items.push(this.text(o.xLabel, { x: x + w + 50, y: oy + 10, size: ls, color }));
      if (o.yLabel) items.push(this.text(o.yLabel, { x: ox - 16, y: y - 50, size: ls, color, anchor: 'right' }));
      const board = this;
      return {
        items, toScreen,
        get end() { return items[items.length - 1].end; },
        plot(fn, po = {}) {
          const a = po.from ?? x0, b = po.to ?? x1, n = po.samples ?? 160;
          const pts = [];
          for (let i = 0; i <= n; i++) {
            const dx = lerp(a, b, i / n), dy = fn(dx);
            if (Number.isFinite(dy) && dy >= y0 - (y1 - y0) * 0.2 && dy <= y1 + (y1 - y0) * 0.2) pts.push(toScreen(dx, dy));
          }
          return new Strokes(board, [{ pts, exact: true }], { color: 'blue', width: 6, ...po });
        },
        point(dx, dy, po = {}) { const [sx, sy] = toScreen(dx, dy); return board.dot(sx, sy, { color: 'red', ...po }); },
      };
    }

    // 一次擦掉多个元素（'all' = 当前已出现的全部）
    erase(items, at, dur = 0.5) {
      at = at ?? this.cursor;
      const list = items === 'all' ? this.items.filter((i) => i.start < at && !i.o.hud) : items;
      list.forEach((i) => i.erase(at, dur));
      this.cursor = Math.max(this.cursor, at + dur);
      return this;
    }

    // 整块白板的最终样子（导出大图用）：所有内容画完的状态，不含字幕、进度条等屏幕固定层
    snapshot(pad = 100) {
      const T = this.duration;
      this.render(T);
      const boxes = this.items.filter((i) => !i.o.hud && i._vis && i.box).map((i) => {
        const b = i.boxAt(T);
        if (!i.cropRect) return b;
        const r = i.cropRect, x = Math.max(r.x, b.x), y = Math.max(r.y, b.y);
        return { x, y, w: Math.min(r.x + r.w, b.x + b.w) - x, h: Math.min(r.y + r.h, b.y + b.h) - y };
      });
      const b = unionBox(boxes);
      const w = Math.ceil(b.w + 2 * pad), h = Math.ceil(b.h + 2 * pad);
      this.stage.style.width = w + 'px';
      this.stage.style.height = h + 'px';
      this.world.style.transform = `translate(${pad - b.x}px, ${pad - b.y}px)`;
      if (this.paperKind !== 'plain') {
        this.paper.style.backgroundSize = `${this.gridSize}px ${this.gridSize}px`;
        this.paper.style.backgroundPosition = `${pad - b.x}px ${pad - b.y}px`;
      }
      this.hud.style.display = 'none';
      return { w, h };
    }

    get duration() {
      const last = Math.max(0, ...this.items.map((i) => i.end + (i.hasFill ? 0.35 : 0)));
      return Math.max(this.T ? this.T.duration : 0, last + 1);
    }

    render(t) {
      this.applyCamera(this.camAt(t));
      for (const it of this.items) it.update(t);
      if (this.capEl) this.renderCaptions(t);
      if (this.chs) this.renderChapters(t);
    }
  }

  // 给绘图方法创建的元素标上类型（自动检查的报告里用）；标注类元素本来就会和别的东西重叠
  const KINDS = { line: '线', polyline: '折线', curve: '曲线', path: '插画', sketch: '插画', arrow: '箭头', rect: '矩形', ellipse: '椭圆', circle: '圆', circleAround: '圈注', boxAround: '框注', underline: '下划线', strike: '划线', check: '对勾', cross: '叉', brace: '括号', vbrace: '括号', highlight: '荧光笔', dot: '圆点', angleMark: '角标', tickMark: '等长标记' };
  const ANNOT = new Set(['circleAround', 'boxAround', 'underline', 'strike', 'highlight', 'angleMark', 'tickMark']);
  for (const [m, label] of Object.entries(KINDS)) {
    const f = Board.prototype[m];
    Board.prototype[m] = function (...a) {
      const it = f.apply(this, a);
      if (it instanceof Item) { it.kind = label; it.annot = ANNOT.has(m); }
      return it;
    };
  }

  // ---------- 自动检查 ----------
  // 找出只有"动起来"才会暴露的问题：没画完就擦、停留太短、画在画面外、压住字幕、边画边移镜头、互相重叠……
  // 返回 [{ level: 'error'|'warn', t, src, what, msg }]
  Board.prototype.project = function (box, t, hud) {
    if (hud) return { ...box };
    const c = this.camAt(t);
    return { x: (box.x - c.x) * c.zoom + this.W / 2, y: (box.y - c.y) * c.zoom + this.H / 2, w: box.w * c.zoom, h: box.h * c.zoom };
  };
  Board.prototype.lint = function () {
    const out = [];
    const add = (level, t, it, msg) => out.push({ level, t: Math.round(t * 100) / 100, src: it ? it.src : '', what: it ? it.describe() : '', msg });
    const W = this.W, H = this.H, dur = this.duration;
    const fat = (r) => ({ x: r.x - 1, y: r.y - 1, w: r.w + 2, h: r.h + 2 }); // 细线的外框高度可能为 0
    const inter = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const gone = (it) => (it.exits.length ? Math.min(...it.exits.map((x) => x.at)) : Infinity);
    for (const it of this.items) {
      const done = it.done;
      // 1. 擦除时机
      for (const x of it.exits) {
        if (x.at <= it.start) add('error', it.start, it, '还没开始画就已经被擦掉，观众永远看不到');
        else if (x.at < done - 0.05) add('error', x.at, it, `还没画完就开始擦除（只画到 ${Math.round(((x.at - it.start) / (done - it.start)) * 100)}%）`);
        else if (x.at - done < 0.6) add('warn', x.at, it, `画完只停留 ${(x.at - done).toFixed(1)} 秒就被擦掉，观众来不及看`);
      }
      // 2. 超出视频时长
      if (it.start >= dur) add('error', it.start, it, '开始时间超出了视频总时长');
      else if (done > dur + 0.01) add('warn', done, it, '视频结束时还没画完');
      if (!it.box || it.start >= gone(it)) continue;
      // 3. 画的时候是否在画面内（o.crop = true 表示有意只露出一部分）
      if (!it.o.crop) {
        const t = Math.min(done, dur - 0.01);
        const r = fat(this.project(it.boxAt(t), t, it.o.hud));
        const area = Math.max(1, r.w * r.h);
        const visible = inter(r, { x: 0, y: 0, w: W, h: H }) / area;
        if (visible < 0.02) add('error', t, it, '画完的时候完全不在画面里（镜头没对准它）');
        else if (visible < 0.97) add('warn', t, it, `画完的时候有 ${Math.round((1 - visible) * 100)}% 在画面外，被裁掉了`);
        // 4a. 压住顶部章节进度条
        if (this.chapterZone && !it.annot && r.y < this.chapterZone && r.y + r.h > 0 && r.x < W - 60 && r.x + r.w > 60) {
          add('warn', t, it, `压到了顶部章节进度条（屏幕最上面 ${this.chapterZone} 像素）`);
        }
        // 4. 压住字幕区
        if (this.capEl && !it.annot && r.y + r.h > H - 140 && r.x < W - 260 && r.x + r.w > 260 && this.caps.some((c) => c.end > it.start && c.start < gone(it))) {
          add('warn', t, it, '压到了底部字幕区（屏幕最下面 140 像素）');
        }
      }
      // 5. 边画边移镜头
      if (!it.o.hud) {
        for (const m of this.moves) {
          const ov = Math.min(it.end, m.at + m.dur) - Math.max(it.start, m.at);
          if (ov > 0.3 && ov > 0.4 * it.dur) { add('warn', Math.max(it.start, m.at), it, `镜头还在移动时就开始画（重叠 ${ov.toFixed(1)} 秒），应该先移镜头再画`); break; }
        }
      }
    }
    // 6. 实体元素之间的重叠（o.overlap = true 表示有意叠放）
    const solid = this.items.filter((i) => i.box && !i.o.overlap && (['文字', '公式', '便签', '角色', '气泡'].includes(i.kind) || (i.kind === '插画' && i.hasFill)));
    for (let a = 0; a < solid.length; a++) {
      for (let b = a + 1; b < solid.length; b++) {
        const A = solid[a], B = solid[b];
        const t0 = Math.max(A.start, B.start), t1 = Math.min(gone(A), gone(B), dur);
        if (t1 <= t0) continue;
        if (!!A.o.hud !== !!B.o.hud) {
          // 固定在屏幕上的元素 vs 白板上的元素：按两者同时出现、镜头停稳时的位置比较
          const [hu, wo] = A.o.hud ? [A, B] : [B, A];
          const t = Math.min(t1 - 0.01, Math.max(t0, hu.done));
          const w = this.project(wo.boxAt(t), t), o = inter(hu.boxAt(t), w) / Math.max(1, w.w * w.h);
          if (o > 0.12) add('warn', t, hu, `固定在屏幕上，挡住了白板上的 ${wo.describe()}（${wo.src}）${Math.round(o * 100)}%`);
          continue;
        }
        // 元素会移动：在共存时段的开头、结尾和每次移动结束时，按当时的位置检查
        const times = [t0 + 0.01, t1 - 0.01, ...[A, B].flatMap((it) => it.moves.map((m) => m.at + m.dur)).filter((t) => t > t0 && t < t1)];
        let worst = 0, when = t0;
        for (const t of times) {
          const a = A.boxAt(t), c = B.boxAt(t);
          const r = inter(a, c) / (Math.min(a.w * a.h, c.w * c.h) || 1);
          if (r > worst) { worst = r; when = t; }
        }
        if (worst > 0.12) add('warn', when, B, `和 ${A.describe()}（${A.src}）重叠了 ${Math.round(worst * 100)}%`);
      }
    }
    // 8. 镜头"串场"：切到新区域时带到了别处的内容
    const frame = { x: 0, y: 0, w: W, h: H };
    const visAt = (it, t) => {
      if (it.o.hud || !it.box || t < it.start || t >= gone(it)) return 0;
      const r = fat(this.project(it.boxAt(t), t));
      return inter(r, frame) / Math.max(1, r.w * r.h);
    };
    const world = this.items.filter((i) => !i.o.hud && !i.o.crop && i.box);
    for (const m of this.moves) {
      if (m.dur <= 0) continue;
      const t0 = m.at - 0.01, t1 = m.at + m.dur + 0.01;
      // 8a. 镜头停下后，画面边缘露出半截之前画的东西
      for (const it of world) {
        if (it.start >= m.at) continue;
        const v = visAt(it, t1);
        if (v > 0.01 && v < 0.9) add('warn', t1, it, `镜头停下后，画面边缘露出了它的一部分（${Math.round(v * 100)}%）——像是上一段内容"串"进了这个镜头`);
      }
      // 8b. 镜头移动途中扫过了起点、终点都看不到的内容（中间隔着别的区域）
      const swept = world.filter((it) => visAt(it, t0) === 0 && visAt(it, t1) === 0 &&
        [0.25, 0.5, 0.75].some((k) => visAt(it, m.at + m.dur * k) > 0.05));
      if (swept.length) {
        const names = swept.slice(0, 3).map((i) => i.describe()).join('、');
        out.push({ level: 'warn', t: Math.round(m.at * 100) / 100, src: '', what: '镜头移动', msg: `移动途中扫过了别的区域的 ${swept.length} 个元素（${names}${swept.length > 3 ? ' 等' : ''}）。把区域按镜头路线依次排开，让每次只移到相邻区域；或者用 dur: 0 直接切过去` });
      }
    }
    // 7. 各元素自己的检查（例如角色指向的目标在画面外）
    for (const it of this.items) if (it.lint) it.lint(add);
    return out.sort((a, b) => a.t - b.t);
  };

  window.WB = {
    Board, COLORS, HL, NOTE, FONTS, board: (o) => new Board(o), unionBox,
    // 供扩展模块（如 character.js）使用的内部工具
    _: { Item, svgEl, col, smoothD, wobble, samplePathD, boxOf },
  };
})();
