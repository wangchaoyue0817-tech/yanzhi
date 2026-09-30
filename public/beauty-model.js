// Fixed preview fixtures. No photo analysis or population data is requested here.
const freeze = value => {
  Object.values(value).forEach(child => {
    if (child && typeof child === 'object') freeze(child);
  });
  return Object.freeze(value);
};
const copyOf = value => JSON.parse(JSON.stringify(value));

export const TIERS = freeze([
  { id: 'natural', name: '自然本色', min: 0, max: 59, sampleScore: 52, accent: '#9CBAD6', share: '分享我的变美计划', copy: '保留你的自然感，从眉眼与气色开始，发现更多可能。' },
  { id: 'fresh', name: '清新耐看', min: 60, max: 74, sampleScore: 68, accent: '#A8ABFF', share: '分享我的颜值报告', copy: '自然协调，越看越有自己的味道。' },
  { id: 'radiant', name: '出众吸睛', min: 75, max: 84, sampleScore: 80, accent: '#C4A2FF', share: '晒出我的出众颜值', copy: '鲜明的五官特点，让你在人群中更容易被记住。' },
  { id: 'spotlight', name: '高光主角', min: 85, max: 94, sampleScore: 90, accent: '#EDD39B', share: '分享我的高光时刻', copy: '五官与气质相得益彰，这一次，你就是人群焦点。' },
  { id: 'icon', name: '惊艳焦点', min: 95, max: 100, sampleScore: 97, accent: '#F5E5B8', share: '晒出我的惊艳成绩', copy: '你的颜值，值得一次高光登场。' },
]);

export const PRODUCTS = freeze([
  { id: 'brow', name: '轻羽双头眉笔', brand: '映色', shade: '02 灰茶棕', price: 69, reason: '灰茶棕与柔和眉形的方向一致，细笔芯便于补齐眉尾空隙，保留原有毛流。', features: ['0.9mm 细笔芯', '自然灰茶棕', '自带螺旋眉刷'], usage: '先沿毛流补空隙，再用眉刷向眉尾轻梳，让边缘自然散开。', atlasPosition: '0% 0%' },
  { id: 'eye', name: '暮光四色综合眼影', brand: '映色', shade: '03 杏雾暖棕', price: 159, reason: '低饱和暖棕可以承接眉眼色调，浅色提亮、深色集中眼尾，突出眼部层次。', features: ['低饱和棕调', '哑光与细闪组合', '可少量叠加晕染'], usage: '米杏色铺满眼窝，浅棕加深眼尾，细闪仅点在眼皮中央。', atlasPosition: '50% 0%' },
  { id: 'base', name: '水光轻透气垫', brand: '映色', shade: 'N21 自然米白', price: 229, reason: '轻薄底妆有助于突出均匀的面部气色，局部叠加即可保留自然皮肤纹理。', features: ['轻透光泽妆效', '可局部叠加', '柔软水滴粉扑'], usage: '取少量从面中向外轻拍，鼻翼与眼下用粉扑尖角按压。', atlasPosition: '100% 0%' },
  { id: 'lip', name: '柔雾绒光唇膏', brand: '映色', shade: 'R07 玫瑰豆沙', price: 119, reason: '柔和玫瑰豆沙能够衔接眼妆与气色，突出唇形而不抢走眉眼的重点。', features: ['低饱和玫瑰调', '柔雾绒光质地', '薄涂与叠涂两种浓度'], usage: '先薄涂全唇，再在唇中央叠加一层，用指腹轻拍唇缘。', atlasPosition: '0% 100%' },
  { id: 'hair', name: '空气感蓬松喷雾', brand: '映色', shade: '清透无色', price: 89, reason: '轻盈发根与脸侧发丝能增强发型层次，呼应柔和、自然的轮廓方向。', features: ['细雾喷头', '轻盈蓬松感', '局部塑形更方便'], usage: '按瓶身说明少量喷于发根，提起发束吹整，再用手指拨松。', atlasPosition: '50% 100%' },
  { id: 'style', name: '月弧细链项链', brand: '映色', shade: '香槟金 · 40–45cm', price: 139, reason: '细窄的香槟金色线条可以呼应面部暖光，将整体风格衔接得更完整。', features: ['简洁弧形吊坠', '可调节链长', '柔和香槟金色'], usage: '搭配纯色或小领口上装，调整链长，让吊坠自然落在锁骨下方。', atlasPosition: '100% 100%' },
]);

