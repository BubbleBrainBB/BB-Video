#!/usr/bin/env node
// render.mjs: zero-dependency renderer shared by both kinds of video (bb-video/core). Drives the local Chrome directly over the Chrome DevTools Protocol,
// calls window.renderFrame(t) frame by frame, screenshots it, and hands the frames to ffmpeg to encode an mp4.
// render.mjs: the zero-dependency renderer shared by every video (explainer/scripts/render.mjs and promo/scripts/render.mjs forward here).
//
// Usage:
//   node render.mjs <project>                    render the video → out/video.mp4 (promo / --aspect: out/video-16x9.mp4)
//   node render.mjs <project> --aspect 9:16      portrait version → out/video-9x16.mp4 (same code, F.portrait is true)
//   node render.mjs <project> --draft            half-resolution quick draft
//   node render.mjs <project> --from 10 --to 20  render one segment
//   node render.mjs <project> --stills 1.5,8,12  stills at these times → review/
//   node render.mjs <project> --sheet            contact sheet at the end of each narration line → review/sheet.png
//   node render.mjs <project> --strip 14,17[,n]  n consecutive frames in this range tiled into one image → review/
//   node render.mjs <project> --check            lint only (overlaps, reading time, frame bounds; on-screen text vs brief.md when the page registers it; information density: scenes / lines that only show words)
//                                                promo pages also print a motion sheet (moving at once, duration families, linear starts, flicker, too fast, camera jerk) → review/motion-*.png; --no-motion skips it
//   node render.mjs <project> --captions         list the caption segments with their times
//   node render.mjs <project> --board / --cover  whiteboard overview → out/board.png / cover frame → out/cover.png
//   node render.mjs <project> --audio            sound only (voiceover + music + effects) → out/audio.wav
//   node render.mjs <project> --remux [--aspect] rebuild the sound track onto an existing final video (no re-render of the picture)
//   node render.mjs <project> --review [--draft] review pack: contact-*.png, transitions-*.png, report-*.txt
//   node render.mjs <project> --rhythm          re-measure the rendered video against the rhythm sheet (quick mode) → review/rhythm-*.png
//   node render.mjs <project> --scan [--aspect]  re-run the frame check (jumps, flashes, frozen frames, dead air) on the rendered video, no re-render
// Options: --workers 4  --fps 30  --out file  --no-audio  --html page  --offline  --force  --frame-timeout 60 (if a frame takes longer than this many seconds, retake it on a fresh page)
//   --blur 6     motion blur: 6 sub-frames per frame in a 180° shutter (promo finals default 6; everything else 1 = off)
//   --poster     put the cover frame (compose's cover) at frame 0
//   --no-bgm / --bgm-style <style> / --bgm-volume 1.2 / --bgm <file>   explainer background music (script.json "bgm")
//
// Sound: one pipeline for every video —
//   voiceover  audio/narration.m4a + timeline.json (scripts/tts.py), if the project has one
//   music      the page's score (score.js / compose music.style) — or, without one, the background music from script.json "bgm" — or --bgm <file>
//   effects    the page's sound-effect plan (F.sfx, with sound.js)
//   Music ducks under the voiceover; the mix is loudness-normalized by a linear gain + true-peak limiter (target -16 LUFS with a voiceover,
//   -14 for promo music, -16 for effects only; the limiter never takes more than 3 dB off a voice / 4 dB off music, so very dynamic
//   voiceovers stop short of the target instead of being squashed).
// The final video gets BT.709 color tags and a frame check (sudden jumps / one-frame flashes / frozen frames / dead air; with a voiceover, dead air is
//   looked for where nobody is speaking: the lead-in, long pauses, the tail after the last line).
// The lint runs every time; with "errors" the final render is refused (drafts and stills are unaffected); add --force to render anyway.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { renderPlan, writeWav, SR, loadScore, loadModule } from './music.mjs';
import { makeProjectBgm, voiceRms } from './bgm.mjs';
import { isZh } from './lang.mjs';
import os from 'node:os';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const proj = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.');
// Output language: BV_LANG if set, otherwise the project's own language (lang.mjs); passed on to the sound scripts and the page
const ZH = isZh(proj);
process.env.BV_LANG = ZH ? 'zh' : 'en';
const M = (zh, en) => (ZH ? zh : en);
// The music seed defaults to the project folder name: the same project gets the same music every time; different projects get different chord progressions and motifs
const withMusic = (plan) => ({ ...plan, music: { seed: path.basename(proj), ...(plan.music || {}) } });
// Sound: the project's sound.js (effects designed for the product); no music by default — added only when the project has score.js (or compose sets music.style)
let SCORE = null, PALETTE = undefined, SCORE_FROM = '';
async function prepareScore(plan) {
  const snd = path.join(proj, 'sound.js'), own = path.join(proj, 'score.js'), style = plan && plan.music && plan.music.style;
  PALETTE = fs.existsSync(snd) ? await loadModule(snd) : undefined;
  SCORE = fs.existsSync(own) ? await loadModule(own) : style ? await loadScore(style) : null;
  // Narrated films take no music: set "bgm": false in script.json (or pass --no-bgm when rendering) — only narration and sound effects remain
  try { const sj = JSON.parse(fs.readFileSync(path.join(proj, 'script.json'), 'utf8')); if (sj.bgm === false || sj.bgm === 'none') SCORE = null; } catch {}
  if (flag('no-bgm')) SCORE = null;
  SCORE_FROM = M(`声音设计 ${PALETTE ? `sound.js（${PALETTE.name || ''}）` : '默认（项目里还没有 sound.js——每个产品都要自己设计）'}；配乐 ${SCORE ? (fs.existsSync(own) ? 'score.js' : `示范乐谱 ${style}`) : '不要'}`,
    `sound design ${PALETTE ? `sound.js (${PALETTE.name || ''})` : 'default (no sound.js in the project yet)'}; score ${SCORE ? (fs.existsSync(own) ? 'score.js' : `sample score ${style}`) : 'none'}`);
}
// Narration: counts only when audio/narration.m4a and timeline.json both exist
const NARRATION = path.join(proj, 'audio', 'narration.m4a');
const tlLines = () => { try { return JSON.parse(fs.readFileSync(path.join(proj, 'timeline.json'), 'utf8')).lines || []; } catch { return []; } };
const hasVoice = () => fs.existsSync(NARRATION) && tlLines().length > 0;
// The voice's colour: script.json "voice_fx": a preset or an ffmpeg audio filter chain. optical = a 1930s optical soundtrack (narrow band,
//   pressed hard, a little saturated); radio = an old radio set; phone = a telephone line
const VOICE_FX = {
  optical: 'highpass=f=280,lowpass=f=3600,acompressor=threshold=-20dB:ratio=4:attack=4:release=90:makeup=4,asoftclip=type=tanh,volume=-1dB',
  radio: 'highpass=f=400,lowpass=f=3000,acompressor=threshold=-18dB:ratio=6:attack=3:release=60:makeup=5,asoftclip=type=atan',
  phone: 'highpass=f=500,lowpass=f=2800,acompressor=threshold=-16dB:ratio=5:attack=3:release=50:makeup=4',
};
const voiceFx = () => { try { const v = JSON.parse(fs.readFileSync(path.join(proj, 'script.json'), 'utf8')).voice_fx; return v ? VOICE_FX[v] ?? String(v) : ''; } catch { return ''; } };
// Spans where someone is speaking (count as "something happening" in the dead-air check); the cover before the first line (up to 2.5 s) is the title being read, so it counts too — a longer silence is still reported
const speechSpans = () => { const L = tlLines().filter((l) => !l.silence && l.end > l.start).map((l) => [l.start, l.end]); return L.length ? [[0, Math.min(L[0][0], 2.5)], ...L] : L; };
const play = (plan, duration, voice) => renderPlan({ ...withMusic(plan), duration }, { score: SCORE, palette: PALETTE, voice });
const flag = (n) => args.includes('--' + n);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };

const CHROME = process.env.CHROME_PATH || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find((p) => fs.existsSync(p));
if (!CHROME) { console.error(M('找不到 Chrome，请设置 CHROME_PATH', 'Chrome not found; please set CHROME_PATH')); process.exit(1); }
const html = path.join(proj, opt('html', 'index.html'));
if (!fs.existsSync(html)) { console.error(M('找不到 ', 'Not found: ') + html); process.exit(1); }
// The project's lib/ was copied from the skill when the project was created: if the skill has changed since (bug fixes), suggest a refresh — never overwrite automatically (some projects stay on an old version on purpose)
{
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..'), lib = path.join(proj, 'lib'), stale = [];
  const SRC = ['core/runtime', 'promo/runtime', 'explainer/runtime'].map((d) => path.join(root, d));
  // Compare only the files the page actually loads (lib/ holds every style's runtime; changes to other styles need no reminder)
  const loaded = new Set([...fs.readFileSync(html, 'utf8').matchAll(/src=["'](?:\.\/)?lib\/([\w.-]+\.js)["']/g)].map((m) => m[1]));
  if (fs.existsSync(lib)) for (const f of fs.readdirSync(lib)) { if (!f.endsWith('.js') || !loaded.has(f)) continue; const src = SRC.map((d) => path.join(d, f)).find((x) => fs.existsSync(x)); if (src && fs.readFileSync(src, 'utf8') !== fs.readFileSync(path.join(lib, f), 'utf8')) stale.push(f); }
  if (stale.length) {
    const how = fs.existsSync(path.join(lib, 'promo.js')) ? `node ${path.join(root, 'promo/scripts/new.mjs')} ${proj} --update-lib` : `node ${path.join(root, 'explainer/scripts/new.mjs')} ${proj} --update-lib`;
    console.log(M(`提醒：项目的 lib/ 里 ${stale.join('、')} 和 skill 里的不一样（skill 更新过）。要用最新的修复就刷新：${how}`, `Note: ${stale.join(', ')} in lib/ differ from the skill (it has been updated). To pick up the latest fixes, refresh: ${how}`));
  }
}

// An error thrown in the page → one readable message: the page's own stack (index.html:line:col, with the long file:// path removed)
const pageError = (d, where = '') => { const raw = d.exception?.description || d.text || ''; return (where ? where + ' ' : '') + M('页面出错：', 'page error: ') + raw.replace(/file:\/\/\/[^\s)]*\/(?=[^/\s)]+:\d+)/g, '').split('\n').slice(0, 6).join('\n'); };

// ---------- Minimal CDP client ----------
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
  // However we exit (error, Ctrl-C, killed), close the Chrome we started and delete the temp folder — leave no orphan processes
  const reap = () => { try { proc.kill('SIGKILL'); } catch {} try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} };
  process.once('exit', reap);
  for (const sig of ['SIGTERM', 'SIGHUP']) process.once(sig, () => { reap(); process.exit(1); });
  process.once('uncaughtException', (e) => { reap(); console.error(e); process.exit(1); });
  process.once('unhandledRejection', (e) => { reap(); console.error(e); process.exit(1); });
  const close = async () => {
    try { ws.close(); } catch {}
    const exited = new Promise((r) => proc.once('exit', r));
    proc.kill();
    await Promise.race([exited, new Promise((r) => setTimeout(r, 2000))]);
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 }); } catch {}
  };
  return { cdp, close };
}

// ---------- Web fonts: local cache ----------
// Styles load their fonts from CDNs (jsdelivr / Google Fonts). When Chrome fetches them itself it sometimes works and sometimes fails (the same file downloads fine with curl):
// the check and the final video could then use different fonts. So we intercept font and font-css requests, download them in Node (3 retries), store them in ~/.cache/bubble-video/fonts,
// and serve them locally from then on — once downloaded on the first online run, rendering no longer needs the network. --no-font-cache turns this off (Chrome fetches them itself).
const FONT_CACHE = path.join(os.homedir(), '.cache', 'bubble-video', 'fonts');
const FONT_HOSTS = /^https?:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com|cdnjs\.cloudflare\.com)\//;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';   // Google Fonts serves woff2 based on the browser
async function cachedFetch(url) {
  const key = crypto.createHash('sha1').update(url).digest('hex'), f = path.join(FONT_CACHE, key);
  if (fs.existsSync(f) && fs.existsSync(f + '.type')) return { body: fs.readFileSync(f), type: fs.readFileSync(f + '.type', 'utf8') };
  for (let i = 0; i < 3; i++) {
    try {
      const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 20000);
      const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': UA } }); clearTimeout(tm);
      if (r.ok) { const body = Buffer.from(await r.arrayBuffer()), type = r.headers.get('content-type') || ''; fs.mkdirSync(FONT_CACHE, { recursive: true }); fs.writeFileSync(f, body); fs.writeFileSync(f + '.type', type); return { body, type }; }
    } catch {}
  }
  return null;
}

