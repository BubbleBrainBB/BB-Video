// Sound design (starting point for the manga / motion-comic style): the sound effects the page letters. A drawn ドン / 轰 is a heavy hit (a low
// boom and a crack), ゴゴゴ / 隆隆 a low rumble that trembles, a punch a fast whoosh into a smack, a slash a bright blade swipe; the camera's pans
// between panels are soft air, a page turn is paper, the ink-in of a panel a pen scratch, a shout balloon a short brass-like stab, manga marks
// (sweat, sparkle, vein) small pitched blips. Keep them in the score's key. Add the sounds your story needs with the same palette words:
// references/sound.md.
// Types the manga runtime emits: hit (impact lettering), rumble (rumble lettering), punch (punch-ins, fists), slash / tear (transitions, intro
// boxes), page (page turn), whoosh (fades), pan (camera moves between panels), pen / ink (panels and titles inking in), pop (pop lettering,
// popping panels, marks), shout (shout balloons), blip (talk balloons), drip (sweat, tears), ting (sparkle), puff (steam), gloom, tick.
export default {
  name: 'One line: what this film sounds like (e.g. a motion comic: every drawn sound word lands as a real hit)',
  space: { size: 0.35, mix: 0.12 },
  vary: 0.08,
  sounds: {
    hit: { variants: [
      { layers: [{ use: 'impact', freq: 42, crack: 1.2, body: 1.1, bright: 3200 }, { use: 'boom', freq: 34, dur: 1.2, gain: 0.5 }] },
      { layers: [{ use: 'impact', freq: 48, crack: 1.0, body: 1.0, bright: 2800 }, { use: 'boom', freq: 38, dur: 1.0, gain: 0.45 }] },
    ] },
    rumble: { layers: [{ use: 'boom', freq: 30, dur: 1.8 }, { use: 'rustle', crinkle: 0.2, bright: 500, air: 0.6, gain: 0.5 }] },
    punch: { layers: [{ use: 'swish', from: 600, to: 3200, color: 'air', dur: 0.16, shape: 'up', gain: 0.6 }, { use: 'impact', freq: 70, crack: 1.4, body: 0.6, bright: 4200, delay: 0.12 }] },
    slash: { layers: [{ use: 'swish', from: 1800, to: 7000, color: 'air', dur: 0.22, shape: 'down' }, { use: 'glint', note: 'B6', count: 2, dur: 0.3, gain: 0.25 }] },
    tear: { use: 'tear', from: 5000, to: 900, gain: 0.55 },
    page: { use: 'paper', dur: 0.6, bright: 2600, grain: 0.6, flap: 2 },
    whoosh: { use: 'swish', from: 300, to: 2400, color: 'air' },
    pan: { use: 'swish', from: 260, to: 1300, color: 'air', shape: 'arc', gain: 0.5 },
    pen: { use: 'crease', from: 1500, to: 3400 },
    ink: { use: 'stamp', freq: 80 },
    pop: { use: 'pop', freq: 520, rise: 900 },
    shout: { layers: [{ use: 'impact', freq: 90, crack: 0.5, body: 0.4, bright: 2000 }, { use: 'blip', freq: 'E5', to: 'B4', dur: 0.08, gain: 0.3 }] },
    blip: { use: 'blip', notes: ['E6', 'G6', 'B6'], dur: 0.04, gain: 0.3 },
    drip: { use: 'drop', notes: ['B5', 'E6'], gain: 0.55 },
    ting: { use: 'glint', note: 'E7', count: 3 },
    puff: { use: 'swish', from: 400, to: 900, color: 'cloth', dur: 0.25 },
    gloom: { use: 'swell', of: 'glass', note: 'E3', dur: 0.8 },
    tick: { use: 'tick', freq: 2600 },
    impact: { use: 'impact', freq: 46 },
    boom: { layers: [{ use: 'boom', freq: 34 }, { use: 'impact', freq: 56, gain: 0.5 }] },
  },
  hit: 'hit',
  rise: null,
  logo: [{ use: 'impact', freq: 44, crack: 1.1 }, { use: 'glint', note: 'B6', count: 3, gain: 0.4, delay: 0.1 }],
};
