// Sound design (starting point for the pop-art style): comic sound effects. Principles and usage in the skill's references/sound.md; style notes in styles/pop/STYLE.md.
// The types the pop components emit are already written here (pow / pop / whoosh) — then adapt to the product: pitched accents in the score's key (C major below).
export default {
  name: 'One line: what this product sounds like as a comic (e.g. bright, playful, a bit over the top)',
  space: { size: 0.3, mix: 0.1 },
  vary: 0.08,
  sounds: {
    pow: { variants: [                                                    // big words, burst boxes slamming down: thud + crack + a little shine
      { layers: [{ use: 'impact', freq: 48, crack: 1.1, body: 0.9 }, { use: 'blip', freq: 'C6', to: 'G5', dur: 0.06, gain: 0.25 }] },
      { layers: [{ use: 'impact', freq: 56, crack: 0.9, body: 1.0 }, { use: 'blip', freq: 'E6', to: 'C6', dur: 0.06, gain: 0.25 }] },
      { layers: [{ use: 'impact', freq: 44, crack: 1.2, body: 0.8 }, { use: 'blip', freq: 'G6', to: 'D6', dur: 0.06, gain: 0.25 }] },
    ] },
    pop: { use: 'pop', notes: ['C6', 'E6', 'G6', 'A6'] },             // bubbles, cells popping out
    whoosh: { variants: [{ use: 'swish', color: 'air', from: 500, to: 3500 }, { use: 'swish', color: 'cloth', from: 300, to: 2400 }] },
    zap: { use: 'zap' },                                                // a move you write yourself: F.sfx(t, 'zap', 0.7)
    boing: { use: 'boing', freq: 'C4' },
    impact: { use: 'impact', freq: 50 },
    boom: { layers: [{ use: 'boom', freq: 36 }, { use: 'impact', freq: 60, gain: 0.5 }] },
    click: { use: 'click', freq: 1600 },
    type: { use: 'key', bright: 2400 },
    tick: { use: 'blip', notes: ['C6', 'D6', 'E6', 'G6'], wave: 'square', dur: 0.04 },
    riser: { use: 'riser', from: 300, to: 6000 },
  },
  hit: null,
  rise: null,
  logo: [{ use: 'impact', freq: 46, crack: 1.0 }, { use: 'blip', freq: 'C6', dur: 0.08, gain: 0.4, delay: 0.05 }, { use: 'blip', freq: 'G6', dur: 0.12, gain: 0.35, delay: 0.14 }],
};
