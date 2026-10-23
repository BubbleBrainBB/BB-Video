// Score (starting point for a riso promo): lo-fi — electric-piano seventh chords, warm bass, light drums, a little noise floor. How to write it: promo/references/music.md; rewrite it for the product.
// Structure: chords / pattern can each have one version per section intensity (0–3) or section name (hook / build / burst / drop / resolve); human = human feel (0 machine … 1 very loose).
export default {
  name: 'One line: what this music should make people feel (e.g. a small print shop in the afternoon, sheets coming off one by one)',
  key: 'F major',
  swing: 0.56,
  human: 0.75,
  chords: { 1: ['Fmaj7', 'Am7', 'Dm7', 'Bbmaj7'], 2: ['Dm7', 'Bbmaj7', 'Fmaj7', 'C'], 3: ['Bbmaj7', 'C', 'Am7', 'Dm7'] },
  motif: 'A5:1 C6:.5 A5:.5 G5:1 F5:1 | E5:.5 F5:.5 G5:1 C5:2',
  parts: [
    { name: 'e-piano', synth: 'epiano', play: 'chord', pattern: { 0: 'x.......', 1: 'x...x.x.', 3: ['x..x.x..', 'x...x.xx'] }, octave: 4, len: 0.9, gain: 0.15, from: 0 },
    { name: 'bassline', synth: 'bass', play: 'bass', pattern: { 0: 'x.......', 1: 'x.....x.', 3: 'x..x..x.' }, offsets: [0, 7], octave: 2, gain: 0.14, from: 0 },
    { name: 'hats', synth: 'hat', pattern: { 1: 'x.x.x.x.', 3: 'xxxxxxxx' }, gain: 0.05, from: 1 },
    { name: 'snare', synth: 'snare', pattern: '....x.......x...', tone: 0.4, gain: 0.1, from: 1 },
    { name: 'kick', synth: 'kick', pattern: { 2: 'x.......x.....x.', 3: ['x.......x.....x.', 'x.....x.x.......'] }, gain: 0.2, from: 2 },
    { name: 'piano motif', synth: 'piano', play: 'motif', gain: 0.11, from: 2 },
  ],
  bed: 'crackle',
  bedGain: 0.5,
};
