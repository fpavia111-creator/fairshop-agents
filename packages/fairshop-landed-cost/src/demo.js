import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

// The demo's arguments, also used by scripts/accuracy.mjs and scripts/model-view.mjs.
export const DEMO = {
  title: 'Fairshop Landed Cost', args: { lines: 'lines.csv', costs: 'costs.csv', recorded: 'recorded.csv' },
  draftArgs: {},
  show: (i) => `${i.id.padEnd(16)} unit ${String(i.unit_cost ?? '-').padStart(5)} landed ${String(i.landed_unit ?? '-').padStart(5)} recorded ${String(i.recorded ?? '-').padStart(5)} ${i.status}`,
};

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), DEMO);
