#!/usr/bin/env node
// new.mjs: creates a new video project
// Usage: node new.mjs <project dir> [--style whiteboard|riso|ink] [--lang zh-CN|en|…] [--voice edge-tts voice] [--title title]
//        node new.mjs <project dir> --update-lib     only refresh lib/ (use after the runtime has been updated)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { M, englishPlaceholders } from '../../core/scripts/lang.mjs';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
// Messages follow the video language (--lang, default Chinese)
process.env.BV_LANG ??= /^zh/i.test(opt('lang', 'zh-CN')) ? 'zh' : 'en';
if (!args[0] || args[0].startsWith('--')) { console.error(M('用法：node new.mjs <项目目录> [--style whiteboard|riso|ink] [--lang zh-CN|en|…] [--voice edge-tts 声音] [--title 标题]', 'Usage: node new.mjs <project dir> [--style whiteboard|riso|ink] [--lang zh-CN|en|…] [--voice edge-tts voice] [--title title]')); process.exit(1); }
const proj = path.resolve(args[0]);
// Runtime files each style needs copied into the project's lib/; the font rules are always copied as lib/fonts.css
const STYLES = {
  whiteboard: { files: ['whiteboard.js', 'whiteboard.css', 'character.js', 'media.js'], fonts: 'fonts.css', leadIn: 1.9, cast: true },
  riso: { files: ['riso.js', 'riso.css', 'media.js'], fonts: 'fonts-riso.css', leadIn: 2.3, cast: false },
  ink: { files: ['ink.js', 'ink.css', 'media.js'], fonts: 'fonts-ink.css', leadIn: 3.3, cast: true, bgm: 'history' },
};
const lib = path.join(proj, 'lib');
// Refreshing the runtime: when no style is given, infer the original style from the files already in the project's lib/
const detected = Object.keys(STYLES).find((k) => fs.existsSync(path.join(lib, `${k}.js`)));
const style = opt('style', args.includes('--update-lib') && detected ? detected : 'whiteboard');
// The promo-born styles (launch, origami, pop, op, cutout, ascii, shadow, bauhaus, pixel, chat, toy3d, newsreel, filmroom, mystery) make explainers too: the project is created by promo/scripts/new.mjs in its
// narration-paced mode (voiceover + captions + the style's common verbs), with the same script.json / tts.py workflow
const PROMO_STYLES = ['launch', 'origami', 'pop', 'op', 'cutout', 'ascii', 'shadow', 'bauhaus', 'pixel', 'chat', 'toy3d', 'newsreel', 'filmroom', 'mystery'];
if (PROMO_STYLES.includes(opt('style'))) {
  const { spawnSync } = await import('node:child_process');
  const pass = ['--style', opt('style'), '--explain', '--lang', opt('lang', 'zh-CN'), ...(opt('voice') ? ['--voice', opt('voice')] : []), ...(opt('title') ? ['--title', opt('title')] : []), ...(args.includes('--update-lib') ? ['--update-lib'] : []), ...(args.includes('--quick') ? ['--quick'] : [])];
  const r = spawnSync(process.execPath, [path.join(skill, '..', 'promo', 'scripts', 'new.mjs'), proj, ...pass], { stdio: 'inherit' });
  process.exit(r.status ?? 0);
}
if (!STYLES[style]) { console.error(M(`没有这种风格：${style}（有：${[...Object.keys(STYLES), ...PROMO_STYLES].join(' / ')}）`, `No such style: ${style}; available: ${[...Object.keys(STYLES), ...PROMO_STYLES].join(', ')}`)); process.exit(1); }
const S = STYLES[style];
const slug = path.basename(proj);
// Video language (default Chinese): sets the default voice, the placeholder narration, <html lang> and the whiteboard handwriting font
const lang = opt('lang', 'zh-CN');
const VOICES = { zh: 'zh-CN-XiaoxiaoNeural', en: 'en-US-AvaNeural', ja: 'ja-JP-NanamiNeural', ko: 'ko-KR-SunHiNeural', fr: 'fr-FR-DeniseNeural', de: 'de-DE-KatjaNeural', es: 'es-ES-ElviraNeural' };
const voice = opt('voice', VOICES[lang.toLowerCase().split('-')[0]]);
if (!voice && !args.includes('--update-lib')) { console.error(M(`--lang ${lang} 没有默认声音：用 --voice <名字> 指定（列出所有声音：edge-tts --list-voices）`, `No default voice for --lang ${lang}; pass --voice <name> (list them with: edge-tts --list-voices)`)); process.exit(1); }

