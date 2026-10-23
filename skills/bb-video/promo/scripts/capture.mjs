#!/usr/bin/env node
// capture.mjs: research websites and capture material with headless Chrome (screenshots only; it doesn't download site files or log in).
//
// Research: node capture.mjs <project dir> --research <url> [--mobile]
//   → research/<page>.md: title, description, headings, button and link text, all visible page text, numbers that appear,
//     fonts actually loaded, main colours, brand-colour candidates (theme-color, CSS variables, buttons, links, logo). Raw material for brief.md (every fact in the brief must be findable here or on the page).
//     → research/colors.json: { url: { pageBg, ground (light / dark), brand, accent, candidates } }, ready for PROMO.film({ brand })
//
// Screenshots: node capture.mjs <project dir> [--only name,name]
//   captures per <project dir>/shots.json → shots/<name>.jpg (or .png). shots.json format:
//   { "defaults": { "viewport": "desktop", "dsf": 2, "wait": 4000 },
//     "shots": [
//       { "name": "home", "url": "https://…", "shot": "viewport" },                    the visible screen
//       { "name": "home-m", "url": "https://…", "viewport": "mobile", "shot": "viewport" }, mobile version (390×844)
//       { "name": "page", "url": "https://…", "shot": "fullpage" },                    full-page long image (including inner scroll areas; desktop 1×, mobile 2×, change with fullDsf)
//       { "name": "card", "url": "https://…", "shot": { "selector": "main img", "index": 0, "pad": 0 } }, one element
//       { "name": "tile", "url": "https://…", "actions": [ { "hide": ".tile-content" } ], "shot": { "selector": ".tile-image-wrapper", "index": 1 } },
//                     when a page has many product-image tiles (a home-page grid): first hide the text layer over the image, then capture that tile — better than clean (keeps only the largest image)
//       { "name": "hero", "url": "https://…", "viewport": [1536, 1024], "shot": "clean" },  keep only the largest image on the page (text and badges hidden)
//       { "name": "logo", "url": "https://…", "dsf": 4, "shot": { "clip": [x, y, width, height] } },  a region, saved as PNG (for logos)
//       { "name": "x", "url": "…", "actions": [ { "click": "selector" }, { "clickText": "button text" }, { "wait": 1500 },
//           { "scroll": 900 }, { "hide": "selector" }, { "eval": "js code" } ] }
//     ] }
//   viewport: desktop (1440×900) / wide (1920×1080) / mobile (390×844) / [width, height]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { M, isZh } from '../../core/scripts/lang.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const flag = (n) => args.includes('--' + n);
const proj = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.');
process.env.BV_LANG ??= isZh(proj) ? 'zh' : 'en';
if (flag('research') && !opt('research')) { console.error(M('用法：node capture.mjs <项目目录> --research <网址> [--mobile]（调研）/ node capture.mjs <项目目录> [--only 名字,名字]（按 shots.json 截图）', 'Usage: node capture.mjs <project dir> --research <url> [--mobile] (research) / node capture.mjs <project dir> [--only name,name] (screenshots per shots.json)')); process.exit(1); }
const CHROME = process.env.CHROME_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
if (!CHROME) { console.error(M('找不到 Chrome，请设置 CHROME_PATH', 'Chrome not found: set CHROME_PATH')); process.exit(1); }
const VIEW = { desktop: [1440, 900], wide: [1920, 1080], mobile: [390, 844] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => { if (process.env.DEBUG) console.error('·', ...a); };
// wait with a timeout: a Promise in the page may never settle (e.g. an image that keeps loading)
const within = (p, ms, v) => Promise.race([p, sleep(ms).then(() => v)]);

// ---------- browser ----------
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-'));
const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank'], { stdio: 'ignore' });
const quit = () => { try { proc.kill(); } catch {} try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} };
process.on('exit', quit);
setTimeout(() => { console.error(M('超时（10 分钟），退出', 'Timed out (10 minutes), exiting')); process.exit(1); }, 600000).unref();
const pf = path.join(dir, 'DevToolsActivePort');
for (let i = 0; i < 400 && !fs.existsSync(pf); i++) await sleep(50);
if (!fs.existsSync(pf)) { console.error(M('Chrome 没有启动（可能正在自动更新，稍后重试）', 'Chrome did not start (it may be auto-updating; try again later)')); process.exit(1); }
await sleep(100);
const [port, wsPath] = fs.readFileSync(pf, 'utf8').trim().split('\n');
const ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);
const ev = async (expr) => { const r = await s('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
await s('Page.enable');
const view = async (v, dsf = 1) => { const [w, h] = Array.isArray(v) ? v : VIEW[v] || VIEW.desktop; await s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dsf, mobile: v === 'mobile' }); return [w, h]; };
// find scroll areas in the page: some sites don't scroll the whole page, the content is in an inner scroll container
const SCROLLER = `(() => [...document.querySelectorAll('main, main *, body *')].filter((e) => e.scrollHeight > e.clientHeight + 50 && /auto|scroll/.test(getComputedStyle(e).overflowY)).sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth)[0] || document.scrollingElement)()`;
async function goto(url, wait) {
  log(M('打开', 'open'), url);
  await within(s('Page.navigate', { url }), 30000);
  await sleep(wait);
  // wait for the page's images to finish decoding (up to 8 s)
  log(M('等图片', 'waiting for images'));
  await within(ev(`Promise.all([...document.images].filter((i) => i.getBoundingClientRect().width > 50).map((i) => i.decode().catch(() => {})))`).catch(() => {}), 8000);
  log(M('页面就绪', 'page ready'));
}
async function act(a) {
  if (a.wait) await sleep(a.wait);
  if (a.click) await ev(`document.querySelector(${JSON.stringify(a.click)})?.click()`);
  if (a.clickText) await ev(`[...document.querySelectorAll('button, a, [role=button], [role=tab], div, span, li, label')].filter((e) => e.offsetParent && e.children.length <= 3 && e.textContent.trim().replace(/[›>]$/, '').trim() === ${JSON.stringify(a.clickText)}).sort((x, y) => x.textContent.length - y.textContent.length)[0]?.click()`);
  if (a.scroll !== undefined) await ev(`(${SCROLLER}).scrollTop = ${Number(a.scroll)}`);
  if (a.hide) await ev(`document.querySelectorAll(${JSON.stringify(a.hide)}).forEach((e) => (e.style.visibility = 'hidden'))`);
  if (a.eval) await ev(a.eval);
  if (a.click || a.clickText || a.scroll !== undefined) await sleep(a.after ?? 1500);
}
async function save(name, data, png) { fs.mkdirSync(path.join(proj, 'shots'), { recursive: true }); const f = path.join(proj, 'shots', `${name}.${png ? 'png' : 'jpg'}`); fs.writeFileSync(f, Buffer.from(data, 'base64')); return f; }

