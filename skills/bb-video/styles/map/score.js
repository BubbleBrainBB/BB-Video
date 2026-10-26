// Score (starting point for the map style): a travel documentary over an old atlas — a felt piano walking in steady eighths, pizzicato strings
// ticking like a pen moving across the paper, a warm string bed, a light shaker once the routes spread, a bell motif when the whole
// network is on the map. Major key, curious and open; under a voiceover it stays a bed (the busy layers drop out while someone speaks).
// Change key, tempo and motif for each film: references/music.md.
export default {
  name: 'An atlas opening: curious piano, pizzicato, a warm string bed',
  key: 'D major',
  human: 0.3,
  space: { size: 0.45, damp: 0.45, mix: 0.2 },
  chords: { 0: ['Dmaj7', 'Bm7'], 1: ['Dmaj7', 'Gmaj7', 'Bm7', 'A'], 2: ['Gmaj7', 'A', 'F#m7', 'Bm7'], 3: ['Dmaj7', 'A', 'Bm7', 'Gmaj7'] },
  motif: 'A5:.5 D6:.5 F#6:1 E6:.5 D6:.5 B5:1 | A5:.5 B5:.5 D6:1 E6:2',
  parts: [
    { name: 'strings', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 3, cut: 2000, attack: 0.5, gain: 0.07, from: 0, underVoice: 'keep' },
    { name: 'piano', synth: 'piano', play: 'arp', pattern: { 0: 'x...x...', 1: 'x.x.x.x.', 2: 'x.xxx.x.', 3: 'xxx.xxx.' }, order: 'up', octave: 4, gain: 0.1, from: 0, underVoice: 'keep' },
    { name: 'bass', synth: 'sub', play: 'bass', pattern: { 1: 'x.......', 2: 'x...x...', 3: 'x..x..x.' }, octave: 1, gain: 0.18, from: 1, underVoice: 'keep' },
    { name: 'pizz', synth: 'spiccato', play: 'arp', pattern: { 2: '..x...x.', 3: '.x.x.x.x' }, order: 'updown', octave: 5, gain: 0.07, from: 2, pan: 0.2 },
    { name: 'shaker', synth: 'shaker', pattern: { 2: '..x...x...x...x.', 3: 'x.x.x.x.x.x.x.x.' }, gain: 0.05, from: 2, pan: -0.2 },
    { name: 'bell', synth: 'bell', play: 'motif', gain: 0.08, from: 3, pan: -0.1 },
  ],
};
