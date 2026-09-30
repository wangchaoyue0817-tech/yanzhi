import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeBeautyPosterReport, renderBeautyPoster } from '../public/beauty-poster.js';

const report = (score = 90) => ({
  score, percentile: 96, afterScore: 97, afterPercentile: 99.6,
  tier: { name: '高光主角', accent: '#E5CCA3' },
  afterTier: { title: '惊艳焦点' },
  keywords: ['轻盈眉眼', '通透底妆', '柔和唇色'],
});

test('poster assigns the agreed five levels at both sides of every score boundary', () => {
  for (const [score, level] of [[0, 0], [59.9, 0], [60, 1], [74.9, 1], [75, 2], [84.9, 2], [85, 3], [94.9, 3], [95, 4], [100, 4]]) {
    assert.equal(normalizeBeautyPosterReport(report(score)).level, level, `score ${score}`);
  }
});

test('poster preserves caller score, percentile, names, and the three transformation keywords', () => {
  const value = normalizeBeautyPosterReport(report());
  assert.equal(value.score, 90);
  assert.equal(value.afterPercentile, 99.6);
  assert.equal(value.tierName, '高光主角');
  assert.equal(value.afterTierName, '惊艳焦点');
  assert.equal(value.theme.accent, '#E5CCA3');
  assert.deepEqual(value.keywords, ['轻盈眉眼', '通透底妆', '柔和唇色']);
  assert.equal(normalizeBeautyPosterReport({ ...report(), tier: { accent: 'url(bad)' } }).theme.accent, '#E5CCA3');
});

test('poster rejects missing or invalid score data before accessing the browser', async () => {
  await assert.rejects(renderBeautyPoster(), /缺少颜值报告/);
  for (const key of ['score', 'percentile', 'afterScore', 'afterPercentile']) {
    for (const value of [undefined, NaN, Infinity, -1, 100.1, '97']) {
      await assert.rejects(renderBeautyPoster({ report: { ...report(), [key]: value } }), /0–100/);
    }
  }
});

function withCanvasEnvironment(t, { failedImage = false, nullBlob = false, missingContext = false } = {}) {
  const images = [];
  const captions = [];
  const gradient = { addColorStop() {} };
  const context = new Proxy({
    drawImage(image) { images.push(image.src); },
    fillText(value) { captions.push(value); },
    measureText(value) { return { width: String(value).length * 30 }; },
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
  }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  const canvas = {
    getContext: () => missingContext ? null : context,
    toBlob(callback, type) {
      assert.equal(type, 'image/png');
      assert.equal(images.length, 2, 'both photos are drawn before export');
      callback(nullBlob ? null : new Blob(['png'], { type }));
    },
  };
  const oldDocument = globalThis.document;
  const oldImage = globalThis.Image;
  globalThis.document = { createElement: tag => {
    assert.equal(tag, 'canvas');
    return canvas;
  } };
  globalThis.Image = class {
    naturalWidth = 1024;
    naturalHeight = 1536;
    set src(value) {
      this.source = value;
      queueMicrotask(() => failedImage ? this.onerror?.() : this.onload?.());
    }
    get src() { return this.source; }
  };
  t.after(() => {
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
    if (oldImage === undefined) delete globalThis.Image;
    else globalThis.Image = oldImage;
  });
  return { canvas, images, captions };
}

test('poster exports a portrait PNG after drawing two distinct photos and exact report data', async t => {
  const environment = withCanvasEnvironment(t);
  const output = await renderBeautyPoster({ report: report(), beforeSrc: '/before.webp', afterSrc: '/after.webp' });
  assert.equal(output.canvas, environment.canvas);
  assert.equal(output.canvas.width, 1080);
  assert.equal(output.canvas.height, 1920);
  assert.equal(output.blob.type, 'image/png');
  assert.deepEqual(environment.images, ['/before.webp', '/after.webp']);
  for (const caption of ['90', '97', '超过 96% 的人', '超过 99.6% 的人', '+7', '高光主角', '惊艳焦点', '轻盈眉眼']) {
    assert.ok(environment.captions.includes(caption), caption);
  }
});

test('poster surfaces a missing photo as a recoverable generation error', async t => {
  withCanvasEnvironment(t);
  await assert.rejects(renderBeautyPoster({ report: report(), beforeSrc: '', afterSrc: '/after.webp' }), /缺少前后对比照片/);
});

test('poster surfaces image load failure instead of exporting an empty portrait', async t => {
  withCanvasEnvironment(t, { failedImage: true });
  await assert.rejects(renderBeautyPoster({ report: report(), beforeSrc: '/before.webp', afterSrc: '/after.webp' }), /照片加载失败/);
});

test('poster handles browser canvas and PNG export failures', async t => {
  await t.test('missing rendering context', async t => {
    withCanvasEnvironment(t, { missingContext: true });
    await assert.rejects(renderBeautyPoster({ report: report(), beforeSrc: '/before.webp', afterSrc: '/after.webp' }), /无法生成海报/);
  });
  await t.test('null encoded PNG', async t => {
    withCanvasEnvironment(t, { nullBlob: true });
    await assert.rejects(renderBeautyPoster({ report: report(), beforeSrc: '/before.webp', afterSrc: '/after.webp' }), /海报导出失败/);
  });
});
