// Music (starting point when the whiteboard style makes a promo): light plucked chords, claps, shaker — like drawing while talking. How to write it: promo/references/music.md; rewrite it for the product.
// Structure: chords / pattern can have one set per section energy (0–3) or section name (hook / build / burst / drop / resolve); human = human feel (0 machine … 1 very loose).
export default {
  name: 'One line: what this music should make people feel (e.g. a bright meeting room, someone drawing an idea clearly on the whiteboard)',
  key: 'C major',
  human: 0.7,
  chords: { 1: ['C', 'Am', 'F', 'G'], 2: ['F', 'G', 'C', 'Am'], 3: ['Am', 'F', 'C', 'G'] },
  motif: 'E5:.5 G5:.5 A5:1 G5:.5 E5:.5 D5:1 | C5:.5 D5:.5 E5:1 G5:2',
  parts: [
    { name: 'pluck chords', synth: 'pluck', play: 'chord', pattern: { 0: 'x...x...', 1: 'x.x.x.x.', 3: ['x.x.x.xx', 'x.xx.x.x'] }, octave: 4, gain: 0.14, from: 0 },
    { name: 'bassline', synth: 'bass', play: 'bass', pattern: { 0: 'x.......', 1: 'x...x.x.' }, offsets: [0, 0, 7], octave: 2, gain: 0.14, from: 0 },
    { name: 'shaker', synth: 'shaker', pattern: { 1: 'x.x.x.x.', 2: 'xxxxxxxx' }, gain: 0.05, from: 1 },
    { name: 'clap', synth: 'clap', pattern: '....x.......x...', gain: 0.12, from: 2 },
    { name: 'kick', synth: 'kick', pattern: { 2: 'x.......x.......', 3: 'x.......x.x.....' }, gain: 0.2, from: 2 },
    { name: 'glockenspiel motif', synth: 'bell', play: 'motif', gain: 0.1, from: 2 },
  ],
};
