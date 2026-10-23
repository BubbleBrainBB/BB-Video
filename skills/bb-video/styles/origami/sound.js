// Sound design (starting point for the origami style): paper + wooden table. Principles and usage in the skill's references/sound.md; style notes in styles/origami/STYLE.md.
// The types the origami components emit are already written here (fold / unfold / land / flip / flutter) — then adapt to the product: paper thickness, table hardness, pitched accents in the score's key.
export default {
  name: '一句话：这个产品的纸听起来是什么样的（例：厚的手工纸、木桌、安静的工作室）',
  space: { size: 0.22, mix: 0.1 },                               // small, dry room
  ambience: { use: 'roomtone', bright: 380, gain: 0.08 },
  vary: 0.07,
  sounds: {
    fold: { use: 'fold', crack: 0.7, press: 0.45 },                                 // fold up
    unfold: { variants: [{ use: 'fold', crack: 0.55, air: 1.2, press: 0.6, from: 600, to: 2000 }, { use: 'fold', crack: 0.8, air: 0.9, press: 0.5, bright: 3800 }] },   // unfold (flattened at the end)
    land: { variants: [                                                                // a paper card lands on the wooden table (three variants in rotation, so several in a row don't sound the same)
      { layers: [{ use: 'thud', freq: 120, felt: 1300, decay: 20, body: 0.55 }, { use: 'paper', dur: 0.09, bright: 2600, grain: 0.35, shape: 'down', gain: 0.8 }] },
      { layers: [{ use: 'thud', freq: 105, felt: 1100, decay: 18, body: 0.6 }, { use: 'paper', dur: 0.11, bright: 2200, grain: 0.45, shape: 'down', gain: 0.75 }] },
      { layers: [{ use: 'thud', freq: 135, felt: 1500, decay: 22, body: 0.5 }, { use: 'paper', dur: 0.08, bright: 3000, grain: 0.3, shape: 'down', gain: 0.85 }] },
    ] },
    flip: { use: 'paper', bright: 2400, grain: 0.5, flap: 9 },                       // page flip
    flutter: { use: 'paper', bright: 1800, grain: 0.25, flap: 14, gain: 0.5 },        // a paper plane / paper crane flies past
    crease: { use: 'crease' },                                                       // pressing a crease (a move you write yourself: F.sfx(t, 'crease', 0.6))
    whoosh: { use: 'paper', bright: 2000, grain: 0.3 },
    impact: { layers: [{ use: 'thud', freq: 90, felt: 900, decay: 12 }, { use: 'knock', freq: 'E5', gain: 0.25 }] },
    click: { use: 'click', freq: 1400, noise: 0.4 },
    type: { use: 'key', bright: 2000 },
    tick: { use: 'knock', notes: ['E5', 'G#5', 'B5', 'C#6'] },
    pop: { use: 'knock', notes: ['B5', 'E6'] },
    riser: { use: 'swell', of: 'paper', dur: 1.0 },
    boom: { layers: [{ use: 'thud', freq: 60, decay: 7 }, { use: 'paper', dur: 0.25, bright: 1500, gain: 0.5 }] },
  },
  hit: null,                // heavy hit at section starts: the card landing is already the accent, so usually none
  rise: null,
  logo: [{ use: 'fold', dur: 0.35, crack: 0.5, press: 0.8 }, { use: 'knock', freq: 'E5', gain: 0.5, delay: 0.3 }, { use: 'knock', freq: 'B5', gain: 0.4, delay: 0.42 }],
};
