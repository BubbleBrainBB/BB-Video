// Sound design (starting point for the flat grain-illustration style): soft, round and close — a picture assembling itself on paper. Things
// stipple in with a fine sand hiss, grow up from the ground with a rising wooden swish, pop in with a small bubble, drop with a soft knock, slide in
// with a cloth swish; a column fills with a rising hiss; lines draw with a pencil; a needle swings with a tick; a number ticks over like a counter;
// a new year on the ruler is a small glass chime; the iris is a breath of air; the ground flooding a low swell; the spotlight a click and a hum.
// Add the sounds your story needs with the same palette words: references/sound.md.
// Types the grain runtime emits: grain, rise, pop, drop, slide, fill, draw, tick, roll, needle, chime, iris, flood, spot, drive.
export default {
  name: 'One line: what this film sounds like (e.g. a picture book assembling itself: sand-soft stipple, wooden pops, a small chime per year)',
  space: { size: 0.3, mix: 0.1 },
  ambience: { use: 'roomtone', bright: 420, gain: 0.22 },
  vary: 0.12,
  sounds: {
    grain: { variants: [{ use: 'paper', dur: 0.45, bright: 5200, grain: 0.15, shape: 'arc', gain: 0.45 }, { use: 'paper', dur: 0.5, bright: 4600, grain: 0.2, shape: 'arc', gain: 0.4 }] },
    rise: { variants: [{ use: 'swish', from: 300, to: 1500, color: 'cloth', shape: 'up', gain: 0.55 }, { use: 'swish', from: 260, to: 1300, color: 'cloth', shape: 'up', gain: 0.5 }] },
    pop: { variants: [{ use: 'bubble', freq: 520, gain: 0.5 }, { use: 'bubble', freq: 640, gain: 0.45 }, { use: 'bubble', freq: 440, gain: 0.5 }] },
    drop: { variants: [{ use: 'knock', freq: 300, gain: 0.55 }, { use: 'knock', freq: 360, gain: 0.5 }] },
    slide: { variants: [{ use: 'swish', from: 500, to: 1400, color: 'cloth', shape: 'arc', gain: 0.45 }, { use: 'swish', from: 420, to: 1200, color: 'air', shape: 'arc', gain: 0.4 }] },
    fill: { use: 'swish', from: 600, to: 3200, color: 'air', shape: 'up', gain: 0.35 },
    draw: { use: 'rustle', crinkle: 0.1, bright: 4200, gain: 0.3 },
    tick: { variants: [{ use: 'click', freq: 2200, decay: 160, gain: 0.4 }, { use: 'click', freq: 1900, decay: 150, gain: 0.4 }] },
    roll: { use: 'film', rate: 22, bright: 2600, gain: 0.35 },
    needle: { layers: [{ use: 'swish', from: 700, to: 1600, color: 'air', shape: 'arc', gain: 0.3 }, { use: 'click', freq: 2600, decay: 200, gain: 0.3, delay: 0.5 }] },
    chime: { use: 'glass', note: 'A6', dur: 0.9, decay: 5, gain: 0.35 },
    iris: { use: 'swish', from: 200, to: 1800, color: 'air', shape: 'arc', gain: 0.5 },
    flood: { use: 'swell', gain: 0.35 },
    spot: { layers: [{ use: 'click', freq: 800, decay: 50, gain: 0.5 }, { use: 'swell', gain: 0.3 }] },
    drive: { use: 'whir', gain: 0.3 },
  },
  hit: 'spot',
  rise: null,
  logo: [{ use: 'glass', note: 'F6', dur: 1.2, gain: 0.5 }, { use: 'bubble', freq: 520, gain: 0.4, delay: 0.05 }],
};
