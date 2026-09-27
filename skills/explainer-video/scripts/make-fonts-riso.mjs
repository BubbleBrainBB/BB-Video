#!/usr/bin/env node
// make-fonts-riso.mjs：生成 runtime/fonts-riso.css（孔版印刷风格用；开发 skill 时运行，做视频不需要运行）。
// 从 Fontsource 的官方 CSS 读出按字符切好的分片，改写成"本机 → jsDelivr → unpkg"的加载顺序。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'runtime', 'fonts-riso.css');
const FONTS = [
  // [包名, 版本, 字重, 本机可能的名字]
  ['noto-serif-sc', '5.3.0', 900, ['Noto Serif SC Black', 'NotoSerifSC-Black', 'Source Han Serif SC Heavy', 'SourceHanSerifSC-Heavy', 'Noto Serif CJK SC Black', 'NotoSerifCJKsc-Black']],
  ['noto-sans-sc', '5.3.0', 500, ['Noto Sans SC Medium', 'NotoSansSC-Medium', 'Source Han Sans SC Medium', 'SourceHanSansSC-Medium', 'Noto Sans CJK SC Medium', 'NotoSansCJKsc-Medium']],
  ['noto-sans-sc', '5.3.0', 700, ['Noto Sans SC Bold', 'NotoSansSC-Bold', 'Source Han Sans SC Bold', 'SourceHanSansSC-Bold', 'Noto Sans CJK SC Bold', 'NotoSansCJKsc-Bold']],
  ['noto-sans-sc', '5.3.0', 900, ['Noto Sans SC Black', 'NotoSansSC-Black', 'Source Han Sans SC Heavy', 'SourceHanSansSC-Heavy', 'Noto Sans CJK SC Black', 'NotoSansCJKsc-Black']],
  ['oswald', '5.3.0', 600, ['Oswald SemiBold', 'Oswald-SemiBold']],
];
let css = `/* fonts-riso.css：字体加载规则（不含字体文件本身），由 scripts/make-fonts-riso.mjs 生成
 * 每个字体按顺序尝试：① 本机已安装的 → ② jsDelivr → ③ unpkg 镜像。网络字体按字符切片，只下载用到的字。
 * 全都拿不到时（本机没装、也没联网），自动回退到 riso.js 里 FONTS 列出的备用字体，照常渲染。
 * 思源宋体 / 思源黑体（Noto Serif SC / Noto Sans SC）、Oswald：SIL OFL 1.1，经 Fontsource 分发
 */
`;
let n = 0;
for (const [pkg, ver, w, locals] of FONTS) {
  const url = `https://cdn.jsdelivr.net/npm/@fontsource/${pkg}@${ver}/${w}.css`;
  const src = await (await fetch(url)).text();
  for (const m of src.matchAll(/@font-face\s*{([^}]*)}/g)) {
    const body = m[1];
    const fam = /font-family:\s*'([^']+)'/.exec(body)[1];
    const file = /url\(\.\/files\/([^)]+\.woff2)\)/.exec(body)[1];
    const range = /unicode-range:\s*([^;]+);/.exec(body);
    const l = locals.map((x) => `local('${x}')`).join(',');
    css += `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:block;src:${l},url('https://cdn.jsdelivr.net/npm/@fontsource/${pkg}@${ver}/files/${file}') format('woff2'),url('https://unpkg.com/@fontsource/${pkg}@${ver}/files/${file}') format('woff2');${range ? `unicode-range:${range[1]};` : ''}}\n`;
    n++;
  }
}
fs.writeFileSync(out, css);
console.log(`已生成 ${out}（${n} 条规则）`);
