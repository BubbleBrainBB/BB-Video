// Score (starting point for the 3D stick-figure parable): wordless, so the music is the narrator — a small clockwork piece. Muted marimba-like
// plucks in steady eighths (the work going on), a woodblock ticking like a clock, a soft sub, a pad underneath; it thins out when one figure gives up,
// builds as the contrast grows, drops out for a breath before the reveal and lands on one bell. Sections by name follow the beats of a parable:
// setup → divergence → reveal → hold (F.section(at, energy, { name })). Change key, tempo and motif per film (references/music.md).
export default {
  name: 'A small clockwork: steady plucks, a ticking woodblock, a bell at the reveal',
  key: 'D minor',
  human: 0.3,
  space: { size: 0.4, damp: 0.5, mix: 0.18 },
  chords: { 0: ['Dm7', 'Bbmaj7'], 1: ['Dm7', 'Bbmaj7', 'Gm7', 'A7'], 2: ['Dm7', 'F', 'Bbmaj7', 'C'], 3: ['F', 'C', 'Dm7', 'Bbmaj7'] },
  motif: 'A5:.5 D6:.5 F6:1 E6:.5 D6:.5 C6:1 | D6:.5 F6:.5 A6:2',
  parts: [
    { name: 'pad', synth: 'pad', play: 'chord', pattern: 'x-------', octave: 3, cut: 1100, attack: 0.4, gain: 0.08, from: 0, underVoice: 'keep' },
    { name: 'pluck', synth: 'pluck', play: 'arp', pattern: { 0: 'x...x...', 1: 'x.x.x.x.', 2: 'xxx.xxx.', 3: 'xxxxxxxx' }, order: 'up', octave: 4, bright: 0.45, gain: 0.12, from: 0, underVoice: 'keep' },
    { name: 'woodblock', synth: 'woodblock', pattern: { 0: 'x.......x.......', 1: 'x...x...x...x...', 2: 'x.x.x.x.x.x.x.x.', 3: 'x.x.x.x.x.x.x.x.' }, gain: 0.07, from: 0 },
    { name: 'bass', synth: 'sub', play: 'bass', pattern: { 1: 'x.......', 2: 'x...x...', 3: 'x..x..x.' }, octave: 1, gain: 0.2, from: 1, underVoice: 'keep' },
    { name: 'hat', synth: 'hat', pattern: { 2: '..x...x...x...x.', 3: 'x.xxx.xxx.xxx.xx' }, gain: 0.05, from: 2, pan: 0.2 },
    { name: 'kick', synth: 'kick', pattern: { 3: 'x.......x.......' }, gain: 0.18, from: 3 },
    { name: 'bell', synth: 'bell', play: 'motif', gain: 0.09, from: 3, pan: -0.15 },
  ],
};
