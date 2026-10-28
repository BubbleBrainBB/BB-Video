// Score (starting point for the Swiss kinetic-typography style): precise editorial electronica — a tight four-on-the-floor kick, clipped hats and rim, a sub bass,
// a short pluck figure that ticks like type being set, a bell motif for the hook and a supersaw only at the peak. How to write it: references/music.md.
// Structure: the poster assembles over the pluck alone; the build adds kick and bass; the burst (fact montage, pattern wall) is the full kit; the close goes back to pluck + bell.
// With narration, drums, motif and arpeggio drop out while someone speaks (only the pad and bass stay).
export default {
  name: 'One line: what this music should make people feel (e.g. a grid snapping into place, exact and confident)',
  key: 'A minor',
  human: 0.15,
  sidechain: true,
  space: { size: 0.3, damp: 0.55, mix: 0.35 },
  chords: { 0: ['Am', 'F', 'C', 'G'], 1: ['Am', 'F', 'C', 'G'], 2: ['Am', 'Dm', 'F', 'E'], 3: ['F', 'G', 'Am', ['E', 1]] },
  motif: 'E5:.5 A5:.5 C6:1 B5:.5 A5:.5 E5:1 | G5:.5 A5:.5 E5:1 r:.5 C5:1.5',
  parts: [
    { name: 'pad', synth: 'pad', play: 'chord', pattern: 'x-------', octave: 3, cut: 1400, attack: 0.4, width: 0.8, gain: 0.08, from: 0 },
    { name: 'type pluck', synth: 'pluck', play: 'arp', pattern: { 0: 'x.x.x.x.', 1: 'x.xxx.x.', 3: ['xxxxxxxx', 'xx.xxxx.'] }, order: 'updown', range: 2, octave: 4, bright: 0.7, spread: 0.6, gain: 0.12, from: 0 },
    { name: 'sub', synth: 'sub', play: 'bass', pattern: { 1: 'x.......', 2: 'x..x..x.', 3: 'x.xx.x.x' }, octave: 1, gain: 0.22, from: 1 },
    { name: 'kick', synth: 'kick', pattern: { 1: 'x.......x.......', 2: 'x...x...x...x...', 3: 'x...x...x...x...' }, tune: 50, gain: 0.2, from: 1 },
    { name: 'rim', synth: 'rim', pattern: { 2: '....x.......x...', 3: '....x..x....x.x.' }, gain: 0.3, from: 2, pan: -0.2 },
    { name: 'hat', synth: 'hat', pattern: { 1: '..x...x...x...x.', 2: 'x.x.x.x.x.x.x.x.', 3: 'xxx.xxx.xxx.xxxx' }, gain: 0.07, from: 1, pan: 0.3 },
    { name: 'clap', synth: 'clap', pattern: '....x.......x...', gain: 0.28, from: 3 },
    { name: 'bell motif', synth: 'bell', play: 'motif', gain: 0.11, from: 2, upAt: 3 },
    { name: 'saw', synth: 'supersaw', play: 'chord', pattern: 'x...x...', octave: 4, gain: 0.12, from: 3 },
  ],
};
