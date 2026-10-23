// character.js: Notion-style parametric characters (thick black ink lines + one accent color)
// Character = a "spec" (face shape, hairstyle, facial hair, glasses, hat, outfit, age...) + optional custom parts.
// All characters share the same skeleton, expression parameters and actions; no code is written for any specific person.
//
// Local coordinate system (used when drawing custom parts): the face center is (0,0), face width about 140,
// top of head about y=-100, chin about y=95, eyes at (±26,-2), mouth at (0,56), base of neck y≈128,
// bottom edge of the bust y=230, outer edges of the shoulders x=±150.
(function () {
  const { clamp, lerp, ease, rng, progress } = window.EV;
  const { Item, svgEl, col, smoothD, samplePathD } = window.WB._;

  const INK = '#111111';
  const STROKE = 5;

  // ---------- Spec defaults ----------
  const DEFAULT = {
    face: 'oval',          // oval | round | long | square | heart
    age: 'adult',          // kid | adult | elder
    skin: '#FFFFFF',
    nose: 'hook',          // hook | small | round | long | button
    hair: { style: 'side-part', length: 'short', texture: 'straight', color: 'black' },
    facialHair: [],        // mustache | walrus | beard | goatee | stubble | wisp (long thin three-strand beard)
    glasses: 'none',       // none | round | square | sunglasses
    hat: 'none',           // none | top-hat | cap | beret | bow | headband | guan (small crown on a topknot) | mian (beaded crown, emperor)
    earrings: false,
    outfit: { style: 'tshirt', color: 'white' }, // tshirt | vneck | collar | suit | cravat | turtleneck | hoodie | labcoat | scoop | robe (cross-collar long robe; trim is the collar-edge color)
    accent: '#D6342C',
    parts: [],             // custom parts [{ layer, d, fill, stroke, width }]
  };
  const HAIR_COLORS = { black: '#141414', brown: '#5B3A29', gray: '#BDBDBD', white: '#FFFFFF', blonde: '#EACB7A', red: '#B5533C' };

  const FACES = {
    oval: { W: 68, top: -98, jawW: 50, jawY: 62, chinY: 96, chinR: 22 },
    round: { W: 74, top: -96, jawW: 60, jawY: 58, chinY: 92, chinR: 32 },
    long: { W: 62, top: -104, jawW: 48, jawY: 72, chinY: 106, chinR: 18 },
    square: { W: 70, top: -98, jawW: 64, jawY: 74, chinY: 96, chinR: 34 },
    heart: { W: 72, top: -98, jawW: 40, jawY: 64, chinY: 98, chinR: 8 },
  };

  // ---------- Expressions: all numeric parameters, so they can be interpolated ----------
  const NEUTRAL = { eyeOpen: 1, eyeSize: 1, lookX: 0, lookY: 0, happyEyes: 0, browL: 0, browR: 0, browTilt: 0, mouthCurve: 0.25, mouthOpen: 0, mouthWidth: 1, mouthShift: 0, tilt: 0 };
  const EXPRESSIONS = {
    neutral: {},
    happy: { happyEyes: 1, browL: 0.3, browR: 0.3, mouthCurve: 1, mouthOpen: 0.35, mouthWidth: 1.25, tilt: 3 },
    smile: { browL: 0.15, browR: 0.15, mouthCurve: 0.9, mouthWidth: 1.1 },
    think: { lookX: 0.6, lookY: -0.9, browL: 0.9, browR: -0.1, mouthCurve: -0.1, mouthWidth: 0.6, mouthShift: 6, tilt: -5 },
    surprised: { eyeSize: 1.35, browL: 1, browR: 1, mouthOpen: 0.9, mouthWidth: 0.75, mouthCurve: 0 },
    explain: { browL: 0.25, browR: 0.25, mouthCurve: 0.6, mouthWidth: 1.05, tilt: 2 },
    confused: { lookX: -0.4, browL: 1, browR: -0.4, mouthCurve: -0.45, mouthWidth: 0.7, mouthShift: -6, tilt: 6 },
    sad: { lookY: 0.5, browTilt: -1, browL: 0.2, browR: 0.2, mouthCurve: -0.8, mouthWidth: 0.85, tilt: -3 },
    serious: { browTilt: 0.8, browL: -0.2, browR: -0.2, mouthCurve: -0.15, mouthWidth: 0.85 },
    proud: { eyeOpen: 0.55, browL: 0.4, browR: 0.1, mouthCurve: 0.85, mouthShift: 5, tilt: 4 },
    excited: { eyeSize: 1.2, browL: 0.8, browR: 0.8, mouthCurve: 1, mouthOpen: 0.6, mouthWidth: 1.2, tilt: 2 },
  };

  // ---------- Geometry helpers ----------
  const ptsOf = (d) => samplePathD(d)[0].pts;

  // Add texture along the outer edge's normal (straight, wavy, curly, messy, coily)
  function texture(pts, kind, center, seed, scale = 1) {
    if (!kind || kind === 'straight') return pts;
    const r = rng(seed);
    const spikes = Array.from({ length: 400 }, () => 0.5 + r());
    let s = 0;
    const cum = pts.map((p, i) => (i ? (s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])) : 0));
    const L = s || 1;
    const f = (x) => {
      if (kind === 'wavy') return 6 * scale * Math.sin((2 * Math.PI * x) / 70);
      if (kind === 'curly') return 10 * scale * Math.abs(Math.sin((Math.PI * x) / 28));
      if (kind === 'coily') return 7 * scale * Math.abs(Math.sin((Math.PI * x) / 17));
      if (kind === 'messy') { const k = Math.floor(x / 20), u = (x % 20) / 20; return 9 * scale * spikes[k % 400] * (1 - Math.abs(2 * u - 1)); }
      return 0;
    };
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
      if (nx * (p[0] - center[0]) + ny * (p[1] - center[1]) < 0) { nx = -nx; ny = -ny; }
      const taper = Math.min(1, cum[i] / 14, (L - cum[i]) / 14);
      const off = f(cum[i]) * Math.max(0, taper);
      return [p[0] + nx * off, p[1] + ny * off];
    });
  }
  const closedD = (pts) => smoothD(pts, true) + 'Z';
  const polyD = (pts) => 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z';

  // Messy hair / spiky hair: make spikes along the outer edge (valleys on the outline, tips pointing out); returns a sparse point list joined as a polyline
  function spikes(pts, center, seed, scale = 1, period = 22) {
    const r = rng(seed);
    let s = 0;
    const cum = pts.map((p, i) => (i ? (s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])) : 0));
    const n = Math.max(2, Math.round(s / period));
    const at = (d) => {
      let i = cum.findIndex((c) => c >= d); if (i <= 0) i = 1;
      const u = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      const p = [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)];
      let nx = -(pts[i][1] - pts[i - 1][1]), ny = pts[i][0] - pts[i - 1][0];
      const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m;
      if (nx * (p[0] - center[0]) + ny * (p[1] - center[1]) < 0) { nx = -nx; ny = -ny; }
      return { p, nx, ny };
    };
    const out = [];
    for (let k = 0; k <= n; k++) {
      const v = at((s * k) / n);
      out.push(v.p);
      if (k < n) {
        const m = at((s * (k + 0.5 + (r() - 0.5) * 0.5)) / n);
        const h = (k === 0 || k === n - 1 ? 0.5 : 1) * scale * (10 + r() * 12);
        out.push([m.p[0] + m.nx * h, m.p[1] + m.ny * h]);
      }
    }
    return out;
  }

  // Upper half of an ellipse: from the left endpoint over the top to the right endpoint; returns a cubic Bézier path fragment (without M)
  function ellipseArc(cx, cy, rx, ry) {
    const k = 0.552;
    return `C${cx - rx},${cy - ry * k} ${cx - rx * k},${cy - ry} ${cx},${cy - ry} C${cx + rx * k},${cy - ry} ${cx + rx},${cy - ry * k} ${cx + rx},${cy}`;
  }

  // ---------- Shapes of each part ----------
  function faceD(F) {
    const { W, top, jawW, jawY, chinY, chinR } = F;
    return `M0,${top} C${W * 0.62},${top} ${W},${top * 0.55} ${W},-20 C${W},20 ${jawW + 8},${jawY - 18} ${jawW},${jawY} ` +
      `C${jawW - 10},${jawY + (chinY - jawY) * 0.8} ${chinR},${chinY} 0,${chinY} ` +
      `C${-chinR},${chinY} ${-(jawW - 10)},${jawY + (chinY - jawY) * 0.8} ${-jawW},${jawY} ` +
      `C${-(jawW + 8)},${jawY - 18} ${-W},20 ${-W},-20 C${-W},${top * 0.55} ${-W * 0.62},${top} 0,${top}Z`;
  }
  function earsD(F) {
    const W = F.W;
    return [
      `M${W - 3},-18 C${W + 17},-24 ${W + 19},18 ${W - 3},20`,
      `M${-W + 3},-18 C${-W - 17},-24 ${-W - 19},18 ${-W + 3},20`,
    ];
  }
  const NOSES = {
    hook: 'M4,2 C11,18 13,28 3,32',
    small: 'M-3,24 Q3,31 8,25',
    round: 'M-9,26 Q0,37 9,26',
    long: 'M4,-2 C13,22 15,36 0,40',
    button: 'M-5,24 C-5,32 7,32 7,24',
  };

  // Hairline (inner edge of the front hair), drawn from the right temple to the left temple
  function hairline(style, F) {
    const W = F.W + 6;
    switch (style) {
      case 'middle-part': return { r: [W, -6], l: [-W, -6], d: `C${W - 14},-52 22,-62 0,-78 C-22,-62 ${-W + 14},-52 ${-W},-6` };
      case 'bangs': return { r: [W, -4], l: [-W, -4], d: `C${W - 4},-28 ${W - 16},-40 40,-42 L-40,-42 C${-W + 16},-40 ${-W + 4},-28 ${-W},-4` };
      case 'slick': case 'bun': case 'ponytail': case 'buzz':
        return { r: [W, -14], l: [-W, -14], d: `C${W - 8},-62 30,-80 0,-82 C-30,-80 ${-W + 8},-62 ${-W},-14` };
      case 'spiky': return { r: [W, -8], l: [-W, -8], d: `C${W - 6},-40 40,-52 0,-54 C-40,-52 ${-W + 6},-40 ${-W},-8` };
      case 'afro': return { r: [W, -8], l: [-W, -8], d: `C${W - 10},-50 30,-62 0,-64 C-30,-62 ${-W + 10},-50 ${-W},-8` };
      case 'side-part': default:
        return { r: [W, -8], l: [-W, -16], d: `C${W - 16},-50 20,-44 -22,-76 C-40,-58 ${-W + 6},-50 ${-W},-16` };
    }
  }

  function buildHair(spec, F, seed) {
    const h = { ...DEFAULT.hair, ...spec.hair };
    const fill = HAIR_COLORS[h.color] || h.color;
    const tex = h.texture;
    const parts = { back: [], front: [] };
    const light = ['white', 'gray', 'blonde'].includes(h.color) || /^#(f|e|d|c)/i.test(fill);
    const add = (layer, d, extra = {}) => parts[layer].push({ d, fill, stroke: INK, width: STROKE, ...extra });
    const style = h.style;
    const afro = style === 'afro';

    // Back hair: length determines the lower edge
    const ends = { none: null, short: 8, medium: 80, shoulder: 140, long: 200 };
    const yEnd = afro ? 70 : ends[h.length] ?? null;
    if (yEnd !== null && style !== 'bald' && style !== 'receding') {
      const R = F.W + (afro ? 48 : 16), RY = afro ? 146 : 104, cy = -20;
      const Rs = R + (yEnd > 100 ? 16 : 4);
      const outer = ptsOf(`M${-Rs},${yEnd} C${-Rs},${yEnd - 40} ${-R},${cy + 20} ${-R},${cy} ${ellipseArc(0, cy, R, RY)} C${R},${cy + 20} ${Rs},${yEnd - 40} ${Rs},${yEnd}`);
      const bottom = [[Rs * 0.6, yEnd], [-Rs * 0.6, yEnd]];
      if (!afro && tex === 'messy') add('back', polyD([...spikes(outer, [0, cy], seed, 1), ...bottom]));
      else add('back', closedD([...texture(outer, afro ? 'coily' : tex, [0, cy], seed, afro ? 1.2 : 1), ...bottom]));
    }
    // Ponytail
    if (style === 'ponytail') {
      const W = F.W;
      add('back', closedD(texture(ptsOf(`M${W - 12},-46 C${W + 62},-40 ${W + 74},60 ${W + 40},130 C${W + 30},84 ${W + 18},30 ${W - 16},4`), tex === 'straight' ? 'wavy' : tex, [W + 20, 40], seed + 5, 0.7)));
    }
    // Front hair (crown + hairline)
    if (style === 'receding') {
      for (const sgn of [1, -1]) {
        const W = F.W;
        const outer = ptsOf(`M${sgn * (W - 4)},-50 C${sgn * (W + 14)},-46 ${sgn * (W + 20)},-8 ${sgn * (W + 6)},22`);
        const tx = texture(outer, tex === 'straight' ? 'wavy' : tex, [0, -20], seed + sgn, 0.8);
        add('front', closedD([...tx, [sgn * (W - 2), 16], [sgn * (W - 6), -20]]));
      }
    } else if (style !== 'bald') {
      const hl = hairline(style, F);
      const capY = -12, R = afro ? F.W + 34 : F.W + 7, RY = afro ? 128 : capY - (F.top - 12);
      const outer = ptsOf(`M${hl.l[0]},${hl.l[1]} C${-R},${capY - 30} ${-R},${capY - RY * 0.55} ${-R * 0.55},${capY - RY * 0.95} C${-R * 0.2},${capY - RY * 1.02} ${R * 0.2},${capY - RY * 1.02} ${R * 0.55},${capY - RY * 0.95} C${R},${capY - RY * 0.55} ${R},${capY - 30} ${hl.r[0]},${hl.r[1]}`);
      const ttype = style === 'spiky' ? 'messy' : afro ? 'coily' : style === 'buzz' ? 'straight' : tex;
      const inner = ptsOf(`M${hl.r[0]},${hl.r[1]} ${hl.d}`);
      const capD = ttype === 'messy'
        ? polyD([...spikes(outer, [0, capY - 20], seed + 11, style === 'spiky' ? 1.5 : 1), ...inner.slice(1, -1)])
        : closedD([...texture(outer, ttype, [0, capY - 20], seed + 11, afro ? 1.2 : 1), ...inner.slice(1, -1)]);
      add('front', capD, style === 'buzz' ? { fill: light ? fill : '#555555' } : {});
      // Light-colored hair gets a few strand lines for texture
      if (light && style !== 'buzz') {
        const sl = style === 'middle-part' ? [`M-8,-70 C-24,-58 -40,-50 -52,-30`, `M8,-70 C24,-58 40,-50 52,-30`] : [`M-20,-74 C0,-70 24,-58 44,-34`, `M-34,-64 C-44,-56 -52,-46 -58,-30`];
        sl.forEach((d) => parts.front.push({ d, fill: 'none', stroke: INK, width: 3, clip: capD }));
      }
    }
    if (style === 'bun') add('front', closedD(texture(ptsOf(`M-30,${F.top - 18} C-30,${F.top - 60} 30,${F.top - 60} 30,${F.top - 18} C30,${F.top + 8} -30,${F.top + 8} -30,${F.top - 18}`), 'wavy', [0, F.top - 20], seed + 3, 0.5)));
    return parts;
  }

  function buildFacialHair(list, F, colorName) {
    const fill = HAIR_COLORS[colorName] || colorName || HAIR_COLORS.black;
    const out = [];
    const W = F.W;
    for (const k of list) {
      if (k === 'mustache') out.push({ d: 'M-24,46 C-14,36 -4,40 0,44 C4,40 14,36 24,46 C16,52 6,50 0,48 C-6,50 -16,52 -24,46 Z', fill });
      if (k === 'walrus') out.push({ d: 'M-36,52 C-28,30 -8,32 0,40 C8,32 28,30 36,52 C26,60 10,54 0,50 C-10,54 -26,60 -36,52 Z', fill });
      if (k === 'beard') out.push({ d: `M${-W + 2},8 C${-W + 2},62 -32,${F.chinY + 18} 0,${F.chinY + 18} C32,${F.chinY + 18} ${W - 2},62 ${W - 2},8 C${W - 12},40 40,72 20,74 C10,66 -10,66 -20,74 C-40,72 ${-W + 12},40 ${-W + 2},8 Z`, fill });
      if (k === 'stubble') {
        const r = rng(7), dots = [];
        for (let i = 0; i < 70; i++) {
          const a = Math.PI * (0.08 + 0.84 * r()), rr = 0.72 + 0.26 * r();
          const x = Math.cos(a) * F.jawW * 1.05 * rr, y = 30 + Math.sin(a) * (F.chinY - 34) * rr;
          if (Math.abs(x) < 20 && y < 66) continue;
          dots.push(`M${x.toFixed(1)},${y.toFixed(1)} a1.4,1.4 0 1,0 0.1,0Z`);
        }
        out.push({ d: dots.join(' '), fill: INK, width: 1.2 });
      }
      if (k === 'wisp') {
        // Three-strand beard: two long thin drooping mustache strands + one long strand on the chin (ancient scholars, elders)
        out.push({ d: 'M-2,41 C-12,37 -26,39 -31,49 C-34,57 -34,66 -33,76 C-29,65 -28,55 -24,49 C-17,44 -8,45 -2,45 Z M2,41 C12,37 26,39 31,49 C34,57 34,66 33,76 C29,65 28,55 24,49 C17,44 8,45 2,45 Z', fill });
        out.push({ d: `M-13,${F.chinY - 12} C-16,${F.chinY + 26} -8,${F.chinY + 56} 0,${F.chinY + 80} C8,${F.chinY + 56} 16,${F.chinY + 26} 13,${F.chinY - 12} C6,${F.chinY - 6} -6,${F.chinY - 6} -13,${F.chinY - 12} Z`, fill });
      }
      if (k === 'goatee') out.push({ d: `M-14,72 C-12,${F.chinY + 12} 12,${F.chinY + 12} 14,72 C6,78 -6,78 -14,72 Z`, fill });
    }
    return out;
  }

  function buildGlasses(kind) {
    const e = 26;
    if (kind === 'round') return [{ d: `M${-e - 19},-2 a19,19 0 1,0 38,0 a19,19 0 1,0 -38,0 Z M${e - 19},-2 a19,19 0 1,0 38,0 a19,19 0 1,0 -38,0 Z M-7,-4 Q0,-10 7,-4`, fill: 'none', width: 4 }];
    if (kind === 'square') return [{ d: `M${-e - 22},-18 L${-e + 22},-18 L${-e + 20},14 L${-e - 20},14 Z M${e - 22},-18 L${e + 22},-18 L${e + 20},14 L${e - 20},14 Z M-4,-6 L4,-6`, fill: 'none', width: 4 }];
    if (kind === 'sunglasses') return [{ d: `M${-e - 23},-16 L${-e + 21},-16 C${-e + 21},10 ${-e + 10},16 ${-e},16 C${-e - 14},16 ${-e - 23},8 ${-e - 23},-16 Z M${e - 21},-16 L${e + 23},-16 C${e + 23},8 ${e + 14},16 ${e},16 C${e - 10},16 ${e - 21},10 ${e - 21},-16 Z M-5,-12 L5,-12`, fill: INK, width: 4 }];
    return [];
  }

  function buildHat(kind, F, accent) {
    const t = F.top;
    if (kind === 'top-hat') return [{ d: `M-44,${t - 108} L44,${t - 108} L40,${t + 4} L-40,${t + 4} Z`, fill: INK }, { d: `M-78,${t + 4} C-60,${t - 8} 60,${t - 8} 78,${t + 4} C60,${t + 16} -60,${t + 16} -78,${t + 4} Z`, fill: INK }, { d: `M-41,${t - 16} L41,${t - 16} L40,${t - 2} L-40,${t - 2} Z`, fill: accent }];
    if (kind === 'cap') return [{ d: `M-74,${t + 38} C-78,${t - 40} 78,${t - 40} 74,${t + 38} Z`, fill: accent }, { d: `M20,${t + 36} C60,${t + 28} 110,${t + 36} 118,${t + 48} C90,${t + 52} 50,${t + 50} 20,${t + 46} Z`, fill: accent }];
    if (kind === 'beret') return [{ d: `M-86,${t + 6} C-90,${t - 40} 60,${t - 56} 88,${t - 6} C70,${t + 14} -50,${t + 22} -86,${t + 6} Z M0,${t - 34} L4,${t - 52}`, fill: accent }];
    if (kind === 'bow') return [{ d: `M40,${t + 2} L78,${t - 22} L80,${t + 22} Z M40,${t + 2} L4,${t - 20} L2,${t + 24} Z`, fill: accent }, { d: `M34,${t - 6} a8,8 0 1,0 12,0 a8,8 0 1,0 -12,0 Z`, fill: accent }];
    if (kind === 'guan') return [
      // Small crown: sits over the topknot, with a hairpin pushed through horizontally
      { d: `M-22,${t + 10} L-26,${t - 34} C-14,${t - 48} 14,${t - 48} 26,${t - 34} L22,${t + 10} Z`, fill: accent },
      { d: `M-46,${t - 16} L46,${t - 16}`, fill: 'none', width: 5 },
    ];
    if (kind === 'mian') {
      // Beaded crown (mian): a flat-topped board with strings of beads hanging front and back
      const beads = [];
      for (let x = -78; x <= 78; x += 26) beads.push(`M${x},${t - 30} L${x},${t + 18} M${x - 4},${t + 22} a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0 Z`);
      return [
        { d: `M-40,${t + 10} L-44,${t - 30} L44,${t - 30} L40,${t + 10} Z`, fill: '#1F1F1F' },
        { d: `M-96,${t - 30} L96,${t - 30} L90,${t - 46} L-90,${t - 46} Z`, fill: accent },
        { d: beads.join(' '), fill: 'none', width: 3 },
      ];
    }
    if (kind === 'headband') return [{ d: `M${-F.W - 8},-30 C-50,${t - 26} 50,${t - 26} ${F.W + 8},-30 L${F.W + 6},-42 C50,${t - 40} -50,${t - 40} ${-F.W - 6},-42 Z`, fill: accent }];
    return [];
  }

  function buildBody(outfit, accent) {
    const o = { ...DEFAULT.outfit, ...outfit };
    const c = (x) => (x === 'accent' ? accent : x === 'white' ? '#FFFFFF' : x === 'black' ? '#1F1F1F' : col(x));
    const main = c(o.color);
    const dark = /^#([0-4])/i.test(main) || main === '#1F1F1F';
    const lineC = dark ? '#FFFFFF' : INK;
    const body = [{ d: 'M-150,232 C-150,176 -100,142 -42,128 L42,128 C100,142 150,176 150,232 Z', strokeD: 'M-150,232 C-150,176 -100,142 -42,128 L42,128 C100,142 150,176 150,232', fill: main }];
    const det = [];
    const add = (d, fill = 'none', extra = {}) => det.push({ d, fill, ...extra });
    switch (o.style) {
      case 'vneck': add('M-30,128 L0,170 L30,128', '#FFFFFF'); break;
      case 'scoop': add('M-44,130 Q0,178 44,130', '#FFFFFF'); break;
      case 'collar': add('M-26,126 L-14,162 L0,140 L14,162 L26,126', '#FFFFFF'); add('M0,142 L0,232', 'none', { stroke: lineC, width: 3 }); break;
      case 'suit':
        add('M-26,128 L0,196 L26,128 Z', '#FFFFFF');
        add('M-7,140 L7,140 L10,194 L0,208 L-10,194 Z', o.tie ? c(o.tie) : accent);
        add('M-26,128 L-46,168 L-8,214 M26,128 L46,168 L8,214', 'none', { stroke: lineC, width: 4 }); break;
      case 'cravat':
        add('M-18,126 C-24,150 -16,178 -12,202 L12,202 C16,178 24,150 18,126 Z', '#FFFFFF');
        add('M-12,150 C-4,156 4,156 12,150 M-10,176 C-2,182 4,182 11,176', 'none', { width: 3 });
        add('M-34,132 C-28,172 -22,204 -20,232 M34,132 C28,172 22,204 20,232', 'none', { stroke: lineC, width: 4 }); break;
      case 'turtleneck': add('M-28,96 L-30,134 Q0,146 30,134 L28,96 Q0,106 -28,96 Z', main); add('M-14,104 L-15,138 M0,106 L0,142 M14,104 L15,138', 'none', { stroke: lineC, width: 2.5 }); break;
      case 'hoodie': add('M-66,136 Q0,198 66,136', 'none', { stroke: lineC }); add('M-14,156 L-16,196 M14,156 L16,196', 'none', { stroke: lineC, width: 3 }); break;
      case 'labcoat':
        add('M-26,128 L0,190 L26,128 Z', o.shirt ? c(o.shirt) : accent);
        add('M-26,128 L-50,172 L-6,226 M26,128 L50,172 L6,226', 'none', { width: 4 });
        add('M70,190 L108,190 L106,226 L72,226 Z M84,190 L84,172', 'none', { width: 3 }); break;
      case 'robe': {
        // Cross collar, right-over-left: two collar edges (trim, accent color by default) go around the back of the neck and cross on the chest in a "y" shape, with the viewer's right panel on top
        const trim = o.trim ? c(o.trim) : accent;
        add('M-30,126 L30,126 L0,168 Z', '#FFFFFF');
        add('M-52,134 L-30,126 L0,162 L-17,176 Z', trim);  // inner panel: only visible up to the edge of the outer panel
        add('M52,134 L30,126 L-58,232 L-90,232 Z', trim);
        break;
      }
      case 'tshirt': default: add('M-30,128 Q0,152 30,128', 'none', { stroke: lineC });
    }
    return { body, det };
  }

  // Hand: index finger points along +x
  const HAND_D = 'M-22,-16 C-28,-4 -26,12 -18,17 L6,18 C14,18 15,10 13,6 C19,4 20,-2 17,-6 L46,-6 C53,-8 53,-17 46,-18 L2,-18 C-8,-21 -16,-20 -22,-16 Z';
  const KNUCKLE_D = 'M-2,-4 L13,-4 M-2,7 L12,7';

  // ---------- Character item ----------
  class Character extends Item {
    constructor(board, spec = {}, o = {}) {
      const root = svgEl('g', {}, o.hud ? board.hudSvg : o.layer === 'top' ? board.topSvg : board.inkSvg);
      super(board, o, root);
      const S = { ...DEFAULT, ...spec, hair: { ...DEFAULT.hair, ...(spec.hair || {}) }, outfit: { ...DEFAULT.outfit, ...(spec.outfit || {}) } };
      this.spec = S;
      this.kind = 'character';
      const F = { ...(FACES[S.face] || FACES.oval) };
      if (S.age === 'kid') { F.top += 6; F.chinY -= 8; F.jawY -= 6; }
      this.F = F;
      this.kid = S.age === 'kid';
      const seed = o.seed ?? board.nextSeed();
      this.seed = seed;

      const size = o.size ?? 360;
      this.s = size / 400;
      this.flip = o.flip ? -1 : 1;
      this.X = o.x ?? board.W * 0.16;   // default: stands at the lower left of the frame (works in landscape and portrait)
      this.Y = o.y ?? board.H;
      const place = svgEl('g', { transform: `translate(${this.X},${this.Y - 230 * this.s}) scale(${this.s * this.flip},${this.s})` }, root);
      this.box = { x: this.X - 150 * this.s, y: this.Y - 400 * this.s, w: 300 * this.s, h: 400 * this.s };

      // Layers (back to front)
      this.gBack = svgEl('g', {}, place);
      const gBody = svgEl('g', {}, place);
      this.gBody = gBody;
      this.gHead = svgEl('g', {}, place);
      this.gArm = svgEl('g', {}, place);
      const clipId = 'cc' + board.nextSeed();
      const cp = svgEl('clipPath', { id: clipId }, place);
      svgEl('rect', { x: -3000, y: -3000, width: 6000, height: 3232 }, cp); // clip only below the bottom edge of the bust (hides the hand when lowered)
      this.gArm.setAttribute('clip-path', `url(#${clipId})`);

      const hair = buildHair(S, F, seed);
      const hairFill = HAIR_COLORS[S.hair.color] || S.hair.color;
      const { body, det } = buildBody(S.outfit, S.accent);
      const longHair = ['shoulder', 'long'].includes(S.hair.length) && !['ponytail', 'bun', 'receding', 'bald'].includes(S.hair.style);
      const custom = (layer) => (S.parts || []).filter((p) => (p.layer || 'top') === layer);

      // Each static part: { group, d, fill, strokeD, width }; on entrance, strokes are drawn in order
      this.parts = [];
      const mk = (group, list, order) => list.forEach((p) => this.addPart(group, p, order));
      mk(this.gBack, [...hair.back, ...custom('hairBack')], 3);
      mk(gBody, [{ d: 'M-22,60 L-24,134 L24,134 L22,60 Z', strokeD: 'M-22,60 L-24,130 M22,60 L24,130', fill: S.skin }], 4);
      mk(gBody, [...body, ...det, ...custom('body')], 5);
      if (!longHair) mk(this.gHead, earsD(F).map((d) => ({ d: d + 'Z', strokeD: d, fill: S.skin })), 1);
      mk(this.gHead, [{ d: faceD(F), fill: S.skin }], 0);
      if (S.age === 'elder') mk(this.gHead, [{ d: 'M-22,-50 Q0,-55 22,-50 M-16,-40 Q0,-44 16,-40 M-40,28 Q-44,42 -36,54 M40,28 Q44,42 36,54', fill: 'none', width: 3 }], 6);
      mk(this.gHead, [{ d: NOSES[S.nose] || NOSES.hook, fill: 'none', width: 4 }], 6);
      this.gFeat = svgEl('g', {}, this.gHead);
      mk(this.gHead, buildFacialHair([].concat(S.facialHair || []), F, S.facialHairColor || S.hair.color), 7);
      mk(this.gHead, [...hair.front, ...custom('hairFront')], 2);
      mk(this.gHead, buildGlasses(S.glasses), 8);
      if (S.earrings) mk(this.gHead, [{ d: `M${F.W - 2},24 a5,5 0 1,0 0.1,0 Z M${-F.W + 2},24 a5,5 0 1,0 0.1,0 Z`, fill: S.accent, width: 3 }], 8);
      mk(this.gHead, buildHat(S.hat, F, S.accent), 9);
      mk(this.gHead, [...custom('top'), ...custom('face')], 9);
      this.parts.sort((a, b) => a.order - b.order);
      this.total = this.parts.reduce((a, p) => a + p.len, 0);

      // Facial features (updated every frame)
      const f = this.gFeat;
      const E = (k) => svgEl('ellipse', { fill: INK }, f);
      const P = (w) => svgEl('path', { fill: 'none', stroke: INK, 'stroke-width': w, 'stroke-linecap': 'round' }, f);
      this.el = { eyeL: E(), eyeR: E(), lidL: P(4.5), lidR: P(4.5), browL: P(6), browR: P(6), mouthLine: P(5), mouthFill: svgEl('path', { fill: INK, stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }, f) };

      // Arm (pointing action)
      // Arm = two segments shoulder → elbow → wrist, thick ink outline + sleeve in the outfit color, layered in front of the body
      this.arm = svgEl('path', { fill: 'none', stroke: INK, 'stroke-width': 46, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, this.gArm);
      this.armIn = svgEl('path', { fill: 'none', stroke: body[0].fill, 'stroke-width': 36, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, this.gArm);
      this.gProp = svgEl('g', {}, this.gArm); // prop in hand: drawn beneath the hand, so the hand "grips" the prop
      this.hand = svgEl('g', {}, this.gArm);
      svgEl('path', { d: HAND_D, fill: S.skin, stroke: INK, 'stroke-width': 4.5, 'stroke-linejoin': 'round' }, this.hand);
      svgEl('path', { d: KNUCKLE_D, fill: 'none', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, this.hand);
      this.gArm.style.display = 'none';

      this.dur = o.dur ?? 1.8;
      this.ease = ease.linear;
      this.exprs = [];
      this.talks = [];
      this.points = [];
      this.nods = [];
      if (o.expr) this.expr(this.start, o.expr, 0.01);
      // Blink schedule (fixed seed, reproducible)
      const r = rng(seed + 99);
      this.blinks = [];
      if (o.blink !== false) for (let t = this.start + 1.2 + r() * 2; t < this.start + 900; t += 2.2 + r() * 2.6) this.blinks.push(t);
      board.add(this);
    }

    addPart(group, p, order) {
      const d = p.d;
      if (p.clip) {
        const id = 'hc' + this.b.nextSeed();
        svgEl('path', { d: p.clip }, svgEl('clipPath', { id }, group));
        group = svgEl('g', { 'clip-path': `url(#${id})` }, group);
      }
      const acc = (v) => (v === 'accent' ? this.spec.accent : v);
      const fill = acc(p.fill) ?? 'none';
      let fillEl = null;
      if (fill !== 'none') fillEl = svgEl('path', { d, fill, opacity: 0, stroke: 'none' }, group);
      const strokeEl = svgEl('path', { d: p.strokeD || d, fill: 'none', stroke: acc(p.stroke) || INK, 'stroke-width': p.width ?? STROKE, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, group);
      const len = strokeEl.getTotalLength() || 1;
      strokeEl.style.strokeDasharray = `${len} ${len + 10}`;
      strokeEl.style.strokeDashoffset = len;
      // Light fills (face, white clothes) are opaque as soon as drawing starts; dark fills (hair, dark clothes) are "inked" when the outline is nearly finished
      const m = /^#([0-9a-f]{6})$/i.exec(fill);
      const lum = m ? [0, 2, 4].reduce((a, i, k) => a + parseInt(m[1].substr(i, 2), 16) * [0.299, 0.587, 0.114][k], 0) / 255 : 0;
      this.parts.push({ strokeEl, fillEl, len, order, light: lum > 0.8 });
    }

    // ---------- Action API ----------
    // Switch expression: name is a preset name, or a partial override {param: value} (e.g. {lookX: 1})
    expr(at, name, dur = 0.3) {
      const params = typeof name === 'string' ? EXPRESSIONS[name] : name;
      if (!params) throw new Error(`Unknown expression: "${name}". Available: ${Object.keys(EXPRESSIONS).join(', ')}`);
      this.exprs.push({ at, dur, reset: typeof name === 'string', params });
      this.exprs.sort((a, b) => a.at - b.at);
      return this;
    }
    look(at, x, y, dur = 0.25) { return this.expr(at, { lookX: x, lookY: y }, dur); }
    // Make the character "say" some narration lines from the timeline: the mouth opens and closes with per-word timing
    // o.from / o.to: say only the part of the line from one word to another (used when the narration quotes the character's own words)
    say(ids, o = {}) {
      const T = this.b.T;
      for (const id of [].concat(ids)) {
        const l = T(id);
        const t0 = o.from ? T.word(id, o.from) : -Infinity, t1 = o.to ? T.wordEnd(id, o.to) : Infinity;
        const ws = (l.words && l.words.length ? l.words : [{ text: l.text, start: l.start, end: l.end }]).filter((w) => w.start >= t0 - 0.01 && w.end <= t1 + 0.01);
        if (!ws.length) (this.sayWarn = this.sayWarn || []).push(`say('${id}') matched no words; the mouth will not move`);
        ws.forEach((w) => {
          const latin = /^[A-Za-z'’\-]+$/.test(w.text);
          const n = latin ? Math.max(1, Math.round(w.text.length / 3)) : Math.max(1, w.text.replace(/[^一-鿿\w]/g, '').length);
          this.talks.push({ start: w.start, end: w.end, n });
        });
      }
      this.talks.sort((a, b) => a.start - b.start);
      return this;
    }
    nod(at, dur = 0.5) { this.nods.push({ at, dur }); return this; }
    // Raise the hand to point at a spot on the whiteboard (world coordinates), lowering it after hold seconds.
    // o.prop: prop held in the hand, a part list like b.sketch (strings or {d, fill, stroke, width}),
    //   drawn at world size (pixels); origin = the grip position, +x = the direction toward the target (draw sword blades, pointers, torches along +x).
    // If the previous point hasn't been lowered yet, the new point turns directly from the current pose (sword swing, pointing in a new direction) instead of lowering and raising again.
    point(at, x, y, o = {}) {
      const p = { at, x, y, hold: o.hold ?? 1.5, dur: o.dur ?? 0.35, prop: o.prop ? this.buildProp(o.prop, o) : null };
      this.points.push(p);
      this.points.sort((a, b) => a.at - b.at);
      return this;
    }
    // Point at (x, y) holding a prop: shorthand for point
    hold(at, x, y, prop, o = {}) { return this.point(at, x, y, { ...o, prop }); }
    buildProp(parts, o) {
      const WBcol = window.WB._.col, col = (v) => WBcol(v === 'accent' ? this.spec.accent : v);
      const g = svgEl('g', { transform: `scale(${1 / this.s})`, display: 'none' }, this.gProp);
      for (const part of [].concat(parts)) {
        const q = typeof part === 'string' ? { d: part } : part;
        svgEl('path', { d: q.d, fill: q.fill ? col(q.fill) : 'none', stroke: col(q.stroke || o.color || 'ink'), 'stroke-width': q.width ?? o.width ?? 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      }
      return g;
    }

    // ---------- Rendering ----------
    draw(p) {
      let budget = clamp(p / 0.82) * this.total;
      for (const part of this.parts) {
        const q = clamp(budget / part.len);
        budget -= part.len;
        part.strokeEl.style.strokeDashoffset = part.len * (1 - q);
        if (part.fillEl) part.fillEl.setAttribute('opacity', part.light ? (q > 0 ? 1 : 0) : clamp((q - 0.5) / 0.5));
      }
      this.gFeat.style.opacity = clamp((p - 0.8) / 0.2);
    }

    state(t) {
      let cur = { ...NEUTRAL }, goal = { ...NEUTRAL };
      for (const e of this.exprs) {
        if (t < e.at) break;
        goal = e.reset ? { ...NEUTRAL, ...e.params } : { ...goal, ...e.params };
        const q = progress(t, e.at, e.dur, ease.inOut);
        const next = {};
        for (const k in NEUTRAL) next[k] = lerp(cur[k], goal[k], q);
        cur = next;
      }
      return cur;
    }

    update(t) {
      super.update(t);
      if (this._vis) this.animate(t);
    }

    animate(t) {
      const st = this.state(t);
      // Speaking: one open-close per character
      let talk = 0;
      for (const w of this.talks) {
        if (t < w.start) break;
        if (t < w.end) {
          const ph = ((t - w.start) / (w.end - w.start)) * w.n;
          const k = Math.floor(ph);
          const amp = 0.55 + 0.45 * rng(this.seed + k * 13 + Math.round(w.start * 100))();
          talk = amp * Math.pow(Math.sin(Math.PI * (ph - k)), 0.7) * 0.8;
          break;
        }
      }
      const open = Math.max(st.mouthOpen, talk);
      // Blinking
      let blink = 1;
      for (const b of this.blinks) { if (b > t) break; const q = (t - b) / 0.16; if (q < 1) blink = 1 - Math.sin(Math.PI * q); }
      // Head: expression tilt + nodding + breathing + slight sway while speaking
      let nod = 0;
      for (const n of this.nods) { const q = clamp((t - n.at) / n.dur); if (q > 0 && q < 1) nod += 7 * Math.sin(Math.PI * q); }
      const bob = Math.sin((2 * Math.PI * t) / 3.6 + this.seed) * 1.6;
      const sway = talk > 0 ? Math.sin(t * 5.3) * 1.2 : 0;
      const head = `translate(0,${bob}) rotate(${st.tilt + nod + sway},0,95)`;
      this.gHead.setAttribute('transform', head);
      this.gBack.setAttribute('transform', head);
      this.gBody.setAttribute('transform', `translate(0,${bob * 0.4})`);
      this.drawFeatures(st, open, blink);
      this.drawArm(t);
    }

    drawFeatures(st, open, blink) {
      const e = this.el, kid = this.kid;
      const ex = kid ? 28 : 26, ey = kid ? 4 : -2;
      const lx = st.lookX * 6.5, ly = st.lookY * 5;
      const size = st.eyeSize * (kid ? 1.25 : 1);
      const eyeOpen = st.eyeOpen * blink;
      for (const [sgn, eye, lid] of [[-1, e.eyeL, e.lidL], [1, e.eyeR, e.lidR]]) {
        const cx = sgn * ex + lx, cy = ey + ly;
        if (st.happyEyes > 0.5) {
          eye.setAttribute('rx', 0); eye.setAttribute('ry', 0);
          lid.setAttribute('d', `M${cx - 9},${cy + 3} Q${cx},${cy - 9} ${cx + 9},${cy + 3}`);
        } else if (eyeOpen < 0.22) {
          eye.setAttribute('rx', 0); eye.setAttribute('ry', 0);
          lid.setAttribute('d', `M${cx - 7},${cy} L${cx + 7},${cy}`);
        } else {
          eye.setAttribute('cx', cx); eye.setAttribute('cy', cy);
          eye.setAttribute('rx', 5.8 * size); eye.setAttribute('ry', 7.2 * size * eyeOpen);
          lid.setAttribute('d', '');
        }
      }
      // Eyebrows: raise moves up/down; tilt>0 inner ends down (angry), <0 inner ends up (sad)
      for (const [sgn, el, raise] of [[-1, e.browL, st.browL], [1, e.browR, st.browR]]) {
        const cx = sgn * ex, cy = ey - 27 - raise * 10 + (kid ? -2 : 0);
        const a = st.browTilt * 0.35;
        const dx = 11 * Math.cos(a), dy = 11 * Math.sin(a);
        // inner end = the end nearer the midline
        const inner = [cx - sgn * dx, cy + dy], outer = [cx + sgn * dx, cy - dy];
        el.setAttribute('d', `M${outer[0]},${outer[1]} L${inner[0]},${inner[1]}`);
      }
      // Mouth
      const mx = st.mouthShift, my = 56 - (kid ? 4 : 0), w = 17 * st.mouthWidth * (open > 0.1 ? 0.88 : 1), c = st.mouthCurve;
      const yc = my - c * 7;
      if (open > 0.08) {
        e.mouthLine.setAttribute('d', '');
        e.mouthFill.setAttribute('d', `M${mx - w},${yc} Q${mx},${my + c * 3 - open * 6} ${mx + w},${yc} Q${mx},${my + c * 11 + open * 42} ${mx - w},${yc} Z`);
      } else {
        e.mouthFill.setAttribute('d', '');
        e.mouthLine.setAttribute('d', `M${mx - w},${yc} Q${mx},${my + c * 11} ${mx + w},${yc}`);
      }
    }

    // Arm pose at time t (in the character's own coordinates); returns null when the hand isn't raised
    armAt(t) {
      let i = -1;
      this.points.forEach((p, k) => { if (t >= p.at && t < p.at + p.dur * 2 + p.hold) i = k; });
      if (i < 0) return null;
      const pt = this.points[i];
      const up = ease.outBack(clamp((t - pt.at) / pt.dur));
      const down = ease.in(clamp((t - (pt.at + pt.dur + pt.hold)) / pt.dur));
      const e = Math.max(0, up * (1 - down));
      const g = this.armPose(pt);
      // Start: if the previous point is still raised, turn from that pose; otherwise raise from the relaxed pose hanging below the bust
      const prev = i > 0 ? this.points[i - 1] : null;
      const held = prev && pt.at < prev.at + prev.dur + prev.hold;
      const g0 = held ? this.armPose(prev) : null;
      const from = g0 && g0.side === g.side ? { hand: g0.hand, ang: g0.ang } : { hand: [g.side * 110, 300], ang: -Math.PI / 2 };
      const upOnly = held && g0.side === g.side;
      const k = upOnly ? clamp((t - pt.at) / pt.dur) : e;
      const q = upOnly ? (t < pt.at + pt.dur + pt.hold ? ease.inOut(k) : 1 - down) : e;
      const base = upOnly && t >= pt.at + pt.dur + pt.hold ? { hand: [g.side * 110, 300], ang: -Math.PI / 2 } : from;
      const hand = [lerp(base.hand[0], g.hand[0], q), lerp(base.hand[1], g.hand[1], q)];
      const ang = lerp(base.ang, g.ang, clamp(q));
      // Consecutive points (without lowering the hand in between) keep holding the most recently given prop
      let carried = null;
      for (let j = i; j > 0 && !carried; j--) {
        const a = this.points[j - 1], b = this.points[j];
        if (b.prop || b.at >= a.at + a.dur + a.hold || this.armPose(a).side !== this.armPose(b).side) break;
        carried = a.prop;
      }
      return { pt, g, hand, ang, e: upOnly ? 1 - down : e, carried };
    }

    // Position and orientation of the hand on the whiteboard at time t (world coordinates; angle in radians, in the direction of the finger / prop); returns null when the hand isn't raised.
    // Used to place other items at the hand, e.g. something being handed over, or a line shooting out of the hand
    handAt(t) {
      const a = this.armAt(t);
      if (!a) return null;
      const s = this.s, f = this.flip;
      const ang = f > 0 ? a.ang : Math.PI - a.ang;
      return { x: this.X + a.hand[0] * s * f, y: this.Y - 230 * s + a.hand[1] * s, angle: Math.atan2(Math.sin(ang), Math.cos(ang)), raised: a.e };
    }

    drawArm(t) {
      const a = this.armAt(t);
      for (const p of this.points) if (p.prop) p.prop.setAttribute('display', 'none');
      if (!a) { this.gArm.style.display = 'none'; return; }
      const { g, hand, ang } = a;
      const wrist = [hand[0] - Math.cos(ang) * 30, hand[1] - Math.sin(ang) * 30];
      const elbow = this.elbow(g.shoulder, wrist, g.side);
      const d = `M${g.shoulder[0]},${g.shoulder[1]} L${elbow[0]},${elbow[1]} L${wrist[0]},${wrist[1]}`;
      this.arm.setAttribute('d', d);
      this.armIn.setAttribute('d', d);
      const flipHand = Math.cos(ang) < 0;
      this.hand.setAttribute('transform', `translate(${hand[0]},${hand[1]}) rotate(${(ang * 180) / Math.PI}) scale(1.4${flipHand ? ',-1.4' : ''})`);
      // Prop: follows the hand; fades in while raising and out while lowering (the relaxed pose has the hand pointing up, so the prop must not show in front of the chest)
      const prop = a.pt.prop || a.carried;
      if (prop) {
        const tr = `translate(${hand[0]},${hand[1]}) rotate(${(ang * 180) / Math.PI})${flipHand ? ' scale(1,-1)' : ''}`;
        prop.setAttribute('transform', `${tr} scale(${1 / this.s})`);
        prop.setAttribute('display', '');
        prop.setAttribute('opacity', clamp((a.e - 0.35) / 0.4));
      }
      this.gArm.style.display = '';
    }

    lint(add) {
      for (const w of this.sayWarn || []) add('warn', this.start, this, w);
      for (const p of this.points) {
        if (p.at < this.end) add('warn', p.at, this, 'character starts pointing before it finishes drawing');
        const r = this.b.project({ x: p.x, y: p.y, w: 1, h: 1 }, p.at + p.dur, this.o.hud);
        if (r.x < 0 || r.y < 0 || r.x > this.b.W || r.y > this.b.H) add('warn', p.at, this, `pointing target (${Math.round(p.x)}, ${Math.round(p.y)}) is outside the frame`);
      }
    }

    // Pointing pose: shoulder on the outer side of the body, hand reaching toward the target (points horizontally when the target is below)
    armPose(pt) {
      const lx = ((pt.x - this.X) / this.s) * this.flip, ly = (pt.y - (this.Y - 230 * this.s)) / this.s;
      const side = lx >= 0 ? 1 : -1;
      const shoulder = [side * 104, 150];
      let dx = lx - shoulder[0], dy = ly - shoulder[1];
      if (dy > -0.15 * Math.abs(dx)) dy = -0.15 * Math.abs(dx);
      if (side * dx < 0.35 * Math.abs(dy)) dx = side * 0.35 * Math.abs(dy);
      const n = Math.hypot(dx, dy) || 1;
      const reach = 112;
      const hand = [shoulder[0] + (dx / n) * reach, shoulder[1] + (dy / n) * reach];
      const ang = Math.atan2(ly - hand[1], lx - hand[0]);
      return { side, shoulder, hand, ang };
    }

    // Elbow position of the two-segment arm (upper arm and forearm each of length L), elbow bending outward and down
    elbow(s, w, side) {
      const L = 64;
      const dx = w[0] - s[0], dy = w[1] - s[1];
      const d = clamp(Math.hypot(dx, dy), 1, 2 * L - 1);
      const a = Math.acos(d / (2 * L));
      const base = Math.atan2(dy, dx);
      const c1 = [s[0] + Math.cos(base + a) * L, s[1] + Math.sin(base + a) * L];
      const c2 = [s[0] + Math.cos(base - a) * L, s[1] + Math.sin(base - a) * L];
      const score = (c) => c[1] + side * c[0] * 0.2;
      return score(c1) > score(c2) ? c1 : c2;
    }
  }

  // spec: the character's spec object, or its name in window.CAST (characters.js) — the same person looks the same in every scene.
  // o.faceTo: another character → this one faces it (flip chosen from the two positions; eyes turned toward it); busts can't turn later.
  window.WB.Board.prototype.character = function (spec, o = {}) {
    if (window.EV && window.EV.castCheck) window.EV.castCheck(window.CAST, null, 'whiteboard');
    if (typeof spec === 'string') { const s = (window.CAST || {})[spec]; if (!s) throw new Error(`No character "${spec}" in window.CAST (characters.js)`); spec = s; }
    if (o.faceTo) { o = { ...o, flip: o.faceTo.X < (o.x ?? 300) }; }
    const c = new Character(this, spec, o);
    if (o.faceTo) c.expr(-1e9, { lookX: 0.7 }, 0);
    return c;
  };
  window.WB.EXPRESSIONS = EXPRESSIONS;
  window.WB.CHARACTER_DEFAULT = DEFAULT;
})();
