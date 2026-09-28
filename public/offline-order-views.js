/* Presentation-only views for the local, simulated physical appraisal flow. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const states = ['draft', 'paid', 'shipped', 'received', 'inspecting', 'passed', 'returned'];
  const stateNames = { draft: '待提交', paid: '待发货', shipped: '待平台收货', received: '平台已收货', inspecting: '平台查验中', passed: '查验通过', returned: '已寄回' };
  const positions = { beauty: '0% 0%', bag: '50% 0%', shoes: '100% 0%', clothes: '0% 100%', coin: '50% 100%', accessories: '100% 100%' };
  const knownIcons = new Set(['arrow-right', 'caret-right', 'caret-left', 'check', 'shield-check', 'seal-check', 'cards', 'tag', 'info', 'magnifying-glass', 'handbag', 'x']);
  const icon = name => `<i class="of-icon" style="--of-icon:url('assets/icons/${knownIcons.has(name) ? name : 'info'}.svg')" aria-hidden="true"></i>`;
  const photo = (order, className = '') => `<span class="of-photo ${esc(className)}">${order.photo ? `<img src="${esc(order.photo)}" alt="${esc(order.categoryName || '商品')}外观图">` : `<span class="of-photo-sprite" style="background-position:${positions[order.categoryKey] || positions.bag}" role="img" aria-label="${esc(order.categoryName || '商品')}示例图"></span>`}</span>`;
  const date = value => {
    if (!value) return '';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? esc(value) : `${String(parsed.getMonth() + 1).padStart(2, '0')}.${String(parsed.getDate()).padStart(2, '0')} ${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
  };
  const money = value => esc(Number(value || 0).toFixed(2));
  const level = order => Math.max(0, states.indexOf(order.status));
  const action = (name, label, className = 'of-text-btn', id = '') => `<button type="button" class="${className}" data-of-action="${name}"${id ? ` data-id="${esc(id)}"` : ''}${className === 'of-icon-btn' ? ' aria-label="复制快递单号"' : ''}>${label}</button>`;
  const badge = order => `<span class="of-status of-status-${esc(order.status)}">${esc(stateNames[order.status] || '待提交')}</span>`;
  const fullAddress = address => [address?.region, address?.detail].filter(Boolean).join(' ') || address?.address || '请选择收件地区与详细地址';
  const sampleLabel = order => `<span class="of-demo-label">${order.isSample ? '示例订单' : '演示订单'}</span>`;
  const steps = current => `<ol class="of-steps" aria-label="鉴别流程">${['用户发往平台', '平台查验', '平台寄回用户'].map((text, index) => `<li class="${index <= current ? 'is-reached' : ''} ${index === current ? 'is-current' : ''}"><span aria-hidden="true">${index < current ? icon('check') : index + 1}</span><small>${text}</small></li>`).join('')}</ol>`;
  const summary = (order, withStatus = true) => `<section class="of-summary">${photo(order, 'of-summary-photo')}<div class="of-summary-copy"><div class="of-eyebrow">图灵评鉴 · 实物鉴别</div><h2>${esc(order.categoryName)}${withStatus ? badge(order) : ''}</h2><p>${withStatus ? `订单 ${esc(order.id)}` : '寄送实物，由鉴定师联合查验'}</p></div>${withStatus ? '' : `<span class="of-summary-price"><small>¥</small>${money(order.price)}</span>`}</section>`;
  const centerCard = center => `<section class="of-card of-address-card"><div class="of-card-head"><h2>鉴定中心收货地址</h2>${action('copy-center', `复制${icon('cards')}`)}</div><div class="of-address-person"><strong>${esc(center?.name || '图灵鉴定中心')}</strong><span>${esc(center?.phone || '')}</span><span class="of-mini-label">示例地址</span></div><p class="of-address-detail">${esc(fullAddress(center))}</p></section>`;
  const logistics = (data, direction) => `<dl class="of-logistics"><div><dt>物流公司</dt><dd>${esc(data?.company || '顺丰速运')}</dd></div><div><dt>快递单号</dt><dd><span class="of-tracking">${esc(data?.tracking || '待填写')}</span>${data?.tracking ? action(`copy-${direction}`, icon('cards'), 'of-icon-btn') : ''}</dd></div></dl>`;

  function checkout(order, center) {
    const address = order.address || {};
    return `<div class="of-view of-checkout">
      <div class="of-page-kicker"><span>确认实物鉴别信息</span>${sampleLabel(order)}</div>
      ${summary(order, false)}${steps(0)}
      <section class="of-card of-address-card"><div class="of-card-head"><h2>商品寄回地址</h2>${action('edit-address', `${address.name ? '更换' : '添加'}${icon('caret-right')}`)}</div>
        ${address.name ? `<div class="of-address-person"><strong>${esc(address.name)}</strong><span>${esc(address.phone)}</span></div><p class="of-address-detail">${esc(fullAddress(address))}</p>` : `<button class="of-add-address" type="button" data-of-action="edit-address"><span class="of-add-sign" aria-hidden="true">＋</span><span>添加商品寄回地址<small>鉴别完成后，商品将寄回此地址</small></span>${icon('caret-right')}</button>`}
      </section>
      ${centerCard(center)}
      <section class="of-card of-upload-card"><div class="of-card-head"><h2>商品正面图片</h2><span class="of-required">必填 · 1 张</span></div><p class="of-muted">用于实物核对与鉴别报告，请上传完整清晰的正面图。</p>
        <div class="of-upload-row">${order.photo ? `<button class="of-upload-preview" type="button" data-of-action="preview-photo" aria-label="预览上传的商品图片">${photo(order, 'of-upload-photo')}<span>预览图片</span></button>` : `<button class="of-upload-target" type="button" data-of-action="upload-photo"><span class="of-add-sign" aria-hidden="true">＋</span><span>上传正面图</span></button>`}
          <div class="of-upload-help">${order.photo ? `<strong>已添加商品图片</strong><span>${esc(order.photoName || '商品正面图')}</span>${action('upload-photo', '替换图片')}` : `<strong>让鉴别更准确</strong><span>主体完整 · 光线清晰<br>避免遮挡与过度修图</span>${action('use-sample-photo', '使用示例商品图')}`}</div>
        </div>
      </section>
      <label class="of-agreement"><input type="checkbox" id="ofAgreement" ${order.agreement ? 'checked' : ''}><span>我已阅读并同意 ${action('agreement', '《图灵鉴定实物鉴别协议》', 'of-inline-link')}</span></label>
      <div class="of-footer of-payment-footer"><div class="of-total"><span>实物鉴别费用</span><strong><small>¥</small>${money(order.price)}</strong></div>${action('pay', `模拟支付${icon('arrow-right')}`, 'of-btn of-btn-primary', order.id)}</div>
    </div>`;
  }

  function shipping(order, center) {
    return `<div class="of-view of-shipping">
      <header class="of-state-intro"><span class="of-state-icon">${icon('check')}</span><div><h2>支付完成，等待您寄出</h2><p>已支付 ¥${money(order.price)} · ${esc(order.categoryName)}实物鉴别</p></div>${sampleLabel(order)}</header>
      ${steps(0)}${centerCard(center)}
      <section class="of-card of-shipping-form"><div class="of-card-head"><h2>填写寄件信息</h2><span class="of-mini-label">用户发往平台</span></div><div class="of-carrier"><span>快递公司</span><strong>顺丰速运</strong></div><label class="of-field-label" for="ofTracking">物流单号</label><div class="of-input-wrap"><input id="ofTracking" class="of-input" type="text" inputmode="text" autocomplete="off" maxlength="30" placeholder="请输入顺丰快递单号" value="${esc(order.outbound?.tracking || '')}"></div><p class="of-field-help">请寄出商品后，填写快递面单上的物流单号。</p></section>
      <section class="of-shipping-tips"><div>${icon('info')}<h2>寄件须知</h2></div><ul><li>仅支持顺丰快递，运费由寄件人承担。</li><li>请勿使用到付，以免包裹被拒收。</li><li>发货前核对商品信息，高价值商品建议保价。</li></ul></section>
      <div class="of-footer"><button id="ofShip" type="button" class="of-btn of-btn-primary of-full-btn" data-of-action="ship" data-id="${esc(order.id)}">确认发货${icon('arrow-right')}</button></div>
    </div>`;
  }

  function success(order) {
    return `<div class="of-view of-success">
      <header class="of-success-hero"><div class="of-success-orbit" aria-hidden="true"><span>${icon('check')}</span></div><span class="of-success-eyebrow">寄件信息已提交</span><h2>发货成功</h2><p>请留意物流动态，等待平台签收。</p></header>
      <section class="of-card"><div class="of-card-head"><h2>用户发往平台</h2>${badge(order)}</div>${logistics(order.outbound, 'outbound')}</section>
      <section class="of-progress-guide"><span class="of-guide-icon">${icon('shield-check')}</span><div><h2>随时查看鉴别进度</h2><p>发货成功，订单进度与鉴定结果可于<span>侧边栏-鉴定服务-线下评鉴服务</span>查看</p></div></section>
      <div class="of-footer">${action('view-progress', `去查看${icon('arrow-right')}`, 'of-btn of-btn-primary of-full-btn', order.id)}</div>
    </div>`;
  }

  function orders(list) {
    return `<div class="of-view of-orders"><header class="of-orders-head"><div><span class="of-eyebrow">每一次珍藏，都有迹可循</span><h2>我的线下评鉴</h2></div>${action('browse-categories', `发起鉴别${icon('arrow-right')}`)}</header><div class="of-orders-subhead"><span>全部订单 <b>${list.length}</b></span><span>查看进度与报告</span></div>
      <div class="of-order-list">${list.length ? list.map(order => `<button class="of-order-item" type="button" data-of-action="open-order" data-id="${esc(order.id)}"><span class="of-order-top"><span>${date(order.createdAt)}${order.isSample ? '<em>示例</em>' : ''}</span>${badge(order)}</span><span class="of-order-middle">${photo(order)}<span class="of-order-info"><strong>${esc(order.categoryName)}实物鉴别</strong><small>订单 ${esc(order.id)}</small><span class="of-order-fee">¥${money(order.price)}</span></span></span><span class="of-order-bottom"><span>${level(order) >= 5 ? `证书编号 ${esc(order.certificate || '—')}` : ({draft: '完善信息，发起实物鉴别', paid: '支付完成，请寄出商品', shipped: '商品已寄出，等待平台签收', received: '平台已签收，等待联合查验', inspecting: '鉴定师正在联合查验'}[order.status] || '查看最新订单动态')}</span><strong>${order.status === 'draft' ? '继续填写' : order.status === 'paid' ? '去发货' : '查看进度'}${icon('caret-right')}</strong></span></button>`).join('') : `<div class="of-empty">${icon('handbag')}<h2>还没有评鉴订单</h2><p>从您的一件珍藏开始，发现好物的价值。</p>${action('browse-categories', '选择鉴别品类', 'of-btn of-btn-secondary')}</div>`}</div>
      <p class="of-list-note">当前为演示记录，不涉及真实付款与寄件。</p></div>`;
  }

  function progress(order) {
    const current = level(order);
    const received = current >= 3;
    const inspected = current >= 4;
    const passed = current >= 5;
    const returned = current >= 6;
    const substeps = [{ text: '平台已收货', done: received, time: order.receivedAt, hint: '等待鉴定中心签收商品' }, { text: '平台查验中', done: inspected, time: order.inspectingAt, hint: '由多名鉴定师联合查验' }, { text: '平台查验通过', done: passed, time: order.passedAt, hint: '完成后出具实物鉴别报告' }];
    return `<div class="of-view of-progress">${summary(order)}
      <div class="of-progress-caption"><span>${sampleLabel(order)}</span><span>进度按时间顺序展示</span></div>
      <ol class="of-timeline">
        <li class="of-stage ${current >= 2 ? 'is-complete' : 'is-pending'}"><span class="of-stage-marker">${current >= 2 ? icon('check') : '1'}</span><div class="of-stage-heading"><h2>用户发往平台</h2><time>${date(order.shippedAt)}</time></div><section class="of-stage-card">${current >= 2 ? logistics(order.outbound, 'outbound') : '<p class="of-pending-copy">完成支付后，请寄出商品并填写物流单号。</p>'}</section></li>
        <li class="of-stage ${passed ? 'is-complete' : current >= 2 ? 'is-active' : 'is-pending'}"><span class="of-stage-marker">${passed ? icon('check') : '2'}</span><div class="of-stage-heading"><h2>平台查验</h2><span>${passed ? '查验已完成' : current >= 2 ? stateNames[order.status] : '待开始'}</span></div><section class="of-stage-card of-inspection-card"><ol class="of-inspection-steps">${substeps.map((step, index) => `<li class="${step.done ? 'is-complete' : 'is-pending'}"><i class="of-substep-dot" aria-hidden="true">${step.done ? icon('check') : ''}</i><div><strong>${step.text}</strong>${step.done ? '' : `<p>${step.hint}</p>`}</div><time>${step.done ? date(step.time) : '待完成'}</time></li>`).join('')}</ol>
          ${passed ? `<div class="of-result"><div class="of-result-heading">${icon('seal-check')}<span>外观细节符合正品工艺</span></div><p>经多名鉴定师联合得出结果：<br>外观细节符合正品工艺</p><div class="of-result-product"><button type="button" class="of-result-photo" data-of-action="preview-photo" data-id="${esc(order.id)}" aria-label="查看商品外观图">${photo(order)}</button><dl><div><dt>证书编号</dt><dd>${esc(order.certificate)}</dd></div><div><dt>品类</dt><dd>${esc(order.categoryName)}</dd></div></dl></div>${action('report', `查看报告${icon('arrow-right')}`, 'of-btn of-btn-primary of-report-btn', order.id)}</div>` : ''}
        </section></li>
        <li class="of-stage ${returned ? 'is-complete' : 'is-pending'}"><span class="of-stage-marker">${returned ? icon('check') : '3'}</span><div class="of-stage-heading"><h2>平台寄回用户</h2><time>${returned ? date(order.returnedAt) : '待寄回'}</time></div><section class="of-stage-card">${returned ? logistics(order.inbound, 'inbound') : `<p class="of-pending-copy">${passed ? '鉴别已完成，平台将妥善封装并寄回商品。' : '鉴别完成后，商品将寄回您填写的地址。'}</p>`}</section></li>
      </ol>
      ${!returned ? `<details class="of-demo-controls"><summary>${icon('info')}演示状态<span>仅用于预览</span></summary><p>由您手动推进示例状态，体验收货、查验与寄回流程，不代表真实物流或鉴别结果。</p>${action('demo-advance', `演示下一步：${({shipped: '平台已收货', received: '平台查验中', inspecting: '平台查验通过', passed: '平台寄回用户'})[order.status] || '继续流程'}`, 'of-btn of-btn-secondary', order.id)}</details>` : `<p class="of-list-note">${order.isSample ? '示例报告与物流信息仅用于体验完整流程。' : '当前进度为模拟演示，不代表真实物流与鉴别结果。'}</p>`}
      ${passed ? `<div class="of-footer">${action('report', `查看鉴别报告${icon('arrow-right')}`, 'of-btn of-btn-primary of-full-btn', order.id)}</div>` : ''}
    </div>`;
  }
  window.OfflineOrderViews = { checkout, shipping, success, orders, progress, photo, icon, escape: esc };
})();
