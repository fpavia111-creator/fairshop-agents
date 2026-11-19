// Customer and staff data masking. Every Fairshop tool result passes through here
// before it leaves the runtime, so the AI model that called the tool sees stable
// pseudonyms (CUS-3f2a9c1d) instead of shopper names and e-mail addresses, and
// [ADDRESS] / [PHONE] instead of street addresses and phone numbers. Files the tools
// write on this machine (worklists, drafts) keep the real values, because the people
// working the returns, claims and cash counts need them.
//
// What it is, honestly:
//   - It removes the direct identifiers below from what the model sees. Order numbers,
//     SKUs, amounts, dates, ship-to states and ZIP codes still reach the model in the
//     default "mask" mode; "strict" also cuts ZIP codes to three digits and replaces
//     order numbers with pseudonyms.
//   - It works from column and field names plus a few text patterns (e-mail, phone,
//     card numbers). A shopper's name typed into a free-text column the agent does not
//     know about can get through. Use "strict" when that matters.
//
// Pseudonyms are HMAC-SHA256 of the value with a per-installation key
// (<stateDir>/pii.key, created on first use, never returned), so the same shopper
// gets the same pseudonym in every result, and a pseudonym cannot be reversed
// without the key. A tool argument may be a pseudonym; tools match it with pii.same().

import { createHmac, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const PII_MODES = Object.freeze(['mask', 'strict', 'off']);
export const PII_KEY_FILE = 'pii.key';
export const PII_KINDS = Object.freeze(['name', 'email', 'phone', 'address', 'staff', 'partner', 'zip', 'order']);

/** Keys whose values describe the file's columns (field → header), never personal data. Free-text scrubbing still applies. */
const META_KEYS = new Set(['mapped', 'unmapped', 'missing', 'translated', 'columns', 'recognised_by', 'signature', 'also_called']);
const norm = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
const keys = (kind, list) => list.map((k) => [norm(k), kind]);

// Field names (any case or punctuation) → kind. Kinds marked strict are masked only in strict mode.
const KEY_KIND = new Map([
  ...keys('name', ['customer', 'customer_name', 'customer_full_name', 'buyer', 'buyer_name', 'shopper', 'shopper_name', 'ship_to_name', 'shipping_name', 'billing_name', 'recipient_name', 'recipient', 'first_name', 'last_name', 'full_name', 'purchaser', 'purchaser_name', 'subscriber', 'subscriber_name', 'cardholder', 'cardholder_name', 'gift_card_holder', 'holder_name', 'claimant']),
  ...keys('email', ['email', 'customer_email', 'buyer_email', 'shopper_email', 'email_address', 'purchaser_email', 'subscriber_email', 'affiliate_email', 'recipient_email', 'billing_email', 'contact_email', 'emails']),
  ...keys('phone', ['phone', 'phone_number', 'customer_phone', 'buyer_phone', 'shipping_phone', 'billing_phone', 'mobile', 'mobile_phone', 'telephone']),
  ...keys('address', ['address', 'address1', 'address2', 'address_line_1', 'address_line_2', 'street', 'street_address', 'ship_to_address', 'shipping_address', 'shipping_address1', 'billing_address', 'billing_address1', 'recipient_address', 'customer_address']),
  ...keys('staff', ['cashier', 'cashier_name', 'employee', 'employee_name', 'associate', 'clerk', 'staff', 'staff_name', 'counted_by', 'opened_by', 'closed_by']),
  // Affiliates and creators are often one person trading under their own name (final pass, 19 Nov 2026).
  ...keys('partner', ['affiliate', 'affiliate_name', 'partner', 'partner_name', 'publisher', 'publisher_name', 'creator', 'creator_name', 'influencer', 'influencer_name']),
  ...keys('zip', ['zip', 'zip_code', 'postal_code', 'ship_to_zip', 'shipping_zip', 'billing_zip', 'postcode']),
  ...keys('order', ['order_id', 'order_number', 'order_no']),
]);
const STRICT_ONLY = new Set(['zip', 'order']);
const PREFIX = { name: 'CUS', email: 'CUS', staff: 'STAFF', partner: 'AFF', order: 'ORD' };
const FIXED = { address: '[ADDRESS]', phone: '[PHONE]' };
// Minimum length before a registered value is also searched for inside free text.
const MIN_TEXT = { name: 4, email: 6, staff: 4, partner: 4, order: 4 };

/** Luhn check, so order numbers and tracking numbers of card length are not taken for card numbers. */
export function luhn(digits) {
  const d = String(digits).replace(/\D/g, ''); if (d.length < 13 || d.length > 19) return false;
  let s = 0; for (let i = 0; i < d.length; i++) { let x = Number(d[d.length - 1 - i]); if (i % 2) { x *= 2; if (x > 9) x -= 9; } s += x; }
  return s % 10 === 0;
}
const TEXT_PATTERNS = [
  // Card numbers written 4-4-4-4 or as 15-16 plain digits, and only when the Luhn check passes.
  [/\b(?:\d{4}[ -]){3}\d{4}\b|(?<![\d-])\b\d{15,16}\b(?![-\d])/g, (m) => (luhn(m) ? '[CARD]' : m)],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL]'],
  [/(?<![\d-])\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/g, '[PHONE]'],
];

