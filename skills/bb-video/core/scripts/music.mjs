#!/usr/bin/env node
// music.mjs: the engine for promo music + sound effects, all synthesised in code (no audio files needed).
// The Agent improvises a "score" for the product (the project's score.js; see references/music.md for how to write one); the engine plays it and keeps it in check:
//   - score: tempo follows the picture (compose's bpm); key, chords, instrument timbres, drum patterns, motif, and at which intensity each layer enters are all set by the score
//   - structure follows the picture: section intensity (F.section) decides which layers play and how loud; a riser is added automatically before intensity rises, hit sections open with an impact, gap leaves space; the ending returns to the tonic chord
//   - checks: melody snaps to scale notes; soft limiting; analyses each layer's loudness, frequency spread and how many layers sound at once, and gives warnings (printed by render.mjs --check)
// Without score.js a sample score is used (scripts/scores/*.mjs, chosen by compose's music.style).
// Audition on its own: node music.mjs --demo 20 --sound <sound.js> [--score <score.js or sample name>] [--bpm 120] → sound-demo.wav
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderSfx, DEFAULT_PALETTE } from './sound.mjs';

export const SR = 44100;
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

class Bus {
  constructor(dur) { this.n = Math.ceil(dur * SR); this.L = new Float32Array(this.n); this.R = new Float32Array(this.n); }
  put(buf, t, gain, pan = 0) {
    const s0 = Math.round(t * SR), gl = gain * Math.cos(((pan + 1) * Math.PI) / 4), gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    const end = Math.min(buf.length, this.n - s0);
    for (let i = Math.max(0, -s0); i < end; i++) { const v = buf[i]; this.L[s0 + i] += v * gl; this.R[s0 + i] += v * gr; }
  }
}
// State-variable filter (low-pass / band-pass / high-pass); cutoff can be a function (sweeps over time)
function svf(inp, cutoff, q = 0.7, mode = 'lp') {
  const out = new Float32Array(inp.length);
  let lp = 0, bp = 0;
  for (let i = 0; i < inp.length; i++) {
    const fc = typeof cutoff === 'function' ? cutoff(i / SR) : cutoff;
    const f = 2 * Math.sin((Math.PI * clamp(fc, 20, SR / 6)) / SR); // This filter blows up (squeals and pops) when cutoff goes above about SR/6, so clamp it
    const hp = inp[i] - lp - q * bp; bp += f * hp; lp += f * bp;
    out[i] = mode === 'lp' ? lp : mode === 'bp' ? bp : hp;
  }
  return out;
}
const noise = (n, r) => { const b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = r() * 2 - 1; return b; };
const mix = (len, parts) => { const o = new Float32Array(Math.ceil(len * SR)); for (const [b, g] of parts) for (let i = 0; i < Math.min(o.length, b.length); i++) o[i] += b[i] * g; return o; };

// ---------- Instruments ----------
function kick(len = 0.45, g = 1, f0 = 48) { const n = Math.ceil(len * SR), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR, f = f0 + 120 * Math.exp(-t * 28); ph += f / SR; o[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 6.5) * g; } return o; }
function clap(r) { const n = Math.ceil(0.3 * SR); const nz = svf(noise(n, r), 1500, 0.5, 'bp'); for (let i = 0; i < n; i++) { const t = i / SR; const e = Math.max(Math.exp(-t * 30), [0.012, 0.024].some((d) => t > d && t < d + 0.008) ? 0.8 : 0) * Math.exp(-t * 9); nz[i] *= e * 2.2; } return nz; }
function snare(r, tone = 190, bright = 4200) { const n = Math.ceil(0.32 * SR), o = new Float32Array(n), nz = svf(noise(n, r), bright, 0.6, 'bp'); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += (tone * (1 + 0.5 * Math.exp(-t * 40))) / SR; o[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 22) * 0.55 + nz[i] * Math.exp(-t * 14) * 1.6; } return o; }
function hat(r, open = false) { const n = Math.ceil((open ? 0.25 : 0.06) * SR); const nz = svf(noise(n, r), 8000, 0.6, 'hp'); for (let i = 0; i < n; i++) nz[i] *= Math.exp((-i / SR) * (open ? 14 : 70)); return nz; }
function shaker(r) { const n = Math.ceil(0.09 * SR); const nz = svf(noise(n, r), 6500, 0.8, 'bp'); for (let i = 0; i < n; i++) { const t = i / SR; nz[i] *= Math.sin(Math.PI * clamp(t / 0.09)) ** 2 * 1.4; } return nz; }
function tom(f, len = 0.9, r) { const n = Math.ceil(len * SR), o = new Float32Array(n), nz = svf(noise(n, r), 900, 0.5, 'lp'); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += (f * (1 + 0.6 * Math.exp(-t * 18))) / SR; o[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 3.2) + nz[i] * Math.exp(-t * 30) * 0.5; } return o; }
function saw(f, len, r, cut = 900, det = 0.006, voices = 3) {
  const n = Math.ceil(len * SR), o = new Float32Array(n), ph = Array.from({ length: voices }, () => r());
  for (let i = 0; i < n; i++) { let v = 0; for (let k = 0; k < voices; k++) { ph[k] = (ph[k] + (f * (1 + (k - (voices - 1) / 2) * det)) / SR) % 1; v += ph[k] * 2 - 1; } o[i] = v / voices; }
  return svf(o, cut, 0.6, 'lp');
}
function env(buf, a, rel, len) { for (let i = 0; i < buf.length; i++) { const t = i / SR; buf[i] *= Math.min(1, t / a) * (t > len ? Math.max(0, 1 - (t - len) / rel) : 1); } return buf; }
function bassNote(f, len, r) { return env(saw(f, len + 0.08, r, 420, 0.003), 0.005, 0.06, len); }
function subBass(f, len) { const n = Math.ceil((len + 0.1) * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t)) * Math.min(1, t / 0.01) * (t > len ? Math.max(0, 1 - (t - len) / 0.1) : 1); } return o; }
function padChord(notes, len, r, cut = 1400, a = 0.15) { const n = Math.ceil((len + 0.6) * SR), o = new Float32Array(n); for (const m of notes) { const s = saw(hz(m), len + 0.6, r, cut, 0.01); for (let i = 0; i < n; i++) o[i] += s[i] / notes.length; } return env(o, a, 0.6, len); }
function stab(notes, r) { const len = 0.18; const n = Math.ceil((len + 0.25) * SR), o = new Float32Array(n); for (const m of notes) { const s = saw(hz(m), len + 0.25, r, 2600, 0.012); for (let i = 0; i < n; i++) o[i] += s[i] / notes.length; } return env(o, 0.003, 0.2, len); }
// Piano: a few partials, a hammer transient, exponential decay
function piano(m, len = 1.6) { const f = hz(m), n = Math.ceil((len + 0.3) * SR), o = new Float32Array(n), H = [1, 0.55, 0.3, 0.18, 0.1, 0.06]; for (let i = 0; i < n; i++) { const t = i / SR; let v = 0; for (let k = 0; k < H.length; k++) v += H[k] * Math.sin(2 * Math.PI * f * (k + 1) * (1 + 0.0004 * k * k) * t) * Math.exp(-t * (1.6 + k * 0.9)); o[i] = v * Math.min(1, t / 0.003) * (t > len ? Math.max(0, 1 - (t - len) / 0.3) : 1) * 0.6; } return o; }
// Electric piano: sine + a little bell partial + vibrato
function epiano(m, len = 1.2) { const f = hz(m), n = Math.ceil((len + 0.25) * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR, trem = 1 + 0.12 * Math.sin(2 * Math.PI * 4.5 * t); o[i] = (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 4.02 * t) * Math.exp(-t * 9)) * Math.exp(-t * 1.4) * trem * Math.min(1, t / 0.004) * (t > len ? Math.max(0, 1 - (t - len) / 0.25) : 1) * 0.55; } return o; }
// Plucked string (Karplus-Strong)
function pluck(m, len = 0.6, r, bright = 0.5) { const f = hz(m), n = Math.ceil(len * SR), N = Math.max(2, Math.round(SR / f)), buf = new Float32Array(N), o = new Float32Array(n); for (let i = 0; i < N; i++) buf[i] = r() * 2 - 1; for (let i = 0, j = 0; i < n; i++, j = (j + 1) % N) { const nx = (j + 1) % N; const v = buf[j]; buf[j] = (v * (0.5 + bright * 0.48) + buf[nx] * (0.5 - bright * 0.48)) * 0.996; o[i] = v; } return env(o, 0.002, 0.08, len - 0.08); }
// Bell (FM)
function bell(m, len = 1.8) { const f = hz(m), n = Math.ceil(len * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR, idx = 2.2 * Math.exp(-t * 4); o[i] = Math.sin(2 * Math.PI * f * t + idx * Math.sin(2 * Math.PI * f * 3.5 * t)) * Math.exp(-t * 2.2) * Math.min(1, t / 0.002) * 0.5; } return o; }
// String pad: 5 slightly detuned saws, slow attack, vibrato
function strings(notes, len, r, cut = 2400, a = 0.45) { const n = Math.ceil((len + 0.8) * SR), o = new Float32Array(n); for (const m of notes) { const f = hz(m), ph = Array.from({ length: 5 }, () => r()); for (let i = 0; i < n; i++) { const t = i / SR, vib = 1 + 0.004 * Math.sin(2 * Math.PI * 5.2 * t + m); let v = 0; for (let k = 0; k < 5; k++) { ph[k] = (ph[k] + (f * vib * (1 + (k - 2) * 0.004)) / SR) % 1; v += ph[k] * 2 - 1; } o[i] += v / 5 / notes.length; } } return env(svf(o, cut, 0.5, 'lp'), a, 0.8, len); }
// Spiccato (short detached strings)
function spiccato(m, r) { return env(saw(hz(m), 0.22, r, 2800, 0.006, 4), 0.006, 0.08, 0.1); }
// Brass (saw with a filter sweep)
function brass(notes, len, r) { const n = Math.ceil((len + 0.4) * SR), o = new Float32Array(n); for (const m of notes) { const s = svf(saw(hz(m), len + 0.4, r, 20000, 0.005, 4), (t) => 500 + 1800 * clamp(t / 0.35), 0.4, 'lp'); for (let i = 0; i < n; i++) o[i] += s[i] / notes.length; } return env(o, 0.08, 0.4, len); }
// Cymbal: high-passed noise + a few inharmonic metallic partials, long decay (first beat of a new section)
function crash(r, len = 1.8) { const n = Math.ceil(len * SR), nz = svf(noise(n, r), 7000, 0.4, 'hp'), o = new Float32Array(n); const fr = [3150, 4420, 5370, 6830]; for (let i = 0; i < n; i++) { const t = i / SR; let m2 = 0; for (const f of fr) m2 += Math.sin(2 * Math.PI * f * t + f); o[i] = (nz[i] * 0.9 + m2 * 0.04) * Math.exp(-t * 2.6) * Math.min(1, t / 0.002); } return o; }
// Gong: a few inharmonic partials, pitch slides down a little, long decay; clapper (woodblock): a short wooden knock
function gong(r, m = 43, len = 2.6) { const f = hz(m), n = Math.ceil(len * SR), o = new Float32Array(n); const pr = [[1, 1], [1.48, 0.6], [2.01, 0.45], [2.74, 0.3], [3.9, 0.18]]; for (let i = 0; i < n; i++) { const t = i / SR, bend = 1 + 0.04 * Math.exp(-t * 3); let v = 0; for (const [k, a] of pr) v += a * Math.sin(2 * Math.PI * f * k * bend * t + k) * Math.exp(-t * (0.9 + k * 0.5)); o[i] = Math.tanh(v * 0.8) * 0.6 * Math.min(1, t / 0.004); } return o; }
function woodblock(r, m = 79) { const f = hz(m), n = Math.ceil(0.12 * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (Math.sin(2 * Math.PI * f * t) * 0.8 + Math.sin(2 * Math.PI * f * 2.7 * t) * 0.3 + (r() * 2 - 1) * 0.2 * Math.exp(-t * 400)) * Math.exp(-t * 60); } return o; }
// Vinyl noise: low-passed hiss + sparse crackle
function crackle(len, r) { const n = Math.ceil(len * SR), o = svf(noise(n, r), 3200, 0.5, 'lp'); for (let i = 0; i < n; i++) { o[i] *= 0.05; if (r() < 0.0004) o[i] += (r() * 2 - 1) * 0.6; } return o; }

