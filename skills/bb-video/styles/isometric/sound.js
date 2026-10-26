// Sound design (starting point for the isometric style): a little world on a table, heard from just above it. Tiles land with a soft wooden
// "tok", parts pop up out of the ground, a route is drawn with a light pencil swish, scanners beep, parcels drop onto belts and into cages,
// labels tick up, the focus rings a small bell; camera glides are a breath of air. Everything in one key (F major) with the score.
// Types the isometric runtime emits: land (a tile drops in), pop (a part grows), draw (a route), beep (a scanner), drop (a parcel lands),
// tick (a label / counter), glow (W.focus), click (lights, locker doors), whoosh (camera glides), motor (pass to A.move({ sfx: 'motor' })).
export default {
  name: 'A little world on a table: wooden tiles, plastic machines, soft bells',
  space: { size: 0.3, mix: 0.12 },
  ambience: null,
  vary: 0.1,
  sounds: {
    land: { variants: [{ layers: [{ use: 'knock', freq: 210, gain: 0.8 }, { use: 'thud', freq: 120, gain: 0.5 }] }, { layers: [{ use: 'knock', freq: 240, gain: 0.8 }, { use: 'thud', freq: 105, gain: 0.5 }] }] },
    pop: { variants: [{ use: 'pop', freq: 520, rise: 600, gain: 0.5 }, { use: 'pop', freq: 600, rise: 700, gain: 0.45 }, { use: 'pop', freq: 460, rise: 520, gain: 0.5 }] },
    draw: { use: 'swish', color: 'air', from: 1600, to: 3600, q: 0.7, shape: 'arc', gain: 0.35 },
    beep: { use: 'blip', notes: ['C7', 'A6'], dur: 0.08, wave: 'tri', gain: 0.4 },
    drop: { variants: [{ use: 'knock', freq: 320, gain: 0.55 }, { use: 'knock', freq: 360, gain: 0.5 }, { use: 'knock', freq: 290, gain: 0.55 }] },
    tick: { use: 'blip', notes: ['F6', 'A6', 'C7'], dur: 0.06, gain: 0.5 },
    glow: { use: 'glass', notes: ['A6', 'C7', 'F6'], decay: 3.2, gain: 0.35 },
    click: { use: 'click', freq: 1600 },
    whoosh: { use: 'swish', color: 'air', from: 400, to: 1400, gain: 0.35 },
    motor: { use: 'whir', freq: 90, to: 140, gain: 0.25 },
    key: { use: 'click' },
    type: { use: 'key' },
    impact: { layers: [{ use: 'thud', freq: 70 }, { use: 'glass', note: 'F6', gain: 0.3 }] },
    riser: { use: 'swell', of: 'glass', note: 'C6' },
    boom: { layers: [{ use: 'thud', freq: 55 }, { use: 'glass', note: 'F5', gain: 0.35 }] },
  },
  hit: 'impact',
  rise: null,
  logo: [{ use: 'glass', note: 'F6', gain: 0.5 }, { use: 'glass', note: 'C7', gain: 0.35, delay: 0.06 }, { use: 'knock', freq: 220, gain: 0.5 }],
};
