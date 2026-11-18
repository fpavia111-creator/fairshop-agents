import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop FBA Reimbursements', args: { adjustments: 'adjustments.csv', reimbursements: 'reimbursements.csv', returns: 'returns.csv', refunds: 'refunds.csv', settings: 'settings.json', as_of: '2026-11-16' },
  draftArgs: { from: 'Dana Example, Example Goods (fictional)' },
  show: (i) => `${i.id.padEnd(34)} ${i.status.padEnd(14)} ${String(i.units).padStart(3)} ${String(i.value ?? '-').padStart(7)}  ${i.claim_by || ''}`,
});
