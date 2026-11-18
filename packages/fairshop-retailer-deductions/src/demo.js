import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop Retailer Deductions', args: { deductions: 'deductions.csv', invoices: 'invoices.csv', pods: 'pods.csv', settings: 'settings.json', as_of: '2026-11-16' },
  draftArgs: { retailer: 'Example Mart', from: 'Dana Example (fictional)' },
  show: (i) => `${i.retailer.padEnd(15)} ${i.invoice_number.padEnd(8)} ${i.type.padEnd(11)} ${String(i.amount).padStart(7)} ${i.status.padEnd(13)} ${i.recover}`,
});
