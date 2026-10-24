#!/usr/bin/env node
// assets.mjs: turns the project's images / videos into media the video can use, and writes the manifest assets/manifest.js
//
// Usage: node assets.mjs <project dir>
//   Put the original media in <project>/assets/src/:
//     images (png / jpg / webp / gif…) → assets/img/<name>.jpg (kept as .png if it has an alpha channel), long side scaled down to ≤ 1600
//     videos (mp4 / mov / webm / ogv / mkv…) → assets/clips/<name>/0001.jpg… (a JPEG sequence at the source's own frame rate, at most 30 fps;
//       width ≤ 1280). Keeping the source's rate keeps its cadence: an 18 fps film still moves in 18 steps a second inside a 30 fps video.
//   name = the file name without its extension.
//   When you only need part of a long video, or want to change the width, the frame rate or the grade, write assets/clips.json:
//     { "demo": { "src": "recording.mp4", "from": 12, "dur": 20, "width": 1280, "fps": 18, "grade": "auto" } }
//     fps: the rate to extract at (default: the source's, ≤ 30). For silent film scanned at 24 fps that runs too fast, play it with rate 0.75.
//     grade: "auto" measures the clip once (its black and white points, the median over the whole clip) and maps them to one fixed
//       range, so clips from different sources cut together at the same tone and nothing pumps from frame to frame;
//       { "lo": 30, "hi": 210 } sets the source's black / white points (0–255) by hand.
//   Videos listed in clips.json are no longer processed as whole files. Media that hasn't changed is not reprocessed.
//   A sidecar <file name>.json next to a source file (footage.mjs writes it) is the media's credit: it goes into the manifest.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { M, isZh } from '../../core/scripts/lang.mjs';

const projArg = process.argv[2];
if (projArg) process.env.BV_LANG ??= isZh(path.resolve(projArg)) ? 'zh' : 'en';
if (!projArg) { console.error(M('用法：node assets.mjs <项目目录>', 'Usage: node assets.mjs <project dir>')); process.exit(1); }
const dir = path.join(path.resolve(projArg), 'assets');
const srcDir = path.join(dir, 'src');
fs.mkdirSync(srcDir, { recursive: true });
const IMG = /\.(png|jpe?g|webp|gif|bmp|tiff?|heic|avif)$/i, VID = /\.(mp4|mov|m4v|webm|ogv|mkv|avi)$/i;
const FPS = 30;   // the most a clip is extracted at (the film's frame rate)

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(M(`${cmd} 失败：`, `${cmd} failed: `) + (r.stderr || '').trim().split('\n').slice(-3).join(' '));
  return r;
};
const rate = (v) => { const [a, b] = String(v || '').split('/').map(Number); return a && b ? a / b : a || 0; };
function probe(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,pix_fmt,r_frame_rate,avg_frame_rate:format=duration', '-of', 'json', file]).stdout);
  const s = j.streams[0] || {};
  return { w: s.width, h: s.height, alpha: /a|pal8/.test(s.pix_fmt || ''), dur: Number(j.format?.duration) || 0, fps: rate(s.avg_frame_rate) || rate(s.r_frame_rate) };
}
// One fixed grade per clip (levels): the clip's black and white points — the median over the clip of each frame's darkest / brightest value
//   (measured on a small copy, which smooths single-pixel noise) — mapped to TARGET (8-bit, limited range). Not percentiles: a shot that is
//   mostly sky has a narrow 10–90 % range, and stretching that turns day into night
const TARGET = [24, 226], GRADE = 'minmax';
const median = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : NaN; };
function measure(file, cut) {
  const r = run('ffmpeg', ['-v', 'info', '-nostats', ...cut, '-i', file, '-an', '-vf', 'fps=2,scale=320:-2,format=yuv420p,signalstats,metadata=print', '-f', 'null', '-']);
  const pick = (k) => [...r.stderr.matchAll(new RegExp(`signalstats\\.${k}=([\\d.]+)`, 'g'))].map((m) => Number(m[1]));
  return { lo: median(pick('YMIN')), hi: median(pick('YMAX')) };
}
function gradeFilter(g) {
  if (!(g.hi > g.lo)) return '';
  const k = Math.min(2.2, (TARGET[1] - TARGET[0]) / Math.max(1, g.hi - g.lo));   // capped: on hazy footage more gain mostly amplifies compression noise
  return `,format=yuv420p,lutyuv=y='clip((val-${g.lo.toFixed(1)})*${k.toFixed(4)}+${TARGET[0]},16,235)'`;
}
const cachePath = path.join(dir, '.cache.json');
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
const stamp = (f, extra) => { const st = fs.statSync(f); return `${st.size}|${st.mtimeMs}|${JSON.stringify(extra || {})}`; };

