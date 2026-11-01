// Score (starting point for the pencil-test animation style): an intimate felt piano over soft strings — the sound of a drawing room late at
// night. A slow piano figure walks under the drawings, a string pad holds the harmony, a low cello-like bass breathes on the downbeats; at the
// turn the piano thins to single notes, at the peak the strings open (the moment the warm accent blooms); the close falls
// back to the piano alone. Under a voice the pad, bass and piano keep; the melody drops. Patterns are written for any section; the names the
// starters use (open / story / turn / peak / close, or a promo's hook / build / drop / resolve) only change the density. Change the key, the chords
// and the motif per film: references/music.md.
export default {
  name: 'One line: what this music should make people feel (e.g. a sketchbook at night: quiet, close, then a swell of feeling)',
  key: 'D major',
  human: 0.6,
  space: { size: 0.55, damp: 0.5, mix: 0.2 },
  chords: {
    open: ['D', 'Bm', 'G', 'A'], hook: ['D', 'Bm', 'G', 'A'],
    story: ['D', 'A', 'Bm', 'F#m', 'G', 'D', 'Em', 'A'], build: ['D', 'A', 'Bm', 'F#m', 'G', 'D', 'Em', 'A'],
    turn: ['Bm', 'G', 'Em', 'F#'], peak: ['G', 'A', 'D', 'Bm', 'G', 'A', 'D', 'D'], drop: ['G', 'A', 'D', 'Bm'],
    close: ['G', 'A', 'Bm', 'Dsus2'], resolve: ['G', 'A', 'Bm', 'Dsus2'],
  },
  motif: 'F#5:1 A5:.5 B5:.5 A5:1 F#5:1 | E5:1 D5:.5 E5:.5 F#5:2',
  parts: [
    { name: 'pad', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 3, cut: 1500, attack: 0.9, gain: 0.07, width: 0.8, underVoice: 'keep' },
    { name: 'bass', synth: 'bass', play: 'bass', pattern: { default: 'x.......', peak: 'x...x...', drop: 'x...x...' }, octave: 2, gain: 0.12, underVoice: 'keep' },
    { name: 'piano', synth: 'piano', play: 'arp', pattern: { default: ['x..x..x.', 'x..x.x..'], turn: 'x.......', open: 'x...x...', close: 'x...x...' }, order: 'up', range: 2, octave: 4, gain: 0.1, underVoice: 'keep' },
    { name: 'melody', synth: 'piano', play: 'motif', gain: 0.08, in: ['open', 'hook', 'peak', 'drop', 'close', 'resolve'] },
    { name: 'swell', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 4, cut: 2400, attack: 1.4, gain: 0.06, in: ['peak', 'drop'] },
  ],
};
