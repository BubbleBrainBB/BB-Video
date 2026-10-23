// Sound: soft vinyl toys landing on a hard plastic platform (a muffled "pff", three in rotation), heavy landings, a rolling rustle, the plastic "tick" of keys, a light glockenspiel for lighting up, a "pop" for growing. Same key as the score (D minor)
export default {
  name: 'Soft rubber toys and plastic keys on a desk',
  space: { size: 0.3, mix: 0.12 },
  ambience: null,
  sounds: {
    whoosh: { variants: [{ use: 'swish', color: 'air', from: 700, to: 2800, gain: 0.7 }, { use: 'swish', color: 'cloth', from: 400, to: 2200, gain: 0.6 }] },
    land: { variants: [{ layers: [{ use: 'thud', freq: 110, gain: 0.9 }, { use: 'click', gain: 0.25 }] }, { layers: [{ use: 'thud', freq: 130, gain: 0.8 }, { use: 'blip', notes: ['D6'], gain: 0.15 }] }, { layers: [{ use: 'thud', freq: 95, gain: 0.9 }, { use: 'click', gain: 0.2 }] }] },
    stamp: { variants: [{ layers: [{ use: 'thud', freq: 80, gain: 1 }, { use: 'glass', note: 'D6', gain: 0.25 }] }, { layers: [{ use: 'thud', freq: 72, gain: 1 }, { use: 'glass', note: 'F6', gain: 0.22 }] }, { layers: [{ use: 'thud', freq: 88, gain: 1 }, { use: 'glass', note: 'A5', gain: 0.25 }] }] },
    roll: { use: 'swish', color: 'cloth', from: 300, to: 900, gain: 0.5 },
    key: { use: 'click' },
    type: { use: 'key' },
    glow: { use: 'blip', notes: ['A5', 'D6', 'F6', 'A6'] },
    pop: { use: 'drop' },
    impact: { layers: [{ use: 'thud', freq: 70 }, { use: 'glass', note: 'D6', gain: 0.3 }] },
    click: { use: 'click' },
    tick: { use: 'blip', notes: ['D6', 'F6', 'A6'] },
    riser: { use: 'swell', of: 'glass', note: 'A5' },
    boom: { layers: [{ use: 'thud', freq: 55 }, { use: 'glass', note: 'D5', gain: 0.35 }] },
  },
  hit: 'impact',
  rise: null,
  logo: [{ use: 'glass', note: 'D6', gain: 0.5 }, { use: 'glass', note: 'A6', gain: 0.35, delay: 0.06 }, { use: 'thud', freq: 65, gain: 0.55 }],
};
