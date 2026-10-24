// Sound design (starting point for the film-room style): a quiet room with a tape deck. The analyst's marker squeaks as it draws, the tape
// stops with a short pitch-down, rewinds with a whirr, cards slide in with a soft whoosh. Add what the story needs (a whistle, a swish of the
// net, a crowd lift) with the palette words in references/sound.md. The footage's own sound is not used (the analyst talks over silence).
// Types the filmroom runtime emits: cut (hard cuts), logo (the open / the end), whoosh (cards), pen (every stroke), stop (the tape pauses),
// rewind (the tape runs back), tick (numbers).
export default {
  name: 'One line: what this film sounds like (e.g. a quiet film room, a marker on glass, a tape deck)',
  space: { size: 0.25, mix: 0.1 },
  ambience: { use: 'roomtone', bright: 380, gain: 0.5 },
  vary: 0.08,
  sounds: {
    cut: { use: 'click', freq: 1400, decay: 220, gain: 0.35 },
    whoosh: { use: 'swish', color: 'air', from: 300, to: 2600, dur: 0.45, gain: 0.7 },
    pen: { variants: [{ use: 'swish', color: 'air', from: 2600, to: 3800, q: 0.6, dur: 0.22, shape: 'arc', gain: 0.45 }, { use: 'swish', color: 'air', from: 3000, to: 4400, q: 0.6, dur: 0.18, shape: 'arc', gain: 0.4 }] },
    stop: { use: 'whir', freq: 520, to: 90, dur: 0.28, gain: 0.55 },
    rewind: { use: 'whir', freq: 900, to: 1500, gain: 0.35 },
    tick: { use: 'tick', freq: 2400 },
    impact: { use: 'impact', freq: 44, bright: 1800 },
  },
  hit: 'impact',
  rise: 'riser',
  logo: [{ use: 'boom', freq: 38, gain: 0.7 }, { use: 'swish', color: 'air', from: 200, to: 5000, dur: 0.6, shape: 'up', gain: 0.5 }],
};
