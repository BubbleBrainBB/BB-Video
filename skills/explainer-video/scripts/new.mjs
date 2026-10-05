#!/usr/bin/env node
// new.mjs: creates a new video project
// Usage: node new.mjs <project dir> [--style whiteboard|riso] [--title title]
//        node new.mjs <project dir> --update-lib     only refresh lib/ (use after the runtime has been updated)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
if (!args[0] || args[0].startsWith('--')) { console.error('Usage: node new.mjs <project dir> [--style whiteboard|riso] [--title title]'); process.exit(1); }
const proj = path.resolve(args[0]);
// Runtime files each style needs copied into the project's lib/; the font rules are always copied as lib/fonts.css
const STYLES = {
  whiteboard: { files: ['whiteboard.js', 'whiteboard.css', 'character.js', 'media.js'], fonts: 'fonts.css', leadIn: 1.9, cast: true },
  riso: { files: ['riso.js', 'riso.css', 'media.js'], fonts: 'fonts-riso.css', leadIn: 2.3, cast: false },
};
const lib = path.join(proj, 'lib');
// Refreshing the runtime: when no style is given, infer the original style from the files already in the project's lib/
const detected = Object.keys(STYLES).find((k) => fs.existsSync(path.join(lib, `${k}.js`)));
const style = opt('style', args.includes('--update-lib') && detected ? detected : 'whiteboard');
if (!STYLES[style]) { console.error(`No such style: ${style}; available: ${Object.keys(STYLES).join(', ')}`); process.exit(1); }
const S = STYLES[style];
const slug = path.basename(proj);

fs.mkdirSync(lib, { recursive: true });
const rt = path.join(skill, 'runtime');
fs.cpSync(path.join(rt, 'core.js'), path.join(lib, 'core.js'));
for (const f of S.files) fs.cpSync(path.join(rt, f), path.join(lib, f));
fs.cpSync(path.join(rt, S.fonts), path.join(lib, 'fonts.css'));
fs.cpSync(path.join(rt, 'katex'), path.join(lib, 'katex'), { recursive: true });
if (args.includes('--update-lib')) { console.log(`Refreshed ${lib} (${style})`); process.exit(0); }

const idx = path.join(proj, 'index.html');
if (fs.existsSync(idx)) { console.error('Project already exists: ' + idx + ' (to only refresh the runtime, add --update-lib)'); process.exit(1); }
for (const d of ['audio', 'review', 'out', 'assets/src']) fs.mkdirSync(path.join(proj, d), { recursive: true });
// Media manifest (images and videos put in assets/src/ are processed by scripts/assets.mjs and written here)
fs.writeFileSync(path.join(proj, 'assets', 'manifest.js'), 'window.MEDIA_ASSETS = { images: {}, clips: {} };\n');
const tpl = fs.readFileSync(path.join(skill, 'templates', style, 'index.html'), 'utf8');
fs.writeFileSync(idx, tpl.replaceAll('__TITLE__', opt('title', slug)).replaceAll('__SLUG__', slug));
fs.writeFileSync(path.join(proj, 'script.json'), JSON.stringify({
  voice: 'zh-CN-XiaoxiaoNeural', rate: '+0%', lead_in: S.leadIn, gap: 0.35, tail: 1.5, bgm: 'bright',
  lines: [{ id: 'l1', text: '在这里写第一句旁白。' }],
}, null, 2) + '\n');
if (S.cast) fs.writeFileSync(path.join(proj, 'characters.js'), '// Characters in this video: name → spec (see references/characters.md)\nwindow.CAST = {};\n');
fs.writeFileSync(path.join(proj, 'timeline.js'), 'window.TIMELINE = {"duration": 5, "lines": [{"id": "l1", "text": "", "start": 0.6, "end": 3, "words": []}]};\n');
console.log(`Created ${proj}
  script.json  write the narration → python3 ${path.join(skill, 'scripts/tts.py')} ${proj}
  index.html   write the visuals → open it directly in a browser to preview (space to play)
  render       node ${path.join(skill, 'scripts/render.mjs')} ${proj}`);