async function openPage(cdp, scale) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => cdp.send(m, p, sessionId);
  await s('Page.enable');
  await s('Runtime.enable');
  await s('Page.addScriptToEvaluateOnNewDocument', { source: `window.__RENDER__ = true; window.__BV_LANG = '${ZH ? 'zh' : 'en'}';` });   // the page's own checks speak the run's language
  if (!flag('offline') && !flag('no-font-cache')) {
    await s('Fetch.enable', { patterns: [{ urlPattern: '*', resourceType: 'Font' }, { urlPattern: '*', resourceType: 'Stylesheet' }] });
    cdp.listeners.push(async (m) => {
      if (m.sessionId !== sessionId || m.method !== 'Fetch.requestPaused') return;
      const { requestId, request } = m.params;
      try {
        if (FONT_HOSTS.test(request.url)) {
          const got = await cachedFetch(request.url);
          if (got) { await s('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: got.type || 'application/octet-stream' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: got.body.toString('base64') }); return; }
        }
      } catch {}
      s('Fetch.continueRequest', { requestId }).catch(() => {});
    });
  }
  const logs = [];
  cdp.listeners.push((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') logs.push(M('页面异常：', 'Page exception: ') + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) logs.push(`console.${m.params.type}: ` + m.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  await s('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: scale, mobile: false });
  if (flag('offline')) {
    await s('Network.enable');
    await s('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  }
  const loaded = cdp.once('Page.loadEventFired', sessionId);
  await s('Page.navigate', { url: pathToFileURL(html).href + (opt('aspect') ? `?aspect=${opt('aspect')}` : '') });
  await loaded;
  const r = await s('Runtime.evaluate', { expression: `window.__ready ? window.__ready : Promise.reject(new Error(${JSON.stringify(M('页面没有调用 EV.composition()', 'the page did not call EV.composition()'))}))`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(pageError(r.exceptionDetails, M('搭建时', 'while building:')) + '\n' + logs.join('\n'));
  const comp = r.result.value;
  if (comp.width !== 1920 || comp.height !== 1080) await s('Emulation.setDeviceMetricsOverride', { width: comp.width, height: comp.height, deviceScaleFactor: scale, mobile: false });
  return {
    comp, logs,
    async frame(t, format = 'jpeg') {
      const e = await s('Runtime.evaluate', { expression: `window.renderFrame(${t})`, awaitPromise: true });
      if (e.exceptionDetails) throw new Error(pageError(e.exceptionDetails, `t=${t}`));
      const shot = await s('Page.captureScreenshot', format === 'png' ? { format: 'png' } : { format: 'jpeg', quality: 92, optimizeForSpeed: true });
      return Buffer.from(shot.data, 'base64');
    },
    // If the page throws while the check calls a page function (__infoAt, __lint …): report the page's error directly (which file, which line), don't let later code crash again on undefined
    eval: async (expr) => { const r = await s('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(pageError(r.exceptionDetails, M(`检查时（${expr.replace(/\s+/g, ' ').slice(0, 40)}…）`, `while checking (${expr.replace(/\s+/g, ' ').slice(0, 40)}…):`))); return r; },
    // Overview of the whole whiteboard: enlarge the canvas to fit all content and take one big screenshot
    async snapshot(out) {
      const r = await s('Runtime.evaluate', { expression: 'window.__snapshot && window.__snapshot()', returnByValue: true });
      const v = r.result && r.result.value;
      if (!v) return null;
      await s('Runtime.evaluate', { expression: 'window.EV && EV.waitMedia && EV.waitMedia()', awaitPromise: true });
      const k = Math.min(1, 14000 / Math.max(v.w, v.h));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      // Screenshot in tiles and stitch: when capturing a very large area at once, Chrome only rasterises part of it (the rest is blank), especially with images and shadows
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
        // Paste each tile onto one canvas at its pixel position
        const W = Math.round(v.w * k), H = Math.round(v.h * k);
        const inputs = tiles.flatMap((tl) => ['-i', tl.file]);
        let chain = `color=c=white:s=${W}x${H}:d=1[c0]`;
        tiles.forEach((tl, i) => { chain += `;[c${i}][${i}:v]overlay=${Math.round(tl.x * k)}:${Math.round(tl.y * k)}[c${i + 1}]`; });
        const ff = ffmpeg([...inputs, '-filter_complex', chain, '-map', `[c${tiles.length}]`, '-frames:v', '1', out], 'snapshot');
        ff.stdin.end();
        await ff.done;
      }
      fs.rmSync(tdir, { recursive: true, force: true });
      return { w: Math.round(v.w * k), h: Math.round(v.h * k), label: v.label || M('全貌图', 'Board overview') };
    },
  };
}

function ffmpeg(argv, label) {
  const p = spawn('ffmpeg', ['-v', 'error', '-y', ...argv], { stdio: ['pipe', 'inherit', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => (err += d));
  p.done = new Promise((res, rej) => p.on('close', (c) => (c ? rej(new Error(`ffmpeg(${label}) ${M('失败', 'failed')}: ${err}`)) : res())));
  return p;
}

// ---------- Sound: narration + music + effects, one pipeline ----------
// Returns { wav (the whole track, from 0 to duration), target (loudness target), desc (description) }; null when there is no sound at all
async function buildAudio(page, comp, tmp) {
  const plan = (await page.eval('window.__audioPlan ? window.__audioPlan() : null')).result.value;
  const voice = hasVoice(), lines = voice ? tlLines() : [], dur = comp.duration, parts = [];
  let music = null, target = null;
  if (plan) {
    const vr = voice ? voiceRms(NARRATION, lines) : 0;
    const res = play(plan, dur, voice ? { lines, rms: vr } : null), { L, R } = res;
    // With narration: music and effect levels are already set against the voice (music.mjs: music 11 dB under the voice in pauses, the bed down another 8 dB while speaking, the busy layer drops out);
    // the old approach (everything about 10 dB under the voice) is used only when levels were not set
    if (voice && !res.leveled) {
      let s = 0, c = 0; for (let i = 0; i < L.length; i += 7) { s += L[i] * L[i] + R[i] * R[i]; c += 2; }
      const g = (vr * Math.pow(10, -10 / 20)) / (Math.sqrt(s / Math.max(1, c)) || 1e-6);
      for (let i = 0; i < L.length; i++) { L[i] = Math.tanh(L[i] * g * 1.2) / 1.2; R[i] = Math.tanh(R[i] * g * 1.2) / 1.2; }
    }
    music = path.join(tmp, 'plan.wav'); writeWav(music, L, R);
    parts.push(SCORE_FROM + M(`；${plan.sfx.length} 个音效`, `; ${plan.sfx.length} sound effect(s)`));
    if (voice && res.info) { const u = res.info.underDb; if (u !== null && u !== undefined) parts.push(M(`说话时配乐比人声低 ${(-u).toFixed(0)} dB`, `music sits ${(-u).toFixed(0)} dB under the voice while speaking`)); if (res.info.sfxDropped) parts.push(M(`说话时去掉 ${res.info.sfxDropped} 个轻音效`, `${res.info.sfxDropped} light effect(s) dropped under speech`)); for (const w of res.info.warnings || []) if (/^(旁白|Narration)/.test(w)) console.log('  ! ' + w); }
    target = voice ? 'I=-16:TP=-1.5:LRA=11' : SCORE ? 'I=-14:TP=-2:LRA=11' : 'I=-16:TP=-2:LRA=15'; // -16 when there are only effects: sparse effects pushed to -14 are too loud
  } else if (fs.existsSync(path.join(proj, 'script.json')) && !opt('bgm') && !flag('no-bgm') && voice) {
    const gen = makeProjectBgm(proj, dur, { style: opt('bgm-style'), volume: Number(opt('bgm-volume', 1)) });
    if (gen) { music = gen.file; parts.push(M(`背景音乐：${gen.name}（${gen.style}），代码合成`, `Background music: ${gen.name} (${gen.style}), generated in code`)); }
  }
  if (!voice && !music && !opt('bgm')) return null;
  target ??= 'I=-16:TP=-1.5:LRA=11';
  if (voice) parts.unshift(M('旁白', 'Voiceover'));
  // Mix: narration (padded with silence if too short) + score / background music / the user's own music file
  const out = path.join(tmp, 'mix.wav'), inputs = [], chains = [];
  let k = 0;
  if (voice) { inputs.push('-i', NARRATION); chains.push(`[${k++}:a]aresample=${SR},${voiceFx() ? voiceFx() + ',' : ''}apad=whole_dur=${dur}[v]`); }
  if (music) { inputs.push('-i', music); chains.push(`[${k++}:a]aresample=${SR},apad=whole_dur=${dur}[m]`); }
  else if (opt('bgm')) {
    inputs.push('-stream_loop', '-1', '-t', String(dur), '-i', path.resolve(opt('bgm')));
    chains.push(`[${k++}:a]aresample=${SR},volume=${Number(opt('bgm-volume', 0.12))},afade=t=out:st=${Math.max(0, dur - 2)}:d=2[m]`);
    parts.push(M(`音乐文件：${opt('bgm')}`, `Music file: ${opt('bgm')}`));
  }
  const labels = (voice ? '[v]' : '') + (music || opt('bgm') ? '[m]' : '');
  const n = (voice ? 1 : 0) + (music || opt('bgm') ? 1 : 0);
  const graph = chains.join(';') + ';' + (n > 1 ? `${labels}amix=inputs=${n}:duration=longest:normalize=0,atrim=0:${dur}[a]` : `${labels}atrim=0:${dur}[a]`);
  await ffmpeg([...inputs, '-filter_complex', graph, '-map', '[a]', '-ac', '2', '-ar', String(SR), out], 'mix').done;
  return { wav: out, target, desc: parts.join(M('；', '; ')), plan, voice };
}
// Loudness: measure the whole track with loudnorm, then adjust linearly to the target (no dynamic compression)
async function loudnorm(wav, ss, dur, target, maxLimit = 4) {
  const p = spawn('ffmpeg', ['-hide_banner', '-nostats', '-ss', String(ss), '-t', String(dur), '-i', wav, '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-']);
  let err = ''; p.stderr.on('data', (d) => (err += d));
  await new Promise((r) => p.on('close', r));
  const m = err.match(/\{[\s\S]*?\}/g);
  if (!m) return null;
  const j = JSON.parse(m[m.length - 1]);
  if (!isFinite(Number(j.input_i))) return null;
  // No second loudnorm pass: when the gap is large and raising it would overshoot the true peak, it silently switches to dynamic compression (flattening the rise and fall of voice and music).
  //   Instead: one linear gain + a peak-only limiter: the dynamics stay, only the occasional spike is held down
  //   The limiter takes at most maxLimit dB (voice 3 dB, music 4 dB: inaudible): very dynamic narration (edge-tts voices are about -25 LUFS with peaks around -2.5 dB) that can't reach the target stops at the loudest undistorted level
  const I = Number(target.match(/I=(-?[\d.]+)/)[1]), TP = Number(target.match(/TP=(-?[\d.]+)/)[1]);
  const want = I - Number(j.input_i), gain = Math.min(want, TP - Number(j.input_tp) + maxLimit);
  return { measured: Number(j.input_i).toFixed(1), lufs: (Number(j.input_i) + gain).toFixed(1), capped: gain < want - 0.05,
    af: `volume=${gain.toFixed(2)}dB,alimiter=limit=${Math.pow(10, TP / 20).toFixed(4)}:attack=5:release=60:level=false:latency=true` };
}
// When loudness stops below the target (the peaks allow no more gain): find what hits the peak — a sound effect, which line of narration / dialogue, or the music.
//   Measure the peak every 0.1 s, take the three highest (≥ 1 s apart), and match them to effects at the same moment (0.25 s before to 0.15 s after) and to the spoken line
async function peakSources(wav, ss, dur, plan, lines) {
  const p = spawn('ffmpeg', ['-hide_banner', '-nostats', '-ss', String(ss), '-t', String(dur), '-i', wav, '-af', 'asetnsamples=n=4800:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.Peak_level:file=-', '-f', 'null', '-']);
  let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', () => {});
  await new Promise((r) => p.on('close', r));
  const pts = []; let t = null;
  for (const ln of out.split('\n')) { const a = /pts_time:([\d.]+)/.exec(ln); if (a) t = Number(a[1]) + ss; const b = /Peak_level=(-?[\d.]+|-inf)/.exec(ln); if (b && t !== null && b[1] !== '-inf') pts.push([t, Number(b[1])]); }
  const top = []; for (const x of pts.sort((a, b) => b[1] - a[1])) { if (top.length >= 3) break; if (top.every((y) => Math.abs(y[0] - x[0]) >= 1)) top.push(x); }
  return top.map(([t0, db]) => {
    const sx = ((plan && plan.sfx) || []).filter((x) => x.t >= t0 - 0.25 && x.t <= t0 + 0.15).sort((a, b) => (b.gain ?? 1) - (a.gain ?? 1))[0];
    const ln = lines.find((l) => t0 + 0.05 >= l.start && t0 <= l.end + 0.05);
    const who = sx ? M(`音效 ${sx.type}（gain ${sx.gain ?? 1}）`, `sfx ${sx.type} (gain ${sx.gain ?? 1})`) : ln ? M(`台词 ${ln.id ?? ''}「${String(ln.text).slice(0, 14)}」`, `line ${ln.id ?? ''} "${String(ln.text).slice(0, 14)}"`) : M('配乐', 'music');
    return `${t0.toFixed(1)}s ${who} ${db.toFixed(1)} dB`;
  });
}
// Dead air: the picture only moves slowly (frame diff < 1: slow push, drift, camera breathe), no sound effect, and no freshly shown text still being read — the viewer is just listening to music.
//   d: per-frame difference; acts = { sfx: [seconds], texts: [{ a, text }] }. New text gets time to be read (English 0.3 s per word, Chinese/Japanese 4.5 characters per second, plus 0.6 s) and does not count as dead air.
//   The first 0.3 s and the last 2 s (closing hold) are ignored. Returns [[start, end], …] (seconds).
//   With narration: spans where someone is speaking (acts.speech = [[start, end]…], each line in the timeline) count as "something" — only check where no one speaks: the start, long pauses between lines, after the last line
const readTime = (text) => { const cjk = (String(text).match(/[぀-ヿ㐀-鿿]/g) || []).length, words = String(text).replace(/[぀-ヿ㐀-鿿]/g, ' ').trim().split(/\s+/).filter(Boolean).length; return Math.min(2.5, 0.6 + words * 0.3 + cjk / 4.5); }; // Long body text caps at 2.5 s: no one stops to read a whole paragraph in a promo
function deadAir(d, fps, from, acts, minLen = 1.2) {
  const busy = new Uint8Array(d.length), out = [];
  // Average over 0.3 s windows (frame-rate conversion makes single-frame diffs alternate high and low)
  const w = Math.max(1, Math.round(0.15 * fps));
  for (let i = 0; i < d.length; i++) { let s = 0, k = 0; for (let j = Math.max(0, i - w); j <= Math.min(d.length - 1, i + w); j++) { s += d[j]; k++; } if (s / k >= 1.0) busy[i] = 1; }
  const mark = (a, b) => { for (let i = Math.max(0, Math.floor((a - from) * fps)); i < Math.min(d.length, Math.ceil((b - from) * fps)); i++) busy[i] = 1; };
  for (const t of acts.sfx || []) mark(t - 0.1, t + 0.35);
  for (const x of acts.texts || []) mark(x.a, x.a + readTime(x.text));
  for (const [a, b] of acts.speech || []) mark(a, b);
  const start = Math.round(0.3 * fps), end = d.length - Math.round(2.0 * fps);
  for (let i = start, run = 0; i <= end; i++) {
    if (i < end && !busy[i]) { run++; continue; }
    if (run >= Math.round(minLen * fps)) out.push([from + (i - run) / fps, from + i / fps]);
    run = 0;
  }
  return out;
}
// No new action (one notch looser than dead air): whether or not the picture moves (a slow push or a resting spotlight still counts), ≥ 1.5 s with no new text, sound effect or hard cut (judged by when events appear, not by frame diff). The user dislikes 1–2 s gaps, so this level matters too
//   With narration: speaking spans count as something (acts.speech); when frame diffs d are given, real motion on screen (the board drawing, a figure walking: diff ≥ 2) counts too — a stroke being drawn during an explainer's pause is not a gap
function quietGaps(nFrames, fps, from, acts, cuts = [], minLen = 1.5, d = null) {
  const busy = new Uint8Array(nFrames), out = [];
  const mark = (a, b) => { for (let i = Math.max(0, Math.floor((a - from) * fps)); i < Math.min(nFrames, Math.ceil((b - from) * fps)); i++) busy[i] = 1; };
  for (const t of acts.sfx || []) mark(t - 0.1, t + 0.35);
  for (const t of cuts) mark(t - 0.1, t + 0.35);
  for (const x of acts.texts || []) mark(x.a - 0.1, x.a + 0.35);   // Text counts only at the moment it appears (reading time is not a "new action": with nothing new on screen for 1.5 s, viewers feel it has stopped)
  for (const [a, b] of acts.speech || []) mark(a, b);
  if (d) { const w = Math.max(1, Math.round(0.15 * fps)); for (let i = 0; i < Math.min(nFrames, d.length); i++) { let s = 0, k = 0; for (let j = Math.max(0, i - w); j <= Math.min(d.length - 1, i + w); j++) { s += d[j]; k++; } if (s / k >= 2) busy[i] = 1; } }
  const start = Math.round(0.3 * fps), end = nFrames - Math.round(2.0 * fps);
  for (let i = start, run = 0; i <= end; i++) {
    if (i < end && !busy[i]) { run++; continue; }
    if (run >= Math.round(minLen * fps)) out.push([from + (i - run) / fps, from + i / fps]);
    run = 0;
  }
  return out;
}
// Final-video check: a frame that differs a lot from both neighbours (a sudden one-frame jump), or a frame that differs from both sides while the sides look alike (a one-frame flash);
//   without narration also check for long freezes (with narration, a still picture while listening is normal); check both dead air and no new action (with narration, only where no one speaks)
async function popScan(file, fps, from, cuts, acts, appears = [], voice = false, trans = [], stillMax = 0.6) {   // stillMax: the style's allowed still hold (F.stillMax)
  const Wd = 160, Ht = 90, p = spawn('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${Wd}:${Ht},format=gray`, '-f', 'rawvideo', '-']);
  const chunks = []; p.stdout.on('data', (d) => chunks.push(d));
  await new Promise((r) => p.on('close', r));
  const buf = Buffer.concat(chunks), sz = Wd * Ht, n = Math.floor(buf.length / sz);
  const diff = (a, b) => { let s = 0; for (let i = 0; i < sz; i++) s += Math.abs(buf[a * sz + i] - buf[b * sz + i]); return s / sz; };
  const d = Array.from({ length: n - 1 }, (_, i) => diff(i, i + 1)), hits = [];
  for (let i = 1; i < n - 1; i++) {
    const tA = from + (i + 1) / fps;
    const atCut = cuts.some((c) => Math.abs(c - tA) < 2.5 / fps) || appears.some((c) => tA - c > -1.5 / fps && tA - c < 3.5 / fps) || trans.some(([a, b]) => tA > a - 1.5 / fps && tA < b + 1.5 / fps); // Don't report registered hard cuts, intentional appearances (F.appear), or whole transitions (F.transition)
    if (!atCut && d[i] > 3 * Math.max(d[i - 1], d[i + 1], 0.3) && d[i] > 4) hits.push(M(`${tA.toFixed(2)}s 画面突然跳变（差异 ${d[i].toFixed(1)}，前后 ${Math.max(d[i - 1], d[i + 1]).toFixed(1)}）`, `${tA.toFixed(2)}s sudden jump (difference ${d[i].toFixed(1)}, around it ${Math.max(d[i - 1], d[i + 1]).toFixed(1)})`));
    const inTrans = trans.some(([a, b]) => tA > a - 1.5 / fps && tA < b + 1.5 / fps);   // an iris / wipe registered as a transition is meant to change fast
    if (!inTrans && Math.min(d[i - 1], d[i]) > 4 && diff(i - 1, i + 1) < 0.35 * Math.min(d[i - 1], d[i])) hits.push(M(`${(from + i / fps).toFixed(2)}s 闪了一帧（这一帧和前后都不同，前后两帧却很像）`, `${(from + i / fps).toFixed(2)}s one-frame flash (this frame differs from both neighbours, which look alike)`));
  }
  if (acts) acts = { ...acts, speech: voice ? speechSpans() : [] };
  const gapWhy = voice ? M('旁白停下来的这一段：', 'narration paused: ') : '';
  if (!voice) {
    // Frozen picture: 0.6 s or more with almost no change (except the final 1.5 s hold) — viewers will feel it has "stuck"
    for (let i = 0, run = 0; i <= d.length; i++) {
      // Thresholds calibrated by measurement: a fully frozen frame has diff 0.00; a slow push / drift over a large flat background is only 0.1–0.3 (still counts as moving)
      if (i < d.length && d[i] < 0.06 && (i + 1) / fps < n / fps - 1.5) { run++; continue; }
      if (run >= Math.round(stillMax * fps)) hits.push(M(`${(from + (i - run + 1) / fps).toFixed(2)}–${(from + (i + 1) / fps).toFixed(2)}s 画面静止 ${(run / fps).toFixed(1)} 秒（加一点慢推、漂移或镜头呼吸 breathe）`, `${(from + (i - run + 1) / fps).toFixed(2)}–${(from + (i + 1) / fps).toFixed(2)}s frozen for ${(run / fps).toFixed(1)} s (add a slow push, drift or camera breathe)`));
      run = 0;
    }
  }
  {
    if (acts) for (const [a, b] of deadAir(d, fps, from, acts)) hits.push(M(`${gapWhy}${a.toFixed(2)}–${b.toFixed(2)}s 空放 ${(b - a).toFixed(1)} 秒：画面只有慢动、没有新的字、没有音效，观众只在听音乐——把下一个动作提前到这里（和转场叠在一起），或者把停留缩短到读完为止`, `${gapWhy}${a.toFixed(2)}–${b.toFixed(2)}s dead air for ${(b - a).toFixed(1)} s: only slow motion, no new text, no sound effect — bring the next action forward or shorten the hold`));
    if (acts) { const dead = deadAir(d, fps, from, acts); for (const [a, b] of quietGaps(d.length, fps, from, acts, cuts, 1.5, voice ? d : null)) if (!dead.some(([x, y]) => x < b && y > a)) hits.push(M(`${gapWhy}${a.toFixed(2)}–${b.toFixed(2)}s 没有新动作 ${(b - a).toFixed(1)} 秒（镜头还在动，但没有新的字、音效、硬切）：比空放松一档，也补一个动作（聚光灯移到下一处、数字跳一下、下一个元素提前）`, `${gapWhy}${a.toFixed(2)}–${b.toFixed(2)}s no new action for ${(b - a).toFixed(1)} s (the camera moves, but no new text, sound or cut): add an action`)); }
  }
  if (!hits.length) { console.log(M(voice ? '成片检查：没有突然跳一帧 / 闪一帧；旁白停下的地方没有空放' : '成片检查：没有突然跳一帧 / 闪一帧 / 长时间静止 / 空放的画面', voice ? 'Frame check: no sudden jumps or one-frame flashes; no dead air where the narration pauses' : 'Frame check: no sudden jumps, one-frame flashes, frozen frames or dead air')); return d; }
  console.log(M(`成片检查：${hits.length} 处（硬切、闪白这类有意的切换也会列出来，确认是有意的就可以忽略${cuts.length ? '；登记的硬切点：' + cuts.map((c) => c.toFixed(2)).join(', ') : ''}）`, `Frame check: ${hits.length} finding(s) (intentional cuts and flashes are listed too; ignore them once confirmed${cuts.length ? '; registered cuts: ' + cuts.map((c) => c.toFixed(2)).join(', ') : ''})`));
  hits.slice(0, 20).forEach((h) => console.log('  · ' + h));
  return d;
}
// Loudness in the phone band (above 150 Hz): one RMS (dBFS) every 50 ms
// Measured rhythm: each second's "energy" in the final video = picture change (frame diff, log scale) plus new events (hard cuts, text, sound effects), normalised to 0–1;
//   shown next to the rhythm sheet's planned intensity (0–3 → 0–1): two rows of small bars in the terminal, and a chart review/rhythm-<aspect>.png (grey boxes = plan, colour = measured).
//   Warns when: the whole film is flat (coefficient of variation of energy per second < 0.35), nothing happens in the first 3 s, the densest 5 s are not near the planned burst, or plan and measurement disagree
async function rhythmScan(proj, d, fps, from, dur, rhythm, ev, asp) {
  // Rhythm comes from "events": hard cuts that really happen on screen (frame-diff spikes, counted twice), new text, sound effects; continuous motion only counts above the film's background motion (median) —
  //   op-art stripes and launch-stage light move all the time; counting raw frame diffs would make every second "busy"
  const n = Math.max(1, Math.floor(dur)), mot = new Array(n).fill(0), evc = new Array(n).fill(0);
  // Hard cut = spike: this frame changes far more than the frames around it (when the background flows fast, every frame has a large diff, but that is not a cut)
  const isCut = (i) => { if (d[i] < 10) return false; const nb = []; for (let k = i - 3; k <= i + 3; k++) if (k !== i && k >= 0 && k < d.length) nb.push(d[k]); nb.sort((x, y) => x - y); return d[i] > 2.5 * (nb[Math.floor(nb.length / 2)] ?? 0) + 2; };
  // Within 0.4 s of a registered hard cut / transition (full-screen wedge, sweeping colour band): count one hard cut, not full-screen frame diff as motion — otherwise transition-heavy sections measure "busier" than the montage
  const cutsT = (ev.cuts || []).map((c) => c - from), nearCut = (i) => cutsT.some((c) => Math.abs(i / fps - c) < 0.4);
  for (let i = 0; i < d.length; i++) { const s2 = Math.floor(i / fps); if (s2 >= 0 && s2 < n && !nearCut(i)) { mot[s2] += d[i] / fps; if (isCut(i)) evc[s2] += 2; } }
  for (const c of cutsT) { const s2 = Math.floor(c); if (s2 >= 0 && s2 < n) evc[s2] += 2; }
  // A group of text appearing together (16 menu items popping up at once) counts as one event: appearances less than 0.25 s apart are merged
  const txs = [...ev.texts].sort((a, b) => a - b).filter((t, i, a) => i === 0 || t - a[i - 1] >= 0.25);
  for (const t of [...ev.sfx, ...txs]) { const s2 = Math.floor(t - from); if (s2 >= 0 && s2 < n) evc[s2]++; }
  const lm = mot.map((x) => Math.log1p(x)), med = lm.slice().sort((a, b) => a - b)[Math.floor(n / 2)], ex = lm.map((x) => Math.max(0, x - med));
  const q90 = (a) => Math.max(1e-6, a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * 0.9))]);
  const eTop = q90(evc), mTop = q90(ex);
  const meas = evc.map((e, i) => Math.min(1, 0.75 * (e / eTop) + 0.25 * (ex[i] / mTop)));
  const plan = Array.from({ length: n }, (_, i) => { const r = rhythm.find((x) => i + 0.5 >= x.from && i + 0.5 < x.to); return r ? r.energy / 3 : 0; });
  const spark = (a) => a.map((x) => '▁▂▃▄▅▆▇█'[Math.max(0, Math.min(7, Math.round(x * 7)))]).join('');
  console.log(M('节奏（每格 1 秒）', 'Rhythm (1 s per cell)'));
  console.log(M('  计划 ', '  plan ') + spark(plan));
  console.log(M('  实测 ', '  meas ') + spark(meas));
  const mean = meas.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(meas.reduce((a, b) => a + (b - mean) ** 2, 0) / n), cv = sd / (mean || 1e-6);
  const pm = plan.reduce((a, b) => a + b, 0) / n, cov = meas.reduce((a, b, i) => a + (b - mean) * (plan[i] - pm), 0), ps = Math.sqrt(plan.reduce((a, b) => a + (b - pm) ** 2, 0)), corr = ps && sd ? cov / (ps * sd * Math.sqrt(n)) : 0;
  let best = 0, bestAt = 0; for (let i = 0; i + 5 <= n; i++) { const s2 = evc.slice(i, i + 5).reduce((a, b) => a + b, 0); if (s2 > best) { best = s2; bestAt = i; } }   // number of events (hard cuts count twice)
  const notes = [M(`起伏 ${cv.toFixed(2)}（< 0.35 太平）`, `variation ${cv.toFixed(2)} (< 0.35 is flat)`), M(`和计划的吻合 ${corr.toFixed(2)}`, `match with plan ${corr.toFixed(2)}`), M(`最密的 5 秒在 ${bestAt}–${bestAt + 5}s（片长的 ${Math.round((bestAt / n) * 100)}%，${best} 个事件）`, `densest 5 s at ${bestAt}–${bestAt + 5}s (${Math.round((bestAt / n) * 100)}% of the film, ${best} events)`)];
  console.log('  ' + notes.join(M('；', '; ')));
  const warn = [];
  if (cv < 0.35) warn.push(M('整支片子太平：强弱拉不开——加快切段、落点前静一下、换场时多换几样', 'The film is flat: add a montage burst, a stop before the hero, more contrast between scenes'));
  const hookEvents = evc.slice(0, 3).reduce((a, b) => a + b, 0);   // First 3 s: 2 or more events (or one hard cut) count as a hook — cinematic openings (an eye opening in the dark, a beam of light) are not compared with the montage
  if (hookEvents < 2 && Math.max(...meas.slice(0, 3)) < 0.35) warn.push(M('开头 3 秒没什么动静：第一个动作提前，或者从特写拉开', 'Little happens in the first 3 s: bring the first action forward or open on a close-up'));
  const burst = rhythm.find((r) => r.role === 'burst');
  if (burst && (bestAt + 5 < burst.from || bestAt > burst.to)) warn.push(M(`最密的 5 秒（${bestAt}–${bestAt + 5}s）不在计划的快切段（${burst.from.toFixed(1)}–${burst.to.toFixed(1)}s）`, `The densest 5 s (${bestAt}–${bestAt + 5}s) are not in the planned burst (${burst.from.toFixed(1)}–${burst.to.toFixed(1)}s)`));
  if (rhythm.length > 2 && corr < 0.3) warn.push(M(`实测曲线和节奏单对不上（吻合 ${corr.toFixed(2)}）：计划高的段落画面不够密，或者低的段落太忙`, `The measured curve does not follow the rhythm sheet (match ${corr.toFixed(2)})`));
  warn.forEach((x) => console.log('  ! ' + x));
  // Chart: one column per second, grey box = planned intensity, coloured bar = measured; drawn with ffmpeg's drawbox (no other library needed)
  const cw = 24, Hh = 220, Wd = n * cw + 20, boxes = [];
  plan.forEach((x, i) => { const h = Math.round(x * (Hh - 30)); if (h > 0) boxes.push(`drawbox=x=${10 + i * cw}:y=${Hh - 10 - h}:w=${cw - 4}:h=${h}:color=0x8a8f98@0.9:t=2`); });
  meas.forEach((x, i) => { const h = Math.max(2, Math.round(x * (Hh - 30))); boxes.push(`drawbox=x=${10 + i * cw + 4}:y=${Hh - 10 - h}:w=${cw - 12}:h=${h}:color=${x > 0.66 ? '0xe8312a' : x > 0.33 ? '0xf19d38' : '0x3c82f6'}@0.95:t=fill`); });
  for (const r of rhythm) boxes.push(`drawbox=x=${10 + Math.round(r.from * cw)}:y=4:w=2:h=${Hh - 8}:color=0xffffff@0.25:t=fill`);
  const png = path.join(proj, 'review', `rhythm-${asp}.png`);
  fs.mkdirSync(path.dirname(png), { recursive: true });
  await ffmpeg(['-f', 'lavfi', '-i', `color=c=0x1c1c1e:s=${Wd}x${Hh}`, '-vf', boxes.join(',') || 'null', '-frames:v', '1', png], 'rhythm').done;
  console.log(M(`  对照图：${png}（灰框 = 计划，彩色 = 实测，竖线 = 换场）`, `  Chart: ${png} (grey = plan, colour = measured, lines = scene changes)`));
}
// Information density (--check): a scene (with narration, a line) whose picture is only words — big type, one sentence, one number — with no information visual (flow, comparison, chart, annotated screenshot, diagram,
//   boxes / arrows / circles, real UI, drawings on the board) gets a warning; when most scenes are like that, one warning for the whole film; for promos also count concrete points (GUIDE: at least 4 in 30 s).
//   Page registration: EV.info / F.info (registered automatically by the common API and the quick version), EV.infoSource (board, per element, including the camera), EV.scene / F.scene (quick version registers scenes one by one)
async function infoDensity(first, comp, issues) {
  const pg = (await first.eval(`(() => { if (!window.__infoAt) return null; const TL = window.TIMELINE;
    return { info: window.__info(), scenes: window.__scenes(), rhythm: window.__rhythm ? window.__rhythm() : null, texts: window.__textWins ? window.__textWins() : [],
      lines: TL && TL.lines ? TL.lines.filter((l) => !l.silence && l.end > l.start).map((l) => ({ id: l.id, a: l.start, b: l.end, text: l.text })) : [],
      promo: !!window.PROMO && window.__format !== 'explain' && !(TL && TL.lines && TL.lines.some((l) => !l.silence && l.end > l.start)) }; })()`)).result.value;   // narrated films (explainers) are checked line by line, not by counting promo points
  if (!pg) return;
  const D = comp.duration, warn = (t, msg) => issues.push({ level: 'warn', t, src: '', what: M('信息量', 'information'), msg });
  const endSc = pg.scenes.find((x) => x.end), body = endSc ? endSc.a : D;
  let scenes = pg.scenes.filter((x) => !x.end);
  if (!scenes.length && pg.rhythm && pg.rhythm.length >= 2) scenes = pg.rhythm.filter((r) => r.kind !== 'end').map((r) => ({ a: r.from, b: r.to, name: String(r.scene), role: r.role }));
  // Look line by line of narration (explainers, narrated promos); without narration, scene by scene. Skip the opening line / scene (hook), the drop (the most important line, may be big type), the end card, and anything under 1.5 s
  const byLine = pg.lines.length > 0, sum = [];
  // a narrated film marks its turn / question card with F.scene(a, b, { role: 'drop' }): the line under it may be words only
  const dropAt = (t) => pg.scenes.some((x) => x.role === 'drop' && t >= x.a && t < x.b);
  const units = (byLine ? pg.lines.map((l, i) => ({ ...l, i, role: dropAt((l.a + l.b) / 2) ? 'drop' : l.role })) : scenes.map((x, i) => ({ ...x, i }))).filter((u) => u.i > 0 && u.role !== 'drop' && u.a < body - 0.5 && Math.min(u.b, body) - u.a >= 1.5);
  if (units.length) {
    const step = 0.25, ts = units.map((u) => { const a = u.a + 0.15, b = Math.min(u.b, body) - 0.15, n = Math.max(3, Math.floor((b - a) / step) + 1); return Array.from({ length: n }, (_, k) => Math.round((a + ((b - a) * k) / (n - 1)) * 1000) / 1000); });
    const seen = (await first.eval(`window.__infoAt(${JSON.stringify(ts.flat())})`)).result.value;
    let k = 0;
    const thin = units.filter((u, j) => {
      const got = ts[j].map(() => seen[k++]), dur = Math.min(u.b, body) - u.a, on = (got.filter((x) => x.length).length / got.length) * dur;
      return on < Math.min(1.5, 0.3 * dur);
    });
    const words = (u) => [...new Set(pg.texts.filter((x) => x.kind !== 'caption' && x.a >= u.a - 0.6 && x.a < u.b).map((x) => x.text.replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 3).map((x) => `"${x.slice(0, 16)}"`).join(M('、', ', '));
    // An occasional words-only scene / line (a breather, a slogan) is only listed in the summary; individual warnings from 30% up, and one more for the whole film from 60% up
    const nm = (u) => (byLine ? u.id : M(`第 ${u.name || u.i + 1} 场`, `scene ${u.name || u.i + 1}`)), few = thin.length / units.length < 0.3;
    sum.push(M(`${units.length} ${byLine ? '句旁白' : '场'}里 ${units.length - thin.length} ${byLine ? '句' : '场'}有讲信息的画面`, `${units.length - thin.length} of ${units.length} ${byLine ? 'lines' : 'scenes'} have an information visual`) + (few && thin.length ? M(`（只有字：${thin.map(nm).join('、')}）`, ` (words only: ${thin.map(nm).join(', ')})`) : ''));
    if (units.length >= 2 && thin.length / units.length >= 0.6) warn(0, M(`${units.length} ${byLine ? '句旁白' : '场'}里有 ${thin.length} ${byLine ? '句' : '场'}画面上只有字（口号、大字、一句话、一个数字）：整支片子信息量不够。先写信息清单（3–5 件具体的事、各自的证据），每一${byLine ? '句' : '场'}用流程 / 对比 / 图表 / 标注截图 / 示意图讲出字说不清的东西`,
      `${thin.length} of ${units.length} ${byLine ? 'narration lines' : 'scenes'} only show words (keywords, a slogan, a single number): the video carries too little information. Write the information checklist first (3–5 concrete points, each with its evidence), then give each ${byLine ? 'line' : 'scene'} a visual that shows what the words can't: a labeled diagram, a flow, a comparison, a chart, an annotated screenshot or photo`));
    if (!few) for (const u of thin.slice(0, 8)) {
      const w = words(u), where = byLine ? M(`旁白 ${u.id}（"${String(u.text).slice(0, 18)}…"）`, `line ${u.id} ("${String(u.text).slice(0, 24)}…")`) : nm(u);
      warn(u.a, M(`${where} ${u.a.toFixed(1)}–${Math.min(u.b, body).toFixed(1)}s 画面上只有字${w ? '（' + w + '）' : ''}，没有讲信息的画面：换成流程 / 对比 / 图表 / 标注截图 / 示意图（快速版的 flow / compare / chart / annotate / diagram；手写用 S.steps / S.versus / S.figures / S.spotlight、画板的框和箭头，自己画的组件用 F.info 登记）`,
        `${where} ${u.a.toFixed(1)}–${Math.min(u.b, body).toFixed(1)}s only shows words${w ? ' (' + w + ')' : ''}: add a visual that carries information — a labeled diagram, a flow, a comparison, a chart, an annotated picture (board drawings, arrows and shapes count; quick mode: flow / compare / chart / annotate / diagram; a hand-made component registers with EV.info)`));
    }
    if (!few && thin.length > 8) warn(thin[8].a, M(`……还有 ${thin.length - 8} ${byLine ? '句' : '场'}也一样`, `…and ${thin.length - 8} more like this`));
  }
  // Promo: how many concrete points — information visuals (those built from the same cue / within 3 s count as one) + text with numbers (not inside an information visual)
  if (pg.promo && body >= 8) {
    const groups = new Set(), starts = [];
    for (const x of [...pg.info].sort((p, q) => p.a - q.a)) { if (x.a >= body) continue; if (x.group !== null) { groups.add(x.group); continue; } if (!starts.length || x.a >= starts[starts.length - 1] + 3) starts.push(x.a); }
    const inInfo = (t) => pg.info.some((x) => t >= x.a - 0.05 && t < x.b);
    const nums = new Set(pg.texts.filter((x) => x.kind !== 'caption' && x.a < body && /\d/.test(x.text) && !/^\s*0?\d\s*$/.test(x.text) && !inInfo(x.a)).map((x) => x.text.trim()));   // 01–09 and single digits are layout numbering
    const facts = groups.size + starts.length + nums.size, need = Math.max(1, Math.round((4 * body) / 30));
    sum.push(M(`具体的事 ${facts} 件（至少 ${need}）`, `${facts} concrete point(s) (at least ${need})`));
    if (facts < need) warn(0, M(`${body.toFixed(0)} 秒（不算片尾）只讲了 ${facts} 件具体的事（讲信息的画面 ${groups.size + starts.length} 处、带数字的字 ${nums.size} 段），这么长至少要 ${need} 件（30 秒 4 件）：把信息清单里真实的功能、数字、界面上的操作做成标注截图 / 流程 / 对比 / 图表`,
      `${body.toFixed(0)} s (without the end card) shows only ${facts} concrete point(s) (${groups.size + starts.length} information visual(s), ${nums.size} text(s) with numbers); this length needs at least ${need} (4 per 30 s): turn real features, numbers and UI steps into annotated screenshots / flows / comparisons / charts`));
  }
  if (sum.length) console.log(M('信息量：', 'Information: ') + sum.join(M('；', '; ')));
}

// Motion sheet: the page's motionScan (promo.js) measures animated elements every frame; here we print it, log clear problems as warnings, and draw a chart (review/motion-<aspect>.png)
async function motionSheet(proj, first, issues, asp) {
  const r = (await first.eval('window.__motion ? window.__motion() : null')).result.value;
  // Board-style explainers have no per-element motion sheet: say so (otherwise it looks as if motion was checked); motion is reviewed by eye with --strip, jumps by the final-video check
  if (!r) { console.log(M('动效：画板风格（白板 / 孔版 / 水墨）的讲解视频没有按元素的动效单；动作用 --strip 开始秒,结束秒 自己看，跳变由成片检查查', 'Motion: board-style explainers (whiteboard / riso / ink) have no per-element motion sheet; look at the motion with --strip start,end; jumps are caught by the final frame check')); return; }
  if (!r.tracks) { console.log(M('动效：这种风格的动作画在画板 / 画布里（白板、孔版、水墨、欧普的条纹……），没法按元素量；看成片检查和节奏实测', 'Motion: this style draws on a board / canvas, so motion is not measured per element; see the final-video check and the rhythm scan')); return; }
  const W2 = (x, n = 3) => x.slice(0, n).map((y) => `${y.t.toFixed(2)}s ${y.what}`).join(M('；', '; '));
  const spark = r.perSec.map((v) => '▁▂▃▄▅▆▇█'[Math.min(7, Math.round((v / Math.max(r.th.crowd, r.peak.v || 1)) * 7))]).join('');
  console.log(M(`动效（每帧量 ${r.tracks} 个被动画的元素；canvas / WebGL 里画的动作不算）`, `Motion (${r.tracks} animated elements measured per frame; canvas / WebGL drawing not included)`));
  console.log(M(`  同时在动  ${spark}  最多 ${r.peak.v} 个（${r.peak.t}s 附近；超过 ${r.th.crowd} 个会乱）`, `  moving at once  ${spark}  peak ${r.peak.v} (around ${r.peak.t}s; above ${r.th.crowd} reads as clutter)`));
  if (r.families.length) console.log(M(`  时长家族  ${r.families.map(([d, c]) => `${d}s ×${c}`).join(' · ')}（前三种占 ${Math.round(r.top3 * 100)}%；越集中越统一）`, `  duration families  ${r.families.map(([d, c]) => `${d}s ×${c}`).join(' · ')} (top three = ${Math.round(r.top3 * 100)}%)`));
  const rows = [['start', '匀速起步', 'linear start'], ['stop', '匀速停下', 'linear stop'], ['jitter', '位置来回抖', 'jitter'], ['flicker', '透明度来回闪', 'flicker'], ['fast', '太快', 'too fast'], ['cam', '镜头急变', 'camera jerk']];
  console.log('  ' + rows.map(([k, zh, en]) => `${M(zh, en)} ${r[k].length}`).join(' · ') + M(`（${r.segs} 段明显的动作）`, ` (${r.segs} clear moves)`));
  for (const [k, zh, en] of rows) if (r[k].length) console.log(`    ${M(zh, en)}${M('：', ': ')}${W2(r[k])}${r[k].length > 3 ? M(` …（共 ${r[k].length} 条）`, ` … (${r[k].length} in all)`) : ''}`);
  // Write the full list to review/motion-<aspect>.txt (the terminal lists only 3 per kind)
  { const txt = path.join(proj, 'review', `motion-${asp}.txt`); fs.mkdirSync(path.dirname(txt), { recursive: true }); fs.writeFileSync(txt, rows.map(([k, zh, en]) => `${M(zh, en)}${M(`（${r[k].length}）`, ` (${r[k].length})`)}\n` + r[k].map((y) => `  ${y.t.toFixed(2)}s ${y.what}`).join('\n')).join('\n\n') + '\n'); if (rows.some(([k]) => r[k].length > 3)) console.log(M(`  完整列表：${txt}`, `  Full list: ${txt}`)); }
  // Logged as warnings: flicker, camera jerks, crowding (always problems); starts/stops, too fast and jitter are only listed in the motion sheet (sometimes intentional: impact type, whip pans, screen shake)
  for (const x of r.flicker.slice(0, 3)) issues.push({ level: 'warn', t: x.t, src: '', what: M('动效', 'motion'), msg: M(`${x.what} 1 秒里透明度来回变了 7 次以上（超过每秒 3 次的闪，容易引起不适）：检查是不是两段动画在抢同一个属性`, `${x.what} flips opacity several times within 0.5 s (flicker): two animations may be fighting over it`) });
  for (const x of r.cam.slice(0, 3)) issues.push({ level: 'warn', t: x.t, src: '', what: M('动效', 'motion'), msg: M(`镜头急变：${x.what} 突然加速 / 减速（不在硬切上）——镜头的起停要缓`, `camera jerk: ${x.what} suddenly speeds up / slows down (not on a cut) — ease camera moves`) });
  if (r.peak.v > r.th.crowd) issues.push({ level: 'warn', t: r.peak.t, src: '', what: M('动效', 'motion'), msg: M(`${r.peak.t}s 附近同时有 ${r.peak.v} 个东西在动：太乱，错开或者少动几个`, `${r.peak.v} things move at once around ${r.peak.t}s: stagger or drop some`) });
  // Chart: one column per second, blue = number of things moving at once, red line = crowding threshold, red block on top = a problem in this second (start/stop / jitter-flicker / too fast / camera)
  const cw = 24, Hh = 200, n = r.perSec.length, Wd = n * cw + 20, top = Math.max(r.th.crowd * 1.25, r.peak.v || 1), boxes = [];
  r.perSec.forEach((v, i) => { const h = Math.max(2, Math.round((v / top) * (Hh - 40))); boxes.push(`drawbox=x=${10 + i * cw + 3}:y=${Hh - 10 - h}:w=${cw - 6}:h=${h}:color=${v > r.th.crowd ? '0xe8312a' : '0x3c82f6'}@0.95:t=fill`); });
  r.issueSec.forEach((c, i) => { if (c) boxes.push(`drawbox=x=${10 + i * cw + 3}:y=6:w=${cw - 6}:h=${Math.min(20, 6 + c * 4)}:color=0xf19d38@0.95:t=fill`); });
  boxes.push(`drawbox=x=10:y=${Hh - 10 - Math.round((r.th.crowd / top) * (Hh - 40))}:w=${n * cw}:h=2:color=0xe8312a@0.6:t=fill`);
  const png = path.join(proj, 'review', `motion-${asp}.png`);
  fs.mkdirSync(path.dirname(png), { recursive: true });
  await ffmpeg(['-f', 'lavfi', '-i', `color=c=0x1c1c1e:s=${Wd}x${Hh}`, '-vf', boxes.join(','), '-frames:v', '1', png], 'motion').done;
  console.log(M(`  图：${png}（蓝 = 同时在动的数量，红线 = 太挤，顶上橙块 = 这一秒有起停 / 抖闪 / 太快 / 镜头的问题）`, `  Chart: ${png}`));
}
function phoneBand(L, R, hz = 150) {
  const a = Math.exp((-2 * Math.PI * hz) / SR), win = Math.round(SR * 0.05), out = [];
  let x1 = 0, y1 = 0, x2 = 0, y2 = 0, acc = 0, accF = 0;
  for (let i = 0; i < L.length; i++) {
    const x = (L[i] + R[i]) / 2, y = a * (y1 + x - x1); x1 = x; y1 = y; // two first-order high-pass stages
    const z = a * (y2 + y - x2); x2 = y; y2 = z;
    acc += z * z; accF += x * x;
    if ((i + 1) % win === 0) { out.push({ phone: 10 * Math.log10(acc / win + 1e-12), full: 10 * Math.log10(accF / win + 1e-12) }); acc = 0; accF = 0; }
  }
  return out; // each item = 50 ms
}
function phoneSilence(plan, duration) {
  const { L, R, info } = play(plan, duration), pb = phoneBand(L, R), issues = [];
  for (const line of info.sheet || []) console.log(line);   // Music sheet: distinct bars, longest verbatim loop, orchestration per section, stereo width, following the picture
  for (const w of info.warnings) issues.push({ level: 'warn', t: 0, src: '', what: M('声音', 'sound'), msg: w });
  if (!info.hasMusic) return issues; // With effects only, silence is part of the design (long silences are flagged by the sound-design check)
  const avg = 10 * Math.log10(pb.reduce((s, v) => s + Math.pow(10, v.phone / 10), 0) / pb.length);
  let run = null;
  pb.forEach((v, i) => {
    const t = i * 0.05, quiet = v.phone < avg - 24 && t < duration - 1.0;
    // Stricter at the start: the first hit must be audible (0.3 s), 0.5 s elsewhere
    if (quiet) run ??= t; else if (run !== null) { if (t - run >= (run < 0.05 ? 0.3 : 0.5)) issues.push({ level: 'warn', t: run, src: '', what: M('手机上没声音', 'silent on phones'), msg: M(`${run.toFixed(2)}–${t.toFixed(2)} 秒手机外放基本听不到（150Hz 以上比平均低 24 dB 以上）：加一点中高频（快门、擦过声、和弦）或者别让音乐断这么久`, `${run.toFixed(2)}–${t.toFixed(2)} s is nearly inaudible on a phone speaker (above 150 Hz, more than 24 dB below average): add some mid/high content or don't let the music drop out so long`) }); run = null; }
  });
  return issues;
}
// File name: promos (with an audio plan) or an explicit --aspect get an aspect suffix (video-16x9.mp4); explainers stay video.mp4
const nameFor = (base, plan, ext = 'mp4') => (plan || opt('aspect') ? `${base}-${(opt('aspect') || '16:9').replace(':', 'x')}.${ext}` : `${base}.${ext}`);
// Review contact sheet: take a frame from the final video every 0.5 s (every 1 s in portrait) and tile them at the size seen on a phone
async function reviewSheets(proj, comp, page) {
  const plan0 = (await page.eval('window.__audioPlan ? window.__audioPlan() : null')).result.value;
  const asp = (opt('aspect') || '16:9').replace(':', 'x'), video = path.join(proj, 'out', nameFor(flag('draft') ? 'draft' : 'video', plan0));
  if (!fs.existsSync(video)) { console.error(M(`没有 ${video}：先渲染${flag('draft') ? '草稿（--draft）' : '成片'}`, `No ${video}: render ${flag('draft') ? 'a draft (--draft)' : 'the video'} first`)); return; }
  // Video older than the film's source files = reviewing the previous version: re-render first
  const src = ['index.html', 'sound.js', 'score.js', 'script.json'].map((f) => path.join(proj, f)).filter((f) => fs.existsSync(f));
  if (src.some((f) => fs.statSync(f).mtimeMs > fs.statSync(video).mtimeMs)) console.warn(M(`! ${path.basename(video)} 比 index.html / sound.js 旧——这张总览图是上一版：先重新渲染${flag('draft') ? '（--draft）' : ''}再评审`, `! ${path.basename(video)} is older than the project sources — these sheets show the previous version: render again${flag('draft') ? ' (--draft)' : ''} first`));
  const portrait = comp.height > comp.width, step = portrait ? 1 : 0.5, w = 360, cols = portrait ? 9 : 6;
  const n = Math.floor(comp.duration / step), rows = Math.ceil(n / cols), out = path.join(proj, 'review', `contact-${asp}.png`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  // Each cell takes the middle of its span (the fps filter picks frames by interval); timings go into a .txt of the same name (some ffmpeg builds lack drawtext, so no text is drawn on the image)
  await ffmpeg(['-i', video, '-vf', `fps=1/${step},scale=${w}:-2,tile=${cols}x${rows}:padding=4:color=0x222222`, '-frames:v', '1', out], 'review').done;
  fs.writeFileSync(out.replace(/\.png$/, '.txt'), Array.from({ length: n }, (_, i) => M(`#${i + 1}（第 ${Math.floor(i / cols) + 1} 行第 ${(i % cols) + 1} 列）t≈${(i * step).toFixed(1)}s`, `#${i + 1} (row ${Math.floor(i / cols) + 1}, column ${(i % cols) + 1}) t≈${(i * step).toFixed(1)}s`)).join('\n'));
  console.log(M(`评审总览图：${out}（每 ${step} 秒一格，${w}px 宽 = 手机上看到的大小；时间见同名 .txt）`, `Contact sheet: ${out} (one cell every ${step} s, ${w}px wide = phone size; times in the .txt)`));
  // Transitions: at the start of each section and 1.2 s around each hard cut, 8 frames per row
  const ev = (await page.eval('({ plan: window.__audioPlan ? window.__audioPlan() : null, cuts: window.__cuts ? window.__cuts() : [], texts: window.__textWins ? window.__textWins() : [] })')).result.value;
  const plan = ev.plan || { sections: [], sfx: [] };
  const marks = [...new Set([...plan.sections.map((x) => x.at), ...ev.cuts].map((t) => Math.round(t * 10) / 10))].filter((t) => t > 0.3 && t < comp.duration - 0.5).sort((a, b) => a - b);
  const tdir = fs.mkdtempSync(path.join(os.tmpdir(), 'ev-tr-')), rowsF = [];
  for (const [i, t] of marks.entries()) {
    const f = path.join(tdir, `r${String(i).padStart(2, '0')}.png`);
    await ffmpeg(['-ss', String(Math.max(0, t - 0.5)), '-t', '1.2', '-i', video, '-vf', `fps=${8 / 1.2},scale=${portrait ? 200 : 300}:-2,tile=8x1:padding=2:color=0x222222`, '-frames:v', '1', f], 'tr').done;
    if (fs.existsSync(f)) rowsF.push(f); // Transition points beyond the video's length have no frames (happens when the video is an old version)
  }
  if (rowsF.length) {
    const trOut = path.join(proj, 'review', `transitions-${asp}.png`);
    await ffmpeg([...rowsF.flatMap((f) => ['-i', f]), '-filter_complex', rowsF.length > 1 ? `${rowsF.map((_, i) => `[${i}]`).join('')}vstack=${rowsF.length}` : 'null', trOut], 'tr-stack').done;
    fs.writeFileSync(trOut.replace(/\.png$/, '.txt'), marks.map((t, i) => M(`第 ${i + 1} 行：${(Math.max(0, t - 0.5)).toFixed(2)}–${(t + 0.7).toFixed(2)} 秒（8 帧，转场点 ${t.toFixed(2)}）`, `row ${i + 1}: ${(Math.max(0, t - 0.5)).toFixed(2)}–${(t + 0.7).toFixed(2)} s (8 frames, transition at ${t.toFixed(2)})`)).join('\n'));
    console.log(M(`转场过程：${trOut}（${marks.length} 行，每行一个转场前后 1.2 秒；时间见同名 .txt）`, `Transitions: ${trOut} (${marks.length} rows, 1.2 s around each transition; times in the .txt)`));
  }
  fs.rmSync(tdir, { recursive: true, force: true });
  // Data table every 0.5 s: picture change, phone-band / full-band loudness, what happens at that moment
  const Wd = 160, Ht = 90, p = spawn('ffmpeg', ['-v', 'error', '-i', video, '-vf', `fps=30,scale=${Wd}:${Ht},format=gray`, '-f', 'rawvideo', '-']);
  const chunks = []; p.stdout.on('data', (d) => chunks.push(d)); await new Promise((r) => p.on('close', r));
  const buf = Buffer.concat(chunks), sz = Wd * Ht, nf = Math.floor(buf.length / sz), diff = [];
  for (let i = 0; i < nf - 1; i++) { let s = 0; for (let j = 0; j < sz; j++) s += Math.abs(buf[i * sz + j] - buf[(i + 1) * sz + j]); diff.push(s / sz); }
  const pb = ev.plan ? (() => { const { L, R } = play(plan, comp.duration, hasVoice() ? { lines: tlLines() } : null); return phoneBand(L, R); })() : [];
  const lines = [M('时间 | 画面变化（帧差均值；0=定格，0.1–0.3=慢推漂移，>3=快动作/转场） | 手机频段 dB | 全频段 dB | 事件', 'time | picture change (mean frame difference; 0 = frozen, 0.1–0.3 = slow drift, >3 = fast move / transition) | phone band dB | full band dB | events')];
  for (let t = 0; t < comp.duration - 1e-6; t += 0.5) {
    const ds = diff.slice(Math.round(t * 30), Math.round((t + 0.5) * 30)), mv = ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : 0;
    const ps = pb.slice(Math.round(t / 0.05), Math.round((t + 0.5) / 0.05)), en = (k) => (ps.length ? (10 * Math.log10(ps.reduce((s, v) => s + Math.pow(10, v[k] / 10), 0) / ps.length)).toFixed(1) : '');
    const inW = (x) => x >= t && x < t + 0.5;
    const evs = [
      ...plan.sections.filter((x) => inW(x.at)).map((x) => M(`段落 强度${x.energy}${x.hit ? ' 重击' : ''}${x.gap ? ' 留空' : ''}@${x.at.toFixed(2)}`, `section energy ${x.energy}${x.hit ? ' hit' : ''}${x.gap ? ' gap' : ''}@${x.at.toFixed(2)}`)),
      ...ev.cuts.filter(inW).map((c) => M(`硬切@${c.toFixed(2)}`, `cut@${c.toFixed(2)}`)),
      ...plan.sfx.filter((x) => inW(x.t)).map((x) => `${x.type}@${x.t.toFixed(2)}`),
      ...ev.texts.filter((x) => inW(x.a)).map((x) => M(`出字「${x.text.slice(0, 18)}」`, `text in "${x.text.slice(0, 18)}"`)),
      ...ev.texts.filter((x) => x.b < 1e8 && inW(x.b) && x.kind === 'headline').map((x) => M(`收字「${x.text.slice(0, 18)}」`, `text out "${x.text.slice(0, 18)}"`)),
    ];
    lines.push(`${t.toFixed(1).padStart(5)} | ${mv.toFixed(2).padStart(5)} | ${en('phone').padStart(6)} | ${en('full').padStart(6)} | ${evs.join(M('，', ', '))}`);
  }
  {   // With narration only look where no one speaks (speaking spans and the opening cover count as something)
    const vz = hasVoice(), acts = { sfx: plan ? plan.sfx.map((x) => x.t) : [], texts: ev.texts.map((x) => ({ a: x.a, text: x.text })), speech: vz ? speechSpans() : [] };
    const dead = deadAir(diff, 30, 0, acts);
    lines.push('', dead.length ? M(`空放（画面只有慢动、没有新的字、没有音效，≥ 1.2 秒）：${dead.map(([a, b]) => `${a.toFixed(1)}–${b.toFixed(1)}s`).join('，')}`, `Dead air (only slow motion, no new text, no sound effect, ≥ 1.2 s): ${dead.map(([a, b]) => `${a.toFixed(1)}–${b.toFixed(1)}s`).join(', ')}`) : M('空放：没有', 'Dead air: none'));
    const quiet = quietGaps(diff.length, 30, 0, acts, ev.cuts || [], 1.5, vz ? diff : null).filter(([a, b]) => !dead.some(([x, y]) => x < b && y > a));
    lines.push(quiet.length ? M(`没有新动作（镜头在动、但没有新的字 / 音效 / 硬切，≥ 1.5 秒）：${quiet.map(([a, b]) => `${a.toFixed(1)}–${b.toFixed(1)}s`).join('，')}`, `No new action (≥ 1.5 s): ${quiet.map(([a, b]) => `${a.toFixed(1)}–${b.toFixed(1)}s`).join(', ')}`) : M('没有新动作（≥ 1.5 秒）：没有', 'No new action (≥ 1.5 s): none'));
  }
  const rep = path.join(proj, 'review', `report-${asp}.txt`);
  fs.writeFileSync(rep, lines.join('\n'));
  console.log(M(`数据表：${rep}（逐 0.5 秒：画面变化、手机频段 / 全频段响度、事件）`, `Report: ${rep} (every 0.5 s: picture change, phone / full band loudness, events)`));
}

// Automatic check results
function report(issues) {
  if (!issues.length) { console.log(M('自动检查：没有发现问题', 'Lint check: no issues found')); return 0; }
  const errs = issues.filter((i) => i.level === 'error');
  console.log(M(`自动检查：${errs.length} 个错误，${issues.length - errs.length} 个提醒`, `Lint check: ${errs.length} error(s), ${issues.length - errs.length} warning(s)`));
  for (const i of issues) console.log(`  ${i.level === 'error' ? M('✗ 错误', '✗ error') : M('! 提醒', '! warning')}  ${i.t.toFixed(2)}s  ${i.src || ''}  ${i.what}${M('：', ': ')}${i.msg}`);
  console.log(M('  → 用 --strip 开始秒,结束秒 查看出问题的那段动画', '  → use --strip <start s>,<end s> to look at the animation where the problem is'));
  return errs.length;
}

// Tile several screenshots into a grid
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
    const plan0 = (await first.eval('window.__audioPlan ? window.__audioPlan() : null')).result.value;
    if (plan0) await prepareScore(plan0);
    const voice = hasVoice();
    const fps = Number(opt('fps', draft ? 24 : comp.fps));
    const review = path.join(proj, 'review');
    // Fonts: reported during the check; when rendering the final video, stop if a font did not load (the video would use a fallback font and the layout would differ from the check) — add --allow-font-fallback to force it
    const fonts = (await first.eval('window.__fontInfo || []')).result.value || [];
    let fontMiss = [];
    if (fonts.length) {
      const ok = fonts.filter((f) => f.ok).map((f) => f.family), miss = fonts.filter((f) => !f.ok).map((f) => f.family);
      fontMiss = miss;
      console.log(M('字体：' + (ok.length ? ok.join('、') + ' 可用' : '') + (miss.length ? `${ok.length ? '；' : ''}${miss.join('、')} 不可用（本机没装、也没能联网下载），已自动改用备用字体` : ''),
        'Fonts: ' + (ok.length ? ok.join(', ') + ' available' : '') + (miss.length ? `${ok.length ? '; ' : ''}${miss.join(', ')} unavailable (not installed locally and could not be downloaded); switched to backup fonts automatically` : '')));
    }
    // Duration: when the picture runs longer than the narration (end hold, numbered overview), the video is extended and the audio padded with silence
    const tlDur = (await first.eval('window.TIMELINE ? window.TIMELINE.duration : 0')).result.value || 0;
    console.log(M(`时长：${comp.duration.toFixed(1)} 秒`, `Duration: ${comp.duration.toFixed(1)} s`) + (tlDur && comp.duration > tlDur + 0.05 ? M(`（旁白 ${tlDur.toFixed(1)} 秒，结尾画面多停留 ${(comp.duration - tlDur).toFixed(1)} 秒）`, ` (narration ${tlDur.toFixed(1)} s; the ending holds ${(comp.duration - tlDur).toFixed(1)} s longer)`) : ''));
    if (flag('review')) { await reviewSheets(proj, first.comp, first); return; }
    if (flag('rhythm')) {   // Only re-measure the rhythm of an already rendered video (when the measurement changed or you want the chart again; no re-render)
      const plan1 = (await first.eval('window.__audioPlan ? window.__audioPlan() : null')).result.value, video = path.join(proj, 'out', nameFor('video', plan1));
      const rh = (await first.eval('window.__rhythm ? window.__rhythm() : null')).result.value;
      if (!fs.existsSync(video) || !rh) { console.error(M(`没有 ${video}，或者这个片子没有节奏单（快速版才有）`, `No ${video}, or this film has no rhythm sheet (quick mode only)`)); return; }
      const ev = (await first.eval('({ cuts: window.__cuts ? window.__cuts() : [], sfx: window.__audioPlan ? window.__audioPlan().sfx.map((x) => x.t) : [], texts: window.__textWins ? window.__textWins().map((x) => x.a) : [] })')).result.value;
      const Wd = 160, Ht = 90, p2 = spawn('ffmpeg', ['-v', 'error', '-i', video, '-vf', `fps=30,scale=${Wd}:${Ht},format=gray`, '-f', 'rawvideo', '-']);
      const chunks = []; p2.stdout.on('data', (x) => chunks.push(x)); await new Promise((r) => p2.on('close', r));
      const buf = Buffer.concat(chunks), sz = Wd * Ht, nf = Math.floor(buf.length / sz), dd = [];
      for (let i = 0; i < nf - 1; i++) { let s2 = 0; for (let j = 0; j < sz; j++) s2 += Math.abs(buf[i * sz + j] - buf[(i + 1) * sz + j]); dd.push(s2 / sz); }
      await rhythmScan(proj, dd, 30, 0, first.comp.duration, rh, ev, (opt('aspect') || '16:9').replace(':', 'x'));
      return;
    }
    if (flag('scan')) {   // Only re-run the final-video check (jumps, flashes, freezes, dead air), no re-render: use after changing the check or to confirm an old video
      // Board-style renders with --aspect get a suffixed file name: look for both names
      const video = [nameFor('video', plan0), `video-${(opt('aspect') || '16:9').replace(':', 'x')}.mp4`, 'video.mp4'].map((f) => path.join(proj, 'out', f)).find((f) => fs.existsSync(f));
      if (!video) { console.error(M(`没有成片（out/${nameFor('video', plan0)}）：先渲染`, `No video (out/${nameFor('video', plan0)}): render it first`)); return; }
      const ev = (await first.eval('({ cuts: window.__cuts ? window.__cuts() : [], appears: window.__appears ? window.__appears() : [], trans: window.__transitions ? window.__transitions() : [], sfx: window.__audioPlan ? window.__audioPlan().sfx.map((x) => x.t) : [], texts: window.__textWins ? window.__textWins().map((x) => ({ a: x.a, text: x.text })) : [] })')).result.value;
      console.log(M(`成片：${video}`, `Video: ${video}`));
      await popScan(video, fps, 0, ev.cuts || [], { sfx: ev.sfx, texts: ev.texts }, ev.appears || [], voice, ev.trans || [], (await first.eval('window.__stillMax ? window.__stillMax() : 0.6')).result.value);
      return;
    }
    const lint = await first.eval('window.__lint ? window.__lint() : []');
    const issues = lint.result.value || [];
    // No new action (films without narration): 1.5 s or more between event times (text, sound effects, hard cuts, sections) — listed before rendering (the final-video check uses frame diffs, and a slow camera push can hide the gap)
    {
      const ev0 = (await first.eval('({ cuts: window.__cuts ? window.__cuts() : [], plan: window.__audioPlan ? window.__audioPlan() : null, texts: window.__textWins ? window.__textWins().map((x) => ({ a: x.a, text: x.text })) : [] })')).result.value;
      if (ev0.plan || voice) {   // Board-style explainers have no audio plan (the music is in script.json): check them even with narration
        const dur0 = first.comp.duration, nf0 = Math.ceil(dur0 * 30);
        // With narration: speaking spans count as something; only look where no one speaks (start, long pauses, after the last line); before rendering we can't tell whether the picture moves (board drawing, figure walking), so only report gaps of 2 s or more
        const sp0 = voice ? speechSpans() : [];
        const acts0 = { sfx: ev0.plan ? [...ev0.plan.sfx.map((x) => x.t), ...(ev0.plan.sections || []).map((x) => x.at)] : [], texts: ev0.texts || [], speech: sp0 };
        for (const [a, b] of quietGaps(nf0, 30, 0, acts0, ev0.cuts || [], voice ? 2.0 : 1.5)) issues.push({ level: 'warn', t: Math.round(a * 100) / 100, src: '', what: M('没有新动作', 'no new action'), msg: M(`${voice ? '旁白停下来，' : ''}${a.toFixed(2)}–${b.toFixed(2)}s 有 ${(b - a).toFixed(1)} 秒没有新的字、音效、硬切（画面只是在推、在飘）：给这一段一个真的动作（亮起一处、划掉一条、加一行），或者把下一个东西提前`, `${voice ? 'narration paused: ' : ''}${a.toFixed(2)}–${b.toFixed(2)}s: ${(b - a).toFixed(1)} s without new text, sound or cut (the picture only drifts): give it a real action or bring the next one forward`) });
      }
    }
    // The one-line music / sound-design note is still the template text: this film's sound hasn't been thought through yet (rendering goes ahead, but it is an unfinished spot)
    for (const [obj, f] of [[SCORE, 'score.js'], [PALETTE, 'sound.js']]) if (obj && /^(一句话：|One line:)/.test(String(obj.name || '')) && fs.existsSync(path.join(proj, f))) issues.push({ level: 'warn', t: 0, src: '', what: M('声音', 'sound'), msg: M(`${f} 的 name 还是模板原文（"${String(obj.name).slice(0, 24)}…"）：写一句这支片子的声音 / 配乐是什么样的，再按它改`, `${f} still has the template's name ("${String(obj.name).slice(0, 24)}…"): write one line about how this film should sound, then shape it to that`) });
    if (fontMiss.length) issues.push({ level: 'warn', t: 0, src: '', what: M('字体', 'fonts'), msg: M(`${fontMiss.join('、')} 没加载上，这次用的是备用字体（字宽不一样，切边、重叠的结果可能和成片不同）：检查网络后重跑；字体会缓存在 ~/.cache/bubble-video/fonts，下好一次以后就稳定了`, `${fontMiss.join(', ')} did not load; a fallback font was used (widths differ, so clipping / overlap results may not match the final film): check the network and run again; fonts are cached in ~/.cache/bubble-video/fonts after the first download`) });
    // Fact check: every piece of text that appears on screen (registered by the page) must be found in brief.md (ignoring case, spaces and punctuation)
    const briefPath = path.join(proj, 'brief.md');
    const texts = (await first.eval('window.__texts ? window.__texts() : []')).result.value || [];
    if (texts.length) {
      const boardFacts = (await first.eval('!!window.__boardFacts')).result.value;   // Older board-style projects may have no brief.md yet: warn, not an error
      if (!fs.existsSync(briefPath)) issues.push({ level: boardFacts ? 'warn' : 'error', t: 0, src: '', what: M('事实核对', 'fact check'), msg: M('没有 brief.md：画面上的文字必须先在事实表里查证', 'no brief.md: on-screen text must be verified in the fact sheet first') });
      else {
        const norm = (x) => x.toLowerCase().replace(/[\s\p{P}\p{S}\u2460-\u2473]+/gu, '');   // Numbering like ①② is added by the layout, not content
        const raw = fs.readFileSync(briefPath, 'utf8').toLowerCase(), brief = norm(raw);
        // Very short alphanumerics ("3x", "ms", "AI") match only as whole words: otherwise "02" would pass just because it happens to be part of "2026"
        const words = ` ${raw.replace(/[\s\p{P}\p{S}]+/gu, ' ')} `;
        //   Short values with punctuation ("9:41", "$2.1M"): also found if they appear verbatim (punctuation kept) in the brief, not flanked by letters or digits
        const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const found = ([x, r]) => (/^[a-z0-9]{1,3}$/.test(x) ? new RegExp(`(?<![a-z0-9])${x}(?![a-z0-9])`).test(words) || (r !== x && new RegExp(`(?<![a-z0-9])${esc(r)}(?![a-z0-9])`).test(raw)) : brief.includes(x));
        for (const tx of texts) {
          const parts = tx.split(/ \/ |\n/).map((r) => [norm(r), r.toLowerCase().trim()]).filter(([x]) => x)   // Check line by line: "name + line break + description" in a box are two pieces of text checked separately
            .filter(([x]) => !/^\d{1,2}$/.test(x));   // layout numbering like 01–99 is not content
          const miss = parts.filter((x) => !found(x));
          if (miss.length) issues.push({ level: 'warn', t: 0, src: '', what: M('事实核对', 'fact check'), msg: M(`"${tx.slice(0, 50)}" 在 brief.md 里找不到出处。事实写进"事实"，创意文案写进"文案"，不能编造`, `"${tx.slice(0, 50)}" is not in brief.md. Facts go under facts, creative copy under copy; nothing invented`) });
        }
      }
    }
    // Colours come from the product (promos): brief.md needs a line "颜色：#…（来自：…）" (Colours: #… (from: …)); also warn when the quick version doesn't use the researched brand colours — otherwise every film gets the style's default palette
    // Explainer (narrated) topics have no brand colours: not checked; a brief that says "风格默认配色" (style default palette) counts as written too
    if ((await first.eval('!!window.PROMO')).result.value && fs.existsSync(briefPath) && !hasVoice() && !/风格默认配色|style default (colou?rs|palette)/i.test(fs.readFileSync(briefPath, 'utf8'))) {
      const raw = fs.readFileSync(briefPath, 'utf8');
      if (!/^[\s>*-]*(颜色|colou?rs?)\s*[:：].*#[0-9a-f]{3,6}/im.test(raw)) issues.push({ level: 'warn', t: 0, src: '', what: M('颜色', 'colours'), msg: M('brief.md 里没有"颜色：#…（来自：…）"这一行：颜色要从产品里取（官网 CSS、按钮、Logo；调研时 research/colors.json 列了候选），别直接用风格的默认配色', 'brief.md has no "Colours: #… (from: …)" line: take colours from the product (site CSS, buttons, logo; research/colors.json lists candidates) instead of the style defaults') });
      const used = (await first.eval('window.__brand || null')).result.value, cj = path.join(proj, 'research', 'colors.json');
      if (used && !used.brand && !used.accent && fs.existsSync(cj)) { const c = Object.values(JSON.parse(fs.readFileSync(cj, 'utf8'))).find((v) => v && v.brand); if (c) issues.push({ level: 'warn', t: 0, src: '', what: M('颜色', 'colours'), msg: M(`调研到了品牌色 ${c.brand}${c.accent ? '（还有 ' + c.accent + '）' : ''}，片子没用上：PROMO.film({ brand: '${c.brand}' })——每种风格会按自己的材料落地`, `research found the brand colour ${c.brand}${c.accent ? ' (and ' + c.accent + ')' : ''} but the film doesn't use it: PROMO.film({ brand: '${c.brand}' })`) }); }
    }
    // Sound: phone speakers can't play below 150 Hz — for a promo without narration, a long silence in the phone band is heard as "it cut out"
    if (plan0 && !voice) issues.push(...phoneSilence(plan0, comp.duration));
    // Rhythm sheet (laid out automatically by the quick version: each scene's role, intensity, camera, music move)
    const rhythm = (await first.eval('window.__rhythm ? window.__rhythm() : null')).result.value;
    if (rhythm && rhythm.length) {
      console.log(M('节奏单：', 'Rhythm sheet:'));
      const bar = (e) => '▁▃▅█'[Math.max(0, Math.min(3, e))];
      for (const r of rhythm) console.log(`  ${String(r.scene).padEnd(4)} ${(r.from.toFixed(1) + '–' + r.to.toFixed(1) + 's').padEnd(13)} ${String(r.role).padEnd(8)} ${bar(r.energy)} ${String(r.kind).padEnd(9)} ${M('镜头', 'camera')} ${String(r.camera).padEnd(7)} ${r.music || ''}`);
    }
    // Information: words-only scenes / narration lines, and how many concrete points a promo makes
    await infoDensity(first, comp, issues);
    // Motion sheet (promos): measure animated elements every frame — starts/stops, jitter/flicker, too fast, how many move at once, duration families, camera jerks (--no-motion skips it)
    if (flag('check') && !flag('no-motion')) await motionSheet(proj, first, issues, (opt('aspect') || '16:9').replace(':', 'x'));
    // Warnings the page reports itself (console.warn / console.error: ambiguous characters in the cast list, words not found in the narration …) are listed in the check results too
    for (const l of [...new Set(first.logs || [])]) issues.push({ level: /^console\.error|^页面异常|^Page exception/.test(l) ? 'error' : 'warn', t: 0, src: '', what: M('页面', 'page'), msg: l.replace(/^console\.(warning|error): /, '') });
    const errors = report(issues);
    if (flag('check')) { process.exitCode = errors ? 1 : 0; return; }
    if (flag('remux') || flag('audio')) {
      const tmpd = fs.mkdtempSync(path.join(os.tmpdir(), 'ev-snd-'));
      const a = await buildAudio(first, comp, tmpd);
      if (!a) { console.error(M('这个项目没有声音（没有旁白、音频计划或背景音乐）', 'This project has no sound (no voiceover, sound plan or background music)')); fs.rmSync(tmpd, { recursive: true, force: true }); return; }
      if (flag('audio')) {
        fs.mkdirSync(path.join(proj, 'out'), { recursive: true });
        fs.copyFileSync(a.wav, path.join(proj, 'out', 'audio.wav'));
        console.log(M(`声音：${path.join(proj, 'out', 'audio.wav')}（${a.desc}）`, `Sound: ${path.join(proj, 'out', 'audio.wav')} (${a.desc})`));
      } else {
        // Sound only: re-synthesise the audio and attach it to the already rendered video (changing the music doesn't need a picture re-render)
        const video = path.join(proj, 'out', nameFor('video', a.plan));
        if (!fs.existsSync(video)) { console.error(M(`没有成片 ${video}：先渲染`, `No video ${video}: render it first`)); return; }
        const ln = await loudnorm(a.wav, 0, comp.duration, a.target, a.voice ? 3 : 4), outv = path.join(tmpd, 'v.mp4');
        await ffmpeg(['-i', video, '-i', a.wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', ...(ln ? ['-af', ln.af, '-ar', '48000'] : []), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outv], 'remux').done;
        fs.copyFileSync(outv, video);
        console.log(M(`换好声音：${video}（${a.desc}）`, `Sound replaced: ${video} (${a.desc})`));
      }
      fs.rmSync(tmpd, { recursive: true, force: true });
      return;
    }
    if (flag('captions')) {
      const caps = (await first.eval('window.__captions ? window.__captions() : []')).result.value || [];
      for (const c of caps) console.log(`  ${c.start.toFixed(2).padStart(7)} – ${c.end.toFixed(2).padStart(7)}  ${c.text}`);
      return;
    }
    if (flag('cover')) {
      const out = path.join(proj, 'out', 'cover.png');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, await first.frame((await first.eval('window.__coverAt')).result.value ?? 0, 'png'));
      console.log(M(`封面：${out}`, `Cover: ${out}`));
      return;
    }
    if (flag('board')) {
      const out = path.join(proj, 'out', opt('aspect') ? nameFor('board', null, 'png') : 'board.png');   // The portrait contact sheet gets a suffix so it doesn't overwrite the landscape one
      const v = await first.snapshot(out);
      console.log(v ? `${v.label}${M('：', ': ')}${out} (${v.w}×${v.h})` : M('这个项目没有白板，无法导出全貌', 'This project has no whiteboard; no overview to export'));
      return;
    }

    // ---- Screenshot mode ----
    // Final video: don't render if a font didn't load (it would use a fallback font with a different layout from the check)
    const finalVideo = !flag('check') && !flag('stills') && !flag('sheet') && !flag('strip') && !flag('audio') && !flag('remux');
    if (finalVideo && fontMiss.length && !flag('allow-font-fallback')) {
      console.error(M(`停下：${fontMiss.join('、')} 没加载上，成片会用备用字体。检查网络后重跑（下好一次会缓存在 ~/.cache/bubble-video/fonts）；确实要用备用字体渲染加 --allow-font-fallback`, `Stopped: ${fontMiss.join(', ')} did not load, so the film would use a fallback font. Check the network and run again (fonts are cached in ~/.cache/bubble-video/fonts once downloaded); to render with the fallback anyway, add --allow-font-fallback`));
      process.exitCode = 1; return;
    }
    if (flag('stills') || flag('sheet') || flag('strip')) {
      fs.mkdirSync(review, { recursive: true });
      let times;
      if (flag('stills') && typeof opt('stills') === 'string') times = opt('stills').split(',').map(Number);   // bare --stills = one still per line, like --sheet
      else if (flag('strip')) {
        let [a, b, n = 8] = opt('strip').split(',').map(Number);
        if (!(b > a) || n <= 1) { b = a; n = 1; }   // A single frame: --strip 12.6,12.6,1 or --strip 12.6,13,1
        times = n === 1 ? [a] : Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
      } else {
        const tl = JSON.parse(fs.readFileSync(path.join(proj, 'timeline.json'), 'utf8'));
        times = tl.lines.filter((l) => !l.silence).map((l) => Math.min(comp.duration - 0.05, l.end + 0.3));
        times.push(comp.duration - 0.05);
        // Frames that fall inside a transition (line end + 0.3 s often lands right in a scene-change wedge / big circle): take the frame just before the transition instead, to see how the scene ends
        const tr = (await first.eval('window.__transitions ? window.__transitions() : []')).result.value || [], cs = (await first.eval('window.__cuts ? window.__cuts() : []')).result.value || [];
        const wins = [...tr, ...cs.filter((c) => !tr.some(([a, b]) => c >= a && c <= b)).map((c) => [c - 0.3, c + 0.3])];
        times = times.map((t) => { for (let k = 0; k < 8; k++) { const w = wins.find(([a, b]) => t > a - 0.02 && t < b + 0.02); if (!w) break; t = Math.max(0, w[0] - 0.05); } return t; });   // back-to-back transitions (an iris out then in): keep stepping back
      }
      const sheetScale = flag('sheet') ? 0.25 : flag('strip') ? 0.3 : 1;
      const page = sheetScale === scale ? first : await openPage(cdp, sheetScale);
      const files = [], ftmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ev-strip-')); // Each run gets its own temp folder: landscape and portrait runs in parallel don't overwrite each other
      for (const [i, t] of times.entries()) {
        const buf = await page.frame(t, 'png');
        const f = flag('stills') ? path.join(review, `still-${t.toFixed(2)}${opt('aspect') ? '-' + opt('aspect').replace(':', 'x') : ''}.png`) : path.join(ftmp, `frame-${String(i).padStart(3, '0')}.png`);
        fs.writeFileSync(f, buf);
        files.push(f);
      }
      if (!flag('stills')) {
        const cols = 4;
        const name = (flag('sheet') ? 'sheet' : `strip-${opt('strip').split(',').slice(0, 2).join('-')}`) + (opt('aspect') ? '-' + opt('aspect').replace(':', 'x') : '');
        const out = path.join(review, `${name}.png`);
        await tile(files, cols, out);
        fs.rmSync(ftmp, { recursive: true, force: true });
        fs.writeFileSync(path.join(review, `${name}.txt`), times.map((t, i) => M(`#${i + 1}（第 ${Math.floor(i / cols) + 1} 行第 ${(i % cols) + 1} 列）t=${t.toFixed(2)}s`, `#${i + 1} (row ${Math.floor(i / cols) + 1}, column ${(i % cols) + 1}) t=${t.toFixed(2)}s`)).join('\n'));
        console.log(M(`${flag('sheet') ? '总览图' : '动画条'}：${out}（${times.length} 格，按行从左到右，时间见 ${name}.txt）`, `${flag('sheet') ? 'Contact sheet' : 'Animation strip'}: ${out} (${times.length} cells, row by row, left to right; times in ${name}.txt)`));
      } else { files.forEach((f) => console.log(M('截图：', 'Still: ') + f)); fs.rmSync(ftmp, { recursive: true, force: true }); }
      if (first.logs.length) console.log(first.logs.join('\n'));
      return;
    }

    // ---- Video mode ----
    if (errors && !flag('draft') && !flag('force')) {
      console.error(M('有自动检查错误，已停止渲染成片。请修改后重试；确认这些错误可以忽略时，加 --force 强制渲染。', 'The lint check found errors, so the final render was stopped. Fix them and try again; if you are sure these errors can be ignored, add --force to render anyway.'));
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
    // Motion blur: N subframes per frame spread over a 180° shutter (half a frame interval), merged into one frame by ffmpeg's tmix. On by default for final promo videos (6), off otherwise
    // a style may set its own default (F.blurBase: 1 for slow archive pushes); --blur on the command line wins
    const blurBase = (await first.eval('window.__blurBase ? window.__blurBase() : null')).result.value, blurGiven = args.includes('--blur');
    const N = Math.max(1, Math.round(Number(blurGiven ? opt('blur') : draft || !plan0 ? 1 : blurBase ?? 6))), SHUTTER = 0.5;
    const spansOn = !draft && !(blurGiven && N === 1);   // F.blur spans still apply when the style's base is 1
    const cuts = (await first.eval('window.__cuts ? window.__cuts() : []')).result.value || [];
    // Very fast moves (cube transitions, whip pans, hard push-ins) show separate ghost streaks with 6: spans registered with F.blur(start, end, count) use more subframes
    const blurs = (await first.eval('window.__blurs ? window.__blurs() : []')).result.value || [];
    const nAt = (f) => (!spansOn ? N : blurs.reduce((m, b) => (f / fps >= b[0] && f / fps < b[1] ? Math.max(m, b[2]) : m), N));
    const posterAt = flag('poster') ? (await first.eval('window.__coverAt')).result.value ?? null : null;
    const subTimes = (f, n) => {
      const tc = f / fps;
      return Array.from({ length: n }, (_, j) => {
        let t = n === 1 ? tc : tc + ((j - (n - 1) / 2) * SHUTTER) / (fps * n);
        t = Math.min(comp.duration - 1e-3, Math.max(0, t));
        for (const c of cuts) if ((t < c) !== (tc < c)) t = tc >= c ? c : c - 1e-4; // subframes don't cross a hard cut
        return t;
      });
    };
    // BT.709 + TV range (players and platforms interpret colour this way by default; untagged video looks washed out or oversaturated)
    const color = 'scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p';
    const vfOf = (n) => (n > 1 ? `tmix=frames=${n},select='eq(mod(n\\,${n})\\,${n - 1})',setpts=N/${fps}/TB,${color}` : color);
    // Bitrate cap: quality is CRF 18, but styles with full-screen halftone / paper grain (riso) shoot past 17 Mbps — cap 1080p at 12 Mbps (platforms re-compress anyway); change with --maxrate, --maxrate 0 for no cap
    const cap = Number(opt('maxrate', 12)), capArgs = draft || !cap ? [] : ['-maxrate', `${cap}M`, '-bufsize', `${cap * 2}M`];
    const x264 = (n) => ['-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'medium', '-crf', draft ? '26' : '18', ...capArgs, '-vf', vfOf(n),
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
    if (N > 1) console.log(M(`运动模糊：每帧 ${N} 张子帧（180° 快门）${blurs.length ? `，${blurs.length} 段快动作加到 ${Math.max(...blurs.map((b) => b[2]))} 张` : ''}${cuts.length ? `，${cuts.length} 个硬切点不叠` : ''}`, `Motion blur: ${N} sub-frames per frame (180° shutter)${blurs.length ? `, ${blurs.length} fast segment(s) up to ${Math.max(...blurs.map((b) => b[2]))}` : ''}${cuts.length ? `, ${cuts.length} cut(s) kept sharp` : ''}`));
    const segs = (await Promise.all(pages.map(async (page, w) => {
      const a = f0 + Math.floor((total * w) / workers), b = f0 + Math.floor((total * (w + 1)) / workers);
      // Consecutive frames with the same subframe count are encoded as one segment (tmix's count is fixed), then concatenated in order
      const runs = [];
      for (let f = a; f < b; f++) { const n = nAt(f); if (runs.length && runs.at(-1).n === n) runs.at(-1).b = f + 1; else runs.push({ n, a: f, b: f + 1 }); }
      const out = [];
      // Per-frame timeout: if a frame isn't back after 60 s (Chrome stuck), this worker retakes it on a fresh page (up to 2 times); if that still fails, exit with an error instead of hanging
      let pg = page;
      const FRAME_MS = Number(opt('frame-timeout', 60)) * 1000;
      const grab = async (t) => {
        for (let k = 0; ; k++) {
          let timer; const lim = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('frame-timeout')), FRAME_MS); });
          try { const r = await Promise.race([pg.frame(t), lim]); clearTimeout(timer); return r; }
          catch (e) { clearTimeout(timer); if (e.message !== 'frame-timeout' || k >= 2) throw new Error(e.message === 'frame-timeout' ? M(`第 ${w + 1} 路在 ${t.toFixed(2)} 秒卡住了（换了 2 次页面还是超过 ${FRAME_MS / 1000} 秒）：检查这一刻的画面有没有死循环 / 很重的计算`, `worker ${w + 1} stuck at ${t.toFixed(2)} s`) : e.message); console.log(M(`\n第 ${w + 1} 路在 ${t.toFixed(2)} 秒超过 ${FRAME_MS / 1000} 秒没拍回来：换一个新页面重拍`, `\nworker ${w + 1} timed out at ${t.toFixed(2)} s: retrying on a fresh page`)); pg = await openPage(cdp, scale); }
        }
      };
      for (const [ri, run] of runs.entries()) {
        const seg = path.join(tmp, `seg-${w}-${String(ri).padStart(3, '0')}.mp4`), n = run.n;
        const ff = ffmpeg(['-f', 'image2pipe', '-framerate', String(fps * n), '-c:v', 'mjpeg', '-i', '-', ...x264(n), '-r', String(fps), seg], 'seg' + w);
        for (let f = run.a; f < run.b; f++) {
          if (f === 0 && posterAt !== null) { const pb = await grab(posterAt); for (let j = 0; j < n; j++) await write(ff.stdin, pb); }
          else if (n === 1) await write(ff.stdin, await grab(f / fps));
          else {
            // Shoot the two ends of the shutter first: if they are identical, nothing moves in this frame — reuse it and skip the ones in between
            const ts = subTimes(f, n), first0 = await grab(ts[0]), last0 = await grab(ts[n - 1]);
            if (first0.equals(last0)) for (let j = 0; j < n; j++) await write(ff.stdin, first0);
            else {
              await write(ff.stdin, first0);
              for (let j = 1; j < n - 1; j++) await write(ff.stdin, await grab(ts[j]));
              await write(ff.stdin, last0);
            }
          }
          doneFrames++;
          const pct = Math.floor((doneFrames / total) * 20) * 5;
          if (pct !== lastPct) { lastPct = pct; process.stdout.write(M(`\r渲染中 ${pct}%（${doneFrames}/${total} 帧，${workers} 路并行）`, `\rRendering ${pct}% (${doneFrames}/${total} frames, ${workers} workers in parallel)`)); }
        }
        ff.stdin.end();
        await ff.done;
        out.push(seg);
      }
      return out;
    }))).flat();
    process.stdout.write('\n');
    const list = path.join(tmp, 'list.txt');
    fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
    const out = path.join(outDir, opt('out', nameFor(draft ? 'draft' : 'video', plan0)));
    const inputs = ['-f', 'concat', '-safe', '0', '-i', list];
    const maps = ['-map', '0:v'];
    let filter = null;
    if (!flag('no-audio')) {
      const a = await buildAudio(first, comp, tmp);
      if (a) {
        console.log(M(`声音：${a.desc}`, `Sound: ${a.desc}`));
        inputs.push('-ss', String(from), '-t', String(to - from), '-i', a.wav);
        maps.push('-map', '1:a');
        filter = await loudnorm(a.wav, from, to - from, a.target, a.voice ? 3 : 4);
        if (filter) console.log(M(`响度：${filter.lufs} LUFS（原来 ${filter.measured} LUFS${filter.capped ? `；目标 ${a.target.match(/I=(-?\d+)/)[1]}，再响峰值就要压得太狠，停在这里` : ''}）`, `Loudness: ${filter.lufs} LUFS (was ${filter.measured} LUFS${filter.capped ? `; target ${a.target.match(/I=(-?\d+)/)[1]} would need heavy peak limiting, so it stops here` : ''})`));
        if (filter && filter.capped) { const src = await peakSources(a.wav, from, to - from, a.plan, tlLines()); if (src.length) console.log(M(`  顶到峰值的是：${src.join(' · ')}——把这几下调轻（音效的 gain、这一句的音量），整体才能再响`, `  Peaks come from: ${src.join(' · ')} — turn these down (sfx gain, that line's volume) so the whole mix can get louder`)); }
      }
    }
    await ffmpeg([...inputs, ...maps, ...(filter ? ['-af', filter.af, '-ar', '48000'] : []), '-c:v', 'copy', '-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], 'mux').done;
    fs.rmSync(tmp, { recursive: true, force: true });
    const logs = pages.flatMap((p) => p.logs);
    if (logs.length) console.log([...new Set(logs)].join('\n'));
    console.log(M(`完成：${out}（${(to - from).toFixed(1)} 秒，${fps}fps，用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒）`, `Done: ${out} (${(to - from).toFixed(1)} s, ${fps}fps, took ${((Date.now() - t0) / 1000).toFixed(0)} s)`));
    const acts = (await first.eval('({ sfx: window.__audioPlan ? window.__audioPlan().sfx.map((x) => x.t) : [], texts: window.__textWins ? window.__textWins().map((x) => ({ a: x.a, text: x.text })) : [] })')).result.value;
    const appears = (await first.eval('window.__appears ? window.__appears() : []')).result.value || [];
    const trans = (await first.eval('window.__transitions ? window.__transitions() : []')).result.value || [];
    const dScan = await popScan(out, fps, from, cuts, acts, appears, voice, trans, (await first.eval('window.__stillMax ? window.__stillMax() : 0.6')).result.value);
    const rhythmF = (await first.eval('window.__rhythm ? window.__rhythm() : null')).result.value;
    if (rhythmF && rhythmF.length && dScan && !flag('from') && !flag('to')) await rhythmScan(proj, dScan, fps, from, to - from, rhythmF, { cuts, sfx: acts.sfx || [], texts: (acts.texts || []).map((x) => x.a) }, (opt('aspect') || '16:9').replace(':', 'x'));
    if (!draft && !flag('from') && !flag('to')) {
      const cover = path.join(outDir, nameFor('cover', plan0, 'png'));
      const coverAt = (await first.eval('window.__coverAt')).result.value ?? 0;
      fs.writeFileSync(cover, await first.frame(coverAt, 'png'));
      console.log(M(`封面：${cover}`, `Cover: ${cover}`));
      const board = path.join(outDir, opt('aspect') ? nameFor('board', null, 'png') : 'board.png');   // The portrait contact sheet gets a suffix so it doesn't overwrite the landscape one
      const v = await first.snapshot(board);
      if (v) console.log(`${v.label}${M('：', ': ')}${board} (${v.w}×${v.h})`);
      // Subtitles as a file (platforms want a sidecar .srt; the burned-in captions stay in the picture)
      const caps = (await first.eval('window.__captions ? window.__captions() : []')).result.value || [];
      if (caps.length) {
        const ts = (s) => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
        const srt = path.join(outDir, nameFor('captions', plan0, 'srt'));
        fs.writeFileSync(srt, caps.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join('\n'));
        console.log(M(`字幕文件：${srt}`, `Subtitles: ${srt}`));
      }
      // Third-party assets shown in the film (F.credit / photos fetched with footage.mjs): source and licence of each, for the delivery
      const credits = (await first.eval('window.__credits ? window.__credits() : []')).result.value || [];
      if (credits.length) {
        const cf = path.join(outDir, 'CREDITS.txt');
        fs.writeFileSync(cf, credits.map((c) => [c.title, c.author && M(`作者：${c.author}`, `Author: ${c.author}`), c.date, c.licence && M(`许可：${c.licence}`, `Licence: ${c.licence}`), c.url].filter(Boolean).join('\n')).join('\n\n') + '\n');
        console.log(M(`素材来源：${cf}（${credits.length} 项）`, `Credits: ${cf} (${credits.length})`));
      }
    }
  } finally {
    await close();
  }
}

// On error: page errors already carry the page's stack; for the script's own errors print the first few stack lines (otherwise there is only "Cannot read properties of undefined")
main().catch((e) => { const msg = e.message || String(e); console.error(msg); if (e.stack && !/页面出错|page error/.test(msg)) console.error(e.stack.split('\n').slice(1, 6).join('\n')); process.exit(1); });
