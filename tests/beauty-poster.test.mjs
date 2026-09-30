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

test('poster artwork escalates from a clean portrait to gold honor and a three-ring icon stage', () => {
  const levels = [52, 68, 80, 90, 97].map(score => normalizeBeautyPosterReport(report(score)).artwork);
  assert.deepEqual(levels.map(value => value.rings), [0, 1, 2, 2, 3]);
  assert.deepEqual(levels.map(value => value.crown), ['none', 'star', 'gem', 'laurel', 'crown']);
  assert.deepEqual(levels.map(value => value.aurora), [0, 2, 3, 4, 6]);
  assert.ok(levels.every((value, i) => i === 0 || value.stars > levels[i - 1].stars));
  assert.equal(levels[4].metal.length, 6, 'icon typography uses an iridescent metal palette');
  assert.equal(new Set(levels.map(value => value.edition)).size, 5);
  assert.equal(normalizeBeautyPosterReport({ ...report(52), tier: { name: '惊艳焦点' } }).artwork.crown, 'none', 'caller copy cannot upgrade the score artwork');
  levels[4].metal[0] = 'changed';
  assert.equal(normalizeBeautyPosterReport(report(97)).artwork.metal[0], '#FFFFFF', 'palette is not shared mutable state');
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
  const commands = [];
  const labels = [];
  const gradient = { addColorStop() {} };
  const context = new Proxy({
    drawImage(image) { images.push(image.src); },
    fillText(value, x, y) { captions.push(value); labels.push({ value, x, y, font: this.font }); },
    measureText(value) { return { width: String(value).length * 30 }; },
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
  }, { get(target, key) { return key in target ? target[key] : (...args) => commands.push({ name: key, args }); } });
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
  return { canvas, images, captions, commands, labels };
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

test('five rendered tiers keep both photos and data while increasing the actual ring geometry', async t => {
  const ellipseCounts = [];
  for (const [score, edition, ringCount] of [[52, 'NATURAL BEAUTY', 0], [68, 'FRESH BEAUTY', 1], [80, 'RADIANT BEAUTY', 2], [90, 'THE SPOTLIGHT', 2], [97, 'THE BEAUTY ICON', 3]]) {
    await t.test(String(score), async t => {
      const environment = withCanvasEnvironment(t);
      await renderBeautyPoster({ report: report(score), beforeSrc: '/before.webp', afterSrc: '/after.webp' });
      assert.ok(environment.captions.includes(edition));
      assert.ok(environment.captions.includes(String(score)));
      const rings = environment.commands.filter(command => command.name === 'ellipse' && command.args[0] === 0 && command.args[1] === 0 && command.args[2] > 300);
      assert.equal(rings.length, ringCount * 2, 'each orbital ring has its main stroke and an engraved companion');
      ellipseCounts.push(rings.length);
      for (const label of environment.labels) {
        assert.ok(label.x >= 28 && label.x <= 1052 && label.y >= 28 && label.y <= 1892, `${label.value} stays inside export frame`);
        assert.match(label.font, /^[1-9]00 \d+px /, 'font weights remain portable between browser and Canvas engines');
      }
      const crownCurves = environment.commands.filter(command => command.name === 'bezierCurveTo');
      assert.equal(crownCurves.length, score === 97 ? 8 : 0, 'the highest tier paints four distinct aurora folds');
    });
  }
  assert.deepEqual(ellipseCounts, [0, 2, 4, 4, 6]);
});

test('poster handles 100 points, unchanged score, and long optional copy without dropping required data', async t => {
  const environment = withCanvasEnvironment(t);
  await renderBeautyPoster({
    report: { ...report(100), percentile: 100, afterScore: 100, afterPercentile: 100, tier: {}, afterTier: {}, keywords: ['一'.repeat(40), '', null] },
    beforeSrc: '/before.webp', afterSrc: '/after.webp',
  });
  assert.equal(environment.captions.filter(value => value === '100').length, 2);
  assert.equal(environment.captions.filter(value => value === '超过 100% 的人').length, 2);
  assert.ok(environment.captions.includes('+0'));
  assert.ok(environment.captions.includes('气色更通透'));
  assert.ok(environment.captions.includes('风格更协调'));
  const normalized = normalizeBeautyPosterReport({ ...report(100), keywords: ['一'.repeat(40)] });
  assert.equal(normalized.keywords[0].length, 18);
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
