// op.js: op-art style (one of the visual styles of bb-video's promo/; style notes in styles/op/STYLE.md). Load after promo.js.
// The visual grammar of 1960s op art: high-contrast stripes, concentric rings, checkerboards and spirals, bulged, squeezed and warped by "lenses" so the picture seems to move.
// The pattern is one WebGL canvas (a shader computes each pixel, antialiased), and every parameter can be keyframed over time; text and cards are plain DOM (automatic checks work as usual).
//
//   const Q = PROMO.op(F, { ink, paper, accent })
//   const f = Q.field(parent, { pattern: 'stripes', period, ... })   one moving op-art pattern → f.to(at, dur, {params}) / f.morph(at, dur, pattern) / f.lens(i, …) / f.lensTo(i, at, dur, …)
//     patterns: stripes (parallel stripes + waves) | rings (concentric circles) | checker (checkerboard) | spiral | rays (radial) | dots (grid of dots)
//   Q.word(parent, { at, until, text, size, x, y })                 big text filled with stripes (stripes flow inside the letters), outline + hard shadow
//   Q.blinds(element, { at, dur, angle, period, out })              venetian-blind reveal: the element grows out of thin slits (or is taken away)
//   Q.card(parent, { x, y, w, h, at, until })                       white card with a thick black frame, revealed by blinds
//   Q.wipe({ at, dur, angle, period, color })                   blinds transition: stripes thicken to cover the frame, then thin out to reveal the next scene
//
// Safety: full-screen black/white inversion no more than 3 times per second; stripe period at least 18px (1080p); stripes move at most 1/4 period per frame —
//   this avoids photosensitivity discomfort, and avoids moiré, stripes running backwards (wagon-wheel effect) and compression mush in the video. field clamps too-fine or too-fast parameters automatically and warns in the console.
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('op.js 要在 promo.js 之后加载', 'op.js must load after promo.js'));
  const { clamp, lerp } = window.EV;
  const { E, seg, set, el } = P;
  const f1 = (n) => Math.round(n * 10) / 10;
  const PAT = { stripes: 0, rings: 1, checker: 2, spiral: 3, rays: 4, dots: 5 };
  const rgb = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

  const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uT, uU, uTravel;
