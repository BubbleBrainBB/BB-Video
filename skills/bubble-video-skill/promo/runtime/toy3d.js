// toy3d.js: Toy 3D (玩具三维), one of bubble-video-skill's visual styles (style notes in styles/toy3d/STYLE.md). Load after promo.js; the page needs a three import map (the starter page has one).
// Physical interfaces on a table (screenshots / drawn layouts printed on slabs) + one matte soft-vinyl toy that "operates" the interface with its body: landing = click, hopping along a row = typing, carrying something on its head = dragging.
// The camera is a series of separate shots (hard cuts on the beat), almost still within a shot; low angle, shallow depth of field; glow only on the thing being talked about.
//
//   const T = await PROMO.toy3d(F, { desk, fog, bloom: { strength, radius, threshold, knee }, exposure })
//   slab    const s = await T.slab({ x, z, w, image | draw, band: { depth, draw }, color })   → s.at(u, v) / s.anchor(u, v) / s.region(u0, v0, u1, v1) / s.key(…) / s.label(…)
//   text    T.label(s | null, { text, u, v | x, z, size, at, until, color, weight, align, key })   text printed on a slab / the table (automatic fact check + legibility check)
//   toy     T.toy.svg(d, { size, depth, color }) / T.toy.build(spec) / T.toy.load(name)   → a toy (a Blender-made GLB first; otherwise three.js builds it from the same spec)
//   actor   const M = T.mascot(toy, { start, born, from, face })   → M.hop / roll / click / type / carry / stamp / wait (every landing point is an anchor that moves with whatever it sits on)
//   sums    T.keycaps({ x, z, tokens, at, until, hot })                 keycaps rise from the table; "a × b = c" is checked automatically
//   camera  T.shots([{ at, fit: [points…], el, az, fov, aperture, focus, carry } | { at, pos: [a, b], look: [a, b] }])   fit = the points this shot must contain (camera position computed separately for landscape and portrait)
//   frame   T.onFrame((t) => …); finally T.run()
//   checks  reported automatically in --check: text printed in 3D too small / squashed / cut off / inside the portrait safe zone; shot lengths too even; cutting back and forth between sides; hard cuts without carry; wrong sums
(function () {
  const P = window.PROMO;
  if (!P) throw new Error('toy3d.js 要在 promo.js 之后加载');
  const { E, seg } = P;
  const backOut = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
  const backIn = (x) => x * x * (2.70158 * x - 1.70158);
  const r2 = (n) => Math.round(n * 100) / 100;

  P.toy3d = async function (F, opt = {}) {
    const THREE = await import('three');
    const imp = (p) => import(`three/addons/${p}`);
    const [{ EffectComposer }, { RenderPass }, { BokehPass }, { UnrealBloomPass }, { OutputPass }, { RoomEnvironment }, { RoundedBoxGeometry }, { mergeGeometries }, { SVGLoader }, { GLTFLoader }] = await Promise.all([
      imp('postprocessing/EffectComposer.js'), imp('postprocessing/RenderPass.js'), imp('postprocessing/BokehPass.js'), imp('postprocessing/UnrealBloomPass.js'), imp('postprocessing/OutputPass.js'),
      imp('environments/RoomEnvironment.js'), imp('geometries/RoundedBoxGeometry.js'), imp('utils/BufferGeometryUtils.js'), imp('loaders/SVGLoader.js'), imp('loaders/GLTFLoader.js')]);
    const W = F.W, H = F.H, PT = F.portrait, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const T = { THREE, V3, W, H, portrait: PT, RoundedBoxGeometry, mergeGeometries };
    const frameFns = [], lateFns = [];
    T.onFrame = (fn) => frameFns.push(fn);

    // ---------- Renderer, lights, table ----------
    const DESK = opt.desk ?? '#2E231D', BG = opt.bg ?? '#221B17';
    const canvas = P.el('canvas', `left:0;top:0;width:${W}px;height:${H}px`, F.layer('', 1));
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = opt.exposure ?? 1.0;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(BG); scene.fog = new THREE.Fog(BG, opt.fog?.[0] ?? 22, opt.fog?.[1] ?? 60);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45;
    const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 400);
    scene.add(new THREE.HemisphereLight('#FFF1E4', '#2A1D17', 0.55));
    const key = new THREE.DirectionalLight('#FFE6CF', opt.key ?? 1.15); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 6;
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight('#9FB4FF', 0.45); scene.add(rim, rim.target);
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: DESK, roughness: 0.95 }));
    desk.rotation.x = -Math.PI / 2; desk.position.y = -0.2; desk.receiveShadow = true; scene.add(desk);
    Object.assign(T, { scene, camera, renderer, desk });

    // ---------- Post: depth of field + bloom ----------
    // The bloom threshold has a soft "knee": when brightness rises slowly from below the threshold the halo also grows slowly, instead of popping in / out in one frame (the "one-frame jump" in the film check)
    const BL = { strength: 0.7, radius: 0.5, threshold: 1.15, knee: 0.5, ...(opt.bloom || {}) };
    const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
    composer.addPass(new RenderPass(scene, camera));
    const bokeh = new BokehPass(scene, camera, { focus: 5, aperture: 0.002, maxblur: opt.maxblur ?? 0.014 }); composer.addPass(bokeh);
    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), BL.strength, BL.radius, BL.threshold);
    if (bloom.highPassUniforms?.smoothWidth) bloom.highPassUniforms.smoothWidth.value = BL.knee;
    composer.addPass(bloom); composer.addPass(new OutputPass());
    T.glowLevel = BL.threshold + BL.knee + 0.4;   // glowing things use this brightness (× colour), always above the threshold

    // ---------- Helpers ----------
    const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
    const tex = (src) => { const t = src instanceof HTMLCanvasElement ? new THREE.CanvasTexture(src) : src; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t; };
    const loadTex = (url) => new Promise((ok, no) => new THREE.TextureLoader().load(url, (t) => ok(tex(t)), undefined, () => no(new Error('toy3d：图片加载失败 ' + url))));
    const font = (o) => o.font ?? (F.theme && F.theme.fonts && F.theme.fonts.sans) ?? 'sans-serif';
    Object.assign(T, { mkCanvas, tex, loadTex });
    // Glowing plane (fades in and out by opacity only; colour brightness fixed above the threshold)
    const glowMat = (color, map) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(T.glowLevel), map: map ?? null, transparent: true, toneMapped: false, depthWrite: false, opacity: 0 });
    T.glowMat = glowMat;

    // ---------- Slab: a thin dark board with a screenshot / drawn layout printed on top; it can carry a printed title band ----------
    const slabs = [], labels = [];
    const GRID = opt.grid || /[?&]grid\b/.test(location.search);   // grid: true (or ?grid in the URL): overlay a 10% grid with ticks on the screenshot, for measuring u / v of landing points
    T.slab = async (o) => {
      let map, iw, ih;
      if (o.image) { map = await loadTex(o.image); iw = map.image.width; ih = map.image.height; }
      else if (o.draw) { const PXu = o.ppu ?? 256, d0 = o.d ?? o.w * 9 / 16, cv = mkCanvas(o.w * PXu, d0 * PXu); o.draw(cv.getContext('2d'), cv.width, cv.height, PXu); map = tex(cv); iw = cv.width; ih = cv.height; }
      const w = o.w, d = o.d ?? (iw ? w * ih / iw : w * 9 / 16), band = o.band?.depth ?? 0, pad = o.pad ?? 0.25, D = d + band + 2 * pad;
      const g = new THREE.Group(); g.position.set(o.x ?? 0, 0, o.z ?? 0); g.rotation.y = o.ry ?? 0; scene.add(g);
      const body = new THREE.Mesh(new RoundedBoxGeometry(w + 2 * pad, o.thick ?? 0.2, D, 4, 0.06), new THREE.MeshStandardMaterial({ color: o.color ?? '#0D0E10', roughness: 0.6, metalness: 0.2 }));
      body.position.y = -(o.thick ?? 0.2) / 2; body.castShadow = body.receiveShadow = true; g.add(body);
      const z0 = -D / 2 + pad + band;                                       // top edge of the image in the slab's local coordinates
      if (map) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map, roughness: 0.8, emissive: '#FFFFFF', emissiveMap: map, emissiveIntensity: o.emissive ?? 0.32 }));
        m.rotation.x = -Math.PI / 2; m.position.set(0, 0.002, z0 + d / 2); m.receiveShadow = true; g.add(m);
        if (GRID) { const cv = mkCanvas(1600, 1600 * d / w), c = cv.getContext('2d'); c.strokeStyle = 'rgba(255,60,60,.9)'; c.fillStyle = 'rgba(255,90,90,1)'; c.font = `${cv.width / 60}px sans-serif`; c.lineWidth = 2;
          for (let i = 1; i < 20; i++) { const x = cv.width * i / 20; c.globalAlpha = i % 2 ? 0.4 : 1; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, cv.height); c.stroke(); if (i % 2 === 0) c.fillText(String(i / 20), x + 3, 22); }
          for (let i = 1; i < 10; i++) { const y = cv.height * i / 10; c.globalAlpha = 1; c.beginPath(); c.moveTo(0, y); c.lineTo(cv.width, y); c.stroke(); c.fillText(String(i / 10), 3, y - 4); }
          const gm = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex(cv), transparent: true, toneMapped: false, depthWrite: false })); gm.rotation.x = -Math.PI / 2; gm.position.set(0, 0.02, z0 + d / 2); g.add(gm); }
      }
      if (band) { const PXu = 256, cv = mkCanvas(w * PXu, band * PXu), c = cv.getContext('2d'); c.fillStyle = o.band.color ?? o.color ?? '#0D0E10'; c.fillRect(0, 0, cv.width, cv.height); o.band.draw?.(c, cv.width, cv.height, PXu);
        const bm = new THREE.Mesh(new THREE.PlaneGeometry(w, band), new THREE.MeshStandardMaterial({ map: tex(cv), roughness: 0.85, emissive: '#FFFFFF', emissiveMap: tex(cv), emissiveIntensity: o.band.emissive ?? 0.2 }));
        bm.rotation.x = -Math.PI / 2; bm.position.set(0, 0.002, z0 - band / 2); bm.receiveShadow = true; g.add(bm); }
      // Local coordinates: u 0–1 left to right, v 0–1 from the image's top edge to its bottom edge (the title band is at v < 0)
      const local = (u, v, y = 0) => V3(-w / 2 + u * w, y, z0 + v * d);
      const s = { name: o.name ?? `slab${slabs.length}`, group: g, w, d, band, map, image: o.image, motion: o.motion, color: o.color ?? '#0D0E10',
        at: (u, v, y = 0) => g.localToWorld(local(u, v, y)),
        anchor: (u, v, y = 0) => anchor(() => g.localToWorld(local(u, v, y)), `${o.name ?? 'slab'}(${u},${v})`),
        local };
      // A patch of the slab: glows (outline / soft light), gets pressed (rises into a key, sinks when landed on)
      s.region = (u0, v0, u1, v1) => region(s, u0, v0, u1, v1);
      s.key = (u0, v0, u1, v1, k = {}) => liftKey(s, u0, v0, u1, v1, k);
      s.label = (lo) => T.label(s, lo);
      if (o.info !== false && o.at !== undefined) F.info('ui', o.at, o.until);
      slabs.push(s); return s;
    };
    // Anchor: a world position that changes over time (when the slab moves, it moves with it). Every toy move targets an anchor
    const anchor = (fn, name = '') => ({ pos: (t) => fn(t).clone(), name, isAnchor: true });
    T.anchor = (p, name) => (p && p.isAnchor ? p : typeof p === 'function' ? anchor(p, name) : anchor(() => p.clone(), name ?? 'point'));
    T.point = (x, y, z) => T.anchor(V3(x, y, z));

    // A glowing patch: rounded outline / soft light (fades in and out by opacity only)
    const roundTex = (ring, lw = 4) => { const cv = mkCanvas(256, 128), c = cv.getContext('2d'); c.fillStyle = c.strokeStyle = '#fff'; c.lineWidth = lw; c.beginPath(); c.roundRect(6, 6, 244, 116, 22); ring ? c.stroke() : c.fill(); return new THREE.CanvasTexture(cv); };
    const RT = { ring: roundTex(true), fill: roundTex(false) };
    const glows = [];
    function region(s, u0, v0, u1, v1) {
      const c0 = s.local(u0, v0), c1 = s.local(u1, v1), center = c0.clone().add(c1).multiplyScalar(0.5);
      const R = { slab: s, u0, v0, u1, v1, anchor: s.anchor((u0 + u1) / 2, (v0 + v1) / 2), w: c1.x - c0.x, d: c1.z - c0.z };
      R.glow = (g = {}) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat(g.color ?? opt.accent ?? '#8E97FF', RT[g.kind ?? 'ring']));
        m.rotation.x = -Math.PI / 2; m.scale.set(R.w, R.d, 1); m.position.set(center.x, 0.012, center.z); m.visible = false; s.group.add(m);
        const it = { m, at: g.at, until: g.until ?? 1e9, max: g.max ?? (g.kind === 'fill' ? 0.25 : 0.9) }; glows.push(it);
        if (g.sfx !== false) F.sfx(g.at, typeof g.sfx === 'string' ? g.sfx : 'glow', g.gain ?? 0.45);
        if (g.info !== false) F.info('ui', g.at, it.until);
        return R;
      };
      return R;
    }
    // Raised key: "cut" a patch of screenshot out of the slab into a key (top face shows the same patch), rise it; it sinks when the toy lands on it (like the toolbar keys in the reference film)
    const keys = [];
    function liftKey(s, u0, v0, u1, v1, k) {
      if (!s.map) throw new Error('toy3d：只有印着截图的平台能做 key');
      const c0 = s.local(u0, v0), c1 = s.local(u1, v1), w = c1.x - c0.x, d = c1.z - c0.z, h = k.height ?? 0.09;
      const t2 = s.map.clone(); t2.needsUpdate = true; t2.repeat.set(u1 - u0, v1 - v0); t2.offset.set(u0, 1 - v1);
      const top = new THREE.MeshStandardMaterial({ map: t2, emissive: '#FFFFFF', emissiveMap: t2, emissiveIntensity: 0.4, roughness: 0.55 });
      const side = new THREE.MeshStandardMaterial({ color: k.color ?? '#17181B', roughness: 0.6 });
      const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(0.03, h / 3)), [side, side, top, side, side, side]); m.castShadow = m.receiveShadow = true; m.visible = false;
      m.position.set((c0.x + c1.x) / 2, -h, (c0.z + c1.z) / 2); s.group.add(m);
      // Once the key is lifted away, its old spot is empty (a patch of slab base colour) — otherwise the screenshot would still show the same card
      let hole = null; if (k.hole) { hole = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.02, d * 1.04), new THREE.MeshStandardMaterial({ color: k.hole === true ? (s.color ?? '#0D0E10') : k.hole, roughness: 0.8 })); hole.rotation.x = -Math.PI / 2; hole.position.set(m.position.x, 0.004, m.position.z); hole.visible = false; s.group.add(hole); }
      const K = { m, top, h, hole, rise: k.at, until: k.until ?? 1e9, presses: [], anchor: anchor(() => s.group.localToWorld(m.position.clone().setY(m.position.y + h / 2))) };
      K.press = (at) => { K.presses.push(at); return K; };
      if (k.sfx !== false) F.sfx(k.at, 'key', 0.4);
      keys.push(K); return K;
    }

    // ---------- Text printed on a slab / the table (automatic fact check + legibility check) ----------
    // size = height of one character (world units); key: true = key text (the portrait safe zone is checked too); glow: colour = this line glows itself
    T.label = (s, o) => {
      const lines = String(o.text).split('\n'), size = o.size ?? 0.4, PXu = 256 / size * 0.5, px = size * PXu, weight = o.weight ?? 700, fnt = `${weight} ${px}px ${font(o)}`;
      const meas = mkCanvas(4, 4).getContext('2d'); meas.font = fnt;
      const tw = Math.max(...lines.map((l) => meas.measureText(l).width)), lh = px * (o.lineHeight ?? 1.25);
      const cv = mkCanvas(tw + px * 0.4, lh * lines.length + px * 0.3), c = cv.getContext('2d');
      c.font = fnt; c.fillStyle = o.glow ? '#FFFFFF' : (o.color ?? '#F2F4F8'); c.textBaseline = 'middle'; c.textAlign = 'left';
      lines.forEach((l, i) => c.fillText(l, px * 0.2, px * 0.15 + lh * (i + 0.5)));
      const wW = cv.width / PXu, wD = cv.height / PXu;
      const mat = o.glow ? glowMat(o.glow, tex(cv)) : new THREE.MeshBasicMaterial({ map: tex(cv), transparent: true, toneMapped: true, depthWrite: false, opacity: 0, color: new THREE.Color(o.dim ?? 1, o.dim ?? 1, o.dim ?? 1) });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wW, wD), mat); m.rotation.x = -Math.PI / 2; m.visible = false;
      const parent = s ? s.group : scene, base = s ? s.local(o.u ?? 0, o.v ?? 0) : V3(o.x ?? 0, 0, o.z ?? 0);
      const ax = o.align === 'center' ? 0 : o.align === 'right' ? -wW / 2 : wW / 2;   // u / v or x / z is the left-middle point of the line (center: the middle point, right: the right-middle point)
      m.position.set(base.x + ax, (o.y ?? 0) + 0.008, base.z); parent.add(m);
      // read: the spans when this line "must be read"; size and squashing are checked only in those spans (a title that stays up being squashed in a low shot is normal).
      //   Default: the first 2 s of each shot that frames the whole line + 2 s after it appears mid-shot; read: false = decorative text, size not checked
      const L = { text: o.text, m, at: o.at ?? 0, until: o.until ?? 1e9, key: !!o.key, size, em: size, lines: lines.length, fade: o.fade ?? 0.3, read: o.read ?? null };
      L.corners = () => { const hw = wW / 2, hd = wD / 2; return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, z]) => m.localToWorld(V3(x, z, 0))); };
      L.emBox = () => { const hd = Math.min(wD / 2, size / 2); return [m.localToWorld(V3(-wW / 2 + size * 0.5, hd, 0)), m.localToWorld(V3(-wW / 2 + size * 0.5, -hd, 0)), m.localToWorld(V3(-wW / 2, 0, 0)), m.localToWorld(V3(-wW / 2 + size, 0, 0))]; };
      if (o.fact !== false) F.fact(lines.join(' '), L.at, L.until);
      labels.push(L); return L;
    };

    // ---------- Toy ----------
    // Soft-vinyl toy material (the blue whale in the reference film: matte, a flocked-looking sheen; only the eyes are glossy)
    const vinyl = (o = {}) => new THREE.MeshPhysicalMaterial({ roughness: o.roughness ?? 0.76, sheen: o.sheen ?? 0.45, sheenRoughness: 0.55, sheenColor: new THREE.Color(o.sheenColor ?? '#FFF0E2'), clearcoat: 0.04, ...(o.vertexColors ? { vertexColors: true } : { color: o.color ?? '#5E6AD2' }) });
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#0B0C12', roughness: 0.15 });
    T.vinyl = vinyl;
    const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };   // same as in toy3d-model.mjs
    const glbCache = {}, buildCache = {}, matCache = {}, warned = {};
    const SHAPES = { sphere: () => new THREE.SphereGeometry(1, 28, 18), cylinder: () => new THREE.CylinderGeometry(1, 1, 1, 18), cone: () => new THREE.ConeGeometry(1, 1, 18), box: () => new RoundedBoxGeometry(1, 1, 1, 3, 0.12), capsule: () => new THREE.CapsuleGeometry(0.5, 1, 6, 16) };
    const partGeo = (pt) => {
      const geo = (SHAPES[pt.shape] || SHAPES.sphere)();
      geo.applyMatrix4(new THREE.Matrix4().compose(V3(...(pt.p || [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(pt.r || [0, 0, 0]))), V3(...(pt.s || [1, 1, 1]))));
      const c = new THREE.Color(pt.color ?? '#cccccc'), n = geo.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo;   // keep each piece's own normals (recomputing would turn them into little facets)
    };
    // toy = { root, joints: { name: Object3D }, radius, height, pieces }
    const finishToy = (root, joints, o = {}) => {
      root.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
      const box = new THREE.Box3().setFromObject(root), sz = box.getSize(V3(0, 0, 0));
      // Convention: the toy's front faces +z (towards the camera); parts lists built with +x as front say front: 'x'
      const orient = new THREE.Group(); orient.add(root); if (o.front === 'x') orient.rotation.y = -Math.PI / 2;
      const wrap = new THREE.Group(); wrap.add(orient); scene.add(wrap); wrap.visible = false;
      return { root: wrap, inner: root, joints, height: sz.y, radius: Math.max(sz.x, sz.z) / 2, pieces: o.pieces || [], base: -box.min.y, upright: !!o.upright };
    };
    T.toy = {
      // Build from a parts list (three.js version). spec: { parts: [{ shape, color, p, r, s, joint, eye }], joints: { name: { pivot, parent } } } — the same one Blender uses
      build(spec, cacheKey) {
        const root = new THREE.Group(), joints = { root }, J = spec.joints || {};
        const order = Object.keys(J); const made = new Set(['root']);
        while (order.some((n) => !made.has(n))) for (const n of order) { if (made.has(n)) continue; const par = J[n].parent ?? 'root'; if (!made.has(par)) continue;
          const g = new THREE.Group(), pv = J[n].pivot || [0, 0, 0], pp = par === 'root' ? [0, 0, 0] : J[par].pivot || [0, 0, 0]; g.position.set(pv[0] - pp[0], pv[1] - pp[1], pv[2] - pp[2]); joints[par].add(g); joints[n] = g; made.add(n); }
        const ck = cacheKey ?? hash(JSON.stringify(spec));
        const built = buildCache[ck] ??= (() => {
          const groups = {};
          for (const pt of spec.parts) { const jn = pt.joint ?? 'root', k = jn + (pt.eye ? ':eye' : ''); (groups[k] ??= { jn, eye: !!pt.eye, geos: [] }).geos.push(partGeo(pt)); }
          return Object.values(groups).map(({ jn, eye, geos }) => { const g = mergeGeometries(geos); const pv = jn === 'root' ? [0, 0, 0] : J[jn].pivot || [0, 0, 0]; g.translate(-pv[0], -pv[1], -pv[2]); return { jn, eye, g }; });
        })();
        const vmat = matCache['vc:' + ck] ??= vinyl({ vertexColors: true, ...(spec.material || {}) });
        for (const { jn, eye, g } of built) joints[jn].add(new THREE.Mesh(g, eye ? eyeMat : vmat));
        return finishToy(root, joints, spec);
      },
      // A brand mark made into a toy: SVG paths extruded as-is, edges rounded; each piece is a separate part (can scatter and rejoin on landing). upright: standing (like a coin, can roll)
      svg(d, o = {}) {
        const size = o.size ?? 0.84, vb = o.viewBox ?? 100, mat = vinyl({ color: o.color, ...(o.material || {}) });
        const paths = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}"><path d="${d}"/></svg>`).paths;
        const root = new THREE.Group(), pieces = [];
        for (const pth of paths) for (const sh of SVGLoader.createShapes(pth)) {   // createShapes tells outlines from holes by winding (toShapes(true) would treat large pieces as holes)
          const g = new THREE.ExtrudeGeometry(sh, { depth: vb * (o.depth ?? 0.2), bevelEnabled: true, bevelThickness: vb * 0.05, bevelSize: vb * 0.026, bevelSegments: 6, curveSegments: 40 });
          g.translate(-vb / 2, -vb / 2, -vb * (o.depth ?? 0.2) / 2); g.scale(size / vb, -size / vb, size / vb);
          g.computeBoundingBox(); const c = V3(0, 0, 0); g.boundingBox.getCenter(c);
          const m = new THREE.Mesh(g, mat); m.userData.dir = c.setZ(0).normalize(); root.add(m); pieces.push(m);
        }
        if (o.upright === false) root.rotation.x = -Math.PI / 2;
        return finishToy(root, { root }, { pieces, upright: o.upright !== false });
      },
      // A Blender-made GLB (assets/toys-glb.js, generated by scripts/toy3d-model.mjs) first; otherwise three.js builds it from the same spec
      // Many copies of one toy (35 chickens and rabbits): the GLB is parsed once, geometry shared, one material per colour
      async load(name, spec = (window.TOY3D_SPECS || {})[name]) {
        const b64 = (window.TOY3D_GLB || {})[name], hh = (window.TOY3D_GLB_HASH || {})[name];
        const fresh = b64 && (!spec || !hh || hh === hash(JSON.stringify(spec)));
        if (b64 && !fresh && !warned[name]) { warned[name] = 1; console.warn(`toy3d：${name} 的零件表改过了，Blender 做的 GLB 是旧的——先用 three.js 版；重跑 node promo/scripts/toy3d-model.mjs <项目>`); }
        if (fresh) {
          glbCache[name] ??= new Promise((ok, no) => new GLTFLoader().parse(Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0)).buffer, '', ok, no));
          const root = (await glbCache[name]).scene.clone(true), joints = { root };
          root.traverse((x) => { if (x.name && x.name.startsWith('joint_')) joints[x.name.slice(6)] = x; if (x.isMesh) { const eye = /^eye/i.test(x.name) || /^eye/i.test(x.material?.name ?? ''); const col = x.material?.color ?? new THREE.Color('#ccc'), k = col.getHexString(); x.material = eye ? eyeMat : (matCache[k] ??= vinyl({ color: col.clone(), ...(spec?.material || {}) })); } });
          const t = finishToy(root, joints, spec || {}); t.source = 'blender'; return t;
        }
        if (!spec) throw new Error(`toy3d：没有玩具 ${name}（toys.js 里写 window.TOY3D_SPECS.${name}）`);
        const t = T.toy.build(spec, name); t.source = 'three'; return t;
      },
    };

    // ---------- Actor: the toy operates the interface with its body ----------
    // Every landing point is an anchor (s.anchor(u, v) on a slab, K.anchor of a key, T.point(x, y, z)); in the air it flies towards where the anchor will be at the moment of landing, and after landing it moves with the anchor
    const mascots = [];
    T.mascot = (toy, o = {}) => {
      const moves = [], start = T.anchor(o.start ?? V3(0, 0, 0));
      const M = { toy, moves, born: o.born ?? 0, from: o.from ?? 'pop', face: o.face ?? 'camera', yaw: o.yaw ?? -0.35, pose: o.pose, info: o.info !== false };
      let last = start, lastT = M.born;
      if (o.sfx !== false) F.sfx(M.born, M.from === 'drop' ? 'whoosh' : 'pop', 0.5);   // entrance has a sound (the first 0.5 s of the film won't be silent on phones)
      const push = (mv) => { if (mv.a < lastT - 1e-6) console.warn(`toy3d：动作 ${mv.kind} 在 ${r2(mv.a)}s 开始，上一个动作 ${r2(lastT)}s 才结束`); mv.from = last; moves.push(mv); last = mv.to ?? last; lastT = mv.b; if (M.info && mv.kind !== 'set') F.info('toy', mv.a, mv.b + 0.6, { group: 'toy' }); return M; };
      // Hop: h = how high (world units); kf = an important landing (squashes more, the mark scatters and rejoins, a heavy sound); spin = turns in the air
      M.hop = (to, at, o2 = {}) => { const d = o2.dur ?? 0.55, h = o2.h ?? 0.8; push({ kind: 'hop', to: T.anchor(to), a: at, b: at + d, h, kf: !!o2.kf, spin: o2.spin ?? 0 }); if (o2.sfx !== false) { if (h >= 0.9) F.sfx(at, 'whoosh', 0.3, { dur: d, size: 0.3 }); F.sfx(at + d, o2.kf ? 'stamp' : 'land', o2.kf ? 0.6 : 0.45); } return M; };
      // Roll (a standing mark, a wheel): roll along a straight line
      M.roll = (to, at, o2 = {}) => { const d = o2.dur ?? 1.2; push({ kind: 'roll', to: T.anchor(to), a: at, b: at + d }); if (o2.sfx !== false) F.sfx(at, 'roll', 0.4, { dur: d }); return M; };
      // Teleport (change position while the camera is cut away, unseen)
      M.set = (to, at) => { moves.push({ kind: 'set', to: T.anchor(to), a: at, b: at, from: last }); last = T.anchor(to); lastT = at; return M; };
      // Click: hop onto the target; the moment it lands the target is pressed (the key sinks / glows)
      M.click = (target, at, o2 = {}) => { const d = o2.dur ?? 0.5; M.hop(target.anchor ?? target, at - d, { ...o2, dur: d }); target.press?.(at); return M; };
      // Type: hop cell by cell along a row of landing points, calling onKey(i, time) on each landing (so characters appear one by one)
      M.type = (points, at, o2 = {}) => { const step = o2.step ?? 0.25; points.forEach((p, i) => { M.hop(p, at + i * step, { dur: step * 0.8, h: o2.h ?? 0.3, sfx: false }); F.sfx(at + i * step + step * 0.8, 'type', 0.5); o2.onKey?.(i, at + i * step + step * 0.8); }); return M; };
      // Carry: carry something on its head and set it down on arrival; the thing moves with the toy. It can be a mesh or a key cut out with s.key (K)
      M.carry = (obj, to, at, o2 = {}) => { const d = o2.dur ?? 1.0, mesh = obj.m ?? obj; carries.push({ M, obj: mesh, a: at, b: at + d, drop: T.anchor(to), lift: o2.lift ?? 0.12 }); M.hop(to, at, { ...o2, dur: d, h: o2.h ?? 0.5 }); return M; };
      // Stamp: one heavy press in place (the mark scatters and rejoins)
      M.stamp = (at, o2 = {}) => { M.hop(last, at - 0.3, { dur: 0.3, h: o2.h ?? 0.35, kf: true }); return M; };
      M.last = () => last;
      mascots.push(M); return M;
    };
    const carries = [];
    const solve = (M, t) => {
      let p = M.moves.length ? M.moves[0].from.pos(t) : V3(0, 0, 0), air = null, land = null, rollAng = 0;
      for (const m of M.moves) {
        if (m.kind === 'set') { if (t >= m.a) p = m.to.pos(t); continue; }
        const L = m.to.pos(Math.max(t, m.b)), F0 = m.from.pos(m.a), dir = Math.sign((L.x - F0.x) || 1), dist = L.distanceTo(F0);
        if (t >= m.b) { p = m.to.pos(t); land = m; if (m.kind === 'roll') rollAng += dist / M.r * dir; continue; }
        if (t > m.a) {
          const q = (t - m.a) / (m.b - m.a);
          if (m.kind === 'roll') { const e = E.cubicInOut(q); p = F0.clone().lerp(L, e); rollAng += dist * e / M.r * dir; }
          else { const e = E.sine(q); p = F0.clone().lerp(L, e); p.y = F0.y + (L.y - F0.y) * q + m.h * 4 * q * (1 - q); air = { m, q }; }
          break;
        }
        break;   // moves not started yet: stay where the previous move landed (before the first move = the start point)
      }
      return { p, air, land, rollAng };
    };

    // ---------- Keycaps: sums, numbers (rise from the table; the result cell glows; "a × b = c" checked automatically) ----------
    const capRows = [];
    T.keycaps = (o) => {
      const sz = o.size ?? 0.66, gap = o.gap ?? sz * 0.14, toks = o.tokens, hot = o.hot ?? toks.length - 1;
      const val = (k, t) => String(typeof k === 'function' ? k(t) : k), wd = (s0) => (s0.length > 2 ? sz * (0.42 + 0.3 * s0.length) : s0.length > 1 ? sz * 1.27 : sz);
      const sizes = toks.map((k) => wd(val(k, o.until ?? o.at + 1))), total = sizes.reduce((a, b) => a + b, 0) + gap * (toks.length - 1);
      const side = new THREE.MeshStandardMaterial({ color: o.color ?? '#17181B', roughness: 0.6 }), cache = new Map();
      const glyph = (s0) => { const k2 = 'g:' + s0; if (cache.has(k2)) return cache.get(k2); const cv = mkCanvas(256 * wd(s0) / sz, 256), c = cv.getContext('2d'); c.fillStyle = '#FFFFFF'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${/[\u4e00-\u9fff]/.test(s0) ? 700 : 800} ${s0.length > 1 ? 150 : 170}px ${o.font ?? font(o)}`; c.fillText(s0, cv.width / 2, 140); const t2 = tex(cv); cache.set(k2, t2); return t2; };
      const face = (s0) => { if (cache.has(s0)) return cache.get(s0); const cv = mkCanvas(256 * wd(s0) / sz, 256), c = cv.getContext('2d'); c.fillStyle = o.top ?? '#232428'; c.fillRect(0, 0, cv.width, cv.height); c.fillStyle = '#F2F4F8'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${/[一-鿿]/.test(s0) ? 700 : 800} ${s0.length > 1 ? 150 : 170}px ${o.font ?? font(o)}`; c.fillText(s0, cv.width / 2, 140); const t2 = tex(cv); cache.set(s0, t2); return t2; };
      let x = (o.x ?? 0) - (o.align === 'left' ? 0 : total / 2);
      const caps = toks.map((k, i) => {
        const top = new THREE.MeshStandardMaterial({ map: face(val(k, o.at)), roughness: 0.5, emissive: '#FFFFFF', emissiveIntensity: 0.3 }); top.emissiveMap = top.map;
        const m = new THREE.Mesh(new RoundedBoxGeometry(sizes[i], sz * 0.24, sz, 3, sz * 0.07), [side, side, top, side, side, side]); m.castShadow = m.receiveShadow = true; m.visible = false;
        m.position.set(x + sizes[i] / 2, -0.2, o.z ?? 0); x += sizes[i] + gap; scene.add(m);
        // The result cell: a layer of glowing text on top (brightness fixed at the threshold, fades in only) — so the key face's brightness never slides across the threshold
        let gl = null; if (i === hot) { gl = new THREE.Mesh(new THREE.PlaneGeometry(sizes[i], sz), glowMat(o.glow ?? opt.accent ?? '#FFC861', glyph(val(k, o.at)))); gl.rotation.x = -Math.PI / 2; gl.visible = false; scene.add(gl); }
        return { m, top, k, i, gl, h: sz * 0.24, a: o.at + i * (o.stagger ?? 0.07) };
      });
      const text = toks.map((k) => val(k, o.until ?? o.at + 1)).join(o.sep ?? '');
      if (o.fact !== false) F.fact(text, o.at, o.until ?? 1e9);
      F.info(o.infoKind ?? 'figures', o.at, o.until);
      if (o.sfx !== false) F.sfx(o.at, 'key', 0.5);
      const row = { caps, at: o.at, until: o.until ?? 1e9, y: o.y ?? 0, text, face, glyph, check: o.check !== false };
      capRows.push(row); return row;
    };

    // ---------- Camera ----------
    // { at, pos: [start, end], look: [start, end] } hand-placed camera; or { at, fit: [anchors / points…], el, az, push, margin } computes the camera from "the points this shot must contain" (once for landscape, once for portrait)
    // focus: 'toy' (default, follows the toy) | anchor | point | [[time, target]…] (focus pull); aperture: aperture (bigger = shallower); crane: [a, b] a crane move between two camera positions
    // carry: what carries this cut across ('toy' = the toy crosses the cut in mid-air; any other description works too). A reminder if missing
    let shots = [], mainToy = null;
    T.shots = (list) => { shots = list.map((s, i) => ({ fov: 30, aperture: 0.003, ...s, i })); shots.forEach((s, i) => { s.b = i < shots.length - 1 ? shots[i + 1].at : F.duration; if (i) F.cut(s.at); }); return shots; };
    const fitCam = (s, t, k) => {
      const pts = s.fit.map((p) => (p.isAnchor ? p.pos(t) : p.clone ? p.clone() : V3(...p)));
      const box = new THREE.Box3().setFromPoints(pts), c = box.getCenter(V3(0, 0, 0));
      const el = s.el ?? 1.0, az = s.az ?? 0, dir = V3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
      const fov = s.fov * (PT ? (s.pfov ?? 1.25) : 1), m = s.margin ?? 0.08;
      camera.fov = fov; camera.aspect = W / H; camera.updateProjectionMatrix();
      // Binary-search the closest distance at which every point is in frame (margin on all four sides; portrait also leaves the bottom 20% for the slab-covered area)
      let lo = 0.5, hi = 200;
      const aim = (d, cc) => { camera.position.copy(cc).addScaledVector(dir, d); camera.lookAt(cc); camera.updateMatrixWorld(); };
      const inside = (p, mm = m) => { const q = p.clone().project(camera); return q.z < 1 && Math.abs(q.x) <= 1 - 2 * mm && q.y <= 1 - 2 * mm && q.y >= -1 + 2 * (PT ? 0.2 + mm : mm); };
      const fits = (d) => { aim(d, c); return pts.every((p) => inside(p)); };
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
      const d = hi * (1 - (s.push ?? 0.06) * k);
      // avoid: points this shot must not show (e.g. a corner of the title band in portrait) — slide the framing towards the camera until they leave the frame while the fit points stay in
      if (s.avoid) {
        const av = s.avoid.map((p) => (p.isAnchor ? p.pos(t) : p.clone ? p.clone() : V3(...p))), dn = V3(dir.x, 0, dir.z); if (dn.lengthSq() < 1e-6) dn.set(0, 0, 1); dn.normalize();
        // Binary-search the smallest slide (continuous: during a slow push-in the framing changes continuously instead of jumping a step per frame)
        const out = (sh) => { aim(d, c.clone().addScaledVector(dn, sh)); return av.every((p) => !inside(p, 0)); };
        if (!out(0)) { let a0 = 0, b0 = 8; if (out(b0)) { for (let i = 0; i < 30; i++) { const mid = (a0 + b0) / 2; if (out(mid)) b0 = mid; else a0 = mid; } c.addScaledVector(dn, b0); } }
      }
      return { pos: c.clone().addScaledVector(dir, d), look: c };
    };
    const place = (t) => {
      const s = shots.find((x) => t < x.b) || shots[shots.length - 1];
      if (!s) return null;
      const k = s.crane ? E.cubicInOut(seg(t, s.crane[0], s.crane[1])) : E.sine((t - s.at) / Math.max(0.01, s.b - s.at));
      let pos, look;
      const SP = PT && s.p ? { ...s, ...s.p } : s;
      if (SP.fit) ({ pos, look } = fitCam(SP, t, k));
      else {
        const pp = (a) => (a.isAnchor ? a.pos(t) : a.clone ? a.clone() : V3(...a));
        pos = pp(SP.pos[0]).lerp(pp(SP.pos[1] ?? SP.pos[0]), k); look = pp(SP.look[0]).lerp(pp(SP.look[1] ?? SP.look[0]), k);
        if (PT && !s.p) { const v = pos.clone().sub(look), d = v.length(), el = Math.asin(v.y / d), az = Math.atan2(v.x, v.z), wide = pos.y > 2.5; const el2 = wide ? Math.min(el + 0.25, 1.3) : el + 0.1, d2 = d * (wide ? 1.8 : 1.35); pos = look.clone().add(V3(Math.cos(el2) * Math.sin(az), Math.sin(el2), Math.cos(el2) * Math.cos(az)).multiplyScalar(d2)); }
        camera.fov = SP.fov * (PT ? (SP.pfov ?? 1.25) : 1);
      }
      camera.updateProjectionMatrix(); camera.position.copy(pos); camera.lookAt(look); camera.updateMatrixWorld();
      key.position.set(look.x - 5, 12, look.z + 8); key.target.position.copy(look); Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 }); key.shadow.camera.updateProjectionMatrix();
      rim.position.set(look.x + 4, 3, look.z - 9); rim.target.position.copy(look);
      // Focus: set straight on the cut (no slow pull inside the new shot), then follow the target; [[time, target]…] is a focus pull (0.35 s)
      const tgt = (f) => (f === 'toy' || f === undefined ? (mainToy && mainToy.toy.root.visible ? mainToy.toy.root.position.clone() : look.clone()) : f.isAnchor ? f.pos(t) : f.clone ? f.clone() : V3(...f));
      let fp;
      if (Array.isArray(s.focus) && Array.isArray(s.focus[0])) { fp = tgt(s.focus[0][1]); for (let i = 1; i < s.focus.length; i++) fp.lerp(tgt(s.focus[i][1]), E.sine(seg(t, s.focus[i][0], s.focus[i][0] + 0.35))); }
      else fp = tgt(s.focus);
      bokeh.uniforms.focus.value = camera.position.distanceTo(fp); bokeh.uniforms.aperture.value = s.aperture;
      return s;
    };
    T.camera = camera;

    // ---------- Every frame ----------
    const update = (t) => {
      for (const s of slabs) if (s.motion) { const m = s.motion(t) || {}; if (m.x !== undefined) s.group.position.x = m.x; if (m.y !== undefined) s.group.position.y = m.y; if (m.z !== undefined) s.group.position.z = m.z; if (m.ry !== undefined) s.group.rotation.y = m.ry; }
      scene.updateMatrixWorld();
      for (const fn of frameFns) fn(t);
      for (const g of glows) { const on = seg(t, g.at, g.at + 0.25) * (1 - seg(t, g.until - 0.2, g.until)); g.m.material.opacity = on * g.max; g.m.visible = on > 0.001; }
      for (const K of keys) { const up = backOut(seg(t, K.rise - 0.25, K.rise)) * (1 - seg(t, K.until - 0.2, K.until)); const pr = Math.max(0, ...K.presses.map((a) => Math.sin(Math.PI * seg(t, a - 0.04, a + 0.22)))); K.m.visible = up > 0.001; K.m.position.y = -K.h + K.h * 1.5 * up - K.h * 0.45 * pr; K.top.emissiveIntensity = 0.4 + 0.5 * pr; if (K.hole) K.hole.visible = up > 0.6; }
      for (const L of labels) { const on = (L.fade ? seg(t, L.at - L.fade, L.at) : t >= L.at ? 1 : 0) * (1 - seg(t, L.until - 0.25, L.until)); L.m.material.opacity = on; L.m.visible = on > 0.001; }
      for (const r of capRows) for (const c of r.caps) {
        const up = backOut(seg(t, c.a, c.a + 0.22)) * (1 - E.sine(seg(t, r.until - 0.2, r.until))), h = c.h;   // RoundedBoxGeometry's parameters.height is not the real height
        c.m.visible = t >= c.a && t < r.until; c.m.position.y = r.y - h + (h + 0.02) * up;
        if (typeof c.k === 'function') { const f2 = r.face(String(c.k(t))); if (c.top.map !== f2) { c.top.map = c.top.emissiveMap = f2; c.top.needsUpdate = true; if (c.gl) c.gl.material.map = r.glyph(String(c.k(t))); } }
        if (c.gl) { c.gl.position.set(c.m.position.x, c.m.position.y + h / 2 + 0.004, c.m.position.z); const on = seg(t, c.a + 0.15, c.a + 0.45); c.gl.material.opacity = on * c.m.visible; c.gl.visible = on > 0.001 && c.m.visible; }
      }
      for (const M of mascots) {
        const toy = M.toy, R = toy.root; M.r = toy.upright ? toy.height / 2 : toy.radius;
        const st = solve(M, t), born = seg(t, M.born, M.born + 0.35), grow = Math.max(0.02, M.from === 'pop' ? backOut(born) : 1);
        R.visible = t >= M.born;
        let p = st.p.clone();
        if (M.from === 'drop' && t < M.born + 0.45) { const q = seg(t, M.born, M.born + 0.45); p.y += 3 * (1 - q * q); }
        const since = st.land ? t - st.land.b : t - M.born - 0.35;
        const squash = st.air ? 1 + 0.12 * Math.sin(Math.PI * st.air.q) : 1 - (st.land?.kf ? 0.28 : 0.2) * Math.exp(-Math.max(0, since) * 8) * Math.cos(Math.max(0, since) * 20);
        R.position.copy(p).add(V3(0, toy.base * grow * squash, 0));
        R.scale.set(grow / Math.sqrt(squash), grow * squash, grow / Math.sqrt(squash));
        const spin = st.air && st.air.m.spin ? 2 * Math.PI * st.air.m.spin * E.sine(st.air.q) : 0;
        toy.inner.rotation.set(toy.upright ? 0 : toy.inner.rotation.x, spin, toy.upright ? -st.rollAng : 0);
        const burst = st.land && st.land.kf ? Math.sin(Math.PI * seg(t, st.land.b, st.land.b + 0.35)) : 0;
        toy.pieces.forEach((m) => m.position.copy(m.userData.dir).multiplyScalar(toy.radius * 0.2 * burst));
        M.pose?.(t, toy, st);
      }
      // Carried things can be attached to a slab (a key cut out with s.key, a card on the slab) — convert coordinates through its parent; once set down, height goes back to the thing itself (keys rise and sink as usual)
      for (const c of carries) {
        const R = c.M.toy.root, on = t >= c.a && t < c.b; let w = null, keepY = false;
        if (t >= c.b) { w = c.drop.pos(t); keepY = true; } else if (on) w = R.position.clone().add(V3(0, c.M.toy.height * R.scale.y + c.lift, 0));
        if (!w) continue;
        const loc = c.obj.parent && c.obj.parent !== scene ? c.obj.parent.worldToLocal(w.clone()) : w;
        c.obj.position.x = loc.x; c.obj.position.z = loc.z; if (!keepY) c.obj.position.y = loc.y;
      }
      const s = place(t);
      // The toy's front faces the camera (so the mark is recognisable; with face: 'path' it faces the direction of travel)
      for (const M of mascots) { const R = M.toy.root; if (M.face === 'camera') R.rotation.y = Math.atan2(camera.position.x - R.position.x, camera.position.z - R.position.z) + M.yaw; }
      for (const fn of lateFns) fn(t);
      return s;
    };
    T.onLate = (fn) => lateFns.push(fn);
    T.mainToy = (M) => { mainToy = M; };
    T.run = () => { if (!mainToy && mascots.length) mainToy = mascots[0]; F.add((t) => { update(t); composer.render(); }); };
    T.update = update;

    // ---------- Checks (printed in --check) ----------
    F.addLint(() => {
      const out = [], add = (level, t, what, msg) => out.push({ level, t: r2(t), src: '', what, msg });
      const nv = (v, c) => { const q = v.clone().project(c); return { x: (q.x + 1) / 2 * W, y: (1 - q.y) / 2 * H, z: q.z }; };
      // ① Text printed in 3D: legible (projected character height ≥ 24px@1080, squash ≥ 0.6), not cut off by the frame edge, key text not inside the portrait safe zone
      const minPx = F.px(24), reported = new Map();
      const projIn = (L) => { const cs = L.corners().map((v) => nv(v, camera)); return cs.every((q) => q.z < 1 && q.x >= 0 && q.x <= W && q.y >= 0 && q.y <= H); };
      for (const L of labels) {
        if (L.read === false) { L._read = []; continue; }
        if (L.read) { L._read = L.read; continue; }
        L._read = [];
        for (const s of shots) { const t0 = Math.max(s.at, L.at) + 0.3; if (t0 >= s.b || t0 > L.until) continue; update(t0); if (L.m.visible && projIn(L)) L._read.push([Math.max(s.at, L.at), Math.min(s.b, Math.max(s.at, L.at) + 2)]); }
      }
      for (let t = 0.25; t < F.duration; t += 0.25) {
        update(t);
        for (const L of labels) {
          if (t < L.at + 0.3 || t > L.until - 0.3 || !L.m.visible || L.m.material.opacity < 0.6) continue;
          const cs = L.corners().map((v) => nv(v, camera)); if (cs.some((q) => q.z > 1)) continue;
          const inX = (q) => q.x >= 0 && q.x <= W, inY = (q) => q.y >= 0 && q.y <= H, inside = cs.filter((q) => inX(q) && inY(q)).length;
          if (inside === 0) continue;
          const sh = shots.findIndex((x) => t >= x.at && t < x.b), tag = (k) => { const id = L.text + k + ':' + sh; if (!reported.has(id)) { reported.set(id, t); return true; } return false; };   // reported once per shot
          const [top, bot, lef, rig] = L.emBox().map((v) => nv(v, camera)), hgt = Math.hypot(top.x - bot.x, top.y - bot.y), wid = Math.hypot(lef.x - rig.x, lef.y - rig.y);
          if (inside < 4 && hgt >= minPx * 0.75 && tag('cut')) add('warn', t, '3D 字被切', `"${String(L.text).slice(0, 24)}" 一部分在画面外（镜头装不下这行字）：调机位（fit 里加上这行字的两端），或者这一镜让它整行出画`);
          const reading = L._read.some(([a, b]) => t >= a && t <= b);
          if (reading && inside === 4 && hgt < minPx && tag('small')) add('warn', t, '3D 字读不清', `"${String(L.text).slice(0, 24)}" 投影后一个字只有 ${Math.round(hgt / F.px(1))}px 高（1080p 下至少 24px）：字印大一点，或者这一镜离它近一点 / 正一点`);
          else if (reading && inside === 4 && wid > 0 && hgt / wid < 0.6 && tag('squash')) add('warn', t, '3D 字读不清', `"${String(L.text).slice(0, 24)}" 被透视压扁了（高 / 宽 = ${(hgt / wid).toFixed(2)} < 0.6）：俯角太低，镜头抬高一点、正对着这行字`);
          if (PT && L.key && inside === 4 && cs.some((q) => q.y < H * 0.08 || q.y > H * 0.8) && tag('safe')) add('warn', t, '竖屏安全区', `"${String(L.text).slice(0, 24)}" 在画面顶部 8% 或底部 20% 以内，会被平台的界面挡住`);
        }
      }
      // ①b Toy stopped in mid-air (M.set to a high spot not followed at once by a hop): hanging still in frame looks fake
      const hung = new Set();
      for (let t = 0.25; t < F.duration; t += 0.25) for (const M of mascots) {
        update(t); const R = M.toy.root, st = solve(M, t); if (!R.visible || st.air || st.p.y < 0.35) continue;
        const st2 = solve(M, t + 0.25); if (st2.air || st2.p.distanceTo(st.p) > 0.01) continue;   // still in place 0.25 s later and not hopping: only then does it count as stopped
        const q = R.position.clone().project(camera); if (q.z > 1 || Math.abs(q.x) > 1.15 || Math.abs(q.y) > 1.15) continue;
        const sh = shots.findIndex((x) => t >= x.at && t < x.b); if (hung.has(sh)) continue; hung.add(sh);
        add('warn', t, '玩具', `${r2(t)}s 玩具停在半空不动（高 ${st.p.y.toFixed(2)}）：M.set 到高处以后马上接一个跳（同一时刻开始），切过来时它就在往下掉`);
      }
      // ② Camera: shot lengths too even (coefficient of variation < 0.25 feels like a metronome), cutting back and forth between sides, hard cuts without carry
      if (shots.length >= 4) {
        const ls = shots.map((s) => s.b - s.at), mu = ls.reduce((a, b) => a + b, 0) / ls.length, cv = Math.sqrt(ls.reduce((a, b) => a + (b - mu) ** 2, 0) / ls.length) / mu;
        if (cv < 0.25) add('warn', 0, '节奏', `镜头长度太平均（变异系数 ${cv.toFixed(2)} < 0.25，最短 ${Math.min(...ls).toFixed(1)}s、最长 ${Math.max(...ls).toFixed(1)}s）：像节拍器——有的镜头一拍就切，有的停住多看一会儿`);
      }
      let prevSide = 0;
      shots.forEach((s, i) => {
        update(s.at + 0.02); const look = new THREE.Vector3(); camera.getWorldDirection(look); const side = Math.sign(-look.x * 1) * (Math.abs(look.x) > 0.35 ? 1 : 0);
        if (i >= 2 && side && prevSide && side !== prevSide && shots[i - 2]._side === side) add('warn', s.at, '镜头', `${r2(s.at)}s：连续几个镜头左右来回换边（画面里的方向每切一次就反一次）：一段里镜头保持在同一边，换边的那一刀要有理由`);
        s._side = side; prevSide = side;
        if (i > 0 && !s.carry) { const burst = shots.filter((x) => Math.abs(x.at - s.at) <= 0.75).length >= 3; if (!burst) add('warn', s.at, '衔接', `${r2(s.at)}s 的硬切没写 carry：每一刀都要有东西接过来（玩具在半空中跨过切点 carry: 'toy'、同一个东西从远景切到近景……），写在镜头表里`); }
      });
      // ③ Sum self-check: keycaps like "a × b = c" are worked out
      const num = (s0) => Number(String(s0).replace(/,/g, ''));
      for (const r of capRows) {
        if (!r.check) continue; const m = /^(-?[\d,.]+)\s*([+\-−×x*÷/])\s*(-?[\d,.]+)\s*=\s*(-?[\d,.]+)$/.exec(r.text.replace(/\s+/g, ''));
        if (!m) continue; const a = num(m[1]), b = num(m[3]), c = num(m[4]), op = m[2], v = op === '+' ? a + b : '−-'.includes(op) ? a - b : '×x*'.includes(op) ? a * b : a / b;
        if (Math.abs(v - c) > 1e-9 * Math.max(1, Math.abs(v))) add('error', r.at, '算式', `键帽上的 "${r.text}" 算错了（应该是 ${v}）`);
      }
      update(0);
      return out;
    });
    T.update(0);
    return T;
  };
})();
