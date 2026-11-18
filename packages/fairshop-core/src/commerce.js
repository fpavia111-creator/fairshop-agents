// E-commerce and retail helpers shared by the Fairshop agents. Pure functions, no I/O.
//
// Nothing here is a marketplace's fee schedule, a tax rate or a rule of law. Channel
// names, state names and fee words are matching aids; every amount an agent checks
// against comes from a settings file the seller writes and confirms.
import { round2, str, num, isoDate, daysBetween } from './freight.js';
import { normalizeAddress } from './text.js';

// ---------------------------------------------------------------- channels ----

const CHANNEL_WORDS = [
  ['amazon', /\bamazon\b|\bamzn\b|seller ?central|\bfba\b|\bmfn\b|\bafn\b/],
  ['ebay', /\bebay\b/],
  ['etsy', /\betsy\b/],
  ['walmart', /\bwalmart\b|\bwmt\b/],
  ['tiktok', /\btik ?tok\b/],
  ['target', /\btarget plus\b|\btarget\+/],
  ['faire', /\bfaire\b/],
  ['woocommerce', /\bwoo(commerce)?\b/],
  ['bigcommerce', /\bbig ?commerce\b/],
  ['shopify_pos', /\bshopify pos\b|\bpoint of sale\b/],
  ['shopify', /\bshopify\b|\bonline store\b|\bshop app\b/],
  ['square', /\bsquare\b/],
  ['stripe', /\bstripe\b/],
  ['paypal', /\bpaypal\b|\bbraintree\b|\bvenmo\b/],
];
export const CHANNEL_LABELS = Object.freeze({ amazon: 'Amazon', ebay: 'eBay', etsy: 'Etsy', walmart: 'Walmart', tiktok: 'TikTok Shop', target: 'Target Plus', faire: 'Faire', woocommerce: 'WooCommerce', bigcommerce: 'BigCommerce', shopify_pos: 'Shopify POS', shopify: 'Shopify', square: 'Square', stripe: 'Stripe', paypal: 'PayPal' });

/**
 * Canonical key for a sales channel, marketplace or payment processor name, for matching
 * across files ("Amazon.com", "AMZN US", "Amazon Seller Central" → "amazon"). An unknown
 * name is kept, lower-cased, with punctuation folded to spaces.
 */
export function channelKey(v) {
  const s = str(v).toLowerCase(); if (!s) return '';
  const flat = s.replace(/[._/-]+/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [k, re] of CHANNEL_WORDS) if (re.test(flat)) return k;
  return flat;
}
export const channelLabel = (k) => CHANNEL_LABELS[k] || k;
/** True when two channel names mean the same channel. */
export const sameChannel = (a, b) => !!channelKey(a) && channelKey(a) === channelKey(b);

// ------------------------------------------------------------------ states ----

const STATES = { AL: 'alabama', AK: 'alaska', AZ: 'arizona', AR: 'arkansas', CA: 'california', CO: 'colorado', CT: 'connecticut', DE: 'delaware', DC: 'district of columbia', FL: 'florida', GA: 'georgia', HI: 'hawaii', ID: 'idaho', IL: 'illinois', IN: 'indiana', IA: 'iowa', KS: 'kansas', KY: 'kentucky', LA: 'louisiana', ME: 'maine', MD: 'maryland', MA: 'massachusetts', MI: 'michigan', MN: 'minnesota', MS: 'mississippi', MO: 'missouri', MT: 'montana', NE: 'nebraska', NV: 'nevada', NH: 'new hampshire', NJ: 'new jersey', NM: 'new mexico', NY: 'new york', NC: 'north carolina', ND: 'north dakota', OH: 'ohio', OK: 'oklahoma', OR: 'oregon', PA: 'pennsylvania', PR: 'puerto rico', RI: 'rhode island', SC: 'south carolina', SD: 'south dakota', TN: 'tennessee', TX: 'texas', UT: 'utah', VT: 'vermont', VA: 'virginia', WA: 'washington', WV: 'west virginia', WI: 'wisconsin', WY: 'wyoming' };
const BY_NAME = new Map(Object.entries(STATES).map(([c, n]) => [n, c]));
export const US_STATES = Object.freeze(Object.keys(STATES));

