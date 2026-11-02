// Sound design (starting point for the drawn-world style): a pen on paper in a quiet room, then a place waking up. The pen is a soft scratch that stays
// out from under the voice (light effects drop while speaking, so it is heard in the pauses); a strike-through is a small tap; the wash is a slow airy swell
// with a glass note on top; each machine starting is a low whirr. Add the sounds your world needs with the same palette words: references/sound.md.
// Types the drawnworld runtime emits: scratch, tap, wash, whirr.
export default {
  name: 'One line: what this film sounds like (e.g. a pen on paper, then a town waking up in colour)',
  space: { size: 0.3, mix: 0.1 },
  ambience: { use: 'roomtone', bright: 420, gain: 0.12 },
  vary: 0.16,
  sounds: {
    scratch: { variants: [{ use: 'rustle', crinkle: 0.06, bright: 5600, gain: 0.22 }, { use: 'paper', dur: 0.3, bright: 5800, grain: 0.35, shape: 'arc', gain: 0.2 }, { use: 'rustle', crinkle: 0.1, bright: 4800, gain: 0.2 }] },
    tap: { variants: [{ use: 'click', freq: 2200, decay: 180, gain: 0.32 }, { use: 'knock', freq: 900, gain: 0.26 }] },
    wash: { layers: [{ use: 'swish', from: 200, to: 1400, color: 'air', shape: 'arc', gain: 0.34 }, { use: 'glass', note: 'E5', dur: 3.2, decay: 1.1, gain: 0.24, delay: 0.4 }, { use: 'glass', note: 'B5', dur: 2.8, decay: 1.2, gain: 0.16, delay: 1.2 }] },
    whirr: { layers: [{ use: 'swish', from: 90, to: 240, color: 'air', shape: 'up', gain: 0.3 }, { use: 'knock', freq: 300, gain: 0.3 }] },
  },
  hit: 'tap',
  rise: null,
  logo: [{ use: 'glass', note: 'D6', dur: 1.6, gain: 0.4 }],
};
