// sound.mjs: the sound-design engine. Each project designs a set of sounds for its product in sound.js (usage in references/sound.md); this file handles:
//   - the timbre library (grouped by "material"): paper, film, shutter, wood, glass, water drop, digital tones, thud, stamp, motor, sparkle… all tunable, stackable, or synthesised by your own function
//   - following the motion: every sound event in the picture carries { dur motion length, dir direction, size }, and the sound's length, pan and weight change with it
//   - a slight variation every time (pitch, brightness, volume), so sounds of one kind never sound copy-pasted
//   - one shared space (reverb), so every sound seems to happen in the same place; an optional, very quiet ambience
//   - checks: density, gaps, one kind of sound used too often
export const SR = 44100;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export const noteHz = (x) => { if (typeof x === 'number') return x; const m = String(x).match(/^([A-G][#b]?)(-?\d)$/); if (!m) throw new Error(`看不懂的音高：${x}（写 Hz 数字或音名，如 E6、F#5）`); return hz(12 * (Number(m[2]) + 1) + NOTE[m[1]]); };
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// state-variable filter (cutoff can be a function of time); a cutoff above SR/6 diverges, so it is clamped
export function svf(inp, cutoff, q = 0.7, mode = 'lp') {
  const out = new Float32Array(inp.length); let lp = 0, bp = 0;
  for (let i = 0; i < inp.length; i++) { const fc = typeof cutoff === 'function' ? cutoff(i / SR) : cutoff; const f = 2 * Math.sin((Math.PI * clamp(fc, 20, SR / 6)) / SR); const hp = inp[i] - lp - q * bp; bp += f * hp; lp += f * bp; out[i] = mode === 'lp' ? lp : mode === 'bp' ? bp : hp; }
  return out;
}
const buf = (sec) => new Float32Array(Math.max(1, Math.ceil(sec * SR)));
const noise = (n, r) => { const b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = r() * 2 - 1; return b; };
const brown = (n, r) => { const b = new Float32Array(n); let v = 0; for (let i = 0; i < n; i++) { v = (v + (r() * 2 - 1) * 0.06) * 0.996; b[i] = v * 3; } return b; };
const logLerp = (a, b, q) => a * Math.pow(b / a, clamp(q));
const shapeAmp = (shape, q) => (shape === 'up' ? q ** 1.6 : shape === 'down' ? (1 - q) ** 1.2 : Math.sin(Math.PI * q) ** 1.4); // arc

// ---------- Timbre library (each function: (p, r) → Float32Array; p is the parameters, r the random generator) ----------
export const RECIPES = {
  // Air / cloth / digital sweep (transitions, movement). from / to: sweep start/end Hz; shape: arc loudest in the middle / up getting louder / down getting quieter
  swish(p, r) {
    const d = p.dur ?? 0.5, o = buf(d), n = o.length, from = p.from ?? 350, to = p.to ?? 4200, color = p.color ?? 'air';
    const src = color === 'cloth' ? brown(n, r) : noise(n, r);
    const f = svf(src, (t) => logLerp(from, to, Math.sin((Math.PI / 2) * clamp(t / d))), p.q ?? 0.35, 'bp');
    for (let i = 0; i < n; i++) { const q = i / n; let v = f[i] * shapeAmp(p.shape ?? 'arc', q) * 2.4; if (color === 'cloth') v *= 0.7 + 0.6 * r(); o[i] = v; }
    if (color === 'digital') { const step = Math.max(1, Math.round(SR / (p.crush ?? 6000))); for (let i = 0; i < n; i++) o[i] = o[i - (i % step)]; }
    return o;
  },
  // Paper sliding / page turn: grainy noise (bigger grain = more "rustle"); with flap > 0 it comes in bursts like turning pages
  paper(p, r) {
    const d = p.dur ?? 0.35, o = buf(d), n = o.length, nz = svf(noise(n, r), p.bright ?? 3200, 0.5, 'bp');
    let g = 1;
    for (let i = 0; i < n; i++) { const q = i / n; if (i % 220 === 0) g = 1 - (p.grain ?? 0.6) * r(); const flap = p.flap ? 0.55 + 0.45 * Math.sin(2 * Math.PI * p.flap * (i / SR)) : 1; o[i] = nz[i] * g * flap * shapeAmp(p.shape ?? 'arc', q) * 2.2; }
    return o;
  },
  // Origami: a gust of air from the folding face + fine crackle of paper fibres (densest in the middle) + a soft press when flattened. dur follows the folding motion
  //   crack how much crackle, bright crackle brightness, air the airflow, press the flattening press (0 = none)
  fold(p, r) {
    const d = p.dur ?? 0.5, o = buf(d + 0.3), n = o.length, nd = Math.round(d * SR);
    const air = svf(noise(n, r), (t) => logLerp(p.from ?? 450, p.to ?? 1600, Math.sin((Math.PI / 2) * clamp(t / d))), 0.45, 'bp');
    const ck = new Float32Array(n);
    for (let t = 0.004; t < d; t += 0.003 + 0.014 * r()) { if (r() > Math.sin((Math.PI * t) / d) * (p.density ?? 0.85)) continue; const s0 = Math.round(t * SR), a = 0.25 + 0.75 * r(); for (let i = 0; i < 80 && s0 + i < n; i++) ck[s0 + i] += (r() * 2 - 1) * Math.exp(-i / 12) * a; }
    const cr = svf(ck, p.bright ?? 4300, 0.7, 'bp');
    for (let i = 0; i < n; i++) { const q = clamp(i / nd); o[i] = (i < nd ? air[i] * Math.sin(Math.PI * q) ** 1.3 * 1.5 * (p.air ?? 1) : 0) + cr[i] * (p.crack ?? 0.7) * 2.4; }
    if ((p.press ?? 0.5) > 0) { const pr = RECIPES.paper({ dur: 0.07, bright: 2200, grain: 0.3, shape: 'down' }, r), th = RECIPES.thud({ freq: p.pressFreq ?? 150, decay: 26, felt: 1500, body: 0.3 }, r), s0 = Math.max(0, nd - 400); for (let i = 0; i < th.length && s0 + i < n; i++) o[s0 + i] += (th[i] * 0.6 + (pr[i] || 0) * 0.8) * (p.press ?? 0.5); }
    return o;
  },
  // Pressing a crease: a fingernail running along the fold, a very short, bright sound
  crease(p, r) {
    const d = p.dur ?? 0.12, o = buf(d), n = o.length, f = svf(noise(n, r), (t) => logLerp(p.from ?? 2400, p.to ?? 6800, clamp(t / d)), 1.1, 'bp');
    for (let i = 0; i < n; i++) o[i] = f[i] * Math.sin((Math.PI * i) / n) ** 0.6 * 2.8;
    return o;
  },
  // Scissors cutting paper: the blade scraping the paper (bright noise sweeping up) + a crisp "snip" as it closes + a little metallic ring. scrape scrape length, ring metal pitch (Hz or note name), metal amount of ring
  snip(p, r) {
    const sc = p.scrape ?? 0.035, d = (p.dur ?? 0.11) + 0.08, o = buf(d), n = o.length, ns = Math.round(sc * SR), f = noteHz(p.ring ?? 3400);
    const nz = svf(noise(n, r), (t) => logLerp(p.from ?? 2600, p.to ?? 7000, clamp(t / sc)), 1.1, 'bp');
    for (let i = 0; i < n; i++) { const t = i / SR, tc = t - sc; let v = i < ns ? nz[i] * (i / ns) ** 0.5 * 2.2 : 0; if (tc >= 0) v += (r() * 2 - 1) * Math.exp(-tc * 600) * 0.9 + (Math.sin(2 * Math.PI * f * tc) + 0.5 * Math.sin(2 * Math.PI * f * 2.41 * tc)) * Math.exp(-tc * (p.decay ?? 70)) * (p.metal ?? 0.35); o[i] = v; }
    return o;
  },
  // Picking up / handling paper: light airflow + sparse paper-crinkle crackle (densest in the middle). dur follows the motion; crinkle amount of crinkle, air airflow, bright brightness
  rustle(p, r) {
    const d = p.dur ?? 0.4, o = buf(d), n = o.length, air = svf(noise(n, r), p.bright ?? 2800, 0.6, 'bp'), ck = new Float32Array(n);
    for (let t = 0.005; t < d; t += 0.006 + 0.03 * r()) { const s0 = Math.round(t * SR), a = (0.3 + 0.7 * r()) * Math.sin((Math.PI * t) / d); for (let i = 0; i < 160 && s0 + i < n; i++) ck[s0 + i] += (r() * 2 - 1) * Math.exp(-i / 22) * a; }
    const cr = svf(ck, p.crackle ?? 3800, 0.8, 'bp');
    for (let i = 0; i < n; i++) o[i] = air[i] * shapeAmp(p.shape ?? 'arc', i / n) * 1.2 * (p.air ?? 1) + cr[i] * (p.crinkle ?? 0.8) * 2;
    return o;
  },
  // Tearing paper: dense fibre snapping, the band sweeping from bright downwards, closing faster as the tear goes on. dur follows the motion; from / to sweep (Hz)
  tear(p, r) {
    const d = p.dur ?? 0.35, nd = Math.round(d * SR), o = buf(d + 0.05), n = o.length, ck = new Float32Array(n);
    for (let t = 0.002; t < d; t += 0.0015 + 0.006 * r()) { const s0 = Math.round(t * SR), a = 0.4 + 0.6 * r(); for (let i = 0; i < 60 && s0 + i < n; i++) ck[s0 + i] += (r() * 2 - 1) * Math.exp(-i / 9) * a; }
    const body = svf(ck, (t) => logLerp(p.from ?? 3600, p.to ?? 1400, clamp(t / d)), 0.6, 'bp'), hi = svf(ck, 6000, 0.5, 'hp');
    for (let i = 0; i < n; i++) { const q = clamp(i / nd), env = i < nd ? Math.min(1, q * 12) * (1 - q) ** 0.6 : 0; o[i] = (body[i] * 2.2 + hi[i] * 0.5) * env; }
    return o;
  },
  // Laser / electricity (the comic ZAP): a square wave sweeping down from high, with a very fast vibrato. from / to (Hz), dur, wobble (vibrato Hz)
  zap(p, r) {
    const d = p.dur ?? 0.22, o = buf(d), n = o.length, f0 = noteHz(p.from ?? 2400), f1 = noteHz(p.to ?? 180); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / SR, q = t / d, f = logLerp(f0, f1, q) * (1 + 0.08 * Math.sin(2 * Math.PI * (p.wobble ?? 38) * t)); ph = (ph + f / SR) % 1; o[i] = (ph < 0.5 ? 0.5 : -0.5) * (1 - q) ** 1.5 * Math.min(1, t / 0.002); }
    return svf(o, p.bright ?? 5000, 0.7, 'lp');
  },
  // Spring (the comic BOING): a sine whose pitch wobbles up and down and slowly settles. freq, depth (how far it wobbles), rate (how fast)
  boing(p) {
    const d = p.dur ?? 0.45, o = buf(d), n = o.length, f = noteHz(p.freq ?? 220); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / SR, q = t / d, w = 1 + (p.depth ?? 0.35) * Math.exp(-t * 6) * Math.sin(2 * Math.PI * (p.rate ?? 13) * t); ph += (f * w * (1 + 0.25 * (1 - q))) / SR; o[i] = Math.sin(2 * Math.PI * ph) * (1 - q) ** 1.2 * Math.min(1, t / 0.003); }
    return o;
  },
  // Film advance / ratchet: a string of fine clicks + a low turning sound
  film(p, r) {
    const d = p.dur ?? 0.4, o = buf(d), n = o.length, rate = p.rate ?? 26, f0 = p.bright ?? 2600;
    for (let t = 0.01; t < d - 0.01; t += (1 / rate) * (0.85 + 0.3 * r())) { const s0 = Math.round(t * SR), a = 0.6 + 0.4 * r(); for (let i = 0; i < 260 && s0 + i < n; i++) o[s0 + i] += (r() * 2 - 1) * Math.exp(-i / 40) * a; }
    const cl = svf(o, f0, 0.8, 'bp');
    for (let i = 0; i < n; i++) { const t = i / SR; cl[i] = cl[i] * 2 + Math.sin(2 * Math.PI * (p.whir ?? 110) * t) * 0.12 * Math.sin(Math.PI * clamp(t / d)); }
    return cl;
  },
  // Mechanical shutter: two clicks + a little spring ring
  shutter(p, r) {
    const d = 0.22, o = buf(d), n = o.length, gap = p.gap ?? 0.065, ring = p.ring ?? 1900;
    for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (r() * 2 - 1) * (Math.exp(-t * 110) + (t > gap ? 0.8 * Math.exp(-(t - gap) * 120) : 0)); }
    const b = svf(o, p.tone ?? 3200, 0.7, 'bp'), rg = svf(o, ring, 0.05, 'bp');
    for (let i = 0; i < n; i++) b[i] = b[i] * 1.6 + rg[i] * 0.5;
    return b;
  },
  // Soft thud (felt, tabletop, landing): a falling low tone + a little muffled noise
  thud(p, r) {
    const d = p.dur ?? 0.5, o = buf(d), n = o.length, f = p.freq ?? 70, felt = svf(noise(n, r), p.felt ?? 600, 0.6, 'lp'); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / SR; ph += (f * (1 + 1.2 * Math.exp(-t * 35))) / SR; o[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * (p.decay ?? 9)) * (p.body ?? 1) + felt[i] * Math.exp(-t * 40) * 1.6; }
    return o;
  },
  // Wood knock: a few inharmonic partials, decaying fast
  knock(p, r) {
    const d = 0.25, o = buf(d), n = o.length, f = noteHz(p.freq ?? 380), parts = [[1, 1], [2.32, 0.5], [4.1, 0.25]];
    for (let i = 0; i < n; i++) { const t = i / SR; let v = 0; for (const [k, a] of parts) v += a * Math.sin(2 * Math.PI * f * k * t) * Math.exp(-t * (p.decay ?? 38) * (1 + k * 0.3)); o[i] = v + (i < 120 ? (r() * 2 - 1) * 0.4 * (1 - i / 120) : 0); }
    return o;
  },
  // Glass / bell / metal bar: a long ring of inharmonic partials; note can be a note name (E6)
  glass(p, r) {
    const d = p.dur ?? 1.6, o = buf(d), n = o.length, f = noteHz(p.note ?? 'E6'), parts = p.partials ?? [[1, 1], [2.76, 0.45], [5.4, 0.25], [8.9, 0.12]];
    for (let i = 0; i < n; i++) { const t = i / SR; let v = 0; for (const [k, a] of parts) v += a * Math.sin(2 * Math.PI * f * k * t + k) * Math.exp(-t * (p.decay ?? 2.5) * (0.6 + k * 0.25)); o[i] = v * Math.min(1, t / 0.0015) * 0.6; }
    return o;
  },
  // Digital cue tone: short sine / square / triangle, with a pitch glide
  blip(p) {
    const d = p.dur ?? 0.07, o = buf(d + 0.03), n = o.length, f0 = noteHz(p.freq ?? 1200), f1 = noteHz(p.to ?? f0), wave = p.wave ?? 'sine'; let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / SR; ph = (ph + logLerp(f0, f1, t / d) / SR) % 1; const s = wave === 'square' ? (ph < 0.5 ? 1 : -1) * 0.5 : wave === 'tri' ? 1 - 4 * Math.abs(ph - 0.5) : Math.sin(2 * Math.PI * ph); o[i] = s * Math.min(1, t / 0.002) * (t > d ? Math.max(0, 1 - (t - d) / 0.03) : 1); }
    return o;
  },
  // Water drop: an upward-gliding sine + a very fast decay
  drop(p, r) {
    const d = p.dur ?? 0.14, o = buf(d), n = o.length, f0 = noteHz(p.freq ?? 700), f1 = noteHz(p.to ?? f0 * 2.2); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / SR; ph += logLerp(f0, f1, (t / d) ** 0.6) / SR; o[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 28) * Math.min(1, t / 0.001); }
    return o;
  },
  // Bubbles: a string of small water drops
  bubble(p, r) {
    const d = p.dur ?? 0.3, o = buf(d), k = p.count ?? 4;
    for (let j = 0; j < k; j++) { const s = RECIPES.drop({ freq: (p.freq ?? 600) * (0.8 + 0.6 * r()), dur: 0.08 }, r), s0 = Math.round((j / k) * d * 0.8 * SR); for (let i = 0; i < s.length && s0 + i < o.length; i++) o[s0 + i] += s[i] * (0.6 + 0.4 * r()); }
    return o;
  },
  // Mouse / button click
  click(p, r) { const d = 0.05, o = buf(d), n = o.length, f = p.freq ?? 1800; for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (Math.sin(2 * Math.PI * f * t) * (p.tone ?? 0.5) + (r() * 2 - 1) * (p.noise ?? 0.6)) * Math.exp(-t * (p.decay ?? 160)); } return o; },
  // Mechanical keyboard: a click + a little "thock" from the key body
  key(p, r) { const d = 0.06, o = buf(d), n = o.length, f = (p.bright ?? 2600) * (0.85 + 0.3 * r()); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (r() * 2 - 1) * 0.7 * Math.exp(-t * 240) + Math.sin(2 * Math.PI * f * t) * 0.15 * Math.exp(-t * 200) + Math.sin(2 * Math.PI * (p.body ?? 180) * t) * 0.3 * Math.exp(-t * 60); } return o; },
  tick(p) { const d = 0.035, o = buf(d), n = o.length, f = noteHz(p.freq ?? 3200); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * (p.decay ?? 180)); } return o; },
  // Stamp / pressing down: a thud + a touch of paper
  stamp(p, r) { const a = RECIPES.thud({ freq: p.freq ?? 90, decay: 14, felt: 900 }, r), b = RECIPES.paper({ dur: 0.08, bright: 2400, grain: 0.3, shape: 'down' }, r); for (let i = 0; i < b.length; i++) a[i] += b[i] * 0.5; return a; },
  // Motor / servo: a turning sound whose pitch follows the motion
  whir(p, r) { const d = p.dur ?? 0.5, o = buf(d), n = o.length, f0 = p.freq ?? 160, f1 = p.to ?? 420; let ph = 0; for (let i = 0; i < n; i++) { const q = i / n; ph += logLerp(f0, f1, q) / SR; o[i] = (Math.sin(2 * Math.PI * ph) * 0.5 + Math.sin(4 * Math.PI * ph) * 0.25 + (r() * 2 - 1) * 0.08) * Math.sin(Math.PI * q) ** 0.8; } return svf(o, 2400, 0.6, 'lp'); },
  // Sparkle / glint: a few quick high notes + a little air
  glint(p, r) { const d = p.dur ?? 0.7, o = buf(d), n = o.length, f = noteHz(p.note ?? 'B6'), k = p.count ?? 3; for (let j = 0; j < k; j++) { const s0 = Math.round(j * 0.045 * SR), ff = f * [1, 1.5, 2, 1.25][j % 4]; for (let i = 0; s0 + i < n; i++) { const t = i / SR; o[s0 + i] += Math.sin(2 * Math.PI * ff * t) * Math.exp(-t * 7) * 0.35; } } const air = svf(noise(n, r), 7000, 0.5, 'hp'); for (let i = 0; i < n; i++) o[i] += air[i] * Math.exp(-(i / SR) * 9) * 0.25; return o; },
  // Riser: noise sweeping up (tonal: with an array of note names it becomes an upward-gliding chord)
  riser(p, r) {
    const d = p.dur ?? 1.6, o = buf(d), n = o.length;
    if (p.tonal) { for (const nt of p.tonal) { const f0 = noteHz(nt) / 2, f1 = noteHz(nt); let ph = 0; for (let i = 0; i < n; i++) { const q = i / n; ph = (ph + logLerp(f0, f1, q) / SR) % 1; o[i] += (ph * 2 - 1) * q * q / p.tonal.length; } } return svf(o, (t) => 600 + 5000 * (t / d) ** 2, 0.5, 'lp'); }
    const f = svf(noise(n, r), (t) => logLerp(p.from ?? 400, p.to ?? 7000, (t / d) ** 2), p.q ?? 0.3, 'bp'); for (let i = 0; i < n; i++) o[i] = f[i] * (i / n) ** 2 * 2.4; return o;
  },
  // Reverse swell: a decaying sound played backwards, swelling into a point (good just before a heavy hit)
  swell(p, r) { const inner = RECIPES[p.of ?? 'glass']({ ...p, dur: p.dur ?? 1.2 }, r); return inner.slice().reverse(); },
  // Low rumble / sinking
  boom(p, r) { const d = p.dur ?? 2.4, o = buf(d), n = o.length, nz = svf(noise(n, r), 900, 0.4, 'lp'); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += ((p.freq ?? 34) + 60 * Math.exp(-t * 10)) / SR; o[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 1.6) + nz[i] * Math.exp(-t * 6) * (p.noise ?? 0.7); } return o; },
  // Impact: a low tone + noise "smash"
  impact(p, r) { const d = 0.9, o = buf(d), n = o.length, nz = svf(noise(n, r), p.bright ?? 2500, 0.5, 'lp'); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += ((p.freq ?? 40) + 90 * Math.exp(-t * 18)) / SR; o[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 4) * (p.body ?? 0.9) + nz[i] * Math.exp(-t * 22) * (p.crack ?? 0.9); } return o; },
  pop(p) { const d = 0.12, o = buf(d), n = o.length; let ph = 0; const f0 = p.freq ?? 500; for (let i = 0; i < n; i++) { const t = i / SR; ph += (f0 + (p.rise ?? 700) * (t / d)) / SR; o[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 30); } return o; },
  // Room tone: a very quiet ambience (darkroom fan, air conditioning, something far off)
  roomtone(p, r) { const d = p.dur ?? 10, n = Math.ceil(d * SR), nz = svf(brown(n, r), p.bright ?? 500, 0.6, 'lp'); for (let i = 0; i < n; i++) { const t = i / SR; nz[i] = nz[i] * 0.5 + (p.hum ? Math.sin(2 * Math.PI * p.hum * t) * 0.04 : 0); } return nz; },
  crackle(p, r) { const d = p.dur ?? 10, n = Math.ceil(d * SR), o = svf(noise(n, r), 3200, 0.5, 'lp'); for (let i = 0; i < n; i++) { o[i] *= 0.05; if (r() < 0.0004) o[i] += (r() * 2 - 1) * 0.6; } return o; },
};

