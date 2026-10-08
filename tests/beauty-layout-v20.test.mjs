import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../public/beauty-report-v20.css', import.meta.url), 'utf8');

function block(selector) {
  const start = css.indexOf(selector + ' {');
  assert.ok(start >= 0, `${selector} must be defined`);
  const opening = css.indexOf('{', start);
  let depth = 1;
  let end = opening + 1;
  for (; depth && end < css.length; end++) {
    if (css[end] === '{') depth++;
    if (css[end] === '}') depth--;
  }
  assert.equal(depth, 0, `${selector} must have balanced braces`);
  return css.slice(opening + 1, end - 1);
}

test('cover and reader obey hidden state even when their components have display rules', () => {
  assert.match(block('.beauty-report [hidden]'), /display:none!important/);
  assert.match(block('.beauty-page.is-reading .beauty-header'), /display:none/);
  assert.match(block('.beauty-page.is-reading .beauty-report'), /min-height:100%/);
});

test('the result cover is compact without shrinking its evaluation or hiding the main action', () => {
  assert.match(block('#beautyCover .beauty-portrait-stage'), /height:149px/);
  assert.match(block('#beautyCover .beauty-score-value strong'), /font-size:73px/);
  assert.match(block('#beautyCover .beauty-copy-lead'), /font-size:13px/);
  assert.match(block('.beauty-preview-card'), /grid-template-columns:64px minmax\(0,1fr\) 30px/);
  assert.match(block('.beauty-preview-card'), /min-height:106px/);
  assert.match(block('.beauty-preview-card'), /linear-gradient/);
  assert.match(block('.beauty-preview-photo img'), /object-fit:cover/);
  assert.match(block('.beauty-preview-copy>span:last-child'), /font-size:11px/);
  assert.match(block('.beauty-cover-share'), /min-height:44px/);
  assert.doesNotMatch(css, /height:100vh|overflow-y:hidden|overflow:hidden!important/);
});

test('the reader keeps two equal chapter tabs sticky and respects vertical scrolling', () => {
  assert.match(block('.beauty-reader-nav'), /position:sticky/);
  assert.match(block('.beauty-reader-nav'), /top:0/);
  assert.match(block('.beauty-reader'), /touch-action:pan-y/);
  assert.match(block('.beauty-reader-tabs'), /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(block('.beauty-reader-tabs>button'), /min-height:44px/);
  assert.match(block('.beauty-reader-tabs>button[aria-selected=true]'), /background:linear-gradient/);
  assert.match(block('.beauty-reader>[role=tabpanel]'), /touch-action:pan-y/);
  assert.match(block('.beauty-reader .beauty-overview:after'), /display:none/);
  assert.match(block('.beauty-reader .beauty-reveal'), /opacity:1;transform:none;filter:none/);
});

test('six beauty regions use a two-row tab grid with a readable selected state', () => {
  assert.match(block('.beauty-area-tabs'), /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(block('.beauty-area-tabs>button'), /min-height:46px/);
  assert.match(block('.beauty-area-tabs>button b'), /font-size:13px/);
  assert.match(block('.beauty-area-tabs>button[aria-selected=true]'), /border-color:[^;]+;background:linear-gradient/);
  assert.match(block('.beauty-reader .beauty-inline-steps li'), /font-size:12px;line-height:1\.8/);
  assert.doesNotMatch(block('.beauty-area-tabs'), /overflow|nowrap|scroll-snap/);
});

test('narrow and short screens retain reader accessibility and reduced motion removes transitions', () => {
  const narrow = block('@media(max-width:350px)');
  assert.match(narrow, /grid-template-columns:53px minmax\(0,1fr\) 25px/);
  assert.match(narrow, /\.beauty-reader \.beauty-insights p \{ font-size:12px; \}/);
  assert.match(block('@media(max-height:740px)'), /height:127px/);
  assert.match(block('@media(prefers-reduced-motion:reduce)'), /animation:none;opacity:1;transform:none/);
  assert.match(block('@media(prefers-reduced-motion:reduce)'), /transition:none/);
  assert.match(css, /button:focus-visible[^}]+outline:2px solid/s);
});

test('returning to the cover skips reveal animations while leaving ambient decoration available', () => {
  const returning = block('.beauty-report.has-read-details #beautyCover :is(.beauty-result-hero,.beauty-coronation,.beauty-portrait-stage,.beauty-portrait-window,.beauty-hero-photo,.beauty-title-group,.beauty-result-copy)');
  assert.match(returning, /animation:none;opacity:1;transform:none/);
  assert.match(block('.beauty-report.has-read-details #beautyCover .beauty-reveal-halo'), /display:none;animation:none/);
  assert.doesNotMatch(css, /has-read-details[^\n]*(?:beauty-aurora|beauty-portrait-orbits|beauty-sparkles|\*)/);
});

test('report images cannot start native dragging or selection during a chapter swipe', () => {
  const images = block('.beauty-report img');
  assert.match(images, /user-select:none/);
  assert.match(images, /-webkit-user-select:none/);
  assert.match(images, /-webkit-user-drag:none/);
  assert.doesNotMatch(images, /pointer-events:none/);
});
