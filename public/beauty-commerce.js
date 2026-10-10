import { PRODUCTS } from './beauty-model.js?v=22';

export { getFoundationProducts } from './beauty-model.js?v=22';

const PRODUCT_BY_ID = new Map(PRODUCTS.map(product => [product.id, product]));
const THRESHOLD_CENTS = 20_000;
const SAVING_CENTS = 2_000;

/**
 * Quote one or several selected products using the current catalog prices.
 * Duplicate IDs merge in their first-selected order. Quantities are integers
 * from 1 to 9 per SKU after merging; invalid input is rejected without coercion.
 * Money is calculated in integer cents and returned in yuan for display.
 */
export function quoteOrder(items = []) {
  if (!Array.isArray(items)) throw new TypeError('items must be an array');
  const quantities = new Map();
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new TypeError('each item must contain an id and quantity');
    }
    if (typeof item.id !== 'string' || !PRODUCT_BY_ID.has(item.id)) {
      throw new RangeError('unknown product id');
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 9) {
      throw new RangeError('quantity must be an integer from 1 to 9');
    }
    const quantity = (quantities.get(item.id) || 0) + item.quantity;
    if (quantity > 9) throw new RangeError('combined quantity per product cannot exceed 9');
    quantities.set(item.id, quantity);
  }

  let subtotalCents = 0;
  let quantity = 0;
  const quotedItems = [...quantities].map(([id, count]) => {
    const priceCents = Math.round(PRODUCT_BY_ID.get(id).price * 100);
    const lineCents = priceCents * count;
    subtotalCents += lineCents;
    quantity += count;
    return { id, quantity: count, price: priceCents / 100, subtotal: lineCents / 100 };
  });
  const discountCents = Math.floor(subtotalCents / THRESHOLD_CENTS) * SAVING_CENTS;
  const nextThresholdGapCents = subtotalCents === 0
    ? 0
    : THRESHOLD_CENTS - (subtotalCents % THRESHOLD_CENTS);

  return {
    items: quotedItems,
    quantity,
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    total: (subtotalCents - discountCents) / 100,
    nextThresholdGap: nextThresholdGapCents / 100,
  };
}