const manifest = { images: {}, clips: {} };
const files = fs.readdirSync(srcDir).filter((f) => !f.startsWith('.') && !f.endsWith('.json'));   // <name>.json = the file's credit (footage.mjs), not media
const clipsJson = path.join(dir, 'clips.json');
const clipDefs = fs.existsSync(clipsJson) ? JSON.parse(fs.readFileSync(clipsJson, 'utf8')) : {};
const usedByDefs = new Set(Object.values(clipDefs).map((d) => d.src));
const jobs = [];
for (const f of files) {
  const name = path.basename(f, path.extname(f));
  if (IMG.test(f)) jobs.push({ kind: 'img', name, src: f });
  else if (VID.test(f) && !usedByDefs.has(f)) jobs.push({ kind: 'clip', name, src: f });
  else if (!VID.test(f)) console.log(M(`  跳过 ${f}（不认识的格式）`, `  skipped ${f} (unrecognized format)`));
}
for (const [name, d] of Object.entries(clipDefs)) {
  if (!/^[\w-][\w.-]*$/.test(name)) { console.error(M(`clips.json 的 "${name}"：名字只能用字母、数字、_ - .`, `clips.json entry "${name}": names may only use letters, digits, _ - .`)); process.exit(1); }
  if (!files.includes(d.src)) { console.error(M(`clips.json 的 "${name}"：assets/src/ 里没有 ${d.src}`, `clips.json entry "${name}": ${d.src} is not in assets/src/`)); process.exit(1); }
  jobs.push({ kind: 'clip', name, src: d.src, from: d.from ?? 0, dur: d.dur, width: d.width, fps: d.fps, grade: d.grade });
}
const names = jobs.map((j) => j.name);
const dup = names.filter((n, i) => names.indexOf(n) !== i);
if (dup.length) { console.error(M(`媒体名字重复：${[...new Set(dup)].join('、')}（图片和视频不能同名）`, `Duplicate media names: ${[...new Set(dup)].join(', ')} (an image and a video can't share a name)`)); process.exit(1); }

