// cutaway.js: Cutaway tour (剖视图解), one of bb-video's visual styles (style notes in styles/cutaway/STYLE.md). Load after promo.js; the page needs a three import map (the starter page has one).
// One complete 3D model of "a thing with insides" (a cell, an eye, the Earth, a volcano, a battery), drawn like a textbook illustration: flat toon colour in two or
// three steps with one highlight, outlines in a darker tone of the fill (never black), white paper outside and a cream interior. The film is one take: the closed
// thing, a hole that grows into a cutaway, then a guided tour — the camera flies to each stop, everything else fades back, the part does one small action that
// shows what it is for, and an information card says its name, what it does, and how the drawing differs from the real thing.
//
//   const C = await PROMO.cutaway(F, { palette, light, line, ss, fade, fadeTo, units: { unit: '毫米', per: 1 } })
//   shapes  C.shape.sphere / ellipsoid / capsule / cylinder / box / pill / offsetSphere / union / bumpy / lobed (a shape = radius as a function of direction)
//   parts   C.shell (thick / solid / skin, with cuts and section faces)   C.tube / C.tubes   C.stack   C.capsule (with folds)   C.grains (instanced, thousands)
//           C.ball / ring / rod / disc / box / cone / lathe   C.flow (beads along a path)   C.group   — every part: { at, rot, in: group, into: part, layer, cut }
//           { glass: 0–1 } makes a part see-through (drawn over the outlined picture); show / hide with mode: 'fade' fades an opaque part through the same pass
//   cuts    const cut = C.cutter({ type: 'cone' | 'plane' | 'wedge', axis, at })   cut.to(t, value, { dur })
//   verbs   part.show / hide / to / pulse / spin / draw   C.show / C.hide (parts or a layer name)   C.explode
//   tour    C.tour([{ at, dur, look, focus, az, el, fill, card: { color, name, what, caveat, at: [t1, t2, t3] }, labels: [{ on, text, at }] }, …])
//   info    C.scaleBar({ of, text, at, until })   C.inset({ on, title, at, until, build: (K) => …, view })   C.plate({ title, sub, note, noteAt, at, x, y, width })
//   frame   C.onFrame((t) => …); finally C.run()
//   checks  reported in --check: a card / label / inset covering the subject, the subject out of frame or too small, the subject too close to the faded ground,
//           a scale bar whose number disagrees with the model, a card without its "how this differs from the real thing" line, card rows nobody is narrating
(function () {
  const P = window.PROMO;
  const MSG = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(MSG('cutaway.js 要在 promo.js 之后加载', 'cutaway.js must load after promo.js'));
  const { E } = P;
  const clamp01 = (x) => Math.max(0, Math.min(1, x)), lerp = (a, b, k) => a + (b - a) * k, r2 = (n) => Math.round(n * 100) / 100, rad = (d) => d * Math.PI / 180;
  const EASE = (e) => (typeof e === 'function' ? e : e === 'lin' ? E.lin : e === 'out' ? E.expoOut : e === 'back' ? E.backOut : e === 'sine' ? E.sine : E.cubicInOut);

  // ---------- Colour: the candy palette of textbook illustration. Colours are display sRGB values and go through the shaders as written ----------
  const PALETTE = { paper: '#FFFFFF', cream: '#FDF2E3', ink: '#1E2030', muted: '#5C6070', white: '#FFFFFF', bone: '#F4EEE2', grey: '#B9BEC8', dark: '#3A3F52',
    peach: '#F7CFA8', orange: '#F29A4E', red: '#E4553D', coral: '#F08C78', pink: '#F383A8', magenta: '#D4347C', purple: '#7B69D8', violet: '#A58CE8', lilac: '#CDBBF1',
    blue: '#5076DA', sky: '#8FCDEB', teal: '#2FA8A1', green: '#3EAE6B', lime: '#B6DD6C', yellow: '#F6D150', gold: '#E8AA31', brown: '#A8744F' };
  const toRGB = (c, pal) => { c = (pal && pal[c]) || PALETTE[c] || c; if (Array.isArray(c)) return c; let m = /^#([0-9a-f]{3})$/i.exec(c); if (m) c = '#' + [...m[1]].map((x) => x + x).join(''); m = /^#([0-9a-f]{6})$/i.exec(c); if (!m) return [0.6, 0.6, 0.6]; const n = parseInt(m[1], 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const toHex = (a) => '#' + a.map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('');
  const mixc = (a, b, k) => [0, 1, 2].map((i) => lerp(a[i], b[i], k)), lumc = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const satc = (c, k) => { const l = lumc(c); return c.map((v) => clamp01(l + (v - l) * k)); };
  const SHADE_K = [0.93, 0.80, 0.80], DEEP_K = [0.80, 0.62, 0.68], LINE_K = [0.42, 0.33, 0.40];   // shadow, deep shadow and outline = the fill, more saturated, times these
  const lineOf = (c) => satc(c, 1.5).map((v, i) => v * LINE_K[i]), shadeOf = (c) => satc(c, 1.22).map((v, i) => v * SHADE_K[i]);

  // ---------- Seeded random and noise ----------
  const rng = (seed = 1) => { let a = (seed * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const h3 = (x, y, z, s) => { const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 53.3) * 43758.5453; return n - Math.floor(n); };
  const vnoise = (x, y, z, s = 0) => { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), f = (v) => v * v * (3 - 2 * v), u = f(x - xi), v = f(y - yi), w = f(z - zi);
    const L = (a, b, k) => a + (b - a) * k, c = (i, j, k) => h3(xi + i, yi + j, zi + k, s);
    return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w); };
  const fbm = (x, y, z, s = 0, oct = 3) => { let a = 0, k = 0.5, n = 0; for (let i = 0; i < oct; i++) { a += k * vnoise(x, y, z, s + i * 7.3); n += k; x *= 2.03; y *= 2.03; z *= 2.03; k *= 0.5; } return a / n; };

  // ---------- Shapes: a shape is the radius as a function of the direction from its centre (x, y, z a unit vector) — anything "star-shaped".
  //   One function gives the surface, its inner wall (radius − thickness), where a cut meets it (the section face) and where grains sit on it ----------
  const SH = {
    sphere: (r = 1) => () => r,
    ellipsoid: (a, b, c) => (x, y, z) => 1 / Math.sqrt(x * x / (a * a) + y * y / (b * b) + z * z / (c * c)),
    // superellipsoid: p = how square (2 = ellipsoid, 8 = a rounded box)
    box: (w, h, d, p = 8) => (x, y, z) => Math.pow(Math.pow(Math.abs(x / (w / 2)), p) + Math.pow(Math.abs(y / (h / 2)), p) + Math.pow(Math.abs(z / (d / 2)), p), -1 / p),
    // pill: round seen from above (radii rx, rz), flat with a rounded rim seen from the side (half-height hy); q = how flat the faces are. A disc, a plate, a coin, a lens-like slab
    pill: (rx, hy, rz = rx, q = 5) => (x, y, z) => Math.pow(Math.pow(x * x / (rx * rx) + z * z / (rz * rz), q / 2) + Math.pow(Math.abs(y / hy), q), -1 / q),
    // capsule along the x axis: radius r, total length len
    capsule: (r, len) => { const h = Math.max(0, len / 2 - r); return (x, y, z) => { const s = Math.sqrt(y * y + z * z); if (s > 1e-6 && Math.abs(x) * (r / s) <= h) return r / s; const b = Math.abs(x) * h; return b + Math.sqrt(Math.max(0, b * b - h * h + r * r)); }; },
    cylinder: (r, h, q = 10) => SH.pill(r, h / 2, r, q),
    // a sphere of radius r centred at c (the origin must be inside it): bulges, domes, a cornea on an eyeball
    offsetSphere: (c, r) => { const cc = c[0] * c[0] + c[1] * c[1] + c[2] * c[2]; return (x, y, z) => { const b = x * c[0] + y * c[1] + z * c[2]; return b + Math.sqrt(Math.max(0, b * b - cc + r * r)); }; },
    union: (...fs) => (x, y, z) => Math.max(...fs.map((f) => f(x, y, z))),
    // noise bumps on any shape: amp = fraction of the radius, freq = how many bumps
    bumpy: (f, amp = 0.08, freq = 2, seed = 1) => (x, y, z) => f(x, y, z) * (1 + amp * 2 * (fbm(x * freq + 11, y * freq + 7, z * freq + 3, seed) - 0.5)),
    // rounded lobes (a lump of dough, a nucleolus, a cauliflower): n lobes of height amp
    lobed: (f, n = 12, amp = 0.2, seed = 1) => { const R = rng(seed), pts = []; for (let i = 0; i < n; i++) { const u = R() * 2 - 1, a = R() * 6.2832, s = Math.sqrt(1 - u * u); pts.push([s * Math.cos(a), u, s * Math.sin(a), 0.7 + 0.6 * R()]); } const k = 1.6 * Math.sqrt(n / 12);
      return (x, y, z) => { let m = 0; for (const p of pts) { const d = x * p[0] + y * p[1] + z * p[2]; m = Math.max(m, p[3] * Math.exp(-(1 - d) * 6 * k)); } return f(x, y, z) * (1 + amp * m); }; },
    // turn a shape made along x so it runs along y or z
    along: (f, axis = 'y') => (axis === 'y' ? (x, y, z) => f(y, x, z) : axis === 'z' ? (x, y, z) => f(z, y, x) : f),
  };

  const VS = `
uniform float uTime, uWig, uId;
uniform mat4 uCutM[2];
#ifdef HAS_COL
in vec3 aCol;
#endif
#ifdef HAS_SUB
in float aSub;
#endif
#ifdef HAS_K
in float aK;
#endif
out vec3 vN; out vec3 vV; out vec3 vP0; out vec3 vP1; out vec3 vCol; out float vK; out float vId;
void main() {
  mat4 mm = modelMatrix; float inst = 0.;
#ifdef USE_INSTANCING
  mm = modelMatrix * instanceMatrix; inst = float(gl_InstanceID);
#endif
  vec4 wp = mm * vec4(position, 1.);
#ifdef USE_INSTANCING
  if (uWig > 0.) { float h = fract(sin(inst * 12.9898) * 43758.5453); wp.xyz += uWig * vec3(sin(uTime * 1.7 + h * 6.283), sin(uTime * 2.1 + h * 17.1), sin(uTime * 1.3 + h * 29.7)); }
#endif
  vec4 mv = viewMatrix * wp;
  vN = mat3(viewMatrix) * (mat3(mm) * normal);
  vV = -mv.xyz;
  vP0 = (uCutM[0] * wp).xyz; vP1 = (uCutM[1] * wp).xyz;
  vCol = vec3(1.);
#ifdef HAS_COL
  vCol = aCol;
#endif
#ifdef USE_INSTANCING_COLOR
  vCol *= instanceColor;
#endif
  vId = uId + mod(inst, 61.);
#ifdef HAS_SUB
  vId += aSub;
#endif
  vK = 0.;
#ifdef HAS_K
  vK = aK;
#endif
  gl_Position = projectionMatrix * mv;
}`;
  const FS = `
layout(location = 0) out highp vec4 pc_fragColor;
layout(location = 1) out highp vec4 gN;
layout(location = 2) out highp vec4 gL;
uniform vec3 uC, uCb, uL, uPaper, uShadeK, uDeepK, uLineK;
uniform float uFadeK, uDim, uFade, uBack, uFlat, uBands, uSpec, uSpT, uTint, uLineW, uDraw;
uniform vec4 uCutA[2]; uniform vec4 uCutB[2];
#ifdef GLASS
uniform sampler2D tDepth; uniform vec2 uRes; uniform float uAlpha;
#endif
in vec3 vN; in vec3 vV; in vec3 vP0; in vec3 vP1; in vec3 vCol; in float vK; in float vId;
float lum(vec3 c) { return dot(c, vec3(.299, .587, .114)); }
vec3 sat(vec3 c, float k) { return clamp(mix(vec3(lum(c)), c, k), 0., 1.); }
// a cut removes part of space: 1 = a cone around an axis (a hole that grows), 2 = everything beyond a plane, 3 / 4 = a wedge between two half-planes
bool gone(vec4 A, vec4 B, vec3 p) {
  if (B.w < .5) return false;
  if (B.w < 1.5) return dot(normalize(p), A.xyz) > A.w;
  if (B.w < 2.5) return dot(p, A.xyz) > A.w;
  bool a = dot(p, A.xyz) > 0., b = dot(p, B.xyz) > 0.;
  return B.w < 3.5 ? (a && b) : (a || b);
}
void main() {
  if (vK > uDraw) discard;
  if (gone(uCutA[0], uCutB[0], vP0) || gone(uCutA[1], uCutB[1], vP1)) discard;
  vec3 n = normalize(vN); bool back = !gl_FrontFacing; if (back) n = -n;
  vec3 base = uC * vCol; float fl = uFlat;
  if (back && uBack > .5) { base = uCb; fl = max(fl, .65); }
  vec3 L = normalize(uL); float ndl = dot(n, L), w = fwidth(ndl) * .8 + 1e-4;
  vec3 c = mix(sat(base, 1.22) * uShadeK, base, smoothstep(.10 - w, .10 + w, ndl));
  if (uBands > 2.5) c = mix(sat(base, 1.35) * uDeepK, c, smoothstep(-.42 - w, -.42 + w, ndl));
  c = mix(c, mix(base, vec3(1.), .42), smoothstep(.70 - w, .70 + w, ndl) * uTint);
  float s = dot(n, normalize(L + normalize(vV))), ws = fwidth(s) * .8 + 1e-4;
  c = mix(c, mix(base, vec3(1.), .86), smoothstep(uSpT - ws, uSpT + ws, s) * uSpec);
  c = mix(c, base, fl);
  vec3 line = sat(base, 1.5) * uLineK;
  // fading back: towards the pale interior colour, a little greyer; the outline goes with it
#ifdef GHOST
  float d = uDim;
#else
  float d = max(uDim, uFade);
#endif
  c = mix(c, mix(uPaper, vec3(lum(c)), .06), d * uFadeK);
  line = mix(line, mix(uPaper, line, .30), d * min(1., uFadeK * 1.2));
#ifdef GLASS
  // glass is drawn over the finished picture: hidden behind whatever is nearer, clearer face-on, denser (and toned like an outline) towards its edge
  if (vV.z > texture(tDepth, gl_FragCoord.xy / uRes).z * 1.002) discard;
  float fr = pow(1. - abs(n.z), 2.2);
  c = mix(c, line, smoothstep(.6, .92, fr) * .85);
#ifdef GHOST
  pc_fragColor = vec4(c, 1. - uFade);   // an opaque part on its way in or out: the same picture, see-through
#else
  pc_fragColor = vec4(c, clamp(uAlpha + (1. - uAlpha) * fr, 0., 1.) * (1. - uFade) * (1. - .45 * uDim));
#endif
#else
  pc_fragColor = vec4(c, 1.);
#endif
  gN = vec4(n.xy, vV.z, vId);
  gL = vec4(line, uLineW);
}`;
  const VS_FS = `out vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
  const FS_BG = `layout(location = 0) out highp vec4 pc_fragColor; layout(location = 1) out highp vec4 gN; layout(location = 2) out highp vec4 gL; uniform vec3 uBg; in vec2 vUv;
void main() { pc_fragColor = vec4(uBg, 1.); gN = vec4(0., 0., 1e5, 0.); gL = vec4(uBg, 0.); }`;
  // Outlines are found on the picture itself: wherever two different things, a jump in depth or a sharp crease meet, the pixel takes the line colour of the nearer one.
  //   So every line has the same width on screen, section faces and thousands of grains get theirs for free, and the line is a dark tone of its own fill
  const FS_EDGE = `layout(location = 0) out highp vec4 pc_fragColor; uniform sampler2D tC; uniform sampler2D tN; uniform sampler2D tL; uniform vec2 uPx; uniform float uR, uDk, uPixK; in vec2 vUv;
void main() {
  vec4 n0 = texture(tN, vUv), l0 = texture(tL, vUv); vec3 c0 = texture(tC, vUv).rgb;
  float d0 = n0.z, nz0 = sqrt(max(0., 1. - dot(n0.xy, n0.xy))), tanT = sqrt(max(0., 1. - nz0 * nz0)) / max(nz0, .12);
  float edge = 0., dn = d0; vec4 ln = l0;
  for (int i = 0; i < 16; i++) {
    float a = float(i) * .3926991, ring = (i % 2 == 0) ? 1. : .5;
    vec2 o = vec2(cos(a), sin(a)) * uPx * uR * ring;
    vec4 n1 = texture(tN, vUv + o), l1 = texture(tL, vUv + o);
    float wgt = n1.z < d0 ? l1.a : l0.a, e = 0.;
    if (abs(n1.w - n0.w) > .5) e = 1.;
    else {
      float thr = min(d0, n1.z) * (uDk + uPixK * uR * ring * tanT * 3.);
      if (abs(n1.z - d0) > thr) e = 1.;
      else if ((wgt > .5 && wgt < .7) || wgt > .9) { float nz1 = sqrt(max(0., 1. - dot(n1.xy, n1.xy))); if (dot(vec3(n0.xy, nz0), vec3(n1.xy, nz1)) < .5) e = 1.; }
    }
    if (wgt < (ring > .75 ? .7 : .3)) e = 0.;
    if (e > 0. && n1.z < dn) { dn = n1.z; ln = l1; }
    edge = max(edge, e);
  }
  pc_fragColor = vec4(mix(c0, ln.rgb, edge), 1.);
}`;
  const FS_BLIT = `layout(location = 0) out highp vec4 pc_fragColor; uniform sampler2D tC; in vec2 vUv; void main() { pc_fragColor = vec4(texture(tC, vUv).rgb, 1.); }`;

  P.cutaway = async function (F, opt = {}) {
    const THREE = await import('three');
    const W0 = F.W, H0 = F.H, PT = F.portrait, SQ = Math.abs(W0 - H0) < 2, u = F.px(1);
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const toV = (p) => (p && p.isVector3 ? p.clone() : Array.isArray(p) ? V3(p[0], p[1], p[2] ?? 0) : V3(0, 0, 0));
    const pal = { ...PALETTE, ...(opt.palette || {}) }, rgb = (c) => toRGB(c, pal), hex = (c) => toHex(rgb(c));
    const FONT = (F.theme.fonts && F.theme.fonts.sans) || 'sans-serif', INK = hex('ink'), MUTED = hex('muted');
    F.blurBase?.(opt.blur ?? 1);   // slow glides and crisp lines: one render per frame
    const SS = opt.ss ?? 2;         // supersampling: the model is drawn at SS× and averaged down (that is the antialiasing)
    const C = { THREE, V3, W: W0, H: H0, portrait: PT, square: SQ, shape: SH, rng, noise: fbm, pal, hex };
    const units = { unit: '', per: 1, ...(opt.units || {}) };   // 1 model unit = `per` of `unit` in the real thing

    // ---------- Renderer and passes ----------
    const canvas = P.el('canvas', `left:0;top:0;width:${W0}px;height:${H0}px`, F.layer('', 1));
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(W0, H0, false); renderer.autoClear = false; renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    const f32 = !!renderer.getContext().getExtension('EXT_color_buffer_float');
    const mkTargets = (w, h) => {
      const a = new THREE.WebGLRenderTarget(w, h, { count: 3, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
      a.textures[1].type = f32 ? THREE.FloatType : THREE.HalfFloatType;
      const b = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
      return { a, b, w, h };
    };
    const G = { uL: { value: V3(...(opt.light ?? [-0.5, 0.62, 0.6])).normalize() }, uPaper: { value: V3(...rgb(opt.fadeTo ?? 'cream')) }, uTime: { value: 0 },
      uShadeK: { value: V3(...SHADE_K) }, uDeepK: { value: V3(...DEEP_K) }, uLineK: { value: V3(...LINE_K) }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uFadeK: { value: opt.fade ?? 0.62 } };
    const fsScene = new THREE.Scene(), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; fsScene.add(quad);
    const fsMat = (fs, uniforms) => new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS_FS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
    const bgMat = fsMat(FS_BG, { uBg: { value: V3(...rgb(opt.bg ?? 'paper')) } });
    const edgeMat = fsMat(FS_EDGE, { tC: { value: null }, tN: { value: null }, tL: { value: null }, uPx: { value: new THREE.Vector2() }, uR: { value: 1 }, uDk: { value: opt.depthEdge ?? 0.022 }, uPixK: { value: 0 } });
    const blitMat = fsMat(FS_BLIT, { tC: { value: null } });
    const LINE_PX = opt.line ?? 2.6;   // outline width in px at 1080p
    const renderWorld = (Wd, cam, T, bg) => {
      renderer.setRenderTarget(T.a); renderer.setViewport(0, 0, T.w, T.h); renderer.setScissorTest(false); renderer.clear(true, true, true);
      bgMat.uniforms.uBg.value.set(...bg); quad.material = bgMat; renderer.render(fsScene, fsCam);
      renderer.render(Wd.scene, cam);
      const U = edgeMat.uniforms; U.tC.value = T.a.textures[0]; U.tN.value = T.a.textures[1]; U.tL.value = T.a.textures[2]; U.uPx.value.set(1 / T.w, 1 / T.h);
      U.uR.value = LINE_PX * u * SS / 2; U.uPixK.value = 2 * Math.tan(rad(cam.fov) / 2) / T.h;
      renderer.setRenderTarget(T.b); quad.material = edgeMat; renderer.render(fsScene, fsCam);
      // glass parts go on top of the outlined picture
      if (Wd.glass) { G.tDepth.value = T.a.textures[1]; G.uRes.value.set(T.w, T.h); cam.layers.set(1); renderer.render(Wd.scene, cam); cam.layers.set(0); }
    };
    const blit = (T, x, y, w, h) => { renderer.setRenderTarget(null); renderer.setViewport(x, H0 - y - h, w, h); renderer.setScissor(x, H0 - y - h, w, h); renderer.setScissorTest(true); blitMat.uniforms.tC.value = T.b.texture; quad.material = blitMat; renderer.render(fsScene, fsCam); renderer.setScissorTest(false); };

    // ---------- Geometry from a shape function ----------
    // A sphere grid pushed out to f(direction); normals from the function itself (no seams). paint(x, y, z) → colour per vertex
    const dirOf = (th, ph) => { const s = Math.sin(th); return [s * Math.cos(ph), Math.cos(th), s * Math.sin(ph)]; };
    const starGeo = (f, nu = 96, nv = 64, paint = null, post = null) => {
      const n = (nu + 1) * (nv + 1), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = paint ? new Float32Array(n * 3) : null, idx = [];
      const at = (th, ph) => { const d = dirOf(th, ph), r = f(d[0], d[1], d[2]); let p = [d[0] * r, d[1] * r, d[2] * r]; if (post) p = post(p); return p; };
      const e = 2e-3;
      for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
        const th = Math.PI * Math.min(1 - 1e-4, Math.max(1e-4, j / nv)), ph = 2 * Math.PI * i / nu, k = (j * (nu + 1) + i) * 3, p = at(th, ph), a = at(th + e, ph), b = at(th, ph + e / Math.sin(th)), d = dirOf(th, ph);
        const ax = a[0] - p[0], ay = a[1] - p[1], az = a[2] - p[2], bx = b[0] - p[0], by = b[1] - p[1], bz = b[2] - p[2];
        let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        if (!post && nx * d[0] + ny * d[1] + nz * d[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
        pos.set(p, k); nor.set([nx, ny, nz], k);
        if (col) col.set(paint(d[0], d[1], d[2]), k);
      }
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); if (col) g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
      if (post) { // a deformed shape: outward is no longer "away from the centre", so orient the normals by the faces' winding
        g.computeVertexNormals(); const N = g.attributes.normal; for (let j = 0; j <= nv; j++) { const a = j * (nu + 1), b = a + nu, x = N.getX(a) + N.getX(b), y = N.getY(a) + N.getY(b), z = N.getZ(a) + N.getZ(b), l2 = Math.hypot(x, y, z) || 1; N.setXYZ(a, x / l2, y / l2, z / l2); N.setXYZ(b, x / l2, y / l2, z / l2); } }
      return g;
    };
    // merge geometries (same attributes) into one, optionally tagging each with a sub-id (so pieces of one mesh still get outlines between them) and a colour
    const mergeGeo = (list) => {
      let nV = 0, nI = 0; for (const it of list) { nV += it.g.attributes.position.count; nI += it.g.index.count; }
      const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), col = new Float32Array(nV * 3), sub = new Float32Array(nV), kk = new Float32Array(nV), idx = new Uint32Array(nI); let v0 = 0, i0 = 0;
      list.forEach((it, n) => { const g = it.g, c = g.attributes.position.count; pos.set(g.attributes.position.array, v0 * 3); nor.set(g.attributes.normal.array, v0 * 3);
        const cc = it.color ?? [1, 1, 1]; for (let i = 0; i < c; i++) { col.set(g.attributes.aCol ? [g.attributes.aCol.getX(i), g.attributes.aCol.getY(i), g.attributes.aCol.getZ(i)] : cc, (v0 + i) * 3); sub[v0 + i] = it.sub ?? n; kk[v0 + i] = g.attributes.aK ? g.attributes.aK.getX(i) : 0; }
        const ia = g.index.array; for (let i = 0; i < ia.length; i++) idx[i0 + i] = ia[i] + v0; v0 += c; i0 += ia.length; });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSub', new THREE.BufferAttribute(sub, 1)); g.setAttribute('aK', new THREE.BufferAttribute(kk, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1));
      return g;
    };
    // a tube along a smooth curve through pts: r (number or k → radius), flat (0–1 squashes it into a ribbon), rounded ends; aK = 0…1 along its length (for drawing it on)
    const tubeGeo = (pts, o = {}) => {
      const curve = o.straight ? (() => { const cp = new THREE.CurvePath(), Q = pts.map(toV); for (let i = 0; i < Q.length - 1; i++) cp.add(new THREE.LineCurve3(Q[i], Q[i + 1])); return cp; })() : new THREE.CatmullRomCurve3(pts.map(toV), !!o.closed, 'centripetal'), len = curve.getLength(), rr = typeof o.r === 'function' ? o.r : () => o.r ?? 0.1, r0 = rr(0.5);
      const n = Math.max(6, Math.min(o.seg ?? Math.round(len / Math.max(0.02, r0 * 0.9)), 600)), sides = o.sides ?? 10, fr = curve.computeFrenetFrames(n, !!o.closed), flat = 1 - (o.flat ?? 0), rings = [];
      const ring = (c, N, B, r, k) => rings.push({ c, N, B, r, k });
      const cap = (i, sgn) => { const c = curve.getPointAt(i ? 1 : 0), T = fr.tangents[i ? n : 0], r = rr(i ? 1 : 0); const list = [30, 60, 88].map((a) => ({ c: c.clone().addScaledVector(T, sgn * r * Math.sin(rad(a)) * flat), N: fr.normals[i ? n : 0], B: fr.binormals[i ? n : 0], r: r * Math.cos(rad(a)), k: i ? 1 : 0 })); return sgn < 0 ? list.reverse() : list; };
      if (!o.closed) for (const c of cap(0, -1)) rings.push(c);
      for (let i = 0; i <= n; i++) ring(curve.getPointAt(i / n), fr.normals[i], fr.binormals[i], rr(i / n), i / n);
      if (!o.closed) for (const c of cap(1, 1)) rings.push(c);
      const nR = rings.length, pos = new Float32Array(nR * (sides + 1) * 3), nor = new Float32Array(nR * (sides + 1) * 3), kk = new Float32Array(nR * (sides + 1)), idx = [];
      rings.forEach((R, j) => { for (let i = 0; i <= sides; i++) { const a = 2 * Math.PI * i / sides, ca = Math.cos(a), sa = Math.sin(a), k = (j * (sides + 1) + i) * 3;
        const nx = R.N.x * ca + R.B.x * sa * flat, ny = R.N.y * ca + R.B.y * sa * flat, nz = R.N.z * ca + R.B.z * sa * flat;
        pos.set([R.c.x + nx * R.r, R.c.y + ny * R.r, R.c.z + nz * R.r], k); kk[j * (sides + 1) + i] = R.k; } });
      for (let j = 0; j < nR - 1; j++) for (let i = 0; i < sides; i++) { const a = j * (sides + 1) + i, b = a + 1, c = a + sides + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('aK', new THREE.BufferAttribute(kk, 1)); g.setIndex(idx); g.computeVertexNormals();
      // close the seam (first and last vertex of each ring share a position)
      const N = g.attributes.normal; for (let j = 0; j < nR; j++) { const a = j * (sides + 1), b = a + sides, x = N.getX(a) + N.getX(b), y = N.getY(a) + N.getY(b), z = N.getZ(a) + N.getZ(b), l = Math.hypot(x, y, z) || 1; N.setXYZ(a, x / l, y / l, z / l); N.setXYZ(b, x / l, y / l, z / l); }
      // which way is out: flip the winding if the normals point at the centreline
      const P0 = rings[Math.floor(nR / 2)], k0 = Math.floor(nR / 2) * (sides + 1); if ((pos[k0 * 3] - P0.c.x) * N.getX(k0) + (pos[k0 * 3 + 1] - P0.c.y) * N.getY(k0) + (pos[k0 * 3 + 2] - P0.c.z) * N.getZ(k0) < 0) { const ia = g.index.array; for (let i = 0; i < ia.length; i += 3) { const t = ia[i + 1]; ia[i + 1] = ia[i + 2]; ia[i + 2] = t; } g.computeVertexNormals(); for (let j = 0; j < nR; j++) { const a = j * (sides + 1), b = a + sides, x = N.getX(a) + N.getX(b), y = N.getY(a) + N.getY(b), z = N.getZ(a) + N.getZ(b), l = Math.hypot(x, y, z) || 1; N.setXYZ(a, x / l, y / l, z / l); N.setXYZ(b, x / l, y / l, z / l); } }
      g.userData.curve = curve; return g;
    };

    // ---------- A world: the model and everything in it. The film has one; each close-up inset has its own small one, built with the same kit ----------
    let idN = 0; const nextId = () => { idN += 64; return f32 ? idN : idN % 1984 + 64; };
    const ZERO4 = new THREE.Vector4(0, 0, 0, 0), IDM = new THREE.Matrix4();
    const LINEW = { none: 0, thin: 0.4, 'thin+crease': 0.6, full: 0.8, 'full+crease': 1 };
    const makeWorld = (wname) => {
      const Wd = { name: wname, scene: new THREE.Scene(), parts: [], cutters: [], caps: [], flows: [], lives: [], fns: [] };
      const K = { world: Wd, shape: SH, V3, THREE, rng, noise: fbm };
      const place = (g, o) => { if (o.at) g.position.copy(toV(o.at)); if (o.rot) g.rotation.set(rad(o.rot[0] ?? 0), rad(o.rot[1] ?? 0), rad(o.rot[2] ?? 0)); if (o.scale !== undefined) { const s = Array.isArray(o.scale) ? o.scale : [o.scale, o.scale, o.scale]; g.scale.set(s[0], s[1], s[2]); } };
      // a part: one thing the tour can look at, fade, show, hide and move. { into: part } adds pieces to an existing part instead of making a new one
      const host = (o, kind) => {
        const g = new THREE.Group(); place(g, o);
        if (o.into) { o.into.g.add(g); return { part: o.into, g, sub: true }; }
        (o.in ? o.in.g : Wd.scene).add(g);
        const part = { isPart: true, kind, name: o.name ?? `${kind}${Wd.parts.length}`, g, parent: o.in ?? null, layer: o.layer ?? null, u: { uDim: { value: 0 }, uFade: { value: 0 } }, mats: [], color: rgb(o.color ?? 'grey'),
          vis: [], keys: [], pulses: [], spins: [], draws: [], hidden: !!o.hidden, nodim: !!o.nodim, cl: V3(0, 0, 0), rad0: 0.5, Wd };
        part.show = (at, o2 = {}) => { part.vis.push({ at, on: true, mode: o2.mode ?? 'pop', dur: o2.dur ?? 0.45 }); part.vis.sort((a, b) => a.at - b.at); if (o2.sfx !== false && Wd === W0d) F.sfx(at, 'pop', o2.gain ?? 0.3); return part; };
        part.hide = (at, o2 = {}) => { part.vis.push({ at, on: false, mode: o2.mode ?? 'pop', dur: o2.dur ?? 0.3 }); part.vis.sort((a, b) => a.at - b.at); return part; };
        // move / turn / resize: part.to(t, { pos | by, rot (degrees), scale, dur, ease }) — each key starts from where the last one ended
        part.to = (at, k = {}) => { part.keys.push({ at, dur: k.dur ?? 0.8, ease: EASE(k.ease), pos: k.pos ? toV(k.pos) : null, by: k.by ? toV(k.by) : null, rot: k.rot ? k.rot.map(rad) : null, scale: k.scale === undefined ? null : Array.isArray(k.scale) ? k.scale : [k.scale, k.scale, k.scale] }); part.keys.sort((a, b) => a.at - b.at); return part; };
        part.pulse = (at, k = {}) => { part.pulses.push({ at, amt: k.amt ?? 0.12, dur: k.dur ?? 0.6, n: k.n ?? 1 }); return part; };
        part.spin = (at, until, k = {}) => { part.spins.push({ at, until: until ?? 1e9, axis: toV(k.axis ?? [0, 1, 0]).normalize(), rpm: k.rpm ?? 6 }); return part; };
        // draw a tube on from its start: part.draw(t, { dur, from, to }) — from / to (0–1 of its length) draw it in stages (a beam that advances stop by stop)
        part.draw = (at, k = {}) => { part.draws.push({ at, dur: k.dur ?? 1, until: k.until ?? 1e9, ease: EASE(k.ease ?? 'sine'), from: k.from ?? 0, to: k.to ?? 1 }); part.draws.sort((a, b) => a.at - b.at); if (k.sfx !== false && Wd === W0d) F.sfx(at, 'draw', k.gain ?? 0.3, { dur: k.dur ?? 1 }); return part; };
        part.center = () => part.g.localToWorld(part.cl.clone());
        part.radius = () => part.rad0 * Math.max(part.g.scale.x, 1e-3) * (part.parent ? part.parent.g.scale.x : 1);
        // a point that moves with the part: part.p([x, y, z]) in the part's own coordinates → a function of t giving the world position (for labels, insets, camera)
        part.p = (local) => { const v = toV(local); return () => part.g.localToWorld(v.clone()); };
        part.base = null;
        if (o.showAt !== undefined) { part.hidden = true; part.show(o.showAt, o.showOpt || {}); }
        Wd.parts.push(part); return { part, g, sub: false };
      };
      const fit = (part) => {
        part.g.updateWorldMatrix(true, true); const box = new THREE.Box3(), b2 = new THREE.Box3();
        part.g.traverse((m) => { if (!m.isMesh || m.userData.nobound) return; if (m.isInstancedMesh) { m.computeBoundingBox(); b2.copy(m.boundingBox); } else { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); b2.copy(m.geometry.boundingBox); } b2.applyMatrix4(m.matrixWorld); box.union(b2); });
        if (box.isEmpty()) return part; const c = box.getCenter(V3(0, 0, 0)), s = box.getSize(V3(0, 0, 0));
        part.cl = part.g.worldToLocal(c.clone()); part.rad0 = Math.max(s.x, s.y, s.z) / 2 * 1.04 / Math.max(1e-6, part.g.getWorldScale(V3(0, 0, 0)).x) * part.g.scale.x; part.base = { p: part.g.position.clone(), q: part.g.quaternion.clone(), s: part.g.scale.clone() };
        return part;
      };
      const mat = (part, color, o = {}) => {
        const cuts = (o.cut ? (Array.isArray(o.cut) ? o.cut : [o.cut]) : []).filter(Boolean).slice(0, 2), c = rgb(color);
        const m = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: FS, side: o.side ?? (cuts.length || o.back !== undefined ? THREE.DoubleSide : THREE.FrontSide),
          defines: { ...(o.vc ? { HAS_COL: 1 } : {}), ...(o.sub ? { HAS_SUB: 1 } : {}), ...(o.k ? { HAS_K: 1 } : {}), ...(o.glass ? { GLASS: 1 } : {}), ...(o.ghost ? { GHOST: 1 } : {}) },
          ...(o.glass ? { transparent: true, depthTest: false, depthWrite: false } : {}),
          uniforms: { uC: { value: V3(...(o.vc ? [1, 1, 1] : c)) }, uCb: { value: V3(...rgb(o.back ?? toHex(mixc(o.vc ? rgb(o.base ?? 'grey') : c, [1, 1, 1], 0.45)))) }, uBack: { value: o.back !== undefined || (cuts.length && o.side === undefined) ? 1 : 0 },
            uFlat: { value: o.flat ?? 0 }, uBands: { value: o.bands ?? 3 }, uSpec: { value: o.spec ?? 1 }, uSpT: { value: o.specT ?? 0.94 }, uTint: { value: o.tint ?? 1 }, uLineW: { value: LINEW[o.line ?? 'full'] ?? 0.8 }, uDraw: { value: 2 }, uWig: { value: o.wiggle ?? 0 }, uId: { value: nextId() },
            uDim: part.u.uDim, uFade: part.u.uFade, uAlpha: { value: typeof o.glass === 'number' ? o.glass : 0.35 }, tDepth: G.tDepth, uRes: G.uRes, uFadeK: G.uFadeK, uL: G.uL, uPaper: G.uPaper, uShadeK: G.uShadeK, uDeepK: G.uDeepK, uLineK: G.uLineK, uTime: G.uTime,
            uCutA: { value: [cuts[0] ? cuts[0].A : ZERO4, cuts[1] ? cuts[1].A : ZERO4] }, uCutB: { value: [cuts[0] ? cuts[0].B : ZERO4, cuts[1] ? cuts[1].B : ZERO4] }, uCutM: { value: [cuts[0] ? cuts[0].M : IDM, cuts[1] ? cuts[1].M : IDM] } } });
        if (o.glass) { m.userData.glass = true; Wd.glass = true; }
        m.userData.spec = [color, o];
        part.mats.push(m); return m;
      };
      const add = (h, geo, m, o = {}) => { const me = new THREE.Mesh(geo, m); if (m.userData.glass) me.layers.set(1); if (o.nobound) { me.userData.nobound = true; me.frustumCulled = false; } h.g.add(me); return me; };
      K.mat = mat; K.fit = fit;
      // fading an opaque part in or out: for the length of the fade its meshes are swapped for see-through twins drawn in the glass pass
      const ghostsOf = (part) => {
        if (part.ghosts) return part.ghosts; part.ghosts = [];
        const list = []; part.g.traverse((m) => { if (m.isMesh && !m.material.userData.glass && !m.userData.ghost) list.push(m); });
        for (const m of list) { const [color, o] = m.material.userData.spec, gm = mat(part, color, { ...o, glass: 1, ghost: true }), tw = m.clone(); tw.material = gm; tw.layers.set(1); tw.userData.ghost = true; tw.userData.nobound = true; tw.frustumCulled = false; tw.visible = false; m.parent.add(tw);
          if (part.drawMats && part.drawMats.includes(m.material)) part.drawMats.push(gm); part.ghosts.push([m, tw]); }
        return part.ghosts;
      };

      // group: parts made with { in: group } move, turn and scale with it (an eye that turns, a lid that lifts). It has the same to / spin / pulse verbs
      K.group = (o = {}) => { const h = host(o, 'group'); h.part.isGroup = true; h.part.base = { p: h.g.position.clone(), q: h.g.quaternion.clone(), s: h.g.scale.clone() }; return h.part; };
      const kidsOf = (grp) => Wd.parts.filter((p) => { for (let q = p.parent; q; q = q.parent) if (q === grp) return true; return false; });

      // ---------- Cuts: what a cutter removes from every part that names it ({ cut }) ----------
      //   cone: a hole around `axis` that grows with the half-angle in degrees (0 closed … 90 half gone … 180 all gone)
      //   plane: everything beyond the plane with normal `axis`, value = how far the plane sits from the centre along it (start beyond the surface, bring it to 0 to halve the thing)
      //   wedge: a slice between two half-planes that meet on `axis`, starting at direction `from`, value = opening in degrees (90 = a quarter taken out)
      K.cutter = (o = {}) => {
        const g = new THREE.Group(); if (o.at) g.position.copy(toV(o.at)); (o.in ? o.in.g : Wd.scene).add(g);
        const axis = toV(o.axis ?? [0, 0, 1]).normalize(), ref = Math.abs(axis.y) < 0.9 ? V3(0, 1, 0) : V3(1, 0, 0), e1 = toV(o.from ?? ref.clone().cross(axis)).addScaledVector(axis, -toV(o.from ?? ref.clone().cross(axis)).dot(axis)).normalize(), e2 = axis.clone().cross(e1).normalize();
        const cut = { isCutter: true, type: o.type ?? 'cone', g, axis, e1, e2, v0: o.value ?? (o.type === 'plane' ? 1e4 : 0), keys: [], A: new THREE.Vector4(), B: new THREE.Vector4(), M: new THREE.Matrix4(), val: null };
        cut.to = (at, value, k = {}) => { cut.keys.push({ at, to: value, dur: k.dur ?? 1.6, ease: EASE(k.ease) }); cut.keys.sort((a, b) => a.at - b.at); if (k.sfx !== false && Wd === W0d) F.sfx(at, 'open', k.gain ?? 0.55, { dur: k.dur ?? 1.6 }); return cut; };
        cut.valueAt = (t) => { let v = cut.v0; for (const k of cut.keys) { if (t < k.at) break; v = lerp(v, k.to, k.ease(clamp01((t - k.at) / k.dur))); } return v; };
        // is this point (in the cutter's own coordinates) cut away at value v?
        cut.gone = (p, v = cut.val) => { if (cut.type === 'cone') return v > 0.2 && p.clone().normalize().dot(axis) > Math.cos(rad(v)); if (cut.type === 'plane') return p.dot(axis) > v; if (v <= 0.2) return false; const a = p.dot(cut.w1) > 0, b = p.dot(cut.w2) > 0; return v <= 180 ? a && b : a || b; };
        cut.set = (v) => {
          cut.val = v; cut.M.copy(g.matrixWorld).invert();
          if (cut.type === 'cone') { cut.A.set(axis.x, axis.y, axis.z, Math.cos(rad(Math.min(v, 180)))); cut.B.w = v > 0.2 ? 1 : 0; }
          else if (cut.type === 'plane') { cut.A.set(axis.x, axis.y, axis.z, v); cut.B.w = 2; }
          else { const w1 = e2.clone(), u2 = e1.clone().multiplyScalar(Math.cos(rad(v))).addScaledVector(e2, Math.sin(rad(v))), w2 = axis.clone().cross(u2).negate(); cut.w1 = w1; cut.w2 = w2; cut.u2 = u2; cut.A.set(w1.x, w1.y, w1.z, 0); cut.B.set(w2.x, w2.y, w2.z, v <= 0.2 ? 0 : v <= 180 ? 3 : 4); }
        };
        cut.set(cut.v0); Wd.cutters.push(cut); return cut;
      };
      // ---------- Shell: the workhorse. A surface from a shape function —
      //   thickness > 0: a wall with an inside (outer skin, inner wall in the `inner` colour, section faces where it is cut, in `rim` bands)
      //   solid: true: solid all the way in (the section face runs to the centre: a planet's layers, a lens, a fruit)
      //   neither: a thin skin (the back shows the `inner` colour)
      //   { shape, r, thickness, solid, color, inner, rim: [colours, inside → outside], paint: (x, y, z) => colour, cut: cutter | [two], seg: [around, down] } ----------
      K.shell = (o = {}) => {
        const h = host(o, 'shell'), part = h.part, f = typeof o.shape === 'function' ? o.shape : SH.sphere(o.r ?? 1), th = o.thickness ?? 0, solid = !!o.solid, seg = o.seg ?? [96, 64];
        const fin = solid ? () => 0 : th > 0 ? (x, y, z) => Math.max(0, f(x, y, z) - th) : null, cuts = (o.cut ? (Array.isArray(o.cut) ? o.cut : [o.cut]) : []).filter(Boolean), c = rgb(o.color ?? 'grey');
        const paint = o.paint ? (x, y, z) => rgb(o.paint(x, y, z) ?? o.color ?? 'grey') : null, inner = o.inner ?? 'cream', mo = { cut: cuts, bands: o.bands, spec: o.spec, tint: o.tint, line: o.line, flat: o.flat, glass: o.glass };
        add(h, starGeo(f, seg[0], seg[1], paint), mat(part, o.color ?? 'grey', { ...mo, vc: !!paint, base: o.color, ...(fin ? { side: THREE.FrontSide } : { back: inner }) }));
        if (fin && !solid) add(h, starGeo(fin, seg[0], seg[1]), mat(part, inner, { cut: cuts, side: THREE.BackSide, bands: 2, spec: 0, tint: 0, line: o.line, glass: o.glass }));
        let rmax = 0; for (let j = 1; j < 12; j++) for (let i = 0; i < 16; i++) { const d = dirOf(Math.PI * j / 12, Math.PI * i / 8); rmax = Math.max(rmax, f(d[0], d[1], d[2])); }
        if (!h.sub) { part.f = f; part.fin = fin ?? f; part.rmax = rmax; part.color = c; }
        // a point on the surface in direction dir (lift > 0 above it, < 0 below; side: 'in' = on the inner wall): for labels, grains, vessels on a wall
        const surf = (dir, lift = 0, side = 'out') => { const d = toV(dir).normalize(), r = (side === 'in' && fin ? fin : f)(d.x, d.y, d.z) + lift; return d.multiplyScalar(r); };
        if (!h.sub) { part.surf = surf; part.on = (dir, lift = 0, side = 'out') => { const v = surf(dir, lift, side); return () => part.g.localToWorld(v.clone()); }; }
        // section faces: where a cutter's surface (a cone, a plane, the two half-planes of a wedge) passes through the wall, found by walking rays along that surface.
        //   Works wherever the cutter sits — its centre need not be the shape's own (a lens cut by the eyeball's cutter)
        const wallAt = (x, y, z) => { const l = Math.hypot(x, y, z); if (l < 1e-9) return fin(0, 1, 0) <= 0; const ix = x / l, iy = y / l, iz = z / l; return l < f(ix, iy, iz) && l >= fin(ix, iy, iz); };
        const intervals = (o0, v, smax, dom) => {
          const n = 64, at = (sd) => { const x = o0.x + v.x * sd, y = o0.y + v.y * sd, z = o0.z + v.z * sd; return wallAt(x, y, z) && (!dom || dom(x, y, z)); }, res = [];
          const refine = (lo, hi, sLo) => { for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (at(m) === sLo) lo = m; else hi = m; } return (lo + hi) / 2; };
          let prev = at(0), a = prev ? 0 : -1, sp = 0;
          for (let k = 1; k <= n; k++) { const sd = smax * k / n, cur = at(sd); if (cur !== prev) { const b = refine(sp, sd, prev); if (cur) a = b; else { res.push([a, b]); a = -1; if (res.length === 2) break; } } prev = cur; sp = sd; }
          if (a >= 0 && res.length < 2 && prev) res.push([a, smax]);
          return res;
        };
        if (fin && o.caps !== false) for (const cut of cuts) {
          if ((o.nocap || []).includes(cut)) continue;
          const rim = (o.rim ?? [toHex(mixc(c, rgb(inner), 0.62)), toHex(c), toHex(shadeOf(c))]).map((x) => (typeof x === 'object' && !Array.isArray(x) ? x : { color: x, w: 1 })), wsum = rim.reduce((s2, x) => s2 + x.w, 0);
          let acc = 0; const fr = rim.map((x) => { const a = acc / wsum; acc += x.w; return [a, acc / wsum, rgb(x.color)]; });
          const N = 96, strips = cut.type === 'wedge' ? 2 : 1, IV = 2, nb = fr.length, per = 2 * (N + 1), nV = strips * IV * nb * per;
          const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), col = new Float32Array(nV * 3), sub = new Float32Array(nV), idx = [];
          const slot = (s2, k, b) => ((s2 * IV + k) * nb + b) * per;
          for (let s2 = 0; s2 < strips; s2++) for (let k = 0; k < IV; k++) for (let b = 0; b < nb; b++) { const v0 = slot(s2, k, b); for (let i = 0; i <= N; i++) for (let e = 0; e < 2; e++) { col.set(fr[b][2], (v0 + i * 2 + e) * 3); sub[v0 + i * 2 + e] = 1 + (s2 * IV + k) * nb + b; } for (let i = 0; i < N; i++) { const a = v0 + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSub', new THREE.BufferAttribute(sub, 1)); g.setIndex(idx);
          const others = cuts.filter((x) => x !== cut), me = add(h, g, mat(part, 'white', { vc: true, sub: true, flat: 1, spec: 0, tint: 0, side: THREE.DoubleSide, cut: others, line: o.line, glass: o.glass }), { nobound: true });
          const M = new THREE.Matrix4(), tmp = V3(0, 0, 0);
          Wd.caps.push({ cut, ver: null, g: h.g, update: () => {
            const v = cut.val, faces = []; M.copy(h.g.matrixWorld).invert().multiply(cut.g.matrixWorld);
            const c0 = V3(0, 0, 0).applyMatrix4(M), tv = (d) => d.clone().transformDirection(M), ax = tv(cut.axis), E1 = tv(cut.e1), E2 = tv(cut.e2), rel = c0.clone().negate();
            const ring = (A, B, a0 = 0, a1 = 2 * Math.PI) => Array.from({ length: N + 1 }, (_, i) => { const a = lerp(a0, a1, i / N); return A.clone().multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a)); });
            if (cut.type === 'cone') { if (v > 0.2 && v < 179.8) { const ct = Math.cos(rad(v)), st = Math.sin(rad(v)), perp = rel.clone().addScaledVector(ax, -rel.dot(ax)), dp = perp.length(); let a0 = 0, a1 = 2 * Math.PI;
              if (dp > rmax * 1.05) { const pc = Math.atan2(perp.dot(E2), perp.dot(E1)), dl = Math.asin(Math.min(1, rmax * 1.1 / dp)) / Math.max(0.2, st); if (dl < Math.PI) { a0 = pc - dl; a1 = pc + dl; } }
              const rd = ring(E1, E2, a0, a1); faces.push({ o: c0, dirs: rd.map((r) => ax.clone().multiplyScalar(ct).addScaledVector(r, st)), ns: rd.map((r) => ax.clone().multiplyScalar(st).addScaledVector(r, -ct)), smax: rel.length() + rmax * 1.05, dom: null }); } }
            else if (cut.type === 'plane') { const p0 = c0.clone().addScaledVector(ax, v), o0 = ax.clone().multiplyScalar(p0.dot(ax)); faces.push({ o: o0, dirs: ring(E1, E2), ns: null, n: ax, smax: rmax * 2.1, dom: null }); }
            else if (v > 0.2) for (const [uu, w] of [[cut.e1, cut.w1], [cut.u2, cut.w2]]) { const U = tv(uu), o0 = c0.clone().addScaledVector(ax, rel.dot(ax)).addScaledVector(U, Math.max(rel.dot(U), rmax * 1e-3)); faces.push({ o: o0, dirs: ring(ax, U), ns: null, n: tv(w), smax: rmax * 2.1, dom: (x, y, z) => (x - c0.x) * U.x + (y - c0.y) * U.y + (z - c0.z) * U.z >= 0 }); }
            const oM = others.map((x) => new THREE.Matrix4().copy(x.g.matrixWorld).invert().multiply(h.g.matrixWorld)); let any = false;
            for (let s2 = 0; s2 < strips; s2++) { const Fc = faces[s2];
              const ivs = Fc ? Fc.dirs.map((d) => intervals(Fc.o, d, Fc.smax, Fc.dom).filter(([a, b]) => { if (!others.length) return true; tmp.copy(Fc.o).addScaledVector(d, (a + b) / 2); return !others.some((x, q) => x.gone(tmp.clone().applyMatrix4(oM[q]))); })) : [];
              for (let k = 0; k < IV; k++) { const has = ivs.map((x) => !!x[k]); const near = (i) => { for (let dlt = 1; dlt <= N; dlt++) { if (i - dlt >= 0 && has[i - dlt]) return i - dlt; if (i + dlt <= N && has[i + dlt]) return i + dlt; } return -1; };
                for (let b = 0; b < nb; b++) { const v0 = slot(s2, k, b); for (let i = 0; i <= N; i++) { const kk = (v0 + i * 2) * 3; let j = i, pinch = false; if (!Fc || !has[i]) { j = Fc ? near(i) : -1; pinch = true; } if (j < 0) { pos.fill(0, kk, kk + 6); continue; } any = true;
                  const d = Fc.dirs[j], [a, b2] = ivs[j][k], nn = Fc.ns ? Fc.ns[j] : Fc.n;
                  for (let e = 0; e < 2; e++) { const sd = pinch ? (a + b2) / 2 : lerp(a, b2, fr[b][e]); pos.set([Fc.o.x + d.x * sd, Fc.o.y + d.y * sd, Fc.o.z + d.z * sd], kk + e * 3); nor.set([nn.x, nn.y, nn.z], kk + e * 3); } } } } }
            me.userData.vis = any; me.visible = any; g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
          } });
        }
        return fit(part);
      };
      K.blob = (o = {}) => K.shell({ ...o, solid: o.solid ?? true, shape: o.shape ?? SH.lobed(SH.sphere(o.r ?? 1), o.lobes ?? 12, o.amp ?? 0.22, o.seed ?? 1), seg: o.seg ?? [64, 44] });

      // ---------- Tubes: a tube along a path ([[x, y, z], …] smoothed), or many in one part. { r | r: k → radius, flat, closed, sides, color, cut, sequence } ----------
      K.tubes = (paths, o = {}) => {
        const h = host(o, 'tube'), part = h.part, list = paths.map((pts, i) => { const g = tubeGeo(pts, { ...o, r: typeof o.r === 'function' && o.r.length >= 2 ? (k) => o.r(k, i) : o.r }); if (o.sequence) { const K2 = g.attributes.aK; for (let j = 0; j < K2.count; j++) K2.setX(j, (i + K2.getX(j)) / paths.length); } return { g, color: rgb(o.colors ? o.colors[i % o.colors.length] : o.color ?? 'grey'), sub: i % 60 }; });
        const g = mergeGeo(list), m = mat(part, 'white', { cut: o.cut, vc: true, sub: true, k: true, bands: o.bands, spec: o.spec ?? 0.6, tint: o.tint, line: o.line, back: o.back, base: o.color });
        add(h, g, m); if (!h.sub) { part.curves = list.map((x) => x.g.userData.curve); part.color = rgb(o.colors ? o.colors[0] : o.color ?? 'grey'); part.along = (k, i = 0) => { const cv = part.curves[i]; return () => part.g.localToWorld(cv.getPointAt(clamp01(k))); }; }
        (part.drawMats ??= []).push(m); return fit(part);
      };
      K.tube = (o = {}) => K.tubes([o.path], o);
      K.rod = (o = {}) => K.tubes([[o.a ?? [0, 0, 0], o.b ?? [0, 1, 0]]], { seg: 1, ...o });
      // many straight rods in one part: K.rods([[a, b], …], { r, color })
      K.rods = (pairs, o = {}) => K.tubes(pairs, { seg: 1, sides: 7, ...o });
      // a random walk for threads, vessels, roots, wires: { n points, step, within: radius (stay inside a sphere) | on: shape function (stay on a surface, lift above it), from, turn, seed }
      K.wander = (o = {}) => {
        const R = rng(o.seed ?? 1), n = o.n ?? 40, step = o.step ?? 0.3, pts = []; let p = toV(o.from ?? [0, 0, 0]), d = toV(o.dir ?? [R() - 0.5, R() - 0.5, R() - 0.5]).normalize();
        for (let i = 0; i < n; i++) {
          if (o.on) { const l = p.length() || 1, dd = p.clone().multiplyScalar(1 / l); p = dd.multiplyScalar(o.on(dd.x, dd.y, dd.z) + (o.lift ?? 0)); }
          pts.push(p.clone());
          d.add(V3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(o.turn ?? 0.9)).normalize();
          if (o.within && p.clone().addScaledVector(d, step).length() > o.within) d.addScaledVector(p.clone().normalize(), -1.4).normalize();
          if (o.where && !o.where(p.clone().addScaledVector(d, step))) d.negate();
          p = p.clone().addScaledVector(d, step);
        }
        return pts;
      };

      // ---------- Stack: n plates on top of each other (cisternae, electrodes, strata, a pile of coins).
      //   { n, r | w + d, h (plate thickness), gap, bend (bows each plate), taper: (i, n) => scale, color | colors, q (how square the rim) } stacked along y ----------
      K.stack = (o = {}) => {
        const h = host(o, 'stack'), part = h.part, n = o.n ?? 5, rx = (o.w ?? (o.r ?? 1) * 2) / 2, rz = (o.d ?? (o.r ?? 1) * 2) / 2, hh = o.h ?? 0.16, gap = o.gap ?? 0.1, pitch = hh + gap, bend = o.bend ?? 0, list = [];
        for (let i = 0; i < n; i++) { const s = o.taper ? o.taper(i, n) : 1, y0 = (i - (n - 1) / 2) * pitch;
          const g = starGeo(SH.pill(rx * s, hh / 2, rz * s, o.q ?? 4), o.seg?.[0] ?? 48, o.seg?.[1] ?? 20, null, (p) => [p[0], p[1] + y0 + bend * (p[0] * p[0] / (rx * rx) + (o.bendZ ?? 0) * p[2] * p[2] / (rz * rz)) * rx, p[2]]);
          list.push({ g, color: rgb(o.colors ? o.colors[i % o.colors.length] : o.color ?? 'gold'), sub: i }); }
        add(h, mergeGeo(list), mat(part, 'white', { cut: o.cut, vc: true, sub: true, bands: o.bands, spec: o.spec, line: o.line, base: o.color ?? o.colors?.[0], back: o.back }));
        if (!h.sub) { part.color = list[Math.floor(n / 2)].color; part.plate = (i) => part.p([0, (i - (n - 1) / 2) * pitch, 0]); }
        return fit(part);
      };

      // ---------- Capsule with folds inside: a wall, a pale interior and baffles reaching in from alternate sides (a mitochondrion, a muffler, a heat exchanger).
      //   { r, len, wall, color, inner, folds: { n, depth (0–1 of the width), thick, color }, cut } along x; give it a plane cutter to open a window ----------
      K.capsule = (o = {}) => {
        const r = o.r ?? 0.5, len = o.len ?? 2.4, wall = o.wall ?? r * 0.16, part = K.shell({ ...o, shape: SH.capsule(r, len), thickness: wall, inner: o.inner ?? toHex(mixc(rgb(o.color ?? 'coral'), [1, 1, 1], 0.82)) });
        const fo = o.folds === false ? null : { n: 6, depth: 0.62, thick: r * 0.2, ...(o.folds || {}) };
        if (fo) { const ri = r - wall, L = len - 2 * r * 0.8, list = [];
          for (let i = 0; i < fo.n; i++) { const x = -L / 2 + (i + 0.5) * L / fo.n, up = i % 2 ? -1 : 1, ry = ri * fo.depth, y0 = up * (ri - ry) * 0.98, rz = 0.9 * Math.sqrt(Math.max(0.01, ri * ri - y0 * y0 * 0.3));
            list.push({ g: starGeo(SH.ellipsoid(fo.thick / 2, ry, rz), 24, 16, null, (p) => [p[0] + x, p[1] + y0, p[2]]), color: rgb(fo.color ?? o.color ?? 'coral'), sub: i }); }
          const g = new THREE.Group(); part.g.add(g); add({ g, part }, mergeGeo(list), mat(part, 'white', { cut: o.cut, vc: true, sub: true, base: fo.color ?? o.color, back: toHex(mixc(rgb(fo.color ?? o.color ?? 'coral'), [1, 1, 1], 0.25)) }));
        }
        return fit(part);
      };

      // ---------- Grains: thousands of small things as one instanced part.
      //   where: { on: shell (its surface; side: 'in' for the inner wall; where: (dir) => bool) | within: shell or shape function | along: [[x, y, z], …] | points: [[x, y, z], …] | fn: (i, rnd) => ({ p, n, s }) }
      //   what:  { shape: 'ball' | 'ring' | 'rod' | 'cone' | 'disc' | a geometry, r, jitter (size spread), color | colors, wiggle (they jostle), lift, cut } ----------
      const GEO = { ball: () => new THREE.SphereGeometry(1, 12, 9), ring: () => new THREE.TorusGeometry(1, 0.36, 7, 14).rotateX(Math.PI / 2), rod: () => new THREE.CapsuleGeometry(0.34, 1.6, 3, 9), cone: () => new THREE.ConeGeometry(0.6, 2, 10), disc: () => new THREE.CylinderGeometry(1, 1, 0.34, 28) };
      K.grains = (o = {}) => {
        const hostPart = o.on && o.on.isPart ? o.on : o.within && o.within.isPart ? o.within : null, h = host({ ...o, in: o.in ?? (hostPart ? { g: hostPart.g } : undefined), at: o.at }, 'grains'), part = h.part; if (hostPart && !o.in && !h.sub) part.parent = hostPart;
        const R = rng(o.seed ?? 7), n = o.n ?? 200, list = [], r = o.r ?? 0.05, jit = o.jitter ?? 0.25;
        const rdir = () => { const uu = R() * 2 - 1, a = R() * 6.2832, s = Math.sqrt(1 - uu * uu); return V3(s * Math.cos(a), uu, s * Math.sin(a)); };
        if (o.on) { const f = o.on.isPart ? (o.side === 'in' ? o.on.fin : o.on.f) : o.on, ga = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; list.length < n && i < n * 20; i++) { const N2 = o.where ? n * 6 : n, y = 1 - 2 * (i + 0.5) / N2; if (y < -1) break; const s = Math.sqrt(Math.max(0, 1 - y * y)), d = V3(s * Math.cos(ga * i), y, s * Math.sin(ga * i)); if (o.scatter) d.add(rdir().multiplyScalar(o.scatter)).normalize(); if (o.where && !o.where(d)) continue; list.push({ p: d.clone().multiplyScalar(f(d.x, d.y, d.z) + (o.lift ?? 0)), n: o.side === 'in' ? d.clone().negate() : d }); } }
        else if (o.within) { const f = o.within.isPart ? o.within.fin : o.within; for (let i = 0; list.length < n && i < n * 30; i++) { const d = rdir(), p = d.clone().multiplyScalar(f(d.x, d.y, d.z) * Math.cbrt(R()) * (o.fill ?? 0.92)); if (o.where && !o.where(p)) continue; list.push({ p, n: rdir() }); } }
        else if (o.along) { const cv = new THREE.CatmullRomCurve3(o.along.map(toV), false, 'centripetal'); for (let i = 0; i < n; i++) list.push({ p: cv.getPointAt(o.even ? (i + 0.5) / n : R()).add(rdir().multiplyScalar((o.spread ?? 0) * R())), n: rdir() }); }
        else if (o.points) for (const p of o.points) list.push({ p: toV(p), n: V3(0, 1, 0) });
        else if (o.fn) for (let i = 0; i < n; i++) { const x = o.fn(i, R); if (x) list.push({ p: toV(x.p), n: toV(x.n ?? [0, 1, 0]).normalize(), s: x.s }); }
        const geo = typeof o.shape === 'object' && o.shape ? o.shape : (GEO[o.shape ?? 'ball'] || GEO.ball)(), cols = o.colors ? o.colors.map(rgb) : null;
        const m = mat(part, cols ? 'white' : o.color ?? 'pink', { cut: o.cut, bands: o.bands ?? 2, spec: o.spec ?? 0, tint: o.tint ?? 0.6, line: o.line ?? (r * 2 < (o.thinUnder ?? 0.12) ? 'thin' : 'full'), wiggle: o.wiggle ?? 0, base: o.color });
        const im = new THREE.InstancedMesh(geo, m, list.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = V3(0, 1, 0), cc = new THREE.Color();
        list.forEach((it, i) => { const s = (it.s ?? 1) * r * (1 + (R() - 0.5) * 2 * jit); q.setFromUnitVectors(Y, it.n); M4.compose(it.p, q, V3(s, s, s)); im.setMatrixAt(i, M4); if (cols) { const c = cols[Math.floor(R() * cols.length)]; im.setColorAt(i, cc.setRGB(c[0], c[1], c[2])); } });
        im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.frustumCulled = false; if (m.userData.glass) im.layers.set(1); h.g.add(im);
        if (!h.sub) { part.color = cols ? cols[0] : rgb(o.color ?? 'pink'); part.count = list.length; part.points = list.map((x) => x.p); part.item = (i) => part.p(list[i % list.length].p); }
        return fit(part);
      };

      // ---------- Flow: beads travelling a path (ions through a gate, light into an eye, blood, magma, current).
      //   { path: [[x, y, z], …] | (k, i) => Vector3, n, r, color, at, until, period (a loop, seconds per trip) | dur (one trip each, staggered by `every`), spread, shape } ----------
      K.flow = (o = {}) => {
        const h = host(o, 'flow'), part = h.part, n = o.n ?? 10, r = o.r ?? 0.08, cv = typeof o.path === 'function' ? null : new THREE.CatmullRomCurve3(o.path.map(toV), !!o.closed, 'centripetal'), R = rng(o.seed ?? 3);
        const jit = Array.from({ length: n }, () => V3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(2 * (o.spread ?? 0)));
        const im = new THREE.InstancedMesh(typeof o.shape === 'object' && o.shape ? o.shape : (GEO[o.shape ?? 'ball'] || GEO.ball)(), mat(part, o.color ?? 'yellow', { bands: 2, spec: o.spec ?? 0.8, line: o.line ?? (r < 0.06 ? 'thin' : 'full'), cut: o.cut }), n); im.frustumCulled = false; h.g.add(im);
        const at = o.at ?? 0, until = o.until ?? 1e9, M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Z = V3(0, 0, 0), p = V3(0, 0, 0);
        part.nodim = o.nodim ?? true; part.flowWin = [at, until];
        Wd.flows.push((t) => {
          const on = t >= at && t < until + 0.3; im.visible = on; if (!on) return;
          const fade = Math.min(clamp01((t - at) / 0.3), 1 - clamp01((t - until) / 0.3));
          for (let i = 0; i < n; i++) { let k; if (o.dur) { k = (t - at - i * (o.every ?? o.dur / n)) / o.dur; if (o.repeat) k = k < 0 ? -1 : (k % (o.repeat / o.dur + 1)); } else k = ((t - at) / (o.period ?? 2) + i / n) % 1;
            if (k <= 0 || k >= 1) { M4.compose(Z, q, V3(1e-6, 1e-6, 1e-6)); im.setMatrixAt(i, M4); continue; }
            const kk = o.ease ? EASE(o.ease)(k) : k; if (cv) p.copy(cv.getPointAt(kk)); else p.copy(o.path(kk, i, t)); p.add(jit[i]);
            const s = r * fade * Math.pow(Math.sin(Math.PI * k), o.taper ?? 0.35); M4.compose(p, q, V3(s, s, s)); im.setMatrixAt(i, M4); }
          im.instanceMatrix.needsUpdate = true;
        });
        if (Wd === W0d && o.info !== false) F.info('flow', at, Math.min(until, F.duration));
        part.rad0 = 0.5; part.base = { p: part.g.position.clone(), q: part.g.quaternion.clone(), s: part.g.scale.clone() }; if (cv) { const b = new THREE.Box3().setFromPoints(cv.getPoints(24)); part.cl = b.getCenter(V3(0, 0, 0)); part.rad0 = b.getSize(V3(0, 0, 0)).length() / 2; }
        return part;
      };

      // ---------- Simple solids ----------
      const prim = (o, kind, geo, mo = {}) => { const h = host(o, kind); add(h, geo, mat(h.part, o.color ?? 'grey', { cut: o.cut, bands: o.bands, spec: o.spec, tint: o.tint, line: o.line, back: o.back, flat: o.flat, glass: o.glass, ...mo })); if (!h.sub) h.part.color = rgb(o.color ?? 'grey'); return fit(h.part); };
      K.ball = (o = {}) => prim(o, 'ball', new THREE.SphereGeometry(o.r ?? 0.5, o.seg ?? 40, Math.round((o.seg ?? 40) * 0.7)));
      K.ring = (o = {}) => prim(o, 'ring', new THREE.TorusGeometry(o.r ?? 1, o.tube ?? 0.2, 16, o.seg ?? 64).rotateX(Math.PI / 2));   // lies flat (axis y); turn it with rot
      K.disc = (o = {}) => prim(o, 'disc', starGeo(SH.pill(o.r ?? 1, (o.h ?? 0.2) / 2, o.rz ?? o.r ?? 1, o.q ?? 5), 64, 24));
      K.box = (o = {}) => prim(o, 'box', starGeo(SH.box(o.w ?? 1, o.h ?? 1, o.d ?? 1, o.p ?? 8), 64, 44), { line: o.line ?? 'full+crease' });
      K.cone = (o = {}) => prim(o, 'cone', new THREE.ConeGeometry(o.r ?? 0.5, o.h ?? 1, o.seg ?? 32), { line: o.line ?? 'full+crease' });
      // lathe: a profile [[radius, y], …] turned around y (a lens, an iris ring, a vase, a crater, a can). profile may be a function of t: the shape is rebuilt every frame (a pupil that tightens)
      K.lathe = (o = {}) => {
        const mk = (pf) => new THREE.LatheGeometry(pf.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), o.seg ?? 64), live = typeof o.profile === 'function', h = host(o, 'lathe'), part = h.part;
        const me = add(h, mk(live ? o.profile(0) : o.profile), mat(part, o.color ?? 'grey', { cut: o.cut, bands: o.bands, spec: o.spec, tint: o.tint, line: o.line ?? 'full+crease', side: THREE.DoubleSide, back: o.back, flat: o.flat, glass: o.glass }));
        if (live) { me.frustumCulled = false; Wd.lives.push((t) => { me.geometry.dispose(); me.geometry = mk(o.profile(t)); }); }
        if (!h.sub) part.color = rgb(o.color ?? 'grey'); return fit(part);
      };

      // ---------- Showing, hiding, taking apart ----------
      const listOf = (x) => (Array.isArray(x) ? x.flatMap(listOf) : typeof x === 'string' ? Wd.parts.filter((p) => p.layer === x || p.name === x) : x && x.isGroup ? [x, ...kidsOf(x)] : x && x.isPart ? [x] : []);
      K.parts = listOf;
      K.show = (x, at, o2 = {}) => { listOf(x).forEach((p, i) => p.show(at + i * (o2.stagger ?? 0), { ...o2, sfx: i === 0 ? o2.sfx : false })); return K; };
      K.hide = (x, at, o2 = {}) => { listOf(x).forEach((p, i) => p.hide(at + i * (o2.stagger ?? 0), o2)); return K; };
      // exploded view: each part slides away from `from` (or along `dir`) by `dist`, and back at `until`
      K.explode = (x, o2 = {}) => { const from = toV(o2.from ?? [0, 0, 0]); listOf(x).forEach((p, i) => { const d = o2.dir ? toV(o2.dir).normalize() : p.g.position.clone().add(p.cl).sub(from).normalize(), by = d.multiplyScalar((o2.dist ?? 1) * (o2.each ? o2.each(i) : 1)); p.to(o2.at + i * (o2.stagger ?? 0.08), { by, dur: o2.dur ?? 0.8 }); if (o2.until !== undefined) p.to(o2.until, { by: by.clone().negate(), dur: o2.dur ?? 0.8 }); }); return K; };
      K.onFrame = (fn) => { Wd.fns.push(fn); return K; };

      // ---------- Every frame ----------
      const qt = new THREE.Quaternion(), ev = new THREE.Euler();
      Wd.update = (t) => {
        G.uTime.value = t;
        for (const fn of Wd.fns) fn(t);
        for (const p of Wd.parts) {
          if (!p.base) continue;
          // visibility
          let k = p.hidden ? 0 : 1, mode = 'pop'; for (const v of p.vis) { if (t < v.at) break; const q = clamp01((t - v.at) / v.dur); k = v.on ? q : 1 - q; mode = v.mode; }
          p.g.visible = k > 0.001; p.shown = k;
          // transform keys
          const pos = p.base.p.clone(), rot = [0, 0, 0], sc = [1, 1, 1];
          for (const key of p.keys) { if (t < key.at) break; const q = key.ease(clamp01((t - key.at) / key.dur)); if (key.pos) pos.lerp(key.pos, q); if (key.by) pos.addScaledVector(key.by, q); if (key.rot) for (let i = 0; i < 3; i++) rot[i] = lerp(rot[i], key.rot[i], q); if (key.scale) for (let i = 0; i < 3; i++) sc[i] = lerp(sc[i], key.scale[i], q); }
          let s = 1; if (mode === 'pop' && k < 1) s = Math.max(0.001, k <= 0 ? 0.001 : E.backOut(k)); p.u.uFade.value = mode === 'fade' ? 1 - k : 0;
          if (!p.isGroup && (p.ghosts || (mode === 'fade' && k > 0.001 && k < 0.999))) { const fading = mode === 'fade' && k > 0.001 && k < 0.999; for (const [m, tw] of ghostsOf(p)) { if (tw.geometry !== m.geometry) tw.geometry = m.geometry; tw.visible = fading && m.userData.vis !== false; m.visible = !fading && m.userData.vis !== false; } }
          for (const pu of p.pulses) { const q = (t - pu.at) / pu.dur; if (q > 0 && q < 1) s *= 1 + pu.amt * Math.sin(Math.PI * q * (2 * pu.n - 1)) * (1 - q * 0.3); }
          p.g.position.copy(pos); p.g.quaternion.copy(p.base.q); if (rot[0] || rot[1] || rot[2]) p.g.quaternion.multiply(qt.setFromEuler(ev.set(rot[0], rot[1], rot[2])));
          for (const sp of p.spins) { const dt = Math.min(t, sp.until) - sp.at; if (dt > 0) p.g.quaternion.multiply(qt.setFromAxisAngle(sp.axis, dt * sp.rpm * Math.PI / 30)); }
          p.g.scale.set(p.base.s.x * sc[0] * s, p.base.s.y * sc[1] * s, p.base.s.z * sc[2] * s);
          if (p.drawMats && p.draws.length) { let d = -1; for (const dr of p.draws) { if (t < dr.at) break; d = t > dr.until ? -1 : lerp(dr.from, dr.to, dr.ease(clamp01((t - dr.at) / dr.dur))) * 1.001; } for (const m of p.drawMats) m.uniforms.uDraw.value = d; }
        }
        Wd.scene.updateMatrixWorld(true);
        for (const c of Wd.cutters) c.set(c.valueAt(t));
        for (const cp of Wd.caps) { const me = cp.g.matrixWorld.elements, ce = cp.cut.g.matrixWorld.elements; let sg = cp.cut.val * 7919; for (let i = 0; i < 16; i++) sg += me[i] * (i + 1.37) + ce[i] * (i + 17.3); sg = Math.round(sg * 1e4); if (sg !== cp.ver) { cp.ver = sg; cp.update(); } }
        for (const fn of Wd.lives) fn(t);
        for (const fn of Wd.flows) fn(t);
      };
      return K;
    };
    let W0d = null;
    const K0 = makeWorld('main'); W0d = K0.world; Object.assign(C, K0);

    // ---------- Camera: perspective, a long lens; where a part lands in the frame follows the layout (the card keeps the lower left) ----------
    const FOV = opt.fov ?? 26, TANF = Math.tan(rad(FOV) / 2);
    const camera = new THREE.PerspectiveCamera(FOV, W0 / H0, 0.05, 4000);
    const T0 = mkTargets(Math.round(W0 * SS), Math.round(H0 * SS));
    // the part of the frame the subject may use: with a card on screen the card keeps its corner
    const FREE = (card) => (card ? (SQ ? { x0: 0.04, y0: 0.02, x1: 0.96, y1: 0.68 } : PT ? { x0: 0.05, y0: 0.09, x1: 0.95, y1: 0.58 } : { x0: 0.41, y0: 0.05, x1: 0.98, y1: 0.95 }) : (SQ ? { x0: 0.07, y0: 0.07, x1: 0.93, y1: 0.93 } : PT ? { x0: 0.06, y0: 0.12, x1: 0.94, y1: 0.76 } : { x0: 0.22, y0: 0.07, x1: 0.78, y1: 0.93 }));
    const sphereOf = (x) => {
      if (!x) return null; if (x.isVector3 || (Array.isArray(x) && typeof x[0] === 'number')) return { c: toV(x), r: 0 }; if (typeof x === 'function') return { c: x(), r: 0 };
      const ps = C.parts(x).filter((p) => !p.isGroup && p.base); if (!ps.length) return null;
      const c = V3(0, 0, 0); for (const p of ps) c.add(p.center()); c.multiplyScalar(1 / ps.length); let r = 0; for (const p of ps) r = Math.max(r, p.center().distanceTo(c) + p.radius()); return { c, r };
    };
    let stops = [];
    const subjectOf = (S) => (S.target ? { c: toV(S.target), r: S.radius ?? 1 } : sphereOf(S.look ?? S.focus));
    const poseOf = (S) => {
      const sp = subjectOf(S) ?? { c: V3(0, 0, 0), r: 1 }, c = sp.c, r = Math.max(sp.r, 1e-3), free = S.free ?? FREE(!!S.card || !!S.room);
      const m = Math.min((free.x1 - free.x0) * W0, (free.y1 - free.y0) * H0) / 2;
      return { c, r, dist: S.dist ?? r * H0 / (2 * TANF * (S.fill ?? 0.82) * m), az: rad(S.az ?? 24), el: rad(S.el ?? 14), cx: (free.x0 + free.x1) / 2, cy: (free.y0 + free.y1) / 2 };
    };
    const camDir = (az, el) => V3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    const angLerp = (a, b, k) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };
    // the camera at time t: holding at stop i (drifting a little), or flying from stop i − 1 to it
    const held = (i, t) => { const S = stops[i], P0 = S.pose, arrive = S.at + (i ? S.dur : 0), next = stops[i + 1] ? stops[i + 1].at : F.duration, q = clamp01((t - arrive) / Math.max(0.5, next - arrive)), dr = { az: 5, el: 0, zoom: 0.04, ...(S.drift || {}) }; return { ...P0, az: P0.az + rad(dr.az) * q, el: P0.el + rad(dr.el) * q, dist: P0.dist * (1 - dr.zoom * q) }; };
    let camNow = null;
    const placeCamera = (t) => {
      if (!stops.length) stops = [{ at: 0, dur: 0, pose: poseOf({ look: W0d.parts }), i: 0 }];
      let i = 0; for (let k = 0; k < stops.length; k++) if (stops[k].at <= t) i = k;
      const S = stops[i]; let pz = held(i, t);
      if (i > 0 && t < S.at + S.dur) {
        const a = held(i - 1, S.at), b = S.pose, q = EASE(S.ease)(clamp01((t - S.at) / S.dur));
        const travel = a.c.distanceTo(b.c) / Math.max(1e-6, Math.min(a.dist, b.dist)), lift = S.lift ?? Math.min(0.35, travel * 0.16);
        pz = { c: a.c.clone().lerp(b.c, q), dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), q)) * (1 + lift * Math.sin(Math.PI * q)), az: angLerp(a.az, b.az, q), el: lerp(a.el, b.el, q), cx: lerp(a.cx, b.cx, q), cy: lerp(a.cy, b.cy, q), r: lerp(a.r, b.r, q) };
      }
      camera.position.copy(pz.c).addScaledVector(camDir(pz.az, pz.el), pz.dist); camera.up.set(0, 1, 0); camera.lookAt(pz.c);
      camera.near = Math.max(0.005, pz.dist * (opt.near ?? 0.04)); camera.far = pz.dist + (opt.far ?? 400);
      camera.setViewOffset(W0, H0, (0.5 - pz.cx) * W0, (0.5 - pz.cy) * H0, W0, H0); camera.updateMatrixWorld(true);
      camNow = { ...pz, i }; return camNow;
    };
    const proj = (v) => { const q = v.clone().project(camera); return { x: (q.x + 1) / 2 * W0, y: (1 - q.y) / 2 * H0, z: q.z, behind: q.z > 1 || q.z < -1 }; };
    const pxPerUnit = (v) => H0 / (2 * TANF * Math.max(1e-6, v.clone().sub(camera.position).dot(camera.getWorldDirection(V3(0, 0, 0)))));
    C.project = proj; C.camera = camera; C.pxPerUnit = pxPerUnit;
    const anchorOf = (a) => (typeof a === 'function' ? a : a && a.isPart ? () => a.center() : (() => { const v = toV(a); return () => v.clone(); })());

    // ---------- Overlay (HTML: crisp at any zoom): the information card, labels with leader lines, the scale bar, inset frames, the end plate ----------
    const overlay = F.layer('pointer-events:none', 6);
    const svgNS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('width', W0); svg.setAttribute('height', H0); svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible'; overlay.appendChild(svg);
    const mkLine = () => { const l = document.createElementNS(svgNS, 'polyline'); l.setAttribute('fill', 'none'); l.setAttribute('stroke', INK); l.setAttribute('stroke-width', (2 * u).toFixed(2)); l.setAttribute('stroke-linejoin', 'round'); svg.appendChild(l); return l; };
    const mkDot = () => { const d = document.createElementNS(svgNS, 'rect'); d.setAttribute('fill', INK); d.setAttribute('width', 9 * u); d.setAttribute('height', 9 * u); svg.appendChild(d); return d; };
    const sourced = [];   // every "how this differs from the real thing" line: brief.md must have each one with its source (render --check)

    // ----- The information card. Three layers, each arriving when the voice gets to it:
    //   1 a colour chip and the name   2 one line: what it does   3 small and grey: how the drawing differs from the real thing (fixed in this style)
    //   card: { color, name, what, caveat, at: [t1, t2, t3], items: [{ color, text, at }] (a legend between name and caveat), swatch: false (a plain title) }
    const CARD = SQ ? { left: 0.06, width: 0.88, top: 0.7 } : PT ? { left: 0.06, width: 0.88, top: 0.6 } : { left: 0.045, width: 0.36, top: 0.5 };
    const cards = [];
    const mkCard = (cd, a, b, S) => {
      const root = P.el('div', `left:${CARD.left * W0}px;top:${(cd.top ?? CARD.top) * H0}px;width:${(cd.width ?? CARD.width) * W0}px;display:none;font-family:${FONT};color:${INK}`, overlay);
      const pad = 26 * u, panel = P.el('div', `left:${-pad}px;top:${-pad * 0.7}px;right:${-pad}px;height:0;background:#FFFFFF`, root), rows = [];
      const row = (html, text, css, at, kind) => { if (text === undefined || text === null || text === false) return; const e = P.el('div', `position:relative;opacity:0;${css}`, root, html); rows.push({ e, at, text, kind }); F.text(e, 'label', text, at, b); };
      const t = cd.at ?? [], t1 = t[0] ?? a + 0.2, chip = (c, s) => `<span style="display:inline-block;width:${s}px;height:${s}px;background:${hex(c)};border:${Math.max(1.5, 2 * u)}px solid ${toHex(lineOf(rgb(c)))};box-sizing:border-box;margin-right:${s * 0.42}px;vertical-align:${-s * 0.06}px"></span>`;
      const NS = cd.nameSize ?? 66;
      row(`${cd.swatch === false || !cd.color ? '' : chip(cd.color, NS * 0.62 * u)}<span>${P.esc(cd.name)}</span>`, cd.name, `font-weight:900;font-size:${NS * u}px;line-height:1.22;letter-spacing:.01em;white-space:nowrap`, t1, 'name');
      (cd.items || []).forEach((it, i) => row(`${it.color ? chip(it.color, 25 * u) : ''}<span>${P.esc(it.text)}</span>`, it.text, `font-weight:700;font-size:${34 * u}px;line-height:1.5`, it.at ?? t1 + 0.8 * (i + 1), 'item'));
      row(P.esc(cd.what ?? ''), cd.what, `font-weight:500;font-size:${42 * u}px;line-height:1.36;margin-top:${4 * u}px`, t[1] ?? t1 + 1.2, 'what');
      row(P.esc(cd.caveat || ''), cd.caveat || null, `font-weight:500;font-size:${33 * u}px;line-height:1.4;margin-top:${8 * u}px;color:${MUTED}`, t[2] ?? (t[1] ?? t1 + 1.2) + 1.6, 'caveat');
      if (cd.caveat) sourced.push({ text: cd.caveat, what: 'caveat', at: a });
      const card = { root, panel, rows, a: t1, b, cd, S, pad };
      rows.forEach((r) => { if (r.kind !== 'name' && cd.sfx !== false) F.sfx(r.at, 'card', 0.2); });
      F.info('annotate', t1, b); cards.push(card); return card;
    };
    const drawCards = (t) => { for (const c of cards) {
      const k = Math.min(clamp01((t - c.a + 0.05) / 0.3), 1 - clamp01((t - c.b + 0.3) / 0.3)); c.root.style.display = k > 0.001 ? '' : 'none'; if (k <= 0.001) continue; c.root.style.opacity = k.toFixed(3);
      let bottom = 0; for (const r of c.rows) { const q = E.expoOut(clamp01((t - r.at) / 0.45)); r.e.style.opacity = q.toFixed(3); r.e.style.transform = `translateX(${((1 - q) * -14 * u).toFixed(1)}px)`; if (q > 0.001) bottom = Math.max(bottom, r.e.offsetTop + r.e.offsetHeight * Math.min(1, q * 1.6)); }
      c.panel.style.height = `${(bottom + c.pad * 1.5).toFixed(1)}px`; c.box = { x: CARD.left * W0 - c.pad, y: (c.cd.top ?? CARD.top) * H0 - c.pad * 0.7, w: (c.cd.width ?? CARD.width) * W0 + 2 * c.pad, h: bottom + c.pad * 1.5 };
    } };

    // ----- Labels: a small bordered box tied by a leader line to a point on the model. { on: part | point | fn, text, at, until, dx, dy (px at 1080p from the point to the box centre) }
    const labels = [];
    C.label = (o = {}) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, box = P.el('div', `left:0;top:0;display:none;white-space:nowrap;background:#FFFFFF;border:${Math.max(1.5, 2 * u)}px solid ${INK};padding:${5 * u}px ${12 * u}px ${6 * u}px;font:700 ${(o.size ?? 31) * u}px/1.25 ${FONT};color:${INK}`, overlay, P.esc(o.text));
      F.text(box, 'label', o.text, at, until, { overlap: true }); const L = { fn: anchorOf(o.on), at, until, box, text: o.text, dx: (o.dx ?? 90) * u, dy: (o.dy ?? -80) * u, line: mkLine(), dot: mkDot(), o };
      if (o.info !== false) F.info('annotate', at, Math.min(until, F.duration)); if (o.sfx !== false) F.sfx(at, 'tick', 0.25); labels.push(L); return L;
    };
    const drawLabels = (t) => { for (const L of labels) {
      const k = Math.min(clamp01((t - L.at) / 0.3), 1 - clamp01((t - L.until) / 0.25)), vis = k > 0.001; L.box.style.display = vis ? '' : 'none'; L.line.style.display = L.dot.style.display = vis ? '' : 'none'; if (!vis) { L._box = null; continue; }
      const a = proj(L.fn(t)), bw = L.box.offsetWidth, bh = L.box.offsetHeight, m = 14 * u, q = E.expoOut(k);
      const bx = Math.max(m, Math.min(W0 - m - bw, a.x + L.dx * q - bw / 2)), by = Math.max(m, Math.min(H0 - m - bh, a.y + L.dy * q - bh / 2));
      L.box.style.transform = `translate(${bx.toFixed(1)}px,${by.toFixed(1)}px)`; L.box.style.opacity = k.toFixed(3);
      // the leader leaves the box from the middle of the side facing the point
      const cx = bx + bw / 2, cy = by + bh / 2, horiz = Math.abs(a.x - cx) * bh > Math.abs(a.y - cy) * bw, ex = horiz ? (a.x > cx ? bx + bw : bx) : cx, ey = horiz ? cy : (a.y > cy ? by + bh : by);
      L.line.setAttribute('points', `${ex.toFixed(1)},${ey.toFixed(1)} ${a.x.toFixed(1)},${a.y.toFixed(1)}`); L.line.style.opacity = k.toFixed(3);
      L.dot.setAttribute('x', (a.x - 4.5 * u).toFixed(1)); L.dot.setAttribute('y', (a.y - 4.5 * u).toFixed(1)); L.dot.style.opacity = k.toFixed(3);
      L._box = { x: bx, y: by, w: bw, h: bh }; L._a = a;
    } };

    // ----- Scale bar: a ruler tied to the camera.
    //   { of: part, text: '24 毫米' }   spans the part's real width on screen and says its real size (the number is a fact: it goes in brief.md)
    //   { span: [pointA, pointB], text } between two points of the model
    //   { nice: true }                  picks a round length (1 / 2 / 5 × 10ⁿ of opt.units) that fits the frame at the subject's depth, and follows the camera as it moves in
    const bars = [];
    C.scaleBar = (o = {}) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, root = P.el('div', `left:0;top:0;display:none;font:700 ${(o.size ?? 33) * u}px/1.2 ${FONT};color:${INK}`, overlay);
      const txt = P.el('div', `left:0;top:0;white-space:nowrap;transform:translate(-50%,-100%)`, root, P.esc(o.text ?? '')), line = P.el('div', `left:0;top:0;height:${2.5 * u}px;background:${INK}`, root), t1 = P.el('div', `top:0;width:${2.5 * u}px;height:${16 * u}px;background:${INK}`, root), t2 = P.el('div', `top:0;width:${2.5 * u}px;height:${16 * u}px;background:${INK}`, root);
      const B = { o, at, until, root, txt, line, t1, t2, px: 0, value: null };
      if (o.text) F.text(txt, 'label', o.text, at, until); else F.text(txt, 'label', '', at, until, { noFact: true });
      if (o.info !== false) F.info('figures', at, Math.min(until, F.duration)); bars.push(B); return B;
    };
    const NICE = [1, 2, 5];
    const barEnds = (B) => {
      const right = V3(1, 0, 0).applyQuaternion(camera.quaternion), o = B.o;
      if (o.span) return { a: anchorOf(o.span[0])(), b: anchorOf(o.span[1])(), text: o.text };
      if (o.of) { const sp = sphereOf(o.of), r = (o.width ?? sp.r * 2 / 1.04) / 2; return { a: sp.c.clone().addScaledVector(right, -r), b: sp.c.clone().addScaledVector(right, r), top: sp.c.clone().addScaledVector(V3(0, 1, 0).applyQuaternion(camera.quaternion), sp.r), text: o.text }; }
      // nice: a round real length at the depth of what the camera is looking at
      const c = camNow.c, ppu = pxPerUnit(c), lo = 0.12 * W0, hi = 0.30 * W0; let best = null;
      for (let e = -9; e <= 9; e++) for (const n of NICE) { const real = n * Math.pow(10, e), px = real / units.per * ppu; if (px >= lo && px <= hi && (!best || px > best.px)) best = { real, px }; }
      if (!best) return null; const half = best.real / units.per / 2, mid = c; let label = `${+best.real.toPrecision(3)} ${units.unit}`;
      for (const [un, k] of units.ladder || []) { const v = best.real / k; if (v >= 1 && v < 1000) { label = `${+v.toPrecision(3)} ${un}`; break; } }
      return { a: mid.clone().addScaledVector(right, -half), b: mid.clone().addScaledVector(right, half), text: label, fixed: true, real: best.real };
    };
    const drawBars = (t) => { for (const B of bars) {
      const k = Math.min(clamp01((t - B.at) / 0.35), 1 - clamp01((t - B.until) / 0.3)); B.root.style.display = k > 0.001 ? '' : 'none'; if (k <= 0.001) { B.px = 0; continue; }
      const Ed = barEnds(B); if (!Ed) { B.root.style.display = 'none'; continue; }
      const a = proj(Ed.a), b = proj(Ed.b), len = Math.hypot(b.x - a.x, b.y - a.y), q = E.expoOut(k);
      let x0 = Math.min(a.x, b.x), y = Ed.top ? proj(Ed.top).y - 34 * u : Math.min(a.y, b.y);
      if (Ed.fixed || B.o.y !== undefined) { y = (B.o.y ?? (PT ? 0.1 : 0.075)) * H0; if (Ed.fixed) x0 = (B.o.x ?? (SQ || PT ? 0.07 : 0.045)) * W0; }
      y = Math.max(56 * u, y);
      B.root.style.opacity = k.toFixed(3); B.line.style.left = `${x0}px`; B.line.style.top = `${y}px`; B.line.style.width = `${(len * q).toFixed(1)}px`;
      B.t1.style.left = `${x0}px`; B.t1.style.top = `${y - 7 * u}px`; B.t2.style.left = `${x0 + len * q - 2.5 * u}px`; B.t2.style.top = `${y - 7 * u}px`;
      B.txt.style.left = `${x0 + len / 2}px`; B.txt.style.top = `${y - 14 * u}px`; if (B.txt.textContent !== Ed.text) B.txt.textContent = Ed.text;
      B.px = len; B.world = Ed.a.distanceTo(Ed.b); B.label = Ed.text; B.box = { x: x0, y: y - 50 * u, w: len, h: 60 * u };
    } };

    // ----- Inset: a framed close-up of something too small to see at this scale, tied to its place on the model by two leader lines.
    //   The close-up is its own little model, built with the same kit: { on: anchor, title, at, until, build: (K) => { … }, view: { look, fill, az, el, spin (degrees per second) }, texts: [{ text, x, y (0–1 inside the frame), align }], rect: { x, y, w, h } (frame fractions) }
    const insets = [];
    C.inset = (o = {}) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, sz = (SQ ? 0.48 : PT ? 0.5 : 0.30), R = o.rect ?? (SQ ? { x: 0.485, y: 0.035, w: sz, h: sz } : PT ? { x: 0.44, y: 0.1, w: 0.5, h: 0.5 * W0 / H0 } : { x: 0.66, y: 0.06, w: sz, h: sz * W0 / H0 });
      const rect = { x: R.x * W0, y: R.y * H0, w: R.w * W0, h: R.h * H0 }, K = makeWorld('inset' + insets.length); o.build(K);
      const cam = new THREE.PerspectiveCamera(o.view?.fov ?? 22, rect.w / rect.h, 0.02, 2000), T = mkTargets(Math.round(rect.w * SS), Math.round(rect.h * SS));
      const frame = P.el('div', `left:0;top:0;display:none;box-sizing:border-box;border:${Math.max(2, 2.5 * u)}px solid ${INK};transform-origin:0 0`, overlay);
      const tab = o.title ? P.el('div', `left:${-2.5 * u}px;top:${-2.5 * u}px;background:#FFFFFF;border:${Math.max(2, 2.5 * u)}px solid ${INK};padding:${3 * u}px ${14 * u}px ${5 * u}px;font:800 ${33 * u}px/1.2 ${FONT};color:${INK};white-space:nowrap`, frame, P.esc(o.title)) : null;
      if (tab) F.text(tab, 'label', o.title, at, until, { overlap: true });
      const texts = (o.texts || []).map((x) => { const e = P.el('div', `left:${(x.x ?? 0.5) * rect.w}px;top:${(x.y ?? 0.1) * rect.h}px;transform:translate(${x.align === 'left' ? '0' : x.align === 'right' ? '-100%' : '-50%'},-50%);white-space:nowrap;font:600 ${(x.size ?? 32) * u}px/1.2 ${FONT};color:${x.color ? hex(x.color) : MUTED};opacity:0`, frame, P.esc(x.text)); F.text(e, 'label', x.text, x.at ?? at, x.until ?? until, { overlap: true }); return { e, at: x.at ?? at + 0.3, until: x.until ?? until }; });
      const I = { o, at, until, rect, K, cam, T, frame, texts, fn: anchorOf(o.on), l1: mkLine(), l2: mkLine(), dot: mkDot(), k: 0 };
      F.info('diagram', at, Math.min(until, F.duration)); if (o.sfx !== false) F.sfx(at, 'pop', 0.5);
      insets.push(I); return I;
    };
    const drawInsets = (t) => { for (const I of insets) {
      const k = Math.min(E.cubicInOut(clamp01((t - I.at) / 0.5)), 1 - E.cubicInOut(clamp01((t - I.until) / 0.45))); I.k = k; const vis = k > 0.002;
      I.frame.style.display = vis ? '' : 'none'; I.l1.style.display = I.l2.style.display = I.dot.style.display = vis ? '' : 'none'; if (!vis) { I.cur = null; continue; }
      const a = proj(I.fn(t)), r = I.rect, x = lerp(a.x, r.x, k), y = lerp(a.y, r.y, k), w = r.w * k, h = r.h * k; I.cur = { x, y, w, h };
      I.frame.style.width = `${r.w}px`; I.frame.style.height = `${r.h}px`; I.frame.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${k.toFixed(4)})`;
      for (const tx of I.texts) tx.e.style.opacity = Math.min(clamp01((t - tx.at) / 0.3), 1 - clamp01((t - tx.until) / 0.3)).toFixed(3);
      // two lines from the corners of the side facing the point
      const below = a.y > y + h, above = a.y < y, c1 = below ? [x, y + h] : above ? [x, y] : a.x < x ? [x, y] : [x + w, y], c2 = below ? [x + w, y + h] : above ? [x + w, y] : a.x < x ? [x, y + h] : [x + w, y + h];
      I.l1.setAttribute('points', `${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${a.x.toFixed(1)},${a.y.toFixed(1)}`); I.l2.setAttribute('points', `${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${a.x.toFixed(1)},${a.y.toFixed(1)}`);
      I.dot.setAttribute('x', (a.x - 4.5 * u).toFixed(1)); I.dot.setAttribute('y', (a.y - 4.5 * u).toFixed(1));
      // its own camera
      const v = I.o.view || {}, sp = (() => { const ps = I.K.world.parts.filter((p) => !p.isGroup && p.base && (!v.look || I.K.parts(v.look).includes(p))); const c = V3(0, 0, 0); if (!ps.length) return { c, r: 1 }; for (const p of ps) c.add(p.center()); c.multiplyScalar(1 / ps.length); let rr = 0; for (const p of ps) rr = Math.max(rr, p.center().distanceTo(c) + p.radius()); return { c, r: rr }; })();
      const tf = Math.tan(rad(I.cam.fov) / 2), dist = v.dist ?? sp.r / (tf * (v.fill ?? 0.9)) * Math.max(1, r.h / r.w), az = rad((v.az ?? 20) + (v.spin ?? 0) * (t - I.at)), el = rad(v.el ?? 10), c = v.target ? toV(v.target) : sp.c;
      I.cam.position.copy(c).addScaledVector(camDir(az, el), dist); I.cam.lookAt(c); I.cam.near = dist * 0.05; I.cam.far = dist * 20; I.cam.updateProjectionMatrix(); I.cam.updateMatrixWorld(true);
    } };

    // ----- End plate: one fact in a bordered box. By default it takes the card's place (so a last stop with room: true keeps the model clear of it); x, y (frame fractions) put its centre elsewhere. { title, sub, note, noteAt (the small line can arrive later), at, until, x, y, width }
    const plates = [];
    C.plate = (o = {}) => {
      const at = o.at ?? 0, until = o.until ?? 1e9, bw = Math.max(2, 2.5 * u), box = P.el('div', `left:${(o.x ?? (SQ || PT ? 0.5 : 0.225)) * W0}px;top:${(o.y ?? (SQ ? 0.84 : PT ? 0.7 : 0.72)) * H0}px;display:none;width:${(o.width ?? (SQ ? 0.84 : PT ? 0.84 : 0.37)) * W0}px;box-sizing:border-box;background:#FFFFFF;border:${bw}px solid ${INK};padding:${34 * u}px ${36 * u}px ${36 * u}px;text-align:center;font-family:${FONT};color:${INK}`, overlay);
      const mk = (text, css, a2 = at) => { if (!text) return null; const e = P.el('div', `position:relative;${css}`, box, P.esc(text)); F.text(e, 'label', text, a2, until); return e; };
      mk(o.title, `font-weight:900;font-size:${(o.size ?? 66) * u}px;line-height:1.2`); mk(o.sub, `font-weight:500;font-size:${42 * u}px;line-height:1.4;margin-top:${6 * u}px`); const note = mk(o.note, `font-weight:500;font-size:${33 * u}px;line-height:1.45;margin-top:${22 * u}px;color:${MUTED}`, o.noteAt ?? at);
      F.info('figures', at, Math.min(until, F.duration)); if (o.sfx !== false) F.sfx(at, 'chime', 0.6); if (note && o.noteAt !== undefined && o.sfx !== false) F.sfx(o.noteAt, 'tick', 0.5); plates.push({ box, at, until, note, noteAt: o.noteAt }); return box;
    };
    const drawPlates = (t) => { for (const p of plates) { const k = Math.min(E.expoOut(clamp01((t - p.at) / 0.5)), 1 - clamp01((t - p.until) / 0.4)); p.box.style.display = k > 0.001 ? '' : 'none'; p.box.style.opacity = k.toFixed(3); p.box.style.transform = `translate(-50%,-50%) scale(${(0.94 + 0.06 * k).toFixed(4)})`; if (p.note && p.noteAt !== undefined) p.note.style.opacity = E.expoOut(clamp01((t - p.noteAt) / 0.4)).toFixed(3); } };

    // ---------- The tour: one stop per thing to explain.
    //   { at, dur (the flight, s), look: part / [parts] / point (default: focus), focus: [parts kept in colour — the rest fades back] | false, dim (how far, 0–1),
    //     az, el (degrees), fill (how much of the free frame it takes), dist, card, labels: [ … ], room: true (keep the card's corner free without a card), drift, lift, ease } ----------
    C.tour = (list) => {
      stops = list.map((S, i) => ({ dur: 1.7, dim: 1, ...S, i })).sort((a, b) => a.at - b.at);
      // poses are taken with every part where its keys put it at the moment the camera arrives
      stops.forEach((S, i) => { W0d.update(S.at + (i ? S.dur : 0)); S.pose = poseOf(S); S.until = stops[i + 1] ? stops[i + 1].at : F.duration; S.keep = S.focus ? new Set(C.parts(S.focus)) : null;
        if (i && S.sfx !== false && S.dur >= 0.8) F.sfx(S.at, 'fly', 0.5, { dur: S.dur });
        // the card lingers into the start of the next flight (as in the reference), but is gone before the next card's first row
        const a0 = (Q, k) => Q.at + (k ? Q.dur * 0.45 : 0.2), N = stops[i + 1], nextRow = N && N.card ? (N.card.at?.[0] ?? a0(N, i + 1) + 0.2) : 1e9;
        if (S.card) S.cardEl = mkCard(S.card, a0(S, i), S.cardUntil ?? (N ? Math.min(S.until + 0.45, nextRow - 0.12) : S.until), S);
        for (const L of S.labels || []) C.label({ until: S.until - 0.15, ...L });
        F.info('diagram', S.at, S.until, { group: 'stop' + i });
      });
      W0d.update(0); return stops;
    };
    const dimParts = (t) => { for (const p of W0d.parts) { let d = 0; if (!p.nodim) for (const S of stops) { if (!S.keep || S.keep.has(p)) continue; const a = S.at + (S.i ? S.dur * 0.55 : 0), k = Math.min(E.sine(clamp01((t - a) / 0.5)), 1 - E.sine(clamp01((t - (S.until - 0.25)) / 0.4))); d = Math.max(d, k * S.dim); } p.u.uDim.value = d; } };

    // ---------- Every frame ----------
    const frameFns = [];
    C.onFrame = (fn) => { frameFns.push(fn); return C; };
    const BG = rgb(opt.bg ?? 'paper');
    const update = (t) => { for (const fn of frameFns) fn(t); W0d.update(t); placeCamera(t); dimParts(t); drawCards(t); drawLabels(t); drawBars(t); drawInsets(t); drawPlates(t); for (const I of insets) if (I.k > 0.002) I.K.world.update(t); };
    const draw = () => { renderWorld(W0d, camera, T0, BG); for (const I of insets) if (I.k > 0.002) renderWorld(I.K.world, I.cam, I.T, rgb(I.o.bg ?? 'paper')); renderer.setRenderTarget(null); renderer.setViewport(0, 0, W0, H0); renderer.clear(true, true, true); blit(T0, 0, 0, W0, H0); for (const I of insets) if (I.cur && I.cur.w > 2) blit(I.T, Math.round(I.cur.x), Math.round(I.cur.y), Math.round(I.cur.w), Math.round(I.cur.h)); };
    C.update = update;
    C.run = () => { F.add((t) => { update(t); draw(); }); };
    window.__sourced = () => sourced.map((x) => ({ text: x.text, what: x.what }));

    // ---------- Checks (printed in --check) ----------
    F.addLint(() => {
      const out = [], add = (level, t, what, msg) => out.push({ level, t: r2(t), src: '', what, msg }), seen = new Set(), once = (k) => { if (seen.has(k)) return false; seen.add(k); return true; };
      const circleCover = (c, R, b) => { let n = 0, hit2 = 0; for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) { if (i * i + j * j > 36) continue; n++; const x = c.x + i / 6 * R, y = c.y + j / 6 * R; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) hit2++; } return hit2 / n; };
      const frame = { x: 0, y: 0, w: W0, h: H0 }, short = (s) => String(s).slice(0, 18);
      stops.forEach((S, i) => {
        const a = S.at + (i ? S.dur : 0), name = S.card?.name ?? `#${i + 1}`;
        // ⑤ the card's third line is the style's fixed item
        if (S.card && S.card.swatch !== false && !S.card.caveat && S.card.caveat !== false && once('cv' + i)) add('warn', S.at, MSG('缺「哪里画得不真实」', 'no "how this differs" line'), MSG(`「${short(name)}」的信息卡没有第三行：写一句这里哪里画得和真实的不一样（画大了、画厚了、数量画少了、上了颜色…），出处写进 brief.md；确实没有可说的写 caveat: false`, `the card "${short(name)}" has no third line: say how the drawing differs from the real thing (drawn larger, thicker, fewer, coloured…) with its source in brief.md; if there is truly nothing to say, write caveat: false`));
        if (!S.focus && !S.look && !S.target) return;
        const ts = [a + 0.4, (a + S.until) / 2, S.until - 0.5].filter((t, k2, arr) => t > a && t < S.until && arr.indexOf(t) === k2);
        for (const t of ts) {
          update(t); const sp = subjectOf(S); if (!sp || sp.r <= 0) continue;
          const c = proj(sp.c), R = sp.r * pxPerUnit(sp.c), minS = Math.min(W0, H0);
          // ① the subject is in frame and big enough to read
          if ((c.behind || circleCover(c, R, frame) < 0.5) && once('of' + i)) add('warn', t, MSG('主体不在画面里', 'subject out of frame'), MSG(`「${short(name)}」这一站，主体有一半以上在画面外：检查 look / focus、az / el，或者把 fill 调小`, `at stop "${short(name)}" more than half of the subject is out of frame: check look / focus and az / el, or lower fill`));
          if (R < minS * 0.05 && once('sm' + i)) add('warn', t, MSG('主体太小', 'subject too small'), MSG(`「${short(name)}」这一站，主体在画面上只有 ${Math.round(R * 2)} px 宽：把 fill 调大，或者 look 只对准它`, `at stop "${short(name)}" the subject is only ${Math.round(R * 2)} px wide: raise fill, or look at it alone`));
          // ② nothing may sit on the subject: the card, labels, an inset
          const cv = S.cardEl && S.cardEl.box && S.cardEl.box.h > 20 ? circleCover(c, R * 0.8, S.cardEl.box) : 0;
          if (cv > 0.25 && once('cc' + i)) add('warn', t, MSG('信息卡盖住主体', 'card covers the subject'), MSG(`「${short(name)}」的信息卡盖住了主体的 ${Math.round(cv * 100)}%：镜头换个角度 / fill 调小，或者给这一站写 free 把主体挪开`, `the card of "${short(name)}" covers ${Math.round(cv * 100)}% of the subject: change the angle / lower fill, or give the stop a free area that moves the subject away`));
          for (const L of labels) { if (!L._box || t < L.at + 0.3 || t > L.until - 0.3) continue; const lv = circleCover(c, R * 0.7, L._box); if (lv > 0.22 && once('lc' + L.text)) add('warn', t, MSG('标签盖住主体', 'label covers the subject'), MSG(`标签「${short(L.text)}」盖住了主体的 ${Math.round(lv * 100)}%：改 dx / dy 把它挪到主体外面`, `the label "${short(L.text)}" covers ${Math.round(lv * 100)}% of the subject: move it off with dx / dy`));
            if (S.cardEl && S.cardEl.box && S.cardEl.box.h > 20) { const b = S.cardEl.box, q = L._box; if (q.x < b.x + b.w && q.x + q.w > b.x && q.y < b.y + b.h && q.y + q.h > b.y && once('lk' + L.text)) add('warn', t, MSG('标签压住信息卡', 'label over the card'), MSG(`标签「${short(L.text)}」和信息卡叠在一起：改 dx / dy`, `the label "${short(L.text)}" overlaps the card: change dx / dy`)); } }
          for (const I of insets) { if (!I.cur || I.k < 0.98) continue; const iv = circleCover(c, R * 0.7, I.cur); if (iv > 0.3 && once('ic' + i)) add('warn', t, MSG('特写窗盖住主体', 'inset covers the subject'), MSG(`「${short(name)}」这一站，特写小窗盖住了主体的 ${Math.round(iv * 100)}%：换 rect，或者让主体落在画面另一边（free）`, `at stop "${short(name)}" the inset covers ${Math.round(iv * 100)}% of the subject: move its rect, or put the subject on the other side (free)`)); }
          // ③ faded back, the rest must still let the subject stand out: its colour against the pale ground everything else has gone to
          if (S.keep && S.dim > 0.3) for (const p of S.keep) { if (p.isGroup || p.nodim || !p.color) continue; const d = Math.hypot(...p.color.map((v, k2) => v - G.uPaper.value.getComponent(k2))), cr = (Math.max(lumc(p.color), lumc(rgb(opt.fadeTo ?? 'cream'))) + 0.05) / (Math.min(lumc(p.color), lumc(rgb(opt.fadeTo ?? 'cream'))) + 0.05);
            if (d < 0.16 && cr < 1.25 && once('ct' + p.name)) add('warn', t, MSG('主体不够突出', 'subject too pale'), MSG(`「${p.name}」的颜色（${toHex(p.color)}）和其余部分变淡后的底色太接近（对比 ${cr.toFixed(2)}:1）：其余变淡以后它也跟着看不清，换一个更深或更饱和的颜色`, `"${p.name}" (${toHex(p.color)}) is too close to the pale ground the rest fades to (${cr.toFixed(2)}:1): once the rest fades it disappears with them; give it a deeper or more saturated colour`)); }
        }
        // ⑥ card rows arrive with the voice
        if (F.voiced && S.cardEl && F.T && F.T.lines) { const speaking = (t) => F.T.lines.some((l) => !l.silence && t >= l.start - 0.3 && t <= l.end + 0.15); for (const r of S.cardEl.rows) if (!speaking(r.at) && once('rw' + i + r.kind)) add('warn', r.at, MSG('信息卡没跟上旁白', 'card row off the voice'), MSG(`「${short(r.text)}」这一行在 ${r2(r.at)}s 出现时没有人在说话：行的时间取旁白里对应那句（或那个词）的开始，card.at: [s('句1'), s('句2'), s('句3')]`, `the row "${short(r.text)}" appears at ${r2(r.at)}s while nobody is speaking: time each row to the start of its narration line or word, card.at: [s('l1'), s('l2'), s('l3')]`));
          const last = S.cardEl.rows[S.cardEl.rows.length - 1]; if (last) { const need = (F.voiced ? 1.0 : 1.2) + String(last.text).replace(/\s/g, '').length * (F.voiced ? 0.07 : 0.09), have = S.cardEl.b - last.at; if (have < need && once('rd' + i)) add('warn', last.at, MSG('停留太短', 'too brief'), MSG(`「${short(last.text)}」只停留 ${have.toFixed(1)} 秒，读完至少要 ${need.toFixed(1)} 秒：这一站留长一点，或者把这行提前`, `"${short(last.text)}" stays only ${have.toFixed(1)} s; reading it needs ${need.toFixed(1)} s: hold the stop longer or bring the row in earlier`)); } }
      });
      // ④ scale bars: the number must agree with the model and with what is drawn
      for (const B of bars) { const a = Math.max(B.at + 0.5, 0), b = Math.min(B.until, F.duration) - 0.4; for (const t of [a, (a + b) / 2, b]) { if (!(t >= a && t <= b)) continue; update(t); if (!B.px) continue;
        const m = /([\d.]+)\s*(.*)$/.exec(String(B.label || '').replace(/,/g, '')), num = m ? parseFloat(m[1]) : NaN, un = m ? m[2].trim() : '', k = un === units.unit || !un ? units.per : ((units.ladder || []).find((x) => x[0] === un) || [])[1] ? ((units.ladder || []).find((x) => x[0] === un))[1] : null;
        if (!m || !isFinite(num)) { if (once('bn' + B.at)) add('warn', t, MSG('比例尺没有数值', 'scale bar has no number'), MSG(`比例尺的文字「${short(B.label)}」里读不出数字：写成「数值 单位」`, `no number can be read from the scale bar text "${short(B.label)}": write "number unit"`)); continue; }
        if (k === null) { if (once('bu' + B.at)) add('warn', t, MSG('比例尺单位', 'scale bar unit'), MSG(`比例尺写的是「${un}」，和模型的单位「${units.unit}」对不上：PROMO.cutaway(F, { units: { unit, per, ladder } }) 里声明这个单位`, `the scale bar says "${un}" but the model's unit is "${units.unit}": declare it in PROMO.cutaway(F, { units: { unit, per, ladder } })`)); continue; }
        const real = B.world * units.per, want = num * k, err = Math.abs(real - want) / want;
        if (err > 0.04 && once('bv' + B.at)) add('error', t, MSG('比例尺数值不对', 'scale bar is wrong'), MSG(`比例尺写「${B.label}」，但它在模型上量出来是 ${+(real / k).toPrecision(3)} ${un || units.unit}（差 ${Math.round(err * 100)}%）：模型没有按这个尺寸搭，或者 units.per 不对`, `the scale bar reads "${B.label}" but spans ${+(real / k).toPrecision(3)} ${un || units.unit} of the model (${Math.round(err * 100)}% off): the model is not built to that size, or units.per is wrong`));
        const pa = proj(barEnds(B).a), pb = proj(barEnds(B).b), drawn = Math.hypot(pb.x - pa.x, pb.y - pa.y); if (Math.abs(drawn - B.px) > 3 && once('bp' + B.at)) add('error', t, MSG('比例尺没跟镜头', 'scale bar off the camera'), MSG(`比例尺画了 ${Math.round(B.px)} px，按镜头应该是 ${Math.round(drawn)} px`, `the scale bar is drawn ${Math.round(B.px)} px long; by the camera it should be ${Math.round(drawn)} px`));
        if (B.box && (B.box.x < 0 || B.box.x + B.box.w > W0) && once('bo' + B.at)) add('warn', t, MSG('比例尺出画', 'scale bar cut'), MSG(`比例尺「${short(B.label)}」有一部分在画面外：这一站 fill 调小一点`, `the scale bar "${short(B.label)}" is partly out of frame: lower this stop's fill`)); } }
      // ⑦ the camera should not rush
      stops.forEach((S, i) => { if (!i) return; const a = stops[i - 1].pose, b = S.pose, travel = a.c.distanceTo(b.c) / Math.max(1e-6, Math.max(a.dist, b.dist) * 2 * TANF), zr = Math.max(a.dist, b.dist) / Math.min(a.dist, b.dist); if ((travel / S.dur > 2.2 || (zr > 6 && S.dur < 1.2)) && once('cf' + i)) add('warn', S.at, MSG('镜头太急', 'camera too fast'), MSG(`${r2(S.at)}s 的飞行 ${S.dur}s 内走了 ${travel.toFixed(1)} 个画面高 / 缩放 ${zr.toFixed(1)} 倍：dur 拉长`, `the flight at ${r2(S.at)}s covers ${travel.toFixed(1)} frame heights / zooms ${zr.toFixed(1)}× in ${S.dur}s: make dur longer`)); });
      update(0);
      return out;
    });
    update(0);
    return C;
  };
})();
