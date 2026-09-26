#!/usr/bin/env node
// render.mjs：零依赖渲染器。直接用 Chrome DevTools 协议驱动本机 Chrome，
// 逐帧调用 window.renderFrame(t) 截图，交给 ffmpeg 编码成 mp4。
//
// 用法：
//   node render.mjs <项目目录>                   渲染完整视频 → out/video.mp4
//   node render.mjs <项目目录> --draft           半分辨率快速草稿 → out/draft.mp4
//   node render.mjs <项目目录> --from 10 --to 20 只渲染一段
//   node render.mjs <项目目录> --stills 1.5,8,12 导出指定时间的截图 → review/
//   node render.mjs <项目目录> --sheet           每句台词结束时的画面拼成总览图 → review/sheet.png
//   node render.mjs <项目目录> --strip 14,17     这段时间内连续 8 帧拼成一张图，用来检查动画过程 → review/strip-14-17.png
//   node render.mjs <项目目录> --check           只运行自动检查（时间线、画面范围、重叠等），不渲染
//   node render.mjs <项目目录> --captions        列出全部字幕分段和时间，检查断句
//   node render.mjs <项目目录> --board           导出整块白板画完后的全貌大图 → out/board.png（渲染成片时也会自动导出）
//   node render.mjs <项目目录> --cover           导出封面（视频第一帧）→ out/cover.png（渲染成片时也会自动导出）
// 其他参数：--workers 4  --fps 30  --out 文件名  --no-audio
// 配乐：默认按 script.json 的 "bgm" 用代码自动生成并混入（见 bgm.mjs）；--no-bgm 不要配乐；--bgm-style 风格 临时换风格；
//       --bgm-volume 1.2 调整配乐音量（倍数）；--bgm 音乐文件 改用自己的音乐（此时 --bgm-volume 默认 0.12）
//           --offline 模拟断网（测试字体回退用）
// 自动检查每次都会运行；有"错误"时拒绝渲染成片（草稿、截图不受影响），确认没问题可以加 --force 强制渲染
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
if (!CHROME) { console.error('找不到 Chrome，请设置 CHROME_PATH'); process.exit(1); }
const html = path.join(proj, opt('html', 'index.html'));
if (!fs.existsSync(html)) { console.error('找不到 ' + html); process.exit(1); }

