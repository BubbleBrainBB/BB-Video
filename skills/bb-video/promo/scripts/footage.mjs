#!/usr/bin/env node
// footage.mjs: find licence-clean photos and footage for a film (Wikimedia Commons), and fetch the ones the user approved.
//   node footage.mjs <project> search "<query>" [--license cc0,pd,cc-by] [--video] [--limit 20]
//       → prints a numbered list (title, licence, author, date, size, file page) and writes research/candidates.json. Nothing is downloaded.
//   node footage.mjs <project> fetch <n>[,<n>…] [--name key] [--dry-run]
//       → downloads those candidates into assets/src/ (photos at most 1600 px wide), each with a sidecar <name>.json
//         { title, author, licence, url, date, source } that assets.mjs copies into the manifest: the film's source tags and CREDITS come from it.
// Rules (styles/newsreel/STYLE.md, "Material"): the user's own material comes first; before fetching, tell the user what (title, size), from
//   where and under which licence, and wait for their OK. Allowed by default: CC0, public domain, CC BY (credit on screen and in CREDITS).
//   CC BY-SA, NC and ND are listed but marked, never fetched unless --license names them.
import fs from 'node:fs';
import path from 'node:path';
import { M, isZh } from '../../core/scripts/lang.mjs';

const args = process.argv.slice(2);
const proj = args[0] && !args[0].startsWith('--') ? path.resolve(args[0]) : null;
process.env.BV_LANG ??= isZh(proj) ? 'zh' : 'en';
const cmd = args[1], opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const usage = M('用法：node footage.mjs <项目> search "<关键词>" [--license cc0,pd,cc-by] [--video] [--limit 20]\n      node footage.mjs <项目> fetch <编号>[,<编号>…] [--name 名字] [--dry-run]', 'Usage: node footage.mjs <project> search "<query>" [--license cc0,pd,cc-by] [--video] [--limit 20]\n       node footage.mjs <project> fetch <n>[,<n>…] [--name key] [--dry-run]');
if (!proj || !['search', 'fetch'].includes(cmd)) { console.error(usage); process.exit(1); }

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'bb-video/1.0 (https://github.com/DylanDDeng/BB-Video; footage search for code-made films)';
const cands = path.join(proj, 'research', 'candidates.json');
const strip = (h) => String(h || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();
// licence class from Commons' LicenseShortName / License
const classOf = (short, lic) => {
  const s = `${short} ${lic}`.toLowerCase();
  if (/\b(nc|noncommercial)\b|-nc\b/.test(s)) return 'nc';
  if (/\bnd\b|-nd\b|noderiv/.test(s)) return 'nd';
  if (/cc0|cc-zero/.test(s)) return 'cc0';
  if (/public domain|\bpd\b|pd-/.test(s)) return 'pd';
  if (/by-sa|by sa/.test(s)) return 'cc-by-sa';
  if (/cc[ -]by|cc-by/.test(s)) return 'cc-by';
  return 'other';
};
async function get(params, tries = 4) {
  const u = API + '?' + new URLSearchParams({ format: 'json', ...params });
  for (let k = 0; k < tries; k++) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': UA } });
      const text = await r.text();
      if (r.status === 429 || !text.trim()) throw new Error(`HTTP ${r.status}`);
      return JSON.parse(text);
    } catch (e) {
      if (k === tries - 1) throw new Error(M(`Commons 请求失败（${e.message}）：稍等再试`, `Commons request failed (${e.message}): wait a little and try again`));
      await new Promise((res) => setTimeout(res, 1500 * 2 ** k));   // rate-limited: back off
    }
  }
}

