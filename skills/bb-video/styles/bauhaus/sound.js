// Sound design (starting point for the constructivism / Bauhaus style): workshop and printing press — metal clanks, stamping, gear clicks, machine slides. Principles and how to write it: the skill's references/sound.md.
// Types the components emit: clank (a metal block locks in), thud (a big circle drops), stamp (slogan, big number stamped), tick (caption text printed), snap (an arrow locks), whoosh (the transition wedge sweeps by), logo.
// Pitched sounds are in C minor (C D Eb F G Ab Bb) — change to match the music, same key as score.js.
export default {
  name: 'One line: what this product / topic sounds like (e.g. a quiet print works, the press stamping letters one beat at a time)',
  space: { size: 0.3, mix: 0.12 },
  vary: 0.08,
  sounds: {
    clank: { variants: [{ layers: [{ use: 'glass', note: 'G5', dur: 0.35, decay: 10, partials: [[1, 1], [2.41, 0.7], [3.93, 0.45], [6.1, 0.25]], gain: 0.5 }, { use: 'thud', freq: 150, decay: 20, gain: 0.6 }] }, { layers: [{ use: 'glass', note: 'C6', dur: 0.3, decay: 11, partials: [[1, 1], [2.41, 0.7], [3.93, 0.45], [6.1, 0.25]], gain: 0.45 }, { use: 'thud', freq: 170, decay: 20, gain: 0.6 }] }, { layers: [{ use: 'glass', note: 'Eb5', dur: 0.4, decay: 9, partials: [[1, 1], [2.41, 0.7], [3.93, 0.45], [6.1, 0.25]], gain: 0.5 }, { use: 'thud', freq: 130, decay: 18, gain: 0.6 }] }] },
    thud: { layers: [{ use: 'thud', freq: 70, felt: 1400, decay: 9 }, { use: 'paper', dur: 0.08, bright: 1800, gain: 0.35 }] },
    stamp: { use: 'stamp' },
    tick: { use: 'key', bright: 2200 },
    snap: { use: 'click', freq: 1600, noise: 0.3 },
    whoosh: { variants: [{ use: 'swish', color: 'cloth', from: 400, to: 2400 }, { use: 'swish', color: 'cloth', from: 300, to: 1800 }, { use: 'swish', color: 'cloth', from: 500, to: 3000 }] },
    impact: { layers: [{ use: 'thud', freq: 60, decay: 8 }, { use: 'glass', note: 'C5', dur: 0.5, decay: 7, partials: [[1, 1], [2.41, 0.6], [3.93, 0.4]], gain: 0.35 }] },
    pop: { use: 'knock', notes: ['C6', 'Eb6', 'G6', 'Bb6'] },
    click: { use: 'click', freq: 1400, noise: 0.4 },
    type: { use: 'key', bright: 1800 },
    riser: { use: 'swell', of: 'paper', dur: 1.0 },
    boom: { layers: [{ use: 'thud', freq: 50, decay: 6 }, { use: 'glass', note: 'C4', dur: 1.4, decay: 3, gain: 0.3 }] },
  },
  hit: 'impact',
  rise: null,
  logo: [{ use: 'stamp', gain: 0.8 }, { use: 'stamp', gain: 0.7, delay: 0.18 }, { use: 'glass', note: 'C6', dur: 1.6, decay: 2.5, gain: 0.4, delay: 0.36 }],
};
