// Sound design (starting point for the suspense-mystery style): a late-night investigation, played dead straight. A low room tone under
// everything; a heartbeat when the tension rises; a dissonant orchestral stinger on the question and on each new doubt; a camera shutter, a
// typewriter, push pins and a marker on the evidence; a bright chime chord when the truth is out. Pitched sounds sit in F major / D minor
// (the score's key). Add what the story needs (a door creak, footsteps, a phone buzz) with the palette words in references/sound.md.
// Types the mystery runtime emits: sting (question card), boom (titles, the ident), heart (countdown, ident), shutter (R.flash), type (typed
// text), paper (cards and files), pin (board items), string (red string), pen (marker, strike-outs), msg / pop (chat bubbles, props),
// stamp, zoom (magnifier), click (flashlight), rewind (tape), tick (countdown), static (surveillance cut-in), open (red envelope), resolve (the truth),
// brush (a point written on), tone (the test card), buzz (a phone vibrating), coo / flap (a pigeon: bird prop), crunch (snack prop).
const SR = 44100;
// a heartbeat: lub-dub, a low thump with a body in the 100–200 Hz band so phones hear it
function heartbeat(p, r) {
  const d = 0.75, n = Math.ceil(d * SR), o = new Float32Array(n);
  for (const [t0, f, g] of [[0, 58, 1], [0.17, 52, 0.75]]) {
    let ph = 0; const s0 = Math.round(t0 * SR);
    for (let i = 0; s0 + i < n; i++) { const t = i / SR, env = Math.exp(-t * 16) * Math.min(1, t * 400); ph += (f + 70 * Math.exp(-t * 30)) / SR; o[s0 + i] += (Math.sin(2 * Math.PI * ph) + 0.35 * Math.sin(4 * Math.PI * ph)) * env * g; }
  }
  return o;
}
// the stinger: a cluster of detuned saws (D, E-flat, A-flat: a minor second and a tritone) hitting hard and closing down, over a low boom
function sting(p, r) {
  const d = 1.8, n = Math.ceil(d * SR), o = new Float32Array(n), fs = [73.4, 77.8, 103.8, 146.8, 155.6, 207.7];
  const ph = fs.map(() => r());
  for (let i = 0; i < n; i++) {
    const t = i / SR, env = Math.min(1, t * 120) * Math.exp(-t * 1.9);
    let v = 0; fs.forEach((f, k) => { ph[k] = (ph[k] + (f * (1 + (k % 2 ? 0.004 : -0.003))) / SR) % 1; v += ph[k] * 2 - 1; });
    o[i] = (v / fs.length) * env * 1.6;
  }
  let lp = 0; for (let i = 0; i < n; i++) { const t = i / SR, c = 0.02 + 0.5 * Math.exp(-t * 3); lp += (o[i] - lp) * c; o[i] = lp * 1.8; }
  return o;
}
// a typewriter: uneven key strikes for the length of the typing (dur), sometimes a heavier one
function typewriter(p, r) {
  const d = Math.max(0.12, p.dur ?? 0.5), n = Math.ceil((d + 0.1) * SR), o = new Float32Array(n);
  for (let t0 = 0; t0 < d; t0 += 0.06 + r() * 0.07) {
    const s0 = Math.round(t0 * SR), hv = r() < 0.2 ? 1.4 : 1, f = 1800 + r() * 900;
    let lp = 0;
    for (let i = 0; i < 1600 && s0 + i < n; i++) { const t = i / SR, w = r() * 2 - 1; lp += (w - lp) * 0.5; o[s0 + i] += ((w - lp) * Math.exp(-t * 260) * 0.9 + Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 90) * 0.25 + Math.sin(2 * Math.PI * 140 * t) * Math.exp(-t * 60) * 0.35) * hv; }
  }
  return o;
}
// surveillance cut-in: a short burst of band-limited static
function staticBurst(p, r) {
  const d = p.dur ?? 0.3, n = Math.ceil(d * SR), o = new Float32Array(n);
  let lp = 0, hp = 0;
  for (let i = 0; i < n; i++) { const q = i / n, w = r() * 2 - 1; lp += (w - lp) * 0.6; hp = lp - hp * 0.2; o[i] = hp * (1 - q) * (0.6 + 0.4 * Math.sin(i / 37)) * 0.8; }
  return o;
}
// the end of the broadcast: a test-card tone (1 kHz sine) for as long as the card shows
function tone(p) {
  const d = Math.max(0.2, p.dur ?? 1.5), n = Math.ceil(d * SR), o = new Float32Array(n), f = p.freq ?? 1000;
  for (let i = 0; i < n; i++) { const t = i / SR; o[i] = Math.sin(2 * Math.PI * f * t) * 0.45 * Math.min(1, t * 200, (d - t) * 200); }
  return o;
}
// a phone vibrating on a table: a buzzing motor in pulses
function buzz(p, r) {
  const d = p.dur ?? 0.5, n = Math.ceil(d * SR), o = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, pulse = (t % 0.25) < 0.17 ? 1 : 0; ph += 165 / SR; const w = (ph % 1) * 2 - 1; o[i] = (w * 0.6 + Math.sign(w) * 0.25 + (r() * 2 - 1) * 0.08) * pulse * 0.6; }
  return o;
}
// a pigeon's coo: a throaty "roo-coo", a low voice with a fast flutter, rising then falling
function coo(p, r) {
  const d = 0.75, n = Math.ceil(d * SR), o = new Float32Array(n), f0 = p.freq ?? 300;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, q = t / d, part = q < 0.32 ? q / 0.32 : (q - 0.38) / 0.62, on = q < 0.32 || q >= 0.38 ? Math.sin(Math.PI * Math.min(1, Math.max(0, part))) : 0;
    ph += (f0 + (q < 0.32 ? 40 : 110) * Math.sin(Math.PI * Math.min(1, Math.max(0, part)))) / SR;
    const am = 0.55 + 0.45 * Math.sin(2 * Math.PI * 27 * t);
    o[i] = (Math.sin(2 * Math.PI * ph) + 0.35 * Math.sin(4 * Math.PI * ph) + 0.12 * Math.sin(6 * Math.PI * ph)) * on * am * 0.5;
  }
  return o;
}
// a crisp crunched: a few dry crackles in quick succession
function crunch(p, r) {
  const d = 0.32, n = Math.ceil(d * SR), o = new Float32Array(n);
  for (let t0 = 0; t0 < d - 0.06; t0 += 0.03 + r() * 0.05) {
    const s0 = Math.round(t0 * SR), g = 0.5 + r() * 0.5; let hp = 0, prev = 0;
    for (let i = 0; i < 2600 && s0 + i < n; i++) { const t = i / SR, w = r() * 2 - 1; hp = 0.85 * (hp + w - prev); prev = w; o[s0 + i] += hp * Math.exp(-t * 90) * g * 0.8; }
  }
  return o;
}
export default {
  name: 'One line: what this film sounds like (e.g. a late-night investigation taken far too seriously: room tone, heartbeat, stingers, a typewriter)',
  space: { size: 0.4, mix: 0.16 },
  ambience: { use: 'roomtone', bright: 320, hum: 0, gain: 0.35 },
  vary: 0.07,
  sounds: {
    sting: { layers: [{ use: sting, gain: 0.9 }, { use: 'boom', freq: 36, gain: 0.7 }] },
    boom: { layers: [{ use: 'boom', freq: 40 }, { use: 'impact', freq: 55, gain: 0.5 }] },
    impact: { layers: [{ use: 'boom', freq: 40 }, { use: 'impact', freq: 55, gain: 0.5 }] },
    heart: { use: heartbeat, gain: 0.9 },
    shutter: { use: 'shutter', gain: 0.8 },
    type: { use: typewriter, gain: 0.6 },
    paper: { use: 'paper', grain: 0.6, bright: 2600 },
    pin: { variants: [{ layers: [{ use: 'knock', freq: 'A5', decay: 0.05, gain: 0.5 }, { use: 'click', freq: 3200, gain: 0.4 }] }, { layers: [{ use: 'knock', freq: 'F5', decay: 0.05, gain: 0.5 }, { use: 'click', freq: 2800, gain: 0.4 }] }] },
    string: { use: 'swish', color: 'cloth', from: 700, to: 1900, shape: 'arc', gain: 0.6 },
    pen: { variants: [{ use: 'swish', color: 'air', from: 2600, to: 3800, q: 0.6, shape: 'arc', gain: 0.5 }, { use: 'swish', color: 'air', from: 3000, to: 4300, q: 0.6, shape: 'arc', gain: 0.45 }] },
    msg: { variants: [{ layers: [{ use: 'blip', freq: 880, to: 880, wave: 'sine', dur: 0.09 }, { use: 'blip', freq: 1175, to: 1175, wave: 'sine', dur: 0.14, delay: 0.09 }] }, { layers: [{ use: 'blip', freq: 1047, to: 1047, wave: 'sine', dur: 0.09 }, { use: 'blip', freq: 1397, to: 1397, wave: 'sine', dur: 0.14, delay: 0.09 }] }] },
    pop: { use: 'drop', notes: ['A5', 'D6', 'F6', 'C6'] },
    stamp: { layers: [{ use: 'stamp', freq: 100 }, { use: 'thud', freq: 70, gain: 0.5 }] },
    zoom: { use: 'swish', color: 'air', from: 300, to: 2400, shape: 'up', gain: 0.6 },
    whoosh: { use: 'swish', color: 'air' },
    click: { use: 'click', freq: 1700, decay: 0.02, gain: 0.7 },
    rewind: { layers: [{ use: 'whir', freq: 600, to: 1500, gain: 0.45 }, { use: 'film', rate: 34, bright: 2600, gain: 0.3 }] },
    tick: { use: 'tick', freq: 2300 },
    brush: { use: 'swish', color: 'cloth', from: 900, to: 2600, shape: 'arc', gain: 0.6 },
    tone: { use: tone, gain: 0.8 },
    buzz: { use: buzz, gain: 0.8 },
    coo: { use: coo, gain: 0.7 },
    crunch: { use: crunch, gain: 0.7 },
    flap: { use: 'paper', grain: 0.5, flap: 16, dur: 0.45, bright: 1800, gain: 0.6 },
    static: { use: staticBurst, gain: 0.6 },
    open: { layers: [{ use: 'paper', grain: 0.7, dur: 0.35 }, { use: 'glint', note: 'A6', delay: 0.25, gain: 0.6 }] },
    resolve: { layers: [{ use: 'glass', note: 'F5', gain: 0.6 }, { use: 'glass', note: 'A5', gain: 0.5, delay: 0.06 }, { use: 'glass', note: 'C6', gain: 0.5, delay: 0.12 }, { use: 'glint', note: 'F6', gain: 0.5, delay: 0.16 }, { use: 'swish', color: 'air', from: 500, to: 5000, shape: 'up', dur: 0.5, gain: 0.5 }] },
  },
  hit: 'boom',
  rise: null,
  logo: [{ use: 'stamp', freq: 95, gain: 0.8 }, { use: 'glass', note: 'F5', gain: 0.5, delay: 0.05 }, { use: 'glass', note: 'C6', gain: 0.4, delay: 0.1 }, { use: 'boom', freq: 40, gain: 0.6 }],
};
