// Sound design (starting point for a riso promo): a print shop — ink drum, paper being pressed, stamps. Principles and how to write it: promo/references/sound.md; adapt to the product.
// Types the shared API emits: print (one block printed), stamp (halftone / stamp), roll (drum page turn), flood (ink-flood page turn), logo
export default {
  name: 'One line: what this product sounds like printed on paper (e.g. a small print shop, rollers, paper)',
  space: { size: 0.28, mix: 0.1 },
  vary: 0.07,
  sounds: {
    print: { variants: [{ layers: [{ use: 'thud', freq: 140, felt: 1600, decay: 22, body: 0.5 }, { use: 'paper', dur: 0.08, bright: 2800, gain: 0.6 }] }, { layers: [{ use: 'thud', freq: 120, felt: 1400, decay: 20, body: 0.55 }, { use: 'paper', dur: 0.1, bright: 2400, gain: 0.55 }] }] },
    stamp: { use: 'stamp' },
    roll: { use: 'whir', gain: 0.6 },
    flood: { use: 'swell', of: 'paper', dur: 0.8, gain: 0.6 },
    whoosh: { use: 'paper', bright: 2200, grain: 0.4 },
    impact: { layers: [{ use: 'thud', freq: 90, decay: 12 }, { use: 'knock', freq: 'F5', gain: 0.25 }] },
    pop: { use: 'knock', notes: ['F5', 'A5', 'C6'] },
    tick: { use: 'knock', notes: ['C6', 'D6', 'F6'] },
    click: { use: 'click', freq: 1500 },
    type: { use: 'key', bright: 2200 },
    riser: { use: 'swell', of: 'paper', dur: 1.0 },
    boom: { layers: [{ use: 'thud', freq: 60, decay: 7 }, { use: 'paper', dur: 0.25, gain: 0.4 }] },
  },
  hit: null,
  logo: [{ use: 'stamp', gain: 0.8 }, { use: 'knock', freq: 'F5', gain: 0.5, delay: 0.2 }, { use: 'knock', freq: 'C6', gain: 0.45, delay: 0.32 }],
};
