#!/usr/bin/env node
// render.mjs: zero-dependency renderer. Drives the local Chrome directly over the Chrome DevTools Protocol,
// calls window.renderFrame(t) frame by frame and screenshots it, then hands the frames to ffmpeg to encode an mp4.
//
// Usage:
//   node render.mjs <project dir>                   render the full video → out/video.mp4
//   node render.mjs <project dir> --draft           quick half-resolution draft → out/draft.mp4
//   node render.mjs <project dir> --from 10 --to 20 render only one segment
//   node render.mjs <project dir> --stills 1.5,8,12 export stills at the given times → review/
//   node render.mjs <project dir> --sheet           contact sheet of the frame at the end of each narration line → review/sheet.png
//   node render.mjs <project dir> --strip 14,17     8 consecutive frames across this time range tiled into one image, to check the motion → review/strip-14-17.png
//   node render.mjs <project dir> --check           only run the lint check (timeline, frame bounds, overlaps, etc.), no render
//   node render.mjs <project dir> --captions        list every caption segment with its times, to check line breaks
//   node render.mjs <project dir> --board           export the board overview of the whole finished whiteboard → out/board.png (also exported automatically when rendering the final video)
//   node render.mjs <project dir> --cover           export the cover (first frame of the video) → out/cover.png (also exported automatically when rendering the final video)
// Other options: --workers 4  --fps 30  --out filename  --no-audio
// Background music: by default generated in code from "bgm" in script.json and mixed in (see bgm.mjs); --no-bgm for no music; --bgm-style <style> switches style for this run;
//       --bgm-volume 1.2 adjusts the music volume (multiplier); --bgm <music file> uses your own music instead (--bgm-volume then defaults to 0.12)
//           --offline simulates having no network (for testing font fallback)
// The lint check runs every time; if it reports "errors", rendering the final video is refused (drafts and stills are unaffected); once you've confirmed it's fine, add --force to render anyway
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { makeProjectBgm } from './bgm.mjs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const proj = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.');
const flag = (n) => args.includes('--' + n);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };

const CHROME = process.env.CHROME_PATH || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find((p) => fs.existsSync(p));
if (!CHROME) { console.error('Chrome not found; please set CHROME_PATH'); process.exit(1); }
const html = path.join(proj, opt('html', 'index.html'));
if (!fs.existsSync(html)) { console.error('Not found: ' + html); process.exit(1); }

// ---------- minimal CDP client ----------
class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
      } else if (m.method) this.listeners.forEach((l) => l(m));
    };
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
  once(method, sessionId) {
    return new Promise((res) => {
      const l = (m) => { if (m.method === method && m.sessionId === sessionId) { this.listeners.splice(this.listeners.indexOf(l), 1); res(m.params); } };
      this.listeners.push(l);
    });
  }
}

async function launch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ev-chrome-'));
  const proc = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--allow-file-access-from-files', '--force-color-profile=srgb', '--font-render-hinting=none',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    'about:blank',
  ], { stdio: 'ignore' });
  const portFile = path.join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 200 && !fs.existsSync(portFile); i++) await new Promise((r) => setTimeout(r, 50));
  await new Promise((r) => setTimeout(r, 50));
  const [port, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split('\n');
  const ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const cdp = new CDP(ws);
  const close = async () => {
    try { ws.close(); } catch {}
    const exited = new Promise((r) => proc.once('exit', r));
    proc.kill();
    await Promise.race([exited, new Promise((r) => setTimeout(r, 2000))]);
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 }); } catch {}
  };
  return { cdp, close };
}

