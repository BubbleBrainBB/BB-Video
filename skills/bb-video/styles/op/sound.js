// Sound design (starting point for the op-art style): minimal electronic sounds, like a precision instrument. Principles and how to write it: the skill's references/sound.md; style notes: styles/op/STYLE.md.
// Types the op-art components emit: pulse (striped text), sweep (cards, transitions). Pitched sounds are all in the A minor pentatonic (A C D E G) — change to suit the product.
export default {
  name: 'One line: what this product sounds like as an instrument (e.g. clean, precise, a little hypnotic)',
  space: { size: 0.4, mix: 0.14 },
  vary: 0.05,
  sounds: {
    pulse: { variants: [{ layers: [{ use: 'blip', freq: 'A5', dur: 0.12, wave: 'sine' }, { use: 'thud', freq: 70, felt: 400, decay: 14, gain: 0.6 }] }, { layers: [{ use: 'blip', freq: 'E6', dur: 0.12, wave: 'sine' }, { use: 'thud', freq: 70, felt: 400, decay: 14, gain: 0.6 }] }] },
    sweep: { variants: [{ use: 'swish', color: 'digital', from: 300, to: 4200, crush: 9000 }, { use: 'swish', color: 'digital', from: 4200, to: 500, crush: 9000 }, { use: 'swish', color: 'digital', from: 600, to: 2600, crush: 6000 }] },
    whoosh: { use: 'swish', color: 'digital', from: 400, to: 3000 },
    impact: { layers: [{ use: 'thud', freq: 55, decay: 9 }, { use: 'blip', freq: 'A6', to: 'A5', dur: 0.08, gain: 0.3 }] },
    boom: { layers: [{ use: 'boom', freq: 34 }, { use: 'blip', freq: 'A4', dur: 0.3, gain: 0.3 }] },
    pop: { use: 'blip', notes: ['A5', 'C6', 'D6', 'E6', 'G6'], dur: 0.06 },
    tick: { use: 'tick', notes: ['A6', 'C7', 'D7', 'E7'] },
    click: { use: 'click', freq: 2200, noise: 0.3 },
    type: { use: 'key', bright: 2600 },
    zap: { use: 'zap', from: 'A6', to: 'A3' },
    riser: { use: 'riser', from: 300, to: 7000 },
  },
  hit: null,
  rise: null,
  logo: [{ use: 'thud', freq: 50, decay: 6 }, { use: 'blip', freq: 'A5', dur: 0.5, gain: 0.5 }, { use: 'blip', freq: 'E6', dur: 0.5, gain: 0.35, delay: 0.12 }, { use: 'blip', freq: 'A6', dur: 0.6, gain: 0.25, delay: 0.24 }],
};
