// Score (starting point for the paper-collage explainer style): a documentary news bed that leans forward — a low sub that breathes, a plucked
// bell motif (a music box on the desk) asking the question, pizzicato strings walking under the facts, a soft ticking clock; at a turn it thins
// to the swell and one low thump before the title sheet hits; the close opens to a suspended chord. Under a voice the sub, swell and plucks keep,
// the bell drops. Patterns are written for any section; the names the starters use (open / report / turn / close, or a promo's hook / build /
// drop / resolve) only change the density. Change the key, the chords and the motif for each film: references/music.md.
export default {
  name: 'One line: what this music should make people feel (e.g. a newsroom at night: papers spread on the table, something is about to tip)',
  key: 'D minor',
  human: 0.4,
  space: { size: 0.45, damp: 0.5, mix: 0.16 },
  chords: {
    open: ['Dm', 'Bb', 'Gm', 'A'], hook: ['Dm', 'Bb', 'Gm', 'A'],
    report: ['Dm', 'Dm', 'Bb', 'C', 'Gm', 'Gm', 'A', 'A'], build: ['Dm', 'Dm', 'Bb', 'C', 'Gm', 'Gm', 'A', 'A'],
    turn: ['Bb', 'Bb', 'A', 'A'], drop: ['Dm', 'C', 'Bb', 'A'],
    close: ['Dm', 'Bb', 'F', 'Asus4'], resolve: ['Dm', 'Bb', 'F', 'Asus4'],
  },
  motif: 'A5:.5 F5:.5 D5:1 E5:.5 F5:.5 | G5:1 E5:1 C#5:2',
  parts: [
    { name: 'swell', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 3, cut: 1300, attack: 1.0, gain: 0.07, width: 0.8, underVoice: 'keep' },
    { name: 'sub', synth: 'sub', play: 'bass', pattern: { default: 'x...x...', turn: 'x.......', open: 'x.......', hook: 'x.......' }, octave: 1, gain: 0.17, underVoice: 'keep' },
    { name: 'pizz', synth: 'pluck', play: 'arp', pattern: { default: ['x.x.x.x.', 'x...x.x.'], turn: '', open: 'x...x...', hook: 'x...x...' }, order: 'up', range: 1, octave: 4, gain: 0.13, underVoice: 'keep' },
    { name: 'musicbox', synth: 'bell', play: 'motif', gain: 0.1, in: ['open', 'hook', 'close', 'resolve', 'turn'] },
    { name: 'clock', synth: 'hat', pattern: { default: '..x...x...x...x.', turn: '', open: '', hook: '' }, gain: 0.07, pan: 0.3 },
    { name: 'thump', synth: 'kick', pattern: { default: 'x.......x.......', turn: 'x...............', open: '' }, tune: 46, gain: 0.2 },
  ],
};
