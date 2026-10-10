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

const COPY_LIBRARY = freeze({
  natural: [
    { title: '美貌还在加载', copy: '这张先当开场，后面还有戏。自然舒展的五官很适合轻盈的妆容，把眉尾补清楚、发根吹蓬一点，再给唇色添点气色，下一个镜头就有了新看头。', scrollHint: '往下看，解锁你的下一幕' },
    { title: '颜值还有隐藏款', copy: '先别急着划走，你的隐藏款还没亮相。自然的五官线条已经给妆容留好了位置，眉眼加点层次、底妆薄薄匀开，藏在细节里的亮点就能慢慢露出来。', scrollHint: '下滑看看，隐藏款怎么打开' },
    { title: '这局先养成', copy: '这局的看点，在于一点点把细节养起来。顺着原有五官整理眉形，再用轻薄底妆和蓬松发根搭个配，每一步都不复杂，凑在一起却能让画面更有精神。', scrollHint: '往下看，从哪一步开始' },
    { title: '下一幕有看头', copy: '开场照先收好，下一幕值得期待。自然的眉眼还有不少发挥空间，先让眉尾连贯起来，再用柔和唇色衔接气色，脸侧发丝稍微松一松，整套造型就有了思路。', scrollHint: '下滑看看，下一幕怎么出场' },
    { title: '这张脸有后手', copy: '这张脸的后手，藏在还没安排上的小细节里。自然五官配一点眉眼层次、轻盈发根和匀净气色，就能把视觉重点慢慢理清，下面这份计划可以一项项照着来。', scrollHint: '往下看，把小细节安排上' },
  ],
  fresh: [
    { title: '越看越上头', copy: '第一眼挺顺眼，再看一眼还有点挪不开。柔和眉眼和自然协调的五官，让这张脸越看越有味道，给眼尾添点层次、唇色加点气色，这份耐看还能再细细打磨。', scrollHint: '往下看，耐看还能怎么加分' },
    { title: '属于耐看那挂', copy: '你属于那种，多看几眼才发现越来越好看的类型。清秀眉眼和自然唇形配在一起很舒服，底妆保持轻透，再让眉尾和唇色互相呼应，日常镜头也能更有记忆点。', scrollHint: '下滑看看，日常妆怎么加分' },
    { title: '这脸有点东西', copy: '这脸有点东西，细看更能发现。柔和眉形衬着清秀眼睛，自然气色也很适合轻妆，把眼尾和睫毛的层次稍微提起来，再补一抹玫瑰唇色，精致感就能接上。', scrollHint: '往下看，亮点还能怎么突出' },
    { title: '看着就很顺眼', copy: '这张脸的观感，可以用一个词形容：顺眼。五官搭在一起自然协调，发型再轻盈一些、眼尾再清晰一点，就很适合清透的日常妆，下面几处小调整可以直接抄作业。', scrollHint: '下滑看看，几步就能抄作业' },
    { title: '耐看是个技术活', copy: '耐看这件事，你已经掌握了基础操作。柔和的眉眼和自然唇形相互照应，妆容只要把浓淡拿捏好，再用一件细小配饰收个尾，这份清新就能显得更完整。', scrollHint: '往下看，把清新感再调一调' },
  ],
  radiant: [
    { title: '美貌开始营业', copy: '美貌已经营业，镜头可以排队了。鲜明眉眼和清晰唇形让这张脸很有记忆点，把眼妆边缘晕得细一点、发型层次拨得松一点，原本的辨识度就能更顺畅地发挥。', scrollHint: '往下看，营业状态还能升级' },
    { title: '镜头偏爱这张脸', copy: '镜头是不是对这张脸有点偏爱。眉眼的表现力很足，五官也有自己的特点，再把发根与发尾的体积调平衡，让唇色呼应眼妆，拍照时的重点就会更清晰。', scrollHint: '下滑看看，怎么更上镜一点' },
    { title: '有点抢镜天赋', copy: '这张脸有点抢镜天赋，放进画面就容易被记住。鲜明眉眼已经很有存在感，妆容把深浅过渡收拾细致，再给发型留点松弛层次，眼神的表现力还能更突出。', scrollHint: '往下看，让抢镜更有章法' },
    { title: '审美点被拿捏', copy: '审美点被拿捏了，就是这份鲜明又自然的感觉。眉形和眼神各有亮点，唇形也很清晰，接下来让色彩浓度彼此配合、配饰少而精，整体造型就能更加连贯。', scrollHint: '下滑看看，亮点怎么连起来' },
    { title: '路过也得多看眼', copy: '路过也得多看一眼，这张脸确实有记忆点。眉眼鲜明、五官特点自然，发型和妆容只要再统一一下重点，面中光泽轻轻提亮，原本的吸睛感就更容易被看见。', scrollHint: '往下看，把吸睛感再放大' },
  ],
  spotlight: [
    { title: '你啥意思，拍杂志呢', copy: '你啥意思，随手一拍就要交杂志封面作业吗。眉眼和轮廓搭得很漂亮，妆面也已经很整洁，把散落发丝和眼尾边缘再收拾细一点，这份主角感就更有完成度了。', scrollHint: '往下看，封面感还能怎么加' },
    { title: '这张建议置顶', copy: '这张建议置顶，往下翻之前先多看两眼。出众眉眼和协调唇形撑得起画面，妆容只需细调光泽与色彩浓度，再添一处香槟金小配饰，就很适合认真留个纪念。', scrollHint: '下滑看看，置顶照怎么精修' },
    { title: '主角位给你了', copy: '主角位给你了，这张脸接得住。眉眼和轮廓相得益彰，整体造型也很协调，保留现在的优势，轻轻柔化眉峰、理顺发丝，让镜头里的细节再多一点精致就够了。', scrollHint: '往下看，主角妆发怎么细化' },
    { title: '爱豆直拍本人', copy: '这画面，有点爱豆直拍本人那味了。眉眼出众、轮廓协调，已经很能留住视线，再把眼尾晕染和唇缘衔接处理细致，让妆面的柔光统一起来，就更适合近镜头。', scrollHint: '下滑看看，近镜头怎么加分' },
    { title: '这脸自带聚光灯', copy: '聚光灯还没开，这张脸已经把画面撑起来了。出众眉眼和协调五官很有主角感，发丝再轻盈一些、妆面光泽再统一一点，用小配饰点个睛，就能把造型收得更漂亮。', scrollHint: '往下看，高光细节怎么收尾' },
  ],
  icon: [
    { title: '女娲毕设', copy: '想了半天怎么夸，发现这张脸已经替我说完了。眉眼有记忆点，轮廓与整体风格也很合拍，镜头很难装作没看见，接下来把发丝和妆面再精修一点，就很有封面那味了。', scrollHint: '往下看，已经很美还能怎么加分' },
    { title: '美貌超纲了', copy: '这题超纲了，普通夸法有点跟不上。亮眼双眸和鲜明风格已经很完整，通透气色也值得保留，妆发顺着原有特点轻轻打磨，再留一处极简配饰，细节就能稳稳接住镜头。', scrollHint: '下滑看看，精修细节怎么安排' },
    { title: '这颜值不讲道理', copy: '这颜值有点不讲道理，多看两眼都不算浪费。眉形、眼睛和轮廓彼此呼应，个人风格也足够鲜明，接下来留住自然毛流和通透气色，让发丝多一点光泽就很有看头。', scrollHint: '往下看，让每个细节都在线' },
    { title: '建议原地出道', copy: '建议原地出道，第一张宣传照就用这张。五官与整体风格配合得很漂亮，眼部亮点尤其鲜明，妆容保留轻盈感、唇色低饱和点睛，再梳顺发丝，近看也有值得细品的细节。', scrollHint: '下滑看看，宣传照还能怎么精修' },
    { title: '女娲炫技现场', copy: '这有点像女娲炫技现场，细节还挺经得起看。自然眉形和亮眼双眸相互呼应，五官与风格都很协调，轻薄底妆留住通透气色，再精修发丝和配饰，整套造型就很完整。', scrollHint: '往下看，把造型细节补到位' },
  ],
});