// Supersaw (7 detuned saws stacked, bright and wide): lead and long notes at the climax
function supersaw(m, len, r, p = {}) { const n = Math.ceil((len + 0.25) * SR), raw = saw(hz(m), len + 0.25, r, 20000, p.detune ?? 0.011, 7), cut = p.cut ?? 5200; const o = svf(raw, (t) => cut * (0.55 + 0.45 * Math.exp(-t * 3)), 0.5, 'lp'); return env(o, p.attack ?? 0.012, p.release ?? 0.22, len); }
// Rhodes electric piano: sine + struck "tine" partials + a little saturation
function rhodes(m, len = 1.2) { const f = hz(m), n = Math.ceil((len + 0.5) * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR, e = Math.exp(-t * 1.6) * (t > len ? Math.exp(-(t - len) * 8) : 1); const v = Math.sin(2 * Math.PI * f * t) * e + 0.32 * Math.sin(2 * Math.PI * 2 * f * t) * Math.exp(-t * 5) + 0.18 * Math.sin(2 * Math.PI * 4.07 * f * t) * Math.exp(-t * 14) + 0.06 * Math.sin(2 * Math.PI * 7 * f * t) * Math.exp(-t * 30); o[i] = Math.tanh(v * 1.4) * 0.6 * Math.min(1, t / 0.003); } return o; }
// 808: sine that slides down from an octave above at the start, long decay, a little saturation (audible on phones through its harmonics)
function sub808(m, len = 1) { const f = hz(m), n = Math.ceil((len + 0.3) * SR), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR, fr = f * (1 + Math.exp(-t * 28)); ph += fr / SR; const e = Math.exp(-t * 1.2) * (t > len ? Math.exp(-(t - len) * 10) : 1); o[i] = Math.tanh(Math.sin(2 * Math.PI * ph) * 2.2) * 0.55 * e * Math.min(1, t / 0.002); } return o; }
// Hall reverb (Freeverb: 8 combs + 4 all-passes, left and right offset); outputs the wet signal only
function hall(send, size = 0.75, damp = 0.4) {
  const n = send.length, out = [new Float32Array(n), new Float32Array(n)], fb = 0.7 + 0.26 * size, CB = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], AP = [556, 441, 341, 225], pre = Math.round(0.018 * SR);
  [0, 23].forEach((off, ch) => {
    const wet = out[ch];
    for (const d0 of CB) { const d = Math.round((d0 + off) * (0.75 + 0.5 * size)), b = new Float32Array(d); let k = 0, lp = 0; for (let i = 0; i < n; i++) { const x = i >= pre ? send[i - pre] : 0, y = b[k]; lp = y * (1 - damp) + lp * damp; b[k] = x + lp * fb; wet[i] += y * 0.125; k = (k + 1) % d; } }
    for (const d0 of AP) { const d = d0 + off, b = new Float32Array(d); let k = 0; for (let i = 0; i < n; i++) { const x = wet[i], y = b[k] - 0.5 * x; b[k] = x + 0.5 * y; wet[i] = y; k = (k + 1) % d; } }
  });
  return out;
}
// Ping-pong echo (timed to the beat, bouncing left-right, getting darker)
function pingpong(send, dt, fbk = 0.35) {
  const n = send.length, d = Math.max(1, Math.round(dt * SR)), L = new Float32Array(n), R = new Float32Array(n); let lpL = 0, lpR = 0;
  for (let i = 0; i < n; i++) { const fromR = i >= d ? R[i - d] : 0, fromL = i >= d ? L[i - d] : 0; lpL = lpL * 0.35 + (send[i] * 0.8 + fromR * fbk) * 0.65; lpR = lpR * 0.35 + (fromL) * 0.65; L[i] = lpL; R[i] = lpR; }
  return [L, R];
}

// ---------- Sound effects ----------
const SFX = {
  impact(r) { const n = Math.ceil(0.9 * SR), o = new Float32Array(n); let ph = 0; const nz = svf(noise(n, r), 2500, 0.5, 'lp'); for (let i = 0; i < n; i++) { const t = i / SR; ph += (40 + 90 * Math.exp(-t * 18)) / SR; o[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 4) * 0.9 + nz[i] * Math.exp(-t * 22) * 0.9; } return o; },
  boom(r) { const n = Math.ceil(2.4 * SR), o = new Float32Array(n); let ph = 0; const nz = svf(noise(n, r), 900, 0.4, 'lp'); for (let i = 0; i < n; i++) { const t = i / SR; ph += (34 + 60 * Math.exp(-t * 10)) / SR; o[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 1.6) + nz[i] * Math.exp(-t * 6) * 0.7; } return o; },
  whoosh(r) { const d = 0.55, n = Math.ceil(d * SR); const o = svf(noise(n, r), (t) => 300 + 5000 * Math.sin(Math.PI * clamp(t / d)), 0.35, 'bp'); for (let i = 0; i < n; i++) o[i] *= Math.sin(Math.PI * clamp(i / n)) ** 1.5 * 2.2; return o; },
  riser(r) { const d = 1.6, n = Math.ceil(d * SR); const o = svf(noise(n, r), (t) => 400 + 7000 * (t / d) ** 2, 0.3, 'bp'); for (let i = 0; i < n; i++) o[i] *= ((i / n) ** 2) * 2.4; return o; },
  click(r) { const n = Math.ceil(0.05 * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (Math.sin(2 * Math.PI * 1800 * t) * 0.5 + (r() * 2 - 1) * 0.6) * Math.exp(-t * 160); } return o; },
  type(r) { const n = Math.ceil(0.035 * SR), o = new Float32Array(n), f = 2200 + r() * 1200; for (let i = 0; i < n; i++) { const t = i / SR; o[i] = ((r() * 2 - 1) * 0.7 + Math.sin(2 * Math.PI * f * t) * 0.2) * Math.exp(-t * 220); } return o; },
  tick(r) { const n = Math.ceil(0.03 * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = Math.sin(2 * Math.PI * 3200 * t) * Math.exp(-t * 180); } return o; },
  pop(r) { const n = Math.ceil(0.12 * SR), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += (500 + 700 * (t / 0.12)) / SR; o[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 30); } return o; },
  shutter(r) { const n = Math.ceil(0.12 * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (r() * 2 - 1) * (Math.exp(-t * 90) + (t > 0.06 ? Math.exp(-(t - 0.06) * 90) : 0)) * 0.8; } return svf(o, 3000, 0.7, 'bp'); },
};

function rim(r) { const n = Math.ceil(0.06 * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (Math.sin(2 * Math.PI * 1700 * t) * 0.6 + (r() * 2 - 1) * 0.4) * Math.exp(-t * 90); } return svf(o, 2500, 0.8, 'bp'); }
function lead(m, len, r, p = {}) { return env(saw(hz(m), len + 0.15, r, p.cut ?? 3200, p.detune ?? 0.008, 3), p.attack ?? 0.01, p.release ?? 0.12, len); }
const sumNotes = (fn, notes, len) => { const parts = notes.map((m) => fn(m)); const n = Math.max(...parts.map((b) => b.length)), o = new Float32Array(n); for (const b of parts) for (let i = 0; i < b.length; i++) o[i] += b[i] / Math.sqrt(notes.length); return o; };

