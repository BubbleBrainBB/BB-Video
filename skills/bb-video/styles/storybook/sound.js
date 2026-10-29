// Sound design (starting point for the hand-drawn storybook mascot style): small, close and wooden — a toy theatre on a tabletop. Things pop up
// with a soft bubble, drop onto the stage with a wooden knock, a character hops with tiny felt taps and lands with a squishy thump, a clone splits
// off with a rising blip and a puff, clones merge with a falling blip and a pat; a tag clicks on, a ✓ line is a small glass ding, a log types in on
// soft keys; a paper plane is a breath of air; drawers, blocks and the big button are wood and plastic; the alarm bell rings for real.
// The reference programmes (no voice) carry the whole film on these foley sounds plus a light plucked bed; with narration keep them small.
// Add the sounds your story needs with the same palette words: references/sound.md.
// Types the storybook runtime emits: pop, drop, rise, slide, draw, hop, jump, squash, split, merge, puff, tag, type, ding, bad, plane, drawer, clack,
//   press, bell, flip, chomp, shake, paper, swish.
export default {
  name: 'One line: what this film sounds like (e.g. a toy theatre on a tabletop: wooden knocks, felt hops, a small glass ding per result)',
  space: { size: 0.25, mix: 0.08 },
  ambience: { use: 'roomtone', bright: 380, gain: 0.18 },
  vary: 0.14,
  sounds: {
    pop: { variants: [{ use: 'bubble', freq: 620, count: 2, dur: 0.16, gain: 0.45 }, { use: 'bubble', freq: 720, count: 2, dur: 0.16, gain: 0.4 }, { use: 'drop', freq: 520, to: 1100, gain: 0.4 }] },
    drop: { variants: [{ use: 'knock', freq: 260, gain: 0.55 }, { use: 'knock', freq: 300, gain: 0.5 }] },
    rise: { variants: [{ use: 'swish', from: 300, to: 1400, color: 'cloth', shape: 'up', gain: 0.4 }, { use: 'swish', from: 260, to: 1200, color: 'cloth', shape: 'up', gain: 0.38 }] },
    slide: { use: 'swish', from: 500, to: 1300, color: 'cloth', shape: 'arc', gain: 0.4 },
    draw: { variants: [{ use: 'rustle', crinkle: 0.08, bright: 4200, gain: 0.3 }, { use: 'rustle', crinkle: 0.12, bright: 3600, gain: 0.28 }, { use: 'paper', dur: 0.35, bright: 5000, grain: 0.1, shape: 'arc', gain: 0.25 }] },
    hop: { variants: [{ use: 'thud', freq: 180, decay: 26, felt: 1400, body: 0.5, dur: 0.12, gain: 0.32 }, { use: 'thud', freq: 210, decay: 28, felt: 1500, body: 0.5, dur: 0.12, gain: 0.3 }] },
    jump: { use: 'blip', freq: 380, to: 900, dur: 0.16, wave: 'tri', gain: 0.3 },
    squash: { variants: [{ use: 'thud', freq: 120, decay: 16, felt: 900, dur: 0.25, gain: 0.45 }, { use: 'thud', freq: 140, decay: 18, felt: 1000, dur: 0.25, gain: 0.42 }] },
    split: { layers: [{ use: 'blip', freq: 500, to: 1300, dur: 0.22, wave: 'tri', gain: 0.32 }, { use: 'swish', from: 400, to: 2400, color: 'air', shape: 'up', gain: 0.35 }] },
    merge: { layers: [{ use: 'blip', freq: 1200, to: 480, dur: 0.24, wave: 'tri', gain: 0.32 }, { use: 'thud', freq: 150, decay: 14, felt: 900, gain: 0.45, delay: 0.18 }] },
    puff: { use: 'swish', from: 900, to: 300, color: 'air', shape: 'down', gain: 0.3 },
    tag: { variants: [{ use: 'click', freq: 1500, decay: 140, gain: 0.3 }, { use: 'click', freq: 1700, decay: 150, gain: 0.28 }] },
    type: { use: 'key', bright: 2400, gain: 0.25 },
    ding: { use: 'glass', note: 'E6', dur: 0.8, decay: 4, gain: 0.32 },
    bad: { use: 'blip', freq: 300, to: 220, dur: 0.14, wave: 'square', gain: 0.18 },
    plane: { use: 'swish', from: 700, to: 2600, color: 'air', shape: 'arc', gain: 0.32 },
    drawer: { variants: [{ use: 'swish', from: 200, to: 600, color: 'cloth', shape: 'arc', gain: 0.4 }, { use: 'knock', freq: 220, gain: 0.35 }] },
    clack: { variants: [{ use: 'knock', freq: 420, gain: 0.5 }, { use: 'knock', freq: 360, gain: 0.5 }, { use: 'knock', freq: 480, gain: 0.45 }] },
    press: { layers: [{ use: 'click', freq: 700, decay: 60, gain: 0.5 }, { use: 'thud', freq: 110, decay: 16, gain: 0.4 }] },
    bell: { use: 'glass', note: 'A5', dur: 1.2, decay: 3, partials: [[1, 1], [2.4, 0.6], [3.9, 0.35], [5.6, 0.2]], gain: 0.4 },
    flip: { variants: [{ use: 'paper', dur: 0.12, bright: 3600, grain: 0.3, shape: 'down', gain: 0.3 }, { use: 'paper', dur: 0.1, bright: 4000, grain: 0.3, shape: 'down', gain: 0.28 }] },
    chomp: { layers: [{ use: 'thud', freq: 160, decay: 30, felt: 1200, gain: 0.4 }, { use: 'bubble', freq: 300, count: 2, dur: 0.15, gain: 0.25, delay: 0.05 }] },
    shake: { use: 'rustle', crinkle: 0.3, bright: 2600, gain: 0.25 },
    paper: { variants: [{ use: 'paper', dur: 0.3, bright: 3800, grain: 0.25, shape: 'arc', gain: 0.35 }, { use: 'paper', dur: 0.35, bright: 3400, grain: 0.3, shape: 'arc', gain: 0.32 }] },
    swish: { use: 'swish', from: 250, to: 900, color: 'air', shape: 'arc', gain: 0.18 },
  },
  hit: 'merge',
  rise: null,
  logo: [{ use: 'glass', note: 'C6', dur: 1.2, gain: 0.45 }, { use: 'bubble', freq: 600, gain: 0.35, delay: 0.05 }],
};
