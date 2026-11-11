// Score (starting point for the supercut style): drums and bass, almost no melody. The tempo is fixed first (86–92 BPM, a half-time feel:
// kick on one, snare on three, hats in sixteenths) and every cut is taken from it — shots on eighth notes, bursts on thirty-second notes.
// The picture's parts name the sections (the runtime registers them): run = full drums + bass + one short stab; hold = the drums drop out,
// pad and sub only; grid = kick and hats, no snare; graphic = pad, sub and a sparse hat; cards = almost nothing (each card has its own dry
// hit in sound.js). A punch word stops the music the beat before and hits on the word (the runtime's musicCue 'stop').
// Ordinary cuts get no accent (react.cut: false): the drums already carry them. F minor; keep sound.js in the same key.
export default {
  name: 'One line: what this film should make people feel (e.g. fast and sure-footed — a head nodding to dry drums while the pictures fly)',
  key: 'F minor',
  human: 0.35,
  swing: 0.5,
  sidechain: true,
  fill: false,                    // no drum fills: a section change is a cut, and the punch word's stop does the lifting
  swell: false,
  echo: { beats: 0.75, feedback: 0.25, mix: 0.5 },
  space: { size: 0.24, damp: 0.5, mix: 0.12 },
  react: { cut: false },
  chords: {
    run: [['Fm', 2], ['Db', 1], ['Eb', 1]],
    grid: [['Db', 2], ['Eb', 2]],
    hold: [['Fm', 2], ['Ab', 2]],
    graphic: [['Db', 2], ['Fm', 2]],
    cards: [['Fm', 4]],
  },
  motif: 'r:2.5 C5:.25 Eb5:.25 r:1 | r:2.5 Ab4:.25 C5:.25 r:1',     // the "one short stab": two notes late in the bar, nothing else
  parts: [
    { name: 'kick', synth: 'kick', pattern: { run: ['x.....x...x.....', 'x.....x..x....x.'], grid: 'x.........x.....' }, tune: 46, gain: 0.34, in: ['run', 'grid'] },
    { name: 'snare', synth: 'snare', pattern: { run: ['........x.......', '........x......x'] }, tone: 0.5, gain: 0.3, pan: 0.08, in: ['run'] },
    { name: 'hats', synth: 'hat', pattern: { run: ['x.xxx.xxx.xxx.xx', 'x.xxx.xxxxx.x.xx'], grid: 'x.x.x.x.x.x.x.x.', graphic: 'x...x...x...x...' }, gain: 0.14, pan: 0.3, in: ['run', 'grid', 'graphic'] },
    { name: 'open hat', synth: 'openhat', pattern: { run: '......x.......x.' }, gain: 0.1, pan: -0.35, in: ['run'] },
    { name: 'sub bass', synth: 'sub808', play: 'bass', pattern: { run: ['x.....x...x.....', 'x.....x..x....x.'], grid: 'x.........x.....' }, octave: 1, gain: 0.34, in: ['run', 'grid'] },
    { name: 'mid bass', synth: 'bass', play: 'bass', pattern: { run: ['x.....x...x.....', 'x.....x..x....x.'], grid: 'x.........x.....' }, octave: 2, cut: 800, gain: 0.15, in: ['run', 'grid'] },   // the bass a phone speaker can play
    { name: 'stab', synth: 'stab', play: 'motif', gain: 0.2, pan: -0.2, width: 0.6, echo: 0.25, in: ['run'] },
    { name: 'pad', synth: 'pad', play: 'chord', pattern: 'x', octave: 3, cut: 1000, attack: 0.5, gain: 0.15, width: 1, in: ['hold', 'graphic', 'cards'] },
    { name: 'air', synth: 'pad', play: 'chord', pattern: 'x', octave: 5, cut: 2600, attack: 0.8, gain: 0.11, width: 1, in: ['hold', 'graphic', 'cards'] },
    { name: 'sub', synth: 'sub', play: 'bass', pattern: 'x-------', octave: 1, gain: 0.22, in: ['hold', 'graphic', 'cards'] },
  ],
};