// ---------- Chip timbres (8-bit consoles: square / triangle / noise channels) ----------
// Square (pulse): duty 0.5 round, 0.25 bright, 0.125 thin; volume steps down like a console (decay = seconds to fall to half), vib = vibrato depth (semitones) on the tail of long notes
function chipPulse(m, len, p = {}) {
  const f = hz(m), duty = p.duty ?? 0.5, n = Math.ceil((len + 0.05) * SR), o = new Float32Array(n), dec = p.decay ?? 0, vib = p.vib ?? 0; let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, v = vib && t > 0.18 ? Math.pow(2, (vib * Math.sin(2 * Math.PI * 6 * (t - 0.18))) / 12) : 1;
    ph = (ph + (f * v) / SR) % 1;
    let g = dec ? Math.pow(0.5, t / dec) : 1; g = Math.round(g * 15) / 15;   // 4-bit volume: in steps
    o[i] = (ph < duty ? 1 : -1) * 0.5 * g * Math.min(1, t / 0.002) * (t > len ? Math.max(0, 1 - (t - len) / 0.04) : 1);
  }
  return svf(o, p.cut ?? 9000, 0.5, 'lp');   // take off a little of the aliasing harshness
}
// Triangle: 16 stair steps (the console's bass channel), no volume changes
function chipTri(m, len) {
  const f = hz(m), n = Math.ceil((len + 0.03) * SR), o = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph = (ph + f / SR) % 1; o[i] = (Math.round((1 - 4 * Math.abs(ph - 0.5)) * 7.5) / 7.5) * 0.6 * (t > len ? Math.max(0, 1 - (t - len) / 0.03) : 1); }
  return o;
}
// Noise channel (linear-feedback shift register): short = metallic short-period noise
function lfsr(n, rate, short) { const o = new Float32Array(n); let reg = 1, acc = 0, v = 1; for (let i = 0; i < n; i++) { acc += rate / SR; while (acc >= 1) { acc -= 1; const bit = (reg ^ (reg >> (short ? 6 : 1))) & 1; reg = (reg >> 1) | (bit << 14); v = reg & 1 ? 1 : -1; } o[i] = v; } return o; }
function chipKick() { const n = Math.ceil(0.16 * SR), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph = (ph + (55 + 260 * Math.exp(-t * 30)) / SR) % 1; o[i] = (Math.round((1 - 4 * Math.abs(ph - 0.5)) * 7.5) / 7.5) * Math.exp(-t * 18); } return o; }
function chipSnare() { const n = Math.ceil(0.16 * SR), nz = lfsr(n, 12000, false), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (nz[i] * 0.55 + (((t * (230 - 300 * t)) % 1) < 0.5 ? 0.3 : -0.3) * Math.exp(-t * 40)) * Math.round(Math.exp(-t * 22) * 15) / 15; } return o; }
function chipHat(open = false) { const n = Math.ceil((open ? 0.14 : 0.035) * SR), nz = lfsr(n, 30000, true); for (let i = 0; i < n; i++) nz[i] *= 0.4 * Math.round(Math.exp((-i / SR) * (open ? 20 : 90)) * 15) / 15; return svf(nz, 6000, 0.6, 'hp'); }

// ---------- Synth library: a score names a synth here, or supplies a function directly ----------
// Pitched: (notes: MIDI array, len seconds, r random, p params) → Float32Array; drums: (r, p) → Float32Array
export const SYNTHS = {
  pad: (ns, len, r, p) => padChord(ns, len, r, p.cut ?? 1400, p.attack ?? 0.15),
  strings: (ns, len, r, p) => strings(ns, len, r, p.cut ?? 2400, p.attack ?? 0.45),
  brass: (ns, len, r) => brass(ns, len, r),
  stab: (ns, len, r) => stab(ns, r),
  piano: (ns, len) => sumNotes((m) => piano(m, Math.max(0.3, len)), ns),
  epiano: (ns, len) => sumNotes((m) => epiano(m, Math.max(0.3, len)), ns),
  pluck: (ns, len, r, p) => sumNotes((m) => pluck(m, Math.max(0.2, len), r, p.bright ?? 0.6), ns),
  bell: (ns, len) => sumNotes((m) => bell(m, Math.max(0.8, len)), ns),
  lead: (ns, len, r, p) => sumNotes((m) => lead(m, len, r, p), ns),
  spiccato: (ns, len, r) => sumNotes((m) => spiccato(m, r), ns),
  bass: (ns, len, r) => bassNote(hz(ns[0]), len, r),
  sub: (ns, len) => subBass(hz(ns[0]), len),
  kick: (r, p) => kick(p.len ?? 0.45, 1, p.tune ?? 48),
  snare: (r, p) => snare(r, p.tone ?? 190, p.bright ?? 4200),
  clap: (r) => clap(r),
  hat: (r) => hat(r, false),
  openhat: (r) => hat(r, true),
  shaker: (r) => shaker(r),
  rim: (r) => rim(r),
  tom: (r, p) => tom(hz(p.note ?? 45), p.len ?? 0.9, r),
  crash: (r, p) => crash(r, p.len ?? 1.8),
  gong: (r, p) => gong(r, p.note ?? 43, p.len ?? 2.6),
  woodblock: (r, p) => woodblock(r, p.note ?? 79),
  supersaw: (ns, len, r, p) => sumNotes((m) => supersaw(m, len, r, p), ns),
  rhodes: (ns, len) => sumNotes((m) => rhodes(m, Math.max(0.3, len)), ns),
  // Chip timbres: square (duty / decay / vib), pulse (thin square, duty 0.25), triangle (stepped triangle, bass), chipkick / chipsnare / chiphat (noise-channel drums)
  square: (ns, len, r, p) => sumNotes((m) => chipPulse(m, len, p), ns),
  pulse: (ns, len, r, p) => sumNotes((m) => chipPulse(m, len, { duty: 0.25, ...p }), ns),
  triangle: (ns, len) => sumNotes((m) => chipTri(m, len), ns),
  chipkick: () => chipKick(),
  chipsnare: () => chipSnare(),
  chiphat: (r, p) => chipHat(!!p.open),
  sub808: (ns, len) => sub808(ns[0], Math.max(0.3, len)),
};
const DRUMS = new Set(['kick', 'snare', 'clap', 'hat', 'openhat', 'shaker', 'rim', 'tom', 'crash', 'gong', 'woodblock', 'chipkick', 'chipsnare', 'chiphat']);
// Helpers for scores that write their own synths
export const LIB = { SR, hz, clamp, svf, noise, saw, env, mix, kick, snare, clap, hat, shaker, tom, padChord, strings, brass, stab, piano, epiano, pluck, bell, lead, bassNote, subBass, crackle, supersaw, rhodes, sub808, hall, pingpong };

