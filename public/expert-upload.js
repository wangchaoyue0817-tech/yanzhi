(() => {
  'use strict';

  function create(container) {
    const inputModel = window.JianxAppraisalInput;
    const document = container.ownerDocument;
    let productKey = '';
    let revision = 0;
    let loading = false;
    const photos = [];
    const pendingUrls = new Set();

    container.classList.add('ep-upload-view');
    container.hidden = true;
    container.innerHTML = `
      <section class="ep-upload-product" aria-label="已选产品">
        <p class="ep-upload-context"></p>
        <h3 class="ep-upload-series"></h3>
      </section>
      <section class="ep-upload-section" aria-label="商品照片">
        <div class="ep-upload-heading">
          <h3>商品照片</h3>
          <span class="ep-upload-count" aria-label="已选照片数量"></span>
        </div>
        <input class="ep-upload-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp" multiple hidden aria-label="选择商品照片">
        <button class="ep-upload-choose" type="button">
          <span class="ep-upload-plus" aria-hidden="true"></span>
          <span class="ep-upload-choose-label">选择照片</span>
        </button>
        <ul class="ep-upload-photos" aria-label="照片预览" hidden></ul>
        <p class="ep-upload-status" role="status"></p>
        <p class="ep-upload-note">最多 ${inputModel.MAX_PHOTOS} 张，单张不超过 12MB。照片仅在本机预览。</p>
      </section>
    `;

    const context = container.querySelector('.ep-upload-context');
    const title = container.querySelector('.ep-upload-series');
    const count = container.querySelector('.ep-upload-count');
    const input = container.querySelector('.ep-upload-input');
    const choose = container.querySelector('.ep-upload-choose');
    const chooseLabel = container.querySelector('.ep-upload-choose-label');
    const list = container.querySelector('.ep-upload-photos');
    const status = container.querySelector('.ep-upload-status');

    function updateControls() {
      count.textContent = `${photos.length} / ${inputModel.MAX_PHOTOS}`;
      choose.disabled = loading || photos.length >= inputModel.MAX_PHOTOS;
      chooseLabel.textContent = loading ? '正在读取照片…' : choose.disabled ? '已选满照片' : photos.length ? '继续添加照片' : '选择照片';
    }

    function renderPhotos() {
      list.hidden = photos.length === 0;
      list.replaceChildren(...photos.map(({ name, url }, index) => {
        const item = document.createElement('li');
        item.className = 'ep-upload-photo';
        const image = document.createElement('img');
        image.src = url;
        image.alt = name || `商品照片 ${index + 1}`;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'ep-upload-remove';
        remove.setAttribute('aria-label', `移除照片 ${index + 1}`);
        remove.textContent = '×';
        remove.addEventListener('click', () => {
          URL.revokeObjectURL(url);
          photos.splice(index, 1);
          status.textContent = '';
          renderPhotos();
          const next = list.children[Math.min(index, photos.length - 1)]?.lastElementChild;
          (next || choose).focus({ preventScroll: true });
        });
        item.append(image, remove);
        return item;
      }));
      updateControls();
    }

    function clearPhotos() {
      revision++;
      loading = false;
      for (const { url } of photos) URL.revokeObjectURL(url);
      for (const url of pendingUrls) URL.revokeObjectURL(url);
      photos.length = 0;
      pendingUrls.clear();
      input.value = '';
      status.textContent = '';
      renderPhotos();
    }

    choose.addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      const files = [...input.files];
      input.value = '';
      if (loading || !productKey || !files.length) return;

      const currentRevision = revision;
      const { accepted, errors } = inputModel.selectFiles(files, photos.length);
      loading = accepted.length > 0;
      status.textContent = '';
      updateControls();
      for (const file of accepted) {
        if (currentRevision !== revision) return;
        let url;
        try {
          url = URL.createObjectURL(file);
          pendingUrls.add(url);
          const image = new Image();
          image.src = url;
          await image.decode();
          if (currentRevision !== revision) return;
          pendingUrls.delete(url);
          photos.push({ name: file.name, url });
        } catch {
          if (pendingUrls.delete(url)) URL.revokeObjectURL(url);
          if (currentRevision !== revision) return;
          errors.push('有照片无法读取，请重新选择。');
        }
      }
      loading = false;
      status.textContent = [...new Set(errors)].join('。');
      renderPhotos();
    });

    const nameOf = value => typeof value === 'string' ? value : value?.name || '';
    function show({ category, brand, series }) {
      const names = [category, brand, series].map(nameOf);
      const key = JSON.stringify(names);
      if (productKey !== key) {
        clearPhotos();
        productKey = key;
      }
      context.textContent = names.slice(0, 2).filter(Boolean).join(' · ');
      title.textContent = names[2];
      container.hidden = false;
    }

    function hide() {
      container.hidden = true;
    }

    function reset() {
      hide();
      productKey = '';
      title.textContent = '';
      context.textContent = '';
      clearPhotos();
    }

    renderPhotos();
    return { show, hide, reset };
  }

  window.ExpertUpload = Object.freeze({ create });
})();
