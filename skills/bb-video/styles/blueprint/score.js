// Score (starting point for the blueprint style): precise, patient "clockwork" minimalism — a soft pad, a plucked ostinato in even eighths
// like a train of wheels turning, a woodblock on the off-beats like an escapement, a low sub, a celesta-like bell motif; the full pulse only in the build.
// Structure: the sheet is drafted over pad + ostinato; mechanisms turning add the woodblock and bass; the climax (the whole movement running) adds kick and strings; the close returns to pad + bell.
// With narration the pulse, motif and woodblock drop out while someone speaks (only pad and sub stay) and come back in the pauses.
export default {
  name: 'One line: what this music should make people feel (e.g. a hundred small parts keeping time together, calm and exact)',
  key: 'D minor',
  human: 0.12,
  sidechain: false,
  space: { size: 0.45, damp: 0.5, mix: 0.3 },
  chords: { 0: ['Dm', 'Bb', 'F', 'C'], 1: ['Dm', 'Bb', 'F', 'C'], 2: ['Dm', 'Gm', 'Bb', 'A'], 3: ['Bb', 'C', 'Dm', ['A', 1]] },
  motif: 'A5:.5 D6:.5 F6:1 E6:.5 D6:.5 A5:1 | C6:.5 D6:.5 A5:1 r:.5 F5:1.5',
  parts: [
    { name: 'pad', synth: 'pad', play: 'chord', pattern: 'x-------', octave: 3, cut: 1300, attack: 0.5, width: 0.8, gain: 0.09, from: 0 },
    { name: 'train ostinato', synth: 'pluck', play: 'arp', pattern: { 0: 'x.x.x.x.', 1: 'xxxxxxxx', 3: 'xxxxxxxx' }, order: 'up', range: 2, octave: 4, bright: 0.55, spread: 0.5, gain: 0.1, from: 0 },
    { name: 'escapement', synth: 'woodblock', pattern: { 1: '..x...x...x...x.', 2: '..x...x...x...x.', 3: '..x.x.x...x.x.x.' }, gain: 0.12, from: 1, pan: 0.25 },
    { name: 'sub', synth: 'sub', play: 'bass', pattern: { 1: 'x.......', 2: 'x...x...', 3: 'x..x..x.' }, octave: 1, gain: 0.2, from: 1 },
    { name: 'kick', synth: 'kick', pattern: { 2: 'x.......x.......', 3: 'x...x...x...x...' }, tune: 48, gain: 0.16, from: 2 },
    { name: 'hat', synth: 'hat', pattern: { 2: '..x...x...x...x.', 3: 'x.x.x.x.x.x.x.x.' }, gain: 0.05, from: 2, pan: -0.3 },
    { name: 'strings', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 4, gain: 0.06, from: 3 },
    { name: 'bell motif', synth: 'bell', play: 'motif', gain: 0.1, from: 2, upAt: 3 },
  ],
};
