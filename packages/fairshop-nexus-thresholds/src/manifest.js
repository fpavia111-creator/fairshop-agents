import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, AS_OF, LIMITS } from 'fairshop-core';
import { NEXUS_ORDER_FIELDS, NEXUS_SETTINGS_SCHEMA, checkNexus, memoText } from './nexus.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  orders: { type: 'string', description: 'Orders under --root covering at least the last two calendar years: order, date, ship-to state, channel, amount, status' },
  settings: { type: 'string', description: 'Nexus settings JSON you confirm with your adviser: thresholds per state (sales, transactions, either/both, period, marketplace sales counted), registered states, warn_pct' },
  as_of: AS_OF,
};
const run = (a, ctx) => checkNexus(ctx.records(a.orders, 'orders'), ctx.readJson(a.settings, 'nexus_settings'), { asOf: a.as_of });
const line = (r) => `${r.states} state(s): ${r.over_not_registered} over your threshold and not registered, ${r.approaching} approaching, ${r.no_threshold} with sales but no threshold set, ${r.registered} registered, ${r.under} under.`;

export const manifest = shopAgent({
  pkg, prefix: 'nexus', label: 'Fairshop Nexus Thresholds',
  description: 'Tracks sales and order counts by state against the economic nexus thresholds you confirm, over the period each state uses in your settings: thresholds met where you are not registered (with the date), states approaching, and states with sales but no threshold set. Drafts a memo for your adviser. Never registers or files; not tax advice.',
  files, required: ['orders', 'settings'],
  sources: { orders: { label: 'Orders by state', args: ['orders'], fields: NEXUS_ORDER_FIELDS } },
  configSchemas: { nexus_settings: NEXUS_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Measure sales by state against your thresholds', description: 'Add up sales and orders per state over each state\'s measuring period in your settings and compare them with your thresholds.' },
  explain: { arg: 'state', argDescription: 'State code from nexus_audit', title: 'Explain one state', description: 'Show one state\'s sales, orders, threshold, period and date met.', match: (i, w) => i.state === w.toUpperCase(), text: (i) => `${i.state}: ${i.status}${i.period ? `, ${i.sales} in sales and ${i.transactions} order(s) in ${i.period}` : ''}${i.share_pct !== null ? ` (${i.share_pct}% of your threshold)` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'nexus-thresholds', title: 'Sales by state against your thresholds', description: 'Write nexus-thresholds.csv and .html (every state with its sales, orders, threshold and status) into out_dir (default fairshop-out/nexus).',
    columns: ['id', 'state', 'registered', 'period', 'sales', 'transactions', 'threshold_sales', 'threshold_transactions', 'share_pct', 'crossed_on', 'status', 'findings', 'reasons', 'decision'],
    htmlColumns: ['state', 'period', 'sales', 'transactions', 'threshold_sales', 'share_pct', 'crossed_on', 'status'],
    rows: (r) => worklistRows(r.items, ['id', 'state', 'registered', 'period', 'sales', 'transactions', 'threshold_sales', 'threshold_transactions', 'share_pct', 'crossed_on']).map(({ amount, ...x }) => x),
    sections: (r) => [{ title: 'By state', rows: r.items.filter((i) => i.status !== 'under').map((i) => ({ state: i.state, status: i.status, sales: i.sales, share_pct: i.share_pct, crossed_on: i.crossed_on })), columns: ['state', 'status', 'sales', 'share_pct', 'crossed_on'] }],
    limits: [LIMITS.files, 'Thresholds, periods and whether marketplace sales count are your settings; the agent does not know any state\'s current rules.', 'Not tax advice. Registration is your and your adviser\'s decision.'],
  },
  draft: {
    noun: 'adviser_memo', verb: 'send', category: 'binding_send',
    description: 'Write drafts/adviser_memo-states.md listing the states over, approaching or with no threshold set, for your tax adviser. Marked DRAFT. Sending goes through nexus_request_send (one click); a person sends it.',
    args: { from: { type: 'string', description: 'Your name' } },
    build: (a, ctx, r) => { const d = memoText(r, a); if (!d.states.length) throw new Error('no state is over, approaching or missing a threshold'); return { id: 'states', text: d.text, extra: { states: d.states } }; },
  },
  refused: [
    { name: 'state_registration_submit', category: 'binding_send', description: 'Fairshop Nexus Thresholds never registers with a state.' },
    { name: 'tax_return_file', category: 'binding_send', description: 'Fairshop Nexus Thresholds never files anything with a tax authority.' },
  ],
  prompt: { name: 'nexus_thresholds', title: 'Track sales by state against your thresholds', description: 'Walks the host model through a nexus check.',
    text: 'You are helping a seller track sales by state with fairshop-nexus-thresholds. Orders: {{orders}}. Settings: {{settings}}.\n\nRules: thresholds and periods are the seller\'s settings; never state a state\'s law or say whether they must register. Point them to their adviser. Registration and filing are blocked.\n\n1. Call nexus_audit. Lead with states over the threshold and not registered, with the date.\n2. nexus_explain for a state.\n3. nexus_write_report.\n4. Offer nexus_draft_adviser_memo; nexus_request_send only when asked (one named click).' },
});
