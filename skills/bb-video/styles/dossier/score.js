// Score (starting point for the clipping-file commentary style): a tense finance-commentary bed — a low pulse in eighths like a clock you can feel,
// a dark string pad, a sparse piano figure in A minor that asks a question, a muted tick on the off-beats; the "turn" thins out to a single
// held note, the "close" opens the pad to a suspended chord. It sits under the voice (pulse and pad keep, the rest drops while speaking).
// Section names the starter uses: open (the clipping that sets the scene), report (documents and numbers), turn (the question), close. Change the
// key, the chords and the motif for each film: references/music.md.
export default {
  name: 'One line: what this music should make people feel (e.g. a tense late-night markets desk: something is about to give)',
  key: 'A minor',
  human: 0.45,
  space: { size: 0.5, damp: 0.55, mix: 0.18 },
  chords: {
    open: ['Am', 'F', 'Dm', 'E'],
    report: ['Am', 'Am', 'F', 'G', 'Dm', 'Dm', 'E', 'E'],
    turn: ['F', 'F', 'E', 'E'],
    close: ['Am', 'F', 'C', 'Esus4'],
  },
  motif: 'E5:.5 C5:.5 A4:1 B4:.5 C5:.5 | D5:1 B4:1 G#4:2',
  parts: [
    { name: 'pad', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 3, cut: 1400, attack: 0.8, gain: 0.1, width: 0.7, underVoice: 'keep' },
    { name: 'pulse', synth: 'sub', play: 'bass', pattern: { open: 'x...x...', report: 'x.x.x.x.', turn: 'x.......', close: 'x...x...' }, octave: 1, gain: 0.15, underVoice: 'keep' },
    { name: 'piano', synth: 'piano', play: 'arp', pattern: { open: 'x...x.x.', report: ['x.x...x.', 'x...x.x.'], close: 'x...x...' }, order: 'down', range: 1, octave: 4, gain: 0.08, in: ['open', 'report', 'close'] },
    { name: 'question', synth: 'bell', play: 'motif', gain: 0.07, in: ['open', 'close'] },
    { name: 'tick', synth: 'hat', pattern: { report: '..x...x...x...x.', close: '..x.......x.....' }, gain: 0.05, in: ['report', 'close'], pan: 0.25 },
    { name: 'heartbeat', synth: 'kick', pattern: { report: 'x.......x.......', turn: 'x..x............' }, tune: 50, gain: 0.16, in: ['report', 'turn'] },
  ],
};
