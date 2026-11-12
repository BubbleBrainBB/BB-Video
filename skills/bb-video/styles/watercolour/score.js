// Score (starting point for the watercolour style): unhurried and transparent, like the paint — a felt piano that leaves room, a soft string
// pad under it, a low round bass on the bar, a harp-like pluck when something is being painted in; when colour is washed out (the turn) it thins to
// the pad and single piano notes; the close opens to a warm chord. Under a voice the pad, bass and pluck keep, the melody drops. Section names:
// open / story / turn / close (or a promo's hook / build / drop / resolve). Change the key, the chords and the motif per film: references/music.md.
export default {
  name: 'One line: what this music should make people feel (e.g. calm and clear, then a quiet worry, then some light)',
  key: 'D major',
  human: 0.65,
  space: { size: 0.6, damp: 0.5, mix: 0.2 },
  chords: {
    open: ['D', 'Bm', 'G', 'A'], hook: ['D', 'Bm', 'G', 'A'],
    story: ['D', 'A', 'Bm', 'F#m', 'G', 'D', 'Em', 'A'], build: ['D', 'A', 'Bm', 'F#m', 'G', 'D', 'Em', 'A'],
    turn: ['Bm', 'G', 'Em', 'F#m'], drop: ['G', 'A', 'D', 'Bm'],
    close: ['G', 'A', 'D', 'Dsus4'], resolve: ['G', 'A', 'D', 'Dsus4'],
  },
  motif: 'F#5:1 A5:.5 B5:.5 A5:2 | E5:1 F#5:.5 D5:.5 E5:2',
  parts: [
    { name: 'pad', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 3, cut: 1400, attack: 0.9, gain: 0.07, width: 0.85, underVoice: 'keep' },
    { name: 'bass', synth: 'bass', play: 'bass', pattern: { default: 'x.......', story: 'x...x...', build: 'x...x...' }, octave: 2, gain: 0.1, underVoice: 'keep' },
    { name: 'pluck', synth: 'pluck', play: 'arp', bright: 0.6, pattern: { default: ['x..x..x.', 'x...x.x.'], turn: 'x.......', open: 'x...x...', hook: 'x...x...' }, order: 'updown', range: 2, octave: 4, gain: 0.08, underVoice: 'keep' },
    { name: 'piano', synth: 'piano', play: 'motif', gain: 0.09, in: ['open', 'hook', 'turn', 'close', 'resolve', 'drop'] },
  ],
};
