// Sound design (starting point for the pencil-test animation style): the drawing desk, close up. A line going down is graphite scratching on
// paper (short for a tick, longer for a contour), shading is a fast soft scribble, the eraser rubs, a morph is a stack of drawings flipped
// under the thumb; a tally mark or a key on a timing chart is a pencil tap, a numeral turning over is a small tick; a figure's steps are soft,
// a landing or a bounce a low thud; the warm accent blooms with a soft glass swell. With narration keep them small (light ones drop out while
// the voice speaks). Add the sounds your story needs with the same palette words: references/sound.md.
// Types the pencil runtime emits: sketch, scribble, erase, flip, tap, tick, step, thud, swish, bloom, rim.
export default {
  name: 'One line: what this film sounds like (e.g. a pencil on paper in a quiet room: scratches, flips, one warm swell)',
  space: { size: 0.3, mix: 0.1 },
  ambience: { use: 'roomtone', bright: 420, gain: 0.16 },
  vary: 0.16,
  sounds: {
    sketch: { variants: [{ use: 'rustle', crinkle: 0.05, bright: 5200, gain: 0.3 }, { use: 'paper', dur: 0.4, bright: 5600, grain: 0.35, shape: 'arc', gain: 0.26 }, { use: 'rustle', crinkle: 0.08, bright: 4600, gain: 0.28 }] },
    scribble: { variants: [{ use: 'rustle', crinkle: 0.2, bright: 4200, gain: 0.3 }, { use: 'rustle', crinkle: 0.25, bright: 3800, gain: 0.28 }] },
    erase: { use: 'rustle', crinkle: 0.02, bright: 1800, gain: 0.32 },
    flip: { layers: [{ use: 'paper', dur: 0.12, bright: 3600, grain: 0.3, shape: 'down', gain: 0.32 }, { use: 'paper', dur: 0.1, bright: 4000, grain: 0.3, shape: 'down', gain: 0.26, delay: 0.09 }, { use: 'paper', dur: 0.1, bright: 3800, grain: 0.3, shape: 'down', gain: 0.22, delay: 0.17 }] },
    tap: { variants: [{ use: 'click', freq: 2200, decay: 180, gain: 0.3 }, { use: 'knock', freq: 900, gain: 0.25 }] },
    tick: { variants: [{ use: 'click', freq: 2600, decay: 200, gain: 0.22 }, { use: 'click', freq: 2400, decay: 190, gain: 0.2 }] },
    step: { variants: [{ use: 'thud', freq: 160, decay: 30, felt: 1200, body: 0.4, dur: 0.1, gain: 0.25 }, { use: 'thud', freq: 180, decay: 32, felt: 1300, body: 0.4, dur: 0.1, gain: 0.22 }] },
    thud: { variants: [{ use: 'thud', freq: 110, decay: 14, felt: 900, dur: 0.25, gain: 0.45 }, { use: 'thud', freq: 125, decay: 16, felt: 1000, dur: 0.25, gain: 0.42 }] },
    swish: { use: 'swish', from: 260, to: 900, color: 'air', shape: 'arc', gain: 0.16 },
    bloom: { use: 'glass', note: 'A5', dur: 2.2, decay: 1.4, gain: 0.3 },
    rim: { layers: [{ use: 'knock', freq: 700, gain: 0.35 }, { use: 'glass', note: 'E6', dur: 0.4, decay: 7, gain: 0.15 }] },
  },
  hit: 'flip',
  rise: null,
  logo: [{ use: 'glass', note: 'D6', dur: 1.6, gain: 0.4 }, { use: 'paper', dur: 0.3, bright: 4000, grain: 0.3, shape: 'arc', gain: 0.3, delay: 0.05 }],
};
