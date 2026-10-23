// Score (starting point for the constructivism / Bauhaus style): machines and marches — short brass chords, snare rolls, mechanical piano and pizzicato figures, a steady bass. How to write it: references/music.md.
// Structure: chords / pattern are written per section intensity (0–3); human is small (machines are precise). With narration, drums, brass and motif drop out while someone speaks (only the pad stays).
export default {
  name: 'One line: what this music should make people feel (e.g. to the beat of a factory, a new age gets to work)',
  key: 'C minor',
  human: 0.25,
  space: { size: 0.35, damp: 0.6, mix: 0.5 },
  chords: { 1: ['Cm', 'Ab', 'Eb', 'Bb'], 2: ['Cm', 'Ab', 'Bb', 'G'], 3: ['Cm', 'Fm', 'Ab', 'G'] },
  motif: 'G5:.5 G5:.5 C6:1 Bb5:.5 Ab5:.5 G5:1 | Eb5:.5 F5:.5 G5:1 C5:2',
  parts: [
    { name: 'string pad', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 3, cut: 2000, gain: 0.1, from: 0 },
    { name: 'machine ostinato', synth: 'spiccato', play: 'arp', pattern: { 0: 'x.x.x.x.', 1: 'xxx.xxx.', 3: ['xxxxxxxx', 'xx.xxx.x'] }, octave: 4, gain: 0.11, from: 0 },
    { name: 'bass', synth: 'bass', play: 'bass', pattern: { 1: 'x...x...', 2: 'x.x.x.x.' }, octave: 2, gain: 0.15, from: 1 },
    { name: 'kick', synth: 'kick', pattern: { 1: 'x.......x.......', 2: 'x.......x...x...', 3: 'x...x...x...x...' }, gain: 0.2, from: 1 },
    { name: 'snare', synth: 'snare', pattern: { 2: '....x.......x...', 3: ['....x.......x.xx', '..x.x...x.x.xxxx'] }, gain: 0.12, from: 2 },
    { name: 'brass', synth: 'brass', play: 'chord', pattern: { 2: 'x.......', 3: 'x...x.x.' }, octave: 4, gain: 0.1, from: 2 },
    { name: 'motif', synth: 'brass', play: 'motif', gain: 0.12, from: 2 },
  ],
};
