import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, AS_OF, LIMITS } from 'fairshop-core';
import { CARD_FIELDS, ACTIVITY_FIELDS, GIFT_SETTINGS_SCHEMA, giftLiability, entryText } from './giftcards.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  cards: { type: 'string', description: 'Gift card or store credit export under --root: card (last characters), issued date, value, source (sale, manual, refund, promo), order, customer e-mail, current balance' },
  activity: { type: 'string', description: 'Card activity under --root: card, date, type (redeem, issue, adjust), amount, order' },
  settings: { type: 'string', description: 'Optional settings JSON: manual_review_over, dormancy_days, promo_is_liability, age_edges' },
  as_of: AS_OF,
};
const run = (a, ctx) => giftLiability(ctx.records(a.cards, 'cards'), ctx.records(a.activity, 'activity'), a.settings ? ctx.readJson(a.settings, 'gift_settings') : {}, { asOf: a.as_of });
const line = (r) => `${r.cards} card(s), liability ${r.liability}: ${r.review} to review, ${r.dormant} dormant, ${r.ok} fine; promotional balances of ${r.promo_balance} left out.`;

export const manifest = shopAgent({
  pkg, prefix: 'giftcards', label: 'Fairshop Gift Cards',
  description: 'Works out gift card and store credit liability from card and activity exports, by age: balances that do not match the activity, cards spent below zero, large manual issues with no order, redemptions before issue, and dormant cards. Drafts the liability entry; a person books it.',
  files, required: ['cards', 'activity'],
  sources: { cards: { label: 'Gift cards and store credit', args: ['cards'], fields: CARD_FIELDS }, activity: { label: 'Card activity', args: ['activity'], fields: ACTIVITY_FIELDS } },
  configSchemas: { gift_settings: GIFT_SETTINGS_SCHEMA },
  run, line,
  check: { verb: 'liability', title: 'Work out gift card liability', description: 'Rebuild every card balance from its issue and activity, compare it with the reported balance, and total the liability by age.' },
  explain: { arg: 'card_id', argDescription: 'Card id from giftcards_liability', title: 'Explain one card', description: 'Show one card: issued, redeemed, balance and findings.', text: (i) => `${i.id}: ${i.status}, issued ${i.issued}, redeemed ${i.redeemed}, balance ${i.balance}${i.reported !== null ? ` (reported ${i.reported})` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'gift-cards', title: (r) => `Gift card and store credit liability as of ${r.as_of}`, description: 'Write gift-cards.csv and .html (liability by age, every card to review or dormant) into out_dir (default fairshop-out/giftcards).',
    columns: ['id', 'source', 'issued_date', 'issued', 'redeemed', 'reported', 'last_activity', 'age_bucket', 'status', 'balance', 'findings', 'reasons', 'decision'],
    htmlColumns: ['id', 'source', 'issued_date', 'issued', 'redeemed', 'reported', 'status', 'balance', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'source', 'issued_date', 'issued', 'redeemed', 'reported', 'last_activity', 'age_bucket'], 'balance'),
    sections: (r) => [{ title: 'By age', rows: r.by_age, columns: ['age', 'cards', 'liability'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }],
    limits: [LIMITS.files, 'Dormant cards are listed by your dormancy_days; what applies to them (expiry, breakage, unclaimed property) depends on where you sell and is for your adviser.', LIMITS.advice],
  },
  draft: {
    noun: 'liability_entry', verb: 'post', category: 'go_live',
    description: 'Write drafts/liability_entry-<date>.md: the liability from the card files, the ledger balance you give and the adjusting entry. Marked DRAFT. Posting goes through giftcards_request_post (one click); a person books it.',
    args: { gl_balance: { type: 'string', description: 'Gift card liability balance in your ledger today' }, liability_account: { type: 'string', description: 'Liability account name' }, offset_account: { type: 'string', description: 'Offset account name' } },
    build: (a, ctx, r) => { const d = entryText(r, a); return { id: r.as_of, text: d.text, amount: d.diff ?? r.liability, extra: { adjustment: d.diff } }; },
  },
  refused: [
    { name: 'gift_card_adjust', category: 'move_money', description: 'Fairshop Gift Cards never changes a card balance.' },
    { name: 'gift_card_deactivate', category: 'go_live', description: 'Fairshop Gift Cards never disables or expires a card.' },
  ],
  prompt: { name: 'gift_card_liability', title: 'Work out gift card liability', description: 'Walks the host model through gift card liability.',
    text: 'You are helping a bookkeeper with gift card liability, using fairshop-store-credit. Cards: {{cards}}. Activity: {{activity}}.\n\nRules: never say what the law requires for dormant cards; that is for their adviser. gift_card_adjust and gift_card_deactivate are blocked.\n\n1. Call giftcards_liability. Lead with the liability, then cards to review.\n2. giftcards_explain for a card.\n3. giftcards_write_report.\n4. Offer giftcards_draft_liability_entry with the ledger balance; giftcards_request_post only when asked (one named click).' },
});
