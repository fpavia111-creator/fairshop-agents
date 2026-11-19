import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

// The demo's arguments, also used by scripts/accuracy.mjs and scripts/model-view.mjs.
export const DEMO = {
  title: 'Fairshop Settlement Journals', args: { settlement: 'settlement.csv', map: 'map.json', deposits: 'deposits.csv', as_of: '2026-11-30' },
  draftArgs: { settlement_id: 'S-100' },
  show: (i) => `${i.id.padEnd(6)} net ${String(i.net).padStart(8)} Dr ${String(i.debit).padStart(8)} Cr ${String(i.credit).padStart(8)} ${i.status}`,
};

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), DEMO);
