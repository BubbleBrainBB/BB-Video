// Sound design (starting point for the shadow puppetry style): wood, oxhide, gongs and drums on a stage. Principles and how to write it: the skill's references/sound.md; style notes: styles/shadow/STYLE.md.
// Types the puppet components emit: wood (clapper: a placard drops, a prop comes on stage), gong (big words appear), drum (marching drums), step (a puppet's soft footfall), thud (falling down), stamp (seal), whoosh (the lamp dims at a scene change).
// Pitched sounds (clapper, gong) are in D minor pentatonic (D F G A C) — change them to match the music, same key as score.js.
export default {
  name: 'One line: what this play sounds like (e.g. an old stage, oil lamps, wood and oxhide)',
  space: { size: 0.4, mix: 0.16 },
  ambience: { use: 'roomtone', bright: 380, gain: 0.06 },
  vary: 0.08,
  sounds: {
    wood: { variants: [{ use: 'knock', freq: 'A5' }, { use: 'knock', freq: 'C6' }, { use: 'knock', freq: 'D6' }] },
    gong: { layers: [{ use: 'boom', gain: 0.5 }, { use: 'glint', note: 'D5', dur: 1.8, count: 4, gain: 0.5 }] },
    drum: { layers: [{ use: 'thud', freq: 90, felt: 900, decay: 10 }, { use: 'thud', freq: 82, felt: 900, decay: 10, delay: 0.18, gain: 0.8 }, { use: 'thud', freq: 96, felt: 900, decay: 10, delay: 0.36, gain: 0.9 }] },
    step: { use: 'paper', dur: 0.06, bright: 1800, grain: 0.4, shape: 'down', gain: 0.5 },
    thud: { layers: [{ use: 'thud', freq: 110, felt: 1200, decay: 16 }, { use: 'paper', dur: 0.12, bright: 1500, gain: 0.5 }] },
    stamp: { use: 'stamp' },
    whoosh: { use: 'swish', color: 'cloth', from: 300, to: 1800 },
    impact: { layers: [{ use: 'thud', freq: 70, felt: 900, decay: 9 }, { use: 'knock', freq: 'D5', gain: 0.4 }] },
    pop: { use: 'knock', notes: ['D6', 'F6', 'G6', 'A6', 'C7'] },
    tick: { use: 'knock', notes: ['A6', 'C7', 'D7'] },
    click: { use: 'click', freq: 1400, noise: 0.4 },
    type: { use: 'key', bright: 1800 },
    riser: { use: 'swell', of: 'paper', dur: 1.0 },
    boom: { layers: [{ use: 'thud', freq: 55, decay: 7 }, { use: 'glint', note: 'D4', dur: 1.6, count: 3, gain: 0.4 }] },
  },
  hit: 'impact',
  rise: null,
  logo: [{ use: 'knock', freq: 'D6', gain: 0.7 }, { use: 'knock', freq: 'A5', gain: 0.6, delay: 0.16 }, { use: 'boom', gain: 0.6, delay: 0.32 }, { use: 'glint', note: 'D5', dur: 2, count: 4, gain: 0.5, delay: 0.34 }],
};
