// Score: toys on a desk — quiet, precise, a little playful. Plucked arpeggios + bass + very light drums; fast-cut sections add hi-hat and a glockenspiel motif (change key and tempo for the product, references/music.md)
export default {
  name: '桌上的玩具：安静、精确，一点点俏皮',
  key: 'D minor',
  human: 0.4,
  chords: { 1: ['Dm9', 'Bbmaj7', 'Fmaj7', 'C'], 2: ['Bbmaj7', 'C', 'Dm9', 'Am7'], 3: ['Dm9', 'Bbmaj7', 'Gm7', 'A'] },
  motif: 'A5:.5 D6:.5 F6:1 E6:.5 D6:.5 | C6:1 A5:1 r:2',
  parts: [
    { name: '铺底', synth: 'pad', play: 'chord', pattern: 'x', octave: 3, cut: 1000, gain: 0.17, from: 0 },
    { name: '拨弦', synth: 'pluck', play: 'arp', pattern: { 1: 'x.x.x.x.', 2: 'xxx.xxx.', 3: 'xxxxxxxx' }, order: 'up', octave: 4, gain: 0.15, from: 0 },
    { name: '低音', synth: 'sub', play: 'bass', pattern: { 1: 'x.......', 2: 'x...x...', 3: 'x..x..x.' }, octave: 1, gain: 0.24, from: 1 },
    { name: '木鱼', synth: 'woodblock', pattern: { 1: 'x.......x.......', 2: 'x...x.......x...', 3: 'x...x...x..x....' }, gain: 0.14, from: 1 },
    { name: '底鼓', synth: 'kick', pattern: { 2: 'x.......x.......', 3: 'x...x...x...x...' }, gain: 0.38, from: 2 },
    { name: '踩镲', synth: 'hat', pattern: { 2: '..x...x...x...x.', 3: 'x.x.x.x.x.x.x.x.' }, gain: 0.1, from: 2 },
    { name: '钟琴', synth: 'bell', play: 'motif', gain: 0.12, from: 2 },
  ],
};
