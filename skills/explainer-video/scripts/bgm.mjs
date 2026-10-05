#!/usr/bin/env node
// bgm.mjs: synthesizes background music in code (no music files or libraries needed).
// The music is arranged along the timeline: it enters softly on the cover; each chapter starts a new phrase with a different chord progression and arpeggio;
// after the narration ends it returns to the tonic chord, resolves and fades out. The music ducks automatically while someone is speaking (per-line timing) and comes back up during pauses and transitions.
// The volume is matched automatically to the loudness of the narration.
//
// Called automatically by render.mjs. To audition it on its own:
//   node bgm.mjs <project dir>                  generate the full background music from bgm in script.json → audio/bgm.wav
//   node bgm.mjs <project dir> --demo          a 30-second preview of each style (no ducking) → review/bgm-<style>.m4a
//   node bgm.mjs <project dir> --style history switch to another style for this run
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;

// ---------- styles ----------
// Chords are written as [root in semitones above the tonic, chord type]; each chapter takes the next progression from progs in turn
const CHORDS = { maj: [0, 4, 7], min: [0, 3, 7], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], sus2: [0, 2, 7], add9: [0, 4, 7, 14], open: [0, 7, 14] };
export const STYLES = {
  // Phenomenon / concept explainers: warm pad + marimba arpeggio + a very light lo-fi beat
  bright: {
    name: 'Light Science', tempo: 86, key: 60, pad: 0.8, bass: 1, arp: 'marimba', rate: 2, drums: 'lofi', bell: true,
    progs: [[[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']], [[9, 'min'], [5, 'maj'], [0, 'maj'], [7, 'maj']], [[5, 'maj7'], [7, 'maj'], [4, 'min'], [9, 'min']], [[0, 'add9'], [9, 'min7'], [5, 'maj7'], [7, 'sus2']]],
    pats: [[0, 1, 2, 3, 2, 1, 2, 3], [0, 2, 1, 3, 0, 2, 1, 3], [0, null, 2, 1, 3, null, 2, 1], [3, 2, 1, 0, 1, 2, 3, 2]],
  },
  // Problem walkthroughs: just a slow pad and sparse piano notes, so it doesn't get in the way of thinking
  calm: {
    name: 'Calm Focus', tempo: 64, key: 62, pad: 1, bass: 0.6, arp: 'piano', rate: 1, drums: null, bell: false,
    progs: [[[0, 'maj7'], [5, 'maj7']], [[9, 'min7'], [5, 'maj7'], [0, 'maj7'], [7, 'sus2']], [[2, 'min7'], [7, 'sus2'], [0, 'maj7'], [9, 'min7']]],
    pats: [[0, 2, 1, 3], [0, null, 2, null], [1, 3, 2, null], [0, 1, null, 2]],
  },
  // Classical allusions / history: pentatonic scale (gong, shang, jue, zhi, yu) + guzheng-style plucks + a deep drum
  history: {
    name: 'Ancient Tale', tempo: 72, key: 62, pad: 0.8, bass: 0.9, arp: 'zheng', rate: 2, drums: 'drum', bell: true, penta: true,
    progs: [[[0, 'open'], [9, 'min'], [2, 'open'], [7, 'open']], [[9, 'min'], [7, 'open'], [0, 'open'], [0, 'open']], [[2, 'open'], [9, 'min'], [7, 'open'], [0, 'open']]],
    pats: [[0, null, 2, 1, null, 3, 2, null], [0, 1, 2, 4, 3, null, 2, 1], [4, 3, 2, null, 1, 2, 0, null], [0, 2, null, 3, 4, null, 3, 2]],
  },
  // Vocabulary / how-to tutorials: bright plucks, slightly faster tempo, shaker
  playful: {
    name: 'Bright Playful', tempo: 104, key: 65, pad: 0.6, bass: 1, arp: 'pluck', rate: 2, drums: 'shaker', bell: true,
    progs: [[[0, 'maj'], [5, 'maj'], [7, 'maj'], [5, 'maj']], [[0, 'maj'], [9, 'min'], [5, 'maj'], [7, 'maj']], [[5, 'maj'], [0, 'maj'], [7, 'maj'], [0, 'maj']]],
    pats: [[0, 1, 2, 1, 3, 1, 2, 1], [0, 2, 3, 2, 1, 2, 3, 2], [0, null, 1, 2, null, 2, 3, 2]],
  },
};
const PENTA = [0, 2, 4, 7, 9];

// ---------- helpers ----------
function rng(seed) {
  let a = typeof seed === 'number' ? seed : [...String(seed)].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 7);
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// Soft sawtooth wavetable (low harmonics only)
const TABLE = (() => {
  const n = 4096, t = new Float32Array(n);
  for (let i = 0; i < n; i++) { let v = 0; for (let k = 1; k <= 8; k++) v += Math.sin((2 * Math.PI * k * i) / n) / Math.pow(k, 1.6); t[i] = v * 0.7; }
  return t;
})();

class Mix {
  constructor(dur) {
    this.n = Math.ceil(dur * SR);
    this.L = new Float32Array(this.n); this.R = new Float32Array(this.n);
    this.wL = new Float32Array(this.n); this.wR = new Float32Array(this.n); // reverb send
  }
  // Place a mono note buf at t seconds; pan -1..1; send is the reverb amount
  put(buf, t, gain, pan = 0, send = 0.2) {
    const s0 = Math.round(t * SR), gl = gain * Math.cos(((pan + 1) * Math.PI) / 4), gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    const end = Math.min(buf.length, this.n - s0);
    for (let i = Math.max(0, -s0); i < end; i++) {
      const v = buf[i], j = s0 + i;
      this.L[j] += v * gl; this.R[j] += v * gr;
      if (send) { this.wL[j] += v * gl * send; this.wR[j] += v * gr * send; }
    }
  }
}

// ---------- instruments (each returns a mono Float32Array) ----------
const env = (i, a, len, rel) => { const t = i / SR; return Math.min(1, t / a) * (t > len ? Math.max(0, 1 - (t - len) / rel) : 1); };
function pad(f, len, r) {
  const a = 0.9, rel = 1.4, n = Math.ceil((len + rel) * SR), out = new Float32Array(n);
  const det = [1 - 0.004, 1 + 0.004], ph = det.map(() => r());
  let lp = 0;
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let k = 0; k < 2; k++) { const p = (ph[k] + (f * det[k] * i) / SR) % 1; v += TABLE[(p * 4096) | 0]; }
    lp += (v - lp) * 0.08; // low-pass: makes the pad "softer"
    out[i] = lp * env(i, a, len, rel) * 0.5;
  }
  return out;
}
function bass(f, len) {
  const n = Math.ceil((len + 0.3) * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR, w = 2 * Math.PI * f * t; out[i] = (Math.sin(w) + 0.25 * Math.sin(2 * w)) * env(i, 0.02, len, 0.3) * (0.75 + 0.25 * Math.exp(-t * 3)); }
  return out;
}
function marimba(f) {
  const n = Math.ceil(1.2 * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; out[i] = (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 3.2) + 0.35 * Math.sin(2 * Math.PI * f * 3.93 * t) * Math.exp(-t * 14)) * Math.min(1, t / 0.003); }
  return out;
}
function piano(f) {
  const n = Math.ceil(2.6 * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; let v = 0; for (let k = 1; k <= 6; k++) v += (Math.sin(2 * Math.PI * f * k * 1.0007 * t) / Math.pow(k, 1.4)) * Math.exp(-t * (0.9 + k * 0.7)); out[i] = v * Math.min(1, t / 0.004) * 0.6; }
  return out;
}
// Plucked string (Karplus-Strong): higher bright = brighter; decay closer to 1 = longer ring
function pluck(f, r, bright = 0.6, decay = 0.996, len = 2) {
  const N = Math.max(2, Math.round(SR / f)), buf = new Float32Array(N), n = Math.ceil(len * SR), out = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < N; i++) { lp += (r() * 2 - 1 - lp) * bright; buf[i] = lp; }
  for (let i = 0, j = 0; i < n; i++, j = (j + 1) % N) {
    const nx = (j + 1) % N;
    out[i] = buf[j];
    buf[j] = (buf[j] + buf[nx]) * 0.5 * decay;
  }
  return out;
}
function bell(f) {
  const n = Math.ceil(2.2 * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; out[i] = (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 2) + 0.15 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t * 4)) * Math.exp(-t * 1.8) * Math.min(1, t / 0.002) * 0.5; }
  return out;
}
function kick(r, low = 50, high = 110, dec = 7) {
  const n = Math.ceil(0.5 * SR), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, f = low + (high - low) * Math.exp(-t * 30); ph += f / SR; out[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * dec); }
  return out;
}
function noise(r, len, dec, hp = 0.5, lpK = 1) {
  const n = Math.ceil(len * SR), out = new Float32Array(n);
  let prev = 0, lp = 0;
  for (let i = 0; i < n; i++) { const x = r() * 2 - 1, h = x - prev * hp; prev = x; lp += (h - lp) * lpK; out[i] = lp * Math.exp((-i / SR) * dec); }
  return out;
}

