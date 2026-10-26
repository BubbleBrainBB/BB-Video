// Sound design (starting point for the map style): a pen on an old map, heard close. Routes are a nib scratching across paper, pins and stations
// a soft wooden tap, labels and callouts a light tick, camera flights a breath of air over the table, the year counter a small ratchet, ink
// spreading a soft swell, the focus a glass note, a marker travelling a low hum. Everything in one key (D major) with the score.
// Types the map runtime emits: draw (a line drawn on, with dur), pop (pins / stations), tick (labels, callouts, insets), whoosh (camera flights),
// roll (year counter), bleed (G.spread / G.reach), glow (G.focus / G.area), travel (G.travel, with dur), stamp (G.title).
export default {
  name: 'A pen on an old map: nib scratches, wooden taps, a breath of air',
  space: { size: 0.3, mix: 0.12 },
  ambience: null,
  vary: 0.1,
  sounds: {
    draw: { use: 'paper', grain: 0.25, bright: 5200, gain: 0.5 },
    pop: { variants: [{ use: 'knock', freq: 'A5', gain: 0.5 }, { use: 'knock', freq: 'D6', gain: 0.45 }, { use: 'knock', freq: 'F#5', gain: 0.5 }] },
    tick: { use: 'tick', freq: 2900, gain: 0.6 },
    whoosh: { use: 'swish', color: 'air', from: 300, to: 1800, gain: 0.4 },
    roll: { use: 'film', rate: 22, bright: 3000, gain: 0.45 },
    bleed: { layers: [{ use: 'swell', of: 'glass', note: 'D5', gain: 0.35 }, { use: 'paper', grain: 0.8, bright: 1600, gain: 0.25 }] },
    glow: { use: 'glass', notes: ['A6', 'D7', 'F#6'], decay: 3, gain: 0.32 },
    travel: { use: 'whir', freq: 70, to: 95, gain: 0.25 },
    stamp: { layers: [{ use: 'stamp', freq: 120 }, { use: 'paper', grain: 0.5, gain: 0.3 }] },
    click: { use: 'click' },
    key: { use: 'click' },
    type: { use: 'key' },
    impact: { layers: [{ use: 'thud', freq: 70 }, { use: 'glass', note: 'D6', gain: 0.3 }] },
    riser: { use: 'swell', of: 'glass', note: 'A5' },
    boom: { layers: [{ use: 'thud', freq: 55 }, { use: 'glass', note: 'D5', gain: 0.3 }] },
  },
  hit: 'impact',
  rise: null,
  logo: [{ use: 'glass', note: 'D7', gain: 0.5 }, { use: 'glass', note: 'A6', gain: 0.35, delay: 0.06 }, { use: 'knock', freq: 'D5', gain: 0.45 }],
};