uniform int uPatA, uPatB; uniform float uMix;
uniform float uPeriod, uAmp, uWave, uSpeed, uTwist, uAngle, uDuty, uRays, uBands, uBandW;
uniform vec2 uCenter;
uniform vec3 uInk, uPaper; uniform vec3 uBand[4];
uniform vec4 uLens[8]; uniform int uNL;
out vec4 o;
const float PI = 3.14159265;
vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
// 透镜：半径内的点往中心"拉"（采样更靠近中心 = 图案被放大 = 鼓起来）；strength < 0 是挤压
vec2 lens(vec2 p) {
  for (int i = 0; i < 8; i++) {
    if (i >= uNL) break;
    vec4 L = uLens[i]; vec2 d = p - L.xy; float r = length(d);
    if (r < L.z && L.z > 0.0) { float k = 1.0 - (r / L.z) * (r / L.z); p = L.xy + d * (1.0 - L.w * k * k); }
  }
  return p;
}
// 每种图案返回一个"相位"（整数部分换一条），交给 stripe() 变成黑白（棋盘、圆点不走这里，见 value()）
float phase(int k, vec2 p, out float band) {
  vec2 c = p - uCenter; band = 0.0;
  if (k == 0) { vec2 q = rot(c, uAngle); band = floor(q.x / max(1.0, uBandW)); return (q.y + uAmp * sin(q.x * uWave + uTravel)) / uPeriod; }
  if (k == 1) { return length(c) / uPeriod - uTravel * 0.15 + uAmp * 0.01 * sin(atan(c.y, c.x) * uWave * 40.0); }
  if (k == 3) { float a = atan(c.y, c.x) / (2.0 * PI); return a * uTwist + length(c) / uPeriod - uTravel * 0.15; }
  if (k == 4) { float a = atan(c.y, c.x) / (2.0 * PI); return a * uRays + uTravel * 0.02 + uAmp * 0.002 * length(c); }
  return 0.0;
}
// 抗锯齿宽度：螺旋和放射在 atan 的分界处相位会跳一整圈，fwidth 在那里很大，会画出一道细线——这两种用解析的宽度
float aaw = 0.0;
float stripe(float ph) { float w = (aaw > 0.0 ? aaw : fwidth(ph) * 0.8) + 1e-4; float f = fract(ph); return smoothstep(uDuty - w, uDuty + w, f) * (1.0 - smoothstep(1.0 - w, 1.0, f)) + (1.0 - smoothstep(0.0, w, f)) * 0.0; }
float value(int k, vec2 p, out float band) {
  // 棋盘、圆点沿自己的对角线慢慢滑（和同心圆一样每单位路程走 0.15 个周期），speed 对它们也生效
  vec2 slide = vec2(0.106, 0.106) * uTravel;
  if (k == 2) { vec2 q = rot(p - uCenter, uAngle) / uPeriod + slide; float w = fwidth(q.x) * 0.8 + 1e-4; float a = smoothstep(0.5 - w, 0.5 + w, fract(q.x)), b = smoothstep(0.5 - w, 0.5 + w, fract(q.y)); band = 0.0; return a + b - 2.0 * a * b; }
  if (k == 5) { vec2 q = rot(p - uCenter, uAngle) / uPeriod + slide; vec2 g = fract(q) - 0.5; float d = length(g), r = uDuty * 0.5, w = fwidth(d) + 1e-4; band = 0.0; return 1.0 - smoothstep(r - w, r + w, d); }
  float ph = phase(k, p, band);
  float r = max(length(p - uCenter), 1.0);
  aaw = k == 3 ? (abs(uTwist) / (6.2832 * r) + 1.0 / uPeriod) * 0.9 : k == 4 ? (uRays / (6.2832 * r)) * 0.9 : 0.0;
  return stripe(ph);
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  p = lens(p);
  float bA, bB;
  float vA = value(uPatA, p, bA), vB = uMix > 0.0 ? value(uPatB, p, bB) : 0.0;
  // 换图案：新图案从中心以一个圆扩散出来（边缘干净，不是两层叠成一片灰）
  float R = uMix * length(uRes) * 0.75, dd = length(p - uCenter), w2 = 1.5;
  float v = uMix > 0.0 ? mix(vA, vB, 1.0 - smoothstep(R - w2, R + w2, dd)) : vA;
  vec3 ink = uInk;
  if (uBands > 0.5) { int i = int(mod(bA, uBands)); ink = i == 0 ? uBand[0] : i == 1 ? uBand[1] : i == 2 ? uBand[2] : uBand[3]; }
  o = vec4(mix(uPaper, ink, v), 1.0);
}`;
  const VERT = `#version 300 es
in vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

  function make(F, opt = {}) {
    const Q = { F };
    Q.ink = opt.ink ?? '#111111';
    Q.paper = opt.paper ?? '#F7F5F0';
    Q.accent = opt.accent ?? '#E8312A';
    Q.fonts = { head: opt.head ?? '"Unbounded", "Archivo Black", "Arial Black", sans-serif', body: opt.body ?? F.theme.fonts.sans };
    Q.line = F.px(opt.line ?? 6);
    const minPeriod = F.px(18);

    // ---------- Pattern canvas ----------
    // o: { pattern, period (stripe period, px), amp (wave amplitude px), wave (spatial frequency of the wave), speed, twist (how tightly the spiral winds), angle (degrees), duty (share of black 0–1),
    //      rays (number of rays), center: [x, y], bands: [colour…] (stripes split into coloured bands, at most 4), bandW (band width px), ink, paper, x, y, w, h, z, show: [a, b] }
    Q.field = (parent, o = {}) => {
      const W = o.w ?? F.W, H = o.h ?? F.H, ratio = window.devicePixelRatio || 1;
      const cv = el('canvas', `left:${f1(o.x ?? 0)}px;top:${f1(o.y ?? 0)}px;width:${f1(W)}px;height:${f1(H)}px;${o.z !== undefined ? `z-index:${o.z};` : ''}${o.css ?? ''}`, parent);
      cv.width = Math.round(W * ratio); cv.height = Math.round(H * ratio);
      const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
      if (!gl) throw new Error(M('欧普图案需要 WebGL2', 'op patterns need WebGL2'));
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(M('op 着色器：', 'op shader: ') + gl.getShaderInfoLog(s)); return s; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr); gl.useProgram(pr);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const U = (n) => gl.getUniformLocation(pr, n);
      const u = {}; ['uRes', 'uT', 'uU', 'uTravel', 'uPatA', 'uPatB', 'uMix', 'uPeriod', 'uAmp', 'uWave', 'uSpeed', 'uTwist', 'uAngle', 'uDuty', 'uRays', 'uBands', 'uBandW', 'uCenter', 'uInk', 'uPaper', 'uBand', 'uLens', 'uNL'].forEach((n) => (u[n] = U(n)));
      // Parameters (all keyframable): period / amp / wave / speed / twist / angle / duty / rays / cx / cy / bandW
      const p0 = { period: o.period ?? F.px(36), amp: o.amp ?? 0, wave: o.wave ?? 0.006, speed: o.speed ?? 1, twist: o.twist ?? 6, angle: o.angle ?? 0, duty: o.duty ?? 0.5, rays: o.rays ?? 48, cx: (o.center || [])[0] ?? W / 2, cy: (o.center || [])[1] ?? H / 2, bandW: o.bandW ?? W / 4 };
      const keys = [], morphs = [], lens = [], lensKeys = [];
      let patA = PAT[o.pattern ?? 'stripes'];
      if (patA === undefined) throw new Error(M(`没有这种欧普图案：${o.pattern}（有：${Object.keys(PAT).join(' / ')}）`, `No such op pattern: ${o.pattern} (available: ${Object.keys(PAT).join(' / ')})`));
      const bands = (o.bands || []).slice(0, 4).map(rgb);
      const paramsAt = (t) => { const s = { ...p0 }; for (const k of keys) { if (t <= k.at) break; const q = seg(t, k.at, k.at + k.dur, k.ease); for (const n in k.to) s[n] = lerp(s[n], k.to[n], q); } return s; };
      // Pattern switch: blend from the current pattern to the `to` pattern over dur
      const patAt = (t) => { let a = patA, b = patA, m = 0; for (const k of morphs) { if (t <= k.at) break; const q = seg(t, k.at, k.at + k.dur, k.ease); if (q >= 1) { a = k.to; b = k.to; m = 0; } else { b = k.to; m = q; } } return [a, b, m]; };
      const lensAt = (t) => lens.map((l0, i) => { const s = { ...l0 }; for (const k of lensKeys) { if (k.i !== i || t <= k.at) continue; const q = seg(t, k.at, k.at + k.dur, k.ease); for (const n in k.to) s[n] = lerp(s[n], k.to[n], q); } return s; });
      let warned = false;
      // distance the pattern has travelled = speed integrated over time (when speed is keyframed you can't use t × speed: while slowing down t is large and the product makes the phase suddenly run backwards and flash)
      const travel = (t) => { if (!keys.some((k) => 'speed' in k.to)) return t * p0.speed; const dt = 1 / 60; let acc = 0, prev = paramsAt(0).speed; for (let x = dt; x <= t; x += dt) { const v = paramsAt(x).speed; acc += (prev + v) * 0.5 * dt; prev = v; } return acc + prev * (t - Math.floor(t / dt) * dt); };
      const show = o.show ?? [-1, 1e9];
      const api = {
        el: cv, w: W, h: H,
        to(at, dur, to, ease = E.cubicInOut) { keys.push({ at, dur, to, ease }); keys.sort((a, b) => a.at - b.at); return api; },
        morph(at, dur, to, ease = E.cubicInOut) { const k = PAT[to]; if (k === undefined) throw new Error(M(`没有这种欧普图案：${to}`, `No such op pattern: ${to}`)); morphs.push({ at, dur, to: k, ease }); morphs.sort((a, b) => a.at - b.at); return api; },
        // Lens: x, y (canvas px), r (radius), s (strength: 0.5 = centre magnified 2×; negative = squeeze)
        lens(i, l) { lens[i] = { x: l.x ?? W / 2, y: l.y ?? H / 2, r: l.r ?? 0, s: l.s ?? 0 }; return api; },
        lensTo(i, at, dur, to, ease = E.cubicInOut) { lensKeys.push({ i, at, dur, to, ease }); lensKeys.sort((a, b) => a.at - b.at); return api; },
        at: paramsAt,
      };
      F.add((t) => {
        const on = t >= show[0] && t < show[1];
        set(cv, { display: on ? '' : 'none' });
        if (!on) return;
        const s = paramsAt(t), [a, b, m] = patAt(t), Ls = lensAt(t);
        // safety clamp: stripes must not be too thin
        if (s.period < minPeriod) { if (!warned) { console.warn(M(`op：条纹周期 ${s.period.toFixed(1)}px 太细（会闪、出摩尔纹），夹到 ${minPeriod.toFixed(0)}px`, `op: stripe period ${s.period.toFixed(1)}px is too fine (flicker, moiré); clamped to ${minPeriod.toFixed(0)}px`)); warned = true; } s.period = minPeriod; }
        gl.viewport(0, 0, cv.width, cv.height);
        gl.uniform2f(u.uRes, cv.width, cv.height);
        gl.uniform1f(u.uT, t); gl.uniform1f(u.uU, ratio); gl.uniform1f(u.uTravel, travel(t));
        gl.uniform1i(u.uPatA, a); gl.uniform1i(u.uPatB, b); gl.uniform1f(u.uMix, m);
        gl.uniform1f(u.uPeriod, s.period * ratio); gl.uniform1f(u.uAmp, s.amp * ratio); gl.uniform1f(u.uWave, s.wave / ratio); gl.uniform1f(u.uSpeed, s.speed);
        gl.uniform1f(u.uTwist, s.twist); gl.uniform1f(u.uAngle, (s.angle * Math.PI) / 180); gl.uniform1f(u.uDuty, s.duty); gl.uniform1f(u.uRays, s.rays);
        gl.uniform1f(u.uBands, bands.length); gl.uniform1f(u.uBandW, s.bandW * ratio);
        gl.uniform2f(u.uCenter, s.cx * ratio, s.cy * ratio);
        gl.uniform3fv(u.uInk, rgb(o.ink ?? Q.ink)); gl.uniform3fv(u.uPaper, rgb(o.paper ?? Q.paper));
        const bb = new Float32Array(12); bands.forEach((c, i) => bb.set(c, i * 3)); gl.uniform3fv(u.uBand, bb);
        const lv = new Float32Array(32); Ls.slice(0, 8).forEach((l, i) => lv.set([l.x * ratio, l.y * ratio, l.r * ratio, l.s], i * 4)); gl.uniform4fv(u.uLens, lv); gl.uniform1i(u.uNL, Math.min(8, Ls.length));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
      return api;
    };

    // ---------- Stripe text ----------
    // The fill of big text is flowing stripes (the letter outlines are thick black lines); on landing it grows out of thin slits (blinds).
    // o: { at, until, text, x, y (centre of the line), size (design size), angle (stripe angle), period (design size), colors: [stripe colour 1, stripe colour 2], speed, stroke, kind, font, w,
    //      plate (default true: sits on a paper-coloured plate; false = straight on the pattern — only do that on a flat background), plateBg }
    Q.word = (parent, o) => {
      const size = F.px(o.size ?? 180), until = o.until ?? 1e9, per = F.px(o.period ?? Math.max(10, (o.size ?? 180) * 0.09)), ang = o.angle ?? -45;
      const [c1, c2] = o.colors ?? [Q.accent, Q.ink];
      const box = el('div', `left:${f1((o.x ?? F.W / 2) - F.W)}px;width:${f1(2 * F.W)}px;top:${f1((o.y ?? F.H / 2) - size * 0.62)}px;text-align:center;white-space:nowrap;display:none;pointer-events:none;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      // by default it sits on a "plate" (paper colour, thick black frame, hard shadow): striped text on a striped background merges into one mess
      const plate = o.plate === false ? box : el('span', `position:relative;display:inline-block;padding:${f1(size * 0.08)}px ${f1(size * 0.22)}px ${f1(size * 0.12)}px;background:${o.plateBg ?? Q.paper};border:${f1(Q.line)}px solid ${Q.ink};box-shadow:${f1(F.px(14))}px ${f1(F.px(14))}px 0 ${Q.ink}`, box);
      const t = el('span', `position:relative;display:inline-block;font:${o.weight ?? 800} ${f1(size)}px/1.2 ${o.font ?? Q.fonts.head};letter-spacing:${o.spacing ?? '-.01em'};color:transparent;background-image:repeating-linear-gradient(${ang}deg, ${c1} 0 ${f1(per / 2)}px, ${c2} ${f1(per / 2)}px ${f1(per)}px);-webkit-background-clip:text;background-clip:text;-webkit-text-stroke:${f1(F.px(o.stroke ?? Math.max(3, (o.size ?? 180) * 0.03)))}px ${Q.ink};filter:drop-shadow(${f1(F.px(6))}px ${f1(F.px(6))}px 0 ${o.shadow ?? Q.ink})`, plate);
      t.textContent = o.text;
      F.text(t, o.kind ?? 'slam', o.text, o.at, until);
      if (o.sfx !== false) F.sfx(o.at, o.sfx ?? 'pulse', o.gain ?? 0.7, { size: 0.6 });
      Q.blinds(box, { at: o.at, dur: 0.35, angle: ang + 90, period: per * 2.2, until });
      let fit = null;
      F.add((tt) => {
        const on = tt >= o.at && tt < until;
        set(box, { display: on ? '' : 'none' });
        if (!on) return;
        // too wide shrinks automatically: measure the whole plate (text + plate margin + shadow); measuring only the text lets a long title plus its plate run out of frame
        // measured 0 = an outer layer is still hidden this frame (can't be measured): don't remember it, measure again next frame (remembering 1 would mean the text never shrinks and runs out of frame)
        if (fit === null) { const m = plate === box ? t.scrollWidth : plate.offsetWidth; if (m > 1) { const w = (m + (plate === box ? 0 : F.px(14))) * 1.03; fit = w > (o.w ?? F.W * 0.94) ? (o.w ?? F.W * 0.94) / w : 1; } }
        const d = ((tt - o.at) * (o.speed ?? 1) * per * 1.2) % per;   // stripes flow slowly (under 1.2 periods per second)
        set(t, { backgroundPosition: `${f1(d)}px 0px` });
        set(box, { transform: `scale(${(fit ?? 1).toFixed(4)})` });
      });
      return { el: box, text: t };
    };

    // ---------- Blinds reveal ----------
    // The element is covered by a row of thin slits that widen until it is fully shown (out: true does the reverse, taking it away). Uses a CSS mask; the element itself doesn't move.
    // o: { at, dur, angle (slit direction, degrees), period (slit spacing px), until (fully gone by this time: the exit starts 0.8×dur before until), ease }
    Q.blinds = (elx, o) => {
      const per = o.period ?? F.px(28), ang = o.angle ?? 45, d = o.dur ?? 0.4, until = o.until ?? 1e9;
      F.add((t) => {
        const qi = seg(t, o.at, o.at + d, o.ease ?? E.quartOut), qo = seg(t, until - d * 0.8, until, E.quartIn), k = Math.max(0, Math.min(qi, 1 - qo));
        if (k >= 0.999) { set(elx, { maskImage: 'none', webkitMaskImage: 'none' }); return; }
        const open = f1(per * k), m = `repeating-linear-gradient(${ang}deg, #000 0 ${open}px, transparent ${open}px ${f1(per)}px)`;
        set(elx, { maskImage: m, webkitMaskImage: m });
      });
    };

    // ---------- Card ----------
    // A card with a white ground, thick black frame and hard shadow bottom-right (UI, dialogue, numbers all go inside). o: { x, y, w, h, at, until, bg, angle (blinds direction), shadow }
    // until = the moment it is fully gone (matching what F.text registers): the exit animation starts about 0.36 s earlier, so text in the card registered with the same until lines up
    Q.card = (parent, o) => {
      const c = el('div', `left:${f1(o.x)}px;top:${f1(o.y)}px;width:${f1(o.w)}px;height:${f1(o.h)}px;box-sizing:border-box;background:${o.bg ?? '#FFFFFF'};border:${f1(Q.line)}px solid ${Q.ink};box-shadow:${f1(F.px(o.shadow ?? 14))}px ${f1(F.px(o.shadow ?? 14))}px 0 ${Q.ink};display:none;overflow:hidden;${o.z !== undefined ? `z-index:${o.z};` : ''}`, parent);
      const until = o.until ?? 1e9;
      Q.blinds(c, { at: o.at, dur: o.dur ?? 0.45, angle: o.angle ?? 0, period: F.px(o.period ?? 40), until });
      if (o.sfx !== false) F.sfx(o.at, o.sfx ?? 'sweep', 0.5, { dur: 0.4 });
      F.add((t) => set(c, { display: t >= o.at && t < until ? '' : 'none' }));
      return c;
    };

    // ---------- Blinds transition ----------
    // Stripes go from thin to thick until they cover the frame (fully covered at at + dur/2 — change scenes at this moment), then thin out to reveal the next scene. Returns the moment of full cover. o: { at, dur, angle, period, color, z }
    Q.wipe = (o) => {
      const d = o.dur ?? 0.7, per = F.px(o.period ?? 60), ang = o.angle ?? 30, c = o.color ?? Q.ink;
      const layer = el('div', `inset:0;pointer-events:none;display:none;z-index:${o.z ?? 850}`, F.stage);
      if (o.sfx !== false) F.sfx(o.at, o.sfx ?? 'sweep', 0.7, { dur: d });
      F.blur(o.at, o.at + d, 10);
      F.add((t) => {
        const on = t >= o.at && t < o.at + d;
        set(layer, { display: on ? '' : 'none' });
        if (!on) return;
        // hold full cover briefly in the middle (about 10% of the duration): the scene change happens here, so neither scene leaks through the slits
        const q = (t - o.at) / d, k = q < 0.45 ? E.quartIn(q / 0.45) : q > 0.55 ? 1 - E.quartOut((q - 0.55) / 0.45) : 1, w = f1(k >= 1 ? per + 2 : Math.max(0.5, per * k)), off = f1((t - o.at) * per * 1.5);
        set(layer, { background: `repeating-linear-gradient(${ang}deg, ${c} 0 ${w}px, transparent ${w}px ${f1(per)}px) ${off}px 0` });
      });
      return o.at + d / 2;
    };

    return P.infoKit ? P.infoKit(Q, {}) : Q;   // info-density check: info components register themselves when called (promo.js infoKit)
  }

  P.op = make;
})();
