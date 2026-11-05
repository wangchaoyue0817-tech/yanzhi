// Fixed cold-start fixtures. Production should replace these with server-owned records.
export const RANKING_STORAGE_KEY = 'jianx-beauty-ranking-v1';
export const RANKING_VERSION = 1;

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

export function rankingPercentile(score, records = RANKING_SEEDS) {
  scoreValue(score);
  if (!records.length) return 0;
  return Math.round(records.filter(row => row.score < score).length / records.length * 1000) / 10;
}

export function rankRecords(records) {
  const ids = new Set();
  const sorted = records.filter(row => {
    if (!row || typeof row.id !== 'string' || ids.has(row.id) || !Number.isInteger(row.score) || row.score < 0 || row.score > 100) return false;
    ids.add(row.id); return true;
  }).map(row => ({...row})).sort((a,b) => b.score - a.score || a.id.localeCompare(b.id));
  let rank = 0;
  return sorted.map((row,index) => {
    if (index === 0 || row.score !== sorted[index - 1].score) rank = index + 1;
    return {...row,rank};
  });
}

export function rankingSnapshot(score = null, seeds = RANKING_SEEDS) {
  const self = score === null ? null : {id:'self', name:'我', score:scoreValue(score), tag:'我的高光', tone:0};
  const records = rankRecords([...seeds.filter(row=>row.id !== 'self'), ...(self ? [self] : [])]);
  const me = records.find(row=>row.id === 'self') || null;
  const bins = Array.from({length:20}, (_,index) => ({min:index * 5, max:index === 19 ? 100 : index * 5 + 4, count:0}));
  for (const row of records) bins[Math.min(19,Math.floor(row.score / 5))].count++;
  return {records, me, total:records.length, percentile:self ? rankingPercentile(score,seeds.filter(row=>row.id !== 'self')) : null, bins};
}

export function loadRankingScore(storage) {
  try {
    const value = JSON.parse(storage.getItem(RANKING_STORAGE_KEY));
    return value?.version === RANKING_VERSION ? scoreValue(value.score) : null;
  } catch { return null; }
}

export function saveRankingScore(storage, score) {
  scoreValue(score);
  try { storage.setItem(RANKING_STORAGE_KEY,JSON.stringify({version:RANKING_VERSION,score})); return true; }
  catch { return false; }
}
