// Music (starting point for the pixel style): 8-bit console chip music — square-wave lead, fast thin-square arpeggios, triangle bass, noise-channel drums. How to write it: references/music.md.
// Chip timbres: square (duty 0.5 / 0.25 / 0.125, decay, vib), pulse, triangle, chipkick / chipsnare / chiphat. Low human (consoles are precise), almost no reverb (dry).
// With narration, drums, arpeggio and lead drop out automatically while speaking (only bass and long pad notes stay).
export default {
  name: 'One line: what this music should make people feel (e.g. press Start, a new level begins)',
  key: 'C major',
  human: 0.1,
  space: { size: 0.15, damp: 0.7, mix: 0.12 },
  chords: { 1: ['C', 'Am', 'F', 'G'], 2: ['C', 'G', 'Am', 'F'], 3: ['F', 'G', 'Em', 'Am'] },
  motif: 'E5:.5 G5:.5 C6:.5 G5:.5 A5:1 G5:1 | E5:.5 D5:.5 C5:.5 D5:.5 E5:2',
  parts: [
    { name: 'sustained pad', synth: 'square', duty: 0.125, play: 'chord', pattern: 'x-------', octave: 4, gain: 0.05, width: 0.6, underVoice: 'keep', from: 0 },
    { name: 'arpeggio', synth: 'pulse', play: 'arp', pattern: { 0: 'x.x.x.x.', 1: 'xxxxxxxx', 3: ['xxxxxxxxxxxxxxxx'] }, octave: 5, decay: 0.08, gain: 0.06, spread: 0.6, from: 0 },
    { name: 'bass', synth: 'triangle', play: 'bass', pattern: { 1: 'x...x...', 2: 'x.x.x.x.', 3: 'x.xxx.x.' }, octave: 2, gain: 0.2, from: 1 },
    { name: 'kick', synth: 'chipkick', pattern: { 1: 'x.......x.......', 2: 'x.......x.x.....', 3: 'x...x...x...x...' }, gain: 0.22, from: 1 },
    { name: 'snare', synth: 'chipsnare', pattern: { 2: '....x.......x...', 3: ['....x.......x...', '....x.......x.xx'] }, gain: 0.12, from: 2 },
    { name: 'cymbal', synth: 'chiphat', pattern: { 2: 'x.x.x.x.x.x.x.x.', 3: 'xxxxxxxxxxxxxxxx' }, gain: 0.14, from: 2 },
    { name: 'lead melody', synth: 'square', duty: 0.5, vib: 0.25, decay: 0.6, play: 'motif', gain: 0.09, from: 2 },
  ],
};
