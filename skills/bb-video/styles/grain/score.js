// Score (starting point for the flat grain-illustration style): a light, curious bed that walks forward like a picture book being turned —
// a soft felt pad, a plucked marimba-like figure that moves step by step under the facts, a round bass on the beat, a brushed shaker; a bell
// motif when a new era arrives; a turn thins to the pad and a low thump before the spotlight beat; the close opens to a warm major chord.
// Under a voice the pad, bass and plucks keep, the bell drops. Patterns are written for any section; the names the starters use (open / story /
// turn / close, or a promo's hook / build / drop / resolve) only change the density. Change the key, the chords and the motif per film: references/music.md.
export default {
  name: 'One line: what this music should make people feel (e.g. a picture book of inventions turning page by page, warm and curious)',
  key: 'F major',
  human: 0.45,
  space: { size: 0.4, damp: 0.55, mix: 0.14 },
  chords: {
    open: ['F', 'Dm', 'Bb', 'C'], hook: ['F', 'Dm', 'Bb', 'C'],
    story: ['F', 'Am', 'Bb', 'F', 'Dm', 'Gm', 'Bb', 'C'], build: ['F', 'Am', 'Bb', 'F', 'Dm', 'Gm', 'Bb', 'C'],
    turn: ['Dm', 'Bb', 'Gm', 'C'], drop: ['Bb', 'C', 'Am', 'Dm'],
    close: ['Bb', 'C', 'F', 'Fsus4'], resolve: ['Bb', 'C', 'F', 'Fsus4'],
  },
  motif: 'C5:.5 F5:.5 A5:1 G5:.5 F5:.5 | D5:1 E5:1 F5:2',
  parts: [
    { name: 'felt', synth: 'pad', play: 'chord', pattern: 'x-------', octave: 3, cut: 1500, attack: 0.5, gain: 0.08, width: 0.8, underVoice: 'keep' },
    { name: 'bass', synth: 'bass', play: 'bass', pattern: { default: 'x...x.x.', turn: 'x.......', open: 'x.......', hook: 'x.......', close: 'x.......' }, octave: 2, gain: 0.15, underVoice: 'keep' },
    { name: 'mallet', synth: 'pluck', play: 'arp', bright: 0.75, pattern: { default: ['x.x.x.x.', 'x.xx.x.x'], turn: 'x.......', open: 'x...x...', hook: 'x...x...' }, order: 'updown', range: 1, octave: 4, gain: 0.12, underVoice: 'keep' },
    { name: 'bell', synth: 'bell', play: 'motif', gain: 0.09, in: ['open', 'hook', 'close', 'resolve', 'drop'] },
    { name: 'shaker', synth: 'shaker', pattern: { default: '..x...x...x...x.', turn: '', open: '', hook: '' }, gain: 0.06, pan: -0.25 },
    { name: 'thump', synth: 'kick', pattern: { default: 'x.......x.......', turn: 'x...............', open: '', close: 'x...............' }, tune: 50, gain: 0.16 },
  ],
};
