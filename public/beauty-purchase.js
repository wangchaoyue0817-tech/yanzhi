import { PRODUCTS } from './beauty-model.js?v=22';

// Add the merchant-issued HTTPS Mini Program URL Link for each product here.
// Empty entries use the clearly labelled, full-page destination demonstration.
export const PURCHASE_LINKS = Object.freeze({});

export function resolvePurchaseTarget(productId, links = PURCHASE_LINKS) {
  if (!PRODUCTS.some(product => product.id === productId)) return null;
  const configured = links && Object.hasOwn(links, productId) ? links[productId] : null;
  if (configured == null || configured === '') return { type: 'demo', productId };
  try {
    if (typeof configured !== 'string') throw new Error('Invalid purchase link');
    const url = new URL(configured);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid purchase link');
    return { type: 'external', productId, url: url.href };
  } catch {
    return { type: 'unavailable', productId };
  }
}
