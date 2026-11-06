// Fixed cold-start fixtures. Production should replace these with server-owned records.
export const RANKING_STORAGE_KEY = 'jianx-beauty-ranking-v2';
export const RANKING_VERSION = 2;

export function beijingDay(now = Date.now()) {
  return new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0,10);
}
export function freshRankingState(now = Date.now()) {
  return {version:2,day:beijingDay(now),uploaded:false,pending:false,pendingId:null,authorized:false,bestScore:null,bestPhoto:null,bestAt:null};
}
export function currentRankingState(state,now = Date.now()) {
  return state?.version===2&&state.day===beijingDay(now)?state:freshRankingState(now);
}
export function beginMeasurement(state,id,now=Date.now()) {
  return {...currentRankingState(state,now),uploaded:true,pending:true,pendingId:id,authorized:false};
}
export function finishMeasurement(state,{id,score,photo},now=Date.now()) {
  const value=currentRankingState(state,now);
  if(!value.pending||value.pendingId!==id)return value;
  scoreValue(score);
  if(!safeRankingPhoto(photo))throw new TypeError('缺少有效的原照片');
  const better=value.bestScore===null||!value.bestPhoto||score>=value.bestScore;
  const bestAt=value.bestScore===score&&value.bestAt!==null?value.bestAt:better?now:value.bestAt;
  return {...value,pending:false,pendingId:null,authorized:false,bestScore:better?score:value.bestScore,bestPhoto:better?photo:value.bestPhoto,bestAt};
}
export function cancelMeasurement(state,now=Date.now()) {
  const value=currentRankingState(state,now);
  return {...value,pending:false,pendingId:null,uploaded:value.bestScore!==null};
}
export function authorizeRanking(state,allowed,now=Date.now()) {
  const value=currentRankingState(state,now);
  if(allowed&&(!value.uploaded||value.pending||value.bestScore===null||!safeRankingPhoto(value.bestPhoto)))throw new Error('请先完成今日鉴定');
  return {...value,authorized:allowed===true};
}
export function mayRevealRanking(state,now=Date.now()) {
  const value=currentRankingState(state,now);
  return value.uploaded&&!value.pending&&value.authorized&&value.bestScore!==null&&!!safeRankingPhoto(value.bestPhoto);
}
export function safeRankingPhoto(value) {
  return typeof value==='string'&&value.length<2500000&&(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)||/^assets\/beauty-portrait-[a-z]+-v2\.png$/.test(value))?value:null;
}

const dayCache = new Map();
export function dailyRankingSeeds(day = beijingDay()) {
  if(!dayCache.has(day)) {
    const sheets=['natural','fresh','radiant','spotlight','icon'];
    const rows=createRankingSeeds(1000,Number(day.replaceAll('-',''))).map((row,index)=>({...row,day,measuredAt:Date.parse(day+'T00:00:00+08:00')+index,userId:'JX'+String(100000+(index*137+83)%900000),photo:`assets/beauty-portrait-${sheets[index%5]}-v2.png`,sheet:true}));
    dayCache.clear();dayCache.set(day,rows);
  }
  return dayCache.get(day);
}

export function dailyRankingSnapshot(state,userId,now=Date.now()) {
  const value=currentRankingState(state,now),allowed=mayRevealRanking(value,now);
  const seeds=dailyRankingSeeds(value.day);
  const snapshot=rankingSnapshot(allowed?value.bestScore:null,seeds,{measuredAt:value.bestAt});
  if(snapshot.me){Object.assign(snapshot.me,{userId,photo:value.bestPhoto,sheet:false});}
  return {...snapshot,topTen:snapshot.records.slice(0,10),allowed,day:value.day};
}