// A value that is already a pseudonym or placeholder is left alone (results pass the masker more than once).
const ALREADY = /^((CUS|STAFF|ORD)-[0-9a-f]{8}|\[(ADDRESS|PHONE|EMAIL|CARD|ZIP)\]|\d{3}XX)$/;

/** Kind of a field name, or null. */
export const piiKindOf = (key, mode = 'mask') => { const k = KEY_KIND.get(norm(key)); return !k || (STRICT_ONLY.has(k) && mode !== 'strict') ? null : k; };

/** Name variants a person's name appears as in text: as given, "First Last" and "Last, First". */
function nameVariants(raw) {
  const s = String(raw).trim(); if (!s) return [];
  const out = new Set([s]);
  const m = /^([^,]+),\s*(.+)$/.exec(s);
  if (m) out.add(`${m[2]} ${m[1]}`.trim());
  else { const p = s.split(/\s+/); if (p.length >= 2) out.add(`${p.at(-1)}, ${p.slice(0, -1).join(' ')}`); }
  return [...out];
}
const nameKey = (s) => String(s).toLowerCase().split(/[^a-z0-9À-￿]+/).filter(Boolean).sort().join(' ');

/** Read or create the per-installation pseudonym key. */
export function loadPiiKey(stateDir) {
  if (!stateDir) return randomBytes(32);
  const f = join(stateDir, PII_KEY_FILE);
  if (existsSync(f)) { const h = readFileSync(f, 'utf8').trim(); if (/^[0-9a-f]{64}$/.test(h)) return Buffer.from(h, 'hex'); throw new Error(`${PII_KEY_FILE} in the state folder is not a 64-character hex key; restore it from backup or delete it (pseudonyms will change)`); }
  mkdirSync(dirname(f), { recursive: true });
  const k = randomBytes(32);
  writeFileSync(f, k.toString('hex') + '\n', { mode: 0o600 });
  try { chmodSync(f, 0o600); } catch { /* Windows */ }
  return k;
}

export class PiiMasker {
  constructor({ mode = 'mask', key = null } = {}) {
    if (!PII_MODES.includes(mode)) throw new Error(`pii mode must be one of ${PII_MODES.join(', ')}`);
    this.mode = mode;
    this.key = key || randomBytes(32);
    this.reset();
  }

  /** Forget the values registered for the last call. */
  reset() { this.seen = new Map(); this.counts = {}; this.index = null; }

  get on() { return this.mode !== 'off'; }

  /** Stable pseudonym for a value of one kind. A name and an e-mail share the CUS prefix but not the token. */
  token(kind, value) {
    const v = kind === 'name' || kind === 'staff' || kind === 'partner' ? nameKey(value) : String(value).trim().toLowerCase();
    return `${PREFIX[kind] || 'ID'}-${createHmac('sha256', this.key).update(`${kind}|${v}`).digest('hex').slice(0, 8)}`;
  }

  /** True when `given` (from the model) is `raw` itself or its pseudonym. */
  same(raw, given, kind = 'name') {
    const r = String(raw ?? '').trim(); const g = String(given ?? '').trim();
    if (!r || !g) return false;
    if (r.toLowerCase() === g.toLowerCase()) return true;
    return this.on && this.token(kind, r) === g;
  }

  /** What the model sees for one value of one kind. */
  maskValue(kind, value) {
    if (value === null || value === undefined || value === '' || !this.on) return value;
    if (Array.isArray(value)) return value.map((v) => this.maskValue(kind, v));
    if (typeof value === 'object') return value;
    const s = String(value);
    if (ALREADY.test(s)) return value;
    this.counts[kind] = (this.counts[kind] || 0) + 1;
    if (FIXED[kind]) { this.register(kind, s); return FIXED[kind]; }
    if (kind === 'zip') { const d = s.replace(/\D/g, ''); return d.length >= 3 ? `${d.slice(0, 3)}XX` : '[ZIP]'; }
    this.register(kind, s);
    return this.token(kind, s);
  }

