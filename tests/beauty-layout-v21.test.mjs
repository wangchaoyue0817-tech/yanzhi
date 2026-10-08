import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../public/beauty-report-v21.css', import.meta.url), 'utf8');

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

test('the poster action is a prominent full-width brand button under the result', () => {
  const button = block('#beautyCover .beauty-cover-share');
  assert.match(button, /width:100%;min-height:54px/);
  assert.match(button, /margin:15px 0 0/);
  assert.match(button, /font-size:15px!important/);
  assert.match(button, /background:linear-gradient\(112deg,#5b68ed/);
  assert.match(block('#beautyCover .beauty-cover-share svg'), /width:19px;height:19px/);
});

test('the report preview dissolves without covering navigation or intercepting input', () => {
  const reader = block('.beauty-reader');
  assert.match(reader, /margin-top:20px/);
  assert.match(reader, /touch-action:pan-y/);
  const mask = block('.beauty-reader:after');
  assert.match(mask, /z-index:5;top:76px/);
  assert.match(mask, /height:300px;pointer-events:none/);
  assert.match(mask, /background:linear-gradient/);
  assert.match(mask, /opacity:var\(--beauty-preview-opacity,1\)/);
  assert.match(block('.beauty-reader-nav'), /position:sticky;z-index:8;top:0/);
  assert.doesNotMatch(css, /is-reading|height:100vh|overflow-y:hidden!important|beauty-header/);
});

test('main chapters retain two equal accessible targets while the six anchors stay on one row', () => {
  assert.match(block('.beauty-reader-tabs'), /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(block('.beauty-reader-tabs>button'), /min-height:44px/);
  const anchors = block('#beautyAreaNavigation');
  assert.match(anchors, /display:flex;flex-wrap:nowrap/);
  assert.match(anchors, /overflow-x:auto;overflow-y:hidden/);
  assert.match(anchors, /touch-action:pan-x/);
  assert.doesNotMatch(anchors, /grid-template-columns/);
  assert.match(block('#beautyAreaNavigation>button'), /min-width:46px;min-height:44px/);
  assert.match(block('#beautyAreaNavigation>button b'), /font-size:13px/);
  assert.match(block('#beautyAreaNavigation>button[aria-current=true]'), /background:linear-gradient/);
  assert.match(block('#beautyAreaNavigation>button[aria-current=true]:after'), /opacity:1;transform:scaleX\(1\)/);
});

test('all beauty sections remain in normal vertical flow without reveal delays', () => {
  const area = block('.beauty-reader .beauty-area');
  assert.match(area, /margin:0 0 18px/);
  assert.match(area, /animation:none;opacity:1;transform:none;filter:none/);
  assert.match(block('.beauty-reader .beauty-area.is-visible .beauty-area-pair,.beauty-reader .beauty-area.is-visible .beauty-area-summary,.beauty-reader .beauty-area.is-visible .beauty-product'), /animation:none;opacity:1;transform:none/);
  assert.match(block('.beauty-reader .beauty-inline-steps li'), /font-size:13px;line-height:1\.8/);
  assert.doesNotMatch(css, /beauty-area[^\n]*display:none|visibility:hidden|content-visibility|scroll-snap-type/);
});

test('the chapter end cue stays light and supplies a touch-accessible arrow', () => {
  const end = block('.beauty-chapter-end');
  assert.match(end, /border-top:1px solid/);
  assert.match(end, /font-size:12px/);
  assert.doesNotMatch(end, /box-shadow|linear-gradient|border-radius/);
  assert.match(block('.beauty-chapter-end button'), /width:44px;height:44px/);
  assert.match(block('.beauty-advice-end'), /font-size:12px/);
});

test('small screens retain readable tabs and reduced motion removes chapter movement', () => {
  const narrow = block('@media(max-width:350px)');
  assert.match(narrow, /\.beauty-reader-tabs>button \{ font-size:14px; \}/);
  assert.match(narrow, /margin-inline:-12px;padding-inline:12px/);
  assert.doesNotMatch(narrow, /font-size:(?:[1-9]|1[012])px/);
  const reduced = block('@media(prefers-reduced-motion:reduce)');
  assert.match(reduced, /animation:none;opacity:1;transform:none/);
  assert.match(reduced, /\.beauty-reader:after \{ transition:none; \}/);
  assert.match(reduced, /#beautyCover \.beauty-cover-share:active \{ transform:none; \}/);
});