// ---------- Keys, chords, notes ----------
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const MODES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], phrygian: [0, 1, 3, 5, 7, 8, 10] };
export function parseKey(s) {
  const m = String(s || '').trim().match(/^([A-G][#b]?)\s*(major|minor|dorian|mixolydian|lydian|phrygian|大调|小调)?$/i);
  if (!m) return null;
  const mode = { '大调': 'major', '小调': 'minor' }[m[2]] || (m[2] || 'major').toLowerCase();
  return { root: NOTE[m[1][0].toUpperCase() + (m[1][1] || '')], mode, name: `${m[1]} ${mode}` };
}
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], 9: [0, 4, 7, 10, 14], maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], dim: [0, 3, 6], m7b5: [0, 3, 6, 10], aug: [0, 4, 8], sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], 5: [0, 7] };
// Chords: 'Am7', 'Fmaj7', 'G/B'; or scale-degree numbers 1–7 (triads taken from the mode automatically)
function parseChord(c, key) {
  if (typeof c === 'number') { const sc = MODES[key.mode], d = c - 1; const iv = [0, 2, 4].map((k) => { const x = d + k; return sc[x % 7] + 12 * Math.floor(x / 7) - sc[d % 7]; }); return { root: (key.root + sc[d % 7]) % 12, iv, bass: null, name: `${c}` }; }
  const m = String(c).trim().match(/^([A-G][#b]?)(maj9|maj7|madd9|m7b5|m9|m7|m6|add9|sus2|sus4|dim|aug|m|9|7|6|5)?(?:\/([A-G][#b]?))?$/);
  if (!m) throw new Error(`看不懂的和弦：${c}（写法如 Am7、Fmaj7、G/B、Csus4）`);
  return { root: NOTE[m[1]], iv: QUAL[m[2] || ''], bass: m[3] ? NOTE[m[3]] : null, name: String(c) };
}
// Notes: 'D5', 'F#4', 'Bb3'; or MIDI numbers
function parseNote(s) { if (typeof s === 'number') return s; const m = String(s).match(/^([A-G][#b]?)(-?\d)$/); if (!m) throw new Error(`看不懂的音符：${s}（写法如 D5、F#4、Bb3）`); return 12 * (Number(m[2]) + 1) + NOTE[m[1]]; }
// Motif: 'D5:1 F#5:.5 A5:.5 r:1 B5:2' (beats after the colon, r is a rest)
function parseMotif(s) { let at = 0; const out = []; for (const tok of String(s || '').trim().split(/\s+/).filter((x) => x && x !== '|')) { /* | is just a bar line */ const [n, d] = tok.split(':'); const dur = Number(d || 1); if (n !== 'r' && n !== '-') out.push({ at, m: parseNote(n), dur }); at += dur; } return { notes: out, beats: at }; }
const inScale = (m, key) => MODES[key.mode].includes(((m - key.root) % 12 + 12) % 12);
const snapScale = (m, key) => { for (const d of [0, -1, 1, -2, 2]) if (inScale(m + d, key)) return m + d; return m; };

// ---------- Playing the score ----------
export async function loadScore(spec) {
  if (spec && typeof spec === 'object') return spec;
  const name = spec || 'minimal';
  const file = /[\\/]|\.m?js$/.test(name) ? path.resolve(name) : path.join(path.dirname(fileURLToPath(import.meta.url)), 'scores', `${name}.mjs`);
  if (!fs.existsSync(file)) throw new Error(`找不到乐谱 ${file}`);
  // A project's score.js has no package.json declaring the module type, so Node prints a string of warnings: copy it to .mjs before loading
  const tmp = path.join(os.tmpdir(), `promo-score-${hashStr(file)}-${Math.round(fs.statSync(file).mtimeMs)}.mjs`);
  fs.copyFileSync(file, tmp);
  return (await import(pathToFileURL(tmp).href)).default;
}
// o.score: the music score (optional — no music by default, effects only); o.palette: this product's sound design (sound.js)
// o.voice: with narration { lines: [{ start, end }] (speaking spans), duckDb (default 8), rms (average voice loudness) } — the narrated mix (like an explainer's background music, the voice always comes first):
//   the music has two layers: the bed (pad / strings / chords / bass) ducks by duckDb while speaking; the busy layer (drums, gong, melody, arpeggio, fills, picture accents) drops out entirely while speaking and returns only in pauses;
//   each layer may set underVoice: 'keep' (stays while speaking) / 'busy' (counts as the busy layer). A score's underVoice: 'full' = the whole piece plays as usual (only ducked by duckDb)
//   Effects: light effects (gain < 0.45, montage ones excepted) are not played while speaking, the rest drop 6 dB; when rms is given, music and effect levels are set against the voice (music gapDb under the voice in pauses, default 11 dB)
export function renderPlan(plan, o = {}) {
  const hasMusic = !!(o.score && o.score.parts && o.score.parts.length);
  const sc = hasMusic ? o.score : { parts: [], key: 'A minor' };
  const { bpm = 120, offset = 0, duration } = plan;
  const seed = hashStr((plan.music && plan.music.seed) ?? o.seed ?? 'promo'), r = rng(seed);
  const key = parseKey(sc.key || (plan.music && plan.music.key)) || parseKey('A minor');
  const B = 60 / bpm, bar = 4 * B;
  const warnings = [];
  const secs = (plan.sections && plan.sections.length ? plan.sections : [{ at: 0, energy: 2 }]).slice().sort((a, b) => a.at - b.at);
  const energyAt = (t) => { let e = secs[0].energy; for (const s of secs) if (t >= s.at - 1e-6) e = s.energy; return e; };
  const end = offset + Math.floor((duration - (o.tail ?? 1.6) - offset) / B + 1e-6) * B; // Snap the ending impact to a beat
  // ---------- A: structure ----------
  // Sections: which section each bar belongs to and its bar number within it (chord progression, phrase variation and melodic development all count bars within the section)
  const secAt = (t) => { let k = 0; for (let i = 0; i < secs.length; i++) if (t >= secs[i].at - 1e-6) k = i; return k; };
  const barOf = (t) => Math.floor((t - offset) / bar + 1e-6);
  const secStartBar = secs.map((s) => barOf(s.at));
  // Whether this layer plays at time t: intensity between from and to, and if in is set, this section must be in it
  const partOn = (p, t) => { const e = energyAt(t), sct = secs[secAt(t)]; return e >= (p.from ?? 0) && e <= (p.to ?? 3) && (!p.in || p.in.includes(sct.name) || p.in.includes(sct.energy)); };
  // Per-section values: a single value = the same for the whole film; an object = by section name (hook / build / burst / drop / resolve) or intensity (0–3, the nearest level not above this section's intensity)
  const byE = (obj, s) => { if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return obj; if (s.name && obj[s.name] !== undefined) return obj[s.name]; const ks = Object.keys(obj).map(Number).filter((k) => !isNaN(k)).sort((x, y) => x - y); if (!ks.length) return Object.values(obj)[0]; let best = ks[0]; for (const k of ks) if (k <= s.energy) best = k; return obj[best]; };
  // Chords: an array = one set for the whole film (as before, looping from bar 0); an object = one set per section kind, and each new section starts from the first chord of its set
  const prog = (list) => { const L = (list && list.length ? list : [1, 6, 4, 5]).map((c) => (Array.isArray(c) ? { c: parseChord(c[0], key), bars: c[1] } : { c: parseChord(c, key), bars: 1 })); return { L, cycle: L.reduce((x, y) => x + y.bars, 0) }; };
  const globalChords = !sc.chords || Array.isArray(sc.chords), progs = new Map();
  const progOf = (s) => { const spec = globalChords ? sc.chords : byE(sc.chords, s), k = JSON.stringify(spec ?? null); if (!progs.has(k)) progs.set(k, prog(spec)); return progs.get(k); };
  for (const s of secs) progOf(s);   // a wrongly written chord is reported here
  const chordAtBar = (bi) => { const si = secAt(offset + bi * bar + 1e-6), P = progOf(secs[si]); let k = globalChords ? bi : bi - secStartBar[si]; k = ((k % P.cycle) + P.cycle) % P.cycle; for (const x of P.L) { if (k < x.bars) return x.c; k -= x.bars; } return P.L[0].c; };
  // Modulation (lift: { at: 'drop' or intensity, by: semitones }): the climax section is raised as a whole, the last section returns to the original key (the ending chord is the original tonic)
  const liftOf = (t) => { if (!sc.lift) return 0; const s = secs[secAt(t)], at = sc.lift.at ?? 3; return (typeof at === 'number' ? s.energy >= at : s.name === at) ? sc.lift.by ?? 2 : 0; };
  const keyAt = (t) => { const L = liftOf(t); return L ? { ...key, root: (key.root + L) % 12 } : key; };
  const voice = (c, oct, L = 0) => c.iv.map((i) => 12 * (oct + 1) + c.root + i + L);
  const motif = parseMotif(sc.motif);
  const swing = sc.swing ?? 0.5;
  const firstBar = Math.floor((0 - offset) / bar) - 1, lastBar = Math.ceil((end - offset) / bar);
  const kicks = [], buses = [];
  const syn = (p) => (typeof p.synth === 'function' ? p.synth : SYNTHS[p.synth]);
  // Fills: one beat before a section change (two when rising to the top), the drums stop and play a fill, with a cymbal on the new section's first beat; before an impact section a reversed pad sucks in
  const hasDrum = (sc.parts || []).some((p) => DRUMS.has(p.synth) || p.play === 'drum'), hasBack = (sc.parts || []).some((p) => ['snare', 'clap', 'rim', 'chipsnare'].includes(p.synth));
  const fillKind = sc.fill === false ? null : sc.fill ?? (hasBack ? 'snare' : hasDrum ? 'toms' : null);
  const fills = [];
  // An impact follows right after (quick version: the transition covers it, then one empty beat, then the impact): leave the fill and cymbal to that impact
  for (let i = 1; i < secs.length; i++) { const s = secs[i], pv = secs[i - 1], nx = secs[i + 1]; if (s.stop || s.gap || s.at >= end || s.at < 2 * B) continue; if (nx && nx.hit && nx.at - s.at < 1.5 * B) continue; if (s.energy !== pv.energy || s.hit) fills.push({ a: s.at - (s.energy > pv.energy && s.energy >= 3 ? 2 : 1) * B, b: s.at, up: s.energy > pv.energy, s }); }
  const inFill = (t) => fillKind && fills.some((f) => t >= f.a - 1e-6 && t < f.b - 1e-6);
  // ---------- D: following the picture ----------
  // plan.moments (registered automatically by promo.js: hard cut cut, impact effect hit, logo / end-card name appearing name; hand-written films use F.musicCue(t, kind)).
  //   Score react: false turns all of it off, react: { cut: false } turns off one kind
  const react = sc.react === false ? {} : { hit: true, cut: true, name: true, stop: true, ...(typeof sc.react === 'object' ? sc.react : {}) };
  const snapB = (t) => offset + Math.round((t - offset) / B) * B;
  const mom = (plan.moments || []).filter((m) => react[m.kind] && m.t > B && m.t < end - B).map((m) => ({ ...m, t: m.kind === 'name' || m.kind === 'stop' ? snapB(m.t) : m.t }));
  const nameM = mom.find((m) => m.kind === 'name'), mutes = nameM ? [[nameM.t - B, nameM.t]] : [];
  const inMute = (t) => mutes.some(([a, b2]) => t >= a - 1e-6 && t < b2 - 1e-6);
  // ---------- B: human feel ----------
  // human 0–1 (default 0.6): dynamics vary (strong beats heavy, offbeats light, sixteenth hi-hats are light "ghost notes"), timing is a little loose (drums tightest, bass next, keys loosest, snare slightly behind),
  //   chords are strummed note by note as if played by hand, note lengths and pitches vary very slightly. All from the seeded random, so a frame renders the same every time
  const h = clamp(sc.human ?? 0.6, 0, 1), msec = (x) => x / 1000;
  const ACC = (j, steps) => { const q = (j * 16) / steps; return q % 16 === 0 ? 1 : q % 8 === 0 ? 0.93 : q % 4 === 0 ? 0.85 : q % 2 === 0 ? 0.76 : 0.64; };
  const STRUM = new Set(['piano', 'epiano', 'rhodes', 'pluck', 'stab', 'bell', 'lead', 'spiccato']);
  // Move by scale degrees (for melodic development): move m up / down by a number of scale notes
  const dia = (m, steps, k) => { const sc2 = MODES[k.mode]; let x = snapScale(m, k); for (let q = 0; q < Math.abs(steps); q++) { let y = x + Math.sign(steps); while (!inScale(y, k)) y += Math.sign(steps); x = y; } return x; };
  for (const [pi, p] of (sc.parts || []).entries()) {
    const fn = syn(p);
    if (!fn) { warnings.push(`第 ${pi + 1} 层"${p.name || p.synth}"：没有这个音色 ${p.synth}`); continue; }
    const bus = new Bus(duration), from = p.from ?? 0, to = p.to ?? 3;
    const isDrum = p.play === 'drum' || DRUMS.has(p.synth), role = isDrum ? (['snare', 'clap', 'rim', 'chipsnare'].includes(p.synth) ? 'back' : 'drum') : p.play === 'bass' ? 'bass' : 'keys';
    const JIT = { drum: 3, back: 3, bass: 6, keys: 10 }[role], vary = sc.vary !== false && p.vary !== false;
    let arpI = 0, offI = 0, strumDir = 1;
    // Width (pads and strings are wide by default): one copy left and one right, the right 12 ms late; arpeggios / plucks alternate left and right per note (spread)
    const width = p.width ?? ({ pad: 0.6, strings: 0.6, supersaw: 0.5, stab: 0.35, brass: 0.3, rhodes: 0.2, epiano: 0.2 }[p.synth] ?? 0), spread = p.spread ?? (p.play === 'arp' ? 0.45 : 0); let side = 1;
    const put = (buf, t, g, pan = p.pan ?? 0) => { if (t < 0 || t >= end) return; if (width > 0) { bus.put(buf, t, g * 0.78, clamp(pan - width, -1, 1)); bus.put(buf, t + 0.012, g * 0.78, clamp(pan + width, -1, 1)); } else if (spread > 0) { side = -side; bus.put(buf, t, g, clamp(pan + side * spread, -1, 1)); } else bus.put(buf, t, g, pan); };
    for (let bi = firstBar; bi <= lastBar; bi++) {
      const barStart = offset + bi * bar, si = secAt(barStart + 1e-6), sec = secs[si], c = chordAtBar(bi), L = liftOf(barStart + 1e-6), kk = keyAt(barStart + 1e-6);
      if (p.in && !p.in.includes(sec.name) && !p.in.includes(sec.energy)) continue;   // Orchestration by section: in names sections (or intensities); the layer plays only in those sections
      const pos = bi - secStartBar[si], phr = ((pos % 4) + 4) % 4, block = Math.floor(pos / 8);   // bar within the phrase (0–3), which 8-bar group
      // Per-section patterns: pattern may be one value or an object by section / intensity, and a value may also be an array (one per bar, used in turn)
      let pat = byE(p.pattern ?? (p.play === 'chord' ? 'x' : 'x...'), sec); if (Array.isArray(pat)) pat = pat[((pos % pat.length) + pat.length) % pat.length]; pat = String(pat);
      const steps = pat.length;
      const hitT = (j) => { let t = barStart + (j * bar) / steps; if (swing !== 0.5 && (steps === 8 ? j % 2 === 1 : steps === 16 ? j % 4 === 2 : false)) t += (swing - 0.5) * B; return t; };
      const holdLen = (j) => { let k = 1; while (pat[(j + k) % steps] === '-' && j + k < steps) k++; return (k * bar) / steps; };
      if (p.play === 'motif') {
        if (!motif.notes.length) continue;
        const mBars = Math.max(1, Math.ceil(motif.beats / 4));
        if (((bi % mBars) + mBars) % mBars !== 0) continue;
        // Melodic development (develop, on by default): within a section, the 1st, 3rd … statements are unchanged (question); the 2nd, 4th … step the second half down two degrees and land the last note on a chord tone (answer);
        //   build sections move up one degree each time (sequence); quiet sections (intensity ≤ 1) sing only the first half
        const occ = Math.floor(pos / mBars), dev = sc.develop !== false && p.develop !== false;
        const notes = motif.notes.filter((nt) => !(dev && sec.energy <= 1 && nt.at >= motif.beats / 2));
        notes.forEach((nt, ni) => {
          const t0 = barStart + nt.at * B; if (t0 < 0 || t0 >= end) return;
          if (nameM && t0 >= nameM.t - 1e-6 && t0 < nameM.t + motif.beats * B) return;   // the product-name phrase is sung by "following the picture"
          const e = energyAt(t0); if (e < from || e > to) return;
          let m = nt.m + 12 * (p.octaveShift ?? 0) + (p.upAt !== undefined && e >= p.upAt ? 12 : 0) + L;
          if (dev && sec.build) m = dia(m, Math.min(3, occ), kk);
          if (dev && !sec.build && occ % 2 === 1 && nt.at >= motif.beats / 2) { m = dia(m, -2, kk); if (ni === notes.length - 1) { const tones = voice(c, 4, L); m = tones.reduce((bb, x) => { const y = x + 12 * Math.round((m - x) / 12); return Math.abs(y - m) < Math.abs(bb - m) ? y : bb; }, m); } }
          m = snapScale(m, kk);
          const vel = 1 - (1 - (nt.at % 2 === 0 ? 1 : 0.86)) * h + (r() * 2 - 1) * 0.08 * h;
          put(fn([m + (r() * 2 - 1) * 0.03 * h], nt.dur * B * 0.95 * (1 + (r() * 2 - 1) * 0.06 * h), r, p), t0 + (r() * 2 - 1) * msec(JIT) * h, (p.gain ?? 0.16) * vel);
        });
        continue;
      }
      if (typeof p.play === 'function') { p.play({ t: barStart, bar, B, barIdx: bi, energyAt, chord: voice(c, p.octave ?? 4, L), key: kk, r, put: (buf, t, g, pan = 0) => { if (t >= 0 && t < end) bus.put(buf, t, g, pan); }, LIB }); continue; }
      const bassWalk = vary && p.play === 'bass' && phr === 3 && bi + 1 <= lastBar;
      // Dynamics change only relative weight, not the layer's overall loudness: pull the average velocity of this bar's hits back to 1
      let vSum = 0, vN = 0; for (let j = 0; j < steps; j++) if (pat[j] === 'x' || pat[j] === 'X') { vSum += (1 - (1 - ACC(j, steps)) * h) * (p.synth === 'hat' && ((j * 16) / steps) % 2 === 1 ? 0.7 : 1); vN++; } const vNorm = vN ? vSum / vN : 1;   // Last bar of the phrase: the bass's last half-beat leads to the next chord
      for (let j = 0; j < steps; j++) {
        const ch = pat[j]; if (ch !== 'x' && ch !== 'X') continue;
        let t = hitT(j); if (t < 0 || t >= end) continue;
        const e = energyAt(t); if (e < from || e > to) continue;
        if (isDrum && (inFill(t) || inMute(t))) continue;                     // On a fill beat and the beat before the product name appears: the drums make room
        if (bassWalk && t >= barStart + 3.5 * B - 1e-6) continue;
        if (vary && (p.synth === 'kick' || p.synth === 'chipkick') && pos % 8 === 7 && t >= barStart + 3 * B - 1e-6 && !inFill(barStart + bar - 1e-3)) continue;   // leave the last beat of every 8 bars empty
        const acc = ACC(j, steps), ghost = p.synth === 'hat' && ((j * 16) / steps) % 2 === 1 ? 0.7 : 1;
        const vel = ((1 - (1 - acc) * h) * ghost / vNorm) * (1 + (r() * 2 - 1) * 0.1 * h);
        const g = (p.gain ?? 0.3) * (ch === 'X' ? 1.3 : 1) * (p.gainByEnergy ? p.gainByEnergy[e] ?? 1 : 1) * vel;
        t += (r() * 2 - 1) * msec(JIT) * h + (role === 'back' ? msec(7) * h : 0);
        let len = p.len !== undefined ? p.len * B : holdLen(j) * (p.play === 'chord' ? 1 : 0.95);
        if (!isDrum) len *= 1 + (r() * 2 - 1) * 0.08 * h;
        const drift = () => (r() * 2 - 1) * 0.03 * h;   // ±3 cents
        if (isDrum) {
          const openHere = vary && p.synth === 'hat' && phr === 3 && j === steps - (steps >= 8 ? steps / 8 : 1);   // last eighth of the phrase: open hi-hat
          put(openHere ? SYNTHS.openhat(r, p) : fn(r, { ...p, tune: p.tune ? p.tune * (1 + (r() * 2 - 1) * 0.01 * h) : p.tune }), t, g);
          if (p.sidechain || p.synth === 'kick' || p.synth === 'chipkick') kicks.push(t);
          continue;
        }
        if (p.play === 'chord') {
          let notes = voice(c, p.octave ?? 4, L);
          if (vary && block % 2 === 1 && notes.length > 2) notes = [...notes.slice(1), notes[0] + 12];   // a different inversion in the second 8 bars
          if (STRUM.has(p.synth) && h > 0) { const ord = strumDir > 0 ? notes : [...notes].reverse(); strumDir = -strumDir; ord.forEach((m, q) => put(fn([m + drift()], len, r, p), t + q * msec(12) * h, g / Math.sqrt(notes.length) * 1.15)); }
          else put(fn(notes.map((m) => m + drift()), len, r, p), t, g);
        } else if (p.play === 'arp') {
          const tones = []; for (let k = 0; k < (p.range ?? 1); k++) tones.push(...voice(c, (p.octave ?? 4) + k, L));
          let order = p.order ?? 'up'; if (vary && phr === 3) order = order === 'down' ? 'up' : 'down'; else if (vary && block % 2 === 1 && order === 'up') order = 'updown';
          const n = tones.length, i = arpI++;
          const idx = order === 'down' ? n - 1 - (i % n) : order === 'updown' ? (() => { const L2 = 2 * n - 2 || 1, q = i % L2; return q < n ? q : L2 - q; })() : order === 'random' ? Math.floor(r() * n) : i % n;
          put(fn([tones[idx] + drift()], len, r, p), t, g);
        } else if (p.play === 'bass') {
          const offs = p.offsets ?? [0], root = 12 * ((p.octave ?? 2) + 1) + (c.bass ?? c.root) + L;
          put(fn([root + offs[offI++ % offs.length]], len, r, p), t, g);
        } else { warnings.push(`第 ${pi + 1} 层"${p.name || p.synth}"：play 只能是 chord / arp / bass / motif / drum 或一个函数`); break; }
      }
      // Bass leads to the next chord: on the last half-beat, play the scale note just below (or above) the next chord's root, like a passing note a bassist would add
      if (bassWalk) {
        const t = barStart + 3.5 * B, e = energyAt(t);
        if (t < end && e >= from && e <= to) { const nc = chordAtBar(bi + 1), L2 = liftOf(barStart + bar + 1e-6), root = 12 * ((p.octave ?? 2) + 1) + (nc.bass ?? nc.root) + L2, k2 = keyAt(barStart + bar + 1e-6), app = dia(root, (bi % 2) ? 1 : -1, k2);
          put(fn([app], 0.45 * B, r, p), t + (r() * 2 - 1) * msec(JIT) * h, (p.gain ?? 0.3) * 0.85); }
      }
    }
    const SPACE = { pad: 0.35, strings: 0.4, piano: 0.3, epiano: 0.28, rhodes: 0.32, pluck: 0.3, bell: 0.45, lead: 0.25, supersaw: 0.28, stab: 0.2, brass: 0.25, spiccato: 0.2, snare: 0.18, clap: 0.18, tom: 0.25, rim: 0.15, hat: 0.05, shaker: 0.05, openhat: 0.08 };
    const ECHO = { pluck: 0.14, bell: 0.2, lead: 0.15, supersaw: 0.15, rhodes: 0.08 };
    buses.push({ p, bus, name: p.name || p.synth, isDrum, duck: p.duck ?? (sc.sidechain && !isDrum), space: p.space ?? SPACE[p.synth] ?? 0, echo: p.echo ?? (p.play === 'motif' ? 0.2 : ECHO[p.synth] ?? 0) });
  }
  // Space: reverb, ping-pong echo (send amounts default per instrument; each layer may set space / echo; score space: false turns it off, space: { size, damp, mix }, echo: { beats, feedback, mix })
  if (hasMusic && sc.space !== false) {
    const sendR = new Float32Array(Math.ceil(duration * SR)), sendE = new Float32Array(sendR.length);
    for (const b of buses) { if (b.space) for (let i = 0; i < sendR.length; i++) sendR[i] += (b.bus.L[i] + b.bus.R[i]) * 0.5 * b.space; if (b.echo) for (let i = 0; i < sendE.length; i++) sendE[i] += (b.bus.L[i] + b.bus.R[i]) * 0.5 * b.echo; }
    const sp = { size: 0.75, damp: 0.4, mix: 1, ...(typeof sc.space === 'object' ? sc.space : {}) }, [hl, hr] = hall(sendR, sp.size, sp.damp), rb = new Bus(duration);
    for (let i = 0; i < rb.n; i++) { rb.L[i] = hl[i] * 0.9 * sp.mix; rb.R[i] = hr[i] * 0.9 * sp.mix; }
    buses.push({ p: {}, bus: rb, name: '混响', isDrum: false, duck: !!sc.sidechain, quiet: true });
    if (sc.echo !== false) { const ec = { beats: 0.75, feedback: 0.35, mix: 1, ...(typeof sc.echo === 'object' ? sc.echo : {}) }, [el, er] = pingpong(sendE, ec.beats * B, ec.feedback), eb = new Bus(duration); for (let i = 0; i < eb.n; i++) { eb.L[i] = el[i] * ec.mix; eb.R[i] = er[i] * ec.mix; } buses.push({ p: {}, bus: eb, name: '回声', isDrum: false, duck: !!sc.sidechain, quiet: true }); }
  }
  // Fills, cymbals, reversals (a separate layer, "fills")
  if (hasMusic && (fillKind || sc.swell !== false)) {
    const fb = new Bus(duration), drumG = Math.max(0.2, ...(sc.parts || []).filter((p) => DRUMS.has(p.synth)).map((p) => p.gain ?? 0.3));
    for (const f of fills) {
      if (fillKind) {
        const n16 = Math.round((f.b - f.a) / (B / 4)), TOMS = [52, 50, 47, 45, 43, 40, 38, 36];
        for (let q = 0; q < n16; q++) {
          const t = f.a + q * (B / 4) + (r() * 2 - 1) * msec(3) * h, ramp = 0.45 + 0.55 * (q / Math.max(1, n16 - 1));
          if (fillKind === 'snare') { if (n16 > 4 && q % 2 === 1 && q < n16 - 4) continue; fb.put(SYNTHS.snare(r, { tone: 200, bright: 4600 }), t, drumG * 0.75 * ramp, (q % 2 ? 0.15 : -0.15)); }
          else { if (q % 2 === 1 && q < n16 - 2) continue; fb.put(SYNTHS.tom(r, { note: TOMS[Math.min(TOMS.length - 1, Math.floor((q / n16) * TOMS.length))], len: 0.5 }), t, drumG * 0.9 * ramp, 0.4 - 0.8 * (q / n16)); }
        }
        if (f.up || f.s.hit) fb.put(SYNTHS.crash(r, {}), f.b, drumG * 0.55, 0.2);
      }
      // Before an impact section: the next chord's pad reversed for a beat and a half, sucked into the impact
      if (sc.swell !== false && f.s.hit) { const nc = chordAtBar(barOf(f.b + 1e-3)), sw = padChord(voice(nc, 4, liftOf(f.b + 1e-3)), 1.5 * B, r, 2600, 0.01).slice(0, Math.round(1.5 * B * SR)).reverse(); for (let i = 0; i < sw.length; i++) sw[i] *= (i / sw.length) ** 2; fb.put(sw, f.b - 1.5 * B, 0.16, 0); }
    }
    buses.push({ p: {}, bus: fb, name: '过门', isDrum: true, duck: false });
  }
  // Noise / ambience layer (optional)
  if (sc.bed) { const b = new Bus(duration); b.put(typeof sc.bed === 'function' ? sc.bed(duration, r, LIB) : crackle(duration, r), 0, sc.bedGain ?? 1, 0); buses.push({ p: {}, bus: b, name: '底噪', isDrum: false, duck: false }); }
  // Sections: a riser in the bar before intensity rises; hit sections open with an impact
  for (let i = 0; i < secs.length; i++) {
    const s = secs[i], prev = secs[i - 1];

  }
  // Following the picture: hard cuts (only in the strongest sections) and impact effects get a chord stab + bass; when the product name appears the motif sings once with a cymbal; at a stop the music slams back
  if (hasMusic && mom.length) {
    const rb = new Bus(duration), hitSyn = SYNTHS[sc.hitSynth ?? 'stab'] ?? SYNTHS.stab; let last = -9;
    for (const m of mom) {
      if (secs.some((x) => x.hit && Math.abs(x.at - m.t) < 0.12)) continue;   // the section opening already has an impact
      const e = energyAt(m.t + 1e-3), c = chordAtBar(barOf(m.t + 1e-3)), L2 = liftOf(m.t + 1e-3);
      if ((m.kind === 'cut' && e >= 3) || m.kind === 'hit' || m.kind === 'stop') {
        if (m.t - last < B * 0.9) continue; last = m.t;
        rb.put(hitSyn(voice(c, 4, L2), 0.2, r, { cut: 3000 }), m.t, 0.13 * (m.kind === 'cut' ? 1 : 1.25), 0);
        rb.put(SYNTHS.sub([12 * 3 + (c.bass ?? c.root) + L2], 0.35, r, {}), m.t, 0.13, 0);
      }
      if (m.kind === 'name' && motif.notes.length) {
        const mp = (sc.parts || []).find((p) => p.play === 'motif' && partOn(p, m.t + 1e-3)) || (sc.parts || []).find((p) => p.play === 'motif') || { synth: 'bell', gain: 0.15 };
        const fnm = syn(mp) || SYNTHS.bell, kk2 = keyAt(m.t + 1e-3);
        for (const nt of motif.notes) { const t0 = m.t + nt.at * B; if (t0 >= end) break; rb.put(fnm([snapScale(nt.m + 12 * (mp.octaveShift ?? 0) + L2, kk2)], nt.dur * B * 0.95, r, mp), t0, (mp.gain ?? 0.16) * 1.15, 0); }
        if (hasDrum) rb.put(SYNTHS.crash(r, {}), m.t, 0.16, 0.2);
      }
    }
    buses.push({ p: {}, bus: rb, name: '跟着画面', isDrum: false, duck: false, quiet: true, space: 0.25 });
  }
  // Ending: impact + tonic chord (mid/high layers keep it audible on phone speakers) + tail
  const tonic = voice(parseChord(Object.keys(NOTE).find((k) => NOTE[k] === key.root) + (['minor', 'dorian', 'phrygian'].includes(key.mode) ? 'm' : ''), key), 4);
  const endBus = new Bus(duration);
  if (hasMusic) endBus.put((sc.endSynth ? SYNTHS[sc.endSynth] : SYNTHS.pad)(tonic, (o.tail ?? 1.6) + 0.5, r, { cut: 2200, attack: 0.05 }), end, 0.25, 0);
  buses.push({ p: {}, bus: endBus, name: '结尾和弦', isDrum: false, duck: false, quiet: true });
  // Effects: synthesised from this product's sound design (impacts, risers and the end-card sound logo are in there too)
  // Narrated films: speaking spans; light effects are not played while speaking (falling paper slips and small taps fight the voice)
  const V = o.voice && o.voice.lines && o.voice.lines.some((l) => !l.silence) ? o.voice : null, spoken = V ? V.lines.filter((l) => !l.silence) : [];
  const speaking = (t) => spoken.some((l) => t >= l.start - 0.12 && t <= l.end + 0.2);
  let sfxDropped = 0;
  const planS = V ? { ...plan, sfx: (plan.sfx || []).filter((e) => { const drop = !e.cut && !e.keep && (e.gain ?? 1) < (V.sfxKeep ?? 0.45) && speaking(e.t); if (drop) sfxDropped++; return !drop; }) } : plan;
  const sx = renderSfx({ ...planS, logoAt: end }, o.palette, duration, seed), sfx = sx;
  // Pitched sounds in the effects must be in the same key as the music, or they clash
  if (hasMusic && o.palette) {
    const off = new Set(), walk = (x) => { if (!x || typeof x !== 'object') return; if (Array.isArray(x)) return x.forEach(walk); for (const [k, v] of Object.entries(x)) { if ((k === 'note' || k === 'notes') && v) [].concat(v).forEach((nt) => { if (typeof nt === 'string' && /^[A-G][#b]?-?\d$/.test(nt) && !inScale(parseNote(nt), key)) off.add(nt); }); else walk(v); } };
    walk(o.palette);
    if (off.size) warnings.push(`声音设计里这些音不在配乐的调（${key.name}）里：${[...off].join('、')}——改成调内音，否则和配乐会打架`);
  }
  warnings.push(...sx.warnings);
  const n0 = Math.ceil(duration * SR);
  // Sidechain (when the score has sidechain: true): other layers dip after each kick and come back
  const n = n0, duckEnv = new Float32Array(n).fill(1);
  if (sc.sidechain) for (const k of kicks) { const s0 = Math.round(k * SR), d = Math.round(0.22 * SR); for (let i = 0; i < d && s0 + i < n; i++) duckEnv[s0 + i] = Math.min(duckEnv[s0 + i], 0.55 + 0.45 * (i / d)); }
  // Section loudness: the higher the intensity, the louder the music; gap clears the music before the section starts
  const EG = [0.38, 0.56, 0.8, 1.0], gEnv = new Float32Array(n), kk = 1 - Math.exp(-1 / (0.35 * SR));
  let gv = EG[clamp(energyAt(0), 0, 3)];
  for (let i = 0; i < n; i++) { gv += (EG[clamp(energyAt(i / SR), 0, 3)] - gv) * kk; gEnv[i] = gv; }
  for (const m of mom) if (m.kind === 'stop') { const a = Math.round((m.t - B) * SR), b2 = Math.round(m.t * SR), f = Math.round(0.03 * SR); for (let i = Math.max(0, a); i < Math.min(b2, n); i++) gEnv[i] *= 1 - 0.85 * Math.min(1, (i - a) / f, (b2 - i) / f); }   // stop: the music almost fully stops for the beat before
  for (const s of secs) if (s.gap) { const a = Math.round((s.at - s.gap) * SR), b = Math.round(s.at * SR), f = Math.round(0.04 * SR); for (let i = Math.max(0, a); i < Math.min(b, n); i++) gEnv[i] *= i - a < f ? 1 - (0.92 * (i - a)) / f : 0.08; }
  // Mix
  let mL = new Float32Array(n), mR = new Float32Array(n);
  // Narrated films: the busy layer is mixed separately (drops out while speaking)
  const BUSY = new Set(['lead', 'supersaw', 'bell', 'stab', 'brass', 'gong', 'woodblock', 'crash']), split = V && sc.underVoice !== 'full';
  const isBusy = (b) => (b.p && b.p.underVoice === 'keep' ? false : b.p && b.p.underVoice === 'busy' ? true : b.isDrum || (b.p && (b.p.play === 'motif' || b.p.play === 'arp' || BUSY.has(b.p.synth))) || b.name === '跟着画面');
  let bL = split ? new Float32Array(n) : null, bR = split ? new Float32Array(n) : null;
  for (const b of buses) { const dk = b.duck, toB = split && isBusy(b), oL = toB ? bL : mL, oR = toB ? bR : mR; for (let i = 0; i < n; i++) { const g = dk ? duckEnv[i] : 1; oL[i] += b.bus.L[i] * g; oR[i] += b.bus.R[i] * g; } }
  if (sc.lowpass) { mL = svf(mL, sc.lowpass, 0.5, 'lp'); mR = svf(mR, sc.lowpass, 0.5, 'lp'); if (split) { bL = svf(bL, sc.lowpass, 0.5, 'lp'); bR = svf(bR, sc.lowpass, 0.5, 'lp'); } }
  // Moves on the whole mix (planned together with the picture's rhythm sheet: scene roles in formats.js mark them automatically)
  //   build: true  this section goes from muffled to bright: the low-pass opens up from 300Hz (building up; the next section bursts)
  //   stop: seconds   before this section starts: the music slows to a stop like tape, then near silence, until the section slams back in on the beat
  for (let i = 0; i < secs.length; i++) {
    const s = secs[i], nx = secs[i + 1];
    if (s.build) {
      const a = Math.max(0, Math.round(s.at * SR)), b = Math.min(n, Math.round((nx ? nx.at : duration) * SR)), len = b - a, xf = Math.round(0.03 * SR);
      if (len > SR * 0.5) for (const ch of split ? [mL, mR, bL, bR] : [mL, mR]) {
        const seg = svf(ch.slice(a, b), (t) => 300 * Math.pow(6500 / 300, Math.min(1, t / (len / SR)) ** 1.6), 0.9, 'lp');
        for (let i2 = 0; i2 < len; i2++) { const w = Math.min(1, i2 / xf, (len - i2) / xf); ch[a + i2] = seg[i2] * w + ch[a + i2] * (1 - w); }
      }
    }
    if (s.stop) {
      const tape = Math.min(0.4, s.stop), a = Math.max(0, Math.round((s.at - s.stop) * SR)), b = Math.min(n, Math.round(s.at * SR)), m = Math.round(tape * SR);
      for (const ch of split ? [mL, mR, bL, bR] : [mL, mR]) {
        const src = ch.slice(a, Math.min(n, a + m));
        let pos = 0;
        for (let i2 = 0; i2 < m && a + i2 < b; i2++) {   // playback speed falls linearly from 1 to 0: pitch and tempo drop together
          const q = i2 / m, rate = 1 - q, j = Math.floor(pos), f = pos - j;
          ch[a + i2] = ((src[j] ?? 0) * (1 - f) + (src[j + 1] ?? 0) * f) * (1 - q * q);
          pos += rate;
        }
        for (let i2 = a + m; i2 < b; i2++) ch[i2] = 0;
      }
    }
  }
  const L = new Float32Array(n), R = new Float32Array(n);
  let sum = 0;
  // Balance of music + effects: the music sits underneath (set by average loudness), effects on top (set by peak);
  // when an important effect sounds, the music ducks a little and comes back (effects are never buried)
  let ms = 0, mc = 0; for (let i = 0; i < n; i += 4) { const v = (mL[i] + (split ? bL[i] : 0)) * gEnv[i]; if (v) { ms += v * v; mc++; } }
  // Levels: for narrated films with a given voice loudness → music (when not ducked) sits gapDb under the voice, effect peaks about 4 dB above the voice's average loudness; otherwise music and effects use their own balance
  const lev = !!(V && V.rms), mRms = Math.sqrt(ms / Math.max(1, mc)) || 1e-6;
  const musicK = hasMusic ? ((lev ? V.rms * Math.pow(10, -(V.gapDb ?? 11) / 20) : 0.07) * (sc.level ?? 1)) / mRms : 0;
  let sp = 1e-6; for (let i = 0; i < n; i++) sp = Math.max(sp, Math.abs(sfx.L[i]), Math.abs(sfx.R[i]));
  const sfxK = lev ? (V.rms * 1.6) / sp : 0.7 / sp, duck = new Float32Array(n).fill(1);
  if (hasMusic && (sc.duckUnderSfx ?? true)) {
    const att = 1 - Math.exp(-1 / (0.005 * SR)), rel = 1 - Math.exp(-1 / (0.25 * SR)), sk = lev ? 0.7 / (V.rms * 1.6) : 1; let ev = 0;
    for (let i = 0; i < n; i++) { const x = Math.max(Math.abs(sfx.L[i]), Math.abs(sfx.R[i])) * sfxK * sk; ev += (x - ev) * (x > ev ? att : rel); duck[i] = 1 - 0.5 * clamp((ev - 0.08) / 0.3); } // at most about 6 dB down
  }
  // Narration ducking: the same method as an explainer's background music (one control-envelope point every 10 ms, down in 0.15 s, back in 0.5 s)
  // merge: gaps between lines shorter than this many seconds count as continuous speech (the busy layer returns only in real pauses, not popping in and out between breaths)
  const voiceEnv = (db, merge = 0) => {
    const out = new Float32Array(n).fill(1); if (!V) return out;
    const cr = 100, nc = Math.ceil(n / SR * cr), want = new Float32Array(nc).fill(1), dk = Math.pow(10, -db / 20);
    spoken.forEach((l, j) => { const nx = spoken[j + 1], e2 = nx && nx.start - l.end < merge ? nx.start : l.end; for (let c = Math.max(0, Math.floor((l.start - 0.12) * cr)); c < Math.min(nc, Math.ceil((e2 + 0.2) * cr)); c++) want[c] = dk; });
    let cur = want[0]; const g = new Float32Array(nc);
    for (let c = 0; c < nc; c++) { const k = want[c] < cur ? 1 - Math.exp(-1 / (0.15 * cr)) : 1 - Math.exp(-1 / (0.5 * cr)); cur += (want[c] - cur) * k; g[c] = cur; }
    for (let i = 0; i < n; i++) out[i] = g[Math.min(nc - 1, ((i / SR) * cr) | 0)];
    return out;
  };
  const vDuck = voiceEnv(V ? V.duckDb ?? 8 : 0), vBusy = split ? voiceEnv(40, 1.5) : null, vSfx = V ? voiceEnv(6) : null;
  // Measure: how far the music sits under the voice while speaking (music only, effects excluded)
  let us = 0, uc = 0;
  for (let i = 0; i < n; i++) {
    const fade = Math.min(1, i / (0.05 * SR), (n - i) / (0.5 * SR)), k = gEnv[i] * musicK * duck[i], sv = vSfx ? vSfx[i] : 1;
    const ml = mL[i] * vDuck[i] + (split ? bL[i] * vBusy[i] : 0), mr = mR[i] * vDuck[i] + (split ? bR[i] * vBusy[i] : 0);
    if (V && i % 7 === 0 && vSfx[i] < 0.6) { us += (ml * k) ** 2 + (mr * k) ** 2; uc += 2; }
    L[i] = (ml * k + sfx.L[i] * sfxK * sv) * fade; R[i] = (mr * k + sfx.R[i] * sfxK * sv) * fade; sum += L[i] * L[i] + R[i] * R[i];
  }
  const underDb = V && hasMusic && uc ? 20 * Math.log10((Math.sqrt(us / uc) || 1e-9) / (V.rms || 0.07)) : null;
  if (lev && underDb !== null && underDb > -15) warnings.push(`旁白：说话时配乐只比人声低 ${(-underDb).toFixed(0)} dB（要 15 dB 以上，人声才清楚）——乐谱的 level 调小，或者 underVoice 别用 'full'`);
  if (V) { const ss = spoken.reduce((a2, l) => a2 + (l.end - l.start), 0), inS = (planS.sfx || []).filter((e) => speaking(e.t)).length; if (ss > 0 && inS / ss > 0.6) warnings.push(`旁白：说话时平均每秒 ${(inS / ss).toFixed(1)} 个音效——和人声抢，只留关键时刻（换场、大标题、人物倒下），其余写小的 gain（< 0.45，说话时自动不播）`); }
  if (lev) { for (let i = 0; i < n; i++) { L[i] = Math.tanh(L[i]); R[i] = Math.tanh(R[i]); } }
  else {
    // With music: align by average loudness; effects only: align by peak (sparse effects pulled up by average loudness get pushed too loud and clip)
    let peak = 1e-6; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    const g = 0.75 / peak; // The balance between them is set: place the whole by peak at a safe level; final loudness is unified by loudnorm at render time
    for (let i = 0; i < n; i++) { L[i] = Math.tanh(L[i] * g * 1.2) / 1.7; R[i] = Math.tanh(R[i] * g * 1.2) / 1.7; }
  }
  // ---- E: monotony (music only, effects excluded) ----
  //   Per bar: onsets on a 16-step grid (rhythm) + energy in 8 bands (timbre); neighbouring bars with nearly identical rhythm and timbre = "verbatim loop". Also checks whether sections sound alike, whether the orchestration changes, and whether it is mono
  const sheet = [];
  if (hasMusic) {
    const mm = new Float32Array(n); let mid2 = 0, side2 = 0;
    for (let i = 0; i < n; i++) { const a2 = (mL[i] + mR[i]) * 0.5 * gEnv[i], d2 = (mL[i] - mR[i]) * 0.5 * gEnv[i]; mm[i] = a2; mid2 += a2 * a2; side2 += d2 * d2; }
    const widthDb = 10 * Math.log10((side2 + 1e-9) / (mid2 + 1e-9));
    const bandsF = [120, 250, 500, 1000, 2000, 4000, 8000].map((f) => svf(mm, f, 1.2, 'bp'));
    const nb = Math.max(0, Math.floor((end - Math.max(0, offset)) / bar)), b0 = Math.max(0, offset);
    const cosv = (a, b) => { let d = 0, x = 0, y = 0; for (let k = 0; k < a.length; k++) { d += a[k] * b[k]; x += a[k] * a[k]; y += b[k] * b[k]; } return d / (Math.sqrt(x * y) + 1e-12); };
    const RH = [], SP = [], LV = [];
    for (let bi = 0; bi < nb; bi++) {
      const a = Math.round((b0 + bi * bar) * SR), len = Math.round(bar * SR), st = Math.floor(len / 16), e16 = [];
      for (let q = 0; q < 16; q++) { let sq = 0; for (let i = a + q * st; i < a + (q + 1) * st && i < n; i += 2) sq += mm[i] * mm[i]; e16.push(Math.sqrt(sq / (st / 2))); }
      RH.push(e16.map((v, q) => Math.max(0, v - (q ? e16[q - 1] : e16[15]))));
      SP.push(bandsF.map((bf) => { let sq = 0; for (let i = a; i < a + len && i < n; i += 4) sq += bf[i] * bf[i]; return Math.log(sq + 1e-9); }));
      LV.push(10 * Math.log10(e16.reduce((x, v) => x + v * v, 0) / 16 + 1e-12));
    }
    const spN = SP.map((v) => { const m2 = v.reduce((x, y) => x + y, 0) / v.length; return v.map((x) => x - m2); });
    const same = (i, j) => cosv(RH[i], RH[j]) > 0.95 && cosv(spN[i], spN[j]) > 0.985 && Math.abs(LV[i] - LV[j]) < 1.5;
    let run = 1, best = { k: 1, a: 0 }; for (let i = 1; i < nb; i++) { run = same(i, i - 1) ? run + 1 : 1; if (run > best.k) best = { k: run, a: i - run + 1 }; }
    const kinds = []; for (let i = 0; i < nb; i++) if (!kinds.some((k) => same(i, k))) kinds.push(i);
    const setOf = (sct) => (sc.parts || []).filter((p) => partOn(p, sct.at + 1e-3)).map((p) => p.name || p.synth).join('|');
    const sets = new Set(secs.filter((x) => x.at < end).map(setOf));
    const secV = secs.filter((x) => x.at < end).map((x, i, arr) => { const a = Math.max(0, Math.floor((x.at - b0) / bar)), b = Math.min(nb, Math.floor(((arr[i + 1]?.at ?? end) - b0) / bar)); if (b <= a) return null; const v = spN[0].map((_, k) => spN.slice(a, b).reduce((y, w) => y + w[k], 0) / (b - a)); return { name: x.name || `强度 ${x.energy}`, v, lv: LV.slice(a, b).reduce((y, w) => y + w, 0) / (b - a), set: setOf(x) }; });
    if (best.k >= 4 && best.k * bar >= 10) warnings.push(`配乐：${(b0 + best.a * bar).toFixed(1)}–${(b0 + (best.a + best.k) * bar).toFixed(1)} 秒同一个小节原样循环了 ${best.k} 小节——这一段换节奏型（pattern 按段落写）、加 / 减一层（in），或者让旋律进来`);
    for (let i = 1; i < secV.length; i++) { const A2 = secV[i - 1], B2 = secV[i]; if (A2 && B2 && A2.name !== B2.name && A2.set === B2.set && cosv(A2.v, B2.v) > 0.995 && Math.abs(A2.lv - B2.lv) < 1.5) warnings.push(`配乐："${A2.name}"段和"${B2.name}"段听起来几乎一样（同样的配器、同样的音色和响度）——换配器（in）、换节奏型，或者拉开强弱`); }
    if (nb >= 8 && kinds.length / nb < 0.4) warnings.push(`配乐：整首只有 ${kinds.length} 种小节（共 ${nb} 小节）——同样的东西一直在重复：按段落换和弦（chords 写对象）、换节奏型、让乐器进出`);
    if (secs.length >= 3 && sets.size <= 1) warnings.push('配乐：每一段的配器都一样——用 in 让乐器按段落进出（开头少、高潮多、收尾回到开头的乐器），这是最能听出变化的');
    if (widthDb < -20) warnings.push(`配乐几乎是单声道（立体声宽度 ${widthDb.toFixed(0)} dB）：铺底写 width、分解和弦写 spread，混响 space 别关`);
    const nHit = mom.filter((m) => m.kind !== 'name' && (m.kind !== 'cut' || energyAt(m.t + 1e-3) >= 3)).length;
    sheet.push(`配乐：不同的小节 ${kinds.length}/${nb} · 最长原样循环 ${best.k} 小节 · 段落配器 ${sets.size} 种 · 立体声宽度 ${widthDb.toFixed(0)} dB · 跟着画面：重音 ${nHit} 处${nameM ? '、产品名出现时唱动机' : ''}`);
  }
  // ---- Checks: each layer's share of perceived loudness, how much is audible on phone speakers, how many layers sound at once (the Agent can't hear, so it judges the mix by these numbers) ----
  // Perceived loudness: filter out below 150Hz before measuring energy (the ear is insensitive to lows; raw energy would always make kick and bass "the loudest")
  // Measure a layer's share only during the spans where it plays (a layer that only appears at the climax has a tiny share over the whole piece, but is audible at the climax)
  const hpSq = (Lb, Rb) => { const m = new Float32Array(n); for (let i = 0; i < n; i++) m[i] = (Lb[i] + Rb[i]) / 2; const h = svf(m, 150, 0.7, 'hp'); const q = new Float32Array(Math.ceil(n / 4)); for (let i = 0, j = 0; i < n; i += 4, j++) q[j] = h[i] * h[i]; return q; };
  const named = buses.filter((b) => !b.quiet), sq = named.map((b) => hpSq(b.bus.L, b.bus.R)), allSq = new Float32Array(sq[0] ? sq[0].length : 0);
  for (const q of sq) for (let j = 0; j < q.length; j++) allSq[j] += q[j];
  const layers = named.map((b, k) => {
    let a = 0, t2 = 0;
    for (let j = 0; j < allSq.length; j++) { if (!partOn(b.p, (j * 4) / SR)) continue; a += sq[k][j]; t2 += allSq[j]; }
    return { name: b.name, share: t2 ? a / t2 : 0 };
  });
  for (const x of layers) {
    if (x.share > 0.5 && layers.length > 2) warnings.push(`"${x.name}"在它出现的段落里占了听感响度的 ${(x.share * 100).toFixed(0)}%，盖住了其他层：把它的 gain 调低`);
    if (x.share < 0.01) warnings.push(`"${x.name}"在它出现的段落里几乎听不到（占 ${(x.share * 100).toFixed(1)}%）：调高 gain，或者删掉这一层`);
  }
  // Phone speakers: how many dB the energy above 150Hz is below the full band (phone speakers can't play lower). Films approved in earlier reviews were about -3 to -5 dB
  const energy = (x) => { let s = 0; for (let i = 0; i < x.length; i += 4) s += x[i] * x[i]; return s; };
  const mono = new Float32Array(n); for (let i = 0; i < n; i++) mono[i] = (L[i] + R[i]) / 2;
  const phoneDb = 10 * Math.log10((energy(svf(mono, 150, 0.7, 'hp')) + 1e-12) / (energy(mono) + 1e-12));
  if (phoneDb < -8) warnings.push(`手机外放只听得到 ${phoneDb.toFixed(1)} dB（150Hz 以上比全频段低这么多；正常约 -3 ~ -5）：低音太重——减底鼓 / 贝斯 / 低音铺底，或加中音区的层`);
  const bands = { phoneDb };
  // Layers sounding at once (each section counted by its intensity and name — layers with in only count in their sections)
  const crowd = new Set();
  for (const sct of secs) { const t0 = sct.at + 1e-3, mel = (sc.parts || []).filter((p) => partOn(p, t0) && !(p.play === 'drum' || DRUMS.has(p.synth))); const k = sct.name || `强度 ${sct.energy}`; if (mel.length > 5 && !crowd.has(k)) { crowd.add(k); warnings.push(`"${k}"段同时有 ${mel.length} 层有音高的乐器：太挤、会糊——最多 4–5 层`); } }
  return { L, R, leveled: lev, info: { underDb, sfxDropped, hasMusic, sound: (o.palette && o.palette.name) || DEFAULT_PALETTE.name, sfxUsed: sx.used, name: hasMusic ? sc.name || '乐谱' : '（不要配乐）', key: key.name, chords: [...progs.values()].map((P) => P.L.map((x) => x.c.name + (x.bars > 1 ? `×${x.bars}` : '')).join(' ')).join(' / '), layers, bands, warnings, sheet } };
}
export function writeWav(file, L, R) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4); buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4); }
  fs.writeFileSync(file, buf);
}

// Load the project's sound.js (sound design) or score.js (music score, optional): copy to .mjs and import, avoiding Node's module-type warning
export async function loadModule(file) {
  const tmp = path.join(os.tmpdir(), `promo-mod-${hashStr(file)}-${Math.round(fs.statSync(file).mtimeMs)}.mjs`);
  fs.copyFileSync(file, tmp);
  return (await import(pathToFileURL(tmp).href)).default;
}

// Decide from the file name whether we are run directly: the command line still works when run through the forwarding files at the old paths (explainer/scripts/, promo/scripts/)
const isMain = process.argv[1] && path.basename(process.argv[1]) === 'music.mjs';
if (isMain) {
  const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
  const dur = Number(arg('demo', 20)), bpm = Number(arg('bpm', 120)), B = 60 / bpm;
  const palette = arg('sound') ? await loadModule(path.resolve(arg('sound'))) : undefined;
  const score = arg('score') ? await loadScore(arg('score')) : null;
  // A sequence of events for auditioning: whip, click, typing, tick, impact type, notification, riser + impact, shutter … ending with the sound logo
  const sfx = [['whoosh', 1, { dur: 0.5, dir: 1 }], ['click', 2.5], ['type', 3], ['type', 3.12], ['type', 3.25], ['type', 3.4], ['tick', 4.5], ['impact', 5.5, { size: 0.9 }], ['pop', 7], ['whoosh', 8, { dur: 0.8, dir: -1 }], ['shutter', 9.5], ['whoosh', 11, { dur: 0.3, dir: 1, size: 0.3 }], ['click', 12.5], ['tick', 13], ['tick', 13.5], ['boom', 15]]
    .filter(([, t]) => t < dur - 3).map(([type, t, o = {}]) => ({ type, t: Math.round(t / B * 2) * B / 2, gain: 1, ...o }));
  const plan = { bpm, offset: 0, duration: dur, music: { seed: arg('seed', 'demo') }, sfx,
    sections: [{ at: 0, energy: 1 }, { at: Math.round(dur * 0.35 / (4 * B)) * 4 * B, energy: 2, hit: true }, { at: Math.round(dur * 0.7 / (4 * B)) * 4 * B, energy: 3, hit: true }] };
  const { L, R, info } = renderPlan(plan, { score, palette });
  const out = arg('out', 'sound-demo.wav');
  writeWav(out, L, R);
  console.log(`试听：${out}（声音设计：${info.sound}；配乐：${info.name}）`);
  console.log(`  用到的声音：${Object.entries(info.sfxUsed).map(([k, v]) => `${k}×${v}`).join('，')}；手机外放 ${info.bands.phoneDb.toFixed(1)} dB`);
  for (const w of info.warnings) console.log('  ! ' + w);
}
