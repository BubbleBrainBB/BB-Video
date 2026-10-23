// Sound design: design it for this product (principles and how to write it: the skill's references/sound.md). Below is only a skeleton — rewrite every entry for the product.
export default {
  name: '一句话：这个产品听起来是什么样的',
  space: { size: 0.3, mix: 0.12 },
  ambience: null,
  sounds: {
    whoosh: { variants: [{ use: 'swish', color: 'air' }, { use: 'swish', color: 'air', from: 500, to: 3200 }, { use: 'swish', color: 'cloth', from: 300, to: 2400, gain: 0.8 }] },   // three take turns
    impact: { layers: [{ use: 'thud', freq: 70 }, { use: 'glass', note: 'E6', gain: 0.3 }] },
    click: { use: 'click' },
    type: { use: 'key' },
    tick: { use: 'blip', notes: ['E6', 'G#6', 'B6'] },
    pop: { use: 'drop' },
    riser: { use: 'swell', of: 'glass', note: 'B5' },
    boom: { layers: [{ use: 'thud', freq: 50 }, { use: 'glass', note: 'E5', gain: 0.4 }] },
  },
  hit: 'impact',
  rise: null,
  logo: [{ use: 'glass', note: 'E6', gain: 0.6 }, { use: 'glass', note: 'B6', gain: 0.4, delay: 0.06 }, { use: 'thud', freq: 55, gain: 0.6 }],
};
