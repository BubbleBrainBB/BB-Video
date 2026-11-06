// Sound design (starting point for the 1930s rubber-hose style): a trap drummer's table in a small studio, printed to an optical track. Every action has its own noise, on the frame;
// all of them are synthesised right here, sample by sample (a clock's tick and tock, a chime, an alarm bell, a cuckoo, a ratchet, a spring, a slide whistle). The biggest laugh is the band stopping dead.
// Types the rubberhose runtime and starter emit: boing, whack, slide, pop, tick, tock, chime, ring, cuckoo, ratchet, rattle, crash, boom, block. Add the ones your film needs: references/sound.md.
const SR = 44100, TAU = Math.PI * 2, { sin, abs, exp, min, max, pow, floor } = Math;
const m2f = (m) => 440 * pow(2, (m - 69) / 12);
// one oscillator voice: wave, attack, release, decay, vibrato, glide (semitones over gt seconds), a two-pole low-pass
const voice = (o, d, f0, p = {}) => { const st = floor((p.at ?? 0) * SR), r = p.r ?? 0.05, n = floor((d + r) * SR), amp = p.amp ?? 0.2, a = p.a ?? 0.005, dc = p.dec ?? 0, g = p.glide ?? 0, gt = p.gt ?? d, vib = p.vib ?? 0, vhz = p.vhz ?? 5.5, lpc = p.lp ? 1 - exp((-TAU * p.lp) / SR) : 1, w = p.w ?? 'saw'; let ph = 0, l1 = 0, l2 = 0;
  for (let i = 0; i < n && st + i < o.length; i++) { const t = i / SR; let f = f0 * pow(2, (g * min(1, t / gt)) / 12); if (vib) f *= 1 + vib * sin(TAU * vhz * t) * min(1, t * 3); ph += f / SR; ph -= floor(ph); let s = w === 'sin' ? sin(TAU * ph) : w === 'tri' ? 1 - 4 * abs(ph - 0.5) : w === 'sq' ? (ph < (p.pw ?? 0.5) ? 1 : -1) : 2 * ph - 1;
    if (lpc < 1) { l1 += (s - l1) * lpc; l2 += (l1 - l2) * lpc; s = l2; } let e = min(1, t / a); if (dc) e *= exp(-t * dc); if (t > d) e *= max(0, 1 - (t - d) / r); o[st + i] += s * e * amp; } return o; };
// filtered noise: low-pass, high-pass, decay, an on/off gate (an alarm bell's hammer)
const noise = (o, d, p = {}) => { const st = floor((p.at ?? 0) * SR), n = floor(d * SR), amp = p.amp ?? 0.2, dc = p.dec ?? 0, lpc = p.lp ? 1 - exp((-TAU * p.lp) / SR) : 1, hpc = p.hp ? 1 - exp((-TAU * p.hp) / SR) : 0; let lp = 0, hp = 0, s0 = (st % 977) + 13 + (p.seed ?? 0);
  for (let i = 0; i < n && st + i < o.length; i++) { s0 = (s0 * 16807) % 2147483647; let s = s0 / 1073741824 - 1; lp += (s - lp) * lpc; s = lp; if (hpc) { hp += (s - hp) * hpc; s -= hp; } const t = i / SR; let e = min(1, t / 0.002) * (dc ? exp(-t * dc) : 1) * min(1, (d - t) / 0.01); if (p.gate) e *= sin(TAU * p.gate * t) > 0 ? 1 : 0.1; o[st + i] += s * e * amp; } return o; };
const buf = (d) => new Float32Array(Math.ceil(d * SR) + 64);
const block = (o, at, hi, a) => { voice(o, 0.04, hi ? 1080 : 760, { at, w: 'sin', amp: a, dec: 76 }); noise(o, 0.012, { at, amp: a * 0.4, hp: 1600, dec: 320 }); return o; };

