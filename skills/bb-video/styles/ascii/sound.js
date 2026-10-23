// Sound design (starting point for the ASCII style): keyboards, terminals, fine digital grain. Principles and how to write it: the skill's references/sound.md; the style itself: styles/ascii/STYLE.md.
// Types the ASCII components emit: type (typing, a run of key sounds), decode (scrambled characters settling), ping (a sonar ring of characters), wipe (inverted characters sweeping across), impact (big type landing), logo.
// Pitched sounds (notifications, sonar) are in the F major pentatonic (F G A C D) — change it per product, in the same key as score.js.
export default {
  name: '一句话：这个产品在终端里听起来是什么样的（例：安静的工作室、轻的机械键盘、干净的提示音）',
  space: { size: 0.2, mix: 0.08 },
  ambience: { use: 'roomtone', bright: 520, gain: 0.05 },
  vary: 0.08,
  sounds: {
    type: { variants: [{ use: 'key', bright: 2600 }, { use: 'key', bright: 2200 }, { use: 'key', bright: 3000 }] },          // keyboard
    decode: { variants: [{ use: 'swish', color: 'digital', crush: 3000, from: 1200, to: 5200, gain: 0.5 }, { use: 'swish', color: 'digital', crush: 4000, from: 1600, to: 6000, gain: 0.45 }] },   // scrambled characters flipping
    ping: { use: 'glint', note: 'C7', dur: 0.8 },                                                                                // sonar ring
    wipe: { layers: [{ use: 'swish', color: 'digital', crush: 2500, from: 500, to: 3800, gain: 0.6 }, { use: 'swish', color: 'air', from: 400, to: 2600, gain: 0.3 }] },
    impact: { layers: [{ use: 'thud', freq: 80, felt: 1100, decay: 12 }, { use: 'click', freq: 2200, noise: 0.5, gain: 0.5 }] },
    whoosh: { use: 'swish', color: 'air', from: 500, to: 2400 },
    pop: { use: 'blip' },
    tick: { use: 'tick', notes: ['F6', 'G6', 'A6', 'C7', 'D7'] },
    click: { variants: [{ use: 'click', freq: 1800, noise: 0.4 }, { use: 'click', freq: 1500, noise: 0.5 }, { use: 'click', freq: 2100, noise: 0.35 }] },   // enter key
    riser: { use: 'swell', of: 'glass', dur: 1.0 },
    boom: { layers: [{ use: 'thud', freq: 55, decay: 7 }, { use: 'swish', color: 'digital', crush: 1500, from: 300, to: 1800, dur: 0.4, gain: 0.4 }] },
  },
  hit: null,
  rise: null,
  logo: [{ use: 'key', bright: 2600, gain: 0.7 }, { use: 'key', bright: 2400, gain: 0.7, delay: 0.09 }, { use: 'key', bright: 2800, gain: 0.7, delay: 0.18 }, { use: 'glint', note: 'F6', dur: 1.2, gain: 0.5, delay: 0.3 }, { use: 'glint', note: 'A6', dur: 1.2, gain: 0.4, delay: 0.32 }],
};
