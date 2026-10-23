// Sample score: cinematic (launch events / major releases / enterprise products). String bed, spiccato eighths driving forward, brass, timpani; rolls added at energy 3
export default {
  name: '电影感', bpm: 92, key: 'D minor', endSynth: 'strings',
  chords: ['Dm', 'Bb', 'F', 'C'],
  motif: 'D5:1 F5:1 A5:2 G5:1 F5:.5 E5:.5 D5:2',
  parts: [
    { name: '弦乐铺底', synth: 'strings', play: 'chord', pattern: 'x', octave: 3, cut: 1600, attack: 0.5, gain: 0.3, gainByEnergy: [0.8, 0.9, 1, 1.1], from: 0 },
    { name: '低音', synth: 'sub', play: 'bass', pattern: 'x', octave: 1, gain: 0.2, from: 0 },
    { name: '跳弓', synth: 'spiccato', play: 'bass', pattern: 'xxxxxxxx', offsets: [0, 12], octave: 3, gain: 0.13, gainByEnergy: [0, 0.8, 1, 1.25], from: 1 },
    { name: '铜管', synth: 'brass', play: 'chord', pattern: 'x', octave: 3, gain: 0.13, gainByEnergy: [0, 0, 1, 1.3], from: 2 },
    { name: '定音鼓', synth: 'tom', pattern: 'x.......x.......', note: 38, len: 1, gain: 0.6, from: 2 },
    { name: '滚奏', synth: 'tom', pattern: '.xxx.xxx.xxx.xxx', note: 45, len: 0.35, gain: 0.16, from: 3 },
    { name: '军鼓', synth: 'snare', pattern: '....x.......x...', tone: 160, bright: 2600, gain: 0.4, from: 3 },
    { name: '铜管旋律', synth: 'brass', play: 'motif', gain: 0.14, from: 3 },
  ],
};
