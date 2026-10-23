// Score (starting point for the shadow-puppetry style): folk music of the puppet stage — pentatonic, plucked strings (pipa / guzheng), bowed strings (erhu) as the bed, drums and gong on sections, a clapper keeping time. Usage in references/music.md; change key and tempo to fit the content.
// Structure: chords / pattern can each be written per section strength (0–3) or per section name; human = human feel (folk music should be a bit looser).
export default {
  name: 'One line: what this music should make people feel (e.g. a storyteller slowly telling an old tale)',
  key: 'D minor',
  human: 0.8,
  space: { size: 0.65, damp: 0.5, mix: 0.9 },
  chords: { 1: ['Dm', 'F', 'C', 'Dm'], 2: ['Dm', 'Bb', 'C', 'Am'], 3: ['Bb', 'C', 'Dm', 'Am'] },
  motif: 'A5:1 C6:.5 D6:.5 C6:1 A5:1 | G5:.5 A5:.5 F5:1 D5:2',
  parts: [
    { name: 'bowed-string pad', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 3, cut: 1800, gain: 0.12, from: 0 },
    { name: 'pluck', synth: 'pluck', play: 'arp', pattern: { 0: 'x...x.x.', 1: 'x.x.xx.x', 3: ['x.x.xx.x', 'xx.x.xx.'] }, octave: 4, bright: 0.7, gain: 0.13, from: 0 },
    { name: 'bass', synth: 'sub', play: 'bass', pattern: 'x.......', octave: 2, gain: 0.14, from: 1 },
    { name: 'clapper', synth: 'woodblock', pattern: { 1: 'x...x...', 2: 'x.x.x.x.', 3: ['x.x.x.xx', 'x.xxx.x.'] }, gain: 0.12, from: 1 },
    { name: 'tanggu drum', synth: 'tom', pattern: { 2: 'x.......x...x...', 3: ['x...x...x.x.x...', 'x.x.x...x...xxxx'] }, note: 43, gain: 0.09, from: 2 },
    { name: 'gong', synth: 'gong', pattern: { 3: 'x...............' }, gain: 0.12, from: 3 },
    { name: 'motif', synth: 'pluck', play: 'motif', gain: 0.14, from: 1 },
  ],
};