/** Two-letter code for a US state written as a code or a name ("Texas", "tx", "TX - Texas"); '' when it is not one. */
export function stateCode(v) {
  const s = str(v); if (!s) return '';
  const up = s.toUpperCase();
  if (/^[A-Z]{2}$/.test(up) && STATES[up]) return up;
  const m = /^([A-Z]{2})\b/.exec(up); if (m && STATES[m[1]] && /^[A-Z]{2}\s*[-–,:]/.test(up)) return m[1];
  const n = s.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^state of /, '');
  if (BY_NAME.has(n)) return BY_NAME.get(n);
  const us = /^us ([a-z]{2})$/.exec(n); if (us && STATES[us[1].toUpperCase()]) return us[1].toUpperCase();
  return '';
}
export const stateName = (code) => (STATES[code] ? STATES[code].replace(/\b\w/g, (c) => c.toUpperCase()) : code);

// --------------------------------------------------------- SKUs, people ----

/** SKU key: trimmed, upper-cased, inner spaces folded. "abc-1 " and "ABC-1" are one SKU. */
export const skuKey = (v) => str(v).toUpperCase().replace(/\s+/g, ' ');

/**
 * E-mail key for spotting one shopper behind several addresses: lower-cased, a "+tag"
 * dropped, and dots in the local part dropped for the providers that ignore them.
 */
const DOTLESS = new Set(['gmail.com', 'googlemail.com']);
export function emailKey(v) {
  const s = str(v).toLowerCase(); const at = s.lastIndexOf('@');
  if (at < 1) return s;
  let local = s.slice(0, at).split('+')[0]; let domain = s.slice(at + 1);
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (DOTLESS.has(domain)) local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}
/** Address key: the core address normaliser plus the postal code, so "12 Elm St" and "12 Elm Street" match. */
export const addressKey = (address, postal = '') => { const a = normalizeAddress(str(address)); return a ? `${a}|${str(postal).replace(/\s+/g, '').slice(0, 5)}` : ''; };

// ------------------------------------------------------------ dates, sums ----

/** "2026-11" for a date. */
export const monthOf = (d) => { const x = isoDate(d); return x ? x.slice(0, 7) : ''; };
/** Percent with one decimal, null when the base is zero. */
export const pct = (part, whole) => (Number(whole) ? Math.round((Number(part) / Number(whole)) * 1000) / 10 : null);
/** Age in days of a date as of another date (null when either is missing). */
export const ageDays = (d, asOf) => daysBetween(d, asOf);
/** Bucket label for an age in days: edges [30, 60, 90] give "0-30", "31-60", "61-90", "91+". */
export function ageBucket(days, edges = [30, 60, 90]) {
  if (days === null || days === undefined || !Number.isFinite(Number(days))) return 'unknown';
  let lo = 0; for (const e of edges) { if (days <= e) return `${lo}-${e}`; lo = e + 1; }
  return `${lo}+`;
}
/** Money from a cell, 0 when empty (use num() when "empty" must stay null). */
export const money = (v) => round2(num(v) || 0);
/** Absolute difference in cents is within a tolerance. */
export const close = (a, b, tol = 0.01) => Math.abs(round2(a) - round2(b)) <= tol + 1e-9;

// ---------------------------------------------------------------- findings ----

/** One finding: a code, an amount (null when nothing is at stake in money) and a plain sentence. */
export const finding = (code, amount, detail) => ({ code, amount: amount === null || amount === undefined ? null : round2(amount), detail });

/** Count and total of findings by code, over items that each carry findings[]. */
export function byFinding(items) {
  const out = {};
  for (const i of items) for (const f of i.findings || []) { const b = (out[f.code] ||= { count: 0, amount: 0 }); b.count++; b.amount = round2(b.amount + (f.amount || 0)); }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)));
}
/** Count of items by status, in a fixed order. */
export function byStatus(items, order = []) {
  const out = Object.fromEntries(order.map((s) => [s, 0]));
  for (const i of items) out[i.status] = (out[i.status] || 0) + 1;
  return out;
}
/** Stable order for results: by a key, then by id. Results never depend on row order. */
export function sortBy(items, key = (i) => i.id) {
  return items.map((x, i) => ({ x, i, k: String(key(x) ?? '') })).sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : String(a.x.id) < String(b.x.id) ? -1 : String(a.x.id) > String(b.x.id) ? 1 : a.i - b.i)).map((e) => e.x);
}
/** Sum a field over rows into groups: { key: { count, [field]: total } }, keys sorted. */
export function rollup(rows, keyOf, fields = []) {
  const m = new Map();
  for (const r of rows) { const k = keyOf(r); if (k === null || k === undefined || k === '') continue; const g = m.get(k) || { key: k, count: 0, ...Object.fromEntries(fields.map((f) => [f, 0])) }; g.count++; for (const f of fields) g[f] = round2(g[f] + (Number(r[f]) || 0)); m.set(k, g); }
  return [...m.values()].sort((a, b) => (String(a.key) < String(b.key) ? -1 : 1));
}
