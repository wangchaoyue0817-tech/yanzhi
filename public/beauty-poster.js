const WIDTH = 1080;
const MIN_HEIGHT = 3200;
const FONT = '"PingFang SC", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
const THEMES = [
  { name: '自然本色', accent: '#B2C7EE', light: '#E2ECFF', glow: '#5C78AA', heading: '看见，自然的你' },
  { name: '清新耐看', accent: '#AAB3FF', light: '#E3E5FF', glow: '#6B6FFF', heading: '清新耐看，自有风格' },
  { name: '出众吸睛', accent: '#C3A7FF', light: '#F0E2FF', glow: '#9956E8', heading: '出众，是你的底色' },
  { name: '高光主角', accent: '#E5CCA3', light: '#FFF0D8', glow: '#9270E6', heading: '这一刻，你是主角' },
  { name: '惊艳焦点', accent: '#F5D795', light: '#FFF5DE', glow: '#8A64EE', heading: '你的惊艳，值得登场' },
];

// The score controls the artwork, independently of caller-supplied badge copy.
const ART_DIRECTIONS = [
  { edition: 'NATURAL BEAUTY', rings: 0, aurora: 0, stars: 6, crown: 'none', metal: ['#FFFFFF', '#D8E6FC', '#9CAECF'] },
  { edition: 'FRESH BEAUTY', rings: 1, aurora: 2, stars: 14, crown: 'star', metal: ['#FFFFFF', '#D9D8FF', '#A5BFFF'] },
  { edition: 'RADIANT BEAUTY', rings: 2, aurora: 3, stars: 24, crown: 'gem', metal: ['#FFFFFF', '#EDC5FF', '#BCA4FF', '#77DBF4'] },
  { edition: 'THE SPOTLIGHT', rings: 2, aurora: 4, stars: 38, crown: 'laurel', metal: ['#FFFDF1', '#F7DBA4', '#C99452', '#FFF2C4'] },
  { edition: 'THE BEAUTY ICON', rings: 3, aurora: 6, stars: 64, crown: 'crown', metal: ['#FFFFFF', '#FBDA96', '#E8ABDA', '#95E5FC', '#BBA7FF', '#FFF2C9'] },
];

const PART_REGIONS = {
  hair: [0, 0, 1, .7], brows: [.28, .23, .25, .14], eyes: [.27, .27, .25, .14],
  skin: [.29, .34, .45, .20], lips: [.38, .43, .25, .12], style: [.06, .16, .88, .84],
};
const PART_DEFAULTS = [
  ['hair', '发型与轮廓', '整理发根与脸侧发丝，让轮廓更轻盈。', '吹蓬发根，顺着原有分缝整理。'],
  ['brows', '眉形', '保留自然毛流，让眉形衔接更清晰。', '梳顺毛流，只在空隙处少量补色。'],
  ['eyes', '眼妆', '轻盈的色彩层次，衬托原有眉眼。', '浅棕轻扫眼尾，保持边缘柔和。'],
  ['skin', '底妆与气色', '薄透匀肤，保留自然肌肤纹理。', '底妆少量多次，局部轻拍补妆。'],
  ['lips', '唇妆', '柔和唇色与眉眼呼应，让气色更完整。', '薄涂全唇，再轻轻拍开唇缘。'],
  ['style', '整体风格', '让妆发与配饰共享柔和色调。', '用一件简洁配饰，为整体造型点睛。'],
];
const DEFAULT_PALETTE = [
  { color: '#8B715B', label: '灰茶棕' }, { color: '#C0A58E', label: '杏雾棕' },
  { color: '#D9BFB4', label: '柔光米' }, { color: '#AC6D76', label: '玫瑰豆沙' },
  { color: '#DEC399', label: '香槟金' },
];
const cleanText = (value, fallback = '') => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const cleanList = values => Array.isArray(values) ? values.map(value => cleanText(value)).filter(Boolean) : [];

