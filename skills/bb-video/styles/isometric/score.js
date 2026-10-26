// Score (starting point for the isometric style): a busy little town seen from above — marimba-like plucks running in steady eighths
// (everything keeps moving), a soft bass, a woodblock ticking like machinery, a glockenspiel motif when the whole system comes together.
// Major key, light and curious; under a voiceover it stays a bed (drums and melody drop out while someone speaks). Change key, tempo and
// motif for each film: references/music.md.
export default {
  name: 'A little town at work: steady, curious, friendly',
  key: 'F major',
  human: 0.35,
  space: { size: 0.35, damp: 0.5, mix: 0.16 },
  chords: { 0: ['Fmaj7', 'Dm7'], 1: ['Fmaj7', 'Am7', 'Bbmaj7', 'C'], 2: ['Bbmaj7', 'C', 'Am7', 'Dm7'], 3: ['Fmaj7', 'C', 'Dm7', 'Bbmaj7'] },
  motif: 'C6:.5 F6:.5 A6:.5 G6:.5 F6:1 C6:1 | D6:.5 F6:.5 G6:1 A6:2',
  parts: [
    { name: 'pad', synth: 'pad', play: 'chord', pattern: 'x-------', octave: 3, cut: 1300, attack: 0.3, gain: 0.08, from: 0, underVoice: 'keep' },
    { name: 'pluck', synth: 'pluck', play: 'arp', pattern: { 0: 'x...x...', 1: 'x.x.x.x.', 2: 'xxx.xxx.', 3: 'xxxxxxxx' }, order: 'updown', octave: 4, gain: 0.12, from: 0, underVoice: 'keep' },
    { name: 'bass', synth: 'sub', play: 'bass', pattern: { 1: 'x.......', 2: 'x...x...', 3: 'x..x..x.' }, octave: 1, gain: 0.2, from: 1, underVoice: 'keep' },
    { name: 'woodblock', synth: 'woodblock', pattern: { 1: 'x.......x.......', 2: 'x...x...x...x...', 3: 'x.x.x...x.x.x...' }, gain: 0.1, from: 1 },
    { name: 'shaker', synth: 'shaker', pattern: { 2: '..x...x...x...x.', 3: 'x.x.x.x.x.x.x.x.' }, gain: 0.06, from: 2, pan: 0.2 },
    { name: 'kick', synth: 'kick', pattern: { 3: 'x.......x.......' }, gain: 0.2, from: 3 },
    { name: 'glockenspiel', synth: 'bell', play: 'motif', gain: 0.1, from: 3, pan: -0.15 },
  ],
};
