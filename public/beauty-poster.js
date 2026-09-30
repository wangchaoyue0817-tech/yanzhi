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

// The score controls the artwork, independently of caller-supplied badge copy.
const ART_DIRECTIONS = [
  { edition: 'NATURAL BEAUTY', rings: 0, aurora: 0, stars: 6, crown: 'none', metal: ['#FFFFFF', '#D8E6FC', '#9CAECF'] },
  { edition: 'FRESH BEAUTY', rings: 1, aurora: 2, stars: 14, crown: 'star', metal: ['#FFFFFF', '#D9D8FF', '#A5BFFF'] },
  { edition: 'RADIANT BEAUTY', rings: 2, aurora: 3, stars: 24, crown: 'gem', metal: ['#FFFFFF', '#EDC5FF', '#BCA4FF', '#77DBF4'] },
  { edition: 'THE SPOTLIGHT', rings: 2, aurora: 4, stars: 38, crown: 'laurel', metal: ['#FFFDF1', '#F7DBA4', '#C99452', '#FFF2C4'] },
  { edition: 'THE BEAUTY ICON', rings: 3, aurora: 6, stars: 64, crown: 'crown', metal: ['#FFFFFF', '#FBDA96', '#E8ABDA', '#95E5FC', '#BBA7FF', '#FFF2C9'] },
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
    artwork: { ...ART_DIRECTIONS[level], metal: [...ART_DIRECTIONS[level].metal] },
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
  ctx.font = `${Math.round(weight / 100) * 100} ${size}px ${FONT}`;
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

function artworkFrame(ctx, report) {
  const {level, theme} = report;
  border(ctx, 28, 28, 1024, 1864, 29, gradient(ctx,0,0,1080,1920,['#79C8ED55',theme.accent+'88','#746FF027',theme.accent+'55']), level >= 3 ? 1.8 : 1);
  if (level >= 3) {
    border(ctx, 37, 37, 1006, 1846, 23, '#D9C39822');
    for (const [x,y,sx,sy] of [[48,48,1,1],[1032,48,-1,1],[48,1872,1,-1],[1032,1872,-1,-1]]) {
      line(ctx,x,y,x+sx*70,y,theme.accent,1.5);
      line(ctx,x,y,x,y+sy*70,theme.accent,1.5);
      polygon(ctx,[[x+sx*12,y+sy*3],[x+sx*20,y+sy*12],[x+sx*12,y+sy*21],[x+sx*4,y+sy*12]],theme.accent+'99');
    }
  }
}

function drawPoster(ctx, before, after, report) {
  const { theme, level, artwork } = report;
  ctx.fillStyle = gradient(ctx,0,0,WIDTH,HEIGHT,['#10132D','#060918','#0A0D22']);
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  glow(ctx, 530, 525, 790, theme.glow, 0.17 + level * 0.04);
  glow(ctx, 65, 1800, 530, '#4348AF', 0.2);
  aurora(ctx, report);

  // Fine radial etching makes the stage read as a physical engraved object.
  if (level >= 2) {
    ctx.save();
    ctx.strokeStyle = '#A69BDD18';
    ctx.lineWidth = 1;
    for (let i=0;i<4;i++) {
      ctx.beginPath();
      ctx.ellipse(540,585,370+i*18,420+i*18,0,0,Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();
  }
  for(let i=0;i<artwork.stars;i++) {
    const left = i%2===0;
    const x = left ? 64+(i*67%168) : 848+(i*47%168);
    const y = 169+(i*113%953);
    const size = i%9===0 ? 9 : i%3===0 ? 4 : 1.4;
    sparkle(ctx,x,y,size,i%3===0?theme.light:'#A5BDFC',i%9===0?0.95:0.5);
  }
  artworkFrame(ctx, report);
  sparkle(ctx, 82, 86, 14, theme.accent);
  text(ctx, '鉴X', 109, 98, 35, '#F1F0FF', 650);
  text(ctx, 'AI 颜值报告', 997, 96, 25, '#C7CBDD', 500, 'right');
  line(ctx, 77, 120, 1003, 120, '#A9A6D322');
  text(ctx, artwork.edition, 540, 167, 20, theme.accent, 500, 'center');
  text(ctx, theme.heading, 540, 203, 40, '#F7F5FF', 550, 'center');

  const ringColors = level>=3 ? ['#AB84F7','#FFF0C9','#D99854','#95DFF5','#9985F5'] : ['#7770ED',theme.light,'#76CFEF','#8570CF'];
  if(artwork.rings>=1) ring(ctx,540,605,396,324,-0.48,ringColors,level===1?0.32:0.6);
  if(artwork.rings>=2) ring(ctx,540,605,419,295,0.49,ringColors,level===4?0.9:0.62);
  if(artwork.rings>=3) ring(ctx,540,605,443,248,-0.05,['#7EB8FD','#FFECB3','#CCA0ED','#64DBEB'],0.94);

  // Rings and the crown stay outside the face, which has a separate clean frame.
  const photo = {x:280,y:284,width:520,height:622,radius:level>=3?62:36};
  glow(ctx,540,548,325,theme.glow,0.31);
  portrait(ctx,before,photo.x,photo.y,photo.width,photo.height,photo.radius,0.2);
  ctx.save();
  roundedPath(ctx,photo.x,photo.y,photo.width,photo.height,photo.radius);
  ctx.clip();
  const shade=gradient(ctx,0,633,0,910,['#06091800','#070A1810','#080B21DF','#080B21']);
  ctx.fillStyle=shade;
  ctx.fillRect(photo.x,633,photo.width,280);
  ctx.restore();
  border(ctx,photo.x-7,photo.y-7,photo.width+14,photo.height+14,photo.radius+7,gradient(ctx,280,284,800,906,[theme.light+'CB',theme.accent+'28','#8DB9F955',theme.light+'22']),level>=3?2.4:1.5);
  if(level>=3) border(ctx,photo.x-17,photo.y-17,photo.width+34,photo.height+34,photo.radius+17,theme.accent+'33',1);
  ornament(ctx,540,280,artwork,theme);
  if(level>=3) {
    sparkle(ctx,805,365,17,'#FFEDD0');
    sparkle(ctx,283,706,12,'#C5E7FF');
    line(ctx,101,1050,101,400,theme.accent+'40');
    line(ctx,979,1050,979,400,theme.accent+'40');
  }

  text(ctx, '当前颜值', 540, 879, 24, '#C4C7DC',500,'center');
  const scoreText=format(report.score);
  const scoreSize=scoreText.length>3?148:scoreText.length===3?166:190;
  const metal=gradient(ctx,355,901,730,1044,artwork.metal);
  ctx.save();
  ctx.shadowColor=level>=3?'#CC9B54':'#806EDB';
  ctx.shadowBlur=level===4?35:level===3?22:8;
  text(ctx,scoreText,540,1045,scoreSize,metal,650,'center');
  ctx.restore();
  text(ctx,'/ 100',540,1086,22,'#979EBB',450,'center');
  const titleSize=report.tierName.length>6?42:52;
  text(ctx,report.tierName,540,1150,titleSize,theme.light,650,'center');
  line(ctx,182,1135,332,1135,gradient(ctx,182,0,332,0,['#8C81C100',theme.accent+'88']),1);
  line(ctx,748,1135,898,1135,gradient(ctx,748,0,898,0,[theme.accent+'88','#8C81C100']),1);
  const rank=`超过 ${format(report.percentile)}% 的人`;
  roundedPath(ctx,307,1171,466,57,28);
  ctx.fillStyle=gradient(ctx,307,1171,773,1228,['#7863D922',level>=3?'#CBA45820':'#438DB01C']);
  ctx.fill();
  border(ctx,307,1171,466,57,28,theme.accent+'50');
  text(ctx,rank,540,1209,28,theme.light,550,'center');

  // Independent after portrait and score keep both versions legible at phone size.
  roundedPath(ctx,64,1282,952,342,25);
  ctx.fillStyle=gradient(ctx,64,1282,1016,1624,['#20213D','#111831','#0C132B']);
  ctx.fill();
  border(ctx,64,1282,952,342,25,gradient(ctx,64,1282,1016,1624,['#8ABEEB72','#9680DC50',theme.accent+'66']),1.4);
  text(ctx,'看见更出彩的自己',64,1265,26,'#C8CCE2',550);
  portrait(ctx,after,79,1297,268,312,15,0.22);
  ctx.save();
  roundedPath(ctx,79,1297,268,312,15);
  ctx.clip();
  ctx.fillStyle=gradient(ctx,0,1510,0,1609,['#090B2100','#090B21B3']);
  ctx.fillRect(79,1510,268,99);
  text(ctx,'变美后的你',213,1582,22,'#FFFFFF',500,'center');
  ctx.restore();
  text(ctx,'变美后颜值',382,1328,22,'#A6ADC8');
  const afterText=format(report.afterScore);
  const afterSize=afterText.length>3?90:104;
  text(ctx,afterText,378,1446,afterSize,gradient(ctx,380,1356,615,1446,artwork.metal),600);
  ctx.font=`600 ${afterSize}px ${FONT}`;
  text(ctx,'/ 100',390+ctx.measureText(afterText).width,1443,22,'#969FBC');
  text(ctx,report.afterTierName,382,1502,29,'#EAE6F7',600);
  text(ctx,`超过 ${format(report.afterPercentile)}% 的人`,382,1550,25,'#B9C2DC');
  const difference=Math.round((report.afterScore-report.score)*10)/10;
  const differenceText=`${difference>=0?'+':''}${format(difference)}`;
  roundedPath(ctx,797,1310,190,88,15);
  ctx.fillStyle=level>=3?'#CEA86414':'#8E79EE17';
  ctx.fill();
  border(ctx,797,1310,190,88,15,theme.accent+'40');
  text(ctx,'颜值提升',892,1338,19,'#AFB5CA',500,'center');
  text(ctx,differenceText,892,1380,36,theme.light,600,'center');
  text(ctx,'每个细节，都更有自己的样子',382,1592,20,'#8693B1');

  text(ctx,'这一次的变化',64,1683,24,'#ADB5CF');
  report.keywords.forEach((keyword,index)=>{
    const x=64+index*322;
    roundedPath(ctx,x,1703,308,102,17);
    ctx.fillStyle=gradient(ctx,x,1703,x+308,1805,['#8F77EF13','#35447E0D']);
    ctx.fill();
    border(ctx,x,1703,308,102,17,theme.accent+'2B');
    text(ctx,String(index+1).padStart(2,'0'),x+17,1734,17,theme.accent,600);
    wrappedText(ctx,keyword,x+17,1768,274,25,'#DDE1F1',29,2);
  });
  line(ctx,64,1831,1016,1831,gradient(ctx,64,0,1016,0,['#8073BE00',theme.accent+'66','#8073BE00']));
  text(ctx,'让你的美，更有自己的样子。',540,1867,24,'#B4BDD5',500,'center');
  sparkle(ctx,73,1831,6,theme.accent);
  sparkle(ctx,1007,1831,6,theme.accent);
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
