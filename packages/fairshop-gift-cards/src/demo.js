import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop Gift Cards', args: { cards: 'cards.csv', activity: 'activity.csv', settings: 'settings.json', as_of: '2026-11-16' },
  draftArgs: { gl_balance: '400', liability_account: '2300 Gift card liability', offset_account: '4000 Sales' },
  show: (i) => `${i.id.padEnd(8)} ${i.source.padEnd(7)} issued ${String(i.issued).padStart(7)} balance ${String(i.balance).padStart(7)} ${i.status}`,
});
