import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

// The demo's arguments, also used by scripts/accuracy.mjs and scripts/model-view.mjs.
export const DEMO = {
  title: 'Fairshop PO Receiving', args: { pos: 'pos.csv', receipts: 'receipts.csv', invoices: 'invoices.csv', settings: 'settings.json', as_of: '2026-11-16' },
  draftArgs: { vendor: 'Northwind Ceramics', from: 'Dana Example (fictional)' },
  show: (i) => `${i.id.padEnd(15)} ordered ${String(i.ordered).padStart(4)} received ${String(i.received).padStart(4)} billed ${String(i.billed).padStart(4)} ${i.status.padEnd(7)} ${i.claim}`,
};

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), DEMO);
