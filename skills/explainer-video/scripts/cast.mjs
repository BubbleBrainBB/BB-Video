#!/usr/bin/env node
// cast.mjs：角色定妆图。读取项目里的 characters.js（window.CAST = { 名字: 规格, ... }），
// 渲染成图片给用户确认。
//   node cast.mjs <项目目录>              所有角色并排 → review/cast.png
//   node cast.mjs <项目目录> <角色名>     这个角色的全部表情和动作 → review/cast-<角色名>.png
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [projArg, who] = process.argv.slice(2);
if (!projArg) { console.error('用法：node cast.mjs <项目目录> [角色名]'); process.exit(1); }
const proj = path.resolve(projArg);
if (!fs.existsSync(path.join(proj, 'characters.js'))) { console.error('找不到 ' + path.join(proj, 'characters.js')); process.exit(1); }
fs.mkdirSync(path.join(proj, 'review'), { recursive: true });

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="../lib/fonts.css"><link rel="stylesheet" href="../lib/whiteboard.css">
<script src="../lib/core.js"></script><script src="../lib/whiteboard.js"></script><script src="../lib/character.js"></script>
<script src="../characters.js"></script></head><body><div id="stage"></div><script>
const WHO = ${JSON.stringify(who || null)};
EV.composition({ duration: 4, fonts: ['40px "LXGW WenKai"'], build: async () => {
  const b = WB.board({ captions: false, seed: 'cast' });
  const names = Object.keys(window.CAST || {});
  if (!names.length) throw new Error('characters.js 里没有定义 window.CAST');
  if (!WHO) {
    const n = names.length, cols = Math.min(4, n), rows = Math.ceil(n / cols);
    const cw = 1920 / cols, ch = 1080 / rows, size = Math.min(cw * 1.2, ch * 0.78);
    names.forEach((name, i) => {
      const cx = cw * (i % cols + 0.5), by = ch * (Math.floor(i / cols) + 1) - 56;
      b.character(CAST[name], { x: cx, y: by, size, at: 0, dur: 0.5, blink: false });
      b.text(name, { x: cx, y: by + 6, size: 34, align: 'center', at: 0, dur: 0.1, color: 'gray' });
    });
  } else {
    const spec = CAST[WHO];
    if (!spec) throw new Error('没有这个角色：' + WHO);
    // 上两行：全部表情 + 说话；最后一行：四个方向的指向（格子更宽，手臂不会伸进隔壁）
    const faces = ['neutral', 'smile', 'happy', 'explain', 'think', 'surprised', 'confused', 'sad', 'serious', 'proud', 'excited', '说话'];
    const aims = [['指右上', 1, -1], ['指左', -1, -0.1], ['指右下', 1, 0.8], ['指正上', 0.15, -1]];
    faces.forEach((e, i) => {
      const cx = 320 * (i % 6 + 0.5), by = 360 * (Math.floor(i / 6) + 1) - 44;
      const c = b.character(spec, { x: cx, y: by, size: 250, at: 0, dur: 0.5, blink: false });
      if (e === '说话') c.expr(0, 'explain', 0.01).expr(0, { mouthOpen: 0.55 }, 0.01);
      else c.expr(0, e, 0.01);
      b.text(e, { x: cx, y: by + 2, size: 28, align: 'center', at: 0, dur: 0.1, color: 'gray' });
    });
    aims.forEach(([e, dx, dy], i) => {
      const cx = 480 * (i + 0.5), by = 1080 - 44;
      const c = b.character(spec, { x: cx, y: by, size: 250, at: 0, dur: 0.5, blink: false });
      c.expr(0, 'explain', 0.01).point(0.5, cx + dx * 300, by - 150 + dy * 300, { hold: 99 });
      b.text(e, { x: cx, y: by + 2, size: 28, align: 'center', at: 0, dur: 0.1, color: 'gray' });
    });
  }
  return b;
}});
</script></body></html>`;
const sheet = path.join(proj, 'review', 'cast.html');
fs.writeFileSync(sheet, html);
const r = spawnSync('node', [path.join(here, 'render.mjs'), proj, '--html', 'review/cast.html', '--stills', '3'], { stdio: ['ignore', 'pipe', 'inherit'] });
const out = r.stdout.toString();
if (r.status !== 0) { console.error(out); process.exit(1); }
const png = path.join(proj, 'review', who ? `cast-${who}.png` : 'cast.png');
fs.renameSync(path.join(proj, 'review', 'still-3.00.png'), png);
out.split('\n').filter((l) => l && !l.startsWith('截图')).forEach((l) => console.log(l));
console.log('定妆图：' + png);
