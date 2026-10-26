// Score (starting point for the movie-trailer style): music that builds in sections, the way a trailer cue does.
//   open / world (act one): a low drone, a string bed and a lone piano "ping" — space, few notes;
//   turn (act two): the music thins out, a ticking pulse and a low string ostinato take over;
//   rise: spiccato strings in sixteenths, the first taiko hits;
//   climax (act three): a BRAAM every bar, taiko, full strings and brass — then the picture cuts to silence (R.title's silence beat) before the title;
//   tail: the piano comes back alone under the release card and the billing block.
// Section names come from the picture (F.section(at, energy, { name })); the parts below pick their sections with `in`. D minor; change the key,
// the chords, the ping notes and the patterns for each film — and keep the sound design (sound.js) in the same key.
const braam = (LIB, r, root, len = 2.4, bright = 2200) => {
  const { SR, hz, saw, svf } = LIB, n = Math.ceil((len + 0.6) * SR), o = new Float32Array(n);
  for (const [m, gn] of [[root - 12, 0.6], [root, 1], [root + 12, 0.55], [root + 19, 0.25]]) { const s = saw(hz(m), len + 0.6, r, 20000, 0.014, 5); for (let i = 0; i < n; i++) o[i] += s[i] * gn; }
  const f = svf(o, (t) => 160 + bright * Math.min(1, t / 0.1) * Math.exp(-t * 1.4), 0.7, 'lp');
  for (let i = 0; i < n; i++) { const t = i / SR, e = Math.min(1, t / 0.015) * (t < len ? Math.exp(-t * 0.45) : Math.exp(-len * 0.45) * Math.max(0, 1 - (t - len) / 0.6)); f[i] = Math.tanh(f[i] * 2.4) * e * 0.7; }
  return f;
};
const taiko = (LIB, r, f0 = 62, len = 1.1) => {
  const { SR, svf, noise } = LIB, n = Math.ceil(len * SR), o = new Float32Array(n), slap = svf(noise(n, r), 1400, 0.6, 'bp');
  let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += (f0 * (1 + 0.5 * Math.exp(-t * 30))) / SR; o[i] = Math.tanh(Math.sin(2 * Math.PI * ph) * Math.exp(-t * 4.2) * 1.6) * 0.8 + slap[i] * Math.exp(-t * 45) * 0.9; }
  return o;
};
// a part that plays a pattern of its own sound once per step: { pattern by section, sound(LIB, r) }
const stepper = (patterns, sound) => ({ t, bar, energyAt, r, put, LIB }) => {
  const e = energyAt(t + 1e-3), pat = patterns[e] ?? patterns.default;
  if (!pat) return;
  for (let j = 0; j < pat.length; j++) if (pat[j] === 'x' || pat[j] === 'X') put(sound(LIB, r, pat[j] === 'X'), t + (j * bar) / pat.length, pat[j] === 'X' ? 1.25 : 1);
};
export default {
  name: 'One line: what this trailer should make people feel (e.g. a lonely, vast quiet that tightens into dread, then breaks open)',
  key: 'D minor',
  human: 0.45,
  fill: false,                       // trailers don't do drum fills; risers and silence do that job (sound.js)
  swell: false,
  space: { size: 0.9, damp: 0.35, mix: 1.1 },
  echo: false,
  chords: {
    open: [['Dm', 2], ['Bb', 2]],
    world: [['Dm', 2], ['Bb', 2], ['F', 2], ['C', 2]],
    turn: [['Dm', 4], ['Gm', 4]],
    rise: [['Dm', 2], ['Bb', 2], ['Gm', 2], ['A', 2]],
    climax: ['Dm', 'Bb', 'Gm', 'A'],
    title: [['Dm', 4]],
    tail: [['Dm', 2], ['Bb', 2], ['F', 4]],
  },
  motif: 'A5:2 F5:1 D5:1 | E5:3 r:1',
  parts: [
    { name: 'drone', synth: 'pad', play: 'chord', pattern: 'x-------', octave: 2, cut: 500, attack: 1.2, gain: 0.2, in: ['open', 'world', 'turn', 'rise', 'tail'], underVoice: 'keep' },
    { name: 'string bed', synth: 'strings', play: 'chord', pattern: 'x-------', octave: 3, cut: 1800, attack: 0.9, gain: 0.16, in: ['world', 'rise', 'climax', 'tail'], underVoice: 'keep' },
    { name: 'piano ping', synth: 'piano', play: 'motif', gain: 0.22, in: ['world', 'tail'], space: 0.6 },
    { name: 'tick', synth: (r) => { const n = 1600, o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / 44100; o[i] = (Math.sin(2 * Math.PI * 2400 * t) * 0.6 + (r() * 2 - 1) * 0.5) * Math.exp(-t * 300); } return o; }, play: 'drum', pattern: { 1: 'x.x.x.x.', 2: 'x.x.x.x.', 3: 'xxxxxxxx' }, gain: 0.3, in: ['turn', 'rise'], underVoice: 'keep' },
    { name: 'low ostinato', synth: 'spiccato', play: 'arp', pattern: { 1: 'x.x.x.x.', 2: 'xxxxxxxxxxxxxxxx', 3: 'xxxxxxxxxxxxxxxx' }, order: 'up', octave: 3, gain: 0.13, in: ['turn', 'rise', 'climax'] },
    { name: 'high ostinato', synth: 'spiccato', play: 'arp', pattern: 'xxxxxxxxxxxxxxxx', order: 'updown', range: 2, octave: 4, gain: 0.1, in: ['climax'] },
    { name: 'brass', synth: 'brass', play: 'chord', pattern: 'x-------', octave: 3, gain: 0.16, in: ['title'] },
    { name: 'braam', play: ({ t, energyAt, r, put, LIB, chord }) => { if (energyAt(t + 1e-3) >= 3) put(braam(LIB, r, chord[0] - 12), t, 0.55); }, in: ['climax'] },
    { name: 'taiko', play: stepper({ 2: 'x.......x.......', 3: 'X..x..x.X..x.xx.' }, (LIB, r, acc) => taiko(LIB, r, acc ? 56 : 66)), in: ['rise', 'climax'] },
    { name: 'sub', synth: 'sub', play: 'bass', pattern: 'x-------', octave: 1, gain: 0.22, in: ['world', 'turn', 'rise', 'climax'] },
  ],
};