// A sidecar assets/src/<name>.json ({ title, author, licence, url, date, source }, written by footage.mjs or by hand) goes into the manifest as
//   credit: styles that show archive material put it on screen as a source tag, and the render writes it to out/CREDITS.txt
//   (a clips.json entry under another name uses its source file's sidecar)
const creditOf = (name, src) => {
  for (const n of [name, src && path.basename(src, path.extname(src))]) {
    const f = n && path.join(srcDir, `${n}.json`);
    if (!f || !fs.existsSync(f)) continue;
    try { return { credit: JSON.parse(fs.readFileSync(f, 'utf8')) }; } catch { console.log(M(`  ${n}.json 不是合法的 JSON（忽略）`, `  ${n}.json is not valid JSON (ignored)`)); }
  }
  return {};
};
let made = 0;
for (const j of jobs) {
  const file = path.join(srcDir, j.src);
  const key = stamp(file, j.kind === 'clip' && j.grade ? { ...j, how: [GRADE, TARGET] } : j);   // a change in how clips are graded re-grades them
  const info = probe(file);
  if (j.kind === 'img') {
    const ext = info.alpha ? 'png' : 'jpg', rel = `img/${j.name}.${ext}`, out = path.join(dir, rel);
    if (cache[j.name]?.key !== key || !fs.existsSync(out)) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-frames:v', '1', '-vf', "scale='min(1600,iw)':'min(1600,ih)':force_original_aspect_ratio=decrease", ...(ext === 'jpg' ? ['-q:v', '3'] : []), out]);
      made++;
      console.log(M(`  图片 ${j.name}`, `  image ${j.name}`));
    }
    const o = probe(out);
    manifest.images[j.name] = { w: o.w, h: o.h, file: rel, ...creditOf(j.name, j.src) };
    cache[j.name] = { key };
  } else {
    const outDir = path.join(dir, 'clips', j.name);
    const width = Math.min(j.width ?? 1280, info.w || 1280);
    // the source's own rate (its cadence), at most FPS; rounded so 23.976 → 23.976, 29.97 → 29.97
    const fps = Math.round(Math.min(FPS, j.fps || info.fps || FPS) * 1000) / 1000;
    let grade = cache[j.name]?.grade ?? null;
    if (cache[j.name]?.key !== key || !fs.existsSync(path.join(outDir, '0001.jpg'))) {
      fs.rmSync(outDir, { recursive: true, force: true });
      fs.mkdirSync(outDir, { recursive: true });
      const cut = [...(j.from ? ['-ss', String(j.from)] : []), ...(j.dur ? ['-t', String(j.dur)] : [])];
      grade = j.grade === 'auto' ? measure(file, cut) : j.grade && j.grade.hi > j.grade.lo ? { lo: j.grade.lo, hi: j.grade.hi } : null;
      run('ffmpeg', ['-v', 'error', '-y', ...cut, '-i', file, '-an', '-vf', `fps=${fps},scale=${width}:-2${grade ? gradeFilter(grade) : ''}`, '-q:v', '4', path.join(outDir, '%04d.jpg')]);
      made++;
      console.log(M(`  视频 ${j.name}（${fps} 格/秒${grade ? `，调色 黑 ${grade.lo.toFixed(0)} → ${TARGET[0]}、白 ${grade.hi.toFixed(0)} → ${TARGET[1]}` : ''}）`,
        `  video ${j.name} (${fps} fps${grade ? `, graded black ${grade.lo.toFixed(0)} → ${TARGET[0]}, white ${grade.hi.toFixed(0)} → ${TARGET[1]}` : ''})`));
    }
    const frames = fs.readdirSync(outDir).filter((f) => f.endsWith('.jpg')).length;
    const o = probe(path.join(outDir, '0001.jpg'));
    manifest.clips[j.name] = { frames, fps, w: o.w, h: o.h, ...(grade ? { grade } : {}), ...creditOf(j.name, j.src) };
    if (frames > fps * 90) console.log(M(`  提醒：视频 ${j.name} 有 ${(frames / fps).toFixed(0)} 秒，拆出来的帧很占空间；只用其中一段的话，在 clips.json 里写 from / dur`, `  note: video ${j.name} is ${(frames / fps).toFixed(0)} s long and its extracted frames take a lot of space; if you only use part of it, set from / dur in clips.json`));
    cache[j.name] = { key, grade };
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
console.log(M(`完成：${ni} 张图片、${nc} 段视频（这次处理了 ${made} 个）→ ${path.join(dir, 'manifest.js')}`, `Done: ${ni} images, ${nc} video clips (${made} processed this run) → ${path.join(dir, 'manifest.js')}`));
for (const [n, c] of Object.entries(manifest.clips)) console.log(M(`  视频 ${n}：${(c.frames / c.fps).toFixed(1)} 秒，${c.fps} 格/秒，${c.w}×${c.h}`, `  video ${n}: ${(c.frames / c.fps).toFixed(1)} s, ${c.fps} fps, ${c.w}×${c.h}`));
for (const [n, m] of Object.entries(manifest.images)) console.log(M(`  图片 ${n}：${m.w}×${m.h}`, `  image ${n}: ${m.w}×${m.h}`));
