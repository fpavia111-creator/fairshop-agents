// Sales by state against economic nexus thresholds the seller confirms. Not tax advice.
import { round2, str, num, isoDate, addDays, channelKey, stateCode, finding, byFinding, byStatus, sortBy, pct, today } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const NEXUS_ORDER_FIELDS = Object.freeze({
  order_id: t(['Order', 'Order ID', 'Name'], { required: true }),
  order_date: t(['Order Date', 'Created at', 'Date'], { type: 'date', required: true }),
  ship_state: t(['Ship State', 'Shipping Province', 'State', 'ship-state'], { required: true }),
  channel: t(['Channel', 'Source', 'Marketplace']),
  amount: t(['Amount', 'Total', 'Gross Sales', 'Subtotal'], { type: 'money', required: true }),
  status: t(['Status', 'Financial Status']),
});
const RULE = { type: 'object', additionalProperties: false, properties: { sales: { type: ['number', 'null'], minimum: 0 }, transactions: { type: ['integer', 'null'], minimum: 0 }, test: { type: 'string', enum: ['either', 'both'] }, period: { type: 'string', enum: ['current_year', 'previous_or_current_year', 'rolling_12'] }, include_marketplace: { type: 'boolean' } } };
export const NEXUS_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false, required: ['thresholds'],
  properties: {
    note: { type: 'string' },
    thresholds: { type: 'object', additionalProperties: RULE, description: 'Per state (two-letter code): sales and/or transaction thresholds, whether either or both must be met, the measuring period and whether marketplace sales count, as you confirm them with your adviser' },
    registered: { type: 'array', items: { type: 'string' }, description: 'States where you are already registered' },
    marketplace_channels: { type: 'array', items: { type: 'string' }, description: 'Channels that count as marketplace sales (default amazon, ebay, etsy, walmart, tiktok, target)' },
    warn_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Percent of a threshold at which a state is "approaching" (default 80)' },
  },
});

const MARKET = ['amazon', 'ebay', 'etsy', 'walmart', 'tiktok', 'target'];
function windows(period, day) {
  const y = Number(day.slice(0, 4));
  if (period === 'rolling_12') return [[addDays(day, -364), day, 'last 12 months']];
  if (period === 'current_year') return [[`${y}-01-01`, day, `${y} to date`]];
  return [[`${y - 1}-01-01`, `${y - 1}-12-31`, `${y - 1}`], [`${y}-01-01`, day, `${y} to date`]];
}

/** Statuses: over_not_registered, no_threshold, approaching, registered, under. */
export function checkNexus(orders, s, { asOf } = {}) {
  const day = today(asOf); const warn = s.warn_pct ?? 80; const reg = new Set((s.registered || []).map((x) => stateCode(x) || x.toUpperCase()));
  const mk = new Set((s.marketplace_channels || MARKET).map(channelKey));
  const rules = Object.fromEntries(Object.entries(s.thresholds || {}).map(([k, v]) => [stateCode(k) || k.toUpperCase(), v]));
  const byState = new Map();
  for (const o of sortBy(orders.map((o) => ({ ...o, id: str(o.order_id) })), (o) => `${isoDate(o.order_date)}|${o.id}`)) {
    if (/cancel|void/i.test(str(o.status))) continue; const st = stateCode(o.ship_state); if (!st) continue;
    (byState.get(st) || byState.set(st, []).get(st)).push({ d: isoDate(o.order_date), amt: round2(num(o.amount) || 0), market: mk.has(channelKey(o.channel)) });
  }
  const items = [];
  for (const st of [...new Set([...byState.keys(), ...Object.keys(rules)])].sort()) {
    const os = byState.get(st) || []; const rule = rules[st]; const f = [];
    if (!rule) { const total = round2(os.reduce((a, o) => a + o.amt, 0)); f.push(finding('no_threshold', null, `${os.length} order(s), ${total} shipped to ${st}, and no threshold is set for ${st}. Ask your adviser and add one.`)); items.push({ id: st, state: st, registered: reg.has(st), period: null, sales: total, transactions: os.length, threshold_sales: null, threshold_transactions: null, share_pct: null, crossed_on: null, status: reg.has(st) ? 'registered' : 'no_threshold', findings: reg.has(st) ? [] : f }); continue; }
    const counted = os.filter((o) => rule.include_marketplace !== false || !o.market);
    let best = null;
    for (const [from, to, label] of windows(rule.period || 'previous_or_current_year', day)) {
      const inW = counted.filter((o) => o.d && o.d >= from && o.d <= to); let sales = 0, n = 0, crossed = null;
      for (const o of inW) { sales = round2(sales + o.amt); n++; const hitS = rule.sales ? sales >= rule.sales : null; const hitT = rule.transactions ? n >= rule.transactions : null; const hit = rule.test === 'both' ? hitS !== false && hitT !== false && (hitS || hitT) : !!(hitS || hitT); if (hit && !crossed) crossed = o.d; }
      const share = Math.max(rule.sales ? pct(sales, rule.sales) : 0, rule.transactions ? pct(n, rule.transactions) : 0);
      const shareBoth = rule.test === 'both' ? Math.min(rule.sales ? pct(sales, rule.sales) : 100, rule.transactions ? pct(n, rule.transactions) : 100) : share;
      const w = { label, sales, transactions: n, crossed, share: shareBoth };
      if (!best || (w.crossed && !best.crossed) || (!!w.crossed === !!best.crossed && w.share > best.share)) best = w;
    }
    let status;
    if (reg.has(st)) status = 'registered';
    else if (best.crossed) { status = 'over_not_registered'; f.push(finding('threshold_crossed', best.sales, `${st}: ${best.sales} in sales and ${best.transactions} order(s) in ${best.label} met your threshold on ${best.crossed}. Your settings do not list ${st} as registered; talk to your adviser.`)); }
    else if (best.share >= warn) { status = 'approaching'; f.push(finding('threshold_approaching', null, `${st}: ${best.share}% of your threshold in ${best.label}.`)); }
    else status = 'under';
    items.push({ id: st, state: st, registered: reg.has(st), period: best.label, sales: best.sales, transactions: best.transactions, threshold_sales: rule.sales ?? null, threshold_transactions: rule.transactions ?? null, share_pct: best.share, crossed_on: best.crossed, status, findings: f });
  }
  const sorted = sortBy(items);
  return { as_of: day, states: sorted.length, ...byStatus(sorted, ['over_not_registered', 'no_threshold', 'approaching', 'registered', 'under']), by_finding: byFinding(sorted), items: sorted };
}

export function memoText(r, { from }) {
  const rows = r.items.filter((i) => ['over_not_registered', 'approaching', 'no_threshold'].includes(i.status));
  return { states: rows.map((i) => i.state), text: [
    `# Sales by state against our nexus settings, ${r.as_of}`, '', '**To:** [TO CONFIRM your tax adviser]', `**From:** ${from || '[TO CONFIRM your name]'}`, '',
    'Our own threshold settings show the states below. Please confirm the thresholds, the measuring periods and what we should do next.', '',
    '| State | Status | Period | Sales | Orders | Threshold | Met on |', '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.state} | ${i.status} | ${i.period || ''} | ${i.sales} | ${i.transactions} | ${i.threshold_sales ?? ''}${i.threshold_transactions ? ` / ${i.threshold_transactions} orders` : ''} | ${i.crossed_on || ''} |`),
    '', '[CHECK every threshold in our settings with the adviser; this memo is not tax advice]',
  ].join('\n') };
}
