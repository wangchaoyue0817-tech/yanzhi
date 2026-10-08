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

test('inherited report primitives respect explicit hidden panels and readable score hierarchy', () => {
  assert.match(block('.beauty-report [hidden]'), /display:none!important/);
  assert.match(block('#beautyCover .beauty-portrait-stage'), /height:149px/);
  assert.match(block('#beautyCover .beauty-score-value strong'), /font-size:73px/);
  assert.match(block('#beautyCover .beauty-copy-lead'), /font-size:13px/);
  assert.doesNotMatch(css, /height:100vh|overflow-y:hidden|overflow:hidden!important/);
});

test('inherited chapter controls and report contents retain readable dimensions', () => {
  assert.match(block('.beauty-reader-tabs'), /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(block('.beauty-reader-tabs>button'), /min-height:44px/);
  assert.match(block('.beauty-reader-tabs>button[aria-selected=true]'), /background:linear-gradient/);
  assert.match(block('.beauty-reader .beauty-reveal'), /opacity:1;transform:none;filter:none/);
  assert.match(block('.beauty-reader .beauty-inline-steps li'), /font-size:12px;line-height:1\.8/);
});

test('inherited small-screen text, focus indicators and reduced-motion styles remain available', () => {
  const narrow = block('@media(max-width:350px)');
  assert.match(narrow, /\.beauty-reader \.beauty-insights p \{ font-size:12px; \}/);
  assert.match(block('@media(max-height:740px)'), /height:127px/);
  assert.match(block('@media(prefers-reduced-motion:reduce)'), /animation:none;opacity:1;transform:none/);
  assert.match(block('@media(prefers-reduced-motion:reduce)'), /transition:none/);
  assert.match(css, /button:focus-visible[^}]+outline:2px solid/s);
});

test('report images cannot start native dragging or selection during a chapter swipe', () => {
  const images = block('.beauty-report img');
  assert.match(images, /user-select:none/);
  assert.match(images, /-webkit-user-select:none/);
  assert.match(images, /-webkit-user-drag:none/);
  assert.doesNotMatch(images, /pointer-events:none/);
});
