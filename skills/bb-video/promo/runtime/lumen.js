// lumen.js: the dark cinematic motivational short (暗调励志动画) style, one of bb-video's visual styles (style notes in styles/lumen/STYLE.md). Load after promo.js.
// One frame: a stylized room drawn in code, almost all black, lit by ONE motivated light — a phone screen on a face, a red alarm clock, a desk lamp,
// dawn through a window — with rim light, a cast shadow on the wall, haze, bloom, grain and a vignette. One minimal cartoon protagonist (our own:
// a soft square "mochi" head, a mood cowlick, an oversized hoodie, no outlines — the light draws the form) acts everything with eyes and brows.
// A low second-person voice; slow push-ins that hold on the face; few words; big white thumbnail-style title cards with a dark stroke.
//
//   const L = PROMO.lumen(F, { grain: 0–1, vignette: 0–1, bloom: 0–1, colors, fonts, captions })
//   World units: 1 unit = 1 px of a 1080-high landscape frame at camera h = 1080. Portrait keeps the camera's height (the sides crop): aim at the subject.
//
//   CAST    L.cast({ you: { hair, hairColor, top, topColor, skin, build, height, glasses, tuft } })   then actors are called by name (styles/CHARACTERS.md)
//   SHOTS   const S = L.shot(a, b, { cam, fade, dip, out, ambient, bg, ph, sway })   a lit set in [a, b): hard cut (default), fade = crossfade in, dip = up from black, out = down to black
//           S.cam({ x, y, h, r } from, { … } to, ease)   S.keys([[t, { x, y, h, r }], …])   slow push-ins and drifts (h = visible world height; smaller = closer)
//           S.add(prop | [props])   set pieces from L.prop.* (each brings its albedo, its emissive parts and its lights)
//           S.light({ x, y, r, color, power, kind: 'point' | 'cone' | 'shaft', dir, spread, haze, flicker, at(t) })   a light of your own
//           S.expose(keys | fn)   exposure over time ([[t, v], …]): the lights dying is the style's dip ("the screen goes dark")
//           S.draw(fn, { order, pass: 'albedo' | 'emit' })   your own painter (c, t, S) in world units
//   ACTORS  const A = S.actor('you', { x, y, feet, s, rot, flip, pose, face, order, shadow, rim })
//           A.pose(at, name | {…}, dur)   A.face(at, name | {…}, dur)   A.look(at, x, y, dur)   A.move(at, { x, y, rot, s }, dur, ease)
//           A.hold(at, 'phone' | 'mug' | 'book' | 'dumbbell' | null, { hand, screen: 'face' | 'camera', glow })   A.act(a, b, kind, o)
//           poses: L.POSES (stand, slouch, phone, lie, ceiling, curl, sit, desk, slump, reach, stretch, fist, window, …)
//           faces: L.FACES (neutral, trance, tired, exhausted, empty, anxious, rage, shock, sad, guilty, resolve, calm, hope, smile, asleep, …)
//           acts:  scroll, walk, type, nod, shake, tremble, breathe, sigh, jolt, yawn, rub, sob, lift, run
//   INFO    L.roll(a, b, '23:30', '01:47')   a clock time function for L.prop.alarm / L.prop.clock (registers a clock)
//           L.meter(a, b, { label, value, from, to, max, unit, x, y, kind: 'battery' | 'tank' | 'ring', color, anchor })   a gauge drawn in light
//           L.bars(a, b, { title, items: [{ label, value, unit, hl }], max, x, y, w })   L.compare(a, b, { left, right, sign })
//           L.xray(a, b, actor, { organ: 'brain' | 'heart', labels: [{ text, at, side }], tint })   L.stat(a, b, { value, label, x, y })
//   TEXT    L.title(a, b, text, { sub, accent, size, y, dim })   thumbnail-style card (white, thick dark stroke)   L.word(a, b, text, { x, y, size })   L.cite(a, b, text)
//   COVER   L.cover({ a, b, title, sub, set(S), actor })   a thumbnail composition for out/cover.png (F.coverAt)
// Sounds the runtime emits (styles/lumen/sound.js): swipe, tick, beep, click, door, step, rustle, thud, heart, whoosh, hit, glow, buzz.
(function () {
  const P = window.PROMO;
  const M = (P && P.M) || ((zh, en) => (/^zh/i.test(document.documentElement.lang || '') ? zh : en));
  if (!P) throw new Error(M('lumen.js 要在 promo.js 之后加载', 'lumen.js must load after promo.js'));
  const { E, seg, set, el } = P;
  const rnd = (s) => window.EV.rng(s);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, q) => a + (b - a) * q;
  const sm = (q) => { q = clamp(q); return q * q * (3 - 2 * q); };
  const D2R = Math.PI / 180;
  const cjk = (s) => (String(s).match(/[㐀-鿿豈-﫿]/g) || []).length;
  const hex = (h) => { if (Array.isArray(h)) return h; const s = String(h).replace('#', ''), v = s.length === 3 ? s.split('').map((c) => parseInt(c + c, 16)) : [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); return v; };
  const rgba = (c, a = 1) => { const v = hex(c); return `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${clamp(a).toFixed(3)})`; };
  const mix = (a, b, q) => { const x = hex(a), y = hex(b); return [lerp(x[0], y[0], q), lerp(x[1], y[1], q), lerp(x[2], y[2], q)]; };
  const shade = (c, k) => { const v = hex(c); return [v[0] * k, v[1] * k, v[2] * k]; };
  const keyAt = (keys, t, def) => { let v = def; for (const k of keys) if (t >= k[0]) v = k[1]; return v; };
  const interpKeys = (keys, t) => { if (!keys.length) return 1; if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], E.sine((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]))); return keys[keys.length - 1][1]; };

  // ---------- poses (front-view rig; angles in degrees: arms / legs 0 = hanging down, + = swung out to the side; elbows / knees bend toward the middle) ----------
  const POSE0 = { lean: 0, bow: 0, tilt: 0, nod: 0, turn: 0, slump: 0, crouch: 0, aL: 8, aR: 8, eL: 10, eR: 10, hL: 3, hR: 3, kL: 0, kR: 0, thigh: 1, shin: 1, back: 0, armsBack: 0, legs: 1 };
  const POSES = {
    stand: {},
    slouch: { slump: 0.7, tilt: 5, nod: 0.35, aL: 4, aR: 4, eL: 4, eR: 4 },
    phone: { nod: 0.55, slump: 0.4, aL: 22, aR: 22, eL: 118, eR: 118 },          // standing / sitting, phone held in both hands at the chest
    lie: { aL: 38, aR: 38, eL: 128, eR: 128, hL: 4, hR: 4 },                      // lying on the back seen from above (place with rot: -90), the phone held over the face
    ceiling: { aL: 150, aR: 150, eL: 150, eR: 150, armsBack: 1, hL: 4, hR: 8 },   // lying, hands behind the head, staring up
    curl: { turn: 0.75, aL: 46, aR: 26, eL: 140, eR: 120, hL: 14, hR: 22, kL: 50, kR: 60, thigh: 0.8, shin: 0.85 },   // rolled onto the side, knees up
    flat: { aL: 14, aR: 14, eL: 8, eR: 8, hL: 4, hR: 4 },                          // lying still, arms by the sides
    sit: { thigh: 0.22, shin: 0.95, aL: 10, aR: 10, eL: 20, eR: 20, hL: 12, hR: 12 },   // sitting, seen from the front (thighs come toward us)
    situp: { thigh: 0.22, shin: 0.95, slump: 0.8, tilt: 10, nod: 0.4, aL: 6, aR: 10, eL: 6, eR: 8, legs: 0 },   // sitting up in bed, legs under the blanket
    desk: { thigh: 0.22, legs: 0, aL: 34, aR: 34, eL: 104, eR: 104, nod: 0.3 },      // at a desk, forearms on the table
    slump: { thigh: 0.22, legs: 0, bow: 0.6, nod: 1, tilt: 12, slump: 1, aL: 62, aR: 62, eL: 136, eR: 136 },   // head down on the arms at the desk
    reach: { aR: 82, eR: 4, lean: 4 },                                              // one arm out to the side (put something down, open a door)
    stretch: { aL: 165, aR: 165, eL: 10, eR: 10, tilt: -4 },
    fist: { aR: 26, eR: 140, aL: 10, eL: 14 },                                      // a quiet clenched fist at the chest
    window: { back: 1, aL: 6, aR: 14, eL: 6, eR: 30 },                              // seen from behind, facing a window
    back: { back: 1 },
    shrug: { aL: 40, aR: 40, eL: 120, eR: 120, slump: -0.3 },
    facepalm: { aR: 30, eR: 150, nod: 0.5, tilt: 8 },
    run: { lean: 0, aL: 30, aR: 30, eL: 90, eR: 90 },
    lift: { aL: 24, aR: 24, eL: 140, eR: 140 },                                     // dumbbells at the shoulders
  };
  // ---------- expressions ----------
  const FACE0 = { open: 0.9, lidTilt: 0, pupil: 1, lookX: 0, lookY: 0, browY: 0, browIn: 0, mouthOpen: 0, mouthCurve: 0, mouthW: 0.8, wobble: 0, teeth: 0, bags: 0, blush: 0, sweat: 0, tear: 0, squint: 0, tuft: 0 };
  const FACES = {
    neutral: {},
    trance: { open: 0.72, pupil: 0.5, lookY: 0.15, browY: -0.1, mouthW: 0.55, mouthCurve: -0.05, tuft: -0.2 },      // scrolling, glazed
    tired: { open: 0.42, lidTilt: 0.4, pupil: 0.85, browY: -0.25, browIn: 0.35, mouthCurve: -0.25, mouthW: 0.7, bags: 0.6, tuft: -0.6 },
    exhausted: { open: 0.2, lidTilt: 0.6, pupil: 0.8, browY: -0.45, browIn: 0.5, mouthOpen: 0.12, mouthCurve: -0.45, bags: 1, tuft: -1 },
    empty: { open: 0.82, pupil: 0.38, browY: -0.1, mouthW: 0.45, mouthCurve: -0.08, bags: 0.45, tuft: -0.5 },        // hollow stare
    anxious: { open: 1.06, pupil: 0.62, browY: 0.45, browIn: 0.95, mouthCurve: -0.4, mouthW: 0.7, wobble: 1, sweat: 0.9, tuft: 0.3 },
    rage: { open: 0.8, lidTilt: -1, pupil: 0.6, browY: -0.5, browIn: -1, mouthOpen: 0.45, teeth: 1, mouthCurve: -0.6, mouthW: 1.1, tuft: 1 },
    shock: { open: 1.32, pupil: 0.42, browY: 1, browIn: 0.3, mouthOpen: 0.7, mouthCurve: -0.2, mouthW: 0.7, tuft: 1 },
    sad: { open: 0.58, lidTilt: 0.75, browIn: 1, browY: 0.1, mouthCurve: -0.6, mouthW: 0.65, tear: 0.7, tuft: -0.8 },
    guilty: { open: 0.6, lookX: -0.6, lookY: 0.45, browIn: 0.75, browY: 0.05, mouthCurve: -0.3, mouthW: 0.55, tuft: -0.5 },
    resolve: { open: 0.74, lidTilt: -0.35, pupil: 1.05, browY: -0.3, browIn: -0.55, mouthCurve: -0.08, mouthW: 0.55, tuft: 0.8 },
    calm: { open: 0, browY: 0.1, browIn: 0.1, mouthCurve: 0.35, mouthW: 0.6, tuft: 0.2 },
    hope: { open: 1, pupil: 1.12, browY: 0.4, browIn: 0.3, mouthCurve: 0.45, mouthOpen: 0.08, tuft: 0.7 },
    smile: { open: 0.8, mouthCurve: 0.75, mouthOpen: 0.18, squint: 0.3, tuft: 0.5 },
    asleep: { open: 0, browY: -0.1, mouthOpen: 0.1, mouthW: 0.5, tuft: -0.3 },
    wince: { open: 0.1, squint: 0.8, browY: -0.4, browIn: 0.6, mouthOpen: 0.25, teeth: 1, mouthCurve: -0.5 },
  };
  const LOOK0 = { hair: 'mop', hairColor: '#2a2420', top: 'hoodie', topColor: '#c8963e', pants: '#3a3d47', skin: '#e8c29e', socks: '#d6d0c6', build: 1, height: 1, glasses: false, tuft: true };

  P.lumen = function (F, opt = {}) {
    const W = F.W, H = F.H, PT = F.portrait;
    const C = { title: '#ffffff', stroke: '#0b0b0d', accent: '#ffb648', cool: '#9cc9ff', warm: '#ffb05c', red: '#ff3b2f', text: '#efeae2', dim: '#9a958c', ...(opt.colors || {}) };
    const FONT = { heavy: '"Noto Sans SC", "PingFang SC", sans-serif', sans: '"Noto Sans SC", "PingFang SC", sans-serif', latin: '"Oswald", "Noto Sans SC", sans-serif', ...(opt.fonts || {}) };
    const L = { F, colors: C, fonts: FONT, POSES, FACES, P: (land, port) => (PT ? port : land) };
    F.blurBase(1);
    F.stillMax(0.8);
    F.stage.style.background = '#000';

    // ---------- canvases ----------
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const view = el('canvas', `left:0;top:0;width:${W}px;height:${H}px;z-index:5`, F.stage); view.width = W; view.height = H;
    const out = view.getContext('2d');
    const LR = 0.5, LW = Math.round(W * LR), LH = Math.round(H * LR);
    const cA = mk(W, H), xA = cA.getContext('2d');       // albedo
    const cL = mk(LW, LH), xL = cL.getContext('2d');     // light map (half resolution)
    const cS = mk(W, H), xS = cS.getContext('2d');       // shot composite (when two shots blend)
    const cR = mk(W, H), xR = cR.getContext('2d');       // rim scratch
    const cK = mk(LW, LH), xK = cK.getContext('2d');     // shadow scratch
    const BR = 0.25, cB = mk(Math.round(W * BR), Math.round(H * BR)), xB = cB.getContext('2d');   // bloom
    const actorCv = [];                                   // one canvas per actor drawn this frame
    const vig = el('div', `inset:0;z-index:40;pointer-events:none;background:radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 38%, rgba(0,0,0,${(0.78 * (opt.vignette ?? 0.7)).toFixed(2)}) 100%)`, F.stage); vig.dataset.motion = 'skip';
    const GA = opt.grain ?? 0.2, GR = 2, NT = 8, tiles = [];
    if (GA > 0) {
      const box = el('div', `inset:0;z-index:42;pointer-events:none;mix-blend-mode:overlay;opacity:${GA.toFixed(2)}`, F.stage); box.dataset.motion = 'skip';
      for (let k = 0; k < NT; k++) {
        const cv = el('canvas', `inset:0;width:${W}px;height:${H}px;display:none`, box); cv.width = Math.ceil(W / GR); cv.height = Math.ceil(H / GR); cv.dataset.motion = 'skip';
        const ctx = cv.getContext('2d'), img = ctx.createImageData(cv.width, cv.height), r = rnd(k * 7919 + 13);
        for (let i = 0; i < img.data.length; i += 4) { const v = 128 + ((r() + r() + r() - 1.5) * 70) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = clamp(v, 0, 255); img.data[i + 3] = 255; }
        ctx.putImageData(img, 0, 0); tiles.push(cv);
      }
      let last = -1;
      F.add((t) => { const k = Math.floor(t * 24 + 1e-6) % NT; if (k !== last) { if (last >= 0) tiles[last].style.display = 'none'; tiles[k].style.display = ''; last = k; } });
    }
    const textL = el('div', 'inset:0;z-index:60;pointer-events:none', F.stage);
    // captions: cinematic, no box, a soft shadow, low in the frame (portrait above the platform overlay)
    if (F.T && F.voiced && !F.caps) P.captions(F, { font: FONT.sans, weight: 500, size: PT ? 46 : 40, bg: 'rgba(0,0,0,0)', color: '#f4efe8', shadow: '0 0 12px rgba(0,0,0,.95), 0 2px 4px rgba(0,0,0,.9)', top: PT ? H * 0.74 : H * 0.88, ...(opt.captions || {}) });

    // ---------- cast ----------
    L.castList = {};
    L.cast = (list) => { Object.assign(L.castList, list); if (window.EV && window.EV.castCheck) window.EV.castCheck(list, (c) => ({ ...LOOK0, ...c }), 'lumen'); return L; };

    // ---------- shots ----------
    const shots = [];
    L.shots = shots;
    L.shot = (a, b, o = {}) => {
      const S = { a, b, bEnd: b, o, props: [], lights: [], draws: [], actors: [], expo: null, fade: o.fade ?? 0, dip: o.dip ?? 0, out: o.out ?? 0, ph: o.ph ?? 1, sway: o.sway ?? 1 };
      S.ambient = hex(o.ambient ?? [16, 18, 27]);
      S.bg = o.bg ?? '#0c0d12';
      const c0 = { x: 0, y: 0, h: 1080, r: 0, ...(o.cam || {}) };
      S._keys = [[a, c0], [b, { ...c0 }]];
      S.cam = (from = {}, to = {}, ease = E.sine) => { const f = { ...c0, ...from }; S._keys = [[a, f], [b, { ...f, ...to }]]; S._ease = ease; return S; };
      S.keys = (ks) => { S._keys = ks.map(([t, v], i) => [t, { ...c0, ...(i ? {} : {}), ...v }]); S._ease = E.cubicInOut; return S; };
      S.camAt = (t) => {
        const ks = S._keys, ease = S._ease || E.sine;
        let v = ks[0][1];
        if (t >= ks[ks.length - 1][0]) v = ks[ks.length - 1][1];
        else for (let i = 1; i < ks.length; i++) if (t < ks[i][0]) { const p = ks[i - 1], q = ks[i], u = ease(clamp((t - p[0]) / (q[0] - p[0]))); v = { x: lerp(p[1].x, q[1].x, u), y: lerp(p[1].y, q[1].y, u), h: lerp(p[1].h, q[1].h, u), r: lerp(p[1].r || 0, q[1].r || 0, u) }; break; }
        const sw = S.sway * v.h * 0.0016;   // a slow breathing drift: never a locked-off still
        return { x: v.x + sw * Math.sin(t * 0.53 + a), y: v.y + sw * 0.7 * Math.sin(t * 0.41 + 1.3 + a), h: v.h * (PT ? S.ph : 1), r: (v.r || 0) + 0.06 * S.sway * Math.sin(t * 0.37 + a) };
      };
      S.add = (p) => { for (const q of [].concat(p)) { if (!q) continue; S.props.push(q); if (q.attach) q.attach(S); } return S; };
      S.light = (lo) => { S.lights.push(lo); return lo; };
      S.expose = (k) => { S.expo = k; return S; };
      S.exposure = (t) => (typeof S.expo === 'function' ? S.expo(t) : Array.isArray(S.expo) ? interpKeys(S.expo, t) : 1);
      S.draw = (fn, d = {}) => { S.draws.push({ fn, order: d.order ?? 40, pass: d.pass ?? 'albedo' }); return S; };
      S.actor = (who, ao = {}) => actor(S, who, ao);
      // transitions
      if (S.fade > 0) { const prev = shots.filter((s) => Math.abs(s.b - a) < 0.05).pop(); if (prev) prev.bEnd = Math.max(prev.bEnd, a + S.fade); F.transition(a, a + S.fade); }
      else if (S.dip > 0) F.transition(a, a + S.dip);
      else if (a > 0.01) F.cut(a);
      if (S.out > 0) F.transition(b - S.out, b);
      shots.push(S);
      return S;
    };

    // world → screen
    const camMatrix = (S, t, res = 1, z = 1) => {
      const c = S.camAt(t), k = H / c.h;
      const c0 = S.camAt(S.a);
      const cx = c0.x + (c.x - c0.x) / z, cy = c0.y + (c.y - c0.y) / z, kz = (H / c0.h) * Math.pow(k / (H / c0.h), 1 / z);
      return new DOMMatrix().scale(res).translate(W / 2, H / 2).rotate(c.r).scale(kz).translate(-cx, -cy);
    };
    L.toScreen = (S, t, x, y) => { const p = camMatrix(S, t).transformPoint(new DOMPoint(x, y)); return [p.x, p.y]; };

    // ---------- lights ----------
    const lightNow = (S, lo, t) => {
      const p = lo.at ? lo.at(t) : lo;
      if (!p) return null;
      let pw = typeof lo.power === 'function' ? lo.power(t) : lo.power ?? 1;
      if (lo.flicker) pw *= 1 - lo.flicker * (0.5 + 0.5 * Math.sin(t * 23.7 + (lo.x || 0))) * (0.5 + 0.5 * Math.sin(t * 7.1));
      const col = typeof lo.color === 'function' ? lo.color(t) : lo.color ?? [255, 236, 210];
      return { ...lo, ...p, power: pw * S.exposure(t), color: hex(col) };
    };
    const allLights = (S, t) => {
      const ls = [];
      for (const lo of S.lights) { const v = lightNow(S, lo, t); if (v && v.power > 0.001) ls.push(v); }
      for (const pr of S.props) if (pr.lights) for (const lo of pr.lights(t) || []) { const v = lightNow(S, lo, t); if (v && v.power > 0.001) ls.push(v); }
      for (const A of S.actors) if (A.on(t)) for (const lo of A.lights(t)) { const v = lightNow(S, lo, t); if (v && v.power > 0.001) ls.push(v); }
      return ls;
    };
    const drawLight = (c, lo) => {
      const col = lo.color, pw = lo.power, r = lo.r ?? 400, kind = lo.kind ?? 'point';
      const stops = (g, k = 1) => { g.addColorStop(0, rgba(col, Math.min(1, pw * k))); g.addColorStop(0.22, rgba(col, Math.min(1, pw * 0.72 * k))); g.addColorStop(0.55, rgba(col, Math.min(1, pw * 0.3 * k))); g.addColorStop(1, rgba(col, 0)); };
      if (kind === 'shaft') {   // light through a window: a quad from the window's edge, stretched along dir, fading with distance; blinds cut it into slats
        const { x, y, w = 200, h = 300, dir = [0.5, 1], len = 900, spread = 1.3, slats = 0 } = lo;
        const n = slats || 1;
        for (let i = 0; i < n; i++) {
          const y0 = y + (h * i) / n, y1 = y + (h * (i + (slats ? 0.55 : 1))) / n;
          const g = c.createLinearGradient(x, y0, x + dir[0] * len, y0 + dir[1] * len);
          g.addColorStop(0, rgba(col, Math.min(1, pw * 0.75))); g.addColorStop(0.6, rgba(col, Math.min(1, pw * 0.22))); g.addColorStop(1, rgba(col, 0));
          c.fillStyle = g; c.beginPath();
          c.moveTo(x, y0); c.lineTo(x + w, y0); c.lineTo(x + w * spread + dir[0] * len, y1 + dir[1] * len); c.lineTo(x - w * (spread - 1) + dir[0] * len, y0 + dir[1] * len); c.lineTo(x, y1); c.closePath(); c.fill();
        }
        const g2 = c.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 1.4); stops(g2, 0.5); c.fillStyle = g2; c.fillRect(x + w / 2 - Math.max(w, h) * 1.4, y + h / 2 - Math.max(w, h) * 1.4, Math.max(w, h) * 2.8, Math.max(w, h) * 2.8);
        return;
      }
      const g = c.createRadialGradient(lo.x, lo.y, 0, lo.x, lo.y, r); stops(g);
      c.fillStyle = g;
      if (kind === 'cone') {   // a lamp: a soft wedge along dir, plus a little spill all round
        const ang = Math.atan2(lo.dir ? lo.dir[1] : 1, lo.dir ? lo.dir[0] : 0), sp = (lo.spread ?? 40) * D2R;
        for (const [k, a2] of [[1, sp], [0.45, sp * 1.35]]) { c.save(); c.globalAlpha = k; c.beginPath(); c.moveTo(lo.x, lo.y); c.arc(lo.x, lo.y, r, ang - a2, ang + a2); c.closePath(); c.fill(); c.restore(); }
        const g3 = c.createRadialGradient(lo.x, lo.y, 0, lo.x, lo.y, r * 0.35); stops(g3, 0.6); c.fillStyle = g3; c.fillRect(lo.x - r * 0.35, lo.y - r * 0.35, r * 0.7, r * 0.7);
      } else c.fillRect(lo.x - r, lo.y - r, r * 2, r * 2);
    };

    // ---------- rendering one shot into ctx ----------
    const renderShot = (S, t, ctx) => {
      const m1 = camMatrix(S, t), mL = camMatrix(S, t, LR);
      const ls = allLights(S, t);
      S._ls = ls;
      // 1. albedo
      xA.setTransform(1, 0, 0, 1, 0, 0); xA.globalCompositeOperation = 'source-over'; xA.fillStyle = S.bg; xA.fillRect(0, 0, W, H);
      const items = [...S.props.filter((p) => p.albedo).map((p) => ({ order: p.order ?? 10, z: p.z ?? 1, fn: (c) => p.albedo(c, t, S) })), ...S.draws.filter((d) => d.pass === 'albedo').map((d) => ({ order: d.order, z: 1, fn: (c) => d.fn(c, t, S) }))];
      const acts = S.actors.filter((A) => A.on(t));
      acts.forEach((A, i) => items.push({ order: A.order, actor: A, i }));
      items.sort((p, q) => p.order - q.order);
      for (const it of items) {
        if (it.actor) {
          const cv = actorCv[it.i] || (actorCv[it.i] = mk(W, H)), cx = cv.getContext('2d');
          cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, W, H); cx.setTransform(m1);
          it.actor.draw(cx, t, ls, 'albedo');
          xA.setTransform(1, 0, 0, 1, 0, 0); xA.drawImage(cv, 0, 0);
          it.actor._cv = cv;
        } else { xA.setTransform(it.z === 1 ? m1 : camMatrix(S, t, 1, it.z)); xA.save(); it.fn(xA); xA.restore(); }
      }
      // 2. light map
      xL.setTransform(1, 0, 0, 1, 0, 0); xL.globalCompositeOperation = 'source-over'; xL.fillStyle = rgba(S.ambient); xL.fillRect(0, 0, LW, LH);
      xL.setTransform(mL); xL.globalCompositeOperation = 'lighter';
      for (const lo of ls) drawLight(xL, lo);
      // cast shadows: the actor's silhouette thrown away from its light onto the wall
      for (const A of acts) {
        const sh = A.o.shadow; if (!sh || !A._cv) continue;
        const lo = A.keyLight(ls, t); if (!lo) continue;
        const [lx, ly] = [m1.transformPoint(new DOMPoint(lo.x, lo.y)).x, m1.transformPoint(new DOMPoint(lo.x, lo.y)).y];
        const k = sh.scale ?? 1.6, dx = sh.dx ?? 0, dy = sh.dy ?? 0;
        xK.setTransform(1, 0, 0, 1, 0, 0); xK.globalCompositeOperation = 'source-over'; xK.clearRect(0, 0, LW, LH);
        xK.filter = `blur(${(sh.blur ?? 10) * LR}px)`;
        xK.setTransform(LR * k, 0, 0, LR * k, LR * (lx - k * lx + dx), LR * (ly - k * ly + dy)); xK.drawImage(A._cv, 0, 0);
        xK.filter = 'none'; xK.setTransform(1, 0, 0, 1, 0, 0); xK.globalCompositeOperation = 'source-in'; xK.fillStyle = `rgba(0,0,0,${clamp((sh.alpha ?? 0.75) * Math.min(1, lo.power * 1.4))})`; xK.fillRect(0, 0, LW, LH);
        xL.setTransform(1, 0, 0, 1, 0, 0); xL.globalCompositeOperation = 'destination-out'; xL.drawImage(cK, 0, 0);
        xL.globalCompositeOperation = 'source-over';
        xL.globalCompositeOperation = 'destination-over'; xL.fillStyle = rgba(S.ambient); xL.fillRect(0, 0, LW, LH); xL.globalCompositeOperation = 'source-over';
      }
      // 3. composite: albedo × light
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(cA, 0, 0);
      ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(cL, 0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      // 4. rim light on actors (a crescent on the side facing their light) and light wrap
      for (const A of acts) {
        if (!A._cv || A.o.rim === 0) continue;
        const lo = A.keyLight(ls, t); if (!lo) continue;
        const hp = m1.transformPoint(new DOMPoint(A.now.head[0], A.now.head[1])), lp = m1.transformPoint(new DOMPoint(lo.x, lo.y));
        let dx = lp.x - hp.x, dy = lp.y - hp.y; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
        const sc = m1.a ? Math.hypot(m1.a, m1.b) : 1, st = clamp(lo.str * (A.o.rim ?? 1));
        for (const [wpx, al] of [[3, 0.7], [9, 0.16]]) {
          xR.setTransform(1, 0, 0, 1, 0, 0); xR.globalCompositeOperation = 'source-over'; xR.clearRect(0, 0, W, H); xR.drawImage(A._cv, 0, 0);
          xR.globalCompositeOperation = 'destination-out'; xR.drawImage(A._cv, -dx * wpx * sc, -dy * wpx * sc);
          const rr = Math.max(60, (lo.r ?? 400) * sc * 1.25), rg = xR.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, rr); rg.addColorStop(0, rgba(lo.color, al * st)); rg.addColorStop(0.6, rgba(lo.color, al * st * 0.45)); rg.addColorStop(1, rgba(lo.color, 0));   // the rim fades with distance from its light
          xR.globalCompositeOperation = 'source-in'; xR.fillStyle = rg; xR.fillRect(0, 0, W, H);
          ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(cR, 0, 0); ctx.globalCompositeOperation = 'source-over';
        }
      }
      // 5. emissive parts (screens, digits, the sky in a window, catchlights)
      ctx.save(); ctx.setTransform(m1);
      const ems = [...S.props.filter((p) => p.emit).map((p) => ({ order: p.order ?? 10, fn: () => p.emit(ctx, t, S) })), ...S.draws.filter((d) => d.pass === 'emit').map((d) => ({ order: d.order, fn: () => d.fn(ctx, t, S) })), ...acts.map((A) => ({ order: A.order, fn: () => A.draw(ctx, t, ls, 'emit') }))].sort((p, q) => p.order - q.order);
      const ex = S.exposure(t);
      for (const e of ems) { ctx.save(); ctx.globalAlpha = clamp(ex); e.fn(); ctx.restore(); }
      // 6. haze: light scattered in the air around each hazy light, and dust drifting through it
      for (const lo of ls) {
        const hz = lo.haze ?? 0.35; if (hz <= 0) continue;
        const R = (lo.r ?? 400) * (lo.kind === 'shaft' ? 1.4 : 1.1), cx = lo.kind === 'shaft' ? lo.x + (lo.w ?? 200) / 2 + (lo.dir ? lo.dir[0] : 0) * 200 : lo.x, cy = lo.kind === 'shaft' ? lo.y + (lo.h ?? 300) / 2 + (lo.dir ? lo.dir[1] : 1) * 200 : lo.y;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, rgba(lo.color, clamp(0.16 * hz * lo.power))); g.addColorStop(0.5, rgba(lo.color, clamp(0.05 * hz * lo.power))); g.addColorStop(1, rgba(lo.color, 0));
        ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
        if (lo.dust !== false) {
          const r = rnd(Math.round((lo.x || 0) + (lo.y || 0) * 3) + 77), n = lo.dust ?? 26;
          for (let i = 0; i < n; i++) {
            const a0 = r() * 6.283, d0 = Math.sqrt(r()) * R * 0.75, sp = 0.3 + r();
            const px = cx + Math.cos(a0) * d0 + Math.sin(t * 0.21 * sp + i) * 22, py = cy + Math.sin(a0) * d0 + ((t * 9 * sp + i * 37) % 80) - 40;
            const f = 1 - Math.hypot(px - cx, py - cy) / R; if (f <= 0) continue;
            ctx.fillStyle = rgba(lo.color, clamp(f * f * 0.55 * hz * lo.power * (0.5 + 0.5 * Math.sin(t * 1.3 * sp + i))));
            ctx.beginPath(); ctx.arc(px, py, 1.1 + r() * 1.6, 0, 6.283); ctx.fill();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
      // fog: a grey-blue veil over the picture (the morning after, a foggy head); o.fog = 0–1 or a function of t
      const fg = typeof S.o.fog === 'function' ? S.o.fog(t) : S.o.fog ?? 0;
      if (fg > 0.01) { ctx.setTransform(1, 0, 0, 1, 0, 0); const r = rnd(7); ctx.globalCompositeOperation = 'screen'; for (let i = 0; i < 6; i++) { const fx = (r() * 1.4 - 0.2 + Math.sin(t * 0.07 + i) * 0.08) * W, fy = (0.3 + r() * 0.6) * H, R2 = (0.35 + r() * 0.3) * W, g = ctx.createRadialGradient(fx, fy, 0, fx, fy, R2); g.addColorStop(0, `rgba(120,130,150,${(0.22 * fg).toFixed(3)})`); g.addColorStop(1, 'rgba(120,130,150,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); } ctx.globalCompositeOperation = 'source-over'; }
      // the shot's own fade in / out (dip from black, down to black)
      let k = 1;
      if (S.dip > 0) k = Math.min(k, seg(t, S.a, S.a + S.dip, E.sine));
      if (S.out > 0) k = Math.min(k, 1 - seg(t, S.b - S.out, S.b, E.sine));
      if (k < 1) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(0,0,0,${(1 - k).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    };
    // overlays drawn in screen space after the picture (gauges, charts, x-ray labels)
    const overlays = [];
    L.overlay = (a, b, fn, order = 50) => { overlays.push({ a, b, fn, order }); overlays.sort((p, q) => p.order - q.order); };

    F.add((t) => {
      out.setTransform(1, 0, 0, 1, 0, 0); out.globalCompositeOperation = 'source-over'; out.globalAlpha = 1; out.fillStyle = '#000'; out.fillRect(0, 0, W, H);
      const live = shots.filter((S) => t >= S.a - 1e-6 && t < S.bEnd);
      live.forEach((S, i) => {
        const fadeK = S.fade > 0 && i > 0 ? seg(t, S.a, S.a + S.fade, E.sine) : 1;
        if (fadeK >= 1 || i === 0) renderShot(S, t, out);
        else { renderShot(S, t, xS); out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = fadeK; out.drawImage(cS, 0, 0); out.globalAlpha = 1; }
      });
      // bloom: everything bright glows a little into the dark
      const bl = opt.bloom ?? 0.55;
      if (bl > 0 && live.length) {
        xB.setTransform(1, 0, 0, 1, 0, 0); xB.globalCompositeOperation = 'source-over'; xB.filter = 'none'; xB.clearRect(0, 0, cB.width, cB.height);
        xB.filter = `blur(${Math.round(6 * (W / 1920 + H / 1080) / 2 + 2)}px) brightness(1.1)`; xB.drawImage(view, 0, 0, cB.width, cB.height); xB.filter = 'none';
        out.globalCompositeOperation = 'screen'; out.globalAlpha = bl; out.drawImage(cB, 0, 0, W, H); out.globalAlpha = 1; out.globalCompositeOperation = 'source-over';
      }
      for (const o of overlays) if (t >= o.a - 0.05 && t < o.b + 0.05) { out.save(); out.setTransform(1, 0, 0, 1, 0, 0); o.fn(out, t); out.restore(); }
    });

    // ---------- the character ----------
    const actor = (S, who, ao = {}) => {
      const look = { ...LOOK0, ...(who && L.castList[who] ? L.castList[who] : {}), ...(ao.look || {}) };
      if (who && !L.castList[who] && Object.keys(L.castList).length) console.warn(M(`lumen：角色表里没有"${who}"：先 L.cast({ ${who}: { … } })`, `lumen: "${who}" is not in the cast: first L.cast({ ${who}: { … } })`));
      const seed = (window.EV.hashStr ? window.EV.hashStr(String(who) + S.a) : 7) % 1000;
      const st = { x: ao.x ?? 0, y: ao.y ?? 0, s: ao.s ?? 1, rot: ao.rot ?? 0, flip: ao.flip ? -1 : 1 };
      const LEG = 150 * look.height;   // pelvis to sole
      if (ao.feet !== undefined) st.y = ao.feet - LEG * st.s;
      const A = { S, who, look, o: ao, order: ao.order ?? 50, poseK: [], faceK: [], lookK: [], moveK: [], holdK: [], acts: [], blinks: [], now: { head: [st.x, st.y - 210] } };
      const until = ao.until ?? 1e9, from = ao.from ?? -1e9;
      A.on = (t) => t >= from && t < until;
      const asObj = (v, lib, base) => (typeof v === 'string' ? (lib[v] || (console.warn(M(`lumen：没有这个${lib === POSES ? '姿势' : '表情'}："${v}"`, `lumen: no such ${lib === POSES ? 'pose' : 'expression'}: "${v}"`)), {})) : v || {});
      const P0 = { ...POSE0, ...asObj(ao.pose ?? 'stand', POSES) }, F0 = { ...FACE0, ...asObj(ao.face ?? 'neutral', FACES) };
      A.pose = (at, v, dur = 0.7, ease = E.cubicInOut) => { A.poseK.push({ at, v: { ...POSE0, ...asObj(v, POSES) }, dur, ease }); A.poseK.sort((p, q) => p.at - q.at); return A; };
      A.face = (at, v, dur = 0.35) => { A.faceK.push({ at, v: { ...FACE0, ...asObj(v, FACES) }, dur }); A.faceK.sort((p, q) => p.at - q.at); return A; };
      A.look = (at, x, y, dur = 0.25) => { A.lookK.push({ at, v: [x, y], dur }); A.lookK.sort((p, q) => p.at - q.at); return A; };
      A.move = (at, v, dur = 1, ease = E.cubicInOut) => { A.moveK.push({ at, v, dur, ease }); A.moveK.sort((p, q) => p.at - q.at); return A; };
      A.hold = (at, what, o = {}) => { const prev = A.holdK.filter((h) => h.at <= at).pop(); if (prev && prev.what === 'phone' && prev.o.glow !== false && (what !== 'phone' || o.glow === false) && at > 0) F.appear(at); A.holdK.push({ at, what, o }); A.holdK.sort((p, q) => p.at - q.at); return A; };   // a screen switching off is a deliberate jump in light
      A.act = (a, b, kind, o = {}) => {
        A.acts.push({ a, b, kind, o });
        if (kind === 'scroll' && o.sfx !== false) { const ev = o.every ?? 1.1; for (let t2 = a + 0.3; t2 < b - 0.2; t2 += ev) F.sfx(t2, 'swipe', o.gain ?? 0.22); }
        if (kind === 'walk' && o.sfx !== false) for (let t2 = a + 0.15; t2 < b - 0.1; t2 += 0.42) F.sfx(t2, 'step', 0.2);
        if (kind === 'type' && o.sfx !== false) for (let t2 = a; t2 < b; t2 += 0.16) F.sfx(t2, 'key', 0.12);
        if (kind === 'jolt') { F.appear(a + 0.1); if (o.sfx !== false) F.sfx(a, 'hit', 0.5); }
        if (kind === 'sigh' && o.sfx !== false) F.sfx(a, 'breath', 0.35);
        if (kind === 'tremble' && o.heart) for (let t2 = a; t2 < b; t2 += 0.8) { F.sfx(t2, 'heart', 0.45); }
        return A;
      };
      A.blink = (at) => { A.blinks.push(at); return A; };
      if (ao.hold) A.hold(-1e9, ao.hold, ao.holdOpts || {});
      S.actors.push(A);
      // cast silhouettes and faces count as story pictures only when the face is acting (an expression change): F.info('acting') per expression key
      const blend = (keys, base, t) => {
        let v = base;
        for (const k of keys) { if (t < k.at) break; const q = (k.ease || E.sine)(clamp((t - k.at) / Math.max(0.01, k.dur))); if (q >= 1) v = k.v; else { const o2 = {}; for (const n in k.v) o2[n] = typeof k.v[n] === 'number' ? lerp(v[n] ?? 0, k.v[n], q) : q > 0.5 ? k.v[n] : v[n]; v = o2; } }
        return v;
      };
      const stateAt = (t) => {
        const pose = { ...blend(A.poseK, P0, t) }, face = { ...blend(A.faceK, F0, t) };
        let lx = face.lookX, ly = face.lookY;
        for (const k of A.lookK) { if (t < k.at) break; const q = E.sine(clamp((t - k.at) / k.dur)); lx = lerp(lx, k.v[0], q); ly = lerp(ly, k.v[1], q); }
        face.lookX = lx; face.lookY = ly;
        let x = st.x, y = st.y, rot = st.rot, s = st.s;
        for (const k of A.moveK) { if (t < k.at) break; const q = k.ease(clamp((t - k.at) / k.dur)); if (k.v.x !== undefined) x = lerp(x, k.v.x, q); if (k.v.feet !== undefined) y = lerp(y, k.v.feet - LEG * s, q); if (k.v.y !== undefined) y = lerp(y, k.v.y, q); if (k.v.rot !== undefined) rot = lerp(rot, k.v.rot, q); if (k.v.s !== undefined) s = lerp(s, k.v.s, q); }
        // acts (additive)
        let bob = 0, walkPh = null, scroll = 0, thumb = 0, shakeH = 0, tremble = 0, typeK = 0, jolt = 0, sigh = 0, liftK = 0, yawn = 0, rub = 0, sob = 0;
        for (const ac of A.acts) {
          if (t < ac.a - 0.4 || t > ac.b + 0.6) continue;
          const env = Math.min(seg(t, ac.a, ac.a + 0.35), 1 - seg(t, ac.b, ac.b + 0.4)), u = t - ac.a;
          if (ac.kind === 'walk' || ac.kind === 'run') { if (t >= ac.a && t < ac.b) { walkPh = u * (ac.kind === 'run' ? 11 : 7.4); bob = Math.abs(Math.sin(walkPh)) * (ac.kind === 'run' ? 14 : 6) * env; } }
          if (ac.kind === 'scroll') { const ev = ac.o.every ?? 1.1, ph = ((u - 0.3) % ev + ev) % ev; thumb = env * (ph < 0.22 ? Math.sin((ph / 0.22) * Math.PI) : 0); scroll += Math.max(0, Math.floor((u - 0.3) / ev) + 1 + E.expoOut(clamp(ph / 0.35)) - 1) * (t >= ac.a ? 1 : 0); }
          if (ac.kind === 'shake') shakeH += env * Math.sin(u * 13) * 9;
          if (ac.kind === 'nod') pose.nod += env * 0.35 * Math.max(0, Math.sin(u * 7));
          if (ac.kind === 'tremble') tremble += env * (ac.o.amount ?? 1);
          if (ac.kind === 'type') typeK += env;
          if (ac.kind === 'jolt') jolt = Math.max(jolt, Math.max(0, 1 - Math.abs(u - 0.12) / 0.3) * (t >= ac.a ? 1 : 0));
          if (ac.kind === 'sigh') sigh = Math.max(sigh, Math.sin(clamp(u / (ac.b - ac.a)) * Math.PI) * (t >= ac.a && t <= ac.b ? 1 : 0));
          if (ac.kind === 'lift') liftK = env * (0.5 - 0.5 * Math.cos(u * 3.4));
          if (ac.kind === 'yawn') yawn = Math.max(yawn, Math.sin(clamp(u / (ac.b - ac.a)) * Math.PI) * (t >= ac.a && t <= ac.b ? 1 : 0));
          if (ac.kind === 'rub') rub = Math.max(rub, env);
          if (ac.kind === 'sob') sob = Math.max(sob, env);
          if (ac.kind === 'breathe') pose.slump -= env * 0.25 * (0.5 + 0.5 * Math.sin(u * 1.4));
        }
        // breathing (always), a tremble, a startle, a sigh
        const br = Math.sin(t * 1.9 + seed) * (1 + sigh * 2.5);
        pose.breath = br; pose.tilt += shakeH * 0.15 + tremble * Math.sin(t * 41) * 1.2 + sob * Math.sin(t * 9) * 2; pose.turn += shakeH * 0.02;
        pose.slump += sigh * 0.5 - jolt * 0.6 + sob * 0.3;
        if (walkPh !== null) { const sw = Math.sin(walkPh); pose.aL += sw * 16; pose.aR -= sw * 16; pose.liftL = Math.max(0, sw); pose.liftR = Math.max(0, -sw); }
        if (typeK) { pose.eL += Math.sin(t * 19) * 6 * typeK; pose.eR += Math.sin(t * 17 + 1) * 6 * typeK; }
        if (liftK) { pose.eL = lerp(pose.eL, 20, 1 - liftK); pose.eR = lerp(pose.eR, 20, 1 - liftK); }
        if (yawn) { face.mouthOpen = Math.max(face.mouthOpen, yawn * 0.95); face.open *= 1 - yawn * 0.9; face.mouthW = lerp(face.mouthW, 0.6, yawn); pose.aL = lerp(pose.aL, 150, yawn * 0.7); pose.aR = lerp(pose.aR, 150, yawn * 0.7); pose.tilt -= yawn * 6; }
        if (rub) { pose.aR = lerp(pose.aR, 24, rub); pose.eR = lerp(pose.eR, 158, rub); face.open *= 1 - rub * 0.8; }
        if (sob) face.tear = Math.max(face.tear, sob);
        if (jolt) { face.open = Math.max(face.open, 1.25 * jolt + face.open * (1 - jolt)); face.browY += jolt * 0.8; face.pupil = lerp(face.pupil, 0.45, jolt); }
        // blinks: auto every few seconds (deterministic) plus explicit ones; held eyes (open < 0.1) don't blink
        let bk = 0; const rb = rnd(seed + 5);
        if (ao.blink !== false) for (let tb = (S.a || 0) + 0.8 + rb() * 2; tb < S.b; tb += 2.6 + rb() * 3.2) { const d = t - tb; if (d > 0 && d < 0.2) bk = Math.max(bk, Math.sin((d / 0.2) * Math.PI)); }
        for (const tb of A.blinks) { const d = t - tb; if (d > 0 && d < 0.22) bk = Math.max(bk, Math.sin((d / 0.22) * Math.PI)); }
        face.open *= 1 - bk;
        // what's in the hands
        let hold = null; for (const h of A.holdK) if (t >= h.at) hold = h.what ? h : null;
        return { pose, face, x, y: y - bob - jolt * 26, rot, s, scroll, thumb, hold, walkPh };
      };
      A.stateAt = stateAt;
      // skeleton in local coordinates (pelvis at 0,0; up is −y)
      const skel = (p) => {
        const bw = look.build, hh = look.height, lean = p.lean * D2R;
        const R = (x, y, a2) => [x * Math.cos(a2) - y * Math.sin(a2), x * Math.sin(a2) + y * Math.cos(a2)];
        const pel = [0, p.crouch * 40];
        const torsoLen = (148 - p.bow * 52 - p.slump * 10 + (p.breath || 0) * 1.6) * hh;
        const nk = R(0, -torsoLen, lean); const neck = [pel[0] + nk[0], pel[1] + nk[1]];
        const hd = R(0, -66 + p.nod * 14 + p.slump * 6, lean + p.tilt * D2R); const head = [neck[0] + hd[0], neck[1] + hd[1]];
        const shW = 56 * bw * (1 - Math.abs(p.turn) * 0.22) * (1 - p.slump * 0.06);
        const sh = (s) => { const v = R(s * shW, 14 + p.slump * 9 + (p.breath || 0) * -1, lean); return [neck[0] + v[0], neck[1] + v[1]]; };
        const dir = (s, a2) => R(s * Math.sin(a2 * D2R), Math.cos(a2 * D2R), lean);
        const arm = (s, a2, e2) => { const S0 = sh(s), d1 = dir(s, a2), E1 = [S0[0] + d1[0] * 64 * hh, S0[1] + d1[1] * 64 * hh], d2 = dir(s, a2 - e2), H1 = [E1[0] + d2[0] * 60 * hh, E1[1] + d2[1] * 60 * hh]; return { s: S0, e: E1, h: H1, ang: Math.atan2(d2[1], d2[0]) }; };
        const leg = (s, a2, k2, lift = 0) => { const hp = [pel[0] + s * 28 * bw, pel[1] + 6], d1 = [s * Math.sin(a2 * D2R), Math.cos(a2 * D2R)], K = [hp[0] + d1[0] * 70 * hh * p.thigh, hp[1] + d1[1] * 70 * hh * p.thigh], d2 = [s * Math.sin((a2 - k2) * D2R), Math.cos((a2 - k2) * D2R)], sl = p.shin * (1 - lift * 0.32), An = [K[0] + d2[0] * 64 * hh * sl, K[1] + d2[1] * 64 * hh * sl]; return { h: hp, k: K, a: An }; };
        return { pel, neck, head, armL: arm(-1, p.aL, p.eL), armR: arm(1, p.aR, p.eR), legL: leg(-1, p.hL, p.kL, p.liftL || 0), legR: leg(1, p.hR, p.kR, p.liftR || 0) };
      };
      const placeM = (s0) => new DOMMatrix().translate(s0.x, s0.y).rotate(s0.rot).scale(s0.s * st.flip, s0.s);
      const toWorld = (m, p) => { const q = m.transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; };
      // the held phone: where it is and where its light falls (world)
      const phoneAt = (sk, s0, hold) => {
        const two = hold.o.hand === 'both' || (hold.o.hand === undefined && Math.abs(s0.pose.eL - s0.pose.eR) < 30 && s0.pose.eL > 80);
        const hp = two ? [(sk.armL.h[0] + sk.armR.h[0]) / 2, (sk.armL.h[1] + sk.armR.h[1]) / 2 - 10] : (hold.o.hand === 'L' ? sk.armL.h : sk.armR.h);
        return hp;
      };
      A.lights = (t) => {
        const s0 = stateAt(t); if (!s0.hold || s0.hold.what !== 'phone' || s0.hold.o.glow === false) return [];
        const sk = skel(s0.pose), m = placeM(s0), hp = toWorld(m, phoneAt(sk, s0, s0.hold)), hd = toWorld(m, sk.head);
        const toward = [hd[0] - hp[0], hd[1] - hp[1]], dl = Math.hypot(...toward) || 1;
        const feed = feedColor(seed, s0.scroll), pw = (s0.hold.o.power ?? 1) * (0.92 + 0.08 * Math.sin(t * 3.1));
        const off = Math.min(dl * 0.4, 70 * s0.s);   // the screen faces the face: centre its light between them
        return [{ x: hp[0] + (toward[0] / dl) * off, y: hp[1] + (toward[1] / dl) * off, r: (s0.hold.o.r ?? 440) * s0.s, color: s0.hold.o.color ?? feed, power: pw * 1.5, haze: 0.45, kind: 'point', screen: true, dust: 14 }];
      };
      // the light that lights this actor most (for form shading, rim, catchlights, shadow)
      A.keyLight = (ls, t) => {
        const hd = A.now.head; let best = null, bv = 0;
        for (const lo of ls) {
          let lx = lo.x, ly = lo.y; if (lo.kind === 'shaft') { lx = lo.x + (lo.w ?? 200) / 2; ly = lo.y + (lo.h ?? 300) / 2; }
          const d = Math.hypot(lx - hd[0], ly - hd[1]), R = (lo.r ?? 400) * (lo.kind === 'shaft' ? 2.2 : 1.1);
          let v = lo.power * Math.max(0, 1 - d / R) ** 1.3;
          if (lo.kind === 'cone' && d > 1) { const dv = lo.dir || [0, 1], dn = Math.hypot(dv[0], dv[1]) || 1, ca = ((hd[0] - lx) * dv[0] + (hd[1] - ly) * dv[1]) / (d * dn), sp = Math.cos((lo.spread ?? 40) * 1.35 * D2R); v *= clamp((ca - sp) / (1 - sp) * 2.5); }
          if (v > bv) { bv = v; best = { ...lo, x: lx, y: ly, str: clamp(v * 2.4) }; }
        }
        return best;
      };
      A.draw = (c, t, ls, pass) => {
        const s0 = stateAt(t), sk = skel(s0.pose), m = placeM(s0);
        A.now = { head: toWorld(m, sk.head), x: s0.x, y: s0.y, s: s0.s, hands: [toWorld(m, sk.armL.h), toWorld(m, sk.armR.h)] };
        const kl = A.keyLight(ls, t);
        // light direction in local coordinates (for form shading)
        let ld = [0.3, -0.8];
        if (kl) { const inv = m.inverse(), p1 = inv.transformPoint(new DOMPoint(kl.x, kl.y)); const dx = p1.x - sk.head[0], dy = p1.y - sk.head[1], d = Math.hypot(dx, dy) || 1; ld = [dx / d, dy / d]; }
        c.save();
        if (ao.cut !== undefined) { const cut = typeof ao.cut === 'function' ? ao.cut(t) : ao.cut; c.beginPath(); c.rect(-1e5, -1e5, 2e5, 1e5 + cut); c.clip(); }   // hidden below a line (behind a desk, a counter, a bed's edge)
        c.setTransform(c.getTransform().multiply(m));
        drawFigure(c, sk, s0, look, ld, pass, kl, t, seed);
        c.restore();
      };
      // registered: the acting face (each expression change is a moment of story)
      return A;
    };

    // ---------- drawing the figure ----------
    const lin = (c, x0, y0, x1, y1, ld, col, k = 0.55) => { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = Math.max(30, Math.hypot(x1 - x0, y1 - y0) / 2); const g = c.createLinearGradient(cx + ld[0] * r, cy + ld[1] * r, cx - ld[0] * r, cy - ld[1] * r); g.addColorStop(0, rgba(mix(col, '#ffffff', 0.08))); g.addColorStop(0.55, rgba(col)); g.addColorStop(1, rgba(mix(shade(col, k), [40, 46, 70], 0.25))); return g; };
    const radial = (c, x, y, r, ld, col, k = 0.5) => { const g = c.createRadialGradient(x + ld[0] * r * 0.45, y + ld[1] * r * 0.45, r * 0.1, x, y, r * 1.15); g.addColorStop(0, rgba(mix(col, '#ffffff', 0.1))); g.addColorStop(0.6, rgba(col)); g.addColorStop(1, rgba(mix(shade(col, k), [40, 46, 70], 0.25))); return g; };
    const limb = (c, pts, w0, w1, fill) => {   // a soft tapered limb through 3 points
      c.fillStyle = fill; c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = fill; c.lineWidth = (w0 + w1) / 2; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.stroke();
    };
    const squircle = (c, w, h, n = 2.7, jaw = 0.05) => { c.beginPath(); for (let i = 0; i <= 64; i++) { const a2 = (i / 64) * Math.PI * 2, ca = Math.cos(a2), sa = Math.sin(a2), x = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / n) * w / 2, y = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / n) * h / 2; const xx = x * (1 + jaw * (y / (h / 2))); i ? c.lineTo(xx, y) : c.moveTo(xx, y); } c.closePath(); };
    const HW = 156, HH = 136;
    function drawFigure(c, sk, s0, look, ld, pass, kl, t, seed) {
      const p = s0.pose, f = s0.face, back = p.back > 0.5, turn = clamp(p.turn, -1, 1);
      const skin = look.skin, top = look.topColor, hair = look.hairColor;
      if (pass === 'emit') { drawEmit(c, sk, s0, look, kl, t, seed); return; }
      const arms = () => {
        for (const [A2, s] of [[sk.armL, -1], [sk.armR, 1]]) {
          limb(c, [A2.s, A2.e, A2.h], 36, 32, lin(c, A2.s[0], A2.s[1], A2.h[0], A2.h[1], ld, top));
          // cuff + hand
          const cx = lerp(A2.e[0], A2.h[0], 0.82), cy = lerp(A2.e[1], A2.h[1], 0.82);
          c.fillStyle = rgba(shade(top, 0.8)); c.beginPath(); c.arc(cx, cy, 17, 0, 6.283); c.fill();
          c.fillStyle = radial(c, A2.h[0], A2.h[1], 15, ld, skin); c.beginPath(); c.arc(A2.h[0], A2.h[1], 16.5, 0, 6.283); c.fill();
          c.beginPath(); c.ellipse(A2.h[0] - s * 8 * Math.cos(A2.ang), A2.h[1] - 8, 6, 9, A2.ang, 0, 6.283); c.fill();
        }
      };
      // legs
      if (p.legs > 0.5) for (const [G, s] of [[sk.legL, -1], [sk.legR, 1]]) {
        limb(c, [G.h, G.k, G.a], 46, 42, lin(c, G.h[0], G.h[1], G.a[0], G.a[1], ld, look.pants));
        c.fillStyle = radial(c, G.a[0], G.a[1] + 8, 24, ld, look.socks); c.beginPath(); c.ellipse(G.a[0] + s * 5, G.a[1] + 12, 26, 15, 0, 0, 6.283); c.fill();
      }
      if (p.armsBack > 0.5) arms();
      // torso: an oversized hoodie (or a shirt)
      const n = sk.neck, pl = sk.pel, bw = look.build * (1 - Math.abs(turn) * 0.2), lean = p.lean * D2R;
      c.save(); c.translate(n[0], n[1]); c.rotate(lean);
      const tl = Math.hypot(pl[0] - n[0], pl[1] - n[1]) + 20, sw = 62 * bw, hw = 58 * bw;
      c.beginPath(); c.moveTo(-sw * 0.55, 0); c.quadraticCurveTo(-sw, 2, -sw, 24); c.lineTo(-hw, tl - 6); c.quadraticCurveTo(-hw, tl + 6, -hw + 12, tl + 6); c.lineTo(hw - 12, tl + 6); c.quadraticCurveTo(hw, tl + 6, hw, tl - 6); c.lineTo(sw, 24); c.quadraticCurveTo(sw, 2, sw * 0.55, 0); c.closePath();
      c.fillStyle = lin(c, -sw, tl / 2, sw, tl / 2, ld, top); c.fill();
      if (!back && look.top === 'hoodie') {
        c.fillStyle = rgba(shade(top, 0.82)); c.beginPath(); c.moveTo(-34 * bw + turn * 10, tl - 52); c.lineTo(34 * bw + turn * 10, tl - 52); c.lineTo(40 * bw + turn * 10, tl - 14); c.lineTo(-40 * bw + turn * 10, tl - 14); c.closePath(); c.fill();   // pouch
        c.strokeStyle = rgba(mix(top, '#ffffff', 0.35)); c.lineWidth = 3.5; c.lineCap = 'round';
        const swing = Math.sin(t * 2 + seed) * 2 + p.tilt * 0.2;
        for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 12 + turn * 12, 12); c.quadraticCurveTo(s * 14 + turn * 12 + swing, 34, s * 12 + turn * 12 + swing * 1.4, 54); c.stroke(); }
      }
      c.fillStyle = rgba(shade(top, 0.72)); c.fillRect(-hw + 4, tl - 8, hw * 2 - 8, 13);   // hem band
      c.restore();
      // neck + hood
      const hd = sk.head;
      c.fillStyle = lin(c, n[0] - 14, n[1], n[0] + 14, n[1], ld, skin); c.fillRect(n[0] - 13, hd[1] + 40, 26, n[1] - hd[1] - 30);
      if (look.top === 'hoodie') { c.fillStyle = lin(c, n[0] - 48, n[1], n[0] + 48, n[1], ld, shade(top, 0.9)); c.beginPath(); c.ellipse(n[0], n[1] + 2, 46 * bw, back ? 30 : 17, lean, 0, 6.283); c.fill(); }
      // head
      c.save(); c.translate(hd[0], hd[1]); c.rotate(lean + p.tilt * D2R);
      drawHead(c, s0, look, ld, back, turn, f, t, seed);
      c.restore();
      if (back && look.top === 'hoodie') { c.fillStyle = lin(c, n[0] - 50, n[1], n[0] + 50, n[1], ld, shade(top, 0.92)); c.beginPath(); c.ellipse(n[0], n[1] + 12, 52 * bw, 30, lean, 0, 6.283); c.fill(); }   // the hood lies over the shoulders from behind
      if (p.armsBack <= 0.5) arms();
      // something in the hands
      if (s0.hold) drawHeld(c, sk, s0, ld, 'albedo', t);
    }
    function drawHead(c, s0, look, ld, back, turn, f, t, seed) {
      const skin = look.skin, hair = look.hairColor, w = HW * (1 - Math.abs(turn) * 0.08), h = HH;
      // ears
      for (const s of [-1, 1]) { if (turn * s > 0.6) continue; c.fillStyle = radial(c, s * w * 0.5 - turn * 14, 8, 15, ld, skin); c.beginPath(); c.ellipse(s * (w * 0.5 + 4) - turn * 16, 10, 12, 17, 0, 0, 6.283); c.fill(); }
      c.fillStyle = radial(c, 0, 0, w * 0.6, ld, skin, 0.55); squircle(c, w, h); c.fill();
      // hair (a mop with bangs) — the cowlick is the character's signature and shows the mood
      const tuft = clamp(f.tuft, -1, 1);
      c.fillStyle = lin(c, -w / 2, -h / 2, w / 2, 0, ld, hair, 0.6);
      c.save(); squircle(c, w + 8, h + 8); c.clip();
      if (back) { c.fillRect(-w, -h, w * 2, h * 1.35); }
      else if (look.hair === 'short' || look.hair === 'buzz') { c.beginPath(); c.ellipse(turn * 10, -h * 0.42, w * 0.62, h * 0.32, 0, 0, 6.283); c.fill(); }
      else {
        c.beginPath(); c.moveTo(-w, -h); c.lineTo(w, -h); c.lineTo(w, -h * 0.05);
        const bangs = 6, ox = turn * 22;
        for (let i = bangs; i >= 0; i--) { const x = -w / 2 - 6 + ((w + 12) * i) / bangs + ox, y = -h * (i % 2 ? 0.2 : 0.32) - (Math.abs(i - bangs / 2) < 1 ? 6 : 0); c.quadraticCurveTo(x + (w / bangs) * 0.5, y + 14, x, y); }
        c.lineTo(-w, -h * 0.05); c.closePath(); c.fill();
        if (look.hair === 'long') { c.fillRect(-w / 2 - 6, -h * 0.2, 22, h * 0.9); c.fillRect(w / 2 - 16, -h * 0.2, 22, h * 0.9); }
      }
      c.restore();
      if (look.hair === 'bun') { c.fillStyle = radial(c, 0, -h * 0.58, 26, ld, hair); c.beginPath(); c.arc(turn * 8, -h * 0.6, 26, 0, 6.283); c.fill(); }
      if (look.tuft && look.hair !== 'buzz') {
        // stands up when determined, droops over the forehead when drained, frizzes when angry
        const bx = 6 + turn * 20, by = -h / 2 + 4, up = (tuft + 1) / 2, wig = f.browIn < -0.6 && f.open > 0.5 ? Math.sin(t * 30) * 3 : 0;
        const tip = [bx + lerp(58, 26, up) + wig, by + lerp(36, -66, up)], cp = [bx + lerp(10, -14, up), by + lerp(-40, -60, up)];
        c.strokeStyle = rgba(hair); c.lineCap = 'round'; c.lineWidth = 10; c.beginPath(); c.moveTo(bx, by + 6); c.quadraticCurveTo(cp[0], cp[1], tip[0], tip[1]); c.stroke();
        c.lineWidth = 7; c.beginPath(); c.moveTo(tip[0], tip[1]); c.quadraticCurveTo(tip[0] + lerp(10, 16, up), tip[1] + lerp(10, 4, up), tip[0] + lerp(4, 10, up), tip[1] + lerp(18, 14, up)); c.stroke();   // the curl at the end
      }
      if (back) return;
      // ---- the face ----
      const ex = turn * 22, ey = 6, eyeW = 20, eyeH = 25, open = Math.max(0, f.open);
      // dark circles
      if (f.bags > 0.01) for (const s of [-1, 1]) { c.fillStyle = `rgba(92,60,104,${(f.bags * 0.5).toFixed(3)})`; c.beginPath(); c.ellipse(s * 34 + ex, ey + eyeH * 0.95, eyeW * 1.05, 8, 0, 0, Math.PI); c.fill(); }
      if (f.blush > 0.01) for (const s of [-1, 1]) { c.fillStyle = `rgba(230,110,110,${(f.blush * 0.35).toFixed(3)})`; c.beginPath(); c.ellipse(s * 50 + ex, ey + 30, 16, 9, 0, 0, 6.283); c.fill(); }
      for (const s of [-1, 1]) {
        const cx = s * 34 + ex * (s * turn > 0 ? 1.15 : 0.85), cy = ey, rx = eyeW * (s * turn > 0.4 ? 0.8 : 1), ry = eyeH * Math.min(1.25, Math.max(open, 0.001) > 1 ? open : 1);
        if (open < 0.06) {   // closed: a lid line (a soft smile curve when calm, flat when asleep)
          c.strokeStyle = 'rgba(40,26,22,.95)'; c.lineWidth = 4.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - rx, cy + 2); c.quadraticCurveTo(cx, cy + 2 + (f.mouthCurve > 0.2 ? 9 : 4) - (f.squint > 0.5 ? 6 : 0), cx + rx, cy + 2); c.stroke();
          continue;
        }
        c.save(); c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, 6.283); c.clip();
        c.fillStyle = '#f2ece2'; c.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
        const pr = 11.5 * f.pupil, px = cx + f.lookX * rx * 0.45, py = cy + f.lookY * ry * 0.4;
        c.fillStyle = '#1b1612'; c.beginPath(); c.arc(px, py, pr, 0, 6.283); c.fill();
        // upper lid: how open, and tilted (outer side down = sad / tired; inner side down = angry)
        const top = cy - ry, lidY = top + (1 - Math.min(1, open)) * ry * 2, tilt = f.lidTilt * ry * 0.7;
        const yIn = lidY + (tilt < 0 ? -tilt : 0), yOut = lidY + (tilt > 0 ? tilt : 0);
        const xIn = cx - s * rx, xOut = cx + s * rx;
        c.fillStyle = rgba(skin); c.beginPath(); c.moveTo(xIn, top - 4); c.lineTo(xOut, top - 4); c.lineTo(xOut, yOut); c.lineTo(xIn, yIn); c.closePath(); c.fill();
        if (f.squint > 0.01) { const sy = cy + ry - f.squint * ry * 0.9; c.beginPath(); c.moveTo(cx - rx, cy + ry + 2); c.lineTo(cx + rx, cy + ry + 2); c.lineTo(cx + rx, sy); c.quadraticCurveTo(cx, sy - 6, cx - rx, sy); c.closePath(); c.fill(); }
        c.restore();
        c.strokeStyle = 'rgba(40,26,22,.95)'; c.lineWidth = 4.5; c.lineCap = 'round';
        c.save(); c.beginPath(); c.ellipse(cx, cy, rx + 3, ry + 3, 0, 0, 6.283); c.clip(); c.beginPath(); c.moveTo(xIn, yIn); c.lineTo(xOut, yOut); c.stroke(); c.restore();
      }
      // brows: thick, floating, the main actor of the face
      for (const s of [-1, 1]) {
        const cx = s * 34 + ex, by = ey - eyeH - 16 - f.browY * 11 - (open > 1 ? (open - 1) * 20 : 0);
        const xi = cx - s * 15, xo = cx + s * 20, yi = by - f.browIn * 11, yo = by + f.browIn * 3 + (f.browIn < 0 ? 2 : 0);
        c.strokeStyle = rgba(hair); c.lineWidth = 11; c.lineCap = 'round'; c.beginPath(); c.moveTo(xi, yi); c.quadraticCurveTo((xi + xo) / 2, Math.min(yi, yo) - 6 + Math.abs(f.browIn) * 3, xo, yo); c.stroke();
      }
      // nose: a small nub
      c.strokeStyle = 'rgba(150,92,70,.55)'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(ex * 1.2 - 3, 24); c.quadraticCurveTo(ex * 1.2 + 4, 30, ex * 1.2 + 7, 26); c.stroke();
      // mouth
      const mx = ex * 1.1, my = 46, mw = 30 * f.mouthW, cu = clamp(f.mouthCurve, -1, 1) * 9, op = clamp(f.mouthOpen);
      if (op > 0.05) {
        c.fillStyle = '#46201b'; c.beginPath(); c.moveTo(mx - mw / 2, my - cu * 0.6);
        c.quadraticCurveTo(mx, my + cu - 4, mx + mw / 2, my - cu * 0.6); c.quadraticCurveTo(mx, my + op * 30 + cu * 0.4, mx - mw / 2, my - cu * 0.6); c.closePath(); c.fill();
        if (f.teeth > 0.05) { c.save(); c.clip(); c.fillStyle = '#efe8dc'; c.fillRect(mx - mw / 2, my - 8, mw, 9 + op * 4); c.restore(); }
      } else {
        c.strokeStyle = '#4a221d'; c.lineWidth = 4.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(mx - mw / 2, my - cu * 0.6);
        if (f.wobble > 0.05) { for (let i = 1; i <= 6; i++) c.lineTo(mx - mw / 2 + (mw * i) / 6, my - cu * 0.6 + (i % 2 ? 1 : -1) * 3.5 * f.wobble + Math.sin((i / 6) * Math.PI) * cu); }
        else c.quadraticCurveTo(mx, my + cu, mx + mw / 2, my - cu * 0.6);
        c.stroke();
      }
      if (look.glasses) { c.strokeStyle = 'rgba(30,30,34,.95)'; c.lineWidth = 4; for (const s of [-1, 1]) { c.beginPath(); c.roundRect(s * 34 + ex - 24, ey - 22, 48, 42, 12); c.stroke(); } c.beginPath(); c.moveTo(ex - 10, ey - 4); c.lineTo(ex + 10, ey - 4); c.stroke(); }
      // sweat and tears are drawn in the light pass too (they glint), here only their body
      if (f.sweat > 0.05) { c.fillStyle = `rgba(150,190,230,${(0.8 * f.sweat).toFixed(3)})`; const sx = w * 0.42, sy = -h * 0.18 + ((t * 18) % 30); c.beginPath(); c.moveTo(sx, sy - 14); c.quadraticCurveTo(sx + 9, sy, sx, sy + 7); c.quadraticCurveTo(sx - 9, sy, sx, sy - 14); c.fill(); }
      if (f.tear > 0.05) for (const s of [-1, 1]) { c.fillStyle = `rgba(150,200,240,${(0.7 * f.tear).toFixed(3)})`; c.beginPath(); c.roundRect(s * 34 + ex + s * 8 - 3, ey + 16, 6, 10 + f.tear * 40, 3); c.fill(); }
    }
    // things in hands
    function drawHeld(c, sk, s0, ld, pass, t) {
      const h = s0.hold, two = h.o.hand === 'both' || (h.o.hand === undefined && Math.abs(s0.pose.eL - s0.pose.eR) < 30 && s0.pose.eL > 80);
      const hp = two ? [(sk.armL.h[0] + sk.armR.h[0]) / 2, (sk.armL.h[1] + sk.armR.h[1]) / 2 - 10] : (h.o.hand === 'L' ? sk.armL.h : sk.armR.h);
      c.save(); c.translate(hp[0], hp[1]);
      const tilt = (h.o.tilt ?? 0) + (two ? 0 : (h.o.hand === 'L' ? sk.armL.ang : sk.armR.ang) / D2R - 90) * 0.15;
      c.rotate(tilt * D2R); c.translate(0, -s0.thumb * 3);
      if (h.what === 'phone') {
        const pw = 46, ph = 84;
        if ((h.o.screen ?? 'face') === 'face') { if (pass === 'albedo') { c.fillStyle = '#1d1e24'; c.beginPath(); c.roundRect(-pw / 2, -ph / 2, pw, ph, 8); c.fill(); c.fillStyle = '#2c2d35'; c.beginPath(); c.arc(-pw / 2 + 10, -ph / 2 + 11, 5, 0, 6.283); c.fill(); } }
        else if (pass === 'albedo') { c.fillStyle = '#111'; c.beginPath(); c.roundRect(-pw / 2, -ph / 2, pw, ph, 8); c.fill(); }
        // thumbs over it
        if (pass === 'albedo') { c.fillStyle = rgba(sk && s0 ? '#e8c29e' : '#e8c29e'); }
      } else if (pass === 'albedo') {
        if (h.what === 'mug') { c.fillStyle = '#d9d2c4'; c.beginPath(); c.roundRect(-20, -26, 40, 46, 6); c.fill(); c.strokeStyle = '#d9d2c4'; c.lineWidth = 7; c.beginPath(); c.arc(22, -4, 12, -1.3, 1.3); c.stroke(); }
        if (h.what === 'book') { c.fillStyle = '#7d3a32'; c.fillRect(-46, -34, 92, 62); c.fillStyle = '#efe7d6'; c.fillRect(-42, -30, 84, 54); c.fillStyle = '#7d3a32'; c.fillRect(-2, -34, 4, 62); }
        if (h.what === 'dumbbell') { c.fillStyle = '#3a3b40'; c.fillRect(-36, -5, 72, 10); c.fillRect(-46, -20, 16, 40); c.fillRect(30, -20, 16, 40); }
      }
      c.restore();
    }
    // the light pass: the phone's glowing edge or screen, catchlights, the screen reflected in the eyes, glints on sweat and tears
    function drawEmit(c, sk, s0, look, kl, t, seed) {
      const p = s0.pose, f = s0.face, back = p.back > 0.5, turn = clamp(p.turn, -1, 1);
      if (s0.hold && s0.hold.what === 'phone' && s0.hold.o.glow !== false) {
        const h = s0.hold, two = h.o.hand === 'both' || (h.o.hand === undefined && Math.abs(p.eL - p.eR) < 30 && p.eL > 80);
        const hp = two ? [(sk.armL.h[0] + sk.armR.h[0]) / 2, (sk.armL.h[1] + sk.armR.h[1]) / 2 - 10] : (h.o.hand === 'L' ? sk.armL.h : sk.armR.h);
        const col = h.o.color ?? feedColor(seed, s0.scroll);
        c.save(); c.translate(hp[0], hp[1]); c.translate(0, -s0.thumb * 3);
        if ((h.o.screen ?? 'face') === 'face') {   // we see its back: light spills round the edges
          c.strokeStyle = rgba(col, 0.65); c.lineWidth = 3; c.shadowColor = rgba(col, 0.9); c.shadowBlur = 18; c.beginPath(); c.roundRect(-24, -43, 48, 86, 9); c.stroke();
        } else { c.save(); c.beginPath(); c.roundRect(-22, -40, 44, 80, 7); c.clip(); drawFeed(c, -22, -40, 44, 80, seed, s0.scroll); c.restore(); }
        c.restore();
      }
      if (back || f.open < 0.15) return;
      // eyes catch the light: a catchlight and, near a screen, its little rectangle
      const hd = sk.head, lean = p.lean * D2R + p.tilt * D2R, ex = turn * 22, ey = 6;
      const near = kl && kl.str > 0.15;
      c.save(); c.translate(hd[0], hd[1]); c.rotate(lean);
      for (const s of [-1, 1]) {
        const cx = s * 34 + ex * (s * turn > 0 ? 1.15 : 0.85), px = cx + f.lookX * 20 * 0.45, py = ey + f.lookY * 25 * 0.4;
        const pr = 11.5 * f.pupil, oy = ey - 25 + (1 - Math.min(1, f.open)) * 50;
        if (py - pr * 0.4 < oy) continue;   // the lid covers the highlight
        if (kl && kl.screen && near) { c.fillStyle = rgba(mix(kl.color, '#ffffff', 0.5), clamp(kl.str * 1.1)); c.beginPath(); c.roundRect(px - 3.5, py - 6, 7, 10, 1.5); c.fill(); }
        else { c.fillStyle = `rgba(255,255,255,${(near ? 0.95 : 0.35).toFixed(2)})`; c.beginPath(); c.arc(px - 3.5, py - 4, near ? 3.6 : 2.4, 0, 6.283); c.fill(); }
      }
      if (f.tear > 0.2 && near) for (const s of [-1, 1]) { c.fillStyle = rgba(mix(kl.color, '#ffffff', 0.6), 0.6 * f.tear); c.fillRect(s * 34 + ex + s * 8 - 1, ey + 20, 2, 6 + f.tear * 30); }
      c.restore();
    }
    // the phone feed: anonymous cards scrolling (no real app's UI); its colour tints the light on the face
    const FEED = ['#ff8a5c', '#5cc8ff', '#c77dff', '#ffd25c', '#67e0a3', '#ff5c8a', '#8aa2ff'];
    const feedColor = (seed, scroll) => { const i = Math.floor(scroll), q = scroll - i, a2 = FEED[(seed + i) % FEED.length], b2 = FEED[(seed + i + 1) % FEED.length]; return mix(mix(a2, '#dfe9ff', 0.55), mix(b2, '#dfe9ff', 0.55), q); };
    function drawFeed(c, x, y, w, h, seed, scroll) {
      c.fillStyle = '#e9eef7'; c.fillRect(x, y, w, h);
      const card = h * 0.62;
      for (let i = -1; i < 3; i++) {
        const k = Math.floor(scroll) + i, yy = y + (i - (scroll % 1)) * card + 4;
        c.fillStyle = FEED[((seed + k) % FEED.length + FEED.length) % FEED.length]; c.fillRect(x + 3, yy, w - 6, card * 0.66);
        c.fillStyle = '#9aa3b4'; c.fillRect(x + 3, yy + card * 0.72, (w - 6) * 0.8, 3); c.fillRect(x + 3, yy + card * 0.82, (w - 6) * 0.5, 3);
      }
    }
    L.drawFeed = drawFeed;

    // ---------- props (set pieces): each has albedo (lit by the room), emit (its own light) and lights ----------
    const PR = (L.prop = {});
    PR.room = (o = {}) => {   // a back wall and the floor (front view)
      const { floor = 300, x0 = -3000, x1 = 3000, wall = '#5d6273', ground = '#3b3838', top = -2600 } = o;
      return { order: 0, albedo: (c) => {
        const g = c.createLinearGradient(0, top, 0, floor); g.addColorStop(0, rgba(shade(wall, 0.8))); g.addColorStop(1, rgba(wall)); c.fillStyle = g; c.fillRect(x0, top, x1 - x0, floor - top);
        c.fillStyle = rgba(ground); c.fillRect(x0, floor, x1 - x0, 2400); c.fillStyle = rgba(shade(wall, 0.6)); c.fillRect(x0, floor - 18, x1 - x0, 18);
        if (o.frames) for (const fr of o.frames) { c.fillStyle = rgba(shade(wall, 0.55)); c.fillRect(fr.x - 6, fr.y - 6, fr.w + 12, fr.h + 12); c.fillStyle = rgba(fr.color ?? shade(wall, 1.25)); c.fillRect(fr.x, fr.y, fr.w, fr.h); }
      } };
    };
    PR.floor = (o = {}) => {   // a top-down floor of planks (for shots from above)
      const { color = '#3e3634', x0 = -3000, x1 = 3000, y0 = -2000, y1 = 2000, plank = 90 } = o;
      return { order: 0, albedo: (c) => { c.fillStyle = rgba(color); c.fillRect(x0, y0, x1 - x0, y1 - y0); c.strokeStyle = rgba(shade(color, 0.7)); c.lineWidth = 3; for (let y = y0; y < y1; y += plank) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); const r = rnd(Math.round(y)); for (let x = x0 + r() * 400; x < x1; x += 300 + r() * 400) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + plank); c.stroke(); } } } };
    };
    // a bed seen from above (head end left): base under the sleeper, blanket over (cover: 0 = pulled off … 1 = up to the chin)
    PR.bedTop = (o = {}) => {
      const { x = 0, y = 0, w = 900, h = 520, frame = '#5a4d46', sheet = '#c3c7d6', pillow = '#e2dfe8', blanket = '#566aa0', cover = 0.55 } = o;
      const base = { order: 20, albedo: (c) => {
        c.fillStyle = rgba(frame); c.beginPath(); c.roundRect(x - w / 2 - 26, y - h / 2 - 20, w + 52, h + 40, 18); c.fill();
        c.fillStyle = rgba(sheet); c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 14); c.fill();
        c.fillStyle = rgba(pillow); c.beginPath(); c.roundRect(x - w / 2 + 26, y - h * 0.32, 190, h * 0.64, 40); c.fill();
        c.strokeStyle = rgba(shade(pillow, 0.8)); c.lineWidth = 4; c.beginPath(); c.moveTo(x - w / 2 + 120, y - h * 0.28); c.quadraticCurveTo(x - w / 2 + 100, y, x - w / 2 + 120, y + h * 0.28); c.stroke();
      } };
      const cov = typeof cover === 'function' ? cover : () => cover;
      const top = { order: 60, albedo: (c, t) => {
        const k = clamp(cov(t)), bx = x + w / 2 - (w - 40) * k;   // blanket from the foot end up to bx
        c.fillStyle = rgba(blanket); c.beginPath(); c.moveTo(bx, y - h / 2 - 8);
        for (let i = 0; i <= 6; i++) c.quadraticCurveTo(bx + 18 * (i % 2 ? 1 : -1), y - h / 2 - 8 + ((i + 0.5) * (h + 16)) / 6, bx, y - h / 2 - 8 + ((i + 1) * (h + 16)) / 6);
        c.lineTo(x + w / 2 + 14, y + h / 2 + 8); c.lineTo(x + w / 2 + 14, y - h / 2 - 8); c.closePath(); c.fill();
        c.strokeStyle = rgba(shade(blanket, 0.7)); c.lineWidth = 5; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(bx + 80 * i, y - h / 2); c.quadraticCurveTo(bx + 80 * i + 30, y, bx + 80 * i - 10, y + h / 2); c.stroke(); }
        c.fillStyle = rgba(mix(blanket, '#ffffff', 0.25)); c.fillRect(bx - 4, y - h / 2 - 8, 16, h + 16);   // the folded edge
      } };
      return [base, top];
    };
    // a bed from the front / side (for sitting up): the mattress block and a blanket lump over the legs
    PR.bed = (o = {}) => {
      const { x = 0, floor = 300, w = 760, hgt = 170, frame = '#5a4d46', sheet = '#b7bbca', blanket = '#566aa0', head = 'left' } = o;
      const sx = head === 'left' ? -1 : 1;
      return [{ order: 20, albedo: (c) => { c.fillStyle = rgba(frame); c.fillRect(x - w / 2, floor - hgt + 40, w, hgt - 40); c.fillRect(x + sx * w / 2 - (sx < 0 ? 0 : 30), floor - hgt - 140, 30, hgt + 140); c.fillStyle = rgba(sheet); c.beginPath(); c.roundRect(x - w / 2 + 10, floor - hgt, w - 20, 60, 12); c.fill(); c.fillStyle = '#cfccd8'; c.beginPath(); c.roundRect(x + sx * (w / 2 - 140) - 80, floor - hgt - 46, 160, 60, 26); c.fill(); } },
        { order: 60, albedo: (c) => { c.fillStyle = rgba(blanket); c.beginPath(); c.moveTo(x - w / 2 + (sx < 0 ? 200 : 0), floor - hgt + 50); c.quadraticCurveTo(x, floor - hgt - 90, x + w / 2 - (sx > 0 ? 200 : 0), floor - hgt + 50); c.lineTo(x + w / 2 + 6, floor - hgt + 120); c.lineTo(x - w / 2 - 6, floor - hgt + 120); c.closePath(); c.fill(); c.strokeStyle = rgba(shade(blanket, 0.7)); c.lineWidth = 5; c.beginPath(); c.moveTo(x - 120, floor - hgt - 10); c.quadraticCurveTo(x - 60, floor - hgt + 40, x - 140, floor - hgt + 110); c.stroke(); } }];
    };
    PR.nightstand = (o = {}) => { const { x = 0, floor = 300, w = 170, h = 190, color = '#4b4038' } = o; return { order: 22, albedo: (c) => { c.fillStyle = rgba(color); c.fillRect(x - w / 2, floor - h, w, h); c.fillStyle = rgba(shade(color, 0.7)); c.fillRect(x - w / 2 + 12, floor - h + 30, w - 24, 6); c.fillRect(x - 14, floor - h + 60, 28, 6); } }; };
    // 7-segment digits
    const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g' };
    const seg7 = (c, s, x, y, h, col, glow) => {
      const w = h * 0.52, th = h * 0.12; let cx = x;
      c.fillStyle = col; c.shadowColor = col; c.shadowBlur = glow;
      for (const ch of s) {
        if (ch === ':') { c.beginPath(); c.arc(cx + th, y + h * 0.3, th * 0.6, 0, 6.283); c.arc(cx + th, y + h * 0.7, th * 0.6, 0, 6.283); c.fill(); cx += th * 3; continue; }
        const on = SEG[ch] || '';
        const S2 = { a: [cx + th, y, w - 2 * th, th], d: [cx + th, y + h - th, w - 2 * th, th], g: [cx + th, y + h / 2 - th / 2, w - 2 * th, th], f: [cx, y + th, th, h / 2 - th * 1.5], b: [cx + w - th, y + th, th, h / 2 - th * 1.5], e: [cx, y + h / 2 + th / 2, th, h / 2 - th * 1.5], c: [cx + w - th, y + h / 2 + th / 2, th, h / 2 - th * 1.5] };
        for (const k2 of 'abcdefg') { const r = S2[k2]; c.globalAlpha = on.includes(k2) ? 1 : 0.06; c.fillRect(...r); }
        c.globalAlpha = 1; cx += w + th * 1.6;
      }
      c.shadowBlur = 0;
      return cx - x;
    };
    const fmt = (mins) => { const m = ((Math.round(mins) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
    const toMin = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
    // a time that rolls from one clock reading to another over [a, b] (crossing midnight works): the clock is the story's information
    L.roll = (a, b, from, to, o = {}) => {
      let f0 = toMin(from), f1 = toMin(to); if (f1 < f0) f1 += 1440;
      const ease = o.ease ?? E.cubicInOut;
      const fn = (t) => lerp(f0, f1, ease(clamp((t - a) / (b - a))));
      fn.roll = { a, b, from, to };
      // a tick for each minute that passes, thinned so it reads as time racing (never more than ~10 a second)
      if (o.sfx !== false) { let last = null, lt = -1; for (let t2 = a; t2 <= b; t2 += 1 / 30) { const m = Math.round(fn(t2)); if (m !== last && t2 - lt > 0.1) { if (last !== null) F.sfx(t2, 'tick', o.gain ?? 0.2); last = m; lt = t2; } } }
      F.fact(from, a, b); F.fact(to, a, b);
      return fn;
    };
    // a digital alarm clock: red digits that light the room; ring: [a, b] it flashes and beeps
    PR.alarm = (o = {}) => {
      const { x = 0, y = 0, size = 1, color = C.red, time = () => 0, ring = null } = o;
      const tf = typeof time === 'function' ? time : () => toMin(time);
      const r1 = ring ? ring[0] + Math.ceil((ring[1] - ring[0]) * 2.5) / 2.5 : 0;   // the ring stops on a full-bright phase (no jump when it ends)
      const on = (t) => (ring && t >= ring[0] && t < r1 ? 0.3 + 0.7 * Math.pow(0.5 + 0.5 * Math.cos((t - ring[0]) * 2.5 * 2 * Math.PI), 2) : 1);   // ringing: a fast smooth pulse (a hard on / off strobes)
      if (ring) for (let t2 = ring[0]; t2 < ring[1]; t2 += 0.4) F.sfx(t2, 'beep', o.gain ?? 0.55);
      const pr = { order: 24, attach: (S) => { F.info('clock', S.a, S.b); if (!tf.roll) F.fact(fmt(tf(S.a)), S.a, S.b); },   // a clock in the frame tells the story's time
        albedo: (c) => { c.fillStyle = '#1e1d22'; c.beginPath(); c.roundRect(x - 110 * size, y - 50 * size, 220 * size, 100 * size, 16 * size); c.fill(); },
        emit: (c, t) => { c.save(); c.globalAlpha *= on(t); seg7(c, fmt(tf(t)), x - 92 * size, y - 30 * size, 60 * size, color, 18 * size); c.restore(); },
        lights: (t) => [{ x, y: y - 10 * size, r: 420 * size * (o.reach ?? 1), color, power: 0.75 * on(t) * (o.power ?? 1), haze: 0.5 }] };
      return pr;
    };
    // a wall clock (analog): luminous hands so it reads in the dark
    PR.clock = (o = {}) => {
      const { x = 0, y = -300, r = 70, face = '#d7d2c4', time = () => 0, glow = '#b8ffd0' } = o;
      const tf = typeof time === 'function' ? time : () => toMin(time);
      const hands = (c, t, lw) => { const m = tf(t), ha = ((m / 60) % 12) / 12 * 6.283 - Math.PI / 2, ma = (m % 60) / 60 * 6.283 - Math.PI / 2; c.lineCap = 'round'; c.lineWidth = lw * 1.4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ha) * r * 0.5, y + Math.sin(ha) * r * 0.5); c.stroke(); c.lineWidth = lw; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ma) * r * 0.78, y + Math.sin(ma) * r * 0.78); c.stroke(); };
      return { order: 12, attach: (S) => { F.info('clock', S.a, S.b); },
        albedo: (c, t) => { c.fillStyle = '#2a2a2e'; c.beginPath(); c.arc(x, y, r + 8, 0, 6.283); c.fill(); c.fillStyle = rgba(face); c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); c.strokeStyle = '#2a2a2e'; c.lineWidth = 4; for (let i = 0; i < 12; i++) { const a2 = (i / 12) * 6.283; c.beginPath(); c.moveTo(x + Math.cos(a2) * r * 0.82, y + Math.sin(a2) * r * 0.82); c.lineTo(x + Math.cos(a2) * r * 0.94, y + Math.sin(a2) * r * 0.94); c.stroke(); } c.strokeStyle = '#1f1f22'; hands(c, t, 6); },
        emit: (c, t) => { if (!glow) return; c.save(); c.strokeStyle = rgba(glow, 0.8); c.shadowColor = rgba(glow); c.shadowBlur = 10; hands(c, t, 3); c.restore(); } };
    };
    // a door: open(t) 0–1 swings it; hall: the light behind it (a strip under the door when shut)
    PR.door = (o = {}) => {
      const { x = 0, floor = 300, w = 230, h = 480, color = '#6b5b4c', hall = [255, 214, 160], open = () => 0 } = o;
      const of = typeof open === 'function' ? open : () => open;
      return { order: 8,
        albedo: (c, t) => { const k = clamp(of(t)); c.fillStyle = '#2b2622'; c.fillRect(x - w / 2 - 14, floor - h - 14, w + 28, h + 14); c.fillStyle = '#101012'; c.fillRect(x - w / 2, floor - h, w, h); const dw = w * (1 - k * 0.82); c.fillStyle = rgba(color); c.fillRect(x - w / 2, floor - h, dw, h); c.fillStyle = rgba(shade(color, 0.75)); c.fillRect(x - w / 2 + dw * 0.12, floor - h + 40, dw * 0.76, h * 0.36); c.fillRect(x - w / 2 + dw * 0.12, floor - h * 0.5, dw * 0.76, h * 0.36); c.fillStyle = '#c9b48a'; c.beginPath(); c.arc(x - w / 2 + dw * 0.86, floor - h * 0.48, 9, 0, 6.283); c.fill(); },
        emit: (c, t) => { const k = clamp(of(t)); if (hall) { c.fillStyle = rgba(hall, 0.85); c.fillRect(x - w / 2, floor - 5, w, 5); if (k > 0) { const dw = w * (1 - k * 0.82); c.fillStyle = rgba(hall, 0.55 * k); c.fillRect(x - w / 2 + dw, floor - h, w - dw, h); } } },
        lights: (t) => { const k = clamp(of(t)); return hall ? [{ x, y: floor - 4, r: 260 + 500 * k, color: hall, power: 0.3 + 0.6 * k, haze: 0.2 + 0.4 * k }] : []; } };
    };
    // a window: the sky behind it is its own light (night: deep blue, a few lit windows; dawn: warm, rising); blinds cut the light into slats
    PR.window = (o = {}) => {
      const { x = 0, y = -420, w = 340, h = 400, dawn = 0, blinds = 0, frame = '#2e2b2a', floor = 300, seed = 3, curtain = '#3a3346' } = o;
      const dw = typeof dawn === 'function' ? dawn : () => dawn;
      const skyAt = (k) => [mix([10, 16, 34], [255, 170, 110], sm(k * 1.3 - 0.2)), mix([24, 34, 64], [255, 224, 170], sm(k))];
      return { order: 6,
        albedo: (c) => { c.fillStyle = rgba(frame); c.fillRect(x - 18, y - 18, w + 36, h + 36); c.fillStyle = rgba(curtain); c.fillRect(x - 70, y - 40, 60, h + 140); c.fillRect(x + w + 10, y - 40, 60, h + 140); c.fillStyle = rgba(shade(frame, 0.8)); c.fillRect(x - 40, y + h + 14, w + 80, 22); },
        emit: (c, t) => {
          const k = clamp(dw(t)), [s0, s1] = skyAt(k);
          c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
          const g = c.createLinearGradient(0, y + h, 0, y); g.addColorStop(0, rgba(s1)); g.addColorStop(1, rgba(s0)); c.fillStyle = g; c.fillRect(x, y, w, h);
          if (k > 0.05) { const sy = y + h * (1.05 - 0.45 * k); const g2 = c.createRadialGradient(x + w * 0.62, sy, 0, x + w * 0.62, sy, w * 0.9); g2.addColorStop(0, `rgba(255,236,190,${(0.95 * k).toFixed(3)})`); g2.addColorStop(0.12, `rgba(255,200,130,${(0.6 * k).toFixed(3)})`); g2.addColorStop(1, 'rgba(255,160,90,0)'); c.fillStyle = g2; c.fillRect(x, y, w, h); }
          else { c.fillStyle = 'rgba(230,236,255,.85)'; c.beginPath(); c.arc(x + w * 0.72, y + h * 0.22, 14, 0, 6.283); c.fill(); }
          // the skyline: dark blocks with a few lit windows (fewer as the night gets later, the sun rim on them at dawn)
          const r = rnd(seed); let bx = x - 10;
          while (bx < x + w) { const bwid = 40 + r() * 70, bh = h * (0.18 + r() * 0.3); c.fillStyle = rgba(mix([8, 10, 18], [60, 40, 46], k * 0.6)); c.fillRect(bx, y + h - bh, bwid, bh); for (let wy = y + h - bh + 10; wy < y + h - 8; wy += 16) for (let wx = bx + 6; wx < bx + bwid - 8; wx += 14) if (r() < 0.22 * (1 - k * 0.7)) { c.fillStyle = 'rgba(255,214,140,.8)'; c.fillRect(wx, wy, 6, 8); } bx += bwid + 4; }
          if (blinds > 0) { c.fillStyle = rgba(frame, 0.9 * blinds); for (let sy = y; sy < y + h; sy += 26) c.fillRect(x, sy, w, 12); }
          c.restore();
          c.fillStyle = rgba(frame); c.fillRect(x + w / 2 - 6, y, 12, h); c.fillRect(x, y + h / 2 - 6, w, 12);
        },
        lights: (t) => { const k = clamp(dw(t)), [, s1] = skyAt(k); return [{ kind: 'shaft', x, y, w, h, dir: o.dir ?? [0.35, 1], len: (floor - y) * 1.6, spread: 1.25, slats: blinds > 0 ? Math.round(h / 26) : 0, color: s1, power: 0.25 + 0.75 * k, haze: 0.3 + 0.5 * k, r: Math.max(w, h) * 1.2 }]; } };
    };
    PR.desk = (o = {}) => { const { x = 0, floor = 300, w = 720, h = 250, color = '#4f4136' } = o; return { order: 55, albedo: (c) => { c.fillStyle = rgba(color); c.fillRect(x - w / 2, floor - h, w, 26); c.fillStyle = rgba(shade(color, 0.75)); c.fillRect(x - w / 2 + 20, floor - h + 26, 24, h - 26); c.fillRect(x + w / 2 - 44, floor - h + 26, 24, h - 26); c.fillRect(x + w / 2 - 230, floor - h + 26, 180, 90); } }; };
    PR.lamp = (o = {}) => {   // a desk lamp: a cone of warm light down onto the desk
      const { x = 0, y = 0, on = 1, color = [255, 206, 140], reach = 1 } = o;
      const pf = typeof on === 'function' ? on : () => on;
      return { order: 56, albedo: (c) => { c.strokeStyle = '#2b2b30'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 60, y + 150); c.lineTo(x - 30, y + 40); c.lineTo(x + 20, y - 10); c.stroke(); c.fillStyle = '#2b2b30'; c.fillRect(x - 100, y + 146, 80, 14); c.beginPath(); c.moveTo(x - 10, y - 40); c.lineTo(x + 60, y - 10); c.lineTo(x + 40, y + 30); c.lineTo(x - 30, y + 10); c.closePath(); c.fill(); },
        emit: (c, t) => { const k = clamp(pf(t)); if (k <= 0) return; c.fillStyle = rgba(mix(color, '#ffffff', 0.5), k); c.beginPath(); c.ellipse(x + 8, y + 22, 26, 9, 0.4, 0, 6.283); c.fill(); },
        lights: (t) => { const k = clamp(pf(t)); return k > 0 ? [{ kind: 'cone', x: x + 8, y: y + 20, dir: [0.25, 1], spread: 34, r: 620 * reach, color, power: k * 0.95, haze: 0.5 }] : []; } };
    };
    PR.laptop = (o = {}) => { const { x = 0, y = 0, on = 1, color = [180, 205, 255] } = o; const pf = typeof on === 'function' ? on : () => on; return { order: 57, albedo: (c) => { c.fillStyle = '#2a2b30'; c.beginPath(); c.moveTo(x - 120, y); c.lineTo(x + 120, y); c.lineTo(x + 140, y + 14); c.lineTo(x - 140, y + 14); c.closePath(); c.fill(); c.fillRect(x - 110, y - 150, 220, 150); }, emit: (c, t) => { const k = clamp(pf(t)); if (k > 0) { c.fillStyle = rgba(color, 0.9 * k); c.fillRect(x - 100, y - 140, 200, 132); c.fillStyle = rgba(shade(color, 0.6), k); for (let i = 0; i < 6; i++) c.fillRect(x - 86, y - 124 + i * 18, 60 + ((i * 37) % 100), 6); } }, lights: (t) => { const k = clamp(pf(t)); return k > 0 ? [{ x, y: y - 80, r: 520, color, power: 0.7 * k, haze: 0.35 }] : []; } }; };
    PR.books = (o = {}) => { const { x = 0, y = 0, n = 4 } = o, cols = ['#7a3b34', '#3c5a6e', '#8a7a3a', '#4a4a5a', '#6a3f5e']; return { order: 57, albedo: (c) => { for (let i = 0; i < n; i++) { c.fillStyle = cols[i % cols.length]; c.fillRect(x - 70 + (i % 2) * 8, y - (i + 1) * 22, 140 - (i % 3) * 10, 20); } } }; };
    PR.chair = (o = {}) => { const { x = 0, floor = 300, color = '#2f3036' } = o; return { order: 45, albedo: (c) => { c.fillStyle = rgba(color); c.beginPath(); c.roundRect(x - 110, floor - 470, 220, 250, 26); c.fill(); c.fillRect(x - 12, floor - 160, 24, 160); c.fillRect(x - 90, floor - 10, 180, 10); } }; };
    PR.shelf = (o = {}) => { const { x = 0, y = -300, w = 360, color = '#3d3530' } = o; return { order: 5, albedo: (c) => { c.fillStyle = rgba(color); c.fillRect(x - w / 2, y, w, 14); const cols = ['#6e4a40', '#45596a', '#7c6c44', '#52445e']; for (let i = 0; i < 9; i++) { c.fillStyle = cols[i % 4]; c.fillRect(x - w / 2 + 14 + i * 34, y - 70 + (i % 3) * 8, 26, 70 - (i % 3) * 8); } } }; };
    PR.plant = (o = {}) => { const { x = 0, floor = 300, s = 1, color = '#3f5a44' } = o; return { order: 7, albedo: (c) => { c.fillStyle = '#5a4a40'; c.fillRect(x - 40 * s, floor - 90 * s, 80 * s, 90 * s); c.fillStyle = rgba(color); for (let i = 0; i < 7; i++) { const a2 = -Math.PI / 2 + (i - 3) * 0.38; c.beginPath(); c.ellipse(x + Math.cos(a2) * 80 * s, floor - 90 * s + Math.sin(a2) * 110 * s, 22 * s, 60 * s, a2 + Math.PI / 2, 0, 6.283); c.fill(); } } }; };
    // a phone lying somewhere on its own (outside the door, face down on a table): it lights up with notifications at the given times
    PR.phone = (o = {}) => {
      const { x = 0, y = 0, rot = 0, pings = [], color = [200, 220, 255], face = 'up' } = o;
      for (const p of pings) { F.sfx(p, 'buzz', o.gain ?? 0.3); F.appear(p); }   // the screen lights up at once: intended
      const lit = (t) => pings.reduce((v, p) => Math.max(v, t >= p && t < p + 2.2 ? 1 - seg(t, p + 1.4, p + 2.2) : 0), 0);
      return { order: 30, albedo: (c) => { c.save(); c.translate(x, y); c.rotate(rot * D2R); c.fillStyle = '#18191e'; c.beginPath(); c.roundRect(-24, -44, 48, 88, 8); c.fill(); c.restore(); },
        emit: (c, t) => { const k = lit(t); if (k <= 0 || face !== 'up') return; c.save(); c.translate(x, y); c.rotate(rot * D2R); c.fillStyle = rgba(color, 0.9 * k); c.beginPath(); c.roundRect(-21, -40, 42, 80, 6); c.fill(); c.fillStyle = rgba('#ffffff', k); c.beginPath(); c.roundRect(-17, -30, 34, 12, 4); c.fill(); c.restore(); },
        lights: (t) => { const k = lit(t); return k > 0 ? [{ x, y, r: 300, color, power: 0.7 * k, haze: 0.3, screen: true }] : []; } };
    };
    PR.dumbbell = (o = {}) => { const { x = 0, y = 0 } = o; return { order: 30, albedo: (c) => { c.fillStyle = '#38393f'; c.fillRect(x - 50, y - 6, 100, 12); c.fillRect(x - 64, y - 26, 20, 52); c.fillRect(x + 44, y - 26, 20, 52); } }; };
    PR.ceilingLamp = (o = {}) => { const { x = 0, y = -700, on = 1, color = [255, 228, 190] } = o; const pf = typeof on === 'function' ? on : () => on; return { order: 4, albedo: (c) => { c.strokeStyle = '#222'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y - 600); c.lineTo(x, y); c.stroke(); c.fillStyle = '#2a2a2e'; c.beginPath(); c.moveTo(x - 70, y + 50); c.lineTo(x + 70, y + 50); c.lineTo(x + 26, y); c.lineTo(x - 26, y); c.closePath(); c.fill(); }, emit: (c, t) => { const k = clamp(pf(t)); if (k > 0) { c.fillStyle = rgba(color, k); c.beginPath(); c.ellipse(x, y + 52, 50, 10, 0, 0, 6.283); c.fill(); } }, lights: (t) => { const k = clamp(pf(t)); return k > 0 ? [{ kind: 'cone', x, y: y + 50, dir: [0, 1], spread: 40, r: 1100, color, power: k, haze: 0.4 }] : []; } }; };

    // ---------- information, told in light ----------
    const sx = (v) => v * (Math.min(W, H) / 1080) * (PT ? 1.3 : 1);   // overlay sizes follow the short side (portrait a little bigger: it's read on a phone)
    const pos = (x, y) => [x * W, y * H];
    const label = (c, text, x, y, size, col = C.text, align = 'center', weight = 500, font = FONT.sans, maxW = 0) => { c.font = `${weight} ${size}px ${font}`; if (maxW > 0) { const tw = c.measureText(text).width; if (tw > maxW) { size *= maxW / tw; c.font = `${weight} ${size}px ${font}`; } } c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = col; c.shadowColor = 'rgba(0,0,0,.9)'; c.shadowBlur = size * 0.4; c.fillText(text, x, y); c.shadowBlur = 0; };
    const glowStroke = (c, col, w, blur = 14) => { c.strokeStyle = col; c.lineWidth = w; c.shadowColor = col; c.shadowBlur = blur; };
    // a gauge drawn in light (battery / tank / ring): from → to over [a + 0.4, a + fill]
    L.meter = (a, b, o = {}) => {
      const { label: lb = '', unit = '', from = 0, to = 1, max = 1, kind = 'tank', color = C.warm, warn = null, x = PT ? 0.5 : 0.78, y = PT ? 0.3 : 0.45, fill = 1.6, dec = 0 } = o;
      F.info('meter', a, b); if (lb) F.fact(lb, a, b); F.fact(`${to}${unit}`, a, b);
      if (o.sfx !== false) F.sfx(a + 0.35, 'glow', 0.45);
      L.overlay(a, b, (c, t) => {
        const k = Math.min(seg(t, a, a + 0.45, E.sine), 1 - seg(t, b - 0.35, b, E.sine)), v = lerp(from, to, E.cubicInOut(seg(t, a + 0.4, a + 0.4 + fill))), q = clamp(v / max);
        const [cx, cy] = pos(x, y), s = sx(1), col = warn !== null && v >= warn ? C.red : color;
        c.globalAlpha = k;
        if (kind === 'ring') {
          const R = 110 * s; glowStroke(c, rgba('#ffffff', 0.15), 10 * s, 0); c.beginPath(); c.arc(cx, cy, R, 0, 6.283); c.stroke();
          glowStroke(c, rgba(col), 12 * s); c.lineCap = 'round'; c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + q * 6.283); c.stroke(); c.shadowBlur = 0;
          label(c, `${v.toFixed(dec)}${unit}`, cx, cy, 54 * s, '#fff', 'center', 800);
          if (lb) label(c, lb, cx, cy + R + 44 * s, 30 * s, C.text);
        } else {
          const bw = (kind === 'battery' ? 210 : 120) * s, bh = (kind === 'battery' ? 96 : 300) * s, x0 = cx - bw / 2, y0 = cy - bh / 2;
          glowStroke(c, rgba('#ffffff', 0.75), 5 * s, 10 * s); c.beginPath(); c.roundRect(x0, y0, bw, bh, 14 * s); c.stroke(); c.shadowBlur = 0;
          if (kind === 'battery') { c.fillStyle = rgba('#ffffff', 0.75); c.fillRect(x0 + bw + 4 * s, cy - 18 * s, 12 * s, 36 * s); }
          c.save(); c.shadowColor = rgba(col); c.shadowBlur = 20 * s; c.fillStyle = rgba(col, 0.9);
          if (kind === 'battery') c.fillRect(x0 + 10 * s, y0 + 10 * s, (bw - 20 * s) * q, bh - 20 * s);
          else { const fh = (bh - 20 * s) * q, wy = y0 + bh - 10 * s - fh; c.beginPath(); c.moveTo(x0 + 10 * s, y0 + bh - 10 * s); c.lineTo(x0 + 10 * s, wy); for (let i = 0; i <= 8; i++) c.lineTo(x0 + 10 * s + ((bw - 20 * s) * i) / 8, wy + Math.sin(t * 3 + i) * 3 * s); c.lineTo(x0 + bw - 10 * s, y0 + bh - 10 * s); c.closePath(); c.fill(); }
          c.restore();
          label(c, `${v.toFixed(dec)}${unit}`, kind === 'battery' ? cx : cx + bw / 2 + 24 * s, kind === 'battery' ? cy : y0 + bh - 10 * s - (bh - 20 * s) * q, 46 * s, '#fff', kind === 'battery' ? 'center' : 'left', 800);
          if (lb) label(c, lb, cx, y0 + bh + 40 * s, 30 * s, C.text);
        }
        c.globalAlpha = 1;
      }, o.order ?? 50);
    };
    // bars of light growing from a hairline (hl = the one that matters)
    L.bars = (a, b, o = {}) => {
      const { items = [], max = Math.max(...items.map((i) => i.value)), title = '', x = PT ? 0.1 : 0.56, y = PT ? 0.18 : 0.3, w = PT ? 0.8 : 0.36, stagger = 0.5 } = o;
      F.info('chart', a, b); if (title) F.fact(title, a, b); for (const it of items) { F.fact(it.label, a, b); F.fact(`${it.value}${it.unit ?? ''}`, a, b); }
      items.forEach((it, i) => { if (o.sfx !== false) F.sfx(a + 0.4 + i * stagger, 'glow', 0.4); });
      L.overlay(a, b, (c, t) => {
        const k = Math.min(seg(t, a, a + 0.4), 1 - seg(t, b - 0.35, b)), s = sx(1.3), [x0, y0] = pos(x, y), ww = w * W, rowH = 92 * s;
        c.globalAlpha = k;
        if (title) label(c, title, x0, y0 - 40 * s, 32 * s, C.dim, 'left', 500);
        items.forEach((it, i) => {
          const q = E.cubicInOut(seg(t, a + 0.4 + i * stagger, a + 1.4 + i * stagger)), ry = y0 + i * rowH, col = it.hl ? C.warm : '#cfd6e6';
          label(c, it.label, x0, ry + 14 * s, 28 * s, it.hl ? '#fff' : C.text, 'left', 500);
          c.fillStyle = rgba('#ffffff', 0.12); c.fillRect(x0, ry + 36 * s, ww, 3 * s);
          c.save(); c.shadowColor = rgba(col); c.shadowBlur = 16 * s; c.fillStyle = rgba(col, 0.92); c.fillRect(x0, ry + 32 * s, ww * 0.82 * (it.value / max) * q, 12 * s); c.restore();
          if (q > 0.05) label(c, `${it.value}${it.unit ?? ''}`, x0 + ww * 0.82 * (it.value / max) * q + 14 * s, ry + 38 * s, 32 * s, '#fff', 'left', 800);
        });
        c.globalAlpha = 1;
      }, o.order ?? 50);
    };
    // line icons drawn in light (for compare cards)
    const ICON = {
      moon: (c, r) => { c.beginPath(); c.arc(0, 0, r, 0.6, 5.7); c.arc(r * 0.45, -r * 0.2, r * 0.8, 5.2, 1.1, true); c.closePath(); c.stroke(); },
      clock: (c, r) => { c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.stroke(); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -r * 0.6); c.moveTo(0, 0); c.lineTo(r * 0.45, r * 0.2); c.stroke(); },
      glass: (c, r) => { c.beginPath(); c.moveTo(-r * 0.6, -r); c.lineTo(r * 0.6, -r); c.quadraticCurveTo(r * 0.6, 0, 0, r * 0.1); c.quadraticCurveTo(-r * 0.6, 0, -r * 0.6, -r); c.moveTo(0, r * 0.1); c.lineTo(0, r * 0.85); c.moveTo(-r * 0.45, r * 0.9); c.lineTo(r * 0.45, r * 0.9); c.stroke(); c.beginPath(); c.moveTo(-r * 0.5, -r * 0.55); c.lineTo(r * 0.5, -r * 0.55); c.stroke(); },
      phone: (c, r) => { c.beginPath(); c.roundRect(-r * 0.5, -r, r, r * 2, r * 0.15); c.stroke(); c.beginPath(); c.moveTo(-r * 0.15, r * 0.8); c.lineTo(r * 0.15, r * 0.8); c.stroke(); },
      bed: (c, r) => { c.beginPath(); c.moveTo(-r, r * 0.5); c.lineTo(-r, -r * 0.5); c.moveTo(-r, r * 0.1); c.lineTo(r, r * 0.1); c.lineTo(r, r * 0.5); c.moveTo(-r * 0.8, -r * 0.1); c.lineTo(-r * 0.3, -r * 0.1); c.stroke(); },
      brain: (c, r) => { c.beginPath(); c.ellipse(0, 0, r, r * 0.75, 0, 0, 6.283); c.stroke(); c.beginPath(); c.moveTo(0, -r * 0.75); c.bezierCurveTo(-r * 0.2, -r * 0.3, r * 0.2, r * 0.1, 0, r * 0.75); c.moveTo(-r * 0.7, -r * 0.2); c.quadraticCurveTo(-r * 0.4, 0, -r * 0.6, r * 0.3); c.moveTo(r * 0.7, -r * 0.2); c.quadraticCurveTo(r * 0.4, 0, r * 0.6, r * 0.3); c.stroke(); },
      battery: (c, r) => { c.beginPath(); c.roundRect(-r, -r * 0.5, r * 1.8, r, r * 0.15); c.stroke(); c.fillRect(r * 0.85, -r * 0.2, r * 0.18, r * 0.4); c.fillRect(-r * 0.85, -r * 0.35, r * 0.4, r * 0.7); },
      eye: (c, r) => { c.beginPath(); c.moveTo(-r, 0); c.quadraticCurveTo(0, -r * 0.8, r, 0); c.quadraticCurveTo(0, r * 0.8, -r, 0); c.stroke(); c.beginPath(); c.arc(0, 0, r * 0.3, 0, 6.283); c.stroke(); },
      sun: (c, r) => { c.beginPath(); c.arc(0, 0, r * 0.5, 0, 6.283); c.stroke(); for (let i = 0; i < 8; i++) { const a2 = (i / 8) * 6.283; c.beginPath(); c.moveTo(Math.cos(a2) * r * 0.7, Math.sin(a2) * r * 0.7); c.lineTo(Math.cos(a2) * r, Math.sin(a2) * r); c.stroke(); } },
    };
    L.icons = ICON;
    // two things side by side with a sign between (≈, >, =): each side an icon in light, a value, a label
    L.compare = (a, b, o = {}) => {
      const { left = {}, right = {}, sign = '≈', y = PT ? 0.36 : 0.42 } = o;
      F.info('compare', a, b);
      for (const sd of [left, right]) { if (sd.value) F.fact(sd.value, a, b); if (sd.label) F.fact(sd.label, a, b); }
      if (o.sfx !== false) { F.sfx(a + 0.3, 'glow', 0.5); F.sfx(a + 0.9, 'glow', 0.5); F.sfx(a + 1.4, 'hit', 0.5); }
      L.overlay(a, b, (c, t) => {
        const k = Math.min(seg(t, a, a + 0.4), 1 - seg(t, b - 0.35, b)), s = sx(1), cy = y * H;
        c.globalAlpha = k;
        // landscape: side by side; portrait: one above the other with the sign between
        [[left, 0.3, 0.3, PT ? -215 : 0], [right, 0.7, 0.9, PT ? 195 : 0]].forEach(([sd, xx, d, dy]) => {
          const q = E.expoOut(seg(t, a + d, a + d + 0.6)), cx = PT ? W / 2 : xx * W, cy2 = cy + dy * s, mw = PT ? W * 0.84 : W * 0.36;
          c.save(); c.globalAlpha = k * q; c.translate(cx, cy2 - 70 * s + (1 - q) * 20 * s);
          glowStroke(c, rgba(sd.color ?? (sd === right ? C.warm : C.cool)), 6 * s, 18 * s); c.fillStyle = rgba(sd.color ?? (sd === right ? C.warm : C.cool)); c.lineCap = 'round'; c.lineJoin = 'round';
          (ICON[sd.icon] || ICON.clock)(c, 60 * s); c.restore();
          c.save(); c.globalAlpha = k * q;
          if (sd.value) label(c, sd.value, cx, cy2 + 50 * s, 56 * s, '#fff', 'center', 800, FONT.sans, mw);
          if (sd.label) label(c, sd.label, cx, cy2 + 108 * s, 28 * s, C.text, 'center', 500, FONT.sans, mw);
          c.restore();
        });
        const q2 = E.backOut(seg(t, a + 1.35, a + 1.75));
        c.save(); c.globalAlpha = k * clamp(q2); c.translate(W / 2, cy + (PT ? 10 : -10) * s); c.scale(0.6 + 0.4 * q2, 0.6 + 0.4 * q2); label(c, sign, 0, 0, 90 * s, '#fff', 'center', 800); c.restore();
        c.globalAlpha = 1;
      }, o.order ?? 50);
    };
    // the head seen through: the actor's skull outline glows and a brain (or a heart) shows, with labels on leader lines
    L.xray = (a, b, A, o = {}) => {
      const { organ = 'brain', labels = [], tint = C.cool } = o;
      F.info('diagram', a, b);
      for (const lb of labels) F.fact(lb.text, a, b);
      if (o.sfx !== false) F.sfx(a + 0.1, 'glow', 0.55);
      L.overlay(a, b, (c, t) => {
        if (!A.now) return;
        const k = Math.min(seg(t, a, a + 0.6, E.sine), 1 - seg(t, b - 0.4, b)), S = A.S;
        const hp = L.toScreen(S, t, A.now.head[0], A.now.head[1]), [ox, oy] = L.toScreen(S, t, A.now.head[0] + 100, A.now.head[1]), r = Math.hypot(ox - hp[0], oy - hp[1]);
        c.globalAlpha = k; c.save(); c.translate(hp[0], hp[1]);
        glowStroke(c, rgba(tint, 0.85), Math.max(2, r * 0.035), r * 0.2); c.lineCap = 'round';
        if (organ === 'heart') { const R2 = r * 0.5; c.beginPath(); c.moveTo(0, R2 * 0.9); c.bezierCurveTo(-R2 * 1.6, -R2 * 0.2, -R2 * 0.6, -R2 * 1.2, 0, -R2 * 0.4); c.bezierCurveTo(R2 * 0.6, -R2 * 1.2, R2 * 1.6, -R2 * 0.2, 0, R2 * 0.9); c.stroke(); }
        else {
          c.beginPath(); c.ellipse(0, -r * 0.08, r * 0.58, r * 0.42, 0, 0, 6.283); c.stroke();
          c.lineWidth = Math.max(1.5, r * 0.022); for (let i = 0; i < 5; i++) { c.beginPath(); const yy = -r * 0.32 + i * r * 0.12; c.moveTo(-r * 0.48, yy); for (let j = 1; j <= 6; j++) c.quadraticCurveTo(-r * 0.48 + (j - 0.5) * r * 0.16, yy + (j % 2 ? -1 : 1) * r * 0.05, -r * 0.48 + j * r * 0.16, yy); c.stroke(); }
          // the pineal point (melatonin), dimming with o.dim(t)
          const dm = o.dim ? clamp(o.dim(t)) : 1; c.fillStyle = rgba(C.warm, dm); c.shadowColor = rgba(C.warm); c.shadowBlur = r * 0.3 * dm; c.beginPath(); c.arc(r * 0.05, r * 0.08, r * 0.06, 0, 6.283); c.fill();
        }
        c.restore();
        labels.forEach((lb, i) => {
          const q = E.expoOut(seg(t, (lb.at ?? a + 0.6 + i * 0.6), (lb.at ?? a + 0.6 + i * 0.6) + 0.5)), side = lb.side ?? (i % 2 ? -1 : 1);
          const ax = hp[0] + (lb.dx ?? 0.05) * r, ay = hp[1] + (lb.dy ?? 0.08) * r, ex = hp[0] + side * r * (PT ? 0.8 : 1.15), ey = hp[1] - r * (PT ? 1.1 : 0.3) + i * r * 0.45;
          c.save(); c.globalAlpha = k * q; glowStroke(c, rgba('#ffffff', 0.7), 2, 6); c.beginPath(); c.moveTo(ax, ay); c.lineTo(lerp(ax, ex, q), lerp(ay, ey, q)); c.stroke();
          c.font = `700 ${sx(30)}px ${FONT.sans}`; const tw = c.measureText(lb.text).width, m2 = 30, tx = side > 0 ? Math.min(ex + 12, W - m2 - tw) : Math.max(ex - 12, m2 + tw);
          label(c, lb.text, tx, ey, sx(30), lb.hl ? C.warm : '#fff', side > 0 ? 'left' : 'right', 700); c.restore();
        });
        c.globalAlpha = 1;
      }, o.order ?? 55);
    };
    // the night as a line of light: hour ticks from `from` to `to`, marks dropping onto it one by one, the gap between two marks filling (intended vs actual)
    L.timeline = (a, b, o = {}) => {
      const { from = '22:00', to = '08:00', marks = [], gap = null, x = PT ? 0.08 : 0.16, y = PT ? 0.3 : 0.24, w = PT ? 0.84 : 0.68 } = o;
      let m0 = toMin(from), m1 = toMin(to); if (m1 <= m0) m1 += 1440;
      const at = (s2) => { let m = toMin(s2); if (m < m0) m += 1440; return (m - m0) / (m1 - m0); };
      const step = o.step ?? ((w * W) / ((m1 - m0) / 60) < 110 * sx(1) ? 120 : 60);   // hour ticks never crowd: every 2 h on a narrow frame
      F.info('chart', a, b);
      for (const mk of marks) { F.fact(mk.at, a, b); if (mk.label) F.fact(mk.label, a, b); }
      if (gap && gap.label) F.fact(gap.label, a, b);
      marks.forEach((mk, i) => { if (o.sfx !== false) F.sfx(mk.t ?? a + 0.5 + i * 0.7, 'glow', 0.45); });
      L.overlay(a, b, (c, t) => {
        const k = Math.min(seg(t, a, a + 0.5), 1 - seg(t, b - 0.4, b)), s = sx(1), x0 = x * W, ww = w * W, yy = y * H;
        c.globalAlpha = k;
        const dq = E.cubicInOut(seg(t, a, a + 0.9));
        glowStroke(c, rgba('#ffffff', 0.5), 3 * s, 8 * s); c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 + ww * dq, yy); c.stroke(); c.shadowBlur = 0;
        for (let m = Math.ceil(m0 / step) * step; m <= m1; m += step) { const u = (m - m0) / (m1 - m0); if (u > dq) break; c.fillStyle = rgba('#ffffff', 0.45); c.fillRect(x0 + ww * u - 1.5 * s, yy - 9 * s, 3 * s, 18 * s); label(c, fmt(m), x0 + ww * u, yy + 34 * s, 22 * s, C.dim, 'center', 500); }
        if (gap) { const ga = at(gap.from), gb = at(gap.to), gt = gap.t ?? a + 0.5 + marks.length * 0.7, q = E.cubicInOut(seg(t, gt, gt + 1.2)); if (q > 0) { c.save(); c.shadowColor = rgba(C.warm); c.shadowBlur = 22 * s; c.fillStyle = rgba(C.warm, 0.85); c.fillRect(x0 + ww * ga, yy - 7 * s, ww * (gb - ga) * q, 14 * s); c.restore(); if (gap.label) label(c, gap.label, x0 + ww * (ga + gb) / 2, yy + 78 * s, 30 * s, '#fff', 'center', 700); } }
        marks.forEach((mk, i) => {
          const mt = mk.t ?? a + 0.5 + i * 0.7, q = E.expoOut(seg(t, mt, mt + 0.6)); if (q <= 0) return;
          const u = at(mk.at), col = mk.hl ? C.warm : '#ffffff', near = marks.some((m2, j) => j < i && Math.abs(at(m2.at) - u) * ww < 220 * s), lift = near ? 110 * s : 0, px = x0 + ww * u;
          c.save(); c.globalAlpha = k * q; glowStroke(c, rgba(col), 4 * s, 14 * s); c.beginPath(); c.moveTo(px, yy - 70 * s - lift + (1 - q) * -20 * s); c.lineTo(px, yy); c.stroke(); c.fillStyle = rgba(col); c.beginPath(); c.arc(px, yy, 9 * s, 0, 6.283); c.fill(); c.shadowBlur = 0;
          label(c, mk.at, px, yy - 96 * s - lift, 40 * s, '#fff', 'center', 800); if (mk.label) label(c, mk.label, px, yy - 140 * s - lift, 26 * s, mk.hl ? C.warm : C.text, 'center', 600); c.restore();
        });
        c.globalAlpha = 1;
      }, o.order ?? 50);
    };
    // a number written in light (counts up)
    L.stat = (a, b, o = {}) => {
      const { value = 0, from = 0, unit = '', label: lb = '', x = 0.5, y = PT ? 0.3 : 0.4, dec = 0, size = 120, color = '#fff' } = o;
      F.info('stat', a, b, { visual: false }); F.fact(`${value}${unit}`, a, b); if (lb) F.fact(lb, a, b);
      if (o.sfx !== false) F.sfx(a + 0.2, 'glow', 0.45);
      L.overlay(a, b, (c, t) => {
        const k = Math.min(seg(t, a, a + 0.4), 1 - seg(t, b - 0.35, b)), v = lerp(from, value, E.expoOut(seg(t, a + 0.2, a + 1.4))), s = sx(1);
        c.globalAlpha = k; c.save(); c.shadowColor = rgba(C.warm); c.shadowBlur = 30 * s; label(c, `${P.frameT ? (Math.abs(v - value) < 1e-6 ? value.toFixed(dec) : v.toFixed(dec)) : v.toFixed(dec)}${unit}`, x * W, y * H, size * s, color, 'center', 900, FONT.heavy); c.restore();
        if (lb) label(c, lb, x * W, y * H + size * 0.75 * s, 32 * s, C.text);
        c.globalAlpha = 1;
      }, o.order ?? 50);
    };

    // ---------- type (DOM: the checks read it) ----------
    // the thumbnail-style title card: huge heavy white type with a thick dark stroke and a drop shadow; the picture behind dims; it comes out of a blur
    const titles = [];
    L.title = (a, b, text, o = {}) => {
      const size = o.size ?? (PT ? 150 : 170), s = F.px(size), dim = o.dim ?? 0.55;
      const box = el('div', `left:0;right:0;top:${(o.y ?? (PT ? 0.36 : 0.5)) * H - s * 0.6}px;text-align:center;opacity:0;z-index:2`, textL);
      const html = String(text).replace(/\{([^{}]*)\}/g, `<span style="color:${o.accent ?? C.accent}">$1</span>`);
      const main = el('div', `position:relative;display:inline-block;font:900 ${s}px/1.08 ${FONT.heavy};color:${C.title};-webkit-text-stroke:${(s * 0.07).toFixed(1)}px ${C.stroke};paint-order:stroke fill;letter-spacing:.02em;text-shadow:0 ${(s * 0.06).toFixed(1)}px 0 ${C.stroke},0 0 ${(s * 0.5).toFixed(1)}px rgba(0,0,0,.8);white-space:nowrap`, box, html);
      const raw = String(text).replace(/[{}]/g, '');
      F.text(main, 'headline', raw, a + 0.1, b);
      let sub = null;
      if (o.sub) { sub = el('div', `position:relative;margin-top:${s * 0.22}px;font:700 ${s * 0.24}px/1.2 ${o.subFont ?? FONT.latin};color:#e9e4da;letter-spacing:.36em;text-shadow:0 2px 8px rgba(0,0,0,.9);opacity:0`, box, o.sub); F.text(sub, 'label', o.sub, a + 0.5, b); }
      const shade2 = el('div', 'inset:0;z-index:1;background:#000;opacity:0', textL); shade2.dataset.motion = 'skip';
      F.add((t) => {
        const on = t >= a && t < b, q = seg(t, a, a + 0.55, E.expoOut), x = on ? Math.min(q, 1 - seg(t, b - 0.4, b, E.sine)) : 0;
        set(box, { opacity: x.toFixed(3), transform: `scale(${(1.08 - 0.08 * q + 0.02 * seg(t, a, b)).toFixed(4)})`, filter: q < 1 && on ? `blur(${(10 * (1 - q)).toFixed(1)}px)` : 'none' });
        if (sub) set(sub, { opacity: (on ? Math.min(seg(t, a + 0.5, a + 0.9), 1 - seg(t, b - 0.4, b)) : 0).toFixed(3) });
        set(shade2, { opacity: (x * dim).toFixed(3) });
      });
      if (o.sfx !== false) { F.sfx(a, 'hit', o.gain ?? 0.8); F.sfx(a - 0.35, 'whoosh', 0.35, { dur: 0.5 }); }
      titles.push({ a, b, text: raw });
      return { box, main, sub };
    };
    // a few words on screen (sparingly): white, a soft glow, lowered at the end of the line
    const words = [];
    L.word = (a, b, text, o = {}) => {
      const s = F.px(o.size ?? (PT ? 64 : 58));
      const box = el('div', `left:${(o.x ?? 0.5) * W - W}px;width:${W * 2}px;top:${(o.y ?? (PT ? 0.22 : 0.2)) * H}px;text-align:center;opacity:0`, textL);
      const sp = el('span', `position:relative;display:inline-block;font:${o.weight ?? 700} ${s}px/1.25 ${o.font ?? FONT.sans};color:${o.color ?? '#f3eee6'};letter-spacing:.08em;text-shadow:0 0 ${s * 0.4}px rgba(0,0,0,.95),0 0 ${s * 0.25}px rgba(255,236,210,.25);white-space:nowrap`, box);
      sp.textContent = text;
      F.text(sp, o.kind ?? 'label', text, a + 0.1, b, { noFact: o.noFact });
      F.add((t) => { const on = t >= a && t < b, q = seg(t, a, a + 0.7, E.expoOut); set(box, { opacity: (on ? Math.min(q, 1 - seg(t, b - 0.4, b)) : 0).toFixed(3), transform: `translateY(${(F.px(14) * (1 - q)).toFixed(1)}px)`, filter: on && q < 1 ? `blur(${(6 * (1 - q)).toFixed(1)}px)` : 'none' }); });
      words.push({ a, b, text });
      return sp;
    };
    // where a fact comes from: a small tag in the corner (furniture: small on purpose)
    L.cite = (a, b, text, o = {}) => {
      const s = F.px(PT ? 24 : 20);
      const box = el('div', `right:${F.px(34)}px;top:${PT ? H * 0.045 : F.px(30)}px;opacity:0;font:500 ${s}px/1.3 ${FONT.sans};color:#bdb8ae;letter-spacing:.06em;text-shadow:0 1px 4px rgba(0,0,0,.9);white-space:nowrap`, textL);
      box.textContent = text; F.text(box, 'label', text, a, b, { chrome: true });
      F.add((t) => set(box, { opacity: (t >= a && t < b ? Math.min(seg(t, a, a + 0.5), 1 - seg(t, b - 0.4, b)) : 0).toFixed(3) }));
      return box;
    };
    // the cover / thumbnail: a close shot of the face in its light and the big title beside it (portrait: title above). Set the cover frame with it.
    L.cover = (o = {}) => {
      const a = o.a ?? 0, b = o.b ?? 2;
      const S = L.shot(a, b, { cam: o.cam ?? { x: PT ? 0 : -120, y: -200, h: PT ? 560 : 640 }, ambient: o.ambient, out: o.out ?? 0.35, sway: 0.5 });
      if (o.set) o.set(S);
      const A = S.actor(o.who ?? Object.keys(L.castList)[0] ?? null, { x: o.x ?? (PT ? 0 : 140), y: o.y ?? 0, pose: o.pose ?? 'phone', face: o.face ?? 'empty', hold: o.hold ?? 'phone', s: o.s ?? 1, shadow: o.shadow ?? null });
      if (o.act) o.act(A, S);
      const T = L.title(a, b, o.title, { sub: o.sub, size: o.size ?? (PT ? 170 : 190), y: PT ? 0.2 : 0.48, dim: 0, sfx: false });
      if (!PT) { T.box.style.left = '0'; T.box.style.right = 'auto'; T.box.style.width = W * 0.56 + 'px'; }
      F.coverAt ? F.coverAt(o.at ?? Math.min(b - 0.4, a + 1.2)) : (F._coverAt = o.at ?? Math.min(b - 0.4, a + 1.2));
      return { S, A, T };
    };

    // ---------- checks (printed in --check) ----------
    F.addLint(() => {
      const outL = [], add = (t, what, msg) => outL.push({ level: 'warn', t, src: '', what, msg });
      for (const ti of titles) { const n = cjk(ti.text), wd = ti.text.replace(/[㐀-鿿]/g, ' ').trim().split(/\s+/).filter(Boolean).length; if (n > 8 || (!n && wd > 4)) add(ti.a, M('字卡', 'title card'), M(`字卡"${ti.text}"太长（${n || wd} 个${n ? '字' : '词'}）：这种字卡像封面字，中文 ≤ 8 字`, `Title card "${ti.text}" is too long (${n || wd} ${n ? 'characters' : 'words'}): these cards read like a thumbnail, ≤ 4 words`)); }
      // sparing text: more than one on-screen word line per ~8 s reads as a slideshow
      if (words.length > Math.max(3, F.duration / 8)) add(words[0].a, M('字', 'words'), M(`画面上的字有 ${words.length} 段：这种片子字很少（大约每 8 秒最多一段），让角色的脸和光来讲`, `${words.length} on-screen word lines: this style uses few words (about one per 8 s at most); let the face and the light tell it`));
      // every shot needs a motivated light
      for (const S of shots) { const mid = (S.a + S.b) / 2; let n = 0; try { n = allLights(S, mid).length; } catch (e) { n = 1; } if (!n) add(S.a, M('光', 'light'), M(`${S.a.toFixed(1)} 秒的镜头里没有一盏灯：每个镜头都要有来源明确的光（手机、台灯、闹钟、窗）`, `The shot at ${S.a.toFixed(1)} s has no light: every shot needs a motivated light (a phone, a lamp, an alarm clock, a window)`)); }
      // faces must read: measure the face brightness at each expression change
      for (const S of shots) for (const A of S.actors) for (const k of A.faceK) {
        const t = k.at + k.dur + 0.2; if (t < S.a || t >= S.b || !A.on(t)) continue;
        const st0 = A.stateAt(t); if (st0.pose.back > 0.5) continue;
        F.render(t);
        const [hx, hy] = L.toScreen(S, t, A.now.head[0], A.now.head[1]), [ex2] = L.toScreen(S, t, A.now.head[0] + 60 * A.now.s, A.now.head[1]), r = Math.abs(ex2 - hx);
        if (hx < 0 || hx > W || hy < 0 || hy > H) { add(t, M('表情', 'expression'), M(`${t.toFixed(1)} 秒换了表情，但脸不在画面里`, `The expression changes at ${t.toFixed(1)} s but the face is off screen`)); continue; }
        const x0 = Math.max(0, Math.round(hx - r)), y0 = Math.max(0, Math.round(hy - r * 0.7)), w = Math.max(1, Math.min(W - x0, Math.round(r * 2))), h = Math.max(1, Math.min(H - y0, Math.round(r * 1.4)));
        const d = out.getImageData(x0, y0, w, h).data; let sum = 0; for (let i = 0; i < d.length; i += 16) sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        const lum = sum / (d.length / 16);
        if (lum < 0.1) add(t, M('表情', 'expression'), M(`${t.toFixed(1)} 秒的表情在黑里看不清（脸的亮度 ${lum.toFixed(2)}）：让光打到脸上（手机拿近、台灯、窗光），或者 ambient 调亮一点`, `The expression at ${t.toFixed(1)} s is lost in the dark (face brightness ${lum.toFixed(2)}): light the face (phone closer, a lamp, the window) or raise the ambient`));
      }
      return outL;
    });

    return L;
  };
})();
