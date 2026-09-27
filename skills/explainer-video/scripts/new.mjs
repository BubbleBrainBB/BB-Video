#!/usr/bin/env node
// new.mjs：新建一个视频项目
// 用法：node new.mjs <项目目录> [--style whiteboard|riso] [--title 标题]
//       node new.mjs <项目目录> --update-lib     只刷新 lib/（运行时更新后用）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
if (!args[0] || args[0].startsWith('--')) { console.error('用法：node new.mjs <项目目录> [--style whiteboard|riso] [--title 标题]'); process.exit(1); }
const proj = path.resolve(args[0]);
// 每个风格需要复制到项目 lib/ 里的运行时文件；字体规则统一复制成 lib/fonts.css
const STYLES = {
  whiteboard: { files: ['whiteboard.js', 'whiteboard.css', 'character.js'], fonts: 'fonts.css', leadIn: 0.6, cast: true },
  riso: { files: ['riso.js', 'riso.css'], fonts: 'fonts-riso.css', leadIn: 2.3, cast: false },
};
const lib = path.join(proj, 'lib');
// 刷新运行时：没指定风格时，按项目 lib/ 里已有的文件判断原来的风格
const detected = Object.keys(STYLES).find((k) => fs.existsSync(path.join(lib, `${k}.js`)));
const style = opt('style', args.includes('--update-lib') && detected ? detected : 'whiteboard');
if (!STYLES[style]) { console.error(`没有这个风格：${style}，可用：${Object.keys(STYLES).join('、')}`); process.exit(1); }
const S = STYLES[style];
const slug = path.basename(proj);

fs.mkdirSync(lib, { recursive: true });
const rt = path.join(skill, 'runtime');
fs.cpSync(path.join(rt, 'core.js'), path.join(lib, 'core.js'));
for (const f of S.files) fs.cpSync(path.join(rt, f), path.join(lib, f));
fs.cpSync(path.join(rt, S.fonts), path.join(lib, 'fonts.css'));
fs.cpSync(path.join(rt, 'katex'), path.join(lib, 'katex'), { recursive: true });
if (args.includes('--update-lib')) { console.log(`已刷新 ${lib}（${style}）`); process.exit(0); }

const idx = path.join(proj, 'index.html');
if (fs.existsSync(idx)) { console.error('项目已存在：' + idx + '（只想刷新运行时请加 --update-lib）'); process.exit(1); }
for (const d of ['audio', 'review', 'out']) fs.mkdirSync(path.join(proj, d), { recursive: true });
const tpl = fs.readFileSync(path.join(skill, 'templates', style, 'index.html'), 'utf8');
fs.writeFileSync(idx, tpl.replaceAll('__TITLE__', opt('title', slug)).replaceAll('__SLUG__', slug));
fs.writeFileSync(path.join(proj, 'script.json'), JSON.stringify({
  voice: 'zh-CN-XiaoxiaoNeural', rate: '+0%', lead_in: S.leadIn, gap: 0.35, tail: 1.5, bgm: 'bright',
  lines: [{ id: 'l1', text: '在这里写第一句旁白。' }],
}, null, 2) + '\n');
if (S.cast) fs.writeFileSync(path.join(proj, 'characters.js'), '// 本视频的角色：名字 → 规格（见 references/characters.md）\nwindow.CAST = {};\n');
fs.writeFileSync(path.join(proj, 'timeline.js'), 'window.TIMELINE = {"duration": 5, "lines": [{"id": "l1", "text": "", "start": 0.6, "end": 3, "words": []}]};\n');
console.log(`已创建 ${proj}
  script.json  写旁白 → python3 ${path.join(skill, 'scripts/tts.py')} ${proj}
  index.html   写画面 → 浏览器直接打开可预览（空格播放）
  渲染         node ${path.join(skill, 'scripts/render.mjs')} ${proj}`);
