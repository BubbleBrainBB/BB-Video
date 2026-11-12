// Sound design (starting point for the cutaway tour): a model on a clean table, looked at closely. Almost silent — the voice carries the
// film — with a few soft, rounded sounds at the moments the picture changes: the shell opening is a slow breath, each flight a quieter one,
// a label lands with a small tick, a part that appears is a soft pop, a path being drawn is a light swish, and the closing fact rings one
// glass note. Under a voiceover the engine drops the light ones (gain < 0.45) by itself; only the opening, the flights and the end stay.
// Types the cutaway runtime emits: open (a cut opens or closes), fly (the camera travels to the next stop), pop (a part or an inset
// appears), tick (a label), card (a card row — light, dropped under the voice), draw (a tube drawn on), chime (the end plate).
export default {
  name: 'A model on a clean table: breaths of air, small ticks, one glass note',
  space: { size: 0.3, mix: 0.12 },
  ambience: null,
  vary: 0.1,
  sounds: {
    open: { layers: [{ use: 'swish', color: 'air', from: 300, to: 1500, q: 0.6, shape: 'arc', gain: 0.26 }, { use: 'glass', note: 'D5', decay: 2.4, gain: 0.12 }] },
    fly: { use: 'swish', color: 'air', from: 500, to: 1300, q: 0.6, shape: 'arc', gain: 0.12 },
    pop: { variants: [{ use: 'pop', freq: 480, rise: 520, gain: 0.45 }, { use: 'pop', freq: 540, rise: 600, gain: 0.4 }] },
    tick: { use: 'blip', notes: ['A6', 'D7', 'F#6'], dur: 0.05, wave: 'tri', gain: 0.4 },
    card: { use: 'click', freq: 1400 },
    draw: { use: 'swish', color: 'air', from: 1500, to: 3200, q: 0.7, shape: 'arc', gain: 0.12 },
    chime: { layers: [{ use: 'glass', note: 'D6', decay: 3.4, gain: 0.5 }, { use: 'glass', note: 'A6', decay: 3, gain: 0.3, delay: 0.08 }] },
    click: { use: 'click', freq: 1600 },
    whoosh: { use: 'swish', color: 'air', from: 400, to: 1400, gain: 0.3 },
    impact: { layers: [{ use: 'thud', freq: 80 }, { use: 'glass', note: 'D6', gain: 0.25 }] },
    riser: { use: 'swell', of: 'glass', note: 'A5' },
    boom: { layers: [{ use: 'thud', freq: 60 }, { use: 'glass', note: 'D5', gain: 0.3 }] },
    key: { use: 'click' },
    type: { use: 'key' },
  },
  hit: 'impact',
  rise: null,
  logo: [{ use: 'glass', note: 'D6', gain: 0.5 }, { use: 'glass', note: 'A6', gain: 0.3, delay: 0.07 }],
};
