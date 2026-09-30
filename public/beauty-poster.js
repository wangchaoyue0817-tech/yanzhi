const WIDTH = 1080;
const HEIGHT = 1920;
const FONT = '"PingFang SC", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
const THEMES = [
  { name: '自然本色', accent: '#B2C7EE', light: '#E2ECFF', glow: '#5C78AA', heading: '看见，自然的你' },
  { name: '清新耐看', accent: '#AAB3FF', light: '#E3E5FF', glow: '#6B6FFF', heading: '清新耐看，自有风格' },
  { name: '出众吸睛', accent: '#C3A7FF', light: '#F0E2FF', glow: '#9956E8', heading: '出众，是你的底色' },
  { name: '高光主角', accent: '#E5CCA3', light: '#FFF0D8', glow: '#9270E6', heading: '这一刻，你是主角' },
  { name: '惊艳焦点', accent: '#F5D795', light: '#FFF5DE', glow: '#8A64EE', heading: '你的惊艳，值得登场' },
];

/** Validate the shared report contract before loading any personal images. */
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
  const cleanText = (value, fallback, length = 18) => typeof value === 'string' && value.trim()
    ? Array.from(value.trim()).slice(0, length).join('') : fallback;
  const keywords = Array.isArray(report.keywords) ? report.keywords.filter(value => typeof value === 'string' && value.trim()) : [];
  return {
    score, percentile, afterScore, afterPercentile, level,
    tierName: cleanText(report.tier?.title || report.tier?.name, THEMES[level].name, 10),
    afterTierName: cleanText(report.afterTier?.title || report.afterTier?.name, THEMES[afterLevel].name, 10),
    theme: { ...THEMES[level], accent: /^#[0-9a-f]{6}$/i.test(report.tier?.accent || '') ? report.tier.accent : THEMES[level].accent },
    keywords: ['眉眼更有神', '气色更通透', '风格更协调'].map((fallback, index) => cleanText(keywords[index], fallback, 18)),
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
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(content, x, y);
}

function wrappedText(ctx, content, x, y, width, size, color, lineHeight = 42, maxLines = 2) {
  ctx.font = `500 ${size}px ${FONT}`;
  const chars = Array.from(content);
  const lines = [];
  let current = '';
  for (const char of chars) {
    if (ctx.measureText(current + char).width > width && current) {
      lines.push(current);
      current = char;
    } else current += char;
  }
  if (current) lines.push(current);
  lines.slice(0, maxLines).forEach((value, index) => text(ctx, value, x, y + index * lineHeight, size, color));
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

function badge(ctx, x, y, level, theme) {
  const radius = 53 + level * 3;
  ctx.save();
  glow(ctx, x, y, radius * 1.7, theme.glow, 0.22 + level * 0.035);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  const face = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  face.addColorStop(0, 'rgba(24,24,53,.94)');
  face.addColorStop(1, 'rgba(9,12,26,.94)');
  ctx.fillStyle = face;
  ctx.fill();
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = theme.accent;
  ctx.stroke();
  if (level >= 2) {
    ctx.beginPath();
    ctx.arc(x, y, radius - 7, 0, Math.PI * 2);
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (level >= 3) {
    // An open laurel follows the same thin geometric line language as the app.
    for (let side = -1; side <= 1; side += 2) {
      for (let index = 0; index < 5; index++) {
        const angle = (Math.PI / 3) + index * 0.2;
        const lx = x + side * Math.sin(angle) * (radius - 14);
        const ly = y + Math.cos(angle) * (radius - 14);
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(-side * (angle - 0.4));
        ctx.beginPath();
        ctx.ellipse(0, 0, 3, 7, 0, 0, Math.PI * 2);
        ctx.fillStyle = theme.accent;
        ctx.fill();
        ctx.restore();
      }
    }
  }
  if (level === 0) {
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.strokeStyle = theme.light;
    ctx.stroke();
    sparkle(ctx, x, y, 13, theme.light);
  } else if (level === 1) {
    sparkle(ctx, x, y, 25, theme.light);
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y - 26);
    ctx.lineTo(x + 23, y - 7);
    ctx.lineTo(x + 14, y + 22);
    ctx.lineTo(x - 14, y + 22);
    ctx.lineTo(x - 23, y - 7);
    ctx.closePath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme.light;
    ctx.stroke();
    line(ctx, x, y - 26, x, y + 22, theme.accent);
    line(ctx, x - 23, y - 7, x + 23, y - 7, theme.accent);
    if (level === 4) {
      sparkle(ctx, x + 22, y - 27, 8, theme.light);
      sparkle(ctx, x - 20, y + 24, 4, theme.accent);
    }
  }
  ctx.restore();
}

function drawPoster(ctx, before, after, report) {
  const { theme, level } = report;
  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, '#11112B');
  background.addColorStop(0.48, '#080B17');
  background.addColorStop(1, '#0C1020');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  glow(ctx, 1010, 10, 730, theme.glow, 0.13 + level * 0.025);
  glow(ctx, 50, 1800, 570, '#555BBD', 0.09);

  sparkle(ctx, 76, 65, 13, theme.accent);
  text(ctx, '鉴X', 103, 77, 34, '#F1F0FF', 600);
  text(ctx, 'AI 颜值报告', 1008, 75, 24, '#B9BED2', 500, 'right');
  text(ctx, theme.heading, 64, 147, 48, '#F1F0FF', 550);

  portrait(ctx, before, 64, 184, 952, 866, 34);
  ctx.save();
  roundedPath(ctx, 64, 184, 952, 866, 34);
  ctx.clip();
  const shade = ctx.createLinearGradient(0, 475, 0, 1050);
  shade.addColorStop(0, 'rgba(6,8,20,0)');
  shade.addColorStop(0.28, 'rgba(6,8,20,.04)');
  shade.addColorStop(0.57, 'rgba(6,8,20,.65)');
  shade.addColorStop(1, 'rgba(6,8,20,.99)');
  ctx.fillStyle = shade;
  ctx.fillRect(64, 184, 952, 866);
  const edgeShade = ctx.createLinearGradient(64, 0, 1016, 0);
  edgeShade.addColorStop(0, 'rgba(8,10,25,.18)');
  edgeShade.addColorStop(0.48, 'rgba(8,10,25,0)');
  edgeShade.addColorStop(1, 'rgba(8,10,25,.12)');
  ctx.fillStyle = edgeShade;
  ctx.fillRect(64, 184, 952, 866);

  if (level >= 3) {
    ctx.save();
    ctx.translate(534, 700);
    ctx.rotate(-0.33);
    ctx.strokeStyle = theme.accent;
    ctx.globalAlpha = 0.32;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 655, 430, 0, 0.25, 1.63);
    ctx.stroke();
    ctx.globalAlpha = level === 4 ? 0.35 : 0.17;
    ctx.beginPath();
    ctx.ellipse(0, 0, 675, 445, 0, 0.25, 1.63);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  roundedPath(ctx, 64, 184, 952, 866, 34);
  ctx.strokeStyle = level >= 3 ? 'rgba(236,208,155,.38)' : 'rgba(190,200,238,.22)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  badge(ctx, 925, 272, level, theme);
  if (level >= 2) {
    const points = [[991, 421, 7], [51, 763, 5], [994, 929, 8], [828, 165, 4]];
    points.slice(0, level === 4 ? 4 : level === 3 ? 3 : 1).forEach(([x, y, size]) => sparkle(ctx, x, y, size, theme.light, 0.85));
  }

  text(ctx, '当前颜值', 108, 790, 24, '#D5D7E4');
  const scoreGradient = ctx.createLinearGradient(100, 800, 355, 940);
  scoreGradient.addColorStop(0, '#FFFFFF');
  scoreGradient.addColorStop(1, theme.accent);
  const scoreText = format(report.score);
  const scoreSize = scoreText.length > 3 ? 132 : 166;
  text(ctx, scoreText, 100, 946, scoreSize, scoreGradient, 600);
  ctx.font = `600 ${scoreSize}px ${FONT}`;
  const scoreWidth = ctx.measureText(scoreText).width;
  text(ctx, '/ 100', 110 + scoreWidth, 942, 27, '#BCC2D5', 400);
  text(ctx, report.tierName, 490, 866, 49, theme.light, 600);
  text(ctx, `超过 ${format(report.percentile)}% 的人`, 492, 923, 30, '#E2E3EE');
  line(ctx, 108, 980, 972, 980, 'rgba(213,219,245,.21)');
  const captions = ['保留自然感，发现更多可能', '自然协调，越看越有自己的味道', '鲜明的你，让人一眼记住', '五官与气质相得益彰', '属于你的惊艳，自带光芒'];
  text(ctx, captions[level], 108, 1021, 26, '#BEC3D2');

  text(ctx, '看见更出彩的自己', 64, 1143, 40, '#F1F0FF', 550);
  line(ctx, 655, 1131, 1016, 1131, 'rgba(166,188,227,.2)');

  portrait(ctx, after, 64, 1182, 384, 436, 22, 0.34);
  roundedPath(ctx, 64, 1182, 384, 436, 22);
  ctx.strokeStyle = 'rgba(202,208,237,.24)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.save();
  roundedPath(ctx, 64, 1182, 384, 436, 22);
  ctx.clip();
  const afterShade = ctx.createLinearGradient(0, 1488, 0, 1618);
  afterShade.addColorStop(0, 'rgba(8,10,23,0)');
  afterShade.addColorStop(1, 'rgba(8,10,23,.76)');
  ctx.fillStyle = afterShade;
  ctx.fillRect(64, 1470, 384, 148);
  text(ctx, '变美后的你', 91, 1585, 27, '#FFFFFF', 500);
  ctx.restore();

  text(ctx, '变美后颜值', 498, 1215, 24, '#BEC3D2');
  const afterScoreText = format(report.afterScore);
  const afterSize = afterScoreText.length > 3 ? 102 : 122;
  text(ctx, afterScoreText, 490, 1349, afterSize, theme.light, 550);
  ctx.font = `550 ${afterSize}px ${FONT}`;
  const afterWidth = ctx.measureText(afterScoreText).width;
  text(ctx, '/ 100', 504 + afterWidth, 1344, 25, '#AAAFC7', 400);
  text(ctx, report.afterTierName, 498, 1409, 32, '#E6E4F7');
  text(ctx, `超过 ${format(report.afterPercentile)}% 的人`, 498, 1460, 28, '#BEC3D2');
  line(ctx, 498, 1493, 1016, 1493, 'rgba(166,188,227,.2)');
  text(ctx, '颜值提升', 498, 1553, 25, '#BEC3D2');
  const difference = Math.round((report.afterScore - report.score) * 10) / 10;
  text(ctx, `${difference >= 0 ? '+' : ''}${format(difference)}`, 1016, 1562, 57, theme.accent, 550, 'right');
  text(ctx, '每个细节，都更接近你喜欢的样子', 498, 1605, 22, '#909BB6');

  text(ctx, '这一次的变化', 64, 1691, 24, '#929DB8');
  report.keywords.forEach((keyword, index) => {
    const x = 64 + index * 326;
    text(ctx, String(index + 1).padStart(2, '0'), x, 1740, 22, theme.accent, 500);
    wrappedText(ctx, keyword, x, 1789, 280, 29, '#E2E4F2', 40, 2);
    if (index < 2) line(ctx, x + 301, 1717, x + 301, 1812, 'rgba(166,188,227,.16)');
  });
  line(ctx, 64, 1846, 1016, 1846, 'rgba(166,188,227,.18)');
  text(ctx, '让你的美，更有自己的样子。', 64, 1894, 25, '#B9C0D3');
  sparkle(ctx, 987, 1886, 9, theme.accent);
}

/** Render an export-ready PNG without initiating a download or changing the page. */
export async function renderBeautyPoster({ report, beforeSrc, afterSrc } = {}) {
  const normalized = normalizeBeautyPosterReport(report);
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    throw new Error('请在浏览器中生成海报');
  }
  const [before, after] = await Promise.all([loadImage(beforeSrc), loadImage(afterSrc)]);
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器无法生成海报');
  drawPoster(context, before, after, normalized);
  const blob = await new Promise((resolve, reject) => {
    try {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('海报导出失败，请重试')), 'image/png');
    } catch (error) {
      reject(new Error('照片暂时无法导出，请重新选择照片', { cause: error }));
    }
  });
  return { blob, canvas };
}