// ---------- 极简 CDP 客户端 ----------
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
    if (m.method === 'Runtime.exceptionThrown') logs.push('页面异常：' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
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
  const r = await s('Runtime.evaluate', { expression: 'window.__ready ? window.__ready : Promise.reject(new Error("页面没有调用 EV.composition()"))', awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception?.description || r.exceptionDetails.text) + '\n' + logs.join('\n'));
  const comp = r.result.value;
  if (comp.width !== 1920 || comp.height !== 1080) await s('Emulation.setDeviceMetricsOverride', { width: comp.width, height: comp.height, deviceScaleFactor: scale, mobile: false });
  return {
    comp, logs,
    async frame(t, format = 'jpeg') {
      const e = await s('Runtime.evaluate', { expression: `window.renderFrame(${t})`, awaitPromise: true });
      if (e.exceptionDetails) throw new Error(`t=${t} 渲染出错：` + (e.exceptionDetails.exception?.description || e.exceptionDetails.text));
      const shot = await s('Page.captureScreenshot', format === 'png' ? { format: 'png' } : { format: 'jpeg', quality: 92, optimizeForSpeed: true });
      return Buffer.from(shot.data, 'base64');
    },
    eval: (expr) => s('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }),
    // 整块白板的全貌：把画布扩到能装下所有内容，截一张大图
    async snapshot(out) {
      const r = await s('Runtime.evaluate', { expression: 'window.__snapshot && window.__snapshot()', returnByValue: true });
      const v = r.result && r.result.value;
      if (!v) return null;
      const k = Math.min(1, 14000 / Math.max(v.w, v.h));
      await s('Emulation.setDeviceMetricsOverride', { width: v.w, height: v.h, deviceScaleFactor: k, mobile: false });
      await new Promise((res) => setTimeout(res, 300));
      const shot = await s('Page.captureScreenshot', { format: 'png' });
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
      return { w: Math.round(v.w * k), h: Math.round(v.h * k) };
    },
  };
}

function ffmpeg(argv, label) {
  const p = spawn('ffmpeg', ['-v', 'error', '-y', ...argv], { stdio: ['pipe', 'inherit', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => (err += d));
  p.done = new Promise((res, rej) => p.on('close', (c) => (c ? rej(new Error(`ffmpeg(${label}) 失败：${err}`)) : res())));
  return p;
}
// 自动检查结果
function report(issues) {
  if (!issues.length) { console.log('自动检查：没有发现问题'); return 0; }
  const errs = issues.filter((i) => i.level === 'error');
  console.log(`自动检查：${errs.length} 个错误，${issues.length - errs.length} 个提醒`);
  for (const i of issues) console.log(`  ${i.level === 'error' ? '✗ 错误' : '! 提醒'}  ${i.t.toFixed(2)}s  ${i.src || ''}  ${i.what}：${i.msg}`);
  console.log('  → 用 --strip 开始秒,结束秒 查看出问题的那段动画');
  return errs.length;
}

// 把若干张截图拼成网格
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
    // 字体情况：只是告知，不影响渲染
    const fonts = (await first.eval('window.__fontInfo || []')).result.value || [];
    if (fonts.length) {
      const ok = fonts.filter((f) => f.ok).map((f) => f.family), miss = fonts.filter((f) => !f.ok).map((f) => f.family);
      console.log('字体：' + (ok.length ? ok.join('、') + ' 可用' : '') + (miss.length ? `${ok.length ? '；' : ''}${miss.join('、')} 不可用（本机没装、也没能联网下载），已自动改用备用字体` : ''));
    }
    // 时长：画面比旁白长时（结尾停留、全貌标序号），视频自动加长，音轨用静音补齐
    const tlDur = (await first.eval('window.TIMELINE ? window.TIMELINE.duration : 0')).result.value || 0;
    console.log(`时长：${comp.duration.toFixed(1)} 秒` + (tlDur && comp.duration > tlDur + 0.05 ? `（旁白 ${tlDur.toFixed(1)} 秒，结尾画面多停留 ${(comp.duration - tlDur).toFixed(1)} 秒）` : ''));
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
      console.log(`封面：${out}`);
      return;
    }
    if (flag('board')) {
      const out = path.join(proj, 'out', 'board.png');
      const v = await first.snapshot(out);
      console.log(v ? `白板全貌：${out}（${v.w}×${v.h}）` : '这个项目没有白板，无法导出全貌');
      return;
    }

    // ---- 截图模式 ----
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
        fs.writeFileSync(path.join(review, `${name}.txt`), times.map((t, i) => `#${i + 1}（第 ${Math.floor(i / cols) + 1} 行第 ${(i % cols) + 1} 列）t=${t.toFixed(2)}s`).join('\n'));
        console.log(`${flag('sheet') ? '总览图' : '动画条'}：${out}（${times.length} 格，按行从左到右，时间见 ${name}.txt）`);
      } else files.forEach((f) => console.log('截图：' + f));
      if (first.logs.length) console.log(first.logs.join('\n'));
      return;
    }

    // ---- 视频模式 ----
    if (errors && !flag('draft') && !flag('force')) {
      console.error('有自动检查错误，已停止渲染成片。请修改后重试；确认这些错误可以忽略时，加 --force 强制渲染。');
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
        if (pct !== lastPct) { lastPct = pct; process.stdout.write(`\r渲染中 ${pct}%（${doneFrames}/${total} 帧，${workers} 路并行）`); }
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
        console.log(`配乐：${gen.name}（${gen.style}），代码生成`);
        inputs.push('-ss', String(from), '-t', String(to - from), '-i', gen.file);
        filter = `[1:a]apad=whole_dur=${to - from}[n];[n][2:a]amix=inputs=2:duration=first:normalize=0[a]`;
      } else if (bgm) {
        inputs.push('-stream_loop', '-1', '-t', String(to - from), '-i', path.resolve(bgm));
        const v = Number(opt('bgm-volume', 0.12));
        filter = `[1:a]apad=whole_dur=${to - from}[n];[2:a]volume=${v},afade=t=out:st=${Math.max(0, to - from - 2)}:d=2[m];[n][m]amix=inputs=2:duration=first:normalize=0[a]`;
      } else filter = `[1:a]apad=whole_dur=${to - from}[a]`; // 画面比旁白长（结尾停留）时，用静音补齐音轨
      maps.push('-map', '[a]');
    }
    await ffmpeg([...inputs, ...(filter ? ['-filter_complex', filter] : []), ...maps, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], 'mux').done;
    fs.rmSync(tmp, { recursive: true, force: true });
    const logs = pages.flatMap((p) => p.logs);
    if (logs.length) console.log([...new Set(logs)].join('\n'));
    console.log(`完成：${out}（${(to - from).toFixed(1)} 秒，${fps}fps，用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒）`);
    if (!draft && !flag('from') && !flag('to')) {
      const cover = path.join(outDir, 'cover.png');
      fs.writeFileSync(cover, await first.frame(0, 'png'));
      console.log(`封面：${cover}`);
      const board = path.join(outDir, 'board.png');
      const v = await first.snapshot(board);
      if (v) console.log(`白板全貌：${board}（${v.w}×${v.h}）`);
    }
  } finally {
    await close();
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