// Default sound design (used when there is no sound.js; only a fallback — every product should design its own)
export const DEFAULT_PALETTE = {
  name: '默认（通用）',
  space: { size: 0.3, mix: 0.12 },
  sounds: {
    whoosh: { use: 'swish' }, impact: { use: 'impact' }, boom: { use: 'boom' }, riser: { use: 'riser' },
    click: { use: 'click' }, type: { use: 'key' }, tick: { use: 'tick' }, pop: { use: 'pop' }, shutter: { use: 'shutter' },
  },
  hit: 'impact', rise: 'riser',
  logo: [{ use: 'boom', gain: 0.9 }, { use: 'glass', note: 'E6', gain: 0.5 }, { use: 'shutter', gain: 0.6 }],
};

// Simple reverb (Schroeder: 4 combs + 2 all-passes); size 0–1 sets the size of the space
function reverb(L, R, size, mix) {
  if (!mix) return;
  const n = L.length, combs = [1557, 1617, 1491, 1422].map((d) => Math.round(d * (0.6 + size))), fb = 0.7 + 0.25 * size;
  for (const [ch, off] of [[L, 0], [R, 23]]) {
    const wet = new Float32Array(n);
    for (const d0 of combs) { const d = d0 + off, bufc = new Float32Array(d); let k = 0, lp = 0; for (let i = 0; i < n; i++) { const y = bufc[k]; lp = y * 0.6 + lp * 0.4; bufc[k] = ch[i] + lp * fb; wet[i] += y; k = (k + 1) % d; } }
    for (const d of [225 + off, 556 + off]) { const b = new Float32Array(d); let k = 0; for (let i = 0; i < n; i++) { const x = wet[i], y = b[k] - 0.5 * x; b[k] = x + 0.5 * y; wet[i] = y; k = (k + 1) % d; } }
    for (let i = 0; i < n; i++) ch[i] = ch[i] * (1 - mix * 0.5) + wet[i] * mix * 0.25;
  }
}

