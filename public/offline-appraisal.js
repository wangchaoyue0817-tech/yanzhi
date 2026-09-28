/* 图灵评鉴: service presentation only; no orders, payments or logistics are submitted. */
(() => {
  'use strict';
  const app = document.getElementById('app');
  const pageScroll = document.getElementById('pageScroll');
  if (!app || !pageScroll) return;

  // Official Phosphor regular icons, https://github.com/phosphor-icons/core.
  // MIT license retained in assets/icons/LICENSE; paths are unmodified.
  const serviceIcons = {"currency-cny": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 256 256\" fill=\"currentColor\"><path d=\"M56,56a8,8,0,0,1,8-8H192a8,8,0,0,1,0,16H64A8,8,0,0,1,56,56ZM216,160a8,8,0,0,0-8,8v16H176a16,16,0,0,1-16-16V120h48a8,8,0,0,0,0-16H48a8,8,0,0,0,0,16H96v8a56.06,56.06,0,0,1-56,56,8,8,0,0,0,0,16,72.08,72.08,0,0,0,72-72v-8h32v48a32,32,0,0,0,32,32h40a8,8,0,0,0,8-8V168A8,8,0,0,0,216,160Z\"/></svg>", "package": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 256 256\" fill=\"currentColor\"><path d=\"M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.34,44-29.77,16.3-80.35-44ZM128,120,47.66,76l33.9-18.56,80.34,44ZM40,90l80,43.78v85.79L40,175.82Zm176,85.78h0l-80,43.79V133.82l32-17.51V152a8,8,0,0,0,16,0V107.55L216,90v85.77Z\"/></svg>", "truck": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 256 256\" fill=\"currentColor\"><path d=\"M255.42,117l-14-35A15.93,15.93,0,0,0,226.58,72H192V64a8,8,0,0,0-8-8H32A16,16,0,0,0,16,72V184a16,16,0,0,0,16,16H49a32,32,0,0,0,62,0h50a32,32,0,0,0,62,0h17a16,16,0,0,0,16-16V120A7.94,7.94,0,0,0,255.42,117ZM192,88h34.58l9.6,24H192ZM32,72H176v64H32ZM80,208a16,16,0,1,1,16-16A16,16,0,0,1,80,208Zm81-24H111a32,32,0,0,0-62,0H32V152H176v12.31A32.11,32.11,0,0,0,161,184Zm31,24a16,16,0,1,1,16-16A16,16,0,0,1,192,208Zm48-24H223a32.06,32.06,0,0,0-31-24V128h48Z\"/></svg>", "warehouse": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 256 256\" fill=\"currentColor\"><path d=\"M240,184h-8V57.9l9.67-2.08a8,8,0,1,0-3.35-15.64l-224,48A8,8,0,0,0,16,104a8.16,8.16,0,0,0,1.69-.18L24,102.47V184H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM40,99,216,61.33V184H192V128a8,8,0,0,0-8-8H72a8,8,0,0,0-8,8v56H40Zm136,53H80V136h96ZM80,168h96v16H80Z\"/></svg>"};
  const glyph = (file, className = '') => serviceIcons[file]
    ? `<span class="offline-icon offline-inline-icon ${className}" aria-hidden="true">${serviceIcons[file]}</span>`
    : `<span class="offline-icon ${className}" style="--offline-icon:url('assets/icons/${file}.svg')" aria-hidden="true"></span>`;
  const benefits = [
    { name: '全网低价', icon: 'tag' },
    { name: '三重查验', icon: 'magnifying-glass' },
    { name: '鉴错包赔', icon: 'shield-check' },
    { name: '商家代发', icon: 'package' },
    { name: '买家代收', icon: 'truck' },
    { name: '品质保证', icon: 'seal-check' }
  ];
  const steps = [
    { name: '寄出宝贝', icon: 'truck' },
    { name: '仓库收货', icon: 'warehouse' },
    { name: '多重鉴定', icon: 'magnifying-glass' },
    { name: '封装上链', icon: 'package' },
    { name: '寄回/回收', icon: 'shield-check' }
  ];
  const categories = [
    { key: 'beauty', name: '美妆', price: '0.01', icon: 'tabler-perfume' },
    { key: 'bag', name: '包袋', price: '99.9', icon: 'handbag' },
    { key: 'shoes', name: '鞋靴', price: '59.9', icon: 'sneaker' },
    { key: 'clothes', name: '服装', price: '59.9', icon: 't-shirt' },
    { key: 'coin', name: '钱币', price: '29.9', icon: 'coin' },
    { key: 'accessories', name: '配饰', price: '29.9', icon: 'sunglasses' }
  ];

  const nav = document.createElement('div');
  nav.id = 'offlineNav';
  nav.className = 'offline-nav';
  nav.hidden = true;
  nav.innerHTML = `<button class="offline-back" type="button" aria-label="返回专家鉴定">${glyph('caret-left')}</button><h1 id="offlineTitle" tabindex="-1">图灵评鉴</h1><span class="offline-nav-spacer" aria-hidden="true"></span>`;
  app.querySelector('.navbar').append(nav);

  const page = document.createElement('main');
  page.id = 'offlineHome';
  page.className = 'offline-home';
  page.hidden = true;
  page.setAttribute('aria-labelledby', 'offlineTitle');
  page.innerHTML = `
    <header class="offline-intro">
      <span class="offline-eyebrow"><i aria-hidden="true"></i>线下实物鉴别</span>
      <h2>寄件至鉴定中心</h2>
      <p>出具线下实物鉴别报告</p>
    </header>
    <section class="offline-benefits" aria-label="六项服务保障">
      <ul>${benefits.map(item => `<li>${glyph(item.icon)}<span>${item.name}</span></li>`).join('')}</ul>
    </section>
    <section class="offline-process" aria-labelledby="offlineProcessTitle">
      <div class="offline-section-head"><h2 id="offlineProcessTitle">鉴别流程</h2><span>每一步，认真对待</span></div>
      <ol>${steps.map(item => `<li>${glyph(item.icon)}<span>${item.name}</span></li>`).join('')}</ol>
      <p class="offline-process-note">如需代发货或代收货，可指定收货地址。</p>
    </section>
    <section class="offline-categories" aria-labelledby="offlineCategoryTitle">
      <div class="offline-section-head"><h2 id="offlineCategoryTitle">选择鉴别品类</h2></div>
      <div class="offline-category-list">${categories.map((item, index) => `
        <button class="offline-category" type="button" data-offline-category="${item.key}" aria-label="选择${item.name}，线下评鉴价格 ${item.price} 元">
          <span class="offline-product-art">${glyph(item.icon, 'offline-product-fallback')}<span class="offline-product-photo" style="background-position:${index % 3 * 50}% ${Math.floor(index / 3) * 100}%" aria-hidden="true"></span></span>
          <span class="offline-category-name">${item.name}</span>
          <span class="offline-category-price"><small>¥</small>${item.price}</span>
          ${glyph('caret-right', 'offline-category-arrow')}
        </button>`).join('')}
      </div>
    </section>`;
  // Reuse the expert hero's complete orbital system so both services share the same visual language.
  const expertSpectrum = document.querySelector('#expertHome .skin-spectrum');
  if (expertSpectrum) {
    const spectrum = expertSpectrum.cloneNode(true);
    spectrum.classList.add('offline-spectrum');
    spectrum.querySelector('.spectrum-core .b').textContent = '实物鉴别';
    page.querySelector('.offline-intro').append(spectrum);
  }
  pageScroll.querySelector('.welcome-overlay__inner').append(page);

  const productSprite = new Image();
  productSprite.addEventListener('load', () => {
    page.querySelectorAll('.offline-product-art').forEach(art => art.classList.add('has-image'));
  });
  productSprite.src = 'assets/offline/catalog-sprite.png';

  let isOpen = false;
  let previousScroll = 0;
  let returnFocus = null;
  function open() {
    if (isOpen) return;
    window.expertPicker?.close(false);
    previousScroll = pageScroll.scrollTop;
    returnFocus = document.getElementById('offlineEntry') || document.activeElement;
    isOpen = true;
    page.hidden = false;
    nav.hidden = false;
    app.classList.add('is-offline');
    pageScroll.scrollTop = 0;
    document.getElementById('offlineTitle').focus({ preventScroll: true });
    app.dispatchEvent(new CustomEvent('offline:open', { bubbles: true }));
  }
  function close(restoreFocus = true) {
    if (!isOpen) return;
    isOpen = false;
    page.hidden = true;
    nav.hidden = true;
    app.classList.remove('is-offline');
    if (restoreFocus) {
      pageScroll.scrollTop = previousScroll;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    }
    app.dispatchEvent(new CustomEvent('offline:close', { bubbles: true, detail: { restoreFocus } }));
  }
  nav.querySelector('.offline-back').addEventListener('click', () => close());
  document.addEventListener('click', event => {
    if (event.target.closest('#offlineEntry')) open();
  });
  document.addEventListener('keydown', event => {
    if (isOpen && event.key === 'Escape') { event.preventDefault(); close(); }
  });
  page.addEventListener('click', event => {
    const card = event.target.closest('[data-offline-category]');
    if (!card) return;
    const item = categories.find(category => category.key === card.dataset.offlineCategory);
    if (typeof window.toast === 'function') window.toast(`已选择${item.name} · ¥${item.price}。当前为界面演示，寄件与下单流程尚未开放。`);
  });
  window.offlineAppraisal = { open, close, get isOpen() { return isOpen; } };
})();
