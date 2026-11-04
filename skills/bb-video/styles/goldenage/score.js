// Score (starting point for the golden-age cartoon style): a small hot studio band that follows the picture. Plucked banjo-and-bass two-beat, muted brass and a xylophone-bright bell on the melody;
// a soft waltz-feel lullaby for the quiet sections, a galop when things run. Under a voice the bass and pluck keep; the melody drops. Section names: open / story / build / chase / drop / quiet / resolve. Real silence (the pause before the hit) comes from G.pause in the picture.
// Change the key, the chords and the motif per film (never quote a real cartoon's cue): references/music.md.
export default {
  name: 'One line: what this music should make people feel (e.g. a sleepy city lullaby that bolts into a galop)',
  key: 'F major',
  swing: 0.6,
  human: 0.5,
  space: { size: 0.32, damp: 0.6, mix: 0.12 },
  chords: {
    open: ['F', 'Gm7', 'C7', 'F'], hook: ['F', 'Gm7', 'C7', 'F'],
    story: ['F', 'Dm', 'Gm7', 'C7', 'F', 'Bb', 'C7', 'F'], build: ['F', 'D7', 'Gm', 'C7'],
    chase: ['Am', 'E7', 'Am', 'E7', 'Dm', 'Am', 'E7', 'Am'], burst: ['Am', 'E7', 'Am', 'E7', 'Dm', 'Am', 'E7', 'Am'],
    drop: ['F', 'D7', 'Gm', 'C7'], quiet: ['F', 'C7', 'F', 'Bb'], resolve: ['Bb', 'C7', 'F', 'F'],
  },
  motif: 'C6:.5 F6:.5 A6:1 C7:.5 A6:.5 F6:1 | D6:.5 G6:.5 Bb6:1 D7:.5 Bb6:.5 G6:1',
  parts: [
    { name: 'bass', synth: 'bass', play: 'bass', pattern: { default: 'x...x...', quiet: 'x.......', chase: 'x.x.x.x.', burst: 'x.x.x.x.' }, offsets: [0, 7], octave: 2, cut: 700, gain: 0.09, underVoice: 'keep' },
    { name: 'banjo', synth: 'pluck', play: 'chord', pattern: { default: '..x...x.', quiet: '..x.x...', chase: '.x.x.x.x', burst: '.x.x.x.x' }, octave: 4, bright: 0.75, gain: 0.08, underVoice: 'keep' },
    { name: 'pad', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 3, cut: 1200, attack: 0.6, gain: 0.05, in: ['quiet', 'open', 'story', 'resolve'], underVoice: 'keep' },
    { name: 'melody', synth: 'bell', play: 'motif', gain: 0.1, in: ['open', 'hook', 'quiet', 'chase', 'burst', 'drop', 'resolve'] },
    { name: 'horns', synth: 'brass', play: 'motif', octaveShift: -1, cut: 1800, gain: 0.07, in: ['chase', 'burst', 'drop'] },
    { name: 'block', synth: 'woodblock', pattern: { default: '....x...', chase: 'x.x.x.x.', burst: 'x.x.x.x.', quiet: '........' }, gain: 0.2 },
    { name: 'snare', synth: 'snare', pattern: { default: '....x.......x...', chase: '..x...x...x...x.', burst: '..x...x...x...x.', quiet: '................' }, tone: 200, gain: 0.08 },
  ],
};