const STYLE_PROFILES = freeze({
  natural: { summary: '轻盈发根与自然眉眼，配一抹柔和唇色。', palette: [{ color: '#D8C8B5', label: '柔米白' }, { color: '#796754', label: '灰茶棕' }, { color: '#B67578', label: '玫瑰豆沙' }, { color: '#D4B58C', label: '浅香槟金' }] },
  fresh: { summary: '清透底妆、柔和眉眼，日常也有精致感。', palette: [{ color: '#E7D6C5', label: '米杏色' }, { color: '#9E8069', label: '浅暖棕' }, { color: '#B88388', label: '柔玫瑰' }, { color: '#DCC6A0', label: '浅金色' }] },
  radiant: { summary: '松弛发型与立体眼尾，突出五官辨识度。', palette: [{ color: '#DEC9AD', label: '暖米色' }, { color: '#87624C', label: '眼尾暖棕' }, { color: '#A96573', label: '玫瑰豆沙' }, { color: '#C7A571', label: '细闪金' }] },
  spotlight: { summary: '柔光妆面与精致毛流，香槟金轻轻点睛。', palette: [{ color: '#ECE1D1', label: '柔光米白' }, { color: '#80674F', label: '细腻暖棕' }, { color: '#AC747E', label: '柔雾玫瑰' }, { color: '#D4BA89', label: '香槟金' }] },
  icon: { summary: '保留鲜明五官，以通透妆面和极简配饰收尾。', palette: [{ color: '#EEE4D8', label: '通透米白' }, { color: '#766353', label: '自然茶棕' }, { color: '#AA737D', label: '低饱和玫瑰' }, { color: '#DCCA9D', label: '柔金色' }] },
});

