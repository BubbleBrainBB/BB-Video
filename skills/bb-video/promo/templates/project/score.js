// Music score: compose it fresh for this product (how to write it and the overall requirements: the skill's references/music.md; scripts/scores/ has 5 example scores).
// Below is only a skeleton — rewrite every entry for the product; the key must match the pitched sounds in sound.js.
// Structure: chords / pattern can each have one set per section intensity (0–3) or per section name (hook / build / burst / drop / resolve); human = human feel (0 machine … 1 very loose).
export default {
  name: 'One line: what this music should make people feel',
  key: 'E major',
  human: 0.6,
  // one set for the opening, one for the build, a new one for the climax (a new section starts on the first chord of its set)
  chords: { 1: ['E', 'C#m7', 'Amaj7', 'B'], 2: ['C#m7', 'Amaj7', 'E', 'B'], 3: ['Amaj7', 'B', 'G#m7', 'C#m7'] },
  motif: 'G#5:1 B5:.5 C#6:.5 B5:2 | r:1 E5:1 F#5:1 G#5:1',
  parts: [
    { name: 'pad', synth: 'pad', play: 'chord', pattern: 'x', octave: 3, cut: 1100, gain: 0.2, from: 0 },
    { name: 'mid-range chords', synth: 'piano', play: 'arp', pattern: { 1: 'x...x...', 2: ['x.x.x.x.', 'x.x.xx.x'], 3: ['x.xxx.x.', 'x.x.xxx.'] }, order: 'up', octave: 4, gain: 0.18, from: 1 },
    { name: 'bass', synth: 'sub', play: 'bass', pattern: { 1: 'x.......', 2: 'x...x...', 3: 'x..x..x.' }, octave: 1, gain: 0.22, from: 1 },
    { name: 'kick', synth: 'kick', pattern: { 2: ['x...x...x...x...', 'x...x...x...x.x.'], 3: ['x...x...x...x...', 'x...x...x.x.x...'] }, gain: 0.42, from: 2 },
    { name: 'clap', synth: 'clap', pattern: '....x.......x...', gain: 0.3, from: 3 },
    { name: 'hats', synth: 'hat', pattern: { 2: ['..x...x...x...x.', '..x...x...x.x.x.'], 3: 'x.x.x.x.x.x.x.x.' }, gain: 0.13, from: 2 },
    { name: 'melody', synth: 'bell', play: 'motif', gain: 0.16, from: 2, upAt: 3 },
  ],
};
