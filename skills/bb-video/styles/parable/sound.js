// Sound design (starting point for the 3D stick-figure parable): a black, quiet room with a hard glossy floor, heard close. Bricks land with a
// dry clay clack (a short knock plus a low body), hands tap and pat, steps are soft rubber thuds, a sit or a nap is a cushioned thump; a counter
// ticks like a small clock. The reveal and the closing line ring a glass bell in the score's key (D minor / F major).
// Types the parable runtime emits: place (a brick / block lands), tap (a pat, a level set down), step, thud (sit / lie / land), whoosh (a jump, a fall,
// a climb), tick (a counter), coin (a coin lands), glow (a title / tag), hit (the reveal, when the page asks for it).
export default {
  name: 'A black room with a glossy floor: dry clay clacks, soft taps and steps, one glass bell',
  space: { size: 0.32, mix: 0.12 },
  ambience: null,
  vary: 0.12,
  sounds: {
    place: { variants: [
      { layers: [{ use: 'knock', freq: 420, gain: 0.75 }, { use: 'thud', freq: 140, gain: 0.45 }] },
      { layers: [{ use: 'knock', freq: 470, gain: 0.7 }, { use: 'thud', freq: 125, gain: 0.45 }] },
      { layers: [{ use: 'knock', freq: 380, gain: 0.75 }, { use: 'thud', freq: 150, gain: 0.4 }] },
    ] },
    tap: { variants: [{ use: 'knock', freq: 900, gain: 0.45 }, { use: 'knock', freq: 1040, gain: 0.4 }, { use: 'click', freq: 2200, gain: 0.35 }] },
    step: { variants: [{ use: 'thud', freq: 95, gain: 0.45 }, { use: 'thud', freq: 110, gain: 0.4 }] },
    thud: { use: 'thud', freq: 70, gain: 0.7 },
    whoosh: { use: 'swish', color: 'air', from: 500, to: 1800, shape: 'arc', gain: 0.4 },
    tick: { use: 'tick', freq: 'A6', decay: 240, gain: 0.6 },
    coin: { variants: [{ use: 'glass', note: 'A6', decay: 0.5, gain: 0.45 }, { use: 'glass', note: 'C7', decay: 0.5, gain: 0.4 }] },
    glow: { use: 'glass', note: 'A5', decay: 2.2, gain: 0.45 },
    hit: { layers: [{ use: 'boom', freq: 38, gain: 0.7, noise: 0.2 }, { use: 'glass', note: 'D6', decay: 2.4, gain: 0.35 }] },
    key: { use: 'click' },
    type: { use: 'key' },
    impact: { layers: [{ use: 'thud', freq: 60 }, { use: 'glass', note: 'D6', gain: 0.3 }] },
    riser: { use: 'swell', of: 'glass', note: 'A5' },
    boom: { layers: [{ use: 'boom', freq: 36, gain: 0.7 }, { use: 'glass', note: 'D5', gain: 0.3 }] },
  },
  hit: 'hit',
  rise: null,
  logo: null,
};