// Synthesise one sound (a recipe or several stacked layers) for an event: following the motion + a slight variation every time
function voice(spec, ev, r, palette) {
  const layers = Array.isArray(spec) ? spec : spec.layers ? spec.layers.map((l) => ({ ...spec, ...l, layers: undefined })) : [spec];
  const parts = [];
  for (const l of layers) {
    const fn = typeof l.use === 'function' ? l.use : RECIPES[l.use];
    if (!fn) throw new Error(`没有这种声音：${l.use}（可用：${Object.keys(RECIPES).join(' / ')}，或者写一个函数）`);
    const vary = l.vary ?? palette.vary ?? 0.05, k = 1 + (r() * 2 - 1) * vary;           // slight variation every time
    const size = ev.size ?? 0.5, sizeK = 1 + (size - 0.5) * (l.sizeAmount ?? 0.6);          // bigger = lower, heavier
    const p = { ...l };
    for (const f of ['freq', 'to', 'from', 'bright', 'tone', 'ring', 'body']) if (typeof p[f] === 'number') p[f] *= k / (f === 'body' ? 1 : sizeK);
    if (ev.dur && l.followDur !== false && ['swish', 'paper', 'film', 'whir', 'riser', 'swell', 'fold', 'crease', 'zap', 'boing', 'rustle', 'tear'].includes(l.use)) p.dur = ev.dur;
    if (typeof l.note === 'string' && vary) p.note = noteHz(l.note) * (1 + (r() * 2 - 1) * vary * 0.3);
    const b = fn(p, r, { ...ev, LIB: { svf, noise, rng, noteHz, SR, RECIPES } });
    parts.push({ b, gain: (l.gain ?? 1) * (1 + (r() * 2 - 1) * vary) * (0.75 + 0.5 * size), delay: l.delay ?? 0, pan: l.pan }); // size 0.5 = original volume, bigger = louder
  }
  return parts;
}