const PRODUCT_PREVIEWS = {
  hair: { shortName: '柔光护发精油', shortReason: '理顺脸侧发丝，给发尾添一点光泽', shortFeatures: ['轻盈油感', '顺滑发尾'] },
  brow: { shortName: '轻羽双头眉笔', shortReason: '补齐眉尾空隙，自然保留毛流', shortFeatures: ['细芯易勾勒', '自然灰茶棕'] },
  eye: { shortName: '暮光四色眼影', shortReason: '柔和暖棕，突出眼尾层次', shortFeatures: ['低饱和', '易晕染'] },
  eyeliner: { shortName: '纤细棕调眼线笔', shortReason: '细细补齐睫毛根部，突出眼尾走向', shortFeatures: ['纤细笔尖', '自然深棕'] },
  lashes: { shortName: '轻羽分段假睫毛', shortReason: '短段点缀眼尾，轻盈放大眼神', shortFeatures: ['短段易搭配', '自然交叉毛流'] },
  'base-dry': { shortName: '柔润光泽粉底液', shortReason: '适合干性肤感，柔润光泽衔接气色', shortFeatures: ['柔润质地', '自然光泽'] },
  'base-normal': { shortName: '轻透匀肤粉底液', shortReason: '适合中性肤感，薄透匀肤保留纹理', shortFeatures: ['轻薄易推开', '自然缎光'] },
  'base-oily': { shortName: '清透柔雾粉底液', shortReason: '适合油性肤感，柔雾妆效平衡光泽', shortFeatures: ['清爽肤感', '柔雾妆效'] },
  blush: { shortName: '微醺柔雾腮红', shortReason: '低饱和玫瑰色，衔接底妆与唇色', shortFeatures: ['细腻柔雾', '少量易叠加'] },
  lip: { shortName: '柔雾绒光唇膏', shortReason: '玫瑰豆沙衔接眉眼，提亮气色', shortFeatures: ['低饱和玫瑰', '柔雾质地'] },
  earrings: { shortName: '月光珍珠耳钉', shortReason: '小巧珍珠照亮耳畔，呼应细金项链', shortFeatures: ['小巧圆珠', '香槟金底托'] },
  style: { shortName: '月光珍珠项链', shortReason: '小圆珍珠衔接耳钉，细金链自然点睛', shortFeatures: ['珍珠吊坠', '链长可调'] },
};