  /** Remember a raw value so it is also replaced where it appears inside other text. */
  register(kind, raw) {
    if (!this.on || raw === null || raw === undefined) return;
    if (STRICT_ONLY.has(kind) && this.mode !== 'strict') return;
    if (kind === 'zip') return;
    const vals = kind === 'name' || kind === 'staff' || kind === 'partner' ? nameVariants(raw) : [String(raw).trim()];
    const rep = FIXED[kind] || this.token(kind, raw);
    // Leading and trailing punctuation is dropped for matching, so a value with junk in front of it
    // (a spreadsheet formula, a quote, a bullet) is still found where it appears in text.
    for (const v0 of vals) { const v = v0.replace(/^[^a-z0-9À-￿]+|[^a-z0-9À-￿]+$/gi, ''); if (v.length >= (MIN_TEXT[kind] || 4) && !this.seen.has(v.toLowerCase())) { this.seen.set(v.toLowerCase(), { value: v, rep }); this.index = null; } }
  }

  /** Register every personal-data field of plain records (used when a tool reads a source file). */
  registerRecords(rows, fieldKinds = {}) {
    if (!this.on || !Array.isArray(rows)) return;
    const cols = new Map();
    for (const r of rows.slice(0, 1)) if (r && typeof r === 'object') for (const k of Object.keys(r)) { const kind = fieldKinds[k] || piiKindOf(k, this.mode); if (kind && (!STRICT_ONLY.has(kind) || this.mode === 'strict')) cols.set(k, kind); }
    for (const [k, kind] of Object.entries(fieldKinds)) if (!STRICT_ONLY.has(kind) || this.mode === 'strict') cols.set(k, kind);
    if (!cols.size) return;
    for (const r of rows) if (r && typeof r === 'object') for (const [k, kind] of cols) if (r[k] !== null && r[k] !== undefined && r[k] !== '') this.register(kind, r[k]);
  }

  #buildIndex() {
    const idx = new Map();
    for (const [low, e] of this.seen) {
      const first = (/[a-z0-9À-￿]+/.exec(low) || [low])[0];
      if (!idx.has(first)) idx.set(first, []);
      idx.get(first).push({ low, ...e });
    }
    for (const list of idx.values()) list.sort((a, b) => b.low.length - a.low.length);
    this.index = idx;
  }

  /** Replace registered values and e-mail/phone/card patterns inside free text. */
  maskText(s) {
    if (!this.on || typeof s !== 'string' || !s) return s;
    if (ALREADY.test(s)) return s;
    let out = s;
    // Registered values first, so a known shopper's e-mail becomes their pseudonym rather than [EMAIL].
    if (this.seen.size) {
      if (!this.index) this.#buildIndex();
      const low = out.toLowerCase(); let res = ''; let i = 0;
      const word = /[a-z0-9À-￿]+/g; let m;
      while ((m = word.exec(low))) {
        if (m.index < i) continue;
        const before = m.index === 0 || !/[a-z0-9À-￿]/.test(low[m.index - 1]);
        const cands = before ? this.index.get(m[0]) : null;
        if (cands) {
          const hit = cands.find((c) => low.startsWith(c.low, m.index) && !/[a-z0-9À-￿]/.test(low[m.index + c.low.length] || ' '));
          if (hit) { res += out.slice(i, m.index) + hit.rep; i = m.index + hit.low.length; word.lastIndex = i; this.counts.text = (this.counts.text || 0) + 1; continue; }
        }
      }
      out = res + out.slice(i);
    }
    for (const [re, rep] of TEXT_PATTERNS) out = out.replace(re, (m) => { const r = typeof rep === 'function' ? rep(m) : rep; if (r !== m) this.counts.pattern = (this.counts.pattern || 0) + 1; return r; });
    return out;
  }

  /** Masked deep copy of a tool result: personal-data fields first, then free text everywhere. */
  maskResult(value) {
    if (!this.on) return value;
    const byKey = (v, key, depth) => {
      if (depth > 40) return v;
      const kind = key === null ? null : piiKindOf(key, this.mode);
      if (Array.isArray(v)) return v.map((x) => (kind && (typeof x !== 'object' || x === null) ? this.maskValue(kind, x) : byKey(x, kind ? null : key, depth + 1)));
      if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = META_KEYS.has(k) ? x : byKey(x, k, depth + 1); return o; }
      // Counts and flags under a personal-data key (by_reason.customer: 3) are not identifiers.
      if (kind && (typeof v === 'boolean' || typeof v === 'number')) return v;
      return kind ? this.maskValue(kind, v) : v;
    };
    const keyed = byKey(value, null, 0);
    const text = (v, depth) => {
      if (depth > 40) return v;
      if (typeof v === 'string') return this.maskText(v);
      if (Array.isArray(v)) return v.map((x) => text(x, depth + 1));
      if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[this.maskText(k)] = META_KEYS.has(k) ? x : text(x, depth + 1); return o; }
      return v;
    };
    return text(keyed, 0);
  }

  /** What was masked in this call, for the result and the audit line. */
  report() {
    const n = Object.values(this.counts).reduce((s, x) => s + x, 0);
    return n ? { mode: this.mode, masked: n, kinds: Object.keys(this.counts).filter((k) => !['text', 'pattern'].includes(k)).sort() } : null;
  }
}