// ---------- research ----------
if (flag('research')) {
  const url = opt('research');
  const mobile = flag('mobile');
  await view(mobile ? 'mobile' : 'wide', 1);
  await goto(url, 6000);
  log(M('提取信息', 'extracting info'));
  const info = await ev(`(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const uniq = (a) => [...new Set(a.map((x) => x.replace(/\\s+/g, ' ').trim()).filter(Boolean))];
    const text = document.body.innerText;
    const colors = {}, BG = ${JSON.stringify(M('背景', 'background'))}, FG = ${JSON.stringify(M('文字', 'text'))};
    for (const e of [...document.querySelectorAll('body, body *')].slice(0, 4000)) {
      if (!vis(e)) continue;
      const cs = getComputedStyle(e), r = e.getBoundingClientRect(), area = r.width * r.height;
      for (const [k, v] of [[BG, cs.backgroundColor], [FG, cs.color]]) { if (v === 'rgba(0, 0, 0, 0)') continue; const key = k + ' ' + v; colors[key] = (colors[key] || 0) + (k === BG ? area : e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) ? 1000 : 0); }
    }
    const fonts = uniq([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '') + ' ' + f.weight + (f.style !== 'normal' ? ' ' + f.style : '')));
    const used = uniq([...document.querySelectorAll('h1,h2,h3,p,a,button,span')].slice(0, 400).filter(vis).map((e) => getComputedStyle(e).fontFamily.split(',')[0].replace(/"/g, '')));
    // brand-colour candidates: theme-color, CSS variables (--brand / --primary / --accent…), button backgrounds, link colours, colours in the logo. Only chromatic ones (black, white and grey don't count)
    // any CSS colour syntax (rgb, space-separated, color(), oklch…) goes through a 1×1 canvas to become #RRGGBB; transparent doesn't count
    const cv1 = document.createElement('canvas'); cv1.width = cv1.height = 1; const g1 = cv1.getContext('2d', { willReadFrequently: true });
    const hex = (v) => { if (!v || v === 'none' || /^(transparent|currentcolor|inherit)$/i.test(v)) return null; g1.clearRect(0, 0, 1, 1); g1.fillStyle = '#010203'; g1.fillStyle = v; if (g1.fillStyle === '#010203' && !/#010203/i.test(v)) return null; g1.fillRect(0, 0, 1, 1); const d = g1.getImageData(0, 0, 1, 1).data; if (d[3] < 128) return null; return '#' + [d[0], d[1], d[2]].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase(); };
    const sat = (hx) => { const n = parseInt(hx.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (l < 0.12 || l > 0.9) return 0; return mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1)); };
    const brand = {}; const add = (v, from, w = 1) => { const h = hex(v); if (!h || sat(h) < 0.22 || h === '#0000EE' || h === '#551A8B') return;   // the browser's default link blue / visited purple don't count
      (brand[h] ??= { color: h, from: new Set(), score: 0 }); brand[h].from.add(from); brand[h].score += w; };
    add(document.querySelector('meta[name=theme-color]')?.content, 'theme-color', 6);
    const rootCs = getComputedStyle(document.documentElement);
    for (const sh of [...document.styleSheets]) { let rules; try { rules = sh.cssRules; } catch { continue; } for (const r of [...rules].slice(0, 3000)) { if (!r.style || !/^(:root|html|body)$/.test(r.selectorText || '')) continue; for (const k of r.style) if (k.startsWith('--') && /brand|primary|accent|cta|link|highlight|main|logo/i.test(k) && !/error|danger|warn|invalid|success|alert|disabled|negative|positive/i.test(k)) { const v = rootCs.getPropertyValue(k).trim(); const tmp = document.createElement('i'); tmp.style.color = v; document.body.appendChild(tmp); add(getComputedStyle(tmp).color, 'CSS ' + k, /brand|logo/i.test(k) ? 8 : 4); tmp.remove(); } } }
    for (const e of [...document.querySelectorAll('button, [role=button], a[class*=btn i], a[class*=button i], a[class*=cta i], input[type=submit]')].filter(vis).slice(0, 200)) add(getComputedStyle(e).backgroundColor, ${JSON.stringify(M('按钮底色', 'button background'))}, 3);
    for (const e of [...document.querySelectorAll('a')].filter(vis).slice(0, 300)) add(getComputedStyle(e).color, ${JSON.stringify(M('链接颜色', 'link colour'))}, 1);
    for (const e of [...document.querySelectorAll('header [class*=logo] svg *, nav [class*=logo] svg *, header a[href="/"] svg *, nav a[href="/"] svg *, header svg[class*=logo] *')].slice(0, 120)) { add(e.getAttribute('fill'), 'Logo', 8); add(getComputedStyle(e).fill, 'Logo', 3); }
    const pageBg = hex(getComputedStyle(document.body).backgroundColor) || hex(rootCs.backgroundColor) || hex(getComputedStyle(document.querySelector('main') || document.body).backgroundColor) || '#FFFFFF';
    const brandList = Object.values(brand).sort((a, b) => b.score - a.score).slice(0, 8).map((x) => ({ color: x.color, from: [...x.from].join(' / '), score: x.score }));
    return {
      pageBg, brandList,
      title: document.title, desc: document.querySelector('meta[name=description]')?.content || '', og: document.querySelector('meta[property="og:image"]')?.content || '',
      headings: uniq([...document.querySelectorAll('h1,h2,h3')].filter(vis).map((e) => e.tagName + ' ' + e.innerText)),
      buttons: uniq([...document.querySelectorAll('button, a, [role=button], [role=tab]')].filter(vis).map((e) => e.innerText)).filter((x) => x.length < 60),
      numbers: uniq(text.match(/[$€¥#]?\\d[\\d,.]*\\s?(%|k|K|M|B|x|×|\\/task|credits?)?/g) || []).filter((x) => x.length > 1).slice(0, 120),
      fonts, used,
      colors: Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k]) => k),
      text,
    };
  })()`);
  const slug = url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_').replace(/_+$/, '') + (mobile ? '-mobile' : '');
  const out = path.join(proj, 'research', slug + '.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  // research/colors.json: brand-colour candidates + page background + suggested ground (light / dark), ready for P.kit.brand
  const lumOf = (h) => { const n = parseInt(h.slice(1), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
  const ground = lumOf(info.pageBg) > 0.6 ? 'light' : lumOf(info.pageBg) < 0.3 ? 'dark' : 'brand';
  const cj = path.join(proj, 'research', 'colors.json'), prev = fs.existsSync(cj) ? JSON.parse(fs.readFileSync(cj, 'utf8')) : {};
  fs.writeFileSync(cj, JSON.stringify({ ...prev, [url]: { pageBg: info.pageBg, ground, brand: info.brandList[0]?.color ?? null, accent: info.brandList[1]?.color ?? null, candidates: info.brandList } }, null, 2));
  const L = (title, arr) => `## ${title}\n${arr.length ? arr.map((x) => '- ' + x).join('\n') : M('（无）', '(none)')}\n`;
  const at = new Date().toISOString().slice(0, 16).replace('T', ' ');
  fs.writeFileSync(out, M(`# 调研：${url}\n抓取时间：${at}（页面上的数字是实时数据，写进 brief 时注明"截至"这个时间）\n\n`, `# Research: ${url}\nCaptured: ${at} (numbers on the page are live data; when writing them into the brief, note "as of" this time)\n\n`) +
    M(`## 标题\n${info.title}\n\n## 描述\n${info.desc || '（无）'}\n\n`, `## Title\n${info.title}\n\n## Description\n${info.desc || '(none)'}\n\n`) + L(M('各级标题', 'Headings'), info.headings) + '\n' + L(M('按钮 / 链接 / 标签', 'Buttons / links / tabs'), info.buttons) + '\n' + L(M('出现的数字', 'Numbers on the page'), info.numbers) + '\n' +
    L(M('实际加载的字体', 'Fonts actually loaded'), info.fonts) + '\n' + L(M('元素上用到的字体（按出现顺序）', 'Fonts used on elements (in order of appearance)'), info.used) + '\n' + L(M('主要颜色（按面积 / 文字量排序）', 'Main colours (sorted by area / amount of text)'), info.colors) + '\n' +
    L(M('品牌色候选（有颜色的；黑白灰不列）——写进 brief.md 的"颜色：…（来自：…）"', 'Brand-colour candidates (chromatic only; black, white and grey not listed) — for the "Colours: … (from: …)" line in brief.md'), info.brandList.map((x) => M(`${x.color}（来自：${x.from}）`, `${x.color} (from: ${x.from})`))) + M(`\n页面底色：${info.pageBg}（${ground}）\n`, `\nPage background: ${info.pageBg} (${ground})\n`) + M('\n## 页面全部可见文字\n\n```\n', '\n## All visible page text\n\n```\n') + info.text + '\n```\n');
  console.log(M('调研笔记：', 'Research notes: ') + out);
  process.exit(0);
}

// ---------- screenshots ----------
const specPath = path.join(proj, 'shots.json');
if (!fs.existsSync(specPath)) { console.error(M('找不到 ' + specPath + '（格式见本脚本开头的说明）', 'Cannot find ' + specPath + ' (format: see the notes at the top of this script)')); process.exit(1); }
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const D = { viewport: 'desktop', dsf: 2, wait: 4000, ...(spec.defaults || {}) };
const only = opt('only') ? opt('only').split(',') : null;
for (const sh of spec.shots) {
  if (only && !only.includes(sh.name)) continue;
  const o = { ...D, ...sh };
  try {
    // full-page long image: desktop 1× (the image is too big otherwise); mobile (390 wide) at 1× is blurry in portrait, so 2× by default; set fullDsf for something else
    const fullDsf = o.fullDsf ?? ((Array.isArray(o.viewport) ? o.viewport[0] : (o.viewport === 'mobile' ? 390 : 1440)) < 800 ? Math.min(2, o.dsf) : 1);
    const [w, h] = await view(o.viewport, o.shot === 'fullpage' ? fullDsf : o.dsf);
    await goto(o.url, o.wait);
    for (const a of o.actions || []) await act(a);
    const shot = o.shot || 'viewport';
    let data;
    if (shot === 'viewport') data = (await s('Page.captureScreenshot', { format: 'jpeg', quality: 92 })).data;
    else if (shot === 'clean') {
      // keep only the largest image: hide every other element (for a home-page hero image, set the viewport to the image's own ratio to capture the whole original)
      await ev(`(() => { const big = [...document.images].sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0]; const keep = new Set(); for (let e = big; e; e = e.parentElement) keep.add(e); for (const e of document.body.querySelectorAll('*')) if (!keep.has(e) && !e.contains(big)) e.style.visibility = 'hidden'; big.style.visibility = 'visible'; })()`);
      await sleep(500);
      data = (await s('Page.captureScreenshot', { format: 'jpeg', quality: 93 })).data;
    } else if (shot === 'fullpage') {
      // full-page long image: expand scroll areas to the full height of their content
      const H = await ev(`(() => { const sc = ${SCROLLER}; return Math.min(16000, Math.max(sc.scrollHeight, document.documentElement.scrollHeight)); })()`);
      await ev(`(() => { const sc = ${SCROLLER}; for (let e = sc; e && e !== document.documentElement; e = e.parentElement) { e.style.height = 'auto'; e.style.maxHeight = 'none'; e.style.overflow = 'visible'; } })()`);
      await s('Emulation.setDeviceMetricsOverride', { width: w, height: Math.min(H, Math.floor(16000 / fullDsf)), deviceScaleFactor: fullDsf, mobile: o.viewport === 'mobile' });
      await sleep(2500);
      await within(ev(`Promise.all([...document.images].map((i) => i.decode().catch(() => {})))`).catch(() => {}), 8000);
      data = (await s('Page.captureScreenshot', { format: 'jpeg', quality: 90, captureBeyondViewport: true })).data;
    } else if (shot.clip) {
      // a region of the page (CSS pixels): [x, y, width, height], captured at dsf× resolution (for logos)
      const [x, y, cw, ch] = shot.clip;
      data = (await s('Page.captureScreenshot', { format: 'png', clip: { x, y, width: cw, height: ch, scale: 1 } })).data;
      console.log(M('截图 ', 'Screenshot ') + (await save(o.name, data, true)));
      continue;
    } else {
      // element: first scroll it to the middle of the screen (clear of a fixed nav bar), wait for decoding, then capture its region
      const r = await ev(`(async () => {
        const e = [...document.querySelectorAll(${JSON.stringify(shot.selector)})].filter((x) => x.getBoundingClientRect().width > 0)[${shot.index ?? 0}];
        if (!e) return null;
        e.scrollIntoView({ block: 'center' });
        await new Promise((r) => setTimeout(r, 900));
        if (e.tagName === 'IMG') { try { await Promise.race([e.decode(), new Promise((r) => setTimeout(r, 5000))]); } catch {} }
        const b = e.getBoundingClientRect(), p = ${shot.pad ?? 0};
        return { x: b.x - p + scrollX, y: b.y - p + scrollY, width: b.width + 2 * p, height: b.height + 2 * p };
      })()`);
      if (!r) throw new Error(M(`找不到元素 ${shot.selector}[${shot.index ?? 0}]`, `Element not found: ${shot.selector}[${shot.index ?? 0}]`));
      data = (await s('Page.captureScreenshot', { format: 'jpeg', quality: 93, clip: { ...r, scale: 1 } })).data;
    }
    console.log(M('截图 ', 'Screenshot ') + (await save(o.name, data)));
  } catch (e) { console.error(M(`✗ ${o.name}：${e.message}`, `✗ ${o.name}: ${e.message}`)); }
}
process.exit(0);
