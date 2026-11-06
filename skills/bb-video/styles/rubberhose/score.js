// Score (starting point for the 1930s rubber-hose style): a small hot band, two-beat. A tuba on one and three, a banjo chop on two and four, a woodblock going tick-tock like a clock,
// a clarinet (or a muted trumpet when things get hot) on the tune, a xylophone doubling it up high; everything through an optical track (low-pass) so it sounds printed on film.
// Section names: open / story / build / chase / drop / quiet / resolve. The band stopping dead is G.pause in the picture (stop: true winds it down like tape first).
// Change the key, the chords and the tune per film (never quote a real cartoon's cue): references/music.md.
const SR = 44100, TAU = Math.PI * 2, { sin, abs, exp, min, max, pow, floor } = Math;
const hz = (m) => 440 * pow(2, (m - 69) / 12);
// a reed: a narrow pulse through a soft low-pass, a scoop up into the note and a slow vibrato
const reed = (m, len, p = {}) => { const n = Math.ceil((len + 0.06) * SR), o = new Float32Array(n), f0 = hz(m), lpc = 1 - exp((-TAU * (p.cut ?? 1700)) / SR); let ph = 0, l1 = 0, l2 = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, f = f0 * pow(2, -(p.scoop ?? 0.3) * exp(-t * 22) / 12) * (1 + (p.vib ?? 0.009) * sin(TAU * (p.vhz ?? 6.2) * t) * min(1, t * 3)); ph += f / SR; ph -= floor(ph); const s = ph < (p.pw ?? 0.42) ? 1 : -1; l1 += (s - l1) * lpc; l2 += (l1 - l2) * lpc; const e = min(1, t / 0.012) * (t > len ? max(0, 1 - (t - len) / 0.05) : 1); o[i] = l2 * e * 0.5; } return o; };
const tuba = (m, len) => { const n = Math.ceil((len + 0.06) * SR), o = new Float32Array(n), f = hz(m), lpc = 1 - exp((-TAU * 300) / SR); let ph = 0, l1 = 0, l2 = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += f / SR; ph -= floor(ph); l1 += (2 * ph - 1 - l1) * lpc; l2 += (l1 - l2) * lpc; o[i] = l2 * min(1, t / 0.012) * exp(-t * 1.5) * (t > len ? max(0, 1 - (t - len) / 0.05) : 1) * 1.6; } return o; };
const xylo = (m) => { const n = Math.ceil(0.22 * SR), o = new Float32Array(n), f = hz(m); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = sin(TAU * f * t) * exp(-t * 18) * 0.6 + sin(TAU * f * 3.93 * t) * exp(-t * 60) * 0.25; } return o; };
const mix = (fn, ns) => { const parts = ns.map(fn), n = max(...parts.map((b) => b.length)), o = new Float32Array(n); for (const b of parts) for (let i = 0; i < b.length; i++) o[i] += b[i] / Math.sqrt(ns.length); return o; };

export default {
  name: 'One line: what this music should make people feel (e.g. a sleepy tick-tock that turns into a hot number)',
  key: 'C major',
  swing: 0.62,
  human: 0.5,
  lowpass: 4200,   // the optical track
  space: { size: 0.2, damp: 0.6, mix: 0.07 },
  chords: {
    open: ['C', 'G7', 'C', 'C'], hook: ['C', 'A7', 'D7', 'G7'],
    story: ['C', 'A7', 'D7', 'G7', 'C', 'A7', 'Dm7', 'G7'], build: ['F', 'F#dim', 'C', 'A7', 'D7', 'G7', 'C', 'G7'],
    chase: ['Am', 'E7', 'Am', 'E7', 'F', 'C', 'D7', 'E7'], burst: ['C', 'A7', 'D7', 'G7', 'F', 'F#dim', 'C', 'G7'],
    drop: ['C', 'A7', 'D7', 'G7'], quiet: ['C', 'G7', 'C', 'G7'], resolve: ['F', 'G7', 'C', 'C'],
  },
  motif: 'E5:.5 G5:1 A5:.5 G5:.5 E5:.5 C5:1 | C#5:1 E5:1 G5:1 E5:1',
  parts: [
    { name: 'tuba', synth: (ns, len) => tuba(ns[0], len), play: 'bass', pattern: { default: 'x...x...', quiet: 'x.......', chase: 'x...x...', burst: 'x...x...' }, offsets: [0, 7], octave: 2, gain: 0.1, underVoice: 'keep' },
    { name: 'banjo', synth: 'pluck', play: 'chord', pattern: { default: '..x...x.', quiet: '........', chase: '..x...x.', burst: '..x...x.' }, octave: 4, bright: 0.85, gain: 0.08, pan: -0.35, underVoice: 'keep' },
    { name: 'clarinet', synth: (ns, len) => mix((m) => reed(m, len), ns), play: 'motif', gain: 0.07, pan: 0.15, in: ['open', 'hook', 'story', 'quiet', 'resolve'] },
    { name: 'trumpet', synth: (ns, len) => mix((m) => reed(m, len, { pw: 0.3, cut: 2300, scoop: 0.5, vib: 0.006, vhz: 5.5 }), ns), play: 'motif', gain: 0.08, pan: 0.15, in: ['chase', 'burst', 'drop', 'build'] },
    { name: 'xylophone', synth: (ns) => mix((m) => xylo(m + 12), ns), play: 'motif', gain: 0.06, pan: 0.4, in: ['open', 'hook', 'burst', 'drop'] },
    { name: 'tick-tock', synth: 'woodblock', pattern: { default: 'x.x.x.x.', quiet: 'x...x...', chase: 'xxxxxxxx', burst: 'xxxxxxxx' }, gain: 0.16, pan: 0.3 },
    { name: 'snare', synth: 'snare', pattern: { default: '................', chase: '....x.......x...', burst: '....x.......x...', drop: '....x.......x...' }, tone: 190, gain: 0.07 },
    { name: 'kick', synth: 'kick', pattern: { default: '........', chase: 'x...x...', burst: 'x...x...', drop: 'x...x...' }, tune: 52, gain: 0.12 },
  ],
};
