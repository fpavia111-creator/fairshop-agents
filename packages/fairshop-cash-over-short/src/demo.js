import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop Cash Over Short', args: { closeouts: 'closeouts.csv', deposits: 'deposits.csv', settings: 'settings.json' },
  draftArgs: { store: 'Downtown' },
  show: (i) => `${i.id.padEnd(24)} over/short ${String(i.over_short).padStart(6)} deposit ${String(i.deposit_due).padStart(7)} / ${String(i.deposited ?? '-').padStart(7)} ${i.status}`,
});