fs.mkdirSync(lib, { recursive: true });
const rt = path.join(skill, 'runtime');
fs.cpSync(path.join(rt, '..', '..', 'core', 'runtime', 'core.js'), path.join(lib, 'core.js')); // shared core (bb-video/core)
for (const f of S.files) fs.cpSync(path.join(rt, f), path.join(lib, f));
fs.cpSync(path.join(rt, S.fonts), path.join(lib, 'fonts.css'));
if (style === 'whiteboard') fs.cpSync(path.join(rt, 'katex'), path.join(lib, 'katex'), { recursive: true });   // formulas are a whiteboard component
if (args.includes('--update-lib')) { console.log(M(`已刷新 ${lib}（${style}）`, `Refreshed ${lib} (${style})`)); process.exit(0); }

const idx = path.join(proj, 'index.html');
if (fs.existsSync(idx)) { console.error(M('项目已存在：' + idx + '（只想刷新运行时请加 --update-lib）', 'Project already exists: ' + idx + ' (to only refresh the runtime, add --update-lib)')); process.exit(1); }
for (const d of ['audio', 'review', 'out', 'assets/src']) fs.mkdirSync(path.join(proj, d), { recursive: true });
// Media manifest (images and videos put in assets/src/ are processed by scripts/assets.mjs and written here)
fs.writeFileSync(path.join(proj, 'assets', 'manifest.js'), 'window.MEDIA_ASSETS = { images: {}, clips: {} };\n');
const tpl = fs.readFileSync(path.join(skill, 'templates', style, 'index.html'), 'utf8');
{ const h = tpl.replaceAll('__TITLE__', opt('title', slug)).replaceAll('__SLUG__', slug).replaceAll('__LANG__', lang); fs.writeFileSync(idx, /^zh/i.test(lang) ? h : englishPlaceholders(h)); }   // non-Chinese projects get English placeholders
fs.writeFileSync(path.join(proj, 'script.json'), JSON.stringify({
  voice, rate: '+0%', lead_in: S.leadIn, gap: 0.35, tail: 1.5, bgm: S.bgm || 'bright',
  lines: [{ id: 'l1', text: /^zh/i.test(lang) ? '在这里写第一句旁白。' : 'Write the first line of narration here.' }],
}, null, 2) + '\n');
if (S.cast) fs.writeFileSync(path.join(proj, 'characters.js'), `// Characters in this video: name → spec (see ${style === 'ink' ? 'styles/ink/STYLE.md (in the skill), "Figures"' : 'references/characters.md'})\nwindow.CAST = {};\n`);
// brief.md: the fact sheet (sources, original text, facts, common knowledge, illustrative data, on-screen text) — render --check compares every on-screen text with it
const music = M('- 垫底的配乐：script.json 的 "bgm"（bright / calm / history / playful，说话时自动退到人声后面），或者不要配乐（"bgm": false）', '- Background music: script.json\'s "bgm" (bright / calm / history / playful; it drops behind the voice while someone speaks), or no music ("bgm": false)');
if (!fs.existsSync(path.join(proj, 'brief.md'))) fs.writeFileSync(path.join(proj, 'brief.md'), fs.readFileSync(path.join(skill, '..', 'promo', 'templates', 'project', 'brief-explain.md'), 'utf8').replaceAll('__TITLE__', opt('title', slug)).replaceAll('__MUSIC__', music));
// storyboard.md: the information checklist + cover + one section per narration line (GUIDE step 2; references/review.md checks against it)
if (!fs.existsSync(path.join(proj, 'storyboard.md'))) fs.writeFileSync(path.join(proj, 'storyboard.md'), fs.readFileSync(path.join(skill, 'templates', 'storyboard.md'), 'utf8').replaceAll('__TITLE__', opt('title', slug)));
fs.writeFileSync(path.join(proj, 'timeline.js'), 'window.TIMELINE = {"duration": 5, "lines": [{"id": "l1", "text": "", "start": 0.6, "end": 3, "words": []}]};\n');
console.log(M(`已创建 ${proj}
  brief.md / storyboard.md  先写事实，再写信息清单，每句旁白一节
  script.json  写旁白 → python3 ${path.join(skill, 'scripts/tts.py')} ${proj}
  index.html   写画面 → 直接用浏览器打开预览（空格播放）
  渲染         node ${path.join(skill, 'scripts/render.mjs')} ${proj}`, `Created ${proj}
  brief.md / storyboard.md  facts first, then the information checklist and a section per line
  script.json  write the narration → python3 ${path.join(skill, 'scripts/tts.py')} ${proj}
  index.html   write the visuals → open it directly in a browser to preview (space to play)
  render       node ${path.join(skill, 'scripts/render.mjs')} ${proj}`));
