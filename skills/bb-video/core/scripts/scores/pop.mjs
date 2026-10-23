// Sample score: bright pop (consumer apps / social / e-commerce). Major key, plucked off-beat chords, octave-jumping bass, snare, syncopated kick
export default {
  name: '明快流行', bpm: 124, key: 'C major', sidechain: true,
  chords: ['C', 'G', 'Am', 'F'],
  motif: 'E5:.5 G5:.5 C6:1 B5:.5 G5:.5 A5:1 r:.5 G5:.5 E5:.5 D5:.5 C5:2',
  parts: [
    { name: '铺底', synth: 'pad', play: 'chord', pattern: 'x', octave: 4, cut: 1800, gain: 0.12, from: 0 },
    { name: '拨弦和弦', synth: 'pluck', play: 'chord', pattern: '.x.x.x.x', octave: 5, bright: 0.7, len: 0.35, gain: 0.2, from: 1 },
    { name: '底鼓', synth: 'kick', pattern: 'x.......x.......', tune: 52, gain: 0.58, from: 1 },
    { name: '切分底鼓', synth: 'kick', pattern: '......x.........', tune: 52, gain: 0.5, from: 2 },
    { name: '拍手', synth: 'clap', pattern: '....x.......x...', gain: 0.4, from: 1, to: 1 },
    { name: '军鼓', synth: 'snare', pattern: '....x.......x...', gain: 0.4, from: 2 },
    { name: '踩镲', synth: 'hat', pattern: 'x.x.x.x.x.x.x.x.', gain: 0.1, from: 1 },
    { name: '贝斯', synth: 'bass', play: 'bass', pattern: 'x.x.x.x.', offsets: [0, 12], octave: 1, gain: 0.3, from: 2 },
    { name: '拨弦旋律', synth: 'pluck', play: 'motif', bright: 0.85, gain: 0.17, from: 2, upAt: 3 },
  ],
};
