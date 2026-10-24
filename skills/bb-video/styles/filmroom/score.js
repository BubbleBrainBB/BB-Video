// Score (starting point for the film-room style): a late-night analysis bed — a dark pad and rhodes chords, an 808 sub pulsing under them,
// tight hats when the tape runs. Minor key, mid tempo; it sits under the analyst's voice (drums and melody drop out while they speak)
// and lifts on the clip that matters. Change the key, the motif and the pattern for each film: references/music.md.
export default {
  name: 'One line: what this music should make people feel (e.g. a quiet film room at night, the tape about to show something)',
  key: 'D minor',
  human: 0.4,
  space: { size: 0.45, damp: 0.55, mix: 0.2 },
  chords: { 0: ['Dm9', 'Bbmaj7'], 1: ['Dm9', 'Bbmaj7', 'Gm9', 'A7'], 2: ['Dm9', 'Fmaj7', 'Gm9', 'A7'], 3: ['Bbmaj7', 'C', 'Dm9', 'A7'] },
  motif: 'A4:.75 D5:.25 F5:1 E5:.5 D5:.5 C5:1 | A4:.75 D5:.25 F5:.5 G5:.5 A5:2',
  parts: [
    { name: 'pad', synth: 'pad', play: 'chord', pattern: 'x-------', octave: 3, cut: 1400, attack: 0.4, gain: 0.08, from: 0, underVoice: 'keep' },
    { name: 'rhodes', synth: 'rhodes', play: 'chord', pattern: { 1: 'x.....x.', 2: 'x..x..x.', 3: 'x.x..x.x' }, octave: 4, gain: 0.07, from: 1 },
    { name: '808', synth: 'sub808', play: 'bass', pattern: { 0: 'x.......', 1: 'x.....x.', 2: 'x..x..x.', 3: 'x..x.xx.' }, octave: 1, gain: 0.2, from: 0, underVoice: 'keep' },
    { name: 'kick', synth: 'kick', pattern: { 2: 'x.......x.......', 3: 'x.....x.x.......' }, gain: 0.16, from: 2 },
    { name: 'hats', synth: 'hat', pattern: { 1: 'x.x.x.x.x.x.x.x.', 2: 'xxx.x.xxx.x.xxx.', 3: 'xxxxxxxxxxxxxxxx' }, gain: 0.05, from: 1, pan: 0.25 },
    { name: 'lead', synth: 'lead', play: 'motif', gain: 0.05, cut: 2600, from: 3, pan: -0.15 },
  ],
};
