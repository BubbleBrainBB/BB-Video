// Sound design (starting point for the Matisse cut-paper style): scissors, coloured paper, a quiet worktable. Principles and how to write it: the skill's references/sound.md; style notes: styles/cutout/STYLE.md.
// Types the cut-paper components emit: snip (scissors close), paste (the light pat of paper pressed down), rustle (picking up / moving paper), lift (peeling up), cover (a big sheet sweeping over), tear (tearing open).
// Pitched sounds (the scissors' metallic ring, wooden accents) are all in the F major pentatonic (F G A C D) — change to suit the product, in the same key as score.js.
export default {
  name: '一句话：这个产品的剪纸工作台听起来是什么样的（例：明亮的工作室、锋利的剪刀、厚实的水粉纸）',
  space: { size: 0.24, mix: 0.1 },                                 // a small, dry studio
  ambience: { use: 'roomtone', bright: 420, gain: 0.07 },
  vary: 0.07,
  sounds: {
    snip: { variants: [{ use: 'snip', ring: 'A7' }, { use: 'snip', ring: 'G7', scrape: 0.03 }, { use: 'snip', ring: 'C8', scrape: 0.04, metal: 0.3 }] },   // scissors close
    paste: { variants: [                                                // paper pressed down: a light pat of the palm (three take turns, so pasting several pieces in a row doesn't get monotonous)
      { layers: [{ use: 'thud', freq: 150, felt: 1500, decay: 24, body: 0.35 }, { use: 'paper', dur: 0.07, bright: 2600, grain: 0.3, shape: 'down', gain: 0.8 }] },
      { layers: [{ use: 'thud', freq: 130, felt: 1300, decay: 22, body: 0.4 }, { use: 'paper', dur: 0.09, bright: 2300, grain: 0.4, shape: 'down', gain: 0.75 }] },
      { layers: [{ use: 'thud', freq: 165, felt: 1700, decay: 26, body: 0.3 }, { use: 'paper', dur: 0.06, bright: 3000, grain: 0.25, shape: 'down', gain: 0.85 }] },
    ] },
    rustle: { variants: [{ use: 'rustle', crinkle: 0.7, bright: 2600 }, { use: 'rustle', crinkle: 0.9, air: 0.8, bright: 3200 }] },   // picking up, moving
    lift: { use: 'paper', bright: 2400, grain: 0.5, shape: 'up' },                                                                   // peeling up
    cover: { layers: [{ use: 'rustle', crinkle: 0.4, air: 1.4, bright: 1800 }, { use: 'swish', color: 'cloth', from: 300, to: 1600, gain: 0.5 }] },   // a big sheet sweeping over
    tear: { use: 'tear' },                                                                                                         // tearing open
    whoosh: { use: 'paper', bright: 2000, grain: 0.3 },
    impact: { layers: [{ use: 'thud', freq: 95, felt: 900, decay: 12 }, { use: 'knock', freq: 'F5', gain: 0.3 }] },
    pop: { use: 'knock', notes: ['C6', 'D6', 'F6', 'G6', 'A6'] },
    tick: { use: 'knock', notes: ['F6', 'G6', 'A6', 'C7'] },
    click: { use: 'click', freq: 1400, noise: 0.4 },
    type: { use: 'key', bright: 2000 },
    riser: { use: 'swell', of: 'paper', dur: 1.0 },
    boom: { layers: [{ use: 'thud', freq: 60, decay: 7 }, { use: 'paper', dur: 0.25, bright: 1500, gain: 0.5 }] },
  },
  hit: null,                // paper being pasted is already the accent; usually don't add more
  rise: null,
  logo: [{ use: 'snip', ring: 'C8', gain: 0.7 }, { use: 'thud', freq: 140, felt: 1500, decay: 20, body: 0.4, gain: 0.8, delay: 0.12 }, { use: 'knock', freq: 'F5', gain: 0.5, delay: 0.14 }, { use: 'knock', freq: 'A5', gain: 0.4, delay: 0.24 }, { use: 'knock', freq: 'C6', gain: 0.35, delay: 0.34 }],
};