export const PRODUCTS = freeze([
  { id: 'hair', category: 'hair', name: '柔光顺滑护发精油', brand: '映色', shade: '轻盈顺滑 · 50ml', price: 89, originalPrice: 129, reason: '少量精油理顺脸侧和发尾的碎发，让发丝的光泽更均匀，衬托面部轮廓。', features: ['轻盈油感', '顺滑发中与发尾', '按压泵头便于取量'], usage: '按瓶身说明取少量在掌心抹开，先带过发尾，再轻理脸侧发丝，避开发根。', atlasPosition: '50% 100%' },
  { id: 'brow', name: '轻羽双头眉笔', brand: '映色', shade: '02 灰茶棕', price: 69, originalPrice: 99, reason: '灰茶棕与柔和眉形的方向一致，细笔芯便于补齐眉尾空隙，保留原有毛流。', features: ['0.9mm 细笔芯', '自然灰茶棕', '自带螺旋眉刷'], usage: '先沿毛流补空隙，再用眉刷向眉尾轻梳，让边缘自然散开。', atlasPosition: '0% 0%' },
  { id: 'eye', name: '暮光四色综合眼影', brand: '映色', shade: '03 杏雾暖棕', price: 159, originalPrice: 219, reason: '低饱和暖棕可以承接眉眼色调，浅色提亮、深色集中眼尾，突出眼部层次。', features: ['低饱和棕调', '哑光与细闪组合', '可少量叠加晕染'], usage: '米杏色铺满眼窝，浅棕加深眼尾，细闪仅点在眼皮中央。', atlasPosition: '50% 0%' },
  { id: 'eyeliner', name: '纤细棕调液体眼线笔', brand: '映色', shade: '02 柔深棕', price: 79, originalPrice: 109, reason: '深棕细线承接暖棕眼影，少量补齐睫毛根部，在眼尾留下自然延伸感。', features: ['纤细软笔尖', '自然深棕色', '便于分段勾勒'], usage: '贴近睫毛根部分段画细线，眼尾短短延伸，再检查左右走向。', atlasPosition: '0% 0%' },
  { id: 'lashes', name: '轻羽自然分段假睫毛', brand: '映色', shade: '自然交叉款 · 8–10mm', price: 59, originalPrice: 89, reason: '短款分段假睫毛可以按眼型安排疏密，在眼尾增加层次，保留自然眉眼的轻盈感。', features: ['8–10mm 短款组合', '自然交叉毛流', '分段按需搭配'], usage: '按产品说明使用配套睫毛胶，将短段贴于上睫毛根部外侧，避开眼内与黏膜，眼尾少量点缀即可。', atlasPosition: '50% 0%' },
  { id: 'base-dry', skinType: 'dry', skinLabel: '干性', name: '柔润光泽粉底液', brand: '映色', shade: 'N21 自然米白 · 干性适用', price: 229, originalPrice: 299, reason: '柔润质地适合干性肤感的底妆方向，薄薄叠加面中，让妆面保留自然光泽。', features: ['柔润延展质地', '自然光泽妆效', '局部少量叠加'], usage: '基础保湿后少量铺开，从面中向外轻拍，干燥处避免反复摩擦。', atlasPosition: '100% 0%' },
  { id: 'base-normal', skinType: 'normal', skinLabel: '中性', name: '轻透匀肤粉底液', brand: '映色', shade: 'N21 自然米白 · 中性适用', price: 200, originalPrice: 269, reason: '轻透质地承接中性肤感，均匀局部肤色，让自然肌肤纹理和细腻缎光一起保留。', features: ['轻薄易推开', '自然缎光妆效', '可局部叠加'], usage: '取少量点在面中，向外轻拍铺匀，再针对鼻翼等位置局部补妆。', atlasPosition: '100% 0%' },
  { id: 'base-oily', skinType: 'oily', skinLabel: '油性', name: '清透柔雾粉底液', brand: '映色', shade: 'N21 自然米白 · 油性适用', price: 209, originalPrice: 279, reason: '清爽肤感和柔雾妆效适合油性肤感的底妆方向，帮助面中与脸颊的光泽看起来更协调。', features: ['清爽轻盈肤感', '柔雾妆效', '少量分区上妆'], usage: '少量分区铺开，在容易泛光的位置轻压定妆，脸颊保留轻薄底妆。', atlasPosition: '100% 0%' },
  { id: 'blush', name: '微醺柔雾单色腮红', brand: '映色', shade: '05 柔玫瑰', price: 99, originalPrice: 139, reason: '低饱和玫瑰色能够连接眼妆与唇色，用少量柔和色彩为面中增添自然气色。', features: ['细腻柔雾粉质', '低饱和玫瑰调', '少量叠加易掌握'], usage: '蘸取后先抖掉余粉，从颧骨附近轻扫，边缘晕开，最后少量补色。', atlasPosition: '100% 0%' },
  { id: 'lip', name: '柔雾绒光唇膏', brand: '映色', shade: 'R07 玫瑰豆沙', price: 119, originalPrice: 169, reason: '柔和玫瑰豆沙能够衔接眼妆与气色，突出唇形而不抢走眉眼的重点。', features: ['低饱和玫瑰调', '柔雾绒光质地', '薄涂与叠涂两种浓度'], usage: '先薄涂全唇，再在唇中央叠加一层，用指腹轻拍唇缘。', atlasPosition: '0% 100%' },
  { id: 'earrings', name: '月光小珍珠耳钉', brand: '映色', shade: '香槟金 · 米白珍珠', price: 99, originalPrice: 149, reason: '小巧米白珍珠与香槟金底托在耳畔形成柔和亮点，与细金项链呼应，保留五官的视觉重点。', features: ['小巧米白圆珠', '柔和香槟金底托', '简洁单珠造型'], usage: '佩戴后将耳侧头发轻拨开，与项链保持同一金属色，检查耳畔亮点是否清晰。', atlasPosition: '100% 100%' },
  { id: 'style', name: '月光珍珠细链项链', brand: '映色', shade: '香槟金 · 40–45cm', price: 139, originalPrice: 199, reason: '细窄的香槟金色线条呼应珍珠耳钉的金属底托，小圆珍珠吊坠自然收住视线，让配饰搭配更完整。', features: ['小圆珍珠吊坠', '可调节链长', '柔和香槟金色'], usage: '调节链长，让小圆珍珠自然落在锁骨下方，与同色珍珠耳钉形成呼应。', atlasPosition: '100% 100%' },
].map((product, index) => ({
  ...product,
  ...PRODUCT_PREVIEWS[product.id],
  image: 'assets/beauty-products-v22.png',
  atlasSize: '400% 300%',
  atlasPosition: `${[0, 33.333, 66.667, 100][index % 4]}% ${Math.floor(index / 4) * 50}%`,
})));