try {
if (cmd === 'search') {
  const q = args[2]; if (!q) { console.error(usage); process.exit(1); }
  const allow = new Set((opt('license', 'cc0,pd,cc-by')).split(','));
  const video = args.includes('--video'), limit = Number(opt('limit', 20));
  const j = await get({ action: 'query', generator: 'search', gsrsearch: `${q} filetype:${video ? 'video' : 'bitmap'}`, gsrnamespace: '6', gsrlimit: String(Math.min(50, limit)), prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1600' });
  const pages = Object.values((j.query && j.query.pages) || {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const list = pages.map((p) => {
    const ii = (p.imageinfo || [])[0] || {}, md = ii.extmetadata || {}, v = (k) => strip(md[k] && md[k].value);
    const cls = classOf(v('LicenseShortName'), v('License'));
    return { title: p.title.replace(/^File:/, ''), page: ii.descriptionurl, url: ii.url, thumb: ii.thumburl, mime: ii.mime, w: ii.width, h: ii.height, bytes: ii.size,
      licence: v('LicenseShortName') || v('License') || '?', class: cls, ok: allow.has(cls), author: v('Artist'), date: v('DateTimeOriginal') || v('DateTime'), description: v('ImageDescription').slice(0, 200) };
  });
  fs.mkdirSync(path.dirname(cands), { recursive: true });
  fs.writeFileSync(cands, JSON.stringify({ query: q, video, at: new Date().toISOString(), results: list }, null, 1));
  const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
  list.forEach((c, i) => console.log(`${String(i + 1).padStart(2)}. ${c.ok ? '✓' : '✗'} [${c.licence}] ${c.title}\n     ${c.author || '?'} · ${c.date || '?'} · ${c.w}×${c.h} · ${mb(c.bytes || 0)}\n     ${c.page}${c.ok ? '' : M('\n     （许可不在允许范围：不取）', '\n     (licence not allowed: not fetched)')}`));
  console.log(M(`\n${list.filter((c) => c.ok).length} / ${list.length} 个许可可用 → ${cands}\n下一步：把要用的几个（名字、大小、来源、许可）告诉用户，用户同意后：node footage.mjs ${path.relative(process.cwd(), proj)} fetch <编号>`,
    `\n${list.filter((c) => c.ok).length} / ${list.length} usable → ${cands}\nNext: show the user the ones you want (title, size, source, licence); after their OK: node footage.mjs ${path.relative(process.cwd(), proj)} fetch <n>`));
}

if (cmd === 'fetch') {
  if (!fs.existsSync(cands)) { console.error(M('先 search', 'Run search first')); process.exit(1); }
  const { results } = JSON.parse(fs.readFileSync(cands, 'utf8'));
  const ids = String(args[2] || '').split(',').map(Number).filter((n) => n >= 1 && n <= results.length);
  if (!ids.length) { console.error(usage); process.exit(1); }
  const allow = new Set((opt('license', 'cc0,pd,cc-by')).split(','));
  const dir = path.join(proj, 'assets', 'src'); fs.mkdirSync(dir, { recursive: true });
  for (const [k, n] of ids.entries()) {
    const c = results[n - 1];
    if (!allow.has(c.class)) { console.log(M(`跳过 ${n}：许可 ${c.licence} 不在允许范围`, `Skipped ${n}: licence ${c.licence} not allowed`)); continue; }
    const base = (ids.length === 1 && opt('name')) || (opt('name') ? `${opt('name')}-${k + 1}` : c.title.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48));
    const src = c.mime && c.mime.startsWith('video') ? c.url : c.thumb || c.url, ext = (src.match(/\.(jpe?g|png|gif|webp|tiff?|webm|ogv|mp4)(?:$|\?)/i) || [, 'jpg'])[1].toLowerCase();
    const file = path.join(dir, `${base}.${ext}`), side = path.join(dir, `${base}.json`);
    const credit = { title: c.title.replace(/\.[^.]+$/, ''), author: c.author, licence: c.licence, url: c.page, date: c.date, source: 'Wikimedia Commons' };
    if (args.includes('--dry-run')) { console.log(M(`会下载：${src} → ${path.relative(proj, file)}`, `Would fetch: ${src} → ${path.relative(proj, file)}`)); continue; }
    const r = await fetch(src, { headers: { 'User-Agent': UA } });
    if (!r.ok) { console.error(M(`下载失败 ${n}：HTTP ${r.status}`, `Fetch failed ${n}: HTTP ${r.status}`)); continue; }
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    fs.writeFileSync(side, JSON.stringify(credit, null, 1));
    console.log(M(`✓ ${path.relative(proj, file)}（${c.licence} · ${c.author || '?'}）`, `✓ ${path.relative(proj, file)} (${c.licence} · ${c.author || '?'})`));
    await new Promise((res) => setTimeout(res, 800));   // be gentle with Commons
  }
  console.log(M(`下一步：node ${path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'explainer', 'scripts', 'assets.mjs')} ${path.relative(process.cwd(), proj)}（来源信息会进 manifest，片中来源标签和 CREDITS 都从这里来）`,
    `Next: node ${path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'explainer', 'scripts', 'assets.mjs')} ${path.relative(process.cwd(), proj)} (the credit goes into the manifest; on-screen source tags and CREDITS come from it)`));
}
} catch (e) { console.error(e.message); process.exit(1); }   // a network error is one readable line, not a stack
