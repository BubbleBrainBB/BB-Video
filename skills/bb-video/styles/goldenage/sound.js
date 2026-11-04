// Sound design (starting point for the golden-age cartoon style): a trap drummer and a slide whistle in a small studio. Every action gets its own funny noise, timed to the frame;
// boing and slide are synthesised right here (a pitch-bent spring, a whistle). The film's biggest laugh comes from silence, so leave the room empty before a hit.
// Types the goldenage runtime and starter emit: boing, whack, slide, zip, squeak, tink, pop, swish, crash, ratchet, tick, gulp. Add the ones your film needs: references/sound.md.
const SR = 44100, TAU = Math.PI * 2;
const boing = (p) => { const dur = p.dur ?? 0.62, n = Math.floor(dur * SR), o = new Float32Array(n), f0 = p.freq ?? 150; let ph = 0, ph2 = 0; for (let i = 0; i < n; i++) { const t = i / SR, f = f0 * Math.pow(2, (8 * Math.min(1, t / (dur * 0.75))) / 12) * (1 + 0.13 * Math.sin(TAU * 15 * t)); ph += f / SR; ph2 += (f * 2) / SR; o[i] = (Math.sin(TAU * ph) + 0.35 * (1 - 4 * Math.abs((ph2 % 1) - 0.5))) * Math.exp(-4.2 * t) * Math.min(1, t / 0.004) * 0.7; } return o; };
const whistle = (p, r, ev = {}) => { const dur = p.dur ?? ev.dur ?? 0.6, n = Math.floor(dur * SR), o = new Float32Array(n), up = (ev.dir ?? p.dir ?? 1) >= 0, a = p.from ?? (up ? 380 : 1500), b = p.to ?? (up ? 1500 : 320); let ph = 0; for (let i = 0; i < n; i++) { const q = i / n, f = a * Math.pow(b / a, q) * (1 + 0.012 * Math.sin(TAU * 8 * (i / SR))); ph += f / SR; o[i] = Math.sin(TAU * ph) * Math.sin(Math.PI * Math.min(1, q * 1.02)) ** 0.4 * 0.6; } return o; };
const squeak = (p) => { const dur = p.dur ?? 0.11, n = Math.floor(dur * SR), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const q = i / n; ph += ((p.freq ?? 2100) * (1 + 0.3 * q) * (1 + 0.03 * Math.sin(TAU * 40 * (i / SR)))) / SR; o[i] = Math.sin(TAU * ph) * Math.sin(Math.PI * q) * 0.5; } return o; };
export default {
  name: 'One line: what this film sounds like (e.g. a trap drummer and a slide whistle chasing a runaway moon)',
  space: { size: 0.3, mix: 0.1 },
  vary: 0.12,
  sounds: {
    boing: { variants: [{ use: boing, freq: 150 }, { use: boing, freq: 118 }, { use: boing, freq: 188 }] },
    whack: { layers: [{ use: 'impact', freq: 92, crack: 0.5 }, { use: 'knock', freq: 980, gain: 0.5 }] },
    slide: { use: whistle },
    zip: { layers: [{ use: whistle, from: 500, to: 2200, dur: 0.22 }, { use: 'swish', from: 400, to: 3000, color: 'air', shape: 'up', gain: 0.5 }] },
    squeak: { variants: [{ use: squeak }, { use: squeak, freq: 2500 }] },
    tink: { use: 'glass', note: 'E7', decay: 0.3, gain: 0.5 },
    pop: { use: 'drop', notes: ['G5', 'C6'] },
    swish: { use: 'swish', from: 300, to: 2200, color: 'air', shape: 'arc' },
    crash: { layers: [{ use: 'boom', freq: 62, gain: 0.8 }, { use: 'knock', freq: 700, gain: 0.5 }, { use: 'knock', freq: 1100, gain: 0.4, delay: 0.05 }] },
    ratchet: { use: 'film', rate: 26, whir: 0, gain: 0.5 },
    tick: { use: 'knock', freq: 1080, decay: 70, gain: 0.5 },
    gulp: { layers: [{ use: 'drop', notes: ['G3'], gain: 0.6 }, { use: 'drop', notes: ['C4'], gain: 0.5, delay: 0.12 }] },
    thud: { use: 'thud', freq: 70 },
  },
  hit: 'whack',
  rise: null,   // no automatic riser: the silence before the hit is the joke
  logo: [{ use: boing, freq: 130, gain: 0.8 }, { use: 'glass', note: 'C7', gain: 0.3, delay: 0.1 }],
};
