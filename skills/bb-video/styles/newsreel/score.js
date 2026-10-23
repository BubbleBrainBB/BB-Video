// Score (starting point for the old-newsreel style): a 1930s newsreel march — brass oom-pah, snare and bass drum, a trumpet call — heard through a
// dull, hissy optical track (lowpass, crackle bed). B-flat major, the band key. It plays on under the announcer like a real newsreel and drops to
// almost nothing on the question card (a section of strength 0). Change the key, the motif and the pattern for each film.
export default {
  name: 'One line: what this music should make people feel (e.g. a brass march from a 1930s newsreel, cheerful and a little pompous)',
  key: 'Bb major',
  human: 0.6,
  swing: 0.5,
  lowpass: 4800,
  bed: 'crackle',
  underVoice: 'full',
  level: 0.85,
  space: { size: 0.35, damp: 0.6, mix: 0.12 },
  echo: false,
  chords: {
    0: ['Gm', 'Eb', 'Cm', 'D7'],
    1: ['Bb', 'Gm', 'Eb', 'F7'],
    2: ['Bb', 'Eb', 'F7', 'Bb', 'Gm', 'Cm7', 'F7', 'Bb'],
    3: ['Bb', 'Eb', 'Bb', 'F7', 'Eb', 'Bb', 'C7', 'F7'],
  },
  motif: 'F5:.5 F5:.25 F5:.25 Bb5:1 D6:1 C6:.5 Bb5:.5 | C6:1 A5:.5 F5:.5 Bb5:2',
  parts: [
    { name: 'tuba', synth: 'bass', play: 'bass', pattern: { 0: 'x.......', 1: 'x...x...', 2: 'x...x...', 3: 'x...x...' }, offsets: [0, 7], octave: 2, cut: 900, gain: 0.3, from: 0 },
    { name: 'oom-pah brass', synth: 'stab', play: 'chord', pattern: { 1: '..x...x.', 2: '..x...x.', 3: ['..x...x.', '..x.x.x.'] }, octave: 4, gain: 0.16, from: 1, pan: -0.25 },
    { name: 'horn chords', synth: 'brass', play: 'chord', pattern: 'x-------', octave: 3, cut: 1600, attack: 0.15, gain: 0.12, from: 0, underVoice: 'keep' },
    { name: 'trumpet call', synth: 'brass', play: 'motif', gain: 0.2, from: 2, upAt: 3, cut: 3200, pan: 0.2 },
    { name: 'glockenspiel', synth: 'bell', play: 'arp', pattern: 'x.x.x.x.', order: 'up', octave: 5, gain: 0.13, from: 3, in: [3] },
    { name: 'snare', synth: 'snare', pattern: { 1: '....x.......x...', 2: ['x..xx.x.x..x..x.', 'x..xx.x.x.xxx.x.'], 3: ['x.xxx.x.x.xxxxxx', 'x.xxx.x.x.x.xxxx'] }, gain: 0.2, from: 1, tone: 0.6 },
    { name: 'bass drum', synth: 'kick', pattern: { 2: 'x.......x.......', 3: 'x...x...x...x...' }, tune: 62, gain: 0.28, from: 2 },
    { name: 'cymbal', synth: 'crash', pattern: { 3: 'x...............' }, gain: 0.08, from: 3 },
  ],
};
