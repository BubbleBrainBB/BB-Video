// Music (starting point when ink makes a promo): pentatonic — a plucked motif (like a guzheng), long string pads, distant drums. How to write it: promo/references/music.md; rewrite it for the product.
// Structure: chords / pattern can each be written per section intensity (0–3) or section name (hook / build / burst / drop / resolve); human = human feel (0 machine … 1 very loose).
export default {
  name: '一句话：这段音乐要让人感觉到什么（例：清晨的书房，画卷慢慢展开）',
  key: 'D minor',
  human: 0.9,          // the feel of free-tempo sanban (散板): loosest
  chords: { 1: ['Dm', 'F', 'C', 'Am'], 2: ['F', 'C', 'Dm', 'Am'], 3: ['Bb', 'C', 'Dm', 'Am'] },
  motif: 'A5:1 D6:.5 C6:.5 A5:1 G5:1 | F5:.5 G5:.5 A5:1 D5:2',
  fill: 'toms',
  parts: [
    { name: '弦乐铺底', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 3, gain: 0.12, from: 0 },
    { name: '拨弦（古筝）', synth: 'pluck', play: 'arp', pattern: { 0: 'x...x.x.', 1: 'x.x.xx.x', 3: ['x.x.xx.x', 'xx.x.xx.'] }, octave: 4, gain: 0.12, from: 0 },
    { name: '低音', synth: 'sub', play: 'bass', pattern: 'x.......', octave: 2, gain: 0.14, from: 1 },
    { name: '远鼓', synth: 'tom', pattern: { 2: 'x.......x...x...', 3: 'x...x...x.x.x...' }, gain: 0.06, from: 2 },
    { name: '动机', synth: 'pluck', play: 'motif', gain: 0.14, from: 1 },
  ],
};
