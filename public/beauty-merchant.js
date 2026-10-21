const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const percentagePair = (value, fallback) => /^\d+(?:\.\d+)?% \d+(?:\.\d+)?%$/.test(String(value)) ? value : fallback;
const price = value => Number.isFinite(Number(value)) && Number(value) >= 0
  ? Number(value).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') : '—';

function productImageStyle(product) {
  const candidate = String(product.image || 'assets/beauty-products-v22.png');
  const source = /^(?:assets\/|https?:\/\/)[^\u0000-\u0020]*$/i.test(candidate)
    ? candidate : 'assets/beauty-products-v22.png';
  const image = source.replace(/[\\"'()<>]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase());
  return escapeHTML('background-image:url("' + image + '");background-position:' +
    percentagePair(product.atlasPosition, '50% 50%') + ';background-size:' +
    percentagePair(product.atlasSize, '400% 300%'));
}

/** Render the destination preview; navigation and history belong to the page controller. */
export function merchantHTML(product) {
  const features = Array.isArray(product.features) ? product.features : [];
  return '<header class="beauty-merchant-header">' +
    '<button type="button" class="beauty-merchant-back" data-merchant-back aria-label="返回报告"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14.5 5-7 7 7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    '<div class="beauty-merchant-brand"><strong>商家小程序</strong><small>演示</small></div><span aria-hidden="true"></span></header>' +
    '<article class="beauty-merchant-content" data-merchant-product="' + escapeHTML(product.id) + '">' +
    '<div class="beauty-merchant-image" role="img" aria-label="' + escapeHTML(product.name) + '" style="' + productImageStyle(product) + '"></div>' +
    '<div class="beauty-merchant-summary"><p class="beauty-merchant-label">' + escapeHTML(product.brand) + '</p>' +
    '<h1 id="beautyMerchantTitle" tabindex="-1">' + escapeHTML(product.name) + '</h1>' +
    '<p class="beauty-merchant-spec">' + escapeHTML(product.shade) + '</p>' +
    '<div class="beauty-merchant-prices"><strong aria-label="现价' + price(product.price) + '元"><small>¥</small>' + price(product.price) + '</strong><del aria-label="原价' + price(product.originalPrice) + '元">¥' + price(product.originalPrice) + '</del></div></div>' +
    '<p class="beauty-merchant-notice">购买页面演示，暂未接入真实交易</p>' +
    (features.length ? '<section class="beauty-merchant-details"><h2>商品特点</h2><ul>' + features.map(feature => '<li>' + escapeHTML(feature) + '</li>').join('') + '</ul></section>' : '') +
    (product.usage ? '<section class="beauty-merchant-details"><h2>使用说明</h2><p>' + escapeHTML(product.usage) + '</p></section>' : '') + '</article>';
}
