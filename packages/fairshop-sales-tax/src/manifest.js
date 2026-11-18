import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, LIMITS, stateCode } from 'fairshop-core';
import { TAX_ORDER_FIELDS, TAX_SETTINGS_SCHEMA, checkSalesTax, worksheetText } from './salestax.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  orders: { type: 'string', description: 'Orders export under --root: order, date, channel, ship-to state, taxable subtotal, shipping, tax collected, exempt, exemption id' },
  settings: { type: 'string', description: 'Sales tax settings JSON you confirm: registered states with rate and shipping rule, marketplace facilitator channels and states, exemption certificates' },
};
const run = (a, ctx) => checkSalesTax(ctx.records(a.orders, 'orders'), ctx.readJson(a.settings, 'tax_settings'));
const line = (r) => `${r.orders} order(s): ${r.short} under-collected (${r.under}), ${r.review} to review, ${r.ok} as your settings give, ${r.marketplace} collected by a marketplace, ${r.outside} in states where you are not registered.`;

export const manifest = shopAgent({
  pkg, prefix: 'salestax', label: 'Fairshop Sales Tax',
  description: 'Compares the sales tax collected on each order with what the rates and rules you confirm give, by state: under- and over-collection, tax collected where you are not registered, exempt orders with no certificate, and marketplace orders under your facilitator settings. Drafts a filing worksheet per state; a person prepares and files any return. Not tax advice.',
  files, required: ['orders', 'settings'],
  sources: { orders: { label: 'Orders with tax', args: ['orders'], fields: TAX_ORDER_FIELDS } },
  configSchemas: { tax_settings: TAX_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Compare tax collected with your settings', description: 'For every order: marketplace-collected or not, registered or not, and the tax your settings give against the tax collected. Totals by state for a filing worksheet.' },
  explain: { arg: 'order_id', argDescription: 'Order number from salestax_audit', title: 'Explain one order', description: 'Show one order: state, channel, tax collected, tax your settings give and why it was flagged.', match: (i, w) => i.id === w.replace(/^#/, ''), text: (i) => `${i.id} (${i.channel}, ${i.state}): ${i.status}, collected ${i.collected}, settings give ${i.expected ?? 'n/a'}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'sales-tax', title: 'Sales tax collected against expected', description: 'Write sales-tax.csv and .html (by state, every order to look at) into out_dir (default fairshop-out/salestax).',
    columns: ['id', 'order_date', 'channel', 'state', 'subtotal', 'shipping', 'collected', 'expected', 'status', 'difference', 'findings', 'reasons', 'decision'],
    htmlColumns: ['id', 'channel', 'state', 'subtotal', 'collected', 'expected', 'status', 'difference', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => ['short', 'review'].includes(i.status)), ['id', 'order_date', 'channel', 'state', 'subtotal', 'shipping', 'collected', 'expected'], 'difference'),
    sections: (r) => [{ title: 'By state', rows: r.by_state, columns: ['state', 'registered', 'orders', 'direct_sales', 'marketplace_sales', 'collected', 'expected', 'difference'] }],
    limits: [LIMITS.files, 'Rates, registrations, shipping rules and marketplace facilitator rules are your settings. The agent does not know any state\'s current rules and uses one combined rate per state.', 'Not tax advice. A person prepares and files every return.'],
  },
  draft: {
    noun: 'filing_worksheet', verb: 'file', category: 'binding_send',
    description: 'Write drafts/filing_worksheet-<state>.md: direct and marketplace sales, tax collected, tax your settings give, and the orders to look at, for one state. Marked DRAFT. It is not a return; salestax_request_file records one named click, and a person files.',
    required: ['state'], args: { state: { type: 'string', description: 'State to write the worksheet for (code or name)' }, period: { type: 'string', description: 'Filing period, for the heading' } },
    build: (a, ctx, r) => { const st = stateCode(a.state) || String(a.state).toUpperCase().slice(0, 20); const g = r.by_state.find((x) => x.state === st); if (!g) throw new Error(`no orders shipped to "${st}"`); if (!g.registered) throw new Error(`your settings do not list ${st} as registered`); return { id: st, text: worksheetText(r, st, a), amount: g.collected, extra: { difference: g.difference } }; },
  },
  refused: [
    { name: 'tax_return_file', category: 'binding_send', description: 'Fairshop Sales Tax never files a return.' },
    { name: 'tax_payment_send', category: 'move_money', description: 'Fairshop Sales Tax never pays a tax authority.' },
  ],
  prompt: { name: 'sales_tax_check', title: 'Check sales tax collected', description: 'Walks the host model through a sales tax check.',
    text: 'You are helping a seller check sales tax collected, with fairshop-sales-tax. Orders: {{orders}}. Settings: {{settings}}.\n\nRules: rates, registrations and facilitator rules are the seller\'s confirmed settings. Never give tax advice or say what a state requires; point them to their preparer. tax_return_file and tax_payment_send are blocked.\n\n1. Call salestax_audit. Lead with under-collection by state.\n2. salestax_explain for an order.\n3. salestax_write_report.\n4. Offer salestax_draft_filing_worksheet per registered state; salestax_request_file only when asked (one named click).' },
});
