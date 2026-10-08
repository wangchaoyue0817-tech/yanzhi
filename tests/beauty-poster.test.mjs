import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeBeautyPosterReport, renderBeautyPoster } from '../public/beauty-poster.js';
import { createReport } from '../public/beauty-model.js';

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

function withCanvasEnvironment(t, { failedImage = false, nullBlob = false, missingContext = false, throwBlob = false, invalidDimensions = false } = {}) {
  const images = [];
  const captions = [];
  const commands = [];
  const labels = [];
  const gradient = { addColorStop() {} };
  const context = new Proxy({
    drawImage(image, ...args) { images.push(image.src); commands.push({ name: 'drawImage', args }); },
    fillText(value, x, y) { captions.push(value); labels.push({ value, x, y, font: this.font }); },
    measureText(value) { const size = Number(this.font?.match(/ (\d+)px /)?.[1] || 30); return { width: Array.from(String(value)).length * size }; },
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
  }, { get(target, key) { return key in target ? target[key] : (...args) => commands.push({ name: key, args }); } });
  const canvas = {
    getContext: () => missingContext ? null : context,
    toBlob(callback, type) {
      assert.equal(type, 'image/png');
      assert.equal(images.length, 14, 'both main photos and twelve part photos are drawn before export');
      if (throwBlob) throw new Error('canvas tainted');
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
    naturalWidth = invalidDimensions ? 0 : 1024;
    naturalHeight = 1536;
    set src(value) {
      this.source = value;
      queueMicrotask(() => (typeof failedImage === 'function' ? failedImage(value) : failedImage) ? this.onerror?.() : this.onload?.());
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

test('poster exports a content-sized PNG with both portraits, six illustrated areas and exact data', async t => {
  const environment = withCanvasEnvironment(t);
  const output = await renderBeautyPoster({ report: report(), beforeSrc: '/before.webp', afterSrc: '/after.webp' });
  assert.equal(output.canvas, environment.canvas);
  assert.equal(output.canvas.width, 1080);
  assert.ok(output.canvas.height >= 3200);
  assert.equal(output.blob.type, 'image/png');
  assert.deepEqual(environment.images.slice(0, 2), ['/before.webp', '/after.webp']);
  assert.equal(environment.images.filter(value => value === '/before.webp').length, 7);
  assert.equal(environment.images.filter(value => value === '/after.webp').length, 7);
  for (const caption of ['90', '97', '超过 96% 的人', '超过 99.6% 的人', '+7', '高光主角', '惊艳焦点', '轻盈眉眼']) {
    assert.ok(environment.captions.join('').includes(caption), caption);
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
        assert.ok(label.x >= 28 && label.x <= 1052 && label.y >= 28 && label.y <= environment.canvas.height - 28, `${label.value} stays inside export frame`);
        assert.match(label.font, /^[1-9]00 \d+px /, 'font weights remain portable between browser and Canvas engines');
      }
      const crownCurves = environment.commands.filter(command => command.name === 'bezierCurveTo');
      assert.equal(crownCurves.length, score === 97 ? 8 : 0, 'the highest tier paints four distinct aurora folds');
    });
  }
  assert.deepEqual(ellipseCounts, [0, 2, 4, 4, 6]);
});

test('poster preserves zero, full scores, and unchanged improvement without inventing a gain', async t => {
  for (const score of [0, 100]) {
    await t.test(String(score), async t => {
      const environment = withCanvasEnvironment(t);
      await renderBeautyPoster({report: {...report(score), percentile: score, afterScore: score, afterPercentile: score}, beforeSrc:'/before.webp', afterSrc:'/after.webp'});
      assert.equal(environment.captions.filter(value => value === String(score)).length, 8, 'hero, two portraits and five dimensions show exact scores');
      assert.equal(environment.captions.filter(value => value === `超过 ${score}% 的人`).length, 3);
      assert.ok(environment.captions.includes('+0'));
    });
  }
});

test('normalization retains every title, evaluation, keyword, area step and style line without truncation', () => {
  const original=createReport(97);
  original.title='标题'.repeat(30);
  original.copy='评价文案'.repeat(120);
  original.styleSummary='风格方向'.repeat(80);
  original.keywords=['关键词'.repeat(30),'第二个特点','第三个特点','第四个特点'];
  original.areas[0].steps=['完整步骤'.repeat(50),...original.areas[0].steps];
  const normalized=normalizeBeautyPosterReport(original);
  assert.equal(normalized.title, original.title);
  assert.equal(normalized.copy, original.copy);
  assert.equal(normalized.styleSummary, original.styleSummary);
  assert.deepEqual(normalized.keywords, original.keywords);
  assert.deepEqual(normalized.areas[0].steps, original.areas[0].steps);
  assert.equal(normalized.areas.length,6);
  assert.equal(normalized.dimensions.length,5);
  normalized.areas[0].steps[0]='changed';
  assert.notEqual(original.areas[0].steps[0],'changed');
});

test('complete report renders supplied part images and all six advice blocks, dimensions and palette labels', async t => {
  const environment=withCanvasEnvironment(t);
  const complete=createReport(97);
  complete.title='女娲毕设';
  complete.copy='这张脸很难让镜头装作没看见。把发丝和妆面整理得更精细一点，就很有封面那味了。';
  complete.styleSummary='柔光眉眼与低饱和唇色，让细节自然衔接。';
  complete.palette=[{color:'#AABBCC',label:'雾蓝'},{color:'#BB7799',label:'烟粉'}];
  const parts=Object.fromEntries(complete.areas.map(area=>[area.id,{before:`/${area.id}-before.webp`,after:`/${area.id}-after.webp`}]));
  const output=await renderBeautyPoster({report:complete,beforeSrc:'/before.webp',afterSrc:'/after.webp',parts});
  const rendered=environment.captions.join('');
  for(const value of [complete.title,complete.copy,complete.styleSummary,...complete.keywords,...complete.palette.map(value=>value.label),...complete.dimensions.map(value=>value.label),...complete.areas.flatMap(area=>[area.title,area.summary,...area.steps])]) assert.ok(rendered.includes(value),value);
  assert.deepEqual(environment.images,['/before.webp','/after.webp',...complete.areas.flatMap(area=>[`/${area.id}-before.webp`,`/${area.id}-after.webp`])]);
  assert.ok(output.canvas.height>3200);
  assert.ok(environment.captions.every(value => !/^[，。！？；：、）】]$/u.test(value)), 'Chinese punctuation never occupies a standalone line');
});

test('layout grows for long content and keeps every text baseline inside the PNG', async t => {
  const environment=withCanvasEnvironment(t);
  const regular=createReport(90);
  const first=await renderBeautyPoster({report:regular,beforeSrc:'/before.webp',afterSrc:'/after.webp'});
  const firstHeight=first.canvas.height;
  environment.captions.length=0; environment.labels.length=0; environment.images.length=0;
  const long=createReport(90);
  long.title='长标题'.repeat(12);
  long.copy='很长的完整评价也应该全部保留。'.repeat(12);
  long.styleSummary='所有风格说明都要能看到。'.repeat(10);
  long.keywords=['一'.repeat(40),'二'.repeat(40),'三'.repeat(40),'四'.repeat(40)];
  long.areas[0].steps=['详细做法必须显示完整，不应该被裁掉。'.repeat(10),...long.areas[0].steps];
  long.palette=Array.from({length:7},(_,i)=>({color:'#BFA099',label:`第${i+1}种妆容配色名称也可以很长`}));
  const output=await renderBeautyPoster({report:long,beforeSrc:'/before.webp',afterSrc:'/after.webp'});
  assert.ok(output.canvas.height>firstHeight+1000);
  const rendered=environment.captions.join('');
  for(const value of [long.title,long.copy,long.styleSummary,...long.keywords,long.areas[0].steps[0],...long.palette.map(value=>value.label)]) assert.ok(rendered.includes(value),value);
  for(const label of environment.labels) assert.ok(label.y>0&&label.y<output.canvas.height-28,`${label.value} stays in frame`);
});

test('fallback crops use the correct face regions when callers omit part photographs', async t => {
  const environment=withCanvasEnvironment(t);
  await renderBeautyPoster({report:createReport(68),beforeSrc:'/before.webp',afterSrc:'/after.webp'});
  const crops=environment.commands.filter(value=>value.name==='drawImage'&&value.args.length===8);
  assert.equal(crops.length,12);
  assert.ok(crops.every(value=>value.args[0]>=0&&value.args[1]>=0&&value.args[2]>0&&value.args[3]>0));
  assert.ok(crops[4].args[3]<crops[0].args[3],'eyes crop is tighter than hair crop');
  assert.ok(crops[2].args[0]>=1024*.28&&crops[2].args[1]>=1536*.23,'brows use the upper single-eye close-up');
  assert.ok(crops[8].args[1]>=1536*.43&&crops[8].args[1]<1536*.485,'lips move up from the old chin crop');
});

test('invalid explicit part photograph fails clearly instead of silently exporting a blank or unrelated detail', async t => {
  withCanvasEnvironment(t,{failedImage:source=>source==='/broken-part.webp'});
  await assert.rejects(renderBeautyPoster({report:createReport(80),beforeSrc:'/before.webp',afterSrc:'/after.webp',parts:{eyes:{before:'/broken-part.webp'}}}),/照片加载失败/);
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
  await t.test('invalid image dimensions', async t => {
    withCanvasEnvironment(t, { invalidDimensions: true });
    await assert.rejects(renderBeautyPoster({report:report(),beforeSrc:'/before.webp',afterSrc:'/after.webp'}),/照片尺寸无效/);
  });
  await t.test('canvas export throws', async t => {
    withCanvasEnvironment(t, { throwBlob: true });
    await assert.rejects(renderBeautyPoster({report:report(),beforeSrc:'/before.webp',afterSrc:'/after.webp'}),/照片暂时无法导出/);
  });
  await t.test('null encoded PNG', async t => {
    withCanvasEnvironment(t, { nullBlob: true });
    await assert.rejects(renderBeautyPoster({ report: report(), beforeSrc: '/before.webp', afterSrc: '/after.webp' }), /海报导出失败/);
  });
});
