// Sound design (starting point for the watercolour style): a quiet room, wet paper, a brush. A bloom is a small drop of water with a breath of air
// after it; a stroke is a soft bristle sweep; lifting is the same sweep backwards (colour being drawn off); a fresh sheet is paper sliding; pencil is
// a dry scratch; dabs are tiny drops. Everything is soft and stays out from under the voice. Add the sounds your film needs with the same palette
// words: references/sound.md. Types the watercolour runtime emits: bloom, brush, lift, page, pencil, dab, tick.
export default {
  name: 'One line: what this film sounds like (e.g. water and a brush on paper in a quiet room)',
  space: { size: 0.35, mix: 0.14 },
  ambience: { use: 'roomtone', bright: 380, gain: 0.1 },
  vary: 0.2,
  sounds: {
    bloom: { layers: [{ use: 'drop', freq: 520, to: 980, dur: 0.16, gain: 0.3 }, { use: 'swish', from: 300, to: 1500, color: 'air', shape: 'arc', gain: 0.16, delay: 0.05 }] },
    brush: { variants: [{ use: 'swish', from: 500, to: 2600, color: 'cloth', shape: 'arc', gain: 0.3 }, { use: 'swish', from: 420, to: 2000, color: 'cloth', shape: 'arc', gain: 0.28 }, { use: 'paper', dur: 0.4, bright: 2600, grain: 0.25, shape: 'arc', gain: 0.2 }] },
    lift: { layers: [{ use: 'swell', of: 'swish', from: 260, to: 1800, color: 'air', gain: 0.24 }, { use: 'bubble', freq: 420, count: 3, gain: 0.12, delay: 0.1 }] },
    page: { layers: [{ use: 'paper', dur: 0.8, bright: 3000, grain: 0.5, shape: 'arc', gain: 0.3 }, { use: 'swish', from: 200, to: 1200, color: 'air', shape: 'arc', gain: 0.2 }] },
    pencil: { variants: [{ use: 'rustle', crinkle: 0.06, bright: 5200, gain: 0.18 }, { use: 'paper', dur: 0.3, bright: 5400, grain: 0.35, shape: 'arc', gain: 0.16 }] },
    dab: { variants: [{ use: 'drop', freq: 760, to: 1300, dur: 0.09, gain: 0.2 }, { use: 'bubble', freq: 700, count: 4, gain: 0.16 }] },
    tick: { use: 'drop', freq: 1100, to: 1500, dur: 0.06, gain: 0.14 },
  },
  hit: 'bloom',
  rise: null,
  logo: [{ use: 'glass', note: 'E6', dur: 1.8, gain: 0.35 }],
};