const tick = (p) => { const o = buf(0.1), hi = p.hi ?? 1, a = 0.42; voice(o, 0.03, hi ? 1420 : 1040, { w: 'sin', amp: a, dec: 90 }); voice(o, 0.015, hi ? 3300 : 2500, { w: 'tri', amp: a * 0.3, dec: 190 }); noise(o, 0.018, { amp: a * 0.5, hp: 1400, dec: 220 }); return o; };
const chime = (p) => { const f = p.freq ?? 165, d = p.dur ?? 2.2, o = buf(d + 0.2); for (const [m, g, dc] of [[0.5, 0.5, 1.1], [1, 1, 1.6], [1.19, 0.55, 2.2], [2, 0.7, 2.6], [2.51, 0.4, 3.6], [3, 0.32, 4.4], [4.1, 0.2, 6]]) voice(o, d, f * m, { w: 'sin', amp: 0.26 * g, dec: dc, r: 0.1 }); return o; };
const ring = (p, r, ev = {}) => { const d = ev.dur ?? p.dur ?? 0.6, o = buf(d + 0.05); for (const m of [1, 1.48, 2.21]) voice(o, d, 1380 * m, { w: 'sq', amp: 0.04, lp: 3400, r: 0.02 }); noise(o, d, { amp: 0.1, hp: 1900, gate: p.gate ?? 28 }); return o; };
const cuckoo = (p) => { const f = m2f(79 + (p.tr ?? 0)), o = buf(0.5); voice(o, 0.14, f, { w: 'tri', amp: 0.17, a: 0.008, r: 0.02, lp: 2600 }); voice(o, 0.2, f / 1.2599, { at: 0.2, w: 'tri', amp: 0.17, a: 0.008, r: 0.03, lp: 2600 }); return o; };
const ratchet = (p, r, ev = {}) => { const d = ev.dur ?? p.dur ?? 0, n = d > 0 ? max(1, floor(d * 9)) : 1, o = buf(n * 0.11 + 0.05); for (let i = 0; i < n; i++) { const at = i * (d > 0 ? d / n : 0); noise(o, 0.02, { at, amp: 0.32, hp: 900, dec: 170, seed: i }); voice(o, 0.025, 620, { at, w: 'tri', amp: 0.26, dec: 110 }); } return o; };
const rattle = (p, r, ev = {}) => { const d = ev.dur ?? p.dur ?? 1, g = p.rate ?? 15, n = floor(d * g), o = buf(d + 0.1); for (let i = 0; i < n; i++) block(o, i / g + ((i * 0.618) % 1) * 0.012, i % 2, 0.1 * (0.7 + 0.3 * ((i * 0.37) % 1))); return o; };
const boing = (p) => { const f = p.freq ?? 190, o = buf(0.7); voice(o, 0.6, f, { w: 'sin', amp: 0.2, dec: 4.2, vib: 0.12, vhz: 16, glide: 8, gt: 0.45 }); voice(o, 0.45, f * 2, { w: 'tri', amp: 0.08, dec: 6, vib: 0.14, vhz: 16, glide: 8, gt: 0.45 }); return o; };
const whack = () => { const o = buf(0.3), a = 0.5; noise(o, 0.22, { amp: a, lp: 2800, dec: 17 }); voice(o, 0.16, 92, { w: 'sin', amp: a * 0.9, dec: 16, glide: -9, gt: 0.12 }); block(o, 0, 1, a * 0.6); return o; };
const boom = () => { const o = buf(1.3), a = 0.8; noise(o, 1.2, { amp: a, lp: 1300, dec: 3.8 }); voice(o, 0.8, 62, { w: 'sin', amp: a * 0.9, dec: 4, glide: -10, gt: 0.6 }); noise(o, 0.15, { amp: a * 0.8, hp: 600, dec: 24 }); return o; };
const pop = () => voice(buf(0.12), 0.07, 640, { w: 'sin', amp: 0.3, dec: 36, glide: 12, gt: 0.05 });
const crash = () => noise(buf(1.2), 1.1, { amp: 0.2, hp: 2600, dec: 3.6 });
// the slide whistle: up or down (ev.dir), as long as the action (ev.dur)
const slide = (p, r, ev = {}) => { const d = ev.dur ?? p.dur ?? 0.4, up = (ev.dir ?? p.dir ?? 1) >= 0, o = buf(d + 0.06); voice(o, d, up ? (p.from ?? 500) : (p.from ?? 1700), { w: 'sin', amp: 0.16, a: 0.03, r: 0.04, glide: up ? (p.st ?? 20) : -(p.st ?? 22), gt: d, vib: 0.012, vhz: 9 }); return o; };

export default {
  name: 'One line: what this film sounds like (e.g. a trap drummer and a slide whistle in a clock factory at midnight)',
  space: { size: 0.22, mix: 0.08 },
  vary: 0.1,
  sounds: {
    boing: { variants: [{ use: boing }, { use: boing, freq: 150 }, { use: boing, freq: 240 }] },
    whack: { use: whack },
    slide: { use: slide },
    pop: { use: pop },
    tick: { use: tick },
    tock: { use: tick, hi: 0 },
    chime: { variants: [{ use: chime }, { use: chime, freq: 147 }] },
    ring: { use: ring },
    cuckoo: { variants: [{ use: cuckoo }, { use: cuckoo, tr: 2 }, { use: cuckoo, tr: 4 }] },
    ratchet: { use: ratchet },
    rattle: { use: rattle },
    crash: { use: crash },
    boom: { use: boom },
    block: { variants: [{ use: (p) => block(buf(0.06), 0, 1, 0.2) }, { use: (p) => block(buf(0.06), 0, 0, 0.2) }] },
  },
  hit: 'whack',
  rise: null,   // no automatic riser: the band stopping dead before the hit is the joke
  logo: [{ use: chime, freq: 196, gain: 0.7 }, { use: boing, freq: 150, gain: 0.5 }],
};
