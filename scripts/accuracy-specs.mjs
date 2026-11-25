// What each agent's fixtures plant, how the clean set removes it, and one-field mutation cases.
// Read by scripts/accuracy.mjs. Taken from each packages/<agent>/fixtures/README.md (final pass, 19 Nov 2026).
//
//   planted    { itemId: [finding codes] }  every problem the README plants, as the check names the item
//   quiet      [itemId]                     near-misses the README plants as fine: they must have no finding
//   clean      edits that turn the demo files into the clean set (no finding expected anywhere)
//   mutations  [{ id, op | ops, expect: [itemId, code] }]  one edit to the clean set, one expected finding
//
// Edits: ['set', file, where, values] sets columns on every matching row ('setLast': the last match only),
// ['drop', file, where] removes matching rows ('dropLast': the last match), ['add', file, row] appends a row.
export const SPECS = {
  'fairshop-payouts': {
    planted: {
      '112-0000002-0000002': ['paid_short'], '112-0000003-0000003': ['not_paid_out'], 'E-3001': ['fee_above_rate'],
      1002: ['not_paid_out'], 1005: ['refund_not_deducted'], 1006: ['paid_twice'],
      'P-2003:9999': ['no_matching_order'], 'P-2003:reserve:-100': ['payout_adjustment'],
    },
    quiet: ['1003', '1007', '1008'],
    clean: [
      ['set', 'payouts.csv', { order_id: '112-0000002-0000002' }, { gross: '42.00', fee: '6.30', net: '35.70' }],
      ['add', 'payouts.csv', { payout_id: 'S-7001', payout_date: '2026-11-04', order_id: '112-0000003-0000003', type: 'Order', gross: '99.99', fee: '14.99', net: '85.00', channel: 'Amazon' }],
      ['set', 'payouts.csv', { order_id: 'E-3001' }, { fee: '3.00', net: '32.00' }],
      ['add', 'payouts.csv', { payout_id: 'P-2001', payout_date: '2026-11-01', order_id: '#1002', type: 'charge', gross: '89.50', fee: '2.80', net: '86.70', channel: 'Shopify' }],
      ['add', 'payouts.csv', { payout_id: 'P-2002', payout_date: '2026-11-04', order_id: '#1005', type: 'refund', gross: '-64.00', fee: '0.00', net: '-64.00', channel: 'Shopify' }],
      ['dropLast', 'payouts.csv', { order_id: '#1006' }],
      ['drop', 'payouts.csv', { order_id: '#9999' }],
      ['drop', 'payouts.csv', { type: 'reserve' }],
    ],
    mutations: [
      { id: 'short-by-10', op: ['set', 'payouts.csv', { order_id: '#1001' }, { gross: '110.00', net: '106.22' }], expect: ['1001', 'paid_short'] },
      { id: 'payout-line-missing', op: ['drop', 'payouts.csv', { order_id: '#1001' }], expect: ['1001', 'not_paid_out'] },
      { id: 'etsy-fee-11pct', op: ['set', 'payouts.csv', { order_id: 'E-3002' }, { fee: '6.00', net: '46.00' }], expect: ['E-3002', 'fee_above_rate'] },
    ],
  },

  'fairshop-marketplace-fees': {
    planted: {
      'amazon:A-1003:referral:2026-10-03:6': ['fee_over_schedule'], 'amazon:A-1006:fba fulfillment:2026-10-10:4.1': ['fee_over_schedule'],
      'etsy:E-2003:transaction:2026-11-03:1.6': ['fee_over_schedule'], 'amazon:A-1008:inbound placement fee:2026-10-20:12': ['fee_not_in_schedule'],
      'ebay:B-3002:final value:2026-10-09:6': ['fee_without_sale'],
    },
    quiet: ['amazon:A-1004:referral:2026-10-08:8', 'amazon:A-1007:referral:2026-10-15:0.3'],
    clean_note: 'The effective-rate moves (Amazon referral September to October, Etsy transaction October to November) are a separate list in the result, not items, so they are not counted here.',
    clean: [
      ['set', 'fees.csv', { order_id: 'A-1003' }, { fee: '-4.50' }],
      ['set', 'fees.csv', { order_id: 'A-1006' }, { fee: '-3.22' }],
      ['set', 'fees.csv', { order_id: 'E-2003' }, { fee: '-1.30' }],
      ['drop', 'fees.csv', { order_id: 'A-1008' }],
      ['set', 'fees.csv', { order_id: 'B-3002' }, { sale_amount: '42.26' }],
    ],
    mutations: [
      { id: 'referral-18pct', op: ['set', 'fees.csv', { order_id: 'A-1002' }, { fee: '-3.60' }], expect: ['amazon:A-1002:referral:2026-09-12:3.6', 'fee_over_schedule'] },
      { id: 'fba-fee-up', op: ['set', 'fees.csv', { order_id: 'A-1005' }, { fee: '-3.50' }], expect: ['amazon:A-1005:fba fulfillment:2026-10-10:3.5', 'fee_over_schedule'] },
      { id: 'unknown-fee-type', op: ['set', 'fees.csv', { order_id: 'E-2002' }, { fee_type: 'Offsite ads fee' }], expect: ['etsy:E-2002:advertising:2026-10-05:0.85', 'fee_not_in_schedule'] },
    ],
  },

  'fairshop-fba-reimbursements': {
    planted: {
      'SKU:MUG-01': ['lost_not_reimbursed'], 'ORDER:113-1111111-1111111:MUG-01': ['refund_no_return'],
      'SKU:BAG-04': ['window_closed'], 'ORDER:113-4444444-4444444:BAG-04': ['window_closed'], 'REIMB:R-2': ['reimbursed_low'],
    },
    quiet: ['SKU:CAP-03', 'ORDER:113-3333333-3333333:CAP-03', 'SKU:TEE-02', 'ORDER:113-2222222-2222222:TEE-02', 'ORDER:113-5555555-5555555:MUG-01'],
    clean: [
      ['add', 'reimbursements.csv', { approval_date: '2026-10-25', reimbursement_id: 'R-4', sku: 'MUG-01', reason: 'Lost_Warehouse', quantity: '2', amount: '24.00' }],
      ['add', 'returns.csv', { order_id: '113-1111111-1111111', sku: 'MUG-01', return_date: '2026-09-18', quantity: '1' }],
      ['drop', 'adjustments.csv', { transaction_id: 'TX-9005' }],
      ['drop', 'refunds.csv', { order_id: '113-4444444-4444444' }],
      ['set', 'reimbursements.csv', { reimbursement_id: 'R-2' }, { amount: '30.00' }],
    ],
    mutations: [
      { id: 'paid-a-third', op: ['set', 'reimbursements.csv', { reimbursement_id: 'R-1' }, { amount: '10.00' }], expect: ['REIMB:R-1', 'reimbursed_low'] },
      { id: 'return-never-came', op: ['drop', 'returns.csv', { order_id: '113-2222222-2222222' }], expect: ['ORDER:113-2222222-2222222:TEE-02', 'refund_no_return'] },
      { id: 'one-more-lost', op: ['add', 'adjustments.csv', { date: '2026-10-01', fnsku: 'X0TEE02', sku: 'TEE-02', reason: 'M', quantity: '-1', transaction_id: 'TX-9100' }], expect: ['SKU:TEE-02', 'lost_not_reimbursed'] },
    ],
  },

  'fairshop-fba-storage-fees': {
    planted: {
      'FEE:CUP-3:2026-10': ['storage_over_rate'], 'LOT:LAMP-1:2026-06-01': ['aged_bracket_soon'],
      'LOT:BOX-4:2025-10-01': ['aged_in_bracket'], 'LOT:RUG-2:2026-05-01': ['aged_in_bracket'],
      'SKU:BOX-4': ['storage_exceeds_margin'], 'SKU:RUG-2': ['storage_exceeds_margin'],
    },
    clean: [
      ['set', 'storage.csv', { sku: 'CUP-3' }, { fee: '24.00' }],
      ['set', 'lots.csv', { sku: 'LAMP-1', received_date: '2026-06-01' }, { received_date: '2026-08-01' }],
      ['set', 'lots.csv', { sku: 'BOX-4' }, { received_date: '2026-09-01' }],
      ['set', 'lots.csv', { sku: 'RUG-2' }, { received_date: '2026-09-01' }],
      ['set', 'storage.csv', { sku: 'RUG-2' }, { unit_volume: '3.0', fee: '45.00' }],
    ],
    mutations: [
      { id: 'fee-10-over', op: ['set', 'storage.csv', { sku: 'LAMP-1', month: '2026-10' }, { fee: '130.00' }], expect: ['FEE:LAMP-1:2026-10', 'storage_over_rate'] },
      { id: 'lot-175-days', op: ['set', 'lots.csv', { sku: 'LAMP-1', received_date: '2026-10-01' }, { received_date: '2026-05-25' }], expect: ['LOT:LAMP-1:2026-05-25', 'aged_bracket_soon'] },
    ],
  },

  'fairshop-processor-reserves': {
    planted: { rsv_1: ['release_overdue'], rsv_2: ['hold_above_terms'], pp_dsp_1: ['dispute_open_long'] },
    quiet: ['rsv_3', 'pp_rsv_1'],
    clean: [
      ['add', 'balance.csv', { date: '2026-09-29', processor: 'Stripe', type: 'reserve release', amount: '100.00', reference: 'rsv_1' }],
      ['set', 'balance.csv', { reference: 'rsv_2', type: 'reserve hold' }, { amount: '-200.00' }],
      ['set', 'balance.csv', { reference: 'rsv_2', type: 'reserve release' }, { amount: '200.00' }],
      ['set', 'balance.csv', { reference: 'pp_dsp_1' }, { date: '2026-10-20' }],
    ],
    mutations: [
      { id: 'hold-16pct', op: ['set', 'balance.csv', { reference: 'rsv_3', type: 'reserve hold' }, { amount: '-80.00' }], expect: ['rsv_3', 'hold_above_terms'] },
      { id: 'release-missing', op: ['drop', 'balance.csv', { reference: 'rsv_2', type: 'reserve release' }], expect: ['rsv_2', 'release_overdue'] },
    ],
  },

  'fairshop-settlement-journals': {
    planted: { 'S-200': ['unmapped_description', 'deposit_not_found'] },
    quiet: ['S-100'],
    clean: [
      ['drop', 'settlement.csv', { description: 'Inbound Placement Service Fee' }],
      ['add', 'deposits.csv', { date: '2026-11-14', amount: '68.00', reference: 'AMAZON SETTLEMENT S-200' }],
    ],
    mutations: [
      { id: 'deposit-short', op: ['set', 'deposits.csv', { reference: 'AMAZON SETTLEMENT S-100' }, { amount: '60.00' }], expect: ['S-100', 'deposit_differs'] },
      { id: 'new-fee-name', op: ['set', 'settlement.csv', { description: 'Subscription Fee' }, { description: 'Advertising Fee' }], expect: ['S-100', 'unmapped_description'] },
    ],
  },

  'fairshop-marketplace-claims': {
    planted: {
      'AZ-1': ['delivered_with_proof'], 'AZ-2': ['no_signature_over_threshold'], 'EB-1': ['evidence_needed'],
      'EB-2': ['not_delivered', 'late_response'], 'WM-1': ['no_tracking'],
    },
    quiet: ['AZ-3'],
    clean_note: 'No clean set: every open claim gets a finding that says how to answer it (including "delivered, with proof"), so a file of open claims never has zero findings. Mutation cases run on the demo files.',
    clean: null,
    mutations: [
      { id: 'big-order-no-signature', op: ['set', 'claims.csv', { claim_id: 'AZ-1' }, { amount: '900.00' }], expect: ['AZ-1', 'no_signature_over_threshold'] },
      { id: 'respond-by-passed', op: ['set', 'claims.csv', { claim_id: 'EB-1' }, { respond_by: '2026-11-10' }], expect: ['EB-1', 'late_response'] },
      { id: 'tracking-found', op: ['add', 'shipments.csv', { order_id: 'WM-5001', carrier: 'UPS', tracking: '1ZEXAMPLE0009', ship_date: '2026-11-10', delivered_date: '2026-11-13', signature: 'no' }], expect: ['WM-1', 'delivered_with_proof'] },
    ],
  },

  'fairshop-refunds-returns': {
    planted: {
      '1002:TEE-1': ['refunded_not_returned'], '1004:LAMP-3': ['full_refund_damaged'], '1005:TEE-1': ['refunded_twice'],
      '1006:MUG-2': ['refund_over_price'], '1007:BAG-4': ['returned_not_refunded'],
    },
    quiet: ['1001:TEE-1', '1003:MUG-2'],
    clean: [
      ['add', 'returns.csv', { order_id: '1002', sku: 'TEE-1', received_date: '2026-10-10', qty: '1', condition: 'good' }],
      ['set', 'returns.csv', { order_id: '1004' }, { condition: 'good' }],
      ['dropLast', 'refunds.csv', { order_id: '1005' }],
      ['set', 'refunds.csv', { order_id: '1006' }, { amount: '18.00' }],
      ['add', 'refunds.csv', { order_id: '1007', sku: 'BAG-4', refund_date: '2026-11-01', amount: '45.00', qty: '1', channel: 'Shopify', customer_email: 'gale.prior@example.test' }],
    ],
    mutations: [
      { id: 'return-missing', op: ['drop', 'returns.csv', { order_id: '1001' }], expect: ['1001:TEE-1', 'refunded_not_returned'] },
      { id: 'refund-30-on-18', op: ['set', 'refunds.csv', { order_id: '1003' }, { amount: '30.00' }], expect: ['1003:MUG-2', 'refund_over_price'] },
      { id: 'came-back-damaged', op: ['set', 'returns.csv', { order_id: '1006' }, { condition: 'damaged' }], expect: ['1006:MUG-2', 'full_refund_damaged'] },
    ],
  },

  'fairshop-return-reasons': {
    planted: { 'SKU:DRESS-1': ['sku_high_return_rate', 'listing_mismatch'], 'CUST-debe15abbf': ['repeat_returner'] },
    quiet: ['SKU:SHOE-2', 'SKU:MUG-3'],
    clean: [
      ['drop', 'returns.csv', { order_id: 'D1' }],
      ['drop', 'returns.csv', { order_id: 'D2' }],
      ['drop', 'returns.csv', { order_id: 'D4' }],
    ],
    mutations: [
      { id: 'dress-returns-up', op: ['add', 'returns.csv', { order_id: 'D5', sku: 'DRESS-1', return_date: '2026-09-24', reason: 'Not as described', qty: '2', customer_email: 'pia.sorel@example.test', customer_name: 'Pia Sorel' }], expect: ['SKU:DRESS-1', 'sku_high_return_rate'] },
      { id: 'kit-returns-3-of-4', ops: [
        ['add', 'returns.csv', { order_id: 'S1', sku: 'SHOE-2', return_date: '2026-10-01', reason: 'Changed mind', qty: '1', customer_email: 'kit.larkspur@example.test', customer_name: 'Kit Larkspur' }],
        ['add', 'returns.csv', { order_id: 'D2', sku: 'DRESS-1', return_date: '2026-09-20', reason: 'Changed mind', qty: '1', customer_email: 'kit.larkspur@example.test', customer_name: 'Kit Larkspur' }],
      ], expect: ['CUST-debe15abbf', 'repeat_returner'] },
    ],
  },

  'fairshop-coupon-abuse': {
    planted: {
      2002: ['new_customer_repeat'], 2004: ['new_customer_repeat', 'same_address_many_accounts'], 2005: ['below_minimum'], 2007: ['over_limit'],
      2011: ['over_limit'], 2012: ['expired'], 2013: ['staff_code_outside'], 2015: ['unknown_code'],
    },
    quiet: ['2003', '2006', '2008', '2009', '2010', '2014'],
    clean: [
      ['set', 'orders.csv', { order_id: '2002' }, { discount_code: '', discount_amount: '0' }],
      ['set', 'orders.csv', { order_id: '2004' }, { discount_code: '', discount_amount: '0' }],
      ['set', 'orders.csv', { order_id: '2005' }, { subtotal: '32.00' }],
      ['set', 'orders.csv', { order_id: '2007' }, { discount_code: '', discount_amount: '0' }],
      ['set', 'orders.csv', { order_id: '2011' }, { discount_code: '', discount_amount: '0' }],
      ['set', 'orders.csv', { order_id: '2012' }, { discount_code: '', discount_amount: '0' }],
      ['set', 'orders.csv', { order_id: '2013' }, { customer_email: 'kai.lund@examplegoods.test' }],
      ['set', 'orders.csv', { order_id: '2015' }, { discount_code: '', discount_amount: '0' }],
    ],
    mutations: [
      { id: 'under-minimum', op: ['set', 'orders.csv', { order_id: '2003' }, { subtotal: '25.00' }], expect: ['2003', 'below_minimum'] },
      { id: 'after-end-date', op: ['set', 'orders.csv', { order_id: '2006' }, { order_date: '2027-01-05' }], expect: ['2006', 'expired'] },
      { id: 'staff-code-outside', op: ['set', 'orders.csv', { order_id: '2014' }, { customer_email: 'mia.cole@example.test' }], expect: ['2014', 'staff_code_outside'] },
    ],
  },

  'fairshop-store-credit': {
    planted: { 'GC-1003': ['dormant'], 'GC-1004': ['manual_issue_no_order'], 'GC-1005': ['balance_mismatch'], 'GC-1006': ['balance_mismatch', 'overdrawn'] },
    quiet: ['GC-1002', 'GC-1007'],
    clean_note: 'The overdrawn card (GC-1006) is planted with a reported balance of 0 while its activity says -5, so it is counted with both of its findings.',
    clean: [
      ['add', 'activity.csv', { card_id: 'GC-1003', date: '2026-10-01', type: 'redeem', amount: '-10.00', order_id: '3103' }],
      ['set', 'cards.csv', { card_id: 'GC-1003' }, { balance: '65.00' }],
      ['set', 'cards.csv', { card_id: 'GC-1004' }, { source: 'sale', order_id: '3004' }],
      ['set', 'cards.csv', { card_id: 'GC-1005' }, { balance: '15.00' }],
      ['set', 'activity.csv', { card_id: 'GC-1006', date: '2026-10-12' }, { amount: '-10.00' }],
    ],
    mutations: [
      { id: 'balance-off-by-5', op: ['set', 'cards.csv', { card_id: 'GC-1001' }, { balance: '25.00' }], expect: ['GC-1001', 'balance_mismatch'] },
      { id: 'issued-411-days-ago', op: ['set', 'cards.csv', { card_id: 'GC-1002' }, { issued_date: '2025-10-01' }], expect: ['GC-1002', 'dormant'] },
      { id: 'spent-past-value', op: ['add', 'activity.csv', { card_id: 'GC-1001', date: '2026-10-20', type: 'redeem', amount: '-25.00', order_id: '3111' }], expect: ['GC-1001', 'overdrawn'] },
    ],
  },

  'fairshop-subscriptions': {
    planted: { 'SUB-2': ['failed_not_retried'], 'SUB-3': ['retries_exhausted'], 'SUB-4': ['card_expiring'], 'SUB-5': ['billing_gap'] },
    quiet: ['SUB-1', 'SUB-6', 'SUB-7'],
    clean: [
      ['add', 'payments.csv', { subscription_id: 'SUB-2', date: '2026-11-08', amount: '30.00', status: 'succeeded' }],
      ['add', 'payments.csv', { subscription_id: 'SUB-3', date: '2026-11-11', amount: '25.00', status: 'succeeded' }],
      ['set', 'subscriptions.csv', { subscription_id: 'SUB-3' }, { status: 'active', next_billing: '2026-12-01' }],
      ['set', 'subscriptions.csv', { subscription_id: 'SUB-4' }, { card_expiry: '2028-11' }],
      ['add', 'payments.csv', { subscription_id: 'SUB-5', date: '2026-10-01', amount: '30.00', status: 'succeeded' }],
      ['add', 'payments.csv', { subscription_id: 'SUB-5', date: '2026-11-01', amount: '30.00', status: 'succeeded' }],
    ],
    mutations: [
      { id: 'card-expires-at-billing', op: ['set', 'subscriptions.csv', { subscription_id: 'SUB-1' }, { card_expiry: '2026-12' }], expect: ['SUB-1', 'card_expiring'] },
      { id: 'failed-no-retry', op: ['set', 'payments.csv', { subscription_id: 'SUB-1', date: '2026-11-10' }, { status: 'failed', failure_reason: 'card_declined' }], expect: ['SUB-1', 'failed_not_retried'] },
      { id: 'payment-missing', op: ['drop', 'payments.csv', { subscription_id: 'SUB-1', date: '2026-11-10' }], expect: ['SUB-1', 'billing_gap'] },
    ],
  },

  'fairshop-affiliate-commissions': {
    planted: {
      'AC-2': ['commission_on_refunded'], 'AC-3': ['rate_above_terms'], 'AC-4': ['duplicate_commission'], 'AC-5': ['order_not_found'],
      'AC-6': ['self_referral'], 'AC-7': ['sale_above_order'], 'AC-8': ['commission_on_refunded'],
    },
    quiet: ['AC-1'],
    clean: [
      ['drop', 'commissions.csv', { action_id: 'AC-2' }],
      ['set', 'commissions.csv', { action_id: 'AC-3' }, { commission: '6.00' }],
      ['drop', 'commissions.csv', { action_id: 'AC-4' }],
      ['drop', 'commissions.csv', { action_id: 'AC-5' }],
      ['set', 'orders.csv', { order_id: '5004' }, { customer_email: 'zoe.ames@example.test' }],
      ['set', 'commissions.csv', { action_id: 'AC-7' }, { sale_amount: '100.00', commission: '10.00' }],
      ['set', 'commissions.csv', { action_id: 'AC-8' }, { sale_amount: '20.00', commission: '2.00' }],
    ],
    mutations: [
      { id: 'rate-15pct', op: ['set', 'commissions.csv', { action_id: 'AC-1' }, { commission: '15.00' }], expect: ['AC-1', 'rate_above_terms'] },
      { id: 'order-refunded', op: ['set', 'orders.csv', { order_id: '5001' }, { status: 'refunded', refunded: '100.00' }], expect: ['AC-1', 'commission_on_refunded'] },
      { id: 'order-unknown', op: ['set', 'commissions.csv', { action_id: 'AC-1' }, { order_id: '5098' }], expect: ['AC-1', 'order_not_found'] },
    ],
  },

  'fairshop-sales-tax': {
    planted: { T2: ['under_collected'], T3: ['under_collected'], T4: ['over_collected'], T6: ['collected_not_registered'], T10: ['exempt_no_certificate'] },
    quiet: ['T1', 'T5', 'T7', 'T8', 'T9'],
    clean: [
      ['set', 'orders.csv', { order_id: 'T2' }, { tax_collected: '9.90' }],
      ['set', 'orders.csv', { order_id: 'T3' }, { tax_collected: '4.13' }],
      ['set', 'orders.csv', { order_id: 'T4' }, { tax_collected: '9.00' }],
      ['set', 'orders.csv', { order_id: 'T6' }, { tax_collected: '0' }],
      ['set', 'orders.csv', { order_id: 'T10' }, { exemption_id: 'EX-77' }],
    ],
    mutations: [
      { id: 'tax-short', op: ['set', 'orders.csv', { order_id: 'T1' }, { tax_collected: '15.00' }], expect: ['T1', 'under_collected'] },
      { id: 'tax-in-unregistered-state', op: ['set', 'orders.csv', { order_id: 'T5' }, { tax_collected: '9.00' }], expect: ['T5', 'collected_not_registered'] },
      { id: 'certificate-missing', op: ['set', 'orders.csv', { order_id: 'T9' }, { exemption_id: '' }], expect: ['T9', 'exempt_no_certificate'] },
    ],
  },

  'fairshop-nexus-thresholds': {
    planted: { WA: ['threshold_crossed'], CA: ['threshold_approaching'], FL: ['no_threshold'] },
    quiet: ['CO', 'NY', 'TX'],
    clean: [
      ['set', 'orders.csv', { order_id: 'N4' }, { amount: '10000.00' }],
      ['set', 'orders.csv', { order_id: 'N5' }, { amount: '300000.00' }],
      ['drop', 'orders.csv', { order_id: 'N12' }],
    ],
    mutations: [
      { id: 'co-direct-sales-up', op: ['set', 'orders.csv', { order_id: 'N6' }, { amount: '110000.00' }], expect: ['CO', 'threshold_crossed'] },
      { id: 'ny-sales-near', op: ['set', 'orders.csv', { order_id: 'N8' }, { amount: '400000.00' }], expect: ['NY', 'threshold_approaching'] },
    ],
  },

  'fairshop-inventory-listings': {
    planted: {
      'eBay:EB-1': ['listed_over_available'], 'Shopify:SH-2': ['listed_over_available'], 'Etsy:ET-4': ['listed_zero_with_stock'],
      'Walmart:WM-4': ['inactive_with_stock'], 'Shopify:SH-9': ['unknown_sku'], 'SKU:TOWEL-3': ['stock_not_listed'],
    },
    quiet: ['Shopify:SH-1', 'Amazon:AMZ-1', 'Amazon:AMZ-2'],
    clean: [
      ['set', 'listings.csv', { listing_id: 'EB-1' }, { listed_qty: '33' }],
      ['set', 'listings.csv', { listing_id: 'SH-2' }, { listed_qty: '0' }],
      ['set', 'listings.csv', { listing_id: 'ET-4' }, { listed_qty: '10' }],
      ['drop', 'listings.csv', { listing_id: 'WM-4' }],
      ['drop', 'listings.csv', { listing_id: 'SH-9' }],
      ['add', 'listings.csv', { channel: 'Shopify', sku: 'TOWEL-3', listing_id: 'SH-3', listed_qty: '25', status: 'active', fulfillment: 'merchant' }],
    ],
    mutations: [
      { id: 'one-over', op: ['set', 'listings.csv', { listing_id: 'SH-1' }, { listed_qty: '36' }], expect: ['Shopify:SH-1', 'listed_over_available'] },
      { id: 'fba-listed-zero', op: ['set', 'listings.csv', { listing_id: 'AMZ-1' }, { listed_qty: '0' }], expect: ['Amazon:AMZ-1', 'listed_zero_with_stock'] },
      { id: 'listing-paused', op: ['set', 'listings.csv', { listing_id: 'ET-4' }, { status: 'inactive' }], expect: ['Etsy:ET-4', 'inactive_with_stock'] },
    ],
  },

  'fairshop-stockouts': {
    planted: { 'R6:ROPE-1': ['oversold'], 'R7:ROPE-1': ['oversold'], 'SKU:ROPE-1': ['out_of_stock_days', 'reorder_now'] },
    quiet: ['SKU:KNOT-2', 'SKU:HOOK-3'],
    clean: [
      ['set', 'snapshots.csv', { date: '2026-11-06', sku: 'ROPE-1' }, { on_hand: '89' }],
      ['set', 'snapshots.csv', { date: '2026-11-07', sku: 'ROPE-1' }, { on_hand: '88' }],
      ['set', 'snapshots.csv', { date: '2026-11-08', sku: 'ROPE-1' }, { on_hand: '88' }],
      ['set', 'snapshots.csv', { date: '2026-11-09', sku: 'ROPE-1' }, { on_hand: '86' }],
      ['set', 'snapshots.csv', { date: '2026-11-10', sku: 'ROPE-1' }, { on_hand: '84' }],
      ['set', 'orders.csv', { order_id: 'R6' }, { status: 'paid', cancel_reason: '' }],
    ],
    mutations: [
      { id: 'knot-empty-a-day', op: ['set', 'snapshots.csv', { date: '2026-11-03', sku: 'KNOT-2' }, { on_hand: '0' }], expect: ['SKU:KNOT-2', 'out_of_stock_days'] },
      { id: 'rope-cover-short', op: ['set', 'snapshots.csv', { date: '2026-11-10', sku: 'ROPE-1' }, { on_hand: '20' }], expect: ['SKU:ROPE-1', 'reorder_now'] },
    ],
  },

  'fairshop-product-data': {
    planted: {
      'Amazon:P2': ['gtin_invalid'], 'Etsy:P3': ['title_too_long'], 'Shopify:P4': ['missing_fields', 'images_below_min'],
      'Shopify:P5': ['weight_zero', 'price_zero'], 'Shopify:P6': ['gtin_shared'], 'eBay:P7': ['description_short'],
    },
    quiet: ['Amazon:P1'],
    clean: [
      ['set', 'products.csv', { sku: 'P2' }, { gtin: '9520000000066' }],
      ['set', 'products.csv', { sku: 'P3' }, { title: 'Handmade speckled ceramic coffee mug, 12 oz' }],
      ['set', 'products.csv', { sku: 'P4' }, { gtin: '9520000000073', brand: 'Example Pottery', image_count: '2' }],
      ['set', 'products.csv', { sku: 'P5' }, { weight: '0.1', price: '2.00' }],
      ['set', 'products.csv', { sku: 'P6' }, { gtin: '9520000000080' }],
      ['set', 'products.csv', { sku: 'P7' }, { description: 'A small stoneware vase with a narrow neck, glazed in speckled cream, for dried flowers and single stems.' }],
    ],
    mutations: [
      { id: 'weight-zero', op: ['set', 'products.csv', { sku: 'P1' }, { weight: '0' }], expect: ['Amazon:P1', 'weight_zero'] },
      { id: 'check-digit-off', op: ['set', 'products.csv', { sku: 'P1' }, { gtin: '9520000000013' }], expect: ['Amazon:P1', 'gtin_invalid'] },
      { id: 'brand-blank', op: ['set', 'products.csv', { sku: 'P7' }, { brand: '' }], expect: ['eBay:P7', 'missing_fields'] },
    ],
  },

  'fairshop-duplicate-listings': {
    planted: { 'Amazon:B0EX002': ['duplicate_sku_listing'], 'Amazon:B0EX003': ['near_duplicate_title'], 'GTIN:9520000000011': ['gtin_shared'], 'Etsy:ET-20': ['orphan_listing'] },
    quiet: ['Amazon:B0EX001', 'eBay:EB-10', 'Etsy:ET-21'],
    clean: [
      ['drop', 'listings.csv', { listing_id: 'B0EX002' }],
      ['set', 'listings.csv', { listing_id: 'B0EX003' }, { title: 'Speckled Ceramic Espresso Cup 3 oz' }],
      ['set', 'listings.csv', { listing_id: 'EB-11' }, { gtin: '9520000000097' }],
      ['add', 'catalog.csv', { sku: 'VASE-9' }],
    ],
    mutations: [
      { id: 'second-amazon-listing', op: ['add', 'listings.csv', { channel: 'Amazon', listing_id: 'B0EX004', sku: 'MUG-2', title: 'Espresso Cup Speckled Glaze', gtin: '9520000000035', price: '18.00', status: 'active' }], expect: ['Amazon:B0EX004', 'duplicate_sku_listing'] },
      { id: 'sku-not-in-catalog', op: ['set', 'listings.csv', { listing_id: 'EB-10' }, { sku: 'MUG-7' }], expect: ['eBay:EB-10', 'orphan_listing'] },
      { id: 'gtin-reused', op: ['set', 'listings.csv', { listing_id: 'EB-11' }, { gtin: '9520000000011' }], expect: ['GTIN:9520000000011', 'gtin_shared'] },
    ],
  },

  'fairshop-map-pricing': {
    planted: {
      'Example Goods|LAMP-1': ['own_below_map'], 'Brightway Home|LAMP-1': ['below_map', 'repeat_below_map'],
      'Northgate Supply|RUG-2': ['below_map'], 'Brightway Home|VASE-3': ['sku_not_on_map_list'],
    },
    quiet: ['Clearwater Outlet|RUG-2', 'Northgate Supply|LAMP-1'],
    clean: [
      ['set', 'prices.csv', { seller: 'Example Goods', channel: 'Amazon' }, { advertised_price: '49.99' }],
      ['set', 'prices.csv', { seller: 'Brightway Home', sku: 'LAMP-1' }, { advertised_price: '49.99' }],
      ['set', 'prices.csv', { seller: 'Northgate Supply', sku: 'RUG-2' }, { advertised_price: '129.00' }],
      ['drop', 'prices.csv', { sku: 'VASE-3' }],
    ],
    mutations: [
      { id: 'reseller-under', op: ['set', 'prices.csv', { seller: 'Northgate Supply', sku: 'LAMP-1' }, { advertised_price: '45.00' }], expect: ['Northgate Supply|LAMP-1', 'below_map'] },
      { id: 'own-store-under', op: ['set', 'prices.csv', { seller: 'Example Goods', channel: 'Shopify' }, { advertised_price: '39.99' }], expect: ['Example Goods|LAMP-1', 'own_below_map'] },
      { id: 'not-exempt-seller', op: ['set', 'prices.csv', { seller: 'Clearwater Outlet' }, { seller: 'Example Reseller B' }], expect: ['Example Reseller B|RUG-2', 'below_map'] },
    ],
  },

  'fairshop-sku-margins': {
    planted: { 'Shopify|BOWL-2': ['negative_margin'], 'Amazon|BOWL-2': ['below_floor'], 'Etsy|VASE-3': ['missing_cost'] },
    quiet: ['Amazon|MUG-1', 'Shopify|MUG-1'],
    clean: [
      ['set', 'labels.csv', { order_id: 'S4' }, { label_cost: '4.00' }],
      ['set', 'sales.csv', { order_id: 'S3' }, { revenue: '18.00' }],
      ['add', 'costs.csv', { sku: 'VASE-3', unit_cost: '10.00' }],
    ],
    mutations: [
      { id: 'cost-up', op: ['set', 'costs.csv', { sku: 'MUG-1' }, { unit_cost: '14.00' }], expect: ['Amazon|MUG-1', 'below_floor'] },
      { id: 'label-20', op: ['set', 'labels.csv', { order_id: 'S2' }, { label_cost: '20.00' }], expect: ['Amazon|MUG-1', 'negative_margin'] },
      { id: 'cost-missing', op: ['drop', 'costs.csv', { sku: 'BOWL-2' }], expect: ['Amazon|BOWL-2', 'missing_cost'] },
    ],
  },

  'fairshop-ad-spend': {
    planted: {
      'Google Ads|Shopping lamps': ['roas_below_target'], 'Meta Ads|Rug prospecting': ['spend_no_sales'], 'Google Ads|Vase brand': ['spend_on_out_of_stock'],
      'Amazon Ads|Mug auto': ['over_budget'], 'SKU:LAMP-1': ['attribution_exceeds_sales'],
    },
    quiet: ['Amazon Ads|Lamp exact'],
    clean: [
      ['set', 'ads.csv', { campaign: 'Shopping lamps' }, { spend: '100.00', attributed_sales: '300.00' }],
      ['set', 'ads.csv', { campaign: 'Rug prospecting' }, { attributed_sales: '400.00' }],
      ['add', 'sales.csv', { order_id: 'O5', date: '2026-10-06', sku: 'RUG-2', revenue: '400.00' }],
      ['set', 'stock.csv', { sku: 'VASE-3' }, { available: '12' }],
      ['set', 'ads.csv', { campaign: 'Mug auto' }, { spend: '600.00' }],
    ],
    mutations: [
      { id: 'roas-2.5', op: ['set', 'ads.csv', { campaign: 'Lamp exact', date: '2026-10-12' }, { spend: '400.00' }], expect: ['Amazon Ads|Lamp exact', 'roas_below_target'] },
      { id: 'lamp-sold-out', op: ['set', 'stock.csv', { sku: 'LAMP-1' }, { available: '0' }], expect: ['Amazon Ads|Lamp exact', 'spend_on_out_of_stock'] },
      { id: 'orders-lower', op: ['set', 'sales.csv', { order_id: 'O2' }, { revenue: '500.00' }], expect: ['SKU:LAMP-1', 'attribution_exceeds_sales'] },
    ],
  },

  'fairshop-shipping-costs': {
    planted: {
      1003: ['free_below_threshold'], 1004: ['label_over_charged'], 1005: ['duplicate_label', 'label_over_charged'],
      'LABEL:9400EX0007': ['void_not_refunded'], 'LABEL:1ZEX0009': ['label_no_order'],
    },
    quiet: ['1001', '1002', '1006'],
    clean_note: 'Order 1005 has two labels of 6.10 against 5.99 charged, so the second label also puts it over what was charged; it is counted with both findings.',
    clean: [
      ['set', 'orders.csv', { order_id: '1003' }, { subtotal: '55.00' }],
      ['set', 'labels.csv', { order_id: '1004' }, { label_cost: '8.20' }],
      ['dropLast', 'labels.csv', { order_id: '1005' }],
      ['set', 'labels.csv', { tracking: '9400EX0007' }, { refund_status: 'refunded' }],
      ['drop', 'labels.csv', { order_id: '9999' }],
    ],
    mutations: [
      { id: 'charged-3', op: ['set', 'orders.csv', { order_id: '1001' }, { shipping_charged: '3.00' }], expect: ['1001', 'label_over_charged'] },
      { id: 'void-pending', op: ['set', 'labels.csv', { tracking: '9400EX0008' }, { voided: 'yes', refund_status: 'pending' }], expect: ['LABEL:9400EX0008', 'void_not_refunded'] },
      { id: 'free-under-50', op: ['set', 'orders.csv', { order_id: '1002' }, { subtotal: '45.00' }], expect: ['1002', 'free_below_threshold'] },
    ],
  },

  'fairshop-carrier-adjustments': {
    planted: {
      '1ZA1|Dimensional weight|6.4': ['disputable'], '1ZA2|Dimensional weight|4.1': ['label_data_low'], '1ZA3|Dimensional weight|4.1': ['label_data_low'],
      'SKU:BOX-2': ['repeat_sku'], '1ZA5|Dimensional weight|5': ['disputable'], '1ZA6|Address correction|18.5': ['address_correction'],
      '9400B4|Weight correction|3.25': ['no_declared_dims'],
    },
    clean_note: 'No clean set: every carrier adjustment gets a finding (dispute it, or fix the label data that caused it), so a file of adjustments never has zero findings. Mutation cases run on the demo files.',
    clean: null,
    mutations: [
      { id: 'billed-above-dims', op: ['set', 'adjustments.csv', { tracking: '1ZA2' }, { billed_weight: '20' }], expect: ['1ZA2|Dimensional weight|4.1', 'disputable'] },
      { id: 'dims-declared', op: ['set', 'labels.csv', { tracking: '9400B4' }, { length: '6', width: '4', height: '4' }], expect: ['9400B4|Weight correction|3.25', 'disputable'] },
      { id: 'other-reason', op: ['set', 'adjustments.csv', { tracking: '1ZA6' }, { reason: 'Residential surcharge' }], expect: ['1ZA6|Residential surcharge|18.5', 'other_adjustment'] },
    ],
  },

  'fairshop-3pl-invoices': {
    planted: {
      'INV-77|Pick and pack|1002|3.5|3': ['duplicate_order_charge'], 'INV-77|Pick and pack|1003|4|2': ['rate_above_card'],
      'INV-77|Pick and pack|1099|2.5|1': ['order_not_shipped'], 'INV-77|Receiving|ASN-5|125|500': ['receiving_units_over'],
      'INV-77|Storage|2026-10|240|12': ['storage_pallets_over'], 'INV-77|Special project fee||75|1': ['not_on_rate_card'],
    },
    quiet: ['INV-77|Packaging mailer|1001|0.3|1', 'INV-77|Pick and pack|1001|2.5|1'],
    clean: [
      ['dropLast', 'invoice.csv', { charge_type: 'Pick and pack', reference: '1002' }],
      ['set', 'invoice.csv', { charge_type: 'Pick and pack', reference: '1003' }, { amount: '3.00' }],
      ['drop', 'invoice.csv', { reference: '1099' }],
      ['set', 'invoice.csv', { charge_type: 'Receiving' }, { qty: '480', amount: '120.00' }],
      ['set', 'invoice.csv', { charge_type: 'Storage' }, { qty: '10', amount: '200.00' }],
      ['drop', 'invoice.csv', { charge_type: 'Special project fee' }],
    ],
    mutations: [
      { id: 'pick-3.00', op: ['set', 'invoice.csv', { charge_type: 'Pick and pack', reference: '1001' }, { amount: '3.00' }], expect: ['INV-77|Pick and pack|1001|3|1', 'rate_above_card'] },
      { id: 'order-not-shipped', op: ['drop', 'shipped.csv', { order_id: '1003' }], expect: ['INV-77|Pick and pack|1003|3|2', 'order_not_shipped'] },
      { id: 'pallets-8', op: ['set', 'pallets.csv', { period: '2026-10' }, { pallets: '8' }], expect: ['INV-77|Storage|2026-10|200|10', 'storage_pallets_over'] },
    ],
  },

  'fairshop-po-receiving': {
    planted: {
      'PO-1|MUG-1': ['duplicate_invoice'], 'PO-1|BOWL-2': ['short_shipped', 'late_delivery', 'billed_not_received'],
      'PO-2|TOWEL-3': ['over_received', 'price_variance'], 'PO-3|RUG-4': ['open_past_due'], 'PO-9|LAMP-6': ['billed_no_po'],
    },
    quiet: ['PO-4|VASE-5'],
    clean: [
      ['drop', 'invoices.csv', { invoice_number: 'NW-902' }],
      ['set', 'receipts.csv', { po: 'PO-1', sku: 'BOWL-2' }, { qty_received: '50', received_date: '2026-10-20' }],
      ['set', 'receipts.csv', { po: 'PO-2', sku: 'TOWEL-3' }, { qty_received: '200' }],
      ['set', 'invoices.csv', { invoice_number: 'HT-55' }, { qty_billed: '200', unit_price: '3.00' }],
      ['add', 'receipts.csv', { po: 'PO-3', sku: 'RUG-4', qty_received: '20', received_date: '2026-11-04' }],
      ['drop', 'invoices.csv', { invoice_number: 'HT-56' }],
    ],
    mutations: [
      { id: 'price-up-5pct', op: ['set', 'invoices.csv', { invoice_number: 'NW-901', sku: 'MUG-1' }, { unit_price: '4.20' }], expect: ['PO-1|MUG-1', 'price_variance'] },
      { id: 'arrived-late', op: ['set', 'receipts.csv', { po: 'PO-1', sku: 'MUG-1' }, { received_date: '2026-10-25' }], expect: ['PO-1|MUG-1', 'late_delivery'] },
      { id: 'ten-short', op: ['set', 'receipts.csv', { po: 'PO-2', sku: 'TOWEL-3' }, { qty_received: '190' }], expect: ['PO-2|TOWEL-3', 'short_shipped'] },
    ],
  },

  'fairshop-landed-cost': {
    planted: { 'SKU:BOWL-2': ['recorded_cost_low'], 'SHIP:SH-2': ['costs_missing'], 'SHIP:SH-3': ['costs_no_shipment'] },
    quiet: ['SKU:MUG-1', 'SKU:TOWEL-3'],
    clean: [
      ['set', 'recorded.csv', { sku: 'BOWL-2' }, { recorded_cost: '7.72' }],
      ['add', 'costs.csv', { shipment_id: 'SH-2', cost_type: 'Freight', amount: '600.00' }],
      ['set', 'recorded.csv', { sku: 'TOWEL-3' }, { recorded_cost: '3.30' }],
      ['drop', 'costs.csv', { shipment_id: 'SH-3' }],
    ],
    mutations: [
      { id: 'mug-recorded-low', op: ['set', 'recorded.csv', { sku: 'MUG-1' }, { recorded_cost: '4.50' }], expect: ['SKU:MUG-1', 'recorded_cost_low'] },
      { id: 'line-moved-to-new-shipment', op: ['set', 'lines.csv', { sku: 'MUG-1' }, { shipment_id: 'SH-4' }], expect: ['SHIP:SH-4', 'costs_missing'] },
    ],
  },

  'fairshop-retailer-deductions': {
    planted: {
      'RM-1|INV-100|shortage|200': ['shortage_with_pod'], 'RM-1|INV-101|shortage|100': ['shortage_matches_pod'],
      'RM-2|INV-100|promo|400': ['allowance_above_agreed'], 'RM-3|INV-100|promo|400': ['duplicate_deduction'],
      'CG-9|INV-102|compliance|150': ['compliance_fine'], 'CG-3|INV-103|shortage|80': ['shortage_no_pod', 'window_closed'],
      'CG-9|INV-999|pricing|60': ['invoice_not_found'],
    },
    quiet: ['CG-9|INV-102|damage|18'],
    clean_note: 'Shortage and compliance deductions always get a finding (dispute it, confirm it against the proof of delivery, or check the fine), so the clean set keeps only deductions that need no action: the agreed 5% promo allowance and a small damage write-off.',
    clean: [
      ['drop', 'deductions.csv', { deduction_type: 'Shortage' }],
      ['set', 'deductions.csv', { remit_id: 'RM-2' }, { amount: '250.00' }],
      ['drop', 'deductions.csv', { remit_id: 'RM-3' }],
      ['drop', 'deductions.csv', { deduction_type: 'Compliance fine' }],
      ['drop', 'deductions.csv', { invoice_number: 'INV-999' }],
    ],
    mutations: [
      { id: 'promo-300', op: ['set', 'deductions.csv', { remit_id: 'RM-2' }, { amount: '300.00' }], expect: ['RM-2|INV-100|promo|300', 'allowance_above_agreed'] },
      { id: 'promo-taken-again', op: ['add', 'deductions.csv', { retailer: 'Example Mart', remit_id: 'RM-4', invoice_number: 'INV-100', po: 'RPO-1', deduction_type: 'Promo allowance', deduction_code: 'PR05', amount: '250.00', deduction_date: '2026-10-24' }], expect: ['RM-4|INV-100|promo|250', 'duplicate_deduction'] },
      { id: 'unknown-invoice', op: ['set', 'deductions.csv', { deduction_type: 'Damage' }, { invoice_number: 'INV-998' }], expect: ['CG-9|INV-998|damage|18', 'invoice_not_found'] },
    ],
  },

  'fairshop-cash-over-short': {
    planted: {
      'CASHIER-00': ['repeat_shortages'], '2026-11-01|Downtown|R2': ['drawer_short'], '2026-11-02|Downtown|R2': ['drawer_short', 'deposit_missing'],
      '2026-11-03|Downtown|R2': ['drawer_short'], '2026-11-02|Uptown|R1': ['deposit_differs'],
    },
    quiet: ['2026-11-01|Downtown|R1', '2026-11-03|Uptown|R1'],
    clean: [
      ['set', 'closeouts.csv', { date: '2026-11-01', store: 'Downtown', register: 'R2' }, { counted_cash: '455.00' }],
      ['set', 'closeouts.csv', { date: '2026-11-02', store: 'Downtown', register: 'R2' }, { counted_cash: '390.00' }],
      ['set', 'closeouts.csv', { date: '2026-11-03', store: 'Downtown', register: 'R2' }, { counted_cash: '420.00' }],
      ['set', 'deposits.csv', { reference: 'DEP-2' }, { amount: '255.00' }],
      ['add', 'deposits.csv', { date: '2026-11-03', store: 'Downtown', amount: '190.00', reference: 'DEP-3' }],
      ['set', 'deposits.csv', { reference: 'DEP-4' }, { amount: '220.00' }],
      ['set', 'deposits.csv', { reference: 'DEP-5' }, { amount: '461.00' }],
    ],
    mutations: [
      { id: 'drawer-12-short', op: ['set', 'closeouts.csv', { date: '2026-11-01', store: 'Downtown', register: 'R1' }, { counted_cash: '800.40' }], expect: ['2026-11-01|Downtown|R1', 'drawer_short'] },
      { id: 'deposit-missing', op: ['drop', 'deposits.csv', { reference: 'DEP-6' }], expect: ['2026-11-03|Uptown|R1', 'deposit_missing'] },
      { id: 'deposit-12-under', op: ['set', 'deposits.csv', { reference: 'DEP-1' }, { amount: '600.00' }], expect: ['2026-11-01|Downtown|R1', 'deposit_differs'] },
    ],
  },

  'fairshop-store-shrink': {
    planted: { 'STORE:Downtown': ['shrink_above_target', 'unexplained_high'], 'SKU:Downtown|LIPBALM-2': ['repeat_sku'] },
    quiet: ['STORE:Uptown'],
    clean: [
      ['drop', 'adjustments.csv', { sku: 'LIPBALM-2', date: '2026-10-09' }],
      ['drop', 'adjustments.csv', { sku: 'LIPBALM-2', date: '2026-10-15' }],
      ['set', 'adjustments.csv', { sku: 'LIPBALM-2', date: '2026-10-05' }, { qty: '-4', reason: 'Damaged' }],
    ],
    mutations: [
      { id: 'uptown-unknown-loss', op: ['add', 'adjustments.csv', { date: '2026-10-25', store: 'Uptown', sku: 'SOAP-4', category: 'Beauty', qty: '-20', unit_cost: '3.00', reason: 'Unknown', counted_by: 'Bram Okonkwo' }], expect: ['STORE:Uptown', 'shrink_above_target'] },
      { id: 'candle-third-write-off', ops: [
        ['add', 'adjustments.csv', { date: '2026-10-12', store: 'Downtown', sku: 'CANDLE-1', category: 'Home', qty: '-1', unit_cost: '6.00', reason: 'Damaged', counted_by: 'Wren Halloway' }],
        ['add', 'adjustments.csv', { date: '2026-10-22', store: 'Downtown', sku: 'CANDLE-1', category: 'Home', qty: '-1', unit_cost: '6.00', reason: 'Damaged', counted_by: 'Wren Halloway' }],
      ], expect: ['SKU:Downtown|CANDLE-1', 'repeat_sku'] },
    ],
  },
};
