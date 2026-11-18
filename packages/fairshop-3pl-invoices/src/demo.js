import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop 3PL Invoices', args: { invoice: 'invoice.csv', ratecard: 'ratecard.json', shipped: 'shipped.csv', receipts: 'receipts.csv', pallets: 'pallets.csv' },
  draftArgs: { provider: 'Example Fulfillment (fictional)', from: 'Dana Example (fictional)' },
  show: (i) => `${i.charge_type.padEnd(20)} ${i.reference.padEnd(8)} ${String(i.amount).padStart(7)} ${String(i.expected ?? '-').padStart(7)} ${i.status}`,
});
