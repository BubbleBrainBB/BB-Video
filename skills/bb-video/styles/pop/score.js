// Score (starting point for pop style): a 60s pop / surf-rock feel — brass stabs, bouncing bass, claps on 2 and 4. How to write it: references/music.md; rewrite it for the product.
// Structure: chords / pattern can each have one version per section intensity (0–3) or section name (hook / build / burst / drop / resolve); human = human feel (0 machine … 1 very loose).
export default {
  name: 'One line: what this music should make people feel',
  key: 'C major',
  swing: 0.5,
  human: 0.65,
  chords: { 1: ['C', 'Am', 'F', 'G'], 2: ['Am', 'F', 'C', 'G'], 3: ['F', 'G', 'Em', 'Am'] },
  motif: 'E5:.5 G5:.5 C6:1 G5:.5 E5:.5 | D5:.5 E5:.5 G5:1 r:1',
  parts: [
    { name: 'bassline', synth: 'bass', play: 'bass', pattern: { 0: 'x.......', 1: 'x...x.x.', 2: ['x.xxx.x.', 'x.x.x.xx'], 3: ['x.xxx.x.', 'x.x.xxxx'] }, offsets: [0, 12, 7, 12], octave: 2, gain: 0.16, from: 0 },
    { name: 'brass stabs', synth: 'stab', play: 'chord', pattern: { 1: '..x...x.', 3: ['.xx..x.x', '..x..xx.'] }, octave: 4, gain: 0.16, from: 1 },
    { name: 'pluck', synth: 'pluck', play: 'arp', pattern: { 1: 'x.x.x.x.', 2: ['xxxxxxxx', 'x.xxx.xx'] }, order: 'up', range: 1, octave: 5, bright: 0.6, gain: 0.12, from: 1 },
    { name: 'kick', synth: 'kick', pattern: { 2: ['x...x...x...x...', 'x...x...x.x.....'], 3: ['x...x...x...x...', 'x...x...x..xx...'] }, gain: 0.4, from: 2 },
    { name: 'clap', synth: 'clap', pattern: '....x.......x...', gain: 0.3, from: 2 },
    { name: 'hats', synth: 'hat', pattern: { 2: ['x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.xxx.'], 3: 'xxx.xxx.xxx.xxx.' }, gain: 0.08, from: 2 },
    { name: 'bell motif', synth: 'bell', play: 'motif', gain: 0.14, from: 2, upAt: 3 },
  ],
};
