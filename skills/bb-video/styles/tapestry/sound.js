// Sound design (starting point for the Bayeux-Tapestry style): close, soft and woollen — a needle and thread in a quiet hall. A thread is drawn
// through linen with a soft breathy pull, the needle pricks the cloth with a tiny tick, a laid fill is a run of short pulls, a leaf or a knot is a
// small tug, a tree grows with a longer pull and a creak of wood, letters are stitched with quick little pulls, unpicking is a scratchier pull
// backwards; a push-in is a slow breath of air, an act opens with a bell in the hall and the cloth shifting. Keep it under the voice.
// Add the sounds your story needs with the same palette words: references/sound.md.
// Types the tapestry runtime emits: stitch, needle, lay, knot, grow, letter, unpick, push, act.
export default {
  name: 'One line: what this film sounds like (e.g. a needle drawing wool through linen in a quiet stone hall, a bell for each act)',
  space: { size: 0.5, mix: 0.12 },
  ambience: { use: 'roomtone', bright: 300, gain: 0.16 },
  vary: 0.16,
  sounds: {
    stitch: { variants: [{ use: 'rustle', crinkle: 0.06, bright: 2600, gain: 0.24 }, { use: 'swish', from: 900, to: 2200, color: 'cloth', shape: 'arc', gain: 0.22 }, { use: 'rustle', crinkle: 0.04, bright: 3000, gain: 0.22 }] },
    needle: { variants: [{ use: 'click', freq: 3200, decay: 220, gain: 0.12 }, { use: 'click', freq: 3600, decay: 240, gain: 0.1 }] },
    lay: { variants: [{ use: 'rustle', crinkle: 0.1, bright: 2200, gain: 0.24 }, { use: 'paper', dur: 0.4, bright: 2600, grain: 0.06, shape: 'arc', gain: 0.18 }] },
    knot: { variants: [{ use: 'thud', freq: 220, decay: 30, felt: 1600, body: 0.4, dur: 0.1, gain: 0.2 }, { use: 'click', freq: 1400, decay: 120, gain: 0.14 }] },
    grow: { layers: [{ use: 'swish', from: 300, to: 1200, color: 'cloth', shape: 'up', gain: 0.24 }, { use: 'knock', freq: 180, gain: 0.12, delay: 0.1 }] },
    letter: { variants: [{ use: 'rustle', crinkle: 0.18, bright: 3400, gain: 0.18 }, { use: 'rustle', crinkle: 0.22, bright: 3800, gain: 0.16 }] },
    unpick: { use: 'rustle', crinkle: 0.35, bright: 4200, gain: 0.22 },
    push: { use: 'swish', from: 200, to: 700, color: 'air', shape: 'arc', gain: 0.16 },
    act: { layers: [{ use: 'glass', note: 'D5', dur: 2.2, decay: 1.6, partials: [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.9, 0.1]], gain: 0.3 }, { use: 'swish', from: 200, to: 600, color: 'cloth', shape: 'arc', gain: 0.18 }] },
  },
  hit: 'act',
  rise: null,
  logo: [{ use: 'glass', note: 'D5', dur: 2.4, decay: 1.4, partials: [[1, 1], [2.76, 0.5], [5.4, 0.25]], gain: 0.4 }],
};
