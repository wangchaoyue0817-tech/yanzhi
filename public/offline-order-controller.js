/* All actions below are local demo actions. No payment, order or logistics API is used. */
(() => {
  'use strict';
  const model = window.OfflineOrderModel;
  const views = window.OfflineOrderViews;
  const app = document.getElementById('app');
  const scroll = document.getElementById('pageScroll');
  if (!model || !views || !app || !scroll) return;
  const esc = views.escape;
  const flow = document.createElement('main');
  flow.id = 'offlineFlow';
  flow.className = 'of-page';
  flow.hidden = true;
  flow.setAttribute('aria-labelledby', 'offlineTitle');
  scroll.querySelector('.welcome-overlay__inner').append(flow);
  const footer = document.createElement('div');
  footer.id = 'offlineFlowFooter';
  footer.hidden = true;
  scroll.after(footer);
  const photoInput = document.createElement('input');
  photoInput.type = 'file'; photoInput.accept = 'image/jpeg,image/png,image/webp,image/gif';
  photoInput.hidden = true; photoInput.id = 'ofPhotoInput'; app.append(photoInput);
  const modal = document.createElement('div');
  modal.className = 'of-modal-backdrop'; modal.hidden = true; app.append(modal);
  const titles = { checkout: '提交实物鉴定', shipping: '发货', success: '发货成功', orders: '线下评鉴服务', progress: '订单进度', report: '线下实物鉴别报告' };
  let currentView = '', currentId = '', modalFocus = null, modalType = '', uploading = false;
  const trackingDrafts = new Map();
  const getOrder = () => model.get(currentId);
  const navigate = (view, id, options) => window.offlineRouter.navigate(view === 'offline' ? 'offline' : `offline-${view}`, id, options);
  function notify(message, field) {
    const notice = document.getElementById('ofNotice');
    notice.textContent = message; notice.hidden = false;
    notice.setAttribute('role', field ? 'alert' : 'status');
    if (field === 'tracking') {
      const input = document.getElementById('ofTracking'); input?.setAttribute('aria-invalid', 'true'); input?.focus();
    } else if (field === 'agreement') document.getElementById('ofAgreement')?.focus();
    else if (field === 'photo') flow.querySelector('[data-of-action="upload-photo"]')?.focus();
    else notice.scrollIntoView({block:'nearest'});
  }
  function handleResult(result) {
    if (!result.ok) { notify(result.error, result.field); return false; }
    if (result.warning) toast(result.warning);
    return true;
  }
  function closeModal(restore = true) {
    modal.hidden = true; modal.replaceChildren(); modalType = '';
    flow.inert = false; footer.inert = false;
    document.getElementById('offlineNav').inert = false;
    if (restore && modalFocus?.isConnected) modalFocus.focus({preventScroll:true});
  }
  function openModal(title, body, kind) {
    modalFocus = document.activeElement; modalType = kind;
    modal.innerHTML = `<section class="of-modal" role="dialog" aria-modal="true" aria-labelledby="ofModalTitle" tabindex="-1"><header><h2 id="ofModalTitle">${esc(title)}</h2><button type="button" data-modal-action="close" aria-label="关闭弹层">×</button></header>${body}</section>`;
    modal.hidden = false; flow.inert = true; footer.inert = true; document.getElementById('offlineNav').inert = true;
    modal.querySelector('input,button,section').focus({preventScroll:true});
  }
  function editAddress() {
    const order = getOrder(); if (!order || order.status !== 'draft') return;
    const a = order.address;
    openModal('商品寄回地址', `<form id="ofAddressForm" novalidate><p class="of-modal-note">用于鉴定完成后寄回商品</p><label>收件人<input name="name" autocomplete="name" maxlength="30" value="${esc(a.name)}" placeholder="请输入姓名"></label><label>手机号码<input name="phone" type="tel" autocomplete="tel" inputmode="numeric" maxlength="11" value="${esc(a.phone)}" placeholder="请输入11位手机号码"></label><label>省 / 市 / 区<input name="region" autocomplete="address-level1" maxlength="80" value="${esc(a.region)}" placeholder="请输入省、市、区"></label><label>详细地址<textarea name="detail" autocomplete="street-address" maxlength="160" rows="2" placeholder="街道、门牌号等">${esc(a.detail)}</textarea></label><p class="of-modal-error" id="ofAddressError" role="alert"></p><button type="button" class="of-modal-link" data-modal-action="demo-address">使用示例地址</button><button type="submit" class="of-modal-primary">保存地址</button></form>`, 'address');
  }
  async function copy(text, success) {
    try { await navigator.clipboard.writeText(text); toast(success); }
    catch {
      openModal('复制信息', `<p class="of-modal-note">可选中下方内容进行复制</p><textarea class="of-copy-text" readonly rows="6">${esc(text)}</textarea>`, 'copy');
      modal.querySelector('textarea').select();
    }
  }
  function addressString(a) { return `${a.name} ${a.phone}\n${a.region} ${a.detail}`; }
  function agreement() {
    openModal('实物鉴别协议（演示）', `<div class="of-agreement-body"><p>本页面用于演示图灵评鉴的下单、发货、进度与报告流程。模拟支付不会产生真实扣费，示例收货地址不可用于实际寄件。</p><p>商品正面图用于展示商品信息与鉴别报告。请提供完整、清晰的外观图片，并核对商品寄回地址。</p><p>本演示展示的寄件规则为：使用顺丰速运，运费由寄件人承担，不支持到付；高价值商品建议保价。</p><p>查验结论、评分、证书编号与物流状态均为模拟内容，不构成真实鉴定报告。</p><p>填写的信息与图片仅在当前浏览器会话中保存，未上传至服务端。</p></div><button type="button" class="of-modal-primary" data-modal-action="close">我知道了</button>`, 'agreement');
  }
  function previewPhoto(order) {
    openModal('商品外观图', `<div class="of-photo-preview">${views.photo(order, 'of-full-photo')}</div>`, 'photo');
  }
  async function readPhoto(file) {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error('请选择 JPG、PNG、WebP 或 GIF 图片');
    if (file.size > 12 * 1024 * 1024) throw new Error('图片大小请控制在 12 MB 以内');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('无法读取这张图片，请重新选择');
      const ratio = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const context = canvas.getContext('2d'); context.fillStyle = '#151627'; context.fillRect(0,0,canvas.width,canvas.height); context.drawImage(image,0,0,canvas.width,canvas.height);
      return canvas.toDataURL('image/jpeg', .84);
    } finally { URL.revokeObjectURL(url); }
  }
  async function samplePhoto(order) {
    const image = new Image(); image.src = 'assets/offline/catalog-sprite.png'; await image.decode();
    const index = model.categories.findIndex(item => item.key === order.categoryKey);
    const w = image.naturalWidth / 3, h = image.naturalHeight / 2;
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
    canvas.getContext('2d').drawImage(image, index % 3 * w, Math.floor(index / 3) * h, w, h, 0, 0, 512, 512);
    return canvas.toDataURL('image/jpeg', .88);
  }
  async function updatePhoto(factory, name) {
    if (uploading) return; const order = getOrder(); if (!order || order.status !== 'draft') return;
    const id = order.id; uploading = true;
    const upload = flow.querySelector('[data-of-action="upload-photo"]'); upload?.setAttribute('aria-busy','true');
    try {
      const photo = await factory(order);
      const result = model.updateDraft(id, {photo, photoName:name});
      if (currentId === id && currentView === 'checkout') { if (handleResult(result)) { render('checkout', id, true); toast('商品正面图已添加'); } }
    } catch(error) { if (currentId === id) notify(error.message || '图片读取失败，请重新选择', 'photo'); }
    finally { uploading = false; upload?.removeAttribute('aria-busy'); }
  }
  function pay() {
    if (uploading) { toast('图片正在处理，请稍候'); return; }
    const result = model.pay(currentId);
    if (!handleResult(result)) return;
    navigate('shipping', currentId, {replace:true});
    toast('模拟支付成功，未产生实际扣费');
  }
  function ship() {
    const input = document.getElementById('ofTracking');
    const result = model.ship(currentId, input?.value || '');
    if (!handleResult(result)) return;
    trackingDrafts.delete(currentId);
    navigate('success', currentId, {replace:true});
  }
  async function shareReport(order) {
    if (!order || !['passed','returned'].includes(order.status)) return;
    const text = `图灵评鉴 · 线下实物鉴别报告（模拟）\n结论：符合正品工艺\n品类：${order.categoryName}\n鉴定编号：${order.certificate}\n整体符合度：${order.score}/100（模拟评分）\n本内容为界面演示，不构成真实鉴定结论。`;
    openModal('分享鉴别报告', `<p class="of-modal-note">复制报告摘要，分享给需要的人。</p><textarea class="of-share-text" readonly rows="8" aria-label="模拟报告分享内容">${esc(text)}</textarea><button type="button" class="of-modal-primary" data-modal-action="copy-report">复制报告摘要</button>`, 'share');
  }
  function openOrder(id) {
    const order = model.get(id); if (!order) { navigate('orders'); return; }
    navigate(order.status === 'draft' ? 'checkout' : order.status === 'paid' ? 'shipping' : 'progress', id);
  }
  function render(view, id, preserveScroll = false) {
    const oldScroll = scroll.scrollTop;
    const demoExpanded = preserveScroll && !!flow.querySelector('.of-demo-controls[open]');
    closeModal(false); currentView = view; currentId = id || '';
    app.classList.add('is-order-flow'); flow.hidden = false;
    document.getElementById('offlineTitle').textContent = titles[view] || '线下评鉴服务';
    document.getElementById('offlineNav').querySelector('.offline-back').setAttribute('aria-label', '返回上一页');
    let body;
    const order = getOrder();
    if (view === 'orders') body = views.orders(model.list());
    else if (!order) body = `<section class="of-empty"><span>${views.icon('info')}</span><h2>没有找到这笔订单</h2><p>演示订单保存在当前浏览器会话中，可返回列表查看示例订单。</p><button class="of-modal-primary" data-of-action="orders">查看线下评鉴服务</button></section>`;
    else if (view === 'checkout') body = views.checkout(order, model.centerAddress);
    else if (view === 'shipping') body = views.shipping(order, model.centerAddress);
    else if (view === 'success') body = views.success(order);
    else if (view === 'progress') body = views.progress(order);
    else if (view === 'report') body = window.renderOfflineReport(order);
    else body = views.orders(model.list());
    flow.innerHTML = `<p id="ofNotice" class="of-notice" role="status" hidden></p>${body}`;
    if (demoExpanded) flow.querySelector('.of-demo-controls')?.setAttribute('open','');
    footer.replaceChildren();
    const actions = flow.querySelector('.of-footer, .or-footer');
    if (actions) footer.append(actions);
    footer.hidden = !actions;
    const agreementBox = document.getElementById('ofAgreement');
    if (agreementBox && order) agreementBox.checked = order.agreement;
    const tracking = document.getElementById('ofTracking');
    if (tracking && trackingDrafts.has(currentId)) tracking.value = trackingDrafts.get(currentId);
    document.title = `${titles[view] || '图灵评鉴'} · 图灵鉴X`;
    scroll.scrollTop = preserveScroll ? oldScroll : 0;
    if (!preserveScroll) document.getElementById('offlineTitle').focus({preventScroll:true});
  }
  function hide() {
    closeModal(false); currentView = ''; currentId = '';
    flow.hidden = true; footer.hidden = true; footer.replaceChildren(); app.classList.remove('is-order-flow');
    document.getElementById('offlineTitle').textContent = '图灵评鉴';
    document.getElementById('offlineNav').querySelector('.offline-back').setAttribute('aria-label','返回专家鉴定');
  }
  async function action(event) {
    const button = event.target.closest('[data-of-action]'); if (!button) return;
    const name = button.dataset.ofAction, id = button.dataset.id || currentId, order = model.get(id);
    switch(name) {
      case 'edit-address': editAddress(); break;
      case 'copy-center': await copy(addressString(model.centerAddress),'示例中心地址已复制'); break;
      case 'upload-photo': photoInput.click(); break;
      case 'use-sample-photo': await updatePhoto(samplePhoto,'示例商品正面图'); break;
      case 'preview-photo': if (order) previewPhoto(order); break;
      case 'pay': pay(); break;
      case 'ship': ship(); break;
      case 'view-progress': navigate('progress',id); break;
      case 'report': if(order && ['passed','returned'].includes(order.status)) navigate('report',id); break;
      case 'open-order': openOrder(id); break;
      case 'orders': navigate('orders'); break;
      case 'browse-categories': navigate('offline'); break;
      case 'demo-advance': {
        const result = model.advance(id);
        if(handleResult(result)) { render('progress',id,true); toast('演示状态已更新'); }
        break;
      }
      case 'copy-outbound': if(order) await copy(order.outbound.tracking,'寄出单号已复制'); break;
      case 'copy-inbound': if(order) await copy(order.inbound.tracking,'寄回单号已复制'); break;
      case 'agreement': agreement(); break;
      case 'share-report': await shareReport(order); break;
    }
  }
  flow.addEventListener('click',action); footer.addEventListener('click',action);
  const onChange = event => {
    if(event.target.id === 'ofAgreement') handleResult(model.updateDraft(currentId,{agreement:event.target.checked}));
  };
  flow.addEventListener('change',onChange); footer.addEventListener('change',onChange);
  flow.addEventListener('input',event=>{if(event.target.id === 'ofTracking'){trackingDrafts.set(currentId,event.target.value);event.target.removeAttribute('aria-invalid');}});
  photoInput.addEventListener('change',async()=>{const file=photoInput.files[0];photoInput.value='';if(file)await updatePhoto(()=>readPhoto(file),file.name);});
  modal.addEventListener('click',event=>{
    if(event.target === modal || event.target.closest('[data-modal-action="close"]')) { closeModal(); return; }
    if(event.target.closest('[data-modal-action="copy-report"]')) {
      const content = modal.querySelector('.of-share-text');
      content?.select();
      if(content) void copy(content.value,'模拟报告摘要已复制，可粘贴分享');
      return;
    }
    if(event.target.closest('[data-modal-action="demo-address"]')) {
      const form = modal.querySelector('form');
      const sample = {name:'示例用户',phone:'13800000000',region:'演示省 演示市 演示区',detail:'演示路 88 号，仅用于界面体验'};
      Object.entries(sample).forEach(([key,value])=>form.elements[key].value=value);
      modal.querySelector('#ofAddressError').textContent='已填入示例地址，请保存';
    }
  });
  modal.addEventListener('submit',event=>{
    event.preventDefault(); const form = event.target;
    const address = Object.fromEntries(['name','phone','region','detail'].map(key=>[key,form.elements[key].value.trim()]));
    const invalid = !address.name ? ['name','请输入收件人姓名'] : !/^1[3-9]\d{9}$/.test(address.phone) ? ['phone','请输入有效的11位手机号码'] : address.region.length<2 ? ['region','请填写省、市、区'] : address.detail.length<5 ? ['detail','详细地址至少填写5个字'] : null;
    if(invalid){modal.querySelector('#ofAddressError').textContent=invalid[1];form.elements[invalid[0]].focus();return;}
    const result = model.updateDraft(currentId,{address});
    if(!result.ok){modal.querySelector('#ofAddressError').textContent=result.error;return;}
    closeModal(false); render('checkout',currentId,true);
    flow.querySelector('[data-of-action="edit-address"]')?.focus({preventScroll:true});
    if(result.warning)toast(result.warning);
  });
  document.addEventListener('keydown',event=>{
    if(!currentView)return;
    if(!modal.hidden){
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeModal();return;}
      if(event.key==='Tab'){
        const focusable=[...modal.querySelectorAll('button,input,textarea,[tabindex="0"]')].filter(e=>!e.disabled);
        const first=focusable[0],last=focusable.at(-1);
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
      }
    }else if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();window.offlineRouter.back();}
  },true);
  window.offlineOrders = {
    get isOpen(){return !!currentView;},
    start(categoryKey){const order=model.createDraft(categoryKey);if(order)navigate('checkout',order.id);},
    show(view,id){render(view.replace(/^offline-/,''),id);},
    hide, back(){window.offlineRouter.back();},
    openList(){document.getElementById('menuPanel').hidden=true;navigate('orders');},
    resolve(view,id){
      if(view==='offline' || view==='offline-orders')return {view,id:''};
      const order=model.get(id);if(!order)return {view:'offline-orders',id:''};
      if(view==='offline-checkout' && order.status!=='draft')return {view:order.status==='paid'?'offline-shipping':'offline-progress',id};
      if(view==='offline-shipping' && order.status!=='paid')return {view:order.status==='draft'?'offline-checkout':'offline-progress',id};
      if(['offline-success','offline-progress','offline-report'].includes(view) && ['draft','paid'].includes(order.status))return {view:order.status==='draft'?'offline-checkout':'offline-shipping',id};
      if(view==='offline-report' && !['passed','returned'].includes(order.status))return {view:'offline-progress',id};
      return {view,id};
    }
  };
  document.getElementById('menuOfflineOrders')?.addEventListener('click',()=>window.offlineOrders.openList());
})();
