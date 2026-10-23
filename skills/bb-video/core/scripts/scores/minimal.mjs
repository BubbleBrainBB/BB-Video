// Example score: minimal electronic (tech / tools). Four-on-the-floor kick, off-beat hats, claps, off-beat bass, chord stabs; sidechain makes the pad "breathe" with the kick
export default {
  name: 'Minimal Electronic', bpm: 120, key: 'A minor', sidechain: true,
  chords: ['Am', 'F', 'C', 'G'],
  motif: 'A5:1 C6:.5 E6:.5 D6:1 C6:.5 B5:.5 | r:1 E5:1 G5:1 A5:1',
  parts: [
    { name: 'pad', synth: 'pad', play: 'chord', pattern: 'x', octave: 3, cut: 1100, gain: 0.2, from: 0 },
    { name: 'mid pad', synth: 'pad', play: 'chord', pattern: 'x', octave: 5, cut: 2800, gain: 0.08, from: 0 },
    { name: 'kick', synth: 'kick', pattern: 'x...x...x...x...', gain: 0.45, from: 1 },
    { name: 'offbeat hats', synth: 'hat', pattern: '..x...x...x...x.', gain: 0.15, from: 1 },
    { name: '16th hats', synth: 'hat', pattern: 'x.x.x.x.x.x.x.x.', gain: 0.1, from: 3 },
    { name: 'clap', synth: 'clap', pattern: '....x.......x...', gain: 0.42, from: 2 },
    { name: 'bassline', synth: 'bass', play: 'bass', pattern: 'x.x.x.x.', octave: 1, gain: 0.32, from: 2 },
    { name: 'chord stabs', synth: 'stab', play: 'chord', pattern: '..x...x.', octave: 5, gain: 0.3, from: 3 },
    { name: 'melody', synth: 'stab', play: 'motif', gain: 0.14, from: 3 },
  ],
};
