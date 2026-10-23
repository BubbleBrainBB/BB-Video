// Sound design (starting point for the pixel style): game-console effects — square-wave "blips", the two-note coin, the rising jump, the noise of a hit. Principles and how-to in the skill's references/sound.md.
// Types the components emit: blip (typing, menu moves), select (window opens, confirm), pop (item appears), coin (received, number settles), jump, step (walking, very light),
//   hit (taking a hit), slash (attack), power (big text lands, cheering), fill (health bar rises, mosaic sharpens), burst (blocks explode), sweep (transition), logo.
// Pitched sounds are in C major (C D E F G A B) — change to match the music, same key as score.js.
const sq = (from, to, dur, gain = 1, delay = 0) => ({ use: 'blip', wave: 'square', freq: from, to, dur, gain, delay });
export default {
  name: 'One line: what this product / topic sounds like (e.g. a little game console that goes "ding" at every right move)',
  space: { size: 0.1, mix: 0.04 },
  vary: 0.02,
  sounds: {
    blip: sq('C6', 'C6', 0.025, 0.5),
    select: { layers: [sq('G5', 'G5', 0.04, 0.6), sq('C6', 'C6', 0.06, 0.6, 0.05)] },
    pop: sq('C5', 'C6', 0.07, 0.6),
    coin: { layers: [sq('B5', 'B5', 0.06, 0.6), sq('E6', 'E6', 0.22, 0.6, 0.06)] },
    jump: sq('C5', 'G5', 0.16, 0.55),
    step: { variants: [{ use: 'click', freq: 420, noise: 0.8, gain: 0.35 }, { use: 'click', freq: 560, noise: 0.8, gain: 0.3 }, { use: 'click', freq: 380, noise: 0.9, gain: 0.35 }] },
    hit: { layers: [{ use: 'zap', from: 900, to: 90, dur: 0.18, gain: 0.7 }, { use: 'key', bright: 1800, gain: 0.5 }] },
    slash: { use: 'swish', color: 'cloth', from: 2400, to: 600, dur: 0.12 },
    power: { layers: [sq('C5', 'C5', 0.05, 0.5), sq('E5', 'E5', 0.05, 0.5, 0.05), sq('G5', 'G5', 0.05, 0.5, 0.1), sq('C6', 'C6', 0.14, 0.55, 0.15)] },
    fill: { use: 'blip', wave: 'square', freq: 'C5', to: 'C7', dur: 0.5, gain: 0.35 },
    burst: { layers: [{ use: 'zap', from: 400, to: 60, dur: 0.3, gain: 0.6 }, { use: 'key', bright: 1200, gain: 0.6 }] },
    sweep: { use: 'blip', wave: 'square', freq: 'C7', to: 'C4', dur: 0.3, gain: 0.3 },
    impact: { layers: [{ use: 'zap', from: 300, to: 40, dur: 0.35, gain: 0.7 }, { use: 'thud', freq: 60, decay: 10, gain: 0.6 }] },
    whoosh: { use: 'blip', wave: 'square', freq: 'C7', to: 'C4', dur: 0.3, gain: 0.3 },
    click: sq('G6', 'G6', 0.02, 0.4),
    type: sq('C6', 'C6', 0.02, 0.35),
    tick: sq('E6', 'E6', 0.02, 0.35),
    riser: { use: 'blip', wave: 'square', freq: 'C4', to: 'C7', dur: 1.0, gain: 0.25 },
    boom: { layers: [{ use: 'zap', from: 200, to: 30, dur: 0.6, gain: 0.8 }, { use: 'thud', freq: 50, decay: 6 }] },
  },
  hit: 'impact',
  rise: null,
  logo: [sq('C5', 'C5', 0.08, 0.5), sq('E5', 'E5', 0.08, 0.5, 0.1), sq('G5', 'G5', 0.08, 0.5, 0.2), sq('C6', 'C6', 0.5, 0.6, 0.3), sq('G6', 'G6', 0.5, 0.35, 0.3)],
};
