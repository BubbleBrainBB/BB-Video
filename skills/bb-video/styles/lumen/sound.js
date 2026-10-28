// Sound design (starting point for the dark cinematic motivational style): small, close, real-room sounds in a dark room — a thumb flicking a
// screen, a clock, a phone buzzing on wood, an alarm, a blanket, a door — and a few soft "glows" when information lights up. Same key as score.js (A minor).
// Types the lumen runtime emits: swipe (scrolling), tick (a clock rolling), beep (the alarm), buzz (a phone notification), step, key, breath (a sigh),
// heart (a tremble with heart: true), glow (a gauge / chart / x-ray lighting up), hit (a title card, a startle), whoosh (into a title card).
// Also here for the picture to place: click (a switch, a lock), door (a door shutting), rustle (a blanket), thud (a head on the desk).
const SR = 44100;
function heart(p, r, ev) {   // lub-dub: two soft low thumps
  const n = Math.ceil(0.6 * SR), o = new Float32Array(n);
  for (const [d, f, g] of [[0, 58, 1], [0.18, 50, 0.7]]) { let ph = 0; const s0 = Math.round(d * SR); for (let i = 0; s0 + i < n; i++) { const t = i / SR; ph += (f + 30 * Math.exp(-t * 30)) / SR; o[s0 + i] += Math.sin(2 * Math.PI * ph) * Math.exp(-t * 16) * g + Math.sin(2 * Math.PI * ph * 3) * Math.exp(-t * 30) * g * 0.25; } }
  return o;
}
function buzz(p, r) {   // a phone vibrating on a hard surface: two short rattles
  const n = Math.ceil(0.75 * SR), o = new Float32Array(n);
  for (const d of [0, 0.38]) { const s0 = Math.round(d * SR); for (let i = 0; i < 0.26 * SR && s0 + i < n; i++) { const t = i / SR, e = Math.min(1, t / 0.01) * Math.min(1, (0.26 - t) / 0.03); o[s0 + i] += (Math.sign(Math.sin(2 * Math.PI * 165 * t)) * 0.4 + Math.sin(2 * Math.PI * 330 * t) * 0.3 + (r() * 2 - 1) * 0.15) * e * (0.6 + 0.4 * Math.sin(2 * Math.PI * 22 * t)); } }
  return ev.LIB.svf(o, 1800, 0.6, 'lp');
}
export default {
  name: 'One line: what this film sounds like (e.g. a dark bedroom at 1 a.m.: a thumb on glass, a clock, a phone buzzing, then the window)',
  space: { size: 0.45, mix: 0.18 },
  ambience: { use: 'roomtone', bright: 380, hum: 0, gain: 0.08 },
  vary: 0.06,
  sounds: {
    swipe: { variants: [{ use: 'swish', from: 1800, to: 5200, dur: 0.12, color: 'air', gain: 0.5 }, { use: 'swish', from: 2000, to: 6000, dur: 0.1, color: 'air', gain: 0.45 }] },
    tick: { use: 'tick', freq: 'A6', decay: 220 },
    beep: { use: 'blip', freq: 'A6', dur: 0.16, wave: 'square', gain: 0.55 },
    buzz: { use: buzz },
    step: { use: 'thud', freq: 80, gain: 0.35 },
    key: { variants: [{ use: 'key', bright: 2400 }, { use: 'key', bright: 2000 }, { use: 'key', bright: 2800 }] },
    breath: { use: 'swish', from: 400, to: 1400, dur: 1.2, color: 'air', shape: 'arc', gain: 0.5 },
    heart: { use: heart },
    glow: { variants: [{ use: 'glass', note: 'E6', decay: 1.2, gain: 0.5 }, { use: 'glass', note: 'C6', decay: 1.2, gain: 0.5 }, { use: 'glass', note: 'A5', decay: 1.2, gain: 0.5 }] },
    hit: { layers: [{ use: 'boom', freq: 36, gain: 0.8, noise: 0.25 }, { use: 'glass', note: 'A5', decay: 1.6, gain: 0.3 }] },
    whoosh: { use: 'swish', from: 200, to: 1800, color: 'air', shape: 'up', gain: 0.6 },
    click: { use: 'click', freq: 1600, gain: 0.6 },
    door: { layers: [{ use: 'thud', freq: 70, gain: 0.8 }, { use: 'knock', gain: 0.4 }] },
    rustle: { use: 'rustle', dur: 0.9, bright: 2200, crinkle: 0.3, gain: 0.6 },
    thud: { use: 'thud', freq: 62, gain: 0.8 },
  },
  hit: null,
  rise: null,
  logo: null,
};