export function loadDailyRanking(storage,now=Date.now()) {
  try {
    const value=JSON.parse(storage.getItem(RANKING_STORAGE_KEY));
    if(value?.version!==2||value.day!==beijingDay(now)||typeof value.uploaded!=='boolean'||typeof value.authorized!=='boolean')return freshRankingState(now);
    if(value.bestScore!==null)scoreValue(value.bestScore);
    const photo=safeRankingPhoto(value.bestPhoto);
    return {...freshRankingState(now),uploaded:value.uploaded,bestScore:value.bestScore,bestPhoto:photo,bestAt:Number.isFinite(value.bestAt)?value.bestAt:now,authorized:value.authorized&&!!photo};
  }catch{return freshRankingState(now);}
}
export function saveDailyRanking(storage,state,now=Date.now()) {
  const value=currentRankingState(state,now);
  // No uploaded face is persisted before the user opts into public display.
  const saved={...value,pending:false,pendingId:null,bestPhoto:value.authorized?value.bestPhoto:null};
  try { storage.setItem(RANKING_STORAGE_KEY,JSON.stringify(saved));return true;}catch{return false;}
}

function scoreValue(score) {
  if (!Number.isInteger(score) || score < 0 || score > 100) throw new RangeError('得分须为 0—100 的整数');
  return score;
}

export function createRankingSeeds(count = 1000, seed = 20261105) {
  if (!Number.isInteger(count) || count < 1 || count > 10000) throw new RangeError('无效的榜单数量');
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return (state + 0.5) / 4294967296; };
  const prefixes = ['晚风', '晴天', '青柠', '小满', '星河', '山野', '薄荷', '云朵', '春日', '月光', '听雨', '橘子', '海盐', '白桃', '向晚', '知夏', '木槿', '南风', '拾光', '初晴'];
  const suffixes = ['来信', '漫游', '日记', '序曲', '小岛', '微光', '与诗', '散步', '回声', '有约', '不晚', '入画', '随想', '留白', '晴窗', '半夏', '拾趣', '信笺', '慢慢', '予你', '栖迟', '一页', '小憩', '见山', '赴约', '如常', '有光', '未央', '流转', '涟漪', '与歌', '旅途', '深巷', '知意', '片刻', '书签', '游记', '微醺', '天台', '寻常', '花间', '听海', '风铃', '长街', '星点', '如许', '清欢', '不语', '远行', '时分'];
  const tags = ['眉眼出彩', '自然耐看', '轮廓清晰', '气色在线', '清新舒展', '风格鲜明'];
  return Object.freeze(Array.from({length:count}, (_, index) => {
    let score;
    do {
      score = Math.round(74 + 9 * Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random()));
    } while (score < 0 || score > 100);
    // A coprime permutation avoids repeating names in the initial 1,000 records.
    const nameIndex = (index * 137 + 83) % 1000;
    return Object.freeze({id:`seed-${index + 1}`, name:prefixes[nameIndex % 20] + suffixes[Math.floor(nameIndex / 20)], score, tag:tags[index % tags.length], tone:index % 6});
  }));
}

export const RANKING_SEEDS = createRankingSeeds();

export function rankingPercentile(score, records = dailyRankingSeeds()) {
  scoreValue(score);
  if (!records.length) return 0;
  return Math.round(records.filter(row => row.score < score).length / records.length * 1000) / 10;
}

export function rankRecords(records) {
  const ids = new Set();
  const sorted = records.filter(row => {
    if (!row || typeof row.id !== 'string' || ids.has(row.id) || !Number.isInteger(row.score) || row.score < 0 || row.score > 100) return false;
    ids.add(row.id); return true;
  }).map(row => ({...row})).sort((a,b) => b.score - a.score || (a.measuredAt??0)-(b.measuredAt??0) || a.id.localeCompare(b.id));
  return sorted.map((row,index) => ({...row,rank:index + 1}));
}

export function rankingSnapshot(score = null, seeds = RANKING_SEEDS, meta = {}) {
  const self = score === null ? null : {...meta,id:'self', name:'我', score:scoreValue(score), tag:'我的高光', tone:0};
  const records = rankRecords([...seeds.filter(row=>row.id !== 'self'), ...(self ? [self] : [])]);
  const me = records.find(row=>row.id === 'self') || null;
  const bins = Array.from({length:20}, (_,index) => ({min:index * 5, max:index === 19 ? 100 : index * 5 + 4, count:0}));
  for (const row of records) bins[Math.min(19,Math.floor(row.score / 5))].count++;
  return {records, me, total:records.length, percentile:self ? rankingPercentile(score,seeds.filter(row=>row.id !== 'self')) : null, bins};
}