/** Validate numeric data; preserve complete copy and advice for the expandable print layout. */
export function normalizeBeautyPosterReport(report) {
  if (!report || typeof report !== 'object') throw new TypeError('缺少颜值报告');
  const numeric = (key, label) => {
    const value = report[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
      throw new TypeError(`${label}必须是 0–100 之间的数字`);
    }
    return value;
  };
  const score = numeric('score', '当前分数');
  const percentile = numeric('percentile', '当前百分位');
  const afterScore = numeric('afterScore', '变美后分数');
  const afterPercentile = numeric('afterPercentile', '变美后百分位');
  const level = score < 60 ? 0 : score < 75 ? 1 : score < 85 ? 2 : score < 95 ? 3 : 4;
  const afterLevel = afterScore < 60 ? 0 : afterScore < 75 ? 1 : afterScore < 85 ? 2 : afterScore < 95 ? 3 : 4;
  const keywords = cleanList(report.keywords);
  const sourceAreas = Array.isArray(report.areas) ? report.areas : [];
  const sourceDimensions = Array.isArray(report.dimensions) ? report.dimensions : [];
  const palette = Array.isArray(report.palette) ? report.palette.filter(value => /^#[0-9a-f]{6}$/i.test(value?.color || '')).map(value => ({color: value.color, label: cleanText(value.label, '妆容色调')})) : [];
  return {
    score, percentile, afterScore, afterPercentile, level,
    title: cleanText(report.title, THEMES[level].heading),
    copy: cleanText(report.copy, '保留你的五官特点，让妆容、发型与整体风格更合拍。往下看看，这一次可以从哪些细节开始。'),
    scrollHint: cleanText(report.scrollHint), copyVariant: report.copyVariant,
    styleSummary: cleanText(report.styleSummary, '让眉眼、唇色与发型彼此呼应，把最有辨识度的自己留在画面里。'),
    tierName: cleanText(report.tier?.title || report.tier?.name, THEMES[level].name),
    afterTierName: cleanText(report.afterTier?.title || report.afterTier?.name, THEMES[afterLevel].name),
    theme: { ...THEMES[level], accent: /^#[0-9a-f]{6}$/i.test(report.tier?.accent || '') ? report.tier.accent : THEMES[level].accent },
    artwork: { ...ART_DIRECTIONS[level], metal: [...ART_DIRECTIONS[level].metal] },
    keywords: keywords.length ? keywords : ['眉眼更有神', '气色更通透', '风格更协调'],
    palette: (palette.length ? palette : DEFAULT_PALETTE).map(value => ({...value})),
    dimensions: ['五官协调', '眉眼表现', '肌肤质感', '轮廓表现', '整体风格'].map((label, index) => ({
      label: cleanText(sourceDimensions[index]?.label, label),
      score: typeof sourceDimensions[index]?.score === 'number' && Number.isFinite(sourceDimensions[index].score) ? Math.max(0, Math.min(100, sourceDimensions[index].score)) : score,
    })),
    areas: PART_DEFAULTS.map(([id, title, summary, step]) => {
      const area = sourceAreas.find(value => value?.id === id) || {};
      const steps = cleanList(area.steps);
      return { id, title: cleanText(area.title, title), summary: cleanText(area.summary, summary),
        beforeLabel: cleanText(area.beforeLabel, '原来'), afterLabel: cleanText(area.afterLabel, '调整后'),
        steps: steps.length ? steps : [step],
      };
    }),
  };
}

const format = value => Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);

function loadImage(source) {
  return new Promise((resolve, reject) => {
    if (typeof source !== 'string' || !source.trim()) {
      reject(new TypeError('海报缺少前后对比照片'));
      return;
    }
    const img = new Image();
    let settled = false;
    const complete = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      if (error) reject(error);
      else if (!img.naturalWidth || !img.naturalHeight) reject(new Error('海报照片尺寸无效'));
      else resolve(img);
    };
    const timer = setTimeout(() => complete(new Error('照片加载超时，请重试')), 12000);
    img.crossOrigin = 'anonymous';
    img.onload = () => complete();
    img.onerror = () => complete(new Error('照片加载失败，请重试'));
    img.src = source;
    if (img.complete && img.naturalWidth) complete();
  });
}

function roundedPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function line(ctx, x1, y1, x2, y2, color, width = 1) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function text(ctx, content, x, y, size, color = '#F1F0FF', weight = 500, align = 'left') {
  ctx.font = `${Math.round(weight / 100) * 100} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(content, x, y);
}

function textLines(ctx, content, width, size, weight = 500) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  const lines = [];
  for (const paragraph of String(content).split('\n')) {
    let current = '';
    for (const char of Array.from(paragraph)) {
      if (ctx.measureText(current + char).width > width && current) {
        // Keep closing punctuation with its preceding character on the next line.
        // This also avoids an isolated full stop under a short Chinese sentence.
        if (/[，。！？；：、）》」』】”’.,!?;:%]/u.test(char) && Array.from(current).length > 1) {
          const previous = Array.from(current);
          const last = previous.pop();
          lines.push(previous.join(''));
          current = last + char;
        } else {
          lines.push(current);
          current = char;
        }
      } else current += char;
    }
    lines.push(current);
  }
  return lines;
}

function drawLines(ctx, lines, x, y, size, color, lineHeight, weight = 500, align = 'left') {
  lines.forEach((value, index) => text(ctx, value, x, y + index * lineHeight, size, color, weight, align));
}

function glow(ctx, x, y, radius, color, opacity) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}

function sparkle(ctx, x, y, size, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.18, y - size * 0.18, x + size, y);
  ctx.quadraticCurveTo(x + size * 0.18, y + size * 0.18, x, y + size);
  ctx.quadraticCurveTo(x - size * 0.18, y + size * 0.18, x - size, y);
  ctx.quadraticCurveTo(x - size * 0.18, y - size * 0.18, x, y - size);
  ctx.fill();
  ctx.restore();
}

function portrait(ctx, image, x, y, width, height, radius, focalY = 0.36) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  ctx.save();
  roundedPath(ctx, x, y, width, height, radius);
  ctx.clip();
  ctx.drawImage(image, x + (width - dw) / 2, y - (dh - height) * focalY, dw, dh);
  ctx.restore();
}

function gradient(ctx, x1, y1, x2, y2, colors) {
  const result = ctx.createLinearGradient(x1, y1, x2, y2);
  colors.forEach((color, index) => result.addColorStop(index / (colors.length - 1), color));
  return result;
}

function border(ctx, x, y, width, height, radius, color, weight = 1) {
  roundedPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.stroke();
}

function polygon(ctx, points, fill, stroke) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.4; ctx.stroke(); }
}

function ornament(ctx, x, y, artwork, theme) {
  const metal = gradient(ctx, x - 95, y - 58, x + 105, y + 68, artwork.metal);
  if (artwork.crown === 'none') {
    sparkle(ctx, x, y, 13, theme.light);
    return;
  }
  if (artwork.crown === 'star') {
    glow(ctx, x, y, 66, '#786EFF', 0.45);
    sparkle(ctx, x, y, 29, metal);
    sparkle(ctx, x + 38, y + 10, 6, '#84E2FF');
    return;
  }
  if (artwork.crown === 'gem') {
    glow(ctx, x, y, 95, '#A377FF', 0.6);
    polygon(ctx, [[x,y-42],[x+32,y-13],[x+21,y+23],[x-21,y+23],[x-32,y-13]], metal, '#F3DEFF');
    polygon(ctx, [[x,y-42],[x+12,y-13],[x,y+23],[x-12,y-13]], '#F1DFFF77');
    line(ctx, x-32, y-13, x+32, y-13, '#FFFFFF99');
    return;
  }
  glow(ctx, x, y, 132, '#BD8C4C', 0.3);
  glow(ctx, x, y - 15, 86, '#8F71FF', 0.38);
  if (artwork.crown === 'laurel') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        ctx.save();
        ctx.translate(x + side * (28 + Math.sin(i * 0.23) * 40), y + 26 - i * 11);
        ctx.rotate(side * (0.2 + i * 0.13));
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 13, 0, 0, Math.PI * 2);
        ctx.fillStyle = metal;
        ctx.fill();
        ctx.restore();
      }
    }
    sparkle(ctx, x, y - 5, 30, metal);
    sparkle(ctx, x, y - 50, 7, '#FFF2C5');
    return;
  }
  // Each face is a separate metallic facet; this remains sharp at export size.
  const peaks = [[x-81,y-31],[x-42,y-8],[x,y-64],[x+42,y-8],[x+81,y-31],[x+64,y+30],[x-64,y+30]];
  ctx.save();
  ctx.shadowColor = '#F7CF84';
  ctx.shadowBlur = 19;
  polygon(ctx, peaks, metal, '#FFF0C4');
  ctx.restore();
  polygon(ctx, [[x,y-64],[x-20,y+23],[x,y+14],[x+20,y+23]], '#FFFDEBAA');
  polygon(ctx, [[x-81,y-31],[x-64,y+30],[x-43,y+15]], '#9268BA66');
  polygon(ctx, [[x+81,y-31],[x+64,y+30],[x+43,y+15]], '#6C96B66B');
  polygon(ctx, [[x-42,y-8],[x-20,y+23],[x-57,y+23]], '#F1D9AC99');
  polygon(ctx, [[x+42,y-8],[x+20,y+23],[x+57,y+23]], '#FFF8DAB0');
  border(ctx, x-64, y+25, 128, 14, 6, '#FFF0C4', 2);
  line(ctx, x-56, y+31, x+56, y+31, '#C89B61', 5);
  for (const [dx,dy,r] of [[0,-67,8],[-82,-34,6],[82,-34,6]]) sparkle(ctx,x+dx,y+dy,r,'#FFFAE0');
  sparkle(ctx, x+64, y+27, 10, '#FFFFFF');
}

function aurora(ctx, report) {
  const colors = ['#7255F2', '#409BEB', '#B061D8', '#66DADB', '#D79C5E', '#8472F1'];
  for (let i=0;i<report.artwork.aurora;i++) {
    ctx.save();
    ctx.translate(540, 530);
    ctx.rotate(-0.62 + i * 0.25);
    ctx.scale(0.22 + (i % 3) * 0.05, 1);
    glow(ctx, -680 + i * 245, -140 + (i % 2) * 170, 820, colors[i], report.level === 4 ? 0.55 : 0.24);
    ctx.restore();
  }
  if (report.level === 4) {
    // Broad translucent folds form an aurora curtain behind the portrait stage.
    for (let i=0;i<4;i++) {
      const x=100+i*235;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x-90,120);
      ctx.bezierCurveTo(x+220,300,x-210,540,x+80,940);
      ctx.bezierCurveTo(x-55,570,x+300,320,x+35,120);
      ctx.closePath();
      ctx.fillStyle=gradient(ctx,x,120,x+110,940,[colors[i]+'05',colors[i]+'29',colors[i]+'04']);
      ctx.fill();
      ctx.restore();
    }
  }
  if (report.level >= 3) {
    for (let i=0;i<24;i++) {
      const angle = i * Math.PI * 2 / 24;
      const strength = i % 3 === 0 ? 0.18 : 0.08;
      line(ctx, 540+Math.cos(angle)*290, 590+Math.sin(angle)*285, 540+Math.cos(angle)*590, 590+Math.sin(angle)*580, `rgba(226,196,139,${strength})`, i%3===0?1.4:0.8);
    }
  }
}

function ring(ctx, x, y, rx, ry, rotation, colors, strength = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const metal = gradient(ctx, -rx, -ry, rx, ry, colors);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.globalAlpha = strength * 0.22;
  ctx.lineWidth = 19;
  ctx.strokeStyle = metal;
  ctx.shadowColor = colors[1];
  ctx.shadowBlur = 25;
  ctx.stroke();
  ctx.globalAlpha = strength * 0.7;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.globalAlpha = strength;
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = '#F4E6FF';
  ctx.shadowBlur = 4;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = strength * 0.3;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx+9, ry+9, 0, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = metal;
  ctx.stroke();
  ctx.globalAlpha = strength;
  for (const angle of [0.16, 3.27]) {
    const px = Math.cos(angle)*rx, py = Math.sin(angle)*ry;
    glow(ctx, px, py, 32, colors[1], 0.55);
    sparkle(ctx, px, py, 7, '#FFF8E8');
  }
  ctx.restore();
}

function artworkFrame(ctx, report, height) {
  const {level, theme} = report;
  border(ctx, 28, 28, 1024, height - 56, 29, gradient(ctx,0,0,1080,height,['#79C8ED55',theme.accent+'88','#746FF027',theme.accent+'55']), level >= 3 ? 1.8 : 1);
  if (level >= 3) {
    border(ctx, 37, 37, 1006, height - 74, 23, '#D9C39822');
    for (const [x,y,sx,sy] of [[48,48,1,1],[1032,48,-1,1],[48,height-48,1,-1],[1032,height-48,-1,-1]]) {
      line(ctx,x,y,x+sx*70,y,theme.accent,1.5);
      line(ctx,x,y,x,y+sy*70,theme.accent,1.5);
      polygon(ctx,[[x+sx*12,y+sy*3],[x+sx*20,y+sy*12],[x+sx*12,y+sy*21],[x+sx*4,y+sy*12]],theme.accent+'99');
    }
  }
}

function measurePoster(ctx, report) {
  const title = textLines(ctx, report.title, 920, 66, 600);
  const copy = textLines(ctx, report.copy, 912, 29);
  const titleY = 319;
  const scoreY = titleY + (title.length - 1) * 82 + 147;
  const copyY = scoreY + 96;
  const pairY = copyY + copy.length * 44 + 25;
  const pairHeight = 635;
  const metricsY = pairY + pairHeight + 55;
  const dimensionLines = report.dimensions.map(value => textLines(ctx, value.label, 160, 25));
  const dimensionsHeight = 99 + Math.max(...dimensionLines.map(value => value.length)) * 33;
  const areasY = metricsY + dimensionsHeight + 100;
  const areas = report.areas.map(area => {
    const heading = textLines(ctx, area.title, 370, 31, 600);
    const beforeLabel = textLines(ctx, area.beforeLabel, 190, 23);
    const afterLabel = textLines(ctx, area.afterLabel, 190, 23);
    const summary = textLines(ctx, area.summary, 410, 28);
    const steps = area.steps.map(value => textLines(ctx, value, 380, 28));
    const imageY = 70 + (heading.length - 1) * 40;
    const summaryY = imageY + 147 + Math.max(beforeLabel.length, afterLabel.length) * 30 + 30;
    const stepY = summaryY + summary.length * 38 + 17;
    const height = stepY + steps.reduce((sum, lines) => sum + lines.length * 37 + 10, 0) + 12;
    return { heading, beforeLabel, afterLabel, summary, steps, imageY, summaryY, stepY, height };
  });
  const rowHeights = [0, 1, 2].map(row => Math.max(areas[row * 2].height, areas[row * 2 + 1].height));
  const styleY = areasY + rowHeights.reduce((sum, height) => sum + height + 22, 0) + 53;
  const styleLines = textLines(ctx, report.styleSummary, 910, 29);
  const keywordLines = textLines(ctx, report.keywords.join('  ·  '), 910, 29, 600);
  const paletteY = styleY + 45 + keywordLines.length * 40 + 22 + styleLines.length * 41 + 25;
  const paletteRows = Math.ceil(report.palette.length / 5);
  const paletteLabels = report.palette.map(value => textLines(ctx, value.label, 160, 24));
  const paletteRowHeight = 85 + Math.max(...paletteLabels.map(value => value.length)) * 31;
  const height = Math.max(MIN_HEIGHT, Math.ceil(paletteY + paletteRows * paletteRowHeight + 144));
  return { title, copy, titleY, scoreY, copyY, pairY, pairHeight, metricsY, dimensionLines, dimensionsHeight, areasY, areas, rowHeights, styleY, styleLines, keywordLines, paletteY, paletteLabels, paletteRowHeight, height };
}

function sectionHeading(ctx, number, title, y, theme) {
  text(ctx, number, 68, y, 24, theme.accent, 600);
  text(ctx, title, 116, y, 34, '#EEEAFB', 600);
  line(ctx, 650, y - 11, 1012, y - 11, gradient(ctx,650,0,1012,0,[theme.accent+'55','#8174BB00']));
}

function imageRegion(ctx, source, x, y, width, height, radius) {
  if (!source.region) { portrait(ctx, source.image, x, y, width, height, radius, .32); return; }
  const [rx, ry, rw, rh] = source.region;
  const image = source.image;
  const sw = image.naturalWidth * rw, sh = image.naturalHeight * rh;
  const scale = Math.max(width / sw, height / sh);
  const cropW = width / scale, cropH = height / scale;
  ctx.save();
  roundedPath(ctx, x, y, width, height, radius); ctx.clip();
  ctx.drawImage(image, image.naturalWidth * rx + (sw - cropW) / 2, image.naturalHeight * ry + (sh - cropH) * .32, cropW, cropH, x, y, width, height);
  ctx.restore();
}

function drawPoster(ctx, before, after, parts, report, layout) {
  const {theme, level, artwork} = report;
  const {height, pairY, pairHeight} = layout;
  ctx.fillStyle = gradient(ctx,0,0,WIDTH,height,['#10132D','#060918','#0A0D22']);
  ctx.fillRect(0, 0, WIDTH, height);
  glow(ctx, 530, 480, 790, theme.glow, .17 + level * .04);
  glow(ctx, 65, height - 220, 530, '#4348AF', .2);
  aurora(ctx, report);
  for(let i=0;i<artwork.stars;i++) {
    const x = i%2===0 ? 64+(i*67%168) : 848+(i*47%168);
    const y = 150+(i*113%475);
    sparkle(ctx,x,y,i%9===0?9:i%3===0?4:1.4,i%3===0?theme.light:'#A5BDFC',i%9===0?.95:.5);
  }
  const ringColors = level>=3 ? ['#AB84F7','#FFF0C9','#D99854','#95DFF5','#9985F5'] : ['#7770ED',theme.light,'#76CFEF','#8570CF'];
  if(artwork.rings>=1) ring(ctx,540,346,396,137,-.22,ringColors,level===1?.18:.3);
  if(artwork.rings>=2) ring(ctx,540,346,419,146,.2,ringColors,level===4?.42:.32);
  if(artwork.rings>=3) ring(ctx,540,346,443,165,-.02,['#7EB8FD','#FFECB3','#CCA0ED','#64DBEB'],.38);
  // The decorative stage is deliberately behind the score; prose has a quiet reading surface.
  ctx.fillStyle = gradient(ctx,0,350,0,layout.copyY+80,['#090C2100','#090C21CC','#090C21']);
  ctx.fillRect(64,350,952,layout.copyY-270);
  artworkFrame(ctx, report, height);
  sparkle(ctx,82,86,14,theme.accent);
  text(ctx,'鉴X',109,98,35,'#F1F0FF',600);
  text(ctx,'AI 颜值报告',997,96,25,'#C7CBDD',500,'right');
  line(ctx,77,120,1003,120,'#A9A6D322');
  text(ctx,artwork.edition,540,162,20,theme.accent,500,'center');
  ornament(ctx,540,234,artwork,theme);
  drawLines(ctx,layout.title,540,layout.titleY,66,gradient(ctx,140,270,940,360,artwork.metal),82,600,'center');
  const scoreText = format(report.score);
  const metal = gradient(ctx,330,layout.scoreY-130,760,layout.scoreY,artwork.metal);
  ctx.save(); ctx.shadowColor=level>=3?'#CC9B54':'#806EDB'; ctx.shadowBlur=level===4?27:level===3?19:5;
  text(ctx,scoreText,540,layout.scoreY,145,metal,600,'center'); ctx.restore();
  text(ctx,`当前颜值 / 100  ·  ${report.tierName}`,540,layout.scoreY+37,25,'#CED0E2',500,'center');
  text(ctx,`超过 ${format(report.percentile)}% 的人`,540,layout.scoreY+76,29,theme.light,600,'center');
  drawLines(ctx,layout.copy,84,layout.copyY+29,29,'#C5C9DD',44);

  const photoWidth=461, photoHeight=510;
  for (const [index, image, score, percentile, tierName] of [
    [0,before,report.score,report.percentile,report.tierName],
    [1,after,report.afterScore,report.afterPercentile,report.afterTierName],
  ]) {
    const x=68+index*482;
    portrait(ctx,image,x,pairY,photoWidth,photoHeight,22,.2);
    ctx.save(); roundedPath(ctx,x,pairY,photoWidth,photoHeight,22); ctx.clip();
    ctx.fillStyle=gradient(ctx,0,pairY+335,0,pairY+510,['#06091800','#070A1899','#080B21']);
    ctx.fillRect(x,pairY+335,photoWidth,175); ctx.restore();
    border(ctx,x,pairY,photoWidth,photoHeight,22,gradient(ctx,x,pairY,x+photoWidth,pairY+photoHeight,[theme.light+'B3',theme.accent+'33','#978BCE66']),level>=3?2:1);
    roundedPath(ctx,x+18,pairY+18,index?144:132,43,12); ctx.fillStyle='#0A0D21C9'; ctx.fill();
    text(ctx,index?'AFTER':'BEFORE',x+32,pairY+48,24,index?theme.light:'#DBE0F1',600);
    text(ctx,index?'更出彩的你':'现在的你',x+23,pairY+470,30,'#F7F4FF',600);
    text(ctx,format(score),x+23,pairY+574,57,index?theme.light:'#F0E8FC',600);
    ctx.font=`600 57px ${FONT}`;
    text(ctx,'/ 100',x+34+ctx.measureText(format(score)).width,pairY+572,23,'#929DBB');
    text(ctx,tierName,x+photoWidth-20,pairY+570,25,'#BFC6DC',500,'right');
    text(ctx,`超过 ${format(percentile)}% 的人`,x+23,pairY+615,27,'#C7CEE3');
  }
  const difference=Math.round((report.afterScore-report.score)*10)/10;
  const differenceText=`${difference>=0?'+':''}${format(difference)}`;
  const pillY=pairY+photoHeight-32;
  glow(ctx,540,pillY+30,58,theme.glow,.52);
  roundedPath(ctx,470,pillY,140,63,31); ctx.fillStyle=gradient(ctx,470,pillY,610,pillY+63,['#54438C','#302447']); ctx.fill();
  border(ctx,470,pillY,140,63,31,theme.accent+'B0',1.8);
  text(ctx,differenceText,540,pillY+43,35,theme.light,600,'center');

  text(ctx,'五官表现',68,layout.metricsY-3,29,'#EEEAFB',600);
  report.dimensions.forEach((dimension,index)=>{
    const x=68+index*192;
    text(ctx,format(dimension.score),x+78,layout.metricsY+61,41,theme.light,600,'center');
    roundedPath(ctx,x+4,layout.metricsY+78,156,4,2); ctx.fillStyle='#A6A4D328'; ctx.fill();
    if(dimension.score>0) {roundedPath(ctx,x+4,layout.metricsY+78,156*dimension.score/100,4,2); ctx.fillStyle=gradient(ctx,x,0,x+156,0,['#7875E9',theme.accent]); ctx.fill();}
    drawLines(ctx,layout.dimensionLines[index],x+78,layout.metricsY+117,25,'#AFB8D1',33,500,'center');
  });
  sectionHeading(ctx,'01','你的变美思路',layout.areasY-30,theme);
  let rowY=layout.areasY;
  report.areas.forEach((area,index)=>{
    if(index>0 && index%2===0) rowY+=layout.rowHeights[index/2-1]+22;
    const x=68+(index%2)*482;
    const info=layout.areas[index];
    const cardHeight=layout.rowHeights[Math.floor(index/2)];
    roundedPath(ctx,x,rowY,461,cardHeight,23); ctx.fillStyle=gradient(ctx,x,rowY,x+461,rowY+cardHeight,['#1A1B37','#10182A']); ctx.fill();
    border(ctx,x,rowY,461,cardHeight,23,theme.accent+'2F');
    text(ctx,String(index+1).padStart(2,'0'),x+22,rowY+43,20,theme.accent,600);
    drawLines(ctx,info.heading,x+67,rowY+46,31,'#F1EDFC',40,600);
    const imageY=rowY+info.imageY;
    imageRegion(ctx,parts[area.id].before,x+22,imageY,201,145,12);
    imageRegion(ctx,parts[area.id].after,x+238,imageY,201,145,12);
    drawLines(ctx,info.beforeLabel,x+122,imageY+173,23,'#AAB4D0',30,500,'center');
    drawLines(ctx,info.afterLabel,x+338,imageY+173,23,theme.light,30,500,'center');
    drawLines(ctx,info.summary,x+23,rowY+info.summaryY,28,'#E4DEEF',38,600);
    let stepY=rowY+info.stepY;
    info.steps.forEach((step,stepIndex)=>{
      text(ctx,String(stepIndex+1).padStart(2,'0'),x+23,stepY,19,theme.accent,600);
      drawLines(ctx,step,x+60,stepY,28,'#B4BDD4',37);
      stepY+=step.length*37+10;
    });
  });
  sectionHeading(ctx,'02','整体风格与妆容配色',layout.styleY,theme);
  drawLines(ctx,layout.keywordLines,68,layout.styleY+52,29,theme.light,40,600);
  const summaryY=layout.styleY+52+layout.keywordLines.length*40+14;
  drawLines(ctx,layout.styleLines,68,summaryY,29,'#B9C2DA',41);
  report.palette.forEach((swatch,index)=>{
    const col=index%5, row=Math.floor(index/5), x=68+col*192, y=layout.paletteY+row*layout.paletteRowHeight;
    roundedPath(ctx,x+4,y,156,53,14);ctx.fillStyle=swatch.color;ctx.fill();
    border(ctx,x+4,y,156,53,14,'#FFFFFF26');
    drawLines(ctx,layout.paletteLabels[index],x+82,y+89,24,'#BAC3DA',31,500,'center');
  });
  line(ctx,68,height-112,1012,height-112,gradient(ctx,68,0,1012,0,['#8073BE00',theme.accent+'77','#8073BE00']));
  sparkle(ctx,73,height-112,6,theme.accent); sparkle(ctx,1007,height-112,6,theme.accent);
  text(ctx,'把这一页，留给更有自己风格的你。',540,height-66,26,'#B9C1DA',500,'center');
}

/** Render an export-ready, content-sized PNG without initiating a download. */
export async function renderBeautyPoster({report, beforeSrc, afterSrc, parts = {}} = {}) {
  const normalized=normalizeBeautyPosterReport(report);
  if(typeof document==='undefined'||typeof Image==='undefined') throw new Error('请在浏览器中生成海报');
  const [before,after]=await Promise.all([loadImage(beforeSrc),loadImage(afterSrc)]);
  const resolvedParts=Object.fromEntries(await Promise.all(normalized.areas.map(async area=>{
    const value=parts?.[area.id];
    const sources=await Promise.all(['before','after'].map(async (side,index)=>{
      if(value?.[side]) return {image:await loadImage(value[side])};
      return {image:index?after:before,region:PART_REGIONS[area.id]};
    }));
    return [area.id,{before:sources[0],after:sources[1]}];
  })));
  const canvas=document.createElement('canvas');
  canvas.width=WIDTH;
  const context=canvas.getContext('2d');
  if(!context) throw new Error('当前浏览器无法生成海报');
  const layout=measurePoster(context,normalized);
  canvas.height=layout.height;
  drawPoster(context,before,after,resolvedParts,normalized,layout);
  const blob=await new Promise((resolve,reject)=>{
    try {canvas.toBlob(value=>value?resolve(value):reject(new Error('海报导出失败，请重试')),'image/png');}
    catch(error) {reject(new Error('照片暂时无法导出，请重新选择照片',{cause:error}));}
  });
  return {blob,canvas};
}
