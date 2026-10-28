// Score (starting point for the dark cinematic motivational style): music that presses down, then lifts. Usage in references/music.md.
//   night (energy 0–1): a low drone, a sparse felt piano, a slow sub — the room at 1 a.m.
//   weight (1–2): the cost: a low string pulse, a soft heartbeat-like kick, the piano darker
//   still (0): almost nothing — one held chord under the decision (keep it short; the voice carries it)
//   rise (2): strings swell section by section, a steady pulse, the piano motif climbs
//   dawn (3): the release: a major lift, full strings and high strings, the motif in the open
// Section names come from the picture (F.section(at, energy, { name })); parts pick their sections with `in`. A minor → C major at dawn.
// Change the key, chords and motif per film; keep the sound design (sound.js) in the same key.
export default {
  name: 'One line: what this film should make people feel (e.g. the weight of a long night, then quiet resolve, then the light coming in)',
  key: 'A minor',
  human: 0.55,
  fill: false,
  space: { size: 0.85, damp: 0.45, mix: 1.0 },
  chords: {
    night: [['Am', 2], ['F', 2], ['Am', 2], ['Em', 2]],
    weight: [['Dm', 2], ['Am', 2], ['E', 2], ['Am', 2]],
    still: [['F', 4], ['G', 4]],
    rise: [['F', 2], ['G', 2], ['Am', 2], ['C', 2]],
    dawn: [['C', 2], ['G', 2], ['Am', 2], ['F', 2]],
  },
  motif: 'E5:1 C5:1 D5:1 E5:1 | G5:2 E5:2',
  parts: [
    { name: 'drone', synth: 'pad', play: 'chord', pattern: 'x-------', octave: 2, cut: 600, attack: 1.2, gain: 0.12, in: ['night', 'weight', 'still', 'rise'], underVoice: 'keep' },
    { name: 'felt piano', synth: 'piano', play: 'arp', pattern: { 0: 'x.......x.......', 1: 'x.....x.....x...', 2: 'x...x...x...x.x.', 3: 'x.x.x.x.x.x.x.x.' }, order: 'up', octave: 4, gain: 0.12, in: ['night', 'weight', 'rise', 'dawn'], space: 0.7 },
    { name: 'string bed', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 3, cut: 1600, attack: 1.0, gain: 0.13, in: ['weight', 'still', 'rise', 'dawn'], underVoice: 'keep' },
    { name: 'low pulse', synth: 'spiccato', play: 'bass', pattern: { 1: 'x...x...x...x...', 2: 'x.x.x.x.x.x.x.x.' }, octave: 2, gain: 0.1, in: ['weight', 'rise'] },
    { name: 'heart kick', synth: 'kick', pattern: { 1: 'x..x............', 2: 'x..x....x..x....', 3: 'x...x...x...x...' }, tune: 44, len: 0.5, gain: 0.12, in: ['weight', 'rise', 'dawn'] },
    { name: 'motif', synth: 'piano', play: 'motif', gain: 0.16, in: ['rise', 'dawn'], space: 0.6 },
    { name: 'high strings', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 4, cut: 3200, attack: 0.8, gain: 0.08, in: ['dawn'], underVoice: 'keep' },
    { name: 'sub', synth: 'sub', play: 'bass', pattern: 'x-------', octave: 1, gain: 0.18, in: ['night', 'weight', 'rise', 'dawn'] },
  ],
};
