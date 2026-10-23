// Score (starting point for the Matisse cut-out style): an echo of "Jazz" — light jazz chords (electric piano, Charleston rhythm), a plucked walking bass, brushed drums and ride, swung eighth notes. Usage in references/music.md; rewrite for the product.
// Structure: chords / pattern can each be written per section strength (0–3) or per section name (hook / build / burst / drop / resolve); human = human feel (0 machine … 1 very loose).
export default {
  name: 'One line: what this music should make people feel (e.g. light jazz in a sunny studio while you cut paper)',
  key: 'F major',
  swing: 0.62,
  human: 0.8,          // handmade feel: a bit more human feel
  chords: { 1: ['Fmaj7', 'Dm7', 'Gm7', 'C7'], 2: ['Dm7', 'Gm7', 'C7', 'Fmaj7'], 3: ['Bbmaj7', 'C7', 'Am7', 'Dm7'] },
  motif: 'A5:.5 C6:.5 r:.5 A5:.5 G5:1 F5:1 | D5:.5 F5:.5 A5:1 G5:.5 F5:.5 r:1',
  parts: [
    { name: 'e-piano chords', synth: 'epiano', play: 'chord', pattern: { 0: 'x.......', 1: 'x..x....', 3: ['x..x..x.', '.x..x..x'] }, octave: 4, len: 0.8, gain: 0.15, from: 0 },
    { name: 'plucked bass', synth: 'bass', play: 'bass', pattern: { 0: 'x...x...', 1: 'x.x.x.x.' }, offsets: [0, 7, 12, 7], octave: 2, gain: 0.13, from: 0 },
    { name: 'brushes', synth: 'shaker', pattern: 'xxxxxxxx', gain: 0.05, from: 0 },
    { name: 'ride', synth: 'hat', pattern: { 1: 'x.xxx.xx', 3: ['x.xxx.xx', 'x.xxxxx.'] }, gain: 0.07, from: 1 },
    { name: 'snare (brushed)', synth: 'snare', pattern: { 1: '....x.......x...', 3: '....x.......x.x.' }, tone: 0.3, gain: 0.1, from: 1 },
    { name: 'kick', synth: 'kick', pattern: { 2: 'x.......x.......', 3: 'x.......x..x....' }, tune: 55, gain: 0.22, from: 2 },
    { name: 'vibraphone motif', synth: 'bell', play: 'motif', gain: 0.13, from: 2, upAt: 3 },
  ],
};
