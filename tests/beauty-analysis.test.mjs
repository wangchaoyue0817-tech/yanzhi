import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('鉴颜值 opens its dedicated in-home experience from the carousel and skill picker', () => {
  const html = read('public/index.html');
  const app = read('public/app.js');
  const data = read('public/data.js');
  assert.match(html, /id="beautyPage"[^>]*aria-modal="true"/);
  assert.match(html, /beauty-analysis\.css\?v=1/);
  assert.match(html, /beauty-analysis\.js\?v=1/);
  assert.match(app, /if\(label==='鉴颜值'&&window\.beautyExperience\)\{window\.beautyExperience\.open\(\);return;\}/);
  assert.equal((data.match(/\{ label: "鉴颜值"/g) ?? []).length, 2);
  assert.match(app, /体验 AI 鉴颜值演示/);
});

test('the report contains the requested demo scores, ranks, photos, and area-by-area advice', () => {
  const html = read('public/index.html');
  assert.match(html, /综合颜值演示分[\s\S]*?76<span>\/100<\/span>/);
  assert.match(html, /超过 <em>62%<\/em>/);
  assert.match(html, /变美效果预览[\s\S]*?86 分/);
  assert.match(html, /超过 84%/);
  for (const area of ['眉眼', '底妆与气色', '唇形', '整体协调']) assert.match(html, new RegExp(`>${area}<`));
  assert.match(html, /分数、排名、效果、建议、品牌、商品与价格均为演示内容/);
  assert.match(html, /本体验不会上传照片，也不会创建订单/);
  assert.equal((html.match(/data-demo-purchase=/g) ?? []).length, 5);
});

test('photo preview stays local and the downloadable poster includes scores and suggestions', () => {
  const script = read('public/beauty-analysis.js');
  assert.match(script, /URL\.createObjectURL\(file\)/);
  assert.match(script, /URL\.revokeObjectURL\(uploadedUrl\)/);
  assert.doesNotMatch(script, /\bfetch\s*\(|XMLHttpRequest/);
  assert.match(script, /canvas\.toBlob/);
  assert.match(script, /link\.download = filename/);
  assert.match(script, /我的鉴颜值变美报告/);
  assert.match(script, /单品灵感：杏雾暖棕眼影盘/);
  assert.match(script, /海报已下载，可从下载目录分享给朋友/);
});

test('uses the local fictional demo portrait and project-specific beauty styles', () => {
  const css = read('public/beauty-analysis.css');
  const imagePath = new URL('public/assets/beauty-demo-portrait.png', root);
  assert.ok(existsSync(imagePath));
  assert.ok(statSync(imagePath).size > 50_000);
  assert.match(css, /--jx-beauty-primary:linear-gradient/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /max-width:350px/);
  assert.match(css, /beauty-after-frame img/);
});