export const AREAS = freeze([
  { id: 'hair', title: '发型与轮廓', before: '发根偏贴，脸侧发丝层次不够清晰。', after: '发根轻盈蓬松，脸侧发丝自然修饰轮廓。', reason: '用发型的体积与层次平衡面部视觉比例，保留自然的脸部线条。', steps: ['提起头顶发根，吹出轻盈的弧度。', '脸侧留出两束自然发丝，轻轻向外卷。', '顺着原有分缝整理，发尾保持松散。'], productIds: ['hair'] },
  { id: 'brows', title: '眉形', before: '眉尾颜色略浅，眉形轮廓不够连贯。', after: '眉峰自然过渡，眉尾清晰而轻盈。', reason: '补齐眉尾与空隙，让眉形承接眼睛的走向，保留自然毛流。', steps: ['用眉刷顺着毛流梳开眉毛。', '灰茶棕眉笔仅补齐空隙与眉尾。', '轻刷眉头，避免颜色聚集。'], productIds: ['brow'] },
  { id: 'eyes', title: '眼妆', before: '眼部色彩层次较少，眼尾存在感偏弱。', after: '暖棕眼尾轻轻延伸，睫毛根部更清晰。', reason: '将深色集中在睫毛根部与眼尾，增强眼睛的层次与神采。', steps: ['米杏色薄铺眼窝作为底色。', '浅棕色从眼尾向内晕染，边缘保持干净。', '少量细闪点在眼皮中央，卷翘睫毛。'], productIds: ['eye'] },
  { id: 'skin', title: '底妆与气色', before: '面部明暗过渡略不均匀，气色显得平淡。', after: '轻薄均匀的底妆，保留真实的肌肤纹理。', reason: '先让肤色与光泽均匀，再用少量修饰突出五官，避免厚重底妆。', steps: ['完成基础保湿，等待表面吸收。', '气垫少量多次，从面中向外轻拍。', '鼻翼与眼下局部补妆，脸颊保留自然光泽。'], productIds: ['base'] },
  { id: 'lips', title: '唇妆', before: '唇色与面部妆容的呼应不够明显。', after: '玫瑰豆沙突出唇形，边缘柔和清晰。', reason: '用低饱和唇色连接眼妆与气色，突出原有唇形的特点。', steps: ['先做好唇部保湿，再轻轻抿去余量。', '玫瑰豆沙薄涂全唇，顺着原有唇缘。', '中央少量叠涂，用指腹拍开边缘。'], productIds: ['lip'] },
  { id: 'style', title: '整体风格', before: '发型、妆容与配饰之间的呼应还有空间。', after: '低饱和妆容与细金配饰相互呼应。', reason: '让发型、眉眼、唇色共享柔和的色调，用一处小配饰完成整体。', steps: ['优先选择米白、浅灰或棕色纯色上装。', '佩戴一件细金配饰，保持面部为视觉焦点。', '在自然光下检查妆容衔接与色彩浓淡。'], productIds: ['style'] },
]);

