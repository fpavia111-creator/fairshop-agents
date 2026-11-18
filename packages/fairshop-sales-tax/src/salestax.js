// Sales tax collected against what the seller's own settings give. Rates, registrations and
// marketplace facilitator rules are settings the seller confirms; nothing here is tax advice.
import { round2, str, num, isoDate, channelKey, channelLabel, stateCode, finding, byFinding, byStatus, sortBy } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const TAX_ORDER_FIELDS = Object.freeze({
  order_id: t(['Order', 'Order ID', 'Name', 'Order Number'], { required: true }),
  order_date: t(['Order Date', 'Created at', 'Date'], { type: 'date' }),
  channel: t(['Channel', 'Source', 'Marketplace', 'Sales Channel']),
  ship_state: t(['Ship State', 'Shipping Province', 'Shipping State', 'State', 'Ship To State', 'ship-state'], { required: true }),
  subtotal: t(['Subtotal', 'Taxable Amount', 'Item Total', 'Net Sales'], { type: 'money', required: true }),
  shipping: t(['Shipping', 'Shipping Charged', 'Shipping Amount'], { type: 'money' }),
  tax_collected: t(['Tax', 'Taxes', 'Tax Collected', 'Sales Tax'], { type: 'money', required: true }),
  exempt: t(['Exempt', 'Tax Exempt'], { type: 'bool' }),
  exemption_id: t(['Exemption ID', 'Exemption Certificate', 'Certificate']),
});
export const TAX_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false, required: ['registered'],
  properties: {
    note: { type: 'string' },
    registered: { type: 'object', additionalProperties: { type: 'object', additionalProperties: false, required: ['rate'], properties: { rate: { type: 'number', minimum: 0, maximum: 30 }, tax_shipping: { type: 'boolean' } } }, description: 'States where you are registered (two-letter code): the combined rate you charge and whether shipping is taxed, as you confirm them' },
    marketplace_facilitator: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } }, description: 'Channel → states where you confirm the marketplace collects and remits ("*" for all)' },
    exemption_certificates: { type: 'array', items: { type: 'string' }, description: 'Exemption certificate ids you hold on file' },
    tolerance: { type: 'number', minimum: 0, description: 'Differences up to this amount are rounding (default 0.05)' },
  },
});

/** Statuses: short, review, ok, marketplace, outside. */
export function checkSalesTax(orders, s) {
  const tol = s.tolerance ?? 0.05; const reg = Object.fromEntries(Object.entries(s.registered || {}).map(([k, v]) => [stateCode(k) || k.toUpperCase(), v]));
  const mf = Object.fromEntries(Object.entries(s.marketplace_facilitator || {}).map(([k, v]) => [channelKey(k), v.map((x) => (x === '*' ? '*' : stateCode(x) || x.toUpperCase()))]));
  const certs = new Set((s.exemption_certificates || []).map((x) => str(x).toUpperCase()));
  const items = [];
  for (const o of sortBy(orders.map((o) => ({ ...o, id: str(o.order_id).replace(/^#/, '') })))) {
    const st = stateCode(o.ship_state) || str(o.ship_state).toUpperCase(); const ch = channelKey(o.channel); const sub = round2(num(o.subtotal) || 0); const ship = round2(num(o.shipping) || 0); const col = round2(num(o.tax_collected) || 0);
    const base = { id: o.id, order_date: isoDate(o.order_date), channel: channelLabel(ch), state: st, subtotal: sub, shipping: ship, collected: col, expected: null, difference: 0 };
    const f = []; let status;
    const facil = mf[ch] && (mf[ch].includes('*') || mf[ch].includes(st));
    if (facil) status = 'marketplace';
    else if (reg[st]) {
      if (String(o.exempt).toLowerCase() === 'yes') { if (str(o.exemption_id) && (!certs.size || certs.has(str(o.exemption_id).toUpperCase()))) status = 'ok'; else { f.push(finding('exempt_no_certificate', null, `Order ${o.id} in ${st} was sold tax-exempt with no certificate on file${str(o.exemption_id) ? ` (${o.exemption_id} is not in your list)` : ''}.`)); status = 'review'; } base.expected = 0; }
      else {
        const exp = round2((sub + (reg[st].tax_shipping ? ship : 0)) * reg[st].rate / 100); base.expected = exp; base.difference = round2(col - exp);
        if (base.difference < -tol) { f.push(finding('under_collected', -base.difference, `Collected ${col} on order ${o.id} in ${st}; your settings (${reg[st].rate}%${reg[st].tax_shipping ? ', shipping taxed' : ''}) give ${exp}.`)); status = 'short'; }
        else if (base.difference > tol) { f.push(finding('over_collected', base.difference, `Collected ${col} on order ${o.id} in ${st}; your settings give ${exp}. Over-collected tax is usually owed to the state or back to the customer; ask your adviser which.`)); status = 'review'; }
        else status = 'ok';
      }
    } else if (col > tol) { f.push(finding('collected_not_registered', col, `Collected ${col} on order ${o.id} shipped to ${st}, where your settings say you are not registered.`)); status = 'review'; }
    else status = 'outside';
    items.push({ ...base, status, findings: f });
  }
  const sorted = sortBy(items, (i) => `${i.state}|${i.id}`);
  const states = new Map();
  for (const i of sorted) { const g = states.get(i.state) || { state: i.state, registered: !!reg[i.state], orders: 0, marketplace_sales: 0, direct_sales: 0, collected: 0, expected: 0, difference: 0 }; g.orders++; if (i.status === 'marketplace') g.marketplace_sales = round2(g.marketplace_sales + i.subtotal); else { g.direct_sales = round2(g.direct_sales + i.subtotal); g.collected = round2(g.collected + i.collected); if (i.expected !== null) { g.expected = round2(g.expected + i.expected); g.difference = round2(g.collected - g.expected); } } states.set(i.state, g); }
  return { orders: sorted.length, collected: round2(sorted.reduce((a, i) => a + (i.status === 'marketplace' ? 0 : i.collected), 0)), under: round2(sorted.filter((i) => i.status === 'short').reduce((a, i) => a - i.difference, 0)), ...byStatus(sorted, ['short', 'review', 'ok', 'marketplace', 'outside']), by_state: [...states.values()].sort((a, b) => (a.state < b.state ? -1 : 1)), by_finding: byFinding(sorted), items: sorted };
}

export function worksheetText(r, state, { period }) {
  const g = r.by_state.find((x) => x.state === state); const rows = r.items.filter((i) => i.state === state && i.findings.length);
  return [
    `# Sales tax worksheet: ${state}`, '', `**Period:** ${period || '[TO CONFIRM filing period]'}`, '**For:** [TO CONFIRM the person who prepares the return]', '',
    '| Line | Amount |', '| --- | --- |', `| Direct sales shipped to ${state} | ${g.direct_sales} |`, `| Marketplace sales (collected by the marketplace, per your settings) | ${g.marketplace_sales} |`, `| Tax collected on direct sales | ${g.collected} |`, `| Tax your settings give | ${g.expected} |`, `| Difference | ${g.difference} |`, '',
    rows.length ? 'Orders to look at:' : 'No order needs a second look.', ...rows.map((i) => `- ${i.id}: ${i.findings.map((f) => f.detail).join(' ')}`), '',
    '[CHECK local rates, exemptions and the period with your preparer. This worksheet is not a return and not tax advice.]',
  ].join('\n');
}
