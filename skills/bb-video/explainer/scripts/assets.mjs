#!/usr/bin/env node
// assets.mjs: turns the project's images / videos into media the video can use, and writes the manifest assets/manifest.js
//
// Usage: node assets.mjs <project dir>
//   Put the original media in <project>/assets/src/:
//     images (png / jpg / webp / gif…) → assets/img/<name>.jpg (kept as .png if it has an alpha channel), long side scaled down to ≤ 1600
//     videos (mp4 / mov / webm / mkv…) → assets/clips/<name>/0001.jpg… (a 30fps JPEG sequence, width ≤ 1280)
//   name = the file name without its extension.
//   When you only need part of a long video, or want to change the width, write assets/clips.json:
//     { "demo": { "src": "recording.mp4", "from": 12, "dur": 20, "width": 1280 } }
//   Videos listed in clips.json are no longer processed as whole files. Media that hasn't changed is not reprocessed.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projArg = process.argv[2];
if (!projArg) { console.error('Usage: node assets.mjs <project dir>'); process.exit(1); }
const dir = path.join(path.resolve(projArg), 'assets');
const srcDir = path.join(dir, 'src');
fs.mkdirSync(srcDir, { recursive: true });
const IMG = /\.(png|jpe?g|webp|gif|bmp|tiff?|heic|avif)$/i, VID = /\.(mp4|mov|m4v|webm|mkv|avi)$/i;
const FPS = 30;

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${(r.stderr || '').trim().split('\n').slice(-3).join(' ')}`);
  return r.stdout;
};
function probe(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,pix_fmt:format=duration', '-of', 'json', file]));
  const s = j.streams[0] || {};
  return { w: s.width, h: s.height, alpha: /a|pal8/.test(s.pix_fmt || ''), dur: Number(j.format?.duration) || 0 };
}
const cachePath = path.join(dir, '.cache.json');
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
const stamp = (f, extra) => { const st = fs.statSync(f); return `${st.size}|${st.mtimeMs}|${JSON.stringify(extra || {})}`; };

const manifest = { images: {}, clips: {} };
const files = fs.readdirSync(srcDir).filter((f) => !f.startsWith('.'));
const clipsJson = path.join(dir, 'clips.json');
const clipDefs = fs.existsSync(clipsJson) ? JSON.parse(fs.readFileSync(clipsJson, 'utf8')) : {};
const usedByDefs = new Set(Object.values(clipDefs).map((d) => d.src));
const jobs = [];
for (const f of files) {
  const name = path.basename(f, path.extname(f));
  if (IMG.test(f)) jobs.push({ kind: 'img', name, src: f });
  else if (VID.test(f) && !usedByDefs.has(f)) jobs.push({ kind: 'clip', name, src: f });
  else if (!VID.test(f)) console.log(`  skipped ${f} (unrecognized format)`);
}
for (const [name, d] of Object.entries(clipDefs)) {
  if (!/^[\w-][\w.-]*$/.test(name)) { console.error(`clips.json entry "${name}": names may only use letters, digits, _ - .`); process.exit(1); }
  if (!files.includes(d.src)) { console.error(`clips.json entry "${name}": ${d.src} is not in assets/src/`); process.exit(1); }
  jobs.push({ kind: 'clip', name, src: d.src, from: d.from ?? 0, dur: d.dur, width: d.width });
}
const names = jobs.map((j) => j.name);
const dup = names.filter((n, i) => names.indexOf(n) !== i);
if (dup.length) { console.error(`Duplicate media names: ${[...new Set(dup)].join(', ')} (an image and a video can't share a name)`); process.exit(1); }

let made = 0;
for (const j of jobs) {
  const file = path.join(srcDir, j.src);
  const key = stamp(file, j);
  const info = probe(file);
  if (j.kind === 'img') {
    const ext = info.alpha ? 'png' : 'jpg', rel = `img/${j.name}.${ext}`, out = path.join(dir, rel);
    if (cache[j.name]?.key !== key || !fs.existsSync(out)) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-frames:v', '1', '-vf', "scale='min(1600,iw)':'min(1600,ih)':force_original_aspect_ratio=decrease", ...(ext === 'jpg' ? ['-q:v', '3'] : []), out]);
      made++;
      console.log(`  image ${j.name}`);
    }
    const o = probe(out);
    manifest.images[j.name] = { w: o.w, h: o.h, file: rel };
    cache[j.name] = { key };
  } else {
    const outDir = path.join(dir, 'clips', j.name);
    const width = Math.min(j.width ?? 1280, info.w || 1280);
    if (cache[j.name]?.key !== key || !fs.existsSync(path.join(outDir, '0001.jpg'))) {
      fs.rmSync(outDir, { recursive: true, force: true });
      fs.mkdirSync(outDir, { recursive: true });
      const cut = [...(j.from ? ['-ss', String(j.from)] : []), ...(j.dur ? ['-t', String(j.dur)] : [])];
      run('ffmpeg', ['-v', 'error', '-y', ...cut, '-i', file, '-an', '-vf', `fps=${FPS},scale=${width}:-2`, '-q:v', '4', path.join(outDir, '%04d.jpg')]);
      made++;
      console.log(`  video ${j.name}`);
    }
    const frames = fs.readdirSync(outDir).filter((f) => f.endsWith('.jpg')).length;
    const o = probe(path.join(outDir, '0001.jpg'));
    manifest.clips[j.name] = { frames, fps: FPS, w: o.w, h: o.h };
    if (frames > FPS * 90) console.log(`  note: video ${j.name} is ${(frames / FPS).toFixed(0)} s long and its extracted frames take a lot of space; if you only use part of it, set from / dur in clips.json`);
    cache[j.name] = { key };
  }
}
// Remove old outputs that are no longer in the manifest
for (const d of ['img', 'clips']) {
  const p = path.join(dir, d);
  if (!fs.existsSync(p)) continue;
  for (const f of fs.readdirSync(p)) {
    const n = d === 'img' ? path.basename(f, path.extname(f)) : f;
    const keep = d === 'img' ? manifest.images[n]?.file === `img/${f}` : !!manifest.clips[n];
    if (!keep) fs.rmSync(path.join(p, f), { recursive: true, force: true });
  }
}
for (const k of Object.keys(cache)) if (!manifest.images[k] && !manifest.clips[k]) delete cache[k];
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 1));
fs.writeFileSync(path.join(dir, 'manifest.js'), `// Generated by scripts/assets.mjs; do not edit by hand\nwindow.MEDIA_ASSETS = ${JSON.stringify(manifest, null, 1)};\n`);
const ni = Object.keys(manifest.images).length, nc = Object.keys(manifest.clips).length;
console.log(`Done: ${ni} images, ${nc} video clips (${made} processed this run) → ${path.join(dir, 'manifest.js')}`);
for (const [n, c] of Object.entries(manifest.clips)) console.log(`  video ${n}: ${(c.frames / c.fps).toFixed(1)} s, ${c.w}×${c.h}`);
for (const [n, m] of Object.entries(manifest.images)) console.log(`  image ${n}: ${m.w}×${m.h}`);
