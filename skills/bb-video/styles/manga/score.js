// Score (starting point for the manga / motion-comic style): an anime battle OST in code — driving spiccato strings in eighths, a rock kit, a
// synth-saw lead with a short heroic hook, brass stabs on the hits, a lone piano for the quiet turn. Sections the starters use: cold (the cold
// open, pad and a pulse), rise (the rival appears, strings start driving), battle (full kit, the hook), turn (the twist: piano alone, no drums),
// crash (heavy, slower feel, low strings and toms), end (the hook once more, resolving). It ducks under the voice; it comes up in the gaps
// between lines and on the splash. Change the key, the chords and the motif for each film: references/music.md.
export default {
  name: 'One line: what this music should make people feel (e.g. a shōnen battle about to start: tense, fast, a hook you could hum)',
  key: 'E minor',
  human: 0.35,
  space: { size: 0.55, damp: 0.5, mix: 0.2 },
  chords: {
    cold: ['Em', 'C', 'Em', 'B'],
    rise: ['Em', 'C', 'D', 'B'],
    battle: ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'B'],
    turn: ['Cmaj7', 'Am', 'Cmaj7', 'B'],
    crash: ['Em', 'Em', 'C', 'B'],
    end: ['C', 'D', 'Em', 'Em'],
  },
  motif: 'E5:.5 G5:.5 B5:1 A5:.5 G5:.5 | F#5:1 D5:.5 E5:1.5 r:1',
  parts: [
    { name: 'strings pad', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 3, cut: 1600, attack: 0.5, gain: 0.1, width: 0.7, underVoice: 'keep' },
    { name: 'spiccato', synth: 'spiccato', play: 'arp', pattern: { rise: 'x.x.x.x.', battle: ['xxxxxxxx', 'xx.xxx.x'], crash: 'x...x...', end: 'xxxxxxxx' }, order: 'up', range: 1, octave: 4, gain: 0.09, in: ['rise', 'battle', 'crash', 'end'] },
    { name: 'bass', synth: 'bass', play: 'bass', pattern: { cold: 'x.......', rise: 'x...x...', battle: ['x.x.x.xx', 'x.xxx.x.'], crash: 'x.......', end: 'x.x.x.x.' }, offsets: [0, 12], octave: 2, gain: 0.15, underVoice: 'keep' },
    { name: 'lead hook', synth: 'supersaw', play: 'motif', cut: 3200, gain: 0.07, in: ['battle', 'end'] },
    { name: 'brass stabs', synth: 'brass', play: 'chord', pattern: { battle: ['x.......', '....x...'], end: 'x.......' }, octave: 4, gain: 0.08, in: ['battle', 'end'] },
    { name: 'piano', synth: 'piano', play: 'arp', pattern: { cold: 'x...x...', turn: ['x.x.x...', 'x...x.x.'] }, order: 'down', range: 1, octave: 4, gain: 0.08, in: ['cold', 'turn'] },
    { name: 'kick', synth: 'kick', pattern: { rise: 'x.......x.......', battle: ['x.....x.x.......', 'x.....x.x...x...'], crash: 'x.......x.......', end: 'x...x...x...x...' }, tune: 52, gain: 0.3, in: ['rise', 'battle', 'crash', 'end'] },
    { name: 'snare', synth: 'snare', pattern: { battle: '....x.......x...', end: '....x.......x...' }, tone: 210, bright: 5200, gain: 0.18, in: ['battle', 'end'] },
    { name: 'hats', synth: 'hat', pattern: { rise: '..x...x...x...x.', battle: 'x.x.x.x.x.x.x.x.', end: 'x.x.x.x.x.x.x.x.' }, gain: 0.05, in: ['rise', 'battle', 'end'], pan: 0.2 },
    { name: 'toms', synth: 'tom', pattern: { crash: ['x.......x.x.....', 'x...x.......xxx.'] }, note: 41, gain: 0.12, in: ['crash'] },
  ],
};
