import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop FBA Storage Fees', args: { storage: 'storage.csv', lots: 'lots.csv', settings: 'settings.json', as_of: '2026-11-16' },
  draftArgs: { from: 'Dana Example (fictional)' },
  show: (i) => `${i.id.padEnd(22)} ${i.status.padEnd(7)} ${String(i.fee).padStart(7)} ${String(i.expected ?? '-').padStart(7)} ${i.act_by || ''} ${i.findings.map((f) => f.code).join(', ')}`,
});
