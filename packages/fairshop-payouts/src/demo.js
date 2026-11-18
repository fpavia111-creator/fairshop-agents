import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairshop-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['payouts_draft_payout_inquiry'] });
  process.stdout.write('Fairshop Payouts demo (fictional store, as of 2026-11-16), Auto mode on for drafts\n');
  const f = { orders: 'orders.csv', payouts: 'payouts.csv', settings: 'settings.json', as_of: '2026-11-16' };
  const a = await rt.call('payouts_audit', f);
  printStep('Match 13 orders to 12 payout lines', a);
  for (const i of a.result.items) process.stdout.write(`    ${String(i.order_id || i.id).padEnd(22)} ${i.channel.padEnd(8)} ${i.status.padEnd(8)} ${String(i.owed).padStart(6)}  ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Write the worklist', await rt.call('payouts_write_report', f));
  const d = await rt.call('payouts_draft_payout_inquiry', { ...f, channel: 'Amazon', from: 'Dana Example, Example Goods (fictional)' });
  printStep('Draft the Amazon payout inquiry', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('payouts_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('The agent tries to withdraw the balance itself', await rt.call('balance_withdraw', {}));
}
