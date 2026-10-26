// Sound design (starting point for the clipping-file commentary style): paper on a desk. Sheets land with a slap of paper, fly in on a short
// whoosh, the highlighter squeaks across a line, translation bars swipe on, tags pin with a dry tick, numbers roll on a fine ratchet, the brush
// wipe is a wet bristle drag, title cards hit with a low impact. A faint room tone sits under the whole film. Add the sounds your story needs with
// the same palette words: references/sound.md.
// Types the dossier runtime emits: whoosh (fly-ins, dissolves), brush (brush wipe), paper (a sheet lands), marker (highlighter, chart lines, rings),
// swipe (translation bar), pin (tags, callouts, bullets), tick (table rows), roll (a number rolling), impact (title-card lines).
export default {
  name: 'One line: what this film sounds like (e.g. a late-night desk of printouts: paper, a marker, a tense pulse under the voice)',
  space: { size: 0.25, mix: 0.1 },
  ambience: { use: 'roomtone', bright: 420, gain: 0.35 },
  vary: 0.08,
  sounds: {
    whoosh: { use: 'swish', from: 260, to: 2600, color: 'air' },
    brush: { layers: [{ use: 'swish', from: 180, to: 1400, color: 'cloth', shape: 'down' }, { use: 'rustle', crinkle: 0.4, bright: 1800, gain: 0.5 }] },
    paper: { variants: [{ use: 'paper', dur: 0.22, bright: 2600, grain: 0.5, shape: 'down' }, { use: 'paper', dur: 0.26, bright: 2300, grain: 0.6, shape: 'down' }] },
    marker: { use: 'crease', from: 1800, to: 3600 },
    swipe: { use: 'swish', from: 900, to: 3800, color: 'air', shape: 'down' },
    pin: { variants: [{ use: 'click', freq: 1500, decay: 120, gain: 0.55 }, { use: 'click', freq: 1300, decay: 110, gain: 0.55 }] },
    tick: { use: 'tick', freq: 2400 },
    roll: { use: 'film', rate: 30, bright: 2200, gain: 0.6 },
    impact: { layers: [{ use: 'impact', freq: 44, bright: 1800 }, { use: 'paper', dur: 0.12, bright: 2000, grain: 0.3, shape: 'down', gain: 0.5 }] },
  },
  hit: 'impact',
  rise: null,
  logo: [{ use: 'impact', freq: 40, bright: 1600, gain: 0.7 }],
};
