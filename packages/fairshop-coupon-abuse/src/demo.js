import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

// The demo's arguments, also used by scripts/accuracy.mjs and scripts/model-view.mjs.
export const DEMO = {
  title: 'Fairshop Coupon Abuse', args: { orders: 'orders.csv', codes: 'codes.csv', settings: 'settings.json' },
  draftArgs: { from: 'Dana Example (fictional)' },
  show: (i) => `${i.id.padEnd(5)} ${i.order_date} ${i.discount_code.padEnd(10)} ${String(i.discount_amount).padStart(6)} ${i.status.padEnd(6)} ${i.findings.map((f) => f.code).join(', ')}`,
};

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), DEMO);
