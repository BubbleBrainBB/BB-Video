// Music (starting point for the ASCII style): clean electronic — short electric-piano chords, a soft synth pad, light electronic drums, like the rhythm of lines being typed in a terminal. How-to in references/music.md; adapt key and tempo to the product.
// Structure: chords / pattern can be written per section energy (0–3) or per section name (hook / build / burst / drop / resolve); human = human feel (0 machine … 1 very loose).
export default {
  name: 'One line: what this music should make people feel',
  key: 'F major',
  swing: 0.5,
  human: 0.4,
  chords: { 1: ['F', 'Dm', 'Bb', 'C'], 2: ['Dm', 'Bb', 'F', 'C'], 3: ['Bb', 'C', 'Am', 'Dm'] },
  motif: 'C6:.5 F6:.5 A6:1 G6:.5 F6:.5 | D6:1 C6:1 r:1',
  parts: [
    { name: 'pad', synth: 'pad', play: 'chord', pattern: 'x', octave: 3, cut: 900, attack: 0.4, gain: 0.11, from: 0 },
    { name: 'e-piano stabs', synth: 'epiano', play: 'chord', pattern: { 0: 'x.......', 1: 'x..x..x.x..x..x.', 3: ['x..x..x.x..x..x.', 'x..x..x.x.x..xx.'] }, octave: 4, gain: 0.1, from: 0 },
    { name: 'grain arpeggio', synth: 'pluck', play: 'arp', pattern: { 1: 'x.x.x.x.x.x.x.x.', 3: 'xxxxxxxxxxxxxxxx' }, order: 'up', range: 2, octave: 5, bright: 0.6, gain: 0.11, from: 1 },
    { name: 'bass', synth: 'sub', play: 'bass', pattern: { 1: 'x...x...x...x.x.', 3: 'x..x..x.x..x.x..' }, octave: 1, gain: 0.17, from: 1 },
    { name: 'kick', synth: 'kick', pattern: { 2: 'x...x...x...x...', 3: ['x...x...x...x...', 'x...x...x.x.x...'] }, tune: 52, gain: 0.2, from: 2 },
    { name: 'hats', synth: 'hat', pattern: { 2: '..x...x...x...xx', 3: 'x.xxx.xxx.xxx.xx' }, gain: 0.06, from: 2 },
    { name: 'motif', synth: 'bell', play: 'motif', gain: 0.08, from: 2, upAt: 3 },
  ],
};
