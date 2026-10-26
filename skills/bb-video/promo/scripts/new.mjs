#!/usr/bin/env node
// new.mjs: create a new promo project
// Usage: node new.mjs <project dir> [--title name] [--style origami | pop | op | cutout | ascii | shadow | bauhaus | pixel | chat | toy3d | newsreel | filmroom | mystery | isometric | trailer | dossier | manga] [--quick]
//       --style: visual style (a folder name under styles/); omitted = the default launch motion. The style's index.html / sound.js replace the generic skeleton
//       --quick: quick mode (use with --style): index.html becomes the "write a script, PROMO.film renders it" skeleton, fonts taken from the style (references/kit.md)
//       node new.mjs <project dir> --update-lib     only refresh lib/ (after a runtime update)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { M, englishPlaceholders } from '../../core/scripts/lang.mjs';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
process.env.BV_LANG ??= /^zh/i.test(opt('lang', 'zh-CN')) ? 'zh' : 'en';
if (!args[0] || args[0].startsWith('--')) { console.error(M('用法：node new.mjs <项目目录> [--title 名字]', 'Usage: node new.mjs <project dir> [--title name]')); process.exit(1); }
const proj = path.resolve(args[0]);
const lib = path.join(proj, 'lib');
fs.mkdirSync(lib, { recursive: true });
fs.cpSync(path.join(skill, '..', 'core', 'runtime', 'core.js'), path.join(lib, 'core.js')); // the shared core (bb-video/core)
// The explainer board styles (whiteboard / riso / ink) can make promos too: copy the board, styles and font rules from explainer/runtime (font rules always named lib/fonts.css)
const BOARDS = { whiteboard: { files: ['whiteboard.js', 'whiteboard.css', 'media.js'], fonts: 'fonts.css' }, riso: { files: ['riso.js', 'riso.css', 'media.js'], fonts: 'fonts-riso.css' }, ink: { files: ['ink.js', 'ink.css', 'media.js'], fonts: 'fonts-ink.css' } };
const boardStyle = opt('style', null) && BOARDS[opt('style')] ? opt('style') : Object.keys(BOARDS).find((k) => fs.existsSync(path.join(lib, `${k}.js`)));
if (boardStyle) { const ert = path.join(skill, '..', 'explainer', 'runtime'); for (const f of BOARDS[boardStyle].files) fs.cpSync(path.join(ert, f), path.join(lib, f)); fs.cpSync(path.join(ert, BOARDS[boardStyle].fonts), path.join(lib, 'fonts.css')); }
for (const f of ['promo.js', 'origami.js', 'pop.js', 'op.js', 'cutout.js', 'ascii.js', 'shadow.js', 'bauhaus.js', 'pixel.js', 'chat.js', 'toy3d.js', 'newsreel.js', 'filmroom.js', 'mystery.js', 'isometric.js', 'trailer.js', 'dossier.js', 'manga.js', 'kit.js', 'formats.js']) fs.cpSync(path.join(skill, 'runtime', f), path.join(lib, f));
if (args.includes('--update-lib')) { console.log(M('已刷新 ', 'Refreshed ') + lib); process.exit(0); }
if (fs.existsSync(path.join(proj, 'index.html'))) { console.error(M('项目已存在（只想刷新运行时请加 --update-lib）', 'Project already exists (to refresh only the runtime, add --update-lib)')); process.exit(1); }
const title = opt('title', path.basename(proj));
const STYLES = path.join(skill, '..', 'styles');   // all styles live in styles/ at the skill's top level
const style = opt('style', null), styleDir = style && path.join(STYLES, style);
if (style && !fs.existsSync(styleDir)) { console.error(M(`没有这种风格：${style}（有：${fs.readdirSync(STYLES).filter((d) => !d.endsWith('.md')).join(' / ')}）`, `No such style: ${style} (available: ${fs.readdirSync(STYLES).filter((d) => !d.endsWith('.md')).join(' / ')})`)); process.exit(1); }
// --explain: an explainer video (follows the narration) in this style — forwarded from explainer/scripts/new.mjs, or use directly
const explain = args.includes('--explain');
const format = explain ? 'explain' : args.includes('--quick') ? 'kinetic' : opt('format', null);
// The style's own explain.html: explainers use it by default (hand-written skeleton + narration: stories with characters, hand-written-only styles); --explain --quick = use the generic quick-mode explainer skeleton instead
//   Quick mode needs the style to have a kit.js adapter (toy3d doesn't yet): without one, hand-written only
const ownExplain = style && fs.existsSync(path.join(STYLES, style, 'explain.html')) && !(explain && args.includes('--quick'));
const hasKit = style && fs.readFileSync(path.join(skill, 'runtime', 'kit.js'), 'utf8').includes(`register('${style}'`);
if (style && (format === 'kinetic' || (format === 'explain' && !ownExplain)) && !hasKit && style !== 'launch') { console.error(M(`${style} 还没有快速版（--quick）：只能手写，见 styles/${style}/STYLE.md`, `${style} has no quick mode (--quick) yet: hand-written only, see styles/${style}/STYLE.md`)); process.exit(1); }
const fmtFile = format && (format === 'explain' && ownExplain ? path.join(STYLES, style, 'explain.html') : path.join(skill, 'templates', 'formats', format + '.html'));
if (format && !style) { console.error(M('--quick 要和 --style 一起用：快速版也要先选一种风格', '--quick needs --style: quick mode also starts from a style')); process.exit(1); }
if (format && !fs.existsSync(fmtFile)) { console.error(M(`快速版没有这种讲法：${format}（有：${fs.readdirSync(path.join(skill, 'templates', 'formats')).map((f) => f.replace('.html', '')).join(' / ')}）`, `Quick mode has no such format: ${format} (available: ${fs.readdirSync(path.join(skill, 'templates', 'formats')).map((f) => f.replace('.html', '')).join(' / ')})`)); process.exit(1); }
for (const d of ['shots', 'research', 'review', 'out', 'assets/src']) fs.mkdirSync(path.join(proj, d), { recursive: true });
// the media manifest (photos / footage in assets/src/ → explainer/scripts/assets.mjs writes it; footage.mjs adds each file's credit)
if (!fs.existsSync(path.join(proj, 'assets', 'manifest.js'))) fs.writeFileSync(path.join(proj, 'assets', 'manifest.js'), 'window.MEDIA_ASSETS = { images: {}, clips: {} };\n');
for (const f of ['index.html', 'brief.md', 'shots.json', 'score.js', 'sound.js', ...(style && fs.existsSync(path.join(styleDir, 'toys.js')) ? ['toys.js'] : [])]) {   // toys.js: the toy3d parts list
  // Explainers (--explain) use the explainer brief template (sources / original text / facts / common knowledge / illustration / music), not the promo product fact sheet
  const src = f === 'brief.md' && explain ? path.join(skill, 'templates', 'project', 'brief-explain.md') : style && fs.existsSync(path.join(styleDir, f)) ? path.join(styleDir, f) : path.join(skill, 'templates', 'project', f);
  fs.writeFileSync(path.join(proj, f), fs.readFileSync(src, 'utf8').replaceAll('__TITLE__', title).replaceAll('__MUSIC__', M('- 垫底的配乐（score.js；说话时自动退到人声后面，只在停顿、换场、片尾出来）或者不要配乐（script.json 写 "bgm": false）', '- Background music (score.js; it drops behind the voice while someone speaks and comes up only in pauses, scene changes and the ending), or no music ("bgm": false in script.json)')));
}
// Explainer storyboard: information list + cover + one section per line (same template as board-style explainers)
if (explain && !fs.existsSync(path.join(proj, 'storyboard.md'))) fs.writeFileSync(path.join(proj, 'storyboard.md'), fs.readFileSync(path.join(skill, '..', 'explainer', 'templates', 'storyboard.md'), 'utf8').replaceAll('__TITLE__', title));
// Quick-mode skeleton: fonts taken from the <link> in the <head> of the style's starter page
if (format) {
  // The default style launch has no starter page or runtime file of its own (components all live in promo.js): use the generic skeleton's fonts, don't load lib/launch.js
  const starter = fs.existsSync(path.join(styleDir, 'index.html')) ? path.join(styleDir, 'index.html') : path.join(skill, 'templates', 'project', 'index.html');
  const fonts = fs.readFileSync(starter, 'utf8').split('\n').filter((l) => /<link [^>]*stylesheet/.test(l)).join('\n');
  const zh = /^zh/i.test(opt('lang', 'zh-CN'));
  let html = fs.readFileSync(fmtFile, 'utf8').replaceAll('__TITLE__', title).replaceAll('__STYLE__', style).replace('__FONTS__', fonts)
    .replaceAll('__LANG__', opt('lang', 'zh-CN')).replace('__Q__', zh ? '一个问题？' : 'A question?').replace('__T__', zh ? '标题' : 'Title').replace('__TAG__', zh ? '一句话总结' : 'One-line takeaway');
  if (!fs.existsSync(path.join(skill, 'runtime', style + '.js')) && !BOARDS[style]) html = html.replace(`<script src="lib/${style}.js"></script>\n`, '');
  if (BOARDS[style]) html = html.replace(`<script src="lib/${style}.js"></script>\n`, `<script src="lib/${style}.js"></script>\n<script src="lib/media.js"></script>\n`);   // media.js must load after the board (it adds photo / image to the board)
  fs.writeFileSync(path.join(proj, 'index.html'), html);
}
// The project's language goes on <html lang>: the checks speak it (core/scripts/lang.mjs) and fonts / line breaking follow it
{ const ip = path.join(proj, 'index.html'), lang = opt('lang', 'zh-CN'); if (fs.existsSync(ip)) { let h = fs.readFileSync(ip, 'utf8').replace(/<html\b[^>]*>/i, `<html lang="${lang}">`); if (!/^zh/i.test(lang)) h = englishPlaceholders(h); fs.writeFileSync(ip, h); } }
const S = path.join(skill, 'scripts');
if (explain) {
  // Narration: the same script.json as explainers → python3 explainer/scripts/tts.py <project> generates audio/narration.m4a, timeline.js
  const lang = opt('lang', 'zh-CN'), zh = /^zh/i.test(lang);
  const VOICES = { zh: 'zh-CN-XiaoxiaoNeural', en: 'en-US-AvaNeural', ja: 'ja-JP-NanamiNeural', ko: 'ko-KR-SunHiNeural', fr: 'fr-FR-DeniseNeural', de: 'de-DE-KatjaNeural', es: 'es-ES-ElviraNeural' };
  fs.mkdirSync(path.join(proj, 'audio'), { recursive: true });
  // bgm: true = use the project's score.js as a music bed (ducks under the voice automatically); false = no music (see "Sound with narration" in promo/references/kit.md)
  // The style's explainer defaults (styles/<style>/explain.json: lead_in, default voice per language, bgm), e.g. shadow puppetry telling history defaults to a male voice and a longer lead-in
  const D = style && fs.existsSync(path.join(STYLES, style, 'explain.json')) ? JSON.parse(fs.readFileSync(path.join(STYLES, style, 'explain.json'), 'utf8')) : {}, lk = lang.toLowerCase().split('-')[0];
  fs.writeFileSync(path.join(proj, 'script.json'), JSON.stringify({ voice: opt('voice', (D.voice && D.voice[lk]) || VOICES[lk] || VOICES.en), rate: D.rate ?? '+0%', ...(D.pitch ? { pitch: D.pitch } : {}), lead_in: D.lead_in ?? 0.8, ...(D.voice_fx ? { voice_fx: D.voice_fx } : {}), gap: 0.35, tail: 1.5, bgm: D.bgm ?? true, lines: [{ id: 'l1', text: zh ? '在这里写第一句旁白。' : 'Write the first line of narration here.' }] }, null, 2) + '\n');
  fs.writeFileSync(path.join(proj, 'timeline.js'), 'window.TIMELINE = {"duration": 5, "lines": [{"id": "l1", "text": "", "start": 0.8, "end": 3, "words": []}]};\n');
}
if (explain) {
  const X = path.join(skill, '..', 'explainer', 'scripts');
  console.log(M(`已创建 ${proj}（讲解视频 · 风格：${style}，先读 ${path.join(styleDir, 'STYLE.md')}）
  1. 先查证事实写进 brief.md，再写旁白 script.json → python3 ${X}/tts.py ${proj}
  2. 写画面 index.html（跟着旁白走：${path.join(skill, 'references', 'kit.md')}）
  3. 检查和渲染：node ${S}/render.mjs ${proj} --check / --draft / （成片）`, `Created ${proj} (explainer · style: ${style}; read ${path.join(styleDir, 'STYLE.md')} first)
  1. Verify the facts and write them into brief.md, then write the narration script.json → python3 ${X}/tts.py ${proj}
  2. Write the picture index.html (it follows the narration: ${path.join(skill, 'references', 'kit.md')})
  3. Check and render: node ${S}/render.mjs ${proj} --check / --draft / (final)`));
} else console.log(M(`已创建 ${proj}${style ? `（风格：${style}，先读 ${path.join(styleDir, 'STYLE.md')}）` : ''}${format ? `（快速版：写法见 ${path.join(skill, 'references', 'kit.md')}）` : ''}
  1. 调研：node ${S}/capture.mjs ${proj} --research <网址>     → research/
  2. 写 brief.md（事实表），写 shots.json（要截的图），截图：node ${S}/capture.mjs ${proj}
  3. 按产品写配乐 score.js（references/music.md）和音效 sound.js（references/sound.md），写 index.html（画面），检查：node ${S}/render.mjs ${proj} --check
  4. 渲染：node ${S}/render.mjs ${proj}（横屏）/ --aspect 9:16（竖屏）`, `Created ${proj}${style ? ` (style: ${style}; read ${path.join(styleDir, 'STYLE.md')} first)` : ''}${format ? ` (quick mode: how to write it in ${path.join(skill, 'references', 'kit.md')})` : ''}
  1. Research: node ${S}/capture.mjs ${proj} --research <url>     → research/
  2. Write brief.md (fact sheet) and shots.json (the screenshots to take), capture: node ${S}/capture.mjs ${proj}
  3. Write the music score.js (references/music.md) and sound effects sound.js (references/sound.md) for the product, write index.html (the picture), check: node ${S}/render.mjs ${proj} --check
  4. Render: node ${S}/render.mjs ${proj} (landscape) / --aspect 9:16 (portrait)`));
