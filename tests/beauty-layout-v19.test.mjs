import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../public/beauty-report-v17.css', import.meta.url), 'utf8');
const block = selector => css.slice(css.indexOf(`${selector}{`) + selector.length + 1).split('}')[0];

test('the next report section has a non-interactive gradient preview that clears after scrolling', () => {
  const veil = block('.beauty-overview:after');
  assert.match(veil, /position:absolute/);
  assert.match(veil, /pointer-events:none/);
  assert.match(veil, /background:linear-gradient\(180deg,transparent/);
  assert.match(veil, /transition:opacity 1s/);
  assert.match(block('.beauty-report.has-scrolled .beauty-overview:after'), /opacity:0/);
  const reduced = css.slice(css.indexOf('@media(prefers-reduced-motion:reduce)'));
  assert.match(reduced, /\.beauty-overview:after\{display:none\}/);
  assert.doesNotMatch(css, /beauty-scroll-cue|beauty-guide-copy/);
});

test('result typography separates the lead and body without the earlier vertical rule or boxed quote', () => {
  const copy = block('.beauty-result-copy');
  assert.match(copy, /text-align:center/);
  assert.match(copy, /border:0/);
  assert.match(copy, /background:none/);
  const divider = block('.beauty-result-copy:before');
  assert.match(divider, /height:1px/);
  assert.match(divider, /width:auto/);
  assert.match(divider, /top:0/);
  assert.doesNotMatch(divider, /bottom:/);
  assert.match(block('.beauty-copy-lead'), /text-wrap:balance/);
  assert.match(block('.beauty-copy-body'), /line-height:1\.9/);
});

test('the transformation uses a centered integrated arrow, distinct after-photo frame, and paired scores', () => {
  const arrow = block('.beauty-compare-transition');
  assert.match(arrow, /justify-content:center/);
  assert.match(arrow, /margin:-16px auto 0/);
  assert.match(arrow, /max-width:100%/);
  assert.match(arrow, /background:linear-gradient/);
  const frame = block('.beauty-compare-grid .beauty-compare-after .beauty-compare-photo');
  assert.match(frame, /linear-gradient\(145deg,/);
  assert.match(frame, /border-box/);
  assert.match(block('.beauty-compare-scores'), /grid-template-columns:1fr 1fr/);
  assert.match(block('.beauty-compare-scores>div'), /min-width:0/);
  assert.doesNotMatch(css, /beauty-lift-line/);
});