export const SKIN_TYPES = freeze({ dry: '干性', normal: '中性', oily: '油性' });
const TIER_SKIN_TYPES = freeze({ natural: 'dry', fresh: 'normal', radiant: 'oily', spotlight: 'normal', icon: 'dry' });

export function getFoundationProducts(skinType = 'normal') {
  if (typeof skinType !== 'string' || !Object.hasOwn(SKIN_TYPES, skinType)) throw new RangeError('skinType must be dry, normal, or oily');
  const products = PRODUCTS.filter(product => product.skinType);
  return copyOf([...products.filter(product => product.skinType === skinType), ...products.filter(product => product.skinType !== skinType)]);
}

const AREA_PREVIEWS = {
  hair: { summary: '理顺脸侧发丝，让发尾轻盈有光。', actions: ['精油理顺', '轻整发尾'], beforeLabel: '发丝偏散', afterLabel: '顺滑有光' },
  brows: { summary: '补齐眉尾，让眉眼轮廓更清晰。', actions: ['补齐眉尾', '刷开眉头'], beforeLabel: '眉尾偏浅', afterLabel: '自然毛流' },
  eyes: { summary: '眼影眼线衔接，短簇假睫毛点睛。', actions: ['浅棕细眼线', '假睫毛点缀'], beforeLabel: '层次偏淡', afterLabel: '柔和深邃' },
  skin: { summary: '按肤质选粉底，一抹腮红添气色。', actions: ['薄透匀肤', '轻扫腮红'], beforeLabel: '光泽不均', afterLabel: '轻透匀净' },
  lips: { summary: '一抹玫瑰豆沙，让唇色衔接眉眼。', actions: ['薄涂全唇', '拍开唇缘'], beforeLabel: '唇色偏淡', afterLabel: '玫瑰气色' },
  style: { summary: '珍珠耳钉与细链，让小亮点相互呼应。', actions: ['珍珠耳钉', '细链呼应'], beforeLabel: '耳畔留白', afterLabel: '珍珠点睛' },
};

