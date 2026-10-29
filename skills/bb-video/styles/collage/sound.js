// Sound design (starting point for the paper-collage explainer style): paper on a table, close-miked. Pieces land with a soft slap of paper,
// slide in with a dry rasp, strips slap down, a stamp thumps with a little paper; the typewriter clacks and dings, the highlighter squeaks, the red
// thread is pulled taut, push pins click, the camera's long travels are a breath of air; a lamp clicks on for the spotlight. A faint room tone under it all.
// Add the sounds your story needs with the same palette words: references/sound.md.
// Types the collage runtime emits: paper (a piece lands), slide (slides in / out), slap (a strip slapped down), tear (a wipe-in), stamp, press (a big
// character / number printed), key / ding (typewriter), marker (highlighter, redaction, rings, notes), pencil (lines drawn), snip (paper-doll rows),
// ink (dolls turning red), string (the timeline thread), pin, wood (ladder), roll (a number rolling), travel (long camera moves), lamp (spotlight), impact (title sheet).
export default {
  name: 'One line: what this film sounds like (e.g. papers spread on a table under one lamp: slaps, a stamp, a typewriter, a pulse under the voice)',
  space: { size: 0.22, mix: 0.08 },
  ambience: { use: 'roomtone', bright: 380, gain: 0.3 },
  vary: 0.1,
  sounds: {
    paper: { variants: [{ use: 'paper', dur: 0.2, bright: 2600, grain: 0.5, shape: 'down' }, { use: 'paper', dur: 0.24, bright: 2200, grain: 0.6, shape: 'down' }] },
    slide: { variants: [{ use: 'paper', dur: 0.45, bright: 1800, grain: 0.7, shape: 'arc' }, { use: 'paper', dur: 0.5, bright: 1500, grain: 0.8, shape: 'arc' }, { use: 'swish', from: 400, to: 1600, color: 'cloth', shape: 'arc', gain: 0.6 }] },
    slap: { variants: [{ layers: [{ use: 'thud', freq: 140, gain: 0.5 }, { use: 'paper', dur: 0.1, bright: 3000, grain: 0.3, shape: 'down', gain: 0.6 }] }, { layers: [{ use: 'thud', freq: 120, gain: 0.45 }, { use: 'paper', dur: 0.12, bright: 2600, grain: 0.4, shape: 'down', gain: 0.6 }] }, { layers: [{ use: 'thud', freq: 160, gain: 0.4 }, { use: 'paper', dur: 0.09, bright: 3300, grain: 0.3, shape: 'down', gain: 0.55 }] }] },
    tear: { use: 'tear', from: 4200, to: 1400 },
    stamp: { layers: [{ use: 'stamp', freq: 95, gain: 0.8 }, { use: 'paper', dur: 0.08, bright: 2400, grain: 0.3, shape: 'down', gain: 0.4 }] },
    press: { layers: [{ use: 'thud', freq: 70, gain: 0.6 }, { use: 'paper', dur: 0.14, bright: 1600, grain: 0.4, shape: 'down', gain: 0.35 }] },
    key: { variants: [{ use: 'key', bright: 2300 }, { use: 'key', bright: 2000 }, { use: 'key', bright: 2600 }] },
    ding: { use: 'glass', note: 'E7', dur: 0.8, decay: 4, gain: 0.5 },
    marker: { variants: [{ use: 'crease', from: 1600, to: 3400 }, { use: 'crease', from: 1900, to: 3800 }, { use: 'crease', from: 1400, to: 3000 }] },
    pencil: { use: 'rustle', crinkle: 0.15, bright: 3800, gain: 0.35 },
    snip: { use: 'snip' },
    ink: { use: 'swish', from: 600, to: 1800, color: 'cloth', shape: 'up', gain: 0.5 },
    string: { use: 'swish', from: 300, to: 900, color: 'cloth', shape: 'down', gain: 0.45 },
    pin: { variants: [{ use: 'click', freq: 1700, decay: 130, gain: 0.5 }, { use: 'click', freq: 1450, decay: 120, gain: 0.5 }] },
    wood: { use: 'knock', freq: 420 },
    roll: { use: 'film', rate: 28, bright: 2000, gain: 0.5 },
    travel: { variants: [{ use: 'swish', from: 220, to: 1400, color: 'air', shape: 'arc', gain: 0.5 }, { use: 'swish', from: 180, to: 1100, color: 'air', shape: 'arc', gain: 0.45 }, { use: 'swish', from: 260, to: 1700, color: 'air', shape: 'arc', gain: 0.45 }] },
    lamp: { layers: [{ use: 'click', freq: 900, decay: 60, gain: 0.5 }, { use: 'swell', gain: 0.25 }] },
    impact: { layers: [{ use: 'impact', freq: 42, bright: 1500 }, { use: 'paper', dur: 0.12, bright: 2000, grain: 0.3, shape: 'down', gain: 0.5 }] },
  },
  hit: 'impact',
  rise: null,
  logo: [{ use: 'stamp', freq: 95, gain: 0.7 }, { use: 'paper', dur: 0.1, bright: 2400, grain: 0.3, shape: 'down', gain: 0.4, delay: 0.02 }],
};
