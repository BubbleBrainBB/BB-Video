// Score (starting point for the Bayeux-Tapestry style): a small medieval consort — a drone on the open fifth (like a hurdy-gurdy or an organ
// pipe), a recorder carrying a modal tune, a harp plucking the chords, a frame drum walking under it, a bell for an act. The reference films run
// on a quiet drone with a few recorder phrases; under a voice the drone and harp keep, the recorder thins. Patterns are written for any section;
// the names the starters use (open / story / turn / close, or a promo's hook / build / drop / resolve) only change the density.
// Change the mode, the chords and the tune per film: references/music.md.
// The recorder and the drone are written here (the engine's sample rate is 44100): a breathy sine with soft harmonics and a slow vibrato;
// two buzzing saws on the root and the fifth, filtered low.
const SR = 44100, hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const recorder = (ns, len, r) => {
  const f = hz(ns[0]), n = Math.ceil((len + 0.25) * SR), o = new Float32Array(n); let ph = 0, br = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, v = 1 + 0.004 * Math.sin(2 * Math.PI * 5.2 * t) * Math.min(1, t / 0.4), e = Math.min(1, t / 0.05) * (t > len ? Math.max(0, 1 - (t - len) / 0.2) : 1); ph += (f * v) / SR; br = br * 0.97 + (r() * 2 - 1) * 0.03; o[i] = (Math.sin(2 * Math.PI * ph) * 0.8 + Math.sin(4 * Math.PI * ph) * 0.12 + Math.sin(6 * Math.PI * ph) * 0.05 + br * 0.35 * (0.4 + Math.exp(-t * 12))) * e * 0.6; }
  return o;
};
const drone = (ns, len) => {
  const n = Math.ceil((len + 0.6) * SR), o = new Float32Array(n), fs = [hz(ns[0]), hz(ns[0] + 7) * 1.002, hz(ns[0] + 12) * 0.998], ph = [0, 0.3, 0.6]; let lp = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, e = Math.min(1, t / 0.6) * (t > len ? Math.max(0, 1 - (t - len) / 0.6) : 1); let x = 0; fs.forEach((f, k) => { ph[k] = (ph[k] + f / SR) % 1; x += (2 * ph[k] - 1) * [1, 0.7, 0.35][k]; }); lp += (x - lp) * 0.06; o[i] = lp * e * 0.45; }
  return o;
};
export default {
  name: 'One line: what this music should make people feel (e.g. a long cloth unrolling in a lamp-lit hall: patient, a little solemn, curious)',
  key: 'D dorian',
  human: 0.7,
  space: { size: 0.55, damp: 0.5, mix: 0.2 },
  chords: {
    open: ['Dm', 'C', 'Dm', 'Am'], hook: ['Dm', 'C', 'Dm', 'Am'],
    story: ['Dm', 'C', 'F', 'C', 'Dm', 'Am', 'C', 'Dm'], build: ['Dm', 'C', 'F', 'C', 'Dm', 'Am', 'C', 'Dm'],
    turn: ['F', 'C', 'G', 'Am'], drop: ['Dm', 'F', 'C', 'Dm'],
    close: ['F', 'C', 'Dm', 'Dm'], resolve: ['F', 'C', 'Dm', 'Dm'],
  },
  motif: 'D5:1 E5:.5 F5:.5 G5:1 A5:1 | C6:.5 A5:.5 G5:1 F5:.5 E5:.5 D5:1',
  parts: [
    { name: 'drone', synth: drone, play: 'bass', pattern: 'x-------', octave: 2, gain: 0.07, underVoice: 'keep' },
    { name: 'harp', synth: 'pluck', play: 'arp', bright: 0.45, pattern: { default: ['x.x.x.x.', 'x..xx.x.'], turn: 'x...x...', open: 'x.......', close: 'x...x...' }, order: 'up', range: 1, octave: 4, gain: 0.1, pan: -0.2, underVoice: 'keep' },
    { name: 'recorder', synth: recorder, play: 'motif', gain: 0.1, pan: 0.15, in: ['open', 'hook', 'turn', 'close', 'resolve', 'drop'] },
    { name: 'frame drum', synth: 'tom', note: 41, len: 0.5, pattern: { default: 'x.....x.x.......', turn: 'x...............', open: '', close: 'x...............' }, gain: 0.07 },
    { name: 'bell', synth: 'bell', play: 'chord', pattern: 'x-------', octave: 5, gain: 0.07, in: ['open', 'close', 'resolve'] },
  ],
};