export const AREAS = freeze([
  { id: 'hair', title: '发型与轮廓', before: '脸侧发丝略散，发尾光泽不够均匀。', after: '脸侧发丝顺滑轻盈，发尾光泽自然柔和。', reason: '用少量护发精油整理脸侧和发尾，让顺滑的发丝衬托原有轮廓。', steps: ['取少量精油在掌心抹开，先带过发中与发尾。', '用掌心余量轻理脸侧碎发，避开发根。', '顺着原有分缝整理，发尾保持轻盈松散。'], productIds: ['hair'] },
  { id: 'brows', title: '眉形', before: '眉尾颜色略浅，眉形轮廓不够连贯。', after: '眉峰自然过渡，眉尾清晰而轻盈。', reason: '补齐眉尾与空隙，让眉形承接眼睛的走向，保留自然毛流。', steps: ['用眉刷顺着毛流梳开眉毛。', '灰茶棕眉笔仅补齐空隙与眉尾。', '轻刷眉头，避免颜色聚集。'], productIds: ['brow'] },
  { id: 'eyes', title: '眼妆', before: '眼部色彩层次较少，眼尾存在感偏弱。', after: '暖棕眼影与细眼线衔接，短簇假睫毛轻盈点睛。', reason: '用眼影铺出层次、细眼线勾勒走向，再以短簇假睫毛增加眼尾神采。', steps: ['米杏色薄铺眼窝，浅棕色从眼尾向内晕染。', '深棕眼线贴近上睫毛根部分段勾勒，眼尾短短延伸。', '按产品说明贴上短簇假睫毛，眼尾少量点缀。'], productIds: ['eye', 'eyeliner', 'lashes'] },
  { id: 'skin', title: '底妆与气色', before: '面部明暗过渡略不均匀，气色显得平淡。', after: '轻薄粉底均匀肤色，柔玫瑰腮红衔接自然气色。', reason: '根据肤感选择合适的粉底质地，用少量腮红呼应唇色，保留自然肌肤纹理。', steps: ['按干性、中性或油性肤感选择粉底，完成基础保湿。', '粉底少量多次，从面中向外轻拍，局部再补妆。', '柔玫瑰腮红轻扫颧骨附近，边缘晕开，少量叠加。'], productIds: ['base-normal', 'base-dry', 'base-oily', 'blush'] },
  { id: 'lips', title: '唇妆', before: '唇色与面部妆容的呼应不够明显。', after: '玫瑰豆沙突出唇形，边缘柔和清晰。', reason: '用低饱和唇色连接眼妆与气色，突出原有唇形的特点。', steps: ['先做好唇部保湿，再轻轻抿去余量。', '玫瑰豆沙薄涂全唇，顺着原有唇缘。', '中央少量叠涂，用指腹拍开边缘。'], productIds: ['lip'] },
  { id: 'style', title: '配饰搭配', before: '耳畔与颈间的小亮点还可以更连贯。', after: '珍珠耳钉与细链小圆珍珠呼应，柔和点亮面部。', reason: '用同色系珍珠与香槟金统一耳畔和颈间的亮点，配饰小巧，让五官保持主角感。', steps: ['小珍珠耳钉点亮耳畔，将耳侧发丝轻拨开。', '佩戴香槟金细链项链，让小圆珍珠自然落在锁骨下方。', '耳钉与项链保持同一金属色，检查两处亮点的平衡。'], productIds: ['earrings', 'style'] },
].map(area => ({ ...area, ...AREA_PREVIEWS[area.id] })));