async function openPage(cdp, scale) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => cdp.send(m, p, sessionId);
  await s('Page.enable');
  await s('Runtime.enable');
  await s('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__RENDER__ = true;' });
  const logs = [];
  cdp.listeners.push((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') logs.push('Page exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) logs.push(`console.${m.params.type}: ` + m.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  await s('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: scale, mobile: false });
  if (flag('offline')) {
    await s('Network.enable');
    await s('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  }
  const loaded = cdp.once('Page.loadEventFired', sessionId);
  await s('Page.navigate', { url: pathToFileURL(html).href });
  await loaded;
  const r = await s('Runtime.evaluate', { expression: 'window.__ready ? window.__ready : Promise.reject(new Error("the page did not call EV.composition()"))', awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception?.description || r.exceptionDetails.text) + '\n' + logs.join('\n'));
  const comp = r.result.value;
  if (comp.width !== 1920 || comp.height !== 1080) await s('Emulation.setDeviceMetricsOverride', { width: comp.width, height: comp.height, deviceScaleFactor: scale, mobile: false });
  return {
    comp, logs,
    async frame(t, format = 'jpeg') {
      const e = await s('Runtime.evaluate', { expression: `window.renderFrame(${t})`, awaitPromise: true });
      if (e.exceptionDetails) throw new Error(`t=${t} render error: ` + (e.exceptionDetails.exception?.description || e.exceptionDetails.text));
      const shot = await s('Page.captureScreenshot', format === 'png' ? { format: 'png' } : { format: 'jpeg', quality: 92, optimizeForSpeed: true });
      return Buffer.from(shot.data, 'base64');
    },
    eval: (expr) => s('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }),
    // Overview of the whole whiteboard: enlarge the canvas to fit all the content and take one large screenshot
    async snapshot(out) {
      const r = await s('Runtime.evaluate', { expression: 'window.__snapshot && window.__snapshot()', returnByValue: true });
      const v = r.result && r.result.value;
      if (!v) return null;
      await s('Runtime.evaluate', { expression: 'window.EV && EV.waitMedia && EV.waitMedia()', awaitPromise: true });
      const k = Math.min(1, 14000 / Math.max(v.w, v.h));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      // Capture in tiles, then stitch: when a single capture is too large, Chrome rasterizes only part of it (the rest is blank), especially with images and shadows
      const TILE = 2000, tiles = [];
      for (let y = 0; y < v.h; y += TILE) for (let x = 0; x < v.w; x += TILE) tiles.push({ x, y, w: Math.min(TILE, v.w - x), h: Math.min(TILE, v.h - y) });
      const tdir = fs.mkdtempSync(path.join(os.tmpdir(), 'ev-snap-'));
      for (const [i, tl] of tiles.entries()) {
        await s('Runtime.evaluate', { expression: `(() => { const st = document.getElementById('stage'); st.style.position = 'absolute'; st.style.left = '${-tl.x}px'; st.style.top = '${-tl.y}px'; })()` });
        await s('Emulation.setDeviceMetricsOverride', { width: tl.w, height: tl.h, deviceScaleFactor: k, mobile: false });
        await new Promise((res) => setTimeout(res, 250));
        await s('Runtime.evaluate', { expression: 'window.EV && EV.waitMedia && EV.waitMedia()', awaitPromise: true });
        const shot = await s('Page.captureScreenshot', { format: 'png' });
        tl.file = path.join(tdir, `t${i}.png`);
        fs.writeFileSync(tl.file, Buffer.from(shot.data, 'base64'));
      }
      if (tiles.length === 1) fs.copyFileSync(tiles[0].file, out);
      else {
        // Overlay each tile onto one canvas at its pixel position
        const W = Math.round(v.w * k), H = Math.round(v.h * k);
        const inputs = tiles.flatMap((tl) => ['-i', tl.file]);
        let chain = `color=c=white:s=${W}x${H}:d=1[c0]`;
        tiles.forEach((tl, i) => { chain += `;[c${i}][${i}:v]overlay=${Math.round(tl.x * k)}:${Math.round(tl.y * k)}[c${i + 1}]`; });
        const ff = ffmpeg([...inputs, '-filter_complex', chain, '-map', `[c${tiles.length}]`, '-frames:v', '1', out], 'snapshot');
        ff.stdin.end();
        await ff.done;
      }
      fs.rmSync(tdir, { recursive: true, force: true });
      return { w: Math.round(v.w * k), h: Math.round(v.h * k), label: v.label || 'Board overview' };
    },
  };
}

function ffmpeg(argv, label) {
  const p = spawn('ffmpeg', ['-v', 'error', '-y', ...argv], { stdio: ['pipe', 'inherit', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => (err += d));
  p.done = new Promise((res, rej) => p.on('close', (c) => (c ? rej(new Error(`ffmpeg(${label}) failed: ${err}`)) : res())));
  return p;
}
// Lint check results
function report(issues) {
  if (!issues.length) { console.log('Lint check: no issues found'); return 0; }
  const errs = issues.filter((i) => i.level === 'error');
  console.log(`Lint check: ${errs.length} error(s), ${issues.length - errs.length} warning(s)`);
  for (const i of issues) console.log(`  ${i.level === 'error' ? '✗ error' : '! warning'}  ${i.t.toFixed(2)}s  ${i.src || ''}  ${i.what}: ${i.msg}`);
  console.log('  → use --strip <start s>,<end s> to look at the animation where the problem is');
  return errs.length;
}

// Tile several stills into a grid
async function tile(files, cols, out) {

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ev-tile-'));
  for (const [i, f] of files.entries()) await ffmpeg(['-i', f, '-vf', 'pad=iw:ih+28:0:28:0x222222', path.join(tmp, `t-${String(i).padStart(3, '0')}.png`)], 'pad').done;
  const rows = Math.ceil(files.length / cols);
  await ffmpeg(['-framerate', '1', '-i', path.join(tmp, 't-%03d.png'), '-vf', `tile=${cols}x${rows}:padding=6:color=0x222222`, '-frames:v', '1', out], 'tile').done;
  fs.rmSync(tmp, { recursive: true, force: true });
}

const write = (stream, buf) => new Promise((res) => (stream.write(buf) ? res() : stream.once('drain', res)));

async function main() {
  const t0 = Date.now();
  const draft = flag('draft');
  const scale = Number(opt('scale', draft ? 0.5 : 1));
  const { cdp, close } = await launch();
  process.on('SIGINT', async () => { await close(); process.exit(1); });
  try {
    const first = await openPage(cdp, scale);
    const comp = first.comp;
    const fps = Number(opt('fps', draft ? 24 : comp.fps));
    const review = path.join(proj, 'review');
    // Font status: informational only, doesn't affect rendering
    const fonts = (await first.eval('window.__fontInfo || []')).result.value || [];
    if (fonts.length) {
      const ok = fonts.filter((f) => f.ok).map((f) => f.family), miss = fonts.filter((f) => !f.ok).map((f) => f.family);
      console.log('Fonts: ' + (ok.length ? ok.join(', ') + ' available' : '') + (miss.length ? `${ok.length ? '; ' : ''}${miss.join(', ')} unavailable (not installed locally and could not be downloaded); switched to backup fonts automatically` : ''));
    }
    // Duration: when the visuals run longer than the narration (closing hold, numbering on the board overview), the video is lengthened automatically and the audio track is padded with silence
    const tlDur = (await first.eval('window.TIMELINE ? window.TIMELINE.duration : 0')).result.value || 0;
    console.log(`Duration: ${comp.duration.toFixed(1)} s` + (tlDur && comp.duration > tlDur + 0.05 ? ` (narration ${tlDur.toFixed(1)} s; the ending holds ${(comp.duration - tlDur).toFixed(1)} s longer)` : ''));
    const lint = await first.eval('window.__lint ? window.__lint() : []');
    const errors = report(lint.result.value || []);
    if (flag('check')) { process.exitCode = errors ? 1 : 0; return; }
    if (flag('captions')) {
      const caps = (await first.eval('window.__captions ? window.__captions() : []')).result.value || [];
      for (const c of caps) console.log(`  ${c.start.toFixed(2).padStart(7)} – ${c.end.toFixed(2).padStart(7)}  ${c.text}`);
      return;
    }
    if (flag('cover')) {
      const out = path.join(proj, 'out', 'cover.png');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, await first.frame(0, 'png'));
      console.log(`Cover: ${out}`);
      return;
    }
    if (flag('board')) {
      const out = path.join(proj, 'out', 'board.png');
      const v = await first.snapshot(out);
      console.log(v ? `${v.label}: ${out} (${v.w}×${v.h})` : 'This project has no whiteboard; no overview to export');
      return;
    }

    // ---- stills mode ----
    if (flag('stills') || flag('sheet') || flag('strip')) {
      fs.mkdirSync(review, { recursive: true });
      let times;
      if (flag('stills')) times = opt('stills').split(',').map(Number);
      else if (flag('strip')) {
        const [a, b, n = 8] = opt('strip').split(',').map(Number);
        times = Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
      } else {
        const tl = JSON.parse(fs.readFileSync(path.join(proj, 'timeline.json'), 'utf8'));
        times = tl.lines.filter((l) => !l.silence).map((l) => Math.min(comp.duration - 0.05, l.end + 0.3));
        times.push(comp.duration - 0.05);
      }
      const sheetScale = flag('sheet') ? 0.25 : flag('strip') ? 0.3 : 1;
      const page = sheetScale === scale ? first : await openPage(cdp, sheetScale);
      const files = [];
      for (const [i, t] of times.entries()) {
        const buf = await page.frame(t, 'png');
        const f = flag('stills') ? path.join(review, `still-${t.toFixed(2)}.png`) : path.join(review, `_frame-${String(i).padStart(3, '0')}.png`);
        fs.writeFileSync(f, buf);
        files.push(f);
      }
      if (!flag('stills')) {
        const cols = 4;
        const name = flag('sheet') ? 'sheet' : `strip-${opt('strip').split(',').slice(0, 2).join('-')}`;
        const out = path.join(review, `${name}.png`);
        await tile(files, cols, out);
        files.forEach((f) => fs.rmSync(f));
        fs.writeFileSync(path.join(review, `${name}.txt`), times.map((t, i) => `#${i + 1} (row ${Math.floor(i / cols) + 1}, column ${(i % cols) + 1}) t=${t.toFixed(2)}s`).join('\n'));
        console.log(`${flag('sheet') ? 'Contact sheet' : 'Animation strip'}: ${out} (${times.length} cells, row by row, left to right; times in ${name}.txt)`);
      } else files.forEach((f) => console.log('Still: ' + f));
      if (first.logs.length) console.log(first.logs.join('\n'));
      return;
    }

    // ---- video mode ----
    if (errors && !flag('draft') && !flag('force')) {
      console.error('The lint check found errors, so the final render was stopped. Fix them and try again; if you are sure these errors can be ignored, add --force to render anyway.');
      process.exitCode = 1;
      return;
    }
    const from = Number(opt('from', 0)), to = Math.min(Number(opt('to', comp.duration)), comp.duration);
    const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
    const total = f1 - f0;
    const workers = Math.max(1, Math.min(Number(opt('workers', 4)), Math.ceil(total / 60)));
    const outDir = path.join(proj, 'out');
    fs.mkdirSync(outDir, { recursive: true });
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ev-seg-'));
    const pages = [first];
    for (let i = 1; i < workers; i++) pages.push(await openPage(cdp, scale));
    let doneFrames = 0, lastPct = -1;
    const x264 = ['-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'medium', '-crf', draft ? '26' : '18', '-pix_fmt', 'yuv420p'];
    const segs = await Promise.all(pages.map(async (page, w) => {
      const a = f0 + Math.floor((total * w) / workers), b = f0 + Math.floor((total * (w + 1)) / workers);
      const seg = path.join(tmp, `seg-${w}.mp4`);
      const ff = ffmpeg(['-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', ...x264, '-r', String(fps), seg], 'seg' + w);
      for (let f = a; f < b; f++) {
        await write(ff.stdin, await page.frame(f / fps));
        doneFrames++;
        const pct = Math.floor((doneFrames / total) * 20) * 5;
        if (pct !== lastPct) { lastPct = pct; process.stdout.write(`\rRendering ${pct}% (${doneFrames}/${total} frames, ${workers} workers in parallel)`); }
      }
      ff.stdin.end();
      await ff.done;
      return seg;
    }));
    process.stdout.write('\n');
    const list = path.join(tmp, 'list.txt');
    fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
    const out = path.join(outDir, opt('out', draft ? 'draft.mp4' : 'video.mp4'));
    const narration = path.join(proj, 'audio', 'narration.m4a');
    const inputs = ['-f', 'concat', '-safe', '0', '-i', list];
    const maps = ['-map', '0:v'];
    let filter = null;
    if (!flag('no-audio') && fs.existsSync(narration)) {
      inputs.push('-ss', String(from), '-t', String(to - from), '-i', narration);
      const bgm = opt('bgm');
      const gen = !bgm && !flag('no-bgm') ? makeProjectBgm(proj, comp.duration, { style: opt('bgm-style'), volume: Number(opt('bgm-volume', 1)) }) : null;
      if (gen) {
        console.log(`Background music: ${gen.name} (${gen.style}), generated in code`);
        inputs.push('-ss', String(from), '-t', String(to - from), '-i', gen.file);
        filter = `[1:a]apad=whole_dur=${to - from}[n];[n][2:a]amix=inputs=2:duration=first:normalize=0[a]`;
      } else if (bgm) {
        inputs.push('-stream_loop', '-1', '-t', String(to - from), '-i', path.resolve(bgm));
        const v = Number(opt('bgm-volume', 0.12));
        filter = `[1:a]apad=whole_dur=${to - from}[n];[2:a]volume=${v},afade=t=out:st=${Math.max(0, to - from - 2)}:d=2[m];[n][m]amix=inputs=2:duration=first:normalize=0[a]`;
      } else filter = `[1:a]apad=whole_dur=${to - from}[a]`; // When the visuals run longer than the narration (closing hold), pad the audio track with silence
      maps.push('-map', '[a]');
    }
    await ffmpeg([...inputs, ...(filter ? ['-filter_complex', filter] : []), ...maps, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], 'mux').done;
    fs.rmSync(tmp, { recursive: true, force: true });
    const logs = pages.flatMap((p) => p.logs);
    if (logs.length) console.log([...new Set(logs)].join('\n'));
    console.log(`Done: ${out} (${(to - from).toFixed(1)} s, ${fps}fps, took ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    if (!draft && !flag('from') && !flag('to')) {
      const cover = path.join(outDir, 'cover.png');
      fs.writeFileSync(cover, await first.frame(0, 'png'));
      console.log(`Cover: ${cover}`);
      const board = path.join(outDir, 'board.png');
      const v = await first.snapshot(board);
      if (v) console.log(`${v.label}: ${board} (${v.w}×${v.h})`);
    }
  } finally {
    await close();
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
