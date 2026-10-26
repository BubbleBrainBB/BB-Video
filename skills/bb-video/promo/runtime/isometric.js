// isometric.js: Isometric miniature world (等距微缩世界), one of bb-video's visual styles (style notes in styles/isometric/STYLE.md). Load after promo.js; the page needs a three import map (the starter page has one).
// A whole little world seen from a fixed 45° isometric view (orthographic, no perspective, everything sharp): tiles on plinths with gaps between them, low-poly
// buildings, trees, roads, conveyors, shelves, vehicles and little people that move on their own. Information is told by the world itself: routes drawn on the
// ground, parcels flowing, counts piling up, a clock on a pole; the part being talked about lifts and stays in colour while the rest fades back.
// The camera never cuts by default: it pans across the world, pushes in on one part, pulls back to show the whole system.
//
//   const W = await PROMO.isometric(F, { palette, bg, angle, ao, bloom, accent })
//   ground  const t = W.tile({ x, z, w, d, top: 'grass' | 'concrete' | 'asphalt' | 'floor' | 'water' | 'sand' | colour, at })   → t.p(lx, lz) world point
//   parts   W.building / warehouse / house / tower / shop / walls / tree / lamp / road / conveyor / sorter / scanner / shelf / rack / cage / locker / stack   ({ tile, x, z, ry, at, … })
//   movers  W.person / van / truck / trike / car / bot / parcel   → A.place / move / loop / ride / toss / show / hide
//   info    W.route(pts, { at, dur, color, flow })   W.label(anchor, { text, sub, at, until })   W.counter / W.timer   W.title({ text, sub, at, until })
//   verbs   W.focus([things], at, until)   W.lights(thing, at)   W.sky([[t, 'day' | 'dusk' | 'night']])   W.camera([{ at, fit: [things], dur } | { at, look, size } | { at, follow }])
//   frame   W.onFrame((t) => …); finally W.run()
//   checks  reported automatically in --check: labels cut by the frame or sitting in the caption band, focus / route head out of frame, movers that jump, camera moves too fast
(function () {
  const P = window.PROMO;
  const MSG = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(MSG('isometric.js 要在 promo.js 之后加载', 'isometric.js must load after promo.js'));
  const { E, seg } = P;
  const r2 = (n) => Math.round(n * 100) / 100;
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // Palettes: the bright, friendly flat colours of isometric illustration (pale ground, grass, concrete, asphalt, pastel buildings)
  const PALETTES = {
    day: { bg: '#E8EFEA', grass: '#8FCB6B', grass2: '#7AB85A', concrete: '#E6E1D6', asphalt: '#596273', floor: '#EFE9DD', water: '#7CC6E0', sand: '#EBD49A', soil: '#B98A62', side: null,
      wall: '#F4EFE6', wall2: '#F7D9B8', wall3: '#CFE3F2', wall4: '#F3C6C1', roof: '#E9785E', roof2: '#5B8DB8', metal: '#AEB6C1', dark: '#3B4250', wood: '#C89566', leaf: '#6DBB58', leaf2: '#4FA35A', trunk: '#9A6B4B',
      glass: '#8FB9D9', line: '#FFFFFF', parcel: '#D7A86E', tape: '#EBCB93', skin: '#F2C7A5', accent: '#FF6B4A', accent2: '#2FA7A0', ink: '#22303C' },
    mint: { bg: '#DDEFEA', grass: '#9AD4A0', grass2: '#7FC28C', concrete: '#EEF1EC', asphalt: '#5D6B78', floor: '#F2F0E8', water: '#8CD3E5', sand: '#F0DCA6', soil: '#A9876A', side: null,
      wall: '#FAF7F0', wall2: '#FFE3C2', wall3: '#D4E9F7', wall4: '#F8D0CB', roof: '#F08A6C', roof2: '#4F97B0', metal: '#B4BDC6', dark: '#38434F', wood: '#CF9F70', leaf: '#74C177', leaf2: '#56AA68', trunk: '#9C7052',
      glass: '#9CC9DE', line: '#FFFFFF', parcel: '#DCAE74', tape: '#F0D29C', skin: '#F3CBA9', accent: '#FF7A59', accent2: '#2C9C95', ink: '#20323A' },
    peach: { bg: '#F6E9DE', grass: '#A9CF74', grass2: '#93BD62', concrete: '#EDE3D6', asphalt: '#5F5A6E', floor: '#F5EDE2', water: '#86C5D8', sand: '#F1D49B', soil: '#C28E66', side: null,
      wall: '#FBF4EA', wall2: '#FFD7B0', wall3: '#D9E4F2', wall4: '#F7C3BD', roof: '#E46F5A', roof2: '#6A86C2', metal: '#B7B3BE', dark: '#3E3A4A', wood: '#C99567', leaf: '#86BF5E', leaf2: '#6CAA54', trunk: '#9A6A4A',
      glass: '#9DBAD8', line: '#FFFFFF', parcel: '#D9A56A', tape: '#EFCB90', skin: '#F2C4A2', accent: '#F2545B', accent2: '#3A8FB7', ink: '#2E2A38' },
  };
  // Times of day for W.sky: background, sky light, sun, and how many windows / lamps are lit (0–1)
  const SKIES = {
    day: { bg: null, hemi: 1.0, sun: 2.1, sunColor: '#FFF4E6', lights: 0 },
    dusk: { bg: '#F2D6C4', hemi: 0.75, sun: 1.3, sunColor: '#FFC69A', lights: 0.55 },
    night: { bg: '#27324A', hemi: 0.42, sun: 0.35, sunColor: '#9FB6FF', lights: 1 },
  };

  P.isometric = async function (F, opt = {}) {
    const THREE = await import('three');
    const imp = (p) => import(`three/addons/${p}`);
    const [{ RoundedBoxGeometry }, { EffectComposer }, { RenderPass }, { OutputPass }, { UnrealBloomPass }, gtao] = await Promise.all([
      imp('geometries/RoundedBoxGeometry.js'), imp('postprocessing/EffectComposer.js'), imp('postprocessing/RenderPass.js'), imp('postprocessing/OutputPass.js'), imp('postprocessing/UnrealBloomPass.js'),
      imp('postprocessing/GTAOPass.js').catch(() => null)]);
    const W0 = F.W, H0 = F.H, PT = F.portrait, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const PAL = { ...(PALETTES[typeof opt.palette === 'string' ? opt.palette : 'day'] || PALETTES.day), ...(typeof opt.palette === 'object' ? opt.palette : {}) };
    if (opt.accent) PAL.accent = opt.accent;
    const BG = opt.bg ?? PAL.bg;
    const col = (c) => (c && PAL[c] !== undefined && PAL[c] !== null ? PAL[c] : c);
    const W = { THREE, V3, W: W0, H: H0, portrait: PT, PAL, col };
    F.blurBase?.(opt.blur ?? 1);   // a crisp, slow-moving world: one render per frame (motion-blur sub-frames would only cost time)
    const frameFns = [];
    W.onFrame = (fn) => frameFns.push(fn);

    // ---------- Renderer, lights, background ----------
    const canvas = P.el('canvas', `left:0;top:0;width:${W0}px;height:${H0}px`, F.layer('', 1));
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(W0, H0, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = opt.exposure ?? 1.0;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(); const bgColor = new THREE.Color(BG); scene.background = bgColor.clone();
    const hemi = new THREE.HemisphereLight('#FFFFFF', '#C9C2B8', 1.0); scene.add(hemi);
    const sun = new THREE.DirectionalLight('#FFF4E6', 2.1); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
    scene.add(sun, sun.target);
    // Isometric view: azimuth 45°, elevation atan(1/√2) ≈ 35.26° ('iso'); 'game' = the 2:1 pixel-art dimetric (30°)
    const EL0 = opt.angle === 'game' ? Math.PI / 6 : Math.atan(1 / Math.SQRT2), AZ0 = Math.PI / 4;
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
    Object.assign(W, { scene, camera, renderer });
    // Post: soft ambient occlusion (the contact darkening of the reference renders) + optional glow for night lights. Both off → render straight to the canvas
    let composer = null, aoPass = null;
    const useAO = opt.ao !== false && gtao && gtao.GTAOPass, useBloom = !!opt.bloom;
    if (useAO || useBloom) {
      composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W0, H0);
      composer.addPass(new RenderPass(scene, camera));
      if (useAO) { aoPass = new gtao.GTAOPass(scene, camera, W0, H0); aoPass.output = gtao.GTAOPass.OUTPUT.Default; aoPass.blendIntensity = opt.ao?.intensity ?? 0.8; aoPass.updateGtaoMaterial({ radius: opt.ao?.radius ?? 0.6, distanceExponent: 1, thickness: 1, scale: 1, samples: 16 }); aoPass.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 }); composer.addPass(aoPass); }
      if (useBloom) { const b = typeof opt.bloom === 'object' ? opt.bloom : {}; composer.addPass(new UnrealBloomPass(new THREE.Vector2(W0, H0), b.strength ?? 0.55, b.radius ?? 0.4, b.threshold ?? 0.95)); }
      composer.addPass(new OutputPass());
    }

    // ---------- Zones: everything belongs to one (a tile, a mover, 'world'); W.focus keeps some in colour and fades the rest back ----------
    // Fading is injected into every material's shader (after lighting, before tone mapping): colour → towards a pale grey of the background, so it works on textured materials too
    const zones = [];
    const DIMC = { value: new THREE.Color(BG).lerp(new THREE.Color('#FFFFFF'), 0.35) };
    const mkZone = (name, rect = null) => { const z = { name, rect, u: { value: 0 }, mats: new Map(), lift: 0, isZone: true }; zones.push(z); return z; };
    const WORLD = mkZone('world'), FX = mkZone('fx');
    W.zone = (name) => mkZone(name);   // a zone of your own: give it to a few parts ({ zone }) so W.focus can light them up without their whole tile
    const dimShader = (sh, zone) => {
      sh.uniforms.uDim = zone.u; sh.uniforms.uDimC = DIMC;
      sh.fragmentShader = 'uniform float uDim;\nuniform vec3 uDimC;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\n  { float g = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114)); gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(vec3(g), uDimC, 0.72), uDim); }');
    };
    // Material per (zone, colour): matte, a hint of sheen like the painted plastic of the references
    const mat = (zone, color, o = {}) => {
      const key = `${color}|${o.emissive ?? ''}|${o.rough ?? ''}|${o.metal ?? ''}|${o.flat ? 1 : 0}|${o.vc ? 1 : 0}|${o.transparent ? o.opacity : ''}`;
      if (zone.mats.has(key) && !o.unique) return zone.mats.get(key);
      const m = new THREE.MeshStandardMaterial({ color: o.vc ? '#FFFFFF' : col(color), roughness: o.rough ?? 0.82, metalness: o.metal ?? 0, flatShading: !!o.flat, vertexColors: !!o.vc,
        ...(o.emissive ? { emissive: col(o.emissive), emissiveIntensity: o.ei ?? 0 } : {}), ...(o.transparent ? { transparent: true, opacity: o.opacity ?? 0.5, depthWrite: false } : {}) });
      m.onBeforeCompile = (sh) => dimShader(sh, zone);
      if (!o.unique) zone.mats.set(key, m);
      return m;
    };
    W.mat = mat;

    // ---------- Geometry primitives (cached), every shape stands on its base: y = the bottom ----------
    const GC = new Map();
    const gget = (k, mk) => { if (!GC.has(k)) GC.set(k, mk()); return GC.get(k); };
    const q3 = (n) => Math.round(n * 1000) / 1000;
    const geoBox = (w, h, d, r) => { const rr = Math.min(r ?? Math.min(0.08, Math.min(w, h, d) * 0.18), Math.min(w, h, d) / 2 - 1e-3); return gget(`b${q3(w)},${q3(h)},${q3(d)},${q3(rr)}`, () => { const g = rr > 0.004 ? new RoundedBoxGeometry(w, h, d, 2, rr) : new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return g; }); };
    const geoCyl = (r1, r2, h, n = 16) => gget(`c${q3(r1)},${q3(r2)},${q3(h)},${n}`, () => { const g = new THREE.CylinderGeometry(r1, r2, h, n); g.translate(0, h / 2, 0); return g; });
    const geoSph = (r, n = 14) => gget(`s${q3(r)},${n}`, () => new THREE.SphereGeometry(r, n, Math.max(8, Math.round(n * 0.7))));
    const geoCone = (r, h, n = 10) => gget(`k${q3(r)},${q3(h)},${n}`, () => { const g = new THREE.ConeGeometry(r, h, n); g.translate(0, h / 2, 0); return g; });
    const mesh = (parent, g, m, x = 0, y = 0, z = 0, o = {}) => { const me = new THREE.Mesh(g, m); me.position.set(x, y, z); if (o.ry) me.rotation.y = o.ry; if (o.rx) me.rotation.x = o.rx; if (o.rz) me.rotation.z = o.rz; me.castShadow = o.shadow !== false; me.receiveShadow = true; parent.add(me); return me; };
    // box(parent, zone, colour, x, y, z, w, h, d, o): a rounded box standing at y
    const box = (p, zn, c, x, y, z, w, h, d, o = {}) => mesh(p, geoBox(w, h, d, o.r), mat(zn, c, o), x, y, z, o);
    const cyl = (p, zn, c, x, y, z, r, h, o = {}) => mesh(p, geoCyl(r, o.r2 ?? r, h, o.n ?? 16), mat(zn, c, o), x, y, z, o);
    const sph = (p, zn, c, x, y, z, r, o = {}) => mesh(p, geoSph(r, o.n ?? 14), mat(zn, c, o), x, y, z, o);
    const cone = (p, zn, c, x, y, z, r, h, o = {}) => mesh(p, geoCone(r, h, o.n ?? 10), mat(zn, c, o), x, y, z, o);
    Object.assign(W, { box, cyl, sph, cone, mesh, geoBox, geoCyl, geoSph, geoCone });
    const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
    const tex = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const font = (w = 700) => `${w} 100px ${(F.theme && F.theme.fonts && F.theme.fonts.sans) || '"Noto Sans SC", sans-serif'}`;

    // ---------- Appearing: tiles drop in from above, parts pop up out of their tile (scale with a little overshoot) ----------
    const pops = [];   // { g, at, until, kind: 'drop' | 'pop', base: y }
    const popIn = (g, at, until, kind) => { if (at === undefined && until === undefined) return; pops.push({ g, at: at ?? -1, until: until ?? 1e9, kind, y0: g.position.y }); };
    const backOut = (x) => { const c = 1.5; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

    // ---------- Tiles: a square of ground on a thick plinth; gaps between tiles make the world read as a model ----------
    const tiles = [];
    W.tile = (o = {}) => {
      const w = o.w ?? 8, d = o.d ?? 8, h = o.h ?? 0.9, x = o.x ?? 0, z = o.z ?? 0, top = col(o.top ?? 'grass');
      const side = col(o.side ?? (o.top === 'grass' || o.top === undefined ? 'soil' : null)) ?? new THREE.Color(top).multiplyScalar(0.8).getStyle();
      const zone = mkZone(o.name ?? `tile${tiles.length}`, { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
      const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
      box(g, zone, side, 0, -h, 0, w, h - 0.12, d, { r: 0.16 });
      box(g, zone, top, 0, -0.26, 0, w, 0.26, d, { r: 0.1 });
      const T = { name: zone.name, g, zone, x, z, w, d, h, top, at: o.at, kids: 0, isTile: true,
        p: (lx = 0, lz = 0, ly = 0) => V3(x + lx, ly, z + lz),
        corners: () => [V3(x - w / 2, 0, z - d / 2), V3(x + w / 2, 0, z - d / 2), V3(x - w / 2, 0, z + d / 2), V3(x + w / 2, 0, z + d / 2), V3(x - w / 2, -h, z + d / 2), V3(x + w / 2, -h, z + d / 2), V3(x + w / 2, -h, z - d / 2)] };
      zone.tile = T;
      popIn(g, o.at, o.until, 'drop');
      if (o.at !== undefined && o.sfx !== false) F.sfx(o.at + 0.42, 'land', o.gain ?? 0.35);
      tiles.push(T); return T;
    };
    // Lift of the ground at a world point (a focused tile rises a little; a tile dropping in): movers standing there go with it
    const groundY = (p) => { for (const T of tiles) { const r = T.zone.rect; if (p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1) return T.g.position.y; } return 0; };

    // ---------- Parts: everything that stands on a tile. Common options { tile, x, z, ry (radians, or 'n'|'e'|'s'|'w'), at, until, zone } ----------
    const parts = [];
    const RY = { s: 0, e: Math.PI / 2, n: Math.PI, w: -Math.PI / 2 };
    const part = (o, kind) => {
      const T = o.tile ?? null, zone = o.zone === 'own' ? mkZone(`${kind}${parts.length}`, T ? T.zone.rect : null) : o.zone ?? (T ? T.zone : WORLD);
      const g = new THREE.Group(); g.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0); g.rotation.y = typeof o.ry === 'string' ? RY[o.ry] ?? 0 : o.ry ?? 0;
      (T ? T.g : scene).add(g);
      // parts appearing with their tile pop one after another; only the first two of a tile make a sound (a tile of 30 parts would be a rattle)
      const auto = T && T.at !== undefined && o.at === undefined, at = o.at ?? (auto ? T.at + 0.3 + 0.05 * T.kids : undefined), loud = o.sfx ?? !(auto && T.kids > 1); if (auto) T.kids++;
      const S = { kind, g, zone, tile: T, at, appear: at, until: o.until, isPart: true,   // appear: when it pops up (some parts reuse .at for a point helper)
        p: (lx = 0, lz = 0, ly = 0) => { const v = V3(lx, ly, lz).applyAxisAngle(V3(0, 1, 0), g.rotation.y).add(g.position); if (T) v.add(V3(T.x, 0, T.z)); return v; } };
      S.done = () => { if (!S.box) { g.updateWorldMatrix(true, true); const s = g.scale.clone(); g.scale.set(1, 1, 1); g.updateWorldMatrix(true, true); S.box = new THREE.Box3().setFromObject(g); g.scale.copy(s); } popIn(g, at, o.until, 'pop'); if (at !== undefined && loud) F.sfx(at, 'pop', o.gain ?? 0.18); parts.push(S); return S; };
      return S;
    };
    W.part = part;

    // Window panes (instanced): glass by day, some light up warm at dusk / when switched on
    const windowSets = [];
    const addWindows = (S, faces, o = {}) => {
      const list = [];
      for (const f of faces) for (let r = 0; r < f.rows; r++) for (let c = 0; c < f.cols; c++) list.push({ f, r, c });
      if (!list.length) return null;
      const ww = o.ww ?? 0.42, wh = o.wh ?? 0.5;
      const m = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.35, metalness: 0.1 }); m.onBeforeCompile = (sh) => dimShader(sh, S.zone);
      const im = new THREE.InstancedMesh(geoBox(ww, wh, 0.06, 0.02), m, list.length); im.castShadow = false; im.receiveShadow = true;
      const M4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      list.forEach((it, i) => {
        const { f, r, c } = it, u = (c + 0.5) / f.cols - 0.5, y = f.y0 + (r + 0.5) * f.dy - wh / 2;
        const pos = V3(f.cx + f.ax * u * f.span, y, f.cz + f.az * u * f.span);
        q.setFromAxisAngle(V3(0, 1, 0), f.rot); M4.compose(pos, q, V3(1, 1, 1)); im.setMatrixAt(i, M4);
        im.setColorAt(i, new THREE.Color(col('glass')));
        it.r0 = hash(i * 7.3 + S.g.id);
      });
      S.g.add(im);
      const set = { S, im, list, on: o.lights ?? null, glass: new THREE.Color(col('glass')), warm: new THREE.Color(o.warm ?? '#FFD27A').multiplyScalar(opt.bloom ? 1.6 : 1.15), last: -1 };
      windowSets.push(set); return set;
    };
    // faces for a w × d × h box: windows on the two faces the isometric camera sees (+x and +z), and the other two for when the world turns
    const boxFaces = (w, d, h, o = {}) => {
      const fl = o.floors ?? Math.max(1, Math.floor((h - 0.3) / 1.0)), dy = (h - (o.base ?? 0.35)) / fl, y0 = o.base ?? 0.35;
      const cols = (len) => Math.max(1, Math.floor((len - 0.4) / (o.pitch ?? 0.9)));
      return [{ cx: 0, cz: d / 2 + 0.01, ax: 1, az: 0, span: w - 0.6, cols: cols(w), rows: fl, rot: 0, y0, dy },
        { cx: w / 2 + 0.01, cz: 0, ax: 0, az: -1, span: d - 0.6, cols: cols(d), rows: fl, rot: Math.PI / 2, y0, dy },
        { cx: 0, cz: -d / 2 - 0.01, ax: -1, az: 0, span: w - 0.6, cols: cols(w), rows: fl, rot: Math.PI, y0, dy },
        { cx: -w / 2 - 0.01, cz: 0, ax: 0, az: 1, span: d - 0.6, cols: cols(d), rows: fl, rot: -Math.PI / 2, y0, dy }];
    };
    // A painted sign (text on a facade or a roof edge): registered for the fact check; invented names only, never a real company's mark
    const signTex = (text, o = {}) => {
      const fs = 100, cv0 = mkCanvas(8, 8).getContext('2d'); cv0.font = font(800).replace('100px', fs + 'px');
      const mk = o.mark ? fs * 1.15 : 0, tw = cv0.measureText(text).width, cv = mkCanvas(tw + fs * 0.9 + mk, fs * 1.5), c = cv.getContext('2d');
      c.fillStyle = col(o.bg ?? 'accent2'); c.beginPath(); c.roundRect(0, 0, cv.width, cv.height, fs * 0.3); c.fill();
      if (o.mark) {   // a little isometric cube: the mark of an invented brand (never a real company's)
        const cx = fs * 0.45 + mk / 2, cy = cv.height / 2, r = fs * 0.46, hx = r * Math.cos(Math.PI / 6), hy = r / 2, face = (pts, f) => { c.fillStyle = f; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(cx + x, cy + y) : c.moveTo(cx + x, cy + y))); c.closePath(); c.fill(); };
        face([[0, -r], [hx, -hy], [0, 0], [-hx, -hy]], '#FFFFFF'); face([[-hx, -hy], [0, 0], [0, r], [-hx, hy]], 'rgba(255,255,255,.72)'); face([[0, 0], [hx, -hy], [hx, hy], [0, r]], 'rgba(255,255,255,.45)');
      }
      c.font = font(800).replace('100px', fs + 'px'); c.fillStyle = col(o.fg ?? '#FFFFFF'); c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText(text, (cv.width + mk) / 2, cv.height / 2 + fs * 0.04);
      return { t: tex(cv), aspect: cv.width / cv.height };
    };
    const sign = (S, text, o = {}) => {
      const { t, aspect } = signTex(text, o), h = o.h ?? 0.6, w = h * aspect;
      const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }); m.onBeforeCompile = (sh) => dimShader(sh, S.zone);
      const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); me.position.set(o.x ?? 0, o.y ?? 1, o.z ?? 0); me.rotation.y = o.ry ?? 0; me.castShadow = false; S.g.add(me);
      if (o.fact !== false) F.fact(text, S.appear ?? 0, S.until ?? 1e9);
      return me;
    };
    W.sign = (S, text, o) => sign(S, text, o);

    // Building: a body, a roof (flat with a parapet / gable / sawtooth factory roof / none), windows, a door, an awning, a sign
    W.building = (o = {}) => {
      const S = part(o, 'building'), zn = S.zone, w = o.w ?? 3, d = o.d ?? 3, h = o.h ?? 2.6, wall = o.color ?? 'wall';
      box(S.g, zn, wall, 0, 0, 0, w, h, d, { r: 0.08 });
      const roof = o.roof ?? 'flat', rc = o.roofColor ?? (roof === 'flat' ? new THREE.Color(col(wall)).multiplyScalar(0.86).getStyle() : 'roof');
      if (roof === 'flat') { box(S.g, zn, rc, 0, h, 0, w + 0.1, 0.18, d + 0.1, { r: 0.05 }); box(S.g, zn, new THREE.Color(col(wall)).multiplyScalar(0.93).getStyle(), 0, h + 0.18, 0, w - 0.4, 0.06, d - 0.4, { r: 0.02 });
        if (o.ac !== false && w > 1.6) { box(S.g, zn, 'metal', w * 0.22, h + 0.18, -d * 0.18, 0.5, 0.32, 0.4, { r: 0.05 }); } }
      else if (roof === 'gable') {
        const sh = new THREE.Shape(); const rh = o.roofH ?? Math.min(w, d) * 0.42; sh.moveTo(-w / 2 - 0.15, 0); sh.lineTo(w / 2 + 0.15, 0); sh.lineTo(0, rh); sh.lineTo(-w / 2 - 0.15, 0);
        const g = new THREE.ExtrudeGeometry(sh, { depth: d + 0.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 }); g.translate(0, 0, -(d + 0.3) / 2);
        mesh(S.g, g, mat(zn, rc), 0, h, 0);
      } else if (roof === 'saw') {
        const n = o.teeth ?? Math.max(2, Math.round(d / 1.6)), td = d / n;
        for (let i = 0; i < n; i++) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(td, 0); sh.lineTo(td, 0.7); sh.lineTo(0, 0); const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(w / 2, 0, -d / 2 + i * td);
          mesh(S.g, g, mat(zn, rc), 0, h, 0); box(S.g, zn, 'glass', 0, h + 0.05, -d / 2 + i * td + td - 0.03, w - 0.1, 0.6, 0.04, { r: 0.01 }); }
      } else if (roof === 'arch') {
        const g = new THREE.CylinderGeometry(d / 2, d / 2, w, 24, 1, false, 0, Math.PI); g.rotateZ(Math.PI / 2); g.rotateX(Math.PI / 2); g.scale(1, (o.roofH ?? 0.9) / (d / 2), 1);
        mesh(S.g, g, mat(zn, rc), 0, h, 0);
      }
      if (o.windows !== false) addWindows(S, boxFaces(w, d, h, typeof o.windows === 'object' ? o.windows : {}).filter((f) => !(o.door && f.rot === 0 && h < 1.8)), { lights: o.lights });
      if (o.door !== false) { const dw = o.doorW ?? 0.7, dh = o.doorH ?? 1.1; box(S.g, zn, o.doorColor ?? 'dark', o.doorX ?? 0, 0, d / 2 - 0.02, dw, dh, 0.08, { r: 0.03 }); }
      if (o.awning) { const ac = o.awning === true ? 'accent' : o.awning; box(S.g, zn, ac, 0, Math.min(h - 0.3, 1.45), d / 2 + 0.35, w * 0.86, 0.12, 0.7, { r: 0.04 }); }
      if (o.sign) sign(S, o.sign, { y: o.signY ?? Math.min(h - 0.45, h * 0.78), z: d / 2 + 0.06, h: o.signH ?? Math.min(0.62, h * 0.22), bg: o.signBg, fg: o.signFg, mark: o.signMark });
      S.w = w; S.d = d; S.h = h;
      S.front = (k = 0.7) => S.p(0, d / 2 + k);
      return S.done();
    };
    // Warehouse: a long, low hall with a sawtooth roof, big roller doors along the front (the docks), a sign
    W.warehouse = (o = {}) => {
      const w = o.w ?? 6, d = o.d ?? 4, h = o.h ?? 2.2;
      const S = W.building({ roof: 'saw', color: 'wall', roofColor: 'roof2', windows: { floors: 1, base: 1.3, pitch: 1.3 }, door: false, ...o, w, d, h, sign: undefined, at: o.at, tile: o.tile });
      const n = o.docks ?? Math.max(1, Math.floor(w / 1.8));
      S.docks = [];
      for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * w / n; box(S.g, S.zone, 'metal', x, 0, d / 2 - 0.02, 1.1, 1.25, 0.1, { r: 0.03 }); for (let k = 1; k < 5; k++) box(S.g, S.zone, 'dark', x, k * 0.25, d / 2 + 0.035, 1.0, 0.02, 0.02, { r: 0.004, shadow: false }); S.docks.push(S.p(x, d / 2 + 1.1)); }
      if (o.sign) sign(S, o.sign, { y: h - 0.42, z: d / 2 + 0.06, h: o.signH ?? 0.55, bg: o.signBg, fg: o.signFg, mark: o.signMark });
      return S;
    };
    // Small house (gable roof, pastel walls) / apartment tower (rows of windows that light up) / shop (awning + sign)
    const PASTELS = ['wall', 'wall2', 'wall3', 'wall4'];
    W.house = (o = {}) => W.building({ w: 1.8, d: 1.8, h: 1.4, roof: 'gable', color: PASTELS[Math.floor(hash((o.x ?? 0) * 3.1 + (o.z ?? 0) * 7.7) * 4)], windows: { floors: 1, base: 0.45, pitch: 0.75 }, doorH: 0.9, doorX: -0.35, ...o });
    W.tower = (o = {}) => W.building({ w: 2.2, d: 2.2, h: 4.6, roof: 'flat', color: PASTELS[Math.floor(hash((o.x ?? 0) * 5.3 + (o.z ?? 0) * 2.9) * 4)], windows: { pitch: 0.6, base: 0.5 }, door: true, doorH: 0.8, ...o });
    W.shop = (o = {}) => W.building({ w: 2.4, d: 1.8, h: 1.9, roof: 'flat', awning: true, windows: { floors: 1, base: 0.15, pitch: 1.1 }, ...o });
    // Cutaway hall: a floor with low back walls and an open front, to show what happens inside (the isometric "cut-away")
    W.walls = (o = {}) => {
      const S = part(o, 'walls'), zn = S.zone, w = o.w ?? 6, d = o.d ?? 5, h = o.h ?? 1.6, t = o.t ?? 0.22, col = o.color ?? 'wall';
      if (o.floor !== false) box(S.g, zn, o.floor ?? 'floor', 0, 0, 0, w, 0.03, d, { r: 0.01, shadow: false });
      const sides = o.sides ?? ['n', 'w'], doors = o.doors ?? {};
      // a wall along one side, with gaps for doorways: doors: { n: [[x0, x1]], w: [[z0, z1]] } (local coordinates of this part)
      const run = (side, len, mk) => { let a = -len / 2; const gaps = [...(doors[side] || [])].sort((p, q) => p[0] - q[0]); for (const [g0, g1] of [...gaps, [len / 2, len / 2]]) { if (g0 - a > 0.05) mk((a + g0) / 2, g0 - a); a = Math.max(a, g1); } };
      if (sides.includes('n')) run('n', w, (c, L) => box(S.g, zn, col, c, 0, -d / 2 + t / 2, L, h, t, { r: 0.05 }));
      if (sides.includes('w')) run('w', d, (c, L) => box(S.g, zn, col, -w / 2 + t / 2, 0, c, t, h, L, { r: 0.05 }));
      if (sides.includes('s')) run('s', w, (c, L) => box(S.g, zn, col, c, 0, d / 2 - t / 2, L, h * 0.25, t, { r: 0.05 }));
      if (sides.includes('e')) run('e', d, (c, L) => box(S.g, zn, col, w / 2 - t / 2, 0, c, t, h * 0.25, L, { r: 0.05 }));
      if (o.stripe !== false) { const sc = o.stripe ?? 'accent2'; if (sides.includes('n')) run('n', w, (c, L) => box(S.g, zn, sc, c, h * 0.55, -d / 2 + t + 0.005, L - 0.1, 0.16, 0.02, { r: 0.005, shadow: false })); if (sides.includes('w')) run('w', d, (c, L) => box(S.g, zn, sc, -w / 2 + t + 0.005, h * 0.55, c, 0.02, 0.16, L - 0.1, { r: 0.005, shadow: false })); }
      if (o.sign) sign(S, o.sign, { y: h * 0.82, z: -d / 2 + t + 0.02, h: o.signH ?? 0.42, bg: o.signBg, fg: o.signFg, mark: o.signMark });
      S.w = w; S.d = d;
      return S.done();
    };
    // Trees: 'round' (lollipop), 'pine' (two cones), 'bush'
    W.tree = (o = {}) => {
      const S = part(o, 'tree'), zn = S.zone, s = o.s ?? 1, k = o.kind ?? 'round', lc = o.color ?? (hash((o.x ?? 0) * 9.1 + (o.z ?? 0) * 3.7) > 0.5 ? 'leaf' : 'leaf2');
      if (k === 'pine') { cyl(S.g, zn, 'trunk', 0, 0, 0, 0.08 * s, 0.35 * s); cone(S.g, zn, lc, 0, 0.3 * s, 0, 0.5 * s, 0.8 * s, { flat: true, n: 8 }); cone(S.g, zn, lc, 0, 0.75 * s, 0, 0.36 * s, 0.65 * s, { flat: true, n: 8 }); }
      else if (k === 'bush') sph(S.g, zn, lc, 0, 0.22 * s, 0, 0.32 * s, { n: 10, flat: true });
      else { cyl(S.g, zn, 'trunk', 0, 0, 0, 0.07 * s, 0.55 * s); sph(S.g, zn, lc, 0, 0.85 * s, 0, 0.42 * s, { n: 12, flat: true }); }
      return S.done();
    };
    // Street lamp: comes on at dusk (W.sky) or at a given time (lights)
    const lamps = [];
    W.lamp = (o = {}) => {
      const S = part(o, 'lamp'), zn = S.zone;
      cyl(S.g, zn, 'dark', 0, 0, 0, 0.04, 1.5); box(S.g, zn, 'dark', 0.12, 1.45, 0, 0.32, 0.06, 0.1, { r: 0.02 });
      const bm = new THREE.MeshStandardMaterial({ color: '#FFF3D6', emissive: '#FFD27A', emissiveIntensity: 0 }); bm.onBeforeCompile = (sh) => dimShader(sh, zn);
      mesh(S.g, geoSph(0.08, 10), bm, 0.24, 1.4, 0, { shadow: false });
      lamps.push({ S, m: bm, on: o.lights ?? null });
      return S.done();
    };
    // Road: a strip along a polyline (local to its tile when tile is given), white centre dashes; lanes for right-hand traffic: R.lane(+1) / R.lane(-1)
    W.road = (o = {}) => {
      const S = part({ ...o, x: 0, z: 0, ry: 0 }, 'road'), zn = S.zone, wd = o.width ?? 2.2, pts = o.pts.map((q) => V3(q[0], 0, q[1]));
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], len = a.distanceTo(b), ang = Math.atan2(b.x - a.x, b.z - a.z), mid = a.clone().add(b).multiplyScalar(0.5);
        mesh(S.g, geoBox(wd, 0.05, len, 0.01), mat(zn, o.color ?? 'asphalt'), mid.x, 0, mid.z, { ry: ang, shadow: false });
        if (o.dash !== false) for (let s = 0.5; s < len - 0.3; s += 1.0) { const p = a.clone().lerp(b, s / len); mesh(S.g, geoBox(0.08, 0.012, 0.45, 0.004), mat(zn, 'line'), p.x, 0.05, p.z, { ry: ang, shadow: false }); }
        if (o.edge) for (const sd of [-1, 1]) { const off = V3(Math.cos(ang), 0, -Math.sin(ang)).multiplyScalar(sd * (wd / 2 + 0.06)); mesh(S.g, geoBox(0.14, 0.12, len, 0.03), mat(zn, o.edge === true ? 'concrete' : o.edge), mid.x + off.x, 0, mid.z + off.z, { ry: ang }); }
      }
      for (let i = 1; i < pts.length - 1; i++) mesh(S.g, geoCyl(wd / 2, wd / 2, 0.05, 20), mat(zn, o.color ?? 'asphalt'), pts[i].x, 0, pts[i].z, { shadow: false });
      const world = (v) => (S.tile ? v.clone().add(V3(S.tile.x, 0, S.tile.z)) : v.clone());
      S.path = pts.map(world);
      S.lane = (side = 1) => offsetLine(S.path, side * wd / 4);
      return S.done();
    };
    // Conveyor belt from → to (local points on the tile): rails, legs, a rubber belt that runs (texture moves); C.path = the belt top, C.speed m/s
    const belts = [];
    const beltTex = (() => { const cv = mkCanvas(128, 64), c = cv.getContext('2d'); c.fillStyle = '#3A3F49'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#4B515C'; for (let i = 0; i < 4; i++) c.fillRect(i * 32, 0, 14, 64); const t = tex(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
    W.conveyor = (o = {}) => {
      const a = V3(o.from[0], 0, o.from[1]), b = V3(o.to[0], 0, o.to[1]), len = a.distanceTo(b), ang = Math.atan2(b.x - a.x, b.z - a.z), mid = a.clone().add(b).multiplyScalar(0.5);
      const S = part({ ...o, x: mid.x, z: mid.z, ry: ang }, 'conveyor'), zn = S.zone, wd = o.width ?? 0.8, h = o.height ?? 0.55;
      for (const sd of [-1, 1]) box(S.g, zn, o.rail ?? 'metal', sd * (wd / 2 + 0.04), h - 0.06, 0, 0.08, 0.16, len, { r: 0.02, metal: 0.3, rough: 0.5 });
      for (let s = -len / 2 + 0.3; s <= len / 2 - 0.2; s += 1.4) for (const sd of [-1, 1]) box(S.g, zn, 'dark', sd * (wd / 2 - 0.02), 0, s, 0.07, h - 0.05, 0.07, { r: 0.01 });
      const t2 = beltTex.clone(); t2.needsUpdate = true; t2.repeat.set(1, len / 0.5);
      const bm = new THREE.MeshStandardMaterial({ map: t2, roughness: 0.9 }); bm.onBeforeCompile = (sh) => dimShader(sh, zn);
      const belt = mesh(S.g, new THREE.PlaneGeometry(wd, len), bm, 0, h + 0.005, 0, { rx: -Math.PI / 2, shadow: false });
      S.speed = o.speed ?? 1.2; S.len = len; S.top = h + 0.01;
      belts.push({ t: t2, S, k: 1 / 0.5 });
      const world = (v) => (S.tile ? v.clone().add(V3(S.tile.x, 0, S.tile.z)) : v.clone());
      S.path = [world(a.clone().setY(S.top)), world(b.clone().setY(S.top))];
      S.dur = (fromU = 0, toU = 1) => Math.abs(toU - fromU) * len / S.speed;
      S.at = (u) => S.path[0].clone().lerp(S.path[1], u);
      return S.done();
    };
    // Scanner arch over a conveyor at fraction u; S.scan(t) flashes the red line (+ a beep)
    const scans = [];
    W.scanner = (o = {}) => {
      const C = o.on, u = o.u ?? 0.5, ln = C.len, wd = (o.width ?? 0.8) + 0.3, hh = C.top + 0.9;
      const S = part({ tile: C.tile, zone: C.zone, x: 0, z: 0, at: o.at ?? C.appear }, 'scanner'); S.g.position.copy(C.g.position); S.g.rotation.y = C.g.rotation.y;
      const z = -ln / 2 + u * ln, zn = S.zone;
      for (const sd of [-1, 1]) box(S.g, zn, o.color ?? 'accent2', sd * wd / 2, 0, z, 0.14, hh, 0.22, { r: 0.04 });
      box(S.g, zn, o.color ?? 'accent2', 0, hh - 0.04, z, wd + 0.14, 0.2, 0.3, { r: 0.05 });
      const lm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FF3B30').multiplyScalar(1.4), transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
      mesh(S.g, new THREE.PlaneGeometry(wd - 0.1, 0.06), lm, 0, C.top + 0.02, z, { rx: -Math.PI / 2, shadow: false });
      const me = { S, lm, ts: [] }; scans.push(me);
      S.scan = (t, sfx = true) => { me.ts.push(t); if (sfx) F.sfx(t, 'beep', 0.3); return S; };
      S.u = u;
      return S.done();
    };
    // Sorting line: a main belt with branch belts peeling off to each destination; S.path(i) = the whole way to the end of branch i (for a parcel)
    W.sorter = (o = {}) => {
      const [x0, z0] = o.from, [x1, z1] = o.to, main = W.conveyor({ tile: o.tile, from: o.from, to: o.to, width: o.width ?? 0.8, at: o.at, speed: o.speed });
      const dir = V3(x1 - x0, 0, z1 - z0).normalize(), nrm = V3(dir.z, 0, -dir.x);
      const S = { kind: 'sorter', main, outs: [], zone: main.zone, tile: o.tile, isPart: true, g: main.g };
      (o.outs ?? []).forEach((b, i) => {
        const u = b.u ?? (i + 1) / ((o.outs.length) + 1), side = b.side ?? (i % 2 ? -1 : 1), len = b.len ?? 2.4;
        const s = V3(x0, 0, z0).lerp(V3(x1, 0, z1), u), from = s.clone().addScaledVector(nrm, side * 0.5), to = s.clone().addScaledVector(nrm, side * (0.5 + len));
        const br = W.conveyor({ tile: o.tile, from: [from.x, from.z], to: [to.x, to.z], width: 0.6, height: (o.height ?? 0.55) - 0.08, at: o.at !== undefined ? o.at + 0.1 * (i + 1) : undefined, speed: o.speed });
        S.outs.push({ belt: br, u, side, end: br.path[1] });
      });
      S.path = (i) => { const b = S.outs[i]; return [main.path[0], main.at(b.u), b.belt.path[0], b.belt.path[1]]; };
      S.dur = (i) => { const b = S.outs[i]; return main.dur(0, b.u) + b.belt.dur() + 0.3; };
      S.box = new THREE.Box3().setFromPoints([...main.path, ...S.outs.flatMap((b) => b.belt.path)]).expandByScalar(0.6);
      parts.push(S);
      return S;
    };
    // Shelving: posts, boards, boxes in every slot (fill = how full). Sh.slot(level, col) → world point; Sh.take(level, col) → that box as a parcel (to be picked)
    W.shelf = (o = {}) => {
      const S = part(o, 'shelf'), zn = S.zone, w = o.w ?? 3, d = o.d ?? 0.8, h = o.h ?? 2.0, L = o.levels ?? 4, C = o.cols ?? 4, fill = o.fill ?? 0.8;
      for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) box(S.g, zn, o.color ?? 'accent', x, 0, z, 0.08, h, 0.08, { r: 0.015 });
      const lh = (h - 0.1) / L, taken = new Set(), boxes = {};
      for (let l = 0; l < L; l++) {
        box(S.g, zn, 'metal', 0, 0.12 + l * lh, 0, w + 0.06, 0.05, d + 0.04, { r: 0.015 });
        for (let c = 0; c < C; c++) { const r = hash(l * 31 + c * 7 + S.g.id); if (r > fill) continue; const bw = (w / C) * (0.55 + 0.3 * hash(r * 9)), bh = lh * (0.45 + 0.35 * hash(r * 13)); boxes[`${l},${c}`] = box(S.g, zn, ['parcel', 'tape', 'wall2', 'parcel'][Math.floor(hash(r * 17) * 4)], -w / 2 + (c + 0.5) * w / C, 0.17 + l * lh, 0, bw, bh, d * 0.75, { r: 0.03 }); }
      }
      S.slot = (l, c) => S.p(-w / 2 + (c + 0.5) * w / C, 0, 0.17 + l * lh);
      S.take = (l, c, po = {}) => { const k = `${l},${c}`; if (boxes[k]) boxes[k].visible = false; taken.add(k); const pc = W.parcel({ size: po.size ?? Math.min(0.42, lh * 0.7), ...po }); pc.place(S.slot(l, c)); return pc; };
      S.front = (k = 0.8) => S.p(0, d / 2 + k);
      return S.done();
    };
    // Server rack: dark cabinet with blinking lights (the order system, the data centre)
    const racks = [];
    W.rack = (o = {}) => {
      const S = part(o, 'rack'), zn = S.zone, h = o.h ?? 1.9;
      box(S.g, zn, o.color ?? 'dark', 0, 0, 0, 0.7, h, 0.8, { r: 0.04 });
      const n = Math.floor((h - 0.3) / 0.14), lm = new THREE.MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false }), im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.035, 0.02), lm, n * 3), M4 = new THREE.Matrix4();
      for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) { M4.makeTranslation(-0.2 + j * 0.08, 0.2 + i * 0.14, 0.405); im.setMatrixAt(i * 3 + j, M4); im.setColorAt(i * 3 + j, new THREE.Color('#2EE59D')); }
      S.g.add(im); racks.push({ S, im, n: n * 3, busy: o.busy ?? [] });
      return S.done();
    };
    // Roll cage (笼车): wire cage on castors, parcels stack inside: Cg.slot(k)
    W.cage = (o = {}) => {
      const S = part(o, 'cage'), zn = S.zone, w = o.w ?? 0.9, d = o.d ?? 0.7, h = o.h ?? 1.2;
      box(S.g, zn, 'metal', 0, 0.1, 0, w, 0.05, d, { r: 0.01 });
      for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) { box(S.g, zn, 'metal', x, 0.1, z, 0.04, h, 0.04, { r: 0.01 }); sph(S.g, zn, 'dark', x * 0.9, 0.05, z * 0.9, 0.05, { n: 8 }); }
      for (let y = 0.45; y < h; y += 0.35) for (const z of [-d / 2, d / 2]) box(S.g, zn, 'metal', 0, 0.1 + y, z, w, 0.025, 0.025, { r: 0.008, shadow: false });
      S.slot = (k) => { const i = k % 2, j = Math.floor(k / 2) % 2, l = Math.floor(k / 4); return S.p((i - 0.5) * w * 0.48, (j - 0.5) * d * 0.45, 0.13 + l * 0.34); };
      return S.done();
    };
    // Parcel locker (快递柜): a grid of doors; Lk.cell(c, r) → { p (in front), inside, open(at, until) }
    const doors = [];
    W.locker = (o = {}) => {
      const S = part(o, 'locker'), zn = S.zone, C = o.cols ?? 4, R = o.rows ?? 4, cw = 0.5, ch = 0.42, w = C * cw + 0.16, h = R * ch + 0.5;
      box(S.g, zn, o.color ?? 'accent2', 0, 0, 0, w, h, 0.6, { r: 0.05 });
      box(S.g, zn, 'dark', 0, 0, 0.27, w - 0.12, 0.3, 0.04, { r: 0.01 });
      const cells = {};
      for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) {
        const x = -w / 2 + 0.08 + (c + 0.5) * cw, y = 0.38 + r * ch;
        box(S.g, zn, 'dark', x, y + 0.02, 0.27, cw - 0.04, ch - 0.06, 0.04, { r: 0.01, shadow: false });
        const hinge = new THREE.Group(); hinge.position.set(x - cw / 2 + 0.03, y + 0.02, 0.31); S.g.add(hinge);
        box(hinge, zn, o.door ?? 'wall', (cw - 0.06) / 2, 0, 0, cw - 0.06, ch - 0.08, 0.03, { r: 0.01 });
        const dr = { hinge, opens: [] }; doors.push(dr);
        cells[`${c},${r}`] = { p: S.p(x, 0.9, 0), inside: S.p(x, 0.05, y + 0.04), open: (at, until = at + 3) => { dr.opens.push([at, until]); F.sfx(at, 'click', 0.3); return cells[`${c},${r}`]; } };
      }
      S.cell = (c, r) => cells[`${c},${r}`];
      return S.done();
    };

    // ---------- Movers: a timeline of moves for each (place → move along a path → ride on something → toss → loop) ----------
    // Paths: arrays of [x, z] / [x, y, z] / Vector3, or anything with .path (a road lane, a conveyor, a sorter branch, a route). Corners are rounded so turns are smooth
    const toV = (q) => (q && q.isVector3 ? q.clone() : Array.isArray(q) ? (q.length === 2 ? V3(q[0], 0, q[1]) : V3(q[0], q[1], q[2])) : q && q.p ? q.p() : V3(0, 0, 0));
    const toPts = (path) => (Array.isArray(path) ? path : path.path ?? path.pts).map(toV);
    const chaikin = (pts, n = 2, r = 0.25) => { let p = pts; for (let k = 0; k < n; k++) { if (p.length < 3) break; const o = [p[0]]; for (let i = 0; i < p.length - 1; i++) { o.push(p[i].clone().lerp(p[i + 1], r)); o.push(p[i].clone().lerp(p[i + 1], 1 - r)); } o.push(p[p.length - 1]); p = o; } return p; };
    const polyline = (pts) => { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1])); return { pts, L, len: L[L.length - 1] }; };
    const along = (pl, d) => {
      const { pts, L, len } = pl; if (pts.length === 1) return { p: pts[0].clone(), dir: V3(0, 0, 1) };
      d = Math.max(0, Math.min(len, d)); let i = 1; while (i < L.length - 1 && L[i] < d) i++;
      const a = pts[i - 1], b = pts[i], k = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
      return { p: a.clone().lerp(b, k), dir: b.clone().sub(a).normalize() };
    };
    const offsetLine = (pts, off) => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], t = b.clone().sub(a).setY(0).normalize(); return p.clone().add(V3(-t.z, 0, t.x).multiplyScalar(-off)); });
    W.offset = offsetLine; W.smooth = chaikin;

    const movers = [];
    const mkMover = (root, kind, o = {}) => {
      const zone = o.zone ? (o.zone.isZone ? o.zone : o.zone.zone) : mkZone(`${kind}${movers.length}`);
      scene.add(root);
      const A = { kind, root, zone, segs: [], wins: [[o.at ?? -1e9, o.until ?? 1e9, false]], lift: o.lift ?? 0, anim: null, isMover: true, heading: o.ry ?? 0 };
      const push = (s) => { const last = A.segs[A.segs.length - 1]; if (last && s.a < (last.b ?? last.a) - 1e-6) console.warn(MSG(`isometric：${kind} 的动作在 ${r2(s.a)}s 开始，上一个动作 ${r2(last.b ?? last.a)}s 才结束`, `isometric: a ${kind} move starts at ${r2(s.a)}s, but the previous one ends at ${r2(last.b ?? last.a)}s`)); A.segs.push(s); return A; };
      A.place = (p, at = -1e9, ry) => push({ kind: 'place', a: at, p: toV(p), ry });
      // move along a path: dur (seconds) or speed (m/s); ease 'inout' (default; starts and stops), 'lin' (keeps going), 'in', 'out'; face: false = keep heading
      A.move = (path, at, o2 = {}) => {
        let pts = toPts(path); if (o2.from !== false && A.segs.length) { const st = A.state(at); if (st.p.distanceTo(pts[0]) > 0.05 && o2.join !== false) pts = [st.p.clone().setY(pts[0].y), ...pts]; }
        const pl = polyline(o2.sharp ? pts : chaikin(pts, 3)), dur = o2.dur ?? pl.len / (o2.speed ?? (kind === 'person' ? 1.2 : kind === 'parcel' ? 1.2 : 3.5));
        const ez = { inout: E.sine, lin: E.lin, in: (q) => q * q, out: (q) => 1 - (1 - q) * (1 - q) }[o2.ease ?? (kind === 'parcel' ? 'lin' : 'inout')] ?? E.sine;
        if (o2.info !== false && pl.len > 1.5) F.info('flow', at, at + dur + 0.4, { group: A.zone.name });
        if (o2.sfx) F.sfx(at, o2.sfx, o2.gain ?? 0.3, { dur });
        return push({ kind: 'path', a: at, b: at + dur, pl, ez, face: o2.face !== false, back: !!o2.back });
      };
      // loop: keep going round a closed path (a worker pacing, a robot's circuit), period seconds per lap. closed: false = an open path that keeps
      //   flowing in one direction (traffic): the mover shrinks away at the far end and grows in again at the start
      A.loop = (path, at, o2 = {}) => { const pts = toPts(path); const pl = polyline(o2.sharp ? pts : chaikin(o2.closed === false ? pts : [...pts, pts[0]], 3)); return push({ kind: 'loop', a: at, b: o2.until ?? 1e9, pl, period: o2.period ?? pl.len / (o2.speed ?? 2.5), phase: o2.phase ?? 0, open: o2.closed === false }); };
      // ride: stick to another mover (a parcel on a van, a person on a trike) with a local offset [x, y, z] in its frame
      A.ride = (host, at, off = [0, 1, 0]) => push({ kind: 'ride', a: at, host, off: toV(off) });
      // toss: a little arc to a point (into a cage, onto a belt, into a van door)
      A.toss = (p, at, o2 = {}) => { if (o2.sfx !== false) F.sfx(at + (o2.dur ?? 0.45) * 0.9, 'drop', 0.2); return push({ kind: 'toss', a: at, b: at + (o2.dur ?? 0.45), p: toV(p), h: o2.h ?? 0.6 }); };
      A.wait = (at) => push({ kind: 'wait', a: at });
      // visible windows: show(at) opens one (or moves the first one's start), hide(at) closes the last one; a mover can leave and come back many times
      A.show = (at) => { const L = A.wins[A.wins.length - 1]; if (L[1] >= 1e9) L[0] = at; else A.wins.push([at, 1e9, false]); return A; };
      A.hide = (at, o2 = {}) => { const L = A.wins[A.wins.length - 1]; L[1] = at; L[2] = !!o2.fast; return A; };
      A.scaleAt = (t) => { let k = 0; for (const [a, b, fast] of A.wins) { if (t < a || t >= b + (fast ? 0.12 : 0.25)) continue; const bo = clamp01((t - a) / 0.25), out = clamp01((t - b) / (fast ? 0.12 : 0.25)); k = Math.max(k, (a > -1e8 && bo < 1 ? backOut(bo) : 1) * (1 - out)); } return k; };
      A.pos = (t) => A.state(t).p;
      A.state = (t, upto = A.segs.length) => {
        let i = -1; for (let k = 0; k < upto; k++) if (A.segs[k].a <= t) i = k;
        if (i < 0) { const s0 = A.segs[0]; if (!s0) return { p: V3(0, 0, 0), h: A.heading }; return A.state(s0.a, 1); }
        const s = A.segs[i];
        if (s.kind === 'place') return { p: s.p.clone(), h: s.ry ?? (i ? A.state(s.a - 1e-4, i).h : A.heading) };
        if (s.kind === 'wait') return A.state(s.a - 1e-4, i);
        if (s.kind === 'path') { const q = s.ez(clamp01((t - s.a) / Math.max(1e-6, s.b - s.a))), r = along(s.pl, q * s.pl.len); const h = s.face ? Math.atan2(r.dir.x, r.dir.z) + (s.back ? Math.PI : 0) : (i ? A.state(s.a - 1e-4, i).h : A.heading); return { p: r.p, h, moving: t < s.b, speed: s.pl.len / (s.b - s.a) }; }
        if (s.kind === 'loop') { let u = ((t - s.a) / s.period + s.phase); u = u - Math.floor(u); const r = along(s.pl, u * s.pl.len); return { p: r.p, h: Math.atan2(r.dir.x, r.dir.z), moving: true, edge: s.open ? Math.min(1, u / 0.07, (1 - u) / 0.07) : 1 }; }
        if (s.kind === 'ride') { const hs = s.host.state(t), off = s.off.clone().applyAxisAngle(V3(0, 1, 0), hs.h); return { p: hs.p.clone().add(off).add(V3(0, s.host.lift ?? 0, 0)), h: hs.h, moving: hs.moving, riding: true }; }
        if (s.kind === 'toss') { const st = A.state(s.a - 1e-4, i), q = clamp01((t - s.a) / (s.b - s.a)), p = st.p.clone().lerp(s.p, E.sine(q)); p.y += s.h * 4 * q * (1 - q); return { p, h: st.h, moving: q < 1, flying: q < 1 }; }
        return { p: V3(0, 0, 0), h: 0 };
      };
      movers.push(A); return A;
    };
    W.mover = mkMover;

    // Little person: legs and arms swing while walking; carry: hold a parcel in front (arms forward)
    W.person = (o = {}) => {
      const root = new THREE.Group(), A = mkMover(root, 'person', o), zn = A.zone, s = o.s ?? 1, inner = new THREE.Group(); inner.scale.setScalar(s); root.add(inner);
      const legs = [-1, 1].map((sd) => { const g = new THREE.Group(); g.position.set(sd * 0.08, 0.42, 0); inner.add(g); box(g, zn, o.pants ?? 'dark', 0, -0.42, 0, 0.13, 0.42, 0.15, { r: 0.04 }); return g; });
      box(inner, zn, o.shirt ?? 'accent2', 0, 0.4, 0, 0.36, 0.44, 0.24, { r: 0.08 });
      const arms = [-1, 1].map((sd) => { const g = new THREE.Group(); g.position.set(sd * 0.23, 0.8, 0); inner.add(g); box(g, zn, o.shirt ?? 'accent2', 0, -0.36, 0, 0.1, 0.36, 0.12, { r: 0.04 }); return g; });
      sph(inner, zn, o.skin ?? 'skin', 0, 0.98, 0, 0.15, { n: 12 });
      if (o.hat === 'cap' || o.hat === undefined) { sph(inner, zn, o.hatColor ?? o.shirt ?? 'accent2', 0, 1.02, 0, 0.155, { n: 12 }).scale.set(1, 0.6, 1); box(inner, zn, o.hatColor ?? o.shirt ?? 'accent2', 0, 1.02, 0.12, 0.2, 0.03, 0.14, { r: 0.01 }); }
      else if (o.hat === 'helmet') sph(inner, zn, o.hatColor ?? 'accent', 0, 1.0, 0, 0.17, { n: 12 }).scale.set(1, 0.75, 1);
      else if (o.hat === 'hair') sph(inner, zn, o.hatColor ?? 'dark', 0, 1.03, -0.02, 0.155, { n: 12 }).scale.set(1, 0.7, 1);
      if (o.vest) box(inner, zn, o.vest, 0, 0.5, 0, 0.38, 0.3, 0.26, { r: 0.08 });
      A.carrying = [];
      A.carry = (pc, at, until = 1e9) => { A.carrying.push([at, until]); pc.ride(A, at, [0, 0.62 * s, 0.26 * s]); return A; };
      let dist = 0, lastP = null, lastT = null;
      A.anim = (t, st) => {
        if (lastT === null || t < lastT || t - lastT > 0.5) { dist = 0; lastP = st.p.clone(); }
        dist += st.p.distanceTo(lastP); lastP = st.p.clone(); lastT = t;
        const sw = st.moving && !st.riding ? Math.sin(dist * 7.5) * 0.6 : 0, hold = A.carrying.some(([a, b]) => t >= a && t < b);
        legs[0].rotation.x = sw; legs[1].rotation.x = -sw;
        arms[0].rotation.x = hold ? -1.2 : -sw * 0.8; arms[1].rotation.x = hold ? -1.2 : sw * 0.8;
        inner.position.y = st.moving && !st.riding ? Math.abs(Math.sin(dist * 7.5)) * 0.03 : 0;
        if (st.riding) { legs[0].rotation.x = legs[1].rotation.x = -1.3; }
      };
      A.lift = 0; A.h = 1.15 * s;
      return A;
    };
    // Vehicles: front faces +z; wheels turn with distance. brand: { color, text } paints the invented brand on the sides
    const wheel = (p, zn, x, y, z, r, w = 0.16) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); mesh(g, geoCyl(r, r, w, 14), mat(zn, 'dark'), 0, -w / 2, 0, { rz: Math.PI / 2 }).position.set(-w / 2, 0, 0); mesh(g, geoCyl(r * 0.45, r * 0.45, w + 0.02, 10), mat(zn, 'metal'), -w / 2 - 0.01, 0, 0, { rz: Math.PI / 2 }); return g; };
    const decal = (p, zn, text, o) => { const { t, aspect } = signTex(text, o), h = o.h ?? 0.32, w = Math.min(o.maxW ?? 9, h * aspect); const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, transparent: true }); m.onBeforeCompile = (sh) => dimShader(sh, zn); for (const sd of o.sides ?? [-1, 1]) { const me = mesh(p, new THREE.PlaneGeometry(w, h), m, sd * (o.x ?? 0.6), o.y ?? 0.8, o.z ?? 0, { ry: sd * Math.PI / 2, shadow: false }); me.position.x += sd * 0.005; } if (o.fact !== false) F.fact(text, 0, 1e9); };
    const vehicleAnim = (A, wheels, r) => { let dist = 0, lastP = null, lastT = null; A.anim = (t, st) => { if (lastT === null || t < lastT || t - lastT > 0.5) { dist = 0; lastP = st.p.clone(); } dist += st.p.distanceTo(lastP); lastP = st.p.clone(); lastT = t; for (const w of wheels) w.rotation.x = dist / r; A.inner.position.y = st.moving ? Math.sin(dist * 9) * 0.012 : 0; }; };
    W.van = (o = {}) => {
      const root = new THREE.Group(), A = mkMover(root, 'van', o), zn = A.zone, inner = new THREE.Group(); root.add(inner); A.inner = inner; inner.scale.setScalar(o.s ?? 1);
      const c = o.color ?? 'wall', bc = o.brand?.color ?? 'accent2';
      box(inner, zn, c, 0, 0.22, -0.2, 1.15, 1.15, 1.9, { r: 0.12 });
      box(inner, zn, c, 0, 0.22, 0.85, 1.1, 0.75, 0.55, { r: 0.14 });
      box(inner, zn, 'glass', 0, 0.62, 0.95, 0.98, 0.32, 0.42, { r: 0.06, rough: 0.3 });
      box(inner, zn, bc, 0, 0.3, -0.2, 1.17, 0.18, 1.86, { r: 0.04 });
      if (o.brand?.text) decal(inner, zn, o.brand.text, { mark: o.brand.mark !== false, x: 0.585, y: 0.9, z: -0.25, h: 0.3, bg: bc, maxW: 1.6 });
      const wheels = [[-0.5, 0.75], [0.5, 0.75], [-0.5, -0.75], [0.5, -0.75]].map(([x, z]) => wheel(inner, zn, x + Math.sign(x) * 0.06, 0.22, z, 0.22));
      vehicleAnim(A, wheels, 0.22); A.h = 1.4; A.door = [0, 0.5, -1.25]; A.bed = (k = 0) => [((k % 2) - 0.5) * 0.45, 0.42 + Math.floor(k / 4) * 0.36, -0.75 + (Math.floor(k / 2) % 2) * 0.5];
      return A;
    };
    W.truck = (o = {}) => {
      const root = new THREE.Group(), A = mkMover(root, 'truck', o), zn = A.zone, inner = new THREE.Group(); root.add(inner); A.inner = inner; inner.scale.setScalar(o.s ?? 1);
      const c = o.color ?? 'wall', bc = o.brand?.color ?? 'accent2', L = o.len ?? 4.4;
      box(inner, zn, o.cab ?? bc, 0, 0.3, L / 2 - 0.05, 1.3, 1.35, 1.0, { r: 0.14 });
      box(inner, zn, 'glass', 0, 0.95, L / 2 + 0.38, 1.15, 0.45, 0.2, { r: 0.05, rough: 0.3 });
      box(inner, zn, 'dark', 0, 0.28, -0.35, 0.9, 0.12, L - 1.0, { r: 0.03 });
      box(inner, zn, c, 0, 0.42, -0.6, 1.4, 1.6, L - 1.3, { r: 0.08 });
      box(inner, zn, bc, 0, 0.55, -0.6, 1.42, 0.22, L - 1.34, { r: 0.03 });
      if (o.brand?.text) decal(inner, zn, o.brand.text, { mark: o.brand.mark !== false, x: 0.71, y: 1.35, z: -0.6, h: 0.42, bg: bc, maxW: L - 1.6 });
      const wheels = [[-0.62, L / 2 - 0.1], [0.62, L / 2 - 0.1], [-0.62, -L / 2 + 0.6], [0.62, -L / 2 + 0.6], [-0.62, -L / 2 + 1.25], [0.62, -L / 2 + 1.25]].map(([x, z]) => wheel(inner, zn, x + Math.sign(x) * 0.04, 0.27, z, 0.27, 0.2));
      vehicleAnim(A, wheels, 0.27); A.h = 2.1; A.door = [0, 0.6, -L / 2 - 0.2]; A.bed = (k = 0) => [((k % 3) - 1) * 0.42, 0.62 + Math.floor(k / 9) * 0.36, -L / 2 + 0.9 + (Math.floor(k / 3) % 3) * 0.5];
      return A;
    };
    // Electric delivery tricycle (三轮): a cargo box at the back, the rider sits at the front (o.rider: person options, or false)
    W.trike = (o = {}) => {
      const root = new THREE.Group(), A = mkMover(root, 'trike', o), zn = A.zone, inner = new THREE.Group(); root.add(inner); A.inner = inner; inner.scale.setScalar(o.s ?? 1);
      const bc = o.brand?.color ?? 'accent2';
      box(inner, zn, bc, 0, 0.32, -0.35, 0.95, 0.85, 1.0, { r: 0.08 });
      box(inner, zn, 'dark', 0, 0.22, 0.3, 0.16, 0.12, 0.8, { r: 0.04 });
      box(inner, zn, 'dark', 0, 0.38, 0.35, 0.3, 0.08, 0.32, { r: 0.03 });
      cyl(inner, zn, 'dark', 0, 0.3, 0.72, 0.03, 0.62);
      box(inner, zn, 'dark', 0, 0.9, 0.72, 0.5, 0.04, 0.06, { r: 0.015 });
      if (o.brand?.text) decal(inner, zn, o.brand.text, { mark: o.brand.mark !== false, x: 0.48, y: 0.85, z: -0.35, h: 0.24, bg: bc, maxW: 0.9 });
      const wheels = [wheel(inner, zn, 0.08, 0.2, 0.85, 0.2, 0.12), wheel(inner, zn, -0.45, 0.2, -0.45, 0.2, 0.12), wheel(inner, zn, 0.53, 0.2, -0.45, 0.2, 0.12)];
      vehicleAnim(A, wheels, 0.2); A.h = 1.3; A.door = [0, 0.6, -0.95]; A.bed = (k = 0) => [((k % 2) - 0.5) * 0.4, 0.42 + Math.floor(k / 4) * 0.34, -0.55 + (Math.floor(k / 2) % 2) * 0.42];
      if (o.rider !== false) { const R = W.person({ ...(o.rider || {}), at: o.at, until: o.until }); R.ride(A, -1e9, [0, 0.28, 0.32]); A.rider = R; }
      return A;
    };
    // Generic car (traffic, the customer's car)
    const CARS = ['wall4', 'wall3', 'roof2', 'wall2', 'roof'];
    W.car = (o = {}) => {
      const root = new THREE.Group(), A = mkMover(root, 'car', o), zn = A.zone, inner = new THREE.Group(); root.add(inner); A.inner = inner;
      const c = o.color ?? CARS[movers.length % CARS.length];
      box(inner, zn, c, 0, 0.18, 0, 0.95, 0.42, 1.8, { r: 0.14 }); box(inner, zn, c, 0, 0.56, -0.1, 0.82, 0.38, 1.0, { r: 0.14 }); box(inner, zn, 'glass', 0, 0.6, -0.1, 0.84, 0.26, 0.9, { r: 0.08, rough: 0.3 });
      const wheels = [[-0.45, 0.58], [0.45, 0.58], [-0.45, -0.58], [0.45, -0.58]].map(([x, z]) => wheel(inner, zn, x + Math.sign(x) * 0.04, 0.18, z, 0.18, 0.12));
      vehicleAnim(A, wheels, 0.18); A.h = 1; return A;
    };
    // Warehouse robot (AGV): a low disc-box that glides; can carry a shelf pod on top (ride)
    W.bot = (o = {}) => {
      const root = new THREE.Group(), A = mkMover(root, 'bot', o), zn = A.zone, inner = new THREE.Group(); root.add(inner); A.inner = inner;
      box(inner, zn, o.color ?? 'accent', 0, 0.04, 0, 0.8, 0.22, 0.8, { r: 0.1 }); box(inner, zn, 'dark', 0, 0.26, 0, 0.5, 0.04, 0.5, { r: 0.02 });
      cyl(inner, zn, 'line', 0.25, 0.26, 0.3, 0.05, 0.03); A.h = 0.3; A.anim = () => {}; return A;
    };
    // Parcel: cardboard box with a tape stripe and a white label; size = width
    W.parcel = (o = {}) => {
      const root = new THREE.Group(), A = mkMover(root, 'parcel', o), zn = A.zone, s = o.size ?? 0.42, inner = new THREE.Group(); root.add(inner); A.inner = inner;
      const h = s * 0.72, d = s * 0.82;
      box(inner, zn, o.color ?? 'parcel', 0, 0, 0, s, h, d, { r: s * 0.06 });
      box(inner, zn, o.tape ?? 'tape', 0, h - 0.004, 0, s * 0.22, 0.012, d + 0.004, { r: 0.004, shadow: false });
      box(inner, zn, 'line', s * 0.22, h * 0.25, d / 2 + 0.003, s * 0.34, h * 0.4, 0.008, { r: 0.004, shadow: false });
      if (o.mark) box(inner, zn, o.mark, -s * 0.22, h * 0.3, d / 2 + 0.004, s * 0.16, s * 0.16, 0.008, { r: 0.004, shadow: false });
      A.h = h; A.anim = () => {}; return A;
    };
    // Stack: parcels piling up into a block one by one (a count you can see grow); returns the stack with St.top() for a label
    W.stack = (o = {}) => {
      const p0 = toV(o.p ?? [0, 0]), n = o.n ?? 12, cols = o.cols ?? 3, rows = o.rows ?? 3, s = o.size ?? 0.42, dur = o.dur ?? 1.6, list = [];
      for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols) % rows, l = Math.floor(i / (cols * rows)), t = o.at + dur * i / Math.max(1, n - 1);
        const pc = W.parcel({ size: s, at: t, color: o.color, mark: o.mark }); const dst = p0.clone().add(V3((c - (cols - 1) / 2) * s * 1.04, l * s * 0.74, (r - (rows - 1) / 2) * s * 0.86));
        pc.place(dst.clone().add(V3(0, 2.2, 0)), -1e9).move([dst.clone().add(V3(0, 2.2, 0)), dst], t, { dur: 0.32, ease: 'in', face: false, info: false, sharp: true }); list.push(pc); }
      const layers = Math.ceil(n / (cols * rows));
      F.info('bars', o.at, o.until ?? 1e9);
      if (o.sfx !== false) for (let i = 0; i < n; i += Math.max(1, Math.round(n / 8))) F.sfx(o.at + dur * i / Math.max(1, n - 1) + 0.32, 'drop', 0.18);
      return { list, top: () => p0.clone().add(V3(0, layers * s * 0.74, 0)), p: p0 };
    };

    // Stream: parcels keep coming along a path (a belt, a sorter branch, a road) — volume you can see. every = seconds between parcels;
    //   speed / dur as in move; tile: they fade with that tile under W.focus. Returns the list of parcels
    W.stream = (path, o = {}) => {
      const list = [], a = o.at ?? 0, b = o.until ?? F.duration, every = o.every ?? 0.8, zone = o.tile ? o.tile.zone : (o.zone ?? mkZone('stream'));
      const pts = toPts(path), dur = o.dur ?? polyline(pts).len / (o.speed ?? 1.2);
      for (let t = a - (o.prefill ? dur : 0), i = 0; t < b; t += every * (0.75 + 0.5 * hash(i * 3.3 + a)), i++) {
        const pc = W.parcel({ zone, size: o.size ?? (0.34 + 0.12 * hash(i * 7.1 + a)), color: o.colors ? o.colors[i % o.colors.length] : (hash(i * 5.7) > 0.75 ? 'tape' : 'parcel') });
        pc.place(pts[0], -1e9).move(pts, t, { dur, ease: 'lin', info: false, sharp: o.sharp }).show(t < a ? -1e9 : t).hide(t + dur > b ? b : t + dur, { fast: true });
        list.push(pc);
      }
      if (o.info !== false) F.info('flow', a, b);
      return list;
    };
    // Workbench / packing table
    W.table = (o = {}) => {
      const S = part(o, 'table'), zn = S.zone, w = o.w ?? 1.6, d = o.d ?? 0.9, h = o.h ?? 0.75;
      box(S.g, zn, o.color ?? 'wood', 0, h - 0.08, 0, w, 0.08, d, { r: 0.02 });
      for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) for (const z of [-d / 2 + 0.08, d / 2 - 0.08]) box(S.g, zn, 'metal', x, 0, z, 0.06, h - 0.08, 0.06, { r: 0.01 });
      if (o.tape !== false) { cyl(S.g, zn, 'accent', w * 0.32, h, -d * 0.2, 0.09, 0.06); }
      S.top = (lx = 0, lz = 0) => S.p(lx, lz, h);
      return S.done();
    };

    // ---------- Routes: a line drawn on the ground (white edge + colour core), head dot while drawing, arrowhead at the end; flow: dashes keep moving ----------
    const routes = [];
    const LIFTS = { value: new Array(48).fill(0) };   // each tile's current lift, shared by every route (a route on a focused tile rises with it)
    const tileIx = (p) => { for (let i = 0; i < tiles.length && i < 48; i++) { const r = tiles[i].zone.rect; if (p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1) return i; } return -1; };
    const ribbon = (pts, w, y) => {
      const pos = [], s = [], idx = []; let acc = 0;
      for (let i = 0; i < pts.length; i++) {
        if (i) acc += pts[i].distanceTo(pts[i - 1]);
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], t = b.clone().sub(a); t.y = 0; t.normalize(); const n = V3(-t.z, 0, t.x).multiplyScalar(w / 2);
        pos.push(pts[i].x + n.x, pts[i].y + y, pts[i].z + n.z, pts[i].x - n.x, pts[i].y + y, pts[i].z - n.z); s.push(acc, acc);
        if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('s', new THREE.Float32BufferAttribute(s, 1)); g.setAttribute('tix', new THREE.Float32BufferAttribute(pts.flatMap((p) => { const k = p.y < 0.6 ? tileIx(p) : -1; return [k, k]; }), 1)); g.setIndex(idx); return { g, len: acc };
    };
    const routeMat = (color, o = {}) => new THREE.ShaderMaterial({
      uniforms: { uC: { value: new THREE.Color(color) }, uP: { value: 0 }, uDash: { value: o.dash ?? 0 }, uOff: { value: 0 }, uA: { value: 1 }, uLift: LIFTS },
      vertexShader: 'attribute float s; attribute float tix; uniform float uLift[48]; varying float vS; void main(){ vS = s; vec3 p = position; int k = int(tix + 0.5); if (k >= 0 && k < 48) p.y += uLift[k]; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'uniform vec3 uC; uniform float uP, uDash, uOff, uA; varying float vS; void main(){ if (vS > uP) discard; if (uDash > 0.0 && mod(vS - uOff, uDash * 2.0) > uDash) discard; gl_FragColor = vec4(uC, uA); \n#include <colorspace_fragment>\n}',
      transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    W.route = (path, o = {}) => {
      const raw = toPts(path).map((p) => (o.y !== undefined ? p.clone().setY(o.y) : p.clone()));
      const pts0 = o.sharp ? raw : chaikin(raw, 3), pl = polyline(pts0), samp = [];
      for (let d = 0; d < pl.len; d += 0.12) samp.push(along(pl, d).p); samp.push(pts0[pts0.length - 1].clone());
      const wd = o.width ?? 0.32, lift = o.lift ?? 0.07, c = col(o.color ?? 'accent');
      const core = ribbon(samp, wd, lift + 0.004), edge = ribbon(samp, wd + 0.16, lift);
      const mc = routeMat(c, { dash: o.dash ?? (o.flow ? 0.5 : 0) }), me = routeMat(o.edge ?? '#FFFFFF');
      const g = new THREE.Group(); scene.add(g);
      const m1 = new THREE.Mesh(edge.g, me), m2 = new THREE.Mesh(core.g, mc); m1.renderOrder = 5; m2.renderOrder = 6; g.add(m1, m2);
      const head = new THREE.Mesh(geoSph(wd * 0.75, 12), new THREE.MeshBasicMaterial({ color: c, transparent: true })); head.renderOrder = 7; g.add(head);
      const ah = new THREE.Shape(); ah.moveTo(0, wd * 1.6); ah.lineTo(wd * 1.25, -wd * 0.4); ah.lineTo(-wd * 1.25, -wd * 0.4); ah.lineTo(0, wd * 1.6);
      const arrow = new THREE.Mesh(new THREE.ShapeGeometry(ah), new THREE.MeshBasicMaterial({ color: c, transparent: true, side: THREE.DoubleSide, depthWrite: false })); arrow.renderOrder = 7; g.add(arrow);
      const R = { g, mc, me, head, arrow, len: core.len, at: o.at ?? 0, dur: o.dur ?? Math.max(0.8, Math.min(3, core.len / 6)), until: o.until ?? 1e9, flow: o.flow ?? 0, arrowOn: o.arrow !== false, samp, pl: polyline(samp), path: samp, isRoute: true, lift };
      R.headAt = (t) => along(R.pl, R.len * E.sine(clamp01((t - R.at) / R.dur))).p;
      if (o.info !== false) F.info('flow', R.at, R.until);
      if (o.sfx !== false) F.sfx(R.at, 'draw', o.gain ?? 0.25, { dur: R.dur });
      routes.push(R); return R;
    };
    // An arc through the air between two points (long-haul trips across the map: the trunk line)
    W.arc = (a, b, h = 3, n = 40) => { const A0 = toV(a), B0 = toV(b), out = []; for (let i = 0; i <= n; i++) { const q = i / n, p = A0.clone().lerp(B0, q); p.y += h * 4 * q * (1 - q); out.push(p); } return out; };

    // ---------- Labels: a pin on a pole stuck into the world, a card at the top (HTML: crisp, readable at any zoom) ----------
    const overlay = F.layer('pointer-events:none', 6);
    const labels = [];
    const anchorOf = (a) => (a && a.isMover ? (t) => a.state(t).p.clone().add(V3(0, (a.h ?? 1) + (a.lift ?? 0), 0)) : a && a.isPart ? (() => { const bx = a.box ?? (a.g ? new THREE.Box3().setFromObject(a.g) : null); const c = bx ? bx.getCenter(V3(0, 0, 0)) : V3(0, 0, 0); if (bx) c.y = bx.max.y; return () => c.clone().setY(c.y + (a.tile ? a.tile.g.position.y : 0)); })() : a && a.isTile ? () => V3(a.x, a.g.position.y, a.z) : a && a.isRoute ? (t) => a.headAt(t).add(V3(0, a.lift, 0)) : typeof a === 'function' ? a : (() => { const v = toV(a); return () => v.clone().setY(v.y + groundY(v)); })());
    const ink = () => col('ink');
    W.label = (anchor, o = {}) => {
      const fn = anchorOf(anchor), at = o.at ?? 0, until = o.until ?? 1e9, pole = o.h ?? (anchor && anchor.isMover ? 0.6 : 1.4), c = col(o.color ?? 'accent');
      const pm = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.6 }); const pg = new THREE.Group(); scene.add(pg);
      if (o.pole !== false) { mesh(pg, geoCyl(0.035, 0.035, pole, 8), pm, 0, 0, 0); mesh(pg, geoSph(0.11, 10), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }), 0, 0, 0, { shadow: false }); }
      pg.visible = false;
      const u = F.px(1), size = o.size ?? (PT ? 42 : 48);   // ≥ 48 px at 1080p: a card line stays readable on a phone (the --check phone test)
      const card = P.el('div', `left:0;top:0;transform-origin:50% 100%;display:none;white-space:nowrap;background:#FFFFFF;border-radius:${u * 14}px;padding:${u * 10}px ${u * 20}px ${u * 11}px ${u * 22}px;box-shadow:0 ${u * 6}px ${u * 18}px rgba(30,40,50,.18);border-left:${u * 8}px solid ${c};font-family:${(F.theme.fonts && F.theme.fonts.sans) || 'sans-serif'};color:${ink()}`, overlay);
      const main = P.el('div', `position:relative;font-weight:800;font-size:${u * size}px;line-height:1.15`, card, o.text ?? '');
      const sub = o.sub ? P.el('div', `position:relative;font-weight:600;font-size:${u * size * 0.62}px;line-height:1.25;color:${o.subColor ?? '#5A6672'};margin-top:${u * 3}px`, card, o.sub) : null;
      if (o.text) F.text(main, 'label', o.text, at, until); if (sub) F.text(sub, 'label', o.sub, at, until);
      const L = { fn, at, until, pg, card, main, sub, pole, num: o.num, side: o.side ?? 'up', text: o.text, dx: o.dx ?? 0, ring: null };
      if (o.ring) { const R = 27 * u; L.ring = P.el('div', `position:relative;display:inline-block;vertical-align:middle;margin-right:${u * 12}px;width:${R * 2}px;height:${R * 2}px;border-radius:50%`, card); card.insertBefore(L.ring, main); main.style.display = 'inline-block'; main.style.verticalAlign = 'middle'; L.ringDef = o.ring; }
      if (o.info !== false) F.info(o.num || o.ring ? 'figures' : 'annotate', at, until);
      if (o.sfx !== false) F.sfx(at, 'tick', 0.22);
      labels.push(L); return L;
    };
    // Counter: a label whose number rolls from → to (format, unit)
    W.counter = (anchor, o = {}) => { const fmt = o.format ?? ((v) => (Number.isInteger(o.to) ? Math.round(v).toLocaleString('en-US') : v.toFixed(o.digits ?? 1))); const text = `${o.prefix ?? ''}${fmt(o.to)}${o.unit ?? ''}`; return W.label(anchor, { ...o, text, num: { from: o.from ?? 0, to: o.to, dur: o.dur ?? 1.2, fmt, unit: o.unit ?? '', prefix: o.prefix ?? '' } }); };
    // Timer: how long a stage takes — a dial on the card fills (hours / of) while the number counts up
    //   as many decimals as the source gives (8.8, not 8.80)
    W.timer = (anchor, o = {}) => { const fmt = o.format ?? ((v) => v.toFixed(o.digits ?? (String(o.value).split('.')[1] || '').length)); return W.label(anchor, { ...o, text: `${fmt(o.value)}${o.unit ?? ''}`, num: { from: 0, to: o.value, dur: o.dur ?? 1.2, fmt, unit: o.unit ?? '', prefix: '' }, ring: { frac: (o.value / (o.of ?? o.value)), color: col(o.color ?? 'accent'), start: o.startFrac ?? 0 } }); };
    // Title: big friendly type in the empty sky above the world (the reference diorama's caption blocks)
    const titles = [];
    W.title = (o = {}) => {
      const u = F.px(1), size = o.size ?? (PT ? 84 : 92), at = o.at ?? 0, until = o.until ?? 1e9;
      const box0 = P.el('div', `left:${u * 60}px;right:${u * 60}px;top:${o.top ?? H0 * (PT ? 0.1 : 0.075)}px;text-align:${o.align ?? 'center'};display:none;flex-direction:column;align-items:${o.align === 'left' ? 'flex-start' : 'center'};font-family:${(F.theme.fonts && F.theme.fonts.display) || 'sans-serif'};color:${col(o.color ?? 'ink')}`, overlay);
      // a soft panel of the background colour behind the words: the title stays readable over a busy part of the world
      const bgc = new THREE.Color().setStyle(BG, THREE.LinearSRGBColorSpace), panel = o.panel === false ? '' : `background:rgba(${Math.round(bgc.r * 255)},${Math.round(bgc.g * 255)},${Math.round(bgc.b * 255)},.82);padding:${u * 8}px ${u * 26}px ${u * 12}px;border-radius:${u * 22}px;`;
      const t1 = P.el('div', `position:relative;font-weight:900;font-size:${u * size}px;line-height:1.1;letter-spacing:.01em;${panel}text-shadow:0 ${u * 3}px 0 rgba(255,255,255,.7)`, box0, o.text);
      const t2 = o.sub ? P.el('div', `position:relative;display:inline-block;margin-top:${u * 14}px;font-weight:700;font-size:${u * size * (o.subSize ?? 0.5)}px;line-height:1.3;padding:${u * 6}px ${u * 18}px;border-radius:${u * 30}px;background:${col(o.subBg ?? 'accent')};color:#fff`, box0, o.sub) : null;
      F.text(t1, 'title', o.text, at, until); if (t2) F.text(t2, 'title', o.sub, at, until);
      titles.push({ box0, t1, t2, at, until }); return box0;
    };

    // ---------- Focus: the parts being talked about stay in colour and lift a little; everything else fades back ----------
    const focuses = [];
    const zonesOf = (list) => (Array.isArray(list) ? list : [list]).flatMap((x) => (x && x.isZone ? [x] : x && x.zone ? [x.zone] : x && x.main ? [x.main.zone] : []));
    W.focus = (list, at, until = 1e9, o = {}) => {
      const L = Array.isArray(list) ? list : [list], zs = new Set(zonesOf(L));
      const tilesIn = L.filter((x) => x && x.isTile), lifts = new Set(o.lift === false ? [] : tilesIn);
      // movers standing inside a focused tile stay in colour too (decided frame by frame)
      focuses.push({ zs, tiles: tilesIn.length ? tilesIn : L.filter((x) => x && x.tile).map((x) => x.tile), lifts, at, until, amount: o.dim ?? 0.62, list: L });
      if (o.sfx !== false) F.sfx(at, 'glow', 0.25);
      if (o.info !== false) F.info('mark', at, until);
      return W;
    };
    // Lights: switch on a building's windows / a lamp at a time (else they follow W.sky)
    W.lights = (thing, at) => { for (const s of windowSets) if (s.S === thing) s.on = at; for (const l of lamps) if (l.S === thing) l.on = at; if (thing && thing.isTile) { for (const s of windowSets) if (s.S.tile === thing) s.on = at; for (const l of lamps) if (l.S.tile === thing) l.on = at; } F.sfx(at, 'click', 0.2); return W; };
    // Time of day: [[t, 'day' | 'dusk' | 'night' | { bg, hemi, sun, sunColor, lights }], …] — each change takes o.dur (1.5 s)
    let skyKeys = [[-1e9, 'day']], skyDur = 1.5;
    W.sky = (keys, o = {}) => { skyKeys = [[-1e9, keys[0][0] > 0 ? 'day' : keys[0][1]], ...keys]; skyDur = o.dur ?? 1.5; return W; };
    const skyAt = (t) => {
      const sk = (k) => { const v = typeof k === 'string' ? SKIES[k] : k; return { ...SKIES.day, ...v, bg: v.bg ?? BG }; };
      let cur = sk(skyKeys[0][1]);
      for (let i = 1; i < skyKeys.length; i++) { const [a, k] = skyKeys[i]; if (t < a) break; const nx = sk(k), q = E.sine(clamp01((t - a) / skyDur));
        cur = { bg: new THREE.Color(cur.bg).lerp(new THREE.Color(nx.bg), q).getStyle(), hemi: cur.hemi + (nx.hemi - cur.hemi) * q, sun: cur.sun + (nx.sun - cur.sun) * q, sunColor: new THREE.Color(cur.sunColor).lerp(new THREE.Color(nx.sunColor), q).getStyle(), lights: cur.lights + (nx.lights - cur.lights) * q }; }
      return cur;
    };

    // ---------- Camera: keys; between keys the camera glides (no cuts unless cut: true); while holding it drifts in slowly ----------
    // { at, fit: [tiles / parts / movers / points], dur, ease, room: { top, bottom }, drift, turn (quarter turns of the world, ±1) } | { at, look, size } | { at, follow: mover, size }
    let keys = [];
    const ROOM = PT ? { top: 0.1, bottom: 0.26 } : { top: 0.07, bottom: 0.17 };
    W.camera = (list) => { keys = list.map((k, i) => ({ dur: 1.4, drift: 0.035, ...k, i })).sort((a, b) => a.at - b.at); keys.forEach((k, i) => { if (k.cut && i) F.cut(k.at); else if (i && k.sfx !== false && k.dur >= 0.9) F.sfx(k.at, 'whoosh', 0.12, { dur: k.dur }); }); return keys; };
    const camDir = (az, el) => V3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    const ptsOf = (x, t) => {
      if (!x) return [];
      if (x.isVector3) return [x.clone()];
      if (Array.isArray(x)) return typeof x[0] === 'number' ? [toV(x)] : x.flatMap((y) => ptsOf(y, t));
      if (x.isTile) return [...x.corners(), ...parts.filter((q) => q.tile === x && q.box).flatMap((q) => [q.box.min.clone(), q.box.max.clone()])];
      if (x.isMover) { const p = x.state(t).p; return [p, p.clone().add(V3(0, x.h ?? 1, 0))]; }
      if (x.isRoute) return [x.samp[0], x.samp[x.samp.length - 1], x.samp[Math.floor(x.samp.length / 2)]];
      if (x.isPart) { const b = x.box ?? new THREE.Box3().setFromObject(x.g); return [b.min, b.max, V3(b.min.x, b.min.y, b.max.z), V3(b.max.x, b.min.y, b.min.z), V3(b.min.x, b.max.y, b.max.z), V3(b.max.x, b.max.y, b.min.z)].map((v) => v.clone()); }
      if (x.isZone && x.tile) return x.tile.corners();
      return [];
    };
    // the framing that holds these points (in the camera's own axes; orthographic, so distance doesn't matter), leaving room for the title and captions
    const frameFor = (k, t, az, el) => {
      const dir = camDir(az, el), right = V3(0, 1, 0).cross(dir).normalize(), up = dir.clone().cross(right).normalize(), room = { ...ROOM, ...(k.room || {}) }, m = k.margin ?? 0.05, asp = W0 / H0;
      if (k.fit) {
        const pts = ptsOf(k.fit, t); if (!pts.length) return { look: V3(0, 0, 0), size: 10 };
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of pts) { const x = p.dot(right), y = p.dot(up); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        const S = Math.max((y1 - y0) / (2 * (1 - room.top - room.bottom - 2 * m)), (x1 - x0) / (2 * asp * (1 - 2 * m)), k.min ?? 2.5) * (k.zoom ?? 1);
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 - S * (room.bottom - room.top);
        // a point on the ground plane's "look" line: right * cx + up * cy (+ anything along dir)
        return { look: right.clone().multiplyScalar(cx).add(up.clone().multiplyScalar(cy)), size: S };
      }
      if (k.follow) { const p = k.follow.state(t).p; const S = k.size ?? 5; return { look: p.clone().sub(up.clone().multiplyScalar(S * (room.bottom - room.top))), size: S }; }
      return { look: toV(k.look ?? [0, 0]), size: k.size ?? 10 };
    };
    let camNow = { look: V3(0, 0, 0), size: 10, az: AZ0, el: EL0 };
    W.framing = (k, t = 0) => frameFor(k, t, AZ0, EL0);   // where a camera key would look and how wide (for debugging a framing)
    W.fitPoints = (list, t = 0) => ptsOf(list, t);
    const azOf = (k) => AZ0 + (k.turn ?? 0) * Math.PI / 2, elOf = (k) => (k.el !== undefined ? k.el * Math.PI / 180 : EL0);
    // a key's own framing at time t, with its slow drift-in while it holds
    const keyFrame = (i, t) => {
      const K = keys[i], nextAt = keys[i + 1] ? keys[i + 1].at : F.duration, B = frameFor(K, K.follow ? t : Math.min(t, K.at + (i ? K.dur : 0)), azOf(K), elOf(K));
      const hold = clamp01((t - (K.at + (i ? K.dur : 0))) / Math.max(0.5, nextAt - K.at)); B.size *= 1 - (K.drift ?? 0.035) * E.sine(hold); return B;
    };
    const place = (t) => {
      if (!keys.length) keys = [{ at: 0, fit: tiles.length ? tiles : [V3(0, 0, 0)], dur: 0, drift: 0.03, i: 0 }];
      let i = 0; for (let k = 0; k < keys.length; k++) if (keys[k].at <= t) i = k;
      const K = keys[i], B = keyFrame(i, t);
      let look = B.look, size = B.size, A0 = azOf(K), E0 = elOf(K);
      if (i > 0 && !K.cut && t < K.at + K.dur) {
        const P0 = keys[i - 1], q = (K.ease === 'lin' ? E.lin : K.ease === 'out' ? E.expoOut : E.cubicInOut)(clamp01((t - K.at) / K.dur)), B0 = keyFrame(i - 1, P0.follow ? t : K.at);
        look = B0.look.clone().lerp(B.look, q); size = Math.exp(Math.log(B0.size) + (Math.log(B.size) - Math.log(B0.size)) * q); A0 = azOf(P0) + (A0 - azOf(P0)) * q; E0 = elOf(P0) + (E0 - elOf(P0)) * q;
      }
      const dir = camDir(A0, E0), asp = W0 / H0;
      camera.left = -size * asp; camera.right = size * asp; camera.top = size; camera.bottom = -size; camera.updateProjectionMatrix();
      camera.position.copy(look).addScaledVector(dir, 300); camera.lookAt(look); camera.updateMatrixWorld();
      // the point on the ground at the centre of the frame
      const G = look.clone().addScaledVector(dir, -look.y / dir.y);
      camNow = { look, ground: G, size, az: A0, el: E0 };
      // the sun follows the view (shadow box covers what is in frame), always from the upper left of the frame
      sun.target.position.copy(G); sun.position.copy(G).add(camDir(A0 - 0.9, 0.95).multiplyScalar(80));
      const r = size * Math.max(asp, 1) * 1.6; Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 220 }); sun.shadow.camera.updateProjectionMatrix();
      return K;
    };

    // ---------- Every frame ----------
    const proj = (v) => { const q = v.clone().project(camera); return { x: (q.x + 1) / 2 * W0, y: (1 - q.y) / 2 * H0, z: q.z }; };
    const update = (t) => {
      for (const fn of frameFns) fn(t);
      // appear / leave
      for (const p of pops) {
        if (p.kind === 'drop') { const q = clamp01((t - p.at) / 0.55), out = clamp01((t - p.until) / 0.4); p.g.visible = t >= p.at - 1e-6 && out < 1; p.g.userData.dy = (q < 1 ? (1 - backOut(q)) * 5 : 0) - out * out * 6; }
        else { const q = clamp01((t - p.at) / 0.42), out = clamp01((t - p.until) / 0.3), s = Math.max(0.001, (q < 1 ? backOut(q) : 1) * (1 - out)); p.g.visible = t >= p.at - 1e-6 && out < 1; p.g.scale.set(s, s, s); }
      }
      // focus: which zones stay, how far the rest fades; focused tiles lift a little
      const live = focuses.filter((f) => t >= f.at - 0.4 && t < f.until + 0.4);
      const fk = (f) => Math.min(E.sine(clamp01((t - f.at + 0.1) / 0.45)), 1 - E.sine(clamp01((t - f.until) / 0.45)));
      for (const T of tiles) { let lift = 0; for (const f of live) if (f.lifts.has(T)) lift = Math.max(lift, 0.28 * fk(f)); T.zone.lift = lift; T.g.position.y = (T.g.userData.dy ?? 0) + lift; }
      tiles.forEach((T, i) => { if (i < 48) LIFTS.value[i] = T.g.position.y; });
      for (const s of movers) {
        const st = s.state(t), R = s.root, k = s.scaleAt(t) * (st.edge ?? 1);
        R.visible = k > 0.001; R.scale.setScalar(Math.max(0.001, k));
        R.position.copy(st.p); if (!st.riding && !st.flying) R.position.y += groundY(st.p); R.rotation.y = st.h; s.anim?.(t, st); s._p = R.position.clone();
      }
      for (const z of zones) {
        let lv = 0;
        for (const f of live) { const k = fk(f); if (k <= 0) continue; let keep = f.zs.has(z) || z === FX;
          if (!keep && z.name !== 'world' && !z.tile) { const m = movers.find((x) => x.zone === z); if (m && m._p) keep = f.tiles.some((T) => { const r = T.zone.rect; return m._p.x >= r.x0 && m._p.x <= r.x1 && m._p.z >= r.z0 && m._p.z <= r.z1; }); }
          if (!keep) lv = Math.max(lv, f.amount * k); }
        z.u.value = lv;
      }
      // machines: belts run, scanners flash, racks blink, locker doors swing
      for (const b of belts) b.t.offset.y = -(t * b.S.speed) * b.k;
      for (const s of scans) { let k = 0; for (const a of s.ts) k = Math.max(k, Math.sin(Math.PI * clamp01((t - a) / 0.35))); s.lm.opacity = k; }
      for (const r of racks) { const c = new THREE.Color(); for (let i = 0; i < r.n; i++) { const on = hash(i * 13.1 + Math.floor(t * 6 + hash(i) * 6)) > 0.45; c.set(on ? (hash(i * 3.7) > 0.8 ? '#FFC24A' : '#2EE59D') : '#1C3A30'); r.im.setColorAt(i, c); } r.im.instanceColor.needsUpdate = true; }
      for (const d of doors) { let k = 0; for (const [a, b] of d.opens) k = Math.max(k, Math.min(E.backOut ? E.backOut(clamp01((t - a) / 0.4)) : clamp01((t - a) / 0.4), 1 - E.sine(clamp01((t - b) / 0.4)))); d.hinge.rotation.y = -1.9 * k; }
      // sky and lights
      const sky = skyAt(t); scene.background.set(sky.bg); hemi.intensity = sky.hemi; sun.intensity = sky.sun; sun.color.set(sky.sunColor); DIMC.value.set(sky.bg).lerp(new THREE.Color('#FFFFFF'), sky.lights > 0.5 ? 0.05 : 0.35);
      for (const s of windowSets) { const L = s.on !== null ? clamp01((t - s.on) / 0.6) : sky.lights; if (Math.abs(L - s.last) < 1e-3) continue; s.last = L; const c = new THREE.Color(); s.list.forEach((it, i) => { const k = clamp01((L - it.r0 * 0.7) * 6); c.copy(s.glass).lerp(s.warm, k); s.im.setColorAt(i, c); }); s.im.instanceColor.needsUpdate = true; }
      for (const l of lamps) { const L = l.on !== null ? clamp01((t - l.on) / 0.4) : sky.lights; l.m.emissiveIntensity = 2.2 * L; }
      // routes
      for (const R of routes) {
        const on = t >= R.at && t < R.until + 0.4, fade = 1 - clamp01((t - R.until) / 0.4); R.g.visible = on;
        if (!on) continue;
        const q = E.sine(clamp01((t - R.at) / R.dur)), d = R.len * q;
        R.mc.uniforms.uP.value = d; R.me.uniforms.uP.value = d; R.mc.uniforms.uOff.value = R.flow ? t * R.flow : 0; R.mc.uniforms.uA.value = R.me.uniforms.uA.value = fade;
        const h = along(R.pl, d); R.head.position.copy(h.p).add(V3(0, R.lift + 0.02 + (h.p.y < 0.6 ? groundY(h.p) : 0), 0)); R.head.visible = q < 1; R.head.material.opacity = fade;
        const e = along(R.pl, R.len); R.arrow.visible = R.arrowOn && q >= 0.999; R.arrow.material.opacity = fade * clamp01((t - R.at - R.dur) / 0.2);
        if (R.arrow.visible) { R.arrow.position.copy(e.p).add(V3(0, R.lift + 0.015 + (e.p.y < 0.6 ? groundY(e.p) : 0), 0)); R.arrow.rotation.set(-Math.PI / 2, 0, 0); R.arrow.rotateZ(Math.atan2(-e.dir.x, -e.dir.z)); }
      }
      const K = place(t);
      // labels: pole in the world, card on screen at the projected pole top
      for (const L of labels) {
        const k = Math.min(clamp01((t - L.at) / 0.28), 1 - clamp01((t - L.until) / 0.25)); const vis = k > 0.001;
        L.pg.visible = vis; L.card.style.display = vis ? '' : 'none'; if (!vis) continue;
        const base = L.fn(t); L.pg.position.copy(base);
        // the card stays inside the frame and below the chapter bar: the pole gets shorter (never under 0.3), the card slides sideways
        const cw = L.card.offsetWidth, ch = L.card.offsetHeight, safeTop = H0 * (F.T && F.T.chapters && F.T.chapters.length >= 2 ? (PT ? 0.09 : 0.1) : 0.03), ppu = Math.cos(camNow.el) * H0 / (2 * camNow.size);
        let pole = L.pole * E.sine(k), top = proj(base.clone().add(V3(0, pole, 0)));
        const over = safeTop - (top.y - ch - F.px(6)); if (over > 0) { pole = Math.max(Math.min(0.3, pole), pole - over / ppu); top = proj(base.clone().add(V3(0, pole, 0))); }
        L.pg.scale.set(1, Math.max(0.001, pole / L.pole), 1);
        const mx = F.px(16), x0 = Math.max(mx, Math.min(W0 - mx - cw, top.x - cw / 2 + F.px(L.dx))), y0 = top.y - ch - F.px(6);
        L.card.style.transform = `translate(${x0.toFixed(1)}px,${y0.toFixed(1)}px) scale(${(0.7 + 0.3 * backOut(k)).toFixed(3)})`; L.card.style.opacity = k.toFixed(3);
        L._box = { x: x0, y: y0, w: cw, h: ch };
        if (L.num) { const q = E.expoOut(clamp01((t - L.at - 0.1) / L.num.dur)), v = L.num.from + (L.num.to - L.num.from) * q, s = `${L.num.prefix}${L.num.fmt(v)}${L.num.unit}`; if (L.main.textContent !== s) L.main.textContent = s; }
        if (L.ring) { const q = E.expoOut(clamp01((t - L.at - 0.1) / (L.num ? L.num.dur : 1))), a0 = L.ringDef.start * 360, a1 = a0 + L.ringDef.frac * 360 * q; L.ring.style.background = `conic-gradient(from 0deg, #E3E8EC 0deg ${a0}deg, ${L.ringDef.color} ${a0}deg ${a1}deg, #E3E8EC ${a1}deg 360deg)`; L.ring.style.webkitMaskImage = L.ring.style.maskImage = `radial-gradient(circle closest-side, transparent 58%, #000 61%)`; }
      }
      for (const T of titles) { const k = Math.min(clamp01((t - T.at) / 0.4), 1 - clamp01((t - T.until) / 0.35)); T.box0.style.display = k > 0.001 ? 'flex' : 'none'; T.box0.style.opacity = k.toFixed(3); T.box0.style.transform = `translateY(${((1 - E.expoOut(k)) * F.px(26)).toFixed(1)}px)`; }
      return K;
    };
    W.update = update;
    W.run = () => { F.add((t) => { update(t); if (composer) composer.render(); else renderer.render(scene, camera); }); };
    W.project = proj;

    // ---------- Checks (printed in --check) ----------
    F.addLint(() => {
      const out = [], add = (level, t, what, msg) => out.push({ level, t: r2(t), src: '', what, msg }), seen = new Set(), once = (k) => { if (seen.has(k)) return false; seen.add(k); return true; };
      const inFrame = (v, pad = 0) => { const q = proj(v); return q.z < 1 && q.x >= -pad && q.x <= W0 + pad && q.y >= -pad && q.y <= H0 + pad; };
      const cutAt = (t) => (F.cuts || []).some((c) => Math.abs(c - t) < 0.05);
      for (let t = 0.2; t < F.duration; t += 0.2) {
        update(t);
        // ① labels: card cut by the frame edge, or sitting in the caption band
        for (const L of labels) { if (t < L.at + 0.3 || t > L.until - 0.3 || !L._box) continue; const b = L._box;
          if ((b.x < 0 || b.y < 0 || b.x + b.w > W0 || b.y + b.h > H0) && once('lc' + L.text)) add('warn', t, MSG('标签出画', 'label cut'), MSG(`"${String(L.text).slice(0, 20)}" 的卡片有一部分在画面外：镜头 fit 里加上它的锚点，或者把杆子调矮 / 换个锚点`, `the card "${String(L.text).slice(0, 20)}" is partly out of frame: add its anchor to the camera's fit, or lower the pole / pick another anchor`));
          if (F.voiced && b.y + b.h > H0 * (PT ? 0.69 : 0.85) && once('lb' + L.text)) add('warn', t, MSG('标签压字幕', 'label over captions'), MSG(`"${String(L.text).slice(0, 20)}" 落在字幕那一条里：镜头往下留出空间（room.bottom），或者锚点换高一点`, `"${String(L.text).slice(0, 20)}" sits in the caption band: leave room at the bottom (room.bottom) or anchor it higher`)); }
        // ② focus: what is lit must be in frame
        for (const f of focuses) { if (t < f.at + 0.5 || t > Math.min(f.until, f.at + 2)) continue; const pts = f.list.flatMap((x) => ptsOf(x, t)); if (pts.length && !pts.some((p) => inFrame(p)) && once('f' + f.at)) add('warn', t, MSG('焦点不在画面里', 'focus out of frame'), MSG(`${r2(f.at)}s 亮起来的东西不在镜头里：同一时刻把镜头推过去（camera 里 fit 它）`, `what lights up at ${r2(f.at)}s is not in frame: move the camera to it at the same moment (fit it in a camera key)`)); }
        // ③ routes: the head being drawn must be in frame
        for (const R of routes) { if (t < R.at + 0.1 || t > R.at + R.dur) continue; if (!inFrame(R.headAt(t), F.px(20)) && once('r' + R.at)) add('warn', t, MSG('路线画在画外', 'route drawn off-frame'), MSG(`${r2(R.at)}s 开始画的路线，${r2(t)}s 时笔头在画面外：镜头 fit 整条路线，或者跟着笔头走`, `the route started at ${r2(R.at)}s has its head out of frame at ${r2(t)}s: fit the whole route, or follow the head`)); }
        // ④ movers that jump (a teleport while visible and in frame, not on a cut)
        for (const m of movers) { if (!m.root.visible || m.root.scale.x < 0.3) { m._lp = null; continue; } const p = m.root.position.clone(); if (m._lp && m._lt === r2(t - 0.2) && p.distanceTo(m._lp) > 4.5 && !cutAt(t) && inFrame(p) && once('j' + m.zone.name)) add('warn', t, MSG('瞬移', 'teleport'), MSG(`${m.kind} 在 ${r2(t - 0.2)}–${r2(t)}s 之间跳了 ${p.distanceTo(m._lp).toFixed(1)} 米（在画面里）：中间补一段 move，或者让它先 hide 再出现`, `a ${m.kind} jumps ${p.distanceTo(m._lp).toFixed(1)} m between ${r2(t - 0.2)} and ${r2(t)}s (in frame): add a move in between, or hide it first`)); m._lp = p; m._lt = r2(t); }
      }
      // ⑤ camera: a glide that changes the view too much too fast reads as a jerk
      keys.forEach((k, i) => { if (!i || k.cut) return; const a = frameFor(keys[i - 1], k.at, AZ0, EL0), b = frameFor(k, k.at + k.dur, AZ0, EL0), dist = a.look.distanceTo(b.look) / Math.min(a.size, b.size), zr = Math.max(a.size, b.size) / Math.min(a.size, b.size);
        if ((dist / k.dur > 2.6 || zr > 2.2 && k.dur < 1.0) && once('c' + i)) add('warn', k.at, MSG('镜头太急', 'camera too fast'), MSG(`${r2(k.at)}s 的镜头移动 ${k.dur}s 内走了 ${dist.toFixed(1)} 个画面高 / 缩放 ${zr.toFixed(1)} 倍：dur 拉长，或者中间加一个拉远的镜头`, `the camera move at ${r2(k.at)}s travels ${dist.toFixed(1)} frame heights / zooms ${zr.toFixed(1)}× in ${k.dur}s: make dur longer, or pull back in between`)); });
      update(0);
      return out;
    });
    update(0);
    return W;
  };
})();