// ---------- reverb (Schroeder: 4 combs + 2 all-passes) ----------
function reverb(inp, offset) {
  const out = new Float32Array(inp.length);
  for (const ms of [29.7, 37.1, 41.1, 43.7]) {
    const d = Math.round((ms * SR) / 1000) + offset, buf = new Float32Array(d);
    let j = 0, lp = 0;
    for (let i = 0; i < inp.length; i++) { const y = buf[j]; lp += (y - lp) * 0.35; buf[j] = inp[i] + lp * 0.84; out[i] += y * 0.25; j = (j + 1) % d; }
  }
  for (const ms of [5, 1.7]) {
    const d = Math.round((ms * SR) / 1000), buf = new Float32Array(d);
    let j = 0;
    for (let i = 0; i < out.length; i++) { const x = out[i], y = buf[j]; const v = -0.7 * x + y; buf[j] = x + 0.7 * v; out[i] = v; j = (j + 1) % d; }
  }
  return out;
}

// ---------- arrangement ----------
// o: { duration, lines: [{start,end,silence}], chapters: [{start,end}], style, seed, duck: true }
export function compose(o) {
  const S = STYLES[o.style] || STYLES.bright;
  const r = rng(o.seed ?? 'bgm');
  const dur = o.duration, key = o.key ?? S.key, beat = 60 / (o.tempo ?? S.tempo), bar = beat * 4;
  const mix = new Mix(dur);
  const spoken = (o.lines || []).filter((l) => !l.silence && l.end > l.start);
  const first = spoken.length ? spoken[0].start : Math.min(2, dur * 0.1);
  const last = spoken.length ? spoken[spoken.length - 1].end : dur - 3;
  // Sections: intro (cover) → each chapter → outro
  const cuts = [...new Set([first, ...(o.chapters || []).map((c) => c.start).filter((t) => t > first + 2 && t < last - 2)])].sort((a, b) => a - b);
  const sections = cuts.map((t0, i) => ({ t0, t1: i + 1 < cuts.length ? cuts[i + 1] : last + 0.4, idx: i }));
  const outroAt = last + 0.4;
  const scale = S.penta ? PENTA : [0, 2, 4, 5, 7, 9, 11];

  const voice = (root, type) => CHORDS[type].map((s) => root + s);
  // Intro: tonic-chord pad fades in + one bell
  if (first > 0.5) {
    for (const m of voice(0, S.progs[0][0][1])) mix.put(pad(hz(key - 12 + m), first + 0.2, r), 0, 0.10 * S.pad, (r() - 0.5) * 0.6, 0.35);
    if (S.bell) mix.put(bell(hz(key + 12 + scale[scale.length > 5 ? 4 : 3])), Math.min(0.3, first / 3), 0.16, 0.25, 0.5);
  }
  for (const sec of sections) {
    const prog = S.progs[sec.idx % S.progs.length], pat = S.pats[(sec.idx * 3 + 1) % S.pats.length];
    // Chapter change: a short three-note motif in the high register, signaling "a new section starts here"
    if (S.bell && sec.idx > 0) {
      const top = key + 12, motif = [scale[scale.length - 1] - 12, scale[2], scale[0] + 12].map((d) => top + d);
      if (sec.idx % 2) motif.reverse();
      motif.forEach((m, k) => mix.put(bell(hz(m)), sec.t0 + k * beat * 0.5, 0.12, 0.3, 0.5));
    }
    let k = 0;
    for (let t = sec.t0; t < sec.t1 - 0.05; t += bar, k++) {
      const [root, type] = prog[k % prog.length], len = Math.min(bar, sec.t1 - t);
      const tones = voice(root, type);
      // pad
      for (const m of tones) mix.put(pad(hz(key - 12 + m), len, r), t, 0.085 * S.pad, (r() - 0.5) * 0.7, 0.35);
      // bass
      if (S.bass) {
        const bm = key - 24 + (root > 6 ? root - 12 : root);
        mix.put(bass(hz(bm), Math.min(len, bar * 0.5) - 0.05), t, 0.28 * S.bass, 0, 0);
        if (S.drums && len > bar * 0.6) mix.put(bass(hz(bm), Math.min(len - bar * 0.5, bar * 0.5) - 0.05), t + bar * 0.5, 0.22 * S.bass, 0, 0);
      }
      // Arpeggio: chord tones spread over an octave and a half; the pentatonic style mixes in scale tones
      const pool = [...new Set([...tones, ...(S.penta ? PENTA.filter((d) => tones.some((x) => Math.abs(((x - d) % 12 + 12) % 12) <= 2)) : [])])].map((x) => ((x % 12) + 12) % 12).sort((a, b) => a - b);
      const reg = [...pool, ...pool.map((x) => x + 12)].map((x) => key + x);
      const step = beat / S.rate, steps = Math.floor(len / step + 1e-6);
      for (let s = 0; s < steps; s++) {
        const pi = pat[s % pat.length];
        if (pi === null || (k === 0 && s === 0 && sec.idx > 0 && S.bell)) continue;
        const m = reg[Math.min(reg.length - 1, pi + (k % 2 ? 1 : 0))], at = t + s * step + (r() - 0.5) * 0.012;
        const vel = (s % S.rate === 0 ? 1 : 0.72) * (0.85 + r() * 0.3), pan = s % 2 ? 0.28 : -0.22;
        if (S.arp === 'marimba') mix.put(marimba(hz(m)), at, 0.16 * vel, pan, 0.3);
        else if (S.arp === 'piano') mix.put(piano(hz(m)), at, 0.12 * vel, pan, 0.4);
        else if (S.arp === 'zheng') mix.put(pluck(hz(m), r, 0.55, 0.9975, 2.4), at, 0.22 * vel, pan, 0.4);
        else mix.put(pluck(hz(m), r, 0.8, 0.994, 1.2), at, 0.2 * vel, pan, 0.25);
      }
      // Beat (not played in the first bar of each chapter, to "take a breath" first)
      if (S.drums && k > 0) {
        for (let b = 0; b < 4; b++) {
          const tb = t + b * beat;
          if (tb > sec.t1 - 0.1) break;
          if (S.drums === 'lofi') {
            if (b === 0 || b === 2) mix.put(kick(r), tb, 0.32, 0, 0.05);
            if (b === 1 || b === 3) mix.put(noise(r, 0.25, 22, 0.9, 0.35), tb, 0.07, 0.1, 0.25);
            for (const h of [0, 0.5]) mix.put(noise(r, 0.06, 60, 0.98), tb + h * beat, h ? 0.02 : 0.03, 0.35, 0.05);
          } else if (S.drums === 'drum') {
            if (b === 0) mix.put(kick(r, 55, 90, 4.5), tb, 0.38, 0, 0.2);
            if (b === 2) mix.put(kick(r, 60, 95, 5), tb, 0.2, 0, 0.2);
            if (b === 3 && k % 4 === 3) { mix.put(kick(r, 70, 110, 6), tb, 0.18, -0.2, 0.2); mix.put(kick(r, 70, 110, 6), tb + beat * 0.5, 0.22, 0.2, 0.2); }
          } else if (S.drums === 'shaker') {
            if (b === 0) mix.put(kick(r), tb, 0.26, 0, 0.05);
            for (let q = 0; q < 4; q++) mix.put(noise(r, 0.08, 40, 0.98, 0.6), tb + (q * beat) / 4, q === 2 ? 0.035 : 0.018, 0.3, 0.05);
          }
        }
      }
    }
  }
  // Outro: back to the tonic chord, a long note + one bell, then fade out
  const tail = Math.max(1, dur - outroAt);
  for (const m of voice(0, S.progs[0][0][1])) mix.put(pad(hz(key - 12 + m), tail, r), outroAt, 0.10 * S.pad, (r() - 0.5) * 0.7, 0.4);
  if (S.bass) mix.put(bass(hz(key - 24), Math.min(tail, 3)), outroAt, 0.22 * S.bass, 0, 0);
  if (S.bell) [scale[scale.length > 5 ? 4 : 3], scale[2], 0].forEach((d, i) => mix.put(bell(hz(key + 12 + d)), outroAt + 0.2 + i * beat * 0.75, 0.13, 0.25, 0.55));

  // reverb
  const rl = reverb(mix.wL, 0), rr = reverb(mix.wR, 23);
  const L = mix.L, R = mix.R;
  for (let i = 0; i < mix.n; i++) { L[i] += rl[i] * 0.9; R[i] += rr[i] * 0.9; }
  // Loudness: relative to the narration, o.gapDb (default 11) dB below the voice during pauses, ducked a further o.duckDb (default 8) dB while speaking
  let sum = 0, cnt = 0;
  for (let i = Math.round(first * SR); i < Math.min(mix.n, Math.round(last * SR)); i += 7) { sum += L[i] * L[i] + R[i] * R[i]; cnt += 2; }
  const rms = Math.sqrt(sum / Math.max(1, cnt)) || 1e-6;
  const target = (o.voiceRms ?? 0.07) * Math.pow(10, -(o.gapDb ?? 11) / 20) * (o.volume ?? 1);
  const g = target / rms, duck = Math.pow(10, -(o.duckDb ?? 8) / 20);
  // Control envelope: one point every 10 ms; duck over 0.15 s, recover over 0.5 s
  const cr = 100, nc = Math.ceil(dur * cr), want = new Float32Array(nc).fill(1);
  if (o.duck !== false) for (const l of spoken) for (let c = Math.max(0, Math.floor((l.start - 0.12) * cr)); c < Math.min(nc, Math.ceil((l.end + 0.2) * cr)); c++) want[c] = duck;
  const gainC = new Float32Array(nc);
  let cur = want[0];
  for (let c = 0; c < nc; c++) { const k = want[c] < cur ? 1 - Math.exp(-1 / (0.15 * cr)) : 1 - Math.exp(-1 / (0.5 * cr)); cur += (want[c] - cur) * k; gainC[c] = cur; }
  const fadeIn = 1.2, fadeOut = Math.min(3, dur * 0.2);
  for (let i = 0; i < mix.n; i++) {
    const t = i / SR, c = Math.min(nc - 1, (t * cr) | 0);
    let v = g * gainC[c] * Math.min(1, t / fadeIn) * Math.min(1, (dur - t) / fadeOut);
    L[i] = Math.tanh(L[i] * v * 1.5) / 1.5; R[i] = Math.tanh(R[i] * v * 1.5) / 1.5; // soft clipping
  }
  return { L, R, style: S.name };
}

