// Sound design (starting point for ink used in a promo): brush, xuan paper, a scroll unrolling, a seal stamp. Principles and how-to in promo/references/sound.md; adapt to the product.
// Types the generic APIs emit: brush (writing), scroll (the scroll moving past), wash (ink wash), splash (ink splash), stamp (seal stamp), logo
export default {
  name: 'One line: what this product sounds like written on rice paper (e.g. a study, a brush, quiet)',
  space: { size: 0.45, mix: 0.16 },
  vary: 0.08,
  sounds: {
    brush: { variants: [{ use: 'paper', bright: 1800, grain: 0.25, gain: 0.55 }, { use: 'paper', bright: 1500, grain: 0.3, gain: 0.5 }] },
    scroll: { use: 'paper', bright: 1400, grain: 0.35, flap: 3, gain: 0.55 },
    wash: { use: 'swell', of: 'paper', dur: 1.0, gain: 0.5 },
    splash: { use: 'drop', gain: 0.5 },
    stamp: { use: 'stamp' },
    whoosh: { use: 'paper', bright: 1600, grain: 0.3 },
    impact: { layers: [{ use: 'thud', freq: 80, decay: 9 }, { use: 'knock', freq: 'D5', gain: 0.25 }] },
    pop: { use: 'knock', notes: ['D5', 'E5', 'A5', 'C6'] },
    tick: { use: 'knock', notes: ['A5', 'C6', 'D6'] },
    click: { use: 'click', freq: 1200 },
    type: { use: 'key', bright: 1800 },
    riser: { use: 'swell', of: 'paper', dur: 1.2 },
    boom: { layers: [{ use: 'thud', freq: 55, decay: 6 }, { use: 'knock', freq: 'D4', gain: 0.4 }] },
  },
  hit: null,
  logo: [{ use: 'stamp', gain: 0.8 }, { use: 'knock', freq: 'D5', gain: 0.45, delay: 0.25 }, { use: 'knock', freq: 'A5', gain: 0.4, delay: 0.4 }],
};
