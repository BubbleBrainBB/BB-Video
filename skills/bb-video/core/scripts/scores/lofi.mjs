// Sample score: lazy lo-fi (content communities / reading / lifestyle). Electric-piano seventh chords, swung drums, a muffled snare, vinyl crackle, everything low-passed
export default {
  name: 'Lazy Lo-fi', bpm: 86, key: 'F major', swing: 0.62, lowpass: 5200, bed: 'crackle',
  chords: ['Gm7', 'C7', 'Fmaj7', 'Dm7'],
  motif: 'A5:.5 C6:.5 r:.5 A5:.5 G5:1 F5:1 | r:1 D5:.5 F5:.5 E5:2',
  parts: [
    { name: 'e-piano', synth: 'epiano', play: 'chord', pattern: 'x', octave: 4, gain: 0.22, from: 0 },
    { name: 'bass', synth: 'sub', play: 'bass', pattern: 'x...x...', offsets: [0, 7], octave: 1, len: 1.5, gain: 0.28, from: 0 },
    { name: 'kick', synth: 'kick', pattern: 'x.....x...x.....', tune: 50, len: 0.35, gain: 0.45, from: 1 },
    { name: 'snare', synth: 'snare', pattern: '....x.......x...', tone: 180, bright: 2200, gain: 0.32, from: 1 },
    { name: 'hats', synth: 'hat', pattern: 'x.x.x.x.x.x.x.x.', gain: 0.08, from: 1 },
    { name: 'e-piano melody', synth: 'epiano', play: 'motif', gain: 0.16, from: 2, octaveShift: 0 },
  ],
};