export function writeWav(file, L, R) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4);
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
}

// Average loudness (RMS) of the spoken parts of the narration, used to set the music volume
export function voiceRms(narration, lines) {
  const p = spawnSync('ffmpeg', ['-v', 'error', '-i', narration, '-f', 's16le', '-ac', '1', '-ar', '8000', '-'], { maxBuffer: 1 << 30 });
  if (p.status !== 0 || !p.stdout.length) return 0.07;
  const a = new Int16Array(p.stdout.buffer, p.stdout.byteOffset, p.stdout.length >> 1);
  let s = 0, c = 0;
  for (const l of lines.filter((x) => !x.silence)) for (let i = Math.floor(l.start * 8000); i < Math.min(a.length, l.end * 8000); i++) { const v = a[i] / 32768; s += v * v; c++; }
  return c ? Math.sqrt(s / c) : 0.07;
}

// The bgm field in script.json: omitted = 'bright'; false = no music; string = style name; object = { style, volume, key, tempo, seed }
export function bgmConfig(script) {
  const b = script.bgm;
  if (b === false || b === 'none') return null;
  const c = typeof b === 'object' && b ? { ...b } : { style: b || 'bright' };
  if (!STYLES[c.style]) throw new Error(`No such background music style: "${c.style}"; available: ${Object.keys(STYLES).join(', ')}`);
  return c;
}

