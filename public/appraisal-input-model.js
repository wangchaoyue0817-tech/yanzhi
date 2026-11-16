/* Shared validation for the local appraisal prototype. No network upload. */
(() => {
  const MAX_PHOTOS = 9, MAX_BYTES = 12 * 1024 * 1024, MAX_CHARS = 250;
  function normalizeText(value) { return Array.from(String(value)).slice(0, MAX_CHARS).join(''); }
  function countText(value) { return Array.from(String(value)).length; }
  function selectFiles(files, existing = 0) {
    const accepted = [], errors = [];
    for (const file of files) {
      if (!/^image\/(jpeg|png|webp|gif|avif|bmp)$/i.test(file.type)) { errors.push('请选择 JPG、PNG、WebP 等可预览的图片'); continue; }
      if (file.size > MAX_BYTES) { errors.push('单张照片请小于 12MB'); continue; }
      if (existing + accepted.length >= MAX_PHOTOS) { errors.push('每次最多选择 9 张照片'); break; }
      accepted.push(file);
    }
    return { accepted, errors: [...new Set(errors)] };
  }
  globalThis.JianxAppraisalInput = Object.freeze({ MAX_PHOTOS, MAX_BYTES, MAX_CHARS, normalizeText, countText, selectFiles });
})();
