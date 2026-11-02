// Score (starting point for the drawn-world style): a small, curious band while the pen works (plucked notes walking, a soft pad) that opens up when the colour comes: strings and a
// melody arrive with the wash and stay while the world lives. Under a voice the pad, bass and pluck keep; the melody drops. Section names: open / story / turn / wash / live (or a promo's hook / build / drop / resolve).
// Change the key, the chords and the motif per film: references/music.md.
export default {
  name: 'One line: what this music should make people feel (e.g. curious pen work, then a town waking up in colour)',
  key: 'G major',
  human: 0.6,
  space: { size: 0.5, damp: 0.5, mix: 0.18 },
  chords: {
    open: ['G', 'Em', 'C', 'D'], hook: ['G', 'Em', 'C', 'D'],
    story: ['G', 'D', 'Em', 'Bm', 'C', 'G', 'Am', 'D'], build: ['G', 'D', 'Em', 'Bm', 'C', 'G', 'Am', 'D'],
    turn: ['Em', 'C', 'Am', 'B'], wash: ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'], drop: ['C', 'D', 'G', 'Em'],
    live: ['C', 'G', 'D', 'Em', 'C', 'G', 'D', 'G'], close: ['C', 'D', 'G', 'G'], resolve: ['C', 'D', 'G', 'G'],
  },
  motif: 'B5:1 D6:.5 E6:.5 D6:1 B5:1 | A5:1 G5:.5 A5:.5 B5:2',
  parts: [
    { name: 'pad', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 3, cut: 1500, attack: 0.8, gain: 0.07, width: 0.8, underVoice: 'keep' },
    { name: 'bass', synth: 'bass', play: 'bass', pattern: { default: 'x...x...', wash: 'x.x.x.x.', live: 'x.x.x.x.' }, octave: 2, gain: 0.11, underVoice: 'keep' },
    { name: 'pluck', synth: 'piano', play: 'arp', pattern: { default: ['x.x.x.x.', 'x..x.x..'], turn: 'x...x...', open: 'x...x...', live: ['x.xx.x.x', 'x.x.xx.x'] }, order: 'up', range: 2, octave: 4, gain: 0.09, underVoice: 'keep' },
    { name: 'melody', synth: 'piano', play: 'motif', gain: 0.08, in: ['open', 'hook', 'wash', 'drop', 'live', 'close', 'resolve'] },
    { name: 'swell', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 4, cut: 2600, attack: 1.2, gain: 0.08, in: ['wash', 'live', 'drop', 'resolve'] },
  ],
};
