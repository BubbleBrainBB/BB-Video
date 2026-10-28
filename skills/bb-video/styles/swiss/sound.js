// Sound design (starting point for the Swiss kinetic-typography style): type being set — dry clicks and key strikes, a soft air sweep as a line rises,
// a firm stamp when a numeral lands, a felt tap per chip card, a pen-like tick when an accent mark draws. Principles: the skill's references/sound.md.
// Types the runtime emits: rise (a line of type rising, follows its length), snap (the line locks), tick (a sentence / label), chip (a chip card lands), roll (digits rolling),
// stamp (a numeral lands), bar (a bar grows), slide (a screenshot / card is revealed), mark (an accent outline draws), pull (the wall pulls out, frames push in), whoosh (transitions), impact, logo.
// Pitched sounds are in A minor (A B C D E F G) — change with the music, same key as score.js.
export default {
  name: 'One line: what this product / topic sounds like (e.g. metal type locking into a forme, clean and exact)',
  space: { size: 0.2, mix: 0.08 },
  vary: 0.06,
  sounds: {
    rise: { variants: [{ use: 'swish', color: 'air', from: 300, to: 2600, shape: 'up', gain: 0.6 }, { use: 'swish', color: 'air', from: 400, to: 3200, shape: 'up', gain: 0.55 }, { use: 'swish', color: 'cloth', from: 250, to: 2000, shape: 'up', gain: 0.55 }] },
    snap: { variants: [{ layers: [{ use: 'click', freq: 2200, noise: 0.25, decay: 60 }, { use: 'thud', freq: 120, decay: 24, gain: 0.45 }] }, { layers: [{ use: 'click', freq: 1900, noise: 0.3, decay: 60 }, { use: 'thud', freq: 110, decay: 24, gain: 0.45 }] }] },
    tick: { use: 'key', bright: 2400 },
    chip: { variants: [{ layers: [{ use: 'knock', notes: ['A5', 'C6', 'E6', 'G6'], decay: 28, gain: 0.45 }, { use: 'thud', freq: 160, felt: 1800, decay: 30, gain: 0.4 }] }, { layers: [{ use: 'knock', notes: ['E5', 'G5', 'A5', 'C6'], decay: 26, gain: 0.45 }, { use: 'thud', freq: 140, felt: 1600, decay: 30, gain: 0.4 }] }, { layers: [{ use: 'click', freq: 1800, noise: 0.2, decay: 50, gain: 0.5 }, { use: 'thud', freq: 180, felt: 2000, decay: 32, gain: 0.35 }] }] },
    roll: { variants: [{ use: 'film', rate: 34, bright: 0.6, gain: 0.4 }, { use: 'film', rate: 28, bright: 0.5, gain: 0.4 }, { use: 'film', rate: 40, bright: 0.7, gain: 0.35 }] },
    stamp: { variants: [{ layers: [{ use: 'stamp', freq: 90 }, { use: 'glass', note: 'A5', dur: 0.4, decay: 9, gain: 0.25 }] }, { layers: [{ use: 'stamp', freq: 80 }, { use: 'glass', note: 'E5', dur: 0.4, decay: 9, gain: 0.25 }] }, { layers: [{ use: 'stamp', freq: 100 }, { use: 'glass', note: 'C6', dur: 0.4, decay: 9, gain: 0.22 }] }] },
    bar: { use: 'swish', color: 'digital', from: 500, to: 1800, shape: 'up', gain: 0.35 },
    slide: { use: 'paper', bright: 0.6, grain: 0.3, gain: 0.5 },
    mark: { use: 'crease', from: 1800, to: 3200, gain: 0.5 },
    pull: { use: 'swish', color: 'air', from: 2200, to: 300, shape: 'down', gain: 0.6 },
    whoosh: { variants: [{ use: 'swish', color: 'air', from: 400, to: 3000 }, { use: 'swish', color: 'cloth', from: 300, to: 2200 }] },
    impact: { layers: [{ use: 'thud', freq: 58, decay: 7 }, { use: 'glass', note: 'E6', dur: 0.6, decay: 6, gain: 0.3 }] },
    click: { use: 'click', freq: 1600, noise: 0.35 },
    type: { use: 'key', bright: 2000 },
    pop: { use: 'blip', freq: 'A5', to: 'E6', wave: 'sine', dur: 0.08 },
    riser: { use: 'swell', of: 'glass', note: 'E5', dur: 1.0 },
    boom: { layers: [{ use: 'thud', freq: 48, decay: 6 }, { use: 'glass', note: 'A4', dur: 1.4, decay: 3, gain: 0.3 }] },
  },
  hit: 'impact',
  rise: null,
  logo: [{ use: 'click', freq: 2200, noise: 0.2, gain: 0.8 }, { use: 'stamp', freq: 90, gain: 0.7, delay: 0.12 }, { use: 'glass', note: 'A5', dur: 1.6, decay: 2.5, gain: 0.45, delay: 0.2 }, { use: 'glass', note: 'E6', dur: 1.4, decay: 3, gain: 0.3, delay: 0.32 }],
};
