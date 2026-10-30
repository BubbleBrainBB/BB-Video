// parable.js: 3D stick-figure parable (3D 火柴人寓言), one of bb-video's visual styles (style notes in styles/parable/STYLE.md). Load after promo.js; the page needs a three import map (the starter page has one).
// A wordless contrast told by thick white stick figures in a black void on a glossy floor: one fixed wide camera, the figures and their props mirrored in
// the floor with soft contact shadows, a small monospace caps label over each figure, one prop set that grows over time (bricks, steps, a pile, coins)
// and one red object that carries the meaning. No cuts and no camera moves: the story is the contrast between what the figures do.
//
//   const P = await PROMO.parable(F, { palette, accent, reflect, bloom, box, labelFont })
//   cast    const a = P.figure('a', { x, z, face: 'right' | 'left' | 'camera' | 'back' | radians, label, scale })
//   body    a.pose(at, 'stand' | 'crouch' | 'kneel' | 'kneel2' | 'sitFloor' | 'slump' | 'cheer' | 'think' | 'cross' | 'point' | 'wipe' | 'shrug' | { …fields }, { dur, x, z, face, base })
//           a.walk(at, to, { speed, face })   a.turn(at, face)   a.climb(at, onto)   a.sit(at, on)   a.lie(at, { on })   a.fall(at)   a.jump(at, to)   a.celebrate(at, until)
//           a.lay(stack, { from, to, stance: 'behind' | 'front', tend, reach, carryTime })   hands bring each brick to its slot at the stack's own times
//   upper   a.look(at, target | 'up' | 'down' | 'camera' | other figure, { until })   a.inspect(at, until, { on, tool })   a.tend(at, until, { on })   a.hold(item, at, until, { hand })   a.free(at)
//   props   P.wall / P.steps / P.pile / P.coins ({ x, z, …, times | count })  → S.slot(i) / S.top(t) / S.countAt(t)    P.item('brick' | 'level' | 'coin' | 'box' | 'flag', { accent })
//   words   P.label(fig, text, { at, follow })   P.tag(anchor, { text, at })   P.counter({ at, until, value, fmt })   P.title(text, at, until, { sub })   P.caption(text, at, until)
//   frame   P.fade(at, dur)   P.cover(t)   P.onFrame(fn); finally P.run()
//   checks  in --check: limbs that snap, hard starts, frozen figures, figures in the floor or floating, labels cut / on a head, loops that repeat exactly,
//           the parable's shape (one red symbol, 15–45 s, few words). Spans where a figure visibly acts count as action for the gap checks (F.live):
//           a wordless parable is judged by its acting, and a figure that only breathes is still a gap
// Sounds the runtime emits (styles/parable/sound.js): place (a brick lands), tap (a pat, a level set down), step, thud (sit / lie / land), whoosh (a jump,
//   a fall, a fast swing), tick (a counter), coin, glow (a title / tag), hit (the reveal, when asked).
(function () {
  const P0 = window.PROMO;
  const M = (P0 && P0.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P0) throw new Error(M('parable.js 要在 promo.js 之后加载', 'parable.js must load after promo.js'));
  const { E, seg, set, el } = P0;
  const r2 = (n) => Math.round(n * 100) / 100;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, q) => a + (b - a) * q;
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const smooth = (q) => { q = clamp(q); return q * q * (3 - 2 * q); };
  const inOut = (q) => E.cubicInOut(clamp(q));
  // In-out with a little anticipation and overshoot (s = how much): weights below 0 move the pose the other way first, above 1 settle past it
  const backInOut = (s) => (q) => { q = clamp(q); const c = s * 1.525; return q < 0.5 ? (Math.pow(2 * q, 2) * ((c + 1) * 2 * q - c)) / 2 : (Math.pow(2 * q - 2, 2) * ((c + 1) * (q * 2 - 2) + c) + 2) / 2; };

  // Palettes: the black void of the reference look, a dim blue night and a light gallery floor. fig = body, line = outline, brick / brick2 = two clay tones
  const PALETTES = {
    void: { bg: '#000000', fig: '#F4F4F1', line: '#0B0B0B', brick: '#D8CEBD', brick2: '#CDC1AE', block: '#D9D6CF', coin: '#E7B748', wood: '#B98A5E', accent: '#E3262B', text: '#F2F2F0', muted: '#8C8C88', reflect: 0.3 },
    night: { bg: '#05070C', fig: '#F2F4F7', line: '#0A0C12', brick: '#CFC6B8', brick2: '#C2B8A8', block: '#C9CDD6', coin: '#E9BB4E', wood: '#AF8458', accent: '#F0353A', text: '#EEF1F6', muted: '#7E8796', reflect: 0.28 },
    gallery: { bg: '#E9E7E2', fig: '#FFFFFF', line: '#1A1A1A', brick: '#CDBFA8', brick2: '#C1B39B', block: '#D2CEC6', coin: '#DDA93A', wood: '#A97C50', accent: '#D7262B', text: '#1A1A1A', muted: '#77746E', reflect: 0.22 },
  };
  // Figure proportions (metres at scale 1): a pictogram — big round head with a gap above the shoulders, thick limbs with round ends
  const DIM = { hr: 0.2, neck: 0.04, lr: 0.086, tr: 0.105, th: 0.42, sh: 0.42, ua: 0.31, fa: 0.31, tl: 0.46, sw: 0.09, hw: 0.07, fr: 0.086 };
  const STAND_U = DIM.fr + DIM.th + DIM.sh - 0.015;
  // Named poses, in the figure's own frame: [forward, up, right] metres from the point under the root on its support surface; lean = torso pitch forward (rad), nod = head forward
  const POSES = {
    stand: { hf: 0, hu: STAND_U, lean: 0.03, tilt: 0, twist: 0, nod: 0.05, hL: [0.0, 0.76, -0.17], hR: [0.02, 0.76, 0.17], fL: [0, DIM.fr, -0.09], fR: [0.02, DIM.fr, 0.09] },
    crouch: { hf: -0.1, hu: 0.5, lean: 0.55, nod: 0.2, hL: [0.38, 0.3, -0.16], hR: [0.4, 0.3, 0.16], fL: [0.1, DIM.fr, -0.12], fR: [0.14, DIM.fr, 0.12] },
    kneel: { hf: -0.04, hu: 0.56, lean: 0.2, nod: 0.15, hL: [0.12, 0.46, -0.16], hR: [0.3, 0.56, 0.12], fL: [-0.36, DIM.fr, -0.1], fR: [0.3, DIM.fr, 0.1] },
    kneel2: { hf: -0.08, hu: 0.44, lean: 0.12, nod: 0.12, hL: [0.16, 0.4, -0.15], hR: [0.16, 0.4, 0.15], fL: [-0.42, DIM.fr, -0.1], fR: [-0.42, DIM.fr, 0.1] },
    sitFloor: { hf: 0, hu: 0.1, lean: -0.1, nod: 0.1, hL: [-0.22, 0.07, -0.22], hR: [-0.22, 0.07, 0.22], fL: [0.6, DIM.fr, -0.13], fR: [0.62, DIM.fr, 0.12] },
    sitEdge: { hf: 0, hu: 0.1, lean: -0.04, nod: 0.08, hL: [0.02, 0.05, -0.25], hR: [0.02, 0.05, 0.25], fL: [0.3, -0.5, -0.11], fR: [0.32, -0.52, 0.11] },
    lie: { hf: 0, hu: 0.1, lean: -1.5, nod: -0.25, hL: [-0.8, 0.3, -0.32], hR: [-0.8, 0.3, 0.32], fL: [0.8, DIM.fr, -0.1], fR: [0.42, DIM.fr, 0.12] },
    slump: { hf: 0, hu: 0.86, lean: 0.42, nod: 0.6, hL: [0.18, 0.6, -0.14], hR: [0.2, 0.6, 0.14], fL: [0, DIM.fr, -0.09], fR: [0.02, DIM.fr, 0.09] },
    cheer: { hf: 0, hu: 0.9, lean: -0.08, nod: -0.2, hL: [0.05, 2.0, -0.34], hR: [0.05, 2.0, 0.34], fL: [0, DIM.fr, -0.12], fR: [0.02, DIM.fr, 0.12] },
    think: { hf: 0, hu: STAND_U, lean: 0.06, nod: 0.2, hL: [0.1, 1.0, 0.02], hR: [0.16, 1.45, 0.04], fL: [0, DIM.fr, -0.09], fR: [0.02, DIM.fr, 0.09] },
    cross: { hf: 0, hu: STAND_U, lean: -0.02, nod: 0, hL: [0.2, 1.06, 0.06], hR: [0.2, 1.1, -0.06], fL: [0, DIM.fr, -0.11], fR: [0.02, DIM.fr, 0.11] },
    point: { hf: 0, hu: STAND_U, lean: 0.02, nod: 0, hL: [0.0, 0.76, -0.17], hR: [0.62, 1.36, 0.16], fL: [0, DIM.fr, -0.09], fR: [0.06, DIM.fr, 0.11] },
    wipe: { hf: 0, hu: 0.88, lean: 0.1, nod: 0.25, hL: [0.02, 0.74, -0.17], hR: [0.16, 1.56, -0.04], fL: [0, DIM.fr, -0.1], fR: [0.02, DIM.fr, 0.1] },
    shrug: { hf: 0, hu: STAND_U, lean: -0.02, nod: -0.1, hL: [0.22, 1.12, -0.38], hR: [0.22, 1.12, 0.38], fL: [0, DIM.fr, -0.1], fR: [0.02, DIM.fr, 0.1] },
  };
  const UPPER = ['hL', 'hR', 'lean', 'tilt', 'twist', 'nod', 'lookW', 'look'];
  const FACES = { right: 0, camera: Math.PI / 2, left: Math.PI, back: -Math.PI / 2 };
  const faceOf = (f, cur = 0) => (typeof f === 'number' ? f : f in FACES ? FACES[f] : cur);
  const angLerp = (a, b, q) => { let d = ((b - a + Math.PI) % (2 * Math.PI)); if (d < 0) d += 2 * Math.PI; return a + (d - Math.PI) * q; };
  const fill = (o) => ({ x: 0, z: 0, yaw: 0, base: 0, hf: 0, hu: STAND_U, lean: 0, tilt: 0, twist: 0, nod: 0, lookW: 0, look: null, ...o, hL: [...(o.hL || POSES.stand.hL)], hR: [...(o.hR || POSES.stand.hR)], fL: [...(o.fL || POSES.stand.fL)], fR: [...(o.fR || POSES.stand.fR)] });

  P0.parable = async function (F, opt = {}) {
    const THREE = await import('three');
    const imp = (p) => import(`three/addons/${p}`);
    const [{ RoundedBoxGeometry }, { EffectComposer }, { Pass }, { OutputPass }, { UnrealBloomPass }] = await Promise.all([
      imp('geometries/RoundedBoxGeometry.js'), imp('postprocessing/EffectComposer.js'), imp('postprocessing/Pass.js'), imp('postprocessing/OutputPass.js'), imp('postprocessing/UnrealBloomPass.js')]);
    const W0 = F.W, H0 = F.H, PT = F.portrait, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const PAL = { ...(PALETTES[typeof opt.palette === 'string' ? opt.palette : 'void'] || PALETTES.void), ...(typeof opt.palette === 'object' ? opt.palette : {}) };
    if (opt.accent) PAL.accent = opt.accent;
    const col = (c) => (c && PAL[c] !== undefined ? PAL[c] : c);
    const P = { THREE, V3, PAL, col, figures: [], stacks: [], items: [] };
    const frameFns = [];
    P.onFrame = (fn) => frameFns.push(fn);
    F.stage.style.background = PAL.bg;

    // ---------- Renderer: the scene drawn twice per frame — once mirrored under the floor (fading with depth), then as it is ----------
    const canvas = el('canvas', `left:0;top:0;width:${W0}px;height:${H0}px`, F.layer('', 1));
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(W0, H0, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = opt.exposure ?? 1.0;
    const scene = new THREE.Scene(), root = new THREE.Group(); scene.add(root);
    scene.background = null;
    // Lights live in root, so the mirrored copy is lit from the mirrored side (the reflection's tops stay lit)
    const hemi = new THREE.HemisphereLight('#FFFFFF', '#4A4A4A', opt.ambient ?? 1.2); root.add(hemi);
    const key = new THREE.DirectionalLight('#FFFFFF', opt.key ?? 2.0); key.position.set(-3, 7, 6); root.add(key, key.target);
    const rim = new THREE.DirectionalLight('#FFFFFF', 0.9); rim.position.set(2.5, 4, -6); root.add(rim, rim.target);
    const camera = new THREE.PerspectiveCamera(opt.fov ?? 24, W0 / H0, 0.1, 200);
    Object.assign(P, { scene, root, camera, renderer });
    // Every material learns the mirror pass: uMir = 1 while drawing the reflection, which darkens with depth below the floor (uFall metres)
    const MIR = { uMir: { value: 0 }, uRefl: { value: opt.reflect ?? PAL.reflect }, uFall: { value: opt.fall ?? 0.5 } };
    const mirrorable = (m) => {
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, MIR);
        sh.vertexShader = 'varying float vWY;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vWY = (modelMatrix * vec4(transformed, 1.0)).y;');
        sh.fragmentShader = 'uniform float uMir;\nuniform float uRefl;\nuniform float uFall;\nvarying float vWY;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  if (uMir > 0.5) { gl_FragColor.rgb *= uRefl * exp(-max(0.0, -vWY) / uFall); }');
      };
      return m;
    };
    const MATS = new Map();
    const mat = (color, o = {}) => {
      const k = `${col(color)}|${o.rough ?? ''}|${o.metal ?? ''}|${o.ei ?? ''}|${o.opacity ?? ''}|${o.back ? 1 : 0}|${o.basic ? 1 : 0}`;
      if (MATS.has(k) && !o.unique) return MATS.get(k);
      const base = { color: col(color), ...(o.opacity !== undefined ? { transparent: true, opacity: o.opacity, depthWrite: false } : {}), ...(o.back ? { side: THREE.BackSide } : {}) };
      const m = mirrorable(o.basic || o.back ? new THREE.MeshBasicMaterial(base) : new THREE.MeshStandardMaterial({ ...base, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0, emissive: col(color), emissiveIntensity: o.ei ?? 0 }));
      if (!o.unique) MATS.set(k, m);
      return m;
    };
    P.mat = mat;
    const mainOnly = [];   // drawn in the upright pass only (contact shadows)
    class MirrorPass extends Pass {
      constructor() { super(); this.needsSwap = false; }
      render(r, wb, rb) {
        const ac = r.autoClear; r.autoClear = false;
        r.setRenderTarget(this.renderToScreen ? null : rb); r.setClearColor(PAL.bg, 1); r.clear();
        root.scale.y = -1; MIR.uMir.value = 1; for (const m of mainOnly) m.visible = false;
        r.render(scene, camera);
        r.clearDepth(); root.scale.y = 1; MIR.uMir.value = 0; for (const m of mainOnly) m.visible = m.userData.on !== false;
        r.render(scene, camera);
        r.autoClear = ac;
      }
    }
    const rt = new THREE.WebGLRenderTarget(W0, H0, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W0, H0);
    composer.addPass(new MirrorPass());
    if (opt.bloom !== false) { const b = typeof opt.bloom === 'object' ? opt.bloom : {}; composer.addPass(new UnrealBloomPass(new THREE.Vector2(W0, H0), b.strength ?? 0.32, b.radius ?? 0.55, b.threshold ?? 0.82)); }
    composer.addPass(new OutputPass());

    // ---------- Geometry ----------
    const GC = new Map(), gget = (k, mk) => { if (!GC.has(k)) GC.set(k, mk()); return GC.get(k); };
    const q3 = (n) => Math.round(n * 1000) / 1000;
    const geoBox = (w, h, d, r) => gget(`b${q3(w)},${q3(h)},${q3(d)},${q3(r)}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, Math.min(w, h, d) / 2 - 1e-3)));
    const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 22, 1, true), unitSph = new THREE.SphereGeometry(1, 28, 18);
    const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t; })();
    // A soft contact shadow on a surface (y): a blurred dark ellipse, drawn in the upright pass only
    const blob = (w, d, strength = 0.75) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: strength, depthWrite: false, color: '#000' })); m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); m.renderOrder = 1; root.add(m); mainOnly.push(m); return m; };
    P.blob = blob;

    // ---------- Figures ----------
    const OUT = opt.outline ?? 0.03;
    const figMat = () => mat(PAL.fig, { rough: 0.9, ei: 0.42 }), lineMat = () => mat(PAL.line, { back: true });
    const limb = (g) => {
      const parts = [new THREE.Mesh(unitCyl, figMat()), new THREE.Mesh(unitSph, figMat()), new THREE.Mesh(unitSph, figMat())];
      const lines = [new THREE.Mesh(unitCyl, lineMat()), new THREE.Mesh(unitSph, lineMat()), new THREE.Mesh(unitSph, lineMat())];
      for (const m of [...parts, ...lines]) g.add(m);
      const Y = V3(0, 1, 0), dir = V3(0, 0, 0);
      return (A, B, r) => {
        dir.subVectors(B, A); const len = Math.max(1e-4, dir.length()); dir.multiplyScalar(1 / len);
        for (const [L, rr] of [[parts, r], [lines, r + OUT]]) {
          L[0].position.addVectors(A, B).multiplyScalar(0.5); L[0].quaternion.setFromUnitVectors(Y, dir); L[0].scale.set(rr, len, rr);
          L[1].position.copy(A); L[1].scale.setScalar(rr); L[2].position.copy(B); L[2].scale.setScalar(rr);
        }
      };
    };
    // Two-bone IK: from root joint A towards target T with lengths a, b; pole = the side the middle joint bends to
    //   pole2: a second bend direction blended in as the reach lines up with the first, so the middle joint never flips (one fixed pole always has a direction it lines up with)
    const ik = (A, T, a, b, pole, pole2) => {
      const d = V3().subVectors(T, A); let L = d.length(); const dir = d.clone().multiplyScalar(1 / Math.max(L, 1e-6));
      // soft reach: near full extension the reach eases in towards its maximum instead of hitting it (the elbow's offset is a square root that pops at full stretch)
      const Lm = a + b, sk = 0.14 * Lm; if (L > Lm - sk) L = Lm - sk * Math.exp(-(L - (Lm - sk)) / sk);
      L = clamp(L, Math.abs(a - b) + 1e-3, Lm - 1e-4);
      const x = (a * a - b * b + L * L) / (2 * L), h = Math.sqrt(Math.max(0, a * a - x * x));
      const p = pole.clone().normalize(); p.addScaledVector(dir, -p.dot(dir));
      if (pole2) { const p2 = pole2.clone().normalize(); p2.addScaledVector(dir, -p2.dot(dir)); p.addScaledVector(p2, 1 - smooth((p.length() - 0.15) / 0.5)); }
      if (p.lengthSq() < 1e-8) p.set(0, 1, 0).addScaledVector(dir, -dir.y); p.normalize();
      const mid = A.clone().addScaledVector(dir, x).addScaledVector(p, h), end = A.clone().addScaledVector(dir, L);
      return [mid, end];
    };

    const figures = P.figures;
    P.figure = (name, o = {}) => {
      const k = o.scale ?? 1, g = new THREE.Group(); root.add(g);
      const fg = { name, k, g, o, label: null, body: [], upper: [], idle: o.idle ?? 1, seed: figures.length * 7.3 + 1.1, show: [[-1e9, 1e9]] };
      const start = fill({ ...POSES.stand, x: o.x ?? 0, z: o.z ?? 0, yaw: faceOf(o.face ?? 'right'), base: o.base ?? 0 });
      fg.start = start;
      const L = { torso: limb(g), thL: limb(g), shL: limb(g), thR: limb(g), shR: limb(g), uaL: limb(g), faL: limb(g), uaR: limb(g), faR: limb(g) };
      const head = new THREE.Mesh(unitSph, figMat()), headLine = new THREE.Mesh(unitSph, lineMat()); g.add(head, headLine);
      const shadow = blob(0.9, 0.45, 0.8);
      // ----- tracks: each action is a segment { a, fn(t) → pose, blend, overlap, antic }; a new segment cross-fades from the one before it, part by part -----
      const endPose = (track) => (track.length ? track[track.length - 1].fn(1e9) : start);
      fg.state = () => endPose(fg.body);
      const push = (track, sg) => {
        const last = track[track.length - 1];
        if (last && sg.a < last.a - 1e-6) console.warn(M(`parable：${name} 的动作要按时间顺序写（${r2(sg.a)}s 写在了 ${r2(last.a)}s 之后）`, `parable: write ${name}'s actions in time order (${r2(sg.a)}s comes after ${r2(last.a)}s)`));
        track.push({ blend: 0.45, overlap: 1, antic: 1, ...sg }); track.sort((p, q) => p.a - q.a); return sg;
      };
      // Per-part weights: the hips lead, the torso follows, then the arms, then the head (overlapping action); hips and torso dip the other way first and settle past (anticipation, follow-through)
      const W8 = (sg, t) => {
        const q = (d) => clamp((t - sg.a - d * sg.overlap) / sg.blend);
        const s = 0.7 * sg.antic;
        return { root: inOut(q(0)), hip: backInOut(s)(q(0)), feet: inOut(q(0)), torso: backInOut(0.6 * sg.antic)(q(0.05)), arms: backInOut(0.35 * sg.antic)(q(0.09)), head: backInOut(0.5 * sg.antic)(q(0.13)) };
      };
      const mix = (A, B, w) => {
        const o2 = { ...B };
        o2.x = lerp(A.x, B.x, w.root); o2.z = lerp(A.z, B.z, w.root); o2.yaw = angLerp(A.yaw, B.yaw, w.root); o2.base = lerp(A.base, B.base, w.root);
        o2.hf = lerp(A.hf, B.hf, w.hip); o2.hu = lerp(A.hu, B.hu, w.hip);
        for (const f of ['lean', 'tilt', 'twist']) o2[f] = lerp(A[f], B[f], w.torso);
        o2.nod = lerp(A.nod, B.nod, w.head);
        o2.lookW = lerp(A.lookW || 0, B.lookW || 0, clamp(w.head));
        o2.look = B.look && A.look ? B.look.map((v, i) => lerp(A.look[i], v, clamp(w.head))) : (B.look || A.look);
        for (const f of ['fL', 'fR']) o2[f] = B[f].map((v, i) => lerp(A[f][i], v, w.feet));
        for (const f of ['hL', 'hR']) o2[f] = B[f].map((v, i) => lerp(A[f][i], v, w.arms));
        return o2;
      };
      // a segment still blending in starts from wherever the one before it actually is (itself possibly still blending): no jumps when moves overlap
      const inBlend = (sg, t) => t < sg.a + sg.blend + 0.13 * sg.overlap * 1.01;
      const evalTrack = (track, t, base0) => {
        let i = -1; for (let j = 0; j < track.length; j++) if (track[j].a <= t) i = j; else break;
        const at = (k2, depth) => { if (k2 < 0) return base0; const sg = track[k2], cur = sg.fn(t); return depth < 6 && inBlend(sg, t) ? mix(at(k2 - 1, depth + 1), cur, W8(sg, t)) : cur; };
        return at(i, 0);
      };
      // Upper body: segments carry a weight; null = hand the upper body back to the body track
      const evalUpper = (t, body) => {
        let i = -1; for (let j = 0; j < fg.upper.length; j++) if (fg.upper[j].a <= t) i = j; else break;
        if (i < 0) return body;
        const pick = (s2) => (s2 && s2.fn ? { ...body, ...s2.fn(t, body) } : body);
        const at = (k2, depth) => { if (k2 < 0) return body; const sg = fg.upper[k2], cur = pick(sg); return depth < 6 && t < sg.a + sg.blend + 0.2 ? mix(at(k2 - 1, depth + 1), cur, { ...W8(sg, t), root: 1, hip: 1, feet: 1 }) : cur; };
        return at(i, 0);
      };
      const SP = Math.PI * 2;
      fg.poseBody = (t) => evalTrack(fg.body, t, start);   // the body alone (what another figure looks at: no look-at loops)
      fg.poseAt = (t) => {
        let p = evalTrack(fg.body, t, start);
        p = evalUpper(t, p);
        // breathing and a slow sway: alive while holding still (it never counts as action in the checks)
        const br = fg.idle * Math.sin(SP * (t / 3.4) + fg.seed), sw = fg.idle * Math.sin(SP * (t / 5.3) + fg.seed * 2);
        return { ...p, hu: p.hu + 0.006 * br, lean: p.lean + 0.012 * br + 0.006 * sw, nod: p.nod + 0.02 * sw, tilt: p.tilt + 0.01 * sw };
      };
      // ----- joints in the world -----
      const basis = (p) => { const f = V3(Math.cos(p.yaw), 0, Math.sin(p.yaw)), s = V3(-Math.sin(p.yaw), 0, Math.cos(p.yaw)); return { f, s, u: V3(0, 1, 0) }; };
      const toW = (p, B, v) => V3(p.x, p.base, p.z).addScaledVector(B.f, v[0] * k).addScaledVector(B.u, v[1] * k).addScaledVector(B.s, v[2] * k);
      fg.local = (t, w) => { const p = fg.poseAt(t), B = basis(p), d = V3(w.x ?? w[0], w.y ?? w[1], w.z ?? w[2]).sub(V3(p.x, p.base, p.z)); return [d.dot(B.f) / k, d.y / k, d.dot(B.s) / k]; };
      fg.joints = (t, pose) => {
        const p = pose || fg.poseAt(t), B = basis(p);
        const pel = toW(p, B, [p.hf, p.hu, 0]);
        const front = B.f.clone().multiplyScalar(Math.cos(p.lean)).addScaledVector(B.u, -Math.sin(p.lean));
        let d = B.u.clone().multiplyScalar(Math.cos(p.lean)).addScaledVector(B.f, Math.sin(p.lean));
        d = d.multiplyScalar(Math.cos(p.tilt)).addScaledVector(B.s, Math.sin(p.tilt)).normalize();
        const chest = pel.clone().addScaledVector(d, DIM.tl * k);
        const shAx = B.s.clone().multiplyScalar(Math.cos(p.twist)).addScaledVector(B.f, Math.sin(p.twist));
        const shL = chest.clone().addScaledVector(d, -0.03 * k).addScaledVector(shAx, -DIM.sw * k), shR = chest.clone().addScaledVector(d, -0.03 * k).addScaledVector(shAx, DIM.sw * k);
        let hd = d.clone().multiplyScalar(Math.cos(p.nod)).addScaledVector(front, Math.sin(p.nod));
        if (p.look && p.lookW > 0.001) { const g2 = V3(...p.look).sub(chest).normalize(); hd = hd.multiplyScalar(1 - 0.4 * p.lookW).addScaledVector(g2, 0.4 * p.lookW).normalize(); }
        const headC = chest.clone().addScaledVector(hd, (DIM.neck + DIM.hr) * k);
        const hipL = pel.clone().addScaledVector(B.s, -DIM.hw * k), hipR = pel.clone().addScaledVector(B.s, DIM.hw * k);
        const legPole = B.f.clone().addScaledVector(B.u, 0.35);
        const [knL, ftL] = ik(hipL, toW(p, B, p.fL), DIM.th * k, DIM.sh * k, legPole.clone().addScaledVector(B.s, -0.15));
        const [knR, ftR] = ik(hipR, toW(p, B, p.fR), DIM.th * k, DIM.sh * k, legPole.clone().addScaledVector(B.s, 0.15));
        const armPole = (sd) => B.f.clone().multiplyScalar(-0.3).addScaledVector(B.u, -0.3).addScaledVector(B.s, 0.85 * sd), armPole2 = B.f.clone().multiplyScalar(-0.5).addScaledVector(B.u, -0.85);   // elbows out (and a little back / down); down-back when a reach lines up with that
        const [elL, haL] = ik(shL, toW(p, B, p.hL), DIM.ua * k, DIM.fa * k, armPole(-1), armPole2);
        const [elR, haR] = ik(shR, toW(p, B, p.hR), DIM.ua * k, DIM.fa * k, armPole(1), armPole2);
        return { p, B, pel, chest, headC, shL, shR, elL, elR, haL, haR, hipL, hipR, knL, knR, ftL, ftR };
      };
      fg.visible = (t) => fg.show.some(([a, b]) => t >= a && t < b);
      fg.draw = (t) => {
        const on = fg.visible(t); g.visible = on; shadow.userData.on = on; shadow.visible = on;
        if (!on) return;
        const J = fg.joints(t), lr = DIM.lr * k;
        L.torso(J.pel, J.chest, DIM.tr * k);
        L.thL(J.hipL, J.knL, lr); L.shL(J.knL, J.ftL, lr); L.thR(J.hipR, J.knR, lr); L.shR(J.knR, J.ftR, lr);
        L.uaL(J.shL, J.elL, lr); L.faL(J.elL, J.haL, lr); L.uaR(J.shR, J.elR, lr); L.faR(J.elR, J.haR, lr);
        head.position.copy(J.headC); head.scale.setScalar(DIM.hr * k); headLine.position.copy(J.headC); headLine.scale.setScalar(DIM.hr * k + OUT);
        // contact shadow on the support under the pelvis: wider and fainter the higher the body is above it
        const sup = J.p.base, hgt = clamp((Math.min(J.ftL.y, J.ftR.y, J.pel.y) - sup) / 0.6);
        shadow.position.set((J.ftL.x + J.ftR.x + J.pel.x) / 3, sup + 0.004, (J.ftL.z + J.ftR.z + J.pel.z) / 3);
        shadow.scale.set(0.95 * k * (1 + hgt), 0.42 * k * (1 + hgt), 1); shadow.material.opacity = 0.8 * (1 - 0.7 * hgt);
        fg._J = J;
      };
      // ----- body actions -----
      const named = (pose) => (typeof pose === 'string' ? (POSES[pose] || (console.warn(M(`parable：没有这个姿势："${pose}"`, `parable: no such pose: "${pose}"`)), POSES.stand)) : pose);
      // a.pose(at, name | fields, { dur (blend), x, z, face, base, overlap, antic })
      fg.set = (at, pose, o2 = {}) => {
        const s0 = fg.state(), pp = fill({ ...named(pose), x: o2.x ?? s0.x, z: o2.z ?? s0.z, yaw: o2.face !== undefined ? faceOf(o2.face, s0.yaw) : s0.yaw, base: o2.base ?? s0.base, ...(o2.look ? { look: o2.look, lookW: 1 } : {}) });
        push(fg.body, { a: at, fn: () => pp, blend: o2.dur ?? 0.45, overlap: o2.overlap ?? 1, antic: o2.antic ?? 1, kind: typeof pose === 'string' ? pose : 'pose' });
        if (o2.sfx) F.sfx(at + (o2.dur ?? 0.45) * 0.8, o2.sfx, 0.3);
        return fg;
      };
      fg.pose = fg.set;
      fg.turn = (at, face, o2 = {}) => fg.set(at, { ...fg.state(), hL: fg.state().hL, hR: fg.state().hR }, { dur: 0.4, ...o2, face });
      // Walk to a point: feet plant and push off (a planted foot stays still on the ground), the pelvis bobs, arms swing against the legs; eases in and out
      fg.walk = (at, to, o2 = {}) => {
        const s0 = fg.state(), tx = typeof to === 'number' ? to : to.x ?? s0.x, tz = typeof to === 'number' ? s0.z : to.z ?? s0.z;
        const dx = tx - s0.x, dz = tz - s0.z, D = Math.hypot(dx, dz);
        if (D < 0.02) return fg;
        const yaw = Math.atan2(dz, dx), v = (o2.speed ?? 1.1) * k, dur = D / v + 0.35, stride = 0.62 * k * (o2.speed ? Math.sqrt(o2.speed / 1.1) : 1);
        const endYaw = o2.face !== undefined ? faceOf(o2.face, yaw) : yaw, carry = o2.carry;
        const fn = (t) => {
          const q = clamp((t - at) / dur), s = D * E.sine(q), env = clamp(Math.min(s / (stride * 0.6), (D - s) / (stride * 0.6), 1));
          const ph = (s / (2 * stride)) * SP;
          const foot = (off) => { const u = ((((s / stride) + 0.5 + off) % 2) + 2) % 2; let f2, h; if (u < 1) { f2 = 0.5 - u; h = 0; } else { const w = (u - 1); f2 = -0.5 + E.sine(w); h = Math.sin(Math.PI * w) * 0.11; } return [f2 * stride * env / k, DIM.fr + h * env, 0]; };
          const fL = foot(0), fR = foot(1); fL[2] = -0.09; fR[2] = 0.09;
          const sw = Math.sin(ph) * 0.22 * env;
          const turnQ = clamp((t - at) / 0.35), endQ = clamp((t - (at + dur - 0.3)) / 0.3);
          return fill({ x: s0.x + Math.cos(yaw) * s, z: s0.z + Math.sin(yaw) * s, yaw: angLerp(angLerp(s0.yaw, yaw, inOut(turnQ)), endYaw, inOut(endQ)), base: s0.base,
            hf: 0.02 * env, hu: STAND_U - 0.025 * env + 0.022 * Math.abs(Math.cos(ph)) * env, lean: 0.07 + 0.05 * env, tilt: 0.02 * Math.sin(ph) * env, twist: 0.12 * Math.sin(ph) * env, nod: 0.04,
            fL, fR, hL: carry ? [0.3, 1.0, -0.13] : [sw, 0.78, -0.18], hR: carry ? [0.3, 1.0, 0.13] : [-sw, 0.78, 0.18] });
        };
        push(fg.body, { a: at, fn, blend: 0.3, kind: 'walk', dur });
        if (o2.sfx !== false) for (let s = 0.5; s < D / stride - 0.2; s += 1) { const tq = at + dur * (Math.acos(1 - 2 * clamp((s * stride) / D)) / Math.PI); F.sfx(tq, 'step', 0.16 * k); }
        return fg;
      };
      // Keyframed body moves (climb, jump, sit, lie, fall): keys [{ t (s after at), pose fields }], eased between, then held
      const keyed = (at, keys, kind, blend = 0.3) => {
        const s0 = fg.state(); let acc = { ...s0 };
        const K = keys.map((kk) => (acc = fill({ ...acc, ...named(kk.pose || {}), ...kk })));
        const ts = keys.map((kk) => kk.t);
        const fn = (t) => {
          const lt = t - at; if (lt <= ts[0]) return K[0];
          for (let i = 1; i < K.length; i++) if (lt < ts[i]) { const q = (keys[i].ease || inOut)((lt - ts[i - 1]) / (ts[i] - ts[i - 1])); const A = K[i - 1], B = K[i]; return mix(A, B, { root: q, hip: q, feet: q, torso: q, arms: q, head: q }); }
          return K[K.length - 1];
        };
        push(fg.body, { a: at, fn, blend, kind, dur: ts[ts.length - 1] });
        return at + ts[ts.length - 1];
      };
      // Climb onto a stack (or { x, z, top }) the figure is standing next to: hands on the top edge, a dip, pull up, knee on top, stand up on it
      fg.climb = (at, onto, o2 = {}) => {
        const s0 = fg.state(), top = typeof onto.top === 'function' ? onto.top(at) : onto.top ?? onto.h ?? 1, B = basis(s0);
        const tx = o2.x ?? (onto.x !== undefined ? s0.x + B.f.x * 0.45 : s0.x), tz = o2.z ?? (onto.z !== undefined && Math.abs(B.f.z) > 0.5 ? onto.z : s0.z + B.f.z * 0.45);
        const h = top - s0.base, sp = o2.speed ?? 1, T = (x) => x / sp;
        const end = keyed(at, [
          { t: 0, pose: 'stand' },
          { t: T(0.35), hu: STAND_U - 0.05, lean: 0.25, nod: 0.1, hL: [0.32, h + 0.02, -0.16], hR: [0.32, h + 0.02, 0.16] },
          { t: T(0.6), hu: STAND_U - 0.22, lean: 0.35, hL: [0.34, h + 0.02, -0.16], hR: [0.34, h + 0.02, 0.16], ease: inOut },
          { t: T(1.0), hf: 0.2, hu: h + 0.25, lean: 0.95, nod: 0.3, hL: [0.36, h + 0.02, -0.18], hR: [0.36, h + 0.02, 0.18], fL: [0.05, h * 0.3, -0.1], fR: [0.32, h + DIM.fr, 0.1], ease: E.quartOut },
          { t: T(1.35), x: tx, z: tz, base: top, hf: -0.04, hu: 0.56, lean: 0.35, nod: 0.15, hL: [0.15, 0.06, -0.18], hR: [0.18, 0.06, 0.18], fL: [-0.36, DIM.fr, -0.1], fR: [0.25, DIM.fr, 0.1] },
          { t: T(1.85), x: tx, z: tz, base: top, pose: 'stand', ease: backInOut(0.6) },
        ], 'climb', 0.25);
        [T(0.1), T(0.95), T(1.35)].forEach((d, i) => F.sfx(at + d, i === 2 ? 'thud' : 'step', 0.18));
        F.sfx(at + T(0.7), 'whoosh', 0.12);
        return end;
      };
      // Sit on the front edge of a surface (a stack's top, { x, z, top, d }), legs hanging over it, facing the camera unless told otherwise
      fg.sit = (at, on, o2 = {}) => {
        const s0 = fg.state(), top = on ? (typeof on.top === 'function' ? on.top(at) : on.top ?? 0) : s0.base;
        const face = faceOf(o2.face ?? 'camera'), edgeZ = on && on.z !== undefined ? on.z + (on.depth ?? 0.2) / 2 - 0.04 : s0.z;
        const x = o2.x ?? (on && on.x !== undefined ? on.x : s0.x);
        const ground = top < 0.3 && !on, sl = o2.slow ?? 1 + Math.abs(angLerp(0, face - s0.yaw, 1)) / Math.PI * 1.2 + (s0.lean < -0.8 ? 0.6 : 0);   // a big turn (or getting up from lying) takes longer
        const end = keyed(at, [{ t: 0 }, { t: 0.35 * sl, x, z: on ? edgeZ - 0.12 : s0.z, yaw: face, base: top, hu: 0.45, lean: 0.3, ease: inOut }, { t: 0.75 * sl, x, z: on ? edgeZ : s0.z, yaw: face, base: top, pose: ground ? 'sitFloor' : 'sitEdge', ease: backInOut(0.5) }], 'sit', 0.3);
        F.sfx(at + 0.62 * sl, 'thud', 0.22);
        // swing: legs swinging over the edge once seated (0–1; a contented wait), never quite the same twice
        if (o2.swing && !ground) { const sg = fg.body[fg.body.length - 1], f0 = sg.fn, sw = o2.swing, fq = 0.5 + 0.12 * hash(fg.seed + at);
          sg.fn = (t) => { const p = f0(t); if (t <= end) return p; const w = smooth((t - end) / 0.8) * sw * (0.75 + 0.25 * Math.sin((SP * t) / 3.7)), ph = SP * fq * (t - end);
            // forward-and-up (a knee lift reads even from straight in front), a little sideways
            const sL = Math.sin(ph), sR = Math.sin(ph + Math.PI + 0.4);
            return { ...p, fL: [p.fL[0] + 0.12 * w * sL, p.fL[1] + 0.1 * w * Math.max(0, sL), p.fL[2] - 0.03 * w * sL], fR: [p.fR[0] + 0.12 * w * sR, p.fR[1] + 0.1 * w * Math.max(0, sR), p.fR[2] + 0.03 * w * sR] }; };
          sg.loop = true; sg.vary = 1; }
        return end;
      };
      // Lie down on the current surface (or on: a stack) along the facing direction, knee up, hands behind the head — napping
      fg.lie = (at, o2 = {}) => {
        const s0 = fg.state(), top = o2.on ? (typeof o2.on.top === 'function' ? o2.on.top(at) : o2.on.top) : s0.base;
        const yaw = faceOf(o2.face ?? (Math.cos(s0.yaw) >= 0 ? 'right' : 'left'));
        const end = keyed(at, [{ t: 0 }, { t: 0.45, yaw, base: top, x: o2.x ?? s0.x, z: o2.z ?? s0.z, pose: 'sitFloor', ease: inOut }, { t: 1.05, yaw, base: top, x: o2.x ?? s0.x, z: o2.z ?? s0.z, pose: 'lie', ease: backInOut(0.4) }], 'lie', 0.35);
        F.sfx(at + 0.4, 'thud', 0.16); F.sfx(at + 1.0, 'thud', 0.1);
        return end;
      };
      // Fall over backwards (gravity: slow start, fast end, a small bounce), ending lying down
      fg.fall = (at, o2 = {}) => {
        F.sfx(at + 0.1, 'whoosh', 0.2); F.sfx(at + 0.55, 'thud', 0.4);
        return keyed(at, [{ t: 0 }, { t: 0.15, lean: 0.12, hu: STAND_U - 0.05, hL: [0.3, 1.3, -0.3], hR: [0.3, 1.3, 0.3] }, { t: 0.55, pose: 'lie', lean: -1.62, ease: E.quartIn }, { t: 0.75, pose: 'lie', lean: -1.45, ease: E.sine }, { t: 0.95, pose: 'lie', ease: E.sine }], 'fall', 0.15);
      };
      // Jump (down or across) to a point { x, z, base }: crouch, take off, arc, land soft with knees giving
      fg.jump = (at, to, o2 = {}) => {
        const s0 = fg.state(), tb = to.base ?? 0, tx = to.x ?? s0.x, tz = to.z ?? s0.z, apex = Math.max(s0.base, tb) + 0.25;
        const sl = o2.slow ?? (s0.hu < 0.35 ? 1.5 : 1), T = (x) => x * sl;   // from sitting or lying, getting the legs under the body takes longer
        F.sfx(at + T(0.25), 'whoosh', 0.18); F.sfx(at + T(0.78), 'thud', 0.35);
        return keyed(at, [{ t: 0 }, { t: T(0.22), hu: 0.62, lean: 0.4, hL: [-0.2, 0.6, -0.2], hR: [-0.2, 0.6, 0.2], ease: inOut },
          { t: T(0.5), x: (s0.x + tx) / 2, z: (s0.z + tz) / 2, base: apex, hu: STAND_U, lean: 0.05, hL: [0.3, 1.5, -0.25], hR: [0.3, 1.5, 0.25], fL: [-0.05, 0.25, -0.1], fR: [0.05, 0.2, 0.1], ease: (q) => 1 - (1 - q) * (1 - q) },   // rise and fall are quadratic: that's gravity
          { t: T(0.78), x: tx, z: tz, base: tb, hu: 0.6, lean: 0.35, hL: [0.3, 0.7, -0.22], hR: [0.3, 0.7, 0.22], fL: [0, DIM.fr, -0.12], fR: [0.04, DIM.fr, 0.12], ease: (q) => q * q },
          { t: T(1.15), x: tx, z: tz, base: tb, pose: 'stand', ease: backInOut(0.5) }], 'jump', 0.2);
      };
      // Celebrate: arms thrown up, small hops (seeded, never two the same)
      fg.celebrate = (at, until, o2 = {}) => {
        const s0 = fg.state(), n = Math.max(1, Math.round((until - at) / 0.55));
        const fn = (t) => { const lt = t - at, i = Math.floor(lt / 0.55), q = (lt % 0.55) / 0.55, hop = i < n ? Math.sin(Math.PI * q) * (0.1 + 0.05 * hash(fg.seed + i)) : 0;
          return fill({ ...s0, ...POSES.cheer, base: s0.base + hop, hu: 0.9 - 0.06 * Math.cos(SP * q) * (i < n ? 1 : 0), hL: [0.05 + 0.08 * hash(i + 3), 2.0, -0.34], hR: [0.05 + 0.08 * hash(i + 5), 2.0, 0.34] }); };
        for (let i = 0; i < n; i++) F.sfx(at + i * 0.55 + 0.5, 'step', 0.12);
        push(fg.body, { a: at, fn, blend: 0.3, kind: 'celebrate', loop: true, vary: 1, dur: until - at });
        return fg;
      };
      // ----- laying a stack: the hands bring each brick to its slot at the stack's own times -----
      // stance 'behind': the figure works from behind the stack facing the camera and rises with it (its feet out of sight); 'front': stands in front facing it
      fg.lay = (S, o2 = {}) => {
        const s0 = fg.state(), idx = [];
        for (let i = o2.from ?? 0; i < Math.min(S.n, o2.to ?? S.n); i++) if (S.times[i] !== undefined && isFinite(S.times[i])) idx.push(i);
        if (!idx.length) return fg;
        const behind = (o2.stance ?? 'behind') === 'behind', reach = o2.reach ?? 0.78, side = behind ? 1 : -1;
        const z0 = S.z - side * (S.depth / 2 + 0.3 * k), yaw = behind ? FACES.camera : FACES.back;
        const t0 = Math.min(o2.at ?? Infinity, S.times[idx[0]] - 0.6), t1 = o2.until ?? S.times[idx[idx.length - 1]] + 0.5;
        const slotP = (i) => S.slot(i), topOf = (i) => S.slot(i).y + S.slotH(i) / 2;
        // smoothed things over the bricks' times (pure functions of t): the height the hands work at, where along the stack
        // weights relative to the nearest brick, so far from every brick it is still a smooth blend (never a jump to "the nearest")
        const near = (t, f, sig = 0.35) => { let d0 = 1e18; for (const i of idx) d0 = Math.min(d0, (t - S.times[i]) ** 2); let sw = 0, sv = 0; for (const i of idx) { const w = Math.exp(-((t - S.times[i]) ** 2 - d0) / (sig * sig)); sw += w; sv += w * f(i); } return sv / sw; };
        const workTop = (t) => near(t, topOf), workX = (t) => near(t, (i) => slotP(i).x);
        const baseAt = (t) => (behind ? Math.max(0, S.topS(t) - reach * k) : s0.base);
        // the posture for working at height h above the feet: kneel → crouch → bend → stand
        const POST = [[0, 0.46, 0.8], [0.3, 0.55, 0.6], [0.6, 0.74, 0.62], [0.85, 0.86, 0.45], [1.2, 0.9, 0.12]];
        const post = (h) => { h /= k; let i = 0; while (i < POST.length - 2 && h > POST[i + 1][0]) i++; const [a, ua, la] = POST[i], [b, ub, lb] = POST[i + 1], q = smooth((h - a) / (b - a)); return [lerp(ua, ub, q), lerp(la, lb, q)]; };
        // hand jobs: per brick, the hand on the brick's side brings it up from just behind its slot and sets it down on time
        const jobs = { L: [], R: [] };
        const rootX = (t) => lerp(S.x, workX(t), o2.follow ?? 0.25);
        // each brick's own side (facing the camera the figure's right is screen-left); a brick in the middle has none
        const sideOf = (i) => { const sd = -(slotP(i).x - rootX(S.times[i])) * (behind ? 1 : -1); return Math.abs(sd) > 0.18 * k ? (sd > 0 ? 'R' : 'L') : null; };
        idx.forEach((i, n) => {
          const ti = S.times[i], p = slotP(i), lastT = (hh) => (jobs[hh].length ? jobs[hh][jobs[hh].length - 1].ti : -9);
          // a side brick: its own side's hand unless that hand is still busy; a middle brick: the hand the next side brick will not need (hands never cross the body)
          let hand = sideOf(i);
          if (!hand) { const nx = idx.slice(n + 1).map(sideOf).find(Boolean); hand = nx ? (nx === 'R' ? 'L' : 'R') : lastT('L') <= lastT('R') ? 'L' : 'R'; }
          else if (ti - lastT(hand) < 0.2) hand = hand === 'R' ? 'L' : 'R';
          const prev = jobs[hand][jobs[hand].length - 1], gap = prev ? ti - prev.ti : 9;
          const tr = clamp(gap * 0.82, 0.13, o2.carryTime ?? 0.6);
          jobs[hand].push({ i, ti, a: ti - tr, b: ti + 0.22, p });
        });
        // a hand with its next brick close behind holds on the last one and goes straight for the next (no trip back to rest)
        for (const hh of ['L', 'R']) jobs[hh].forEach((jb, j, L) => { const nx = L[j + 1]; if (nx && nx.a < jb.ti + 0.3) { jb.b = nx.a; jb.chain = true; nx.prev = jb; } });
        // tending (optional): between bricks far apart, pat the next slot (the ghost growing there), alternating hands
        const pats = { L: [], R: [] };
        if (o2.tend) {
          const all = idx.map((i) => S.times[i]);
          const gaps = [[t0 + 0.6, all[0]], ...all.slice(1).map((tt, j) => [all[j], tt])];
          let n = 0;
          gaps.forEach(([ga, gb], j) => {
            const i = idx[Math.min(idx.length - 1, j === 0 ? 0 : j)];
            for (let t = ga + 0.45; t < gb - 0.5; ) { const per = (o2.tendEvery ?? 0.62) * (0.85 + 0.3 * hash(fg.seed + n * 3.1)); const hnd = n++ % 2 ? 'L' : 'R'; pats[hnd].push({ a: t, b: t + per * 0.9, i: Math.min(S.n - 1, j === 0 ? idx[0] : idx[j]), g: 0.1 + 0.05 * hash(n) }); t += per; }
          });
          if (o2.tend === 'last') { const lastT = all[all.length - 1]; for (let t = lastT + 0.5, n2 = 0; t < t1 - 0.4; n2++) { const per = (o2.tendEvery ?? 0.62) * (0.85 + 0.3 * hash(n2 * 2.3)); pats[n2 % 2 ? 'L' : 'R'].push({ a: t, b: t + per * 0.9, i: Math.min(S.n - 1, idx[idx.length - 1] + 1), g: 0.1 }); t += per; } }
          for (const hh of ['L', 'R']) { pats[hh] = pats[hh].filter((pp) => !jobs[hh].some((jb) => pp.b > jb.a - 0.1 && pp.a < jb.b + 0.05)); pats[hh].forEach((pp, j) => { if (j % 3 === 0) F.sfx((pp.a + pp.b) / 2, 'tap', pp.g); }); }
        }
        // hands at rest: in front of the chest, on the stack's top (or the floor in front when it is still low)
        const restOf = (hand, B, base, wt, pp) => { const sd = hand === 'R' ? 1 : -1; return V3(pp.x, 0, pp.z).addScaledVector(B.f, (behind ? 0.36 : 0.3) * k).addScaledVector(B.s, sd * 0.17 * k).add(V3(0, Math.max(base + 0.08 * k, wt + 0.04), 0)); };
        const handAt = (hand, t, B, base, wt, pp) => {
          const rest = restOf(hand, B, base, wt, pp);
          const j = jobs[hand].find((jb) => t >= jb.a && t < jb.b);
          if (j) {
            // the brick comes up from just behind and below its own slot (out of sight once the stack is above the hip), so each lay is a short lift-and-place
            const top = (jb) => jb.p.clone().add(V3(0, S.slotH(jb.i) * 0.5 + 0.02, 0)), dst = top(j), src = dst.clone().addScaledVector(B.f, -0.24 * k).add(V3(0, -0.16 * k, 0)); src.y = Math.max(src.y, base + 0.3 * k);
            const apex = Math.max(src.y, dst.y) + 0.1 * k;
            if (t < j.ti) {
              // one eased run along the whole path (where the hand was → the pick-up point → over the top → down on the slot), paced by distance: no leg is rushed
              const q = inOut((t - j.a) / (j.ti - j.a)), from = j.prev ? top(j.prev) : rest, mid = src.clone().lerp(dst, 0.5); mid.y = apex;
              const pts = [from, src, mid, dst], len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1]));
              const at = (d) => { d = clamp(d, 0, len[3]); let i = 1; while (i < 3 && d > len[i]) i++; return pts[i - 1].clone().lerp(pts[i], (d - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1])); };
              // even speed along the path, corners rounded by averaging along it
              const d = q * len[3], r = Math.min(0.08 * k, len[3] / 6); return at(d - r).add(at(d)).add(at(d + r)).multiplyScalar(1 / 3);
            }
            return j.chain ? dst : dst.clone().lerp(rest, inOut((t - j.ti) / (j.b - j.ti)));
          }
          const pt = pats[hand].find((pa) => t >= pa.a && t < pa.b);
          if (pt) { const sp = S.slot(pt.i).clone().add(V3(0, S.slotH(pt.i) * 0.5 + 0.03, 0)), q = (t - pt.a) / (pt.b - pt.a), w = Math.sin(Math.PI * q) ** 2, up = Math.sin(Math.PI * q) ** 4 * 0.06 * k; return rest.clone().lerp(sp, w).add(V3(0, up, 0)); }
          return rest;
        };
        const carryOf = (i) => { for (const hh of ['L', 'R']) { const j = jobs[hh].find((jb) => jb.i === i); if (j) return { j, hand: hh }; } return null; };
        const fn = (t) => {
          const tt = clamp(t, t0, t1), base = baseAt(tt), wt = workTop(tt), [hu, ln] = post(wt - base);
          const x = rootX(tt), pose0 = fill({ x, z: z0, yaw, base, hf: -0.02, hu, lean: ln, nod: 0.35, twist: 0 });
          const kneel = clamp((0.62 - hu) / 0.16);
          pose0.fL = [lerp(0, -0.36, kneel), DIM.fr, -0.1]; pose0.fR = [lerp(0.02, 0.28, kneel), DIM.fr, 0.1];
          const B = basis(pose0), pp = V3(x, 0, z0);
          const hw = { L: handAt('L', tt, B, base, wt, pp), R: handAt('R', tt, B, base, wt, pp) };
          const tx = (hw.L.x + hw.R.x) / 2;
          pose0.tilt = clamp(-(tx - x) * 0.35, -0.25, 0.25) * (behind ? 1 : -1);
          const toL = (v) => { const d = v.clone().sub(V3(x, base, z0)); return [d.dot(B.f) / k, d.y / k, d.dot(B.s) / k]; };
          pose0.hL = toL(hw.L); pose0.hR = toL(hw.R);
          pose0.look = [workX(tt), wt, S.z]; pose0.lookW = 1;
          return pose0;
        };
        push(fg.body, { a: t0, fn, blend: 0.5, kind: 'lay', dur: t1 - t0, behind });
        // the stack takes each brick from the hand that carries it
        for (const i of idx) { const c = carryOf(i); if (!c) continue; S.carry[i] = (t) => { if (t < c.j.a + (c.j.ti - c.j.a) * 0.3 || t >= c.j.ti) return null; const J = fg.joints(t), h = c.hand === 'R' ? J.haR : J.haL; return h.clone().add(V3(0, -S.slotH(i) * 0.5 - 0.02, 0)); }; }
        return fg;
      };
      // ----- upper-body actions (over whatever the body is doing) -----
      const pushU = (at, fn, o2 = {}) => push(fg.upper, { a: at, fn, blend: o2.dur ?? 0.4, overlap: 1, antic: o2.antic ?? 0.7, ...o2 });
      const worldOf = (tg, t) => (tg && tg.joints ? tg.joints(t, tg.poseBody(t)).headC.toArray() : tg && tg.isVector3 ? tg.toArray() : Array.isArray(tg) ? tg : tg && tg.x !== undefined ? [tg.x, tg.y ?? 1, tg.z ?? 0] : null);
      // Look at a point / another figure / 'up' / 'down' / 'camera'; until: hand the head back
      fg.look = (at, target, o2 = {}) => {
        const fnL = (t, b) => {
          if (target === 'up') return { nod: -0.55, lookW: 0 };
          if (target === 'down') return { nod: 0.75, lookW: 0 };
          if (target === 'camera') return { look: [b.x, b.base + 1.6, b.z + 5], lookW: 1, nod: 0 };
          return { look: worldOf(target, t), lookW: 1, nod: b.nod * 0.3 };
        };
        pushU(at, fnL, { dur: o2.dur ?? 0.5, kind: 'look' });
        if (o2.until) fg.free(o2.until);
        return fg;
      };
      fg.free = (at, o2 = {}) => { pushU(at, null, { dur: o2.dur ?? 0.45, kind: 'free' }); return fg; };
      // Gesture: a named pose for the arms / torso / head only (wipe, think, shrug, point, cross)
      fg.gesture = (at, pose, o2 = {}) => { const pp = named(pose); pushU(at, () => ({ hL: pp.hL, hR: pp.hR, lean: pp.lean ?? 0, nod: pp.nod ?? 0, tilt: 0, twist: 0, lookW: 0 }), { dur: o2.dur ?? 0.45, kind: 'gesture' }); if (o2.until) fg.free(o2.until); return fg; };
      // Inspect / measure: both hands on a tool (or bare) laid on a point, sliding a little, lifting and setting it down again, the head peering in — over and over, never twice the same
      fg.inspect = (at, until, o2 = {}) => {
        const on = o2.on, per = o2.every ?? 1.5, tool = o2.tool, axis = o2.axis ?? [1, 0, 0];
        const n = Math.max(1, Math.floor((until - at) / per));
        const fnI = (t, b) => {
          const lt = Math.max(0, t - at), i = Math.min(n - 1, Math.floor(lt / per)), q = (lt - i * per) / per, v = hash(fg.seed * 3 + i);
          const lift = q > 0.62 && q < 0.92 ? Math.sin(Math.PI * (q - 0.62) / 0.3) * (0.05 + 0.04 * v) : 0;
          const slide = Math.sin(SP * q) * (0.03 + 0.03 * v);
          const c = [on[0] + axis[0] * slide, on[1] + lift + 0.035, on[2] + axis[2] * slide];
          const Bp = basis(b), w = (v2) => { const d = V3(...v2).sub(V3(b.x, b.base, b.z)); return [d.dot(Bp.f) / k, d.y / k, d.dot(Bp.s) / k]; };
          const span = 0.17;
          return { hL: w([c[0] - axis[0] * span, c[1], c[2] - axis[2] * span]), hR: w([c[0] + axis[0] * span, c[1], c[2] + axis[2] * span]), look: on, lookW: 1, nod: 0.35 + 0.2 * Math.sin(Math.PI * clamp(q / 0.6)) * (0.6 + 0.4 * v), lean: b.lean + 0.1 * Math.sin(Math.PI * clamp(q / 0.6)) };
        };
        pushU(at, fnI, { dur: 0.5, kind: 'inspect', loop: true, vary: 1, until });
        for (let i = 0; i < n; i++) F.sfx(at + i * per + per * 0.92, 'tap', 0.18);
        if (tool) tool.hold(fg, at + 0.3, until, { hand: 'both', axis });
        if (o2.free !== false) fg.free(until);
        return fg;
      };
      // Tend: pat a point with alternating hands (working on something that grows by itself)
      fg.tend = (at, until, o2 = {}) => {
        const on = o2.on, per = o2.every ?? 0.6;
        const fnT = (t, b) => {
          const lt = Math.max(0, t - at), i = Math.floor(lt / per), q = (lt - i * per) / per, hand = i % 2 ? 'hL' : 'hR', other = i % 2 ? 'hR' : 'hL';
          const Bp = basis(b), w = (v2) => { const d = V3(...v2).sub(V3(b.x, b.base, b.z)); return [d.dot(Bp.f) / k, d.y / k, d.dot(Bp.s) / k]; };
          const up = Math.abs(Math.sin(Math.PI * q)) * (0.07 + 0.03 * hash(i + fg.seed));
          return { [hand]: w([on[0] + (i % 2 ? -0.08 : 0.08), on[1] + 0.03 + up, on[2]]), [other]: w([on[0] + (i % 2 ? 0.12 : -0.12), on[1] + 0.1, on[2] - 0.05]), look: on, lookW: 1, nod: 0.4 };
        };
        pushU(at, fnT, { dur: 0.4, kind: 'tend', loop: true, vary: 1, until });
        for (let t = at + per; t < until; t += per) F.sfx(t, 'tap', 0.1);
        if (o2.free !== false) fg.free(until);
        return fg;
      };
      // Show / hide (walk on or off the edge of the world); a hidden figure is not checked
      fg.hide = (at) => { fg.show = [[-1e9, at]]; return fg; };
      fg.appear = (at, until = 1e9) => { fg.show = [[at, until]]; return fg; };
      figures.push(fg);
      if (o.label) P.label(fg, o.label, o.labelOpt || {});
      return fg;
    };

    // ---------- Stacks: props that grow over time, slot by slot ----------
    // P.stack({ slots: [{ x, y, z, w, h, d, ry, color }], times | count, ghost, kind, color, x, z, depth }): slot i appears at times[i]
    //   (or when count(t) passes i + 1; with ghost: true, the slot being filled shows how far it has got — a see-through brick filling up)
    const stacks = P.stacks;
    P.stack = (o) => {
      const slots = o.slots, n = slots.length, g = new THREE.Group(); root.add(g);
      let times = o.times ? [...o.times] : [];
      if (!o.times && o.count) { const T0 = o.from ?? 0, T1 = o.until ?? F.duration; for (let i = 0; i < n; i++) { let lo = T0, hi = T1; if (o.count(T1) < i + 1) { times[i] = Infinity; continue; } if (o.count(T0) >= i + 1) { times[i] = T0; continue; } for (let it = 0; it < 40; it++) { const m = (lo + hi) / 2; if (o.count(m) >= i + 1) hi = m; else lo = m; } times[i] = hi; } }
      while (times.length < n) times.push(Infinity);
      const S = { kind: o.kind ?? 'block', slots, n, times, g, x: o.x ?? 0, z: o.z ?? 0, depth: o.depth ?? 0.2, carry: [], o };
      S.slot = (i) => V3(slots[i].x, slots[i].y, slots[i].z);
      S.slotH = (i) => slots[i].h;
      S.countAt = (t) => (o.count ? o.count(t) : times.filter((x) => x <= t).length);
      S.top = (t = 1e9) => { let m = 0; for (let i = 0; i < n; i++) if (times[i] <= t) m = Math.max(m, slots[i].y + slots[i].h / 2); return m; };
      // smoothed top: rises over 0.35 s around each new level (for figures standing on / behind it)
      S.topS = (t) => { let m = 0; for (let i = 0; i < n; i++) { const tp = slots[i].y + slots[i].h / 2; if (tp <= m) continue; const q = smooth((t - times[i] + 0.15) / 0.35); if (q > 0) m = Math.max(m, lerp(slots[i].y - slots[i].h / 2, tp, q)); } return m; };
      S.topAt = (x, z, t) => { let m = -1; for (let i = 0; i < n; i++) { const sl = slots[i]; if (times[i] > t) continue; if (Math.abs(x - sl.x) <= sl.w / 2 + 0.05 && Math.abs(z - sl.z) <= sl.d / 2 + 0.05) m = Math.max(m, sl.y + sl.h / 2); } return m; };
      { let a = 1e9, b = -1e9; for (const sl of slots) { a = Math.min(a, sl.x - sl.w / 2); b = Math.max(b, sl.x + sl.w / 2); } S.x0 = a; S.x1 = b; }
      S.surface = (t) => ({ x: S.x, z: S.z, depth: S.depth, top: S.top(t) });
      Object.defineProperty(S, 'top_', { get: () => S.top() });
      const meshes = slots.map((sl, i) => { const m = new THREE.Mesh(sl.geo, mat(sl.color, { rough: sl.rough ?? 0.78, metal: sl.metal ?? 0, ei: sl.ei ?? 0 })); m.visible = false; g.add(m); return m; });
      let ghost = null;
      if (o.ghost) { const gm = mat(o.ghostColor ?? slots[0].color, { opacity: 0.22, unique: true }), fm = mat(o.ghostFill ?? slots[0].color, { rough: 0.6, ei: o.ghostFill ? 0.12 : 0, unique: true }); ghost = { shell: new THREE.Mesh(slots[0].geo, gm), fillM: new THREE.Mesh(slots[0].geo, fm) }; g.add(ghost.shell, ghost.fillM); }
      // the footprint's contact shadow
      { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const sl of slots) if (sl.y - sl.h / 2 < 0.02) { x0 = Math.min(x0, sl.x - sl.w / 2); x1 = Math.max(x1, sl.x + sl.w / 2); z0 = Math.min(z0, sl.z - sl.d / 2); z1 = Math.max(z1, sl.z + sl.d / 2); }
        if (x1 > x0) { S.shadow = blob((x1 - x0) * 1.25, (z1 - z0) * 2.6, 0.7); S.shadow.position.set((x0 + x1) / 2, 0.003, (z0 + z1) / 2); S.shadowW = x1 - x0; } }
      S.draw = (t) => {
        for (let i = 0; i < n; i++) {
          const m = meshes[i], sl = slots[i], ti = times[i];
          const cf = S.carry[i] && S.carry[i](t);
          if (cf) { m.visible = true; m.position.copy(cf); m.rotation.set(0, sl.ry ?? 0, 0); const q = 1; m.scale.set(q, q, q); continue; }
          if (t < ti) { m.visible = false; continue; }
          m.visible = true;
          // settle: a short drop and squash as it lands (bricks), a pop for blocks / coins without a carrier
          const q = clamp((t - ti) / 0.16), carried = !!S.carry[i];
          const dy = carried ? (1 - E.quartOut(q)) * 0.025 : (1 - E.backOut(clamp((t - ti) / 0.22))) * 0.18, sq = 1 - Math.sin(Math.PI * q) * 0.06;
          m.position.set(sl.x, sl.y + dy, sl.z); m.rotation.set(sl.rx ?? 0, sl.ry ?? 0, sl.rz ?? 0); m.scale.set(1 + (1 - sq) * 0.5, sq, 1 + (1 - sq) * 0.5);
          if (!carried && t - ti < 0.12) m.scale.multiplyScalar(lerp(0.6, 1, E.quartOut((t - ti) / 0.12)));
        }
        if (S.shadow) { const on = times.some((ti) => ti <= t) || S.carry.some((c) => c && c(t)); S.shadow.userData.on = on; S.shadow.visible = on; }
        if (ghost) {
          const c = S.countAt(t), i = Math.floor(c + 1e-9), fr = c - i, on = i < n && fr > 0.004 && t >= (o.ghostFrom ?? -1e9) && !(S.carry[i] && S.carry[i](t));
          ghost.shell.visible = ghost.fillM.visible = on;
          if (on) { const sl = slots[i]; ghost.shell.position.set(sl.x, sl.y, sl.z); ghost.shell.scale.set(1.004, 1.004, 1.004); ghost.shell.rotation.set(0, sl.ry ?? 0, 0); ghost.fillM.scale.set(Math.max(0.02, fr), 0.999, 0.999); ghost.fillM.position.set(sl.x - (sl.w * (1 - fr)) / 2, sl.y, sl.z); ghost.fillM.rotation.set(0, 0, 0); }
        }
      };
      // landing sounds (unless told otherwise): one per slot, quieter when they come thick and fast
      if (o.sfx !== false) for (let i = 0; i < n; i++) { const ti = times[i]; if (!isFinite(ti)) continue; const gap = i ? ti - times[i - 1] : 1; if (gap < 0.22 && i % 2) continue; F.sfx(ti, o.sound ?? (S.kind === 'coin' ? 'coin' : 'place'), (o.gain ?? 0.32) * (gap < 0.22 ? 1.1 : 1)); }   // a fast run: one clack per two bricks (it still reads as a run)
      if (window.EV && EV.info && times.some(isFinite)) EV.info('bars', Math.min(...times.filter(isFinite)), F.duration, { group: 'stack' + stacks.length });
      stacks.push(S);
      return S;
    };
    const brickGeo = (w, h, d) => geoBox(w, h, d, Math.min(0.014, h * 0.12));
    // A wall of bricks, course by course (running bond: every other course shifted by half a brick, ragged ends). order: 'centre' lays the middle first
    P.wall = (o = {}) => {
      const [bw, bh, bd] = o.brick ?? [0.42, 0.13, 0.2], gap = o.gap ?? 0.012, cols = o.cols ?? 3, rows = o.rows ?? 12, x = o.x ?? 0, z = o.z ?? 0;
      const slots = [];
      for (let r = 0; r < rows; r++) {
        const shift = o.bond === 'stack' ? 0 : (r % 2 ? 0.5 : 0) * (bw + gap) - (o.bond === 'stack' ? 0 : 0.25 * (bw + gap));
        const order = [...Array(cols).keys()];
        if ((o.order ?? 'centre') === 'centre') order.sort((a, b) => Math.abs(a - (cols - 1) / 2) - Math.abs(b - (cols - 1) / 2) || a - b);
        for (const c of order) { const tone = hash(r * 13 + c * 7 + (o.seed ?? 0)) < 0.35 ? 'brick2' : 'brick'; slots.push({ x: x + (c - (cols - 1) / 2) * (bw + gap) + shift, y: r * (bh + gap * 0.6) + bh / 2, z, w: bw, h: bh, d: bd, ry: 0, color: col(o.color ?? tone), geo: brickGeo(bw, bh, bd) }); }
      }
      return P.stack({ ...o, slots, kind: 'brick', x, z, depth: bd });
    };
    // Steps: n blocks rising along a direction (each step a solid block from the floor)
    P.steps = (o = {}) => {
      const n = o.n ?? 6, w = o.w ?? 0.6, h = o.h ?? 0.2, d = o.d ?? 0.4, dir = o.dir ?? 1, x = o.x ?? 0, z = o.z ?? 0;
      const slots = Array.from({ length: n }, (_, i) => ({ x: x + dir * i * w, y: ((i + 1) * h) / 2, z, w, h: (i + 1) * h, d, color: col(o.color ?? 'block'), geo: geoBox(w * 0.98, (i + 1) * h, d, 0.02) }));
      return P.stack({ ...o, slots, kind: 'step', x, z, depth: d });
    };
    // A heap: bricks thrown into a rough pyramid (seeded), the bottom layer widest
    P.pile = (o = {}) => {
      const n = o.n ?? 20, [bw, bh, bd] = o.brick ?? [0.42, 0.13, 0.2], x = o.x ?? 0, z = o.z ?? 0, slots = [];
      let i = 0, layer = 0;
      while (i < n) { const per = Math.max(1, Math.round(Math.sqrt(n) * 1.3) - layer * 2); for (let j = 0; j < per && i < n; j++, i++) { const a = hash(i * 3.7 + (o.seed ?? 0)), b = hash(i * 9.1 + 2); slots.push({ x: x + (j - (per - 1) / 2) * bw * 0.62 + (a - 0.5) * 0.1, y: layer * bh * 0.92 + bh / 2, z: z + (b - 0.5) * 0.35, w: bw, h: bh, d: bd, ry: (a - 0.5) * 1.2, color: col(o.color ?? (b < 0.4 ? 'brick2' : 'brick')), geo: brickGeo(bw, bh, bd) }); } layer++; }
      return P.stack({ ...o, slots, kind: 'pile', x, z, depth: 0.5 });
    };
    // Coins: stacks of gold discs, filled one stack after another
    P.coins = (o = {}) => {
      const n = o.n ?? 30, per = o.per ?? 12, r = o.r ?? 0.11, h = o.h ?? 0.024, x = o.x ?? 0, z = o.z ?? 0, slots = [];
      const geo = gget(`coin${r},${h}`, () => new THREE.CylinderGeometry(r, r, h * 0.92, 40));
      for (let i = 0; i < n; i++) { const st = Math.floor(i / per), j = i % per, a = hash(i * 5.3); slots.push({ x: x + st * r * 2.3 + (a - 0.5) * 0.01, y: j * h + h / 2, z: z + (hash(st) - 0.5) * 0.05, w: 2 * r, h, d: 2 * r, ry: a * 6, color: col(o.color ?? 'coin'), metal: 0.6, rough: 0.35, geo }); }
      return P.stack({ ...o, slots, kind: 'coin', x, z, depth: 2 * r });
    };

    // ---------- Items: single props that sit somewhere or ride in a figure's hands ----------
    // P.item('brick' | 'level' | 'coin' | 'box' | 'flag' | a THREE.Object3D, { accent, color, at: [x, y, z] }) → it.at(t, [x, y, z] | null) / it.hold(fig, a, b, { hand: 'R' | 'L' | 'both' })
    const items = P.items;
    P.item = (kind, o = {}) => {
      const g = new THREE.Group(); root.add(g);
      const c = col(o.color ?? (o.accent ? 'accent' : kind === 'coin' ? 'coin' : 'brick'));
      if (kind === 'level') {
        // a spirit level: a red bar with a window and a bubble vial
        const L2 = o.len ?? 0.5;
        const bar = new THREE.Mesh(geoBox(L2, 0.055, 0.06, 0.008), mat(c, { rough: 0.45, ei: 0.08 })); g.add(bar);
        const win = new THREE.Mesh(geoBox(0.07, 0.035, 0.062, 0.004), mat('#F4F4F2', { rough: 0.3 })); g.add(win);
        const vial = new THREE.Mesh(geoBox(0.04, 0.016, 0.064, 0.006), mat('#1D1D1D', { rough: 0.3 })); g.add(vial);
      } else if (kind === 'coin') g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.024, 40), mat(c, { metal: 0.6, rough: 0.35 })));
      else if (kind === 'flag') { g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 12), mat('#DADADA'))); const fl = new THREE.Mesh(geoBox(0.26, 0.17, 0.01, 0.004), mat(c, { rough: 0.6 })); fl.position.set(0.13, 0.2, 0); g.add(fl); }
      else if (kind && kind.isObject3D) g.add(kind);
      else { const [w, h, d] = o.size ?? (kind === 'box' ? [0.3, 0.3, 0.3] : [0.42, 0.13, 0.2]); g.add(new THREE.Mesh(geoBox(w, h, d, 0.014), mat(c, { rough: 0.7 }))); }
      const it = { kind, g, accent: !!o.accent, keys: [], o, faceCam: o.face === 'camera' || (kind === 'flag' && o.face !== 'hand') };
      if (o.at) it.keys.push({ t: -1e9, mode: 'world', p: o.at, ry: o.ry ?? 0 });
      it.at = (t, p, o2 = {}) => { it.keys.push({ t, mode: p ? 'world' : 'hide', p, ry: o2.ry ?? 0, dur: o2.dur ?? 0.25 }); it.keys.sort((a, b) => a.t - b.t); if (p && o2.sfx !== false && t > 0) F.sfx(t + (o2.dur ?? 0.25), 'tap', 0.2); return it; };
      it.hold = (fg, a, b, o2 = {}) => { it.keys.push({ t: a, mode: 'hand', fg, hand: o2.hand ?? 'R', axis: o2.axis ?? null, dur: o2.dur ?? 0.2 }); if (b !== undefined && o2.drop) it.at(b, o2.drop); it.keys.sort((x, y) => x.t - y.t); return it; };
      const where = (k2, t) => {
        if (!k2 || k2.mode === 'hide') return null;
        if (k2.mode === 'world') return { p: V3(...k2.p), ry: k2.ry };
        const J = k2.fg.joints(t);
        if (k2.hand === 'both') { const m = J.haL.clone().add(J.haR).multiplyScalar(0.5).add(V3(0, -0.035, 0)), d = J.haR.clone().sub(J.haL); return { p: m, ry: -Math.atan2(d.z, d.x) }; }
        const h = k2.hand === 'L' ? J.haL : J.haR; return { p: h.clone().add(V3(0, 0.02, 0)), ry: it.faceCam ? 0 : -J.p.yaw };   // a flag (or o.face: 'camera') keeps its face to the camera
      };
      it.draw = (t) => {
        let i = -1; for (let j = 0; j < it.keys.length; j++) if (it.keys[j].t <= t) i = j;
        const cur = where(it.keys[i], t);
        if (!cur) { g.visible = false; return; }
        g.visible = true; let p = cur.p, ry = cur.ry;
        const k2 = it.keys[i], prev = i > 0 ? where(it.keys[i - 1], t) : null, q = k2.dur ? clamp((t - k2.t) / k2.dur) : 1;
        if (prev && q < 1) { const w = inOut(q); p = prev.p.clone().lerp(p, w); p.y += Math.sin(Math.PI * w) * 0.08; ry = angLerp(prev.ry, ry, w); }
        g.position.copy(p); g.rotation.set(0, ry, 0);
      };
      items.push(it);
      return it;
    };

    // ---------- Words: labels, tags, a counter, a title card, captions ----------
    const ui = F.layer('pointer-events:none', 6);
    const mono = opt.labelFont ?? '"Space Mono", "JetBrains Mono", "Noto Sans SC", monospace', cjk = opt.titleFont ?? '"Noto Sans SC", sans-serif';
    const proj = (v) => { const q = v.clone().project(camera); return { x: (q.x * 0.5 + 0.5) * W0, y: (-q.y * 0.5 + 0.5) * H0, z: q.z }; };
    P.project = proj;
    const labels = [], tags = [], texts = [];
    const fadeK = (t, a, b, f = 0.35) => Math.min(seg(t, a, a + f, E.quartOut), 1 - seg(t, b - f, b, E.sine));
    // A small monospace caps label above a figure (the reference look): fixed at the figure's start, or following it (follow: true); y = metres above the floor
    P.label = (fg, text, o2 = {}) => {
      const e = el('div', `left:0;top:0;white-space:nowrap;font:700 ${F.px(o2.size ?? 36)}px/1 ${mono};letter-spacing:.2em;color:${PAL.text};text-transform:uppercase;opacity:0;transform-origin:50% 100%`, ui, P0.esc(text));
      const L2 = { fg, e, text, at: o2.at ?? 0.3, until: o2.until ?? F.duration, follow: !!o2.follow, y: o2.y ?? 2.25, dy: o2.dy ?? 0.42, x0: null };
      F.text(e, 'label', text, L2.at, L2.until);
      labels.push(L2); fg.label = L2;
      return L2;
    };
    // A small tag (a number, a word) anchored to a figure (above its label), a stack's top, or a point; text may be a function of t
    P.tag = (anchor, o2 = {}) => {
      const e = el('div', `left:0;top:0;white-space:nowrap;font:700 ${F.px(o2.size ?? 30)}px/1 ${mono};letter-spacing:.08em;color:${col(o2.color ?? 'text')};opacity:0`, ui);
      const T = { anchor, e, o: o2, at: o2.at ?? 0, until: o2.until ?? F.duration };
      const reg = typeof o2.text === 'function' ? o2.facts ?? [] : [o2.text]; for (const s of reg) F.text(e, 'label', String(s), T.at, T.until);
      tags.push(T); return T;
    };
    // A counter at the top (a day, a year, a count): value(t) → number, fmt(n) → text; tick: a soft tick every n units
    P.counter = (o2 = {}) => {
      const e = el('div', `left:0;right:0;top:${H0 * (o2.y ?? (PT ? 0.14 : 0.1))}px;text-align:center;white-space:nowrap;font:700 ${F.px(o2.size ?? 44)}px/1 ${o2.font ?? mono};letter-spacing:.14em;color:${PAL.text};opacity:0;font-variant-numeric:tabular-nums`, ui);
      const C = { e, o: o2, at: o2.at ?? 0, until: o2.until ?? F.duration, value: o2.value ?? ((t) => t), fmt: o2.fmt ?? ((n) => String(Math.round(n))) };
      for (const s of o2.facts ?? [C.fmt(C.value(C.until))]) F.text(e, 'counter', String(s), C.at, C.until, { chrome: true });
      if (o2.tick) { let last = Math.floor(C.value(C.at) / o2.tick); for (let t = C.at; t < C.until; t += 1 / 60) { const v = Math.floor(C.value(t) / o2.tick); if (v !== last) { F.sfx(t, 'tick', o2.tickGain ?? 0.12); last = v; } } }
      if (window.EV && EV.info) EV.info('mark', C.at, C.until, { group: 'counter' });
      texts.push({ kind: 'counter', C, draw: (t) => { const tq = P0.frameT(t); const s = C.fmt(C.value(clamp(tq, C.at, C.until))); if (e.textContent !== s) e.textContent = s; set(e, { opacity: fadeK(t, C.at, C.until, 0.4).toFixed(3) }); } });
      return C;
    };
    // A title card: centred words (html allowed, e.g. <sup>), rising in softly; sub = a smaller monospace line under it. y = fraction of the height (default: high in the empty void, where a counter usually sits — end the counter first)
    P.title = (html, at, until, o2 = {}) => {
      const box = el('div', `left:0;right:0;top:${H0 * (o2.y ?? (PT ? 0.1 : 0.07))}px;text-align:center;opacity:0`, ui);
      const big = el('div', `position:relative;display:inline-block;font:900 ${F.px(o2.size ?? 92)}px/1.1 ${o2.font ?? cjk};letter-spacing:${o2.spacing ?? '.12em'};color:${PAL.text};white-space:nowrap`, box, html);
      const sub = o2.sub ? el('div', `position:relative;margin-top:${F.px(22)}px;font:700 ${F.px(o2.subSize ?? 34)}px/1.2 ${mono};letter-spacing:.12em;color:${col(o2.subColor ?? 'text')};white-space:nowrap`, box, o2.sub) : null;
      F.text(big, 'headline', o2.text ?? html, at, until); if (sub) F.text(sub, 'label', o2.subText ?? o2.sub, at + (o2.subDelay ?? 0.5), until);
      if (o2.sfx !== false) F.sfx(at, o2.sound ?? 'glow', 0.3);
      texts.push({ kind: 'title', draw: (t) => { const k2 = fadeK(t, at, until, 0.6); set(box, { opacity: k2.toFixed(3), transform: `translateY(${((1 - seg(t, at, at + 0.9, E.quartOut)) * F.px(18)).toFixed(1)}px)` }); if (sub) set(sub, { opacity: fadeK(t, at + (o2.subDelay ?? 0.5), until, 0.5).toFixed(3) }); } });
      return box;
    };
    // A caption line (silent subtitles, or a moral at the end), low in the frame
    P.caption = (text, at, until, o2 = {}) => {
      const e = el('div', `left:${F.px(60)}px;right:${F.px(60)}px;top:${H0 * (o2.y ?? (PT ? 0.78 : 0.84))}px;text-align:center;font:700 ${F.px(o2.size ?? 40)}px/1.35 ${o2.font ?? cjk};letter-spacing:.06em;color:${PAL.text};opacity:0`, ui, P0.esc(text));
      F.text(e, 'caption', text, at, until);
      texts.push({ kind: 'caption', draw: (t) => set(e, { opacity: fadeK(t, at, until, 0.35).toFixed(3) }) });
      return e;
    };
    // Fade to black at the end (and up from black at the start: opt.fadeIn)
    const veil = el('div', `inset:0;background:${PAL.bg};opacity:0;z-index:20;pointer-events:none`, F.stage); veil.dataset.motion = 'skip';
    let fades = [];
    P.fade = (at, dur = 1.2) => { fades.push([at, dur]); F.transition(at, at + dur); return P; };
    const fadeIn = opt.fadeIn ?? 0.5;
    P.cover = (t) => { F.coverAt(t); return P; };

    // ---------- Camera: one fixed wide shot, framed on the box of the world (x0, x1, y0, y1) for this aspect ----------
    const box = { x0: -2.0, x1: 2.0, y0: -0.7, y1: 3.4, ...(opt.box || {}), ...((PT ? opt.boxPortrait : opt.boxLandscape) || {}) };
    const placeCamera = () => {
      const el2 = ((opt.elevation ?? 7) * Math.PI) / 180, fy = (camera.fov * Math.PI) / 180, fx = 2 * Math.atan(Math.tan(fy / 2) * camera.aspect);
      const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2, w = box.x1 - box.x0, h = box.y1 - box.y0, m = opt.margin ?? 1.06;
      const D = Math.max(w / 2 / Math.tan(fx / 2), h / 2 / Math.tan(fy / 2)) * m;
      camera.position.set(cx, cy + D * Math.sin(el2), D * Math.cos(el2)); camera.lookAt(cx, cy + (opt.lookOffset ?? 0), 0); camera.updateMatrixWorld();
    };
    placeCamera();
    P.box = box;

    // ---------- Frame ----------
    const draw = (t) => {
      for (const fg of figures) fg.draw(t);
      for (const S of stacks) S.draw(t);
      for (const it of items) it.draw(t);
      for (const fn of frameFns) fn(t);
      for (const L2 of labels) {
        const fg = L2.fg, J = fg._J || fg.joints(t);
        if (L2.x0 === null) { const j0 = fg.joints(0); L2.x0 = j0.pel.x; L2.z0 = j0.pel.z; }
        // following: x with the body, height = the support it stands on + y (not the head, so it doesn't bob)
        const wp = L2.follow ? V3(J.pel.x, J.p.base + L2.y, J.pel.z) : V3(L2.x0, L2.y, L2.z0);
        const q = proj(wp), on = fg.visible(t) ? fadeK(t, L2.at, L2.until, 0.5) : 0;
        set(L2.e, { opacity: on.toFixed(3), transform: `translate(${(q.x).toFixed(1)}px,${(q.y).toFixed(1)}px) translate(-50%,-100%)` });
        L2._q = q;
      }
      for (const T of tags) {
        const a = T.anchor; let wp;
        if (a && a.e && a.fg) { wp = null; const q0 = a._q || { x: 0, y: 0 }; const q = { x: q0.x, y: q0.y + F.px(T.o.dy ?? 44) }; set(T.e, { transform: `translate(${q.x.toFixed(1)}px,${q.y.toFixed(1)}px) translate(-50%,-100%)` }); }
        else { wp = a && a.joints ? a.joints(t).headC.clone().add(V3(0, 0.45, 0)) : a && a.top ? V3(a.x, a.top(t) + (T.o.lift ?? 0.25), a.z) : V3(...a); const q = proj(wp); set(T.e, { transform: `translate(${q.x.toFixed(1)}px,${q.y.toFixed(1)}px) translate(-50%,-100%)` }); }
        const s = typeof T.o.text === 'function' ? T.o.text(P0.frameT(t)) : T.o.text; if (T.e.innerHTML !== s) T.e.innerHTML = s;
        set(T.e, { opacity: fadeK(t, T.at, T.until, 0.4).toFixed(3) });
      }
      for (const x of texts) x.draw(t);
      let v = fadeIn ? 1 - seg(t, 0, fadeIn, E.sine) : 0; for (const [a, d] of fades) v = Math.max(v, seg(t, a, a + d, E.sine)); set(veil, { opacity: v.toFixed(3) });
      composer.render();
    };
    P.draw = draw;

    // ---------- Checks: measured from the rig (the canvas is invisible to the DOM motion sheet) ----------
    const JN = ['pel', 'chest', 'headC', 'haL', 'haR', 'elL', 'elR', 'knL', 'knR', 'ftL', 'ftR'];
    const jointsAt = (fg, t) => { const J = fg.joints(t); return JN.map((n) => J[n]); };
    // speed of the fastest joint (m/s, at figure scale 1), sampled at 30 fps
    const speeds = (fg) => { const dt = 1 / 30, out = []; let prev = jointsAt(fg, 0); for (let t = dt; t <= F.duration + 1e-6; t += dt) { const cur = jointsAt(fg, t), d = cur.map((v, i) => v.distanceTo(prev[i]) / fg.k); out.push({ t, d, v: Math.max(...d) / dt, vis: fg.visible(t) && fg.visible(t - dt) }); prev = cur; } return out; };
    let SPD = null;
    const speedsAll = () => (SPD ??= figures.map((fg) => speeds(fg)));
    const ACT_V = opt.actV ?? 0.28;   // m/s: a joint moving this fast is visible acting; breathing is ~0.01
    P.run = () => {
      F.add((t) => draw(t));
      // a figure visibly acting counts as action for the gap checks (dead air / no new action): spans where any figure moves ≥ ACT_V
      F.prep(() => {
        const S2 = speedsAll(), dt = 1 / 30, n = S2.length ? S2[0].length : 0;
        let a = null;
        for (let i = 0; i <= n; i++) { const act = i < n && S2.some((L2) => L2[i].vis && L2[i].v >= ACT_V); const t = (i + 1) * dt; if (act && a === null) a = t; if (!act && a !== null) { if (t - a >= 0.2) F.live(a - 0.05, t + 0.15); a = null; } }
      });
    };

    F.addLint(() => {
      const out = [], add = (level, t, what, msg) => out.push({ level, t: r2(t), src: '', what, msg }), seen = new Set(), once = (k2) => { if (seen.has(k2)) return false; seen.add(k2); return true; };
      const cutAt = (t) => (F.cuts || []).some((c) => Math.abs(c - t) < 0.05);
      const S2 = speedsAll();
      figures.forEach((fg, fi) => {
        const L2 = S2[fi], nm = fg.label ? fg.label.text : fg.name;
        // ① a limb that snaps (a joint jumping > 0.3 m in one frame: a pose with no transition, two actions overlapping badly)
        //    a snap is one frame moving far more than the frames on either side; steady fast motion is "too fast" (②b) instead
        for (let i = 1; i < L2.length - 1; i++) { const s = L2[i]; if (!s.vis || cutAt(s.t)) continue; for (let j = 0; j < JN.length; j++) { const d = s.d[j], nb = Math.max(L2[i - 1].d[j], L2[i + 1].d[j]); if (d > 0.1 && d > 3 * nb && once('snap' + fi + Math.round(s.t * 2))) add('warn', s.t, M('动作跳帧', 'limb snaps'), M(`"${nm}" 的 ${JN[j]} 在 ${r2(s.t)}s 一帧跳了 ${d.toFixed(2)} 米（前后一帧只动 ${nb.toFixed(2)} 米）：两个动作之间没有过渡（给后一个动作 dur），或者两段动作时间叠在一起了`, `"${nm}"'s ${JN[j]} jumps ${d.toFixed(2)} m in one frame at ${r2(s.t)}s (the frames around it move ${nb.toFixed(2)} m): no transition between two actions (give the second a dur), or two actions overlap in time`)); } }
        // ②b too fast: a hand or foot faster than a person can move (14 m/s), even if smooth
        for (const s of L2) if (s.vis && s.v > 14 && !cutAt(s.t) && once('fast' + fi + Math.round(s.t))) add('warn', s.t, M('动作太快', 'too fast'), M(`"${nm}" 在 ${r2(s.t)}s 有关节快到 ${s.v.toFixed(0)} 米/秒：放慢这个动作（多给一点时间，或者间隔拉开）`, `"${nm}" has a joint at ${s.v.toFixed(0)} m/s at ${r2(s.t)}s: give the move more time`));
        // ② a hard start: from still to fast in one frame (no ease-in — reads as a robot)
        for (let i = 2; i < L2.length; i++) if (L2[i].vis && L2[i - 1].v < 0.12 && L2[i - 2].v < 0.12 && L2[i].v > 1.4 && !cutAt(L2[i].t) && once('hard' + fi + Math.round(L2[i].t))) add('warn', L2[i].t, M('动作硬起步', 'hard start'), M(`"${nm}" 在 ${r2(L2[i].t)}s 从静止一帧就到全速：动作要先蓄一下再起（默认的过渡有预备和惯性，别把 dur 设成 0）`, `"${nm}" goes from still to full speed in one frame at ${r2(L2[i].t)}s: let the move wind up (the default transition has anticipation and follow-through; don't set dur to 0)`));
        // ③ frozen: visible and not even breathing for over 1.5 s
        let run = 0; for (const s of L2) { if (s.vis && s.v < 0.004) run += 1 / 30; else { if (run > 1.5 && once('frz' + fi + Math.round(s.t))) add('warn', s.t - run, M('人物冻住', 'figure frozen'), M(`"${nm}" 在 ${r2(s.t - run)}–${r2(s.t)}s 一动不动（连呼吸都没有）：不要关掉 idle，停住的时候也给一个小动作`, `"${nm}" does not move at all ${r2(s.t - run)}–${r2(s.t)}s (not even breathing): keep idle on, and give a hold a small action`)); run = 0; } }
        // ④ in the floor / floating in the air (feet hidden behind the stack it lays are not checked)
        for (let t = 0.1; t < F.duration; t += 0.2) {
          if (!fg.visible(t)) continue;
          const J = fg.joints(t);
          // feet out of sight behind a stack (seen from the camera) are not judged; nor is a body mid-move (climbing, jumping, sitting down, lying down)
          const hiddenBy = (v) => stacks.some((S) => v.z < S.z - S.depth / 2 && v.x > S.x0 - 0.05 && v.x < S.x1 + 0.05 && S.top(t) >= v.y + 0.05);
          const sgB = [...fg.body].reverse().find((sg) => sg.a <= t), moving = sgB && ['climb', 'jump', 'sit', 'lie', 'fall'].includes(sgB.kind) && t < sgB.a + (sgB.dur ?? 0) + sgB.blend;
          const hidden = moving || (hiddenBy(J.ftL) && hiddenBy(J.ftR));
          for (const n of JN) if (J[n].y < (n === 'headC' ? DIM.hr : DIM.lr) * fg.k - 0.04 && once('pen' + fi + n)) add('warn', t, M('穿进地面', 'into the floor'), M(`"${nm}" 的 ${n} 在 ${r2(t)}s 穿进了地面：姿势的 hu / 脚的高度不对，或者 base 低于地面`, `"${nm}"'s ${n} goes into the floor at ${r2(t)}s: the pose's hu / feet height is wrong, or base is below the floor`));
          if (!hidden && J.p.base > 0.05) { const sup = Math.max(...stacks.map((S) => Math.max(S.topAt(J.ftL.x, J.ftL.z, t), S.topAt(J.ftR.x, J.ftR.z, t), S.topAt(J.pel.x, J.pel.z, t)))); if (Math.abs(sup - J.p.base) > 0.12 && once('fly' + fi + Math.round(t))) add('warn', t, M('悬空', 'floating'), M(`"${nm}" 在 ${r2(t)}s 站在 ${r2(J.p.base)} 米高，脚下却没有东西（下面最高 ${r2(Math.max(0, sup))} 米）：站到堆上（climb / sit 用这个堆），或者 base 跟着堆的高度`, `"${nm}" stands ${r2(J.p.base)} m up at ${r2(t)}s with nothing under its feet (highest below: ${r2(Math.max(0, sup))} m): climb / sit onto the stack, or keep base on its top`)); }
        }
        // ⑤ a loop that repeats exactly (vary: 0) for long
        for (const sg of [...fg.body, ...fg.upper]) if (sg.loop && sg.vary === 0 && (sg.dur ?? (sg.until - sg.a)) > 3 && once('rep' + fi + sg.a)) add('warn', sg.a, M('机械重复', 'mechanical repeat'), M(`"${nm}" 的 ${sg.kind} 循环 ${r2(sg.dur ?? sg.until - sg.a)} 秒一模一样：留着默认的 vary（每一下的幅度、节奏都不同）`, `"${nm}"'s ${sg.kind} loop repeats exactly for ${r2(sg.dur ?? sg.until - sg.a)} s: keep the default vary`));
        // ⑥ lockstep: a big body move with overlap 0 (everything starts and stops together)
        for (const sg of fg.body) if (sg.overlap === 0 && sg.blend > 0.25 && once('lock' + fi + sg.a)) add('warn', sg.a, M('全身同时起停', 'lockstep'), M(`"${nm}" 在 ${r2(sg.a)}s 的 ${sg.kind} 全身一起开始一起停（overlap: 0）：去掉 overlap，让胯先走、手和头晚一点到`, `"${nm}"'s ${sg.kind} at ${r2(sg.a)}s moves every part together (overlap: 0): drop it, so the hips lead and the arms and head arrive later`));
      });
      // ⑦ labels: cut by the frame, or sitting on a head
      for (let t = 0.5; t < F.duration; t += 0.5) {
        draw(t);
        for (const L2 of labels) {
          if (t < L2.at + 0.5 || t > L2.until - 0.5 || !L2.fg.visible(t)) continue;
          const r = L2.e.getBoundingClientRect(), sr = F.stage.getBoundingClientRect(), sc = sr.width / W0, x0 = (r.left - sr.left) / sc, x1 = (r.right - sr.left) / sc, y0 = (r.top - sr.top) / sc, y1 = (r.bottom - sr.top) / sc;
          if ((x0 < F.px(16) || x1 > W0 - F.px(16) || y0 < 0) && once('lc' + L2.text)) add('warn', t, M('标签出画', 'label cut'), M(`"${L2.text}" 在 ${r2(t)}s 被画面边切到：人物往里站，或者 P.box 放宽`, `"${L2.text}" is cut by the frame edge at ${r2(t)}s: move the figure in, or widen P.box`));
          for (const fg of figures) { if (!fg.visible(t)) continue; const h = proj(fg.joints(t).headC), rr = F.px(1) * 0; if (h.x > x0 - rr && h.x < x1 + rr && h.y > y0 && h.y < y1 + F.px(30) && once('lh' + L2.text + fg.name)) add('warn', t, M('标签压头', 'label on a head'), M(`"${L2.text}" 在 ${r2(t)}s 压在 ${fg.label ? fg.label.text : fg.name} 的头上：follow 标签，或者 y 抬高`, `"${L2.text}" sits on ${fg.label ? fg.label.text : fg.name}'s head at ${r2(t)}s: make the label follow, or raise y`)); }
        }
      }
      draw(0);
      // ⑧ the parable's shape: one red symbol, 15–45 s, told by action rather than words
      if (opt.parable !== false) {
        const reds = items.filter((it) => it.accent).length + stacks.filter((S) => S.slots.some((sl) => String(sl.color).toLowerCase() === String(PAL.accent).toLowerCase())).length;
        if (reds > 1) add('warn', 0, M('红色太多', 'too much red'), M(`有 ${reds} 样红色的东西：寓言只留一个红色象征（STYLE.md §3）`, `${reds} red things: a parable keeps one red symbol (STYLE.md §3)`));
        if (!F.voiced && (F.duration < 14 || F.duration > 47)) add('warn', 0, M('时长', 'length'), M(`无声寓言 ${r2(F.duration)} 秒：15–45 秒最好（太短讲不出对比，太长没有旁白撑不住）`, `a wordless parable of ${r2(F.duration)} s: 15–45 s works best`));
        const words = F.texts.filter((x) => !['label', 'counter', 'caption'].includes(x.kind)).map((x) => x.text).join(' '), cjkN = (words.match(/[㐀-鿿]/g) || []).length, latN = words.replace(/[㐀-鿿]/g, ' ').split(/\s+/).filter((w) => /[a-z]/i.test(w)).length;
        if (!F.voiced && cjkN + latN * 1.5 > 36) add('warn', 0, M('字太多', 'too many words'), M(`无声寓言的字幕 / 标题一共 ${cjkN} 个字、${latN} 个词：故事要靠动作讲，字只留标签、计数和最后一句`, `the wordless parable shows ${cjkN} CJK characters and ${latN} words in titles / captions: let action tell it; keep labels, a counter and one closing line`));
      }
      return out;
    });
    draw(0);
    return P;
  };
})();
