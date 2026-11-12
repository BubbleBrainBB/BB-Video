// watercolour.js: the watercolour (水彩) style, one of bb-video's visual styles (style notes in styles/watercolour/STYLE.md). Load after promo.js.
// One frame: transparent washes on cold-press paper. No outlines: colour makes the shapes. Every wash is real glazing (layers multiply, so
// overlaps go darker and bare paper is the only white), its pigment gathers into a darker rim as it dries, settles into the paper's tooth
// (granulation), runs unevenly, and can carry a backrun. Paint arrives the way paint does: it blooms outward from where the brush touched,
// follows a stroke, or grows along a branch, darker and softer while wet, then dries lighter with a hard edge. Colour can be washed out again
// (lifted): a wet front crosses the wash and leaves a pale stain, never clean white. Information is told with paint: rows of dabs that lose
// their colour, swatches whose depth is the number, strokes pulled up from a baseline, a pencil-ringed close-up, glazes laid one on another.
// Rendering: one WebGL2 canvas. Each wash is a quad whose fragment shader reads a blurred coverage field (a soft distance to the shape's edge,
// rasterised once with canvas 2D) or an analytic ellipse, plus two seeded noise tiles (wash noise, paper tooth). Nothing is random per frame:
// the texture never boils, and the same frame always renders the same.
//
//   const W = PROMO.watercolour(F, { palette: 'reef' | 'meadow' | 'dusk' | 'earth', pigments, seed, tooth: 1, drift, captions, veil, fonts })
//   World units: 1 unit = 1 px of a 1080-high frame at zoom 1 (portrait: 1080 wide). y grows downward; (0, 0) is the middle of the sheet.
//   PIGMENTS (by role, the same names in every palette)   cool · deep · warm · hot · sun · leaf · dusk · earth · dark
//            mixes: 'warm+sun', 'cool+leaf'   (subtractive, like mixing on the palette)   W.colors.<role> = the CSS colour of a full-strength wash
//   WASHES   W.blob  W.ellipse  W.rect  W.poly  W.path  W.stroke  W.branch  W.dots  W.hills  W.letters
//            common options { x, y, rot, s, pigment, to (a second pigment the wash runs into), density (0.15 pale … 1 full … 1.5 deep),
//              edge: 'hard' | 'soft' | 'wet' | 'dry', grade: [from, to] + dir (deg), blooms (backruns: 0–2), z, at, until, in: group,
//              enter: 'bloom' | 'stroke' | 'grow' | 'soak' | 'none', from: [x, y] (where the brush touches, local), dir (deg), dur, exit: 'lift' | 'fade' }
//            at = the moment the brush touches; most of the pigment is down by at + dur × 0.6, the wash is dry about 1.5 s later
//   node.lift(at, { from: [x, y] (world), dur, leave })   wash the colour out      W.lift(at, { on: [nodes], from, dur, leave })   one front across many
//   node.repaint(at, { pigment, density, enter … })       paint the same shape again (a glaze, colour coming back)
//   node.to(at, { x, y, rot, s, density }, dur, ease)     node.sway({ rot, x, y, period, phase })
//   W.group({ x, y, at, stagger, clip: r })  → a node with the same factories (.blob, .stroke …) for children in local coordinates
//   PAINT    W.gouache: true on any wash = opaque body colour over what is below (highlights, light rays)   W.pencil({ pts | d, w })   W.rays   W.splatter
//   INFO     W.dabs (a counted field of dabs: a share loses or takes colour)   W.swatches (a row of chips whose depth is the value)
//            W.bars (strokes pulled up from a baseline)   W.inset (a pencil-ringed close-up)   W.label (words with a pencil leader)   W.number
//   TEXT     W.text(text, { x, y, size, tone, weight, at, until, enter: 'soak' | 'rise' | 'none', align, wrap })   (DOM: the checks see it)
//   CAMERA   W.cam(t, view)   W.move(a, b, view, ease)   W.page(at, { dur, dir, view })   view = { x, y, z } | { on: node | [nodes] | box, pad, dx, dy }
//   WHOLE    W.L(landscape, portrait)   W.camAt(t)   W.box(node, t)
// Sounds the runtime emits (styles/watercolour/sound.js): bloom, brush, lift, page, pencil, dab, tick.
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('watercolour.js 要在 promo.js 之后加载', 'watercolour.js must load after promo.js'));
  const { E, set, el, frameT } = P;
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, q) => a + (b - a) * q;
  const sm = (q) => { q = cl(q); return q * q * (3 - 2 * q); };
  const DEG = Math.PI / 180;
  const f1 = (n) => Math.round(n * 10) / 10;
  const hex = (h) => { const s = String(h).replace('#', ''); return s.length === 3 ? s.split('').map((c) => parseInt(c + c, 16)) : [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
  const toHex = (v) => '#' + v.map((x) => Math.round(cl(x, 0, 255)).toString(16).padStart(2, '0')).join('');
  const rngOf = (s) => window.EV.rng(s);
  const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  // Palettes: a handful of pigments each, named by role. c = the colour of a full-strength wash on white, g = how much it granulates
  // (settles into the paper's tooth), s = how much it stains (what a lift leaves behind). Darks are mixed, never black.
  const PALS = {
    reef: { paper: '#f8f4ea', cool: { c: '#3db0b8', g: 0.35, s: 0.3 }, deep: { c: '#2c5a9e', g: 0.75, s: 0.25 }, warm: { c: '#ee6f55', g: 0.2, s: 0.45 }, hot: { c: '#d9437c', g: 0.1, s: 0.55 }, sun: { c: '#f0b23a', g: 0.15, s: 0.3 }, leaf: { c: '#6fa35a', g: 0.4, s: 0.3 }, dusk: { c: '#8562b0', g: 0.5, s: 0.35 }, earth: { c: '#a8704a', g: 0.85, s: 0.2 }, dark: { c: '#35405c', g: 0.6, s: 0.4 } },
    meadow: { paper: '#f8f5ea', cool: { c: '#6fb2d6', g: 0.55, s: 0.2 }, deep: { c: '#3d6fa8', g: 0.7, s: 0.25 }, warm: { c: '#e88a4a', g: 0.25, s: 0.4 }, hot: { c: '#d9506a', g: 0.1, s: 0.55 }, sun: { c: '#f2c644', g: 0.15, s: 0.3 }, leaf: { c: '#5f9c4c', g: 0.4, s: 0.3 }, dusk: { c: '#9a78b8', g: 0.5, s: 0.3 }, earth: { c: '#9c6b43', g: 0.85, s: 0.2 }, dark: { c: '#3a4a45', g: 0.6, s: 0.4 } },
    dusk: { paper: '#f6f1e8', cool: { c: '#5b86c4', g: 0.6, s: 0.25 }, deep: { c: '#34407e', g: 0.75, s: 0.3 }, warm: { c: '#ee8452', g: 0.25, s: 0.4 }, hot: { c: '#d44a7e', g: 0.1, s: 0.55 }, sun: { c: '#f3b84a', g: 0.15, s: 0.3 }, leaf: { c: '#5d8a6a', g: 0.45, s: 0.3 }, dusk: { c: '#7a55a8', g: 0.5, s: 0.4 }, earth: { c: '#93604a', g: 0.85, s: 0.2 }, dark: { c: '#2f3252', g: 0.6, s: 0.45 } },
    earth: { paper: '#f7f2e6', cool: { c: '#7fa3b4', g: 0.7, s: 0.2 }, deep: { c: '#4a6688', g: 0.8, s: 0.25 }, warm: { c: '#c9743f', g: 0.8, s: 0.25 }, hot: { c: '#b8493f', g: 0.4, s: 0.45 }, sun: { c: '#d9a441', g: 0.6, s: 0.25 }, leaf: { c: '#7d8f4f', g: 0.6, s: 0.3 }, dusk: { c: '#7f6a8c', g: 0.6, s: 0.3 }, earth: { c: '#8a5a3c', g: 0.9, s: 0.2 }, dark: { c: '#3d3f47', g: 0.7, s: 0.4 } },
  };
  const ROLES = ['cool', 'deep', 'warm', 'hot', 'sun', 'leaf', 'dusk', 'earth', 'dark'];

  // ---------- shaders ----------
  const VERT = `#version 300 es
  in vec2 aUV; uniform vec4 uBox; uniform mat3 uMat; uniform vec4 uCam; uniform vec2 uRes; out vec2 vP; out vec2 vW;
  void main() { vP = uBox.xy + aUV * uBox.zw; vec3 w = uMat * vec3(vP, 1.0); vW = w.xy; vec2 s = (vW - uCam.xy) * uCam.z + uRes * 0.5; gl_Position = vec4(s.x / uRes.x * 2.0 - 1.0, 1.0 - s.y / uRes.y * 2.0, 0.0, 1.0); }`;
  const FRAG = `#version 300 es
  precision highp float;
  in vec2 vP; in vec2 vW; out vec4 o;
  uniform int uMode, uKind;                    // mode: 0 paper, 1 wash (multiplies), 2 body colour (covers), 3 bare paper laid over (covers, keeps the tooth)   kind: 0 field, 1 ellipse
  uniform sampler2D uField, uNoise, uTooth;
  uniform vec4 uQuad; uniform vec2 uRad; uniform float uSpread, uToothScale, uDry, uPar, uPool;
  uniform vec3 uAbsA, uAbsB, uPaper, uSeed;
  uniform vec4 uDens;                          // density, unevenness, granulation, pigment-mix noise
  uniform vec4 uEdge;                          // soft (dry), soft (wet), wobble, feather
  uniform vec4 uRim;                           // gain, width, creep, dry-brush
  uniform vec4 uGrade;                         // dir x, dir y (per unit), density from, to
  uniform vec2 uMix;                           // pigment mix from, to (along the grade direction)
  uniform vec4 uRev, uRevO;                    // mode (0 none 1 radial 2 linear 3 param 4 soak), elapsed, dur, feather s | origin, R or dir / L
  uniform vec2 uRevN;                          // front noise, front power
  uniform vec4 uLift, uLiftO;                  // elapsed, dur, leave, on | origin (world), R, power
  uniform vec4 uClip;                          // centre (world), r, on
  uniform vec4 uBloom[2];                      // backruns: centre (local), r, strength
  void main() {
    float tooth = texture(uTooth, vW / uToothScale).r;
    vec4 wn = texture(uNoise, vW / 910.0 + 0.13);
    if (uMode == 0) {
      float fib = smoothstep(0.985, 1.0, texture(uNoise, vW / 300.0).a) * 0.05;
      o = vec4(uPaper * (1.0 - 0.035 * uPar * (tooth - 0.5) - 0.03 * (wn.r - 0.5) - 0.012 * (wn.g - 0.5) - fib), 1.0); return;
    }
    vec2 q = (vP + uSeed.xy) / 720.0;
    vec4 a = texture(uNoise, q), b = texture(uNoise, q * 2.7 + 0.37);
    float nLow = a.r * 0.65 + b.r * 0.35 - 0.5, nMid = a.g * 0.6 + b.g * 0.4 - 0.5, nFine = a.b * 0.5 + b.b * 0.5 - 0.5;
    float sd, par = 0.0;
    if (uKind == 1) { sd = (1.0 - length(vP / uRad)) * min(uRad.x, uRad.y); }
    else { vec4 f = texture(uField, (vP - uQuad.xy) / uQuad.zw); sd = (f.r - 0.5) * 2.5066 * uSpread; par = f.g; }
    // the paint arriving: how long ago the front passed this point
    float since = uRev.y;
    if (uRev.x > 0.5) {
      float fr = uRev.x < 1.5 ? length(vP - uRevO.xy) / uRevO.z : uRev.x < 2.5 ? dot(vP - uRevO.xy, uRevO.zw) : uRev.x < 3.5 ? par : 0.5;
      fr = max(0.0, fr + (nLow * 1.1 + nMid * 0.28) * uRevN.x);
      since = uRev.y - uRev.z * pow(fr, uRevN.y);
    }
    float reveal = smoothstep(0.0, uRev.w, since);
    float wet = 1.0 - smoothstep(uDry * 0.25, uDry, since);
    sd += nLow * uEdge.z + nMid * uEdge.w + nFine * uEdge.w * 0.35 - wet * uRim.z;
    float soft = mix(uEdge.x, uEdge.y, wet);
    float cov = smoothstep(-soft, soft, sd);
    if (uRim.w > 0.0) cov *= smoothstep(-0.07, 0.07, tooth - 0.5 + nMid * 0.45 + nFine * 0.3 + (0.5 - uRim.w * (0.75 + 0.6 * par)) * 0.5);
    float rim = exp(-max(sd, 0.0) / (uRim.y * (0.6 + 0.9 * (nMid + 0.5)))) * (1.0 - wet) * (0.35 + 1.3 * (nLow + 0.5));   // uneven along its length, never an even inner glow
    float g = clamp(dot(vP - (uQuad.xy + uQuad.zw * 0.5), uGrade.xy) + 0.5, 0.0, 1.0);
    float dens = uDens.x * cov * reveal * mix(uGrade.z, uGrade.w, g);
    dens *= 1.0 + uRim.x * rim + uPool * smoothstep(0.7, 1.0, par) * (0.6 + nMid);
    dens *= max(0.0, 1.0 + uDens.y * (nLow * 1.5 + nMid * 0.8));
    dens *= max(0.0, 1.0 + uDens.z * ((0.5 - tooth) * 1.5 + 0.8 * smoothstep(0.6, 0.86, 1.0 - tooth)) * (0.45 + 1.1 * (nLow + 0.5)));   // granulation: specks in the valleys, not even noise
    dens *= 1.0 + 0.28 * wet + 0.35 * exp(-max(since, 0.0) / 0.14) * step(0.5, uRev.x);
    for (int i = 0; i < 2; i++) { vec4 B = uBloom[i]; if (B.w <= 0.0) continue; vec2 dv = vP - B.xy; float an = atan(dv.y, dv.x); float bd = length(dv) * (1.0 + 0.04 * sin(an * 7.0 + B.z) + 0.03 * sin(an * 11.0 + B.x * 0.05) + 0.02 * sin(an * 17.0 + B.y * 0.05)) + nLow * B.z * 0.5 + nMid * B.z * 0.28; dens *= 1.0 - 0.2 * B.w * smoothstep(B.z, B.z * 0.5, bd); dens *= 1.0 + 0.38 * B.w * (0.5 + nMid + 0.5) * exp(-pow((bd - B.z) / (B.z * 0.04 + 1.0), 2.0)); }
    if (uLift.w > 0.5) {
      float fl = max(0.0, length(vW - uLiftO.xy) / uLiftO.z + (wn.g - 0.5) * 0.45 + (wn.r - 0.5) * 0.3);
      float sl = uLift.x - uLift.y * pow(fl, uLiftO.w);
      float lifted = smoothstep(0.0, 0.55, sl);
      float stain = uLift.z * max(0.0, 1.0 + 1.6 * (wn.b - 0.5) + 1.2 * (tooth - 0.5));
      dens = mix(dens, dens * stain, lifted);
      dens *= 1.0 + 0.5 * exp(-sl * sl / 0.05) * step(sl, uLift.y * 1.5);
    }
    if (uClip.w > 0.5) dens *= smoothstep(uClip.z, uClip.z - 5.0, length(vW - uClip.xy) + (wn.g - 0.5) * 7.0);
    vec3 ab = mix(uAbsA, uAbsB, clamp(mix(uMix.x, uMix.y, g) + nLow * uDens.w, 0.0, 1.0));
    if (uMode == 3) { float fib = smoothstep(0.985, 1.0, texture(uNoise, vW / 300.0).a) * 0.05; o = vec4(uPaper * (1.0 - 0.035 * uPar * (tooth - 0.5) - 0.03 * (wn.r - 0.5) - 0.012 * (wn.g - 0.5) - fib), clamp(dens, 0.0, 1.0)); return; }
    if (uMode == 2) { o = vec4(exp(-ab), clamp(dens, 0.0, 1.0)); return; }
    o = vec4(exp(-dens * ab), 1.0);
  }`;

  P.watercolour = function (F, opt = {}) {
    const Wd = F.W, H = F.H, PT = F.portrait, U = F.px(1);
    const seed0 = hashStr(opt.seed ?? document.title ?? 'watercolour');
    const pal = { ...(PALS[opt.palette] || PALS.reef) };
    for (const [k, v] of Object.entries(opt.pigments || {})) pal[k] = typeof v === 'string' ? (k === 'paper' ? v : { ...(pal[k] || { g: 0.4, s: 0.35 }), c: v }) : { ...(pal[k] || {}), ...v };
    const FONT = { serif: '"Noto Serif SC", "Songti SC", Georgia, serif', sans: '"Noto Sans SC", "PingFang SC", sans-serif', ...(opt.fonts || {}) };
    const W = {};
    W.L = (l, p) => (PT ? p : l);

    // ---------- pigments ----------
    const absOf = (c) => hex(c).map((v) => -Math.log(Math.max(0.02, v / 255)));
    const raw = new Set(), pigMemo = new Map();
    const pig = (name) => {
      if (name == null) name = 'cool';
      if (typeof name === 'object' && name.abs) return name;
      if (pigMemo.has(name)) return pigMemo.get(name);
      let r;
      if (/^#/.test(name)) { raw.add(name); r = { abs: absOf(name), g: 0.4, s: 0.35 }; }
      else if (name === 'paper') r = { abs: absOf(pal.paper), g: 0, s: 0 };
      else if (name.includes('+')) { const ps = name.split('+').map((x) => pig(x.trim())); r = { abs: [0, 1, 2].map((i) => ps.reduce((s2, p) => s2 + p.abs[i], 0) / ps.length * 1.12), g: Math.max(...ps.map((p) => p.g)), s: ps.reduce((s2, p) => s2 + p.s, 0) / ps.length }; }
      else { const p = pal[name]; if (!p || !p.c) throw new Error(M(`没有这种颜料：${name}（有：${ROLES.join(' / ')}，可以用 'warm+sun' 调色）`, `No such pigment: ${name} (available: ${ROLES.join(' / ')}; mix with 'warm+sun')`)); r = { abs: absOf(p.c), g: p.g ?? 0.4, s: p.s ?? 0.35 }; }
      pigMemo.set(name, r); return r;
    };
    const cssOf = (name, d = 1) => toHex(pig(name).abs.map((a) => Math.exp(-a * d) * 255));
    W.colors = { paper: pal.paper }; for (const k of ROLES) W.colors[k] = cssOf(k);
    W.css = cssOf;
    const INK = cssOf('dark', 1.7);

    // ---------- canvas + GL ----------
    const ratio = window.devicePixelRatio || 1;
    const cv = el('canvas', `left:0;top:0;width:${Wd}px;height:${H}px;z-index:1;pointer-events:none`, F.stage);
    cv.width = Math.round(Wd * ratio); cv.height = Math.round(H * ratio); cv.dataset.motion = 'skip';
    const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, alpha: false });
    if (!gl) throw new Error(M('水彩风格需要 WebGL2', 'the watercolour style needs WebGL2'));
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(M('水彩着色器：', 'watercolour shader: ') + gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(M('水彩着色器：', 'watercolour shader: ') + gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'aUV'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {}; ['uBox', 'uMat', 'uCam', 'uRes', 'uMode', 'uKind', 'uField', 'uNoise', 'uTooth', 'uQuad', 'uRad', 'uSpread', 'uToothScale', 'uDry', 'uPar', 'uPool', 'uAbsA', 'uAbsB', 'uPaper', 'uSeed', 'uDens', 'uEdge', 'uRim', 'uGrade', 'uMix', 'uRev', 'uRevO', 'uRevN', 'uLift', 'uLiftO', 'uClip', 'uBloom'].forEach((n) => (u[n] = gl.getUniformLocation(pr, n)));
    const uBl = [gl.getUniformLocation(pr, 'uBloom[0]'), gl.getUniformLocation(pr, 'uBloom[1]')];
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    const texOf = (src, w, h, repeat) => {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      if (src instanceof Uint8Array) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, src); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, repeat ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      if (repeat) gl.generateMipmap(gl.TEXTURE_2D);
      return t;
    };
    // wash noise: three periodic value-noise octaves (r: 4 cells a tile, g: 16, b: 64) and white noise (a)
    const noiseTex = (() => {
      const N = 240, d = new Uint8Array(N * N * 4), R = rngOf(seed0 ^ 0x51f), acc = new Float32Array(N * N);
      // each channel sums three lattices of different cell counts (240 has many divisors): no single grid shows when a front is thresholded
      [[3, 5, 8], [12, 16, 24], [40, 60, 80]].forEach((set, ch) => { acc.fill(0); set.forEach((cells, li) => { const lat = Array.from({ length: cells * cells }, () => R()), cs = N / cells, wgt = [0.5, 0.3, 0.2][li]; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const gx = ((x + li * 37) % N) / cs, gy = y / cs, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = sm(gx - x0), fy = sm(gy - y0), at = (i, j) => lat[(j % cells) * cells + (i % cells)]; acc[y * N + x] += wgt * lerp(lerp(at(x0, y0), at(x0 + 1, y0), fx), lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), fx), fy); } }); let lo = 1, hi = 0; for (let i = 0; i < N * N; i++) { lo = Math.min(lo, acc[i]); hi = Math.max(hi, acc[i]); } for (let i = 0; i < N * N; i++) d[i * 4 + ch] = Math.round(255 * (acc[i] - lo) / (hi - lo)); });
      for (let i = 0; i < N * N; i++) d[i * 4 + 3] = Math.round(R() * 255);
      return texOf(d, N, N, true);
    })();
    // paper tooth: the bumps of cold-press paper (white noise smoothed twice, spread to the full range, a slow undulation under it)
    const TOOTH = 512;
    const toothTex = (() => {
      const N = TOOTH, R = rngOf(seed0 ^ 0x7007); let a = new Float32Array(N * N), b = new Float32Array(N * N);
      for (let i = 0; i < N * N; i++) a[i] = R();
      for (let pass = 0; pass < 3; pass++) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += a[((y + dy + N) % N) * N + ((x + dx + N) % N)]; b[y * N + x] = s / 9; } [a, b] = [b, a]; }
      let lo = 1, hi = 0; for (let i = 0; i < N * N; i++) { lo = Math.min(lo, a[i]); hi = Math.max(hi, a[i]); }
      const d = new Uint8Array(N * N * 4); for (let i = 0; i < N * N; i++) { const v = Math.round(255 * cl((a[i] - lo) / (hi - lo))); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
      return texOf(d, N, N, true);
    })();
    gl.uniform1i(u.uField, 0); gl.uniform1i(u.uNoise, 1); gl.uniform1i(u.uTooth, 2);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, noiseTex); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, toothTex); gl.activeTexture(gl.TEXTURE0);
    const TOOTH_K = opt.tooth ?? 1;

    // ---------- nodes ----------
    const nodes = [], groups = [];
    let ord = 0, sorted = null;
    const EDGE = {
      // soft: half-width of the edge in units once dry / while wet; wobble, feather: how far noise pushes the edge; rim: pigment gathered at the edge
      hard: (sz) => ({ sd: 0.9, sw: cl(sz * 0.05, 3, 12), wob: cl(sz * 0.03, 1.2, 8), fea: cl(sz * 0.016, 0.9, 3.5), rim: 0.6, rw: cl(sz * 0.022, 1.8, 6), creep: cl(sz * 0.02, 1, 6), dry: 0 }),
      soft: (sz) => ({ sd: cl(sz * 0.06, 2.5, 26), sw: cl(sz * 0.11, 5, 44), wob: cl(sz * 0.05, 2, 20), fea: cl(sz * 0.03, 1.5, 9), rim: 0.22, rw: cl(sz * 0.06, 4, 18), creep: cl(sz * 0.03, 1, 10), dry: 0 }),
      wet: (sz) => ({ sd: cl(sz * 0.15, 6, 80), sw: cl(sz * 0.22, 9, 110), wob: cl(sz * 0.12, 5, 60), fea: cl(sz * 0.07, 3, 26), rim: 0, rw: 10, creep: cl(sz * 0.05, 2, 20), dry: 0 }),
      dry: (sz) => ({ sd: 0.8, sw: 1.6, wob: cl(sz * 0.015, 0.6, 4), fea: cl(sz * 0.012, 0.6, 2.5), rim: 0.15, rw: 2.5, creep: 0, dry: 0.5 }),
    };
    const kv = (n, name, t, base) => { let v = base; for (const k of n.keys) { if (k.to[name] === undefined || t <= k.at) continue; v = lerp(v, k.to[name], k.ease(cl((t - k.at) / k.dur))); } return v; };
    const stateOf = (n, t) => {
      const p = n.p; let x = kv(n, 'x', t, typeof p.x === 'function' ? p.x(t) : p.x ?? 0), y = kv(n, 'y', t, typeof p.y === 'function' ? p.y(t) : p.y ?? 0), rot = kv(n, 'rot', t, p.rot ?? 0), s = kv(n, 's', t, p.s ?? 1);
      for (const w of n.sways) { const ph = Math.sin((t / w.period + w.phase) * Math.PI * 2); x += (w.x ?? 0) * ph; y += (w.y ?? 0) * Math.sin((t / w.period + w.phase + 0.25) * Math.PI * 2); rot += (w.rot ?? 0) * ph; }
      return { x, y, rot, s, sx: kv(n, 'sx', t, p.sx ?? 1), sy: kv(n, 'sy', t, p.sy ?? 1) };
    };
    // local → world as [a, b, c, d, e, f] (x' = a x + c y + e, y' = b x + d y + f)
    const matOf = (n, t) => {
      const st = stateOf(n, t), co = Math.cos(st.rot * DEG), si = Math.sin(st.rot * DEG), kx = st.s * st.sx, ky = st.s * st.sy;
      const m = [co * kx, si * kx, -si * ky, co * ky, st.x, st.y];
      if (!n.parent) return m;
      const q = matOf(n.parent, t);
      return [q[0] * m[0] + q[2] * m[1], q[1] * m[0] + q[3] * m[1], q[0] * m[2] + q[2] * m[3], q[1] * m[2] + q[3] * m[3], q[0] * m[4] + q[2] * m[5] + q[4], q[1] * m[4] + q[3] * m[5] + q[5]];
    };
    const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    const localBox = (n) => { if (n.bbox) return n.bbox; let b = null; for (const k of n.kids) { const kb = localBox(k); if (!kb) continue; const m = matOf({ ...k, parent: null }, k.at > 0 ? k.at + 0.01 : 0); for (const [x, y] of [[kb.x0, kb.y0], [kb.x1, kb.y0], [kb.x0, kb.y1], [kb.x1, kb.y1]]) { const [wx, wy] = apply(m, x, y); b = b ? { x0: Math.min(b.x0, wx), y0: Math.min(b.y0, wy), x1: Math.max(b.x1, wx), y1: Math.max(b.y1, wy) } : { x0: wx, y0: wy, x1: wx, y1: wy }; } } return b || { x0: -1, y0: -1, x1: 1, y1: 1 }; };
    const wbox = (n, t) => { if (n && n.x0 !== undefined) return { x: n.x0, y: n.y0, w: n.x1 - n.x0, h: n.y1 - n.y0 }; if (n && n.w !== undefined && n.kind === undefined) return n; const b = localBox(n), m = matOf(n, t ?? (n.at > 0 ? n.at + 0.01 : 0)); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]]) { const [wx, wy] = apply(m, x, y); x0 = Math.min(x0, wx); y0 = Math.min(y0, wy); x1 = Math.max(x1, wx); y1 = Math.max(y1, wy); } return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
    W.box = wbox;
    // the front of a stroke crossing a box in direction deg: [origin x, origin y, dir x / length, dir y / length]
    const strokeRev = (b, deg) => { const d = deg * DEG, dx = Math.cos(d), dy = Math.sin(d), pr2 = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].map(([x, y]) => x * dx + y * dy), lo = Math.min(...pr2), L = Math.max(...pr2) - lo || 1; return [dx * lo, dy * lo, dx / L, dy / L]; };
    const SND = { bloom: 'bloom', soak: 'bloom', stroke: 'brush', grow: 'brush' };
    const sounds = [];

    const make = (kind, o, shape) => {
      const parent = o.in || null, i = parent ? parent.kids.length : 0;
      const n = { kind, p: o, parent, kids: [], keys: [], sways: [], ord: ord++, z: o.z ?? (parent ? parent.z : 0), lifts: null };
      n.at = o.at ?? (parent ? parent.at + (parent.p.stagger ?? 0) * i : 0);
      n.until = Math.min(o.until ?? 1e9, parent ? parent.until : 1e9);
      n.seed = hashStr(o.seed ?? `${kind}:${n.ord}`) ^ seed0;
      if (parent) parent.kids.push(n);
      n.to = (at, to, dur = 0.8, ease = E.cubicInOut) => { n.keys.push({ at, to, dur, ease }); n.keys.sort((a, b) => a.at - b.at); return n; };
      n.sway = (w = {}) => { n.sways.push({ period: w.period ?? 5, phase: w.phase ?? rngOf(n.seed ^ 77)(), ...w }); return n; };
      n.lift = (at, l = {}) => { W.lift(at, { ...l, on: n }); return n; };
      if (!shape) return n;
      // ---- a wash ----
      Object.assign(n, shape);          // { analytic: [rx, ry] } | { draw(ctx), param(ctx), bbox, thick }
      const b = n.bbox, size = Math.max(4, Math.min(b.x1 - b.x0, b.y1 - b.y0)), big = Math.max(b.x1 - b.x0, b.y1 - b.y0);
      const thick = n.thick ?? size;
      const ed = { ...(EDGE[o.edge ?? 'hard'] || EDGE.hard)(thick) };
      for (const k of ['rim', 'wob', 'fea', 'creep']) if (o[k] !== undefined) ed[k] = o[k];
      if (o.soft !== undefined) { ed.sd = o.soft; ed.sw = Math.max(ed.sw, o.soft * 1.5); }
      n.ed = ed;
      n.pA = pig(o.pigment ?? 'cool'); n.pB = o.to ? pig(o.to) : n.pA;
      n.mode = o.gouache ? (o.pigment === 'paper' ? 3 : 2) : 1;
      n.density = o.density ?? (o.gouache ? 0.9 : 0.6);
      n.uneven = o.uneven ?? (o.gouache ? 0.12 : shape.param ? 0.42 : 0.24); n.gran = (o.grain ?? lerp(n.pA.g, n.pB.g, 0.5)) * (o.gouache ? 0.2 : 0.5) * TOOTH_K;
      n.mixN = o.to ? (o.mixNoise ?? 0.9) : 0; n.pool = o.pool ?? (shape.param && !o.gouache ? 0.45 : 0);
      const gd = (o.dir ?? 90) * DEG, gl2 = Math.abs(Math.cos(gd)) * (b.x1 - b.x0) + Math.abs(Math.sin(gd)) * (b.y1 - b.y0) || 1;
      n.grade = [Math.cos(gd) / gl2, Math.sin(gd) / gl2, ...(o.grade || [1, 1])]; n.mix = o.to ? (o.mix || [0, 1]) : [0, 0];
      const R = rngOf(n.seed);
      n.noiseO = [R() * 5000, R() * 5000];
      n.blooms = Array.from({ length: Math.min(2, o.blooms ?? 0) }, () => [lerp(b.x0, b.x1, 0.25 + R() * 0.5), lerp(b.y0, b.y1, 0.25 + R() * 0.5), size * (0.07 + R() * 0.08), 0.6 + R() * 0.4]);
      // how it arrives
      const enter = o.enter ?? (n.at > 0 ? (shape.param ? 'grow' : 'bloom') : 'none');
      n.enter = enter;
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      if (enter === 'bloom') { const fr = o.from || [cx + (R() - 0.5) * (b.x1 - b.x0) * 0.3, cy + (R() - 0.5) * (b.y1 - b.y0) * 0.3]; const far = Math.max(...[[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].map(([x, y]) => Math.hypot(x - fr[0], y - fr[1]))); n.rev = { mode: 1, o: [fr[0], fr[1], far * 0.92, 0], noise: o.frontNoise ?? 0.42, pow: 2, dur: o.dur ?? cl(0.5 + big / 700, 0.6, 2.6), fea: 0.22 }; }
      else if (enter === 'stroke') { const ro = strokeRev(b, o.dir ?? 0); n.rev = { mode: 2, o: ro, noise: o.frontNoise ?? 0.16, pow: 1, dur: o.dur ?? cl(0.35 + 1 / Math.hypot(ro[2], ro[3]) / 1400, 0.4, 1.8), fea: 0.1 }; }
      else if (enter === 'grow') { n.rev = { mode: shape.param ? 3 : 1, o: [cx, b.y1, Math.hypot(b.x1 - b.x0, b.y1 - b.y0), 0], noise: o.frontNoise ?? 0.06, pow: 1, dur: o.dur ?? cl(0.5 + big / 600, 0.6, 2.4), fea: 0.12 }; }
      else if (enter === 'soak') { n.rev = { mode: 4, o: [0, 0, 1, 0], noise: 1.2, pow: 1, dur: o.dur ?? 1.2, fea: 0.5 }; }
      else n.rev = null;
      n.dry = o.dry ?? 1.5;
      n.exit = o.exit ?? 'lift'; n.outDur = o.outDur ?? 1.1;
      n.par = o.par ?? 1;
      if (n.rev && n.at > 0 && o.sfx !== false && (!parent || o.sfx)) sounds.push([n.at, SND[enter] ?? 'bloom', n.rev.dur, o.gain]);
      n.repaint = (at, r = {}) => { const c = make(kind, { ...o, lifted: undefined, ...r, at, in: parent, seed: r.seed ?? `${n.seed}:re` }, shape); c._field = n; return c; };
      nodes.push(n); sorted = null;
      return n;
    };
    const factories = {};
    const addFactories = (g) => { for (const k of Object.keys(factories)) g[k] = (o = {}) => factories[k]({ ...o, in: g }); g.group = (o = {}) => W.group({ ...o, in: g }); g.text = (text, o = {}) => W.text(text, { ...o, in: g }); return g; };
    W.group = (o = {}) => { const g = make('group', o, null); groups.push(g); return addFactories(g); };

    // ---------- shapes ----------
    const closed = (x, pts) => { const n = pts.length; x.beginPath(); for (let i = 0; i < n; i++) { const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]; if (!i) x.moveTo(p1[0], p1[1]); x.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]); } x.closePath(); };
    const boxOf = (pts, pad = 0) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad }; };
    // a centreline sampled every few units: [[x, y, width, s 0–1] …] through the points (Catmull-Rom)
    const sample = (pts, step) => { if (pts.length < 2) return pts.map((p) => [p[0], p[1], 0]); const out = [], P2 = [pts[0], ...pts, pts[pts.length - 1]]; let len = 0; for (let i = 1; i < P2.length - 2; i++) { const [p0, p1, p2, p3] = [P2[i - 1], P2[i], P2[i + 1], P2[i + 2]], d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), k = Math.max(2, Math.ceil(d / step)); for (let j = 0; j < k; j++) { const q = j / k, q2 = q * q, q3 = q2 * q, f = (a, b, c, e) => 0.5 * (2 * b + (c - a) * q + (2 * a - 5 * b + 4 * c - e) * q2 + (3 * b - a - 3 * c + e) * q3); const x = f(p0[0], p1[0], p2[0], p3[0]), y = f(p0[1], p1[1], p2[1], p3[1]); if (out.length) len += Math.hypot(x - out[out.length - 1][0], y - out[out.length - 1][1]); out.push([x, y, len]); } } const last = pts[pts.length - 1]; len += Math.hypot(last[0] - out[out.length - 1][0], last[1] - out[out.length - 1][1]); out.push([last[0], last[1], len]); return out.map(([x, y, l]) => [x, y, l / (len || 1)]); };
    const discs = (list) => ({   // list: [[x, y, r, s] …]
      draw: (x) => { for (const [px, py, r] of list) { x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); } },
      param: (x, fat) => { for (const [px, py, r, s] of list) { x.fillStyle = `rgb(0,${Math.round(cl(s) * 255)},0)`; x.beginPath(); x.arc(px, py, r * 1.5 + fat, 0, 7); x.fill(); } },
      bbox: (() => { let b = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 }; for (const [px, py, r] of list) b = { x0: Math.min(b.x0, px - r), y0: Math.min(b.y0, py - r), x1: Math.max(b.x1, px + r), y1: Math.max(b.y1, py + r) }; return b; })(),
    });

    factories.ellipse = (o = {}) => { const rx = o.rx ?? o.r ?? 40, ry = o.ry ?? o.r ?? rx; return make('ellipse', o, { analytic: [rx, ry], bbox: { x0: -rx, y0: -ry, x1: rx, y1: ry } }); };
    factories.blob = (o = {}) => {
      const rx = o.rx ?? o.r ?? (o.w ?? 200) / 2, ry = o.ry ?? o.r ?? (o.h ?? o.w ?? 200) / 2, lump = o.lump ?? 0.1, R = rngOf(hashStr(o.seed ?? `blob:${ord}`) ^ seed0), hs = [2, 3, 4, 5, 7].map((k) => [k, R() * 6.28, lump * (0.5 + R()) / Math.sqrt(k - 1)]);
      const pts = Array.from({ length: 56 }, (_, i) => { const a = (i / 56) * Math.PI * 2, r = 1 + hs.reduce((s, [k, ph, am]) => s + am * Math.sin(k * a + ph), 0); return [Math.cos(a) * rx * r, Math.sin(a) * ry * r]; });
      return make('blob', o, { draw: (x) => { closed(x, pts); x.fill(); }, bbox: boxOf(pts), thick: Math.min(rx, ry) * 2 });
    };
    factories.rect = (o = {}) => {
      const w = o.w ?? 200, h = o.h ?? 120, r = Math.min(o.round ?? Math.min(w, h) * 0.06, w / 2, h / 2), R = rngOf(hashStr(o.seed ?? `rect:${ord}`) ^ seed0), bow = () => (R() - 0.5) * Math.min(w, h) * (o.bow ?? 0.035), x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2, bs = [bow(), bow(), bow(), bow()];
      return make('rect', o, { draw: (x) => { x.beginPath(); x.moveTo(x0 + r, y0); x.quadraticCurveTo(0, y0 + bs[0], x1 - r, y0); x.quadraticCurveTo(x1, y0, x1, y0 + r); x.quadraticCurveTo(x1 + bs[1], 0, x1, y1 - r); x.quadraticCurveTo(x1, y1, x1 - r, y1); x.quadraticCurveTo(0, y1 + bs[2], x0 + r, y1); x.quadraticCurveTo(x0, y1, x0, y1 - r); x.quadraticCurveTo(x0 + bs[3], 0, x0, y0 + r); x.quadraticCurveTo(x0, y0, x0 + r, y0); x.closePath(); x.fill(); }, bbox: { x0: x0 - 4, y0: y0 - 4, x1: x1 + 4, y1: y1 + 4 }, thick: Math.min(w, h) });
    };
    factories.poly = (o = {}) => { const pts = o.pts || [[-80, 60], [0, -80], [80, 60]]; const b = boxOf(pts, o.smooth === false ? 0 : 6); return make('poly', o, { draw: (x) => { if (o.smooth === false) { x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); } else closed(x, pts); x.fill(); }, bbox: b, thick: o.thick ?? Math.min(b.x1 - b.x0, b.y1 - b.y0) * 0.6 }); };
    const svgBox = (d) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); s.appendChild(p); s.style.cssText = 'position:absolute;visibility:hidden;width:0;height:0'; document.body.appendChild(s); const b = p.getBBox(); s.remove(); return { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height }; };
    factories.path = (o = {}) => { const path = new Path2D(o.d), b0 = o.box ? { x0: o.box[0], y0: o.box[1], x1: o.box[2], y1: o.box[3] } : svgBox(o.d), w = o.w ?? 0, b = { x0: b0.x0 - w, y0: b0.y0 - w, x1: b0.x1 + w, y1: b0.y1 + w }; return make('path', o, { draw: (x) => { if (w) { x.lineWidth = w; x.lineCap = x.lineJoin = 'round'; x.stroke(path); } else x.fill(path, o.rule ?? 'nonzero'); }, bbox: b, thick: o.thick ?? (w || Math.min(b.x1 - b.x0, b.y1 - b.y0) * 0.5) }); };
    // a brush stroke along points: it swells after the brush lands and thins as the brush lifts; it is painted from its first point to its last
    const strokeDiscs = (pts, w, taper, seed, s0 = 0, s1 = 1) => { const R = rngOf(seed), ph = R() * 6.28, cs = sample(pts, Math.max(1.2, w / 5)); return cs.map(([x, y, s]) => [x, y, Math.max(0.6, (w / 2) * lerp(taper[0], 1, sm(s / 0.22)) * lerp(1, taper[1], sm((s - 0.6) / 0.4)) * (1 + 0.07 * Math.sin(s * 9 + ph))), lerp(s0, s1, s)]); };
    factories.stroke = (o = {}) => { const w = o.w ?? 24, taper = o.taper ?? [0.55, 0.4], list = strokeDiscs(o.pts || [[-100, 0], [100, 0]], w, taper, hashStr(o.seed ?? `stroke:${ord}`) ^ seed0), d = discs(list); return make('stroke', o, { ...d, thick: w * Math.min(1, Math.max(taper[0], taper[1]) + 0.25) }); };
    // a branching thing painted from the root outward: a coral, a tree, a river system, veins, a crack
    factories.branch = (o = {}) => {
      const R = rngOf(hashStr(o.seed ?? `branch:${ord}`) ^ seed0), h = o.h ?? 300, w = o.w ?? 26, depth = o.depth ?? 4, spread = (o.spread ?? 28) * DEG, shrink = o.shrink ?? 0.7, list = [], tips = [];
      const total = h * (1 - Math.pow(shrink, depth)) / (1 - shrink);
      const grow = (x, y, ang, len, wd, lvl, dist) => {
        const bend = (R() - 0.5) * 0.5, mx = x + Math.cos(ang + bend * 0.5) * len * 0.5, my = y + Math.sin(ang + bend * 0.5) * len * 0.5, ex = x + Math.cos(ang) * len + Math.cos(ang + 1.57) * bend * len * 0.3, ey = y + Math.sin(ang) * len + Math.sin(ang + 1.57) * bend * len * 0.3;
        const wEnd = wd * (o.thin ?? 0.72);
        for (const [px, py, s] of sample([[x, y], [mx, my], [ex, ey]], Math.max(1.5, wd / 5))) list.push([px, py, Math.max(0.8, lerp(wd, wEnd, s) / 2), (dist + s * len) / total]);
        if (lvl + 1 >= depth) { tips.push([ex, ey, wEnd, (dist + len) / total]); return; }
        const kids = o.fork ?? (R() < 0.35 ? 3 : 2);
        for (let i = 0; i < kids; i++) { const a = ang + (kids === 1 ? 0 : lerp(-spread, spread, i / (kids - 1))) + (R() - 0.5) * spread * 0.5; grow(ex, ey, a, len * shrink * (0.8 + R() * 0.4), wEnd, lvl + 1, dist + len); }
      };
      grow(0, 0, (o.angle ?? -90) * DEG, h, w, 0, 0);
      if (o.tips) for (const [x, y, wd, s] of tips) list.push([x, y, (typeof o.tips === 'number' ? o.tips : wd * 0.9), s]);
      const d = discs(list);
      const n = make('branch', o, { ...d, thick: w * Math.pow(o.thin ?? 0.72, depth) });
      n.tips = tips.map(([x, y]) => [x, y]);
      return n;
    };
    // many small dabs as one wash: stipple, bubbles, spores, stars, a crowd seen from far away. They arrive one after another
    factories.dots = (o = {}) => {
      const R = rngOf(hashStr(o.seed ?? `dots:${ord}`) ^ seed0), n = o.n ?? 30, rx = o.rx ?? (o.w ?? 200) / 2, ry = o.ry ?? (o.h ?? o.w ?? 200) / 2, [r0, r1] = o.r ?? [4, 9], list = [];
      for (let i = 0, tries = 0; i < n && tries < n * 30; tries++) { let x, y; if (o.box) { x = (R() - 0.5) * 2 * rx; y = (R() - 0.5) * 2 * ry; } else { const a = R() * 6.28, d = Math.sqrt(R()); x = Math.cos(a) * d * rx; y = Math.sin(a) * d * ry; } const r = lerp(r0, r1, R() * R()); if (list.some(([px, py, pr]) => Math.hypot(px - x, py - y) < (pr + r) * (o.gap ?? 1.15))) continue; list.push([x, y, r, 0]); i++; }
      const key = o.order === 'out' ? (d) => Math.hypot(d[0] / rx, d[1] / ry) : o.order === 'x' ? (d) => d[0] : o.order === 'up' ? (d) => -d[1] : null;
      if (key) list.sort((a, b) => key(a) - key(b));
      list.forEach((d, i) => { d[3] = i / Math.max(1, list.length - 1); });
      const n2 = make('dots', { frontNoise: 0, ...o }, { ...discs(list), thick: r0 * 2 });
      n2.list = list;
      return n2;
    };
    // a ridge line filled down to a base: hills, a seabed, dunes, a skyline of roofs, waves
    factories.hills = (o = {}) => {
      const R = rngOf(hashStr(o.seed ?? `hills:${ord}`) ^ seed0), w = o.w ?? 1600, h = o.h ?? 160, base = o.base ?? 120, k = o.peaks ?? 6;
      const pts = o.pts || Array.from({ length: k + 1 }, (_, i) => [lerp(-w / 2, w / 2, i / k), -h * (0.25 + 0.75 * R()) * (i % 2 ? 1 : 0.55)]);
      const top = sample(pts, 24), poly = [...top.map(([x, y]) => [x, y]), [pts[pts.length - 1][0], base], [pts[0][0], base]];
      return make('hills', { edge: 'soft', grade: [1, 0.55], ...o }, { draw: (x) => { x.beginPath(); poly.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); x.fill(); }, bbox: boxOf(poly), thick: (h + base) * 0.5 });
    };
    // painted lettering: the word itself is a wash (a title, one big number). A hidden DOM copy lets the checks read it
    factories.letters = (o = {}) => {
      const text = String(o.text ?? ''), size = o.size ?? 200, font = `${o.weight ?? 900} ${size}px ${o.font ?? FONT.serif}`, mc = document.createElement('canvas').getContext('2d'), track = (o.track ?? 0.02) * size, align = o.align ?? 'center';
      // measured again once the font is in (F.prep): a fallback font's widths would crop the last glyph
      const lay = () => { mc.font = font; const mw = mc.measureText(text).width, tw = mw + track * Math.max(0, [...text].length - 1), x0 = align === 'left' ? 0 : align === 'right' ? -tw : -tw / 2; return { tw, x0, bbox: { x0: x0 - size * 0.06, y0: -size * 0.62, x1: x0 + tw + size * 0.06, y1: size * 0.62 } }; };
      let L0 = lay();
      const n = make('letters', { edge: 'hard', enter: o.at > 0 ? 'stroke' : 'none', uneven: 0.45, wob: size * 0.005, fea: size * 0.004, creep: 0.3, ...o }, { draw: (x) => { x.font = font; x.textBaseline = 'middle'; x.textAlign = 'left'; let cx2 = L0.x0; for (const ch of text) { x.fillText(ch, cx2, 0); cx2 += mc.measureText(ch).width + track; } }, bbox: L0.bbox, thick: size * 0.03 });   // thick = a serif's hairline: the field must stay sharp enough to keep the thin strokes
      n.needsFont = font;
      if (o.register !== false) n.ghost = W.text(text, { x: (o.x ?? 0) + L0.x0 + L0.tw / 2, y: o.y ?? 0, size, weight: o.weight ?? 900, at: n.at, until: n.until, enter: 'soak', dur: n.rev ? n.rev.dur : 0.5, kind: o.kind ?? 'headline', ghost: true, in: o.in, noFact: o.noFact, fact: o.fact, track: `${o.track ?? 0.02}em` });
      n.relayout = () => { L0 = lay(); n.bbox = L0.bbox; if (n.rev && n.rev.mode === 2) n.rev.o = strokeRev(n.bbox, o.dir ?? 0); if (n.ghost) n.ghost.o.x = (o.x ?? 0) + L0.x0 + L0.tw / 2; };
      return n;
    };
    for (const k of Object.keys(factories)) W[k] = (o = {}) => factories[k](o);
    // graphite: a thin line the paper's tooth breaks up (a leader, a ring, an axis, a quick under-drawing)
    W.pencil = factories.pencil = (o = {}) => { const base = { pigment: 'dark', density: 0.75, edge: 'dry', uneven: 0.2, rim: 0, sfx: false, enter: (o.at ?? (o.in ? o.in.at : 0)) > 0 ? 'grow' : 'none', dur: 0.5, ...o, w: o.w ?? 2.6, taper: o.taper ?? [0.9, 0.8] }; const n = o.d ? factories.path(base) : factories.stroke(base); if (n.at > 0 && o.sfx) sounds.push([n.at, 'pencil', n.rev ? n.rev.dur : 0.4, o.gain]); return n; };
    // shafts of light: pale body colour laid over the washes (through water, through cloud, from a window)
    W.rays = factories.rays = (o = {}) => { const g = W.group({ ...o, pigment: undefined }), R = rngOf(hashStr(o.seed ?? `rays:${ord}`) ^ seed0), n = o.n ?? 5, len = o.len ?? 700, fan = (o.fan ?? 16) * DEG, a0 = (o.angle ?? 78) * DEG; for (let i = 0; i < n; i++) { const a = a0 + lerp(-fan, fan, n === 1 ? 0.5 : i / (n - 1)) + (R() - 0.5) * 0.05, off = (i - (n - 1) / 2) * (o.gap ?? 90) + (R() - 0.5) * 30, w = (o.w ?? 46) * (0.6 + R() * 0.8); g.poly({ pts: [[off - w * 0.25, 0], [off + w * 0.25, 0], [off + Math.cos(a) * len + w, Math.sin(a) * len], [off + Math.cos(a) * len - w, Math.sin(a) * len]], smooth: false, gouache: true, pigment: o.pigment ?? 'paper', density: (o.density ?? 0.22) * (0.6 + R() * 0.6), edge: 'wet', soft: w * 0.42, grade: [1, 0.1], dir: 90, uneven: 0.3, enter: 'soak', dur: 1.6, sfx: false }); } return g; };
    // drops flicked off the brush
    W.splatter = factories.splatter = (o = {}) => factories.dots({ n: 14, r: [1.5, 7], w: 240, h: 160, density: 0.7, enter: (o.at ?? 0) > 0 ? 'grow' : 'none', dur: 0.35, ...o });

    // ---------- lifting ----------
    const leaves = (n, out = []) => { if (n.kids && n.kids.length) n.kids.forEach((k) => leaves(k, out)); else if (n.pA) out.push(n); return out; };
    W.lift = (at, o = {}) => {
      const list = [].concat(o.on || []).flatMap((n) => leaves(n));
      if (!list.length) return W;
      let b = null; for (const n of list) { const w = wbox(n, at); b = b ? { x0: Math.min(b.x0, w.x), y0: Math.min(b.y0, w.y), x1: Math.max(b.x1, w.x + w.w), y1: Math.max(b.y1, w.y + w.h) } : { x0: w.x, y0: w.y, x1: w.x + w.w, y1: w.y + w.h }; }
      const from = o.from || [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], far = Math.max(...[[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].map(([x, y]) => Math.hypot(x - from[0], y - from[1])));
      const dur = o.dur ?? cl(0.8 + far / 500, 1, 4);
      for (const n of list) n.lifts = { at, dur, leave: o.leave ?? lerp(0.1, 0.3, (n.pA.s + n.pB.s) / 2), o: [from[0], from[1], o.r ?? far, o.pow ?? 1.4] };
      if (o.sfx !== false) sounds.push([at, 'lift', dur, o.gain]);
      return W;
    };

    // ---------- text in the world (DOM: the checks see it) ----------
    const wl = el('div', 'left:0;top:0;width:0;height:0;transform-origin:0 0;z-index:5', F.stage);
    const hud = el('div', 'inset:0;z-index:20;pointer-events:none', F.stage);
    const texts = [];
    W.text = (text, o = {}) => {
      const size = o.size ?? 40, at = o.at ?? (o.in ? o.in.at : 0), until = o.until ?? (o.in ? o.in.until : 1e9), enter = o.enter ?? (at > 0 ? 'soak' : 'none'), align = o.align ?? 'center';
      const e = el('div', `left:0;top:0;white-space:${o.wrap ? 'normal' : 'nowrap'};${o.wrap ? `width:${o.wrap}px;` : ''}font:${o.weight ?? 600} ${size}px/1.25 ${o.font ?? FONT.serif};color:${o.ghost ? 'transparent' : o.color ?? cssOf(o.tone ?? 'dark', o.depth ?? 1.7)};letter-spacing:${o.track ?? (/[^\x00-\xff]/.test(text) ? '0.04em' : '0.01em')};text-align:${align};font-variant-numeric:tabular-nums;${o.css ?? ''}`, o.screen ? hud : wl);
      e.textContent = text; if (o.ghost) e.dataset.motion = 'skip';
      const T = { e, o, at, until, enter, size, align, text };
      texts.push(T);
      if (o.register !== false) F.text(e, o.kind ?? 'label', o.fact ?? text, at, until, { noFact: !!o.noFact, chrome: !!o.chrome, overlap: !!o.overlap });
      T.set = (s) => { if (e.textContent !== s) e.textContent = s; };
      return T;
    };
    const textPos = (T, t) => { const o = T.o; let x = typeof o.x === 'function' ? o.x(t) : o.x ?? 0, y = typeof o.y === 'function' ? o.y(t) : o.y ?? 0; if (o.in) [x, y] = apply(matOf(o.in, t), x, y); if (o.on) { const b = wbox(o.on, t); x += b.x + b.w * (o.ax ?? 0.5); y += b.y + b.h * (o.ay ?? 0); } return [x, y]; };
    const textFrame = (t) => {
      for (const T of texts) {
        const on = t >= T.at && t < T.until; set(T.e, { display: on ? '' : 'none' }); if (!on) continue;
        const [x, y] = textPos(T, t), qi = T.enter === 'none' ? 1 : cl((t - T.at) / (T.o.dur ?? 0.7)), qo = T.until < 1e8 ? cl((t - (T.until - 0.5)) / 0.5) : 0;
        const ox = T.align === 'left' ? 0 : T.align === 'right' ? -1 : -0.5, a = E.sine(qi) * (1 - E.sine(qo)), bl = T.enter === 'soak' && !T.o.ghost ? (1 - E.quartOut(qi)) * T.size * 0.16 + qo * T.size * 0.1 : 0, dy = T.enter === 'rise' ? (1 - E.quartOut(qi)) * T.size * 0.5 : 0;
        set(T.e, { transform: `translate(${f1(x)}px,${f1(y + dy)}px) translate(${ox * 100}%,-50%)`, opacity: a.toFixed(3), filter: bl > 0.05 ? `blur(${f1(bl)}px)` : '' });
      }
    };
    W.number = (o = {}) => { const fmt = o.fmt ?? ((v) => String(Math.round(v))), at = o.at ?? 0, dur = o.dur ?? 1.2; const T = W.text(fmt(o.from ?? 0), { size: 96, weight: 900, kind: 'headline', ...o, fact: fmt(o.to ?? 0) }); F.add((t) => T.set(fmt(lerp(o.from ?? 0, o.to ?? 0, E.cubicInOut(cl((frameT(t) - at) / dur)))))); if (o.sfx !== false && at > 0) sounds.push([at, 'tick', dur, 0.3]); return T; };
    // words tied to a thing with a pencil leader: the line starts at the thing and the words soak in at its far end
    W.label = (text, o = {}) => { const at = o.at ?? 0, to = o.on ? (() => { const b = wbox(o.on, at + 0.01); return [b.x + b.w * (o.ax ?? 0.5), b.y + b.h * (o.ay ?? 0.5)]; })() : o.to || [0, 0], x = o.x ?? to[0] + (o.dx ?? 160), y = o.y ?? to[1] + (o.dy ?? -120), size = o.size ?? 34, left = (o.align ?? (x >= to[0] ? 'left' : 'right')) === 'left'; const gap = size * 0.35, ex = x - (left ? gap : -gap), mid = [lerp(to[0], ex, 0.55) + (y - to[1]) * 0.06, lerp(to[1], y, 0.55) - (ex - to[0]) * 0.06]; const line = W.pencil({ pts: [to, mid, [ex, y]], at, until: o.until, z: o.z ?? 50, dur: 0.45, sfx: true, gain: 0.25 }); const T = W.text(text, { ...o, x, y, size, align: left ? 'left' : 'right', at: at + 0.3, on: undefined }); return { line, text: T }; };

    // ---------- information, told with paint ----------
    // a counted field of dabs (one dab = one unit: a hundred reefs, forty weeks, twelve countries). g.take(at, { share | n, pigment }) repaints
    // a share in another pigment; g.lose(at, { share | n }) washes a share out, dab by dab
    W.dabs = (o = {}) => {
      const n = o.n ?? 100, cols = o.cols ?? Math.ceil(Math.sqrt(n * 1.6)), r = o.r ?? 13, gap = o.gap ?? r * 2.7, rows = Math.ceil(n / cols), g = W.group({ x: o.x ?? 0, y: o.y ?? 0, at: o.at ?? 0, until: o.until, z: o.z });
      const R = rngOf(hashStr(o.seed ?? `dabs:${ord}`) ^ seed0), at = g.at, every = o.every ?? Math.min(0.04, 1.6 / n);
      g.dabs = Array.from({ length: n }, (_, i) => { const cx = (i % cols - (cols - 1) / 2) * gap + (R() - 0.5) * r * 0.5, cy = (Math.floor(i / cols) - (rows - 1) / 2) * gap + (R() - 0.5) * r * 0.5; return g.ellipse({ x: cx, y: cy, rx: r * (0.85 + R() * 0.3), ry: r * (0.85 + R() * 0.3), rot: R() * 180, pigment: o.pigment ?? 'cool', density: (o.density ?? 0.7) * (0.8 + R() * 0.4), at: at + (at > 0 ? i * every : 0), enter: at > 0 ? 'bloom' : 'none', dur: 0.45, sfx: false, lintOk: true }); });
      const pick = (q) => { const k = q.n ?? Math.round((q.share ?? 0.5) * n); const idx = Array.from({ length: n }, (_, i) => i); if (q.order === 'random') { const R2 = rngOf(hashStr(q.seed ?? 'pick') ^ seed0); for (let i = n - 1; i > 0; i--) { const j = Math.floor(R2() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } } return idx.slice(q.start ?? 0, (q.start ?? 0) + k).sort((a, b) => a - b); };
      g.lose = (t, q = {}) => { const ids = pick(q), ev = q.every ?? Math.min(0.05, 2 / ids.length); ids.forEach((i, j) => { const d = g.dabs[i], w = apply(matOf(d, t), 0, 0); for (const x of [d, ...(d.over || [])]) x.lifts = { at: t + j * ev, dur: 0.5, leave: q.leave ?? 0.16, o: [w[0] - r, w[1], r * 2.4, 1.2] }; }); sounds.push([t, 'lift', ids.length * ev + 0.5, 0.3]); return ids.length; };
      g.take = (t, q = {}) => { const ids = pick(q), ev = q.every ?? Math.min(0.05, 2 / ids.length); ids.forEach((i, j) => { const d = g.dabs[i]; (d.over ??= []).push(d.repaint(t + j * ev, { pigment: q.pigment ?? 'warm', density: q.density ?? 0.75, enter: 'bloom', dur: 0.4, sfx: false, lintOk: true, z: d.z + 0.1 })); }); sounds.push([t, 'dab', ids.length * ev, 0.3]); return ids.length; };
      if (at > 0 && o.sfx !== false) sounds.push([at, 'dab', n * every, 0.3]);
      g.cols = cols; g.rows = rows; g.gap = gap; g.w = cols * gap; g.h = rows * gap; g.bbox = { x0: -g.w / 2, y0: -g.h / 2, x1: g.w / 2, y1: g.h / 2 };
      return g;
    };
    // a row of colour chips: each chip's depth (and size) is its value, its name below. A timeline of events, a scale, a legend
    W.swatches = (o = {}) => {
      const items = o.items || [], g = W.group({ x: o.x ?? 0, y: o.y ?? 0, at: o.at ?? 0, until: o.until, z: o.z }), gap = o.gap ?? 220, w = o.w ?? 150, h = o.h ?? 110, max = Math.max(...items.map((it) => it.value ?? 1), 1e-9), at = g.at, every = o.every ?? 0.5;
      g.chips = items.map((it, i) => { const x = (i - (items.length - 1) / 2) * gap, q = (it.value ?? max) / max, t0 = it.at ?? at + i * every, k = o.scale === false ? 1 : lerp(0.62, 1, q);
        const chip = g.rect({ x, y: 0, w: w * k, h: h * k, pigment: it.pigment ?? o.pigment ?? 'cool', to: it.to, density: it.density ?? lerp(0.22, 1.15, q), at: t0, enter: 'stroke', dir: 8, dur: 0.6, blooms: q > 0.7 ? 1 : 0, sfx: true, gain: 0.3 });
        if (it.label) W.text(it.label, { data: true, in: g, x, y: h * 0.5 + (o.size ?? 30) * 1.1, size: o.size ?? 30, weight: 600, at: it.labelAt ?? t0 + 0.25 });
        if (it.note) W.text(it.note, { data: true, in: g, x, y: -h * 0.5 - (o.noteSize ?? 34) * 0.9, size: o.noteSize ?? 34, weight: 800, tone: it.pigment ?? o.pigment ?? 'cool', depth: 2.2, at: t0 + 0.4 });
        return chip; });
      g.bbox = { x0: -(items.length * gap) / 2, y0: -h, x1: (items.length * gap) / 2, y1: h };
      return g;
    };
    // strokes pulled up from a baseline, one per value: the brush runs out near the top
    W.bars = (o = {}) => {
      const items = o.items || [], g = W.group({ x: o.x ?? 0, y: o.y ?? 0, at: o.at ?? 0, until: o.until, z: o.z }), gap = o.gap ?? 150, w = o.w ?? 64, hMax = o.h ?? 380, max = o.max ?? Math.max(...items.map((it) => it.value), 1e-9), at = g.at, every = o.every ?? 0.35, fmt = o.fmt ?? ((v) => String(v)), R = rngOf(hashStr(o.seed ?? `bars:${ord}`) ^ seed0);
      const x0 = -((items.length - 1) / 2) * gap;
      g.pencil({ pts: [[x0 - gap * 0.6, 4], [0, 6 + R() * 3], [-x0 + gap * 0.6, 4]], at, dur: 0.5 });
      g.strokes = items.map((it, i) => { const x = x0 + i * gap, hh = Math.max(8, hMax * it.value / max), t0 = it.at ?? at + 0.3 + i * every;
        const s = g.stroke({ pts: [[x + (R() - 0.5) * 4, 0], [x + (R() - 0.5) * 6, -hh * 0.5], [x + (R() - 0.5) * 4, -hh]], w, taper: [0.9, 0.75], pigment: it.pigment ?? o.pigment ?? 'cool', to: it.to, density: it.density ?? 0.75, at: t0, dur: 0.5 + hh / 900, sfx: true, gain: 0.3 });
        if (it.label) W.text(it.label, { data: true, in: g, x, y: (o.size ?? 28) * 1.2, size: o.size ?? 28, weight: 600, at: t0 });
        if (o.values !== false) W.text(it.text ?? fmt(it.value), { data: true, in: g, x, y: -hh - w * 0.45 - (o.valueSize ?? 34) * 0.7, size: o.valueSize ?? 34, weight: 800, at: t0 + 0.45 });
        return s; });
      g.bbox = { x0: x0 - gap * 0.6, y0: -hMax - 60, x1: -x0 + gap * 0.6, y1: 50 };
      return g;
    };
    // a close-up: a disc of clean paper ringed in pencil, with its own small painting inside (children are clipped to the disc), tied to a spot by a leader
    W.inset = (o = {}) => {
      const r = o.r ?? 220, at = o.at ?? 0, g = W.group({ x: o.x ?? 0, y: o.y ?? 0, at, until: o.until, z: o.z ?? 30, clip: r });
      const ring = W.group({ x: o.x ?? 0, y: o.y ?? 0, at, until: o.until, z: (o.z ?? 30) + 5 });
      g.ellipse({ rx: r * 1.02, ry: r * 1.02, gouache: true, pigment: 'paper', density: 0.96, edge: 'hard', rim: 0, uneven: 0.03, grain: 0, enter: at > 0 ? 'bloom' : 'none', dur: 0.7, sfx: true, noClip: true });
      const pts = Array.from({ length: 40 }, (_, i) => { const a = (i / 38) * Math.PI * 2 - 1.2, k = 1 + 0.012 * Math.sin(i * 1.7); return [Math.cos(a) * r * k, Math.sin(a) * r * k]; });
      ring.pencil({ pts, w: o.ring ?? 3, at: at + 0.15, dur: 0.7, sfx: true, gain: 0.25 });
      if (o.from) { const a = Math.atan2(o.from[1] - (o.y ?? 0), o.from[0] - (o.x ?? 0)), sx = (o.x ?? 0) + Math.cos(a) * r, sy = (o.y ?? 0) + Math.sin(a) * r; W.pencil({ pts: [o.from, [lerp(o.from[0], sx, 0.5) + 8, lerp(o.from[1], sy, 0.5) - 8], [sx, sy]], at, until: o.until, z: (o.z ?? 30) + 5, dur: 0.4 }); if (o.spot !== false) W.pencil({ pts: Array.from({ length: 18 }, (_, i) => { const b = (i / 16) * Math.PI * 2; return [o.from[0] + Math.cos(b) * (o.spot ?? 22), o.from[1] + Math.sin(b) * (o.spot ?? 22)]; }), at, until: o.until, z: (o.z ?? 30) + 5, dur: 0.3 }); }
      g.r = r; g.ring = ring; g.bbox = { x0: -r, y0: -r, x1: r, y1: r };
      if (o.build) o.build(g);
      return g;
    };

    // ---------- camera ----------
    const DEF = { x: 0, y: 0, z: 1 }, keys = [], pages = [], DRIFT = opt.drift ?? 0.004;
    const resolve = (v, t) => { if (!v) return { ...DEF }; if (v.on) { const list = [].concat(v.on).map((n) => wbox(n, t)); const x0 = Math.min(...list.map((b) => b.x)), y0 = Math.min(...list.map((b) => b.y)), x1 = Math.max(...list.map((b) => b.x + b.w)), y1 = Math.max(...list.map((b) => b.y + b.h)), pad = v.pad ?? 1.5, vw = Wd / U, vh = H / U, z = v.z ?? Math.min(vw / ((x1 - x0) * pad), vh / ((y1 - y0) * pad)); return { x: (x0 + x1) / 2 + (v.dx ?? 0), y: (y0 + y1) / 2 + (v.dy ?? 0), z }; } return { x: v.x ?? 0, y: v.y ?? 0, z: v.z ?? 1 }; };
    const memo = new Map();
    const held = (k) => { if (!memo.has(k)) memo.set(k, resolve(k.view, k.b)); return memo.get(k); };
    W.cam = (t, view) => { keys.push({ a: t, b: t, view, ease: E.lin }); keys.sort((p, q) => p.b - q.b || p.a - q.a); memo.clear(); return W; };
    W.move = (a, b, view, ease = E.cubicInOut) => { keys.push({ a, b, view, ease }); keys.sort((p, q) => p.b - q.b || p.a - q.a); memo.clear(); return W; };
    const camAt = (t) => { let cur = null, last = null; for (const k of keys) { if (t >= k.b) last = k; else if (t >= k.a) { cur = k; break; } } if (cur) { const f0 = last ? held(last) : { ...DEF }, from = { ...f0, z: f0.z * (1 + Math.min(0.04, DRIFT * (cur.a - (last ? last.b : 0)))) }, to = held(cur), q = cur.ease(cl((t - cur.a) / (cur.b - cur.a))); return { x: lerp(from.x, to.x, q), y: lerp(from.y, to.y, q), z: Math.exp(lerp(Math.log(from.z), Math.log(to.z), q)) }; } const v = last ? held(last) : { ...DEF }; return { ...v, z: v.z * (1 + Math.min(0.04, DRIFT * (t - (last ? last.b : 0)))) }; };
    W.camAt = camAt;
    // a fresh sheet: clean wet paper sweeps across, everything painted so far is gone under it, and the next painting starts on bare paper
    W.page = (at, o = {}) => { const dur = o.dur ?? 1.1, d = o.dir ?? 0; for (const n of [...nodes, ...groups]) if (!n.p.keep && n.at < at + dur * 0.5 && n.until > at + dur) { n.until = at + dur; n.exit = 'cut'; } for (const T of texts) if (!T.o.keep && T.at < at + dur * 0.5 && T.until > at + dur * 0.4) T.until = at + dur * 0.45; pages.push({ at, dur, dir: d }); if (o.view) W.cam(at + dur, o.view); F.transition(at, at + dur + 0.1); F.appear(at + dur); if (o.sfx !== false) sounds.push([at, 'page', dur, 0.4]); return W; };

    // ---------- fields (rasterised once, after the fonts are in) ----------
    const fieldOf = (n) => {
      if (n._field) { if (!n._field.field && !n._field.analytic) fieldOf(n._field); n.field = n._field.field; n.quad = n._field.quad; n.sp = n._field.sp; return; }
      if (n.analytic) { const m = Math.max(n.ed.sw, n.ed.wob + n.ed.fea) * 1.6 + 6; n.quad = [n.bbox.x0 - m, n.bbox.y0 - m, n.bbox.x1 - n.bbox.x0 + 2 * m, n.bbox.y1 - n.bbox.y0 + 2 * m]; n.sp = 1; return; }
      const b = n.bbox, ed = n.ed, want = Math.max(ed.sd, ed.sw * 0.8, ed.rw * 1.3, ed.wob + ed.fea, 3);
      let sp = Math.min(want, Math.max(1.2, n.thick / 3));
      const bw = b.x1 - b.x0, bh = b.y1 - b.y0;
      let ts = Math.max(sp / 2.5, Math.max(bw, bh) / 880, 0.6);
      sp = Math.max(sp, ts * 1.25);
      ed.sd = Math.min(ed.sd, sp * 1.1); ed.sw = Math.min(ed.sw, sp * 1.15); ed.rw = Math.min(ed.rw, sp * 0.8);
      const m = sp * 3.2, w = bw + 2 * m, h = bh + 2 * m, c = document.createElement('canvas'); c.width = Math.max(4, Math.ceil(w / ts)); c.height = Math.max(4, Math.ceil(h / ts));
      const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
      const k = c.width / w, ky = c.height / h;
      x.setTransform(k, 0, 0, ky, (m - b.x0) * k, (m - b.y0) * ky);
      if (n.param) n.param(x, sp * 2.2);
      x.globalCompositeOperation = 'lighter'; x.filter = `blur(${(sp * k).toFixed(2)}px)`; x.fillStyle = x.strokeStyle = '#f00';
      n.draw(x);
      n.field = texOf(c, 0, 0, false); n.quad = [b.x0 - m, b.y0 - m, w, h]; n.sp = sp;
    };
    F.prep(async () => {
      const fonts = [...new Set(nodes.filter((n) => n.needsFont).map((n) => n.needsFont))];
      if (fonts.length && document.fonts) { try { await Promise.all(fonts.flatMap((f) => [...new Set(nodes.filter((n) => n.needsFont === f).map((n) => n.p.text).join(''))].length ? [document.fonts.load(f, nodes.filter((n) => n.needsFont === f).map((n) => n.p.text).join(''))] : [])); } catch (e) { /* the fallback font is drawn */ } }
      for (const pg of pages) { const z = pg.at + pg.dur; for (const n of [...nodes, ...groups]) if (n.at > pg.at && n.at < z) n.at = z; for (const T of texts) if (T.at > pg.at && T.at < z) T.at = z; }
      for (const n of nodes) if (n.relayout) n.relayout();
      for (const n of nodes) fieldOf(n);
      // sounds: one per gesture, never a burst of the same sound
      sounds.sort((a, b) => a[0] - b[0]); const lastAt = {};
      for (const [t, type, dur, gain] of sounds) { if (lastAt[type] !== undefined && t - lastAt[type] < 0.28) continue; lastAt[type] = t; F.sfx(Math.max(0, t), type, gain ?? 0.38, { dur }); }
    });

    // ---------- drawing a frame ----------
    const m3 = new Float32Array(9);
    const drawQuad = (box, mat) => { gl.uniform4f(u.uBox, box[0], box[1], box[2], box[3]); m3[0] = mat[0]; m3[1] = mat[1]; m3[2] = 0; m3[3] = mat[2]; m3[4] = mat[3]; m3[5] = 0; m3[6] = mat[4]; m3[7] = mat[5]; m3[8] = 1; gl.uniformMatrix3fv(u.uMat, false, m3); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    const ID = [1, 0, 0, 1, 0, 0];
    const paperAbs = pig('paper').abs, paperRGB = hex(pal.paper).map((v) => v / 255);
    const clipOf = (n, t) => { if (n.p.noClip) return null; for (let g = n.parent; g; g = g.parent) if (g.p.clip) { const m = matOf(g, t), k = Math.hypot(m[0], m[1]); return [m[4], m[5], g.p.clip * k]; } return null; };
    const visAt = (n, t) => { for (let g = n; g; g = g.parent) if (t < g.at || t >= g.until) return false; return true; };
    const frame = (t) => {
      const cam = camAt(t), k = cam.z * U * ratio;
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(u.uRes, cv.width, cv.height); gl.uniform1f(u.uToothScale, TOOTH * 1.15); gl.uniform3f(u.uPaper, paperRGB[0], paperRGB[1], paperRGB[2]);
      // the paper
      gl.disable(gl.BLEND); gl.uniform1i(u.uMode, 0); gl.uniform1f(u.uPar, TOOTH_K); gl.uniform4f(u.uCam, cam.x, cam.y, k, 1);
      const vw = cv.width / k, vh = cv.height / k;
      drawQuad([cam.x - vw / 2 - 2, cam.y - vh / 2 - 2, vw + 4, vh + 4], ID);
      gl.enable(gl.BLEND);
      if (!sorted) sorted = nodes.slice().sort((a, b) => a.z - b.z || a.ord - b.ord);
      const wash = (n, tt, mat, over) => {
        const ed = n.ed, r = n.rev, el2 = tt - n.at;
        if (n.mode >= 2) gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); else gl.blendFunc(gl.DST_COLOR, gl.ZERO);
        gl.uniform1i(u.uMode, n.mode); gl.uniform1i(u.uKind, n.analytic ? 1 : 0);
        if (n.analytic) gl.uniform2f(u.uRad, n.analytic[0], n.analytic[1]); else gl.bindTexture(gl.TEXTURE_2D, n.field);
        gl.uniform4f(u.uQuad, n.quad[0], n.quad[1], n.quad[2], n.quad[3]); gl.uniform1f(u.uSpread, n.sp); gl.uniform1f(u.uDry, n.dry); gl.uniform1f(u.uPool, n.pool);
        gl.uniform3fv(u.uAbsA, n.pA.abs); gl.uniform3fv(u.uAbsB, n.pB.abs); gl.uniform3f(u.uSeed, n.noiseO[0], n.noiseO[1], 0);
        let dens = kv(n, 'density', tt, n.density) * (over?.dens ?? 1);
        if (n.until < 1e8 && n.exit !== 'cut') dens *= 1 - E.sine(cl((tt - (n.until - n.outDur)) / n.outDur));
        gl.uniform4f(u.uDens, dens, n.uneven, n.gran, n.mixN);
        gl.uniform4f(u.uEdge, ed.sd, ed.sw, ed.wob, ed.fea); gl.uniform4f(u.uRim, ed.rim, ed.rw, ed.creep, ed.dry);
        gl.uniform4f(u.uGrade, n.grade[0], n.grade[1], n.grade[2], n.grade[3]); gl.uniform2f(u.uMix, n.mix[0], n.mix[1]);
        if (r && el2 < r.dur * 3 + n.dry + 1) { gl.uniform4f(u.uRev, r.mode, el2, r.dur, r.fea); gl.uniform4f(u.uRevO, r.o[0], r.o[1], r.o[2], r.o[3]); gl.uniform2f(u.uRevN, r.noise, r.pow); } else { gl.uniform4f(u.uRev, 0, 1e3, 1, 0.1); gl.uniform2f(u.uRevN, 0, 1); }
        const L = n.lifts;
        if (L && tt > L.at) { gl.uniform4f(u.uLift, tt - L.at, L.dur, L.leave, 1); gl.uniform4f(u.uLiftO, L.o[0], L.o[1], L.o[2], L.o[3]); }
        else if (n.until < 1e8 && n.exit === 'lift' && tt > n.until - n.outDur) { const b = wbox(n, tt); gl.uniform4f(u.uLift, tt - (n.until - n.outDur), n.outDur * 0.8, 0, 1); gl.uniform4f(u.uLiftO, b.x, b.y + b.h / 2, Math.hypot(b.w, b.h), 1); }
        else gl.uniform4f(u.uLift, 0, 1, 1, 0);
        const c = clipOf(n, tt); if (c) gl.uniform4f(u.uClip, c[0], c[1], c[2], 1); else gl.uniform4f(u.uClip, 0, 0, 0, 0);
        for (let i = 0; i < 2; i++) { const B = n.blooms[i]; gl.uniform4f(uBl[i], B ? B[0] : 0, B ? B[1] : 0, B ? B[2] : 1, B ? B[3] : 0); }
        gl.uniform4f(u.uCam, cam.x * n.par, cam.y * n.par, k, 1);
        drawQuad(n.quad, mat);
      };
      for (const n of sorted) { if (!visAt(n, t)) continue; wash(n, t, matOf(n, t)); }
      // a page turning: clean paper sweeps over the old painting (screen space)
      for (const pg of pages) { if (t < pg.at || t >= pg.at + pg.dur) continue; const d = pg.dir * DEG, dx = Math.cos(d), dy = Math.sin(d), hw = vw / 2, hh = vh / 2, lo = -(Math.abs(dx) * hw + Math.abs(dy) * hh), L = -2 * lo; gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1i(u.uMode, 3); gl.uniform1i(u.uKind, 1); gl.uniform2f(u.uRad, vw * 4, vh * 4); gl.uniform4f(u.uQuad, cam.x - hw, cam.y - hh, vw, vh); gl.uniform3fv(u.uAbsA, paperAbs); gl.uniform3fv(u.uAbsB, paperAbs); gl.uniform3f(u.uSeed, 31, 77, 0); gl.uniform4f(u.uDens, 1.6, 0.05, 0.05, 0); gl.uniform4f(u.uEdge, 1, 1, 0, 0); gl.uniform4f(u.uRim, 0, 4, 0, 0); gl.uniform4f(u.uGrade, 0, 0, 1, 1); gl.uniform2f(u.uMix, 0, 0); gl.uniform1f(u.uDry, 0.3); gl.uniform1f(u.uPool, 0); gl.uniform4f(u.uRev, 2, t - pg.at, pg.dur * 0.72, 0.16); gl.uniform4f(u.uRevO, cam.x + dx * lo, cam.y + dy * lo, dx / L, dy / L); gl.uniform2f(u.uRevN, 0.3, 1); gl.uniform4f(u.uLift, 0, 1, 1, 0); gl.uniform4f(u.uClip, 0, 0, 0, 0); for (let i = 0; i < 2; i++) gl.uniform4f(uBl[i], 0, 0, 1, 0); gl.uniform4f(u.uCam, cam.x, cam.y, k, 1); gl.uniform2f(u.uRad, 1e6, 1e6); drawQuad([cam.x - hw - 2, cam.y - hh - 2, vw + 4, vh + 4], ID); }
      // the caption band: the painting thins out into bare paper at the foot of the frame (screen space)
      if (veil) { const hw = vw / 2, hh = vh / 2, top = hh - vh * veil.h; gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1i(u.uMode, 3); gl.uniform1i(u.uKind, 1); gl.uniform2f(u.uRad, vw * 4, vh * 4); gl.uniform4f(u.uQuad, cam.x - hw, cam.y + top - vh * 0.1, vw, vh * (veil.h + 0.1)); gl.uniform3fv(u.uAbsA, paperAbs); gl.uniform3fv(u.uAbsB, paperAbs); gl.uniform3f(u.uSeed, 400, 900, 0); gl.uniform2f(u.uRad, 1e6, 1e6); gl.uniform4f(u.uDens, veil.a, 0.5, 0.1, 0); gl.uniform4f(u.uEdge, 1, 1, 0, 0); gl.uniform4f(u.uRim, 0, 4, 0, 0); gl.uniform4f(u.uGrade, 0, 1 / (vh * (veil.h + 0.1)), 0, 1.25); gl.uniform2f(u.uMix, 0, 0); gl.uniform1f(u.uDry, 1); gl.uniform1f(u.uPool, 0); gl.uniform4f(u.uRev, 0, 1e3, 1, 0.1); gl.uniform2f(u.uRevN, 0, 1); gl.uniform4f(u.uLift, 0, 1, 1, 0); gl.uniform4f(u.uClip, 0, 0, 0, 0); for (let i = 0; i < 2; i++) gl.uniform4f(uBl[i], 0, 0, 1, 0); gl.uniform4f(u.uCam, cam.x, cam.y, k, 1); drawQuad([cam.x - hw - 2, cam.y + top - vh * 0.1, vw + 4, vh * (veil.h + 0.1) + 4], ID); }
      const kc = cam.z * U; set(wl, { transform: `matrix(${kc.toFixed(5)},0,0,${kc.toFixed(5)},${(Wd / 2 - cam.x * kc).toFixed(2)},${(H / 2 - cam.y * kc).toFixed(2)})` });
      textFrame(t);
    };
    const voiced = !!(F.T && F.voiced);
    const veil = opt.veil === false || (!voiced && !opt.veil) ? null : { h: PT ? 0.3 : 0.2, a: 0.9, ...(typeof opt.veil === 'object' ? opt.veil : {}) };
    F.add(frame);

    // captions: dark serif on the bare paper at the foot of the frame
    if (voiced && !F.caps && opt.captions !== false) {
      const co = opt.captions || {}, segs = window.EV.captionSegments(F.T, co.max ?? (PT ? 13 : 22)), size = F.px(co.size ?? (PT ? 42 : 40));
      const box = el('div', `left:0;right:0;top:${co.top ?? (PT ? H * 0.775 : H * 0.875)}px;text-align:center;z-index:880;pointer-events:none;display:none`, F.stage);
      const sp = el('span', `position:relative;display:inline-block;max-width:${Wd * 0.84}px;color:${INK};font:600 ${f1(size)}px/1.35 ${FONT.serif};letter-spacing:.04em;text-shadow:0 0 ${F.px(10)}px ${pal.paper},0 0 ${F.px(5)}px ${pal.paper},0 0 ${F.px(2)}px ${pal.paper}`, box);
      F.add((t) => { const c = segs.find((x) => t >= x.start && t < x.end); set(box, { display: c ? '' : 'none' }); if (c && sp.textContent !== c.text) sp.textContent = c.text; });
      for (const c of segs) { F.appear(c.start); F.appear(c.end); }
      F.caps = segs;
    }

    // ---------- checks ----------
    F.addLint(() => {
      const out = [], add = (t, what, msg) => out.push({ level: 'warn', t: Math.round(t * 10) / 10, src: '', what, msg });
      const tops = nodes.filter((n) => !n.p.lintOk);
      const paged = (t) => pages.some((p) => t >= p.at - 0.05 && t <= p.at + p.dur + 0.1);
      const pops = tops.filter((n) => n.at > 0.3 && n.enter === 'none' && !paged(n.at));
      if (pops.length) add(pops[0].at, M('颜色硬出现', 'paint switched on'), M(`${pops.length} 块颜色在片中直接出现（第一块在 ${pops[0].at.toFixed(1)} 秒）：颜料是画上去的，给它 enter: 'bloom'（晕开）/ 'stroke'（一笔扫过）/ 'grow'（顺着笔画长出来）/ 'soak'（渗出来）`, `${pops.length} washes appear mid-film with no entrance (the first at ${pops[0].at.toFixed(1)} s): paint is painted on; give them enter: 'bloom' / 'stroke' / 'grow' / 'soak'`));
      const ent = tops.filter((n) => n.at > 0.3 && n.enter !== 'none' && !n.parent).sort((a, b) => a.at - b.at);
      for (let i = 0; i < ent.length;) { let j = i; while (j + 1 < ent.length && ent[j + 1].enter === ent[i].enter && ent[j + 1].at - ent[j].at < 4) j++; if (j - i + 1 >= 8 && ent[j].at - ent[i].at > 4) { add(ent[i].at, M('入场单一', 'same entrance'), M(`${ent[i].at.toFixed(1)}–${ent[j].at.toFixed(1)} 秒连续 ${j - i + 1} 块颜色都用 '${ent[i].enter}'：换着用晕开、一笔扫过、顺着长、渗出来，或者让已有的颜色被洗掉、被罩上一层`, `${ent[i].at.toFixed(1)}–${ent[j].at.toFixed(1)} s: ${j - i + 1} washes in a row enter with '${ent[i].enter}': vary bloom / stroke / grow / soak, or lift and glaze what is already there`)); break; } i = j + 1; }
      if (raw.size > 2) add(0, M('颜色越界', 'off-palette colours'), M(`用了 ${raw.size} 个调色板以外的颜色（${[...raw].slice(0, 5).join(' ')}）：水彩是有限的几种颜料互相调出来的，用颜料名（${ROLES.join(' / ')}）和 'warm+sun' 这样的调色`, `${raw.size} colours outside the palette (${[...raw].slice(0, 5).join(' ')}): watercolour is a few pigments mixed with each other; use the pigment names (${ROLES.join(' / ')}) and mixes such as 'warm+sun'`));
      // watercolour is light: deep washes over large areas turn it into gouache
      const heavy = tops.filter((n) => n.mode === 1 && n.density * Math.max(...n.pA.abs) > 2.6 && (n.bbox.x1 - n.bbox.x0) * (n.bbox.y1 - n.bbox.y0) > 200000);
      if (heavy.length) add(heavy[0].at, M('颜色太重', 'washes too heavy'), M(`${heavy.length} 块大面积的颜色太深（density ${heavy[0].density}）：水彩靠白纸透光，大面积用 0.3–0.8，深色留给小面积的重点`, `${heavy.length} large washes are very deep (density ${heavy[0].density}): watercolour glows because the paper shows through; keep large areas at 0.3–0.8 and save deep colour for small accents`));
      const pencils = nodes.filter((n) => n.ed && n.ed.dry && n.p.pigment === 'dark' && (n.p.w ?? 9) < 5).length;
      if (pencils > Math.max(14, nodes.length * 0.35)) add(0, M('铅笔线太多', 'too much pencil'), M(`有 ${pencils} 条铅笔线：这个风格不勾边，形状靠颜色自己成形；铅笔只用在引线、圈和坐标线上`, `${pencils} pencil lines: this style has no outlines, colour makes the shapes; keep pencil for leaders, rings and axes`));
      for (const k of keys) { const v = held(k); if (v.z > 2.6) { add(k.b, M('推得太近', 'pushed in too far'), M(`${k.b.toFixed(1)} 秒镜头推到 ${v.z.toFixed(1)} 倍：纸纹和水痕边跟着放大。细节用 W.inset（铅笔圈起来的特写）`, `At ${k.b.toFixed(1)} s the camera is at ${v.z.toFixed(1)}×: the paper tooth and the rims are blown up. Show details with W.inset (a pencil-ringed close-up)`)); break; } }
      let fast = null, peak = 0;
      for (let t = 0; t < F.duration; t += 1 / 15) { if (paged(t) || paged(t + 1 / 15)) { fast = null; continue; } const a = camAt(t), b = camAt(t + 1 / 15), sp = (Math.hypot(b.x - a.x, b.y - a.y) * a.z * U) / Math.max(Wd, H) * 15, zs = Math.abs(Math.log(b.z / a.z)) * 15; if (sp > 1.2 || zs > 1.1) { fast ??= t; peak = Math.max(peak, sp); } else if (fast != null) { add(fast, M('镜头太快', 'camera too fast'), M(`${fast.toFixed(1)}–${t.toFixed(1)} 秒镜头每秒移过约 ${peak.toFixed(1)} 个画面：这是在看一张画，镜头慢慢移、慢慢推；换地方用 W.page（换一张纸）`, `${fast.toFixed(1)}–${t.toFixed(1)} s the camera crosses about ${peak.toFixed(1)} frames a second: this is a painting being looked at; move slowly, and change place with W.page (a fresh sheet)`)); fast = null; peak = 0; } }
      const evts = [...keys.flatMap((k) => [k.a, k.b]), ...nodes.flatMap((n) => [n.at, n.lifts ? n.lifts.at : 0, n.until]), ...texts.map((T) => T.at), ...pages.map((p) => p.at)].filter((x) => x > 0 && x < F.duration).sort((a, b) => a - b), vEnd = F.T && F.T.lines ? Math.max(...F.T.lines.map((l) => l.end || 0)) : F.duration;
      for (let i = 1; i < evts.length; i++) if (evts[i] - evts[i - 1] > 6 && evts[i - 1] < vEnd) { add(evts[i - 1], M('画面停太久', 'nothing happens'), M(`${evts[i - 1].toFixed(1)}–${evts[i].toFixed(1)} 秒没有新的一笔：画下一样东西、罩一层颜色、洗掉一块，或者开一个特写`, `${evts[i - 1].toFixed(1)}–${evts[i].toFixed(1)} s no new paint: paint the next thing, glaze, lift, or open an inset`)); break; }
      if (pages.length > Math.max(2, F.duration / 12)) add(pages[0].at, M('换纸太多', 'too many fresh sheets'), M(`换了 ${pages.length} 次纸：大约 12 秒最多一次；同一张画上让颜色接着长、被洗掉、被罩色，镜头慢慢移`, `${pages.length} fresh sheets: about one every 12 s at most; on one sheet let the paint grow, lift and glaze while the camera drifts`));
      let worst = null;
      for (let t = 0.25; t < F.duration; t += 0.5) { const v = camAt(t), n = texts.filter((T) => { if (T.o.chrome || T.o.ghost || T.o.screen || T.o.data || t < T.at || t >= T.until || T.o.register === false) return false; const [x, y] = textPos(T, t); return Math.abs((x - v.x) * v.z * U) < Wd * 0.5 && Math.abs((y - v.y) * v.z * U) < H * 0.5; }).length; if (n > (opt.maxText ?? 8) && (!worst || n > worst.n)) worst = { t, n }; }
      if (worst) add(worst.t, M('字太多', 'too much text'), M(`${worst.t.toFixed(1)} 秒画面上同时有 ${worst.n} 段字：字是画旁边的小注，信息用颜料讲——一排色点、色块的深浅、往上拉的一笔、铅笔圈的特写`, `At ${worst.t.toFixed(1)} s there are ${worst.n} pieces of text on screen: words are small notes beside the painting; tell the information in paint — dabs, the depth of a swatch, a stroke pulled up, a pencil-ringed close-up`));
      return out;
    });

    W.nodes = nodes; W.texts = texts;
    return P.infoKit ? P.infoKit(W, { dabs: 'chart', swatches: 'chart', bars: 'chart', inset: 'annotate', label: 'annotate', number: 'mark', letters: 'mark' }) : W;
  };
})();
