// Score (starting point for the suspense-mystery style): a deadpan old-TV science-programme bed; the case look adds a bright answer. Two moods in one key. The investigation sits on D minor chords — a low string drone,
// a sneaky spiccato figure that tiptoes under the narrator, an eerie music-box bell, a heartbeat kick in the tense part — and the truth turns
// to F major, its relative major: bouncing bass, a bright piano, claps, a glockenspiel singing the motif. The gap between the two is the joke.
// Section names the runtime and the starter use: cold (the strange phenomenon), probe (doubts, ruled out one by one), tension (the countdown,
// the flashlight), truth (the reveal and the explanation), end. Change the chords, the motif and the patterns for each film: references/music.md.
export default {
  name: 'One line: what this music should make people feel (e.g. a deadly serious investigation of something trivial, then a bright, slightly silly answer)',
  key: 'F major',
  human: 0.55,
  space: { size: 0.6, damp: 0.5, mix: 0.24 },
  chords: {
    cold: ['Dm', 'Bb', 'Gm', 'A'],
    probe: ['Dm', 'Dm', 'Bb', 'A7'],
    tension: ['Dm', 'Eb', 'Dm', 'A7'],
    truth: ['F', 'C', 'Dm', 'Bb', 'F', 'Bb', 'C', 'F'],
    end: ['F', 'Bb', 'C', 'F'],
  },
  motif: 'C5:.5 F5:.5 A5:1 G5:.5 F5:.5 | E5:.5 F5:.5 G5:1 C5:1',
  // The case look ends in daylight: add sections named truth / end (F.section) and these parts for the bright F-major answer —
  // { name: 'piano', synth: 'piano', play: 'arp', pattern: 'x.x.x.x.', order: 'updown', range: 2, octave: 4, gain: 0.1, in: ['truth', 'end'], underVoice: 'keep' },
  // { name: 'bounce bass', synth: 'bass', play: 'bass', pattern: 'x..x..x.', offsets: [0, 7], octave: 2, cut: 1200, gain: 0.18, in: ['truth', 'end'], underVoice: 'keep' },
  // { name: 'glockenspiel', synth: 'bell', play: 'motif', gain: 0.12, in: ['truth', 'end'] },
  // { name: 'claps', synth: 'clap', pattern: '....x.......x...', gain: 0.24, in: ['truth', 'end'] },
  // { name: 'shaker', synth: 'shaker', pattern: 'x.x.x.x.x.x.x.x.', gain: 0.05, in: ['truth', 'end'], pan: 0.3 },
  parts: [
    { name: 'drone', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 2, cut: 700, attack: 1.2, gain: 0.1, width: 0.8, in: ['cold', 'probe', 'tension'], underVoice: 'keep' },
    { name: 'low pulse', synth: 'sub', play: 'bass', pattern: { cold: 'x.......', probe: 'x.......', tension: 'x...x...' }, octave: 1, gain: 0.16, in: ['cold', 'probe', 'tension'], underVoice: 'keep' },
    { name: 'sneaky spiccato', synth: 'spiccato', play: 'arp', pattern: { probe: ['x.x...x.x...x...', 'x.x...x...x.x...'], tension: 'x.x.x.x.x.x.x.x.' }, order: 'up', range: 1, octave: 3, gain: 0.1, in: ['probe', 'tension'], underVoice: 'keep' },
    { name: 'music box', synth: 'bell', play: 'arp', pattern: 'x...x...', order: 'down', octave: 5, gain: 0.05, in: ['cold'], underVoice: 'keep' },
    { name: 'heartbeat', synth: 'kick', pattern: 'x..x............', tune: 52, gain: 0.2, in: ['tension'], underVoice: 'keep' },
  ],
};
