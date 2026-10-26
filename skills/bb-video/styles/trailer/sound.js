// Sound design (starting point for the movie-trailer style): the trailer's hits, in the same key as the score (D minor).
// Types the trailer runtime emits: whoosh (cards fading in), impact (smash cuts, slammed cards), flash (white flash frames), braam + boom + subdrop
// (the title), swell (into the ident and emerging titles), ident (the studio ident), shine (the light sweep on the title), type (typed screen text).
// Also here for the picture to place: ping (act one's lone piano note), static (a radio), tick, riser. Add what the story needs (a heartbeat, an engine…) with the palette words in references/sound.md or your own function.
const SR = 44100;
const saw = (f, n, r, det = 0.012, voices = 5) => { const o = new Float32Array(n), ph = Array.from({ length: voices }, () => r()); for (let i = 0; i < n; i++) { let v = 0; for (let k = 0; k < voices; k++) { ph[k] = (ph[k] + (f * (1 + (k - (voices - 1) / 2) * det)) / SR) % 1; v += ph[k] * 2 - 1; } o[i] = v / voices; } return o; };
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// BRAAM: a huge low brass blast with a metallic, distorted edge; the filter opens fast and closes slowly
function braam(p, r, ev) {
  const { svf } = ev.LIB, len = p.dur ?? 2.6, n = Math.ceil((len + 0.8) * SR), o = new Float32Array(n), root = p.root ?? 38;   // D2
  for (const [m, gn] of [[root - 12, 0.7], [root, 1], [root + 7, 0.35], [root + 12, 0.5]]) { const s = saw(hz(m), n, r); for (let i = 0; i < n; i++) o[i] += s[i] * gn; }
  const f = svf(o, (t) => 140 + (p.bright ?? 2600) * Math.min(1, t / 0.08) * Math.exp(-t * 1.2), 0.75, 'lp');
  for (let i = 0; i < n; i++) { const t = i / SR, e = Math.min(1, t / 0.012) * (t < len ? Math.exp(-t * 0.4) : Math.exp(-len * 0.4) * Math.max(0, 1 - (t - len) / 0.8)); f[i] = Math.tanh(f[i] * 2.8) * e * 0.8; }
  return f;
}
// sub drop: a sine falling from ~110 Hz to ~30 Hz — felt more than heard (its harmonics keep it alive on a phone)
function subdrop(p) { const d = p.dur ?? 1.8, n = Math.ceil(d * SR), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR, q = t / d; ph += (30 + 80 * Math.pow(1 - q, 2.5)) / SR; o[i] = Math.tanh(Math.sin(2 * Math.PI * ph) * 2) * 0.8 * Math.min(1, t / 0.01) * Math.pow(1 - q, 1.4); } return o; }
// radio static: band-passed hiss with crackle, the sound of a transmission (dur follows the event)
function staticNoise(p, r, ev) {
  const { svf } = ev.LIB, d = p.dur ?? 1.2, n = Math.ceil(d * SR), raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = (r() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / SR * 37)) + (r() < 0.002 ? (r() * 2 - 1) * 3 : 0);
  const o = svf(raw, p.bright ?? 2400, 0.4, 'bp');
  for (let i = 0; i < n; i++) { const q = i / n; o[i] *= Math.min(1, q * 12) * Math.min(1, (1 - q) * 6) * 1.6; }
  return o;
}
export default {
  name: 'One line: what this trailer sounds like (e.g. a vast hall: braams, taiko, risers, a radio crackling out of the dark)',
  space: { size: 0.85, mix: 0.3 },
  vary: 0.06,
  sounds: {
    whoosh: { variants: [{ use: 'swish', from: 200, to: 2400, color: 'air', gain: 0.8 }, { use: 'swish', from: 260, to: 3200, color: 'air', shape: 'up', gain: 0.7 }] },
    impact: { variants: [{ layers: [{ use: 'impact', freq: 38, body: 1, crack: 0.8 }, { use: 'boom', freq: 32, gain: 0.6 }] }, { layers: [{ use: 'impact', freq: 44, body: 0.9, crack: 1 }, { use: 'thud', freq: 55, gain: 0.5 }] }] },
    flash: { layers: [{ use: 'swish', from: 1200, to: 7000, dur: 0.18, shape: 'down', gain: 0.6 }, { use: 'click', freq: 2600, gain: 0.4 }] },
    braam: { use: braam, root: 38 },
    boom: { use: 'boom', freq: 30, noise: 0.4 },
    subdrop: { use: subdrop },
    swell: { use: 'swell', of: 'glass', note: 'D6', dur: 1.2 },
    riser: { use: 'riser', from: 300, to: 6000, tonal: ['D4', 'A4', 'D5'] },
    ident: { layers: [{ use: 'boom', freq: 36, gain: 0.7, noise: 0.2 }, { use: 'glass', note: 'A5', decay: 1.2, gain: 0.35 }] },
    static: { use: staticNoise },
    ping: { use: 'glass', notes: ['D6', 'A5', 'F5', 'A5', 'E5'], decay: 1.3, partials: [[1, 1], [2, 0.35], [3, 0.12], [4.2, 0.05]], gain: 0.7 },   // the lone piano-like "ping" of act one
    shine: { use: 'glint', note: 'A6', count: 2, dur: 0.9, gain: 0.5 },                                                                        // a light sweeping over title type
    tick: { use: 'tick', freq: 2400 },
    type: { use: 'key', bright: 3000 },
  },
  hit: null,       // the runtime places its own hits (smash cuts, the title)
  rise: null,      // risers go where the picture asks for them: F.sfx(t, 'riser', g, { dur })
  logo: null,      // the title slam is the sound logo
};