// Generate the full background music for a project (called by render.mjs); returns the wav path, or null (no music)
export function makeProjectBgm(proj, duration, override = {}) {
  const script = JSON.parse(fs.readFileSync(path.join(proj, 'script.json'), 'utf8'));
  const cfg = bgmConfig({ ...script, ...(override.style ? { bgm: { ...(typeof script.bgm === 'object' ? script.bgm : {}), style: override.style } } : {}) });
  if (!cfg) return null;
  const tl = JSON.parse(fs.readFileSync(path.join(proj, 'timeline.json'), 'utf8'));
  const narration = path.join(proj, 'audio', 'narration.m4a');
  const vr = fs.existsSync(narration) ? voiceRms(narration, tl.lines) : 0.07;
  const { L, R, style } = compose({ ...cfg, duration, lines: tl.lines, chapters: tl.chapters, voiceRms: vr, seed: cfg.seed ?? path.basename(proj), volume: (cfg.volume ?? 1) * (override.volume ?? 1) });
  const out = path.join(proj, 'audio', 'bgm.wav');
  writeWav(out, L, R);
  return { file: out, style: cfg.style, name: style };
}

// ---------- command line ----------
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const proj = args.find((a) => !a.startsWith('--'));
  const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
  if (!proj) { console.error('Usage: node bgm.mjs <project dir> [--style <style>] [--demo]'); process.exit(1); }
  const dir = path.resolve(proj);
  if (args.includes('--demo')) {
    fs.mkdirSync(path.join(dir, 'review'), { recursive: true });
    for (const [k, s] of Object.entries(STYLES)) {
      const d = 30, lines = [{ start: 1.5, end: 28 }];
      const { L, R } = compose({ style: k, duration: d, lines, chapters: [{ start: 0 }, { start: 12 }, { start: 21 }], duck: false, seed: k, gapDb: 3 });
      const wav = path.join(dir, 'review', `bgm-${k}.wav`), m4a = wav.replace(/\.wav$/, '.m4a');
      writeWav(wav, L, R);
      spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-c:a', 'aac', '-b:a', '192k', m4a]);
      fs.rmSync(wav);
      console.log(`${s.name} (${k}): ${m4a}`);
    }
  } else {
    const tl = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf8'));
    const t0 = Date.now();
    const r = makeProjectBgm(dir, Number(opt('seconds') || tl.duration), { style: opt('style') });
    console.log(r ? `Background music: ${r.name} (${r.style}) → ${r.file} (took ${((Date.now() - t0) / 1000).toFixed(1)} s)` : 'bgm is false in script.json; no background music generated');
  }
}
