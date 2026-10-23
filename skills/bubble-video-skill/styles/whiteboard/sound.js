// Sound design (starting point when the whiteboard makes a promo): a marker writing on the board, tape, camera pans. Principles and how to write it: promo/references/sound.md; change to suit the product.
// Types the shared interface (promo/runtime/kit.js) emits: write (writing), circle (circling), tape (taping up a photo), pan (camera pans to the next section), logo
export default {
  name: '一句话：这个产品写在白板上听起来是什么样的（例：安静的会议室、马克笔、轻快）',
  space: { size: 0.3, mix: 0.12 },
  vary: 0.08,
  sounds: {
    write: { variants: [{ use: 'paper', bright: 5200, grain: 0.9, gain: 0.7 }, { use: 'paper', bright: 4600, grain: 0.8, gain: 0.65 }, { use: 'paper', bright: 5800, grain: 1.0, gain: 0.6 }] },
    circle: { use: 'paper', bright: 4800, grain: 0.85, gain: 0.6 },
    tape: { use: 'tear', gain: 0.5 },
    pan: { use: 'swish', color: 'air', from: 300, to: 2400, gain: 0.6 },
    whoosh: { use: 'swish', color: 'air', from: 400, to: 3000 },
    impact: { layers: [{ use: 'thud', freq: 90, decay: 12 }, { use: 'knock', freq: 'C5', gain: 0.3 }] },
    pop: { use: 'knock', notes: ['C5', 'E5', 'G5', 'A5'] },
    tick: { use: 'knock', notes: ['C6', 'D6', 'E6', 'G6'] },
    click: { use: 'click', freq: 1600 },
    type: { use: 'key', bright: 2400 },
    riser: { use: 'swell', of: 'paper', dur: 1.0 },
    boom: { layers: [{ use: 'thud', freq: 60, decay: 7 }, { use: 'knock', freq: 'C4', gain: 0.4 }] },
  },
  hit: null,
  logo: [{ use: 'knock', freq: 'C5', gain: 0.6 }, { use: 'knock', freq: 'G5', gain: 0.5, delay: 0.14 }, { use: 'knock', freq: 'C6', gain: 0.45, delay: 0.28 }],
};
