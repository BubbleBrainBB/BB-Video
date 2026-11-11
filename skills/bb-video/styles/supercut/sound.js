// Sound design (starting point for the supercut style). Ordinary cuts make NO sound — the drums carry them. Effects belong to the text and the
// graphics only: a soft in-key key tap per typed character, a short digital flutter for a scrambled word, a click when the colour bar lifts, an
// impact and a sub drop on the punch word, rising ticks as grid cells fill, a split when the frame multiplies, two message pops for bubbles,
// a low swell for the globe, one dry hit per end card. Pitched sounds are in F minor (F G Ab Bb C Db Eb), the score's key. Dry and close:
// this is a cutting room, not a hall. Principles: the skill's promo/references/sound.md.
const SR = 44100;
// sub drop: a sine falling from ~110 Hz to ~32 Hz under the punch word (its harmonics keep it alive on a phone)
function subdrop(p) { const d = p.dur ?? 0.9, n = Math.ceil(d * SR), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR, q = t / d; ph += (32 + 78 * Math.pow(1 - q, 2.5)) / SR; o[i] = Math.tanh(Math.sin(2 * Math.PI * ph) * 2.2) * 0.8 * Math.min(1, t / 0.008) * Math.pow(1 - q, 1.4); } return o; }
// scramble: a flutter of very short square blips at seeded pitches, as long as the word takes to resolve
function flutter(p, r) { const d = p.dur ?? 0.3, n = Math.ceil(d * SR), o = new Float32Array(n), step = Math.floor(SR / 30); let f = 900; for (let i = 0; i < n; i++) { if (i % step === 0) f = 700 + r() * 2200; const t = i / SR, k = (i % step) / step; o[i] = (Math.sin(2 * Math.PI * f * t) > 0 ? 1 : -1) * Math.exp(-k * 9) * 0.22 * Math.min(1, (d - t) * 20); } return o; }
export default {
  name: 'One line: what this film sounds like (e.g. a cutting room: keys, clicks and one heavy thud when the word lands)',
  space: { size: 0.12, mix: 0.05 },
  vary: 0.05,
  sounds: {
    type: { use: 'knock', notes: ['C6', 'Eb6', 'F6', 'Ab6', 'F6', 'Eb6'], decay: 60, gain: 0.2 },           // one per typed character, in key
    scramble: { use: flutter },
    bar: { layers: [{ use: 'click', freq: 2400, noise: 0.3, decay: 70 }, { use: 'thud', freq: 180, decay: 30, gain: 0.3 }] },
    punch: { layers: [{ use: 'impact', freq: 44, body: 1, crack: 0.9, gain: 0.7 }, { use: 'click', freq: 1800, noise: 0.5, gain: 0.3 }, { use: subdrop, gain: 0.55 }] },
    cell: { use: 'knock', notes: ['F5', 'Ab5', 'C6', 'Eb6', 'F6', 'Ab6', 'C7'], decay: 40, gain: 0.5 },      // rising as the cells fill
    split: { layers: [{ use: 'click', freq: 1500, noise: 0.4, decay: 50 }, { use: 'thud', freq: 110, decay: 16, gain: 0.5 }] },
    pop: { variants: [{ use: 'blip', freq: 'C6', to: 'F6', wave: 'sine', dur: 0.09 }, { use: 'blip', freq: 'Eb6', to: 'Ab6', wave: 'sine', dur: 0.09 }] },
    globe: { use: 'swell', of: 'glass', note: 'F4', dur: 1.6, gain: 0.7 },
    card: { variants: [{ layers: [{ use: 'thud', freq: 70, decay: 12 }, { use: 'click', freq: 1300, noise: 0.35, gain: 0.5 }] }, { layers: [{ use: 'thud', freq: 62, decay: 12 }, { use: 'click', freq: 1100, noise: 0.35, gain: 0.5 }] }] },
    logo: { layers: [{ use: 'thud', freq: 52, decay: 7 }, { use: 'glass', note: 'F5', dur: 1.4, decay: 3, gain: 0.3 }, { use: 'glass', note: 'C6', dur: 1.2, decay: 3.5, gain: 0.18, delay: 0.08 }] },
    // generic types other components may emit
    impact: { use: 'impact', freq: 46, body: 0.9, crack: 0.8 },
    boom: { use: 'boom', freq: 36, noise: 0.3 },
    click: { use: 'click', freq: 1800, noise: 0.3 },
    whoosh: { mute: true },          // nothing whooshes here: a cut is a cut
  },
  hit: null,      // the punch word and the cards place their own hits
  rise: null,
  logo: null,     // the logo card's own hit (sounds.logo) is the sound logo
};