const PROFILES = freeze({
  natural: {
    strength: '自然舒展的五官，是清新妆容的好基础。',
    focus: '先从眉尾、均匀底妆和发根蓬松感开始。',
    keywords: ['清晰眉尾', '自然气色', '轻盈发根'],
    before: ['发根偏贴，脸侧线条显得较直。', '眉尾颜色偏浅，轮廓有少量空隙。', '眼部层次较少，目光的亮点还未突出。', '面部明暗略不均匀，整体气色偏淡。', '唇色较浅，与眉眼之间缺少呼应。', '妆发细节尚未形成统一的视觉重点。'],
    intro: '可以先完成这一处小调整：',
  },
  fresh: {
    strength: '五官自然协调，亲和感是你的鲜明特点。',
    focus: '为眼尾与唇色增加一点层次，让清新感更完整。',
    keywords: ['柔和眉眼', '玫瑰唇色', '清透底妆'],
    before: ['发型自然，头顶与脸侧的层次还可以更轻盈。', '眉形柔和，眉尾的连贯度还有提升空间。', '眼睛清秀，眼尾色彩与睫毛层次偏轻。', '肌肤呈现自然状态，局部光泽略不一致。', '唇形自然，唇色与眼妆之间可以更协调。', '整体风格清新，少量配饰可以增加完整度。'],
    intro: '在自然协调的基础上，',
  },
  radiant: {
    strength: '眉眼有辨识度，五官特点鲜明而自然。',
    focus: '让发型层次与妆容重点呼应，突出你的辨识度。',
    keywords: ['立体眼尾', '通透气色', '松弛层次'],
    before: ['发型已有层次，发根与发尾的体积仍可更平衡。', '眉形有辨识度，边缘再轻一些会更自然。', '眼睛表现力突出，深浅色过渡可以更细腻。', '肤色总体均匀，面中光泽仍有优化空间。', '唇形清晰，唇色浓度可以与眼妆更好呼应。', '五官特点鲜明，配饰与服装可进一步聚焦风格。'],
    intro: '围绕你已有的辨识度，',
  },
  spotlight: {
    strength: '眉眼与轮廓相得益彰，整体已经很有主角感。',
    focus: '保留五官优势，只细化发丝、妆面与色彩衔接。',
    keywords: ['柔光妆面', '精致毛流', '香槟金点睛'],
    before: ['发型与脸型协调，少量散落发丝可以整理得更轻盈。', '眉形完整，眉头与眉峰衔接可再柔和一点。', '眉眼表现出众，眼尾晕染边缘可更细腻。', '妆面整洁，局部光泽的统一会更突出质感。', '唇形与五官协调，色彩浓度可随眼妆微调。', '整体气质突出，用一件小配饰便能完成造型。'],
    intro: '保留目前的优势，',
  },
  icon: {
    strength: '五官、轮廓与气质高度协调，鲜明的个人风格让人记住你。',
    focus: '保持个人特点，让妆发更轻盈，精修少量细节即可。',
    keywords: ['保留辨识度', '极简精修', '自然高光'],
    before: ['发型与轮廓已经协调，发丝光泽是可精修的细节。', '眉形与五官高度呼应，保留自然毛流更能突出气质。', '眼部已是鲜明亮点，适合更轻盈的色彩表达。', '肤色与气色表现完整，妆面可保持轻薄。', '唇形与整体风格协调，适合低饱和色彩点睛。', '个人风格鲜明，少量装饰即可完成高光造型。'],
    intro: '以保留你的个人特点为前提，',
  },
});

function validateScore(score) {
  if (typeof score !== 'number' || !Number.isFinite(score) || !Number.isInteger(score) || score < 0 || score > 100) {
    throw new RangeError('score must be an integer from 0 to 100');
  }
  return score;
}

function interpolate(score, anchors) {
  for (let index = 1; index < anchors.length; index++) {
    const [rightScore, rightValue] = anchors[index];
    if (score <= rightScore) {
      const [leftScore, leftValue] = anchors[index - 1];
      return leftValue + (rightValue - leftValue) * (score - leftScore) / (rightScore - leftScore);
    }
  }
  return anchors.at(-1)[1];
}

export function getTier(score) {
  validateScore(score);
  return TIERS.find(tier => score >= tier.min && score <= tier.max);
}

export function getPercentile(score) {
  validateScore(score);
  const value = interpolate(score, [[0, 0], [52, 32], [68, 58], [80, 82], [90, 96], [97, 99.6], [100, 99.9]]);
  return Math.round(value * 10) / 10;
}

function createDimensions(score) {
  const labels = ['五官协调', '眉眼表现', '肌肤质感', '轮廓表现', '整体风格'];
  const offsets = [2, 4, -3, -1, -2];
  const values = offsets.map(offset => Math.max(0, Math.min(100, score + offset)));
  let remainder = score * values.length - values.reduce((sum, value) => sum + value, 0);
  while (remainder !== 0) {
    for (let index = 0; index < values.length && remainder !== 0; index++) {
      const direction = Math.sign(remainder);
      if (values[index] + direction < 0 || values[index] + direction > 100) continue;
      values[index] += direction;
      remainder -= direction;
    }
  }
  return labels.map((label, index) => ({ label, score: values[index] }));
}

export function createReport(score = 90) {
  validateScore(score);
  const tier = getTier(score);
  const profile = PROFILES[tier.id];
  const afterScore = Math.max(score, Math.round(interpolate(score, [[0, 18], [52, 70], [68, 80], [80, 88], [90, 95], [97, 99], [100, 100]])));
  const areas = AREAS.map((area, index) => ({
    ...copyOf(area),
    before: profile.before[index],
    reason: profile.intro + area.reason,
  }));
  return {
    score,
    percentile: getPercentile(score),
    tier: copyOf(tier),
    afterScore,
    afterPercentile: getPercentile(afterScore),
    afterTier: copyOf(getTier(afterScore)),
    dimensions: createDimensions(score),
    strength: profile.strength,
    focus: profile.focus,
    copy: tier.copy,
    keywords: [...profile.keywords],
    areas,
    products: copyOf(PRODUCTS),
  };
}
