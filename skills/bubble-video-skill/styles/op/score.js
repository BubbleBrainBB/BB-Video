// Music (starting point for the op-art style): minimalism — repeating broken chords, two identical figures looping at different lengths and slowly drifting apart (phase music), a steady pulse. How to write it: references/music.md; rewrite it for the product.
// Structure: chords / pattern can each be written per section intensity (0–3) or section name (hook / build / burst / drop / resolve); human = human feel (0 machine … 1 very loose).
export default {
  name: '一句话：这段音乐要让人感觉到什么',
  key: 'A minor',
  swing: 0.5,
  human: 0.3,          // op art is precise: a little less human feel
  chords: { 1: ['Am', 'F', 'C', 'G'], 2: ['Am', 'C', 'F', 'G'], 3: ['F', 'G', 'Am', 'Em'] },
  motif: 'A5:.5 C6:.5 E6:.5 C6:.5 D6:.5 E6:.5 G6:1 | E6:.5 D6:.5 C6:.5 A5:.5 G5:1 r:1',
  parts: [
    { name: '铺底', synth: 'pad', play: 'chord', pattern: 'x', octave: 3, cut: 800, attack: 0.5, gain: 0.12, from: 0 },
    { name: '分解和弦 A', synth: 'pluck', play: 'arp', pattern: { 0: 'x.x.x.x.x.x.x.x.', 2: 'xxxxxxxxxxxxxxxx' }, order: 'up', range: 2, octave: 4, bright: 0.5, gain: 0.12, from: 0 },
    { name: '分解和弦 B（错开）', synth: 'bell', play: 'arp', pattern: { 1: 'x.xx.xx.xx.xx.x.', 3: ['x.xx.xx.xx.xx.x.', '.xx.xx.xx.xx.xx.'] }, order: 'updown', range: 1, octave: 5, gain: 0.07, from: 1 },
    { name: '低音脉冲', synth: 'sub', play: 'bass', pattern: { 1: 'x...x...x...x...', 2: 'x.x.x.x.x.x.x.x.' }, octave: 1, gain: 0.18, from: 1 },
    { name: '底鼓', synth: 'kick', pattern: { 2: 'x...x...x...x...', 3: ['x...x...x...x...', 'x...x...x...x.x.'] }, tune: 50, gain: 0.32, from: 2 },
    { name: '踩镲', synth: 'hat', pattern: { 2: '..x...x...x...x.', 3: '.xx..xx..xx..xx.' }, gain: 0.07, from: 2 },
    { name: '动机', synth: 'epiano', play: 'motif', gain: 0.12, from: 2, upAt: 3 },
  ],
};
