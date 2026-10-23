// Sound design (starting point for the old-newsreel style): a projector in the room. Projector clatter + motor + hiss under the whole film (ambience),
// splice ticks on hard cuts, rubber stamps and calendar pages on the cards, an iris whirr. Add the sounds your story's actions need (an engine, a
// crowd, a gas hiss) with the same palette words: references/sound.md.
// Types the newsreel runtime emits: splice (every hard cut), iris, stamp (stamps, title cards), page (calendar pages), tick (stopwatch).
const SR = 44100;
// Projector: a 24 fps shutter clatter (two clicks per frame, slightly uneven), a motor tone with a slow wobble, tape hiss
function projector(p, r) {
  const n = Math.ceil((p.dur ?? 10) * SR), o = new Float32Array(n);
  let lp = 0, hp = 0, ph = 0, env = 0;
  const period = SR / 24;
  for (let i = 0; i < n; i++) {
    const t = i / SR, k = i % Math.round(period), k2 = (i + Math.round(period * 0.43)) % Math.round(period);
    if (k === 0) env = 1; else if (k2 === 0) env = Math.max(env, 0.55);
    env *= 0.9965;
    const w = r() * 2 - 1;
    lp += (w - lp) * 0.35; hp = w - lp;                 // a bright, clicky noise for the shutter
    ph += (48 + Math.sin(t * 0.7) * 0.8) / SR;          // motor
    const motor = Math.sin(2 * Math.PI * ph) * 0.05 + Math.sin(2 * Math.PI * ph * 3) * 0.03;
    o[i] = hp * env * 0.9 + motor + w * 0.025;
  }
  return o;
}
export default {
  name: 'One line: what this film sounds like (e.g. a projector in a small hall, splices, rubber stamps)',
  space: { size: 0.22, mix: 0.1 },
  ambience: { use: projector, gain: 1.6 },
  vary: 0.07,
  sounds: {
    splice: { variants: [{ use: 'click', freq: 2600, decay: 0.012, gain: 0.5 }, { use: 'tick', freq: 1900, gain: 0.45 }] },
    iris: { use: 'film', rate: 26, bright: 2400, gain: 0.55 },
    stamp: { variants: [{ layers: [{ use: 'stamp', freq: 110 }, { use: 'knock', freq: 'F4', gain: 0.3 }] }, { layers: [{ use: 'stamp', freq: 95 }, { use: 'knock', freq: 'D4', gain: 0.3 }] }] },
    page: { use: 'paper', flap: 18, grain: 0.7, bright: 3000 },
    tick: { use: 'tick', freq: 3200 },
    whoosh: { use: 'swish', color: 'cloth' },
    impact: { layers: [{ use: 'stamp', freq: 100 }, { use: 'thud', freq: 60, gain: 0.6 }] },
  },
  hit: 'impact',
  rise: null,
  logo: [{ use: 'stamp', freq: 90, gain: 0.8 }, { use: 'thud', freq: 55, gain: 0.7 }],
};