const PROFILES = freeze({
  natural: {
    strength: '自然舒展的五官，是清新妆容的好基础。',
    focus: '先从眉尾、均匀底妆和发根蓬松感开始。',
    keywords: ['清晰眉尾', '自然气色', '轻盈发根'],
    summaries: ['理顺脸侧发丝，让发尾轻盈有光。', '补齐眉尾，让眉眼轮廓更清晰。', '眼影眼线衔接，短簇假睫毛点睛。', '局部匀肤，轻扫腮红添一点气色。', '一抹玫瑰豆沙，让唇色衔接眉眼。', '珍珠耳钉配细链，让亮点彼此呼应。'],
    beforeLabels: ['发根偏贴', '眉尾偏浅', '层次偏淡', '光泽不均', '唇色偏淡', '重点分散'],
    actions: [['精油理顺', '轻整发尾'], ['补齐眉尾', '刷开眉头'], ['浅棕细眼线', '假睫毛点缀'], ['薄拍面中', '轻扫腮红'], ['薄涂全唇', '拍开唇缘'], ['珍珠耳钉', '细链呼应']],
    before: ['脸侧发丝略散，发尾光泽还不够均匀。', '眉尾颜色偏浅，轮廓有少量空隙。', '眼部层次较少，目光的亮点还未突出。', '面部明暗略不均匀，整体气色偏淡。', '唇色较浅，与眉眼之间缺少呼应。', '耳畔与颈间还有留白，可用小巧配饰串起亮点。'],
    intro: '可以先完成这一处小调整：',
  },
  fresh: {
    strength: '五官自然协调，亲和感是你的鲜明特点。',
    focus: '为眼尾与唇色增加一点层次，让清新感更完整。',
    keywords: ['柔和眉眼', '玫瑰唇色', '清透底妆'],
    summaries: ['精油轻抚发尾，让清新感更顺滑。', '自然延续眉尾，让眉形更连贯。', '浅棕衔接细眼线，轻羽假睫毛点睛。', '轻薄粉底配腮红，留住自然气色。', '柔和唇色，让清新妆容更完整。', '小珍珠呼应细链，为清新感添亮点。'],
    beforeLabels: ['自然发型', '柔和眉形', '清秀眉眼', '自然肤感', '自然唇形', '清新风格'],
    actions: [['精油轻抚', '梳顺发尾'], ['轻补眉尾', '梳顺毛流'], ['浅棕细眼线', '短簇假睫毛'], ['少量轻拍', '腮红晕开'], ['玫瑰薄涂', '柔化唇缘'], ['小巧耳钉', '珍珠细链']],
    before: ['发型自然，脸侧发丝与发尾可以再添一点柔光。', '眉形柔和，眉尾的连贯度还有提升空间。', '眼睛清秀，眼尾色彩与睫毛层次偏轻。', '肌肤呈现自然状态，局部光泽略不一致。', '唇形自然，唇色与眼妆之间可以更协调。', '清新眉眼适合小巧耳钉，颈间可以用细链轻轻呼应。'],
    intro: '在自然协调的基础上，',
  },
  radiant: {
    strength: '眉眼有辨识度，五官特点鲜明而自然。',
    focus: '让发型层次与妆容重点呼应，突出你的辨识度。',
    keywords: ['立体眼尾', '通透气色', '松弛层次'],
    summaries: ['精油整理发丝，突出顺滑轮廓层次。', '淡化眉形边缘，留下鲜明眉眼。', '眼影细线搭短睫，放大眼神表现力。', '柔雾粉底配腮红，让妆面更协调。', '调整唇色浓度，让眉眼更出彩。', '耳钉与细链同色，衬托鲜明五官。'],
    beforeLabels: ['层次初显', '眉形鲜明', '眼神出众', '肤色均匀', '唇形清晰', '五官鲜明'],
    actions: [['精油顺毛', '整理层次'], ['轻刷眉缘', '保留眉峰'], ['晕染细眼线', '短睫点眼尾'], ['薄透叠加', '轻扫腮红'], ['中央叠色', '呼应眼妆'], ['耳钉同色', '细链点睛']],
    before: ['发型已有层次，发尾顺滑度与光泽仍可进一步统一。', '眉形有辨识度，边缘再轻一些会更自然。', '眼睛表现力突出，深浅色过渡可以更细腻。', '肤色总体均匀，面中光泽仍有优化空间。', '唇形清晰，唇色浓度可以与眼妆更好呼应。', '五官特点鲜明，耳钉和项链的金属色可以更协调。'],
    intro: '围绕你已有的辨识度，',
  },
  spotlight: {
    strength: '眉眼与轮廓相得益彰，整体已经很有主角感。',
    focus: '保留五官优势，只细化发丝、妆面与色彩衔接。',
    keywords: ['柔光妆面', '精致毛流', '香槟金点睛'],
    summaries: ['保留协调轮廓，精油轻理碎发。', '保留完整眉形，柔化眉峰衔接。', '保留出众眉眼，细线短睫自然点睛。', '保留整洁妆面，用腮红衔接柔光。', '保留协调唇形，细调色彩浓度。', '保留主角气质，珍珠耳钉细链点睛。'],
    beforeLabels: ['轮廓协调', '完整眉形', '眉眼出众', '妆面整洁', '唇形协调', '主角气质'],
    actions: [['精油理碎发', '发尾轻盈'], ['柔化眉峰', '梳顺眉头'], ['眼线衔接', '短簇点缀'], ['统一柔光', '腮红衔接'], ['少量叠色', '柔化唇缘'], ['珍珠耳钉', '细链留白']],
    before: ['发型与脸型协调，少量散落发丝可以用精油轻轻理顺。', '眉形完整，眉头与眉峰衔接可再柔和一点。', '眉眼表现出众，眼尾晕染边缘可更细腻。', '妆面整洁，局部光泽的统一会更突出质感。', '唇形与五官协调，色彩浓度可随眼妆微调。', '主角气质鲜明，耳畔珍珠与颈间细链可以再多一点呼应。'],
    intro: '保留目前的优势，',
  },
  icon: {
    strength: '五官与气质高度协调，个人风格令人过目难忘。',
    focus: '保持个人特点，精修妆发细节即可。',
    keywords: ['保留辨识度', '极简精修', '自然高光'],
    summaries: ['保留发型轮廓，精油添一点柔光。', '保留自然毛流，让眉形舒展有神。', '保留眼部亮点，细线短睫轻盈衬托。', '保留通透肤感，薄底妆配柔和腮红。', '保留独特唇形，用低饱和色点睛。', '保留鲜明风格，耳钉细链轻巧呼应。'],
    beforeLabels: ['轮廓出众', '自然毛流', '亮眼双眸', '通透气色', '独特唇形', '鲜明风格'],
    actions: [['少量精油', '梳顺光泽'], ['顺梳毛流', '少量补空'], ['细眼线轻描', '短睫少量'], ['薄妆保光', '腮红轻扫'], ['低饱和点睛', '保持唇形'], ['小珍珠耳钉', '细链轻呼应']],
    before: ['发型与轮廓已经协调，精油带出的均匀柔光是可精修的细节。', '眉形与五官高度呼应，保留自然毛流更能突出气质。', '眼部已是鲜明亮点，适合更轻盈的色彩表达。', '肤色与气色表现完整，妆面可保持轻薄。', '唇形与整体风格协调，适合低饱和色彩点睛。', '个人风格鲜明，珍珠耳钉与纤细项链能轻巧完成点睛。'],
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

export function createReport(score = 90, copyVariant = 0) {
  validateScore(score);
  if (!Number.isSafeInteger(copyVariant) || copyVariant < 0) {
    throw new RangeError('copyVariant must be a non-negative safe integer');
  }
  const variant = copyVariant % 5;
  const tier = getTier(score);
  const profile = PROFILES[tier.id];
  const skinType = TIER_SKIN_TYPES[tier.id];
  const wording = COPY_LIBRARY[tier.id][variant];
  const style = STYLE_PROFILES[tier.id];
  const afterScore = Math.max(score, Math.round(interpolate(score, [[0, 18], [52, 70], [68, 80], [80, 88], [90, 95], [97, 99], [100, 100]])));
  const areas = AREAS.map((area, index) => ({
    ...copyOf(area),
    before: profile.before[index],
    reason: profile.intro + area.reason,
    summary: profile.summaries[index],
    actions: [...profile.actions[index]],
    beforeLabel: profile.beforeLabels[index],
    ...(area.id === 'skin' ? { productIds: [...getFoundationProducts(skinType).map(product => product.id), 'blush'] } : {}),
  }));
  return {
    score,
    skinType,
    skinLabel: SKIN_TYPES[skinType],
    percentile: getPercentile(score),
    tier: copyOf(tier),
    afterScore,
    afterPercentile: getPercentile(afterScore),
    afterTier: copyOf(getTier(afterScore)),
    dimensions: createDimensions(score),
    strength: profile.strength,
    focus: profile.focus,
    title: wording.title,
    copy: wording.copy,
    scrollHint: wording.scrollHint,
    copyVariant: variant,
    styleSummary: style.summary,
    palette: copyOf(style.palette),
    keywords: [...profile.keywords],
    areas,
    products: copyOf(PRODUCTS),
  };
}