// Synthesise all sound effects: events = [{ t, type, gain, dur, dir, size, pan }]
export function renderSfx(plan, palette, duration, seed) {
  const pal = { ...DEFAULT_PALETTE, ...(palette || {}), sounds: { ...DEFAULT_PALETTE.sounds, ...((palette && palette.sounds) || {}) } };
  const r = rng(seed), n = Math.ceil(duration * SR), L = new Float32Array(n), R = new Float32Array(n), warnings = [], used = {};
  // Wrong parameters in the sound design (the kind that don't error, just silently fall back to the default): swish's color is only air / cloth / digital
  { const bad = new Set(); const walk = (x) => { if (!x || typeof x !== 'object') return; if (Array.isArray(x)) return x.forEach(walk); if (x.use === 'swish' && x.color && !['air', 'cloth', 'digital'].includes(x.color)) bad.add(x.color); Object.values(x).forEach(walk); }; walk(pal.sounds); walk(pal.logo);
    if (bad.size) warnings.push(`声音设计里 swish 的 color 写了 ${[...bad].join('、')}：只认 air / cloth / digital（其它的当成 air）`); }
  const put = (b, t, g, pan0, pan1 = pan0) => { const s0 = Math.round(t * SR); for (let i = Math.max(0, -s0); i < b.length && s0 + i < n; i++) { const pn = pan0 + (pan1 - pan0) * (i / b.length), gl = g * Math.cos(((pn + 1) * Math.PI) / 4), gr = g * Math.sin(((pn + 1) * Math.PI) / 4); L[s0 + i] += b[i] * gl; R[s0 + i] += b[i] * gr; } };
  const play = (type, ev) => {
    let spec = pal.sounds[type] ?? (RECIPES[type] ? { use: type } : null);
    if (spec === false || (spec && spec.mute)) return;
    if (!spec) { warnings.push(`声音设计里没有 "${type}"：在 sound.js 的 sounds 里加上它`); return; }
    const k = used[type] || 0; used[type] = k + 1;
    // variants: several sounds used in rotation; notes: pitched sounds step through notes (in one key, so in a row they sound like a melody)
    if (spec.variants) spec = spec.variants[k % spec.variants.length];
    if (spec.notes) spec = { ...spec, note: spec.notes[k % spec.notes.length], freq: spec.use === 'drop' || spec.use === 'blip' || spec.use === 'tick' || spec.use === 'knock' ? noteHz(spec.notes[k % spec.notes.length]) : spec.freq };
    for (const v of voice(spec, ev, r, pal)) {
      const dir = ev.dir ?? 0, pan0 = v.pan ?? ev.pan ?? (dir ? -0.6 * dir : (r() - 0.5) * 0.3), pan1 = v.pan ?? ev.pan ?? (dir ? 0.6 * dir : pan0);
      put(v.b, ev.t + v.delay, 0.5 * (ev.gain ?? 1) * v.gain, pan0, pan1);
    }
  };
  // 'logo' event: play the sonic logo the moment the logo appears on screen (without this event it goes on the end-card beat)
  const logoEv = (plan.sfx || []).find((e) => e.type === 'logo');
  for (const ev of plan.sfx || []) if (ev.type !== 'logo') play(ev.type, ev);
  // Sections: hit = heavy hit at a section start, a riser before the strength goes up (hit / rise can be set to null in the sound design to turn them off)
  const secs = (plan.sections || []).slice().sort((a, b) => a.at - b.at);
  for (let i = 0; i < secs.length; i++) {
    const s = secs[i], prev = secs[i - 1];
    if (pal.rise && prev && s.energy > prev.energy && s.at > 1.6) play(pal.rise, { t: s.at - 1.6, dur: 1.6, gain: 0.7, size: 0.5 });
    if (pal.hit && s.hit) play(pal.hit, { t: s.at, gain: 1.6, size: 0.8 });
  }
  // Sonic logo: the final hit (lands on a beat; the caller gives the time)
  const lt = logoEv ? logoEv.t : plan.logoAt;
  if (lt !== undefined && pal.logo) for (const v of voice(pal.logo, { t: lt, size: 0.8 }, r, pal)) put(v.b, lt + v.delay, 0.5 * v.gain * 1.8 * (logoEv ? logoEv.gain ?? 1 : 1), v.pan ?? 0, v.pan ?? 0);
  // Space + ambience
  reverb(L, R, pal.space?.size ?? 0.3, pal.space?.mix ?? 0.12);
  // Ambience: volume is set from the sound effects' peak — gain 0.1 ≈ about 45 dB below the loudest effect (audible only if you listen closely; not pushed up by loudness normalisation)
  if (pal.ambience) {
    const spec = typeof pal.ambience === 'string' ? { use: pal.ambience } : pal.ambience, b = (typeof spec.use === 'function' ? spec.use : RECIPES[spec.use])({ ...spec, dur: duration }, r);
    let pk = 1e-6; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
    let ss = 0; for (let i = 0; i < b.length; i += 8) ss += b[i] * b[i]; const rms = Math.sqrt(ss / (b.length / 8)) || 1e-6;
    put(b, 0, (pk * 0.0056 * ((spec.gain ?? 0.1) / 0.1)) / rms, 0);
  }
  // ---- Checks ----
  const evs = (plan.sfx || []).filter((e) => !['type'].includes(e.type) && !e.cut).map((e) => e.t).sort((a, b) => a - b);   // the effect on each cut of a fast-cut montage (cut: true) is that passage's beat, not "scoring every move"
  for (let i = 0; i + 3 < evs.length; i++) if (evs[i + 3] - evs[i] < 0.6) { warnings.push(`${evs[i].toFixed(2)} 秒附近 0.6 秒里有 4 个音效（不算打字）：太密，像在"配每一个动作"——只留最重要的一两个`); break; }
  const total = (plan.sfx || []).filter((e) => e.type !== 'type').length, perSec = total / duration; // typing sounds don't count (they are dense by nature)
  if (perSec > 2.2) warnings.push(`平均每秒 ${perSec.toFixed(1)} 个音效：太多了，克制一点（一般每秒 1–1.5 个，打字除外）`);
  const cutUse = {}; for (const e of plan.sfx || []) if (e.cut) cutUse[e.type] = (cutUse[e.type] || 0) + 1;   // the same sound on every cut of a fast-cut montage is intentional
  for (const [k, v] of Object.entries(used)) if (v - (cutUse[k] || 0) >= 8 && !['type', 'tick'].includes(k) && !(pal.sounds[k] && (pal.sounds[k].variants || pal.sounds[k].notes))) warnings.push(`"${k}" 用了 ${v} 次、都是同一种声音：给它设计两三种变体（variants 轮流用，或 notes 依次换音），或者有的地方换成别的声音`);
  const all = (plan.sfx || []).filter((e) => e.type !== 'type').map((e) => e.t).sort((a, b) => a - b);
  for (let i = 0; i + 1 < all.length; i++) if (all[i + 1] - all[i] > 4) warnings.push(`${all[i].toFixed(1)}–${all[i + 1].toFixed(1)} 秒没有任何音效${pal.ambience ? '（只有环境声）' : ''}：确认这段安静是有意的`);
  return { L, R, used, warnings, palette: pal };
}
