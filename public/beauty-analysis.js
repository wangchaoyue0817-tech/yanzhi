'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const page = $('beautyPage');
  const app = $('app');
  const demoPhoto = 'assets/beauty-demo-portrait.png';
  let photoUrl = demoPhoto;
  let uploadedUrl = '';
  let returnFocus = null;
  let scanTimer = 0;
  let scanFinishTimer = 0;
  let toastTimer = 0;

  function setInert(element, value) {
    if (!element) return;
    element.inert = value;
    if (value) element.setAttribute('aria-hidden', 'true');
    else element.removeAttribute('aria-hidden');
  }

  function showToast(message) {
    const toast = $('beautyToast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
  }

  function resetDemo() {
    clearInterval(scanTimer);
    clearTimeout(scanFinishTimer);
    scanTimer = 0;
    scanFinishTimer = 0;
    if (uploadedUrl) URL.revokeObjectURL(uploadedUrl);
    uploadedUrl = '';
    photoUrl = demoPhoto;
    $('beautyEntry').hidden = false;
    $('beautyScanning').hidden = true;
    $('beautyReport').hidden = true;
    $('beautyPhotoInput').value = '';
    $('beautyPosterStatus').hidden = true;
    $('beautyPosterStatus').textContent = '';
    $('beautyProgressBar').style.width = '0%';
    $('beautyProgressText').textContent = '0%';
    $('beautyScanStep').textContent = '识别五官轮廓与比例';
  }

  function open() {
    returnFocus = document.activeElement;
    resetDemo();
    $('menuPanel').hidden = true;
    $('conversationPanel').hidden = true;
    $('skillPopup').classList.remove('show');
    $('sheetMask').classList.remove('show');
    page.hidden = false;
    app.classList.add('is-beauty');
    setInert($('pageScroll'), true);
    setInert($('inputArea'), true);
    setInert(document.querySelector('.navbar-content'), true);
    $('beautyScroll').scrollTop = 0;
    $('beautyBack').focus();
  }

  function close() {
    clearInterval(scanTimer);
    clearTimeout(scanFinishTimer);
    page.hidden = true;
    app.classList.remove('is-beauty');
    setInert($('pageScroll'), false);
    setInert($('inputArea'), false);
    setInert(document.querySelector('.navbar-content'), false);
    resetDemo();
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }

  function showReport() {
    $('beautyEntry').hidden = true;
    $('beautyScanning').hidden = true;
    $('beautyReport').hidden = false;
    $('beautyBefore').src = photoUrl;
    $('beautyAfter').src = photoUrl;
    $('beautyScroll').scrollTop = 0;
    $('beautyPosterStatus').hidden = true;
    $('beautyPosterStatus').textContent = '';
  }

  function startExperience(nextPhoto = demoPhoto, isUpload = false) {
    clearInterval(scanTimer);
    clearTimeout(scanFinishTimer);
    if (uploadedUrl) URL.revokeObjectURL(uploadedUrl);
    uploadedUrl = isUpload ? nextPhoto : '';
    photoUrl = nextPhoto;
    $('beautyEntry').hidden = true;
    $('beautyScanning').hidden = false;
    $('beautyReport').hidden = true;
    $('beautyScanImage').src = photoUrl;
    $('beautyProgressBar').style.width = '0%';
    $('beautyProgressText').textContent = '0%';
    $('beautyScroll').scrollTop = 0;
    let progress = 0;
    scanTimer = window.setInterval(() => {
      progress = Math.min(100, progress + 7);
      $('beautyProgressBar').style.width = `${progress}%`;
      $('beautyProgressText').textContent = `${progress}%`;
      $('beautyScanStep').textContent = progress < 38 ? '整理五官比例演示项' : progress < 72 ? '生成按部位拆解建议' : '匹配演示单品灵感';
      if (progress === 100) {
        clearInterval(scanTimer);
        scanTimer = 0;
        scanFinishTimer = window.setTimeout(showReport, 320);
      }
    }, 70);
  }

  function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const lines = [];
    let line = '';
    for (const char of text) {
      const candidate = line + char;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = char;
      } else line = candidate;
    }
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((item, index) => context.fillText(item, x, y + index * lineHeight, maxWidth));
  }

  function drawImageCrop(context, image, x, y, width, height, filter = 'none') {
    context.save();
    context.beginPath();
    context.rect(x, y, width, height);
    context.clip();
    const scale = Math.max(width / image.width, height / image.height);
    const drawnWidth = image.width * scale;
    const drawnHeight = image.height * scale;
    context.filter = filter;
    context.drawImage(image, x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight);
    context.restore();
  }

  async function downloadPoster() {
    const status = $('beautyPosterStatus');
    const button = $('beautyPoster');
    button.disabled = true;
    button.textContent = '正在生成海报…';
    try {
      const image = await new Promise(resolve => {
        const result = new Image();
        result.onload = () => resolve(result);
        result.onerror = () => resolve(null);
        result.src = photoUrl;
      });
      if (!image) throw new Error('image unavailable');
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('canvas unavailable');
      const background = context.createLinearGradient(0, 0, 0, canvas.height);
      background.addColorStop(0, '#11132e');
      background.addColorStop(.48, '#080a17');
      background.addColorStop(1, '#100d23');
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      const glow = context.createRadialGradient(540, 0, 5, 540, 0, 620);
      glow.addColorStop(0, '#845ee74a');
      glow.addColorStop(1, '#845ee700');
      context.fillStyle = glow;
      context.fillRect(0, 0, canvas.width, 660);
      const write = (text, x, y, font, color = '#f1f0ff', align = 'left') => {
        context.font = font;
        context.fillStyle = color;
        context.textAlign = align;
        context.textBaseline = 'alphabetic';
        context.fillText(text, x, y, 980);
      };
      write('TURING BEAUTY LAB · 演示版', 540, 88, '600 22px sans-serif', '#aaa9c3', 'center');
      write('我的鉴颜值变美报告', 540, 160, '700 48px sans-serif', '#f7f4ff', 'center');
      write('五官拆解 · 找到更适合自己的日常表达', 540, 207, '400 22px sans-serif', '#aaa9c3', 'center');
      drawImageCrop(context, image, 54, 252, 472, 395);
      drawImageCrop(context, image, 554, 252, 472, 395, 'brightness(1.055) saturate(1.1) contrast(1.015)');
      write('现在的照片', 78, 684, '600 21px sans-serif');
      write('当前 · 76 分 · 超过 62% 的演示样例', 78, 720, '400 17px sans-serif', '#bebad2');
      write('变美效果示意', 578, 684, '600 21px sans-serif');
      write('模拟妆感 · 86 分 · 超过 84% 的演示样例', 578, 720, '400 17px sans-serif', '#d2bbd4');
      write('变美思路 · 按部位拆解', 58, 800, '700 30px sans-serif');
      const notes = [
        ['眉眼', '保留自然眉峰，眉尾轻轻拉长；杏棕眼影向眼尾渐层晕染，再以栗棕眼线贴近睫毛根部。', '单品灵感：杏雾暖棕眼影盘 · 栗棕眼线胶笔'],
        ['底妆与气色', '选接近颈部的暖调底妆，薄薄均匀肤色；腮红在苹果肌外侧向上晕开，保留自然肌理。', '单品灵感：暖调二白柔光轻薄气垫'],
        ['唇形', '以茶玫瑰色从唇中向外晕开，轻轻强调唇峰和下唇中部，边缘保持柔软。', '单品灵感：茶玫瑰暖调柔雾口红'],
        ['整体协调', '脸侧留出轻盈发丝层次；高光少量点在颧骨高点，让五官看起来更舒展。', '单品灵感：月砂金细闪柔光高光'],
      ];
      notes.forEach(([title, detail, product], index) => {
        const y = 840 + index * 210;
        context.fillStyle = '#ffffff08';
        context.strokeStyle = '#a6bce328';
        context.lineWidth = 1;
        context.beginPath();
        context.roundRect(54, y, 972, 184, 16);
        context.fill();
        context.stroke();
        write(`0${index + 1}  ${title}`, 78, y + 38, '650 22px sans-serif', '#ded5f3');
        context.font = '400 17px sans-serif';
        context.textAlign = 'left';
        context.fillStyle = '#b8b5ca';
        wrapText(context, detail, 78, y + 72, 914, 27, 2);
        write(product, 78, y + 145, '500 15px sans-serif', '#d6c28e');
      });
      write('所有分数、排名、商品与建议均为模拟演示；妆感预览只模拟光色，不代表真实 AI 改造。', 540, 1740, '400 16px sans-serif', '#8f8ba4', 'center');
      write('审美没有统一标准 · 建议仅作日常妆发灵感参考', 540, 1774, '400 16px sans-serif', '#8f8ba4', 'center');
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('poster unavailable');
      const link = document.createElement('a');
      const filename = `鉴颜值变美报告-${new Date().toISOString().slice(0, 10)}.png`;
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      status.textContent = '海报已下载，可从下载目录分享给朋友。';
      status.hidden = false;
    } catch {
      status.textContent = '海报暂未生成，请再试一次。';
      status.hidden = false;
    } finally {
      button.disabled = false;
      button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 17v3h14v-3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>下载变美报告海报';
    }
  }

  $('beautyBack').addEventListener('click', close);
  $('beautyUpload').addEventListener('click', () => $('beautyPhotoInput').click());
  $('beautyTryDemo').addEventListener('click', () => startExperience());
  $('beautyCancel').addEventListener('click', () => {
    clearInterval(scanTimer);
    clearTimeout(scanFinishTimer);
    $('beautyScanning').hidden = true;
    $('beautyEntry').hidden = false;
    $('beautyScroll').scrollTop = 0;
  });
  $('beautyPhotoInput').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast('请选择图片文件。');
    if (file.size > 12 * 1024 * 1024) return showToast('照片请小于 12MB。');
    startExperience(URL.createObjectURL(file), true);
    event.target.value = '';
  });
  $('beautyReport').addEventListener('click', event => {
    const purchaseButton = event.target.closest('[data-demo-purchase]');
    if (purchaseButton) showToast(`${purchaseButton.dataset.demoPurchase}为演示单品，不会创建订单。`);
  });
  $('beautyPoster').addEventListener('click', downloadPoster);
  $('beautyAgain').addEventListener('click', () => {
    resetDemo();
    $('beautyScroll').scrollTop = 0;
    $('beautyUpload').focus({ preventScroll: true });
  });
  document.addEventListener('keydown', event => {
    if (page.hidden) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = [...page.querySelectorAll('button:not([disabled]),input:not([hidden])')].filter(el => !el.closest('[hidden]'));
    if (!controls.length) return;
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.beautyExperience = { open, close };
})();
