// Sample score: cinematic (launch events / major releases / enterprise products). String bed, spiccato eighths driving forward, brass, timpani; rolls added at energy 3
export default {
  name: 'Cinematic', bpm: 92, key: 'D minor', endSynth: 'strings',
  chords: ['Dm', 'Bb', 'F', 'C'],
  motif: 'D5:1 F5:1 A5:2 G5:1 F5:.5 E5:.5 D5:2',
  parts: [
    { name: 'string pad', synth: 'strings', play: 'chord', pattern: 'x', octave: 3, cut: 1600, attack: 0.5, gain: 0.3, gainByEnergy: [0.8, 0.9, 1, 1.1], from: 0 },
    { name: 'bass', synth: 'sub', play: 'bass', pattern: 'x', octave: 1, gain: 0.2, from: 0 },
    { name: 'spiccato', synth: 'spiccato', play: 'bass', pattern: 'xxxxxxxx', offsets: [0, 12], octave: 3, gain: 0.13, gainByEnergy: [0, 0.8, 1, 1.25], from: 1 },
    { name: 'brass', synth: 'brass', play: 'chord', pattern: 'x', octave: 3, gain: 0.13, gainByEnergy: [0, 0, 1, 1.3], from: 2 },
    { name: 'timpani', synth: 'tom', pattern: 'x.......x.......', note: 38, len: 1, gain: 0.6, from: 2 },
    { name: 'roll', synth: 'tom', pattern: '.xxx.xxx.xxx.xxx', note: 45, len: 0.35, gain: 0.16, from: 3 },
    { name: 'snare', synth: 'snare', pattern: '....x.......x...', tone: 160, bright: 2600, gain: 0.4, from: 3 },
    { name: 'brass melody', synth: 'brass', play: 'motif', gain: 0.14, from: 3 },
  ],
};
