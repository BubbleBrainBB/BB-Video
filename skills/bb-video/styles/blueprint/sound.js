// Sound design (starting point for the blueprint style): a drafting room and a workshop bench — a pen plotter's servo whirring along a line,
// a pencil and a technical pen on drafting film, a drafting machine's protractor head clicking, a stamp on the title block, a UV exposure lamp
// sweeping, sheets sliding, and the mechanism itself: an escapement's tick-tock, gears engaging, parts sliding apart. Principles: references/sound.md.
// Types the blueprint runtime emits: draw (a plotted stroke, follows its length), letter (lettering), dim (a dimension / leader: a ruler click),
// hatch (section hatching swept in), pencil (the red pencil), stamp (title block updated), expose (a new sheet develops), slide (a sheet slides over),
// explode (parts sliding along their axes), cut (a cutaway opening), tick / tock (escapement beats, alternating).
// Pitched sounds are in D minor (D E F G A Bb C) — change with the music, same key as score.js.
export default {
  name: 'One line: what this topic sounds like (e.g. a quiet drafting room, then the inside of a watch ticking under a loupe)',
  space: { size: 0.22, mix: 0.08 },
  vary: 0.08,
  sounds: {
    draw: { variants: [{ layers: [{ use: 'whir', freq: 520, to: 760, gain: 0.35 }, { use: 'paper', bright: 3400, grain: 0.15, gain: 0.35 }] }, { layers: [{ use: 'whir', freq: 600, to: 480, gain: 0.32 }, { use: 'paper', bright: 3000, grain: 0.18, gain: 0.35 }] }, { layers: [{ use: 'whir', freq: 450, to: 700, gain: 0.3 }, { use: 'paper', bright: 3800, grain: 0.12, gain: 0.3 }] }] },
    letter: { variants: [{ use: 'paper', bright: 4200, grain: 0.5, flap: 6, gain: 0.4 }, { use: 'paper', bright: 3800, grain: 0.6, flap: 8, gain: 0.4 }] },
    dim: { variants: [{ layers: [{ use: 'click', freq: 2600, noise: 0.2, decay: 70, gain: 0.5 }, { use: 'tick', freq: 'D7', decay: 220, gain: 0.3 }] }, { layers: [{ use: 'click', freq: 2300, noise: 0.25, decay: 70, gain: 0.5 }, { use: 'tick', freq: 'A6', decay: 220, gain: 0.3 }] }] },
    hatch: { use: 'paper', bright: 3600, grain: 0.7, flap: 14, gain: 0.45 },
    pencil: { variants: [{ use: 'paper', bright: 2600, grain: 0.85, gain: 0.6 }, { use: 'crease', from: 1400, to: 2600, gain: 0.5 }] },
    stamp: { layers: [{ use: 'stamp', freq: 110, gain: 0.6 }, { use: 'click', freq: 1800, noise: 0.3, gain: 0.3 }] },
    expose: { layers: [{ use: 'swish', color: 'air', from: 200, to: 1600, shape: 'arc', gain: 0.5 }, { use: 'swell', of: 'glass', note: 'A5', dur: 1.0, gain: 0.25 }] },
    slide: { use: 'paper', bright: 1800, grain: 0.3, gain: 0.55 },
    explode: { layers: [{ use: 'swish', color: 'cloth', from: 300, to: 1400, shape: 'arc', gain: 0.45 }, { use: 'film', rate: 18, bright: 0.4, gain: 0.25 }] },
    cut: { use: 'swish', color: 'digital', from: 600, to: 2400, shape: 'up', gain: 0.35 },
    tick: { layers: [{ use: 'click', freq: 3400, noise: 0.15, decay: 140, gain: 0.32 }, { use: 'knock', notes: ['D6'], decay: 60, gain: 0.2 }] },
    tock: { layers: [{ use: 'click', freq: 2800, noise: 0.15, decay: 140, gain: 0.3 }, { use: 'knock', notes: ['A5'], decay: 60, gain: 0.2 }] },
    whoosh: { variants: [{ use: 'swish', color: 'air', from: 300, to: 2600 }, { use: 'swish', color: 'cloth', from: 250, to: 2000 }] },
    impact: { layers: [{ use: 'thud', freq: 60, decay: 8 }, { use: 'glass', note: 'D6', dur: 0.6, decay: 6, gain: 0.25 }] },
    click: { use: 'click', freq: 1800, noise: 0.3 },
    snap: { layers: [{ use: 'click', freq: 2200, noise: 0.25, decay: 60 }, { use: 'thud', freq: 120, decay: 24, gain: 0.4 }] },
    pop: { use: 'blip', freq: 'D6', to: 'A6', wave: 'sine', dur: 0.08 },
    riser: { use: 'swell', of: 'glass', note: 'A5', dur: 1.0 },
    boom: { layers: [{ use: 'thud', freq: 48, decay: 6 }, { use: 'glass', note: 'D5', dur: 1.4, decay: 3, gain: 0.3 }] },
    type: { use: 'key', bright: 2200 },
  },
  hit: 'impact',
  rise: null,
  logo: [{ use: 'click', freq: 2600, noise: 0.2, gain: 0.7 }, { use: 'stamp', freq: 110, gain: 0.6, delay: 0.1 }, { use: 'glass', note: 'D6', dur: 1.6, decay: 2.5, gain: 0.4, delay: 0.18 }, { use: 'glass', note: 'A6', dur: 1.4, decay: 3, gain: 0.28, delay: 0.3 }],
};
