// Score (starting point for the cutaway tour): a quiet bed under a voice that never stops — a soft pad holding long chords, a muted
// marimba-like pluck in slow eighths (the camera gliding), a sub bass on the bar, and one small bell motif that only sounds when the
// model is whole on screen (the opening and the pull-back at the end). No drums: nothing may compete with the narration. Major key,
// curious and unhurried. Change key, tempo and motif for each film: references/music.md.
export default {
  name: 'A look inside: one soft bed, curious and unhurried',
  key: 'D major',
  human: 0.3,
  space: { size: 0.45, damp: 0.5, mix: 0.2 },
  chords: { 0: ['Dmaj7', 'Gmaj7'], 1: ['Dmaj7', 'Bm7', 'Gmaj7', 'A'], 2: ['Gmaj7', 'A', 'F#m7', 'Bm7'], 3: ['Dmaj7', 'A', 'Bm7', 'Gmaj7'] },
  motif: 'F#5:1 A5:1 D6:2 | E6:1 D6:1 A5:2',
  parts: [
    { name: 'pad', synth: 'pad', play: 'chord', pattern: 'x-------', octave: 3, cut: 1200, attack: 0.4, gain: 0.09, from: 0, underVoice: 'keep' },
    { name: 'pluck', synth: 'pluck', play: 'arp', pattern: { 0: 'x.......', 1: 'x...x...', 2: 'x.x.x...', 3: 'x.x.x.x.' }, order: 'updown', octave: 4, bright: 0.35, gain: 0.09, from: 0, underVoice: 'keep' },
    { name: 'bass', synth: 'sub', play: 'bass', pattern: { 1: 'x.......', 2: 'x.......', 3: 'x...x...' }, octave: 1, gain: 0.16, from: 1, underVoice: 'keep' },
    { name: 'bell', synth: 'bell', play: 'motif', gain: 0.09, from: 3, pan: -0.15 },
  ],
};
