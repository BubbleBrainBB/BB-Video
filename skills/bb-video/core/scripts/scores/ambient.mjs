// Sample score: ambient (art / photography / design). Slow, with space: piano arpeggios, a bell melody, long pads and strings, almost no drums
export default {
  name: 'Ambient', bpm: 82, key: 'D major',
  chords: [['Dmaj7', 2], ['A', 2], ['Bm7', 2], ['Gmaj7', 2]],
  motif: 'F#5:1.5 A5:.5 E5:2 r:1 D5:1 B4:1 C#5:1',
  parts: [
    { name: 'pad', synth: 'pad', play: 'chord', pattern: 'x', octave: 3, cut: 800, attack: 0.6, gain: 0.22, from: 0 },
    { name: 'strings', synth: 'strings', play: 'chord', pattern: 'x', octave: 5, cut: 3200, attack: 0.8, gain: 0.08, gainByEnergy: [0.7, 0.9, 1.1, 1.3], from: 0 },
    { name: 'bass', synth: 'sub', play: 'bass', pattern: 'x', octave: 1, gain: 0.22, from: 0 },
    { name: 'piano broken chords', synth: 'piano', play: 'arp', pattern: 'x...x...', order: 'updown', range: 2, octave: 4, len: 3, gain: 0.24, from: 0, to: 1 },
    { name: 'piano broken chords (dense)', synth: 'piano', play: 'arp', pattern: 'x.x.x.x.', order: 'updown', range: 2, octave: 4, len: 3, gain: 0.17, from: 2 },
    { name: 'bell melody', synth: 'bell', play: 'motif', gain: 0.16, from: 2, upAt: 3 },
    { name: 'shaker', synth: 'shaker', pattern: '..x...x.', gain: 0.12, from: 2 },
    { name: 'soft kick', synth: 'kick', pattern: 'x.......', tune: 42, len: 0.6, gain: 0.7, from: 3 },
  ],
};
