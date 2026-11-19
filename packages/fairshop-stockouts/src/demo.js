import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

// The demo's arguments, also used by scripts/accuracy.mjs and scripts/model-view.mjs.
export const DEMO = {
  title: 'Fairshop Stockouts', args: { snapshots: 'snapshots.csv', orders: 'orders.csv', settings: 'settings.json' },
  draftArgs: { supplier: 'Example Rope Co (fictional)', from: 'Dana Example (fictional)' },
  show: (i) => `${i.id.padEnd(14)} ${i.status.padEnd(8)} ${i.kind === 'sku' ? `on hand ${i.on_hand}, ${i.daily}/day, cover ${i.days_of_cover ?? '-'}` : `${i.units} unit(s) ${i.value}`}`,
};

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), DEMO);
