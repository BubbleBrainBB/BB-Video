// Score (starting point for the hand-drawn storybook mascot style): a light, plucky bed for a toy theatre — a pizzicato-like pluck walking
// under the action, a soft marimba figure answering it, a round bass, a woodblock on the off-beat, a little glockenspiel motif when a result
// pops out; the turn thins to the pluck alone, the close opens to a warm major chord. Under a voice the pluck, marimba and bass keep, the bell
// drops. Patterns are written for any section; the names the starters use (open / story / turn / close, or a promo's hook / build / drop /
// resolve) only change the density. Change the key, the chords and the motif per film: references/music.md.
export default {
  name: 'One line: what this music should make people feel (e.g. a toy theatre on a tabletop: busy little helpers, curious and cheerful)',
  key: 'C major',
  human: 0.5,
  space: { size: 0.3, damp: 0.6, mix: 0.12 },
  chords: {
    open: ['C', 'Am', 'F', 'G'], hook: ['C', 'Am', 'F', 'G'],
    story: ['C', 'G', 'Am', 'Em', 'F', 'C', 'Dm', 'G'], build: ['C', 'G', 'Am', 'Em', 'F', 'C', 'Dm', 'G'],
    turn: ['Am', 'F', 'Dm', 'E'], drop: ['F', 'G', 'Em', 'Am'],
    close: ['F', 'G', 'C', 'Csus4'], resolve: ['F', 'G', 'C', 'Csus4'],
  },
  motif: 'E5:.5 G5:.5 C6:1 B5:.5 G5:.5 | A5:1 G5:1 E5:2',
  parts: [
    { name: 'pad', synth: 'pad', play: 'chord', pattern: 'x-------', octave: 3, cut: 1300, attack: 0.6, gain: 0.05, width: 0.7, underVoice: 'keep' },
    { name: 'bass', synth: 'bass', play: 'bass', pattern: { default: 'x...x...', turn: 'x.......', open: 'x.......', close: 'x.......' }, octave: 2, gain: 0.14, underVoice: 'keep' },
    { name: 'pizz', synth: 'pluck', play: 'arp', bright: 0.55, pattern: { default: ['x.x.x.x.', 'x.x.xx.x'], turn: 'x...x...', open: 'x...x...' }, order: 'up', range: 1, octave: 3, gain: 0.12, underVoice: 'keep' },
    { name: 'marimba', synth: 'pluck', play: 'arp', bright: 0.85, pattern: { default: '....x..x', turn: '', open: '' }, order: 'down', range: 1, octave: 5, gain: 0.07, pan: 0.3, underVoice: 'keep' },
    { name: 'bell', synth: 'bell', play: 'motif', gain: 0.08, in: ['open', 'hook', 'close', 'resolve', 'drop'] },
    { name: 'wood', synth: 'woodblock', pattern: { default: '..x...x...x...x.', turn: '', open: '', close: '' }, gain: 0.1, pan: -0.3 },
    { name: 'thump', synth: 'kick', pattern: { default: 'x.......x.......', turn: '', open: '', close: 'x...............' }, tune: 55, gain: 0.1 },
  ],
};
