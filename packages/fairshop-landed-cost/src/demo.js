import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop Landed Cost', args: { lines: 'lines.csv', costs: 'costs.csv', recorded: 'recorded.csv' },
  draftArgs: {},
  show: (i) => `${i.id.padEnd(16)} unit ${String(i.unit_cost ?? '-').padStart(5)} landed ${String(i.landed_unit ?? '-').padStart(5)} recorded ${String(i.recorded ?? '-').padStart(5)} ${i.status}`,
});
